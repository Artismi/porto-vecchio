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

_(in corso)_

## 3. Come si applica a Porto Vecchio

_(in corso)_
