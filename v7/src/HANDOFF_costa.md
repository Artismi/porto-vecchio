# Porto Vecchio — La costa e il mare

Aggiornato: 7 ottobre 2026. Guardia nel codice: `[costa]`.

## Il problema
Prima la riva era decisa da un rumore (sabbia o scogli a caso), i pontili erano caselle piatte con un muro di pietra fino all'acqua, le barche erano messe a caso nell'acqua davanti al porto, il mare non si poteva usare.

## Mappa (`world.js`)
- **Che riva c'è** (`COSTA`, `coastKind(x, y)`): tratti decisi a mano per la riva nord e per la sud.
  - spiaggia: Spiaggia Lunga (sud della testa e del collo), spiaggetta della Pensione Gabbiano, Lido
  - cala: cala di tramontana, cala della Tramontana, cala di San Giacomo, caletta della fiumara
  - scogli: Punta Scogli, collo nord, sotto il Monte, lungomare nord del centro, periferia est
  - falesia: costa alta di tramontana e sotto il Monte
  - porto: porto vecchio e porto cargo

  La fascia di sabbia o di roccia ha la larghezza del suo tipo.
- **Fondale** (`SEA.depth`, metri per casella): viene dalla distanza dalla riva e dal tipo della riva più vicina. Davanti alle spiagge scende piano, sotto gli scogli è medio, sotto la falesia diventa subito fondo. I bacini dei porti sono dragati (4,5 m) e l'imboccatura è fonda.
- **Opere** (`SEA.structs`), che la grafica costruisce da qui:
  - `molo`: piano lastricato (QUAY), massi sul lato del largo (ROCK) e lanterna in testa. Il campo `sea` dice da che parte stanno i massi.
  - `pontile`: tavolato di legno (PIER) con la testata a T.
  - `scalo`: lo scivolo del cantiere.
- **Porto vecchio**:
  - il Molo Vecchio a gomito, con la lanterna rossa: è la diga
  - il Molo di Levante, con la lanterna verde
  - tre pontili: dei gozzi, della Marina ed Est
  - i pescherecci ormeggiati di fianco all'interno del Molo Vecchio
  - la motovedetta alla Calata
  - lo scalo del cantiere
- **Porto cargo**: moli di pietra, la nave dell'Impero, le motovedette e il rimorchiatore.
- **Borghi dei pescatori**: pontile con la testata, gozzi ormeggiati e barche tirate in secca sulla sabbia.
- **Lido**: un pontiletto coi pedalò.
- **Posti barca** (`SEA.moorings`): `{ kind, x, y, ang, len, at }`. Le barche ai pontili stanno di poppa, con la prua verso il largo; ai moli stanno di fianco. Con `drive: true` diventano mezzi del motore: gozzo, lancia, motoscafo.
- **Altri dati in `SEA`**:
  - `rocks`: faraglioni e scogli che affiorano
  - `fishing`: dove si pesca
  - `swim`: dove si fa il bagno
  - `routes`: il giro dell'isola, l'uscita dei pescherecci e l'arrivo della nave
- **Luoghi nuovi**: `lanterna`, `molo_levante`, `scalo`, `pesca_*`, `scogli_*`, `bagno_*`. Hanno cambiato posto `molo`, `pontile` e `marina`.

## Motore (`game.js`)
- **Barche**: `VK.gozzo`, `VK.lancia` e `VK.motoscafo` hanno `boat: true`.
  - Vanno solo dove `boatM` è vero (mare con almeno 45 cm d'acqua). Usano la stessa fisica delle auto, ma scivolano di lato, vanno avanti per abbrivio e l'elica le fa girare anche quasi ferme.
  - Contro il molo non sfondano niente.
  - Si sale col tasto F dal pontile. Si scende sul pontile o sulla riva più vicina; se non ce n'è, si finisce in acqua.
- **Nuoto**: il giocatore entra in mare (`seaM`) e `p.swim` diventa vero.
  - Va a 1,8 m/s, o a 2,7 m/s di corsa.
  - Non spara e non entra in mare con un peso in braccio.
  - Esce su sabbia, scogli e banchine.
  - I PNG non entrano in acqua: `walkM` non cambia.
- **Pesca**: la ricetta `x_pesca` vale anche ai luoghi `pesca_*`, `scogli_*`, `lanterna` e `bagno_*`. Gli abitanti con la canna vanno anche alla lanterna, al Molo di Levante e sugli scogli.

## Grafica (`render.js`, sezione `[costa]`)
- **Banchine e moli**:
  - muri di blocchi fino al fondale
  - fascia scura dell'acqua e copertine di pietra
  - bitte, scalette di ferro e copertoni
  - sui moli: muro paraonde, lampioni, massi (un solo `InstancedMesh`) e fanali che lampeggiano (rosso ogni 5 s, verde ogni 4 s)
- **Pontili**:
  - tavole una per una su travi e pali piantati nel fondale, con l'alga sul pelo dell'acqua
  - croci di controvento, bitte, colonnine e lampioncini
  - scaletta, salvagente e copertoni
  - il terreno sotto il pontile non si disegna più
- **Barche** (`BOATS`): scafi veri, costruiti per sezioni che si stringono verso prua, con l'antivegetativa, la fascia e il capodibanda. Le barche ormeggiate hanno le cime e beccheggiano.
- **Barche guidabili** (`boatVehicle`): stesso modello. Galleggiano, si alzano di prua con la velocità e lasciano la scia.
- **Barche che vanno e vengono** (`tickMovers`):
  - due pescherecci escono all'alba e tornano a metà giornata
  - la motovedetta fa il giro dell'isola
- **Mare**: l'acqua bassa e la schiuma vengono dal fondale (larghe davanti alle spiagge, strette sotto gli scogli). Al largo le creste sono attenuate.
- **Nuoto** (`swimPose`): il corpo sta in acqua fino alle spalle, si corica quando nuota e ha dei cerchi attorno sull'acqua.

## Prove
- `node src/test_costa.js`: controlla queste cose.
  - barche in acqua e posti barca
  - salire sul gozzo
  - uscire dal porto dall'imboccatura
  - la riva che ferma la barca
  - il motoscafo al largo
  - scendere in mare e nuotare
  - a nuoto non si spara
  - entrare e uscire dal mare dalla spiaggia
  - luoghi raggiungibili
- Le istantanee si fanno con `strumenti_inverno/shot_gioco.js`, coi luoghi `marina`, `lanterna`, `pescatori_s` e `pontile`.

## Da fare
- Gli abitanti in barca (i pescatori che escono davvero, il contrabbando al Pontile Est via mare).
- La nave dell'Impero che arriva e riparte nei giorni di `economia.js`: per ora sta sempre ormeggiata.
- La resistenza a nuoto (freddo, stanchezza) e le correnti al largo.
- Pescare dalla barca.

# L'arcipelago

Aggiornato: 8 ottobre 2026. Guardia nel codice: `[arcipelago]`.

## Mappa (`world.js`)
- **La mappa si allarga**: `generate()` costruisce l'isola come prima, poi `expand(W)` la mette dentro una griglia più grande (990×420 caselle) spostata di `OX=320`, `OY=200`. Tutte le coordinate esportate sono già spostate. Le isole si scrivono in coordinate di progetto, che possono essere anche negative (a nord e a ovest dell'isola grande).
- **`ISOLE`**: circa 80 isole, ciascuna con `id`, `name`, `x`, `y`, `rx`, `ry`, `rot`, `h`, `kinds` e `use`.
  - Tipi: isole mediterranee a ellisse organica, cupole stile Palau (`dome`), boomerang (`arc`) con la laguna dentro, dorsali lunghe.
  - Il contorno viene da `isleQ`: lobi uniti, deformazione del dominio, grana fine.
