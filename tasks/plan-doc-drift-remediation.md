# Implementation Plan: Doc Drift Remediation

**Created:** 2026-09-29
**Status:** Planned — awaiting human review
**Module id:** `doc-drift-remediation`
**Scope:** due repo — `npm-jpcore` (repo A) e `olon-platform` (repo B)
**Fonte del gap:** `CLAUDE.md` di entrambi i repo come entry point, poi tutti i doc (analisi completa del 2026-09-29)

---

## Overview

Allineare la documentazione allo stato reale del codice dopo le capability `zod-v4-alignment` (pubblicata: core 2.0.1, zod ^4.6.0, release flow aggiornato, typecheck gate, convenzioni nuove) e `core-import-platform` (olon-platform importa `@olonjs/core`, port cancellati). Solo doc: **zero modifiche di codice**.

## Architecture Decisions

- **Nomi univoci per plan/tasks**: `tasks/plan-<module-id>.md` / `tasks/todo-<module-id>.md` — convenzione già in uso (zod-v4-alignment), mai sovrascrivere `tasks/plan.md` (occupato da "Next CLI DNA", status "awaiting review").
- **Un solo piano per i due repo**: le task di olon-platform (B) sono elencate qui; i file doc restano nei rispettivi repo.
- **ADR immutabili**: non si riscrivono i documenti ADR-0009/0012 (record storici); si aggiorna solo lo **status** in `docs/decisions/README.md`.
- **WIP altrui intoccato**: `docs/webmcp.md` (plan 002 Task 5 aperto, lavoro non committato) è fuori scope — solo segnalato.
- **Lezioni operative di release** (NPM_TOKEN shadowing, web-login effimero, auto-patch +1, prefer-online) entrano in PUBLISHING.md: sono fatti appresi, non opinioni.

## Task List

### Phase 1 — npm-jpcore: doc strutturali (rischio più alto)

- [ ] **Task A1 — ARCHITECTURE.md**: riscrittura sezioni obsolete (core framework-agnostic, layout 11 package + 3 app, build singolo con typecheck, boundary check root, release grafo ADR-0016)
- [ ] **Task A2 — PUBLISHING.md**: intro allineata all'ordine reale, rimozione sezioni dual-bundle/colocation, aggiunta lezioni operative (auto-patch +1, NPM_TOKEN, prefer-online, changelog)

**Checkpoint A1-A2**: grep pulito su `olonjs-core-runtime|/runtime|build-dual|check-runtime-decoupling|128KB|JsonPagesEngineCore` in ARCHITECTURE/PUBLISHING; nessun riferimento dual-bundle residuo.

### Phase 2 — npm-jpcore: entry point + guide

- [ ] **Task A3 — README.md**: struttura repo completa + zod v4
- [ ] **Task A4 — CLAUDE.md**: struttura reale, core framework-agnostic, zod ^4.6.0 v4-only, convenzioni nuove (changelog/, naming plan/tasks univoco, typecheck gate)
- [ ] **Task A5 — docs/canonical-schemas-howto.md**: gotcha `zod/v3` + follow-up `z.toJSONSchema()`
- [ ] **Task A6 — docs/decisions/README.md**: status ADR-0009/0012 → Superseded by ADR-0016; ADR-0016 → Accepted/implemented

**Checkpoint A3-A6**: CLAUDE.md senza "due workspaces"/"CMS engine"; README con 11 package/3 app; status ADR coerenti.

### Phase 3 — olon-platform: entry point agent

- [ ] **Task B1 — CLAUDE.md**: dipendenza `@olonjs/core` 2.x, mappa `lib/site` (core-imported vs platform-owned), `zod/v4` ^4.6.0, divergenza identity-schemas documentata
- [ ] **Task B2 — AGENTS.md**: gotcha vitest (`sequence.concurrent` → `describe.sequential` per test con stato globale) + convenzione docs (`docs/specs/NN-*`, `docs/plans/NN-*`)
- [ ] **Task B3 — Rename `acme` → `olon-platform`**: grep preliminare dei riferimenti a "acme" (lockfile, test, CI), update `package.json` + riferimenti, `npm install` per il lockfile

**Checkpoint B1-B3**: un agente fresco trova in CLAUDE.md tutto ciò che serve per capire `lib/site` senza leggere il codice; nessun riferimento "acme" residuo nei punti che contano.

### Phase 4 — Chiusura OQ (decise 2026-09-29)

- [ ] **Task A7 — Archivia `tasks/plan.md` orfano** (Next CLI DNA) in `tasks/archive/`; se `tasks/todo-next-cli-dna.md` ha task aperti → segnalare, non archiviare
- [ ] **Task A8 — Completa `docs/webmcp.md`** (Task 5 del plan 002): verità attuale (document.modelContext only, probing modelContextProtocol, discovery runtime Next, visitor island, admin tools via webmcp.enabled) **con esempi di codice tenant** (wiring `webmcp.enabled`/`ensureWebMcpRuntime`/`registerWebMcpTool`, visitor island, feature-check harness) oltre agli esempi console

**Checkpoint A7-A8**: `tasks/` senza orfani; `docs/webmcp.md` con sezione tenant-code completa e coerente coi sorgenti.

### Checkpoint: Complete
- [ ] Grep finali su entrambi i repo: zero riferimenti obsoleti
- [ ] Suite/build non toccati (doc-only) — nessun `npm run` necessario
- [ ] Review umana

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ARCHITECTURE.md è un doc di riferimento che altri flussi citano | Med | Riscrittura mirata alle sezioni obsolete, senza cambiare le sezioni ancora valide (bake-time contracts) |
| `tasks/plan.md` orfano ("mirror tasks/todo.md" inesistente) | Basso | Fuori scope: segnalato come open question |
| Doc di olon-platform in stile template Achromatic (EN) | Basso | Mantenere lo stile esistente del file |
| WIP non committato (webmcp.md, apps/next) | Basso | Non toccato, solo segnalato |

## Open Questions

1. ~~`tasks/plan.md` orfano~~ → **CHIUSA (2026-09-29): archiviare** (Task A7), con cautela su `todo-next-cli-dna.md` se ha task aperti.
2. ~~`package.json` "acme"~~ → **CHIUSA (2026-09-29): rinominare in `olon-platform`** (Task B3), con grep preliminare dei riferimenti.
3. ~~`docs/webmcp.md`~~ → **CHIUSA (2026-09-29): completare** (Task A8) **con codice tenant oltre agli esempi console**.
