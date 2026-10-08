# @jsonpages/cli

<p align="center">
  <strong>Compatibility bridge — use @olonjs/cli instead.</strong>
</p>

> **Deprecated.** This package exists only to keep the legacy `jsonpages` binary working during the rebrand. New code must use [`@olonjs/cli`](../cli).

## What It Does

Provides the legacy `jsonpages` bin, delegating to `@olonjs/cli`:

```bash
# Deprecated alias — still functional
npx jsonpages new tenant my-site --template next

# Canonical
npx @olonjs/cli new tenant my-site --template next
```

## Decommissioning

See the compatibility cutoff plan: [`docs/COMPAT_CUTOFF_EN.md`](../../docs/COMPAT_CUTOFF_EN.md).

## License

MIT — see [LICENSE](../../LICENSE).
