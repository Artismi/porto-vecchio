# Arte — progetto di ricerca e risultati (fase 2)

Dall'analisi (`ANALISI.md`): l'immagine sgrana perché il dettaglio procedurale sotto i 3 px (tratteggio, aria, retino della camera,
fili da 1 px) nasce in una scena a ~1 px per px CSS e viene ingrandito 2-3 volte; è confusa perché molte mani (cinque modelli di luce,
cinque inchiostri, una dozzina di strati nel passo finale) si correggono a vicenda; è «neutra» perché il colore è deciso a valle, pixel
per pixel, sopra una luce PBR quasi realistica. La proposta: il disegno nei materiali e nella geometria (luce a fasce, colori), un
inchiostro solo, il passo finale minimo.

## 1. Il progetto di ricerca

Domande che contano per noi (telefono, WebGL, Three.js, schermo stretto ~0,53, scena interna 360-500 px di larghezza):

1. **Luce a fasce (toon ramp)**: come la fanno i giochi di riferimento (Guilty Gear Xrd, Hi-Fi Rush, Borderlands, Sunset Overdrive,
   Jet Set Radio)? Dove sta la soglia (luce del sole × ombra portata, prima o dopo), quante fasce, come si controlla il «lato in ombra»
   (colore dell'ombra per materiale, non scurimento), come si antialiasa il confine. In Three.js: `MeshToonMaterial`/`gradientMap` contro
   un pezzo di shader proprio in `ShaderChunk` (che vale per tutti i tipi di materiale), costo sul telefono.
2. **Contorni**: scafo rovesciato (inverted hull) a larghezza costante sullo schermo (lo spostamento in clip space), il problema degli
   spigoli vivi (normali lisciate a parte), costo per chiamata; contorni da profondità/normali nel passo finale: soglie, spessore, come non
   fare la scaletta a bassa risoluzione. Cosa fanno Hi-Fi Rush e Guilty Gear (linee interne disegnate nelle trame/UV) e Borderlands (passo
   a schermo).
3. **Il look pulito**: perché Spider-Verse, Hi-Fi Rush, Guilty Gear non «friggono»: niente rumore ad alta frequenza, controllo del dettaglio
   per distanza, colore piatto per regioni, ombre artistiche (normali ritoccate), animazione a passo.
4. **Retino/halftone fatto bene**: a schermo o nel mondo, misura della cella, antialias (`fwidth`), dove usarlo (ombre, cielo, effetti),
   il problema della «porta della doccia» (shower door) quando la camera si muove.
5. **Palette hip hop / graffiti**: come Jet Set Radio e Sunset Overdrive scelgono i colori (saturi, pochi, accenti riservati), il colore
   dell'ombra (viola/blu, non nero), luci e cielo.
6. **I colori nei materiali**: colore piatto + ombra per materiale (tabelle, «shadow color», mappe di tinta d'ombra di Guilty Gear,
   vertex color), invece della correzione a valle.
7. **Telefono e Three.js**: costo di MSAA, risoluzione interna, `discard` e alpha-to-coverage contro dithering, ombre (PCF, aggiornamento),
   come togliere chi copre il personaggio senza retino.

Fonti da cercare: talk GDC (Guilty Gear Xrd di Junya Motomura, Hi-Fi Rush di Tango Gameworks, Borderlands), documentazione Three.js
(`MeshToonMaterial`, `OutlineEffect`, `ShaderChunk`), articoli tecnici (Roystan, Alexander Sannikov, Ben Golus sulle linee, articoli su
halftone in shader), interviste e articoli su Spider-Verse (Sony Pictures Imageworks), Jet Set Radio e Sunset Overdrive (art direction).
Nelle ricerche solo termini generici.

## 2. Cosa ho imparato (con i link)

Nota sulle fonti: le slide dei talk GDC su Hi-Fi Rush e Sunset Overdrive stanno dietro il login di GDC Vault; gli articoli di Ben Golus su
Medium rispondono 403 al lettore automatico. Dove scrivo «dichiarato» la fonte è dello sviluppatore; «ricostruito» è della comunità.

**Luce a fasce: il confine si controlla, non si calcola e basta.**
- Guilty Gear Xrd (talk GDC 2015 di Junya Motomura, [dispensa](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf), sintesi in
  [questo thread](https://polycount.com/discussion/comment/2187341)): la superficie è accesa o no, niente valore intermedio, quindi «la più
  piccola differenza nella normale diventa una macchia» (dichiarato). La cura è il controllo dell'artista: un canale dei vertici sposta la
  soglia (fa da occlusione dipinta), le normali sono ritoccate a mano. Il colore dell'ombra NON è il colore scurito: una tessitura dà il
  colore in ombra di ogni punto (ricostruito, [forum Unreal](https://forums.unrealengine.com/t/guilty-gear-xrd-shader-playground/74763/6)).
  Le linee interne sono disegnate nelle tessiture, non dedotte.
- Hi-Fi Rush ([80.lv](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style),
  [GDC Vault 2024](https://gdcvault.com/play/1034251/3D-Toon-Rendering-in-Hi)): un renderer «toon» completo, personaggi E ambienti, 60 fps
  a risoluzione nativa (dichiarato); luci «toon», ombre statiche cotte, ombre del giocatore con una luce solo d'ombra, il passaggio luce/ombra
  stilizzato (dalla sintesi di [GCORES](https://www.gcores.com/articles/182264), secondaria). La lezione: la luce toon è un SISTEMA unico
  per tutto il mondo, non un filtro a valle.
- Roystan ([tutorial toon](https://click.gamedev.net/tutorials/programming/graphics/toon-shader-using-unity-r5095)): `step` fa il
  confine in un pixel (scaletta), `smoothstep` con una banda stretta lo addolcisce; meglio ancora la banda larga quanto `fwidth` (un pixel
  sullo schermo a ogni distanza: [de Vries, cerchi antialiasati con fwidth](https://rubendv.github.io/posts/fwidth/)).
- Three.js ([MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html)): `gradientMap` con `NearestFilter` obbligatorio;
  funziona, ma vale solo per quel tipo di materiale e il confine è a scatto (alias). Per noi, con 5 tipi di materiale e i tasselli cotti,
  conviene un pezzo di luce proprio in `ShaderChunk` (risolto alla compilazione, entra in tutti i programmi che lo includono).

**Contorni.**
- Scafo rovesciato a larghezza costante: lo spostamento si fa in NDC e si rimoltiplica per `w` in clip space, così sopravvive alla
  divisione prospettica ([nota tecnica](https://19829984.github.io/tech_art/2023/03/02/GeonodeOutline.html),
  [Cesium sui poligoni a schermo](https://cesium.com/blog/2013/04/22/robust-polyline-rendering-with-webgl/): attenzione al piano vicino).
  Gli spigoli vivi bucano la linea: servono normali lisciate a parte ([Seaside](https://seasidestudios.gitbook.io/seaside-studios/3d-shader/outlines)).
- Arc System Works ([Toon Line Control, ASW Academy](https://www.docswell.com/s/ASW_Academy/5LVY67-GG-Toonline-Eng), dichiarato): la
  larghezza dello scafo scala con distanza × tan(FOV/2) (FOV compensato), un canale dei vertici la modula per zona (sottile su capelli e
  dettagli, spessa sui volumi grandi), un secondo set di normali (nel posto delle tangenti, che seguono le ossa) solo per lo scafo.
- Contorno a schermo (Borderlands: rilevamento dei bordi in post, secondo la comunità,
  [Kodeco](https://www.kodeco.com/92-unreal-engine-4-toon-outlines-tutorial)): costo fisso per pixel, larghezza costante, vale per tutta la
  scena; il limite è la risoluzione del bersaglio: a bassa risoluzione fa la scaletta. Per linee larghe e lisce il campo di distanza
  (jump flood, Ben Golus, [The Quest for Very Wide Outlines](https://bgolus.medium.com/the-quest-for-very-wide-outlines-ba82ed442cd9)).

**Pulito = niente alta frequenza non voluta.**
- Spider-Verse ([Foundry](https://www.foundry.com/insights/film-tv/graphic-look-in-comp-spiderman),
  [AWN](https://www.awn.com/print/animationworld/rewriting-visual-rule-book-spider-man-spider-verse)): retino e tratteggio NON sono una
  trama sparsa, sono la luce: strumenti che regolano spessore dei punti e delle righe dall'ombreggiatura, con misura, angolo e passo scelti
  dall'artista. A volte il retino deve seguire il personaggio, altrimenti «nuota attraverso il motivo» (shower door); altrove resta a
  schermo e si legge come luce. Cioè: retino sulle cose che si muovono poco o legato a chi si muove.
- Retino fatto bene in shader: punti su una griglia, raggio dalla luce, bordo antialiasato con `fwidth`
  ([Gustavson](https://itn-web.it.liu.se/~stegu76/webglshadertutorial/shadertutorial.html),
  [Heckel, Shades of Halftone](https://blog.maximeheckel.com/posts/shades-of-halftone/)).

**Palette e coerenza.**
- Sunset Overdrive ([GDC 2015, Jacinda Chew](https://gdcvault.com/play/1022182/Order-from-Chaos-The-Art),
  [CG Channel](https://www.cgchannel.com/?p=66300)): il gioco nasce come un mucchio di idee disparate; ci sono voluti due anni per
  distillarle in uno stile: audace, colorato, luminoso, al servizio del gioco. È il nostro problema esatto (troppe mani).
- Jet Set Radio ([USgamer, 20 anni](https://www.usgamer.net/articles/jet-set-radio-20-year-anniversary-sega-feature-interview),
  [Wikipedia, cel shading](https://en.wikipedia.org/wiki/Cel_shading)): forme esagerate, linee spesse, graffiti + rave + anime; ogni
  banda una sagoma e una tavolozza riconoscibile a velocità.

**Telefono.**
- MSAA sulle GPU a tasselli è quasi gratis a 2× ([Qualcomm/Adreno](https://developer.qualcomm.com/software/snapdragon-profiler/app-notes/anti-aliasing-with-adreno);
  Meta misura +10-15% a 4×: [Meta](https://developers.meta.com/horizon/documentation/native/android/mobile-msaa-analysis/)). Il `discard`
  invece rompe le ottimizzazioni dei tasselli ([discussione Unity](https://discussions.unity.com/t/is-alpha-test-still-the-evil-for-mobile/684417),
  aneddotica): il retino della camera a `discard` costa e sgrana.
- Chi copre il personaggio: i giochi recenti (Baldur's Gate 3, ricostruzioni:
  [80.lv](https://80.lv/articles/artist-recreates-baldur-s-gate-3-s-occlusion-shader-in-godot)) tagliano un cerchio o un cilindro fra la
  camera e il personaggio, proiettato dalla posizione nel mondo del personaggio, col bordo netto; il dithering resta un'opzione meno pulita.

## 3. Come si applica a Porto Vecchio (cosa cambia nella proposta)

1. **Confermato: togliere prima di aggiungere.** Ogni gioco di riferimento ha UN sistema di luce e UN sistema di linee; il nostro passo
   unico con una dozzina di strati è l'opposto. Il Passo 0 dell'analisi resta il primo.
2. **Retino della camera → taglio netto.** Un cilindro fra camera e personaggio col bordo deciso (discard con soglia netta e un filo di
   ombra), non il rumore. Sul telefono si scarta meno (il cilindro, non il 70% sparso).
3. **Luce a fasce: due fasce più il colore dell'ombra per materiale.** Il confine antialiasato con `fwidth` (non `step`, non `gradientMap`
   a scatto); l'ombra portata entra nella stessa soglia (stesso colore della propria); l'ombra è un colore (la tinta del cielo dell'ora e
   un minimo di valore), non lo scurimento. È la risposta a DECISIONI («lato in ombra troppo scuro»). Più avanti: soglia spostata per vertice
   (l'occlusione dipinta di Guilty Gear) sui modelli che contano.
4. **Linee: scafo rovesciato per persone e mezzi** con FOV compensato e larghezza per zona (la tecnica di Arc System Works), alla
   risoluzione MSAA della scena: niente più il bollino a mezza risoluzione. Per il mondo il filo dalla profondità, uno solo.
5. **Retino solo dove si legge come luce**: cielo, fondali lontani, lampi d'azione; legato allo schermo solo dove la camera si muove poco.
   Mai sulle superfici vicine (shower door).
6. **Colori nei materiali**, non nel passo: la tavolozza per tipo di elemento è la mossa di Sunset Overdrive (distillare), non la
   correzione Oklab a valle.
7. **MSAA 2× sempre** sul telefono (quasi gratis sui tasselli), invece di scenderne col regolatore.

## 4. Correzione di rotta (dopo l'indicazione del committente)

Il committente vuole un affinamento conservativo, non una demolizione. Quindi: il tratteggio di serie (d3/d3t), l'«aria», luce3, la
tavolozza di E e il bollino **restano**; gli artefatti si correggono dentro le funzioni. Sostituiti solo i due difetti tecnici (il retino
della camera e la lente che respira), più due correzioni tecniche (i tetti trasparenti nella città costruita nel browser e l'ombra del sole
a fotogrammi alterni). Dettaglio dei commit nel rapporto finale.

## 5. Proposta del Passo 1 (non di serie): la luce a fasce pulita in tutti i materiali

Cosa: i tre toni piatti col bordo largo un pixel (`fwidth`) che lo stile D aveva già scritto nei materiali Standard (`sgP10.z`, render.js,
nel pezzo `lights_physical_pars_fragment`) diventano la luce di tutti i materiali: anche Lambert e Phong (graffiti, cantiere, mezzi, parti
dei modelli), che oggi prendono il coseno liscio. È la lezione di Hi-Fi Rush e Guilty Gear: una luce sola per tutto il mondo, il confine
antialiasato, il colore dell'ombra deciso per materiale.

Come si prova senza cambiare il di serie: dal vivo `__STILE.V.E.u10 = [0, 0, 1, 0]; __pv.R.stile('E')` (solo gli Standard); la tavola di
prova è nel rapporto (`_immagini/squadra/arte/`). Per Lambert e Phong serve una riga per pezzo di three (`lights_lambert_pars_fragment`,
`lights_phong_pars_fragment`) con la stessa rampa, `fwidth` solo in WebGL2 (in WebGL1 una banda fissa).

Rischi: (1) DECISIONI chiede lo spigolo fra le facce meno netto e il lato in ombra meno scuro: i tre toni vanno tarati con un mezzo tono
più alto (.5 invece di .4) e il riempimento del cielo (LUCE2.forma) più pieno, da decidere guardando; (2) luce3 (approvata) ha la sua
forma della luce: le due vanno unite, non sovrapposte; (3) i tasselli cotti portano il testo degli shader con gli `#include`: i pezzi di
three cambiati entrano anche lì, ma l'impronta cambia e i tasselli si ricuociono.

## 6. Ricerca rapida: il prato stilizzato su telefono

- Le carte d'erba stilizzate pulite hanno la **normale in su** (la carta prende la luce come il terreno, niente lato scuro) e
  **ombre finte a gradiente** invece delle ombre portate per pixel ([Ultra Stylized Grass, Fab](https://www.fab.com/listings/b9eeb225-77a8-4541-bf13-ba15dcb04182);
  il difetto delle facce nere sul retro delle carte si toglie con le normali in su: [forum Unreal](https://forums.unrealengine.com/t/is-there-another-way-to-get-stylized-grass/621810.md)).
- Il **guscio** (shell texturing: la superficie ripetuta a strati con i pixel tagliati) dà un prato fitto e basso, bellissimo dall'alto,
  ma costa un passaggio intero sul suolo per strato: sul telefono è il riempimento che manca
  ([j-2k](https://j-2k.github.io/shelltexture), [80.lv](https://80.lv/articles/classic-video-games-trick-for-rendering-grass-fur/)).
- Con three.js: fili istanziati con il colore dalla base alla punta e l'occlusione alla radice
  ([Codrops, «the fluffiest grass»](https://tympanus.net/codrops/2025/02/04/how-to-make-the-fluffiest-grass-with-three-js/)).
- Per Porto Vecchio: niente passaggi in più. Le carte che ci sono (kit Natura e tappeto) con la normale in su e l'ombra letta in un
  punto solo; il disegno del prato nel suolo più deciso; meno ciuffi (variante B, di serie). Il guscio resta un'idea per il computer.
