# Tutti gli attrezzi a tutti: un solo spazio d'azione per abitanti, banda e giocatore

Terza tornata. La direzione artistica chiede **libertà d'azione dentro le funzioni del gioco**. Se un abitante vuole piantare un chiodo o fare un ponte e l'opzione non c'è, non può farlo. Quindi, per tutto quello che vogliamo far fare agli agenti, gli agenti devono avere tutti gli strumenti. Il chiodo e il ponte sono esempi, non funzioni da costruire. La risposta delle fonti è chiara. **I giochi che sembrano liberi non danno agli NPC una mente più grande: danno a tutti lo stesso catalogo di azioni, lo stesso inventario e le stesse regole sui materiali**, e trattano il giocatore come un agente il cui selettore è il controller.

Bellwright lo dice in una frase: «gli NPC ora fanno esattamente le stesse cose del giocatore». Lo studio ha buttato via il prototipo in cui le risorse comparivano da sole perché «non ispirava» ([80.lv](https://80.lv/articles/how-bellwright-simulates-a-living-medieval-world-with-thousands-of-npcs)). Bannerlord lega i lord «alle stesse restrizioni e regole del giocatore» ([blog Campaign AI](http://www.gamebanshee.com/3wfc8)). In RimWorld l'ordine del giocatore e il lavoro autonomo producono lo stesso Job ([RimWorld wiki](https://rimworldwiki.com/wiki/Modding_Tutorials/Code_MendingJob)). Nei Sims «i Sim stessi sono solo un oggetto un po' più elaborato» ([Forbus & Wright](https://qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf)). Zelda è passato dal design "additivo" al "moltiplicativo" con un motore chimico che calcola stati da regole sui materiali. Con l'Ultrahand ha **tolto dal gioco ogni oggetto non fisico**, perché ogni eccezione era un baco quotidiano ([GDC 2024](https://www.gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving)).

Per Porto Vecchio questo cambia la diagnosi. Il motore ha già quasi tutto, ma diviso in **sei cataloghi di forma diversa**:
- `azioni.js` ha ~30 verbi con modi e un pianificatore (`can`, `intend`);
- `iniziative.js` ha 18 verbi;
- `mestieri.js` ha le azioni di mestiere;
- `casa.js` ha `Casa.fai`;
- `oggetti.js` ha 142 ricette;
- `cantiere.js` ha ≈114 voci di catalogo.

Le azioni del giocatore passano poi da `Azioni.playerActions`, scritto a mano a parte (il corpo, la pala, il telefono, la bomboletta). È qui che nasce il problema: un NPC "non trova il chiodo" quando il chiodo vive solo nel menu del giocatore, o solo nelle ricette, o solo nel cantiere. La proposta non riscrive i sei moduli. Mette sopra di loro **un registro unico di verbi dichiarati come dati**, che i sei moduli alimentano con adattatori. Il menu del giocatore e il pianificatore degli NPC leggono lo stesso registro.

Le note di questa tornata stanno in `research_notes/NPC vivi senza IA strumenti/`:
- `giochi_stesse_regole.md`
- `oggetti_affordance_chimica.md`
- `pianificatori_e_costi.md`
- `costruzione_progetti_invenzione.md`
- `animazione_senza_script.md`
- `lod_e_passaggio_di_mano.md`

---

## 1. Cosa fa ogni gioco e cosa rubiamo

| Gioco o sistema | Cosa fa (verificato dove indicato nelle note) | Cosa rubiamo |
|---|---|---|
| **Bellwright** | Tutti gli NPC con la stessa logica; per la legna fanno l'ascia, abbattono, lavorano, portano; > 1.000 NPC simulati sempre | Il criterio di rifiuto: nessuna risorsa che compaia senza un verbo |
| **Mount & Blade II** | Lord con le regole del giocatore; azioni (rifornirsi, pattugliare, difendere, razziare, assediare, inseguire) con la distanza come fattore comune più fattori propri | L'utilità per azione scritta come dato: distanza sempre, più le considerazioni proprie |
| **RimWorld** | WorkGiver → Job → Toil; prenotazione prima di partire; condizioni di fallimento; ordine del giocatore e lavoro autonomo producono lo stesso Job | La porta unica e la **prenotazione** |
| **The Sims** | Ogni comportamento = esegui + verifica + advertisement dei bisogni; il Sim sceglie fra tutti i comportamenti di tutti gli oggetti; il pilota automatico «troppo bravo» | La terna di ogni verbo; il giocatore come Sim senza selettore; il limite al pilota automatico |
| **F.E.A.R. (GOAP)** | Tre stati (Goto, Animate, UseSmartObject); stato a slot fissi da 4 byte; costo per azione; precondizioni procedurali; obiettivi separati dalle azioni e condivisi tra tipi di nemico | Il corpo fa solo "vai" e "gesto con oggetto"; il costo per azione come manopola di carattere; l'attenzione fuori dal pianificatore |
| **HTN (Transformers, Horizon)** | Compiti composti con metodi; più veloce del GOAP precedente; piani parziali scritti a mano nei domini | Metodi come alternative di un verbo; piano fino al primo "vai" |
| **Utilità (Dave Mark, IAUS)** | Considerazioni su curve, moltiplicate; usata per agenti, squadre, oggetti | La scelta dell'obiettivo (non del come) |
| **Caves of Qud** | Oggetti come insiemi di proprietà composte; la Dominazione passa il controllo a qualsiasi creatura e lascia fermo il corpo originale | Il cervello come componente sostituibile; il corpo lasciato come gag |
| **Dwarf Fortress (Avventura)** | Gruppo di avventurieri, si passa da uno all'altro; abilità come token `CAN_DO_INTERACTION` nei dati della creatura; bachi storici quando due modalità eseguono la stessa abilità | Abilità come dati per persona; un solo esecutore per abilità |
| **Kenshi** | Recluta quasi chiunque; pacchetti IA della squadra (segui, medico, guardia del corpo) | I pacchetti come etichetta che cambia entrando in banda |
| **Watch Dogs: Legion** | Ogni recluta con abilità e gadget propri; poche eccezioni; critica: idea grande in una struttura vecchia | 3-4 differenze che cambiano le scelte, prese dal mestiere, dalle relazioni, dalle tasche |
| **S.T.A.L.K.E.R.** | A-Life online entro ~150 m e offline grezzo; STALKER 2 criticato per l'offline debole | Due esecutori per ogni verbo, con un test di parità |
| **Rain World** | Creature che vivono per sé, fuori schermo cacciano e litigano; corpi fatti di punti a distanza fissa | Gli oggetti grandi portati come due punti, senza animazione dedicata |
| **Zelda BotW / TotK** | Motore chimico (elementi × materiali); niente oggetti non fisici; «un sistema che fa succedere cose divertenti» | Vocabolario chiuso di proprietà dei materiali; nessun oggetto fuori dal registro |
| **Noita** | Ogni pixel simulato con regole locali semplici | Il principio di poche regole locali tra proprietà |
| **Scribblenauts** | Database di parole senza codice per parola; categorie con eredità «ma sempre eccezioni» | 80% ereditato, 20% eccezioni scritte |
| **Immersive sim (Harvey Smith; Dark Engine [non verificato])** | Differenziazione ortogonale delle unità; stimoli e recettori | I mestieri della banda che si coprono a vicenda; la tabella stimolo × recettore |
| **UE5 Smart Objects + Mass** | Prenotazione delle smart object; LOD per entità con tre clienti | Prenotazione come primitivo; LOD separato tra resa e simulazione |
| **Minecraft (paesani; MinePlanner; Voyager)** | Brain a sensori, memorie e attività; i pianificatori classici non reggono migliaia di oggetti; Voyager salva abilità riuscite come codice (ma con GPT-4) | Sensori a frequenza fissa; mondo filtrato prima di pianificare; **libreria di abilità senza LLM** |
| **Valheim, Townscaper, Going Medieval** | Sostegno a conteggio con colori; WFC dal vivo a iniziativa mista che fallisce in silenzio; ordine dei passi in costruzione come baco ricorrente | L'NPC dice dove e che famiglia, il risolutore sceglie il pezzo; progetti come grafo di dipendenze |
| **Ostrom (ADICO)** | Attributi, Deontica, Azione, Condizioni, Sanzione; modelli ad agenti in cui le istituzioni emergono copiando | Le usanze che diventano norme scritte nello stesso formato delle precondizioni |
| **Avida; nascondino di OpenAI** | Funzioni complesse solo se i passi intermedi pagano; strumenti emersi da 500 milioni di partite | Progetti con tappe che valgono da sole; la ricerca di combinazioni **fuori linea**, spedita come dati |
| **Spore, Overgrowth, Spider-Verse, Hi-Fi Rush** | Animazione indipendente dal corpo con IK; poche pose chiave; smear di 1-2 fotogrammi e onomatopee | Gesto generico per famiglia + oggetto in mano + fumetto d'azione |
| **Ultima Online** | L'ecologia delle risorse tolta in beta; il modello rubinetti-scarichi | Bilancio delle risorse misurato nel banco di prova |

---

## 2. Lo strato degli strumenti: dove si innesta

Il nuovo strato non è l'undicesimo in cima: è **il pavimento comune** fra lo strato 1 (il mondo come fatti) e lo strato 2 (pulsioni e scelta). Lo chiamo **strato 1½, "Strumenti"**. Ogni strato della seconda tornata ci scrive o ci legge:

| Strato (seconda tornata) | Cosa dà allo strato Strumenti | Cosa ne riceve |
|---|---|---|
| 0. Tempo e LOD | La coda di eventi; la reidratazione | Ogni verbo ha un esecutore `lontano` chiuso: un evento in coda, niente tick |
| 1. Il mondo come fatti | Il registro dei fatti con causa | Ogni esecuzione produce un fatto tipizzato `(verbo, chi, oggetto, sostituto?, esito)` |
| **1½. Strumenti** | — | Registro dei verbi, proprietà dei materiali, prenotazioni, pianificatore, risolutore di progetti |
| 2. Pulsioni e scelta | I bisogni e l'assuefazione | Gli advertisement degli oggetti e dei verbi come opzioni |
| 3. Affetto | L'umore PAD | Il costo dei metodi si sposta con l'umore (arrabbiato: "rompi" costa meno di "ripara") |
| 4. Status | Status sociale e giocato | La sostituzione davanti a testimoni è una transazione di status (§4) |
| 5. Memoria sociale | Credenze con fonte | Le invenzioni sono credenze con autore ("è stato Gino a inventare la padella-martello") |
| 6. Cultura | Meme, usanze | Le abilità scoperte diventano meme; le usanze ripetute diventano norme ADICO |
| 7. Setaccio e regista | Fili aperti | I progetti sono fili naturali con tappe; il regista può "prestare" un attrezzo mancante |
| 8. Superficie italiana | Realizzatore, schemi comici | Le onomatopee e i nomi dei sostituti come lessico |
| 9. Fuori linea | Taratura evolutiva | Analisi di raggiungibilità sul grafo verbi-ricette; ricerca di combinazioni comiche |

### 2.1 Il registro unico dei verbi, come dato

Una voce del registro ha la terna dei Sims (esegui, verifica, pubblicizza). Aggiunge le precondizioni ed effetti a slot di F.E.A.R., i metodi di HTN, i due esecutori di STALKER, la prenotazione di RimWorld e la resa a quattro livelli. Esempio con il chiodo, che è un esempio e non una funzione da fare:

```js
// registro/verbi.js — dati, nessuna chiusura. Il codice esistente si aggancia per nome (esegui: 'azioni.wallSteps' ecc.)
piantare: {
  ruoli: {                       // chiede proprietà, non oggetti
    percussore: { ha: ['rigido', 'pesante', 'impugnabile'], preferito: 'martello' },
    perno:      { ha: ['appuntito', 'rigido', 'piccolo'],   preferito: 'chiodo' },
    supporto:   { ha: ['legno'] , dove: 'mondo' },          // una parete, un'asse, una porta
  },
  pre:   { maniLibere: 1 },                                  // slot a 4 byte alla F.E.A.R.
  eff:   { fissato: 'supporto' },
  costo: { base: 2, sostituto: +3, prestito: +1, carattere: { pigro: -1, orgoglioso: { prestito: +3 } } },
  metodi: ['diretto', 'sostituto', 'prestito', 'delega'],    // HTN: il primo valido vince
  prenota: ['percussore', 'supporto'],
  vicino:  { gesto: 'battere', ripetizioni: [3, 6], ritmo: .45, onomatopea: { metallo: 'TOC', ghisa: 'DENG', gomma: 'PLOF' } },
  lontano: { durata: [1, 4], riuscita: 'abilita.manualita', rottura: { sostituto: .25 } },
  consuma: { perno: 1 },
  fatto:   'ha piantato',                                    // strato 1
  pubblicizza: ['riparare', 'appendere', 'chiudere'],        // advertisement: a quali obiettivi serve
  valuta:  { ogni: 'evento', bersagli: 'casa|cantiere' },    // CK3: quanto spesso e su chi
}
```

Tre regole tengono il registro sano:
1. **Niente oggetto senza proprietà.** Ogni voce di `CAT`, ogni `ia_*` degli interni, ogni pezzo del cantiere ha 3-8 proprietà da un vocabolario chiuso di 24-32 parole (rigido, pesante, lungo, piatto, cavo, appuntito, tagliente, impugnabile, contenitore, galleggia, infiammabile, suona, appiccica, si piega, legno, metallo, stoffa, vetro, commestibile…). La gerarchia di categorie dà l'80%, il resto si scrive (Scribblenauts). È la regola dell'Ultrahand: se si vede, si può usare.
2. **Niente verbo senza resa e senza esecutore lontano.** Un test automatico rifiuta la voce.
3. **Niente verbo duplicato.** I sei cataloghi esistenti diventano *fornitori*. Un adattatore per modulo traduce `VERBS` di `azioni.js`, i verbi di `iniziative.js`, `Casa.fai`, le ricette, il catalogo del cantiere e le azioni di mestiere in voci del registro, che rimandano al codice esistente per l'esecuzione vicina. È il pattern "strangolatore": il vecchio codice resta finché ogni sua voce non è coperta.

Il menu QUI, ADESSO del giocatore smette di essere scritto a mano. Si genera filtrando il registro con `può()` sull'adesso, cioè la stessa verifica che usa l'NPC. I sostituti compaiono in fondo, con il loro nome comico ("Pianta il chiodo con la padella").

### 2.2 Il pianificatore e il suo bilancio

La scelta è a due piani, come in Bannerlord + HTN:
- **Utilità per l'obiettivo** (IAUS): 15-25 obiettivi (riparare, appendere, attraversare, chiudere, guadagnare, fare bella figura, vendicarsi…), 4-8 considerazioni a curva tabulata. La distanza è sempre presente. Si rivaluta ogni 2-10 s di gioco o su evento.
- **HTN per il come**: i metodi del verbo, in ordine di costo per carattere. Il pianificatore si ferma al **primo "vai"** (piano parziale, Humphreys). La sostituzione per proprietà è un metodo, non una ricerca globale. L'attenzione (*quale* martello, *quale* vicino) la decidono i sensori prima, come in F.E.A.R.
- **GOAP con A\*** solo fuori linea, nel banco, per cercare catene di sostituzione a due passi. Il suo costo cresce con il numero di azioni (MinePlanner mostra che i pianificatori generici non reggono migliaia di oggetti).

**Bilancio per tick del Worker** (stima, da misurare in fase 0): sensori ~0,3 ms, utilità ~0,5 ms, HTN ≤ 1 ms con un tetto di **8 piani nuovi per tick** (gli altri aspettano in coda con priorità), totale ≤ 2 ms a 4 Hz su 300 NPC attivi. Resta dentro i 5 ms della seconda tornata. I piani falliti finiscono in una cache "non si può" per qualche ora di gioco, come fa già `iniziative.js` (4 ore). I ~700 NPC lontani costano un evento in coda per verbo.

### 2.3 Composizione di affordance: come nascono comportamenti non scritti

Ci sono tre livelli, tutti come dati:
1. **Oggetto → verbi** (advertisement). La panchina pubblicizza sedersi, dormire e salirci in piedi per il comizio.
2. **Verbo → proprietà** (ruoli). *Piantare* chiede un percussore, non un martello. Qui nasce la libertà che chiede la direzione artistica: se il metodo diretto fallisce, l'HTN prova il sostituto. Se manca anche quello, prova il prestito ("Mi presti il martello?", via `scambi.js`), poi la delega ("Me lo pianti tu?"), poi il progetto per procurarselo (la `procura` di `iniziative.js`). Solo alla fine arriva l'**abbandono visibile**: un tentativo comico con il primo oggetto disponibile, a tetto, che fallisce in scena ("prova con la fronte").
3. **Proprietà × proprietà → effetto** (motore chimico ridotto). Una tabella di 40-80 regole: fuoco × legno secco, acqua × vernice fresca, peso × vetro, sale × ghiaccio, colla × tutto. Gli effetti scrivono fatti nel registro. È quello che produce le conseguenze che nessuno ha scritto: la vernice che cola sul cappello del Garante.

Un comportamento è davvero emergente quando un metodo usa un oggetto in un ruolo che il suo autore non aveva previsto, e l'effetto chimico ne cambia il risultato. Il registro rende questo calcolabile e quindi **controllabile**: il setaccio (strato 7) vede ogni sostituzione come un fatto marcato `sostituto`.

### 2.4 Progetti e costruzione

Un progetto è un **grafo di passi con dipendenze**, non una lista: Going Medieval mostra che l'ordine dei passi è il baco ricorrente. Si genera in tre mosse:
1. **Il bisogno** (utilità): "attraversare il canale senza fare il giro", "riparare la tettoia del mercato", "un posto dove suonare".
2. **La famiglia** (metodo HTN scritto): *collegare*, *coprire*, *chiudere*, *alzare*, *far galleggiare*, *decorare*. Ogni famiglia ha 2-4 metodi con tappe.
3. **Il pezzo** (risolutore locale alla Townscaper): l'NPC sceglie solo *dove* e *quale famiglia*. Un WFC piccolo sul catalogo del cantiere sceglie i pezzi compatibili con i vicini, e il sostegno a conteggio alla Valheim (distanza in pezzi dal suolo, massimo per materiale) fa da precondizione. Se i vincoli non si soddisfano, il pezzo resta storto: fallire in silenzio, come Townscaper, qui diventa gag.

Due regole da Avida e da `imprese.js`. **Ogni tappa deve valere da sola** (le assi vendibili, la passerella che usano già i bambini, la prova generale che diventa festa), così un progetto lungo non muore a metà senza storia. **I ruoli li assegna l'inventario**: chi ha la sega taglia, chi ha la barca porta, chi ha le chiavi del campanile apre. Le costruzioni restano fuori città o nei posti dove il cantiere già lo consente; dentro città passano dai permessi e dai Grigi (il divieto è già un meccanismo di `iniziative.js`).

### 2.5 Il passaggio di mano: ogni NPC giocabile in banda

Ogni persona ha `cervello ∈ { auto, banda, giocatore }`. `banda` è `auto` con i pesi spostati verso gli ordini e i progetti della banda, attraverso pacchetti alla Kenshi (segui, guarda le spalle, lavora al progetto, procura). Quando il giocatore prende un membro:
- **passano** corpo, tasche, mano, casa e chiavi del mestiere, relazioni, impressioni e reputazione;
- **i piani aperti dell'NPC diventano voci del taccuino**: la mensola a metà, il debito con lo Squalo, la serenata promessa. Un intento verificato è già una quest;
- **il corpo lasciato** torna `auto` o `banda` e vive con gli stessi verbi. Non prende decisioni irreversibili per il giocatore senza un ordine (vendere la roba della banda, spendere oltre una soglia, la violenza grave): è il limite di Wright;
- **le differenze che si sentono** vengono da ciò che c'è già: il mestiere apre verbi, il carattere sposta i costi, le relazioni aprono porte, l'abilità cambia riuscita e durata;
- **le eccezioni** (i capi dei Grigi, il Garante) sono un tag nel registro, non controlli sparsi.

### 2.6 Il ripiego d'animazione

Ci sono quattro livelli, scelti per verbo e distanza (`animazione_senza_script.md`):
- **A, la posa dedicata.** Una delle ~40 di `anim_vita.js`, che ha già *martella*, *scava*, *forza*, *spazza*.
- **B, il gesto generico.** Una delle ~10 famiglie (battere, strofinare, girare, versare, sollevare, spingere-tirare, porgere, infilare, legare, stendere): due pose chiave, una curva di ritmo, la mano portata da un IK a due ossa al punto di presa e poi al bersaglio, con l'oggetto qualunque già impugnabile grazie a `anim_mano.js`.
- **C, il fumetto d'azione.** Linee di movimento per 1-2 fotogrammi (il limite di Spider-Verse), una nuvoletta con l'onomatopea **specifica del materiale** (la padella fa *DENG*, la scarpa *PLOF*), uno sbuffo, il suono. Sta sopra B da vicino e da solo tra ~25 e ~60 m.
- **D, niente.** Fuori vista si vede solo l'esito.

Nel registro graffiti-fumetto, C non è un ripiego ma il linguaggio del gioco. L'onomatopea è anche un **token** per il pettegolezzo e la gazzetta ("il DENG di ieri in via del Forno").

### 2.7 LOD con tutti gli strumenti

Ogni verbo ha un esecutore `vicino` (passi animati) e uno `lontano`, una funzione chiusa `(seme, chi, args, t0) → durata, esito, consumi, fatto`, con le stesse probabilità del vicino. A metà esecuzione si passa dall'uno all'altro con la frazione di tempo trascorsa. Le chiusure di `azioni.js` (`S.go(label, () => …)`) restano per i ~40 NPC vicini. I lontani usano solo tuple preallocate `(verbo, args, t0, durata, prenotazione)`: circa 24 B per NPC. L'indice delle proprietà è una maschera di bit per tipo d'oggetto (~2 KB), e "cosa ho di rigido e pesante" diventa un AND su una decina di voci. Il **test di parità** è obbligatorio: lo stesso verbo, 1.000 volte vicino e 1.000 lontano, deve dare distribuzioni di esito e consumo entro il 5%. STALKER 2 mostra cosa succede senza.

---

## 3. Direzioni nuove che non ho trovato fatte da nessuno

1. **L'attrezzo sbagliato come motore comico di status.** Ogni sostituzione davanti a testimoni è una transazione alla Johnstone (strato 4). Chi ha status alto e usa la padella per piantare il chiodo *perde* status se fallisce e lo *guadagna* se riesce con nonchalance; chi ha status basso fa ridere in ogni caso. L'incongruenza tra oggetto e verbo si misura sulle proprietà (quanto è lontano il sostituto dal preferito), cioè con lo stesso principio di HAHAcronym/JAPE della seconda tornata. Il sostituto più comico vince a parità di costo quando il carattere è "teatrale".
2. **Brevetti di quartiere.** La prima sostituzione riuscita davanti a testimoni crea un meme *con autore*: "il trucco di Gino". Chi lo copia senza citarlo apre una lite sul merito (`quarrel`), la gazzetta la racconta e il soprannome nasce da lì (`creativita.js`). È la libreria di abilità di Voyager senza LLM, ma con la proprietà intellettuale come gag sociale.
3. **Il ricettario vivo.** Quando il giocatore *guarda* un NPC fare una cosa nuova, la cosa entra nelle sue ricette e nel menu. Il giocatore impara dalla città, e non solo la città dal giocatore. Al contrario, un verbo inventato dal giocatore (una sostituzione che nessun NPC aveva usato) si diffonde fra chi l'ha visto. È l'unico canale culturale bidirezionale tra giocatore e simulazione che ho visto proporre.
4. **Usanze che diventano leggi del porto.** Un meme ripetuto con conflitto genera una norma ADICO scritta con le stesse precondizioni dei verbi: «chi pesca al molo prima delle sette lascia un pesce al vecchio Tore, o lo sfottono». La norma sposta le utilità di chi la conosce, i Grigi possono vietarla, e la sanzione usa verbi esistenti. Ostrom in un gioco comico per telefono non risulta fatto.
5. **Il "non si può" che diventa scena.** Quando tutti i metodi falliscono, il fallimento non è silenzioso: c'è un tentativo comico a tetto (uno al giorno per NPC, mai due nello stesso posto), poi la richiesta a un altro, poi un progetto. Il buco del catalogo, che oggi è un'opzione mancante, diventa contenuto.
6. **Cantieri a ondate.** Vicini che aggiungono pezzi in giorni diversi a una struttura comune, risolti dal WFC locale: il vicolo cresce come in Townscaper, ma l'iniziativa è degli abitanti e ogni pezzo ha un autore nel registro dei fatti. La forma finale non l'ha disegnata nessuno, e si può chiedere "chi ha messo quella tettoia?".
7. **Le quest come intenti ereditati.** Prendere in mano un membro della banda vuol dire ereditarne i piani aperti come cose da fare. Lasciarlo vuol dire restituirglieli. Non servono quest scritte per i personaggi giocabili: ogni NPC porta le sue.
8. **Scoperta fuori linea, spedita come dati.** Il cercatore in Node (A* su sostituzioni a due passi più la tabella chimica) cerca combinazioni nuove sul grafo verbi-ricette-proprietà. Le ordina per incongruenza e "raccontabilità" (il fatto prodotto passa dal setaccio?) e le propone a un autore, che approva. È il posto in cui sta l'"IA": prima di spedire, con zero costi di token a runtime.
9. **L'onomatopea come unità di memoria.** Lo stesso glifo è resa visiva (livello C), voce della diceria e titolo della gazzetta. Un fatto senza onomatopea non si racconta per strada. Questo collega lo strato Strumenti alla superficie italiana senza un realizzatore in più.

---

## 4. Rischi

- **Esplosione combinatoria e assurdità.** Con 30 proprietà e 300 oggetti le sostituzioni possibili sono migliaia, e molte non fanno ridere ma sembrano rotte (piantare il chiodo con un gatto). Antidoti: una lista di oggetti **mai** sostituti (animali, persone, cibo che si mangia), una soglia di incongruenza massima, e il fatto che il sostituto sia scelto per costo, cioè per carattere, non a caso.
- **Il registro come collo di bottiglia della scrittura.** Taggare 300 oggetti e 150-300 verbi è un lavoro vero, alla Prom Week. Antidoti: eredità per categoria (80%), un'analisi di raggiungibilità fuori linea che mostra solo i buchi che contano, e una migrazione per adattatori, un modulo alla volta.
- **Migrazione dei sei cataloghi.** Toccare `azioni.js`, `iniziative.js`, `mestieri.js`, `casa.js`, `oggetti.js` e `cantiere.js` rischia regressioni nei loro test. Il pattern strangolatore e il vincolo "nessun file esistente cambia finché il suo adattatore non passa i test vecchi" sono obbligatori.
- **Picchi del pianificatore.** Le prove a secco di `iniziative.js` hanno già picchi di 10-40 ms. Il tetto di piani per tick e la cache "non si può" sono necessari ma non sufficienti: serve l'istogramma p95/p99 della fase 0 con il registro attivo.
- **La città che si riempie di roba.** Mille NPC con il cantiere producono costruzioni ovunque e svuotano la pineta (UO). Antidoti: un bilancio rubinetti-scarichi nel banco, il degrado delle costruzioni non usate, i permessi e i Grigi in città, un tetto di progetti vivi per quartiere.
- **Il pilota automatico migliore del giocatore** (Wright). Se `auto` gestisce troppo bene il corpo lasciato, il giocatore non ha motivo di giocare. Antidoti: niente decisioni irreversibili senza ordine, e `auto` che segue la routine invece di ottimizzare.
- **Parità rotta tra vicino e lontano.** Il giocatore se ne accorge (STALKER 2). Il test di parità va eseguito in CI, non una volta sola.
- **Exploit emergenti** (immersive sim). Una sostituzione può aprire scorciatoie economiche (vendere i sostituti, duplicare consumi). L'analisi di raggiungibilità sulla rete di Petri fuori linea deve cercare i cicli di guadagno.
- **Leggibilità.** Una costruzione o un fallimento senza autore visibile sembra un baco. Ogni pezzo deve rispondere al "perché?" della seconda tornata ("l'ha messa Tore, martedì, con le assi della barca").
- **Animazione che sembra rotta.** Il gesto generico con un oggetto strano può compenetrare. Antidoti: punti di presa dichiarati per famiglia di forma, l'IK limitato al braccio, e il fumetto C sopra a coprire.

---

## 5. Piano: le fasi 0-6 estese, più due fasi nuove

Ogni aggiunta sta dietro un flag (`?strumenti`), come `?commedia`. Le soglie sono **obiettivi scelti da noi**, non valori dalla letteratura.

| Fase | Aggiunta di questa tornata | Criteri di successo |
|---|---|---|
| **0. Banco di prova** | Registro sintetico di 200 verbi e 500 oggetti con proprietà nel Worker; utilità + HTN con piano parziale; tetto di piani per tick; test di parità vicino/lontano su 20 verbi; analisi di raggiungibilità in Node sul grafo verbi-ricette-cantiere | p95 del tick con il registro ≤ 5 ms e p99 ≤ 10 ms su Android medio e Iris Xe; parità entro il 5% su tutti i 20 verbi; l'analisi elenca i verbi irraggiungibili del catalogo reale |
| **1. Registro e perché** | Il registro vero con adattatori per `azioni.js` e `oggetti.js` (ricette); proprietà su tutto `CAT`; menu QUI, ADESSO generato dal registro; ogni esecuzione scrive un fatto tipizzato; "perché?" che mostra il metodo scelto (diretto, sostituto, prestito) | 100% delle azioni oggi in `playerActions` riprodotte dal registro senza regressioni nei test esistenti; per 50 verbi scelti a caso, NPC e giocatore producono lo stesso piano e lo stesso fatto |
| **2. Dicerie** | Le sostituzioni e le invenzioni come credenze con autore; l'onomatopea come token della diceria | In simulazione ≥ 1 "trucco di qualcuno" al giorno per quartiere arriva a ≥ 5 persone; ≥ 1 sessione su 3 il giocatore sente raccontare un trucco visto da lui |
| **3. Affetto e status** | Costi dei metodi spostati da umore e carattere; sostituzione davanti a testimoni come transazione di status; lista dei "mai sostituti" | In 1.000 sostituzioni generate, 0 su oggetti vietati; in test alla cieca le scene di sostituzione sono "divertenti" ≥ 2 volte più spesso delle stesse azioni con l'attrezzo giusto |
| **4. Setaccio, regista, gazzetta** | I progetti come fili con tappe; il regista può far comparire un attrezzo in prestito; la gazzetta racconta i cantieri | ≥ 1 progetto completato a settimana per quartiere attivo; ≥ 70% dei progetti abbandonati ha almeno una tappa raccontata |
| **5. Lingua e comicità** | Lessico delle onomatopee per materiale (100-200 voci); nomi comici dei sostituti; ripiego d'animazione B + C | Ogni verbo del registro ha una resa (test automatico); 0 compenetrazioni gravi in 500 gesti generici registrati nello studio delle pose; il gesto B costa ≤ 0,05 ms per NPC vicino |
| **6. Cultura e taratura** | Brevetti di quartiere; norme ADICO dalle usanze con conflitto; ricettario vivo (il giocatore impara guardando); scoperta fuori linea di combinazioni | In 30 giorni simulati nascono 2-6 norme stabili per città, diverse tra semi; il cercatore propone ≥ 50 combinazioni nuove, di cui ≥ 20% approvate da un autore |
| **7. Progetti e costruzione** (nuova) | Famiglie di progetto (collegare, coprire, chiudere, alzare, far galleggiare, decorare); WFC locale sul catalogo del cantiere; sostegno a conteggio; cantieri a ondate; bilancio rubinetti-scarichi | Le costruzioni degli NPC passano il controllo di sostegno nel 100% dei casi completati; nessuna risorsa naturale a zero in 60 giorni simulati; ≥ 1 struttura con ≥ 3 autori diversi per quartiere al mese |
| **8. Passaggio di mano** (nuova) | `cervello ∈ {auto, banda, giocatore}`; piani aperti come voci del taccuino; corpo lasciato in `auto` con i limiti; eccezioni come tag | Per ogni verbo il test auto/banda/giocatore dà lo stesso piano; su 100 NPC a caso il menu dopo il passaggio contiene tutti i verbi usati da soli nell'ultima settimana simulata; in un test con 5-8 giocatori, ≥ 70% dice che il personaggio preso "si gioca diverso" dal protagonista |

L'ordine conta. La fase 1 viene prima di tutto perché senza la porta unica ogni altra aggiunta riproduce la divisione attuale. La fase 7 dipende dalla 3 (i costi per carattere) e dalla 4 (il regista che salva i progetti a metà). La fase 8 può partire subito dopo la 1, in parallelo alle altre.

---

## 6. Conclusione

La richiesta "tutti gli strumenti a tutti" si soddisfa senza menti più grandi e senza modelli a runtime. Servono quattro cose:
1. **un solo registro di verbi** dichiarati come dati, letto sia dal menu del giocatore sia dal pianificatore;
2. **verbi che chiedono proprietà e non oggetti**, così che manchi l'attrezzo ma non l'opzione;
3. **due esecutori per verbo**, vicino e lontano, tenuti uguali da un test;
4. **un ripiego d'animazione** che nel look fumetto è un linguaggio e non una toppa.

Le invenzioni nascono dalle sostituzioni e dalle composizioni di progetti a runtime, e dalla ricerca fuori linea prima di spedire. Diventano cultura con i meccanismi della seconda tornata. Il rischio vero, come nelle tornate precedenti, non è la CPU: è il lavoro di etichettatura e il gusto nello scegliere quali assurdità fanno ridere.

---

## Fonti principali

- Bellwright: [80.lv](https://80.lv/articles/how-bellwright-simulates-a-living-medieval-world-with-thousands-of-npcs)
- Bannerlord: [Campaign AI](http://www.gamebanshee.com/3wfc8); [Blog 12](https://www.taleworlds.com/en/Games/Bannerlord/Blog/14)
- RimWorld: [Mending Job](https://rimworldwiki.com/wiki/Modding_Tutorials/Code_MendingJob)
- The Sims: [Forbus & Wright](https://qrg.northwestern.edu/papers/Files/Programming_Objects_in_The_Sims.pdf); [PC Gamer su Wright](https://www.pcgamer.com/games/the-sims/will-wright-says-the-original-sims-ai-was-actually-too-good-almost-anything-the-player-did-was-worse-than-the-sims-running-on-autopilot); [Simdex Sims 4](https://lot51.cc/simdex/game-concepts)
- F.E.A.R.: [Orkin, GDC 2006](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf)
- HTN: [Humphreys, Game AI Pro cap. 12](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter12_Exploring_HTN_Planners_through_Example.pdf); [Guerrilla, HTN in Decima](https://guerrilla-games.com/read/htn-planning-in-decima); [Horizon AI](https://gamedeveloper.com/design/behind-the-ai-of-horizon-zero-dawn-part-1-)
- Utilità: [Dave Mark, IAUS](https://gameai.com/iaus.php); [GDC Vault 1018040](https://gdcvault.com/play/1018040/Architecture-Tricks-Managing-Behaviors)
- Caves of Qud: [Domination](https://wiki.cavesofqud.com/wiki/Domination); [Unity, Systems-driven design](https://unity.com/resources/systems-driven-design-in-caves-of-qud)
- Dwarf Fortress: [PC Gamer, gruppo in Avventura](https://pcgamer.com/dwarf-fortresss-next-big-update-will-let-you-play-its-adventure-mode-with-a-proper-rpg-party); [Interaction token](https://dwarffortresswiki.org/index.php/v0.34:Interaction_token)
- Kenshi: [Playable Characters](https://kenshi.wiki/w/Playable_Characters)
- Watch Dogs: Legion: [GamesRadar](https://www.gamesradar.com/watch-dogs-legions-ability-to-play-as-anyone-puts-you-in-control-more-than-eve)
- S.T.A.L.K.E.R.: [Iassenev](https://www.gamedeveloper.com/game-platforms/interview-inside-the-ai-of-i-s-t-a-l-k-e-r-i-); [PC Gamer, STALKER 2](https://pcgamer.com/games/fps/stalker-2-devs-reassure-players-yes-a-life-2-0-is-in-the-game-no-its-not-working-right-and-yes-fixes-are-on-the-way)
- Rain World: [Game Developer](https://gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)
- Zelda: [Thumbsticks, GDC 17](https://www.thumbsticks.com/gdc-17-breath-of-the-wild-science-lies); [GDC Vault, Tunes of the Kingdom](https://www.gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving); [Shacknews](https://shacknews.com/article/139210/zelda-totk-gdc-2024-panel-recap)
- Noita: [GDC Vault](https://gdcvault.com/play/1025695/Exploring-the-Tech-and-Design)
- Scribblenauts: [Kotaku](https://kotaku.com/the-secret-behind-scribblenauts-making-objects-by-hand-1796262472)
- Harvey Smith: [Orthogonal Unit Differentiation](https://slidetodoc.com/orthogonal-unit-differentiation-harvey-smith-witchboyionstorm-com-intro/)
- UE5: [Mass Gameplay](https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-gameplay-in-unreal-engine?lang=de)
- Minecraft: [villager activities](https://fabricmc.net/wiki/tutorial:villager_activities); [MinePlanner](https://arxiv.org/pdf/2312.12891); [Voyager](https://the-decoder.com/minecraft-bot-voyager-programs-itself-using-gpt-4/)
- Reti di Petri e Factorio: [Electronics 2024](https://www.mdpi.com/2079-9292/13/7/1377/xml)
- Costruzione: [Townscaper](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making); [WFC](https://github.com/mxgmn/WaveFunctionCollapse); [Valheim](https://www.sportskeeda.com/esports/understanding-structural-integrity-valheim); [Going Medieval](https://foxyvoxel.io/?p=437)
- Ostrom: [Dynamic Deontics](https://www.academia.edu/22055003/Modelling_Institutions_Using_Dynamic_Deontics); [UAB 2014](https://ddd.uab.cat/pub/poncom/2014/128239/ssc14_a2014a71iENG.pdf)
- Avida: [Lenski et al. 2003](https://www.nature.com/nature/journal/v423/n6936/pdf/nature01568.pdf)
- Nascondino di OpenAI: [OpenAI](https://openai.com/index/emergent-tool-use)
- Ultima Online: [Koster](https://raphkoster.com/?p=517)
- Animazione: [Hecker et al. 2008](https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies); [Rosen, GDC 2014](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach); [three.js CCDIKSolver](https://threejs.org/docs/pages/CCDIKSolver.html); [Creative Bloq, Spider-Verse](https://creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look); [CGMagazine](https://www.cgmagonline.com/articles/comic-book-aesthetics-gaming/)

Le singole affermazioni, con il grado di verifica di ognuna, stanno nelle note della cartella `research_notes/NPC vivi senza IA strumenti/`.
