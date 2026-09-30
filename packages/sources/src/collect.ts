import type { PageConfig } from '@olonjs/core';

/**
 * Discover which collection sources a page needs.
 *
 * Sources are referenced two ways, both part of the existing OlonJS contract:
 *   1. page-level dynamic binding: `page.collection = { source, paramKey }`
 *   2. `$ref` pointers to a collection document, anywhere in section data:
 *      `../collections/<source>/<source>.json#/<id>`
 *
 * The `$ref` shape mirrors the core resolver's convention (core does not export
 * a deep-discovery helper, only the top-level `getCollectionRefBindings`). Kept
 * intentionally small and in sync with `@olonjs/core`'s collection-ref parsing;
 * swap for a core helper if one is exported later (see ADR-0018 follow-ups).
 */
const COLLECTION_REF_PATTERN = /(?:^|\/)collections\/([^/]+)\/\1\.json(?:#|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walkForRefs(value: unknown, found: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) walkForRefs(item, found);
    return;
  }
  if (!isRecord(value)) return;

  const ref = value.$ref;
  if (typeof ref === 'string') {
    const match = ref.trim().match(COLLECTION_REF_PATTERN);
    if (match?.[1]) found.add(match[1]);
  }

  for (const item of Object.values(value)) walkForRefs(item, found);
}

export function collectCollectionSources(page: PageConfig): string[] {
  const found = new Set<string>();

  const bound = page.collection?.source;
  if (typeof bound === 'string' && bound.trim()) found.add(bound.trim());

  for (const section of page.sections ?? []) {
    if (isRecord(section)) walkForRefs(section.data, found);
  }

  return Array.from(found).sort();
}
