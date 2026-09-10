import type { PublicPageContentBundle } from '@olonjs/next/server';
import {
  buildServerApiCandidates,
  type ServerCloudBootSource,
} from '@/lib/env/serverCloudPolicy';
import { loadLivePublicPageBundle } from './loadLivePublicPageBundle';
import { loadLocalPublicPageBundle } from './loadLocalPublicPageBundle';

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
    return loadLivePublicPageBundle({
      slug: input.slug,
      apiBases: buildServerApiCandidates(apiUrl),
      apiKey,
      appRoot,
      fetchImpl: input.fetchImpl,
    });
  }

  return loadLocalPublicPageBundle(appRoot);
}
