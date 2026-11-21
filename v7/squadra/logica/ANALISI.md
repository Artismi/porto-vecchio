# La logica degli NPC: l'analisi (la squadra, 21 novembre)

Rapporto del game designer di sistemi. Sonde e registri nella cartella temporanea della sessione (`squadra/logica/`: `carica.js` carica la
logica come `index.src.html` — mappa nuova, commedia e parola, i 30 `unico_*`, `Unico.chiudi` —; `sim_*.js`; i log in `out/`; seme 7).
Con la nota del committente: niente riscritture, passi piccoli e verificabili, nessuna personalità tolta agli NPC.

## 1. La mappa dei sistemi

- `HOOKS.step` avvolto da 23 moduli; sopra, le 6 fasi intercettate da `unico_porta.js` (commedia ⊃ parola ⊃ vita ⊃ iniziative ⊃ casa ⊃
  unico_parti_vivo) e 22 fasi nuove (`Unico.fase`). `risacca.js:1592` assegna i HOOKS senza concatenare (regge perché si carica subito dopo).
- **Chi decide cosa fa un NPC** (`think`, dall'esterno all'interno: vievive → scontri → ordine → convivenza → fazioni → azioni → popolo →
  risacca; il primo che ritorna `true` se lo prende), misurato in 2 minuti: popolo 52% (orario), azioni 14% (imprevisti), ordine 10% (Grigi),
  scontri 3%, `game.js think()` ~20% (fuga, denuncia, inseguimento, combattimento; quasi solo vicino al giocatore).
- **I cervelli**: game.js (utilità sulla memoria), popolo (orari, posti, dettaglio), l'esecutore di piani di `azioni.js` (l'unico corpo
  condiviso, a cui danno piani unico_mente, vita, iniziative, parola, writer_vita, trame, soldi, unico_rissa, popolo), ordine e scontri, i
  registi di scene, la voce (commedia, unico_lingua, unico_strada, parola, eventi, convivenza, unico_cultura, mente.js).
- **Cinque definizioni di «vicino»**: la bolla di game.js (≥ 60 m), popolo `near` 84 m ma **40 m sul telefono** (`popolo.js:25,40`),
  unico_mente 30/45 m, vita 26 m, l'anello 30/48 m. Fuori da `near` l'NPC non denuncia e non scappa (`popolo.js:1652-1656`): le
  conseguenze di un crimine dipendono dal dispositivo.

## 2. Incoerenze, con evidenza

- **Due premesse insieme**: all'avvio «Lo Squalo rivuole i suoi 500.000 lire…» (`game.js:644`) e «sotto la Tutela… Trova la Risacca»
  (`risacca.js:272`, `deadline = Infinity`). Uccidere Sandro chiude con una vittoria sul debito (`game.js:1116`); il fermo di Sandro sposta
  una scadenza infinita (`game.js:1840`); al terzo arresto «lo Squalo ti aspetta fuori» (`game.js:1854`).
- **Reazione sproporzionata allo scippo**: in meno di 5 s una Guardia ti arresta, l'orologio salta di 3 ore (`game.js:1849`); due penalità
  (multa del 30% e 15.000 lire di `soldi.js:501`); subito 36 NPC sanno, solo 7 hanno visto (la radio della polizia, `game.js:735-742`); in
  8 minuti 266 su 311; il feed pieno di «La voce corre» (~uno ogni 1,5 s), molte partono dai poliziotti (`game.js:1616`); denunce dopo la
  pena scontata.
- **I soldi non tornano**: lo scippo di game.js crea 15-45 lire dal nulla (`game.js:953`), il borseggio di `oggetti.js:1470` prende dal
  portafoglio vero e non emette eventi.
- **Le opinioni scritte da fuori si perdono**: `opinions()` ricalcola `n.op` a ogni `think` (`game.js:1449`); otto scritture esterne svaniscono
  (`unico_verbi.js:387,453`, `unico_sociali.js:148`, `oggetti.js:1306,1477,1558`, `convivenza.js:251-252`, `azioni.js:1038`): trust 0,9
  torna 0,00 in 0,2 s; anche la mente unica legge da lì (`unico_mente.js:334`).
- **Messaggi falsi e ripetuti** (12 ore col giocatore fermo): 72 righe «Stanotte qualcuno ha dipinto…» scritte di giorno (`popolo.js:1523`);
  «DEKA dei  ha finito la sua tag» con la crew vuota (`writer_vita.js:393` → `137`); il vigile di vievive investito dal traffico e registrato
  «morto nella sparatoria» (`game.js:2717`, `3164`, `1112`); il mazzo delle frasi sul lavoro ha 11 righe per tutta la città
  (`commedia.js:405`), ognuna ripetuta 9-11 volte in 5 minuti.
