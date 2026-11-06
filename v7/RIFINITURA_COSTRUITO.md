# Porto Vecchio — RIFINITURA DEL COSTRUITO (stile E, «via di mezzo 55»)

Il committente: «tetto per tetto, ombrellone per ombrellone, superficie per superficie bisogna pensare come migliorare il look, perché ancora
certe cose sono un po' buttate lì come dettaglio, stile, texture, diciamo come rifinitura: si deve vedere la cura per i singoli elementi e
ambienti oltre quella generale».

Questo cantiere fa la parte dei **modelli e dei materiali** del costruito (BIBBIA_STILE.md, terza versione e §11, punti 1, 2, 4, 5): il passo
unico (render.js, un altro cantiere) contorna e spinge, ma se un'insegna e il muro hanno lo stesso valore e la stessa tinta restano una cosa
sola. Qui la separazione degli elementi nasce già nel colore e nel disegno della materia.

- **Acceso solo con `?stile=E`** (anche `E1`, `E2`, minuscolo; o `window.PV_STILE` che comincia con E prima del caricamento). Senza, nessun
  file cambia comportamento: `RifCostruito.on === false`, niente aggancio, nessuna riga di shader, nessun colore toccato (le prove lo
  controllano). **Interruttore: `?norifcostruito`** (stile E del passo senza la rifinitura del costruito).
- **render.js non è toccato.** I materiali delle case e delle parti nascono là ma si riconoscono: l'intonaco dei moduli del kit porta
  `userData.plaster`; le parti piccole stanno in due atlanti (FA 1024 × 2048 a celle di 32 texel, CA 256 × 1024 a celle di 16). Con lo stile
  acceso `THREE.Material.prototype.onBeforeCompile` diventa una proprietà con getter e setter (`src/rifinitura_costruito.js`): la prima
  funzione data a uno di questi materiali (o quella vuota del prototipo, per gli atlanti) si avvolge **una volta sola** col pezzo di shader
  di qui, che gira **prima** dei pezzi della fusione di [leggero] (la tavolozza `pal1`, la pila delle mappe `lay1`): la pila sostituisce
  anche le letture di qui. Le regole della prova a vuoto di `arrOk1`/`palOk1` sono rispettate (solo `texture2D(map, …)`, niente `diffuse`,
  niente `textureLod`), quindi nessun materiale esce dalla pila e i disegni restano quelli.
- Il resto sta nei generatori dei file del costruito: `tetti_vissuti.js` (il manto), `arredo3d.js` (arredi, ombrelloni, tende, bancarelle,
  targhe), `segnaletica.js` (le insegne dei mestieri), `pezzi_citta.js` (i pezzi grandi della città).

## La tavolozza per tipo di elemento (§11.1)

Una tavolozza sola (BIBBIA §1). Ogni tipo di elemento ha i suoi inchiostri e una **fascia di valore** (Oklab L): il gradino fra vicini è
fisso, così ogni cosa si stacca dalla vicina già nel colore della scena, prima del passo.

| elemento | inchiostri | valore (L) | gradino contro il vicino |
|---|---|---|---|
| muro (intonaco del kit) | osso, pesca, carta, ocra, sasso (uno per casa) | ~.80–.88 | il più chiaro della via |
| cornici, lesene, telai chiari | osso | muro +.03–.05 | si legge come riga chiara |
| coronamento del kit | cotto | | contro il cielo e il tetto |
| persiane | persiana (verde), oltremare, mattone | ~.50 | muro −.3 |
| vetri piccoli | notte + riflesso a banda cielo | ~.3 | il più scuro della facciata |
| tetti a coppi e marsigliesi | cotto | quello di A | il passo li porta a ×(1 − .1k) |
| tetti d'ardesia | piombo | quello di A | |
| tende, ombrelloni, bancarelle | cotto / oltremare / persiana / ocra / rosa / acqua + carta | .56 (ocra .64) e .90 | ≥ .25 fra le due righe |
| filo d'inchiostro (cuciture, orli, barre) | lavagna | .30 | il segno del disegnatore |
| insegne | il fondo dalla sua famiglia, la scritta carta o nero | contrasto pieno | bordo nero |
| arredi (ghisa, gomma, legno, zinco, cemento, pietra) | la famiglia della tinta di prima | la fascia del genere | |

