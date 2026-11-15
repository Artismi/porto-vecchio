# GUARDAROBA1 — il guardaroba arriva in strada, i passamontagna si vedono

Ramo `guardaroba1` (da `origin/claude/shader-styling-performance-wbvqfy`). Base: `AUDIT_STILE.md` §0, §1, §5/F1.
Tavola: `_immagini/guardaroba/guardaroba1.jpg`. Camera, vita (popolo, veicoli, pose, animali), città di `render.js` e shader del look: non toccati.

## Cosa era rotto

1. **Le teste con la maschera erano calve.** Con `facce3` (di serie) la testa passa da `testa3`, che non dava `PK.tris`; il passamontagna partiva
   solo con `PK.tris` e, in più, `cappello()` guardava `pa.PK` sul ricopiato locale di `pa` (sempre vuoto): non partiva mai, nemmeno con le
   teste del kit. I capelli erano già tolti: testa nuda al posto dei 13 capi a maschera (11 fantasia, il semplice, l'antigas).
2. **Il catalogo non arrivava sulla gente:** `outfitOf` poteva dare 143-145 capi su 192; lo street solo sotto i 28 anni; `mute()` spegneva tutto.

## Cosa è cambiato

**`personaggi.js`** (solo `testa3`, `passamontagna`, una riga in `cappello`)
- `testa3` raccoglie i triangoli del viso appena costruito (cranio, naso, orecchie, occhi, sopracciglia, bocca) in `PK.tris` quando il cappello
  è una maschera, e chiama `passamontagna()` direttamente. Sotto la maglia niente baffi, barba e occhiali (bucherebbero il guscio).
- Il passamontagna era misurato sulle teste del kit (fori, corna, gorgiera in metri). Le teste `facce3` sono ~1,38 volte più grandi:
  si costruisce in uno spazio ridotto a misura del kit (centro la testa, scala dal mento agli occhi) e si riporta alla misura vera.
- La misura coi raggi: cinque raggi per fila (mezza fila sopra e sotto), l'angolo un filo fuori dalla cucitura dietro (prima il raggio sullo
  spigolo `x = 0` non prendeva niente), la cupola mai sotto il cranio misurato, la cima vera del cranio, la maglia un filo più spessa (+2,7 mm nella misura del kit, ~3,7 mm sulla testa vera).
  I raggi sono orizzontali: per ogni fila si provano solo i triangoli che toccano quella quota (stesso risultato, molto meno conto).
  Prova di compenetrazione (`window.__pmPen`, solo se la pagina lo accende): su 4 forme di testa × 13 maschere il viso fuori dal guscio,
  fuori dai fori, è al massimo **0,06 mm** (prima di queste correzioni: fino a 33 mm sulla nuca delle teste tonde).
- `cappello()`: `pa0.PK` invece di `pa.PK` (le teste del kit, con `?nofacce3`).
- Vertici (studio, stessa figura): testa nuda 29 787; passamontagna semplice 32 456 (+2,7k); fantasia da 32 910 (punte) a 39 487 (giullare,
  con la gorgiera). La testa con la maschera la portano in pochi (vedi i conti), il peso medio per figura non si muove.

**`guardaroba.js`** (solo `outfitOf`, le tavolozze)
- `outfitOf` nuovo; il vecchio resta tale e quale come `outfitOfPrima` dietro **`?guardaroba0`** (per il confronto; quando la tavola è
  approvata si può togliere).
- Chi è «di strada» (un secondo filo di caso dal seme, deterministico): i writer sempre; per età 88% sotto i 20, 78% fino a 28, 66% fino
  a 35, 52% fino a 45, 36% fino a 55, 14% fino a 65, 5% dopo; +25% a chi lavora di notte, +15% alla Risacca. Le divise restano divise.
- I mestieri restano (pescatori, operai, botteghe, uffici), con il capo di strada sopra: la felpa col cappuccio sotto la cerata o la giacca
  da lavoro, le sneakers, il berretto corto; l'operaio giovane in carpenter, salopette o giacca di tela; l'impiegato giovane lascia il
  cappotto per la coach o il puffer.
