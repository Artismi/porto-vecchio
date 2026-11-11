# Costruire, progettare, inventare: come gli agenti fanno cose nuove senza un modello linguistico

> Etichette: **[letto]**, **[estratto]**, **[non verificato]**.
> Già coperto: `iniziative.js` (atomi verbo × oggetto × posto × motivo × forma, meme che mutano, cose fisse), `imprese.js` (la legna, la colletta, la ronda), `creativita.js` (opere, improvvisare, soprannomi), `casa.js` (arredare con i verbi del giocatore), `cantiere.js` (catalogo di ≈114 voci, caselle solide). La seconda tornata ha messo le usanze che cristallizzano (strato 6). Qui: **come un NPC passa da "voglio X" a "costruisco una cosa che non c'era"**, e come una scoperta diventa sapere comune.

---

## 1. Costruzione: regole semplici che si leggono

### Valheim: l'integrità strutturale
- Ogni pezzo deve collegarsi al suolo direttamente o tramite pezzi sostenuti; il sostegno cala con l'altezza e lo sbalzo; il colore del pezzo (blu = a terra, poi verso il rosso) dice quanto margine resta; non è fisica vera (travi e capriate non sostengono come nella realtà); materiali più forti (legno di pino, pietra) allungano la portata — [Sportskeeda](https://www.sportskeeda.com/esports/understanding-structural-integrity-valheim) **[estratto]**; [Steam discussioni](https://steamcommunity.com/app/892970/discussions/0/3094509155630877600) **[estratto]**. Le fonti divergono sui colori intermedi.
- **Cosa rubiamo**: una regola di sostegno *a conteggio* (distanza in pezzi dal suolo, con un massimo per materiale) basta per far fallire in modo comico il ponte mal fatto, senza un motore fisico. Il NPC la usa come precondizione nella prova a secco; il giocatore la vede come colore.

