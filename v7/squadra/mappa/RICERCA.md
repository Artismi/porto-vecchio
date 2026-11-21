# La mappa: progetto di ricerca (level design della città)

## 1. Il progetto

Dall'analisi (ANALISI.md) vengono tre famiglie di problemi: (a) il «pieno» del gioco non coincide con quello che si vede (muri
invisibili, case e pezzi attraversabili, barriere senza mesh, arredo che non urta); (b) l'arredo è posato a caso e poi corretto da una
pulizia a gioco avviato; (c) la città si legge male dalla camera alta (34°, il suolo visibile fino a ~35 m, i landmark verticali mai in
quadro), i rettilinei lunghi, l'est vuoto, i vicoli senza linee per BMX/skate, il traffico che si pianta a incroci e fermate.

Le domande che contano per noi:

1. **Collisione coerente con la geometria.** Come fanno i giochi open world a tenere allineati il mondo visibile e quello che urta?
   Collisione «per volumi semplificati» generata dalla geometria o scritta a mano? Che tolleranze (quanto può sporgere un muro, quanto
   può essere più larga la collisione) sono accettabili per la camera in terza persona? Che controlli automatici si usano (raggi, mappe
   di differenza, «collision debug view»)?
2. **Muri invisibili e affordance.** Quando un confine invisibile è accettabile, e come lo si rende leggibile (parapetti, ringhiere,
   linguaggio visivo dei bordi)? Le regole del «se sembra percorribile deve esserlo».
3. **Leggibilità e landmark** in terza persona: i «weenie» (Disney), Kevin Lynch (percorsi, margini, quartieri, nodi, landmark) applicato
   ai giochi; cosa fare quando la camera non inquadra il cielo (landmark a terra, segni sul suolo, luce, colore per quartiere).
4. **Ritmo dei percorsi**: compressione e respiro, viste che si chiudono su un punto, lunghezza massima dei tratti senza scelta; come
   lo misurano GTA, Saints Row, Spider-Man, Assassin's Creed.
5. **Linee di movimento** (BMX/skate/parkour): Jet Set Radio, Tony Hawk's Pro Skater, Sunset Overdrive, Skate, Session: come si
   disegna una «linea», densità di elementi grindabili, spot come piazze.
