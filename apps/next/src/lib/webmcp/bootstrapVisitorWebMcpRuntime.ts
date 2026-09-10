import { ensureWebMcpRuntime } from '@olonjs/core';

export type VisitorWebMcpRuntimeDeps = {
  ensureWebMcpRuntime: () => void;
};

/**
 * Visitor bootstrap: install document.modelContext / readResource polyfill.
 * Does not register mutation tools (Studio-only, parity with Vite VisitorRoute).
 */
export function bootstrapVisitorWebMcpRuntime(
  deps: VisitorWebMcpRuntimeDeps = { ensureWebMcpRuntime },
): void {
  deps.ensureWebMcpRuntime();
}
