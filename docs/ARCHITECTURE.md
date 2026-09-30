# Architecture

This document defines the current architecture of `npm-jpcore`.

## Monorepo layout

Root workspace config is in `package.json` (`workspaces: ["packages/*", "apps/*"]`).

Packages:

- `packages/core` -> `@olonjs/core` — framework-agnostic engine
- `packages/react` -> `@olonjs/react` — React rendering bindings
- `packages/sources` -> `@olonjs/sources` — declarative external collection sources (projection seam; policy decorators)
- `packages/studio` -> `@olonjs/studio` — schema-driven Studio editor UI
- `packages/next` -> `@olonjs/next` — Next.js App Router host binding
- `packages/mcp` -> `@olonjs/mcp` — local MCP server bridge (Playwright → WebMCP)
- `packages/cli` -> `@olonjs/cli` — tenant generator
- `packages/stack` -> `@olonjs/stack` — dependency version manifest
- `packages/jsonpages-{core,stack,cli}-compat` -> `@jsonpages/*` — compatibility bridges

Apps:

- `apps/tenant-alpha` -> Vite reference app, template source (`alpha`)
- `apps/next` (workspace `tenant-next`) -> Next.js reference app, template source (`next`)
- `apps/olonjs.io` (workspace `olonjs-landing`) -> marketing/landing site, canonical schemas host

## Package responsibilities

## `@olonjs/stack`

- version manifest package (`stack-versions.json` is the single source of truth for dependency policy)
- consumed by other packages (via `prepack` sync scripts) and by the CLI when projecting tenant `package.json` files

## `@olonjs/core`

- **framework-agnostic, zero React** (ADR-0016): protocol types (`contract/kernel.ts`), config/collection resolution (`config-resolver.ts`), theme-token logic, WebMCP contracts (`webmcp-contracts.ts`), base schemas (`dna/lib/base-schemas.ts`), pure asset/url/routing helpers
- single ESM bundle + UMD sibling, single `"."` export — **no runtime subpath** (ADR-0009 is superseded by ADR-0016)
- peer dependency: `zod ^4.6.0` (v4-only)
- consumed by `@olonjs/react`, `@olonjs/studio`, `@olonjs/next`, and generated tenants

## `@olonjs/react`

- React rendering bindings: `JsonPagesEngine`, `OlonJSEngine` (visitor-only), `PageRenderer`, `SectionRenderer`, `ConfigContext`, theme loading, cloud save handlers
- dynamically imports `@olonjs/studio` (optional peer) only on `/admin`

## `@olonjs/sources`

- declarative **external collection sources**: `CollectionSource = { shape, resolve, readOnly? }` — the projection seam for system-of-record entities (catalog, PIM, …) whose SOT is external
- orchestration (`collectCollectionSources`, `resolveCollectionSources`) + policy decorators (`withCache`/`withRetry`/`withTimeout`/`withFallback`/`withCircuitBreaker`) + conformance/test kit
- depends on `@olonjs/core` (reuses its public helpers); **core stays untouched** — see ADR-0018
- opt-in for tenants; see [docs/sources.md](./sources.md) and [`specs/external-collection-sources-v1.md`](../specs/external-collection-sources-v1.md)

## `@olonjs/studio`

- editor UI: `AdminSidebar`, `FormFactory`, `StudioStage`, image picker
- depends only on `@olonjs/core` — reusable by any rendering binding, not just React

## `@olonjs/next`

- Next.js App Router host binding (ADR-0017): RSC visitors + admin client island + server helpers (`./server` subpath)

## `@olonjs/mcp`

- local MCP server over stdio that drives a headless browser to the tenant Studio `/admin` and bridges `document.modelContextProtocol` tools/resources to an MCP client

## `@olonjs/cli`

- scaffolds new tenants: `olonjs new tenant <name> [--template <name>] [--script <path>]` (`jsonpages` alias supported)
- resolves DNA from template assets

## `@jsonpages/*-compat`

- thin compatibility bridges that re-export the `@olonjs/*` packages under the legacy `jsonpages` names

## Template architecture

DNA templates are packaged under `packages/cli/assets/templates/<template>/`:

- `src_tenant.sh`
- `manifest.json`

Current templates: `alpha` (from `apps/tenant-alpha`) and `next` (from `apps/next`).

Backward compatibility copy for `alpha`: `packages/cli/assets/src_tenant_alpha.sh`.

## Source of truth model

Template DNA must originate from source apps — never edited manually:

- `apps/tenant-alpha` -> template `alpha`
- `apps/next` -> template `next`

## Operational flows

## Local development

- `npm run dev` -> `tenant-alpha`
- `npm run dev:landing` -> `apps/olonjs.io`

## DNA regeneration

- `npm run dist:dna:all` — delegates to each source app's `dist` script (alpha + next)

## Template conformance

- `npm run check:templates` — validates template presence and manifest consistency

## Release

Two npm flows plus an automatic site deploy; see [PUBLISHING.md](./PUBLISHING.md) for the operational details:

- `npm run release` — publishes the full ADR-0016 graph: `stack → core → sources → studio → react → mcp → next → tenant-alpha → tenant-next → cli → @jsonpages/*` (auto-patch versions, rewrites cross-package pins, regenerates DNA)
- `npm run release:enterprise` — gated release (`check:templates` + `dist:dna:all` first, then the same graph)
- `olon.js.org` site — deployed automatically to `gh-pages` by `.github/workflows/deploy-landing.yml` on every push to `main` that touches `apps/olonjs.io/**`, `packages/core/**`, or the workflow itself. The site builds `@olonjs/core` from the monorepo workspace, not from the npm registry.

