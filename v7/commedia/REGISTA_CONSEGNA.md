# Il regista: la consegna (13 novembre)

Che cosa c'è nel codice del progetto `REGISTA_E_VOCABOLARIO.md` (§C il regista, §D l'innesto del motore, §B.6 e §T.2 le storylet),
dove si attacca e che cosa manca. Tutto sta dietro `?commedia`: a flag spento i tre file nuovi valgono `{ ON: false }` e il gioco è
quello di prima. L'impronta resta `48196fd63f899c14` (i file sono in `TASS_FUORI` di `build.py`).

## Che cosa esiste

| file | che cosa fa |
|---|---|
| `src/unico_storie.js` | `UnicoStorie.SCHEDE`: **7 storylet come dati** (debito che gira, appuntamento mancato, pesca grossa, voce che corre, via nostra, serata, muro della discordia), con l'impronta del catalogo |
| `src/unico_regista.js` | `Regista`: il regista. Fase `unico.regia` (prima di `unico.mente`), un battito ogni 10 minuti di gioco in due fette (leggere e avanzare; misurare e operare) |
| `src/unico_motore.js` | `UnicoMotore`: l'innesto del motore decisionale. **Senza un modello non fa niente** (le curve di oggi, identiche) |
| `src/unico_mente.js` | l'unica modifica a un file esistente: `Mente.innesti = { spinta, motore }` letti in `scegli()`. Se sono vuoti, la scelta è identica a prima (la prova della mente resta 32 su 32) |

