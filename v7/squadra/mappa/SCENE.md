# Le scene della città (prima la scena, poi la pianta)

Cinque luoghi composti come inquadrature dalla camera del gioco (camera7: alta, ~30° giù; nel Game Boy in verticale il bordo alto
sta ~12° sopra l'orizzonte: in alto si vedono i tetti e il landmark lontano). Tavolozza: BIBBIA_STILE §1 (muri pastello, colore pieno solo
per graffiti, insegne, neon, persone), i momenti di §5 (crepuscolo magenta e viola con le finestre arancio, notte verde acqua e nero con le
pozze calde dei lampioni). Regola delle schede: **una cosa sola forte** per inquadratura, il resto le fa da ritmo e da cornice.

Realizzazione comune: i dati della scena stanno nel mondo (`world_cittanuova.js scene()`: pezzi della libreria `arredo3d.js`, luci, aloni,
fili di lanterne), render.js li disegna (`sceneMappa`), i pezzi grandi sono barriere; i lavori grandi del Muro li posa
`strada_dipinta.js` (1b). Niente di nuovo da modellare: solo pezzi esistenti, luci registrate e un alone.

## 1. La Vittoria e la Porta della Rocca — il crepuscolo (19:55)
- **Inquadratura**: si arriva da ponente lungo l'asse; la foto dal varco del posto di blocco (1484, 343) verso levante. Primo piano: il
  selciato della Vittoria e le sbarre del varco; piano medio: il ponte; fondale: la Porta della Rocca, 37 m, che chiude l'asse.
- **Luce**: cielo viola-magenta, la Porta accesa di **rosa** (un alone che si vede da 60 m) e due riflettori caldi sui fianchi del fornice:
  il landmark è l'unica cosa satura in fondo all'asse grigio-lilla.
- **Perché è bella**: la prospettiva centrale chiusa da un portale acceso; il ritmo dei lampioni lungo i bordi.
- **Vita**: il posto di blocco (le guardie), il traffico che entra ed esce dalla Rocca.
- **Arredo**: a metà dell'asse (x 1398-1418), sul marciapiede largo di tramontana, lo **slargo**: il chiosco col neon rosa, due panchine
  di cemento rivolte alla via, quattro fioriere.
- **Gameplay**: l'asse è la via d'ingresso alla Rocca e la linea dritta per l'auto; lo slargo è una sosta (panchine).

## 2. Il cortile della Rocca, la piazza delle gare — la notte (22:30)
- **Inquadratura**: dalla banchina della darsena (1549, 346) verso tramontana dentro il cortile; primo piano: la banchina; piano medio:
  la curva di jersey e le panchine; fondale: i corpi della Rocca col riflettore rosso.
- **Luce**: due fari sui pali a boma, **magenta** e **ciano** incrociati sul selciato (il colore del genere), il fusto acceso arancio
  che sfarfalla; il resto verde acqua e nero.
- **Perché è bella**: due pozze di colore contrapposte su un piazzale scuro, la curva bianca dei jersey che disegna la pista.
- **Vita**: la crew, le moto, il pubblico seduto sulle panchine (le gare: proposta).
- **Arredo**: cinque jersey in curva (raggio 7 m), due panchine di cemento come ledge, la pila di gomme, due fusti. Metà di ponente:
  l'altra metà è dell'eliporto e dell'antenna (render.js ne tiene fuori i pezzi).
- **Gameplay**: la pista per BMX e moto attorno alla curva; i ledge; lo spot «Cultura» da riaccendere (skate.js in pausa).

## 3. Il molo dei rimorchiatori, la linea — l'ora d'oro (18:35)
- **Inquadratura**: dalla radice del molo (1572, 377) verso il mare; primo piano: il muletto e le gomme; piano medio: le due file di
  container (colori pieni ma spenti: ruggine, petrolio, salvia, ocra) e le gru gialla e arancio; fondale: il mare oro.
- **Luce**: sole basso alle spalle, ombre viola lunghe sul molo; le due lampade del cantiere calde.
- **Perché è bella**: la fuga delle file di container verso il mare, chiusa dalla gru in testa contro il cielo.
- **Vita**: i portuali al muletto, un rimorchiatore all'ormeggio.
- **Arredo**: muletto, pila di gomme, fusti; i container e le gru sono del porto cargo a regole (solidi).
- **Gameplay**: le due corsie fra container e bitte (1567,6 e 1576,4) sono una linea dritta di 36 m per la BMX; mancano le rampe (proposta).

## 4. Il Muro del Garante, la hall of fame — il crepuscolo (20:10)
- **Inquadratura**: dal Viale della Spianata (1466, 384) verso il Muro; primo piano: la carreggiata; piano medio: il muro con i lavori
  grandi uno accanto all'altro; fondale: le torri di guardia e i riflettori del Recinto.
- **Luce**: le lampade a braccio sul muro (sodio, una ogni 20 m nei vuoti fra i lavori) fanno pozze calde sui pezzi; il fusto dei writer
  ai piedi della torre; il cielo viola dietro le torri.
- **Perché è bella**: 60 m di muro di cemento grigio che diventa una galleria di colori pieni, ritmata dalle torri.
- **Vita**: i writer (writer_vita.js: la hall of fame della crew), la ronda che passa.
- **Arredo**: tre lanterne a braccio, il fusto acceso; i **sei lavori grandi** (burner, murale, pezzo; 6 × 2,4 m) su strada_dipinta.js.
- **Gameplay**: il muro si tocca (fase 1: niente più fascia invisibile), la bomboletta ci arriva: il posto dove dipingere in grande.

## 5. Lo slargo dei Lanternini — la notte (23:00)
- **Inquadratura**: dal sagrato (1381, 313) verso il vicolo che esce dalla volta; primo piano: il sagrato; piano medio: i due fili di
  lanterne rosse; fondale: la volta del sottopasso e la Chiesa Madre a lato.
- **Luce**: il rosso delle lanterne che riempie il vicolo, contro il verde acqua della notte; le lanterne a braccio sulla facciata.
- **Perché è bella**: il rosso è il segno del vicolo (il suo nome); si legge da lontano, dalla piazza.
- **Vita**: il bar, la gente seduta fuori, chi passa sotto la volta.
- **Arredo**: due fili di sei lanterne dalla facciata di ponente a due pali di legno sul bordo del sagrato, due lanterne a braccio.
- **Gameplay**: la «briciola» a terra che dice da lontano dov'è il passaggio sotto la volta.

## Costi
Pezzi posati: 29 (della libreria esistente), 14 luci (si accendono la sera, nel giro delle luci vicine), un alone, 2 fili da 6 lanterne
(una ventina di mesh piccole), 6 lavori grandi (nella tela dei graffiti, come gli altri grandi). Nessun modello nuovo, nessun passo di render.
