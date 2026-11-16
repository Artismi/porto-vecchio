# Compenetrazioni: barche, moli, mezzi, persone (scansione nel gioco vero)

Come: `node banco/compenetrazioni_pw.js` (Pixel 7, `?commedia&molo`, alle 7:20 del secondo giorno, Nino alla marina). Si confrontano le
scatole in coordinate di gioco: i mezzi (`st.vehicles`, lunghezza e larghezza da `Game.VK`), le barche ormeggiate (`World.SEA.moorings`,
lunghezza `len`, larghezza stimata 0,38·len), i moli e pontili (`World.SEA.structs`: la polilinea `pts` con la larghezza `w`), le persone
(`st.npcs`, fuori e non in un mezzo). Dati grezzi in `banco/compenetrazioni.json`. È una scansione a scatole: segnala, non dimostra.

## Persone sopra mezzi e barche (movimento degli NPC)
- 1 caso: Daniela (pp72, con la Mente) a (1330,7; 394,7) **sulla barca a vela ormeggio 10**, in `routine` di popolo (non in un piano della
  Mente): il punto di sosta di popolo attorno alla marina cade sulla barca. Da sistemare in `popolo.js` (la scelta dello `spot` del posto:
  scartare i punti dentro `SEA.moorings` e `st.vehicles`).
- Corretto nel sistema unico (`unico_mente.js`, `libero`): ogni «vai» della Mente (anche l'avvicinarsi a una persona) scarta i punti fuori
  dal camminabile o dentro un mezzo o una barca (ferma, ormeggiata o di passaggio) e prende il primo punto libero a 1,2-4,8 m.

## Barche dentro i moli (scenario fisso, non toccato)
| barca | dove | struttura | quanto entra | chi la mette | proposta |
|---|---|---|---|---|---|
| peschereccio, ormeggio 27 | (1310; 435,9) | `molo_vecchio` (molo) | 0,39 m | `world_cittanuova.js` ~1808: `SEA.moorings.push({ kind: 'peschereccio', y: 241 - 2.5 - 2.6 … })` | scostare di 0,5 m verso il mare (y − 0,5) o accorciare `BOATLEN.peschereccio` |
| nave, ormeggio 31 | (1583; 408,1) | `molo_cargo_s2` (molo) | 1,86 m | `world_cittanuova.js`, il porto cargo (~1813-1820, la nave di fianco al molo nord) | spostare la nave di 2 m dal ciglio del molo |
| due «secca» (ormeggi 51, 52) | (894; 279,7) | una sull'altra | — | `world_cittanuova.js`, gli ormeggi della secca | distanziarle di una lunghezza |

## Mezzi uno dentro l'altro (scenario fisso e parcheggi)
18 coppie in due mucchi, tutti mezzi parcheggiati (`vv*`) e due del traffico (`tr*`):
- attorno a (1294-1298; 309-312): due autobus (vv28, vv29) uno sull'altro, con un Ciao, una Vespa e il traffico (tr3) dentro;
- attorno a (1299-1304; 337-344): Ape, Ritmo, Giulia, Ciao, la volante (vv8, vv9, vv11, vv13, vv19, vv22, vv25).
Li mette `game.js` ~561 (`V(id, kind, place, dx, dy …)` con `parkSpot`): `parkSpot` non tiene conto dei mezzi già messi. Proposta: in
`parkSpot` scartare i punti a meno di (len_a + len_b)/2 da un mezzo già parcheggiato, e far fermare il traffico prima dei parcheggiati.

## Pali di legno
Non trovati nella scansione: i pali dei pontili non stanno in `World.SEA` come oggetti con una scatola (li disegna `render.js` dalle
strutture). Serve una scansione delle mesh (`Box3` dei pali contro le barche) in `render.js`, fuori dai file del sistema unico.
