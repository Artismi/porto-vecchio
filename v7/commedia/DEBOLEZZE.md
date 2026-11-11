# Le debolezze del lavoro «commedia» (revisione avversaria, 11 novembre)

Che cosa ho guardato: `src/commedia.js`, `parola.js`, `vita.js`, `iniziative.js`, `casa.js` con le loro cinque prove; i progetti in
`commedia/*.md`; la patch del giro 2; i tre rapporti e `reports/debolezze_e_rimedi.md`; `banco/RISULTATI.md`; l'APK (`apk/`).
Che cosa ho fatto girare:
- le cinque prove da `src/`;
- una simulazione mia di 3 giorni di gioco, seme 3, con tutti i moduli caricati come in `test_casa.js`, acceso e spento. Il giocatore
  fa il giro di otto posti e io conto ogni fumetto entro 26 m;
- il gioco vero in Chromium headless (`index.html?commedia`, SwiftShader).

Nessun file esistente è stato toccato. L'ordine va dalla debolezza più grave alla meno grave.

## Le prove, in breve

| Prova | Esito | Tempo |
|---|---|---|
| `test_commedia.js` | ok | 43 s |
| `test_parola.js` | **«2 prove non passano»** al primo giro, «Tutte le prove passano» al secondo, stesso codice | 3-4 min |
| `test_vita_npc.js` | **4 casi falliti**: appuntamenti 0, incontri 0, regali/prestiti 0, conti rinfacciati 0 (ognuno «≥ 1 al giorno») | 2 min |
| `test_iniziative.js` | ok | 2 min 40 s |
| `test_casa.js` | ok | 2 min 30 s |

Simulazione di 3 giorni, seme 3:

| | spento | acceso |
|---|---|---|
| battute sentite | 3.839 | 696 (−82%) |
| battute diverse | 549 | 411 |
| nuove nel giorno 1 / 2 / 3 | — | 216 / 177 / 124 |

Con il flag acceso, in 72 ore la vita fra NPC ha prodotto:
- vita: 17 scambi, 3 furti, 0 regali, 1 appuntamento;
- casa: 214 operazioni in 69 case, 0 pareti ridipinte, 0 cose buttate;
- iniziative: 147 eseguite, 2 capanne, 1 muro dipinto.

A 72 ore `JSON.stringify({vita, ini, casa, parola})` fallisce: **struttura circolare**.

Il gioco nel browser headless parte in 47-100 s. Gira a **0,33 fotogrammi al secondo** e in 5 minuti reali sono passati 4 secondi di
gioco: zero fumetti osservati, 4 risorse in 404. Le prime due prove avevano visto la pagina chiudersi da sola con `--use-gl=swiftshader`.
**Nessuno ha mai visto questi sistemi girare dentro il gioco vero**: tutte le cifre vengono da Node.

---

## 1. Il giocatore non vede quasi niente (leggibilità) — ALTA

**Prove**
- `test_vita_npc.js`, un giorno intero: il Taccuino «Sentito dire» dice ancora «Ancora niente. Passa vicino alla gente.».
- `VITA_NPC.md` §7: «Si legge solo da lì: nessun avviso a schermo».
- Gli scambi di vita sentiti sono 5 al giorno (la prova) e 17 in tre giorni (la mia simulazione).
- `casa.js` scrive un registro di 214 operazioni nelle case. Il giocatore lo vede solo se entra in quella casa e ricorda com'era prima.
- `iniziative.js` conta 500 fatti in 12 ore: si sentono solo le battute entro 22 m (`CFG.parla`).
- Lo stesso `reports/debolezze_e_rimedi.md` §1 chiede la «regola del segno», il fumetto d'intento, «il porto parla di te», la
  Gazzetta. Nel codice non c'è niente di tutto questo (`grep Gazzetta` trova solo `creativita.js` e `scorci_arte.js`).

**Perché conta.** È il fallimento numero 1 del catalogo di ricerca, e qui si avvera: centinaia di fatti per giorno, quasi tutti invisibili.
Lavoro fatto e non percepito vale zero.

