# Governance: cursor rules e status ADR post-split ADR-0016

- **Commit di riferimento:** `5871ccf` (`docs(governance): fix stale cursor rules and ADR statuses (post ADR-0016 split)`)
- **Spec:** n/a (remediation documentale)
- **Plan/Tasks:** n/a

## Perché

L'analisi di drift del 2026-10-08 ha rilevato documentazione interna non più allineata allo stato reale del repo:

1. `.cursor/rules/core-engine.mdc` descriveva cartelle `runtime/`/`studio/` inesistenti nel core (layout pre-split ADR-0016).
2. `.cursor/rules/project.mdc` puntava a `specs/olonjsSpecs_V_1_5.md` (inesistente) e aveva la mappa package pre-split.

## Cosa è cambiato

- **`.cursor/rules/core-engine.mdc`** — riscritto sul layout reale post-ADR-0016: `contract/`, `dna/`, `webmcp/`, `assets/`, `core/` in `packages/core/src`.
- **`.cursor/rules/project.mdc`** — tabella package aggiornata (core/react/studio/next/mcp/sources/cli/stack + 3 app); spec puntata a `specs/CL/olonjsSpecs_V_1_6.md`.
- **ADR-0009** — status corretto: `Superseded by ADR-0016` (era senza status).
- **ADR-0014, ADR-0015** — status corretto: `Deprecated` (orfane, mai implementate; le responsabilità sono assorbite dal bootstrap SSR/statico del tenant Next).
- **ADR-0016** — status corretto: `Accepted` (era `Proposed` ma implementata e imposta da tempo).

## Verifiche

- Nessuna modifica di codice; solo documentazione.
- Coerenza con `docs/decisions/TEMPLATE.md` (vocabolario status).
