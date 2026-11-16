# Animare azioni che nessuno ha animato: gesto generico, oggetto in mano, IK, e il fumetto al posto del movimento

> Etichette: **[letto]**, **[estratto]**, **[non verificato]**.
> Il problema: se il catalogo dei verbi è aperto (sostituzioni, usi fuori catalogo, progetti), il numero di coppie *verbo × oggetto* esplode e nessuno le animerà tutte. Serve un ripiego che sia **bello nel registro graffiti-fumetto**, non un ripiego che sembri un baco.

---

## 1. Quello che c'è già nel codice

- `animazioni.js` piega le ossa verso una posa nello spazio del personaggio, a strati che si fondono, con respiro, sguardo, dita; `anim_vita.js` ha **circa 40 pose con attrezzi** (siede, dorme, beve, fuma, telefona, legge, scava, zappa, **martella**, forza, spazza, pesca, prega, balla, attacchina, bomboletta, foto, carte, carriola…); `anim_lotta.js` le pose di lotta e degli stati — `v7/src/HANDOFF_animazioni.md`.
- `anim_mano.js`: «chiunque può impugnare un oggetto dell'inventario» (`n.hand = id` per l'abitante, `p.hand = id` per il giocatore); il modello in mano viene da `Roba3D.inHand` o `Oggetti3D.inHand`, attaccato all'osso del polso. Le gambe hanno già un IK a due ossa vero (`anim_vita.js`).
- Quindi **due terzi del ripiego esistono**: una posa generica per famiglia di gesto e un oggetto qualunque in mano. Manca la tabella che mappa ogni verbo nuovo su una famiglia, e lo strato "fumetto".

## 2. Reperti

### F.E.A.R.: un'IA fa solo due cose
- «Tutto quello che fanno le IA è muoversi e suonare animazioni»; la smart object dichiara quale animazione — [Orkin, GDC 2006](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf) **[letto]**
- **Conseguenza**: ogni verbo del registro dichiara `{ gesto, presa, ritmo, durata }` e il corpo non sa altro.