**Cosa cercare.** «Sims thought bubbles intent legibility», «RimWorld letters storyteller», «Nemesis system legibility», Will Wright
su «communicating intent».

**Azione.** Prima di aggiungere sistemi, fare un **canale unico della leggibilità**:
- un fumetto d'intento con icona;
- una riga di cronaca per ogni catena chiusa;
- la camera che si gira verso il fatto.

Poi una prova automatica: «ogni fatto entro 60 m ha un segno visibile entro 5 s». Se un sistema non riesce a dare il segno, si toglie.

## 2. Non c'è un giro di gioco che usa la città viva — ALTA

**Prove**
- Le leve del giocatore sono la chat a parole chiave di `parola.js` («vediamoci alle 18 in piazza», «sabota la campagnola») e il menu
  casa (`casa.js:842`, avvolge `Azioni.playerActions`).
- Ma vita, iniziative e casa **non danno niente al giocatore**. Non c'è una ricompensa, una missione che nasce dai fatti degli NPC,
  una scelta che cambia il loro esito.
- Il «Sentito dire» dice «se vuoi, ci vai». Andarci non dà niente: non c'è un verbo per intervenire nell'appuntamento o nel furto visto.
- `VITA_NPC.md` §11 rimanda la domanda vera («le scene di eventi.js coi conti aperti: adesso o dopo?»).

**Perché conta.** Se manca la pressione o l'aggancio, il giocatore fa lo spettatore (Kenshi, Watch Dogs Legion: rapporto
«debolezze» §5). Una simulazione che non chiede niente al giocatore è scenografia, e costosa.

**Cosa cercare.** «emergent narrative player agency hooks», «Shadow of Mordor Nemesis player involvement», «Wildermyth vignette
trigger».

**Azione.** Scegliere **tre agganci** e legarli alle risorse che il giocatore ha già (soldi, Repressione, fiducia, banda):
- il debito fra due NPC che il giocatore può pagare o riscuotere;
- il furto visto che può denunciare o coprire;
- l'appuntamento che può sabotare.

Misurare quante volte al giorno l'aggancio capita entro 30 m.

## 3. Mai provato nel gioco vero, mai su un telefono — ALTA

**Prove**
- Tutte e cinque le prove girano in Node con moduli caricati a mano (`test_casa.js:17-24`): `try { require } catch {}` salta in
  silenzio i moduli che mancano.
- Nel browser il gioco non è misurabile su questa macchina (0,33 fps).
- `banco/RISULTATI.md` lo ammette: «non provato dentro il gioco vero». E misura un **carico sintetico**: Worker, PAD, credenze,
  Daley-Kendall. Nessuno dei cinque moduli contiene queste cose (`grep -c "credenz|PAD|pettegol"` dà 0 in vita, iniziative e parola).
  I moduli veri girano sul filo principale, dentro `G.HOOKS.step`.
- Il «casi peggiori» delle prove stesse sono già oltre il tetto del §8 (1 ms):
  - vita: 7-10 ms;
  - iniziative: 6,6 ms;
  - casa: 17 ms (percorso 15,4 ms).

**Perché conta.** Su Iris Xe e sui telefoni un picco di 17 ms è un fotogramma perso, ogni volta. Il banco dà una falsa sicurezza:
misura un progetto che non è stato costruito.

**Cosa cercare.** «Playwright CDP CPU throttling WebGL real device», «Chrome remote debugging Android WebView performance trace»,
«long tasks API».

**Azione.**
- Una prova Playwright sul **gioco vero** con GPU vera (macchina con Iris Xe) e una sessione `chrome://inspect` su un Android di fascia
  media, 20 minuti a `?commedia` contro senza flag.
- Mettere `performance.mark` attorno a ogni aggancio.
- Spezzare `casa.js` percorso/scene (il picco di 16,8 ms) su più fotogrammi.

## 4. Il flag spento è il gioco che la gente usa: le correzioni non arrivano — ALTA

**Prove**
- Tutto sta dietro `?commedia`. L'APK carica un URL fisso senza parametri: `apk/src/.../Main.java:5`
  `START = "https://www.artismidesignstudio.com/porto-vecchio"`.
