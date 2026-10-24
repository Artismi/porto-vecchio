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
