# Spec 01: WebMCP Tool Contract

UID: `tool-contract` · Status: Draft — in review · Data: 2026-10-08
Intent: `docs/intent/webmcp-tool-publishing.md` · Capability map: `docs/intent/webmcp-tool-publishing.md#struttura-proposta`

## Objective

Permettere a un dev di dichiarare tool WebMCP **nella capsule della sezione** (accanto a `View.tsx`/`schema.ts`) con una superficie `admin | public`, e far sì che vengano **registrati a runtime** e **emessi nel page contract** così che gli agenti li scoprano via `/schemas/<slug>.schema.json` e li eseguano via bridge MCP.

Questo modulo copre: la superficie di dichiarazione (JEB), la registrazione lato Studio (admin island), e l'emissione del contract nel core. **Non** copre l'esecuzione sul visitor (modulo 02) né il submit di riferimento (modulo 03).

Assunzioni dichiarate:
1. `inputSchema` del tool è **JSON Schema già serializzato** dal dev (Zod v4 offre `z.toJSONSchema()` nativo) — il core non importa né serializza Zod per i tool dichiarati; `zodToJsonSchema` interno di `webmcp-contracts.ts` resta privato.
2. I tool integrati `update-section`/`save` restano dove sono (Studio) e vengono etichettati `surface: 'admin'`.
3. L'aggregazione dei tool delle capsule presenti sulla pagina avviene nel tenant (`apps/next/src/lib/webmcp/`), non nel core.

## Stato attuale (riferimenti verificati)

- Runtime generico, già plugin-ready: `packages/core/src/webmcp/runtime/webmcp-bridge.ts`
  - `ensureWebMcpRuntime()` (L340-384): polyfill `document.modelContext` + `document.modelContextProtocol` (`listTools`/`executeTool`/`readResource`).
  - `registerWebMcpTool(tool)` (L386-425): pubblico, dedup per nome con `AbortController`; tipo `WebMcpTool` (L14-26) = `{ name, description, inputSchema, execute, annotations? }` con `readOnlyHint`/`consequentialHint` passthrough.
- Registrazione built-in hardcoded: `packages/studio/src/StudioRouteBody.tsx`
  - L624-636: registra solo `update-section` + `save`.
  - L511-518: dispatcher `handleWebMcpToolCall` lancia su nomi sconosciuti; il percorso postMessage (L570-593) confluisce nello stesso dispatcher.
- Emissione contract hardcoded: `packages/core/src/contract/webmcp-contracts.ts`
  - `buildPageContract` L424-498: `tools[]` chiuso su update/save (L461-477); `systemPrompt` fisso (L486); `sectionSubmissionSchemas` da ADR-0002 (L445-495).
  - `WebMcpToolContract` L8-12 = `{ name, description, inputSchema }` — senza superficie.
  - `buildPageManifest` L500-539 (copia name/description), `buildSiteManifest` L541-577, `buildLlmsTxt` L623-651.
- Superficie config: `packages/core/src/contract/types-engine.ts` L62-65 — `WebMcpConfig = { enabled?, namespace? }`, nessun campo tool.

## Design

### A. Tipo di dichiarazione (core)

```ts
// contract/types-engine.ts
export interface WebMcpToolDef {
  name: string;                       // unico nell'app; kebab-case
  description: string;
  surface: 'admin' | 'public';        // dove il tool è eseguibile
  inputSchema?: Record<string, unknown>; // JSON Schema già serializzato
  annotations?: { readOnlyHint?: boolean; consequentialHint?: boolean };
}
export interface WebMcpConfig {
  enabled?: boolean;
  namespace?: string;
  tools?: readonly WebMcpToolDef[];   // tool dichiarati dal tenant
}
```

`execute` **non** sta nella def: è una funzione tenant-side che viaggia fuori dal JSON (moduli 02/03 associano def→executor per superficie).

### B. Emissione contract (core)

- `WebMcpToolContract` (webmcp-contracts.ts L8-12) guadagna `surface: 'admin' | 'public'`.
- `buildPageContract` / `buildPageManifest` / `buildSiteManifest` / `buildLlmsTxt` accettano `declaredTools?: readonly WebMcpToolDef[]` e li emettono **in coda** a `tools[]`; i built-in vengono emessi con `surface: 'admin'`.
- Regola di precedenza per nome: un tool dichiarato con nome collidente con un built-in (`update-section`, `save`) è **rifiutato** con errore esplicito in `buildPageContract` (nessun override silenzioso).

### C. Registrazione admin (studio)

- `StudioRouteBody` riceve `declaredTools` (già filtrati `surface === 'admin'` dal chiamante) e li registra con `registerWebMcpTool` insieme ai built-in, riusando il pattern L624-636 (unregister su cleanup).
- `handleWebMcpToolCall` (L511-518) risolve per nome: built-in → handler esistenti; dichiarati → callback fornito dal tenant (`toolExecutors: Record<string, (args) => Promise<unknown>>` passato a `StudioRouteBody`); sconosciuto → errore.
- Il percorso postMessage (L570-593) resta invariato: confluisce nel dispatcher.

