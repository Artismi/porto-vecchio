# MONDO_FIX — il muro invisibile alla Porta di Terra, i mezzi uno dentro l'altro

Il committente, giocando all'APK 1.5 (tasselli `393e66f887001bd3`):
1. «vicino all'arco di trionfo mezzo interrato c'è una striscia nera per terra: non ci passo, ci giro attorno, come un muro che non si è caricato»;
2. «una macchina e un furgone bianco uno dentro l'altro».

`?nomondofix` (e `PV_NOMONDOFIX=1` in Node) rimette il traffico com'era, per confronto.

## 1. La Porta di Terra: due caselle piene senza muro

**L'arco.** È la Porta di Terra (`porta_terra`, pezzi_citta.js; posata in world_cittanuova.js, «E0 la Porta di Terra della cinta
medievale»), in (1261, 345) sul Mercato vecchio, sulla bocca del Vico dei Giardini: è l'«arco di trionfo» della pianta
(MAPPA_COMPATTA.md §14), posato a quota 3,5 contro il terreno a 3,9 del lato del vicolo (da lì sembra un po' affondato).

**Cosa ferma.** `pzRis(p, 'B', …, -7, 3.2)` riserva come caselle piene (T.BLD: `walkT` falso, si urta) un rettangolo profondo 7 m
dietro ciascuna torre, «il pieno fino alle case: nessuna porta nascosta dietro l'arco». Ma il pezzo arriva solo fino a z = −3 (corpo
e torri): da −3 a −7 non c'era niente. Sono **12 caselle** (627-628 × 165-167 e 170-172, cioè x 1254-1258, y 330-336 e 340-346): due
strisce di 4 × 6 m ai due lati del vicolo, fra il retro delle torri e le case. Non è il ciglio (game.js, i salti di quota: qui il
dislivello è 0,4 m), né una scogliera, né `ingombri.js` (lavora sugli arredi, non sulle caselle).

**Cosa è nero.** Lo stesso: sotto una casella piena il suolo si disegna col colore delle case (grigio scuro, render.js `COL[T.BLD]`)
e le lastre, il selciato, i segni (render.js, `if (v === T.BLD) continue`) non ci vanno. Ne viene una striscia scura senza muro.
Non è un buco del tassello né un'ombra: è lo stesso nel browser e nei tasselli (che sono la città del browser cotta), e la collisione
viene dalla stessa griglia in tutti e due i modi.

**La correzione: si mostra l'ostacolo** (il pieno era voluto). `porta_terra` ha l'opzione nuova `dietro` (m): i due monconi della
cinta in tufo, con zoccolo e copertina, dal retro delle torri fino alle case, esattamente sopra le caselle riservate. La città la
posa con `dietro: 4` e la riserva usa lo stesso numero (`-3 - O.dietro`): il muro e la collisione ora sono la stessa cosa.
La griglia non cambia (le stesse 38 caselle), quindi niente cambia per case, porte, percorsi.

