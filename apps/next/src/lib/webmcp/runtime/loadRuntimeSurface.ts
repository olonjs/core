import path from 'node:path';
import type { JsonPagesConfig } from '@olonjs/core';
import { readServerCloudPolicy } from '@/lib/env/serverCloudPolicy';
import { loadLocalPublicPageBundle } from '@/lib/loaders/loadLocalPublicPageBundle';
import { loadPublicPageBundleForRequest } from '@/lib/loaders/loadPublicPageBundleForRequest';
import { SECTION_SCHEMAS, SECTION_SUBMISSION_SCHEMAS } from '@/lib/schemas';
import type { RuntimeSurfaceInput } from './agenticSurface';

const schemas = SECTION_SCHEMAS as unknown as JsonPagesConfig['schemas'];
const submissionSchemas = SECTION_SUBMISSION_SCHEMAS as unknown as JsonPagesConfig['submissionSchemas'];

/**
 * Per-slug surface (page manifest / contract): follows the server cloud policy
 * (local / static / live) exactly like `/api/public-page`.
 */
export async function loadRuntimeSurfaceForSlug(input: {
  slug: string;
  requestUrl: string;
}): Promise<RuntimeSurfaceInput> {
  const policy = readServerCloudPolicy();
  const bundle = await loadPublicPageBundleForRequest({
    bootSource: policy.bootSource,
    slug: input.slug,
    requestUrl: input.requestUrl,
    appRoot: path.resolve(process.cwd()),
    apiUrl: policy.apiUrl,
    apiKey: policy.apiKey,
  });
  return { bundle, schemas, submissionSchemas };
}

/**
 * Site-wide surface (index, llms.txt, sitemap): page registry + collections from the
 * tenant DNA on disk. Live cloud content is per-page and does not change the registry.
 */
export function loadRuntimeSurfaceForSite(): RuntimeSurfaceInput {
  const bundle = loadLocalPublicPageBundle(path.resolve(process.cwd()));
  return { bundle, schemas, submissionSchemas };
}

/** Public base URL for absolute links (robots/sitemap). */
export function resolvePublicBaseUrl(request: Request): string {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelHost) return `https://${vercelHost}`;
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost ?? request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
