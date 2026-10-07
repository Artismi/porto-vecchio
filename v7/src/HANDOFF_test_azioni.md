# Porto Vecchio — Test d'azione (7 ottobre 2026)

Porting a v7 dei cinque test della radice storica (combattimento, polizia, fisica, guida, distruzione), previsti dalla decisione 4 del consolidamento ([`CONSIGLI-IMPLEMENTATIVI.md`](../../CONSIGLI-IMPLEMENTATIVI.md) §1.2). Con loro è arrivata la parte di convenzioni della radice ancora valida.

## Cos'è cambiato

- I test girano su `game.js` + `world.js` + `interiors.js` soltanto (niente Popolo/Risacca: come i test radice, il combattimento si prova sul motore puro).
- Firma comune: `node test_<nome>.js [seme]` (default il seme del test radice).
- Le differenze dalla radice, scoperte portando:
  - **muraglioni**: in v7 `MAP.wallAt` è vuota (nessuna casella muro) e il ramo «facciata» di `vehicleBump` è disattivato: le brecce nascono **solo dalle esplosioni** (`blastMap`/`explode`). `test_distruzione.js` prova quello.
  - **corsie**: la mappa non ha la litoranea rettilinea della radice; ogni test di guida/fisica cerca da solo la corsia rettilinea ≥ 70 m più lunga e tutta percorribile (`straight()`), oggi la Costiera Sud (`litoranea`, 147 m).
  - **carjacking**: l'auto del traffico si ferma solo se il giocatore sta **davanti** sulla traiettoria (il motore la frena, non basta stare accanto).
  - **`ensureVel`**: quando un test posiziona un mezzo a mano, `speed` va assegnata **prima** di `vx/vy` (o lasciando `_spd` disallineato), altrimenti `ensureVel` riallinea la velocità al muso e la vettura parte da ferma.
  - **pedone investito**: chi scappa va a ~5 m/s; per provare il volo si mette il pedone **sulla traiettoria** (`n.y = v.y + (n.x − v.x)·tan(ang)`) e fermo (`n.wait`).

## File toccati

- Nuovi: `test_combattimento.js`, `test_polizia.js`, `test_fisica.js`, `test_guida.js`, `test_distruzione.js` (in `src/`).
- Radice: i cinque test originali archiviati via `git rm` (recuperabili dalla storia git), insieme agli altri sorgenti della radice.

## Come provarlo

Dalla cartella `src/`: `node test_combattimento.js` (o polizia/fisica/guida/distruzione). Escono con codice 0; l'output è di lettura (wanted, rinforzi, derapate, brecce).

## Da fare

- Un `npm test` unico che giri tutti i `test_*.js` con seme fisso (voce P2 dei consigli).
- Il test della grafica (Playwright, 100 frame) resta da costruire: la radice aveva `shot.py`/`physshot.py`/`dzshot.py`, v7 ha `strumenti_inverno/shot_gioco.js`.
