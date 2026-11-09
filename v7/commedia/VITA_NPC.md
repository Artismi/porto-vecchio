# La vita fra loro: gli NPC si parlano, si promettono, si danno, si rubano (proposta, 9 novembre)

La richiesta della direzione artistica:
«i personaggi npc devono interagire tra loro, le conversazioni hanno un senso, oltre ai loro impegni
prendono appuntamenti, e ci vanno per dire, se vogliono danno qualcosa a qualcun altro o rubano, fanno
quello che devono come se fossero veri».

E la correzione arrivata durante il lavoro:
«senza appesantire le cose, e come strato ulteriore sul lavoro che c'è che è già ricco di cose ed eventi,
ma vanno fusi in un'unica realtà vivente ancora più ricca e coerente».

Questo è solo un progetto: nessun file di `src/` è stato toccato.
Tutto quello che segue va in un file nuovo, **`src/vita.js`**, dietro `?commedia`. Spento il flag, il gioco
resta com'è oggi.

La tavola è in `_immagini/commedia/vita_npc_tavola.jpg`.

**In una riga.** Il motore fa già vivere gli abitanti fra loro: incontri, appuntamenti, patti, debiti, furti,
rancori, infamie. Però lo fa **in silenzio, o a monologhi**. Quello che manca non è una simulazione nuova:
è il **filo** che fa diventare ogni fatto di un sistema la causa di un altro, e che lo mette in **due bocche
che si parlano**.
La regola è quella di `PAROLA_AZIONE.md`: **prima il fatto, poi la parola**.

---

## 1. Cosa c'è oggi (audit)

### 1.1 La misura

La misura è headless: `?commedia` acceso, tutti i moduli di `test_commedia.js` più `parola.js`. Il giocatore
fa il giro di otto posti (piazza, calata, molo, bar, chiesa, mercato, fontana, osteria), 2 minuti reali in
ognuno. Lo script è nello scratchpad della sessione e diventa `src/test_vita_npc.js` al passo 1 del piano.

| | seme 1, 1 giorno | seme 2, 2 giorni |
|---|---|---|
| incontri fra abitanti (`Azioni.social`, in tutta la città) | 874 | 1.608 |
| appuntamenti fra NPC presi (`popolo.appoint`) | 38 | 81 |
| … mantenuti / buche | (quasi tutti per l'indomani) | ~31 / 5 |
| patti «te lo porto domani» (`scambi.promise`) | 31 | 66 (28 tenuti, 5 rotti) |
| vendite / svendite / baratti | 15 / 14 / 1 | 22 / 31 / 0 |
| aiuti chiesti e dati / «sulla parola» / debiti saldati | 0 / 0 / 0 | 1 / 0 / 0 |
| regali / prestiti fra NPC | 0 / 0 | 0 / 0 |
| furti fra abitanti / scassi (trame) / infamie | 0 / 1 / 0 | 0 / 0 (1 fallito) / 0 |
| liti / risse | 3 / 1 | 10 / 99 |
| promesse di `parola.js` fra due NPC | **0** | **0** |
| battute sentite dal giocatore (entro 26 m) | 223 | 341 |
| … «coppie» (B parla entro 6 s e 5 m da A) | 49 (13 di scena) | 63 (15 di scena) |
| … coppie in cui uno nomina l'altro | 1 | 0 |
| … coppie seguite da un fatto fra i due entro 3 minuti di gioco | **0** | **0** |
| battute che nominano un terzo assente (le voci) | 28 | 46 |

Le coppie fuori scena sono quasi tutte accostamenti a caso, dal registro della prova:
- «Alla Birreria ho fatto centro tre volte di fila.» || «Avevo un cane. Oppure ero il cane.»
- «Guardia: Può andare.» || «Ehi, Giuseppe.»
- «Ho famiglia!» || «Oggi alle 11:20 devo portare del pesce fresco a Anna.»

Il motore fa le cose; la strada non le dice. E quando le dice, non le dice all'altro.

### 1.2 Cosa esiste già, sistema per sistema (con le righe)

- **L'incontro nei posti**
  - `azioni.js:776 socialize`, ogni 15 minuti di gioco in tutta la città: sceglie un intento dal carattere e
    dalla relazione. Gli intenti sono chiacchiera, sfotti, apprezza, offri, gioca, litiga, spaccia, con il
    rancore (`tension`) fatto di nemici, buche e debiti con lo Squalo.
  - `azioni.js:732 social` applica l'effetto vero: simpatia, soldi del giro offerto, carte col baro,
    lite e rissa.
  - **Ma** A dice una frase sua (`chatLine`, la sua vita) o generica (`LINES`). B risponde solo nello sfottò
    fra amici (`:742`). Nessuna battuta nomina l'altro o il motivo.
  - Il verbo **`regala` c'è** (`:747`) **ma non ha peso** in `W` (`:787-795`): non esce mai.
- **Gli appuntamenti**
  - `popolo.js:873 appoint` e `:882 makeAppointments` (il 6% al giorno fra amici); `:1461 arrangeMeets`
    per i progetti (carte, ballo, conoscere qualcuno).
  - `convivenza.js:231 presence` segna chi è arrivato; `popolo.js:896 checkAppointments` scrive «visto Gino»
    o la buca nel diario.
  - **Ma** all'incontro nessuno dice niente (c'è solo il «Ciao Gino!» di `greetFriends`, `:1733`, se passano
    vicini). La buca resta una nota: alla volta dopo nessuno la rinfaccia.
  - `MEET` scatta solo se c'è un patto (`popolo.js:907`).
