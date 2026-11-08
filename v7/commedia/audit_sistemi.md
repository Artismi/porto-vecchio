# Audit dei sistemi "sospesi" di Porto Vecchio v7 (solo lettura, 8 novembre 2026)

Ambito: v7/src, v7/server.js, v7/api/. Non ho modificato e non ho committato niente. Gli script di prova sono in scratchpad
(ids.js, names.js, chat.js, band.js, band2.js, tc_nuova.js, uscite t_*.txt).

## 0. Il quadro generale (cosa vuol dire davvero "sospeso")

- **Niente è commentato fuori da index.src.html.** Tutti i moduli di logica sono caricati nel gioco di default:
  risacca, popolo, azioni, economia, fazioni, soldi, oggetti, protagonista, mestieri, scambi, convivenza, imprese,
  commissioni, trame, graffiti, livelli, sottosuolo, coro, mente, risacca_ui, cantiere, menu_ui (index.src.html:363-466).
  Gli unici .js non caricati sono mappa_luoghi.js, pedonale.js, seme.js, strade_integre.js (tutti strumenti o codice morto).
- **La mappa di default è quella nuova** (`PV_NUOVA` vale true salvo `?vecchia`, index.src.html:336, poi world_cittanuova.js).
  Tutti gli id di luogo usati dalla Risacca (SPACES, LOTS, TARGETS, SHOPS, CAMS) esistono nella mappa nuova: lo script ids.js
  non ne trova nessuno mancante. Il rifacimento della mappa quindi non ha rotto questi sistemi.
- Le cause vere del "sospeso" sono cinque:
  1. **Nessuno li tocca dall'11 ottobre** (merge #43, acf9cd5): imprese, trame, commissioni, convivenza, coro, mestieri e scambi
     hanno lì il loro ultimo commit; fazioni il 19/10, mente il 23/10. Le prove (test_vita, test_imprese, test_coro, test_fazioni,
     test_cantiere, test_livelli) girano ancora sulla **mappa vecchia** (`require('./world.js')`).
  2. **orienta.js nasconde tutto finché non lo sblocchi**: l'HUD della squadra compare solo dopo il primo membro, il bottone
     del cantiere solo dopo la prima base (orienta.js:190-193).
  3. **La regia IA è stata cancellata**: il commit 7442404 (29/10, "[levette] [regia]") ha riscritto `src/regia.js` con la
     regia della *camera*. È sparito il vecchio regia.js ("La Regia: chi decide cosa succede per strada", ancora in
     `git show 7442404^:v7/src/regia.js`), con le auto che hanno un padrone e la regia IA delle scene. HANDOFF_regia.md
     descrive codice che non esiste più. server.js tiene ancora il gestore `kind:'regia'` (server.js:529), ma nessuno lo chiama.
  4. **La chat con IA "vera" (la Mente) non può fare azioni**: vedi §3.
  5. **Non esiste un salvataggio**: ogni ricarica riparte da zero; vedi §2.

## 1. I nomi

### Dove nascono
- **Gli abitanti**: popolo.js:79-82 (NOMI_M 40, NOMI_F 36, COGNOMI 60 con «Serra» ripetuto, SOPRANNOMI 16); la generazione
  è a popolo.js:334-349 e il soprannome a popolo.js:385 (40% di chi ha un giro di malavita).
- **Il cast**: game.js:495-520 (nome e ruolo), che risacca.js:191-215 (`CARDS[id].name`) **riscrive** a partita creata
  (risacca.js:265). Il NEW_CAST è a risacca.js:216-226.
- **Le case**: le etichette «Casa X» le crea world_cittanuova.js:3053 (e world.js:1334) con l'hash della posizione su una lista
  COGNOMI propria, **senza sapere chi ci abita**.
