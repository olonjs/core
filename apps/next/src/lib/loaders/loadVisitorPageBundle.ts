import type { JsonPagesConfig, PageConfig } from '@olonjs/core';
import { collectCollectionSources, resolveCollectionSources } from '@olonjs/sources';
import { CollectionRegistry } from '@/lib/CollectionRegistry';
import { collectionSources } from '@/sources';
import { getFileCollections } from './getFileCollections';

export interface VisitorPageBundle {
  collections: NonNullable<JsonPagesConfig['collections']>;
  collectionSchemas: JsonPagesConfig['collectionSchemas'];
  /** Provenance of the projected sources resolved for this route. */
  sourceProvenance: Record<string, { fetchedAt: string; readOnly: boolean }>;
}

/**
 * Load the per-route content bundle: file-backed collections plus the external
 * sources this page needs (projected, validated, read-only).
 *
 * Sources are resolved ONLY when referenced by the page (ADR-0018 / spec
 * external-collection-sources). Source names not registered as external
 * sources are file-backed and skipped here.
 */
export async function loadVisitorPageBundle(input: {
  page: PageConfig;
  params: Record<string, string>;
  appRoot?: string;
}): Promise<VisitorPageBundle> {
  const fileCollections = getFileCollections(input.appRoot) as NonNullable<
    JsonPagesConfig['collections']
  >;

  const needed = collectCollectionSources(input.page).filter(
    (name) => name in collectionSources
  );

  const resolved = await resolveCollectionSources({
    sources: collectionSources as never,
    needed,
    params: input.params,
  });

  return {
    collections: {
      ...fileCollections,
      ...(resolved.collections as NonNullable<JsonPagesConfig['collections']>),
    },
    collectionSchemas: {
      ...(CollectionRegistry as JsonPagesConfig['collectionSchemas']),
      ...(resolved.collectionSchemas as JsonPagesConfig['collectionSchemas']),
    },
    sourceProvenance: resolved.provenance,
  };
}