Mai i riservati (vermiglio, limone, allarme): le coppie delle tele e le insegne li evitano (prova `test_rifcostruito.js`).

## Elemento per elemento

### 1. I tetti (coppi, marsigliesi, ardesia, lastrici dei terrazzi) — `tetti_vissuti.js` (`applicaE`)

- **Riferimento ligure**: i coppi di cotto a canale e coperta che dall'alto fanno file ondulate, le marsigliesi più rosse e regolari, l'ardesia
  di Lavagna a lastre sfalsate (grigio-lilla), i terrazzi a pianelle di cotto o quadrotti di cemento. Il vissuto: qualche rappezzo di coppi
  nuovi più accesi, una zona vecchia più scura, una tegola cambiata, il muschio verso nord e sulla gronda.
- **Prima**: la tela del manto (16 px/m) ingrandita dalla camera vicina: tegole sfocate e grandi, puntini di licheni, colature, rumore di
  macchie; l'ardesia senza alcuna cura (non aveva il manto).
- **Trattamento fumetto**: il manto **disegnato** in ogni fila a ogni distanza utile. La campitura è la media della tela (la mipmap più alta)
  portata verso il cotto (l'ardesia verso il piombo, più leggera) col **valore di A**. Dentro la cella del manto il profilo a **tre toni netti**
  (coppo: dorso chiaro, fianchi, canale scuro; marsigliese: i due canaletti; ardesia: piatta con lo spigolo alto chiaro); il **labbro di ogni
  fila è una riga scura di 1 px antialiasata** (fwidth) con la testa al sole sopra; i giunti di colonna (marsigliesi, ardesia, lastrici) più
  leggeri. Ogni tegola il suo tono (tre gradini), **i rappezzi a gruppi di 4 × 3 tegole** (nuove: più accese verso l'ocra; vecchie: più scure)
  e una tegola su 55 cambiata: il vissuto disegnato a tegole intere, non a macchie. Dove la fila scende sotto 4–6 px le righe svaniscono e
  resta la campitura (niente moiré, niente grana). Il muschio a chiazze grandi col bordo netto (antialiasato), niente licheni a puntini né
  crepe; l'umido dei lastrici a chiazze piatte; le pianelle rotte e i rappezzi a pianelle intere.
- **Costo**: nessuna tessitura né disegno in più; ~45 operazioni e 2 letture per pixel di falda, **meno** del manto di prima (che faceva 4
  rumori e i licheni). Un programma per genere (`tv1e-<genere>`), come prima. L'ardesia entra nel manto solo in E.

### 2. Le facciate: l'intonaco dei moduli del kit — `rifinitura_costruito.js` (`GL_INTONACO`)

- **Riferimento**: le facciate dipinte liguri (Camogli, Portofino, Boccadasse): ocra, pesca, rosa salmone, panna; cornici e lesene chiare
  dipinte; persiane verdi.
- **Prima**: un grigio latte con la grana, le macchie larghe, le colature, lo sporco sotto i marcapiani e l'intonaco caduto coi mattoni:
  rumore che il passo fumetto trasforma in pappa.
- **Trattamento**: la cella del muro **senza grana, macchie, colature né mattoni** (la superficie calma che la BIBBIA §1.1 chiede nei
  materiali); la tinta **una per casa** dall'hash della casa fusa (`bId1`): osso, pesca, carta, ocra, sasso, portata in parte (.42–.72) verso
  l'inchiostro col valore tenuto nella fascia chiara del muro. Le celle delle **cornici e delle colonne** verso l'osso e un poco più chiare
  (la riga chiara del telaio), il **coronamento** verso il cotto.
- **Costo**: ~15 operazioni, 1 lettura: **meno di prima** (la grana e le macchie a 3 rumori non si calcolano più).

### 3. Le facciate: le parti (persiane, telai, davanzali, cornici, balconi, mensole, comignoli, lucernari, tende) — atlanti FA e CA

- **Prima**: ogni cella dell'atlante ha la sua grana (puntini, sporco in basso, ruggine a colature): le persiane fangose (verde bottiglia,
  noce, sangue di bue spenti), i telai senza bordo, tutto si mescola col muro.
- **Trattamento**:
  - **campitura calma**: la cella si legge come la media di due texel centrali; il disegno strutturale che conta (le **lamelle** delle
    persiane, le assi, le righe) resta a **due toni netti**; la grana, la ruggine e lo sporco spariscono;
  - **le persiane** (riconosciute dalle lamelle) verso il verde persiana (o l'oltremare, o il mattone per quelle brune) con il valore portato
    a ~.5: il gradino pieno contro il muro chiaro;
  - **i vetri piccoli** (FA): scuri e piatti (notte) con **un riflesso a banda** netto (cielo), come vuole §11.5;
  - **gli spigoli disegnati**: il bordo di ogni faccia delle parti è **una riga scura di 1 px antialiasata** (fwidth della coordinata della
    cella), solo sulle **facce piane** (la normale che non cambia nel pixel) e solo dove la faccia è larga almeno 5–9 px sullo schermo:
    telai, cornici, davanzali, mensole, persiane, balconi hanno il contorno del disegnatore; da lontano le righe svaniscono da sole.
- **Costo**: ~30 operazioni e 7 letture (in cache: texel fissi della cella) solo sui pixel delle parti; nessun disegno in più.

### 4. Gli ombrelloni (da bar e da spiaggia) — `arredo3d.js`

- **Riferimento**: gli ombrelloni dei bagni liguri a spicchi alterni (blu e bianco, verde e bianco, arancio e bianco), quelli dei dehors in
  tela a due colori, con la balza.
- **Prima**: due beige quasi uguali (dal lungomare non si distinguevano dalla sabbia), otto copie del materiale per ombrellone.
- **Trattamento**: la coppia di inchiostri dalla tavolozza (`RifCostruito.righe`: l'inchiostro pieno a .56 e la carta a .90, un gradino ≥ .25),
  scelta dalla tinta di prima (gli stessi ombrelloni restano «quelli rossi», «quelli blu»; il rosso va al cotto, il rosa resta rosa: rosa e
  viola sono accenti della tavolozza e li prende solo chi lo è già); **le otto cuciture** dalla punta all'orlo e **l'orlo**
  della tela e della balza in filo d'inchiostro (lavagna): dall'alto l'ombrellone è un disegno a spicchi contornato. Le due tele condivise
  (non più 8 copie).
- **Costo**: +10 mesh piccole per ombrellone (8 aste a 4 lati, 2 anelli a 8 lati, ~400 triangoli) **in un materiale condiviso**: nella fusione
  delle statiche non aggiungono disegni; i materiali per ombrellone da spiaggia scendono da 8 a 2.

### 5. Le tende delle botteghe e le bancarelle — `arredo3d.js`

- **Riferimento**: le tende da sole a righe delle botteghe liguri, le bancarelle del mercato col telo a strisce.
- **Prima**: le righe sbiadite (`mute`) con l'ombra dipinta in basso, la barra e i bracci di zinco.
- **Trattamento**: la coppia di colori **letta dalla tela di chi la posa** (render.js `tendaMat`, `stripeMat`) e portata alla coppia della
  tavolozza; righe nette di ~25 cm (16 texel l'una), niente ombra dipinta; il **cassonetto, la barra di carico e i bracci in filo d'inchiostro**:
  l'orlo della tenda disegnato. Le bancarelle: le stesse coppie e l'orlo del telo disegnato.
- **Costo**: una tela 16 × n texel per coppia e larghezza (poche: la larghezza si arrotonda a mezzo metro), nessun disegno in più.

### 6. Le insegne e le targhe — `segnaletica.js`, `arredo3d.js`

- **Riferimento**: le insegne dipinte e smaltate delle botteghe anni '70–'80, leggibili da lontano.
- **Trattamento** (§11.5, il pannello grafico): il fondo verso l'inchiostro della sua famiglia, **la scritta a contrasto pieno** (carta sul colore,
  nero sulla carta; l'accento giallo di garage e birrerie diventa ocra), **il bordo nero**, niente sporco né usura. Le targhe degli arredi
  (`targaMat`: fermate, gelati, gas, menù) uguali: niente puntini di ruggine né sporco.
- **Costo**: zero (le stesse tessere, ridipinte una volta).

### 7. Gli arredi (lampioni, panchine, cestini, chioschi, edicola, cabina del telefono, fioriere, dehors) — `arredo3d.js` (`mat`)

- **Trattamento**: ogni tinta verso l'inchiostro della sua famiglia (per tinta, il croma appena: il colore resta suo), il valore dentro la fascia
  del genere (ghisa e gomma fonde, legni a mezzo valore, tele chiare, pietra chiara). I grigi verso il piombo appena (come il passo).
- **Costo**: zero.

### 8. I pezzi grandi della città (campanili, portici, bastioni, moli...) — `pezzi_citta.js`

- **Trattamento**: le tinte verso la tavolozza; **l'usura a un terzo** (niente croste nere, colature e licheni a macchie) e il tono dei conci più
  calmo; i giunti restano netti. Solo uniform: lo stesso programma (`pz2`).
- **Costo**: zero.

### 9. Le scale (scalinate, gradini del sagrato e della darsena) — `pezzi_citta.js`

- **Riferimento**: le crêuze e le scalinate liguri in pietra di Finale o ardesia, il gradino col naso consumato e chiaro, l'alzata in ombra.
- **Prima**: la scalinata aveva già il filo chiaro sul naso ([sguardo]); i gradini di `scala()` (sagrato, darsena della Rocca) nessun segno:
  dall'alto una rampa grigia dove i gradini non si contano.
- **Trattamento** (solo E): sotto il naso chiaro **la riga d'ombra sull'alzata** (4 cm, d'inchiostro `buio`) e **al piede di ogni alzata la
  riga del contatto** con la pedata di sotto: il disegnatore conta i gradini, chiaro – scuro – pedata. In `scala()` anche il naso chiaro.
  La scalinata: una mesh sola in più (i due fili di tutti i gradini estrusi insieme), in un materiale già esistente: fusa per materiale.
- **Non toccati**: i gradini delle porte (`render.js` `gradino1`, hanno già il naso acceso e la riga del piede nella città nuova) e la
  scaletta di cemento della strada sul mare (`render.js`, `A.scale`): servirebbe una riga di posa in render.js, lasciata al proprietario.
- **Costo**: +2 triangoli·12 per gradino, nessun disegno in più.

## Le misure

- **Disegni e programmi** (sonda nel vicolo, 960 × 540, leggera, lo stesso istante): A 345 disegni, 184 programmi; E 346 disegni, 189
  programmi (+5: il manto E per genere, l'intonaco e i due atlanti avvolti). I disegni non cambiano (±1 è il rumore delle persone).
- **Lo shader**: il manto E costa meno del manto di prima (2 letture e ~45 operazioni contro 4 rumori e i licheni); l'intonaco ~15 operazioni
  (prima 3 rumori a due ottave); le parti dell'atlante ~35 operazioni e 7 letture fisse per cella (in cache) solo sui loro pixel, che sono
  pochi (telai, persiane, davanzali). Su Iris Xe la differenza è sotto il rumore di misura del banco; da riprovare con
  `strumenti/banco_gpu_console.js` sul portatile vero (`?leggera&perf&noritmo&stile=E` contro senza).
- **Memoria**: nessuna tessitura nuova eccetto le tele delle tende (16 × n texel per coppia e larghezza: decine di KB in tutto).

## Le prove

- `node src/test_rifcostruito.js` (nuova): spenta senza E, accesa con E/E1/e, l'interruttore, la tinta che tiene il valore, le coppie con il
  gradino ≥ .25, l'aggancio che avvolge una volta sola intonaco e atlanti e non gli altri, le regole del GLSL (niente `map` fuori da
  texture2D, niente `diffuse`, solo ASCII) per l'aggancio e per il manto E di ogni genere.
- Passano: `test_tetti.js`, `test_tetti3.js`, `test_tetti_vissuti.js`, `test_segnaletica.js`, `test_rifcostruito.js`.
- `test_tasselli.js`: una prova non passa **anche senza questo lavoro**: l'impronta che la prova ricalcola non conta i `.gz` degli assets,
  build.py sì (`[compressi]`): è la prova da allineare, non la build.
- La prova di fumo (`fumo6.js`) dà `errori []` (vedi il rapporto).

## Le tavole

`_immagini/rifinitura_costruito/`: una per tipo di elemento, prima (A) | dopo (`?stile=E`, i materiali, col passo di oggi) | dopo + il
passo E a 55 (l'anteprima di `prototipo3.py` a k = .55 sulla cattura, con la profondità della cattura), alla camera di gioco e in ritagli
ingranditi (la camera7 non scende sotto la sua distanza: il primo piano è il ritaglio). Le tavole 6 e 7 sono il **banco dei modelli** (gli
arredi e le scale da soli, stessa luce, prima | dopo): il primo piano vero dei modelli.
1. `1_tetti.jpg` — 2. `2_facciate.jpg` — 3. `3_ombrelloni.jpg` — 4. `4_tende_dehors.jpg` — 5. `5_arredi_insegne.jpg` —
6. `6_modelli_primo_piano.jpg` — 7. `7_scale.jpg`.

Quello che si vede: i **tetti** sono il guadagno più grande (dalla tela sfocata ai coppi e alle lastre disegnati, il passo li tratteggia
pulito); le **persiane** a lamelle nette e verdi; gli **ombrelloni** a spicchi con le cuciture e l'orlo (sul lungomare il passo di oggi
spegne il colore delle tele: lo riporta il passo E); le **facciate** più calme (niente macchie e colature), il cambio è di misura; in **piazza
la sera** quasi nulla cambia, perché i fronti della piazza sono di altri sistemi (gli scorci e i palazzi dipinti di render.js).

## I tasselli (la città cotta)

La città di produzione arriva in tasselli cotti nella build (strumenti/tassella.js, senza `?stile`): case fuse, tetti, arredi, segni sono
mesh cotte e i loro materiali portano il testo dello shader e i colori della cottura. Quindi **con i tasselli la rifinitura non c'è**: in
locale senza tasselli (come in queste prove) e con `?tasselli=0` funziona tutto. **Serve una ricottura** perché si veda in produzione, in uno
dei due modi:
1. una cottura dei tasselli con `?stile=E` nell'indirizzo di tassella (un secondo insieme, `tasselli_E/`, scelto da tasselli.js quando
   l'indirizzo ha `stile=E`): semplice, ma raddoppia lo spazio dei tasselli;
2. meglio: i rami di qui letti da un'uniform di stile (come `sgP10` del passo) invece che dalla bandiera di compilazione, e i colori degli
   arredi e delle tele scelti nello shader: una cottura sola. È più lavoro (la tavolozza degli arredi oggi è nei colori dei vertici).
Ogni cambio a `tetti_vissuti.js` cambia anche l'impronta del mondo cotto (`mondo_cotto.js` rifatto da build.py, incluso nel commit).

## Cosa servirebbe da render.js (per chi lo tiene)

- **Il più importante: il piano dei valori della direzione schiaccia i gradini di qui.** `DIR.muriSat .44`, `muriK .7` attorno a `muriL .68`
  (render.js ~13864, uniform `dV`/`dW`) portano TUTTO ciò che non è suolo né tetto (muri, persiane, tende, ombrelloni, arredi) al 44% di
  saturazione e comprimono il valore del 30% verso .68: è per questo che sul lungomare gli ombrelloni ciano, rosa e gialli arrivano beige
  (tavola 3) e che i gradini di valore muro/persiana/vetro si riducono. Con lo stile E (`STILE.V.E`) servirebbe `muriSat` ~.8 e `muriK`
  ~.9: la separazione per elemento la fanno ora i materiali, la tavolozza del passo ci spinge sopra.
- I **vetri delle vetrine** e la **fascia col nome** delle botteghe (`fronteBottega`), le **saracinesche** (`sgaMesh`) e i **canali di gronda**
  (`sm('#7c8288')`) nascono in render.js con materiali senza segno: per la vetrina come pannello grafico (vetro notte piatto con il riflesso a
  banda, la fascia carta su colore) e la saracinesca sempre più scura del muro di ≥ .12 basta un `userData.rc = 'vetrina' | 'fascia' |
  'saracinesca' | 'gronda'` sul materiale: l'aggancio di qui li prende.
- Le **tende delle finestre** (`F2V.tende`, celle 'cloth' dell'atlante) prendono qui la campitura calma e lo spigolo disegnato ma non la coppia
  della tavolozza: basta passare i colori da `RifCostruito.righe()` quando `RifCostruito.on`.
- Il **marcapiano disegnato** sull'intonaco (una riga a ogni piano) chiede la quota del piede della casa nello shader: oggi la fusione porta
  `bId1` e la tessitura FD1 (taglio, filo); una componente con la quota del piede renderebbe possibile la riga a 3,6 + 2,4·n m.
