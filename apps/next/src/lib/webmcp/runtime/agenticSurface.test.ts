import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { PublicPageContentBundle } from '@olonjs/next/server';
import type { PageConfig, SiteConfig } from '@olonjs/core';
import {
  buildRobotsTxt,
  buildRuntimeCollectionContract,
  buildRuntimeLlmsTxt,
  buildRuntimePageContract,
  buildRuntimePageManifest,
  buildRuntimeSiteManifest,
  buildSitemapXml,
  expandDynamicPageSlugs,
  stripJsonSuffix,
  stripSchemaJsonSuffix,
} from './agenticSurface';

const BooksListSchema = z.object({
  data: z.object({
    title: z.string(),
    items: z.record(z.string(), z.object({ id: z.string(), title: z.string() })),
  }),
  settings: z.object({}).optional(),
});
const BookDetailSchema = z.object({
  data: z.object({ item: z.object({ id: z.string(), title: z.string() }) }),
  settings: z.object({}).optional(),
});
const LibroSchema = z.object({ id: z.string(), title: z.string() });

const schemas = { 'books-list': BooksListSchema, 'book-detail': BookDetailSchema } as never;
const collectionSchemas = { libri: z.record(z.string(), LibroSchema) } as never;

const pages: Record<string, PageConfig> = {
  home: {
    id: 'home-page',
    slug: 'home',
    meta: { title: 'Libri', description: 'Catalogo' },
    sections: [
      {
        id: 'books-list-1',
        type: 'books-list',
        data: { title: 'Collections', items: { $ref: '../collections/libri/libri.json' } },
      },
    ],
  } as unknown as PageConfig,
  'libri/[slug]': {
    id: 'libro-detail-page',
    slug: 'libri/[slug]',
    meta: { title: 'Dettaglio libro', description: 'Dinamica' },
    sections: [{ id: 'book-detail-1', type: 'book-detail', data: { item: { $ref: 'collection:current' } } }],
    collection: { source: 'libri', paramKey: 'slug' },
  } as unknown as PageConfig,
};

const bundle: PublicPageContentBundle = {
  pages,
  siteConfig: { identity: { title: 'Libri' } } as unknown as SiteConfig,
  themeConfig: { name: 'default', tokens: {} } as never,
  menuConfig: {},
  collections: { libri: { dune: { id: 'dune', title: 'Dune' }, '1984': { id: '1984', title: '1984' } } },
  collectionSchemas,
};

describe('suffix helpers', () => {
  it('strips .json and .schema.json from catch-all segments', () => {
    expect(stripJsonSuffix(['home.json'])).toBe('home');
    expect(stripJsonSuffix(['libri', 'dune.json'])).toBe('libri/dune');
    expect(stripSchemaJsonSuffix(['home.schema.json'])).toBe('home');
    expect(stripSchemaJsonSuffix(['authors', '[authorId]', 'libri.schema.json'])).toBe('authors/[authorId]/libri');
  });
});

describe('expandDynamicPageSlugs', () => {
  it('replaces collection-bound pattern pages with one concrete slug per record', () => {
    const slugs = expandDynamicPageSlugs(pages, bundle.collections);
    expect(slugs).toEqual(['home', 'libri/1984', 'libri/dune']);
  });

  it('keeps the pattern when the collection is missing', () => {
    expect(expandDynamicPageSlugs(pages, {})).toEqual(['home', 'libri/[slug]']);
  });
});

describe('runtime agentic surface', () => {
  it('builds the site manifest index with concrete slugs and collections', () => {
    const manifest = buildRuntimeSiteManifest({ bundle, schemas });
    expect(manifest.kind).toBe('olonjs-mcp-manifest-index');
    expect(manifest.pages.map((p) => p.slug)).toEqual(['home', 'libri/1984', 'libri/dune']);
    expect(manifest.pages[0].manifestHref).toBe('/mcp-manifests/home.json');
    expect(manifest.pages[0].contractHref).toBe('/schemas/home.schema.json');
    expect(manifest.collections?.[0]).toEqual({
      source: 'libri',
      dataHref: '/collections/libri/libri.json',
      contractHref: '/schemas/collections/libri.schema.json',
    });
  });

  it('builds a page manifest for a concrete dynamic slug', () => {
    const manifest = buildRuntimePageManifest({ bundle, schemas, slug: 'libri/dune' });
    expect(manifest?.slug).toBe('libri/dune');
    expect(manifest?.sectionTypes).toEqual(['book-detail']);
    expect(manifest?.tools.map((t) => t.name)).toEqual(['update-section', 'save']);
  });

  it('returns null for unknown slugs', () => {
    expect(buildRuntimePageManifest({ bundle, schemas, slug: 'nope' })).toBeNull();
    expect(buildRuntimePageContract({ bundle, schemas, slug: 'nope' })).toBeNull();
  });

  it('builds a page contract exposing section instances and schemas', () => {
    const contract = buildRuntimePageContract({ bundle, schemas, slug: 'home' });
    expect(contract?.kind).toBe('olonjs-page-contract');
    expect(contract?.sectionInstances.some((s) => s.id === 'books-list-1')).toBe(true);
    expect(contract?.sectionSchemas['books-list']).toBeDefined();
  });

  it('builds a collection contract or null for unknown sources', () => {
    expect(buildRuntimeCollectionContract({ collectionSchemas, source: 'libri' })?.source).toBe('libri');
    expect(buildRuntimeCollectionContract({ collectionSchemas, source: 'nope' })).toBeNull();
  });

  it('builds llms.txt referencing manifests and contracts', () => {
    const txt = buildRuntimeLlmsTxt({ bundle, schemas });
    expect(txt).toContain('/mcp-manifests/home.json');
    expect(txt).toContain('/schemas/home.schema.json');
  });
});

describe('robots + sitemap', () => {
  it('robots allows agent surfaces and points to the sitemap', () => {
    const txt = buildRobotsTxt('https://example.com');
    expect(txt).toContain('User-agent: GPTBot');
    expect(txt).toContain('Allow: /mcp-manifest.json');
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('sitemap lists discovery nodes, human, payload and contract URLs per slug', () => {
    const xml = buildSitemapXml({
      baseUrl: 'https://example.com',
      slugs: ['home', 'libri/dune'],
      now: new Date('2026-09-10T10:00:00.000Z'),
    });
    expect(xml).toContain('<loc>https://example.com/llms.txt</loc>');
    expect(xml).toContain('<loc>https://example.com/mcp-manifest.json</loc>');
    expect(xml).toContain('<loc>https://example.com/</loc>');
    expect(xml).toContain('<loc>https://example.com/home.json</loc>');
    expect(xml).toContain('<loc>https://example.com/schemas/home.schema.json</loc>');
    expect(xml).toContain('<loc>https://example.com/libri/dune</loc>');
    expect(xml).toContain('<lastmod>2026-09-10T10:00:00Z</lastmod>');
  });
});