6. **Generazione procedurale con posa a regole**: grammatiche di forma, «slot» sui lotti, regole di arredo urbano (Introversion,
   CityEngine, Townscaper, Watch Dogs, Spider-Man, Marvel's/Insomniac, Ubisoft), validazione automatica.
7. **Traffico e navigazione che non si piantano**: fermate fuori corsia, incroci, gestione dei blocchi (teletrasporto fuori camera,
   sorpasso, «despawn»), navmesh vs griglia.

Fonti da cercare: talk GDC (GDC Vault, YouTube), blog di level designer (Gamasutra/Game Developer, 80.lv, The Level Design Book),
postmortem, testi (Lynch «The Image of the City», Totten «An Architectural Approach to Level Design»), documentazione di motori.
Ricerche solo con termini generici.

## 2. Cosa ho imparato

**Collisione e muri invisibili.** Le fonti concordano: la collisione è un volume semplificato, separato dalla mesh, ma deve seguirne
la forma; i muri invisibili sono considerati difetti di level design quando sono «imprevedibili»: avanzi di geometria vecchia o scatole
di collisione disallineate ([Invisible wall](https://wikiwand.com/en/Invisible_wall); [Panda3D, collisione semplice](https://discourse.panda3d.org/t/best-practices-detailed-environ-simple-collision/10099);
[RenderHub](https://www.renderhub.com/blog/collision-detection-and-why-invisible-walls-need-careful-handling)). Dove un confine serve,
lo si dichiara con la geometria (il parapetto, la ringhiera): il giocatore si aspetta che un bordo che sembra calpestabile lo sia
([MapCore, confini credibili](https://www.mapcore.org/forums/thread/11918-defining-boundaries-creating-credible-obstacles-in-games/);
[blockmesh, «denying affordance»](https://www.slideshare.net/slideshow/dshaverinvisibleintuitiondirectorscutpptx/258716962)).
Le metriche ([The Level Design Book, metrics](https://book.leveldesignbook.com/process/blockout/metrics)): corridoio minimo = due
volte la larghezza del giocatore, scale 30-35°, una «zoo map» di prova dove si cammina tutto. Per noi: ogni casella che blocca deve
avere sopra qualcosa che si vede, e ogni cosa che si vede alta più di un ginocchio deve bloccare; un varco che sembra un vicolo
(2 m fra due magazzini) deve essere percorribile o chiuso da un muro visibile.

**Leggibilità e landmark.** Lynch (percorsi, margini, quartieri, nodi, landmark) è il modello comune
([Urban design and videogame cities](https://www.gamedeveloper.com/design/urban-design-and-the-creation-of-videogame-cities);
[Realism and legibility](https://www.gamedeveloper.com/design/realism-and-legibility-in-open-world-level-design)). Sucker Punch distingue
i «weenie» alti (bandiere, visibili da lontano) dalle **briciole a terra** (i torii, a intervalli, come conto alla rovescia), e misura
che ci sia un richiamo visivo ogni ~30 secondi, tagliando ciò che copre le linee di vista
([Taxonomy of weenies](https://www.gamedeveloper.com/design/a-taxonomy-of-weenies-the-landmarks-that-define-i-ghost-of-tsushima-i-)).
Con la nostra camera alta i landmark alti non entrano quasi mai in quadro: servono le briciole a terra (edicole, fontane, luci, muri
dipinti) e i quartieri riconoscibili per colore e materiale. Le piazze accoglienti stanno sui 30-35 m; i marciapiedi devono lasciar
passare due persone. Le strade minori confluiscono nelle maggiori, le maggiori non finiscono cieche ma tornano al centro, i vicoli sono
scorciatoie-premio; i punti di interesse (fontane, statue) ancorano incroci e porte
([Hidden design decisions, 80.lv](https://80.lv/articles/hidden-design-decisions-behind-believable-open-world-cities)).
Percorsi che curvano rivelano il mondo a poco a poco; un rettilineo che mostra subito la meta spegne la scoperta
([Open world level design, spatial](https://www.blog.radiator.debacle.us/2017/10/open-world-level-design-spatial.html)).
GTA III: i landmark da soli non bastano in un mondo grande, servono mappa e nomi dei quartieri ([Design lesson 101](https://www.gamedeveloper.com/design/design-lesson-101-i-grand-theft-auto-iii-i-)).
Sunset Overdrive (Liz England, GDC 2015): la città pensata per il movimento veloce, due città buttate prima della terza; il problema
centrale era non far perdere il giocatore ([video](https://www.gamedeveloper.com/design/video-designing-cities-for-high-speed-traversal-in-i-sunset-overdrive-i-);
[GDC Vault](https://gdcvault.com/play/1022114/contactUs)); «Stop Getting Lost: make cognitive maps» ([GDC Vault](https://gdcvault.com/play/1027206/contactUs)).

**Linee per BMX/skate.** Jet Set Radio: ringhiere e punti di salto messi a distanza da poterli concatenare se ci arrivi con l'angolo
giusto; il livello come circuito da imparare ([Goomba Stomp](https://goombastomp.com/why-jet-set-radio-feels-so-good-to-master/)).
Tony Hawk: gli spazi immaginati (scuola, centro città) e poi riempiti di rampe e ringhiere al servizio del gioco, il divertimento prima
del realismo ([Wikipedia](https://en.wikipedia.org/wiki/Tony_Hawk%27s_Pro_Skater)). Per noi: le linee si disegnano come catene di pezzi
solidi (bordi, corrimano, banchine) a passo regolare, non come arredo sparso.

**Posa procedurale a regole.** La letteratura (sistemi a vincoli per popolare città procedurali, [CESCG 2010](https://old.cescg.org/CESCG-2010/papers/VUT-Scharl-Johannes.pdf);
modelli di posa legati alla geometria e alle zone, [Purdue](https://www.cs.purdue.edu/homes/bbenes/papers/Niese22ToG.pdf); CityEngine:
arredo posato dalle regole sui marciapiedi, [Esri](https://support.esri.com/en-us/knowledge-base/faq-how-do-i-place-street-furniture-like-lamp-poles-or-000011366))
e Insomniac (Manhattan: sistemi procedurali che trovano i posti adatti e fanno sopravvivere il lavoro a mano ai cambi della pianta;
[GDC Vault](https://gdcvault.com/play/1026496), [SIGGRAPH](https://history.siggraph.org/?p=82780)) dicono la stessa cosa: si posa
dove una regola dice che c'è posto, e lo si verifica in automatico; non si sparge a caso per poi pulire.

**Traffico.** Cities: Skylines evita che gli ingorghi crescano limitando i cambi di corsia (si sceglie la corsia presto) e con una
valvola di sicurezza: chi è bloccato in un ingorgo ricompare all'origine ([deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-traffic-systems-in-i-cities-skylines-i-));
Cyberpunk toglie le auto ferme ([Tom's Hardware](https://www.tomshardware.com/news/cyberpunk-deletes-idling-cars-scared-crowds)); i
mezzi fermi (incidente, sosta) vanno superati cambiando corsia ([Paradox](https://admin-forum.paradoxplaza.com/forum/developer-diary/development-diary-2-traffic-ai.1591141/latest)).
Per noi: la fermata del bus non deve stare nella sola corsia; un mezzo fermo più di N secondi fuori camera va rimesso altrove.

## 3. Come cambia il piano

1. **Prima la coerenza, poi la scenografia.** L'intervento parte dalla regola «visibile = solido, solido = visibile», misurata in
   automatico (le mie sonde diventano la «zoo map»): bug di `arretra()`, caselle fantasma a zero, corrimano disegnati o barriere tolte,
   soglie raggiungibili.
2. **Le zone riservate dalla geometria**: dove la riserva dei pezzi è un rettangolo a mano più grande del pezzo, si tolgono le caselle
   che non hanno niente sopra (le si ricava dalla forma del pezzo, come fa la sonda), invece di allargare la geometria.
3. **L'arredo grande solido**: i pezzi alti che si attraversano (mastio, spalle dei sottopassi, edicole, caserma, deposito) diventano
   caselle piene o barriere, così le briciole a terra (le edicole in fondo alla via) sono anche oggetti veri.
4. **Il muro dei graffiti raggiungibile** (il Muro del Garante): la casella piena davanti al muro diventa marciapiede e il muro una
   barriera sottile lungo la sua faccia.
5. Restano per dopo (scritti nel rapporto): posa dell'arredo a slot, traffico con valvola di sicurezza e fermate fuori corsia, i
   quartieri a terra, le linee BMX dell'est.
