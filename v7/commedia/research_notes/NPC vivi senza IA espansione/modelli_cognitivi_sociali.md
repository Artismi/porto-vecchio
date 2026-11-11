# Modelli cognitivi, sociali ed etologici per NPC emergenti (città comica, centinaia di NPC, JS offline su telefono)

Legenda affidabilità:
- **[V]** = verificato in questa sessione su fonte (link inline).
- **[NV]** = da conoscenza di base del ricercatore, NON verificato in questa sessione su fonte primaria. Va controllato prima di citarlo come fatto.
- Le stime di costo computazionale sono inferenze del ricercatore salvo dove indicato.

---

## 1. Architetture cognitivo-affettive usabili nei giochi (BDI, OCC e versioni computazionali, PSI, Soar/ACT-R, appraisal)

### Takeaway
Il pezzo più "pronto all'uso" per un telefono è la catena **OCC appraisal → emozioni discrete con decadimento → umore PAD → personalità Big Five** (GAMYGDALA + ALMA): sono poche moltiplicazioni per evento per NPC, esiste già un'implementazione JavaScript MIT, e dà agli NPC reazioni coerenti a eventi (anche su terzi: gioia maligna, pietà, gratitudine) senza scrivere script per ogni caso. BDI completi (Jason) e architetture cognitive (Soar/ACT-R) sono troppo pesanti come runtime, ma le loro *idee* (intenzioni persistenti, attivazione della memoria che decade) si possono riprodurre in poche righe.

### Cited Findings

