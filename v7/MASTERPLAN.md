# Porto Vecchio — masterplan del borgo: una città da esplorare (proposta, da approvare)

L'urbanista, 6 novembre 2026. Risponde al committente: «sì, liberare i vicoli, ma progettiamo un intervento per rendere la città più
esplorabile e divertente, un'esperienza più continua e fluida, un paese e una mappa più organica, meno rettilinei e vie obbligate, più
slarghi e arie, vicoli meno stretti e pianta non così regolare e prevedibile e lunga da navigare per i lunghi tratti monoscelta direzionale».

**Stato.** È un progetto. Non è costruito: si aspetta l'approvazione. Il primo pezzo, il pacchetto sicuro di `URBANISTICA.md` (sez. 8 e
10: varchi sul Lungomare, belvedere, volte dei sottopassi, slarghi della Via delle Mura, firme in fondo alle viste, ingombri), è già nel
gioco (`[urbanistica1]`, si spegne con `?nourbanistica1`). Il masterplan parte da lì.

| Immagine (`_immagini/urbanistica/`) | Cosa mostra |
|---|---|
| `40_masterplan_oggi_piano.png` | la pianta di oggi e quella del masterplan, con la legenda dei 16 slarghi nuovi |
| `41`-`45_chiave_*.png` | cinque punti chiave, prima e dopo: borgo nord, Rua ovest, Vittoria, Via di Mezzo, pettine centrale |
| `46_metriche_distribuzioni.png` | le distribuzioni: tratti a scelta unica, tratti senza bivio, distanza dallo slargo più vicino |

---

## 0. In una pagina

Il borgo ha già molti incroci (uno ogni 33 m di via). È poco organico per tre motivi:
- l'86% delle vie corre sui due assi cardinali;
- i vicoli a pettine sono paralleli, dritti, larghi 2,2 m e in asse fra loro attraverso la Rua e la Vittoria;
- fra la fessura di 2,2 m e lo stradone di 19 m non c'è niente: mancano gli slarghi.

Il masterplan non apre il borgo e non lo allarga tutto. Rifà il **ritmo**: vicolo di 3-3,5 m con un gomito, poi un respiro di 8-12 m con
una cosa sola (una fontana, un albero, i tavolini, un muro dipinto, la vista sul mare), poi di nuovo il vicolo. Lo fa con sette mosse:
1. **L'anello delle Mura.** I tre varchi sulla ferrovia (due già fatti, il terzo è un sottopassino sotto il rilevato) e il Vico della Torre.
2. **Il pettine a ventaglio.** Ogni vicolo ha la sua pendenza e il suo gomito, è largo 3,4 m, e agli incroci si sfalsa «a baionetta».
3. **Gli anelli nuovi.** Sei passaggi corti chiudono le corti cieche e i giri: l'Androne delle Monache, il Passo della Corte, il Passo del
   Calzolaio, la Corte del Flipper, il Vico della Torre, il Sottopassino dell'Orto.
4. **Sedici slarghi**, ognuno con un carattere: in media uno a 9 m da dove ti trovi, al più a 54 m.
5. **La Vittoria in tre tempi.**
6. **La Via di Mezzo**: un gomito dopo il Forno, un respiro davanti alla torre, il muro grande del Magazzino.
7. **La leggibilità in verticale.** Le sei case-torri diventano landmark (altana colorata e lume); scale e terrazze portano ai tetti.

