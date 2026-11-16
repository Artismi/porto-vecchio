# Bibbia del mondo: cosa succede a Porto Vecchio (11 novembre 2026)

Il verdetto della direzione artistica: «non ci siamo ancora del tutto: più varietà, complessità, coerenza, realismo e surrealismo,
comicità e complessità». L'architettura c'è (`vita.js`: il registro dei fatti; `iniziative.js`: gli atomi; `commedia.js`: la
regia). Mancava **la materia**: che cosa succede in questo paese, chi lo fa, perché, e con quali regole viene vario, coerente,
vero, strano e comico insieme.

Questo documento è scritto **per un generatore**: ogni voce è un dato (chi, quando, cosa produce, cosa lo innesca). Il prototipo
`giornata.js` lo usa (tre giorni, 40 abitanti e un gabbiano, Gazzetta stampata); le uscite stanno in `esempi/seme_1..3.txt`.
Le fonti, con i link, sono in `research_notes/contenuti/fonti_mondo.md`. Il tono resta quello di `TONO.md` (battute ≤ 70 caratteri,
chi parla si sputtana da solo, niente aforismi né giochi di parole) e il mondo quello di `MANIFESTO_NARRATIVO.md` e `citta.md`
(inverno 1986, l'isola sotto la Tutela, il Garante alle 20, la nave che arriva domani, Gavino mai invitato).

**Le tre leggi**, prese da Guareschi, Calvino e dal realismo magico:
1. **Il paese è il protagonista** (Amarcord): nessuna storia è di uno solo, ogni fatto ha un coro che lo commenta.
2. **Il motore sono le rivalità** (Don Camillo) e **i desideri piccoli e materiali** (Marcovaldo): la prima panca, la casa sul molo,
   il frigo della Cooperativa. Mai «salvare il mondo».
3. **Poche regole strane, mai spiegate, mai rotte** (Garcia Marquez, Calvino): il paese le tratta come il meteo. Solo il forestiero
   si stupisce, e alla terza volta smette.

---

## 1. Il modello dei fatti (lo stesso di `Vita.fatto`)

```
fatto = { id, g (giorno), fascia, tipo, chi:[id...], dati:{}, causa: id|null, hop, reg: R|A|S, sez, testo, voce:[chi, riga], breve,
          lite, succoso, oggetto }
```
- **causa**: il fatto che l'ha mosso. **Una causa nulla è ammessa solo per le radici** (§2: istituzioni, calendario, meteo,
  desideri dichiarati). Ogni altro fatto nasce da un *aggancio*: un fatto precedente che un operatore sa leggere.
- **reg**: R realistico, A assurdo (vero, ma esagerato: Benni), S surreale (una delle regole del §5). Bersaglio: circa 55 / 25 / 20.
- **breve**: il nome della cosa con l'articolo («il gatto pesato», «la guerra delle serrature»). Serve alle catene, al Tecnico, alla
  voce, ai sogni, a Bonaria: **ogni operatore può citare ogni fatto** (il richiamo è gratis).
- **lite**: conta per il campanile (§5). **succoso**: può diventare pettegolezzo. **oggetto**: la parola che il pettegolezzo storpia.

## 2. Il paese: cicli e istituzioni (le radici)

