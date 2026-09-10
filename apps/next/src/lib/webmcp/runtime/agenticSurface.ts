/**
 * Runtime agentic surface for Next — computed per request, never baked.
 *
 * Same `webmcp.*` builders as the Vite bake, fed by the runtime content bundle.
 * Route handlers under app/api/webmcp/* and app/api/seo/* call these; next.config
 * rewrites map the public hrefs (/mcp-manifest.json, /mcp-manifests/*, /schemas/*,
 * /llms.txt, /robots.txt, /sitemap.xml) onto them.
 */
import {
  resolvePageMatchFromRegistry,
  resolvePublicPageDocument,
  webmcp,
  type JsonPagesConfig,
  type PageConfig,
} from '@olonjs/core';
import type { PublicPageContentBundle } from '@olonjs/next/server';

const {
  buildCollectionContract,
  buildLlmsTxt,
  buildPageContract,
  buildPageContractHref,
  buildPageManifest,
  buildSiteManifest,
} = webmcp;

export type RuntimeSurfaceInput = {
  bundle: PublicPageContentBundle;
  schemas: JsonPagesConfig['schemas'];
  submissionSchemas?: JsonPagesConfig['submissionSchemas'];
};

function joinSegments(segments: readonly string[]): string {
  return segments.map((s) => decodeURIComponent(s)).join('/');
}

/** `['libri','dune.json']` → `libri/dune` */
export function stripJsonSuffix(segments: readonly string[]): string {
  return joinSegments(segments).replace(/\.json$/i, '');
}

/** `['home.schema.json']` → `home` */
export function stripSchemaJsonSuffix(segments: readonly string[]): string {
  return joinSegments(segments).replace(/\.schema\.json$/i, '');
}

type CollectionBinding = { source: string; paramKey: string };

function readCollectionBinding(page: PageConfig): CollectionBinding | null {
  const binding = (page as { collection?: unknown }).collection;
  if (!binding || typeof binding !== 'object') return null;
  const { source, paramKey } = binding as Partial<CollectionBinding>;
  if (typeof source !== 'string' || typeof paramKey !== 'string') return null;
  return { source, paramKey };
}

/**
 * Registry slugs with collection-bound pattern pages (`libri/[slug]`) expanded into
 * one concrete slug per collection record. Pattern is kept when its collection is absent.
 */
