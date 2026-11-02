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
   blu profondo di notte con le pozze calde del sodio. Il bordo dell'ombra è netto e morbido, senza retino né tremolio.
4. **Il fondo respira, gli accenti esplodono.** Muri pastello (saturazione ≤ .40 in luce), suolo calmo (≤ .20 al sole), tetti cotto
   spento (≤ .46). La saturazione piena (.75-.95) solo a writing, insegne, saracinesche dipinte, neon, vestiti, cose con cui si
   interagisce: al più il 10-12% del quadro, il fluo sotto l'1%.
5. **Una linea sola.** La sagoma delle persone, larga 1-1,5 px, del colore della cosa più scuro (nel regime grigia e uniforme). Nessun
   contorno su case, tetti e suolo: il volume lo dà la luce a tre toni (sole, mezzo, ombra) di ogni faccia, la separazione lo dà il valore.
6. **Le superfici sostengono la forma, e il dettaglio è dosato.** La scala del muro (chiaro in alto, scuro al piede), una velatura e una
   pennellata larghe, le chiazze e il muschio dei tetti, il piede delle cose a terra, l'ombra della gronda: alla distanza di gioco si
   leggono come mano di pittore. Niente rumore sotto il metro (la micro-normale vive solo da vicino), niente retino fuori dall'ombra piena,
   le nuvole rare. Il dettaglio fine è disegno e geometria (finestre, persiane, insegne, writing, piante). Le dosi in `DIR` (§6).
7. **Il passo finale ha un budget fisso** (§6). Ogni effetto è al servizio di una lettura, non si vede come effetto.
8. **Il regime è dritto e grigio**: lente ferma, colore a un terzo, la linea tecnica uniforme. La strada è calda, curva e colorata: lo
   stato della rivoluzione (`RIV`) sposta l'immagine fra i due, e solo lui.
9. **L'identità hip hop sta nelle cose, non nel filtro** (§7): writing, lettering dipinto a mano, saracinesche, vestiti, neon, gente.
10. **Si toglie prima di aggiungere.** La pulizia viene da poche decisioni ripetute ovunque. Ogni strato del look ha la sua manopola e il
    suo interruttore; `?lookvecchio` riporta il look di prima per il confronto.

## 3. Il piano dei valori per categoria

Luminanza (0-1, Rec. 709) e saturazione (HSV, 0-1) misurate dalla galleria (`<scena>_cat.json`), di giorno nel profilo leggero.

| categoria | luminanza | saturazione | come |
| --- | --- | --- | --- |
| **suolo** (il palco) | .36-.50 al sole, valore stretto attorno a .43 | ≤ .20 al sole, scaldato dal sole (mai grigio), ≤ .42 in ombra (oltremare-lilla) | `SG_DIR` nel passo |
| **muri** (il fondo che respira) | .62-.74 al sole, ≥ .38 in ombra (mai buco) | ≤ .40 in luce, ≤ .50 in ombra; gli accenti già saturi restano | il valore verso .68 al 60% del contrasto |
| **tetti** (la cornice) | .36-.50, mai sopra i muri | ≤ .46 (cotto spento, ardesia, lastrico) | il valore a .42 ± 70%, tetto .50 |
| **persone** | contrasto col suolo ≥ 2:1 | accenti .8-.95 | +30% colore, +20% contrasto, la linea |
| **accenti** | — | .75-.95 | nei materiali e nei segni |

Di notte la gerarchia si allenta (`gN.z`, il giorno): i valori li fanno le luci (sodio, neon, finestre), i tetti di saturazione salgono
a .62 così le pozze calde e i neon tengono il colore.

## 4. La tavolozza

**Per ora** (`SGU.momenti`, render.js; il passo e le luci):

| ora | sole | cielo (riempie l'ombra) | ombra (tinta) | nebbia, aria | bordo | grading |
| --- | --- | --- | --- | --- | --- | --- |
| mattino | `#ffe2b8` × 1.36 | `#9cc4f2` × .50, terra `#a89c88` | `#5c62c8` × .36 (oltremare-lilla) | `#e2dfd8` | `#fff0dc` | sat 1.03, contrasto 1.14, ombre ×[.93 .95 1.12] |
| pomeriggio | `#ffe6c0` × 1.38 | `#9ec6f2` × .48, terra `#ab9c86` | `#6260c8` × .36 | `#e4e0d8` | `#fff0dc` | sat 1.03, contrasto 1.14, ombre ×[.93 .95 1.12] |
| sera | `#ffb47a` × 1.0 | `#9a88c8` × .60, terra `#a8826a` | `#7a46a8` × .32 (magenta-viola) | `#d8a0ac` (rosa) | `#ff9ec0` | sat 1.00, contrasto 1.10 |
| notte | `#9ab0e0` × .34 | `#2a3360` × .40, terra `#2a2230` | `#3a3a78` × .18 (blu profondo) | `#141a2c` | `#5ec8e8` (ciano) | sat 1.04, contrasto 1.12 |

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

| manopola | cosa fa | dose | prima |
| --- | --- | --- | --- |
| `pittura` | la scala del muro: chiaro in alto, scuro al piede (poggia a terra) | .6 | .7 |
| `varia` | velatura (~14 m) e pennellata larga (~5 m) di valore, un filo di caldo e freddo, su muri e suolo | .5 | .6, tre rumori (uno a 60 cm) |
| `vissuto` | sui tetti: chiazze di coppi nuovi e vecchi (~1 m) e il muschio raro; i terrazzi a metà; niente colature sui muri | .5 | 1, muri compresi |
| `tremolio` | il confine delle bande di luce appena irregolare | .025 | .06 |
| `microNormale` | la luce che trema sulla superficie, solo entro 10-22 m dalla camera; mai nel profilo leggero | .35 | .12 ovunque |
| `retino` | il retino solo nell'ombra piena dei muri (mai sul suolo) | .06 | .14, ogni ombra |
| `nuvole` | ombre di nuvole rare e morbide | .1 | .22 |

Restano anche il piede dei muri liscio e freddo (`polvere` .7), il cielo dell'ora sul suolo la sera, il bordo di luce delle persone, le
finestre accese la sera, l'acqua. Fuori: il rumore del suolo e della polvere, le colature sui muri.

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
| la luce sul personaggio, la vignetta | 0 | vignetta ≤ .16 di notte, .08 di giorno |

**Fuori dal passo**: la nitidezza, il contrasto locale, la soppressione della densità delle linee, il pennarello su ogni faccia, la
pellicola che correggeva i grigi, la tavolozza «viva» per tinta, il verde acido. Nel profilo leggero il passo è sceso da ~34 a ~23
letture per pixel; nei materiali di un muro da fino a 9 rumori a 1.

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
