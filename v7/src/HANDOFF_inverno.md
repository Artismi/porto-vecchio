# Porto Vecchio — v7 «Inverno»: diario dei lavori e passaggio di consegne

Aggiornato: 3 ottobre 2026, sera (19:10). Base: **v6** (la build fusa: Risacca, abitanti, vita, azioni, economia, tasche). v6 non è stata toccata.
Documento di progetto (visione, fazioni, mappa, decisioni): Claude Doc «Porto Vecchio — progetto di implementazione».

## Come si lavora
- Sorgenti in `v7/src/`, build con `python3 build.py` dentro `v7/` (ricompone `index.html`). Modelli in `v7/assets/`.
- **render.js non si modifica a mano**: si parte da `v6/src/render.js` e si applicano gli script in `tools/` in ordine:
  ```
  cp v6/src/render.js v7/src/render.js
  python3 tools/inverno_render.py  v7/src/render.js   # cielo, luci, grading, neve che cade, nebbia, neve a terra, alberi
  python3 tools/inverno_render2.py v7/src/render.js   # esposizione, mare d'acciaio, facciate e tetti, abeti d'arredo, porto
  python3 tools/inverno_render3.py v7/src/render.js   # paesaggio (Muro, Base, porto cargo, stazioni, beduini, bivacchi, fuochi), leggibilità
  python3 tools/inverno_render4.py v7/src/render.js   # riva liscia, marciapiedi col cordolo, zoccoli, gradini, neve contro i muri, controluce, coni di luce, vapore, nebbia a strati
  python3 tools/inverno_render5.py v7/src/render.js   # contrasto, tetti vissuti (inverno_tetti.js), facciate col carattere (inverno_facciate.js)
  python3 tools/inverno_render6.py v7/src/render.js   # vegetazione nuova (vegetazione_kit.js)
  ```
  (gli script stanno in `v7/strumenti_inverno/`; nel container di Claude in `pv/tools/`)
  Ogni script controlla che il pezzo da sostituire esista (se v6 cambia, si ferma e dice cosa non trova).
  Frammenti inclusi dagli script: `snowpass.js` (neve a terra), `alberi.js` (vegetazione), `inverno_paesaggio.js` (paesaggio), `inverno_volumi.js` (volumi e aria).
