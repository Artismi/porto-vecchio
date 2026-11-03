# Porto Vecchio — La profondità e la pulizia ([profondita2], 3 novembre)

Il committente, dopo aver giocato: «L'immagine è ancora piatta. Ci sono tante piccole corruzioni e rumore di pixel, come i cerchi ai piedi
degli alberi che sembrano ombre a sbalzo, o l'alone attorno al personaggio che confonde tutto. Tutto è molto rumoroso, così guardando
lontano tutto si appiattisce: non si legge la profondità, né la successione e la sovrapposizione delle cose. [...] Tutto sta sullo stesso
piano; non capisco perché esce così.»

Questo documento è la diagnosi (§1-2, con le prove) e l'intervento (§3-5). La regola resta `DIREZIONE_ARTISTICA.md`; qui si aggiunge il
pezzo che mancava: **la profondità e la pulizia**. `?noprofondita` riporta il look di prima, identico.

## 0. Come si è guardato

Il gioco vero, **alla camera di gioco** (non gli scorci della galleria): `strumenti/sonda_profondita.js` porta il personaggio a passo d'uomo
lungo una via della rete (camera5 vera: regista, aria davanti, pendenza della gerarchia, zoom di gioco .72) e scatta mentre cammina. Ogni
variante (una manopola spenta, un sospetto tolto) fotografa **lo stesso istante**. Le scene (`strumenti/profondita_scene.json`): un vicolo
(vic_corte2, pendenza 63°), la piazza (Rua, 45°), la Via della Vittoria (la via lunga e dritta, 45°), un vicolo lungo e stretto (mezzo),
gli alberi (i lecci col piede e la formella), il lontano (zoom 1,4 sulla Vittoria).

- **Portatile del committente** (Iris Xe, profilo leggero): 1536×864 CSS a dpr 1,25 → la scena e il passo a **1137×640**, stesi dal browser a
  1920×1080 (1,69×). È qui che si giudica.
- **Telefono**: 390×844 a dpr 3 → 640×1385 (lato corto 640), stesi a 1170×2532.
- **Profilo pieno**: 1536×864 a dpr 1,25, `?alta`.

I fogli stanno in `_immagini/profondita/` (§6).

## 1. La diagnosi: cosa fa ogni difetto, e chi

In ordine di peso sull'immagine del profilo leggero. Le righe di `render.js` sono quelle **di prima** (commit 1873ee3).

