import type {
  CollectionDocument,
  CollectionSource,
  CollectionSourceContext,
} from '../contract';

export interface CacheEntry {
  document: unknown;
  storedAt: number;
}

/** Pluggable cache backend. Default is a per-source in-memory Map (no global state). */
export interface CacheStore {
  get(key: string): CacheEntry | undefined | Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): void | Promise<void>;
  delete?(key: string): void | Promise<void>;
}

export interface WithCacheOptions {
  /** Fresh window in ms. */
  ttlMs: number;
  /** Extra window (ms) where stale entries are served while refreshing in the background. */
  swrMs?: number;
  /** Cache backend; defaults to an in-memory store owned by this decorator. */
  store?: CacheStore;
  /** Injectable clock (ms) for deterministic tests. */
  now?: () => number;
}

export function createMemoryCacheStore(): CacheStore {
  const map = new Map<string, CacheEntry>();
  return {
    get: (key) => map.get(key),
    set: (key, entry) => {
      map.set(key, entry);
    },
    delete: (key) => {
      map.delete(key);
    },
  };
}

function cacheKey(ctx: CollectionSourceContext): string {
  const params = Object.keys(ctx.params)
    .sort()
    .map((key) => `${key}=${ctx.params[key]}`)
    .join('&');
  return `${ctx.source}?${params}`;
}

function emitCache(ctx: CollectionSourceContext, cache: 'hit' | 'miss' | 'stale'): void {
  try {
    ctx.onEvent?.({ source: ctx.source, op: 'cache', phase: 'end', cache });
  } catch {
    // Observers must never break resolution.
  }
}

/**
 * TTL cache with stale-while-revalidate and single-flight dedupe.
 * Policy lives here, never in @olonjs/core (ADR-0018).
 */
export function withCache<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: WithCacheOptions
): CollectionSource<TDocument> {
  const store = options.store ?? createMemoryCacheStore();
  const now = options.now ?? Date.now;
  const swrMs = options.swrMs ?? 0;
  const inFlight = new Map<string, Promise<TDocument>>();

  return {
    ...source,
    resolve: async (ctx) => {
      const key = cacheKey(ctx);
      const entry = await store.get(key);
      const age = entry ? now() - entry.storedAt : Number.POSITIVE_INFINITY;

      if (entry && age < options.ttlMs) {
        emitCache(ctx, 'hit');
        return entry.document as TDocument;
      }

      if (entry && swrMs > 0 && age < options.ttlMs + swrMs) {
        emitCache(ctx, 'stale');
        if (!inFlight.has(key)) {
          const refresh = source
            .resolve(ctx)
            .then((document) => store.set(key, { document, storedAt: now() }))
            .catch(() => undefined)
            .finally(() => inFlight.delete(key));
          inFlight.set(key, refresh as Promise<unknown> as Promise<TDocument>);
        }
        return entry.document as TDocument;
      }

      const pending = inFlight.get(key);
      if (pending) return pending;

      const fetchPromise = source
        .resolve(ctx)
        .then(async (document) => {
          await store.set(key, { document, storedAt: now() });
          emitCache(ctx, 'miss');
          return document;
        })
        .finally(() => inFlight.delete(key));

      inFlight.set(key, fetchPromise);
      return fetchPromise;
    },
  };
}
