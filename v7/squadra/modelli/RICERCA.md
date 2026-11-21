# RICERCA — modelli, personaggi, animazioni (esperto modelli 3D)

## 1. Il progetto di ricerca

Punto di partenza: `ANALISI.md` (stessa cartella). I difetti più visibili vengono da come `personaggi.js` costruisce e
mostra le figure (sfaccettatura voluta, cappelli che non limitano i capelli, geometria coperta, scarpe, stampe sgranate,
idle e corsa rigidi, nessun LOD). Le domande che contano per noi, in ordine di peso sulle decisioni:

1. **Leggibilità a 30-60 px.** Come i giochi stilizzati di riferimento (Jet Set Radio, Hi-Fi Rush, Sunset Overdrive,
   Splatoon, Fortnite) scelgono proporzioni (testa/corpo, mani, piedi), silhouette e colori per farsi leggere lontano e
   sul telefono. Quanto ingrandire testa, mani e scarpe senza rompere le animazioni.
2. **Normali e smoothing per il toon.** Flat shading contro normali lisce con spigoli duri; normali ritoccate
   (transfer, normali «sferiche» sul viso come in Guilty Gear Xrd / Hi-Fi Rush); quante bande nella rampa; contorni
   (guscio rovesciato contro linea in post) e il loro costo su mobile.
3. **Strati di vestiti e capelli senza compenetrazioni** nei sistemi procedurali/modulari: nascondere la pelle coperta,
   «capelli sotto il cappello» (varianti compresse o maschere), ordine degli strati, rimozione delle facce coperte.
4. **LOD dei personaggi** su mobile: quanti triangoli per livello, distanze, skinning, impostor, culling delle
   SkinnedMesh in Three.js (bounding sphere, `frustumCulled`).
5. **Atlanti e mipmap**: margine (padding/gutter) fra tessere, `fract()` e cuciture dei derivati, risoluzione delle
   decalcomanie/stampe.
6. **Locomozione**: sincronizzazione delle fasi fra camminata e corsa (sync groups, normalized time), blend in base alla
   velocità, scorrimento dei piedi, idle con peso su una gamba e varianti.
7. **Librerie di animazioni CC0** e retargeting su scheletri Quaternius in Three.js (SkeletonUtils.retargetClip, nomi
   delle ossa, pose di riposo).

**Fonti da cercare**: talk GDC (Arc System Works sul toon di Guilty Gear Xrd, Tango Gameworks su Hi-Fi Rush, Nintendo
su Splatoon, Epic su Fortnite), documentazione e forum Three.js (AnimationMixer, SkinnedMesh, SkeletonUtils), articoli
di technical artist (normali per toon, inverted hull, padding degli atlanti), pagine di Quaternius e di librerie CC0,
documentazione Unreal/Unity sulla sincronizzazione delle clip di locomozione.

Regola: nelle ricerche solo termini generici, nessun dato del progetto.

## 2. Cosa ho imparato

**Leggibilità e proporzioni.** Sulle proporzioni esatte di Splatoon/Fortnite non ho trovato numeri d'autore, solo regole
condivise: la sagoma conta più del dettaglio (il «70% sagoma / 30% dettaglio» è una regola pratica, non una misura), lo
stile «giocattolo» di Fortnite ha teste e arti più grandi, le guide di stile parlano di 4-5 teste per i personaggi più
caricati; la prova si fa in scala di grigi alla distanza vera. Jet Set Radio nasce come fumetto in movimento: poche bande,
contorno, influenze graffiti e anime. Per noi: a 30-60 px decidono testa, cappello, scarpe, pantaloni e colore, non il viso.
- https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent
- https://rocketbrush.com/blog/the-ultimate-character-art-style-guide-for-artists-and-developers
- https://en.wikipedia.org/wiki/Jet_Set_Radio · https://studio.blender.org/blog/sprite-fright-the-illusion-of-simplicity

**Toon, normali, contorni.** Guilty Gear Xrd (GDC 2015, J. Motomura): due toni netti, nessun valore intermedio; le normali
automatiche non danno l'ombra voluta, si ritoccano a mano; i colori per vertice spostano la soglia dell'ombra; contorno a
guscio rovesciato; luce propria del personaggio. Hi-Fi Rush (GDC 2024): un solo renderer toon differito per personaggi e
mondo (coerenza), «toon light» e ombra del viso trattata a parte, 60 fps. Contorno a guscio: con gli spigoli duri le
normali divise strappano il guscio; si spinge il guscio lungo una normale liscia salvata a parte (attributo o colore). Il
flat shading è il contrario di tutto questo: ogni faccetta diventa un salto di banda.
- https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf (non raggiungibile oggi, 503) · https://docswell.com/s/ASW_Academy/5LVY67-GG-Toonline-Eng
- https://gdcvault.com/play/1034330/3D-Toon-Rendering-in-Hi · https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style
- https://forums.unrealengine.com/t/best-way-to-fix-gaps-in-toon-outlines-when-using-inverted-hull-method/1319625

