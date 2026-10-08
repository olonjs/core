// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WebMcpVisitorRuntime } from '@/components/webmcp/WebMcpVisitorRuntime';
import { visitorToolDefs } from '@/lib/webmcp/visitorToolDefs';

function protocol() {
  return (document as unknown as {
    modelContextProtocol: {
      listTools: () => Array<{ name: string }>;
      executeTool: (name: string, inputArgsJson: string) => Promise<string>;
    };
  }).modelContextProtocol;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(() => {
  delete visitorToolDefs['test-tool'];
  if (root) {
    act(() => root!.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  const doc = document as unknown as { modelContext?: unknown; modelContextProtocol?: unknown };
  delete doc.modelContext;
  delete doc.modelContextProtocol;
  const win = window as unknown as { __olonWebMcpTools__?: unknown; __olonWebMcpControllers__?: unknown };
  delete win.__olonWebMcpTools__;
  delete win.__olonWebMcpControllers__;
  vi.restoreAllMocks();
});

function mount(toolNames: string[]) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(createElement(WebMcpVisitorRuntime, { toolNames }));
  });
}

describe('WebMcpVisitorRuntime — public tool registration', () => {
  it('registers the declared tools for the page and executes them', async () => {
    visitorToolDefs['test-tool'] = {
      name: 'test-tool',
      description: 'Test tool',
      surface: 'public',
      inputSchema: { type: 'object', additionalProperties: false, properties: {} },
      execute: async (args: unknown) => ({ ok: true, args }),
    };

    mount(['test-tool', 'unknown-tool']);

    await vi.waitFor(() => {
      expect(protocol().listTools().map((t) => t.name)).toContain('test-tool');
    });

    const result = await protocol().executeTool('test-tool', '{"q":1}');
    expect(JSON.parse(result)).toEqual({ ok: true, args: { q: 1 } });

    act(() => root!.unmount());
    root = null;

    await vi.waitFor(() => {
      expect(protocol().listTools().map((t) => t.name)).not.toContain('test-tool');
    });
  });

  it('does not register anything when the page has no tool names', () => {
    mount([]);
    expect(protocol().listTools()).toEqual([]);
  });
});
