import { SourceError, type CollectionDocument, type CollectionSource } from '../contract';

export interface WithRetryOptions {
  /** Total attempts including the first (default 3). */
  attempts?: number;
  /** Base backoff in ms, doubled per attempt (default 50). */
  backoffMs?: number;
  /** Jitter fraction 0..1 applied to each delay (default 0). */
  jitter?: number;
  /** Injectable sleep for deterministic tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Override retry decision; defaults to SourceError.retryable, raw errors retried. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

function defaultShouldRetry(error: unknown): boolean {
  return error instanceof SourceError ? error.retryable : true;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Retry policy for external sources. Policy lives here, never in core (ADR-0018). */
export function withRetry<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: WithRetryOptions = {}
): CollectionSource<TDocument> {
  const attempts = options.attempts ?? 3;
  const backoffMs = options.backoffMs ?? 50;
  const jitter = options.jitter ?? 0;
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  return {
    ...source,
    resolve: async (ctx) => {
      let lastError: unknown;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          return await source.resolve(ctx);
        } catch (error) {
          lastError = error;
          if (attempt >= attempts || !shouldRetry(error, attempt)) throw error;

          const base = backoffMs * 2 ** (attempt - 1);
          const delay = jitter > 0 ? base * (1 + (Math.random() * 2 - 1) * jitter) : base;
          await sleep(delay);
        }
      }

      throw lastError;
    },
  };
}