### Spore: animazione indipendente dal corpo
- I dati d'animazione sono salvati in forma indipendente dalla morfologia; a runtime diventano obiettivi di posa per un risolutore IK robusto; gli animatori lavorano con il flusso tradizionale e **annotano la semantica** delle parti dell'animazione. Gli autori: ci vogliono settimane per capire quali movimenti si generalizzano — [Hecker et al., SIGGRAPH 2008, *Real-time Motion Retargeting to Highly Varied User-Created Morphologies*](https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies) **[estratto]**; [critica su paperdecoder](https://paperdecoder.blogspot.com/2008/07/real-time-motion-retargeting-to-highly.html) **[estratto]**
- **Cosa rubiamo**: il gesto generico è scritto **rispetto all'oggetto** ("la mano va al punto di presa, poi alla superficie bersaglio, tre volte") e non rispetto allo scheletro. Così vale per il martello, la padella, la scarpa.

### Overgrowth: poche pose chiave e molta interpolazione
- GDC 2014, Animation Bootcamp: tecniche procedurali semplici con pochissimi keyframe; molto di Overgrowth è controllato da pose chiave fuse proceduralmente — [GDC Vault 1020049](https://gdcvault.com/play/1020049/Animation-Bootcamp-An-Indie-Approach) **[estratto]**; [Game Developer, video](https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation) **[estratto]**
- **Cosa rubiamo**: per un gesto generico bastano **due pose** (carica e colpo, o presa e rilascio) e una curva di ritmo. `anim_gesti.js` usa già "sale nel primo 20%, resta, scende nell'ultimo 25%".

### Rain World: il corpo fisico minimo
- Le creature sono punti uniti a distanze fisse e si muovono proceduralmente; la fisica guida il movimento — [Game Developer](https://gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-) **[letto]**; il talk GDC 2016 di Jakobsson e Therrien sull'animazione — [Game Developer, video](https://gamedeveloper.com/art/video-animating-i-rain-world-i-and-its-many-squishy-stretchy-creatures) **[estratto]**
- **Cosa rubiamo**: il trasporto di oggetti grandi (la porta, la trave) come due punti collegati alle mani di uno o due portatori. Niente animazione dedicata: la trave dondola da sola.

### three.js: IK pronto
- `CCDIKSolver` (in `three/addons/animation/`) risolve catene IK con CCD su `SkinnedMesh`, anche generiche; esiste anche una libreria con CCD, FABRIK e vincoli — [three.js docs, CCDIKSolver](https://threejs.org/docs/pages/CCDIKSolver.html) **[estratto]**; [discourse, generic SkinnedMesh](https://discourse.threejs.org/t/example-of-how-to-use-ccdiksolver-with-a-generic-skinnedmesh/9571) **[estratto]**; [upf-gti/ik-threejs](https://awesome.ecosyste.ms/projects/github.com%2Fupf-gti%2Fik-threejs) **[estratto]**
- **Nota**: il codice ha già un IK a due ossa fatto a mano per le gambe; per il braccio un due-ossa analitico costa meno di un CCD iterativo ed è sufficiente (spalla-gomito-polso). **[stima]**

### Fumetto: segni di movimento invece di movimento
- *Spider-Verse*: niente motion blur, linee di velocità disegnate e linee che si staccano dalla forma; smear e linee d'inchiostro funzionano per **uno, al massimo due fotogrammi**, oltre distraggono; animazione "a passo due" che dà un'aria da stop-motion; onomatopee in lettering forte — [VFX Voice](https://vfxvoice.com/?p=5908138) **[estratto]**; [Creative Bloq](https://creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look) **[estratto]**
- *Hi-Fi Rush*: personaggi e sfondi animati a frequenze ridotte; nuvolette d'azione, punti esclamativi frastagliati e lettering al posto dei numeri del danno — [CGMagazine](https://www.cgmagonline.com/articles/comic-book-aesthetics-gaming/) **[estratto, fonte generica]**
- *HAWKED*: effetto "flash" da fumetto come mezzo principale dello stile — [Game Developer](https://gamedeveloper.com/art/how-to-create-comic-book-style-vfx-for-games-like-in-hawked) **[estratto]**
- **Cosa rubiamo**: il "fumetto d'azione" come **terzo livello del ripiego**. È coerente con il look graffiti-fumetto, costa uno sprite e un suono, e nasconde la mancanza di animazione. Il limite di Spider-Verse (1-2 fotogrammi di smear) va rispettato: il segno dura poco, l'onomatopea un po' di più.

## 3. Proposta: quattro livelli di resa, scelti per verbo e per distanza

| livello | quando | cosa si vede | costo |
|---|---|---|---|
| **A. posa dedicata** | il verbo ha una posa in `anim_vita.js` (martella, scava, spazza, pesca…) | la posa vera con l'oggetto in mano | già pagato |
| **B. gesto generico + presa** | verbo nuovo o sostituto ("pianta con la padella") | una delle ~10 famiglie di gesto (*battere, strofinare, girare, versare, sollevare, spingere/tirare, porgere, infilare, legare, stendere*), due pose chiave + ritmo, la mano portata dall'IK a due ossa al punto di presa dell'oggetto, il bersaglio (chiodo, muro, nodo) come obiettivo della seconda posa | qualche µs per osso per frame, solo entro ~25 m |
| **C. fumetto d'azione** | sempre sopra B quando il verbo dichiara `onomatopea`; da solo tra ~25 e ~60 m o se B non ha famiglia | linee di movimento (1-2 fotogrammi), una nuvoletta con l'onomatopea (TOC TOC, SBAM, ZAC, FRRR, SPLOTCH, CRIC), uno sbuffo di polvere o trucioli, il suono | uno sprite in un atlante, nessun osso |
| **D. niente** | oltre la vista o fuori schermo | solo l'esito quando si torna (la mensola appesa, la panchina rotta) | zero |

Regole di gusto:
- **Il fumetto è un segno, non una scusa**: l'onomatopea è sempre italiana e specifica dell'oggetto (la padella fa *DENG*, il martello *TOC*, la scarpa *PLOF*), così la sostituzione si legge e fa ridere. Il lessico delle onomatopee è un dato del registro, scritto a mano (100-200 voci), con varianti per materiale (metallo, legno, carne, vetro, stoffa).
- **La nuvoletta è anche memoria**: lo stesso glifo torna nella gazzetta e nel diario ("il DENG di ieri in via del Forno"), cioè l'onomatopea è un *token* per il pettegolezzo (strato 5) e per la cronaca (strato 8).
- **Il fallimento si vede di più del successo**: il ponte storto, il chiodo piegato (*TOC… tic*), l'asse che cade (*CRAC*). Un fallimento leggibile non sembra un baco.
- **Fuori dal giocatore niente IK**: tra 25 e 60 m solo C, sopra la posa di base "lavora" già esistente.
- **Nessun verbo senza resa**: il registro rifiuta (test automatico) un verbo che non dichiara almeno una famiglia di gesto o un'onomatopea.
