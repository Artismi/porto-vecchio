# Parola e azione: quello che si dice si fa (progetto, 8 novembre)

Richiesta di Andrea: «Le parole e le azioni devono corrispondere: quello che i personaggi dicono lo devono fare, e quello
che gli scrivi in chat, o nella chat della banda, devono agire di conseguenza.»

Questo è solo un progetto: non ho toccato il gioco. Tutto quello che segue va sotto il flag **`?parola`**, che si accende
anche con `?commedia`. Senza flag il gioco resta com'è. I percorsi sono relativi a `v7/`. La prova del comportamento di
oggi è `scratchpad/parola/chat0.js` (copia del `chat.js` dell'audit, mappa nuova, ore 11:23), con l'uscita in `chat0.txt`.

**La regola, in una riga: prima il fatto, poi la parola.** Nessun personaggio dice «sì», «vado», «ci penso io»,
«te lo porto» o «offro io» prima che il motore abbia controllato che si può fare e abbia fatto partire la cosa. La battuta
si sceglie dall'esito, mai prima. Ogni sì diventa una **promessa**: un oggetto che il giocatore vede, che il motore porta
avanti e che, se va male, torna indietro come rapporto e come memoria.

**Il centro del progetto sono i mandati** (§0). Andrea: «devo potergli dire anche cose molto generiche, tipo "serve fare
soldi per la cassa comune e reclutare due nuovi compagni", e quel personaggio parte e a modo suo lo fa». Un verbo
singolo («scrivi l'onda in piazza») è il caso piccolo. Il caso che conta è l'**obiettivo aperto**: il personaggio
lo accetta o lo contratta, lo spezza da solo in un piano di più giorni fatto di azioni vere del motore, **scelte dal
suo carattere**, e lo racconta mentre lo fa. Le sezioni 2-4 sono i mattoni (intento, verifica, promessa, rapporti); il
§0 dice come si mettono insieme.

---

## 0. Il centro: i mandati (gli obiettivi aperti)

### 0.1 Cos'è un mandato

Un mandato è una promessa grande: «fai soldi per la cassa», «trovami due compagni», «scopri chi è l'Orecchio».
Non dice **come**. Il come lo sceglie il personaggio, e per questo due personaggi diversi fanno due cose diverse con lo
stesso ordine: l'onesto fa i turni in più o vende la Vespa, il lestofante mette su uno scasso con gli amici, quello che
ha parlantina fa la colletta, il giocatore d'azzardo va alla bisca e magari perde tutto.

```js
// st.parola.mandati[]: in memoria, come le promesse (§2.4)
{
  id: 'm3',
  chi: 'beppe' | 'banda',                  // un personaggio, o la banda intera (§0.6)
  tipo: 'soldi',                           // uno dei modelli del §0.2
  obiettivo: { misura: 'cassa', quanto: 100, base: 41 },   // cosa conta: 100.000 lire in più rispetto a 41 di partenza
  vincoli: { pulito: false, entro: st.t + 3 * 1440, niente: ['picchia'], budget: 0 },     // dalla frase (§0.4)
  metodo: { id: 'turni_e_vendita', etichetta: 'turni in più all\'officina e la Vespa', perche: ['onesto', 'ha un mestiere', 'ha una Vespa'] },
  fasi: [                                   // il piano, scritto al momento dell'accettazione e rivisto ogni giorno
    { i: 0, cosa: 'ripara', args: { ore: 4 }, quando: 'dopo il lavoro', stima: 24, stato: 'fatta', promessa: 'p40', reso: 26 },
    { i: 1, cosa: 'vendi_mezzo', args: { mezzo: 'vespa' }, quando: 'domani mattina', stima: 60, stato: 'in_corso', promessa: 'p41' },
    { i: 2, cosa: 'ripara', args: { ore: 4 }, quando: 'domani sera', stima: 24, stato: 'da_fare' } ],
  progresso: { fatto: 26, su: 100 },        // calcolato dal motore (la cassa vera), non dichiarato
  stato: 'accettato' | 'in_corso' | 'riuscito' | 'riuscito_in_parte' | 'fallito' | 'abbandonato' | 'annullato',
  rapporti: [ { t, testo: 'Ventisei dalle Vespe di oggi. Domani vendo la mia.', k: 'parziale' } ],
  conseguenze: [],                          // arresti, soldi persi, un Orecchio dentro… (§0.5)
  thread: 'beppe' | 'banda', canale: 'chat' | 'banda'
}
```

Le fasi sono **intenti** (§2.1) e ognuna, quando parte, passa dalla stessa verifica (§2.2) e diventa una promessa normale
(§2.4) con `mandato: 'm3'`. Il mandato non esegue niente da solo: decide **cosa fare dopo** e conta il progresso
**dallo stato vero** (la cassa, `R.members`, le scorte, la memoria), non da quello che il personaggio dichiara.

### 0.2 I modelli di mandato (cosa si può chiedere)

Ogni modello ha una misura che il motore sa contare e una lista di **metodi**. Ogni metodo è una sequenza di fasi fatte di
verbi del §3, di progetti di Popolo (`PROJ`, `popolo.js:1311`, passi `go`/`save`/`meet`, partono con `startProject`,
`:1398`), di trame (`trame.js`), di imprese (`imprese.js`) e di commissioni (`commissioni.js`).

| Modello | Si riconosce da | Misura (dal motore) | Metodi (fasi) | Durata tipica in giorni di gioco* |
|---|---|---|---|---|
| **soldi** | «soldi», «la cassa», «ci servono lire», «fai cassa» | `st.ris.cassa` − base | **turni** (`lavora` col mestiere, `ripara`, `pesca`); **vendi_roba** (vende la sua roba in più al mercato, `Scambi.market`; o il mezzo, [NUOVO] `vendi_mezzo` sopra `ownVeh`, `popolo.js:1154`); **colletta** (`colletta` della Risacca o `Imprese` `colletta`, `imprese.js:65`); **mercato nero** (`mercato`, `contrabbando`); **scasso** (`Trame.proposeScasso` con lui capo, `trame.js:58`, ruoli palo/porta, `:71`; o `scasso` della Risacca); **bisca** (`bisca`, guadagno da −20 a +60 l'ora, `risacca.js:1118-1120`); **prestito** (lo Squalo: soldi subito e un debito vero in `P.debt`); **ricatto** (`fotografa` + `ricatta`) | 1-3 |
| **recluta** | «reclutare», «trovami N compagni», «gente nuova» | membri nuovi entrati dopo il mandato (`join` con `how` = mandato) | **amici** (i `P.friends` con odio per la Tutela alto: `recluta`); **osteria** (sere al bar o all'osteria, chiacchiere con chi è arrabbiato: `Azioni.social` + `recluta`); **famiglie dei fermati** (chi ha un parente alla Rocca: `PROJ.notizie`, `popolo.js:867`); **piazza** (`volantina` + `diffondi_voce`, poi chi si avvicina); **lavoro** (i colleghi del suo mestiere) | 2-5 |
| **procura** | «procura», «trovami», «ci servono» + una cosa (vernice, attrezzi, armi, radio, medicine, documenti) | scorte (`totalRes`) | **compra** (con la cassa; se la cassa non basta, diventa un mini-mandato soldi); **ruba** (`ruba`, `recupera`, `rovista`); **ricettatore** (un contatto col `P.giro` ricettatore o trafficante, `popolo.js:383`); **produci** (stamperia, officina, falsari: `produci`); **armi** solo dalla Famiglia (`game.js:1261`) o dall'armeria, mai per caso | 1-2 |
| **orecchio** | «scopri chi è l'Orecchio / chi parla / chi ci vende» | trovato quando dice il nome di chi ha davvero `P.giro === 'orecchio'` o `CARDS[id].informer` | **guarda la Zia** (`sorveglia` del Bar Sirena e annota chi le parla); **pedina** i sospetti (§3); **trappola** (`diffondi_voce` falsa a un solo sospetto, poi si guarda se arriva una perquisizione o un controllo lì: usa il sistema delle perquisizioni, `risacca.js:1330`); **chiacchiere** (chi è chiacchierone chiede in giro: `racconta` dalla memoria degli altri) | 2-4 |
| **proteggi** | «proteggi», «stai vicino a», «che non gli succeda niente» + persona o base | nessun danno alla persona/base fino alla scadenza | **scorta** (pedina a 3 m, `pedina{keep:3}`); **guardia** (`proteggi` della base); **avvisa** (veglia sui Grigi vicino a lei); **nascondila** (la porta in base o in cripta: `nasconditi` per lei, solo se si fida) | fino alla scadenza (1-3) |
| **morale** | «tira su il quartiere», «la gente deve sentirci», «fatti sentire» | `st.ris.morale` − base, e `onde` | **muri** (`scrivi_onda`, `dipingi`); **carta** (`produci` + `volantina`); **radio** (`trasmetti`); **feste** (`Imprese` `cena` per il vicinato, `imprese.js:86`); **aiuto** (colletta per una famiglia nei guai, che alza la stima più del morale) | 1-3 |
| **base** | «trovaci un posto», «ci serve una base» | una base viva in più | `rivela_spazio` (chi lo sa), `rovista` per trovarne, `scassina` + `occupa`, o un cantiere (`costruisci`) | 1-4 |
| **libera** | «tira fuori X» | X fuori dalla cella | `procura documenti` poi `libera`; o `ricatta` un Grigio | 1-2 |
| **sapere** | «scopri cosa fa X», «dove va la Pardo la sera» | un rapporto con fatti veri dal `P.plan` e dagli incontri di X | `pedina`, `sorveglia`, chiedere ai pettegoli | 1-2 |

\* Una giornata di gioco dura circa 20 minuti veri (`MIN_PER_SEC = 1.2`, `game.js:8`). Un mandato normale dura quindi da
mezz'ora a un'ora e mezza di gioco vero: abbastanza per vederlo succedere, non così poco da sembrare un ordine. La
scadenza di default è 3 giorni; il giocatore la cambia con la frase («entro venerdì») o nel Taccuino.

### 0.3 Come il carattere sceglie il metodo

Per ogni metodo, `Parola.metodi(st, n, tipo)` dà un punteggio. I numeri sono quelli che il motore ha già:

```
punteggio(metodo) = Σ pesi del carattere              (n.tr: legge, cor, avid, loq; per i membri n.ris.ideo)
                  + abilità                            (mestiere CARDS[id].mestiere / P.job; gusti CARDS[id].likes;
                                                         interessi P.ints: 'carte', 'giochi' per la bisca, 'motori' per ripara)
                  + mezzi                              (ha la Vespa? attrezzi? soldi suoi? un telefono?)
                  + contatti                           (P.friends; chi del suo P.giro; chi gli deve un favore: P.debiti)
                  + volontà dei verbi del metodo       (will() di ogni fase, §2.2, con la Repressione di adesso)
                  − rischio × (1 − coraggio)
                  − tutto quello che i vincoli vietano (§0.4: il metodo sparisce)
                  + un po' di caso (±.1), così la stessa persona non fa sempre la stessa cosa
```

Le regole dure: un metodo con un verbo nei `never` della scheda non si sceglie mai (Garza non ruba, `risacca.js:194`;
Lupo non fa contrabbando). Chi ha `legge > .6` non sceglie metodi illegali. Uno scasso serve che lui **abbia** due complici
che lo seguirebbero (lo stesso calcolo di `trame.js:229`). La bisca si sceglie solo se ha il vizio (interesse `carte` o
`giochi`, oppure `avid > .7`).

| Esempio (soldi) | Carattere | Metodo che vince |
|---|---|---|
| Candela (Dorino, meccanico) | legge medio, mestiere officina 9 l'ora, ripara a 12, ha la Vespa | **turni** all'officina; se in 2 giorni non basta, **vende la Vespa** |
| Betamax (Gigi) | avido, legge basso, videoteca, debiti | **mercato nero**; se c'è merce poca, **contrabbando** di notte |
| Vinile (Rita) | parlantina alta, odio per la Tutela alto | **colletta** alla Luna e sulla passeggiata |
| Un abitante col `giro` ladro | legge basso, coraggio alto, due amici dello stesso giro | **scasso** con la trama, lui capo |
| Un abitante con l'interesse `carte`, avido | | **bisca**: può raddoppiare o tornare senza niente |
| Garza (Bonaria, medico) | legge alto, never ruba | **turni** all'ambulatorio; mai altro |

**Nessuno fa quello che non sa fare.** Un abitante senza mestiere e senza amici, con il mandato «soldi», ha un solo
metodo: vendere qualcosa. Se non ha niente da vendere, risponde con l'esito `contratta{tipo:'mezzi'}` («Con cosa, con la
faccia? Dammi qualcosa da vendere.»), oppure chiede che sia un altro a farlo.

### 0.4 Dalla frase al mandato

La frase di Andrea, «serve fare soldi per la cassa comune e reclutare due nuovi compagni», fa **due mandati** (soldi,
recluta N=2) dati alla stessa persona. Il personaggio può prenderli tutti e due, uno solo («Soldi sì. Reclutare no, io
non so parlare con la gente»), o prenderli in ordine («Prima i soldi, poi la gente»).

- **Senza IA**: `Parola.capisciMandato(testo)` riconosce il modello dalle parole della tabella 0.2, il numero (cifre o
  «due», «un paio», «qualche»: 3), la scadenza («entro venerdì», «per domani», «in settimana») e i **vincoli**: «senza
  casini», «pulito», «niente furti» → `pulito: true` (via i metodi illegali); «niente botte» → via `picchia`; «non
  spendere» → `budget: 0`; «fai come vuoi» → nessun vincolo.
- **Con l'IA**: il kind `mandato` (§4.4) restituisce i mandati, i vincoli, il metodo e le fasi. **Il motore controlla
  tutto**:
  - il metodo deve essere uno di quelli che il carattere permette (§0.3); altrimenti vale quello del modello senza IA;
  - ogni fase deve usare un verbo del §3 o un progetto noto, e passare la verifica a secco quando viene il suo momento;
  - una fase impossibile (un verbo che non c'è, un luogo inventato) si toglie, e il piano si ricompone col modello;
  - le stime (quanto rende, quanto dura) le rifà il motore: l'IA non può dire «in un'ora faccio centomila».
- **L'esito del mandato** passa dalla stessa logica del §2.2, con una volontà di mandato: la media delle volontà delle
  fasi del metodo scelto, più la fiducia, più la lealtà per i membri. Accetta, contratta (vuole tempo, soldi per
  cominciare, un aiuto, meno vincoli: «Pulito? Allora ci metto una settimana.»), rifiuta (con il motivo), chiede («Quanti
  soldi? Per comprare una Vespa o per farla saltare?»).
- **Chi può prendere un mandato**: i membri, sempre. Gli abitanti solo per i modelli che sono anche loro interessi
  (soldi per una colletta di quartiere, morale, proteggi un amico comune) e con fiducia > .4 o un favore da ricambiare.
  Per gli abitanti il mandato diventa un **progetto di Popolo** (`startProject` con un `def` costruito dalle fasi), così
  entra nella loro giornata come gli altri progetti e si interrompe, si ripete o fallisce allo stesso modo
  (`popolo.js:1403-1423`).

### 0.5 Come va avanti, e come va storto

**Il ciclo**. Ogni ora di gioco, per ogni mandato `in_corso`:
1. se il personaggio è libero (nessun compito, non al lavoro, non dorme: `P.plan`), parte la fase dopo; altrimenti si
   aspetta;
2. si ricalcola il progresso **dallo stato**;
3. ogni sera alle 22 il personaggio **rivede il piano**: se il metodo rende meno della stima (meno della metà), ne prova un
   altro dalla lista, e lo dice («Le Vespe non bastano. Domani vendo la mia.»); se ha rischiato grosso e gli è andata male,
   cambia per prudenza o, se ha coraggio e rabbia, rilancia;
4. il mandato finisce quando la misura arriva all'obiettivo (`riuscito`), alla scadenza (`riuscito_in_parte` se è a metà
   o più, sennò `fallito`), o quando il personaggio non ha più metodi (`abbandonato`, con il motivo).

**I rapporti** usano il ritmo del §2.5, più quattro tipi propri:

| Tipo | Quando | Esempio |
|---|---|---|
| `piano` | all'accettazione | «Faccio così: due sere all'officina, e se non basta vendo la Vespa.» |
| `parziale` | ogni fase finita con un risultato | «Ventisei dalle Vespe di oggi.» · «Ho trovato uno, Tonino del porto. Ci sta pensando.» |
| `cambio` | quando cambia metodo | «L'officina non rende. Passo al piano B.» |
| `finale` | alla fine | riepilogo con i numeri del motore: «Cassa: +104.000. Due notti all'officina, la Vespa a Nico per 70. Adesso vado a piedi, ricordatelo.» |

**Le conseguenze** sono quelle vere del motore, non scritte apposta:

| Cosa succede | Da dove viene | Cosa resta |
|---|---|---|
| lo arrestano durante una fase | `jailMember` (`risacca.js:844`), una trama scoperta | mandato sospeso; il giocatore può `libera`; la fase è `fallita{pericolo}` |
| perde i soldi alla bisca | `WORK.bisca`, guadagno negativo | `progresso` scende sotto zero: «Ho perso diciotto. Lo so. Lo so.» |
| vende la Vespa | [NUOVO] `vendi_mezzo` | la Vespa cambia padrone davvero; lui va a piedi; la volontà per i verbi «in Vespa» scende |
| prende un prestito dallo Squalo | `P.debt` (`PROJ.debito`, `popolo.js:1320`) | il giovedì all'alba arriva lo Squalo anche per lui (`game.js:8`) |
| recluta un Orecchio | `join` di chi ha `P.giro === 'orecchio'` | chi è prudente pedina un giorno prima di reclutare e se ne accorge; chi ha fretta no: Repressione +, esposizione delle basi + (la stessa regola di `DO.recruit`, `risacca.js:656`), e lo scopri dalle perquisizioni |
| la colletta fa arrabbiare i Grigi | `riskEvent('colletta')` | Repressione +, un controllo |
| ci riesce | | fiducia e lealtà come in §2.5, più una voce che gira nel quartiere (Coro): «Dorino s'è venduto la Vespa per la Risacca» |

**I risultati parziali contano.** Un mandato chiuso a metà dà il riepilogo di quello che c'è, senza fingere: «Sessanta su
cento. Il resto è nella Vespa che non ho più.».

### 0.6 Un mandato a tutta la banda

«Ragazzi, servono soldi per la cassa e due compagni nuovi. Entro venerdì.» nella chat della banda (§2.7):

1. **Si divide.** Il motore calcola per ogni membro il punteggio del metodo migliore per ogni mandato, e la **parte** che
   può fare entro la scadenza (le stime del §0.2). I soldi si spezzano in quote; il reclutamento in persone.
2. **Si offrono.** Ognuno dice cosa prende, nell'ordine dei punteggi: prima chi è più adatto e più volenteroso. Chi è
   stanco, in cella o ha già un mandato dice di no o non risponde (è vero).
3. **Litigano, quando c'è da litigare.** Il motore cerca i conflitti reali:
   - **stesso contatto**: due vogliono reclutare lo stesso amico, o vendere allo stesso ricettatore;
   - **metodo che mette in pericolo gli altri**: uno sceglie uno scasso, e chi ha la linea Prudenza o la paura alta
     obietta, perché lo scasso alza la Repressione anche per lui;
   - **troppi sullo stesso mestiere**: due alla bisca, nessuno al lavoro.
   Chi obietta lo dice una volta. Se chi ha scelto ha coraggio alto e lealtà più bassa di chi obietta, cambia metodo
   («Va be', niente scasso. Contrabbando.»); se ha coraggio alto e lealtà più alta, insiste, e il motore lascia fare.
4. **Il referente.** Il membro con lealtà e parlantina più alte scrive il riepilogo della divisione («Allora: Candela e
   Betamax i soldi, Vinile e Cono la gente. Io controllo che nessuno faccia cazzate.»). Diventa lui quello che manda
   i rapporti di tutta la banda, mentre ognuno manda i suoi parziali.
5. **Un solo mandato, tanti pezzi.** Il mandato ha `chi: 'banda'` e un `sotto[]` per membro; il Taccuino mostra la barra
   comune e le barre di ognuno.

### 0.7 Cosa vede il giocatore: il Taccuino, scheda «Mandati»

Accanto a «Parola data» (§2.8) c'è la scheda **«Mandati»**, un riquadro per ogni mandato:
- **titolo e chi**: «Soldi per la cassa · Candela · entro giovedì sera»;
- **a modo suo**: il metodo in una riga, con il perché («turni in più all'officina e la Vespa · è onesto, ha un
  mestiere, ha una Vespa»);
- **la barra**: «62 su 100.000», calcolata dalla cassa vera; per la banda, la barra comune e quelle di ognuno;
- **la storia**: i rapporti in ordine, con l'ora («mar 21:40 · Ventisei dalle Vespe di oggi.»);
- **le conseguenze**, in rosso quando ci sono («Vespa venduta», «Betamax in cella», «Repressione +6»);
- tre bottoni: **Vincoli** (pulito / niente botte / non spendere), **Più tempo**, **Lascia stare** (annullato, non
  rotto: nessuna perdita di fiducia se lo fai prima che cominci una fase).

Sopra il personaggio, l'etichetta del §2.8 porta il mandato: «≋ Candela · ⟳ soldi 62/100».

### 0.8 Sei mandati, passo per passo

Nel tono di TONO.md. A destra, in corsivo, cosa fa il motore.

**1. Soldi, l'onesto (Candela).** Martedì 18:10.
> **Nino**: Candela, servono soldi per la cassa. Un centinaio. Entro giovedì.
> **Candela**: Cento? Io aggiusto Vespe, non stampo lire. *(contratta? no: volontà .31, accetta)* Due sere in officina. Se non basta, vendo la mia. Tanto il freno davanti non va dal '79.
> ↩ *mar 23:50* **Candela**: Ventisei. Il figlio del farmacista ha piegato un cerchione, Dio lo benedica. *(fase `ripara` 4 ore, +26 nella cassa)*
> ↩ *mer 22:00* **Candela**: Le Vespe non bastano. Domani vendo la mia. *(revisione serale: 51/100, metodo B)*
> ↩ *gio 10:30* **Candela**: Venduta a Nico. Settanta. Ha contrattato come se fosse sua madre. *(`vendi_mezzo`: la Vespa ha un padrone nuovo)*
> ⚙ *gio 10:31* Mandato riuscito: cassa +121.000. Candela adesso va a piedi.

**2. Soldi, il lestofante (un abitante col giro ladro, Totò Fadda).** Gli dai il mandato perché ti deve un favore.
> **Nino**: Totò, mi servono soldi. Per una causa.
> **Totò**: Per una causa no. Per me sì, e la causa è quella. Lascia fare a me e non chiedere. *(metodo **scasso**: ha due amici del giro che ci stanno)*
> ↩ *giorno dopo, 16:00* **Totò**: Sono passato davanti alla Ferramenta. Il padrone chiude alle sette e si fida della serranda. *(la ricognizione di `trame.js`)*
> ↩ *02:40* **Totò**: Dentro. Pino fa il palo, ma guarda più le ragazze che la strada.
> ↩ *03:20* **Totò**: Quaranta. Il resto è roba, la vendo al Magazzino. *(bottino nascosto in casa sua, poi venduto)*
> ↩ *due giorni dopo* **Totò**: Pino ha parlato. Io sto alla Rocca. Tu non mi conosci. *(un complice tradisce: `trame.js` «tradire»; Totò arrestato; mandato `riuscito_in_parte`, 40/100, conseguenza: Totò in cella)*

**3. Soldi, il giocatore (Betamax con l'interesse per le carte).**
> **Nino**: Betamax, la cassa piange.
> **Betamax**: Dammi venti e stanotte te li faccio diventare cento. Ho un metodo. *(contratta{soldi:20}, metodo **bisca**)*
> *[Paga 20.000]*
> ↩ *00:30* **Betamax**: Siamo a sessanta. Ho la mano calda, tesoro.
> ↩ *02:10* **Betamax**: Siamo a quaranta.
> ↩ *03:00* **Betamax**: Siamo a zero. Il metodo va rivisto. *(`WORK.bisca` negativo: −20 nella cassa, mandato `fallito`; nel Taccuino: «Betamax ha perso 20.000 alla bisca»)*

**4. Reclutare due (Vinile, parlantina alta).**
> **Nino**: Vinile, trovami due compagni. Gente seria.
> **Vinile**: Seri non ne conosco. Arrabbiati sì, vanno bene lo stesso? *(accetta, metodo **osteria + famiglie dei fermati**)*
> ↩ *mer 21:15* **Vinile**: Ho trovato uno, Tonino del porto. Gli hanno preso il fratello. Ci sta pensando. *(`recluta`: `ch` sotto la soglia, `bond` +.05)*
> ↩ *gio 20:40* **Vinile**: Tonino ci sta. Porta anche il cugino, ma il cugino parla troppo. *(Tonino entra; il cugino ha `P.giro` orecchio)*
> **Nino**: Il cugino aspetta.
> **Vinile**: Troppo tardi, tesoro. L'ho già abbracciato. *(il mandato era senza «prudenza» e Vinile ha fretta: il cugino entra; Repressione +15, esposizione delle basi +.3)*
> ↩ *sab 06:00* ⚙ Gli Orecchi hanno parlato: perquisizione alla Cantina fra un'ora. *(la conseguenza arriva dal sistema di sempre)*

**5. Scoprire l'Orecchio (Divisa, prudente).**
> **Nino**: Divisa, qualcuno ci vende. Trovalo.
> **Divisa**: Tre giorni. E nessuno sa che lo sto cercando. Nemmeno tu, da adesso. *(accetta, metodo **guarda la Zia + trappola**)*
> ↩ *mer* **Divisa**: Alla Zia parlano in quattro. Uno ha la giacca della Videoteca.
> ↩ *gio* **Divisa**: Ho detto a uno solo che la radio sta nel Garage. Vediamo se domani i Grigi vanno al Garage. *(`diffondi_voce` falsa a un solo sospetto)*
> ↩ *ven 11:00* **Divisa**: Al Garage sono arrivati alle nove. È Gigi. Betamax. Lo sapevo dalle scarpe: troppo pulite per uno che lavora. *(la perquisizione è arrivata lì: il segreto di Betamax, `risacca.js:197`, è vero; mandato `riuscito`)*

**6. Il mandato a tutta la banda (soldi + due compagni).**
> **Nino** *(banda)*: Ragazzi: soldi per la cassa e due compagni nuovi. Entro venerdì.
> **Candela**: I soldi li faccio io. Officina.
> **Betamax**: E io la mia parte stanotte al pontile.
> **Divisa**: Il pontile no. Se ti prendono, fanno una retata e prendono anche la merce di Candela. *(obiezione: linea Prudenza, rischio .6)*
> **Betamax**: Va be'. Vendo cassette sottobanco, che è uguale ma ci si siede. *(cambia metodo: coraggio .4, lealtà più bassa di Divisa)*
> **Vinile**: La gente la trovo io. Cono mi porta in giro in Vespa.
> **Cono**: Io? E chi me lo paga il carburante? …Va bene. Ma guido io.
> ⚙ Divisa: Allora: Candela e Betamax i soldi, Vinile e Cono la gente. Io controllo che nessuno faccia cazzate. *(il referente; il Taccuino mostra una barra comune e quattro barre)*

### 0.9 Cosa serve al motore

| Pezzo | Dove | Stato |
|---|---|---|
| `st.parola.mandati`, il ciclo orario, la revisione delle 22, il progresso dallo stato | `parola.js` | [NUOVO] |
| i modelli del §0.2 (circa 9) con i metodi, le stime e i pesi del carattere | `parola.js`, una tabella `MANDATI` | [NUOVO], circa 300 righe di dati |
| `vendi_mezzo` (la Vespa cambia padrone; il compratore è chi ha soldi e nessun mezzo) | `parola.js` sopra `st.vehicles` e `ownVeh` | [NUOVO] |
| trama guidata: `Trame.proposeScasso` con capo e bersaglio dati, invece che a caso | `trame.js:58` (un argomento in più) | [CAMBIA] piccolo |
| colletta di quartiere avviata da fuori | `imprese.js:65` (`Imprese.avvia(kind, leader, arg)`) | [CAMBIA] piccolo |
| per gli abitanti, il mandato come progetto (`def` costruito al volo) | `popolo.js:1398` (`startProject` accetta già un `def`) | esiste |
| prudenza prima di reclutare (un giorno di `pedina` se il metodo lo prevede) | `parola.js` | [NUOVO] |
| la trappola per l'Orecchio (voce falsa a uno, controllo delle perquisizioni) | `parola.js` + un campo `R.raid.why` in `risacca.js:1334` | [NUOVO] + [CAMBIA] di una riga |
| scheda «Mandati» del Taccuino, barre, bottoni | `parola_ui.js` + `main.js:759` | [NUOVO] |

---

## 1. Inventario: dove un personaggio promette, annuncia o accetta

Legenda: **sì** = il motore lo fa davvero; **a metà** = lo fa a volte, in parte, o la frase arriva prima del controllo;
**no** = la frase resta una frase.

### 1.1 La chat col giocatore

| # | Dove | Cosa dice / cosa accetta | Lo fa? | Prova |
|---|---|---|---|---|
| 1 | Claude «sample» (dentro un artifact) | L'IA scrive `risposta` e `azioni`; le azioni passano da `order()` | **a metà** | `risacca.js:1458-1501`: la `risposta` dell'IA resta anche quando `order()` fallisce. Si corregge solo col ripiego (`if (resp.__fb)`, `:1486`). L'IA può dire «Contaci» e sotto compare `✗ Non c'è una base`. |
| 2 | Mente (server.js / Vercel, il gioco normale) | Parla bene, promette quello che vuole | **no** | Il prompt chiede `"azioni": []` (`server.js:456`, `api/_mente.js:321`). `mente.js:131-160` manda solo carattere, interessi, diario e l'ultima frase: niente verbi, niente VOLONTÀ, niente storia. `risacca_ui.js:305-312` copia `aiData.azioni`, che è sempre vuoto. |
| 3 | Ripiego a parole chiave: la battuta | «Fatto, vado.» «Contaci.» «Va bene. Ci penso io.» | **a metà** | La frase si sceglie da `will()` (`risacca.js:1561-1571`) **prima** di `order()`. In chat0: Cono «Fatto, vado.» → `✗ Servono 2 di vernice`; «Fatto, vado.» → `✗ Manca: fascio di assi ×4…`; «Contaci.» → `✗ Non c'è nessun laboratorio || ✗ Non c'è una base`; «Va bene. Ci penso io.» → `✗ Non hai tutti quei soldi`; Gino «Va bene, ma che resti tra noi.» → `✗ Non hai tutti quei soldi`. |
| 4 | Ripiego: «vai alla calata del porto» | «Contaci.» | **no** (fa un'altra cosa) | `findPlace` (`risacca.js:1506`) prende il primo luogo con una parola in comune: va all'**Osteria del Porto**. |
| 5 | Ripiego: «tieni d'occhio Gino» | «Contaci.» | **no** | `risacca.js:1530`: diventa `sorveglia` di **Piazza San Rocco** per 3 ore. Non esiste il pedinamento di una persona. |
| 6 | Ripiego: «portami del pane», «dammi una sigaretta», «rubami una vespa», «partecipa» | «Sì? Ti ascolto.» «Parla piano…» | **no** | Nessuna parola chiave e nessun verbo (chat0). `dai` (`risacca.js:423`) dà solo le scorte della Risacca che il membro ha addosso (`n.ris.carry`), non la roba di casa (`n.pop.inv`). |
| 7 | Ripiego: «aspettami qui», «vai alla calata» a un non membro | «No. Non adesso, non così.» | **la parola mente sul motivo** | Il vero motivo è `non è della Risacca: non prende ordini` (`risacca.js:377`), ma la frase sembra un rifiuto per paura. Aspettare dieci minuti lo farebbe chiunque. |
| 8 | Ripiego: «monta la stamperia» | «Contaci.» | **no** | `/stamp/` aggiunge anche `produci` (`risacca.js:1525`): due azioni, due ✗. |
| 9 | «unisciti a noi» | «Va bene. Da oggi sono della Risacca.» | **troppo facile** | `will('unisciti')` (`risacca.js:364-367`): un abitante con odio per la Tutela alto entra al primo messaggio (audit §3: Teresa Pinna). Nessuna prova, nessun rapporto da costruire. |
| 10 | La missione (`missione`) | «L'Ufficio Rettifiche brucia i libri… portala in chiesa» | **sì** | `offerMission` (`risacca.js:904-913`) crea `st.ris.mission`, il bersaglio e i regali. |
| 11 | `rivela_spazio` | «C'è un posto: …» | **sì** | `revealSpace` (`risacca.js:915-924`) e `discover`. |
| 12 | Appuntamento (convivenza) | «Va bene. Oggi alle 18:00 a Piazza San Rocco. Non farmi aspettare.» | **sì** | `RS.EXT.immediate.appuntamento` (`convivenza.js:114-129`) mette l'impegno nella giornata; `playerAppts` (`convivenza.js:239-258`) ricorda il bidone e abbassa la fiducia. È il modello giusto. |
| 13 | Accompagna (convivenza) | «Va bene, vengo con te. Ma non troppo.» | **sì** | `convivenza.js:153-160` e il movimento a `:162-178`; la frase la sceglie l'esito (`:70-77`). |
| 14 | Ricevi / chiedi_aiuto | «Proprio quello che mi serviva. Non me lo scordo.» | **sì** | `convivenza.js:130-152`: il debito `P.debiti.player` è vero e si ricambia (`:86`). |
| 15 | `partecipa` (imprese) | «Ci sei già» / adesione | **a metà** | Funziona (`imprese.js:255-263`), ma ci si arriva **solo** dalla strada Claude sample: il ripiego non ha la parola chiave e la Mente non ha i verbi. |
| 16 | Chat lontana coi membri («via radio») | ordini a distanza | **sì** | `risacca_ui.js:231` (`far`): i membri prendono ordini anche lontani. |

### 1.2 La banda

| # | Dove | Cosa | Lo fa? | Prova |
|---|---|---|---|---|
| 17 | Chat della banda | — | **non esiste** | Nessuna chat di gruppo nel codice. HANDOFF_vita.md:43 la mette fra le cose «da fare dopo». Ci sono solo il pannello degli ordini (`risacca_ui.js:330-367`) e il bottone «Riunione: organizzatevi» (`risacca_ui.js:373`, `:428`), che cambia la linea e azzera i compiti decisi da soli. |
| 18 | Rapporti a fine compito | «Fatto: …», «Non ce l'ho fatta: …» | **sì, ma muti** | `finishTask` (`risacca.js:1029-1035`) scrive in `inbox`. Per `seguimi`, `aspetta`, `vai`, `mangia`, `bevi`, `dormi` non dice niente; durante il compito nessun aggiornamento («sono arrivato», «Grigi in vista»). |
| 19 | Libero arbitrio | «Ho deciso: scrive l'onda a … (perché …)» | **sì** | `autonomy` (`risacca.js:1230-1245`): la frase arriva **dopo** `assign`. |
| 20 | Perquisizione annunciata | «Perquisizione a X fra un'ora. Difendila o svuotala.» | **sì** | `onHour` (`risacca.js:1330-1338`), poi `resolveRaid`. |
| 21 | Il membro in cella | «È in cella. Ha 4 ore per non parlare.» | **sì** | `onJailed` (`risacca.js:849-856`), timer `risTalk`. |
| 22 | Reclutare un altro (`recluta`) | il membro va a parlarci | **sì** | `DO.recruit` (`risacca.js:653-663`): esito vero, rapporto vero. |
| 23 | Trame (scasso, agguato) in chat | «[SEGRETO…] Ha organizzato un colpo a …» | **a metà** | `trame.js:269`: la chat sa del colpo, ma non c'è un verbo per entrarci. I ruoli (palo, scassa, porta) esistono solo fra abitanti. |

### 1.3 Le cose che i personaggi dicono da soli

| # | Dove | Battuta | Lo fa? | Prova |
|---|---|---|---|---|
| 24 | Imprese | «Bisogna andare a … Ci penso io.» «Organizziamoci.» | **sì** | `imprese.js:145`: l'impresa nasce prima della frase. |
| 25 | Imprese (TALK) | «Cerco gente: … Chi viene?» | **a metà** | `imprese.js:244-249`: vero, ma il giocatore può rispondere solo con l'IA Claude (riga 15). |
| 26 | Scambi, i patti | «Te lo porto domani a …» | **sì** | `scambi.js:196-206` fissa l'appuntamento; all'incontro «ha mantenuto la parola» o «non si è fatto vedere» (`scambi.js:210-226`). È l'altro modello giusto. |
| 27 | Convivenza, «per strada si parla di cose vere» | «Stasera alle 18 vedo Nino a…», «Devo portare la legna a…» | **sì** | `convivenza.js:259-266`, presi dallo stato. |
| 28 | Convivenza, visita «favore» | «Ti devo un favore… Se ti serve qualcosa, chiedi.» | **a metà** | È vero (`P.debiti.player`), ma «chiedi» porta solo un `+.25` alla volontà (`convivenza.js:92`): non c'è un modo di riscuotere una cosa precisa. |
| 29 | Convivenza, visita «invito» | «Domani alle 13: …, a …. Vieni anche tu? Servono braccia.» | **a metà** | `convivenza.js:188`: senza IA, «sì, vengo» non fa niente (riga 15). |
| 30 | Convivenza, visita «offerta» | «Ho X, se ti serve te lo do a buon prezzo.» | **no** | `convivenza.js:194`: non esiste un verbo per comprare da un abitante. |
| 31 | Convivenza, visita «richiesta» | «…Te lo ripago.» «Poi ti ricambio.» | **sì** | Il debito nasce con `ricevi` (`convivenza.js:139-147`). |
| 32 | Convivenza, visita «minaccia» | «Non farti più vedere da queste parti.» | **a metà** | Nessun seguito: le trame escludono il giocatore dai rancori (`trame.js:168`). |
| 33 | Popolo, chatLine | «Devo {progetto}.» | **sì** | `popolo.js:1881`, da `P.projects`. |
| 34 | Popolo, chatLine | «Domani attacco alle {ora}.» | **sì, ma** | `popolo.js:1885`: vero, però esce «alle 0» e lo dice anche la suora (REGIA §7). |
| 35 | Popolo, TALK_INT | «Stasera scopa all'osteria, vieni?» «Ho finito quel libro, te lo presto.» «Partitella sulla spiaggia, dopo?» «Stasera c'è la prima, ci vai?» «Domani esco all'alba con la barca.» «Domenica faccio le trofie al pesto.» «Stasera rivincita a biliardo, porta i soldi.» «Ti faccio una foto, stai fermo.» | **no** | `popolo.js:1867-1875`: inviti e annunci senza nessun appuntamento, impresa o passaggio di oggetti. |
| 36 | Popolo, ripiego dei giovani | «Zio, stasera usciamo?» «Domenica c'è la partita, ci sei?» | **no** | `popolo.js:1890-1891`. |
| 37 | Azioni, social `offri` | «Offro io, dai.» «Questa la pago io, zio.» | **a metà** | La frase esce a `azioni.js:736`, i soldi si controllano dopo (`:747`, `if (a.pop.money < 2) return`): chi è al verde lo dice e non paga. |
| 38 | Azioni, social `regala` | «Tieni, è per te.» | **a metà** | Stessa cosa: frase a `:736`, poi `if (!k …) return` a `:748`. |
| 39 | Azioni, reazione `chiama` | «Vado al telefono, chiamo la Guardia!» | **a metà** | `azioni.js:953-957`: frase e nota «ha chiamato la Guardia» vengono **prima** di `run()`. `intend` può fallire («ha altro di più urgente», `:489`). Il membro manda al giocatore «Ho chiamato la Guardia, girate al largo.» (`:957`) prima della telefonata. |
| 40 | writing.js, chi ti vede dipingere | «Adesso chiamo i Grigi.» → feed «X va a chiamare i Grigi.» | **a metà** | `writing.js:560-561`: la cosa vera succede solo nel 35% dei casi, e anche allora l'NPC non si muove: si alza il calore e parte un evento. **File di un'altra squadra** (vedi §7). |
| 41 | protagonista.js, invito degli amici | «Stasera alle 20:00 al Bar Sirena? Offro io il primo.» | **a metà** | `protagonista.js:176-179`: l'amico non ha nessun appuntamento nella sua giornata. In `inviteCheck` (`:193-200`) dice «Alla salute!» dovunque sia, e nessuno paga. |
| 42 | protagonista.js, avviso | «Sono passati i Grigi sotto casa tua, chiedevano di te.» | **a metà** | `protagonista.js:188-191`: scatta con `wantedLevel ≥ 1`, ma nessuno controlla che i Grigi ci siano passati davvero. |
| 43 | creativita.js | «{soprannome} stasera offre lui, ha detto.» | **no** | `creativita.js:183`. |
| 44 | eventi.js, cliente arrabbiato | «Vado da Wu, allora!» | **no** | `eventi.js:583`: subito dopo c'è `flee` dal negoziante, non `go` all'Alimentari Wu. |
| 45 | eventi.js | «Stasera al bar, offro io!» | **no** | `eventi.js:520`. |
| 46 | eventi.js | «Domani si rigioca. E le carte le porto io.» | **no** | `eventi.js:435`. |
| 47 | eventi.js, attacchino | «Domenica tutti in piazza!» «Concerto al porto, sabato sera!» | **no** | `eventi.js:491`: nessun evento domenica o sabato. |
| 48 | eventi.js, pattuglia di notte | «Controlliamo i portoni.» | **a metà** | `eventi.js:670`: lo dicono **dopo** essersene andati, e non controllano niente. |
| 49 | eventi.js, al fuoco | «Un altro po' di legna e vado a dormire.» | **no** | `eventi.js:641` (innocua, ma è un annuncio). |
| 50 | matti.js | «Te li porto di persona. Tu aspettami.» · «Domani gli porto i biscotti.» · «Mi tieni il posto? Torno subito.» | **no** | `matti.js:365`, `:399`, `:440`. L'ultima è una gag voluta: la bugia è la battuta (vedi §2.6). |
| 51 | game.js, dialogo classico | «Il caffè per te lo offre la casa.» | **no** | `game.js:1237`: nessun caffè, nessuno sconto. |
| 52 | game.js e ordine.js, i Grigi | «Fermo! Polizia!», «Documenti.», «Vieni con me.» | **sì** | Arresto e controllo vero (`game.js:1531`, `eventi.js:645` con `jail`). |
| 53 | Coro (IA di notte) | «battute che qualcuno del gruppo dirà domani» | **rischio** | `server.js:496`: nessuna regola contro le promesse e nessun filtro. Può uscire «Domani vado alla Rocca» senza la Rocca. |
| 54 | mente.js, memoria della chat | «ha parlato con lo straniero: …» | **contraddice il mondo** | `mente.js:158`: Nino è del posto. |

**In sintesi.** Le cose che funzionano (appuntamento, accompagna, patti, imprese, missioni, autonomia, rapporti) fanno
tutte la stessa cosa: **prima lo stato, poi la frase**. Quelle che non funzionano scelgono la frase prima (ripiego, Claude,
`social`, `react`) oppure non hanno dietro niente (Mente, inviti, scene). Il progetto generalizza il primo schema.

---

## 2. Il progetto: una sola catena per tre canali

I tre canali sono la chat con un personaggio, la chat della banda e le cose che i personaggi dicono da soli. Passano tutti
dallo stesso modulo nuovo, **`src/parola.js`** (solo logica). La grafica va in **`src/parola_ui.js`**.

```
richiesta ─▶ INTENTO ─▶ VERIFICA ─▶ ESITO ─▶ BATTUTA ─▶ PROMESSA ─▶ ESECUZIONE ─▶ RAPPORTO ─▶ CONSEGUENZE
(testo,      (IA o       (motore:    (accetta/  (scelta     (oggetto     (motore,      (chat, fumetto,  (fiducia,
 bark)        parole      luogo,      rifiuta/   dall'esito, visibile:    passi         taccuino)        memoria,
              chiave,     oggetto,    contratta/ mai prima)  chi, cosa,   visibili)                      diario)
              stesso      soldi,      chiede/                dove,
              schema)     volontà,    niente)                quando,
                          ora,                               scadenza)
                          pericolo)
```

### 2.1 L'intento (uguale per l'IA e per il ripiego)

```js
// Parola.intento: quello che il giocatore chiede, in forma di motore
{
  verbo: 'porta_a',                        // uno della lista del §3, già normalizzato (VERB_ALIAS)
  args: { cosa: 'pane', quanto: 1, a: 'player' },
  quando: null | 'adesso' | 'stasera' | { t: 1234 },   // un'ora del gioco, se data
  modi: { furtivo: false, corri: false },
  a_chi: ['cono'] | ['tutti'] | null,      // solo nella chat della banda
  fonte: 'ia' | 'parole' | 'bark' | 'pannello',
  dubbio: null | { cosa: 'luogo', scelte: ['calata', 'osteria_porto'] }   // il motore ha due candidati
}
```

- **Con l'IA**: il modello restituisce `intento` (e `altri_intenti`, al massimo 3) nello schema del §4.
- **Senza IA**: `Parola.capisci(st, n, testo)` riscrive `fallback()` (`risacca.js:1503-1560`) in modo che produca
  **solo intenti, non battute**. Correzioni di passaggio:
  - `trovaLuogo`: prima l'id esatto, poi il nome intero, poi la **corrispondenza più lunga**. Se due luoghi hanno lo stesso
    punteggio, nasce un `dubbio` invece di una scelta a caso. «la calata del porto» trova `calata` (nome intero) prima di
    «Osteria del Porto» (una parola sola).
  - `trovaPersona` prima di `trovaLuogo`: «tieni d'occhio Gino» → `pedina{persona:'gino'}`; «tieni d'occhio la piazza» →
    `sorveglia{luogo:'piazza'}`.
  - `trovaCosa` su tre cataloghi (sotto).
  - Parole chiave nuove: `partecipa|vengo anch'io|ci sto|contami` → `partecipa`; `portami|mi porti|vai a prendermi` →
    `porta_a{a:'player'}`; `porta X a Y` → `porta_a`; `dammi|mi dai|me ne dai` → `dammi`; `quanto vuoi per|te lo compro` →
    `compra_da`; `segui X|pedina|stai dietro a` → `pedina`; `avvisami se|fammi sapere se|se arrivano` → `avvisa`;
    `dove sei|cosa fai|come va` → `stato` (nessuna azione, risponde il motore); `lascia stare|annulla|non serve più` → `annulla`.
  - `/stamp/` non aggiunge più `produci` se c'è già `allestisci`: **un intento principale per frase**, gli altri solo se
    uniti da «e» o «poi».

**Tre cataloghi di roba, un risolutore solo.** Oggi convivono le risorse della Risacca `RS.RES` (`risacca.js:19-44`),
gli oggetti veri di `Oggetti.CAT` (zaino del giocatore e case degli abitanti, `scambi.js:31-40`) e gli `ITEMS` di
`azioni.js:55`. `Parola.cosa(testo)` restituisce `{ cat: 'res'|'ogg'|'az', id, nome }` cercando nell'ordine giusto per
il verbo (le scorte per `compra` coi membri, gli oggetti per `dammi`, `porta_a` e `ricevi`). Il nome, con l'articolo giusto
(«del pane», «una bottiglia di vino»), si costruisce qui: si risolve anche la grammatica degli oggetti di REGIA §7.4.

### 2.2 La verifica nel motore

`Parola.verifica(st, n, intento)` non cambia niente nel mondo: è una prova a secco. Fa i controlli in quest'ordine
e si ferma al primo che decide.

| Passo | Controllo | Da dove viene | Se non passa |
|---|---|---|---|
| 0 | Il verbo esiste ed è permesso a questo personaggio (membro, abitante, Grigio, antagonista) | §3, colonna «chi» | `rifiuta{tipo:'non_so'}` oppure `rifiuta{tipo:'non_membro'}` |
| 1 | I parametri si trovano: luogo, persona, oggetto | `trovaLuogo/Persona/Cosa`; `resolvePlace` (`risacca.js:324`) | **`chiede`** con le scelte («Quale, la Calata o l'Osteria?») |
| 2 | Lo stato duro: morto, in cella, ferito, in un'altra promessa | `order()` (`risacca.js:873-876`); `Parola.impegnato(n)` | `rifiuta{tipo:'cella'}` / `contratta{tipo:'occupato', dopo: t}` («Prima finisco il pane.») |
| 3 | Il piano si fa: le scorte, i soldi, gli attrezzi, la base | `plan()` (`risacca.js:409-592`), che non cambia lo stato; `Azioni.can()` (`azioni.js:483`) per gli abitanti; un `check` nuovo per i verbi immediati di convivenza (oggi controllano ed eseguono insieme, `convivenza.js:114`) | Se manca una cosa che il giocatore può dare → **`chiede{tipo:'oggetto', id, quanto}`**. Se manca una cosa impossibile → `rifiuta{tipo:'impossibile', testo: p.err}`. |
| 4 | L'ora: si fa solo di notte, il negozio è chiuso, sta lavorando | `VERBS[v].night`; `P.job` (`convivenza.js:120`) | `contratta{tipo:'quando', quando:'stanotte'}` |
| 5 | Il pericolo: Grigi entro 20 m dal posto, telecamera, livello di Repressione | `st.npcs` coi `cop`; `camNear` (`risacca.js:608`); `reprLevel` | Entra nella volontà (`V.risk`); se è il motivo principale: `motivo{tipo:'pericolo', dati:{grigi:2}}` |
| 6 | La volontà | `will()` (`risacca.js:358-391`), con `willMod` di convivenza, imprese e protagonista | `accetta` (≥ .2), `contratta` (0 ÷ .2), `rifiuta` (< 0), più `why[]` |
| 7 | La contro-offerta, se contratta | dai `why` e dal carattere: avido → `soldi`; paura → `furtivo` o un'altra ora; stanco → `dopo`; non si fida → `prova` (una promessa piccola prima) | `contro: {tipo, …}` |

L'esito:

```js
{ esito: 'accetta' | 'rifiuta' | 'contratta' | 'chiede' | 'niente',
  motivo: { tipo: 'manca'|'non_membro'|'never'|'paura'|'rancore'|'stanco'|'fame'|'notte'|'giorno'|'pericolo'|'occupato'|'ambiguo'|'cella'|'impossibile'|'non_so',
            testo: 'Servono 2 di vernice', dati: {} },
  contro: null | { tipo: 'soldi', quanto: 20 } | { tipo: 'oggetto', id: 'vernice', quanto: 2 } | { tipo: 'quando', t } | { tipo: 'prova', intento },
  piano: { desc, steps } }   // il piano già pronto per l'esecuzione
```

**Reclutare diventa una cosa seria** (riga 9 dell'inventario). Per `unisciti` la verifica chiede, oltre alla volontà:
fiducia (`n.op.trust + r.bond`) ≥ .3, **almeno una promessa mantenuta** fra i due (del giocatore verso di lui o sua verso
il giocatore) oppure la missione fatta, e due conversazioni in giorni diversi. Se manca qualcosa, l'esito è
`contratta{tipo:'prova'}`: il personaggio chiede una cosa piccola e vera, presa da `Scambi.wants` («Prima portami la
legna») o dalla sua missione. La prova diventa una promessa del giocatore (§2.5).

### 2.3 La battuta si scrive dall'esito

**Si esegue, poi si parla.** `Parola.rispondi(st, n, testo, intento, proposte)`:

1. verifica → esito;
2. se l'esito è `accetta`: **impegno** (promessa più avvio dell'esecuzione). Se l'avvio fallisce (`assign` dà
   `ok:false`, `intend` restituisce `why`), l'esito diventa `rifiuta{tipo:'impossibile'}`;
3. **solo adesso** si sceglie la battuta:
   - **con l'IA**: il modello ha già mandato `risposte` per ogni esito (§4). Si prende `risposte[esito]`; se manca, o se il
     motivo vero è diverso da quello che l'IA immaginava (l'IA ha scritto «rifiuta» per paura e il motivo è la vernice),
     si usa la riga di repertorio per quel motivo, e la frase dell'IA si aggiunge solo se non contiene un sì;
   - **senza IA**: `BANCHE[esito][motivo.tipo]`, con le varianti per voce (ragazzo, vecchio, Grigio, Famiglia, membro) e
     i segnaposto del motivo (`{cosa}`, `{luogo}`, `{quanti}`, `{ora}`);
4. **il cane da guardia**: prima di mostrare la battuta, `Parola.promette(testo)` cerca le forme dell'impegno (*vado,
   ci vado, ti seguo, vengo, ti aspetto, te lo porto, ci penso io, contaci, fatto, offro io, domani faccio, stasera
   porto…*). Se la battuta promette e non c'è nessuna promessa accettata, la battuta si butta e si usa quella di `niente`
   o di `chiede`. Il caso si conta in `st.parola.stats.guardia` (per vedere quanto mente il modello);
5. al contrario: se l'esito è `rifiuta` e la battuta dell'IA dice di sì, si butta lo stesso.

Così sparisce il «Fatto, vado.» seguito da `✗`, e la Mente non può più promettere a vuoto: anche se il modello ignora le
regole, il guardiano non lascia passare un sì senza fatto.

### 2.4 La promessa

```js
// st.parola.promesse[] (in memoria; quando ci sarà il salvataggio, si salva con il resto)
{
  id: 'p17',
  chi: 'cono',                 // chi deve farla: un personaggio, oppure 'player' (le promesse del giocatore)
  a: 'player',                 // a chi è promessa: 'player', 'banda' o un id
  verbo: 'scrivi_onda', args: { luogo: 'piazza', furtivo: true },
  desc: 'scrive l\'onda in Piazza San Rocco, di nascosto',   // dal piano, una frase leggibile
  dove: { id: 'piazza', name: 'Piazza San Rocco', x, y },
  quando: { t0: st.t, at: null },          // at: impegno a un'ora precisa (appuntamento, «stanotte»)
  scadenza: st.t + 180,                    // oltre la scadenza senza esito: 'scaduta'
  stato: 'attesa' | 'accettata' | 'in_corso' | 'fatta' | 'fallita' | 'rotta' | 'scaduta' | 'annullata',
  condizione: null | { tipo: 'oggetto', id: 'vernice', quanto: 2 } | { tipo: 'soldi', quanto: 20 },   // stato 'attesa'
  link: { tipo: 'task'|'piano'|'appt'|'impresa'|'with'|'patto'|'veglia', id },   // l'oggetto del motore che la porta avanti
  passi: [ { t, testo: 'Sono in piazza.', k: 'arrivo' } ],                     // gli aggiornamenti mandati
  canale: 'chat' | 'banda' | 'bark' | 'pannello',
  thread: 'cono' | 'banda',
  parole: '«Di nascosto io? Sono il re del nascosto.»',   // la battuta con cui l'ha presa
  esito_msg: null,                       // l'ultima riga del motore («Finito il gesso.»)
  piano_id: null                         // se fa parte di un piano della banda (§2.7)
}
```

**Chi la porta avanti (gli adattatori).** Ogni verbo del §3 dice quale motore usa. La promessa tiene solo il `link`:

| Adattatore | Motore | Avvio | Come si sa come va |
|---|---|---|---|
| `task` | Risacca, i membri | `assign()` (`risacca.js:858`); in `n.ris.task.pid` va l'id della promessa | **gancio nuovo** `RS.EXT.onFinish(st, n, T, ok, msg)` dentro `finishTask` (`risacca.js:1029`) e `RS.EXT.onStep(st, n, T, s)` dentro `nextStep` (`:1028`) |
| `piano` | Azioni, chiunque abbia `n.pop` | `Azioni.intend()` (`azioni.js:484`); in `P.emer.pid` va l'id | **gancio nuovo** `Azioni.CFG.onEnd(st, n, E, why)` dentro `endPlan` (`azioni.js:192`); i passi hanno già `label` |
| `appt` | Popolo e convivenza | `immediate.appuntamento` / `Po.appoint` (`popolo.js:873`) | `playerAppts` (`convivenza.js:239`) e `I.MEET`: si aggiunge `ap.pid` |
| `impresa` | Imprese | `immediate.partecipa` | `run()` (`imprese.js:216-235`): `E.here.player` / `absent` |
| `with` | Convivenza (accompagna) | `P.with` | scade da sola (`convivenza.js:166`) |
| `patto` | Scambi | `Sc.promise` / `Sc.deal` | `I.MEET` (`scambi.js:210-226`) |
| `veglia` | **nuovo** in parola.js: «avvisami se…», il palo | `st.parola.veglie[]` | controllo ogni minuto di gioco (§3, `avvisa`) |

Una promessa legata a un compito **non si perde in silenzio**: `autonomy` non tocca un membro con `task.pid`
(`risacca.js:1230`), il programma della giornata non scavalca un `P.emer` con `pid` se non per un'emergenza vera (paura,
ferita, arresto), e allora la promessa diventa `fallita` con il motivo dell'emergenza, non `rotta`.

### 2.5 Esecuzione, rapporti, conseguenze

**Passi visibili.** Ogni passo che comincia o finisce genera al massimo un aggiornamento, che va nel thread della promessa.
Il fumetto compare solo se il personaggio è entro 25 m e in quadro.

| Momento | Da dove | Esempio (la voce la mette la banca) |
|---|---|---|
| parte | `assign` / `intend` ok | «Vado.» (solo se lo dice adesso, non prima) |
| arriva | `go` completato (`runTask`, `risacca.js:1055`), `S.go` di Azioni | «Sono davanti all'Emporio.» |
| pericolo | ogni 2 minuti di gioco durante il compito: Grigi entro 15 m, telecamera, sirena | «Grigi in vista. Due, con la campagnola.» |
| aspetta | `hold`/`attesa` lunghi (ogni 30 minuti di gioco) | «Ancora qui. Il gelataio mi guarda strano.» |
| fatto | `onFinish ok` o `DO` col suo `msg` (`risacca.js:633-727`) | «Fatto. Si vede dal molo.» + i numeri del motore («+18.000 lire nella cassa») |
| fallito | `onFinish !ok` con il `msg` del motore | «Non ce l'ho fatta: c'erano i Grigi.» / «Finito il gesso a metà.» |
| scaduto | scadenza passata senza esito | «Lascia stare, non ci sono arrivato.» (vale come `rotta` se non c'è un motivo) |

Regole del ritmo: al massimo un aggiornamento ogni 2 minuti di gioco per persona; «pericolo» al massimo uno ogni 10 minuti
per luogo; con la chat chiusa ne arriva solo uno nel feed (`G.feed`) più un pallino col numero sul bottone della chat.

**Le conseguenze.** Si scrivono con gli strumenti che ci sono già: `n.op.trust`, `n.ris.bond`, `n.ris.loyalty`,
`Po.note` (il diario, che ripassa nella memoria lunga e nel Coro).

| Stato finale | Chi | Effetto |
|---|---|---|
| `fatta` | NPC → giocatore | lealtà +.02 (c'è già, `risacca.js:1033`); fiducia del giocatore verso di lui: il personaggio ha un nuovo fatto nel diario: «ha mantenuto la parola con Nino: {desc}» (good, w .4) |
| `fallita` con un motivo esterno (Grigi, gesso finito, negozio chiuso) | NPC | **nessuna perdita di fiducia**; nota «ci ha provato: {motivo}»; la lealtà cala come oggi (-.04) solo se il rischio era basso |
| `rotta` (l'ha lasciata senza motivo, o era una bugia del motore, §2.6) | NPC | il giocatore la vede nel Taccuino fra «Rotte»; `n.ris.bond` −.05; per un membro, lealtà −.06 e una riga nel diario degli altri membri («Cono molla le cose a metà») |
| `fatta` | giocatore → NPC | fiducia +.06, `P.debiti.player` se era una cosa che gli serviva (come `ricevi`, `convivenza.js:147`) |
| `scaduta` / `rotta` | giocatore → NPC | fiducia −.08, nota bad «Nino aveva detto che portava {cosa}» (w .5), come il bidone dell'appuntamento (`convivenza.js:252`); chi è chiacchierone lo racconta (voce nel Coro) |
| due promesse rotte di fila col giocatore | NPC | `contratta{tipo:'prova'}` su tutto per 2 giorni: «Prima fammi vedere.» |

**Le promesse del giocatore.** Nascono quando il giocatore accetta una contro-offerta o una prova («va bene, te la porto»,
«domani ti do i soldi»). Si riconoscono dalle stesse forme dell'impegno, rivolte da Nino all'NPC, oppure da un bottone
«Prometto» sotto la contro-offerta (più affidabile: la frase del giocatore la scrive il giocatore). Scadenza di
default: fine del giorno dopo.

### 2.6 Le parole che i personaggi dicono da soli

Tre regole.

1. **Annunciare un'azione vuol dire farla partire.** C'è una sola porta: `Parola.annuncia(st, n, intento, battute)`.
   Prova l'azione nel motore e **solo se parte** dice la battuta (fumetto, o messaggio alla banda). Se non parte, tace
   oppure dice la variante `niente`. Si scrive `{ say: …, fa: { verbo, args } }` nelle scene e `annuncia(…)` nel codice.
2. **Invitare vuol dire creare l'invito.** Un invito («Stasera scopa all'osteria, vieni?») si dice solo insieme a un
   appuntamento vero (`Po.appoint` fra i due) o a un'impresa (`Imprese` ha già `cena` e `pesca`). Se il motore non lo crea,
   la frase si riscrive al passato o al presente («Ieri a briscola mi hanno spennato.»).
3. **Affermare un fatto vuol dire averlo.** «I Grigi sono passati sotto casa tua» si dice solo se c'è un evento o una
   pattuglia vera entro 30 m da `homeT` nelle ultime 6 ore; altrimenti «Ti cercano. Non so dove, ma ti cercano.».

E un'eccezione. **La bugia voluta** («Mi tieni il posto? Torno subito.») è ammessa solo nelle scene, solo se la smentita
si vede subito e solo marcata `bugia: true`. Il motore la sa: il personaggio non torna, nel suo diario c'è «ha mollato Nino
con la borsa», e se gliene parli in chat lo sa. La stessa marcatura vale per chi **mente per il motore** (l'Orecchio, la
Zia, Betamax col suo segreto, `risacca.js:197`): accettano, la promessa nasce col `link` a un piano di tradimento, e
**il personaggio fa quello che ha deciso davvero**. Le parole corrispondono alle sue intenzioni vere, non a quelle che
mostra. Lo scopri dai fatti. Da decidere con Andrea (§7, decisione 3).

**Le righe da sistemare** (sotto `?parola`; senza flag restano come sono):

| Riga | Correzione |
|---|---|
| `azioni.js:736` + `:747-748` (offri, regala) | `lineFor` dopo lo `switch`; se l'effetto non c'è, la frase è «Ti offrirei qualcosa, ma sono a secco.» o non esce |
| `azioni.js:953-957` (chiama) | `run()` prima; frase, nota e messaggio alla banda solo se `intend` è ok; altrimenti `RLINES.scappa` |
| `writing.js:560-561` (Adesso chiamo i Grigi) | **file di un'altra squadra**: si propone un gancio. Se `Parola.annuncia` esiste, `writing.js` lo chiama con `{verbo:'telefona', a:'guardia'}` e la frase la dice il motore. Va concordato (§7) |
| `protagonista.js:176-200` (invito al bar) | crea un `Po.appoint(amico, 'player', bar, at)`; l'amico ci va davvero; «Offro io il primo» solo se ha almeno 3.000 lire, e allora li paga davvero in `inviteCheck` |
| `protagonista.js:188-191` | regola 3 |
| `creativita.js:183` | «stasera offre lui» solo se l'amico ha un appuntamento al bar stasera; altrimenti «Hai visto {nick}? Lo cercavo.» |
| `popolo.js:1867-1875` TALK_INT | ogni frase-invito diventa `{ say, fa: 'appoint'|'impresa'|'presta' }`; «te lo presto» → `Scambi.put` del libro, se ce l'ha; «Domani esco all'alba con la barca» solo se in `P.plan` di domani c'è la pesca |
| `popolo.js:1885` | «Domani attacco alle {start}» solo se `P.job.start > 0` e non è religioso/pensionato |
| `popolo.js:1890-1891` | «Zio, stasera usciamo?» → `fa: 'appoint'` fra coetanei; «Domenica c'è la partita» resta (è una notizia, se la partita c'è: `Imprese.sport` [NUOVO piccolo] o si riscrive) |
| `eventi.js:583` «Vado da Wu, allora!» | nuovo passo di scena `{ go: 'b', to: 'place:wu' }` al posto di `flee` |
| `eventi.js:520`, `:435`, `:491` | `fa: 'appoint'` (offro io → appuntamento al bar e paga), `fa:'appoint'` (si rigioca), `fa:'impresa'` (concerto) oppure riscrittura al presente |
| `eventi.js:670` «Controlliamo i portoni.» | la battuta prima del `go`; il `go` va ai portoni vicini (`posto: 'portone'`) |
| `eventi.js:641` | va bene se dopo c'è `{ go: 'b', to: 'home' }` |
| `matti.js:365`, `:399` | `bugia: true` (gag) oppure riscrittura |
| `game.js:1237` | il caffè gratis vero (il prossimo «bevi» al bar costa 0) oppure «Per te il caffè costa uguale, ma te lo faccio meglio.» |
| `mente.js:158` | «ha parlato con Nino» |
| Coro (`server.js:494-496`) e chiacchiera (`:505-515`) | regola nel prompt («niente promesse o annunci: solo cose già successe o che stanno succedendo») e filtro `Parola.promette` lato client: la battuta che promette si scarta |

**La sentinella.** Uno strumento, `strumenti/parola_lint.js`, cerca in `src/*.js` le stringhe con le forme dell'impegno
che non passano da `annuncia`, non hanno `fa:` e non sono marcate `bugia`. Gira in `test_parola.js`: una battuta nuova
che promette senza agire fa fallire la prova.

### 2.7 La chat della banda

**Dove.** Nella stessa finestra della chat (`#rs-chat`), con un thread speciale `banda`. Si apre dal pannello (B →
bottone «Chat della banda») e con un tasto da concordare con orienta (oggi C apre la chat col più vicino,
`risacca_ui.js:138`). I messaggi stanno in `st.ris.chats.banda`, ognuno col campo `da` (id del membro, o `player`).
Si vede da quando c'è il primo membro, come l'HUD (`orienta.js:327`). Al telefono la stessa chat è il cellulare.

**A chi parli.**
- un nome o un nome di battaglia all'inizio («Cono, …», «@Candela …») → a lui;
- «tutti», «ragazzi», «raga», «voi», «chi può» → a tutti;
- nessun nome → con l'IA decide il modello (`destinatari`); senza IA, il motore sceglie il membro migliore per
  quell'intento (punteggio = `will()` + gusti + vicinanza al posto + poca stanchezza), e solo lui risponde.

**Chi risponde prima.** Per un ordine a tutti: si fa la verifica per ognuno, poi rispondono in quest'ordine: chi accetta e
lo fa volentieri (`likes`), chi contratta, chi rifiuta. Al massimo **tre messaggi**; gli altri vanno in una riga del
motore, grigia: «Betamax e Vinile non rispondono.» (chi è stanco o dorme non risponde, ed è vero).

**Il disaccordo.** Un membro può intervenire su un ordine dato a un altro solo se la verifica **sua**, per lo stesso
intento, dà `rifiuta` o `contratta` per pericolo, paura o linea (la Prudenza contro un sabotaggio di giorno). Il suo
messaggio è un'opinione, non un'azione, e non blocca niente. Un secondo intervento sulla stessa cosa non c'è.
Il disaccordo ha però un effetto: se chi esegue ha lealtà < .5 e chi obietta ha lealtà più alta, la volontà di chi esegue
scende di .1 (si lascia convincere). Così la discussione conta.

**Uno che dice no.** Il no esce con il motivo vero (`motivo.tipo`) e il personaggio resta libero; la promessa non nasce.
Se il giocatore insiste nello stesso thread («dai, ti prego», soldi), la `persuasione` (come oggi, `risacca.js:1464`)
rientra nella verifica successiva.

**I piani con i ruoli** (verbo nuovo `piano`, §3). «Stanotte l'Emporio: Divisa fa il palo, Candela apre, Cono porta.»,
oppure «stanotte l'Emporio, organizzatevi».
- I ruoli: **palo** (`veglia` sui Grigi entro 25 m dal posto, avvisa), **scassa** (`scassina` o `scasso`, serve un
  attrezzo), **porta** (prende la roba e la deposita in base), **autista** (una Vespa o un'auto, se c'è), **voce**
  (`diffondi_voce` o `volantina` dopo). Sono gli stessi che trame.js usa fra gli abitanti (`trame.js:3-8`).
- Se i ruoli non sono dati, il motore li assegna: scassa a chi ha l'attrezzo e il coraggio più alto (Candela ha già
  `+.2` sui lucchetti, `risacca.js:672`); palo a chi ha `sorveglia` fra i gusti; porta a chi ha la Vespa.
- Ogni ruolo è una promessa con lo stesso `piano_id`. Il piano ha un **ritrovo** (luogo, ora) e un passo nuovo
  `{k:'sync'}` in `runTask`: si aspetta lì finché arrivano tutti, o fino a 30 minuti, poi si parte con chi c'è.
- Il palo che vede i Grigi manda «Grigi in vista.» e alza `piano.allarme`: gli altri **interrompono** (la promessa diventa
  `fallita`, motivo `pericolo`) e tornano in base di corsa. Se nessuno fa il palo, il pericolo si scopre solo quando li
  prendono.
- Un piano si annulla se dopo la verifica manca un ruolo necessario (scassa senza attrezzi): la risposta è «Senza
  piede di porco apriamo con cosa, coi denti?» e il motore propone `compra attrezzi`.

**Gli aggiornamenti mentre lavorano** arrivano nel thread `banda` con il nome di chi parla, secondo la tabella del §2.5.
Quando un piano finisce, il motore scrive una riga di riepilogo: «Emporio: +62.000 lire e una cassa di merce. Visti da 1.».

**Il tempo.** La chat con una persona ferma il tempo (`U.paused`, `risacca_ui.js:229`). La chat della banda è una radio:
il tempo **va avanti al rallentatore** (il `sceneK` di Azioni, `azioni.js:25`) mentre è aperta, così gli aggiornamenti
arrivano mentre la leggi. Decisione 2 per Andrea.

### 2.8 Cosa vede il giocatore

- **Il Taccuino, schede «Mandati» (§0.7) e «Parola data»** (accanto a «Chi sa cosa», «Cosa hai fatto», «Diario», `main.js:759`):
  - *Ti hanno promesso*: una riga per promessa attiva, col passo di adesso e il tempo che manca («Cono · l'onda in Piazza
    San Rocco · in cammino · 4 min»);
  - *Hai promesso tu*: con la scadenza in rosso quando manca meno di un'ora («A Teresa: la legna · entro domani sera»);
  - *Com'è andata*: le ultime 10, con ✓ mantenuta, ✗ fallita (col motivo), ⊘ rotta. Chi ha rotto la parola si vede.
- **Il segno sopra il personaggio**: l'etichetta dei membri (`risacca_ui.js:453`, «≋ Cono») diventa «≋ Cono · ⟳ l'onda»;
  per un abitante che fa una promessa, «⟳ ti porta il pane» (entro 40 m). Sul posto del compito un «◎» (entro 60 m).
  A fine compito, 3 secondi di «✓» o «✗». Sono etichette HTML, non si toccano i modelli dei personaggi.
- **Il thread**: ogni promessa ha i suoi aggiornamenti nella chat di chi la fa (o nella banda). Il pannello «Rapporti
  dalla squadra» (`risacca_ui.js:411`) li raccoglie già da `inbox`: basta scriverli anche lì.
- **Nella chat, sotto una contro-offerta**: due bottoni veri, «Prometto» e «Lascia stare», più «Paga 20.000» se la
  contro-offerta è in soldi e li hai.

---

## 3. I verbi da dare all'IA

**Chi**: M = membri della Risacca, A = qualsiasi abitante con `n.pop`, C = cast, ✗G = mai i Grigi né gli antagonisti
(`CARDS.vasco.never`, `risacca.js:200`). **Motore** = l'adattatore del §2.4. I verbi della Risacca che restano uguali
(lavora, colletta, contrabbando, recupera, produci, mercato, volantina, sabota, trasmetti, libera, proteggi, occupa,
costruisci, allestisci, scassina, scasso, lancia, fotografa, ricatta, scava, inchioda, dipingi, picchia, arreda, ripara,
pesca, rovista, bisca, vendi_documenti, linea, autonomia, collaboratore, mestiere) si danno all'IA così come sono
(`risacca.js:128-185`), con il loro controllo in `plan()`. Qui ci sono quelli che cambiano o che mancano.

| Verbo | Parametri | Chi | Motore | Verifica (oltre a volontà, ora e pericolo) | Stato |
|---|---|---|---|---|---|
| `seguimi` | `ore?` | M, A | task `follow` (M) / `with` (A, oggi `accompagna`) | non in un'altra promessa; A: niente appuntamento entro 2 ore (`convivenza.js:155`) | esiste; unisce `seguimi` e `accompagna` |
| `vai` | `luogo`, `corri?` | M; A solo se ti deve un favore o fiducia > .4 | task `go+hold` / Azioni `vai` | luogo trovato **senza dubbio**; raggiungibile | esiste (M); [NUOVO] per A |
| `aspetta` | `luogo?`, `minuti?` | M, A | task `hold` / Azioni `S.do` fermo | A: al massimo 30 minuti, mai a casa d'altri | esiste (M); [NUOVO] per A |
| `basta` / `annulla` | `promessa?` | M, A | chiude il `link` | — | `basta` esiste; [NUOVO] `annulla` chiude la promessa come `annullata` (non rotta) |
| `porta_a` | `cosa`, `quanto`, `a` (player o persona), `da?` | M, A | A: Azioni `getItem` (`azioni.js:281`) + passo nuovo `consegna`; M: `porta` / `compra` + `reach` | ce l'ha (`Scambi.has`), o lo può comprare (prezzo ≤ soldi suoi, o ≤ soldi che gli dai), o è nelle scorte; la bottega è aperta | [NUOVO] («portami del pane», «porta la cassa a Suor Agata») |
| `porta` | `risorsa`, `quanto`, `da` (base), `a` | M | task | scorte nella base (`risacca.js:438`) | esiste |
| `compra` | `risorsa`, `quanto`, `luogo?` | M | task, con la cassa | cassa (`risacca.js:433`) | esiste |
| `compra_da` | `cosa`, `prezzo?` | il giocatore da A | immediato: `Scambi.take` + `put` nello zaino, soldi | ce l'ha in più (`Sc.surplus`); prezzo da `Oggetti.CAT.prezzo` ± avidità | [NUOVO] (la visita «offerta», `convivenza.js:194`) |
| `dammi` | `cosa`, `quanto` | A, M | immediato | ce l'ha; gratis se `P.debiti.player` o fiducia > .5, altrimenti `contratta{soldi}` | [NUOVO] («dammi una sigaretta») |
| `ricevi` | `oggetto`, `quanto` | A | immediato | è nello zaino | esiste (`convivenza.js:139`) |
| `ricevi_soldi` / `dai` (soldi) | `quanto` | A, M | immediato | i soldi ci sono **prima** di rispondere | esiste |
| `pedina` | `persona`, `ore` | M (A solo `giro` malavita) | task con un passo nuovo `{k:'shadow', who, keep: 8-12 m}` | la persona si trova; non pedini un Grigio di giorno senza `furtivo`; il rapporto dice dove è andata e chi ha visto (dai `P.plan` e dagli incontri veri) | [NUOVO] («tieni d'occhio Gino») |
| `sorveglia` | `luogo`, `ore` | M | task | luogo senza dubbio | esiste; «tieni d'occhio» va qui solo se è un luogo |
| `avvisa` | `se` (`grigi`, `arriva:<persona>`, `perquisizione`, `esce:<persona>`), `dove?`, `ore` | M; A che si fida | `veglia`: ogni minuto controlla la condizione; quando è vera, messaggio al giocatore (chat o banda) e fine | ha un telefono (`hasCell`, `azioni.js:592`) oppure è un membro (radio); A: solo dove si trova già | [NUOVO] («avvisami se arrivano i Grigi») |
| `avvisa_persona` | `persona`, `testo` | M, A | Azioni `telefona` / `message` (`azioni.js:598-620`) | la persona è raggiungibile (`message` lo controlla già) | [NUOVO] piccolo, sopra `message` |
| `convoca` | `persona`, `luogo` | M | `DO.summon` (`risacca.js:703`) | come oggi | esiste |
| `appuntamento` | `luogo`, `ora`, `giorno?` | A, M | `appt` | come oggi; in più un `check` senza effetti | esiste |
| `recluta` | `persona` | M | task `meet` + `recruit` | la persona non è un informatore **conosciuto**; in più la regola dura del §2.2 per chi viene reclutato | esiste; [CAMBIA] la probabilità |
| `unisciti` | — | C, A | immediato | §2.2: fiducia ≥ .3, una promessa mantenuta o la missione, due chiacchierate in giorni diversi; tetto di fazioni | esiste; [CAMBIA] |
| `partecipa` | `impresa?` / `piano?` | il giocatore entra in un'impresa (A) o in un piano/trama (M o A complici) | `impresa`; per le trame [NUOVO] `Trame.join(player, ruolo)` | l'impresa/la trama c'è e cerca gente; per le trame fiducia > .6 (è un segreto) | esiste (imprese); [NUOVO] per le trame |
| `piano` | `tipo` (`colpo`, `onda`, `volantinaggio`, `sabotaggio`, `liberazione`), `luogo`, `quando`, `ruoli?` [{chi, ruolo}] | M (solo nella chat della banda) | N promesse con lo stesso `piano_id` + passo `sync` + `veglia` del palo | ogni ruolo passa la sua verifica; serve almeno chi fa il ruolo necessario | [NUOVO] |
| `scrivi_onda` | `luogo`, `furtivo?` | M | task | gesso (`risacca.js:467`) | esiste |
| `nasconditi` | `base?` | M; A | task `inside` / Azioni `nasconditi` (`azioni.js:469`) | M: c'è una base; A: un posto fuori mano | esiste (tutti e due) |
| `mangia` / `bevi` / `dormi` | — | M | task | soldi nella cassa (`risacca.js:664-669`) | esiste |
| `racconta` / `stato` | `chi o cosa` / — | tutti | nessuna azione: risponde il motore (memoria, compito di adesso, dove si trova) | — | `racconta` esiste; [NUOVO] `stato` («dove sei?» → «Davanti alla caserma. Ancora due ore.») |
| `missione`, `rivela_spazio`, `chiedi_aiuto` | come oggi | C / tutti | immediati | come oggi | esistono |
| `vendi` (al giocatore, della roba sua) | `cosa`, `prezzo` | A con `avid` > .45 | come `compra_da` visto dall'NPC | — | [NUOVO], è lo stesso scambio di `compra_da` |
| `offri` (da bere al giocatore) | `luogo?` | A | `appt` al bar + pagamento all'incontro | ha ≥ 3.000 lire | [NUOVO] piccolo: è il «Offro io» che diventa vero |

**Cosa non diamo all'IA**: `uccidi`, `sbarazzati`, `trasporta` (corpi), `spaccia`, `costituisciti`, `soccorri` di
azioni.js. Sono reazioni del motore, non ordini da chat. Se il giocatore li chiede, la risposta è `rifiuta{non_so}` in
carattere. Decisione 4 per Andrea.

---

## 4. Il server: `dialogo` cambia, nasce `banda`

Le stesse modifiche vanno in `server.js` e in `api/_mente.js`, che si rigenera con `strumenti_inverno/mente_vercel.py`.
La chiave e la quota restano quelle della chat (`CANALI`, `server.js:106`: aggiungere `banda: 'chat'` e `mandato: 'chat'`).
Il vecchio `dialogo` resta quando il client non manda `versione`, così le versioni vecchie del gioco continuano a
funzionare.

### 4.1 `kind: 'dialogo'`, `versione: 'parola1'`

**Richiesta** (la prepara `mente.js:131` usando `RS.chatRules`/`chatState`, che ci sono già e oggi vanno solo a Claude):

```json
{
  "kind": "dialogo", "versione": "parola1",
  "npc": { "id": "cono", "name": "Sasà Deiana", "ruolo": "…", "battaglia": "Cono", "voce": "entusiasta, sfrontato…",
           "membro": true, "scheda": "…", "stranezza": null },
  "regole_personaggio": "fa volentieri: porta, sorveglia, scrivi_onda… · mai: —",
  "stato": "[STATO ORA] … [LA SUA VITA] … [IMPRESE] …",
  "volonta": { "scrivi_onda": "accetta", "sabota": "rifiuta: la Repressione è al livello 3", "unisciti": "—" },
  "fattibilita": { "dipingi": "manca: 2 vernice", "compra": "ok: cassa 41.000", "porta_a": "ok" },
  "impegni": [ { "id": "p12", "verbo": "porta_a", "desc": "ti porta il pane", "stato": "in_corso", "passo": "al Forno" } ],
  "verbi": [ { "verbo": "porta_a", "args": "cosa, quanto, a", "desc": "va a prendere una cosa e la porta a qualcuno", "chi": "tutti" } ],
  "luoghi": "piazza=Piazza San Rocco; calata=Calata del porto; …",
  "persone": "gino=Gino Ferraro (bar); teresa=Teresa Pinna; …",
  "storia": [ { "chi": "giocatore", "testo": "…" }, { "chi": "npc", "testo": "…" } ],
  "context": "Ora: 11:23, Giorno: lunedì. …",
  "text": "Cono, l'onda in piazza. Di nascosto."
}
```

Per stare nel budget, `verbi` porta solo quelli che il personaggio può usare (un abitante non vede i verbi dei membri);
`luoghi` porta i 40 più vicini più quelli nominati nel testo; `storia` le ultime 8 battute.

**Prompt** (si aggiunge a `buildSystemPrompt()`, `server.js:347`, sistemando l'anno: «il 1986 come lo vede la Tutela»,
coerente con `risacca.js:1393`):

```
Compito: rispondi al giocatore (Nino, di Porto Vecchio) per conto del personaggio. NON decidi tu cosa succede: proponi
un intento, il motore controlla se si può fare e sceglie quale delle tue risposte usare.
Regole:
- "intento" usa SOLO i verbi di "verbi", con gli id di "luoghi" e "persone". Se la richiesta non è nella lista,
  intento = null e la risposta è un no in carattere ("non_so"): non inventare azioni.
- Se non sei sicuro di cosa chiede (quale posto, quale persona, quanto), intento = null e scrivi "domanda".
- Scrivi una risposta per OGNI esito possibile: "accetta", "rifiuta", "contratta", "chiede", "niente". Ognuna deve
  stare in piedi da sola. In "rifiuta" e "contratta" il motivo è quello di "volonta" e "fattibilita".
- Nessuna risposta promette cose che non sono nell'intento. Mai "ci vado", "te lo porto", "contaci", "domani faccio"
  fuori da "accetta".
- Se "volonta" dice contratta, metti in "contro_offerta" cosa vuole (soldi, un oggetto, un'altra ora, una prova).
- "impegni" sono le cose che ha già promesso: se il giocatore chiede come va, rispondi da lì, non inventare.
- Tono: frasi corte, street, chi parla si scopre (pigro, sbruffone, vigliacco). Niente aforismi, niente giochi di parole.
Rispondi SOLO con questo JSON:
{
  "intento": { "verbo": "…", "args": { … }, "quando": null|"adesso"|"stasera"|"HH:MM"|"domani HH:MM" } | null,
  "altri_intenti": [],
  "risposte": { "accetta": "…", "rifiuta": "…", "contratta": "…", "chiede": "…", "niente": "…" },
  "contro_offerta": null | { "tipo": "soldi", "quanto": 20 } | { "tipo": "oggetto", "cosa": "vernice", "quanto": 2 }
                         | { "tipo": "quando", "quando": "stanotte" } | { "tipo": "prova", "intento": { … } },
  "domanda": null | "…",
  "umore": "cordiale|sospettoso|stanco|ironico|spaventato|aggressivo",
  "persuasione": 0,
  "memoria": "una riga"
}
```

`max_tokens` passa da 400 a 650 (cinque risposte brevi). Se il JSON non si legge, si usa il ripiego, come oggi.

### 4.2 `kind: 'banda'` (nuovo)

**Richiesta**:

```json
{
  "kind": "banda", "versione": "parola1",
  "banda": { "ora": "23:10", "notte": true, "repressione": 3, "cassa": 41, "linea": "prudenza",
             "basi": "cantina=Cantina dei Lanternini [deposito; scorte: 3 gesso, 1 attrezzi]" },
  "membri": [
    { "id": "cono", "nome": "Sasà", "battaglia": "Cono", "voce": "entusiasta, sfrontato…", "dove": "Gelateria",
      "compito": null, "stanchezza": 0.2, "lealta": 0.7, "ha_con_se": "niente",
      "volonta": { "scasso": "contratta: non gli piace infrangere la legge", "sorveglia": "accetta" } }
  ],
  "verbi": [ … come sopra, solo M … , { "verbo": "piano", "args": "tipo, luogo, quando, ruoli?" } ],
  "ruoli": [ "palo", "scassa", "porta", "autista", "voce" ],
  "luoghi": "…", "impegni": [ … della banda … ],
  "storia": [ { "da": "player", "testo": "…" }, { "da": "cono", "testo": "…" } ],
  "text": "Stanotte l'Emporio. Organizzatevi."
}
```

**Prompt**:

```
Compito: è la chat della banda (la Risacca) al telefono. Rispondono i membri, ognuno con la sua voce.
- "destinatari": chi è chiamato in causa (id) o ["tutti"].
- "intenti": per ognuno dei destinatari, cosa gli si chiede (verbi e id delle liste). Per un'azione coordinata usa
  UN intento "piano" con i ruoli (palo, scassa, porta, autista, voce); se il giocatore non li dà, proponili secondo chi
  è più adatto, ma il motore li può cambiare.
- "battute": per ogni membro che parla, una battuta per OGNI esito ("accetta", "rifiuta", "contratta"); il motore
  sceglie quella che corrisponde a cosa ha deciso davvero. Al massimo 3 membri parlano.
- "obiezioni": un membro diverso dal destinatario può obiettare SOLO se la sua "volonta" per quell'azione è contratta
  o rifiuta; l'obiezione è un'opinione, non un'azione.
- Nessuna battuta promette cose che non sono negli intenti. Se non è chiaro, scrivi "domanda" e niente intenti.
Rispondi SOLO con questo JSON:
{
  "destinatari": ["cono"] | ["tutti"],
  "intenti": [ { "chi": "cono", "verbo": "scrivi_onda", "args": { "luogo": "piazza", "furtivo": true } } ],
  "piano": null | { "tipo": "colpo", "luogo": "emporio", "quando": "stanotte",
                    "ruoli": [ { "chi": "divisa", "ruolo": "palo" }, { "chi": "beppe", "ruolo": "scassa" }, { "chi": "cono", "ruolo": "porta" } ] },
  "battute": [ { "chi": "cono", "accetta": "…", "rifiuta": "…", "contratta": "…" } ],
  "obiezioni": [ { "chi": "divisa", "testo": "…" } ],
  "domanda": null | { "chi": "cono", "testo": "…" },
  "memoria": "una riga per la banda"
}
```

`max_tokens` 800. Il client (`parola.js`) verifica ogni intento e ogni ruolo, posta nell'ordine del §2.7 le battute che
corrispondono agli esiti, scarta le obiezioni di chi in realtà accetterebbe e scarta tutto quello che promette senza
promessa (il cane da guardia).

### 4.3 La strada Claude «sample»

`RS.chatRules` (`risacca.js:1390-1427`) sotto `?parola` chiede lo stesso schema di 4.1 al posto di
`{risposta, azioni}`. Così le tre strade (Claude, Mente, ripiego) finiscono tutte in `Parola.rispondi` con un intento,
le risposte per esito e l'eventuale contro-offerta. `applyReply` resta per il gioco senza flag.

---

### 4.4 `kind: 'mandato'` (nuovo, il centro del §0)

Si usa quando il testo (in chat o nella banda) contiene un obiettivo aperto. Il client lo capisce con
`capisciMandato` (§0.4) oppure, se non è sicuro, lo chiede insieme al dialogo (un campo `mandato_possibile: true`).

**Richiesta**: come `dialogo` (o come `banda`), più

```json
{
  "kind": "mandato", "versione": "parola1",
  "modelli": [ { "tipo": "soldi", "misura": "cassa", "metodi": [ { "id": "turni", "fasi": "lavora|ripara|pesca", "illegale": false },
                                                                  { "id": "scasso", "fasi": "trama scasso", "illegale": true } ] } ],
  "metodi_ammessi": { "beppe": ["turni", "vendi_roba", "colletta"] },   // già filtrati dal motore col carattere e i vincoli (§0.3)
  "mezzi": { "beppe": "Vespa, attrezzi, mestiere officina 9/ora, amici: Nico, Tore" },
  "text": "serve fare soldi per la cassa comune e reclutare due nuovi compagni"
}
```

**Risposta**:

```json
{
  "mandati": [
    { "tipo": "soldi", "quanto": 100, "entro": "giovedì sera", "vincoli": { "pulito": false, "niente": [] },
      "chi": "beppe",
      "metodo": "turni",
      "fasi": [ { "verbo": "ripara", "args": { "ore": 4 }, "quando": "stasera" },
                { "verbo": "vendi_mezzo", "args": { "mezzo": "vespa" }, "quando": "giovedì mattina", "se": "progresso < 60" } ],
      "battute": { "accetta": "…", "contratta": "…", "rifiuta": "…", "piano": "Faccio così: …" } },
    { "tipo": "recluta", "quanto": 2, "chi": "beppe", "metodo": null,
      "battute": { "rifiuta": "Reclutare no, io con la gente non ci so parlare." } }
  ],
  "divisione": null | [ { "chi": "beppe", "mandato": 0, "parte": 60 }, { "chi": "vinile", "mandato": 1, "parte": 2 } ],
  "obiezioni": [ { "chi": "divisa", "contro": "betamax", "testo": "…" } ],
  "domanda": null | "…"
}
```

Regole aggiunte al prompt: «"metodo" deve essere uno di "metodi_ammessi" per quel personaggio; "fasi" usa solo i verbi
della lista; non scrivere quanto rende una fase, lo calcola il motore; se un mandato non si può fare con i metodi ammessi,
scrivi solo la battuta di rifiuto, col motivo». `max_tokens` 900. Il motore poi rifà le stime, toglie le fasi che non
passano e completa il piano con il modello del §0.2.

## 5. Dodici scambi nel tono

Le strutture sono varie, come chiede TONO.md (correzione 2). Fra parentesi l'esito del motore che sceglie la battuta.

**1. Accetta, e poi gli aggiornamenti** (membro, `scrivi_onda` furtivo; gesso in base, notte)
> **Nino**: Cono, l'onda in piazza. Di nascosto.
> **Cono**: Di nascosto io? Mia madre ancora non sa che fumo. Vado. *(accetta → promessa p1, task in corso)*
> ↩ **Cono**: Sono in piazza. C'è solo quello del chiosco, e dorme in piedi. *(arrivo)*
> ↩ **Cono**: Fatta. Grossa così, si vede dal molo. *(fatta; il motore: «Morale +3»)*

**2. Rifiuta con il motivo vero** (Garza, `sabota` è fra i suoi `never`, `risacca.js:194`)
> **Nino**: Garza, stanotte la campagnola davanti alla caserma.
> **Garza**: Io ricucio quelli che ci provano, Nino. Chiedilo a Dorino: lui ci gode a sporcarsi le mani. *(rifiuta{never})*

**3. Contratta in soldi** (Betamax, avido, `contrabbando` di notte)
> **Nino**: Betamax, al pontile stanotte.
> **Betamax**: Per la causa no. Per trenta sì. Ho una figlia e le figlie costano più delle cassette. *(contratta{soldi:30})*
> *[Paga 30.000] [Prometto] [Lascia stare]*
> **Nino** paga 20 *(persuasione)*
> **Betamax**: Venti e mi offri la colazione. Domani. Al bar. *(accetta + promessa del giocatore: «colazione a Betamax entro domani»)*

**4. Gli manca una cosa e la chiede** (`dipingi`, `plan()` dà «Servono 2 di vernice», `risacca.js:572`)
> **Nino**: Fai un murale sulla calata.
> **Cono**: Con cosa, con lo sputo? Portami due bombolette e ti faccio la Cappella Sistina. *(chiede{oggetto: vernice ×2})*
> *[Prometto]* → nel Taccuino, *Hai promesso tu*: «A Cono: 2 vernice · entro domani sera»

**5. «Portami del pane» a un abitante** (Teresa, non membro, il Forno è aperto, ha 2.000 lire)
> **Nino**: Teresa, mi porti del pane?
> **Teresa**: Te lo prendo, ma lo paghi tu. Io ho appena pagato la luce a mio cognato, e lui non ce l'ha nemmeno, la luce. *(contratta{soldi:2})*
> **Nino**: Tieni. *(ricevi_soldi 2 → accetta → `porta_a`, Azioni: compra al Forno, consegna)*
> ↩ **Teresa** (fumetto, da vicino): Eccolo. È di ieri, ma tu non sei schizzinoso. *(fatta)*

**6. Fallisce e lo racconta** (membro, `porta`, Grigi a 12 m dall'Emporio durante il `go`)
> ↩ **Cono**: Grigi in vista. Tre, con la campagnola. *(pericolo)*
> ↩ **Cono**: Non ce l'ho fatta. Uno mi guardava le scarpe. Le scarpe *nuove*, Nino! *(fallita{pericolo}: nessuna perdita di fiducia)*

**7. Non capisce e chiede** (dubbio: `calata` e `osteria_porto`)
> **Nino**: Vai alla calata del porto.
> **Cono**: La calata o l'osteria? Perché all'osteria ci vado anche senza ordini. *(chiede{ambiguo})*

**8. La banda non è d'accordo** (piano, notte con la luna piena, linea Prudenza)
> **Nino** *(banda)*: Stanotte tutti all'Emporio.
> **Candela**: Ci sto. Il piede di porco ce l'ho io, quindi comando io. *(accetta: ruolo scassa)*
> **Divisa**: Con la luna piena ci vedono pure dal continente. Il palo lo faccio, ma da lontano. *(contratta → accetta con palo a 25 m)*
> **Garza**: Io no. Se vi beccano, chi vi ricuce? Io. Quindi resto a casa. Per voi. *(rifiuta{paura})*
> ⚙ Piano «Emporio»: ritrovo 01:30 al Vico, Candela apre, Divisa fa il palo, Cono porta. Garza non viene.

**9. Uno della banda dice di no** (Vinile, stanchezza .85)
> **Nino** *(banda)*: Vinile, altre due ore di radio.
> **Vinile**: Tesoro, ho fatto tre ore. Se vado avanti mi metto a dare le previsioni del tempo in sardo. Domani. *(contratta{dopo: 08:00})*

**10. Gli aggiornamenti mentre lavorano** (il piano dell'8)
> ↩ **Divisa**: Al mio posto. Strada vuota.
> ↩ **Candela**: Dentro in un minuto. Ve l'avevo detto, no? Ve l'avevo detto.
> ↩ **Divisa**: Grigi in vista. …Falso allarme, è il furgone del latte.
> ↩ **Cono**: Roba in base. Nessuno ci ha visto. Credo. Uno col cane forse sì, ma il cane non parla.
> ⚙ Emporio: +62.000 lire e una cassa di merce. Visti da 1.

**11. La parola rotta, e chi se la ricorda** (il giocatore non va all'appuntamento delle 18)
> *(il giorno dopo, Gino viene da te: visita «ricorda»)*
> **Gino**: Alle sei in piazza, avevi detto. Alle sei c'ero io, un piccione e un Grigio. Il piccione almeno è rimasto fino alla fine.
> *(fiducia −.08; nel Taccuino: ⊘ «Appuntamento con Gino · non sei andato»)*

**12. Reclutare non è un saluto** (Teresa, fiducia .1, nessuna promessa mantenuta)
> **Nino**: Unisciti alla Risacca.
> **Teresa**: Ti conosco da dieci minuti e mi chiedi di andare in galera con te? Prima portami la legna. Poi vediamo se sei uno che porta le cose. *(contratta{prova: porta_a legna ×2})*
> *[Prometto]* → quando la legna arriva: promessa del giocatore `fatta`, fiducia +.06; la volta dopo «unisciti» passa la regola del §2.2.

E una battuta di strada legata alla sua azione (§2.6): il cliente arrabbiato di `eventi.js:583` dice **«Vado da Wu,
allora!»** e va davvero all'Alimentari Wu (`go: place:wu`). Se Wu è chiuso, dice «E Wu è chiuso. Pure Wu.» e se ne va a casa.

---

## 6. Le prove: 25 richieste e 6 mandati, senza IA e con l'IA finta

**Dove**: `src/test_parola.js`, sullo schema di `scratchpad/chat.js` (mappa nuova: `world_cittanuova.js`; gli stessi
`require`, poi `Parola`). Si lancia con `node test_parola.js [seme]`, nessun browser. Due modalità:
- **R** (ripiego): `Parola.capisci` dal testo;
- **F** (IA finta): per ogni caso una risposta JSON fissa in `test_parola_ia.json`, scritta apposta anche **sbagliata**
  (l'IA che promette senza intento, che inventa un verbo, che usa un luogo che non c'è). Prova la catena, non il modello.
- in più, **L** (vera, facoltativa): `PAROLA_LIVE=1` manda le stesse 25 a `http://localhost:8080/api/mente` se il server
  gira con una chiave. Il controllo è uguale, si scrive solo un registro (il modello cambia ogni volta).

Preparazione comune: seme 1, si avanza fino alle 11:23 come chat.js; Cono e Divisa entrano nella Risacca (`RS.join`);
una base `cantina` con 3 gesso; cassa 40; il giocatore ha 30.000 lire e nello zaino 1 pane. Dopo ogni risposta si fanno
girare N minuti di gioco (`G.step`) e si controllano promessa, compito e chat. Con **«mai sì-poi-✗»**, che vale per tutti
i casi: in nessuno la battuta scelta può contenere le forme dell'impegno se l'esito non è `accetta` (`Parola.promette`).

| # | Chi | Frase | Mod. | Esito atteso | Dopo |
|---|---|---|---|---|---|
| 1 | Cono | «seguimi» | R | accetta, `seguimi`, promessa `in_corso` | 2 min: Cono a < 3 m dal giocatore |
| 2 | Teresa (A) | «vieni con me» | R | accetta, `seguimi` → `with` 1 ora | 61 min: `P.with` nullo, promessa `fatta` |
| 3 | Gino (A) | «vediamoci alle 18 in piazza» | R | accetta, `appt` | alle 18:10 Gino in piazza; il giocatore non c'è → alle 18:51 promessa del giocatore `rotta`, fiducia di Gino −.08 |
| 4 | Cono | «vai alla calata del porto» | R | **chiede** (dubbio calata/osteria) | nessun compito |
| 5 | Cono | «vai alla calata» | R | accetta, `vai` a `calata` (non l'osteria) | 10 min: distanza da `PLACES.calata` < 2 m |
| 6 | Cono | «dipingi un murale sulla calata» | R | **chiede{oggetto: vernice ×2}**; battuta senza «vado», «fatto» | nessun compito; dopo `Prometto`: promessa del giocatore `attesa` |
| 7 | Cono | come 6, dopo aver messo 2 vernice in base | R | accetta, `dipingi` | 90 min: `st.ris.murals.length` +1, promessa `fatta`, aggiornamento «arrivo» nel thread |
| 8 | Teresa | «portami del pane» | R | contratta{soldi} (o accetta se ha soldi suoi e fiducia) | dopo `ricevi_soldi 2`: Azioni `compra` al Forno; 30 min: pane nello zaino del giocatore, promessa `fatta` |
| 9 | Teresa | «dammi una sigaretta» | R | `dammi`: se ne ha, accetta o contratta; se non ne ha, rifiuta{manca} «Non fumo. Cioè, non compro.» | zaino coerente con l'esito |
| 10 | Cono | «tieni d'occhio Gino» | R | accetta, **`pedina{gino}`** (non `sorveglia` della piazza) | 60 min: Cono a 6-14 m da Gino per ≥ 80% dei controlli; rapporto con i posti veri di Gino |
| 11 | Cono | «tieni d'occhio la caserma per 2 ore» | R | accetta, `sorveglia{commissariato, 2}` | 2 ore e 20: promessa `fatta` |
| 12 | Divisa | «avvisami se arrivano i Grigi in piazza» | R | accetta, `veglia` | si porta un Grigio in piazza: entro 2 minuti messaggio «Grigi in vista» e promessa `fatta` |
| 13 | Teresa | «unisciti a noi» (prima volta) | R | **contratta{prova}**, nessun `join` | `n.ris.member` falso |
| 14 | Teresa | «unisciti a noi», dopo la prova mantenuta e un giorno | R | accetta (se l'odio per la Tutela basta) o contratta col motivo | `member` coerente con l'esito |
| 15 | organizzatore di un'impresa (`Imprese.list` in cerca) | «vengo anch'io» | R | accetta, `partecipa` | `E.members` contiene `player`; all'ora: il giocatore non c'è → nota «aveva detto che veniva» e promessa del giocatore `rotta` |
| 16 | Cono | «ti do 50» (il giocatore ne ha 30) | R | **rifiuta{manca}** detto dal motore («Non li hai, i cinquanta.»), mai «Va bene» | soldi invariati |
| 17 | Cono | «monta la stamperia» (nessuna base con posto) | R | rifiuta{impossibile}, **un solo** esito | nessun «Contaci» |
| 18 | Garza | «sabota la campagnola» | F (l'IA scrive «Va bene, stanotte» in `risposte.rifiuta`) | rifiuta{never}; il cane da guardia scarta la frase dell'IA e usa la banca | `stats.guardia` = 1 |
| 19 | Teresa | «aspettami qui» | F (intento `null`, `risposte.niente` = «Sì, ti aspetto qui.») | niente; la battuta promette → scartata | nessuna promessa, `stats.guardia` +1 |
| 20 | Cono | «rubami una vespa» | F (intento `{verbo:'ruba_vespa'}`, non esiste) | rifiuta{non_so} in carattere | nessun compito |
| 21 | Cono | «scrivi l'onda in piazza» | F corretta | accetta, battuta da `risposte.accetta` | 40 min: `goals.onde` +1 |
| 22 | banda | «Cono, l'onda al caruggio. Divisa, sorveglia la caserma.» | R e F | due promesse, due risposte nell'ordine, nessuna obiezione (tutti e due accettano) | dopo 3 ore: due `fatta`, aggiornamenti con il nome giusto nel thread `banda` |
| 23 | banda | «tutti: stanotte l'Emporio» (piano), Garza con paura | F | piano con 3 ruoli; Garza rifiuta (battuta di `rifiuta`); un'obiezione di Divisa solo se la sua volontà è contratta | all'01:30 passo `sync`; si mette un Grigio vicino al palo → «Grigi in vista», gli altri smettono, promesse `fallita{pericolo}`, nessuna perdita di fiducia |
| 24 | banda | «Vinile, altre due ore di radio» (stanchezza .85) | R | contratta{dopo} | nessun compito adesso; dopo `Prometto`/«va bene domani»: promessa `attesa` con `quando.at` 08:00 che parte da sola |
| 25 | — (parole da sole) | scena `eventi.js:583` forzata; reazione `chiama` con `intend` impedito (P.emer prio 3); `social offri` con 0 lire | — | «Vado da Wu» → va all'Alimentari Wu; «chiamo la Guardia» non esce se la telefonata non parte; «Offro io» non esce se ha 0 lire | e `parola_lint.js`: 0 stringhe che promettono senza `fa:`/`annuncia`/`bugia` |

**I mandati** (sei casi in più, stessa preparazione, con 3 giorni di gioco simulati; senza IA e con l'IA finta):

| # | Chi | Frase | Atteso |
|---|---|---|---|
| 26 | Candela | «servono soldi per la cassa, un centinaio, entro giovedì» | mandato `soldi`, metodo `turni` (non scasso); dopo 3 giorni la cassa è salita davvero e la barra del Taccuino = cassa − base; almeno 2 rapporti `parziale` e uno `finale` con gli stessi numeri |
| 27 | Garza | «fai soldi, come vuoi» | metodo mai illegale (never ruba, legge alta), nemmeno se l'IA finta propone `scasso`: il motore lo scarta (`stats.guardia` +1) |
| 28 | un abitante col giro ladro e due amici dello stesso giro | «mi servono soldi» | metodo `scasso` via trama, con capo lui; con `pulito` nella frase invece niente scasso |
| 29 | Betamax con l'interesse carte | «la cassa piange» + 20.000 | metodo `bisca`; si forza il seme in cui perde: progresso negativo, mandato `fallito`, conseguenza scritta nel Taccuino |
| 30 | Vinile | «trovami due compagni» | mandato `recluta`, N=2; si mette un `orecchio` fra i candidati: senza vincolo «prudenza» può entrare e la Repressione sale; con «stai attenta» c'è prima un giorno di `pedina` e l'Orecchio non entra |
| 31 | banda | «soldi per la cassa e due compagni nuovi, entro venerdì» | due mandati divisi fra almeno 3 membri; un'obiezione solo se un metodo scelto ha rischio ≥ .6 e la linea è Prudenza; un riepilogo del referente; somma delle parti ≥ obiettivo |

**Il registro**: per ogni caso, una riga come chat.js (`> frase / dice / esito / promessa / dopo N min`) più `✔`/`✗`.
La prova esce con 1 se un caso fallisce. Tempo atteso: come chat.js (meno di 5 minuti con le ore simulate).

---

## 7. Come farlo: passi, misure, chi tocca cosa

Tutto sotto `window.PV_PAROLA = /[?&](parola|commedia)\b/.test(location.search)` (una riga in `index.src.html`, accanto a
`PV_NUOVA`, riga 336); in Node `global.PV_PAROLA = true`. Ogni gancio nei file che esistono già è un `if (PARO)`, così
senza flag il codice fa esattamente quello che fa oggi.

| Passo | Cosa | File | Misura |
|---|---|---|---|
| 1 | Flag, scheletro di `parola.js` (stato `st.parola`, `promette`, `BANCHE` vuote), `test_parola.js` con i casi 1-7 in rosso | `index.src.html` (+2 `<script data-m>`: `parola` dopo `trame`, `parola_ui` dopo `risacca_ui`), `src/parola.js`, `src/test_parola.js` | ½ giorno |
| 2 | **Si esegue, poi si parla**: `capisci` (intenti dal testo, con `trovaLuogo/Persona/Cosa`), `verifica`, `rispondi`, il cane da guardia; `risacca_ui.send()` chiama `Parola.rispondi` invece di `fallback`+`applyReply` | `parola.js`, `risacca_ui.js:283-325` (5 righe dietro il flag) | 1 giorno. **Da solo toglie il «Fatto, vado.» → ✗ e la calata sbagliata.** |
| 3 | La promessa e gli adattatori; i ganci `RS.EXT.onFinish`/`onStep` in `finishTask`/`nextStep`; `Azioni.CFG.onEnd` in `endPlan`; `pid` in appuntamenti e imprese; gli aggiornamenti e le conseguenze | `parola.js`; `risacca.js:1028-1035` (+3 righe); `azioni.js:192` (+1 riga); `convivenza.js` (un `check` senza effetti per `appuntamento`/`accompagna`, `pid`) | 1½ giorni |
| 4 | I verbi nuovi: `porta_a` (+ passo `consegna`), `dammi`, `compra_da`/`vendi`, `pedina` (passo `shadow`), `avvisa`/`veglia`, `aspetta`/`vai` per gli abitanti, `stato`, `annulla`, `offri`; la regola dura di `unisciti` | `parola.js` (tramite `RS.EXT.plan`, `RS.EXT.do`, `RS.EXT.immediate`, che ci sono già, `risacca.js:404`); `risacca.js:364-367` (`willMod` dietro il flag, senza cambiare la formula di base) | 1½ giorni |
| 5 | Server: `dialogo` `parola1` e `banda`; `mente.js` manda regole, stato, volontà, fattibilità, impegni e storia; rigenerare `api/_mente.js`; il filtro delle promesse su Coro e chiacchiera | `server.js:446-462` e nuovo blocco; `mente.js:131-160`; `strumenti_inverno/mente_vercel.py` (lancio); `coro.js` (filtro al punto in cui legge `battute`) | 1 giorno |
| 6 | La chat della banda: thread `banda`, destinatari, ordine delle risposte, obiezioni, `piano` con ruoli, passo `sync`, palo che avvisa, tempo al rallentatore | `parola.js` (logica), `parola_ui.js` (finestra: riusa `#rs-chat` e `renderChat`), `risacca.js` `runTask` (+ caso `sync` e `shadow`, ~25 righe dietro il flag), bottone nel pannello `risacca_ui.js:373` | 2 giorni |
| 7 | Le parole da sole: `Parola.annuncia`, `fa:` nelle scene (un passo nuovo nell'interprete di eventi.js: `fa`), le righe della tabella del §2.6, `parola_lint.js` | `eventi.js` (interprete dei passi + 6 scene), `azioni.js:736-748`, `:953-957`, `popolo.js:1867-1891`, `protagonista.js:176-200`, `creativita.js:183`, `matti.js` (marcature), `game.js:1237`, `mente.js:158`, `strumenti/parola_lint.js` | 1 giorno |
| 8 | Quello che si vede: scheda «Parola data» nel Taccuino, etichette ⟳/◎/✓/✗, bottoni Prometto/Paga, pallino dei messaggi; le banche di battute nel tono (circa 220 righe: 5 esiti × 14 motivi × 3 voci, più aggiornamenti); i 25 casi verdi | `parola_ui.js`; `main.js:759` (una scheda in più nel `nav`, o un gancio `PV().bookTabs` se chi tiene main.js preferisce); `risacca_ui.js:453` (etichetta) | 1½ giorni |
| 9 | **I mandati** (§0): `MANDATI` (modelli, metodi, pesi), `capisciMandato`, il ciclo orario e la revisione serale, il progresso dallo stato, `vendi_mezzo`, la trappola per l'Orecchio, la divisione nella banda con le obiezioni e il referente, kind `mandato`, scheda «Mandati» del Taccuino, casi 26-31 | `parola.js`, `parola_ui.js`, `server.js` + `api/_mente.js`, `trame.js:58` e `imprese.js:65` (un argomento per avviarli da fuori), `risacca.js:1334` (una riga) | 3 giorni |

**Totale: circa 13 giorni di lavoro**, di cui 2 per scrivere le battute (anche quelle dei mandati). Codice nuovo stimato: `parola.js` 900-1.100
righe, `parola_ui.js` 350, ganci nei file che esistono circa 120 righe, prompt 90, prove 450. **L'ordine conta**: dopo i
passi 1-3 il problema principale è già risolto per chi gioca senza chiave; dopo il 5 anche per chi gioca con la Mente.
Dal 6 in poi è roba nuova; il 9 (i mandati) è il centro della richiesta di Andrea e si appoggia su tutti i passi prima, quindi va per ultimo ma va fatto: senza il 9 si danno ordini, non mandati.

**I file di altre squadre (non si toccano)**:
- `strada_dipinta.js` (distribuzione dei segni), **il posizionamento in `writing.js`**, `urbanistica2.js` e la mappa,
  `vegetazione.js` e gli alberi, i modelli dei personaggi (`personaggi.js`, `models.js`, `modella.js`, animazioni).
- **`writing.js:560-561`** («Adesso chiamo i Grigi») è reazione e non posizionamento, ma sta nel loro file: si propone a
  chi lo tiene il gancio `if (window.Parola) Parola.annuncia(…)` e lo si mette solo con il loro sì. Finché non c'è, la riga
  resta com'è e `parola_lint.js` la segna come «eccezione nota».
- Le etichette sopra i personaggi sono HTML (`risacca_ui.js`), non toccano i modelli. Le basi e i murali in 3D restano
  come sono.
- `orienta.js` decide i tasti: il tasto della chat della banda va concordato (`orienta.js:400-420`).

**Decisioni per Andrea**
1. La chat della banda **ferma il tempo** come quella con una persona, oppure lo **rallenta** così gli aggiornamenti
   arrivano mentre la leggi? (Proposta: rallenta.)
2. Il giocatore promette **scrivendo** («te la porto») o **con il bottone «Prometto»**? (Proposta: tutti e due; conta il
   bottone, la frase lo propone.)
3. Chi mente per il motore (Orecchi, la Zia, Betamax col segreto) può **accettare e tradire**? Le parole corrispondono
   alle intenzioni vere, e lo scopri dai fatti. (Proposta: sì, ma solo per loro, e mai più di una volta per partita a
   testa.)
4. I verbi violenti di azioni.js (uccidi, sbarazzati) restano **fuori dalla chat**? (Proposta: sì.)
5. I mandati agli abitanti (non membri): solo per gli obiettivi che sono anche loro interessi (§0.4), o per tutti? E la scadenza di default di 3 giorni va bene?
6. Reclutare: la soglia del §2.2 (fiducia .3, una promessa mantenuta, due giorni) va bene, o la vuoi ancora più lenta?
