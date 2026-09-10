import { describe, expect, it } from 'vitest';
import nextConfig, { publicPageJsonRewrites, webmcpRuntimeRewrites } from '../../../../next.config';

describe('next.config rewrites — runtime agentic surface', () => {
  it('maps every public agentic href onto a runtime route handler', () => {
    const bySource = Object.fromEntries(webmcpRuntimeRewrites.map((r) => [r.source, r.destination]));
    expect(bySource['/mcp-manifest.json']).toBe('/api/webmcp/site-manifest');
    expect(bySource['/mcp-manifests/:path*.json']).toBe('/api/webmcp/page-manifest/:path*');
    expect(bySource['/schemas/collections/:source.schema.json']).toBe('/api/webmcp/collection-contract/:source');
    expect(bySource['/schemas/:path*.schema.json']).toBe('/api/webmcp/page-contract/:path*');
    expect(bySource['/llms.txt']).toBe('/api/webmcp/llms');
    expect(bySource['/robots.txt']).toBe('/api/seo/robots');
    expect(bySource['/sitemap.xml']).toBe('/api/seo/sitemap');
  });

  it('places collection contracts before page contracts and all agentic rewrites before /:path*.json', async () => {
    const all = await nextConfig.rewrites!();
    const list = Array.isArray(all) ? all : [...all.beforeFiles, ...all.afterFiles, ...all.fallback];
    const sources = list.map((r) => r.source);

    expect(sources.indexOf('/schemas/collections/:source.schema.json')).toBeLessThan(
      sources.indexOf('/schemas/:path*.schema.json'),
    );
    const catchAll = sources.indexOf('/:path*.json');
    for (const r of webmcpRuntimeRewrites) {
      expect(sources.indexOf(r.source)).toBeLessThan(catchAll);
    }
    expect(sources.slice(-publicPageJsonRewrites.length)).toEqual(publicPageJsonRewrites.map((r) => r.source));
  });
});
