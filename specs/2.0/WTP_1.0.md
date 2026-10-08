## 11. WebMCP Tool Publishing Protocol (WTP) v1.0

**Objective:** Allow tenant developers to publish their own WebMCP tools, bound to section capsules, with an explicit `admin` | `public` surface — without touching the Core.

### 11.1 WebMcpToolDef

A declared tool is a serializable descriptor:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Tool identifier, **kebab-case** (`[a-z][a-z0-9-]*`). Collision with built-in names (`update-section`, `save`) is an explicit error. |
| `description` | string | yes | Agent-facing description of what the tool does. |
| `surface` | `'admin' \| 'public'` | yes | Where the tool is published (see 11.5). |
| `inputSchema` | JSON Schema object | no | Default `{ "type": "object", "properties": {} }`. Produced with Zod v4 `z.toJSONSchema()` — already serialized, the Core never imports Zod for declared tools. |
| `annotations` | object | no | Hints such as `consequentialHint: true` for side-effecting tools (e.g. form submission). |

### 11.2 Declaration (capsule)

Tools are declared by the section capsule, next to its schema:

- `webmcpTools.ts` exports `webmcpTools: readonly WebMcpToolDef[]` — **serializable defs only**
- `index.ts` re-exports `webmcpTools` alongside `View`, schema, and types

The tenant aggregates declarations in a single tool registry (e.g. `src/lib/webmcp/toolRegistry.ts`): `sectionPublicTools` (names per section type) and `declaredPublicTools` (public defs). This is the tenant's own wiring — the Core provides the contract and the generic runtime, nothing else.

### 11.3 Validation

At contract build time:

- non-kebab-case tool names → explicit error
- collision with built-in tool names → explicit error

### 11.4 Contract Emission

`buildPageContract` (and site manifest / llms.txt surfaces) emit `tools[]` as:

- built-in tools first, labeled `surface: 'admin'` (`update-section`, `save`)
- declared tools appended, each carrying its declared `surface`

Agents discover the page's full tool surface from the contract; the contract lists everything, the `surface` field discriminates.

### 11.5 Surface Semantics

| Surface | Registration | Runtime |
|---|---|---|
| `admin` | Studio island via `WebMcpConfig.toolExecutors` (JEB) | Executors dispatched by name alongside built-ins (JAP); unknown names rejected |
| `public` | Visitor island; the page passes **only the tool names** resolved from the rendered sections | Client resolves name → def with executor |

**RSC boundary law:** executor functions are tenant-side and must never cross the server/client boundary. Serialized data (defs, names) may cross; functions may not.

### 11.6 Executor Contract

- Signature: `(args: unknown) => Promise<unknown> | unknown`
- Invalid payload → readable validation error (e.g. Zod issues list), **before** any side effect
- Side-effecting tools should return a structured result (e.g. `{ ok: true }`) or a readable failure

### 11.7 Reference Implementation

`submit-form` in the Next tenant (`form-demo` capsule): validates against the section submission schema (ADR-0002), POSTs to the tenant-declared path with parity headers (Bearer + Idempotency-Key), returns `{ ok: true }`.

**Why it matters:** WTP turns the section capsule into the single unit of extension for both content and agent capabilities — the JSON contract remains the single deterministic source of truth.

---
