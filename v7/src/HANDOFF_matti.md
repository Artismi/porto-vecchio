# Porto Vecchio — Le stranezze degli altri (23 ottobre)

Richiesta: dare a dialoghi, scene e personaggi un tono comico. Chi gioca deve spesso trovare qualcosa che lo stupisca e lo faccia ridere: la sensazione di quando, dal nulla, finisci dentro la vita di qualcun altro e nelle sue stranezze. Cattiveria e sfottò sì, crudeltà no. Niente battute spiegate, niente barzellette. Tutto è leggero: nessuna IA, nessun modello nuovo, pochi conti per fotogramma.

## Ispirazione
- GTA: il meglio sono le telefonate e le frasi fuori luogo dei passanti («I'm on my lunch break», «My iguana Angelina died»), non le battute in sé.
- Red Dead Redemption 2: gli incontri strani che tornano (i personaggi ricorrenti).
- Fallout New Vegas, «Wild Wasteland»: ogni tanto la normalità si rompe.
- Cinico TV (Ciprì e Maresco), Amici miei: i personaggi grotteschi di quartiere, la serietà nell'assurdo.

## `src/matti.js` (nuovo, si carica dopo `eventi.js`)
1. **I frammenti**: ogni 35-75 s, se due abitanti sono vicini a te (2,5-11 m) e a meno di 3,6 m tra loro, senti un pezzo della loro storia a due o tre voci (`FRAM`, 42 frammenti mescolati in un mazzo: non tornano finché non li hai sentiti tutti).
2. **I matti di quartiere** (`MATTI`): il Generale, la Contessa, il Profeta, Nonno Peppino lo smemorato, il Venditore di niente. Sono abitanti veri, scelti all'avvio fra chi non è del cast (`CAST`): il primo vicino a casa di Nino, gli altri sparsi. Quando gli passi accanto (5,5 m) ti dicono la loro (`passa`), le volte dopo ti riconoscono (`ritorno`), da lontano parlano da soli (`solo`). La chat dell'IA riceve `stranezza` (soprannome, fissazione, voce) e la scheda di `Risacca.CARDS` comincia con la fissazione.
3. **23 scene nuove** per `eventi.js` (si aggiungono a `Eventi.SCENE`):
   - i matti: `matto_generale`, `matto_contessa`, `matto_profeta`, `matto_smemorato`, `matto_venditore` (filtro `matto|old`: se non c'è un matto vicino recita un vecchio qualunque con le battute di riserva);
   - la vita degli altri: `prova_discorso`, `prova_pianto`, `chi_muore_prima`, `vedova_panchina`, `lettera_garante`, `turno_arrabbiarsi`, `ora_esatta`, `confessione`, `pesce_addio`, `appuntamento_sbagliato`, `saluto_autobus`, `pecora_mancante`;
   - ti tirano dentro (vengono da te, al massimo una ogni 10 minuti come le altre): `fai_mio_fratello`, `leggimi_lettera`, `sei_tu_pacco`, `parola_a_caso`, `nonno_ti_riconosce`, `tienimi_posto`.
   - Battuta nuova `ML(ruolo, chiave, riserva)`: dice la battuta del matto di quel ruolo.

## Righe toccate fuori da matti.js
| File | Cosa |
| --- | --- |
| `eventi.js` | filtro `matto`; `sayEv` esportato in `Eventi._`; una variante spiazzante in più in 44 gruppi di battute (le frasi normali restano: la sorpresa funziona se non è sempre). |
| `game.js` | `COMBAT_BARKS`: qualche frase fuori luogo per Grigi, Squalo, Marsigliesi. |
| `azioni.js` | `LINES` delle chiacchiere, sfottò, liti. |
| `mente.js` | `stranezza` nei dati del personaggio per la chat. |
| `api/_mente.js`, `server.js` | il tono del prompt: regole della comicità; chiacchiere e battute del Coro come pezzi di vita altrui. |
| `index.src.html` | `<script data-m="matti">` dopo `eventi.js`. |
| `test_eventi.js` | carica `matti.js`. |

## Prove
- `cd src && node test_matti.js [seme]`: i 5 matti, la scheda per la chat, i frammenti sentiti in 6 minuti, il matto che ti parla e ti riconosce.
- `node test_eventi.js [seme]`: le 23 scene nuove partono, finiscono e lasciano liberi gli attori.

## Da fare
- Più frammenti e più matti (il formato è solo dati). Un sesto matto per la Base o per il Monte Scuro.
- Far scrivere nuovi frammenti all'IA di notte (il Coro), con questi come esempi.
- Una sottile reazione del giocatore (una scelta di risposta) alle scene che vengono verso di te.

## I ragazzi e le manie (29 ottobre)
Richiesta: il linguaggio dei ragazzi di oggi (la siga, il drum, «hai da accendere?», bella, fra, zio, oi, fottiti), ma non troppo cattivo; e altre stranezze come la sedia da ufficio con le rotelle, assurde e basta.
- **`FRAM_G`** (26 frammenti): se i due che parlano hanno tutti e due ≤ 26 anni (`CFG.giovane`) pescano dal loro mazzo. Niente battuta finale: la scena si chiude un attimo prima. «Fottiti» fra amici è affetto.
- **`SCROCCO`**: un ragazzo che ti passa a meno di 3,8 m ogni tanto ti chiede da accendere (una volta a testa, ogni 70-150 s al massimo).
- **Scene nuove**: `drum_condiviso`, `fottiti_affetto` (fra ragazzi), `hai_da_accendere` (viene da te).
- **`MANIE`**: otto abitanti (scelti all'avvio dopo i matti) fanno sempre una cosa sola: due leggono il giornale camminando, uno gira con la cornetta del telefono senza filo, uno porta un cero acceso, uno spinge una carriola vuota, uno porta una cassa, uno saluta tutto (a tratti), uno guarda l'orologio (a tratti). La posa la mette `anim_vita.js` (`n.pop.mania` → `s.upper`; si ferma dentro una scena, al chiuso, nel panico). Nessuno lo spiega: se gli passi accanto dicono una cosa normale («Permesso.», «Buongiorno.»). Anche chi va in sedia con le rotelle adesso ti dice qualcosa (`ROTELLE`).
- Prove: `node test_matti.js [seme]` (le manie, la frase quando passi, il mazzo dei ragazzi), `node test_seduti.js` (la posa delle manie).
- Da fare: manie con un oggetto nuovo (l'ombrello aperto col sole, il guinzaglio senza cane, chi cammina all'indietro: serve girare la figura in render.js come `Anim.rotelleYaw`).

## Coerenza, parlato street, folla (29 ottobre, dopo)
Richiesta: i personaggi devono comportarsi in modo sensato e dire cose collegate (difetto visto: uno ti dice «ho sentito che hai sparato in strada», silenzio, poi «ti va una sigaretta?»); il parlato di tutti i giorni più street; la gente sembrava poca o ammucchiata. Deve sembrare vivo.
- **`Game.tono(st, n)`** (game.js): da quello che ricorda di te → `paura` | `rancore` | `complice` | `sospetto` | null. Una sola regola per tutto quello che ti viene detto.
- **`maybeBark`** (game.js): quando ti nomina un fatto, il seguito viene dal tono (paura: «Io non ho visto niente, va bene?»; complice: «Stai attento, che i Grigi ti cercano.»; sospetto: «Io non voglio problemi.»). Segna `n.__tonoT`: per 10 minuti niente chiacchiere leggere con te.
- **Chi ha un tono non ti fa battute**: le scene che vengono da te (eventi.js, `freddo`), lo scrocco, le manie e i matti (matti.js) lo saltano.
- **Le voci a due** (`Matti.voce`): il 60% dei frammenti sentiti passando, se uno dei due sa una cosa fresca (ultime 30 ore), parla di quella: chi la porta («L'ho visto io:» o «Hai sentito?»), il posto con la preposizione giusta, l'altro risponde secondo quello che sa (da chi l'ha saputa, o «Quando?»), la chiusa secondo la gravità. Chi la sente adesso la sa (`addMemory`, fonte «voce»).
- **Street**: fino a 30 anni le chiacchiere, gli sfottò e le liti di azioni.js (`LINES_G`) e le frasi di riserva di popolo.js (`chatLine`) hanno il loro registro (fra, zio, oi, «come butta?», «fottiti, va'»).
- **Folla** (popolo.js): si vive per intero fino a 84 m (prima 52; la nebbia comincia a 85 e fra 52 e 140 m le strade erano vuote), uscita a 98; chi è al chiuso conta 45 m in più per il tetto, così passa avanti chi si vede; tetto 84 (prima 70, sempre pieno). Chi si sveglia poco dopo l'inizio di un blocco compare sulla strada fra il posto di prima e quello nuovo (`inViaggio`) e cammina. Telefono invariato (40/50/36). Misura a seme 3, Nino fermo a casa: fuori 50 → 55-71, in cammino 4-17 → 11-30.
- Prove: `node test_matti.js [seme]` (tono, voce, niente scrocco da chi ti ha visto sparare).
