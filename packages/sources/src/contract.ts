/**
 * Contract for external collection sources.
 *
 * A source declares ONE shape and ONE resolver. The shape is the single
 * declaration that feeds both validation (`shape.parse`) and the JSON Schema
 * contracts emitted for agents (`collectionSchemas`). The resolver projects the
 * document from the external system of record (network/DB/…). Core stays pure:
 * it never sees this contract in this phase — the caller injects the resolved
 * `collections` / `collectionSchemas` (see the ADR-0018 promotion path).
 */

/** Record document keyed by item id: the invariant is `key === item.id`. */
export type CollectionDocument<TItem = unknown> = Record<string, TItem>;

/**
 * Duck-typed document schema (structurally compatible with the schemas
 * `@olonjs/core` accepts — Zod record schemas satisfy this).
 */
export interface SourceShape<TDocument> {
  parse: (input: unknown) => TDocument;
  shape?: Record<string, unknown>;
}

/** Context passed to a source resolver for one projected route. */
export interface CollectionSourceContext {
  /** The collection source name (key in the tenant's `collectionSources`). */
  source: string;
  /** Route params of the page being resolved (e.g. `{ slug: 'dune' }`). */
  params: Record<string, string>;
  /** Aborted when the render/request is cancelled. */
  signal?: AbortSignal;
}

export interface CollectionSource<TDocument extends CollectionDocument = CollectionDocument> {
  /** Document schema: validation source of truth, also feeds JSON Schema contracts. */
  readonly shape: SourceShape<TDocument>;
  /** Projects the document from the external system of record. */
  readonly resolve: (ctx: CollectionSourceContext) => Promise<TDocument>;
  /** Projected entities are read-only by default: never persisted to the repo. */
  readonly readOnly?: boolean;
}

/** Identity helper for inference and future validation. */
export function defineCollectionSource<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>
): CollectionSource<TDocument> {
  return source;
}

export type SourceErrorCode =
  | 'resolve-failed'
  | 'invalid-document'
  | 'timeout'
  | 'aborted'
  | 'missing-source'
  | 'unknown';

const RETRYABLE_BY_CODE: Record<SourceErrorCode, boolean> = {
  'resolve-failed': true,
  timeout: true,
  'missing-source': false,
  'invalid-document': false,
  aborted: false,
  unknown: false,
};

export interface SourceErrorInput {
  code: SourceErrorCode;
  source: string;
  message?: string;
  retryable?: boolean;
  cause?: unknown;
}

/** Typed error raised by the sources layer. Never throw raw from a source. */
export class SourceError extends Error {
  readonly code: SourceErrorCode;
  readonly source: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(input: SourceErrorInput) {
    super(
      input.message ??
        `[sources] ${input.code} while resolving "${input.source}"`
    );
    this.name = 'SourceError';
    this.code = input.code;
    this.source = input.source;
    this.retryable = input.retryable ?? RETRYABLE_BY_CODE[input.code];
    this.cause = input.cause;
  }
}

/** Structured observability event emitted by the sources layer. */
export interface SourceEvent {
  source: string;
  op: 'resolve' | 'cache';
  phase: 'start' | 'end';
  durationMs?: number;
  cache?: 'hit' | 'miss' | 'stale';
  error?: { code: SourceErrorCode; retryable: boolean };
}

/** Observer hook; wire to logs/metrics/tracing at the app boundary. */
export type SourceObserver = (event: SourceEvent) => void;
