# I progetti: la follia viva (proposta, 9 novembre)

La richiesta della direzione artistica:
«servirebbe come un generatore procedurale di eventi, ma poi come fare se nascono eventi non scriptati con le animazioni,
per cose non pensate? […] qualcuno a caso decidesse che vuole costruirsi una casa al mare senza permessi […] Il crimine
deve avere la sua struttura, le sue iniziative, così come qualcuno può vendere o comprare casa, sono proprietà, riarredarla
a piacere con tutti gli asset. Capisci la follia viva che vorrei?»

Questo è solo un progetto: **nessun file di `src/` è stato toccato**. Quello che segue va in tre file nuovi
(`src/progetti.js`, `src/malavita.js`, `src/proprieta.js`), dietro `?commedia`, caricati dopo `iniziative.js`,
fuori dall'impronta dei tasselli. Spento il flag, il gioco resta com'è.
La tavola è in `_immagini/commedia/progetti_tavola.jpg`.

**In una riga.** Non serve un'animazione per ogni cosa che può succedere. Serve un **vocabolario finito di verbi
animati** (ne abbiamo già ~130) e un mondo che **cambia in modo visibile** (cose che compaiono, crescono, passano di
mano). Un progetto, un crimine, una compravendita sono **frasi** scritte con quelle parole: la novità sta nella
combinazione e nella catena, non nel corpo.
Le regole restano quelle di `INIZIATIVE.md` e `VITA_NPC.md`: **prova a secco prima di nascere, prima il fatto e poi la
parola, ogni fatto ha una causa**.

---

## 1. La domanda vera: le animazioni per le cose non pensate

### 1.1 Che cosa sanno fare oggi i corpi (inventario)

Il motore (`animazioni.js`) piega le ossa **dopo** la clip del kit, verso una posa scritta nello spazio del personaggio.
Le pose si fondono a strati (corpo, braccia `_su`, umore) e la mano tiene qualsiasi oggetto (`anim_mano.js`).

| famiglia | file | cosa c'è (nomi veri) |
|---|---|---|
| **clip del kit** (24 nel glTF, 11 usate) | `assets/mc/*.json`, `models.js` | Idle, Idle_Neutral, Walk, Run, Run_Back/Left/Right, Roll, Interact, Wave, Punch_L/R, Kick_L/R, HitRecieve 1-2, Death, Idle_Gun, Idle_Gun_Pointing, Idle_Gun_Shoot, Gun_Shoot, Run_Shoot, Idle_Sword, Sword_Slash. **Mai scelte** da `animPerson`: Interact, Roll, Kick (la figura nuova le carica, `personaggi.js:1670`), Sword, HitRecieve_2, Run_Back/Left/Right |
| **vita quotidiana** (~57) | `anim_vita.js` | siede, siede_terra, dorme, tavola, carte, bancone, beve, bottiglia, mangia, fuma, telefona, legge, libro, **scava, zappa, martella, forza, fruga, spazza, lavora**, pesca, prega, cero, balla, scalda, **attacchina, vernicia, gesso, disegna**, foto, **carriola, porta, merce, raccoglie, prende, porge, tiene**, prova, aspetta, osserva, appoggiato, braccia, tasche, orologio, dietro, saluta, discute, parla, respira, stiracchia, flipper, biliardo, freccette, rotelle; più `portamento` (età, coraggio, paura, divisa) e `vita` (respiro) sempre accesi |
| **gesti** (10) | `anim_gesti.js` | gratta, sbadiglia, allaccia, colletto, tasche_cerca, naso, capelli, guarda_lontano, **stretta** (di mano), **pacca** |
| **lotta, mezzi, stati** (~37) | `anim_lotta.js` | mira, ricarica, lancia, guardia, spinta, calcio, schivata, colpito, barcolla, stordito, rialza, **mani_alzate, rannicchiato, fuga, indica, alt, perquisisce, ammanetta, ammanettato**, in_bmx, in_vespa, in_auto, in_skate, gradini, cade, atterra, nuota, scavalca, carica, salto; umori: ubriaco, postumi, freddo, ferito, paura, rabbia, stanco |
| **la mano** | `anim_mano.js`, `roba3d.js`, `oggetti3d.js` | qualunque voce del catalogo (382 modelli veri) in mano, con 5 prese: pugno, lungo, appeso, piatto, regge |
| **il pennello** | `writer_mano.js` | la bomboletta che segue il tracciato vero del pezzo |

E **chi sceglie la posa** c'è già, senza scrivere animazioni:
- `BY_LABEL` (`anim_vita.js:638`): il testo del passo di un piano («costruisce», «scava la buca», «attacca i manifesti»)
  diventa una posa con una regex; `BY_OBJ` (l'oggetto intelligente), `BY_JOB` (il mestiere all'aperto), `HELD_UP`
  (cassa, mobili, materiali in mano mentre cammina → `porta`), `habit` e `intent` (da fermi, col motivo).