| Misura (nella cornice x 1300-1470, y 255-412; camera bassa 18°, braccio 7 m) | Oggi | Masterplan | Obiettivo |
|---|---|---|---|
| **tratto a scelta unica** (né bivio, né vista, né slargo): il più lungo | 43 m (10 s) | **33 m (8 s)** | ≤ 35-45 m |
| idem: quota della strada percorsa in tratti oltre 35 m · 90° percentile | 4,7% · 23 m | **0%** · 17 m | 0% |
| tratto senza un bivio, solo i vicoli: il più lungo · quota oltre 35 m | 43 m · 10,4% | **38 m · 4,0%** | ≤ 45 m |
| tratto senza un bivio, tutte le vie (anche Lungomare, Marina, Lido): il più lungo · quota oltre 45 m | 111 m · 12,8% | **66 m · 8,9%** | — (sul mare la vista c'è sempre) |
| anelli (numero ciclomatico del grafo pedonale) | 24 | **30** | più anelli |
| corti cieche (una sola uscita) | 3 | **0** (due passanti, una diventa anello) | 0, salvo premi voluti |
| capi senza uscita (tagli della cornice e affacci compresi) | 8 | 7 | |
| slarghi e piazze nella cornice | 5 | **21** | uno ogni 40-60 m |
| distanza dallo slargo più vicino: mediana · 90° percentile · massimo | 20 · 47 · 84 m | **9 · 22 · 54 m** | |
| metri di via a più di 30 m da uno slargo | 30% | **5%** | |
| vicoli sotto 3 m (larghezza visiva) · minimo | 17,5% · 2,2 m | **0,2% · 2,6 m** (solo l'Androne, voluto) | ≥ 3 m; 2,6 solo segreti |
| un landmark o il mare nell'inquadratura camminando: cornice · cuore del borgo | 52% · **30%** | 64% · **46%** | ≥ 40% |

«Oggi» è la città prima del pacchetto sicuro; il masterplan lo comprende. Il cuore del borgo è la cornice x 1330-1460, y 286-380.

---

## 1. Come si misura (per rifare i conti a ogni fase)

- **Rete**: le vie di `W.roads` e, per il piano, le polilinee nuove o ridisegnate (sez. 2), campionate a ogni metro nei due versi.
- **Evento**: c'è un evento quando si verifica una di queste cose:
  - **bivio**: un'altra via a meno di 2,5 m;
  - **slargo**: dentro lo slargo o a meno di 2 m dal suo bordo;
  - **vista**: il mare entro ±30° davanti a 120 m senza ostacoli (occhio a 1,7 m), oppure un landmark nel quadro della camera bassa
    (18°, braccio 7 m, campo verticale 46°, orizzontale ±37°).
- **Tratto a scelta unica**: la strada fra due eventi.
- **Tratto senza bivio**: la stessa misura, contando solo i bivi.
- **Landmark**:
  - i dodici di `Percorsi.dati` (fino a 300 m);
  - le firme basse che ci sono già, entro 50 m: pozzo, fontane, lavatoio, edicole;
  - nel piano anche le sei case-torri rese landmark (fino a 180 m), la firma di ogni slargo nuovo (entro 50 m) e le lanterne dei
    passaggi pedonali.
- **Il piano come modello**:
  - il raster delle case di oggi;
  - via le case dove passano le vie nuove (con la loro larghezza) e dove stanno gli slarghi;
  - riempiti i vecchi tracciati del pettine dove il vicolo si sposta.

  È un modello: i numeri veri si rifanno a ogni fase sul mondo vero, con le stesse definizioni.

---

## 2. Le sette mosse

### M1 · L'anello delle Mura (il pacchetto sicuro, più un sottopassino)

- **Fatti** (`[urbanistica1]`):
  - il varco del Vico dell'Arco (x 1411) con il belvedere;
  - il varco del Vico Scuro (x 1446);
  - i due slarghi della Via delle Mura.
- **Nuovo: il Sottopassino dell'Orto** (x 1340), sotto il rilevato della ferrovia (lì è alto 3-4 m: il pezzo `sottopasso`, come la Via
  Cavour). Dal Lungomare porta all'**Orto delle Mura** (1347,282: gli orti sotto il rilevato, la vista sul campanile).
- **Nuovo: il Vico della Torre**, da lì alla Rua (x 1325). Sulla Rua apre lo **Slargo della Torre** (fontanella; in fondo la torre
  dell'acqua di Radio Luna).
- **Effetto**: il Lungomare passa da 111 m senza bivio a 66 m. Il borgo nord diventa un anello Rua → Torre → Orto → Mura → Lanternini → Rua
  (~150 m), con il mare da una parte e il campanile dall'altra.

### M2 · Il pettine a ventaglio

Oggi i quindici vicoli nascono da `pett()` con la stessa pendenza (`LEAN = .16`) e un gomito di ±1,2 m (`hash2 · 2,4`): sono paralleli
e leggermente storti. Nel piano ogni vicolo ha i suoi punti (`PETT` qui sotto, in metri finali), un gomito vero di 4-5 m e una
larghezza di 3,4 m nei dati (3,2-4 a vista):

| Vicolo | Oggi | Masterplan |
|---|---|---|
| Lanternini, Arco, Monache, Scuro, Cordai (Rua → Mura) | paralleli, nord-nord-est | **a ventaglio verso il mare**: due gomiti ciascuno (a un terzo e a due terzi), le teste sulla Via delle Mura sfalsate di 5-8 m |
| Pescatori, Gatti, Bottai, Pozzo, Sale (Rua → Vittoria) | paralleli; **Gatti in asse coi Lanternini** (57 m di vista attraverso la Rua), **Sale e Cordai sullo stesso incrocio** | i Gatti partono 7 m più a ovest e il Sale 4,5 m più a est: **due baionette** al posto di due incroci a croce; ognuno ha un gomito a metà |
| Storto, Fame, Reti, Tonnaroti, Sorelle, Lungo (Vittoria → Via di Mezzo e Marina) | paralleli | le teste sulla Vittoria si spostano (Reti 4,5 m a ovest, Tonnaroti 5,5 m a est) e non sono più in asse coi vicoli a nord; il Lungo e le Sorelle hanno due gomiti, e il Lungo scende ancora al mare |
| traverse (Androne, Lavatoio, Corte dei Pescatori, Corte) | 2,2 m | 3,4 m; l'**Androne** resta a 2,6 m, coperto, come «passaggio segreto» |

Le viste sul mare in fondo ai vicoli restano: si sposta la testa, non il fondo. I gomiti stanno sotto i 25° e dopo ogni gomito ci sono
almeno 6 m dritti: la camera bassa non sbatte (sez. 6).

### M3 · Sei passaggi nuovi: niente corti cieche, più anelli

| Passaggio | Da → a | Largo | Com'è | Anello che chiude |
|---|---|---|---|---|
| **Androne delle Monache** | Rua (1433,311) → Corte delle Monache → Vico delle Monache (1425,283) | 3,2 m | androne a volta sotto una casa (`arco_sottopasso`, 3,6 m liberi, 9 m) | Rua – Monache – corte |
| **Passo della Corte** | Corte delle Monache → Vico Scuro (1442,292) | 3,0 m | corte aperta | Monache – corte – Scuro |
| **Passo del Calzolaio** | Via delle Mura (1395,279) → corte → sagrato (1399,304) | 3,0 m | gradini e panni stesi | Mura – sagrato – Arco/Lanternini |
| **Corte del Flipper** | Vittoria (1369,346) → corte → Corte dei Pescatori (1385,360) | 3,0 m | il retro della sala giochi, il pozzo | Vittoria – Reti – Corte |
| **Vico della Torre** | Rua (1325,305) → Orto (1347,282) → Via delle Mura (1367,283) | 3,2 m | creuza lungo il rilevato | M1 |
| **Sottopassino dell'Orto** | Lungomare (1340,260) → Orto delle Mura | 3,2 m | fornice sotto la ferrovia | M1 |

### M4 · Sedici slarghi, ognuno col suo carattere

La regola: uno slargo è largo da 8 a 12 m (raggio 4-6) e ha **una cosa sola**. È a 40-60 m dal precedente lungo le vie che si camminano.

| # | Slargo | Dove | La sua cosa |
|---|---|---|---|
| 1 | Slargo della Torre | 1324,302 | fontanella; in fondo la torre dell'acqua con l'antenna |
| 2 | Corte delle Monache | 1433,292 | il fico, la scala di ferro ai tetti, la porta dell'Osteria |
| 3 | Piazzetta del Lavatoio | 1386,325 | il lavatoio coperto; il muro cieco del Teatro, per un pezzo grande |
| 4 | Passo del Calzolaio | 1399,291 | la corte dietro il sagrato: panni stesi, gradini |
| 5 | Slargo del Sottoportico | 1399,350 | fontanella e due lecci sulla Vittoria |
| 6 | Slargo del Santuario | 1454,349 | i tavolini del bar, la facciata del Santuario |
| 7 | Respiro della Birreria | 1409,374 | la torre in fondo alla Via di Mezzo; il Vico Lungo scende al mare |
| 8 | Corte del Flipper | 1372,356 | il pozzo, la porta di dietro della sala giochi, i motorini |
| 9 | Slargo delle Mura ovest | 1374,278 | fatto: la fontanella e la scala di ronda |
| 10 | Slargo delle Mura | 1411,271 | fatto: il varco sul binario, il mare |
| 11 | Slargo delle Mura est | 1447,269 | fatto: l'edicola sul pilastro |
| 12 | Piazzetta del Magazzino | 1328,372 | la parete cieca del Magazzino Neri: **il muro grande dei graffiti** |
| 13 | Slargo della Corte | 1436,363 | i gradini e il bucato, la vista sul Santuario |
| 14 | Belvedere | 1406,247 | fatto: il parapetto sul mare |
| 15 | Orto delle Mura | 1347,283 | gli orti sotto il rilevato, la vista sul campanile |
| 16 | Slargo dei Gatti | 1369,349 | l'edicola in fondo al Vico dei Gatti (fatta), la cabina del telefono |

Con le cinque piazze di oggi (Pozzo, Forno, sagrato, Piazza della Marina, Piazza Grande) sono 21 nella cornice. Si costruiscono con
`CITY.piazzette` (il blob che fa piazza), la casa che arretra o sparisce e un pezzo solo, a scelta fra fontana, pozzo, lavatoio, edicola
e albero.

### M5 · La Vittoria in tre tempi

Il cannocchiale sulla Rocca resta dritto. Sul fronte sud (a due piani, quello della camera) si aprono lo Slargo dei Gatti (16), quello del
Sottoportico (5) e quello del Santuario (6): fra un respiro e l'altro restano 40-55 m invece di 221 m. Il portico a nord non si tocca.

### M6 · La Via di Mezzo

La Piazzetta del Magazzino (12) prende la parete cieca del Magazzino Neri, il muro grande dei graffiti. Dopo il Forno c'è il gomito
(`MEZ`, il tratto 1366-1392 scende di 2,5-3 m): la vista di 112 m si chiude sul fronte del Forno. Poi il Respiro della Birreria (7) davanti
alla torre e il Vico Lungo che scende al mare. Il tratto oggi più monotono del borgo (33 m senza niente) diventa compressione →
muro dipinto → Forno → gomito → torre → mare.

### M7 · Leggibilità e verticale

- **Le sei case-torri diventano landmark**: Latteria Rosaria (1453,277), la torre della Porta (1326,299), quella del sagrato (1392,314),
  quella del Pozzo (1438,324), quella del Forno (1346,366) e la Birreria del Porto (1419,371). Su ognuna un'altana colorata (un colore per
  torre, ripreso dalla mappa), di notte un lume. Con la camera bassa sono le uniche emergenze che entrano in quadro dentro il borgo: il
  campanile, a 30 m, resta fuori quadro da vicino.
- **Le firme degli slarghi** (la fontana, l'albero, l'edicola) si vedono da 30-50 m: in fondo a ogni vicolo c'è qualcosa.
- **Tetti e terrazze**: tre scale di ferro ai tetti negli slarghi (Corte delle Monache, Orto delle Mura, Piazzetta del Lavatoio) danno al
  grafo dei tetti (`tetti.js`, `tetti_vissuti.js`) tre accessi nuovi e due giri: quello delle Monache, sopra l'Androne, e quello delle
  Mura, dall'Orto al Vico Scuro.
- **I segreti**: l'Androne (2,6 m, coperto), il Sottopassino, le scale ai tetti, la grata del Lavatoio (il sottosuolo che c'è già). In
  fondo a ogni ramo laterale c'è un premio: un posto di `Posti`, una bottega, un graffito, un oggetto.

