# @jsonpages/stack

<p align="center">
  <strong>Compatibility bridge — use @olonjs/stack instead.</strong>
</p>

> **Deprecated.** This package exists only to keep legacy `@jsonpages/stack` imports working during the rebrand. New code must use [`@olonjs/stack`](../stack).

## What It Does

Re-exports the `@olonjs/stack` manifest unchanged:

- default export = the stack manifest
- named: `peerDependencies`, `dependencies`, `devDependencies`
- subpath: `./stack-versions.json`

## Migration

```diff
- import stack from '@jsonpages/stack';
+ import stack from '@olonjs/stack';
```

## Decommissioning

See the compatibility cutoff plan: [`docs/COMPAT_CUTOFF_EN.md`](../../docs/COMPAT_CUTOFF_EN.md).

## License

MIT — see [LICENSE](../../LICENSE).