- **L'interprete di `eventi.js`** è già un sequenziatore di verbi animati: `go, pose, mood, look, follow, wander, flee,
  chase, crowd, fall/up, brawl, jail, pay, hand, van, fire, ladder, ride, slot`. Le scene sono schede di dati.

### 1.2 Che cosa sa mostrare il mondo (inventario)

| cosa | dove | stato visibile |
|---|---|---|
| **il catalogo del Cantiere** (~100 voci) | `cantiere.js B` | terreno (disbosca, cava, spiana, sgombra, sterra, sentiero), orto (ara, 4 semine, innaffia, raccogli, alberello che cresce in 2 giorni), pezzi (4 muri, finestra, porta, cancello, muretto, recinto, 2 tetti, 2 pavimenti, tettoia), costruzioni intere (capanno, baracca, casetta 4×3, garage, tenda, bohío, palafitta, capanna tonda, casa del comando, ramada, latrina, cisterna, amaca, stendino, striscione, falò), arredi (branda, letto, tavolo, sedia, panca, scaffale, armadio, attaccapanni, tappeto, lampada, stufa, cassa), postazioni, corrente, sottoterra |
| **il cantiere aperto** | `cantiere.js:1044 wipLook` | **due stati soli**: aperto (il modello al 40% trasparente, i pali dell'impalcatura, due mucchi di materiale) e finito. `o.wip` sono i minuti di lavoro. I segni dei lavori in coda (`jobMark`) |
| **gli interni** | `interiors.js`, `interni_arte.js` | ogni edificio, 7 piani, programma per attività e per famiglia (`moodOf`: famiglia, anziana, operaio, pescatore, intellettuale, funzionario, kommunalka, contadini, rudere); ~276 oggetti `ia_*` + ~45 mobili del kit (`assets/mf`) |
| **i ritocchi dello Studio** | `editor.js:149-178` | un formato a differenze per piano: `mobili { chiave: {x,y,h,ry,s} | {togli} }`, `nuovi [{id,x,y,ry}]`, applicato dopo `Interior.layout` (funzione interna, non esportata) |
| **i mezzi** | `game.js VK` | 18 tipi: vespa, 500, ritmo, giulia, **ape, furgone**, fuoristrada, camion, campagnola, blindato, polizia, **gozzo**, motoscafo, chiatta…; il furgone in doppia fila delle scene (`eventi.js van`) |
| **la roba per terra** | `pezzi.js`, `bottino.js`, `assets/mj` `mk` | pallet, sacchi di sabbia, casse, taniche, bobine, generatori, teli; container, transenne, coni, macerie, gomme, cassonetti, tenda, falò |
| **i segni** | `writing.js`, `eventi.js fire`, `Game.npcThrow` | muri dipinti, crossati, ripuliti; il fuoco; la vetrina rotta; la folla (`crowd`) |
| **le parole** | `commedia.js`, diario, Taccuino | il fumetto, il «Sentito dire», la voce che gira |

### 1.3 Il principio: le frasi, non le parole nuove

**Ogni evento procedurale è una sequenza di passi `{verbo animato, cosa in mano, dove, quanto}` più dei cambi del mondo
`{compare, cresce, sparisce, cambia padrone}`.** Nessun passo può nascere se il suo verbo non è nel vocabolario.

1. **Una tabella sola, `VERBI_ANIM`**, in `progetti.js`: ogni verbo dei progetti (sgombra, scava, porta, impasta, alza,
   copre, dipinge, arreda, trasloca, minaccia, paga, conta, sigilla…) dice la posa, la mano e il segno nel mondo.
   Non regex sul testo: una chiave. Il testo del passo resta, così `BY_LABEL` continua a funzionare per tutti gli altri.
2. **La catena di ripiego**: posa giusta → posa della famiglia (`lavora`, `martella`, `raccoglie`) → `aspetta` con
   l'oggetto in mano → **fuori scena** (al chiuso, di notte, dietro il muro del cantiere). Mai un corpo fermo che
   «fa» una cosa che non si vede: se non c'è il verbo, il passo si fa dove la camera non guarda, e si vede il **risultato**.
3. **Il mondo fa metà del lavoro.** Una casa che si alza muro per muro (ogni pezzo è una voce vera del catalogo: muro di
   mattoni, finestra, porta, tetto di coppi) racconta più di qualunque animazione; i pallet e i sacchi davanti al
   cantiere dicono «qui si costruisce», il nastro e il cartello dicono «sequestrato», il furgone in doppia fila e i
   mobili sul marciapiede dicono «trasloco».
4. **La distanza è la regia.** Lontano (oltre 84 m, il raggio pieno di `popolo.js`) nessuno anima niente: si vedono solo
   le cose che compaiono. Vicino al giocatore i verbi, uno alla volta per persona, con i tempi dei piani di `Azioni`.
5. **I verbi che mancano li chiedono i dati.** Ogni volta che un passo cade nel ripiego, `progetti.js` conta il verbo
   mancante (`st.prog.mancano`). La lista per la squadra dei personaggi esce dalla partita, non dal gusto.

### 1.4 I verbi che mancano (richiesta alla squadra dei personaggi, ramo `personaggi9`: noi non lo tocchiamo)

| prio | verbo | per cosa | oggi si ripiega su |
|---|---|---|---|
| **A** | `ascia` (colpo laterale a due mani, l'albero davanti) | disboscare, la legna, la ruspa a mano | `martella` |
| **A** | `cazzuola` (in ginocchio o chinato a un muro basso, posa il mattone) | alzare i muri, il muretto, il condono «a lavori finiti» | `martella` |
| **A** | `porta_in_due` (due persone, una trave o un mobile; sincronizzate dal più lento) | trasloco, travi, il frigo, il materasso | due `porta` |
| **A** | `rullo` (pittura di parete alta, braccia su e giù, con la scala) | imbiancare, la facciata abusiva, il buff dei Grigi | `vernicia` |
| **A** | `busta` (la mano sotto il bancone o nella giacca, sguardo di lato) | la mazzetta, il pizzo, il ricatto | `porge` |
| **B** | `impasta` (pala nella carriola o nel secchio) | la malta, il cemento | `scava` |
| **B** | `spinge` (carretto, auto in panne, la porta forzata con la spalla) | traslochi, contrabbando, lo sgombero | `forza` |
| **B** | `bussa` (alla porta, due tempi; con rabbia tre) | lo sfratto, l'esattore, il vicino che protesta | `saluta` |
| **B** | `afferra` (per il bavero, contro il muro) | la minaccia del racket | `spinta` + `rabbia` |
| **B** | `conta` (le banconote, a mazzetta) | il pizzo, la vendita, l'eredità | `legge` |
| **B** | `firma` (in piedi al banco, timbro del funzionario) | rogito, condono, verbale di sequestro | `lavora` |
| **C** | `misura` (metro srotolato, picchetti) | il sito, il geometra del Garante | `osserva` |
| **C** | `annaffia`, `semina` (a ventaglio) | il giardino, l'orto | `zappa` |
| **C** | `stende` (i panni al filo) | la casa abitata | `raccoglie` |
| **C** | `abbraccia`, `piange` (seduto, mani al viso) | l'inaugurazione, lo sgombero, il lutto | `stretta`, `siede` |
| **C** | `rema` (sul gozzo) | il contrabbando, la fuga | `in_auto` |
| **C** | `trascina` (sacco, corpo) | il contrabbando, il cantiere | `porta` |

Da sbloccare senza lavoro nuovo: la clip **`Interact`** del kit (bussare, toccare, girare la chiave) e `Roll` sono già
caricate (`personaggi.js:1670`) ma `animPerson` (`models.js:370`) non le sceglie mai. Basta una riga: la chiediamo alla
squadra dei personaggi insieme alla lista.

---

## 2. Il motore dei progetti

### 2.1 Che cos'è un progetto

```
Progetto = { id, tipo, capo, scopo, sito, fasi[], squadra[], cassa {soldi, roba}, legalita, occhio, stato, esito, catena[] }
Fase     = { verbo, cosa (voce del catalogo / ricetta / mobile), ore (uomo), serve {roba, attrezzi}, chi (ruolo),
             vista (quanto si nota: 0-1), permesso ('libero' | 'licenza' | 'abusivo'), segno (cosa cambia nel mondo) }