**GAMYGDALA (motore emozioni per giochi)**
- [V] GAMYGDALA (Popescu, Broekens, van Someren) genera le emozioni degli NPC a partire da *goal* definiti dallo sviluppatore ed *eventi annotati*, seguendo il modello OCC; gli autori lo propongono come un "motore" da usare in modo analogo a un motore fisico. Pubblicato su IEEE Transactions on Affective Computing (vol. 5 n. 1, pp. 32-44; il PDF è datato 2013, la rivista 2014) — [TU Delft research portal](https://research.tudelft.nl/en/publications/gamygdala-an-emotion-engine-for-games); [PDF](https://ii.tudelft.nl/~joostb/files/Popescu_Broekens_Someren_2013.pdf)
- [V] Esiste una **versione JavaScript** con plugin per Phaser, rilasciata con licenza MIT su GitHub ("gamygdala"); le classi plugin sono specifiche di Phaser ma il motore si può usare stand-alone. Broekens ha costruito due giochi sperimentali (un arcade emotivo e un puzzle emotivo) per mostrare gameplay nuovo reso possibile dalla simulazione delle emozioni — [Emotion engines for games in practice](https://repository.tudelft.nl/record/uuid:4b73339c-8aaf-46f9-a79f-0a73beacd554); [homepage GAMYGDALA](https://ii.tudelft.nl/~joostb/gamygdala/)
- [NV] Meccanica (da memoria del paper, non ri-verificata perché il PDF ha restituito 503): ogni goal ha un'utilità in [-1,1]; ogni *belief* (evento) ha una likelihood e una congruenza con i goal (quanto aiuta/ostacola). Desiderabilità = congruenza × utilità; da desiderabilità e likelihood escono hope/fear (evento incerto), joy/distress (evento certo), satisfaction/fears-confirmed/relief/disappointment (conferma o smentita di un'aspettativa). Le emozioni sociali (anger, gratitude, happy-for, pity, gloating, resentment) derivano dalla relazione "like" in [-1,1] tra NPC e dalla desiderabilità dell'evento per l'altro. Le emozioni decadono nel tempo (lineare o esponenziale) e vengono proiettate in PAD.

**ALMA (Layered Model of Affect, Gebhard, AAMAS 2005)**
- [V] Tre scale temporali: emozioni (breve termine, legate a un evento e che decadono), umore (medio termine, non legato a un evento), personalità (lungo termine, Big Five) — [Gebhard 2005, PDF](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)
- [V] L'umore è un punto nello spazio PAD (Pleasure, Arousal, Dominance), assi in [-1,1]. Gli 8 ottanti sono: +P+A+D Exuberant, +P+A-D Dependent, +P-A+D Relaxed, +P-A-D Docile, -P-A-D Bored, -P-A+D Disdainful, -P+A-D Anxious, -P+A+D Hostile. Intensità = norma del vettore PAD (max √3), divisa in tre fasce "slightly / moderate / fully" — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)
- [V] **Umore di default dalla personalità** (coefficienti dal file di configurazione del paper, mappatura attribuita a Mehrabian):
  - P = 0.21·E + 0.59·A + 0.19·N
  - A = 0.15·O + 0.30·A − 0.57·N
  - D = 0.25·O + 0.17·C + 0.60·E − 0.32·A
  - Esempio del paper: O=0.4, C=0.8, E=0.6, A=0.3, N=0.4 → P=0.38, A=−0.08, D=0.50 ("slightly relaxed") — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf). Nota: il segno +0.19·N nel Pleasure è controintuitivo; in Mehrabian l'asse è probabilmente "stabilità emotiva" e non "nevroticismo". **Da verificare prima dell'uso** (nell'esempio del paper i numeri tornano solo con i valori dati).
- [V] **Mappatura OCC→PAD** (estratto tabella 2): Admiration (0.5, 0.3, −0.2); Anger (−0.51, 0.59, 0.25); Disliking (−0.4, 0.2, 0.1); Disappointment (−0.3, 0.1, −0.4); Distress (−0.4, 0.1, −0.6) — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)
- [V] **Dinamica dell'umore "pull & push"**: si calcola il *centro emotivo virtuale* (media PAD delle emozioni attive, con intensità media, max 1). Se l'umore corrente sta tra l'origine e il centro, viene attirato verso il centro (pull); se è oltre, viene spinto più a fondo nel proprio ottante (push): esperienze che confermano l'umore lo rendono più intenso. In assenza di emozioni attive l'umore torna lentamente al default; tempo di ritorno basato sulla distanza max √3 = 20 minuti nell'implementazione. Esempio di configurazione: decadimento emozioni lineare in 20000 ms con aggiornamento ogni 500 ms — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)
- [V] ALMA gestisce 24 tipi di emozione, 8 tipi di umore, 5 tratti; uno studio di Gebhard & Kipp (2006) ha valutato le emozioni e gli umori simulati come plausibili per osservatori umani — [slide ALMA](https://sambuz.com/doc/alma-a-layered-model-of-affect-ppt-presentation-664816); [Springer, "Are computer-generated emotions and moods plausible to humans?"](https://www.springerprofessional.de/are-computer-generated-emotions-and-moods-plausible-to-humans/1232988); [alma.dfki.de](https://alma.dfki.de/)

**Altri (non verificati in sessione)**
- [NV] **OCC** (Ortony, Clore, Collins, *The Cognitive Structure of Emotions*, 1988): 22 tipi di emozione in tre rami: conseguenze di eventi (piacere/dispiacere, per sé o per altri), azioni di agenti (approvare/disapprovare: pride, shame, admiration, reproach) e aspetti di oggetti (liking/disliking); composte come anger = distress + reproach, gratitude = joy + admiration. ALMA ne usa 24 (vedi sopra).
- [NV] **FAtiMA** (GAIPS/INESC-ID, Lisbona; usato in FearNot! contro il bullismo): architettura OCC + pianificazione + memoria autobiografica; esiste FAtiMA Toolkit in C# (open source). Più pesante di GAMYGDALA (pianificatore), adatto a pochi personaggi principali, non a centinaia.
- [NV] **EMA** (Gratch & Marsella): appraisal sopra un piano causale con *coping* (es. negare, rassegnarsi, cambiare intenzione); concettualmente prezioso (il coping è una fonte di comicità: lo "sour grapes" esplicito), ma richiede un pianificatore.
- [NV] **BDI / Jason (AgentSpeak)**: belief, desire, intention; piani del tipo `+!goal : contesto <- azioni`. L'idea chiave per un gioco è la *persistenza dell'intenzione* (non ricalcolare l'obiettivo a ogni tick, riconsiderarlo solo su eventi). Jason è Java ed è un interprete: troppo per centinaia di NPC su telefono; si imita con una piccola "plan library" in JS.
- [NV] **PSI (Dörner) / MicroPsi (Bach)**: bisogni (esistenziali: cibo, acqua, integrità; sociali: affiliazione; cognitivi: certezza, competenza) come serbatoi; l'urgenza seleziona il motivo; *modulatori* (arousal, soglia di selezione, risoluzione) cambiano lo *stile* del comportamento (un NPC agitato cambia idea meno spesso ed è più grossolano). Economico se ridotto a serbatoi + 3 modulatori.
- [NV] **ACT-R**: attivazione di base di un ricordo B = ln(Σ t_j^−d), d≈0.5 (legge di potenza dell'oblio). Utile come formula singola per "di cosa si ricorda un NPC" e per pettegolezzi che svaniscono. Soar: regole di produzione + chunking; nessun uso pratico su mobile.

### Inferences
- Pipeline consigliata per NPC: evento (con tag: chi, a chi, desiderabilità per goal X) → appraisal OCC stile GAMYGDALA solo per NPC entro raggio/che ne vengono a sapere → emozioni con decadimento → umore PAD stile ALMA (pull/push) aggiornato a bassa frequenza (es. 1-2 Hz o per evento) → l'umore modula scelta azione e "battute" (ottante = registro comico: Hostile=attaccabrighe, Docile=succube, Exuberant=gigione, Disdainful=snob).
- Costo: per evento ~O(goal × NPC coinvolti); umore = 3 float + somma vettoriale. Centinaia di NPC: trascurabile se l'appraisal è *event-driven* e non per frame.
- Cosa aggiunge rispetto all'AI di gioco tipica (FSM/BT): reazioni *emotive a eventi che riguardano terzi* (Schadenfreude quando il rivale scivola sulla buccia), umori persistenti che colorano la giornata, differenze individuali da pochi numeri.
- Il "push" di ALMA è una fonte naturale di escalation comica (il nervoso diventa sempre più nervoso finché non esplode).

### Gaps
- Formule esatte di GAMYGDALA non ri-verificate (PDF e homepage hanno dato 503); vanno lette dal codice JS su GitHub.
- Nessun dato di benchmark trovato su GAMYGDALA con centinaia di agenti.
- FAtiMA, EMA, PSI/MicroPsi, Jason, ACT-R, Soar: non verificati in questa sessione.

---

## 2. Personalità e valori (Big Five/HEXACO, Schwartz, bisogni vs pulsioni) come bias non scriptati

### Takeaway
La personalità funziona meglio come *pesi* sopra utilità/appraisal, non come regole: in ALMA cinque numeri determinano già l'umore di base di un NPC; lo stesso vettore può pesare le utilità delle azioni (es. Estroversione → valore del socializzare). I bisogni modellati come serbatoi che si svuotano (Sims, Creatures, PSI) danno routine credibili; la personalità decide *come* soddisfarli.

### Cited Findings
- [V] In ALMA la personalità Big Five calcola l'umore di default (formule in §1) e controlla l'intensità delle emozioni nel motore OCC sottostante — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)
- [V] In Creatures le pulsioni (drive) danno punizione quando salgono e ricompensa quando scendono; il comportamento emerge dall'apprendimento a ridurre le pulsioni (modello "behaviorista") — [Wikipedia, Creatures](https://en.wikipedia.org/wiki/Creatures_(video_game_series))
- [NV] **HEXACO** aggiunge Honesty-Humility al Big Five: utile per un gioco di truffatori/imbroglioni (probabilità di mentire, di rubare la mancia).
- [NV] **Schwartz**: 10 valori di base su un cerchio (potere, successo, edonismo, stimolazione, autodirezione, universalismo, benevolenza, tradizione, conformismo, sicurezza); valori opposti nel cerchio sono in conflitto. Implementazione: ogni azione ha un vettore di "valori serviti", l'utilità = dot(valoriNPC, valoriAzione). Il conflitto genera dilemmi visibili ("tradizione" vs "edonismo" davanti alla pizza con l'ananas).
- [NV] **Maslow vs teoria delle pulsioni (Hull)**: Maslow come gerarchia rigida è poco supportato empiricamente; il modello a pulsioni/omeostasi (deficit → urgenza) è più semplice e più robusto per la simulazione. Le Sims usano bisogni-serbatoio + oggetti che "pubblicizzano" quanto soddisfano ciascun bisogno (smart objects).

### Inferences
- Formula di scelta economica: utilità(azione) = Σ_bisogni urgenza_b(deficit) × soddisfazione_b(azione) × peso_personalità_b + dot(valori, tag_azione) + modulazione_umore + rumore; scegliere con softmax/campionamento pesato per evitare robotismo. Costo: decine di moltiplicazioni per NPC per decisione, decisioni ogni pochi secondi → banale per centinaia di NPC.
- Curve di urgenza non lineari (es. quadratiche) creano "panico da deficit" comico: il tizio che mollava tutto per andare al bagno.
- Per una commedia, tratti estremi (caricature) leggibili valgono più di distribuzioni realistiche: campionare tratti bimodali.

### Gaps
- Nessuna fonte verificata in sessione su HEXACO/Schwartz in agenti di gioco; nessuna evidenza trovata di giochi commerciali che usino Schwartz.

---

## 3. Fisica sociale e status (Johnstone, Brown & Levinson, scambio sociale, reciprocità, fiducia, reputazione, doni)

### Takeaway
Il precedente più diretto è **Comme il Faut / Prom Week**, un "motore di fisica sociale" basato su *social exchange* (azione sociale + risposta dell'altro, con regole di influenza pesate). Lo **status di Johnstone** è stato formalizzato in alcuni modelli accademici (Exstasis, force dynamics), e si presta molto bene a una variabile numerica "status giocato" per ogni interazione: è il motore comico più naturale per una città di strada.

### Cited Findings
- [V] Prom Week (UCSC) usa il sistema AI Comme il Faut (CiF), che gli autori chiamano "social physics engine", in analogia con la fisica nei giochi d'azione: come la fisica in Angry Birds supporta soluzioni emergenti, CiF vuole gameplay emergente nell'interazione sociale — [UCSC News 2012](https://news.ucsc.edu/2012/02/prom-week/); [EIS blog](https://eis-blog.soe.ucsc.edu/2011/11/prom-week-gameplay-and-social-physics/)
- [V] CiF modella le interazioni come "social exchange": l'azione sociale di un personaggio volta a cambiare una relazione + la risposta dell'altro — [EIS blog](https://eis-blog.soe.ucsc.edu/2011/11/prom-week-gameplay-and-social-physics/)
- [V] Johnson-Bey, Nelson e Mateas (ICIDS 2022) propongono uno *spazio di progettazione* per costruire sistemi di fisica sociale; il termine "social physics" nasce dal lavoro su CiF — [SocialPhysics_ICIDS22.pdf](https://www.kmjn.org/publications/SocialPhysics_ICIDS22.pdf)
- [V] Paper di Prom Week presentato a FDG 2013 ("Designing past the game/story dilemma") — [promweek.soe.ucsc.edu](https://promweek.soe.ucsc.edu)
- [V] Modelli computazionali dello status di Johnstone: (a) un modello di *status shift* basato sulla force dynamics (semantica cognitiva) per storytelling interattivo/teatro improvvisato; (b) **Exstasis** (Rumpler, IVA 2009) che calcola status e tendenze d'azione di tutti gli attori di una situazione da caratteristiche di status e pattern di comportamento; (c) attori sintetici d'improvvisazione che seguono euristiche di Johnstone (accettare offerte, non bloccare) testati in uno scenario padrone-servo — [typeset.io, "Leading through character status"](https://typeset.io/pdf/back-leading-through-character-status-in-interactive-1961h0kbon.pdf); [Springer, Exstasis](https://link.springer.com/chapter/10.1007/978-3-642-04380-2_9)
- [V] Johnstone in *Impro*: normalmente siamo "proibiti" dal vedere le transazioni di status tranne quando c'è un conflitto (citazione riportata da un blog; la lettura "status = gioco a somma zero" è interpretazione del blogger) — [Performative Bafflement](https://performativebafflement.substack.com/p/improv-techniques-to-be-better-at)
- [V] Richard Evans ("Computer Models of Social Practices", PT-AI 2013) distingue pratiche sociali *regolative* (restrizioni su azioni e goal già dati) da *amplificative/costitutive* (forniscono azioni e goal nuovi) — base teorica di Versu — [PhilArchive](https://philarchive.org/archive/EVACMO)
- [NV] **Johnstone, meccanica**: ogni battuta/gesto è un'offerta che alza o abbassa il proprio status o quello dell'altro; si può "giocare alto" o "basso"; la commedia nasce da (i) seesaw: se A sale, B scende; (ii) personaggi con status sociale alto che giocano basso o viceversa (padrone goffo, servo arrogante); (iii) crolli improvvisi di status (la caduta del pomposo).
- [NV] **Brown & Levinson**: peso di una minaccia alla faccia W = D(distanza sociale) + P(potere dell'ascoltatore sul parlante) + R(gravità dell'imposizione); più W è alto, più la strategia scelta è indiretta: bald on-record → cortesia positiva → cortesia negativa → off-record (allusione) → non dire nulla. È direttamente una formula per scegliere il *registro* di una battuta.
- [NV] **Scambio sociale/reciprocità**: Homans/Blau; norma di reciprocità di Gouldner. Implementabile come bilancio di "debito" per coppia (chi deve un favore a chi). Economie del dono (Mauss): il dono crea obbligo; il dono troppo grande umilia (collegamento diretto allo status).
- [NV] **Fiducia**: Marsh (1994) formalizza la fiducia situazionale T_x(y,α) = U_x(α) × I_x(α) × T̂_x(y) (utilità × importanza × fiducia generale). **FIRE** (Huynh, Jennings, Shadbolt, 2006) combina 4 fonti: interazione diretta, ruolo, testimonianze di terzi, reputazione "certificata"; ciascuna una media pesata con pesi di recency.

### Inferences
- Proposta "motore di status" economico: ogni NPC ha `statusSociale` (ruolo: vigile, barista, nobile decaduto) e `statusGiocato` (preferenza, legata a Dominance del PAD e a Estroversione). Ogni interazione è una *transazione*: Δ = f(azione) che sposta lo status percepito dei due; l'NPC sceglie la mossa che porta lo status verso quello desiderato. La comicità emerge dal *disallineamento* tra statusSociale e statusGiocato e dai crolli pubblici davanti a testimoni (moltiplicatore = numero di spettatori). Costo: O(1) per interazione.
- Brown & Levinson dà la scelta del registro di dialogo (diretto/ossequioso/allusivo) da 3 numeri già presenti (relazione, status, gravità della richiesta) — si mappa su varianti di battuta pre-scritte.
- Bilancio debiti/doni per coppia + fiducia stile FIRE ridotta (media mobile esponenziale delle esperienze dirette + pettegolezzi pesati per fiducia nel narratore) danno reputazione emergente a costo O(relazioni), memorizzabile in mappe sparse (solo coppie che si sono incontrate).
- CiF è il modello architetturale più vicino a "commedia emergente": regole del tipo "se A è geloso di B e B flirta con C → +volontà di A di umiliare B" con pesi sommati. Il costo cresce con numero di regole × coppie: per centinaia di NPC valutarlo solo per coppie vicine/in scena.

### Gaps
- Formule di Marsh e FIRE, Brown & Levinson: non verificate in sessione.
- Non ho trovato dati su prestazioni di CiF con molte centinaia di personaggi (Prom Week ne ha ~18 [NV]).
- Dettagli di Versu (Evans & Short, logica di esclusione "Praxis") non trovati nella ricerca: gap.

---

## 4. Scienze sociali ad agenti (dicerie, dinamiche d'opinione, evoluzione culturale, Schelling, criminologia, soglie, reti small-world)

### Takeaway
Quasi tutti questi modelli sono *regole a coppie* da poche righe e sono stati concepiti proprio per migliaia di agenti in NetLogo: costano poco. Danno alla città fenomeni collettivi che l'AI di gioco tipica non ha: dicerie che si diffondono e si spengono, opinioni che si polarizzano in fazioni, folle che esplodono di colpo, crimine che si concentra dove si incrociano bersagli e assenza di guardiani. Il precedente ludico più diretto è **Talk of the Town** (Ryan et al.): NPC che osservano, raccontano, ricordano male e mentono.

### Cited Findings

**Dicerie e conoscenza**
- [V] **Daley–Kendall (1965)**: popolazione chiusa divisa in ignoranti, diffusori (spreader), soffocatori (stifler). Ignorante + diffusore → l'ignorante diventa diffusore; diffusore + diffusore o diffusore + stifler → il diffusore che inizia diventa stifler. Analogo a SIR ma con lo "stifling" specifico delle dicerie; variante semplificata Maki–Thompson — [arXiv 1607.05771](https://arxiv.org/pdf/1607.05771); [MTBI report ASU](https://mcmsc.asu.edu/sites/default/files/2024-09/MTBI%202003%20Spread%20of%20Rumors%20Report.pdf)
- [NV] Risultato classico: nel modello DK/Maki–Thompson circa il 20% della popolazione (≈0.203) non sente mai la diceria — utile come parametro di design ("non tutti lo vengono a sapere").
- [V] Ryan, Summerville, Mateas (AIIDE, ~2015): NPC che osservano e formano conoscenza sul mondo, la propagano ad altri, la ricordano male e la dimenticano, e mentono — [AAAI OJS](https://ojs.aaai.org/index.php/AIIDE/article/view/12825); [PDF](https://cdn.aaai.org/ojs/12825/12825-52-16341-1-2-20201228.pdf)
- [V] In Talk of the Town ogni elemento di conoscenza di un personaggio è soggetto a mutazione e decadimento; i personaggi scelgono cosa condividere in base alla familiarità reciproca. Discendenti: Neighborly (ricostruzione razionale di TotT) e Kismet (personaggi che spettegolano su azioni viste o sentite) — [Gossamer, CoG 2023](https://mkremins.github.io/publications/Gossamer_CoG2023.pdf); [Neighborly, CoG 2022](https://www.kmjn.org/publications/Neighborly_CoG22.pdf)

**Dinamiche d'opinione**
- [V] **Deffuant (bounded confidence)**: due agenti a caso interagiscono solo se |x_i − x_j| < ε; allora ciascuno si avvicina all'altro di una frazione μ (μ∈[0,0.5]; con μ=0.5 entrambi prendono la media). Le opinioni si raggruppano in cluster; numero di cluster ≈ 1/(2ε) (regola empirica) — [rf.mokslasplius.lt](https://rf.mokslasplius.lt/deffuant-bounded-confidence-model/); variante "relative agreement" Deffuant et al. 2002 [JASSS 5/4/1](https://www.jasss.org/5/4/1.html)
- [NV] **DeGroot**: x(t+1) = W·x(t) (media pesata delle opinioni dei vicini; converge al consenso se la rete è connessa e aperiodica). **Voter model**: ad ogni passo un agente copia l'opinione di un vicino a caso; produce domini che si ingrossano e consenso finale per caso.

**Evoluzione culturale**
- [NV] **Axelrod (1997)**: ogni agente ha F tratti culturali con q valori; probabilità di interazione = frazione di tratti in comune; se interagiscono, uno copia un tratto in cui differiscono. Esito: regioni culturali stabili e "isole" che non comunicano più. **Boyd & Richerson**: bias di trasmissione (conformista: adottare la variante della maggioranza più che proporzionalmente; di prestigio: copiare chi ha status alto). Il bias di prestigio si lega direttamente al motore di status (§3): mode e tormentoni lanciati da NPC ad alto status.

**Segregazione**
- [NV] **Schelling (1971)**: agenti su griglia si spostano se la quota di vicini simili < soglia (anche ~30%); emergono quartieri fortemente segregati anche con preferenze blande. Per la città: dove si siedono gli NPC al bar, quali piazze "appartengono" a quale gruppo (tifosi, turisti, anziani).

**Criminologia**
- [V] La **routine activity theory** richiede che un bersaglio adatto, un autore motivato e l'assenza di un guardiano capace coincidano nel tempo e nello spazio; è operazionalizzata in molti ABM: Groff (2007, rapine di strada), Birks & Davies (2017, furti in casa e struttura della rete stradale), Caskey et al. (belief learning offender/target/guardian), Rosés & Kadar (AAMAS 2018, mobilità da nodi di attività), Gerritsen (2010, strategie di sorveglianza dei guardiani) — [Birks & Davies 2017](https://discovery-pp.ucl.ac.uk/10039116/1/Birks%26Davies-2017-Street-Networks-Crime-Risk.pdf); [Caskey et al., Springer](https://link.springer.com/article/10.1007/s40747-017-0062-8); [AAMAS 2018](https://nscr.nl/app/uploads/2018/09/AAMAS-2018.pdf); [Gerritsen, VU](https://research.vu.nl/ws/files/42189944/chapter%20V.pdf); [Groff 2007](https://springerlink.bibliotecabuap.elogim.com/content/pdf/10.1007/s10940-006-9021-z.pdf) (dettagli dei parametri non verificati)
- [NV] **Crime pattern theory** (Brantingham): i reati avvengono vicino ai nodi (casa, lavoro, svago) e ai percorsi abituali degli autori, nello "spazio di consapevolezza"; edge effect ai confini tra quartieri.

**Soglie e folle**
- [V] **Granovetter (1978)**: ogni attore ha una soglia = numero/quota di altri che devono già partecipare perché il beneficio percepito di unirsi (es. a un tumulto) superi il costo; da una distribuzione di soglie si calcola l'equilibrio. Esempio: 100 persone con soglie 0..99 → cascata totale; togliendo solo chi ha soglia 1 → la cascata si ferma al primo; medie quasi identiche, esiti radicalmente diversi — [Granovetter 1978 PDF](https://Www.Gwern.net/doc/sociology/1978-granovetter.pdf); [Macy & Evtushenko, Sociological Science](https://sociologicalscience.com/download/vol-7/december/SocSci_v7_628to648.pdf); modello NetLogo [Modeling Commons](https://modelingcommons.org/browse/one_model/4784)

**Reti**
- [NV] **Watts–Strogatz (1998)**: anello di vicini + ricablaggio con probabilità p → alto clustering e cammini brevi ("small world") già con p piccolo. Per "chi conosce chi": famiglie/colleghi/vicini di casa come anelli locali + pochi legami lunghi (il postino, il prete, il barista come hub). Modelli alla Barabási–Albert danno hub (pettegoli).

### Inferences
- **Diceria comica**: un fatto (struct: soggetto, azione, oggetto, gravità, veridicità) si propaga solo durante incontri reali di NPC (non globalmente); regole DK per smettere di raccontarlo; ad ogni passaggio probabilità di mutazione (esagerazione di gravità, sostituzione del soggetto con chi è antipatico al narratore → bias di "like" da GAMYGDALA). Il giocatore vede la versione deformata tornargli indietro. Costo: O(incontri × fatti ricordati), con cap di memoria (es. 10-20 fatti per NPC, oblio ACT-R-like).
- **Opinioni/fazioni**: Deffuant su 1-3 assi (es. "il nuovo sindaco", "la squadra", "il ristorante nuovo") produce fazioni stabili ed estremi isolati; ε basso = città litigiosa.
- **Folle**: soglie Granovetter per comportamenti contagiosi (applaudire il musicista di strada, ballare, linciaggio comico del vigile, scappare). La distribuzione delle soglie per quartiere è un parametro di design che rende alcune piazze "esplosive". Costo: conteggio dei vicini partecipanti in raggio, griglia spaziale → O(n).
- **Microcriminalità**: borseggiatore come autore motivato; turisti distratti come bersagli; vigile/vecchiette affacciate come guardiani. Evento possibile solo se le tre condizioni coincidono → il crimine "nasce" dalle routine, e il giocatore può prevenirlo o provocarlo spostando guardiani.
- Tutti questi modelli si valutano per incontri/spazialmente con una griglia di hash: centinaia di NPC sono lontani da ogni limite.

### Gaps
- Axelrod, Boyd & Richerson, Schelling, DeGroot, voter model, Watts-Strogatz, crime pattern theory: non verificati in sessione (sono modelli classici; esistono implementazioni nella NetLogo Models Library [NV]).
- Valore 0.203 della frazione di ignoranti finali in DK/MT non verificato su fonte.
- Talk of the Town: non trovati dati di costo computazionale; era in Python e simulava ~140 anni di storia della città in pre-generazione [NV].

---

## 5. Etologia e simulazione del comportamento animale (Tyrrell, Blumberg/C4, Creatures, Black & White)

### Takeaway
L'etologia computazionale fornisce i meccanismi più economici e robusti per il "vivere quotidiano": **free-flow hierarchies** (tutte le pulsioni votano insieme, invece di un albero rigido), **releasing mechanisms**, **habituation/noia**, e apprendimento da ricompensa. Creatures (rete neurale + biochimica) e Black & White (alberi di decisione + perceptron appresi da feedback del giocatore) mostrano che queste idee hanno funzionato in giochi commerciali, con il limite noto dell'assegnazione del merito.

### Cited Findings
- [V] **Tyrrell (1993)** argomenta a favore delle free-flow hierarchies (FFH) contro le gerarchie decisionali (HDS): il controllo top-down delle HDS è fragile e non robusto; action selection = scegliere in ogni istante l'azione più appropriata da un repertorio — [Bohrium, "The use of hierarchies for action selection"](https://www.bohrium.com/paper-details/the-use-of-hierarchies-for-action-selection/812016246617800705-2868); [tesi Tyrrell, Edinburgh](https://era.ed.ac.uk/bitstreams/a3a0f465-74df-438a-9a9d-5ed62a43d0da/download)
- [V] **Blumberg** (modello derivato da Payton & Rosenblatt; "Hamsterdam"): tutti i nodi della gerarchia influenzano il comportamento seguente; la sua tesi *Old Tricks, New Dogs* tratta behaviors, releasing mechanisms, variabili interne, competizione tra gruppi di comportamenti e adattamento — [Action selection in Hamsterdam](https://typeset.io/pdf/action-selection-in-hamsterdam-lessons-from-ethology-4vubdr7jyv.pdf); [tesi Blumberg MIT](https://characters.media.mit.edu/Theses/blumberg_phd.pdf)
- [V] **C4** (Synthetic Characters, MIT Media Lab): architettura cognitiva per creature virtuali, cervello diviso per funzione in tre parti tra cui un meccanismo di action selection — [Temporal causality paper](https://characters.media.mit.edu/Papers/temporalCausality.pdf)
- [V] **Creatures** (Steve Grand, 1996): biochimica artificiale (metabolismo energetico + sistema "ormonale" che interagisce con la rete); prima generazione con rete a 4 strati, 952 neuroni, ~5000 connessioni, apprendimento hebbiano durante la vita; architettura e biochimica codificate geneticamente; secondo una fonte più tarda le Norn hanno 48 sostanze chimiche in 7 categorie (dato da devlog, da verificare) — [Alan Zucconi, The AI of Creatures](https://www.alanzucconi.com/2020/07/27/the-ai-of-creatures/); [Wikipedia](https://en.wikipedia.org/wiki/Creatures_(video_game_series)); [devlog 48 chemicals](https://multiverse-studios-site.pages.dev/devlog/the-48-chemicals.html)
- [V] Grand (2011): le Norn potevano imparare, generalizzare e reagire in modo intelligente, ma non "pensare" — [Wikipedia](https://en.wikipedia.org/wiki/Creatures_(video_game_series))
- [V] **Black & White (Richard Evans)**: AI che combina paradigmi diversi, tra cui addestramento di perceptron e apprendimento di alberi di decisione; la creatura registra la reazione del giocatore (schiaffo, carezza) e usa la tupla azione–feedback come input per indurre l'albero di decisione che condiziona le scelte future — [GDC 2005 tutorial su Game Developer](https://gamedeveloper.com/programming/postcard-from-gdc-2005-tutorial---machine-learning); [Wikipedia, Richard Evans](https://wikipedia.com/wiki/Richard_Evans_(AI_researcher)). Evans ha vinto il Game Developer Choice Award for Programming Excellence per questa AI (stessa fonte Wikipedia).
- [V] Critiche aneddotiche (commenti di utenti Slashdot, non peer review): problemi di assegnazione della ricompensa, la creatura impara la lezione sbagliata — [Slashdot 2001](https://developers.slashdot.org/story/01/04/20/1321203/talking-bout-game-ais)
- [NV] Architettura B&W descritta da Evans (AI Game Programming Wisdom, 2002) come BDI: desideri come somma pesata di fonti (perceptron: es. fame = 0.x·bassa energia + 0.y·cibo visto + ...), opinioni sugli oggetti come alberi di decisione, intenzioni.
- [NV] **Habituation/noia**: risposta a uno stimolo ripetuto decresce esponenzialmente (r ← r·(1−h)) e recupera col tempo; in Blumberg c'è anche un meccanismo di "level of interest" che decade mentre un comportamento è attivo, evitando di restare bloccati (dithering vs perseveranza).

### Inferences
- Selezione d'azione consigliata (economica): ogni comportamento candidato riceve un punteggio = Σ (pulsioni interne × releasing mechanism esterno, es. "vedo un gelato a < 5 m") × interesse (decade mentre lo si esegue, si ricarica a riposo) + bonus di inerzia per il comportamento corrente (isteresi). È una FFH piatta, O(comportamenti) per NPC per decisione.
- Habituation applicata alle *gag*: un NPC che subisce lo stesso scherzo smette di reagire (o passa da sorpresa a rabbia: la seconda volta non ride più) → impedisce la ripetitività meccanica senza scrivere eccezioni.
- Apprendimento B&W ridotto: per ogni NPC una tabella (azione, contesto-categoria) → peso aggiornato con feedback (delta rule del perceptron: w ← w + η(feedback − predizione)·x). Gli NPC "imparano" dal giocatore (il cameriere impara che il giocatore non lascia mancia) a costo di pochi float. Il rischio documentato di attribuzione sbagliata è, in una commedia, una feature (superstizioni comiche).
- Una rete tipo Creatures con 952 neuroni per NPC × centinaia è fattibile in JS in teoria (~5000 sinapsi × 300 NPC = 1.5M op per tick), ma non controllabile autorialmente: meglio solo l'idea di "biochimica" come pochi ormoni globali (adrenalina, sonnolenza, alcol!) che modulano tutti i punteggi.

### Gaps
- Dettagli interni di C4 (Isla, Burke, Downie) e della funzione di habituation di Blumberg non verificati: le tesi sono disponibili ma non lette in sessione.
- Fonti primarie di Evans (capitolo in AI Game Programming Wisdom, GDC 2002) non recuperate; la struttura BDI/perceptron è da fonti secondarie.
- Numero di sostanze chimiche delle Norn da fonte non primaria.

---

## 6. Costo computazionale e valore aggiunto rispetto all'AI di gioco tipica (sintesi per la città comica)

### Takeaway
Tutti i modelli catalogati, nella forma ridotta proposta, stanno ben dentro il budget di un telefono per qualche centinaio di NPC se (a) sono *event-driven* e non per frame, (b) usano una griglia spaziale per gli incontri, (c) hanno LOD (gli NPC fuori scena aggiornano in batch a bassa frequenza). Il valore aggiunto è che producono stati *persistenti e propagati* (emozioni, debiti, dicerie, fazioni, soglie) che l'AI tipica (FSM/BT/utility locale) non ha.

### Cited Findings
- [V] I modelli di Granovetter, Deffuant e affini sono disponibili come modelli NetLogo con migliaia di agenti (es. Granovetter su Modeling Commons) — [Modeling Commons](https://modelingcommons.org/browse/one_model/4784)
- [V] GAMYGDALA è dichiaratamente pensato come "motore" plug-in analogo a un motore fisico e ha già un porting JS — [TU Delft](https://research.tudelft.nl/en/publications/gamygdala-an-emotion-engine-for-games); [Emotion engines in practice](https://repository.tudelft.nl/record/uuid:4b73339c-8aaf-46f9-a79f-0a73beacd554)
- [V] ALMA aggiorna l'umore con periodo di 500 ms e decadimenti su decine di secondi/minuti: frequenze ben più basse di un frame — [Gebhard 2005](https://cs.huji.ac.il/course/2005/aisemin/articles2006/docs/pa1a3_29.pdf)

### Inferences (tabella di sintesi; costi = stime del ricercatore)

| Modello | Stato per NPC | Costo per aggiornamento | Fenomeno emergente aggiunto | Uso nella città comica |
|---|---|---|---|---|
| OCC/GAMYGDALA | lista emozioni attive, goal, like verso altri | O(goal) per evento percepito | reazioni a eventi altrui (gloating, pity, anger) | Schadenfreude collettiva, vendette |
| ALMA PAD | 3 float + default | O(emozioni attive) a 1-2 Hz | umore persistente, escalation (push) | registro comico per ottante |
| Big Five/HEXACO/Schwartz | 5-6 + 10 float | dot product per scelta | differenze individuali senza script | caricature coerenti |
| Bisogni/pulsioni (Sims, Creatures, PSI) | ~5-8 serbatoi | O(bisogni×azioni) ogni pochi s | routine giornaliere, urgenze | panico da bagno/caffè |
| Status Johnstone | statusSociale, statusGiocato | O(1) per interazione | gerarchie che oscillano, crolli pubblici | motore principale della gag |
| Brown & Levinson | — (deriva da relazione/status) | O(1) per battuta | scelta di registro (diretto/ossequioso/allusivo) | variante di battuta |
| Reciprocità/doni/fiducia (FIRE ridotto) | mappa sparsa coppie → debito, fiducia | O(1) per interazione | alleanze, favori, rancori | "mi devi un favore" |
| Daley-Kendall + TotT | ≤20 fatti con veridicità | O(fatti) per incontro | dicerie che mutano e muoiono | il pettegolezzo deformato |
| Deffuant/voter | 1-3 opinioni | O(1) per incontro | fazioni, polarizzazione | tifoserie, polemica sul sindaco |
| Axelrod/Boyd-Richerson | F tratti culturali | O(F) per incontro | mode, tormentoni, sottoculture | tormentone lanciato dal VIP |
| Schelling | soglia di comfort | O(vicini) per spostamento | territori, quartieri | la panchina "degli anziani" |
| Routine activity | ruolo + routine | check spaziale O(vicini) | crimine dove convergono bersaglio e assenza di guardiani | borseggi, truffe emergenti |
| Granovetter | 1 soglia | O(vicini in raggio) | cascate improvvise, folle | applausi, risse, fughe di massa |
| Small-world | lista amici (~5-15) | statico | chi conosce chi, hub del pettegolezzo | barista/portinaia hub |
| FFH etologica + habituation | punteggi + interesse | O(comportamenti) | comportamento fluido non bloccato, noia | la gag non si ripete uguale |
| Apprendimento B&W (delta rule) | tabella pesi piccola | O(feature) per feedback | NPC che imparano dal giocatore | il cameriere che ti riconosce |

- Ordine di grandezza (stima): 300 NPC × (decisione ogni 2 s con ~20 azioni × ~10 termini) ≈ 30.000 moltiplicazioni/s, più gli incontri sociali (pochi per secondo): ampiamente sotto 1 ms per frame in JS moderno. Il collo di bottiglia reale sarà pathfinding/rendering, non questi modelli [NV, stima].
- Ciò che l'AI tipica non ha: (1) memoria sociale persistente e asimmetrica, (2) propagazione di informazione imperfetta, (3) fenomeni collettivi non lineari (cascate, polarizzazione, segregazione), (4) affetto a più scale temporali, (5) adattamento al giocatore. Ognuno è una fonte di situazioni comiche "non scritte" e di aneddoti raccontabili dal giocatore.
- Rischio di design (inferenza): l'emergenza pura produce soprattutto rumore poco leggibile; serve uno strato di "drama manager"/lettore di pattern che riconosca situazioni comiche (es. status crollato davanti a ≥3 testimoni) e le metta in scena (inquadratura, battuta), come sostiene di fatto l'approccio "social physics" di CiF che rende le regole visibili al giocatore.

### Gaps
- Nessun benchmark trovato di questi modelli combinati su dispositivi mobili; le stime di costo sono teoriche.
- Nessuna fonte trovata su un gioco commerciale che usi esplicitamente Johnstone, Brown & Levinson, Deffuant o Granovetter come motore NPC (CiF/Prom Week è il caso più vicino, accademico).
