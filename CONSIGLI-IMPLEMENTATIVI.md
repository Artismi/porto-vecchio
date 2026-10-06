# CONSIGLI IMPLEMENTATIVI — consolidare Porto Vecchio e proseguire

*Data: 6 ottobre 2026 · Compagna di [ANALISI-STRUTTURALE.md](ANALISI-STRUTTURALE.md). Priorità dichiarata dall'utente: **consolidare prima, poi sviluppare**. Nessuna delle azioni qui sotto è stata eseguita: questa pagina è un piano di lavoro da approvare.*

---

## 0. Sintesi in tre righe

1. **v7 è l'unica versione viva**: consolidarla come «unica fonte di verità» e chiudere il ciclo (sorgenti → build → test → deploy).
2. **Le versioni obsolete si possono togliere dal working tree** (v2–v6, radice storica, backup, archivi di scambio) ma **solo dopo** averne fatto l'archiviazione definitiva fuori dal percorso quotidiano — e sempre con conferma, perché alcune cartelle contengono materiale non committato altrove.
3. Il collo di bottiglia tecnico vero non è la quantità di codice, è la **pipeline di `render.js`** e la mancanza di test della grafica: il consolidamento deve rendere quelle due cose ripetibili.

---

## 1. Che fine possono fare le versioni obsolete

Prima di tutto, una distinzione netta fra i tre «generi» di copie presenti:

### 1.1 Snapshot di versione: `v2/`, `v3/`, `v4/`, `v5/`, `v6/` — **sì, si possono togliere (con archiviazione)**

- Sono **anticamerate di v7**: ogni HANDOFF dice «base: vN, lavoro su vN+1». v6 in particolare è la base dichiarata di v7; i contenuti di v2–v5 sono interamente contenuti in v6 per costruzione.
- Sono **committate su git**: la loro storia non si perde mai finché esiste il repository. Eliminarle dal working tree è reversibile con `git checkout`.
- Nota critica: `v7/src/render.js` nasce da `cp v6/src/render.js` + catena di script. **v6 va tenuta finché la pipeline non viene risolta** (vedi §3): è l'unico punto di ripartenza della catena. v2–v5 invece non hanno alcun ruolo attivo.

**Raccomandazione**: rimuovere `v2/`, `v3/`, `v4/`, `v5/` dal working tree (`git rm -r` in un commit dedicato); tenere `v6/` **fino al punto 3** (poi rimuovere anche quella). In alternativa meno invasiva: spostarle in una cartella `_storico/` fuori dal deploy e fuori da `.gitignore`-nothing — ma su git la rimozione è già archiviazione.

### 1.2 Versione radice (`game.js`, `render.js`, `index.src.html`, `showroom*`, test radice, `HANDOFF.md`, `LEGGIMI-menu.md`) — **sì, dopo un salvataggio ragionato**

- È la prima incarnazione (isola 300×200 m, build mono-file). Il suo `HANDOFF.md` radice e `LEGGIMI-menu.md` contengono però **conoscenza storica non presente altrove** (convenzioni mappa/assi/camera, convenzioni estetiche, il «come verificare» con Playwright).
- `mappa.txt` è già rigenerato dalla mappa vera: con la mappa v7 è superato.
- I test radice (`test_combattimento`, `test_polizia`, `test_distruzione`, `test_fisica`, `test_guida`) **non girano su v7**: prima di buttarli, vedi §4.2 (portarli o archiviarli consapevolmente).

**Raccomandazione**: (a) fondere in `v7/` le convenzioni ancora valide della `HANDOFF.md` radice (molte sono già nei `HANDOFF_*` di v7 — verificare le sovrapposizioni); (b) poi `git rm` dei sorgenti radice in un commit «archivio storico». Se si vuole tenere una copia offline: `_trasferimento/` esiste già per questo uso.

### 1.3 Materiale di lavoro: `_backup_*/`, `_scambio/`, `_to_delete/`, `_trasferimento/`, `_immagini/` — **sì con cautela: verificare che non contengano pezzi unici**

