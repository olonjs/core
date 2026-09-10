import { NextResponse } from 'next/server';
import { buildRuntimePageContract, stripSchemaJsonSuffix } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSlug } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /schemas/{slug}.schema.json (rewrite) — page contract, computed per request. */
export async function GET(request: Request, context: { params: Promise<{ slug?: string[] }> }) {
  try {
    const { slug: parts } = await context.params;
    const slug = stripSchemaJsonSuffix(parts ?? []);
    const surface = await loadRuntimeSurfaceForSlug({ slug, requestUrl: request.url });
    const contract = buildRuntimePageContract({ ...surface, slug });
    if (!contract) {
      return NextResponse.json({ error: 'Page contract not found' }, { status: 404 });
    }
    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Page contract failed' },
      { status: 500 },
    );
  }
}