### Townscaper: iniziativa mista, la persona dice *dove*, il sistema dice *cosa*
- Griglia irregolare (esagoni divisi in quadrilateri, punti spostati); i pezzi sono segmenti d'angolo alla marching cubes; il **WFC gira dal vivo** in due passi (scegliere i moduli validi, poi decorare); aggiungere o togliere un blocco fa rivalutare i vicini; se i vincoli non si soddisfano il sistema **fallisce in silenzio** invece di ricominciare; le "ricette" ad alta priorità (il giardino compare solo se un'area piana è chiusa da muri) sono imparabili. Il giocatore aggiunge, toglie, sceglie i colori; il resto lo decide il sistema — [Game Developer, How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) **[letto]**
- WFC è di Maxim Gumin — [mxgmn/WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse) **[estratto]**; trucchi pratici e WFC modificabile — [BorisTheBrave, tips and tricks](https://boristhebrave.com/2020/02/08/wave-function-collapse-tips-and-tricks); [Editable WFC](https://www.boristhebrave.com/2022/04/25/editable-wfc/) **[estratto]**
- **Cosa rubiamo**: l'NPC fa la parte del giocatore di Townscaper. **Sceglie solo dove e quale famiglia di pezzi** (una tettoia, un parapetto, un ponticello); il risolutore locale sceglie il pezzo esatto dal catalogo del cantiere in base ai vicini. Così le costruzioni degli abitanti "stanno bene" con il vicolo senza progettarle, e due vicini che aggiungono pezzi in giorni diversi producono una forma che nessuno ha disegnato. Il "fallire in silenzio" di Townscaper per noi è una gag: il ponte che resta storto.

### Going Medieval, Songs of Syx: ordini, priorità, scala
- Going Medieval: i coloni prendono il lavoro di priorità più alta che trovano, a parità da sinistra a destra, e un lavoro senza priorità non si fa mai; la squadra ha riscritto la logica in un sistema ad agenti comune (coloni, nemici, animali) per trovare i bachi di trasporto e priorità; la vecchia ricerca di percorso controllava ogni casella ed era cara; il problema ricorrente è **l'ordine dei passi in una costruzione** — [Foxy Voxel, mmt67](https://foxyvoxel.io/2025/10/06/mmt67/) **[estratto]**; [Foxy Voxel, nuovo sistema ad agenti](https://foxyvoxel.io/?p=437) **[estratto]**; [patch 1.0](https://foxyvoxel.io/2026/06/09/patch-notes-1-0-100/) **[estratto]**
- Songs of Syx: decine di migliaia di cittadini e soldati simulati, città da 10-30 mila; nessun devlog trovato sulle tecniche — [PC Gamer](https://pcgamer.com/songs-of-syx-is-a-base-building-game-with-massive-scale-battles) **[estratto]**
- **Cosa rubiamo**: un progetto è un **grafo di passi con dipendenze** (prima i pali, poi le assi), non una lista; e la scala di Syx ricorda che la folla si simula come *flussi* (quanti lavorano al ponte) e solo i vicini come persone.

## 2. Progetti collettivi e istituzioni

### Ostrom: regole come dati (ADICO)
- La grammatica istituzionale di Crawford e Ostrom scompone un'affermazione in cinque parti: **A**ttributi (a chi si applica), **D**eontica (deve / può / non deve), a**I**m (l'azione), **C**ondizioni (quando, dove), **O**r else (la sanzione); copre convenzioni, norme e regole nella stessa forma — [Frantz et al., Modelling Institutions Using Dynamic Deontics](https://www.academia.edu/22055003/Modelling_Institutions_Using_Dynamic_Deontics) **[estratto]**
- Modelli ad agenti con strategie in forma ADICO che imparano copiando gli altri riproducono l'emergere di istituzioni per le risorse comuni — [Universitat Autònoma de Barcelona, SSC 2014](https://ddd.uab.cat/pub/poncom/2014/128239/ssc14_a2014a71iENG.pdf) **[estratto]**; [TU Delft](https://repository.tudelft.nl/file/File_309dee55-22d1-48ee-a3a0-eac522d45083?preview=1) **[estratto]**; nADICO aggiunge affermazioni annidate (chi controlla il controllore) e la generalizzazione delle norme dall'esperienza (caso dei mercanti maghrebini) — stessa fonte di Frantz **[estratto]**
- **Cosa rubiamo**: il formato ADICO è **lo stesso** delle precondizioni dei verbi più una sanzione. «Chi pesca al molo prima delle sette (C) deve (D) lasciare un pesce al vecchio Tore (I), o lo sfottono (O)» è una riga di dati che si controlla con i verbi che ci sono (`pesca`, `regala`, `sfotti`). Le usanze della seconda tornata possono **diventare norme**: un meme ripetuto con conflitto genera una regola ADICO, e la regola cambia le utilità di chi la conosce. Nessuno, a quanto ho trovato, l'ha messo in un gioco commerciale.

### Bannerlord, Imprese: ruoli secondo quello che si ha
- In `imprese.js` chi ha l'ascia taglia e chi ha la carriola porta. È il metodo giusto: il ruolo in un progetto lo assegna **l'inventario** (e il mestiere), non uno script.

## 3. Invenzione: da dove viene una cosa nuova

### Avida: le funzioni complesse nascono solo se i passi intermedi pagano
- Organismi digitali che si replicano, mutano e competono per energia ottenuta eseguendo funzioni logiche; EQU (almeno cinque NAND) è emersa **solo quando anche le funzioni più semplici erano premiate**; il primo genoma che la eseguiva aveva 60 istruzioni e toglierne una qualsiasi di 35 la distruggeva; lungo il percorso si sono fissate anche mutazioni dannose — [Lenski et al., Nature 423, 2003](https://www.nature.com/nature/journal/v423/n6936/pdf/nature01568.pdf) **[estratto]**; [pagina di Lenski](https://lenski.mmg.msu.edu/papers/nature2003/index.html) **[estratto]**
- **Cosa rubiamo**: un progetto lungo (il ponte, la barca, la festa) nasce solo se i pezzi intermedi hanno valore **da soli** (le assi vendibili, la passerella usata dai bambini, la prova generale che diventa festa). Questo è un criterio per il catalogo dei progetti: ogni nodo intermedio deve essere un fatto raccontabile.

### Nascondino di OpenAI: strumenti emersi in addestramento, fuori linea
- In un simulatore fisico, con il solo obiettivo del nascondino, sono emerse sei fasi: rifugi con scatole e porte barricate, poi le rampe per scavalcarli; circa 500 milioni di partite — [OpenAI, Emergent Tool Use](https://openai.com/index/emergent-tool-use) **[estratto]**; [Baker et al., arXiv 1909.07528](https://arxiv.org/pdf/1909.07528) **[estratto]**
- **Cosa rubiamo**: non la rete neurale (costo, opacità), ma il **posto** in cui si fa la ricerca: **fuori linea, prima di spedire**. In Node, un cercatore prova composizioni di verbi e sostituzioni sul grafo delle proprietà, tiene quelle che producono effetti nuovi e comici, e le spedisce come dati. A runtime non c'è nessun apprendimento, solo una tabella in più.

### Voyager senza LLM: la libreria di abilità
- Vedi `pianificatori_e_costi.md` §6. Il piano riuscito, se è nuovo, diventa un'abilità con nome e autore.

### Dove sta l'invenzione a Porto Vecchio, in pratica
Quattro sorgenti, in ordine di costo:
1. **Sostituzione** (runtime, economica): il metodo diretto fallisce, si cerca un oggetto con le stesse proprietà. "Pianta il chiodo con il ferro da stiro."
2. **Uso fuori catalogo** (runtime, economica): un oggetto che pubblicizza la proprietà giusta usato per un verbo che non lo prevedeva. "Usa la porta del cesso come zattera." È la stessa ricerca, con il permesso di cercare negli oggetti grandi del cantiere.
3. **Composizione di progetti** (runtime, a turno): un obiettivo grande ("attraversare il canale senza fare il giro") si scompone in metodi HTN già scritti per famiglie (*collegare*, *coprire*, *chiudere*, *alzare*, *far galleggiare*); i pezzi li sceglie il risolutore del cantiere.
4. **Scoperta fuori linea** (prima di spedire): il cercatore trova combinazioni che nessuno ha scritto; un autore le approva; diventano metodi nuovi o ganci comici.

Una scoperta di tipo 1-3 riuscita **davanti a testimoni** diventa un meme (`st.ini.memi`) con autore, e si copia come le iniziative. Se si copia abbastanza, diventa "il modo di Porto Vecchio" di fare quella cosa (strato 6 della seconda tornata), e il giocatore la impara guardando (vedi rapporto, "ricettario vivo").
