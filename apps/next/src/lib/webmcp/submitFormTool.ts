import { FormDemoSubmissionSchema } from '@/components/form-demo/schema';
import { submitFormLead, type SubmitFormArgs } from '@/components/form-demo/submitFormLead';
import { webmcpTools } from '@/components/form-demo/webmcpTools';
import { visitorToolDefs } from './visitorToolDefs';

const submitFormDef = webmcpTools.find((tool) => tool.name === 'submit-form');
if (!submitFormDef) {
  throw new Error('[WebMCP] form-demo capsule must declare the submit-form tool.');
}

/**
 * Client-side executor registration for submit-form (spec 03).
 *
 * Imported as a side effect ONLY by the visitor island — never by server code:
 * the executor chain (`submitFormLead` → `tenantEnv` → `@olonjs/react`) is
 * client-bound. Validation uses the section's submission schema (ADR-0002),
 * the same shape agents see in `sectionSubmissionSchemas` of the page contract.
 */
visitorToolDefs['submit-form'] = {
  ...submitFormDef,
  execute: async (rawArgs: unknown) => {
    const parsed = FormDemoSubmissionSchema.parse(rawArgs);
    const form = document.querySelector<HTMLFormElement>('form[data-olon-recipient]');
    const args = rawArgs as Record<string, unknown>;
    const sectionId =
      typeof args.sectionId === 'string' && args.sectionId.trim()
        ? args.sectionId.trim()
        : form?.id || 'form-demo';
    return submitFormLead(parsed as SubmitFormArgs, {
      recipientEmail: form?.dataset.olonRecipient ?? '',
      sectionId,
      pageSlug: window.location.pathname,
      path: 'form/send',
    });
  },
};
