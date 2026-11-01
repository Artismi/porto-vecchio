# Porto Vecchio: analisi della scheda video nel profilo leggero ([gpu])

**L'obiettivo.** Sull'Intel Iris Xe (ANGLE su D3D11, `?leggera`) servono almeno 30 fps fermi, meglio 60, senza perdere niente dell'immagine.
Oggi F3 dice: scheda video 39-46 ms a fotogramma (scena 36-44, post 2,5), 564-836 disegni, 1,2-1,36 M triangoli, 191-193 programmi,
tela 1414×640. Qui si cercano modi più economici di fare **la stessa immagine**, non tagli.

**Come si è misurato.** Il gioco vero (`?cittanuova&leggera&perf&tassellivecchi&pavrush`) gira in Chromium senza testa con SwiftShader,
sulla stessa tela del portatile (1414×640, dpr 1, scala della scena 1). Le misure sono in tre punti della città, alle 11 con cielo sereno:
A 1400,312 (Rua Maestra), B 1424,322 (il borgo), C 1274,343 (il Mercato).

In software i millisecondi assoluti non valgono niente. Valgono i conti: disegni, triangoli, pixel coperti, frammenti ombreggiati, e il
rapporto fra il disegno coi materiali veri e quello con un materiale piatto. Gli strumenti nuovi sono due:

- `strumenti/sonda_gpu.js`: ridisegna la scena di un fotogramma vero in tre modi.
  - Coperture: scrive il numero del disegno nel pixel, per avere i pixel visibili e i triangoli per pixel di ogni famiglia.
  - Sovrapposizione: conta i frammenti che passano la prova di profondità nell'ordine di three, poi col suolo per ultimo, poi coi disegni
    opachi dal più vicino.
  - Tempi: cronometra la scena coi materiali veri e con un materiale piatto.
- `strumenti/banco_gpu_console.js`: va incollato nella console **sul portatile vero**. Spegne una cosa alla volta, dal vivo, e legge i
  contatori della scheda di F3 (vedi §0).

## I numeri misurati (sonda_gpu, scala 1)

