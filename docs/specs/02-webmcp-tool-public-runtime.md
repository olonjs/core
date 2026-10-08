# Spec 02: WebMCP Tool Public Runtime (Next)

UID: `tool-public-runtime` · Status: Draft — in review · Data: 2026-10-08
Intent: `docs/intent/webmcp-tool-publishing.md` · Dipende da: `01-webmcp-tool-contract.md`

## Objective

Rendere la **pagina visitor di un tenant Next** una superficie capace di registrare ed eseguire tool WebMCP `public` dichiarati nelle capsule (oggi l'isola visitor installa solo il polyfill, read-only). Un agente che visita una pagina pubblica vede i tool delle sezioni presenti e li esegue.

Assunzioni dichiarate:
1. `execute` è una **funzione client-side** del tenant: non può attraversare il confine RSC→client. Quindi la pagina RSC passa all'isola solo **i nomi** dei tool abilitati (computati server-side dalle sezioni presenti); l'isola risolve nome→def client (che include `execute`).
2. L'executor fa le sue chiamate dal client (fetch diretto a servizi esterni o a route handler del tenant), come già fa alpha (`useOlonForms`).
3. Il polyfill `document.modelContext` è unico per documento: visitor e admin sono documenti/pagine Next diversi, nessun conflitto di registrazione.

## Stato attuale (riferimenti verificati)

- `apps/next/app/[[...slug]]/page.tsx` L119: render di `<WebMcpVisitorRuntime />` (nessuna prop).
- `apps/next/src/components/webmcp/WebMcpVisitorRuntime.tsx` (17 righe): `useEffect` → `bootstrapVisitorWebMcpRuntime()` → `ensureWebMcpRuntime()` soltanto.
- `apps/next/src/lib/webmcp/bootstrapVisitorWebMcpRuntime.ts` (15 righe): firma già iniettabile (`deps: { ensureWebMcpRuntime }`) — commento esplicito: "Does not register mutation tools (Studio-only)".
- `registerWebMcpTool` (core, `webmcp/runtime/webmcp-bridge.ts` L386-425) funziona su qualsiasi documento — il meccanismo è già lì, manca il chiamante.
- Test esistenti: `apps/next/src/lib/webmcp/bootstrapVisitorWebMcpRuntime.test.ts`, `visitorPageWebMcpWiring.test.ts` (16 righe).

## Design

### A. Def con executor (tenant, client-only)

`apps/next/src/lib/webmcp/visitorToolDefs.ts` (modulo client, importato solo dall'isola):

```ts
import type { WebMcpToolDef } from '@olonjs/core';
import { registerWebMcpTool } from '@olonjs/core';

export interface VisitorToolRegistration extends WebMcpToolDef {
  execute: (args: unknown) => Promise<unknown> | unknown; // surface === 'public' per costruzione
}

export const visitorToolDefs: Record<string, VisitorToolRegistration> = {
  // popolato dalle capsule (modulo 03 aggiunge 'submit-form')
};
```

### B. Nomi abilitati per pagina (RSC → isola)

- La pagina server (`app/[[...slug]]/page.tsx`) calcola i tipi sezione presenti (già disponibili da `result.page.sections`) e mappa tipo-sezione → nomi tool public dichiarati dalla capsule (nuova mappa `sectionPublicTools: Record<sectionType, string[]>` esportata dal registry tenant, `src/lib/webmcp/toolRegistry.ts` del modulo 01).
- Passa all'isola: `<WebMcpVisitorRuntime toolNames={[...]} />` (prop serializzabile).
- Sezione non presente nella pagina ⇒ il suo tool non viene registrato (requisito "submit form *se presente*" dell'intent).

### C. Registrazione nell'isola

`WebMcpVisitorRuntime` (client):

```tsx
'use client';
export function WebMcpVisitorRuntime({ toolNames = [] }: { toolNames?: string[] }) {
  useEffect(() => {
    ensureWebMcpRuntime();
    const unregister = toolNames
      .map((name) => visitorToolDefs[name])
      .filter(Boolean)
      .map((def) => registerWebMcpTool(def));
    return () => unregister.forEach((u) => u());
  }, [toolNames]);
  return null;
}
```

`bootstrapVisitorWebMcpRuntime` resta per il solo polyfill (compatibile); la registrazione è a carico dell'isola.

### D. Esecuzione e errori

- `execute` torna il risultato (o `{ content: [...], isError }` per compatibilità MCP) — il bridge esistente (`document.modelContextProtocol.executeTool`, core L370-379) serializza già.
- Errori dell'executor → reject → errore tool (comportamento bridge attuale).
- Il manifest/contract della pagina pubblica elenca i tool public (via modulo 01: `buildPageContract` con `declaredTools`); `agenticSurface.ts` di apps/next passa i declaredTool public alle route `/api/webmcp/page-contract` e `/api/webmcp/page-manifest`.

## Commands

```bash
npm test -w tenant-next                  # suite apps/next (19 file / 50 test oggi) + nuovi
npm run typecheck -w tenant-next         # gate tsc (next build fa typecheck)
npm run build -w tenant-next             # next build — verifica confine RSC (niente funzioni serializzate)
npm run test:boundary                    # invariante package
```

## Project Structure (file toccati)

```
apps/next/src/lib/webmcp/visitorToolDefs.ts          # def client con execute (nuovo)
apps/next/src/lib/webmcp/toolRegistry.ts             # mappa sectionType → public tool names (nuovo/esteso da modulo 01)
apps/next/src/components/webmcp/WebMcpVisitorRuntime.tsx  # registrazione per toolNames
apps/next/app/[[...slug]]/page.tsx                   # prop toolNames dalle sezioni presenti
apps/next/src/lib/webmcp/runtime/agenticSurface.ts   # declaredTools public → page-contract/manifest
apps/next/src/lib/webmcp/*.test.ts                   # test nuova logica
```

## Code Style

Named exports; `useEffect` con cleanup deterministico (stesso pattern `StudioRouteBody` L638-641); nessuna funzione in props RSC (regola serializzabilità Next). Esempio dell'isola in §C.

## Testing Strategy

- **bootstrap (vitest, deps iniettate)**: `ensureWebMcpRuntime` chiamato; nessuna registrazione se `toolNames` vuoto.
- **isola (vitest + jsdom, mock `document.modelContext`)**: con `toolNames=['submit-form']` registra solo le def presenti; cleanup su unmount; nome sconosciuto ignorato silenziosamente (log warn).
- **server→isola (unit)**: funzione pura `resolvePublicToolNames(sections, sectionPublicTools)` testata; sezione assente ⇒ tool assente.
- **next build**: verifica che nessuna funzione attraversi il confine (TypeScript già lo vieta; build = gate reale).

## Boundaries

- **Always**: cleanup registrazioni; tool public mai registrati in admin e viceversa (filtro per superficie); suite esistenti verdi.
- **Ask first**: cambiare la shape del polyfill core; introdurre stato condiviso tra documenti (fuori scope).
- **Never**: import `@olonjs/studio` nell'isola visitor (vincolo ADR-0017, commento in `WebMcpVisitorRuntime.tsx`); registrare tool built-in admin sul visitor.

## Success Criteria

1. Un tool `public` dichiarato da una capsule compare nella lista `listTools()` del visitor **solo** quando la sua sezione è sulla pagina (test isola + test pura).
2. `execute` del tool è richiamabile via `document.modelContextProtocol.executeTool` (test jsdom).
3. Page contract/manifest delle route `/api/webmcp/*` elencano il tool con `surface: 'public'` (test `agenticSurface.test.ts`).
4. `next build` verde: nessun errore di serializzabilità RSC.
5. Pagina senza tool public: comportamento identico a oggi (nessuna registrazione).

## Open Questions

- Prop `toolNames` come array di stringhe (scelta attuale) vs passare le def complete serializzate + registry execute lato server? (Propongo array — vedi assunzione 1.)
- Log per nome sconosciuto: warn silenzioso o throw? (Propongo warn, per non rompere la pagina.)
- Tool public **stateful** (es. carrello): lo stato resta nell'executor del dev (confermato nell'intent) — nessuna astrazione in questo modulo. OK?
