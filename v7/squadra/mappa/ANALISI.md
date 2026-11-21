# La città vista da un level designer: l'analisi (la squadra, 21 novembre)

Rapporto del level designer. Strumenti e piante nella cartella temporanea della sessione (`squadra/mappa/`: `sonda_collisioni.js`,
`sonda_raggiungi.js`, `sonda_traffico.js`, `mappa_errori.js`, `err_ovest.png`, `err_est.png`, `err_portaterra.png`, i json e i txt delle
misure). Coordinate in metri (x verso est, y verso sud).

**Sintesi.** Muri invisibili, case attraversabili e incastri hanno una causa comune: il gioco ha **quattro modi diversi di dire «qui è
pieno»** (le caselle da 2 m, le scatole delle case, le zone riservate dei pezzi grandi, le barriere sottili) e nessuno li confronta con
quello che si vede.

## 1. Errori misurati

**A. Muri invisibili**
- 237 caselle piene non di case con almeno 1 m² senza niente sopra all'altezza del corpo: 547 m², 16 caselle vuote del tutto.
- `sonda_caselle_fantasma.js` fallisce: 18 caselle (Sottopasso dei Lanternini 1376,293; di Vico dell'Arco 1412,300; Scalinate di Vico Lungo
  1412,385 e del Forno 1354,382).
- Il varco fra i Magazzini della calata (x 1350-1352, y 374-384): una colonna 2×10 m piena ma vuota; attorno ai magazzini una fascia invisibile
  di 0,5-1 m (`pzRis(p,'B',-.6,…)`, `world_cittanuova.js:2078`).
- Muro del Garante (x 1472-1473,4, y 355-416): fascia di 1,4 m davanti al muro (~70 m²); il muro è largo 20 cm, la casella 2 m; la bomboletta
  arriva a 1,7 m (`writing.js:2506`): il muro migliore per i graffiti si dipinge a stento.
- Banchina della stazione (x 1254-1287, y 286-292): ~30×6 m rialzati che non si calpestano.
- Scala del Mercato: barriere 40, 41, 48, 49 senza corrimano disegnato (sulla 49 il dislivello è 0,46 m: muro invisibile vero).
- Porta di Terra: resta una fascia di 0,5 m, accettabile.

**B. Si passa attraverso**
- Il gioco urta solo caselle e barriere (`game.js:46`, `:231`): tutto l'arredo si attraversa.
- 28 case per 130 m². Bug: `arretra()` (`world_cittanuova.js:4526-4547`) accorcia la griglia ma non aggiorna cx, cy, lw, ld fissati in
  `expand()` (riga 4287); il disegno (`render.js:11121`, `vistaLotto`) usa la scatola vecchia: la casa resta sopra il marciapiede nuovo.
  Condominio Mare 2,95 m (x 1238-1250, y 380-383), Archivio di Stato 2 m, Merceria De Luca 2 m, Officina di Dorino 1,65 m.
- L'arrotondamento a 2 m lascia altre 127 caselle di case mezze fuori dalla casa disegnata (135 m²).
- Pezzi attraversabili: mastio della Rocca 47 m² (1577,328-331), Sottopasso di Vico del Glacis 32 m², Rivellino di ponente 19, Caserma Pietra
  dell'Onda 18 (si sovrappone al Ministero per 5 caselle), Deposito del porto 11, Torre littoria 7, 4 edicole votive (1428,328 · 1442,270 ·
  1374,348 · 1370,306).

**C. Sospesi, sepolti, compenetrati**: `sonda_disposizione` 168 difetti, 112 in città (68 affondati, 47 sospesi, 24 urti): container sospesi a
2,6 m sul molo della Rocca (1573-1575,394), arredo invernale a 3,4 m nel cortile della Rocca (1563,333), bitte dentro container e gru,
casse sospese di 0,7 m al Mercato della Rocca.

**D. Porte**: 3 soglie irraggiungibili (Condominio Mare 1251,379 dentro un'altra casa; Bar Sirena 1285,357 e casa_67 1285,355 chiusi dalle
barriere della Scala del Mercato); 25 porte condivise da due case (anche quella della partenza, 1259,349); 110 soglie fuori quota di più di
40 cm, 26 oltre 1 m.

