/**
 * Pure helper (spec 02-webmcp-tool-public-runtime): computes which public
 * tool names are enabled for a page, from the section types present.
 * Deduplicated, in page order.
 */
export function resolvePublicToolNames(
  sections: ReadonlyArray<{ type: string }>,
  sectionPublicTools: Record<string, readonly string[]>,
): string[] {
  const out: string[] = [];
  for (const section of sections) {
    for (const name of sectionPublicTools[section.type] ?? []) {
      if (!out.includes(name)) out.push(name);
    }
  }
  return out;
}
