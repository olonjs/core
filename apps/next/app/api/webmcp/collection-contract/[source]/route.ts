import { NextResponse } from 'next/server';
import { buildRuntimeCollectionContract, stripSchemaJsonSuffix } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /schemas/collections/{source}.schema.json (rewrite) — collection contract. */
export async function GET(_request: Request, context: { params: Promise<{ source: string }> }) {
  try {
    const { source: raw } = await context.params;
    const source = stripSchemaJsonSuffix([raw]);
    const { bundle } = loadRuntimeSurfaceForSite();
    const contract = buildRuntimeCollectionContract({ collectionSchemas: bundle.collectionSchemas, source });
    if (!contract) {
      return NextResponse.json({ error: 'Collection contract not found' }, { status: 404 });
    }
    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Collection contract failed' },
      { status: 500 },
    );
  }
}
