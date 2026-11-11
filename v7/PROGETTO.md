# PROGETTO — il cantiere come progetto: la vista progettuale

> **STATO [cantiere2, 11 novembre]:** dopo le osservazioni del committente («cinque livelli e la scritta a terra confondono, le piante da togliere
> si mescolano al terreno, troppe cose sullo schermo, deve essere semplicissimo; lo scavo come Minecraft») la vista è stata **semplificata**:
> due strati, quattro bottoni; terreno e scavo sono uno strumento solo (Spiana, Alza, Scava: sopra il suolo scende, poi si va sotto a blocchi). Come si gioca: §4; cosa è cambiato: §6. Tavola
> `_immagini/progetto/semplice.jpg`. Le §2–3 restano come storia della prima stesura.

> «Queste logiche devono essere funzionali, comprensibili e leggibili, usabili; la modellazione del terreno va pensata bene, come una
> sculpt mode in sovrapposizione, che fa intravedere l'oggetto o il terreno risultante dall'operazione; piazzi tutte le cose che vuoi,
> progetti tutte le modifiche al terreno, scavi ecc., hai come una vista progettuale, con la mappa normale e l'ologramma semitrasparente
> del progetto, poi man mano che viene realizzato in pratica riempie quell'ologramma mentre lo costruiscono.»

Tre parti: **1. la diagnosi** del cantiere di oggi (giocato davvero, computer e telefono), con i difetti contati e messi in fila e i
guasti veri già riparati; **2. la proposta**: la vista progettuale, pensata prima di scriverla; **3. il lavoro fatto**: la vista dietro
`?progetto`, misure, prove, come si gioca, i punti deboli e le domande aperte.

Tavole: `_immagini/progetto/diagnosi.jpg` (la diagnosi), `_immagini/progetto/proposta.jpg` (la proposta, sul prototipo vero),
`_immagini/progetto/dopo.jpg` (il risultato nel gioco, computer e telefono).

---

## 1. La diagnosi