### 2.1 Il giorno (sei fasce)
| fascia | istituzione | cosa produce | ganci che lascia |
|---|---|---|---|
| alba | **il meteo** (maestrale, bonaccia, scirocco, nebbia) e la previsione sbagliata di Pasquale | `meteo` | tutto il giorno: barche, umore, nebbia |
| alba | **l'uscita delle barche**: con il maestrale no; con la nebbia solo Pasquale «a memoria»; il venerdì 17 solo il mangiapreti | `pescato` / `barche_ferme` | chi è in mare non è al bar; barche ferme = bar pieno = scopa e liti |
| alba | **la messa delle sette** | `messa` (nascosto) | la faida della prima panca |
| alba | **il mare restituisce**, **la statua guarda** (§5) | `restituzione`, `statua` | incontri forzati, il «segnato» del giorno |
| mattina | **il mercato del pesce**: un solo grossista (Cosimo); il prezzo segue i chili | `mercato` | prezzo basso = nemico comune; la faida della bilancia |
| mattina | **il Comune**: sportello annonario (il gabbiano), Anagrafe, Ufficio Sogni, ordinanze | `gabbiano`, `sogni`, `ordinanza` | le ordinanze diventano nemico comune |
| mezzogiorno | **la posta** (Elio legge le cartoline sul portone) | `cartolina` | il segreto diventa pubblico |
| pomeriggio | **il Bar Sport**: la scopa dei quattro vecchi, il Tecnico, le scommesse | `scopa`, `tecnico` | liti, voci |
| pomeriggio | **la cabina telefonica** (l'unica): la vita privata in coda | `cabina` | il paese sa tutto |
| sera | **il Garante alle 20** in tutti i bar | `garante` | la reazione allo schermo |
| sera | **le feste**: il falò, la partita | `falo`, `partita` | il paese radunato |
| notte | **il campanile** batte le liti; **i sogni** si formano dai fatti del giorno | `campanile`, sogni | scommesse, Ufficio Sogni, Lotto |

### 2.2 La settimana, la stagione, le generazioni
- **Settimana**: il Lotto del Garante (estrazione il giovedì sera); il Bollettino della Tutela il lunedì alle 9 (`popolo.js`); la
  messa grande la domenica; la partita di recupero; il venerdì 17 (si sta fermi).
- **Stagione (inverno)**: poco pesce e caro, mareggiate, Sant'Antonio Abate il 17 gennaio (falò e benedizione degli animali), la
  legna che non basta. In estate (da scrivere): i turisti, il fermo pesca di agosto, la processione a mare del patrono, gli
  emigrati che tornano con la macchina.
- **Generazioni**: chi è partito (il Belga, 22 anni in Belgio; il marito di Nives, Buenos Aires 1962), chi vuole partire (Dario,
  Stoccarda), chi resta e ricorda (zia Bonaria, il 1923), chi eredita (zio Raimondo, morto a 88 anni: la casa sul molo ai due
  cugini). Le cose passano di generazione: la casa, la panca, il bancone del '58, il cannolo del '71.

### 2.3 La scarsità (quello per cui si litiga)
Una cosa sola, contesa da due o più: **la casa sul molo** (eredità), **la prima panca** (dove arriva il calorifero), **la legna
del falò** (ne servono trenta fascine, se ne trovano dieci), **il compratore del pesce** (uno solo: monopsonio), **l'unico
telefono**, **l'unico pallone**, **il posto in Comune** (c'è, ma è di Ignazio), **la luce** (a sere alterne). La scarsità è il
motore realistico: ogni risorsa ha un «chi la tiene» e un «chi la vuole».

### 2.4 Gli effetti di secondo ordine (complessità)
Il generatore deve preferire le cause *indirette*. Esempi che il prototipo produce davvero:
- maestrale → barche ferme → pescatori al bar → scopa → lite → il campanile batte di più → il Delegato vieta le liti dopo le 22 →
  l'ordinanza è il nemico comune → due nemiche fanno la tregua (il rosario di protesta).
- il frigo della Cooperativa sul molo → il pesce si può tenere → Cosimo deve pagare di più → Cosimo denuncia il frigo per
  occupazione di suolo → la tassa → il lampione si spegne quando il frigo attacca → il molo al buio diventa il posto dei fidanzati.
- la scenata al mercato → il gabbiano ruba il grembiule a chi grida → il mare lo restituisce domani → lo trova la rivale.
- la lite del mattino → Michele, che pesca di notte e dorme di giorno, viene svegliato → scende in canottiera (il rumore ha costi).

## 3. Il cast: maschere, desideri, cose a cui tengono

Ogni abitante ha: **una maschera** (il vizio fisso: Bergson, il meccanico sul vivente), **un desiderio piccolo e materiale**,
**una cosa a cui tiene** (la presa per il giocatore: toccala e reagisce, come in Untitled Goose Game), **una gag ricorrente** a tre
tempi. Le coppie di rivali sono scritte (§4). Il prototipo li ha tutti in `CAST`.

