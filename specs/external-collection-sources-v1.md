# Spec: External Collection Sources (`@olonjs/sources`)

**Created:** 2026-09-29
**Status:** DRAFT — Phase 1 SDD, in attesa di review
**Module id:** `external-collection-sources`
**Contact:** architecture discussion 2026-09-29 (see ADR-0018)
**Scope check (Phase 0):** capability singola — il demo `/prodotti` in `apps/next` è la sua slice end-to-end, non una capability separata.

---

## Objective

Rendere il catalogo (e in generale ogni entità di **sistema di record esterno**) una **sorgente proiettata** dichiarativa, invece di valori iniettati a mano nel config. Aggiungere un provider **non deve toccare `packages/core`**.

Il seam (contratto + orchestrazione + policy) vive in un **nuovo package `@olonjs/sources`**; i provider concreti sono oggetti/pacchetti che implementano il contratto; il core resta puro, sincrono e deterministico.

**Utente:** sviluppatore di tenant con dati di catalogo la cui SOT è esterna (Shopify, PIM, API propria).

**Successo:** in `apps/next`, la pagina `/prodotti` mostra item risolti da un provider d'esempio; gli stessi item producono i contratti JSON Schema/manifest per gli agenti **dalla stessa `shape`**; `git diff packages/core` = **zero**.

## Tech Stack

| Piece | Choice |
|---|---|
| Linguaggio | TypeScript 5, ESM |
| Validazione/contratti | `zod ^4.6.0` (peer via `@olonjs/core`), `zod/v4` |
| Nuovo package | `packages/sources` → `@olonjs/sources` (peer `@olonjs/core`) |
| Test | Vitest, unit ermetici (fake clock, zero network) |
| Demo | `apps/next` (Next.js), pagina `/prodotti` |
| Runtime target | Node (loader server-side); nessuna dipendenza React/DOM |

## Commands

```bash
# package
npm run build -w @olonjs/sources          # typecheck (tsc --noEmit) + vite build
npm run typecheck -w @olonjs/sources
npm test -w @olonjs/sources               # vitest run

# demo
npm run build -w tenant-next
WEBMCP_BASE_URL=http://localhost:3000 node apps/next/scripts/webmcp-feature-check.mjs  # gate esistente
```

## Project Structure

```
packages/sources/
├── package.json              # peer @olonjs/core, scripts build/typecheck/test
├── src/
│   ├── index.ts              # defineCollectionSource, resolveCollectionSources, collectCollectionSources, tipi
│   ├── contract.ts           # CollectionSource, CollectionSourceContext, SourceError, SourceEvent
│   ├── resolve.ts            # orchestrazione (memoize per-ctx, merge con collections/collectionSchemas)
│   ├── collect.ts            # traversal via helper PUBBLICI di core (getCollectionRefBindings, page.collection)
│   └── decorators/
│       ├── cache.ts          # withCache (ttl, swr, CacheStore)
│       ├── retry.ts          # withRetry (attempts, backoff+jitter)
│       ├── timeout.ts        # withTimeout
│       ├── fallback.ts       # withFallback (stale)
│       └── breaker.ts        # withCircuitBreaker
└── src/testing/              # createTestSource, fake clock, runSourceConformance

apps/next/src/
├── sources/
│   ├── catalogo.ts           # PROVIDER D'ESEMPIO deterministico (finto servizio esterno)
│   ├── shopify.ts            # (opzionale, fuori dai test) stesso contratto, API reale
│   └── index.ts              # export const collectionSources = { catalogo }
├── collections/prodotti/     # schema.ts (ProdottoSchema), types.ts, index.ts
├── components/prodotti-list/ # capsula: View/schema/types/index
└── data/pages/prodotti.json  # pagina + (opz.) prodotti/[slug].json con page.collection
```

## Code Style

