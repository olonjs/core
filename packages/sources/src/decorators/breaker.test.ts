import { describe, expect, it, vi } from 'vitest';
import { SourceError, type CollectionSourceContext } from '../contract';
import { withCircuitBreaker } from './breaker';

type Doc = Record<string, { id: string }>;
const doc: Doc = { dune: { id: 'dune' } };

function ctx(): CollectionSourceContext {
  return { source: 'catalogo', params: {} };
}

describe('withCircuitBreaker', () => {
  it('opens after the failure threshold and fails fast without calling the source', async () => {
    const resolve = vi.fn(async () => {
      throw new SourceError({ code: 'resolve-failed', source: 'catalogo' });
    });
    const source = { shape: { parse: (i: unknown) => i as Doc }, resolve };
    const guarded = withCircuitBreaker(source, { failures: 2, cooldownMs: 1000 });

    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'resolve-failed' });
    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'resolve-failed' });
    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'circuit-open', retryable: false });

    expect(resolve).toHaveBeenCalledTimes(2);
  });

  it('retries after the cooldown (half-open) and closes on success', async () => {
    let calls = 0;
    let t = 0;
    const source = {
      shape: { parse: (i: unknown) => i as Doc },
      resolve: async () => {
        calls += 1;
        if (calls <= 2) throw new SourceError({ code: 'resolve-failed', source: 'catalogo' });
        return doc;
      },
    };
    const guarded = withCircuitBreaker(source, { failures: 2, cooldownMs: 1000, now: () => t });

    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'resolve-failed' });
    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'resolve-failed' });
    await expect(guarded.resolve(ctx())).rejects.toMatchObject({ code: 'circuit-open' });

    t = 1500;
    await expect(guarded.resolve(ctx())).resolves.toBe(doc);

    // closed again: the next call does not fail fast
    await expect(guarded.resolve(ctx())).resolves.toBe(doc);
    expect(calls).toBe(4);
  });
});
