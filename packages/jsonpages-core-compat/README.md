# @jsonpages/core

<p align="center">
  <strong>Compatibility bridge — use @olonjs/core instead.</strong>
</p>

> **Deprecated.** This package exists only to keep legacy `@jsonpages/core` imports working during the rebrand. New code must use [`@olonjs/core`](../core).

## What It Does

Re-exports the entire `@olonjs/core` API unchanged, with a CJS entry for legacy consumers:

- ESM: `export * from "@olonjs/core"`
- CJS: `index.cjs`
- Types: `index.d.ts`

## Migration

```diff
- import { buildPageContract } from '@jsonpages/core';
+ import { buildPageContract } from '@olonjs/core';
```

No behavior difference — same code, same types, same version number as the target.

## Decommissioning

See the compatibility cutoff plan: [`docs/COMPAT_CUTOFF_EN.md`](../../docs/COMPAT_CUTOFF_EN.md).

## License

MIT — see [LICENSE](../../LICENSE).
