import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./loadLocalPublicPageBundle', () => ({
  loadLocalPublicPageBundle: vi.fn(() => ({
    pages: { home: { id: 'local', slug: 'home', meta: { title: 'Local' }, sections: [] } },
    siteConfig: { identity: { title: 'L' } },
    themeConfig: {},
    menuConfig: {},
  })),
}));

vi.mock('./loadLivePublicPageBundle', () => ({
  loadLivePublicPageBundle: vi.fn(async () => ({
    pages: { home: { id: 'live', slug: 'home', meta: { title: 'Live' }, sections: [] } },
    siteConfig: { identity: { title: 'V' } },
    themeConfig: {},
    menuConfig: {},
  })),
}));

import { loadLocalPublicPageBundle } from './loadLocalPublicPageBundle';
import { loadLivePublicPageBundle } from './loadLivePublicPageBundle';
import { loadPublicPageBundleForRequest } from './loadPublicPageBundleForRequest';

describe('loadPublicPageBundleForRequest', () => {
  const appRoot = path.resolve(__dirname, '../../..');

  it('selects Local when bootSource is local', async () => {
    const bundle = await loadPublicPageBundleForRequest({
      bootSource: 'local',
      slug: 'home',
      requestUrl: 'http://localhost:3000/home.json',
      appRoot,
    });
    expect(bundle.pages.home?.meta?.title).toBe('Local');
    expect(loadLocalPublicPageBundle).toHaveBeenCalled();
    expect(loadLivePublicPageBundle).not.toHaveBeenCalled();
  });

  it('static (Save2Repo) reads the deployed repo from disk and never self-fetches', async () => {
    const fetchImpl = vi.fn();
    const bundle = await loadPublicPageBundleForRequest({
      bootSource: 'static',
      slug: 'home',
      requestUrl: 'http://localhost:3000/home.json',
      appRoot,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(bundle.pages.home?.meta?.title).toBe('Local');
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(loadLivePublicPageBundle).not.toHaveBeenCalled();
  });

  it('selects Live when bootSource is live', async () => {
    const bundle = await loadPublicPageBundleForRequest({
      bootSource: 'live',
      slug: 'home',
      requestUrl: 'http://localhost:3000/home.json',
      appRoot,
      apiUrl: 'https://api.example',
      apiKey: 'k',
      fetchImpl: vi.fn() as unknown as typeof fetch,
    });
    expect(bundle.pages.home?.meta?.title).toBe('Live');
    expect(loadLivePublicPageBundle).toHaveBeenCalled();
  });
});
