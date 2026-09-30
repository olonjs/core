# Task checklist: External Collection Sources (`@olonjs/sources`)

**Created:** 2026-09-29
**Plan:** [`plan-external-collection-sources.md`](./plan-external-collection-sources.md)
**Spec:** [`../specs/external-collection-sources-v1.md`](../specs/external-collection-sources-v1.md)
**Status:** In progress — Phase 1 (package core) done
**Regola:** TDD (RED→GREEN), test ermetici (fake clock, zero rete), `packages/core` intatto.

---

## Phase 1 — Package core

- [x] **Task 1 — Scaffold `packages/sources`**
  - Acceptance: package.json (`@olonjs/sources`, peer `@olonjs/core`, `sideEffects:false`), tsconfig, vite.config, vitest.config; `build = npm run typecheck && vite build`.
  - Verify: `npm run typecheck -w @olonjs/sources` (con placeholder export) e `npm test -w @olonjs/sources` passano.
  - Files: `packages/sources/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,src/index.ts}`
  - Scope: Small

- [x] **Task 2 — Contract + `defineCollectionSource`**
  - Acceptance: `CollectionSource`, `CollectionSourceContext`, `SourceError` (code/source/retryable/cause), `SourceEvent`, `defineCollectionSource` con inferenza; nessun throw raw.
  - Verify: unit test del tipo/errore; `npm test -w @olonjs/sources`
  - Files: `packages/sources/src/contract.ts`, `src/index.ts`, `src/contract.test.ts`
  - Scope: Small

- [x] **Task 3 — `collectCollectionSources(page)`**
  - Acceptance: dato una `PageConfig`, restituisce i source name necessari (da `page.collection.source` e dai binding `ui:collection-ref:*`/`$ref` via `getCollectionRefBindings` di core); nessuna logica core duplicata.
  - Verify: test con fixture di pagine reali (lista + dettaglio) + caso sorgente assente
  - Files: `packages/sources/src/collect.ts`, `src/collect.test.ts`
  - Scope: Small

- [x] **Task 4 — `resolveCollectionSources`**
  - Acceptance: risolve solo le sorgenti richieste, `shape.parse` sul documento, invariante chiave===item.id, ritorna `{ collections, collectionSchemas, provenance }`, errori → `SourceError`, `abort` propagato; memoize per-ctx (una `resolve` per source per chiamata).
  - Verify: test (needed-only, validazione fallita, errore tipizzato, abort, dedupe)
  - Files: `packages/sources/src/resolve.ts`, `src/resolve.test.ts`
  - Scope: Medium

### Checkpoint: Package core
- [ ] `npm test -w @olonjs/sources` verde
- [ ] `npm run typecheck -w @olonjs/sources` verde
- [ ] `git diff packages/core` vuoto

## Phase 2 — Policy decorators

- [ ] **Task 5 — `withCache`**
  - Acceptance: ttl + stale-while-revalidate + `CacheStore` pluggable (default in-memory); hit/miss/stale esposti via eventi; nessuno stato globale nascosto.
  - Verify: test con fake clock (hit, miss, scadenza, swr, store custom)
  - Files: `packages/sources/src/decorators/cache.ts`, `src/decorators/cache.test.ts`
  - Scope: Medium

- [ ] **Task 6 — `withRetry` + `withTimeout`**
  - Acceptance: retry solo su errori retryable, backoff+jitter deterministico con clock iniettato; timeout annulla la resolve e produce `SourceError` `code:'timeout'`.
  - Verify: test con fake clock (attempts, backoff, timeout, non-retryable non ritentato)
  - Files: `packages/sources/src/decorators/{retry,timeout}.ts`, test
  - Scope: Medium

- [ ] **Task 7 — `withFallback` + `withCircuitBreaker`**
  - Acceptance: fallback su stale quando la sorgente fallisce; breaker apre dopo N fallimenti, cooldown, half-open.
  - Verify: test con fake clock
  - Files: `packages/sources/src/decorators/{fallback,breaker}.ts`, test
  - Scope: Medium

## Phase 3 — Testing kit

- [ ] **Task 8 — `@olonjs/sources/testing`**
  - Acceptance: `createTestSource`, fake clock, `runSourceConformance(source)` (abort, chiave===id, errori tipizzati, parse, eventi attesi); il provider d'esempio la passa.
  - Verify: self-test del kit + conformance su un provider d'esempio in test
  - Files: `packages/sources/src/testing/*`, test
  - Scope: Medium

### Checkpoint: Package complete
- [ ] Suite verde (P1–P3), nessun accesso di rete nei test

## Phase 4 — Distribution

- [ ] **Task 9 — Metadati + stack**
  - Acceptance: `sideEffects:false`, peer `@olonjs/core`; entry in `packages/stack/stack-versions.json`; prepack peers sync (come gli altri package). Inclusione in `release.js` **Ask first** (non in questa fase).
  - Verify: build verde; ispezione `package.json`/stack
  - Files: `packages/sources/package.json`, `packages/stack/stack-versions.json`
  - Scope: Small

## Phase 5 — Demo in apps/next

- [x] **Task 10 — Provider d'esempio + collection schema**
  - Acceptance: `src/sources/catalogo.ts` deterministico (finto servizio esterno, latenza/errore controllabili) con `defineCollectionSource` + `withCache`; `src/collections/prodotti/{schema,types,index}.ts` (`ProdottoSchema`); augmentation `CollectionItemRegistry`.
  - Verify: unit test del provider con `runSourceConformance`; typecheck tenant
  - Files: `apps/next/src/sources/*`, `apps/next/src/collections/prodotti/*`, `apps/next/src/types.ts`
  - Scope: Medium

- [x] **Task 11 — Capsula `prodotti-list`**
  - Acceptance: capsule TBP (View/schema/types/index); schema `items: z.record(z.string(), ProdottoSchema).describe('ui:collection-ref:catalogo')`; View pura (nessun fetch); registrata in ComponentRegistry + SECTION_SCHEMAS + augmentation.
  - Verify: `npm run typecheck -w tenant-next`; build
  - Files: `apps/next/src/components/prodotti-list/*`, `src/lib/ComponentRegistry.tsx`, `src/lib/schemas.ts`
  - Scope: Medium

- [x] **Task 12 — Pagine + loader wiring**
  - Acceptance: `src/data/pages/prodotti.json` (lista) + `prodotti/[slug].json` (`page.collection` binding); loader `src/lib/loaders/loadVisitorPageBundle.ts` che chiama `collectCollectionSources` + `resolveCollectionSources` e spreda `collections`/`collectionSchemas`; route sottile; link menu.
  - Verify: `npm run build -w tenant-next`; smoke dev su `/prodotti`
  - Files: `apps/next/src/data/pages/*.json`, `src/lib/loaders/loadVisitorPageBundle.ts`, `app/[[...slug]]/page.tsx`, `src/data/config/menu.json`
  - Scope: Medium

- [x] **Task 13 — Verifica contratti/manifest + gate**
  - Acceptance: `/prodotti.json` espone i dati proiettati; `/schemas/collections/catalogo.schema.json` e `/mcp-manifests/prodotti.json` derivano dalla stessa shape; `verify:webmcp` verde; `git diff packages/core` vuoto.
  - Verify: fetch dei 3 endpoint + feature-check
  - Files: nessuno (verifica)
  - Scope: XS

### Checkpoint: Complete
- [ ] `/prodotti` e `/prodotti/<id>` renderizzano dati proiettati
- [ ] Contratti agenti dalla stessa shape
- [ ] `packages/core` intatto
- [ ] Review umana