- Le correzioni di lingua e di contesto di `commedia.js` (§5-§9) **non correggono la fonte**. Rattoppano a valle, con una regex sul
  setter `bark` (`commedia.js:640`).
- Senza il flag i giocatori sentono ancora le frasi rotte. La mia simulazione spenta: «Hai sentito? Ada ha dipinto un muro!» **330
  volte** in tre giorni, «Volante sul posto! Fermo!» 140, «Hai sentito? qualcuno è entrato…» con la minuscola 115.
- Il codice spento sta comunque nell'`index.html` di 14 MB (righe 114320, 119111, 120230): si scarica e non si usa.

**Perché conta.** Il lavoro di qualità sulle battute non tocca nessun giocatore. E la correzione a valle diventa debito: chi scrive in
`popolo.js` non sa che commedia gli riscrive le frasi.

**Cosa cercare.** «feature flags remote config WebView», «text lint at build time».

**Azione.**
- Portare le correzioni testuali (§5-§7, §9) **nei banchi di origine** e lasciare la regex solo come guardia in prova.
- Decidere una data per il flag di serie.
- Togliere i moduli dal pacchetto finché sono spenti.

## 5. La regia «commedia» funziona soprattutto zittendo — ALTA

**Prove**
- Simulazione di 3 giorni: da 3.839 a 696 battute sentite (−82%).
- `test_commedia.js`, `tolte`: `fondo:ritmo` 176, `fondo:dentro` 104, `fondo:lontano` 77.
- `vita.js` spegne la voce di `matti.js`: `T.CFG.voce = 0` (riga ~940).

**Perché conta.** Il problema della ripetizione è stato risolto togliendo, non scrivendo. La città con il flag è **più muta**.
Per un gioco che vuole «una città viva» è un risultato discutibile, e nessuno l'ha misurato con un giocatore.

**Cosa cercare.** «ambient barks density open world», «bark cooldown design GDC», «Hitman crowd barks».

**Azione.** Fissare un obiettivo di densità *percepita*, per esempio una battuta comprensibile ogni 10-15 s nei posti pieni. Riempire il
silenzio con varianti nuove nei banchi di origine invece di tagliare.

## 6. Ripetizione nelle ore: banchi troppo piccoli — ALTA

**Prove**

| Banco | Righe |
|---|---|
| `Vita.BANCHE` | 116 in tutto, 1-5 per situazione («attiv:pari» 1, «debito:salda_g» 1, «grazie:si_g» 1) |
| `Iniziative.BANCHE` | 97 |
| `Casa.BANCHE` | 92 |
| banchi di `parola.js` | 161 |

- Simulazione acceso: «Può andare.» 28 volte, «Calma, calma…» 24, «Agente, devo dirle una cosa.» 19, «Non sparare! Ti prego!» 18.
  Il modello «Hai sentito? X ha dipinto un muro!» passa le 70 volte, con il solo nome che cambia.
- Le battute mai sentite prima calano ogni giorno: 216, poi 177, poi 124. Al giorno 3 il 45% di quello che senti l'hai già sentito.

**Perché conta.** Dopo 2-3 ore il giocatore riconosce lo stampo e la «vita» diventa rumore («farinata», rapporto debolezze §2).

**Cosa cercare.** «Left 4 Dead dynamic dialog Elan Ruskin», «Tracery grammar», «bark repetition fatigue», «Valve response rules».

**Azione.**
- Un test di saturazione su 10 giorni simulati: nessuna riga oltre 1 volta ogni 2 ore di gioco sentite.
- Regole di risposta à la Ruskin (criteri + memoria per frase).
- Un tetto ai modelli «Hai sentito? X …» per tipo, non per testo esatto.

## 7. Le prove falliscono, o passano a caso — ALTA

**Prove**
- `test_vita_npc.js` esce con «4 casi falliti»: appuntamenti, incontri, regali e conti rinfacciati sono **zero** in un giorno.
  Proprio le cose del §9 di `VITA_NPC.md` («dodici scambi») non succedono.
