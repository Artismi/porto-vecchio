# Porto Vecchio — piano di lavoro per chat parallele (città nuova, `?cittanuova`)

Base comune: ramo `claude/gallant-dijkstra-sa2548` (contiene `main`, il piano, la tappa 1, il tassellatore degli isolati pieni).
Ogni chat parte da lì su un ramo suo, lavora **solo nei file/sezioni che possiede**, verifica con pianta + foto, fa commit e
riporta alla chat regista (questa) che unisce. Non si tocca la mappa vecchia: tutto vale solo dove c'è `b.era` / `rd.era` / `?cittanuova`.

Criterio di accettazione del committente, per tutti: **ogni inquadratura deve reggere come fotogramma di un film.** Niente
elementi che galleggiano o si compenetrano, niente strati accumulati a caso, un punto focale per scorcio, molte superfici quiete.

## Strumenti comuni
- Build: `cd v7 && python3 build.py`
- Pianta: `PV_CITTANUOVA=1 node strumenti/pianta.js out.png x0 y0 x1 y1 scala` (metri; città 1080-1620 × 220-480)
- Foto 3D: `PV_QUERY=?cittanuova node strumenti_inverno/shot_gioco.js cartella scene.json 1280 800` (minuti; in background).
  Scene: `[{"nome":"borgo","x":1400,"y":350,"ora":660,"zoom":0.5,"attesa":5000}]` — zoom basso = vicino; `"ora"` in minuti; `"js"` prepara la scena.
- Copertura del costruito per quartiere: `scratchpad/copertura.js` (da riportare in `strumenti/`).
- Punti utili: Rua Maestra (1400,312) · vicolo (1420,365) · piazzetta col bar (1428,324) · marina (1395,390) · Vittoria (1360,343) ·
  piazza d'adunata (1335,343) · Mercato (1275,343) · Corso (1300,330) · Ottocento (1220,320) · stazione (1200,290) ·
  baracche (1150,280) · lungomare boom (1150,390) · spianata (1475,343) · Rocca (1540,343).

## Le chat (livelli: dallo scheletro al dettaglio, dall'esterno all'interno)

