# Plan: tool-public-runtime (Modulo 02)

Data: 2026-10-08 · Status: in review
Spec: `docs/specs/02-webmcp-tool-public-runtime.md` · Umbrella: `docs/plans/webmcp-tool-publishing-plan.md`

## Overview

Modulo 02: la pagina visitor di un tenant Next diventa superficie capace di registrare ed eseguire tool `public` dichiarati nelle capsule (oggi l'isola installa solo il polyfill, read-only).

## Architecture Decisions

1. **Solo nomi attraverso RSC**: `execute` è una funzione client, non serializzabile — la pagina server passa all'isola solo `toolNames` (calcolati dalle sezioni presenti); il client risolve nome→def con executor (`visitorToolDefs`).
2. Registrazione con `registerWebMcpTool` (core) + cleanup; nome sconosciuto → warn silenzioso (non rompe la pagina); StrictMode senza duplicati (AbortController del core).
3. Tool public registrati **solo** sul visitor; tool admin **solo** in Studio — filtro per superficie.
4. Page contract/manifest delle route `/api/webmcp/*` elencano i tool public (`agenticSurface.ts` passa i declaredTools public).
5. `bootstrapVisitorWebMcpRuntime` resta per il solo polyfill (compatibilità).

---

## Task 5: Isola visitor con toolNames (apps/next)

**Description:** `visitorToolDefs.ts` (client: nome → def con `execute`); `resolvePublicToolNames(sections, sectionPublicTools)` pura; `WebMcpVisitorRuntime` accetta prop `toolNames` e registra le def presenti con cleanup; nomi sconosciuti → warn (non throw).

**Acceptance criteria:**
- [ ] `toolNames=[]` (default) → solo polyfill, comportamento attuale
- [ ] Tool registrato solo se presente in `visitorToolDefs`
- [ ] Cleanup su unmount; doppio mount (StrictMode) senza duplicati (AbortController del core)

**Verification:**
- [ ] `npm test -w tenant-next` (nuovi test: `resolvePublicToolNames`, isola con jsdom)
- [ ] `npm run build -w tenant-next` (confine RSC)

**Dependencies:** T4 (modulo 01) · **Files:** `visitorToolDefs.ts` (nuovo), `WebMcpVisitorRuntime.tsx`, test · **Scope:** M

## Task 6: toolNames dalla pagina + contract public (apps/next)

**Description:** `app/[[...slug]]/page.tsx` calcola i nomi dei tool public dalle sezioni presenti e li passa all'isola; `agenticSurface.ts` passa i declaredTools public a `buildPageContract`/`buildPageManifest` delle route `/api/webmcp/*`.

**Acceptance criteria:**
- [ ] Sezione presente ⇒ suoi tool public nei `toolNames`; assente ⇒ no
- [ ] Page contract/manifest delle route webmcp elencano i tool public con `surface: 'public'`

**Verification:**
- [ ] `npm test -w tenant-next` (estensione `agenticSurface.test.ts`)
- [ ] `npm run build -w tenant-next`

**Dependencies:** T5 · **Files:** `app/[[...slug]]/page.tsx`, `agenticSurface.ts`, test · **Scope:** M

### Checkpoint 2 (dopo T5-T6) — ✅ SUPERATO (2026-10-08)
- [x] tenant-next 58 test verdi, `next build` verde
- [x] Pagina senza tool public: nessuna registrazione (test isola `toolNames=[]`)
- [ ] Review umana

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Confine RSC (funzioni serializzate) | Med | Solo nomi (string[]) come prop; `next build` è il gate |
| Doppia registrazione StrictMode | Low | Meccanismo AbortController del core; test jsdom dedicato |
| Registrazione leak su navigazione | Low | Cleanup dell'effetto; test unmount |

## Open Questions (assunte — vedi umbrella)

- Prop `toolNames` come array di stringhe (assunto — vedi assunzione 1 della spec).
- Nome sconosciuto: warn, non throw (assunto).
- Tool stateful (carrello): nessuna astrazione — stato nell'executor del dev (confermato nell'intent).
