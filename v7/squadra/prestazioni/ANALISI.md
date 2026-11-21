# Prestazioni sul telefono: l'analisi (la squadra, 21 novembre)

Rapporto dell'esperto di prestazioni grafiche su mobile. Sonde e dati nella cartella temporanea della sessione (`squadra/prestazioni/`:
`sonda_ritmo*.js`, `sonda_salva.js`, `analizza.js`, `ritmo_*.json`, `salva.log`).

**In breve: il telefono non arriva a 30 fps perché ogni fotogramma chiede troppo lavoro al processore.** Nell'APK con i tasselli ogni
fotogramma fa 1.200-1.800 disegni con 1.850-2.050 materiali, su una scena di 14.500-15.400 oggetti; in più blocchi periodici (salvataggio
che ferma il mondo, GC, caricamenti sincroni). Per 30 fps fermi serve circa 4-5 volte meno processore per fotogramma.

**Come è stato misurato**: quattro corse in Chromium (SwiftShader) col gioco aperto come nell'APK (Game Boy, `/gioco/`, tasselli giusti),
telefono simulato (DPR 2,75, tocco, verticale e orizzontale), disegni a vuoto (solo processore), macchina con carico 20-30 su 4 core: i ms
assoluti sono gonfiati 4-8 volte e valgono come rapporti; i conteggi valgono così come sono. Regolatori in fondo in ~12 s (fluido_tel
gradino 6, scala 0,5, tetto 30, scena 310×611). JS: 75-85% `R.frame`, 6-20% `G.step`, 5-15% graffiti2+writing; nel profilo 38-44% chiamate
WebGL native, three.js ~20%. Heap 600-800 MB. Stima per un Android medio: 90-200 ms per fotogramma, 5-11 fps (coerente coi 7-8 fps visti).

## Le 10 cause, dalla più pesante

1. **Troppi disegni e cambi di stato** (40-50%). `render.js:20912`, mezzi `render.js:12923` e `:12533`, tasselli, `sottosuolo.js:1491-1528`.
   1.217 disegni per fotogramma (orizzontale): mezzi 143 + 246 nell'ombra (~80 materiali); tasselli ~300 mesh con 105 materiali;
   `sottosuolo_sopra` 139 scatoline da 13 triangoli; ~100 InstancedMesh da 14 triangoli; 320-620 `useProgram`. In verticale 1.490-1.795
   (le note dicevano 545: misurate con la città costruita nel browser). Correzione: mezzi in 2-3 mesh (scocca fusa con colori ai vertici,
   vetri, ruote in istanze), ombra con una sagoma bassa o chiazza a terra; micro-pezzi statici fusi al montaggio; atlanti per tassello
   (5-15 disegni invece di ~25). Obiettivo meno di 350. Lavoro grande, rischio medio.
2. **Scena enorme e strati sul percorso di ogni oggetto** (10-15%). `Frustum.intersectsObject` avvolto due volte (`lontano9.js:209`,
   `peso_lontano.js:20`) più PesoScatole; `onBeforeRender/onAfterRender` avvolti per tutti (`lontano9.js:211`); `renderBufferDirect`
   (`peso_pronti.js:178`); `updateMatrixWorld/add/attach` sostituiti due volte (`render.js:18696`). **lontano9 è acceso di serie ma serve
   solo con `?camera9`**. Correzione: ganci solo quando la funzione è accesa; scarto per celle; nodi fermi. Medio, rischio basso.
3. **Il salvataggio ferma il mondo ogni 3 minuti**. `unico_salva.js:69` (180 s), `:73` (`tieni: true`), `:769`; acceso nell'APK (commedia di
   serie). Misurato: passo fermo per 87 fotogrammi; fotografia 6 s, JSON 4,07 MB (764 KB compresso), compressione a fette da 2 ms durata
   303 s (si sovrappone al successivo). Sul telefono stimati 6-9 s di mondo fermo ogni 3 minuti. Correzione: niente salvataggio periodico sul
   telefono (solo pausa, `hidden`, sonno), mai `tieni`, JSON e gzip in un worker. Piccolo, rischio basso.
4. **Memoria e GC**: heap 600-800 MB, 18-25 GC minori al secondo, maggiori fino a 1,1 s. Correzione: liberare le geometrie lato processore
   dopo il caricamento, mesh di collisione povere per i raggi; niente array nuovi per fotogramma (`dyn.lsp.concat(...).concat(SPILLS.filter)`
   in `R.frame`, `st.timers.filter` in `game.js:3643`). Medio.
5. **Lavori sincroni che fanno i picchi**: fotogramma da 1.017 ms con 1.568 caricamenti di tessiture/buffer (il tetto di 4 ms dei tasselli,
   `tasselli.js:51`, non copre il caricamento sulla scheda video); graffiti2 a 446 ms (la griglia dei raggi costruita tutta subito,
   `tasselli.js:328`); writing fino a 230 ms, unico_parti_vivo fino a 104 ms, blocchi del terreno ~5%. Correzione: griglie nella cottura o
   nel lavoratore; graffiti2 solo su griglie pronte; tetto ai caricamenti sulla scheda video. Medio, rischio basso.