- Il commit `635a09e` riporta tutto «allo stato provato (742efde)». Cioè lo stato con 4 fallimenti è quello accettato.
- `test_parola.js` ha dato due esiti diversi su due esecuzioni dello stesso codice.

**Perché conta.** Una prova rossa che si accetta smette di essere una prova. Una prova a caso non permette di trovare i difetti
(rapporto debolezze §6, «bachi irriproducibili»).

**Cosa cercare.** «deterministic simulation testing seeded PRNG», «Factorio determinism replay», «flaky test quarantine».

**Azione.**
- Rendere deterministico ogni modulo: `iniziative.js:42` e `commedia.js:261` usano `Math.random`, solo `parola.js:56` legge `st.rng`.
  Togliere il tempo reale (`now()`, `Date.now`) dalle decisioni.
- Le prove rosse o si aggiustano o si cambiano in modo dichiarato.
- Mettere in CI le cinque prove con il seme fisso.

## 8. Niente salvataggio: tutta la «memoria» muore al ricaricare — ALTA

**Prove**
- `CASA.md` §8: «Niente salvataggio della partita nel gioco: il registro vive con `st`».
- Nel gioco `localStorage` si usa solo per i suggerimenti (`main.js:1003`).
- A 72 ore lo stato dei quattro moduli **non si serializza** (struttura circolare).
- Il banco ha provato gzip e IndexedDB A/B sul carico finto, non sullo stato vero.
- La WebView Android chiude la pagina in background.

**Perché conta.** Debiti, rancori, case ridipinte, capanne, meme: tutto è pensato su più giorni. Ma nessun giocatore telefonico arriva
al giorno 2 senza ricaricare, e la memoria a lungo termine non esiste.

**Cosa cercare.** «IndexedDB save game WebView eviction», «navigator.storage.persist Android WebView», «save versioning migration».

**Azione.**
- Uno schema di salvataggio con versione per `st.vita`, `st.ini`, `st.casa`, `st.parola`: solo id, niente riferimenti agli oggetti.
- Una prova «salva a 72 h, ricarica, stesso seme: stessa storia».
- Trovare e rompere il ciclo nel grafo.

## 9. Una catena di agganci fragile, che inghiotte gli errori — MEDIA

**Prove**
- Ogni modulo avvolge `G.HOOKS.step`: commedia 645, vita 936, iniziative 968, casa 873. Vita esegue il suo giro **prima** di `s0`, gli
  altri **dopo**.
- `parola.js` riscrive `G.step`, `G.say`, `RS.fallback`, `RS.applyReply`, `RS.chatTurns`, `Mente.dialog`. `casa.js` riscrive
  `Azioni.playerActions` e `G.HOOKS.indoor`. `commedia.js` mette un accessor `bark` su ogni NPC (`defineProperty`, riga 640) e avvolge
  `G.talk/talkChoice/act`.
- L'ordine dipende dall'ordine dei `<script>` in `index.src.html:471-475`.
- Gli errori si registrano **una volta** e poi si tacciono per sempre: `if (!step.err) { step.err = 1; console.warn }`.
- Due MutationObserver diversi (`parola.js:2925`, `vita.js:1005`) riscrivono `#book .body` e il `nav`.

**Perché conta.**
- Basta spostare un file o rinominare una funzione di `popolo.js`, e un pezzo smette di funzionare in silenzio.
- La mia simulazione dice `errs: 0`, ma questo non prova niente: gli errori sono già stati inghiottiti dentro.
- Un `Object.assign` o un clone di un NPC perde l'accessor `bark`.

**Cosa cercare.** «event bus vs monkey patching JavaScript», «plugin hook ordering priority».

**Azione.**
- Un registro di agganci esplicito in `game.js` (`G.on('step', fn, priorità)`), con l'ordine dichiarato.
- Un contatore di errori visibile con `?perf`.
- Una prova che fallisce se un `catch` ha preso anche un solo errore.

## 10. Il gioco chiama ancora un LLM in partita — MEDIA

