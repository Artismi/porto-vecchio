# Il graphic designer: la città si legge sui muri

## 1. Critica: che cosa ho visto

- **Ogni casa usa lo stesso kit, da qualunque epoca venga.** Sotto la Rocca, dove dovrebbe esserci il borgo seicentesco, ci sono torri di mattone rosso con scale antincendio alla Bronx e pannelli verdi a vetri. Le stesse torri tornano nella metropoli. Il materiale non dice né l'epoca né il quartiere: per questo tutto sembra "a caso".
- **L'asfalto viola copre il 40% dell'inquadratura,** anche nel borgo, dove le strade dovrebbero essere vicoli di basoli. Il suolo è il segno grafico più grande dello schermo e oggi dice soltanto "strada". Le isole triangolari beige fra le maestre a ventaglio sono avanzi, non luoghi.
- **La Rocca sembra fatta di casse di legno con il prato sopra.** Bastioni color pino e terrapieni verde acido: niente pietra, niente stemma, niente porta monumentale. Sulla spianata le torrette bianche sono sparse a caso.
- **Le insegne sono distribuite per hash.** `USES` assegna "BARBIERE", "TABACCHI" e "PALESTRA" alle prime case di una lista mescolata, con un neon il cui colore dipende dal mestiere e non dal luogo. Una pescheria può finire lontana dal mare e un'insegna al neon nel vicolo medievale.
- **La propaganda è un pezzo isolato.** "LA TUTELA TI PROTEGGE" sul tetto di notte funziona benissimo, ma è un caso unico. Il regime non ha un sistema visivo, e un regime orwelliano senza segnaletica non pesa.
- **Non esiste orientamento.** Mancano i nomi delle vie, i numeri civici, le chiamate di colore dei landmark. Per "perdersi e poi averla nel palmo" servono indizi che si imparano.

## 2. Il principio: ogni epoca ha un alfabeto, e i muri li tengono tutti

