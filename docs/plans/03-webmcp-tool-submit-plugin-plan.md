# Plan: tool-submit-plugin (Modulo 03)

Data: 2026-10-08 · Status: in review
Spec: `docs/specs/03-webmcp-tool-submit-plugin.md` · Umbrella: `docs/plans/webmcp-tool-publishing-plan.md`

## Overview

Modulo 03: `submit-form`, primo tool plugin legato alla capsule `form-demo`, eseguito end-to-end da un agente su un tenant Next — POST a `{OLONJS_CLOUD_URL}/form/send` (path fittizio dichiarato dal dev), payload validato dallo `submissionSchema` (ADR-0002). Include la verifica pre-publish (senza pubblicare: la pubblicazione è utente-only, fase 4 dell'umbrella).

## Architecture Decisions

1. **Base URL sempre dall'env** (`NEXT_PUBLIC_OLONJS_CLOUD_URL` via `tenantEnv`/`cloudPolicy`, accesso diretto alle proprietà — inlining Next); il dev dichiara **solo il path variabile** (`form/send` per questo lavoro).
2. Executor condiviso `submitFormLead` (client): fetch diretto al cloud con Bearer + Idempotency-Key (parity alpha `useOlonForms`); nessun route handler Next in questo modulo.
3. Validazione con `FormDemoSubmissionSchema.parse` prima del POST — coerenza con `sectionSubmissionSchemas` del contract (ADR-0002).
4. `inputSchema` del tool = shape del form (`name/email/message`); `sectionId` opzionale con default al primo form della pagina (assunto OQ #3).
5. UI umana (`FormDemoClient` stub) resta **fuori scope**: la barra è il percorso agente→tool.
6. T9 termina con `dist:dna:all` + `check:templates` (il DNA del CLI porta il nuovo codice alla publish) e **STOP** — la pubblicazione è dell'utente.

---

## Task 7: submitFormLead executor (apps/next)

**Description:** `src/components/form-demo/submitFormLead.ts` (client): POST a `{cloudPolicy.apiUrl}/{path}` con `path` dichiarato dal dev (default `form/send`), Bearer + Idempotency-Key, payload `{args, recipientEmail, page, section, source:'olon-webmcp', submittedAt}`; errore esplicito senza env cloud.

**Acceptance criteria:**
- [ ] URL = `{apiUrl}/form/send` (path dev-dichiarato, slash normalizzati)
- [ ] Header e payload corretti (parity alpha)
- [ ] Risposta non-ok → Error con messaggio; env mancante → Error chiaro

**Verification:**
- [ ] `npm test -w tenant-next` (fetch mockato: URL, header, payload, errori)

**Dependencies:** None (logica pura) · **Files:** `submitFormLead.ts` (nuovo), test · **Scope:** S

## Task 8: Capsule form-demo espone il tool (apps/next)

**Description:** `index.ts` della capsule esporta `webmcpTools` con `submit-form` (`surface: 'public'`, `inputSchema` coerente con `FormDemoSubmissionSchema` via `z.toJSONSchema()`, `consequentialHint: true`); wiring: `visitorToolDefs['submit-form']` con `execute` che valida con `FormDemoSubmissionSchema.parse` e chiama `submitFormLead`; `toolRegistry.sectionPublicTools = { 'form-demo': ['submit-form'] }`.

**Acceptance criteria:**
- [ ] `sectionPublicTools` mappa form-demo → submit-form
- [ ] `execute` valida prima del POST (payload invalido → errore tool Zod leggibile)
- [ ] `ctx` (recipientEmail, sectionId, pageSlug) risolto; `sectionId` opzionale con default primo form

**Verification:**
- [ ] `npm test -w tenant-next` (wiring + validazione)
- [ ] `npm run typecheck -w tenant-next`

**Dependencies:** T6 (modulo 02), T7 · **Files:** `components/form-demo/index.ts`, `visitorToolDefs.ts`, `toolRegistry.ts`, test · **Scope:** M

## Task 9: Verifica pre-publish (agente, NO publish)

**Description:** Giro completo: suite monorepo, `build:all`, `dist:dna:all` (rigenera il DNA del CLI perché la publish porti il nuovo codice nelle template next), `check:templates`. Poi **STOP**.

**Acceptance criteria:**
- [ ] Tutte le suite verdi; `test:boundary` verde
- [ ] `dist:dna:all` eseguito e `check:templates` verde (DNA aggiornato con form-demo tool)
- [ ] Diff del DNA rivisto (umanamente, in fase di review finale)

**Verification:**
- [ ] `npm run build:all` · `npm run test:boundary` · `npm run check:templates`

**Dependencies:** T8 · **Files:** nessuno (artefatti DNA in `packages/cli/assets/templates/next/`) · **Scope:** S (esecuzione)

### Checkpoint 3 — ✅ IMPLEMENTAZIONE COMPLETA · 🔴 STOP: l'utente pubblica (fase 4 → umbrella `docs/plans/webmcp-tool-publishing-plan.md`)

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Env cloud assente in locale | Med | Errore esplicito dell'executor (test dedicato); la prova E2E usa un CLOUD_URL di test |
| DNA rigenerato male → template next senza il tool | High | `check:templates` + review umana del diff DNA prima della publish |
| `Idempotency-Key`/header non parity con alpha | Low | Test mockato su header esatti |

## Open Questions (assunte — review finale prima della publish)

- Bridge MCP su visitor per la prova E2E: flag `--visitor` su `@olonjs/mcp` (assunto; aggiunge il package alla batch di pubblicazione) vs browser tool. Da confermare prima di T12.
- `sectionId` opzionale con default primo form (assunto).
- `consequentialHint: true` per submit (assunto).
