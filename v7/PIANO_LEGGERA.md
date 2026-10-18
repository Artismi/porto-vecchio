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
| Prove | 13 provate: 10 passano, **`test_cantiere` e `test_eventi` falliscono**, `test_ordine` non finisce in 5 minuti (§13) | |
| Nel browser (Chromium senza scheda video) | caricamento 33-54 s, **569 persone**, 71 mezzi, **heap JS 1,5 GB** | |
| Oggetti di scena messi male | 48 dentro le case, 41 sospesi, 13 affondati, 8 in acqua, 74 sovrapposti (§15) | |
| Attrezzi visibili in mano | 7 su 50 (§14) | |

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

### 2.4 Il repository (non si butta niente)
- Le cartelle vecchie restano. La pubblicazione prende solo quello che serve al gioco (una lista in `build.py` e un
  `.vercelignore`), così i 175 MB di versioni vecchie e gli scarti non si scaricano mai.
- I 41 `HANDOFF_*.md` restano, e si aggiunge `src/INDICE.md`: un rigo per modulo (cosa fa, da chi dipende, prove).

---

## 3. Gli abitanti: meno, ma attorno a te (senza che ti seguano)

Misurato il 18/10: nel browser ci sono **569 persone** (486 del Popolo in Node, il resto da writer, sottosuolo,
regia…). Le case degli abitanti stanno già abbastanza vicine alla casa del giocatore (mediana 122 m, 301 entro
150 m, il 10% oltre 488 m), ma `populate()` (`popolo.js` ~r. 299) le sceglie per hash, non per distanza.

**La regola d'oro: la gente è densa in un *posto*, non attorno al giocatore.** La concentrazione si decide una volta,
all'inizio della partita, sulle case e sui posti di lavoro; dopo, nessuno nasce, sparisce o cambia strada perché il
giocatore si è spostato.

1. **Totale**: `CFG.max` da 420 a **207** (deciso, §17), e un tetto anche per i moduli che
   aggiungono gente per conto loro (writer, sottosuolo, regia, fazioni): **≤ 240 persone in tutto** nella leggera.
   `maxNear` da 70 a **40**.
2. **Le case, una volta sola, in ordine di distanza** dalla casa di partenza del giocatore (`playerHome`):
   il quartiere di casa e quelli confinanti (~250 m) prendono il **70%**, case piene; il resto dell'isola il 30%, una
   famiglia per casa; campagna e monte solo chi ci lavora (contadini, pastori, minatore, carbonaio) e i bivacchi.
3. **I posti di lavoro seguono le case**, non il giocatore: le botteghe lontane aprono con un commesso solo (i mestieri
   essenziali di `ESSENTIAL` restano coperti per primi, come oggi).
4. **Niente che sembri inseguimento**:
   - nessuno compare dal nulla vicino al giocatore: chi entra in vista arriva camminando da dove stava già (porta di
     casa, bottega, fermata), mai a meno di 25 m e mai nel campo visivo;
   - la regia (`eventi.js`, oggi una scena **ogni 15-35 s a 10-34 m dal giocatore**) cambia: le scene nascono nei
     *posti* (piazza, bar, mercato, fermata, molo) secondo l'ora e chi c'è davvero; il giocatore le incontra se passa
     di lì. Al massimo una scena ogni 2-3 minuti vicino a lui, e quelle che vengono *verso* di lui (sigaretta,
     provocazione, mendicante) al massimo una ogni 10 minuti, con una ragione (lo conoscono, è ricercato, ha soldi);
   - chi è nella bolla fa la sua giornata: se il giocatore si ferma in un vicolo vuoto, il vicolo resta vuoto;
   - niente «se fuori non c'è nessuno, qualcuno esce dalla porta» apposta per la scena.
5. **Si vede la differenza fra i posti**: vicino a casa 15-25 persone a schermo di giorno, nella piazza del mercato
   di più il mercoledì e il sabato, nei quartieri lontani 3-8, la notte quasi nessuno (coprifuoco).
