'use client';

import { useEffect } from 'react';
import { registerWebMcpTool } from '@olonjs/core';
import { bootstrapVisitorWebMcpRuntime } from '@/lib/webmcp/bootstrapVisitorWebMcpRuntime';
// Side effect: registers the submit-form executor (spec 03). Client-only import.
import '@/lib/webmcp/submitFormTool';
import { visitorToolDefs } from '@/lib/webmcp/visitorToolDefs';

/**
 * Client island: WebMCP imperative API on public pages.
 * Installs the polyfill and registers the public tools enabled for the page
 * (spec 02-webmcp-tool-public-runtime). Must not import @olonjs/studio.
 *
 * `toolNames` are computed server-side from the sections present on the page
 * (functions cannot cross the RSC boundary — only names travel).
 */
export function WebMcpVisitorRuntime({ toolNames = [] }: { toolNames?: string[] }) {
  useEffect(() => {
    bootstrapVisitorWebMcpRuntime();
    const unregister = toolNames.map((name) => {
      const def = visitorToolDefs[name];
      if (!def) {
        console.warn(`[WebMCP] visitor tool "${name}" has no executor definition.`);
        return () => undefined;
      }
      return registerWebMcpTool({
        ...def,
        inputSchema: def.inputSchema ?? { type: 'object', additionalProperties: false, properties: {} },
      });
    });
    return () => {
      unregister.forEach((stop) => stop());
    };
  }, [toolNames]);

  return null;
}
