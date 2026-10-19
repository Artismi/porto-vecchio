# L'architetto del moderno — la città del Novecento sopra quella vecchia

## 1. Critica: cosa ho visto

- **Un solo tipo edilizio dappertutto.** Nelle foto 3D del "borgo" (x≈1420) ci sono torrette isolate di 4-5 piani, pianta 6×8 m, scale antincendio, separate da 2-4 m di vuoto: sono palazzine condominiali anni '60, identiche a quelle della "metropoli". Il borgo non ha case a schiera addossate, non ha corti, non ha muri in comune. Il gradiente esiste solo nel codice (`w`, `fl` in walkFront), non nell'architettura.
- **L'asfalto è la figura, le case sono lo sfondo.** In pianta le strade maestre (8 m) e il ventaglio dalla Porta prendono più di un terzo del borgo; il borgo vero si misura in vicoli di 2-4 m e strade di 5. Nelle foto: piazzali viola enormi con sabbia beige ai bordi, nessuna cortina.
- **Il prato riempitivo.** Le macchie verdi dentro gli isolati (FILL lascia buchi, poi `COB → GRASS`) sono il segno più "posato a caso". Nella città densa il dentro dell'isolato è cortile lastricato, orto murato, superfetazione, mai prato.
- **La metropoli è un parco.** A x≈1160 la foto è tutta erba con una casetta; la città a griglia è un frammento di 3 isolati. Non c'è nessun segno del Novecento pubblico: niente INA-Casa, niente stecche IACP, niente Vele, niente palazzone speculativo che svetta sul tessuto vecchio.
- **Il regime non ha architettura.** La Rocca dentro è un piazzale con un edificio verde a tre piani che sembra una scuola; fuori, torri di guardia appoggiate alle case. Il fascismo (o la sua replica nel Garante) ha sempre costruito: assi, portici, torri littorie, piazze d'adunata. Qui manca del tutto.
- **Nessuna sovrapposizione.** Ogni casa è nuova e intera. Non c'è un edificio tagliato da una strada, un palazzo alto su un lotto stretto, un piano abusivo sopra un palazzetto: proprio i segni che fanno leggere le epoche.

## 2. Il principio: ogni epoca ha la sua misura, e la successiva la taglia

Generare in ordine cronologico, ogni passata con **un tipo edilizio, una misura di lotto, un modo di toccare la strada** propri, e con il diritto di **demolire o sopraelevare** quello che trova. Coordinate finali in metri; città x 1100-1488, y 240-460.

## 3. Le epoche, in ordine di generazione

**E1 — Rocca e spianata (1660-90).** Rocca da 1488. Spianata vuota **1440-1488** (48 m): niente case, lastricato e terra battuta. È la condizione di tutto il resto.

**E2 — Il borgo (1400-1800), x 1330-1440.** Tipo: **casa a schiera** 4-6 m di fronte × 8-12 di profondità (2-3 × 4-6 caselle), 2-4 piani, **muri in comune, zero distacchi**. Spina di pesce: dorsale storta 4-5 m, pettine di vicoli 2 m ogni 12-16 m. Il dentro dell'isolato: corti 4×4 / 6×6 caselle lastricate (COB), mai GRASS. Nessuna strada oltre i 5 m.

**E3 — Il borgo murattiano (1820-1910), x 1240-1330.** Griglia **rigida** a filo griglia (rot=0): isolati **24×44 m**, strade 8 m, palazzi a corte 3-4 piani, cortina continua alta uguale, cornicione unico. Il bordo verso il borgo è **un solo corso di 14 m** (la cucitura alla Bari), col mercato ottagonale (≈40 m) a Porta Palazzo all'innesto.