- **I patti, i debiti, gli aiuti**
  - `scambi.js:196 promise`: «Te lo porto domani a X», con un appuntamento vero.
  - `scambi.js:104 deal`: prezzo, baratto, «sulla parola», col debito `P.debiti`; `:228 askHelp` chiede
    aiuto prima a chi ti deve un favore; `:265 settle` paga i debiti alle 19.
  - **Ma** il debito si salda a distanza: i soldi si teletrasportano, senza incontro. `talk` (`:88`) fa
    parlare i due **nello stesso istante**. La promessa del patto non è una promessa di `parola.js`.
- **Il prestito**
  - `popolo.js:1330` (progetto «affitto»): «chiede un prestito a Gino». I soldi passano e la nota la scrive
    solo chi presta.
  - **Ma il debito non nasce** (`P.debiti` resta vuoto): il prestito non si rende mai e nessuno lo rinfaccia.
- **Fare insieme**
  - `convivenza.js:278 askFriends` + `:298 MEET`: «mi aiuti a sistemare la Vespa?». Un appuntamento vero,
    e il favore da ricambiare. Funziona: 67 note in 2 giorni. Resta muto.
- **Le cose vere dette per strada**
  - `convivenza.js:259 TALK`: «Stasera vedo Gino al bar», «Devo ancora 10.000 lire a Gino».
  - **Ma** è detto a chiunque passi, anche se Gino è lì davanti.
