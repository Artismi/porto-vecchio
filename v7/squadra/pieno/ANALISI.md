# [pieno] Perché la città «è vuota»: la misura, e lo strato del pieno

## 1. Come si è misurato (Node + un censimento nel gioco vero, nessuna foto)

- `strumenti/pieno_censimento.js`: il gioco vero in Chromium (SwiftShader, `?cittanuova`, la città costruita nel browser, seme fisso),
  la partita cominciata (la storia dei muri dei writer si fa al primo passo, `writer_vita.js:280`), poi il registro del regista
  (`R.__vis3.reg`, `render.js:9019`: porte, vetrine, insegne, serrande, tende, citofoni, applique, pluviali, arredo...), gli oggetti posati
  (`Pavimenti.oggetto`, come `censimento_scena.js`) e i lavori dei writer (`st.wr.works`). Con lo strato acceso anche `Pieno.elenco()`.
- `strumenti/pieno_misura.js`: i 13 percorsi di `W.percorsi` (`percorsi.js:497`, 1.270 m), un campione ogni metro, per ogni 10 m quello che sta
  entro 9 m dall'asse e sotto i 3,5 m sul suolo (quello che la camera alta vede: il suolo e il primo piano delle facciate). **Muro nudo**:
  il primo pieno della griglia a destra e a sinistra (entro 9 m), un punto al metro; nudo se entro 1,2 m e sotto i 3 m non c'è niente
  (luci e bucato non contano).
- Avvertenza sui graffiti: la storia dei muri fa 2.460 lavori, ma alla partenza solo 13 hanno il riquadro sul muro; gli altri si piazzano
  a gioco, vicino alla camera, a budget (`writing.js:2660-2700`: 1 ms a fotogramma sul telefono, al più 120 veli, `writing.js:781`). La
  misura li dà in due modi: «con i lavori» (ogni lavoro conta nel punto dove il writer starebbe: il massimo) e «senza» (solo quelli certi).

## 2. Com'era (base 6379b0b)

| per 10 m di percorso (media dei 13) | |
|---|---|
| muro nudo, senza i lavori non piazzati | **69%** dei punti di facciata (15 tratti di 10 m su 127 senza niente) |
| muro nudo, contando ogni lavoro dove starebbe | 24% |
| tag / throw-up / pezzi (se tutti piazzati) | 7,2 / 2,7 / 0,6 |
| manifesti | **0** (la storia E di questa build non ne fa: `strada_dipinta.js` li prevede, `st.wr.works` non ne ha) |
| adesivi | 1,3 (0,16 certi, sui pali) |
| serrande | 1,9, ma sono **i cassonetti delle botteghe aperte** (`render.js:11160`): nessuna serranda abbassata da dipingere |
| insegne / tende / luci | 0,75 / 0,01 / 2,7 |
| arredo / minuterie a terra | 3,1 / 3,0 (pali, fioriere, bidoni, vasi alle porte) |
| bucato | 0 sui percorsi |
| a terra | quello che dipinge il suolo (`segniList1`, `render.js:10453`: rattoppi, olio, tombini, il gesso solo al centro di piazzette, sagrati, marine) |

I vuoti più lunghi (muro nudo di fila, lato destro): Dal piazzale alle baracche 23 m (1270, 304), Via della Vittoria 14 m (1448, 350),
Rua Maestra 10 m (1387, 312), Dalla marina allo Scalo, Via di Mezzo, Dal Corso alla stazione 6-7 m. Per via, senza lavori: Dal piazzale alle
baracche 88%, Via della Marina 74%, Dalla marina allo Scalo 72%, La calata 72%; i più pieni il Corso (35%) e la Rua (50%).

Le cause, in ordine di peso:
1. **La vernice c'è nei dati ma non sul muro.** I 2.460 lavori aspettano il disegnatore (vicino alla camera, 1 ms a fotogramma): sul telefono
   la città che vedi è quasi pulita, e la vernice arriva (se arriva) dove sei già passato.
2. **Niente carta.** Nessun manifesto della strada nella storia di questa build; i manifesti di `muri1` (`render.js:3191`) solo dove la
   pagina dei segni li vuole, pochi; nessun manifesto funebre, nessun civico.
