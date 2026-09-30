import { describe, expect, it, vi } from 'vitest';
import type { CollectionSourceContext } from '../contract';
import { withCache, type CacheStore } from './cache';

type Doc = Record<string, { id: string; title: string }>;

const doc: Doc = { dune: { id: 'dune', title: 'Dune' } };

function fakeSource() {
  const resolve = vi.fn(async (_ctx: CollectionSourceContext) => doc);
  return {
    shape: { parse: (input: unknown) => input as Doc },
    resolve,
  };
}

function ctx(params: Record<string, string> = {}, onEvent?: (e: unknown) => void) {
  return { source: 'catalogo', params, onEvent } as CollectionSourceContext;
}

describe('withCache', () => {
  it('fetches on a miss, serves from cache on a hit', async () => {
    const source = fakeSource();
    let t = 0;
    const cached = withCache(source, { ttlMs: 100, now: () => t });
    const events: Array<{ op: string; cache?: string }> = [];

    await cached.resolve(ctx({}, (e) => events.push(e as never)));
    t = 50;
    const second = await cached.resolve(ctx({}, (e) => events.push(e as never)));

    expect(source.resolve).toHaveBeenCalledTimes(1);
    expect(second).toBe(doc);
    expect(events).toEqual([
      { source: 'catalogo', op: 'cache', phase: 'end', cache: 'miss' },
      { source: 'catalogo', op: 'cache', phase: 'end', cache: 'hit' },
    ]);
  });

  it('refetches after the ttl expires', async () => {
    const source = fakeSource();
    let t = 0;
    const cached = withCache(source, { ttlMs: 100, now: () => t });

    await cached.resolve(ctx());
    t = 150;
    await cached.resolve(ctx());

    expect(source.resolve).toHaveBeenCalledTimes(2);
  });

  it('serves stale within the swr window and refreshes in the background', async () => {
    const source = fakeSource();
    let t = 0;
    const cached = withCache(source, { ttlMs: 100, swrMs: 1000, now: () => t });
    const events: Array<{ cache?: string }> = [];

    await cached.resolve(ctx());
    t = 150;
    const stale = await cached.resolve(ctx({}, (e) => events.push(e as never)));

    expect(stale).toBe(doc);
    expect(events.some((e) => e.cache === 'stale')).toBe(true);
    await vi.waitFor(() => expect(source.resolve).toHaveBeenCalledTimes(2));
  });

  it('deduplicates concurrent resolves for the same key (single-flight)', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const resolve = vi.fn(async () => {
      await gate;
      return doc;
    });
    const cached = withCache({ shape: { parse: (i: unknown) => i as Doc }, resolve }, { ttlMs: 100 });

    const pending = Promise.all([cached.resolve(ctx()), cached.resolve(ctx())]);
    release();
    const [a, b] = await pending;

    expect(a).toBe(b);
    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it('keys the cache by route params', async () => {
    const source = fakeSource();
    const cached = withCache(source, { ttlMs: 100 });

    await cached.resolve(ctx({ slug: 'dune' }));
    await cached.resolve(ctx({ slug: '1984' }));

    expect(source.resolve).toHaveBeenCalledTimes(2);
  });

  it('uses a pluggable store', async () => {
    const source = fakeSource();
    const sets: string[] = [];
    const store: CacheStore = {
      get: () => undefined,
      set: (key) => {
        sets.push(key);
      },
    };
    const cached = withCache(source, { ttlMs: 100, store });

    await cached.resolve(ctx({ slug: 'dune' }));

    expect(sets).toEqual(['catalogo?slug=dune']);
  });
});
