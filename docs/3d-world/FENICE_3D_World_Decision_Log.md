# FENICE 3D World
## Decision Log

## 2026-02-21
1. Decisione: MVP senza WASM.
   - Razionale: ridurre complessita' e accelerare rilascio M1.
   - Impatto: WASM valutato dopo KPI reali.

2. Decisione: protocollo Snapshot/Delta versionato.
   - Razionale: ordering, reconnect, compatibilita'.
   - Impatto: necessita' schema e contract tests.

3. Decisione: World Gateway separato dal WS chat channel.
   - Razionale: isolamento failure domain e scalabilita'.
   - Impatto: nuovo componente runtime.

4. Decisione: AI Builder in modalita' PR-only.
   - Razionale: sicurezza e governance del codice.
   - Impatto: nessun write diretto su main.

5. Decisione: Approvazione ADR-001, ADR-002, ADR-003.
   - Razionale: tutti e tre solidi, nessuna modifica richiesta.
   - Impatto: sblocca task W1-T01 e tutte le dipendenze M1.
   - Owner: Giuseppe

## Template nuova decisione
```md
## YYYY-MM-DD
1. Decisione: ...
   - Razionale: ...
   - Impatto: ...
   - Owner: ...
   - Revisione prevista: ...
```