**La prova.** `node strumenti/sonda_caselle_fantasma.js` costruisce ogni pezzo con caselle piene e tira un raggio dall'alto su ogni
casella riservata che non è di una casa. Porta di Terra: prima 12 caselle senza niente sopra, dopo 0 (`PV_PEZZI=<pezzi_citta di prima>`
per il prima). `strumenti/pezzi_check.js porta_terra`: 6/6 (c'è la prova con `dietro: 4`).

**Resta** (stesso difetto, altri posti, non toccati qui): la Stazione (10 caselle: la riserva va a L + 3, il fabbricato finisce a L),
il Rivellino di scirocco (12), e 4-5 caselle al bordo dei due sottopassi a volta e delle due scalinate.

L'APK va rifatto coi tasselli nuovi: l'impronta è cambiata (`8aa703c673e3a8b9`), finché non sono cotti il gioco costruisce la città
nel browser (che ha già la correzione).

## 2. I mezzi uno dentro l'altro

**La sonda.** `node strumenti/sonda_mezzi_sovrapposti.js [secondi] [seme]` (`PV_SONDA_ORE=8.5,13,19`): G.step a 0,05 s, ogni 0,2 s le
coppie di mezzi di terra entro 150 m dal giocatore le cui casse (SAT) si infilano più di 25 cm, divise in *corsa* (due guidati in
moto), *fermo* (uno contro uno fermo), *fermi*, *comparso* (appena nato o ricomparso, il salto oltre 85 m); in più le coppie
sovrapposte all'avvio in tutta l'isola.

| 3 × 180 s, seme 1 | campioni sovrapposti | coppie | corsa | fermo | fermi | comparso | all'avvio | peggio |
|---|---|---|---|---|---|---|---|---|
| prima (`PV_NOMONDOFIX=1`) | 2951 | 109 | 585 | 949 | 1407 | 10 | 2 | 3,1 m |
| dopo | 75 | 6 | 0 | 15 | 60 | 0 | 0 | 0,98 m |

**Dove si infilavano** (dalle tracce delle coppie):
- **il traffico guardava il centro dell'altro**, entro 1,8 m dall'asse: l'autobus di 10,8 m che gira, l'auto che sbuca di traverso
  avevano il centro fuori e la cassa dentro. E un'auto a 107° (di traverso all'incrocio) contava come «nell'altra corsia, viene
  incontro» (`cos < -0,3`) e non si guardava proprio. Ora `ingombroDavanti` (game.js): la scatola dell'altro proiettata sul corridoio,
  anche dove sarà fra 0,9 s; «incontro» è entro 37° (`cos < -0,8`); all'incrocio fra due auto passa la più vicina; all'autobus si
  dà strada. Lo stesso filtro di «incontro» nell'autobus e nelle vie minori (vievive.js).
- **due mezzi guidati si attraversavano per costruzione** (`collideVehicles` usciva subito: «si sfiorano»). Una volta dentro, restavano
  dentro (i *fermi*: tutti e due aspettano l'altro). Ora niente urto lo stesso, ma il più leggero si scosta della penetrazione; se
  non c'è posto chi ha l'altro davanti non va avanti (`v.__tocca` in Guida.passo).
- **l'autobus «si fa largo»** dopo 4 s fermo ignorando i mezzi guidati per 3 s, e dopo 30 s passa attraverso i fermi: ora in forza si
  ferma lo stesso a 1,2 m da chi c'è sul percorso, e attraverso passa solo oltre 70 m dal giocatore. Frena davvero quando c'è
  qualcuno (2 m/s² di calcolo, 5 di freno; prima la frenata tranquilla di curva: entrava di mezzo metro nella corsia di chi passava).
- **il sorpasso** del fermo (3 s) valeva anche per l'autobus fermo di traverso all'incrocio: l'auto lo toglieva dagli ostacoli e gli
  entrava nel fianco. Ora si sorpassa solo chi è fermo per il lungo.
- **la manovra a tre punti** guardava solo i due angoli di testa: ora la cassa intera contro i mezzi vicini.
- **la sosta dell'avvio** (`parkSpot`) non guardava i mezzi: la volante2 sulla Vespa di Beppe, la 126 della benzina sulla Campagnola
  dei Grigi (in (1251, 356), a dieci metri dalla Porta). Il furgone bianco più probabile è uno del traffico (tr10, vv6, `#d8d0c0`),
  che la sonda trova infilato nell'autobus e nelle auto agli incroci. Ora parkSpot con `st, kind` salta i posti occupati
  (game.js, le volanti di ordine.js, la sosta della volante).
- **il salto oltre 85 m** (`riappari`) guardava già 9 m attorno: non fa sovrapposizioni (0 *comparso* dopo).

Restano 2 coppie per ora, una volante di ordine.js (guidata da `driveTo`, fuori da Guida) e l'auto del traffico che le si ferma contro.

Prove: `src/test_guida2.js` TUTTO OK; `src/test_vievive.js` 2 prove di scene stocastiche fallite, lo stesso numero (altre scene)
anche con `PV_NOMONDOFIX=1`.
