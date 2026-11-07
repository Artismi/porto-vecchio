# Porto Vecchio — INTEGRAZIONE 1 (ramo `integra1`)

Un ramo solo con tutto il lavoro di stile approvato, e lo **stile E («via di mezzo 55») che viaggia dentro la cottura dei tasselli**: una
cottura sola porta A ed E, il gioco sceglie al caricamento (o dal vivo). Il difetto resta **A**.

## 1. Cosa è entrato

Base: `claude/shader-styling-performance-wbvqfy` (main + l'ultimo handoff, `db245d6`). Unioni, in quest'ordine:

| ramo | cosa | conflitti |
|---|---|---|
| `fumetto2` | il passo E in render.js (tavolozza, tratteggio, inchiostro, separazione, contorno vettoriale, bollino), il grading di E (`STILE.V.E`), `PV_STILE` in index.src.html, i pezzi segnati `userData.rc` e i secchi di `mergeGroup`; BIBBIA_STILE.md (terza versione), `_immagini/fumetto2/` | solo i generati (index.html, editor.html): rifatti con build.py |
| `worktree-agent-a602f8ba0cfa26e85` (rifinitura suolo) | `src/rifinitura_suolo.js`, i rami `rsK` in pavimenti.js e riva.js, il mare; RIFINITURA_SUOLO.md | solo i generati |
| `worktree-agent-a54bb8a2c8c1c6cf1` (rifinitura costruito) | `src/rifinitura_costruito.js` (l'aggancio onBeforeCompile), `applicaE` in tetti_vissuti.js, arredo3d.js, segnaletica.js, pezzi_citta.js, `test_rifcostruito.js`; RIFINITURA_COSTRUITO.md | i generati e mondo_cotto.js (ricotto: tetti_vissuti.js è fra le FONTI) |
| `worktree-agent-ac6342b3a153e3041` (camera9 + lontano9) | la camera bassa dietro `?camera9`, il lontano dietro `?lontano9` | solo i generati. **Tutte e due spente per difetto**, le camere di difetto non cambiano |
| `worktree-agent-af1ed155bd80a34b0` (strada dipinta, `f4af27a`) | `src/strada_dipinta.js` (graffiti, manifesti, adesivi, tag con le regole), `fondaleMuroG` in writing.js, la tabella Oklab in writer_arte.js, writer_vita.js, pennelli.js, `test_strada_dipinta.js`; STRADA_DIPINTA.md | solo i generati (la sua unione di camera9 c'era già) |

render.js, il file grande, si è unito da solo in tutti e cinque i passi (i cantieri toccavano zone diverse).

## 2. Il problema

La città vera arriva a tasselli cotti: il workflow `tasselli.yml` costruisce il gioco in Chromium senza testa (`strumenti/tassella.js`,
`index.html?tutto&noanimus&tasselli=0`), `tassella_pagina.js` cammina la scena e scrive mesh, materiali **con gli shader già trasformati da
onBeforeCompile** (testo cotto: `cvs`/`cfs`, le uniform aggiunte `cuni`), tessiture, `userData` dei materiali (solo i valori semplici).
`src/tasselli.js` rifà i materiali da quei record. Tutto quello che E faceva nei materiali nasceva solo con `?stile=E` nel caricamento della
cottura, che non l'ha: i rami `rsK`, `applicaE` dei tetti, l'aggancio del costruito, le tinte della tavolozza, le insegne e le tele di E, i
pezzi segnati. Sul sito E non si vedeva (solo il passo unico, che è del gioco).

## 3. Come E viaggia nella cottura (`src/stile_e.js`, StileE)

Tre stati: **A** (niente rami: lo shader e i materiali di prima), **E** (rami accesi), **la cottura** (`?cottae`, la mette `tassella.js`):
i rami E entrano negli shader e i materiali portano le varianti, ma tutti i valori sono quelli di A.

**Gli shader: le manopole.** Ogni ramo E dipende da una manopola, una `uniform float`: `rsK` (suolo: pavimenti, riva, prato, mare) e `rcK`
(costruito: l'aggancio dell'intonaco e degli atlanti, il manto dei tetti, l'usura e il tono delle vesti dei pezzi). `StileE.pre(nome)` la
dichiara una volta sola per programma (`#ifndef PVE_rcK`): nella cottura e con E è `uniform float rcK;`, con A è `#define rcK 0.` e il
compilatore toglie il ramo. Le manopole sono **uniform di modulo** (`StileE.U`, messe in `Render.__tass.uni`): la cottura le segna `live` e
`tasselli.js` le ritrova per nome, col valore dal vivo (1 con E, 0 con A). Al caricamento di un tassello `StileE.adatta()` riscrive il testo
cotto: con A le manopole tornano la costante 0 (lo shader di A), con E restano uniform; la chiave del programma segue lo stile
(`StileE.chiave()`), così il cambio dal vivo ricompila.

- `tetti_vissuti.js`: il manto di A e quello di E (`applicaE`) stanno nello **stesso shader**: `if (rcK > .5) { manto E } else { manto A }`.
  Il testo del manto di A è quello di prima (`pezziA`); l'ardesia, che in A non ha manto, ha solo il ramo E.
- `rifinitura_costruito.js`: l'aggancio si installa nella cottura e con E; i pezzi GLSL stanno dentro `if (rcK > .5)`. I materiali dei
  tasselli (`userData.tassello`) non si riagganciano (il testo cotto ce l'ha già).
- `pezzi_citta.js`: i fattori di E delle vesti (usura ×.3, tono ×.6) nello shader dietro `rcK` (le uniform `pzA`/`pzB` restano quelle di A).
- `pavimenti.js`, `riva.js`: `RifSuolo.capace` per far entrare il ramo, `RifSuolo.pre()` per la manopola. Il mare (lo shader dell'acqua è del
  gioco, non dei tasselli) si accende o si rimette com'era con `RifSuolo.aggiorna()`.

**I materiali: le varianti** (quello che non è shader).

- **La tinta E** (pezzi_citta, arredo3d, le righe delle tele e degli ombrelloni, il cassonetto delle tende): `StileE.colore(m, hexE)` mette
  `userData.rcE` (e il colore di A in `rcA`); i `userData` passano dalla cottura. La tinta si applica come **rapporto** `rcE / rcA` sul
  colore vero del materiale: alcuni materiali arrivano bianchi nella cottura (il colore sta nelle istanze o nei vertici) e restano giusti in A
  e spinti nello stesso modo in E. Dove un materiale di A è condiviso e E ne vuole due tinte
  (le righe della bancarella, dell'ombrellone), la variante è una copia sua. `tassella.js` tiene questi materiali fuori dalla tavolozza per
  tassello (lì il colore finirebbe nei vertici).
- **La tessitura E** (le targhe di arredo3d, la tela a righe delle tende, le insegne dei mestieri): `StileE.mappaE(m, t)` → `m.__mapE`
  (non nei `userData`: la copia li passa per JSON; un aggancio a `Material.copy` la porta nelle copie della fusione). La cottura la scrive nel
  record del materiale (`mapE`, unita con le altre tessiture), il caricamento la scarica col tassello. Le insegne di `segnaletica.js` stanno in
  un atlante: E ha il **suo atlante con le stesse celle** (quello di A copiato, le insegne ridisegnate in E).
- **I pezzi solo di E** (gli orli d'inchiostro di ombrelloni e bancarelle, il naso e la riga d'ombra delle scale): materiali loro con
  `userData.rcSolo = 'E'`, spenti con A (`visible = false`: niente disegno, niente ombra; nei tasselli niente raggi).
- `StileE.applica(m)` mette lo stato; lo chiamano chi crea i materiali e `tasselli.js` per ogni materiale cotto.

**I pezzi segnati** (`userData.rc`, fumetto2): nella cottura `mergeGroup` li tiene nei secchi loro; `tassella_pagina.js` scrive `rc` nel
record della mesh, `tassella.js` non li unisce alle altre mesh (la chiave dell'unione lo contiene), `tasselli.js` lo rimette in
`userData.rc` della mesh del tassello. Sui materiali (la vetrina) `rc` viaggia nei `userData` come prima.

**Il passo unico e il grading** (render.js `stile`) erano già dal vivo. Ora `STILE_Q` prende anche lo stile per difetto, e `stile('E')` dal vivo
rifà il passo coi rami degli stili se non c'erano (senza `?stile` il programma di A resta quello di prima). Tornando ad A la categoria data
dal gioco a persone e mezzi (`SG_CATP`) si toglie.

**L'impronta.** Gli ingressi della cottura cambiano (sorgenti, `tassella.js` con `?cottae`): `IMPRONTA_TASS` è nuova, va ricotta.

## 4. Come cambiare il difetto

Una riga, `src/index.src.html`:

```html
<script>window.PV_STILE_PREDEFINITO = 'A';   /* ... 'A' o 'E' ... */
```

Mettere `'E'`, `python3 build.py`, committare index.html/editor.html. **Non serve ricuocere**: la cottura porta già tutti e due e
l'impronta dei tasselli (`IMPRONTA_TASS`) non cambia, perché build.py la calcola dai moduli, dai modelli e dall'esportatore, non dal testo di
index.src.html (provato: stessa impronta con 'A' e con 'E'). `?stile=E` e `?stile=A` nell'indirizzo scavalcano il difetto; dal vivo
`StileE.imposta('E')` / `StileE.imposta('A')` (console, sonde). Gli interruttori di prima restano: `?norifsuolo`, `?norifcostruito`.

## 5. La strada dipinta

È già una scelta del gioco al caricamento: coi tasselli i lavori di partenza arrivano cotti (la storia di A, `graffiti.json`), e con E
`writer_vita.js` li dirada e li ritinge (`StradaDipinta.rimodella`) e aggiunge la strada dipinta (`StradaDipinta.storia`), tutto nel browser;
i graffiti si disegnano nel gioco e `fondaleMuroG` tira i suoi raggi sulle mesh dei tasselli. Quindi la stessa cottura va bene: l'unica
modifica è che `StradaDipinta.attiva()` legge `StileE.on` (anche lo stile per difetto). **Limite**: la storia dei muri si fa una volta, al
caricamento: `StileE.imposta` dal vivo non la rifà (per la strada dipinta serve ricaricare con `?stile=E` o col difetto E). Le piccole
aggiunte che arriveranno su quel ramo si uniscono come le altre (solo i generati da rifare).

## 6. Prove

RISULTATI