| | A | B | C |
|---|---:|---:|---:|
| disegni della scena / dell'ombra (fotogramma con l'ombra) | 995 / 711 | 1162 / 761 | 984 / – |
| triangoli della scena / dell'ombra | 2,61 M / 0,71 M | 2,88 M / 0,68 M | 1,63 M / – |
| programmi | 183 | 201 | 217 |
| metri per pixel al centro (camera di gioco, fov 30°, 58 m, 45-56° sull'orizzonte) | 0,049 | 0,049 | 0,055 |
| pixel visibili: tasselli (`Standard`) / vesti dei pezzi / suolo / marciapiedi | 71 / 11 / 10,5 / 0,6 % | 61 / 13,5 / 14,7 / 4,3 % | 49 / 11 / 23,6 / 3 % |
| **frammenti opachi per pixel** nell'ordine di three (cielo escluso) | **3,1** | **2,9** | **2,7** |
| gli stessi coi disegni opachi dal più vicino | 1,9 (−38%) | 2,0 (−31%) | 2,0 (−26%) |
| sovrapposizione dei soli tasselli (frammenti / pixel visibili) | 3,75 → 1,98 | 3,82 → 2,26 | 3,90 → 2,32 |
| triangoli disegnati con **zero pixel visibili** (i primi 25 disegni) | ≈ 0,6 M | ≈ 0,6 M | ≈ 0,3 M |
| SwiftShader: scena coi materiali veri / con un materiale piatto | 17,7 / 5,2 s (3,4×) | 14,1 / 1,9 s (7,3×) | 9,2 / 2,1 s (4,5×) |

Il conto dei triangoli è più alto di quello di F3 sul portatile. In software l'anello dei tasselli caricati resta più largo, perché ogni
fotogramma dura secondi. Per decidere contano i rapporti, che non cambiano.

---

## 0. Prima di tutto: cosa misura «scena 36-44 ms» (la diagnosi da fare sul portatile)

**Prova.**

- `render.js` 19094-19107: `gpuB('scena')` apre il contatore **prima** di `PesoOmbre.prima` e di `renderer.render(scene)`. Dentro c'è
  anche la passata d'ombra del sole: sul telefono e in `?leggera` si fa un fotogramma sì e uno no (19095), quindi il contatore porta la
  copia della mappa ferma e i lanciatori d'ombra mobili.
- `EXT_disjoint_timer_query` misura il tempo **sulla linea della scheda** fra due segni, non il lavoro. Se ANGLE riceve i comandi a pezzi
  mentre il processore li produce, le attese stanno dentro il conto.
- I numeri di F3 lo suggeriscono: scheda 39-46 ms contro «grafica» di processore 26-41 ms, cioè dello stesso ordine. Il post, un disegno
  solo a tutta tela con circa 38 letture, costa 2,5 ms: lì il contatore misura lavoro vero.

**Da fare (10 minuti).** Aprire `?leggera&perf&noritmo` sul portatile, incollare `strumenti/banco_gpu_console.js` nella console, scrivere
`bancoGPU()`. La tabella si legge così:

- **forbice** (la scena dentro 8×8 pixel: stessi disegni, vertici e ombra, quasi niente frammenti) **≥ 70% della base**: il collo non
  sono i pixel. Comandano i disegni, i vertici e l'attesa dei comandi, quindi vengono prima il §2, il §5 e il lavoro dell'altro agente
  sul processore.
- **forbice ≤ 50%** e **res60** che scende quasi in proporzione ai pixel: comandano i frammenti, quindi vengono prima il §1, il §3, il §4 e
  il §6.
- **noProposta**, **noSuolo**, **ombraFerma** e **piatto** danno il tetto di quanto si può guadagnare su ciascun fronte.

Ci sono anche le prove con ricarica, una per volta, già pronte nel gioco:

- `?lucispente` (§3);
- `?notaglio` (§10);
- `?faretti=0&punti=0`, che **di giorno dà la stessa immagine** perché lampioni e fuochi sono a intensità zero: è il tetto del §3;
- `?proposta=0` e `?nopavimenti`, solo come tetto, perché cambiano l'immagine.

**Stime che seguono.** Supponiamo che i frammenti siano circa 15-25 ms dei 36-44 della scena. È coerente con il post (2,5 ms per un
frammento a pixel), con circa 3 frammenti a pixel di materiali 2-3 volte più pesanti del post, e con il 70-85% del tempo SwiftShader che va
negli shader. Il banco sostituisce questa ipotesi con un numero.

---

## 1. Sovrapposizione: ogni pixel della città si ombreggia 3 volte

**Prova.**

- three r149 ordina gli opachi per `groupOrder`, `renderOrder`, **id del materiale** e solo dopo per distanza (`three.min.js`, la funzione
  `As`). Il gioco non chiama `setOpaqueSort`.
- I tasselli sono mesh fuse per settore e materiale, 245-363 disegni con 160 materiali. Una casa lontana disegnata prima di una vicina si
  ombreggia per intero anche se è coperta.
- Misurato con early-Z ideale, nell'ordine in cui si disegna: 2,7-3,1 frammenti opachi per pixel, e 3,75-3,9 sui tasselli. Ogni frammento
  in più paga lo shader intero: il vissuto, 6 luci, PCF 16 letture, i rumori.
- Coi disegni dal più vicino i frammenti scendono del **26-38%**. Il resto (tasselli ancora a circa 2×) viene dall'ordine dei triangoli
  dentro ogni mesh fusa.
- Il suolo per ultimo non serve: è già quasi tutto visibile (frammenti uguali ai pixel).

**Rimedio, stessa immagine.**

1. `renderer.setOpaqueSort` a fasce di distanza: 3-4 fasce, nella fascia per programma e materiale, dentro per distanza. Si prende quasi
   tutto il guadagno senza moltiplicare i cambi di programma, che pesano sul processore.
2. Nella cottura dei tasselli (`strumenti/tassella.js`) i triangoli di ogni mesh fusa in ordine **dall'alto**: tetti, poi muri dall'alto
   in basso, poi suolo. La camera guarda sempre dall'alto a 45-56°, quindi «più alto» vuol dire quasi sempre «più vicino». Costa zero al
   fotogramma e taglia la sovrapposizione interna.

L'alternativa, una passata di sola profondità, raddoppierebbe 1-3 M triangoli e 1000 disegni: no, finché il processore è al limite.

**Risparmio stimato.** 5-8 ms col punto 1, altri 2-4 col punto 2, se i frammenti comandano.

**Immagine.** Identica: opachi con la prova di profondità, l'ordine non cambia il colore. Fa eccezione solo una coppia di triangoli
complanari senza `polygonOffset`, dove vince l'ultimo. Si verifica con `sonda_uguale.js` (soglia 0) nei 4 scorci e a 3 zoom.

**Fatica.** Bassa per il punto 1 (mezza giornata), media per il punto 2 (cottura nuova dei tasselli).

## 2. Triangoli senza pixel: il frustum a sfere lascia passare mezzo milione di triangoli

**Prova (sonda_gpu, `peggioriTriPerPixel`).**

- Ci sono mesh di tasselli da 12-165 mila triangoli a 50-160 m, con raggio della sfera 25-50 m e **0 pixel visibili**: centro a 3-7 m
  d'altezza, non sottoterra. Nella fascia 100-130 m ci sono 160-430 mila triangoli per 0-13 mila pixel.
- La camera è alta e inclinata. Oltre ~80 m il bordo alto dello schermo è già sopra le case, ma la sfera di un settore di 48×48 m sporge
  35 m in alto e passa la prova.
- Lo stesso succede alle istanze del bosco (`nat`, raggio 54 m, 34-57 mila triangoli, 0-151 pixel).
- La ferrovia intera (`writing.js` 1265) è 2 disegni da 39.200 triangoli con raggio 339 m: sempre «in vista», 0-19 pixel, e altri 78 mila
  triangoli nell'ombra.
- I detriti (`render.js` 17775) sono 1400 istanze di scatole a scala zero con `frustumCulled = false`: 16.800 triangoli in scena e
  nell'ombra anche quando non ce n'è nessuno.

**Rimedio, stessa immagine.**

- Per tasselli, settori di `peso_fusi` e gruppi di istanze, la prova del frustum con la **scatola** (`Frustum.intersectsBox` sulla scatola
  di mondo del settore) al posto della sfera. Si fa nello stesso aggancio di `peso_lontano` o `peso_fusi`.
- La ferrovia tagliata a settori di 48 m, come la città.
- Detriti: `count` uguale al numero di vivi (o `visible = false` a zero vivi).

**Risparmio stimato.** 20-30% dei triangoli della scena (0,3-0,9 M) e qualche decina di disegni. Sulla Iris Xe vuol dire 1-2,5 ms di
vertici e preparazione dei triangoli, più il processore risparmiato.

**Immagine.** Identica: si scarta solo quello che non ha pixel. Si verifica con il pixel per pixel e con «0 pixel persi» nella sonda.

**Fatica.** Bassa (1 giorno).

## 3. Le luci spente si calcolano lo stesso, in ogni pixel

**Prova.**

- Nel profilo leggero ogni programma ha 1 sole, 2 faretti e 3 punti (`render.js` 17575-17583), cioè 6 `RE_Direct` per pixel.
- Di giorno faretti e punti sono a intensità 0, e di notte toccano pochi metri attorno a sé.
- Il rimedio c'è già, esatto al bit: `luciSpente()` (`render.js` 17537) salta il ciclo di una luce di colore zero o fuori dal suo raggio.
  È **spento per difetto** solo perché in SwiftShader rallentava (`ANALISI_FLUIDITA.md` 219); sulla Iris Xe non è mai stato provato.
- In più, `sguProPezzi` aggiunge **dentro** `RE_Direct` un rumore 3D, `sgN3(vSgW*1.1+11.1)` (`render.js` 13840), che non dipende dalla
  luce: 6 copie per pixel se il compilatore non le fonde.

**Rimedio, stessa immagine.**

- `luciSpente` acceso per difetto quando la scheda non è in software (`PV_PROFILO.motivo !== 'in software'`).
- Il rumore delle celle calcolato **una volta** prima dei cicli (una variabile globale in `lights_fragment_begin`).

**Risparmio stimato.** Di giorno circa 500 operazioni su 2500-3500 per frammento standard, quindi 2-4 ms. Di notte 1-2 ms. Il rumore
spostato vale 0-1,5 ms, secondo il compilatore.

**Immagine.** Identica (contributo esattamente zero). Lo conferma `sonda_uguale.js`, nato per questo.

**Fatica.** Molto bassa (un'ora).

## 4. I rumori del vissuto: 10-15 rumori 3D per pixel, metà moltiplicati per zero

**Prova (`render.js` 13757-13819, 13868-13890).**

- Ogni frammento standard non scheletrato calcola:
  - `sgL`, `sgT`, `sgB` per la pittura e la varia;
  - `n2` e `st` per il vissuto (tetti e piede dei muri);
  - `sgL` e `sgM` per suolo e polvere;
  - 2 rumori per le nuvole;
  - più quello delle celle del §3.
- Ogni `sgN3` sono 8 hash di circa 14 operazioni più 7 interpolazioni: circa 145 operazioni. In tutto 1500-2200 operazioni a pixel, più
  dell'illuminazione PBR.
- Molti finiscono moltiplicati per zero:
  - `n2` e `st` contano solo su falde (`sgR`) e facce in piedi (`sgV`), quindi sul suolo sono zero;
  - `sgL` e `sgM` del secondo blocco contano solo su suolo (`sgSu`) o piede del muro (`sgPo`), quindi sui muri sopra 1,6 m e sui tetti
    sono zero.

**Rimedio, stessa immagine.**

- Ogni rumore dentro un `if` sul peso che lo moltiplica (per esempio `sgV + sgR > 0.`, `sgSu + sgPo > 0.`, con il limite largo della
  soglia). Il ramo segue la superficie, quindi è coerente: sulla Iris Xe non costa divergenza.
- In `sgN3` i pezzi per asse dell'hash (`fract(i*.3183+.1)*17`) calcolati 2 volte per asse invece di 8: 6 contro 24. Stesse operazioni per
  componente, risultato identico. Da circa 145 a circa 90 operazioni.
- Lo stesso per `pzN` e `pzH1` della veste dei pezzi (`pezzi_citta.js` 87) e per `pn9` di `prato9` (`render.js` 3131).

**Risparmio stimato.** Circa 4-6 rumori in meno a pixel e il resto più leggero del 35%: 3-5 ms se i frammenti comandano.

**Immagine.** Identica: si salta solo quello che viene moltiplicato per zero. Si verifica pixel per pixel. Non sostituire l'hash con una
tessitura: cambierebbe il disegno delle macchie.

**Fatica.** Bassa o media (1 giorno, con la prova di uguaglianza).

## 5. Triangoli sotto il pixel (la stessa immagine con meno geometria)

**Prova.**

- Triangoli per pixel visibile:
  - persone 70-106 (sonda_gpu);
  - bottino 46-54;
  - istanze di arredo 3,5-9,6;
  - tasselli nella fascia 60-80 m fino a 5.
- A 4,9 cm per pixel ogni triangolo sotto il pixel fa lavorare la scheda a quadrati 2×2 mezzi vuoti (i frammenti per triangolo
  raddoppiano o quadruplicano) e paga i vertici.
- Da `reports/dettaglio/sonda_dopo.json`, triangoli per m² sullo schermo: reti 2978, bollard 2443, applique 1991, crate 1470, bitta 1346.
- I mezzi hanno un LOD a **70 m dalla camera** (`render.js` 12159), ma la camera di gioco sta a 54-65 m: il livello basso non scatta mai.

**Rimedio.**

- Nei tasselli, l'arredo cotto con `o.liv = 0` (`arredo3d.js` 10: senza viti e minuterie, meno segmenti) per tutto quello che a zoom 1
  sta sotto i 2 pixel di dettaglio. Il livello pieno resta nell'anello vicino e per lo zoom da vicino (≤ 0,6).
- Le persone fuse (`peso_gente.js`) con una seconda geometria semplificata quando l'altezza a schermo è sotto 60 pixel.
- I LOD (mezzi, `THREE.LOD`) decisi in **pixel a schermo**, non in metri.

**Risparmio stimato.** 1-3 ms (vertici e quadrati 2×2), più disegni in meno sul processore.

**Immagine.** Impercettibile: tolto solo il dettaglio sotto il pixel. Si verifica con il pixel per pixel a zoom 1 (differenze ≤ 2/255 sui
bordi) e a occhio a zoom 0,35 (il livello pieno resta).

**Fatica.** Media (ricottura dei tasselli, semplificazione delle figure).

## 6. Il lastricato procedurale sempre al massimo dettaglio

**Prova.**

- `pavimenti.js` 210: `lod = 1 - smoothstep(.04, .12, mpp)`. Alla camera di gioco, scala 1, mpp = 0,049, quindi lod ≈ 0,97: il percorso
  pieno gira su tutto il suolo (file di pietre, sassi a celle, tre texel a virgola mobile, crepe, giunti, nuvole).
- Il commento del commit d39abac lo ha misurato sulla Iris Xe: aprirlo «costava 30-40 ms di scheda video sulle piazze».
- In SwiftShader il suolo da solo, senza niente davanti, costa l’11-20% della scena con il 10-24% dei pixel.
- Il suolo paga in più:
  - `envMap` PMREM con intensità 0,015 col tempo asciutto (`render.js` 3211: circa 200 operazioni e 4-8 letture);
  - le nuvole due volte, `pvCl` in `pavimenti.js` e `sgP8.y` in `sguProPezzi`.

**Rimedio, stessa immagine.** Un **deposito del suolo** (clipmap) attorno alla camera:

- Il risultato fermo di `pvDett` (colore, la piega della normale `pvTilt`, umido di base, `pvPol`) e i rumori 2D del suolo di
  `sguProPezzi` si cuociono in una tessitura allineata al mondo, a 4 cm per texel. Per esempio 2048² su 80 m, oppure 2 livelli da 1536² a
  4 e 8 cm: circa 35 MB con le mip.
- Si aggiorna solo la striscia che entra quando la camera si sposta (a toro). Il suolo legge 2 tessiture con filtro anisotropo e tiene al
  pixel solo quello che si muove: nuvole, pioggia, luci, ombre, la quota della camera.

**Risparmio stimato.** 2-6 ms nelle vie, fino a 10 sulle piazze.

**Immagine.** Quasi identica. Il dettaglio è calcolato a 4 cm (più fine dei 4,9 del pixel) e poi filtrato. Dove oggi `lod` sfuma il disegno
verso la media, la mip fa la stessa media. Si verifica con il pixel per pixel a 3 zoom (atteso ≤ 2/255, salvo i giunti, più puliti).

**Fatica.** Alta (3-4 giorni). È il passo più grosso dopo i primi.

## 7. La nebbiolina: 14 luci a pixel anche di giorno

**Prova.** `render.js` 2739-2755: due piani da 100×100 m a tutto schermo, ognuno con 3 rumori (hash con `sin`) e un ciclo di 14 luci.
Di giorno le 14 luci sono nere (`night = 0`, 2788).

**Rimedio, stessa immagine.**

- Il ciclo dentro `if (night > 0.)`, che diventa un'uniforme.
- `discard` quando l'alfa è 0: con la miscela normale non aggiunge niente.

**Risparmio stimato.** 0,3-0,8 ms. **Immagine:** identica. **Fatica:** un'ora.

## 8. Il passo finale: 38 letture, la metà inutili sui piani

**Prova.** `sguInit` (`render.js` 13984):

- FXAA 8 letture, nitidezza 4, Sobel della categoria 9, densità 8, trame 4, piede e gronda 4;
- tutto a 1414×640, mediump: 2,5 ms misurati.

La densità (8 letture) moltiplica `eV`, che è zero dove il gradiente è sotto 0,45, cioè su circa l'80% dei pixel.

**Rimedio, stessa immagine.** Le 8 letture dentro `if (gV > .45)`.

**Risparmio stimato.** 0,3-0,5 ms. **Immagine:** identica. **Fatica:** un'ora.

## 9. Le ombre: già in cache, resta la lettura

**Prova.**

- `peso_ombre.js` cuoce le cose ferme e ridisegna solo quelle mobili; il sole si aggiorna a fotogrammi alterni (`render.js` 19095). Ben
  fatto.
- Resta il filtro PCF morbido di three r149: 16 `texture2DCompare` con lo spacchettamento RGBA per ogni frammento che riceve.
- Nell'ombra entrano anche la ferrovia intera, i detriti vuoti e il bottino (80-86 disegni, circa 45 mila triangoli).

**Rimedio.**

- Mappa di profondità con confronto in hardware (`sampler2DShadow`, filtro lineare): 9 letture danno la stessa media di 9 PCF bilineari
  di three, salvo pesi a 8 bit.
- Fuori dall'ombra chi non può farne (detriti a zero, settori di ferrovia lontani).

**Risparmio stimato.** 0,5-1,5 ms.

**Immagine.** Identica o impercettibile (pesi del filtro a 1/256). Si verifica pixel per pixel.

**Fatica.** Alta per il PCF in hardware (tocca l'ombra di three e `peso_ombre`), bassa per i lanciatori.

## 10. Il `discard` del taglio è in tutti gli shader

**Prova.** `render.js` 13677: il taglio a retino del primo piano è compilato in ogni programma standard, lambert, phong e basic, anche
quando è spento. Su D3D11 uno shader con `discard` fa scrivere la profondità dopo lo shader: dentro una mesh fusa si perde parte dello
scarto anticipato (early-Z).

**Da misurare.** `?notaglio` contro com'è, con F3 (stessa immagine finché il taglio non scatta). Se rende più di 1 ms, si compila il
`discard` solo nei materiali che il taglio può toccare davvero, oppure si fa il taglio con lo stencil.

**Risparmio stimato.** 0-3 ms, incerto. **Fatica:** media.

## 11. Cosa NON fare (non rende su questa scheda, o cambia l'immagine)

- **mediump negli shader della scena**: ANGLE su D3D11 tratta tutto a 32 bit, quindi nessun guadagno sulla Iris Xe.
- **Abbassare la risoluzione**: la tela è già a metà dello schermo e la scena scende fino a 0,6 con `peso_ritmo`. Ogni gradino in più si
  vede.
- **MSAA**: già spento nel leggero (`render.js` 13393), giusto così. FXAA nel passo finale costa meno.
- **Passata di sola profondità per tutto**: raddoppia triangoli e disegni (vedi §1).
- Il formato dei bersagli è già giusto: scena RGBA8 già sviluppata, post a 8 bit, ombra RGBA8.

---

## Il piano, in ordine

| # | cosa | §  | immagine | fatica | ms stimati (Iris Xe) |
|---|---|---|---|---|---:|
| 0 | `bancoGPU()` e le prove a URL sul portatile (forbice, res60, noProposta, ombraFerma, noSuolo, piatto; `?lucispente`, `?notaglio`, `?faretti=0&punti=0` di giorno) | 0 | – | 1 ora | (decide l'ordine sotto) |
| 1 | `luciSpente` acceso fuori dal software, rumore delle celle fuori dal ciclo delle luci | 3 | identica | 1 ora | 2-4 di giorno, 1-2 di notte |
| 2 | frustum a scatola (tasselli, settori, istanze), ferrovia a settori, detriti a `count` | 2 | identica | 1 giorno | 1-2,5 (+ processore) |
| 3 | `setOpaqueSort` a fasce di distanza | 1 | identica | ½ giorno | 5-8 |
| 4 | rumori del vissuto sotto `if` sui pesi, hash condiviso (`sgN3`, `pzN`, `pn9`) | 4 | identica | 1 giorno | 3-5 |
| 5 | nebbiolina e passo finale con i rami esatti | 7, 8 | identica | 2 ore | 0,6-1,3 |
| 6 | tasselli cotti con i triangoli dall'alto e l'arredo `liv = 0` sotto i 2 px; persone e mezzi con LOD in pixel | 1, 5 | identica / impercettibile | 3-4 giorni | 3-7 |
| 7 | deposito del suolo (clipmap del lastricato) | 6 | quasi identica | 3-4 giorni | 2-6 (10 sulle piazze) |
| 8 | PCF in hardware, `discard` del taglio solo dove serve (se il §0 lo conferma) | 9, 10 | identica | 2-3 giorni | 0,5-4 |

I punti 1-5 si fanno in 3-4 giorni, sono esatti al pixel e si verificano con `sonda_uguale.js`. Se il banco conferma che la scena è legata
ai frammenti, valgono **12-20 ms** sui 36-44 della scena. È il passaggio da 22-25 a 30+ fps sulla Iris Xe, dove però c'è anche il
processore (l'altro agente): oltre i 30 fps decide chi dei due resta il collo.

Con i punti 6 e 7 si tolgono altri 5-13 ms: lo spazio per avvicinarsi ai 60 senza toccare l'immagine.

Se invece la **forbice** dice che i pixel non comandano, l'ordine diventa 2, 6 (vertici e triangoli), meno disegni, poi il resto.

Ogni passo si misura prima e dopo con `bancoGPU()` sul portatile e si verifica con l'uguaglianza dei pixel prima di passare al successivo.
