# Audit delle insegne (città nuova, `?cittanuova`)

Audit in sola lettura. Il codice non è stato toccato. Le misure vengono dal gioco vero, fatto girare senza testa (SwiftShader) il 2026-11-08,
e dalla lettura delle sorgenti in `v7/src`. Gli script di prova sono nello scratchpad della sessione (`insegne/run*.js`, `data.json`).

Cosa ha detto Andrea, guardando Piazza San Rocco di notte (`_immagini/commedia/R_14_mendicante_0.jpg`): «insegna nera illeggibile e compenetrata;
la maggior parte delle insegne sono piatte e semplificate, senza carattere, sembrano random, messe dove non servono, compenetrate o illeggibili;
l'albero entra dentro la tettoia, il cartello sulla tettoia non si legge, è solo un piano».

**In una riga:** ha ragione su tutti i punti, e ognuno ha una causa precisa nel codice. Le insegne della città nascono da **cinque sistemi
indipendenti** che non si conoscono fra loro. Il più vecchio (`addSign`, il «neon» del 2025) disegna ancora il 50% delle insegne con un
pannello fisso di 3,4 m, scuro, su facciate larghe anche 2 m. Il sistema delle «botteghe sotto casa» (`fronteBottega`) mette metà delle
insegne su facciate che la camera non vede, e metà larghe 1,3 m, con lettere di 8 cm.

---

## 1. Chi fa le insegne: i percorsi del codice

### 1.1 Da dove viene il testo (i dati)

| Fonte | file:riga | Cosa produce |
|---|---|---|
| Botteghe principali | `world_cittanuova.js:2972-3003` (`USES`) | `b.use`, `b.name` = «Uso + NOME» (es. «Ferramenta Bruno»), `b.sign = {t, c}` (testo maiuscolo + colore neon). Con `sottoCasa()` (`:2980`) diventa `b.shopFront` se la facciata è ≥ 3 caselle e la casa ha ≥ 2 piani |
| Botteghe minori per epoca | `world_cittanuova.js:3002-3027` (`MINORI`, `COLB`) | Drogheria, Frutta e verdura, Osteria, Bar… per epoca della via. Il nome è «Mestiere + NOMI/COGNOMI» |
| Nomi propri | `world_cittanuova.js:2942` `NOMI = ['Bruno','Tina','Gavino','Nello','Pina','Efisio','Rosaria','Totò','Lella','Mario']` | Solo 10 nomi. Risultato misurato: «Mario» compare 9 volte, «Nello» 7, «Tina» 4 |
| Locali con nome | `world_cittanuova.js:3028-3029` | bar, wu, osteria, sirena, gelateria, video: ricevono `shopFront` se il palazzo lo permette |
| **Mestieri dell'economia** | `economia.js:41-60` (`NEW_SHOPS`, `assignTrades`) | Emporio, **Macelleria Gavino, Frutta e verdura Tina, Fabbro Nello, Falegnameria Efisio**. Prende **la casa libera più vicina alla piazza, di qualunque misura**, e le dà `b.sign` senza `shopFront`. Ultimo commit sul file: `acf9cd5` (2026-10-11, merge #43) |
| Fabbriche | `world_cittanuova.js:2013, 2023, 3045` | `insegna: 'MINIERA NORD'` ecc. sul pezzo `opificio` |
| Segnaletica | `segnaletica.js:432-458` (`TIPI`) | Una parola per mestiere (BAR, ALIMENTARI, FRUTTA…), un'icona, i colori di fondo e del testo, e se si accende la notte |
| Scorci | `scorci.js:44-89`, `:114,129` (ricette) | Testi delle ricette («PIAZZA SAN ROCCO», marchi Peroni/Sammontana…) |

### 1.2 Dove e come vengono disegnate (la geometria)

Lo smistamento sta in `render.js:6033`:
`if (b.__bot) fronteBottega(...) else if (b.sign) addSign(...)`.
`addSign` viene chiamata anche in `render.js:6830` (case piatte) e in `render.js:10869` (corpi déco, capannoni).

