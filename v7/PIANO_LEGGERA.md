# Porto Vecchio — Piano per la versione leggera (18 ottobre)

Obiettivo: una versione che giri fluida nel browser, con meno abitanti ma raccolti attorno al giocatore, e con
inventario, crafting, scavi, bunker e costruzioni (dentro e fuori) completi, coerenti e comodi da usare.
Prima si pulisce e si misura, poi si completa. Niente sistemi nuovi finché quelli esistenti non sono finiti.

---

## 0. Da dove partiamo (misurato il 18/10 su `v7`)

| Cosa | Oggi | Nota |
| --- | --- | --- |
| `index.html` | 6,7 MB, 72 moduli incollati | `writer_mano.js` e `writer_arte.js` incollati **due volte** (una per il worker) |
| `render.js` | 1,4 MB in un file solo | grafica di tutto, anche di sistemi che la versione leggera non usa |
| `assets/` | 79 MB | ogni modello c'è **due volte** (`.json` e `.json.js`, ~39 MB doppi); glTF in base64 (+33%) |
| Personaggi (`assets/mc`) | 8 file da ~2 MB | stesso scheletro ripetuto in ogni file |
| Mondo | 1300 × 400 m, 650 × 200 caselle | |
| Abitanti | `CFG.max = 420`, `maxNear = 70` (`popolo.js`) | case scelte **a caso su tutta l'isola** (ordinate per hash, non per distanza) |
| Interfacce dello zaino | 3: `menu_ui.js`, `oggetti_ui.js`, `tasche_ui.js` | tutte caricate, con tasti propri (I, Z, K, U, L) |
| Ascoltatori della tastiera | 16 `keydown` in 12 file | conflitti (vedi §6) |
| Cartelle di scarto | `_to_delete` 23 MB, `_scambio` 17 MB, `_immagini` 33 MB, backup ~19 MB, `v2`…`v6` ~175 MB | nel repository, non nel gioco |
| Prove | `test_sottosuolo`, `test_oggetti` passano; **`test_cantiere` fallisce** («il garage è finito»: la banda non trova dove posarlo, poi errore su `gar.x`) | |

Dai passaggi di consegne restano aperti, fra gli altri: persone dentro gli interni non disegnate, NPC che non usano
ponti e cunicoli, guardie che non trovano le botole, scambio nello stile nuovo, vetrine che si rifanno solo rientrando,
zoom col pizzico sul telefono, sinistro con l'arma in mano che cammina invece di sparare.

---

## 1. Obiettivi misurabili

- **Caricamento**: download compresso ≤ 15 MB, gioco giocabile in ≤ 8 s su una connessione normale, ≤ 4 s dalla cache.
- **Fluidità**: 60 fps su un portatile medio con scheda integrata, 30 fps stabili su un telefono di fascia media;
  fotogramma peggiore ≤ 33 ms durante il gioco normale (camminare, entrare in casa, scendere sotto terra, costruire).
