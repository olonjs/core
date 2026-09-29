# Task checklist: WebMCP native alignment

**Created:** 2026-09-29
**Plan:** [`plan-webmcp-native-alignment.md`](./plan-webmcp-native-alignment.md)
**Status:** Not started
**Fonte:** [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) — ogni firma qui sotto è da lì.

---

## Phase 1 — Core bridge

- [ ] **Task 1 — `registerWebMcpTool` await + tipi**
  - Description: la registrazione nativa è async e può rifiutare; oggi è fire-and-forget non-awaited (probabile causa del `getTools()` vuoto osservato). Awaitare con `Promise.resolve(...).catch(err => console.warn(...))` per restare compatibile col polyfill sync. Estendere `ModelContextLike` con `getTools?`/`executeTool?` e `WebMcpTool` con `annotations?` (passthrough).
  - Acceptance: nessuna unhandled rejection; warn loggato su rejection; tipi compilano; polyfill invariata.
  - Verify: `npm run typecheck -w @olonjs/core`; `npm test -w @olonjs/core`
  - Files: `packages/core/src/webmcp/runtime/webmcp-bridge.ts`
  - Scope: Small

- [ ] **Task 2 — Test bridge**
  - Description: mock di `document.modelContext.registerTool` **async** che (a) resolve → la registrazione completa; (b) reject → `console.warn` chiamato e nessuna unhandled rejection. I casi polyfill esistenti restano verdi.
  - Acceptance: 2 nuovi casi verdi; suite core completa verde.
  - Verify: `npm test -w @olonjs/core`
  - Files: `packages/core/src/webmcp/runtime/webmcp-bridge.test.ts`
  - Scope: Small

## Phase 2 — Harness

- [ ] **Task 3 — Branch nativo corretto (3 copie)**
  - Description: nel branch nativo, `listTools` diventa `async () => (await native.getTools())`; l'esecuzione risolve il tool per `name` da `getTools()` e chiama `executeTool(toolObj, argsObject)` con args **oggetto** (stringa JSON ritirata da Chrome 155). Risultato stringa; `null` → errore descrittivo.
  - Acceptance: stesso comportamento del branch polyfill; codice conforme a D4 del plan.
  - Verify: `node --check` sulle 3 copie; live run (Task 5)
  - Files: `apps/next/scripts/webmcp-feature-check.mjs`, `apps/tenant-alpha/scripts/webmcp-feature-check.mjs`, `apps/olonjs.io/scripts/webmcp-feature-check.mjs`
  - Scope: Small

- [ ] **Task 4 — Gate test**
  - Description: `prebuild-webmcp-feature-check.test.mjs` asserisce il branch nativo corretto: `getTools` awaited, `executeTool` con oggetto tool, nessuna stringa JSON nel branch nativo.
  - Acceptance: gate test verde.
  - Verify: `node --test apps/next/scripts/prebuild-webmcp-feature-check.test.mjs`
  - Files: `apps/next/scripts/prebuild-webmcp-feature-check.test.mjs`
  - Scope: XS

- [ ] **Task 5 — Verifica live (polyfill) + manuale (nativo)**
  - Description: live run dell'harness su `localhost:3000` (polyfill, Chromium headless) → `ok:true`. Verifica nativa manuale su Chrome dell'utente (flag/OT attivo): su `/admin` dopo il mount, `await document.modelContext.getTools()` deve elencare `update-section`/`save`; `await document.modelContext.executeTool(saveTool, {})` deve rispondere.
  - Acceptance: live run `ok:true`; esito manuale riportato.
  - Verify: `WEBMCP_BASE_URL=http://localhost:3000 node scripts/webmcp-feature-check.mjs` (in apps/next)
  - Files: nessuno
  - Scope: XS

## Phase 3 — Docs

- [ ] **Task 6 — `docs/webmcp.md` API nativa autorevole**
  - Description: sezione imperativa nativa — `registerTool` async (shape completa: name/description/inputSchema/execute(parsedArgs, {signal})→string, `annotations`), `getTools()` async (descrittori, same-origin, `fromOrigins`), `executeTool(tool, argsObject, {signal})` (JSON string ritirata da Chrome 155), evento `toolchange`, unregister via AbortSignal (Chrome 153+ senza abort), gating (origin trial Chrome 149+, flag `chrome://flags/#enable-webmcp-testing`, permissions policy `tools`, origin isolation). Correggere gli esempi nativi errati (`executeTool('save','{}')` → `executeTool(saveTool, {})`); probing helper async.
  - Acceptance: firme native identiche alla doc ufficiale; zero esempi nativi con firma obsoleta.
  - Verify: `grep -n "executeTool('" docs/webmcp.md` → solo esempi polyfill etichettati; review umana
  - Files: `docs/webmcp.md`
  - Scope: Small

### Checkpoint: Complete
- [ ] Core: test + typecheck verdi
- [ ] Harness: gate test verde + live `ok:true`
- [ ] Docs: firme native corrette, polyfill etichettata come fallback
- [ ] Review umana
