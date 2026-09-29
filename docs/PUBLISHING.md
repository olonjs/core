# Publishing and Release

This document is the operational source of truth for two distinct publishing flows in this monorepo:

1. **npm package publishing** — the full `@olonjs/*` graph (`stack`, `core`, `studio`, `react`, `mcp`, `next`, `cli`) plus the `@jsonpages/*` compatibility bridges. Manual, gated, runs from a developer machine.
2. **`olon.js.org` site deploy** — the marketing site lives at `apps/olonjs.io/` and ships to `gh-pages` automatically on every push to `main`. No manual step.

The two flows are independent. A new `@olonjs/core` version can be published to npm without redeploying the site, and the site can redeploy without bumping any package version.

## Scope

- Standard flow: `npm run release`
- Enterprise-gated flow: `npm run release:enterprise`
- DNA governance (`alpha` + `next`)
- `olon.js.org` deploy (`gh-pages` via GitHub Actions)

## Prerequisites

- npm account with publish rights on `@olonjs` (and `@jsonpages`)
- `NPM_TOKEN` available in environment or root `.env`
- root `.npmrc` configured for npm registry auth
- dependencies installed from monorepo root

Example `.env`:

```bash
NPM_TOKEN=npm_xxx
```

### Auth notes (learned the hard way)

- The root `.npmrc` line `//registry.npmjs.org/:_authToken=${NPM_TOKEN}` **shadows** the user-level `~/.npmrc` token. If your shell exports a stale `NPM_TOKEN`, the fresh `.env` value is ignored (`release.js` only sets it when unset). Before releasing: `unset NPM_TOKEN` or make sure the exported value is the one you want.
- Interactive web-login (`npm publish` prompting "Authenticate your account at: … Press ENTER") stores an **ephemeral session** in the npm cache, not a durable token. For reliable publishing use a **Classic token** (npmjs.com → Access Tokens → Classic → Publish) persisted via `npm config set //registry.npmjs.org/:_authToken npm_…` or `.env`.
- Sanity check before any publish: `npm whoami` must print the publishing account.

### Cache staleness

`release.js` runs `npm version patch` / `npm install` steps that re-resolve the registry metadata. Seconds after publishing a package, the local npm cache may still not see it (`ETARGET No matching version found`). If a release fails right after a fresh publish, re-run with `npm_config_prefer_online=true` (or wait a couple of minutes for the cache/CDN).

## Package publish order

Always publish in this order (see `scripts/release.js`):

1. `@olonjs/stack`
2. `@olonjs/core`
3. `@olonjs/studio`
4. `@olonjs/react`
5. `@olonjs/mcp`
6. `@olonjs/next`
7. `tenant-alpha` — pin `@olonjs/core`, `@olonjs/react`, `@olonjs/studio`; build + `dist` (regenerates alpha DNA)
8. `tenant-next` (`apps/next`) — pin `@olonjs/core`, `@olonjs/react`, `@olonjs/studio`, `@olonjs/next`; build + `dist` (regenerates next DNA)
9. `@olonjs/cli`
10. compatibility bridges (`@jsonpages/stack`, `@jsonpages/core`, `@jsonpages/cli`)

Reason:

- `core` aligns dependency contracts using the stack manifest (`prepack` sync)
- `studio` / `react` / `mcp` / `next` follow the ADR-0016 dependency graph
- `@olonjs/next` must publish before tenant-next pins it and before CLI packages both DNA templates
- both tenant workspaces regenerate DNA (`dist`) with pinned versions before CLI publish
- `cli` must package DNA generated from both source apps using the new versions
- compatibility bridges must point to freshly published `@olonjs/*` versions

## Version bump semantics

`scripts/release.js` auto-patches every package with `npm version patch --no-git-tag-version` and, if the target version already exists on npm, bumps until it finds an unpublished one (`ensureUnpublishedVersion`).

**Consequence:** the published version is always the pre-set `package.json` version **+1 patch** (or more, if taken). Example: pre-set `2.0.0` → published `2.0.1`. Plan major/minor releases by pre-setting the version one patch below the intended published version, and record both columns in the changelog.

`release.js` also rewrites cross-package dependency pins at each step (studio→core, react→core+studio, next→core, tenants→core/react/studio/next) — do not hand-maintain those pins before a release.

## Changelog convention

