# Le stesse regole per tutti: giochi in cui giocatore e NPC condividono lo spazio d'azione

> Nota di metodo (11 novembre 2026, terza tornata). Etichette:
> - **[letto]**: pagina o PDF letto per intero in questa sessione.
> - **[estratto]**: solo il riassunto dei risultati di ricerca o un estratto. Da ricontrollare prima di citare numeri.
> - **[non verificato]**: conoscenza di fondo senza fonte trovata in sessione. Compare solo come inferenza.
>
> Le tornate precedenti hanno già coperto Watch Dogs Legion (Census, LOD a tre livelli), Shadows of Doubt (generazione dei cittadini), Dwarf Fortress e RimWorld (storie), CK3 (segreti e ganci), Ultima VII (SCHEDULE.DAT), KCD2 (interruzioni). Qui si guarda **solo** una domanda: *l'NPC può fare le stesse cose del giocatore, con gli stessi strumenti, e il giocatore può diventare quell'NPC?*

---

## 1. La tesi in una riga

I giochi che sembrano "liberi" non danno agli NPC una mente più grande: **danno a tutti lo stesso catalogo di azioni e lo stesso inventario**, e fanno sì che il giocatore sia un caso particolare di agente (un agente il cui selettore d'azione è il controller). Dove le azioni del giocatore e quelle degli NPC sono scritte in due posti diversi, prima o poi divergono, e l'NPC "non può piantare il chiodo" perché il chiodo esiste solo nel menu del giocatore.

## 2. Reperti

### Bellwright (Donkey Crew): «gli NPC ora fanno esattamente le stesse cose del giocatore»
- Tutti gli NPC (paesani, banditi, mercanti, reclute) condividono la stessa logica di base, e differiscono per ruolo o aggiunte. Per avere legna l'NPC fabbrica un'ascia, trova un albero, lo abbatte, lavora il legno e lo porta indietro. Un prototipo precedente generava le risorse in automatico: scartato perché «non ispirava». Più di mille NPC simulati indipendentemente dalla posizione del giocatore; la memoria su console è stata l'ostacolo principale, ridotta di quasi metà riscrivendo sistemi — [80.lv, "How Bellwright Simulates a Living Medieval World with Thousands of NPCs"](https://80.lv/articles/how-bellwright-simulates-a-living-medieval-world-with-thousands-of-npcs) **[letto]**
- **Cosa rubiamo**: il criterio di rifiuto. Se una risorsa "compare" senza che qualcuno l'abbia fatta con un verbo, è un baco di design. `iniziative.js` lo applica già (la `procura` usa le stesse ricette del giocatore); va esteso a tutto.

### Mount & Blade II: Bannerlord: i lord legati alle stesse restrizioni del giocatore
- Dal blog "Campaign AI": a differenza di Warband, in Bannerlord i lord NPC «sono vincolati da molte delle stesse restrizioni e regole del giocatore», e devono compiere le azioni che servono al giocatore per mantenere la propria compagnia: andare in un insediamento (rifornirsi, reclutare, riscattare prigionieri, riposare), pattugliare, difendere, razziare, assediare, inseguire. L'unico fattore comune a tutte le azioni è la distanza; ogni azione aggiunge i suoi fattori. In Warband i lord non restavano mai senza soldi — [GameBanshee, Bannerlord Developer Blog – Campaign AI](http://www.gamebanshee.com/3wfc8) **[letto]**; [TaleWorlds Blog 12, The Passage of Time](https://www.taleworlds.com/en/Games/Bannerlord/Blog/14) (carovane che massimizzano il profitto, villaggi che producono) **[estratto]**
- **Cosa rubiamo**: lo schema "un'azione = un punteggio con la distanza sempre presente + i fattori propri". È il cuore dell'utilità di Dave Mark (vedi `pianificatori_e_costi.md`) e si scrive come dato.

### Caves of Qud: comporre proprietà, dominare chiunque
- La Dominazione è una mutazione mentale: sul bersaglio a una casella si assume il controllo completo della creatura; il corpo originale resta immobile finché il dominio non si rompe. Se si uccide il proprio corpo in un colpo solo, si resta intrappolati nel nuovo. Un tentativo fallito rende ostile il bersaglio e chi ha visto — [Caves of Qud wiki, Domination](https://wiki.cavesofqud.com/wiki/Domination) **[estratto]**
- Architettura: Brian Bucklew descrive gli oggetti come insiemi di proprietà composte, non alberi di componenti («an object isn't a tree of components, it's a set of properties that are composed together»); i villaggi nascono da migliaia di anni di storia simulata; l'IA degli NPC usa azioni pesate controllate dai designer — [Unity, Systems-driven design in Caves of Qud](https://unity.com/resources/systems-driven-design-in-caves-of-qud) **[letto]**. Il talk IRDC 2015 "Data-Driven Engines of Qud and Sproggiwood" è indicato dal wiki come l'introduzione al sistema di "parts" — [Caves of Qud wiki, Videos](https://wiki.cavesofqud.com/wiki/Caves_of_Qud/Videos) **[estratto]**
- **[non verificato]** Nel codice di Qud il giocatore è un normale oggetto con una parte che riceve l'input al posto del cervello; è questo che rende la Dominazione quasi gratuita da implementare. Non trovato in una fonte primaria in sessione.
- **Cosa rubiamo**: la Dominazione come *passaggio di mano*: il "cervello" è un componente sostituibile (controller ↔ pianificatore). Il prezzo narrativo (il corpo lasciato, chi ha visto) è già una gag.

### Dwarf Fortress, modo Avventura: un mondo, molti corpi
- L'Avventura è uscita dalla beta su Steam il 23 gennaio 2025; la versione "villains" porta il gruppo: si parte con più avventurieri (forse sei), se ne controlla uno e gli altri seguono, e si può passare a un altro membro al volo se fa parte del gruppo iniziale. Gli ordini ai compagni sono semplici «vai qui, fai questo», come quelli già esistenti di «costruisci una capanna di tronchi» — [PC Gamer](https://pcgamer.com/dwarf-fortresss-next-big-update-will-let-you-play-its-adventure-mode-with-a-proper-rpg-party) **[estratto]**; [Bay 12 dev page](https://bay12games.com/dwarves/dev.html) (ordini tattici ancora in sviluppo a febbraio 2025) **[estratto]**
- Le abilità delle creature sono **dati**: `[CAN_DO_INTERACTION:NOME]` più token `[CDI:...]` nei raw della creatura, oppure concesse da sindromi; esistono bug storici sulle interazioni in Avventura (2012, 2016) — [DF wiki, Interaction token](https://dwarffortresswiki.org/index.php/v0.34:Interaction_token) **[estratto]**; [bug tracker 5184](https://dwarffortressbugtracker.com/view.php?id=5184) **[estratto]**
- **Cosa rubiamo**: le abilità come token nei dati della creatura (ognuno ha i suoi `CAN_DO`), e la lezione dei bug: se l'abilità è dichiarata in un posto ma eseguita da due motori (Fortezza e Avventura), uno dei due si rompe.

### Kenshi: reclutare (quasi) chiunque
- Il wiki ufficioso: non si reclutano diplomatici, guardie, militari, mercanti (salvo scappatoie di dialogo); le mod che "reclutano chiunque" tolgono solo il controllo. Gli schiavi hanno un pacchetto IA "slave" e diventano utili solo se reclutati. Massimo 30 personaggi nella fazione del giocatore — [Kenshi wiki, Playable Characters](https://kenshi.wiki/w/Playable_Characters) **[estratto]**; [TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/Kenshi) **[estratto]**
- Chris Hunt (GDC 2022): Kenshi è «un gioco di fazioni» e i singoli pesano pochissimo sullo stato del mondo — [GDC 2022 poster, Knezek](https://media.gdcvault.com/GDC+2022/Game+Narrative+Poster+Review/Knezek+Paper.pdf) **[estratto]**. L'affermazione «ogni personaggio opera sotto le stesse regole del giocatore» viene solo da una pagina di fan — **[non verificato]**.
- **Cosa rubiamo**: il "pacchetto IA" come etichetta intercambiabile (`slave`, `protect squad`, `follow`, `medic`): cambiare banda = cambiare pacchetto, non personaggio.

### S.T.A.L.K.E.R.: A-Life online e offline
- L'A-Life divide i personaggi in *online* (simulazione completa entro un raggio, circa 150 m nel gioco liscio, regolabile) e *offline* (livello di dettaglio grezzo); il sistema segue giocatore e personaggi offline e li scambia quando serve. Offline uno scontro può essere risolto a sorte e mostrato solo come risultato — [Game Developer, intervista a Dmitriy Iassenev](https://www.gamedeveloper.com/game-platforms/interview-inside-the-ai-of-i-s-t-a-l-k-e-r-i-) **[estratto]**; [Destructoid, What is A-Life](https://www.destructoid.com/what-is-a-life-in-stalker-and-why-is-it-important/) **[estratto]**. In STALKER 2 GSC ha ammesso che A-Life 2.0 «non funziona bene» al lancio — [PC Gamer](https://pcgamer.com/games/fps/stalker-2-devs-reassure-players-yes-a-life-2-0-is-in-the-game-no-its-not-working-right-and-yes-fixes-are-on-the-way) **[estratto]**
- **Cosa rubiamo**: ogni verbo deve avere due esecutori, uno *vicino* (passi, animazione) e uno *lontano* (durata + esito a sorte con seme). STALKER 2 è l'avvertimento: se l'offline è un ripiego aggiunto dopo, la gente se ne accorge.

### Rain World: le creature vivono per sé
- Le creature sono mosse dai propri bisogni di sopravvivenza, non servono da ostacolo; niente percorsi di pattuglia fissi; fuori schermo cacciano e litigano per il territorio. Sono fatte di punti legati a distanze fisse, e si muovono proceduralmente. Jakobsson: «they exist in their own right, they exist there for themselves»; e «un'entità abbastanza stupida può essere difficile da superare in astuzia» — [Game Developer, Crafting the complex chaotic ecosystem of Rain World](https://gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-) **[letto]**
- Una lezione del 2024 sull'animazione separa fisica e "cosmetica", anche per le prestazioni fuori schermo — [appunti di terzi sul talk](https://coconote.app/notes/75365925-df44-49db-b8ac-ca71168efdef) **[estratto, fonte debole]**
- **Cosa rubiamo**: il corpo come insieme minimo di punti fisici condiviso da giocatore e NPC; il dettaglio visivo sopra è decorazione che si può spegnere.

### Minecraft: il cervello dei paesani
- Dal 1.14 i paesani usano un "Brain": memorie (il posto di lavoro, i tempi di attesa), sensori che aggiornano memorie brevi ogni ~10 tick, attività che raggruppano compiti, e un programma su un giorno di 24.000 tick (idle, work, meet, idle, rest) — [Fabric wiki, villager activities](https://fabricmc.net/wiki/tutorial:villager_activities) **[estratto]**; [Forge community wiki, Brains](https://forge.gemwire.uk/wiki/Brains) **[estratto]**
- **Cosa rubiamo**: poco sul fronte "stesse regole" (i paesani non usano gli attrezzi del giocatore), molto sul fronte costi: sensori a frequenza fissa che scrivono memorie, compiti che leggono solo memorie.

### Crusader Kings III: interazioni come dati condivisi
- Il diario sul modding: l'IA può essere programmata per usare qualsiasi interazione personalizzata, con chi è un buon bersaglio e ogni quanto valutarla (questione di prestazioni); alcune interazioni sono codificate a mano proprio quando l'IA deve usarle in modo non banale — [Paradox forum, CK3 Dev Diary 37](https://forum.paradoxplaza.com/forum/threads/ck3-dev-diary-37-making-mods.1410656/page-9) **[estratto]**. L'IA che seduceva troppo spesso i personaggi giocanti è stata ridimensionata — [PC Gamer](https://pcgamer.com/the-crusader-kings-3-ai-kept-trying-to-seduce-female-player-characters-and-had-to-be-nerfed) **[estratto]**
- **Cosa rubiamo**: ogni verbo dichiara **la frequenza di valutazione** e il **filtro dei bersagli** accanto alle precondizioni. È così che un catalogo condiviso resta economico.

### Ultima Online: l'ecologia che non è sopravvissuta
- Raph e Kristen Koster progettarono un'ecologia delle risorse; c'era nell'alfa, fu tolta in beta dopo una riscrittura; parte del team la considerava uno spreco. Da lì l'analisi a ciclo chiuso di Zach Simpson e il termine "faucet-drain" — [Raph Koster, UO's resource system](https://raphkoster.com/?p=517) **[estratto]**; [Did players destroy the UO ecology?](https://www.raphkoster.com/?p=46439) **[estratto]**
- **Cosa rubiamo**: se gli NPC producono e consumano con gli stessi verbi del giocatore, serve un bilancio "rubinetti e scarichi" misurato nel banco di prova; senza, i giocatori svuotano o allagano il porto.

### Watch Dogs: Legion, i limiti di "gioca come chiunque"
- Ogni recluta porta abilità, gadget e vantaggi diversi; nel gioco finale vantaggi e svantaggi più chiari, poche abilità da sbloccare e potenziare due volte; l'eccezione sono pochi cattivi e alleati — [GamesRadar](https://www.gamesradar.com/watch-dogs-legions-ability-to-play-as-anyone-puts-you-in-control-more-than-eve) **[estratto]**; [PC Gamer](https://www.pcgamer.com/watch-dogs-legion-everything-we-know-so-far/) **[estratto]**. La critica ricorrente è che l'idea resta «intrappolata in una struttura familiare» — [NME](https://www.nme.com/features/gaming-features/first-look-watch-dogs-legion-is-an-amazing-idea-trapped-in-a-familiar-framework-2772739) **[estratto]**
- **Cosa rubiamo**: un personaggio giocabile si distingue per *3-4 differenze che cambiano le scelte*, non per statistiche. A Porto Vecchio sono già lì: il mestiere (`mestieri.js`, le chiavi), le relazioni, la reputazione, quello che ha in tasca e in casa.

### Shadows of Doubt
- Il DevBlog 15 rifà l'IA dei cittadini con un sistema a obiettivi e bisogni "alla Sims", con frequenza di aggiornamento alta solo vicino al giocatore — [ColePowered DevBlog #15](https://colepowered.itch.io/shadows/devlog/78044/shadows-of-doubt-devblog-15-moving-in-the-citizens) **[estratto]**. Non ho trovato una fonte che dica che i cittadini usano gli stessi interattivi del giocatore.

## 3. Sintesi per Porto Vecchio

1. **Lo stato del codice.** `azioni.js` ha già un catalogo unico di verbi con modi e un pianificatore (`can`, `intend`), ma le azioni del giocatore passano da `playerActions`, scritto a parte (corpi, pala, telefono, bomboletta…). `iniziative.js` ha i suoi 18 verbi, `mestieri.js` i suoi, `casa.js` ha `Casa.fai`, `oggetti.js` le 142 ricette, `cantiere.js` il catalogo (≈114 voci). Sono **sei cataloghi** con sei forme diverse. Ognuno è giusto da solo; insieme sono la ragione per cui un NPC "non trova l'opzione".
2. **Il modello da copiare** è Bellwright + Bannerlord + Qud: un solo catalogo, l'NPC che passa per gli stessi passi del giocatore, il "cervello" come componente sostituibile.
3. **Il limite da non superare** è Kenshi/WDL: chiunque giocabile sì, ma con differenze che si sentono, e con poche eccezioni dichiarate (i capi dei Grigi, il Garante) per non rompere la storia.
4. **Il conto da tenere** è UO: un bilancio di risorse misurato, perché "stesse regole per tutti" vuol dire anche "mille NPC che tagliano la stessa pineta".
