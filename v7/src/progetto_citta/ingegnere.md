# L'ingegnere — la città come opera costruita

Pianta: `pianta.js 1060 220 1680 470` e zoom `1330 240 1620 460`. Foto 3D: spianata (1470,330) e costa nord (1300,262).

## 1. Critica: niente in questa città è stato *costruito*

- **La ferrovia galleggia.** In 3D è un nastro su un argine largo 6 m, staccato di 15-25 m dalla riva, in mare aperto. Non ha stazione, né passaggi a livello, né ponti, né rapporto con la città. Poi gira attorno alla punta della Rocca e va a infilarsi fra i moli militari. Nessuna ferrovia del 1880 sarebbe passata *fuori* dalle mura di una piazzaforte. È decorazione, non infrastruttura.
- **Davanti alla Porta c'è uno svincolo, non una fortezza.** Sei strade di 14-16 m si incontrano sulla spianata e formano un incrocio d'asfalto di circa 60 m. Le aiuole spartitraffico sono lame triangolari di marciapiede, le torri di guardia stanno nel nulla, il recinto pare di legno. Mancano fossato, controscarpa, ponte e rivellino. La spianata è asfalto con le strisce.
- **Le strade non hanno quota.** Il borgo "sale sulla collina", ma in pianta e in 3D è un piano. Non si vede un muro di sostegno, una rampa o una scalinata come opera. Le strade di 14 m girano attorno a lotti triangolari residui, e dentro i lotti restano prato e cortili verdi a caso.
- **Il porto vecchio è un anello.** Il Molo Vecchio fa un giro chiuso grigio, con tre pontili corti. Non ci sono calata con bitte e magazzini, scalo d'alaggio, darsena interna o dogana. I quattro moli cargo spuntano dalla Rocca come pettini, senza piazzale, binario di raccordo o gru.
- **Tutto ha la stessa larghezza.** Vicolo, strada maestra e viale sono sempre "VIA grigio scuro", e la gerarchia non si legge. Il borgo vero ha 2-3 m tra le case, il corso 12-14, il rettifilo 18. Qui il borgo ha strade da circonvallazione.

## 2. Il principio: ogni epoca ha la sua opera d'ingegneria, e le opere si tagliano

La stratificazione si costruisce prima con le **opere civili** e poi con le case: muri, quote, rilevati, ponti. Sono queste a durare, e le case si adattano a loro. Generare in ordine: **terreno → opere → strade → lotti → case**. Ogni opera è un oggetto con `epoca` e ingombro, e quelle successive devono *attraversarla* (varco, ponte, sottopasso), mai ignorarla.

## 3. Le opere, epoca per epoca (coordinate finali, metri)

**Medioevo — il colle e la cala.** Il nucleo sta su un rilievo di +6/+10 m sopra il mare (x 1340-1460). Il terreno è a **gradoni di 1,5-3 m** (1-2 caselle di salto), retti da muri di pietra (`feat` muro di sostegno, già esistente sulle strade di monte: riusarlo). Fra un gradone e l'altro: STAIRS di 1-2 caselle di larghezza, e rampe cordonate (pendenza ≤ 12%) dove passano i muli. Le case poggiano a valle sul muro e hanno un piano in più verso il basso. Il risultato è che l'ingresso sta al 1° piano da un lato e al piano terra dall'altro, il che serve anche al gioco sui tetti.

