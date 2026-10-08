# OlonJS Admin Protocol (JAP) v1.4

**Objective:** Deterministic orchestration of the Studio environment.

## 1. The Sovereign Shell Topology

The Admin interface is a sovereign shell composed from `@olonjs/react` (routing, studio-mode bridge, lazy-loads the editor) and `@olonjs/studio` (Stage, Inspector, Form Factory, and all other editor UI). `@olonjs/core` itself is framework-agnostic and owns none of this UI — it owns only the pure contract/kernel types and resolution logic both packages consume.

1. The Stage is an isolated iframe using postMessage and IDAC bindings
2. The Inspector consumes tenant schemas to generate editors
3. Studio actions orchestrate save, hot save, add, reorder, and delete flows

## 2. State Orchestration & Persistence

- Working Draft holds reactive local state for unsaved changes
- Inspector changes propagate into Working Draft and then Stage synchronization
- persistence channels are explicit callbacks rather than implicit file mutation on every keystroke

## 3. Context Switching

- shell-scoped selection enters global mode and maps to `site.json`
- page-local selection enters page mode and maps to the current page document

## 4. Section Lifecycle Management

1. Add Section uses `AddSectionConfig`
2. Reorder mutates the working draft array deterministically
3. Delete removes the section and clears invalid selection

## 5. Stage Isolation & Overlay

- Stage runs in an iframe so tenant CSS does not leak into Admin chrome
- overlay markup is injected by Core
- overlay appearance is styled by the tenant per TOCC

## 6. Green Build Validation

Studio and supporting build flows must remain compatible with a green `tsc && vite build` standard.

## 7. Path-Deterministic Selection & Sidebar Expansion

- section and nested focus synchronization uses path segments for nested targets
- sidebar expansion state for nested arrays derives from the full root-to-leaf path
- flat-only heuristics are non-compliant for nested structures

## 8. Declared WebMCP Tools (admin surface — WTP)

The Studio route body is the single dispatcher for admin-surface tools:

- built-in tools (`update-section`, `save`) remain first-class, hardcoded
- declared tools with `surface: 'admin'` are registered from `WebMcpConfig.toolExecutors` (JEB 10.5) alongside the built-ins
- dispatch is by tool name; unknown names are rejected with an explicit error
- registration is deterministic and cleaned up on unmount (no duplicate registrations)

Declared tools never replace built-ins; a name collision with a built-in is an explicit contract-build error (WTP 11.3).

**Why it matters:** JAP keeps editing deterministic across shell and page scopes without collapsing Studio into tenant-specific admin logic.

---
