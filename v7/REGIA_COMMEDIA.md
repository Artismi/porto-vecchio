# Porto Vecchio — Regia della commedia: analisi e proposta (8 novembre)

Prima consegna del direttore di comicità, NPC, dialoghi e scene. **Nessuna modifica al gioco**: è solo un documento. Le parti approvate andranno sotto `?commedia`, finché Andrea non dice che diventano il default.

Direzione di Andrea, 8 novembre: «più street, più GTA, più stand-up comedy; ironico, sfacciato, grezzo. Riferimenti: La Haine, i film, Fritz the Cat».

Analisi complete, con citazioni file:riga: `audit_testi.md`, `audit_sistemi.md` e la partita headless (catture in `_immagini/commedia/`).

---

## 1. Cosa c'è oggi

### Cosa fa ridere (da tenere e da prendere a modello)
Funziona la serietà totale davanti all'assurdo, e il regime sfottuto di lato:
- «Ho chiamato il bambino come il Garante… Così quando lo sgrido mi sento meglio.» (`matti.js:141`)
- «Nel '62 ho ballato col Garante. Pestava i piedi come governa.» (`matti.js:47`)
- «E questa cassetta? Battiato? Chi è, un sovversivo?» / «È di mia nonna. Lei è sovversiva. Io no.» (`eventi.js:406`)
- «Sergente Bocca, a rapporto. Ah già, Bocca è morto. A rapporto lo stesso.» (`matti.js:36`)
- «Rate da cinquecento lire per diciotto anni. Il niente non si svaluta.» (`matti.js:81`)
- «Applaudi, che ti guardano.» (`eventi.js:665`)

Anche il formato regge: 100 scene, 68 frammenti mescolati in un mazzo, 5 matti, 7 manie. I frammenti dei ragazzi chiudono un attimo prima della battuta finale: è il modello giusto.

### Cosa cade
- **Il tono è educato.** È surreale e garbato, da Amici miei, mentre la direzione adesso è street e sfacciata. Tutti i civili parlano con la stessa voce: Grigi, Famiglia, reduci, ragazzi e Marsigliesi non si distinguono.
- **Le barzellette.** Molti frammenti sono domanda e battuta finale: il marito andato a comprare le sigarette, il dentista, «tre chili e un amico».
- **Le battute spiegate**: il dinosauro, gli accendini, il lampione.
- **Le gag consumate**: «hai da accendere» 11 volte, «Bella» 17, «Fottiti» 14. Nei primi minuti arriva un «Piacere, X…» ogni mezzo minuto.
- **Il bug.** Le frasi comiche di combattimento non escono mai, perché `game.js:1529` e `game.js:1782` pescano solo le prime 4 della lista: «mia madre mi aspetta per pranzo», la baguette dei Marsigliesi. Escono invece «Uuh-ah! Carne fresca!» della tribù, uno stereotipo da togliere.
- **Le incoerenze col mondo**:
  - «Tu sei nuovo da queste parti», ma Nino è del posto;
  - Radio Scirocco, la radio clandestina, prende dediche al telefono;
  - il prete ha quattro nomi (Don Pietro, Suor Agata, Don Peppino, don Piero);
  - «Don Ciccio» è insieme il boss e un vecchio qualunque.

### Cosa confonde o non si legge (giocatore nuovo)
- **Il gergo mai presentato**: Garante, Grigi, Squalo, Tutela, Rocca, Bollettino, Orecchi, Zia, Ora Quieta, «rettificato». Per la polizia ci sono sei nomi diversi.
- **Il fumetto**:
  - testo a 13,5 px, nome di chi parla a **9 px**;
  - resta 3,2–4 s anche per frasi di 96 caratteri: 25–30 caratteri al secondo, contro i 15 leggibili;
  - nessun limite al numero di fumetti insieme;
  - nessuna regola per il telefono: a 360 px un fumetto occupa metà dello schermo;
  - nessuno storico di quello che hai sentito.
- **Il nome sopra il matto** è quello anagrafico, non «il Generale»: la gag non si aggancia. La battuta del «ritorno» richiama un incontro che 5 volte su 6 non hai visto.
- **Le visite.** `convivenza.js` ti manda qualcuno ogni 14–32 s e ignora il tono che ti hanno appena dato, così torna il difetto «hai sparato in strada… ti va una sigaretta?».

