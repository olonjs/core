# 01 — Todo: Align `generate_inkwell_next.sh`

**Plan:** `docs/01-align-generate-inkwell-next-plan.md`  
**Implement in:** `/home/dev/npm-jpcore/apps/next/`  
**Edit:** `templates/generate_inkwell_next.sh`, `scripts/generate-inkwell-next.test.mjs`  
**Read SOT:** `/home/dev/temp/next-inkwell` (Inkwell content)  
**Status:** Implemented (generator aligned to temp/next-inkwell SOT).

## Phase 1: Foundation

- [x] **Task 1:** Emit `src/collections/posts/tag-refs.ts` in generator (copy from `temp/next-inkwell`).  
  **AC:** heredoc target exists; body matches SOT.  
  **Verify:** extract == SOT file. **Deps:** None. **Scope:** S

- [x] **Task 2:** Update posts `schema.ts` heredoc → `TagSchema | CollectionPointerSchema` + `ui:collection-ref:tags`.  
  **AC:** no `ui:list` string tags; matches SOT schema. **Deps:** Task 1. **Scope:** S

- [x] **Task 3:** Replace `posts.json` heredoc with SOT (keep `../collections/tags/tags.json#/engineering`).  
  **AC:** anomalous `$ref` present. **Deps:** Task 2. **Scope:** S

## Checkpoint: Foundation

- [x] Script has `tag-refs` + `ui:collection-ref:tags`
- [x] No posts `z.array(z.string()).describe('ui:list')`

## Phase 2: Views

- [x] **Task 4:** Align `posts-list/View.tsx` (`resolveTagId`). **Deps:** Task 1. **Scope:** S
- [x] **Task 5:** Align `related-tags/View.tsx` (`isResolvedTag`). **Deps:** Task 1. **Scope:** S
- [x] **Task 6:** Align `tag-posts/View.tsx` (`postHasTag`). **Deps:** Task 1. **Scope:** S

## Checkpoint: Views

- [x] All three Views import `@/collections/posts/tag-refs` in the script

## Phase 3: Dynamic pages

- [x] **Task 7:** Paths + mkdir → `src/data/pages/posts/[slug].json` and `tags/[slug].json`; remove flat targets. **Scope:** S
- [x] **Task 8:** Detail JSON bodies from SOT (`../../collections/...`). **Deps:** Task 7. **Scope:** S

## Checkpoint: Pages

- [x] Nested paths only

## Phase 4: Exact JSON + docs

- [x] **Task 9:** Sync `theme` / `site` / `menu` / `home` (+ remaining formatting DIFFER) from SOT. **Scope:** M
- [x] **Task 10:** Banner + checklist: `$ref` model, not “tag keys”. **Scope:** XS

## Phase 5: Verification

- [x] **Task 11:** Extend `apps/next/scripts/generate-inkwell-next.test.mjs`.  
  **Verify:** `node --test apps/next/scripts/generate-inkwell-next.test.mjs` (from npm-jpcore or apps/next). **Scope:** S
- [x] **Task 12:** Static re-diff all script targets vs `temp/next-inkwell`. **Scope:** S

## Checkpoint: Complete

- [x] Tests pass
- [x] Diff vs SOT clean
- [x] No live generator wipe unless explicitly requested
