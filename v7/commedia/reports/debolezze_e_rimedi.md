# Debolezze e rimedi: come falliscono le città simulate, e come Porto Vecchio può evitarlo

*11 novembre 2026. Ricerca web, nessuna modifica al codice. Note con fonti in `v7/commedia/research_notes/debolezze/` (01-08). Questo rapporto non ripete il setaccio (Felt, Winnow, StU), il realizzatore italiano né l'architettura a dieci strati dei tre rapporti "NPC vivi senza IA". Parte dal loro capitolo "Rischi" e lo trasforma in un catalogo di modi di fallire, con i rimedi che i giochi usciti hanno adottato.*

---

## Sintesi

Le simulazioni ambiziose di NPC falliscono quasi sempre per otto motivi. Nessuno di questi motivi è "l'IA è troppo stupida":

| # | Modo di fallire | Chi ci è caduto | Rimedio consolidato | Priorità PV |
|---|---|---|---|---|
| 1 | La profondità non si vede | Oblivion/Skyrim, Dwarf Fortress, Shadows of Doubt | Intento visibile, lettere con camera, il sistema nomina il giocatore | **Alta** |
| 2 | Farinata: tutto diverso, tutto uguale | Watch Dogs Legion, Wildermyth, CK3 | Poche scelte grandi, varianti rare, generazione legata alla meccanica | Alta |
| 3 | Taratura alla cieca | (quasi tutti); Lessard 2026 | Batch notturni con metriche multiple, racconti dei giocatori | Alta |
| 4 | Entropia e ingombro | Dwarf Fortress, Ultima Online | Durata di vita, deterioramento, pozzi diegetici, compattazione | Media |
| 5 | Il giocatore spettatore | Kenshi, Watch Dogs Legion, Skyrim | Pressione esterna, leve relazionali leggibili, Nemesis | **Alta** |
| 6 | Bachi emergenti irriproducibili | (Factorio li ha risolti) | Seme, tick fisso, replay + istantanee, ispettore | Alta |
| 7 | Rifiuto o ritiro dal Play Store | app WebView senza offline | API 36, offline da cache, TWA o WebView robusta | **Urgente** |
| 8 | UX da PC su telefono | RimWorld prima della Console Edition | Verbi a tocco, tre livelli di notifica, testo grande | Media |

---

## 1. La simulazione che nessuno vede