| chi | maschera | vuole | tiene a | gag ricorrente |
|---|---|---|---|---|
| Don Ugo, parroco | Don Camillo (manesco) | la chiesa piena al falò | la statua di Sant'Antonio | benedice per soldi; minaccia con la scopa |
| Efisio Sanna «Tredici», Cooperativa | Peppone (mangiapreti) | il frigo nuovo | la barca «Tredici» | esce in mare il venerdì 17 per principio |
| Tore Fadda «Lampo», ex palombaro | il Capitano | essere il più coraggioso | il casco | si vanta, poi si corregge; non si tuffa mai |
| Antonio Carta «il Belga» | il forestiero | che si veda che ce l'ha fatta | la macchina (del cognato di Monique) | «in Belgio…»; si stupisce delle regole, poi smette |
| Nives Atzori, sarta | la Malinconica | una spiegazione dopo 22 anni | la macchina da cucire | risponde col secchio; ride una volta sola |
| Cosimo Cabras, grossista | Pantalone | la casa sul molo per metà prezzo | la cassa | conta la cassa quattro volte; è sempre il nemico comune |
| Assunta Pisano / Carmela Vacca | le pescivendole | vendere / smascherare | la bilancia / il gatto | il sale timbrato, il gatto pesato |
| Teresa Porcu / Iolanda Medda | le Devote | la prima panca | il termos / il rosario | arrivano sempre un'ora prima |
| Franco Pinna / Bruno Porcu, cugini | i Testardi | la casa di zio Raimondo | il trapano / la cazzuola | serrature, fotografie, il cane dello zio |
| Marco Pinna / Rita Porcu | gli Innamorati | l'altro | il motorino / il diario | i biglietti; li scoprono i padri |
| Lella Lai, cassiera | Colombina | andare a Cagliari | la cassa del bar | è l'unica che capisce tutto; vuole il tavolo vicino |
| Gino Lai, barista | l'oste | che il bar resti il centro | il cannolo in vetrina dal 1971 | il bancone del '58 |
| Aldo Melis, ragioniere | il Dottore (il Tecnico) | il falò più alto | la cartella del comitato | spiega ogni cosa con la causa sbagliata |
| Pina Murgia, tabaccaia | il coro | sapere prima | il libro della Smorfia | «non dico chi»; poi lo dice |
| Claudio Spanu, barbiere | il coro | una notizia in più del cliente | il rasoio | capisce male e lo dice a tutti |
| Ignazio Contu, Comune | Tartaglia | che tutto abbia il timbro | il timbro | «manca il certificato»; il posto è suo |
| Renato Floris, Delegato | il Podestà | essere salutato per primo | la fascia | ordinanze; scivola sulla triglia |
| Lino Saba, brigadiere | lo stanco | la pensione senza un verbale | il berretto | mezza multa a testa; arbitra guardando l'orologio |
| Mario Loi «Sciabica» | Brighella | il dieci per cento di tutto | il taccuino | «non chiedo: mi spetta»; i crediti col santo |
| Ciccio Puddu, garzone | Arlecchino | mangiare a pranzo | il vassoio | tre padroni, consegne scambiate; la terza volta cade in porto |
| Gavino Satta | il Non Invitato | essere invitato | la giacca buona | viene lo stesso; la terza volta lo invitano e non viene |
| zia Bonaria Olla, 94 anni | la Memoria | che nessuno le spieghi il passato | la dentiera | «nel '23 era uguale, ma con un mulo» |
| Pasquale Deiana | l'Oracolo | azzeccare il tempo una volta | il barometro | sbaglia sempre; quando azzecca non lo dice |
| Michele Boi, lampara | il Notturno | dormire di giorno | la lampara | lo svegliano le liti |
| Dario / Wanda Usai | il Partente / la Madre | Stoccarda / il posto in Comune | la radiolina / la pentola | «parti martedì, lunedì c'è il ragù» |
| Grazia Serra, maestra | la Pedante | che si scriva giusto | la penna rossa | corregge le ordinanze: cinque meno |
| Elio Ledda, postino | il Ficcanaso | leggere le cartoline | la borsa | legge «per controllare l'indirizzo» |
| i gemelli Cossu, 11 anni | gli Zanni piccoli | soldi per le figurine | la fionda | vendono tutto quello che il paese vuole guardare |
| Sergio, Fausto, Angelo, Pasquale | il tavolo della scopa | vincere prima di morire / il settebello / restare sveglio | il mazzo, il cappello, la sedia | il settebello nella calza |
| il Comandante, gabbiano | il Gabbiano | tutto | il tetto del Comune | residente dal 1979, tessera 41; ruba a chi grida |

**Cosa fanno quando nessuno guarda** (Johnson, West of Loathing): ogni maschera ha un'attività di fondo che il motore può mostrare
senza storia (Lampo lucida il casco, Ignazio timbra fogli bianchi, Pasquale guarda il barometro, Gavino si mette la giacca buona).

