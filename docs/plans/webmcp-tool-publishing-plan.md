# Plan: WebMCP Tool Publishing (Next) — Umbrella

Data: 2026-10-08 · Status: in review — da approvare prima dell'implementazione
Intent: `docs/intent/webmcp-tool-publishing.md`

**Piani modulo (un documento ciascuno, task inclusi):**
- `docs/plans/01-webmcp-tool-contract-plan.md` — T1-T4 + Checkpoint 1
- `docs/plans/02-webmcp-tool-public-runtime-plan.md` — T5-T6 + Checkpoint 2
- `docs/plans/03-webmcp-tool-submit-plugin-plan.md` — T7-T9 + Checkpoint 3 (STOP)
- **Fase 4 (post-publish)**: questo documento — T10-T12 + Checkpoint finale

## Overview

Tre moduli in ordine di build: (01) dichiarazione tool nelle capsule + registrazione admin + emissione contract nel core; (02) esecuzione tool `public` sull'isola visitor Next; (03) plugin di riferimento `submit-form` end-to-end su form-demo. Obiettivo finale: tenant Next scaffoldato in `/home/dev/temp/<slug>` via CLI che consuma le **versioni pubblicate su npm** e verifica end-to-end con il bridge MCP.

**Publish gate (regola utente, non negoziabile):** l'agente implementa, si ferma, **l'utente pubblica e SOLO lui**; poi l'agente riprende con scaffold + verifica. L'agente non esegue mai `npm publish` né `release.js`. Niente yalc/link locali.

## Architecture Decisions (trasversali)

1. **Una proprietà, non due percorsi** — `surface: 'admin' | 'public'` nella def del tool; il runtime di registrazione è unico (`registerWebMcpTool`), filtrato per superficie.
2. **`execute` è tenant-side** — non serializzabile via RSC: la pagina passa all'isola solo i **nomi** dei tool abilitati (dalle sezioni presenti); il client risolve nome→def con executor.
3. **`inputSchema` = JSON Schema già serializzato** (Zod v4 `z.toJSONSchema()`); il core non importa Zod per i tool dichiarati.
4. **Contract emissione**: `WebMcpToolContract` guadagna `surface`; built-in etichettati `admin`; declaredTools in coda; collisione nome con built-in → errore esplicito.
5. **Submit reference**: base URL dalla catena env esistente (`tenantEnv`/`cloudPolicy`), il dev dichiara solo il path variabile (`form/send`); parity alpha su header (Bearer + Idempotency-Key).
6. **E2E sul visitor**: estendere `@olonjs/mcp` con flag `--visitor` (o URL target non normalizzato a `/admin`) — proposta, vedi Open Questions. Implica un 4° package nella batch di pubblicazione.

## Risks (globali)

| Risk | Impact | Mitigation |
|---|---|---|
| Auth npm bloccata (NPM_TOKEN E401, todo-zod-v4 T16) | High | Publish è utente-owned; il piano si ferma al gate T10 e riprende a pubblicazione avvenuta |
| DNA CLI non rigenerato prima della publish | High | T9 include `dist:dna:all` + `check:templates` nel checkpoint 3 (pre-stop) |
| Bridge MCP normalizza a `/admin` → E2E visitor impossibile | High | Open Question #1: flag `--visitor` in @olonjs/mcp |
| Confine RSC (funzioni serializzate) | Med | Design "solo nomi" (piano 02); `next build` è il gate |
| Emissione contract rompe test esistenti | Med | Checkpoint 1 gate; test di regressione dedicati |

## Open Questions (assunte con le proposte — review finale prima della publish)

