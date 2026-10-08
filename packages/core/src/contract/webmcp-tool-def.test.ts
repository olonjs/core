import { describe, expect, it } from 'vitest';
import type { WebMcpConfig, WebMcpToolDef } from './types-engine';

const exampleTool: WebMcpToolDef = {
  name: 'search-product',
  description: 'Search the catalog',
  surface: 'public',
  inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
  annotations: { readOnlyHint: true },
};

describe('WebMcpToolDef (contract)', () => {
  it('is accepted as an element of WebMcpConfig.tools', () => {
    const config: WebMcpConfig = {
      enabled: true,
      namespace: 'https://example.com',
      tools: [exampleTool],
    };
    expect(config.tools).toHaveLength(1);
    expect(config.tools?.[0].name).toBe('search-product');
  });

  it('declares both surfaces', () => {
    const admin: WebMcpToolDef = { name: 'sync-catalog', description: 'd', surface: 'admin' };
    const pub: WebMcpToolDef = { name: 'search-product', description: 'd', surface: 'public' };
    expect(admin.surface).toBe('admin');
    expect(pub.surface).toBe('public');
  });
});