**Prove**
- `parola.js:1145-1153` fa `fetch('/api/mente')` per i tipi «banda» e «mandato», e avvolge `Mente.dialog` (righe 1157-1168).
- Si accende quando il server risponde `active` (`mente.js:42`).
- Le prove usano un'«IA finta» (`Parola.CFG.ia`).
- È contro il vincolo «niente LLM in partita». E aggiunge due tipi nuovi al server (`api/_mente.js`) che non vengono provati qui.

**Perché conta.**
- Costo e latenza imprevedibili sul telefono.
- Il comportamento cambia secondo se il server c'è o no.
- Le regole di Play per i contenuti generati dall'IA chiedono segnalazione e moderazione.

**Cosa cercare.** «Google Play AI-generated content policy», «on-device intent parsing».

**Azione.** O si toglie la strada IA da `parola.js` (le battute e i verbi ci sono già senza), o si dichiara apertamente l'eccezione con
un interruttore spento di serie.

## 11. La chat a testo libero sul telefono — MEDIA

**Prove**
- Le leve stanno in frasi da digitare: «vediamoci alle 18 in piazza», «Cono, l'onda al caruggio. Divisa, sorveglia la caserma.»,
  «tutti: stanotte l'Emporio» (`test_parola.js`).
- In `parola.js` non ci sono scelte rapide (`grep suggeri|chip` non trova niente).
- Il Taccuino è HTML iniettato in `#book`, senza una prova di dimensioni al tocco.
- Il riconoscimento a parole chiave sbaglia: «vai al porto» diventa una domanda; «rubami una vespa» dà «non è una cosa che sa fare».

**Perché conta.** Sul telefono digitare l'italiano con la tastiera virtuale mentre il gioco va è attrito puro. E un fraintendimento del
testo libero si legge come «il gioco è stupido» (Façade).

**Cosa cercare.** «dialogue wheel mobile», «contextual verb chips», «Façade natural language failure rate».

**Azione.** Tre-sei proposte toccabili per ogni NPC, generate dagli stessi verbi di `parola.js`, con il testo libero come opzione.
Prova al tocco su 360×640.

## 12. Lingua italiana: le euristiche sbagliano — MEDIA

**Prove**
- `parola.js:2176`: `${k.first} è entrato` → «Sandra è entrato: parla con gli Orecchi» (output della prova 30b).
- Lo stesso NPC con tre nomi in una risposta: «Garza: «Io ricucio quelli che ci provano, Nino. Chiedilo a Dorino.» ✗ Bonaria non lo
  farebbe mai.» (prova 18R). Il nome «Nino» è scritto nella battuta (`parola.js:708`), non preso dal nome del giocatore.
- `iniziative.js:107` `genere()`: ogni parola in -e che non sta nella lista diventa femminile plurale → «delle chiave», «delle
  fucile», «delle stivale».
- Simulazione acceso, frasi che restano:
  - «Domani attacco alle 0.» (Jean-Luc, Didier), anche se `commedia.js` §5 dice di toglierla;
  - «Hai sentito? qualcuno è entrato…» con la minuscola;
  - una Guardia che dice «E a me non mi chiama mai nessuno».

**Perché conta.** Un errore di accordo in una battuta da 70 caratteri si nota subito e rompe il tono comico.

**Cosa cercare.** «Morph-it! lessico italiano genere», «SimpleNLG-IT realiser», «grammatical gender agreement procedural text».

**Azione.**
- Un solo realizzatore (articolo, genere, participio) con un lessico vero, in un file comune.
- Una prova che genera 2.000 frasi e controlla gli accordi.
- I participi presi da `pop.sex`.

## 13. Cataloghi doppi: la stessa conoscenza in più posti — MEDIA

**Prove**
- Due `genere()` diversi: `parola.js:78` e `iniziative.js:107`.
- I nomi degli oggetti scritti di nuovo in `casa.js:94-113` («il portagioie», «la macchina fotografica») accanto a `Oggetti.CAT` e
  `Oggetti.nm`.