## Build and Distribution Topology

Post-ADR-0016, each package ships a **single build** (ESM + UMD where relevant) with a single import surface:

- `@olonjs/core`: `dist/olonjs-core.js` + `dist/olonjs-core.umd.cjs` (types: `dist/index.d.ts`)
- `@olonjs/react`: `dist/olonjs-react.js` + UMD
- `@olonjs/studio`: `dist/olonjs-studio.js` + UMD
- `@olonjs/next`: `dist/index.js` + `./server` / `./admin-gate` / `./client` subpaths
- `@olonjs/mcp`: `dist/cli.js` (tsup)

All five engine packages gate their build with a typecheck: `build = "npm run typecheck && <bundler>"` where `typecheck = "tsc --noEmit"` (vite-plugin-dts reports type errors without failing the build; the explicit `tsc` gate hard-fails).

### Tenant consumption pattern

Tenants mount the visitor engine statically and lazy-load Studio only on `/admin` (the split is between packages, not bundles):

```tsx
// apps/<tenant>/src/App.tsx
import { OlonJSEngine } from '@olonjs/react';

const isAdminPath =
  typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

const LazyJsonPagesEngine = lazy(() =>
  import('@olonjs/react').then((m) => ({ default: m.JsonPagesEngine })),
);

return isAdminPath
  ? <Suspense fallback={null}><LazyJsonPagesEngine config={config} /></Suspense>
  : <OlonJSEngine config={config} />;
```

`OlonJSEngine` (visitor-only) has zero import of `@olonjs/studio`; `JsonPagesEngine` dynamically imports it only when the `/admin` route is mounted.

### Composition root

`OlonJSEngine` and `JsonPagesEngine` are sibling thin wrappers around `JsonPagesEngineCore` (`packages/react/src/engine/JsonPagesEngineCore.tsx`). Each invokes the core with a different `routesBuilder`:

- `OlonJSEngine` → `buildRuntimeRoutes` (visitor routes only)
- `JsonPagesEngine` → builder that mounts visitor routes plus `/admin` (StudioRoute) and `/preview` (PreviewRoute)

This keeps the engine boot sequence (config resolution, theme loading, error boundaries, head sync) authored once.

### Module augmentation note

The MTRP module augmentation (`SectionDataRegistry`, `SectionSettingsRegistry`, `CollectionItemRegistry`) targets the **single** `@olonjs/core` specifier in tenant `types.ts` (no `@olonjs/core/runtime` subpath exists anymore).

### Boundary enforcement

`scripts/check-package-boundaries.mjs` (root `npm run test:boundary`) enforces the ADR-0016 package split:

- `@olonjs/core` has zero imports of react/studio
- `@olonjs/studio` has zero imports of react
- `@olonjs/react` touches `@olonjs/studio` only via the allow-listed dynamic-import bridge

## Bake-time contracts

Tenant `scripts/bake.mjs` emits machine-readable contracts alongside HTML during the SSG prebuild. All contract builders live in `@olonjs/core` (`packages/core/src/contract/webmcp-contracts.ts`); the tenant bake script orchestrates emission only.

> For the Next template the prebuild bake was removed (2026-09-10): the discovery surface (`/mcp-manifest.json`, `/mcp-manifests/*`, `/schemas/*`, `/llms.txt`, `/robots.txt`, `/sitemap.xml`) is served at request time by route handlers under `app/api/webmcp/*` and `app/api/seo/*` mapped via explicit rewrites in `next.config.ts`. Same `webmcp.*` core builders, no baked artifacts.

### Page contracts

Per-page JSON Schema + MCP manifests. Written to `dist-ssr/schemas/` (provisioning) and `public/` + `dist/` (MCP manifests). See `buildPageContract`, `buildPageManifest`.

### Collection contracts

Per-collection item JSON Schema. For each key in the tenant `CollectionRegistry`:

| Artifact | Output paths | Published URL |
|----------|-------------|---------------|
| Item contract | `public/`, `dist/`, `dist-ssr/schemas/collections/{source}.schema.json` | `/schemas/collections/{source}.schema.json` |

The contract describes a **single item** (the record value type), not the outer keyed object. The `recordKeyMustMatchItemId: true` field signals that every top-level key in the collection data must equal `item.id`. Bake enforces this invariant via `assertCollectionRecordKeys` and fails if violated.

### Site manifest (`mcp-manifest.json`)

`buildSiteManifest` emits a discovery index with `pages[]` and optional `collections[]`. Consumers use this to find all available contracts without path inference.

## Constraints and caveats

- On Windows UNC paths (`\\wsl.localhost\...`), npm/cmd invocation may fail; prefer WSL shell for release operations.
- `scripts/release.js` auto-patches versions (`npm version patch`) on every package — the published version is always the pre-set version +1 patch; it also rewrites cross-package dependency pins and regenerates tenant DNA.
- `scripts/release-enterprise.js` adds pre-flight template governance (`check:templates` + `dist:dna:all`) but delegates to `release.js`.
- Zod is **v4-only** (`^4.6.0`) across the ecosystem. The canonical schemas in `packages/core/src/contract/zod-schemas.ts` are authored in the `zod/v3` compat dialect (bundled with zod v4) because the generator relies on the unmaintained `zod-to-json-schema`; follow-up: migrate `bump-schemas.ts` to zod's native `z.toJSONSchema()`.
