# WebMCP: The Agent-Native Browser API

OlonJS implements **WebMCP** (Web Model Context Protocol) natively within its Engine. This transforms any OlonJS website into an API directly accessible from the browser's context, allowing AI Agents (and automated E2E scripts) to interact with the site semantically, bypassing traditional, fragile DOM scraping.

## The Paradigm: Core as an MCP Server

Instead of running a separate backend Node.js server, OlonJS exposes the **React Engine itself** as an MCP server directly within the browser tab.

1.  **Discovery (The Manifesto):** When an Agent visits the site, the Engine exposes a manifesto of capabilities via `document.modelContextProtocol`.
2.  **Semantic Bridge:** The Agent doesn't "click buttons" (`.btn-primary`). It calls explicitly typed functions (Tools) using JSON.
3.  **Governance & Security:** The Engine validates all Agent inputs against the tenant's Zod schemas *before* altering the React state or saving to disk.

---

## Accessing WebMCP

Tool registration uses the WebMCP Imperative API on **`document.modelContext`** (spec). `navigator.modelContext` is removed — do not use it.

```typescript
const modelContext = document.modelContext;
const mcp = document.modelContextProtocol;
```

---

## 1. Discovery: Listing Tools

You can query the Engine to see which tools are currently available. 

OlonJS uses an **Enterprise Grade** architecture: instead of exposing dozens of redundant tools for each section type, it exposes a single, universal `update-section` tool.

**Console Example:**
```javascript
const tools = document.modelContextProtocol.listTools();
console.log(tools);
// Output:
// [{
//   name: "update-section",
//   description: "Update any section in OlonJS Studio...",
//   inputSchema: { ... }
// }]
```

---

## 2. Reading Resources (Data Fetching)

Agents can read the exact data state of any page without parsing HTML. OlonJS pages are exposed as `olon://` URIs.

Currently, the Engine supports reading page data. The Agent can discover available resources using the `listResources` method (if implemented) or directly fetch known paths.

**Console Example:**
```javascript
// Fetch the structured JSON data for the current 'home' page
const pageDataString = await document.modelContextProtocol.readResource('olon://pages/home');
const pageData = JSON.parse(pageDataString);

console.log("Page data:", pageData);
console.log("Sections count:", pageData.sections.length);

// Example: Finding a specific section ID by its type
const heroSection = pageData.sections.find(s => s.type === 'olon-hero');
console.log("Found Hero ID:", heroSection?.id);
```

---

## 3. Executing Tools (Zero-UI Mutations)

The core capability of WebMCP is allowing Agents to perform actions. OlonJS exposes the universal `update-section` tool plus the `save` persistence tool.

### `update-section`

This tool allows an Agent to modify any section on the page. The Engine will automatically look up the correct Zod schema based on the `sectionType` provided, validate the payload, and update the UI instantly.

**Arguments:**
*   `sectionId` (string, required): The unique ID of the section to update (the tool input schema ships an enum of the valid IDs for the current page).
*   `sectionType` (string, required): The type of the section (e.g., `"olon-hero"`). Used by the Engine to pick the correct validation schema.
*   `scope` (string, optional): `"local"` (default) or `"global"`.
*   `data` (object): The full replacement payload for the section.
*   `itemPath` / `fieldKey` + `value`: targeted mutation of a single field or array item without a full payload.

**Console Example: Updating a Hero Section**
```javascript
// 1. First, read the page to find the sectionId you want to edit
const pageStr = await document.modelContextProtocol.readResource('olon://pages/home');
const page = JSON.parse(pageStr);

// Let's assume we found a hero section with ID "hero-1" and type "olon-hero"
const targetSectionId = "hero-1"; 

// 2. Call the update-section tool
const responseStr = await document.modelContextProtocol.executeTool(
  'update-section', 
  JSON.stringify({
    sectionId: targetSectionId,
    sectionType: 'olon-hero',
    scope: 'local',
    data: {
      eyebrow: "AI GENERATED",
      headline: "Welcome to the Agentic Web",
      subline: "This section was updated directly via the browser console using WebMCP.",
      cta: {
        primary: { label: "Learn More", href: "/docs" },
        secondary: { label: "GitHub", href: "https://github.com" },
        ghost: { label: "Contact", href: "/contact" }
      }
    }
  })
);

console.log(JSON.parse(responseStr));
// Output: { content: [{ type: "text", text: "{\"ok\":true,...}" }], isError: false }
```

### `save`

Persists all pending draft changes using the active save mode (local file, hot save, or save2repo). Call it **once** after all `update-section` calls are complete.

```javascript
const saveStr = await document.modelContextProtocol.executeTool('save', '{}');
console.log(JSON.parse(saveStr)); // { content: [...], isError: false }
```

---

## Tenant Wiring

WebMCP is opt-in per tenant. This section documents how the pieces fit — engine gate, Studio tool registration, the visitor-side polyfill, and the E2E harness.

### 1. Engine gate (`webmcp.enabled`)

`JsonPagesEngineCore` installs the runtime polyfill when the tenant enables it:

```tsx
// packages/react/src/engine/JsonPagesEngineCore.tsx
if (config.webmcp?.enabled) {
  ensureWebMcpRuntime();
}
```

Tenants enable it in their `JsonPagesConfig`:

```tsx
// apps/<tenant>/src/App.tsx
const config: JsonPagesConfig = {
  // ...
  webmcp: { enabled: true },   // off by default
};
```

