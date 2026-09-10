# 002 — Next WebMCP runtime parity (tools + resources)

Repo: `npm-jpcore`  
Scope: `apps/next` DNA + thin wiring (no Vite SSG)  
Parent: bake/agentic artifacts done — [`001-next-prebuild-agentic-assets.md`](./001-next-prebuild-agentic-assets.md)  
Todo: [`002-next-webmcp-runtime-parity.todo.md`](./002-next-webmcp-runtime-parity.todo.md)  
Status: **In progress** — wiring landed; execute path + verify harness still open  
Docs: [`docs/webmcp.md`](../webmcp.md) · bridge: `packages/core/src/webmcp/runtime/webmcp-bridge.ts`

## PROJECT CONTEXT (brain dump)

- Goal: **parity Vite ↔ Next** for **live** WebMCP (`document.modelContext` / `document.modelContextProtocol`) **and** for the HTTP discovery surface.
- **Discovery surface on Next is runtime, not baked** (2026-09-10 correction, see 001): `/mcp-manifest.json`, `/mcp-manifests/*`, `/schemas/*`, `/llms.txt`, `/robots.txt`, `/sitemap.xml` are route handlers under `app/api/webmcp/*` and `app/api/seo/*`, mapped via explicit rewrites in `next.config.ts`. Same `webmcp.*` core builders as the Vite bake; no `public/` artifacts.
- Chromium: **`document.modelContext` only** — no `navigator.modelContext` (hard cut, commit `7b32db5`).
- Tools register in Studio when `config.webmcp.enabled === true`.
- Resources need `ensureWebMcpRuntime()` → polyfill on `document.modelContext` + `document.modelContextProtocol`.

## Progress (2026-09-10)

| Slice | Commit | Result |
|-------|--------|--------|
| Admin `webmcp.enabled` | `7cd184b` | Tools visible to agents on `/admin` |
| Visitor island | `0ca344d` | Live smoke: `readResource` OK; no mutation tools on public pages |

### Live agent evidence (user)

- Sees `update-section` / `save`.
- `update-section` fails validation on **`items.$ref`** (COP authored shape vs Zod `z.record`).
- Manual Studio Title edit works; `save` → `POST /api/save-to-file` **Failed to fetch** (route exists in source).

### Harness note ([Find modelContextTesting wiring](ae4e390a-b450-4c60-9241-d7d7e6e232a1))

- **`document.modelContextTesting` is never assigned.** Polyfill only sets `modelContext` + `modelContextProtocol`.
- `apps/next/scripts/webmcp-feature-check.mjs` (and alpha twin) still read `modelContextTesting` → false negatives even when tools work.
- Probe tools via **`document.modelContextProtocol.listTools()` / `executeTool()`**.
- `@olonjs/core` resolves via workspace link → `packages/core`.

## Remaining root causes

| ID | Symptom | Cause | Fix locus |
|----|---------|-------|-----------|
| **A** | `update-section` + `items.$ref` | Local WebMCP path `schema.parse`s **authored** data (still `$ref`); global path already uses resolved | `packages/studio/src/StudioRouteBody.tsx` ~433 — use `resolvedDraft` section data as `currentData` |
| **B** | `save` Failed to fetch | Route `apps/next/app/api/save-to-file/route.ts` exists; browser never reaches handler (host/port/process/cwd) | Diagnose Network on **parent** `/admin` document |
| **C** | `verify:webmcp` false fail | Script uses nonexistent `modelContextTesting` | Point harness at `modelContextProtocol` (Next + alpha) |

## Architecture Decisions (locked)

1. Admin tools via `webmcp.enabled` only — no Next-local `registerWebMcpTool`.
2. `document.modelContext` only — no navigator.
3. Visitor: polyfill + `readResource` only; no mutation tools.
4. **`namespace`:** mirror alpha.
5. Acceptance API surface: **`modelContextProtocol`**, not `modelContextTesting`.

## Task List

### Done

- [x] Task 1: Admin `webmcp` wiring (`7cd184b`)
- [x] Task 2: Visitor `WebMcpVisitorRuntime` island (`0ca344d`)
- [x] Task 4: Visitor `readResource` smoke (PASS live)

- [x] Task 3a: Studio local WebMCP validates against resolved page (`aeb3e50`) — live: `update-section` fieldKey on `books-list-1` → `isError:false`, `$ref` preserved on disk
- [x] Task 3b: `webmcp-feature-check.mjs` → `modelContextProtocol` (next, alpha, olonjs.io) (`c8f8c51`)

### Open

- [ ] Task 3c: save-to-file "Failed to fetch" — **not reproduced** live on `next start :3000` (POST → 200, twice). Needs user repro: URL/port, Network status
- [ ] Task 3d: `webmcp-feature-check.mjs` target selection is stale — requires `tool.sectionType` on manifest tools, but manifests now expose the generic `update-section`/`save` pair. Select from `contract.sectionInstances` + `sectionSchemas`, pass `sectionType`, call `save`
- [x] Task 3e: discovery surface moved to runtime route handlers; dynamic pages expanded from collections; every index href resolves 200 (live check, 70 urls)
- [ ] Task 3f: local save writes LF and rewrites all config/collection files on a CRLF tree → noise-only diffs
- [ ] Task 3g: `scripts/sync-pages-to-public.mjs` (pre-existing) still copies `src/data` → `public/{pages,collections,config}` at prebuild so `/pages/*.json` and `/collections/*` are served as static files instead of hitting `/api/public-page`. Decide: runtime route for `/collections/{source}/{source}.json` + `/config/site.json`, and fix the static-boot self-fetch loop, then drop the sync
- [ ] Task 3h: regenerate Next DNA template (`npm run dist:dna`) after this lands
- [ ] Task 5: Doc note (`docs/webmcp.md` — probe via protocol; Next wiring)
- [ ] Task 6: DNA includes wiring (source app already)

## Relevant files

| File | Why |
|------|-----|
| `packages/studio/src/StudioRouteBody.tsx` | **A** — local mutation parse base |
| `apps/next/scripts/webmcp-feature-check.mjs` | **C** — stale `modelContextTesting` |
| `apps/tenant-alpha/scripts/webmcp-feature-check.mjs` | **C** — same |
| `packages/core/src/webmcp/runtime/webmcp-bridge.ts` | Polyfill assigns protocol only |
| `apps/next/app/api/save-to-file/route.ts` | **B** — exists; runtime reachability |
| `apps/next/src/components/admin/AdminStudioClient.tsx` | Flag wired |
| `apps/next/src/components/webmcp/WebMcpVisitorRuntime.tsx` | Visitor island |

## Constraints / gotchas

- WSL for npm on UNC paths.
- Feature-check must use **`document.modelContextProtocol`** until/unless a deliberate testing alias is added (do not invent alias without product decision).
- Do not pull Vite SSG into Next.
- Ask before changing `@olonjs/core` public API; Studio local-path fix is preferred for **A**.
