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

## 6. Riletto il piano: cosa mancava

Confrontato con la bibbia del committente, con i suoi messaggi e con i lavori rimandati (`src/HANDOFF_look.md` «Rimandati»,
`src/HANDOFF_ad.md` «Il resto del panel»).

**La lacuna più grossa: il committente non vede quello che fotografiamo.** Sul suo portatile (Intel Iris Xe) `profilo.js` accende da solo
il profilo leggero (`?leggera`, `PHONE` in `render.js`). Lì il passo finale **non legge la profondità** (`PRO.prof` resta spento): niente
pennarello sulle sagome, niente ciglio e piede dei volumi, niente aria, niente tetti calmi, niente maschera del regime; e niente
micro-normale dipinta. Tutte le foto della galleria invece girano col profilo pieno (nei browser automatici il profilo non cambia). Quindi:
- **passo 0**: la galleria e la misura per categoria si fanno anche con `?leggera` (le due colonne, pieno e leggero, a ogni giro);
- il passo 2 non può contare sulla profondità nel profilo leggero: la categoria va scritta dai materiali (l'alfa del bersaglio) in tutti
  e due i profili, e la profondità resta un di più del profilo pieno;
- le cose che danno carattere vanno messe dove costano poco anche sulle schede integrate: nei materiali (bordo di luce, retino, colore,
  zoccolo scuro) più che nel passo con letture di profondità.

**Le altre cose emerse e non ancora nel piano:**

| da dove | cosa | passo |
| --- | --- | --- |
| bibbia, «il conflitto» | **lo shader come stato della rivoluzione**: dove la strada resiste l'immagine si scalda, fiorisce e si curva; il grigio del regime arretra. Oggi c'è solo la maschera fissa dei luoghi del regime: serve una variabile di gioco per quartiere (quanto è della strada) che guidi colore, lente e verde | nuovo, dopo il 4 |
| bibbia, «le ore» | **la notte non è mai stata misurata**: sodio arancio, neon rosa, turchese e verde acido, glitter e specchietti dei club. Le misure del §1 sono solo giorno e mattino | 0 e 8 |
| bibbia, «luce» | la luce che rimbalza a terra a macchie di colore da lamiere dipinte e vetri colorati | 3 |
| [ad] punto 8 | il filo di cobalto sul bordo dell'ombra portata, il rimbalzo del sole dentro l'ombra, le ore della sera allineate all'accensione dei lampioni | 3 |
| bibbia, «forme»; [ad] punti 2-3 | **l'attitudine e il rigonfiamento**: case che pendono di ±0,6-0,9° (da un rumore lento, le facciate attaccate non si aprono), pali ±1,5°, cartelli girati; zoccolo di 40 cm più scuro, base degli oggetti +8%, schiacciamento all'atterraggio | nuovo, geometria |
| bibbia, «tratto»; [ad] punto 7 | il tratto che pesa: più spesso col salto e al piede, la pressione da un rumore nel mondo, la penna che ogni tanto salta; le scritte col contorno nero spesso e le gocciolature | 8 |
| bibbia, «trame» | fotocopia e serigrafia fuori registro su manifesti, volantini e stencil | 4 (nella tela dei segni) |
| bibbia, «colore» | il verde solarpunk che avanza: rampicanti, buganvillee, orti sui tetti, fichi dai muri (non solo l'erba nelle crepe) | 6 |
| [ad] «da fare» | la sera tutte le saracinesche giù e dipinte; lo heaven spot a rullo sui tetti piani (rompe anche il bianco dei terrazzi) | 4 |
| [look] rimandati | un **solo colore per le cose con cui si interagisce** (`#ff4f9a` o `#E8A8BF`, da scegliere) e uno per il personaggio | 5 |
| [look] rimandati | le regole del set (arredo a isole, niente cose sparse): la leggibilità degli oggetti passa anche dal togliere | 6 |
| [look] rimandati, cineasta e animatore | il cinema oltre la camera: lo sguardo avanti più lento, le bande solo nelle scene e nei dialoghi, la profondità a strati (primo piano scuro, piano del personaggio pieno, fondo nell'aria) | 7 |
| messaggio «deve girare fluido» | **un tetto di costo per ogni passo**: niente letture di profondità in più nel profilo leggero, la misura dei millisecondi della scheda (`?perf`, F3) sul portatile del committente prima e dopo | tutti |

**L'ordine rivisto**: 0 (misurare pieno e leggero, giorno e notte) → 1 → 2 (categoria dai materiali) → 3 → 4 → 5 → stato della rivoluzione
→ 6 → 7 → forme → 8.

## 7. Stato dopo il primo giro ([cat] e [riv], 1 novembre)

Misure nel **profilo leggero** (quello del committente), con la categoria scritta dai materiali e i tasselli ricotti:

| scena | tetti nel quadro | muri L / sat | tetti L / sat | suolo L, luce/ombra | persone/suolo |
| --- | --- | --- | --- | --- | --- |
| mattino, Rua Maestra | 39% → 36% | .44/.51 → .41/.52 | .49/.44 → .44/.53 | .38, 2,0 → 2,2 | 2,1 → 1,8 |
| mezzogiorno, Vittoria | 24% → 17% | .43/.50 → .47/.50 | .49/.47 → .44/.56 | .36, 1,5 → 1,5 | 1,8 → 1,7 |
| sera, il bar | 52% → 52% | .33/.60 → .33/.59 | .46/.56 → .43/.72 | .34, 2,9 → 2,4 | 1,1 → 1,3 |
| notte, Vittoria | 42% → 38% | .21/.70 → .20/.69 | .27/.51 → .25/.63 | .15, 4,6 → 4,6 | 2,0 → 2,0 |

(prima: la build [firma] coi tasselli vecchi, categorie spente; il foglio `_immagini/firma/leggero_prima_dopo.png`).

Fatto: passi 0, 1, 2 (la categoria dai materiali, valida nei due profili), 3 (la luce del giorno, in parte), lo stato della rivoluzione, il
bordo delle persone (parte del 5), la camera (parte del 7). Cosa dicono i numeri e le foto:
- i tetti ora sono sotto i muri di valore e restano cotto (il primo tentativo, più duro, li faceva marroni: tornato indietro);
- la camera più bassa toglie tetti dove la via è larga (mezzogiorno: 24% → 17%), non nei vicoli del borgo (sera, 52%: lì la zoom della scena è
  stretta e la camera sopra i tetti); i muri restano scuri di media perché ora se ne vedono più facce in ombra;
- **la strada è il punto debole che resta**: grandi superfici grigie piatte (a mezzogiorno il 53% del quadro). Il passo 6 (il materiale della
  strada: usura, lastrico, cordoli, segni) è il prossimo per peso;
- persone/suolo resta sotto 2: le persone sono l'1% del quadro; il bordo di luce aiuta di notte, di giorno serve il colore riservato al
  personaggio (da scegliere) e la scala;
- luce/ombra a mezzogiorno resta 1,5: a mezzogiorno nelle vie larghe di ombra ce n'è poca (il sole alto); la sera e la notte tengono.

Da fare, in ordine: 6 (la strada), 5 (il colore riservato al personaggio e alle cose interattive: `#ff4f9a` o `#E8A8BF`, scelta del
committente; la scala), 4 (gli intonaci: al più tre tinte per quartiere, nelle tavolozze), 8 (il tratto che pesa, il bagliore dei neon),
le forme (case e pali storti, zoccolo), il verde, la fotocopia sui segni. E la misura dei millisecondi sul portatile del committente
(`?perf`, F3) prima e dopo questo giro: le 4 letture dell'alfa e il bordo delle persone costano poco, ma va visto sulla Iris Xe.

## 8. Il diorama curato (riferimento: la casetta isometrica dipinta, 1 novembre)

La sensazione da dare a chi gioca è quella di **un diorama fatto a mano**: un mondo piccolo, visto dall'alto, dove ogni angolo è stato curato.
Il riferimento è un'illustrazione isometrica dipinta, con la casa nel bosco, l'orto e il ruscello. Ecco cosa fa, livello per livello, e dove il gioco è lontano.

| Livello | Il riferimento | Il gioco adesso | Cosa si fa |
|---|---|---|---|
| **Modelli** | Volumi semplici ma con bordi consumati, cornici spesse, mattoni a vista a chiazze. | Le case sono buone; gli oggetti piccoli sono pochi e spigolosi (vasi low poly). | [vasi2]: vasi torniti con bordo e sottovaso, vasi smaltati, ceste, cassette, latte e appesi; piante con foglie vere. |
| **Oggetti e disposizione** | Le cose stanno a grappoli sulle soglie: porta, balcone, parapetto del tetto, scala. Vasi di misure diverse vicini; spazi vuoti lasciati respirare. | Le cose sono in file regolari a passo fisso (vasi sui parapetti), negli stessi punti in ogni casa. | [vasi2]: grappoli di 2-5 vasi a seme, soglie, giardino sul tetto piano, posti lasciati vuoti. |
| **Verde** | Il verde è più della metà del quadro, in molti valori (giallo-verde in luce, blu-verde in ombra). Le piante rompono gli spigoli fra muro e suolo. | Il verde è raro; il quadro è cotto e arancio. Gli spigoli muro e suolo sono puliti, da plastico. | Più piante a grappolo ([vasi2]); da fare: rampicanti ed erbacce al piede dei muri. |
| **Luce** | Sole caldo e morbido; la luce cambia nel quadro (chiazze di luce fra le chiome). | La luce è uguale ovunque: un piano illuminato tutto allo stesso modo. | [diorama] L'aria che passa: ombre di nuvole lente, proiettate lungo il sole, senza retino. |
| **Ombre e occlusione** | Ogni cosa si posa: scuro morbido dove il muro tocca la terra, sotto la gronda e sotto i vasi. Le ombre sono fredde e verdi-blu, mai nere. | Ombre colorate sì, ma niente occlusione (nel profilo leggero non c'è profondità); le cose galleggiano. | [diorama] Il piede e la gronda: il suolo sotto un muro, un oggetto o una persona si scurisce verso il freddo; il muro sotto il tetto prende l'ombra della gronda (dalla categoria, a schermo, due letture). |
| **Spigoli e linee** | Quasi nessun contorno nero: gli spigoli in alto **prendono la luce** (una pennellata chiara), lo scuro sta solo nelle fessure. | La riga scura di pennarello su tutti gli spigoli. | [diorama] Lo spigolo di luce: dalla parte in alto (faccia verso il cielo di muro o tetto) lo spigolo schiarisce; la riga scura resta dalla parte in piedi. Nel regime si spegne (resta la linea tecnica). |
| **Pennellate e superfici** | Intonaco a chiazze, colature sotto le finestre, tetti con coppi nuovi e vecchi e muschio. | C'erano già scala, macchie e polvere al piede; tetti e colature solo nella variante aaa (spenta). | [diorama] Il vissuto: tetti a chiazze col muschio, sporco che sale dal piede a colature, sempre acceso. |
| **Colore** | Pochi toni dominanti: verde, cotto, crema, con un accento turchese (acqua) e pochi fiori saturi. | L'arancio dei tetti domina, specie la sera. | I fiori e i vasi smaltati portano gli accenti; il verde abbassa l'arancio. Da tarare dopo le foto. |
| **Aria e profondità** | Il fondo (bosco) è scuro e incornicia il soggetto chiaro: la gerarchia è data dal contenuto. | La vignetta e la luce attorno al personaggio fanno il lavoro. | Resta così; le nuvole aggiungono variazione larga. |

**Le manopole** sono in `DIOR` (render.js, sotto `CAT`, anche `window.__DIOR`): `nuvole`, `vissuto`, `piede`, `gronda` e `luceSpigolo`; `?nodiorama` spegne tutto.

**Costo:** due letture in più nel passo finale; un rumore per le nuvole e due per il vissuto nei materiali. Non ci sono passate nuove.