6. **Quando il giocatore cambia casa o covo** la popolazione non si rigenera (si perderebbero le memorie): cambia solo
   la vita del nuovo quartiere col tempo (traslochi veri, nuovi clienti).
7. **Prova automatica dell'«effetto codazzo»** (`test_popolo.js`): il giocatore cammina per 20 minuti di gioco in un
   quartiere lontano; il numero di persone entro 40 m da lui deve restare quello del posto (misurato con il giocatore
   assente), non salire. In più: distribuzione per distanza, mestieri essenziali coperti, casa del giocatore libera.
   Poi `test_vita`, `test_economia`, `test_soldi` brevi per vedere che l'economia regge con 207.

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
   `oggetti_ui.js` che ormai rimandano al Menu) escono dalla build; il codice si conserva in `src/_archivio/` con una
   nota su cosa faceva (non si butta niente, §17.6).

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
2. **Tutte le ricette visibili** (deciso, §17.5), ma ordinate: prima quelle che si fanno ora e qui, poi quelle a cui
   manca poco; filtri per postazione e per famiglia, ricerca per nome e per ingrediente («cosa ci faccio col ferro?»).
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

## 13. Tutte le altre funzioni: graffiti, bici, skate, lavori, eventi, scontri

Stato delle prove il 18/10 (`node test_*.js` in `v7/src`):

| Prova | Esito | Tempo |
| --- | --- | --- |
| `test_skate`, `test_bmx`, `test_writing`, `test_tetti` | passano | 4-7 s |
| `test_writer_vita`, `test_scontri` | passano | 23-33 s |
| `test_imprese` | passa | 118 s |
| `test_sottosuolo`, `test_oggetti` | passano | 79 s per gli oggetti |
| **`test_cantiere`** | **fallisce**: il garage della banda non si finisce | |
| **`test_eventi`** | **fallisce**: la scena «bici» finisce in 6 s senza battute | 66 s |
| **`test_ordine`** | **non finisce in 5 minuti** | > 300 s |
| `test_fazioni` | un «NO» da verificare (dal passaggio di consegne) | |
| `test_economia` | oltre i 15 minuti | |

Per ogni funzione: si gioca 10 minuti dall'inizio alla fine, si scrive cosa non va, si chiude prima di aggiungere.

1. **Graffiti e writer** (`writing.js`, `writer_*.js`, `graffiti.js`): bomboletta, tavoletta, pennarello, i writer
   che escono a bombare, le firme. Da finire: la scala di ferro e il tetto letti in modo chiaro, i lavori del
   giocatore riconosciuti dalla città (chi li vede, chi li cancella, la polizia), il catalogo dei colori nella Roba
   (le bombolette sono oggetti veri con quantità).
2. **BMX** (`P`, icona Ruote): salti, impennata. Da finire: dove si posa la bici quando scendi (oggi «tascabile»:
   deve diventare un oggetto a terra che qualcuno può rubare), suono delle ruote, la scena «bici» di `test_eventi`.
3. **Skate** (`skate.js`): panchine e fioriere della città non grindabili (il motore non sa dove sono: leggere
   `R.__dz.props`), cordoli non grindabili, piante del bosco che spuntano dentro la vasca, i ragazzi dello skate non
   cliccabili e muti, nessun rotolio nell'audio.
4. **Lavori e mestieri** (`mestieri.js`, `commissioni.js`, `attivita.js`, scheda Lavori): il turno del giocatore deve
   essere un'attività vera in scena (postazione, gesti, tempo, paga a fine turno), non un salto di tempo; vendere un
   mezzo rubato all'Autorimessa; chi guarda le vetrine resta oltre la chiusura.
5. **Eventi e regia**: come in §3.4 (nei posti, non attorno al giocatore); mancano scene coi mezzi e coi cani.
6. **Scontri, ordine, fazioni**: nube dei lacrimogeni poco leggibile, tiratori solo a terra, `test_ordine` troppo lungo.
7. **Tetti** (`tetti.js`): ci si sale e si fruga; verificare che i tetti raggiungibili siano segnalati.
8. **Barche e costa** (`HANDOFF_costa.md`): pescatori che escono davvero, nave che parte e torna, pescare dalla barca.
9. **Freddo** (`HANDOFF_oggetti.md`, `HANDOFF_protagonista.md`): stufe, carbone, vestiti a strati come sesto bisogno;
   i valori ci sono già (`Oggetti.warmth`, `st.ogg.calore`).
