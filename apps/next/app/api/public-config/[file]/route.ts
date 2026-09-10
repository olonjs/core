import { NextResponse } from 'next/server';
import { resolvePublicConfigDocument } from '@/lib/loaders/publishedContent';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /config/{site|menu|theme}.json (rewrite) — JSP config document, runtime. */
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  try {
    const { file } = await context.params;
    const { bundle } = loadRuntimeSurfaceForSite();
    const doc = resolvePublicConfigDocument(bundle, decodeURIComponent(file));
    if (doc == null) return NextResponse.json({ error: 'Config document not found' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Config JSON failed' },
      { status: 500 },
    );
  }
}
