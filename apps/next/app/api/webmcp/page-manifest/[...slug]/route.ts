import { NextResponse } from 'next/server';
import { buildRuntimePageManifest, stripJsonSuffix } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSlug } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /mcp-manifests/{slug}.json (rewrite) — page manifest, computed per request. */
export async function GET(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  try {
    const { slug: parts } = await context.params;
    const slug = stripJsonSuffix(parts ?? []);
    const surface = await loadRuntimeSurfaceForSlug({ slug, requestUrl: request.url });
    const manifest = buildRuntimePageManifest({ ...surface, slug });
    if (!manifest) {
      return NextResponse.json({ error: 'Page manifest not found' }, { status: 404 });
    }
    return NextResponse.json(manifest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Page manifest failed' },
      { status: 500 },
    );
  }
}
