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
