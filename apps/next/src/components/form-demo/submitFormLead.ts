import { cloudPolicy } from '@/lib/env/tenantEnv';

export interface SubmitFormArgs {
  name: string;
  email: string;
  message: string;
}

export interface SubmitFormContext {
  recipientEmail: string;
  sectionId: string;
  pageSlug: string;
  /** The dev-declared endpoint path (the variable piece); default 'form/send'. */
  path?: string;
}

/**
 * Shared submit executor for form sections (spec 03-webmcp-tool-submit-plugin).
 *
 * Base URL always comes from the cloud env chain (`tenantEnv`/`cloudPolicy`);
 * the dev declares only the variable path. Header parity with tenant-alpha's
 * `useOlonForms` (Bearer + Idempotency-Key).
 */
export async function submitFormLead(
  args: SubmitFormArgs,
  ctx: SubmitFormContext,
): Promise<{ ok: true }> {
  const base = (cloudPolicy.apiUrl ?? '').replace(/\/$/, '');
  if (!base || !cloudPolicy.apiKey) {
    throw new Error('Cloud env not configured (NEXT_PUBLIC_OLONJS_*).');
  }

  const path = (ctx.path ?? 'form/send').replace(/^\/+|\/+$/g, '');
  const endpoint = `${base}/${path}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cloudPolicy.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `form-${ctx.sectionId}-${Date.now()}`,
    },
    body: JSON.stringify({
      ...args,
      recipientEmail: ctx.recipientEmail,
      page: ctx.pageSlug,
      section: ctx.sectionId,
      source: 'olon-webmcp',
      submittedAt: new Date().toISOString(),
    }),
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Submit failed (${response.status})`);
  }

  return { ok: true };
}
