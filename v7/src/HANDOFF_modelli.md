# HANDOFF — Revisione dei modelli 3D (6 ottobre 2026)

Rivisti tutti i modelli fatti a mano che lo studio sa fotografare: bottino (10), pezzi dei covi (30), postazioni composte (9) e postazioni `st_*` degli interni (16). Dove c'era già un modello scaricato equivalente l'ho usato al posto di quello fatto a mano.

## Modelli scaricati al posto di quelli fatti a mano
- `src/scaricati.js` (nuovo, caricato subito dopo `kit.js`): cache dei glTF di `assets/mj` e `assets/mf`. Si carica da solo all'avvio. `Scaricati.get(id)` restituisce una copia a misura (base a terra, al centro, davanti verso +z), oppure `null` se il file non è ancora arrivato: in quel caso resta il modello fatto a mano. Quando arriva un file cresce `Scaricati.ver`.
- Sostituzioni fatte:
  - Survival Pack: radiolina (`Pezzi.radio`, banco radio).
  - Toon Shooter: pallet, sacchi di sabbia, cassa di legno, scatolone (`Pezzi.pallet`, `sacchi`, `cassaLegno`, `cartone`), gomme nei rottami del bottino.
- Nel catalogo, pronti ma non ancora usati: bombola, zaino, tronco e falò (Survival Pack); fusto, bombola gialla, tubi e cassonetto (Toon Shooter); alcuni mobili Kenney. TV e radio del Furniture Kit sono troppo pastello: ho tenuto le nostre.
- Bottino e Cantiere rifanno i modelli già in scena quando cambia `Scaricati.ver`.
- **Non presenti nel repo**: gli altri pezzi del Survival Pack (FirstAidKit, attrezzi, borracce…). `pack_kit.mjs` li cercava in `/root/pv/assets`, che qui non c'è, e da questo ambiente quaternius.com e opengameart non si raggiungono. Per aggiungerli: convertire i FBX in glTF, metterli in `assets/mj` come `s_Nome.json` (+ `.json.js` con `pack_file.py`) e aggiungere una riga in `Scaricati.CAT`.

## Correzioni ai modelli fatti a mano
- Nuovi aiuti in `pezzi.js`: `asta(a, b)` e `tubo(a, b)` vanno da un punto all'altro, `cavo([...])` passa per più punti. Sono serviti a riattaccare gambe, bracci, tubi e cavi che prima erano staccati o entravano nel terreno.
- Pezzi rifatti:
  - cavalletti ad A veri;
  - lampada snodata col braccio collegato;
  - terminale con tastiera;
  - ricetrasmittente con cornetta e antenna sull'attacco;
  - sgabello con le razze a terra;
  - tanica con la X e le maniglie;
  - estintore col tubo fino alla lancia;
  - fari col treppiede attaccato al collare;
  - cassa di metallo con chiusure e maniglie;
  - pannello forato coi ganci;
  - incudine vera;
  - fucile del banco armi.
- Postazioni composte:
  - focolare: treppiede e ciocchi che toccano terra, catena e paiolo;
  - manichino con busto tornito;
  - flebo col treppiede;
  - lampada dell'infermeria appoggiata sulla cassa;
  - fili della stamperia controventati;
  - macchina da cucire e ciclostile posati sul piano del tavolo (prima la macchina stava a terra dentro il tavolo).
