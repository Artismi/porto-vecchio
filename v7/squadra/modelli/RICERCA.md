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

(segue)
