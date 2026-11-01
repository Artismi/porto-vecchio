# Porto Vecchio — Analisi dello stile: perché manca la cifra, e come arrivarci (1 novembre)

Il committente, dopo il giro [firma]: «manca ancora parecchio per ottenere la cifra stilistica, l'effetto cinematografico e curato; manca
di carattere, distinzione e gerarchia visiva che renda leggibili strada, muri, personaggi e oggetti». Riferimento: la bibbia «Lo shader
di Porto Vecchio» (in `src/HANDOFF_look.md`, sezione [firma]). Qui la diagnosi misurata e il piano.

---

## 1. Cosa dicono i numeri

Luminanza (L, 0-1) e saturazione (0-1) campionate sulle foto della galleria (`strumenti/galleria.js`, build [firma], 960×600):

| elemento | mezzogiorno (Vittoria) | mattino (Rua Maestra) |
| --- | --- | --- |
| strada / piazza al sole | L .49, sat .03 | L .39, sat .18 |
| strada / piazza in ombra | L .35, sat .19 (blu) | L .15, sat .66 (blu) |
| muri al sole | L .59-.70, **sat .85-.87** | L .86, sat .43 |
| tetti a coppi | L .65, sat .72 | — |
| tetti piani | **L .87**, sat .25 | — |
| tetto in ardesia | — | L .40, sat .38 |
| personaggio | L .35, sat .93, ~14 px di altezza | L .38, sat .93 |
| auto, bidoni (oggetti) | L .40-.41, **sat .18-.23** | — |

Quattro problemi, tutti di gerarchia:

1. **La gerarchia del colore è rovesciata.** La guida dice «il fondo respira, i segni di chi resiste esplodono». Oggi il fondo (muri, coppi)
   è la cosa più satura del quadro (.72-.87) e gli oggetti sono quasi grigi (.18-.23). Il giro [firma] ha alzato la saturazione **nel
   passo finale, su tutto**: ha tolto il grigio, ma ha dato a ogni muro la voce di un accento. Quando tutto grida, niente si legge.
2. **La gerarchia dei valori è rovesciata.** In una vista dall'alto i tetti sono metà del quadro, e i tetti piani sono la cosa più chiara
   (L .87): l'occhio va lì, non sulla strada. La strada (dove si gioca) è un medio piatto (.45-.49), senza trama né bordi.
3. **Il giorno non ha contrasto di luce.** A mezzogiorno il rapporto fra strada al sole e strada in ombra è 1,4:1 (.49/.35); al mattino 2,6:1.
   La sera, che il committente sente «più vicina», ha il contrasto più forte di tutte (luce calda contro ombra magenta). Il cinema vive di
   questo salto: oggi il sole del giorno è quasi bianco (`#fff2dc`) e il cielo riempie troppo le ombre.
4. **Il personaggio non si stacca.** È 14 px su 600, L .35 su una strada a L .49: 1,4:1 di contrasto, solo il rosso lo distingue. Nessun
   bordo di luce, nessuna linea più spessa, l'ombra di contatto debole.

## 2. Le cause, nel codice

| causa | dove | effetto |
| --- | --- | --- |
| La saturazione si alza nel passo finale per tutti i pixel | `render.js` momenti (`sat` 1.22-1.24, `proPieno` .45, `SGU.pieno` .38), `SG_STR` | il fondo satura quanto gli accenti |
| Il passo non sa cosa sta guardando | `sguInit` (SGP): ha la profondità e la quota, ma non la categoria (suolo, muro, tetto, persona, accento) | ogni correzione vale per tutto |
| Le tinte dei muri sono scelte per essere viste da sole | tavolozza delle case (`FD1`, `pal1`, `arr1`), `pezzi_citta.js` `COL` | intonaci gialli e rossi pieni, non pastello |
| I tetti piani sono chiari e grandi | `flatKind1` ([look]: metà dei terrazzi a lastrico chiaro `#d6cfc2`) | il piano più grande è il più chiaro |
| La strada è un materiale neutro e liscio | terreno a blocchi (`paintTiles`), `pavimenti.js`, asfalto `#55575c` | nessuna trama, bordi del marciapiede deboli |
| Il sole è alto e bianco, il cielo forte | momenti (`soleK` 1.24-1.26, `cieloK` .58-.62), `PROF.soleAlto` [22, 40] | ombre chiare e corte a mezzogiorno |
| Il personaggio usa lo stesso trattamento degli oggetti | `personaggi.js` (tavolozza), `NIT.sagome` uguale per tutto | si perde nella folla e nel suolo |
| La camera guarda dall'alto e larga | `visuale.js` `CAMERA4`, `VIEW` 38 m | tetti al 40-55% del quadro, personaggio piccolo |