- Postazioni `st_*` (`OggettiUI.stModel`) tutte rifatte, con ingombri simili a prima: forgia con cappa e mantice, saldatrice con cavi e bombola, banchi da lavoro, del falegname e del macellaio, macchina da cucire a pedale, ciclostile, banco radio, camera oscura con ingranditore, lettino medico, alambicco col serpentino, stufa col tubo a gomito, forno a cupola, cassetta, cassaforte, rastrelliera aperta coi fucili (prima erano nascosti dentro il mobile).
- Parti animate col loro nome nel modello: `fiamma`, `brace`, `ago`, `rullo`, `led`, `luce`, `segatura`. `cantiere.js` aggiunge le sue solo se mancano (prima nella stamperia c'erano due rulli).
- Il mobile sotto macchina da cucire e ciclostile si chiama `gambe`, e il piano su cui poggia la macchina è in `userData.piano`. Tessile e stamperia tolgono le gambe e posano la macchina sul loro piano.

## Lo studio
- `node strumenti_inverno/studio_oggetti.js cartella strumenti_inverno/studio_modelli.json 1600 1000` fa cinque fogli: bottino, pezzi, postazioni, st e scaricati.
- Modalità `celle`: un modello per cella, inquadrato da solo, con le misure in metri e un avviso arancione se la base non sta a terra. `precarica` carica prima i modelli scaricati; senza, si vede il ripiego fatto a mano.
- Sorgenti nuove: `st:`, `scaricato:`, `kit:food/fish`, `file:mj/s_Tent` (con `fit`).

## La veste: profondità e texture (6/10 sera)
`src/superfici.js` (caricato dopo `scaricati.js`): `Superfici.vesti(gruppo)` dà a ogni modello fatto a mano più livelli di profondità, senza toccare i singoli modelli:
1. **spigoli smussati**: le scatole spesse almeno 3 cm diventano scatole arrotondate con normali morbide, e gli spigoli prendono la luce;
2. **texture per materiale**, in metri veri (una texture = 50 cm, 64 px, a pixel netti come il resto del gioco), in grigio moltiplicato per il colore di prima. La stessa immagine fa da rilievo (bumpMap). I materiali sono legno, metallo, vernice, ghisa, mattone, tessuto, carta, gomma e pietra. Si indovinano da colore, metallicità, ruvidezza e nome del materiale; per forzarli si usa `material.userData.sup = 'legno'`;
3. **ombre nei colori per vertice**:
   - di contatto con terra (55% a terra, pieno da 35 cm in su);
   - nei punti dove un pezzo tocca o entra in un altro;
   - una sfumatura dal basso all'alto su ogni pezzo, e un tono leggermente diverso per pezzo.
- La usano `OggettiUI.stModel`, `Cantiere.model`, `Bottino.build`, i mobili `pv_*` di `models.js` e i modelli scaricati (in `Scaricati.fit`). Questi ultimi non hanno uv: la veste le proietta "a scatola" dalla normale, e il materiale lo prende dal nome (Wood, Sack, Cardboard…).
- Le mesh già vestite sono segnate (`userData.vestito`) e non si rifanno. Restano fuori quelle che si illuminano, quelle trasparenti e le skinned. Quelle con una texture loro (le casse del bottino) prendono solo lo smusso, con uv 0..1 per faccia: le scritte restano dritte.
- Costo misurato:
  - banco armi: 15 ms una volta, triangoli da 3,4k a 5k;
  - forgia: 7 ms;
  - una cassa del bottino: 2 ms.
- Studio: `"nudo": true` (nella scena o nella voce) mostra i modelli senza veste, per confrontare. Esempio: `_immagini/modelli/veste_confronto.png`.
- Nel gioco, alla distanza della camera, la grana fine si perde. Quello che si legge sono gli smussi grossi, le ombre di contatto e i toni diversi per pezzo. Il grading del gioco sposta tutti i colori verso il sabbia, anche quelli del mondo.

## Volume e struttura: il kit di forme (6/10 notte)
La veste da sola non bastava: le forme erano ancora scatole. `src/modella.js` (caricato dopo `superfici.js`) è il kit di forme per i modelli fatti a mano. Segue la stessa regola di `forme.js` in render.js: niente scatole, sfere e cilindri nudi.
- **Volume**:
  - `guscio` (blocco estruso con gli angoli e il bordo arrotondati);
  - `lastra` (pannello coi bordi smussati);
  - `tornito` (profilo girato);
  - `serbatoio`;
  - `tuboPiegato` (tubo per più punti con le curve col loro raggio);
  - `schermo` (tubo catodico bombato).
- **Struttura**: `bullone`/`bulloni`, `alette`, `griglia`, `manopola`, `presa`, `levetta`, `quadrante` (strumento a lancetta), `ruota` (battistrada, cerchio, mozzo), `cerniera`, `maniglia`, `cavo`, `asta`.
- **Targhette**: `targa(testo, …)` disegnata su tela; tipi `targa`, `pericolo`, `strisce`, `quadrante`. Solo nomi inventati (niente marchi veri).
- Rifatti con il kit:
  - pezzi: generatore, tanica, estintore, bobina, fari, cassetta, cassa di metallo, cassa militare, morsa, terminale, televisore, cassettiera, armadietti, letto a castello, scaffale, lume, barattoli, bottiglie, sgabello, cucina, branda;
  - tutte le 16 postazioni `st_*`;
  - dal bottino: cestino, cassetta delle munizioni, fusto.
- **Metallicità bassa** (0,3 al massimo): senza una mappa d'ambiente il metallo pieno viene nero, sia nello studio sia nel gioco.
- **Fusione** (`Superfici.vesti` → `unisci`): le mesh vestite con lo stesso materiale diventano una sola. Il banco armi passa da 173 a 51 mesh, la forgia da 74 a 19. Restano a parte le mesh con un nome e tutto quello che sta sotto un oggetto con un nome: ventola, ago, morsa, rullo, gambe, fiamma, luce, led, segatura, schermo (verificato).
- **Costo**: il banco armi ha 14,5k triangoli e si costruisce in circa 60 ms una volta sola; la forgia ha 6,7k triangoli e circa 30 ms. Sono pezzi da interni e covi, pochi alla volta.
- **Da fare**: ridurre i materiali per modello (il banco armi ne ha 47), per esempio con un atlante come `forme.js`. Rifare con il kit anche gli altri oggetti del bottino (vicolo, rottami, bosco, spiaggia, prateria, tetto, carico), che hanno già texture loro, e i mobili `pv_*`.

## Da fare
- I modelli del mondo in `render.js` (lampioni, panchine, bancarelle…) e i mobili `pv_*` di `models.js` non passano dallo studio: vanno aggiunti come sorgenti e rivisti allo stesso modo.
- Personaggi: sempre il punto più debole (vedi HANDOFF_personaggi).

## M2 — I mezzi e le barche (`src/veicoli3d.js`, 20 ottobre)
- **Cosa**: 10 auto (126, Panda, 127, Uno, Ritmo, Delta, Alfa 33, Giulietta, 131, Alfetta), Ducato, OM telonato, camion col cassone, camion dei rifiuti, camion militare, blindato, Campagnola, autobus, Ape, Vespa, Ciao, bici da donna, BMX; barche: gozzo, lancia, motoscafo, peschereccio, traghetto.
- **Come**: la scocca è un loft di sezioni (fianco, spalla, bombatura) con passaruota e angoli arrotondati in pianta; il padiglione è un loft a zone (vetri trasparenti, tetto, montanti) con interni visibili; paraurti e fasce sono nastri che seguono la pianta; ruote tornite col battistrada. Livello alto (2-7k triangoli) e basso (~100-800) in un `THREE.LOD` (render.js, `V3LOD` = 70 m).
- **Scelta del modello**: `Veicoli3D.scegli(v)` per tipo di VK e hash dell'id (`cinquecento` → 126/Panda, `ritmo` → Ritmo/127/Uno/Delta, `giulia` → Giulietta/33/131, `polizia` → Alfetta, con `livrea` → 131 della Tutela, `camion` → rifiuti/cassonato, militare → telonato...). I colori del traffico vanno al più vicino della tavolozza 1986 (`epoca`); Polizia, Tutela e Grigi tengono il loro.
- **VK cambiati** (misure dei modelli): `cinquecento` 3.24×1.44, `ritmo` 3.78×1.6, `bmx` larghezza .74. L'etichetta di `cinquecento` è ora «Fiat 126» (anche quando è una Panda: `vehicleName` non conosce il modello).
- **Interfaccia con render.js** invariata: `ud` porta paint, glass, body (ammaccabile, in metri), ws (incrinabile), parts.bumper, front, lamps, tails, wheels, seat, wipers (i tergicristalli del modello, animati da `vehMondo`), porta (per `vehDoor`), beacons, crank/pedals (BMX: misure = BMX_GEO, da cambiare insieme).
- **Barche**: `Veicoli3D.barca` sostituisce in `BOATS` gozzo, lancia, motoscafo, peschereccio (e `secca`); restano in render.js barca a vela, motovedetta, rimorchiatore, nave, pedalò. Il **traghetto** è pronto ma world.js non gli dà ancora un ormeggio (serve `BOATLEN.traghetto` e una riga in `SEA.moorings`).
- **Prove**: `node strumenti/veicoli_check.js` (grafo connesso a 2 cm con le compenetrazioni dei pezzi pieni, ruote a y = 0, misure entro il 5% di VK). Tavole: `node strumenti_inverno/studio_oggetti.js <uscita> strumenti/studio_veicoli.json 1800 1000` (sorgente `veicoli:id`). Immagini in `_immagini/veicoli/`.
- **Da fare**: l'autobus e il Ciao/la bici non hanno un tipo in VK (nessuno li mette in strada); i mezzi parcheggiati di arredo sono ancora solo Ape; triangoli del livello alto più alti delle «poche centinaia» (le ruote tornite e gli interni pesano: ~1000 per le quattro ruote).
