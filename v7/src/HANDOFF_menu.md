# HANDOFF — Bottino in scena e Menu a valigetta (5 ottobre 2026)

## Bottino in scena (`src/bottino.js`)
- Frugare non è più un pulsante. Ogni posto da frugare è un oggetto 3D semplice appoggiato a terra:
  cestino, scatolina di cartone (vicolo), rottami, fascina (bosco), cassa portata dal mare, sacco (prateria), cassetta militare, casse dei posti (discarica, cantiere…), casse di carico al porto (lucchetto rosso se chiuse).
- Clic sull'oggetto: il protagonista ci va. La roba sparsa si raccoglie tutta da sola; mobili, casse chiuse, corpi e bagagliai aprono la scheda Frugare.
- Dentro casa si clicca il mobile; il bagagliaio si clicca dietro l'auto; chi è a terra stordito ha «Tasche» nel menu attorno alla persona; i morti si cliccano.
- Dati: `Oggetti.lootables(st, r)` (oggetti.js) dà tutto il frugabile con la posizione. Tolti dalla barra «Fruga: …» e «Cerca qui intorno».
- main.js: `pickAt` chiede prima a `Bottino.pick`; nuovo tipo di clic `loot`.

## Il Menu (`src/menu_ui.js`)
- Una valigetta sola, colonna di schede a sinistra: **Zaino** (griglia: la roba grande occupa più caselle, dettaglio, Nino con le armi e le barre), **Nino** (bisogni, conti, quello che sai fare dal mestiere, amici), **Banco** di lavoro (ricette a tessere, ingredienti con icone), **Lavori** (il tuo, chi cerca gente con distanza e direzione, «Vai lì»), **Qui** (le cose da fare sul posto).
- Compaiono quando servono: **Bottega** (il commerciante disegnato al banco con l'insegna, la merce in vetrina, Compra/Vendi) e **Frugare**.
- Icone pixel 16×16 per tutti i 374 oggetti: una sagoma per famiglia (`SHAPE`, `FAM` in menu_ui.js), il colore dall'oggetto. Le armi usano le icone di tasche_ui.
- Tasti: I o Z zaino, K banco, 1-5 schede (a menu aperto), doppio clic usa/impugna/compra/fai, Esc chiude. Il gioco va in pausa.
- Collegamenti: `OggettiUI.open('zaino'|'lavora'|'banco'|'fruga')` e `TascheUI.toggle` passano al Menu; lo Scambio resta il pannello vecchio.
- In scena la fila di pulsanti di `#rs-here` è diventata un riquadro solo, «Qui · N cose da fare», che apre la scheda Qui. `RisaccaUI.doHere` è esportato.

## Da fare
- Abilità vere del personaggio (in v7 non c'è un sistema di esperienza: la scheda Nino mostra quello che il mestiere permette di fare).
- Scambio nello stile nuovo.
- Provare a schermo vero la grandezza degli oggetti del bottino con la camera del gioco.
