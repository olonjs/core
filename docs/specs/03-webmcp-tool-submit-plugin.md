# Spec 03: WebMCP Submit Plugin (form-demo, Next)

UID: `tool-submit-plugin` · Status: Draft — in review · Data: 2026-10-08
Intent: `docs/intent/webmcp-tool-publishing.md` · Dipende da: `01-webmcp-tool-contract.md`, `02-webmcp-tool-public-runtime.md`

## Objective

Dimostrare end-to-end il modello di pubblicazione: `submit-form`, primo tool plugin legato alla capsule `form-demo`, eseguito da un agente **via bridge MCP su un tenant Next** — POST a `{OLONJS_CLOUD_URL}/form/send` (path fittizio dichiarato dal dev), payload validato dallo `submissionSchema` della sezione (ADR-0002). Il successo è l'invio reale, non il solo modello.

Assunzioni dichiarate:
1. Base URL **sempre** dalla catena env esistente (`NEXT_PUBLIC_OLONJS_CLOUD_URL` con fallback `NEXT_PUBLIC_JSONPAGES_*`, via `apps/next/src/lib/env/tenantEnv.ts` → `cloudPolicy.apiUrl`); il dev dichiara **solo il path variabile** (`form/send` per questo lavoro).
2. L'invio è un fetch client diretto al cloud (come `useOlonForms` di alpha: Bearer + `Idempotency-Key`); nessun route handler Next in questo modulo.
3. La UI umana (`FormDemoClient` stub con `setTimeout(400)`) resta **fuori scope**: la barra di successo è il percorso agente→tool. Il submit condiviso può essere adottato dalla UI in un lavoro successivo.

## Stato attuale (riferimenti verificati)

- Capsule form-demo in apps/next: `src/components/form-demo/{View.tsx, schema.ts, types.ts, index.ts}` + `FormDemoClient.tsx` (stub 117 righe, commento "cloud submit can replace later" L85).
- Submission schema registrato: `apps/next/src/lib/schemas.ts` L30-32 — `SECTION_SUBMISSION_SCHEMAS = { 'form-demo': FormDemoSubmissionSchema }` (ADR-0002); emesso come `sectionSubmissionSchemas` dal core (`webmcp-contracts.ts` L445-495).
- Env: `apps/next/src/lib/env/tenantEnv.ts` — `readCloudEnvFromNext` (accesso diretto a `process.env.NEXT_PUBLIC_*`, pitfall inlining documentato L8-14), `cloudPolicy`, `TENANT_ID = 'next'`.
- Riferimento alpha (parity): `apps/tenant-alpha/src/lib/forms/useOlonForms.ts` — POST `{apiUrl}/forms/submit`, header `Authorization: Bearer <apiKey>`, `Idempotency-Key: form-<id>-<ts>`, payload `{campi form, recipientEmail, page, source, submittedAt}`.
- Pagina che usa la sezione: `apps/next/src/data/pages/form.json` (section `form-demo` con `recipientEmail`).
- MCP bridge (packages/mcp) espone dinamicamente `listTools`/`executeTool` del documento — nessuna modifica necessaria lì.

## Design

### A. Executor condiviso (capsule, client)

`apps/next/src/components/form-demo/submitFormLead.ts` (nuovo, modulo client):

