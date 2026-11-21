# Prestazioni sul telefono — l'intervento (ramo squadra/prestazioni, worktree /home/user/wt/prestazioni)

## I commit (dal primo all'ultimo)

| commit | cosa | stato |
|---|---|---|
| 1d23299 | lontano9: i ganci (prova del tronco, onBeforeRender/onAfterRender di ogni oggetto) solo con ?camera9 | invisibile |
| a4de6c3 | sul telefono i mezzi senza mappa d'ombra | **rivisto da 51c86a4** (troppo drastico) |
| 7b7909e | ritmo fermo sul telefono: tetto a 30 mai tolto, scala e gradini di fluido_tel salgono solo nei primi 45 s | invisibile a regime |
| 4aacfa1 | Cinema.passi spento sul telefono | **rivisto da de76f37** (toglieva il «tempo pieno») |
| 5ffdc4b | ingresso dell'APK: la griglia del caricamento nascosta non anima; la levetta del Game Boy parte subito (android/ingresso/pezze.mjs, applicata anche da costruisci.mjs) | invisibile |
| e8e6388 | sul telefono il salvataggio dei 3 minuti aspetta la pausa (non è spento); restano hidden, pagehide e il sonno | invisibile |
| de76f37 | Cinema.passi: due passi anche sul telefono, con l'isteresi sul costo del passo | invisibile |
| 51c86a4 | l'ombra dei mezzi sul telefono: a mappa, ma la fa la sola scocca (i pezzi con la vernice) | foto |
| 6fc7009 | i mezzi sul telefono passano al livello basso da 45 m (era 70) | foto (lontano) |
| 54b8872 | sul telefono grate e ingressi della metro fusi per materiale, una volta | foto: identico |
| b612914 | graffiti2 sul telefono: i raggi dell'aggancio non costruiscono le griglie dei tasselli nel loro fotogramma | invisibile (l'aggancio arriva 1,5 s dopo) |
| 32d99ef | anche i pozzi della metro fusi fra loro | foto: identico |

Tutto è dietro il profilo del telefono (PHONE / PV_TELEFONO), salvo lontano9, che sul computer non cambia l'immagine. Nessun interruttore
nuovo. Foto: `foto_prima_dopo.jpg` (accanto; prima = base, dopo = 32d99ef, Game Boy di traverso, SwiftShader, ore 11, sereno).

## Le misure (stessa sonda, Game Boy di traverso, tasselli, disegni a vuoto; macchina con carico 20-35: contano i conteggi)

| | prima (base) | dopo (32d99ef) |
|---|---:|---:|
| disegni per fotogramma, fermi all'avvio (32 fotogrammi) | 1.169 | **966** (−17%) |
| · ombre | 142 | 73 |
| · mezzi (scena / ombra) | 110 / 76 | 79 / 23 |
| · sottosuolo in superficie | 169 | **54** |
| disegni GL medi per fase (fermo / cammina / gira) | 1.141 / 1.171 / 915 | 969 / 996 / 829 |
| oggetti che fanno ombra | 4.867 | 3.070 |
| passo tenuto fermo dal salvataggio durante la misura | 30 fotogrammi | 0 |
| ingresso: giri rAF al secondo durante il gioco (ms/s) | 2,9 (1,86) | 0,9 (0,02) |
| useProgram per fotogramma | ~320 | ~320 (invariato: servono i materiali) |

I ms per fotogramma non sono confrontabili (carico della macchina condivisa).

## Cosa ho tolto o spento, e perché
- Niente funzioni tolte. Spostato: il salvataggio periodico sul telefono (alla pausa). Semplificato: l'ombra dei mezzi sul telefono
  (solo la scocca). Più presto: il livello basso dei mezzi (45 m). Fermato: dopo 45 s i regolatori del telefono non risalgono (niente
  prove che rifanno i bersagli a gioco vivo). Non installati: i ganci di lontano9 senza camera9 (non facevano niente).

