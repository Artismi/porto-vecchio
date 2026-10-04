# Porto Vecchio — passaggio di consegne

Gioco nel browser ambientato nel 1986 su un'isola del Tirreno, in pixel art isometrica con camera cinematografica. Il cuore è il sistema di NPC che ricordano, spettegolano e reagiscono. L'estetica si ispira a Vice City: pastelli, neon, palme e tramonti rosa, insieme a caruggi liguri, ardesia e bucato steso.

- Build giocabile pubblicata (artifact): https://claude.ai/artifact/8aFsN9TtJMV69xXk26ZsK7. Per aggiornarla, prima leggerla con l'azione `read`, poi pubblicare passando questo `url`.
- Piano di progetto (documento): «Città che ricorda — Piano di progetto».

## Divisione del lavoro

- **Motore (`game.js`)**: logica, fisica, NPC, polizia, traffico, combattimento. Nel lavoro di design visivo **non si tocca**, tranne la sezione `MAPPA` (dati della mappa) e i dati di partenza in `create()` (posizione di mezzi e oggetti).
- **Grafica (`render.js`)**: tutto ciò che si vede. Non cambia mai lo stato del gioco.

## File

| File | Contenuto |
| --- | --- |
| `game.js` | Logica. La sezione `MAPPA` contiene griglia, edifici, luoghi e quote visive (`MAP`). Si testa con Node. |
| `render.js` | Tutta la grafica, Three.js r149. |
| `index.src.html` | Pagina, HUD, dialoghi, taccuino, audio sintetizzato, input, minimappa. Contiene i segnaposto `/*THREE*/`, `/*GAME*/`, `/*RENDER*/`. |
| `build.py` | Incolla three.min.js, game.js e render.js → `porto-vecchio.html` (file unico, circa 1 MB). Richiede `npm i three@0.149.0`. |
| `showroom.src.html` | Vetrina dei modelli (armi, raccoglibili, auto, auto danneggiate). Si costruisce come la pagina del gioco e serve a guardare i modelli da vicino. |
| `shot.py`, `showshot.py`, `stress.py` | Istantanee con Playwright: scene del gioco, vetrina dei modelli, prova di sparatorie, esplosioni e guida. |
| `test_*.js` | Test della logica (`node test_combattimento.js`, `node test_polizia.js`). |
| `mappa.txt` | La griglia in ASCII, con legenda e quote. |

Build: `npm i three@0.149.0 && python3 build.py`. three.js va incorporato nel file, altrimenti su alcuni client la pagina resta nera.

## Convenzioni

- **Unità: metri.** Una casella = 2 m (`TS = 2`). Mappa 150 × 100 caselle = 300 × 200 m.
- **Assi:** x verso est, y del gioco = z di Three.js (verso sud), altezza = y di Three.js.
- **Angoli:** 0 = est, π/2 = sud. I modelli hanno il **muso verso +z locale**; il render li ruota con `rotation.y = π/2 − ang`.
- **Veicoli:** `VK.len` e `VK.wid` in game.js coincidono con le misure dei modelli (tabella `CARS` in render.js, più `apeMesh` e `vespaMesh`).
- **Stile:** forme esagerate (sotto i 10 cm i dettagli spariscono), `MeshStandardMaterial`/`MeshLambertMaterial` opachi, texture su canvas con `NearestFilter` a 8 pixel per metro (`PPM`).
- **Camera:** sempre cinematografica. A piedi: fov 14°, yaw π/4, pitch 0,72. Alla guida: dietro al mezzo, fov 42°, cornice 4:3. Segue la quota del terreno (`cam.h`).

## La mappa: l'isola (rifatta da zero il 1° ottobre)

