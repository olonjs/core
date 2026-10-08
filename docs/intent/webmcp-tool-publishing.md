# Intent: WebMCP Tool Publishing (Next)

Data: 2026-10-08 · Stato: confermato dall'utente (intervista `interview-me`). Questo documento è l'intent approvato; spec e plan sono downstream.

## Outcome

Un modello di pubblicazione dei tool WebMCP per i siti OlonJS su **Next**: il dev dichiara i tool **nella capsule della sezione** (accanto a `View.tsx`/`schema.ts`/`types.ts`), con una superficie `public | admin` dichiarata dal dev. Ogni tool viene registrato a runtime, **emesso nel page contract** (`/schemas/<slug>.schema.json`) così gli agenti lo scoprono, ed eseguito tramite il bridge MCP esistente.

Contratto del tool: `{ name, description, inputSchema, surface, execute }`.

- **L'executor è sempre del dev** (fetch a route handler, chiamata a servizio esterno, logica locale).
- La convenienza "base URL dall'env + path dichiarato" è **specifica del submit di riferimento**, non parte del contratto generale.
- Il modello regge anche tool read-only (`search_product`, `annotations.readOnlyHint`) e stateful (`add_to_cart`): il canale è dichiara→scopri→esegui delegato; lo stato e la logica di dominio vivono nell'executor del dev (stessa divisione di ADR-0018).

## User

Il dev che costruisce un sito OlonJS su Next — e l'agente che lo usa (submit, search, carrello sono la stessa classe di problema).

## Why now

Chiudere il divario alpha→Next: su Next oggi `update-section`/`save` sono chiusi in Studio (`packages/studio/src/StudioRouteBody.tsx`) e il submit è uno stub (`apps/next/src/components/form-demo/FormDemoClient.tsx`). Serve che un agente possa inviare un form vero su un sito Next, e che i dev possano pubblicare i propri tool invece di usare solo quelli integrati.

## Success (barra end-to-end)

`submit-form` — primo plugin di riferimento, legato alla capsule `form-demo` — eseguito da un agente **via bridge MCP su un tenant Next**: il tool POSTa a `{OLONJS_CLOUD_URL}/form/send` (path fittizio dichiarato dal dev), con payload validato dallo `submissionSchema` della sezione (ADR-0002). Il modello public/admin è il mezzo; l'invio reale è la prova.

## Constraint

- **Il core resta puro**: zero logica di submit nel core; il core generalizza solo l'emissione del contract (`tools[]` include i tool dichiarati, non solo update/save).
- Base URL sempre dalla catena env cloud esistente (`NEXT_PUBLIC_OLONJS_CLOUD_URL` con fallback `NEXT_PUBLIC_JSONPAGES_*`, via `tenantEnv`/`cloudPolicy`); **il dev dichiara solo il path variabile** (`form/send` per questo lavoro). Accesso diretto alle proprietà `process.env.NEXT_PUBLIC_*` (mai indexing — inlining Next).
- Una proprietà di superficie, **non due percorsi di registrazione** (speculare a `scope: 'local' | 'global'`).

## Out of scope

- Endpoint cloud reale (basta `form/send` fittizio).
- Tool generici oltre a submit (il modello li regge — validato con lo scenario search_product/carrello — ma questo lavoro prova solo submit).
- Persistenza / cloud save.
- tenant-alpha (Next è l'unico target).

## Decision log (dall'intervista)

1. I tool vivono **nella capsule della sezione**: il tool compare solo se la sezione è sulla pagina (es. submit "se presente").
2. Modello `public` vs `admin` come primo passo: il dev dichiara dove pubblicare. Accettato con la condizione "una proprietà, non due percorsi".
3. Success = end-to-end reale (a), non solo il modello di dichiarazione (b).
4. Submit: base URL dall'env `OLONJS_CLOUD_URL`; il dev dichiara solo l'altro pezzo (path variabile); per questo lavoro basta `form/send` fittizio.
5. Precisazione accettata: executor libero nel contratto generale; convenienza env specifica del submit.

## Struttura proposta (per la spec)

- `tool-contract` — dichiarazione + registrazione + emissione contract (core/studio).
- `tool-public-runtime` — superficie di esecuzione tool nell'isola visitor Next (oggi read-only).
- `tool-submit-plugin` — plugin di riferimento submit-form end-to-end (dipende dai primi due).

Spec per modulo in `docs/specs/<UID>-<slug>.md`, plan per modulo in `docs/plans/<UID>-<slug>-plan.md` — **un documento per piano, con i task inclusi** (nessun todo separato). Umbrella del programma: `docs/plans/webmcp-tool-publishing-plan.md`.