**Strati senza compenetrazioni.** I sistemi modulari non lasciano «pelle sotto i vestiti»: maschere per regione (il capo
dichiara cosa copre e quella parte non si disegna o non si costruisce), livelli fissi (sotto/sopra), restringimento dove
serve. Per i capelli sotto il cappello: il cappello dichiara la zona e i capelli usano una variante compressa o spariscono.
- https://sbox.game/dev/doc/assets/clothing/layering-clothing · https://mod-docs.playinzoi.com/ModKit/project/CAZ/Guide/03.%20Masking%20System.html
- https://forums.unrealengine.com/t/do-video-games-hide-the-player-model-underneath-the-clothing/33335

**LOD e culling.** Guide mobile: 300-1500 triangoli per personaggio quando sono tanti (la demo «Armies» di Android: ~360
triangoli a testa, 210k a fotogramma); soglie di LOD per grandezza a schermo (esempio Simplygon: 3,7k pieno, 2,1k a 60 px,
1k a 30 px); i micro-triangoli lontani sprecano GPU. Three.js: la sfera d'ingombro della SkinnedMesh non segue la posa;
i rimedi indicati dai manutentori sono spegnere il culling o allargare la sfera 1-2 volte, senza ricalcolarla.
- https://developer.android.com/games/optimize/geometry · https://simplygon.com/posts/0179d2c5-a440-49d7-850a-0a9a94152d1b
- https://github.com/mrdoob/three.js/issues/11991 · https://discourse.threejs.org/t/when-do-i-need-to-recompute-the-bounding-sphere-and-bounding-box/81306

**Atlanti e mipmap.** Margine almeno 1-2 px per il filtro lineare, che cresce di 2^n con i livelli di mip; ~4 px con la
compressione a blocchi; in pratica 8-32 px su 1024; i bordi si riempiono ripetendo i pixel del bordo (dilatazione); il
campionamento si tiene dentro la tessera (inset di mezzo texel per livello). Con `fract()` nello shader le derivate saltano
alla cucitura e la GPU sceglie la mip più piccola: riga visibile (si usa `textureGrad` con le derivate dell'uv non
ripiegato, o si limita il livello di mip).
- https://webgl2fundamentals.org/webgl/lessons/webgl-qna-how-to-prevent-texture-bleeding-with-a-texture-atlas.html
- https://discussions.unity.com/t/fundamental-flaw-in-unitys-mip-maps-and-atlased-textures/644618
- https://experienceleague.adobe.com/en/docs/substance-3d-painter/using/technical-support/workflow-issues/export-issues/texture-dilation-or-padding

