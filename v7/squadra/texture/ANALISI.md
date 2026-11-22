# [texture] ANALISI — le superfici a terra (squadra/texture)

Il committente: «il pavimento … le crepe tra le mattonelle, lo sporco e la texture, le buche, la ghiaia, i fili d'erba che escono … texture
molto semplici e piatte. Ci manca vero dettaglio e grinta». Qui: da dove viene il suolo, quanto se ne vede davvero sullo schermo del telefono,
cosa manca, i casi peggiori. Le misure sono del gioco vero nel Game Boy (`strumenti/texture_tavola.js`: profilo del telefono, tasselli, look D,
362×692 px di scena).

## 1. Da dove viene il suolo

| pezzo | file:riga (prima del lavoro) | cosa fa |
| --- | --- | --- |
| tela del blocco (64 m) | `render.js:3303-3308` (`buildChunkGen` → `paintTilesG`, `blobs1`, `blobTex1`, `sabbiaBagnata2` …) | il **colore** a 8 px/m (computer) e 4 px/m sul telefono (`leggera_memoria.js` «terreno»: metà lato) = un texel ogni 25 cm; trilineare, anisotropia 4 |
| tela «piatta» | `render.js:10338` (`PAV1` → `Pavimenti.piatto`, sfocatura 0,6 m) e `pavimenti.js:555` (`texture2D(map, vUv, 4.)`) | i motivi della tela si sfumano: resta la tinta; il disegno lo fa lo shader |
| **lo shader del suolo** | `pavimenti.js` `pvDett` (righe 214-545) | il disegno al pixel, a scala del mondo, per famiglia: basoli, travertino/piazza, porfido, asfalto, banchina, terra, sabbia, spianata, lastre del marciapiede col cordolo |
| mappe del blocco | `pavimenti.js:128-150` | per blocco: famiglia/vie a 50 cm (3 × Float32 128², 768 KB), muro/umido/ombra di contatto a 25 cm (RGBA8 256², 256 KB) |
| rumore | `pavimenti.js:574` (`pvNz`) | 256² RGBA8, lineare **senza mipmap** |
| il lontano | `render.js:3365` (`buildBase`) | tutta l'isola a **1 texel ogni 2 m**, lineare: dove il blocco non è ancora arrivato |
| la «calma» del suolo | `pavimenti.js:412` (`tone = mix(mean, tone, .65)`), `:517` (luminosità del disegno metà strada verso la tela sfocata, poi 28% verso .5) | toglie contrasto al disegno |
| il passo finale | `render.js:14112` (`suoloL .41, suoloK .74`), `:15015` | il valore del suolo stretto attorno a .41 con contrasto ×0,74 |
| erbacce | `render.js:7340-7420` (`buildVita1`, `tuft`), `vegetazione.js:563` (capperi, papaveri nelle crepe dei muri) | ciuffi fusi nella città (cotti nei tasselli), a macchie; ~3-8% dei lati di muro |
| prato | `render.js prato9`, `prato_fili.js` | non toccati |

Tessiture distinte del suolo: **una tela per blocco** + 4 mappe di dati per blocco + 1 rumore comune + la tela del lontano. Nessuna
tessitura fotografica, nessuna ripetizione di tessitura (il disegno è procedurale, per pietra).

## 2. Quanto si vede sullo schermo (densità alla camera del gioco)

Camera del gioco sul telefono: fov 72°, il personaggio a 10-11 m, la scena a 362×692 px.

