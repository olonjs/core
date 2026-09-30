import { assertCollectionRecordKeys } from '@olonjs/core';
import {
  SourceError,
  type CollectionDocument,
  type CollectionSource,
  type SourceEvent,
  type SourceObserver,
  type SourceShape,
} from './contract';

export interface ResolveCollectionSourcesInput {
  /** Registered sources, keyed by source name (tenant config). */
  sources: Record<string, CollectionSource<CollectionDocument>> | undefined;
  /** Source names needed for the current route (see `collectCollectionSources`). */
  needed: string[];
  /** Route params of the page being resolved. */
  params?: Record<string, string>;
  /** Aborted when the render/request is cancelled. */
  signal?: AbortSignal;
  /** Structured observability hook. */
  onEvent?: SourceObserver;
  /** Injectable clock (ms) for deterministic tests. */
  now?: () => number;
}

export interface SourceProvenance {
  fetchedAt: string;
  readOnly: boolean;
  stale?: boolean;
}

export interface ResolveCollectionSourcesResult {
  /** Materialized documents, ready to spread into `JsonPagesConfig.collections`. */
  collections: Record<string, CollectionDocument>;
  /** The declared shapes, ready to spread into `JsonPagesConfig.collectionSchemas`. */
  collectionSchemas: Record<string, SourceShape<CollectionDocument> | unknown>;
  provenance: Record<string, SourceProvenance>;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}

export async function resolveCollectionSources(
  input: ResolveCollectionSourcesInput
): Promise<ResolveCollectionSourcesResult> {
  const { sources, needed, params = {}, signal, onEvent, now = Date.now } = input;

  const collections: Record<string, CollectionDocument> = {};
  const collectionSchemas: ResolveCollectionSourcesResult['collectionSchemas'] = {};
  const provenance: Record<string, SourceProvenance> = {};

  const unique = Array.from(new Set(needed)).sort();
  if (!sources || unique.length === 0) {
    return { collections, collectionSchemas, provenance };
  }

  const emit = (event: SourceEvent) => {
    try {
      onEvent?.(event);
    } catch {
      // Observers must never break resolution.
    }
  };

  await Promise.all(
    unique.map(async (sourceName) => {
      const source = sources[sourceName];
      if (!source) {
        throw new SourceError({ code: 'missing-source', source: sourceName });
      }

      const startedAt = now();
      emit({ source: sourceName, op: 'resolve', phase: 'start' });

      let raw: unknown;
      try {
        raw = await source.resolve({ source: sourceName, params, signal, onEvent });
      } catch (error) {
        const mapped =
          error instanceof SourceError
            ? error
            : new SourceError({
                code: isAbortError(error) || signal?.aborted ? 'aborted' : 'resolve-failed',
                source: sourceName,
                cause: error,
              });
        emit({
          source: sourceName,
          op: 'resolve',
          phase: 'end',
          durationMs: now() - startedAt,
          error: { code: mapped.code, retryable: mapped.retryable },
        });
        throw mapped;
      }

      let document: CollectionDocument;
      try {
        document = source.shape.parse(raw) as CollectionDocument;
        // Core's invariant: every top-level key equals item.id.
        assertCollectionRecordKeys(sourceName, document);
      } catch (error) {
        const mapped = new SourceError({
          code: 'invalid-document',
          source: sourceName,
          cause: error,
        });
        emit({
          source: sourceName,
          op: 'resolve',
          phase: 'end',
          durationMs: now() - startedAt,
          error: { code: mapped.code, retryable: mapped.retryable },
        });
        throw mapped;
      }

      emit({
        source: sourceName,
        op: 'resolve',
        phase: 'end',
        durationMs: now() - startedAt,
      });

      collections[sourceName] = document;
      collectionSchemas[sourceName] = source.shape;
      provenance[sourceName] = {
        fetchedAt: new Date(now()).toISOString(),
        readOnly: source.readOnly ?? true,
      };
    })
  );

  return { collections, collectionSchemas, provenance };
}