**A. `addSign`, il neon del 2025.** `render.js:11056-11109`; testo in `signTexture` (`render.js:6060-6081`); font `SIGN_FONT` = Arial Black (`:6049`).
- Pannello fisso `PlaneGeometry(3.4, .85)` (`:11073`), **qualunque sia la larghezza della facciata**. `MeshBasicMaterial` senza luci.
- Fondo `#14101c` (quasi nero), lettere al neon: alone del colore più un'anima bianca al 72% (`:6070-6077`).
- Con `ARR3` va su `pm3('insegna_tavola')` (`arredo3d.js:1138-1160`), una tavola con fondo `mB` di default `#2a2a30` (nera) e cornice.
- **Facce S/E**: piatta sul muro a +6 cm (`:11076-11077`), centrata sulla porta (`dx`/`dz`), a `base+3,0` m.
- **Facce N/W**: diventa bandiera. Piano `DoubleSide`, scala 0,6, sporge 1,22 m (`:11078-11088`).
- Corpi déco con ≥ 4 piani: bandiera verticale `bladeTexture` (`:6093`) con la parola corta `shortWord` (`:6084-6091`), più la luce e l'alone.
- Tenda a righe `addAwning` (`render.js:11111-11125`): 3,0 m di larghezza, spostata di +1,4 m dalla porta (sulla faccia S), alta `awnY+.2`.

