# Task checklist: Doc Drift Remediation

**Created:** 2026-09-29
**Plan:** [`plan-doc-drift-remediation.md`](./plan-doc-drift-remediation.md)
**Status:** Done (2026-09-29)
**Regola:** doc-only — nessuna modifica di codice; nomi file esistenti preservati; stile dei file preservato.

---

## Phase 1 — npm-jpcore: doc strutturali

- [x] **Task A1 — ARCHITECTURE.md**
  - Acceptance: monorepo layout 11 package + 3 app; `@olonjs/core` framework-agnostic (zero React) con react/studio split (ADR-0016); niente dual-bundle/`./runtime` subpath/ADR-0009/0012/colocation; boundary check = `scripts/check-package-boundaries.mjs` (root `npm run test:boundary`); release graph completo; "Composition root" → `packages/react/src/engine/`; sezione bake-time contracts preservata.
  - Verify: `grep -nE "olonjs-core-runtime|/runtime subpath|build-dual|check-runtime-decoupling|128 ?KB|JsonPagesEngineCore" docs/ARCHITECTURE.md` → 0 match
  - Files: `docs/ARCHITECTURE.md`
  - Scope: Medium

- [x] **Task A2 — PUBLISHING.md**
  - Acceptance: intro allineata (10 package pubblicati); rimozione §dual-bundle build, §pre-publish gate vecchio, §verifying artifacts, §colocation; aggiunte lezioni operative: versioni pubblicate = pre-set +1 patch (auto-patch release.js), gotcha `NPM_TOKEN` (`.npmrc` `${NPM_TOKEN}` fa ombra a `~/.npmrc`; web-login effimero → Classic token), `--prefer-online` per cache stantia, convenzione `/changelog/<commit>.md`.
  - Verify: `grep -nE "dual-bundle|olonjs-core-runtime|build-dual|runtime\.d\.ts|colocation" docs/PUBLISHING.md` → 0 match
  - Files: `docs/PUBLISHING.md`
  - Scope: Medium

## Phase 2 — npm-jpcore: entry point + guide

- [x] **Task A3 — README.md**
  - Acceptance: sezione repo con tutti i package (core, react, studio, cli, mcp, next, stack, compat) e app (tenant-alpha, next, olonjs.io); Tech Stack "Zod v4".
  - Verify: `grep -c "@olonjs/react\|@olonjs/studio\|@olonjs/mcp\|@olonjs/next" README.md` ≥ 4
  - Files: `README.md`
  - Scope: Small

- [x] **Task A4 — CLAUDE.md**
  - Acceptance: struttura monorepo reale (niente "due workspaces"); core framework-agnostic; zod `^4.6.0` v4-only con migration note tenant; convenzioni: `changelog/<nome-commit>.md`, naming univoco `tasks/plan-<module-id>.md`, `npm run typecheck` nei comandi.
  - Verify: `grep -nE "due workspaces|CMS engine" CLAUDE.md` → 0 match; `grep -c "changelog/\|plan-<module-id>" CLAUDE.md` ≥ 2
  - Files: `CLAUDE.md`
  - Scope: Small

- [x] **Task A5 — docs/canonical-schemas-howto.md**
  - Acceptance: nota "Why zod/v3" (zod-to-json-schema abbandonato nov 2025) con riferimento al header di `zod-schemas.ts`; follow-up `z.toJSONSchema()` nativo.
  - Verify: `grep -c "zod/v3" docs/canonical-schemas-howto.md` ≥ 1
  - Files: `docs/canonical-schemas-howto.md`
  - Scope: Small

- [x] **Task A6 — docs/decisions/README.md**
  - Acceptance: ADR-0009 e ADR-0012 → "Superseded by ADR-0016"; ADR-0016 → "Accepted — implemented (core 2.x, react 0.2.x, studio 0.2.x published)".
  - Verify: `grep -nE "0009|0012|0016" docs/decisions/README.md` — status coerenti
  - Files: `docs/decisions/README.md`
  - Scope: Small

