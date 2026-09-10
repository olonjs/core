import type { PublicPageContentBundle } from '@olonjs/next/server';

/**
 * Published JSON documents served at runtime (JSP paths):
 *   /collections/{source}/{source}.json  and  /config/{site|menu|theme}.json
 * Replaces the prebuild copy of src/data into public/.
 */

function stripJson(name: string): string {
  return name.replace(/\.json$/i, '');
}

export function resolvePublicCollectionDocument(
  bundle: Pick<PublicPageContentBundle, 'collections'>,
  source: string,
  file: string,
): Record<string, unknown> | null {
  if (!source || stripJson(file) !== source) return null;
  const doc = bundle.collections?.[source];
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  return doc as Record<string, unknown>;
}

const CONFIG_DOCUMENTS = {
  site: 'siteConfig',
  menu: 'menuConfig',
  theme: 'themeConfig',
} as const satisfies Record<string, keyof PublicPageContentBundle>;

export function resolvePublicConfigDocument(
  bundle: Pick<PublicPageContentBundle, 'siteConfig' | 'menuConfig' | 'themeConfig'>,
  file: string,
): unknown | null {
  const name = stripJson(file);
  if (!Object.prototype.hasOwnProperty.call(CONFIG_DOCUMENTS, name)) return null;
  return bundle[CONFIG_DOCUMENTS[name as keyof typeof CONFIG_DOCUMENTS]] ?? null;
}
