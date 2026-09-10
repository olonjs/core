import type { NextConfig } from 'next';

/**
 * Keep rewrites inline — next.config is loaded via Node/CJS and cannot reliably
 * import `@olonjs/next/server` (exports are ESM `import`-only).
 * Public-page contract guarded by `buildPublicPageJsonRewrites` unit tests in the
 * package; the WebMCP/SEO runtime rewrites below are guarded by
 * `src/lib/webmcp/runtime/nextConfigRewrites.test.ts`.
 *
 * Order matters: explicit agentic hrefs first, generic `/:path*.json` last.
 */
export const webmcpRuntimeRewrites = [
  { source: '/mcp-manifest.json', destination: '/api/webmcp/site-manifest' },
  { source: '/mcp-manifests/:path*.json', destination: '/api/webmcp/page-manifest/:path*' },
  { source: '/schemas/collections/:source.schema.json', destination: '/api/webmcp/collection-contract/:source' },
  { source: '/schemas/:path*.schema.json', destination: '/api/webmcp/page-contract/:path*' },
  { source: '/llms.txt', destination: '/api/webmcp/llms' },
  { source: '/robots.txt', destination: '/api/seo/robots' },
  { source: '/sitemap.xml', destination: '/api/seo/sitemap' },
];

/** JSP published documents (formerly copied into public/ by sync-pages-to-public). */
export const publishedContentRewrites = [
  { source: '/collections/:source/:file.json', destination: '/api/public-collection/:source/:file' },
  { source: '/config/:file.json', destination: '/api/public-config/:file' },
];

export const publicPageJsonRewrites = [
  {
    source: '/pages/:path*.json',
    destination: '/api/public-page/:path*',
  },
  {
    source: '/:path*.json',
    destination: '/api/public-page/:path*',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@olonjs/next', '@olonjs/core', '@olonjs/react', '@olonjs/studio'],
  /**
   * Visitor/admin loaders read `src/data/**` via runtime `fs` (`getFilePages`, etc.).
   * Those JSON files are never statically imported, so NFT omits them from the
   * Vercel serverless bundle unless we force-include them — otherwise
   * `getFilePages()` returns {} and the site shows EmptyTenantView.
   */
  outputFileTracingIncludes: {
    '/*': ['./src/data/**/*'],
  },
  async rewrites() {
    return [...webmcpRuntimeRewrites, ...publishedContentRewrites, ...publicPageJsonRewrites];
  },
};

export default nextConfig;