1. **Bridge MCP su visitor** (da spec 03): **RISOLTA — (b)**: nessuna modifica a `@olonjs/mcp` (il bridge serviva quando non c'era un browser per testare WebMCP; la verifica T12 userà il browser tool direttamente sulla pagina visitor). `@olonjs/mcp` NON entra nella batch di pubblicazione.
2. **Contract pagina pubblica** (da spec 01): elencare tutto con `surface` discriminante — **verificato T12**: contract `/form` emette `update-section/admin`, `save/admin`, `submit-form/public`.
3. **`sectionId` nel payload submit** (da spec 03): opzionale, default primo form — **verificato T12**: `section: form-demo` dedotto dal form.
4. **`inputSchema` opzionale** con default `{type:'object',properties:{}}`; **nomi kebab-case validati** — **verificato**: `submit-form` validato; errori Zod leggibili via tool.
5. **Versioni publish**: **RISOLTA dall'utente** — `npm run release:enterprise` (numerazione patch, niente minor bump). Pubblicate: `@olonjs/core 2.0.3`, `@olonjs/studio 0.2.3`, `@olonjs/react 0.2.3`, `@olonjs/next 0.0.15`, `@olonjs/cli 3.0.167` (propagazione registry ~90s).
6. **Slug tenant scaffold**: `webmcp-demo` in `/home/dev/temp/` — **eseguito T11**.

---

# Fase 4 — Post-publish

## Task 10: PUBLISH — SOLO UTENTE

**Description:** L'agente non esegue nulla. L'utente pubblica con le sue credenziali:
```bash
npm publish -w @olonjs/core      # proposta 2.1.0
npm publish -w @olonjs/studio    # proposta 0.3.0
npm publish -w @olonjs/cli       # proposta 3.1.0 (DNA rigenerato in T9)
```
(Versioni e ordine decisi dall'utente. `@olonjs/mcp` escluso: OQ#1 risolta con (b).)

**Acceptance criteria:**
- [x] Versioni confermate dall'utente e pubblicate su npm — `release:enterprise`: core 2.0.3 · studio 0.2.3 · react 0.2.3 · next 0.0.15 · cli 3.0.167
- [x] `npm view @olonjs/core version` ecc. mostrano le nuove versioni (verificato, propagazione ~90s)

**Dependencies:** T9 · **Scope:** utente

## Task 11: Scaffold tenant in /home/dev/temp (agente, post-publish)

**Description:** `cd /home/dev/temp && npx @olonjs/cli new tenant webmcp-demo --template next` (slug proposto, confermare). Il tenant nasce con il nuovo DNA (submit tool nella capsule form-demo) e dipende dalle versioni npm pubblicate. Config env: `.env.local` con `NEXT_PUBLIC_OLONJS_CLOUD_URL` (valore per la prova, indicato dall'utente) — nessuna chiave in chat/repo.

**Acceptance criteria:**
- [x] Tenant creato in `/home/dev/temp/webmcp-demo`, `npm install` verde (eseguito dal CLI)
- [x] `package.json` del tenant pinna le versioni pubblicate (core ^2.0.3, react ^0.2.3, studio ^0.2.3, next ^0.0.15 — nessun workspace/link)
- [x] `npm run dev` parte; `/form` renderizza form-demo (HTTP 200)

**Verification:**
- [x] `npm run build` del tenant verde (5.8s, 6/6 pagine statiche)
- [x] Check manuale: pagina `/form` carica; DNA contiene i nuovi file (`webmcpTools.ts`, `submitFormTool.ts`, `resolvePublicToolNames.ts`)

**Dependencies:** T10 · **Files:** solo `/home/dev/temp/webmcp-demo/**` (fuori dal repo) · **Scope:** S

## Task 12: Verifica end-to-end (agente)

**Description:** Sul tenant scaffoldato: bridge MCP (con flag visitor se approvato) → `listTools` sulla pagina con form-demo contiene `submit-form` → `executeTool('submit-form', {name,email,message})` → POST a `{CLOUD_URL}/form/send` osservato → risultato ok. Documentare la prova.

**Acceptance criteria:**
- [x] `submit-form` presente in `listTools` solo sulla pagina con form-demo (`/form`: `["submit-form"]`; home: `[]`)
- [x] Esecuzione reale osservata: POST `{CLOUD_URL}/form/send` con Bearer + Idempotency-Key + payload completo (echo server: `/tmp/olon-echo.log`)
- [x] Payload invalido → errore tool leggibile (issues Zod `too_small`/`invalid_format`)

**Verification:**
- [x] Prova con browser tool sulla pagina visitor (OQ #1 risolta con (b))
- [x] Report finale in chat con evidenze

**Dependencies:** T11 · **Scope:** S (esecuzione + report)

### Checkpoint finale
- [ ] Tutti i success criteria delle 3 spec soddisfatti
- [ ] Report consegnato all'utente
- [ ] Changelog proposto per il commit (convenzione repo: `/changelog/<commit>.md` a commit dell'utente)
