# Porto Vecchio — La BMX tascabile (8-9 ottobre)

Come la bici dei Pokémon: ce l'hai sempre in tasca, la tiri fuori quando vuoi.

## Comandi
- **P** (o il pulsante **BMX** sul telefono): tira fuori la BMX e ci salti sopra. **P** di nuovo, oppure **F**, per scendere: la pieghi e torna in tasca. Nel mondo non resta niente: nessuno te la può rubare, e Sandro non la compra.
- **La BMX è punta e clicca**: clic a terra e ci vai, come a piedi (anche col dito sul telefono).
- **Andatura dal ritmo dei clic** (a piedi e in BMX): un clic entro 0,4 s dal precedente alza l'andatura di un gradino (a piedi: cammini 4,2 → corri 6,4 → scatti 7,8 m/s; in BMX: pedali piano 55% → forte 80% → a tutta). Un clic lento mentre ti muovi la tiene: non serve cliccare a raffica. Si torna al passo quando arrivi. In `main.js`: `bumpPace`, `ui.pace`, `inp.pace`.
- **Salto** (a piedi e in BMX): tieni premuto **Spazio** per caricare (fino a 0,7 s), rilascia per saltare. A piedi da 0,28 a 0,67 m, in BMX (bunny hop) da 0,30 a 1,17 m. In auto lo Spazio resta il freno a mano. Sul telefono è il pulsante Freno.
- **Trick in BMX con le frecce** (tenute premute):
  - **giù / indietro**: impennata. Bici e ciclista ruotano attorno al punto dove la ruota dietro tocca terra; si continua a pedalare.
  - **sinistra / destra**: il piede di quel lato esce sulla pedalina (il peg posteriore), il corpo si alza dal sellino e si sporge da quel lato; si va a ruota libera.
  - In BMX le frecce non muovono più (si guida col clic). WASD guida ancora, come prima.

## Regole
- Non si tira fuori al chiuso, sotto terra o sui ponti (`p.lv`), a nuoto, con un corpo in spalla, né quando sei già su un altro mezzo.
- Non brucia e non esplode: se la colpiscono forte ti butta giù (un attimo stordito) e torna in tasca intera (`damageVehicle`). Scendere in corsa non fa male.
- Niente motore (`audio.js` non suona), niente fari, niente officina (`protagonista.js`).

## Dove sta
- `game.js`: `VK.bmx` (`two: true, pocket: true`, 9 m/s), `bmx()`, il salto (`JUMP`, `jumpHold`, `jumpStep`; `p.jz`, `p.jvz`, `p.jcharge`; la bici salta con te: `v.jz`), l'andatura (`PACE_BMX`, `v.pace`), i trick (`bmxTricks`: `v.wheelie` 0-1, `v.peg` −1 destra … +1 sinistra), `v.pedal` (le pedivelle girano solo quando pedali).
- `render.js`: `bmxMesh` come una BMX vera (telaio crema, forcella e manubrio alto neri, cerchi viola, gomme grasse, pegs sui mozzi, pedivelle in un perno che gira con le ruote), misure in `BMX_GEO`; `bmxTilt` per l'impennata; la visuale in BMX guarda meno avanti e sale col salto.
- `anim_lotta.js`: le pose `in_bmx` (i piedi SUI pedali con l'IK `legTo`, le mani alle manopole con `armTo`, busto in avanti; carica, aria, impennata, pedalina), `carica` e `salto` a piedi. Le misure di `BMX` lì devono restare uguali a `BMX_GEO`.
- `audio.js`: suoni `jump` e `land`.

## Prove
- `node test_bmx.js`: passa (tasca, salto, andatura, trick).
- Pose controllate di lato nello Studio delle pose (`studio_anim.html`) con segnaposti su pedali, peg e manopole.
