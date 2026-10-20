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

## Filoni
**Uniti nel ramo base (20 ottobre)**, con le prove verdi salvo dove detto:
- **M3 facciate e tetti per epoca** (`render.js` `[epoche] L'ARCHITETTURA PER EPOCA`, `tetti.js`): `b.era` decide tavolozza, finestre, porte,
  tetti, portici, scale; pezzi modellati (cornici, ringhiere, conci, coppi); via il kit NY dalle case storiche; corretta la rotazione
  dei corpi in `buildModular` (le «falde che spuntano»). Restano: 35 coppie di case del borgo con dislivello > 1 piano (lo decide il
  generatore), angoli smussati dell'Ottocento, pannelli beige su una casa-torre della marina, draw call ~800-1150 (obiettivo 300 lontano già prima).
- **D regista delle pagine e rete elettrica** (`scena.js`, `rete.js`, `render.js` `[segni]`, `test_segni.js`): 30 impaginazioni,
  rete come grafo con allacci abusivi, suoli/segni/targhe/civici/lampioni per epoca, dehors. **Prova rossa**: con il borgo pieno gli
  abusivi delle baracche scendono a 6 (contro 16 nel borgo): ritarare le sorgenti vicino alle baracche in `rete.js` sez. 3.
  Restano: tavolini dei dehors poco visibili, basoli poco leggibili a zoom 0,4, stencil del regime, tag/sticker di `writing.js`, transenne e semafori fuori dal regista.
- **C botteghe sotto casa e interni** (`b.shopFront`, `interiors.js` con bottega + androne, 9 mestieri nuovi, `fronteBottega`, `test_botteghe.js`):
  74 botteghe. Restano: il fronte da fuori mai visto in foto; solo sul kit modulare; insegne lunghe.
- **K città viva** (`posti.js` 246 posti di 17 tipi, 49 scene legate a posto e ora, riempimento in `popolo.js`, `test_posti.js`, `test_citta_viva.js`).
  Restano: le foto non mostrano la gente (lo strumento teletrasporta e scatta subito: riempire i posti all'arrivo o aspettare minuti di gioco),
  l'auto che frena in `due_vetri`, il bastone, `test_eventi.js` a volte instabile.

**Da rilanciare** (lavoro parziale sui rami): `claude/wip-m4-pezzi` (pezzi urbani grandi), `claude/wip-s-sottosuolo`,
`claude/wip-m1-oggetti`; M2 veicoli da zero.

## Prossimi passi
1. **Il varco a retino** (la pioggia di puntini neri e la casa trasparente fra camera e personaggio) domina ogni foto ravvicinata: va rifatto prima di giudicare le superfici.
2. Ritarare gli abusivi delle baracche (prova rossa di `test_segni.js`); foto mirate del fronte delle botteghe e delle scene di K.
3. Rilanciare M4, M1, M2, S dai loro rami; poi E/F/G del piano
   (marina e stazione, Novecento e boom sulla collina ovest, Rocca e spianata frastagliata).
4. Difetti noti da togliere: nuvola nera di particelle nel borgo (1400,312 e 1420,365), casa nera trasparente (varco a retino acceso),
   terreno a colori sbagliati sulla collina ovest (1190,330).

## Il committente vuole
Città viva, piena, cinematografica: ogni scorcio come un fotogramma, composizione quasi tipografica (un dominante, molto vuoto, niente
strati accumulati), modelli rifiniti e collegati, rete elettrica incasinata ma non a caso, sottosuolo con la storia, scene di vita legate
ai luoghi e alle ore. Qualità prima dei token, ma senza sprechi: niente riavvii, letture mirate.
