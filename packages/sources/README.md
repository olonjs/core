# @olonjs/sources

<p align="center">
  <strong>Declarative external collection sources for OlonJS.</strong><br />
  Project catalogs, PIMs and APIs into the page contract — with policy decorators, never in core.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/sources"><img src="https://img.shields.io/npm/v/@olonjs/sources?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/sources** brings external systems of record (catalog, PIM, ERP, third-party APIs) into the OlonJS deterministic contract, per **ADR-0018**. A source is a declaration: a Zod `shape` plus a `resolve` function. All I/O policy — cache, retry, timeout, fallback, circuit breaker — lives **here**, never in `@olonjs/core`.

## Install

```bash
npm install @olonjs/sources @olonjs/core
```

## Quick Start

```ts
import { defineCollectionSource, withCache } from '@olonjs/sources';
import { z } from 'zod';

const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.number(),
});

export const catalogo = defineCollectionSource({
  id: 'catalogo',
  shape: () => z.array(ProductSchema),
  resolve: () =>
    fetch('https://pim.example.com/products')
      .then((r) => r.json()),
  readOnly: true,
});

// Policy decorators compose deterministically
export const cachedCatalogo = withCache(catalogo, { ttl: 60, swr: 300 });
```

A page binds the source with a `$ref` (e.g. `"$ref": "../collections/catalogo/catalogo.json"`); the tenant projects the source through its collection registry (COP v1.1).

## API Surface

| Domain | Contents | Role |
|---|---|---|
| `contract` | `CollectionSource` (`{ shape, resolve, readOnly }`), typing | The declaration contract (ADR-0018) |
| `collect` / `resolve` | collection projection and resolution helpers | From raw source data to contract-shaped collections |
| `decorators/cache` | `withCache` (ttl + swr) | Freshness policy with stale-while-revalidate |
| `decorators/retry` | retry decorator | Backoff policy |
| `decorators/timeout` | timeout decorator | Hard deadline per source |
| `decorators/fallback` | fallback decorator | Degraded-mode payloads |
| `decorators/breaker` | circuit-breaker decorator | Failure isolation |
| `testing` | deterministic test kit | Fixtures and fakes for source unit tests |

## Architectural Law

Sources are **tenant-owned projections** — the core must never import, fetch, or assume them. See `docs/sources.md` and ADR-0018 in [`docs/decisions/`](../../docs/decisions/).

## Versioning

Patch-only auto-numbering (`0.1.XXX`) by the gated `release:enterprise` pipeline.

## License

MIT — see [LICENSE](../../LICENSE).
