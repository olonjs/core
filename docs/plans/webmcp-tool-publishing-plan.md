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
2. **Contract pagina pubblica** (da spec 01): elencare tutto con `surface` discriminante (assunto).
3. **`sectionId` nel payload submit** (da spec 03): opzionale, default primo form (assunto).
4. **`inputSchema` opzionale** con default `{type:'object',properties:{}}`; **nomi kebab-case validati** (assunti).
5. **Versioni publish** (proposta): core `2.0.2→2.1.0`, studio `0.2.2→0.3.0`, cli `3.0.166→3.1.0`, mcp `1.0.155→1.0.156`. Decide l'utente.
6. **Slug tenant scaffold**: proposto `webmcp-demo` in `/home/dev/temp/`. Confermare.

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
- [ ] Versioni confermate dall'utente e pubblicate su npm
- [ ] `npm view @olonjs/core version` ecc. mostrano le nuove versioni

**Dependencies:** T9 · **Scope:** utente

## Task 11: Scaffold tenant in /home/dev/temp (agente, post-publish)

**Description:** `cd /home/dev/temp && npx @olonjs/cli new tenant webmcp-demo --template next` (slug proposto, confermare). Il tenant nasce con il nuovo DNA (submit tool nella capsule form-demo) e dipende dalle versioni npm pubblicate. Config env: `.env.local` con `NEXT_PUBLIC_OLONJS_CLOUD_URL` (valore per la prova, indicato dall'utente) — nessuna chiave in chat/repo.

**Acceptance criteria:**
- [ ] Tenant creato in `/home/dev/temp/webmcp-demo`, `npm install` verde
- [ ] `package.json` del tenant pinna le versioni pubblicate (non workspace/link)
- [ ] `npm run dev` parte; `/form` renderizza form-demo

**Verification:**
- [ ] `npm run build` del tenant verde
- [ ] Check manuale: pagina `/form` carica

**Dependencies:** T10 · **Files:** solo `/home/dev/temp/webmcp-demo/**` (fuori dal repo) · **Scope:** S

## Task 12: Verifica end-to-end (agente)

**Description:** Sul tenant scaffoldato: bridge MCP (con flag visitor se approvato) → `listTools` sulla pagina con form-demo contiene `submit-form` → `executeTool('submit-form', {name,email,message})` → POST a `{CLOUD_URL}/form/send` osservato → risultato ok. Documentare la prova.

**Acceptance criteria:**
- [ ] `submit-form` presente in `listTools` solo sulla pagina con form-demo
- [ ] Esecuzione reale osservata: URL/header/payload corretti
- [ ] Payload invalido → errore tool leggibile

**Verification:**
- [ ] Prova manuale con bridge MCP (o browser tool se OQ #1 risolta con (b))
- [ ] Report finale in chat con evidenze

**Dependencies:** T11 · **Scope:** S (esecuzione + report)

### Checkpoint finale
- [ ] Tutti i success criteria delle 3 spec soddisfatti
- [ ] Report consegnato all'utente
- [ ] Changelog proposto per il commit (convenzione repo: `/changelog/<commit>.md` a commit dell'utente)