---

## 3. Le misure, da vicino

- **Tratti a scelta unica** (`46`, a): oggi la coda oltre i 35 m pesa il 4,7%. Sono il primo tratto della Rua (43 m fra il Corso e il
  Caruggio dei Pescatori), la Via di Mezzo (38 m dal Corso al Forno), il Vico Scuro (35 m). Nel piano il più lungo è la Via del Lido
  (33 m, sul mare), poi il Caruggio dei Pescatori (31 m).
- **Tratti senza bivio** (`46`, b): nei vicoli si passa da 43 a 38 m. Sulle vie del bordo restano tratti lunghi senza bivio, ma con
  la vista:
  - il Lungomare da 111 a 66 m (fra il Sottopassino e il varco dell'Arco);
  - la Marina, 52 m;
  - il Lido, 57 m.

  Lì il mare fa da evento e la città non si può tagliare.
- **Slarghi** (`46`, c): oggi il 30% dei metri di via è a più di 30 m da uno slargo. Nel piano è il 5%, e la mediana scende da 20 a 9 m.
- **Larghezze**: tutti i vicoli a 3,2-4 m, l'Androne a 2,6 m. Il fattore canyon (gronda/larghezza) scende da 2,1-2,7 a ~1,5-1,9: resta
  un caruggio, non diventa una via.
- **Leggibilità**: nel cuore del borgo il tempo con un landmark o il mare in quadro passa dal 30 al 46%. Il guadagno viene dalle torri e
  dalle firme degli slarghi. Il campanile da solo non basta (sez. 6 di `URBANISTICA.md`).

---

## 4. I punti chiave (`41`-`45`)

- **A · borgo nord** (`41`): il pettine a ventaglio, la Corte delle Monache passante, il Passo del Calzolaio, i varchi e gli slarghi
  delle Mura.
- **B · Rua ovest** (`42`): il Vico della Torre, lo Slargo della Torre, l'Orto delle Mura, il Sottopassino.
- **C · Vittoria** (`43`): tre respiri e la Corte del Flipper che fa l'anello.
- **D · Via di Mezzo** (`44`): il muro del Magazzino, il gomito, il respiro della Birreria.
- **E · pettine centrale** (`45`): le baionette (Gatti, Sale) e la Piazzetta del Lavatoio.

Sono mock-up in pianta: il raster delle case con i tagli, i riempimenti e le vie nuove. Nel gioco le case non si nascondono una per
una (le facciate stanno nei blocchi fusi), quindi i mock-up 3D arrivano con le fasi.

---

## 5. Le fasi, in ordine, coi rischi

Ogni fase va su un ramo a sé, con le foto prima e dopo e le misure della sez. 1 rifatte sul mondo vero. Ogni fase si spegne con un
interruttore (`?nourbanistica2`, `3`, …) come la prima.

| Fase | Cosa | Tocca | Rischi |
|---|---|---|---|
| **F0** (fatta) | il pacchetto sicuro, `[urbanistica1]` | barriere, pezzi, arredo, caselle libere | vedi `URBANISTICA.md` sez. 10 |
| **F1** · anelli e corti | M1 (Sottopassino, Vico della Torre, Orto, Slargo della Torre), M3 (Androne e Corte delle Monache, Passo della Corte, Passo del Calzolaio, Corte del Flipper), Piazzetta del Lavatoio | `add()` di vie nuove, `CITY.piazzette`, 6-8 case tolte o accorciate, `arco_sottopasso` e `sottopasso` | lotti locali; il grafo dei tetti perde 4-6 tetti (`test_tetti4`); graffiti salvati su 6-8 muri; **il Covo nel bunker delle mura (1438,280) confina con la Corte delle Monache**: la corte diventa l'anticamera del covo, ma l'ingresso resta nascosto (`MAPPA_COMPATTA` sez. 4, «non dalla strada») |
| **F2** · Vittoria e Via di Mezzo | M5, M6 | lotti a sud della Vittoria e lungo la Via di Mezzo; `MEZ`; `vievive.js` (fermate, stalli); `scorci.js` (`ATTESA_CUCITURA`); la parata | gli scorci sulla Vittoria; le botteghe (`test_botteghe`); la Scalinata del Forno si aggancia alla `MEZ` |
| **F3** · il pettine | M2: i punti di `PETT` al posto di `pett()` a pendenza fissa, larghezza 3,4, baionette, traverse 3,4 | **tutto il borgo si rilottizza** | graffiti salvati (tutti i muri del borgo cambiano), scorci, botteghe, `Posti`, rifugi, scene; le scorciatoie di `percorsi.js` (devono restare più corte del 30%); i luoghi-missione (Bar, Forno, Chiesa, Pescheria) hanno gli `ingressi` per nome: i nomi dei vicoli restano; tutte le prove della città |
| **F4** · verticale | M7: altane e lumi sulle sei case-torri, firme degli slarghi, tre scale ai tetti, i due giri nuovi | `tetti.js`, `tetti_vissuti.js`, `render.js` (le altane), `scorci.js` | la rete dei tetti (`test_tetti4`, `test_tetti_vissuti`); le luci di notte (budget delle luci vere) |

Rischi comuni:
- **Tasselli**: ogni fase cambia l'impronta. Il workflow (`tasselli.yml`) li ricuoce; finché non ci sono, la città si costruisce nel
  browser (più lenta all'avvio).
- **NPC e percorsi**: seguono le caselle e si rifanno da soli. Vanno riguardati i percorsi di `popolo.js` sui tetti e la regia (le scene
  cercano i posti per tipo).
- **Missioni**: i luoghi-missione restano, perché la fase 3 sposta le teste dei vicoli, non le piazze. `BIBBIA_MISSIONI.md` sez. 3.2bis
  va riletta per gli ingressi.
- **Prestazioni**: chiamate di disegno e triangoli non devono crescere in modo apprezzabile (Iris Xe, telefoni).
  - Ogni slargo al più un pezzo medio e due piccoli, fusi come gli altri pezzi; gli alberi dal kit natura, istanziati.
  - Le case tolte (stima: 25-35 lotti in tutto) compensano.
  - Il bilancio atteso è entro ±3%, da misurare a ogni fase con `strumenti/banco_peso.js` e `sonda_gpu.js`, anche con `?leggera`.

---

## 6. Dipendenze coi lavori in corso

- **La camera bassa (`?camera9`)**:
  - tutte le misure di leggibilità sono fatte a 18° con braccio di 7 m;
  - i gomiti del pettine (sotto 25°, 6 m dritti dopo), le volte (≥ 3,6 m liberi, ≤ 10 m di lunghezza) e i vicoli a 3,4 m sono pensati
    perché quel braccio passi;
  - quando i numeri di `camera9` sono decisi, si rifanno le misure (sez. 1).

  La F3 non parte prima.
- **La strada dipinta (graffiti)**:
  - il masterplan crea quattro muri grandi: il Magazzino Neri sulla Piazzetta del Magazzino, il muro del Teatro sul Lavatoio, il muro
    dello Slargo della Torre, il muro del rilevato all'Orto;
  - la F3 sposta tutti i muri del borgo: conviene che la strada dipinta scelga i muri per regola (esposizione, larghezza, vista) e non
    per indice di casa, o che la F3 venga prima del suo elenco definitivo.

---

## 7. Cosa resta com'è

- I vicoli che finiscono sul mare (sono il premio).
- La Vittoria dritta sulla Rocca.
- La densità: le case tolte sono, a stima, 25-35 su 350 nel borgo, quasi tutte per slarghi da 8-12 m.
- Le case a due piani sul lato della camera.
- Il Forno, il Pozzo, il sagrato e la Piazza della Marina, al loro posto.
