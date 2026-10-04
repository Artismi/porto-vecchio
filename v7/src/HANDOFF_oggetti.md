# HANDOFF — Gli oggetti (4 ottobre 2026)

Un solo catalogo per tutto quello che si tocca. Prima c'erano tre liste astratte (merci di `economia.js`, `Azioni.ITEMS`, risorse della Risacca tipo «materiali»): adesso sono oggetti veri con prezzo e peso.

## File
- `src/oggetti.js`: la logica. Va caricato **dopo `soldi.js`**: in `index.src.html` viene subito dopo fazioni.js → soldi.js.
- `src/oggetti_ui.js`: l'interfaccia (zaino, banco della bottega, banco di lavoro, frugare, scambio) e i modelli 3D procedurali delle postazioni `st_*`. Va dopo `soldi_ui.js`.
- `src/test_oggetti.js`: `node test_oggetti.js [giorni] [seme]`. Fa controlli statici su ricette, botteghe e bottino, simula le giornate e prova il giocatore.
- Backup dei file toccati prima delle modifiche: `v7/_backup_oggetti/`.

## Cosa c'è
- **CATALOGO** (374 oggetti, in gruppi; il 4/10 sera aggiunti cibo d'inverno, roba del regime come tessere annonarie e razioni, bici e pezzi, contrabbando, rottami da recuperare): cibo, bevande, dispensa, combustibili, edilizia, ferramenta, attrezzi (con usura), elettrico e radio, stampa, medicine, igiene, vestiti, arredi e postazioni portatili, armi, valori, rottami. Gli id vecchi restano uguali (pane, ferro, piede, carta…).
- **BOTTEGHE** (`SHOPLIST`): ogni negozio vende la sua roba. Il mercato nero (magazzino) compra e vende anche la roba che scotta. Il bancone compra a metà prezzo quello che vende.
- **POSTAZIONI**: forgia, saldatrice, banco da lavoro, banco del falegname, banco del macellaio, forno, cucina, acqua, macchina da cucire, ciclostile, banco radio, camera oscura, tavolo medico, alambicco, stufa, botti, linea delle conserve. Stanno negli interni come mobili veri (`Interior.EXTRA`), oppure nelle basi tramite moduli e oggetti posati. Il fornello da campo, se ce l'hai nello zaino, fa da cucina ovunque.
- **RICETTE** (142), di quattro tipi:
  - cucina;
  - fabbricare;
  - smontare (radio rotte, televisori, elettrodomestici, mobili, pezzi d'auto);
  - raccogliere (pesca, legna, sabbia, cava, miniera, orto, uva, olive, ovile, sale, acqua).
  Alcune si fanno ovunque, altre solo alla postazione giusta e con gli attrezzi giusti. Il tempo passa davvero. Gli attrezzi si consumano e si rompono.
- **PRODUZIONE DEGLI ABITANTI**:
  - `JOBPROD` dice quali ricette fa ogni mestiere. Ogni ora sceglie la ricetta i cui prodotti mancano di più in giro.
  - `supply` porta gli ingredienti ai laboratori: da chi li produce o, all'ingrosso, dalle botteghe.
  - La nave porta le materie prime importate (`shipInputs`).
  - Le case comprano legna, carbone, sapone, candele, vestiti e attrezzi (`householdDay`, una spesa per casa).
  - Il protagonista, quando fa il turno di lavoro, produce come gli altri.
- **MESTIERI NUOVI**: minatore (miniera → carbone) e carbonaio (carbonaia → carbone di legna).
- **FRUGARE**:
  - In casa: dispense, cassetti, frigo, armadi, comodini, letti (i soldi sotto il materasso sono quelli veri degli abitanti).
  - Nelle botteghe si ruba dalle scorte vere e dalla cassa vera (`soldi.js`).
  - Casseforti, rastrelliere e registratori di cassa sono chiusi: servono grimaldello, piede di porco o trapano.
  - All'aperto si fruga in discarica, ruderi, cantiere, molo, calata, spiaggia, stazioni, miniera, campeggi e bivacchi; i posti si ricaricano coi giorni.
  - Chi è in casa o in bottega può vederti o sentirti. Ne restano evento `furto`, memoria e grida.
- **SCAMBIO** con chiunque: roba e lire sul piatto. Accetta se gli conviene, e conta quanto si fida di te. Chi rispetta la legge rifiuta la roba illegale.
- **COSTRUIRE** (Risacca): strutture e moduli si pagano in oggetti (`BUILD`), non più in lire + «materiali». Le risorse astratte della banda sono diventate **categorie** (`RS.EXT.resTotal`, `resTake`, `concrete`). Quello che arriva in astratto (un furto di «materiali») diventa roba vera.
- **PESO**: si portano 30 kg, 50 con lo zaino militare, molto di più con la carriola in mano. Oltre il limite si cammina piano (`p.loadK` in `game.js`).
- **SETE**: `st.me.need.sete` sale col tempo e le bevande la abbassano. Il calore è solo un valore (`st.ogg.calore`), pronto per il sistema del freddo.


## Luoghi di lavoro e di scambio (4/10 sera)
- `luoghi(st)`: ogni bottega, laboratorio, campo e bancarella ha un **bancone** (chi vende) e delle **postazioni** (forgia, forno, banco del falegname…), definite per tipo di posto in `LUOGO_ST`, non dai mobili.
- Ogni lavoratore ha `n.pop.post` = `{ k, i }`: `i = -1` bancone, `i ≥ 0` postazione, `-2` un punto fisso all'aperto. **All'aperto** sta davvero al suo posto quando è di turno (`postsStep`).
- **Interni**: non li tocco (li fa un altro agente). Le coordinate dei posti al chiuso le prendo dai mobili che ci sono (`pv_banco_vendita`, `pv_banco_lavoro`, `kitchenStove`…), se mancano dalla stanza d'ingresso. Per disegnare i lavoratori dentro: `Oggetti.staffIndoor(st, bi)` → `[{ id, name, x, y, f, face, post }]`.
- Il bancone è aperto se c'è qualcuno di turno (`clerk`, `isOpen`). Il mercato è aperto mercoledì e sabato. Chiuso: non si compra né si vende, ma gli scaffali si possono svuotare.
- Usare la postazione di un altro: se c'è qualcuno si paga l'uso alla cassa; se non c'è nessuno si lavora di nascosto e si rischia di essere scoperti. Il proprio posto di lavoro è gratis.
- Botteghe nuove: bancarella del pesce al molo (la riforniscono i pescatori), beduini, villaggio.

## Bottino (4/10 sera)
- **Rarità** comune, buono, raro, prezioso (colori nel pannello; «Trovato: …» nel feed per raro e prezioso).
- **Roba sparsa**: circa 290 nascondigli a caso su tutta l'isola (cestini, vicoli, rottami, boschi, spiagge, prateria, dintorni delle caserme, tetti). Si ricaricano in 2-5 giorni. Si vedono passandoci a meno di 2 m; «Cerca qui intorno» (10 minuti) dice dove guardare. I **tetti** sono pronti ma si raggiungono solo quando il motore farà salire sui tetti (`p.roof`/`p.onRoof` o `Livelli.onRoof`).
- **Mobili delle case** (divano, tavolino, mobile tv, attaccapanni, vaso, letto): soldi nascosti veri degli abitanti, sigarette, cassette, vestiti.
- **Corpi e chi è a terra**: le tasche vere (portafoglio, arma, oggetti). Chi era solo stordito se lo ricorda.
- **Bagagliai** delle auto parcheggiate (grimaldello o piede di porco): da lavoro, privati, del regime.
- **Casse di carico** alla calata, al molo cargo e al pontile: arrivano con la nave, piede di porco, ti vede chi passa.
- **Borseggio**: da dietro e chinato va meglio; se ti becca è uno scippo con testimoni.

## Tasti
- `Z` zaino.
- `K` banco di lavoro (quello che puoi fare qui).
- Dal menu QUI, ADESSO: «Fruga: …», «Lavora qui (…)», «Scambia con …». «Al banco: …» (`soldi.js`) apre il bancone nuovo.

## Modifiche ad altri file (segnate [oggetti])
- `interiors.js`:
  - `EXTRA` (nomi stanze, mobili, mobili in testa, ingombri, tipo edificio);
  - stanze nuove: forgia, laboratorio, macello, retro radio, cantina;
  - **coordinato con la chat mappa/grafica**: uso i loro `pv_banco_lavoro`/`pv_ponte` come banco da lavoro, `pv_attrezzi` si fruga, `pv_banco_vendita` è merce della bottega; l'officina resta come l'hanno fatta loro (aggiungo solo saldatrice e cassetta).
- `risacca.js`: `totalRes`, `takeRes`, `putBase`, `putAnywhere`, la produzione dei laboratori (LAB) e i cantieri e moduli passano da `EXT`.
- `soldi.js`: `counter()` e l'azione `compra` girano a `Oggetti`.
- `game.js`: una riga, la velocità a piedi moltiplicata per `p.loadK`.
- `index.src.html`: caricati `soldi.js`, `oggetti.js`, `soldi_ui.js`, `oggetti_ui.js` (prima i soldi non erano collegati al gioco).

## Prove (4/10)
- `test_oggetti.js 4 3`: tutto a posto (~410 ricette eseguite dagli abitanti in 3 giorni, il Banco quadra).
- `test_soldi 2 1`, `test_azioni 1 1`, `test_economia 2 1`, `test_vita 2 1`, `test_fazioni 1 1`: ok.
- Nel browser (build con un GLTFLoader finto): nessun errore. I pannelli e le postazioni si vedono negli interni.

## Da fare
1. Provarlo davvero a schermo (`AVVIA.bat`) e bilanciare prezzi, pesi e quantità.
2. Il freddo come sistema: stufe, carbone, vestiti a strati (`calore` e i combustibili `heat` sono già pronti).
3. I membri della Risacca usano ancora le risorse astratte nei loro compiti («compra viveri», «ruba materiali»): funziona perché diventano oggetti veri, ma si potrebbe dar loro le ricette (fai X alla postazione Y).
4. Icone pixel per gli oggetti nelle Tasche (oggi lo zaino è un elenco).
5. Le «fuori dai conti» di `soldi.js` (soldi che spariscono, era già così prima): da cercare.
6. I contenitori nelle basi (nascondigli) e il bottino sui cadaveri (oggi solo soldi).
