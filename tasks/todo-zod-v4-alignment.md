# Todo: zod-v4-alignment

- **Plan:** `tasks/plan-zod-v4-alignment.md`
- **Spec:** `specs/zod-v4-migration-v1.md`
- **Regola:** task in ordine di dipendenza; ogni task ha Acceptance / Verify / Files.

---

## Slice A — Core engine su v4

- [x] **T1 — Riscrivere il serializer su `_def.type` (v4)**
  - Acceptance: `unwrapSchema`/`getTypeName`/`zodToJsonSchema` discriminano via `_def.type` (stringa), `defaultValue` letto come **valore**, integer via `isInt`, enum/literal/union/record/array/object funzionanti su v4; probe di `_def.type` per tutte le shape usate eseguito e documentato (appendice al plan).
  - Verify: `npm test -w @olonjs/core` verde; nessun cambiamento di forma nell'output JSON Schema.
  - Files: `packages/core/package.json` (devDep zod `^4.0.0`), `packages/core/src/contract/webmcp-contracts.ts`

- [x] **T2 — Golden test v4 del serializer + type-level**
  - Acceptance: nuovo file di test con golden assertions su object/array/enum/literal/union/record/default/optional/nullable/number(int); eventuali fix type-level in `zod-schemas.ts` (es. `z.ZodType<...>`, `z.lazy`, `.catchall`) applicati se la compilazione fallisce.
  - Verify: `npm test -w @olonjs/core` verde; `npm run build -w @olonjs/core` verde.
  - Files: `packages/core/src/contract/webmcp-contracts-v4.test.ts`, (se serve) `packages/core/src/contract/zod-schemas.ts`

- [x] **T3 — Core: peer zod ^4 + 2.0.0 + CHANGELOG**
  - Acceptance: peer `"zod": "^4.0.0"`; version `2.0.0`; CHANGELOG.md di core aggiornato con la breaking change e migration note.
  - Verify: `npm run build -w @olonjs/core` verde.
  - Files: `packages/core/package.json`, `packages/core/CHANGELOG.md`

## Slice B — Ecosystem packages

- [x] **T4 — Studio: peer zod ^4 + 0.2.0 + verifica internals**
  - Acceptance: peer+devDep zod `^4.0.0`; usi di `_def.innerType/values/description` e `instanceof z.ZodEnum` in FormFactory/AdminSidebar verificati (fix solo se v4 li rompe); version `0.2.0`.
  - Verify: `npm test -w @olonjs/studio` verde; build verde.
  - Files: `packages/studio/package.json`, (se serve) `packages/studio/src/admin/FormFactory.tsx`, `packages/studio/src/admin/AdminSidebar.tsx`

- [x] **T5 — React: dep core ^2 + 0.2.0**
  - Acceptance: `@olonjs/core: ^2.0.0`; version `0.2.0`.
  - Verify: `npm run build -w @olonjs/react` verde.
  - Files: `packages/react/package.json`

- [x] **T6 — MCP: drop zod + 1.0.153**
  - Acceptance: dipendenza `zod` rimossa (non usata nel src); version `1.0.153`.
  - Verify: `npm run build -w @olonjs/mcp` verde.
  - Files: `packages/mcp/package.json`

- [x] **T7 — Stack: manifest v4 + 1.1.0**
  - Acceptance: `stack-versions.json` → peer `zod ^4.0.0`, `packages` → core `^2.0.0`, studio/react `^0.2.0`; version `1.1.0`.
  - Verify: `node -e "require('@olonjs/stack')"`-style smoke o build.
  - Files: `packages/stack/stack-versions.json`, `packages/stack/package.json`

- [x] **T8 — Compat ×3: allineamento dep**
  - Acceptance: `@jsonpages/core` → dep `@olonjs/core ^2.0.0`; `@jsonpages/cli` e `@jsonpages/stack` allineati ai rispettivi target.
  - Verify: build/pack smoke dei tre package.
  - Files: `packages/jsonpages-core-compat/package.json`, `packages/jsonpages-cli-compat/package.json`, `packages/jsonpages-stack-compat/package.json`

