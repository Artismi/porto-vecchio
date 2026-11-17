# METRO — l'ingresso della metropolitana in piazza

## La lamentela
In piazza, accanto alla tettoia del Mercato, c'era un ingresso della metropolitana: un cartello «M · MERCATO» su un palo e,
per terra, un rettangolo nero (2,6 × 1,7 m, colore `#060606`) con quattro gradini *sotto* il suolo, quindi invisibili.
Si leggeva come un buco nero messo a caso, girato di sbieco rispetto al lastricato.

## Diagnosi: caso (a), è vivo
Non è decorazione. È la porta di superficie della **metropolitana giocabile** di `src/sottosuolo.js`:
- nella città compatta la linea va da **Mercato** (sotto la vecchia piazza del mercato, accanto alla tettoia ottagonale) a
  **Mura** (Via delle Mura), circa 190 m. Con la mappa nuova (`MAPPA === 'nuova'`) le stazioni sono San Giacomo, Stazione e Mercato;
- ogni ingresso è un portale `kind: 'scala'` con `metro: 'sud' | 'nord'`: con V (o un clic) si scende per un corridoio
  piastrellato fino alla banchina a isola, si aspetta il treno, si sale («Prendi il treno (V)») e si scende all'altro capo;
- i posti `metro_sud` / `metro_nord` («Metropolitana, stazione …») stanno nell'elenco dei luoghi, la minimappa li segna col quadrato
  rosso, `percorsi.js` ha la porta «L'ingresso della metropolitana (Stazione)» sul piazzale della vecchia stazione (mappa nuova).
Il nome «Mercato» è giusto: è la stazione del mercato. Resta.

Gli altri treni non c'entrano: il treno dei writer in deposito (`writing.js`, i whole car), la ferrovia di superficie e il
piazzale della Stazione (`sets` `stazione`, `scalo`). Nessuno di questi usa l'ingresso.

## Cosa è cambiato
**`src/sottosuolo.js`**
- `pozzo()` (nel modello, anche senza grafica): il pozzo delle scale va **lungo la griglia del lastricato**, in uno dei quattro versi,
  il più vicino alla banchina fra quelli con le caselle del pozzo (e quelle di fianco) libere. Salva `P.pozzo` sul portale.
  La porta resta sulla stessa casella (il pianerottolo): missioni, posti, percorsi e prove non cambiano.
- il parapetto (tre lati) e il ciglio del pianerottolo diventano **barriere** (`Game.barriera`): sulle scale non si cammina in
  superficie (prima si passeggiava sopra il buco), si scende dalla porta.
- `ingresso()` sostituisce il rettangolo nero: pianerottolo; 16 gradini di travertino col ciglio scuro (3,2 m di dislivello);
  pareti di piastrelle chiare accese, due neon, il corrimano rosso sulle due pareti; in fondo l'architrave con la fascia rossa, il
  cartello blu «↓ TRENI» e il corridoio illuminato; sopra, parapetto di pietra con copertina e ringhiera (corrimano rosso) su tre
  lati; il **portale d'acciaio** sul pianerottolo con il cartello «M · MERCATO» verso chi arriva (e uno dritto anche di dietro) e due
  lanterne; il **totem** accanto al pianerottolo con il cubo rosso della M acceso e la targa col nome.
- **Il suolo non si buca**: il pozzo si disegna prima (renderOrder −0,6, dopo il cielo) e una sagoma invisibile alla bocca scrive
  solo la profondità (−0,5), come la sagoma delle barche contro il mare (`waterMask` in `render.js`). Il suolo e i suoi decali lì
  non passano: dalla bocca si vedono le scale vere.

**`src/game.js`**
- `BAR` è una copia di `W.barriere` (i dati della mappa restano quelli); `barriera(b)` aggiunge un segmento dopo: le celle, i lati
  chiusi della griglia dei percorsi (`BLK`). Esportata. Solo dove la mappa ha già barriere (la città nuova): sull'isola di prima
  `BAR` vuoto tiene spenti i controlli dei muri sottili e dei salti di quota (accenderli cambiava le scene di `test_eventi`).

**`src/render.js`**
- il regista delle compenetrazioni (`[pulizia2]`) tiene libera l'impronta del pozzo (più 30 cm): niente panchine, cestini o
  fioriere dentro il parapetto.

## Prove
- `test_sottosuolo.js cittanuova`: la metropolitana, il treno, salire e scendere tornano come prima (le 2 + 7 prove che falliscono
  falliscono identiche anche senza questa modifica: fogne, strati e ritrovamenti).
- confronto prima/dopo su `test_percorsi`, `test_mappa_compatta`, `test_citta_viva`, `test_cantiere`, `test_eventi`, `test_tetti`,
  `test_tetti4`, `test_scale_finestre`, `test_vievive`, `test_writing`, `test_strada_dipinta`, `test_campagna`, più `test_pedonale`
  e `test_controlli8` (le barriere): nessuna prova nuova fallita.
- l'impronta del mondo cotto cambia (game.js è fra le fonti): `1e3e4946dff1db2b` → `675ebcdf3ca1b075`, `mondo_cotto.js` ricotto.
  Cambia anche l'impronta dei tasselli (vanno ricotti con `python3 build.py --tasselli`).

## Immagini
`_immagini/metro/metro.jpg`: prima | dopo, alla camera del gioco (800×450, la stessa posa del giocatore e lo stesso yaw chiesto
alla camera; la camera del gioco si gira da sola attorno a quello che la copre, quindi l'inquadratura prima e dopo non coincide),
due posti in strada: a nord del pozzo e sul lato del pianerottolo.

Prova di fumo (`fumo6.js`): `errori []`.