Giocato davvero in Chromium (SwiftShader, `?cittanuova&leggera&tassellivecchi`): computer 1366×768 e telefono 390×844 al tocco;
un campo piantato nel bosco fuori città, ogni categoria aperta, una casetta posata, due della banda reclutati, un garage col cantiere,
il pennello Sgombra, la banda al lavoro col tempo accelerato, un banco da lavoro posato e aperto, una botola, giù sotto terra, un bunker
tracciato e scavato. In più la lettura del codice (`cantiere.js`, `livelli.js`, `main.js`, `render.js`). Le schermate sono nella tavola
`_immagini/progetto/diagnosi.jpg` (i numeri rossi sono quelli dell'elenco).

### 1.1 I guasti veri (riparati, commit piccoli e separati sul percorso di serie)

| # | guasto | dove | riparato |
|---|---|---|---|
| G1 | **Bunker** (Sottoterra): cinque `digRoom` di fila, ma la prima avvia lo scavo a tempo e le altre trovano «Stai già scavando»: si apriva **una stanza 3×3 sola**, e travi e assi **si pagavano comunque**, anche senza pala o a stanza già larga | `cantiere.js under()` | `058c2a2`: è uno scavo 5×5 tracciato (`placeDig`), paga solo se si può; prova in `test_cantiere.js` (sulla HEAD di prima falliscono 3 prove) |
| G2 | **Telefono: la sagoma e la casella verde/rossa non seguono il dito** (`main.js` aggiorna il puntatore solo col mouse): si posa alla cieca, il colore e il motivo del no sono di un altro punto | `cantiere.js down/drag` | `3480fd9` |
| G3 | **Telefono: «Pianta qui il campo» irraggiungibile**: fuori da un covo il bottone del cantiere non c'è e la Y non esiste | `cantiere.js render` | `d8f4f7c`: col dito, fuori città e all'aperto, il bottone c'è («Pianta un campo») |
| G4 | **Le schede contano 0/4 la roba nel baule del campo** (che poi si usa davvero per pagare): sembra che manchi | `cantiere.js totalOf` | `68c4a1d` |
| G5 | **Ctrl+Z di una costruzione lascia alla banda i suoi lavori**: vanno a disboscare e a tirare su una cosa che non c'è più | `cantiere.js undoLast` | `68c4a1d` |
| G6 | **Dopo Spiana / Livella / Sgombra si cammina alla quota vecchia.** `groundH` legge le quote da una copia pigra (QV2) che nessuno rinfrescava: il terreno si ridisegna, ma il personaggio, le cose posate e la camera restano alla quota di prima (nel browser: 4 vertici alzati di 1,5 m, `groundH` 6,45 → 6,45; rinfrescata la copia, 7,95) | `render.js dirtyAt` | `ea67e92` (una riga) |
| G7 | Il nome del campo: «Campo vicino a In fondo al Pontile della Tramontana» | `cantiere.js claim` | `294a656`: «Campo · In fondo al Pontile…» |

### 1.2 Quello che non si capisce, non si legge, non si usa (in fila per gravità)

Contati: **21** difetti di usabilità (più i 7 guasti). In fila: prima quelli che impediscono di fare quello che la richiesta
chiede, poi quelli che fanno sbagliare, poi quelli che rallentano.

**Impediscono**
1. **Non si può progettare.** Ogni clic spende e costruisce subito: non si disegna la base intera prima, non si prova una disposizione,
   non si sa cosa manca in totale. Se manca la roba la carta è grigia e il pezzo non si può nemmeno segnare.
2. **Il terreno non ha anteprima.** Spiana, Livella, Sgombra cambiano il suolo al passaggio del dito; la quota «da dove parti» è invisibile;
   non c'è un numero (quanta terra, quanto tempo). Con la banda diventano nastri bianchi e rossi, uno per casella, che non dicono il risultato.
3. **Sotto terra non si legge da sopra.** Da fuori non si vede nessuna galleria; gli scavi da edificio si tracciano solo stando già sotto;
   in superficie le carte Cunicolo, Discesa, Stanza, Uscita restano attive ma rispondono «Prima devi essere sotto terra».
4. **L'avanzamento non si vede.** I lavori della banda sono «Lavori in coda: 3»; il cantiere è un'impalcatura trasparente senza
   percentuale, senza chi ci lavora, senza quanto manca; lo scavo da edificio non dice quando finisce.
5. **Telefono: si posa al tocco, senza anteprima, e non si gira.** R e rotella non ci sono; Gira esiste solo per un pezzo già posato;
   con due dita il primo dito ha già posato un pezzo prima che parta il pizzico.

**Fanno sbagliare**
6. **Carte che fanno cose diverse al clic**: nel Terreno e nei pezzi la carta si sceglie e poi si clicca sul suolo; in Sottoterra la
   carta *Botola* (e Cunicolo, Discesa, Stanza, Uscita, Bunker) scava subito dove sei.
7. **Il perché del no arriva dopo il clic.** Mentre muovi c'è solo il colore della casella; il motivo è un messaggio che compare quando
   hai già cliccato, in basso, e sparisce in 5 secondi.
8. **La camera.** Entrando la visuale sale ma resta vicinissima e legata al personaggio: per costruire a 15 m bisogna uscire e camminare;
   nel bosco erba e chiome coprono il suolo e la casella sotto il puntatore (schermate 04).
9. **Due bunker diversi con lo stesso nome** («Bunker» puntellato, «Bunker di cemento» da edificio) in due modi diversi di scavare.
10. **La banda scava a distanza.** Lo scavo da edificio avanza con la banda ovunque sia (anche in prigione o a lavorare altrove) e
    nessuno va sul posto; i lavori segnati invece li fa chi ci va davvero.
11. **Quando manca la roba il pezzo non resta segnato**: «Mancano: …» e basta; bisogna ricordarselo e tornare.

**Rallentano, si leggono male**
12. **I costi**: nomi lunghi su tre righe («fascio di legna da ardere 6/6 · trave 10/10 · fascio di assi 18/18»), la carta senza roba è a
    metà trasparenza (non si legge proprio quello che manca), nessun totale per più pezzi.
13. **Le postazioni non dicono cosa fanno**: Banco da lavoro, Forgia, Falegname… solo il nome e i materiali; le ricette si scoprono dopo.
14. **Miniature mancanti**: tutte le Postazioni, quasi tutto Sottoterra, metà delle Baracche (Infermeria, Ramada, Torretta, Latrina, Cisterna…).
15. **Il riquadro in alto a sinistra copre il diario dei messaggi** (si legge «Campo vicino a…» sopra «La grafica gira…»).
16. **Le scorciatoie sono una riga sola di testo** («Clic: piazza · trascina: una fila · R: gira · destro: lascia · prendi una cosa messa
    e trascinala · Canc: togli · Ctrl+D…»): non si imparano, e sul telefono non valgono.
17. **Nessun ordine nei lavori**: la banda li fa nell'ordine in cui li hai segnati; non si anticipa la casa prima del recinto.
18. **Il pennello senza cerchio**: Sgombra e Livella non mostrano raggio né punto di partenza; si scopre cosa hanno toccato dopo.
19. **Carte fuori schermo**: 21 carte in Pezzi, 32 in Arredi, su una riga sola; Casetta e Garage sono in fondo, fuori dallo schermo
    (nella prova il clic sulla Casetta è caduto fuori).
20. **Al telefono il cantiere compare solo dopo la prima base** (`orienta.js`, lo svelare piano): sul computer la Y funziona da subito
    ma nessuno lo dice. È una scelta, non un guasto: va bene, ma allora serve dirlo quando la base arriva.
21. **Al telefono le categorie escono dallo schermo**: la fila di pillole non va a capo e non scorre; Baracche, Pezzi, Arredi,
    Postazioni non si toccano. Il riquadro in alto mostra le scorciatoie da tastiera e copre il personaggio.

Note sulla prova: con SwiftShader un fotogramma costa 4–6 s a 1366×768, una schermata 1–2 minuti; per questo la banda al lavoro,
lo scavo e il banco aperto si sono provati anche in Node (`test_cantiere.js`, `test_progetto.js`) e leggendo il codice.

---

## 2. La proposta: la vista progettuale

### 2.1 L'idea in una riga
Il cantiere smette di essere «clicca e costruisci subito» e diventa un **tavolo da disegno sopra la mappa vera**: progetti tutto quello che
vuoi (pezzi, terreno, scavi) senza spendere niente, vedi in ologramma cosa verrà, leggi in una distinta cosa serve e cosa manca, poi avvii i
lavori e **l'ologramma si riempie** mentre la banda (e tu) lo costruite.

### 2.2 Entrare e uscire
- **Y** (computer) o il bottone **Cantiere del covo / Pianta un campo** (telefono) apre la vista progettuale quando sei all'aperto (in un
  campo o dove puoi piantarlo) o sotto terra. Dentro casa Y apre il cantiere di prima (gli arredi della stanza: lì il progetto non serve).
