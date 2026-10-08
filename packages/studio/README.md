# @olonjs/studio

<p align="center">
  <strong>The schema-driven Studio editor for OlonJS.</strong><br />
  FormFactory · AdminSidebar · StudioStage · Inspector · add-section library.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/studio"><img src="https://img.shields.io/npm/v/@olonjs/studio?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/studio** is the editing surface of OlonJS. It consumes **tenant Zod schemas** and turns them into editors — no hand-written forms. Every widget is driven by `ui:*` descriptors in `.describe()` (ECIP); every editable element is addressed through IDAC DOM attributes and `SelectionPath`.

## Role in the Stack (ADR-0016)

- Depends **only** on `@olonjs/core` — it is a rendering-framework binding like `@olonjs/react`, reusable by any future host binding.
- Loaded lazily by `@olonjs/react` through a single dynamic import (the `/admin` route).

## Install

```bash
npm install @olonjs/studio @olonjs/core
```

Peer dependencies: `react@^19`, `react-dom@^19`, `react-router-dom@^6.29`, `zod@^4.6.0`.

## Quick Start

```tsx
import { FormFactory } from '@olonjs/studio';
import { z } from 'zod';

const HeroSchema = z.object({
  title: z.string().describe('ui:text'),
  subtitle: z.string().describe('ui:textarea'),
  variant: z.enum(['light', 'dark']).default('light').describe('ui:select'),
});

// The schema IS the form — no widget wiring
<FormFactory schema={HeroSchema} value={data} onChange={update} />
```

The `ui:*` vocabulary is the contract (see [ECIP](../../specs/2.0/ECIP.md)): `ui:text`, `ui:textarea`, `ui:select`, `ui:number`, `ui:list`, `ui:image-picker`, `ui:icon-picker`, plus tenant-level `ui:collection-ref:<source>` (COP). Unknown descriptors fall back to `ui:text`.

## API Surface

| Export | Role |
|---|---|
| `FormFactory` | Schema-driven editor generator (ECIP) |
| `AdminSidebar` | Section tree with path-deterministic selection (JAP §7) |
| `StudioStage` | Isolated iframe stage with postMessage bridge + overlay (IDAC/TOCC) |
| `StudioRouteBody` | Admin route shell: state, WebMCP built-in tools (`update-section`, `save`) + declared admin tool dispatch (WTP) |
| `AddSectionLibrary` | Add-Section panel driven by `AddSectionConfig` (ASC) |
| `PageSelector`, `InputWidgets`, `ImagePickerDialog`, `ImagePreviewField` | Editor chrome and widgets |
| `adminSkinCss` | Editor CSS as an injected string — never pollutes the visitor bundle |
| `StudioAssetsProvider`, `useStudioAssets` | Asset context for the editor |
| `buildSelectionPath` | DOM (`data-jp-*`) → `SelectionPath` construction |

## Protocols Implemented

- **ECIP** — schema-driven editor contract (Form Factory, `ui:*`)
- **JAP** — deterministic Studio orchestration (Stage, Inspector, Working Draft, persistence)
- **IDAC** — `data-jp-*` selection binding
- **TOCC** — tenant overlay styling (`[data-jp-section-overlay]`)
- **ASC** — add-section contract

## Versioning

Patch-only auto-numbering (`0.2.XXX`) by the gated `release:enterprise` pipeline. React-family peers are synced from [`@olonjs/stack`](../stack) at prepack time.

## License

MIT — see [LICENSE](../../LICENSE).