- Le regex dei nomi corti in `iniziative.js` `nm()`.
- Gli stati delle promesse tradotti in `vita.js:986` (`STATO_W`) e, a parte, in `parola.js`.
- Le condizioni di contesto scritte una volta in `contesto.md` e un'altra in `commedia.js` §9.

**Perché conta.** Ogni oggetto nuovo va scritto in 3-4 posti, e prima o poi uno resta indietro. È il collo di bottiglia della
scrittura, già oggi.

**Azione.** Un solo dizionario degli oggetti, con genere, articolo, nome corto e se è rubabile, dentro `oggetti.js`. Gli altri moduli
lo leggono.

## 14. Il collo di bottiglia della scrittura — MEDIA

**Prove**
- 332 righe degli estri, 116 di vita, 92 di casa, 161 di parola: scritte a mano, sparse nel codice, con i segnaposto (`{A}`, `{B}`,
  `| b:`) dentro stringhe JS.
- Ci sono più di 7.000 righe di documenti di progetto (`mondi_strada_*`, `scene.md`, `battute.md`, `ricorrenti.md`), ma nessuno
  strumento per vedere, provare e approvare una riga nel suo contesto.

**Perché conta.** Con i ritmi del punto 6 servono 5-10 volte tante righe. Scrivendole dentro il JS non si arriva, e una persona che
scrive senza leggere codice non può contribuire.

**Cosa cercare.** «Ink / Yarn Spinner bark authoring», «spreadsheet dialogue pipeline», «Ruskin dynamic dialog authoring tool».

**Azione.**
- Banchi in JSON o TSV fuori dal codice, con chiave, condizioni, voce e peso.
- Una pagina `studio_battute.html` che mostra ogni riga dentro una situazione simulata, con il conto delle volte che esce.

## 15. «Interessante» non si misura — MEDIA

**Prove**
- Le prove contano cose vicine all'obiettivo, non l'obiettivo: «coppie che nominano l'altro 15%», «fatti fra i due 13%», «catena più
  lunga 1» (`test_vita_npc`).
- La catena più lunga osservata è «movente → furto», due anelli.
- I criteri del rapporto «espansione» (test con 5-8 giocatori, A/B a cieco, aneddoti +50%) non sono mai stati applicati.

**Perché conta.** Senza una misura vicina al giocatore, ogni giro aggiunge complessità senza sapere se migliora.

**Cosa cercare.** «Lessard 2026 narrative sifting evaluation», «Winnow / Felt story sifting», «playtest anecdote recall method».

**Azione.**
- Un setacciatore notturno che conta le storie compiute (≥ 3 anelli, con il giocatore in almeno uno) per giorno e per seme.
- Un playtest vero di 5 persone a `?commedia`, contro senza flag, con la domanda «raccontami una cosa che è successa».

## 16. Disordine nel mondo (entropia) — MEDIA

**Prove**
- `iniziative.js` tiene al massimo 10 capanne (riga 875) e 500 fatti. Ma le capanne non decadono, e le case cambiano per sempre:
  214 operazioni in 3 giorni (`casa.js` `opsMax` comprime il registro, ma il mondo resta cambiato).
- La memoria di Node durante la simulazione sale da 54 a 245 MB (dato grezzo e rumoroso, ma la tendenza va guardata).
- Le iniziative copiate (`copie`) restano fra 19 e 31 in coda.

**Perché conta.** Su 20 giorni la città si riempie di capanne, mobili spostati e muri. Dwarf Fortress e Ultima Online hanno dovuto
mettere decadimento e pozzi di raccolta.

**Cosa cercare.** «Ultima Online item decay housing», «diegetic sinks clutter», «Dwarf Fortress item cleanup».

**Azione.**
- Una durata per ogni cosa creata dagli NPC: la capanna crolla, il muro si sbiadisce, il mobile torna.
- Una prova di 20 giorni che conta gli oggetti e la memoria.

## 17. Play Store e classificazione dei contenuti — MEDIA (URGENTE prima di pubblicare)

**Prove**
- `apk/AndroidManifest.xml`:
  - `targetSdkVersion="34"`;
  - APK e non AAB;
  - firma con `dbg.ks`, password `android` (`build_apk.sh:18`);
  - è solo una WebView sul sito vivo, senza modalità offline.
