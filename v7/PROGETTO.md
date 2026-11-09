# PROGETTO — il cantiere come progetto: la vista progettuale

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

<!-- DIAGNOSI -->

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
- **Sette disegni al massimo** per tutto il progetto: i pezzi fusi in **una geometria sola** (posizione, normale, colore del pezzo, la
  tinta dello stato, la quota della riga) disegnata **due volte** (solida sotto la riga, ologramma sopra: lo scarto è nel frammento),
  i contorni in **un** disegno di linee, il terreno in **una** maglia, la sezione in **una** maglia più il velo, i picchetti del campo.
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

<!-- FATTO -->

---

## 4. Come si gioca (con `?progetto`)

Aprire il gioco con `?progetto` nell'indirizzo (per esempio `index.html?progetto`). Senza, tutto è come prima.

1. **Fuori città**, dove vuoi la base: **Y** (sul telefono il bottone *Pianta un campo* / *Cantiere del covo*). Se non hai un campo,
   *Pianta qui il campo* in alto a sinistra. La camera sale e si stacca: **WASD** (o trascina col tasto centrale, o due dita) per
   guardare in giro, **rotella** / pizzico per lo zoom, **destro trascinato** / Q E / torsione per girare, **T** dall'alto ↔ di sbieco.
2. **Pezzi**: scegli una categoria e una carta (sotto ogni postazione: quante ricette ha e cosa fa). La sagoma segue il puntatore,
   bianca se ci sta, rosa se no (il perché accanto). **Clic** la mette nel progetto (non costa niente). I pezzi da una casella (muri,
   recinti, sacchi, tetti, pavimenti) si **trascinano in fila**. **R** gira (sul telefono ↻). Clic su un pezzo del progetto: *Gira,
   Sposta, Prima, Togli*; trascinandolo si sposta. **Ctrl+Z / Ctrl+Y** (o *Annulla / Rifai*).
3. **Terreno**: un pennello a sinistra (*Alza, Abbassa, Spiana, Liscia, Sgombra, Ripristina*), raggio e forza (o `[` `]`), poi
   trascina sul suolo. Vedi la superficie che verrà: ocra si scava, cielo si riporta, le righe ogni mezzo metro; in alto i metri cubi.
4. **Sotto**: *Sezione* vela il mondo e mostra le gallerie (piombo) e gli scavi del progetto alla profondità scelta (−3/−6/−9 m).
   *Pozzo con la scala* per scendere da sopra, *Galleria* trascinando, *Cantina/Stanza/Sala/Bunker* con un clic. Uno scavo deve
   toccare una galleria, un pozzo o un altro scavo collegato (se no aspetta, in salvia, e lo dice).
5. **Distinta** (a destra; sul telefono la scheda *Distinta*): serve / hai / manca per ogni materiale, gli attrezzi, chi lavora, quanto
   ci vuole. La roba conta tasche, bauli dei campi e scorte delle basi.
6. **Avvia i lavori** (o Invio). La coda (*Lavori*) va in ordine: terreno, scavi, pezzi. **↑** per anticipare, **◎** per andarci con la
   camera, *Pausa* per fermare. La banda libera ci va a turni; la roba si paga quando il pezzo comincia; se manca, il pezzo diventa
   ocra e si passa al prossimo, e riparte da solo quando la roba arriva.
7. **Guardare il cantiere**: l'ologramma si riempie dal basso (la parte fatta è solida, la riga chiara sale), il terreno sale o scende a
   passi, gli scavi si svuotano casella per casella. Fuori dalla vista, sopra ogni cantiere aperto: «Casetta 42% · Totò».
8. **Dare una mano**: esci dalla vista (Y), tocca l'ologramma in corso: ci vai e, finché resti lì, lavori anche tu (più svelto di un
   membro). Senza banda è l'unico modo.


---

## 5. Punti deboli e domande aperte

<!-- DEBOLI -->
