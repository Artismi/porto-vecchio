# Porto Vecchio — LA STRADA DIPINTA: graffiti, manifesti, adesivi e tag della città (stile E)

Il committente: «E ANCHE DISTRIBUZIONE GRAFFITI, POSTER E STICKER E TAG», accanto a «SI DEVE VEDERE LA CURA PER I SINGOLI ELEMENTI E
AMBIENTI OLTRE QUELLA GENERALE». Questo è lo strato della vernice che la città ha già quando cominci (la storia dei muri): dove sta, quanto
è fitta, com'è fatta, di che colori. Il writing del giocatore (la bomboletta, il pennarello, la tavoletta) e le uscite notturne dei writer
NPC **non cambiano**: cambia solo quello che c'era prima di te.

- **Acceso** con lo stile E: `?stile=E` nell'indirizzo, o `window.PV_STILE === 'E'` (lo stesso interruttore di render.js e personaggi.js).
- **Spento** con `?nostradadipinta`. Senza lo stile E niente cambia (la storia dei muri resta quella di `writer_vita.js history` e dei tasselli).
- **Codice**: `src/strada_dipinta.js` (la distribuzione, il catalogo, i pali), `src/writer_arte.js` sezione `[stradadipinta]` (la tavolozza,
  i manifesti e gli adesivi del posto, la toppa grigia), ganci di poche righe in `writer_vita.js` (history), `writing.js` (lo stile `buff`,
  lo strato deciso `sdStrato`, il posto dei pali `sdAnc`), `pennelli.js` (meno grana sui lavori E). Ogni gancio legge un campo `sd*` del
  lavoro: un lavoro senza quei campi (tutti, senza lo stile E; sempre, per il giocatore) esce com'era.
- **Prove**: `node src/test_strada_dipinta.js`; immagini in `_immagini/strada_dipinta/`.

## 1. Com'era: la misura (città nuova, la storia dei muri senza tasselli, la stessa che cuoce la cottura)

`writer_vita.js history` sceglieva 1.350 lavori a caso col peso dei ritrovi (`heatOf`: ×1,8 vicino a un bar, ×2,5 nelle «zone calde», ×0,18
vicino al regime), poi le produzioni nelle hall, poi le tag delle vie e i verticali sui palazzi. Contati per carattere del muro (la stessa
classificazione della sezione 2, applicata ai lavori di prima):

| zona | muro libero | lavori oggi | ogni 10 m oggi | lavori nuovi | ogni 10 m nuovo |
|---|---|---|---|---|---|
| sottopasso | 84 m | 60 | 7,1 | 165 | 19,6 |
| ferrovia | 82 m | 70 | 8,6 | 75 | 9,2 |
| muro | 60 m | 18 | 3,0 | 48 | 8,0 |
| porto | 180 m | 210 | 11,7 | 188 | 10,4 |
| vicolo | 136 m | 170 | 12,5 | 78 | 5,7 |
| ritrovo | 214 m | 286 | 13,4 | 235 | 11,0 |
| via | 108 m | 82 | 7,6 | 20 | 1,9 |
| lungomare | 4 m | 12 | 30,0 | 2 | 5,0 |
| piazza | 76 m | 73 | 9,6 | 7 | 0,9 |
| sacro | 70 m | 33 | 4,7 | 1 | 0,1 |
| regime | 422 m | 119 | 2,8 | 10 | 0,2 |
| fuori | 1582 m | 550 | 3,5 | 85 | 0,5 |
| **tutta l'isola** | 3017 m | 1683 | | 914 | |
(i lavori comprendono anche quelli sui palazzi, alle porte e sui pali; la densità divide per i metri di muro libero di strada)

