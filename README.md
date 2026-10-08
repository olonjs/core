# OlonJS — Websites for Humans and AI Agents


<p align="center">
  <a href="https://olonjs.com">
    <img src="https://github.com/olonjs/npm-jpcore/blob/main/brand/mark/olon-mark-dark-256.png" width="120" height="120" alt="OlonJS Logo">
  </a>
</p>

<h1 align="center">OlonJS</h1>

<p align="center">
  <strong>The AI-Native Content Infrastructure.</strong><br />
  Deterministic. Sovereign. Git-Backed.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@olonjs/core">
    <img src="https://img.shields.io/npm/v/@olonjs/core?color=blue&style=flat-square" alt="npm version">
  </a>
  <a href="https://github.com/olonjs/npm-jpcore/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license">
  </a>
</p>

**OlonJS** is an open-source JavaScript infrastructure designed to bridge the gap between human-centric websites and AI agents. It introduces a **deterministic machine contract** for web content: every page is natively available as a typed JSON endpoint (`/{slug}.json`), making websites reliably readable and operable by AI agents while preserving a high-end human UI.




This repository contains the OlonJS stack:

- `packages/core`: framework-agnostic engine (`@olonjs/core`)
- `packages/react`: React rendering bindings (`@olonjs/react`)
- `packages/studio`: schema-driven Studio editor (`@olonjs/studio`)
- `packages/next`: Next.js App Router host binding (`@olonjs/next`)
- `packages/sources`: external collection sources + policy decorators (`@olonjs/sources`)
- `packages/mcp`: local MCP server bridge (`@olonjs/mcp`)
- `packages/cli`: tenant generator (`@olonjs/cli`)
- `packages/stack`: dependency manifest (`@olonjs/stack`)
- `packages/jsonpages-*-compat`: `@jsonpages/*` compatibility bridges
- `apps/tenant-alpha`: Vite reference app, template source (`alpha`)
- `apps/next`: Next.js reference app, template source (`next`)
- `apps/olonjs.io`: marketing/landing site

Use this file as entrypoint. Canonical docs are under `docs/`

## 🚀 The Vision

Websites are currently built for humans (HTML-heavy, fragmented). AI agents struggle with scraping and non-deterministic structures. **OlonJS** standardizes the web-to-agent interface through:

-   **WebMCP Readiness:** Native integration with the **Model Context Protocol**. OlonJS sites act as MCP Servers, exposing content as Resources and sections as Tools for AI-orchestrated browsers (Chrome WebMCP).
-   **Predictable Endpoints:** Canonical JSON sidecars for every route. No scraping, just pure data.
-   **Schema-Driven Contracts:** Zod-validated content structures defined by the tenant. The schema is the API.
-   **Sovereign Architecture:** A core JavaScript engine that orchestrates the runtime state and deterministic rendering of polymorphic web content.

## 📦 Monorepo Structure (npm workspaces)

This repository manages the entire OlonJS ecosystem:

- **`packages/core` (@olonjs/core):** The framework-agnostic Sovereign Core Engine — protocol types, config/collection resolution, theme-token logic, WebMCP contracts, routing helpers. Zero React.
- **`packages/react` (@olonjs/react):** React rendering bindings (visitor engine, config/theme providers, cloud save).
- **`packages/studio` (@olonjs/studio):** The schema-driven Studio editor (FormFactory, AdminSidebar, Stage).
- **`packages/next` (@olonjs/next):** Next.js App Router host binding (RSC visitors + admin island).
- **`packages/sources` (@olonjs/sources):** External collection sources with declarative policy decorators (cache/retry/fallback) — never in core.
- **`packages/mcp` (@olonjs/mcp):** Local MCP server bridge for Zero-UI tenant automation via Playwright.
- **`packages/cli` (@olonjs/cli):** The primary entry point for developers. Scaffolds new tenants by projecting DNA templates.
- **`packages/stack` (@olonjs/stack):** Version manifest package to keep dependency policy aligned.
- **`apps/tenant-alpha`:** Source of truth for the `alpha` DNA template (Vite).
- **`apps/next`:** Source of truth for the `next` DNA template (Next.js).

