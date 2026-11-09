# La casa di ognuno (9 novembre)

La richiesta della direzione artistica:
«in casa più che costruire prendono e spostano, arredano a piacimento per dare alla casa un carattere che gli garbi, ridipingono
i muri, proprio come può fare il giocatore; considera che tutti gli NPC se entrano nella banda diventano giocabili, quindi tutti
possono fare tutto».

Tutto sta in **`src/casa.js`**, dietro `?commedia`, caricato dopo `iniziative.js`, fuori dall'impronta dei tasselli
(`build.py --senza-cotto` → `impronta 48196fd63f899c14`). Nessun altro file di `src/` è toccato. Spento il flag: `Casa = { ON: false }`,
nessun aggancio. La prova è `src/test_casa.js`; le catture `_immagini/commedia/casa_prima.jpg` e `casa_dopo.jpg`.

**In una riga.** Un solo stato e un solo insieme di verbi: la pianta del piano (`Interior.layout(b).floors[f]`), quella su cui il
motore cammina, che `interni_arte.js` disegna e che `Oggetti` fruga. Abitanti, giocatore e membri della banda la cambiano con le
stesse funzioni (`Casa.fai`), e il registro delle case (`st.casa.case[bi].ops`) tiene chi ha fatto cosa.

---

## 1. Cosa c'era (audit)

| cosa | dove | note |
|---|---|---|
| la pianta e l'arredo | `interiors.js:766 layout` (cache per edificio, seme dalla posizione), `furnish`, `SURF` (:557), `szOf`, `walk` (:1192), `reachAll` (:1177), `findPath` (:1217) | ~276 `ia_*` (`FNAME` :1288, `DECOR`, `SMALL`, `PICK`) + ~45 mobili del kit; ogni stanza ha `wall`, `floor`, `dirt` (:880) |
| il disegno | `interni_arte.js` `wallStyleCanvas` (:193: calce, verde, blu, ocra, rosso, crema, ospedale, rosa, azzurro, carte da parati…), `build`; `render.js:20494 R.__ed.rebuildIndoor()` | il colore della parete è uno **stile** (`q.wall`), non un esadecimale: si ridipinge cambiando lo stile |
| prendere | `oggetti.js:1765 pickGone` → `o.taken = true` + `rebuildIndoor` | le chiavi dei contenitori sono `b<bi>:<f>:<indice>`: niente si toglie dalla lista |
| piazzare, spostare, girare, togliere | `cantiere.js:414 place`, `:438 remove`, arredi al chiuso con `lv 'in:b:f'` (`:192 lvOf`) | solo nel covo del giocatore, e `place` legge la posizione del giocatore: non chiamabile per un abitante |
| il formato dello Studio | `editor.js:149-178 applyInterior` (non esportata), `RIT.interni` | strumento di sviluppo (F2), non del giocatore in partita |
| ridipingere | **nel gioco non c'era** (solo il pennello dello Studio, `RIT.pittura`) | ora c'è: `Casa` verbo `dipingi`, anche dal menu del giocatore |
| quando si entra | `game.js:273 enterBuilding` → `HOOKS.indoor` (anche sulle scale, :1898) | è qui che le righe in attesa vanno in opera |
| chi abita dove | `popolo.js:427` nuclei, `n.pop.homeT` (`{k:'b', bi}`), `:1904 homeFloor` (non esportata: copiata) | nei condomini un piano per famiglia |
| chi è dentro con il giocatore | `popolo.js:2002 roomStep`, `n.room` (punto, posa, passo), `roomWalk` | la scena di casa usa questo |
| la banda | `risacca.js:827 join`, `n.ris.member`, `n.ris.auto` (libero arbitrio: false = lo guida il giocatore), `st.ris.bases` | |
| la roba | `n.pop.inv`, `n.pop.casa` (`scambi.js take/put`), `economia.js:109 buy` | le stesse voci delle tasche del giocatore |
| furti | `popolo.js:832` scasso del ladro (solo soldi), `st.events` tipo `scasso` | casa.js ci aggiunge la cosa |

