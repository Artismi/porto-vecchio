# [vegetazione] Il verde dell'isola — passaggio di consegne

Branch `claude/pv-vegetazione` (da `claude/gallant-dijkstra-sa2548`). Modulo: `src/vegetazione.js` (piano in Node + kit THREE + materiale).
Banco: `strumenti/vegetazione_tavola.html` (scene `?scena=…`), foto: `node strumenti/vegetazione_tavola.js <cartella> [scene]`.
Tavola per l'utente: https://claude.ai/artifact/Ds8ZMEa54gaZADSW13VQYw. Immagini: `_immagini/vegetazione/`.

## Stato
- Censimento fatto (tavola, sez. «Com'è oggi»): in città 0 alberi; `buildNat` si ferma senza il kit natura (render.js ~1569).
- Piano a formazioni (`piano`, `pianta`, `copertura`, `misura`): deterministico, gira in Node. NON ancora agganciato al mondo né al render.
- Kit: chiome a lobi (nucleo + ciocche di pennellate grigie tinte dalla specie), rampa a tre fasce nel materiale (`U.uRamp`, `uOmbra`, `uLuce`…),
  regola dei contorni nel prato (massa senza profondità, pochi eroi).
- In attesa dell'ok dell'utente sulla direzione pittorica (riferimenti: boschi dipinti, radura col rudere dall'alto). Non costruire prima.

## Accordi con le altre chat
- Costa: tutte le piante della riva passano qui (duna, canneto, costiere, lungomare, Villa Comunale a mare x 1150-1276 y 400-455), comprese
  `c2Forme` e `W.SEA.costa2.piante`; tenere sparto, giglio di mare, ginepro. Usare `W.costaSuolo(x,y)` (in arrivo) per escludere sabbia bagnata e roccia nuda.
  Tono «fuori stagione» (palme sfrangiate o mozze, pini piegati dal maestrale): da confermare con l'utente per tutta l'isola.
- Pianta (sez. 14 di MAPPA_COMPATTA.md, pushato fino a 13f4cc5):
  - Viale della Spianata (id `passeggiata`, x 1467,5): lecci, `alberiLato:-1`, `alberiOff:5`.
  - Corso: bagolari (specie da aggiungere al kit).
  - Lungomare di Tramontana (`lung_nord`): niente filare; al più tamerici nei piazzali delle baracche.
  - Via della Marina (`marina`): niente alberi sul tratto del porto; sul tratto lungo il Lido (x 1405-1467, y 388-406) una fila di palme o tamerici dal lato case.
  - Via del Lido (`passeggiata_sud`, x 1467,5, lungo il muro del Recinto): niente alberi.
  - `W.sets` k:'ottagono' (1274,343 r 16): piazza alberata con fontana e 8 lecci già caselle TREE (disegnarli col kit).
  - Liberi: carreggiate e marciapiedi, Piazza della Rocca (1474-1504 × 316-339), Riva della Rocca (al più 2-3 alberi a chioma alta),
    la Vittoria, il recinto del Garante. `W.glacis` = case del glacis sulla spianata.
