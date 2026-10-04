# Porto Vecchio — v7 «Monte Scuro»: entroterra, bosco del kit, scavo e livelli (4 ottobre 2026)

## Cosa c'è
### Entroterra come la Calabria (`world.js`, sezione «L'ENTROTERRA: IL MONTE SCURO»)
- `monte(x, y)` → `{ h, f }`: quota e segni del terreno (`MF`: 1 terrazza, 2 calanchi, 4 fondo gola, 8 fiumara, 16 altopiano, 32 guglia, 64 cima, 128 borgo).
- Massiccio dalla foresta alla periferia ovest: scarpata della Sila sopra la prateria → **altopiano a 16 m col lago gelato** (LAKE.h 15.6) →
  **Pizzo del Monte Scuro a 30 m** → Passo dei Pini (14 m) → Monte dei Pini (21 m) → giù verso il centro. Fianchi con valloni e speroni.
- **Gola del Lupo** a nord: pareti a picco, fondo di ghiaia, **cascata gelata** in testa, sentiero sul fondo e sentiero sul ciglio.
- **Fiumara dei Carbonai** a sud: letto di ghiaia largo fino alla caletta, guado, ponte rotto.
- **Terrazze degli ulivi** (fianco sud-est) e vigne sotto San Giacomo: gradini di 2 m con muri a secco (non si passano, ci sono scalette).
- **Borghi arroccati** sugli speroni (San Giacomo, Borgo dei Carbonai), **Paese Vecchio** abbandonato, **Le Cinque Dita** (guglie), **Calanchi** a nord-ovest.
- Caselle nuove: `T.CLIFF` (19, parete o muro a secco, non si cammina, blocca la vista) e `T.GRAVEL` (20, ghiaia). Le pareti sono segnate solo per x 140–380.
- Strade di montagna `MONTI` con quote disegnate (tornanti, cenge): Strada del Valico, Mulattiera dei Tornanti, Sentiero della Gola, del Ciglio, Cengia del Romito, Passo dei Pini…
  Le costiere ora girano attorno al massiccio fino a x 156; il Raccordo di Ponente chiude a ovest.
- Luoghi nuovi con `scoperta: true` (compare «Hai scoperto: …» la prima volta): pizzo, neviera, cascata, gola, ponte_diavolo, fiumara, dita, paese_vecchio, calanchi, eremo, romito, altopiano, passo, sorgente.
- Tutti gli id vecchi restano; spostati: sangiacomo, vigne, villaggio, oliveto, caletta, macchia, sentiero, sugheri, ovile, lago, radura, sorgente, pozzo_o, campeggio_o; edifici cantina, ovile_b, chiesa_sg, osteria_sg, masseria.
- Esporta in più: `feat`, `MF`, `monte`, `BRIDGES`, `CAVES`.
- Ogni albero è una casella `TREE` (anche quelli isolati in campagna e prateria): si abbattono tutti con l'ascia (`paesaggio.js`), resta il ceppo.

### Livelli: sotto terra e sul ponte (`livelli.js`, nuovo, caricato dopo `paesaggio.js`)
- `st.player.lv`: null | `{k:'ug'}` | `{k:'ponte', id}`. `st.lv`: scavi (`ug`, `fl` quote del pavimento), portali, stanze.
- Tasti: **H** scava (in superficie: botola dove sei, o cunicolo se guardi una parete; sotto: avanti in piano), **J** in discesa, **K** in salita, **N** stanza 3×3, **V** sali/scendi da botole e pozzi.
  Le stesse azioni sono nelle Tasche («Qui, adesso»). Servono la pala (terra) o il piccone (roccia; nuovo oggetto, ferramenta / cava / stazioni).
- Scavando, se il pendio scende fino al pavimento del cunicolo la terra cede e si esce in un altro punto della mappa. «Apri una botola sopra» esce dove sei.
- Grotte naturali già scavate: **Grotta del Romito** (dal fondo della gola a un pozzo sul ciglio, col toro inciso) e **Eremo del Romito** (dalla cengia all'altopiano).
- **Ponte del Diavolo** sulla gola: sopra si cammina sulle assi, sotto si passa sul fondo.
- Sotto terra non ti vede nessuno (`seesPlayer`).
- Ritocchi a `game.js` (marcati `[monte]`): `walkT`/`solidM`/`opaqueM` con CLIFF, `tryMove` chiede a Livelli, `movePlayer` chiama `Livelli.moved`, niente spinta delle auto sotto terra.

### Grafica (`render.js` via `strumenti_inverno/monte_render.py`, si applica dopo gli script inverno)
- **Kit Natura** (Quaternius Stylized Nature MegaKit, CC0) in `assets/mk/kit_natura.json`, caricato con gli altri kit (`main.js`).
  Rigenerare: `node pack_natura.mjs <cartella glTF del kit> assets/mk/kit_natura.json` (texture ridotte e ricolorate, foglie diradate a ~1000 triangoli per albero).
- `natura_kit.js`: entro ~58 m dalla camera ogni albero è un modello del kit (pini larici sull'altopiano, ulivi/lecci contorti sulle terrazze, castagni e faggi spogli a mezza costa);
  composizione a macchie e radure, sottobosco ai piedi (felci, cespugli, erba alta, funghi sotto gli alberi secchi), massi con le felci, ciottoli sui bordi dei sentieri, pietre sui cigli delle terrazze, ceppi.
  Lontano restano gli alberi semplici. Le chiome tra camera e giocatore si aprono (retinatura).
- Pittura: pareti a strati, ghiaia con rigagnoli gelati, calanchi d'argilla; poca neve sulle pareti.
- Posti: croce di vetta, neviera, cascata gelata, ponte rotto sulla fiumara, eremo; Ponte del Diavolo; botole, imbocchi, pozzi.
- `sottosuolo_render.js`: sotto terra sparisce il mondo di sopra, restano cunicoli, puntelli, stanze, lanterna.
- Camera: **,** e **.** girano la visuale, anche la rotella premuta e trascinata; **O** visuale dall'alto; quando la montagna copre il giocatore la visuale sale da sola.
- Niente più alberi finti sui marciapiedi.

## Prove
- `node test_vita.js 2 1`, `node test_azioni.js 1 1`: passano.
- Prova dello scavo (in `tools/test_livelli.js` nel container di Claude): grotta, botola, cunicolo che sbuca sul pendio, eremo, ponte.

## Da fare
- Screenshot a schermo: ok la pineta dell'altopiano, la gola, la cima, la grotta. Le terrazze restano un po' a scacchiera (griglia di 2 m).
- NPC: non usano ponte e cunicoli. Le guardie non trovano le botole.
- Bivacchi e sentieri ad anello della vecchia collina ovest attraversano il massiccio: da ricontrollare uno per uno.
