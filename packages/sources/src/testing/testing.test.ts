import { describe, expect, it } from 'vitest';
import { assertCollectionRecordKeys } from '@olonjs/core';
import { withCache } from '../decorators/cache';
import { createFakeClock, createTestSource, runSourceConformance } from './index';

type Doc = Record<string, { id: string; title: string }>;
const doc: Doc = { dune: { id: 'dune', title: 'Dune' } };

describe('createTestSource', () => {
  it('builds a conformant source from a document', async () => {
    const source = createTestSource({ document: doc });
    await expect(runSourceConformance(source)).resolves.toBeUndefined();
  });

  it('builds a source from a resolver', async () => {
    const source = createTestSource({ resolve: async () => doc });
    await expect(source.resolve({ source: 's', params: {} })).resolves.toBe(doc);
  });

  it('throws a descriptive error when neither document nor resolve is provided', async () => {
    const source = createTestSource<Doc>({});
    await expect(source.resolve({ source: 's', params: {} })).rejects.toThrow(/createTestSource/);
  });
});

describe('runSourceConformance', () => {
  it('rejects a document whose record key does not match item.id', async () => {
    const source = createTestSource({ document: { dune: { id: 'other', title: 'Dune' } } });

    await expect(runSourceConformance(source)).rejects.toThrow(/must equal item.id/);
  });

  it('rejects a non-object document', async () => {
    const source = createTestSource({
      resolve: async () => [] as unknown as Doc,
    });

    await expect(runSourceConformance(source)).rejects.toThrow(/keyed record/);
  });

  it('agrees with the core invariant helper', () => {
    expect(() => assertCollectionRecordKeys('s', doc)).not.toThrow();
  });
});

describe('createFakeClock', () => {
  it('advances deterministically and drives a cache ttl', async () => {
    const clock = createFakeClock(1000);
    let calls = 0;
    const source = createTestSource<Doc>({
      resolve: async () => {
        calls += 1;
        return doc;
      },
    });
    const cached = withCache(source, { ttlMs: 100, now: clock.now });

    await cached.resolve({ source: 's', params: {} });
    clock.advance(50);
    await cached.resolve({ source: 's', params: {} });
    clock.advance(100);
    await cached.resolve({ source: 's', params: {} });

    expect(calls).toBe(2);
  });
});