**E. Irraggiungibile**: 160 caselle in 42 isole; le banchine basse sotto il Lungomare di Tramontana (~270 m², nessuna scaletta); un cortile
a 1288,369; 16 caselle al Torrione.

**F. Incastri**: 1,9% delle spinte ferme (gruppi a 1362,354 · 1260,378 · 1272,348); solo 3 scale su 6 hanno la zona che guida i passi.

**G. Traffico**: la volante dentro due Ritmo al piazzale della stazione (1297,312, 1,14 m) alle 19; mezzi fermi più di 20 s: Corso×Vittoria
(autobus in corsia, 1310,341 e 1323,341) a mezzogiorno, Corso sud alle 19, testa della Vittoria al ponte della Rocca (1512,344), Riva della
Rocca con Vico del Glacis (1496,288).

## 2. Duplicati e strati

- `world.js` (1.978 righe) nella build solo per `?vecchia`; `strumenti/pianta.js` lo usa di serie.
- Codice morto in `render.js`: `buildProps()` (12104-12254) mai chiamata; `buildWalls` (con `isWall = () => false`, riga 159);
  `buildPropsIsland` (4537) fa 260 tentativi con le coordinate dell'isola vecchia.
- La catena di `world_cittanuova.js` (`generate → expand → mnTaglia → arretra → casette → terrapieni → costa2Arredo → scogliFuori`) calcola
  scatole, luoghi e barriere in `expand()` e non li aggiorna più; `opere()` chiamata due volte (4288 e 4364).
- Interruttori a metà: la mappa nuova `MN` in prova nello stesso file; F1 (`?urbanistica2`) agganciata con 3 pezze di testo; ~90 interruttori.
- 251 luoghi con nomi dell'isola vecchia rimappati («monte», «vetta» nel borgo; la Piazza Grande sulla carreggiata, 1329,343).
- L'arredo posato a caso e poi aggiustato: 1.964 conflitti, ~1.200 spostati, ~290 tolti (26 ottobre).
- Spot dello skate dalla mappa vecchia: il Piazzale della Cultura non trova posto.

## 3. Critica di level design

- La camera vede il suolo fino a ~35 m (65 in verticale) e un tetto di 5 m solo entro 9-17 m: campanile, torre littoria e mastio non entrano
  mai nel quadro. La leggibilità deve stare a terra e nei primi 3 m di facciata.
- La città è un anello con una croce dentro (Corso a x≈1300, Vittoria a y 343, Viale/Lido a x 1468): in auto si legge ma è piatta.
- Rettilinei: la Vittoria 222 m dritti (la Rocca in fondo non si vede mai), il Lungomare di Tramontana 241 m con due varchi, la Via di Mezzo
  162 m larga 1,7 m; 851 m di vicoli da 1,7 m senza linee per la BMX.
- L'est è sprecato: cortile della Rocca (1558,342) e moli (1546-1572, y 400) oltre 800 m² vuoti; la piazza di 876 m² nel Recinto del Garante,
  chiusa.

## 4. Proposte (impatto, costo)

1. **Un solo «pieno»** (alto, basso): `arretra()` aggiorna la scatola; il passo guarda la scatola vera; zone riservate dalla geometria; nessuna
   barriera senza mesh (corrimano della Scala del Mercato); `sonda_collisioni` e caselle fantasma fra le prove, obiettivo zero.
2. **Arredo solido su posti prestabiliti** (alto, basso): barriere alla posa; posti dai dati (lati delle piazze, fronti delle botteghe).
3. **Il Muro del Garante muro dei graffiti** (alto, medio): via la fascia invisibile, marciapiede e riflettori; lo stesso per i Magazzini.
4. **La Vittoria in tre tempi** (alto, medio): segni a terra, slargo a metà (x≈1408), la Porta della Rocca come portale illuminato, fermate
   dei bus in piazzola.
5. **L'est giocabile** (medio): il cortile della Rocca piazza delle gare e spot «Cultura»; il molo linea per la BMX.
6. **Scalette alle banchine basse** (medio, basso).
7. **Accendere F1** (medio): anelli e corti, le pezze dentro il generatore.
8. **Quartieri riconoscibili a terra** (medio, basso): selciato, cordoli, zoccolo e luce per quartiere; edicole solide.
9. **Pulizia** (basso): via `world.js` dalla build, `buildProps`, `buildWalls`, i nomi dell'isola vecchia; `pianta.js` sulla città nuova.
