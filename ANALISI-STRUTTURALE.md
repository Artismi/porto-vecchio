# Porto Vecchio — Analisi tecnica e strutturale dell'applicativo

*Data: 6 ottobre 2026 · Ambito: intera cartella di lavoro `porto-vecchio/` · Versione corrente: **v7** (ramo git `main`, commit `ea3d843`)*

Questa relazione descrive **cosa è** l'applicativo, **come è fatto** (architettura, moduli, flussi), **come si costruisce e si esegue**, e **come è evoluto** attraverso le versioni v2→v7. Non modifica alcun file: è un documento di lettura. Per i consigli operativi (consolidamento, cosa eliminare, priorità) vedi [CONSIGLI-IMPLEMENTATIVI.md](CONSIGLI-IMPLEMENTATIVI.md).

---

## 1. Che cos'è Porto Vecchio

**Porto Vecchio** è un **gioco browser-based open-world 2.5D/3D** in JavaScript vanilla (nessun framework), ambientato su un'isola del Tirreno nel **1986**, sotto un regime autoritario («la Tutela», i Grigi, il Garante). Il giocatore è **Nino**, un debitorio dello Squalo che ha 500.000 lire da restituire entro l'alba di giovedì.

Il cuore distintivo del progetto non è il gameplay d'azione (pure presente: armi, guida, fisica, distruzione), bensì la **simulazione sociale profonda**:

- **~453 abitanti simulati** con casa, mestiere, famiglia, bisogni, interessi, progetti, diario, memoria;
- un'**IA linguistica server-side** («la Mente») che dà voce e pensieri agli NPC tramite LLM (Gemini/Anthropic/Groq/OpenRouter), con fallback deterministico offline;
- un'**economia chiusa** dove ogni lira sta in un posto verificabile (portafogli, conti, caveau, portavalori);
- fazioni persistenti (la Famiglia, la Risacca, la Tutela) con proprie agende.

Stile visivo: pixel art isometrica con Three.js r149, atmosfera «inizio autunno» post-unione dei rami di sviluppo (meteo, HDR, bloom, ACES, profondità di campo), città «del regime» con murales e propaganda.

---

## 2. Mappa del repository (stato attuale)

````
porto-vecchio/                     ← repository git (remoto: Jollyproxi/porto-vecchio, upstream: Artismi/porto-vecchio)
│
│  ── Solo documentazione (le versioni storiche sono archivio in git) ─
├─ AGENTS.md, ANALISI-STRUTTURALE.md, CONSIGLI-IMPLEMENTATIVI.md
│
│  ── Versione CORRENTE v7 «Inverno/Unione» ────────────────────────
└─ v7/
   ├─ index.html                ← build completa (~3,9 MB, ricomposta da build.py)
   ├─ build.py                  ← concatena i 39 sorgenti di src/ dentro index.src.html
   ├─ server.js                 ← server locale Node (porta 8642) + proxy IA «la Mente»
   ├─ AVVIA.bat / server.ps1    ← avvio con un doppio clic (Windows)
   ├─ api_key.esempio.json      ← modello della configurazione chiavi (api_key.json è git-ignored)
   ├─ vercel.json, .vercelignore, VERCEL.md ← deploy serverless
   ├─ test_mente.mjs            ← prova manuale dell'endpoint /api/mente
   ├─ studio_anim.html, studio_oggetti.html ← pagine di studio isolate (pose, modelli)
   ├─ prova_azioni.txt, prova_economia.txt  ← output di esempio dei test
   ├─ api/                      ← funzioni Vercel: mente.js, status.js, test.js, _mente.js (generato)
   ├─ assets/ (304 file)        ← kit di modelli glTF-JSON: mc/ (persone), mf/ (mobili), mj/ (varie), mk/ (kit modulari)
   ├─ src/ (53 file .js, ~3,9 MB) ← i sorgenti veri + i test (vedi §4)
   ├─ strumenti_inverno/ (105 file + LEGENDA.md) ← script Python/JS che «patchano» render.js a catena
   ├─ _immagini/                ← screenshot di riferimento
````

