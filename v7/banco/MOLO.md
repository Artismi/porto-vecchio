# La mattina sul molo nel gioco vero (passo 7 del sistema unico)

Prova: `node banco/molo_pw.js [--spento] [--rate 4|6] [--telefono] [--foto]`. Serve `v7/` con un server http locale, apre
`index.html?commedia&molo` (o `index.html` con `--spento`), porta la partita dalle 9 del primo giorno alle 6:30 del secondo a passi veri
(la notte passa, la Gazzetta delle 7 ha i fatti del giorno prima), mette Nino fermo alla marina e misura a finestre: ogni mezz'ora di gioco
15-20 s veri di gioco vivo (rAF, lavoro del fotogramma, Game.step, fasi del sistema unico, disegno dei segni), poi la mezz'ora va avanti a
passi veri (`Game.step`, dt 50 ms). Risultati in `banco/molo_risultati/*.json`. Le chiamate `/api/*` non contano come errori.

## Cosa c'è di nuovo
- `src/unico_molo.js` (solo con `&molo`): dal secondo giorno alle 6:00 sceglie venti abitanti con la Mente per ruolo (4 pescatori, 2 bottegai,
  3 clienti, falegname, coppia, 2 vicini, debitore e creditore con un prestito vero fatto con `Verbo`, 2 della banda, writer, anziano), mette
  in tasca gli attrezzi del ruolo e un blocco di popolo «passa la mattina al porto» fino alle 12:30. Gli obiettivi li sceglie la Mente.
- Segni: il «vai» con uno scopo mostra lo scopo («› Gavino», «› il pane»), niente più freccia muta; nuovo pittogramma dell'amo (prima si
  leggeva «J»); le bolle evitano tutti i cartellini dei nomi (non solo il proprio) e tutto il HUD (`.hud`, dock); la freccia usa la sua
  larghezza vera per non finire sulla mappa; misura del disegno per fotogramma (`Segni.disegno()`).
- Lingua: «ad Ada», «ed Elena» (`Lingua.a`, eufonia in `concorda`); applicata ai testi di segni e verbi.
- Mente: la griglia dei vicini riusata (20 passi), il passo di piano chiamato da `pensa` rispetta la quota dei lavori, sazietà di
  `pregare`/`igiene` (prima «pregare» tornava 200 volte in 2,5 ore).
- Salvataggio: **il codificatore entrava nella scena di three.js** da `pop.walls[].__canv[].__velo.mesh` (i muri dipinti): 715.000 nodi,
  5 s e ~900 MB vivi a ogni salvataggio automatico. Ora la grafica (mesh, materiali, tessiture, tele, nodi DOM) e le cache `__` che la
  contengono non si scrivono: 53.000 nodi, 0,22 s.

## Numeri (SwiftShader, VM Xeon 2,1 GHz, 4 core; le chiamate di disegno WebGL a vuoto durante le misure)
| prova | ore di gioco | rAF p50 / p95 / p99 ms | lavoro p50 / p95 ms | Game.step p50 / p95 / p99 ms | long task (max ms) | heap inizio → fine (max) MB | errori |
|---|---|---|---|---|---|---|---|
| on_1x | 1,51 | 2633,2 / 3516,5 / 3833,2 | 2624,7 / 3204,9 | 6,1 / 11,1 / 12 | 24 (3768) | 1444,69 → 1636,4 (1647,05) | 3 |
| off_1x | 1,55 | 316,7 / 1249,9 / 1866,6 | 91,9 / 120,4 | 6,5 / 11,9 / 15,7 | 157 (518) | 1316,7 → 1036,44 (1332,69) | 3 |
| on_4x | 1,51 | 3149,9 / 6866,3 / 6866,3 | 2877 / 6531,2 | 32,1 / 57,4 / 57,4 | 22 (6595) | 1190,49 → 1398,76 (1398,22) | 6 |
| off_4x | 1,54 | 483,3 / 683,3 / 766,7 | 408,9 / 573,8 | 28,1 / 46,4 / 67,5 | 130 (768) | 908,15 → 952,27 (978,25) | 10 |

| prova | fase | finestre p50 / p95 / p99 / max ms (n) | tutti i passi p95 / max |
|---|---|---|---|
| on_1x | unico.mente | 0,1 / 0,3 / 0,3 / 0,3 (19) | 0,3 / 14,3 |
| on_1x | unico.segni | 0 / 0,1 / 0,1 / 0,1 (19) | 0,1 / 11,8 |
| on_1x | unico.verbi | 0 / 0 / 0 / 0 (19) | 0,1 / 4,1 |
| on_1x | unico (tutte) | 0,2 / 0,4 / 0,4 / 0,4 (19) | — |
| on_1x | disegno dei segni (rAF) | 0,1 / 1,2 / 2,6 / 15,2 (156) | — |
| on_4x | unico.mente | 0,7 / 4 / 4 / 4 (17) | 2,6 / 10,6 |
| on_4x | unico.segni | 0 / 2,2 / 2,2 / 2,2 (17) | 1 / 14,9 |
| on_4x | unico.verbi | 0 / 0 / 0 / 0 (17) | 0,8 / 4,1 |
| on_4x | unico (tutte) | 1,2 / 4 / 4 / 4 (17) | — |
| on_4x | disegno dei segni (rAF) | 0,2 / 4,5 / 8,2 / 10,3 (156) | — |


Fasi nostre, 60 fps simulati in Node (seme 1, 2 ore): `unico.mente` p95 0,175 ms (prima 0,18); a 20 passi al secondo 0,30 ms (prima 0,35).
Nel browser a 1× la mente sta a p95 0,3 ms, tutte le fasi insieme 0,4 ms; a 4× 4 ms. Il disegno dei segni costa p50 0,1 ms, p95 1,2 ms.

Fatti (on 1×, 1,5 ore): 242 fatti, 197 della Mente da 77 attori; 79 visti dal giocatore, 73 con un segno (92%). Obiettivi: socializzare
43, lavorare 33, pregare 58, chiedere 14, riscuotere 13, arredare 12. Gazzetta delle 7: 8 righe, tutte da fatti veri.

## Cosa resta debole (onesto)
- **Il fotogramma con `?commedia` è molto più lento in questa macchina**: lavoro p50 2,6 s contro 92 ms senza flag, e heap 1,44 GB contro
  1,3 GB (che senza flag scende a 1,0). `Game.step` è uguale (6,1 contro 6,5 ms) e le fasi nostre costano 0,4 ms: il tempo sta dentro
  `Render.frame`, non nella simulazione. Non ho trovato la causa (non è il salvataggio, corretto sopra; il disegno dei segni è 0,1 ms).
  Va profilato su una GPU vera prima di dire che il passo 7 regge.
- rAF in SwiftShader è dominato dal processo GPU (secondi per fotogramma anche senza disegnare): i numeri dei fotogrammi qui servono solo
  al confronto con/senza flag, non come valori assoluti. Le prove 6× e telefono non sono state completate.
- 92% dei fatti visti con un segno (il criterio è 95%).
