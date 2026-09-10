import { buildSitemapXml, expandDynamicPageSlugs } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSite, resolvePublicBaseUrl } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /sitemap.xml (rewrite) — computed per request. */
export async function GET(request: Request) {
  try {
    const { bundle } = loadRuntimeSurfaceForSite();
    const xml = buildSitemapXml({
      baseUrl: resolvePublicBaseUrl(request),
      slugs: expandDynamicPageSlugs(bundle.pages, bundle.collections),
    });
    return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'sitemap failed', { status: 500 });
  }
}
