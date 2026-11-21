# Il codice: codice morto, doppioni, rischi e piano di pulizia (la squadra, 21 novembre)

Rapporto dell'architetto del codice. Script ed esiti nella cartella temporanea della sessione (`squadra/codice/`: `analizza.js`, `rami.js`,
`doppi.js`, `dipendenze.js`, `catch.js`, `mini.js`; `rami.txt`, `doppi.txt`, `morte.txt`, `interruttori.txt`, `copia/tutti.tsv`).

**In breve.** Il codice è più ordinato di quanto sembri: un nome globale per modulo, nessun carattere rotto, `index.html` si rifà identico
dai sorgenti. Il peso viene da tre cose: le versioni vecchie tenute in vita dagli interruttori, gli stessi sistemi rifatti più volte, e un
repository con ~600 MB di immagini e copie di sicurezza.

## 1. Numeri

| | |
|---|---|
| Moduli | 181 distinti (177 di gioco, 4 librerie), 186 inclusioni |
| Righe di gioco | 129.655; commenti 14,7% dei byte |
| `index.html` | 16,9 MB (5,69 MB gzip) |
| `mondo_cotto.js` | 20,5 MB (17,6 MB di base64; 1,8 MB gzip) |
| Interruttori | 229 + 12 `nocinema_*`; 140 tengono in vita «com'era», con 947 punti di ramo |
| Letture di `location.search` | 278 (230 una volta al caricamento; ~4 per fotogramma) |
| `catch` vuoti | 377 su 880 |
| Moduli che avvolgono `step` / `frame` | 42 / 4 |
| `typeof X !== 'undefined'` | 996 |
| `.git` | 708 MB; cartella di lavoro 1,4 GB; 3.755 file |

## 2. Cose che DA_FUORI non diceva

1. Le «proposte» sono già di serie con un trucco: `index.src.html:309-320` aggiunge all'URL strade2, insegne4, graffiti2, facce3, luce3,
   progetto, commedia, parola. I 31 moduli dietro `?commedia` (unico_*, vita, casa, iniziative) sono accesi per tutti; commenti e build.py
   dicono ancora «solo con ?…». Il «com'era» di queste proposte è codice morto di serie.
2. 31 prove girano sull'isola vecchia (`require('./world.js')`): vanno portate sulla città nuova prima di togliere `world.js`.
3. La regia (`cinema.js`) ha aggiunto 12 interruttori senza scadenza: l'opposto di quello che la nota propone.

## 3. Codice morto

- Moduli che di serie non fanno niente: `world.js` (1.978 righe), `urbanistica2.js`, `unico_molo.js`, `lontano9.js` (ma `installa()` gira lo
  stesso, `lontano9.js:218`), `skate.js` (in pausa).
- Codice dello Studio nel gioco: gran parte di `editor.js` (da 720), `officina.js`, `sviluppo.js`.
- Testi incollati due volte in `index.html` (523 KB): writer_mano, writer_arte, pennelli; meshopt_decoder; calcolo_lavoratore.
- `fonts_graffiti.js`: 27 font in base64 (933 KB) identici ai `.woff2` di `assets/fonts_graffiti/` (non usati).
- 39 funzioni mai chiamate (462 righe): `buildProps`, `buildGround`, `bancoVecchio`, `faroVecchio`, `palazzoGoverno`, `ufficiGarante`,
  `buildSkyline` in render.js; `muralFont` in writer_arte.js.
- Versioni vecchie dietro interruttore: `TavolaUI.open1`, `Guardaroba.outfitOfPrima`, il vecchio di `fluido_tel`.
- 39 interruttori «com'era» togliibili subito (148 punti di ramo; elenco in `rami.txt`): nofixcamera5/6/7, nofixcontrolli8, nofixguida2,
  nofixgraffiti(2), nofixorienta, nofixsuolo(2), … vecchioverde, vecchiapulizia, vecchiastrada, vecchiolook, guardaroba0… (togliere
  `nofixcamera6` toglie il ramo prima di CAM6, non CAM6, che regge la camera dei mezzi).
- Interruttori di misura da tenere ma raccogliere in un posto: `nodieta`, `nopulizia2`, `norilascio`, `nostream`, `notavolozza`, la famiglia
  `no…tel`.

## 4. Doppioni

- 374 gruppi di funzioni identiche, 801 copie in più: `clamp` 71 copie, `rnd` 37 moduli, `dist` 28, `esc` 11, `pick` 21; lo stesso hash in 14
  copie, generatori in 11, `angDiff` in 7; 35 smorzamenti a mano; 249 funzioni d'accesso fatte allo stesso modo.
- «È un telefono?» deciso in 12 posti diversi (possono rispondere diversamente sullo stesso telefono).
- Cinque regolatori della risoluzione che si evitano con dei flag.
- Graffiti: 11 moduli, 9.773 righe; i muri dipinti all'avvio decisi da quattro sistemi.
- Camera: 1.629 righe in 6 moduli più ~1.100 in render.js. Mente: `mente.js` e `unico_mente.js` in parallelo.

## 5. Corruzione e rischi

