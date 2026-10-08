## 10. JsonPagesConfig & Engine Bootstrap (JEB) v1.3

**Objective:** Define the bootstrap contract between tenant app and `JsonPagesEngine`.

### 10.1 JsonPagesConfig

The tenant passes a single config object to `JsonPagesEngine`.
Required fields are:

| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | string | Used by asset resolution and runtime tenant identity |
| `registry` | `{ [K in SectionType]: React.FC<SectionComponentPropsMap[K]> }` | Component registry matching MTRP keys |
| `schemas` | `Record<SectionType, ZodType>` | Data schema aggregate used by the Form Factory |
| `pages` | `Record<string, PageConfig>` | Slug to page config map |
| `siteConfig` | `SiteConfig` | Site identity and shell instance declarations |
| `themeConfig` | `ThemeConfig` | Tenant theme source of truth |
| `menuConfig` | `MenuConfig` | Menu document payload and bootstrap resolver surface |
| `refDocuments` | `Record<string, unknown>` optional | Extra JSON documents available to `$ref` resolution |
| `themeCss` | `{ tenant: string }` | Tenant CSS bridge data for Stage/runtime injection |
| `addSection` | `AddSectionConfig` | Add-section configuration |
| `webmcp` | `WebMcpConfig` optional | WebMCP runtime configuration (see 10.5) |

### 10.2 JsonPagesEngine

`<JsonPagesEngine config={config} />` owns:

- route to page resolution
- section rendering orchestration
- runtime config resolution
- Studio shell integration
- wrapper/overlay injection for editable sections

Tenant does not reimplement the shell.

### 10.3 Runtime Config Resolution

The engine may combine:

- page documents
- authored config drafts (`siteConfig`, `themeConfig`, `menuConfig`, page drafts)
- referenced documents from the local JSON graph and optional `refDocuments`

This is what allows shell bindings and document indirection to resolve before rendering.

Resolution precedence rule:

- active mutable drafts take precedence over bootstrap/reference inputs
- `refDocuments` act as initial resolution/bootstrap sources unless a mutable draft for the same document is present

### 10.3.1 RefDocuments Bootstrap Rule

`refDocuments` are bootstrap and reference-resolution inputs.

They may provide the initial external JSON documents used to resolve authored `$ref` bindings at runtime or at Studio startup.

They are not, by themselves, the mutable source of truth for an active Studio editing session.

When Studio creates a mutable draft for a referenced document, that draft takes precedence over the corresponding `refDocuments` entry for subsequent resolution and editing.

Why it matters:
without this rule, Studio may resolve a referenced field from a stale bootstrap snapshot instead of from the active mutable document draft.

### 10.4 Menu Binding Clarification

`menu.json` remains the source of truth for menu structures.
`menuConfig` in bootstrap is the resolved menu document surface passed into the engine.

Shell instances do not become menu owners because bootstrap includes `menuConfig`.

### 10.5 WebMCP Bootstrap (WTP)

`WebMcpConfig` shape:

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether the WebMCP runtime is exposed on the page |
| `namespace` | string optional | Runtime namespace qualifier |
| `tools` | `WebMcpToolDef[]` optional | Declared tool descriptors (see WTP 11.1) |
| `toolExecutors` | `Record<string, (args: unknown) => Promise<unknown> \| unknown>` optional | Tenant-side executors keyed by tool name; `admin` tools are registered and dispatched by the Studio route body (JAP); `public` tools are resolved name-only through the visitor page |

Declared tools are validated and emitted in page contracts per WTP.

**Why it matters:** JEB is the runtime boundary between sovereign tenant data and Core orchestration.

---