### D. Aggregazione tenant (apps/next)

- Nuovo `src/lib/webmcp/toolRegistry.ts`: aggregatore dei tool dichiarati dalle capsule (la capsule esporta `webmcpTools` da `index.ts`; il registry li importa). `AdminStudioClient` passa `declaredTools` filtrati admin a `AdminIsland` → engine → `StudioRouteBody`.

## Commands

```bash
npm test -w @olonjs/core                  # suite contract (91 test, resta verde + nuovi)
npm run typecheck -w @olonjs/studio       # gate tsc (vite-plugin-dts NON fallisce sui tipi)
npm test -w @olonjs/studio                # vitest jsdom (FormFactory ecc.)
npm test -w tenant-next                   # suite apps/next (50 test, resta verde)
npm run test:boundary                     # check-package-boundaries.mjs deve restare verde
npm run build:all                         # typecheck + build tutti i workspace
```

## Project Structure (file toccati)

```
packages/core/src/contract/types-engine.ts       # WebMcpToolDef, WebMcpConfig.tools
packages/core/src/contract/webmcp-contracts.ts   # surface su WebMcpToolContract, declaredTools in emissione
packages/core/src/contract/webmcp-contracts-v4.test.ts  # nuovi test emissione
packages/studio/src/StudioRouteBody.tsx          # registrazione + dispatcher dichiarati
packages/studio/src/StudioRouteBody.*.test.tsx   # test registrazione/executor (se serve harness)
apps/next/src/lib/webmcp/toolRegistry.ts         # aggregatore tenant (vuoto in questo modulo)
apps/next/src/components/admin/AdminStudioClient.tsx # wiring declaredTools (lista vuota)
```

## Code Style

Named exports, nessun default (tranne `App`); tipi inferiti; `ui:*`-style description non pertinenti qui. Esempio della forma di dichiarazione attesa in una capsule:

```ts
// src/components/<sezione>/index.ts
import { z } from 'zod';
import type { WebMcpToolDef } from '@olonjs/core';

const searchInput = { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] };
// oppure: z.object({ query: z.string() }).toJSONSchema()

export const webmcpTools: readonly WebMcpToolDef[] = [
  { name: 'search-product', description: '…', surface: 'public', inputSchema: searchInput, annotations: { readOnlyHint: true } },
];
```

## Testing Strategy

- **core (vitest, jsdom dove serve)**: unit test su `buildPageContract`/`buildPageManifest` — i declaredTools compaiono in `tools[]` con `surface` corretta; collisione con built-in → errore; output senza declaredTools byte-compatibile con oggi (nessuna regressione).
- **studio (vitest + Testing Library, pattern `FormFactory.*.test.tsx`)**: registrazione declaredTool + dispatch per nome + cleanup; tool sconosciuto → errore (comportamento attuale preservato).
- **boundary**: `npm run test:boundary` verde — le modifiche non violano core↛react/studio.

## Boundaries

- **Always**: test core/studio/next verdi prima di chiudere; named exports; `buildPageContract` senza declaredTools produce output identico a oggi.
- **Ask first**: qualsiasi estensione dell'API pubblica di `@olonjs/core` **oltre** `WebMcpToolDef`/`WebMcpConfig.tools`/`surface` su `WebMcpToolContract` (boundary CLAUDE.md); modifiche ai built-in update/save.
- **Never**: logica di submit o di dominio nel core; import Zod per i tool dichiarati; cambiare i nomi dei built-in.

## Success Criteria

1. `buildPageContract` con un declaredTool admin lo emette in `tools[]` con `surface: 'admin'` e i built-in etichettati `admin` (test verde).
2. `StudioRouteBody` registra un declaredTool e il dispatcher lo esegue; cleanup su unmount; nome collidente → errore.
3. `WebMcpConfig.tools` tipato e accettato senza breaking change per i tenant esistenti (campo opzionale).
4. Suite esistenti verdi: core 91, studio, apps/next 50, `test:boundary`.
5. `npm run build:all` verde.

## Open Questions

- OK che il contract della pagina pubblica continui a elencare i built-in admin (`surface` li etichetta) oppure la pagina pubblica deve elencare **solo** tool `public`? (Impatto su `agenticSurface.ts` di apps/next — propongo: elencare tutto, con `surface` come discriminante; decidere qui.)
- `inputSchema` obbligatorio o opzionale per i tool dichiarati? (Propongo: opzionale, default `{ type: 'object', properties: {} }`.)
- Nome tool: imporre `kebab-case` con validazione, o libertà totale? (Propongo: validazione kebab-case.)