- Si esce con **Y**, **Esc** (senza strumento in mano) o **Esci**. Il mondo non si ferma: la banda continua a lavorare mentre progetti.

### 2.3 La camera
- La camera si **stacca dal personaggio** e guarda un punto che sposti tu (WASD/frecce, trascinando col tasto centrale, o con due dita):
  si progetta a 40 m senza camminare. Resta legata al campo (al massimo 90 m dal personaggio).
- Due viste: **dall'alto** (di serie, la pianta: si legge l'ingombro) e **di sbieco** (T): si leggono le altezze, il terreno che sale,
  la riga che si riempie.
- **Gira** col destro trascinato, Q/E, o torcendo due dita; **zoom** con la rotella o il pizzico.
- **Sotto: la sezione per profondità.** Il bottone *Sezione* (o la modalità *Sotto*) vela il mondo di nero trasparente e mostra in
  trasparenza, alla profondità scelta (−3, −6, −9 m), le gallerie che ci sono già (piombo; quelle fuori fascia più scure e basse) e gli
  scavi del progetto come volumi. Così tunnel e bunker si leggono da sopra, senza scendere.

### 2.4 L'ologramma: un colore, cinque stati
Un colore solo per il progetto, **cielo `#A3D4D8`** (della tavolozza unica, BIBBIA_STILE §1), semitrasparente, più pieno di taglio
(fresnel) e col contorno dell'ingombro: si legge sopra l'erba, la terra, la pietra, senza rumore. Gli stati cambiano solo la tinta:

| stato | tinta | quando |
|---|---|---|
| in progetto | cielo `#A3D4D8` | disegnato, si può fare |
| manca la roba | ocra `#DC9A34` | quando tocca a lui, la roba non c'è (la distinta dice cosa) |
| non si può | rosa `#E04B8C` | fuori dal campo, in città, sopra un altro pezzo, scavo nelle fogne… (il motivo accanto al puntatore) |
| aspetta | salvia `#93B27C` | aspetta il terreno sotto, lo scavo, il collegamento a una galleria |
| in corso | cielo che **si riempie dal basso**: sotto la riga il pezzo vero (i suoi colori, solido), sopra l'ologramma; la riga chiara sale con l'avanzamento | |
| fatto | sparisce l'ologramma, resta la cosa vera | |

I colori riservati del gioco (limone obiettivo, allarme pericolo, vermiglio personaggio) non si usano.

### 2.5 Il terreno: una sculpt sopra la mappa
- Pennelli: **Alza, Abbassa, Spiana** (alla quota da dove parti), **Liscia**, **Sgombra** (alberi, cespugli, sassi), **Ripristina**
  (cancella il progetto sotto il pennello). **Raggio** 1–8 m e **forza** 0,1–1,5 m (cursori; `[` `]` sul computer).
- Il pennello non tocca il terreno: scrive la **quota che verrà** in ogni vertice (`plan.vt`). L'anteprima è una maglia sopra il suolo
  alla quota futura: **ocra dove si scava**, **cielo dove si riporta**, trasparente dove non cambia, con le **curve di livello ogni
  mezzo metro** (righe scure). Le caselle da sgombrare in salvia.