10. **Bambini** (`HANDOFF_regia.md`): oggi la popolazione va dai 18 anni in su. Con 207 abitanti si possono
    aggiungere figli nelle famiglie, scuola e gioco, con l'altezza nel modello.

---

## 14. Modelli 3D mancanti

Misurato il 18/10:
- **Attrezzi in mano**: `models.js` (r. 182 e seguenti) ha i modelli di 7 oggetti (bomboletta, cartello,
  fotocamera, gesso, manganello, piede di porco, telefono) più le armi. **Degli altri 43 attrezzi del catalogo non si
  vede niente in mano**, nemmeno la pala e il piccone mentre si scava, l'ascia mentre si disbosca, la zappa
  nell'orto, il martello nel cantiere, la canna da pesca, la torcia, la carriola.
- **Oggetti della Roba (377)**: le anteprime sono un modellino per famiglia (`mini()` in `menu_ui.js`, ~40 forme:
  bottiglia, latta, sacco, chiave…). Vanno bene come icona, non come oggetto posato a terra o tenuto in mano.
- **Gente al chiuso**: non si disegna (§12). **Sottosuolo**: se i personaggi non sono pronti si usa un pupazzo di
  cilindri (`fallbackPerson` in `sottosuolo.js`). **Ragazzi dello skate**: non sono abitanti veri.
- **Personaggi**: restano il punto più debole secondo tutti i passaggi di consegne (proporzioni, abiti anni '80,
  animazioni di mira, corsa, caduta).

Piano:
1. **Tutti gli attrezzi in mano**, ognuno col suo gesto (scavare, zappare, segare, martellare, pescare, spingere la
   carriola): 43 modelli piccoli e procedurali come quelli che ci sono (pochi triangoli, un materiale), agganciati al
   polso come in `models.js`. Priorità: pala, piccone, ascia, zappa, martello, sega, secchio, annaffiatoio, canna,
   torcia, carriola, piede di porco (già c'è), trapano.
2. **Oggetti posati e tenuti**: un modello vero per le 60-80 cose che si vedono di più (cibo e bottiglie comuni,
   taniche, casse, sacchi, attrezzi, radio, lampade); per le altre il modellino di famiglia, ma con le misure giuste.
3. **Bottino e posti da frugare**: ogni tipo (`bottino.js`) con un modello leggibile dalla camera del gioco.
4. **Pezzi del cantiere**: controllo che ognuno dei 122 abbia un modello finito (non una scatola) in tutti e tre i
   posti (fuori, dentro, sotto) e la sua sagoma verde/rossa giusta.
5. **Personaggi al chiuso, bambini, ragazzi dello skate**: con i corpi che ci sono e i vestiti di `guardaroba.js`.
6. Una pagina di controllo (lo Studio o `showroom`) che mostra in griglia tutti gli oggetti e gli attrezzi in mano:
   così si vede subito cosa manca.

---

## 15. La mappa: oggetti compenetrati o messi male

Lo strumento nuovo `strumenti/sonda_mappa.js` carica il gioco vero in Chromium e controlla ogni oggetto di scena
registrato da `render.js` (1.407 oggetti più 168 grandi); per ognuno dice quale funzione l'ha messo
(`file:riga`) e scrive l'elenco completo con le coordinate. Primo giro, 18/10 (i dati logici della mappa invece sono
puliti: nessun edificio sovrapposto, nessuna porta murata, un solo luogo su casella non percorribile, `isola_torre`):