```ts
import { cloudPolicy } from '@/lib/env/tenantEnv';

export interface SubmitFormArgs { name: string; email: string; message: string; }

export async function submitFormLead(args: SubmitFormArgs, ctx: {
  recipientEmail: string; sectionId: string; pageSlug: string;
  path?: string; // il pezzo che il dev dichiara, default 'form/send'
}): Promise<{ ok: true }> {
  const base = (cloudPolicy.apiUrl ?? '').replace(/\/$/, '');
  if (!base || !cloudPolicy.apiKey) throw new Error('Cloud env not configured (NEXT_PUBLIC_OLONJS_*).');
  const endpoint = `${base}/${(ctx.path ?? 'form/send').replace(/^\//, '')}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cloudPolicy.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `form-${ctx.sectionId}-${Date.now()}`,
    },
    body: JSON.stringify({ ...args, recipientEmail: ctx.recipientEmail, page: ctx.pageSlug, section: ctx.sectionId, source: 'olon-webmcp', submittedAt: new Date().toISOString() }),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Submit failed (${response.status})`);
  return { ok: true };
}
```

### B. Dichiarazione tool nella capsule

`apps/next/src/components/form-demo/index.ts` (esteso):

```ts
import { z } from 'zod';
import type { WebMcpToolDef } from '@olonjs/core';

export const submitFormInputSchema = z.object({
  name: z.string(), email: z.string(), message: z.string(),
}).toJSONSchema();

export const webmcpTools: readonly WebMcpToolDef[] = [{
  name: 'submit-form',
  description: 'Submit the contact form on this page (name, email, message).',
  surface: 'public',
  inputSchema: submitFormInputSchema,
  annotations: { consequentialHint: true },
}];
```

Nota: l'`inputSchema` dello *strumento* resta la shape del form (`name/email/message`); la validazione completa usa `FormDemoSubmissionSchema` (shape dichiarata in `SECTION_SUBMISSION_SCHEMAS`): la def del tool la importa per `parse` prima del POST. Coerenza ADR-0002: l'agente trova `sectionSubmissionSchemas['form-demo']` nel contract e lo stesso shape come input del tool.

### C. Wiring (registri tenant)

- `src/lib/webmcp/visitorToolDefs.ts` (modulo 02): voce `'submit-form'` con `execute: (args) => { const parsed = FormDemoSubmissionSchema.parse(args); ... submitFormLead(parsed, ctx) }` — `ctx` (recipientEmail/sectionId/pageSlug) risolto dall'esecutore via DOM (`data-olon-recipient` già sul form in `FormDemoClient`, `data-jp-item-id` ecc.) o via argomento opzionale `sectionId` nel tool.
- `src/lib/webmcp/toolRegistry.ts` (modulo 01): `sectionPublicTools = { 'form-demo': ['submit-form'] }`.
- `webmcpTools` della capsule confluisce nei `declaredTools` di `AdminStudioClient` **solo se** surface admin (qui è public → nessun effetto admin; il filtro del modulo 01 lo garantisce).

### D. Flusso end-to-end atteso

1. `next dev` sul tenant; pagina `/form` (o home con form-demo).
2. Bridge MCP (`@olonjs/mcp`) → `listTools` del documento → contiene `submit-form`.
3. Agente: `executeTool('submit-form', {"name":..., "email":..., "message":...})`.
4. Client: `FormDemoSubmissionSchema.parse` → `submitFormLead` → `POST {CLOUD_URL}/form/send` con Bearer + Idempotency-Key.
5. Risposta `{ ok: true }` all'agente. (Endpoint cloud fittizio: in test si verifica URL e payload, non il backend.)

## Commands

```bash
npm test -w tenant-next                  # nuovi test submit (fetch mockato)
npm run build -w tenant-next             # next build: confine RSC ok
npm run verify:webmcp -w tenant-next     # feature-check esistente (scripts/webmcp-feature-check.mjs)
# manuale: next dev + @olonjs/mcp <url>/admin? NO — <url> visitor (bridge su pagina pubblica)
```

Nota verifica manuale: il bridge MCP oggi punta alla route admin (`normalizzata a /admin`); per la prova visitor serve puntare alla pagina pubblica — vedi Open Questions.

## Project Structure (file toccati)

```
apps/next/src/components/form-demo/submitFormLead.ts    # executor condiviso (nuovo)
apps/next/src/components/form-demo/index.ts             # webmcpTools + inputSchema (esteso)
apps/next/src/components/form-demo/schema.ts            # (riuso FormDemoSubmissionSchema, nessuna modifica attesa)
apps/next/src/lib/webmcp/visitorToolDefs.ts             # registro execute 'submit-form'
apps/next/src/lib/webmcp/toolRegistry.ts                # sectionPublicTools: form-demo → submit-form
apps/next/src/lib/webmcp/*.test.ts                      # test submit
```

## Code Style

Named exports; fetch con `Idempotency-Key` (parity alpha); errori come `Error` con messaggio chiaro (pattern `CloudLoadFailure` non pertinente qui — submit tool torna errori tool). Nessun valore hardcoded themed in JSX (non tocca View).

## Testing Strategy

- **submitFormLead (vitest, fetch mockato)**: URL esatto `{apiUrl}/form/send`; header Authorization/Idempotency-Key; payload completo (`recipientEmail`, `page`, `section`, `source`, `submittedAt`); errore su risposta non-ok; errore esplicito senza env cloud.
- **tool execute (vitest)**: `FormDemoSubmissionSchema.parse` rifiuta payload invalido → errore tool; payload valido → fetch chiamato.
- **wiring (vitest, pattern modulo 02)**: `sectionPublicTools['form-demo']` → `toolNames` sulla pagina `/form`; pagina senza form-demo → tool assente.
- **E2E manuale documentata**: `next dev` + bridge MCP su pagina pubblica (vedi Open Questions).

## Boundaries

- **Always**: validazione `FormDemoSubmissionSchema` prima del POST; path dichiarato dal dev (mai hardcodato in core); test verdi.
- **Ask first**: sostituire lo stub UI `FormDemoClient` con l'executor condiviso (fuori scope ma vicino — richiede decisione prodotto); aggiungere route handler Next.
- **Never**: logica submit in `@olonjs/core` o `@olonjs/studio`; base URL hardcodata; credenziali in payload.

## Success Criteria

1. `listTools` sulla pagina con form-demo contiene `submit-form`; senza form-demo non c'è.
2. `executeTool('submit-form', payload valido)` produce `POST {OLONJS_CLOUD_URL}/form/send` con header/payload corretti (test mockato verde).
3. Payload invalido → errore tool con messaggio Zod leggibile.
4. `next build` e suite `tenant-next` verdi; `verify:webmcp` non regressiona.
5. Prova manuale documentata nel PR/commit: agente via `@olonjs/mcp` esegue submit su tenant Next.

## Open Questions

- **Bridge MCP su pagina visitor**: il bridge oggi normalizza l'URL a `/admin` (packages/mcp). Per la prova end-to-end serve decidere se (a) puntare il bridge alla pagina pubblica con un flag, (b) eseguire la prova tramite browser tool su `/form`, o (c) estendere il bridge. Da decidere prima della fase PLAN.
- Il payload del tool deve includere `sectionId` esplicito, o basta il primo form della pagina? (Propongo: `sectionId` opzionale; default = prima sezione form-demo con `recipientEmail`.)
- `consequentialHint: true` giusto per submit? (Propongo sì — cambia stato esterno.)