3. **Le serrande sono tutte alzate**: il segno più hip hop di una via del Sud (la saracinesca taggata o dipinta) non esiste.
4. **Il piede del muro e il marciapiede sono puliti**: niente vernice caduta, macchie, mozziconi davanti al bar, gesso fuori dalle piazzette.
5. **Le piccole storie mancano** davanti alle porte: le botteghe hanno merce dietro il vetro e la tenda, non la cassetta e la sedia fuori.

## 3. Lo strato del pieno (`src/pieno.js`, di serie; `?nopieno` lo spegne)

Una sola tessitura (`assets/pieno/atlante.png` 2048×1024, sul telefono `atlante_tel.png` 1024×512), disegnata una volta coi pennelli del
gioco (`writer_arte.js art`: tag, throw-up, adesivi, manifesti a strati nella tavolozza E; i nomi e le serate di `strada_dipinta.js`) più i
disegni a mano (6 serrande dipinte, funebri, 16 civici di maiolica, colature, vernice a terra, gesso, mozziconi, macchie): 76 celle.
La posa è a regole (zone e ritmo di `strada_dipinta.js`; i moduli di muro pieno del piano terra `b.__win`; il raggio dei graffiti per
l'aderenza; fuori da porte, vetrine, finestre, insegne, grate, murales del regime, tombini; mai in carreggiata) e la fa il gioco a celle di
24 m attorno alla camera (a passi, una faccia per passo, 3 ms a fotogramma sul telefono).

Nella città misurata (1222-1610 × 250-420) lo strato posa **523 cose**: 94 tag, 15 throw-up, 84 grappoli di adesivi, 20 muri di manifesti,
4 funebri, 26 serrande abbassate e dipinte (con guide e cassonetto 3D), 11 civici, 47 colature, 77 vernici a terra, 41 macchie, 19 mozziconi,
30 gessi (12 campane), e 55 piccole storie 3D (6 bar, 6 botteghe con le cassette, 21 negozianti seduti fuori, 14 sedie davanti alle porte
delle case, a volte col secchio e la scopa, 3 officine, 1 angolo dei writer, 4 edicole votive coi lumini e i fiori).

| per 10 m di percorso | prima | dopo |
|---|---|---|
| muro nudo (senza i lavori non piazzati) | 69% | **58%** |
| tratti di 10 m senza niente | 15 / 127 | 9 / 127 |
| cose nuove (decalcomanie a muro e a terra, cose 3D) | - | 2,1 (tag 0,30, adesivi 0,43, manifesti 0,13, serrande 0,05, civici 0,06, colature 0,18, a terra 0,67, cose 3D 0,28) |

Le vie con più botteghe guadagnano di più (Via di Mezzo 3,9 cose nuove ogni 10 m, Dal Forno alla marina 5, la Rua 3,2), il lungomare e il
piazzale delle baracche quasi niente (pochi muri pieni, quasi tutti finestre o grate).

## 4. Il costo (il telefono è legato ai disegni)

- **Due disegni** in tutto, in ogni vista: un InstancedMesh per tutte le decalcomanie (muro e suolo), una Mesh per tutte le cose 3D
  (geometria rifatta quando la camera si sposta di 3 m). Nessun materiale per cosa. Sul computer le cose fanno anche l'ombra (+1 nel
  passaggio delle ombre); sul telefono no. Le misure nel Game Boy sono in `_immagini/squadra/pieno/` (vedi sotto).
- Memoria: l'atlante del telefono 1024×512 (2,8 MB con le mipmap), i vertici delle cose vicine (~9 k).
- Il tempo: la pianta si fa nel budget (3 ms a fotogramma sul telefono); un fotogramma con una faccia lunga può superarlo (una faccia non si
  spezza). Fuori dall'impronta dei tasselli: la città cotta non cambia (`build.py` TASS_FUORI e l'atlante fuori da PV_VER dell'impronta).

## 5. Aperto

- L'aderenza è prudente: due candidati su tre si scartano (zoccoli, grate keepTr, vetri, murales, piani rotti: `__PIENO.scarti`). Più densità
  vuole i pilastrini fra le finestre (0,5 m) e le facce tutte finestre (228 su 636 non hanno un modulo di muro pieno al piano terra).
- I lavori dei writer piazzati dopo possono cadere sopra una serranda o un manifesto (la pianta guarda solo quelli già sul muro e i grandi).
- Il bucato nei vicoli non si posa (i raggi a 4,2 m non trovano due muri a meno di 7 m nei vicoli misurati): da rivedere coi `__PV_FILI`.

