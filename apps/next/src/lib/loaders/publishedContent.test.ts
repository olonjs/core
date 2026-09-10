import { describe, expect, it } from 'vitest';
import type { PublicPageContentBundle } from '@olonjs/next/server';
import { resolvePublicCollectionDocument, resolvePublicConfigDocument } from './publishedContent';

const bundle = {
  pages: {},
  siteConfig: { identity: { title: 'S' } },
  themeConfig: { name: 'default', tokens: {} },
  menuConfig: { main: { items: [] } },
  collections: { libri: { dune: { id: 'dune', title: 'Dune' } } },
} as unknown as PublicPageContentBundle;

describe('resolvePublicCollectionDocument', () => {
  it('serves /collections/{source}/{source}.json from the runtime bundle', () => {
    expect(resolvePublicCollectionDocument(bundle, 'libri', 'libri.json')).toEqual(bundle.collections!.libri);
    expect(resolvePublicCollectionDocument(bundle, 'libri', 'libri')).toEqual(bundle.collections!.libri);
  });

  it('rejects unknown sources and file names that do not match the source', () => {
    expect(resolvePublicCollectionDocument(bundle, 'nope', 'nope.json')).toBeNull();
    expect(resolvePublicCollectionDocument(bundle, 'libri', 'autori.json')).toBeNull();
    expect(resolvePublicCollectionDocument({ ...bundle, collections: undefined }, 'libri', 'libri.json')).toBeNull();
  });
});

describe('resolvePublicConfigDocument', () => {
  it('serves /config/{site|menu|theme}.json from the runtime bundle', () => {
    expect(resolvePublicConfigDocument(bundle, 'site.json')).toBe(bundle.siteConfig);
    expect(resolvePublicConfigDocument(bundle, 'menu')).toBe(bundle.menuConfig);
    expect(resolvePublicConfigDocument(bundle, 'theme.json')).toBe(bundle.themeConfig);
  });

  it('rejects anything outside the JSP config allowlist', () => {
    expect(resolvePublicConfigDocument(bundle, 'secrets.json')).toBeNull();
    expect(resolvePublicConfigDocument(bundle, '../site.json')).toBeNull();
  });
});
