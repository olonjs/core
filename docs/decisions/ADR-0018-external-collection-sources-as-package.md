# ADR-0018: External collection sources ship as a package, not in core

## Status

Accepted

## Date

2026-09-29 (accepted 2026-09-30)

## Context

OlonJS models every piece of content as a deterministic, git-backed JSON document. `JsonPagesConfig` accepts `collections` (keyed documents) plus `collectionSchemas`; `resolveRuntimeConfig` is **sync, pure and IO-free**, and it validates each collection against its schema. Studio edits the documents in the repo; persistence is local/cloud/save2repo. That model is correct for **authored** content (pages, copy, design, navigation).

A shop needs the opposite for **system-of-record entities**: catalog, price, stock, cart, checkout. There the source of truth is an external system (Shopify, a PIM, a proprietary API), and OlonJS should own only the **contract (shape)** and **project** the data — not mirror values into the repo. Today this is possible only by hand: a tenant fetches, validates with its own Zod and injects `collections`/`collectionSchemas`. There is no first-class seam, and no way to add a provider without inventing one per tenant.

The constraint that forces this decision: **adding a provider must not require touching `packages/core`.** Core is published, versioned, and its public API is protected; per-provider changes there are not acceptable. The repository already has a pattern for extension without core edits — MTRP module augmentation (`SectionDataRegistry`, `CollectionItemRegistry`) — and `specs/2.0/Appendix` already distinguishes **authored document contracts** from **resolved runtime contracts**. The external-source seam belongs to the second category.

Open at decision time: whether the engine itself must understand sources (lazy per-route resolution, Studio read-only semantics, contract emission) — the four capabilities only core can provide. That uncertainty is acceptable because the chosen interface is designed to be adopted by core later without breaking changes.

## Decision

1. **The seam ships as a package, `@olonjs/sources`** — the `CollectionSource` contract, the resolution orchestration, and the policy decorators. `packages/core` is **not modified**.

2. **Core stays pure, sync and IO-free.** Integration reuses the existing extension points: the package resolves sources for the requested route and returns `{ collections, collectionSchemas, provenance }` ready to spread into `JsonPagesConfig`. No new core config field in this phase.

3. **No duplicated traversal.** The package peers on `@olonjs/core` and reuses its **public** helpers (`getCollectionRefBindings`, `resolveCollectionContext`) to determine which sources a page needs — it does not re-implement the resolver.

4. **Providers are data, not core code.** A provider is an object/package implementing `CollectionSource = { shape, resolve, readOnly? }`, registered in tenant config. Providers can be published independently (`@olonjs/source-shopify`, community). One Zod `shape` per source feeds both validation (`shape.parse`) and the JSON Schema contracts emitted for agents.

5. **Policy lives outside the contract**: `withCache`, `withRetry`, `withTimeout`, `withFallback`, `withCircuitBreaker`, plus structured observability events. Core owns no caching, retry or transport policy.

6. **Authored vs projected is explicit**: projected entities are `readOnly` by default, never persisted to the repo, and carry provenance (`source`, `fetchedAt`, `stale`). The repo remains the source of truth for authored content only.

7. **Promotion path (no-break).** If engine-level needs materialize — lazy per-route resolution inside the engine, Studio read-only semantics, native shape↔contract coupling — core adopts **the same interface** and the package re-exports it. Tenants change nothing.

8. **Acceptance demo:** `apps/next` page `/prodotti` rendered from a **deterministic, local** example provider (no network), with an optional real-provider file outside the test suite.

## Alternatives Considered

### Option A — Native seam in core now

- **Pros:** enables engine-level lazy per-route resolution, correct request lifetime (abort/dedupe), shape↔contract coupling and Studio read-only semantics natively; one obvious way for tenants; MTRP typing.
- **Cons:** puts an IO/async contract into a currently pure, sync engine; freezes an unproven abstraction in a protected, published public API; invites policy (cache/retry/timeout) to migrate into core; forces every static-JSON tenant to pay config surface for a capability they do not use; two migrations if the design changes.
- **Rejected because:** the four engine-level capabilities are not yet proven requirements, and the interface can be promoted into core later without breaking consumers. Freezing it now would lock guesses (ctx contents, phases, laziness, caching) into a public API.

### Option B — Ad-hoc tenant injection, no package

- **Pros:** zero new surface; works today.
- **Cons:** no contract, no validation/invariant guarantee, no conformance, no observability, no cache/fallback policy; every tenant reinvents it, and shape↔contract coupling silently diverges.
- **Rejected because:** it reproduces exactly the duplicated, drifting per-tenant logic the `core-import-platform` work removed.

### Option C — Materialize projected entities into the repo

- **Pros:** full determinism, contracts unchanged, Studio-editable, agents see a stable document.
- **Cons:** the repo pretends to own values whose SOT is external; staleness for price/stock; sync jobs and merge policy; audit confusion; editing an external entity in Studio is a lie.
- **Rejected because:** for system-of-record entities the repo must not be the source of truth. (Materialization remains a valid *adapter* choice — a provider that snapshots — but not the default architecture.)

## Consequences

- **Positive:** core unchanged and still pure; providers independently publishable; one declaration yields both human rendering and agent contracts; policy is composable and testable; promotion to core remains open.
- **Negative / accepted cost:** no engine-level lazy resolution in this phase — the tenant loader performs per-route resolution (already the natural place in `@olonjs/next` loaders); Studio read-only semantics require a convention (the package marks sources) rather than core enforcement; one more package to version and release.
- **Requirements imposed:** tenants wire one resolution step in their loader; provider authors run the conformance suite; docs must state the authored/projected boundary explicitly.

## Follow-ups

- [x] Scaffold `packages/sources` (contract, resolve, collect, decorators, testing) with typecheck+build gates.
- [x] `runSourceConformance` suite published for third-party providers.
- [x] Add `@olonjs/sources` to the release graph and `stack-versions.json` (peer `@olonjs/core`).
- [x] Demo `/prodotti` in `apps/next` (example provider + contracts/manifest check).
- [ ] Docs page for the authored/projected boundary and provider authoring.
- [x] Add the index row for this ADR in `docs/decisions/README.md`.
- [ ] Publish `@olonjs/sources` to npm (`release:enterprise` includes it; publication is Ask first).

## Open Points

All three were decided on 2026-09-29 and folded into the spec/implementation (see `specs/external-collection-sources-v1.md`):

- Package name: **`@olonjs/sources`**.
- v1 decorator set: **all five** (`withCache`, `withRetry`, `withTimeout`, `withFallback`, `withCircuitBreaker`).
- Demo includes the dynamic detail route **`/prodotti/[slug]`** (page.collection binding).

Deviations accepted during implementation: the testing kit is exported from the main entry (not a `./testing` subpath, to keep a single UMD-safe build); the optional real-world provider (`src/sources/shopify.ts`) was not shipped.

## References

- Corresponding spec: [`specs/external-collection-sources-v1.md`](../../specs/external-collection-sources-v1.md)
- `specs/2.0/Appendix.md` — authored vs resolved document contracts
- ADR-0003 (Zod internal SOT, JSON Schema public contract)
- ADR-0016 (`@olonjs/core` framework-agnostic split)
- `packages/core/src/contract/config-resolver.ts` — `$ref` / collection resolution
- `apps/next/app/[[...slug]]/page.tsx`, `apps/next/src/lib/loaders/` — tenant resolution point
