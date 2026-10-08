# @olonjs/cli

<p align="center">
  <strong>The Sovereign CLI Engine for OlonJS.</strong><br />
  Scaffold tenants by projecting DNA templates — deterministic, Node-native, no bash.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/cli"><img src="https://img.shields.io/npm/v/@olonjs/cli?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/cli** is the primary entry point for OlonJS developers. It scaffolds new tenants by projecting **DNA templates** — shell archives interpreted **in Node, without bash** — so a fresh tenant is reproducible byte-for-byte.

## Install

```bash
# No global install needed — use npx
npx @olonjs/cli new tenant my-agentic-site --template next
```

Binaries: `olonjs` (primary) and `jsonpages` (deprecated legacy alias).

## Commands

```
olonjs new tenant <name> [--template next|vite|alpha] [--script]
```

| Template | Source of truth | Stack |
|---|---|---|
| `next` | `apps/next` | Next.js App Router (RSC visitors + admin island) |
| `vite` | Vite scaffold | Vite + React |
| `alpha` (default) | `apps/tenant-alpha` | Vite reference tenant |

- Interactive mode uses an arrow-key template picker.
- **Non-interactive shells (CI, agents) must pass `--template` explicitly** — the CLI fails with an explicit error otherwise.
- `--script` switches the generator to script-driven mode.

## Determinism Guarantees

- DNA templates are **generated, never hand-edited**: `npm run dist:dna:all` delegates to each source app's `dist` script; `npm run check:templates` validates conformance.
- The generated tenant's `package.json` pins dependency versions from [`@olonjs/stack`](../stack) — the single source of truth for version policy.
- Governance rules: `docs/CLI.md`, `docs/TEMPLATES.md`, `.cursor/rules/cli-templates.mdc`.

## Versioning

Patch-only auto-numbering (`3.0.XXX`) by the gated `release:enterprise` pipeline, which regenerates and validates the DNA before publishing.

## License

MIT — see [LICENSE](../../LICENSE).