| # | Chat | Possiede | Fa | Verifica |
|---|---|---|---|---|
| **A** | **Regista** (questa) | unioni, `PIANO_*`, tassellatore `PIENO` in `world_cittanuova.js` | coordina, unisce, decide i conflitti, tiene i numeri (copertura, draw call) | pianta + 6 foto fisse dopo ogni unione |
| **B** | **Facciate per epoca** *(in corso)* | `render.js`: EDIFICI, kit moduli, CARATTERE DELLE FACCIATE, CASE COL CARATTERE, tetti | `b.era` → materiali, finestre, cornicioni, balconi, portici; via scale antincendio e cartelloni dal borgo; gronde pulite | foto ravvicinate per epoca |
| **C** | **Botteghe e interni** *(in corso)* | `world_cittanuova.js` sez. A CHE SERVE OGNI EDIFICIO; `interiors.js`; `render.js` INTERNI e fronte bottega | bottega al piano terra di palazzi abitati: portone + vetrina accanto, retrobottega, bagno, androne, scala, appartamenti per epoca | test + foto dentro/fuori |
| **D** | **Suoli, segni, dehors** *(in corso)* | `render.js`: PITTURA DEL SUOLO, MATERIALI DEL SUOLO, MURI VIVI, PROPAGANDA, PIENEZZA (manifesti), SOGLIE; `writing.js` | suolo = mappa per epoca; segnaletica anni '80; tag/sticker/poster **composti** (un regista dei muri, una composizione per parete); dehors dei bar | foto ravvicinate di 4 muri e 4 suoli |
| **E** | **Scheletro: marina, Ottocento, stazione** | `world_cittanuova.js` tracciati E2/E3 (righe ~830-900) e `sets` | calata con magazzini a volta e tre scalinate, darsena, scalo; stazione con piazzale e orologio, ferrovia sul rilevato col sottopasso, tronchino; villa comunale | pianta + copertura ≥ 60% Ottocento |
| **F** | **Scheletro: Novecento** | `world_cittanuova.js` E4-E7 (dopo il borgo), nuove sezioni | piazza d'adunata con torre littoria; 3-5 vuoti di bombe; INA-Casa a stecche; torri e parcheggi del boom; sopraelevata su piloni; le Vele; abuso sui tetti (`b.super`) | pianta + foto boom e Vele |
| **G** | **Rocca e spianata** | `world_cittanuova.js` FORT/WALL (righe ~1140-1200), `render.js` [inverno] PAESAGGIO (Muro) | fossato allagato con arco, cortina 12 m, bastioni, caserme addossate, governatore, polveriera; il bordo demolito del borgo: case mozzate (`b.mozza`) e muri ciechi; aggiunte 1986 del Garante | foto spianata e Rocca, di giorno e di notte |
| **H** | **Tetti come livello** | `tetti.js`, `render.js` [ordine1] TETTI, [inverno] TETTI VISSUTI | tetti continui nel borgo (dislivelli ≤ 1 piano), coppi/lastrici per epoca, superfetazioni E7, passerelle del boom, camminamento sulle mura; via i "tetti strani" | foto dall'alto + prova di percorso sui tetti (`test_tetti.js`) |
| **I** | **Scorci e luce** | `render.js`: CIELO, luci, POST, LUCE COTTA, camera; `sets` di arredo dei nodi | sei landmark col loro colore di notte; regola dei 60 m nel borgo (gomiti, archi, sottopassi: in accordo con E); fondale per ogni piazzetta; tre luci di scena (borgo/metropoli/spianata); **strumento di foto automatiche da 20 punti fissi** per tutte le chat | la galleria dei 20 scorci |
| **J** | **Verde e infrastrutture** | `world_cittanuova.js` verde/zone, `render.js` [verde], [isola38] | niente prato di risulta: villa comunale, giardino del convento, fossato-giardino, orti sulla scarpata, palme del lungomare, tigli del Corso; moli, bitte, pontili; piloni della sopraelevata (con F) | pianta: zero GRASS fuori dai giardini |
| **K** | **Città viva** | `eventi.js`, `popolo.js`, routine NPC; legge `sets` e `b.shopFront` | i posti per le situazioni (dehors, pensiline, angoli, retrobotteghe, lotti vuoti, porte della città) e le scene per ora del giorno: consegne, postino, pizzo, gang, fuochi, botteghe che aprono e chiudono | prova di una giornata accelerata, conteggio scene per posto |
| **L** | **Pulizia e prestazioni** | strumento nuovo `strumenti/collisioni.js`; `render.js` [pulitore1] FUSIONE | validatore automatico delle compenetrazioni (oggetti dentro muri, scale nelle gronde, arredo in carreggiata) con lista e foto; draw call < 300 sulla città; memoria telefono | report numerico prima/dopo ogni unione |
| **M** | **Texture dipinte a mano** | atlanti nuovi in `assets/` + i materiali in `render.js` che B e D le chiedono | intonaci, calce, tufo, travertino, cemento, lamiera, basoli, porfido, asfalto, coppi: un atlante per epoca, coerente, con usura; **non** lo stesso modulo ovunque | tavola campione per epoca + foto |

## Ordine e dipendenze
1. Subito in parallelo: B, C, D (già in corso), E, F, G, H, L, M.
2. Dopo la prima unione di E/F/G: I (scorci sul tracciato definitivo), J, K.
3. La regista unisce in quest'ordine: scheletro (E, F, G) → tetti (H) → superfici (B, M, D) → botteghe (C) → verde (J) → luce (I) → vita (K); L gira prima e dopo ogni unione.

## Regole di convivenza
- Un file-sezione ha un solo proprietario; chi ha bisogno di un campo nuovo sui dati (`b.*`, `rd.*`, `sets`) lo chiede alla regista, che lo mette nel tassellatore o lo aggiunge, e lo documenta qui sotto.
- Campi dati già disponibili: `b.era` (E0 E2 E3 E4 E6 E7), `b.torre`, `b.annesso`, `b.portico`, `b.shack`, `b.low`, `b.rk`, `b.door`, `rd.era`, `rd.kind`, `rd.alberi`, `rd.pennoni`, `W.sets` (mercato, sagrato, adunata, piazzetta/bar/forno, marina, calata), `CITY.spian0`, `CITY.rail`, `CITY.staz`, `CITY.marina`.
- In arrivo: `b.shopFront` (C), `b.mozza` (G), `b.super` (F), `b.cieco` lato muro cieco (regista).
- Commit in italiano, descrittivi; niente push su `main`; niente PR senza richiesta.