- Codifica pulita; ma `build.py` legge con `errors='ignore'`: un byte rotto sparirebbe senza avviso.
- Dipendenze circolari: un nodo di 63 moduli, regge grazie ai `typeof`. Ordine di caricamento fragile (riscritture dell'indirizzo, 42
  avvolgimenti di `step` nell'ordine degli `<script>`).
- `catch` vuoti nei cicli di ogni fotogramma (`luce3.js:392/402/413`, `cielo.js:53`, `tratteggio.js:293/299/319`, `render.js:20881`,
  `tasselli.js:801`, `writing.js:2565/2603`, `vestiario.js:1259`): un errore ripetuto resterebbe invisibile.
- Due `vercel.json` (radice e v7): se il progetto parte dalla radice si pubblicano anche v2…v6, `_immagini` e i backup. Da controllare.
- Prove (34 su 86 completate su una macchina carica): falliscono `test_campagna`, `test_citta_viva`, `test_costa2`, `test_imperfezioni`,
  `test_inquadratura` (misura di tempo); oltre 900 s `test_azioni`, `test_casa`, `test_commedia`, `test_economia`, `test_eventi`,
  `test_fazioni`. Le altre 52 da rilanciare su una macchina scarica.

## 6. Il repository

- Storia git 711 MB: `v7/_immagini` 469, `editor.html` 40, `index.html` 41, `reports` 30, `_trasferimento` 19, v2 15, `_scambio` 15,
  `_to_delete` 10, `mondo_cotto.js` 10.
- Da archiviare (~720 MB nella cartella di lavoro): v2…v6, `_backup*`, `_to_delete`, `_scambio`, `_trasferimento`, lo zip, il gioco v1 nella
  radice; le 50 note `.md` di v7 in `docs/`.
- Generati committati: `index.html`, `editor.html`, `mondo_cotto.js`, i modelli in quattro formati (`.json` e `.json.js` 82 MB solo per
  `file://`).

## 7. Architettura proposta

`base.js` caricato per primo (utilità, `PV.flag` con elenco e scadenze, `PV.tel`, `PV.ciclo.aggiungi(nome, fn, ordine)` al posto degli
avvolgimenti, con errori registrati); le novità di serie come valori predefiniti, non parametri nell'URL; un solo regolatore della qualità;
una sola camera (F2); il gioco separato dallo Studio.

## 8. Piano di pulizia a basso rischio

| Fase | Cosa | Effetto stimato |
|---|---|---|
| 0 · Base | Rilanciare le 86 prove su macchina scarica; `errors='strict'`; registro degli errori nei cicli | gli errori si vedono |
| 1 · Repository | Archiviare v2-v6, v1, backup, `_to_delete`, `_scambio`, `_trasferimento`; `_immagini`/`reports` in release o LFS; `.json`/`.json.js` rigenerati e non committati | −720 MB di cartella; −82 MB di modelli |
| 2 · Peso della pagina | Testi del lavoratore dal DOM; font come `.woff2` alla prima bomboletta; `world.js` tolto (dopo le 31 prove); `editor.js` diviso; minificazione | `index.html` da 16,9 a ~9 MB |
| 3 · Rami «com'era» vecchi | i 39 interruttori, `open1`, `outfitOfPrima`, il vecchio di `fluido_tel`, le 39 funzioni mai chiamate | −2.000-3.000 righe |
| 4 · Utilità e flag unici | `base.js`, `PV.flag`, `PV.tel` | −1.500 righe; telefono coerente |
| 5 · Cicli e qualità | `PV.ciclo`, un regolatore | ordine esplicito |
| 6 · Camera unica | via gli strati vecchi dopo che i mezzi passano alla regia | −1.500 righe |
| Regola | ogni nuovo `?no…` con una data di scadenza, controllata da una prova | gli interruttori non crescono |

Pacchetto di partenza consigliato: fasi 1 + 2 + 3, senza cambiare il comportamento di serie.

## 9. Il piano rivisto secondo la regola del committente (conservativo, incrementale)

Diviso in due parti. **A**: interventi sicuri che lasciano il gioco di serie identico. **B**: interventi che cambiano qualcosa e vanno
approvati uno per uno. Niente si cancella: le cartelle vecchie si archiviano (restano nella storia git), gli asset restano, nessuna funzione
usata si tocca.

**A · Sicuro**: A0 le 86 prove annotate su macchina scarica, `errors='strict'`; A1 archiviare (tag e cartella `_archivio/`, non cancellare)
v2…v6, v1, backup, `_to_delete`, `_scambio`, `_trasferimento`, dopo un `git grep` che nulla li citi (−280 MB di cartella); A2 `_immagini` e
`reports` anche in una release, tolti dalla cartella solo col consenso del committente; A3 commenti scaduti corretti e note in `v7/docs/`;
A4 i `catch` vuoti dei cicli registrano l'errore una volta; A5 via le 10 funzioni verificate morte (~340 righe); A6 un solo testo per i
lavoratori (−0,52 MB di pagina).

**B · Con approvazione**: B1 date di scadenza agli interruttori, i rami «com'era» tolti solo dopo il sì e una tavola; B2 le 31 prove sulla
città nuova, poi `world.js` fuori dalla pagina; B3 i font dei graffiti caricati alla prima bomboletta; B4 minificazione (copia leggibile nello
Studio); B5 `editor.js` diviso; B6 un solo `PV.tel` e un solo regolatore; B7 utilità comuni solo dove le copie sono identiche; B8 la camera
unica.

Nota: i formati `.json` e `.json.js` dei modelli servono all'apertura da `file://` (`file_shim.js`): sono asset in uso e restano.
