# Porto Vecchio — La direzione artistica (2 novembre)

Il committente: «la grafica è sporca e confusa; non sembra ancora il lavoro di una squadra vera di scenografi, pittori, illustratori e
grafici; manca la qualità cinematografica e l'identità hip hop; soprattutto manca la pulizia di un prodotto professionale».

Il riferimento: la bibbia dello shader (un video di skate in VX1000 dentro una rivoluzione; `src/HANDOFF_look.md`), `ANALISI_STILE.md`
§1-8, e il diorama isometrico dipinto (valori puliti, verdi ricchi, sole caldo, ombre fredde, superfici dipinte, la luce sugli spigoli in
alto, le cose a grappoli sulle soglie, quasi nessun contorno).

Questo documento è la regola. Ogni cambio al look si misura contro di lui; un effetto nuovo entra solo se ne toglie un altro.

---

## 1. La diagnosi (l'audit del 2 novembre)

Foto della galleria nel profilo del committente (`?cittanuova&leggera&tassellivecchi`, 960×600), lette da direttore artistico; gli strati
isolati con le manopole dal vivo e coi fogli prima/dopo (`_immagini/direzione/`).

| scena (prima) | suolo L / sat | muri L / sat | tetti L / sat | persone/suolo |
| --- | --- | --- | --- | --- |
| mattino, Rua Maestra | .42 / .47 | .42 / .51 | .48 / .48 | 1,35 |
| mezzogiorno, vicolo | .33 / .45 | .44 / .49 | .49 / .51 | 1,03 |

Cosa rende l'immagine sporca e confusa, e chi lo fa:

1. **Non c'è gerarchia di valore: tutto sta fra .42 e .49, tutto a saturazione .45-.51.** Suolo, muri e tetti hanno lo stesso valore e lo
   stesso colore: un impasto arancio-marrone, «l'immagine tutta arancio» che la bibbia vieta. Il caldo è sommato di nuovo nel passo finale:
   la pellicola (`SG_STR`, `gS.y`) porta ogni grigio verso la crema calda, la tavolozza «viva» (`pV.w`) spinge marroni e grigi, il colore
   pieno su tutto (`proPieno` .32, `sat` 1.1), la terra che rimbalza arancio (`terra #b89a74`). E un errore: le manopole dell'ora
   riscrivevano `gN.z` (il giorno) a 0, quindi la gerarchia di giorno di `SG_CAT` (muri pastello, tetti stretti) non partiva mai.
2. **Lo sporco sulle superfici**: le chiazze scure e il muschio sui tetti (`DIOR.vissuto`), il rumore del suolo e della polvere (`suolo`,
   `polvere`: due rumori), la velatura a tre rumori dei muri (`varia`, uno a 60 cm), il confine delle bande che trema (`celle` + `sgTr`), il
   retino nell'ombra (`AD.retino`), le ombre delle nuvole senza causa (`DIOR.nuvole`), la micro-normale (`grana`). Ognuno da solo è
   «bello»; insieme, a dosi piene e alla distanza di gioco, si leggono come grana e sporco, non come mano di pittore.
3. **Troppe linee, e più fitte dove il modello è più dettagliato.** Il pennarello (`SG_CAT`, Sobel sull'alfa della categoria e della
   faccia) segna ogni cambio di faccia: una cornice, un telaio, una modanatura hanno molti spigoli vicini, un muro uno per lato; le zone
   ricche dei modelli diventano grovigli. Lo strato aggiunto per spegnere il groviglio (la densità, 8 letture) è il sintomo.
4. **Il varco del primo piano** (`AD.taglio`): il retino Bayer apre un alone di puntini attorno al personaggio (nel vicolo è la cosa più
   visibile del quadro).
5. **Le facciate in ombra sono buchi** (muri L20 .14): i muri, che dovrebbero essere la cosa chiara, in media sono più scuri del suolo.
6. **Nitidezza, contrasto locale, grana** sull'immagine ingrandita del profilo leggero: gradini e aloni chiari ai bordi.

Il principio della cura: poche decisioni forti, le stesse ovunque, e il dettaglio dosato perché sostenga la forma.

## 2. Le regole del look

1. **Il valore prima del colore.** Ogni categoria ha il suo spazio di valore (§3). Una scena giusta si legge anche in bianco e nero:
   suolo medio, muri chiari, tetti medio-scuri, persone e accenti al contrasto più alto.