I problemi, misurati:
1. **Carta da parati.** Nel borgo la densità per cella di 15 m varia poco (coefficiente di variazione 1,09; il 10% delle celle con muri è
   vuoto): la stessa grana di vernice per strade intere. Il peso dei ritrovi (raggio 30 m, ×1,8 a ritrovo, ×2,5 nelle zone calde, cumulativo)
   copre mezzo borgo: tutto è «vicino a qualcosa».
2. **Sulle cose belle.** Sulle piazze 9,6 lavori ogni 10 m di muro (come nei vicoli), 33 sulla chiesa e sul santuario (7 verticali, 8 throw-up),
   119 sui palazzi del regime (22 verticali): il moltiplicatore ×0,18 non bastava contro quelli dei ritrovi vicini.
3. **Troppi grandi, nessuno in un posto preciso.** 194 lavori grandi nel borgo (pezzi, burner, murali, rulli, verticali); 116 verticali in
   tutta la città, uno su due palazzi alti, da un capo all'altro: nessuna gerarchia, nessun pezzo «da vedere» in fondo a una via.
4. **Niente in fondo alle viste.** Le viste lunghe (Via di Mezzo, Via della Marina, Via delle Mura, la Rua; `URBANISTICA.md` §4) finiscono su
   muri senza niente o con quello che capita.
5. **Strati senza età.** Il vecchio era vecchio a caso (`w.old`: età .15–.6 dal seme), le tag sopra i pezzi si mettevano in ordine di
   piazzamento (lo strato era il conteggio delle sovrapposizioni: una tag piazzata prima del pezzo finiva sotto), niente toppe grigie,
   manifesti di un foglio, adesivi solo sui muri.
6. **Colori fuori tavolozza.** Le tag rosse `#d8201a` e i rossi dei pezzi stanno a un passo dal vermiglio del personaggio, il giallo `#f2d23a`
   degli adesivi dal limone degli obiettivi, i rosa accesi dall'allarme (BIBBIA_STILE §1: vietati per set, insegne, writing).

## 2. Le regole (a regole, non a coordinate: le vie cambiano, il disegno si adegua)

L'urbanista sta cambiando la pianta (vicoli sgombrati, gli attraversamenti del Lungomare, la volta del Glacis, i respiri sulla Via delle
Mura, poi il piano con gli slarghi e i vicoli piegati). Per questo **niente è messo a mano**: ogni scelta parte dai dati della città quando
la storia si fa (i siti di `writer_vita.js buildSites`, i pezzi `W.pezzi`, i luoghi `G.PLACES` e `W.luoghi`, le vie `W.roads`, la griglia,
la ferrovia `W.railCity`, i pali `W.segnaletica`). Se un muro sparisce, il suo lavoro non si piazza (i raggi di `placeWall` non trovano la
parete) e non resta niente sospeso; se nasce uno slargo nuovo coi suoi muri, li prende.