**Il fallimento.** Più la simulazione diventa fluida e meno si nota. Bruce Nesmith lo ha detto di Radiant AI: l'investimento è "enorme". Secondo lui a farla notare in Oblivion era proprio la sua stranezza, mentre la versione più pulita di Skyrim passa inosservata ([FRVR](https://frvr.com/blog/news/elder-scrolls-designer-explains-that-radiant-ai-is-an-enormous-investment-for-bethesda-but-every-improvement-actually-makes-it-less-noticeable-to-players/)). Will Wright lo aveva previsto per The Sims. Con Sim dieci volte più intelligenti «il giocatore non avrebbe idea del perché fanno qualcosa… sembrerebbe casuale. La parte difficile è comunicare l'intento» ([GamesRadar](https://www.gamesradar.com/the-sims-2-inside-the-mind-of-will-wright/2)). Dwarf Fortress ha la storia del mondo intera, ma come archivio grezzo, ed è servito un programma dei fan (Legends Viewer) per leggerla ([DF wiki](https://dwarffortresswiki.org/Utility:Legends_viewer)). Shadows of Doubt simula ogni appartamento, eppure viene criticato per casi "samey" e false piste illogiche. Un critico chiede qualche caso scritto a mano ([PC Gamer](https://pcgamer.com/games/sim/shadows-of-doubt-review), [OpenCritic](https://opencritic.com/game/14865/shadows-of-doubt)).

**Come l'hanno risolto.**
- *Intento prima dell'azione*: i fumetti di pensiero dei Sim.
- *Lettere che portano la camera*: in RimWorld un narratore con nome e carattere trasforma il caso in "regia" ([GDC 2017](https://gamedeveloper.com/design/video-how-i-rimworld-i-found-success-through-ridiculous-contrarian-design)).
- *Il sistema ti nomina*: i capitani Nemesis ti dicono che cosa hai fatto per farli arrabbiare. La prima versione, con morale e disciplina di fazione, fu scartata perché troppo complicata ([Game Informer](https://www.gameinformer.com/b/news/archive/2015/01/20/shadow-of-mordor-s-nemesis-system-was-once-a-bit-more-complicated.aspx)).
- *Coppie, non folle*: Wildermyth mette in scena quasi sempre due personaggi alla volta, dentro vignette scritte ([Wikipedia](https://en.wikipedia.org/wiki/Wildermyth)).

**Cosa deve fare Porto Vecchio.**
1. **Regola del segno**: ogni stato interno che cambia il comportamento (umore, credenza, rancore) deve avere un segno visibile entro 5 secondi dal momento in cui il giocatore guarda quell'NPC. Il segno può essere un fumetto con icona, una postura o una battuta. Se non ce l'ha, si taglia. È la stessa conclusione del rapporto "espansione", qui resa verificabile.
2. **Fumetto d'intento** prima delle azioni rilevanti ("💭 portafoglio" sopra il borseggiatore, "💭 Gennaro" sopra chi va a cercare vendetta). È lo strumento più economico e più testato.
3. **Il porto parla di te**: almeno una diceria su tre ascoltate dal giocatore deve riguardare lui o qualcosa che ha toccato. È il riferimento al giocatore che rende credibile la memoria, come nei Nemesis.
4. **Gazzetta come Legends, ma navigabile**: ogni voce della cronaca apre la scheda dei protagonisti e porta la camera sul luogo. La catena causale si può consultare (vedi §6).
5. **Regista con un nome**: la Gazzetta, o un narratore del bar, è la cornice che rende accettabile il caso, come i narratori di RimWorld.

## 2. Diecimila ciotole di farinata

**Il fallimento.** Kate Compton distingue l'unicità *matematica* da quella *percepita* ([Game Developer](https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-); [Rabii & Cook 2023](https://ar5iv.labs.arxiv.org/html/2305.02131)). Le reclute di Watch Dogs: Legion sono «nient'altro che le loro armi e abilità», con dialoghi ripetuti parola per parola ([Inverse](https://www.inverse.com/gaming/watch-dogs-legion-review), [PC Gamer](https://www.pcgamer.com/all-of-my-watch-dogs-legion-recruits-are-massive-disappointments)). Le vignette di Wildermyth si ripetono alla terza campagna. Paradox ha messo "meno spam di eventi" tra gli obiettivi di un aggiornamento di CK3, e i giocatori scrivono «più eventi NON è la risposta» ([Steam](https://steamcommunity.com/app/1158310/discussions/0/3808407060884649786)).

**Come l'hanno risolto.** Boris the Brave ("Oatmeal spice", luglio 2026) propone quattro mosse: *poche decisioni grandi* per ogni corsa, scelte discrete invece che continue, varianti rare che rompono una regola già stabilita, proprietà correlate ([link](https://www.boristhebrave.com/2026/07/05/oatmeal-spice/)). Emily Short aggiunge che il testo generato senza un effetto meccanico è "puramente decorativo" e il giocatore impara a ignorarlo ([link](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/)).

**Cosa deve fare Porto Vecchio.**
1. **"Stagione" del seme**: a ogni nuova città, o a ogni settimana di gioco, si estraggono 3-4 parametri globali che danno carattere alla corsa. Esempi: la faida del momento fra due famiglie, la moda del quartiere, il vizio comune (gioco, scommesse sul calcio), il meteo dominante. Tutto il resto deriva da lì. Due partite si devono poter raccontare con una frase diversa.
2. **Archetipi pochi e forti** (una dozzina di "maschere" della commedia), invece di molti tratti indipendenti. Le eccezioni rare valgono più di cento tratti continui.
3. **Ogni battuta generata deve cambiare qualcosa**: un prezzo, una porta aperta, una diceria. Altrimenti diventa sfondo, ed è meglio che sia breve.
4. **Memoria per ascoltatore**: nessuna battuta identica allo stesso giocatore entro 30 minuti reali. Nessun tipo di evento "lettera" ripetuto entro una sessione, salvo escalation.

## 3. Tarare senza misurare

**Il fallimento.** Lessard et al. (PCG 2026) non hanno trovato differenze significative fra euristiche di setaccio. La loro simulazione semplicemente produceva poco materiale ([PDF](https://www.pcgworkshop.com/archive/lessard2026narrative.pdf)). Una sola metrica produce Goodhart.

**Strumenti esistenti.**
- *Analisi dello spazio espressivo* (Smith & Whitehead 2010): un grande campione, due metriche, una mappa di calore ([PDF](https://www.pcgworkshop.com/archive/smith2010analyzing.pdf)).
- *Improbabilità come proxy di raccontabilità* (Kreminski, StU 2022).
- *Valutazione tramite racconti*: chiedere al giocatore di raccontare la partita (Kreminski, AIIDE 2019, [link](https://mkremins.github.io/publications/EvaluatingViaRetellings)).
- *Curva di tensione* di Left 4 Dead: intensità per giocatore che sale con il pericolo e decade nel tempo, ciclo *Build Up → Sustain Peak (3-5 s) → Peak Fade → Relax*, perché «il combattimento costante affatica, l'inattività lunga annoia» ([slide Valve 2009](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf)).
- *Batch con agenti* su un modello semplificato: EA e NYU lo hanno fatto per The Sims Mobile, e i risultati hanno portato a modifiche dopo l'uscita ([AIIDE 2018](https://ojs.aaai.org/index.php/AIIDE/article/view/13034)).

**Cosa deve fare Porto Vecchio.** Il cruscotto notturno senza rendering gira su 200 semi × 7 giorni di gioco, con tre giocatori fantoccio (girovago, ladro, socievole). Per ogni corsa registra sei misure:
- entropia dei tipi di evento;
- tasso di completamento dei pattern;
- quota di storie che toccano il giocatore;
- picchi e valli della tensione cittadina;
- ripetizioni di battuta per ascoltatore;
- crescita delle entità (vedi §4).

Le soglie vanno fissate *prima* di tarare. Il regista usa la curva di tensione alla L4D: se la città è "calda" da troppo tempo, sospende i nuovi conflitti; se è piatta, risveglia un gancio. Una volta a trimestre si fa il test "raccontami la tua partita" con 5-8 persone.

## 4. Entropia: la città che si intasa o si svuota

**Il fallimento.** Dwarf Fortress rallenta fino all'"FPS death": il wiki indica oltre 10.000 oggetti con controlli di temperatura e usura, ma l'evidenza è mista ([DF wiki Lag](https://dwarffortresswiki.org/index.php/Lag)). L'ecologia di Ultima Online fu rimossa. Secondo Koster crollò per l'*accaparramento* dei giocatori ([Koster](https://www.raphkoster.com/?p=46439)).

**Come l'hanno risolto.**
- *Minecraft*: gli oggetti a terra spariscono dopo 6000 tick (5 minuti) e c'è un tetto di 24 entità per blocco ([wiki](https://minecraft.fandom.com/wiki/Item_(entity)/ED)).
- *RimWorld*: il deterioramento all'aperto (×5 sotto la pioggia) e la sporcizia diventano lavoro e scelte di costruzione, come tetti e scaffali ([wiki](https://rimworldwiki.com/wiki/Deterioration)).
- *Animal Crossing*: erbacce e scarafaggi raccontano l'assenza del giocatore ([Nookipedia](https://nookipedia.com/wiki/Cockroach)). Attenzione però al nuovo descrittore PEGI "pressione a giocare" (§7).

**Cosa deve fare Porto Vecchio.**
1. **Durata di vita per classe**: gli oggetti senza proprietario si arrugginiscono o si sporcano, cambiano nome e poi spariscono. Ci pensano pozzi diegetici: il netturbino, il rigattiere, la mareggiata che "si porta via" la roba sul molo.
2. **Tetti di entità e memoria**: per cella, per NPC (per esempio 64 ricordi) e per cronaca. Si elimina per primo il più vecchio *non raccontato* e *non legato al giocatore*.
3. **Compattazione dei ricordi**: tre litigi diventano "ha un rancore con Tizio", poi decadono. Restano solo i ricordi citati dalla Gazzetta o legati al giocatore.
4. **Pozzi economici obbligatori** (affitti, multe, feste patronali, offerte) per evitare il collasso alla UO.
5. **Offline e assenza**: la città avanza in modo "riassunto" e *non punisce* chi torna tardi. Il ritorno si racconta con un "mentre eri via…" in Gazzetta.

## 5. Il giocatore spettatore

**Il fallimento.** In Kenshi l'unica pressione esterna è la fame. Le storie nascono dai fallimenti, ma molti giocatori si sentono persi ([Mechanics of Magic](https://mechanicsofmagic.com/2024/06/14/rwp-essay-emergent-narrative-in-kenshi/)). In Watch Dogs Legion la varietà delle reclute non diventa mai una scelta ([Push Square](https://pushsquare.com/reviews/ps4/watch_dogs_legion)). L'autore di Shadows of Doubt ha definito un «fallimento rispetto ai miei obiettivi» la scarsità di missioni secondarie e di incentivi ([DevBlog #20](https://colepowered.itch.io/shadows/devlog/117567/shadows-of-doubt-devblog-20-roadmap-2020)).

**Come l'hanno risolto.**
- *Stardew Valley* rende le relazioni leggibili e manovrabili. Un cuore vale 250 punti. Parlare dà +20 al giorno, un regalo amato +80, e l'amicizia decade di −2 al giorno. A 2-4-6-8-10 cuori si sbloccano scene scritte, e i cuori grigi segnalano un blocco esplicito ([wiki](https://www.stardewvalleywiki.com/Friendship)).
- *Nemesis* lega ogni capitano al giocatore e offre una gerarchia da smontare.
- *Shadows of Doubt* usa l'affitto e il desiderio di salire socialmente come motore.

**Cosa deve fare Porto Vecchio.**
1. **Pressione semplice e costante**: un debito, l'affitto del basso, un creditore con un nome. Spinge a usare la città ogni giorno.
2. **Relazioni leggibili**: un segno visibile per NPC (stima/rancore/fiducia in tre o cinque gradini). Ogni gradino sblocca una scena scritta della commedia e un favore concreto: uno sconto, una porta, un alibi.
3. **Struttura da scalare o smontare**: la gerarchia del porto (capo del mercato, guappo, maresciallo, parroco) come la gerarchia Nemesis. Le storie emergenti cambiano chi occupa i posti, e il giocatore lo vede.
4. **Commissioni generate dagli stati** (il rancore di A diventa un incarico per il giocatore), più pochi fili scritti a mano per città.
5. **Test di intercambiabilità**: se due NPC qualsiasi vanno bene per lo stesso incarico, i tratti di quel ruolo non incidono, e vanno resi meccanici oppure tagliati.

## 6. Bachi che non si riproducono

**Come l'hanno risolto.**
- *Factorio*: lockstep deterministico e report di desincronizzazione con le due copie dello stato. Due bachi storici sono l'ordine di iterazione delle tabelle hash e il multithreading ([FFF #70](https://factorio.com/blog/post/fff-70), [#415](https://factorio.com/blog/post/fff-415)).
- *Retro City Rampage*: input registrati, bachi "riproducibili al 100%" ([GDC 2015](https://gdcvault.com/play/1021826/Automated-Testing-and-Instant-Replays)).
- *Mark Wesley (2K)*: le istantanee riavvolgibili battono il determinismo puro per il debug ([GDC 2013](https://gdcvault.com/play/1018138/Implementing-a-Rewindable-Instant-Replay)).
- *RimWorld*: dev mode con ispettore e "Write Storyteller", che stampa i calcoli dietro ogni incursione ([wiki](https://www.rimworldwiki.com/wiki/Dev_mode)).

**Cosa deve fare Porto Vecchio.**
- Niente `Math.random` nella logica: un PRNG con seme per ogni sottosistema (mulberry32 o sfc32).
- Tick di simulazione fisso, separato dal frame.
- Ordine di iterazione stabile.
- Niente `Math.sin` ed esponenziali nelle decisioni: la specifica ECMAScript li lascia all'implementazione, e V8 e JavaScriptCore possono divergere.
- Diario degli input più un'istantanea ogni 5 minuti di gioco.
- Hash dello stato nel batch, con bisezione automatica se due corse con lo stesso seme divergono.
- Ispettore `?debug`: per l'NPC mostra bisogni, credenze con la loro fonte, piano e punteggi delle alternative. Per la Gazzetta, "perché questa storia?" risale fino agli eventi grezzi.

## 7. Google Play: il rischio più concreto e più vicino

**Fatti verificati.**
- L'APK attuale (`v7/apk/src/.../Main.java`) è una WebView che carica il sito pubblico, senza pagina offline, con `targetSdkVersion=34`.
- Dal 31 agosto 2026 le nuove app e gli aggiornamenti devono puntare ad **API 36** ([Android Developers](https://developer.android.com/google/play/requirements/target-sdk)). **Con 34 non si può caricare nulla.**
- La clausola anti-spam colpisce le webview di siti «senza il permesso del proprietario» ([Spam policy](https://support.google.com/googleplay/android-developer/answer/9899034)). Il sito è nostro, quindi non è questo il problema.
- Il rischio vero è la clausola sulla *funzionalità rotta*: «app che si caricano ma non rispondono» ([policy](https://support.google.com/googleplay/android-developer/answer/9898783)). Una WebView senza rete mostra la pagina d'errore di Chromium.
- Una TWA richiede Digital Asset Links e i criteri di installabilità PWA, cioè un service worker che funzioni offline ([Chrome](https://developer.chrome.com/docs/android/trusted-web-activity), [web.dev](https://web.dev/articles/using-a-pwa-in-your-android-app)).
- Classificazione: PEGI/IARC 16 per «la rappresentazione di attività criminali». Il furto non è nominato esplicitamente in nessuna descrizione. Droghe, alcol e tabacco portano sempre a 16 o 18 ([Google](https://support.google.com/googleplay/answer/6209544?hl=en), [PEGI](https://www.pegi.info/what-do-the-labels-mean)).
- Novità PEGI del giugno 2026: la "pressione a giocare" vale PEGI 7, e PEGI 12 se il gioco punisce chi non torna in tempo.

**Cosa deve fare Porto Vecchio.**
1. Alzare il target ad API 36 e verificare la gestione edge-to-edge e del tasto indietro.
2. Service worker che mette in cache il pacchetto del gioco e avvio da cache. Senza rete, una schermata diegetica con riprova.
3. Decidere fra **TWA** (motore Chrome aggiornato, storage del sito, meno codice nativo) e **WebView robusta** (ponte per salvataggi nativi di backup e controllo offline). Con la WebView serve comunque un backup dei salvataggi fuori dalla WebView.
4. Compilare il questionario IARC con un tono chiaramente caricaturale: furto comico, niente sangue, niente droghe esplicite. L'obiettivo realistico è PEGI 12. Se il crimine resta un verbo centrale e realistico, bisogna aspettarsi PEGI 16. *[Stima, da verificare con il questionario.]*
5. Nessuna punizione per l'assenza, coerente con il §4.

## 8. Una UX da PC dentro un telefono

**Come l'hanno risolto.** La Console Edition di RimWorld ha rifatto l'interfaccia da zero: azioni agli angoli, «mai più di tre passi da qualunque azione», focus separato per le notifiche ([DualShockers](https://www.dualshockers.com/bringing-rimworld-from-pc-to-console-interview/)). Per il testo, XAG indica per il mobile un minimo di 36 px di altezza del corpo a 200 DPI, con testo scalabile ([XAG 101](https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101)); IGDA indica 32/46 px a 1080p. Bersagli tattili: 48 dp su Android, 44 pt su iOS.

**Cosa deve fare Porto Vecchio.**
1. Un tocco per guardare o parlare, la pressione lunga per una ruota di 4-6 verbi contestuali, al massimo due livelli di menu.
2. Tre livelli di notifica:
   - *sussurro*: fumetto che svanisce;
   - *avviso*: striscia raggruppabile, per esempio "3 dicerie al mercato";
   - *lettera*: con "vai a", salvata nella cronaca.
   Budget di circa una lettera ogni 5 minuti.
3. Testo del corpo ≥ 16 px CSS effettivi, opzione 100/125/150%, fumetti con fondo opaco. Ogni battuta a tempo si deve poter rileggere nella cronaca.
4. Bersagli NPC allargati: area di tocco ≥ 48 dp attorno al personaggio, con aggancio al più vicino.

---

## Ordine consigliato

1. **Subito**: API 36 e offline da cache (§7). Senza, il canale Android è bloccato.
2. **Fondamenta**: seme, tick fisso e ispettore (§6). Senza, nessuna delle taratura successive è affidabile.
3. **Leggibilità**: regola del segno, fumetto d'intento, "il porto parla di te" (§1), più notifiche a tre livelli (§8).
4. **Anello di gioco**: debito, relazioni a gradini, gerarchia da scalare (§5).
5. **Misura**: cruscotto notturno a sei metriche e curva di tensione (§3), stagione del seme (§2), tetti e pozzi (§4).

## Limiti di questa ricerca

- La storia degli NPC assassini di Oblivion poggia su fonti secondarie (l'unica conferma di uno sviluppatore è riportata da The Escapist).
- La pagina wiki sulle lettere di RimWorld non era raggiungibile, e i dettagli vengono da conoscenza del gioco.
- Il riferimento "Hey Diddle" del brief non è emerso.
- Mount & Blade non ha una fonte specifica.
- La classificazione PEGI di Porto Vecchio è una stima.
- I rifiuti di TWA riportati da terzi non sono verificati.
