import { NextResponse } from 'next/server';
import { resolveCollectionSources } from '@olonjs/sources';
import { resolvePublicCollectionDocument } from '@/lib/loaders/publishedContent';
import { collectionSources } from '@/sources';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/**
 * GET /collections/{source}/{source}.json (rewrite) — collection document, runtime.
 *
 * File-backed collections are read from the content bundle; EXTERNAL sources
 * (ADR-0018) are projected on demand so the contract's `dataHref` resolves.
 * Note: resolution here has no route params — parameterized sources should be
 * resolved at the page level (see loadPublicPageBundleForRequest).
 */
export async function GET(_request: Request, context: { params: Promise<{ source: string; file: string }> }) {
  try {
    const { source, file } = await context.params;
    const sourceName = decodeURIComponent(source);

    if (sourceName in collectionSources) {
      const resolved = await resolveCollectionSources({
        sources: collectionSources as never,
        needed: [sourceName],
      });
      const projected = resolved.collections[sourceName];
      if (!projected) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
      }
      return NextResponse.json(projected);
    }

    const { bundle } = loadRuntimeSurfaceForSite();
    const doc = resolvePublicCollectionDocument(bundle, sourceName, decodeURIComponent(file));
    if (!doc) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection JSON failed' },
      { status: 500 },
    );
  }
}