- Le tribù: hip hop, skater, maranza (come prima, ora per tutti i ragazzi di strada e per i writer), la ragazza (minigonna, vestito a
  fiori, stivali, chiodo), la crew dei trent'anni, la notte (tutto scuro), la tuta (anche i pensionati), la corsa, la montagna, il vintage;
  le donne eleganti col vestito sotto il cappotto; camicie a righe e vichy, scollo a V, collo alto, mocassini, papillon, guanti di lana agli
  anziani, i sandali coi calzini (rari), il poncho ai pastori, il casco al motorino, l'antigas a chi lavora coi veleni.
- **Passamontagna e maschere a pochi e con un motivo:** metà dei writer (fantasia, il semplice o l'antigas per la vernice), il 7% dei
  ragazzi hip hop, il 14% della Risacca (semplice o a righe), il 10% di chi esce di notte. Una maschera toglie gli altri cappelli e gli occhiali.
- **Colori:** `mute()` più leggero (74% del colore, ×0,92; gli over 55 60%, ×0,86; prima 45%, ×0,78 per tutti); la tavolozza dei capi
  di fuori con più valore e meno marrone; gli adulti di strada su una tavolozza «forte ma non accesa».

**`vestiario.js`** (una riga): la ricolorazione hip hop sui primari solo a chi `outfitOf` segna come hip hop, skater o maranza (`of.hh`):
gli adulti di strada tengono i colori disegnati (niente parata di clown).

## I conti (in gioco, 311 abitanti veri; stessa popolazione rifatta in Node con le due funzioni)

| | prima | dopo |
|---|---|---|
| capi diversi in uso | 102 | **168** |
| con almeno un capo di strada (regola dell'audit) | 10 (3,2%) | **83 (26,7%)** |
| con un capo dello streetwear del catalogo (largo) | 14 (4,5%) | **93 (29,9%)** |
| — fra 28 e 40 anni / oltre 40 | 0/59 · 0/192 | 24/59 · 28/192 |
| con un passamontagna o la maschera | 0 | **8** |
| capi raggiungibili da `outfitOf` (popolazione larga, 12 440) | 144 | **192 / 192** |

Su 311, 50 sono in divisa (Grigi, guardie, sentinelle) e restano così: fra chi non è in divisa lo street è al 32%.
Da un caricamento all'altro chi è writer cambia un poco (in gioco: 82-86 di strada, 8-9 maschere, 165-170 capi diversi).

**Peso** (in gioco, le stesse 28 persone costruite con le due build, file A e B della tavola): vertici per figura 30 470 → 30 603
(+0,4%) e 30 576 → 30 652 (+0,2%); triangoli +1,7% e +0,7%; pezzi per figura 94 → 94. Le divise restano col grigio di prima.
Prova di fumo (`fumo6.js`): `errori []`.

## Strumenti (nello scratchpad, non nel gioco)
`g1/conta.js` (i conti in Node sulla popolazione scaricata), `g1/geo.js` (le 13 maschere su 4 teste in Node: vertici e compenetrazione),
`g1/st.js` (lo studio), `g1/gm.js` e `g1/folla.js` (il gioco: conti, folla prima/dopo, primi piani), `g1/tavola.py`.

## Rischi
- Più varietà = meno riuso della cache `GEO` (260 figure, 12 sul telefono): la vestizione costa un po' di più quando la gente nasce.
- La prima testa con una maschera nuova misura il guscio coi raggi (5×27 righe × 40 angoli, coi triangoli filtrati per quota): 20-150 ms in
  Node, poi in cache (`PMCACHE`). Sul telefono può dare uno scatto quando nasce un writer col passamontagna.
- Le maschere a gorgiera (giullare, cappuccio a stelle, pallini, corna, coniglio) pesano +7-10k vertici a figura: sono pochi e solo writer o ragazzi.
- `outfitOf` cambia le facce della gente conosciuta solo nei vestiti di chi diventa «di strada»; il colore di fuori resta quello del motore
  (meno spento), così chi li ricorda con la giacca rossa li riconosce ancora.
