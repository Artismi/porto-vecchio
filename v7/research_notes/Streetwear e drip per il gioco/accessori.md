# Accessori streetwear e statement pieces: riferimento per modellazione low-poly (2020-2026)

Nota metodologica: diversi siti di moda (Dazed, W Magazine, Coveteur, Libero, Hyphen) non erano raggiungibili via fetch (errore DNS); le citazioni da queste testate derivano dai sommari dei risultati di ricerca, non dalla lettura completa degli articoli. Le specifiche geometriche (proporzioni, numero di facce, spessori in rapporto alla testa) sono quasi tutte nelle sezioni "Inferences": sono indicazioni di modellazione basate su conoscenza generale degli oggetti, non dati citati. Si usano nomi generici, non marchi (i marchi compaiono solo come riferimento di fonte).

## Occhiali da sole: shield/visiera, wrap sportivo, "mascherina", ovali piccoli Y2K, cat-eye, aviator, rimless

### Takeaway
Dal 2024 la tendenza è passata dalle montature minuscole del 2017-2019 a forme grandi, avvolgenti e a schermo unico (shield, wrap, "speed-racer"), con radici nello sportswear anni '90 e nel Y2K; le sfilate SS26 confermano la continuità. Per l'Italia giovanile la "mascherina" sportiva avvolgente è il pezzo identitario, ma non ho trovato fonti di stampa che lo documentino esplicitamente per il fenomeno "maranza".