### I sistemi «sospesi» (scavare, base, crafting, banda, chat)
Non sono spenti: sono **caricati e funzionano nelle prove**. Sembrano fermi per cinque ragioni.
1. **Si nascondono.** La squadra e il cantiere compaiono solo dopo il primo membro o la prima base (`orienta.js:190`). Scavare sta in un tasto che non dice nessuno.
2. **La chat con l'IA vera non fa niente.** Il prompt del `dialogo` chiede `"azioni": []` e non elenca nessun verbo (`server.js:456`). L'NPC parla bene ma non agisce mai, e può promettere a vuoto.
3. **La chat senza chiave mente.** Sceglie la risposta *prima* di provare l'azione: «Fatto, vado.» e poi «Servono 2 di vernice». «vai alla calata» porta all'Osteria del Porto. «unisciti a noi» funziona al primo colpo con chiunque.
4. **La regia IA delle scene è stata cancellata il 29/10**: `regia.js` è stato riscritto per la camera. Il server la gestisce ancora (`kind:'regia'`).
5. **Non c'è il salvataggio.** Memorie, banda, basi e covo ripartono da zero a ogni ricarica: la storia che nasce dagli NPC muore lì.

Inoltre la base si vede poco: capanna e impalcatura sono scatole e i moduli non si vedono. La base ha due inventari separati: le scorte (`b.stock`) e il baule del cantiere.

---

## 2. La proposta: «la strada che si fa le sue battute»

### Le regole del tono (valgono anche per l'IA)
1. **Sfacciati, non crudeli.** Si sfotte chi comanda, chi si vende e chi si dà arie, e ci si sfotte tra amici. Non si ride di chi soffre davvero (i rettificati, la Battuta), né per razza, né del corpo dei deboli.
2. **Stand-up comedy: si osserva e ci si incazza.** La gente ti fa il pezzo: parte da una cosa piccola e vera (la rata, il modulo, la suocera, il Grigio) e la porta all'assurdo con logica ferrea. Si chiude sulla botta, senza spiegare.
3. **GTA: la vita degli altri ti passa davanti a volume alto.** Telefonate a metà, liti in pubblico, ammissioni che nessuno ha chiesto.
4. **La Haine: i ragazzi parlano tanto e non succede niente, finché succede.** Battute per ammazzare il tempo e paranoie sui Grigi, poi un attimo serio, e si riparte.
5. **Fritz the Cat: l'ipocrisia è sporca.** Il benpensante col vizio, il Grigio che fuma la roba sequestrata, la Zia che vende tutti. Il sesso solo per allusione: niente scene.
6. **Grezzo sì, sciatto no.** Parolacce sì (cazzo, stronzo, vaffanculo), bestemmie no. Al massimo 70 caratteri a fumetto. Una frase, una botta.
7. **Una voce per fazione** (sotto). Se una battuta potrebbe dirla chiunque, è da rifare.

### Le voci (con esempi nuovi)

**I ragazzi (il Disgelo, 15–26 anni): fra, zio, oi, bella; veloci, si sovrappongono, ti sfottono.**
- «Il Grigio m'ha chiesto i documenti. Gli ho dato lo scontrino del gelato. L'ha timbrato.»
- «Oi, bella giacca. Rubata? No? Allora è solo brutta.»
- «Mia madre dice che lo skate è da sovversivi. Mia madre ha firmato quaranta rate per un frullatore che non frulla.»
- «Ci hanno chiuso la rampa. Troviamo una scala. L'isola è tutta scale, zio. Non ce la fanno.»
- «Sono le tre e non è successo niente. Fra, è la cosa più pericolosa che ci sia successa oggi.»
- «Il Garante sta su ogni muro. Pure lui, a un certo punto, si sarà rotto il cazzo di guardarsi.»

