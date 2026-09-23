# Spec: zod-v4-alignment — Migrazione dell'ecosistema OlonJS a Zod v4

- **Module id:** `zod-v4-alignment` (capability map: prima capability; `core-import-platform` dipende da questa)
- **Status:** DRAFT — in attesa di review umana (gate Phase 1)
- **Repo:** `npm-jpcore`
- **Decisione chiave già presa:** **v4-only** — niente dual-range `^3.24 || ^4`, niente feature-detection sugli internals.

---

## Assunzioni (approvate nel pre-spec)

1. Scope = intero monorepo npm-jpcore (core, studio, mcp, stack, `@jsonpages/*-compat`, app `tenant-alpha` / `next` / `olonjs.io`).
2. Nessun tenant esterno su zod 3 da proteggere: ecosistema generato dal CLI, major bump forzabile.
3. Il serializer hand-rolled `zodToJsonSchema` viene **adattato** a v4, non sostituito con `zod-to-json-schema`.
4. Semver: cambio di peer dependency = breaking → `@olonjs/core` **2.0.0**.
5. Pipeline canonical schemas (`npm run bump:all`, `zod-to-json-schema@3.25.2`, peer `^3.25.28 || ^4`) invariato.
6. Migrazione dei v3-ismi nei tenant meccanica e accettabile.
7. Tutto in un unico change atomico (packages + apps insieme, monorepo sempre verde).

---

## Objective

Allineare l'intero ecosistema `@olonjs/*` a **Zod v4 (v4-only)**, eliminando il dual-zod che oggi bloccherebbe l'import di `@olonjs/core` dentro `olon-platform` (che è già su `zod/v4` 4.4.3) e portando il runtime di core sullo standard corrente.

**User story:** *"Come maintainer di OlonJS, voglio che core/studio e le app tenant girino tutti su una singola major di Zod, così che olon-platform possa importare `@olonjs/core` senza installare una seconda copia di zod 3."*

**Non-obiettivi (out of scope):**
- L'import di `@olonjs/core` in olon-platform (capability successiva: `core-import-platform`).
- La fusione dei repo in monorepo (`monorepo-merge`).
- La sostituzione del serializer con `zod-to-json-schema`.

## Tech Stack

- zod: `^4.0.0` (attualmente 4.4.3), ovunque oggi è `^3.24.1`
- `zod-to-json-schema@3.25.2` (già peer-compatibile con v4) — solo per `npm run bump:all`
- TypeScript 5.7, Vitest 3 (core/studio), Vite 6

## Fatti verificati su zod 4.4.3 (base tecnica dello spec)

| V3 (oggi in core) | V4 (realtà verificata a runtime) | Impatto |
|---|---|---|
| `_def.typeName` + enum `z.ZodFirstPartyTypeKind` | **`_def.typeName` è `undefined`**; enum presente ma **vuoto** (0 membri, solo dichiarazione compat) | ⚠️ L'intero meccanismo di discriminazione del serializer è rotto in v4 |
| — | Discriminatore stabile: **`_def.type`** = stringa (`"string"`, `"record"`, `"optional"`, `"default"`, `"nullable"`, `"literal"`, `"enum"`, `"union"`, `"array"`, `"object"`) | Riscrittura di `getTypeName`/`unwrapSchema`/`zodToJsonSchema` |
| `_def.defaultValue()` (funzione/thunk) | **`_def.defaultValue` è un valore** | Fix puntuale in `unwrapSchema` |
| `_def.checks: [{ kind: 'int' }]` | **`_def.checks: [{ def, type, minValue, maxValue, isInt, isFinite, format }]`** | Fix puntuale nel caso `ZodNumber` (usare `isInt`) |
| `_def.innerType`, `_def.valueType`, `_def.keyType`, `_def.values`, `_def.options` | ✅ presenti invariati | Nessun impatto |
| `_def.shape()` (oggetti) | ✅ ancora funzione | Da verificare con test (non verificato a runtime qui) |
| Tipi classici (`z.ZodTypeAny`, `z.ZodOptional<T>`, `z.ZodRecord<...>`, `z.ZodEnum<[...]>`, `z.AnyZodObject`, …) | Esistono nel layer `v4/classic/compat` | Verificare compilazione TS; in caso sostituire con equivalenti v4 |
| `z.string().email()` | Deprecato → `z.email()` | 3 file tenant (form-demo in `tenant-alpha`, `next`, `olonjs.io`) |
| `z.record(val)` a 1 argomento | Non ammesso (key obbligatoria) | ✅ Già ok: tutti gli usi sono `z.record(z.string(), X)` |
| `.default()` su enum senza `.optional()` | Ok in v4 (`.default()` implica optional) | Nessun impatto su `base-schemas.ts` |
| Validazione email custom (`.regex(...)`) | — | ✅ Verificato: nessuna regex email custom nei tenant; unico pattern `z.string().email()` nei 3 file `form-demo/schema.ts` → sostituzione diretta con `z.email()` |

