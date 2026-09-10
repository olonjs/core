import { buildRuntimeLlmsTxt } from '@/lib/webmcp/runtime/agenticSurface';
import { loadRuntimeSurfaceForSite } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /llms.txt (rewrite) — computed per request. */
export async function GET() {
  try {
    return new Response(`${buildRuntimeLlmsTxt(loadRuntimeSurfaceForSite())}\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'llms.txt failed', { status: 500 });
  }
}
