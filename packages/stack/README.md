# @olonjs/stack

<p align="center">
  <strong>Enterprise stack manifest for OlonJS.</strong><br />
  Single source of truth for dependency versions across the whole ecosystem.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/stack"><img src="https://img.shields.io/npm/v/@olonjs/stack?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/stack** is the **single source of truth** for OlonJS tenant dependency versions. One file (`stack-versions.json`) to change when upgrading React, Vite, React Router, etc. — no version drift across packages.

## Purpose

- **Core, React, Studio** (post-ADR-0016 three-package split) each sync their own `peerDependencies` from this manifest via their own `prepack` script.
- **CLI** uses this manifest when projecting a new tenant so `npm install` gets the exact versions defined here.

## Install

```bash
npm install @olonjs/stack
```

## Usage

```js
import stack from '@olonjs/stack';

stack.corePeerDependencies;        // { zod: '^4.6.0' }
stack.reactBindingPeerDependencies; // { react, react-dom, react-router-dom }
stack.peerDependencies;            // full union (CLI-projected tenant package.json)
stack.packages;                    // coordinated @olonjs/* package versions
```

## Manifest Fields (post-ADR-0016)

`@olonjs/core` is framework-agnostic (zero React, per ADR-0016) — it must **not** peer on `react`/`react-dom`/`react-router-dom`. `@olonjs/react` and `@olonjs/studio` do need those. To keep each package's sync script pulling only what it actually needs:

| Field | Synced into | Notes |
|---|---|---|
| `corePeerDependencies` | `@olonjs/core` | `zod` only |
| `reactBindingPeerDependencies` | `@olonjs/react`, `@olonjs/studio` | Shared React-family peer set (`react`, `react-dom`, `react-router-dom`). Studio additionally merges `corePeerDependencies.zod` (its FormFactory/AdminSidebar introspect tenant Zod schemas directly, per ECIP). React additionally preserves its own `@olonjs/studio` optional peer (the ADR-0016 D2 dynamic-import bridge) — package-specific, not stack-driven. |
| `peerDependencies` | CLI tenant projection | Full union — a tenant app needs the whole stack |
| `packages` | coordination | The three `@olonjs/*` package versions, kept aligned |
| `dependencies` / `devDependencies` | CLI tenant projection | Tenant runtime/build deps |

> **Do not** point any `@olonjs/core` sync script at the full `peerDependencies` block — that was a real regression caught during Phase 4 of the package-split plan (it silently reintroduced React into Core's peer contract).

## Workflow

1. **Upgrade stack:** Edit `stack-versions.json` (dependencies, devDependencies, peerDependencies, corePeerDependencies, reactBindingPeerDependencies, packages). Keep these in sync with what Core/React/Studio actually support.
2. **Publish order:** `@olonjs/stack` first, then `@olonjs/core`, then `@olonjs/react` and `@olonjs/studio`, then `@olonjs/cli` (compat bridges follow their targets).
3. **From repo:** `npm install` at monorepo root so workspace deps resolve; then build/publish as needed.

## Consumers

| Package | Use |
|---|---|
| `@olonjs/core` | `prepack` runs `scripts/sync-peers-from-stack.js` → copies `corePeerDependencies` (zero-React) |
| `@olonjs/react` | `prepack` sync → copies `reactBindingPeerDependencies`, preserving its own `@olonjs/studio` optional peer |
| `@olonjs/studio` | `prepack` sync → copies `reactBindingPeerDependencies` + `zod` |
| `@olonjs/cli` | Tenant `package.json` projection on `olonjs new tenant` — the DNA script embeds the source app's snapshot; this manifest is the manual SOT kept aligned with that snapshot |

## File Layout

- `stack-versions.json` — canonical versions
- `index.js` — ESM export consumed by the sync scripts and the CLI

## Versioning

Patch-only auto-numbering (`1.1.XXX`) by the gated `release:enterprise` pipeline.

## License

MIT — see [LICENSE](../../LICENSE).