```

Un progetto è una **iniziativa lunga**: dura giorni, ha fasi, ha una squadra e una cassa, e lo vede il mondo.
`iniziative.js` ha già tutto per la parte corta (atomi, prova a secco, inviti, la roba con `procura`, il cantiere con
`apriCantiere`, la memoria, la catena): `progetti.js` la usa per ogni fase, non la rifà.

### 2.2 Le fasi generiche (il vocabolario dei progetti)

| fase | verbo animato | cosa usa di vero | segno nel mondo | vista |
|---|---|---|---|---|
| **sceglie** il sito | `osserva`, `misura`* | `sitoCostruzione` (fuori città, caselle libere), il registro delle proprietà (§4) | i picchetti | .1 |
| **procura** | `porta`, `carriola`, `porge` | `Iniziative.procura` (raccogli, fabbrica, compra, prendi in prestito), `Economia.buy`, il Magazzino | pallet e sacchi accanto al sito | .3 |
| **sgombra** | `ascia`*, `raccoglie` | caselle TREE → terra (`G.setTile`, come `Cantiere disbosca`); la legna in tasca | gli alberi spariscono, la terra battuta | .6 |
| **scava / spiana** | `scava`, `impasta`* | i livelli del suolo (`groundOf` del cantiere) | la buca, la terra smossa | .4 |
| **alza** | `cazzuola`*, `martella`, `porta_in_due`* | **pezzo per pezzo** i muri del catalogo (muro, finestra, porta), poi il tetto a caselle | la casa cresce di un pezzo ogni ora-uomo | .8 |
| **copre** | `martella` | tetto di coppi o lamiera | il tetto | .6 |
| **coltiva** | `zappa`, `annaffia`*, `semina`* | `st.covo.crops` (crescono da soli), l'alberello | l'orto, il giardino | .2 |
| **arreda** | `porta`, `porta_in_due`*, `rullo`* | arredi del Cantiere fuori; dentro il formato dei ritocchi (§4.4) | i mobili sul marciapiede, poi dentro | .3 |
| **abita** | `trasloca` = `porta` + furgone (`van`) | il nucleo cambia casa (§4) | il furgone, la luce accesa la sera | .2 |
| **paga / incassa** | `busta`*, `conta`*, `porge` | `Soldi.flow`, `scambi.deal`, `P.debt` | niente: lo sa chi c'era | .1 |
| **festeggia** | `balla`, `beve`, `discute` | `Iniziative` tavolata, il falò | la folla, il fuoco | .7 |
| **difende** | `aspetta` (palo), `alt` | la ronda di `imprese.js`, il cane | uno sulla porta | .3 |
| **nasconde** | `porta`, `siede_terra` | il baule, la cantina scavata | niente | 0 |
| **smonta** (lo sgombero) | `forza`, `porta` | `Cantiere.remove` al contrario, pezzo per pezzo | il cantiere che si svuota | .9 |

(* verbo da chiedere: finché non c'è, la catena di ripiego del §1.3.)

**La casa che cresce.** L'oggetto `casa` del catalogo (4×3) oggi è un blocco: aperto, poi finito. Nei progetti la
stessa casa si scrive come **pezzi**: 14 muri (con finestre e porta), 12 caselle di tetto, il pavimento. Ogni pezzo è
una voce vera del catalogo con la sua solidità e il suo prezzo. Finita, i pezzi si possono fondere in un solo modello
(meno disegni). Cosa ottiene il giocatore: torna il giorno dopo e la casa è più alta.

### 2.3 La squadra

- **Chi chiede**: il capo chiede prima al nucleo (`st.pop.households`), poi agli amici (`P.friends`), poi a chi gli deve un
  favore (`scambi.askHelp`), poi a chi sa fare (il mestiere: muratore, carpentiere, `BY_JOB`). Gli inviti sono quelli di
  `Iniziative` (amicizia, simpatia, noia, paura, il lavoro); l'impegno entra nella giornata (`P.impegni`).
- **I ruoli**: braccia, chi sa fare (raddoppia le ore), chi mette i soldi, chi presta l'attrezzo, il palo.
- **Le ore**: una fase avanza con le **ore-uomo** di chi c'è davvero. Lontano a conti fatti; vicino con i piani di
  `Azioni` (un passo, un verbo, una posa).

### 2.4 Quanto costa alla vita (i costi veri)

- **Il lavoro**: chi va al cantiere invece che in bottega arriva tardi o non arriva. `popolo.js` conta già `P.late` e a 4
  licenzia (`fire`, `popolo.js:815`). Non scriviamo niente: basta che il piano del progetto stia sull'orario di lavoro.
  Il licenziamento è un fatto con la sua causa: «ha perso il posto al forno (il cantiere al Lido)».
- **I soldi**: la roba si compra con soldi veri; se mancano si chiede un prestito (`Vita` prestito con debito),
  o allo Squalo (`P.debt`: poi passa il picchiatore della Famiglia, `fazioni.js giroEffects`).
- **La famiglia**: chi resta a casa si arrabbia (`feel rabbia`), la lite (`Azioni.quarrel`), la buca all'appuntamento.
- **La stanchezza**: dopo una giornata di cantiere l'umore `stanco` e la posa.

### 2.5 Il mondo che reagisce (l'occhio)

Ogni fase ha una **vista**. Ogni ora, per ogni progetto non legale:

`p(scoperta) = 1 − (1 − vista × vicinanza)^(passaggi)`

- **vicinanza**: quanto il sito è vicino a una strada, a un posto pubblico, al percorso di una ronda (`ordine.js`), al
  mare d'estate; di notte la vista vale meno, il rumore (martello, motore) di più.
- **passaggi**: i Grigi in ronda o in volante che passano entro 40 m, e **i vicini**: chi abita vicino vede, se lo segna
  (`note`), e se ce l'ha col capo (`opinionOf`) **denuncia** (la denuncia da lontano di `popolo.js:2083`).

Quando i Grigi lo sanno, il ramo si sceglie con i numeri che ci sono già:

| esito | quando | cosa succede (sistemi veri) | il segno |
|---|---|---|---|
| **non lo trovano** | la vista resta bassa | si va avanti | — |
| **ferma i lavori** | un Grigio onesto (`tr.legge` alto) | la fase si blocca; si può riprendere **di notte** (vista dimezzata, rischio doppio), come le iniziative vietate | il nastro, il cartello |
| **la mazzetta** | un Grigio comprabile (`tr.avid`, come `corrompi` di `game.js:1294` e `F.bribes` della Famiglia) | `Soldi.flow(…, 'mazzetta')`; il Grigio se lo segna `segreto` (e il ricattatore della Famiglia lo può trovare) | la busta |
| **il sequestro** | recidiva o un capo fermato | i pezzi segnati `o.seq` (non si usano), la roba al Garante (`Soldi.flow stato`) | sigilli, transenne |
| **la demolizione** | sequestro + nessuno paga entro una settimana | la fase **smonta**: operai del Garante e Grigi, pezzo per pezzo | il cantiere che si svuota, la folla |
| **il condono** | a lavori finiti: una tassa del Garante (una volta al mese, un fatto che tutti sentono) o la **Famiglia** che «sistema» (un favore da rendere) | il titolo passa da `abusivo` a `condonato` (§4) | il timbro, la festa |
| **l'abbandono** | soldi finiti, squadra sparita, il capo in cella | resta **un rudere** (il `moodOf` rudere degli interni esiste già): un altro lo può occupare | la casa a metà |

### 2.6 I modelli, non le storie

Un modello di progetto è **una lista di fasi con le condizioni**, non una trama. Le fasi sono sempre quelle del §2.2.
Il motivo e i rami vengono dal carattere, dai bisogni, dai fatti (come gli estri di `iniziative.js`).

**Cinque progetti grandi dalle stesse parti** (la casa al mare è solo il primo esempio della direzione, non un modello):

| progetto | nasce da | fasi | rischio | come può finire |
|---|---|---|---|---|
| **il chiosco sulla spiaggia** | ha vinto soldi, è disoccupato, l'estate | sceglie (spiaggia) → procura → alza (baracca di lamiere) → arreda (bancone, frigo) → incassa | vista alta, la spiaggia è pubblica | aperto e tollerato; il **pizzo** della Famiglia (§3); sequestro; lo vende |
| **la barca rimessa a nuovo** | eredita un gozzo marcio, vuole pescare (o scappare) | procura (legno, vernice) → lavora (`lavora`, `vernicia`) al molo → varo (festa) → pesca o **contrabbando** | basso, se non la usa per il contrabbando | pesca e vende al mercato; la Famiglia gliela chiede «in prestito»; la fuga di notte |
| **il matrimonio della figlia** | il fidanzamento (un fatto di `vita`) | colletta → debito → procura (vino, pane) → arreda (la sala) → festeggia | nessuno, ma i soldi | la festa e i regali; il debito con lo Squalo; la rissa del cugino; la casa nuova degli sposi (§4) |
| **l'occupazione della casa vuota** | sfrattato, una casa dell'Ente Case vuota da settimane | sceglie (registro: vuota) → forza → abita → arreda → difende | alto: è del Garante | resta (la Tutela chiude un occhio); lo sgombero (folla, `rannicchiato`, `mani_alzate`); la protesta (`trame.js`) |
| **la bisca in cantina** | vizio del gioco + debito | scava (la cantina, `Cantiere scavo_cantina` in casa) → arreda (tavolo, carte) → recluta → incassa | alto | rende; la Famiglia la vuole (o la prende); la soffiata e la retata |

Le cinque righe hanno **le stesse fasi**: cambiano il sito, la cosa, il rischio, chi entra nella catena.
Dalle stesse parti escono anche l'orto sul terreno del Garante, la cappella votiva al bivio, il garage-officina abusivo,
la casa del pescatore che diventa pensione.

### 2.7 Il taglio degli alberi (la vegetazione è di un'altra squadra)

Oggi **si può già**, senza toccare `vegetazione.js`: gli alberi sono caselle `T.TREE` della griglia, il Cantiere
abbatte con `G.setTile(tx, ty, GRASS)` (`cantiere.js:230`) e la vegetazione **non disegna gli alberi la cui casella non è
più TREE** (`vegetazione.js:1331`). I progetti fanno lo stesso, con la legna in tasca a chi taglia.
Quello che manca, da chiedere alla squadra della vegetazione:
1. `Vegetazione.abbatti(x, y)`: l'albero che cade (mezzo secondo, verso chi taglia) e **il ceppo** che resta;
2. `Vegetazione.sgombra(x, y, r)`: via erba, felci e cespugli bassi (la copertura bassa oggi resta sotto la terra battuta);
3. `Vegetazione.pianta(x, y, specie, stadio)`: il giardino a stadi (talea, alberello, albero) per specie del kit
   (oggi c'è `aggiungi`, ma è dati e senza crescita);
4. `Vegetazione.sporco(x, y)`: rifare gli elenchi subito (oggi si rifanno quando la camera si sposta di qualche metro).
Finché non arrivano: si taglia lontano dagli occhi o con la camera che si muove; il giardino si fa con l'orto e
l'alberello del Cantiere, che crescono già.

---

## 3. Il crimine con la sua struttura

### 3.1 Che cosa c'è (audit)

| sistema | file | struttura | iniziative proprie? |
|---|---|---|---|
| **la Famiglia** | `fazioni.js` | capo senza nome in una casa della periferia est, 3 fidati, 12 soldati (spaccio, picchiatore, ricatto, ricettazione), aiutanti temporanei, reclutamento solo dai fidati, tatuaggi, fedeltà, tradimento dopo la cella | **no**: giri fissi (`giroEffects`), notti fisse (`famNight`), paga il venerdì |
| **i soldi della Famiglia** | `fazioni.js`, `soldi.js` | sporco/pulito/tesoro, lavanderia e sala giochi come facciate (`washAt`), mazzette settimanali ai Grigi comprabili (`F.bribes`), ispezioni e sigilli della Tutela (`inspect`), il pizzo come fattura della «Vigilanza Tirrena» sui conti delle botteghe (`soldi.js:360`), macchinette nei bar, sette e mezzo alla bisca | il pizzo è un addebito settimanale su chi c'è già: **una bottega nuova non entra mai nel giro** |
| **lo Squalo** | `game.js:506` | Sandro, Rocco, Tano; il debito del giocatore; il Magazzino mercato nero (`economia.js:79`); poi assorbiti dalla Famiglia come fidati | no |
| **i debiti** | `popolo.js P.debt`, `scambi.js` | i picchiatori riscuotono a chi abita entro 120 m dal giro | no |
| **i giri di strada** | `popolo.js doGiro` | borsaiolo, ladro, spacciatore, ricettatore, orecchio; chi è licenziato può cominciare (`popolo.js:821`) | no |
| **le trame** | `trame.js` | scasso con ricognizione, palo, piede di porco, bottino nascosto e rivenduto (`fence`); insabbiare, infamare, tradire; l'agguato; la protesta | **sì, ma corte**: una notte, un colpo |
| **la rapina** | `parola.js RAPINA` | proposta, mandato, complici, il mezzo | sì, su richiesta |
| **l'Ordine** | `ordine.js` | turni, ronde, volanti, posti di blocco, documenti, perquisizioni, fermi, sequestri; la corruzione (solo il giocatore) | — |
| **la Risacca** | `risacca.js`, `fazioni.js` | 15 membri, collaboratori, cellule autonome; `contrabbando` è un compito di notte al porto | le cellule sì (scritte, collette, sabotaggi) |
| **le crew** | `writer_vita.js`, `iniziative.js §5` | PVK, BDS, TNT: guerre, crossaggi, omaggi | sì (la sera) |

**In sintesi**: c'è l'organigramma, c'è l'economia, c'è la polizia. Manca **la volontà**: nessuna organizzazione ha
uno scopo, un territorio che si allarga o si perde, dei nemici, e soprattutto **nessuna reagisce alle cose nuove**
(una bottega che apre, una casa abusiva, un carico al porto, un arresto).

### 3.2 L'organizzazione

```
Org = { id, nome, tipo, capo, ruoli {id: ruolo}, territorio {quartiere: influenza 0-1}, cassa {sporco, pulito},
        entrate {fonte: lire/settimana}, fame {soldi, rispetto, territorio, vendetta}, offese[], rapporti {org: -1…1},
        calore (quanto la Tutela la guarda), memoria[] }
