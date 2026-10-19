# Passaggio di consegne — la città nuova (19 ottobre, sera)

## Dove sta tutto
- **Ramo base**: `claude/gallant-dijkstra-sa2548` (contiene `main`, la città per epoche, vestiti di `bold-goldberg`, tutti i documenti).
- **Città nuova**: si vede solo con `?cittanuova`; generatore `v7/src/world_cittanuova.js`.
- **Documenti** (leggere in quest'ordine): `PIANO_CITTA.md` (il progetto per epoche, approvato) → `MANCANZE.md` (cosa manca, ~80 pezzi)
  → `LEGGIBILITA.md` (misure per l'assonometria, 40 elementi di strada, tetti, composizione tipografica, rete elettrica) →
  `PIANO_LAVORO.md` (le chat parallele e chi possiede cosa) → `PROTOCOLLO_AGENTI.md` (come lavorano i filoni senza sprecare token).
- **Strumenti**: `v7/strumenti/pianta.js` (pianta dall'alto), `v7/strumenti/copertura.js` (costruito per quartiere),
  `v7/strumenti_inverno/shot_gioco.js` (foto, `PV_QUERY=?cittanuova`), `studio_oggetti.js` (modelli da soli). Build: `cd v7 && python3 build.py`.

## Fatto in questa sessione
- Tappa 1 (ossatura per epoche) e tappa 2: **isolati pieni e scavati** (`PIENO` in world_cittanuova.js): borgo a lotti stretti in
  aderenza con corti e case-torre, griglia murattiana a cortina continua con la corte, Mercato da 46 a 32 m. Copertura borgo 32→51%,
  Ottocento 25→41%. `rd.era` su tutte le strade.

## Filoni: lavoro salvato su rami `claude/wip-*` (WIP, da verificare prima di unire)
| Ramo | Filone | Stato |
|---|---|---|
| `claude/wip-k-vita` | K città viva: `posti.js`, scene legate a posto e ora, riempimento | il più avanti; provare `test_posti.js`, `test_citta_viva.js`, `test_eventi.js` |
| `claude/wip-c-botteghe` | C botteghe al piano terra (`b.shopFront`) e interni | parziale |
| `claude/wip-d-segni` | D regista delle pagine `scena.js`, rete elettrica `rete.js`, suoli, segni, dehors | parziale |
| `claude/wip-m4-pezzi` | M4 libreria `pezzi_citta.js` (campanile, portici, stazione, Rocca, Vele...) | appena iniziato |
| `claude/wip-s-sottosuolo` | S sottosuolo stratificato, ritrovamenti (dinosauro, autobus), catacombe | appena iniziato |
| `claude/wip-m1-oggetti` | M1 oggetti di strada rifiniti | appena iniziato |
| — | M3 facciate e tetti per epoca | era in corso, nessun commit salvato: rilanciare |
| — | M2 veicoli e barche | fermato in lettura: rilanciare |
I brief completi dei filoni sono ricostruibili da `PIANO_LAVORO.md` + `LEGGIBILITA.md` + `PROTOCOLLO_AGENTI.md`.

## Prossimi passi
1. Per ogni ramo WIP: unire su un ramo di prova, far girare le prove, guardare 3-4 foto; tenere solo ciò che regge.
2. Ordine di unione: M4 → M3 → M1/M2 → D → C → K → S (scheletro e pezzi prima, superfici poi, vita alla fine).
3. Rilanciare M3 (decisivo: oggi tutte le case usano lo stesso kit NY con scale antincendio, anche nel borgo) e poi E/F/G del piano
   (marina e stazione, Novecento e boom sulla collina ovest, Rocca e spianata frastagliata).
4. Difetti noti da togliere: nuvola nera di particelle nel borgo (1400,312 e 1420,365), casa nera trasparente (varco a retino acceso),
   terreno a colori sbagliati sulla collina ovest (1190,330).

## Il committente vuole
Città viva, piena, cinematografica: ogni scorcio come un fotogramma, composizione quasi tipografica (un dominante, molto vuoto, niente
strati accumulati), modelli rifiniti e collegati, rete elettrica incasinata ma non a caso, sottosuolo con la storia, scene di vita legate
ai luoghi e alle ore. Qualità prima dei token, ma senza sprechi: niente riavvii, letture mirate.