## 3. Il principio: un piano di valori e di colore per categoria

Ogni categoria ha il suo spazio, misurabile. È il «piano di valori» di un direttore della fotografia, fissato una volta e controllato a ogni giro.

| categoria | luminanza | saturazione | regola |
| --- | --- | --- | --- |
| **strada e piazze** (il palco) | .28-.45 al sole | .08-.25, calda al sole | la trama si legge (asfalto consumato, lastrico, strisce chiare), il cordolo ha un filo di luce e una gola scura |
| **ombra sul suolo** | sole/ombra ≥ 2,2:1 a ogni ora | .30-.60, oltremare e lilla di giorno | l'ombra disegna la via |
| **muri** (il fondo che respira) | .55-.75 al sole | .20-.45, pastello ligure | al più tre tinte per quartiere; il volume da luce e ombra, non dalla tinta |
| **tetti** (la cornice) | .40-.60, mai il più chiaro | ≤ .35 | poco micro-contrasto; terrazzi piani scuriti |
| **personaggi** | contrasto col suolo ≥ 2,5:1 | accenti .80-.95 | bordo di luce dell'ora, linea più spessa, ombra di contatto netta |
| **accenti** (writing, saracinesche, neon, cose con cui si interagisce) | — | .75-.95 | ≤ 10-12% del quadro; fluo ≤ 1% |

## 4. Il piano, in ordine

Ogni passo si misura con la galleria (stesse scene, stessa ora) prima e dopo. Il primo passo è lo strumento: senza, si va a occhio.

1. **La misura per categoria** (`strumenti/galleria.js`). Una seconda passata con un materiale di sostituzione che scrive la categoria
   (suolo, muro, tetto, persona, mezzo, accento) in un bersaglio a parte; per ogni foto: luminanza e saturazione medie per categoria,
   contrasto personaggio/suolo, sole/ombra sul suolo, percentuale del quadro per categoria. La tabella del §3 diventa un controllo.
2. **La categoria nel passo finale.** I materiali scrivono la categoria nell'alfa del bersaglio della scena (a 8 bit: oggi l'alfa vale 1
   ovunque). Il suolo, i muri e i tetti si riconoscono già dalla profondità (normale e quota, come fa [nitida]); persone e accenti con un
   `#define` nei loro materiali. Il passo allora grada per categoria invece che per tutti.
3. **La luce del giorno.** Sole più caldo (`#ffe2b8`) e più basso (`soleAlto` [16, 32]), cielo che riempie meno (`cieloK` .45-.5): ombre
   più lunghe e più profonde, sole/ombra ≥ 2,2:1. La sera resta com'è (è la più vicina).
4. **Il colore nei materiali, non nel filtro.** Gli intonaci verso il pastello (tavolozza delle case, `COL` dei pezzi); gli accenti nei
   primari hip hop della [ad]; i terrazzi piani più scuri. Poi la saturazione globale torna vicina a 1 (`sat` ~1.05, `pieno` ~.25).
5. **I personaggi leggibili** (`personaggi.js`, `vestiario.js`): bordo di luce nel colore dell'ora (crema di giorno, rosa la sera, ciano
   la notte), linea a 2 px solo su di loro, ombra di contatto più netta, scala +10-15% (la guida: «chunky»).
6. **La strada che racconta** (`pavimenti.js`, terreno): asfalto con usura e rappezzi, cordoli con luce e gola, strisce e tombini netti,
   crepe con l'erba (il verde che avanza).
7. **La camera da film** (`visuale.js`): più bassa e più vicina di serie (la «visuale bassa» c'è già come modo), focale più lunga,
   il personaggio sui terzi con spazio davanti. I tetti scendono sotto il 30% del quadro.
8. **La linea e la luce che brilla**: spessore della linea per categoria (persone 2 px, oggetti 1,5, sagome delle case 1, suolo niente);
   un bagliore caldo leggero solo sulle luci emissive (neon, lucine, finestre) a un quarto di risoluzione.

I passi 1-3 sono rapidi e cambiano di più. Il 4 tocca le tavolozze di più moduli. Il 5 e il 6 sono lavoro sui modelli e sui materiali.
Il 7 cambia il gioco e va provato giocando.

## 5. Cosa non fare

- Correggere ancora tutto il quadro con la saturazione o il contrasto del passo finale: è quello che ha prodotto il problema.
- Desaturare per «calmare» (il giro del panel): la guida lo vieta. Si calma il **fondo**, nei materiali, e si accendono gli accenti.
- Aggiungere effetti prima che la gerarchia regga: un effetto su un'immagine senza gerarchia resta un effetto.