**E4 — Lo sventramento del regime (1932-40).** Un **asse dritto di 20 m** dalla Porta della Rocca verso ovest fino a x≈1250, che **attraversa il borgo e cancella le case che incontra**. Regola generativa: si posa il borgo intero, poi si stampa l'asse e si demoliscono le caselle sotto. Effetti obbligatori:
- sui bordi del taglio restano **case mozzate** (lotti più corti di 3 caselle, fianchi ciechi verso l'asse) e **slarghi residui triangolari** che diventano piazzette o parcheggi;
- lungo l'asse **palazzi razionalisti con portico** a piano terra (fronte 30-40 m, profondità 14 m, 5 piani, quota cornicione unica), rot=0 anche dove il borgo è storto: lo stacco di angolo fra portico e vicoli è il racconto;
- in fondo, sull'innesto con la griglia, la **piazza d'adunata** 60×40 m con la **torre littoria** (4×4 caselle, 30 m) e l'arengario: oggi è la piazza del Garante, il palco dei comizi.

**E5 — La ricostruzione e la speculazione (1950-70), x 1100-1300.**
- **Quartiere INA-Casa** (x 1100-1170): stecche 10×40-60 m, 4 piani, tetto a falde, **ruotate di 10-25° seguendo il terreno**, distanza fra stecche 1,5 volte l'altezza (~20 m) con **prato pubblico, filari, campetto**. È l'unico posto dove il verde fra le case è legittimo, ed è *disegnato*.
- **La sostituzione nella griglia murattiana:** il 20-30% dei lotti d'angolo E3 viene demolito e ricostruito come **palazzone 8-12 piani** sullo stesso sedime (fronte pieno, ma tre volte più alto dei vicini, con fianchi ciechi e pubblicità dipinta). Le mani sulla città: lo skyline seghettato.
- **Le Vele** (x 1110-1200, lungo la costa nord, accanto alla ferrovia): due megastrutture **a sezione triangolare** 100 m × 24 m alla base, 10-14 piani a gradoni, con la **galleria centrale** aperta e passerelle fra i due corpi, parcheggio sterrato sotto. Visibili da tutta la città: il landmark della periferia.

**E6 — L'abusivismo (1965-86).** Su tutto, non in una zona:
- costa nord, fra ferrovia e Vele: **baracche e case non finite** (pilastri e ferri che spuntano dal tetto, piano terra murato e piani sopra vuoti), lotti irregolari 3×3-5×5 caselle, ruotati a caso;
- **superfetazioni**: 40% dei tetti di E2/E3 riceve un volumetto (veranda in alluminio, stanza in lamiera, cassone dell'acqua), 15% delle corti del borgo viene **chiusa** da un corpo di un piano;
- negli slarghi dello sventramento, garage e baracchini.

**E7 — Il Garante e il cyber (1980-86).** Non un quartiere: uno **strato sopra**. La **sopraelevata** (metro leggera o monorotaia, 8 m d'altezza, piloni ogni 20 m) corre sull'asse del regime e sul corso murattiano, girando fino alle Vele: sotto, mercato e buio. Ponti-passerella fra palazzoni, insegne verticali sui fianchi ciechi E5, torri-antenna della Tutela sui tetti più alti, telecamere ai nodi.

## 4. Regole generative e misure

1. **Il tipo dipende dall'epoca, non dalla distanza.** Ogni edificio porta `epoca` e il renderer ne trae materiale, tetto, finestre.
2. **Contiguità**: E2 ed E3 senza distacchi (le case si toccano); E5 INA-Casa e Vele con distacchi ampi; mai la via di mezzo delle torrette a 3 m.
3. **Strade a gerarchia per epoca**: vicolo 2 m / dorsale 4 / murattiana 8 / corso 14 / asse 20. Nel borgo l'asfalto non entra.
4. **Rotazione con significato**: borgo e INA-Casa ruotano; murattiano e regime mai; abusivo a caso.
5. **Altezze leggibili**: borgo 2-4, murattiano 3-4, razionalista 5, palazzoni 8-12, Vele 14, torre littoria 15. Il salto di quota segna sempre un'epoca diversa.
6. **Regola rotta**: una casa del borgo sopravvissuta in mezzo allo sventramento (il proprietario che non vendette), una chiesa barocca inglobata in un palazzone, una stecca INA-Casa interrotta a metà.

## 5. Da evitare

Prato come riempitivo; palazzine isolate nel borgo; strade di 8 m nei vicoli; la stessa casa con altezza diversa al posto di tipi diversi; torri di guardia appoggiate alle case invece che sulla spianata; un regime senza edifici; una metropoli che è un parco.
