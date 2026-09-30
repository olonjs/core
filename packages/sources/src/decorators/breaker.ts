import { SourceError, type CollectionDocument, type CollectionSource } from '../contract';

export interface WithCircuitBreakerOptions {
  /** Consecutive failures before opening (default 5). */
  failures?: number;
  /** Time (ms) the circuit stays open before a half-open attempt (default 30_000). */
  cooldownMs?: number;
  /** Injectable clock (ms) for deterministic tests. */
  now?: () => number;
}

/**
 * Circuit breaker policy: fail fast while open, probe once after cooldown
 * (half-open), close on success. Per-decorator state, no globals.
 */
export function withCircuitBreaker<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: WithCircuitBreakerOptions = {}
): CollectionSource<TDocument> {
  const failureThreshold = options.failures ?? 5;
  const cooldownMs = options.cooldownMs ?? 30_000;
  const now = options.now ?? Date.now;

  let state: 'closed' | 'open' = 'closed';
  let failureCount = 0;
  let openedAt = 0;

  return {
    ...source,
    resolve: async (ctx) => {
      if (state === 'open') {
        if (now() - openedAt < cooldownMs) {
          throw new SourceError({ code: 'circuit-open', source: ctx.source });
        }
        // half-open: allow exactly this probe
      }

      try {
        const document = await source.resolve(ctx);
        state = 'closed';
        failureCount = 0;
        return document;
      } catch (error) {
        failureCount += 1;
        if (failureCount >= failureThreshold) {
          state = 'open';
          openedAt = now();
        }
        throw error;
      }
    },
  };
}