## 4. Le situazioni: una tassonomia di operatori combinabili

Ogni operatore è `{ id, reg, fasce, giorni, peso, max per giorno, cerca() → aggancio | null, fai(aggancio) → fatti }`. **`cerca`
legge solo fatti** (mai il caso puro): così ogni effetto ha una causa. I pesi decadono quando un operatore è già uscito oggi
(×0,35) e dopo tre volte nella partita (×0,5): è la difesa contro la farinata.

### 4.1 Realistiche (R) — la grana del paese
| operatore | innesco (aggancio) | effetto | Polti / Propp |
|---|---|---|---|
| **faida** (scala) | il fatto che l'ha accesa (testamento, mercato, messa, ritorno) | un gradino: frecciata → dispetto → dispetto pubblico → sfida → **tregua** se c'è un nemico comune → **ricaduta** | rivalità fra parenti; inimicizia di famiglie |
| **la voce esatta** | un fatto succoso | gira in 22 minuti; l'interessato lo sa per ultimo | — |
| **la cabina** | un desiderio (partire) o un segreto (la macchina non è sua) | la coda sente; il segreto diventa pubblico | smascheramento (Propp 28) |
| **la cartolina** | la posta | il passato ritorna (il marito di Buenos Aires) | ritrovamento di un perduto |
| **il consiglio del reduce** | chi vuole partire + chi è tornato | il reduce dice «vai» e «non ci torno per niente al mondo» | — |
| **la giocata** | un fatto qualunque | la Smorfia lo traduce in numero (il testamento = 48, il morto che parla) | — |
| **la scommessa** | una lite | si scommette sui colpi del campanile; si paga la mattina | — |
| **il dono che ripara** | una lite propria, o lo sguardo del santo | legna al falò «per farsi perdonare»; chiede la ricevuta | rimorso |
| **il brigadiere** | un'infrazione | fa il minimo: mezza multa a testa | — |
| **il disturbo** | una lite di mattina | chi dorme di giorno viene svegliato | — |
| **gli innamorati** | la faida dei padri | il biglietto via Colombina; la scoperta; i padri uniti contro i figli | amore impedito |
| **il falò, la benedizione, la partita** | il calendario | il paese radunato; il conto di quello che è successo | — |

### 4.2 Assurde (A) — vere, ma un gradino più in là (Benni, Rodari)
| operatore | innesco | effetto |
|---|---|---|
| **binomio fantastico** (Rodari) | una cosa nuova (il polpo di sei chili, la vincita, il cane dello zio) + un'istituzione lontana | l'abitante applica il verbo dell'istituzione alla cosa: la residenza al polpo, la benedizione ai soldi, la casa intestata al cane. Il **precedente surreale** lo rende normale («il gabbiano ce l'ha») |
| **errore creativo** (Rodari) | un fatto succoso con un *oggetto* | la voce cambia una lettera (casa → cassa, panca → banca, cartolina → carabina) e **il paese agisce sulla versione sbagliata** (Cosimo conta la cassa, il brigadiere cerca la carabina e si commuove) |
| **il Tecnico** (Benni + Qud) | la catena più lunga di oggi | la spiega con la causa sbagliata; la Gazzetta corregge fra parentesi con la causa vera |
| **il malinteso** | un fatto a due sensi | due parlano di cose diverse (il marito di Buenos Aires / il motore Buenos Aires) e agiscono tutti e due |
| **il lazzo** (commedia dell'arte) | un padrone che ordina | Ciccio porta la cosa giusta al posto sbagliato; la terza volta cade in porto |
| **il rovescio di status** | un'autorità in pubblico | il Delegato scivola sulla triglia; il mercato guarda altrove per sei minuti |
| **l'ordinanza** | un fatto che disturba il potere (il campanile a 17, il fumo, i gemelli) | una regola nuova, assurda e precisa; diventa nemico comune; la maestra la corregge |
| **la tregua** | due rivali + un nemico comune della categoria giusta | si alleano «per stavolta», litigano su chi ha firmato per primo |
| **l'ipotesi fantastica del giorno** (Rodari) | il calendario (una al giorno) | «il Comune ha finito i timbri» (si timbra con la patata), «la nave è arrivata davvero» (non c'era nessuno), «la luce tocca all'altra metà», «la posta la porta Ciccio», «è finito il sale» |
| **il dieci per cento** | ogni passaggio di soldi | Sciabica chiede la sua parte; la segna fra i crediti |
| **i gemelli** | quello che il paese vuole guardare | vendono i posti per il tuffo, contano le liti a 50 lire, lavano mezza macchina |