**Mancava** (e si è aggirato da fuori): un verbo «sposta/ridipingi» del giocatore (ora nel menu QUI, ADESSO, agganciato a
`Azioni.playerActions`); `applyInterior` e `homeFloor` esportati (copiati, poche righe); un compagno/fidanzamento in `popolo.js`
(per il gusto c'è `Casa.evento(st, n, 'partner')`, da chiamare quando ci sarà).

## 2. I verbi (gli stessi per tutti)

`Casa.fai(st, chi, bi, verbo, dati)`: `chi` è un abitante o `'player'`. Ogni verbo fa un **piano** sulla pianta (dove prende, dove posa,
la posa del corpo, cosa in mano) e lo mette in opera con le primitive `Casa.M` (sposta, togli = `o.taken`, posa in coda alla lista,
parete, pavimento, sporco). Nessuna voce esce dalla lista: le chiavi di `Oggetti` restano giuste.

| verbo | cosa fa | la roba vera |
|---|---|---|
| `finestra` | una sedia/poltrona alla finestra, girata verso fuori | — |
| `tv` | la televisione in mezzo alla stanza, davanti al divano | — |
| `scambia` | due cose di posto | — |
| `posa` | una cosa in casa (appesa, su un piano, per terra; i mobili pieni solo se resta tutto raggiungibile) | dalle tasche: comprata (`Economia.buy`), regalata (`Vita` regalo), rubata, fatta (stoffa → bandiera, candele → altarino) |
| `pianta` | divide una pianta che c'è: un vaso in più | — |
| `butta` | via il kitsch, via il ciarpame | — |
| `dipingi` | lo stile della parete della stanza principale (o di quella scelta) | calce o vernice, consumate |
| `pavimento` | lo stile del pavimento | assi, stoffa, mattoni… |
| `sporca` | giù di corda: sporco, bottiglie, la sedia rovesciata | — |
| `riordina` / `ospiti` | via il ciarpame, le sedie tornano a posto (prima di un appuntamento a casa) | — |
| `prendi` | portar via (il ladro): `o.taken`, la cosa nelle tasche del ladro con la provenienza | — |

**I colori** sono gli inchiostri della Bibbia dello stile (§1), mai vermiglio, limone, allarme: carta → calce, osso → crema,
pesca/ocra → ocra, cotto/mattone → rosso, cielo → azzurro, acqua → ospedale, oltremare → blu, salvia/persiana → verde, rosa → rosa.

## 3. Il gusto

Un vettore per persona, stabile (seme dall'id): **ordine, kitsch, sobrio, collezione, verde, tv, tifo, ribelle**, più un colore e un
pavimento suoi. Viene da puntualità, fede, età, interessi (`intW`: sport, lettura, musica, campagna, cinema…), mestiere, soldi.
Si sposta con la vita: **vincita** (i soldi saltano: tv, kitsch, voglia di lampada e radio), **lutto** (l'ordine cala, la candela),
**banda** (ribelle, il colore cambia, lo stencil), **partner** (da chiamare). Il gusto pesa i verbi; le **voglie** (la vernice, la
stoffa, i dischi) si comprano davvero quando si passa dalla bottega giusta (o, lontano dal giocatore, dopo otto ore), e quello per cui
si è comprato si fa alla volta dopo.

## 4. Lontano, vicino, dentro

- **Lontano**: le righe si accumulano nel registro, senza fare la pianta (costa ~17 ms). Il fatto nasce subito solo per i cambi certi
  (parete, cosa portata); gli altri quando la pianta c'è (si sa cosa è successo davvero).
- **Quando la pianta c'è** (il giocatore entra: `HOOKS.indoor`; le case vicine nel tempo libero del browser, una per volta) le righe
  vanno in opera, in ordine. Rifatte su una pianta nuova danno la stessa casa (la prova lo controlla).
- **Dentro, col giocatore allo stesso piano**: la scena. L'abitante va (percorso dritto o per le porte), prende (`prende`), porta con la
  cosa in mano (`porta`, `n.hand`), posa, dipinge (`vernicia`), spazza (`spazza`), torna al suo posto; poi la battuta.

## 5. Le battute e i fatti

Poche e vere: dicono la cosa appena fatta, ≤ 70 caratteri, nella fila dei frammenti (`Matti.S(st).q` con l'ombra, `Commedia.contesto`,
il cane da guardia di `Parola`), una sola scena in attesa. Ogni battuta ha il suo fatto (`Vita.fatto`, tipi `casa_*`).
Le **visite**: chi entra in casa di un amico (o di un parente, o di uno della banda) nota i cambi («Hai ridipinto? Di blu? Coraggio.»).
Il **furto**: lo scasso porta via una cosa vera dalla pianta della vittima; il ladro la mette in casa sua; la vittima in visita la
riconosce (`scasso → furto_casa → ricettato → riconosce`) e se lo segna come furto: il conto aperto di `vita.js` fa il resto.

## 6. La banda e la casa del giocatore

- Nessun abitante tocca la casa del giocatore, i covi, le basi della Risacca; **se ci abita ed è della banda sì** (la casa è condivisa,
  le battute lo dicono: «Ho spostato la sedia alla finestra. Casa di tutti, no?»).
- Chi entra nella banda tiene la sua casa. Se il giocatore lo guida (`ris.auto = false`) da solo non tocca niente; il giocatore,
  in casa sua, ha nel menu gli stessi verbi (ridipingi, sposta alla finestra, metti in casa, butta). Quando torna a fare da sé,
  le sue righe e quelle del giocatore stanno nello stesso registro.

## 7. Costo

Il passo legge l'orologio e basta; ogni 10 minuti di gioco un sesto della città (chi è a casa, sveglio, libero). Misurato in prova:
~0,02-0,03 ms a passo in media. Le piante non si fanno mai nel passo. I picchi (rari, ~40 passi su 36.000 oltre 1 ms) sono il percorso
della scena quando serve l'A* di `interiors.js` (fino a ~20 ms, una volta per scena, solo col giocatore in casa) e i giri del gusto.

## 8. Limiti noti

- Il colore è uno stile di `interni_arte.js` (12 inchiostri → 9 stili): due inchiostri vicini danno la stessa parete.
- Lo Studio (F2) che rimette i suoi ritocchi (`applyAll` all'annulla/rifai) rifà la lista dei mobili e cancella i cambi delle case
  toccate dallo Studio. In partita non succede.
- Le visite vere fra abitanti sono rare (le fa `popolo.js` «passa a trovare»); il furto riconosciuto in partita lo è di più:
  la prova lo mette in scena con i passi veri.
- Niente salvataggio della partita nel gioco: il registro vive con `st`.