**Il regista** fa quello che dice il §C:
- **le tensioni**: Tq per quartiere (`World.districtAt`, −25% l'ora), Tp per persona, Tg per gruppo (la banda, il cast di ogni storia), tutte prese dai pesi dei fatti (`Regista.GT`);
- **l'attenzione del giocatore** (+1 visto, +0,5 sentito, +2 se c'entra lui; −20% al giorno) e la noia (96 minuti di gioco senza vedere niente);
- **i tre caratteri** (`goldoni`, di serie, poi `fellini` e `monicelli`, anche con `?regista=fellini`), con la curva della tensione voluta e il respiro di 20 minuti dopo un picco visto;
- **le sei operazioni**: semina, spingi, incrocia, raffredda, chiudi e ripaga (i richiami da 1 a 5 giorni dopo una storia che il giocatore conosceva);
- **le tre leve e basta**: le spinte nella Mente (da ×0,6 a ×1,6 su un obiettivo, con una scadenza), le scene di `Eventi` come radici (solo con il giocatore vicino e all'aperto, al massimo 3 al giorno) e la scelta degli interpreti;
- **i budget a conteggio**: 12 storie attive (8 al telefono), 2 storie per persona, 2 semi all'ora, 6 inneschi provati e 1 casting per battito, 2 richiami al giorno, il ritorno della stessa storia dopo `ritorno.giorni`;
- **il caso** dal flusso `regia` della porta: stesso seme, stesse storie (provato: due giri di 24 ore sul seme 1 danno lo stesso hash);
- **lo stato** in `st.u.regia`, solo dati (`Fatto.puro` lo accetta), che si salva con `st.u`. Se l'impronta del catalogo cambia, le storie che non ci sono più si chiudono «sfumate»;
- **i segni**: i fatti `storia_seme`, `storia_svolta`, `storia_fine`, `storia_incrocio` e `storia_richiamo`, con la frase in `d`. Hanno i loro `Segni.TIPI`: la bolla, la Cronaca, la Gazzetta delle 7 (fine 0,8, svolta 0,45) e il Si dice quando qualcuno li racconta. C'è anche la scheda **«Storie»** nel Taccuino (Città), con le storie in corso e quelle finite di cui il giocatore sa qualcosa. Con `?commedia&regia` le mostra tutte, più le misure.

**Le misure** (Node, senza grafica, seme 1, 24 ore di gioco): 145 battiti, 6 storie seminate, 5 chiuse (3 «sfumate»), 1 incrocio, catene
fino a 3 anelli (prestito → rinfaccio → saldo). La fase costa **0,36 ms a battito** di media e 1,5 ms al massimo, cioè circa 0,002 ms
per passo. Nel browser (`?commedia&regia`) il gioco carica senza errori: la fase gira e la scheda «Storie» c'è.

## Le entrate (API)

- `Regista.stato(st)` dà il carattere, la tensione voluta e quella vera, le storie attive, le ultime operazioni e i contatori. `Regista.storie(st)` dà le storie attive e quelle chiuse.
- `Regista.carattere(st, 'fellini')` cambia il carattere. `Regista.forza(st, k, f?)` semina subito la storia `k`, per le prove e l'ispettore.
- `Regista.tq(st, x, y)`, `Regista.spinteDi(st, id)` (`{ g: x, $max }` o `null`) e `Regista.ruoloDi(st, id)` (`{ k, ruolo, passo }`).
- `Regista.controlla()` controlla il catalogo (obiettivi, tipi, ruoli, rami, segni). Gira anche al caricamento e scrive in `Regista.problemi`, che oggi è vuoto.
- `Regista.CFG` (budget, decadimenti, caratteri) e `Regista.stats`.
- `Mente.innesti.spinta(st, id)` restituisce `null` oppure `{ g: x, $max }`. `Mente.innesti.motore(c, L)` corregge `L[i].u` in loco. Se manca un innesto, il comportamento è quello di oggi.
- `UnicoMotore.f(testa, q)` fa l'inferenza a interi del §T.4. `UnicoMotore.caratteristiche(c, g)` dà le 44 caratteristiche quantizzate (`CAR`). `UnicoMotore.schema` è l'impronta che il modello deve avere. Poi `accendi()`, `spegni()` e `perche()`.

## I formati dei dati

- **La storylet**: il formato è descritto in testa a `unico_storie.js`. In breve:
  - `innesco` è `{ tipo: [...], se }` per un fatto, oppure `{ spontanea, ora }`;
  - `ruoli` sono `{ e: '$f.chi' | '$f.con0' }` dal fatto, oppure `{ q: { vicino_a, r, car, non }, opz }` per il casting;
  - ogni passo è `{ id, spinte: { ruolo: [obiettivo, x] }, attende: { tipo, chi }, scad, rami: { tipo: 'esito' | '>passo' }, poi, senza }`;
  - poi vengono `esiti: { nome: ['#gancio'] }`, `segni: { seme, svolta, fine, richiamo }` (con `{ruolo}`), `radice: { evento }`, `ritorno: { giorni }`, `reg` R/A/S e `peso` per carattere.
- **I ganci** viaggiano sul fatto `storia_fine`, nel campo `x.ganci` (stringa separata da spazi). Un'altra storylet li legge con `innesco: { tipo: ['storia_fine'], se: [['gancio', '#lite']] }`.
- **Il modello** è `window.UnicoModello = { v, schema, k, radici: { ob, met, ramo }, N: Int16Array, L: Int8Array }`, come descritto in testa a `unico_motore.js`. Si accende solo se lo schema coincide e non c'è `?curve`. Se il tempo sfora più di una volta su cento, si spegne da solo.

## Dove si attacca chi lavora sul resto del gioco

- **Verbi nuovi** (§B.4): un verbo il cui `fatto` produce un tipo nuovo diventa subito utilizzabile in `attende.tipo` e `innesco.tipo`. Per pesare sulla tensione si aggiunge il tipo a `Regista.GT`.
- **Obiettivi nuovi della Mente** (i 25 del §T.2): basta che esistano in `Mente.OBIETTIVI` (oppure con `Mente.estendi`) perché le spinte li usino. `controlla()` segnala quelli che mancano.
- **Storylet nuove**: si aggiungono come dati in `unico_storie.js`, o in un file che faccia `Object.assign(UnicoStorie.SCHEDE, ...)` prima di `unico_regista.js`.
- **Le istituzioni** (meteo, ordinanze, la nave): oggi la sola radice è `Eventi.run`. Una leva nuova va aggiunta in `radice()` di `unico_regista.js`.
- **L'ispettore** (`?commedia&ispettore`): può leggere `Regista.ruoloDi`, `Regista.spinteDi`, `Mente.utilitaDi` e `UnicoMotore.caratteristiche`.
- **L'allenatore** (`banco/regista/`, §D.5) deve produrre `unico_modello.js` con `schema = UnicoMotore.schema`. Il file va caricato prima di `unico_motore.js`, con la sua riga in `index.src.html` e in `TASS_FUORI`.

## Che cosa manca (onesto)

- **Il vocabolario è piccolo**: con 32 verbi e 19 obiettivi molte storie finiscono «sfumate», perché la spinta non basta se la condizione della Mente è a zero. Per lo stesso motivo il ritorno delle storie è corto (da 0,25 a 1 giorno invece di 3), e ci sono 6 semi al giorno invece degli 8-12 del Goldoni.
- **Le leve mancanti**: niente meteo né ordinanze; nessun ruolo per il giocatore (il verbo «Fai da paciere» in `Verbo.qui`); niente reputazione né emozioni nuove (le caratteristiche relative restano a 0); il «carico» del giocatore (missione, inseguimento) non è letto.
- **Incrocia** segna l'incrocio e rafforza le spinte, ma non sposta il passo nel posto e nell'ora dell'altra storia. Mancano anche i budget dei «fatti grossi» e dei gradini di faida, perché quei verbi non esistono ancora.
- **Il motore**: solo la testa `ob` è innestata, mentre `met` e `ramo` sono nell'interfaccia ma nessuno le chiama. Non c'è nessun modello allenato (è il passo 6).
- **Le prove**: niente `test_regista.js` né `test_storylet.js`, per scelta di questa consegna. Ci sono solo il giro in Node (determinismo, stato puro, tempi) e un caricamento nel browser. Il salvataggio a metà storia non è stato provato con `test_unico_salva.js`.
- **I segni**: le righe sono fisse per storia, senza `Lingua` (accordi, articoli) e senza l'«errore creativo» della diceria. Il limite di 1 «Storie» nuova ogni 5 minuti non c'è.

## I fili (14 novembre): il regista lavora sul sistema che c'è

La critica della direzione artistica: il regista non deve essere un elenco chiuso di 7 storie scritte. Adesso la **spina dorsale sono
i fili** (`unico_regista.js`, sezione «I FILI»), e le storylet sono solo **semi** per quando il paese è tranquillo.

- **Che cos'è un filo**: una storia aperta, cucita a ogni battito da **tutti** i fatti nuovi di `st.u.fatti`, qualunque sia la fonte
  (vita, casa, iniziative, sociali, verbi, costruire). Ha i partecipanti (ruolo → id), la tensione, una **domanda aperta** (il debito
  non è reso, il furto è impunito, l'offesa non ha risposta, l'appuntamento è da vedere, il cantiere è in piedi, chi risponde al muro…)
  e i colpi (gli ultimi 12; le chiacchiere di fila diventano un colpo solo, «se ne parla in giro»). Lo stato è in `st.u.regia.fili` e
  `fchiusi`, solo dati; gli indici fatto → filo e chiave → filo sono derivati.
- **Come si cuce** (`cuci`): (1) per **causa**, se `f.causa` o `x.di` (la diceria) è già in un filo; (2) per **famiglia**, con la
  tabella `Regista.TIPI_FILO` (tipo → `{ fam, m: apre|avanza|chiude, r: { ruolo: 'chi'|'con0' }, esito, se }`) e i ruoli che devono
  combaciare, oppure la **chiave** (il luogo del muro, `x.cantiere`, `x.ini`); (3) i tipi che la tabella non conosce entrano nel filo più
  recente di uno dei loro attori, entro la finestra. I tipi di tutti i giorni (`Regista.ROUTINE`: vai, mangia, compra…) tengono solo la
  catena. Le famiglie (`Regista.FAMIGLIE`): debito, furto, offesa, affetto, appuntamento, lavoro, cantiere, muro, iniziativa, voce,
  vicinato. **Un tipo nuovo del vocabolario si aggiunge con una riga** di `TIPI_FILO`, una famiglia nuova con una voce di `FAMIGLIE`.
- **Come si chiude**: con il fatto che risponde (saldato, reso, incontro, tregua, regalo di ritorno, copia_tag, ricorrente…), con i
  derivati della memoria (`Fatto.debito ≤ 0` → «pari», `Fatto.rancore` sbollito), allo scadere della finestra («sfumato»), oppure
  lasciato cadere se ce ne sono più di 100 aperti («troppi»: si lasciano i più freddi).
- **Le operazioni sui fili**: *spingi* (le spinte della famiglia ai ruoli che possono far avanzare la domanda: il creditore riscuote,
  la vittima si vendica, l'offensore regala; più un testimone dell'ultimo fatto che va a chiacchierare), *incrocia* (due fili caldi
  nello stesso quartiere: un partecipante del primo entra nel secondo e va a parlarne; al massimo uno l'ora), *raffredda* (le spinte
  `calma` sul filo più teso), *ripaga* (un filo che il giocatore conosceva, con 3 colpi o più: il segno `storia_fine`, una scena di
  `Eventi` se è vicino, il ricordo da 1 a 5 giorni dopo). Le tensioni per quartiere, persona e gruppo e i tre caratteri restano.
- **I semi**: le 7 storylet di `unico_storie.js` partono solo se nessun filo ha almeno due colpi.
- **La scheda «Storie»**: i fili vivi con il titolo fatto dai loro fatti e da Lingua («Il debito di Gavino con Luigi», «Il muro alla
  Calata del porto», «La raccolta della legna del lunedì»), la domanda e gli ultimi colpi; poi i finiti con la riga di chiusura, poi i
  semi. Le entrate nuove sono `Regista.fili(st)`, `Regista.filoDi(st, id)` e `Regista.titoloFilo(st, filo)`.

**Le misure** (Node, seme 1, 24 ore, il giocatore fermo al molo): 278 fili aperti (debito 139, voce 44, affetto 43, muro 19,
appuntamento 15, iniziativa 12, lavoro 4, furto 1, vicinato 1) e 178 chiusi (pari 85, sfumato 54, troppi 25, visti 9, ricambiato 5).
367 colpi sono arrivati per causa, 4 per attori in comune e 7 fili sono nati per diramazione. Il filo più lungo ha 42 colpi («Il debito
di Grazia con Dario»: prestito, chiacchiere, rinfaccio, saldo). Il regista ha spinto 37 fili (81 spinte), ne ha calmati 15, ha fatto
21 incroci e 21 chiusure ripagate. Semi da storylet: **0**, perché il paese non è mai stato tranquillo, e i fili sono tutti emergenti.
La fase costa 0,89 ms a battito di media (1,8 al massimo). Nel browser (`?commedia&regia`) il gioco carica senza errori di pagina.

**Che cosa manca**: le spinte agiscono sull'obiettivo e non sul bersaglio (la Mente sceglie lei chi rinfacciare); molti debiti si
chiudono «pari» da soli, quindi la spinta conta poco su quella famiglia; le famiglie furto e offesa in 24 ore sono rare perché sono rari
i loro fatti; niente prove automatiche, per scelta di questa consegna.

## Le idee e i gruppi (14 novembre): le precondizioni dell'emergenza aperta

La critica: iniziative e storie sempre uguali, niente rumore, nessuna catena che porti da sola, per esempio, a una banda contro il
regime. Non si scrive l'esito: si mettono le **precondizioni**. Due file nuovi, dietro `?commedia`, in `TASS_FUORI` (impronta invariata).

- **`src/unico_idee.js` (`UnicoIdee`)**: le idee come dati (soggetto: i Grigi, una persona, un gruppo, un posto, il mare, i soldi, una
  nozione assurda; tema, valenza, intensità; ≤ 4 a testa, in `st.u.idee`). Nascono dai fatti (tabella `DA_FATTI`: furto, rissa, regalo,
  prestito, festa, pesca grossa, barricata, multa e fermo dei Grigi, presi da `Popolo.note` avvolto, repressione, sgombero…) e dalle
  **coincidenze** (il fatto «prodigio»). Girano sulle chiacchiere che ci sono (`chiacchiera`, `voce`): il credulone le prende, il testardo
  le rifiuta, il bastian contrario le rovescia, la diceria a volte sbaglia soggetto. Si **accumulano** per quartiere (fatti «pressione» e
  «pressione_cala»). I **tratti** (follia, zelo, viltà, carisma, credulità, testardaggine, contraddizione) sono quasi sempre bassi e ogni
  tanto estremi. Le idee spostano le utilità della Mente (a catena sull'innesto `spinta` del regista).
- **`src/unico_gruppi.js` (`UnicoGruppi`)**: i **gruppi come attori** (nome generato, membri, capo, cassa con le quote vere, base con
  `UnicoCostruire.richiedi`, reclutamento, scissioni, rivalità, scala strada → quartiere → città, obiettivo collettivo); le **voglie
  composte** (verbo × bersaglio × scala, verbi del registro più quelli **sognati**: volare, manifestare, rovesciare, liberare, sposare…),
  messe in opera dalla Mente con l'obiettivo `militare` e il metodo `compito`; il **«come facciamo?»** (`EFFETTI`: per un effetto come
  `stare_in_aria` o `avere_soldi` i mezzi in ordine per tratti; il fatto «come_facciamo»); **ogni tentativo finisce** nel gioco (i fatti
  «riuscito» o «comica»; senza mezzo, il ripiego comico in un posto pubblico, o la rinuncia visibile «vuole»); il **debitore alle strette**
  sceglie la strategia (lavoro, vendere alla bottega, pescare e vendere, un altro prestito; orto, ricettazione, spaccio, furto, banca,
  sussidio sono nella lista dei mancanti); i **capricci** e gli **sbagli**; i **Grigi** che reagiscono al calore del gruppo con
  `Popolo.arrest` e lo sgombero della base, e la repressione torna idea (l'anello si chiude).
- **Il regista**: tre famiglie di fili nuove (`idea`, `gruppo` con chiave `x.gruppo`, `rivolta` con chiave `x.quart`), le righe di
  `TIPI_FILO` e i pesi `GT`. Spinge, calma, incrocia: non decide niente.
- **I segni**: i tipi nuovi in `Segni.TIPI` (Gazzetta, Cronaca, Si dice dal campo `d`) e la scheda **«Gruppi»** nel Taccuino (con
  `&regia` anche la lista delle voglie senza verbo).
- **`unico_costruire.js`**: l'aggancio `UC.richiedi(st, { effetto, altezza, x, y, gruppo, motivo })` e `UC.STRUTTURE[effetto]` per le
  strutture procedurali che verranno; oggi la rampa, la torre e lo sbarramento sono un mucchio di pezzi (la barricata), il riparo è la baracca.
- **La lista dei mancanti**: `UnicoGruppi.mancanti(st, 20)` (verbo, effetto, modo): è la lista di che cosa aggiungere al vocabolario.

Che cosa manca: i soldi nelle frasi nuove non ci sono (la valuta cambierà in un solo posto); la rampa non fa saltare davvero (il salto è
il fatto «riuscito»/«comica»); le strutture procedurali, la banca e le istituzioni sono le consegne dopo; niente prove automatiche.

## Il mondo pieno, priorità 1-4 (14 novembre): concreto, cose, liti, desideri

Il progetto è `MONDO_PIENO.md` §2, §3, §4, §9 e l'appendice. Tre file nuovi dietro `?commedia`, in `TASS_FUORI` (impronta invariata),
caricati dopo `unico_gruppi.js`; in più due tabelle in `unico_lingua.js`.

- **`src/unico_cose.js` (`UnicoCose`): sempre concreto e le cose.** I sei numeri di ogni cosa dalle proprietà del catalogo (`fisica`:
  kg, rimbalzo, rottura, danno, sporco, fuoco, più il materiale). `lancia(st, chi, cosa, bersaglio)` per tutti: parabola finta in
  `st.u.cose.volo` (≤ 12), preso, mancato o «colpisce_altro», 1-2 rimbalzi, cocci, fuoco solo per la molotov vera, la cosa che resta a
  terra (`st.u.cose.terra`, ≤ 40 per quartiere, poi si raccoglie: il verbo `raccogli`). Oltre 60 m l'esito si calcola senza volo. In
  mano: `n.hand` (lo disegna `anim_mano.js`) per la durata del gesto, e per qualche secondo dopo compra, prende, raccoglie, regalo.
  I segni del corpo (livido, taglio, braccio rotto, KO = `n.stun` a terra, sporco, bagnato) restano giorni e la Mente li sente.
  **Il contratto**: il verbo fallito di un NPC lascia una cosa nel mondo dalla tavola `GUASTI` (si_rompe, si_sporca, si_bagna, cade,
  scappa_via, monete, cappello, resta_incastrato, colpisce_altro, figuraccia, scoperto), col fatto «guasto» e l'onomatopea.
  `controlla()` elenca i verbi senza `esiti` dichiarati (quelli vecchi: valgono i GUASTI). `sostituto(A, ruolo)` riempie un ruolo
  (colpo, lama, proiettile, scudo, sedile, telo, elmo, zattera, esca) con la cosa che ha le proprietà; `armaDi` dà l'arma e il gradino.
  Il disegno è un livello della pagina (volo, onomatopee, cose a terra vicine, i segni del corpo entro 14 m): niente camera, niente modelli.
- **`src/unico_rissa.js` (`UnicoRissa`): la scala.** Otto verbi del registro (`guarda_storto` … `spara`) e sei per scendere (`scusati`,
  `ridi`, `paga`, `scappa`, `arrenditi`, `separa`), tutti con `Verbo.fai`, fatto e segno. La formula del §4.2 a ogni turno (2,2 s vicino al
  giocatore; lontano tutta in un colpo); il gradino massimo da quello che ha in mano; dentro la scala chi ha qualcosa da tirare tira.
  Si apre da un fatto offensivo (`APRE`: furto, rinfaccio, lite, lancio, guasto addosso, insulto…), dal giocatore che mena le mani
  (Game, `n.hitT`), o dalla Mente: «vendicarsi» ha il metodo nuovo `affronta` (lo spinge già il filo «offesa» del regista). Le
  conseguenze: reputazione (`st.u.rissa.rep`: temuto, ridicolo, vigliacco), fascicolo (`st.u.rissa.fasc`), denunce dei testimoni, il fermo
  se c'è un Grigio, idee nei testimoni, i tipi nuovi in `Fatto.OFFESE` (il rancore) e in `TIPI_FILO` (il filo di vendetta).
- **`src/unico_desideri.js` (`UnicoDesideri`): i desideri dalle variabili.** `Var.dichiara` (29 tipi oggi: soldi, i 7 bisogni letti
  dall'Attore, possiede × 382 cose, prop × 24, salute, ferite, quota, velocità, posizione, casa, lavoro, affetto, rancore, debito,
  pubblico, temuto, ridicolo, vigliacco, fascicolo, libero, membro, capo, idea_di). L'indice inverso dai termini `eff` di tutti i verbi
  (`EFFV`; un termine sconosciuto va in `ignoti`, oggi vuoto), dai mezzi di `UnicoGruppi.EFFETTI` (le strutture di `UC.richiedi` comprese),
  dai metodi della Mente e dai veicoli. Nascono solo dai fatti (`DELTA` per tipo; sorgenti mimesi, perdita, vista, torto, contagio,
  curiosità; salienza × tratti × rarità della firma; ≤ 2 attivi + 1 dormiente). Ricerca all'indietro a 3 livelli, fascio 6, 60 nodi, cache
  per quartiere, approssimazioni (`APPROX`). La Mente li fa con l'obiettivo `desiderare` (metodo `desiderio`); la bolla («vuole volare»)
  esce col primo passo. Il mondo decide: si rilegge la variabile (pieno, a metà), poi un altro mezzo, poi la comica e la **rinuncia**
  (un verbo: il cappello sbattuto per terra o la roba portata a casa). Anche le voglie dei gruppi scadute finiscono con `rinuncia`, e il
  capriccio e il «vuole» non hanno più la bolla vuota. Nomi: `Lingua.desiderio(d)` con la tabella `Lingua.DESIDERI`; i soldi delle frasi
  nuove passano da `Lingua.soldi` (lo sbleuro cambierà `Lingua.VALUTA`). I buchi: `UnicoDesideri.mancanti(st)` (scheda «Desideri» con `&regia`).

**Le misure** (Node, `sim_mondo`, il giocatore fermo al molo): 24 ore seme 1, nessun errore, 42 desideri nati (6 sorgenti, 13 variabili),
chiusi 6 pieni, 9 a metà, 22 rinunce concrete; 12 liti (3 arrivate a menarsi; uscite: paga 5, ridi 3, scusati 2, arrenditi 1), 14 guasti di
10 tipi, lanci con SPLAT e TUNF. Costo per passo: cose 0,002 ms, rissa 0,006, desideri 0,007 (ricerca al più 1,7 ms). Nel browser con
`?commedia&regia` zero errori di pagina. **Che cosa manca**: la morte e le ferite gravi con l'ambulatorio; il verbo `ruba` e gli altri della
lista (manifesta, radunati, coltiva, spaccia, arrampicati, salta_con_mezzo, guida); il giocatore non ha ancora «lancia» nel menu; la
quota è solo «vicino a un posto alto» (le strutture a parti la daranno); niente prove automatiche, per scelta di questa consegna.

## Il vocabolario grande, primo lotto (14 novembre): le parole diventano azioni

La critica: quasi tutti i desideri finivano in rinuncia perché mancavano i verbi. Un file nuovo, **`src/unico_vocabolario.js`
(`UnicoVocabolario`)**, dietro `?commedia`, in `TASS_FUORI` (impronta invariata), caricato dopo `unico_desideri.js`. `unico_verbi.js`
resta il motore: le carte passano tutte da `Verbo.registra` e si fanno con `Verbo.fai`, per il giocatore e per gli NPC.

- **La carta come dati** (`UV.CARTE`, il formato in testa al file): famiglia, bersaglio (`chi: 'persona'`) o classe di posto (`dove`:
  acqua, spiaggia, chiesa, bar, piazza, protesta, uffici, terra, alto, tetto con le scale di `Tetti.LADDERS`, casa, casa_altrui, bottega,
  banca con `Soldi.bankT`, mezzo, lavoro…), le cose che servono (`serve`, `opz`, `usa`), le condizioni in più, gli **atomi degli effetti**
  (`soldi`, `roba`, `bis:<bisogno>`, `quota`, `pubblico`, `rep`/`repchi`, `affetto`, `pace`, `offesa`, `ruba:persona|bottega|casa|mezzo`,
  `ricetta`, `spaccia`, `orto:pianta|annaffia|raccogli`, `mutuo`, `sussidio`, `cappello`, `trova`, `fede`, `raduna`, `grigi`, `sfida`,
  `delazione`, `mestiere`, `social`, `casafai`…: 124 termini `v:…` di `Verbo.EFF`), la durata, la probabilità, i **modi** (`UV.MODI`:
  di_nascosto, in_pubblico, per_scherzo, con_rabbia, con_garbo, in_gruppo, maldestro, teatrale: cambiano riuscita, testimoni e `pub` del
  fatto, relazioni, rischio coi Grigi, la parola della bolla), posa, pittogramma, onomatopea, il guasto della comica, la frase al passato
  per `Lingua` (accordi, articoli, la donna «si è tuffata», i soldi da `Lingua.soldi`), le righe del regista, delle offese e delle idee.
- **Sempre concreto**: il primo termine tira (ok, a metà, comica); la comica esegue la riga vera di `UnicoCose.GUASTI` (cade, si bagna, le
  monete, la figuraccia…) e lascia il fatto «guasto»; i Grigi (l'atomo `grigi`) fermano (`Popolo.arrest`), multano, o un testimone denuncia
  (i fatti `fermato`, `multa`, `denuncia`). `Fatto.scrivi` è avvolto solo per i fatti del vocabolario (i 10 campi utili, i testimoni del modo).
- **Registrati da soli**: `UnicoDesideri.EFFV` (un termine nuovo trova i desideri senza altro), le legature `BIND` di ogni carta, le
  `DELTA` (le voglie nascono dai fatti nuovi), le variabili `orto`, `fede`, `sposato` e `quota`/`casa`/`pubblico`/`velocita` che leggono
  quello che le carte lasciano (`st.u.voc`); `Segni.TIPI`, `Fatto.GRAV` e `OFFESE`, `UnicoIdee.DA_FATTI`; `Regista.TIPI_FILO`, `GT` e
  sette famiglie nuove (`protesta`, `traffico`, `orto`, `impresa`, `amore`, `fede`, `sfida`); un metodo `voc_<obiettivo>` per 15 obiettivi
  della Mente (con l'attesa fra una volta e l'altra); i verbi sognati dei gruppi (manifestare, scioperare, occupare, sabotare, processare,
  eleggere, sposare, addestrare, parlare_con, maledire, pregare_per, cantare, corrompere, sfidare, fuggire) e i mezzi di `EFFETTI` che
  erano nella lista dei mancanti (corteo, orto, ricetta, spaccio, furto, banca, sussidio, tesoro, banda, grotta, tetto, campanile…).
- **I cataloghi vecchi chiamati, non copiati** (strategia A): le 44 abilità di `Mestieri.AB` (`arte_<id>` con `Mestieri.perform`), sei verbi
  di `Casa.VERBI` (`Casa.fai`, il fatto di casa adottato), cinque battute di `Azioni.social` (sfotti, complimenta, offri_da_bere,
  gioca_a_carte, litiga); altri 41 sono porti dichiarati (`da:`) di voci di azioni, risacca, eventi, iniziative ed estri, coi dati di là
  (`Azioni.SOFT`, `HIDDEN`, `BINS`).
- **Le correzioni**: andare in un posto è sempre un mezzo (la legatura `vai` dei desideri si arrendeva oltre 300 m in scena: «stare alla
  Calata del porto» → «non sa come fare»); i mezzi senza mancanti (`manca: []`) la ricerca li saltava sempre (un array vuoto è «vero»);
  l'indice mette le carte dopo i metodi e i verbi di sempre, toglie il «ruba» mancante; `MEZZO_V.appuntamento` in `unico_desideri.js` faceva
  nascere la voglia di annoiarsi (`bisogno:svago+`). Il menu del giocatore ha fino a 4 voci nuove possibili lì (cache per mezz'ora e posto).
  Con `&regia` la scheda «Vocabolario» nel Taccuino. Entrate: `UV.conti()`, `UV.lega(c, v, nd)`, `UV.CARTE`, `UV.MODI`, `UV.stats`.

**Le misure** (Node, `sim_mondo` con il file nuovo, 72 ore, il giocatore fermo al molo, zero errori, stato puro): i verbi del registro
da **49 a 237** (188 nuovi: corpo 18, luoghi e casa 19, oggetti 16, sociali 30, economia 17, lavoro e mare 53 con i 44 mestieri,
conflitto 9, città e Grigi 15, circo 7, muri 4; 96 dai cataloghi vecchi, 92 nuovi). I desideri (chiusi pieni / a metà / rinuncia):
seme 1 da 17 / 7 / 57 a 18 / 20 / 48, seme 2 da 8 / 9 / 50 a 19 / 12 / 52. La lista dei mancanti dei gruppi è vuota (prima: suona 121,
fare_festa 121, scava 71, maledire 16…); quella dei desideri ha in testa «togliersi la figuraccia» (approssimato), affetto+, capo+,
idea_di+, membro+. La fase costa 0,0005 ms a passo; il gioco con `?commedia&regia` carica con zero errori di pagina.

**Che cosa manca (onesto)**: niente animazioni nuove (arrampicarsi è andare al piede della scala di ferro e la quota per 45 minuti: l'NPC
non sale davvero sul tetto); i verbi a persona falliscono se l'altro si sposta; molte rinunce sono ancora voglie che la Mente non sceglie
in tempo («non ci pensa più»); il raduno manda la gente con `Verbo.vai` ma non la tiene lì; il furto del mezzo cambia il padrone, non lo
guida; la banca dell'NPC è un conto in `st.u.voc.mutui` (le regole di `Soldi.CFG`), non quello di soldi.js; niente prove automatiche.

## La cultura (15 novembre): i gruppi e i posti si fanno la loro cultura dai loro fatti

Un file nuovo, **`src/unico_cultura.js` (`UnicoCultura`)**, dietro `?commedia`, in `TASS_FUORI` (impronta invariata), caricato dopo
`unico_vocabolario.js`. Niente modelli di linguaggio: regole e grammatiche sui fatti veri, il flusso `cultura` della porta (stesso seme,
stessa cultura), l'hash della riga per le battute. Lo stato è in `st.u.cultura`, solo dati (`Fatto.puro` lo accetta), e si salva con `st.u`.

- **Le comunità** (`st.u.cultura.com`): ogni gruppo di `UnicoGruppi` (`g:g3`), ogni presidio senza un gruppo dietro (`c:c4`), ogni
  mestiere (`m:pesca`, `m:porto`, `m:fabbrica`). Ognuna tiene gli **episodi** (`ep`: i fatti della tabella `UCu.EPI`, tipo → peso, tema)
  e i **dettagli** di quegli episodi (`det`, al più 2-3 per fonte: la cosa tirata, il pezzo portato al presidio con le sue varianti di
  popolo — il fusto è un bidone o una latta —, la pianta del vaso, il posto, la via, l'ora, il mezzo e l'arnese dei Grigi, l'onomatopea
  del guaio, la persona, il mestiere, il cibo, la bestia che passava; per i gruppi ancora senza storia il soggetto della loro idea e i
  mestieri dei membri). **Ogni parola si fa con quei dettagli**, mai con un elenco fisso di oggetti; le scelte a hash mischiano il seme.
- **Contro la ripetizione** (`st.u.cultura.usati`: radici e schemi già presi in tutto il paese): `pena(radice, schema)` sconta ogni
  candidato già usato da un altro gruppo, anche il registro del nome; l'oggetto della comunità è il dettaglio più raro. Due gruppi della
  stessa partita non si somigliano e due semi danno culture diverse.
- **Il nome** (`cerimonia(st, com, motivo)`): il più carismatico propone, gli altri votano coi tratti (il credulone segue, il bastian
  contrario no, il vanitoso vota il suo nome, il timido no), i fatti `nome_proposto` e `nome_scelto` con le battute (proposta, obiezione,
  brontolio, proclama). I candidati vengono da ~60 schemi (`UCu.SCHEMI`, una parte a caso a ogni cerimonia) in molti registri: oggetto con
  aggettivo o colore, conii (radice + -ia, -landia, -opoli, -ari, -isti…), la data del calendario finto («Zona Otto Maggio»), la persona
  («Villa X», «X-opoli», «I Ragazzi di X»), il nobiliare ironico, il luogo, il burocratico («Comitato Provvisorio Permanente»), il
  chiesastico, il marinaro, il bambinesco, il dialettale, lo sportivo, il cooperativo, l'accademico, il finto militare, l'onomatopea, l'ora
  e l'ironia sugli episodi (multa, sgombero, resistenza, figuracce, il martire). Dopo un fatto grosso (resiste, sgombero, repressione) si
  rinomina (al più 3 nomi; la scissione dà il suo). Il nome va in `g.nome` (Taccuino, Gazzetta, Si dice dei fatti nuovi) e in **`C.nome`**
  dei cantieri del gruppo (il presidio, la barricata, la baracca), in maiuscolo, senza articolo se lungo.
- **Il simbolo** (`com.sim = { f, o, d, l, c, x }`): forma, il dettaglio, il disegno (una ventina di oggetti in canvas 2D; se il dettaglio
  non ne ha uno, la sua lettera iniziale a graffito), due colori della tavolozza (mai i riservati), un segno in più (lumino per il
  martire, timbro per la multa, stelle per la festa, la crepa per chi si è scisso). `UnicoCultura.disegna(ctx, sim, x, y, lato)` e
  `urlSimbolo(sim)`. **Lo striscione**: `UnicoPartiVivo.extra` è avvolto (con una proprietà, così il presidio può rimettere il suo): sopra
  la scritta va una tela col nome adattato alla larghezza e il simbolo ai due capi; quando il nome cambia il gruppo di mesh si rifà. Dove
  `unico_parti_vivo.js` legge già `C.nome` la tela nostra sta sopra la sua: la stessa scritta, più il simbolo.
- **Le parole** (`st.u.cultura.par`, chi le sa in `sa`): gergo da schemi per tema (resistere: «fare il copertone», «stare come un
  bancale», «illamierarsi»; l'impresa: «gattata», «fare il colpo della capra»; la festa; la scissione), i nomi dei Grigi dai loro arnesi e
  mezzi («i Modulini», «quelli del binocolo») o da una riserva di venti, l'antonomasia («fare la fine di Laura», «cadere alla Rosaria»),
  il traditore, i rivali, i gerghi dei mestieri. Girano sulle chiacchiere (`UnicoIdee.ascolta`), i ragazzi le storpiano, calano del 25% al
  giorno e muoiono se nessuno le usa (`parola_morta`); se passano a un altro gruppo, `contagio`; se girano troppo il regime se le prende
  (`appropriazione`). **In bocca alla gente**: `G.say` è avvolto (sull'hash, una volta ogni 5 s): chi sa il nome dei Grigi dice quello, il
  soprannome al posto del nome, il nome di popolo del posto. Vicino al giocatore, ogni 6-9 s, qualcuno usa la sua cultura: il saluto a
  coppia fra compagni, il motto, la parola, il soprannome dell'altro, il proverbio, il mito.
- **I miti** (`st.u.cultura.miti`): da un episodio pesante; a ogni racconto (la chiacchiera sul fatto, la tavolata, il racconto spontaneo
  a chi sta vicino) si gonfiano numeri, Grigi, tempo, gesta e code; il narratore credulone o matto gonfia di più e a volte si mette in
  mezzo («e c'ero anch'io»); il traditore entra nella storia. Il fatto `leggenda` porta la versione gonfiata nel Si dice (la riga è sua)
  e nella Gazzetta.
- **I riti**: la tavolata della sera (20-23), il minuto per chi è stato portato via, la sedia vuota (e la sua superstizione), il primo
  «anniversario» (un giorno di vita), il canto alla tavolata, la preghiera al santo.
- **Il paese**: soprannomi personali (dalla cosa tirata, dall'onomatopea, da una riserva per tipo di fatto, i titoli per il capo che ha
  resistito), nomi di popolo dei posti (accanto agli ufficiali, nel Taccuino), l'Ufficio Rettifiche (le vie col nome del Garante dopo una
  resistenza, gli eufemismi dopo multe, fermi, sgomberi), i manifesti del Garante ogni mattina e le parodie dei gruppi contro i Grigi, i
  proverbi dalle catene causa → effetto (`UCu.PV`), le superstizioni, i santi e gli altarini, i canti a distico rimato (`UCu.RIMA`,
  `ATTACCHI`; anche i mestieri), i piatti, la moda (colore, fazzoletto, segno della mano; le quattro bande di MONDO_PIENO §5.3 se un gruppo
  ne prende il nome), il calendario (il giorno chiamato col suo fatto più grosso, le feste di fondazione e dei santi), le magliette.
- **La forma**: `UnicoParti.sito` è avvolto: se chi apre il cantiere ha un dettaglio che è un pezzo (fusto, porta, sedia, copertone,
  cassa, lamiera, bancale…: `com.pa`), fra tre semi della stessa ricetta vince quello con più di quei pezzi (`com.pref`). Nessuna
  modifica a `unico_parti.js`; quando la ricetta non usa quel pezzo (la barricata non ha fusti) la preferenza resta solo scritta.
- **I segni e il regista**: tutti i tipi nuovi hanno il loro `Segni.TIPI` e `Fatto.GRAV`; `UnicoIdee.DA_FATTI` per nome, rito,
  parodia, manifesto, simbolo conteso; la famiglia di fili **`leggenda`** (chiave `x.mito`) e le righe di `TIPI_FILO`; i fatti hanno la
  causa vera, quindi si cuciono ai fili del gruppo e del presidio. La scheda **«Cultura»** nel Taccuino (Città): le comunità col simbolo,
  le parole, i soprannomi, i posti, si racconta, proverbi e superstizioni, manifesti e parodie, il calendario, i mestieri.
- **Le entrate**: `UnicoCultura.S(st)`, `cerimonia`, `candidati`, `simbolo`, `distico`, `versione`, `racconta`, `nuovaParola`,
  `soprannome`, `comPerCantiere`, `membri`, `data`, `disegna`, `urlSimbolo`, `html`, `CFG`, `stats`, `SCHEMI`, `EPI`, `RIMA`, `PV`, `EUF`.

**Il giro** (Node, `sim_mondo` coi moduli nuovi, il giocatore fermo al molo): seme 1 72 ore e seme 2 48 ore, zero errori, stato puro.
Seme 1 in 72 ore: 12 gruppi con 12 nomi e 4 rinomine, 97 parole (16 dimenticate), 20 miti raccontati 65 volte, 52 riti, 42 soprannomi,
9 nomi di posti, 6 santi, 3 piatti, 227 battute vicino al giocatore (50 riscritte da `G.say`). La fase costa ~1,3 ms ogni 30 minuti di
gioco (0,0026 ms a passo); un battito ha toccato 30 ms una volta (il primo giorno con molte cerimonie). La foto: `_immagini/commedia/
cultura_1.jpg` (un presidio dopo la multa e la resistenza: lo striscione «GLI INAMOVIBILI» col simbolo, la proposta del nome).

**Che cosa manca (onesto)**: la toppa e il fazzoletto sono solo dati (i vestiti dei personaggi non si toccano); i riti sono fatti e
battute, la gente non si raduna apposta (al presidio c'è già); il nome nella Gazzetta cambia solo per i fatti nuovi (le righe vecchie
hanno il nome di allora); la forma pesa solo sulle ricette che hanno quel pezzo; le quattro bande del progetto non nascono da sole;
molti dettagli sono ancora arnesi dei Grigi e mestieri, finché il paese non ha fatti con cose vere in mano; niente prove automatiche.