### 2.1 Il carattere del muro (`zonaPunto`, in quest'ordine)
| zona | come si riconosce | lavori ogni 10 m (al ritmo 1) | grandi / medi | toppe | manifesti | adesivi | età |
|---|---|---|---|---|---|---|---|
| **sottopasso** (sottopassi e Glacis) | vicino (13 m) a un sottopasso, un arco, il ponte della darsena, un passaggio a livello | 12 | 16% / 34% | 35% | 30% | 50% | ,5 |
| **ferrovia** (ferrovia e rilevato) | a meno di 11 m dalla ferrovia della città, i muri antirumore | 14 | 24% / 36% | 30% | 15% | 30% | ,55 |
| **muro** (il Muro) | a meno di 6 m dal muro del Garante (il Muro: la hall of fame della Risacca) | 14 | 34% / 30% | 45% | 20% | 25% | ,45 |
| **porto** (porto e magazzini) | vicino (22 m) a magazzini, darsene, scalo, gru, bitte, opifici, i luoghi del porto; o la banchina davanti | 12 | 18% / 34% | 22% | 35% | 35% | ,65 |
| **vicolo** (vicoli e retri) | davanti meno di 6,5 m di strada, o lungo un vicolo di W.roads | 7 | 5% / 30% | 16% | 30% | 55% | ,5 |
| **ritrovo** (bar e ritrovi) | a meno di 13 m da bar, pub, osterie, sala giochi, cinema, discoteca, gelateria, chiosco | 6 | 7% / 26% | 12% | 50% | 60% | ,35 |
| **via** (vie di quartiere) | il resto della città | 2,2 | 4% / 24% | 18% | 35% | 40% | ,5 |
| **lungomare** (lungomare) | lungo il lungomare, la Spianata, il Lido, la Marina | 2 | 6% / 26% | 12% | 50% | 45% | ,6 |
| **piazza** (piazze e facciate belle) | lastrico di piazza davanti, o vicino a fontane, alla Piazza San Rocco, all'hotel, alla biblioteca, al teatro | ,35 | 0% / 0% | 0% | 70% | 20% | ,1 |
| **sacro** (chiesa e santuario) | a meno di 16 m dalla chiesa, dal campanile, dal santuario (4 m dall'edicola) | ,25 | 0% / 0% | 0% | 0% | 0% | ,2 |
| **regime** (palazzi del regime) | a meno di 18 m da caserme, Rocca, Governo, Ministero, Garante, Archivio, commissariato | ,3 | 0% / 0% | 70% | 10% | 0% | ,2 |
| **fuori** (campagna e frazioni) | fuori dalla città (campagna, frazioni, stazioni) | ,9 | 8% / 30% | 5% | 30% | 20% | ,75 |

### 2.2 Il ritmo (`ritmo`)
Attorno a dove si sta (bar e pub, sottopassi e archi, scalinate e gradoni, passaggi a livello, fontane, la stazione, le banchine dei
magazzini, i luoghi del gioco) la densità sale fino a ×2 (una campana di 9 m), fra un posto e l'altro scende a ×0,3; un campo lento (seni a
~100 m) rompe la regolarità. Lungo la Via di Mezzo il ritmo va da 0,3 a 1,9: tratti calmi e punti fitti, mai la stessa grana per cento metri.
Nel borgo, dopo: coefficiente di variazione per cella 1,22 (era 1,09), celle con muri e senza vernice 23% (erano 10%), il 10% delle celle
più fitte porta il 37% della vernice (era 35%). Sulle piazze 7 lavori (erano 73), sulla chiesa 1 (33), sul regime 10 (119), solo piccoli.

