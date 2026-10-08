import type { WebMcpToolDef } from '@olonjs/core';
import { webmcpTools as formDemoTools } from '@/components/form-demo';

/**
 * Tenant tool registry (spec 01-webmcp-tool-contract).
 *
 * Section capsules declare tools by exporting `webmcpTools` from their
 * `index.ts`. Aggregate them here:
 * - admin-surface defs + executors flow into the Studio island
 *   (`AdminStudioClient` → `JsonPagesConfig.webmcp`);
 * - public-surface tool names flow into the visitor page via
 *   `sectionPublicTools` (module 02).
 */

/** Admin-surface tool defs registered in the Studio island. */
export const declaredAdminTools: readonly WebMcpToolDef[] = [];

/** Runtime executors for admin tools, keyed by tool name. */
export const adminToolExecutors: Readonly<
  Record<string, (args: unknown) => Promise<unknown> | unknown>
> = {};

/** Public tool names exposed per section type (consumed by module 02). */
export const sectionPublicTools: Record<string, readonly string[]> = {
  'form-demo': formDemoTools.map((tool) => tool.name),
};

/** Public-surface tool defs emitted in the runtime page contracts (module 02). */
export const declaredPublicTools: readonly WebMcpToolDef[] = [...formDemoTools];