- **Memoria**: ≤ 600 MB di heap JS + GPU sul PC, ≤ 350 MB sul telefono.
- **Logica**: ≤ 4 ms per passo con tutti gli abitanti (oggi 3 ms con 569 in Node: c'è margine, il peso è il disegno).
- Ogni misura si legge da F3 (`?perf`) e si scrive in fondo a questo file a ogni fase.

---

## 2. La versione leggera: build, asset, moduli

### 2.1 Una build sola con due profili
- `build.py` produce `index.html` (completa) e **`leggera.html`**: stesso codice, `window.PV_LEGGERA = true`, e una
  lista di moduli esclusi (`SOLO_COMPLETA`), come si fa già per `studio.js` con `SOLO_STUDIO`.
- Il profilo grafico `?leggera` (già in `render.js`: 2 faretti senza ombra, 3 luci puntiformi, ombra 1024, niente
  bagliore) diventa il predefinito di `leggera.html`, con `?alta` per spegnerlo.
- Il worker dei graffiti non incolla più i sorgenti una seconda volta: li legge dallo stesso `<script>` (un solo
  `textContent`), risparmio ~260 KB.

### 2.2 Asset
1. **Via i doppioni**: il gioco servito via http usa i `.json`; i `.json.js` servono solo a `file://`
   (`file_shim.js`). Nella versione leggera non si pubblicano; si rigenerano solo per chi apre il file in locale.
2. **Da base64 a GLB binario** (`strumenti_inverno/pack_file.py` → nuovo `pack_glb.py`): −33% subito, e il parsing non
   passa più da `atob` (oggi `kit.js` decodifica a mano ogni buffer nel thread principale).
3. **Compressione delle geometrie** (meshopt, decodificatore ~20 KB) e texture a 512 px max per i mobili `mf`.
4. **Personaggi**: un solo scheletro con le animazioni (`mc/base.glb`) e gli 8 corpi come mesh senza animazioni
   (oggi ognuno porta le sue): da ~16 MB a ~4 MB.
5. **Kit a richiesta**: `main.js` aspetta 13 kit prima della scena (`Kit.load([...])`, con un tetto di 45 s).
   Si caricano prima `urbano`, `casa`, `natura`; `stazione`, `garage`, `arcade`, `tortura`, `train`, `grave` quando il
   giocatore si avvicina (o entra) dove servono.
6. Le immagini decodificate con `createImageBitmap` in un worker; niente decodifica nel fotogramma.

### 2.3 Moduli: cosa resta fuori dalla leggera
Restano fuori (o si caricano solo a richiesta): `studio.js`, `editor.js`, `misura.js` (solo con `?perf`),
`mente.js` (IA, solo con chiave), i sistemi d'ambiente pesanti del pacchetto inverno se non servono alla stagione.
Tutti gli altri restano: la leggerezza viene dal disegno e dagli asset, non dal togliere gioco.

### 2.4 Pulizia del repository (non tocca il gioco)
- Spostare `v2`…`v6`, `_to_delete`, `_scambio`, `_backup_*`, `_immagini`, `menu-zaino-personaggio.zip`,
  `porto-vecchio.html` vecchio in un ramo d'archivio (`archivio`) e toglierli da `main`. La storia git li conserva.
- `index.html` ed `editor.html` generati: fuori dal repository (si fanno con `build.py` e su Vercel in fase di build),
  così le unioni non hanno più conflitti su 6,7 MB di testo.
- I 41 `HANDOFF_*.md` restano, ma si aggiunge `src/INDICE.md`: un rigo per modulo (cosa fa, da chi dipende, prove).

---

## 3. Gli abitanti: meno, ma attorno a te

Oggi `populate()` (`popolo.js` ~r. 299) ordina le case per hash e riempie fino a 420: la gente è sparsa su 1300 m e
attorno al giocatore ce n'è poca. Proposta:

1. **Totale**: `CFG.max` da 420 a **180** nella leggera (220 nella completa). `maxNear` da 70 a **40**.
2. **Case in ordine di distanza dalla casa del giocatore** (`playerHome` di `protagonista.js`), con un peso per
   quartiere:
   - il quartiere del giocatore e quelli confinanti (raggio ~250 m) prendono il **70%** degli abitanti, le case piene;
   - il resto dell'isola il 30%: una famiglia per casa al massimo, botteghe con un commesso solo;
   - campagna e monte: solo chi ci lavora (contadini, pastori, minatore, carbonaio) e i bivacchi.
3. **I posti di lavoro seguono la gente**: le botteghe lontane senza nessuno vicino aprono con un solo commesso
   (le catene di `JOBPROD`/`ESSENTIAL` restano coperte: prima i mestieri essenziali, come oggi).
4. **Comparse leggere fuori dalla bolla**: chi è lontano non ha modello; se il giocatore si sposta in un quartiere
   vuoto, la regia (`eventi.js`) fa «uscire dalla porta» gente già esistente invece di inventarne.
5. **La densità si vede**: in strada vicino a casa 15-25 persone a schermo; nei quartieri lontani 3-8.
6. **Quando il giocatore cambia casa o covo**, la popolazione non si rigenera (resterebbero le memorie): si alza solo la
   frequenza con cui la gente lontana ha commissioni nel nuovo quartiere.
7. Prova: nuovo `test_popolo.js` (distribuzione per distanza, mestieri essenziali coperti, nessuna casa del giocatore
   occupata), più `test_vita`, `test_economia`, `test_soldi` brevi per vedere che l'economia regge con 180.

---

## 4. Fluidità

Dalle misure di `HANDOFF_fluido2.md` il peso è il disegno e il lavoro che parte quando qualcosa entra nel raggio.
Già fatto: bolla, costruzioni a budget, vestire a rate, blocchi a fasi, BVH, ombre a richiesta. Da fare:

1. **Personaggi**: ~40 mesh l'uno. Fondere le parti statiche di ogni capo in una mesh per materiale (`vestiario.js`):
   obiettivo ≤ 8 disegni a persona. Lontani (> 30 m) con un impostore animato a 8 direzioni, o il corpo senza capi.
2. **Interni**: fondere le geometrie per stanza quando non si toccano (`HANDOFF_interni.md` lo chiede già).
3. **Coda unica e calendario** (punti 1 e 4 del piano fluido2): tutti i cicli dei moduli in un solo scheduler con
   frequenze (fotogramma / 10 Hz / 1 Hz / minuto di gioco).
4. **Passo fisso a 30 Hz con interpolazione** per la logica (punto 5): utile sul telefono.
5. **Mesh lunghe nelle ombre** (binari, settori da 80 m) spezzate in celle da 40 m.
6. **Sotto terra**: si ricostruisce già solo una finestra attorno al giocatore; le lanterne con luce vera passano da
   8 a 4 nella leggera.
7. **Ogni costruzione al giocatore** (piazzare un muro, scavare una casella) ricostruisce solo la sua cella,
   mai il settore intero: da verificare in `cantiere.js` (`U.dirty`) e in `tunnelWood`.

---

## 5. Pulizia del codice

1. **Un solo zaino**: `menu_ui.js` è l'interfaccia; `oggetti_ui.js` e `tasche_ui.js` restano solo come librerie
   (icone delle armi, modelli delle postazioni), senza ascoltatori di tastiera né pannelli propri. Lo Scambio, oggi
   pannello vecchio, entra nel Menu come scheda.
2. **Un solo inventario**: oggi convivono `p.inv` (game.js, `ITEMS` del primo menu), `Azioni.ITEMS` e
   `Azioni.playerInv`, il catalogo di `oggetti.js` (374 oggetti), le risorse astratte della Risacca e cose in `st.me`
   (sigarette, vino). Tutto passa da `Oggetti`: `has`, `take`, `give`, `count`, peso. `livelli.js has()` che guarda tre
   posti diversi diventa una chiamata.
3. **Una sola mappa dei tasti** (`comandi.js`): un ascoltatore, una tabella `tasto → azione` per contesto
   (a piedi, in auto, sotto terra, nel cantiere, nel menu), mostrata nell'aiuto e modificabile.
4. **Un registro dei moduli**: oggi ogni modulo concatena gli agganci (`HOOKS.step`, `LV.key = (…) => … K0(…)`).
   Un `Game.on('step'|'key'|'moved', fn, priorità)` rende l'ordine esplicito e misurabile.
5. **Riparare le prove rotte** prima di tutto: `test_cantiere` (garage), il «NO» di `test_fazioni`, `test_economia`
   oltre i 15 minuti (ridurre i giorni simulati o la popolazione nella prova). Una `npm test` che lancia le prove brevi.
6. **Codice morto**: i rami già sostituiti (sezione 2D degli scavi, «Fruga: …» e «Cerca qui intorno», i pannelli di
   `oggetti_ui.js` che ormai rimandano al Menu) vanno cancellati, non lasciati spenti.

---

## 6. Comandi e giocabilità

**Conflitti di oggi** (da `grep` dei `keydown`):
- **K** apre il Banco (`oggetti_ui.js`) e sotto terra scava **in salita** (`livelli.js`).
- **I** apre le Tasche (`tasche_ui.js`) e il Menu (`menu_ui.js`).
- **X** è «di soppiatto» (`risacca_ui.js`) e un tasto dello skate (`skate.js`).
- **R** ricarica e, nel cantiere, gira il pezzo; **Z** zaino e **Ctrl+Z** annulla nel cantiere.
- **H** scava, ma fa tre cose diverse secondo dove sei (avanti sotto terra, botola dal pavimento, cunicolo contro la roccia);
  **E** è lo scippo, mentre le altre interazioni stanno su tasti diversi per ogni sistema.

**Mappa proposta** (una sola, in `comandi.js`; restano Tab taccuino, B Risacca, C chat, M audio, O visuale dall'alto):

| Tasto | A piedi | Sotto terra | Cantiere (Y) |
| --- | --- | --- | --- |
| I | Menu (Roba) | Menu | Menu |
| K | Crafting (banco qui) | Crafting | — |
| Y | Cantiere | Cantiere del sotto | esci |
| E | interagisci (la cosa evidenziata); lo scippo va nel menu attorno alla persona | interagisci | — |
| F | mezzo | — | — |
| Q / 1-5 | arma / barra rapida | arma / barra rapida | categoria |
| Clic sinistro | vai / usa | vai scavando | posa (trascina = fila) |
| Clic destro | spara | spara | annulla / togli |
| Rotella | zoom | zoom | gira (anche R) |
| Spazio | salta | — | — |
| PagSu / PagGiù (J resta per scendere) | — | scava in salita / in discesa | piano su / giù |
| V | — | sali / scendi (botole, tombini, scale) | — |
| Esc | chiudi tutto | | |

Z resta un secondo tasto per il Menu fuori dal cantiere; Ctrl+Z annulla solo dentro il cantiere.

- **Un tasto E per l'interazione contestuale**, con l'etichetta sopra la cosa («E — Apri il baule»), invece di tasti
  diversi per ogni sistema. Le azioni di oggi in «Qui · N cose da fare» restano, ma la prima è sempre su E.
- **Il sinistro con l'arma in mano spara** anche su computer (come sul telefono), camminare col sinistro solo a mani
  libere; lo chiede già `HANDOFF_mobile.md`.
- **Aiuto a schermo** (`?` o F1): la tabella del contesto attuale, generata dalla stessa mappa.
- **Primi 10 minuti guidati**: un filo di obiettivi (prendi la pala, scava la cantina sotto casa, costruisci un banco,
  fai la prima ricetta, porta la roba al baule) con frecce e la scheda «Qui». Spenta dopo, si riattiva dal menu.
- **Telefono**: pizzico per lo zoom, pulsante «E» contestuale, il cantiere con tocco = posa, due dita = gira.

---

## 7. Inventario (la Roba)

Stato: griglia con ingombri, dettaglio, Addosso a strati, due mani, peso 30/50 kg, icone e anteprime 3D per 374
oggetti, baule del covo.

Da completare:
1. **Una fonte sola** (vedi §5.2): niente oggetti «fuori dalla borsa» (sigarette e vino in `st.me`, risorse astratte).
2. **Trascinare ovunque**: borsa ↔ addosso ↔ mani ↔ baule ↔ contenitore aperto ↔ bottega, con Maiusc+clic per il
   trasferimento rapido e Ctrl+clic per metà pila. Oggi in parte ci sono (`menu_ui.js`, `k === 'b'`, `'baule'`).
3. **Ordina e filtra**: per famiglia, peso, valore, «scotta»; ricerca per nome; «metti tutto nel baule» e
   «prendi quello che serve per questa ricetta».
4. **Contenitori veri**: cassette, borse, scatole che stanno nella borsa e contengono altro (lo chiede
   `HANDOFF_oggetti.md` punto 6), e i nascondigli nelle basi.
5. **Barra rapida** (1-5 + le icone di `comandi.js`): ci si mette qualunque cosa (cibo, kit, molotov, pala), non solo
   armi. Sul telefono è la «mano».
6. **Peso leggibile**: barra col limite, il rallentamento detto in chiaro («oltre 30 kg cammini piano»).
7. **Confronto**: passando su un vestito o un'arma, le barre di quello che hai addosso accanto.
8. **Usura visibile** per attrezzi e armi (oggi solo logica), con la riparazione al banco.
9. **Il bottino si raccoglie con un clic**, con «prendi tutto» e il riassunto di quello che non ci sta.
10. Prova: `test_oggetti` esteso (trasferimenti, contenitori, barra rapida) e uno scenario Playwright sul menu.

---

## 8. Crafting (il Banco)

Stato: 142 ricette (cucina, fabbricare, smontare, raccogliere), postazioni vere, attrezzi che si consumano, tempo che
passa, modifiche alle armi, officina del garage.

Da completare:
1. **Quaderno delle ricette leggibile**: per ogni ricetta ingredienti con «ne hai / ne servono», attrezzo, postazione,
   tempo; stato in tre colori (si fa ora / manca qualcosa / manca la postazione) e **dove trovare** quello che manca
   (bottega più vicina, posto da frugare, ricetta che lo produce).
2. **Ricette da scoprire**: all'inizio una ventina; le altre si imparano smontando, leggendo (giornali, manuali da
   trovare), dal mestiere e dagli amici. Oggi sono tutte visibili: troppe per orientarsi.
3. **Coda di lavoro** alla postazione: «fanne 5», con il tempo che passa e il personaggio che lavora davvero (anima-
   zione della postazione già c'è). Si può lasciare e tornare.
4. **Prende anche dal baule** se sei nel covo (oggi solo dalla borsa e dalle scorte delle basi in alcuni casi): unificare.
5. **Smontare tutto quello che si raccoglie** con una resa coerente (un oggetto non deve rendere più di quanto costa
   farlo): controllo automatico in `test_oggetti`.
6. **Bilanciamento** prezzi/pesi/tempi (`HANDOFF_oggetti.md` punto 1) con una tabella generata dal catalogo.
7. **Le postazioni del cantiere e quelle degli interni** sono la stessa cosa (`stationsHere`/`stationsNear`): un solo
   elenco, così una forgia costruita sotto terra vale come quella del fabbro.

---

## 9. Scavi

Stato: si scava dappertutto (pala per la terra, piccone per la roccia), a clic con A*, J/K per la profondità, stanze
3×3 (N), botole sotto casa e da casa, roba sepolta, gallerie armate di legno, falda e roccia a quote fisse.

Da completare:
1. **Comandi uniti** (§6): un clic nella terra scava fin lì; PagSu/PagGiù o i pulsanti a schermo per la profondità;
   «Allarga» e «Stanza» come pezzi del cantiere del sotto invece di tasti (N).
2. **Anteprima chiara**: il percorso che scaverai, quante caselle di terra/roccia, quanto tempo, quanto si consuma la
   pala; rosso dove non si può (acqua, fondamenta, metro).
3. **Fatica e attrezzi**: la pala si consuma per casella, la terra va da qualche parte (mucchio all'uscita o nel
   secchio/carriola): dà senso alla carriola e ai sacchi di terra per le difese.
4. **Puntelli**: oltre 3 caselle di galleria senza telaio la volta può cedere (solo avviso e poca terra che cade, mai
   la morte a sorpresa); i telai di legno si posano col cantiere e costano assi. Così le «gallerie di terra armata»
   che già si disegnano diventano una scelta del giocatore.
5. **Luce**: le lanterne si posano (oggi sono messe dal disegno); senza luce si vede poco.
6. **Collegamenti**: scavando contro fogne, cripte, bunker o metro si apre un varco (oggi le fogne sono a parte):
   tutto il sotto è una rete sola, e gli NPC la usano (`HANDOFF_monte.md`: oggi non usano cunicoli; le guardie non
   trovano le botole → con una ricerca a rate possono).
7. **Ritrovamenti**: la roba sepolta per zona (rovine, porto, campagna) con rarità, più le 4 casse fisse.
8. **Prestazioni**: scavare una casella aggiorna solo la geometria di quella casella e delle vicine.

---

## 10. Bunker e sottosuolo

Stato: fogne con 52 tombini, 9 posti (cripte, carceri, rifugio, bunker della guerra, deposito, spaccio, mercato,
Città dei Topi), 13 persone, 4 banchi, casse, metropolitana con due treni; scavi da edificio (cantina, stanza, sala,
bunker di cemento) che si aprono a poco a poco.

Da completare:
1. **Il bunker del giocatore come obiettivo**: una sequenza chiara — cantina → stanza → bunker di cemento → porta
   blindata → corrente (generatore, quadro) → aria (presa d'aria, necessaria oltre 2 stanze) → acqua (cisterna) →
   deposito. Ogni passo sblocca qualcosa (nascondere roba che scotta, ricercati che si nascondono, un letto sicuro,
   la radio fuori portata).
2. **Porte vere sotto terra**: porta di legno, grata, porta blindata con serratura e chiave (le stesse regole di
   `cassaforti.js`); l'ingresso nascosto (botola sotto il tappeto, scaffale che scorre).
3. **Arredare il sotto come una stanza**: pareti di cemento/mattoni/assi scelte dal giocatore (oggi il materiale è
   per tipo di scavo), pavimento, lampade, tutti gli arredi e le postazioni del cantiere.
4. **I posti esistenti fatti bene**: ogni posto ha uno scopo nel gioco (il rifugio come nascondiglio, il deposito con
   la cassa sorvegliata, la metro come scorciatoia con un rischio), un ingresso riconoscibile in superficie e
   qualcuno che ne parla in città (così si scoprono).
5. **La gente di sotto con le sue regole**: chi scava nel loro territorio li fa arrabbiare; i Topi commerciano solo
   con chi hanno conosciuto.
6. Prova: `test_sottosuolo` esteso (bunker completo con corrente e aria, porta con chiave, varco nelle fogne).

---

## 11. Costruzioni, esterni e interni (il Cantiere)

Stato: 122 pezzi in 9 categorie (terreno 8, sotto 10, strutture 22, arredi 32, postazioni 13, baracche 14, orto 8,
energia 5, difese 4); campo dove vuoi fuori città; in città solo al chiuso; la banda fa i lavori pesanti; pezzi che si
uniscono; tetti a caselle; corrente; orto; gesti dello Studio (trascina, R, Canc, Ctrl+D, Ctrl+Z).

Da completare:
1. **Riparare il garage** (`test_cantiere`) e verificare che ogni pezzo del catalogo si possa posare almeno in un
   posto: prova automatica che li posa tutti, uno per uno, fuori, dentro e sotto terra.
2. **La barra del cantiere** più semplice: categorie a icone, il pezzo con costo (ne hai / ne servono), i pezzi che
   non puoi permetterti in grigio con «cosa manca»; ricerca per nome; ultimi usati.
3. **Muri a più piani** sugli esterni: oggi un piano. Due piani con scala e solaio per casetta e baracca (il sistema
   di `tetti.js` per salire c'è già).
4. **Aggancio coerente**: muri, porte, finestre, tetti e pavimenti alla griglia di 2 m con mezze caselle per gli
   arredi (passo di 25 cm come oggi per i liberi); i tetti si chiudono da soli sopra un perimetro chiuso.
5. **Interni del covo**: dentro casa si possono spostare anche i mobili esistenti della stanza (oggi solo i propri),
   ridipingere pareti e pavimenti, e i mobili rubati/comprati si posano direttamente dalla Roba.
6. **Riparare e potenziare** i pezzi (muro di assi → lamiera → mattoni) senza toglierli.
7. **La banda**: si vede chi lavora a cosa, con la barra di avanzamento sopra il cantiere; i lavori in coda si
   riordinano.
8. **Difese che funzionano** contro le incursioni (`fazioni.js`, `scontri.js`): sacchi, filo spinato, torrette con
   un membro di guardia. Oggi 4 pezzi: portarle a 8-10 (cancello rinforzato, faro, allarme, trappola).
9. **Salvataggio**: il covo, gli scavi e l'orto entrano nel salvataggio della partita (da verificare cosa resta a
   una ricarica: `st.covo`, `st.covo.crops`, `st.covo.digs`, le caselle cambiate della mappa).

---

## 12. Interni (le case e le botteghe)

Stato: interni generati per tipo (`interiors.js`, `interni_arte.js`), negozi con la merce sugli scaffali e i prezzi,
postazioni nelle stanze, frugare nei mobili.

Da completare:
1. **Le persone dentro**: oggi chi è al chiuso non si disegna. Disegnare almeno chi lavora (`Oggetti.staffIndoor` dà
   già i posti) e la famiglia a casa la sera. Con la popolazione più piccola (§3) il costo regge.
2. **Rubare e picchiare dentro** (`HANDOFF_scopo.md`: il motore ignora chi è `inside`).
3. **Stanze grandi meno vuote** e cucine strette con i fornelli; condomini con più piani o più appartamenti per piano.
4. **Vetrine aggiornate** senza dover rientrare.
5. **Entrare e uscire senza attese**: l'interno si prepara a rate quando il giocatore è a meno di 10 m dalla porta,
   così l'ingresso è immediato.

---

## 13. Ordine di lavoro

Ogni fase finisce con: prove verdi, misura F3 scritta qui sotto, build pubblicata, una nota di consegna breve.

| Fase | Contenuto | Durata indicativa |
| --- | --- | --- |
| **1. Pulizia e misura** | §2.4, §5.5 prove rotte, `npm test`, misure di partenza sul PC e sul telefono | 1-2 giornate |
| **2. Leggera** | §2.1-2.3 build `leggera.html`, asset senza doppioni e in GLB, kit a richiesta | 2-3 giornate |
| **3. Abitanti** | §3, `test_popolo.js`, ribilanciamento economia | 1-2 giornate |
| **4. Un solo zaino, un solo tasto** | §5.1-5.4, §6 | 2-3 giornate |
| **5. Inventario e crafting** | §7, §8 | 3-4 giornate |
| **6. Scavi e bunker** | §9, §10 | 3-4 giornate |
| **7. Cantiere e interni** | §11, §12 | 4-5 giornate |
| **8. Fluidità finale** | §4 (personaggi fusi, scheduler, passo fisso) e misure finali | 2-3 giornate |

Le fasi 1-4 vanno in quest'ordine (ognuna rende più semplice la successiva); 5, 6 e 7 si possono scambiare.

---

## 14. Decisioni da prendere

1. **Numero di abitanti**: 180 nella leggera e 220 nella completa, o un valore solo per tutte e due?
2. **Mappa**: si tiene l'isola intera (1300 × 400 m) con la gente concentrata attorno al giocatore, oppure la
   leggera si ferma a una parte (borgo, Ponente, Lungomare, collina, porto)?
3. **Tasti**: va bene la mappa unica di §6 (E interagisci con lo scippo spostato nel menu della persona, K solo
   crafting, la profondità degli scavi su PagSu/PagGiù)? Cambia le abitudini di chi gioca già.
4. **Ricette da scoprire** invece di tutte visibili dall'inizio?
5. **Cartelle vecchie** (`v2`…`v6`, `_to_delete`, `_scambio`, backup): spostarle in un ramo d'archivio e toglierle
   da `main`?

---

## Misure

(da compilare a ogni fase: data, macchina, fps medi, fotogramma peggiore, disegni, triangoli, MB scaricati, s di
caricamento, abitanti totali / vicini)