### 2.3 La gerarchia
- **I fondali** (`fondaliStrade`, più i siti in fondo a un corridoio dritto): ogni via di `W.roads` spezzata nei suoi tratti dritti (tutti i
  punti entro 1,6 m dalla corda); un tratto di 45 m e più guarda, ai due capi, oltre l'incrocio fino alla prima casa (al più 40 m; il mare
  no: il mare in fondo al caruggio è già un premio). Quel muro prende **un pezzo grande, nuovo, leggibile** dei king della crew di quel
  territorio: se lì c'è un tratto di muro libero (un sito senza porte né finestre, girato verso la via) un pezzo, un burner o sul porto e sul
  Muro un murale; se è una facciata con le finestre, un throw-up grande (3,2 × 1,5 m) che sta fra le aperture. Non sulle piazze belle, sulla chiesa, sul regime. Due fondali a meno di
  55 m solo se si guardano da parti opposte (due viste diverse). Oggi 8: corridoio sul Muro (160 m, muro, pezzo di FUSE); Via della Marina (114 m, lungomare, throw di MURE); Raccordo del Valico (104 m, fuori, pezzo di FUMO); Via di Mezzo (84 m, porto, throw di GOZO); Strada del Bosco (83 m, fuori, throw di TEO); Via delle Mura (82 m, ferrovia, throw di RAZO); Via della Marina (72 m, porto, throw di ORZO); Rua Maestra (63 m, vicolo, throw di TEO).
  Con la camera di adesso (bordo alto 11° sotto l'orizzonte) si vedono arrivando; con la camera bassa (`?camera9`, URBANISTICA.md §5) sono
  le cose che chiudono il quadro.
  **Le alternative quando la facciata ha le finestre** (`sdAlt`, provate in `writing.js placeWallG` finché una entra, poi il disegno si fa
  con lo stile e la misura che hanno vinto): (a) un verticale a rullo 1,3 × 4,4 m (o la calligrafia alta) fra due colonne di finestre, a
  passi di 1,6 m lungo la facciata; (b) un pezzo basso 4,2 × 1,05 m (o un throw-up) sulla fascia del pianterreno sotto i davanzali del primo
  piano; (c) il muro cieco di lato più vicino al fondo che si vede venendo dalla via; (d) il muro dei manifesti a strati.
  **Misurato nel gioco** (`fondali_esito.json`, `fondale_via_della_marina_*.png`): dei tre fondali su queste vie uno entra (Via della
  Marina, il tratto di 72 m: il verticale fra le finestre, alternativa (a), centro a 3,7 m); gli altri due (Via di Mezzo verso ovest, Via
  della Marina verso la Via al Mare) non entrano con nessuna delle 18 alternative, nemmeno i manifesti: il posto preso dalla griglia (0,6 m
  prima della casella della casa) non porta i raggi su una parete. **Aperto**: prendere il muro del fondale dalla geometria vera (un raggio
  lungo la via in render.js, non dalla griglia) e rifare le foto. La camera del gioco (34°, bordo alto 11° sotto l'orizzonte) dal capo
  lontano non vede comunque il fondo della via; la vede la camera bassa (18°, 7 m). `?camera9` non è in questo ramo: la foto «bassa» la imita.

- **I grandi** per zona (tabella 2.1): pezzi e burner nei sottopassi e sul Muro, rulli e murali sul porto, quasi niente nelle vie.
  Mai due grandi a meno di 4,6 m (3,2 nei punti fitti). **I verticali e gli heaven spot** solo nelle zone calde, uno per palazzo, al
  22% / 12% per il ritmo (erano ovunque).
- **I medi**: throw-up, stencil, estintore, gotico, scritte.
- **I piccoli** (la maggioranza): tag a spruzzo e a pennarello, adesivi a grappolo, manifesti, le toppe grigie.
- **Mai lo stesso pezzo nella stessa vista**: lo stesso writer non ripete lo stesso stile a meno di 45 m (grandi) o 25 m (medi).

### 2.4 Gli strati e l'età
- **Il muro vissuto** (zone calde, ritmo > 1,1, muro di 5 m e più, una volta su due): un pezzo vecchio di una crew sciolta o di un king,
  **sbiadito** (età .7–.9: pioggia, crosta, colore che va verso il muro); a volte la **toppa grigia** di chi ha ripulito sopra una parte
  (`sdToppa`: due-cinque passate di rullo in un grigio della tavolozza, bordi dritti); sopra, **3–6 tag nuove** (strato 1), un grappolo di
  **adesivi**, una **pila di manifesti** (2–3 fogli sullo stesso punto, quelli sotto strappati e sbiaditi).
- **Lo strato è deciso** (`sdStrato`): il pezzo e la toppa sotto (0), le tag, gli adesivi e i manifesti sopra (1). Prima lo strato era il
  numero di lavori sovrapposti nel momento del piazzamento: dipendeva dall'ordine.
- **L'età per zona**: il porto e la campagna vecchi (`eta` .65–.75), i ritrovi freschi (.35), le piazze nuove (il manifesto della festa
  attaccato ieri). Le vernici vecchie hanno anche i giorni sul muro (60–660 giorni) per i pennelli.
- **La toppa grigia da sola** (stile `buff`): sopra una tag che si intravede ai bordi; soprattutto sul regime (che ripulisce) e sul Muro.

### 2.5 Le cose a portata di mano
- **Accanto alle porte** (`G.BUILDINGS[].door`): un grappolo di adesivi o una tag a pennarello all'altezza della mano (1,2–1,6 m), a un
  metro dallo stipite. **Mai sulla porta**: la porta, la vetrina e l'ingresso delle botteghe si devono leggere (i raggi di `placeWall`
  stanno già fuori dalle aperture vere, `R.aperture`). Quante: secondo la zona e il ritmo (82 nella città).
