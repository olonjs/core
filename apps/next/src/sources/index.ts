import { catalogoSource } from './catalogo';

/**
 * Tenant source registry. Adding a provider is a one-line change here — no
 * changes to @olonjs/core (ADR-0018). Sources not listed here are file-backed
 * collections loaded from src/data/collections.
 */
export const collectionSources = {
  catalogo: catalogoSource,
} as const;

export type CollectionSourceName = keyof typeof collectionSources;