- [x] **T9 — Install root + build:all + boundary**
  - Acceptance: `npm install` completo; nessun errore di peer resolution bloccante.
  - Verify: `npm run build:all` verde; `npm run test:boundary` verde.
  - Files: `package-lock.json` (rigenerato), nessun sorgente

## Slice C — Tenant apps

- [x] **T10 — tenant-alpha: zod ^4 + z.email()**
  - Acceptance: dep `"zod": "^4.0.0"`; `z.string().email()` → `z.email()` in form-demo.
  - Verify: `npm run build -w tenant-alpha` verde (o dev smoke).
  - Files: `apps/tenant-alpha/package.json`, `apps/tenant-alpha/src/components/form-demo/schema.ts`

- [x] **T11 — next: idem**
  - Files: `apps/next/package.json`, `apps/next/src/components/form-demo/schema.ts`
  - Verify: `npm run build -w tenant-next` verde.

- [x] **T12 — olonjs.io: idem**
  - Files: `apps/olonjs.io/package.json`, `apps/olonjs.io/src/components/form-demo/schema.ts`
  - Verify: `npm run build -w olonjs-landing` verde.

- [x] **T12b — Lockfile pulito**
  - Acceptance: `npm install`; **zero occorrenze di `zod@3`** in `package-lock.json`.
  - Verify: `grep -c '"node_modules/zod"' package-lock.json` → una sola voce, versione 4.x.

## Slice D — Contratti, DNA, changelog

- [x] **T13 — bump:all a diff zero**
  - Acceptance: `npm run bump:all` esegue senza errori; `git diff apps/olonjs.io/public/schemas/v1/` = **zero** (o diff giustificato e approvato dall'utente).
  - Note in corso d'opera: `zod-to-json-schema` è **non più mantenuto** (nov 2025) e non supporta schemi v4 → le canonical schemas si autorano via subpath `zod/v3` (incluso nel package zod v4); output **byte-identico**. Range zod stretti a **`^4.6.0`** (baseline internals del serializer). Follow-up tracciato: migrare `bump-schemas.ts` a `z.toJSONSchema()` nativo.
  - Verify: `npm run bump:all` + diff review (diff zero confermato).
  - Files: `packages/core/src/contract/zod-schemas.ts`, range zod in core/studio/stack/apps

- [ ] **T14 — Templates + DNA**
  - Acceptance: `npm run check:templates` verde; `npm run dist:dna:all` rigenera i template con zod `^4` proiettato.
  - Verify: entrambi i comandi verdi; diff dei template riesaminato.
  - Files: `packages/cli/assets/**` (rigenerati)

- [ ] **T15 — Changelog `/changelog/<nome-commit>.md`**
  - Acceptance: file changelog con: breaking change (peer zod v4), migration note tenant (`z.string().email()` → `z.email()`), tabella semver con **entrambe le colonne** — pre-set (core 2.0.0, studio/react 0.2.0, mcp 1.0.153, stack 1.1.0) e pubblicate via release:enterprise (core 2.0.1, studio/react 0.2.1, mcp 1.0.154, stack 1.1.1, compat allineati).
  - Verify: revisione utente.
  - Files: `changelog/<nome-commit>.md` (nuovo)

- [ ] **T16 — Rilascio: dry-run poi `release:enterprise`**
  - Acceptance: `node scripts/release.js --dry-run` (o `npm run release:enterprise` dopo review del dry-run) eseguito; piano comandi verificato; release reale con `NPM_TOKEN` presente; versioni pubblicate coerenti con la colonna "pubblicate" del changelog.
  - Verify: dry-run review → release → `npm view @olonjs/core version` = 2.0.1 (o successiva patch libera).
  - Files: nessuno atteso nel repo (solo bump di package.json post-release, da committare)
