# External Collection Sources (`@olonjs/sources`)

Declarative **projection of external systems of record** into the OlonJS contract.

- Spec: [`specs/external-collection-sources-v1.md`](../specs/external-collection-sources-v1.md)
- Decision: [ADR-0018](./decisions/ADR-0018-external-collection-sources-as-package.md)
- Package: `packages/sources` → `@olonjs/sources` (peer/dep `@olonjs/core`)
- Reference demo: `apps/next` → `/prodotti` and `/prodotti/[slug]`

---

## The authored vs projected boundary

OlonJS has two kinds of content and they follow opposite rules:

| | Authored | Projected |
|---|---|---|
| **What** | pages, copy, design, navigation, editorial overlays | catalog, price, stock, PIM records, any system-of-record entity |
| **Source of truth** | the **repo** (git / local / cloud / save2repo) | the **external system** (Shopify, a PIM, a proprietary API) |
| **OlonJS owns** | the document | the **contract (shape)** only |
| **Studio** | editable, persisted | **read-only**, never persisted |
| **Contract** | published JSON Schema from Zod | published JSON Schema from the source's Zod shape |

OlonJS's value for projected entities is the **contract + the projection engine**, not storage. The repo must never pretend to own values whose SOT is elsewhere (see the rejected "materialize into the repo" option in ADR-0018).

The seam lives in **`@olonjs/sources`**, not in `@olonjs/core`: core stays pure, sync and IO-free. Adding a provider never touches core.

---

## Provider authoring — quick start

A provider is an object implementing one contract: **one shape, one resolver**.

```ts
import { z } from 'zod';
import { defineCollectionSource, withCache } from '@olonjs/sources';
import { ProdottoSchema } from '@/collections/prodotti';

export const catalogo = withCache(
  defineCollectionSource({
    // The single declaration: validates the projected document AND feeds the
    // agent JSON Schema contract. Record keyed by item id (key === item.id).
    shape: z.record(z.string(), ProdottoSchema),
    // Project from the external system of record. Honour the abort signal.
    resolve: async ({ params, signal }) => shopify.fetchProducts(params, { signal }),
    readOnly: true,           // default true — projected entities are not persisted
  }),
  { ttlMs: 60_000, swrMs: 300_000 }
);
```

Register it in the tenant (one line, no core change):

```ts
// apps/<tenant>/src/sources/index.ts
export const collectionSources = { catalogo } as const;
```

Reference the source from page JSON exactly like a local collection:

```jsonc
// list page: whole document
"items": { "$ref": "../collections/catalogo/catalogo.json" }

// dynamic detail page: current item + collection binding
"item": { "$ref": "collection:current" },
"collection": { "source": "catalogo", "paramKey": "slug" }
```

The tenant resolves only the sources a route needs, in its loader (Next reference: `src/lib/loaders/loadVisitorPageBundle.ts` for the RSC route and `loadPublicPageBundleForRequest.ts` for the page JSON API):

```ts
const needed = collectCollectionSources(page).filter((name) => name in collectionSources);
const { collections, collectionSchemas } = await resolveCollectionSources({
  sources: collectionSources, needed, params,
});
```

---

## Policy decorators

Policy never enters the core. Compose decorators around a source:

| Decorator | Options | Behaviour |
|---|---|---|
| `withCache` | `ttlMs`, `swrMs?`, `store?`, `now?` | TTL cache, stale-while-revalidate, **single-flight** dedupe; pluggable `CacheStore` (in-memory default), keyed by source + route params |
| `withRetry` | `attempts?`, `backoffMs?`, `jitter?`, `sleep?`, `shouldRetry?` | Retries only retryable failures (`SourceError.retryable`; raw errors are retried), exponential backoff |
| `withTimeout` | `ms`, `sleep?` | Races the source, aborts it on deadline, raises a retryable `timeout` error |
| `withFallback` | `getStale` | Serves the last known-good document when the source fails |
| `withCircuitBreaker` | `failures?`, `cooldownMs?`, `now?` | Fail-fast while open, one half-open probe after cooldown, closes on success |

```ts
const resilient = withCircuitBreaker(
  withRetry(withTimeout(withCache(source, { ttlMs: 30_000 }), { ms: 5_000 }), { attempts: 3 }),
  { failures: 5 }
);
```

**Observability**: pass `onEvent` to `resolveCollectionSources`; the layer emits structured events (`op`, `phase`, `durationMs`, `cache: hit|miss|stale`, `error`). Wire them to logs/metrics/tracing at the app boundary.

---

## Errors

`resolveCollectionSources` maps every failure to a typed `SourceError`:

| Code | Retryable | Cause |
|---|---|---|
| `resolve-failed` | ✅ | resolver threw (network, upstream 5xx…) |
| `timeout` | ✅ | deadline exceeded |
| `invalid-document` | ❌ | `shape.parse` failed, or the record-key invariant (`key === item.id`) was violated |
| `aborted` | ❌ | the request/render signal aborted |
| `missing-source` | ❌ | a page references a source that is not registered |
| `circuit-open` | ❌ | the breaker is open (fail fast) |

---

## Contracts and the agent surface

One `shape` per source produces both the human rendering and the machine contract:

- `/schemas/collections/{source}.schema.json` — item JSON Schema (same shape)
- page JSON (`/{slug}.json`, `/pages/{slug}.json`) — **resolved** values (no dangling `$ref`)
- `/collections/{source}/{source}.json` — the projected document
- `/mcp-manifest.json` / `/mcp-manifests/{slug}.json` — discovery, from the same shape

Register the source's shape in the tenant's `CollectionRegistry` so the site manifest and collection contracts include it.

---

## Conformance & testing kit

Every provider should run the shared conformance suite in its own tests:

```ts
import { runSourceConformance } from '@olonjs/sources';

it('passes the provider conformance suite', async () => {
  await expect(runSourceConformance(catalogo)).resolves.toBeUndefined();
});
```

It asserts: `resolve` is a function, the document is a keyed record, every `key === item.id`, and `shape.parse` round-trips the resolved document.

Kit helpers: `createTestSource({ document | resolve })`, `createFakeClock()` (deterministic TTL/backoff/breaker tests). Tests must be hermetic — **zero network**.

---

## Security & operations

- **External data is untrusted**: always go through `shape.parse`; never log payloads or secrets.
- **Always propagate `ctx.signal`** from the resolver to your HTTP client.
- **Caching is the provider's/adapter's policy** (or a decorator's), never core's.
- **Provenance** is returned per source (`fetchedAt`, `readOnly`) so callers can surface freshness.
- Rate limits, retries and breaker tuning are **app policy** — set them at the composition root.

---

## What is deliberately out of scope

- No provider implementations inside the package (Shopify/UCP live in their own packages).
- No snapshots of projected entities in the repo.
- No core changes: the promotion path (adopting the same interface in core for engine-level laziness / Studio read-only semantics) remains open and non-breaking — ADR-0018.
- Editorial overlay (projected base + authored overlay merged by id) is a separate, future capability.