**Locomozione.** Unreal (sync groups): il ciclo con più peso è il «capo», gli altri ne seguono la lunghezza e la posizione
normalizzata; camminata e corsa devono cominciare sullo stesso piede; con i marcatori di passo si allineano anche cicli con
numeri di passi diversi. Animancer: stessa NormalizedTime fra le clip mescolate. Gears of War 4: tornando in un ciclo si
cerca il fotogramma con la stessa fase del piede, altrimenti i piedi «sbagliano». Lo scivolamento residuo si toglie con
root motion o IK dei piedi. Idle: mai simmetrico; spostamento laterale del bacino verso una gamba con la colonna che
compensa, respiro 1-2 cm, ritmi sfasati fra le persone (la folla non si muove all'unisono), strati additivi a peso basso.
- https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-sync-groups-in-unreal-engine
- https://kybernetik.com.au/animancer/docs/manual/blending/mixers/synchronization
- https://history.siggraph.org/wp-content/uploads/2022/09/2017-Talks-Bollo_High-Performance-Animation-in-Gears-of-War-4.pdf
- https://mocaponline.com/blogs/mocap-news/idle-animation-game-dev-guide

**Librerie e retargeting.** Quaternius Universal Animation Library (marzo 2025): 120+ clip CC0, scheletro umanoide
universale pensato per il retargeting, glTF/FBX/Blend (locomozione in 8 direzioni, jog, sprint, seduti, combattimento,
emote). Three.js ha `SkeletonUtils.retargetClip(target, source, clip, options)`, ma sul forum risulta fragile (pose di
riposo diverse, nomi delle ossa da mappare): conviene ricollegare le clip offline (Blender) sullo scheletro a 62 ossa del
kit, provarle nello studio e salvarle nel glb, non al volo nel browser.
- https://quaternius.com/packs/universalanimationlibrary.html · https://threejs.org/docs/pages/module-SkeletonUtils.html
- https://discourse.threejs.org/t/fixing-skeletonutils-retarget-and-retargetclip-functions/65149

## 3. Come cambia la proposta

1. **Normali lisce subito, flat shading via** (conferma forte: Xrd, Hi-Fi Rush, guide toon). Il contorno a guscio lo
   tengo solo dove serve: per tutti c'è già la linea in post del gioco (lavoro dell'esperto d'arte); se un giorno il
   guscio torna, va spinto lungo una normale liscia a parte.
2. **Cappelli come maschere di regione**: ogni cappello limita lo spessore dei capelli (non solo i sette «nuovi»); quelli
   che coprono il cranio (durag, bandana, fazzoletto, passamontagna) tolgono i capelli. Ciò che è coperto non si costruisce.
3. **Fase sincronizzata alla Unreal/Animancer**: al cambio camminata ↔ corsa la clip nuova parte dalla stessa fase
   normalizzata della vecchia (i due cicli del kit cominciano sullo stesso piede: da verificare nello studio).
4. **Culling con sfera allargata** (rimedio dei manutentori di three.js) al posto di `frustumCulled = false`.
5. **Atlanti**: margine per tessera (dilatazione dei bordi) e campionamento con inset; stampe più grandi sul petto.
6. **LOD per grandezza a schermo**: una figura ridotta (circa 1-2k triangoli) sotto i ~60 px, e niente sotto i ~20 px.
7. **Animazioni nuove** (passo 5): dalla libreria CC0 di Quaternius ricollegata offline, con idle a peso su una gamba e
   ritmi sfasati; nell'attesa, un idle procedurale con il bacino verso una gamba.

## 4. Facce e occhiali (terzo giro: «occhiali, occhi e facce sciocchi, troppo piatti»)

**Cosa li rendeva piatti** (personaggi.js, testa3): l'occhio era un ovale scuro schiacciato (0,25 cm) a filo della faccia con un
quadratino bianco come luce; la «palpebra» era solo un filo d'inchiostro; sopracciglia sottili (4 mm) quasi incollate; naso e zigomi
dello stesso colore della pelle; occhiali con lenti piene e opache (le chiare coprivano l'occhio di bianco), il frontale dritto di
lato davanti alla guancia e le aste come antenne; gli occhiali «da sole» del descrittore con la lente chiara.

**Ricerca (mirata):** negli occhi stilizzati per i giochi la profondità viene da pezzi separati: il bianco, l'iride e il riflesso
come gusci sovrapposti dentro l'orbita, la pupilla mai sopra la superficie, la palpebra di sopra modellata in avanti sopra l'iride
(gamedeveloper.com «The science of eyeballs», 80.lv sugli occhi stilizzati, tutorial di modellazione della palpebra); il riflesso è
la cosa che dà vita, e sta fermo rispetto alla luce. Negli occhiali la montatura ha spessore (bordo davanti e dietro, la scanalatura
della lente), le aste sono pezzi a parte che partono da una cerniera alla tempia e seguono la testa; per i personaggi stilizzati si
semplifica la forma ma si tengono spessore e profilo (guide di modellazione di occhiali e occhiali da sole). Non ho trovato una fonte
d'autore sulla distanza della lente dal viso: l'ho tenuta a 2 mm (6 per le fasce avvolgenti) guardando che le palpebre non la bucassero.
- https://gamedeveloper.com/design/the-science-of-eyeballs-in-y2k
- https://80.lv/articles/see-how-you-can-make-stylized-eyes-using-zbrush-in-this-tutorial
- https://80.lv/articles/here-s-how-you-make-3d-characters-eyes-look-prettier-from-the-sides
- https://www.tripo3d.ai/blog/explore/how-to-make-eyeglasses-3d-model · https://www.tripo3d.ai/blog/explore/how-to-make-sunglasses-3d-model

**Come cambia l'intervento:** occhio a gusci (bianco appena bombato, iride grande e scura, pupilla, riflesso grande e piccolo) con
la palpebra di sopra vera, del colore della pelle in ombra; sopracciglia con spessore sull'arcata; ombre per vertice su orbita, base
del naso e sotto il naso, zigomo in luce (la forma di facce3 non cambia); occhiali con spessore, frontale che gira fino alla tempia,
aste sul cranio, lenti staccate, lenti chiare ridotte a un riflesso (il materiale unico non è trasparente).
