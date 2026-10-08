# @olonjs/next

<p align="center">
  <strong>Next.js App Router host binding for OlonJS.</strong><br />
  RSC visitors + admin client island · server loaders · admin gate · public JSON rewrites.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/next"><img src="https://img.shields.io/npm/v/@olonjs/next?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/next** hosts an OlonJS tenant on Next.js (App Router), per **ADR-0017**: server components render the visitor, a client island mounts the admin. It is **not a second engine** — it composes `@olonjs/core` (server) and `@olonjs/react` (admin island).

## Install

```bash
npm install @olonjs/next @olonjs/core @olonjs/react
```

Peer dependencies: `@olonjs/core@^2.0.0`, `@olonjs/react@^0.2.0`, `next@^15 || ^16`, `react@^19`, `react-dom@^19`, `react-router-dom@^6.29 || ^7`.

## Subpath Exports

| Subpath | Audience | Contents (representative) |
|---|---|---|
| `.` | mixed | Shared constants and utilities |
| `./server` | Node/RSC only | `loadVisitorPage`, `loadLivePublicPageContent`, `loadPublishedStaticContent`, `resolveLocalDataRoots`, `safeDataSlugPath`, `applyDevSliceFilters`, `normalizePublicPageSlug`, `normalizePublishedSlug`, `buildPublicPageJsonRewrites`, `createPublicPageJsonHttpResult`, `listLocalImages`, `saveProjectStateToDisk`, `saveUploadedImage`, `MAX_UPLOAD_BYTES` |
| `./admin-gate` | server | `authorizeAdminRequest`, `buildAdminSessionCookie`, `parseCookieHeader`, `ADMIN_SESSION_COOKIE`, `ADMIN_SESSION_MAX_AGE` |
| `./client` | browser | `AdminIsland` (mounts `JsonPagesEngine` with the tenant config), `OLONJS_NEXT_CLIENT` |

## Architecture Rules (mandatory)

- **Runtime-only agentic surface** — never add prebuild bake steps; page contracts, manifests and llms.txt are served by route handlers + `next.config` rewrites.
- **Never self-fetch your own origin** for `/pages` or `/config` JSON — that creates a rewrite loop. `bootSource: 'static'` reads the deployed repo from disk.
- **Env access** — `NEXT_PUBLIC_*` must be read as direct property access (Next inlines at build time; dynamic indexing breaks the client bundle).

## Persistence Modes

| Mode | Condition | Behavior |
|---|---|---|
| Local | No cloud URL | Saves via `/api/save-to-file` (file-based) |
| HotSave | Cloud URL + key, no SAVE2REPO | Direct KV cloud save |
| Save2Repo | `NEXT_PUBLIC_OLONJS_SAVE2REPO=true` | Git commit via cloud bridge; boots from published static JSON |

## Specs

Reference tenant wiring and the visitor/admin model: **ADR-0017** (`docs/decisions/ADR-0017-next-*`) and the `next` template source of truth at [`apps/next`](../../apps/next). Protocol contracts: [`specs/2.0/INDEX.md`](../../specs/2.0/INDEX.md).

## Versioning

Patch-only auto-numbering (`0.0.XXX`) by the gated `release:enterprise` pipeline.

## License

MIT — see [LICENSE](../../LICENSE).
