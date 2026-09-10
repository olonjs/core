import { buildRobotsTxt } from '@/lib/webmcp/runtime/agenticSurface';
import { resolvePublicBaseUrl } from '@/lib/webmcp/runtime/loadRuntimeSurface';

export const dynamic = 'force-dynamic';

/** GET /robots.txt (rewrite) — computed per request. */
export async function GET(request: Request) {
  return new Response(buildRobotsTxt(resolvePublicBaseUrl(request)), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