Queste non sono «versioni», sono **scarti di processo** di un flusso multi-agente:

| Cartella | Contenuto | Rischio a buttare | Consiglio |
|---|---|---|---|
| `v7/_to_delete/` | file già marcati dal autore come da buttare (`index_test_*`, `v7_test.tgz`, probe) | nullo, il nome è una dichiarazione d'intento | candidata alla rimozione **immediata** (con conferma) |
| `v7/_scambio/` | 7 tarball `v7src*.tgz` usati per passare il lavoro tra agenti + `index_test.html` | basso: sono fotogrammi del passato; **verificare** che non contengano modifiche mai fuse | scompattare il più recente (`v7src_now.tgz`), diffare con `v7/src`, poi rimuovere |
| `v7/_backup_neon_modelli/` | 20 copie progressive di `render.js` pre-patch | nullo dopo il punto §3: la storia è su git e nella pipeline | tenere finché la pipeline non è «risolta», poi via |
| `v7/_backup_soldi/`, `_backup_oggetti/`, `_backup_interni/`, `_backup_mente/` | copie pre-modifica dei file patchati | nullo: le modifiche sono già fuse e i diff sono descritti nei HANDOFF | rimozione dopo verifica git |
| `_trasferimento/` | 6 archivi tgz/zip di trasporto | nullo (il repo è su GitHub) | archivio offline fuori dal repo |
| `_backup/` (radice) | 3 file «prima del menu» | nullo | come sopra |

**Attenzione a una cosa**: `api/_mente.js` di `_backup_mente/`… questi backup non vanno confusi con `_mente.js` **attivo** in `v7/api/`. Mai toccare quest'ultimo a mano: si rigenera con `strumenti_inverno/mente_vercel.py`.

> L'utente ha chiesto espressamente «non cancellare o modificare nessun file esistente, aggiungi solo». **Nessuna di queste azioni è stata eseguita.** Ogni `git rm` andrà fatto su richiesta esplicita, un commit per categoria, così ogni passo resta reversibile.

---

## 2. Priorità di consolidamento (ordine consigliato)

### P0 — Chiusura del ciclo di sviluppo (mezza giornata)

1. **Un solo posto per la verità**: dichiarare `v7/` l'unica versione attiva in `AGENTS.md` (fatto) e **rimuovere l'ambiguità della radice**: oggi `npm i three && python build.py` nella radice produce ancora `porto-vecchio.html` (una build vecchia) — chi arriva si chiede quale sia il gioco vero.
2. **`package.json` in `v7/`**: oggi la radice ha `package.json` (three 0.149) ma v7 no, pur essendo l'unica che lo userebbe per rigenerare `three.min.js`/i kit. Aggiungere `v7/package.json` minimale (script `build`, `start`, `test`) — o spostare quello radice.
3. **Ignorare i prodotti**: aggiungere `v7/index.html` a `.gitignore` **oppure** decidere il contrario (committarlo sempre aggiornato) e scriverlo in `AGENTS.md`. Oggi è committato e invecchia a ogni push dimenticato: fonte n. 1 di «schermo bianco» post-deploy.

### P1 — Sicurezza e segreti (basso sforzo, alto rendimento)