| vista | metri per pixel al centro | in basso | in alto |
| --- | --- | --- | --- |
| partenza (piazza col porfido) | 2,3 cm | 1,1 cm | cielo/oltre 200 m (fino a 37 cm/px sull'orizzonte) |
| vicolo di basoli | 0,84 cm (la camera si stringe) | 0,66 cm | 1,5 cm |
| Via della Vittoria | 2,2 cm | 1,1 cm | orizzonte |
| lungomare | 2,2 cm | 1,2 cm | orizzonte |

Quindi da vicino i pixel ci sono (2 cm/px: un basolo di 65 cm è 30 px). Il disegno però si spegne per distanza:
- profilo leggero (telefono) `pavimenti.js:219`: `lod = 1 − smoothstep(.04, .12, mpp)` → a 4 cm/px (≈ 18 m) comincia a sparire, a 12 cm/px
  (≈ 50 m) **ritorno anticipato**: solo la tela sfocata (`:227`);
- il porfido `:331`: i cubetti spariscono fra 2,9 e 7,3 cm/px (13-30 m): oltre resta una tinta;
- la grana, i pori, le crepe dell'asfalto, la ragnatela, i ciottoli della terra stanno sotto `#ifndef PV_LITE`: **sul telefono non ci sono**.

## 3. Il contrasto che arriva allo schermo (perché «piatte»)

Un gradino di valore da pietra a pietra, nello shader, passa per: la calma del disegno ×0,65 (`:412`) → la luminosità metà strada verso la
tela sfocata ×0,5 (`:517`) → il 28% verso .5 ×0,72 → il passo finale ×0,74. **Arriva il 17%.** I giunti (scuri del 32%, `PV_JT`) arrivano
come una riga scura dell'**8%**: sotto la soglia di lettura alla camera del gioco. Lo sporco al piede dei muri (×0,82) passa per la stessa
calma. È la causa principale del «semplice e piatto»: il disegno c'è, ma arriva a un sesto.

## 4. Tipo per tipo

| tipo (FAM) | disegno di oggi | cosa manca |
| --- | --- | --- |
| basoli dei vicoli (1) | file di 65 × 72-126 cm, giunto 1,2 cm, 3 toni a rumore, un basolo di lava su 16 | scheggiature, crepe, pietre mancanti o affondate, sporco nei giunti e al muro, erba nelle fughe; i giunti all'8% |
| travertino, piazze (2) | lastre 1,1 × 1,3-2,2 m, fasce scure ogni 6 m | al sole è **slavato** (la Vittoria): niente crepe, niente macchie, le fasce si perdono |
| porfido (3) | cubetti di 16 cm a ventaglio 2,4 m | oltre ~13 m (2,9 cm/px) è una tinta piatta: il ventaglio non si legge (la partenza) |
| asfalto (4) | grigio caldo, chiazze lente, toppe col filo, olio, tombini; crepe e ragnatela solo sul computer | **niente buche**, sul telefono niente crepe; il ciglio pulito |
| banchina (5) | lastre 1,5 × 1,9-3,1 m | come il travertino |
| terra, spianata (6, 8) | rumore a due scale, «ghiaia» a puntini di 4,5 cm (sotto il pixel oltre 2 cm/px), ciottoli a celle solo sul computer | sul telefono **niente sassi**: la ghiaia non si legge come ghiaia; niente crepe della terra secca |
| sabbia (7) | `riva.js` e la sabbia di A | (il disegno di E solo con lo stile E) |
| lastre del marciapiede (9) | 50 × 54-96 cm col cordolo di granito | come i basoli; il marciapiede cotto nei tasselli |
| erbacce | ciuffi fusi rari (lungo le vie ogni ~1,3 m con il 14-24%, a macchie) | i «fili che escono» dalle fughe e al piede dei muri |

## 5. I casi peggiori

1. **Il medio (13-50 m)**: il porfido e i basoli si spengono in una tinta piatta, poi la tela sfocata; sopra il personaggio la piazza della
   partenza è una campitura beige con due macchie. È il «sfocato che poi diventa piastrelle».
2. **Il lastrico al sole** (Via della Vittoria): lastre grandi, giunti all'8%, valore alto: pulito e slavato.
3. **Il vicolo**: basoli grandi e puliti, viola nell'ombra, nessun difetto: «troppo nuovo».
4. **L'asfalto**: una campitura grigia con le strisce; niente buche; sul telefono neanche una crepa.
5. **Ghiaia e terra sul telefono**: rumore senza sassi (vedi le viste ghiaia e sterrata).
6. **L'arrivo dei blocchi**: il lontano a 1 texel ogni 2 m, poi il blocco col disegno pieno che scatta in un fotogramma.
7. **Lo sfarfallio lontano**: il rumore `pvNz` letto fino a 85 celle/m senza mipmap.

## 6. Cosa si è fatto

Tutto dietro una manopola sola, `pvTx` (uniform di modulo, 1 di serie; `?notexture` 0; `window.__TEX.imposta(0|1)` dal vivo: è quello che usa
la tavola prima/dopo nello stesso fotogramma). Con la manopola a 0 lo shader fa esattamente quello di prima.

1. **L'inchiostro dopo la calma** (`pavimenti.js`, il blocco «[texture] dopo la calma»): giunti, crepe, bordi di buche e scheggiature, archi
   del porfido si stendono *dopo* le correzioni di tono del suolo, come righe di 1 px (più spesse da vicino) di un viola scuro come le ombre
   del look D; il valore pietra per pietra (tre gradini) e le macchie larghe anche dopo la calma. Il suolo resta medio (mai bianco): le
   correzioni di valore restano, il disegno non passa più a un sesto.
2. **Pietra per pietra** (basoli, travertino, banchina, lastre): tre valori; ~18% scheggiate (l'angolo tagliato col filo), 8% (basoli) / 22%
   (lastre) crepate (la crepa disegnata a mano che parte dal dentro e si ferma al giunto), 3,5% dei basoli mancanti (la buca di terra col
   bordo, a volte l'erba), 5% affondate e sporche, 3% consumate e lucide. Si spegne quando la pietra scende sotto i 3-6 px (niente moiré).
3. **Porfido**: i cubetti a tre valori col giunto finché sono ≥ 3-5 px, poi **gli archi e i confini dei ventagli come righe** fino a 5 px
   fra un arco e l'altro: il motivo arriva al medio invece di diventare una tinta; qualche cubetto saltato.
4. **Asfalto**: le crepe anche sul telefono (una lettura), più diffuse; **le crepe sigillate col bitume** (righe nere lucide e mosse lungo la
   via); **le buche** (una ogni ~27 m di via: l'ovale storto, il fondo scuro con la ghiaia, il bordo d'inchiostro, il labbro chiaro,
   l'acqua); lo sporco contro il cordolo; giunti e filo delle toppe come inchiostro.
5. **Terra e ghiaia**: chiazze a due toni col bordo netto (2 m), la ghiaia a sassolini da una cella sola (10 cm, tre valori, l'ombra sotto,
   qualche filo) sulle spalle e sulla gobba delle sterrate, al piede dei muri e a chiazze; sassi grandi (14-32 cm) col contorno, l'ombra
   sotto e la luce sopra; crepe della terra secca; il bordo dei solchi.
6. **Lo sporco al piede dei muri**: una fascia a bordo mosso e netto (24-46 cm) più scura e calda, la riga dell'acqua a tratti, i giunti più
   pieni vicino al muro.
7. **Le macchie larghe nel mondo** (5-20 m, due toni col bordo netto ma non duro): umido (più scuro e freddo, lucido) e consumo (più chiaro e
   caldo), su tutti i suoli e **anche lontano** (il ritorno anticipato): niente più tela sfocata uniforme.
8. **Le erbacce**: dipinte nelle fughe (verde oliva, a ciuffi, dove nessuno pulisce: vicino ai muri, ai margini) e **in 3D** (`src/erbacce.js`,
   un disegno): ciuffi di 5 fili al piede dei muri, al piede del cordolo e dei gradini (dalla quota vera della superficie), radi nelle fughe,
   a macchie sulla terra.
9. **Lo scatto dei blocchi**: il disegno del blocco appena arrivato entra in 0,7 s (`pvFd`, una uniform per blocco, il materiale era già uno
   per blocco) invece di scattare sopra il lontano sfocato.
10. **Il rumore con le mipmap** (`LinearMipmapNearest`, un ciclo di filtro come prima): letto ad alta frequenza da lontano si media invece di
    sfarfallare.

## 7. Il costo

- **Disegni**: +1 (le erbacce, un disegno per tutti i ciuffi). Nessun materiale nuovo per blocco o per tassello (la manopola è una uniform di
  modulo; i marciapiedi cotti la ritrovano per nome, `PAV.tx` fra le uniform dei tasselli).
- **Memoria della scheda video** (telefono): rumore con le mipmap +85 KB; la mappa delle erbacce 54² × 16 B = 47 KB; i vertici delle erbacce
  2.025 posti × 15 vertici × 20 B = 0,6 MB. **≈ +0,74 MB** (computer ≈ +2 MB). Nessuna tessitura nuova nei tasselli (i 4,4 MB restano).
- **Scheda video, per pixel di suolo (stima dal codice, profilo leggero)**: la macro 2 letture + ~15 operazioni su tutto il suolo (anche
  lontano); dentro il disegno, secondo la famiglia, +1-3 letture e +40-70 operazioni (le crepe e le buche solo dentro le loro celle); il
  suolo leggero di prima ≈ 8-10 letture e ~250 operazioni → **+25-35% sul costo del suolo**. Sul telefono il suolo è ~125 k pixel (metà di
  362×692): ≈ +0,3-0,6 ms per fotogramma su una scheda media (Mali-G57/Adreno 610), stima non misurata su un telefono vero (in SwiftShader i
  millisecondi non valgono). Il ritorno anticipato oltre 12 cm/px resta dov'era (il disegno pieno non si estende più lontano).
- **Erbacce**: ~30 k vertici sul telefono (una lettura di tessitura nel vertice, come `prato_fili`), i ciuffi assenti chiusi in un punto;
  la mappa rifatta a pezzi di ≤ 2 ms quando ci si sposta di 2,5 m.
- **Processore**: niente per fotogramma oltre la mappa delle erbacce; la dissolvenza dei blocchi è un `onBeforeRender` per blocco nei primi
  0,7 s.

## 8. Per gli altri (cose in comune)

- **Squadra suolo (geometria, giunzioni)**: niente di geometrico è toccato. Le erbacce 3D cercano il piede dei muri dalle caselle `BLD` e il
  piede dei cordoli e dei gradini **dalla quota della superficie** (`Render.groundH`, che comprende i marciapiedi): se il cordolo o le scale
  cambiano, i ciuffi li seguono da soli. Il disegno del suolo (`pavimenti.js`) è lo stesso materiale di prima per blocco e per marciapiede:
  se servisse un materiale comune del suolo, la manopola `pvTx` e il blocco «[texture]» vanno portati con lui.
- **render.js**: una riga sola (le uniform dei tasselli: `Pavimenti.U` → `PAV.tx`, così i marciapiedi cotti seguono la manopola).
- **Tasselli**: `pavimenti.js` e `render.js` sono nell'impronta: i tasselli vanno ricotti (`python3 build.py --tasselli`); le erbacce
  (`erbacce.js`) stanno fuori dall'impronta, come `prato_fili.js`. Nessuna tessitura nuova nei tasselli.
- **Sonde**: `strumenti/texture_tavola.js` (+ `.py`, la tavola prima/dopo nel Game Boy: `__TEX.imposta(0|1)` nello stesso stato, i disegni
  alternati 0/1/0/1, la densità sullo schermo), `strumenti/texture_sonda.js` (chi c'è sotto un punto dello schermo e la mappa del blocco
  attorno; `window.__PAV_TIENI` tiene leggibili le mappe).
