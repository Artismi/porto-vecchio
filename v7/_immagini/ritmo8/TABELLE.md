# ritmo8: prima e dopo

I numeri completi in `prima_dopo.json` (banco a passi e percorso), `percorso_*.json` (per tratto: profilo per funzione e per modulo, allocazioni, long task, chiamate WebGL), `banco_*.json`, le sonde (`sonda_*.json`). L'analisi: `v7/ANALISI_RITMO8.md`.

## Prima e dopo

### Il banco a passi, portatile (tempo del filo: regge la contesa)

R.frame + G.step, 45 passi camminando, mediana di tre (`_immagini/ritmo8/banco_*.json`):

| Posto | ms di processore per fotogramma, prima → dopo | ms d'orologio | p95 d'orologio | triangoli provati per fotogramma | GC per fotogramma |
| --- | --- | --- | --- | --- | --- |
| nascita | **169 → 63 (−63%)** | 280 → 90 | 513 → 165 | 544.770 → 128.278 | 37,5 → 5,2 ms |
| vicolo | **89 → 54 (−40%)** | 161 → 66 | 290 → 100 | 99.819 → 56.992 | 12,4 → 3,9 ms |
| piazza | 64,5 → 59 (−9%) | 113 → 84 | 277 → 188 | 17.109 → 2.267 | 9,9 → 9,3 ms |
| lungomare | 46,6 → 43,9 (−6%) | 76 → 51 | 120 → 81 | 4.771 → 317 | 7,9 → 2,0 ms |

### Il banco a passi, telefono (390×844 a dpr 3, tocco, profilo leggero)

| Posto | ms di processore per fotogramma, prima → dopo | ms d'orologio | p95 d'orologio | triangoli provati per fotogramma | GC per fotogramma |
| --- | --- | --- | --- | --- | --- |
| nascita | **158,8 → 51,6 (−67%)** | 204 → 148 | 365 → 426 | 544.021 → 127.651 | 31,4 → 6,0 ms |
| vicolo | **82,0 → 50,2 (−39%)** | 122 → 104 | 220 → 248 | 108.427 → 56.993 | 13,9 → 5,8 ms |
| piazza | **52,9 → 46,6 (−12%)** | 80 → 73 | 142 → 116 | 2.589 → 2.320 | 11,2 → 7,7 ms |
| lungomare | **44,6 → 34,4 (−23%)** | 61 → 56 | 164 → 163 | 4.810 → 199 | 3,9 → 5,2 ms |

Il telefono qui è il profilo del telefono (tocco, dpr 3, tela a dpr 2, i dati dei raggi dei tasselli solo entro 6 m) sul processore di questa
macchina: conta il rapporto. I ms d'orologio della seconda corsa sono saliti con la contesa (alla nascita 45 passi in 14,9 s d'orologio
contro 2,8 s di processore): per gli scatti fa fede il tempo del filo.

### Il percorso (tempo vero; i ms assoluti dipendono dalla contesa del momento)

Le tre corse una dopo l'altra, la stessa strada. **Attenzione**: il carico della macchina (altri agenti) è salito da ~8 a ~14 fra la
prima e l'ultima: i ms per giro d'orologio non sono confrontabili fra corse (lo stesso disegno di three, codice non toccato, in auto passa da 90 a
211 ms per giro). Contano le quote dentro la stessa corsa (il braccio sul giro), le allocazioni, il GC, i graffiti sul filo e i long task per colpevole.

