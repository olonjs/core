# Implementation Plan: WebMCP native alignment

**Created:** 2026-09-29
**Status:** Planned — awaiting human review
**Module id:** `webmcp-native-alignment`
**Scope:** npm-jpcore — 3 punti: core bridge, harness (3 copie), docs
**Fonte autorevole:** [WebMCP imperative API — developer.chrome.com](https://developer.chrome.com/docs/ai/webmcp/imperative-api) (agg. 2026-09-21)

---

## Overview

Allineare lo stack OlonJS alla **WebMCP imperative API nativa** di Chrome. Il nativo differisce dalla nostra polyfill in quattro punti, tutti verificati sulla doc ufficiale: (1) `registerTool` è **async** e può rifiutare; (2) `getTools()` è **async** e restituisce descrittori; (3) `executeTool(toolObject, argsObject)` prende l'**oggetto tool** + un **oggetto** di argomenti — *gli argomenti stringificati JSON sono ritirati da Chrome 155*; (4) evento `toolchange`. Il nostro bridge già deferisce al nativo, ma non-awaited la registrazione; l'harness usa il contratto polyfill anche sul branch nativo; i docs mostrano firme native errate.

## Architecture Decisions (locked — nessuna Open Question)

- **D1 — Await in registrazione**: `registerWebMcpTool` interna al bridge awaita `modelContext.registerTool(...)` (via `Promise.resolve(...).catch(...)` per restare compatibile col polyfill sync) e logga `console.warn` sulle rejection, senza propagare (React effect fire-and-forget).
- **D2 — Tipi**: `ModelContextLike` esteso con `getTools?`/`executeTool?` (superficie nativa); `WebMcpTool` esteso con `annotations?` (solo passthrough — nessuna modifica a Studio ora).
- **D3 — Polyfill intoccata**: il contratto polyfill (`listTools`, `executeTool(name, json)`, `readResource`) resta il fallback per browser senza nativo. Zero breaking.
- **D4 — Harness nativo**: `getTools()` awaited → tool risolto per `name` → `executeTool(tool, argsObject)` con args **oggetto**. Risultato: stringa attesa; `null` (navigazione, mai per update-section/save) → errore descrittivo.
- **D5 — `@olonjs/mcp` intoccato** (in deprecazione, decisione utente).
- **D6 — Verifica nativa manuale**: il path nativo non è eseguibile da questo ambiente (serve Chrome con flag/OT); la verifica è il comando console documentato (accettazione di T5/T6).

## Task List

### Phase 1 — Core bridge (punto 1)
- [ ] Task 1: `webmcp-bridge.ts` — await + catch in `registerWebMcpTool`; estensione tipi (`getTools`, `executeTool`, `annotations`)
- [ ] Task 2: test bridge — mock nativo async (resolve e reject), polyfill regression

### Checkpoint: Core
- [ ] `npm test -w @olonjs/core` verde
- [ ] `npm run typecheck -w @olonjs/core` verde

### Phase 2 — Harness (punto 2)
- [ ] Task 3: 3 copie harness — branch nativo corretto (getTools awaited, executeTool con tool+args oggetto)
- [ ] Task 4: gate test `prebuild-webmcp-feature-check.test.mjs` aggiornato
- [ ] Task 5: verifica — `node --test` + live run polyfill su `localhost:3000` (`ok:true`)

### Checkpoint: Harness
- [ ] gate test verde; live run `ok:true`

### Phase 3 — Docs (punto 3)
- [ ] Task 6: `docs/webmcp.md` — sezione API nativa autorevole; correzione esempi nativi errati; probing helper async

### Checkpoint: Complete
- [ ] Grep: nessun esempio nativo con `executeTool('nome', 'json')` nei docs
- [ ] Review umana del diff

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Path nativo non verificabile in questo ambiente | Med | Verifica manuale documentata (console Chrome, flag/OT) — acceptance di T5/T6 |
| Regressione polyfill | Alto | T2: test dedicati, mock nativo + casi polyfill esistenti |
| `executeTool` nativo ritorna `null` su navigazione | Basso | D4: errore descrittivo (i nostri tool non navigano) |
| Registration un-awaited poteva spiegare `getTools()` vuoto | Med | D1: await + catch; verifica utente dopo mount (documentata) |

## Open Questions

Nessuna — tutte le decisioni sono locked nella sezione Architecture Decisions (richiesta esplicita dell'utente).