2. **Il colore sta nella luce e nella materia, non nel filtro.** Il passo finale fa UN grading per ora (saturazione vicina a 1,
   contrasto, viraggio ombre/luci) e la gerarchia per categoria. Niente correzioni per tinta, niente pellicola che sposta i grigi, niente
   «colore pieno» su tutto.
3. **L'ombra è colorata, mai nera né grigia.** La riempie il cielo dell'ora: oltremare e lilla di giorno, magenta-viola al tramonto,
   blu profondo di notte con le pozze calde del sodio. Il bordo dell'ombra è netto e morbido, senza retino. Una temperatura per luce:
   sole caldo, ombra fredda; nessuna tinta senza una luce che la porti.
4. **Il fondo respira, gli accenti esplodono.** Muri pastello (saturazione ≤ .40 in luce), suolo calmo (≤ .20 al sole), tetti cotto
   spento (≤ .46). La saturazione piena (.75-.95) solo a writing, insegne, saracinesche dipinte, neon, vestiti, cose con cui si
   interagisce: al più il 10-12% del quadro, il fluo sotto l'1%.
5. **Una linea sola.** La sagoma delle persone, larga 1-1,5 px, del colore della cosa più scuro (nel regime grigia e uniforme). Nessun
   contorno su case, tetti e suolo: il volume lo dà la luce a tre toni (sole, mezzo, ombra) di ogni faccia, la separazione lo dà il valore.