- **Sui pali dei cartelli** (`W.segnaletica.pali`, gli stessi della grafica; i pali tolti da `PuliziaRumore` si saltano): una striscia di
  adesivi a 1,15–1,5 m sul lato che guarda la strada (a volte anche dietro), e un grappolo sul **retro del cartello** quando il retro è libero.
  Si piazzano **senza raggi** (`StradaDipinta.piazza`: il palo è una retta, il suolo da `R.groundH`), un piano tangente al palo.

## 3. La mappa delle zone e la densità

- `_immagini/strada_dipinta/densita_oggi_nuovo.png` — la densità nel borgo (lavori ogni 100 m², sfumata a 6 m), oggi | nuovo, coi lavori per taglia.
- `_immagini/strada_dipinta/zone_e_fondali.png` — il carattere di ogni muro (i siti) e i fondali delle viste lunghe.

## 4. Il catalogo dei contenuti (una scena di qui, inventata)

**Le crew e i loro territori** (`CREW`, `RE`): chi dipinge dove, così lo stesso nome torna nei suoi posti.
| crew | nome | casa | scrittori |
|---|---|---|---|
| BDS | Banda della Scogliera | porto, lungomare | MURE (king), GOZO, SALE, BRUMA |
| TNT | Treni Notte Tunnel | ferrovia, sottopassi | TREK (king), NAPO, FUMO, RIVA |
| PVK | Porto Vecchio Kings | vicoli, ritrovi, vie | CIAPA (king), ZENA, VERA, MOLO |
| RSC | Risacca | il Muro | SUBA, KILO, MAREA, ONDA |
| KML | Camalli (i portuali) | porto, ferrovia | ZULU, TOKE, ORZO, BITTA |
| TOY | i ragazzini | vie, vicoli, lungomare | PIX, GEKO, LUPO, TEO |
| — | crew sciolte (solo pezzi vecchi) | dappertutto, sbiadite | RENZ, MASK, ASMA, NEMO (OGS); KAOS, DOGE (FLM); NEVA, RUGA (SPK) |

I writer NPC di adesso (PVK, BDS, TNT con le loro tag) firmano metà delle tag nuove della loro crew.

**I manifesti** (`MAN`, per zona `MAN_Z`): serate (DUB AL MOLO / sound Cassa Marea; I GABBIANI ELETTRICI live al Bar Sirena; CANTINA PUNK:
Muffa, Ruggine, Cortocircuito; BALERA LUNA, liscio e mazurche; RADIO LUNA 98.4 frequenza libera; NOTTE FUNK alla Discoteca Luna), la
strada (JAM AL GLACIS, bombolette e giradischi; TORNEO DI SKATE; MERCATINO DEL BARATTO), il porto (AVVISO AI PESCATORI della capitaneria;
SAGRA DELL'ACCIUGA; PALIO DEI GOZZI; i foglietti CERCASI MOZZO e VENDESI GOZZO con le linguette), i vicoli (LEZIONI DI CHITARRA, SMARRITO
CANE TOBIA, AFFITTASI CANTINA), le piazze (FESTA DI SAN ROCCO, CINEMA ASTOR, CORO DEL BORGO: un foglio nuovo, mai una pila).
**Gli adesivi** (`stickersE`): «ciao mi chiamo» con la tag, i tondi delle crew, i riquadri col nome, i loghi (RADIO LUNA, CASSA MAREA,
JAM GLACIS, SCOGLIO, FUORI ORARIO, TONNARA); sui pali una striscia verticale. Nessuna marca vera, nessun artista vero.

