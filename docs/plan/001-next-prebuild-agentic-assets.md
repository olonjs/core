# 001 — Next agentic surface (SUPERSEDED → runtime)

Repo: `npm-jpcore`  
Scope: `apps/next` DNA  
Status: **Superseded 2026-09-10.** The prebuild/bake approach described in the original version of this plan was wrong for Next and has been removed. Follow-up: [`002-next-webmcp-runtime-parity.md`](./002-next-webmcp-runtime-parity.md).

## Why superseded

Next is a server runtime. Page JSON was already served at request time (`/:path*.json` → `/api/public-page`). Baking `mcp-manifest.json`, `mcp-manifests/*`, `schemas/*`, `llms.txt`, `robots.txt`, `sitemap.xml` into `public/` at prebuild duplicated that model with static, stale artifacts (dynamic routes such as `libri/[slug]` cannot be baked; the site index advertised manifests that 404'd).

## Current model (runtime, no bake)

Same `webmcp.*` builders from `@olonjs/core` as the Vite bake, executed per request:

| Public href | Rewrite → route handler |
|---|---|
| `/mcp-manifest.json` | `/api/webmcp/site-manifest` |
| `/mcp-manifests/{slug}.json` | `/api/webmcp/page-manifest/{slug}` |
| `/schemas/collections/{source}.schema.json` | `/api/webmcp/collection-contract/{source}` |
| `/schemas/{slug}.schema.json` | `/api/webmcp/page-contract/{slug}` |
| `/llms.txt` | `/api/webmcp/llms` |
| `/robots.txt` | `/api/seo/robots` |
| `/sitemap.xml` | `/api/seo/sitemap` |
| `/pages/{slug}.json`, `/{slug}.json` | `/api/public-page/{slug}` (pre-existing) |
| `/collections/{source}/{source}.json` | `/api/public-collection/{source}/{file}` |
| `/config/{site\|menu\|theme}.json` | `/api/public-config/{file}` |

- Builders: `apps/next/src/lib/webmcp/runtime/agenticSurface.ts` (+ tests)
- Loaders: `apps/next/src/lib/webmcp/runtime/loadRuntimeSurface.ts` — per-slug follows the server cloud policy (local/static/live) like `/api/public-page`; site-wide uses the DNA registry on disk
- Rewrites: `apps/next/next.config.ts` (`webmcpRuntimeRewrites`, explicit, before the generic `/:path*.json`) — guarded by `nextConfigRewrites.test.ts`
- Dynamic pages (`libri/[slug]`) are expanded into concrete slugs from the bound collection in the site index / sitemap / llms.txt; every advertised href resolves 200

Removed: `scripts/bake.mjs`, `scripts/bake.ts`, `scripts/generate-llms-txt.mjs`, `scripts/robots.mjs`, `scripts/sitemap.mjs`, `scripts/sync-pages-to-public.mjs`, their `prebuild-*.test.mjs`, the tracked/generated `public/` artifacts, `tsx` devDependency, and the `prebuild` script itself. `public/` holds no generated content.

`verify:webmcp` (`scripts/webmcp-feature-check.mjs`) is unchanged and still out of prebuild.
