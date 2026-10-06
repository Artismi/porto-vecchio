# HANDOFF — Lo Studio (editor.html)

Una versione del gioco a parte, solo per costruire: niente personaggio, niente gente né traffico, una camera che gira.
Si apre con `AVVIA.bat` e poi `http://localhost:8642/editor.html` (con il server le modifiche si salvano da sole in `ritocchi.json`
e in `ritocchi/`). `build.py` scrive sia `index.html` (il gioco) sia `editor.html` (lo stesso con `window.PV_STUDIO = true`).

## Le tre sezioni (barra in alto; c'è anche l'ora del giorno)
- **Mappa** — tutta l'isola. A destra gli strumenti dell'editor (vedi HANDOFF_editor.md): sposta/togli/duplica gli oggetti, colore,
  materiale, timbro, gomma, «Posa un modello caricato». **Doppio clic** su un oggetto: la vista isolata del suo modello. Doppio clic su un edificio: ci entri.
- **Interni** — a sinistra tutti gli edifici (cerca per nome o uso), si entra, si cambia piano, si muovono e aggiungono mobili. Doppio clic su un mobile: il suo modello.
- **Modelli** — l'**hangar**: ogni modello del gioco in fila, per categoria, col cartello:
  mobili e oggetti degli interni · arredo di strada (una voce per forma, con quante volte c'è) · pezzi dei covi · bottino per terra ·
  oggetti (quelli in mano: dove il modello manca c'è un segnaposto) · vestiti (su un manichino) · pezzi degli edifici (kit per kit) · modelli caricati.
  WASD si muove, Q/E gira, tasto destro trascina per guardare, rotella avvicina. A sinistra la ricerca e le categorie (clic: ci vai).
  Clic: prendi un modello. **Doppio clic: vista isolata. Esc: indietro** (alla mappa o agli interni se venivi da lì).

## Vista isolata: modificare un modello
- Clic su un pezzo: lo prendi. Lo trascini (Maiusc: su e giù), R/T/G ruotano su tre assi (Maiusc al contrario, Alt di 1°), PagSu/PagGiù alzano, +/− misura, Canc toglie, Ctrl+D duplica.
  Nel pannello: posizione, rotazione, misura per asse e colore; «Com'era» per il pezzo; «Rimetti i pezzi tolti»; «Torna com'era» per tutto.
- **Aggiungi una forma**: box, cilindro, sfera, cono (poi la sposti e la colori come gli altri pezzi).
- **Sostituisci con un .glb**: il modello diventa il file caricato, alla stessa misura di prima (si può togliere la spunta). Anche i pezzi del .glb si modificano.
- **Oggetti senza modello**: «Carica il suo modello (.glb)» → lo si vede in mano ai personaggi.
- **Vestiti**: colore, spessore, dove copre (parti del corpo), e un .glb agganciato a un osso (con posizione, rotazione, misura).
- **Carica un modello nuovo (.glb)** (a sinistra nell'hangar) e **Posalo** dove vuoi: fuori diventa un oggetto sulla mappa, dentro un mobile.
- Ctrl+Z / Ctrl+Y annullano anche qui.

## Dove finiscono le modifiche (ritocchi.json)
- `modelli`: `{ chiave: { file?, fit?, parti: { i: { p, r, s, c, togli } }, nuove: [ { t | da, p, r, s, c } ] } }`.
  Chiavi: `mobile:<id>`, `kit:<pezzo>`, `strada:<impronta della forma>`, `pezzi:<nome>`, `bottino:<tipo>`, `ogg:<id>`, `glb:<file>`.
  `i` è la posizione della mesh nell'ordine di visita del modello originale (o del .glb che lo sostituisce).
- `vestiti`: `{ id: { col, sp, parti, modello: { file, osso, p, r, s } } }`. `files`: i .glb caricati (in `ritocchi/modelli/`).
- Le copie posate: in `copie` con `mod: <chiave>`; i mobili posati dentro: `nuovi` con l'id (`glb:…`, `kit:…`, `pezzi:…`).

## Come funziona (per chi tocca il codice)
- `src/officina.js` (in tutte e due le pagine): applica le modifiche quando il gioco costruisce un modello.
  Agganci `[studio]`: `render.js` `addStatic` (arredo di strada, riconosciuto dall'impronta della forma, prima della fusione),
  `Kit.get`, `Models.furniture`, `Pezzi.*`, `Bottino.MODEL.*` (avvolti all'avvio), `interni_arte.js` (ogni mobile), `vestiario.js` (dopo il vestito; oggetto in mano).
- `src/studio.js` (attivo solo con `PV_STUDIO`): avvio senza gente, barra, sezioni, hangar (un secondo renderer three.js), vista isolata.
  Nell'hangar il gioco sotto non disegna e non va avanti (`Studio.hidesGame`).
- `server.js` / `server.ps1`: `/api/ritocchi/file?nome=x.glb` salva in `ritocchi/modelli/`.

## Limiti noti
- L'arredo di strada e i pezzi degli edifici sono fusi nella città: le loro modifiche si vedono sulla mappa (e nel gioco) dopo aver ricaricato la pagina.
  Mobili, vestiti, oggetti in mano, covi e bottino cambiano subito.
- Solo file `.glb` (un file unico); un `.gltf` con i file a parte non si carica.
- Persone e veicoli non sono nell'hangar.