- **Isola 150 × 100 caselle = 300 × 200 m**, disegnata attorno alle strade. Costa irregolare (poligono `COAST`), collina vera a nord col Santuario in cima (+15 m), spiaggia a est, porto a sud.
- **Il borgo storico è identico**, spostato in `OX = 46`, `OY = 46`, con una differenza: la Via al Mare è larga 4 caselle (righe 23-26 del borgo), quindi la calata ha 3 righe (27-29) e il Magazzino Neri è alto 3.
- **Strade** (`ROAD_DEF` in game.js → `MAP.roads`): curve Catmull-Rom per punti in metri, campionate ogni metro (`pts`, `len`, `total`, quota `h`, larghezza per punto `ws`). Le caselle dentro la carreggiata diventano `VIA`, quelle sopra il mare diventano ponte (`MAP.bridgeAt`).
  - `litoranea`: anello attorno all'isola, larga 10 m (8 m nel borgo), col traffico.
  - `tornanti`: la Salita del Santuario, con profilo di quota dato (`hs`).
  - `viale` (Viale del Cinema), `raccordo`, `rotonda` (anello attorno all'aiuola, `MAP.rb`), `pini` (Via dei Pini, seconda salita), `ponte` (verso la terraferma, prosegue oltre il bordo), `porto` (Via del Cantiere).
  - Funzioni esportate: `G.roadAt(R, s)` (punto e direzione a distanza `s`), `G.nearestOnRoad(R, x, y)`.
- **Quote continue**: `MAP.hc` sono le quote negli spigoli delle caselle (`MAP.HW = GW + 1` per riga). Il terreno parte da collina + rilievo del Ponente, scende verso il mare, poi le strade impongono la loro quota e il terreno le raccorda. Borgo, Lungomare e porto sono in piano. `MAP.elev` è la media per casella. La grafica interpola (`groundH`); le rampe e scalinate (`MAP.ramps`) restano per le macerie dei muri sfondati.
- **Muraglioni** (`MAP.wallAt`): nascono da soli dove il terreno vicino a una strada è troppo ripido (dislivello > 2,1 m in una casella): scogliera nord, fianchi dei tornanti. Si sfondano come prima. Più lontano dalle strade, il pendio ripido diventa roccia (`ROCK`).
- **Zone** (`MAP.zone`, codici in `MAP.Z`): campagna, borgo, Ponente, Lungomare, collina, porto, spiaggia. Servono alla grafica (pavimenti, lampioni, alberi). Il pavimento resta solo attorno alle case e lungo le strade: il resto è prato.
- **Edifici**: quelli con nome sono ricollocati a mano (Ponente: discoteca, cinema, distributore nel triangolo tra rotonda e litoranea, Bar Sirena, cantiere, faro; collina: Santuario, case alte, trattoria; Lungomare: hotel, gelateria, videoteca, Pensione Gabbiano; spiaggia: Bagni Lido). In più 46 palazzine e ville `fill_*` generate lungo le strade (`filler`, con seme fisso).
- **Luoghi** (`PLACES`): quelli del borgo sono relativi a `OX`, `OY`; gli altri sono ricollocati e spostati sulla casella percorribile più vicina.
- **Traffico**: segue la sua corsia sulla litoranea (`laneAt`, `v.road`, `v.s`, `v.dir`), si tiene a destra, rallenta in curva, si ferma davanti agli ostacoli. Se viene urtato e finisce fuori corsia, il guidatore scende.
- **Rinforzi della polizia**: arrivano dalla litoranea, 45-90 m dal giocatore; quando se ne vanno, ripartono verso un punto lontano dell'anello e spariscono.
- `mappa.txt` è rigenerato dalla mappa vera (con `node`).

## render.js, sezione per sezione

1. **Base**: utilità, materiali condivisi (`sm`, `sl`, `sb`), quote (`groundH`), fusione della geometria statica (`addStatic`/`flushStatic` per settori di 80 m, `mergeGroup` per edifici, veicoli e armi).
2. **Terreno**: texture unica per l'isola con variazioni per zona (selciato nel borgo, mattonato a spina di pesce nel Ponente, lastre crema e marciapiedi rosa e bianchi sul Lungomare, risseu bianco e nero sulla collina, sabbia con battigia, pineta, scogli, strisce pedonali). Una mesh con le caselle alla loro quota, pareti in pietra dove il terreno cambia quota o finisce in acqua, gradini veri, muraglioni con balaustra e bouganville.
3. **Mondo**: mare con shader (acqua bassa turchese e schiuma sulla riva tramite una maschera della costa), cielo con tramonto a bande e stelle, costa di fronte con i grattacieli, collina a nord con case a gradoni, forte e antenna, ponti.
4. **Edifici**: facciate dipinte alla genovese (`facade`), facciate déco (`decoFacade`), tetti in ardesia, coppi o lamiera, tetti piani con lastrico, altane, balconi con vasi, insegne al neon e a bandiera, faro con fascio rotante, distributore con pensilina e prezzi, bar della spiaggia.
5. **Oggetti di scena** (libreria): lampioni (ghisa, déco, sodio, a muro), palme, pini a ombrello, platani, cipressi, cespugli, agavi, panchine, bancarelle, casse (vuote, con pesce, frutta o bottiglie), barili, fusti, tavolini con tazzine, birre, boccali, vino, fiaschi, gelati e giornali, sedie (bistrot, plastica, déco), ombrelloni, vasi (gerani, limoni, palme, fioriere, secchi di fiori), cestini, cassonetti, campane del vetro, cabina telefonica, buca delle lettere, edicola con riviste e barattolo di matite colorate, fermata dell'autobus, bitte, reti, salvagente, spiaggia (ombrelloni, lettini, asciugamani, torretta del bagnino, cabine, docce, rete da pallavolo, pedalò, barche a remi), porto e cantiere (container, gru, muletto, scafo in cantiere, motoscafi, barche a vela, pescherecci), pompe di benzina, espositore dell'olio, fari della discoteca, luci del cinema, gatti, gabbiani.
6. **Disposizione**: `buildProps()` popola ogni quartiere.
7. **Armi** (`weaponModel`): Beretta 92 (carrello aperto, canna cromata, guancette in legno), lupara a canne mozze (cani esterni, calcio tagliato a impugnatura), Skorpion (caricatore curvo, calcio in filo ripiegato), molotov (bottiglia con benzina e straccio acceso). Stesso modello in mano, a terra e in volo. In mano vengono create solo quando servono (`gunFor`).
8. **Personaggi**: `person()` e `animPerson()`, come prima.
9. **Veicoli**: carrozzerie da profili laterali estrusi con i passaruota ritagliati (Fiat 500, Ritmo, Giulia, Alfetta della Polizia), Ape e Vespa. Ruote che girano e sterzano, fari con cono di luce e chiazza sull'asfalto, fanali più accesi in frenata, danni progressivi (ammaccature nel punto colpito, vernice che si scurisce, parabrezza incrinato, faro rotto, paraurti che pende), carcassa bruciata.
10. **Effetti**: vampata diversa per arma (stella per la Beretta, rosa larga per la lupara, lingua per lo Skorpion) che nasce dalla bocca dell'arma vera, traccianti, bossoli, fumo, esplosione con onda d'urto e rottami. Raccoglibili con piedistallo, fascio di luce e icona sopra.
11. **Fotogramma**: luci (14 PointLight vere assegnate alle sorgenti più vicine alla camera, fino a 160 sorgenti registrate), cielo e mare, animazioni, camera, dissolvenza degli edifici, post-processing con grading viola, rosa e arancio e un leggero alone sui neon.

## Prestazioni

Circa 1.150 draw call e 130.000 triangoli per fotogramma, ombre comprese. `lowQuality()` spegne le ombre se il gioco rallenta. I personaggi restano la voce più pesante (circa 40 mesh ciascuno).

## Note per chi lavora sul motore

- Il traffico gira solo sulla litoranea (anello chiuso). Per farlo girare anche su altre strade basta `traffic: true` nella strada e qualche auto con `road`, `s`, `dir`: sulle strade aperte fa inversione in fondo.

## Prossimi passi di design

1. **Personaggi**: sono ancora fatti di cubi ed è il punto più debole. Servono proporzioni curate, sagome riconoscibili per i protagonisti, abiti anni '80 (camicie hawaiane, giacche con le spalline) e animazioni di mira, corsa, caduta e morte.
2. **Interni** visibili dalle vetrine, con banconi e scaffali.
3. **Arma fuori dal finestrino** quando si spara guidando.
4. **Icone delle armi nell'HUD** (`weaponIcon` in index.src.html) da ridisegnare sui modelli nuovi.

## Come verificare

- Logica: `node test_combattimento.js` e `node test_polizia.js`.
- Grafica: `python3 shot.py <prefisso> nome:x,y,ora[,arma|veh:tipo,angolo,fotogrammi]`, per esempio `python3 shot.py /tmp/s lungomare:190,48,21 guida:150,50.3,21,veh:giulia,0,40`.
- Modelli: costruisci `showroom.html` (come in build.py) e lancia `python3 showshot.py /tmp/v armi auto danni`.
- Chromium in software gira a 5–15 fps. Per le istantanee il gioco avanza a mano con `__pv.G.step(...)` e `__pv.R.frame(...)`. Nella pagina ci sono `window.__pv = { st, G, R, ui, input }`, e `R.__models` espone i costruttori dei modelli.
- Il font di Google non si carica nel container: è normale.

## Distruzione, interni, controlli (30 settembre, sera)

- **Muraglioni** (`MAP.wallAt`): si sfondano con **3 botte in Vespa, 2 in auto** (una botta conta sopra i 3 m/s). La breccia è larga 3 caselle: diventano `ROCK` con una rampa di macerie tra le quote dei due lati (`MAP.ramps`, `rubble: true`). Le esplosioni sfondano i muri entro 3,6 m. Motore: sezione `DISTRUZIONE` in game.js (`vehicleBump`, `breakWall`, `blastMap`, `openFacade`).
- **Facciate**: le botte le crepano; alla seconda (terza in Vespa) si apre il piano terra: 3 caselle di fronte, fino a 2 di profondità, diventano percorribili e l'auto ci entra. `st.rooms` elenca le stanze aperte. La mappa è globale: `create()` la ripristina con `restoreMap()`.
- **Grafica** (render.js, sezioni `DISTRUZIONE` e `INTERNI`):
  - gli oggetti di scena piccoli sono registrati in `place()`/`crate()`/`streetLamp()` (`regProp`); quando vengono colpiti i loro vertici nella geometria statica si spengono (`hideTag`) e nasce un corpo fisico (`liveBody`). Li muovono auto, calci a piedi, proiettili, esplosioni e molotov; quelli fragili vanno in pezzi (`shatter`). I lampioni cadono e si spengono.
  - frammenti: un solo `InstancedMesh` da 1400 pezzi (`chip`), che le auto sparpagliano.
  - facciate: crepe, fori dei proiettili e buchi disegnati sulla texture; il buco è ritagliato nell'alfa (`alphaTest`) e dietro c'è una stanza (`roomBreach`): scatola vista dall'interno, pareti e pavimento per tipo (`ROOM_STYLE`), arredi per tipo (`LAYOUT`, `FB`) come corpi fisici, luce propria, e 1-5 abitanti (solo grafici) che si spaventano, scappano in fondo e restano con le mani alzate; se un'auto li prende cadono.
  - tutto si ripristina a una nuova partita (`resetDestruction`).
  - suoni nuovi in index.src.html: `crollo`, `legno`, `vetri`, `botto`, `foglie` (quelli degli oggetti arrivano da `R.sfx`).
- **Controlli**: W va verso il puntatore, S indietro, A/D di lato; il personaggio guarda sempre dove miri. Il codice c'era già: il taccuino nascosto (`#book`, `display: grid`) copriva il canvas e si prendeva il mouse. Corretto con `[hidden] { display: none !important; }`.
- Prove: `node test_distruzione.js`; `python3 dzshot.py <prefisso>` (muri, facciate, corse, spari, esplosioni).
- **Personaggi**: lavoro sospeso (piano pronto: ossa con gomiti e ginocchia, abiti anni '80 per personaggio, animazioni di corsa, mira, caduta e morte, tutto in render.js).

## Punta e clicca (1 ottobre)

Tutto in index.src.html, sezione `Punta e clicca` (il motore non cambia):
- **sinistro a terra**: il personaggio ci va col percorso di `G.findPath` (doppio clic: di corsa). Se il punto è dentro un edificio o in acqua prende la casella libera più vicina (`freeSpot`). Segnalino giallo a terra (`ui.mark`, disegnato da render.js come `dyn.mark`).
- **sinistro su una macchina**: ci va e ci sale (`act('veicolo')`). In macchina il clic serve solo a scendere (clic sulla propria macchina): si guida con la tastiera.
- **sinistro su una persona**: ci va vicino (1,5 m) e le apre attorno il menu (`#ring`): Parla, Ruba/Rapina (se il motore lo permette), Picchia, Spara (se hai un'arma da fuoco con colpi), Molotov, ✕. Il menu segue la persona e si chiude se ti allontani oltre 4 m, se muore o con Esc.
- **destro**: spara verso il puntatore. WASD e i tasti T/E/F/G restano e annullano il clic in corso.
- Sotto il puntatore compare un'etichetta (nome della persona, "Ruba la Giulia di…").
- Per i test: `window.__pv.click` e `window.__pv.pickAt(nx, ny)`.

## Fisica di guida e rotture immediate (1 ottobre, sera)

- **Motore, sezione `FISICA DEI VEICOLI`** (game.js): ogni mezzo ha velocità vera `vx, vy` e rotazione `w`; `v.speed` resta la componente in avanti (se qualcuno la cambia da fuori, `ensureVel` riallinea). In `VK` ogni mezzo ha `m` (kg), `grip` (m/s² laterali) e `I` (inerzia/massa).
  - `vehicleMotion(st, v, dt, want, throttle, brake, sprint, hand)`: sterzo con ritardo (`v.steer`), aderenza laterale limitata; oltre la soglia il mezzo scivola e l'aderenza cala (derapata con isteresi, `v.sliding`). **Spazio = freno a mano** (coda che gira). Esporta per la grafica `v.slip`, `v.skid` (0-1), `v.latA`, `v.longA`.
  - `physStep`: muri e facciate con rimbalzo sulla normale, strisciata lungo il muro e rotazione dal punto di contatto (`vehicleHitPoint`). `vehicleBump` ora riceve punto e direzione dell'urto.
  - `collideVehicles`: scatole orientate (SAT), impulso con rotazione e attrito, masse vere. I mezzi del traffico e della polizia colpiti diventano corpi liberi (`loosen`, `v.looseUntil`); se restano di traverso, fuori corsia o troppo malconci il guidatore li abbandona (`v.stalled`). Mezzi parcheggiati e carcasse si spostano (`freeRoll`). Le esplosioni lanciano i mezzi vicini.
  - `propHit(st, vid, mass)`: la grafica segnala gli oggetti travolti (`R.hits`, letto da index.src.html prima di `R.frame`) e il mezzo perde velocità.
  - **Vetrine**: `glassFront(b, ang)` — facciate déco (tutti i lati) e il fronte di negozi e locali si sfondano al **primo** colpo.
- **Grafica** (render.js):
  - le facciate registrano i vetri (`F.glass`, rettangoli in pixel); `breakGlass` li manda in frantumi (buio dietro, schegge nel telaio, pioggia di cocci) al primo urto, alle esplosioni e ai proiettili.
  - lampioni e pali (`snapPole`): si spezzano subito alla base, la lanterna esplode in vetri e scintille, il palo vola. Un proiettile spegne la lanterna (`shootLamp`). Oggetti fragili sempre in pezzi sopra i 3,5 m/s; casse, sedie e cestini sopra gli 11 m/s.
  - mezzi: sospensioni a molla (rollio in curva, beccheggio in frenata e accelerazione, sobbalzo negli urti), ruote che sterzano con `v.steer`, segni delle gomme (`SKID`, buffer circolare da 2400 segmenti) e fumo quando slittano, scintille e cocci negli urti (`carHit`). La camera in derapata segue la direzione di marcia.
  - audio: stridio delle gomme continuo, motore con le marce, `bump`, `crash` proporzionato all'urto, `vetrina`, `palo`.
- Prove: `node test_fisica.js` (tamponamento, traffico urtato, freno a mano, curva a tutta, muro); `python3 physshot.py <prefisso>` (lampione, derapata, tamponamento, vetrina, spari).

## Comandi di guida e investiti (1 ottobre, sera)

- **Sterzo col puntatore**: il mezzo sterza verso il puntatore (`drive.want`); W gas, S freno e poi retromarcia, A/D sterzano a mano e scavalcano il puntatore, spazio freno a mano, shift spinta. Col puntatore a meno di 2,5 m dal mezzo lo sterzo resta dritto. **Drift automatico**: se il puntatore chiede una curva più stretta di circa 35° sopra gli 8-11 m/s, la coda parte da sola (`hk` in `vehicleMotion`, `v.autoDrift`). Il mouse mira e il destro spara anche dalla macchina. Touch: la levetta fa gas (su) e sterzo (lati).
  - Pagina: `input()` manda `drive: { thr, steer, hb, boost }`.
  - Motore: `driveVehicle` lo passa a `vehicleMotion(..., steerIn)`, che usa lo sterzo diretto al posto della direzione voluta. Tutta la fisica (aderenza, derapata, urti) resta quella di `FISICA DEI VEICOLI`.
  - Il vecchio comando "verso il cursore" funziona ancora se `drive` manca.
- **Investiti**: `launch` dà al pedone (o al giocatore) uno sbalzo (`kbx`, `kby`) e un volo (`airT`, `airDur`, `airH`, `airSpin`); `knockback` lo fa scivolare e rimbalzare sui muri. La grafica (`flight` in render.js) fa la parabola con la capriola.
- Prova: `node test_guida.js`.

## Menu: zaino e personaggio (2 ottobre)

- **Motore, sezione `INVENTARIO E POTENZIAMENTI`** (game.js): `p.inv` (id → quantità, catalogo `ITEMS`: kit, bende, sigarette, orologio, catenina, radiolina), `p.xp`, `p.lvl`, `p.pts`, `p.skills` (catalogo `SKILLS`, 0-5). Funzioni esportate: `maxHp`, `gainXp`, `xpNext`, `upgrade`, `addItem`, `useItem`, `lootValue`, `discount`, `skill`.
  - Esperienza: lavoro 40, mezzo venduto 30, rapina 25, nemico (fazione, polizia, aggressivo) 15, scippo 8, refurtiva venduta 5. Livello: 60 + 40·livello.
  - Effetti: Fisico +15 salute max e rigenerazione; Mira −10% dispersione e rinculo; Mani veloci −10% ricarica; Rissa +20% pugni e stordimento; Volante +6% spunto e tenuta (solo il mezzo del giocatore); Parlantina −8% prezzi dello Squalo, +10% refurtiva.
  - Bottino: scippi (35%) e rapine (50%) danno a volte un oggetto (`rollLoot`). La refurtiva si vende allo Squalo (opzione `refurtiva` nel dialogo). Il pronto soccorso raccolto con la salute piena va nello zaino. Le Nazionali calmano la mira per 40 s (`p.calmUntil`).
- **Pagina** (index.src.html, sezione `Menu a tutto schermo`): pulsante MENU in basso a destra sopra la minimappa (`#menuBtn`, puntino giallo quando ci sono punti). Il menu `#menu` copre tutto lo schermo e mette in pausa il gioco (`ui.menu`). Lo stile è scuro, con giallo acido per le selezioni, verde per i bonus e rosso per la refurtiva. Ha due schede:
  - **Zaino**: la borsa a griglia (le armi lunghe occupano 2 caselle), il dettaglio dell'oggetto con barre delle statistiche (base in grigio, bonus delle abilità in verde), la figura intera di Nino in pixel art (`figure()`), la tasca con le armi 1-5 e i consumabili.
  - **Personaggio**: la lista delle abilità, il dettaglio con l'anteprima del livello successivo e il pulsante Potenzia, la figura, il livello e i dati.
  - **Tasti**: I apre e chiude il menu, 1 e 2 cambiano scheda, Esc chiude, H fa la cura rapida. Il clic seleziona, il doppio clic usa, impugna o potenzia. Dal menu si salta al Taccuino.
  - Sotto i 1050 px la figura sparisce, sotto i 720 px il menu passa a una colonna sola.
- Originali in `_backup/`.
