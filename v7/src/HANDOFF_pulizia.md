# [pulizia] Il rumore della città nuova

Il committente: «c'è ancora molto rumore: cose posizionate, ruotate o modelli 3d non ottimizzati, o elementi sovrapposti sulle
pareti e sui marciapiedi e sui muri, che compromettono la leggibilità della mappa».

## Dove sta
- `src/pulizia_rumore.js` — il modulo. Lavora sul registro di `render.js` ([pulizia2]: ogni cosa posata con la sua scatola
  orientata, la casa, il lato, la composizione `g`) **dopo** che tutti hanno posato e dopo il regista delle compenetrazioni:
  `pulizia2()` chiama `PuliziaRumore.passa(rumore2(R))`. Vale quindi anche per quello che posano gli altri filoni, purché passi
  dal registro (`addStatic` con `P2.k`/`curTag`, `mk2`, `p2Obj`, `p2Parti`).
- Le **voci esterne** (posate dopo, dai loro piani): la segnaletica (pali, bandiere, targhe, pannelli: `Segnaletica.piano()`) e le
  vie vive (fermate, edicole, plance: `Vievive.*()`). Sono fisse: chi del registro ci sta addosso cede. I pali doppi della
  segnaletica si tolgono con `PuliziaRumore.SALTA` (segnaletica.js non li disegna; il piano resta).
- `?norumore` misura soltanto (per confrontare).
- `strumenti/rumore.js` — il censimento nel gioco vero (Chromium senza testa): la tabella prima/dopo, le azioni, i modelli più
  visti con triangoli e quota di scatole nude, `reports/rumore.json` e la pianta `reports/rumore.png`. `--spento` = `?norumore`.
- `strumenti/pulizia_scene.json` (8 inquadrature, camera predefinita, zoom 0,72) e `strumenti/pulizia_vicino.json` (3 da vicino)
  per `strumenti/galleria.js`; `strumenti/fogli_pulizia.py` fa i fogli in `_immagini/pulizia/`.

## Con gli altri filoni
La posa automatica dei piccoli oggetti di [pavimenti] (`claude/pv-pavimenti`: in `addStatic`, galleggianti 2,5–12 cm giù,
sepolti 10–35 cm su, `?nopavimenti`) avviene prima: il censimento della quota corre dopo e corregge solo quello che resta (oltre
quei margini o fra le sue esclusioni), senza rifarla.

## Le regole
Censimento: verso (sulla sagoma vera: il rettangolo d'ingombro più stretto dei vertici, contro il muro o l'asse della via),
quota (galleggia / affonda rispetto a `groundH`), parete (cose appese che si coprono nel piano del muro), finestra, marciapiede
(cosa a terra davanti a una cosa appesa), sovrapposto (dentro una voce esterna), doppione (stesso tipo, stessa sagoma, vicini;
fra due case solo se quasi attaccati), passaggio (vicoli con meno di 0,9 m), densità.

Densità leggibile, con la gerarchia `LIV`: 0 si tiene sempre (ingresso, insegna, architettura, impianti, fermate), 1 la vita
(tende, bucato, festoni, dehors, bancarelle, plance), 2 il resto (lampade, tubi, manifesti, arredo minuto).
- facciata: al più `1 + larghezza/3,2 m` cose appese (almeno 2); di vita una ogni 4 m; 1 manifesto, 1 tubo ogni 7 m,
  lampade 1 per porta più una ogni 10 m;
- marciapiede: 3 cose a terra per tratto di 6 m lungo la casa, 4 per slargo di 6 × 6 m (i posti delle persone non si toccano).