| Tratto | Corsa | JS per giro media / p95 / p99 (ms) | braccio camera7 % del giro | graffiti sul filo (ms/giro) | allocazioni (kB/giro) | GC (ms/giro) | disegni |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| fermi alla nascita | main | 380 / 730 / 1378 | 68% | 30,9 | 92180 | 16,8 | 377 |
| fermi alla nascita | main, ieri spento | 136 / 371 / 871 | 0% | 16,2 | 15496 | 10,9 | 311 |
| fermi alla nascita | ritmo8 | 194 / 482 / 790 | 23% | 0,0 | 15151 | 7,6 | 374 |
| vicolo | main | 221 / 494 / 784 | 33% | 16,4 | 28020 | 10,5 | 665 |
| vicolo | main, ieri spento | 132 / 337 / 486 | 0% | 11,2 | 8838 | 7,0 | 379 |
| vicolo | ritmo8 | 224 / 554 / 1120 | 6% | 0,0 | 9252 | 1,3 | 675 |
| piazza | main | 125 / 214 / 404 | 19% | 4,9 | 16759 | 3,8 | 544 |
| piazza | main, ieri spento | 166 / 445 / 824 | 0% | 10,7 | 8776 | 8,3 | 435 |
| piazza | ritmo8 | 171 / 409 / 630 | 6% | 0,0 | 9650 | 6,1 | 555 |
| lungomare | main | 126 / 196 / 373 | 21% | 4,2 | 18181 | 3,5 | 551 |
| lungomare | main, ieri spento | 436 / 1220 / 2037 | 0% | 17,4 | 80605 | 19,4 | 358 |
| lungomare | ritmo8 | 149 / 293 / 527 | 6% | 0,0 | 9986 | 4,8 | 585 |
| in auto | main | 202 / 503 / 1139 | 0% | 22,7 | 11877 | 11,8 | 1250 |
| in auto | main, ieri spento | 174 / 451 / 987 | 0% | 10,7 | 6853 | 11,6 | 1076 |
| in auto | ritmo8 | 320 / 1220 / 2303 | 0% | 0,0 | 10567 | 11,1 | 1367 |
| fermi in piazza | main | 149 / 272 / 382 | 8% | 11,2 | 14800 | 2,7 | 671 |
| fermi in piazza | main, ieri spento | 154 / 410 / 588 | 0% | 12,4 | 8414 | 11,8 | 421 |
| fermi in piazza | ritmo8 | 216 / 559 / 972 | 4% | 0,0 | 16801 | 5,2 | 742 |

| Long task: chi c'era dentro (ms sommati sul percorso) | main | main, ieri spento | ritmo8 |
| --- | ---: | ---: | ---: |
| graffiti disegnati sul filo (writer_arte) | 19543 | 13931 | 0 |
| braccio di camera7 (cast7) | 8451 | 0 | 5914 |
| griglia dei raggi al primo raggio | 653 | 655 | 646 |
| pila dei tasselli (texSubImage3D) | 230 | 24 | 57 |
| compilazioni (getProgramParameter) | 1206 | 133 | 2866 |
| foto della tavoletta (readPixels) | 5530 | 0 | 8048 |

Alla fine del percorso (ritmo8): il braccio 411 raggi, 274 dal ricordo (fermi in piazza); 1.725 griglie preparate a fette (4,4 s in 20 minuti,
mai più di 1,5 ms per fotogramma), 5 pile a fette tutte finite; il disegnatore dei graffiti vivo (354 pezzi, coda sul filo vuota).
Il caricamento a strati più lungo dopo l'avvio: 96 ms (main) → 56 ms (ritmo8) in SwiftShader. Nei primi secondi dopo l'avvio (prima dell'anello
vicino: lì le pile non sono a fette, come prima) SwiftShader ha fermi da decine di secondi su un caricamento qualunque: sono dell'avvio in
software, in tutte e tre le corse. Le compilazioni (`getProgramParameter`) e la foto della tavoletta (`readPixels`) cambiano solo con la contesa.
Con gli interruttori di ieri spenti (`kill`) i graffiti si disegnavano già sul filo (uno ogni 2 s): il disegnatore a parte moriva anche prima
di graffiti2 (stessa causa); sul lungomare il vecchio spruzzo delle bombolette (`bmbPass`, raggi senza indice spaziale) costava 283 ms per giro.

