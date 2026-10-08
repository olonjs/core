import type { WebMcpToolDef } from '@olonjs/core';

export interface VisitorToolRegistration extends WebMcpToolDef {
  /** Client-side executor — the dev's domain logic (fetch, route handler, external service). */
  execute: (args: unknown) => Promise<unknown> | unknown;
}

/**
 * Client-side registry of public tools: name → def with executor
 * (spec 02-webmcp-tool-public-runtime).
 *
 * The RSC page passes only the enabled tool NAMES (functions cannot cross the
 * RSC boundary); this registry resolves them to their executors at
 * registration time in the visitor island.
 *
 * Section capsules register here — module 03 adds 'submit-form'.
 */
export const visitorToolDefs: Record<string, VisitorToolRegistration> = {};
