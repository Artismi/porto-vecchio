# Porto Vecchio — la regola di stile (coerenza delle famiglie di modelli)

Il committente, sullo scatto della piazza: «alcuni modelli sono super dettagliati, altri mega low poly: la mappa sembra un'accozzaglia».
Il palo del cartello era un rettangolo, le chiome erano piatte e scure, il pavimento era dettagliatissimo.
La causa non è un modello brutto. È che **ogni famiglia di oggetti è stata fatta con una sua densità**: il suolo dipinto al centimetro,
gli oggetti in mano al millimetro, i pali a listello, le chiome a blob. Qui c'è la misura comune, scritta una volta.

La misura di partenza è la camera del gioco: assonometria (fov 14°, pitch ≈ 41-45°), circa **5-6 cm per pixel** allo zoom normale (zoom 1)
e 2-3 cm da vicino (zoom 0,4). Quello che sta sotto i 2-3 pixel non si vede come forma: diventa grana che frigge.

## 1. L'audit: quanto è densa ogni famiglia

Densità geometrica: triangoli per m² della superficie del suo involucro. Frequenza della trama: la misura della cosa più piccola
dipinta. Smussi: come chiude lo spigolo. Le misure vengono dagli script di `scratchpad/coerenza` (`proc.js`, `glbstat.js`), dai
parametri nel codice e dagli scatti.

