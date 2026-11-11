# Scegliere e concatenare le azioni: utilità, GOAP, HTN, lavori a passi, e quanto costano

> Etichette: **[letto]**, **[estratto]**, **[non verificato]**.
> La seconda tornata ha già fissato i bilanci del Worker (≤ 5 ms a 4 Hz, scelte d'azione ≈ 30.000 moltiplicazioni/s) e la regola di Zubek (code d'azione ad anello aperto per 1.000 NPC). Qui la domanda è più stretta: **con un catalogo unico di verbi dichiarati come dati, chi sceglie e chi concatena, e a che prezzo, su un telefono?**

---

## 1. RimWorld: WorkGiver → Job → Toil, e l'ordine del giocatore che entra dalla stessa porta

- Il comportamento delle pedine passa tutto dai *Job*; un *JobDriver* scompone il Job in *Toil* che la pedina completa in ordine — [RimWorld wiki, Example Mending Job](https://rimworldwiki.com/wiki/Modding_Tutorials/Code_MendingJob) **[letto]**
- Nello stesso tutorial il Job nasce da un'opzione del menu contestuale del giocatore (`FloatMenuOptionProvider` → `JobMaker.MakeJob` → `TryTakeOrderedJob`): **l'ordine del giocatore e il lavoro autonomo producono lo stesso oggetto Job**, eseguito dallo stesso driver. `TryMakePreToilReservations` prenota il bersaglio (se fallisce, il Job non parte); `FailOnCannotTouch` lo annulla se il bersaglio diventa irraggiungibile; i Toil sono costruiti all'assegnazione e devono essere indipendenti fra loro — stessa fonte **[letto]**
- Il *WorkGiver* è il lavoro astratto che il giocatore abilita o disabilita e che decide quale serie di Job fare — [guida della comunità, Survival Tools Reborn](https://steamcommunity.com/workshop/filedetails/discussion/2017675890/2265815747948515129) **[estratto]**
- **Cosa rubiamo**: la struttura a tre piani è quasi identica ai piani a passi di `azioni.js` (`S.go`, `S.do`, verificati al loro turno). Mancano due cose: **la prenotazione** prima di partire e **la porta unica** (il menu QUI, ADESSO del giocatore deve creare lo stesso piano che crea `intend` per un NPC).

## 2. GOAP (F.E.A.R.): A* sulle azioni, con stato a slot fissi

- Il pianificatore somiglia a STRIPS con quattro differenze: un **costo per azione** (A* cerca la sequenza meno costosa), **niente liste add/delete** (precondizioni ed effetti in un array a dimensione fissa di valori da quattro byte: `TargetDead`, `WeaponLoaded`, `OnVehicleType`, `AtNode`), **precondizioni procedurali** (una funzione che fa controlli costosi solo quando serve, per esempio cercare una via di fuga sul navmesh) ed **effetti procedurali** (l'azione mette il personaggio in uno stato e ci vuole tempo). L'array ha uno slot per arma e uno per bersaglio: chi scegliere lo decidono sottosistemi di attenzione *fuori* dal pianificatore — [Orkin, GDC 2006](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf) **[letto]**
- Esempio di Orkin: OrderPizza costo 2, BakePie costo 8: se la pizza non si può ordinare, si ripiega sulla torta — stessa fonte **[letto]**
- Un problema pratico riferito da chi lo usa: GOAP rallenta quando le azioni crescono — [r/gameai](https://reddit.fsky.io/r/gameai/comments/1j8zap6/whats_the_best_way_to_handle_decisionmaking_in) **[estratto, aneddotico]**
- **Cosa rubiamo**: il **costo per azione** come manopola di carattere (per il pigro "farsi prestare" costa meno di "comprare"; per l'orgoglioso costa di più) e il **taglio dell'attenzione**: il pianificatore non sceglie *quale* martello o *quale* vicino, lo riceve.

## 3. HTN (Transformers: Fall of Cybertron, Horizon)

- Compiti *primitivi* (operatore + condizioni + effetti) e *composti* (contenitori di *metodi*, ognuno con condizioni e una lista di sotto-compiti). Il pianificatore scompone dalla radice in avanti, sceglie il primo metodo valido e torna indietro se fallisce. Niente euristica e niente ordinamento: la gerarchia taglia grandi pezzi di rete. Risultato dichiarato: in Fall of Cybertron l'HTN era «considerevolmente più veloce» del GOAP di War for Cybertron — [Humphreys, *Exploring HTN Planners through Example*, Game AI Pro cap. 12](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter12_Exploring_HTN_Planners_through_Example.pdf) **[letto]**
- I **piani parziali** sono «una delle caratteristiche più potenti»: si pianifica fino a un punto (tipicamente prima di una navigazione lunga) e si riprende dopo; in Fall of Cybertron le divisioni erano scritte a mano nei domini perché quelle automatiche (con il "tempo" sui compiti) rischiavano bachi sottili. Ripianificare su ogni cambio dello stato, compresi gli effetti dei propri compiti, crea cicli: va escluso — stessa fonte **[letto]**
- Guerrilla usa HTN da Killzone 2; Horizon Zero Dawn lo usa per le macchine; Tim Verweij ne ha parlato nel 2024 per Decima — [Game Developer, Behind the AI of Horizon Zero Dawn](https://gamedeveloper.com/design/behind-the-ai-of-horizon-zero-dawn-part-1-) **[estratto]**; [Guerrilla, HTN Planning in Decima](https://guerrilla-games.com/read/htn-planning-in-decima) **[estratto]**. Esiste un'implementazione indipendente ispirata a quella di Guerrilla — [Sandruski/htn-planner](https://github.com/Sandruski/htn-planner) **[estratto]**
- **Cosa rubiamo**: i **metodi** sono il posto naturale per le *alternative* di un verbo (piantare: con il martello / con un sostituto / chiedendo a chi ce l'ha / chiedendo a qualcuno di farlo). I **piani parziali** risolvono il costo: si pianifica fino al primo "vai", il resto quando si arriva.

## 4. Utilità (Dave Mark, Infinite Axis Utility System)

- L'IAUS è descritto come il "cervello" per agenti, squadre, eserciti e perfino oggetti inanimati, interamente basato su meccanismi di utilità; presentato in breve al GDC AI Summit 2013 ("Architecture Tricks: Managing Behaviors in Time, Space, and Depth") e in "Building a Better Centaur: AI at Massive Scale" (2014 o 2015, le date divergono) — [gameai.com, IAUS](https://gameai.com/iaus.php) **[estratto]**; [GDC Vault 1018040](https://gdcvault.com/play/1018040/Architecture-Tricks-Managing-Behaviors) **[estratto]**
- **[non verificato]** Struttura nota dell'IAUS: ogni azione ha più *considerazioni*, ognuna una curva (lineare, quadratica, logistica) su un input normalizzato 0–1; i punteggi si moltiplicano con un fattore di compensazione per il numero di considerazioni; si sceglie a caso pesato tra i primi. La seconda tornata usava già questo schema per stimare il costo (≈ 20 opzioni × 10 termini).
- **Cosa rubiamo**: l'utilità **sceglie l'obiettivo** (cosa voglio adesso); il pianificatore gerarchico **trova il come**. Bannerlord fa lo stesso: la distanza sempre, più i fattori propri (vedi `giochi_stesse_regole.md`).

## 5. Alberi di comportamento: il costo basso non è gratis

- Un albero è una serie di controlli condizionali, quindi economico — ma questa è un'affermazione di marketing senza misure — [metavert](https://metavert.io/game-ai-vs-agent-npcs) **[estratto, debole]**. Gli approcci di pianificazione come GOAP e HTN coprono domini più ampi «con costi corrispondenti, di calcolo e di produzione» — [Implementing Behavior Trees using Three-Valued Logic, arXiv 2011.03835](https://arxiv.org/pdf/2011.03835) **[estratto]**. Uno studio di Charles University (2013) confronta HTN e pianificatori STRIPS su domini da gioco in termini di prestazioni contro risorse — [pddl vs htn, 2013](https://artemis.ms.mff.cuni.cz/main/papers/2013-pddl_vs_htn.pdf) **[estratto]**
- **Lacuna**: non ho trovato misure pubblicate in millisecondi per BT, GOAP e HTN sullo stesso dominio, né su telefono. Le stime sotto sono di progetto.

## 6. Pianificazione classica su domini di crafting (Minecraft senza LLM)

- PDDLGym ha un dominio Minecraft-Crafting (raccogliere materie prime, sequenze per sintetizzare oggetti); **MinePlanner** (45 compiti, istanze proposizionali e numeriche, come raccogliere i blocchi e costruire una capanna di tronchi) mostra che i pianificatori allo stato dell'arte **non reggono** istanze con migliaia di oggetti — [MinePlanner, arXiv 2312.12891](https://arxiv.org/pdf/2312.12891) **[estratto]**; [mine-pddl](https://github.com/iretonliu/mine-pddl) **[estratto]**; HierarchyCraft nota che PDDLGym non supporta i fluenti numerici — [JOSS](https://www.theoj.org/joss-papers/joss.06468/10.21105.joss.06468.pdf) **[estratto]**
- Voyager (2023) costruisce una **libreria di abilità**: programmi riusciti salvati e richiamati, abilità complesse composte da semplici — ma con GPT-4 a runtime, quindi fuori dai vincoli — [The Decoder](https://the-decoder.com/minecraft-bot-voyager-programs-itself-using-gpt-4/) **[estratto]**
- **Cosa rubiamo**: (a) la conferma che un pianificatore generico su tutto il mondo **non** è la strada: il mondo va filtrato prima (attenzione alla F.E.A.R.) e il dominio va gerarchizzato (HTN). (b) L'idea di **libreria di abilità senza LLM**: quando un NPC trova un piano riuscito nuovo (una sostituzione, una catena di ricette), il piano diventa una *macro* con nome, salvata nel meme (`st.ini.memi`) e copiabile da altri. È Voyager con la ricerca al posto del modello.

## 7. Reti di Petri e grafi delle ricette

- Chandler e Davidrajuh (2024) modellano le catene di produzione di Factorio con reti di Petri modulari (GPenSIM) per trovare i colli di bottiglia — [Electronics 13(7):1377](https://www.mdpi.com/2079-9292/13/7/1377/xml) **[estratto]**; le reti di Petri sono usate per verificare giochi, generare storie e supportare agenti — [Reuter, Göbel, Steinmetz 2015](https://www.kom.tu-darmstadt.de/papers/RGS15-1.pdf) **[estratto]**; un pianificatore per Scrap Mechanic tratta le ricette come grafo di dipendenze espanso fino alle materie prime — [DEV](https://dev.to/questdataforge/modeling-crafting-dependencies-for-a-scrap-mechanic-planner-178i) **[estratto]**
- **Cosa rubiamo**: **fuori linea**, le 142 ricette + il catalogo del cantiere + i verbi diventano una rete di Petri (posti = proprietà/oggetti, transizioni = verbi/ricette). Con un'analisi di raggiungibilità in Node si trova: cosa nessun NPC potrà mai fare (un buco nel catalogo, la "mancanza del chiodo" prima che la veda il giocatore), quali risorse non hanno scarico (il problema di UO), quali catene sono troppo lunghe per il bilancio. Non serve a runtime.

## 8. Proposta di costo (stime di progetto, da misurare in fase 0)

| pezzo | cosa fa | frequenza | stima per decisione | stima per tick del Worker (300 NPC attivi) |
|---|---|---|---|---|
| sensori → memorie brevi | leggono vicinato, mano, tasche, ora | ogni ~2 s per NPC (alla Minecraft) | — | ~0,3 ms |
| utilità degli obiettivi | 15-25 obiettivi × 4-8 considerazioni, curve a tabella | ogni 2-10 s o su evento | ~5 µs | ~0,5 ms |
| HTN per l'obiettivo scelto | 3-6 metodi per livello, profondità ≤ 4, primo metodo valido, piano parziale fino al primo "vai" | quando la coda si svuota | 20-200 µs | ≤ 1 ms con tetto di 8 piani per tick |
| sostituzione per proprietà | trova un oggetto con le proprietà richieste in tasca/casa/vicino (indice per proprietà) | dentro l'HTN, solo se il metodo diretto fallisce | 5-50 µs | incluso sopra |
| esecuzione dei passi | `S.go`/`S.do`, verifica al turno | ogni frame vicino, a evento lontano | — | già misurato in `azioni.js` |

Regola di bilancio: **massimo N piani per tick** (coda con priorità, il resto aspetta il tick dopo), come il time-slicing di Graham citato nella seconda tornata; i piani falliti restano in cache "non si può" per qualche ora (già così in `iniziative.js`: 4 ore). GOAP con A* resta per un caso solo, la **ricerca di sostituti a due passi** fuori dal tick (nel banco fuori linea), perché il suo costo cresce con il numero di azioni.