## Commands

```bash
# Build/test dell'ecosistema
npm run build -w @olonjs/core
npm test -w @olonjs/core          # vitest (serializer + contract tests)
npm run build -w @olonjs/studio
npm run build:all                 # tutti i workspace
npm run test:boundary             # check-package-boundaries

# Pipeline canonical schemas (deve produrre diff = 0 su apps/olonjs.io/public/schemas/v1/)
npm run bump:all

# Template governance / DNA
npm run check:templates
npm run dist:dna:all
```

## Project Structure (file toccati)

```
packages/core/
  package.json                     # peer zod ^3.24.1 → ^4.0.0
  src/contract/webmcp-contracts.ts # SERIALIZER — riscrittura discriminazione v4
  src/contract/zod-schemas.ts      # verifica type-level (z.ZodType, z.lazy, catchall)
  src/dna/lib/base-schemas.ts      # verifica .default() su enum (atteso: nessun cambio)
packages/studio/
  package.json                     # peer zod → ^4.0.0
  src/admin/FormFactory.tsx        # verifica _def.innerType/values/description (atteso: ok)
  src/admin/AdminSidebar.tsx       # idem
packages/mcp/
  package.json                     # drop dipendenza zod (non usata nel src)
packages/stack/stack-versions.json # peer zod → ^4.0.0 (proiezione CLI nei tenant)
packages/{react,next,cli}/         # nessun uso diretto di zod — solo bump se referenziato
packages/jsonpages-*-compat/       # verifica: nessuna dipendenza zod (già ok)
apps/tenant-alpha/  package.json + src/components/form-demo/schema.ts
apps/next/          package.json + src/components/form-demo/schema.ts
apps/olonjs.io/     package.json + src/components/form-demo/schema.ts
scripts/bump-schemas.ts            # verifica compat (zodToJsonSchema + ZodTypeAny import)
changelog/<nome-commit>.md          # CHANGELOG della migrazione (convenzione: un file per cambio, denominato dal commit)
```

## Changelog convention

Ogni cambio rilevante ha il **suo** file in `/changelog/`, denominato dal nome del commit (`/changelog/<nome-commit>.md`). La migrazione zod-v4 registra lì: breaking change (peer zod v4), migration note per i tenant (`z.string().email()` → `z.email()`), e la tabella semver dei pacchetti.

## Code Style

Il serializer resta **hand-rolled** e deterministico. Regole per la riscrittura:

```ts
// v4 — discriminazione via _def.type (stringa), NON _def.typeName + enum
function getTypeName(schema: z.ZodTypeAny): string | undefined {
  return (schema?._def as { type?: string })?.type;
}

// v4 — defaultValue è un VALORE
if (typeName === 'default') {
  isOptional = true;
  defaultValue = (current as z.ZodDefault<z.ZodTypeAny>)._def.defaultValue; // non chiamarlo!
}

// v4 — integer check via isInt, non kind === 'int'
const isInteger = checks.some((check) => check.isInt === true);
```

- **Nessun cambiamento di forma dell'output** JSON Schema: il diff su `apps/olonjs.io/public/schemas/v1/` e sui contratti WebMCP deve restare zero (o solo cambi giustificati e documentati).
- Logica pura, nessuna dipendenza runtime nuova.
- Zero modifiche alla public API di core oltre alla peer dependency.

## Testing Strategy

- **Vitest** (core, studio): i test esistenti sono la rete di sicurezza primaria:
  - `packages/core/src/contract/webmcp-contracts.test.ts`
  - `packages/core/src/contract/collection-contracts.test.ts`
  - `packages/core/src/webmcp/webmcp-contracts.test.ts`
- **Nuovo test dedicato** `zodToJsonSchema` v4: golden assertions sulle forme attese (object/array/enum/literal/union/record/default/optional/nullable) — lo stesso set di casi già coperti, ri-eseguito su v4.
- **Test di non-regressione contratti**: snapshot o confronto del JSON Schema generato con i file pubblicati in `apps/olonjs.io/public/schemas/v1/` (diff zero).
- **Gates di verifica per task** (vedi Tasks): build workspace, `npm run bump:all` → diff zero, `npm run check:templates`, `npm run test:boundary`.

## Boundaries

- **Always:**
  - Eseguire `npm test -w @olonjs/core` prima di ogni commit della fase.
  - Mantenere l'output JSON Schema del serializer identico (diff zero su schemas v1 e contratti WebMCP).
  - Commit atomici per area (core → stack/compat → studio/mcp → apps).
