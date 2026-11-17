# Le caselle fantasma dei pezzi della città

Un pezzo (world_cittanuova.js) riserva le sue caselle piene con `pzRis(p, 'B', …)`: diventano `T.BLD`, ci si urta (`walkT`,
game.js) e render.js ci stende il suolo scuro. Dove la mesh (pezzi_citta.js) non copre il rettangolo, si vede una striscia scura e
si sbatte contro un muro invisibile. La Porta di Terra è sul ramo `mondo_fix` (MONDO_FIX.md); qui gli altri pezzi.

**La sonda**: `node strumenti/sonda_caselle_fantasma.js [tipo] [-v]` (13×13 punti per casella fra 0,3 e 1,8 m; `-v` la pianta:
`X` fantasma, `0-9` i decimi coperti dell'orlo). Questa è una ricostruzione: il ramo `mondo_fix` ha la sua, con lo stesso nome.

| pezzo | prima | cosa | dopo |
|---|---|---|---|
| Stazione | 10 | il pieno finiva a L + 3, il fabbricato a L: oltre resta pieno solo il marciapiede della pensilina (z < −5,5). Sul fianco liberato il terreno cade di ~4 m sulla Via Cavour: dove è ripido è un muro a secco (`T.CLIFF` con le lastre sul ciglio, la regola delle pareti di campagna) | 0 |
| Rivellino di scirocco | 12-14 | il rettangolo 16 × 15 ai lati del saliente: il pieno segue il pentagono, a strisce di una casella (la scarpa compresa) | 0 |
| Sottopassi a volta (2) | 3 ciascuno | il bordo di 1-1,5 m attorno alla casa: resta riservato (niente case accostate) ma selciato; pieno solo la casa (x 0-7,4, z ±4,5) | 0 |
| Scalinate della marina (2) | 4 e 2 | non era l'orlo: le strisce `B` a \|z\| 1,3-2,9 non hanno niente sopra. Selciate, aprivano un passaggio accanto alla scala (la Scalinata del Forno non era più una scorciatoia, il giro della marina sui tetti spariva): restano piene e le copre la mesh, i rinfianchi di tufo (`spalla`, nuova opzione di `T.scalinata`), misurati a case posate fino al filo delle caselle piene, a tratti, le facce parallele alla scala | 0 |
| Lavatoio | 3 | sotto la tettoia si passa: pieno solo la vasca, il resto piazza riservata | 0 |

In `?mappa=nuova` la stazione non ha la pensilina: il suo marciapiede torna suolo come i pezzi della ferrovia tolti (47 → 0).

**Perché a case posate** (`pzRifai`, `p.rifai`): sottopassi, scalinate e lavatoio riservano il pieno largo alla posa, come prima, e lo
riducono dopo le case e il terreno. Il generatore delle case legge la griglia e tira a sorte in fila (`r()`): una casella diversa
prima delle case rimescolava le baracche fino alla discarica, e l'autobus sepolto finiva fuori posto (test_mappa_compatta).

Le scalinate della marina riservavano col posto di prova (da A) e poi si spostavano al piede A1: `p.imp` ora è riportato al posto finale.

**Le prove** (prima → dopo): test_mappa_compatta passa (449 case, una casetta da 2 caselle sola nel selciato accanto al Vico dell'Arco
la toglie `casette()`, una accanto al Vico del Glacis resta); test_imperfezioni ora passa (salti 33 → 29); test_posa 6 → 5 prove
non passate (sotto il sottopasso del Glacis ora c'è il pieno), le altre come prima; test_percorsi come prima (21 scorciatoie, 5 giri);
pedonale, sottosuolo, lontano9, compenetrazioni, controlli8, chiarezza, riva, strada_dipinta, cotto, scorci, rifcostruito passano.

Resta, e non è di questo lavoro: il sottopasso del Glacis ha due case del tassellatore dentro il bordo (test_posa).
