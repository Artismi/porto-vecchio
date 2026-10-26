# Porto Vecchio — Graffiti col pennello dello Studio (7 ottobre)

I graffiti si fanno col pennello dello Studio (lo strumento «Colore» di editor.js, ramo charming-gates): si dipinge
davvero sulla texture della superficie colpita, con la misura bloccata da bomboletta (fra 2,5 e 9 cm). Niente riquadri
appiccicati: la vernice entra nella facciata. Righe `[graffiti]` e `[bombolette1]`.

## Gli abitanti: decide l'IA (graffiti.js)
- Chi parte per dipingere (commissione `passo` per una scritta, `murale` per un'opera) prepara subito il disegno: uno
  locale (scritta in stampatello a tratti + un simbolo che dice chi è: l'onda della Risacca, il Garante con le orecchie
  d'asino, la barca del pescatore, un cuore, una stella…) e intanto chiede all'IA (`/api/mente`, kind `graffito`) cosa
  dipingerebbe quella persona, col suo carattere, umore, ricordi, interessi, odio per il regime. Se l'IA risponde prima che
  arrivi al muro, si dipinge quello dell'IA (testo + tratti liberi in metri sul muro).
- Arrivato al muro, il graffito entra in `st.pop.walls` con i tratti (`strokes`: u lungo il muro, v in altezza, colore,
  spessore). Se il giocatore è vicino lo vede crescere tratto dopo tratto mentre la persona spruzza; se no compare intero.
  Alla fine `paintWall` (popolo.js) lo completa (evento, testimoni, reazioni) invece di farne un altro.
- Se il regime cancella il muro, la facciata torna com'era (gomma dalla copia della texture prima del primo spruzzo).
  Se il quartiere viene ridisegnato, il graffito si ridipinge.

## Il giocatore: la bomboletta (main.js)
- La bomboletta (ferramenta, officina) si impugna dalle Tasche come gli altri attrezzi. In mano, il tasto sinistro tenuto
  premuto spruzza sulla superficie sotto il puntatore, entro 2,6 m (non si cammina col clic). Rotella: colore (rosso, nero, bianco, blu, giallo, verde, rosa, arancio).
- Una bomboletta dura circa un minuto di spruzzo. Chi ti vede dipingere lo sa (evento `vandalismo`).

## Pezzi
- `src/graffiti.js`: font a tratti, simboli, disegno locale, richiesta all'IA, muro in corso.
- `strumenti_inverno/bombolette1.py` (dopo trame1.py): in render.js porta `surfaceAt`/`dab` dello Studio
  (bmbHit, bmbDab), dipinge i tratti dei muri (bmbPass), `R.spray` per il giocatore; i muri con i tratti non hanno più
  il riquadro di muri_gente2.
- `server.js` kind `graffito` (canale eventi); `api/_mente.js` rigenerato.
- Non toccati: casa, scavi, baracche, mobili (progettati altrove).

## Avvicinamento e gesto (aggiunto)
- Chi dipinge va fino al muro scelto partendo (`E.spot`, non dove si è fermato arrivando nel posto), a mezzo metro (la
  grafica misura dov'è davvero il muro: `w.__wallD`), si gira, e solo allora comincia a spruzzare; mentre dipinge si
  sposta di lato seguendo la scritta (`w.__tipU`). La commissione cominciata non viene interrotta dal blocco dopo.
- La posa «vernicia» porta la mano sul punto dove va la vernice (`w.__tip` / `player.__tip`), gli occhi sul tratto.
- Il giocatore spruzza a portata di braccio (1,2 m); un muro più lontano (entro 9 m): ci si cammina davanti e poi si spruzza.

## Il distributore (distributore1.py)
Era una scatola bianca: pensilina, pompe e totem avevano le coordinate della vecchia mappa. Rifatto attorno all'edificio vero.

## Graffiti 2 (19 ottobre): i muri dipinti fin da subito, la tavoletta completa
**Perché all'avvio non si vedeva niente.** La storia dei muri c'era (`writer_vita.js history`: ~740 lavori in `st.wr.works`,
non dipende dal numero di abitanti: bastano i writer, 9 su 207), ma la grafica li costruiva a goccia: un lavoro per giro di
150 ms, solo quando il budget `BUD` (`window.Costruzioni`) dava il turno ai graffiti (uno ogni 4 fotogrammi) e poi
aspettando il disegnatore a parte. Su una macchina lenta (o senza scheda video: 0,3 fotogrammi al secondo senza testa) dopo
15 s c'era un lavoro in coda e nessuno sul muro, e se il worker non rispondeva non arrivava mai niente.
- `writing.js scanNear` (fuori da `frame`): **di corsa** all'avvio, dopo un salto della camera di più di 60 m e quando entro
  40 m ci sono meno di 12 lavori dipinti: 30 ms per giro, senza aspettare il turno del budget, fino a 24 disegni in coda al
  worker (di regola 6 ms, col turno, 8 in coda). `scanNear(st, x, y, { force: true, ms })` per le prove.
- `artFor`: se il worker non risponde in 4 s il disegno si fa nel gioco (in coda, uno per giro); se non ha mai risposto e ne ha
  persi 3, si spegne (`[Writing] il disegnatore a parte non risponde`).
- I veli nuovi si disegnano subito (`drawUpTo` appena fatti).

**La tavoletta (tasto 7, o B fino a «tavoletta»).** Si tiene premuto su un muro entro 14 m (più in là: «avvicinati») e si
trascina la finestra gialla; lasciando, la foto dritta del muro si apre nel pannello: in cima dove sei, la misura e che
lavoro diventa (tag, throw-up, pezzo; col pennarello tag a marker), quante bombolette hai; gli otto colori in vista (anche
tasti 1-8), spessore, «Annulla tratto» (Ctrl+Z), «Pulisci», «Salva sul muro» (Invio), «Esci» (Esc). Senza bombolette (o
pennarello) non si salva. Salvato, il disegno va **subito** sul muro (`saveOnWall`, non aspetta il giro dei graffiti).

**La città reagisce** (`cityReact`, da `finish` per ogni lavoro tuo, bomboletta o tavoletta): i nomi di chi ti ha visto
(`G.seesPlayer`, entro 24 m); un agente che ti vede ti ferma a voce, +5 al calore e `vandalismo` (i Grigi ti cercano); un
writer o un toy approva (+fama); un passante commenta, e a volte va a chiamare i Grigi. Vicino ai palazzi del regime
(governo, ministero, Garante, commissariato, Rocca, chiesa…) il lavoro si cancella quasi sempre la mattina dopo, quelli visti
da un agente una volta su due; la mattina il feed dice cosa ti hanno cancellato.

Prove: `test_writing.js` (agente che vede, nessuno che vede, muro del regime cancellato). Senza testa i giri dei graffiti
seguono i fotogrammi (qui 5 s l'uno): per le foto si chiama `Writing._.scanNear(..., { force: true })`.

## Graffiti 3 (26 ottobre): i pennelli, l'aderenza, quello che dipingi resta — riga `[graffiti]`
**I pennelli** (`src/pennelli.js`, tutti procedurali, niente pennelli scaricati): la bomboletta (nuvola di puntini a densità
gaussiana, overspray, speckle e splatter, colature dove la vernice si accumula, spessore che cala con la velocità), il fat cap e
lo skinny cap, il rullo (banda piatta, copertura irregolare, strisce del rullo che si asciuga, creste ai bordi, segni di
partenza e fermata), il pennarello (punta a scalpello, inchiostro che si raccoglie, colature sottili del mop), l'adesivo (la
tag a pennarello su un'etichetta, l'angolo che si stacca) e la GRANA del muro (intonaco, mattoni con le fughe, cemento coi pori,
pietra, metallo, legno) con l'età (sbiadisce, si scrosta). Tutti i numeri in tabelle in cima al file: `PENNELLI` (size, flow,
pressure, drip, grit, cap…), `SUPERFICI`, `USO` (che pennello usa ogni lavoro: tag skinny, throw-up fat, pezzi e burner spray,
mostro e roller a rullo, mtag pennarello, adesivo), `ETA`. `Pennelli.art(w)` = il disegno di writer_arte.js + il passaggio del
pennello su ogni tappa; lo usa il disegnatore a parte (il Web Worker, `pv-artworker` in index.src.html) e, senza worker,
writing.js. Lavori nuovi: lo stile `rullo` (le lettere a rullo: heaven spot e muri lunghi) e gli adesivi (`w.sticker`, un terzo
delle tag a pennarello). La tavoletta ha il pennello (bomboletta, fat cap, skinny cap, rullo, pennarello) e le manopole
(spessore, flusso, colature).

**L'aderenza** (writing.js `fitWall`, `onPlane`, `placeWall`): galleggiavano perché il muro si cercava con un raggio a 1,4 m
e poi il lavoro saliva o scendeva alla sua quota senza guardare se lì il muro c'era ancora (zoccolo, portico, insegna, facciata
a gradoni); la prova accettava 28 cm di scarto e 36° di normale; il velo stava a 1,4 cm più 4 mm a strato; finestre e porte non
contavano. Adesso il raggio va alla quota del lavoro, una griglia di raggi (~40 cm e i bordi) vuole lo stesso piano entro 1,5 cm
con cos > .97, sopra la terra al piede del muro e fuori dalle aperture vere (`R.aperture`, render.js: finestre, porte, vetrine,
la fascia dell'insegna, da `b.__win`), e il lavoro prende il rettangolo più grande tutto buono; il velo sta a 3 mm (più 1 a
strato, al massimo 7) col polygonOffset. Sui mezzi la decalcomania (`decalGeo`): i triangoli della carrozzeria dentro il
riquadro, tagliati, nello spazio del gruppo del mezzo (segue le curve, si muove col mezzo).
Misura: `Writing._.galleggia()` e `node strumenti/graffiti_sonda.js [cartella] --nome=dopo` (nel gioco vero, con le foto da vicino).

**Resta** (`salva`/`carica`, localStorage `pv.graffiti.v1`): i lavori tuoi con la chiave del posto (muro: casa:faccia:lungo:altezza
più centro e normale; mezzo: id, lato, lungo, quota; treno: vettura e lato). Tornano a ogni partita (anche ricaricando la
pagina), si rifanno uguali tornando vicino (il riquadro resta nel lavoro, non dipende dai settori), il mezzo sparito dal traffico
se li porta via e li riporta quando ricompare (stesso id). Al massimo 220: oltre i tre quarti i più vecchi sbiadiscono.
**Memoria**: le tele dei veli si riusano (pila per misura), a metà lato sul telefono (`LeggeraMem.meta2`), al massimo 170 veli
vivi (70 sul telefono): i più lontani si liberano.

**La tavoletta**: l'anteprima guardava il cielo perché vinceva qualunque faccia verticale sul raggio (anche dietro o sotto la
terra) e la finestra trascinata usciva dal muro. Adesso il muro dietro vale solo a un passo dal primo colpo, la finestra si
stringe alla superficie (`tavFit`), la camera (`tavCam`) sta lungo la normale a 3 m, puntata al centro, col margine del 4%
(per terra dall'alto, sui mezzi dal lato scelto: fianco o muso, dritto sull'asse del mezzo).
Prove: `node test_graffiti.js --seme=12345` (aderenza, decalcomania, lontano e ritorno coi modelli rifatti, ricarica in un
processo nuovo, memoria, tavoletta); con `--file=<writing.js di prima>` conta i galleggianti della versione di prima.