| Problema | Quanti | Fonti principali |
| --- | --- | --- |
| Dentro un edificio | 48 | 24 bici appoggiate davanti alle porte (`render.js:5812`, finiscono dentro la casa), 3 lampioni déco della litoranea (`:2730`) dentro case, sdraio e ombrellone dentro `casa_187`, jersey, panchina, bidone, sedia |
| Sulla carreggiata | 133 | 63 coni e 18 transenne dei lavori (`buildStrade31`: forse voluti, ma si sovrappongono fra loro 8 volte), 12 jersey, 7 paletti, cartelli, semafori, parchimetri |
| In acqua | 8 | 7 dell'inverno (`buildWinter`), 1 fermata dell'autobus |
| Sospesi (> 35 cm) | 41 | 37 dell'inverno (`buildWinter`, r. 8761), pile di casse |
| Affondati (> 50 cm) | 13 | massi lungo le strade (`:4082`), la stazione, pezzi dell'inverno |
| Sovrapposti | 74 | 25 dell'inverno su un palo alto 13 m (`:8785`), coni con transenne, sdraio con ombrelloni, paletti con banchi del mercato, fontana con banco |

Cosa non vede ancora (da aggiungere alla sonda): alberi e cespugli istanziati che entrano nelle case, nei muri e
nelle strade; moduli dei kit degli edifici; oggetti degli interni dentro le pareti; persone e mezzi fermi dentro le
cose. Per quelli serve un secondo controllo per caselle (istanze di `natura`, `verde`) e un giro di foto.

Piano:
1. **Correggere alla fonte** ogni gruppo della tabella (una regola di posa per funzione, non spostamenti a mano):
   chi posa davanti alle porte prova il lato esterno; tutti passano da un `free(x, z, raggio)` comune che conosce
   edifici, carreggiata, acqua e quello che è già stato posato; la quota si prende dal terreno su tutti e quattro gli
   spigoli (non solo al centro), e sui pendii si posa in piano con un piedistallo o non si posa.
2. **La sonda diventa una prova**: a ogni build deve dare zero dentro gli edifici, in acqua, sospesi e affondati; i
   sovrapposti e le cose in strada ammessi solo da un elenco di eccezioni volute (cantiere stradale, mercato).
3. **Giro di foto** (`strumenti_inverno/shot_gioco.js`) di tutti i luoghi di `PLACES`, giorno e notte, da guardare a
   occhio per quello che la sonda non vede.
4. Le note aperte nei passaggi di consegne: striscia chiara lungo i moli, terrazze a scacchiera sul monte, bivacchi e
   sentieri che attraversano il massiccio, macchie tonde sfocate sospese di notte, il mare a trattini.

---

## 16. Ordine di lavoro

Ogni fase finisce con: prove verdi, misura F3 scritta qui sotto, build pubblicata, una nota di consegna breve.

| Fase | Contenuto | Durata indicativa |
| --- | --- | --- |
| **1. Pulizia e misura** | §2.4, §5.5 prove rotte (cantiere, eventi, ordine), `npm test`, misure di partenza sul PC e sul telefono | 1-2 giornate |
| **2. Mappa pulita** | §15: correzioni alla fonte, sonda a zero, sonda estesa a vegetazione e kit, giro di foto | 2-3 giornate |
| **3. Leggera** | §2.1-2.3 build `leggera.html`, asset senza doppioni e in GLB, kit a richiesta | 2-3 giornate |
| **4. Abitanti** | §3 con la prova dell'«effetto codazzo», regia nei posti, ribilanciamento economia | 2 giornate |
| **5. Un solo zaino, un solo tasto** | §5.1-5.4, §6 | 2-3 giornate |
| **6. Modelli mancanti** | §14: attrezzi in mano con i gesti, oggetti posati, bottino, griglia di controllo | 3-4 giornate |
| **7. Inventario e crafting** | §7, §8 | 3-4 giornate |
| **8. Scavi e bunker** | §9, §10 | 3-4 giornate |
| **9. Cantiere e interni** | §11, §12 | 4-5 giornate |
| **10. Le altre funzioni** | §13: graffiti, BMX, skate, lavori, eventi, scontri, costa, freddo, bambini — giocate e chiuse una per una | 5-7 giornate |
| **11. Fluidità finale** | §4 (personaggi fusi, scheduler, passo fisso) e misure finali | 2-3 giornate |

