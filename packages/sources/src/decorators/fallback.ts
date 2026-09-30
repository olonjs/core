import type {
  CollectionDocument,
  CollectionSource,
  CollectionSourceContext,
} from '../contract';

export interface WithFallbackOptions<TDocument extends CollectionDocument> {
  /** Returns the last known-good document, or undefined when none exists. */
  getStale: () => TDocument | undefined | Promise<TDocument | undefined>;
}

function emitStale(ctx: CollectionSourceContext): void {
  try {
    ctx.onEvent?.({ source: ctx.source, op: 'cache', phase: 'end', cache: 'stale' });
  } catch {
    // Observers must never break resolution.
  }
}

/**
 * Fallback policy: on failure, serve the stale document when available.
 * Composable with `withCache` (whose store can back `getStale`).
 */
export function withFallback<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: WithFallbackOptions<TDocument>
): CollectionSource<TDocument> {
  return {
    ...source,
    resolve: async (ctx) => {
      try {
        return await source.resolve(ctx);
      } catch (error) {
        const stale = await options.getStale();
        if (stale === undefined) throw error;
        emitStale(ctx);
        return stale;
      }
    },
  };
}
