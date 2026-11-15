# VITA2 — chi guida i mezzi del computer (fasi F4-F6 di AUDIT_VITA, contratto C4)

Ramo `vita2` da `claude/shader-styling-performance-wbvqfy` (che contiene vita1). Tavola: `_immagini/vita/vita2.jpg`.
I JSON della sonda e delle tracce: `_immagini/vita/vita2_*.json`.

## Cosa è cambiato

**C4 · il guidatore unico** (`game.js`, `Guida`, esportato come `Game.Guida` e, nel browser, `window.Guida`). Prima c'erano cinque
guidatori cinematici senza sterzo (traffico, autobus, vie minori, abitanti col loro mezzo e, sopra, le volanti di ordine.js quando
girano nel traffico): il centro rincorreva il punto di corsia, l'angolo rincorreva la tangente. Ora uno solo:

- lo stato è `v.gd = { P, s, coda, v, off, dl, ref, man }`: il percorso corrente, l'ascissa `s` del punto sotto l'**asse posteriore**,
  i tratti in coda (l'arco di svolta, la corsia dopo), la velocità, lo scostamento laterale raccordato (la «corsia»: il sorpasso,
  l'accosto alla fermata), lo sterzo, il punto di corsia seguito, la manovra in corso;
- il modello è la **bicicletta cinematica**: l'asse posteriore va dove punta il muso, l'angolo cambia di `v·tan(sterzo)/passo`;
- lo sterzo massimo è `atan(passo / raggio minimo)` (`VK.rmin` di guida2; l'autobus 6,3 m all'asse posteriore, cioè 11 m al muso
  esterno, come un autobus vero), limitato anche da `VK.turn` (velocità angolare massima) e da 5 m/s² di aderenza, e gira a velocità
  finita (1,1 rad/s le auto, 1,2 l'autobus, 2 le due ruote): niente scatti;
- lo sterzo viene dall'**inseguimento puro** di un punto del percorso a `ld0 + ldk·v` metri (le auto ~3 m + 0,45 s, l'autobus
  3 m + 0,5 s); la velocità **guarda avanti**: le curve (2 m/s² di accelerazione laterale, 1,2 l'autobus, 2,4 le due ruote), il
  punto dove fermarsi (frenata dolce), gli ostacoli che dice chi guida;
- scrive `v.steer` (le ruote e il volante, `render.js` non è stato toccato: già leggeva `v.steer` e `v.latA`) e `v.latA = ω·v`
  (il rollio della cassa), più `v.w`, `v.longA`, `v.vx`/`v.vy`;
- il punto seguito non salta mai: se il percorso cambia sotto il mezzo (fine di una manovra, corsia rimessa da fuori da ordine.js,
  l'asse fuori dal percorso a un cambio di tratto) lo scarto diventa uno scostamento che si riassorbe a 1,2 m/s;
- due mezzi di Guida si sfiorano senza speronarsi (frenano l'uno per l'altro: era già così per l'autobus e i motorini).

**I percorsi sono dati.** `Guida.percorso(pts)` (ascissa, curvatura). I **binari delle corsie** (`Guida.binario(L, dir)`): la
corsia di destra a `w/4`, raccordata sulla tangente media (prima `lanePos` spostava lungo la normale del segmento, e a ogni vertice il
punto saltava di `w/4·tan(Δ/2)`). Gli **archi di svolta** agli incroci (`raccordo`, dai dati di `LANES.conn`, game.js:296): dal binario
di arrivo, appena fuori dalla carreggiata dell'altra strada, al binario d'uscita, dritto–arco–dritto col raggio più largo che ci sta
(se è più stretto del raggio minimo del mezzo si parte prima e si entra dopo); prima a 3 m dalla fine si passava al vertice più vicino
della corsia nuova e il bersaglio saltava di metri. La svolta si sceglie 14 m (o lo spazio di frenata) prima della fine.

**Niente inversioni sul posto.** Al fondo cieco (la testa dell'asse al posto di blocco, la Stazione), dopo 15 s fermi e quando il mezzo
si ritrova girato contro la corsia: la **manovra a tre punti** (`Guida.kTurn`: avanti con lo sterzo tutto verso il lato nuovo finché un
angolo della cassa non arriva al bordo della carreggiata più un passo di marciapiede, a una casa o a un altro mezzo, indietro con lo
sterzo opposto, e così via finché non si è girati di 150°), oppure, lontano dal giocatore (> 85 m), **svolta e sparisce**
(`Guida.riappari`: ricompare su una corsia di città lontana anche quella; `HOOKS.corsieGiro`, vievive le limita alle vie e all'asse).
vievive `svolta` non torna più l'inversione: dall'asse si esce sul Corso e ci si torna dal giro della Marina; chi ha solo svolte fuori
città svolta e sparisce. Chi sta fermo in mezzo alla corsia (il giocatore, un passante) si sorpassa come un mezzo fermo.

**F5 · l'autobus** (`vievive.js`). Asse posteriore sul giro, `B.s` resta l'ascissa del centro (fermate, `liberoPercorso`).
- **Il giro è un anello senza inversioni a U.** Il grafo delle corsie ha ora anche i raccordi corti fuori città (il Passo del
  Lungomare), i collegamenti di `LANES.conn` e i passaggi per le piazze (da un capo di corsia a un'altra corsia, dritti su caselle di via
  o di piazza: il piazzale della Stazione fra il Corso e la Via Alta); la strada fra le fermate si cerca con lo stato (nodo, verso di
  marcia a sedicesimi di giro), proseguendo solo entro 135° dal verso con cui si arriva; si prova ogni ordine delle fermate e il giro
  deve tornare alla Stazione nel verso di partenza. Gli ancoraggi si legano solo a nodi dell'anello (non ai monconi). Risultato:
  Stazione → Via Alta → Passo → Lungomare di Tramontana → Passeggiata (Mercato) → Vittoria → Corso → Marina → Passeggiata Sud → Vittoria
  → Corso → piazzale della Stazione, 1016 m (la Vittoria due volte, nello stesso verso), 6 fermate tutte alla destra di chi va:
  Stazione, Lungomare, Lungomare di Tramontana, Mercato, Marina, Vittoria (sull'asse una sola, quella sulla Piazza Grande).
- **La cassa in carreggiata** (`giroCassa`): la linea dei nodi spianata (media mobile ±5 m: via gli uncini degli incroci), poi lo
  scostamento laterale di ogni metro scelto minimizzando gli angoli e i fianchi della cassa fuori dalla carreggiata vera (con l'asse
  posteriore sul giro e l'angolo della tangente), la curvatura oltre 1/6,3 m, lo scarto dalla corsia di destra e le pieghe; discesa a
  bolle di 12, 6 e 3 m solo dove serve. ~1 s una volta sola, quando nasce la linea.
- **L'accosto** è uno scostamento del percorso raccordato su 22 m prima e 16 m dopo: la cassa ci va sterzando e il muso segue lo
  spostamento (prima scivolava di lato); l'accosto si ferma dove la cassa, con l'angolo del giro lì, sta ancora tutta in carreggiata.
- Quando l'autobus non c'è (`lineaBus` non riesce), resta tutto come prima: nessuna linea.

**F6 · vie minori e abitanti al volante.** `stepMinore` (vievive): il binario di ogni verso, accelerazione e frenata, chi c'è davanti
(`liberoDavanti`); in fondo alla via ci si ferma e si fa la manovra, o lontano dal giocatore si rientra dall'altro capo (prima
`verso *= -1`: il motorino girava su se stesso). `azioni driveStep`: `Guida.prendi(v, { meta, chi: 'azioni:<id>', rider })` sulla
strada di `findPath` arrotondata (via i punti allineati, Chaikin), 11 m/s (9 la Vespa) come tetto e non più fissi, frenata
all'arrivo; se la strada parte alle spalle (il mezzo parcheggiato al contrario) prima la manovra; chi scende lascia il guidatore.

## L'API per chi guida da fuori

```js
Game.Guida.prendi(v, { percorso: [[x, y], ...] /* o [{x, y}] */, meta: { x, y } /* in alternativa: la strada la trova findPath */,
                       chi: 'commedia:salto', vmax: 8 /* m/s */, poi: 'ferma' /* o 'lascia' */, rider: v.rider /* facoltativo */ }, st)  // → true/false
Game.Guida.preso(v)   // true finché è preso
Game.Guida.fatto(v)   // true all'arrivo (con poi: 'ferma' resta preso e fermo)
Game.Guida.lascia(v)  // torna libero (fisica normale), sterzo dritto
```

Il passo lo fa `G.step` per ogni mezzo preso (prima di tutti gli altri guidatori: `v.guida`, `v.driveTo`, il traffico). Si lascia da
solo se il giocatore ci sale, o se `rider` era dato e `v.rider` cambia (chi guidava è sceso). Frena per la gente e i mezzi davanti.
`v.guida` con un valore che nessuno conosce (es. `'parti'`) non rompe niente: game.js salta il mezzo (resta al codice di chi l'ha
messo), vievive guida solo `'linea'` e `'minore'`; attenzione: vievive azzera `v.guida` se `v.rider !== 'npc'` (com'era).
Un mezzo rubato o del giocatore non è mai preso. Per la commedia (`unico_parti_vivo.js`, il salto con la rampa: `v.rider='npc'`,
`v.guida='parti'` senza nessuno a bordo) basta sostituire la guida a mano con `Guida.prendi(v, { percorso, chi: 'parti', poi: 'lascia' })`.

## I numeri

La sonda di vita1 (`strumenti/sonda_vita.js`, `node src/test_vita.js sonde`) ha ora anche i conti della guida, per tutti i mezzi
guidati dal computer senza fisica (traffico, autobus, vie minori, abitanti col loro mezzo, mezzi presi con `Guida.prendi`):
scatti d'angolo (> 0,6 rad in 0,2 s), velocità angolare oltre `v·tan(sterzo max)/passo` (+10%; passo e sterzo da `Guida.limiti`, o
la stessa formula per il gioco di prima), inversioni sul posto di tutti, salti del punto di corsia seguito (a ogni passo: oltre la
strada fatta più 1 m; prima il punto era `lanePos` della corsia), la deriva anche sull'asse posteriore e fuori dalla manovra, e la cassa
dell'autobus fuori dalla **carreggiata vera** (un angolo né su VIA né su PIAZZA, oltre `w/2 + 10 cm` dall'asse di una strada
carrabile). La deriva conta i due versi (in retromarcia non si va di traverso); dopo un salto voluto (svolta e sparisce, il mezzo in
panne portato via da vievive) le storie ripartono. Le stesse misure sul ramo di partenza e su vita2, seme 1, 600 s di gioco a partire
da 8:30, 13, 19 e 22:30 (a 1,2 minuti di gioco al secondo ogni giro copre mezza giornata):

| conto | prima | dopo | obiettivo |
|---|---|---|---|
| deriva > 8° sull'asse posteriore (contro l'angolo medio del tratto) | 12,8 % | **0,0 %** | < 2 % |
| deriva > 8° al centro (come VITA1) | 12,0 % | 8,1 % | |
| · al centro, fuori dalla manovra a tre punti (che è il 5,4 % dei campioni) | 12,0 % | 2,9 % | |
| inversioni sul posto (180° in < 3 s e < 5 m): traffico / tutti | 1 500 / 1 633 | **0 / 0** | 0 |
| salti del punto seguito > 1 m (su passi) | 2 404 / 932 058 | 24 / 1 096 457 | 0 |
| autobus: un angolo della cassa fuori dalla carreggiata vera | 22,0 % | **1,4 %** | < 5 % |
| autobus: un angolo fuori dalle caselle VIA | 54,8 % | 79,6 % | |
| autobus: un angolo su acqua o edificio | 8,1 % | 0,4 % | |
| velocità angolare oltre `v·tan(sterzo max)/passo` (campioni; il rapporto massimo sopra 1 m/s) | 7 493 (×39,8) | **5 (×0,99)** | 0 |
| scatti d'angolo > 0,6 rad in 0,2 s | 4 043 | **0** | 0 |
| autobus: velocità angolare massima | 9,55 rad/s | 0,48 rad/s | |
| vita1: `inVeh && !inside`, `car && !inside`, `n.dove` che non torna, pupazzi, senza autista | 0 | 0 | 0 |

Come leggerli:
- **La deriva al centro.** Con la bicicletta il centro di un'auto che curva va di sbieco rispetto al muso di `atan(ra·tan(sterzo)/passo)`:
  è la cinematica del corpo rigido (l'asse posteriore non scivola, il centro gira attorno a un punto sulla sua linea). Nelle svolte a 90°
  delle vie da 6 m il raggio è ~4,4 m e il centro va a 14° dal muso; nella manovra a tre punti, a sterzo pieno, a 15°. La misura che
  dice «scivola di lato» è quella sull'asse posteriore: 0,0 %. Fuori dalla manovra al centro resta il 2,8 %, quasi tutto sugli archi di
  svolta (archi più larghi taglierebbero il marciapiede d'angolo). Le manovre sono tante perché la sonda tiene il giocatore fermo in mezzo
  alla Via del Porto (1345, 389): le due file si fermano, dopo 15 s si gira (prima: 498 inversioni sul posto alle 8:30).
- **I 24 salti**: quelli registrati (gli esempi della sonda) sono tutti volanti di ordine.js rimesse sulla corsia da `toLane`, 1,2-1,3 m
  al primo passo, sulla Via del Porto e sulla costiera; agli incroci nessuno.
- **L'autobus e le caselle VIA.** Le caselle sono di 2 m: una via di 6 m di sbieco è una scala, e un autobus largo 2,5 m che tiene la
  corsia ha quasi sempre un angolo su una casella di marciapiede della scala anche stando in carreggiata. Il giro nuovo passa anche dal
  piazzale della Stazione (caselle PIAZZA) e usa la carreggiata intera nelle svolte: fuori VIA sale, fuori carreggiata vera (la
  geometria da cui le caselle sono dipinte) scende all'1,4 %, su acqua ed edifici allo 0,4 %.
- **I 5 campioni oltre la velocità angolare** sono un gozzo ormeggiato (rider `npc:pp187`) che ruota da fermo sull'acqua: fisica delle
  barche, non Guida. Sopra 1 m/s il rapporto massimo è 0,99.
- Le coppie ferme (313 → 699) cambiano molto da un giro all'altro (VITA1): non sono di questa fase.

La tavola (`_immagini/vita/vita2.jpg`): le tracce dall'alto, prima e dopo, alle 8:30 e alle 13 (240 s ciascuna), nei quattro incroci
del centro e nei quattro punti dove l'autobus girava male (le due inversioni a U di prima, il Passo, l'angolo di Tramontana); la cassa
ogni 0,8 s, rossa se scivola (> 8° sull'asse posteriore) o se l'autobus ha un angolo fuori strada; sotto, la tabella.

## Le prove

`test_guida2`, `test_ordine`, `test_azioni`, `test_seduti`, `test_commedia`, `test_parola`: verdi sul giro finale.
`test_vievive`: verde col seme 1; l'autobus arriva a tutte le fermate e le parti di sosta, corsie e segnaletica sono verdi. Cadono
a caso le scene delle vie (la fila all'edicola, l'attacchino, chi raschia il foglio: «non parte» o «affissi 0»), che usano
`Math.random` senza seme e cadono anche sul ramo di partenza (seme 1: la fila all'edicola; seme 3: l'attacchino). Su vita2: semi 1 e 2 «Tutto bene», seme 3 la fila all'edicola e l'attacchino
(«non parte»). L'autobus arriva a tutte e 6 le fermate 6-9 volte al giorno.
`test_eventi` e `test_scontri` non sono stati rifatti (già instabili sul ramo di partenza, vedi VITA1).

`test_parola`: sul ramo di partenza passa coi semi 1-6; con vita2 cadeva il caso 24b (seme 1 e 4: la promessa «domani» di Vinile non
partiva alle 08:00) e col seme 3 i casi 23a/23b. Non è la guida: la simulazione prende un'altra strada (un'altra impresa nasce, un
giorno prima o dopo) e quei casi dipendono dall'ora a cui ci arrivano. Prova: sul ramo di partenza, con il **solo** traffico che pesca un
numero in più a ogni svolta, il 24b cade col seme 3. Nel 24b Vinile arrivava alle 08:00 con la sete a 1 e `RS.assign` rifiutava
(«ha sete») dopo che la verifica aveva detto sì; il caso già fissava la stanchezza: ora fissa anche fame e sete (al più 0,5) mentre
aspetta. Con questo il seme 1 passa (vita2 e il ramo perturbato col seme 3). 23a/23b col seme 3 (la volontà di Beppe per lo scasso
−0,41 contro −0,33, un ruolo in meno) restano: stesso genere, non toccati.

Fumo (`fumo6.js`): `errori []` su F4, F5, F6 e sul giro finale.
La sonda: `node src/test_vita.js sonde` (i conti di vita1) e `node strumenti/sonda_vita.js 600 1 uscita.json` (tutti i conti). `python3 build.py` rifà `index.html`, `editor.html` e `mondo_cotto.js`
a ogni commit (game.js, vievive.js e azioni.js sono nelle fonti del mondo cotto).

## Rischi

- **Tutto il traffico cambia strada**: la simulazione diverge dal ramo di partenza dal primo minuto (altri incontri, altri tempi), e le
  prove che dipendono dall'ora a cui arrivano (test_parola 23a/23b col seme 3, le scene di test_vievive) possono cadere a caso.
- **La manovra a tre punti** usa la carreggiata più un passo di marciapiede (mai case, acqua o altri mezzi); in una via stretta e piena
  può fare molte mosse (al massimo 9, o 40 s) e, se non si gira, riprova; dopo due fallimenti, lontano dal giocatore (> 40 m), ricompare
  altrove. Vicino al giocatore fermo in mezzo alla strada le file fanno molte manovre (è la sonda: prima facevano inversioni sul posto).
- **Svolta e sparisce** teletrasporta mezzi lontani più di 85 m dal giocatore (la camera segue il giocatore): una camera libera lontana
  potrebbe vederlo. `v.__tp` cresce a ogni salto voluto.
- **Un mezzo di Guida contro uno fermo** (in sosta, in panne, un relitto; mai quello del giocatore) non viene spostato: è l'altro a
  scostarsi. Prima l'urto poteva mettere il traffico di traverso (in panne) e buttare l'autobus sul marciapiede.
- **Il giro dell'autobus** si calcola quando nasce la linea (~1 s in Node: la ricerca col verso di marcia e lo scostamento della cassa).
  Dipende dai dati della mappa: se una piazza cambia, il passaggio del piazzale della Stazione potrebbe sparire (allora la ricerca
  cerca un altro anello; se non c'è, nessun giro e nessun autobus, come prima quando la linea non riusciva).
- **L'autobus gira con 6,3 m all'asse posteriore** solo per Guida (`Guida.limiti`); `VK.autobus.rmin` (la fisica del giocatore) resta 7,5.
- `render.js` non è stato toccato: legge già `v.steer` (ruote, volante) e `v.latA` (rollio). Nessun file `unico_*`, `personaggi.js`,
  `guardaroba.js`, nessun arbitro del movimento né ancoraggi, la camera com'era.