Le fasi 1-5 vanno in quest'ordine (ognuna rende più semplice la successiva); dalla 6 alla 10 si possono scambiare.
In tutto circa 30-40 giornate di lavoro: siamo lontani, ma ogni fase lascia il gioco più pulito e più giocabile di prima.

--- | --- | --- |
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

## 17. Decisioni prese (18 ottobre)

1. **Abitanti: 207** (`CFG.max = 207`, un valore solo per le due versioni). Il tetto di §3.1 (≤ 240 persone in tutto,
   contando writer, sottosuolo, regia, fazioni) resta.
2. **Tutta l'isola.** Le altre isole dell'arcipelago (`world.js`, sezione `[arcipelago]`: Palme, Torre, Isola Lunga,
   Gabbiano, Scoglio Piatto, Relitto, Grande del Sud, Presidio, Cannoni, Pescatori Lontani) **si attivano solo quando
   ti avvicini**: fino ad allora c'è solo la sagoma lontana (terreno a bassa risoluzione, niente oggetti, niente
   gente, niente logica). A ~250 m dalla riva si costruiscono a rate (blocchi, oggetti, poi la gente che ci vive);
   allontanandosi oltre ~400 m si spengono, ma il loro stato (chi c'è, cosa hai lasciato, cosa hai costruito) resta.
   La gente delle isole non conta nei 207: ha un piccolo numero suo per isola, fisso, deciso alla prima visita.
3. **Regia nei posti, sì — ma mai uguale.** Le scene non devono sembrare preset ripetuti negli stessi posti con le
   stesse dinamiche:
   - **chi**: gli attori sono abitanti veri scelti per chi sono (carattere, mestiere, debiti, amicizie, memorie con
     te), non ruoli fissi; la stessa scena con persone diverse va diversamente;
   - **dove**: ogni scena ha un *tipo* di posto (un angolo con poca luce, una fermata, un bancone, una piazza col
     mercato), non un posto preciso; si sceglie fra quelli adatti con un peso che scende ogni volta che ci è successo
     qualcosa (memoria per posto e per tipo di scena);
   - **quando**: dipende dall'ora, dal giorno, dal meteo, dalla repressione, da cosa è successo prima (un furto ieri →
     ronda stasera; una rissa → il giorno dopo i due si evitano o si cercano);
   - **come**: ogni scena è fatta di passi con varianti e bivi (la vittima scappa / reagisce / chiama aiuto; il
     testimone interviene / filma / se ne va), con battute a pezzi ricombinabili e tempi diversi;
   - **quanto spesso**: nessuna scena dello stesso tipo due volte nello stesso quartiere nella stessa giornata;
     le 41 scene di oggi diventano famiglie di varianti, e una prova conta in 7 giorni simulati quante volte la stessa
     combinazione (tipo, posto, attori) si ripete: deve essere quasi mai.
4. **Comandi: sì, ma leggeri e leggibili, nell'estetica del gioco e pensati prima per il telefono.** L'aiuto e le
   etichette a schermo non sono una tabella da manuale: sono poche icone nello stile delle icone di `comandi.js` e
   della valigetta (madreperla, ottone, pixel netti), il verbo contestuale vicino alla cosa («Apri», «Scava»,
   «Siediti») e, sul telefono, un solo pulsante grande che cambia icona secondo cosa hai davanti. Niente pannelli
   pesanti: HTML leggero, nessun canvas in più, aggiornato solo quando cambia il contesto (non a ogni fotogramma).
   I tasti del computer seguono la stessa logica (E fa quello che sul telefono fa il pulsante).
5. **Ricette: per ora tutte visibili.** Il quaderno resta completo; si aiuta a orientarsi con filtri (si fa ora / qui /
   mi manca poco) e con la ricerca.
6. **Non si butta niente.** Le cartelle vecchie (`v2`…`v6`, `_to_delete`, `_scambio`, backup, immagini) restano dove
   sono; semplicemente non entrano nella build leggera né nella pubblicazione. §2.4 cambia di conseguenza: si aggiunge
   solo una lista di cosa pubblicare (`.vercelignore` / lista in `build.py`), senza cancellare.

