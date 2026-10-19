# Porto Vecchio — il piano della città (consiglio di progetto)

Sintesi dei documenti di questa cartella: urbanista storico, pianificatore, level designer, set designer,
graphic designer, ingegnere, architetto storico, architetto del moderno. Coordinate in metri **finali** del gioco
(città x≈1100-1488, Rocca 1488-1610, terra y≈240-460; il generatore lavora spostato di OX=320, OY=200).

## 1. Il verdetto (tutti e otto d'accordo)

1. **Il borgo è una periferia di villette su un mare d'asfalto.** Il ventaglio di strade maestre larghe 6-8 m dalla Porta
   lo taglia in spicchi; le case sono torrette isolate col prato intorno; copertura ~45-50% dove ne servirebbe 75-90%.
2. **Gradiente, non strati.** Le tre maglie sono lo stesso generatore con parametri diversi: nessuna epoca taglia, ricopre
   o sopraeleva quella prima. Niente muri ciechi, case mozzate, lotti a cuneo, cicatrici: niente storia.
3. **Nessuna gerarchia delle strade** (tutto 6-8 m, più l'anello costiero continuo): la città non si impara.
4. **Il prato come riempitivo** è il segno più "posato a caso".
5. **Lo stesso tipo edilizio e lo stesso kit di facciata** in tutte le epoche (scale antincendio sotto la Rocca).
6. **Infrastrutture finte**: ferrovia in mare, porto ad anello, spianata stretta e asfaltata, svincolo davanti alla Porta.
7. **Il regime non ha architettura** né un sistema di segni.

## 2. Il principio

**Il generatore scrive la storia in ordine.** Terreno → opere (mura, fossati, rilevati, calate) → strade → lotti → case,
epoca dopo epoca. Ogni epoca ha **il suo tracciato, la sua misura di lotto, il suo tipo edilizio, il suo suolo e il suo
alfabeto di segni**, e ha il diritto di **demolire, tagliare o sopraelevare** quello che trova, solo con *operazioni
nominate* (la spianata, il rettifilo, le bombe, la sostituzione, l'abuso). Dove un'epoca taglia la precedente il bordo
produce sempre muri ciechi (tele per i graffiti e per il Garante), case mozzate, lotti a cuneo diventati slarghi.
Le epoche si toccano con un **bordo netto** (un corso, un muro, un taglio), mai a sfumatura.
Ogni casella e ogni edificio porta la sua **epoca** (`era`): da lì, non da un hash, discendono materiali e segni.

## 3. Le epoche (ordine di generazione)

| | Epoca | Dove | Cosa lascia |
|---|---|---|---|
| **E0** | Borgo medievale (XII-XVI) | x 1330-1488 | dorsale storta 4 m (Rua Maestra) + vicoli a pettine 2 m ogni 9-14 m (Molfetta) che finiscono sul mare o sulle mura; case a schiera 4-6×8-12 m, 2-4 piani, **muro comune**; case-torre 6×6 m 5-6 piani agli incroci (1 ogni ~40 m); Chiesa Madre col campanile e sagrato sulla dorsale, **ruotata per conto suo**; corti 6×6-8×8 lastricate raggiunte da sottopassi; cinta medievale con la Porta di Terra a x≈1325 |
| **E1** | La Rocca spagnola (1660-90) | x 1488-1610 + spianata 1440-1488 | la **spianata di 48 m si genera demolendo il bordo est del borgo**: vicoli che finiscono nel vuoto, case tagliate a metà col fianco cieco verso la Rocca, mezza chiesa sopravvissuta; fossato asciutto 15 m (-5 m), controscarpa, rivellino, ponte; cortina 12 m, bastioni con facce 35-45 m e garitte; dentro caserme lunghe 60-80×10 m **addossate alle cortine**, piazza d'armi, palazzo del governatore sull'asse, cappella, polveriera; **mura di tramontana** lungo la costa nord fino a x≈1330 con camminamento e case addossate |
| **E2** | La marina (XVIII) | costa sud del borgo, x 1330-1440 | calata dritta ~120 m (10 m, bitte ogni 12 m), magazzini a volta 8×16 in fila, case dei pescatori alte e colorate (Procida), Molo Vecchio a gomito con paraonde, darsena 40×30, scalo d'alaggio, **tre scalinate** che salgono al borgo |
| **E3** | L'Ottocento (1860-1910) | x 1215-1330 | le mura di terra diventano **il Corso** (14 m, alberato, ad arco da costa a costa a x≈1300-1330, case attaccate solo dal lato del borgo); sulla Porta di Terra la **Piazza del Mercato** ottagonale ~45 m (tettoia in ghisa, banchi a carretto: Porta Palazzo); oltre il Corso la **griglia murattiana** a filo (rot 0): isolati a corte 36×28 m, strade 8 m, cortina continua 3-4 piani, angoli smussati con bottega; la **ferrovia** (1880) sulla costa nord su rilevato a 15-25 m dal mare, **stazione** in testa alla griglia (x≈1200-1240) con piazzale e orologio, tronchino merci a x≈1320 contro le mura con un varco verso il porto; la villa comunale (40×30) sul Corso |
| **E4** | Lo sventramento del regime (1932-40) | dal Mercato alla Porta della Rocca | **un solo asse dritto di 18 m** (Via della Vittoria) che taglia il borgo in diagonale con il cannocchiale sulla Porta; portici razionalisti 5 piani a filo dell'asse (rot 0 anche dove il borgo è storto); ai bordi case tranciate, monconi di vicoli, lotti a cuneo diventati bar, edicole, gradinate; sull'innesto col Mercato la **piazza d'adunata** con la torre littoria (oggi Ministero dell'Ordine, palco del Garante) |
| **E5** | Guerra e ricostruzione (1943-60) | a macchia nel borgo e nell'Ottocento | 3-5 **vuoti di bombe** 15-25 m diventati parcheggi, campetti, palazzine fuori asse (**qui la regola rotta**, rot fino a 30°); quartiere **INA-Casa** a stecche 10×40-60 m, 4 piani, ruotate 10-25°, con **l'unico verde fra le case legittimo** (prato pubblico, filari, campetto) |
| **E6** | Boom e speculazione (1960-80) | x 1100-1215 + sostituzioni | la griglia continua ma i lotti diventano **torri 8-14 piani** con parcheggi d'asfalto; il 20-30% dei lotti d'angolo murattiani sostituito da palazzoni 8-12 piani coi fianchi ciechi (skyline seghettato); la **sopraelevata** su piloni lungo la ferrovia (y≈265) che scende sul Corso (sotto: mercato nero, gommisti, campetti, buio); **le Vele** sulla punta ovest, due stecche ~100-120 m ruotate di 25°, gallerie e passerelle, il landmark della periferia |
| **E7** | L'abuso (1965-86) | ovunque | baracche fra ferrovia e mare (lamiera, 1-2 piani, vicoli di 1 casella, densità 90%) e sulla scarpata; case non finite coi ferri; **superfetazioni** sul 40% dei tetti di E0/E3 (verande, stanze in lamiera, cassoni); corti chiuse da un corpo di un piano |
| **E8** | Il Garante (1978-86) | strato sopra | **non costruisce: occupa e taglia.** Il Muro e il posto di blocco sulla spianata e sulla Vittoria, cancelli sui vicoli, pali dei riflettori in fila, ritratti sulle testate cieche, **due isolati rasi al suolo per punizione** (lotti vuoti recintati, i graffiti più grandi), settori a stencil, antenne e telecamere sui tetti alti, container e una palazzina di cemento sopra un bastione |

## 4. Le regole

1. **Gerarchia delle strade per epoca, larghezze fisse:** vicolo 2 m · dorsale/marina 4 · strada murattiana 8 ·
   Corso 14 · Vittoria 18 · viale del boom 20 (con la sopraelevata). **Nel borgo nessuna strada sopra i 4 m tranne la Vittoria.**
   **Niente anello costiero continuo**: la costa cambia faccia (mura, marina, calata, ferrovia, scogli).
2. **Il borgo si costruisce pieno e si scava:** si parte da tutto costruito e si scavano vicoli, corti, piazzette, sottopassi.
   Copertura: borgo 75-90%, Ottocento 60-70% (con corti), boom 35-45%.
3. **Muro comune:** case adiacenti in aderenza; il varco di una casella solo se è un vicolo con un nome o un sottopasso.
4. **Niente prato di risulta.** Il verde esiste solo progettato: giardino del convento, villa comunale, prati INA-Casa,
   orti sulla scarpata ferroviaria, fossato-giardino, cima dei bastioni (erba bruciata).
5. **La rotazione ha una causa:** il borgo segue i vicoli, l'INA-Casa il terreno, le Vele il loro asse, l'abuso il caso;
   murattiano e regime mai. Niente rotazione sui gradoni.
6. **Le piazzette nascono dal residuo** (incroci di tracciati di epoche diverse, bordi dei tagli), mai per probabilità;
   più quattro messe apposta: Chiesa Madre, Pozzo, Forno, Marina. Compressione e rilascio: 60-80 m di vicolo, poi una piazza;
   mai due piazze a meno di 40 m.
7. **Altezze leggibili:** borgo 2-4 (case-torre 6), murattiano 3-4, razionalista 5, palazzoni 8-12, torri 8-14, Vele 14, torre littoria 15.
   Le case alte del borgo stanno contro le mura, mai in mezzo a una piazza.
8. **Archi e sottopassi** ogni 30-50 m di vicolo; archi di contrasto fra case opposte nei vicoli di 1 casella.

## 5. Orientarsi (Lynch, level design)

- **Tre percorsi dominanti:** la Dorsale (storta), la Vittoria (dritta), il Corso (ad arco).
- **Margini:** il mare, la spianata, il Corso, la ferrovia con le baracche, la sopraelevata.
- **Quartieri:** Borgo, Marina, Città murattiana, Torri, Vele, Baracche.
- **Nodi:** Mercato, Spianata, Stazione, Piazza della Marina, piazza d'adunata.
- **Landmark** (due visibili da quasi ogni incrocio, ognuno col suo colore di notte): il cavaliere della Rocca col
  riflettore rosso, il campanile della Chiesa Madre a maioliche, la tettoia verde del Mercato, l'orologio della Stazione
  (e il gasometro), le Vele con le lettere di scala al neon blu, la torre littoria.
- **Regola dei 60 m:** nel borgo nessuna visuale libera oltre 60 m (gomiti, archi, sottopassi); nella metropoli visuali di 300 m.
  Da ogni piazzetta un vicolo allineato su uno dei landmark.
- **Ogni vicolo è una scorciatoia** (almeno il 30% più corto della strada) o un nascondiglio, altrimenti non c'è.
- **Colli di bottiglia = porte** (Porta di Terra, arco sotto la Vittoria, sottopasso ferroviario, scala dei pescatori): lì i
  posti di blocco della Tutela, e accanto sempre un'alternativa sui tetti o nei sotterranei.
- **I tetti sono un livello:** nel borgo dislivelli di un piano al massimo (si salta), mura di tramontana come camminamento,
  passerelle abusive nel boom.

## 6. I segni (graphic e set design)

- **Il suolo è la mappa:** basoli chiari a file diagonali (borgo), porfido a cubetti e lastre (Ottocento), asfalto nero
  con strisce gialle (boom), terra battuta (baracche), lastricato grigio a giunti di 6 m (spianata).
- **Palette per epoca** (dal documento del graphic designer): calce `#efe8da` e persiane verde Genova nel borgo; tufo
  dorato `#c9a86a` della Rocca; i colori di Procida sulla marina; rosso Genova `#c4614a` e ocra nell'Ottocento; travertino
  `#e2d8c0` dello sventramento; cemento `#9a968e` coi pannelli arancio e verde e il mattone NY **solo nel boom**.
- **Insegne legate al luogo e all'epoca:** dipinte a mano in serif nel borgo, targhe di marmo e civici neri/rossi
  nell'Ottocento, lettere lapidarie sulla Vittoria (il Garante riusa lo stesso carattere con parole nuove), plexiglas e neon
  solo nel boom. Pescheria e osteria entro 40 m dall'acqua.
- **Il palinsesto murale:** ogni muro cieco ≥ 4 m porta la pila delle epoche (insegna sbiadita, manifesti, ritratto o stencil, tag, buff grigio).
- **Il Garante codifica:** settori a stencil rosso su bianco ("SETTORE 3-B": lettera = fascia, numero = distanza dalla Rocca),
  ritratti 4×6 m sulle testate cieche, densità che cala allontanandosi dalla Rocca.
- **Tre luci di scena:** borgo chiaro di giorno e buio di notte, metropoli opaca di giorno e accesa di notte, spianata sempre a giorno.

## 7. Fattibilità (ingegnere)

- Facile: gradoni e scalinate (la griglia ha la quota per casella, `STAIRS`, muri di sostegno via `feat`), fossato come buca,
  rilevato ferroviario, calate `QUAY`, larghezze per classe, epoca per casella/edificio.
- Medio: ponti, viadotti, sopraelevata come oggetti "impalcato" con pile instanziate (due livelli solo lungo l'impalcato).
- Difficile: case ruotate su quote diverse (vietato).
- Prestazioni: muri, pile, arcate, bitte come `InstancedMesh` per tipo; scalinate fuse; bersaglio < 300 draw call sulla città.

## 8. Le tappe di lavoro (ognuna si verifica con la pianta, le foto e le prove)

1. **Ossatura ed epoche.** Mappa delle epoche per casella; via il ventaglio e l'anello costiero in città; i nuovi tracciati
   (Dorsale e pettine, Corso ad arco, Vittoria, griglia murattiana, griglia del boom, linea della ferrovia e della sopraelevata);
   spianata di 48 m.
2. **Il borgo pieno e scavato.** Case a schiera in aderenza sui lotti stretti, case-torre, Chiesa Madre, corti e sottopassi,
   le quattro piazzette, le mura di tramontana con le case addossate; i tagli della spianata e della Vittoria con muri ciechi e case mozzate.
3. **La marina e il porto vecchio.** Calata, magazzini a volta, scalinate, darsena, scalo.
4. **L'Ottocento.** Corso alberato, Mercato ottagonale, isolati a corte, stazione, ferrovia sul rilevato con baracche e tronchino.
5. **Il Novecento.** Piazza d'adunata e portici della Vittoria, bombe, INA-Casa, torri e parcheggi, sostituzioni, sopraelevata, Vele, abuso sui tetti.
6. **La Rocca rifinita.** Cortina 12 m, fossato -5 m, caserme lunghe addossate, governatore, polveriera, aggiunte del 1986.
7. **I segni.** `b.era` → materiali, tetti, finestre, insegne, suoli; landmark con le loro luci; segni del Garante e della Risacca.
8. **Il gioco.** Tetti continui, scorciatoie, porte coi posti di blocco e le alternative, regola dei 60 m, rilettura con le prove.

## 9. Da evitare (tutti)

Il ventaglio di strade larghe verso la Rocca; l'anello costiero continuo; il prato come riempitivo; le case isolate nel borgo;
la stessa casa in tutte le epoche; neon e scale antincendio nel borgo; la rotazione senza una causa; le piazzette per hash;
le transizioni sfumate; le infrastrutture senza appoggio; il regime senza edifici; la metropoli che è un parco.
