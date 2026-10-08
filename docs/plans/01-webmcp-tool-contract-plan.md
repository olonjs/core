# Plan: tool-contract (Modulo 01)

Data: 2026-10-08 · Status: in review
Spec: `docs/specs/01-webmcp-tool-contract.md` · Umbrella: `docs/plans/webmcp-tool-publishing-plan.md`

## Overview

Modulo 01: la superficie di dichiarazione dei tool WebMCP (JEB), la registrazione lato Studio (admin island) e l'emissione dei tool dichiarati nel page contract del core. Non copre l'esecuzione visitor (02) né il submit (03).

## Architecture Decisions

1. `WebMcpToolDef` serializzabile (`{name, description, surface, inputSchema?, annotations?}`) in `WebMcpConfig.tools`; `execute` resta tenant-side, associato per nome dalla superficie runtime.
2. `inputSchema` = JSON Schema già serializzato dal dev (`z.toJSONSchema()`); il core non importa Zod per i tool dichiarati (`zodToJsonSchema` interno resta privato).
3. `WebMcpToolContract` guadagna `surface`; i built-in vengono emessi con `surface: 'admin'`; i declaredTools in coda; collisione nome con built-in → errore esplicito; nomi validati kebab-case.
4. Studio: `declaredTools` (filtrati admin) + `toolExecutors` registrati con `registerWebMcpTool` accanto ai built-in; dispatcher per nome; cleanup deterministico; percorso postMessage invariato.
5. Aggregazione capsule→registri nel tenant (`apps/next/src/lib/webmcp/toolRegistry.ts`).

---

## Task 1: `WebMcpToolDef` + `WebMcpConfig.tools` (core)

**Description:** Aggiungere il tipo di dichiarazione tool e il campo `tools` alla config WebMCP (JEB). Solo tipi: nessun comportamento cambia.

**Acceptance criteria:**
- [ ] `WebMcpToolDef` esportato: `{ name, description, surface: 'admin'|'public', inputSchema?, annotations? }`
- [ ] `WebMcpConfig` ha `tools?: readonly WebMcpToolDef[]` (opzionale, nessun breaking change)

**Verification:**
- [ ] `npm run typecheck -w @olonjs/core`
- [ ] `npm test -w @olonjs/core` (91 verdi)

**Dependencies:** None · **Files:** `packages/core/src/contract/types-engine.ts` · **Scope:** XS

## Task 2: Emissione declaredTools nel contract (core)

**Description:** `WebMcpToolContract` guadagna `surface`; `buildPageContract`/`buildPageManifest`/`buildSiteManifest`/`buildLlmsTxt` accettano `declaredTools` e li emettono in coda a `tools[]`; built-in etichettati `surface: 'admin'`; nome collidente con built-in → errore; nome non kebab-case → errore.

**Acceptance criteria:**
- [ ] Senza declaredTools l'output è identico a oggi eccetto `surface: 'admin'` sui built-in (test di regressione)
- [ ] declaredTool emesso con la sua `surface`; built-in `admin`
- [ ] Collisione (`update-section`/`save`) → Error esplicito; nome non kebab-case → Error

**Verification:**
- [ ] `npm test -w @olonjs/core` (nuovi test in `webmcp-contracts-v4.test.ts`)
- [ ] `npm run build -w @olonjs/core`

**Dependencies:** T1 · **Files:** `webmcp-contracts.ts`, `webmcp-contracts-v4.test.ts` · **Scope:** M

## Task 3: StudioRouteBody — registrazione e dispatcher declaredTools (studio)

**Description:** `StudioRouteBody` accetta `declaredTools` (già filtrati `admin`) + `toolExecutors: Record<name, execute>`; registra con `registerWebMcpTool` insieme ai built-in (stesso pattern L624-636, cleanup L638-641); dispatcher `handleWebMcpToolCall` risolve per nome (built-in → handler esistenti, dichiarato → executor, sconosciuto → errore). Percorso postMessage invariato.

**Acceptance criteria:**
- [ ] Tool dichiarato admin registrato ed eseguibile via dispatcher
- [ ] Cleanup su unmount; nome sconosciuto → errore (comportamento attuale preservato)
- [ ] Nessun tool dichiarato → comportamento identico a oggi

**Verification:**
- [ ] `npm test -w @olonjs/studio` (nuovo test con Testing Library)
- [ ] `npm run typecheck -w @olonjs/studio`

**Dependencies:** T1 · **Files:** `StudioRouteBody.tsx`, nuovo `*.test.tsx` · **Scope:** M

## Task 4: toolRegistry tenant + wiring AdminStudioClient (apps/next)

**Description:** Nuovo `src/lib/webmcp/toolRegistry.ts` (aggregatore: capsule esportano `webmcpTools`, il registry le importa; mappa `sectionPublicTools: Record<sectionType, string[]>`); `AdminStudioClient` passa `declaredTools` filtrati admin a `AdminIsland`. In questa fase il registry è vuoto.

**Acceptance criteria:**
- [ ] `toolRegistry` compila con `sectionPublicTools = {}` e `adminTools = []`
- [ ] `AdminStudioClient` passa la lista (vuota) senza rompere la firma `AdminIsland`

**Verification:**
- [ ] `npm test -w tenant-next` (50 verdi)
- [ ] `npm run typecheck -w tenant-next`

**Dependencies:** T3 · **Files:** `toolRegistry.ts` (nuovo), `AdminStudioClient.tsx` · **Scope:** S

### Checkpoint 1 (dopo T1-T4) — ✅ SUPERATO (2026-10-08)
- [x] core 98 verdi, studio 16 verdi, tenant-next 50 verdi
- [x] `npm run test:boundary` verde
- [x] `npm run build:all` verde
- [ ] Review umana: conferma contract emissione e dispatcher

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Emissione rompe test webmcp-contracts-v4 esistenti | Med | Test di regressione: senza declaredTools output identico (a parte `surface` sui built-in, cambiamento pianificato) |
| Firma StudioRouteBody cambia → chiamanti (StudioRoute in react) rotti | Med | Props opzionali con default; typecheck + build come gate |
| Nome tool non conforme | Low | Validazione kebab-case in buildPageContract |

## Open Questions (assunte — vedi umbrella)

- Contract pagina pubblica: elenca tutto con `surface` discriminante (assunto).
- `inputSchema` opzionale con default `{type:'object',properties:{}}` (assunto).
- Nomi kebab-case validati (assunto).
