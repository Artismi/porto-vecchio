# HANDOFF — Editor dentro il gioco (F2)

Il mondo nasce sempre uguale dal codice. L'editor non tocca il codice: tiene un elenco di **ritocchi** in `v7/ritocchi.json`
(più le texture dipinte in `v7/ritocchi/*.png`), che il gioco rimette sopra a ogni avvio.

## Come si usa
- Avvia con `AVVIA.bat` (serve il server: `server.js`, o `server.ps1` se manca Node). In gioco premi **F2**: il mondo si ferma, a destra c'è il pannello.
- Ogni modifica si salva da sola sul file dopo un attimo (stato in cima al pannello). Ctrl+S salva subito.
  Senza server (Vercel, doppio clic sul file) Ctrl+S scarica `ritocchi.json` e i `.png`: vanno messi a mano in `v7/` e `v7/ritocchi/`.
- Il server, la prima volta che salva in una sessione, copia la versione di prima in `ritocchi.backup.json` (non va su GitHub).
- Vista: WASD/frecce (Maiusc veloce), Q/E gira, rotella zoom, rotella premuta gira. Esc lascia la selezione, F2 esce. Ctrl+Z / Ctrl+Y annulla e rifà (anche la pittura).

### 1 · Sposta
- Fuori: clic su un oggetto di strada (lampioni, panchine, casse, vasi, cestini… quelli che si rompono). Dentro un edificio: i mobili del piano dove sei.
- Trascina per spostare (Ctrl: passi di 25 cm). `R` ruota 15° (Maiusc al contrario, Alt 1°), PagSu/PagGiù altezza, `+`/`−` scala, Canc toglie, Ctrl+D duplica, «Com'era» torna all'originale. Numeri esatti nel pannello.
- Dentro: «Aggiungi un mobile» con la ricerca (tutti i mobili del kit, gli `ia_*` e le postazioni); compare al centro della vista.

### 2 · Colore · 3 · Materiale · 4 · Timbro · 5 · Gomma
Si dipinge sulle texture che il codice disegna su canvas: facciate, murales, insegne, terreno, pavimenti e pareti degli interni. Non sui modelli dei kit (Kenney ecc.), che sono immagini condivise.
- **Colore**: tinta piena, con grandezza (in metri), durezza, opacità. `[` `]` o Ctrl+rotella cambiano la grandezza.
- **Materiale**: il materiale si ripete **agganciato al mondo** (per terra sugli assi x/z, sui muri lungo il muro e in altezza), quindi le piastrelle restano in fila fra un tratto e l'altro e fra texture diverse. Alt+clic mette l'angolo di una piastrella in quel punto; frecce del pannello per spostarlo di un pixel; scala e rotazione di 90°.
  Libreria: i materiali veri del gioco (strade e suoli da `render.js`, pavimenti e pareti da `interni_arte.js`), più quelli presi dal mondo.
- **Timbro**: Alt+clic su qualunque texture (anche un'altra, anche fuori quando poi dipingi dentro), poi dipingi: copia seguendo il pennello, alla stessa scala in metri. Nell'anteprima: clic sposta il punto, trascina sceglie un riquadro → «Usa come materiale» (per prendere una piastrella da una facciata e stenderla in fila).
- **Gomma**: riporta la texture com'era uscita dal codice.

## Come funziona (per chi tocca il codice)
- `src/editor.js` (caricato subito dopo three.js): sostituisce `THREE.CanvasTexture` con una sottoclasse che registra ogni canvas.
  Al primo caricamento sulla scheda video calcola l'**impronta** dei pixel (`<larghezza>x<altezza>_<hash>`) solo se esiste una pittura salvata di quella misura,
  e se combacia ci disegna sopra il PNG. Quindi una pittura resta attaccata finché il codice disegna quella texture uguale; se cambia il generatore, la pittura resta orfana (il file c'è, non si applica).
- Oggetti di strada: sono fusi nelle mesh statiche (`addStatic`); l'editor riscrive i loro vertici (e normali) nella mesh fusa, aggiorna il record della distruzione (`DZ.props`), la luce e l'alone dei lampioni. Chiave: posizione d'origine `x,y,z` (+`#n` se due coincidono).
  Copie: cloni del gruppo d'origine aggiunti alla scena (non si rompono).
- Interni: `Interior.layout(b).floors[f].furn` viene ricostruita dall'originale + ritocchi (chiave `id@x,y`); collisioni (`solid`) e bottino seguono. Chiave edificio: `b.x,b.y`.
- Agganci segnati `[editor]`: `render.js` (oggetto `__ed`, camera che segue `ui.focus`, `materiali()`), `interni_arte.js` (`userData.furn`, scala `o.s`, `materiali()`), `interiors.js` (esporta `szOf`), `main.js` (caricamento, pausa, camera), `index.src.html` (lo script), `server.js` / `server.ps1` (`/api/ritocchi`, `/api/ritocchi/png`).
- **Se `render.js` viene rigenerato dalla catena degli script, gli agganci `[editor]` vanno rimessi.**

## Limiti noti
- Fuori si sposta il disegno: gli ingombri che `game.js` segna sulla mappa (`Game.layout`) restano dove l'oggetto era nato.
- Alberi e vegetazione (instanziati), edifici e oggetti troppo grandi non si selezionano ancora.
- Una texture usata da più oggetti (es. l'atlante delle parti piccole di un edificio, un pavimento in cache) cambia dappertutto.
- Due texture identiche al pixel hanno la stessa impronta: la pittura va su entrambe.
- I mobili si modificano solo nel piano dove si trova il giocatore.