export function expandDynamicPageSlugs(
  pages: Record<string, PageConfig>,
  collections: JsonPagesConfig['collections'] | undefined,
): string[] {
  const out = new Set<string>();
  for (const [registrySlug, page] of Object.entries(pages)) {
    const binding = readCollectionBinding(page);
    const token = binding ? `[${binding.paramKey}]` : null;
    const collection = binding ? collections?.[binding.source] : undefined;
    if (!binding || !token || !registrySlug.includes(token) || !collection || typeof collection !== 'object') {
      out.add(registrySlug);
      continue;
    }
    const ids = Object.keys(collection);
    if (ids.length === 0) {
      out.add(registrySlug);
      continue;
    }
    for (const id of ids) out.add(registrySlug.replace(token, id));
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

function resolvePublicPage(input: RuntimeSurfaceInput, slug: string): PageConfig | null {
  const { bundle } = input;
  const match = resolvePageMatchFromRegistry(bundle.pages, slug);
  if (!match) return null;
  const resolved = resolvePublicPageDocument({
    slug,
    pages: bundle.pages,
    siteConfig: bundle.siteConfig,
    themeConfig: bundle.themeConfig,
    menuConfig: bundle.menuConfig,
    collections: bundle.collections,
    collectionSchemas: bundle.collectionSchemas,
    refDocuments: bundle.refDocuments,
  });
  return resolved?.page ?? match.page;
}

function resolveAllPublicPages(input: RuntimeSurfaceInput): Record<string, PageConfig> {
  const slugs = expandDynamicPageSlugs(input.bundle.pages, input.bundle.collections);
  const out: Record<string, PageConfig> = {};
  for (const slug of slugs) {
    const page = resolvePublicPage(input, slug);
    if (page) out[slug] = page;
  }
  return out;
}

export function buildRuntimeSiteManifest(input: RuntimeSurfaceInput) {
  return buildSiteManifest({
    pages: resolveAllPublicPages(input),
    schemas: input.schemas,
    submissionSchemas: input.submissionSchemas,
    siteConfig: input.bundle.siteConfig,
    // Bundle carries SchemaLike; the manifest builder expects the Zod registry (same objects).
    collectionSchemas: input.bundle.collectionSchemas as never,
  });
}

export function buildRuntimePageManifest(input: RuntimeSurfaceInput & { slug: string }) {
  const pageConfig = resolvePublicPage(input, input.slug);
  if (!pageConfig) return null;
  return buildPageManifest({
    slug: input.slug,
    pageConfig,
    schemas: input.schemas,
    submissionSchemas: input.submissionSchemas,
    siteConfig: input.bundle.siteConfig,
  });
}

export function buildRuntimePageContract(input: RuntimeSurfaceInput & { slug: string }) {
  const pageConfig = resolvePublicPage(input, input.slug);
  if (!pageConfig) return null;
  return buildPageContract({
    slug: input.slug,
    pageConfig,
    schemas: input.schemas,
    submissionSchemas: input.submissionSchemas,
    siteConfig: input.bundle.siteConfig,
  });
}

export function buildRuntimeCollectionContract(input: {
  collectionSchemas: JsonPagesConfig['collectionSchemas'] | undefined;
  source: string;
}) {
  const schema = input.collectionSchemas?.[input.source];
  if (!schema) return null;
  return buildCollectionContract({ source: input.source, schema: schema as never });
}

export function buildRuntimeLlmsTxt(input: RuntimeSurfaceInput): string {
  return buildLlmsTxt({
    pages: resolveAllPublicPages(input),
    schemas: input.schemas,
    submissionSchemas: input.submissionSchemas,
    siteConfig: input.bundle.siteConfig,
  });
}

export function buildRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /
Disallow: /api/

User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: PerplexityBot
User-agent: OAI-SearchBot
Allow: /
Allow: /*.json
Allow: /schemas/
Allow: /llms.txt
Allow: /mcp-manifest.json
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

function toW3CDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function urlEntry(entry: {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  comment?: string;
}): string {
  const lines: string[] = [];
  if (entry.comment) lines.push(`  <!-- ${entry.comment} -->`);
  lines.push('  <url>');
  lines.push(`    <loc>${entry.loc}</loc>`);
  lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
  lines.push(`    <priority>${entry.priority}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
}

function sectionComment(label: string): string {
  const bar = '='.repeat(42);
  return [`  <!-- ${bar} -->`, `  <!-- ${label.padEnd(42)} -->`, `  <!-- ${bar} -->`].join('\n');
}

export function buildSitemapXml(input: { baseUrl: string; slugs: readonly string[]; now?: Date }): string {
  const { baseUrl } = input;
  const stamp = toW3CDate(input.now ?? new Date());
  const entries: string[] = [];

  entries.push(sectionComment('GLOBAL AGENT DISCOVERY NODES'));
  entries.push(urlEntry({ loc: `${baseUrl}/llms.txt`, lastmod: stamp, changefreq: 'weekly', priority: '1.0' }));
  entries.push(
    urlEntry({ loc: `${baseUrl}/mcp-manifest.json`, lastmod: stamp, changefreq: 'weekly', priority: '1.0' }),
  );

  for (const slug of input.slugs) {
    const humanPath = slug === 'home' ? '/' : `/${slug}`;
    entries.push(sectionComment(`PAGE: ${slug.toUpperCase()}`));
    entries.push(
      urlEntry({ loc: `${baseUrl}${humanPath}`, lastmod: stamp, changefreq: 'daily', priority: '0.9', comment: 'Human UI' }),
    );
    entries.push(
      urlEntry({
        loc: `${baseUrl}/${slug}.json`,
        lastmod: stamp,
        changefreq: 'daily',
        priority: '0.9',
        comment: 'Machine Payload',
      }),
    );
    entries.push(
      urlEntry({
        loc: `${baseUrl}${buildPageContractHref(slug)}`,
        lastmod: stamp,
        changefreq: 'weekly',
        priority: '0.8',
        comment: 'Machine Contract (Schema)',
      }),
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '',
    entries.join('\n'),
    '',
    '</urlset>',
    '',
  ].join('\n');
}