```ts
// @olonjs/sources — contract
export interface CollectionSourceContext {
  source: string;
  params: Record<string, string>;     // route params della pagina richiesta
  signal?: AbortSignal;
}
export interface CollectionSource<T = unknown> {
  shape: SchemaLike;                              // record schema: chiave === item.id
  resolve(ctx: CollectionSourceContext): Promise<Record<string, T>>;
  readOnly?: boolean;                             // default true per le sorgenti (non persistite)
}

// provider d'esempio (tenant)
export const catalogo = withCache(
  defineCollectionSource({
    shape: z.record(z.string(), ProdottoSchema),
    resolve: async ({ params, signal }) => fakeCatalog.fetchAll(params, { signal }),
  }),
  { ttlMs: 60_000, swrMs: 300_000 },
);

// integrazione (loader, zero core change)
const needed = collectCollectionSources(page);
const { collections, collectionSchemas, provenance } = await resolveCollectionSources({
  sources: collectionSources, needed, params,
});
```

Convenzioni: named export, nessun default; `SourceError` con `{ code, source, retryable, cause? }` — mai throw raw dal package; errori dev con messaggio azionabile.

## Testing Strategy

- **Unit nel package** (Vitest, ermetici): `resolveCollectionSources` risolve solo le sorgenti richieste, valida con `shape.parse`, emette provenance; abort propagato; fallimenti → `SourceError` tipizzati. Un test per decoratore con **fake clock** (cache hit/miss/SWR, retry+backoff, timeout, fallback su stale, breaker). **Zero rete.**
- **Conformance suite** `runSourceConformance(source)` in `src/testing`: abort, chiave===id, errori tipizzati, parse, eventi attesi. Ogni provider (incluso l'esempio) la esegue.
- **Demo e2e** in `apps/next`: `/prodotti` renderizza gli item; `/prodotti.json` li espone; `/schemas/collections/catalogo.schema.json` e `/mcp-manifests/prodotti.json` riflettono la stessa shape.
- **Non-regressione core**: `git diff packages/core` = 0.

## Boundaries

- **Always:** il core resta intatto; la View non fetcha (risoluzione nel loader); una sola `shape` per sorgente (validazione + contratti); test unit ermetici.
- **Ask first:** aggiungere `@olonjs/sources` al grafo di release/pubblicazione npm; toccare l'API pubblica di core; cambiare il formato dei contratti collection.
- **Never:** policy (cache/retry/timeout) dentro il core; snapshot in repo delle entità proiettate; loggare payload esterni/segreti; fidarsi dei dati esterni (sempre `shape.parse`).

## Success Criteria

1. `packages/sources` builda col gate `typecheck && build`; suite unit verde; `git diff packages/core` = **zero**.
2. `resolveCollectionSources` risolve solo le sorgenti necessarie alla route, valida e restituisce `{ collections, collectionSchemas, provenance }` pronti per `JsonPagesConfig`.
3. I 5 decoratori hanno test dedicati con fake clock, senza rete.
4. `runSourceConformance` passa per il provider d'esempio; è pubblicata per i provider terzi.
5. In `apps/next`, `/prodotti` mostra il catalogo proiettato; contratti/manifest derivano dalla stessa shape; nessuna modifica a componenti/engine core.
6. Il provider d'esempio è **deterministico e locale** (nessuna rete); `sources/shopify.ts` (opzionale) dimostra lo stesso contratto contro un servizio reale fuori dai test.

## Open Questions

1. **Nome package**: `@olonjs/sources` (leaning) vs `@olonjs/projection`.
2. **Set decoratori v1**: tutti e cinque (leaning) vs minimale (`withCache` + `withFallback`).
3. **Demo dynamic route** `/prodotti/[slug]` con `page.collection` in v1 (leaning: sì — prova il binding dinamico) o dopo.
4. **Punto di aggancio nel tenant**: loader dedicato `src/lib/loaders/loadVisitorPageBundle` (leaning) vs direttamente in `app/[[...slug]]/page.tsx`.