**1660-1690 — la Rocca come sistema.** Il fronte di terra è a x≈1488. Davanti, in ordine: **fossato asciutto largo 16 m e profondo 5** (casella a quota −5, muri di scarpa verticali), poi la **controscarpa** e la **strada coperta** (4 m), poi lo **spalto/spianata in pendenza dolce di 50 m** (x 1440-1490) in terra battuta/GRAVEL, *senza asfalto*. Si entra da **un solo ponte** (6 m, in muratura con l'ultima campata levatoia) e da un **rivellino triangolare** nel fossato. Le **mura di tramontana** proseguono a nord lungo la costa fino a x≈1330, con il camminamento a +8 m e due mezzi bastioni. A sud c'è la **Porta a Mare** su una calata di 30 m. Oggi il governo ha asfaltato *solo* una corsia di 7 m sulla spianata, col checkpoint: è l'unica strada che tocca la Rocca.

**Settecento — il porto vecchio.** Una **calata dritta** di 120 m (QUAY, 10 m di larghezza, +1,3 m sul mare) con bitte ogni 12 m. Dietro, una cortina di **magazzini a volta** di 8×16 m in fila continua. Il **Molo Vecchio** fa da diga a gomito (6 m, con muro paraonde alto 2 m sul lato mare), la **darsena** interna è di 40×30 m, lo **scalo d'alaggio** è uno scivolo di 12 m dove le barche stanno a secco. Dalla calata al nucleo salgono **tre scalinate** perpendicolari al molo, larghe 3-4 m.

**1880 — la ferrovia.** La linea arriva da ovest su **rilevato a terra**, a 15-25 m dal mare (y≈265-275), con scogliera di massi verso il mare. Tra la linea e la città rimane una fascia di **20-40 m**: è lì la baraccopoli, dove nessuno poteva costruire legalmente perché era zona di rispetto ferroviaria. La **stazione** (fabbricato 40×12, 2 piani, piazzale 30×20, tre binari con marciapiedi) sta a x≈1200, in testa al Corso. Verso est la linea finisce in un **tronchino merci** a x≈1320, contro le mura di tramontana: lì un **varco** aperto nelle mura porta il binario di raccordo al porto. Le strade attraversano con **2 passaggi a livello** e **1 sottopasso pedonale** (cunicolo di 3 m sotto il rilevato, che è un passaggio da writer). Dove la costa rientra, un **viadotto in muratura di 5 arcate** (luce 8 m) scavalca la cala, e sotto le arcate ci sono rimesse e baracche.

**1930-1960 — il rettifilo e il cemento.** Il rettifilo (18 m) taglia i gradoni e quindi li *taglia in trincea*: muri di contenimento alti 3-5 m su entrambi i lati, con le case vecchie sospese sopra, e due **ponti pedonali** che ricuciono i vicoli tagliati. Un serbatoio pensile in cemento sta sul punto alto. Sotto il rettifilo corre il collettore fognario, che è l'ingresso al sottosuolo.

**1970-1986 — metropoli e favela.** Nella metropoli (x 1100-1250) ci sono un **viadotto stradale sopraelevato** (soletta a +7 m su pile ogni 20 m, sotto c'è il mercato e il parcheggio) e due **parcheggi multipiano**. La favela sta sulla scarpata del rilevato ferroviario e sopra i magazzini, con lamiera, scale di ferro e passerelle tra i tetti.

## 4. Fattibilità nel motore (caselle da 2 m, niente GPU)

- **Facile:** le quote a gradoni (la griglia ha già l'altezza per casella), STAIRS, muri di sostegno via `feat`, fossato come buca di caselle, rilevato ferroviario (c'è già il codice delle linee del monte con tagli e muri), calate QUAY, larghezze di strada distinte per classe.
- **Medio:** ponti e viadotti. Basta un oggetto "impalcato" con pile instanziate, non geometria per casella, e il percorso del giocatore va su due livelli solo lungo l'impalcato (come per i tetti). Va bene anche il passaggio a livello come oggetto.
- **Difficile:** le case ruotate che si appoggiano a muri di quota diversa. Regola: **niente rotazione sui gradoni** (le case seguono il muro, che è a griglia o a 0/±30° fissi), e le case ruotate solo in piano. Vietato ruotare a metà fra due quote.
- **Prestazioni:** muri, pile, arcate e bitte vanno disegnati come `InstancedMesh` per tipo, mai una mesh per casella. Le scalinate vanno fuse per gruppo. Bersaglio: meno di 300 draw call nella città su SwiftShader. L'acqua del fossato non c'è, perché è asciutto: costa zero.

## 5. Da evitare

- Strade larghe nel borgo: il massimo è 4 m, tranne il rettifilo.
- Asfalto sulla spianata e incroci a stella davanti alla Porta.
- Infrastrutture in mare senza appoggio a terra.
- Opere senza raccordo: ogni muro deve finire contro qualcosa (casa, roccia, scala), e ogni binario deve finire in una stazione, in un tronchino o in un varco.
- Verde di risulta nei lotti. Il verde va in luoghi progettati: il fossato-giardino sotto le mura, la villa sul bastione, gli orti sulla scarpata ferroviaria.
