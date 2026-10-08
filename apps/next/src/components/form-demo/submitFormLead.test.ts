import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLOUD_URL = 'https://cloud.example.com';
const API_KEY = 'secret-key';

async function loadSubmitFormLead() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_OLONJS_CLOUD_URL', CLOUD_URL);
  vi.stubEnv('NEXT_PUBLIC_OLONJS_API_KEY', API_KEY);
  return await import('./submitFormLead');
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetchOk() {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  return fetchMock;
}

describe('submitFormLead', () => {
  it('POSTs to {cloudUrl}/form/send with parity headers and full payload', async () => {
    const { submitFormLead } = await loadSubmitFormLead();
    const fetchMock = mockFetchOk();

    const ctx = {
      recipientEmail: 'lead@example.com',
      sectionId: 'form-demo-1',
      pageSlug: 'contatti',
    };
    const args = { name: 'Ada', email: 'ada@example.com', message: 'Ciao' };

    await expect(submitFormLead(args, ctx)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CLOUD_URL}/form/send`);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${API_KEY}`);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Idempotency-Key']).toMatch(/^form-form-demo-1-\d+$/);
    const payload = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(payload).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Ciao',
      recipientEmail: 'lead@example.com',
      page: 'contatti',
      section: 'form-demo-1',
      source: 'olon-webmcp',
    });
    expect(typeof payload.submittedAt).toBe('string');
  });

  it('uses the dev-declared path, normalizing slashes', async () => {
    const { submitFormLead } = await loadSubmitFormLead();
    const fetchMock = mockFetchOk();

    await submitFormLead(
      { name: 'A', email: 'a@b.c', message: 'm' },
      { recipientEmail: '', sectionId: 's1', pageSlug: 'x', path: '/lead/submit/' },
    );

    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(`${CLOUD_URL}/lead/submit`);
  });

  it('throws a readable error on a non-ok response', async () => {
    const { submitFormLead } = await loadSubmitFormLead();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad gateway' }), { status: 502 }),
    );

    await expect(
      submitFormLead(
        { name: 'A', email: 'a@b.c', message: 'm' },
        { recipientEmail: '', sectionId: 's1', pageSlug: 'x' },
      ),
    ).rejects.toThrow(/bad gateway/);
  });

  it('throws an explicit error when the cloud env is not configured', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_OLONJS_CLOUD_URL', '');
    vi.stubEnv('NEXT_PUBLIC_OLONJS_API_KEY', '');
    const { submitFormLead } = await import('./submitFormLead');

    await expect(
      submitFormLead(
        { name: 'A', email: 'a@b.c', message: 'm' },
        { recipientEmail: '', sectionId: 's1', pageSlug: 'x' },
      ),
    ).rejects.toThrow(/Cloud env not configured/);
  });
});
