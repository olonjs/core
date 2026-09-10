import { NextResponse } from 'next/server';
import { resolvePublicCollectionDocument } from '@/lib/loaders/publishedContent';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /collections/{source}/{source}.json (rewrite) — collection document, runtime. */
export async function GET(_request: Request, context: { params: Promise<{ source: string; file: string }> }) {
  try {
    const { source, file } = await context.params;
    const { bundle } = loadRuntimeSurfaceForSite();
    const doc = resolvePublicCollectionDocument(bundle, decodeURIComponent(source), decodeURIComponent(file));
    if (!doc) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection JSON failed' },
      { status: 500 },
    );
  }
}
