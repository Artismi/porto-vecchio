# [costa] Il plastico della tavola della costa

Studi di massa e colore per la tavola C-1 (non la grafica del gioco). Si usa la stessa camera del gioco (fov 14°, yaw 45°, beccheggio 0,78) e la luce bassa fuori stagione.

- `kit.js`: terreno da una riva disegnata, mare a fasce, e i pezzi (balaustra, lampioni, palme, pini, casa cantoniera, cartelloni del Garante, casematte, barche, reti…).
- `s_<scorcio>.js`: lungomare, giardino (villa comunale), cantoniera, faro, dune, galleria.
- `node strumenti/plastico_costa/scatta.js lungomare faro …` crea `out_<scorcio>.png` nella cartella. Bisogna prima copiare `src/three.min.js` accanto a `pagina.html`.
- `tavola_modello.html`: la pagina della tavola, con i segnaposto `{{nome}}` per le immagini. Le foto compresse stanno in `_immagini/costa/`.