La versione radice storica («isola», build mono-file, i test d'azione, `api/`, `vercel.json`) e le snapshot `v2/`–`v6/` sono state **rimosse dal working tree il 6–7/10/2026** con commit dedicati: la loro storia resta in git (`git log --diff-filter=D`). I test d'azione della radice sono **portati a v7** in `v7/src/`.

Il repository git è **pulito** (nessuna modifica pendente) e sincronizzato con `origin/main` (con commit locali in più del 6–7/10/2026: documentazione, test portati e rimozioni d'archivio). `v7/index.html` è **git-ignored** e viene rigenerato sia in locale (`build.py`) sia su Vercel (`buildCommand` in `vercel.json`).

---

## 3. Architettura generale

### 3.1 Principi

| Principio | Realizzazione |
|---|---|
| **Niente bundler, niente framework** | JS vanilla con IIFE che definiscono globali (`var Game`, `var Render`, `var Popolo`…). Three.js r149 e il loader glTF sono **vendored** in `src/three.min.js` e `src/gltf_loader.js`. |
| **Logica e grafica separate** | I moduli «solo logica» (`game.js`, `world.js`, `popolo.js`, `risacca.js`, `azioni.js`, `economia.js`, `fazioni.js`, `soldi.js`, `oggetti.js`, `mestieri.js`, `protagonista.js`, `livelli.js`, `paesaggio.js`, `coro.js`) girano **anche in Node** senza DOM: `typeof module !== 'undefined'` attiva `module.exports`, `typeof World !== 'undefined'` sceglie il require. È la base dei test `test_*.js`. |
| **Estensione a hook, non a patch** | `game.js` espone `Game.HOOKS` (`create`, `step`, `think`, `move`, `verb`, `jailed`, `indoor`, `playerWeapon`, `fire`, `hit`). Ogni modulo si aggancia **concatenando** l'hook precedente: `const prev = G.HOOKS.step; G.HOOKS.step = (st,dt) => { prev?.(st,dt); myStep(st,dt); }`. In questo ordine si registrano: Risacca, Popolo, Livelli, Guardaroba, Regia, Cantiere. |
| **La chiave API non tocca mai il browser** | Il client chiama sempre `/api/mente` (stesso percorso in locale con `server.js` e su Vercel con le funzioni in `api/`). La chiave sta in `v7/api_key.json` (git-ignored) o in variabili d'ambiente su Vercel. |
| **Il gioco degrada con grazia** | Senza chiave, senza Node, senza rete: il motore deterministico regge tutto il mondo; la Mente semplicemente risponde `fallback`. |

### 3.2 Il ciclo di build

`v7/build.py` (10 righe): legge `src/index.src.html` e sostituisce ogni marcatore `/*nome.js*/` con il contenuto di `src/nome.js` via regex `/\*([a-z_.]+\.js)\*/`. Scrive `index.html` (~3,9 MB). Nessuna minificazione, nessuna dipendenza npm. **Nota tecnica importante**: la regex esclude i nomi di file con cifre, quindi `build.py` non includerebbe file tipo `foo2.js` (menzionato esplicitamente in HANDOFF_menu.md per `vestiario.js`).

L'ordine di caricamento (39 `<script>` in `index.src.html`, righe 281-320) è **fisso e significativo** — i moduli di logica si agganciano a `Game.HOOKS` in sequenza:

```
file_shim → three.min → gltf_loader →
animazioni → anim_vita → anim_lotta →
models → kit → world → interiors → game → risacca → popolo → azioni →
economia → fazioni → soldi → oggetti → guardaroba → protagonista → mestieri →
paesaggio → livelli → render → audio → coro → mente → regia → main →
risacca_ui → tasche_ui → soldi_ui → oggetti_ui → bottino → vestiario →
pezzi → cantiere → menu_ui → interni_arte → protagonista_ui
```

### 3.3 Il ciclo di runtime (main.js)

Il `loop` in `main.js` (riga 583) è il battito del gioco:

1. `dt = min(.05, raw)`; ogni frame a `requestAnimationFrame`.
2. Pausa se `ui.dialog || ui.book || ui.over` (o menu non «lento»); col menu aperto in strada il mondo va a **¼ velocità** (`ui.menuSlow`).
3. `G.fire(...)` se il puntatore è premuto; `tickClick()` per il punta-e-clicca.
4. `G.step(st, dt, inp)` → tutto il motore (vedi §4.1).
5. `R.hits` (oggetti travolti segnalati dalla grafica) → `G.propHit` (unico flusso grafica→logica).
6. `R.frame(st, dt, {...})` → tutto il disegno.
7. HUD ogni 0,1 s; minimappa; `sounds()`.
8. Benchmark implicito: dopo 90 frame, se il frame medio superza 1/32 s, scatta `R.lowQuality()` (ombra off, `TARGET` 330).

Il loop espone `window.__pv = { st, ui, G, R, input, keys, mouse, click, pickAt }` — usato dai test Playwright e dagli strumenti di debug.

Avvio: `Kit.load('assets/mk/', [...])` carica i kit GLB (timeout 45 s) **prima** di costruire la scena; poi `R.init(cv, st)`, resize observer, loop.

---

## 4. I moduli di `v7/src/` — catalogo ragionato

Dimensioni in righe (approssimative, fonti: analisi dei file).

### 4.1 Motore puro (testabile in Node)

| Modulo | Righe | Ruolo |
|---|---|---|
| `game.js` | 2.130 | Il cuore: mappa (`MAP` copiata da `World` con `restoreMap` per azzerare la distruzione), pathfinding A*, armi/combattimento, veicoli con fisica SAT (`vehicleMotion`, `collideVehicles`), polizia e rinforzi, NPC «core» (cast, passanti, memoria `n.mem`, opinioni `n.op`), eventi (`st.events`), gossip, `step()`, `create(seed)`, `HOOKS`. Orario: `MIN_PER_SEC = 2.5` (1 s reale = 2,5 min di gioco). |
| `world.js` | 1.405 | Genera l'isola v7 (680×280 m, 340×140 caselle da 2 m) da seme deterministico: costa, dorsale «Monte Scuro» (quota fino a 30 m, `HILLS`, `monte()`), zone (prateria→foresta→periferie→centro→Muro→Base→porto cargo), strade, 148 edifici, 115 luoghi, alberi-casella. **Tutti gli id di v6 sono conservati** (gli altri moduli li usano). |
| `popolo.js` | 1.583 | La popolazione: famiglie dalle case, mestieri, calendario ricorrente (mercato, paga, Bollettino, Ora Quieta), bisogni, interessi (16), memoria/diario (30 ricordi), progetti (`PROJ`), giornate a blocchi, malavita (`GIRI`), simmetria rabbia→scritta. Simulazione a **due livelli** (near 52 m / far 66 m, tetto 70 NPC pieni): ~0,64 ms per passo con 453 abitanti (misurato in questa analisi con `test_vita.js 1 1`). |
| `risacca.js` | 1.593 | La banda della resistenza: risorse (`RES`), spazi nascosti, compiti/lavori, morale/repressione, chat libera con il LLM mediata da catalogo verbi, `EXT` (punti di aggancio per fazioni/soldi/oggetti), `CARDS` (schede personaggio per la chat). |
| `azioni.js` | 1.201 | Il «middleware» comportamentale: fatti del mondo (`SOFT`, `HIDDEN`, `PHONES`), verbi base (uccidere, litigare, scavare, nascondere, telefonare…), piani d'emergenza multi-passo, imprevisti e reazioni degli NPC. Espone `intend()` / `startPlan()` usati anche da `regia.js` (l'IA dirige, il motore esegue). |
| `oggetti.js` | 1.804 | Il **catalogo unico** (374 oggetti con prezzo e peso), botteghe (`SHOPLIST`), postazioni di lavoro, 142 ricette (cucina/fabbricare/smontare/raccogliere), frugare (case, botteghe, bagagliai, ~290 nascondigli che si ricaricano), scambio, costruzione, indumenti (`ADDOSSO`), calore/sete. |
| `economia.js` | 312 | Merci (~55), produzione per mestiere (`PROD`), consegne, Emporio Imperiale e nave del regime, prezzi a scarsità. |
| `fazioni.js` | 617 | Famiglia (capo invisible, 3 fidati, soldati, aiutanti temporanei, riciclaggio con lavanderia/sala giochi, ispezioni) e teti della Risacca (15 membri, collaboratori, cellule autonome). |
| `soldi.js` | 796 | Ogni lira in un posto: conti, bancomat, portavalori, decima, pizzo, azzardo. `bankCheck()` verifica il quadratura contabile a ogni test. |
| `mestieri.js` | 363 | 45 azioni professionali (`AB`) mappate su 94 mestieri: chi lavora in un posto ha le chiavi, di notte può fare cose «di mestiere». |
| `protagonista.js` | 374 | Casa, tre amici, lavoro dipendente, affitto, bisogni/vizi di Nino, warp del tempo (dormire/lavorare accelera il gioco). |
| `mente.js` | 233 | Client della Mente: chiama `/api/mente` con `kind` (dialogo/riflessione/gruppo/chiacchiera/regia); rate-limit lato client; **la chat del giocatore passa davanti** a tutto il background (finché chatta, e 25 s dopo, la regia non parte). |
| `regia.js` | 130 | Due strati: le auto hanno un padrone (assegnate all'avvio entro 45 m) e chi deve andare lontano le prende; ogni 40 s reali l'IA guarda la scena (≤6 persone entro 34 m) e propone 1-3 azioni tra i verbi del motore — id inventati scartati. |
| `coro.js` | 229 | IA «per gruppi» (economia di quota): caselle sintetiche, ~94 gruppi di affinità, voci che passano senza LLM, una chiamata per i 6 gruppi più caldi a mezzanotte. |
| `livelli.js` | 256 | Sottosuolo: `st.player.lv`, botole, cunicoli, stanze, grotte naturali, Ponte del Diavolo. |
| `paesaggio.js` | 33 | Abbattere alberi (ascia/sega), legna. |

### 4.2 Grafica (solo browser)

| Modulo | Righe | Ruolo |
|---|---|---|
| `render.js` | **10.160** | Tutto il visibile: terreno a settori, mare/cielo/sole, edifici a moduli Kenney, arredi, armi, veicoli con danni progressivi, effetti, distruzione/vetrine, interni (`InterniArte`), luci (14 PointLight dinamiche su ~160 sorgenti), post-processing HDR/bloom/ACES/DoF/grana/metto, `lowQuality()`. **Non si modifica a mano**: si patcha con la catena di script (§5). |
| `models.js` | 410 | Modelli esterni (Race kit, mobili Kenney) da `assets/`; `Models.person` con vestiti/armi agganciate all'osso `Index1R`. |
| `kit.js` | 110 | Kit modulari edilizi (`assets/mk`) per edifici sulla griglia di 2 m. |
| `interiors.js` | 785 | Piante interne per piano (fino a 7), programmi per attività, arredo (tabelle `R`, `V`), scale. |
| `interni_arte.js` | 565 | Grafica degli interni: pavimenti/pareti per stanza, ~120 oggetti `ia_*` fatti a mano. |
| `animazioni.js` + `anim_vita.js` + `anim_lotta.js` | 322+639+577 | Motore di pose procedurali su ossa: ~40 pose di vita, pose di lotta/stati (ubriaco, ferito, paura), portamento legato al carattere. |
| `vestiario.js` | 295 | Vestiti come gusci ricavati dal corpo, legati allo scheletro. |
| `pezzi.js` | 115 | Libreria pezzi dei covi (pallet, casse, generatori…). |
| `bottino.js` | 236 | Oggetti 3D cliccabili da frugare sparsi per l'isola. |
| `audio.js` | 102 | Sintesi WebAudio: motore, sirena, mare, pioggia, stridio. |
| `gltf_loader.js` / `three.min.js` | 4.315 / — | Vendored. |
| `file_shim.js` | 18 | Permette l'apertura via `file://`: intercetta `fetch` dei `.json` e serve i gemelli `.json.js` (generati da `strumenti_inverno/pack_file.py`). |

### 4.3 Interfaccia

| Modulo | Righe | Ruolo |
|---|---|---|
| `main.js` | 617 | Bootstrap, loop, input (tastiera/puntatore/touch), HUD, ritratti pixel art 16×16, dialoghi, taccuino, punta-e-clicca. |
| `menu_ui.js` | 865 | Il «Menu a valigetta»: Roba (zaino), Chi è, Banco, Lavori, Qui; icone pixel per 374 oggetti; anteprime 3D e ritratti. |
| `risacca_ui.js` | 560 | Pannello/chat della Risacca, etichette 3D. |
| `tasche_ui.js` / `oggetti_ui.js` / `soldi_ui.js` / `protagonista_ui.js` | 221/219/230/50 | Tasche a tutto schermo, banchi/frugare/scambio, portafoglio/bancomat/azzardo, barre bisogni. |
| `cantiere.js` | 533 | Costruzione del covo stile Fallout 4: terreno, sottoterra (usa `livelli.js`), strutture, arredi, postazioni, difese; sagoma verde/rossa, rotazione, spostamento. |

### 4.4 Test (eseguibili con Node dalla cartella `src/`)

`test_vita.js`, `test_azioni.js`, `test_coro.js`, `test_economia.js`, `test_fazioni.js`, `test_livelli.js`, `test_oggetti.js`, `test_soldi.js` — tutti con firma `node test_X.js [giorni] [seme]`. **Verificati in questa analisi**: `test_vita.js 1 1` (17.293 passi, 0,64 ms/passi, 453 abitanti) e `test_azioni.js 1 1` girano senza errori. A livello `v7/` esiste anche `test_mente.mjs` che prova `POST /api/mente` con il server acceso.

---

## 5. `strumenti_inverno/` — la catena di patch di `render.js`

**Fatto cruciale per chi lavora sul progetto**: `render.js` (10.160 righe) non si modifica direttamente. È il prodotto di una **catena di 105 script** Python/JS applicati in ordine, ciascuno con «guardia» (si ferma se non trova il pezzo che deve sostituire):

```
inverno_render.py → … → inverno_render38.py   (atmosfera, facciate, marciapiedi, neve→pioggia, isola38)
monte_render.py                                (entroterra, sottosuolo)
strade_render1.py, verde_render1.py, case_render1.py, luci_regia*.py
interni_render.py                              (ganci interni: VA RILANCIATO se render.js è rigenerato)
ambiente1.py, ambiente2.py, ambiente3.py        (meteo, camera HDR/ACES, si applicano per ULTIMI)
muri_vivi1.py                                   (murales, manifesti)
unione1.py … unione10.py                        (rifiniture post-unione dei rami)
```

Complementari: `mente_vercel.py` **rigenera** `api/_mente.js` da `server.js` (da rilanciare a ogni modifica di server.js — il file dichiara «NON modificare a mano»); `pack_file.py` crea i gemelli `.json.js`; `glb2json.mjs`/`pack_kit.mjs`/`pack_natura.mjs` (in `src/`) rigenerano gli asset.

Questa pipeline è la **conseguenza diretta** del flusso di lavoro storico: il progetto è stato sviluppato da più «agenti»/rami in parallelo, poi fusi (vedi `HANDOFF_unione.md`: i rami `nice-pasteur`, `friendly-wright`, `clever-knuth`, `bold-clarke`, `determined-edison`, `confident-heisenberg`, `jolly-curie` sono tutti antenati di `main`).

---

## 6. Il server e la Mente (l'IA)

### 6.1 `server.js` (locale, porta 8642)

Server HTTP zero-dipendenze (Node 18+) che: serve i file statici con MIME map e protezione path-traversal, e fa da **proxy LLM**. Configurazione da `api_key.json` (git-ignored) o variabili d'ambiente.

- **Provider** auto-riconosciuti dal prefisso chiave: `sk-ant-` (Anthropic), `AIza`/`AQ.` (Gemini), `gsk_` (Groq), `sk-or-` (OpenRouter); liste di modelli con fallback progressivo e memoria del «modello che funziona».
- **Tre canali** con chiave e quota separate: `chat` (dialogo col giocatore), `mente` (notte dei gruppi), `eventi` (chiacchiere/regia). Una chiave finita scade in un fallback sulle altre (`callLLM`, logica `[unione9]`).
- **Freni**: RPM 8 (4 per il background), cooldown per modello su 429/503 con `pauseFor()` dal `retryDelay`, `MENTE_PER_MINUTO` per IP.
- **Endpoint**: `POST /api/mente` (kind: dialogo/riflessione/gruppo/chiacchiera/regia), `GET /api/status`, `GET /api/test`. CORS aperto (`*`), body limit 30 KB.
- Prompt di sistema «Porto Vecchio 1986» con regola suprema: *«non inventare oggetti, luoghi, persone o fatti non presenti nel contesto. La simulazione governa la realtà, tu dai solo voce e pensieri»* + risposta SOLO JSON.

### 6.2 `api/` (Vercel)

Stessa logica in forma **serverless**: `_mente.js` è **generato** da `strumenti_inverno/mente_vercel.py` (trasforma `handleApiMente(req,res)` in `handleBody(body)` e legge la config da `process.env`). `mente.js` aggiunge il rate-limit per IP con la chat conteggiata a parte (`:chat`), `status.js` e `test.js` sono wrapper. Deploy: Root Directory `v7`, framework «Other», chiave in `GEMINI_API_KEY` (vedi `VERCEL.md`).

### 6.3 Contratto client↔server

Il client (`mente.js`) non dipende da dove gira il codice: chiama `/api/mente`. Ogni risposta è `{ ok, source: 'ai'|'fallback', data, error }`; `data` null → il motore decide da solo. Questo rende il gioco **interamente giocabile a costo zero** e la Mente un **enhancement** progressivo.

---

## 7. Come si esegue

| Modalità | Comando | Note |
|---|---|---|
| **Locale con IA** | doppio clic `v7/AVVIA.bat` (o `node server.js` in `v7/`) | apre `http://localhost:8642`; richiede `api_key.json` (copia da `api_key.esempio.json`) |
| **Locale senza Node** | aprire `v7/index.html` nel browser | funziona tutto tranne la Mente (e `file_shim.js` serve i JSON via `.json.js`) |
| **Build** | `python build.py` in `v7/` | rigenera `index.html` dai sorgenti |
| **Test logica** | `node src/test_vita.js [giorni] [seme]` ecc. | dalla cartella `v7/` (o `v7/src/`) |
| **Online** | push su `main` → Vercel ridistribuisce | vedi `VERCEL.md` |
| **Versione radice (archiviata il 7/10/2026)** | ~~`npm i three@0.149.0 && python build.py`~~ | flusso rimosso dal working tree: recuperabile dalla storia git |

---

## 8. Evoluzione v2 → v7 (perché esistono le copie)

Le cartelle `v2`–`v6` sono **snapshot progressivi** lasciati sul posto come riferimento; il flusso documentato nei vari `HANDOFF_*.md` è «base: vN, lavoro su vN+1»:

| Versione | File .js in `src/` | Novità rispetto alla precedente |
|---|---|---|
| v2 | 13 | città, Risacca, popolo, UI base |
| v3 | 13 | identica a v2 (rifiniture interne) |
| v4 | 14 | + `test_vita.js` (prova della Vita) |
| v5 | 16 | + `azioni.js` (imprevisti, piani) |
| v6 | 19 | + `economia.js`, `tasche_ui.js`, `test_economia.js` |
| **v7** | **48** | mappa nuova (Monte Scuro), fazioni, soldi, oggetti, mestieri, protagonista, regia, coro, livelli, cantiere, menu, interni rifatti, animazioni, ambiente, **unione di 8 rami** |

La versione **radice** era ancora più vecchia: la prima incarnazione «isola 300×200 m» con build a 3 sorgenti e i test di combattimento/polizia/distruzione/fisica/guida. **Il 7/10/2026 i cinque test d'azione sono stati portati a v7** (vedi [`v7/src/HANDOFF_test_azioni.md`](v7/src/HANDOFF_test_azioni.md)).

La duplicazione era **storica e deliberata** (snapshot di sicurezza in un flusso multi-agente senza fiducia totale nel git). Con il git pulito e sincronizzato, il 6–7/10/2026 le copie sono state rimosse dal working tree con commit dedicati: v7 resta **l'unica versione viva** (proposta e decisioni in [CONSIGLI-IMPLEMENTATIVI.md](CONSIGLI-IMPLEMENTATIVI.md)).

---

## 9. Punti di forza osservati

1. **Separazione logica/grafica reale e verificata** — i moduli di logica girano in Node senza browser; i test lo dimostrano.
2. **Sistema di hook pulito** — ogni modulo è opzionale e componibile; `regia.js` si aggiunge senza toccare nulla di esistente.
3. **Economia verificabile** — `bankCheck()` come invariante testabile è una rarità nei progetti hobby.
4. **Degrado elegante dell'IA** — fallback a ogni livello (chiave assente, quota, 429, JSON non valido, rete), il gioco non si blocca mai.
5. **Sicurezza della chiave ben gestita** — `.gitignore`, `.vercelignore`, chiave mai nel client, prompt injection mitigata dal vincolo «non inventare nulla fuori dal contesto» e dai verbi chiusi del motore.
6. **Documentazione eccezionale** — 18 `HANDOFF_*.md` in `v7/src/` quasi sempre aggiornati con file toccati, prove e «da fare».

## 10. Rischi e punti deboli

1. **`render.js` non è manutenibile a mano** (10.160 righe, modificabile solo tramite 105 script): ogni intervento visivo richiede la catena giusta o rischia di rompere le guardie.
2. **Duplicazione storica**: al 6/10/2026 mattina c'erano v2–v6, versione radice, 6 cartelle `_backup_*`, `_scambio`, `_to_delete`, `_trasferimento` (~10 copie parziali). **Risolto il 6–7/10/2026**: tutto l'archivio è stato rimosso dal working tree con commit dedicati (storia in git); i test d'azione della radice sono stati portati a v7.
3. **Il test della radice e quello di v7 sono disallineati**: ~~risolto il 7/10/2026~~ — i cinque test d'azione sono ora portati e girano su v7 (`v7/src/test_{combattimento,polizia,fisica,guida,distruzione}.js`).
4. ~~**`index.html` (3,9 MB) è generato ma committuto**~~ — risolto il 6/10/2026: git-ignored e rigenerato dal `buildCommand` di Vercel.
5. **Nessun test della grafica automatizzato nel repo corrente** (gli screenshot Playwright della radice non sono portati a v7; `strumenti_inverno/shot_gioco.js` esiste ma non è cablato a CI).
6. **Regex di build che esclude i nomi con cifre** — vincolo implicito e non documentato che può sorprendere.
7. **Dipendenza implicita da Python per il build** (per chi lavora solo in Node) e da un `.json.js` gemello per il `file://`.
8. **Git con due remoti** (origin fork `Jollyproxi`, upstream `Artismi`): il deploy Vercel segue uno dei due; da tenere presente in fase di consolidamento.

---

## 11. Glossario rapido (per orientarsi nei nomi interni)

| Termine | Significato |
|---|---|
| **Mente** | il sottosistema LLM server-side che dà voce agli NPC |
| **Coro** | IA per gruppi di affinità (una chiamata per gruppo, non per persona) |
| **Regia** | IA-regista che fa accadere micro-eventi vicino al giocatore |
| **Risacca** | la banda della resistenza (fazione del giocatore) |
| **Famiglia** | la mafia locale (capo, fidati, soldati, riciclaggio) |
| **Grigi / Tutela** | la polizia del regime |
| **HOOKS** | sistema di aggancio dei moduli al motore (`Game.HOOKS`) |
| **near/far** | i due livelli di dettaglio della simulazione sociale (52/66 m) |
| **Ora Quieta** | coprifuoco notturno del mondo di gioco |
| **`__pv`** | handle globale di debug/test esposto da `main.js` |
| **guardia** | controllo di esistenza del pezzo da sostituire negli script `strumenti_inverno` |

---

*Documento scritto da GitHub Copilot su richiesta; analisi condotta leggendo i sorgenti, i HANDOFF e i test, ed eseguendo i test Node disponibili. Nessun file esistente è stato modificato.*
