# @olonjs/react

<p align="center">
  <strong>React rendering bindings for the OlonJS engine.</strong><br />
  JsonPagesEngine · PageRenderer / SectionRenderer · theme runtime · cloud save · Studio bridge.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/react"><img src="https://img.shields.io/npm/v/@olonjs/react?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/react** renders the OlonJS contract in React: it hosts the engine (`JsonPagesEngine`), renders pages and sections, publishes the theme chain, manages the Studio provider tree, and implements HotSave. It is a **binding**, not the contract — the contract stays in [`@olonjs/core`](../core).

## Role in the Stack (ADR-0016)

- Depends on `@olonjs/core` (types, resolution, theme flattening).
- **Optionally** dynamic-loads `@olonjs/studio` for the `/admin` route — via a **single** allow-listed `import()` in `engine/StudioRoute.tsx`. No other studio import is permitted (enforced by `npm run test:boundary`).
- The visitor-only engine `OlonJSEngine` never references studio.

## Install

```bash
npm install @olonjs/react @olonjs/core
```

Peer dependencies: `react@^19`, `react-dom@^19`, `react-router-dom@^6.29`, `@olonjs/studio@^0.2.3` (optional for visitor-only sites), `zod@^4.6.0`.

## Quick Start

```tsx
import { JsonPagesEngine } from '@olonjs/react';

export function App() {
  return (
    <JsonPagesEngine
      config={{
        tenantId: 'my-tenant',
        registry,       // { [SectionType]: React.FC } — MTRP keys
        schemas,        // Record<SectionType, ZodType> — Form Factory aggregate
        pages,          // Record<slug, PageConfig>
        siteConfig,     // shell instances (header/footer)
        themeConfig,    // theme.json payload
        menuConfig,     // menu.json payload (resolved by core)
        addSection,     // AddSectionConfig
        // webmcp: { enabled: true, namespace, tools?, toolExecutors? } — JEB
      }}
    />
  );
}
```

Full bootstrap shape: **JEB** in [`specs/2.0/JEB_1.3.md`](../../specs/2.0/JEB_1.3.md).

## API Surface

| Area | Exports (representative) | Role |
|---|---|---|
| `engine` | `JsonPagesEngine`, `OlonJSEngine` | Full engine (routes `/`, `/admin`, `/admin/preview`) and visitor-only engine |
| `rendering` | `PageRenderer`, `SectionRenderer` | Global shell (header/footer), section lookup + error boundary + Studio overlay markers |
| `theme` | `ThemeLoader`, theme-manager singleton | CSS-string injection + flattened `--theme-*` CSS vars (CIP layer 0) |
| `config` | `ConfigProvider`, `StudioProvider`, `IconRegistryContext`, `OlonFormsContext` | Provider tree consumed by pages, Studio, and form sections |
| `cloud` | `resolveCloudPolicy`, `createHotSaveHandler`, `readCloudEnvFromVite` | Cloud policy (local/live/static) + HotSave persistence |
| misc | `useStudio`, `DefaultNotFound` | Studio bridge hook, default 404 |

## Architectural Laws (CIP v1.7)

- Theme chain is normative: `theme.json → runtime vars → tenant semantic bridge → section --local-* → JSX`. The package publishes layer 0 and enforces nothing about the tenant's own semantic naming.
- Views remain schema-blind; the package provides props (`data`, `settings`), never schema logic.

## Versioning

Patch-only auto-numbering (`0.2.XXX`) by the gated `release:enterprise` pipeline. Peers are synced from [`@olonjs/stack`](../stack) at prepack time.

## License

MIT — see [LICENSE](../../LICENSE).