## 6. La tavola nel Game Boy (`_immagini/squadra/pieno/prima_dopo.jpg`)

`node strumenti/pieno_tavola.js <cartella>` (la pagina del Game Boy dell'APK, profilo Pixel 7 in verticale, il gioco in /gioco/, seme fisso)
e `python3 strumenti/pieno_tavola.py <cartella> <uscita.jpg>`: quattro viste (stazione, bar sulla Rua, serranda, bottega), la stessa
partita con lo strato spento (`Pieno.imposta(false)`, sopra) e acceso (sotto).

- **Disegni**: lo strato ne aggiunge esattamente 2 (`Pieno.disegni()` = 2 in ogni vista: l'InstancedMesh e la Mesh). Il totale del
  fotogramma misurato (renderer.info sommato su tutti i passaggi) va da +2 a -7: è il rumore delle ombre a fotogrammi alterni del telefono
  (stazione 2301 → 2303, bar 1521 → 1514, serranda 545 → 547, bottega 584 → 586). Il tetto chiesto (+20) è lontano.
- **Quello che si vede**: poco. Con la camera del telefono (alta, in verticale) metà del quadro è selciato vicino al personaggio e i muri si
  vedono di sbieco in alto: nelle quattro viste si leggono i mozziconi e la vernice davanti al bar, le macchie; le serrande dipinte, i
  manifesti e le tag stanno sui muri al bordo del quadro o dietro le pensiline. Nelle viste di prova di fronte al muro (stessa build, pagina
  del telefono senza il guscio) le serrande col throw-up, i manifesti a strati e il negoziante seduto fuori si leggono bene.
- Non verificato a occhio: la notte (le decalcomanie prendono la luce del muro, i lampioni le accendono come il muro), il telefono vero
  (Adreno/Mali: l'atlante e un attributo per istanza in più, niente di nuovo nello shader oltre la uv).

## 7. Prossimi passi (ragionati, in ordine di resa per la camera del telefono)

1. **Il suolo vicino al personaggio** è la superficie più grande del quadro: le storie a terra (gesso, vernice, macchie, mozziconi, cassette)
   anche sui marciapiedi larghi e nelle piazze, non solo al piede del muro; più grandi e più contrastate.
2. **I pilastrini fra le finestre** (0,5 m) per adesivi, foglietti «cerco» e tag verticali: 228 facce su 636 oggi non hanno posto.
3. **Le serrande più spesso dove la camera guarda di fronte** (le testate delle vie, i fondali di `strada_dipinta.js fondaliStrade`).
4. Il bucato nei vicoli (oggi non posa) e l'accordo coi lavori dei writer che si piazzano dopo (ricontrollo alla posa del velo).

---

# Secondo giro (la consegna: «che si legga a colpo d'occhio nel guscio»)

## 8. Perché i graffiti della città non si vedono sul telefono (la misura)

La storia dei muri (`writer_vita.js:280`, con lo stile E `strada_dipinta.js storia`) crea **2.460 lavori** al primo passo della partita,
ma un lavoro si vede solo dopo due passi del disegnatore, tutti vicino alla camera e a budget:
1. il **posto sul muro** (`writing.js:2660-2700` scanNear → `piazzaG` → `placeWallG`, ~27 raggi per lavoro): 1 ms a fotogramma sul
   telefono (2,5 di corsa), al più 120 veli vivi (`writing.js:781`);
2. il **disegno** (`artFor`, il pennello di `writer_arte.js`: 0,1-0,4 s a lavoro misurati in SwiftShader): dalla coda `ARTW.q` uno ogni
   1,2 s (`writing.js` scanNear, `now - ARTW.qT > 1200`).
Alla partenza, senza tasselli, **13 lavori su 2.460** hanno il riquadro; coi tasselli (563 di partenza cotti, il riquadro già trovato) resta
il secondo collo: un disegno ogni 1,2 s, quindi un minuto di gioco per vedere i 50 lavori di una piazza.

**La via presa (economica, senza toccare la cottura né writing.js):** lo strato del pieno, cella per cella attorno alla camera, chiede il
riquadro al gioco stesso (`Writing._.placeWall(w)`: lo stesso posto che avrà il vero, i raggi del gioco) e intanto mostra **la sagoma del
lavoro dall'atlante** (stessa famiglia: tag, throw-up, pezzo, burner, calligrafia, stencil, adesivi, manifesti; la misura del riquadro).
Quando il vero è sul muro (`Writing.GFX.works[id]`) la sagoma si toglie. Nella schermata iniziale e nei primi 4 s dopo la storia la pianta
corre (25-30 ms a fotogramma: il gioco è fermo o appena partito); poi al più un piazzamento ogni tre fotogrammi. I fondali (la corsa
lungo la via fino al muro in fondo) restano al disegnatore.
- Costo misurato (censimento, tutta la città): **2.237 piazzamenti, 26,5 s in tutto, 11,8 ms a piazzamento in media, 252 ms il più lungo**
  (SwiftShader, processore del computer). Riquadri trovati: 1.694 (557 lavori senza muro buono: restano fuori come per il gioco).
- Disegni: zero in più (le sagome sono istanze dell'InstancedMesh dello strato).
- Aperto: sul telefono vero 1 piazzamento ogni 3 fotogrammi a ~12-25 ms è un singhiozzo mentre si entra in zone nuove; il rimedio pulito è
  esporre `placeWallG` (il generatore) da `writing.js` e farlo a passi, ma `writing.js` è nell'impronta dei tasselli (va ricotta): da
  decidere col capo. Oppure cuocere i riquadri di tutti i 2.460 lavori nei tasselli (oggi 563).

## 9. Il suolo come tela, i muri più grandi, le storie

- **A terra** (lungo i 13 percorsi, sulle vie a passo di 3 m, sulla griglia di 5 m delle piazze, col ritmo; mai in carreggiata né sopra un
  pezzo rialzato): pavimenti dipinti (pezzi e throw-up a terra, 2,6-3,6 m), il gesso grande del mare e la campana a tratto pieno, gli stencil
  delle crew, le frecce «JAM» e «MURO», lo spruzzo dei writer, i volantini calpestati, l'olio sugli stalli della sosta. **La scena della
  partenza**: attorno a dove si nasce, a 3-8 m, un pavimento dipinto grande, la campana, i volantini, lo stencil, lo spruzzo, un throw-up.
- **Sul muro**: tutto il piede della facciata fuori da porte, finestre e vetrine (anche i pilastrini e le facce senza moduli pieni: le facce
  senza posto da 228 a 107), pezzi di 2,3-3,1 m, throw-up fino a 2,5 m, serrande fino a 2,6 m e quasi metà dipinte per intero, le tag basse
  sotto i davanzali; quello che lo strato aveva messo dove poi arriva un lavoro se ne va (81 tolti).
- **Le storie**: la Vespa sul cavalletto (bar, angolo dei writer, porte), l'angolo dei writer con le casse e le bombolette, le sedie e le
  cassette; tutto più fitto a 45 m dalla partenza e a 7 m dai percorsi. Il bucato: i raggi ora partono dal mezzo del vicolo, ma i vicoli
  misurati sono quasi tutti più larghi di 7 m o senza muri pieni a 4,2 m (1 filo in tutta la città): resta aperto.
- **L'atlante** 2048×2048 (telefono 1024×1024, 5,6 MB con le mipmap), le decalcomanie con un filo di emissivo (0,28 della loro tela) per
  leggersi nell'ombra viola dello stile.

| per 10 m di percorso (13 percorsi, 1.270 m) | prima | giro 1 | giro 2 |
|---|---|---|---|
| muro nudo (senza i lavori non piazzati) | 69% | 58% | **32%** |
| tratti di 10 m senza niente | 15 | 9 | **1** |
| lavori dei writer visibili (sagome) | 0 | 0 | **8,8** |
| cose nuove dello strato a muro / a terra / 3D | - | 0,9 / 0,7 / 0,3 | 1,9 / 1,5 / 0,3 |

Nella città misurata: 2.450 voci (1.694 sagome di lavori, 756 dello strato). Sul muro: 189 tag, 17 throw-up, 4 pezzi, 93 grappoli di
adesivi, 15 manifesti, 3 funebri, 12 serrande dipinte (col telaio 3D), 46 colature, 11 civici. A terra: 15 pavimenti dipinti, 46 gessi e
campane, 14 gessi grandi, 16 stencil, 17 volantini, 12 spruzzi, 5 frecce, 91 vernici, 63 macchie (15 d'olio sugli stalli), 19 mozziconi.
In 3D: 56 storie (sedie, casse, cassette, Vespe, l'angolo dei writer, i lumini, un bucato).

## 10. La tavola del secondo giro (`_immagini/squadra/pieno/prima_dopo.jpg`: partenza + le stesse quattro viste)

- **Disegni**: lo strato resta a 2 (`Pieno.disegni()`); i totali del fotogramma (partenza 2287 → 2266, stazione 2301 → 2336, bar 1521 → 1524,
  serrande 529 → 533, bottega 581 → 583) ballano di decine per le ombre a fotogrammi alterni, non per lo strato. Tetto chiesto: +20.
- **Si vede**: alla partenza, in primo piano, il pavimento dipinto grande, la campana e il disegno di gesso, lo stencil, un throw-up
  sulla cabina della metro; alla stazione la calligrafia arancio di 3 m sul muro della pensilina; al bar il throw-up «LUPO» sul muro rosa
  e i mozziconi; alle serrande il throw-up rosso «TNT» e le tag sul muro di pietra; alla bottega le tag sul giallo e un pavimento
  dipinto in basso. Si legge a colpo d'occhio dove il quadro inquadra un muro di fronte o il selciato vicino; resta poco dove il quadro è
  carreggiata (le serrande, la bottega: metà del quadro è asfalto, dove lo strato non posa per scelta).
- **Non verificato**: la notte (l'emissivo 0,28 sulle decalcomanie potrebbe farle sembrare accese: da guardare), il telefono vero (il
  singhiozzo dei piazzamenti dei lavori, §8), lo scambio sagoma → lavoro vero quando il disegnatore arriva (il nome scritto cambia: la
  sagoma è della stessa famiglia e misura, non della stessa mano).

---

# Terzo giro: via il singhiozzo (la consegna: «niente placeWall a gioco sul telefono»)

## 11. Cotto nei tasselli, e il resto a passi

- **I lavori dei writer cotti tutti.** La cottura (`strumenti/tassella_pagina.js __tassellaGraffiti`) faceva la storia vecchia (565 lavori
  piazzati); il gioco coi tasselli e lo stile E li diradava e aggiungeva il resto a runtime (`graffiti2.js`: ~1.900 lavori agganciati coi
  raggi mentre si gioca). Ora la cottura fa anche **la storia E intera come nel gioco di serie** (strada_dipinta.js + graffiti2.js, riletto
  acceso nella pagina della cottura, seme fisso, senza writer vivi) e piazza ogni lavoro coi raggi del gioco: `graffiti.json` → `lavoriE`,
  **1.710 lavori col riquadro** (703 senza un muro buono restano fuori). `writer_vita.js` coi tasselli e lo stile E li prende già sul muro
  (`Writing._.cotti`) e salta la storia: zero raggi per i graffiti di partenza. Costo: graffiti.json 3,4 MB (1 MB prima), ~110 s di cottura in
  più. Persa la cosa minore: i lavori non sono più legati ai writer vivi della partita (sono tutti «vecchi», `?nostoriaecotta` com'era).
- **Anche la pianta dello strato cotta.** `__tassellaPieno` (dopo i graffiti) rilegge `pieno.js` acceso e fa la pianta di tutta la città:
  `tasselli/pieno.json`, 78 celle, 676 decalcomanie (matrice 3×4), 36 ricette di cose (le scatole e i cilindri, ricostruiti a gioco senza
  raggi), 96 KB. Coi tasselli lo strato legge quella e non tira un raggio; le sagome dei lavori si leggono dai lavori cotti (per cella).
- **Senza tasselli (il browser): a passi.** `writing.js` espone `placeWallG` (il generatore che già c'era): lo strato lo fa andare 1,5-2 ms a
  fotogramma e cede; la pianta delle facciate cede dopo ogni raggio quando il fotogramma ha speso il suo (3 ms telefono, 5 computer); le mesh per
  i raggi da un indice suo (un giro della scena una volta sola, nella schermata iniziale) invece di `bmbCands` (che rifà il giro intero, 25-45
  ms, se nessuno l'ha chiesto da 6 s); le vie, gli stalli e i vicoli indicizzati per cella una volta (prima tutta la città a ogni cella).
- L'impronta dei tasselli cambia (`781604c34388fbfa`): cotti qui una volta per verificare, da ricuocere prima dell'APK.

**Il fotogramma più lungo dello strato** (`strumenti/pieno_fotogramma.js`: il gioco vero, profilo telefono, si cammina lungo la Rua Maestra a
0,25 m per fotogramma, 794 fotogrammi; SwiftShader, il processore del computer):

| | tick più lungo | tick oltre 4 ms | piazzamenti a gioco |
|---|---|---|---|
| giro 2 (placeWall intero a gioco) | ≥ 252 ms (un piazzamento) | - | 1 ogni 3 fotogrammi, 11,8 ms in media |
| tasselli, lavori cotti, pianta delle facciate a gioco | 27 ms | 147 / 794 | 0 |
| idem, a passi più fini e coi dati delle vie per cella | 21-26 ms | 56-106 / 794 | 0 |
| **tasselli + pianta cotta (l'APK)** | **5,5 ms** | **2 / 794** | **0, nessun raggio** |
| senza tasselli (browser), a passi (Dal Forno alla marina, 201 fotogrammi) | 41 ms | 181 / 201 | 30 (placeWallG a passi, 27 ms l'uno in media) |

Senza tasselli il tetto dello strato è 3 ms di pianta più 2 di lavori a fotogramma, ma un passo solo del generatore del gioco
(`placeWallG`: la griglia di ~27 raggi di `fitWall` sta fra due `yield`) dura fino a ~30 ms, e il primo raggio su una mesh grande costruisce il
suo indice (mesh_bvh, ~20 ms una volta). È il ripiego del browser senza tasselli (l'APK non ci passa); per tenerlo sotto i 5 ms bisogna
spezzare `fitWall` in `writing.js` (un `yield` ogni pochi raggi): aperto.

- **Le pozze**: nei vicoli, sul porto e sul lungomare, con l'emissivo per istanza (`aEmi`): di giorno 0,12, di notte 0,5 (il riflesso del cielo
  e dei lampioni). **La vernice e la carta di notte non si accendono**: il loro emissivo (0,28 di giorno per leggersi nell'ombra) scende a 0
  con la notte (`Render.nightLevel`). Verificato alle 22 nel Game Boy coi tasselli (bar sulla Rua, serrande; prima/dopo nella cartella di
  lavoro, nessuna tavola nuova): le decalcomanie prendono la luce del muro e dei lampioni come il muro, nessuna sembra accesa. Le pozze in quelle
  due viste non ci sono: il loro luccichio di notte non è verificato a occhio.
- Coi tasselli cotti così, nell'APK i lavori dei writer sono già sul muro dalla partenza e il disegnatore del gioco li disegna (alle 22, al bar,
  BIBI, VERA, LIMO ci sono anche con lo strato spento): le sagome dello strato coprono solo l'attesa del disegno.

## 12. I tavolini dei bar (giro 4: «tavolini dei bar molto semplici»)

**Da dove venivano** (città nuova, `tasselli=0`, contati nel gioco):

| fonte | cosa | quanti |
|---|---|---|
| `render.js` buildDetails, «il carattere del locale» (bar, trattorie, osterie) | due tavolini ottagonali di legno su un tubo, due sgabelli rossi a sei lati; fusi nei dettagli della casa | 11 locali, 22 tavolini: **sono quelli che si vedono** |
| `render.js` oggetti35, la roba davanti ai bar | due tavolini di plastica (cilindri), due sedie, bottiglie, sul posto libero di OCC35 | 1-2 in tutta la città (i posti sono già presi) |
| `render.js` dehors del piano di `scena.js` (`Scena.piano().dehors`) | tavolini, fioriere, ombrelloni, lavagna, frigo | 1 bar con tavolini (casa_129) |
| `cafe()` / `table()`, la marina, le piazzette | tavolini coi modelli di arredo3d | solo nella città vecchia (`!SEG1.ok`) |

In più la regola dei bar di oggetti35 (`/bar|.../`) prendeva anche i **barbieri** (casa_79, casa_92): ora `/bar(?!bier)/`.

**Cosa cambia.** render.js delle tre fonti tiene solo la posa (il posto, nel mondo, col giro del lotto; in oggetti35 lo stesso giro del caso,
così la roba dopo non si sposta) e la mette in `window.__pienoBar35`; la cottura dei tasselli la porta in `pieno.json` (`bar`). `pieno.js` ne fa
dehors veri, uno per bar, coi quattro tipi del modulo dei dehors (marmo e ghisa con le sedie bistrot; pieghevoli di lamiera a tinta; plastica
bianca con la tovaglia a quadri e le sedie di filo; legno con la tovaglia e le impagliate), il tipo e i colori dal nome del locale (le trattorie
sempre legno), le cose sul tavolino (tazzina e piattino, zuccheriera, bicchiere con la cannuccia, posacenere, birre, fiasco e pane, il vassoio
del cameriere sul primo), l'ombrellone a spicchi sull'ultimo tavolino (palo nel tavolino, senza base) per metà dei bar, la lavagna e la fioriera
in fondo dove oggetti35 trova posto. Le sedie sono sedili (`Anim.sedileObj`). `?nopienodehors` (o `?nopieno`, `?vecchio`): i tavolini di prima.

**Il costo.** Tutto dentro la geometria delle cose (vertici colorati, lo stesso materiale): **nessun disegno in più**. Disegni per fotogramma
(tutti i passaggi), prima (`?nopienodehors`) / dopo, stessa partita e ora nel Game Boy: bar della piazzetta 808 / 807, trattoria sulla Rua
1558 / 1552, Caffè Lombardi 1480 / 1441, il vicolo dei pieghevoli 366 / 364. Triangoli +5-12 mila vicino a un bar. Vicino (16 m, 12 sul
telefono) il dehors intero, più in là senza le cose sui tavolini e le doghe. Si costruiscono a passi: prima il lontano, uno alla volta finché il
fotogramma ha tempo (1,5 ms sul telefono, 3 sul computer), il vicino quando ci si avvicina; i colori letti una volta, niente ricetta. Misurato
nel gioco (profilo telefono, SwiftShader, macchina carica): entrando nella zona di nove bar un dehors costa al massimo 3,4 ms la prima volta (il
codice ancora freddo), poi 0,6 ms; la parte dei dehors di un rifacimento al massimo 2 ms, il rifacimento intero 3,5 ms. Tutti insieme, prima
del passo, erano 10 ms in un fotogramma. Niente di solido: non si aggiungono ostacoli (`sonda_incastri` non
serve); i tavolini restano dove render.js li posava (a 2 m dal muro, ai lati della porta).

**La tavola**: `_immagini/squadra/pieno/tavolini_prima_dopo.jpg` (due locali, prima e dopo, nel Game Boy e la stessa foto ingrandita).

**Aperto.**
- L'impronta dei tasselli cambia (render.js): finché non si ricuociono, coi tasselli vecchi (senza `bar`) si vedono i tavolini di prima.
- Al Caffè Lombardi (casa_55) prima non si vedeva nessun tavolino, anche se buildDetails li posa: non ho trovato chi li toglieva. Ora ci sono.
- Lo zoom delle viste in `pieno_tavola.js` (nono campo) nel guscio non avvicina la camera: il «da vicino» della tavola è la foto ingrandita.

## 13. A terra di serie solo il discreto (APK 1.10: «i graffiti a terra di serie sono brutti»)

- **Tolti di serie**: i pavimenti dipinti (pezzi e throw-up a terra), gli stencil delle crew, le frecce JAM/MURO, il gesso grande e la
  campana (lungo i percorsi, sotto casa, nelle piazze), lo spruzzo dei writer sotto i pezzi, i volantini (non ho i cassonetti per metterli
  solo lì), e tutta la scena dipinta della partenza. La pianta cotta di prima li perde anche lei (filtro a terra per nome e verso).
- **Restano**, più radi (un terzo lungo percorsi e piazze): i mozziconi (davanti ai bar e qualcuno sui percorsi), la vernice caduta al piede
  dei muri dipinti (piccola: 0,55-0,9 × 0,4 m, a 30 cm dal muro, sotto tag, throw-up e pezzi), le macchie e l'olio (piede dei muri, porto,
  stalli della sosta), le pozze. Poco contrastati: niente emissivo (prendono la luce del selciato come il selciato) e trasparenza
  0,5-0,8 per istanza (`aEmi` 2 + a, nello stesso materiale: nessun disegno in più).
- `?pienoterra`: tutto com'era (nel gioco senza tasselli; con i tasselli cotti di serie i graffiti a terra non sono nella pianta).
- Pedane dei dehors e selciato non toccati. L'impronta dei tasselli cambia: da ricuocere.