### Cited Findings
- Dopo molte stagioni di montature minuscole e cat-eye stretti, nel 2024 tornano occhiali oversize, wraparound e simil-shield; collegamento con le Olimpiadi 2024, celebrità (Rosalía, Ashley Olsen) e passerelle Loewe, Bottega Veneta, Balenciaga — [W Magazine](https://www.wmagazine.com/fashion/sunglasses-trends-2024-summer-shield)
- Lo shield è descritto come forma nata in ambito atletico, tornata nel 2024 — [Eurooptica](https://www.eurooptica.com/en-ca/blogs/eyewear-trends/2024s-leading-trends-in-eyewear-fashion-a-glimpse-into-elegance)
- Nel 2025 le "icone Y2K" sono indicate come shield, wraparound e "speed-racer" — [Style Magazines](https://stylemagazines.com.au/fashion/sunglasses-trends/)
- Oversize e shield dominano la primavera/estate 2025 (report di mercato orientato ai venditori, fonte debole) — [Accio](https://www.accio.com/business/latest_sunglass_trend)
- Shield presenti sulle passerelle SS26 di Balenciaga, MM6 Maison Margiela, Loewe e Stella McCartney; contrasto esplicito con le micro-montature 2017-2019 — [Coveteur](https://coveteur.com/shield-sunglasses-trend)
- Il revival oversize Y2K viene ricondotto all'immaginario primi 2000 (Paris Hilton, Britney Spears) — [Grazia](https://graziamagazine.com/us/articles/forget-aviators-these-oversized-y2k-inspired-sunglasses-are-about-to-take-over-the-chicest-looks-of-2026-25497/); vedi anche [Vooglam, shield 2026](https://www.vooglam.com/blogDetail/shield-shades-2026-summer-trend)
- Una linea sportiva di lusso italiana (Prada Linea Rossa) dichiara le proprie radici nello sportswear anni '90 ed estetica sportiva di precisione — [Quotidiano Motori](https://www.quotidianomotori.com/lifestyle/occhiali-da-sole-prada-linea-rossa/)
- Esempi di riferimento vintage: occhiale avvolgente "rosa opaco con scudo Y2K" (2018), shield nero opaco anni '90, avvolgente con logo P/E 2000 — [1stdibs SPS02U](https://www.1stdibs.com/it/moda/accessori/occhiali-da-sole/prada-2018-linea-rossa-sps02u-occhiali-da-sole-avvolgenti-rosa-opaco-con-scudo-y2k/id-v_17534472); [1stdibs matt shield](https://www.1stdibs.com/it/moda/accessori/occhiali-da-sole/occhiali-da-sole-prada-1990s-matt-shields-nero-opaco/id-v_21918782); [1stdibs avvolgente 2000](https://www.1stdibs.com/it/moda/accessori/occhiali-da-sole/occhiali-da-sole-prada-p-e-2000-linea-rossa-con-logo-avvolgente/id-v_20630372)
- Il termine italiano "occhiale a mascherina" è usato per modelli oversize anni '80-'90 (Valentino, Ferré "full mask", Cartier anni 2000); un articolo del 2017 parla del suo ritorno "in chiave sportiva o futuristica" — [1stdibs Valentino](https://www.1stdibs.com/it/moda/accessori/occhiali-da-sole/occhiali-da-sole-a-mascherina-oversize-anni-90-di-valentino/id-v_25223022); [1stdibs Ferré full mask](https://www.1stdibs.com/it/moda/accessori/occhiali-da-sole/occhiali-da-sole-vintage-gianfranco-ferr%C3%A9-gff65906-full-mask-1990s-italy/id-v_21163262); [Donna Glamour](https://www.donnaglamour.it/?p=232524)

### Inferences
Schede di modellazione (proporzioni rispetto a una testa di larghezza ~1 unità alle tempie; da validare su reference fotografiche):

- **Shield / visiera monolente**
  - Forma: un'unica lente curva continua da tempia a tempia, larghezza ≈ 1,0-1,1 della testa, altezza 0,25-0,35 della distanza mento-fronte; bordo superiore spesso dritto ("sopracciglio" piatto), bordo inferiore a doppio arco sotto ciascun occhio.
  - Riconoscibilità: (1) un solo pezzo senza ponte visibile, (2) curvatura forte orizzontale, (3) aste sottili che escono quasi in continuità con la lente, (4) spesso naselli in plastica integrati.
  - Costruzione: lente in policarbonato iniettato; a volte micro-cornice solo in alto; aste in metallo o acetato sottile.
  - Finiture: specchiato (argento, blu ghiaccio, oro, rosso-arancio "fire", viola-iridescente), oppure tinta piena nera, fumé gradient, colori pop traslucidi (rosa, giallo, verde acido).
  - Low-poly: un arco di 6-10 segmenti in orizzontale, 2-3 in verticale; materiale con env-map/matcap per lo specchiato; aste come strip a 4 lati.
- **Wrap-around sportivo (stile "ciclismo/baseball anni '90-2000")**
  - Due lenti o lente unica fortemente avvolgente (curvatura "base 8-10" dichiarata comunemente nel settore, non verificata), profilo laterale che copre la tempia; montatura in nylon iniettato ("O-matter"-like), spesso con inserti in gomma colorata su aste e naselli; montatura semi-rimmed (solo sopra) molto comune.
  - Riconoscibilità: (1) sagoma affusolata che si stringe verso le tempie, (2) asta larga che si assottiglia, (3) lente specchiata iridescente, (4) logo/inserto sulla tempia.
  - Colori: nero opaco, bianco, cromo, combinazioni fluo (giallo/verde lime, rosso), lenti "prizm"-like rosa/rosso/blu specchiato.
- **"Mascherina" (gergo italiano giovanile)**
  - Nel parlato italiano la mascherina indica un occhiale a schermo unico molto grande e avvolgente, tra shield e maschera da sci in miniatura, spesso con montatura superiore piatta e lente specchiata o colorata; è il pezzo tipico nel look tuta+borsello da ragazzo/"maranza". Associazione da validare: non ho trovato fonti giornalistiche esplicite.
  - Modellazione: più grande dello shield fashion, quasi visiera da sci senza fascia; lente spesso bicolore o gradient, aste spesse con logo.
- **Ovali piccoli 90s/Y2K**
  - Lenti ovali ≈ 0,18-0,22 della larghezza testa ciascuna, montatura sottile in metallo (1-2 mm reali) o acetato sottile; lenti colorate traslucide (giallo, rosa, azzurro, verde, rosso) o nere; la micro-forma dominante 2017-2019 (citata come trend precedente da Coveteur/W).
- **Cat-eye**: angoli superiori esterni sollevati e appuntiti; acetato spesso (5-8 mm reali), nero lucido, tartarugato, bianco crema; lenti scure o marroni gradient. Silhouette femminile, utile per NPC donna "mob wife".
- **Aviator**: doppio ponte metallico, lenti a goccia, montatura in metallo sottile oro/argento/canna di fucile; lenti verde G-15, marrone, specchiato argento o oro; naselli con aste metalliche ("pad arms").
- **Rimless**: lenti senza montatura fissate con viti/ponte e aste metalliche sottili; spesso lenti sfumate colorate (rosa, azzurro, marrone) e forme rettangolari o shield. Look "Y2K dad/rap 2000"; anche lente tagliata con logo inciso.
- **Spessori indicativi in gioco**: metallo = filo sottile (può sparire in low-poly → texture/alpha o edge geometrico minimo); acetato = slab spesso, smussato; nylon sport = forme organiche affusolate.

### Gaps
- Nessuna fonte di stampa trovata che documenti la "mascherina" come oggetto specifico della moda giovanile italiana 2020-2026 (fetch di Libero e altre testate fallito).
- Curvature base, dimensioni lente in mm e spessori non verificati da schede prodotto.

## Copricapi: cappello baseball curvo, snapback/fitted a visiera piatta, 5-panel, bucket, fisherman beanie corto, durag, fascia, trucker

### Takeaway
Ogni copricapo ha una silhouette leggibile anche in low-poly: visiera curva vs piatta, corona alta strutturata vs bassa morbida, maglia bassa sopra le orecchie (fisherman), tessuto aderente con code (durag). In Italia il cappellino con visiera e logo (spesso contraffatto) fa parte del "kit" maranza.

### Cited Findings
- In un sondaggio informale di "Milano Città Stato" sul look maranza: tuta come capo tipico, marsupio/borsello scontato, cintura e cappellino con visiera griffato (probabilmente falso); d'inverno piumino contraffatto e collana a catena vistosa di poco valore; ciabatte — [Libero Quotidiano](https://www.liberoquotidiano.it/news/milano/48307850/milano-capitale-moda-vestito-tipico-tuta-maranza/) (sommario di ricerca; sondaggio aneddotico)
- I berretti corti tipo "watch cap" risalgono all'Ottocento, copricapo di pescatori e marinai; anche senza coprire le orecchie trattengono il calore della corona — [Gear Patrol](https://www.gearpatrol.com/style/g42153343/fisherman-beanie/)
- Il modello "fisherman" si ripiega e siede sopra le orecchie; i venditori descrivono un "roll-up above the ears" e misure tipo larghezza 20 cm / altezza 17 cm — [Gear Patrol](https://www.gearpatrol.com/style/g42153343/fisherman-beanie/); [Walmart listing](https://walmart.com/ip/497708470); variante a costa waffle: [I Love Ugly](https://www.iloveugly.co.nz/products/waffle-fisherman-beanie-navy)
- Durag: posizionato con la coda dietro, lacci incrociati dietro la testa, riportati avanti e annodati sulla fronte (o legati dietro la nuca); coda lasciata sciolta dietro (look contemporaneo) o infilata; seta/satin più resistenti, velluto più delicato — [guida (qualità bassa, siti mirror)](https://specifydev.uog.edu/how-to-wear-a-durag); [guida 2](https://api.copychief.com/how-to-put-durag-on/)

### Inferences
- **Baseball cap visiera curva (dad cap / 6-panel)**: corona a 6 spicchi con bottone in cima, profilo medio-basso, visiera ≈ 0,6-0,7 della profondità testa, curvata a "C". Sulla testa: calza sopra le orecchie, bordo a metà fronte; si indossa avanti, all'indietro o leggermente di lato. Cotone twill, nylon, washed; logo ricamato frontale.
- **Snapback / fitted visiera piatta**: corona alta e rigida (pannello frontale con buckram), visiera piatta e larga, adesivo/etichetta oro talvolta lasciato sulla visiera (codice hip-hop); snapback ha chiusura in plastica a bottoni dietro, fitted ha retro chiuso. Sta più alto sulla testa, spesso dritto o all'indietro.
- **Trucker**: frontale in schiuma alta e squadrata (spesso stampa grafica), retro in rete di plastica (texture alpha a maglia), visiera curva, chiusura snap. Sagoma più "a cupola alta".
- **5-panel**: corona bassa e piatta, pannello frontale unico senza cucitura centrale, visiera corta piatta, spesso nylon tecnico o cotone; cinghietta dietro con fibbia. Look skate/outdoor.
- **Bucket hat**: falda inclinata verso il basso a 360°, corona cilindrica corta; cotone, nylon, pile, monogramma o tie-dye; reversibili. Siede basso, copre fronte, spesso calato sugli occhi.
- **Fisherman beanie corto**: bordo risvoltato (cuff) spesso, corpo a costa 1x1/2x2, termina sopra le orecchie e sopra la linea dell'attaccatura posteriore; colori: nero, arancio sicurezza, rosso, verde, giallo, grigio mélange. Low-poly: cilindro-cupola con una fascia sporgente e normal map a coste.
- **Durag**: calotta aderente in poliestere satinato/velluto con cucitura centrale (spesso esterna, "seam out"), lacci lunghi annodati, coda lunga piatta sulla nuca; colori pieni lucidi (nero, rosso, oro, blu, rosa), stampe. In gioco: shader lucido anisotropico per il satin; coda come plane con bones.
- **Fascia/headband**: spugna sportiva colorata (anni '80-'90 basket) o fascia elastica nylon/logo; posata sulla fronte sopra le sopracciglia; spesso con cappello o durag. Variante "bandana" annodata.

### Gaps
- Nessuna fonte di stampa italiana letta per esteso su copricapi giovanili 2020-2026; nessuna fonte Highsnobiety/Hypebeast su fisherman beanie trovata.
- Proporzioni (altezza corona, lunghezza visiera) non verificate da schede tecniche.

## Balaclave come "drip": maglia colorata, buchi occhi, spine, orecchie, corna, frange, fatte a mano, passamontagna da drill

### Takeaway
Il revival è esploso nel 2021 (Met Gala Balenciaga total-black, Miu Miu AW21 in colori pieni, TikTok/crochet DIY) e si è ramificato in versioni "creature" fatte a mano con orecchie, corna, spine, pompon e gorgiere; parallelamente il passamontagna nero da sci con fessure resta il codice visivo della scena drill/rap.

### Cited Findings
- Le origini del revival sono attribuite variamente al look total-black Balenciaga di Kim Kardashian al Met Gala 2021, ai creator TikTok e al vintage — [Dazed](https://www.dazeddigital.com/fashion/article/55219/1/balaclavas-taking-over-fashion-kim-kardashian-miu-miu-balenciaga-tiktok-trend?amp=1)
- Miu Miu AW21: balaclave in serie di colori allegri; Chet Lo (Fashion East) SS22: versione spinosa e testurizzata — [Dazed](https://www.dazeddigital.com/fashion/article/55219/1/balaclavas-taking-over-fashion-kim-kardashian-miu-miu-balenciaga-tiktok-trend?amp=1)
- Maker indipendenti: orecchie da coniglio, orecchie da gatto, corna da diavolo, facce patchwork, spine "aliene"; una creator crochet usa aghi/spine, pompon, campanelli da giullare e gorgiere da clown al collo — [Dazed](https://www.dazeddigital.com/fashion/article/55219/1/balaclavas-taking-over-fashion-kim-kardashian-miu-miu-balenciaga-tiktok-trend?amp=1)
- TikTok ha "ri-appropriato" l'accessorio con video di balaclave crochet DIY; collegamento con l'anonimato abituale della pandemia — [Dazed](https://www.dazeddigital.com/fashion/article/55219/1/balaclavas-taking-over-fashion-kim-kardashian-miu-miu-balenciaga-tiktok-trend?amp=1); [Nylon](https://nylon.com/fashion/balaclava-trend-winter-2021); [L'Officiel USA](https://lofficielusa.com/fashion/winter-2021-hottest-headwear-trend-balaclava-face-cover)
- Il trend della balaclava in maglia viene descritto come persistente ancora nel 2025 — [Hyphen](https://hyphenonline.com/2025/02/26/knitted-balaclava-winter-fashion-trend/) (solo titolo/sommario)
- Pattern di balaclave e accessori per orecchie diffusi nelle community di maglia — [LoveCrafts](https://lovecrafts.com/en-gb/c/article/ear-warming-makes)

### Inferences
- **Tipologie e costruzione**:
  - *Open-face (ovale volto aperto)*: tubo che copre testa, orecchie e collo, apertura ovale dalla fronte al mento; colletto lungo che scende sul petto ("bavaglino"). Versione moda Miu Miu-like: colore pieno saturo, maglia a coste.
  - *Tre fori (ski mask/drill)*: due fori occhi + uno bocca, spesso bordati in colore contrastante; maglia acrilica nera o mimetica; aderente, calza come una seconda pelle. Codice visivo drill/UK-rap (associazione culturale comunemente nota, non citata qui).
  - *Fessura unica occhi*: fascia orizzontale aperta su entrambi gli occhi.
  - *Creature / designer hand-knit*: orecchie (gatto triangolari, coniglio lunghe, orso tonde), corna (diavolo rosse, ariete arrotolate), spine coniche in fila sulla cresta (stile "drago/alieno", Chet Lo-like a coni morbidi), frange/nappe dal mento o sul contorno occhi, pompon, campanelli, gorgiera al collo. Volto con motivi intarsiati: fiamme, smile, fragole, scacchi, strisce, cuori, patchwork multicolore, effetto mohair peloso.
  - *Crochet granny-square*: quadrati multicolore cuciti, texture traforata.
- **Materiali**: acrilico, lana, mohair (alone peloso → shell texture/alpha fringe), cotone crochet (texture a punti grossi), cashmere moda in tinta unita.
- **Colori**: nero/grigio/mimetico (drill); saturi pieni (rosso, rosa, verde acido, arancio, azzurro); combinazioni multicolore e intarsi a contrasto.
- **Low-poly**: base = testa leggermente gonfiata con collo-colletto; fori come buchi reali (per vedere gli occhi) o decal; spine/orecchie come primitivi aggiunti (coni a 4-6 lati); maglia via normal map a coste o vertex color a pixel per intarsi; frange come card alpha.
- Nota: non ho trovato fonti che colleghino specificamente Mowalola alle balaclave; trattare "Mowalola-like" solo come riferimento estetico generico del richiedente.

### Gaps
- Nessuna fonte su Mowalola + balaclava; nessuna fonte Etsy letta direttamente.
- Nessuna fonte giornalistica letta su ski mask/drill (associazione culturale nota ma non citata qui).

## Borse: borsello/crossbody, marsupio portato sul petto, mini bag, chest rig; tracolle e fibbie

### Takeaway
Il marsupio/borsello a tracolla sul petto è l'accessorio "scontato" del look maranza italiano; il chest rig (derivato militare, popolarizzato da 1017 ALYX 9SM e Dior x Alyx, 2018-2019) è il pezzo utility-streetwear più costruito, con cinghie a X sulla schiena e fibbie a sgancio rapido.

### Cited Findings
- Marsupio/borsello indicato come elemento "scontato" del look maranza milanese, insieme a tuta e cappellino — [Libero Quotidiano](https://www.liberoquotidiano.it/news/milano/48307850/milano-capitale-moda-vestito-tipico-tuta-maranza/)
- Chest rig: derivato da equipaggiamento militare, decollato con la collaborazione Dior x Alyx; tasche hands-free per telefono, chiavi, portafoglio; indossato anche su camicie e giacche da Dior e Louis Vuitton — [FashionBeans](https://www.fashionbeans.com/article/best-wearable-luggage-chest-rigs-holsters)
- 1017 ALYX 9SM di Matthew Williams ha reso il chest rig uno degli accessori più caldi; alternative Prada Linea Rossa, Orbit Gear, HELIOT EMIL — [Highsnobiety](https://www.highsnobiety.com/p/chest-rigs-trend-buy-online); [Farfetch 2018](https://www.farfetch.com/au/style-guide/street-style/trending-best-alyx-accessories/)
- Chest rig rielaborati con tessuti di brand di lusso (upcycling) — [Hypebae / Frankie Collective](https://hypebae.com/2018/11/frankie-collective-rework-chest-rig-chain-purse-leg-bag-nike-gucci-louis-vuitton)
- Il ritorno del marsupio portato davanti al corpo ha preparato il trend chest rig — [Style on the Dot](https://styleonthedot.com/2019/10/25/pocket-storage-centre-front/)
- Mercato chest bag guidato da streetwear, utility, viaggio e outdoor; domanda di tasche porta-telefono, scomparti idrorepellenti, fibbie quick-release — [Research and Markets](https://www.researchandmarkets.com/report/chest-bags)

### Inferences
- **Marsupio a tracolla sul petto (belt bag cross-chest)**: corpo a mezzaluna/fagiolo ≈ 0,8-1 larghezza testa × 0,35 altezza testa; zip curva superiore con tiretto metallico/gomma; tasca frontale zip; fettuccia nylon 25-40 mm con fibbia a sgancio laterale in plastica nera o metallo (stile "fibbia rollercoaster" per luxury); portato in diagonale da spalla a fianco, corpo sul petto o sotto l'ascella. Materiali: nylon lucido/opaco, ripstop, pelle con monogramma, tela con logo ripetuto. Colori: nero dominante, monogramma marrone/beige, riflettente argento.
- **Borsello (piccola borsa a tracolla verticale, "shoulder pouch")**: rettangolo verticale piatto ≈ 0,6 × 0,9 della testa, tracolla sottile regolabile, portato sul fianco o sul petto con tracolla corta; nylon con placchetta logo triangolare/rettangolare metallica; spesso con tasca porta-telefono frontale.
- **Mini bag**: micro-borse (dimensione telefono o più piccole) a tracolla catena o portate come collana; pelle lucida o vernice, colori pastello o metallici; usate come gioiello.
- **Chest rig**: pannello frontale rettangolare con 2-4 tasche (zip, velcro, patta), cinghie spalle che si incrociano a X sulla schiena, cinghia orizzontale sotto le scapole; fibbie quick-release, D-ring, moschettoni, cordini elastici, fettuccia MOLLE; nylon cordura nero, mimetico, verde militare, beige; varianti luxury in nylon lucido con logo e fibbie metalliche.
- **Low-poly**: corpo come box smussato/cilindro schiacciato; tracolle come strip a 2 facce aderenti al corpo (skinning); fibbie e zip come decal o micro-mesh 6-12 tris.

### Gaps
- Fonti chest rig prevalentemente 2018-2019: nessun dato sulla forza del trend nel 2025-2026.
- Nessuna scheda prodotto letta con dimensioni reali di marsupi/borselli.

## Gioielli: catene cubane, tennis chain, pendenti, grillz, anelli, orecchini; scala e spessore

### Takeaway
La catena cubana va da ~3-4 mm (sottile, da layering) a 12-19 mm+ (statement), lunghezze 45-76 cm; la tennis chain è una fila di pietre da ~2-5 mm; i grillz spaziano dal singolo dente "open face" ai set completi 8+8, spesso in ottone placcato oro nelle versioni economiche. Per un gioco low-poly, le catene vanno esagerate oltre la scala reale per essere leggibili.

### Cited Findings
- Larghezze cubane: circa 3-4 mm fino a 12-19 mm; fasce sottile 4-6 mm (layering, quotidiano), media 7-10 mm, spessa 10-11 mm+ (statement, indossata da sola); lunghezze tipiche 18-30 pollici (≈46-76 cm) (fonti SEO di bassa qualità) — [Liry's 8mm guide](https://lirysjewelry.com/blogs/jewelry-guides/8mm-miami-cuban-link-chain-and-bracelet); [Cuban link width chart](https://educationsurvey.steelcase.com/chart/cuban-link-chain-width-chart.html)
- Regola indicativa: larghezza in mm ≈ metà della circonferenza del collo in pollici (collo 16" → 7-8 mm) — [Cuban Link Size Chart](https://lbas.lboro.ac.uk/chart/cuban-link-chain-size-chart.html)
- Tennis chain: 3 mm descritta come "petite", 5 mm come "bold"; esistono 2 mm, 2,5 mm, 3,5 mm, 4 mm; varianti con baguette a cluster fino a 8 mm; lunghezza consigliata uomo 20-22 pollici — [Happy Jewelers](https://happyjewelers.com/blogs/education/mens-tennis-necklace-size-guide); [Walmart CZ 3mm](https://www.walmart.com/ip/5647357479); [Aporro baguette 8mm](https://aporro.eu/products/baguette-clustered-tennis-chain-8mm); [Avianne](https://www.avianneandco.com/collections/diamond-tennis-chains?page=1)
- Grillz: open face (calotta singola cava su canino/incisivo), fang/half set (zanne solo superiori "vampire"), set completi 8 sopra + 8 sotto anche a "denti di squalo"; versioni economiche in ottone placcato oro 14k, adattate con stampo in silicone — [Walmart fang grillz](https://www.walmart.com/ip/14k-Gold-Plated-Fang-Grillz-Upper-Top-Half-Teeth-Slim-Fangs-Vampire-K9-Hip-Hop-Grills/830481884); [eBay set](https://www.ebay.com/itm/322280285447)
- Nel look maranza milanese compare una collana a catena vistosa di poco valore — [Libero Quotidiano](https://www.liberoquotidiano.it/news/milano/48307850/milano-capitale-moda-vestito-tipico-tuta-maranza/)

### Inferences
- **Catena cubana**: maglie ovali piatte, ritorte e strettamente incastrate, superficie diamantata/lucida; chiusura a box con levetta; oro giallo, argento/acciaio, oro rosa, versione "iced" pavé. In gioco: per leggibilità scalare a 15-25 mm equivalenti; modellare come tubo piatto (sezione rettangolare 4-6 lati) che segue il collo e cade sul petto, con texture/normal a maglie; lunghezza "choker" (alla base del collo) o "drop" fino allo sterno.
- **Tennis chain**: linea continua di castoni quadrati con pietra tonda, profilo sottile e piatto; in gioco = strip con texture brillanti e shader specular forte/emissive leggero; spesso abbinata a cubana (layering 2-3 catene).
- **Pendenti**: medaglioni rotondi (santi, volti), croci, lettere/iniziali, numeri, pendenti iced-out di personaggi/cartoon, pistole/teschi; scala da 3-4 cm a 8-10 cm+ (statement); portati su cubana o rope chain. Leggibilità: forma piatta estrusa con bordo smussato.
- **Grillz**: placca metallica sopra i denti visibili (6 o 8 frontali), finiture oro giallo, argento/cromo, rosé, pavé di pietre, "open face" con cornici vuote; zanne allungate. In low-poly: texture sui denti o sovrapposizione mesh semplice con materiale metallico, visibile solo con bocca aperta/ghigno.
- **Anelli**: anelli grossi a fascia o signet, anelli pavé "cluster", più anelli per mano; in low-poly come anelli a 6-8 lati ingranditi.
- **Orecchini**: punto luce (stud) quadrato/tondo con pietra (anche su entrambe le orecchie), piccoli cerchi (huggie) argento/oro, croce pendente; in low-poly piccoli elementi brillanti a 4-8 tris.
- Rope chain (maglia a corda ritorta) e Franco sono altre maglie comuni (conoscenza generale, non citata).

### Gaps
- Le fonti sulle misure di catene sono pagine SEO/retailer; manca uno standard di settore.
- Nessuna fonte affidabile su grillz (solo listing commerciali); nessuna fonte trovata su anelli e orecchini streetwear 2020-2026.

## Pellicce sintetiche ("pellicce cafone") e animalier: lunghezze, colli, colori tinti, pelo; leopardo, zebra, tigre, pitone

### Takeaway
La pelliccia ecologica è tornata come statement con il trend "mob wife" (inizio 2024, TikTok, 25 anni dei Soprano): cappotto oversize, spesso lungo maxi, in nero/marrone/rosso o leopardato; sulle passerelle autunno 2024 dominano le fake fur dai colori accesi (giallo, cobalto, bordeaux). Il leopardo è la stampa regina (ricerche Depop +213% in una settimana).

### Cited Findings
- Il "mob wife aesthetic" emerge su TikTok a inizio 2024 in contrapposizione al quiet luxury; la pelliccia (sintetica) è la base del look, con tagli oversize, colori naturali, cintura, lunghezze maxi e leopardo — [FashionUnited](https://fashionunited.com/news/fashion/in-pictures-the-mob-wife-aesthetic/2024013158154)
- 25° anniversario dei Soprano come motore; ricerche "leopard print" su Depop +213% in una settimana — [Hello!](https://www.hellomagazine.com/hfm/fashion-trends/511265/mob-wife-style-get-the-look)
- Palette: nero, rosso, marrone, con il leopardato come staple — [Roar News](https://roarnews.co.uk/2024/leopard-prints-smokey-eyes-and-more-the-mob-wife-aesthetic-explained/); [The Boar](https://theboar.org/2024/03/leopard-print-is-the-new-black-the-mob-wife-aesthetic)
- Kylie Jenner con pelliccia sintetica oversize e décolleté rosso ciliegia (febbraio 2024) — [W Magazine](https://www.wmagazine.com/fashion/kylie-jenner-mob-wife-trend-fur-coat-red-heels)
- Coppola paragona il trend a Connie Corleone; creator TikTok Sarah Arcuri (New Jersey) citata come promotrice — [Post-Tribune via PressReader](https://www.pressreader.com/usa/post-tribune-sunday/20240211/281732684394292); [Stillman Exchange](https://blogs.shu.edu/stillmanexchange/?p=6879)
- Autunno 2024: le fake fur dai colori più accesi conquistano le passerelle — [Panorama](https://www.panorama.it/lifestyle/moda/pellicce-autunno-2024-gallery-passerelle)
- Esempi italiani: modello giallo con maxi revers, pelliccia blu cobalto, modello bordeaux corto con cappuccio; alternative neutre beige/cammello — [Drezzy](https://www.drezzy.it/community/modalab/tendenze-moda/pellicce-ecologiche-10-modelli-per-affrontare-con-stile-linverno/)
- Riferimenti vintage leopardati: trench anni '90 in pelliccia sintetica a doppiopetto con cintura e spalline; doppiopetto anni '60 con collo dentellato (revers a lancia) — [1stdibs D&G](https://www.1stdibs.com/it/moda/abbigliamento/giacche/dolce-gabbana-anni-90-con-stampa-leopardata-e-pelliccia-ecologica/id-v_14843472); [1stdibs I. Magnin](https://www.1stdibs.com/it/moda/abbigliamento/cappotti-e-capispalla/i-magnin-1960-doppiopetto-in-pelliccia-ecologica-leopardata-con-colletto-dentellato/id-v_24211032)
- Minigonne con inserto in pelliccia leopardata per l'inverno 2026 — [DiLei](https://dilei.it/moda/furry-skirt-tendenza-gonne-pelliccia-inverno-2026/2016686/)

### Inferences
- **Lunghezze**: corta/giacca (fianchi, "bomber/teddy"), 3/4 (metà coscia), lunga al ginocchio, maxi (polpaccio-caviglia, look mob wife). Silhouette a uovo/cocoon con spalle cadenti molto voluminose: il volume del pelo aggiunge 3-8 cm per lato, per cui la sagoma diventa ~1,3-1,6× la larghezza normale del busto.
- **Colli**: collo sciallato ampio, maxi revers (a lancia o dentellati), collo a imbuto alto, cappuccio; spesso chiusura a gancetti nascosti o cintura in vita.
- **Pelo (pile)**: corto/rasato (2-10 mm, tipo visone/ermellino, si presta a stampe animalier nitide), medio (1,5-3 cm, volpe sintetica), lungo shaggy/Mongolia (5-15 cm, ciocche ondulate, tipico dei colori acidi). Le stampe leggono meglio su pelo corto; pelo lungo = colori pieni o puntali tinti.
- **Colori "cafone"**: rosa shocking, fucsia, verde lime, arancio, giallo, blu cobalto, viola, rosso; bianco ottico; tinte bicolore o puntali (tip-dyed); in contrapposizione neutri cammello, cioccolato, nero.
- **Animalier — come si legge il pattern**:
  - *Leopardo*: rosette = anelli neri spezzati a "C"/ferro di cavallo con centro più scuro del fondo (marrone ruggine) su fondo ocra/cammello; distribuzione irregolare, dimensione rosetta ~1/10-1/15 della larghezza busto in gioco per leggibilità. Varianti: leopardo neve (grigio/bianco), leopardo rosa/blu tinto.
  - *Zebra*: strisce nere irregolari con biforcazioni su bianco, andamento verticale sul corpo/obliquo su maniche; alto contrasto, leggibile anche a bassa risoluzione.
  - *Tigre*: strisce nere sottili e appuntite su arancio con ventre/sfumature bianche; strisce più rade della zebra.
  - *Pitone/serpente*: scaglie poligonali a griglia sfumata (beige/grigio/nero) o tinte acide; più adatto a superfici lisce (pelle, vinile, pantaloni, borse) che a pellicce.
  - *Mucca/dalmata*: macchie piene; meno centrali nel look "cafone".
- **Low-poly**: shell volumetrica o mesh gonfiata con normal map "a ciocche" e bordi frastagliati con card alpha sul contorno (orli, collo, polsini) per suggerire il pelo; texture animalier a bassa risoluzione con pattern ingrandito; colore vertex per tinte piene.

### Gaps
- Nessuna fonte specifica sull'espressione "pellicce cafone" o sul suo uso nel contesto giovanile/maschile italiano.
- Nessun dato misurato sulla lunghezza del pelo per tipologia; i valori sopra sono indicativi.
- Stampe zebra/tigre/pitone: nessuna fonte di trend 2020-2026 specifica trovata oltre al leopardo.