Every notable change gets its own file at **`/changelog/<nome-commit>.md`** (named after the commit), containing: breaking changes, migration notes, and the version table (pre-set → published).

## Build & gates

Each engine package builds a **single bundle** and gates the build with a typecheck:

- `build` = `npm run typecheck && vite build` (core, studio, react, next) or `npm run typecheck && tsup …` (mcp)
- `typecheck` = `tsc --noEmit`

`vite-plugin-dts` reports type errors **without failing the build** — the explicit `tsc --noEmit` gate is what hard-fails. Run `npm run build:all` before publishing; it runs every workspace build including the typechecks.

Package-split boundary check (root):

```bash
npm run test:boundary    # check-package-boundaries.mjs (ADR-0016)
```

A failing boundary check is a publish blocker: it means a package import has crossed the core/react/studio boundary.

## DNA governance

### Source of truth

- `apps/tenant-alpha` is SoT for template `alpha`
- `apps/next` (workspace `tenant-next`) is SoT for template `next`

### Dist command

Root DNA generation:

```bash
npm run dist:dna:all
```

This runs both workspaces:

- `npm run dist -w tenant-alpha`
- `npm run dist -w tenant-next` (`apps/next`)

### Template conformance

Validate required template assets:

```bash
npm run check:templates
```

Validation checks:

- required template directories exist
- `src_tenant.sh` exists per required template
- `manifest.json` exists and is consistent
- DNA script contains baseline safety/content markers

## Dry-run checklist

Run from repository root before any real publish. Real publish only after explicit human approval.

1. **Template conformance**

   ```bash
   npm run check:templates
   ```

   Expect: `alpha` + `next` template assets valid.

2. **Regenerate DNA**

   ```bash
   npm run dist:dna:all
   ```

   Runs `tenant-alpha` and `tenant-next` (`apps/next`) dist scripts.

3. **Release dry-run**

   ```bash
   node scripts/release.js --dry-run
   ```

   Expect logs for every package and both DNA dist steps. No `npm publish` calls.

   > Note: even `--dry-run` executes the real `npm version patch` bumps and builds — it only skips `npm publish`. Revert the bumps afterward (step 4). The run may fail partway with `ETARGET` on freshly published deps (cache staleness) — see the note above.

4. **Revert version bumps**

   Dry-run patches `package.json` versions locally. Revert before committing unrelated work:

   ```bash
   git checkout -- packages/*/package.json apps/*/package.json package-lock.json
   ```

5. **Real publish (human go only)**

   ```bash
   node scripts/release-enterprise.js
   ```

   Do not run without explicit approval after dry-run review.

## Recommended release procedure