## Prove
test_hd_ritmo (aggiornata: il telefono non risale dopo 45 s), test_lontano9, test_cinema, test_graffiti2: passano.
test_tasselli e test_unico_salva: gli stessi fallimenti della base (l'impronta della pagina nella prova; «a fette» e «caricamento in un
processo nuovo»), verificati sulla base.

## Cosa resta
I tasselli vanno ricotti (render.js, peso_ritmo, lontano9, graffiti2 cambiano l'impronta). Restano i grandi: mesh dei tasselli (~300
disegni, ~105 materiali: atlanti nella cottura), mezzi fusi (scocca unica), passo fisso con interpolazione, allocazioni e heap (600-900 MB),
caricamenti sulla scheda video a fette, le ~100 InstancedMesh minuscole da identificare.

## Secondo giro (dopo l'unione in claude/fervent-darwin-i60goz, base 1ada50d)

| commit | cosa | misura |
|---|---|---|
| 2497b6f | mezzi dai modelli (glb) fusi per materiale; geometria fusa una per modello | un'auto glb da 50 a 20 disegni (sonda_chi, 30 fotogrammi) |
| 823636b | glb: i materiali uguali in tutto diventano uno | la stessa auto da 20 a 17 |
| cfa9a52 | ruote: i pezzi di ogni ruota fusi per materiale (la ruota resta a parte: gira, sterza) | mezzi in vista all'avvio 67 → 51 disegni |
| d2cdb43 | rayWall: dai tasselli solo il primo colpo buono per mesh | sonda_primo: stesso colpo in 248/248 raggi, oggetti-colpo 1.486 → 728 |
| d4ed1d7 | la maschera delle persone non ricarica le ossa | texSubImage2D 21 → 9 a fotogramma |
| d7fb0f3 | peso_bagliori: istanze caricate solo se cambiate e solo le usate | bufferSubData 352 → 207 KB a fotogramma |
| b92fae1 | rayTas senza allocazioni per chiamata (e la correzione della stima di d2cdb43) | |

Totale all'avvio (fermi, 32 fotogrammi): 953 → 918 disegni; mezzi 79 → 63; oggetti in scena 15.164 → 14.932, mesh 9.493 → 9.147,
materiali 1.941 → 1.888. Nessun cambio visibile atteso: stessa geometria, stessi materiali (per i glb un clone per materiale invece che per
pezzo, i materiali uguali in tutto uniti: la tinta dei danni tocca ancora tutti).

Zone toccate: render.js (fondiGLB e fondiColori prima di vehicleMesh, la riga del glb in vehicleMesh, finishVehicle per le ruote,
eMaschera per le ossa), models.js vehicle(), writing.js rayWall, tasselli.js rayTas, peso_bagliori.js prima().

Cosa ho trovato e non cambiato:
- **Memoria**: le geometrie in scena sono 87 MB su 821 di heap (sonda_mem): liberare gli array lato processore dopo il caricamento
  varrebbe al più il 10% (e servono ai raggi). Il grosso dell'heap è altrove (stato del gioco, dati dei moduli, cache dei tasselli): serve
  un'istantanea dell'heap in DevTools su un computer per trovarlo, non qui (800 MB).
- **Allocazioni**: ~12-15 MB a fotogramma; i grossi sono i raggi (camera7 cast7 tiene tutti i colpi: il filtro dipende dal punto, non si può
  fare come per i muri senza riscriverlo), la nascita delle persone (le facce procedurali di personaggi.js, a budget) e i blocchi del
  terreno camminando.
- **Caricamenti sulla scheda video**: per i tasselli sono già a quota (90.000 vertici e 3 MB a fotogramma sul telefono); restano ~40
  aggiornamenti di istanze a fotogramma (animali di ordine_arte, accessori di unico_strada: piccoli).
- **Le piccole InstancedMesh**: identificate (sonda_chi): il grosso dei disegni minuscoli sono quadrati dei tasselli (29 disegni con 5
  materiali soli) → proposta in ATLANTI.md; le istanze vere (tetti, tombini, verde a 1-2 istanze per blocco) sono poche.
- **Passo fisso**: il progetto in PASSO_FISSO.md (non è un affinamento piccolo e sicuro: tocca il contratto fra logica e disegno).