- Numeri sempre in vista: **metri cubi da togliere e da portare**; nella distinta gli attrezzi (pala, piccone, ascia) e il tempo.
- Dove non si può: case, strade, acqua, città, fuori dal campo, sotto i pezzi già costruiti. Al massimo ±6 m.
- Nei lavori il terreno si divide in **zolle** di 4×4 caselle (un lavoro ciascuna): la terra vera sale o scende a quinti, l'ologramma
  si assottiglia fino a sparire.

### 2.6 Gli scavi, sotto
- **Galleria** (trascinando, a tratti dritti come i muri), **Pozzo con la scala** (da sopra si scende: la botola, il fondo alla
  profondità scelta), **Cantina, Stanza, Sala, Bunker** (le stanze del cantiere).
- La quota: se lo scavo tocca una galleria (vera o del progetto) **prende la sua quota** («si aggancia alla quota −2,7 m»); se no il
  suolo meno la profondità scelta.
- Si fa solo se è **collegato**: a una galleria scavata, a un pozzo, a un altro scavo collegato. Se no aspetta (salvia) e lo dice.
- Nei lavori le caselle si aprono una a una, dal lato collegato verso il fondo: il volume dell'ologramma si svuota.

### 2.7 Posare i pezzi nel progetto
- Tutto il catalogo che si costruisce (Baracche, Pezzi, Arredi, Postazioni, Difese, Corrente: circa 90 pezzi); non le azioni sul posto
  (orto, disbosca: quelle restano nel cantiere di prima, o diventano Sgombra).
- Clic: posa; trascinando i pezzi da una casella (muri, recinti, sacchi, tetti, pavimenti) **una fila dritta**, con le sagome di tutta
  la fila prima di lasciare; **R** gira; clic su un pezzo del progetto: **Gira, Sposta, Prima, Togli**; trascinarlo lo sposta;
  **Annulla/Rifai** (Ctrl+Z, Ctrl+Y, e i bottoni). Quello che è già cominciato non si annulla (la roba è pagata), si toglie (torna nel baule).
- Il perché del no sta **accanto al puntatore** mentre muovi, non dopo il clic.