**I Grigi: burocrati stanchi; la violenza come pratica d'ufficio.**
- «Circolare! …No, lei no. Lei stia ferma. Gli altri circolare.»
- «Io non picchio nessuno. Io compilo. Poi uno legge il modulo e picchia.»
- (alla radio) «Centrale, ho un sospetto. Sì. Ha una faccia. No, normale. Appunto, sospetto.»
- (sparatoria) «Mandate rinforzi! E un panino! Col prosciutto, stavolta!»
- (sparatoria) «Ogni colpo è un modulo, stronzo! Sei mesi di moduli!»

**La Famiglia e lo Squalo: cortesia da pranzo della domenica, minaccia sotto.**
- «Il pizzo non è una tassa. Con la tassa paghi e non ti succede niente. Col pizzo… paghi e non ti succede niente. Però noi siamo più simpatici.»
- «Lo Squalo non è arrabbiato con te, Nino. È deluso. Che è peggio: quando è deluso mangia, e quando mangia pensa.»
- «Stavo per spararti, poi mi ha chiamato mia moglie. Ringraziala. Anzi no: non la conosci, e così resta.»

**I reduci (Risacca vecchia): amari, beoni, teneri a tradimento.**
- «Noi avevamo i fucili e ci hanno sepolto. Voi avete le rotelle. Almeno scappate meglio.»
- «Nel '79 ho detto no. Una volta. Mi è bastata per tutta la vita. Offri tu.»
- «Non ti dico com'era prima. Era uguale, ma avevamo i denti.»

**I benpensanti a rate (il Miracolo): fieri della rata, terrorizzati dal resto.**
- «Trent'anni di cambiali per la berlina. Non la uso, se no si consuma.»
- «Mio figlio fa graffiti. Gli ho detto: almeno dipingi la nostra macchina, che è grigia uguale.»

**I Marsigliesi: metà francese, metà disprezzo turistico.**
- «Bella isola. Peccato per voi.»
- «Il caffè qui è una tragedia. La polizia pure. Però almeno la polizia è calda.»

**I passanti al telefono (GTA): solo la parte di uno.**
- «…mamma, non è un tatuaggio, è un'opinione. …Sì, è lavabile. …No, non è lavabile.»
- «…ti ho detto che la Fiat la riporto. …Mi guarda male. …La macchina, sì. …Lo so che è grigia.»
- «…non ho detto che ti amo. Ho detto "va bene". È diverso. …Allora ti amo. Contenta? …Pronto?»

### Il palcoscenico: le battute in fila (sistema, sotto `?commedia`)
- **Un'agenda unica** per tutto quello che viene detto al giocatore (eventi, matti, convivenza, frasi quando passi). Al massimo un «pezzo» rivolto a te ogni 40–60 s. Chi ti ha appena dato un tono serio non fa battute per 10 minuti, convivenza compresa.
- **Il fumetto leggibile**:
  - durata = 1,2 s + 1 s ogni 15 caratteri;
  - al massimo 3 fumetti a schermo, il più vicino davanti;
  - nome di chi parla a 12 px, col soprannome se è un matto;
  - sul telefono, larghezza al 42% e testo a 15 px.
- **Il registro delle frasi**: le ultime 20 cose sentite, con chi e dove (un tasto e una scheda del Taccuino).
- **Il glossario al primo incontro**: la prima volta che senti «Grigi», «Garante» o «Squalo», sotto il fumetto compare una riga piccola. Esempio: «i Grigi: la Guardia Insulare». Poi non più.
- **I pezzi**: un formato nuovo per gli sfoghi da stand-up, 3–5 battute della stessa persona rivolte a te, con la botta in fondo. Si scrivono come dati, come le scene.

---

## 3. Cinque scene messe in scena

**1. «Il posto di blocco» (pomeriggio, una strada col muro dipinto)**
- Due Grigi fermano un ragazzo con lo skate.
- Il ragazzo: «Ho solo la tavola.» Il Grigio: «Per legge, la tavola è un mezzo. Il mezzo ha il libretto?» Il ragazzo: «Ha le rotelle.»
- Il Grigio giovane prova la tavola «per verifica». Fa due metri e cade di culo.
- Silenzio. Il capannello trattiene la risata. Il Grigio anziano: «Nessuno ha visto niente.» Una vecchia: «Io sì, ed era bellissimo.»
- **Tu scegli**:
  - ridi: il Grigio se lo ricorda, rancore;
  - aiuti il Grigio: i ragazzi ti chiamano «sbirro» per un giorno;
  - ti prendi la tavola mentre guardano tutti: inseguimento.