## Phase 3 — olon-platform: entry point agent

- [x] **Task B1 — CLAUDE.md (olon-platform)**
  - Acceptance: sezione dipendenza `@olonjs/core@^2.0.0` + zod `^4.6.0` (import `zod/v4`); mappa `lib/site`: platform-owned (`routeSlug`, `preserveCollectionPageSlug`, fetch layer, `saveToGithub`) vs imported-from-core (kernel types, routing, config-resolver, WebMCP contract types, `assertCollectionRecordKeys`); divergenza identity-schemas in `saveStreamCollectionRefs` documentata con motivazione.
  - Verify: `grep -c "@olonjs/core" CLAUDE.md` ≥ 3; `grep -c "zod/v4" CLAUDE.md` ≥ 1
  - Files: `CLAUDE.md`
  - Scope: Small

- [x] **Task B2 — AGENTS.md (olon-platform)**
  - Acceptance: gotcha vitest (`sequence.concurrent: true` → usare `describe.sequential` per test con mock di modulo condivisi o `vi.stubGlobal`); convenzione docs (`docs/specs/NN-<slug>-spec.md`, `docs/plans/NN-<slug>-{plan,tasks}.md`).
  - Verify: `grep -c "describe.sequential\|sequence.concurrent" AGENTS.md` ≥ 1
  - Files: `AGENTS.md`
  - Scope: Small

- [x] **Task B3 — Rename `acme` → `olon-platform`**
  - Acceptance: grep preliminare di "acme" in `lib/ app/ components/ tests/ config/ trpc/ .github/ *.json`; `package.json` name → `olon-platform`; riferimenti dipendenti aggiornati (es. lockfile root, test sul nome); `npm install` per rigenerare il lockfile.
  - Verify: `grep -rn "acme" . --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" | grep -v node_modules | grep -v .next` → solo occorrenze innocue (nessun dipendente dal nome); `npm run typecheck` verde
  - Files: `package.json`, `package-lock.json`, eventuali riferimenti
  - Scope: Small

## Phase 4 — Chiusura OQ (decise 2026-09-29)

- [x] **Task A7 — Archivia `tasks/plan.md` orfano**
  - Acceptance: `tasks/plan.md` spostato in `tasks/archive/plan-next-cli-dna.md`; se `tasks/todo-next-cli-dna.md` contiene task non spuntati → NON archiviato, segnalato al posto dell'archiviazione.
  - Verify: `ls tasks/` pulito; `git status` mostra la rename/move
  - Files: `tasks/plan.md` (move), eventualmente `tasks/todo-next-cli-dna.md` (decisione condizionale)
  - Scope: XS

- [x] **Task A8 — Completa `docs/webmcp.md` con codice tenant**
  - Acceptance: sezioni aggiornate alla verità attuale — solo `document.modelContext` (no navigator), probing via `document.modelContextProtocol`, discovery surface runtime di Next (route handlers + rewrites), visitor island (polyfill + readResource, nessun tool di mutazione), admin tools via `webmcp.enabled`; **esempi di codice tenant** reali: wiring `webmcp.enabled` (AdminStudioClient), `ensureWebMcpRuntime` + `registerWebMcpTool` (core bridge), visitor island (WebMcpVisitorRuntime), feature-check harness (`webmcp-feature-check.mjs` via `modelContextProtocol`), oltre agli esempi console già presenti.
  - Verify: `grep -c "registerWebMcpTool\|ensureWebMcpRuntime\|webmcp.enabled\|WebMcpVisitorRuntime" docs/webmcp.md` ≥ 4; zero riferimenti a `navigator.modelContext` come API attiva; `modelContextTesting` assente
  - Files: `docs/webmcp.md`
  - Scope: Medium

### Checkpoint: Complete
- [ ] Grep finali su entrambi i repo (v. Verify di ogni task)
- [ ] Nessun file di codice toccato (`git status` limitato a `*.md`)
- [ ] Review umana del diff
