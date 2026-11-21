# La mappa: le proposte rimaste (fase 4)

Pianta d'insieme: `v7/_immagini/squadra/mappa/proposte.png` (in node, dalle caselle). Colori: giallo la Vittoria, arancio il portale
della Rocca, ciano l'est giocabile, magenta le passerelle alle banchine basse, i riquadri i quartieri.

## 1. La Vittoria in tre tempi (giallo)
222 m dritti da 1297,343 a 1519,343; con la camera alta (il suolo fino a ~35 m) la Rocca in fondo non entra mai in quadro.
- Tre «tempi» a terra, uno ogni ~60 m (1352, 1408, 1464): attraversamenti dipinti, tombini e mosaici, un cambio di selciato.
- Uno slargo a metà (1398-1418, 333-353) con una cosa sola (un'edicola dei giornali o un chiosco) e un muro dipinto rivolto all'asse.
- La Porta della Rocca (1516-1526, 336-350) come portale illuminato: la luce a terra davanti alla porta si vede da 60 m anche col
  telefono in verticale.
Costo: medio, tutto in render.js (segni a terra, luci): da fare con il direttore artistico, che lavora sullo stesso file.

## 2. L'est giocabile (ciano)
- Il cortile della Rocca (1545-1574, 328-356; oggi oltre 260 m² senza niente) come piazza per le gare: cordoli, una banchina, un
  corrimano, lo spot di skate «Cultura» che oggi non trova posto (skate.js è in pausa nella build: prima va riacceso).
- Il Molo dei rimorchiatori come linea per la BMX: i container ora sono in due file solide (questo ramo); le due corsie fra container
  e bitte (1567,6 e 1576,4) sono già una linea dritta di 36 m; mancano due rampe di carico solide in testa e in radice.
Costo: medio (pezzi nuovi in pezzi_citta.js o arredo3d.js e le barriere in world_cittanuova.js).

## 3. Le banchine basse del Lungomare di Tramontana (magenta)
Circa 270 m² di banchina (1302,251; 1385-1406,245-253; 1423,247; 1448,246) separati dal lungomare dal parapetto (i pezzi 'parapetto',
lunghi 12 m, con la loro barriera) e da una fila d'acqua di 2 m: non ci si arriva. Per banchina: un varco nel parapetto (il pezzo diviso
in due tratti), la casella d'acqua che diventa pontile (T.PIER: render.js la disegna già a tavole) e la barriera riaperta lì. Sono spot
nascosti per la pesca e i graffiti sotto il muraglione. Costo: medio (world_cittanuova.js, dove si posano i parapetti).

## 4. I quartieri riconoscibili a terra (riquadri)
Stazione e Ottagono (rosso), il borgo (verde), la marina (blu), la Spianata e il Recinto (grigio), la Rocca (viola): per ognuno un
selciato, un colore di cordolo e di zoccolo e una luce (sodio sul lungomare, neon sulla Vittoria, lanterne rosse ai Lanternini).
Con la camera alta è quello che si vede di più. Costo: medio, in render.js (pavimenti.js e lo zoccolo delle case).

## 5. La fase F1 (urbanistica2: anelli e corti)
Pianta del prima/dopo: `v7/_immagini/squadra/mappa/proposta_f1_urbanistica2.png` (verde le caselle che si aprono, rosso quelle che
si chiudono). Le tre pezze testuali si applicano ancora al generatore di questo ramo (anche dopo allineaPieno, soglieLibere e
portoCargo): 21 case tolte o accorciate, 5 vie nuove, 6 slarghi (Orto delle Mura, Slargo della Torre, Corte delle Monache, Corte del
Calzolaio, Piazzetta del Lavatoio, Corte del Flipper). Portarla dentro world_cittanuova.js vuol dire togliere case: va approvata dal
committente prima. Lasciata com'è, dietro ?urbanistica2.

## 6. Arredo a regole, il resto
Fatto in questo ramo: il porto cargo (dati in world_cittanuova.js, barriere), le bitte e le casse delle banchine a regole, i bidoni
col fuoco fuori dai container. Da fare: le panchine, i tavolini dei bar, i lampioni e i cassonetti posati da render.js a caso e poi
spostati dalla pulizia (~1.200 spostati, ~290 tolti: rapporto del 26 ottobre). La strada: portare i loro posti nei dati (come
posti.js fa già per panchine, dehors, fermate) e farli diventare barriere alla posa, un tipo alla volta, misurando la pulizia
(strumenti/compenetrazioni.js) e gli incastri a ogni passo.