---

## Avanzamento

### 18 ottobre — fase 1 (prove) e inizio fasi 2 (mappa) e 4 (abitanti)
- **`test_cantiere` passa tutta.** Il garage non si posava perché nel bosco ogni casella aveva un albero o una roccia.
  Ora una costruzione posata su alberi o roccia fuori città apre il cantiere: la banda prima disbosca e cava, poi
  costruisce; da solo sgombri tu subito, se hai ascia o piccone (altrimenti la sagoma è rossa e dice cosa serve).
  Sbloccata, la prova ha mostrato altri 7 errori a valle (alberello sulla sabbia, pannello e pala eolica): corretti.
- **`test_eventi` passa.** La caduta in bici era una gara fra due tempi (arrivava prima di cadere: scena muta);
  il ciclista ora passa di traverso invece di venire verso il giocatore; la rissa è un finale valido.
  Resta raro (sotto 1 su 20) un attore che entra in casa a metà scena: da guardare.
- **`test_ordine`** non è rotta: simula 2 giorni; con `node test_ordine.js 0.2 1` gira in meno di un minuto.
- **`test_fazioni`**: il «NO» («nessuno si chiama più lo Squalo») c'era già prima di queste modifiche; da guardare.
- **Mappa** (`strumenti/sonda_mappa.js`): bici davanti alle porte lungo il muro (erano girate di 90°), chi posa
  arredi di strada controlla 60 cm attorno, ogni cosa si appoggia sullo spigolo più basso del terreno, il Muro senza
  lastre in mare o nelle torri, cartelloni con le gambe fino a terra, fermata dell'autobus mai in acqua.
  Dentro le case da 48 a 19, sepolti da 13 a 5. La sonda ora riconosce le cose impilate.
- **Abitanti 207** (§3): case scelte una volta, 70% attorno alla casa di partenza; i personaggi della storia contano;
  le altre isole no. `ordine.js` alzava il tetto a 560: tolto. Nel browser **da 569 a 279 persone** (174 abitanti,
  ~63 personaggi e fazioni, 8 militari, 31 sulle altre isole). Logica **da 3,10 a 1,81 ms per passo**.
- **Regia nei posti** (§17.3): una scena ogni 50-120 s dove c'è già gente o in un luogo pubblico; mai la stessa nello
  stesso posto o quartiere nello stesso giorno; nessuno esce di casa apposta; verso il giocatore al massimo una ogni
  10 minuti; tempi e passi un po' diversi ogni volta. Prova: 5-7 scene diverse in 8 minuti, nessuna ripetuta.

### Prossimi passi
1. Mappa: i 19 rimasti dentro le case (jersey, bandiere della Rocca, sdraio e ombrelloni su `casa_187`), sdraio e
   ombrelloni sovrapposti, recinti e cartelloni lunghi su pendio; sonda estesa a vegetazione e kit; giro di foto.
2. Le altre isole accese solo da vicino (§17.2): oggi la gente lontana è già leggera; resta da non costruire
   oggetti e dettagli delle isole finché non ti avvicini.
3. Fase 3 (leggera): asset senza doppioni, GLB, kit a richiesta.
4. Fase 5: comandi leggeri pensati per il telefono (§17.4).

## Misure

(da compilare a ogni fase: data, macchina, fps medi, fotogramma peggiore, disegni, triangoli, MB scaricati, s di
caricamento, abitanti totali / vicini)

| Data | Macchina | Caricamento | Persone / mezzi | Heap JS | Note |
| --- | --- | --- | --- | --- | --- |
| 18/10 | container, Chromium senza scheda video (SwiftShader) | 33-54 s | 569 / 71 | 1,5 GB | partenza; fps non significativi senza scheda video |
| 18/10 sera | stesso | 29-42 s | 279 / 71 | 1,4-1,5 GB | dopo 207 abitanti; logica 1,81 ms per passo (era 3,10) |
