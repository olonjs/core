import { describe, expect, it } from 'vitest';
import { SourceError, defineCollectionSource } from './contract';

describe('SourceError', () => {
  it('defaults retryable from the error code', () => {
    expect(new SourceError({ code: 'timeout', source: 'catalogo' }).retryable).toBe(true);
    expect(new SourceError({ code: 'resolve-failed', source: 'catalogo' }).retryable).toBe(true);
    expect(new SourceError({ code: 'invalid-document', source: 'catalogo' }).retryable).toBe(false);
    expect(new SourceError({ code: 'aborted', source: 'catalogo' }).retryable).toBe(false);
    expect(new SourceError({ code: 'missing-source', source: 'catalogo' }).retryable).toBe(false);
  });

  it('carries source, code, cause and a descriptive default message', () => {
    const cause = new Error('ECONNRESET');
    const error = new SourceError({ code: 'resolve-failed', source: 'catalogo', cause });

    expect(error.name).toBe('SourceError');
    expect(error.source).toBe('catalogo');
    expect(error.code).toBe('resolve-failed');
    expect(error.cause).toBe(cause);
    expect(error.message).toContain('catalogo');
    expect(error.message).toContain('resolve-failed');
  });

  it('honours an explicit retryable override', () => {
    expect(
      new SourceError({ code: 'resolve-failed', source: 'x', retryable: false }).retryable,
    ).toBe(false);
    expect(
      new SourceError({ code: 'aborted', source: 'x', retryable: true }).retryable,
    ).toBe(true);
  });
});

describe('defineCollectionSource', () => {
  it('returns the source unchanged so the shape drives type inference', () => {
    const shape = {
      parse: (input: unknown) => input as Record<string, { id: string }>,
    };
    const resolve = async () => ({});
    const source = defineCollectionSource({ shape, resolve });

    expect(source.shape).toBe(shape);
    expect(source.resolve).toBe(resolve);
  });
});