## 5. I colori (BIBBIA_STILE §1 e §11, punto 7)

Ogni tappa di un lavoro E passa da una tabella 64³ (`writer_arte.js lutE`, fatta una volta nel disegnatore a parte, 262.144 voci): in
Oklab la tinta va verso l'inchiostro più vicino della tavolozza unica (peso .8 su a e b; i grigi verso i neutri, peso .5), il valore resta
quello del disegno (spinto appena, .3, verso l'inchiostro); poi **i tre colori del gioco sono tenuti lontani** (vermiglio → cotto,
limone → ocra/pesca, allarme → rosa: dentro 0,085 in Oklab si sposta). Misura (`test_strada_dipinta.js`, tutto il cubo sRGB a passi di 8):
nessun colore d'uscita è a meno di 0,061 da vermiglio, limone o allarme. Il nero resta nero, la carta resta carta.
Carte dei manifesti e adesivi a coppie che si leggono (carta/nero, ocra/nero, rosa/carta, oltremare/carta...). Il contorno resta netto:
sui lavori E il tremolio della mano è al 60% e il bordo è `crisp`; i pennelli passano meno polvere (.15), colature (.3) e grana (.3) — la
finitura pulita della bibbia, senza togliere la mano.

## 6. Con i tasselli (la storia cotta)

Coi tasselli la storia dei muri arriva cotta (`strumenti/tassella_pagina.js`: i lavori già sul loro muro, i raggi fatti in cottura). Con lo
stile E: **i lavori cotti si tengono** (sono i pezzi che funzionavano), ma si diradano per zona (`TIENI`: tutti nei sottopassi, ferrovia,
Muro; 85% porto; 70-75% vicoli e ritrovi; 30-35% vie e lungomare; 2-5% piazze, chiesa, regime; i verticali fuori dalle zone calde al 15%; le
tag e gli adesivi secondo il ritmo), prendono la tavolozza e l'età del loro posto; poi si aggiungono i fondali (a sito, piazzati coi raggi
quando ci passi), gli adesivi accanto alle porte (idem) e sui pali (senza raggi). Il passo successivo, quando servirà: cuocere anche la
lista E in `tassella_pagina.js` (la stessa funzione con lo stile acceso) e prenderla da lì.

## 7. Il costo

- **La scelta**: una volta all'avvio, ~100 ms in Node per tutta l'isola (la storia di prima: ~140 ms) (classificazione, ritmo, fondali, porte, pali); nessun lavoro per
  fotogramma.
- **I disegni**: nessuna chiamata di disegno in più. I lavori finiti stanno nell'atlante (due InstancedMesh per pagina, come prima); i
  lavori in corso e i veli sono quelli di sempre. I lavori sono **meno** (914 contro 1683 nella città; nel borgo 768 contro
  1152) e **più piccoli** (70 grandi contro 249): meno tela nell'atlante e meno lavoro per il disegnatore a parte.
- **Il disegnatore a parte** (Web Worker, come prima): la tavolozza costa una passata di tabella per tappa (~1 ms ogni 100.000 pixel; un
  pezzo di 4,8 m ha 4 tappe di 480×205) e la tabella si fa una volta (~150 ms nel worker, la prima volta che serve). Niente sul filo della
  pagina, quindi niente compiti lunghi in più.
