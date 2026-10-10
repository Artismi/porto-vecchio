# Porto Vecchio — Writer: la scala dei lavori, i tetti, il treno della miniera (9-10 ottobre)

La sottocultura delle bombolette diventa un sistema di gioco. Le basi stanno in `tetti.js` e `writing.js` (con pochi agganci
segnati `[writer]`); sopra ci sono `writer_arte.js` (il disegno dei lavori), `writer_mano.js` (l'handstyle delle tag) e
`writer_vita.js` (i writer NPC che escono di notte): per quelli valgono le intestazioni dei file.

## La scala dei lavori (writing.js)
| lavoro | misura | tempo (tasto premuto) | bombolette | fama |
| --- | --- | --- | --- | --- |
| tag a pennarello (mop) | 1 × 0,42 m | 1,4 s | — (un pennarello = 40 tag) | 1 |
| tag a spruzzo | 1,5 × 0,62 m | 2,6 s | 0,06 | 1 |
| throw-up | 2,7 × 1,3 m | 9 s | 0,7 | 4 |
| pezzo | 4,8 × 2,05 m | 32 s | 2,2 | 12 |
| burner | 6,6 × 2,5 m | 60 s | 4 | 25 |
| gotico (verticale) | 1,4 × 3,2 m | 16 s | 0,5 | 6 |
| personaggio (mostro) | 3 × 2,6 m | 40 s | 2,6 | 12 |
| whole car (burner sul treno) | fiancata intera | 110 s | 7 | 45 |

- **Il disegno** sta in `writer_arte.js` (famiglie di lettere, riempimenti, sfondi, personaggi, tavolozze) e `writer_mano.js`
  (la tag a punta larga di ogni writer); `writing.js` decide cosa si dipinge, dove e quanto vale.
- **Si dipinge a strati**, come un writer: riempimento → fondo → keyline, 3D e contorno → luci e dettagli. Ogni tappa
  avanza da sinistra a destra; chi dipinge si sposta lungo i lavori grandi, la mano segue la vernice (posa `vernicia`).
  Lasci il tasto: resta a metà (si riprende cliccandoci sopra). Finite le bombolette: resta a metà.
- **I comandi**: bomboletta in mano, **B** cambia modalità (libero · tag · throw-up · pezzo · burner); tieni premuto il
  sinistro. La rotella sceglie la tavolozza (8, anni '80). Col **pennarello** in mano il clic fa sempre la tag.
  Il pennarello si compra in ferramenta e dal tabaccaio.
- **La fama**: in alto (più di 3,2 m da terra: heaven spot) ×2,5; dal tetto ×1,5; sul treno ×2 (e ogni mattina che il
  treno esce col pezzo ancora +35%); davanti alla gente fino a +40%; sopra a un toy +20%. Ranghi: toy, writer,
  king della zona, king della linea, all city king.
- **Le regole della strada**: si va sopra solo a chi sta più in basso nella scala. Una tag su un pezzo, o un lavoro
  sopra uno dello stesso livello, è un crossaggio: beef con la crew, e la notte ti crossano (X nera e la loro tag).
- **I Grigi**: ogni lavoro finito scalda (W.heat, si dimezza ogni mattina); oltre una soglia arriva l'avviso della
  Celere e i lavori diventano eventi di vandalismo (la polizia del motore li sente).

## I writer dell'isola
Tre crew di ragazzi giovani: **PVK** Porto Vecchio Kings, **BDS** Banda della Scogliera, **TNT** Treni Notte Tunnel
(`writing.js`: scelta dei writer, beef, crossaggi, notizie del mattino, buff). Come escono di notte, dove dipingono
(muri, hall of fame, heaven spot dai tetti, il deposito del treno), il palo e la fuga dai Grigi: `writer_vita.js`.
Per strada ti salutano se hai fama (o ti minacciano se c'è beef); oltre 60 di fama una crew ti chiede di entrare
(menu «Qui, adesso»). Nel menu c'è anche la tua scheda di writer (clic: cambi la tag).
Il buff: i muri vengono ripuliti dopo qualche giorno; il treno si lava dopo tre giorni di linea.

## Il treno della miniera (game.js `railLine`, writing.js)
- **La linea** (1116 m, `layout().rail`, un punto ogni metro con quota e «sul mare»): dalla Stazione di estrazione Nord
  corre nel bosco a monte della Costiera Nord, tra il monte e il mare; prima della città scavalca la strada e passa su un
  viadotto a dieci metri dagli scogli (le case lì arrivano alla riva); oltre il Muro scende lungo il primo pontile e
  finisce sulla banchina del porto militare della Base. Pendenza massima 2,5%, rilevato dove il bosco sale.
  Le caselle sotto il binario diventano massicciata (GRAVEL, anche in MAP0): niente alberi tra le rotaie.
- **Il convoglio**: due diesel D.345 (in testa e in coda) e quattro carri, due chiusi Gbs e due tramogge col carbone.
  Dodici fiancate con canvas propri: si dipingono a mano libera come un muro e coi pezzi.
- **L'orario**: deposito alla miniera 22:00-6:00 (il momento dei writer); di giorno quattro corse da 250 minuti
  (90 di viaggio, 30 fermo al porto militare, 90 di ritorno, 40 alla miniera). Fermo si dipinge, in moto no.
  Chi sta sul binario viene spostato di lato; se il treno è in moto fa male.
- **La grafica**: massicciata e rilevato (nastro di vertici), viadotto con piloni ogni 12 m, traversine e rotaie
  (InstancedMesh), paraurti, cartelli «MINIERA NORD» e «PORTO MILITARE».
- Il vecchio binario di raccordo al porto (20 m, due carri fermi) è rimasto com'era.

## I tetti (tetti.js)
- **Una scala di ferro per ogni edificio** (due per i grandi): sul fianco o sul retro, mai davanti alla porta, meglio
  negli angoli; se non c'è un lato libero parte dal tetto più basso del vicino. Montanti, pioli ogni 30 cm, gabbia
  sopra i 2,5 m, corrimano che scavalca il bordo (tre InstancedMesh per tutta l'isola).
- **V** ai piedi: sali (1,7 m/s); **V** in cima: scendi. Suggerimento in basso e voce nel menu «Qui, adesso».
- **Sopra si cammina**: la quota viene misurata sul modello (un raggio dall'alto ogni metro: terrazzi, falde, comignoli,
  parapetti); prima della misura vale la regola dei piani (3,6 m + 2,4 a piano). Gradini fino a 65 cm; il bordo ferma;
  da tetto a tetto si passa se si toccano, sopra i vicoli si salta (Spazio). Atterrare nel vuoto: giù in strada.
  Cadute oltre 4,5 m fanno male. `p.onRoof` apre la roba sui tetti di oggetti.js.
- La casa sotto i piedi non sparisce più (render.js, dissolvenza degli edifici) e la bomboletta arriva a 2,6 m sopra
  i piedi anche sul tetto: i muri dei palazzi più alti diventano heaven spot.

## Agganci
- `render.js`: `R.__buildings` (i modelli degli edifici), dissolvenza dai piedi veri, portata dello spruzzo, 160 veli.
- `main.js`: pennarello e modalità della bomboletta passano a `Writing.tick` / `Writing.release`; sui tetti il clic va dritto.
- `game.js`: `railLine` dentro `layout()`.
- `oggetti.js`, `azioni.js`, `tasche_ui.js`, `anim_vita.js`: il pennarello (oggetto, negozi, icona, in mano).
- `index.src.html`: `tetti.js` e `writing.js` dopo `skate.js`.

## Prove
`node test_tetti.js` (scale, salita, bordo, salto fra due tetti, caduta) · `node test_writing.js` (linea, orario,
spinta, crew, notte, fama, heaven spot, crossaggi, lavaggio, menu, pennarello) · `node test_writer_vita.js`.

## Studio tag (le firme disegnate a mano)
- `v7/studio_tag.html`: si sceglie il writer, si disegna la tag col mouse o la tavoletta (punti, tempi, pressione), le anteprime mostrano la resa del gioco a bomboletta e a pennarello. «Salva firma» la scrive nel browser e, col server di AVVIA.bat, in `v7/tag_firme.json` (endpoint `POST /api/tag_firme` in server.js, con `tag_firme.backup.json`).
- Il gioco carica le firme da `tag_firme.json` e dal browser (`WriterMano.loadRecorded`); una firma registrata vince su tutto (`handTag`: registrata → disegnata (SIGNED) → generata col movimento sigma-lognormale).
- La resa delle firme registrate è fedele: la pressione della tavoletta, la velocità appena, la chiusa corta e tonda.
- Ogni tag salvata nello studio è un PRESET: i writer dell'isola prendono i nomi prima dai preset (writing.js recruit), poi dalla lista; «È la mia tag» sceglie il preset del giocatore (`_mia` in tag_firme.json, `WriterMano.MIA`, usato da playerAka).
- LA TAVOLETTA (modalità B «tavoletta», writing.js `tavTick`/`tavRelease`/`tavPad`): si trascina sul muro o su un mezzo la finestra, il gioco fotografa la zona con una camera ortogonale (fino a 2048 px), si disegna sopra a tutto schermo (pressione, colore, spessore in cm, pennarello o bomboletta), «Applica» crea un lavoro del giocatore con `w.rec` (art() lo rende con WriterMano.drawRecorded in modalità frame: il disegno resta dove e com'è). Stile per area: mtag, tag, throw, pezzo. Vernice per lunghezza del tratto.
- Il giocatore parte coi gadget: la BMX in tasca, lo skate (`st.skate.owned`), 4 bombolette e il pennarello.