- `world.js` invece è riscritto direttamente in `v7/src/world.js` (la copia di v6 resta in `v6/src/world.js`).
- Prove: `node test_vita.js 2 1`, `node test_azioni.js 1 1`, `node test_economia.js 2 1` dalla cartella `src` (tutte passano con la mappa nuova).
  Screenshot: Chromium senza testa con `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, server http locale,
  `window.__pv` per spostare giocatore, ora (`st.t` in minuti) e zoom (`ui.zoom`), `__pv.R.cam` per spostare subito la camera.

## Fatto
### Mappa nuova (`world.js`) — lingua di terra da ovest a est, 680 × 280 m (340 × 140 caselle)
- Da ovest: **prateria** dei beduini (larga), **foresta** coi villaggi (San Giacomo, Borgo dei Carbonai), **periferia ovest**,
  **centro** su tutta la larghezza, **periferia est**, **il Muro** (x = 556, un solo varco), **la Base** della Tutela, **il porto cargo e militare**.
- **Dorsale come l'Appennino**: nasce nella foresta e corre lungo la mezzeria tra le due costiere, si abbassa e si apre nel centro,
  risale nella periferia est fino al Muro. Quote fino a ~7 m. Funzioni `HILLS`, `ridgeT`, `hillQ`, `ridgeH`.
  Sopra: sentiero di crinale (`crinale_o`, `crinale_e`) come via alternativa, una strada che la scavalca per lato (`collina_o`, `monte`), sentieri dalle costiere.
- **Due costiere** (`nord`, `litoranea`) che seguono la riva: a tratti case tra strada e mare, a tratti la strada sul mare (`onSea`, `coastOff`).
- Centro a isolati (3 vie est-ovest, 5 traverse, il Corso che si apre su Piazza San Rocco), porto vecchio dei pescatori sulla riva sud.
- Periferie: case lungo le costiere e blocchi d'abitazione `block: 'khrush'` (4 piani, da sostituire col modello chruščëvka).
- Base: Rocca, caserma, hangar, depositi, 6 baracche (`use: 'baracca'`). Porto cargo con moli larghi verso est.
- Prateria: stazioni di estrazione Nord e Sud (`miniera`, `stazione2`), saline, Punta col faro. Niente case: è dei beduini.
- **Tutti gli id di luoghi ed edifici di v6 sono rimasti** (gli altri moduli li usano): sono solo spostati. Nuovi luoghi:
  `collina_o, bivacco_o, monolite, campeggio_o, bivacco_e, campeggio_e, covo, muro, varco, eliporto, molo_cargo, villaggio, beduini, stazione_n, stazione_s`.
  I luoghi `camp: 'bivacco' | 'tende' | 'monolite' | 'beduini'` vengono arredati dal render.
- Insegne in **cirillico e coreano** (es. БАР ДЖИНО, 吳 식료품, ДВОРЕЦ КУЛЬТУРЫ, ОПЕКА 보호). L'Emporio di `economia.js` ha ancora l'insegna EMPORIO.
- Esportati in più: `WALL`, `HILLS`, `VILLAGES`, `districtAt(x)`, `yc`, `northY`, `southY`, `onLand`, `SX`, `SY`.
- Numeri: 148 edifici, 115 luoghi, 260 abitanti + 33 del cast, tutto raggiungibile.

### Atmosfera d'inverno (`render.js` via script)
- Cielo grigio-latte, sole pallido senza bande, notte blu-grigia; nebbia più vicina.
- Grading freddo: ombre blu-grigie, mezzitoni spenti, la saturazione resta solo alle luci (neon, fuoco, finestre); compressione dei bianchi.
- Neve che cade (fiocchi, più fitta durante le «piogge» di v6: 22:30-03:00 e 20:00-23:00 del secondo giorno). L'audio della pioggia è ancora quello.
- Neve a terra (`snowPass`): sporca e bagnata dove passa gente (fanghiglia, solchi, impronte, pozzanghere, cumuli grigi a bordo strada),
  candida solo sulle dorsali e nel fitto della foresta, fuliggine al porto cargo e alla Base, **niente neve in prateria** (erba secca e brina).
- Vegetazione: abeti e pini con la neve sui palchi, betulle, alberi spogli; niente palme, olivi, cactus, vigne (le chiamate a `palmTree` disegnano abeti).
- Facciate: intonaci sovietici sbiaditi; tetti sotto la neve; niente persiane liguri. Mare color acciaio.
- Zoom massimo portato a 3.2 (si vedono le due coste); blocchi del terreno caricati fino a 135 m.
- Paesaggio: il Muro (lastre, filo spinato, manifesti del regime, scritte della Risacca, torri coi riflettori che spazzano, varco con garitta e sbarre),
  la Base (radar che gira, antenna rossa, bandiere, eliporto), **l'elicottero** (di giorno a terra, di notte gira sopra Base e periferia est col faro, mai oltre),
  porto cargo (gru, container), stazioni di estrazione (torre di trivella, nastro, carbone, torcia, recinto), accampamento beduino (tende basse color erba secca),
  bivacchi (capanne di tronchi), il monolite, spiazzi con tende, **barili col fuoco** nei luoghi di ritrovo e nei cortili, cartelloni del Garante lungo le costiere.

### Aggiunte della sera
- **Dorsale larga ed esplorabile**: isola più larga nelle periferie, dorsale larga ~80 m e alta fino a ~10 m con speroni e valloni;
  anelli di sentieri sui due versanti, mulattiere; luoghi nuovi `sorgente, rudere_o, carbonaia, pozzo_o` (taglialegna), `ruderi, osservatorio` (vedetta), `grotta` (nascosta), arredati dal render.
- **Porto vecchio con banchina dritta** (la costa sud del centro è raddrizzata fra x 352 e 462).
- **Riva liscia**: la terra scende sotto l'acqua seguendo la linea di costa vera; maschera del mare dal poligono della costa.
- **Volumi**: zoccolo scuro alla base di ogni edificio, gradini alle porte, neve ammucchiata contro i muri, ombra di contatto dipinta,
  marciapiedi rialzati col cordolo nelle vie del centro.
- **Luce**: sole basso e radente (ombre lunghe, shadow map 2048 su 92 m), controluce fredda dal lato opposto.
- **Aria**: coni di luce sotto lampioni e riflettori di notte, aloni colorati a terra sotto neon e fuochi, vapore da barili e tombini, due veli di nebbia che scorrono (radi vicino al giocatore, fitti lontano).
- **Alberi abbattibili uno a uno**: modulo nuovo `src/paesaggio.js` (caricato dopo `mestieri.js` in `index.src.html`). Vicino a un albero compare «Abbatti l'albero»: serve un'ascia (nuovo oggetto `ascia` in `Azioni.ITEMS`: ferramenta, o dai taglialegna). L'albero diventa un ceppo, il bosco si apre, in tasca 3 di `legna`. Provato in Node.
- Arbusti meno fitti (meno rumore a schermo).

## Richieste di Andrea ancora da fare (in ordine)
0. (fatti: neve con bordi curvi, solchi delle gomme agli incroci)
1. **Carattere, cura, poesia**: ogni luogo deve avere una sua identità (non «tutto a caso»). Composizioni curate di oggetti, scorci, punti focali.
2. **Interni**: stanze composte secondo il tipo di locale, mobili appoggiati alle pareti e orientati (oggi vuote o a caso) — `interiors.js` e la sezione INTERNI di `render.js`.
3. **Più vita alle luci**: insegne, vetrine accese, interni visibili; luci fredde azzurre, neon rosa / ciano / giallo (Miami/cyberpunk) ma sgangherati (tubi rotti, lettere spente, sfarfallio), luci calde, fuoco.
4. **Tetti piatti per la maggior parte, e ci si può salire** (scale esterne, botole: va aggiunto al motore, oggi i tetti non sono percorribili).
5. Profondità e leggibilità: l'occhio deve sapere dove cadere (meno rumore, gerarchia di valori, volumi distinti). In parte fatto; da rivedere a schermo.
6. Modelli da Download da convertire e usare: chruščëvka PSX (`full-modular-soviet-khrushchyovka-psx`, obj), garage sovietici (obj),
   palazzo della cultura di Pripyat (gltf, texture da ridurre a 1K, per `cultura`), recinzione (fbx), casa diroccata (fbx, texture 4K),
   utensili da cucina (gltf), snack retro (fbx), Kenney retro-urban / train / watercraft. Anche i modelli vecchi vanno bene, vanno adattati.
7. **Freddo come sistema** (`popolo.js`): bisogno di calore, stufe come oggetti sociali, barili, vestiti a strati, carbone razionato, mercato nero, legna.
8. **Mettere in ordine**: verbo e oggetto per riordinare e pulire case e covi; il disordine come segno (come il sangue).
9. **Bunker sotterranei**: scavare nelle dorsali (lavoro lungo, terra gelata), da fuori solo una botola, basi nascoste ottime.
10. Fazioni: look della Tutela (fascio-comunista retrofuturista, maschere, pastrani), Risacca partigiana, mafia russa coi tatuaggi leggibili e il capo senza nome
    nella base segreta con 3-5 fidati, beduini metodici. Lo **Squalo va reso anonimo** (in `popolo.js`, `azioni.js`, `game.js` c'è ancora «Squalo»).
11. Modalità a squadre: reclute che muoiono per sempre, solo il protagonista rinasce; il ricambio della popolazione (nascite o arrivi dal regime) c'è già in `azioni.js`.
12. Audio: vento e neve al posto della pioggia.

## Coordinamento con le altre chat
- Altre chat lavorano su v7 in locale: `fazioni.js`, `soldi.js` (+ `soldi_ui.js`, non ancora in `index.src.html`), `protagonista.js`, `mestieri.js`, `popolo.js`, `economia.js`, `risacca*.js`, `models.js`.
- Questa chat (mappa e grafica) tocca solo `world.js`, `render.js` (via script), `paesaggio.js` e una riga di `index.src.html`.
- Il gioco si apre con `v7/AVVIA.bat` (server locale), non col doppio clic.

## Sera del 3 ottobre (dopo le 19)
- Camera più vicina (zoom iniziale .72 in `main.js`), personaggi con un po' di luce propria (`models.js`, riga [inverno]), contrasto più forte.
- Tetti: condizionatori, parabole, antenne con spia, teli, casse, bucato, abbaino, insegne. Facciate: scale antincendio, tubi, condizionatori, insegne a bandiera al neon, serbatoi sul tetto con insegna luminosa, cavi tra i tetti con lampade.
- Vegetazione: abeti a piani con neve sui rami, pini, betulle e tigli con rami spogli, chiome grumose, ciuffi d'erba secca, rocce con neve, vento nello shader.
- Mappa: la Base è un molo fortificato lungo e stretto (coda dell'isola, oltre il Muro); la dorsale entra in città fino prima della piazza (HILLS o: b 386, e: a 436);
  centro con viali diagonali a stella sulla piazza (diag_so, diag_se, diag_no, diag_ne), più vie e traverse, edifici più alti vicino alla piazza; canyon in prateria (`canyonH` in world.js, pareti = ROCK); marciapiedi rialzati su tutte le caselle WALK.
- Riferimento visivo dato da Andrea: scena cyberpunk verde-nebbia, serbatoio-insegna giallo, cavi, neon arancio, banchi con figure col casco rosso, suolo bagnato riflettente. Da seguire per il centro.
- Ancora da fare: edifici troppo uguali (serve composizione per tipo di locale e più modelli veri), interni, personaggi/armi più curati, suolo bagnato riflettente, tinta verde-teal nella nebbia, bancarelle/agricoltori/lavori visibili, minimappa.
- `test_economia.js` è lentissimo (oltre 100 s) anche con la mappa vecchia: non è una regressione.
- Dettagli (inverno_dettagli.js): manifesti e volantini sui muri (propaganda del Garante, concerti, scomparsi, onda della Risacca, spray), lampade, contatori, tubi del gas, citofoni; carattere esterno per tipo di locale (bar con tavolini e lucine, forno, pescheria, ferramenta, farmacia con croce verde, barbiere, tabacchi, teatro con insegna a lampadine, magazzino, case con vasi); colonnine luminose, dissuasori, cassette, Ape parcheggiate; antenne TV sui tetti. Camera più bassa (PITCH .78).

## 4 ottobre — sera (marciapiedi lisci, terreno livellato, guida, officina, banchi)
- Catena: aggiunto `inverno_render7.py` (dopo render6): texture terreno con filtro lineare, normali del terreno per vertice, camera di guida FISSA (non gira più con l'auto), mappe pavimento/muri 'officina'.
- `inverno_marciapiedi.js`: maschera a scorrimento per curvatura (10 passate), quota esatta del terreno (stessa triangolazione della mesh) + alzata compensata sulla pendenza, rumore colore continuo.
- `snowpass.js`: mappa della neve sfumata (blur ~0,6 caselle) invece dell'ingrandimento lineare; in città bordo morbido senza rumore fine.
- `world.js`: dopo `vh`, blocco "[inverno] il terreno della città si livella": rilassamento + limite di pendenza .5 attorno alle caselle urbane, vertici di edifici/acqua/moli/sabbia fermi; poi `elev[]` riallineato. Strade con pendenza >.55: da 173 a 9.
- Guida (`main.js` + `game.js`): mouse = regolatore PD (guadagno e limite dello sterzo calano con la velocità, smorzamento sulla rotazione), A/D e spazio per derapare; `roadMagnet` (calamita di corsia ±.25 quando non sterzi); tetto alla velocità di imbardata 2,6 rad/s; la vista non si ribalta più in retro.
- Officina (`protagonista.js`, `game.js: tuned()`): vicino all'Officina (in auto entro 18 m, a piedi entro 7 con un mezzo tuo) compaiono Motore / Assetto e gomme / Nitro / Corazza a livelli, a pagamento; effetti in `vehicleMotion`.
- Interni: mobili procedurali `pv_banco_lavoro`, `pv_banco_vendita`, `pv_ponte`, `pv_attrezzi`, `pv_pneumatici` (`models.js: procFurn`), piazzati in `interiors.js` (bottega, ferramenta, tabacchi, panetteria, pescheria, farmacia, retro, magazzino, ripostiglio, studio, deposito…); l'Officina ha il suo tipo `officina`.
- Clic su una porta (o sul muro entro ~3 m): vai alla porta e ci entri (`pickAt` kind 'door').
- Da fare: i banchi sono solo arredo (nessun comando "lavora al banco" né "compra al banco" legato al modello); rombi chiari a spigolo vivo vicino ai lampioni ancora non identificati; test_economia ancora lento.

## 4 ottobre — pomeriggio/sera (luci, tono, città, monte)
Catena render: `inverno_render9..15.py` (+ `inverno_citta.js`, `inverno_soglie.js` iniettati da render13 e render15). Si applicano dopo gli script inverno 1-8; `monte_render.py` va rilanciato DOPO (non è in conflitto, ha la guardia «già applicato»).
- render9: rimbalzo neve sulle pareti (hemi.groundColor), luce di riempimento da sud, nebbia verde-acqua. render10: strade bagnate (roughnessMap dal colore + envMap cielo cupo). render11/12: grading freddo, righe di schermo, bancarelle di lamiera (`mute()`), striscioni/altoparlanti/schermi/telecamere del regime sui tetti (`eyeMat`). render13: `buildCity` (torrette, rialzi, baracche, balconi, insegne verticali solo sui locali) + intonaci più forti. render14: palette ridotta a ciano/magenta/ambra (`nq()` quantizza tutti i colori delle luci), aloni solo dalle sorgenti colorate (bloom a 3 raggi nel post), pozze più piccole. render15: `buildThresholds` = tettoie davanti alle porte (lamiera, portico, telo, gazebo), fermate dell'autobus, stazioni, vicoli con lampadina e roba, luoghi comuni (fuoco in barile, distributori, bacheca); lampioni modesti (niente coni, luce bassa).
- `world.js`: case lungo le costiere/viali ora in agglomerati (`walkFront`: facciata su una linea, case attaccate, spiazzi, poi spazio aperto, seconda fila a macchie).
- `world.js` monte: creste/costoloni a rumore a creste con mappa deformata, meno rumore ad alta frequenza, poche passate di media sui vertici liberi; strade di montagna con B-spline (`chaikin`) invece degli archi; **piano di posa** per tutte le strade non a griglia (profilo smussato con pendenza max 15%/20% sterrato, sezione piana + scarpata morbida, vertici di pareti/edifici/acqua fermi).
- Verificato solo dall'alto (la camera sale sul monte): serve un occhio di notte e di giorno dal basso. Se le scarpate sono troppo larghe: `emb` nel blocco «piano di posa».

## 4 ottobre — 18:30 (neon, solchi, modelli col doppio clic)
- `inverno_render16.py` (dopo render15 e monte_render; ha la guardia «già applicato»): palette luci → sodio `#d8904a`, tubo freddo spento `#9cc8c0`, rosso cupo `#b84a3c` (via `nq`, NEON, NEONS, CCOL); filo di lampadine tutto caldo; aloni più stretti/deboli; insegne dei locali 2.2/8 invece di 5/14. Andrea: i ciano/magenta sembravano luci di Natale.
- Solchi agli incroci: niente più 6 archi casuali; `armsAt()` trova i bracci veri di ogni incrocio e si disegnano al massimo 3 svolte fra bracci vicini (non tutte).
- Personaggi «a blocchetti»: aperto col doppio clic (file://) fetch() è vietato e i modelli non arrivavano. `src/file_shim.js` (primo script) serve assets/*.json dai gemelli `*.json.js` via <script>, solo su file://. I gemelli si rifanno con `strumenti_inverno/pack_file.py` se cambiano i modelli.
- Copia di prima: `v7/_backup_neon_modelli/` (index.html, render.js, index.src.html).

## 4 ottobre — 20:30 (suoli senza blocchetti)
- `inverno_render17.py`: i «rombi scuri a spigolo vivo» (anche quelli vicino ai lampioni) erano l'isola a bassa risoluzione (`buildBase`, 8 cm sotto i blocchi) che spuntava dove il terreno vero è livellato/incavato. Ora è a pezzi da un blocco (`ISO.basePieces`) e si spegne dove il blocco vero è caricato (`updateChunks`); texture lineare. Asfalto: tinta da rumore morbido invece che per gruppi di 4 caselle. Piazza: niente scacchiera/fughe per casella, lastre a correre continue.
- `inverno_render18.py`: fanghiglia, chiazze bagnate, fuliggine e rattoppi da rettangoli a ovali sfumati (`smear`).
- Copia di render.js prima di questi due: `_backup_neon_modelli/render_prima_dei_suoli.js`.

## 4-5 ottobre — notte (niente neve, niente azzurri, regime, luci, murali)
Catena: dopo render18 → `inverno_render19..25.py` (+ frammento `inverno_propaganda.js` incluso da render22, la cui buildPropaganda è poi riscritta da render24). Ogni script ha la guardia «già applicato».
- render19: `const NEVE = false` in cima a render.js spegne tutta la neve (terreno, tetti, cumuli, alberi, fiocchi, marciapiedi). `true` la rimette.
- render20: niente azzurri (nel post-processing ogni ciano saturo va verso il grigio, manopola `AZZ`); Bar Sirena non più verde acqua.
- render21: tonalità del regime nel post (manopole `REG_SAT`, `REG_BIANCO`): restano vivi rossi e luce calda. render24 l'ha ammorbidita (REG_SAT .62) perché era tutto grigio.
- render23: luci artificiali quasi spente di giorno, aloni a terra deboli, meno luci di riempimento (le ombre si vedono).
- render24: `propPlan()` decide ALLA COSTRUZIONE dove va il ritratto del Garante: quel tratto di facciata (S o E, non il lato della porta, tutta l'altezza) nasce muro cieco, senza finestre né cornici. Slogan = insegne a lettere sul tetto. Manifesti e oggetti a muro del piano terra solo sui moduli `wall` (`b.__gwall`). Intonaci bianchi in PALS.borgo, finestre calde (LIT), sodio `#f0a048`.
- render25: `clearMurals()` (TT 'pulizia', ultimo) toglie ogni oggetto piccolo davanti ai murali.
- Copie: `_backup_neon_modelli/render_con_neve.js`, `render_con_azzurri.js`, `render_prima_del_regime.js`, `render_prima_della_propaganda.js`, `render_prima_delle_luci.js`, `render_prima_dei_muri_ciechi.js`, `render_prima_della_pulizia.js`.
- Nota: la cartella del progetto ora è `Documents\porto-vecchio\porto-vecchio\`.
- render26: le 2 luci puntuali più vicine alla camera fanno ombra (256 px, aggiornata a turno ogni 6 fotogrammi o quando la luce cambia sorgente); aloni a terra quasi spenti. lowQuality spegne queste ombre.
- render27: `tone(hex, x, z)` dà a ogni luce (e al suo alone) un tono dalla posizione: chiaro, caldo, freddo spento, giallo, ambra, arancio; il rosso del regime resta. Finestre accese di toni diversi (LIT). Copie: `render_prima_delle_ombre_luci.js`, `render_prima_dei_toni.js`.
- render28 (STUDIO LUCI): il gruppo di luci è ora `SPOOL` (faretti con ombra, quanti ne regge la scheda: N = maxTextures-7, tra 4 e 12) + `PPOOL` (8 punti senza ombra per i fuochi). Si accendono sulle sorgenti di `LSRC` dentro l'inquadratura (frustum), le più vicine prima. Ombre rifatte quando un faretto cambia sorgente e a turno 3 per fotogramma. Coni di luce leggeri nella foschia sotto le sorgenti alte di notte. Rimesso lo sfarfallio (render23 l'aveva spento per errore). Copia: `render_prima_dello_studio_luci.js`.
- Da fare per lo studio luci: luce che lava le facciate (le insegne illuminano solo verso il basso), luce che esce dalle vetrine sul marciapiede, interni (oggi PointLight senza ombra in buildInteriors).
- render29 (bilanciamento): faretti con decadimento 1.25 e bordo sfumato (penombra .95), intensità divisa tra sorgenti vicine (`L.nb`, sorgenti entro 7 m), spalla delle alte luci da .48, un filo di luna di notte. Andrea: «o bruciate o scure». Copia: `render_prima_del_bilanciamento.js`.

## 5 ottobre — l'isola nuova (testa di bosco, Tavolato, quartiere del governo, strade come opere)
Base: v7 di prima (commit «yeah.»). Copia della mappa di prima: `git show 04f174a:v7/src/world.js`.
- **Forma** (`world.js`, sezione «[isola] LA FORMA NUOVA»): mappa **1300 × 400 m** (650 × 200 caselle). Da ovest: testa di bosco tonda
  (`HEAD`, raggio 166 m) col **Tavolato** (`TAV`: tepui a 42 m, raggio ~58 m, pareti verticali, ghiaione, due canaloni `CANALI` levante/ponente:
  solo a piedi, sentieri a tornanti `canale_e`, `canale_o`, traccia in cima `tav_top`), la **Spiaggia Lunga** sulla riva sud, la vita stretta,
  il collo di foresta, poi il Monte Scuro e tutto il resto come prima.
- **Coordinate vecchie**: le funzioni di prima (`yc, northY, southY, onLand, inland, monte, zoneO, rawElevO, districtO`) restano in coordinate vecchie.
  Vecchie x 146..348 (foresta, monte, periferia ovest) → +532 m (`DXF`); vecchie x ≥ 348 (centro, periferia est, Muro, Base, porto) → +612 m (`DXC`).
  Fra 880 e 960 (`XG..XC`) c'è il **quartiere del governo** (nuovo). Le y non cambiano. `xn(vecchia) → nuova`, `xo(nuova) → vecchia`.
  Gli id di luoghi ed edifici sono tutti rimasti; quelli della prateria sono stati ricollocati nella testa (stazioni, saline, faro, punta, beduini sul Tavolato).
  Esportati in più: `DXF, DXC, XF, XG, XC, XE, xo, xn, HEAD, TAV, CANALI, GOV, BF, bosco, RING, TUNNELS, tavR, canHalf, CAN0, CAN1, canFloor, inland`.
- **Luoghi nuovi**: `tavolato, canalone_e, canalone_o, bosco_antico, campo_p, spiaggia_lunga, memoria, piazza_gov, pescatori_s, pescatori_n, pescatori_t`.
  **Edifici nuovi** (governo, `gov: true`): `pietra` (La Pietra dell'Onda), `governo` (Palazzo del Governo), `ministero`, `garante` (Uffici del Garante), `archivio`.
- **Strade**: la costiera fa il giro intero (una linea sola `RING`, divisa in `nord` e `litoranea` sulla punta ovest). `raccordo_o` (Raccordo del Valico) all'inizio
  del Monte; la strada centrale `deserto` (Strada del Bosco, asfalto) diventa `memoria` (Via della Memoria, mulattiera) e sale fino al canalone di levante.
  **Piano di posa nuovo**: priorità costiere → strade → città → sentieri; estremi e attraversamenti prendono la quota della strada già sistemata (raccordo su 30 m);
  pendenza max 15% asfalto, 20% piste, 30-42% sentieri a piedi; carreggiata in piano (anche sopra le pareti); a monte roccia tagliata quasi a picco
  (`feat & 1024`), a valle muro di sostegno sugli asfalti (`feat & 16384`), scarpata sugli sterrati; gallerie artificiali dove lo scavo supera 6,5 m
  da tutte e due le parti (`TUNNELS`, oggi nessuna). `rd.edge`: per ogni punto e lato, 1 taglio, 2 salto, 3 mare (per guardrail e parapetti).
- **Città**: case a schiera di larghezze e profondità diverse, qualcuna arretrata; **baraccopoli** (`shack: true`) che riempie i cortili e le periferie
  lasciando passaggi storti; altezze da 1 a 8 piani, più alte verso il governo; **palazzi a gradoni** (`b.tiers`: volumi più piccoli sopra il corpo, terrazzo sulla strada,
  stanzetta in cima). **Borghi dei pescatori**: tre gruppi di casette sulla riva col pontile (`fisher: true`).
- **Render** (catena: dopo `inverno_render30.py` → `inverno_render31.py`, `inverno_render32.py`, `inverno_render33.py`; frammenti `isola_render.js`, `isola_render2.js`):
  baracche di lamiera a pannelli storti; palazzi a gradoni; banchi del mercato di fortuna (cassette, telo sbiadito, cartone scritto a mano, lampadina) al posto di quelli a righe;
  torri del governo (colossi coi globi e torre dell'orologio, busto del Garante in facciata, piramidi di cemento, capsula rossa sul fusto, bunker a contrafforti);
  cartelloni sui tetti su traliccio; guardrail e parapetti dove la strada cade o corre sul mare (qualche tratto storto o mancante); cartelli rovinati agli incroci
  (cirillico, ruggine, fori); cantieri con coni, transenne, lampada gialla; posti di blocco; panchine, paletti, cabine, buche delle lettere, fermate; massi ai piedi dei tagli;
  tagli e muri dipinti a bordi tondi; fascia del marciapiede e maschera dei marciapiedi rialzati che seguono la curva delle strade storte (niente scalini);
  parete del Tavolato liscia sulla curva vera con le costole, ciglio che copre il bordo del terreno; faro su traliccio con la torre di lamiera arancione;
  stazioni di estrazione di mattoni con ciminiere a fasce, silo e condotti; sottobosco, chiome in più, faggi; chiome del kit naturale più chiare.
  Coordinate scritte a mano spostate di `DXC` (barche del porto, banchine, vapore, elicottero); `coastIn` usa `world.inland`.
- **Strumenti** (`strumenti_inverno/`): `pianta3d.html` + `pianta3d.js` (vista d'insieme della mappa con etichette: `node strumenti_inverno/pianta3d.js out.png "box=x0,y0,x1,y1&lab=id,id&top=1"`),
  `shot_gioco.js` (istantanee del gioco vero da un file di scene; azzera il lampo rosa che senza testa resta acceso), `controlla_mappa.js` (pendenze, incroci, sezione, compenetrazioni, raggiungibilità).
- **Prove**: `test_vita`, `test_azioni`, `test_oggetti`, `test_fazioni`, `test_livelli` passano. `test_soldi` si ferma su `I.arrest is not a function` (fazioni.js:311)
  anche con la mappa di prima: non dipende dalla mappa. Gli abitanti salgono verso il tetto di `popolo.js` (420) perché ci sono più case; `test_oggetti` ora dura ~70 s.
- **Da fare**: guardare a schermo da vicino i palazzi del governo e il Tavolato di giorno e di notte; bunker a sommergibili per il porto cargo; gallerie (oggi nessuna);
  interni delle baracche; i lavoratori all'aperto nelle stazioni lontane arrivano tardi (la testa è a ~800 m dalla città).

## 5 ottobre (sera) — città leggibile, Tavolato pulito, bosco
- `world.js`: rete dei vicoli ricostruita: lati candidati sul reticolo sghembo, attacchi alle strade larghe (`n.att`), monconi ciechi potati, si tengono solo i pezzi collegati a una strada. Tavolato: `tavR` a pochi lobi larghi, cima quasi piana, ghiaione a fascia continua (niente caselle a caso), meno rocce sul pianoro.
- `render.js` script 34 (case coi pezzi del kit Retro Urban, megastrutture solo alla Base), 35 (`isola_render4.js`) e 36 (`isola_render5.js`), da applicare in ordine dopo il 33.
  - 35: asfalto e basoli a pattern allineati al mondo, marciapiede solo a fascia lungo le vie larghe con lastre, cordolo e canaletta; strisce pedonali solo agli incroci veri; `groundH` comprende l'altezza del marciapiede (`swH`/`swField`), quindi persone, auto e arredi ci poggiano sopra; `pulizia35` toglie gli arredi dentro le case, sulla carreggiata o uno dentro l'altro (prima della fusione statica); verde in città (`verdeCitta35` in buildNat); oggetti con una logica (`oggetti35`: bar, alimentari, officine, porte di casa, bidoni sul fianco verso la strada, roba vecchia nei cortili, cantieri fermi, lampadine tese sui vicoli, pattume lungo i cordoli); ruvidità del suolo non più legata al colore scuro.
  - 36: suolo del bosco e del Tavolato dipinto a mezzo metro (aghi e muschio, radure d'erba secca, ghiaione per distanza dalla parete, pianoro di roccia bagnata), sassi del ghiaione scuri, alberi colorati a macchie per specie, più sottobosco, ciglio del Tavolato scuro.
- `main.js` riga del `Kit.load`: aggiunti `urbano`, `casa`, `stazione`, `garage`, `tortura` (una riga, file di un'altra chat).
- Aperto: al sole basso il suolo piatto resta chiaro per la color grading del regime (post in render.js, regia luci); il bosco resta molto scuro per lo stesso motivo. Errore sporadico in popolo/economia: `give` su un compratore senza `pop` (`k.pop` undefined).
- Tessuto della città con una logica (`world.js`, `walkFront` con opzione `o`): Corso a fronte continuo sul filo, case profonde 10-12 m; vie secondarie; vicoli con case strette, dentini e qualche androne; seconda passata che chiude i buchi; cortili dentro gli isolati; baraccopoli fuori dal centro (oltre 70 m dalla piazza). Altezze da rango della via (`b.rk`), piazza vicina, angoli fra due strade, palazzine vicine simili (rumore a blocchi di 12 m): in città 1-4 piani, quasi tutte 2-3.
- Script 37 (`inverno_render37.py`, con l'ok di Andrea, coordinato con la sessione «Case»): notte di luna leggibile (hemi/fill/moon più forti di notte), giorno meno slavato, post con ombre meno schiacciate e azzurrate, REG_SAT .8, contrasto 1.12. La sessione «Case» non tocca il grading.
- Catena di render.js ora: … 33, 34, 35, 36, 37, poi `case_render1.py` (sessione «Case», per ultimo).