- **Le botteghe**: world_cittanuova.js:2941-3025 (nome del mestiere più un NOMI/COGNOMI preso dall'hash).
- **I "condomini"** (stella, mare, aurora, gabbiano, miramare, flamingo): sono PLACES fissi della mappa, usati come casa del cast.
- **Gli isolani**: game.js:589 (TRIB, SOLD, ISOL). **Le cellule**: fazioni.js:461. **I matti**: matti.js:31-76.

### Problemi misurati (mappa nuova, seme 1, names.js)
- 270 NPC: **6 nomi completi doppi** (Totò Fadda, Iolanda Fadda, Pina Zedda, Marisa Solinas, Tina Melis, Giuseppe Serra).
  Nomi propri molto ripetuti: Totò, Roberto, Salvatore e Tina 7 volte ciascuno.
- **Le etichette delle case non c'entrano con chi ci abita**: su 227 abitanti solo **8** vivono in una casa che porta il loro
  cognome (Teresa Pinna abita in «Casa Fadda», Piero Loi in «Casa Lombardi»…). «Casa Fadda» compare 21 volte, «Casa Caruso» 20.
  Il giocatore vede «▸ Casa Fadda» sulle porte (risacca_ui.js:453).
- **Il prete ha tre nomi e un cambio di sesso**: l'id `pietro` è «Don Pietro, Parroco» (game.js:513 e 628), poi diventa
  **«Suor Agata»** (risacca.js:195, BIBBIA §5). Restano però: il lavoretto «Fiori per Don Pietro» (game.js:1210), «Don Peppino
  oggi è in ritardo» (eventi.js:680), «don Piero ha detto una bella predica» (popolo.js:1869). C'è anche «Nonno Peppino»
  come matto (matti.js:65).
- **«Don Ciccio»**: in eventi.js:634 è il boss del tavolino («Dottore… Don Ciccio»), in eventi.js:675 il vecchio simpatico che
  saluta tutti («Don Ciccio! Come va la gamba?»). Sono due scene diverse e a parlare è **un NPC qualsiasi scelto per età**:
  sopra la testa ha il suo vero nome (es. "Antonio Piras") e lo chiamano Don Ciccio. «Ciccio» è anche nei SOPRANNOMI.
  Stesso schema con «signora Rosa» (eventi.js, sagrato), mentre Rosa è la fioraia del cast.
- **Id e nomi non combaciano** (trappola per chi scrive missioni): `beppe` = Dorino Carli, `lucia` = Bonaria Fadda (era
  "Lucia Bentivoglio, infermiera"), `pietro` = Suor Agata. Resti visibili: «Sali sulla Vespa di Beppe» (game.js:844),
  «Paga lo Squalo» nel dialogo classico (game.js talk), «Fermo! Polizia!» (game.js:1531), ruolo «Polizia di Stato» per
  Carla e Ferri (game.js:519-520; risacca li rifà Guardie). Il soldato «Soldato Ferri» delle isole (game.js:589) si confonde
  con l'Agente Ferri. test_fazioni fallisce su `NO nessuno si chiama più «lo Squalo»` (Sandro «lo Squalo» Neri, game.js:500)
  e nella stessa prova due soldati si chiamano «Monaco».
- **Nomi che si confondono**: il giocatore Nino, Gino (bar), Nico (fattorino), Nina (Trattoria da Nina). «Stella» è
  Condominio, Videoteca e Lavanderia (fazioni.js).
- **Parole che il giocatore vede senza spiegazione**: Risacca, Tutela, Grigi, Orecchi, Garante, «l'onda», «rettificato»,
  Ora Quieta, i nomi di battaglia (Candela, Garza, Madre) e il ruolo «Guerriero della tribù… (dicono che mangino gli uomini)»
  (game.js:593). Il nome Nino non viene mai presentato. In più l'ambientazione è incoerente fra i prompt: server.js:348 dice
  «anno 1986», chatRules (risacca.js:1393) dice «il 2019 come lo immaginavano nel 1984».
- **I luoghi**: il lotto si chiama «Vetta di Monte Nero» (risacca.js:85) ma il posto `vetta` è «Cima del Vico del Sale»
  (mappa nuova) o «Cima della Collina Nera» (vecchia). «Giardini delle Palme» (lotto) contro «Giardini di Ponente» (luogo).
  «Cantina di Vico dei Lanternini» contro il luogo «Vicolo dei Lanternini». La BIBBIA §3.2 usa le coordinate e le regioni
  della mappa vecchia. Fra gli id della BIBBIA presenti nella vecchia mappa e **assenti nella nuova**: bivacco_e, campeggio_e,
  cava, grotta, osservatorio, ruderi, scogli_10, pesca_molo_cargo_n1/n2 e circa 20 `casa_NNN`. Nella nuova ci sono nomi di
  luogo doppi (Spiaggia Lunga = bagno_0..3 e spiaggia_lunga; Spiaggia del Lido = bagno_9, bagno_10 e spiaggia).
  Per completezza: urbanistica2.js / cittanuova esiste (flag `?urbanistica2`), non l'ho analizzata.

## 2. La memoria degli NPC

- **Due memorie separate**:
  (a) **game.js `n.mem`**: i fatti visti o sentiti, con fonte, conf e `via` per le voci, e `n.op` {fear, trust, grudge}.
  (b) **popolo.js `P.diary`** (30 voci, `note()` a popolo.js:523), più `P.lunga` (memoria lunga, popolo.js:535-560) e
  `opinionOf(st,n,'player')` (popolo.js:571).
  Il Coro (coro.js) ricava dal diario la casella `P.box` e fa girare le voci per gruppi. `Game.tono` (game.js:1198) riassume
  (a) in paura/rancore/complice/sospetto.
- **Cambia il comportamento, e si vede**:
  - battute quando passi (game.js:1533-1552: «Ti ho visto: … Stammi lontano»);
  - rifiuto dei lavoretti (`jobRefusal`, game.js:1216);
  - frase d'apertura del dialogo (game.js:1226-1240);
  - matti ed eventi che diventano freddi (eventi.js:71, matti.js:223);
  - la volontà della Risacca (`will()`, risacca.js:358: paura e rancore abbassano il punteggio);
  - convivenza.reasonFor: ti cercano per avvisarti, minacciarti o ricordarti un favore (convivenza.js:184-196).
  Funziona.
- **Limiti**:
  - trame.js:168 **esclude il giocatore** dagli agguati per rancore (`m.who !== 'player'`);
  - il diario e la `n.mem` di game.js non si parlano, se non attraverso le note scritte da convivenza e mente;
  - test_vita.js 1 1 e test_coro.js passano (12 ✔), ma sulla mappa vecchia.
- **Il salvataggio non esiste.** Nessun salvataggio dello stato della partita. localStorage si usa solo per i graffiti del
  giocatore (`pv.graffiti.v1`, writing.js:2484), le schede di orienta, gli interruttori di sviluppo, la tavoletta e la qualità.
  **Ricaricando, NPC, Risacca, basi, memorie e appuntamenti ripartono da zero.**

## 3. Dalla chat alle azioni

### Tre strade (risacca_ui.js:283-325)
1. **Claude "sample"** (`window.claude.use('sample')`, risacca_ui.js:551): c'è solo se il gioco gira dentro un artifact di Claude.
   Usa `RS.chatTurns` con le regole complete: VERBI, LUOGHI, VOLONTÀ calcolata, stato, memoria e storia (risacca.js:1390-1450).
   L'IA risponde in JSON `azioni:[{verbo,…}]`. È l'unica strada che mette insieme parola e azione.
2. **Mente** (server.js o Vercel, `kind:'dialogo'`, mente.js:131): il prompt del server dice `"azioni": []` **senza un elenco
   di verbi** (server.js:448-461, api/_mente.js:313-326). npcData non porta né la VOLONTÀ, né i verbi, né `n.op`/`n.mem` verso
   il giocatore, né la storia della chat: manda solo l'ultima frase. Risultato: **con una chiave vera l'NPC parla bene ma non
   fa mai niente**, e può promettere ("sì, ti seguo") senza che succeda nulla. È questa la strada del gioco normale servito
   da AVVIA.bat o Vercel.
3. **Ripiego a parole chiave** (risacca.js:1503-1560), quando non c'è IA (e c'è anche quando l'IA risponde: viene saltato).

### Verbi che il motore esegue davvero
Sono in VERBS (risacca.js:128-185) più quelli aggiunti da altri moduli:
- **Muoversi**: vai, seguimi, aspetta, basta, nasconditi.
- **Risorse**: dai, prendi, compra, porta, deposita, ruba.
- **Informazioni**: racconta, sorveglia, rivela_spazio, diffondi_voce.
- **Lavori**: lavora, colletta, contrabbando, recupera, produci, mercato.
- **Azioni politiche**: scrivi_onda, volantina, sabota, trasmetti, libera, proteggi.
- **La banda**: unisciti, recluta, lascia.
- **Basi**: occupa, costruisci, allestisci, scassina, inchioda, arreda.
- **Altro**: missione, ricevi_soldi, mangia, bevi, dormi, scasso, lancia, fotografa, ricatta, convoca, scava, dipingi,
  picchia, ripara, pesca, rovista, bisca, vendi_documenti, linea, autonomia.
- **Aggiunti**: collaboratore (fazioni.js:356), mestiere (mestieri.js:248), partecipa (imprese.js:254), appuntamento,
  chiedi_aiuto, ricevi, accompagna (convivenza.js:99-160).

I verbi `task` funzionano solo coi membri: per un non membro `order()` risponde «Non è della Risacca» (risacca.js:899).
Un verbo sconosciuto dà «non è un'azione del gioco».

### Prova reale del ripiego (chat.js, mappa nuova, 11:23)

| Frase | Abitante qualsiasi | Cono (membro) |
| --- | --- | --- |
| «seguimi» | accompagna 1 ora ✓ | seguimi ✓ |
| «vediamoci alle 18 in piazza» | appuntamento ✓ | appuntamento ✓ |
| «vai alla calata del porto» | – | va all'**Osteria del Porto** ✗ (`findPlace` prende la prima parola che combacia) |
| «unisciti a noi» | Teresa Pinna, abitante a caso, entra nella Risacca al primo colpo | – |
| «tieni d'occhio Gino» | sorveglia **Piazza San Rocco** (nessun pedinamento di persone) | sorveglia Piazza San Rocco |
| «portami del pane», «partecipa», «rubami una vespa» | nessuna azione | nessuna azione |

«partecipa» è raggiungibile **solo** dalla strada Claude sample: l'invito di convivenza all'impresa
(«Domani alle 13: … vieni?») è un vicolo cieco senza IA.

**Incoerenza confermata**: il ripiego sceglie la battuta *prima* di eseguire. Cono dice «Fatto, vado.» e poi
`✗ Servono 2 di vernice`. «Contaci.» e poi `✗ Manca: fascio di assi ×4…`. «Va bene. Ci penso io.» e poi `✗ Non c'è una base`.
applyReply corregge solo missione, rivela e unisciti (risacca.js:1478-1486).

## 4. La banda (Risacca e fazioni)

- **Reclutare** (`unisciti`, `recluta`, `collaboratore`, tetto 15, 3 collaboratori a testa), **cellule autonome**,
  **la Famiglia**: test_fazioni gira (circa 160 s per giorno di gioco); fallisce solo la prova dello Squalo.
- **Libero arbitrio** (`autonomy`, `candidates`, risacca.js:1183-1247). Su band.js (mappa nuova, 5 membri, 10 ore):
  scrivono l'onda, lavorano, bevono, mangiano, sorvegliano la caserma, **occupano da soli** la Cantina dei Lanternini;
  morale da 12 a 29, gli obiettivi dell'Atto I si compiono. 3 ms per passo. **Funziona.**
- **Repressione**: in 10 ore di onde è rimasta a 0 (in test_vita lo stesso: morale 9, repressione 0). Ci sono solo 2 Grigi del cast.
- **Perquisizioni**: richiedono `expo > 0,6` (risacca.js:1328); con la repressione forzata a 75 non ne è partita nessuna in 5 ore.
- **Ordini**: pannello B (risacca_ui.js:330-360, molte voci con luoghi fissi) e chat.
- **Imprese** (test_imprese 1 1): 5 nate, 1 fatta, 12 adesioni, 22 rifiuti, giocatore 0.
- **Trame** (scasso, agguato, infamia): girano, ma il giocatore non è mai bersaglio dei rancori.
- **Morto o solo cosmetico**:
  - l'onda dei membri è solo un'etichetta HTML «≋» (risacca_ui.js:450), non un segno sul muro. I muri degli abitanti invece
    passano per `st.pop.walls` e render.js;
  - i membri non trasportano niente in 3D;
  - la regia IA delle scene è stata cancellata (§0).

## 5. Scavare, costruire, basi, crafting

| Sistema | Codice | Caricato | Ultimo commit | Stato |
| --- | --- | --- | --- | --- |
| Basi Risacca (spazi, lotti, strutture, moduli: deposito, dormitorio, stamperia, radio, falsari, officina, infermeria, armeria; inchioda e arreda per barricate e mobili) | risacca.js:55-108, 745-825; costi in oggetti veri oggetti.js BUILD | sì | risacca 2026-11-04 (ritocchi), sostanza 10-11 | Funziona in logica. Grafica minima: capanna e impalcatura a scatole (risacca_ui.js:505-530); i moduli non si vedono. Le azioni sono in «Cose da fare qui» (menu_ui.js:1027). |
| Cantiere del covo (Y; campo dove vuoi, terreno, orto, baracche, corrente, pezzi uniti, sotto terra) | cantiere.js (1306 righe, 103 THREE) | sì | 9cc61f6 2026-11-01 (solo [ottimizza]) | test_cantiere «Tutto bene», anche sulla mappa nuova (tc_nuova.js). Bottone nascosto da orienta fino alla prima base. In città solo al chiuso. |
| Scavare (botole, gallerie, J/K, scavo a clic, ritrovamenti) | livelli.js, sottosuolo.js | sì | 4a1f746 2026-10-24 / 3f82b67 2026-10-27 | test_livelli esce con 0. Con orienta il tasto **H apre la pausa Comandi** (orienta.js:420) e main.js toglie H a Livelli (main.js:212): si scava col tasto azione (main.js:389-391). Scavare la botola da dentro casa (H) **non ha più un tasto**. |
| Crafting (142 ricette, 18 postazioni) | oggetti.js:541+, scheda «Crafting» menu_ui.js:632/688 | sì | ecfdb23 2026-10-28 | Raggiungibile dal menu. |
| Basi e cantiere insieme | cantiere.covi() include ris.bases e «Casa tua» (cantiere.js:176) | | | Due inventari paralleli: il b.stock della Risacca e il baule del cantiere. |

Il "sospeso" qui è soprattutto la scoperta (nascosto da orienta, nessuna missione che ci porta), la doppia economia delle basi
e la grafica a scatole delle basi della Risacca. Non è codice rotto.

## 6. Priorità

**Costano poco e si vedono molto:**
1. **Chat Mente con le azioni**: mandare a `kind:'dialogo'` le regole e lo stato di `RS.chatTurns` (verbi, VOLONTÀ, storia)
   e togliere `"azioni": []` dal prompt. Si tocca mente.js:131-160, server.js:448-461 e si rigenera api/_mente.js con
   strumenti_inverno/mente_vercel.py. Chi ha una chiave passa da "parla ma non fa niente" a "fa quello che dice".
2. **Coerenza del ripiego**: scegliere la battuta *dopo* `order()` (si può riusare il blocco `resp.__fb` di applyReply,
   risacca.js:1478) e aggiungere le parole chiave «partecipa / vengo anch'io», «portami / porta X a Y», «sorveglia <persona>».
   In `findPlace` provare prima il nome intero.
3. **Nomi**:
   - un solo prete, o la suora dappertutto (game.js:1210, eventi.js:680, popolo.js:1869);
   - le scene di eventi.js con «Don Ciccio» e «signora Rosa» usino il nome vero dell'NPC che recita;
   - la Vespa «di Dorino», «Guardia!» al posto di «Polizia!», «Paga Sandro»;
   - etichette delle case prese dalla famiglia che ci abita, assegnate in popolo.js dopo la generazione (non serve toccare la mappa);
   - togliere il «Serra» doppio; nomi propri senza ripetizioni nella stessa famiglia.
4. **Riportare la regia IA** di `7442404^:v7/src/regia.js` in un file nuovo (auto con padrone, scene IA vicino al giocatore).
   Il server la gestisce già.
5. **Le prove sulla mappa nuova** (test_vita, test_imprese, test_coro, test_fazioni, test_cantiere): basta cambiare il `require`.

**Costo medio:**
6. Un salvataggio minimo (st.ris, n.op/n.mem/P.lunga del cast, basi, covo, inventario) in localStorage.
7. L'onda e i murales dei membri come segni veri sul muro (oggi sono etichette).
8. Rendere il giocatore bersaglio degli agguati (trame.js:168).

**Toccano aree di altri:**
- segni e murales veri: posizionamento in writing.js, distribuzione in strada_dipinta.js;
- basi e moduli visibili in 3D, gesti dei membri: modelli dei personaggi;
- luoghi nuovi e lotti nella mappa urbanistica2/cittanuova: urbanistica2.js;
- disboscare nel cantiere: alberi e vegetazione.
