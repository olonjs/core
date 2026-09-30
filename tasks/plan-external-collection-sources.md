# Implementation Plan: External Collection Sources (`@olonjs/sources`)

**Created:** 2026-09-29
**Status:** Planned — ready to execute
**Module id:** `external-collection-sources`
**Spec:** [`specs/external-collection-sources-v1.md`](../specs/external-collection-sources-v1.md) · **ADR:** [`docs/decisions/ADR-0018`](../docs/decisions/ADR-0018-external-collection-sources-as-package.md)

---

## Overview

Ship the declarative external-source seam as a new package `@olonjs/sources` (peer `@olonjs/core`, **core untouched**), plus policy decorators, a conformance/test kit, and an end-to-end demo in `apps/next` (`/prodotti` list + `/prodotti/[slug]` detail) backed by a deterministic local provider.

## Architecture Decisions (locked)

| # | Decision |
|---|---|
| D1 | Seam in the **package**, not core. `git diff packages/core` must be zero. |
| D2 | Integration via existing `collections`/`collectionSchemas` injection; no new core config field. |
| D3 | No duplicated traversal: reuse core **public** helpers (`getCollectionRefBindings`, `resolveCollectionContext`, page `collection` binding). |
| D4 | One `shape` per source feeds validation (`shape.parse`) **and** contract emission (`collectionSchemas`). |
| D5 | Policy only in decorators (cache/retry/timeout/fallback/breaker) + structured events; core owns none. |
| D6 | Projected sources are `readOnly` by default; never persisted; provenance (`source`, `fetchedAt`, `stale`). |
| D7 | Tests hermetic (fake clock, zero network); provider conformance suite published. |
| D8 | Demo provider deterministic+local; optional real provider file outside tests. |
| D9 | Name `@olonjs/sources`; v1 includes all five decorators; `/prodotti/[slug]` in v1; hook in a dedicated loader module. |

## Dependency Graph

```
P1 contract + collect + resolve ──┬── P2 decorators (cache/retry/timeout/fallback/breaker)
                                  └── P3 testing kit + conformance suite
                                          │
                                          └── P4 build gates + package metadata (peer core, sideEffects)
                                                  │
                                                  └── P5 demo in apps/next (/prodotti, /prodotti/[slug])
```

## Task List

### Phase 1 — Package core (TDD)
- [ ] Task 1: package scaffold (`packages/sources`: package.json, tsconfig, vite.config, vitest.config) with build = `typecheck && vite build`
- [ ] Task 2: contract types (`CollectionSource`, `CollectionSourceContext`, `SourceError`, `SourceEvent`, `defineCollectionSource`) — RED tests first
- [ ] Task 3: `collectCollectionSources(page)` via core public helpers — tests (page.collection + `ui:collection-ref:*` bindings)
- [ ] Task 4: `resolveCollectionSources` (needed-only, `shape.parse`, provenance, typed errors, abort) — tests

### Checkpoint: Package core
- [ ] `npm test -w @olonjs/sources` verde · `npm run typecheck -w @olonjs/sources` verde · `git diff packages/core` vuoto

### Phase 2 — Policy decorators (TDD, fake clock)
- [ ] Task 5: `withCache` (ttl, swrMs, pluggable `CacheStore`) + tests
- [ ] Task 6: `withRetry` (attempts, backoff+jitter) + `withTimeout` + tests
- [ ] Task 7: `withFallback` (stale) + `withCircuitBreaker` + tests

### Phase 3 — Testing kit
- [ ] Task 8: `@olonjs/sources/testing`: `createTestSource`, fake clock, `runSourceConformance(source)` + self-test with the example source

### Checkpoint: Package complete
- [ ] Suite completa verde (P1–P3) · zero rete nei test

### Phase 4 — Distribution
- [ ] Task 9: package metadata (`sideEffects:false`, peer `@olonjs/core`, prepack peers sync), `stack-versions.json` peer entry; release-graph inclusion flagged as **Ask first**

### Phase 5 — Demo in apps/next
- [ ] Task 10: `src/sources/catalogo.ts` (deterministic local provider) + `src/collections/prodotti/{schema,types,index}.ts` + types augmentation
- [ ] Task 11: capsule `src/components/prodotti-list/` + ComponentRegistry/SECTION_SCHEMAS
- [ ] Task 12: pages `prodotti.json` + `prodotti/[slug].json` + menu link + loader wiring (`loadVisitorPageBundle`)
- [ ] Task 13: verify contracts/manifest (`/prodotti.json`, `/schemas/collections/catalogo.schema.json`, `/mcp-manifests/prodotti.json`) + webmcp feature-check

### Checkpoint: Complete
- [ ] `/prodotti` e `/prodotti/<id>` renderizzano dati proiettati; contratti dalla stessa shape; core intatto
- [ ] Review umana

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Duplicating core traversal | High | D3: only core public helpers; test with real page fixtures |
| Test non-hermetic (network) | High | D7: fake clock + `createTestSource`; CI-safe |
| Contract emission drift (shape vs collectionSchemas) | Medium | D4: single shape; assert emitted schema equals core's builder output |
| Next loader lifecycle (force-dynamic route) | Medium | per-route resolution in the loader; cache decorator for cross-request |
| Studio tries to persist projected entities | Medium | D6 readOnly convention documented in the package + demo |

## Out of Scope

- Publishing to npm (Ask first) and adding `@olonjs/sources` to `release.js` graph in this phase.
- Real Shopify provider implementation (optional file, outside tests).
- Editorial overlay (authored base + overlay) — separate future capability.
- Any change to `packages/core`.

## Open Questions

None — all decided (spec OQ closed 2026-09-29).