### 4.3 Surreali (S) — le regole del §5 viste in azione
`restituzione`, `non_restituito`, `campanile`, `statua`, `segnato`, `sogni`, `estrazione`, `eco`, `gabbiano`, `forestiero`.

### 4.4 Le faide scritte (scale a quattro gradini, tregua, ricaduta)
| faida | gradini | nemici comuni ammessi |
|---|---|---|
| Don Ugo / Efisio | il camioncino davanti alla chiesa · le campane sull'assemblea · il boicottaggio del falò · il braccio di ferro sul bancone | ordinanza sulle liti, tassa sul fumo |
| Franco / Bruno (cugini) | la guerra delle serrature · le due fotografie dello zio · il cane dello zio in piazza · la scenata sotto la casa | Cosimo che vuole la casa, **i figli innamorati**, l'ordinanza |
| Assunta / Carmela | lo sguardo sulla bilancia · il sale timbrato · il gatto pesato · il brigadiere sulla bilancia | i prezzi di Cosimo, l'ordinanza |
| Teresa / Iolanda | la panca alle sei · il termos · la notte sotto la panca · la messa in piedi | l'ordinanza, il chiasso in chiesa |
| Lampo / il Belga | il freddo · le cicatrici · la sfida del tuffo · il tuffo mancato (cade Ciccio) | l'ordinanza |

**Regola Guareschi**: la tregua arriva solo dal **terzo gradino** in su e solo contro un nemico **della categoria giusta** (una
tassa sul fumo non riconcilia i cugini). La ricaduta arriva almeno una fascia dopo la tregua, per una sciocchezza.

## 5. Le regole surreali di Porto Vecchio (poche, coerenti, mai spiegate)

| # | regola (come la direbbe uno del paese) | conseguenze realistiche | cosa non succede mai |
|---|---|---|---|
| 1 | **Il mare restituisce le cose perse.** All'alba, sulla spiaggia; chi le trova le riporta. | incontri forzati fra rivali (la chiave della casa riportata dal cugino «con due dita»); la lettera d'amore letta dal padre sbagliato; i gemelli che le rivendono («la regola dice di restituire, non dice gratis»); l'ordinanza che vuole il passaggio dal Comune | il mare **non** restituisce le cose **buttate** (le lettere del Belga: «allora non le volevi, il mare non è scemo»); non restituisce le cose rubate |
| 2 | **A mezzanotte il campanile batte un colpo in più per ogni lite del giorno.** | le scommesse al bar; l'ordinanza contro le liti dopo le 22; i gemelli che vendono il conteggio; Bachisio giura di non toccare la corda | il conto non sbaglia mai; nessuno chiede come fa |
| 3 | **All'alba la statua di Sant'Antonio guarda la casa di chi ieri ha fatto più chiasso.** | il «segnato» del giorno: regali, servito per primo, nessuno lo contraddice («due più due fa cinque: gli hanno dato ragione»); porta legna al falò; Gavino guardato è invitato a tutto | non guarda due giorni di fila la stessa casa; non si sposta mentre qualcuno guarda |
| 4 | **I sogni si denunciano all'Ufficio Sogni entro le dieci; il Lotto del Garante estrae sempre il più sognato.** | la Smorfia diventa un'istituzione; si gioca il numero dell'Ufficio; spesso non lo gioca nessuno («l'Ufficio apre alle nove, la ricevitoria chiude alle otto») | i sogni non si scelgono: vengono dai fatti del giorno (chi ha litigato sogna le botte, 38) |
| 5 | **Con la nebbia, al molo si risentono le frasi del giorno prima.** | il richiamo come meccanismo: la vanteria torna davanti a chi era presa in giro, la frase cattiva arriva all'interessato; «con la nebbia non vale» | ripete solo frasi dette davvero, solo di ieri, solo al molo |
| — | **Il Comandante**, gabbiano, è residente con la tessera annonaria n. 41 dal 1979. | ritira la razione; vota se c'è pareggio; ruba a chi grida e lascia cadere in mare (→ regola 1); è il primo alla benedizione; fa da precedente a ogni binomio («il gabbiano sì e il polpo no?») | non parla |