| Famiglia | Dove | Densità | Trama più piccola | Spigoli e sagoma | Giudizio |
|---|---|---|---|---|---|
| Palazzi, facciate, tetti | render.js, tetti.js | 1-5 tri/m² | finestre e coppi 0,3-1 m; la trama dell'intonaco a metà ampiezza (look nuovo) | masse grandi, cornici e davanzali sporgenti | **il riferimento** |
| Personaggi | assets/mc (Casual, Casual_2, Hoodie, Formal, Worker) | 5-6 mila tri a persona, circa 1.700 tri/m² | nessuna texture, solo tinte piene | chunky, smussi morbidi, sagoma chiara | **il riferimento** |
| Pezzi urbani grandi | pezzi_citta.js | mediana 2 tri/m² (1-64) | come i palazzi | smussi, torniti, profili (la fontana è a posto) | in linea |
| Arredo di strada | arredo3d.js | mediana 107 tri/m² (20-380); oltre 1.000 sull'isolatore e sul civico | — | profili torniti e lastre smussate, **viti e staffe da 1-2 cm** | un po' alto sui pezzi minuti, ma regge |
| Segnaletica | segnaletica.js | pali a 6 lati con 3 cm di raggio (6 cm: 1 px) | strisce 12-15 cm | prisma col tappo e il piede | il palo è troppo sottile e sfaccettato |
| Pali «a scatola» | render.js `box(.04-.2, 1-16 m, …)` | 12 tri | — | **listelli a spigolo vivo**: 40 pali (lampade, ringhiere, il salvagente, le antenne) | **outlier basso** |
| Totem del distributore | render.js (benzina) | 12 tri per 5 m di palo | — | **una scatola di 40 × 40 cm e un foglio che galleggia davanti** | **outlier basso** (il «palo rettangolo» dello scatto) |
| Alberi di città (lecci, pini) | render.js `leccioGeo`, `pinoDomGeo` | leccio 1.670 tri di chioma, pino ≈ 4.400 (13 masse a icosaedro 2 e 120 carte d'aghi) | carte di foglie da 30 cm, 120 ciuffi d'aghi sul pino | una massa liscia (leccio) o un nugolo di carte (pino) | **outlier nel valore**: albedo #0d100b-#323a29, la tinta per sole raddoppia l'ombra del lato buio e la chioma diventa una macchia nera |
| Verde dell'isola | vegetazione.js | carte a lobi, gamma dipinta | pennellate in celle da 256 px | a lobi | in linea (gamma nella scala) |
| **Suolo** | pavimenti.js (shader) | 0 geometria | **cubetti di porfido da 11 cm (2 px), file scure ogni 55 cm, giunti da 0,9-1,6 cm, inerti da 4 cm, pori del travertino** | — | **outlier alto**: la grana più fine di tutta la scena, a contrasto pieno |
| Cartacce | render.js `paper()` | 2 tri | fogli piatti da 22 cm a 1 m, carta chiara (valore ≈ 85) | quadrati piatti | **outlier basso**: «quadrati di debug» |
| Anelli del gioco | render.js (giocatore, missione, clic, raccolta, costa) | 16-20 lati | corona da 12 a **30 cm**, opacità 0,7-0,9 | poligoni a 16 lati | **outlier**: anelli grossi, a scatti |
| Increspatura della fontana | pezzi_citta.js | 24 lati | corona da 0,32 m chiara all'opacità 0,75 | — | come gli anelli |
| Oggetti del catalogo | roba3d.js | mediana 11.800 tri/m², oltre 100 mila (molle 9.434 tri, sigarette 2.818) | etichette dipinte | torniti a 28 lati per 3 cm | **outlier alto**, ma si vedono in mano e nei menu: in strada solo le tazze e i bicchieri dei tavolini |
| Auto scaricate | assets/mj `r_RX_7` 19,7 mila, `r_GTR` 14,8 mila, `r_1972-bursley` 11,2 mila | 4 ruote da 2,9-3,3 mila tri l'una | — | — | **outlier alto** (in strada nel traffico), fino a 7 volte le nostre auto |
| Alberi del kit della natura in città | kit_natura (CommonTree, ≈ 1.000 tri) sulle caselle TREE della città | chioma a carte fitte e scure | — | — | **outlier di famiglia**: un albero di bosco in piazza accanto ai lecci (l'albero dal tronco rosso dello scatto) |
| Mobili e kit | assets/mf (mediana 176 tri), kit Kenney (20-200 tri a pezzo), kit_natura (≈ 1.000 per albero) | — | atlanti piccoli | spigoli vivi ma masse grandi | in linea; fuori misura `rc_cinecamera` (3,5 mila, solo negli interni) |
| Soldatini Toon Shooter | assets/mc Soldier, Enemy, Hazmat (19-20 mila tri) | — | — | teste enormi, altro stile | non si disegnano più (le divise sono persone vere); Soldier si carica solo per le armi |

Gli outlier sono quindi alle due estremità. In alto: il **suolo** (la trama più fine), le **auto scaricate** e gli **oggetti del catalogo**.
In basso: i **pali a scatola**, il **totem**, le **cartacce piatte** e gli **anelli**. A parte, per il valore: le **chiome** dei lecci e dei pini.

## 2. La regola

Lo stile bersaglio è quello dei palazzi e dei personaggi: **forme chunky dagli spigoli morbidi, sagome che si leggono, poche
trame grandi**. Il colore segue la grammatica dei valori del look nuovo (`scratchpad/team/design.md`): muro al sole > suolo > tetto ≈
ombra dei muri > verde. Il suolo sta a 45-60, il verde a 30-45, e solo i personaggi e gli interattivi staccano. La tavolozza hip-hop
del look nuovo resta com'è.

1. **La sagoma minima.** Niente scatole nude per le cose sottili e alte. Un palo è un cilindro a 8 lati col tappo, non scende sotto
   i 9 cm di diametro (2 px) e porta un piede o un collare dove tocca terra. Un pannello ha lo spessore e la cornice, e sta fra i suoi
   montanti, mai sospeso. Il minimo vale anche al contrario: niente dettagli sotto i 2-3 cm (viti, scritte a rilievo) come forma. Un
   dettaglio piccolo si dipinge, oppure si toglie.
2. **La trama a misura della camera.** Il suolo tiene il suo tipo e il suo carattere (basoli, travertino, porfido a coda di pavone,
   asfalto vissuto, suolo per formazione): si calmano solo la frequenza e il contrasto dove gridano. La cosa ripetuta più piccola
   deve misurare almeno 15 cm, cioè 3 px allo zoom normale: il cubetto di porfido passa da 11 a 16 cm sul ventaglio da 2,4 m, e le
   altre pietre crescono di un quarto (basoli da 65 cm, travertino da 1,1 m). I giunti scendono a due terzi della forza, il contrasto
   da pietra a pietra a due terzi, la grana fine (pori, inerti, sassolini) a meno della metà: resta, ma non frigge. Il valore medio
   non cambia.
3. **Le chiome.** Due corone di lobi lisci, quella bassa larga e quella alta stretta, più una calotta. Sono le stesse masse dei
   personaggi, non un nugolo di carte. Il valore lo dà l'altezza nella chioma: calotta chiara e calda (oliva), ventre più scuro e freddo
   (verde-azzurro), mai nero. La luce del gioco ci passa sopra; la tinta non la raddoppia. Ogni lobo ha un cappello di luce, così lo
   strato si legge. Il bordo morbido lo dà la luce di bordo del look nuovo. Il valore resta dentro la scala, 30-45, con un filo di
   luce propria che tiene il lato in ombra sopra il 20. Le carte restano a rompere il contorno: 34 sul leccio come prima, 100 sul pino.
   L'istanziamento e il costo non aumentano.
4. **I decal e le cose a terra.** Le cose sparse a terra hanno una forma vera e non sono quadrati piatti: la pallottola accartocciata,
   il foglio piegato a tetto, il cartone piegato. Hanno le misure di prima e sono spente: il valore del suolo ±10, non il bianco carta
   né il rosso pieno. Sono tante quante prima, perché la strada vissuta resta. Le macchie dipinte (olio, sporco) seguono la regola 2.
5. **I segni del gioco (anelli).** Si tengono, ma sono fili e non fasce: la corona è larga 7-9 cm, tonda a 48 lati e opaca al
   60-75 %. Il disco di riempimento è appena accennato (10 %). Lo stesso vale per le increspature della fontana: due fili sottili.
   Il segno deve leggersi come grafica sopra il mondo, non come un pezzo del mondo.
6. **Il bilancio.** Nessuna famiglia supera di molto la densità del riferimento allo stesso ingombro sullo schermo. Una cosa
   lunga 4 m in strada (un'auto) non ha più di circa 8 mila triangoli. Una ruota non ha più di qualche centinaio di triangoli. Un
   albero di città ha la chioma sotto i 1.500 triangoli. Un modello scaricato fuori misura si semplifica al caricamento
   (raggruppamento dei vertici a 4,5 cm, sotto il pixel del gioco) oppure si sostituisce. Non si toglie mai un contenuto: si portano
   gli estremi verso il centro. Ogni correzione costa uguale o meno: triangoli, chiamate e memoria
   (il telefono prima di tutto).

`?look=vecchio` rimette tutto com'era: la regola vale per il look nuovo.

## 3. Che cosa si è portato alla regola (ordine d'impatto)

| Outlier | Dove | Che cosa | Costo prima → dopo |
|---|---|---|---|
| Suolo | pavimenti.js (`PV_CALMO`, solo con TONE_MAPPING) | pietre ×1,2-1,25, porfido 11 → 16 cm, giunti 0,34 → 0,22, smusso 0,16 → 0,11, contrasto della pietra ×0,65, grana fine ×0,4, file del ventaglio ×0,55; stessi tipi | stesse chiamate, stesso shader (meno letture di rumore) |
| Chiome | render.js `chiomaStrati`, `lobo5`, `tintaS`, `PAL5`, `chiomaMat5`, `buildNatG` | leccio e pino domestico a strati, tinta per quota (a schermo ≈ 25 ventre, 35 mezzo, 48 calotta), filo di luce propria; le caselle d'albero dentro la città (gli otto alberi dell'Ottagono) prendevano l'albero del kit della natura, a carte scure: ora sono lecci di città con la loro ombra | leccio 1.668 → 1.028 tri di chioma (−38 %); pino ≈ 4.400 → ≈ 1.400 (−68 %); stesse istanze e chiamate (un materiale al posto di un altro) |
| Pali a scatola | render.js `box()` → `poloGeo` | ogni scatola ≤ 20 cm di lato, alta ≥ 1 m e ≥ 8 volte il lato, diventa un cilindro a 8 lati col tappo | 12 → 22 tri a palo (circa 40 tipi di palo) |
| Pali dei cartelli | segnaletica.js `palo()` | 6 → 8 lati, raggio minimo 4,5 cm | +4 tri a palo (37 pali) |
| Totem del distributore | render.js (benzina) | zoccolo, due montanti tondi, pannello con lo spessore, tetto; il cartello dei prezzi sulle due facce | 12 + 2 → ≈ 180 tri, un pezzo solo in tutta la città |
| Cartacce | render.js `carta5` | pallottole (8 tri) e fogli o cartoni piegati (4 tri), color carta spenta, tante quante prima | +2-6 tri a foglio, lo stesso numero di materiali |
| Anelli | render.js `anello5` | corona di 7-9 cm a 48 lati, opacità −10-15 punti | +60 tri ad anello (5 anelli) |
| Increspatura della fontana | pezzi_citta.js | due fili a 40 lati, opacità 0,75 → 0,55 | +112 tri a fontana |
| Auto scaricate | models.js `semplifica` | raggruppamento dei vertici a 4,5 cm (normale in 6 direzioni) al caricamento | RX-7 19.720 → 8.604, GTR 14.772 → 5.751, Bursley 11.217 → 9.867 tri |

Non toccati, perché sono già nella regola o non si vedono in strada: i palazzi, i personaggi, la fontana, l'arredo3d, il verde
dell'isola (vegetazione.js, gamma già nella scala), gli oggetti del catalogo (si vedono in mano), i kit Kenney.

Misura a schermo (Chromium + SwiftShader, 1280 × 800, look nuovo, ore 11; `renderer.info`, prima → dopo): piazza del Forno
498 → 542 chiamate, 1,73 → 1,71 milioni di triangoli; incrocio della Vittoria coi cartelli 626 → 583 chiamate, 1,87 → 1,56 milioni
(nel dopo alcuni palazzi in fondo erano ancora nella sagoma lontana: il numero è basso anche per questo); piazza dell'Ottagono coi
lecci 720 → 716 chiamate, 1,79 → 1,79 milioni. Le chiamate oscillano di ± 40 da un avvio all'altro, secondo quanto della città
lontana è già costruito: il bilancio per famiglia (tabella qui sopra) è il numero che conta.
