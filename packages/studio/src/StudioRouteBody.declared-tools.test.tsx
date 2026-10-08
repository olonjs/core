import { describe, expect, it, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PageConfig, SiteConfig, MenuConfig, ThemeConfig } from '@olonjs/core';
import { StudioRouteBody, type StudioRouteBodyProps } from './StudioRouteBody';

const emptyTheme: ThemeConfig = {
  name: 'test',
  tokens: { colors: {}, typography: { fontFamily: {} }, borderRadius: {} },
};

const homePage: PageConfig = {
  id: 'home-page',
  slug: 'home',
  meta: { title: 'Home', description: '' },
  sections: [],
};

const siteConfig: SiteConfig = {
  identity: { title: 'Test' },
  footer: { id: 'footer-1', type: 'footer', data: {} },
};

function buildProps(overrides: Partial<StudioRouteBodyProps> = {}): StudioRouteBodyProps {
  return {
    pageRegistry: { home: homePage },
    schemas: {},
    siteConfig,
    menuConfig: {} as MenuConfig,
    themeConfig: emptyTheme,
    addSectionConfig: {},
    addableSectionTypes: [],
    ...overrides,
  };
}

function modelContextProtocol() {
  return (document as unknown as { modelContextProtocol?: {
    listTools: () => Array<{ name: string }>;
    executeTool: (name: string, inputArgsJson: string) => Promise<string>;
  } }).modelContextProtocol!;
}

afterEach(() => {
  const doc = document as unknown as { modelContext?: unknown; modelContextProtocol?: unknown };
  delete doc.modelContext;
  delete doc.modelContextProtocol;
  const win = window as unknown as { __olonWebMcpTools__?: unknown; __olonWebMcpControllers__?: unknown };
  delete win.__olonWebMcpTools__;
  delete win.__olonWebMcpControllers__;
});

describe('StudioRouteBody — declared tool registration', () => {
  it('registers declared admin tools alongside the built-ins and executes them', async () => {
    const executor = async (args: unknown) => ({ ok: true, args });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <StudioRouteBody
          {...buildProps({
            webMcp: {
              enabled: true,
              tools: [
                { name: 'sync-catalog', description: 'Sync the catalog', surface: 'admin' as const },
                { name: 'search-product', description: 'Search', surface: 'public' as const },
              ],
              toolExecutors: { 'sync-catalog': executor },
            },
          })}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const names = modelContextProtocol().listTools().map((t) => t.name);
      expect(names).toContain('update-section');
      expect(names).toContain('save');
      expect(names).toContain('sync-catalog');
    });

    // public-surface tools must NOT be registered in the admin surface
    expect(modelContextProtocol().listTools().map((t) => t.name)).not.toContain('search-product');

    const result = await modelContextProtocol().executeTool('sync-catalog', '{"a":1}');
    expect(JSON.parse(result)).toEqual({ ok: true, args: { a: 1 } });

    unmount();

    await waitFor(() => {
      expect(modelContextProtocol().listTools().map((t) => t.name)).not.toContain('sync-catalog');
    });
  });

  it('throws on unknown tool names (existing behaviour preserved)', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <StudioRouteBody {...buildProps({ webMcp: { enabled: true } })} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(modelContextProtocol().listTools().length).toBeGreaterThan(0);
    });

    await expect(modelContextProtocol().executeTool('nope', '{}')).rejects.toThrow(/nope/);
  });
});
