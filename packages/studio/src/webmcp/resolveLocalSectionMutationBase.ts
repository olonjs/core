import { isRecord, type PageConfig, type Section } from '@olonjs/core';

/**
 * Base data for a local WebMCP `update-section` mutation.
 *
 * Authored page data may still hold COP collection refs (e.g. `items: { $ref }`);
 * Zod section schemas expect the resolved shape. Mirror the global path and the
 * Inspector: mutate + validate against the resolved section, then let
 * `applyCollectionRefBindingsToDraft` write back onto the authored `$ref`s.
 */
export function resolveLocalSectionMutationBase(
  authoredSection: Section,
  resolvedPage: PageConfig | null | undefined
): Record<string, unknown> {
  const resolvedSection = resolvedPage?.sections?.find((section) => section.id === authoredSection.id);
  if (resolvedSection && isRecord(resolvedSection.data)) {
    return resolvedSection.data;
  }
  return isRecord(authoredSection.data) ? authoredSection.data : {};
}
