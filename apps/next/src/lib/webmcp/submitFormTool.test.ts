// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLOUD_URL = 'https://cloud.example.com';

async function loadModules() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_OLONJS_CLOUD_URL', CLOUD_URL);
  vi.stubEnv('NEXT_PUBLIC_OLONJS_API_KEY', 'k');
  const [{ sectionPublicTools, declaredPublicTools }, { visitorToolDefs }] = await Promise.all([
    import('@/lib/webmcp/toolRegistry'),
    import('@/lib/webmcp/visitorToolDefs'),
  ]);
  // Same side-effect import the visitor island performs: registers the executor.
  await import('@/lib/webmcp/submitFormTool');
  return { sectionPublicTools, declaredPublicTools, visitorToolDefs };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('submit-form tool wiring', () => {
  it('maps form-demo to submit-form and declares the public tool def', async () => {
    const { sectionPublicTools, declaredPublicTools } = await loadModules();
    expect(sectionPublicTools['form-demo']).toEqual(['submit-form']);

    const def = declaredPublicTools.find((t) => t.name === 'submit-form');
    expect(def).toBeDefined();
    expect(def!.surface).toBe('public');
    expect(def!.inputSchema).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' }, email: { type: 'string' }, message: { type: 'string' } },
    });
  });

  it('registers the executor and submits a valid payload to {cloudUrl}/form/send', async () => {
    const { visitorToolDefs } = await loadModules();
    document.body.innerHTML =
      '<form id="form-demo" data-olon-recipient="lead@example.com"></form>';

    const tool = visitorToolDefs['submit-form'];
    expect(tool).toBeDefined();

    await expect(
      tool.execute({ name: 'Ada', email: 'ada@example.com', message: 'Ciao' }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CLOUD_URL}/form/send`);
    const payload = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(payload).toMatchObject({
      recipientEmail: 'lead@example.com',
      section: 'form-demo',
      source: 'olon-webmcp',
    });
  });

  it('rejects an invalid payload with a Zod validation error before any fetch', async () => {
    const { visitorToolDefs } = await loadModules();
    const tool = visitorToolDefs['submit-form'];

    await expect(tool.execute({ name: '', email: 'not-an-email', message: '' })).rejects.toThrow();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
