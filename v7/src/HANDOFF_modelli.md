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

## Da fare
- I modelli del mondo in `render.js` (lampioni, panchine, bancarelle…) e i mobili `pv_*` di `models.js` non passano dallo studio: vanno aggiunti come sorgenti e rivisti allo stesso modo.
- Personaggi: sempre il punto più debole (vedi HANDOFF_personaggi).