### 2. Studio tool registration (admin only)

`StudioRouteBody` registers the two mutation tools on `/admin`, gated on the same flag. The input schema ships an **enum of the real section IDs** of the current draft so agents can only target existing sections:

```tsx
// packages/studio/src/StudioRouteBody.tsx (excerpt)
import { buildWebMcpToolName, buildWebMcpSaveToolName, createWebMcpToolInputSchema,
         createWebMcpSaveToolInputSchema, ensureWebMcpRuntime, registerWebMcpTool } from '@olonjs/core';

useEffect(() => {
  if (!webMcp?.enabled) return;
  ensureWebMcpRuntime();

  const catalog = /* [{ id, type }, ...] from the current draft + global header/footer */;

  const unregisterUpdate = registerWebMcpTool({
    name: buildWebMcpToolName(),          // "update-section"
    description: 'Update a section field in the Studio draft. Does not persist — call save when all updates are complete.',
    inputSchema: createWebMcpToolInputSchema(catalog),
    execute: (args) => handleWebMcpToolCall(buildWebMcpToolName(), args),
  });
  const unregisterSave = registerWebMcpTool({
    name: buildWebMcpSaveToolName(),      // "save"
    description: 'Persist all pending draft changes using the active save mode.',
    inputSchema: createWebMcpSaveToolInputSchema(),
    execute: () => handleWebMcpToolCall(buildWebMcpSaveToolName(), {}),
  });

  return () => { unregisterUpdate(); unregisterSave(); };
}, [webMcp?.enabled, /* draft deps */]);
```

`registerWebMcpTool` tracks one `AbortController` per tool name, so re-registration (React StrictMode double-invoke, HMR, effect re-runs) cleanly aborts the previous registration — the native Chrome WebMCP API throws `InvalidStateError` on duplicate names.

### 3. Visitor pages (read-only polyfill)

Public pages expose **no mutation tools** — only the polyfill with `readResource`:

```tsx
// apps/next/src/components/webmcp/WebMcpVisitorRuntime.tsx
'use client';
import { useEffect } from 'react';
import { bootstrapVisitorWebMcpRuntime } from '@/lib/webmcp/bootstrapVisitorWebMcpRuntime';

export function WebMcpVisitorRuntime() {
  useEffect(() => { bootstrapVisitorWebMcpRuntime(); }, []);
  return null;
}
```

```ts
// apps/next/src/lib/webmcp/bootstrapVisitorWebMcpRuntime.ts
import { ensureWebMcpRuntime } from '@olonjs/core';

export function bootstrapVisitorWebMcpRuntime() {
  ensureWebMcpRuntime(); // installs document.modelContext / modelContextProtocol; no tools
}
```

### 4. The polyfill (`ensureWebMcpRuntime`)

`ensureWebMcpRuntime` (in `@olonjs/core`, `src/webmcp/runtime/webmcp-bridge.ts`) is idempotent: if a native `document.modelContext.registerTool` already exists (Chrome WebMCP), it leaves it intact; otherwise it installs a polyfill implementing:

- `document.modelContext.registerTool / unregisterTool / readResource`
- `document.modelContextProtocol.listTools() / executeTool(name, argsJson) / readResource(uri)`

`readResource` resolves the `olon://` URIs over HTTP: `olon://pages` → `/mcp-manifest.json`, `olon://pages/<slug>` → `/pages/<slug>.json`.

### 5. E2E feature-check harness

`apps/next/scripts/webmcp-feature-check.mjs` (and the tenant-alpha twin) verifies the live surface through a headless browser — **always via `document.modelContextProtocol`** (`listTools()` / `executeTool()`), never via a testing alias:

```js
const toolNames = await page.evaluate(() =>
  document.modelContextProtocol?.listTools?.().map((tool) => tool.name) ?? [],
);
// expect: ["update-section", "save"] on /admin, [] on visitor pages
```

Run: `npm run verify:webmcp` (Next) with the dev server up; the harness performs a real `update-section` + `save` round-trip and restores the original value.

---

## HTTP Discovery Surface

Beyond the live browser API, every OlonJS site exposes a machine-readable discovery surface:

| Path | Content |
|---|---|
| `/mcp-manifest.json` | Site index: `pages[]` + optional `collections[]` |
| `/mcp-manifests/{slug}.json` | Per-page MCP manifest (transport, capabilities, tools) |
| `/schemas/{slug}.schema.json` | Per-page contract (section instances + JSON Schemas) |
| `/schemas/collections/{source}.schema.json` | Per-collection item contract |
| `/{slug}.json` (or `/pages/{slug}.json`) | Raw page JSON |
| `/llms.txt` | LLM-oriented site guide |

- **Vite tenants** (`alpha`): baked at prebuild (`scripts/bake.mjs`) into `public/` + `dist-ssr/`.
- **Next tenants** (`next`): served at request time — route handlers under `app/api/webmcp/*` and `app/api/seo/*` mapped via explicit rewrites in `next.config.ts`. Same `webmcp.*` builders from `@olonjs/core` as the Vite bake; no baked artifacts.



## Future Extensibility: The E-Commerce Flow

This exact architecture scales seamlessly to complex interactions like an e-commerce checkout. 

In the future, the Engine will expose tools like `search_products` and `execute_purchase`. The Agent will negotiate the purchase entirely via JSON payloads, and the OlonJS Engine will orchestrate the transaction, only rendering a final, secure payment overlay for human confirmation (Governance).