Complete the [Dry-run checklist](#dry-run-checklist) first. Run from repository root.

1. Validate workspace state

```bash
npm install
npm run build:all
```

2. Validate templates and regenerate DNA

```bash
npm run check:templates
npm run dist:dna:all
```

3. Dry-run release

```bash
node scripts/release.js --dry-run
```

4. Execute enterprise release

```bash
node scripts/release-enterprise.js
```

5. Commit the version bumps and pins left in the working tree (the script does not commit).

## `olon.js.org` site deploy (gh-pages)

The marketing site at https://olon.js.org is served from the `gh-pages` branch of this repo and rebuilt automatically by `.github/workflows/deploy-landing.yml`. There is no manual deploy script and no `gh-pages` package dependency — the GitHub Action does all the work.

### Trigger

The workflow runs on every push to `main` whose change set touches one of:

- `apps/olonjs.io/**`
- `packages/core/**`
- `.github/workflows/deploy-landing.yml`

Pushes that only touch `docs/`, `packages/cli/`, `packages/stack/`, or `apps/tenant-alpha/` do **not** trigger a redeploy. This is intentional — keeps the site stable when only ADRs or templates change.

### Pipeline steps

`.github/workflows/deploy-landing.yml`:

1. `actions/checkout@v4` — full repo checkout.
2. `actions/setup-node@v4` (Node 20, npm cache).
3. `npm install` from monorepo root (workspaces resolve `@olonjs/*` from the workspace sources).
4. `npm run build -w @olonjs/core` — single bundle via `typecheck && vite build`. Required because the tenant build imports from `@olonjs/core` and the in-monorepo workspace symlink resolves to `packages/core/dist/`.
5. `node apps/olonjs.io/scripts/bake.mjs` — runs the OlonJS SSG bake:
   - Builds the client bundle (`apps/olonjs.io/dist/`).
   - Builds an SSR entry bundle (`apps/olonjs.io/dist-ssr/`).
   - Discovers all page slugs from `apps/olonjs.io/src/data/pages/*.json`.
   - Renders each slug via SSR and writes `dist/<slug>/index.html` plus the WebMCP page contracts and manifests.
6. `JamesIves/github-pages-deploy-action@v4` — pushes `apps/olonjs.io/dist/` to the `gh-pages` branch with `clean: true`. GitHub Pages serves it at `olon.js.org` (CNAME).

### Developer workflow

The expected day-to-day flow for any change that should appear on `olon.js.org`:

```bash
# 1. Make changes in apps/olonjs.io/ or packages/core/
git checkout -b my-change
# … edit …

# 2. Verify locally (no deploy yet)
npm run build -w @olonjs/core         # if core changed
npm run build -w olonjs-landing        # tenant build = same as CI step 5 minus SSG

# 3. Commit and push the branch
git add <files>
git commit -m "…"
git push origin my-change

# 4. Open a PR to main, get review, merge

# 5. After merge, watch the workflow:
#    https://github.com/olonjs/core/actions/workflows/deploy-landing.yml
#    Typical run: 2-3 minutes from push to gh-pages update.

# 6. Verify the deploy:
#    - Hard reload https://olon.js.org
#    - Optionally re-run Lighthouse if perf-sensitive change
```

### Hot-fix flow (skip the PR)

If you push directly to `main` (allowed for repo owners), the workflow triggers the same way. Use sparingly — there is no preview environment.

### What if the workflow fails

`deploy-landing.yml` has no rollback step. A failed deploy leaves the previous `gh-pages` commit live. Common failure modes:

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm error EISDIR symlink … node_modules/@olonjs/…` | npm workspaces collision on a stale symlink | Add a `rm -rf node_modules` step before install in the workflow, or use `npm ci` |
| `bake.mjs: Cannot find page <slug>` | A page JSON was renamed but the menu/site reference wasn't updated | Sync the rename in `src/data/config/site.json` and `menu.json` |
| Typecheck failure in step 4 | A type error slipped in (`tsc --noEmit` gates the build) | Fix the type error; `vite-plugin-dts` alone would not have failed |
| Action succeeds but `olon.js.org` 404s | DNS / CNAME issue, not the build | Check `apps/olonjs.io/public/CNAME` and the GitHub Pages settings |

The Lighthouse audit assets occasionally end up on disk during local runs (`C:\Users\…\AppData\Local\lighthouse.*\Singleton*`). These are Chromium temp dirs and **must not** be committed — confirm `.gitignore` covers `lighthouse.*` at the repo root before pushing.

### Relationship to npm package publishing

The site deploy reads `@olonjs/core` from the monorepo workspace, **not** from the npm registry. Publishing a new `@olonjs/core` version to npm therefore does not affect `olon.js.org` until a separate commit lands that touches `apps/olonjs.io/**` or `packages/core/**`. Conversely, `olon.js.org` always tracks the latest committed `packages/core/`, even if no npm version has been published with those changes yet.

This means:

- A perf fix in `apps/olonjs.io/` is live on `olon.js.org` ~3 minutes after merging to `main`. No npm publish required.
- A breaking change in `packages/core/` is **live on `olon.js.org` ~3 minutes after merging to `main`** (because the workflow rebuilds core from source). External tenants on the published npm version are **unaffected** until you `npm run release`.

## Windows note

If npm commands fail under UNC paths (`\\wsl.localhost\...`), use WSL shell to run release commands.

## Troubleshooting

- `Error: Unknown template ...` in CLI
  - Check `packages/cli/assets/templates/<template>/src_tenant.sh`
  - Run `npm run dist:dna:all`
- Template conformance failure
  - Run `npm run check:templates` and fix missing assets/manifests
- npm auth errors during publish
  - Verify `NPM_TOKEN`, `.npmrc` shadowing (see Auth notes), and npm org permissions; `npm whoami` must succeed
- `ETARGET No matching version found` right after a publish
  - Local cache staleness: re-run with `npm_config_prefer_online=true`
- Release succeeds but new tenants are stale
  - Ensure `dist:dna:all` ran before publishing `@olonjs/cli`

## Related docs

- `docs/ARCHITECTURE.md`
- `docs/CLI.md`
- `docs/TEMPLATES.md`
