import { describe, expect, it } from 'vitest';
import type { PageConfig } from '@olonjs/core';
import { collectCollectionSources } from './collect';

function page(partial: Partial<PageConfig>): PageConfig {
  return {
    id: 'p1',
    slug: 'prodotti',
    meta: { title: 'Prodotti', description: '' },
    sections: [],
    ...partial,
  } as PageConfig;
}

describe('collectCollectionSources', () => {
  it('collects the page-level collection binding source', () => {
    const sources = collectCollectionSources(
      page({ collection: { source: 'catalogo', paramKey: 'slug' } })
    );
    expect(sources).toEqual(['catalogo']);
  });

  it('collects sources from $ref values nested inside a record field', () => {
    const sources = collectCollectionSources(
      page({
        sections: [
          {
            id: 'prodotti-list-1',
            type: 'prodotti-list',
            data: {
              items: {
                dune: { $ref: '../collections/catalogo/catalogo.json#/dune' },
                '1984': { $ref: '../collections/catalogo/catalogo.json#/1984' },
              },
            },
          } as PageConfig['sections'][number],
        ],
      })
    );
    expect(sources).toEqual(['catalogo']);
  });

  it('collects a top-level $ref field (item binding)', () => {
    const sources = collectCollectionSources(
      page({
        sections: [
          {
            id: 'prodotto-detail-1',
            type: 'prodotto-detail',
            data: { item: { $ref: '../collections/catalogo/catalogo.json#/dune' } },
          } as PageConfig['sections'][number],
        ],
      })
    );
    expect(sources).toEqual(['catalogo']);
  });

  it('deduplicates and sorts multiple sources deterministically', () => {
    const sources = collectCollectionSources(
      page({
        collection: { source: 'zeta', paramKey: 'slug' },
        sections: [
          {
            id: 's1',
            type: 'x',
            data: { a: { $ref: '../collections/alpha/alpha.json#/1' } },
          } as PageConfig['sections'][number],
          {
            id: 's2',
            type: 'y',
            data: { b: { $ref: '../collections/zeta/zeta.json#/2' } },
          } as PageConfig['sections'][number],
        ],
      })
    );
    expect(sources).toEqual(['alpha', 'zeta']);
  });

  it('returns an empty list when nothing references a collection', () => {
    const sources = collectCollectionSources(
      page({
        sections: [
          { id: 'hero-1', type: 'hero', data: { title: 'Hi' } } as PageConfig['sections'][number],
        ],
      })
    );
    expect(sources).toEqual([]);
  });
});
