# Zod v4-only — Migrazione dell'ecosistema OlonJS

- **Commit di riferimento:** `1cdd98e` (`feat(core)!: migrate to zod v4-only, rewrite serializer internals`)
- **Spec:** `specs/zod-v4-migration-v1.md`
- **Plan/Tasks:** `tasks/plan-zod-v4-alignment.md` · `tasks/todo-zod-v4-alignment.md`

## Breaking change

L'intero ecosistema `@olonjs/*` passa a **Zod v4-only** (`zod ^4.6.0`). Il peer `^3.24.1` è rimosso: i consumer devono installare `zod@^4.6.0`.

### Migration note per i tenant

- `z.string().email()` → **`z.email()`**
- `z.record(valueSchema)` a un argomento non è più ammesso → **`z.record(z.string(), valueSchema)`** (tutti i tenant nel monorepo erano già a due argomenti)
- `.default()` su enum senza `.optional()` resta valido (in v4 `.default()` implica optional)

## Cosa è cambiato tecnicamente

1. **Serializer hand-rolled** (`@olonjs/core/src/contract/webmcp-contracts.ts`) migrato dagli internals v3 (`_def.typeName` + `z.ZodFirstPartyTypeKind`, `_def.defaultValue()`, `_def.shape()`, `_def.checks[].kind`) agli internals v4.6 (`_def.type`, `defaultValue` come valore, `shape` come mappa, `_def.entries` / `_def.values` / `_def.element`, check `number_format`/`safeint`). **Output JSON Schema invariato** — golden test in `webmcp-contracts-v4.test.ts`.
2. **Studio** (`@olonjs/studio`): `_def.values` → `_def.entries` (FormFactory), `ZodRecord.valueSchema` getter → `_def.valueType`.
3. **Canonical schemas** (`packages/core/src/contract/zod-schemas.ts`): autorate via subpath **`zod/v3`** incluso nel package zod v4 — `zod-to-json-schema` è non più mantenuto (nov 2025) e supporta solo schemi v3-dialect. `npm run bump:all` produce output **byte-identico** (diff zero). Follow-up tracciato: migrare `bump-schemas.ts` a `z.toJSONSchema()` nativo e rimuovere `zod-to-json-schema`.
4. **`@olonjs/mcp`**: rimossa la dipendenza `zod` (mai usata nel src).

## Tabella versioni

| Pacchetto | Pre-set nel repo | Pubblicata da `release:enterprise` (auto-patch +1) |
|---|---|---|
| `@olonjs/core` | 2.0.0 | 2.0.1 |
| `@olonjs/studio` | 0.2.0 | 0.2.1 |
| `@olonjs/react` | 0.2.0 | 0.2.1 |
| `@olonjs/mcp` | 1.0.153 | 1.0.154 |
| `@olonjs/stack` | 1.1.0 | 1.1.1 |
| `@jsonpages/*` | allineati ai target | seguono i target |

`release:enterprise` esegue auto-patch (`npm version patch`) su ogni package in ordine ADR-0016 — decisione **Opzione 1**: le versioni pubblicate sono +1 patch rispetto al pre-set.

## Verifiche

- Core: 89/89 test (12 file) · Studio: 14/14 · React: 10/10
- `build:all` verde (core, studio, react, mcp, next, tenant-alpha, tenant-next, olonjs.io)
- `npm run test:boundary` verde
- `npm run bump:all` → **diff zero** su `apps/olonjs.io/public/schemas/v1/`
- `npm run check:templates` verde · `npm run dist:dna:all` → template con zod `^4.6.0` e pin nuovi
- Lockfile: unica `zod@4.6.5`, zero `zod@3`