**2. «Il funerale della Fiat» (mattina, sotto un condominio)**
- Il carro attrezzi del Banco viene a pignorare una 127 per le rate non pagate. La famiglia le fa il funerale: fiori sul cofano, la nonna che piange, un vicino che legge il libretto come un'orazione.
- «Era giovane. Sei anni. Non ha mai visto l'autostrada.»
- L'autista del carro aspetta col cappello in mano: «Condoglianze. Firmi qui.»
- Il figlio ragazzo, dietro: «Ma', era una merda di macchina.» Ceffone. «Era *nostra*, la merda.»
- **Tu**:
  - puoi offrire i soldi della rata: grande favore per la famiglia;
  - puoi distrarre l'autista mentre il figlio scappa con la macchina: un piccolo inseguimento comico.

**3. «Open mic al Circolo» (giovedì sera, dopo la tombola)**
- Un personaggio ricorrente nuovo, **Totò Microfono**, fa il pezzo sul Garante:
  - «Il Garante dice che l'ordine è una carezza. Mia moglie dice uguale. Poi chiude a chiave.»
  - «Ha fatto il discorso sull'onestà. In diretta. Con la parrucca.»
- Alle 20 si accende la TV del Garante: Totò cambia il pezzo a metà frase e continua lodando, ma ogni lode è un doppio senso. La Zia, in fondo, prende appunti.
- **Tu puoi**:
  - disturbare lo spettacolo: il pubblico ride di te o di lui, a seconda di cosa scegli;
  - salire tu sul palco: una frase da scegliere tra tre;
  - capire chi è l'Orecchio in sala: ce ne sono due, uno ride troppo.
- Totò torna ogni giovedì. Se la Zia lo vende, il giovedì dopo il palco è vuoto e c'è solo un microfono.

**4. «Fino al mattino» (notte, tre ragazzi del quartiere, il tuo giro)**
- È una camminata e parlata alla La Haine. I tre ti accompagnano dalla periferia al centro e prendono la strada lunga per evitare i Grigi.
- Parlano di niente: chi ha il motorino più lento, cosa farebbero col debito di Nino («Lo paghi in rate di ragazzi.»), se il Garante ha i piedi.
- A metà un'Alfetta passa piano. Silenzio. Nessuno respira. L'Alfetta va via.
- Uno: «Visto? Niente.» Un altro: «Fino a qui, niente.» Si riparte con le cazzate.
- A seconda di cosa hai fatto quel giorno, la sera dopo uno dei tre non c'è.

**5. «Lo Squalo al telefono» (cabina che squilla mentre passi)**
- Rispondi: è lo Squalo, che ti parla del debito. Ma è a casa, e la sua vita entra nella telefonata:
  - «Nino, il debito. Il deb… Amore, il sugo! Lo SENTO che si attacca!»
  - «Dov'ero? Sì. Le gambe. Te le spezzo. …No, non a te, amore, a Nino. Salutalo. Nino, ti saluta mia moglie.»
- In fondo un appuntamento vero (giorno, ora, luogo) che finisce nel Taccuino.
- La cabina richiama una volta a settimana: è il ritmo del debito, raccontato a voce.

---

## 4. Sistemi: cosa riaccendere, in che ordine (sotto `?commedia`)
1. **Correggere il bug delle frasi di combattimento** e togliere la tribù. È una riga.
2. **Il palcoscenico**: l'agenda unica, il fumetto leggibile, il registro e il glossario.
3. **Riscrivere i testi** nel tono nuovo: FRAM, le visite di convivenza, le chiacchiere di azioni.js, le frasi dei combattimenti, le battute dei matti. Il prete: un nome solo. Le scene usano il nome vero di chi recita.
4. **Prompt dell'IA**: le regole del tono qui sopra e le voci per fazione, in `server.js`, `api/_mente.js` e `risacca.js` (la chat Claude). Una cornice sola per il mondo.
5. **La chat fa quello che dice**:
   - con l'IA vera, il `dialogo` riceve i verbi che il motore sa fare e la storia della chat;
   - senza IA, la risposta si sceglie *dopo* aver provato l'azione («Mi servono due bombolette, le hai?»);
   - le parole chiave «partecipa», «portami X» e «pedina X»;
   - reclutare costa fiducia vera.
