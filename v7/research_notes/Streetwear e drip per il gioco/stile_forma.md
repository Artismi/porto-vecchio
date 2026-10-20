# Stile e forma dei vestiti: giochi stilizzati, illustrazione di moda, sartoria e low-poly

> Nota metodologica: WebFetch non funzionava (errore DNS su tutti i domini: ggxrd.com, 80.lv, blendernation, substack). Tutti i "Cited Findings" vengono quindi dai riassunti dei risultati di ricerca, non dalla lettura completa delle pagine. Le regole numeriche che non hanno una fonte stanno nelle sezioni "Inferences" e sono indicate come pratica corrente o deduzione, non come fatti verificati.

## 1. Vestiti stilizzati nei videogiochi (silhouette, pieghe, contorni, cel-shading, leggibilità)

### Takeaway
Nei giochi cel-shaded di riferimento un vestito diventa leggibile per tre cose: una silhouette iconica, poche pieghe "intenzionali" modellate nella geometria e un'ombra a step controllata a mano tramite normali e vertex color. Le texture rumorose e le pieghe simulate in modo realistico non portano a quel risultato. I personaggi sono pensati come simboli, non come persone.

### Cited Findings
**Guilty Gear Xrd (Arc System Works, GDC 2015, Junya C. Motomura)**
- Il talk GDC "GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D" copre la R&D artistica e di programmazione e tutte le scelte artistiche — [GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)
- Il team ha rinunciato all'accuratezza matematica per ottenere un cel shading perfettamente coerente su personaggi 3D complessi — [BlenderNation](https://www.blendernation.com/2015/07/26/junya-c-motomura-behind-the-scenes-of-guilty-gear-xrd/)
- Usavano proprietà dei vertici (normali, vertex color) invece delle texture: i valori interpolati tra i vertici restano netti anche nei primi piani — [Slide Motomura (PDF)](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf)
- Il cel shader è una semplice funzione a step: una superficie è in luce se la normale guarda la luce, con una soglia di 90° regolabile. Basta una minima variazione della normale per creare grandi macchie di luce o d'ombra, quindi le normali vanno curate a mano — [Slide Motomura (PDF)](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf)
- Su alcune parti (es. le teste) le normali sono state editate a mano per avere zone pulite di sola luce o sola ombra; i vertex color servivano a spingere parti del modello in ombra — riassunto del talk su forum [Polycount](https://polycount.com/discussion/comment/2255077) (fonte secondaria)
- Secondo un commento di forum il talk consigliava di tenere le linee nelle UV squadrate (dritte) per evitare artefatti di antialiasing (fonte di seconda mano) — [Polycount](https://polycount.com/discussion/comment/2255077)
- Il talk tratta anche "texture scalabili"; il materiale (talk e handout PDF) è stato pubblicato in inglese — [Arc System Works](https://www.arcsystemworks.com/guilty-gear-xrd-art-talk-at-game-developers-conference-2015/)

**Hi-Fi Rush (Tango Gameworks)**
- Il direttore creativo John Johanas cita come ispirazioni del cel shading Jet Set Radio, Okami e Viewtiful Joe. Il team non aveva esperienza con lo stile e a volte metteva i concept art accanto allo schermo per confrontarli — [Vice](https://vice.com/en/article/88qyw5/how-a-designer-known-for-horror-made-the-musical-gaming-triumph-hi-fi-rush)
- Al GDC 2024 Tango ha presentato un toon renderer deferred che dà al mondo 3D un aspetto 2D, a 60 FPS e risoluzione nativa — [80.lv](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style)
- Il lead art director Keita Sakai viene dai fondali anime e ha applicato quell'esperienza a concept, design e illuminazione — [Xbox Wire](https://news.xbox.com/en-us/2023/10/04/hi-fi-rush-exclusive-oral-history/)

**Jet Set Radio / Bomb Rush Cyberfunk**
- Ryuta Ueda (art director di JSR) voleva personaggi "più come un'icona… non come un umano, ma un personaggio — più come un simbolo". Si ispirava alla cultura giovanile di Tokyo di fine anni '90 e usava molto colore contro i giochi cupi dell'epoca. Lo street style reale mescolava capi dell'usato, goggles neon e "proporzioni cartoonesche" — [Yokogao Mag](https://www.yokogaomag.com/editorial/the-culture-that-shaped-jet-set-radio); [USgamer](https://www.usgamer.net/articles/jet-set-radio-20-year-anniversary-sega-feature-interview)
- Il primo sketch di Ueda fissava già lo stile: t-shirt, jeans, cuffie e pattini in linea — [Yokogao Mag](https://www.yokogaomag.com/editorial/the-culture-that-shaped-jet-set-radio)
- BRC usa il cel shading "a blocchi" di JSR con linee scure e spesse da fumetto. I personaggi sono angolari e taglienti, non morbidi e arrotondati, in stile Dreamcast. Nessuna gang è vestita in modo simile — [recensione Nook Gaming](https://www.nookgaming.com/bomb-rush-cyberfunk-review/)
- Dion Koster (Team Reptile) è sia character designer sia modellatore dei personaggi; il gioco nasce dal suo background di danza, skate e graffiti — [TouchArcade](https://toucharcade.com/?p=315609); [Wikipedia](https://en.wikipedia.org/wiki/Bomb_Rush_Cyberfunk)

**Splatoon / Sunset Overdrive**
- Lo stile di Splatoon si basa su streetwear, elettronica, hip-hop e "corporate punk". Molti capi citano oggetti reali: "Punk Nights" sono Doc Martens, "Dakroniks" sono adidas Superstar, "Norimaki 750" sono Yeezy 750 — [Sabukaru](https://sabukaru.online/articles/dripping-in-squid-ink-the-fashion-references-of-splatoon); [First Person Scholar](https://www.firstpersonscholar.com/?p=6421)
- Sunset Overdrive (AD Jacinda Chew): stile "irriverente, audace, colorato, brillante e divertente". Le ispirazioni sono Jamie Hewlett (Tank Girl) e Jean Paul Gaultier, da cui l'idea di combinare costumi di temi diversi in modo inatteso — [CG Channel](https://www.cgchannel.com/?p=66300)
- In Sunset Overdrive ogni personaggio ha circa 40.000 poligoni e il cloth è tutto simulato fisicamente, quindi è un approccio opposto al low-poly — [DualShockers](https://www.dualshockers.com/xbox-one-exclusive-sunset-overdrive-has-40000-polygons-per-character-and-physically-simulated-cloth/)

**Contorni (outline)**
- Inverted hull: si duplica la mesh, la si colora di nero, la si gonfia leggermente e se ne invertono le normali. Le linee sono pulite e lo spessore si regola spostando i vertici, ma questo metodo non disegna le linee interne. Servono normali lisciate (mediate), altrimenti la linea si spezza sugli spigoli vivi. Gli spigoli concavi e le superfici molto vicine non ricevono il contorno — [Kodeco](https://www.kodeco.com/92-unreal-engine-4-toon-outlines-tutorial); [Unity Discussions](https://discussions.unity.com/t/toon-outline-for-selected-edges-in-vr/858814); [Bugnet](https://bugnet.io/blog/how-to-fix-outline-shader-artifacts)
- Post-process (edge detection su depth e normali): costo fisso, spessore costante a ogni distanza, nessuna compenetrazione. In compenso richiede più rilevatori e soglie ben tarate: troppo strette perdono bordi, troppo larghe contornano tutto — [Kodeco](https://www.kodeco.com/92-unreal-engine-4-toon-outlines-tutorial); [Bugnet](https://bugnet.io/blog/how-to-fix-outline-shader-artifacts)
- Uno studio anime ha scelto l'hull anche perché le linee post-process non si possono vedere in anteprima nel software di modellazione — [noggi3d](https://noggi3d.notion.site/Line-Art-36a2ccea40b18002a370ca9655169cd0)

**Pieghe e silhouette**
- I vestiti stilizzati hanno "molta intenzione dietro le pieghe"; la simulazione realistica rischia di togliere questo carattere — [Polycount](https://polycount.com/discussion/comment/2810205)
- Test della silhouette: un design chiaro anche come sagoma piena dice subito se il linguaggio di forme è morbido (tondo) o duro (spigoloso). Se il design regge come forme piatte semplici, resta leggibile — [Sketchbook](https://www.sketchbook.com/blog/character-clothing); [Clip Studio Tips](https://tips.clip-studio.com/ja-jp/articles/4330?org=1)
- Linguaggio delle forme: cerchio = amichevole/morbido, quadrato = stabile/solido, triangolo = dinamico/aggressivo — [PDF Creating Stylized Characters](https://linode.nexstar.tv/Download_PDFS/mL9004/604389/Creating%20Stylized%20Characters.pdf)

### Inferences
- **Regola delle pieghe (dedotta da Polycount, Reallusion e lo stile BRC/JSR):** da 2 a 4 pieghe per capo, e solo dove il corpo si piega o il tessuto è teso: incavo del gomito, retro del ginocchio, cavallo, ascella e cintura che stringe. Le pieghe vanno fatte come cunei/triangoli netti (linguaggio "a triangolo" = dinamico), mai come onde morbide e ripetute. Sul resto del capo: superfici piatte.
- **Ombre:** 2 bande (luce/ombra) con soglia netta. Una terza banda (highlight o rim) va usata solo per materiali specifici come pelle o vinile. In un low-poly le normali vanno sistemate a mano (data transfer da una forma semplice, es. un cilindro per il busto o una sfera per la testa) per evitare macchie d'ombra casuali sui vestiti, come faceva Arc System Works.
- **Colore:** blocchi piatti di 2-3 colori per capo (base + accento + dettaglio). Le texture rumorose (denim fotografico, tessuto realistico) si leggono male da lontano; meglio motivi grafici grandi (strisce, loghi, graffiti), come in JSR, BRC e Splatoon.
- **Outline per low-poly:** inverted hull con spessore pilotato da vertex color (più sottile su dita e volto, più spesso su sagoma e scarpe), più qualche linea interna disegnata in texture lungo cuciture e orli (UV dritte, alla GGXrd). Il post-process è più semplice se il budget lo permette, ma è meno controllabile.
- **Iconicità:** ogni personaggio deve avere 1 elemento di silhouette esagerato (giacca enorme, cappello, scarpe giganti, cuffie) riconoscibile in sagoma nera da lontano.

### Gaps
- Non ho trovato fonti verificabili su come Persona 5, GTA, No Straight Roads o Fortnite trattano i vestiti (numero di pieghe, bande, outline). Le slide GGXrd e l'articolo 80.lv su Hi-Fi Rush non erano raggiungibili (DNS).
- Le "Motomura lines" (linee interne in texture con UV dritte) sono confermate solo da fonti di seconda mano.
- Non ho trovato fonti sull'uso del vertex color per lo spessore delle outline in GGXrd: ricordo che è così, ma non ho potuto verificarlo.

## 2. Principi dell'illustrazione di moda (proporzioni allungate, drappeggio, orli e cuciture)

### Takeaway
La figura di moda è alta 9 teste invece delle 7,5-8 realistiche, e l'altezza in più va quasi tutta nelle gambe. Il tessuto si disegna come comportamento (rigido, morbido, lucido) più che come dettaglio. Le pose a S fanno risaltare il capo.

### Cited Findings
- Il croquis di moda standard per la donna è alto 9 teste, contro le 8 di una proporzione naturalistica — [Syllabus KBCC/CUNY](https://www.kbcc.cuny.edu/academicdepartments/ba/Documents/fd11syllabus.pdf)
- Il sistema a 9 teste parte da un'anatomia realistica di circa 7,5 teste e distribuisce le 1,5 teste in più soprattutto su gambe e busto — [Vizcom](https://vizcom.com/blog/fashion-croquis) (fonte commerciale)
- "9 Heads" (Riegelman) dedica un capitolo al disegno dei tessuti per tipo (rigido, lucido, opaco, trasparente, morbido), con drappeggio, costruzione e ombreggiatura, oltre a una sezione sulla posa a S — [Indice del libro](https://discovery.spaa.ae/Record/1647/TOC); [Blinkist](https://www.blinkist.com/books/9-heads-en)
- Le linee verticali (es. le princess seam) allungano la figura — [Bluprint](https://www.mybluprint.com/article/how-to-sew-princess-seams)

### Inferences
- **Per il gioco:** per figure "fashion" puntare a 8-8,5 teste, perché 9 è troppo per un personaggio giocabile con teste leggibili. Allungare soprattutto il femore e la tibia; il cavallo resta circa a metà altezza o poco sopra.
- **Orli e cuciture curvi, non dritti:** in prospettiva un orlo (vita, polsino, fondo gonna) è un'ellisse che avvolge il corpo. In 3D gli edge loop di orli e cinture devono seguire la curva del corpo (vita più bassa dietro che davanti di circa 1-2 cm sui pantaloni, o leggermente inclinata), non un piano orizzontale perfetto.
- **Drappeggio in sintesi:** il tessuto pende da punti di appoggio (spalle, seno, glutei, fianchi). Le pieghe partono da questi punti e si aprono verso il basso a ventaglio; tra un punto di appoggio e l'altro il tessuto è teso e liscio.

### Gaps
- Non ho trovato regole numeriche verificate per orli e cuciture nell'illustrazione di moda (i testi completi non erano accessibili).

## 3. Sartoria e vestibilità: come un capo ben fatto modella il corpo

### Takeaway
La forma "bella" nasce da tre cose. Il capo segue i punti di appoggio del corpo: spalle, vita naturale e punto più largo del fianco. La riduzione di volume avviene con pinces e princess seam. I volumi (svasature, pieghe) partono dal punto più largo, mai sopra. La "pancia finta" viene da arricciature o pieghe in vita, da una cintura nel punto sbagliato o da volume che inizia subito sotto la vita.

### Cited Findings
**Princess seam e pinces (busto, clessidra)**
- Le princess seam sono una variante della pince: vanno dalla vita fino alla spalla o al giro manica come cuciture continue invece che come pieghe. Modellano unendo due pezzi di curvatura diversa — [Wikipedia](https://en.wikipedia.org/wiki/Princess_seams)
- Creano una linea liscia che segue il corpo, possono valorizzare seno o spalle più delle pinces e si possono stringere o allargare per regolare la curvatura — [ASG](https://asg.org/3-steps-to-perfecting-the-princess-line-seam-preview); [Bluprint](https://www.mybluprint.com/article/how-to-sew-princess-seams)
- Le pinces danno una modellatura più sottile delle princess seam; chi trova le pinces "troppo a punta" sceglie le princess seam — [Seamwork](https://www.seamwork.com/magazine/2022/02/whats-so-great-about-princess-seams)
- La princess line valorizza solo se passa per l'apice del seno; altrimenti la curva cade sopra o sotto — [ASG](https://asg.org/3-steps-to-perfecting-the-princess-line-seam-preview)
- Una princess seam che parte dalla spalla aggiunge altezza visiva — [ASG](https://asg.org/3-steps-to-perfecting-the-princess-line-seam-preview)

**V-taper maschile**
- La riduzione di vita di una giacca varia da un contorno leggero a una clessidra marcata; ci sono limiti a quanto si può stringere senza creare altri problemi — [Fibre2Fashion](https://www.fibre2fashion.com/industry-article/1101/getting-the-right-fit-for-mens-suits); [StyleForum](https://styleforum.net/threads/the-tailors-thread-fit-feedback-and-alteration-suggestions.265924/post-11967635)
- La spalla è il punto più critico: se è sbagliata compromette drappeggio e silhouette ed è difficile e costosa da correggere. La giacca deve stare piatta sul petto, senza pieghe o rigonfiamenti — [Fibre2Fashion](https://www.fibre2fashion.com/industry-article/1101/getting-the-right-fit-for-mens-suits)
- Su un fisico già a V, una vita troppo stretta accentua troppo il busto — [StyleForum](https://www.styleforum.net/threads/body-types-and-suit-styles-weigh-in-everyone.12998/post-152722)
- Esempio storico: le giacche di pelle anni '50 avevano spalle larghe e un forte "drop" tra petto e vita, erano corte e scendevano davanti a coprire la cintura — [Fedora Lounge](https://www.thefedoralounge.com/threads/the-fit-of-a-50s-suit-jacket.55157)

**Sedere nei jeans (sprone e tasche)**
- Uno sprone a V profonda fa sembrare il sedere più tondo e pieno; la classica V morbida è giudicata la più lusinghiera. La V va posizionata sulla parte alta del gluteo e il fondo delle tasche posteriori dove gluteo e coscia si incontrano — [Who What Wear](https://www.whowhatwear.com.au/best-jeans-flatter-butt)
- Tasche più alte fanno sembrare il sedere più pieno, tasche basse lo minimizzano. Tasche più distanziate e leggermente inclinate verso l'esterno in basso lo arrotondano. Contano anche vita alta, aderenza sui fianchi e dettagli (cuciture a contrasto, patte) — [Venus](https://blog.venus.com/tips-to-a-good-butt-in-jeans/); [PureWow](https://www.purewow.com/fashion/best-jeans-for-flat-butt)
- Uno sprone "a cuore" con curva più pronunciata e angolo più ripido dà un effetto lifting — riassunto di un sito di product design ([clg.rmportal.net](https://clg.rmportal.net/?p=22223)), fonte debole
- Nota: le fonti sono di styling, non studi misurati, e non concordano del tutto su angolo e distanza delle tasche — [PureWow](https://www.purewow.com/fashion/best-jeans-for-flat-butt)

**Pancia finta in gonne e pantaloni**
- Le gonne arricciate in vita creano volume subito sotto la vita; meglio un taglio ad A o svasato — [The Shapes of Fabric](https://www.theshapesoffabric.com/2019/03/09/discover-how-to-draft-flared-and-pleated-skirts/)
- Pieghe che partono dai fianchi o dall'orlo mantengono liscio il punto vita. Pieghe che partono nel punto sbagliato, troppo poco profonde o in tessuti aderenti evidenziano la pancia. I tessuti più pesanti tengono le pieghe lontane dal corpo — [OGL Move](https://oglmove.com/blogs/style/do-pleated-dresses-hide-belly-fat)
- Le pieghe stirate pendono piatte, a differenza dello sbuffo dell'arricciatura — [Simple Simon & Co](https://www.simplesimonandco.com/2011/07/question-and-answer-time-the-starboard-skirt.html/)
- Mettere la vita della gonna nel punto più stretto del busto e aggiungere linee verticali a una gonna ad A la snellisce ulteriormente — [Petite Dressing](https://blog.petitedressing.com/the-skirts-guide-for-women-with-a-belly/)
- Pantaloni: la vita naturale è all'ombelico o vicino, non sui fianchi, e così le gambe occupano circa 2/3 dell'altezza visibile — [Westwood Hart](https://westwoodhart.com/blogs/westwood-hart/natural-waist-trousers-rise-fit-proportions-men). Per una pancia piena c'è chi consiglia la cintura appena sopra le ossa iliache e sotto l'ombelico, per non stringere il punto più largo — [fmyly](https://en.fmyly.com/article/where-should-your-pants-sit-if-you-have-a-belly/) (fonte debole)
- Il "muffin top" nasce quando la cintura rigida taglia i tessuti molli e li fa debordare, di solito sopra l'osso del fianco — [Westwood Hart](https://westwoodhart.com/blogs/westwood-hart/natural-waist-trousers-rise-fit-proportions-men)
- Prova di vestibilità: con il pantalone chiuso devono entrare 2-3 dita tra cintura e corpo — [Proper Cloth](https://propercloth.com/reference/how-dress-pant-waist-width-should-fit/)

### Inferences (tradotte in regole di modellazione 3D)
- **Uomo, V-taper:** spalla della giacca o della felpa leggermente più larga e squadrata della spalla anatomica (+5-10%). Busto che si stringe in un trapezio verso la vita naturale e orlo della giacca al massimo a metà gluteo. Niente cilindro dritto spalla-fianchi: è proprio quello che produce l'aspetto "sacco". Anche nei capi oversize (hoodie, puffer) il volume va messo in spalle e maniche, e l'orlo va stretto con un polsino o una fascia elastica per riformare la V.
- **Donna, clessidra:** vita marcata (cintura, cucitura, cambio colore o capo corto) nel punto più stretto, cioè circa 2-3 cm sopra l'ombelico. Il volume della gonna parte dal punto più largo del fianco o del gluteo, quindi davanti dalla zona liscia sotto la vita fino ai fianchi niente volume aggiunto. In mesh: un loop di vita chiaramente più stretto di busto e fianchi, e una linea verticale (cucitura dipinta o geometrica tipo princess seam) dal centro spalla all'apice del seno fino alla vita.
- **Anti-pancia:** (1) niente arricciature o pieghe soffici sulla pancia; il davanti dei pantaloni è piatto ("flat front"). (2) La cintura a vita alta (naturale) o a vita media va comunque disegnata stretta e poi piatta sotto, mai "gonfia sotto la cintura". (3) Una gonna ad A si apre dai fianchi, non dalla cintura. (4) In low-poly un loop subito sotto la cintura più largo del loop di vita crea esattamente la pancia finta: va tenuto pari o più stretto, e il volume si apre solo dal loop fianchi in giù. (5) Le normali di quella zona vanno allineate al corpo, così il cel shading non disegna un'ombra a "pancia".
- **Sedere nei jeans:** lo sprone a V scende al centro dietro (circa 4-6 cm più in basso al centro rispetto ai lati, deduzione dalle foto descritte). Le tasche sono alte, il fondo arriva alla piega gluteo/coscia e sono leggermente inclinate verso l'esterno. In mesh bastano un loop di sprone a V e due tasche come rilievo leggero o in texture. Lo sprone va lasciato aderente al gluteo, senza volume piatto tra glutei e cosce; meglio un leggero "undercut" sotto il gluteo.
- **Cintura curva:** la cintura in 3D sale dietro per i pantaloni maschili sartoriali e scende davanti nei jeans a vita bassa. Non deve mai essere un anello orizzontale perfetto, perché il risultato sembra un tubo.

### Gaps
- Non ho trovato valori numerici di "drop" (differenza petto-vita) per le giacche maschili in fonti affidabili.
- Le fonti sul sedere e sulla pancia sono di styling o blog di cucito, non dati misurati; le indicazioni sull'angolo delle tasche sono in parte contraddittorie.

## 4. Tecnica low-poly/3D per vestiti stilizzati

### Takeaway
Le pieghe primarie e i grandi volumi vanno direttamente nella geometria low-poly, con gli edge loop che seguono le pieghe principali. Il corpo sotto i vestiti si cancella o si sostituisce a pezzi. Lo spessore si aggiunge solo dove si vede: orli, polsini e bordi di giacca.

### Cited Findings
- Le pieghe primarie e i contorni strutturali principali vanno modellati nella geometria low-poly; l'high-poly va concentrato su forme primarie e secondarie (pieghe, grinze, cuciture). Target suggerito per personaggi "hero" da primo piano: 10.000-20.000 quad (target della loro pipeline) — [Reallusion Wiki](https://wiki.reallusion.com/Content_Dev:CC_Clothing_Modeling_Guidelines)
- In retopologia per tenere la silhouette i quad seguono le pieghe più grandi. Le pieghe sono state scolpite 2-3 livelli di suddivisione sopra la forma generale: il livello di suddivisione controlla quanto sono nette — [80.lv](https://80.lv/articles/001agt-eureka-sculpting-stylized-cloth-pbr-texturing)
- Le pieghe "bakeate" sembrano sbagliate in movimento perché l'ombra non si aggiorna quando il vestito si deforma. Per questo si sceglie una posa intermedia e la si testa su un range di movimenti — [Polycount](https://polycount.com/discussion/comment/2810205)
- Tenere il corpo intero sotto gli abiti è sconsigliato: è inefficiente e la pelle buca i vestiti durante alcune animazioni. Meglio sostituire interi segmenti del corpo (es. il busto) per outfit modulari. In alternativa si possono trasferire i pesi dalla mesh del corpo al vestito (per capi aderenti), usare shape correttive, maschere alpha o parti del corpo legate all'outfit — [Polycount](https://polycount.com/discussion/comment/2636661/); [Polycount](https://polycount.com/discussion/comment/2636650)
- Nello stilizzato low-poly lo spessore si aggiunge solo dove serve, con un po' di fodera su polsini e orli di cappotto per non far vedere le facce posteriori culled. In alternativa si tiene la mesh spessa nei file sorgente e si cancellano le facce nascoste solo alla fine — [Polycount](https://polycount.com/discussion/comment/2636663); [Polycount](https://polycount.com/discussion/comment/2636739)
- Le chunky sneaker si distinguono per la suola spessa e per l'equilibrio delle curve; i modelli stilizzati hanno suola scolpita oversize, tomaia a strati, linguetta e colletto imbottiti e accenti scuri su punta, linguetta e overlay — [National Standard](https://nationalstandard.fr/en/collections/chunky-sneakers); [Hyper3D](https://hyper3d.ai/3d-models/8cadcaf4-e3d5-44b3-8d29-836e950bda2d); [ASOS](https://www.asos.com/us/asos-design/asos-design-chunky-sneakers-in-neon-orange/prd/200491759)

### Inferences (regole operative proposte)
- **Strati senza compenetrazioni:** ogni strato esterno sta a una distanza fissa da quello sotto (es. maglia a +0,5-1 cm dal corpo, giacca a +1,5-3 cm). Il corpo nascosto va cancellato. Il rig si copia dal corpo con data transfer dei pesi. Lo strato esterno va "smussato" un po' più del sottostante (meno loop) per non ereditare la forma muscolare.
- **Orli spessi e orli impilati:** ogni orlo visibile ha un bordo rivolto verso l'interno e un piccolo bevel (spessore stilizzato circa 1-2% dell'altezza del personaggio, cioè più spesso del reale). Per un look streetwear: orli impilati (felpa più lunga della giacca, maglia più lunga della felpa, 2-4 cm di scalino), polsini arrotolati e jeans "stacked" con 2-3 anelli spessi sopra la scarpa. Gli scalini creano linee orizzontali nette e leggibili al posto delle pieghe.
- **Volumi oversize:** pochi poligoni grandi e spigolosi (stile BRC/JSR), con la sagoma esagerata in 1-2 punti (spalle cadenti e maniche larghe, oppure pantaloni larghi a campana sulla scarpa). Le zone di contatto restano strette (polsi, caviglie, vita) per mantenere l'articolazione leggibile. Il contrasto largo/stretto rende un vestito "dinamico"; il volume uniforme lo rende "goffo".
- **Scarpe chunky:** per lo stile gioco, la scarpa è lunga circa 1,1-1,3 volte la testa del personaggio; la suola è alta circa 1/3-1/2 dell'altezza della scarpa ed è leggermente più larga della tomaia. Una linguetta gonfia sporge sopra i lacci, un collare imbottito avvolge la caviglia e la punta è leggermente rialzata (toe spring). Pochi pezzi grandi: suola, tomaia, linguetta, collare, 1-2 overlay in colore pieno. Queste proporzioni sono una deduzione dagli esempi di JSR, BRC e Splatoon, non valori pubblicati.
- **Normali e shading:** sui vestiti lisci le normali vanno trasferite da una versione liscia/gonfia della mesh, così il cel shading dà grandi campiture pulite. Le pieghe vanno lasciate come hard edge solo se devono generare una linea d'ombra.

### Gaps
- Non ho trovato breakdown pubblici e verificabili (ArtStation/80.lv) su proporzioni o topologia di scarpe chunky stilizzate né su orli impilati: le cifre sopra sono deduzioni.
- Non ho potuto verificare tecniche specifiche di Fortnite (es. guide per creator su skin e layering) o di No Straight Roads.
