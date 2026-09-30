import { describe, expect, it, vi } from 'vitest';
import { assertCollectionRecordKeys } from '@olonjs/core';
import { SourceError, defineCollectionSource, type CollectionSource } from './contract';
import { resolveCollectionSources } from './resolve';

type Item = { id: string; title: string };
type Doc = Record<string, Item>;

function shape() {
  return {
    parse: (input: unknown): Doc => {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new Error('expected a keyed document');
      }
      const record = input as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        const item = value as Partial<Item> | null;
        if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
          throw new Error(`invalid item at "${key}"`);
        }
      }
      return record as Doc;
    },
  };
}

function sourceOf(document: Doc | (() => Promise<Doc>), readOnly?: boolean): CollectionSource<Doc> {
  const resolve = typeof document === 'function' ? document : async () => document;
  return defineCollectionSource({ shape: shape(), resolve, readOnly } as CollectionSource<Doc>);
}

const validDoc: Doc = { dune: { id: 'dune', title: 'Dune' } };

describe('resolveCollectionSources', () => {
  it('resolves only the needed sources and returns collections + schemas', async () => {
    const catalogo = sourceOf(validDoc);
    const recensioni = sourceOf(validDoc);
    const catalogoSpy = vi.spyOn(catalogo, 'resolve');

    const result = await resolveCollectionSources({
      sources: { catalogo, recensioni },
      needed: ['catalogo'],
    });

    expect(catalogoSpy).toHaveBeenCalledTimes(1);
    expect(result.collections.catalogo).toEqual(validDoc);
    expect(result.collectionSchemas.catalogo).toBe(catalogo.shape);
    expect(result.collections.recensioni).toBeUndefined();
  });

  it('passes source + params to the resolver for the current route', async () => {
    const resolve = vi.fn(async () => validDoc);
    const catalogo = defineCollectionSource({ shape: shape(), resolve });

    await resolveCollectionSources({
      sources: { catalogo },
      needed: ['catalogo'],
      params: { slug: 'dune' },
    });

    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'catalogo', params: { slug: 'dune' } }),
    );
  });

  it('throws a typed missing-source error when a needed source is not registered', async () => {
    await expect(
      resolveCollectionSources({ sources: {}, needed: ['catalogo'] }),
    ).rejects.toMatchObject({ name: 'SourceError', code: 'missing-source', source: 'catalogo' });
  });

  it('wraps a resolver failure into a retryable resolve-failed SourceError', async () => {
    const catalogo = sourceOf(async () => {
      throw new Error('ECONNRESET');
    });

    await expect(
      resolveCollectionSources({ sources: { catalogo }, needed: ['catalogo'] }),
    ).rejects.toMatchObject({ code: 'resolve-failed', retryable: true });
  });

  it('rejects an invalid document as an invalid-document SourceError', async () => {
    const catalogo = sourceOf({
      dune: { id: 'dune', title: 42 as unknown as string },
    });

    await expect(
      resolveCollectionSources({ sources: { catalogo }, needed: ['catalogo'] }),
    ).rejects.toMatchObject({ code: 'invalid-document', retryable: false });
  });

  it('enforces the key === item.id invariant via the core assert helper', async () => {
    expect(() => assertCollectionRecordKeys('catalogo', { dune: { id: 'other' } })).toThrow();

    const catalogo = sourceOf({ dune: { id: 'other', title: 'Dune' } });

    await expect(
      resolveCollectionSources({ sources: { catalogo }, needed: ['catalogo'] }),
    ).rejects.toMatchObject({ code: 'invalid-document', source: 'catalogo' });
  });

  it('maps an aborted signal to an aborted SourceError', async () => {
    const controller = new AbortController();
    const catalogo = sourceOf(async () => {
      controller.abort();
      throw new Error('The operation was aborted');
    });

    await expect(
      resolveCollectionSources({
        sources: { catalogo },
        needed: ['catalogo'],
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'aborted', retryable: false });
  });

  it('records provenance with an injectable clock and readOnly default', async () => {
    const catalogo = sourceOf(validDoc);
    const result = await resolveCollectionSources({
      sources: { catalogo },
      needed: ['catalogo'],
      now: () => Date.parse('2026-09-29T10:00:00.000Z'),
    });

    expect(result.provenance.catalogo).toEqual({
      fetchedAt: '2026-09-29T10:00:00.000Z',
      readOnly: true,
    });
  });

  it('emits start/end events with duration for observability', async () => {
    const events: Array<{ op: string; phase: string; durationMs?: number }> = [];
    const catalogo = sourceOf(validDoc);

    await resolveCollectionSources({
      sources: { catalogo },
      needed: ['catalogo'],
      now: (() => {
        let t = 1000;
        return () => (t += 5);
      })(),
      onEvent: (event) => events.push({ op: event.op, phase: event.phase, durationMs: event.durationMs }),
    });

    expect(events[0]).toMatchObject({ op: 'resolve', phase: 'start' });
    expect(events[1]).toMatchObject({ op: 'resolve', phase: 'end' });
    expect(typeof events[1]?.durationMs).toBe('number');
  });

  it('passes through a SourceError thrown by the source unchanged', async () => {
    const thrown = new SourceError({ code: 'timeout', source: 'catalogo' });
    const catalogo = sourceOf(async () => {
      throw thrown;
    });

    await expect(
      resolveCollectionSources({ sources: { catalogo }, needed: ['catalogo'] }),
    ).rejects.toBe(thrown);
  });
});