| # | difetto (quello che vede il committente) | causa nel codice | prova | rimedio |
|---|---|---|---|---|
| 1 | **Gli anelli e il disco bruno attorno al personaggio, i cerchi «a sbalzo» ai piedi degli alberi e delle persone, le chiazze gialle e grigie sul lastrico** | Ogni materiale opaco scrive nell'alfa del bersaglio della scena la sua **categoria** (suolo, muro, tetto, persona: `render.js:13821`, il codice (cat×6+faccia)/35). I trasparenti senza profondità — l'ombra a disco del personaggio (`SGT.blob`, 14453), l'anello (19035), l'alone (1735), il disco sotto ogni chioma (`Ombra4`, 10127), le ombre a disco delle persone, le pozze e le macchie, le scintille — col blending normale di three mescolano **anche l'alfa** (srcA + dstA·(1−srcA)). Il passo finale legge allora codici inventati: un disco grigio al 34% diventa «muro», al 55% «tetto», al 67% «persona»; li grada come tali (il valore spinto a .66 o a .42, il colore del cotto), ci disegna la sagoma delle persone (il bordo scuro dell'anello) e il **piede** (`14355`: il suolo «sotto un muro» si scurisce a fasce sotto ogni disco: l'ombra a sbalzo). | `diagnosi/categorie_alfa.jpg`: la mappa delle categorie (giallo = codice inventato) copre a chiazze il suolo del vicolo e un disco intero sotto ogni albero; con l'alfa pulito la mappa è netta e gli anelli spariscono (`diagnosi/aura.jpg`, `diagnosi/piazza_persone.jpg`, `diagnosi/alberi.jpg`). Spenti uno alla volta: l'anello e la macchia nascosti non cambiano niente (non è il loro colore), il piede spento toglie le fasce, l'alfa pulito toglie tutto. | **L'alfa pulito** (§3.1). |
| 2 | **L'alone chiaro attorno al personaggio** | Lo scafo dell'alone (`ALONE3`, 1706/1735): le mesh del personaggio gonfiate di 3 cm, crema `#fff0d2` al 50% (×.45-1), sempre acceso nel look nuovo. A mezza risoluzione è un bordo chiaro di 1-2 px che sfarfalla. | `diagnosi/aura.jpg` | Fuori (`PFD.alone` 0): lo staccano la sagoma (già c'è), il valore e un'ombra piccola. |
| 3 | **Il retino di puntini sui cigli dei tetti vicino al personaggio** | Il varco del primo piano (`AD.taglio`, il taglio nei materiali, 13758): tutto quello che sta sopra 2,2 m, più vicino del personaggio, dentro un'ellisse di raggio .16 dello schermo, si apre; nel giro [direzione] col retino Bayer 4×4 nella corona .78-1. Il varco è **sempre aperto** (anche quando niente copre il personaggio), e la corona a mezza risoluzione è un anello di puntini da 1,7 px che strisciano. | `diagnosi/varco.jpg` (spento: i cigli tornano pieni). | Nei materiali: bordo netto, niente retino (§3.6). La logica (quando aprire) è della camera: passata all'agente della camera. |
| 4 | **Nel profilo leggero il passo non ha la profondità**: niente aria, niente stacco fra le cose sovrapposte | `PRO.prof` solo se `!PHONE` (13521): nel leggero il bersaglio non ha la tessitura della profondità, e tutto quello che nel pieno legge la profondità (l'aria `NIT.aria`, la sagoma `NIT.sagome`, il ciglio, il piede dei muri) è spento. Il giro [direzione] ha poi tolto tutte le linee tranne le persone: **le sovrapposizioni non hanno più nessun segno**, e nel leggero nemmeno un velo d'aria. | `diagnosi/lontano.jpg`: la fascia alta del quadro (lontano) è più satura e più contrastata della bassa (vicino): sat .38 contro .47, contrasto .139 contro .129: il contrario dell'aria. | **La profondità nel passo anche nel leggero** (una tessitura, §3.2-3.4). |
| 5 | **Tutto sullo stesso piano: tetti e suolo allo stesso valore, le facce che non si separano** | La gerarchia per categoria (`DIR`, 13690; il passo 14330-14345) **stringe il valore dentro ogni categoria**: muri verso .68 al 70% del contrasto, suolo verso .41 al 74%, tetti verso .42 al 70% e mai sopra .50. Le due falde, la faccia al sole e quella in ombra della stessa casa si avvicinano; tetti (.42) e suolo (.41) hanno lo stesso valore: dall'alto il piano più alto e il più basso si confondono. | `diagnosi/categorie.jpg`: con la gerarchia spenta le falde e le facce si separano (ma il cotto torna arancio: la gerarchia del colore serve, quella del valore no). | Il valore dentro le categorie meno stretto, i tetti un gradino sopra il suolo, la luce del cielo per quota (§3.5). |
| 6 | **Il grano che sfarfalla** | La grana d'emulsione (`AD.grana` .01, nel passo 14384) è per pixel della scena e cambia 12 volte al secondo: a mezza risoluzione, ingrandita 1,69×, è un tremolio a blocchi su tutto il quadro. | `diagnosi/grana_diff.png`: la differenza fra due fotogrammi fermi è rumore su tutto il quadro. | Nel leggero a 0, nel pieno a .006. |
| 7 | **I cerchi sotto gli alberi anche col filo pulito** | Il disco `Ombra4` (10127) è largo quanto la chioma (2,3 m × la scala) e centrato sul fusto. Col sole basso del look (18-33°) l'ombra vera della chioma cade lontano: il disco è un cerchio scuro senza causa. Gli alberi nel leggero non proiettano ombra (`castShadow` solo nel pieno, 2083). | `diagnosi/alberi.jpg` | Il disco diventa il **piede del fusto** (scuro dove tocca terra, sparito al 42% del raggio). |
| 8 | **Il piede che scurisce il suolo sotto le chiome a mezz'aria** | Il piede del passo (14355) legge la categoria 3-16 px **sopra sullo schermo**: se è un muro, una persona o «altro» scurisce. Una chioma a 4-6 m, una tettoia, un'insegna a bandiera fanno la loro fascia scura sul suolo che sta sotto sullo schermo ma lontano nel mondo. | `diagnosi/alberi.jpg` | **Il piede fisico**: dalla profondità, la cosa sopra deve stare a meno di 1,1 m nel mondo e più in alto di qualche cm (§3.4). |
| 9 | **La camera** (osservazioni, non toccata: è dell'agente della camera) | Il campo verticale è 30° a 45-47 m dal personaggio (`render.js` 19326-19335, `VIEW` 35 × zoom .72): un teleobiettivo. Le grandezze cambiano del ±12% fra il basso e l'alto del quadro: la prospettiva (la convergenza, le cose lontane più piccole) quasi non c'è, e le sovrapposizioni si leggono solo col valore e con la linea. Nei vicoli la gerarchia sale a 63° (`inquadra4`): una pianta. Lungo le vie lunghe la regia mette la camera **in asse** con la via (dietro la marcia): una composizione a un punto di fuga, simmetrica, con la via una striscia stretta al centro e i tetti al 60% del quadro, senza orizzonte né cielo a dare la misura. | `strada_lunga`, `lontano` | Per la camera (§7). Qui: l'aria e il filo fanno leggere i piani anche così. |

Controllati e non colpevoli alla camera di gioco: il retino del verde che cresce in cerchio (`vdMatF`, `?nofixverde`): il cerchio sta a 36 m
dal punto guardato, fuori dal quadro in cinque scene su sei (la differenza col verde spento è il rumore del fotogramma); il controluce delle
persone (`CAT.bordoPersone` .2) e la luce sul personaggio (`NIT.luce` .06): spenti cambiano il quadro di pochissimo, e non fanno l'alone; le
ombre della mappa del sole (nessun anello: il PCF è morbido).

## 2. Perché esce così (il sistema, non i pezzi)

Tre fatti insieme. (1) Il passo finale **decide tutto dalla categoria nell'alfa**, e l'alfa era sporco ovunque ci fosse un trasparente a
terra: la gerarchia del giro [direzione] è giusta, ma applicata a codici sbagliati faceva corruzioni a forma di disco, anello e chiazza.
(2) **Nel profilo del committente il passo è cieco alla profondità**: con le linee tolte (giusto: erano grovigli) non restava nessun segno
delle sovrapposizioni, e niente aria. (3) **La gerarchia stringeva il valore dentro ogni categoria**: pulito, ma piatto; dall'alto i tetti
(il piano più vicino) e il suolo (il più lontano) erano allo stesso valore. Con un teleobiettivo quasi senza prospettiva, il valore e la
linea sono gli unici segni di profondità: tutti e due mancavano.

## 3. L'intervento: un sistema solo (`PFD`, render.js, `window.__PFD`)

### 3.1 L'alfa pulito (la causa delle corruzioni)
Nel solo passaggio della scena (`PFA.on`), i trasparenti **che non scrivono la profondità** (ombre a disco, anelli, aloni, segni a terra,
scintille) mescolano il colore ma **lasciano l'alfa com'è**: la categoria della cosa sotto. Il vetro e l'acqua (trasparenti che scrivono la
profondità) restano come prima: sono loro la cosa. Si fa sui comandi di blend di WebGL (`pfdAlfa`, avvolge `blendFunc`,
`blendFuncSeparate`, `depthMask`): three li manda solo quando lo stato cambia, quindi **nessun costo per disegno e nessun materiale da
toccare**, anche quelli che nasceranno. Spenta dal vivo: `__PFD.alfa = false`.
Conseguenza voluta: il writing sui muri ora è «muro», e il tetto del pastello dei muri lo spegneva: gli accenti restano pieni da .62-.78 di
saturazione (prima .8-.9, quando il writing passava per un'altra categoria a caso).

### 3.2 La profondità nel passo, nei due profili
Il bersaglio della scena ha la tessitura della profondità anche nel leggero. Il passo la legge **6 volte** (una al centro, quattro a 1 px,
una a 4 px solo sui bordi) e ne ricava la distanza e il punto nel mondo di ogni pixel (le righe della camera).

### 3.3 Il filo dove una cosa passa davanti a un'altra
Sul pixel della cosa davanti, se il vicino a 1 px è più lontano del 5-10% **e lo è ancora a 4 px** (il fondo dura: la soglia di spazio
minimo). Una finestra incassata, una ringhiera, una cornice fitta non saltano (la superficie è continua, o il fondo non dura 4 px): **una
facciata ricca e un muro liscio hanno lo stesso filo**, solo sulla sagoma esterna, mai sugli spigoli interni. Il colore della cosa, più
scuro e un filo freddo (nel regime il grigio tecnico); più leggero lontano (a metà a 70 m oltre il personaggio). Le persone hanno già la loro
sagoma (il loro salto è sotto soglia: niente doppia linea).

### 3.4 L'aria e il piede fisico
- **L'aria**: oltre il personaggio, `1 − e^(−metri/38)`, al più .7: il lontano va verso il colore dell'aria dell'ora (la nebbia, un filo più
  freddo), perde metà del contrasto e il 40% del colore. Il primo piano non si tocca (resta il più ricco). Di notte l'aria è più debole.
- **Il piede fisico**: le quattro letture del piede ora vanno alla profondità: il suolo si scurisce solo se la cosa appena sopra sullo
  schermo sta davvero lì (a meno di 1,1 m nel mondo, più in alto di 6-30 cm e meno di 3,5 m). Un muro, una persona, un palo che toccano
  terra sì; una chioma, una tettoia, un'insegna a bandiera no. La gronda resta dalla categoria (ora pulita).

### 3.5 Il valore: tre facce, i piani staccati
- Dentro le categorie il contrasto non si stringe più (muri 1, tetti 1, suolo .95; erano .7, .7, .74): la faccia al sole, quella in ombra e
  il piano in alto si separano. Il colore della gerarchia resta (il pastello dei muri, il cotto calmo, il suolo caldo).
- I tetti a .48 (erano .42, mai sopra .50): un gradino sopra il suolo, sempre sotto i muri al sole.
- **La luce del cielo per quota**: il fondo della via (la quota del personaggio) −11%, i piani a 10 m e più +9%. È la scala del muro
  (chiaro in alto, scuro al piede: §2.6 della direzione) estesa alla città: dall'alto, dove la prospettiva quasi non c'è, i livelli si
  staccano per valore. Le persone no.

### 3.6 Il personaggio senza alone, e il varco
- Via l'anello a terra e l'alone chiaro (lo scafo). Restano la sagoma (una linea sola, già della direzione), il valore e l'ombra piccola
  ai piedi (che ora non diventa più un disco «persona» con l'anello).
- **Il varco nei materiali** (la sola parte del taglio toccata; la logica di quando aprire è dell'agente della camera): nel giro
  [direzione] l'ellisse si apriva piena dentro .78 e a retino Bayer 4×4 nella corona .78-1. Ora, con `PFD.on`, è **un bordo netto**: si
  scarta tutto dentro l'ellisse (`sgRr < 1`), niente retino. Il bordo del buco è un salto di profondità: il filo lo disegna pulito. Lo stesso
  uniform (`sgP7`: centro in px, raggio in px, distanza), la stessa ellisse (1 : 1,3), la stessa regola di quota e distanza.
  Per l'agente della camera: se vuole un'apertura graduale, la faccia col raggio (`sgP7.z`) che cresce, non con un retino.

### 3.7 Il grano
`AD.grana` 0 nel leggero (sfarfallava a blocchi), .006 nel pieno.

## 4. Il costo

- **Letture della tessitura per pixel nel passo finale, profilo leggero**: prima 22 (FXAA 9, la categoria e la sagoma delle persone 9, il
  piede 4) più una doppia; dopo **23 in media**: FXAA 9, la categoria e la sagoma 5 (la croce basta, l'alfa è pulito), la profondità 5 (+1 solo
  sui bordi), il piede 4 (alla profondità sul suolo, alla categoria sui muri). Le letture della profondità sono a 32 bit.
- **Rumori nel passo**: prima 2 hash per pixel nel leggero (la grana e il dither degli 8 bit), dopo 1 (il dither). Nei materiali nessun
  rumore in più.
- **Disegni**: meno lo scafo dell'alone (le mesh del personaggio, scheletrate, ridisegnate) e l'anello.
- **La profondità come tessitura** nel leggero: la memoria è la stessa del buffer di prima (2,9 MB a 1137×640); sulle schede a tasselli
  (telefoni) la profondità va scritta in memoria a fine passaggio (2,9 MB a fotogramma, ~175 MB/s a 60 fps): il prezzo vero del sistema.
- **Programmi**: nessuno nuovo (un `#define SG_PFD` nel passo unico; i materiali cambiano solo il testo del varco).
- La GLSL compila nei due profili (`&debug`: nessun errore di programma nelle sonde).
- SwiftShader non misura i millisecondi della Iris Xe: il banco (`strumenti/banco_gpu_console.js` sul portatile) resta da fare.

## 5. ?noprofondita

`?noprofondita` toglie `SG_PFD` dal passo, rimette il blending di prima, l'anello, l'alone, il disco largo, la grana, i valori della
direzione e il varco a retino: il look di prima, identico (§6, `identico_noprofondita.jpg`).

## 6. Le misure, i giri e i fogli

**I giri** (sempre lo stesso istante, varianti dal vivo; `strumenti/profondita_giri.json` e i fogli intermedi):
1. Il sistema acceso (alfa pulito, aria .42 a 70 m, filo .55, piede fisico, gerarchia .86/.9/.88): le corruzioni sparite, ma alla distanza di
   gioco aria e filo non si leggevano (il filo di 1 px a mezza risoluzione spariva; l'aria a 70 m toccava appena il fondo della via).
2. Aria .7 a 38 m, filo pieno con la soglia al 5%, la gerarchia senza stretta (1/1/.95), la luce del cielo per quota .14 poi .2, i tetti
   a .48: i piani si staccano (il fondo della via sotto, i tetti sopra, le facce al sole e in ombra separate). Ma i muri al sole si scaldavano
   verso l'arancio.
3. La luce per quota fredda (in alto schiarisce verso il blu, in basso scurisce verso il freddo), i muri a .92, gli accenti dei muri esenti
   solo da .7-.85 di saturazione (a .62 passavano gli intonaci gialli carichi): il pastello torna, la separazione resta.

**Le misure** (portatile, profilo leggero, la camera di gioco; `strumenti/misura_profondita.py`; prima → dopo):

| scena | rumore ai piedi del personaggio (|laplaciano|) | lontano/vicino: saturazione | lontano/vicino: contrasto | contrasto globale |
|---|---|---|---|---|
| vicolo | 32,9 → **17,1** | 1,00 → .96 | 1,10 → .89 | .172 → .193 |
| piazza | — | 1,09 → 1,05 | 1,35 → 1,41 | .163 → .180 |
| Vittoria (la via lunga) | — | 1,42 → 1,39 | 1,57 → 1,45 | .149 → .153 |
| vicolo lungo | — | 1,13 → 1,08 | 1,09 → 1,02 | .144 → .156 |
| alberi | — | 1,14 → 1,05 | .99 → .88 | .169 → .179 |
| lontano (zoom 1,4) | — | .80 → **.61** | 1,08 → **.86** | .138 → .172 |

(«lontano/vicino»: la fascia alta del quadro, un quinto, contro la bassa. Sotto 1 vuol dire che il lontano è più quieto del vicino, come deve.
Nella piazza e nella via lunga la fascia alta contiene facciate al sole vicine alla camera: lì il numero misura la composizione, non l'aria.)
La categoria per pixel è pulita (`categorie_dopo.jpg`: niente più giallo, il codice inventato). Il contrasto globale sale in tutte le scene
(le facce si separano) senza toccare i neri.

**I fogli** (`_immagini/profondita/`, prima a sinistra, dopo a destra; profilo leggero del portatile, 1137×640, la camera di gioco):
- `vicolo.jpg`, `piazza.jpg`, `strada_lunga.jpg`, `vicolo_lungo.jpg`, `alberi.jpg`, `lontano.jpg`: le scene intere;
- `personaggio.jpg` (4:1) e `personaggio_piazza.jpg`: l'alone tolto (anello, disco, sagoma sul disco), resta la figura con la sua ombra;
- `alberi_piede.jpg`: i cerchi a sbalzo ai piedi degli alberi tolti, il filo sulla chioma che passa davanti alla terrazza;
- `rumore_4x.jpg`: la coppia a 4:1, il rumore sparito;
- `categorie_dopo.jpg`: la categoria per pixel prima e dopo;
- `telefono_*.jpg` (640×1385) e `pieno_*.jpg` (profilo pieno);
- `identico_noprofondita_*.jpg`: la build di prima e la nuova con `?noprofondita`;
- `diagnosi/`: un sospetto alla volta (`aura.jpg`, `categorie_alfa.jpg`, `piazza_persone.jpg`, `alberi.jpg`, `varco.jpg`, `categorie.jpg`,
  `lontano.jpg`, `grana_diff.png`).

**?noprofondita, identico.** Fra due caricamenti della pagina la camera non è identica al bit (la sonda la porta a passo, ma il tempo del
fotogramma e la gente cambiano): la build di prima e la nuova con `?noprofondita` coincidono sulle superfici (entro il dither di 1/255) e
differiscono di un pixel sugli spigoli, come due caricamenti della build di prima fra loro (§6, `identico_noprofondita_*.jpg`). Misurato
sul vicolo (scarto massimo per canale, 0-255): due caricamenti della build di prima fra loro: 76,7% dei pixel entro 2, 7,1% oltre 16, media
4,7; la build di prima contro la nuova con `?noprofondita`: 74,1% entro 2, 7,0% oltre 16, media 4,9 (lo stesso rumore di caricamento); la
build di prima contro la nuova accesa: 1,7% entro 2, 66% oltre 16, media 26. Nel codice
ogni cambio sta dietro `PFD.on` (il `#define SG_PFD`, il blend, la profondità come tessitura, l'anello, l'alone, il disco, la grana, i valori
della gerarchia, il varco): spento, il testo degli shader e le uniform di prima.

## 7. Per la camera (osservazioni da passare all'agente della camera)

Non toccata (la camera, la regia e la logica del taglio sono dell'altro agente). Quello che si vede alla camera di gioco:
- **Il teleobiettivo**: campo verticale 30° a 45-47 m (zoom .72). Fra il basso e l'alto del quadro le cose cambiano di grandezza del ±12%:
  la prospettiva non aiuta la profondità, le sovrapposizioni si leggono solo col valore e con la linea (che ora ci sono). Un campo di
  38-45° più vicino darebbe convergenza e scala, a parità di quadro sul personaggio.
- **Le vie lunghe in asse**: la regia mette la camera dietro la marcia, quindi in asse con la via dritta: un punto di fuga solo, la via una
  striscia al centro, i tetti al 60% del quadro su due quinte simmetriche, nessun orizzonte. Uno sbieco di 15-25° rispetto all'asse (una
  fila di facciate in vista, due punti di fuga) farebbe leggere la successione delle case; oppure la pendenza un filo più bassa lungo le vie
  larghe, con l'aria che ora fa il lavoro sul fondo.
- **I vicoli a 63°**: dall'alto il vicolo è una pianta; il valore per quota (il fondo più scuro) lo fa leggere come una gola.
- **Il varco**: nei materiali ora è un'ellisse netta (`sgRr < 1` → `discard`), niente retino. Era sempre aperto anche quando niente copriva
  il personaggio (i cigli dei tetti attorno a lui erano sempre un anello forato). Se il varco deve aprirsi piano, conviene far crescere il
  raggio `sgP7.z`; il filo della profondità disegna il bordo del buco.

## 8. Restano aperti

- **I tasselli vanno ricotti** perché il varco netto arrivi sulle case (il testo dei materiali è espanso nei tasselli); l'impronta cambia
  comunque con ogni modifica a `render.js`, e il workflow `tasselli` la ricuoce al push su `main`. Qui la cottura locale (senza `sharp` e
  `meshoptimizer`) dava muri neri: le foto sono coi tasselli scaricati di `769bcd0e` (`?tassellivecchi`), quindi sulle case il varco è ancora
  quello a retino.
- **Un cespuglio quasi nero** vicino agli alberi: il suo colore vero è quasi nero; prima lo schiariva per caso la gerarchia stretta dei
  muri (il codice inventato lo prendeva per muro). Da guardare nel modello.
- **La terrazza alta presa per tetto**: la categoria divide suolo e tetto con la quota rispetto al personaggio (2,4 m): una piazza o una
  terrazza più alta di lui si grada come un tetto (cotto, valore .48). Si risolve nei materiali (ricottura).
- **Il costo vero sulla Iris Xe e sui telefoni** va misurato col banco (`banco_gpu_console.js`): la profondità come tessitura costa una
  scrittura in memoria per fotogramma sulle schede a tasselli.
- **I tetti a falda** al sole, col contrasto non più stretto, tornano un poco più accesi: dentro il tetto di saturazione (.5), da guardare col
  committente.
