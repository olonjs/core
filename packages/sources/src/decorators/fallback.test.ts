import { describe, expect, it, vi } from 'vitest';
import { SourceError, type CollectionSourceContext } from '../contract';
import { withFallback } from './fallback';

type Doc = Record<string, { id: string }>;
const doc: Doc = { dune: { id: 'dune' } };

function ctx(events: Array<{ cache?: string }> = []): CollectionSourceContext {
  return { source: 'catalogo', params: {}, onEvent: (e) => events.push(e as never) };
}

function failingSource() {
  return {
    shape: { parse: (i: unknown) => i as Doc },
    resolve: vi.fn(async () => {
      throw new SourceError({ code: 'resolve-failed', source: 'catalogo' });
    }),
  };
}

describe('withFallback', () => {
  it('serves the stale document when the source fails', async () => {
    const events: Array<{ cache?: string }> = [];
    const guarded = withFallback(failingSource(), { getStale: () => doc });

    await expect(guarded.resolve(ctx(events))).resolves.toBe(doc);
    expect(events.some((e) => e.cache === 'stale')).toBe(true);
  });

  it('rethrows when no stale document is available', async () => {
    const guarded = withFallback(failingSource(), { getStale: () => undefined });

    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'resolve-failed' });
  });

  it('returns the live document when the source succeeds', async () => {
    const fresh: Doc = { '1984': { id: '1984' } };
    const source = { shape: { parse: (i: unknown) => i as Doc }, resolve: async () => fresh };
    const guarded = withFallback(source, { getStale: () => doc });

    await expect(guarded.resolve(ctx())).resolves.toBe(fresh);
  });
});
