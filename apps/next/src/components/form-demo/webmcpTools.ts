import type { WebMcpToolDef } from '@olonjs/core';
import { FormDemoSubmissionSchema } from './schema';

/**
 * Public WebMCP tools declared by the form-demo capsule (spec 03).
 * Serializable defs only — the executor is registered client-side in
 * `src/lib/webmcp/submitFormTool.ts` (functions cannot cross the RSC boundary).
 */
export const webmcpTools: readonly WebMcpToolDef[] = [
  {
    name: 'submit-form',
    description: 'Submit the contact form on this page (name, email, message).',
    surface: 'public',
    inputSchema: FormDemoSubmissionSchema.toJSONSchema() as Record<string, unknown>,
    annotations: { consequentialHint: true },
  },
];
