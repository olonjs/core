# 01 — Align `generate_inkwell_next.sh` to current next-inkwell

## Overview

Aggiornare lo script generator Inkwell in **`npm-jpcore/apps/next/`** affinché, rieseguito sul DNA Next, riproduca lo **stato attuale** del contenuto tenant Inkwell in `/home/dev/temp/next-inkwell`. Il runtime Next (app/, loaders, admin, package.json) resta fuori scope.

## Confirmed locations

| Ruolo | Path |
|-------|------|
| **Repo di implementazione** | `/home/dev/npm-jpcore` |
| **Script da modificare** | `apps/next/templates/generate_inkwell_next.sh` |
| **Test statici da estendere** | `apps/next/scripts/generate-inkwell-next.test.mjs` |
| **SOT contenuto heredoc (stato Inkwell attuale)** | `/home/dev/temp/next-inkwell` (`src/collections`, `src/components/*`, `src/data/*`, …) |
| **Piano** | `apps/next/docs/01-align-generate-inkwell-next-plan.md` |
| **Todo** | `apps/next/docs/01-align-generate-inkwell-next-todo.md` |

**Nota:** oggi `apps/next` nel monorepo ha DNA diverso (es. authors/libri). Lo script Inkwell **non** riflette quel DNA; lo **sostituisce** quando viene eseguito. I body degli heredoc si copiano da `temp/next-inkwell`, non dallo stato corrente di `apps/next/src`.

Gli script in `temp/next-inkwell/templates/` e `apps/next/templates/` risultano **identici** al momento del piano (3310 linee) — la modifica ufficiale è su **npm-jpcore**.

## Architecture Decisions

- **Implementazione solo su `npm-jpcore/apps/next/`.** Nessun edit “ufficiale” richiesto su `temp/next-inkwell` salvo riuso come SOT di lettura.
- **SOT degli heredoc = file in `temp/next-inkwell`.** Copiare body byte-for-byte (o semanticamente equivalenti) da lì nello script di `apps/next`.
- **Lasciare il `$ref` anomalo** `../collections/tags/tags.json#/engineering` su `designing-with-constraints` così com’è nel SOT (core permissivo; non normalizzare).
- **Path pagine dinamiche = nested filesystem.** Scrivere `src/data/pages/posts/[slug].json` e `src/data/pages/tags/[slug].json` (non più flat `post-detail.json` / `tag-detail.json`). Aggiornare `mkdir`. `$ref` relativi = `../../collections/...` come nel SOT.
- **Contratto relazione posts→tags = `$ref` + helper.** Schema `ui:collection-ref:tags`, dati con pointer, emit di `tag-refs.ts`, View che importano gli helper.
- **Pretty-print JSON.** Allineare `theme`/`site`/`menu`/`home` al SOT (solo formatting).
- **Test statici** in `apps/next/scripts/generate-inkwell-next.test.mjs` — gate su `$ref` / `tag-refs` / path `[slug]`.

## Dependency Graph

```
tag-refs.ts (nuovo emit)
    │
    ├── posts/schema.ts (union + ui:collection-ref)
    │       │
    │       └── posts.json ($ref pointers, inclusa anomalia)
    │
    ├── posts-list / related-tags / tag-posts Views
    │
    └── banner/checklist commenti

page path rename (mkdir + cat targets + $ref depth)
    │
    └── post/tag detail page JSON

pretty-print config/pages JSON (indipendente)

generator test gates (apps/next/scripts/...)
    └── dipende da stringhe/path finali nello script
```

## Task List

### Phase 1: Foundation — contratto collezioni `$ref`

- [x] Task 1: Emit `tag-refs.ts` (body da `temp/next-inkwell`)
- [x] Task 2: Align posts collection schema
- [x] Task 3: Align `posts.json` heredoc (keep anomalous `$ref`)

### Checkpoint: Foundation
- [x] Script contains `tag-refs.ts` heredoc and `ui:collection-ref:tags`
- [x] No remaining posts `z.array(z.string()).describe('ui:list')`

### Phase 2: Views

- [x] Task 4: Align `posts-list/View.tsx`
- [x] Task 5: Align `related-tags/View.tsx`
- [x] Task 6: Align `tag-posts/View.tsx`

### Checkpoint: Views
- [x] All three View heredocs import `@/collections/posts/tag-refs`

### Phase 3: Dynamic page paths

- [x] Task 7: Switch emits + mkdir to nested `[slug].json` paths
- [x] Task 8: Align detail page JSON bodies (`../../collections/...`)

### Checkpoint: Pages
- [x] Zero flat `post-detail.json` / `tag-detail.json` targets

### Phase 4: Exact JSON + docs

- [x] Task 9: Sync pretty-printed JSON heredocs from SOT
- [x] Task 10: Update banner + checklist text

### Phase 5: Verification

- [x] Task 11: Extend `apps/next/scripts/generate-inkwell-next.test.mjs`
- [x] Task 12: Static re-diff script targets vs `temp/next-inkwell` (0 semantic DIFFER; anomalous `$ref` preserved)

### Checkpoint: Complete
- [x] Generator unit tests pass in npm-jpcore
- [x] Diff clean vs SOT
- [x] Ready for optional live `bash templates/generate_inkwell_next.sh` on `apps/next` (distruttivo — solo con OK esplicito)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edit accidentale di `temp/next-inkwell` come target | Med | Solo lettura SOT; write path = `apps/next/templates/...` |
| Confondere DNA corrente `apps/next` (authors/libri) con SOT Inkwell | High | Heredoc sempre da `temp/next-inkwell` |
| Heredoc quoting su `$ref` | High | `<<'EOF'` quoted; copy-from-file |
| `mkdir` senza nested `pages/posts` / `pages/tags` | Med | Explicit mkdir in Task 7 |
| Normalizzazione involontaria del `$ref` anomalo | Med | AC esplicita: stringa deve restare |
| Full generator run wipe su `apps/next` | High | Solo dopo OK umano |

## Open Questions

- Nessuna bloccante. Live run dello script su `apps/next` resta **fuori** finché non richiesto.
