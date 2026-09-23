# Plan: zod-v4-alignment

- **Spec:** `specs/zod-v4-migration-v1.md` (approvata)
- **Tasks:** `tasks/todo-zod-v4-alignment.md`
- **Convenzione nomi:** i file di plan/todo usano sempre un nome univoco `plan-<module-id>.md` / `todo-<module-id>.md` — **mai** sovrascrivere `plan.md` generico.

## Obiettivo del plan

Eseguire la migrazione v4-only di Zod sull'ecosistema, con il vincolo centrale: **l'output JSON Schema del serializer resta identico** (diff zero su `apps/olonjs.io/public/schemas/v1/` e contratti WebMCP).

## Componenti e dipendenze

```
┌─ A. Core engine (serializer + peer + 2.0.0) ──┐
│   dipende da: —                                │
└────────────────────────────────────────────────┘
        ↓ (il resto del monorepo consuma core)
┌─ B. Ecosystem packages ───────────────────────┐
│   studio(0.2.0) · react(0.2.0) · mcp(1.0.153) │
│   stack(1.1.0) · jsonpages-*-compat           │
│   dipende da: A                                │
└────────────────────────────────────────────────┘
        ↓ (lockfile unico zod@4)
┌─ C. Tenant apps ──────────────────────────────┐
│   tenant-alpha · next · olonjs.io             │
│   dipende da: A+B (lockfile pulito)           │
└────────────────────────────────────────────────┘
        ↓
┌─ D. Contratti + DNA + changelog ──────────────┐
│   bump:all (diff zero) · dist:dna:all ·       │
│   check:templates · /changelog/<commit>.md    │
└────────────────────────────────────────────────┘
```

**Vincolo di ordine**: A prima di tutto (è il rischio concentrato). B è in gran parte parallelizzabile. C richiede il lockfile a zod@4 unico. D chiude con le verifiche di non-regressione.

## Cosa si può fare in parallelo

- **B interno**: T4 (studio), T5 (react), T6 (mcp), T7 (stack), T8 (compat) sono indipendenti tra loro.
- **C interno**: T10/T11/T12 (tre app) sono indipendenti.
- **D parziale**: T15 (changelog) è scrivibile appena la tabella semver è confermata (anche prima di C).

## Sequenza (4 slice, 15 task)

| Slice | Task | Contenuto |
|---|---|---|
| **A** | T1 | core: devDep zod ^4 + riscrittura serializer su `_def.type` |
| | T2 | core: golden test v4 del serializer + fix type-level `zod-schemas.ts` se serve |
| | T3 | core: peer `^4.0.0` + version 2.0.0 + CHANGELOG.md |
| **B** | T4 | studio: peer+devDep zod ^4, verifica internals `_def`, version 0.2.0 |
| | T5 | react: dep core `^2.0.0`, version 0.2.0 |
| | T6 | mcp: drop dep zod, version 1.0.153 |
| | T7 | stack: `stack-versions.json` (zod ^4, core ^2, studio/react ^0.2), version 1.1.0 |
| | T8 | compat ×3: allineamento dep ai target |
| | T9 | `npm install` root + `build:all` + `test:boundary` |
| **C** | T10 | tenant-alpha: zod ^4 + `z.email()` |
| | T11 | next: idem |
| | T12 | olonjs.io: idem |
| **D** | T13 | `bump:all` → **diff zero** su schemas v1 |
| | T14 | `check:templates` + `dist:dna:all` |
| | T15 | `/changelog/<nome-commit>.md` |
| | T16 | `release:enterprise --dry-run` → review → `release:enterprise` |

## Rischi e mitigazioni

| Rischio | Mitigazione (dove) |
|---|---|
| `_def.type` ha nomi diversi dal previsto per qualche shape | T1 include un **probe**: dump di `_def.type` per ogni tipo Zod usato, prima dello switch |
| `_def.shape()` non più funzione in v4 | Verifica a runtime nel probe di T1; adattare lo switch `object` |
| Tipi classici (`z.ZodTypeAny`, `z.ZodRecord<...>`, `z.AnyZodObject`) non esportati dal root `"zod"` | Gate = compilazione TS in T1/T2; fallback: import da `zod/v4` o cast strutturali locali |
| Studio legge internals `_def` che cambiano in v4 | T4 verifica mirata; usi rilevati (`innerType`, `values`, `description`) già presenti in v4 |
| `bump:all` produce diff non-zero | **Fermarsi e mostrare il diff** (Boundary "Ask first") |
| Dual-zod transitorio nel lockfile (tra B e C) | Documentato: tollerato sul branch; il criterio "zero zod@3" vale per lo stato finale (fine Slice C) |

## Checkpoint di verifica (gate)

1. **Fine A**: `npm test -w @olonjs/core` verde su v4; `npm run build -w @olonjs/core` verde.
2. **Fine B**: `npm run build:all` + `npm run test:boundary` verdi.
3. **Fine C**: lockfile senza `zod@3`; build delle 3 app verde.
4. **Fine D**: `bump:all` diff zero; `check:templates` + `dist:dna:all` verdi; changelog presente.

## Integrazione con `release:enterprise` (Opzione 1)

- Le versioni nei task T3–T8 sono **pre-set** nel repo (2.0.0, 0.2.0, 1.1.0, 1.0.153).
- `scripts/release.js` (invocato da `release:enterprise` dopo `check:templates` + `dist:dna:all`) fa **auto-patch** (`npm version patch --no-git-tag-version`) su ogni package e riscrive i pin delle dipendenze in ordine ADR-0016 (stack → core → studio → react → mcp → next → tenant apps → cli → compat).
- Conseguenza: le versioni **pubblicate** saranno +1 patch rispetto al pre-set (core **2.0.1**, studio/react **0.2.1**, mcp **1.0.154**, stack **1.1.1**). Il changelog (T15) registra entrambe le colonne.
- T16 esegue `--dry-run` prima del rilascio reale per verificare il piano comandi senza pubblicare.

## Strategia di commit

- Il **merge è atomico** (unico change, come da assunzione 7 dello spec).
- Sul branch, commit per slice (A, B, C, D); ogni commit lascia il repo buildabile.
- Il dual-zod transitorio è confinato al lockfile tra B e C ed è eliminato da C.
