import { NextResponse } from 'next/server';
import { buildRuntimeSiteManifest } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /mcp-manifest.json (rewrite) — site manifest index, computed per request. */
export async function GET() {
  try {
    return NextResponse.json(buildRuntimeSiteManifest(loadRuntimeSurfaceForSite()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Site manifest failed' },
      { status: 500 },
    );
  }
}
