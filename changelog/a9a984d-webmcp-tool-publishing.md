# WebMCP Tool Publishing — tool dichiarati dalle section capsules

- **Commit di riferimento:** `a9a984d` (`feat(webmcp): section-declared WebMCP tools with public/admin surface + submit-form plugin`)
- **Spec:** `docs/specs/01-webmcp-tool-contract.md` · `02-webmcp-tool-public-runtime.md` · `03-webmcp-tool-submit-plugin.md`
- **Plan/Tasks:** `docs/plans/webmcp-tool-publishing-plan.md` (umbrella, fase 4) + piani 01/02/03 (task inclusi)
- **Intent:** `docs/intent/webmcp-tool-publishing.md`

## Cosa è cambiato

I dev dei tenant OlonJS possono ora **pubblicare i propri tool WebMCP legati alle section capsules**, con superficie esplicita `admin | public`. Il Core resta puro: fornisce contratto + runtime generico; gli executor sono sempre tenant-side.

1. **Core** (`@olonjs/core`): `WebMcpToolDef` (`name` kebab-case, `description`, `surface`, `inputSchema`, `annotations`) e `WebMcpConfig.tools`/`toolExecutors` nel JEB. Emissione `declaredTools` in page contract/site manifest/llms.txt in coda ai built-in (etichettati `admin`); collisione con built-in e nomi non kebab-case → errore esplicito.
2. **Studio** (`@olonjs/studio`): registrazione/dispatch dei tool dichiarati `admin` accanto a `update-section`/`save`, con cleanup deterministico.
3. **Tenant Next** (`apps/next`): capsule espongono `webmcpTools` (5° file TBP accanto a View/schema/types/index); `toolRegistry` aggrega; la pagina visitor passa all'isola **solo i nomi** (le funzioni non attraversano RSC); `agenticSurface` emette i tool public nei contract runtime.
4. **Plugin di riferimento `submit-form`**: capsule `form-demo` — validazione Zod sulla submission schema (ADR-0002) prima del POST, POST a path dichiarato dal dev (`form/send`) con Bearer + Idempotency-Key (parity tenant-alpha), errori leggibili.

## Spec 2.0 aggiornate (stesso cambio, commit successivo)

- **WTP 1.0** (nuova): WebMCP Tool Publishing Protocol — def, validazione, emissione, surface semantics, executor contract.
- **JEB 1.2 → 1.3**: `WebMcpConfig` con `tools`/`toolExecutors`.
- **TBP 1.1 → 1.2**: capsule con `webmcpTools.ts` opzionale.
- **JAP 1.3 → 1.4**: dispatch tool admin dichiarati nello Studio route body.
- Sync nelle references di `.cursor/skills/olonjs-tenant2/` (byte-identiche) + tabella protocolli in `CLAUDE.md`.

## Tabella versioni

| Pacchetto | Pubblicata da `release:enterprise` (utente, auto-patch) |
|---|---|
| `@olonjs/core` | 2.0.3 |
| `@olonjs/studio` | 0.2.3 |
| `@olonjs/react` | 0.2.3 |
| `@olonjs/next` | 0.0.15 |
| `@olonjs/cli` | 3.0.167 |
| `@jsonpages/cli` | 3.0.167 |

## Verifiche

- Core: 98 test · Studio: 16 · Tenant-next: 65 · typecheck + build verdi
- `test:boundary` verde · `build:all` verde · `dist:dna:all` + `check:templates` verdi
- **E2E su versioni pubblicate** (senza yalc/link): tenant scaffolato `webmcp-demo` (`npx @olonjs/cli@3.0.167`) in `/home/dev/temp/` —
  - contract `/schemas/form.schema.json`: `tools: [update-section/admin, save/admin, submit-form/public]`
  - `listTools()` su `/form` → `["submit-form"]`; su home → `[]`
  - `executeTool('submit-form', …)` → `{"ok":true}`; POST reale a `/form/send` osservato (Bearer + Idempotency-Key + payload completo)
  - payload invalido → issues Zod leggibili, nessun fetch
