import { z } from 'zod';
import { defineCollectionSource, withCache } from '@olonjs/sources';
import { ProdottoSchema, type Prodotto } from '@/collections/prodotti';

/**
 * Demo provider: a DETERMINISTIC, local stand-in for an external catalog
 * service (no network — keeps dev, tests and CI hermetic). The real-world twin
 * would be `src/sources/shopify.ts` implementing the same contract.
 *
 * The `shape` is the single declaration: it validates the projected document
 * and feeds the agent contracts (`/schemas/collections/catalogo.schema.json`).
 */

const CATALOGO_FIXTURE: Record<string, Prodotto> = {
  dune: {
    id: 'dune',
    title: 'Dune — Edizione illustrata',
    price: 2490,
    currency: 'EUR',
    description: 'Arrakis, spezia e politica: il classico di Frank Herbert.',
  },
  '1984': {
    id: '1984',
    title: '1984',
    price: 1490,
    currency: 'EUR',
    description: 'Il Grande Fratello e il controllo del linguaggio.',
  },
  neuromancer: {
    id: 'neuromancer',
    title: 'Neuromancer',
    price: 1890,
    currency: 'EUR',
    description: 'Il romanzo che ha definito il cyberpunk.',
  },
  'il-nome-della-rosa': {
    id: 'il-nome-della-rosa',
    title: 'Il nome della rosa',
    price: 2100,
    currency: 'EUR',
    description: 'Un giallo medievale tra biblioteche e potere.',
  },
};

export interface ExternalCatalogServiceOptions {
  /** Simulated latency in ms (default 0 — deterministic tests). */
  latencyMs?: number;
  /** Force a failure, to exercise fallback/breaker policy. */
  fail?: boolean;
  signal?: AbortSignal;
}

/** Stand-in for the external system of record (Shopify/PIM/…). */
export async function fetchCatalogoFromExternalService(
  options: ExternalCatalogServiceOptions = {}
): Promise<Record<string, Prodotto>> {
  const { latencyMs = 0, fail = false, signal } = options;

  if (latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));
  }
  if (signal?.aborted) throw new Error('The catalog request was aborted');
  if (fail) throw new Error('External catalog service unavailable');

  return JSON.parse(JSON.stringify(CATALOGO_FIXTURE)) as Record<string, Prodotto>;
}

export const catalogoSource = withCache(
  defineCollectionSource({
    shape: z.record(z.string(), ProdottoSchema),
    resolve: async ({ signal }) => fetchCatalogoFromExternalService({ signal }),
    readOnly: true,
  }),
  { ttlMs: 60_000, swrMs: 300_000 }
);