- **Ask first:**
  - Modifiche alla public API di `packages/core` oltre alla peer dependency (regola CLAUDE.md).
  - Cambi alla forma dell'output JSON Schema (se il diff non è zero, fermarsi e chiedere).
  - Upgrade di `zod-to-json-schema` o altri tool del pipeline.
- **Never:**
  - Dual-range zod (`^3 || ^4`) o feature-detection sugli internals — decisione chiusa.
  - Patchare i `.schema.json` pubblicati direttamente (ADR-0003: Zod è la SOT).
  - Bypassare `release:enterprise` (check:templates + dist:dna:all) al momento del rilascio — **decisione Opzione 1**: lo si esegue così com'è; fa auto-patch, quindi le versioni pubblicate sono X.Y.1.

## Success Criteria

1. `packages/core/package.json` dichiara peer `zod: ^4.0.0`; **nessun** `zod@3` presente nel lockfile del monorepo dopo l'installazione.
2. `npm test -w @olonjs/core` verde su zod v4, inclusi i test del serializer (adattato) e i nuovi golden test.
3. `npm run bump:all` produce **diff zero** in `apps/olonjs.io/public/schemas/v1/` (o diff giustificato e approvato).
4. `npm run build:all` verde per tutti i workspace; `npm run test:boundary` verde.
5. Le 3 app (`tenant-alpha`, `next`, `olonjs.io`) compilano e girano con zod v4; `z.string().email()` → `z.email()` nei 3 file `form-demo/schema.ts`.
6. `@olonjs/mcp` non dipende più da zod (dipendenza morta rimossa).
7. `npm run check:templates` + `npm run dist:dna:all` verdi; i template DNA proiettano zod `^4`.
8. Versioni **pre-set** nel repo: `@olonjs/core` **2.0.0**, studio/react **0.2.0**, mcp **1.0.153**, stack **1.1.0**; pubblicazione via **`npm run release:enterprise`** (Opzione 1: le versioni pubblicate saranno +1 patch — core 2.0.1, ecc.), preceduta da `--dry-run`.
9. Changelog presente in **`/changelog/<nome-commit>.md`** con breaking change, migration note tenant, tabella semver (pre-set e pubblicate).

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Il discriminator `_def.type` ha casi con nomi diversi dal previsto (es. `"optional"` vs `"ZodOptional"`) | Golden test su tutti i tipi Zod usati dai tenant + dump di `_def.type` per ogni shape prima di scrivere lo switch |
| `_def.shape()` potrebbe non essere più una funzione in v4 | Verifica a runtime nel primo task; se cambiata, adattare (probabilmente `shape` resta un getter) |
| Tipi classici (`z.ZodTypeAny` ecc.) non esportati dal root `"zod"` in v4 | Compilazione TS come gate; fallback: import da `zod/v4` o cast strutturali locali |
| Diff non-zero nel bump:all a causa di default/optional | Fermarsi, mostrare il diff, decidere con review umana |
| Studio FormFactory/AdminSidebar leggono `_def` internals | Test di fumo studio + verifica mirata; gli usi rilevati (`innerType`, `values`, `description`) risultano già presenti in v4 |

## Open Questions

1. ~~Bump semver degli altri pacchetti~~ → **CHIUSA**: regola confermata: *peer/dep change = breaking; in 0.x il breaking si esprime come minor*.
   - `@olonjs/core` → **2.0.0**
   - `@olonjs/studio` → **0.2.0** (peer zod ^4)
   - `@olonjs/react` → **0.2.0** (dep core ^2.0.0)
   - `@olonjs/mcp` → **1.0.153** (drop dep zod morta; non-breaking per i consumer)
   - `@olonjs/stack` → da valutare (manifest + proiezione peer nei tenant via CLI); default: **1.1.0**
   - `@jsonpages/*-compat` → seguono i rispettivi target (ri-export di core)
   - **Integrazione release** (decisione Opzione 1): `release:enterprise` fa auto-patch su ogni package. Le versioni qui sopra sono **pre-set** nel repo; le versioni **pubblicate** saranno +1 patch: core **2.0.1**, studio **0.2.1**, react **0.2.1**, mcp **1.0.154**, stack **1.1.1**. Il changelog registra le versioni reali pubblicate.
2. ~~Changelog~~ → **CHIUSA**: sì, registrare — **fondamentale**. Il changelog della migrazione vive in **`/changelog/<nome-commit>.md`** (un file per cambio, denominato dal nome del commit).

---

*Spec soggetta al workflow gated: questo documento attende review umana prima di avanzare a Phase 2 (Plan) e Phase 3 (Tasks).*