- **Due padroni per lo stesso NPC**: 62 NPC fermi più di 20 s con un piano in corso; casi netti: i Grigi `rt_0`, `rt_2`, `sd_6` con l'azione
  di ordine e il piano di azioni che non parte mai.
- **Le preemption funzionano** (8 su 1.809 piani), ma 386 piani durano meno di 2 s e l'azione visibile tremola (`pp35` cambia 92 volte in
  5 minuti).

## 3. Duplicati e codice spento

- **Memoria e relazioni**: `n.mem`/`n.op`, `P.diary`, `P.rapp`, `P.friends`/`FRIENDS`, `n.ris.loyalty`, `st.vita.fatti`, `st.u.fatti`,
  `menti[].rel`, mente.js. In 3 ore `n.mem` riceve 0 voci, Fatto 846 fatti: due reti di voci separate (sul giocatore e sugli NPC).
- **Rissa** (azioni, unico_rissa, scontri, game.js), **dialogo** (game.js talk, chat della Risacca, parola, `Mente.dialog`,
  `Azioni.CFG.talk`), **filtri sulle frasi** (tre setter su `n.bark`, quattro avvolgimenti di `G.say`, ma le 26 `say()` interne di game.js
  non passano da lì), **graffiti NPC** (sei sistemi), **separazione delle persone** (due passate, `game.js:3698` e `3717-3731`, più
  correzioni a posteriori), **due borseggi**, **due arresti con penalità**, **due sistemi di lavoro** (paga doppia).
- **Spento o residuo**: il vecchio dialogo di game.js (`talk`, `talkChoice`, `JOBS`, corruzione e calunnia: irraggiungibili con la UI di
  serie, ma controllati a ogni pensiero); il debito e `hoursLeft`; `unico_motore` (manca `unico_modello.js`); `unico_molo` (inattivo ma
  `faseLegno` costa 0,21 ms per passo); `unico_toppe` (rattoppa un crash di `popolo.js:796`); la «Decisione B» non implementata
  (`parola.js:1151` chiama ancora `/api/mente`); `unico_verbi.js:276` scambia per un momento `G.step` e `st.player`.
- **Costo** (Node, 311 NPC): 12 ms per passo; game.js 46% (traffico ~10%), GC 9%, popolo 7,6%, ordine 3,4%, unico_* ~10%; picchi da
  300-950 ms ogni 1-3 minuti; il primo passo 4-7 s.

## 4. Le prove

`test_citta_viva` fallisce 2 (nessuno al mercato); `test_fazioni` 1 («lo Squalo»); `test_unico_corpo` 1 («a Antonietta», la frase doppia da
vita e iniziative); `test_unico_verbi` e `test_unico_memoria` solo sui tempi (macchina carica); passano scontri, matti, regia, segni,
botteghe, unico_costruire, progetto, chiarezza, ordine (`test_ordine` e `test_azioni` stampano soltanto). **38 prove su 86 girano sulla
mappa vecchia** (`world.js`), comprese tutte quelle degli NPC; nessuna carica tutti i moduli insieme.

## 5. Piano a piccoli passi

1. Una sonda «gioco di serie» nelle prove (`carica.js`); `test_vita_npc`, commedia e `unico_*` sulla mappa nuova.
2. Correzioni puntuali: «Stanotte» solo fra le 21 e le 6; la crew vuota; la causa di morte «investito»; il vigile fuori dalla corsia; il
   registro per gravità (i graffiti NPC nel diario); «La voce corre» raggruppata e solo per fatti visti dal giocatore.
3. La premessa unica sotto la Risacca (quattro condizioni `if (st.ris)`, nessuna cancellazione).
4. La polizia proporzionata: la radio solo per i fatti gravi; i poliziotti non spargono voci; uno scippo porta a inseguimento o multa; una
   sola penalità per arresto.
5. Un solo punto per le opinioni (`n.opAdj` che decade, sommato in `opinions()`).
6. Una sola regola per i soldi rubati (dal portafoglio di popolo).
7. Un raggio «vicino» unico (`G.LOD`), uguale su telefono e computer per le regole.
8. Gli arbitri dichiarati: una tabella di priorità fra ordine, scontri, azioni e popolo; la catena di `think` da una lista.
9. Meno doppi senza perdere comportamenti: una passata di separazione; `faseLegno` solo con `&molo`; la correzione a `popolo.js:796` al
   posto di `unico_toppe`; un solo setter su `n.bark`.
10. Più avanti: riportare corruzione e calunnia nella chat della Risacca; i fatti di Fatto anche nelle voci sul giocatore.