6. **Riportare la regia IA delle scene** in un file nuovo (`regia_scene.js`), recuperata dal 29/10.
7. **Il salvataggio minimo** (localStorage): banda, memorie del cast, basi, covo. Senza, niente archi narrativi.
8. **Base e scavo visibili**: dire al giocatore che esistono (orienta: la prima volta che entri in una base possibile). Unire scorte e baule.

I punti 1–5 sono il mio lavoro. Il 6 e il 7 toccano sistemi di nessun altro: li faccio se approvi. Per l'8, e per i segni veri sul muro, serve chi ha writing.js e strada_dipinta.js e i modelli.

---

## 5. Decisioni per Andrea
1. **Canone.** Il Manifesto (Impero, Battuta dei boschi 27 anni fa, miniera, debito 480.000) e la Bibbia delle missioni (Tutela dal '79, Garante, 1986, debito 500.000 nel codice) raccontano due mondi. Il codice segue la Bibbia. *Consiglio*: tenere la base della Bibbia (Tutela, Garante, Grigi, l'Impero come potenza del continente) e prendere dal Manifesto il Disgelo, i reduci e la satira dell'auto a rate. Scrivo io la cornice unica.
2. **Slang di oggi nel 1986?** (fra, zio, il drum, la siga) *Consiglio*: sì, è un mondo inventato. Fuori solo le parole tecnologiche.
3. **Quanto grezzo?** *Consiglio*: parolacce sì, bestemmie no, sesso solo per allusione, niente razza né disabilità.
4. **Ordine di lavoro.** Prima testi e fumetti (si vede subito), poi chat che agisce e salvataggio. Oppure al contrario?
5. **Battute dell'IA in strada senza filtri** (Coro e graffiti dell'IA sul muro). *Consiglio*: un filtro di parole e lunghezza prima che vadano in scena.
6. **Personaggi nuovi ricorrenti** (Totò Microfono, i tre ragazzi della scena 4, lo Squalo al telefono). Va bene allargare il cast?

---

## 6. Il volume (seconda passata, dopo «poca roba, ne voglio molta di più»)

Tutto in `v7/commedia/` (testi da approvare: il gioco non li carica). Ogni battuta sta sotto i 70 caratteri (controllato con uno script). Niente bestemmie, niente razza, niente battute sui rettificati.

| file | cosa | quanto |
|---|---|---|
| `scene.md` + `scene_dati.js` | scene nuove, già nel formato di `eventi.js`; 30 su 31 provate nel motore senza errori | **31 scene**: 13 con la folla, 8 con una scelta tua, 465 varianti di battuta |
| `ricorrenti.md` | personaggi fissi, con giro della settimana, storia in 4 passi su due settimane, reazioni al tuo tono, incontri fra loro | **15 schede (17 persone), 349 battute** |
| `battute.md` | quando passi (11 voci), reazioni a quello che fai (14 situazioni), combattimento, telefonate, frammenti, pezzi da stand-up, visite, la folla | **702 voci** |
| `citta.md` | Garante alle 20, radio, Radio Scirocco, altoparlanti, manifesti, biglietti, scritte, insegne, giornale, calendario della settimana, la folla senza pesare | **15 discorsi + 45 reazioni, 25 pubblicità, 10 pezzi radio, 25 annunci, 98 testi per i muri, 60 nomi, 45 titoli e annunci, 87 eventi** |