**Come si scrivono**: con la stessa voce di un orario dei treni. Il narratore non commenta, non stupisce, non spiega; le
conseguenze sono pratiche (soldi, file, moduli, imbarazzi). L'unico che chiede è **il forestiero** (il Belga, chi arriva):
riceve una risposta secca e pratica («Residente dal '79. Paga più tasse di te»). **La terza volta non chiede**: «ah, sarà per
ieri», e paga il caffè. Le regole valgono anche per il giocatore (perdi una cosa: domani torna; litighi: il campanile lo dice).

## 6. Gli operatori comici (procedure, non battute)

| operatore | procedura | tetto e limite |
|---|---|---|
| **escalation** | ogni ripresa di una faida sale di un gradino; il gradino dopo è sempre più pubblico e più concreto (dal guardare al pesare il gatto) | max 2 gradini per faida al giorno, mai in due fasce consecutive |
| **regola del tre** | la terza occorrenza di uno schema lo rovescia: Ciccio cade in porto; Gavino è invitato e non viene; il Belga smette di chiedere; Sergio vince a scopa; Sciabica ha in credito il santo | ogni gag ha esattamente tre tempi scritti |
| **richiamo (callback)** | qualunque operatore può citare un fatto passato per `breve`; meccanismi dedicati: la nebbia, Bonaria («nel '23»), il Tecnico, la Gazzetta che corregge | lo stesso fatto si richiama al massimo due volte |
| **deadpan** | la Gazzetta usa numeri, ore, chili, lire; nessun aggettivo di stupore; la gag sta nel dato («per sei minuti», «in monete da cinquanta») | mai «incredibilmente», mai punti esclamativi del narratore |
| **malinteso / errore** | una parola cambia (voce) o due referenti si confondono (malinteso): **l'azione sbagliata è la battuta**, non il gioco di parole | l'errore deve produrre un'azione visibile, se no si taglia (è un gioco di parole, vietato da TONO.md) |
| **rovescio di status** | l'autorità cade in pubblico, chi non conta viene onorato (il segnato, Gavino) | il paese reagisce con cortesia esagerata, non con scherno |
| **interferenza delle serie** (Bergson) / insalata (Rodari) | due catene si toccano su un oggetto: la sedia contesa finisce nel falò, il cane dello zio diventa una pratica in Comune, la lettera d'amore passa dal mare al padre | almeno una al giorno; il generatore le cerca apposta (oggetti in comune) |
| **priorità sbagliata** (TONO) | sotto pressione si difende la cosa piccola: «I caffè! Erano già pagati!», «Lì dentro c'è la mia infanzia! E il mio trapano!» | una per scena |
| **il forestiero** | l'occhio esterno nomina lo strano; il paese risponde piatto | tre volte, poi è del paese |
| **la tristezza accanto** (Disco Elysium) | una riga vera ogni tanto: la cartolina del 1962, le undici lettere legate con lo spago, «ventidue anni» sul biglietto | mai due di fila; mai spiegata |

## 7. Le regole di coerenza

1. **Ogni fatto ha una causa**, tranne le radici: istituzioni (meteo, pesca, mercato, Comune, posta, Garante, campanile, Lotto),
   calendario (festa, partita, testamento, ritorno), desideri dichiarati (Dario che telefona, il frigo che arriva). Il prototipo lo
   misura: «radici fuori dalle istituzioni: nessuna».
2. **Chi non c'è non agisce**: il Belga esiste da quando arriva; chi è in mare all'alba e al mercato non è al bar; un abitante fa
   una cosa sola per fascia.
3. **Le regole surreali non si rompono e non si spiegano.** Il mare non restituisce le cose buttate; il campanile non sbaglia il
   conto; la statua non guarda due volte la stessa casa.
4. **Le cose hanno un posto**: un oggetto perso è perso finché il mare non lo riporta; un oggetto bruciato nel falò non torna;
   il cannolo mangiato lascia il piattino vuoto con il cartellino.
5. **I soldi passano di mano davvero** (vincita, multa, tassa, decima): mai soldi dal nulla, mai cifre senza chi le paga.
6. **Le tregue hanno senso**: un nemico comune vale solo per le faide che tocca davvero.
7. **Il tempo è uno solo**: tre giorni, sei fasce; la nave arriva sempre domani; il venerdì 17 è il giorno di Sant'Antonio.
8. **Nessuno è cattivo davvero** e nessuno muore; niente religione presa in giro (si prende in giro il prete, non il santo),
   niente razza, niente disabilità; parolacce sì, bestemmie no (`TONO.md`).
9. **Ogni battuta ≤ 70 caratteri** (misurato) e mai la stessa struttura due volte vicine.

## 8. Il prototipo `giornata.js`

`node giornata.js 1` (Node, nessuna dipendenza, PRNG mulberry32 col seme). Simula mercoledì 15, giovedì 16 e venerdì 17 gennaio
1986: sei fasce al giorno, le istituzioni prima, poi da 1 a 4 operatori per fascia scelti a caso pesato fra quelli con un aggancio.
Per ogni seme cambiano: il meteo dei tre giorni, le tre ipotesi fantastiche, **gli archi del calendario** (eredità, ritorno del
Belga, frigo della Cooperativa, partita di recupero: almeno tre su quattro), l'ordine e la scelta degli operatori, chi trova cosa
sul mare, chi sogna cosa, i numeri del Lotto, le simpatie al voto. Stampa la Gazzetta per sezioni (In prima, Dal porto, Mercato,
Dal Comune, Dalla parrocchia, Cronaca, Restituiti dal mare, Al Bar Sport, Si dice, Ufficio Sogni, Lotto, Sant'Antonio, Il
campanile), con `[f12←f7·R]` dopo ogni fatto (il suo id, la causa, il registro), le tre catene più lunghe del giorno e le misure.

**Le misure sui tre semi salvati** (`esempi/seme_1..3.txt`):

| | seme 1 | seme 2 | seme 3 |
|---|---|---|---|
| fatti in Gazzetta | 79 | 79 | 78 |
| tipi di situazione distinti | 53 | 52 | 51 |
| ripetizione dei tipi (oltre il secondo) | 7,6% | 10,1% | 11,5% |
| frasi ripetute nella partita | 1,2% | 0,6% | 1,3% |
| realistico / assurdo / surreale | 56 / 27 / 18% | 62 / 22 / 16% | 55 / 24 / 21% |
| fatti con causa / radici fuori regola | 57 / 0 | 57 / 0 | 57 / 0 |
| catena più lunga | 7 | 9 | 7 |
| somiglianza fra giorni (Jaccard) | 0,21-0,43 | 0,30-0,34 | 0,31-0,41 |
| battute oltre 70 caratteri | 0 | 0 | 0 |

**Lettura da redattore (cosa è stato tagliato).** Nelle prime prove: la causa finta (la scopa «causata» dal commento di Bonaria),
il Garante che risponde a una frase che non aveva detto, il Belga al bar in un seme in cui non era mai tornato, Gavino «non invitato
a Ciccio caduto in porto», il campanile «gli altri 0 li conosciamo tutti», la statua che guardava la stessa casa due giorni, la
tregua dei cugini «contro la tassa sul fumo», il falò sempre «il più basso dal dopoguerra», tre sogni su quattro «a triglie in
faccia», «il bonaccia», «di la scopa». Ognuno è diventato una regola del §7 o un controllo nel codice.

**Il limite onesto.** Dentro una partita la ripetizione è bassa (circa 1% delle frasi); **fra un seme e l'altro circa il 37%
delle frasi è in comune**, perché il paese è lo stesso (come Marcovaldo: stessa famiglia, stagioni diverse) e ogni operatore ha
due o tre varianti scritte. La cura è quella di Johnson (quantità): portare ogni operatore a 6-8 varianti, aggiungere archi del
calendario (l'estate, il fermo pesca, la processione a mare, il funerale, il matrimonio, il concorso in Comune, la balena
spiaggiata) e far pescare a ogni seme un sottoinsieme diverso di faide (oggi sono sempre le stesse cinque).

**Come si innesta** (senza toccare il gioco, quando si vorrà): `fatto()` ha la stessa forma di `Vita.fatto(tipo, chi, dati,
causa)`; gli operatori sono della stessa famiglia degli estri di `iniziative.js` (verbo × oggetto × posto × motivo), ma con
`cerca()` che legge il registro dei fatti invece del caso; le regole surreali sono istituzioni come il Bollettino di `popolo.js`;
la Gazzetta è il formato naturale per il riassunto del giorno (il setaccio dei rapporti «NPC vivi senza IA»), per il diario e per
la voce di `commedia.js`.