6. **Tempo del mondo instabile e metà frequenza senza interpolazione**: `main.js:1589-1590` con `cinema.js:33-35` (sul telefono il passo
   costa più di 8 ms: quasi sempre 1 passo, il mondo al 40-60%; a volte 2: la velocità pulsa); ombre a 10-15 Hz (`render.js:20893`);
   animazioni lontane a 1/2 e 1/3 (`render.js:20402`); persone lontane a 1/2, 1/3, 4 Hz (`game.js:3670-3672`). Correzione: passo fisso a
   30 Hz con accumulatore e interpolazione (via `Cinema.passi`, il PACE, le frequenze dimezzate). Grande, rischio medio.
7. **Regolatori sovrapposti**: `peso_ritmo.js` (prove che tolgono il tetto, riga 112), `fluido_tel.js` (sei gradini, suo ciclo riga 52),
   `R.lowQuality()` (`main.js:1566`, `render.js:13873`), il ripiego dell'ingrandimento (`render.js:13952`); il sole a fotogrammi alterni ha
   due padroni; ogni cambio rifà i bersagli (`render.js:13838`, `13904-13912`). Correzione: sul telefono decidere all'avvio con un banco di
   3 s, tetto a 30 fisso, poi solo scendere. Piccolo, rischio basso.
8. **La catena dei comandi**: la levetta del Game Boy aspetta il rAF della pagina d'ingresso, poi un postMessage letto al fotogramma dopo;
   poi la rampa (`main.js:1199-1203`), poi le molle della camera: a 8-10 fps 250-400 ms fra dito e schermo. Correzione: la pagina d'ingresso
   (stessa origine) scrive la levetta direttamente nel gioco in `pointermove`; rampa 0,15-0,25 s. Piccolo.
9. **Il guscio del Game Boy lavora sotto il gioco**: in `ingresso.js` (`Mm`) la griglia del caricamento `Em` (140 cubi con `will-change`)
   riscrive `transform`/`opacity` a ogni giro dello schermo per tutta la partita; due `setInterval` da 40 ms accesi. Correzione: smontarla a
   gioco pronto (nel sorgente del sito). Piccolo, rischio nullo.
10. **Simulazione e ganci**: 23 moduli su `G.HOOKS.step`, `G.step` avvolto 5 volte, ~20 cicli rAF (graffiti2 e writing 5-15%). Correzione:
    budget per modulo, unico_* e commedia lontani a 2-4 Hz interpolati. Medio.

## Ridondanze che costano a ogni fotogramma

lontano9 intero (`lontano9.js:207-215`); due involucri del frustum e tre di `shadowMap.render` (`lontano9:208`, `peso_lontano:19`,
`peso_ombre:252`); quattro o cinque regolatori; gli strati di camera sui mezzi (`render.js` 20590-20840) con cinema.js sopra; cicli rAF sempre
vivi (`unico_corpi.js:302`, `menu_ui.js:305` e `:387`, `fluido_tel`); `Em` e i `setInterval` dell'ingresso.

## Cosa misurare sul telefono vero

1. APK con `?perf` (caricare `/index.html?perf` in MainActivity nella build di prova): fps, «peggiore», gioco/attesa, logica/grafica,
   disegni, shader, la classifica di `Misura`.
2. Lo stesso gioco in Chrome sul telefono contro l'APK: il costo della WebView.
3. Interruttori: `?nocommedia`, `?nolontano9`, `?ritmo=30`, `?nocinema_tempo`, al terzo e al sesto minuto, con `Salva.stats.tenuti`.
4. `__ritmo`, `__fluidoTel.storia`, `__tasselli.picco`, `__cinema.costoPasso`, `renderer.info.programs.length` (se cresce: compilazioni a
   gioco vivo).
5. Una traccia Perfetto o chrome://inspect di 30 s (frequenze CPU, taglio termico, GC, caricamenti).

## Piano

- **Subito (1-3 giorni, rischio basso)**: salvataggio periodico spento sul telefono; smontare `Em`; lontano9 solo con camera9; niente ombra dei
  mezzi sul telefono (−100…−250 disegni); graffiti2 solo su griglie pronte; tetto a 30 fisso e risoluzione decisa all'avvio; `Cinema.passi`
  spento sul telefono; la levetta scritta direttamente nel gioco, rampa più corta. Atteso: niente blocchi da secondi, input più pronto,
  fps +20-40% (stima).
- **Una settimana**: mezzi fusi, micro-gruppi fusi, istanze; griglie nella cottura; tetto ai caricamenti; caccia alle allocazioni; via i rami
  «com'era» che girano. Obiettivo meno di 600 disegni, GC sotto 1 ms per fotogramma.
- **Strutturale**: passo fisso a 30 Hz con interpolazione; tasselli con atlante (10 disegni per tassello) e livelli per il lontano; un
  regolatore unico con banco all'avvio e stato termico; heap sotto 300 MB; simulazione lontana in un worker; valutare Chrome (TWA) al posto
  della WebView. Obiettivo meno di 350 disegni e meno di 25 ms di processore: 30 fps fermi.

Su `cinema.js`: costa poco, ma il «tempo pieno» cura il sintomo; sul telefono è quasi sempre a un passo, con il rischio della velocità che
pulsa. DA_FUORI §2.5 sottostima i disegni dell'APK (2-3 volte). La F3 (passo fisso e interpolazione) è la direzione giusta.
