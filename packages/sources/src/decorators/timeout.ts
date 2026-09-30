import { SourceError, type CollectionDocument, type CollectionSource } from '../contract';

export interface WithTimeoutOptions {
  /** Deadline in ms. */
  ms: number;
  /** Injectable timer source for deterministic tests (resolves when the deadline fires). */
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Deadline policy: races the source against a timer, aborts the underlying
 * resolve and maps the outcome to a retryable `timeout` SourceError.
 */
export function withTimeout<TDocument extends CollectionDocument>(
  source: CollectionSource<TDocument>,
  options: WithTimeoutOptions
): CollectionSource<TDocument> {
  return {
    ...source,
    resolve: async (ctx) => {
      const controller = new AbortController();
      const onOuterAbort = () => controller.abort();
      ctx.signal?.addEventListener('abort', onOuterAbort);
      // Pre-aborted outer signals do not fire the listener retroactively.
      if (ctx.signal?.aborted) controller.abort();

      let timer: ReturnType<typeof setTimeout> | undefined;

      const deadline = options.sleep
        ? options.sleep(options.ms)
        : new Promise<void>((resolve) => {
            timer = setTimeout(resolve, options.ms);
          });

      const timeoutPromise = deadline.then(() => {
        throw new SourceError({ code: 'timeout', source: ctx.source });
      });

      try {
        return await Promise.race([
          source.resolve({ ...ctx, signal: controller.signal }),
          timeoutPromise,
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        ctx.signal?.removeEventListener('abort', onOuterAbort);
      }
    },
  };
}