### Il meglio, per assaggio
- «Il segreto è il Lei. Quando passo al tu, sono già botte.» (Permesso, l'esattore della Famiglia)
- «Ti spezzo… No, amore, non a te. A Nino. Nino, ti saluta mia moglie.» (lo Squalo al telefono)
- «Il mio nome di battaglia era Fulmine. Adesso mi chiamano Sciatica.» (un reduce)
- «Ai miei tempi si moriva per un'idea. Voi morite a rate.» (un reduce)
- «Mio padre dice che il rap è rumore. Mio padre russa in do.» (un ragazzo)
- «Mia moglie dice che porto il lavoro a casa. Ho le transenne in cucina.» (un Grigio)
- «Abbiamo la lavastoviglie. Ci laviamo i piatti puliti. Non si sciupa.» (benpensante)
- «Scatta la mora. I morti la pagano doppia: hanno tempo.» (la multa al defunto)
- «Mi hanno chiesto i documenti. Ho fatto vedere una capra. È passata.» (Zio Tè, il beduino)
- Manifesto della Tutela: SE VEDI QUALCOSA, DI' QUALCUNO. Sotto, a spray: SE VEDI QUALCOSA, DI' QUALCOSA.
- Altoparlante: «Il cittadino che ha perso un guanto sinistro lo ritiri in caserma. Porti il destro, per il confronto.»
- Pubblicità della bambola Brava Bambina: «Tirale il filo: lei ti dice chi è stato. Pile non incluse. Il ricevitore sì.»
- Telefonata: «…Ti ricordi la cosa che abbiamo nascosto nel '79? …L'hanno trovata. …No, non il fucile. Il gatto. …Vivo. Incazzatissimo.»

### I personaggi fissi
Totò Microfono (il tipografo dei manifesti del Garante, che il giovedì li sfotte al Circolo) · Quelli della rampa (Sbarra, Biscotto, Rasoio) · lo Squalo al telefono · l'Agente Reperto (multa i baci, fuma quello che sequestra) · il Ragionier Telone (la Argenta a 60 rate che non guida mai) · Permesso (l'esattore troppo educato) · Mezzolitro (il reduce del '79) · la Cabala (il Totogarante: si scommette su quante volte dice «ordine») · il Dottor Vento (di giorno ripara le TV del Garante, di notte è Radio Scirocco) · Fratello Catalogo (predica il catalogo dell'Impero) · Lucien le Petit (il cuoco dei Marsigliesi) · il Caporale Sanremo (vuole fare il cantante, parla col cane) · Fulvio Taccuino (l'Orecchio che la Zia ignora da sette anni) · Pecorino (i messaggi di Malanotte nelle forme di formaggio) · Zio Tè (l'isola vista da fuori).

### Città piena senza pesare (sintesi di `citta.md` §9)
Le figure intere restano quelle di oggi (84 su Iris Xe, 36 sul telefono). La pienezza viene da cose che costano poco:
- i posti nella folla vanno prima agli eventi del calendario e a quello che vede la camera;
- capannelli fissi senza percorsi;
- code dove solo i primi sono figure vere;
- sagome dietro le tende accese, e alle 20 il bagliore grigio del Garante in tutte le finestre abitate;
- una folla di sagome oltre la nebbia, in uno o due disegni;
- il brusio della folla in proporzione alla gente vicina.

Pose nuove, oggetti in mano, bambini e sagome sono lavoro di chi ha i modelli: va chiesto a loro.

