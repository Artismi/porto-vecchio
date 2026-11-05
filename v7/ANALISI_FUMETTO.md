# Porto Vecchio — Lo stile D, «fumetto hip hop»: due dosi da scegliere guardando (ramo `fumetto`, 5 novembre)

Il committente, guardati A, B e C: «Come stile non ci siamo. Deve sembrare un fumetto hip hop graffiti, come i lavori di Riot il writer.»
Cioè l'illustrazione a fumetto del graffiti: inchiostro nero e spesso, colori spray pieni, ombre colorate col retino, luci bianche a
macchia, il fondo semplificato. Qui c'è un look **originale** di quel genere (nessun pezzo né personaggio di un artista copiato), in due
dosi, sopra gli stessi materiali e lo stesso passo unico di A/B/C. La richiesta di sempre resta: chiaro, pulito, fermo in movimento.

**Il foglio da guardare:** `_immagini/fumetto/confronto_5x3.jpg` (5 inquadrature × A / D1 / D2, stesso istante). A risoluzione piena:
`_immagini/fumetto/scatti/<posto>_<A|D1|D2>.jpg`. Ritagli 1:1: `_immagini/fumetto/ritaglio_1a1_vicolo.jpg`, `ritaglio_1a1_piazza.jpg`.
Le misure: `_immagini/fumetto/misure.json`, `tremolio.json`; l'identità di A: `identita_A.jpg`, `identita_A.json`.

**Gli indirizzi** (stesso posto, una scheda per indirizzo):

- A, oggi: `https://<host>/porto-vecchio/` (oppure `?stile=A`)
- **D, la dose consigliata: `?stile=D`** (è D2)
- D1 «fumetto pulito»: `?stile=D1`
- D2 «graffiti a fumetto»: `?stile=D2`
- dal vivo, nella console (la pagina aperta con un `?stile=` qualsiasi, anche `?stile=A`): `__pv.R.stile('D1')`, `'D2'`, `'A'` (e `'B'`,
  `'C'`). Le manopole: `window.__STILE.V.D1` / `.D2`, poi di nuovo `__pv.R.stile('D2')`.

**Senza `?stile` non cambia niente.** Il passo unico resta lo stesso programma (i pezzi nuovi sono dentro `#ifdef SG_STILE`, che c'è
solo con `?stile=`). Nei materiali i rami nuovi esistono, ma sono spenti da `sgP10.z` e `sgP10.w`, che senza `?stile` valgono zero:
il ramo di prima è la stessa espressione di prima. Verificato contro la build di partenza (§5).

---

## 1. Che cosa fa D

Tutto è nel codice del look: `src/render.js`, il blocco `[stile]` (le due dosi `STILE.V.D1`/`D2`), i pezzi dei materiali (`sguProPezzi`) e
il passo unico (`sguInit`, il filo di `[profondita2]`). Niente bersagli nuovi, nessuna passata nuova, nessun programma nuovo.

