# FENICE 3D World
## Sprint Board - Week 1

Data inizio: 2026-02-22
Data fine: 2026-02-28

## Goal sprint
Consolidare fondazioni M1: protocollo v1 approvato + city statica funzionante da OpenAPI.

## This Week (P0)
| ID | Task | Owner | ETA | Status | Dipendenze |
|---|---|---|---|---|---|
| W1-T01 | Approva ADR-001/002/003 | Shared | 1d | DONE | - |
| W1-T02 | Pubblica schema `world-events-v1` | Claude | 1d | DONE | W1-T01 |
| W1-T03 | Projection service skeleton | Claude | 2d | DONE | W1-T01 |
| W1-T04 | World gateway WS skeleton | Claude | 2d | DONE | W1-T01 |
| W1-T05 | Bootstrap client React+R3F | Claude | 1d | DONE | - |
| W1-T06 | Parser OpenAPI -> world model | Claude | 2d | DONE | W1-T05 |
| W1-T07 | Render city statica (buildings+edges) | Claude | 2d | DONE | W1-T06 |
| W1-T11 | Demo dry run end-to-end | Claude | 1d | DONE | W1-T07,W1-T08 |

## Next (P1)
| ID | Task | Owner | ETA | Status | Dipendenze |
|---|---|---|---|---|---|
| W1-T08 | Side panel dettagli endpoint | Claude | 1d | DONE | W1-T07 |
| W1-T09 | Resume token + seq ordering | Claude | 1d | DONE | W1-T04 |
| W1-T10 | Contract tests protocollo producer/consumer | Claude | 1d | DONE | W1-T02,W1-T09 |

## Blocked
_Nessun task bloccato._

## Done
- W1-T01: ADR-001/002/003 approvati (2026-02-21)
- W1-T02: Schema world-events-v1 pubblicato via Zod schemas (PR #61)
- W1-T03: ProjectionService implementato (PR #61)
- W1-T04: World Gateway WS implementato (PR #61)
- W1-T09: Resume token + seq ordering implementato (PR #61)
- W1-T05: Bootstrap client React+R3F (2026-02-22)
- W1-T06: Types, WS connection, Zustand stores (2026-02-22)
- W1-T07: City statica con buildings, edges, districts (2026-02-22)
- W1-T08: Side panel dettagli endpoint (2026-02-22)
- W1-T10: Contract tests WS producer/consumer — 31 test (2026-02-22)
- W1-T11: Demo dry run e2e — 23 test acceptance criteria M1 verificati (2026-02-22)

## Sprint Summary
**Sprint COMPLETATO** — 11/11 task chiusi (2026-02-22)
- Total test: 397 (373 backend/e2e + 24 client)
- Acceptance criteria M1: tutti verificati programmaticamente
- KPI M1: build success 100%, p95 init < 1200ms, 0 errori bloccanti

## Daily update template
```md
### YYYY-MM-DD
- Task: W1-TXX
- Owner: name
- Stato: IN_PROGRESS / BLOCKED / DONE
- Delta: cosa e' stato completato
- Rischio: eventuale blocker
- Next: prossimo passo
```