### Cosa serve al motore per far girare tutto questo
- **La scelta del giocatore** (`ask`): le 8 scene con scelta senza `ask` girano, ma senza i rami. Viene prima di tutto.
- Battute nuove per le scene: `memo` (ricordo), `rep`, `money`, `give`, `hunt`, `car` (passa l'Alfetta), `tv`, `window`. Filtri `prete`, `marsigliese`, `orecchio`. Posti `cabina`, `bar_tv`, `caserma`, `officina`.
- **Il salvataggio**, per le storie dei personaggi fissi su due settimane.
- L'agenda unica (§2), altrimenti questo volume si accavalla.

### Decisioni nuove
7. **La tribù diventa «la Comune»**: i fuggiti del '79 all'Isola Grande del Sud, una setta armata di assemblee, capre e paranoia («Assemblea! Votiamo! …Abbiamo votato: addosso!»). Va bene?
8. **Lo Squalo è Sandro Neri.** La Bibbia lo chiama «ex Squalo», il codice «lo Squalo»: ho seguito il codice.
9. **Radio Scirocco**: la voce è Vinile (nella Bibbia) o il Dottor Vento (nuovo)? Il pezzo di `citta.md` usa Vinile, la scheda dei ricorrenti il Dottor Vento.

---

## 7. La partita vera (headless, 8 novembre) — quello che si vede

Catture in `_immagini/commedia/`, registro delle frasi in `_immagini/commedia/lines_log.txt`. 396 secondi di gioco in Piazza San Rocco, senza forzare niente.

**Il problema numero uno è il rumore, non le battute.**
- **54 frasi al minuto** entro 26 m (una ogni 1,1 s); di solito 2-6 fumetti vivi insieme, fino a 11. 85 frasi su 356 restano meno del tempo per leggerle.
- **Le voci a cascata**: dopo una scritta tutta la piazza ripete lo stesso fumetto blu. «Hai sentito? Ada ha dipinto un muro!» 27 volte, «…Elisa…» 23. Di notte circa 25 in 40 s. Bug: «Tore ha picchiato Tore!» (`R_14_mendicante_0.jpg`).
- **Le frasi del lavoro a stampo** (`popolo.js:1885`): «Il padrone ci mette i piedi in testa.» 17 volte; «Al lavoro (commessa) oggi non finiva più.»; «Domani attacco alle 0.» detto da Suor Agata.
- **La grammatica degli oggetti**: «Mi serve sigarette», «Ti interessa bottiglia di vino?», «Mi serve qualcosa da mangiare, sai chi ce l'ha?» (16 volte).
- **Le scene affogano.** Le scene partono ogni ~80 s, ma a 17-38 m e quasi sempre fuori quadro; solo 7 battute di scena su 356 sono arrivate al giocatore. Gli attori interrompono la propria scena con le voci: Lina, a metà della lite di coppia: «Non chiamarmi amore!» → «Hai sentito? Ada ha dipinto un muro!» (`R_14_lite_coppia_0.jpg`). La battuta finale arriva senza la sua premessa (`R_14_scommessa_0.jpg`).
- **I matti perdono la voce**: il Generale chiede «Hai sentito il disco nuovo al juke-box?».
- **La notte è uguale al giorno**: alle 23 «Stamattina alla punta abboccavano».

**Il giocatore nuovo**
- All'inizio quattro avvisi insieme (`D_02_inizio.jpg`); per il primo minuto, fermo, nessun fumetto in quadro (`N_primo_minuto_fermo.jpg`).
- L'obiettivo «Trova Lupo» cambia posto cinque volte (Biblioteca, Stazione, Condominio Aurora, Osteria…).
- Su ogni persona il bottone rosso **«TIENI E Scippa X»** è la cosa più vistosa; in piazza tre comandi insieme («Ruba il gozzo di Mirella», `15_giro_2.jpg`).
- La chat senza IA è onesta ma vuota («Non è il posto per certi discorsi.»), e i suggerimenti («Ti unisci alla Risacca?») presuppongono che tu sappia cos'è (`06_chat_risposta.jpg`). Il menu «Altre domande» si disegna sopra i comandi (`08_dialogo_classico.jpg`).
- Il nome di chi parla (9 px grigio) finisce sotto le etichette «▸ Casa Porcu»; i fumetti al bordo si tagliano. Sul telefono il testo si legge, il nome no (`P_04_matto.jpg`).

**Quindi, prima di aggiungere le 1.500 battute nuove** (sotto `?commedia`):
1. **Il volume giù**: le chiacchiere di fondo diventano rare e sottovoce (fumetto piccolo e trasparente, o solo un «…»), una voce la ripete al massimo uno ogni tanto, mai uguale; la frase del lavoro a stampo sparisce.
2. **Il palcoscenico**: chi recita una scena non dice altro; durante una scena vicina il resto tace; le scene partono **in quadro**, a 8-20 m, davanti alla camera; la premessa resta finché non arriva la battuta.
3. **Il fumetto** (§2): durata secondo la lunghezza, massimo 3, nome leggibile sopra le etichette, mai tagliato al bordo.
4. **Grammatica degli oggetti**: articoli giusti («delle sigarette», «una bottiglia di vino»).
5. **La notte ha le sue frasi** e i matti tengono la loro voce.
6. Il bottone «Scippa» meno vistoso finché non hai fatto un furto (da decidere con chi tiene l'interfaccia).
