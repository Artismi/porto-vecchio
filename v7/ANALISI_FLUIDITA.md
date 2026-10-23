# Porto Vecchio — Analisi della fluidità (22 ottobre)

Misurato su `main` (8a3b216, città compatta, `?cittanuova`) nel gioco vero, con Chromium senza scheda video (SwiftShader).
Qui il disegno lo fa il processore: i millisecondi assoluti non valgono, **valgono i rapporti** fra una prova e l'altra e i
conteggi (disegni, luci, materiali, oggetti), che sono gli stessi su qualunque macchina.

Strumenti (in `strumenti/`):
- `sonda_peso.js`: conta luci, disegni per ramo e per chi li ha messi in scena, poi spegne una cosa alla volta e misura il fotogramma;
- `sonda_cpu.js`: profilo del processore per funzione e inventario della scena (mesh sciolte, materiali doppioni, triangoli);
- `prova_fluido.js`, a 1280×800 in SwiftShader, non arriva in fondo: un fotogramma costa più di 10 s.

---

## 1. Il quadro in una riga

Il gioco non è lento per una cosa sola: **ogni pixel calcola troppe luci e troppe ombre, e ogni fotogramma manda alla scheda
video troppi pezzi separati**. La logica pesa meno, ma ha dei picchi. In ordine di peso:

| # | Cosa | Quanto pesa (misurato) | Dove |
| --- | --- | --- | --- |
| 1 | **Le ombre dei 12 faretti dei lampioni**, ridisegnate e lette da ogni pixel, anche di giorno a luce spenta | **40-60% del fotogramma** di giorno (Vittoria: da 7,4 a 2,8 s; borgo: da 5,6 a 3,4 s) | `render.js` r. 13966-13975, `updateLights` |
| 2 | **37 luci in ogni shader**, anche se ne sono accese 6 di giorno e 26 di notte | **5-14%** in più solo per le luci spente | `LPOOL/SPOOL/PPOOL`, fari, elicottero, sirena, lampi |
| 3 | **3.000-3.700 disegni per fotogramma** (passaggio principale), più 2.300-2.700 pezzi nell'ombra del sole | il 13-23% del processore va solo a caricare i valori delle luci e delle matrici per ogni disegno | vedi §3 |
| 4 | **21.000 materiali** (2.500 davvero diversi) e **13.000 mesh sciolte** in scena | è la causa del punto 3 | fusione delle case, insegne, bagliori |
| 5 | **Persone da 98-143 pezzi l'una**, sempre disegnate anche fuori campo, tutte nell'ombra | 330-950 disegni nel borgo con 9 persone inquadrate | `vestiario.js`, `pittura.js` |
| 6 | **I raggi dei graffiti** contro tutta la scena | **~40% del processore** sulla Vittoria | `writing.js rayWall/wallRect/placeWall` |
| 7 | **La logica**: 8-9 ms per passo, picchi a 76 ms | mezzo fotogramma a 60 fps, gli scatti | `findPath`, `moveNpc`, `popolo.js`, `animali.js` |
| 8 | L'ombra del sole (2048 px, 73-86 m) ridisegnata **a ogni fotogramma** sul computer | ~7% e 2.300-2.700 pezzi in più | `render.js` r. 15193 (solo il telefono la salta) |
| 9 | La catena del dopo-scena: 8 passate di bagliore, occlusione, post con 18 passi per i raggi di sole e 4×14 di notte | 2-8% qui, di più a piena risoluzione su una scheda integrata | `ambPasses`, `occPass`, `postMat` |
| 10 | Shader nuovi compilati mentre si cammina | 18 in un giro di 8 posti: ognuno è uno scatto | materiali creati al volo |
| 11 | Memoria: heap JS 1,0-1,2 GB, materiali che crescono camminando (+600 in un giro) | rischio di pause del garbage collector e di chiusura sul telefono | |

La notte costa circa il 30% in più del giorno (borgo: 7,3 contro 5,6 s), perché si accendono 26 luci e le loro ombre.

---

## 2. Luci e ombre (punti 1, 2, 8): il peso più grande, la correzione più semplice