| tratto del genere | come | dove | D1 | D2 |
| --- | --- | --- | --- | --- |
| **inchiostro sulle sagome** | il filo della profondità di `PFD` (la cosa davanti a un'altra, col peso di copertura MSAA di [hd] e il «fondo che dura» contro i grovigli), più forte (1,5 → 1,8), più sagome (soglia .035 → .032), fino a 140-150 m; il colore non è più il bruno del fondo ma un nero d'inchiostro appena viola `#0d0a13` | passo, `sF.x`, `PFD.linea*` | sì | sì |
| **più spesso vicino, sottile lontano** | un anello a 2 px (4 letture della profondità, solo per i pixel entro 30 m oltre il personaggio, e sfuma da 15 m): la sagoma vicina è larga 2-3 px allo schermo, quella lontana 1 px, e il peso cala con la distanza (`lineaLontano`) | passo, `sF.z`, `sG.y` | .7 | 1 |
| **inchiostro d'aria** | lontano (da 8-9 a 40-45 m oltre il personaggio) il nero prende il colore dell'aria dell'ora, più scuro: il fondo resta disegnato ma non diventa una pappa nera; poi l'aria lo vela come tutto il resto | passo, `sG.x` | sì | sì |
| **pieghe interne sottili** | dove la superficie si piega (lo spigolo di una casa, il piede del muro, il vano di una finestra, il bordo di una panca): la derivata seconda dell'inverso della distanza (va dritto su un piano, salta sulla piega), con le stesse 4 letture del filo (zero in più), divisa per l'angolo di un pixel (lo stesso spigolo pesa uguale a ogni distanza). Tratto al 72% del filo, solo entro 30 m, mai sulle persone né sul cielo | passo, `sF.y`, `sG.w` | .5 | .62 |
| **niente groviglio sul retino della camera** | le chiome e le cose che la camera7 apre a retino (buchi di 1-2 px) facevano un tratteggio nero: un pixel col fondo da due parti opposte (o, davanti al personaggio, da due parti qualsiasi) è un buco del retino o un filo di 1 px, non una sagoma: niente inchiostro | passo | sì | sì |
| **le persone** | la sagoma per categoria che c'era (il Sobel sull'alfa, nessuna lettura in più: più economico di uno scafo rovesciato, che raddoppierebbe i vertici delle persone), d'inchiostro nero e più larga (`CAT.spessore` 1 → 1,5 / 1,9); il personaggio tiene il bordo di luce dentro la sagoma ([profondita3]) | passo, `CAT` | 1,5 | 1,9 |
| **cel shading, 2-3 toni piatti** | la luce diretta a tre toni (ombra, mezzo .4, sole) col bordo largo un pixel misurato con `fwidth` (netto, senza scaletta, fermo): prende il posto della banda a larghezza fissa; le velature quasi via (`varia` .18 / .12), la scala del muro appena (`pittura` .3 / .25), niente micro-normale, niente tremolio del confine, il vissuto dei tetti a .35 / .3 | materiali, `sgP10.z`, `DIR` | sì | sì |
| **ombre colorate** | l'ombra presa dal cielo più piena e blu-viola (`proTinta #4c54d4` .5 / `#4a4ed8` .58), il viraggio delle ombre più freddo (×[.86 .9 1.26] / ×[.84 .88 1.3]) | i momenti | sì | più |
| **retino nell'ombra** | puntini a 45° di 20 cm sul piano della faccia (fermi sul muro e sul suolo, mai sullo schermo), più grandi dove l'ombra è piena (l'ombra del sole e la faccia girata), nel tono dell'ombra (il cielo dell'ora, più scuro), bordo antialiasato con `fwidth`. Si spengono quando la cella scende sotto 3-4,5 px (niente moiré) e quasi del tutto sopra 16-28 px (i tetti a 3 m dalla camera: il retino sta nel piano del gioco), e sulle cose molto curve (l'erba, le foglie). Di notte a metà | materiali, `sgP10.w` | — | sì |
| **luce a spray** | una macchia bianca a bordo netto (`fwidth`) dove il sole si specchia, solo sulle cose curve (la curvatura dalle derivate della normale: persone, auto, vasi, pali, ombrelloni), mai su un muro piatto (sarebbe una faccia intera bianca); più piena sulle cose lisce | materiali, `sgP10.w` | — | sì |
| **colore spray, base ligure calda** | il sole dorato tenuto (`#ffd49c` ×1,4), saturazione 1,14 / 1,2, contrasto 1,12 / 1,16, esposizione ×1,1, gli accenti (persiane, insegne, writing) +22% / +28% di colore sul set (era +16%) | i momenti, `sW.y` | sì | più |
| **graffiti che saltano fuori** | D2: il writing e le insegne molto sature staccano anche di valore dal muro (il giallo un filo più chiaro, il blu più scuro, ±.3 × la distanza da .42): il writing scuro su muro scuro si legge di più | passo, `sF.w` | — | .3 |
| **gerarchia: personaggi contro ambiente** | la sagoma nera piena, il personaggio un gradino sopra (`spicca` 1,05 / 1,1) | `PFD.spicca` | sì | sì |
| **il fondo piatto** | il piano di fondo di B (oltre 7-8 m dietro il personaggio un gradino di valore verso l'aria, colore e contrasto al 50-60%); D2 in più l'aria a **tre fasce piatte** col bordo antialiasato (`fwidth`): il fondale del fumetto, non una sfumatura | passo, `sV`, `sG.z` | fondo | fondo + fasce |

Il cielo e l'orizzonte: con la camera7 (34-50° di pendenza) non entrano quasi mai nel quadro; le fasce lavorano sul fondo della piazza e
dei tetti.

## 2. Le misure (stesso istante, 960×540, profilo leggero, sonde della camera7)

Le sonde sono quelle di `_immagini/stile/sonde/` (stessi posti, ore e percorsi, `luoghi.json`), copiate in `_immagini/fumetto/sonde/`.
L = luminanza (10°/50°/90° percentile); sat = saturazione media; *nitidezza* = varianza del laplaciano; *rumore* = mediana, su blocchi da
16 px, del dettaglio sotto 1,2 px; *persona* = lo stacco di valore del personaggio dall'intorno.

**Tremolio** (la camera spostata di mezzo pixel, `setViewOffset`):
- *grezzo* = come `_immagini/stile/tremolio.json`: differenza media RGB / % di pixel oltre 24 livelli. Conta anche il bordo netto che
  scivola di mezzo pixel: un'immagine con più inchiostro paga per forza di più, anche se è ferma.
- *interno* = lo stesso, ma solo **dentro le superfici** (fuori i bordi forti, un salto di valore oltre .22 in 2 px, e 2 px attorno; il
  retino ha contrasto basso e resta dentro, quindi si misura). È quello che «frigge»: retino, celle, trame, righe che saltano.

| scena | | L 10/50/90 | sat | nitidezza | rumore | persona | tremolio grezzo | tremolio interno |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| vicolo | A | .11/.41/.63 | .33 | 825 | 5,65 | 2,27 | 5,38 / 8,32% | 2,14 / 1,82% |
|  | D1 | .12/.44/.63 | .31 | 1775 | 6,90 | 2,64 | 5,33 / 8,46% | 1,87 / 1,81% |
|  | D2 | .06/.43/.64 | .35 | 2484 | 7,71 | 3,00 | 5,96 / 8,61% | 1,97 / 1,45% |
| sbocco | A | .07/.32/.67 | .34 | 671 | 3,74 | 3,24 | 4,03 / 6,21% | 1,88 / 1,46% |
|  | D1 | .07/.33/.66 | .34 | 1382 | 4,90 | 3,16 | 5,19 / 8,45% | 1,91 / 1,82% |
|  | D2 | .01/.30/.68 | .35 | 1906 | 5,91 | 3,61 | 5,92 / 9,10% | 2,13 / 1,92% |
| lungomare | A | .19/.46/.74 | .36 | 2746 | 3,51 | 1,91 | 3,63 / 5,55% | 1,67 / 1,35% |
|  | D1 | .18/.49/.70 | .33 | 6596 | 3,77 | 1,96 | 4,21 / 6,23% | 1,23 / .74% |
|  | D2 | .14/.49/.72 | .34 | 9303 | 5,56 | 1,99 | 4,70 / 6,26% | 1,46 / .81% |
| piazza | A | .25/.60/.75 | .40 | 810 | 4,06 | 1,40 | 4,13 / 6,35% | 1,87 / 1,57% |
|  | D1 | .23/.61/.73 | .40 | 2010 | 5,03 | 1,38 | 5,33 / 8,73% | 1,47 / 1,51% |
|  | D2 | .18/.63/.76 | .46 | 3456 | 6,68 | 1,27 | 6,20 / 9,27% | 1,40 / 1,30% |
| sera | A | .11/.35/.58 | .46 | 690 | 6,03 | 2,40 | 5,11 / 9,48% | 2,52 / 3,49% |
|  | D1 | .10/.37/.58 | .51 | 1502 | 7,46 | 2,84 | 5,97 / 10,79% | 2,23 / 3,10% |
|  | D2 | .08/.37/.59 | .52 | 1979 | 7,86 | 3,43 | 6,52 / 10,73% | 2,34 / 2,86% |

Cosa dicono:

- **Più netto, di molto**: nitidezza ×2,1-2,5 in D1, ×2,8-4,3 in D2 rispetto ad A. Viene dai bordi: l'inchiostro, le pieghe, le celle a
  bordo netto (e in D2 il retino). È l'immagine «definita» che il committente chiede da sempre, e la lettura di un fumetto.
- **Fermo in movimento, dentro le superfici**: il tremolio *interno* scende in D1 in 4 scene su 5 (−13% vicolo, −26% lungomare, −21% piazza,
  −12% sera; sbocco pari) e in D2 in 4 su 5 (sbocco +13%). Le campiture piatte e le celle con `fwidth` friggono meno delle velature di A; il
  retino ancorato al mondo e spento sotto i 3 px non aggiunge sfarfallio misurabile (la % oltre 24 livelli scende anche in D2, in 4 scene su 5).
- **Il tremolio grezzo sale** (D1 da −1% a +29%, D2 da +11% a +50% come differenza media): è il bordo d'inchiostro, nero su chiaro, che scivola di mezzo
  pixel. È il prezzo di qualunque contorno (B, che aveva più filo, saliva meno perché il suo filo era blu-viola e più chiaro). Il peso di
  copertura del MSAA lo tiene morbido sul filo di 1 px; l'anello a 2 px non ce l'ha (§6).
- **Il «rumore» statico sale** (+7-31% D1, +30-65% D2): la misura conta ogni dettaglio sotto 1,2 px, e il fumetto ne ha di proposito
  (l'inchiostro, in D2 i puntini). Non è grana: guardare i ritagli 1:1.
- **Il personaggio si stacca di più**: 2,27 → 2,64 → 3,00:1 nel vicolo, 2,40 → 2,84 → 3,43:1 la sera, 3,24 → 3,61 nello sbocco in D2. In
  piazza alle 13 (il personaggio arancio sul lastrico chiaro) resta sul colore, 1,3-1,4:1: lì lo stacca la sagoma nera, non il valore.
- **Il colore**: D1 come A (.31-.51), D2 un filo più pieno in piazza e la sera (+.06), pari altrove; il nero vero entra nel quadro (L10 di D2 fino a
  .01-.06: l'inchiostro), i chiari restano dove erano (L90 uguale).

## 3. Il costo (profilo leggero: Iris Xe, telefoni)

Come in `ANALISI_HD.md` e `ANALISI_STILE2.md`: letture di tessitura e lavoro per pixel. I millisecondi di SwiftShader non valgono per le
schede vere; in questo giro poi la macchina era condivisa con altri due agenti (carico 7-8 su 4 processori): un fotogramma di A è arrivato
a 14,7 e 27 s. Li riporto solo come spia.

| pezzo | A | D1 | D2 |
| --- | --- | --- | --- |
| programmi | — | 0 nuovi (gli stessi `#define`; il passo con `?stile` ha già il suo) | 0 nuovi |
| passo unico, letture per pixel | — | **+4 letture della profondità** (l'anello a 2 px) solo sui pixel fino a 30 m oltre il personaggio (nel quadro di gioco quasi tutti); l'inchiostro, l'inchiostro d'aria e le pieghe **+0** (riusano le 4 letture del filo) | come D1 |
| passo unico, calcolo | — | ~35 operazioni (4 divisioni per le pieghe, il colore dell'inchiostro, i buchi del retino), +0 sulla sagoma delle persone | ~45 (+ le fasce: un `fwidth`, un `exp`; il valore degli accenti) |
| materiali: la luce a celle | — | +1 `fwidth` e ~8 operazioni **per luce** (al posto della banda a larghezza fissa: quasi pari) | come D1 |
| materiali: retino e luce a spray | — | +0 | +4 `fwidth` (la normale, la posizione, il retino, il riflesso), ~45 operazioni una volta per pixel; **0 letture, 0 rumori** |
| senza `?stile` | identico | — | — |
| memoria, banda | 0 | 0 | 0 |

Stima sulla Iris Xe: il passo unico a 640 righe (1137×640 = 0,73 Mpx) con 4 letture in più fa ~2,9 M letture di profondità per
fotogramma, coerenti in cache: **~0,1-0,2 ms**. I materiali di D2: il retino e la luce sono solo calcolo (niente tessiture), ~+3-5% del
passo dei materiali; D1 quasi pari ad A. I rami dipendono da uniform (stesso valore per tutto il disegno): la scheda video ne esegue uno.
Sul portatile vero va misurato con `?perf` / F3 (la riga `scheda video`), A contro D1 contro D2, nello stesso posto.

Spia di SwiftShader (ms per fotogramma, media di 3, stesso istante; la macchina era condivisa):

| | vicolo | sbocco | lungomare | piazza | sera |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 267 | 242 | 68 | 4083 | 463 |
| D1 | 147 | 194 | 114 | 359 | 365 |
| D2 | 141 | 185 | 98 | 297 | 384 |

A è la prima variante fotografata dopo la corsa e prende i ritardi della macchina (il raccoglitore, gli altri agenti): non vuol dire che A
costi di più. Quello che dicono: D1 e D2 stanno nella stessa forchetta, nessun costo fuori scala. Programmi in scena a fine corsa: 185, gli
stessi con A, D1, D2 (si cambia dal vivo senza ricompilare).

## 4. La scelta consigliata

**D2, cioè `?stile=D`.** È l'unica delle due che si legge come «fumetto graffiti» e non come «A col contorno»: l'inchiostro spesso
vicino, le ombre lunghe stampate a retino (lo sbocco alle 16, la sera: il suolo diventa una tavola), la luce a spray sulle persone e sulle
cose tonde, il colore più pieno. E resta pulito dove conta: il tremolio dentro le superfici è più basso di A in 4 scene su 5, il retino non
compare sui tetti vicini né sotto i 3 px, il nero lontano prende il colore dell'aria.

D1 serve come rete di sicurezza: se il committente trova il retino troppo «pop art» (sui muri in ombra del vicolo è la cosa più evidente),
D1 tiene tutto il disegno (inchiostro, pieghe, celle, ombre colorate) senza puntini. Le due dosi si cambiano dal vivo, quindi la scelta
si può fare camminando: `?stile=D2`, poi in console `__pv.R.stile('D1')` e ritorno.

Da guardare: i ritagli 1:1 e il gioco vero, non il foglio rimpicciolito (a 640 px di larghezza l'inchiostro e il retino si perdono).

## 5. A senza `?stile` è identica

La build di partenza (`85a0971`, estratta con `git archive` e ricostruita a parte) e questa build senza `?stile`, una pagina dopo l'altra,
sulla piazza e sul lungomare (`_immagini/fumetto/sonde/identita.sh`, poi `identita.py`). Foglio: `_immagini/fumetto/identita_A.jpg`
(partenza · nuova senza `?stile` · differenza ×4).

Il set fermo è uguale: muri, suolo, tetti, mare, luce e ombre delle case, le chiome. Lungomare: 2,0% dei pixel diversi di più di 2
livelli (differenza media 0,64); piazza: 9,5% (5,7). Le differenze stanno tutte nelle cose che il gioco decide a caso o col tempo: le
persone e dove stanno, il writing assegnato al muro («KMT» contro le lettere scure), i rifiuti, il cartello e la tessera gialla della guida,
i riflessi del mare che si muove e i puntini del retino della chioma (il tempo). Non sono il look.

## 6. Cosa resta aperto

- **Il retino delle chiome della camera7** (`fade7`, codice della camera, non toccato): l'inchiostro ora salta i buchi (un pixel col fondo
  da due parti, o da due parti qualsiasi davanti al personaggio), ma una parte dei bordi del retino resta segnata: sul lungomare la chioma
  davanti alla camera è appena più scura e tratteggiata che in A. La cura vera è della camera (un'apertura con l'alfa vera, o un retino a 2
  px con dissolvenza nel tempo): con quella l'inchiostro sulle chiome torna pulito da solo.
- **L'anello a 2 px non ha il peso di copertura**: il filo di 1 px scivola col bordo (MSAA), il secondo pixel no. Il tremolio grezzo di D2
  viene soprattutto da lì. Si può pesare l'anello con la stessa copertura del pixel di bordo (2 letture in più sui soli bordi), o
  sostituirlo con un filo di spessore continuo (la distanza dal bordo in sotto-pixel): da provare se in gioco si vede scalettare.
- **I tetti delle case del kit nel vicolo** (la pila `arr1`, tela ingrandita a 3-5 m dalla camera): restano la cosa più impastata del
  quadro, come in A/B/C. D non li peggiora (il retino lì è spento), ma un fumetto vorrebbe i coppi disegnati: è lo stesso aperto di B.
- **I tasselli**: i rami di D nei materiali (celle con `fwidth`, retino, luce a spray) arrivano sulle case cotte solo dopo la prossima
  cottura (il workflow `tasselli` al push su `main`). Le foto qui sono con la città costruita dal vivo (in locale non ci sono tasselli). Il
  passo unico (inchiostro, pieghe, fasce, colore) vale subito anche sui tasselli vecchi.
- **Il colore dei muri gialli** al sole di mezzogiorno in D2 (la piazza alle 13) va verso il giallo limone: il sole dorato per la saturazione
  1,2. Se in gioco stona, `__STILE.V.D2.mom.pomeriggio.sat` 1,14 e `mattino` uguale.
- **Graffiti**: D2 alza colore e valore di quello che è già saturo (writing, insegne, saracinesche); il writing in sé (`writing.js`,
  `graffiti.js`, il contorno nero e le gocciolature) è del blocco prestazioni/graffiti e non l'ho toccato. Un contorno dalla profondità sul
  writing non c'è: è dipinto sul muro, la sua linea la porta il disegno.
- **Il cielo e l'orizzonte**: la camera7 non li inquadra; le fasce piatte di D2 lavorano sul fondo della piazza e dei tetti.
- **L'anello giallo della guida** compare in alcune foto di D e non in A: è il fascio/anello della guida che si accende col tempo
  (le varianti si fotografano una dopo l'altra), non lo stile.
- **Il costo vero** su Iris Xe e sul telefono (qui stimato in letture e operazioni; SwiftShader su macchina condivisa).
- **WebGL1**: le fasce del lontano usano `fwidth` nel passo; con `?stile` il passo chiede l'estensione delle derivate. Non provato su un
  telefono solo WebGL1.

## 7. Come si rifà

```
cd v7 && python3 build.py
cd _immagini/fumetto/sonde
TREMOLIO=1 TEMPI=3 node scatti.js 'leggera&tassellivecchi&stile=A' 'A,D1,D2' v2     # ~50 min in SwiftShader (macchina condivisa)
python3 fogli.py v2 ..                                                               # il foglio, i ritagli, misure.json, tremolio.json
./identita.sh && python3 identita.py                                                 # A senza ?stile contro la build di partenza
```
`lib.js` serve `PV_ROOT` (per difetto questo albero); `scatti.js` usa il pilota a passi della camera7 (`passo7.js`) e alla fine della corsa
fotografa le varianti allo stesso istante con `R.stile(...)`.