- **`tema`** (soprattutto sui panettoni), che decide la vegetazione (`ECO.GIUNGLA`, `PALMETO`, `ISOLA`, `NUDA`) e i dettagli grafici:
  - `giungla`
  - `palmeto`
  - `pini`
  - `nuda`: calcare bianco, agavi, capre inselvatichite
  - `uccelli`: guano, nidi, stormi
- **`use`**:
  - `vuota`
  - `baracche`: approdo vecchio e capanni abbandonati; in `SEA.decor`
  - `villaggio`: Lontani e Santa Lucia
  - `base`: presidio, cannoni (batteria) e rossa (radar)
  - `tribu`: Isola Grande del Sud
- **`SEA.camps`**: `{ type, sub, x, y, r, place, faction, n, gate, bp }`. `bp` è il punto della spiaggia o dell'approdo con la direzione del mare.
- **`SEA.features`**: archi di roccia (`arco`, con i piedi che sono scoglio vero), grotte marine (`grotta`) e colonie di uccelli (`colonia`).
- **Luoghi**:
  - `isola_<id>`, `villaggio_<id>`, `baracche_<id>`, `base_<id>`, `molo_<id>`
  - `villaggio_tribu`, `spiaggia_tribu`
  - `arco_<id>`, `torre_saracena`, `relitto`

## Motore (`game.js`)
- Gli abitanti dei campi nascono in `create()`. La fazione `isola:<id>` diventa ostile solo con `n.aggro`.
- **Tribù**: attacca chi entra nel villaggio o chi vede da vicino. Attacca a mano, al massimo in due insieme.
- **Basi**: prima danno l'avviso, poi sparano (male) se ti avvicini ancora o resti lì. Si calmano quando sei lontano.
- **Animali** (`animali.js`): galline, capre e gatti nei villaggi, cani alle basi, capre sulle isole di calcare e di macchia.

## Grafica (`render.js`)
- **`buildCamp`**:
  - tribù: capanne, palizzata, totem, fuoco col pentolone
  - basi: bandiera, torretta, filo spinato, eliporto, cannoni, radar che gira
- **`buildIsoleDettagli`**:
  - Tante piccole cose istanziate per riquadri di 240 m:
    - conchiglie e alghe sulla battigia
    - cocchi e fronde sotto le palme
    - tronchi col muschio, funghi e rami nella giungla
    - massi di calcare chiaro sulle isole nude
    - scogli scuri a pelo d'acqua
    - guano, nidi e uova
  - Archi di roccia con la macchia sopra, bocche di grotta, stormi che girano (`tickIsole`), fumo dei fuochi.
  - Villaggi: fuoco con le panche, rastrelliere con i pesci, le reti e i polpi, reti, botti, cassette di pesce, legnaia, orti, amaca, lanterne, panni stesi, edicola della Madonna del mare, pollaio.
  - Basi: sacchi di sabbia, cartello, fusti, casse, tende, container, generatore, cisterna, antenna, fotoelettrica, bidoni col fuoco.
  - Tribù: piroghe col bilanciere sulla spiaggia, pali coi teschi lungo il sentiero, orti, tamburi, nasse, mucchi di conchiglie.
  - Baracche: fuoco spento, barca, fusti arrugginiti, telo, reti, legna.

## Da fare
- Coralli e pesci visibili sotto l'acqua bassa del reef.
- Esplorare a nuoto o in barca le grotte.
- Commerci col villaggio, missioni alla base e dalla tribù.
