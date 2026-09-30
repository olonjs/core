import { describe, expect, it, vi } from 'vitest';
import type { CollectionSourceContext } from '../contract';
import { withTimeout } from './timeout';

type Doc = Record<string, { id: string }>;
const doc: Doc = { dune: { id: 'dune' } };

function ctx(): CollectionSourceContext {
  return { source: 'catalogo', params: {} };
}

function sourceOf(resolve: () => Promise<Doc>) {
  return { shape: { parse: (i: unknown) => i as Doc }, resolve };
}

describe('withTimeout', () => {
  it('rejects with a timeout SourceError when the source is too slow', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const source = sourceOf(async () => {
      await gate;
      return doc;
    });
    // injected clock: the timeout fires as soon as this promise resolves
    let fireTimeout: () => void = () => undefined;
    const timeoutSignal = new Promise<void>((r) => {
      fireTimeout = r;
    });
    const timed = withTimeout(source, { ms: 100, sleep: () => timeoutSignal });

    const pending = timed.resolve(ctx());
    fireTimeout();

    await expect(pending).rejects.toMatchObject({ code: 'timeout', retryable: true });
    release();
  });

  it('returns the document when the source resolves first', async () => {
    const source = sourceOf(async () => doc);
    const never = new Promise<void>(() => undefined);
    const timed = withTimeout(source, { ms: 100, sleep: () => never });

    await expect(timed.resolve(ctx())).resolves.toBe(doc);
  });

  it('aborts the underlying resolve when the outer signal aborts', async () => {
    const controller = new AbortController();
    const observed: Array<AbortSignal | undefined> = [];
    const source = sourceOf(async () => doc);
    const timed = withTimeout(
      {
        ...source,
        resolve: async (c: CollectionSourceContext) => {
          observed.push(c.signal);
          return doc;
        },
      },
      { ms: 100, sleep: () => new Promise<void>(() => undefined) }
    );

    controller.abort();
    await timed.resolve({ ...ctx(), signal: controller.signal });

    expect(observed[0]?.aborted).toBe(true);
  });
});

describe('withTimeout sanity', () => {
  it('clears the timer on success (no pending timers reported)', async () => {
    vi.useFakeTimers();
    const source = sourceOf(async () => doc);
    const timed = withTimeout(source, { ms: 1000 });

    await timed.resolve(ctx());
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
