# Todo — 002 Next WebMCP runtime parity

Scope locked: **admin + visitor island** (full browser contract parity).

## Done

- [x] Task 1: Admin `webmcp.enabled` — `7cd184b`
- [x] Task 2: Visitor `ensureWebMcpRuntime` island — `0ca344d`
- [x] Task 4: Visitor `readResource` smoke PASS

## Open

- [x] Task 3a: Studio local WebMCP — parse against **resolved** section data — `aeb3e50` (live PASS)
- [x] Task 3b: `webmcp-feature-check.mjs` → `document.modelContextProtocol` (next, alpha, olonjs.io) — `c8f8c51`
- [ ] Task 3c: `save` Failed to fetch — not reproduced live (200); need user repro
- [ ] Task 3d: harness target selection stale (`tool.sectionType`) → use contract `sectionInstances`
- [ ] Task 3e: bake omits `libri/[slug]` manifest listed in site index
- [ ] Task 3f: local save CRLF→LF rewrite noise
- [ ] Task 5: Doc note (`docs/webmcp.md`)
- [ ] Task 6: Confirm DNA ships wiring

## Done when

- [ ] On `/admin`, `document.modelContextProtocol.listTools()` includes `update-section` + `save`
- [ ] `update-section` with `fieldKey` works on sections that still author `items.$ref`
- [ ] On a public page, `readResource` works; no mutation tools
- [ ] `npm run verify:webmcp` exits 0 (after harness fix)
- [ ] No `navigator.modelContext`; no reliance on nonexistent `modelContextTesting`
