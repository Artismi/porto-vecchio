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

## I numeri (ottobre 2026, seme della città)
Rumore 499 → 51; tolti 109, ruotati 129, spostati 62, posati 5. Compenetrazioni del regista invariate (75), tetti 0.

## I modelli rifatti
Gradini delle porte (profilo col naso smussato, senza la faccia di sotto), pluviali (tondi a 8 lati, collari ad anello, il gomito
al piede), vasi (torniti con l'orlo, la pianta morbida), biciclette (telaio a tubi), cassette della frutta e casse a doghe (la luce
fra le doghe, il coperchio), sedie (lo schienale sulle gambe), serrande (il rullo tondo), lampade a muro (paralume tornito), piedi
delle recinzioni di cantiere. L'atlante dei modelli `FA` è 1024 × 512 e quantizza i colori a 16 livelli: prima 1287 chiavi
finivano su 256 celle e dalla 256ª tutti i modelli prendevano il colore dell'ultima cella dipinta.

## Per chi posa
Una cosa fatta di più pezzi va registrata come composizione (`mk2(o, k, b, f, g)` con lo stesso `g`, o un gruppo solo): senza,
il censimento vede pezzi separati (prima i tasti del citofono della bottega erano «doppioni»).