- Il contenuto aggiunto da `parola.js`:
  - rapine a mano armata («Radio Porto: rapina con la pistola all'Emporio Imperiale»);
  - il pizzo della «Famiglia» («La Famiglia vuole 23.000 entro le 18:00»);
  - la bisca;
  - il reclutamento di complici per lo scasso.
- Nei modelli: `kit_tortura`, `x_Gallows` (`avvio.js:36`, `models.js:15`).

**Perché conta.**
- Play chiede un target API recente e il formato AAB.
- Una «WebView del sito» rischia il rifiuto per funzionalità minima.
- Il questionario IARC sulla violenza realistica, il crimine e il gioco d'azzardo simulato porta probabilmente a PEGI 16-18.
- Contenuto server cambiato dopo l'approvazione, senza revisione, può violare la classificazione dichiarata.

**Cosa cercare.**
- «Google Play target API level requirement 2026»;
- «Play minimum functionality WebView policy»;
- «IARC questionnaire simulated gambling realistic violence»;
- «Trusted Web Activity vs WebView».

**Azione.**
- Una tabella dei contenuti per la classificazione, con l'interruttore per togliere armi vere e bisca.
- Un AAB con target attuale e chiave di produzione.
- Una cache offline.
- Le «armi finte» (la banana nel sacchetto) come scelta di serie, se il tono è comico.

## 18. Debiti lasciati a metà — BASSA (ma si accumulano)

**Prove**
- `vita_giro2_interrotto.patch` (151 righe aggiunte in commedia, parola, vita e la prova): il margine di 70 cm a «chi ascolta», mai
  applicato né scartato.
- `STRUMENTI_NPC.md` (il registro dei verbi, «i dieci verbi da unificare per primi») e `PROGETTI.md` (il crimine con la sua struttura,
  la proprietà): progetti senza codice.
- Le «Decisioni per Andrea» aperte in quattro documenti:

  | Documento | Decisioni aperte |
  |---|---|
  | `VITA_NPC.md` | 5 |
  | `INIZIATIVE.md` | 5 |
  | `PROGETTI.md` | 8 |
  | `CASA.md` | 4 limiti |

- Le «righe nei file degli altri» chieste e non fatte.

**Perché conta.** Ogni giro apre un sistema nuovo prima di chiudere il precedente. Il risultato sono cinque moduli a metà invece di uno
finito che si vede.

**Azione.** Bloccare i sistemi nuovi. Chiudere vita (le 4 prove rosse), decidere la patch, rispondere alle decisioni o cancellarle.

## 19. Diagnosi e debug: non c'è un ispettore — BASSA

**Prove**
- Le statistiche stanno in `st.vita.stats`, `st.ini.stats`, `st.casa.stats`, `Commedia.stats`, ma non c'è una vista in partita.
- Per sapere perché un NPC ha fatto una cosa bisogna leggere `fatti[]` a mano.
- Senza seme nel browser, un bug visto da un giocatore non si riproduce.

**Azione.**
- Un pannello `?commedia&ispettore`: un tocco su un NPC mostra l'ultimo fatto, la causa, la promessa aperta.
- Esportare un replay: seme più ingressi.

---

## Le dieci da fare prima

1. Un canale della leggibilità e la regola del segno (§1).
2. Tre agganci di gioco sui fatti degli NPC (§2).
3. Misure nel gioco vero, su Iris Xe e su un Android (§3).
4. Le correzioni testuali nelle fonti; decidere il flag di serie (§4, §5).
5. Ripetizione: banchi più grandi fuori dal codice e una prova su 10 giorni (§6, §14).
6. Prove deterministiche, e niente prove rosse accettate (§7).
7. Salvataggio con versione e senza cicli (§8).
8. Un registro di agganci, e niente errori inghiottiti (§9).
9. Togliere l'LLM o dichiararlo (§10).
10. Play Store: AAB, target, classificazione, contenuto criminale configurabile (§17).
