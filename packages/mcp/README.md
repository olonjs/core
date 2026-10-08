# @olonjs/mcp

<p align="center">
  <strong>Local MCP server bridge for OlonJS.</strong><br />
  Zero-UI tenant automation: drive the Studio route's WebMCP surface through Playwright, exposed as MCP tools.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/mcp"><img src="https://img.shields.io/npm/v/@olonjs/mcp?color=blue&style=flat-square" alt="npm version"></a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license"></a>
</p>

**@olonjs/mcp** exposes a local **stdio MCP server** (`olonjs-mcp`) that drives a running OlonJS tenant in a headless browser via Playwright. Whatever the tenant's Studio route registers on `document.modelContextProtocol` becomes callable MCP tools — plus the extra `navigate-to-page` helper. Ideal for Cursor/Cline/Claude-style agent clients that need Zero-UI mutations.

## Install

```bash
npm install -g @olonjs/mcp
```

## Usage

```bash
# Start the MCP server (stdio)
olonjs-mcp

# Write the MCP client config for Cursor / Cline
olonjs-mcp init
```

`init` writes the client configuration natively for Windows and macOS; under WSL it wires the Windows side via `wsl -d <distro> bash -ilc`.

## How It Works

```
MCP client (Cursor/Cline) ──stdio──► olonjs-mcp ──Playwright──► tenant Studio route
                                        │                            │
                                        └── tools = runtime WebMCP  └── document.modelContextProtocol
                                             registry (+ navigate-to-page)
```

The bridge is **dynamic**: it lists whatever tools the tenant registers at runtime — built-in Studio tools (`update-section`, `save`) and declared admin tools (WTP) included. No per-tool bridge code.

## Requirements

- Node 18+ and a Playwright-capable browser (installed on demand)
- A running tenant with WebMCP enabled on the Studio route

> **Note:** this bridge targets the Studio (admin) route. Visitor-page (public surface) verification is done directly in-browser via `document.modelContextProtocol` — see [`docs/webmcp.md`](../../docs/webmcp.md) and the WTP spec in [`specs/2.0/INDEX.md`](../../specs/2.0/INDEX.md).

## Versioning

Patch-only auto-numbering (`1.0.XXX`) by the gated `release:enterprise` pipeline.

## License

MIT — see [LICENSE](../../LICENSE).