- **Le voci**
  - `popolo.js:1092 share` e `:1075 farTalk`: le memorie passano con la fiducia e si deformano.
  - `matti.js:198 voce`: il **frammento a due voci su un fatto vero** («l'ho visto io: …» «Quando?» …).
    È già il modello giusto. Lo usa solo la `FRAM`, una volta ogni 35–75 s (`matti.js:294-307`).
- **I furti**
  - `popolo.js:826 doGiro` (borsaiolo e ladro, lontano e a conti fatti), `azioni.js:673` scippo e borseggio
    veri, coi testimoni (`emitSeen`, `:812`).
  - `popolo.js:2083` la scoperta e la denuncia da lontano ai Grigi.
  - `popolo.js:1584 reflect`: «X è un ladro» → nemici.
  - **Ma** fra abitanti succedono di rado: 0 in tre giorni di prova. Il derubato non va mai a chiedere
    indietro niente.
- **Le trame**
  - `trame.js:148 slanderTrip`: l'infamia detta di persona al pettegolo. `:166 proposeAgguato`: il rancore
    diventa un agguato vero. `:58` lo scasso con palo e ricognizione.
  - **Ma** l'infamia non arriva mai a chi ne è vittima come accusa in faccia.
- **La regia del fumetto**
  - `commedia.js:518 PRIO`, `:545 classe`. Le righe della fila di `Matti` sono `fram`/`fram2`: la seconda
    voce esce solo se è uscita la prima.
  - Massimo 3 fumetti, le scene prima (`:569 faiPosto`, `:609`).
- **Le promesse**
  - `parola.js:715 nuovaPromessa`, `:1196 tick`. Il tipo `appt` si chiude già da solo con `ap.nCame`
    (`:1236`).
  - **Ma** `chiudi` e `conseguenze` (`:734`, `:749`) danno per scontato che uno dei due sia il giocatore
    («ha mantenuto la parola con Nino») e mandano gli aggiornamenti nella sua posta.
- **L'IA**
  - `mente.js:179`: `Azioni.CFG.talk` fa scrivere all'IA (o al Coro di notte) le due battute di
    `chiacchiera`/`sfotti`/`apprezza`.
  - **Ma** le parole non portano a niente e arrivano dopo la frase generica di A (`azioni.js:737-738`).

**Memoria.** C'è, ed è buona:
- il diario breve (`P.diary`, 30 voci);
- la memoria lunga coi tag che contano (furto, bidone, debito, favore…, `popolo.js:539`);
- `opinionOf` (`:571`), che decide già se uno ti vende (`scambi.js:110-111`) o ti saluta (`popolo.js:1725`);
- `recall` (`:562`).

Manca solo che la memoria **apra la bocca davanti alla persona giusta**.

### 1.3 In sintesi
| la richiesta | oggi |
|---|---|
| si parlano e ha un senso | si incontrano 800 volte al giorno, ma parla uno solo, e d'altro |
| prendono appuntamenti e ci vanno | sì (81 in 2 giorni, 31 mantenuti), ma muti; la buca non torna |
| danno qualcosa | vendono e barattano; regali 0 (il verbo c'è, il peso no) |
| prestano, restituiscono | prestito senza debito; i debiti si saldano a distanza |
| rubano | il motore sa farlo, ma fra abitanti succede di rado e il derubato non reagisce di persona |
| se lo ricordano | sì, nel diario; in faccia mai |

---

## 2. Mappa dei fili (niente simulazione nuova: si cuce)

`vita.js` non ha un suo mondo. Legge lo stato che c'è (`P.appt`, `P.debiti`, `n.mem`, `P.diary`, `rel`) e si
aggancia ai punti che i moduli espongono già. Fa tre cose sole:
1. mette **in due bocche** il fatto che un sistema ha appena deciso;
2. aggiunge il **pezzo di filo** che manca fra due sistemi;
3. registra la **promessa** in `parola.js` quando qualcuno l'ha sentita.

Per ogni sistema: cosa produce già → il filo che manca → come lo cuce `vita.js` (e da dove).

- **azioni.js `socialize/social`** → l'intento c'è, le battute no → `Azioni.CFG.talk` (aggancio esistente,
  in catena con la Mente) riceve `kind`, a e b. Se i due sono entro 26 m dal giocatore, `vita` scrive lo
  scambio dall'esito che `social` ha già applicato, e A non dice la sua frase generica (una riga, §8).
  Esempi: «offri» → «Questa la pago io.» «Allora prendo il doppio.»; «litiga» col motivo vero (la buca,
  il debito).
- **popolo.js appuntamenti** → l'incontro è muto, la buca non torna → il primo scambio prende
  l'appuntamento (se si sente); all'ora giusta l'arrivo si parla, con ritardo e attività. Alla prima
  occasione dopo una buca, la rinfaccia con la scusa (§4). Lo stato è `P.appt`/`ap.nCame`, da leggere e
  basta.
- **popolo.js prestito (PROJ.affitto)** → il prestito senza debito → `vita` avvolge
  `Popolo.PROJ.affitto.steps` (esportato) e al passo «chiede un prestito» scrive `P.debiti[chi presta]`
  con il perché e la scadenza.
  Da lì vivono `scambi.settle` e le battute.
- **scambi.js debiti, patti, aiuti** → saldi a distanza, battute simultanee, il patto che non è una promessa →
  - vicino al giocatore il saldo si fa **di persona** quando i due si incrociano (stessa formula di
    `settle`, `:270`), e lontano resta com'è;
  - i patti sentiti diventano promesse (`link appt`);
  - `talk` in fila: prima chi chiede, poi chi risponde.
- **scambi.js `deal` rifiuto** → «A te non vendo niente.» (`:111`) senza perché → lo scambio ha il perché
  dalla memoria: la buca, il furto, l'infamia creduta (§9, n. 12).
- **convivenza.js TALK** → «Stasera vedo Gino» detto al vento → `vita` mette in testa a `TALK` una funzione
  che, **se l'altro è lì**, glielo dice in faccia («Stasera alle otto, eh.» «Sì, mamma.»); altrimenti
  lascia passare.
- **convivenza.js askFriends/MEET** → «mi aiuti col trasloco?» deciso in silenzio → la domanda e il sì o il no
  diventano uno scambio, se si sentono. Esito e appuntamento li decide `askFriends`, come oggi.
- **matti.js FRAM + `voce`** → la fila a due voci, con un fatto vero solo nel 60% delle volte (`CFG.voce`) →
  **è il palco di `vita`**. Lo scambio va in `Matti.S(st).q` come un frammento, prende il posto del
  prossimo frammento inventato (`M.fram`) e non si aggiunge: un fatto vero vale più di una storia a caso.
- **commedia.js** → il ritmo e il massimo di 3 fumetti → nessun cambio: le righe di `M.q` sono `fram`/`fram2`.
  Le scene vicine le zittiscono, la seconda voce esce solo se è uscita la prima.
- **trame.js infamia, agguato** → l'accusa non arriva a chi è infamato; l'agguato non ha una premessa →
  quando il pettegolo creduto (`framedBy`) incrocia l'infamato, l'accusa diventa uno scambio. L'esito è
  la lite o la rissa di `Azioni.quarrel` (la formula di `heat` che c'è).
  Prima dell'agguato, la minaccia: «Stasera passi dalla calata?».
- **popolo.js/azioni.js furti** → il derubato non reagisce di persona → dalla memoria `furto` con l'autore
  noto, all'incontro: «ridammelo». L'esito dipende da `cor`, `legge` e dal testimone:
  - restituisce (soldi veri);
  - nega (lite);
  - rissa (`brawl`);
  - un Grigio entro 20 m: la denuncia (la stessa `addMemory` del poliziotto di `popolo.js:2090`).
- **ordine.js** → i Grigi sanno delle denunce da lontano → si chiama l'agente di persona, se c'è («Agente!
  È lui!»). Quello che fa l'agente lo decide `ordine`.
- **eventi.js** → scene scritte con attori a caso → nessun cambio adesso. Più avanti una scena può prendere
  gli attori da un conto aperto (`roles` col filtro «ha un debito con»): decisione 4.
- **coro.js, mente.js** → le caselle dal diario e le battute della notte → niente da fare: le note di `vita`
  passano da `Popolo.note`, quindi il Coro le legge già. Con l'IA (passo 8), il `kind:'chiacchiera'` riceve
  l'esito e il motivo, come `dialogo parola1`.
- **parola.js** → le promesse solo col giocatore → le promesse **fra due NPC sentite dal
  giocatore** (`fra:true`) usano lo stesso oggetto, lo stesso `tick`, gli stessi `link` (`appt`, `piano`)
  e il cane da guardia.
  Servono due righe (§8) perché `chiudi`/`conseguenze` non parlino di «Nino».
- **economia.js, soldi.js, oggetti** → soldi e roba veri → ogni passaggio usa `Scambi.put/take`,
  `P.money` e `Azioni.social('regala')`: nessun inventario nuovo.

**Lo stato nuovo è quasi niente**:
- `st.vita = { sentite: [id promessa…], ultima: {}, stats: {} }`;
- un campo `p.fra = true` sulle promesse;
- un `P.debiti[id].scad` sui prestiti.

Tutto il resto è stato che esiste già.

---

## 3. Lo scambio

Uno scambio è una conversazione di 2–6 battute fra due NPC, con **un intento**, **un esito deciso prima**
e **una conseguenza registrata**.

### 3.1 Da dove nasce l'intento (mai inventato da `vita`)
| intento | chi lo fa nascere (c'è già) | l'esito lo decide | la conseguenza (funzione che c'è) |
|---|---|---|---|
| saluto, chiacchiera | `socialize` (chiacchiera) | — | `share`: la voce passa |
| sfottò | `socialize` (sfotti) | `Rb.a > .4 && loq` (`azioni.js:742`) | `moveRel` / nota `offesa` |
| offre, gioca | `socialize` (offri, gioca) | `social` (soldi, baro) | soldi veri, nota |
| propone appuntamento | `makeAppointments`, `arrangeMeets`, `scambi.promise` | il loro `free()` | `appoint` + promesse `fra` |
| chiede favore | `askFriends`, `askHelp` | il loro `pYes` | `P.debiti` / nota `favore` / buca |
| chiede un prestito | `PROJ.affitto` passo 2 | `closeness`, soldi | soldi + **debito con scadenza** |
| restituisce | debito aperto e soldi > debito + 15 | `settle` (onestà) | saldo di persona, nota puntuale/tardi |
| rinfaccia | debito scaduto, buca recente | — | battuta; al secondo giro `friends` −1 |
| regala | surplus di A ∩ bisogni di B, `rel.a > .4`, `avid < .5` | `vita` (unica regola sua) | `Azioni.social('regala')`, debito di favore |
| pettegolezzo su un terzo | `matti.voce`, `share`, `slanderTrip` | fiducia (`belief`) | `addMemory` voce |
| accusa (furto, infamia) | memoria `furto` con autore, `framedBy` | `cor`, `legge`, testimone, Grigi | restituisce / lite / rissa / denuncia |
| minaccia | debito con la Famiglia, `proposeAgguato` | — | promessa «entro venerdì»; rotta → agguato |
| rompe | `reflect` toglie l'amico (`popolo.js:1584`) | — | battuta, poi non si salutano più |
| rifiuta di vendere | `deal`, `os < -.4` | — | la battuta col perché |

### 3.2 Il giro (dentro `vita.js`)
```
fatto deciso dal motore (social, appoint, settle, deal, furto, MEET…)
  └─ i due sono entro 26 m dal giocatore, fuori, svegli, non in scena?
       no  → niente battute (il fatto c'è lo stesso); al massimo una nota in più
       sì  → scegli le battute DALL'ESITO (banca per intento × esito × voce)
             → in fila in Matti.S(st).q come un frammento (A, B, A…), gap 2,7 s
             → se è un sì: promessa fra (parola.js), link al compito del motore
             → la conseguenza è già scritta dal motore; vita aggiunge solo il perché nel diario
```
- **Prima il fatto.** Il prestito è passato prima che Gino dica «Venerdì di quale anno?»; il rifiuto è già
  deciso quando Bonaria dice «Domani ho la schiena».
- **Il cane da guardia** (`Parola.promette`): una battuta di banca o dell'IA che dice «ci vengo», «te li
  porto», «va bene» senza una promessa `fra` accettata non esce.
- **Le voci** sono quelle di `azioni.js` (`G_ETA` 30: ragazzi o grandi), più Grigio, Famiglia e matto
  (i matti restano fuori dagli scambi: hanno la loro voce).
- **Le strutture** seguono `TONO.md`: l'amico che frega l'amico, la priorità sbagliata, il dettaglio fuori
  luogo, la risposta secca. Due scambi di fila mai con la stessa struttura; nessuna formula più di 3 volte.

### 3.3 Il ritmo
- Uno scambio prende il posto **del prossimo frammento** di `matti.js`: al massimo uno ogni 35–75 s, che si
  sente fra 2,5 e 11 m (le distanze della FRAM). Nessun fumetto in più di oggi: cambia il contenuto.
- `commedia.js` fa il resto: 3 fumetti al massimo, le scene prima, la seconda voce solo dopo la prima.
- Più lontano (11–26 m) solo il «gesto»: si girano l'uno verso l'altro, la stretta di mano di `greetFriends`
  o lo spintone. Il fatto succede, senza fumetto.
- Un fatto che il giocatore non sente, la volta dopo si può **raccontare** (la memoria del §6).

---

## 4. Gli appuntamenti

- **Si prendono** come oggi (`makeAppointments`, i progetti, i patti, `askFriends`). Se il giocatore è lì,
  si sente prenderli (§9, n. 1) e nascono **due promesse `fra`**, una per verso, col `link appt` all'oggetto
  di ognuno (`P.appt` e `twin`). `parola.tick` le chiude già da solo: `fatta` se `nCame`, `rotta` se no.
- **Ci vanno davvero**: è già un blocco della giornata (`planDay` dopo `appoint`, `popolo.js:879`).
- **L'incontro si vede** se il giocatore è entro 26 m dal posto, fra −20 e +50 minuti:
  - all'arrivo del secondo, uno scambio d'arrivo (puntuale, in ritardo con la scusa, «sei venuto davvero»);
  - poi la cosa per cui si erano visti, con un verbo vero: `social('gioca')` per le carte, `social('offri')`
    al bar, la consegna del patto (`scambi MEET`), il lavoro insieme (`convivenza MEET`).
- **La buca.** Chi ha aspettato la segna già (`bidone`). In più, `vita` la tiene come **conto aperto**,
  letto dal diario: niente stato nuovo.
  - Al primo incrocio, entro 3 giorni: lo scambio della buca, con la scusa che dipende da dov'era davvero
    (`P.yesterday`, la giornata vera: «ero alla Rocca», «mi hanno fermato», «dormivo»).
  - Se la scusa è vera (era in cella, era ferito), si chiude lì e l'opinione non scende.
  - Se no: −.08, e la seconda volta l'amicizia si rompe (la regola di `reflect`, `:1584`).
- **Il giocatore lo sa** solo se l'ha sentito prendere: la promessa compare in «Sentito dire» (§7).
  Se va all'osteria alle otto, li trova lì.

---

## 5. Dare, prestare, rubare (con roba e soldi veri)

- **Regalare.** È la sola regola nuova:
  - A ha in più quello che a B serve (`Scambi.surplus` ∩ `Scambi.wants`), `rel.a > .4`, `avid < .5`;
  - al massimo uno al giorno per persona.
  Si fa con `Azioni.social(st, a, b, 'regala', {oggetto})`, che esiste: l'oggetto passa davvero, simpatia
  +.25. B si segna un debito di favore piccolo (`P.debiti`, `why:'regalo'`): la volta dopo ricambia
  (`askHelp` lo cerca già per primo).
- **Prestare.** Il prestito di `PROJ.affitto` diventa un debito con scadenza (`P.debiti[x] = {v, t, why:
  'prestito', scad}`). Se si sente, nasce la promessa `fra` di chi deve.
  - **Restituire.** Lontano, `settle` come oggi. Vicino al giocatore, `settle` non tocca le coppie che sono
    entro 30 m l'una dall'altra (una riga, §8). Il saldo lo fa `vita` quando si incrociano: stessi soldi,
    stessa formula, con lo scambio.
  - Puntuale: nota buona. In ritardo: «paga, ma tardi», buona ma più debole. Mai: dopo 8 giorni la regola
    di `settle` (`:276`), più la battuta che lo rinfaccia.
- **Rubare.** Oggi fra abitanti è raro: 0 in tre giorni di prova.
  - Vicino al giocatore, al massimo **uno al giorno**, `vita` lascia partire lo scippo vero
    (`Azioni.intend(ladro, 'ruba', {modo:'scippo', chi})`) a chi ha il vizio o la fame
    (`legge < .4`, `soldi > .7`), con una vittima che ha soldi e nessun Grigio entro 25 m.
  - Il furto, i testimoni (`emitSeen`) e la fuga li fa `azioni.js`.
  - `vita` mette le battute del testimone e della vittima (§9, n. 7).
- **Scoprire e accusare.**
  - Dalla memoria: un `n.mem` di tipo furto con `actor` noto (visto, o creduto per voce o infamia) è un
    conto aperto.
  - All'incrocio con l'autore, lo scambio d'accusa. L'esito viene dal motore:
    - **restituisce** (soldi o roba veri) se ha poco coraggio (`cor < .4`) e c'è un testimone;
    - **nega** (`quarrel`) se no;
    - **rissa** se la `heat` di `quarrel` lo dice;
    - **i Grigi**: se un Grigio è entro 20 m e la vittima rispetta la legge (`legge > .45`), la denuncia.
  - Se l'accusa viene da un'infamia (`framedBy`) ed è falsa, l'accusato lo sa. Il giorno dopo va dal
    pettegolo («Chi te l'ha detto?»): il filo torna a `trame` come rancore vero.

---

## 6. La memoria nelle battute

Nessuna memoria nuova: si leggono le cose che ci sono già, **con la persona davanti**.

| c'è nel diario o in `P.debiti` | la battuta, se l'altro è lì | per quanto |
|---|---|---|
| un debito scaduto | «Mi devi ancora i dieci.» | finché non paga |
| una buca | «Ieri alle sette. Chi c'era? Io.» | 3 giorni, una volta |
| un favore ricevuto | «Ti devo la legna. Non me lo scordo.» | una volta |
| un furto con autore | «Il borsellino. Ridammelo.» | finché non si chiude |
| un'offesa (sfottò preso male) | gli tiene il muso: niente saluto, «Ah. Tu.» | 2 giorni |
| un patto tenuto | «Il pane di ieri era buono. Ne porti ancora?» | una volta |
| un'infamia creduta | «Lo sanno tutti cos'hai fatto alla Vespa.» | finché non si chiarisce |

Un conto aperto ha la precedenza su ogni altra cosa da dire fra quei due (`TALK.unshift`). Si dice una
volta sola per incontro e si segna nel diario («gliel'ha ricordato», `w .2`), così non lo ripete ogni 30 s.

---

## 7. Cosa vede il giocatore

- **Lo sente passando**: lo scambio, nella fila dei frammenti, entro 11 m. È la cosa principale.
- **Il Taccuino**: una sezione «**Sentito dire**» nella scheda «Parola data» di `parola.js` (si avvolge
  `Parola.taccuinoHtml`, esportato). Le ultime 10 promesse `fra` sentite, con lo stato:
  - «Mauro deve 10.000 lire a Gino, entro venerdì · scaduta»;
  - «Gino e Mauro, scopa all'Osteria alle 20 · ci sono andati».
  Così il giocatore **può andarci**. Si legge solo da lì: nessun avviso a schermo.
- **Il seguito si vede**: all'ora dell'appuntamento sono lì; il debitore evita il creditore (se lo vede
  entro 15 m cambia strada, `Azioni.intend` «evita»: passo 5); la vittima segue il ladro.
- **Il coro**: chi è chiacchierone lo racconta (le note vanno nel diario → `share` → «Hai sentito? Mauro non
  ha reso i soldi a Gino.»). La voce passa da `commedia §3`, al massimo una volta ogni 2 minuti.
- **In chat**: le note sono nel diario e la scheda per l'IA (`convivenza`, la «vita vera») le legge già.
  Se chiedi a Gino di Mauro, lo sa.

---

## 8. Prestazioni (Iris Xe, telefono)

- **Due livelli**, come `popolo.js`:
  - **per esteso** solo entro 26 m dal giocatore, e solo per i due dello scambio (battute, gesto,
    promessa `fra`);
  - **lontano** i motori di oggi fanno i loro conti come adesso, e `vita` non fa niente.
- **I costi**:
  - un controllo ogni 0,5 s reali sugli NPC entro 26 m (sul telefono sono al massimo 36);
  - una lettura dei conti aperti solo quando due si incrociano entro 4 m (lo fa già `greetFriends`, che
    `vita` riusa);
  - nessun percorso, nessuna grafica, nessuna chiamata all'IA in più (l'IA solo nel passo 8, dentro la
    chiamata `chiacchiera` che c'è).
- **Il tetto**: < 0,3 ms a fotogramma di media, < 1 ms nel caso peggiore, misurato nella prova con
  `process.hrtime` attorno al passo di `vita`.
  Per confronto, il passo intero della simulazione in Node è 2,9–4,3 ms.
- **La memoria**: le promesse `fra` sono al massimo 30 attive, potate prima di quelle del giocatore
  (una riga in `nuovaPromessa`, §10).

---

## 9. Dodici scambi (il fatto prima, la battuta dopo)

Ogni battuta sta sotto i 70 caratteri. Fra parentesi: l'intento, cosa ha deciso il motore e cosa resta.

**1. L'appuntamento preso** (Sbarra e Biscotto, alla rampa; `makeAppointments`, tutti e due liberi alle 19)
- Sbarra: «Stasera biliardo. Alle sette. Porta i soldi.»
- Biscotto: «Porto la stecca.»
- Sbarra: «La stecca non si beve, fra.»
- → `appoint` 19:00 alla Birreria; due promesse `fra`; nel Taccuino.

**2. L'appuntamento mantenuto** (19:04, Birreria; tutti e due `nCame`)
- Biscotto: «Le sette e quattro. Puntuale, eh?»
- Sbarra: «Sette e quattro è ritardo. Paghi il primo giro.»
- Biscotto: «Pago il primo. Il secondo lo perdi tu.»
- → promesse `fatta`; `social('offri')`, −2.000 a Biscotto; `social('gioca')`, la puntata vera.

**3. L'appuntamento bucato** (il giorno dopo, alla fontana; Biscotto non c'era, `P.yesterday`: a casa)
- Sbarra: «Ieri. Le sette. Biliardo. Chi c'era?»
- Biscotto: «Mia madre m'ha chiuso dentro.»
- Sbarra: «Hai ventitré anni.»
- Biscotto: «Ha la chiave lei.»
- → promessa di Biscotto `rotta`; opinione −.08. La seconda buca in 4 giorni toglie l'amico.

**4. Il regalo** (Ada, 70 anni, legna in più; Totò senza legna; `rel.a .5`)
- Ada: «Tieni la legna. Mi fa schifo vederti col cappotto in casa.»
- Totò: «Ada, sei una santa. Domani ti porto le uova.»
- Ada: «Le uova no, ho il colesterolo. Portami il giornale.»
- → la legna passa (`social('regala')`); Totò ha un debito di favore; promessa `fra` «il giornale, domani».

**5. Il prestito** (Mauro, soldi .8; Gino, 40.000 in tasca, amico; `PROJ.affitto` passo 2)
- Mauro: «Mi presti dieci? Venerdì te li rendo.»
- Gino: «Venerdì di quale anno?»
- Mauro: «Di questo. Forse.»
- → 10.000 passano davvero; `P.debiti[gino]` con scadenza venerdì; promessa `fra` di Mauro.

**6. Il prestito reso tardi** (lunedì, bar Sirena; Mauro ha la paga, è ancora in debito)
- Mauro: «Tieni. Dieci. Contali.»
- Gino: «Venerdì era tre giorni fa.»
- Mauro: «E sono venuto lo stesso. Rispetto, no?»
- → debito saldato di persona; promessa `fatta` (tardi); nota «paga, ma tardi».
  La prossima volta Gino presta, ma meno.

**7. Il furto visto** (17:40, mercato; Tore, `legge .2`, fame; Lina ha soldi; Rosa a 4 m, `emitSeen`)
- Rosa: «Lina! Quello t'ha preso il borsellino!»
- Lina: «Il mio? …Il MIO! Fermo, stronzo!»
- Tore: «Non mi avete visto!»
- → scippo vero (−8.000 a Lina); Rosa testimone «visto»; Lina gli corre dietro (`intend` insegue);
  Tore scappa a casa.

**8. L'accusa** (il giorno dopo, Tore entra al bar dov'è Lina; memoria `furto`, autore Tore)
- Lina: «Il borsellino. Ridammelo.»
- Tore: «Quale borsellino? Ho il mio.»
- Lina: «È il mio. C'è dentro la foto di mia madre.»
- Tore: «…Bella donna.»
- Lina: «Agente! È lui!»
- Grigio: «Documenti. Tutti e due. Così facciamo prima.»
- → `cor` di Tore .7, nessun ritorno; un Grigio a 12 m: denuncia (`addMemory` del poliziotto);
  la caccia la decide `ordine.js`.

**9. Il pettegolezzo che porta alla rissa** (Franca, `trame` infamia; Piero ci crede, `belief .7`)
- Franca: «Lo sai chi t'ha rigato la Vespa? Dario.»
- Piero: «Dario? Il mio testimone di nozze?»
- Franca: «Appunto. Sapeva dove la parcheggi.»
- …più tardi, Piero incrocia Dario in piazza:
- Piero: «La Vespa, Dario.»
- Dario: «Che Vespa?»
- Piero: «Brutta risposta.»
- → `quarrel` col motivo «la Vespa», `heat` .8 → `brawl` vero.
  Dario sa che è falso: il giorno dopo va da Franca, ed è un rancore nuovo per `trame`.

**10. Il favore negato** (`askFriends`: Totò trasloca sabato; Bonaria `avid .7`, `pYes` mancato)
- Totò: «Sabato mi aiuti col trasloco? Sono due piani.»
- Bonaria: «Sabato ho la schiena.»
- Totò: «E oggi?»
- Bonaria: «Oggi ce l'ho già.»
- → la nota «aiuto» negato (c'è già); Totò chiede al prossimo amico, che `askFriends` sceglie da solo.

**11. La minaccia** (Permesso della Famiglia; Aldo ha il debito con lo Squalo, `popolo.js:1052`)
- Permesso: «Lo Squalo chiede di te. Con affetto.»
- Aldo: «Venerdì. Giuro su mia madre.»
- Permesso: «Tua madre ce l'ha già giurato martedì.»
- → promessa `fra` (Aldo verso Sandro) «una parte entro venerdì». Se è rotta, `trame` ha il rancore per
  l'agguato.

**12. Il rancore che chiude il banco** (Pasquale pescatore; Aldo nel suo diario «non ha pagato le triglie»)
- Aldo: «Due triglie, Pasquale.»
- Pasquale: «Per te sono finite.»
- Aldo: «Ma le vedo!»
- Pasquale: «Le vedi tu. Per te sono finite.»
- → `deal` rifiuta (`os < -.4`, l'esito c'era già); Aldo va a comprarle in bottega (`commissioni`).
  Il pesce resta a Pasquale.

---

## 10. Come farlo (dietro `?commedia`, tutto in `src/vita.js`)

| passo | cosa | giorni |
|---|---|---|
| 1 | **L'ossatura.** `vita.js` (interruttore come `parola.js`), le agganci in catena (`HOOKS.step`, `Azioni.CFG.talk` dopo la Mente, `Po._.TALK.unshift`, `Po._.MEET`), il palco in `Matti.S(st).q`, `st.vita.stats`. La prova `test_vita_npc.js`, dallo script di misura di questo audit. | 1 |
| 2 | **Lo scambio.** Gli intenti del §3.1 letti dagli esiti che ci sono. Le banche per intento × esito × voce (circa 250 battute, nel tono, ≤ 70 caratteri, con lo script che le controlla). Il cane da guardia. | 2 |
| 3 | **Gli appuntamenti.** Promesse `fra` per quelli sentiti; l'arrivo e l'attività parlati; la buca rinfacciata con la scusa vera da `P.yesterday`. | 1,5 |
| 4 | **Dare e prestare.** Il debito del prestito (avvolgendo `Popolo.PROJ.affitto.steps`), il saldo di persona vicino al giocatore, il regalo con la regola del §5, il debito di favore. | 1,5 |
| 5 | **Rubare e accusare.** Lo scippo vicino (uno al giorno), i testimoni, l'accusa dalla memoria, l'esito (restituisce, nega, rissa, Grigi); l'infamia che torna indietro; il debitore che evita il creditore. | 2 |
| 6 | **La memoria in faccia.** I conti aperti del §6, una volta per incontro, segnati nel diario. | 1 |
| 7 | **Il giocatore.** «Sentito dire» nel Taccuino (avvolgendo `Parola.taccuinoHtml`), le voci nel coro (gratis), le catture prima e dopo. | 1 |
| 8 | **L'IA** (facoltativo). `chiacchiera` riceve intento, esito e conto aperto; la battuta dell'IA vale solo se corrisponde all'esito (stessa regola di `dialogo parola1`). | 1 |
| 9 | **Misura e taratura.** Due giorni a due semi; tavola prima e dopo. | 1,5 |
| | **Totale** | **12,5** |

**La prova (`test_vita_npc.js`), cosa deve dire dopo il passo 9** (stessi semi, stesso giro):
- coppie vicine al giocatore che nominano l'altro o il motivo: ≥ 60% (oggi 0–2%);
- coppie seguite da un fatto fra i due entro 3 minuti: ≥ 50% (oggi 0);
- per giorno, vicino al giocatore: almeno 1 appuntamento preso e sentito, 1 incontro visto, 1 regalo o
  prestito, 1 conto aperto rinfacciato;
- 0 battute «sì» senza promessa (il cane da guardia);
- fumetti vivi entro 26 m: mai più di 3; righe di fondo al minuto: non più di oggi;
- costo di `vita` < 0,3 ms a fotogramma di media;
- a flag spento, la misura identica a oggi.

**Le righe che aiuterebbero** (in file di altri, da chiedere a chi li tiene; senza, `vita` se la cava con un
giro più lungo):
1. `popolo.js:907`: chiamare `MEET` per **ogni** appuntamento, non solo `if (ap.deal)`. I gestori di
   `scambi` e `convivenza` controllano già `ap.deal` da soli. Senza questa riga, `vita` legge `apptArrived`
   per conto suo.
2. `azioni.js:737-738`: chiamare `CFG.talk` **prima** della frase di A, e saltarla se `talk` restituisce
   `true`. Senza, `vita` spegne il fumetto generico di A nello stesso fotogramma (`n.bark = null`).
3. `parola.js:734` e `:749`: in `chiudi`, `if (p.fra) muto = true`; in `conseguenze`,
   `if (p.fra) return Parola.EXT.fra && Parola.EXT.fra(st, p)`. Così niente «con Nino» e niente posta.
   E a `:2951` esportare `nuovaPromessa` e `chiudi` in `Parola._`.
4. `parola.js:718`: potare prima le promesse `fra` chiuse (tetto 30), mai quelle del giocatore.
5. `scambi.js:265` (`settle`): saltare le coppie entro 30 m dal giocatore, se `Vita.ON`. Si può fare anche
   da fuori, togliendo e ridando il debito attorno a `settle`: brutto, ma va.

---

## 11. Decisioni per Andrea

1. **Quanto spesso.** Uno scambio vero al posto del frammento inventato, uno ogni 35–75 s: va bene, o i
   frammenti scritti (matti, ragazzi) devono restare almeno la metà?
2. **I furti vicino al giocatore**: uno al giorno al massimo, fatto partire apposta se c'è il movente.
   È «come se fossero veri» o è regia? *Consiglio*: sì, ma solo con un movente vero (fame, vizio, debito).
3. **Il Taccuino «Sentito dire»**: lo vogliamo, o le cose sentite si devono ricordare a memoria, come per
   strada? *Consiglio*: sì, piccolo, solo quello che hai sentito tu.
4. **Le scene di `eventi.js` coi conti aperti** (il funerale della Fiat con la famiglia che ha davvero il
   debito): adesso o dopo? *Consiglio*: dopo il passo 9.
5. **Le cinque righe del §10** nei file degli altri: le chiedo io?