4. Verificare che nessuna chiave sia mai finita nella storia git (`git log -p | grep -i "AIza\|sk-ant\|gsk_"` su un campione; in caso, rotazione immediata — il VERCEL.md dichiara la vecchia chiave «bruciata», conviene accertarsi che sia rimossa dalla storia).
5. CORS `*` su `server.js`: accettabile in locale, **valutare** un restringimento su Vercel se il dominio è noto (il rate-limit per IP mitiga, ma l'endpoint resta pubblico di fatto).
6. I `.vercelignore`/`.gitignore` già coprono bene: nessuna azione urgente.

### P2 — Test e ripetibilità (il cuore del consolidamento)

7. **Portare i test mancanti della radice a v7** (vedi §4.2): combattimento, polizia, distruzione, fisica di guida. Sono i test del gameplay d'azione che oggi v7 non ha.
8. **Un test di fumo della build**: script che fa `python build.py`, apre `index.html` headless (Playwright già usato altrove), aspetta `window.__pv` e verifica che `G.step` giri 100 frame senza eccezioni. Cinquanta righe, elimina l'intera classe dei «deploy rotti».
9. **Fissare i semi nei CI/ready**: i test già accettano `[giorni] [seme]`: creare un `npm test` che giri `1 giorno, seme 1` di ogni test (≈2-3 minuti totali).

### P3 — Struttura del repository

10. Le rimozioni di §1, un commit per categoria, con messaggi che citino dove ritrovare il materiale (hash git / archivio offline).
11. Decidere la politica dei due remoti (`origin` fork `Jollyproxi`, `upstream` `Artismi`): il deploy Vercel segue uno solo; documentare quale in `AGENTS.md`.
12. `_immagini/` e i PNG sparsi in v7: valutare una cartella `docs/img/` unica.

---

## 3. La questione `render.js` — come uscire dalla pipeline di patch

È il **punto strutturale più delicato**: 10.160 righe generati da 105 script da applicare in ordine, con guardie. Finché resta così:

- ogni cambio grafico richiede di ricreare la catena intera (e `interni_render.py` va **rilanciato** ogni volta);
- la fusione di rami futuri sarà fragile come lo è stata l'unione (che ha richiesto 10 script di rifinitura);
- nessun agent/ collaboratore può modificare il visibile senza conoscere il rituale.

**Consigli progressivi** (dal meno al più invasivo):

a. **Congelare lo stato attuale come base**: la `main` di oggi è già il prodotto unito. Da qui in poi, i nuovi script di patch partono da **questo** render.js (non più da v6). Documentarlo in `strumenti_inverno/LEGENDA.md` (nuovo file di 20 righe: ordine ufficiale, cosa è già applicato, dove ripartire). → Con questo passo, **v6 diventa rimovibile**.
b. **Smontare la catena in una sola procedura**: uno script `build_render.py` orchestratore che applichi in ordine tutti i passi idempotenti (molti già si rieseguono senza fare nulla se il gancio c'è: `interni_render.py` lo dichiara). Da verificare script per script, ma trasforma un rituale in un comando.
c. **Medio termine — estrarre le sezioni**: `render.js` contiene subsystem riconoscibili (terreno, edifici, veicoli, effetti, post-processing, interni, distruzione). Estrarli in file separati (`src/render/`) con il marcatore di build che già esiste (`/*nome.js*/`) non richiede bundler e ridurrebbe il monolite a moduli leggibili. **Da fare solo dopo** (a) e (b), un subsystem per volta, con screenshot di confronto prima/dopo.
d. **Non fare**: rewrite del rendering. Il vincolo pixel-art e le prestazioni (1.150 draw call, 130k triangoli) sono tarate a mano: una rewrite rischia di perdere mesi di tarature.

---

## 4. Buoni cavilli specifici del codice (piccole cose concrete)

1. **`build.py` e i nomi con cifre**: la regex `/\*([a-z_.]+\.js)\*/` esclude `foo2.js`. Se un giorno serve, aggiornare la regex **e** ricontrollare che nessun marcatore collida con commenti tipo `/* nota.js */`. Aggiungere un controllo che avverta se un marcatore non viene risolto (oggi fallisce in silenzio producendo un file con `/*nome.js*/` letterale).
2. **`server.js` → due verbi per la stessa logica**: `mente_vercel.py` trasforma `handleApiMente` in `handleBody` via regex su testo. Ogni modifica di firma in `server.js` rompe lo script (l'`assert` esiste, bene). Alternativa a basso costo: estrarre il core LLM in `api/_core.js` **comune** a `server.js` (via `require`) e alle funzioni Vercel, e ridurre `mente_vercel.py` a niente. È l'unica duplicazione logica server/serverless.
3. **`file_shim.js` + gemelli `.json.js`**: convenzione insolita ma funzionante. Documentarla vicino agli asset (o in `AGENTS.md` v7, fatto) e ricordare `pack_file.py` ogni volta che si aggiunge un `.json` negli asset.
4. **`api/mente.js` limiti**: `JSON.stringify(body).length > 30000` misura la lunghezza della *stringa* dopo parse: funziona, ma il limite dichiarato «30 KB» è approssimativo — lasciare così, va bene.
5. **`main.js` ritratti `portrait()`**: bell'esempio di canvas procedurale; se serve estenderlo, attenzione che `weaponIcon` già delega a `TascheUI.icon` per gli attrezzi: mantenere la catena.
6. **`game.js` `MIN_PER_SEC = 2.5` e `START_T/END_T`**: sono i numeri del ritmo di gioco; qualsiasi «bilanciamento» parte da qui. Non toccare senza rigirare `test_vita.js`.
7. **Determinismo**: la logica usa `st.rng()` (seedato) — verificare con `grep` periodico che nessun `Math.random()` sia entrato nei file di logica (romperebbe i test ripetibili).
8. **`popolo.js` LOD**: `CFG.near/far` (52/66 m) e `maxNear` (70) sono le manopole delle prestazioni della simulazione: se un giorno il gioco rallenta in centro, sono il primo posto dove guardare.

---

## 5. Cosa sviluppare dopo il consolidamento (in ordine di valore)

Prese dai «Da fare» già scritti nei HANDOFF (nessuna invenzione nuova):

1. **Bambini** (età 6-14, scuola, giochi da cortile) — `HANDOFF_regia.md` lo chiede; tocca `popolo.js` (famiglie) e `models.js` (`dressUp` altezza).
2. **Il freddo come sesto bisogno** (stufe, carbone, vestiti che scaldano: `Oggetti.warmth` esiste già) — `HANDOFF_protagonista.md`.
3. **Le persone dentro gli interni** (`Oggetti.staffIndoor` dà già i posti; manca il disegno) — `HANDOFF_interni.md`.
4. **Scambio nello stile del menu nuovo** — `HANDOFF_menu.md`.
5. **Togliere lo Squalo dal codice** (rimane in giro come «Sandro Neri») — `HANDOFF_fazioni.md`.
6. **Acqua e aria unica** (riflessi sulla riva, le quattro nebbie guidate dal meteo) — `HANDOFF_ambiente.md`.
7. **Tarare l'IA sulla schermata vera**: i HANDOFF ripetono «da provare con chiave vera su browser vero»: 1 chiamata ogni 40 s di regia + notte dei gruppi è il budget da validare.

---

## 6. Checklist finale di consolidamento (riassunto esecutivo)

- [ ] P0: `AGENTS.md` gerarchici a posto (fatto in questa sessione) + `package.json` in v7 + decisione su `index.html` committato o ignorato
- [ ] P1: audit chiavi nella storia git
- [ ] P2: test di fumo build (Playwright, 100 frame) + `npm test` unico
- [ ] P2: portare i test d'azione della radice a v7 **oppure** archiviarli consapevolmente
- [ ] P3: rimozione `v2/`–`v5/` (dopo commit dedicato, con conferma)
- [ ] P3: `LEGENDA.md` in `strumenti_inverno/` + render.js base dichiarata = main attuale → poi rimozione `v6/`
- [ ] P3: verifica-diff di `_scambio/v7src_now.tgz` contro `v7/src`, poi svuotamento
- [ ] P3: rimozione `_to_delete/`, `_backup_*`, `_trasferimento/` (con conferma)
- [ ] P4 (dopo): orchestratore `build_render.py`, poi estrazione modulare un subsystem alla volta
- [ ] P5: riprendere lo sviluppo dalla lista §5

*Ogni voce con cancellazione o commit va confermata dall'utente prima dell'esecuzione: in questa sessione non è stato toccato alcun file esistente.*
