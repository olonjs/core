import assert from 'node:assert/strict';
import type {
  CollectionDocument,
  CollectionSource,
  CollectionSourceContext,
  SourceShape,
} from '../contract';

/**
 * Provider conformance suite.
 *
 * Every provider (including third-party packages) should run this in its own
 * test suite. Dependency-free (`node:assert`) so it works under any runner.
 * Throws with a descriptive message on the first violated contract clause.
 */
export interface SourceConformanceOptions {
  /** Params to resolve with (default: none). */
  params?: Record<string, string>;
}

export async function runSourceConformance<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: SourceConformanceOptions = {}
): Promise<void> {
  const name = source.shape ? 'source' : 'source';
  const ctx: CollectionSourceContext = { source: name, params: options.params ?? {} };

  assert.equal(typeof source.resolve, 'function', 'source.resolve must be a function');
  assert.equal(typeof source.shape?.parse, 'function', 'source.shape.parse must be a function');
  if (source.readOnly !== undefined) {
    assert.equal(typeof source.readOnly, 'boolean', 'source.readOnly must be a boolean when set');
  }

  const document = await source.resolve(ctx);

  assert.ok(
    document !== null && typeof document === 'object' && !Array.isArray(document),
    'resolve() must return a keyed record (not null/array)'
  );

  for (const [key, item] of Object.entries(document)) {
    assert.ok(item !== null && typeof item === 'object', `item at "${key}" must be an object`);
    assert.equal(
      (item as { id?: unknown }).id,
      key,
      `record key "${key}" must equal item.id (OlonJS collection invariant)`
    );
  }

  // shape.parse must accept its own resolved document (round-trip).
  const reparsed = source.shape.parse(document);
  assert.deepEqual(
    reparsed,
    document,
    'shape.parse must accept the resolved document unchanged'
  );
}

/** Wraps a document or resolver into a minimal conformant source for tests. */
export function createTestSource<TDocument extends CollectionDocument>(input: {
  document?: TDocument;
  resolve?: (ctx: CollectionSourceContext) => Promise<TDocument>;
  shape?: SourceShape<TDocument>;
  readOnly?: boolean;
  name?: string;
}): CollectionSource<TDocument> {
  const shape: SourceShape<TDocument> =
    input.shape ?? { parse: (value: unknown) => value as TDocument };

  const resolve =
    input.resolve ??
    (async () => {
      if (input.document === undefined) {
        throw new Error('createTestSource: provide `document` or `resolve`');
      }
      return input.document;
    });

  return { shape, resolve, readOnly: input.readOnly };
}

export interface FakeClock {
  now: () => number;
  advance: (ms: number) => void;
  set: (ms: number) => void;
}

/** Deterministic clock for decorator tests (no real timers). */
export function createFakeClock(start = 0): FakeClock {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
    set: (ms: number) => {
      current = ms;
    },
  };
}