6. **Le superfici sostengono la forma, e il dettaglio è dosato.** La scala del muro (chiaro in alto, scuro al piede), una velatura e una
   pennellata larghe, le chiazze e il muschio dei tetti, il piede delle cose a terra, l'ombra della gronda: alla distanza di gioco si
   leggono come mano di pittore. **Ogni segno ha una causa che si capisce** (il muschio dove è umido, lo sporco dove si tocca, l'ombra dove
   c'è una luce): senza causa, esce. Niente rumore sotto il metro (la micro-normale vive solo da vicino). Il dettaglio fine è disegno e geometria (finestre, persiane, insegne, writing, piante). Le dosi in `DIR` (§6).
7. **Una gerarchia per inquadratura**: prima il personaggio, poi la via davanti, poi il set. Il contrasto e la saturazione più alti stanno
   dove deve andare l'occhio (la luce sul personaggio un passo avanti, il fondo appena più quieto: `DIR.fuoco`).
   **Il passo finale ha un budget fisso** (§6). Ogni effetto è al servizio di una lettura, non si vede come effetto.
8. **Il regime è dritto e grigio**: lente ferma, colore a un terzo, la linea tecnica uniforme. La strada è calda, curva e colorata: lo
   stato della rivoluzione (`RIV`) sposta l'immagine fra i due, e solo lui.
9. **L'identità hip hop sta nelle cose, non nel filtro** (§7): writing, lettering dipinto a mano, saracinesche, vestiti, neon, gente.
10. **Si toglie prima di aggiungere.** La pulizia viene da poche decisioni ripetute ovunque. Ogni strato del look ha la sua manopola e il
    suo interruttore; `?lookvecchio` riporta il look di prima per il confronto.

## 3. Il piano dei valori per categoria

Luminanza (0-1, Rec. 709) e saturazione (HSV, 0-1) misurate dalla galleria (`<scena>_cat.json`), di giorno nel profilo leggero.

| categoria | luminanza | saturazione | come |
| --- | --- | --- | --- |
| **suolo** (il palco) | .40-.66 al sole, valore stretto attorno a .41 (74%), i neri veri restano | ≤ .28 al sole, scaldato dal sole (mai grigio), ≤ .50 in ombra (blu-viola) | `SG_DIR` nel passo |
| **muri** (il fondo che respira) | .62-.74 al sole (la cosa chiara del quadro), l'ombra leggibile; finestre e vani restano scuri | .38-.45 in luce (pastello pieno: ocra, rosa, salmone), ≤ .54 in ombra; gli accenti già saturi restano | il valore verso .68 al 70% del contrasto, +12% di colore |
| **tetti** (la cornice) | .36-.50, mai sopra i muri | ≈ .50 (cotto chiaro, non bruno) | il valore a .42 ± 70%, tetto .50, +15% di colore |
| **persone** | contrasto col suolo ≥ 2:1 | accenti .8-.95 | +30% colore, +20% contrasto, la linea |
| **accenti** | — | .75-.95 | nei materiali e nei segni |

Di notte la gerarchia si allenta (`gN.z`, il giorno): i valori li fanno le luci (sodio, neon, finestre), i tetti di saturazione salgono
a .62 così le pozze calde e i neon tengono il colore.

## 4. La tavolozza

**Per ora** (`SGU.momenti`, render.js; il passo e le luci):

| ora | sole | cielo (riempie l'ombra) | ombra (tinta) | nebbia, aria | bordo | grading |
| --- | --- | --- | --- | --- | --- | --- |
| mattino | `#ffd9a2` × 1.36 (dorato) | `#9cc4f2` × .50, terra `#ad9c84` | `#5a58cc` × .38 (blu-viola pieno) | `#e2dfd8` | `#fff0dc` | sat 1.10, contrasto 1.15, luci ×[1.06 1 .91], ombre ×[.90 .92 1.17], colore pieno .30, neri .06 |
| pomeriggio | `#ffdca8` × 1.38 (dorato) | `#9ec6f2` × .48, terra `#b09c82` | `#6056cc` × .38 | `#e4e0d8` | `#fff0dc` | come il mattino |
| sera | `#ffb47a` × 1.0 | `#9a88c8` × .60, terra `#a8826a` | `#7a46a8` × .34 (magenta-viola) | `#d8a0ac` (rosa) | `#ff9ec0` | sat 1.00, contrasto 1.12, colore pieno .20 |
| notte | `#9ab0e0` × .34 | `#2a3360` × .40, terra `#2a2230` | `#3a3a78` × .18 (blu profondo) | `#141a2c` | `#5ec8e8` (ciano) | sat 1.06, contrasto 1.14, colore pieno .34 |

Le luci della notte: sodio `#ffb060`, neon rosa `#ff4f9a`, turchese `#3fd6d0`, verde acido `#b6ff3c` (solo sulle insegne).

**Per quartiere** (al più tre intonaci, un accento; i materiali e le tavolozze delle case la seguono, il passo tiene il tetto di
saturazione):

| quartiere | intonaci | persiane, legni | tetti | suolo | accento |
| --- | --- | --- | --- | --- | --- |
| Borgo e caruggi | giallo Genova `#e8c89c`, rosa salmone `#e2ac92`, salvia `#c9d0b4` | verde `#3e6b4a` | coppi `#a87f68`, ardesia `#5a6068` | lastrico `#8a8378` | writing, bucato, buganvillea `#c8407a` |
| Marina e porto | calce `#e6e4dc`, azzurro `#9ab8c6`, ocra chiara `#e4bc8e` | blu `#2a5d8f` | lamiera `#6c7478`, coppi | banchina `#7e7a72` | scafi rossi `#d8452f`, reti |
| Ottocento | pietra `#e4d6ba`, ocra `#d9b48c`, grigio azzurro `#b8c2c8` | verde scuro `#2f4f3e` | ardesia `#565c64` | lastre `#8e877b`, asfalto `#55575c` | insegne a mano, tende `#b8433a` |
| Boom e lungomare | crema `#f0e6d2`, acqua marina `#9ccfc4`, rosa `#f2b8a8` | alluminio | piani chiari scuriti `#b4ab9c` | asfalto `#55575c`, marciapiede `#8a8780` | neon, insegne anni '60 |
| Baracche | lamiere dipinte `#6b9a7a`, `#c96a4a`, `#4f7fa8` | legno `#8a6a4a` | lamiera `#7a7c7a` | terra `#7a6a54` | il verde solarpunk `#6fae4f`, teloni |
| Regime | cemento `#9a9ea4`, `#b4b6b8`, `#6c7078` | ferro `#4a4e58` | piani `#8c9096` | `#7c7e82` | solo il rosso della bandiera `#9e1f1a` |

## 5. I bordi

- **Persone**: la sagoma scura (`CAT.lineaPersone` .9), 1-1,5 px allo schermo, liscia (il bordo della categoria letto interpolato,
  Sobel), del colore della persona più scuro e appena viola; nel regime grigia `#4a4e58`. Il bordo di luce nel colore dell'ora resta
  nel materiale (`CAT.bordoPersone`).
- **Case, tetti, suolo, oggetti**: nessuna linea. Il volume dalla luce a tre toni con il confine netto (`SGU.pro.celle` .8, appena
  irregolare: `DIR.tremolio`); lo stacco del suolo dal muro dal piede (`DIOR.piede`: il suolo sotto un muro si scurisce verso il freddo
  per 3-15 px) e dalla scala del muro; il muro sotto la gronda prende la sua ombra (`DIOR.gronda`).
- **La densità delle linee non dipende dal dettaglio del modello.** Il difetto di prima: il pennarello segnava ogni cambio di faccia, e un
  telaio, una cornice, una modanatura hanno molti spigoli vicini dove un muro ne ha uno per lato; le zone ricche diventavano grovigli
  (e uno strato in più provava a spegnerli). La regola: una linea, se c'è, sta solo sulla sagoma esterna di una cosa (il salto fra due cose
  diverse: la persona e il suolo), mai sugli spigoli interni di un pezzo. Per questo oggi la sola linea è la sagoma delle persone; se un
  giorno servirà un filo sulle sagome delle case, si legge il campo della categoria a passo largo (≥ 4 px allo schermo) e solo fra cose
  diverse, così una finestra dettagliata e un muro liscio prendono lo stesso peso di linea per metro.
- **La luce sugli spigoli in alto** (il riferimento): oggi spenta (`DIOR.luceSpigolo` 0: a mezza risoluzione faceva un alone sgranato);
  si rifà nei modelli (smussi e cornici chiare), non nel passo.

## 6. Le superfici e il passo finale: il budget

**Il dettaglio serve, dosato** (il committente: «è bello, ma va dosato bene; un po' serve per il dettaglio»). Nei materiali
(`sguProPezzi`) resta la luce a tre toni e il dettaglio che sostiene la forma e si legge come mano alla distanza di gioco, mai come grana
o sporco: niente rumore sotto il metro, tranne la micro-normale che vive solo da vicino. Le dosi stanno in `DIR` (render.js, anche
`window.__DIR`; tutte a 0 è «zero dettaglio», il foglio `_immagini/direzione/dosi_*.jpg` le confronta):

| manopola | cosa fa | dose | prima | la causa, e perché aiuta l'inquadratura |
| --- | --- | --- | --- | --- |
| `pittura` | la scala del muro: chiaro in alto, scuro al piede | .7 | .7 | il cielo illumina il muro in alto, la via stretta toglie luce al piede: la casa poggia a terra |
| `varia` | macchie di valore di 5-14 m su muri e suolo, solo di valore | .85 | .6, tre rumori (uno a 60 cm) e tinte calde/fredde a caso | le riprese d'intonaco e del lastrico fatte in anni diversi: ogni facciata è una mano, non un tono di catalogo |
| `vissuto` | sui tetti: coppi nuovi e vecchi a chiazze (~1 m); il muschio solo sulle falde a nord, basse; niente sui terrazzi né sui muri | .9 | 1, muschio e colature ovunque | i coppi si cambiano a pezzi; il muschio cresce dove resta umido e in ombra: la cornice dei tetti si legge vissuta, non sporca |
| `tremolio` | il confine delle bande di luce appena irregolare (±2,5%) | .025 | .06 | la mano del pittore: il bordo della campitura non è tirato col righello |
| `microNormale` | la luce radente che trema sulla superficie, solo entro 10-22 m; mai nel profilo leggero | .35 | .12 ovunque | l'intonaco e la pietra sono ruvidi: si vede solo da vicino, da lontano era grana |
| `fuoco` | il fondo lontano dal personaggio perde fino al 5% di colore | .05 | — | la gerarchia: prima il personaggio, poi la via davanti (la luce sta un passo avanti, `NIT.avanti`), poi il set |
| `retino` | — | 0 | .14, ogni ombra | fuori: nella scena non ha una causa (non è luce né materia) |
| `nuvole` | — | 0 | .22 | fuori: la camera guarda in basso, la nuvola non si vede mai e l'ombra restava senza causa |

Le altre manopole che restano, con la loro causa: il piede dei muri liscio e freddo (`polvere` .7: gli schizzi della pioggia e i passi
sporcano il primo metro); il piede e la gronda nel passo (`DIOR.piede` .3, `gronda` .24: la luce del cielo arriva meno dove una cosa
tocca terra e sotto lo sporto); il cielo dell'ora sul suolo la sera (il cielo è ancora chiaro quando il sole è giù); il bordo di luce delle
persone (`CAT.bordoPersone` .2: il controluce del cielo sulle spalle, stacca la figura); la lente che respira (`PELL`: il fish-eye della
VX1000, più largo quando si corre); la grana (`AD.grana` .01: l'emulsione); la vignetta (la lente). La temperatura è una per luce: il sole
caldo (`#ffe2b8`), l'ombra fredda dal cielo (`#5c62c8`); il suolo al sole è scaldato dal sole, mai una tinta a caso.

**Il filtro.** Ogni effetto deve avere una causa che chi guarda capisce: un'ombra ha una luce, il muschio sta dove è umido, lo sporco dove
si tocca. Se la causa non si nomina, l'effetto esce o si lega a una causa. Il foglio `_immagini/direzione/dosi/` mette a confronto zero
dettaglio e la dose scelta (la prima dose, .5, alla distanza di gioco non si distingueva da zero: alzata al giro 4).

Fuori anche: il rumore del suolo e della polvere, le colature sui muri.

**Nel passo finale** (`sguInit`, `#define SG_DIR`), in quest'ordine e nient'altro:

| strato | costo (letture per pixel) | dose |
| --- | --- | --- |
| la lente che respira | 0 | .022 fermo, .03 a piedi, .038 di corsa, .05 sui mezzi, .01 nel regime |
| antialiasing FXAA (profilo leggero) | 9 | — |
| contrasto attorno ai medi, viraggio ombre/luci, saturazione dell'ora | 0 | §4 |
| la gerarchia per categoria | 1 | §3 |
| il piede e la gronda | 4 | .3, .24 |
| la sagoma delle persone | 8 | .9 |
| neri puliti, grana | 0 | grana .01 (si sente, non si vede) |
| la luce sul personaggio un passo avanti, il fuoco, la vignetta | 0 | `NIT.luce` .06, `DIR.fuoco` .05, vignetta ≤ .16 di notte, .08 di giorno |

**Fuori dal passo**: la nitidezza, il contrasto locale, la soppressione della densità delle linee, il pennarello su ogni faccia, la
pellicola che correggeva i grigi, la tavolozza «viva» per tinta, il verde acido.

**Il costo.** Nel profilo leggero (la Iris Xe del committente) il passo finale è sceso da 35 a 23 letture della tessitura per pixel (via la
nitidezza, 4, e la densità delle linee, 8) e ha perso i rami della pellicola e della tavolozza. Nei materiali i rumori per frammento (ogni
rumore sono 8 hash): un muro da 7-9 a 3, il suolo da 8 a 3, un tetto da 7 a 4; via il retino (le derivate e un ramo per luce) e le nuvole.
I programmi non aumentano (gli stessi `#define`, nessuna variante nuova).

**I tasselli.** Gli shader dei materiali delle case nei tasselli cotti sono scritti già espansi (10 programmi su 56 stringhe): i cambi ai
materiali si vedono sulle case solo coi tasselli ricotti per questa impronta (il workflow `tasselli` al push su `main`, o in locale
`node strumenti/tassella.js --impronta=<impronta>`, ~15 min). Le foto del giro finale sono coi tasselli ricotti.

## 7. L'identità hip hop: dove sta

- **Writing** (`graffiti.js`, `writing.js`): il contorno nero spesso, le gocciolature, i primari pieni (`#ff4f9a`, `#ffd23f`, `#2f6bff`,
  `#18c29c`); sui muri, le saracinesche, i treni. È l'accento più forte del quadro e cresce con la rivoluzione.
- **Lettering** (`segnaletica.js`): le insegne dipinte a mano e lo stencil della strada contro il carattere a macchina, dritto e grigio, del regime.
- **Colore**: l'accento delle cose con cui si interagisce, uno solo (`#ff4f9a`); il colore riservato al personaggio.
- **Vestiti** (`vestiario.js`): taglie larghe, blocchi di colore, cappellini e tute; la folla della strada in pastello, il personaggio in
  colore pieno.
- **Luce**: il neon rosa e turchese la notte, la lente che respira col ritmo, la grana appena: il VX1000 si sente nel movimento, non in un
  filtro sul fermo immagine.

## 8. Come si prova

- `node strumenti/galleria.js <cartella> strumenti/scorci.json 960 600` con `SOLO=01_rua,02_vicolo,07_vittoria,18_sera,19_notte` e
  `PV_QUERY='?cittanuova&leggera&tassellivecchi'` (il profilo del committente), poi lo stesso con `&lookvecchio`;
  `python3 strumenti/fogli_direzione.py <uscita> prima=<cartella> dopo=<cartella>` fa i fogli affiancati con le misure per categoria.
- `GALLERIA_VARIANTI=strumenti/manopole_direzione_audit.json`: lo stesso scorcio con uno strato alla volta spento (le manopole dal vivo,
  anche `PRO` = `SGU.pro`, `PELL`, `RIV`).
- I fogli di questo giro: `_immagini/direzione/`.

## 9. Il giro del 2-3 novembre: misure e fogli

Stessa build, stessa camera, stesse scene; prima = `&lookvecchio` coi tasselli di prima (`a4d37afc`), dopo = il look nuovo coi tasselli
ricotti; profilo leggero, 960×600. Luminanza / saturazione per categoria (`<scena>_cat.json`):

| scena | suolo prima → dopo | muri prima → dopo | tetti prima → dopo | persone/suolo |
| --- | --- | --- | --- | --- |
| mattino, Rua Maestra | .43/.47 → .50/.24 | .42/.51 → .49/.30 | .47/.49 → .40/.35 | 1,26 → 1,67 |
| mezzogiorno, vicolo | .34/.45 → .37/.26 | .40/.48 → .49/.26 | .49/.38 → .42/.26 | 1,09 → 1,42 |
| mezzogiorno, Vittoria | .44/.43 → .42/.17 | .42/.54 → .50/.30 | .50/.59 → .43/.39 | 1,39 → 1,29 |
| sera, il bar | .40/.58 → .50/.45 | .29/.61 → .36/.49 | .45/.71 → .39/.53 | 1,29 → 2,63 |
| notte, Vittoria | .13/.77 → .17/.63 | .19/.66 → .21/.57 | .25/.58 → .21/.45 | 2,54 → 1,71 |

Cosa dicono: di giorno l'ordine dei valori ora c'è (muri sopra il suolo, tetti sotto i muri: prima i tetti erano la cosa più chiara e i
muri la più scura), il fondo non grida più (saturazione da ~.5 a ~.25-.3), la sera le persone si staccano (2,6:1). Le medie dei muri
restano sotto il .62 del piano perché contano anche le facce in ombra. Da guardare al prossimo giro: a mezzogiorno il suolo della via
larga tende al grigio-lilla (saturazione .17: il tetto di saturazione del suolo al sole, .20, si può alzare a .26 e il sole scaldarlo di
più); di notte le persone si staccano meno di prima (1,7:1, prima 2,5:1: il passo non le spinge più col «colore pieno» su tutto).

I giri: 1 (via gli strati; la gerarchia di giorno non partiva per l'errore di `gN.z`), 2 (il giorno corretto: ombre grigio-scure, muri
ancora scuri), 3 (muri a .68, l'ombra piena del cielo oltremare-lilla, il suolo scaldato dal sole, contrasto 1,14), 4 (le cause: muschio
a nord, via nuvole e retino, il fuoco sul personaggio; la merge di [camera4]; i tasselli ricotti), finale (le dosi alzate: a .5 non si
distinguevano da zero; saturazione del giorno 1,10, muri al 66% del contrasto, fuoco .10).

I fogli (`_immagini/direzione/`):
- `prima_dopo/<scena>.jpg` e `prima_dopo/mosaico.jpg`: le cinque scene, prima e dopo, con le misure;
- `dosi/<scena>.jpg`, `dosi/dettaglio_rua.jpg`, `dosi/dettaglio_vittoria_tetti.jpg`: zero dettaglio contro la dose scelta;
- `facciata_linee_rua.jpg`: le facciate con finestre e cornici, il pennarello su ogni faccia contro nessuna linea sugli spigoli interni;
- `varco_vicolo.jpg`: il varco del primo piano, a puntini contro pulito;
- `giri_rua.jpg`: la stessa scena giro per giro;
- `lookvecchio_identico_vicolo.jpg`: la build di prima e la nuova con `?lookvecchio`, uguali (a meno della gente e dello streaming).

## 10. Il giro del colore (3 novembre)

Il committente, sul giro finale: pulito e leggibile, ma «ha perso l'identità di colore»: tutto grigio-lilla e slavato, i tetti bruno-grigi,
la via grigia fredda, i muri latte, il sole non scalda. Il vecchio era sporco ma vivo. Si tiene tutto il guadagnato (linee, ordine dei
valori, cause, costo) e si rimette il colore dove ha una causa:

- **il sole dorato** (`#ffd9a2`, le luci ×[1,06 1 ,91]): il lato al sole è caldo, il bilanciamento appena caldo; il suolo al sole lo
  scalda il sole (mai grigio), tetto di saturazione del suolo .28;
- **l'ombra blu-viola piena** (`#5a58cc` × .38, il viraggio delle ombre ×[,90 ,92 1,17], il tetto dell'ombra del suolo .50): colorata, non grigia;
- **il pastello pieno** dei muri (+12% di colore, tetto .44 in luce) e **il cotto chiaro** dei tetti (+15%, tetto .50), col valore sempre sotto i muri;
- **il velo latte tolto**: il sollevamento del valore dei muri e del suolo non tocca più i neri (finestre, vani, porte: erano loro il latte),
  il colore pieno sulle cose già colorate torna (.30 di giorno), i neri .06, il fuoco a .05;
- **gli accenti** (persiane, tende, insegne: le cose già sature, non il suolo) +16% di colore sul set; le persone come prima;
- **la notte**: il controluce delle persone (vetrine, neon alle spalle) quasi triplo e un filo di valore in più, solo a notte piena
  (al tramonto il suolo è chiaro e la figura si stacca scura).

Misure (luminanza/saturazione medie; fra parentesi L80, il valore delle superfici al sole: le medie dei muri contano anche finestre e
facce in ombra) — vecchio · giro finale · giro del colore:

| scena | suolo | muri | tetti | persone/suolo |
| --- | --- | --- | --- | --- |
| Rua Maestra | .43/.47 (.54) · .50/.24 (.71) · .47/.34 (.66) | .42/.51 (.73) · .49/.30 (.70) · .45/.41 (.69) | .47/.49 (.56) · .40/.35 (.47) · .38/.51 (.46) | 1,26 · 1,67 · 1,62 |
| vicolo | .34/.45 (.42) · .37/.26 (.45) · .35/.36 (.42) | .40/.48 (.77) · .49/.26 (.72) · .45/.34 (.73) | .49/.38 (.56) · .42/.26 (.47) · .40/.47 (.45) | 1,09 · 1,42 · 1,40 |
| Vittoria | .44/.43 (.56) · .42/.17 (.50) · .48/.28 (.64) | .42/.54 (.70) · .50/.30 (.69) · .46/.43 (.68) | .50/.59 (.56) · .43/.39 (.47) · .42/.58 (.45) | 1,39 · 1,29 · 1,10 |
| sera, il bar | .40/.58 (.53) · .50/.45 (.65) · .53/.51 (.65) | .29/.61 (.47) · .36/.49 (.52) · .37/.58 (.52) | .45/.71 (.52) · .39/.53 (.44) · .39/.65 (.43) | 1,29 · 2,63 · 2,21 |
| notte, Vittoria | .13/.77 (.20) · .17/.63 (.28) · .16/.64 (.26) | .19/.66 (.28) · .21/.57 (.30) · .20/.67 (.29) | .25/.58 (.33) · .21/.45 (.29) · .21/.54 (.29) | 2,54 · 1,71 · 2,56 |

L'ordine dei valori al sole regge (muri .68-.73 sopra il suolo, tetti .45-.46 sotto tutti e due); la saturazione torna nella forchetta
della bibbia (muri .34-.43, tetti .47-.58, suolo .28-.36); i neri delle finestre restano neri. Resta da guardare: a Vittoria il personaggio
vestito chiaro su un lastrico chiaro si stacca col colore e con la linea, non col valore (1,1:1).

I fogli a tre (vecchio · giro finale · giro del colore): `_immagini/direzione/colore/<scena>.jpg` e `colore/mosaico.jpg`.