- **I pali**: piazzati senza raggi (un vettore e una quota), il piano senza cercare i triangoli.
- **Misura nel gioco** (SwiftShader, 960×540, sei posti): dopo i sei posti, al sottopasso del Glacis, `bancoRitmo(20)` camminando: lavori in memoria 939 (prima 1.582), nell'atlante 43 (84), veli 0 (0), una pagina d'atlante (una), memoria JS 1.221 MB (1.297), tessiture 457 (632), geometrie 3.169 (4.042); lungo i sei posti piazzati 59 lavori e 25 non entrati nel muro (prima 103 e 63). I millisecondi per fotogramma sotto SwiftShader (0,4 fotogrammi al secondo, la macchina condivisa con altri sei navigatori) non dicono niente dell'Iris Xe: il banco va rifatto lì, con `?stile=E` e senza, stesso percorso; quello che conta qui è che i disegni non crescono e i lavori, la tela e la memoria calano.

## 8. Le immagini

- `densita_oggi_nuovo.png`, `zone_e_fondali.png` — sezione 3.
- `prima_dopo_1.jpg`, `prima_dopo_2.jpg` — sei posti, prima | dopo, **stessa camera e stessa ora** (15:00, sereno), il gioco vero sotto
  SwiftShader (`?cittanuova&leggera`, con e senza `&stile=E`): il vicolo dietro la Rua (il muro più dipinto della zona `vicolo`), la piazza del
  Glacis davanti al sottopasso, il fianco del Magazzino Neri sul porto, Piazza San Rocco con la chiesa, la Via al Mare in fondo alla Via della
  Marina, la Via di Mezzo guardando verso il suo fondale ovest. La camera è quella del gioco per campo e distanza ma messa a mano (2,5–5 m,
  di sbieco sul muro): la camera7 vera, nei vicoli stretti, si chiude a 1,2 m sul personaggio (URBANISTICA.md lo misura) e la foto non mostrava
  i muri. Resi senza il passo finale dello stile E di render.js (non è in questo ramo): conta dove sta la vernice e com'è.
  Si vede: nel vicolo le tag sparse di prima diventano un punto fitto (tag nuove della scena di qui, adesivi accanto alla porta); sul porto
  la vernice esce dalla tavolozza e arrivano gli adesivi; sulla piazza della chiesa via il segno grigio sulla facciata (dopo: pulita); al
  Glacis e sulla Via al Mare poco o niente in tutti e due (tratti calmi); in fondo alla Via di Mezzo il fondale non è entrato (§2.3, aperto).
- `dettagli.png` — da vicino, coi file del gioco: adesivi (muro, palo, retro del cartello), manifesti (a strati sul porto, la serata
  nuova sulla piazza, il foglietto con le linguette), la tag, la toppa grigia, il throw-up, il pezzo vecchio con la toppa, il pezzo del
  fondale; prima | dopo dove ha senso.

## 9. Aperto

- **Il suolo del Glacis nella tavola «dopo»** (piatto, senza le macchie d'erba e il lastricato): non è la strada dipinta né `?stile=E`.
  render.js legge solo `?stile=A|B|C|D`, personaggi.js solo `a|b|c|k`, e la strada dipinta non tocca né il suolo né le decalcomanie.
  Era la prima foto dopo il caricamento della pagina, e il dettaglio del suolo attorno arriva dopo. Rifatta più tardi nello stesso
  caricamento (`E_glacis_bis.png`), il suolo è come in «prima».

- **Il rilevato del Lungomare** è una scarpata 2:3 (`railFit`), non un muro: i raggi di `placeWall` non ci mettono niente (la normale non è
  orizzontale). Se il filone del costruito lo fa diventare un muro di sostegno, la regola della zona `ferrovia` lo prende da sola (i siti
  lungo la ferrovia).
- **Le saracinesche delle botteghe chiuse e le cassette elettriche**: le saracinesche sono aperture (`R.aperture`) e la vernice ne sta
  fuori apposta; sono del filone «rifinitura costruito». Quando una saracinesca chiusa sarà una superficie sua, basta un sito `porta` col
  suo riquadro (come i pali).
- Le densità per zona (`ZONE`) e il ritmo sono numeri in cima al file: da tarare guardando, ora che l'urbanista cambia le vie.
