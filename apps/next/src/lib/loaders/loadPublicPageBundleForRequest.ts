import type { PublicPageContentBundle } from '@olonjs/next/server';
import { resolvePageMatchFromRegistry } from '@olonjs/core';
import { collectCollectionSources, resolveCollectionSources } from '@olonjs/sources';
import {
  buildServerApiCandidates,
  type ServerCloudBootSource,
} from '@/lib/env/serverCloudPolicy';
import { collectionSources } from '@/sources';
import { loadLivePublicPageBundle } from './loadLivePublicPageBundle';
import { loadLocalPublicPageBundle } from './loadLocalPublicPageBundle';

/**
 * Project external collection sources referenced by the requested slug's page
 * (ADR-0018). Without this, page JSON endpoints would expose unresolved $refs.
 */
export async function withProjectedSources(
  bundle: PublicPageContentBundle,
  slug: string,
  appRoot?: string,
): Promise<PublicPageContentBundle> {
  const match = resolvePageMatchFromRegistry(
    bundle.pages as never,
    slug
  );
  if (!match) return bundle;

  const needed = collectCollectionSources(match.page).filter(
    (name) => name in collectionSources
  );
  if (needed.length === 0) return bundle;

  const resolved = await resolveCollectionSources({
    sources: collectionSources as never,
    needed,
    params: match.params,
  });

  return {
    ...bundle,
    collections: {
      ...(bundle.collections ?? {}),
      ...(resolved.collections as NonNullable<PublicPageContentBundle['collections']>),
    },
    collectionSchemas: {
      ...(bundle.collectionSchemas ?? {}),
      ...(resolved.collectionSchemas as NonNullable<
        PublicPageContentBundle['collectionSchemas']
      >),
    },
  };
}

export type LoadPublicPageBundleForRequestInput = {
  bootSource: ServerCloudBootSource;
  slug: string;
  /** Absolute request URL (kept for signature parity with route handlers). */
  requestUrl: string;
  appRoot?: string;
  apiUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Select the content bundle from the server cloud policy bootSource.
 *
 * - `local`  → tenant DNA on disk (`src/data`).
 * - `static` → Save2Repo: the published content *is* the deployed repo, so it is the
 *              same filesystem read. No same-origin HTTP self-fetch (that looped back
 *              into `/api/public-page` via the `/pages/:path*.json` rewrite).
 * - `live`   → hot-save cloud render for the requested slug.
 */
export async function loadPublicPageBundleForRequest(
  input: LoadPublicPageBundleForRequestInput,
): Promise<PublicPageContentBundle> {
  const appRoot = input.appRoot ?? process.cwd();

  if (input.bootSource === 'live') {
    const apiUrl = (input.apiUrl ?? '').trim();
    const apiKey = (input.apiKey ?? '').trim();
    if (!apiUrl || !apiKey) {
      throw new Error('Live public page JSON requires cloud API URL and key');
    }
    const liveBundle = await loadLivePublicPageBundle({
      slug: input.slug,
      apiBases: buildServerApiCandidates(apiUrl),
      apiKey,
      appRoot,
      fetchImpl: input.fetchImpl,
    });
    return withProjectedSources(liveBundle, input.slug, appRoot);
  }

  const localBundle = await loadLocalPublicPageBundle(appRoot);
  return withProjectedSources(localBundle, input.slug, appRoot);
}
