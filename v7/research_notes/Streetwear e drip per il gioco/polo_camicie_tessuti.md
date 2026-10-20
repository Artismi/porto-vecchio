# Polo, camicie, maglieria, capispalla e tessuti: catalogo di riferimento per vestiti 3D stilizzati low-poly

Nota di metodo: le fonti trovate sono soprattutto schede prodotto di rivenditori, guide di stile (Permanent Style, Gentleman's Gazette, Heddels, The Modest Man), Wikipedia e forum di 3D (Polycount). Alcune pagine (propercloth.com, smithsonianmag.com) non erano raggiungibili direttamente: le cito tramite gli estratti dei risultati di ricerca. Le indicazioni di texturing (cosa dipingere, quanto lucido) sono quasi tutte **inferenze** mie da conoscenza generale di tessile e PBR, segnalate come tali: non ho trovato fonti che diano valori di roughness per tessuto. Marchi citati solo dove compaiono nelle fonti; nel testo uso equivalenti generici (es. "giacca harrington" e non il nome del modello di marca).

## Polo: piqué da tennis, manica lunga, polo in maglia, polo anni '70 a collo largo; slim vs boxy

### Takeaway
La polo "che sembra cara" si legge da pochi dettagli: collo a coste (ribbed) eventualmente con filetto in contrasto (tipping), abbottonatura (placket) a 2 bottoni, polsini a coste sulle maniche, spacchetti laterali all'orlo (split hem, spesso con dietro più lungo), e tessuto piqué con micro-texture a nido d'ape. La variante streetwear 2024-26 è la polo in maglia con "Johnny collar" (collo aperto senza bottoni), vestibilità ampia e spalla scesa.

### Cited Findings
- Anatomia standard della piqué polo nelle schede prodotto: collo a coste (descritto come "pointed collar" o "ribbed spread collar"), placket a due bottoni (a volte "rinforzato"), maniche con bordo a coste, spacchetti laterali all'orlo, tessuto piqué di cotone (a volte cotone-elastan) — [H&M](https://www2.hm.com/en_us/productpage.1330413004.html); [Kmart NZ](https://www.kmart.co.nz/product/pique-polo-shirt-s175828/); [Tingstad](https://www.tingstad.com/se-en/workwear-shoes-accessories/tops/polo-shirts/pique-polo-shirt-for-women-3307-bk33071035); [Bruneau, piqué manica lunga](https://www.bruneau.be/en/product/cottover-pique-long-sleeve-man/8286164)
- Il collo con bordo in colore di contrasto (tipping) è meno standard del placket a 2 bottoni; nei risultati compare anche una variante a 3 bottoni con bordo contrastante — [sintesi ricerca su schede prodotto, es. North Sails](https://www.marinesuperstore.com/?p=307405)
- La piqué polo nasce a metà anni '20 come alternativa più comoda per il tennis; il knit con Johnny collar è trattato come trend separato e recente — [InsideHook](https://www.insidehook.com/style-guides/pique-polo-shirts-trend/amp)
- Johnny collar: collo senza bottoni (aperto), mentre la polo classica ha placket con bottoni; alcuni rivenditori usano i termini in modo intercambiabile — [The Tie Bar](https://www.thetiebar.com/c/vintage-retro-polos); [YouLookFab 2024](https://youlookfab.com/2024/08/12/trend-polo-and-johnny-collars/)
- Esempio retail di polo in maglia: "open pointed Johnny collar", vestibilità loose con spalla leggermente scesa; esiste anche versione a coste "pointelle" (maglia traforata) — [Simons, Johnny-collar ribbed polo](https://ai.simons.ca/en/men-clothing/polos/short-sleeves/johnny-collar-ribbed-polo--15611-42401); [Simons pointelle](https://ai.simons.ca/en/men-clothing/sweaters/short-sleeves/pointelle-ribbed-johnny-collar-polo--6867-228944)
- Le polo "retro" riprendono elementi 1950-1970, tra cui collo Johnny aperto senza bottoni — [The Tie Bar](https://www.thetiebar.com/c/vintage-retro-polos)
- Anni '70: la polo ha un revival di moda; il decennio sperimenta doppie tasche, forme di collo particolari, forme di manica, finiture in contrasto, colori pieni e decisi, righe orizzontali — [VintageDancer](https://vintagedancer.com/1970s/1970s-shirts-tops-blouses-t-shirt-styles-history/)
- Brand mainstream vendono polo con Johnny collar moderno — [Hugo Boss short collar](https://www.hugoboss.com/us/v/short-collar-shirts)
- Contesto "football/terrace": la polo è stata adottata dalle sottoculture calcistiche — [NSS Magazine](https://www.nssmag.com/en/fashion/37202/history-polo-shirt-trend-fashion-football)

### Inferences
- **Modellazione (low-poly)**: il collo è un solo "nastro" piegato (2 strisce di quad + spessore finto), con il tipping dipinto come 1-2 righe sottili (2-4 px su texture 512) lungo il bordo esterno; ripetere le stesse righe sui polsini a coste: è l'elemento che più fa "polo da club". Placket: rettangolo più chiaro/scuro di 1 tono con 2 bottoni (o 3 nella variante); bottoni come dischi dipinti con 4 fori puntiformi, nessuna geometria.
- **Split hem**: due tagli verticali corti ai fianchi + retro più lungo di 2-4 cm (scala reale) leggibile anche in low-poly spostando 2 vertici.
- **Slim vs boxy**: slim = spalla sulla punta della spalla, manica aderente sopra il bicipite, orlo a metà patta; boxy/oversize = cucitura spalla scesa di 5-10 cm sul braccio, corpo dritto quasi rettangolare, manica che arriva a metà avambraccio (per maniche corte) o sotto il gomito. Cropped boxy = orlo alla cintura, tipico streetwear.
- **Polo anni '70 a collo largo**: punte del collo lunghe e larghe che si appoggiano sopra le clavicole, spesso aperto (Johnny) o con placket profondo; colori pieni (marrone, senape, arancio bruciato, crema) con righe orizzontali a fasce sul petto o bordi contrasto.
- **Polo in maglia**: texture "a coste" verticali o punto fine/jacquard; il collo e l'orlo sono a coste fitte senza placket cucito. Spesso con bordo di 3-5 cm a coste all'orlo (che stringe) invece dello spacco — questa è la differenza visiva chiave rispetto alla piqué.
- **Polo manica lunga**: polsino a coste lungo (5-7 cm) che raccoglie la manica; nella versione in maglia di lana fine legge come "più elegante".

### Gaps
- Nessuna fonte con misure precise del collo anni '70 (lunghezza punte); ricerca non ha trovato storia documentata del "wide-spread collar polo".
- Nessuna fonte autorevole che quantifichi slim vs boxy in centimetri: le misure sopra sono inferenze.

## Camicie: bowling/camp collar con pannelli a contrasto, hawaiane, overshirt a quadri/flanella, collo cubano, western con carré e bottoni a pressione, poplin a righe

### Takeaway
La famiglia "camp/cuban collar" (collo piatto aperto, senza bottone in alto, che si stende sul davanti) unisce bowling e hawaiana: maniche corte, orlo dritto da portare fuori, vestibilità comoda. La bowling si riconosce da pannelli bicolore (corpo scuro, maniche/fasce chiare) e ricami; l'hawaiana dalla stampa a tutto campo e dalla tasca allineata alla stampa (segno di qualità). La western si riconosce dal carré a punta, tasche con patta "sawtooth" a doppia punta e bottoni a pressione perlati.

### Cited Findings
- Bowling shirt: le prime erano spesso in gabardine e a manica lunga; negli anni '50 domina il rayon (più traspirante); boom anni '50 con colori vivaci per riconoscere le squadre — [Real McCoy's, rayon bowling shirt](https://therealmccoys.com/products/rayon-bowling-shirt-black); [Smithsonian](https://www.smithsonianmag.com/arts-culture/questionably-fashionable-bowling-shirt-swept-the-nation-180984503/)
- Bowling anni '50: camicie più ampie, maniche più corte, code più lunghe per restare dentro i pantaloni, colli morbidi da portare senza cravatta; il nome si è esteso a tutte le camicie camp-collar a maniche corte con abbottonatura — [Smithsonian](https://www.smithsonianmag.com/arts-culture/questionably-fashionable-bowling-shirt-swept-the-nation-180984503/)
- Stile bowling: pannelli bicolore/contrasto, corpo più scuro con maniche o pannelli laterali più chiari, toni terra decisi e motivi geometrici; il camp collar è detto anche collo cubano; adottata poi da sottoculture rock e ska — [Hometosight](https://hometosight.com/what-is-a-bowling-shirt/) (fonte debole, commerciale)
- Hawaiana: deriva dalla "palaka", camicia a quadri prodotta in serie per i lavoratori delle piantagioni (1922); nei '30 il 56% delle stampe aveva motivi giapponesi o cinesi; dopo Pearl Harbor quei motivi calano; negli anni '90 il 57% ha motivi hawaiani/turistici — [Cornell Costume blog](https://blogs.cornell.edu/cornellcostume/2020/02/26/aloha-shirts)
- Motivi moderni: flora e fauna locale (ibisco, plumeria, palme, tavole da surf); i pesci nelle stampe sono specie reali identificabili — [99% Invisible, Articles of Interest #4](https://99percentinvisible.org/episode/hawaiian-shirts-articles-of-interest-4/transcript/)
- Tessuti hawaiana: cotone, seta, rayon (anche "rayon poplin"); alcuni brand usano lino-cotone — [StyleForum Journal](https://journal.styleforum.net/tag/aloha-shirts); [Fedora Lounge](https://www.thefedoralounge.com/threads/hawaiian-shirts-aloha-shirts.8923/post-1838595)
- Tasca "matched" (la stampa continua senza interruzione dal corpo alla tasca) = segno di capo di qualità superiore, ma non universale; bottoni in cocco tipici — [99% Invisible](https://99percentinvisible.org/episode/hawaiian-shirts-articles-of-interest-4/transcript/); [StyleForum](https://journal.styleforum.net/tag/aloha-shirt)
- Western shirt: chiusura a bottoni a pressione (snap), carré (yoke) pronunciato e spesso a punta, tasche al petto con patta "sawtooth" a doppia punta, anch'esse con snap — [Heddels](https://heddels.com/2020/07/western-shirts-snapping-into-an-americana-classic/)
- Esempio di specifica: snap perlati, tasche con patta a doppia punta, carré a punta davanti e dietro — [Levi's Sawtooth Western Shirt](https://www.levi.com/CA/en_CA/Clothing/Men/Shirts/Sawtooth-Western-Shirt/p/658190071)
- Carré western curvo con una o più punte (vs cucitura dritta delle camicie normali); "smile pocket" = tasca con apertura curva, spesso bordata di piping, con estremità a freccia, tipica del vintage; polsini con 2-3 snap (fino a 5 sui polsini "shotgun") — [Langston's Western Shirts Glossary](https://www.langstons.com/western-shirts-guide.html); [Vintage Cowboy Store](https://vintagecowboystore.substack.com/p/vintage-western-wear-terminology)
- Righe da camicia, dalla più sottile alla più larga: pinstripe (1-2 fili, ben distanziate) → pencil (2-3 fili) → bengal (righe uguali colore/bianco, ~6 mm, 1/4") → candy (~3 mm, 1/8") → awning (oltre 1/4", righe piene su fondo bianco). Le fonti si contraddicono su chi sia più larga tra bengal e candy — [Permanent Style, Name that stripe](https://www.permanentstyle.com/2020/08/name-that-stripe-a-guide-to-shirt-stripe-patterns); [SewGuide](https://sewguide.com/types-of-stripes/); [Xacus](https://legacy.xacus.com/en/media-feed/blog/stripes-styles-how-to-recognize-the-different-types-of-stripes-in-men-s-shirts_70_209.htm)
- Poplin: tela (plain weave) fitta, resistente, con leggero effetto a costina — [Bills Khakis glossary](https://billskhakis.com/pages/glossary)

### Inferences
- **Camp/cubano in low-poly**: il collo non sale attorno al collo ma si appiattisce sul petto formando una "V" aperta con revers continuo nel davanti (niente stand/collarino). È la silhouette più economica da modellare e più leggibile da lontano.
- **Bowling a contrasto**: la grafica tipica è (a) due fasce verticali chiare che scendono dalle spalle sul davanti (o pannelli laterali), (b) maniche di un colore e corpo di un altro, (c) bordino/piping contrastante sul collo e sulle tasche; ricamo a punto catenella (scritta corsiva sul retro, nome sul petto) dipinto come linea ondulata in rilievo leggero (bump). Rayon: lucentezza morbida, quasi satinata → roughness medio-bassa (inferenza ~0.35-0.5) con riflesso largo, niente trama visibile.
- **Hawaiana**: la stampa deve essere grande (motivi di 8-15 cm su scala reale, cioè 3-5 ripetizioni sulla larghezza del busto) per leggere come "hawaiana" e non come "floreale da ufficio"; aggiungere la tasca allineata alla stampa è un dettaglio "premium" che in texture costa zero (basta che la UV della tasca prenda la stessa zona della stampa).
- **Overshirt a quadri / flanella**: boxy, spalla scesa, due tasche a toppa al petto con patta, 6-7 bottoni; portata aperta su t-shirt. In texture: quadri dipinti con fili incrociati sfumati (la garzatura sfoca i bordi), roughness alta (~0.85-0.95), niente riflessi.
- **Western**: carré a punta dipinto in un colore/tessuto diverso (es. denim più scuro o bordino piping), patte sawtooth (forma a "M" rovesciata) come geometria piatta o solo bump; snap = dischi perlati iridescenti (unica zona lucida, roughness bassa).
- **Poplin a righe**: righe bengal/candy leggibili solo a scala grande; per low-poly ingrandire le righe 1.5-2x rispetto al reale, altrimenti diventano moiré.
- **Pulsanti**: in genere 6-7 bottoni sulle camicie, ma non ho fonte specifica per il conteggio.

### Gaps
- Nessuna fonte su larghezze tipiche dei pannelli della bowling shirt o conteggio bottoni camp collar.
- Nessuna fonte specifica sulla scala di stampa delle hawaiane in cm: il valore sopra è inferenza.
- Smithsonian e Proper Cloth non raggiungibili via fetch; citati da estratti di ricerca.

## Maglieria e capispalla in contesto street: zip cardigan, varsity, coach, harrington, bomber, giacca in pelle, piumino (larghezza delle trapuntature)

### Takeaway
Ogni capospalla ha un "segnale" che lo rende riconoscibile anche in low-poly: varsity = corpo in lana + maniche in pelle + coste a righe + toppa in ciniglia; coach = nylon liscio, bottoni a pressione, coulisse all'orlo, collo a camicia; harrington = colletto alto a due bottoni ("dog-ear"), tasche oblique con patta, carré "a ombrello" sul retro, fodera tartan, coste a orlo e polsini; bomber = più ampio e imbottito, collo a costa invece del colletto; piumino = canali orizzontali, quelli larghi e il taglio boxy dicono "anni '90/street".

### Cited Findings
- Harrington: orlo e polsini a coste, colletto a due bottoni "dog-ear", due tasche oblique con patta, carré posteriore "a ombrello" (ispirato all'ombrello, fa scolare la pioggia), fodera tartan — [Baracuta support](https://support.baracuta.com/en-US/which-are-the-distinctive-elements-of-the-harrington-jacket-327296); [Gentleman's Gazette](https://www.gentlemansgazette.com/harrington-jacket-baracuta-g9-guide/)
- Harrington vs bomber: l'harrington ha taglio dritto e colletto (non costa) → linee più pulite e aderenti; il bomber è più largo, spesso più spesso, con collo a costa — [The Modest Man](https://www.themodestman.com/what-is-a-harrington-jacket/); [Ape to Gentleman](https://www.apetogentleman.com/harrington-jacket/)
- Varsity: corpo in lana (o misto lana) con maniche in pelle bovina, chiusura a pressione, toppa in ciniglia, colletto/polsini/orlo a costa rigata ("varsity stripe"), tasche oblique; maniche in pelle su corpo in lana la distinguono dalla letterman tutta lana — [Human Made via HBX](https://hbx.com/women/brands/human-made/varsity-jacket-navy-1); [Coach, Wool Varsity](https://www.coach.com/products/wool-varsity-jacket/CDK37.html); [Real McCoy's](https://therealmccoys.com/products/wool-varsity-jacket-bulldogs_030-black)
- Coach jacket: nylon leggero con fodera in poliestere, chiusura a bottoni a pressione, coulisse all'orlo per regolare la forma — [AS Colour via Printify](https://printify.com/app/products/11003/as-colour/coach-jacket); [Stüssy via Feature](https://feature.com/products/stussy-coaches-jacket-black); [Goldwin](https://usshop.goldwin-global.com/products/gl14133)
- Piumino: costruzione "sewn-through" (esterno cucito direttamente alla fodera → cuciture senza piuma, linee a pizzico) tipica di giacche leggere; "box baffle" (pareti di tessuto tra le camere) tipica dei capi da spedizione, più gonfi e uniformi — [Alpine Ascents, Down 101](https://www.alpineascents.com/blog/gear/down-101/)
- Il piumino anni '90 di riferimento street ha taglio boxy e trapuntature orizzontali sovradimensionate; le trapuntature orizzontali nascono per tenere ferma la piuma — [Altitude Sports](https://www.altitude-sports.com/blog/the-north-face-brings-back-the-90s-with-the-nuptse-collection/)
- "Wider baffles" vendute come look contemporaneo; più canali = imbottitura più uniforme; per streetwear si consiglia una taglia in più per la silhouette oversize — [Port Authority via Printify](https://printify.com/app/products/4339/port-authority/puffer-jacket); [Fuga Studios](https://fuga-studios.com/en/collections/streetwear-puffer-jackets)
- Variante "anni '90 rivisitata": piumino in colori più spenti e taglio più stretto per un look sobrio — [Fuga Studios Y2K](https://fuga-studios.com/en/collections/y2k-puffer-jacket)

### Inferences
- **Piumino in low-poly**: ogni canale = un anello di geometria rigonfio (2-3 loop per canale), con cucitura pizzicata tra i canali; canali larghi (stima ~12-20 cm reali, 5-7 sul busto) = street/90s; canali stretti (~5-8 cm) = piumino leggero "da città". Nylon ripstop lucido (roughness ~0.25-0.4, riflesso speculare lungo sulle sommità dei canali) vs opaco (~0.6-0.7). L'effetto "crinkle" del nylon = normal map con pieghe sottili irregolari ad alta frequenza, più evidente nelle zone di cucitura.
- **Coach jacket**: superficie liscia e un po' lucida (nylon), collo a camicia con revers piccolo, 4-5 snap, grafica stampata grande sul retro (è un "cartellone" tipico street).
- **Varsity**: due materiali con roughness molto diversi — lana feltrata (roughness ~0.9, rumore fine) e pelle delle maniche (roughness ~0.35-0.5, leggero speculare); coste a righe 2-3 bande di colore su collo, polsi e orlo; lettera in ciniglia = patch con bordo a punto catenella e superficie "pelosa" (bump rumoroso).
- **Harrington**: modellare il carré posteriore come un pannello a "ombrello" (bordo inferiore a punte morbide); la fodera tartan si vede solo se la giacca è aperta: dettaglio "premium" se si mostra il bordo interno.
- **Bomber**: nylon satinato lucido (tipo MA-1) con tasca portapenne sulla manica sinistra e fodera arancione — dettagli non verificati in questa ricerca (conoscenza generale).
- **Zip cardigan / giacca in pelle**: nessuna fonte trovata in questa ricerca; da conoscenza generale: zip cardigan in maglia grossa con coste al collo e cerniera metallica (unico punto metallico), giacca in pelle "biker" con cerniera diagonale e revers con snap, o "trucker/racer" con collo a fascetta.

### Gaps
- Nessuna fonte con larghezze numeriche dei canali del piumino (né di marchio né tecniche).
- Nessuna fonte trovata su zip cardigan, giacca in pelle, bomber MA-1 e tute in acetato (track jacket): le note su questi sono inferenze/conoscenza generale.

## Tessuti e pattern: come si vedono a piccola e grande scala (cosa dipingere, bump, lucentezza); scala di quadri, righe, floreali, paisley, animalier

### Takeaway
Per un gioco low-poly la regola pratica è: le micro-strutture (piqué, oxford, poplin, jersey) diventano quasi invisibili a distanza e si rendono con un rumore fine in normal/bump + roughness alta; ciò che si legge davvero è la **lucentezza** (rayon/satin, acetato, nylon, pelle = lucidi; flanella, felpa, pile, spugna, velluto = opachi con alone "sheen") e la **scala del pattern** (quadri sotto 1/2" = elegante; da 1/2" a 2" = sportivo/weekend; buffalo grande = rustico/street).

### Cited Findings
- Scala quadri (gingham): quadri tra 1/2" e 2" leggono come forti e sportivi, da weekend; sotto 1/2" (soprattutto 1/4" o meno) funzionano in ufficio — [Proper Cloth, Gingham](https://propercloth.com/reference/gingham/)
- Buffalo check = versione a grande scala del gingham, origini 1800 nell'abbigliamento outdoor; tipici rosso/nero o bianco/nero, forte contrasto, rustico — [Centsational Style](https://centsationalstyle.com/2015/12/trending-buffalo-check/); [guida check shirts](https://oldstore.motogp.com/checkmate-your-style-the-ultimate-guide-to-check-pattern-shirts)
- Oxford: armatura panama (basket weave), più fili di trama incrociano altrettanti fili di ordito; di solito trama colorata su ordito bianco → effetto bicolore "melange" — [Brooks Brothers, shirt fabrics](https://www.brooksbrothers.eu/bb-world/products/what-are-the-best-men-s-shirt-fabrics); [MH China, oxford weave](https://www.mh-chine.com/blog/products/oxford-weave)
- Seersucker: l'effetto increspato è costruito nella tessitura; tiene il tessuto staccato dalla pelle (clima caldo) — [Brooks Brothers](https://www.brooksbrothers.eu/bb-world/products/what-are-the-best-men-s-shirt-fabrics)
- Flanella: tela o saia, ma la struttura è nascosta dalla garzatura (spazzole metalliche sollevano le fibre → pelo morbido); l'oxford garzato ha pelo solo sul diritto — [Buffalo Jackson, Flannel vs Oxford](https://buffalojackson.com/blogs/insight/flannel-vs-oxford); [Proper Cloth brushed oxford](https://propercloth.com/fabrics/light-grey-brushed-oxford-4345.html)
- Velluto a coste: il numero di coste ("wale") per pollice va da 1.5 a 21, standard tradizionale 10-12; millerighe (pinwale/needlecord) 14+; costa larga ≤8; la costa larga va più su pantaloni/tappezzeria, quelle fini sopra la vita — [Wikipedia, Corduroy](https://en.wikipedia.org/wiki/Corduroy); [The Modest Man, corduroy](https://www.themodestman.com/corduroy-fabric/)
- Righe: vedi sezione camicie (pinstripe → pencil → bengal ~1/4" → candy ~1/8" → awning >1/4") — [Permanent Style](https://www.permanentstyle.com/2020/08/name-that-stripe-a-guide-to-shirt-stripe-patterns)
- Tessuti con "sheen" (velluto, raso): usare un modello sheen PBR (es. estensione glTF KHR_materials_sheen); per velluto scuro/saturo albedo scuro e colore nel termine sheen, specular colorato, normal map "grunge" leggera per le pieghe; senza sheen si può simulare con parziale metallic + roughness molto alta — [Polycount thread](https://polycount.com/discussion/comment/2750985)
- La roughness controlla la nitidezza del riflesso, la normal map la direzione: da raso nitido a pile diffuso — [Style3D blog](https://www.style3d.com/blog/wp-json/wp/v2/posts/13034)
- Ricetta normal map velluto: desaturare un'immagine tileabile, filtro high-pass, aumentare contrasto, filtro normal map; secondo slot bump per le grinze; gloss ricavato da height map + Fresnel con IOR alto (scorciatoia stilizzata) — [TurboSquid, Velvet](https://resources.turbosquid.com/library/velvet)
- In UE5 lo shading model "Cloth" con normal tessuto tileabile e "fuzz" toglie l'aspetto plastica — [J.S. Abbott, cloth shader UE 5.7](https://jsabbott.artstation.com/blog/category/6)

### Inferences (tabella pratica: piccola scala = vista ravvicinata/bump; grande scala = cosa resta da lontano/albedo; lucentezza indicativa come roughness 0-1, valori NON da fonte)
- **Piqué**: micro-nido d'ape/waffle fine → bump a griglia di celle esagonali o romboidali; da lontano solo leggero rumore di colore. Roughness ~0.8. Collo e polsini a coste verticali (bump a righe fitte).
- **Jersey** (t-shirt, polo in maglia fine): maglia a "V" microscopica, invisibile → albedo quasi piatto + rumore leggerissimo; roughness ~0.85. Le pieghe morbide e grandi contano più della trama.
- **Poplin**: liscio, micro-costina orizzontale appena percettibile; leggermente più lucido del cotone maglia (roughness ~0.65-0.7). Pieghe nette e piccole.
- **Oxford**: puntinatura bicolore (fili bianchi + colorati) → albedo con "sale e pepe" fine; bump a piccola stuoia. Roughness ~0.75.
- **Flanella**: bordi dei quadri sfumati (non netti), leggero alone di peluria; roughness ~0.9; sheen leggero sui bordi in vista radente.
- **Seersucker**: righe alterne lisce/increspate → bump solo sulle righe increspate (rumore "a bolle" allungato), albedo a righe chiaro/bianco; opaco.
- **Rayon/raso delle bowling**: nessuna trama visibile, riflesso morbido e ampio che segue le pieghe; roughness ~0.35-0.5, leggero sheen. Le pieghe drappeggiano molto (stoffa che "cola").
- **Velour/ciniglia**: colore più scuro nelle zone rivolte alla camera e più chiaro sui bordi (sheen), nessuna trama → è la sheen a dire "velluto".
- **Velluto a coste**: righe verticali a rilievo: costa larga = 3-4 righe visibili per 10 cm in gioco (esagerare), millerighe = quasi solo un rumore lineare; sheen sulle creste.
- **Spugna (terry)**: puntinato ad anelli → bump a rumore granulare forte; opaco; colori pastello/vintage.
- **Pile (fleece)**: superficie "pelosa" morbida e opaca, bordi un po' più chiari; rumore a macchie larghe nel bump; roughness ~0.95.
- **Trapuntato (puffer)**: geometria gonfia + cuciture come linee scure in AO; nylon lucido o opaco come sopra.
- **Acetato/tricot delle tute**: lucido liscio, riflesso molto nitido (roughness ~0.2-0.35), righe laterali a contrasto (2-3 bande lungo la manica/gamba) — non ho trovato fonte.
- **Nylon crinkle**: base lucida + normal map con grinze fini irregolari; il riflesso si spezza in tante piccole luci.
- **Pelle**: grana fine (pori) nel bump, roughness ~0.35-0.5 su pelle liscia, ~0.7 su pelle opaca/scamosciata; pieghe più marcate ai gomiti.
- **Scala dei pattern sul corpo (inferenza da regola Proper Cloth adattata a low-poly)**: quadri tra 2 e 8 cm reali (3-8 quadri sulla larghezza del busto) leggono bene; sotto ~1 cm diventano un colore medio (usare tinta unita o micro-rumore invece del pattern); tartan e buffalo grandi (8-15 cm) leggono come "lumberjack/street". Righe: sotto 3 mm = colore unito; candy/bengal esagerati 1.5-2x; righe "rugby" o 70s orizzontali da 2-5 cm per maglie e polo. Floreali e hawaiane: motivi 8-15 cm; paisley: motivo "goccia" 5-10 cm, ideale per bandane/camicie camp; animalier (leopardo/zebra): macchie 3-6 cm, leggono bene anche in low-res perché ad alto contrasto.

### Gaps
- Nessuna fonte con valori numerici di roughness/specular per tessuto: tutti i valori sono stime.
- Nessuna fonte specifica per tutorial di texturing **stilizzato/hand-painted low-poly** dei tessuti (Substance/Marvelous); le fonti trovate sono PBR realistiche.
- Non trovate fonti su scala del tartan, paisley, animalier e spugna/acetato.

## Palette streetwear contemporanea 2020-2026 e cosa fa sembrare un outfit "costoso" vs economico

### Takeaway
Dal 2023 domina il filone "quiet luxury"/stealth wealth (niente loghi, materiali e vestibilità curati, palette neutra e tonale), fuso nel 2025 con lo streetwear (capo pregiato + capo street). Palette 2025-26: marrone cioccolato/espresso come nuovo nero, bordeaux/mogano, oliva, carbone; giallo burro come accento controverso; nel 2026 segnali di ritorno a colori vivaci e "loud luxury".

### Cited Findings
- Quiet luxury: materiali pregiati, niente loghi visibili, palette neutre, artigianalità riconoscibile solo da chi se ne intende; conta più fit, tessuto e sobrietà che loghi e grafiche — [The Social Cat](https://thesocialcat.com/glossary/quiet-luxury); [Hola](https://www.hola.com/us/fashion/20230529346257/why-are-people-ditching-brand-logos); [Fortune, stealth wealth](https://fortune.com/2023/07/24/stealth-wealth-clothing-succession)
- Streetwear "classico": grafiche forti, branding visibile, silhouette casual; fusione 2025: es. dolcevita in cashmere + cargo, trench sartoriale + pantaloni della tuta — [Fusion Fashion](https://fusion-fashion.beehiiv.com/p/quiet-luxury-meets-streetwear-the-unexpected-fusion-defining-2025)
- Critica: il quiet luxury diventa omogeneo, "troppo neutro"; previsione di ritorno al colore/loghi — [Stylist](https://stylist.co.uk/fashion/what-will-come-next-after-quiet-luxury/808231); il loud luxury "si riafferma nel 2026" — [Shopappy](https://shopappy.com/?p=7633)
- I neutri giusti dipendono dal sottotono della pelle: scelti bene sembrano costosi, sbagliati sembrano costume — [Egypt Today 2026](https://www.egypttoday.com/Article/6/144898/The-Art-of-Whisper-Mastering-Quiet-Luxury-in-2026)
- Marrone cioccolato/espresso come nuovo neutro scuro al posto del nero; bordeaux/mogano colore chiave autunno 2026, da sovrapporre al marrone; oliva come base per daywear e utility; giallo burro: alcune fonti lo vedono come ingresso nel menswear, altre lo danno per finito nel 2026 — [The Double F, autunno 2026](https://www.thedoublef.com/en-it/blogs/the-rooster/autumn-2026-color-trends); [Ballantynes, Chocolate SS26](https://www.ballantynes.co.nz/spring-summer-colour-chocolate.html); [AOL, Winter 2026 colors](https://www.aol.com/articles/6-top-color-trends-know-160000695.html); [Espiritu, 2026-27](https://espiritu.com/blogs/style-trends/color-trends-for-menswear-this-2026-2027-how-to-style-them)
- Passerelle di Parigi e Milano con tinte vivaci (rosso, giallo burro) accanto a neutri terrosi (cioccolato, oliva, carbone) — [Espiritu](https://espiritu.com/blogs/style-trends/color-trends-for-menswear-this-2026-2027-how-to-style-them)

### Inferences
- **"Costoso" nel gioco**: outfit tonale (2-3 tinte vicine: crema/cammello/marrone, oppure carbone/grigio/nero) + un tessuto "ricco" visibile (sheen del velluto, lucido del rayon, grana della pelle, pelo della maglia), dettagli piccoli e precisi (tipping, piping, bottoni madreperla, cerniera metallica unica), vestibilità coerente (o tutto boxy o tutto slim), niente loghi grandi.
- **"Economico"**: colori saturi primari non armonizzati, loghi/scritte grandi ovunque, poliestere lucido "plastico" uniforme (roughness bassa ovunque), pattern a scala sbagliata (quadri minuscoli che diventano moiré), vestibilità ambigua (né aderente né volutamente oversize), troppi materiali diversi.
- **Palette da gioco suggerite**: (1) cioccolato + crema + bordeaux; (2) oliva + carbone + ecru; (3) navy + bianco sporco + rosso mattone (club/polo); (4) neri tonali con un accento giallo burro o verde acido per personaggi più "drip"/loud.

### Gaps
- Fonti sulle palette sono blog e retailer, non istituti di trend (es. WGSN, Pantone non consultati); dati 2020-2022 non coperti in dettaglio.
- Nessuna fonte quantitativa sulla percezione "costoso vs economico": solo commentario di moda.
