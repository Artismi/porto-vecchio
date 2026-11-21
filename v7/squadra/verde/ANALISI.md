# [verde] Perché la vegetazione «manca di varietà»: la misura

Misura in Node, senza foto: `node strumenti/verde_varieta.js` (da v7; `PV_PRIMA=1` dà com'era). Lo strumento rifà con le stesse
regole gli alberi di città di render.js (`alberiCitta35` e `albero4`, render.js:8162-8258), i ciuffi del kit «natura» di
`verdeCitta35` (render.js:8259, stesse estrazioni di `rng`), il piano di vegetazione.js e il verde di città nuovo, e conta, in un raggio
di 35 m (quello che il telefono vede del suolo) attorno a 12 posti dove va la camera: piante, specie, modelli distinti, specie
dominante, e i disegni che la posa del verde attorno alla camera (`Vegetazione.monta`) chiede lì.

## Com'era (base 78a27be)

| posto (35 m) | piante | specie | dominante | disegni del verde (tel) |
|---|---|---|---|---|
| Corso Garibaldi | 13 | 2 | leccio 92% | 9 |
| Piazza dell'Ottagono | 14 | 3 | leccio 86% | 11 |
| Piazza San Rocco | 2 | 1 | leccio 100% | 0 |
| Vicolo dei Lanternini | 2 | 1 | leccio 100% | 0 |
| Lungomare (Passeggiata a mare) | 6 | 1 | leccio 100% | 0 |
| Spiaggia del Lido | 3 | 1 | leccio 100% | 0 |
| Marina del porto | 4 | 1 | leccio 100% | 0 |
| Piazza della Rocca / la Rocca | 3 / 2 | 1 / 2 | leccio | 0 |
| Lungomare di Tramontana | 6 | 1 | leccio 100% | 0 |
| Giardini di Ponente (fuori città) | 30 | 8 | oleandro 27% | 24 |

Tutta la città: **95 alberi, 92 lecci (97%) e 3 pini**, quattro modelli di leccio (`Leccio_0..3`) e uno di pino. Nessuna palma (la
Via della Marina e il Lido avevano lecci sulla sabbia), nessun bagolaro sul Corso (l'accordo dell'HANDOFF_vegetazione non è mai
stato fatto: il Corso ha `alberi: 'tigli'` e diventa leccio, render.js:8185).

Le cause, in ordine di peso:

1. **Una specie sola in città.** La città è la formazione `urbano` con `strati: []` (vegetazione.js:153): il piano del verde, con le
   sue 38 specie, si ferma al confine della città. Quello che resta lo fa render.js, e `albero4` dà a tutti il leccio (in piazza larga
   il pino al 35%). **36 specie su 38 del kit non comparivano mai in città**: palme, oleandri, bouganville, edera, agavi, fichi
   d'India, capperi, agrumi, tamerici erano definite e mai posate.
2. **Lo strato basso è generico e uguale.** Ai piedi dei muri e nelle aiuole 2.404 ciuffi del kit «natura» (7 modelli:
   `Grass_Wispy_Short` 607, `Grass_Common_Tall` 640, `Plant_1` 265, `Fern_1` 241, `Bush_Common` 346, `Plant_7_Big`, `Plant_1_Big`):
   erba e felci da bosco, nessun fiore, nessuna pianta mediterranea dei muri. E la camera vede proprio questo: 35 m di suolo e i
   primi 3 m delle facciate. Sui muri (2.590 facce di muro su ciottolato, piazza, marciapiede, banchina) non c'era niente.
3. **La stessa tinta.** Gli alberi di città prendono uno di quattro bianchi quasi uguali (`#ffffff #f2f4ea #f8f6ee #eef2e8`:
   ±3% di valore, nessun giro di tinta, render.js:8248); i ciuffi cinque bianchi verdini; la posa del verde nuovo ±8% di valore e basta
   (vegetazione.js `metti`, era :1340). Scala sempre uniforme, piega quasi nulla.
4. **I fiori diventano verde-marrone.** Il materiale del verde dipinge ogni pixel sulla GAMMA unica (vegetazione.js:1028-1040) e
   lascia passare solo il 45% della tinta (`uTintaSpecie`): il magenta della bouganville (`#c8287a`) usciva bruno-rosato, il rosso del
   papavero spento. Gli «accenti pochi e saturi» della tavolozza (vegetazione.js:75) non arrivavano allo schermo.
5. **Il ritmo è a passo fisso.** I filari di Chiarezza sono un leccio ogni 12-14 m su un lato (chiarezza.js:81-91): giusto per la
   lettura dei fronti, ma è l'unico ritmo della città.

I vasi alle porte, sui balconi e sui tetti invece sono già vari (Arredo3D.vasoCaso, render.js:16733: limone, buganvillea, agave,
monstera, gerani, ortensie, erbe; cotto, smaltati, dipinti, riusati): sono cotti nei tasselli e qui non li ho toccati.

## Dopo l'intervento

| posto (35 m) | piante | specie | dominante | disegni del verde (tel) |
|---|---|---|---|---|
| Corso Garibaldi | 30 | 6 | leccio 40% | 15 (+6) |
| Piazza dell'Ottagono | 29 | 7 | leccio 41% | 17 (+6) |
| Piazza San Rocco | 15 | 6 | cappero 27% | 8 (+8) |
| Vicolo dei Lanternini | 6 | 4 | leccio 33% | 4 (+4) |
| Lungomare | 8 | 4 | palma 50% | 6 (+6) |
| Spiaggia del Lido | 8 | 5 | palma 38% | 7 (+7) |
| Marina del porto | 11 | 5 | leccio 36% | 5 (+5) |
| La Rocca | 32 | 10 | cappero 34% | 8 (+8) |
| Lungomare di Tramontana | 17 | 5 | leccio 35% | 7 (+7) |

In città 16 specie nuove, ~280 piante (bouganville 49 in cinque tinte, edera 24, capperi 58, papaveri 20, finocchietto 24, agavi 23,
rosmarini 23, agrumi 10, palme 6 + washingtonie 4, oleandri, fichi d'India, tamerici, mirti). Le prove sono in
`src/test_vegetazione.js` (sezione 7). I disegni per fotogramma sono qui sotto.

## I disegni per fotogramma (il vincolo del telefono)
- **Telefono** (la posa del verde, `Vegetazione.monta`, contata in Node sulle stesse regole: un InstancedMesh per specie|variante entro
  30 m, uno per specie a media distanza; niente ombre sul telefono): via +9, piazza +6, lungomare +5, Villa +7; nei 12 posti della
  tabella da +4 a +8. Sempre sotto +15. I ciuffi e gli alberi di render.js non cambiano numero di modelli (stesse mesh, solo tinte
  e scale), quindi zero disegni in più da lì.
- **Computer** (renderer.info sommato su tutti i passaggi di un fotogramma, SwiftShader, `strumenti/verde_tavola.js`):
  via 451 → 477 (+26: le nuove piante fanno anche l'ombra del sole, un disegno in più a testa), piazza 811 → 824 (+13),
  lungomare 366 → 367, Villa 525 → 532. Sul computer le ombre del verde ci sono; se servisse, le piante `vicino` di città potrebbero
  non farle (oggi la chiave della mesh è condivisa con le stesse specie in collina: chi nasce prima decide).

## La tavola (`_immagini/squadra/verde/varieta_prima_dopo.jpg`)
Si vede bene la via (bouganville viola e magenta sui muri e sull'arco, l'edera sul muro a destra) e la piazza (la bouganville sul
muro dietro la fontana). Sul lungomare e nella Villa la camera del gioco guarda dall'alto: delle palme (8-11 m) entra solo il fusto,
le chiome restano fuori quadro; lì la differenza nella foto è piccola. Non verificato a occhio: le agavi e gli oleandri al piede delle
palme, le rocce della Rocca, la ghiaia di Tramontana, la tinta degli accenti fuori dalla via.