### 2.8 La distinta
Il pannello a destra: per ogni materiale **serve / hai / manca** (tasche, bauli dei campi, scorte delle basi: gli stessi conti del
pagamento), gli **attrezzi** (ce l'hai / manca), **chi lavora** (quanti della banda) e il **tempo** stimato. In alto il riassunto: lavori,
terra da muovere, ore.

### 2.9 I lavori: la coda che si riempie
- **Avvia i lavori**: il progetto diventa una **coda ordinata**: prima il terreno (le zolle), poi gli scavi, poi i pezzi nell'ordine in cui
  li hai messi. **↑ / Prima** per riordinare, **◎** per andarci con la camera, **Pausa** per fermare (chi lavora finisce il turno).
- I membri liberi della banda vanno al cantiere a turni di 30 minuti (come i lavori del cantiere di prima: chi fa di testa sua lascia e
  viene); al massimo un cantiere aperto per membro. **Tu** dai una mano: fuori dalla vista tocchi l'ologramma in corso, ci vai, e finché
  resti lì lavori (una volta e mezzo un membro).
- **La roba si paga quando il pezzo comincia.** Se manca, il pezzo diventa ocra e la coda passa al prossimo che si può fare; appena la
  roba c'è (nel baule, in tasca) riparte da solo.
- Un pezzo che aspetta il terreno sotto o lo scavo resta in salvia finché non tocca a lui.
- Sopra ogni cantiere aperto, anche fuori dalla vista, un'etichetta: **«Casetta 42% · Totò»** (o «tocca per lavorarci»).

### 2.10 Le postazioni (leggero)
Sulla carta di ogni postazione, sotto i materiali: **«12 ricette: piede di porco, …»** (le ricette di quel banco). Il pannello del banco
(menu Crafting) resta quello di oggi, che già dice serve/hai per ogni ricetta.

### 2.11 Telefono
- Il bottone apre la vista anche fuori da un campo. In alto le modalità **Pezzi / Terreno / Sotto / Distinta / Lavori**; in basso un
  foglio con le carte (o la distinta, o la coda); a destra bottoni tondi grandi: **↻ gira**, **✕ lascia**, **↶ annulla**.
- **Un dito**: con uno strumento posa (al rilascio; trascinando la fila o il pennello); senza strumento sposta la vista o prende un pezzo.
  **Due dita**: spostano, avvicinano (pizzico), girano (torsione); il primo dito non posa niente (si posa al rilascio).

### 2.12 Il costo (Iris Xe, telefono)
- **Otto disegni al massimo** per tutto il progetto: i pezzi fusi in **una geometria sola** (posizione, normale, colore del pezzo, la
  tinta dello stato, la quota della riga) disegnata **due volte** (solida sotto la riga, ologramma sopra: lo scarto è nel frammento),
  i contorni in **un** disegno di linee, le impronte a terra in **uno**, il terreno in **una** maglia, la sezione in **una** maglia più il velo, i picchetti del campo.
- Si rifà solo quando il progetto cambia (al più 8 volte al secondo mentre trascini); a ogni fotogramma cambia solo l'attributo della
  riga dei pezzi in corso.
- Le forme dei pezzi si fondono una volta per tipo (oltre 6000 triangoli: la scatola d'ingombro).
- La logica dei lavori gira una volta al secondo di gioco.

### 2.13 Un'alternativa (scartata)
Il progetto **a fantasmi veri**: ogni pezzo del progetto è il suo modello vero, trasparente, come la sagoma di oggi. Più bello da vicino,
ma un disegno per ogni pezzo di ogni modello (una casetta sono decine di disegni), il trasparente sopra il trasparente si legge male, e la
«riga che sale» chiederebbe un materiale per pezzo. Con la geometria fusa il costo resta fisso e il colore unico si legge meglio.

---

## 3. Il lavoro fatto

Tutto dietro `?progetto` (senza, il gioco è quello di prima più i guasti riparati della §1.1).

| file | cosa |
|---|---|
| `src/progetto.js` (nuovo, ~750 righe, in `TASS_FUORI`: non tocca la città) | lo stato `st.covo.plan`, il catalogo del progetto, le prove di posa, il terreno a vertici e le zolle, gli scavi e i collegamenti, annulla/rifai, la distinta, la coda e i turni della banda, la mano del giocatore, gli ologrammi fusi, il terreno che verrà, la sezione, il pannello, la camera, i gesti |
| `src/cantiere.js` | `canPlace` / `place` col livello del progetto (`lv0`, facoltativo: senza, come prima); gli agganci `EXT2.key` e `EXT2.button` (vuoti senza `?progetto`); esporta le funzioni che il progetto riusa (`snap`, `pay`, `missing`, `clearTiles`, `standAt`, `crewFree`, `bauleOf`, `hAt`, `wallModel`, `roofModel`, `totalOf`…). Più i guasti G1–G5 e il nome del campo |
| `src/main.js` | una riga: la camera segue `Progetto.focus()` (`null` senza `?progetto`) |
| `src/render.js` | `quoteNuove()` (rinfresca le quote lette dalla copia pigra QV2) e il guasto G6 in `dirtyAt`; niente altro |
| `src/index.src.html`, `build.py` | lo `<script>` di `progetto.js` dopo `cantiere.js`; `progetto.js` in `TASS_FUORI` |
| `src/test_progetto.js` (nuovo) | 49 prove in Node |

**Riuso, non doppioni.** I pezzi diventano veri con `Cantiere.place` (gli stessi modelli, le stesse caselle solide, gli stessi muri che
si uniscono); la roba si paga con `Cantiere.pay` e si conta con gli stessi conti (`missing`, `totalOf`: tasche, bauli, basi); lo sgombero
è `Cantiere.terrainDo`; gli scavi scrivono le stesse caselle di `livelli.js` (`ug`, `fl`, `kind`, i portali `botola`, gli `hooks.dug`
dei ritrovamenti); i turni della banda sono compiti di Risacca (`go` → `hold` → `do 'progLavoro'`) come i lavori del cantiere, e chi lavora
per il cantiere di prima non viene preso dal progetto (e viceversa).

**L'impronta dei tasselli.** `progetto.js` è fuori. Cambiano l'impronta `cantiere.js`, `main.js`, `render.js` (i guasti e gli agganci):
**l'impronta passa da `d4baafed84d73da1` a `2da2527279c3920b`**, i tasselli vanno ricotti.

### 3.1 Misure
(SwiftShader, 1024×576, `?leggera`: un fotogramma costa 1,5–13 s secondo il carico della macchina condivisa, quindi il tempo del
fotogramma **non** misura la vista.) Misurato dentro la vista:
- `sceneSync` della vista (processore, media mobile): 0,02 ms fuori dalla vista; 0,5–1 ms con 23 lavori nel progetto mentre si modifica;
  2,5 ms con i pezzi in corso nella prima versione → ridotto (la riga dei pezzi in corso 5 volte al secondo invece che a ogni fotogramma,
  la banda letta una volta per passo). **Da rimisurare** (lavoro fermato prima della passata finale).
- Geometria: 17 pezzi del progetto = 10 644 triangoli fusi (disegnati 2 volte), 180 segmenti di contorno; **3–8 disegni** in tutto.
- Iris Xe / telefono: non misurato su scheda vera.

### 3.2 Prove
- `node test_progetto.js`: **49 prove, tutte bene** — il progetto a tasche vuote, sovrapposizioni e fuori campo, la distinta (mattoni 0/20,
  manca 20), la fila di muri, annulla/rifai, gira; alza e abbassa (m³), le zolle, il terreno vero che non cambia finché è progetto; la coda
  (prima il terreno), la casetta che aspetta la roba, la banda che la paga quando comincia e la riempie a poco a poco (vista al 20%), il
  terreno che sale davvero (3,27 → 4,43 m), i muri veri; pozzo + galleria (la galleria da sola aspetta, col pozzo è collegata), 5/5 caselle
  scavate, la botola, la quota; la branda sotto terra che aspetta lo scavo e poi è vera; il tavolo fatto dal giocatore senza banda; il
  pezzo tolto che rende la roba; la roba che manca (il garage aspetta, la tenda passa avanti, riordino); il progetto dentro `st.covo.plan`.
- `node test_cantiere.js` (42 prove, con le nuove del Bunker e di Annulla), `node test_sottosuolo.js`, `node test_livelli.js`: bene.
- **Tutte le prove di `src/`**: falliscono solo quelle già note (tasselli 1, percorsi 1, strade_integre 1, costa2 1, tetti4 9, posa 6,
  imperfezioni 1, campagna 2, citta_viva 2, writing 1) più `test_fazioni` 1 («nessuno si chiama più lo Squalo») che **fallisce uguale
  su main** (provato su una copia di origin/main), `test_scontri` (a caso: su main ne falliscono 2) e `test_matti` (1 su tre passate, 0
  nelle altre due). Nessuna nuova.
- Fumo (`fumo6.js`): `errori []` sulla build di partenza; **da rifare sulla build finale** (lavoro fermato).



---

## 4. Come si gioca (con `?progetto`) — la versione semplice [cantiere2]

Aprire il gioco con `?progetto` (per esempio `index.html?progetto`). Senza, tutto è come prima. Tavola: `_immagini/progetto/semplice.jpg`.

1. **Entrare.** Fuori città (o sotto terra): **Y**, sul telefono il bottone *Cantiere del covo / Pianta un campo*. Se lì non hai un campo,
   sopra la barra compare *Pianta qui il campo*. La camera si stacca: trascina col dito (o tasto centrale, WASD) per guardare, due dita o
   rotella per lo zoom, destro trascinato / Q E per girare, T dall'alto ↔ di sbieco.
2. **Due strati.** In alto a sinistra **Sopra | Sotto** (Tab). Sotto, il mondo si vela e si vedono le gallerie come un plastico. Accanto, **↶** annulla
   (Ctrl+Z / Ctrl+Y).
3. **Uno strumento alla volta**, quattro bottoni in basso (1–3 sulla tastiera); le opzioni compaiono sopra la barra solo con lo strumento:
   - **Costruisci**: categoria e carta; poi la carta diventa una pillola (↻ gira, *Cambia*) e la mappa resta libera. Tocca dove metterlo;
     muri e recinti si trascinano in fila. Senza carta, tocca un pezzo del progetto: ↻ gira, gomma, trascinalo per spostarlo.
   - **Terreno**: **uno strumento, tre pennelli — Spiana, Alza, Scava** — e un cursore per la grandezza. Terreno e scavo sono la stessa cosa:
     - *Sopra*, **Spiana** porta tutto alla quota da dove parti, **Alza** porta terra (collinette, rialzi), **Scava** abbassa il suolo (al più
       60 cm). Si vede il contorno di quello che cambia: pieno dove si riporta, a puntini dove si scava, una curva ogni mezzo metro. Gli alberi
       toccati vanno via da soli (un'icona barrata, non si ricolora niente).
     - **Insistendo con Scava nello stesso punto** (o tenendo premuto) si buca: la casella sotto diventa un **blocco** da scavare, con
       l'**entrata** (la botola con la scala) se non tocca altri blocchi, e la vista passa da sola a *Sotto*.
     - *Sotto* si lavora **solo a blocchi**, come Minecraft: trascina il dito e traccia la strada davanti a te blocco per blocco (come una strada
       tra gli alberi), di qualunque forma e grandezza; **▲ Livello −1 ▼** (ogni livello 1,6 m più giù), pennello **1×1 / 3×3**, **Entrata**
       per aprirne un'altra. Le caselle vicine a livelli diversi si raccordano da sole (una rampa). Un blocco deve toccare un'entrata o una
       galleria già scavata. Tocca una stanza del progetto per sceglierla e dire il suo **rinforzo**: *Legno* (solo i puntelli), *Muri*,
       *Cemento* (senza stanza scelta il pulsante vale per i blocchi nuovi). Spiana e Alza riportano *Sopra*.
   - **Togli**: tocca o trascina su quello da togliere (pezzi, terreno, blocchi).
   - **Fatto**: i lavori partono e si esce (Invio). Mentre sei nella vista non comincia niente di nuovo (non si attacca una stanza a metà disegno).
4. **Leggere il progetto.** Tutto il progetto è dello stesso colore (cielo) col contorno netto. Il contorno dice lo stato: **cielo** in progetto,
   **ocra** (con il !) manca qualcosa — la roba o un collegamento —, **bianco** in corso. In corso l'ologramma si riempie: i pezzi dal basso,
   gli scavi casella per casella (prima terra viva, poi i telai di legno ogni 3 caselle, poi muri o cemento). Fatto: resta la cosa vera.
   Nessuna scritta sulla mappa: i perché stanno in una riga sopra la barra.
5. **La distinta** è il bottoncino in alto a destra (*4 lavori* e un pallino ocra se manca qualcosa): aperta dice serve/hai/manca, gli attrezzi,
   il tempo con la banda, *Avvia / Pausa*.
6. **I lavori.** La banda libera va ai cantieri a turni (prima il terreno, poi gli scavi a partire dall'entrata, poi i pezzi). La roba si paga
   quando il lavoro comincia (uno scavo: una trave ogni 3 caselle; muri 4 mattoni e 1 malta a casella; cemento 2 sacchi a casella).
   **Dare una mano**: fuori dalla vista tocca l'ologramma in corso; ci vai e, finché resti lì, lavori anche tu.

## 5. Punti deboli e domande aperte

**Punti deboli (onesti)**
- **Provato poco su schermo vero.** Qui il browser gira in SwiftShader: 3–6 s a fotogramma, una schermata 1–2 minuti. La logica è
  provata in Node (49 prove), la grafica e i gesti in poche passate guidate; il trascinamento lungo, il pizzico e la torsione al
  telefono, la sensazione della camera vanno provati su una scheda vera e su un telefono vero.
- **Le misure di costo sono di SwiftShader** (il fotogramma lì è dominato dal resto della scena): dicono che la vista non aggiunge
  niente di misurabile, non quanti ms costa su Iris Xe. Il conto dei disegni e dei triangoli è quello che conta (§3.1).
- **La camera è quella dell'editor** (`ui.focus` + la vista dall'alto di `ui.top`): funziona, ma la pendenza «di sbieco» non si
  regola e la distanza segue lo zoom del gioco; con la camera7 il passaggio dentro/fuori non è sfumato.
- **La sezione di sotto vela il mondo ma non lo taglia**: non c'è un vero piano di taglio nel terreno (servirebbe toccare render.js).
  Le gallerie vere si vedono entro 34 caselle dal centro della vista.
- **Gli scavi hanno il fondo piatto.** Una galleria prende la quota del cunicolo a cui si aggancia; per scendere di livello serve un
  pozzo nuovo (o J/K a mano). Mancano rampe e scale nel progetto.
- **I pezzi «in corso» non sono solidi** finché non sono finiti (la gente ci passa attraverso); il garage e le baracche diventano veri
  in un colpo alla fine (prima: l'ologramma che si riempie).
- **La banda non scende sotto terra**: per uno scavo il membro va sopra lo scavo e ci «lavora» da lì (come prima, ma almeno ci va).
- **La terra non è un materiale**: lo scavo non dà terra e il riporto non la chiede (si dice soltanto quanti m³).
- **Il cantiere di prima resta** (dentro casa, l'orto, le azioni sul posto): due modi di costruire convivono.

**Domande per te**
1. La vista deve **sostituire** il cantiere di prima all'aperto (come adesso con `?progetto`) o stare accanto (un tasto in più)?
2. **La roba**: si paga tutta quando il pezzo comincia (adesso), o a pezzi mentre si costruisce (più realistico, ma la distinta si legge peggio)?
3. **La terra** deve diventare un materiale (sacchi di terra da portare per i riporti, da buttare per gli scavi)?
4. **Il giocatore che lavora**: basta stare lì (adesso), o vuoi un gesto (tenere premuto, un'animazione col martello)?
5. **Al telefono** il bottone del cantiere compare solo dopo la prima base (orienta.js): con la vista progettuale va anticipato?
6. Il colore dell'ologramma: **cielo** (proposto) o un colore riservato nuovo da aggiungere alla Bibbia (il cielo c'è anche nel mondo)?

---

## 6. [cantiere2] La versione semplice (11 novembre)

Dopo la prima stesura il committente ha detto: i cinque livelli e la scritta a terra confondono; le piante da togliere ricolorate si
mescolano al terreno; troppe cose sullo schermo (al telefono occupano tantissimo); deve essere semplicissimo; lo scavo come Minecraft,
niente stanze fisse; e poi la precisazione: **terreno e scavo sono una cosa sola** (DECISIONI.md).

| prima | adesso |
|---|---|
| modalità Pezzi / Terreno / Sotto / Distinta / Lavori, sezione −3/−6/−9, legenda di 5 colori, riquadro delle scorciatoie | **Sopra \| Sotto** (un interruttore), **4 bottoni** (Costruisci, Terreno, Togli, Fatto), opzioni solo per lo strumento in mano |
| 6 pennelli del terreno + raggio + forza; ocra/cielo/salvia sul suolo, curve scure | **Spiana, Alza, Scava** + un cursore; il terreno che cambia è un **contorno di un colore** (pieno = riporto, puntini = scavo, una curva ogni 50 cm) |
| alberi da togliere tinti di salvia | un'**icona** piccola (alberello barrato), solo su alberi e sassi, messa da sola dal terreno e dai pezzi |
| ologramma in 5 tinte | **un colore** (cielo); lo stato è nel **contorno**: cielo, ocra (+ «!») manca qualcosa, bianco in corso |
| galleria, pozzo, cantina 4×2, stanza 3×3, sala 5×4, bunker 5×5 | **blocchi** dipinti a **livelli** (1,6 m l'uno), qualunque forma; l'entrata; Scava dalla superficie scende 60 cm, poi buca e passa sotto; i progetti vecchi si convertono |
| scavo armato tutto insieme | la banda scava **blocco per blocco** (terra viva, pareti storte: `kind` 18), **ogni 3 blocchi i puntelli** (i telai: `kind` 2), poi il **rinforzo della stanza**: legno (resta così), muri (`kind` 10, mattoni a volta), cemento (`kind` 6) |
| etichette «Casetta 42% · Totò» sulla mappa | niente scritte sulla mappa; il perché in una riga sopra la barra; nella vista spariscono anche joystick, nomi e fumetti |
| distinta sempre aperta a destra | un bottoncino «13 lavori ●» che si apre |

**Il codice.** Tutto in `src/progetto.js` (fuori dall'impronta dei tasselli: **l'impronta non cambia, `2da2527279c3920b`**); nessun altro file del
gioco toccato. Lo scavo scrive le caselle di `livelli.js` come prima (`ug`, `fl`, `kind`, la botola, `hooks.dug`); telai, muri e cemento li
disegna `render.js` da sé secondo il `kind` (nessun aggancio nuovo). Stato: `plan.cells` («tx,ty» → livello, quota, rinforzo, entrata, stato);
le stanze (blocchi collegati allo stesso livello) diventano lavori da sole. `plan.v = 2`: i progetti salvati con gli scavi a pezzi si convertono.
Le classi del pannello hanno il prefisso `pg-` (la `.bar` del gioco schiacciava la barra a 13 px).

**Prove.** `node test_progetto.js`: tutte bene (le prove di prima, riscritte quelle degli scavi, più: piante sotto il terreno, il pennello Scava
che scende al più di 60 cm e poi buca con l'entrata, la galleria storta a −1 isolata (ocra) e poi collegata, la stanza a elle a −2 che aspetta
la galleria, il rinforzo per stanza, la gomma, ridipingere a un altro livello, a metà terra viva davanti e puntelli dietro, il cemento dopo i
puntelli, travi una ogni 3 blocchi e cemento 2 a blocco pagati, la botola, il progetto vecchio convertito). `test_cantiere`, `test_sottosuolo`,
`test_livelli`: bene. Nel browser (SwiftShader, computer 1100×620 e telefono 390×844): la tavola `_immagini/progetto/semplice.jpg`.

**Punti deboli (cantiere2).** Un pavimento per casella (il motore di `livelli.js`): non si scavano due stanze una sopra l'altra nella stessa
casella; ridipingere a un altro livello sposta il blocco. Le rampe tra livelli sono il raccordo automatico del pavimento (niente scale
disegnate). Il pennello Scava sopra scende al più di 60 cm: per abbassare di più una collina si usa Spiana. Il plastico di sotto è disegnato
senza profondità (sopra il velo, in ordine): da molto di sbieco i pali possono passare davanti alle pareti sbagliate. La banda continua a
«scavare» stando sopra lo scavo. Nella vista non parte niente di nuovo finché non premi Fatto (voluto). Provato in SwiftShader: gesti veri
solo col mouse (tracciare due blocchi, scegliere una stanza) e i bottoni col dito; il dito che traccia e il pizzico al telefono vanno provati
su un telefono vero.