Ogni edificio e ogni casella ricevono `b.era` (S0-S7, gli strati dell'urbanista) e `b.quart` (il quartiere). Da questi due campi, **non da un hash**, discendono intonaco, infissi, tetto, pavimento della strada, tipo di insegna, numerazione e targhe. La stratificazione si vede quando un muro porta i segni di più epoche sovrapposte.

## 3. Gli alfabeti per epoca

| Strato | Muri e tetti | Suolo | Lettere e segni |
|---|---|---|---|
| **S0 Borgo medievale** (x 1330-1490) | calce bianca e avorio `#efe8da` `#e6dcc4`, zoccolo grigio, persiane verde Genova `#3f6a4a`, tetti piani a terrazzo con cisterne. **Niente scale antincendio, niente mattone a vista.** | basoli chiari `#cfc8b8` in file diagonali, gradini, canaletta centrale | edicole votive agli angoli (1 ogni ~40 m di vicolo), scritte dipinte a mano in serif ("VINI E OLII", "SALI E TABACCHI"), numeri civici su piastrella di maiolica, panni stesi nei vicoli ≤4 m |
| **S1 Rocca 1660-90** | tufo dorato `#c9a86a` a corsi, cordolo torico, garitte in pietra sugli spigoli dei bastioni | lastricato grigio della piazza d'armi | **stemma spagnolo scalpellato** sopra la Porta, con l'emblema del Garante imbullonato sopra in lamiera rossa. Lapide "MDCLXXIV" |
| **S2 Marina 1700** | colori di Procida/Camogli: ocra `#e0a85a`, rosa `#e08a7a`, giallo `#f0d070`, azzurro `#8ac0d0`, ogni casa diversa dalla vicina | calata di pietra, bitte, reti | nomi delle barche dipinti, "PESCHERIA" in smalto blu, cartello della cooperativa |
| **S3 Ottocento** (Corso e griglia, x 1190-1330) | intonaco rosso Genova `#c4614a` e ocra `#d9a07a`, fasce marcapiano chiare, finte bugne, persiane verdi, cornicione | marciapiedi di lastre, carreggiata a cubetti di porfido `#6a5a5a` | **targhe di marmo** "VIA GARIBALDI" incise, insegne di ferro e ottone sopra le vetrine, **civici neri per le case e rossi per le botteghe** (il sistema vero di Genova), orologio della stazione |
| **S4 Sventramento 1935** | travertino `#e2d8c0`, portici, superfici lisce | lastre larghe | **lettere lapidarie maiuscole incise** (tipo Littorio/Futura stretta) sulle testate. Il Garante le **riusa**: stesso carattere, parole nuove. Il potere cambia, il carattere resta: è questo il cuore orwelliano |
| **S5 Ricostruzione 1950** | intonaco grigio-beige, balconi in serie, numeri INA-Casa in ceramica | asfalto vecchio rattoppato | lettere in alluminio anodizzato, insegne in plexiglas retroilluminato |
| **S6 Speculazione 1965-80** (x 1060-1190, Vele) | cemento `#9a968e`, pannelli acido arancio `#e07020` e verde `#7ab040` (qui sì), mattone rosso NY e scale antincendio **solo qui** | asfalto nero, strisce gialle, tombini | **neon** (qui sì, fitto), cartelloni 6×3 m sui tetti, lettere di scala enormi dipinte sulle Vele ("SCALA C", "LOTTO 7"), Helvetica |
| **Baracche lungo la ferrovia** | lamiera, blu barca di recupero, eternit, teloni | terra battuta, binari | scritte storte a pennello, numeri a vernice sulle porte, latte usate come insegna |

## 4. Due sistemi che attraversano tutti gli strati

**Il Garante (S7): codifica e cancella.**
- Il regime ha diviso la città in **settori a stencil**: "SETTORE 3-B", rosso `#d42a1e` su campo bianco, a ogni incrocio principale e su ogni cancello di vicolo. Il codice è anche la mappa che il giocatore impara: la lettera indica la fascia (A borgo, B Ottocento, C periferia), il numero cresce allontanandosi dalla Rocca.
- I **ritratti del Garante** (4×6 m) si mettono **solo sulle testate cieche** dello sventramento e sui muri della spianata. La loro densità decresce con la distanza dalla Rocca: 1 ogni 30 m entro 120 m, poi 1 ogni 120 m.
- Il **buff grigio**: rettangoli di vernice grigia più fresca che coprono tag e scritte. Sono il segno visivo del controllo, e fra i più fitti vicino ai posti di blocco.

**La strada (Risacca, writer): risponde.**
- Le tag si concentrano **sulle cuciture**: sotto la sopraelevata, sul muro della ferrovia, sul retro del mercato, sui treni (Martha Cooper). Nel borgo poche e piccole: scritte politiche a pennello ("GARANTE BOIA") e stencil della Risacca (un'onda). Nella speculazione, wildstyle sui muri ciechi.
- I **manifesti a strati**: sulle testate, carta strappata in quattro livelli leggibili (elezioni 1976, concerto 1982, Garante 1984, controcultura 1986). È la stratificazione detta in un metro quadro.

**Regola del palinsesto murale.** Ogni muro cieco ≥ 4 m riceve una pila ordinata per epoca: insegna dipinta sbiadita (S2-S3), poi manifesti, poi stencil o ritratto del Garante, poi tag, poi buff. Da ogni livello si toglie un pezzo a caso, così si vede quello sotto.

## 5. Orientamento: cinque fari e un codice

- **Cinque landmark con un colore proprio, visibili da lontano e di notte**: Rocca (faro rosso rotante, ritratto illuminato), Chiesa Madre (campanile a maioliche giallo-verdi), mercato ottagonale (tettoia verde ghisa con lettere bianche "MERCATO"), stazione (orologio luminoso), Vele (lettere di scala al neon blu).
- **Pavimento come mappa**: basolo per il borgo, porfido per l'Ottocento, asfalto nero per la speculazione, terra per le baracche. Il cambio di suolo segna il **bordo netto** fra due epoche.
- **Insegne legate al luogo**: pescheria e osteria entro 40 m dall'acqua, ferramenta e tipografia nell'Ottocento, sala giochi e palestra nella periferia, neon vietato in S0 tranne un bar per piazzetta.

## 6. Da evitare

Lo stesso kit di facciata in epoche diverse, neon e scale antincendio nel borgo, insegne per hash, prato acido come riempitivo, torrette sparse, scritte tutte nuove: ogni segno ha un'età.