**B. `fronteBottega`, le botteghe sotto casa ([botteghe], filone C).** `render.js:10987-11054`; testo in `insegnaTex` (`render.js:10957-10977`); stile per epoca `ERA_INS` (`:10956`).
- E0 dipinta: fondo `#e2d4b4`, corsivo serif `#7a2a1e`.
- E2 tavola: con `SEGNI.on` diventa la tavola **nera con le lettere d'oro**, da HANDOFF_ad.md:79.
- E3 marmo (lettere spaziate), E4 lapidaria, E6 plexi (l'unico che si accende), E7 latta.
- Larghezza `iw = min(span delle aperture + 0,2, 6,2)`, altezza 0,52 m (0,42 per la lapidaria), a `base+3,0` m (`:11014-11018`). Spessore della cassa per stile (`:11016`).
- Targa d'ottone 0,5 × 0,28 a 1,62 m se la bottega sta al primo piano (`:11007-11009`).
- Tenda `tenda_bottega` a `base+2,68` (`:11030-11037`); mai sotto i portici, mai in E4.
- Esce subito se c'è uno scorcio (`:11012`).

**C. `segnaletica.js`, la bandiera del mestiere ([segnaletica]).**
- Scelta del posto in `bandieraDi` (`:479-511`). Cerca prima i posti che la camera vede, poi gira l'angolo verso S/E. Ripiega sulla targa accanto al portone (`targaDi`, `:513`).
- Lunetta sotto i portici (`porticoDi`, `:469`).
- Disegno nell'atlante 2048² (`tessInsegna`, `:680-708`). Geometria in `:819-842`.
- Bandiera da 0,46 a 0,79 m × 0,66 m, a 2,8 m (`CFG.bandiera`, `:43`). Si accende la notte solo se `TIPI.luce`.
- Insegne a pannello o a tavola su pali per i luoghi senza bottega: MERCATO, S. ROCCO, ROCCA…

**D. `scorci_arte.js`, gli scorci ([scorci]).** È il sistema più ricco.
- Pezzi: `K.fascia` in quattro stili (dipinta, tavola, mano, cassonetto luminoso) (`:192-200`), `K.insegna2` (le tavolette secondarie) (`:201`).
- `K.bandiera` (la scatola luminosa coi marchi), `K.palo_barbiere`, `K.lampada` a collo d'oca, `targa`, `cartellone` (`:96-160`, `:203-212`).
- Copre solo poche facciate (le ricette in `scorci.js`), e solo S/E.

**E. Altri.**
- Il cartone del banco del mercato: `handTex` 1,2 × 0,45 a 1,95 m, `render.js:6284` (banco3 / ARR3) e `:6327`.
- Il tendone: `render.js:3483`.
- Le torri del governo: `render.js:6215`.
- Il cartellone sul tetto: `roofBillboard`, `render.js:6222`, solo per i tetti del boom.
- Le scritte dei pezzi: `pezzi_citta.js:307` `scritta()`. Le usano opificio (`:1762`) e torre_boom (`:1524`, oggi non piazzata).
- Le insegne degli interni: `interni_arte.js:555-583`.

### 1.3 Le etichette DOM «▸ Casa Porcu»

Le fa `risacca_ui.js:455`, dentro `labels(st)` (`:436`): per ogni `b.door` entro 9 m dal giocatore, `put(x, y, 1.9, 'door', '▸ ' + (b.label || b.name || 'Porta'), 9)`. La posizione viene da `R.project()` (`render.js:20477`) e i nodi sono riusati (`labPut`, `:460`). La stessa funzione fa anche «□ spazio libero» (`:446`). Sono queste etichette, non le insegne 3D, a dire al giocatore il nome della bottega. È un indizio forte che le insegne non bastano.

### 1.4 A chi appartiene ogni file (git log -1 e tag)

| File | Ultimo commit | Chi ha fatto le insegne |
|---|---|---|
| `render.js` | `028767d` 2026-11-07 [integra1] | `fronteBottega` da `94a42c6` (2026-10-20, «filone C, botteghe sotto casa»). `addSign`/`signTexture` [insegne1] da `4ccf62c` (2026-10-19). Tavola nera e oro [segni]. Banchi [ordine1]/[dettaglio2] |
| `world_cittanuova.js` | `727086a` 2026-11-06 [urbanistica1] | `USES`/`MINORI`/`sottoCasa` [botteghe] `94a42c6` |
| `economia.js` | `acf9cd5` 2026-10-11 | `NEW_SHOPS` (Tina, Gavino, Nello, Efisio) |
| `segnaletica.js` | `a1dae13` 2026-11-07 [integra1] | [segnaletica] `faf78ff` 2026-10-23 |
| `arredo3d.js` | `a1dae13` [integra1] | `insegna_tavola`, `tenda_bottega` [dettaglio2] |
| `scorci.js` / `scorci_arte.js` | `1afbc86` 2026-10-23 / `4c440b9` 2026-10-27 | [scorci] |
| `pezzi_citta.js` | `a1dae13` [integra1] | [pezzi] |
| `risacca_ui.js` | `f79d907` 2026-11-04 [orienta] | etichette |
| `game.js` (banchi) | `50e0aa2` 2026-11-05 [controlli8] | layout del mercato `:2750-2757` |
| `strada_dipinta.js` | `e64d033` [integra1] | non tocca le insegne: incolla adesivi sui pali e dietro i cartelli |
| `urbanistica2.js` | `1c1c93a` [urbanistica2] | legge le insegne solo per decidere le facce cieche (`:280`) |
| `vegetazione.js` | `59e5b6a` [camera7] | gli alberi |

---

## 2. Difetti concreti, con le prove

Censimento in gioco: **109 edifici con insegna o bottega**.

| Percorso | Quante | Dettaglio |
|---|---|---|
| `fronteBottega` | 54 | 31 E0 dipinta, 19 E3 marmo, 4 E2 tavola. **Nessuna** in E4, E6 o E7: lapidaria, plexi e latta non compaiono mai in città |
| `addSign` | 55 | 46 normali + 9 déco |

Camera di gioco: `YAW = π/4`, `PITCH = 0.78` (`render.js:17`). Si guarda da sud-est: **le facce S ed E si vedono, N e W sono schiene**. Lo dice anche `scorci.js:11`.

### D1 L'«insegna nera compenetrata» di Andrea: è Frutta e verdura Tina (causa trovata)

`economia.js:55-58` dà il fruttivendolo alla casa libera più vicina alla piazza. Quella casa è `casa_194` (xywh 688,147,1,2): **una casella di fronte, cioè 2 m**. Non ha `shopFront`, quindi passa da `addSign`:

- **Il pannello è troppo largo.** È di 3,4 m (tavola 3,54 m) su una facciata di 2 m. Sporge di 0,7-0,8 m per lato nei muri dei vicini. Nello screenshot si vede solo «…RA» di «FRUTTA E VERDURA», fra la tenda e il palazzo di mattoni che sporge a destra.
- **È nero.** Fondo `#14101c` più la tavola `#2a2a30`. Il neon del fruttivendolo `#8aff6a` si legge solo se acceso, ed è proprio l'anima bianca al 72% a farlo sembrare «bianco su nero».
- **La tenda è fuori posto.** `addAwning` aggiunge una tenda di 3,0 m spostata di +1,4 m dalla porta. Copre da 0,1 m a sinistra a 2,9 m a destra della porta: 1,9 m finiscono sulla facciata del vicino.

Lo stesso caso, una casella di facciata con l'insegna da 3,4 m: **Farmacia Tina, Ufficio Mario**.

### D2 La tenda di `addSign` taglia l'insegna

Per tutte le 55 insegne `addSign` sulle facce S ed E:
- L'insegna sta a `base+3,0 ± 0,425` (2,575-3,425 m).
- La tenda (`addAwning`, ARR3) ha il cassonetto a `awnY + .2 = base+2,75`, alto ±0,07 e profondo 0,16 m (`arredo3d.js:1086`).
- Il cassonetto attraversa la fascia bassa della tavola e del piano della scritta, che sta a +0,06 m: **compenetrazione fisica**.
- Sulla faccia E la tenda è centrata su `dz`, esattamente sotto l'insegna (`render.js:11117`). Sulla faccia S è spostata di 1,4 m, quindi la sovrapposizione è di 1,8 m.

### D3 Più della metà delle insegne di bottega guarda dove la camera non c'è

Delle 43 `fronteBottega` misurate:

| Faccia | Quante |
|---|---|
| N | 18 |
| W | 7 |
| S | 9 |
| E | 9 |

**Il 58% è piatto su una faccia che dalla camera di partenza non si vede.** `fronteBottega` non ha né bandiera né girata d'angolo. A metterci una pezza ci pensa `segnaletica.bandieraDi`, ma con una parola generica.

Esempio misurato: Drogheria Nello, faccia N. Dalla piazza si legge la bandiera «ALIMENTARI» (foto `insegne_04/05`), non «DROGHERIA NELLO». Il nome sulla fascia non lo vede nessuno.

### D4 Lettere troppo piccole

Misure prese col proiettore del gioco (`R.project`, vista a zoom 0,6 da sud-est, foto `insegne_04`): a una ventina di metri, **15 cm di lettera = 6,5 px, 30 cm = 13 px**; una persona di 1,75 m vicina al centro = 207 px.

Altezze delle maiuscole, calcolate dai parametri del codice:

| Insegna | Altezza maiuscola | Pixel alla distanza di gioco |
|---|---|---|
| `fronteBottega` con la sola porta (iw = 1,3 m, **21 su 43**). Es. «DROGHERIA NELLO», 15 caratteri: canvas 512 × 205, il corpo scende a circa 45 px | **≈ 8 cm** | 3-7 px: illeggibile |
| `fronteBottega` larga (iw ≈ 3,2 m, la mediana), «SARTORIA ROSARIA» | ≈ 17 cm | 7-15 px |
| Marmo E3, con le lettere spaziate (`:10972`, il testo raddoppia di lunghezza) | circa la metà | |
| `segnaletica` bandiera: parola a 34 px su una tessera di 184 px per 0,66 m (`segnaletica.js:700`) | **≈ 8,5 cm**, più lo scorcio di 45° | |
| `addSign` | ≈ 19-27 cm | l'unica che si legge, ed è proprio quella «nera» |

### D5 Il cartello del banco buca il telo («il cartello sulla tettoia è solo un piano»)

`render.js:6284` (banco3) e `:6327`: cartone 1,2 × 0,45 a y = 1,95 m (1,725-2,175), z = +0,86.

| Telo | Geometria | Altezza a z = 0,86 | Risultato |
|---|---|---|---|
| `falda` | `box(4.2,.03,1.9)` a `y = 2.3·hh`, z 0,25, inclinato di 0,32 rad | 2,3·hh − 0,20 m | Per `hh < 1,03` (hh è casuale fra 0,85 e 1,10, cioè **circa il 70% dei banchi**) il cartone esce dal telo |
| `righe` | uguale (0,3 rad, z 0,2) | | Il cartone sta anche dietro la mantovana a z 1,0 |
| `falde` | | | Il bordo del telo è a z 0,83: il cartone gli sta 3 cm davanti e spunta sopra la gronda |

Dalla camera alta si vede il dorso del telo con un rettangolo chiaro appoggiato sopra (foto `insegne_01`, banco in basso a destra). Il cartone è un `PlaneGeometry` a una faccia, senza cassa né spago visibile.

### D6 L'albero dentro la tettoia

Foto `insegne_01` e `insegne_03`: il tronco dell'albero della piazza passa attraverso il telo del banco di frutta (1376, 303).

- I banchi li mette `game.js:2750-2757`, «contro la facciata ovest del sagrato».
- Gli alberi vengono da `vegetazione.js`. Le regole di `chiarezza.js` proteggono porte, vetrine e scale, non i banchi.

**Proprietà di un altro team: lo segnalo e basta.**

### D7 Bandiere a una faccia sola specchiate

- In `addSign`, sulle facce N/W, il piano della scritta è uno solo, `side = DoubleSide` (`render.js:11079`).
- Con la camera di partenza si legge dritto, ma camera7 gira (nelle mie foto 01-03 la camera era a ovest). Da metà dei lati la scritta è **speculare**.
- In 24 edifici (17 N + 7 W).
- `segnaletica.js:824` fa invece bene: due piastre, una per faccia.

### D8 Scritte che escono dalla loro tavola (pezzi)

- `pezzi_citta.js:1762` (opificio, «MINIERA NORD/SUD»):
  - la tavola è centrata a `H-1,45` e alta 0,95 m (da H−1,925 a H−0,975);
  - la scritta è centrata a `H-0,97` e alta 0,7 m;
  - **mezza scritta sta fuori dalla tavola, sopra**.
- `pezzi_citta.js:1524` (torre_boom): stesso errore, tavola a 3,25 ± 0,3 e scritta a 3,55 ± 0,225, bianca su «giallo». Oggi però la torre non è piazzata in città.

### D9 Nomi senza senso e doppioni

- **Doppioni.** «FRUTTA E VERDURA» × 6, «VINI E CUCINA» × 5, «UFFICI» × 3, «OSTERIA» × 2, «✚ FARMACIA» × 2.
- **Pochi nomi.** Solo 10 nomi propri. Nel giro di 30 m dalla piazza ci sono Drogheria Nello, Fabbro Nello, Calzolaio Nello e Palestra Nello.
- **Botteghe col nome di battesimo.** «Farmacia Tina», «Ufficio Tina», «Ufficio Mario» (con l'insegna UFFICI).
- **Neon dove non va.** «Scuola elementare» e «Banco di Porto Vecchio» hanno l'insegna al neon da bar (`addSign`).
- **Nomi che non si accordano:**
  - «Falegnameria Efisio» ha l'insegna FALEGNAME;
  - «Drogheria Nello» ha la fascia DROGHERIA NELLO e la bandiera ALIMENTARI;
  - «Frutta e verdura Tina» ha l'insegna FRUTTA E VERDURA e l'etichetta DOM con il nome intero.
- **Il fabbro.** «Fabbro Nello» sta in una casa di 4 piani in piazza, con insegna neon a bandiera.

### D10 Dove l'insegna non serve

- **Insegne di `addSign` su porte che non sono vetrine.** `economia.js` sceglie la casa più vicina alla piazza, non la più adatta. Le case di `addSign` non hanno vetrine aperte (solo `fronteBottega` le apre via `b.__bot`). Risultato: una tavola nera da 3,4 m sopra un portone di casa.
- **Bandiere che indicano un'altra cosa.** Le 21 botteghe `fronteBottega` con la sola porta hanno anche la bandiera di segnaletica sulla stessa casa. Va bene, però la bandiera dice il mestiere generico.

### Foto (in `_immagini/commedia/`)

| File | Cosa mostra |
|---|---|
| `insegne_01_piazza_tina_giorno.jpg` | Camera girata a ovest. Il banco di frutta col tronco che buca il telo e il cartone steso sul telo (in basso a destra); il banco ombrellone col cartone scuro |
| `insegne_02_piazza_tina_notte.jpg` | Stessa inquadratura, di notte. In basso a sinistra, di taglio, l'insegna nera a neon di Tina |
| `insegne_03_tina_banco_vicino_notte.jpg` | Più vicino. Il tronco nel telo, la facciata di Tina con il pannello scuro di taglio |
| `insegne_04_piazza_sudest_giorno.jpg` | Camera di partenza (SE). La bandiera ALIMENTARI di segnaletica, leggibile ma generica (la bottega si chiama Drogheria Nello e la sua fascia guarda a nord); il pannello S. ROCCO |
| `insegne_05_piazza_sudest_notte.jpg` | La stessa di notte. S. ROCCO resta scuro (non si accende) |
| `insegne_04_banco_vicino_giorno.jpg`, `insegne_05_via_sartoria_giorno.jpg` | Già nel repo dal commit `79ea929`. Sono **inutilizzabili**: la camera è schiacciata sul personaggio. Le ho lasciate dov'erano: si possono cancellare |

La camera senza testa resta difficile da governare: camera7 collassa sotto i portici. Una foto della via con le botteghe sulla faccia S non sono riuscito a farla.

---

## 3. Varietà: cosa c'è e cosa manca

| Tipo | C'è? | Dove | Note |
|---|---|---|---|
| Dipinta sul muro | sì | `insegnaTex` 'dipinta' (E0), `scorci_arte K.fascia` 'dipinta'/'mano' | Piatta: un decal senza rilievo né sporco |
| Tavola di legno con cornice | sì | `insegnaTex` 'tavola' (E2, nera e oro), `arredo3d insegna_tavola`, `scorci K.fascia` 'tavola' | Solo 4 in città |
| Lastra di marmo con faretti | sì | E3 (19) | Lettere spaziate: le più piccole |
| Lettere lapidarie di bronzo | codice sì, città **no** (0 in E4) | | |
| Cassonetto in plexi luminoso | codice sì, città **no** (0 in E6). Negli scorci sì (`K.fascia` 'cassonetto') | | Mancano le insegne del boom |
| Latta | codice sì, città **no** | | |
| Neon a tubo (lettere che sono tubi) | **no**. `addSign` è un pannello scuro con il testo «a neon» dipinto in texture | | |
| Bandiera perpendicolare | sì | `segnaletica` (icona + parola), `addSign` N/W (tavola a braccio), `scorci K.bandiera` (scatola luminosa coi marchi), `bladeTexture` verticale déco | Quattro implementazioni diverse |
| Tenda con scritta sulla mantovana | **no** | `tenda_bottega` e `addAwning` sono a righe, senza testo. L'unica scritta su un telo è quella del tendone (`render.js:3483`) | |
| Lettere scatolate singole sulla fascia | **no** | | |
| Targa accanto al portone | sì | `fronteBottega` primo piano (0 casi in città: `piano` 1 non capita mai), `segnaletica targaDi`, `scorci targa` | |
| Lavagna / cavalletto | sì | `fronteBottega` (bottiglie), scorci | Senza scritta leggibile |
| Vetrofania / scritta sul vetro | **no** | | |
| Insegna incisa sull'architrave | **no** | | |
| Croce verde della farmacia, T dei tabacchi, palo del barbiere | sì | `segnaletica` (croce, T), scorci (palo) | |
| Cartellone sul tetto | sì | `roofBillboard`, solo E6 | |

Il problema della varietà sta nella **distribuzione** più che nei pezzi. Lo stile più ricco (scorci) copre poche facciate. Il 50% delle insegne è il pannello scuro uguale per tutti di `addSign`. In città compaiono solo tre stili di epoca, E0, E3 ed E2, perché `MINORI` e `shopFront.era` non generano mai E4, E6 o E7 dentro la città.

---

## 4. Proprietà e chi dovrebbe correggere cosa

**Non toccare (altri team):**
- `strada_dipinta.js` (adesivi e manifesti);
- `writing.js` (il posto dei graffiti: rispetta già la fascia delle insegne, `render.js:8509-8517`);
- `urbanistica2.js` (facce cieche);
- `vegetazione.js` e `chiarezza.js` (alberi);
- personaggi.

| Difetto | Dove si corregge | A chi tocca |
|---|---|---|
| D1 Tina 3,4 m su 2 m; D10 mestieri messi a caso | `economia.js:52-58` (scegliere case con facciata ≥ 3 caselle e ≥ 2 piani, poi `sottoCasa`, così passano da `fronteBottega`) **oppure** `addSign` `render.js:11073` (larghezza = min(3,4, facciata − 0,3)) | Economia/botteghe. È la correzione da fare per prima, e la più piccola |
| D2 La tenda taglia l'insegna | `addAwning` `render.js:11111-11119` (sotto l'insegna: y ≤ `signY − .5`, centrata e larga quanto l'insegna, mai oltre la facciata) | Insegne (render.js, blocco [insegne1]/[dettaglio]) |
| D3 Il 58% guarda a N/W | `fronteBottega` `render.js:11013-11019` (sulle facce N/W la fascia si stampa comunque, ma la bandiera col NOME, non la parola generica, va in `segnaletica.bandieraDi` `:479`); oppure `sottoCasa` che preferisce le facce S/E | Botteghe + segnaletica |
| D4 Lettere piccole | `insegnaTex` `:10971` (niente spaziatura del marmo sotto i 2 m; una sola parola, il mestiere, quando iw < 2 m); `fronteBottega` `:11014` (iw minimo 2,4 m anche con la sola porta, oppure sulla fascia sopra porta + finestra); `segnaletica tessInsegna` `:705` (parola più grande) | Insegne / segnaletica |
| D5 Il cartone buca il telo | `render.js:6284` e `:6327`: y = `min(1.95, quota del telo a z .86 − .3)`, oppure appeso alla traversa davanti (z 1,05) sotto la mantovana, oppure due facce con lo spago | Mercato (render.js banchi [ordine1]/[dettaglio2]) |
| D6 L'albero nella tettoia | `vegetazione.js` / `chiarezza.js`: aggiungere i banchi (`G.layout().items` kind 'banco') ai fronti protetti | **Squadra vegetazione** (solo segnalazione) |
| D7 Bandiere specchiate | `render.js:11079`: due piani `FrontSide` dorso a dorso, come fa `segnaletica.js:824` | Insegne |
| D8 Scritte fuori dalla tavola | `pezzi_citta.js:1762` (y della scritta = H−1,45) e `:1524` | Pezzi |
| D9 Nomi | `world_cittanuova.js:2942` (più nomi, più cognomi, mai due mestieri con lo stesso nome entro 60 m); `:2996`/`:3024` (regole per l'insegna: farmacie, uffici e scuole senza nome di battesimo e senza neon); allineare `segnaletica TIPI` alla fascia (drogheria → DROGHERIA) | Botteghe (world_cittanuova [botteghe]) + segnaletica |
| Varietà | Collegare `scorci_arte K.fascia/K.bandiera/K.insegna2/K.lampada` a `fronteBottega` come kit di base per epoca, non solo dove c'è una ricetta. Dare E4/E6 a vie vere (la Vittoria, il boom) | Insegne + scorci |

Il nodo vero è l'ownership. Oggi `render.js` ha le insegne sparse fra [insegne1], [botteghe], [segni], [dettaglio2] e [ordine1], `segnaletica.js` e `scorci_arte.js` hanno ciascuno le proprie, e nessuno possiede «l'insegna» come oggetto. Proposta: un solo modulo `insegne.js`, posseduto da una sessione, che decida **una** insegna principale per bottega (stile, faccia visibile, misura, luce) e chiami la grafica di scorci_arte e di segnaletica come librerie.