```

- **La Famiglia non si riscrive**: `malavita.js` la **legge** (`st.fam`) e le dà la volontà. I ruoli sono i suoi,
  la cassa è la sua, gli uomini restano i suoi.
- **Organizzazioni nuove, piccole**, fatte con gli abitanti che ci sono (come i soldati della Famiglia):
  - **i contrabbandieri del porto** (3-5: un pescatore col gozzo, un portuale, un ricettatore): sigarette e benzina dalla
    nave (`ordine.js` la nave, `economia.js` le scorte), di notte, al Pontile Est;
  - **la banda di quartiere** (4-6 ragazzi senza lavoro, i più giovani della periferia): scippi, Vespe, il muro;
    la Famiglia li guarda come vivaio;
  - **le crew** (ci sono già) entrano come organizzazioni con un territorio fatto di muri.
- **Il territorio** si misura con i fatti: dove si riscuote, dove si dipinge, dove si spaccia. Sale con le riscossioni
  riuscite, scende con gli arresti, i rifiuti, le guerre perse.

### 3.3 Le iniziative del crimine (generate come le altre)

Stessi atomi di `iniziative.js`: **verbo × oggetto × motivo × forma**, stessa prova a secco, stessa catena.
Una volta decisa, ogni iniziativa del crimine **è un progetto** (§2): fasi, squadra, occhio, esiti.

| verbo | nasce dal fatto | fasi (verbi animati) | esiti |
|---|---|---|---|
| **pizzo** a una bottega nuova | `apre` (un chiosco, una bottega, un progetto finito) nel territorio | ricognizione (`osserva`) → la visita (`parla`, `afferra`*) → la risposta → incasso (`busta`*) o avvertimento (vetrina: `Game.npcThrow`) | paga (entra nella «Vigilanza Tirrena»); denuncia (`ordine`); chiede aiuto alla Risacca o all'altra banda |
| **contrabbando** al porto | la nave arriva, una banda ha un gozzo | procura (il carico) → notte (`porta`, `rema`*, `trascina`*) → nasconde (il magazzino, la cantina) → vende (Magazzino) | passa; il posto di blocco; il soffiatore (la mazzetta mancata) |
| **vendetta** | `arresto` per soffiata, `sgarro`, `furto` alla Famiglia | studia la giornata (come `trame.proposeAgguato`) → raduna → agguato (`brawl`) o infamia o incendio (`fire`) | la paura del quartiere; la guerra fra bande; la contro-vendetta (la catena) |
| **recluta** un ragazzo | `licenziato`, `debito`, il ragazzo ammira (opinione) | avvicina (`parla`, regala) → prova (un giro piccolo) → entra (aiutante, poi soldato) | entra; la madre lo viene a riprendere (`Vita.scambio`); la Risacca lo prende prima |
| **ricicla** | cassa sporca alta, calore alto | compra una proprietà (§4) o una bottega, la «ristruttura» (un progetto legale!) | la casa del capo-zona al mare; l'ispezione della Tutela trova il registro |
| **protezione** di un abusivo | un progetto abusivo nel territorio | visita → offerta («ci pensiamo noi coi Grigi») → incasso | il condono di famiglia (§2.5): il debito di favore dura |
| **spartizione / guerra** | due organizzazioni nello stesso quartiere | trattativa al bar (`discute`, `stretta`) o crossaggio, pestaggio, vetrine | il confine nuovo (il territorio), la tregua, l'intervento della Tutela |

Ogni passo è un fatto (`Vita.fatto(tipo, chi, dati, causa)`): la catena attraversa le organizzazioni, il quartiere, i
progetti, la proprietà. Un tetto: al massimo 3 iniziative del crimine vive in città, 1 entro 120 m dal giocatore.

---

## 4. La proprietà

### 4.1 Che cosa c'è (audit)

- **Le case**: ogni nucleo (`st.pop.households`) ha una casa (`home: bi`, un edificio) con la sua capienza
  (`popolo.js:271`). L'affitto lo prende **l'Ente Case del Garante** il lunedì (`soldi.js:190`): di fatto **tutte le
  case sono dello Stato**, nessuno possiede niente.
- **Lo sfratto non c'è**: dopo due insoluti arriva l'ufficiale giudiziario con due Grigi e si prende i contanti; poi
  solo la nota «se non paga, a fine mese lo sfrattano» (`soldi.js:210`). Nessuno trasloca mai.
- **L'eredità c'è a metà**: chi muore lascia la casa vuota a un nuovo arrivato, se il nucleo non c'è più
  (`popolo.js:455 newcomer`). Nessun parente eredita niente, né soldi né roba.
- **Le botteghe**: c'è chi ci lavora (`P.job`), non c'è un titolare. Le facciate della Famiglia sono «sue» solo nella
  testa di `fazioni.js`.
- **Il giocatore**: la casa sua (`st.me.home`), i campi reclamati coi picchetti (`Cantiere.claim`), le basi della
  Risacca. **Diventa base** tutto quello che sta in `st.covo.covi`: cantiere, baule, postazioni funzionano lì.
- **Le cose costruite dagli abitanti**: `iniziative.js` le segna `o.npc` in `st.covo.obj`, e le basi in `S(st).basi`.
- **Riarredare**: il Cantiere piazza già arredi **al chiuso** nel covo del giocatore (`lv 'in:b:f'`, mobili del kit
  `assets/mf`); lo Studio ha il formato a differenze per piano (`editor.js applyInterior`), ma vale per il mondo intero
  e non è esportato.

### 4.2 Il registro

```
st.prop.beni[chiave] = { chiave: 'b:<bi>' | 'o:<uid>' | 'c:<covo>', tipo: 'casa'|'bottega'|'terreno'|'baracca'|'barca',
  padrone: 'stato' | npcId | 'player' | orgId | 'eredi:<nucleo>', occupanti: nucleo, titolo: 'rogito'|'affitto'|'abusivo'|
  'condonato'|'occupato'|'sequestrato', affitto: { da, importo, insoluti }, valore, arredo: { piani: {f: delta} }, storia: [fatti] }