## 🚦 Getting Started

### Scaffolding a new Tenant
The only command you need to start a new project with the OlonJS DNA:
```bash
npx @olonjs/cli new tenant my-agentic-site --template next
```
*Supported templates: `next`, `vite`, `alpha` (default). In non-interactive shells (CI/agents) `--template` is required.*

### Local Monorepo Development
```bash
# Install dependencies for all packages and apps
npm install

# Run the reference alpha tenant
npm run dev

```
### Root scripts

- `npm run dev`: run `tenant-alpha` in dev mode
- `npm run build`: build `tenant-alpha`
- `npm run build:all`: run `build` for all workspaces (if script exists)
- `npm run check:templates`: validate all CLI template assets (`alpha` + `next`)
- `npm run dist:dna:all`: regenerate DNA via tenant SOTs (`tenant-alpha` + `tenant-next`)
- `npm run test:boundary`: enforce the ADR-0016 package boundary graph
- `npm run release`: legacy release flow (`scripts/release.js`)
- `npm run release:enterprise`: gated release flow (`check:templates` + `dist:dna:all` + `release`)

### DNA source of truth

DNA is generated from tenant apps, not edited manually:

- `apps/tenant-alpha` -> template `alpha`
- `apps/next` -> template `next`

Each source app owns its own `dist` script.
Root `dist:dna:all` delegates to those `dist` scripts.


## 📖 Documentation Index

Detailed technical documentation is available in the `docs/` directory:

### Specs 2.0
- **[Specs 2.0 — Index](./specs/2.0/INDEX.md):** Entry point of the modular protocol set (13 protocols + ComplianceModel + Appendix): reasoned reading order, dependency graph, and per-protocol versions.

### Core Architecture & CLI
- **[Architecture](./docs/ARCHITECTURE.md):** Monorepo layout, package responsibilities, and DNA regeneration flow.
- **[CLI Contract](./docs/CLI.md):** Command surface, template resolution, and generation pipeline.
- **[Templates Governance](./docs/TEMPLATES.md):** Rules for managing DNA source of truth and conformance checks.
- **[WebMCP (Browser API)](./docs/webmcp.md):** The Agent-Native browser API for Zero-UI mutations and programmatic exploration.
- **[MCP Bridge Guide](./docs/mcp-guide.md):** Local MCP server bridge for Studio automation.
- **[External Collection Sources](./docs/sources.md):** Project external systems of record (catalog, PIM, …) into the OlonJS contract (`@olonjs/sources`).
- **[Canonical JSON Schemas](./docs/canonical-schemas-howto.md):** How to evolve the public `schemas/v1` contract (Zod SOT → `bump:all`).

### Decisions & Governance
- **[ADR Index](./docs/decisions/):** Architecture Decision Records.
- **[Client Onboarding](./docs/docs_governance_en.md):** Guide for graphics and data development.
- **[Governance Flows](./docs/flows/):** Full CMS integration (Studio, ICE, Form Factory, IDAC).

### Ops & Maintenance
- **[Publishing & Release](./docs/PUBLISHING.md):** Operational source of truth for NPM releases and DNA sync.
- **[Compatibility Cutoff](./docs/COMPAT_CUTOFF_EN.md):** Decommissioning plan for legacy `jsonpages` residues.

## 🛠️ Technical Stack
- **Runtime:** React 19, TypeScript, Zod v4 (`^4.6.0`).
- **Build:** Vite 6 (tenant `alpha`) + Next.js 15 (tenant `next`) + Tailwind CSS v4.
- **Protocol:** WebMCP (Model Context Protocol) ready via deterministic JSON endpoints.

## 🌐 JavaScript Ecosystem Integration
OlonJS is a pure JavaScript/TypeScript ecosystem project. It leverages runtime polymorphism and Zod-driven schemas to redefine how content is served and manipulated by AI. By providing a standard library for machine-readable websites, OlonJS contributes to the evolution of the JavaScript ecosystem in the age of AI.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

**Built for the Agentic Web by the OlonJS Team.**
[olonjs.io](https://olonjs.io)

---
