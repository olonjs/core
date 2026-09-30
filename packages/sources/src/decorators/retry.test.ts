import { describe, expect, it, vi } from 'vitest';
import { SourceError, type CollectionSourceContext } from '../contract';
import { withRetry } from './retry';

type Doc = Record<string, { id: string }>;
const doc: Doc = { dune: { id: 'dune' } };

function ctx(): CollectionSourceContext {
  return { source: 'catalogo', params: {} };
}

function sourceOf(resolve: () => Promise<Doc>) {
  return { shape: { parse: (i: unknown) => i as Doc }, resolve };
}

describe('withRetry', () => {
  it('retries retryable failures with exponential backoff', async () => {
    let calls = 0;
    const delays: number[] = [];
    const source = sourceOf(async () => {
      calls += 1;
      if (calls < 3) throw new SourceError({ code: 'resolve-failed', source: 'catalogo' });
      return doc;
    });
    const retried = withRetry(source, {
      attempts: 3,
      backoffMs: 10,
      jitter: 0,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });

    await expect(retried.resolve(ctx())).resolves.toBe(doc);
    expect(calls).toBe(3);
    expect(delays).toEqual([10, 20]);
  });

  it('does not retry a non-retryable SourceError', async () => {
    const resolve = vi.fn(async () => {
      throw new SourceError({ code: 'invalid-document', source: 'catalogo' });
    });
    const retried = withRetry(sourceOf(resolve), { attempts: 3, sleep: async () => undefined });

    await expect(retried.resolve(ctx())).rejects.toMatchObject({ code: 'invalid-document' });
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('retries raw (non-SourceError) failures', async () => {
    let calls = 0;
    const source = sourceOf(async () => {
      calls += 1;
      if (calls < 2) throw new Error('ECONNRESET');
      return doc;
    });
    const retried = withRetry(source, { attempts: 2, backoffMs: 1, jitter: 0, sleep: async () => undefined });

    await expect(retried.resolve(ctx())).resolves.toBe(doc);
    expect(calls).toBe(2);
  });

  it('throws the last error once attempts are exhausted', async () => {
    const last = new SourceError({ code: 'resolve-failed', source: 'catalogo' });
    const resolve = vi.fn(async () => {
      throw last;
    });
    const retried = withRetry(sourceOf(resolve), { attempts: 2, backoffMs: 1, jitter: 0, sleep: async () => undefined });

    await expect(retried.resolve(ctx())).rejects.toBe(last);
    expect(resolve).toHaveBeenCalledTimes(2);
  });
});