**Cosa succede.** Sul computer il gioco crea fino a 12 faretti con ombra da 1024 px (`N = min(12, maxTextures − 7)`), 2 faretti
senza ombra, 19 luci puntiformi, 3 direzionali e il cielo. In three.js **ogni luce presente nella scena entra in ogni shader**, accesa
o no: ogni pixel di ogni muro calcola 37 luci e legge 12 mappe d'ombra (più quella del sole), con il filtro morbido, anche a
mezzogiorno quando l'intensità dei lampioni è zero. In più `updateLights` ridisegna fino a 3 ombre di faretti per fotogramma
appena qualcuno si muove vicino a una lampada, e per farlo ridisegna di nuovo la scena attorno.

**Misura (spegnendo una cosa alla volta, giorno, 15:00):**

| Prova | Vittoria | Borgo |
| --- | --- | --- |
| Gioco com'è | 7.352 ms | 5.561 ms |
| Ombre dei faretti ferme | 4.409 (−40%) | 4.437 (−20%) |
| Faretti senza ombra | 2.824 (−62% dall'inizio) | 3.431 (−38%) |
| Luci spente tolte dagli shader | 2.435 | 2.660 (−52%) |
| Ombra del sole ferma | 1.940 | 2.694 |
| Senza bagliore e raggi | 1.794 | 2.525 |
| Senza persone / senza mezzi | ≈ uguale | ≈ uguale |

**Da fare:**
1. Di giorno le ombre dei faretti non servono: fra l'alba e il tramonto i faretti non fanno ombra e non ridisegnano niente.
2. Al posto delle luci spente nello shader, un **numero fisso e piccolo di luci vere** (per esempio 4 faretti con ombra e 4
   punti) e il resto cotto: la pozza di luce dei lampioni è già cotta (`[inverno30]`). Il numero deve restare fisso, se no ogni
   cambio ricompila gli shader.
3. Fari, elicottero, sirena e lampi degli spari: oggi sono luci vere sempre presenti. Diventano luci del gruppo comune
   (prestate quando servono) oppure finte (un cono, uno sprite e la pozza a terra).
4. L'ombra del sole: aggiornata solo quando la camera si sposta di qualche metro o il sole cambia, con lo scatto a passi di
   texel per non farla tremolare. Le cose che si muovono (persone, mezzi) in una seconda ombra piccola, oppure il sole
   ridisegnato a fotogrammi alterni come sul telefono.

---

## 3. Troppi pezzi separati (punti 3, 4): il peso del processore su una macchina vera

**Cosa succede.** Su una scheda video vera un disegno costa poco alla scheda, ma costa al processore: three.js deve caricare per
ognuno matrici, materiale e i valori delle 37 luci. Nel profilo, il 13-23% del tempo del processore è proprio questo
(`uniform3f`, `uniformMatrix4fv`, `uniformMatrix3fv`). A 3.000-3.700 disegni più le ombre, il fotogramma non sta in 16 ms.

**Da dove vengono i disegni (borgo, di notte, in vista / in tutto):**

| Fonte | In vista | In scena | Nota |
| --- | --- | --- | --- |
| La fusione delle case (`fusione1`, `render.js` r. 239-248) | 948 | 4.584 | un secchio per materiale e per quadrato di 32 m: con 2.500 materiali diversi, i secchi sono migliaia |
| Le sagome d'ombra delle case (r. 256-257) | 734 | 3.588 | una per secchio, invece di una per settore |
| `flushStatic` (r. 290) | 368 | 1.950 | |
| Le facciate delle case del kit (`ownMats`, r. 12938) | 258 | 1.280 | ogni casa coi suoi materiali |
| I tubi al neon e i loro bagliori (r. 11521-11542) | 247 + 44 | 1.247 + 191 | un box e uno sprite per tubo |
| Insegne e fronti di bottega (r. 4595, 8977) | 93 | 462 | |
| Bagliori delle lampade (`glow`, r. 4676) | 65 | 290 | uno sprite per luce |
| Fumi dai camini (r. 13437), un `sMat.clone()` per sbuffo | 25 | 350 | |
| I riflessi a terra (`initRefl`, r. 1848), un materiale per riflesso | 96 | 96 | |
| Le guardie fisse (`models.js` r. 419) | 86+63+44 | | persone intere |

**Da fare:**
1. **Colore nei vertici invece che nel materiale** per muri, intonaci, persiane e tetti: le case diventano una manciata di
   materiali (intonaco, pietra, legno, tegole, vetro…). La fusione allora fa un secchio per materiale *per settore*, non
   per tinta: da ~4.600 a qualche centinaio di mesh, e le sagome d'ombra una per settore.
2. **Una mesh per famiglia di oggetti ripetuti** (tubi al neon, bagliori, sbuffi, riflessi, insegne): istanze o una mesh
   fusa per settore, con un materiale condiviso. Gli sprite dei bagliori diventano un unico `Points` o istanze.
3. Niente `material.clone()` per oggetto quando cambia solo il colore o l'opacità (sbuffi, riflessi, veli): colore per
   istanza o per vertice.
4. Obiettivo: **meno di 800 disegni** nel passaggio principale e **meno di 600** nell'ombra del sole.

---

## 4. Le persone (punto 5)

**Cosa succede.** Ogni persona è fatta di **98-143 pezzi**: corpo, ogni capo, ogni guscio, le stoffe dipinte, gli accessori, ognuno
una `SkinnedMesh` col suo materiale. Tutti hanno `frustumCulled = false` (si disegnano anche fuori campo) e `castShadow = true`
(entrano nell'ombra del sole e in quella di ogni faretto che si aggiorna). Nel borgo, con 9 persone inquadrate, fanno 947
disegni; nell'ombra 641. Il piano leggero chiedeva già **al massimo 8 pezzi a persona** (§4.1).

**Da fare:**
1. Quando la persona ha finito di vestirsi, **fondere tutti i pezzi in una sola `SkinnedMesh`** (stesso scheletro) con un
   materiale per tipo (pelle, stoffa, cuoio, metallo) e le stoffe dipinte in un unico atlante per persona: da ~110 a 3-6 disegni.
2. Il riquadro di visibilità dato dallo scheletro (allargato di un metro) e `frustumCulled` di nuovo acceso: chi è fuori
   campo non si disegna.
3. Ombra: oltre i 25-30 m una macchia a terra invece della sagoma vera; nelle ombre dei faretti solo chi è nel loro raggio.
4. Lontano (oltre 40 m): il corpo senza capi o un pupazzo semplice con gli stessi colori.

---

## 5. I graffiti (punto 6): il primo peso del processore sulla Vittoria

**Cosa succede.** Per appoggiare un lavoro al muro, `placeWall` lancia un raggio e `wallRect` ne lancia fino a 27 (9 raggi × 3
misure) contro `bmbCands`: tutte le mesh visibili entro 10 m. Le mesh piccole (sotto 900 indici) non hanno l'indice veloce
(`render.js` r. 13874-13887, `fast`) e vengono provate triangolo per triangolo. Chi fallisce riprova fino a 3 volte. `bmbCands`
attraversa ogni 2 s l'intera scena (47.000 oggetti). Sulla Vittoria i raggi sono il **99% del tempo di `raycast`** e circa il
40% del tempo del processore.

**Da fare:**
1. Il posto di ogni graffito si calcola **una volta sola** e si salva (`w.gfxRect` nello stato e nel salvataggio), o si
   prepara durante la costruzione della città: dopo, nessun raggio.
2. I raggi solo contro le mesh fuse dell'edificio della casella (una griglia degli edifici), non contro la scena.
3. `bmbCands` dalla griglia degli edifici invece che dall'intera scena.

---

## 6. La logica (punto 7)

**Misura.** `G.step` nel browser: **8-9 ms di mediana**, p95 9,6 ms sulla Vittoria e **76 ms nel borgo** (scatti). Nel profilo
del passo, chi pesa di più (tempo totale, figli inclusi): `moveNpc` 26%, `nearMove`/`hookMove` di `popolo.js` 19-22%, **`findPath`
17%**, `updateTraffic` 7%, `animali.js` 8-10% di tempo proprio, `vievive.js` 6-8%, `commissioni.js` fino al 6%. Ogni passo
attraversa una catena di circa 25 agganci (`HOOKS.step` di cantiere, regia, vievive, writing, writer_vita, eventi, animali, tetti,
scontri, ordine, sottosuolo, livelli, graffiti, creatività, trame, commissioni, convivenza, imprese…), uno dentro l'altro.

**Da fare:**
1. **I percorsi a rate**: `findPath` con un tetto di nodi per passo, e chi aspetta il percorso intanto sta fermo o va dritto.
   È la causa più probabile dei picchi da 76 ms.
2. **Il calendario unico** (già nel piano, `HANDOFF_fluido2.md` punto 4): i moduli che non devono girare a ogni fotogramma
   (commissioni, imprese, trame, convivenza, creatività, fazioni, scambi, cassaforti…) a 2-4 volte al secondo, scaglionati.
3. Gli animali e la gente lontana dalla bolla a frequenza ridotta.
4. Obiettivo: ≤ 4 ms per passo e nessun passo oltre i 12 ms.

---

## 7. Il resto

- **Dopo-scena** (punto 9): sul computer 8 passate di bagliore a ½, ¼ e ⅛, l'occlusione a metà risoluzione e un post enorme con
  18 passi per i raggi del sole e, di notte, 4 faretti × 14 passi di nebbia luminosa. Qui pesa poco perché la finestra di prova
  è piccola; a 1920×1080 su una scheda integrata pesa molto di più. Da fare: bagliore a ¼ con 4 passate, raggi del sole a ¼ della
  risoluzione (o spenti con il cielo coperto e di notte), nebbia dei faretti solo per i 2 più vicini.
- **Shader compilati in gioco** (punto 10): 18 nuovi in un giro di 8 posti (Lambert e Standard delle insegne e delle botteghe,
  `MeshDepthMaterial` delle ombre). Da fare: aggiungerli alla compilazione dell'avvio, che c'è già.
- **Memoria** (punto 11): 1,0-1,2 GB di heap, 3.100-6.200 geometrie, 430-1.000 texture; +600 materiali in un giro. Da fare:
  liberare materiali e texture di chi esce dalla bolla dopo il riciclo (`PEOPLE_KEEP`), e i doppioni del punto 3.
- **Cicli e timer**: 12 cicli `requestAnimationFrame` separati e 8 `setInterval` di interfaccia (200-400 ms). Pesano poco, ma
  vanno nel calendario unico.
- **Caricamento**: `index.html` è di 8,5 MB e qui il gioco è pronto in 60-95 s. Non è fluidità, ma il piano leggero (§2) resta valido.

---

## 8. Ordine di lavoro proposto

Ogni passo si misura con `sonda_peso.js` prima e dopo, e si guarda in foto che l'immagine non cambi (giorno e notte).

| Passo | Contenuto | Guadagno atteso | Rischio per l'immagine |
| --- | --- | --- | --- |
| **1** | Luci: faretti senza ombra di giorno, gruppo fisso piccolo (4 + 4), fari, elicottero e lampi nel gruppo comune; ombra del sole a richiesta | **−50% del fotogramma di giorno**, −30% di notte | basso: di giorno non cambia niente, di notte meno ombre di lampioni lontani |
| **2** | Graffiti: posto calcolato una volta, raggi solo contro l'edificio | −40% del processore sulla Vittoria, niente scatti vicino ai muri dipinti | nessuno |
| **3** | Persone fuse in 3-6 pezzi, campo visivo, ombra semplice lontano | −700/−900 disegni nelle vie affollate | medio: va controllato che vestiti e stoffe restino identici |
| **4** | Case a colori nei vertici, fusione per settore, sagome d'ombra per settore; neon, bagliori, sbuffi e riflessi in istanze | da ~3.300 a < 1.000 disegni | medio: le tinte delle case devono restare quelle |
| **5** | Logica: percorsi a rate, calendario unico, animali a frequenza ridotta | da 8-9 a ≤ 4 ms, niente picchi | basso |
| **6** | Dopo-scena più leggero, shader all'avvio, memoria | fluidità su scheda integrata e telefono | basso |

I passi 1 e 2 sono piccoli e da soli dovrebbero già cambiare molto. Il 3 e il 4 sono i lavori grossi che portano i disegni a
una misura da 60 fps.

**Da fare subito dopo**: una misura sul computer vero con `?perf` (F3), per avere i fotogrammi al secondo reali prima e dopo il passo 1.

---

## 9. Avanzamento (23 ottobre) — solo correzioni a parità d'immagine

Regola: ogni correzione deve dare la stessa immagine. Le prove: `strumenti/sonda_uguale.js` (scena ferma disegnata due volte e
confrontata pixel per pixel, e raggi dei graffiti contro il metodo lento puro) e `strumenti/sonda_vesti.js` (le stesse persone
vestite con e senza le unioni).

| Correzione | Dove | Verifica | Effetto misurato |
| --- | --- | --- | --- |
| I raggi veloci si riadattano (refit) quando una mesh cambia, invece di tornare per sempre al metodo lento | `render.js` `fast` | 200/200 raggi uguali al metodo lento | **raggi dei graffiti 58× più svelti** (31,8 → 0,55 s per 200); prima una mesh di 167.000 triangoli era provata intera a ogni raggio |
| Solo le mesh che il tratto di raggio può toccare | `writing.js` `segList` | come sopra | (dentro il 58×) |
| Ricerca dei percorsi con il mucchio in array tipizzati | `game.js` `findPath` | 1.500/1.500 percorsi uguali | 1,7× più svelta, niente spazzatura per il raccoglitore |
| Tubi luminosi di una bottega in una mesh sola | `render.js` | stessi triangoli e materiale | ~1.250 → ~250 mesh |
| Aloni e pozze di luce a opacità zero non disegnati (fuori dai livelli della camera) | `render.js` | si sommano: a zero non aggiungono niente | di giorno ~200-300 disegni in meno |
| Pezzi degli accessori uniti per materiale; capi in tinta unita in una mesh sola con la tavolozza | `sartoria.js` `fondi`, `vestiario.js` `pelle`, `tavolozza` | 7/7 persone ripetibili identiche | pezzi delle persone da 1.248 a 1.011 (−19%) |
| L'ombra dei lampioni fiochi (sotto il 30%) non si ridisegna a ogni passante, solo due volte al secondo | `render.js` `updateLights` | di giorno i lampioni «sempre accesi» stanno al 6% | si vede solo a 60 fps veri (qui un fotogramma dura 4-5 s) |

**Prima e dopo** (`main` contro questo ramo, stessa sonda, stessi posti e ore, 3 giri, mediane; SwiftShader 480×300):

| Posto | Disegni prima → dopo | Fotogramma prima → dopo |
| --- | --- | --- |
| Borgo, 15:00 | 2.537 → 2.296 (−9%) | 5.501 → 5.397 ms (−2%) |
| Borgo, 22:00 | 3.307 → 2.951 (−11%) | 5.177 → 5.046 ms (−3%) |
| Vittoria, 15:00 | 1.833 → 1.680 (−8%) | 3.990 → 3.980 ms (0%) |
| Vittoria, 22:00 | 2.502 → 2.183 (−13%) | 4.210 → 4.214 ms (0%) |

Senza scheda video il fotogramma dipende dai pixel, non dai disegni: qui il guadagno dei disegni non si vede, su un computer vero sì
(ogni disegno costa al processore). Va misurato con F3 (`?cittanuova&perf`).

**Provato e lasciato spento:**
- *Saltare le luci spente nello shader* (`?lucispente`): stessa immagine al bit, ma in SwiftShader la scena costa di più
  (3.920-4.190 contro 3.460-3.790 ms), anche nella variante col solo salto uniforme. Su una scheda video vera dovrebbe rendere:
  da provare con F3, `?cittanuova&perf` contro `?cittanuova&perf&lucispente`.
- *Settore della fusione a 48 o 64 m*: −9/−12% di disegni ma +3/+47% di triangoli. Resta 32 m.
- *Unire le sagome d'ombra delle case per settore*: inutile, vedi sotto.

**Trovato: le case fuse non fanno ombra sul selciato.** La fusione (`fusione1`) toglie l'ombra alle mesh fuse e la affida a
3.588 sagome sul livello 1, che le camere delle ombre vedono. Ma three r149 sceglie chi fa ombra guardando i livelli della camera
**principale** (`renderObject(oggetto, cameraPrincipale, cameraOmbra…)`), che vede solo il livello 0: le sagome non entrano in
nessuna ombra. Con le sagome nell'ombra il 14% dei pixel del borgo diventa più scuro (strade e piazze all'ombra delle case).
Rimetterle cambia l'aspetto che si conosce: è una scelta da fare guardando le foto. Se si rimettono, unirle per settore
(provato: stessa mappa d'ombra) le rende quasi gratis.

**Restano (cambiano l'immagine o servono misure su una scheda video vera):** le ombre dei 12 faretti lette da ogni pixel, le
37 luci negli shader, l'ombra del sole a ogni fotogramma, il dopo-scena a piena risoluzione, i materiali delle case (atlanti),
il modello di base delle persone (corpo e testa a più materiali).