```

- **All'inizio**: le case dell'Ente Case restano dello Stato (come oggi); **una parte** (il 15-20%: le case basse, i
  casali, le famiglie anziane) è di chi ci abita; le botteghe sono del bottegaio più anziano; qualche casa vuota è di un
  emigrato (si vende), qualcuna della Famiglia (riciclata).
- **Il valore** viene da quello che c'è: grandezza (`cap`), quartiere, vista mare, stato (rudere), cosa è successo lì.

### 4.3 Le operazioni (tutte per abitanti e giocatore)

| operazione | come | sistemi veri | verbi animati |
|---|---|---|---|
| **vendere / comprare** | chi ha bisogno di soldi (debito, matrimonio, emigrare) mette in vendita; chi ha soldi (o la Famiglia che ricicla) compra. Trattativa con `scambi.deal`, il pagamento con `Soldi` (bonifico o contanti), la firma all'Ufficio Case con la tassa al Garante | `Soldi.xfer`, `scambi.deal`, la Tutela guarda chi paga in contanti | `discute`, `stretta`, `firma`*, `conta`* |
| **affittare** | il padrone affitta la casa vuota o una stanza; l'affitto passa ogni lunedì come quello dello Stato | `Soldi` (lo stesso giro dell'Ente Case, con un altro destinatario) | — |
| **sfrattare** | insoluti → l'avviso (`bussa`*) → l'ufficiale con i Grigi → il trasloco (il furgone, i mobili sul marciapiede, `porta`, `porta_in_due`*) → il nucleo va dai parenti, in una casa vuota, o **occupa** | `soldi.js` (già fino all'ufficiale), `ordine.js` (i Grigi), `eventi.js van` | `bussa`*, `porta`, `rannicchiato`, `discute` |
| **ereditare** | chi muore lascia la casa e la roba: al nucleo; se non c'è, a un parente (stesso cognome in un altro nucleo); se non c'è, allo Stato. Due eredi litigano (`Vita.scambio`), uno vende | `popolo.js newcomer` (si passa prima da qui) | `prega`, `piange`*, `discute` |
| **occupare** | la casa vuota o il rudere (§2.5 l'abbandono) | §2.6 l'occupazione | `forza`, `porta` |
| **riarredare** | §4.4 | | `porta`, `porta_in_due`*, `rullo`* |

### 4.4 Riarredare con tutti gli asset

- **Il formato è quello dello Studio**: per piano `mobili { chiave: {x,y,ry} | {togli} }` e `nuovi [{id,x,y,ry}]`, le
  chiavi come in `editor.js` (`id@x,y`). Il registro tiene il delta di ogni bene (`arredo`); si applica **solo quando
  qualcuno entra** (il giocatore), dopo `Interior.layout`, con lo stesso algoritmo di `applyInterior` (venti righe:
  da esportare da `editor.js`, o da copiare in `proprieta.js` finché non c'è) e `R.__ed.rebuildIndoor()`.
- **Il catalogo**: i ~276 oggetti `ia_*` di `interni_arte.js` (nomi in `Interior.FNAME`) e i mobili del kit
  (`assets/mf`: letto, divani, cucina, bagno, tv, radio, tappeti…), con le misure di `Interior.szOf`.
- **Gli abitanti riarredano per un motivo**: il matrimonio (il letto doppio, la credenza), l'eredità (via la roba del
  morto, la radio resta), il nuovo padrone (gli oggetti del suo `moodOf`: il funzionario mette il ritratto del Garante,
  il pescatore le reti), i soldi (la tv nuova). Lo si vede: il furgone, i mobili che entrano, il vecchio divano sul
  marciapiede (un oggetto del kit `t_Sofa` lasciato fuori un giorno).
- **Il giocatore** compra o eredita → il bene entra in `st.covo.covi` (`{id, name, x, y, r}`) → **diventa base**: il
  Cantiere al chiuso (arredi, postazioni, baule) funziona già lì.

### 4.5 La casa costruita diventa base

1. **Finita** (`o.wip` cancellato, o tutti i pezzi alzati) → entra nel registro: `o:<uid>`, titolo `abusivo`.
2. **Abitata**: il nucleo del capo ci si sposta (il trasloco), o ci dorme solo d'estate. *Manca* in `popolo.js` una casa
   che non sia un edificio: da chiedere un `homeT` a punto (o una casa «seconda», solo per i blocchi di svago e di sonno).
3. **Base per il capo**: il baule (la roba in `S(st).basi` di `iniziative.js`), il falò, l'orto, il giardino; gli amici
   ci tornano (le iniziative ci si appoggiano: la tavolata, la festa).
4. **Base per il giocatore**: se il capo gliela vende, gliela presta (un sì vero di `parola.js`) o se la prende dopo
   lo sgombero, entra in `st.covo.covi`.
5. **Valore e destino**: condonata vale, si vende, si eredita; sequestrata va all'asta del Garante (la compra la
   Famiglia per riciclare: la catena torna al §3).

---

## 5. Le prestazioni

**Tre livelli, come per gli abitanti.**

| livello | dove | cosa si calcola | quando |
|---|---|---|---|
| **lontano** | ovunque | solo numeri: ore-uomo, cassa, occhio, esiti; niente posizioni | una volta l'ora di gioco, a turno (un progetto per passo) |
| **in vista** | entro ~250 m o sulla mappa | i pezzi che compaiono (al cambio di fase, non a ogni ora) | quando una fase finisce |
| **vicino** | entro 84 m (il raggio pieno di `popolo.js`) | gli abitanti col piano di `Azioni`, un verbo alla volta; le battute entro 22 m | al massimo 2 progetti in scena |

**I tetti** (desktop con Iris Xe / telefono):
- progetti vivi in città: 12 / 6; del crimine: 3 / 2; in scena vicino: 2 / 1;
- pezzi del Cantiere degli abitanti in tutto: 60 / 30; per casa 26 pezzi **solo mentre cresce**: finita si fonde in un
  modello (`casa` del catalogo) / al telefono la casa cresce a **tre stadi** (fondamenta, muri, tetto) e non a pezzi;
- decisioni: una per organizzazione l'ora di gioco; il registro delle proprietà gira alle 6 del mattino;
- il riarredo solo quando il giocatore entra (mai per gli interni non visti);
- il registro dei fatti resta quello condiviso (500), i progetti finiti si riassumono in una riga di memoria.

**Il bilancio**: media sotto **0,1 ms** a passo (iniziative oggi 0,02), il passo più caro sotto **4 ms** (le prove a
secco si spezzano su più passi). Il costo grosso resta il disegno: ogni pezzo nuovo è una mesh; con la fusione a lavori
finiti il conto torna a quello di una casetta. Da misurare con `src/test_progetti.js` in Node (3 giorni, semi 1-2) e poi
nel browser col banco dei tempi.

---

## 6. Il piano

Tutto in file nuovi, dietro `?commedia`, dopo `iniziative.js`, fuori dall'impronta; le prove in Node.

| passo | cosa | file | giorni |
|---|---|---|---|
| 1 | `VERBI_ANIM`, la catena di ripiego, il contatore dei verbi mancanti; il sequenziatore (passi di `Azioni` + segni del mondo) | `progetti.js` | 1 |
| 2 | il motore: modello, fasi, ore-uomo, squadra (inviti di `Iniziative`), cassa, costi della vita (lavoro, debito, famiglia); un modello (l'orto sul terreno del Garante) | `progetti.js`, `test_progetti.js` | 2 |
| 3 | l'occhio e i rami: scoperta, fermo, notte, mazzetta, sequestro, demolizione, condono del Garante, abbandono | `progetti.js` | 1,5 |
| 4 | la casa che cresce pezzo per pezzo; la fusione; i tre stadi al telefono; nastro e cartello coi pezzi che ci sono | `progetti.js` | 1,5 |
| 5 | il registro delle proprietà, i padroni iniziali, l'affitto fra privati, lo sfratto vero, l'eredità | `proprieta.js`, `test_proprieta.js` | 2 |
| 6 | comprare e vendere (abitanti e giocatore), la base del giocatore, la casa costruita nel registro | `proprieta.js` | 1,5 |
| 7 | il riarredo a delta, applicato all'ingresso; i motivi per riarredare; il trasloco col furgone | `proprieta.js` | 1,5 |
| 8 | le organizzazioni: la Famiglia letta, due bande nuove, il territorio, le sette iniziative del crimine | `malavita.js`, `test_malavita.js` | 3 |
| 9 | i cinque modelli del §2.6, le battute (in `TONO.md`), la regia, le misure, la tavola con le foto | tutti | 2 |
| | **totale** | | **16 giorni** |

L'aggancio (`index.src.html`, una riga per file, e `build.py TASS_FUORI`) si fa alla fine, con l'ok, come per
`vita.js` e `iniziative.js`.

### Le richieste alle altre squadre

**Personaggi e animazioni** (ramo `personaggi9`):
1. i verbi del §1.4, prima la priorità A (ascia, cazzuola, porta_in_due, rullo, busta);
2. accendere la clip `Interact` del kit (bussare, girare la chiave) e dire come chiederla da una posa (`Anim.want`);
3. una posa «a due» sincronizzata (`porta_in_due`, `afferra`, `abbraccia`): chi guida e chi segue.

**Vegetazione**: `abbatti` (la caduta e il ceppo), `sgombra` (la copertura bassa), `pianta` a stadi, `sporco` (§2.7).

**Render e interni**:
1. esportare `applyInterior` da `editor.js` (o dire dove metterlo), e un `rebuildIndoor` pubblico;
2. nel Cantiere, uno **stadio** per `wipLook` (fondamenta, muri a metà, tetto) da usare al telefono e lontano;
3. tre segni piccoli: il nastro bianco e rosso fra due paletti, il cartello «SEQUESTRO», il cumulo di mobili sul
   marciapiede (oggi ci si arrangia con transenne e coni del kit `mk`).

**Popolazione** (`popolo.js`): una casa a punto (`homeT` non edificio) o una «seconda casa» per i blocchi di sonno e
svago; un aggancio per il trasloco di un nucleo.

**La Mente** (server): `kind: 'progetto'`, come `iniziativa` (facoltativo, spento).

---

## 7. Come nasce (una catena, dall'inizio)

*Il chiosco delle granite, quattro giorni. Niente è scritto: ogni riga è un fatto di un sistema, la causa della dopo.*

1. **Lunedì 18:00.** La lotteria della capra alla Calata (`iniziative.js`): vince **Gino**, pescatore senza barca.
   Rivende la capra al macellaio: 40.000 lire. *(fatto: vince → vende)*
2. **Lunedì 21:00.** Al bar, Gino si mette in testa **il chiosco delle granite** sulla spiaggia del Lido (`progetti.js`,
   motivo: soldi in tasca, disoccupato, estate). Prova a secco: lamiere, assi, un frigo (lo vende la Ferramenta), il
   sito libero. Passa. *(fatto: progetto)*
3. **Martedì 7:00.** Chiede al nucleo: il figlio **Toni** (fornaio) e la cognata **Rina** dicono sì. Toni lascia il forno
   alle 7: `P.late` sale. Sulla spiaggia: `porta`, `carriola`, `martella`; i pallet e le lamiere compaiono, poi la
   baracca di lamiere cresce a pezzi. *(verbi: porta, carriola, martella; il mondo: pallet, muri)*
4. **Giovedì 6:30.** Quarto ritardo: Toni è **licenziato** dal forno (`popolo.js fire`). Rina lo dice a tutti al mercato.
   *(fatto: licenziato, causa: il chiosco)*
5. **Giovedì 11:00.** Il chiosco apre: Gino dietro il bancone (`bancone`), la fila dei bambini. *(fatto: apre)*
6. **Giovedì 16:00.** La Famiglia sente «apre» nel suo territorio (`malavita.js`): un picchiatore fa la ricognizione
   (`osserva`) e poi la visita: «Bel posto. Sarebbe un peccato.» Gino non paga. *(iniziativa: pizzo)*
7. **Giovedì 23:00.** La vetrina del chiosco (`Game.npcThrow`): il vetro rotto resta per terra fino a domani.
   *(fatto: avvertimento)*
8. **Venerdì 9:00.** Rina va dai Grigi. Il Grigio che viene a vedere è uno di quelli comprabili (`tr.avid`): invece di
   cercare chi è stato, nota che il chiosco **non ha la licenza**: o 20.000 lire o i sigilli. *(occhio → la mazzetta)*
9. **Venerdì 10:00.** Gino non ce le ha più: chiede **allo Squalo** (`P.debt`). Paga il Grigio (`busta`).
   *(fatto: debito, mazzetta; il Grigio si segna un `segreto`)*
10. **Sabato.** Toni, senza lavoro e con il padre nei debiti, accetta un giro come **aiutante** della Famiglia
    (`fazioni.js takeHelper`): la riscossione è proprio al Lido. *(iniziativa: recluta, causa: licenziato + debito)*
11. **Lunedì.** Un ricattatore della Famiglia trova il `segreto` del Grigio (`giroEffects ricatto`): ora il Grigio
    deve un favore anche lui. Gino paga il pizzo ogni settimana, come fattura della «Vigilanza Tirrena». Il chiosco
    resta aperto, **condonato** dalla Famiglia.

Il giocatore può entrare in qualunque punto: comprare una granita e sentire Gino che si lamenta, prestargli i soldi
prima dello Squalo, dire a Rina di non andare dai Grigi, fotografare il Grigio con la busta, comprarsi il chiosco quando
Gino è in cella. Ogni scelta è un fatto nella stessa catena.

---

## 8. Le decisioni aperte

1. Quanti progetti grandi al giorno in città (proposta: 2-3 nuovi, 12 vivi)?
2. La casa che cresce a pezzi: piace come racconto, o meglio i tre stadi anche sul desktop (meno mesh)?
3. Quante case sono dei privati all'inizio (15-20%)? E il Garante vende le sue?
4. Il condono del Garante: un fatto mensile per tutti, o solo su richiesta (con la fila all'Ufficio Case)?
5. La Famiglia può comprare case e botteghe col denaro sporco (il riciclaggio diventa visibile in città)?
6. Il giocatore può fare un progetto lui, con una squadra di abitanti (la stessa macchina), o resta solo col Cantiere?