Correzioni, in ordine: doppioni via, rotazione (anche con uno scostamento di pochi cm), posa a terra, scivolare lungo il muro,
e solo per ultimo togliere. Ogni correzione vale per la composizione intera e si tiene solo se il regista delle compenetrazioni
non trova niente di nuovo (anche a carico dell'altro) e se non finisce addosso a una voce esterna.

## I numeri (città con la pianta nuova, dopo l'unione con l'anteprima)
- Rumore 671 → 45: davanti alle porte 171 → 9, verso 153 → 25, parete 70 → 0, finestra 11 → 0, sovrapposti 11 → 0, doppioni 117 → 2,
  facciate oltre la densità 112 → 5, tratti di marciapiede pieni 18 → 0.
- Tolti 159, ruotati 119, spostati 172, posati a terra 5, lasciati 39 (fissi o posti delle persone).
- Compenetrazioni del regista: 60 → 21 (i pezzi degli scorci su una porta vera se ne vanno, le edicole e i carri davanti a porte
  e scale scivolano lungo i loro assi, le porte SOTTO un portico, un arco o una scalinata si contano a parte: `praticabili.sottoPezzi`).
  Le 21 rimaste sono architettura di [posa]: porte e scale dietro i portici e gli archi a più piani (coperte dalla camera all'80-100%)
  o con un pilastro, la scalinata dentro lo spazio libero davanti. Sui tetti 0.
- Peso: triangoli statici 1.072.731 (anteprima) → 1.037.691 (`?norumore`) → 1.023.821; alla fusione si scartano 348 mila vertici di
  cose tolte (prima restavano nei buffer, schiacciati in un punto). Chiamate di disegno delle 8 inquadrature: 13.662 → 13.140.
- Fogli: `_immagini/pulizia/` (00_numeri.jpg, p1–p8 dalla camera predefinita, vicino/ da zoom 0,3).

## I modelli rifatti
Gradini delle porte (profilo col naso smussato, senza la faccia di sotto), pluviali (tondi a 8 lati, collari ad anello, il gomito
al piede), vasi (torniti con l'orlo, la pianta morbida), biciclette (telaio a tubi), cassette della frutta e casse a doghe (la luce
fra le doghe, il coperchio), sedie (lo schienale sulle gambe), serrande (il rullo tondo), lampade a muro (paralume tornito), piedi
delle recinzioni di cantiere. L'atlante dei modelli `FA` è 1024 × 512 e quantizza i colori a 16 livelli: prima 1287 chiavi
finivano su 256 celle e dalla 256ª tutti i modelli prendevano il colore dell'ultima cella dipinta.

## Per chi posa
Una cosa fatta di più pezzi va registrata come composizione (`mk2(o, k, b, f, g)` con lo stesso `g`, o un gruppo solo): senza,
il censimento vede pezzi separati (prima i tasti del citofono della bottega erano «doppioni»).

## [nitida] Meno ma leggibilissimo (arredo di strada, casette, marciapiedi, muri)
Il committente: «la mappa è pienissima ma piena di imperfezioni: muri che continuano fuori dalle case, cestini, cabine e panchine che
affollano le strade un po' a caso; la strada non è un percorso invitante, è rumorosa in modo uniforme. Meglio un po' meno ma ultra
leggibile». Poi: «questa casa coi coppi è di troppo, sta in mezzo alla strada» e «il marciapiede è una striscia e la casa ci sta sopra».
`?vecchiapulizia` rimette tutto com'era (anche il mondo: cotto.js lo ricalcola invece di leggerlo cotto).

Le regole, dove stanno:
- `pulizia_rumore.js`, `nitida()` dopo il rumore, sull'arredo di strada del registro (`e.arr`: il tipo del modello `pm3`, lo scrive
  render.js): la panchina sta a un posto delle persone, su una piazza o sul lungomare; la cabina solo sulle piazze, una ogni 80 m; la
  buca delle lettere solo sulle piazze; il cestino accanto a panchine, fermate, edicole, dehors o all'angolo (uno ogni 25 m); i
  cassonetti in una piazzola sola (al più 3) ogni 90 m; via i distributori dei giornali; liberi la carreggiata, il cuore degli incroci
  e le teste delle strisce; su ogni marciapiede la corsia di 0,9 m (chi ci sta in mezzo va contro il muro, o via); lungo le vie una cosa
  minuta ogni 10 m di casa per lato; i pannelli appesi che salgono oltre la gronda scendono sotto o se ne vanno. Densità: una cosa a terra
  ogni 6 m di marciapiede (era 3), una appesa ogni 5 m di facciata (era 3,2), nei vicoli 2,4 m liberi (o il vicolo meno 60 cm).
  `window.__nitida`: il censimento prima e dopo, le azioni.
- `render.js` (solo la posa): niente panchine, paletti, cabine e buche a caso lungo le vie (buildStrade31), niente paletti a ogni braccio
  degli incroci né distributori dei giornali, parchimetri ogni ~60 m (buildUrbano1); la canaletta quasi pulita, niente cartacce, sacchi e
  copertoni a tappeto (buildVita1, oggetti35), alle porte di casa al più due vasi simmetrici; lo zoccolo e i gradini girano con la casa;
  il marciapiede finisce contro la casa dove ne resterebbe una striscia sotto 1,5 m (swField).
- `world_cittanuova.js`: `casette()` toglie le casette piccole (≤ 36 m²) senza nome né bottega libere in mezzo al selciato o incastrate
  fra due carreggiate (quelle appoggiate a un'altra casa restano: sono tetti dei giri sui tetti); l'ultima casa della lista prende il
  loro indice, così i semi della città non cambiano. `arretra()` arretra di una casella le case col fronte a meno di 1,5 m dal cordolo
  (la bottega col suo fronte, la porta e il luogo con lei). La cortina dei portici non scavalca più i varchi fra le case (1 m, era 4,2).
- `scena.js` un bidone ogni 60 m di vicolo, una piazzola di cassonetti ogni ~130 m; `rete.js` i lampioni del borgo ogni 18 m (da un
  lato solo); `tetti_vissuti.js` il coppo rotto è un coppo più scuro, non un buco nero.

Gli strumenti: `strumenti/muri_vaganti.js` (dati del mondo, pochi secondi: la cortina senza casa dietro, i muri in carreggiata o dentro
le case, i monconi, le casette, i marciapiedi stretti, le case in carreggiata; `PV_MONDO=` per il prima) e `strumenti/nitida.js` (il
gioco vero: l'arredo per tipo e per km, gli ostacoli, la roba minuta fuori dal registro; `NITIDA_SOLO=dopo|prima`).

I numeri (città, sulla mappa di claude/compassionate-knuth-l81uc8): cortina dei portici senza casa dietro 7,5 m (4 tratti) → 0;
casette in mezzo al selciato 13 → 0 (16 tolte, con quelle rimaste sole dopo); case col marciapiede sotto 1,5 m 28 → 23 (4 arretrate,
per le altre il marciapiede si chiude contro il muro); case in carreggiata 2 → 1 (gli Uffici del Garante, nel Recinto). Da guardare: il
Gradone del Mercato, 6,5 m dentro la carreggiata della Vittoria al piede (un pezzo di [posa]).
