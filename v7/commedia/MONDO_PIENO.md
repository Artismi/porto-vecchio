# Il mondo pieno: tutto quello che può succedere a Porto Vecchio (14 novembre)

Per Andrea, prima di scrivere codice. È una **visione aperta**: che cosa può accadere, dove, con quali parole, e come lo si
innesta sul sistema unico che c'è già (verbi per proprietà, fatti e segni, Mente, regista sui fili, idee e gruppi). Nessun file
del gioco è stato toccato. Ci sono due tavole:
- `_immagini/commedia/mappa_oggi.jpg`: la mappa di oggi, disegnata **dai dati veri** del gioco (non a mano);
- `_immagini/commedia/mondo_pieno_tavola.jpg`: la visione in una pagina, con due sequenze emergenti a strisce.

Vincoli di sempre: niente modelli linguistici in partita, Iris Xe e telefoni, stile fumetto-graffiti (`BIBBIA_STILE.md`), PEGI 18
accettato ma il tono resta fumetto (`TONO.md`), moneta che diventa **lo sbleuro** (plurale «sbleuri»).

---

## 0. In una pagina

1. **Ogni tentativo finisce nel mondo.** Riuscito, a metà o fallito in modo comico: ma sempre con una cosa che cambia e si vede
   (un oggetto a terra, un livido, un muro, un conto, un fatto). Mai solo parole. Lo garantisce un **contratto del verbo** (§2):
   ogni esito ha un effetto e un segno, e una prova lo controlla.
2. **Ogni cosa in mano si vede e si lancia.** Il catalogo di 435 cose ha già le proprietà: da quelle si ricava la presa, il peso, il
   lancio, il rimbalzo, la rottura e il danno. Una fisica finta (parabole, 1-2 rimbalzi, onomatopee) che costa niente sul telefono (§3).
3. **Gli NPC si difendono con quello che hanno.** Una scala dell'aggressività in 8 gradini, mossa da offesa, carattere, paura,
   testimoni e da **che cosa tengono in mano** (il tubo, la pala, la pistola). Le conseguenze restano: lividi, KO, rancori, fili di
   vendetta, Grigi (§4).
4. **Le bande e il quartiere delle Lamiere.** Propongo di far crescere **la striscia delle Baracche fra la ferrovia e il mare di
   tramontana** (Periferia Ovest, dalla Discarica alla torre dell'acqua): ci sono già 12 baracche, la grata del vapore, l'autobus
   sepolto, e sotto la Città dei Topi. Quattro bande nuove riconoscibili, con colori, segni, capi e regole, più la Famiglia, la
   Risacca e le crew di writer che ci sono già (§5).
5. **La società di carta.** La banca (che c'è già in `soldi.js`) con prestiti, interessi e pignoramenti visibili; lo Stato dei
   Grigi con la tessera, le razioni, il sussidio in cambio d'obbedienza e la delazione pagata; la burocrazia **fatta di posti e di
   cose**: code, sportelli, moduli, timbri, permessi, multe, fascicoli (§6).
5b. **Il regime** (§R): controllo del territorio per quartiere, una deriva lenta che stringe, l'intolleranza per la controcultura;
   quattro piani di attori (agenti, tenenti, generali, il Consiglio d'Amministrazione della mega-nazione aziendale) che decidono a
   tempi diversi e si comprano, si spaccano, si tradiscono; quattro indicatori lenti e reversibili; finali che emergono dalle soglie.
6. **L'economia in sbleuri**, a scala euro: 14 modi di guadagnare, onesti e no, con i numeri (§7).
7. **Costruire con le parti**, non con i modelli: asse, bancale, lamiera, tubo, ruota, corda, molla. La funzione (rampa, torre, riparo,
   ponte, zattera, catapulta) si **calcola** dalle proprietà della cosa costruita (§8).
8. **I desideri sono infiniti perché non sono un elenco.** Un desiderio è **un cambiamento voluto di una variabile del mondo**
   (qualunque: altezza, velocità, soldi, una cosa in borsa, chi possiede che cosa, l'affetto di qualcuno, quanti ti guardano, lo stato
   di un oggetto, il colore di un muro, un'idea nella testa di un altro). Nasce da una **differenza percepita**: l'invidia (Girard),
   la perdita, l'aver visto, il torto subito, il contagio delle idee, la curiosità. I mezzi si **trovano** cercando all'indietro fra i
   verbi, le strutture, i mezzi e gli oggetti per i loro effetti. «Volare», «ricco», «famoso» sono solo i nomi che `Lingua` dà a
   gruppi di variabili. **Ogni variabile nuova che entra nel gioco diventa desiderabile senza scrivere niente** (§9).
9. **Il regista tiene la varietà** con le firme dei fatti, la rotazione delle famiglie, i rari a quota e la regola del tre (§11).
10. **Il piano** (§12): prima il contratto «sempre concreto» e gli oggetti lanciabili (i più «mondo» per giorno di lavoro), poi la
    scala dell'aggressività, poi i desideri per variabili, poi le Lamiere con le bande, poi la carta (banca e burocrazia), poi le
    parti, poi il regime in due tappe. Circa **84 giorni** in tutto; i primi 5 passi, 28 giorni, cambiano già la città.

---

## 1. La mappa di oggi

La tavola `_immagini/commedia/mappa_oggi.jpg` è disegnata **dai dati del gioco caricati in Node** (`world_cittanuova.js`,
`interiors.js`, `game.js`, `livelli.js`, `sottosuolo.js`), la mappa di serie (niente `?mappa=nuova`, niente `?urbanistica2`). In alto
la città (da x 1105 a 1615 m) con i confini dei quartieri, i posti chiave, le strade grandi, i posti di sotto, i tombini, le grate e
la metropolitana; in basso l'isola intera e la legenda. Lo script che la rifà sta fuori dal repository (nella cartella di lavoro), e
si ricostruisce in 5 minuti con lo stesso metodo di `src/mappa_luoghi.js`.

### 1.1 I numeri

| cosa | quanti | da dove |
|---|---|---|
| l'isola | 1.740 × 840 m di griglia (870 × 420 caselle da 2 m); terra da x ≈ 590 a 1.605, più due isole a sud | `World.GW/GH/TS` |
| posti con nome | **251** (61 nel centro, 60 nella periferia est, 33 nella ovest, 41 foresta, 29 prateria, 13 isole, 14 Base e porto cargo) | `Game.PLACES` |
| edifici | **556**: 419 case, 66 botteghe e servizi, 6 militari, 3 chiese, 12 baracche, 4 capanni, 10 cascine, 2 fabbriche | `Game.BUILDINGS` |
| strade | 105 (di cui 31 vialetti), 9 vie grandi di città, 29 vicoli, 2 litoranee | `World.roads` |
| botteghe | 5 trattorie/osterie, 6 bar, 5 latterie, 5 merceria, 5 drogherie, 5 calzolai, 5 fruttivendoli, 3 ferramenta, 3 orologiai, 3 uffici, 2 barbieri, 2 panetterie, 2 farmacie, 2 pescherie, 2 tabacchi, 1 armeria, 1 teatro, 1 scuola, 1 circolo, 1 lavanderia; più le 5 di `economia.js` (Emporio, macelleria, fruttivendolo, fabbro, falegname) e **il Banco di Porto Vecchio** (`soldi.js`, assegnato alla casa libera più vicina a Piazza San Rocco) | `b.use`, `economia.js`, `soldi.js` |
| armi | pugni, Beretta 92, lupara, Skorpion, molotov, coltello (`Game.WEAPONS`); al Mercato di sotto pistola, munizioni, lupara, coltello, tirapugni, spray al peperoncino | `game.js`, `sottosuolo.js` |
| mezzi | Vespa, Ciao, Fiat 126, Ritmo, Giulia, Ape, furgone, fuoristrada, camion, autobus, BMX, RX-7, Skyline, Bursley; dei Grigi l'Alfetta, la Campagnola e il Blindato; in mare gozzo, lancia, motoscafo, chiatta a pedali | `Game.VK` |
| fazioni | la Famiglia (capo nascosto, 3 fidati, 12 soldati, pizzo come «Vigilanza Tirrena», bisca, macchinette), la Risacca (15 + collaboratori + cellule), le crew PVK, BDS, TNT, i Grigi della Tutela (`ordine.js`, `scontri.js`) | `fazioni.js`, `risacca.js`, `writer_vita.js` |

### 1.2 I quartieri (sono fasce da ovest a est: `World.districtAt` dipende solo da x, più «isole»)

| quartiere | dove | il carattere | i posti che lo fanno |
|---|---|---|---|
| **Prateria del Tavolato** | x < 844 (il ponente) | vuoto, vento, mestieri duri; l'altopiano carsico, le saline, il faro | il Tavolato e le doline, Saline e Casa del salinaio, Faro di Punta Scogli, l'Accampamento dei beduini, le due Stazioni di estrazione (Nord con la vecchia miniera sotto), il Campo partigiano (nascosto), i Capanni della Punta, la Spiaggia Lunga |
| **Foresta e Monte Scuro** | 844-1110 | campagna e boschi, i paesi di collina, il lavoro della terra | San Giacomo (chiesa, osteria, catacombe), Borgo dei Carbonai, Lago e Pizzo del Monte, Gola del Lupo, Ponte del Diavolo, la Grotta e l'Eremo del Romito (nascosti), Masseria Sant'Elia, Mattonificio Piras, Conservificio Sanna, il Borgo dei pescatori e le Case della Tramontana sulle due coste, Via della Memoria |
| **Periferia Ovest** | 1110-1280 | il confine povero e di passaggio: ferrovia, cantiere, caserma, rovine | la Collina dei Pini con il **Paese Vecchio** in rovina e la chiesa senza tetto, la **Caserma della Guardia** (sotto: le vecchie carceri), il **Cantiere navale**, il Distributore, la **Stazione e lo scalo merci** (sotto: la stanza murata del regime), Archivio di Stato, Biblioteca, Giardini di Ponente (sotto: **la Città dei Topi**), la **Discarica di levante** e **le Baracche fra la ferrovia e il mare** |
| **Centro: Borgo e Porto Vecchio** | 1280-1396 | il cuore pieno: piazze, botteghe, il porto | Piazza San Rocco e la chiesa (cripta, catacombe), **Piazza Grande dell'adunata** (sotto: il rifugio antiaereo), Rua Maestra, Corso Garibaldi, Via della Marina, Cinema Astor, Sala giochi Flipper (sotto: lo spaccio), **Magazzino Neri** (sotto: il deposito dei contrabbandieri, la grata sulla calata), Officina di Dorino, Forno di Lella; il porto: **Calata**, **Marina**, **Molo dei pescatori**, Molo Vecchio con la **Lanterna**, Pontile Est, Molo di Levante, lo Scalo del cantiere; Radio Luna sulla torre dell'acqua |
| **Periferia Est** | 1396-1488 | popolare e viva, la collina del Vico del Sale, il mare dei bagni | **Bar Da Gino** sulla Piazzetta del Pozzo, Teatro Odeon, Scuola elementare, **Circolo dei Lavoratori**, **Armeria del Cacciatore**, Santuario del Mare (cripta dei marinai), Pensione Gabbiano, Palazzo della Cultura, il Lido con la spiaggia e la Banja, il **covo nel bunker delle mura** (nascosto), il **Palazzo del Governo** sul bordo, il **Mercato della Rocca** sulla spianata, sotto il **borgo sepolto** del 1660 |
| **La Base (il Muro)** | 1488-1554 | il regime: muro, torri, riflettori | Varco e Posto di blocco della Vittoria, **Ministero dell'Ordine**, **Uffici del Garante**, Piazzale del Recinto, polveriere, torri di guardia |
| **Rocca e porto cargo** | oltre 1554 | la fortezza e la logistica della Tutela | **Rocca della Tutela** (cisterna e cunicolo di fuga sotto), Caserma della Tutela, Eliporto e hangar, Dogana e Magazzino del porto cargo, il Porto cargo |
| **Le isole** | a sud | fuori dal mondo | **Isola delle Palme** (4 capanni, il vecchio approdo), **Isola Grande del Sud** (il villaggio della tribù, nascosto) |

**I dodici luoghi-missione** (`World.luoghi`): Bar Da Gino, Forno di Lella, San Rocco e la cripta, Pescheria e calata, Officina dello
Scalo, il Covo, Radio Luna, Mercato della Rocca, Stazione e scalo merci, **Baracche e grata del vapore**, Posto di blocco della
Vittoria, la Rocca.

### 1.3 Che cosa c'è sotto (molto più di quanto si ricordi)

Il sottosuolo (`sottosuolo.js`, `livelli.js`) è già una seconda città:
- **le fogne** sotto le vie grandi, a 4,4 m, con **42 tombini**; **28 case con la botola** in cantina; **7 grate**, 7 botole, 2 scale
  della metro e un pozzo;
- **i posti di sotto** (20): Cripta di San Rocco e Cripta dei marinai; le **vecchie carceri** sotto la Caserma della Guardia; il
  **rifugio antiaereo** sotto la Piazza Grande; il **bunker della guerra** (con armeria e camerata); il **deposito dei
  contrabbandieri** sotto il Magazzino Neri; lo **spaccio** sotto il Flipper; il **Mercato di sotto** sotto la piazza (armi, documenti,
  timbri falsi, walkie-talkie); la **Città dei Topi** nella cisterna sotto i giardini; il **borgo sepolto** del 1660 e le **case dello
  sventramento** del 1932; tre catacombe (San Rocco, San Giacomo, il convento); la cisterna e il **cunicolo di fuga della Rocca**; la
  vecchia **miniera del Nord**; il **relitto** sotto la marina;
- **la metropolitana**: due stazioni (Mercato, presso la Stazione; Mura, presso il covo), gallerie a mezza elica, due treni;
- **la gente di sotto**: contrabbandieri, spacciatori, ricettatori, i Topi; quattro banchi che vendono e comprano;
- **la roba sepolta**: 10 ritrovamenti grandi (lo scheletro del dinosauro sotto la pineta, **l'autobus sepolto sotto la discarica**, la
  barca romana, la statua, l'auto della guerra, il rifugio dei partigiani, la stanza murata del regime, il cimitero dei cani, il
  deposito d'armi, il nascondiglio del brigante) e decine di piccoli (anfore, tesoretti, bottiglie, ossa);
- si **scava ovunque** (gallerie di terra armata, pozzi).

**Quello che manca sotto**: nessun NPC del sistema unico ci va (la gente di sotto è ferma ai suoi banchi); nessuna banda ci tiene
qualcosa; nessun fatto nasce lì. È il posto naturale dei mercati illegali (§5.5).

### 1.4 Le mappe alternative (per non confondersi)

- `?mappa=nuova` (`PV_MAPPA`): la variante «mappa nuova» (il capo di scogli, la metro che attraversa la mappa). **Non è di serie.**
- `?urbanistica2`: la fase F1 del masterplan (anelli e corti) applicata con pezze a `world_cittanuova.js`. **Non è di serie.**
- `?vecchia`: il vecchio `world.js`. Solo per confronto.

---

## 2. La regola d'oro: ogni tentativo finisce nel mondo

**La regola.** Un personaggio (NPC o giocatore) che *prova* una cosa la porta a un esito che **cambia il mondo e si vede**: o la cosa
riesce tutta, o riesce a metà, o fallisce **in modo comico ma vero** (cade, si rompe, si bagna, si sporca, lo prendono, lo deridono).
Non esiste il tentativo che resta parola: «Totò vuole volare» non può essere l'ultima riga. O Totò sale sulla rampa, o compra le
assi, o almeno cade dal muretto davanti a tre persone.

### 2.1 Come si garantisce (quattro cose)

1. **Il contratto del verbo.** Ogni verbo del registro dichiara **tutti** i suoi esiti, e ogni esito ha **un effetto sul mondo** e **un
   segno**. Oggi gli esiti sono `ok`, `meta`, `no`, `colto`; si aggiunge `comico`, e si toglie la possibilità che `no` sia vuoto:
   `no` deve dire *che cosa resta* (l'attrezzo rotto, il tempo perso, la figuraccia, la multa). `Verbo.controlla()` rifiuta un verbo
   con un esito senza `eff` o senza `segno`, come oggi rifiuta un verbo senza segno.
2. **Il fallimento comico per proprietà.** Non si scrive a mano per ogni verbo: c'è una **tavola dei guasti** per proprietà della
   cosa usata e per tipo di verbo (`GUASTI`). Il verbo che usa una cosa `fragile` come `sedile` → la cosa si rompe e chi siede cade
   (CRAC, TONF). Il `lancia` che manca il bersaglio → la cosa atterra altrove e colpisce *qualcos'altro* (la vetrina, il cappello del
   brigadiere). La `rampa` troppo ripida → si ribalta. Una ventina di righe coprono quasi tutto: `cade`, `si_rompe`, `si_bagna`,
   `si_sporca`, `colpisce_altro`, `scappa_via` (rotola, vola, galleggia via), `resta_incastrato`, `figuraccia` (pubblico ≥ 3), `scoperto`.
3. **La scadenza delle intenzioni.** Ogni voglia e ogni piano della Mente hanno una scadenza. Se scade, **non sparisce**: chiude con il
   verbo `rinuncia`, che è un fatto con una posa (il gesto della mano, il cappello sbattuto a terra), un motivo («manca la lamiera») e
   una conseguenza piccola ma concreta (la roba comprata resta in casa, l'attrezzo prestato va reso: nasce un filo). Il buco del
   vocabolario si conta in `st.u.gruppi.mancanti`, come oggi, ma **il personaggio fa comunque una cosa**: il mezzo più vicino che c'è
   (§9.6, l'approssimazione).
4. **Il divieto della bolla vuota.** Una bolla d'intento («vuole volare», «come facciamo?») si mostra solo se **il primo passo
   comincia entro 60 s di gioco**. Il fatto `come_facciamo` deve essere seguito da un verbo del piano o da `rinuncia` entro la sua
   finestra.

**La prova** (`test_unico_concreto.js`, Node, semi 1-5, 3 giorni): ≥ 95% delle voglie chiuse con un fatto che cambia una variabile del
mondo (§9.2); 0 voglie aperte da più di un giorno senza un passo; ≥ 1 fallimento comico ogni 2 ore di gioco nel raggio del giocatore.

---

## 3. Gli oggetti in mano: tutto si vede, tutto si lancia

### 3.1 In mano, sempre

Ogni cosa che un corpo usa **si vede in mano** per tutta la durata del verbo. Oggi `vprop` di `anim_vita.js` ha i modelli di una parte
delle cose; le altre prendono il **generico per proprietà** (la cascata di `STRUMENTI_NPC` §4.6): `lungo` + `rigido` → un bastone
della lunghezza giusta, `contenitore` → una scatola del colore della categoria, `piccolo` → un pugno chiuso con un punto di colore,
`stoffa` → un panno che pende, `liquido` → una bottiglia. La sagoma conta più del dettaglio (si vede a 30-60 px). Le cose grandi
(bancale, lamiera, porta, frigo) si portano **con due mani sopra la testa o trascinate** (`porta_su`, `forza`).

### 3.2 Si lancia tutto quello che pesa meno di 8 kg (e il resto si spinge)

Dalle proprietà del catalogo (`UnicoCatalogo.PROP`, 24 oggi, 40 nel progetto del vocabolario) si ricavano **sei numeri** per ogni
cosa, senza scriverli a mano:

| numero | da che cosa | a che serve |
|---|---|---|
| peso (kg) | categoria + `pesante`, `piccolo`, `metallo`, `legno`, `liquido` | gittata (≤ 8 kg si lancia, 8-40 si spinge o si trascina, oltre ci vuole il gruppo) |
| rimbalzo (0-1) | `rigido`, `metallo` alto; `molle`, `stoffa`, `commestibile`, `liquido` zero | quante volte rimbalza (0, 1 o 2) |
| rottura | `fragile` → si rompe al primo urto; `rigido` di `legno` sopra 5 m/s → si spacca; il resto resta | i pezzi a terra (decalco) |
| danno | `peso × velocità` × (1,6 se `appuntito`, 1,3 se `metallo`, 0,2 se `molle`) | il gradino di ferita (§4.4) |
| sporco | `molle`, `liquido`, `commestibile` | chi è colpito si sporca (vergogna, non danno) |
| fuoco | `infiammabile` + `liquido` + `contenitore` (la molotov) | fiamma per 30-90 s, la bruciatura che resta 3 giorni |

**La fisica finta, pensata per il telefono.**
- La traiettoria è **una parabola analitica** (c'è già: `st.proj` e `Game.npcThrow`, `game.js:2664`), non un corpo rigido. Il rimbalzo
  è una seconda parabola con la velocità × rimbalzo, sul piano del suolo; il muro è la casella `BLD` (si rimbalza all'indietro o ci si
  rompe contro). Niente rotazioni vere: un giro di 360° finto sull'asse lungo per le cose lunghe.
- Tetti: **al più 12 proiettili in volo** (il 13° fa cadere il più vecchio), **40 cose a terra per quartiere** (le più vecchie spariscono,
  i cocci dopo 1 ora di gioco, le cose intere dopo 1 giorno o quando qualcuno le raccoglie: e qualcuno le raccoglie, §9).
- **L'onomatopea** (TONF, CRASH, SPLAT, SDENG, BOING, PLIC) è la parola disegnata dello stile D, scelta dalla tavola (materiale del
  proiettile × materiale del bersaglio). È il 90% della lettura: costa un'etichetta.
- Lontano (oltre 60 m) non si simula il volo: si calcola l'esito e si posa la cosa all'arrivo.

### 3.3 Usare le cose oltre la loro funzione

Il verbo `usa_come` (già nel vocabolario) diventa la regola generale: **ogni ruolo di ogni verbo accetta qualunque cosa che abbia le
proprietà**. Esempi che vengono da soli: la padella come scudo (`grande` + `rigido`), l'ombrello come paracadute (`stoffa` + `lungo`:
rallenta la caduta del 30% e si rovescia: esito `comico` quasi certo), la baguette come spada (si spezza al secondo colpo), la
cassetta del pesce come sgabello per vedere il comizio, il materasso per attutire il salto dal balcone, la porta di recupero come
zattera (galleggia) o come barella, la scala come ponte fra due tetti, il carrello come ariete, il secchio come elmo, la rete da pesca
per prendere chi scappa.

**Le armi improvvisate** sono solo questo: il ruolo `colpo` (rigido · pesante) e `proiettile` (lanciabile) riempiti con quello che c'è.
Il tubo della ferramenta, la pala del cantiere, il remo, la catena della Vespa, la bottiglia rotta (che da `fragile` diventa
`appuntito` dopo il primo colpo: la rottura **cambia le proprietà**, ed è una regola sola).

---

## 4. La scala dell'aggressività: tutti si difendono con quello che hanno

Oggi solo i Grigi e la banda combattono (`azioni.js`, `scontri.js`, `risacca.js`). Il progetto: **chiunque**, provocato, sale una scala.

### 4.1 I gradini

| # | gradino | verbo | si vede |
|---|---|---|---|
| 0 | nota | `guarda_storto` | la testa si gira, un «?» o un «!» |
| 1 | borbotta | `borbotta` | la nuvoletta grigia senza parole |
| 2 | insulta | `insulta` (dalla banca delle battute, filtrata da commedia) | la striscia D, `rabbia` |
| 3 | spinge | `spingi`, `schiaffo` | SCIAFF, l'altro barcolla |
| 4 | minaccia con quello che ha | `minaccia_con` (il ruolo `colpo` o l'arma) | alza la cosa, `mira`/`indica` |
| 5 | colpisce a mani o con una cosa | `picchia` | `anim_lotta`, TONF |
| 6 | arma bianca | `picchia` con `appuntito` | il coltello, la bottiglia rotta |
| 7 | arma da fuoco | `spara` (`Game.shoot` per gli NPC) | BANG, il bossolo |

### 4.2 Che cosa fa salire o scendere

Ogni battito di confronto si calcola una **voglia di salire**:

`salire = offesa × (0,5 + rabbia + zelo) − paura × (1 + viltà) − freno`

- **offesa**: dal fatto subito (`Fatto.GRAV`, `Fatto.OFFESE`: lo sgarbo 0,2, il furto 0,5, la spinta 0,6, l'aver toccato la famiglia 0,9),
  più il rancore che c'è già fra i due (`rel.rancore`).
- **paura**: la forza percepita dell'altro (che cosa tiene in mano, quanti sono, la reputazione «temuto») contro la propria (che cosa
  tengo **io** in mano: il pescatore col remo è più coraggioso del pescatore senza).
- **freno**: i testimoni (più sono, più vergogna di salire, tranne per il teatrale), un Grigio entro 30 m (freno forte, tranne per chi
  è già ricercato), un parente o un bambino vicino, l'ebbrezza (la toglie: il freno si dimezza).
- **che cosa ha in mano** decide il gradino massimo: senza niente si arriva al 5; con un `colpo` al 5 con danno più alto; con un
  `appuntito` al 6; con un'arma da fuoco al 7, ma **solo** se è già della malavita, delle bande o dei Grigi, o se il torto è enorme
  (la famiglia) e il carattere è estremo. L'arma da fuoco in mano a un civile è rara e si vede arrivare (va a prenderla a casa: un piano
  in più, e un filo).

**Si scende** con i verbi della pace, che la Mente sceglie come gli altri: `scusati`, `ridi` (per chi è allegro), `paga` (offrire il
caffè, rendere la cosa), `scappa`, `arrenditi`, e da fuori `separa` (l'amico, il passante coraggioso, il prete). Ogni gradino ha
almeno una via d'uscita: la scala non è un tubo.

**Chi si unisce**: gli amici (`rel.affetto` alto) e i membri dello stesso gruppo entro 20 m entrano alla pari (`in_gruppo`), i vili
scappano e vanno a chiamare qualcuno (un fatto, un filo).

### 4.3 Le conseguenze che restano

- **Ferite a gradini**: livido (−umore un giorno), taglio (va all'ambulatorio: una coda, §6.3), braccio rotto (niente lavoro per 5
  giorni → manca la paga → nasce la voglia di soldi, §9), **KO** (a terra 20-60 s, frugabile: chi passa può rubargli il portafoglio).
  La morte solo ai gradini 6-7, ed è un fatto enorme (funerale, Gazzetta, vendetta quasi certa).
- **Il filo di vendetta** (famiglia `offesa` del regista): l'offeso ha la voglia di **rovesciare** il cambiamento subito (§9.3, la
  rimostranza): se ha perso la faccia in piazza vuole che l'altro la perda in piazza.
- **I Grigi**: chi ha visto può `denuncia` o `testimonia`; il fascicolo (§6.3) cresce; sopra il gradino 5 parte la ricerca (`ordine.js`).
- **La reputazione**: «temuto» sale per chi vince, «ridicolo» per chi perde davanti a molti, «vigliacco» per chi scappa.

### 4.4 Tono

PEGI 18 accettato, ma **fumetto**: i colpi sono onomatopee e pose, non sangue realistico; il KO ha le stelline; la morte è rara e
pesa. La comicità viene dalle armi improvvisate (la baguette che si spezza, il secchio in testa) e dalla priorità sbagliata («la
camicia nuova!»).

---

## 5. Le bande e il quartiere delle Lamiere

### 5.1 Dove: la striscia delle Baracche (Periferia Ovest)

**La proposta**: far crescere **la striscia fra la ferrovia e il mare di tramontana, dalla Discarica di levante (x ≈ 1235) alla torre
dell'acqua di Radio Luna (x ≈ 1307)**, e dargli un nome suo: **le Lamiere**. Si allarga poi sul fianco della **Collina dei Pini** verso il
**Paese Vecchio** in rovina.

Perché qui e non altrove:
1. **C'è già**: 12 baracche di lamiera (`shack`, epoca E7), il **Passo delle Baracche**, la **grata del vapore**, la torre dell'acqua, il
   luogo-missione n. 10 «Baracche e grata del vapore» (hub e segreto), **l'autobus sepolto** sotto la discarica.
2. **I materiali sono lì**: la Discarica (lamiere, bancali, pneumatici, frigoriferi) e il Cantiere navale a 100 m. La costruzione libera
   (§8) ha la sua cava.
3. **Il sotto è lì**: la Città dei Topi sotto i Giardini di Ponente, le vecchie carceri sotto la Caserma, la stanza murata del regime
   sotto la Stazione, la metropolitana (stazione Mercato). I mercati illegali hanno dove stare.
4. **La tensione è lì**: la Caserma della Guardia a 100 m, la Stazione (il contrabbando dei treni), l'Archivio di Stato (i fascicoli). Il
   regime è vicino ma non dentro: la Base è dall'altra parte della città.
5. **Non blocca niente**: è fuori dal centro denso, lontano dai percorsi obbligati; le baracche nuove non tagliano le vie del
   giocatore (il vincolo di `COSTRUIRE_IN_CITTA.md`).
6. **C'è dove crescere**: il prato e la pineta della Collina dei Pini, le case crollate del Paese Vecchio (le rovine diventano basi).

Le alternative, come seconde sedi: **l'Isola delle Palme** (4 capanni e un approdo: il covo dei contrabbandieri via mare); **il Paese
Vecchio** da solo (una banda di collina); **il Borgo dei Carbonai** (una banda di campagna).

### 5.2 Come cambia il quartiere

- **Cresce da sé** con la costruzione (§8): chi non ha casa, chi è sfrattato (il pignoramento, §6.1), chi arriva, tira su una baracca
  con le parti della discarica. Tetto: 60 baracche nella striscia, 30 sulla collina.
- **I colori**: ogni banda dipinge le sue baracche (`dipingi_baracca`), le sue porte e i suoi muri; il quartiere diventa a toppe di
  colore (lo stile lo vuole: campiture grandi e calme, `BIBBIA_STILE` §0.3).
- **I segni**: le tag delle bande sui muri di confine; le scarpe appese al filo; i cartelli scritti a mano («Qui comanda la Ciurma»).
- **I posti di ritrovo**, uno per banda: il **falò sotto la torre dell'acqua**, **l'autobus** (dissotterrato, diventa una base),
  il **campetto sulla discarica spianata**, la **chiesa senza tetto** del Paese Vecchio, il **pontile** della Spiaggetta del Gabbiano.
- **Le regole del quartiere** (fatti stabili, come la zona autonoma di `COSTRUIRE_IN_CITTA.md`): i Grigi entrano solo in tre; si
  baratta; di notte il generatore rubato della discarica fa luce (il verbo `allaccia_corrente`).

### 5.3 Le bande (identità nostre, niente stereotipi d'importazione)

Le bande nascono dal paese: il porto, la discarica, i motorini, la collina. I colori stanno nella tavolozza dello stile.

| banda | chi | colore e segno | tag | il capo | le regole | il mercato | la base |
|---|---|---|---|---|---|---|---|
| **La Ciurma** | figli di portuali e pescatori, 16-25 anni | oltremare e carta, la **maglia a righe**; l'ancora capovolta | ancora con due gocce | **il Nostromo** (Totore, 24 anni, ha fatto il mozzo sulla nave) | non si ruba ai pescatori; chi tradisce si butta in mare (vestito) | contrabbando dalla nave: sigarette, benzina, cassette | il Magazzino Neri e il deposito di sotto; il pontile |
| **I Lamierini** | chi vive nelle Lamiere, famiglie intere | ruggine (cotto) e ocra; la lamiera ondulata a zig-zag | zig-zag in tre colpi | **la Zia Ruggine** (Assunta, 58 anni, vedova, tiene la cassa) | chi entra porta una lamiera; nessuno dorme fuori; la discarica è di tutti | ricettazione (la roba rubata passa da lei), rottami, armi riciclate | l'autobus sepolto, il falò sotto la torre |
| **I Saette** | ragazzi dei motorini del Corso | viola e nero; il casco dipinto; la saetta | saetta con la «S» | **Freccia** (Dario, 19 anni, la Vespa truccata) | chi cade si rialza da solo; mai a piedi | scippi, consegne veloci, gare clandestine, ricambi rubati | la Corte del Flipper, l'Autorimessa Centrale |
| **I Carbonai** | quelli della collina e del bosco | verde bosco e osso; la pigna | pigna con la fiamma | **il Pastore** (Bachisio, 45 anni, poche parole) | il bosco non si brucia; chi parla con i Grigi non sale più | l'erba del Monte (coltivata nelle radure), la legna, la carne di contrabbando | il Paese Vecchio, la carbonaia |
| la Famiglia (c'è) | 15 uomini, capo nascosto | il grigio dei completi, nessuna tag | — | il capo senza nome | la piramide (`fazioni.js`) | pizzo, bisca, macchinette, prestiti a strozzo | la base segreta, la lavanderia, il Flipper |
| la Risacca (c'è) | resistenza | la lanterna verde | il pugno con l'onda | (i 15) | le cellule non si conoscono | collette, volantini, armi per la causa | il covo nel bunker delle mura |
| le crew (ci sono) | writer | — | PVK, BDS, TNT | — | i muri | — | — |

**Le crew si legano alle bande** (PVK con la Ciurma, BDS con i Saette, TNT indipendente): i muri diventano confini.

**Le figure ricorrenti** dentro ogni banda (ruoli, non persone scritte): il capo, la cassiera, il picchiatore, il pulcino (il più
giovane, che vuole farsi vedere: il motore della comicità), il palo, la voce (chi porta le dicerie), la madre che viene a riprendersi
il figlio.

### 5.4 Il territorio

- **Si misura con i fatti**, come dice `PROGETTI.md` §3.2: per cella di 40 m, l'influenza di ogni banda sale con le tag, le vendite, le
  risse vinte, la presenza dei membri, e scende con gli arresti, le tag crossate, le risse perse. Si vede: dove una banda è forte le
  sue tag sono fresche e i suoi colori sono sui balconi (i panni stesi del colore).
- **Il confine** è dove due bande sono vicine alla pari: lì nascono le liti (§5.6).

### 5.5 I mercati (e la concorrenza)

| mercato | dove | chi vende | il prezzo | la concorrenza |
|---|---|---|---|---|
| **lo spaccio** (erba, pillole: le «sostanze» restano generiche, non si glorifica) | il Flipper e sotto; la collina | Carbonai, Famiglia | 20-40 sbleuri la dose | il ribasso; la soffiata ai Grigi del rivale |
| **la ricettazione** | l'autobus, il Mercato di sotto | Lamierini | paga il 30% del valore, rivende al 60% | chi paga di più prende la roba migliore; il ladro si fa la reputazione con chi paga |
| **le armi** | il Mercato di sotto (c'è già), il bunker | Lamierini, Famiglia | pistola 450, lupara 300, coltello 25, tirapugni 15 | una banda che controlla le armi decide chi le ha: la leva più forte |
| **il contrabbando** | la nave, il deposito sotto il Magazzino Neri | Ciurma, Famiglia | sigarette a metà prezzo, benzina −40% | il carico conteso al porto |
| **i ricambi e i mezzi rubati** | l'Autorimessa, la discarica | Saette | una Vespa rubata 600 (nuova 2.500) | il proprietario che se la ritrova (`riprendi_auto`) |
| **la protezione** | tutto | Famiglia, poi chi vince | 50-150 a settimana per bottega | la bottega che paga due volte; quella che non paga più nessuno |

Il prezzo lo fanno **le scorte e la domanda** (`economia.js` lo fa già per le botteghe): una banda può abbassarlo per prendersi i clienti.

### 5.6 La guerra fra bande

Una scala come quella dell'aggressività, ma di gruppo, con un gradino per volta (al più 2 al giorno, `BIBBIA_MONDO` §6):
1. lo **sgarro** (un cliente rubato, uno sguardo alla sorella del capo);
2. la **tag crossata** sul muro di confine;
3. il **pestaggio** di un pulcino;
4. la **spedizione**: in gruppo nel territorio dell'altro, si rompe qualcosa (la baracca, la Vespa);
5. **l'agguato**, con le armi improvvisate o vere;
6. **la sparatoria**, rara, con i Grigi che arrivano.

La **tregua** arriva per una ragione del mondo: la Famiglia media (al bar, con la stretta di mano), un funerale, il nemico comune (la
retata dei Grigi nelle Lamiere), un amore fra i due lati (il filo d'amore che attraversa la guerra), la festa del patrono.

### 5.7 Le bande e i Grigi

- **La retata** nelle Lamiere: tre Campagnole, i fermi (`Popolo.arrest`), lo sgombero delle baracche più nuove pezzo per pezzo.
- **La sparatoria** con la Guardia: la regola di ferro di `scontri.js` («se alzi una barricata devi essere pronto a sparare»).
- **La corruzione**: la Famiglia paga le mazzette (`F.bribes`); le bande nuove devono trovare il loro Grigio.
- **L'infiltrato**: un membro che prende il premio della delazione (§6.2). Se si scopre, è la storia più grossa della settimana.

### 5.8 Da dove nascono: le idee e i gruppi

Le bande **non si piazzano**: nascono dal sistema delle idee e dei gruppi (`unico_idee.js`, `unico_gruppi.js`). Un gruppo diventa una
banda quando ha **un territorio** e **un mercato**: cioè quando il suo obiettivo collettivo, per i tratti dei membri (il losco, lo
zelo), passa da «essere visti» o «avere soldi» a un mezzo losco che funziona e si ripete. Le quattro bande della tabella sono i **semi**
che il regista mette all'inizio (con nome, colore, capo), ma altre possono nascere e morire: un gruppo di pescatori arrabbiati con la
dogana che diventa una seconda Ciurma, una scissione dei Saette.

**Il reclutamento** è **mimetico** (§9.3): il ragazzo che vede il pulcino della Ciurma con le sigarette e la maglia a righe **vuole la
maglia a righe** e quello che viene con lei (soldi, sguardi, paura degli altri). La madre che lo viene a riprendere è il ramo
contrario.

### 5.9 Il giocatore e le bande

- **Comprare le armi** e **vendere la roba rubata** (ai prezzi della §5.5); farsi un nome con chi paga meglio.
- **I lavoretti**: il palo, la consegna, la tag sul muro del rivale, il motorino da portare via.
- **Entrare**: la prova d'ingresso (un lavoretto davanti a testimoni); poi si portano i colori, e **tutti ti riconoscono** (le altre
  bande, i Grigi). Si sale di grado.
- **Tradire**: vendere i compagni ai Grigi (il premio della delazione), passare a un'altra banda. È un fatto che la città non dimentica.
- **La presa di corpo** (`SISTEMA_UNICO` §8.3) vale anche qui: si può prendere il posto del pulcino della Ciurma.

---

## 6. La società: banca, Stato e carta

### 6.1 La banca (c'è già a metà: `soldi.js`)

**Che cosa c'è**: il Banco di Porto Vecchio, i conti di tutti, i bancomat, il portavalori, il congelamento dei conti della Tutela, la
rapina. **Che cosa si aggiunge**:
- **i prestiti**: allo sportello (la coda, il modulo, il colloquio col direttore), con l'interesse (12% l'anno, cioè circa 1% al mese
  di gioco), la scadenza e la **garanzia** (la casa, la barca, la Vespa: una cosa vera del mondo);
- **la rata** che si addebita ogni lunedì; due rate saltate → **il pignoramento**: l'ufficiale giudiziario con due Grigi entra in casa e
  **si porta via le cose** (una per volta, si vedono uscire: la televisione, la sedia buona), sulla porta il cartello «PIGNORATO»;
  le cose vanno **all'asta in piazza** il sabato (chiunque può comprarle: il vicino che si compra la poltrona del pignorato è una
  storia);
- **lo strozzino** come alternativa (la Famiglia: 10% alla settimana, niente moduli, il picchiatore alla scadenza);
- **gli NPC** usano tutto questo come il giocatore (stesse funzioni, `Verbo.fai`): il pescatore che chiede il prestito per il motore
  nuovo, la vedova pignorata;
- **le idee che ne nascono**: rancore verso la banca e i Grigi (il pignoramento), gratitudine (il prestito che ha salvato la bottega),
  invidia (il vicino che si è comprato la poltrona all'asta).

### 6.2 Lo Stato dei Grigi: il welfare con le condizioni

- **La tessera annonaria** (il Comandante gabbiano ha la n. 41): dà diritto alla **razione** settimanale allo sportello annonario
  (pane, olio, zucchero, una scatoletta). Si ritira **in coda**. Chi ha il fascicolo «sporco» se la vede sospesa.
- **Il sussidio** (di disoccupazione, di famiglia, di vecchiaia): 280 sbleuri al mese, **in cambio d'obbedienza**: il certificato di
  buona condotta, la presenza all'adunata in Piazza Grande, il Bollettino ascoltato.
- **Il premio della delazione**: 50-200 sbleuri per una soffiata che porta a un fermo; il nome resta nell'archivio (e l'Archivio di
  Stato si può scassinare: lì ci sono **i nomi di chi ha parlato**: una delle storie più grosse del gioco).
- **I posti d'onore**: il posto in Comune, la licenza del chiosco, la casa dell'Ente Case del Garante, dati agli obbedienti.

### 6.3 La burocrazia fatta di posti e di cose

La burocrazia non è un menu: **è un posto dove si va, una coda dove si sta, una cosa che si tiene in mano**.

| elemento | nel mondo | i verbi |
|---|---|---|
| **gli uffici** | il Palazzo del Governo (anagrafe, permessi), gli Uffici del Garante (sussidi, ricorsi), l'Archivio di Stato (fascicoli), l'Ufficio Tributi e gli uffici Tina, Mario e Bruno della periferia est, lo sportello annonario, la Caserma della Guardia (denunce, multe) | `vai`, `entra` |
| **le code** | persone in fila vera davanti allo sportello (un percorso a serpentina, fino a 12), col numeretto; chi salta la fila, chi tiene il posto per un altro, chi vende il posto | `fai_la_fila`, `salta_la_fila`, `tieni_il_posto`, `vendi_il_posto` |
| **gli sportelli** | un impiegato NPC con il suo orario, il suo carattere (lo zelante, il distratto, il corrotto), la pausa caffè alle 10:30 («torni dopo») | `chiedi`, `insisti`, `corrompi_impiegato` |
| **i moduli** | oggetti di carta (`carta`): Modulo 7 (permesso), 12/bis (sussidio), 31 (ricorso), 44 (denuncia); si compilano (bene o male: l'abilità), si perdono, si fanno volare (`lancia`!) | `compila`, `perdi`, `falsifica` |
| **i timbri** | il timbro è un oggetto (e il `timbro_falso` si compra già al Mercato di sotto) | `timbra`, `ruba_timbro` |
| **i permessi** | di costruire (la baracca legale è più dura allo sgombero), di vendere in strada (il banco ambulante), di riunirsi (la festa, il corteo), di pescare (le reti), di portare armi (la lupara del cacciatore) | il permesso è un oggetto in borsa: si mostra al controllo |
| **le multe** | il foglietto che il Grigio scrive davanti a tutti; si paga in posta o si fa ricorso (la coda di nuovo) | `multa`, `paga_multa`, `ricorso`, `strappa_multa` |
| **i fascicoli** | una scheda per persona nell'Archivio, che cresce con i fatti che i Grigi conoscono (denunce, testimonianze, fermi, presenze ai cortei); il livello decide quanto ti fermano ai posti di blocco | `scheda`, `ruba_fascicolo`, `brucia_fascicolo` |

**La comicità viene da sola**: la pratica che rimanda a un'altra pratica, il timbro che manca, l'ufficio che chiude mentre tocca a te,
il gabbiano in coda col suo numeretto. **Le idee vengono da sole**: il permesso negato, il sussidio sospeso, la multa ingiusta sono
fatti con un peso nella tabella `DA_FATTI` di `unico_idee.js` (rancore verso i Grigi) e radici di fili («il ricorso di Gavino»).

---

## R. Il regime: un potere che si stringe, si compra e si può battere (ma piano)

La direzione: un regime **militare e di polizia** che controlla il territorio **quartiere per quartiere**, difficile da battere. Lo si
batte solo con **una parte grande della popolazione** contro di lui **più la banda del giocatore**, in **settimane o mesi** di gioco,
con curve lente, quartiere per quartiere, e con la possibilità di tornare indietro. In cima non c'è un dittatore: c'è **il Consiglio
d'Amministrazione** di una mega-nazione aziendale straniera, che ha fatto l'invasione e vuole i numeri del trimestre.

Si innesta su quello che c'è: `ordine.js` (turni, ronde, volanti, posti di blocco, coprifuoco, documenti, fermi), `scontri.js` (la
scala della violenza di piazza), `fazioni.js` (le mazzette della Famiglia, `F.bribes`), e soprattutto sul giro chiuso di
`unico_gruppi.js`: il **calore** di un gruppo → il fermo (`Popolo.arrest`) e lo sgombero → i fatti `repressione` e `sgombero` → le
idee contro i Grigi in chi ha visto (`unico_idee.js`, `DA_FATTI`). Il regime non è uno script: è **un altro insieme di attori** con
menti, idee e gruppi, che fanno verbi e lasciano fatti come tutti.

### R.1 Il controllo del territorio, quartiere per quartiere

Per ogni quartiere (`World.districtAt`, le 8 fasce della §1.2) il regime ha un **controllo C** (0-100) fatto di cinque cose che si
vedono in strada:

| leva | che cosa si vede | quanto pesa |
|---|---|---|
| **presenza** | Grigi a piedi, la Campagnola parcheggiata, il Blindato | il numero di agenti assegnati |
| **posti di blocco** | transenne, la sbarra, il riflettore; i documenti chiesti | quanti e dove (le bocche del quartiere) |
| **ronde** | le pattuglie a orario, a piedi e in volante | la frequenza |
| **coprifuoco** | dall'ora decisa al mattino (oggi 23-5, `ordine.js`); i lampioni spenti, le serrande | l'ora d'inizio (più presto = più stretto) |
| **informatori** | non si vedono: si capiscono dai fermi «troppo precisi» | quanti a libro paga nel quartiere (§6.2) |

C cambia **lento**: al più ±3 al giorno per quartiere, con un'inerzia. Il controllo del **centro** e della **Base** parte alto (80 e
100), quello delle **Lamiere** e della **collina** basso (35-40): lì il regime entra in tre e di giorno.

### R.2 La deriva: il regime si stringe da solo

- **Il fondo è una deriva lenta verso l'alto**: ogni settimana di gioco, senza niente, la durezza di base sale di un poco (+1 al
  controllo di ogni quartiere, il coprifuoco 10 minuti prima ogni due settimane, un posto di blocco in più ogni mese). È il
  «stringere» naturale di un potere che si sente sicuro.
- **Se la gente non fa guai** il regime **opprime meno** (la deriva rallenta, le ronde si diradano), **ma resta abbastanza aggressivo**
  e **non tollera la controcultura**: i ragazzi con le bombolette, la musica dalla radio pirata, il giocoliere senza permesso, i capelli
  colorati, la festa non autorizzata vengono colpiti anche quando tutto il resto è calmo. È un regime che si annoia e cerca il
  colpevole piccolo.
- **I gradi della risposta** (scelti dall'agente o dal tenente per il fatto e il quartiere):

| grado | risposta | per che cosa, di solito |
|---|---|---|
| 0 | ignora (o non vede) | il furto piccolo nelle Lamiere, se nessuno protesta |
| 1 | richiamo, documenti | lo sguardo storto, l'assembramento |
| 2 | multa, sequestro della cosa (la bomboletta, la radio, il pallone) | la tag, la musica, il banco abusivo |
| 3 | perquisizione e fermo per una notte | la tag sul muro del regime, la rissa, il coprifuoco |
| 4 | il pestaggio in cella, la schedatura | la recidiva, la mancanza di rispetto all'agente |
| 5 | lo sgombero, la retata di quartiere | la baracca, la barricata, il gruppo con calore alto |
| 6 | la carica in piazza, i lacrimogeni, l'idrante (`scontri.js` livello 1) | il corteo, la protesta |
| 7 | le armi, il coprifuoco totale, la legge marziale nel quartiere | la sparatoria, l'agente ucciso |

### R.3 La gerarchia: quattro piani di attori, quattro tempi

Ogni piano è fatto di **attori** del sistema unico (corpo, Mente, idee, relazioni): hanno obiettivi propri, rivalità, paura, avidità.
Decidono a **tempi diversi**, ed è questo che rende il regime vivo senza costare: in basso decide spesso e poco, in alto decide di
rado e tanto.

| piano | chi (nel gioco) | decide ogni | che cosa decide | i loro obiettivi | dove stanno |
|---|---|---|---|---|---|
| **agenti** | i Grigi in strada, la Guardia, la celere (≈ 60) | minuti | il grado della risposta (§R.2) al fatto che vedono; chi fermare; se prendere la mazzetta | il turno tranquillo, la paga, non farsi male, la promozione, l'odio personale per qualcuno | strada, Caserma della Guardia, posti di blocco |
| **tenenti** | uno per quartiere (8), più il comandante della Guardia | giorni | **la politica del quartiere**: coprifuoco, posti di blocco, ronde, quanti informatori, chi è «da tenere d'occhio», le ordinanze locali | le cifre del quartiere (arresti, quiete), non farsi scavalcare dal collega, arrotondare (la Famiglia, il contrabbando) | il Ministero dell'Ordine, gli uffici del Palazzo del Governo |
| **generali** | tre (Ordine, Base, Porto), più **il Garante**, che è la faccia | settimane | **le campagne**: «Operazione Lamiera Pulita», la stretta sui writer, la retata del porto, chi va trasferito, i rinforzi | la carriera, i trofei, la guerra fra loro per i rinforzi e per il favore del Consiglio | la Rocca, la Caserma della Tutela, gli Uffici del Garante |
| **il Consiglio d'Amministrazione** | sette consiglieri della **Compagnia** (la mega-nazione aziendale che ha fatto l'invasione), mai visti in carne: solo in videoconferenza alla Rocca, nei comunicati e alla nave | mesi (trimestri) | **gli obiettivi trimestrali**: il rendimento dell'isola (porto cargo, estrazione, tasse), il costo della sicurezza, la reputazione all'estero, **la pazienza** | il profitto, l'immagine, i bonus, la guerra interna fra consiglieri | fuori dall'isola; la Rocca per le videoconferenze; l'eliporto per le visite |

**La lingua del Consiglio** è aziendale e assurda, e arriva nella Gazzetta, nelle ordinanze e dal Garante alle 20 (stesso tono
deadpan di `BIBBIA_MONDO` §6): «Ottimizzazione della serenità del quartiere Ovest: −18% di eventi non conformi rispetto al
trimestre», «Il coprifuoco è un servizio offerto alla cittadinanza», «Rimodulazione del capitale umano delle Lamiere», «L'ordine è una
carezza. Ed è anche un investimento», «Si ringrazia la cittadinanza per la sinergia». Le ordinanze hanno il numero di protocollo e il
logo della Compagnia accanto allo stemma del Garante.

### R.4 Ogni piano si compra, si spacca, si tradisce

- **La corruttibilità** è un tratto per attore (dall'hash, come i tratti di `unico_idee.js`) più la sua situazione (i debiti, la
  famiglia, l'idea che ha del regime). L'agente con il debito con lo strozzino prende la mazzetta; il tenente che vuole la casa al mare
  fa affari con la Famiglia; il generale scavalcato passa le carte a un giornale estero.
- **Le idee girano anche fra loro**: un agente che ha visto il collega picchiare un bambino può prendere l'idea «questo non è giusto»;
  con tre idee così e la viltà bassa **diserta** (si toglie la divisa e sparisce nelle Lamiere: un fatto enorme) o **diventa un
  informatore della Risacca**.
- **Le rivalità interne**: due tenenti che si contendono i rinforzi, due generali che si accusano davanti al Consiglio, un consigliere
  che vuole far fallire il trimestre di un altro. Il regista le usa come leva (`incrocia`): una guerra fra generali **abbassa** il
  controllo dove guardano entrambi.

### R.5 Che cosa possono fare il giocatore e i gruppi, piano per piano

| verso chi | che cosa | come (verbi) | che cosa torna |
|---|---|---|---|
| **agenti** | corrompere, evitare, provocare, disarmare, far disertare | `corrompi`, `nasconditi`, `insulta`, `picchia`, `convinci` (con le idee) | la multa saltata; il rancore dell'agente; il fatto «diserzione» |
| **tenenti** | ricattare (la foto con la Famiglia), corrompere, spingere a cambiare la politica del quartiere, far trasferire | `fotografa`, `ricatta`, `corrompi`, `petizione`, `denuncia_al_superiore` | il coprifuoco spostato; il posto di blocco tolto; o la stretta per vendetta |
| **generali** | sabotare una campagna, infiltrare, **rapire**, far trapelare | `sabota`, `infiltrati` (la presa di corpo su un agente: `SISTEMA_UNICO` §8.3), `rapisci`, `passa_le_carte` | la campagna fallita; la caccia all'uomo; lo scandalo alla nave |
| **il Consiglio** | colpire il profitto e l'immagine: lo sciopero al porto cargo, il sabotaggio dell'estrazione, la radio pirata che arriva oltre il mare, la foto che finisce sui giornali di fuori, la **petizione** firmata da mezza città | `sciopera`, `sabota`, `trasmetti`, `passa_le_carte`, `firma_petizione` | il trimestre in rosso; la pazienza del Consiglio che scende |

### R.6 Come tornano indietro le decisioni (il giro chiuso)

Ogni decisione del regime è **un fatto** con un segno: l'ordinanza affissa (`affiggi`), il posto di blocco montato, il coprifuoco
anticipato annunciato dal Garante, la campagna con il suo nome nella Gazzetta. E ogni fatto **fa idee** (`DA_FATTI`):
- la stretta sui writer → rancore dei ragazzi e delle loro madri → più scritte, non meno (fino a un punto: poi la paura vince sui vili);
- il sussidio dato agli obbedienti → gratitudine in chi lo prende, invidia e disprezzo in chi no;
- la retata → la paura nel quartiere (il controllo sale **subito**) e il rancore (il sostegno al regime scende **dopo**: è la curva
  lenta che conta);
- la diserzione di un agente → l'idea «anche loro non ci credono» nel quartiere e fra gli agenti.

### R.7 L'arco della vittoria e della sconfitta: quattro indicatori

| indicatore | dove | che cosa lo muove | lo si vede |
|---|---|---|---|
| **controllo** C per quartiere | §R.1 | presenza, posti di blocco, ronde, coprifuoco, informatori; scende con le zone autonome, le barricate che reggono, gli informatori scoperti | la mappa del Taccuino, colorata per quartiere |
| **sostegno popolare** S per quartiere (0-100, quanti sono contro) | dalle idee: la somma delle idee sui Grigi pesata (`UnicoIdee.pressione`) | i fatti della repressione, il welfare, la propaganda, la paura | le finestre con il drappo, le scritte, il silenzio al passaggio del Garante |
| **morale del regime** M | la media delle idee degli agenti e dei tenenti sul regime stesso, più le diserzioni | le perdite, la paga che ritarda, le rivalità interne, il disprezzo della gente | gli agenti che fumano in gruppo invece di fare la ronda |
| **pazienza del Consiglio** P | trimestre per trimestre | profitto dell'isola − costo della sicurezza − danno all'immagine | i comunicati del Consiglio, sempre più brevi e più gelidi |

**Le curve sono lente e reversibili**: S si muove al più ±2 al giorno per quartiere, C ±3, M ±1, P solo a fine trimestre (ogni 30
giorni di gioco). Un quartiere **si libera** quando, per 7 giorni di fila, S > 65 e C < 25 e la banda del giocatore (o un gruppo grande)
lo tiene: diventa una **zona autonoma** (`COSTRUIRE_IN_CITTA.md`), con le sue regole. Può **ricadere**: una campagna dei generali lo
riprende in 3-5 giorni se S scende.

### R.8 I finali: emergenti, non scritti

Non c'è un finale scritto: ci sono **soglie sugli indicatori**, e il primo che succede è il finale di quella partita (che può anche
non succedere mai):

| finale | quando succede | che cosa si vede |
|---|---|---|
| **la liberazione dei quartieri**, uno a uno | S alto e C basso abbastanza a lungo in un quartiere; tutti tranne la Base e la Rocca | la città a macchie, le Lamiere per prime; il regime chiuso dietro il Muro |
| **l'autonomia trattata** | M basso e P media: un generale o un tenente tratta con i capi dei gruppi | la firma al Circolo dei Lavoratori; la zona con le sue regole e il posto di blocco al confine |
| **il ritiro del Consiglio** per scarsa redditività | P a zero per due trimestri | il comunicato: «L'isola non è più strategica per il nostro portafoglio»; la nave che porta via i Grigi; il caos dopo |
| **la stretta** | S basso o la banda del giocatore sconfitta; P cala per l'immagine ma il Consiglio sceglie la forza | la legge marziale, il coprifuoco alle 18, le Lamiere sgomberate; e un nuovo inizio molto più duro |
| **la cooptazione** | il giocatore o i capi delle bande accettano il posto, la casa, il sussidio | si diventa parte del regime: i fatti cambiano verso, le idee della gente su di te pure |

Il regista non sceglie il finale: tiene solo **la curva della tensione** e i rari a quota (§11). Le soglie stanno in un posto solo
(`Regime.CFG`) per poterle tarare con il banco.

### R.9 Quanto costa

- **Agenti**: sono NPC come gli altri (la Mente, i verbi, i fatti); la loro scelta del grado è una tabella più due tratti.
- **Tenenti**: 8 decisioni al giorno di gioco (una per quartiere), ciascuna una manciata di conti sugli indicatori.
- **Generali**: 3 decisioni a settimana; **Consiglio**: 1 a trimestre. Tutto a battito lento nella fase del regista.
- Lo stato: `st.u.regime = { q: { quartiere: { C, S, coprifuoco, blocchi, ronde, inf } }, M, P, trimestre, campagne: [...],
  attori: { id: { piano, corrotto, idee… } } }`, solo dati.

---

## 7. L'economia in sbleuri

### 7.1 La moneta

**Lo sbleuro** (plurale «sbleuri», simbolo **Sb**), con i centesimi. Valori **a scala euro**. Il cambio si fa **in un punto solo**:
`Soldi.fmt(x)` per scrivere e `Soldi.SB` (il fattore) per convertire i numeri di oggi, che sono in migliaia di lire
(`economia.js` MERCI, `popolo.js` le paghe). Il fattore di partenza: **1 (mille lire) = 2,5 sbleuri**, tarato sul pane; i
prodotti fuori scala si correggono a mano nella tabella qui sotto.

| cosa | sbleuri | cosa | sbleuri |
|---|---|---|---|
| caffè al banco | 1,20 | pasto in trattoria | 12 |
| pane (1 kg) | 2,50 | pesce fresco (1 kg) | 10-18 |
| sigarette (pacchetto) | 5 | sigarette di contrabbando | 2,50 |
| bomboletta di vernice | 7 | lamiera di recupero | 0 (discarica) - 15 (ferramenta) |
| pala, piede di porco | 15-20 | bancale | 0 (discarica) - 8 |
| Vespa usata | 2.500 | Fiat 126 usata | 4.000 |
| pistola (mercato nero) | 450 | lupara | 300 |
| affitto (mese) | 350 | stipendio di un operaio (mese) | 1.100 |
| sussidio (mese) | 280 | multa | 50-200 |
| razione settimanale | gratis con la tessera | prestito in banca | 500-5.000, 12% l'anno |

### 7.2 Come si guadagna (giocatore e NPC, con le stesse funzioni)

| strategia | come | quanto | rischio |
|---|---|---|---|
| lavorare | il turno (`lavora`) in bottega, al porto, al cantiere | 7-12 Sb l'ora | nessuno; la stanchezza |
| i lavoretti | le consegne di `Game.JOBS` (le casse dal molo, il ghiaccio per il bar) | 25-40 Sb | il ritardo |
| vendere alle botteghe | `vendi` la roba al bottegaio | 40-60% del prezzo | il bottegaio che non ne vuole |
| pescare e vendere | `pesca` → mercato | 30-120 Sb a mattina | il maestrale |
| l'orto | `pianta_orto` → `annaffia` → `raccogli` → vendi | 15-40 Sb ogni 3 giorni | il furto, la capra |
| la discarica | `fruga` → rottami al fabbro, cose buone alla ricettazione | 5-30 Sb | la banda della discarica |
| esibirsi | `giocola`, `suona`, `statua_vivente` + `passa_il_cappello` | 2-20 Sb l'ora, secondo la fama | la multa per l'ordinanza |
| scommettere | la scopa al bar, il campanile, le corse dei Saette, il Lotto del Garante | da −tutto a ×10 | il debito |
| prestare a interesse | `presta` con l'interesse | +10-20% | non tornano |
| ricettare | comprare al 30% e rivendere al 60% | +30% | i Grigi, il derubato |
| spacciare | per una banda o in proprio | 20-40 Sb a dose, metà al capo | i Grigi, la banda rivale |
| rubare | borseggio, scasso, il motorino | quello che c'è | tutto |
| chiedere | il prestito in banca, allo strozzino, a un amico | — | la rata, il picchiatore, l'amicizia |
| lo Stato | il sussidio, la razione, la delazione | 280 al mese; 50-200 a soffiata | l'obbedienza, il nome nell'archivio |

---

## 8. Costruire con le parti elementari

### 8.1 Le parti

| parte | misure | peso | proprietà | da dove |
|---|---|---|---|---|
| asse | 2 × 0,2 m | 4 kg | rigido · legno · lungo · portante (poco) · infiammabile | falegname, cantiere |
| bancale | 1,2 × 0,8 m | 20 kg | rigido · legno · piano · portante | discarica, porto |
| lamiera | 2 × 1 m | 12 kg | rigido · metallo · piano · impermeabile · rumoroso | discarica, ferramenta |
| tubo | 3 m | 6 kg | rigido · metallo · lungo · cavo | ferramenta, cantiere |
| palo | 3 m | 10 kg | rigido · legno · lungo · portante | bosco |
| mattone / blocco | 0,25 m | 3 kg | rigido · pesante · portante | mattonificio, rovine |
| corda | 10 m | 1 kg | lungo · flessibile (giunto) | ferramenta, porto |
| telo | 3 × 3 m | 2 kg | stoffa · impermeabile · piano (molle) | mercato |
| ruota / pneumatico | 0,6 m | 8 kg | rotola · molle | discarica, autorimessa |
| molla / camera d'aria | — | 1 kg | elastico | discarica, bici |
| porta di recupero | 2 × 0,9 m | 15 kg | rigido · piano · galleggia | discarica, case pignorate |
| fusto | 0,6 × 0,9 m | 15 kg | cavo · galleggia · rumoroso | porto |
| cassa | 0,6 m | 5 kg | contenitore · piano · portante (poco) | mercato |

**I giunti**: chiodo (forte, rigido), corda (debole, snodo), filo di ferro (medio), saldatura (fortissimo: serve il fabbro).

### 8.2 Le proprietà calcolate (la funzione non è un modello: è una misura)

Le parti stanno su una griglia di 0,25 m con 4 rotazioni (8 per le diagonali di rampa). Dalla cosa costruita si calcolano:
- **altezza** e **pendenza** delle facce piane (rampa = una faccia portante inclinata 8-35° con l'inizio a terra);
- **portata**: la parte o il giunto più debole sul percorso del carico fino a terra;
- **stabilità**: il baricentro dentro la base d'appoggio, con il margine (una torre alta e stretta è instabile);
- **copertura**: l'area coperta da facce `impermeabili` sopra 1,8 m (riparo);
- **galleggiamento**: volume delle parti che galleggiano contro il peso totale (zattera);
- **rotolamento**: ruote sotto un piano (carretto, che si spinge o va giù per la Salita dei Bottai);
- **lancio**: una leva su un fulcro con un contrappeso o una molla (catapulta: tira con la parabola della §3.2);
- **ostacolo**: larghezza che chiude una via (barricata), con il varco obbligatorio lasciato dal motore;
- **visibilità**: altezza × colore (un palco, un'insegna, un faro di fortuna);
- **rumore** (lamiere, fusti: un tamburo), **infiammabilità** (legno e teli: il falò, l'incendio).

**La funzione la riconosce il gioco**: «è una rampa» se la misura lo dice, comunque sia fatta. **Il risultato è sensato**: la rampa
troppo ripida ribalta il motorino, la torre instabile oscilla e cade quando qualcuno sale (esito comico), la zattera con troppo peso
affonda di 20 cm e poi tutta, la catapulta con la leva corta tira addosso a chi la carica, il riparo di cartone cede alla prima pioggia.

### 8.3 Chi costruisce e come

- **Il giocatore** in un editor semplice: prende una parte, la posa, la gira; il gioco mostra le misure (altezza, portata, «è una
  rampa: 22°»).
- **Gli NPC** non progettano pezzo per pezzo: scelgono fra **forme note** (le «ricette di forma», un centinaio, generate fuori dal
  gioco da una ricerca sulle parti e tenute se le misure sono buone), adattate a quello che hanno. La Mente le trova **per effetto**
  (`UnicoCostruire.perEffetto`, come fa già oggi per rampa, torre, sbarramento, riparo): la ricerca del §9.5 chiede «qualcosa con
  altezza ≥ 3» e trova la torre di bancali, la scala appoggiata, il palco.
- **Telefono**: le parti sono istanze di 13 geometrie (una `InstancedMesh` per parte), una struttura ≤ 40 parti, ≤ 300 parti per
  quartiere; nel salvataggio solo `[parte, x, y, z, rot]`.

---

## 9. I desideri infiniti: variabili, differenze, ricerca

Questa è la parte più importante, e cambia l'idea dell'elenco. **Non c'è un elenco di desideri, e nemmeno un elenco di stati
desiderati.** C'è il mondo, con le sue variabili, e c'è chi guarda le differenze.

### 9.1 L'idea in una frase

> **Un desiderio è un cambiamento voluto di una variabile del mondo, per sé o per un altro, nato da una differenza percepita.**

«Totò vuole volare» non è scritto da nessuna parte. È il nome che `Lingua` dà a: *Totò vuole che la sua quota sia alta e che sotto di
lui non ci sia niente*. L'ha voluto perché **ha visto** Freccia staccarsi da terra con la Vespa sulla rampa della discarica.

### 9.2 L'alfabeto irriducibile: le variabili del mondo e gli effetti dei verbi

L'alfabeto sono **due cose sole**, e crescono con il gioco senza che nessuno scriva desideri:

1. **Le variabili** (`Var`): tutto quello che nello stato del gioco ha un valore che cambia. Si **enumerano dai dati**, non a mano:
   - del **corpo**: posizione (x, y), **quota** (z sopra il suolo), sostegno (che cosa c'è sotto), velocità, salute, fame, sonno,
     pulizia, ebbrezza, vestito, che cosa ha in mano;
   - della **borsa**: soldi, conto in banca, il numero di ogni cosa e di ogni **proprietà** (quante cose `prezioso` ho, quante armi);
   - della **proprietà**: chi possiede ogni casa, barca, mezzo, cosa, baracca, muro;
   - delle **relazioni**: i 10 numeri per coppia (affetto, fiducia, debito, rancore, stima, paura, attrazione, rivalità, complicità);
   - della **reputazione**: gli 8 assi per persona, per quartiere;
   - dello **sguardo**: quanti mi vedono adesso (il pubblico), quanti sanno di me (dicerie), se il mio nome è sulla Gazzetta;
   - delle **cose**: rotto, acceso, pieno, sporco, bagnato, dipinto, colore, aperto, chiuso a chiave;
   - dei **posti**: chi c'è, di chi è (la banda), che colore ha, se è occupato, se è pulito, se è illuminato, se ci si può entrare;
   - delle **istituzioni**: il permesso, la multa, il fascicolo, la tessera, il sussidio, il prestito, la rata, la regola in vigore;
   - delle **idee**: che idea ha **un altro** su un soggetto (voglio che Rosa pensi bene di me; voglio che il quartiere ce l'abbia
     con i Grigi), la pressione di un quartiere;
   - dei **gruppi**: chi ne fa parte, la cassa, il territorio, i colori.

   Ogni modulo dichiara le sue variabili con **una riga per tipo** nello schema (`Var.dichiara({ k: 'quota', di: 'attore', leggi:
   a => a.z, scala: [0, 40] })`). Quelle del corpo, della borsa e delle relazioni si leggono da sole dalla vista `Attore.di` e da
   `rel`. **Una funzione nuova del gioco porta le sue variabili**: il giorno che c'è la mongolfiera, la variabile «quota» la conosce
   già; il giorno che c'è il colore delle baracche, «colore del posto» diventa desiderabile da solo.

2. **Gli effetti dei verbi** (`EFF`), già dati nel registro (`Verbo.EFF`, 32 termini): ogni effetto dice **quale variabile cambia e in
   che verso**. Al caricamento si costruisce **l'indice inverso** `variabile × verso → [verbi, strutture, mezzi, oggetti]`. Le
   strutture portano gli effetti delle loro proprietà calcolate (§8.2: la rampa alza la quota e la velocità), i mezzi i loro (la
   Vespa: velocità; il gozzo: posizione in mare), gli oggetti quelli dei ruoli che riempiono (l'ombrello: «rallenta la caduta»).

**Quanto è grande oggi**: circa **60 tipi di variabile**, su **≈ 1.000 abitanti + 251 posti + 556 edifici + 435 cose + i gruppi + 12
istituzioni**: più di **40.000 variabili concrete**. Domani cresce da sé.

### 9.3 Da dove nascono: le differenze percepite

Un desiderio nasce solo quando un personaggio **percepisce una differenza**. È un evento, non un conto continuo: costa solo quando
succede qualcosa (§9.8). Sei sorgenti, e nessuna dice *che cosa* desiderare:

| sorgente | la regola | esempio |
|---|---|---|
| **mimesi, invidia** (Girard) | B ha (fa, è) un valore più alto della variabile v, e io stimo o invidio B → voglio v alta per me; o voglio **la stessa cosa** che B vuole | Freccia ha la Vespa e gli sguardi → il pulcino vuole la Vespa e gli sguardi; due vogliono la stessa panca perché l'altro la vuole |
| **perdita** | avevo v, ora è più bassa | il pignorato vuole indietro la poltrona; il derubato vuole indietro i soldi, o almeno gli stessi soldi da qualcuno |
| **testimonianza** | ho visto un fatto con un cambiamento grande e raro di v (anche di altri) | ha visto volare Freccia → quota e velocità; ha visto il comizio applaudito → pubblico |
| **torto** | A ha fatto Δv a me → voglio **disfare** Δv (riavere), **rovesciarlo** (fare Δv ad A), o fare ad A un Δ della stessa grandezza su un'altra variabile | la figuraccia in piazza → che A faccia la figuraccia in piazza; il furto della rete → la Vespa di A nel porto |
| **contagio** (le idee) | un'idea su un soggetto porta con sé un verso (valenza) → le variabili del soggetto in quel verso | «i Grigi sono il male» → voglio meno controllo dei Grigi sul posto, meno Grigi in piazza; «il molo porta fortuna» → voglio stare sul molo |
| **curiosità** | una variabile o un valore **mai visti** da me (la cosa nuova, il posto nuovo, la struttura nuova) | la prima torre di bancali della città: dieci persone vogliono salirci |

Più due **pesi**, che non generano ma inclinano: **i tratti** (il vanitoso pesa lo sguardo, l'avaro i soldi, il pauroso la sicurezza,
il folle prende anche le differenze piccole e strane) e **i bisogni** di oggi (fame, sonno, soldi: restano come sono nella Mente).

### 9.4 Il desiderio come dato

```
Desiderio = { chi, var: 'quota'|'soldi'|'possiede:poltrona'|'idea_di:rosa:me'|..., di: id (me o un bersaglio),
              verso: +1|−1|=valore, quanto, scala: me|amici|strada|quartiere|città|mare,
              motivo: { tipo: mimesi|perdita|vista|torto|contagio|curiosita, fatto: id, modello: id? },
              registro: serio|assurdo|surreale, peso, scade }
```

- **Il registro** non si sceglie: viene dalla **distanza fra il desiderio e i mezzi** (§9.5) e dalla follia. Volere una rampa più alta
  è serio; volere che la statua del Garante ti guardi è surreale.
- **La scala** viene dal motivo: un torto personale è «me», un'idea di quartiere è «quartiere», un gruppo la alza.
- **Il nome** lo fa `Lingua` (§9.7).

### 9.5 I mezzi si trovano: la ricerca all'indietro, limitata

Il desiderio `(var, verso)` va all'**indice inverso** (§9.2) e trova i **candidati**: verbi, strutture da costruire, mezzi da guidare,
oggetti da usare, persone da convincere. Ogni candidato ha le sue **precondizioni**, che diventano sotto-desideri (sono anche loro
variabili: «avere 3 bancali» è `possiede:bancale ≥ 3`). Si scende così:

- **profondità ≤ 3**, **fascio ≤ 6** candidati per livello, **≤ 60 nodi** per ricerca (un tetto a conteggio, deterministico);
- il costo di ogni nodo: tempo, soldi, rischio (i Grigi, il pubblico, la caduta), e **il tratto** (l'onesto paga di più il losco,
  il folle paga di meno l'assurdo, il vile paga di più il rischio): è `ordinaMezzi` di `unico_gruppi.js` reso generale;
- **le sostituzioni per proprietà**: se manca la cosa giusta, il ruolo si riempie con la più plausibile (`REGISTA_E_VOCABOLARIO` §B.2);
- **le approssimazioni**: se nessun mezzo dà il cambiamento pieno, si accetta quello che lo dà **in parte** sulla stessa variabile o
  su una vicina (il gruppo «in aria» si avvicina con «in alto»: il campanile; «veloce» con «in discesa»: la salita); il desiderio si
  segna «a metà»;
- **le ricette** già trovate si tengono in una cache per `(var, verso, quartiere)` e si riusano: la ricerca vera è rara.

Il piano che esce è una fila di verbi del registro, eseguiti dalla Mente con la stessa porta di tutti (`Verbo.fai`). **L'esito non lo
scrive nessuno**: lo decide lo stato del mondo quando il verbo si fa (la rampa regge o no, il Grigio passa o no, la fisica finta della
§3, la portata della §8). Se il piano si rompe a metà, **si ripianifica una volta** dal punto in cui si è; poi `rinuncia` concreta (§2).

### 9.6 Quanti sono (lo spazio, onesto)

- **I desideri possibili**: ~60 tipi di variabile × ~2.000 bersagli plausibili (persone, posti, cose, gruppi, istituzioni) × 3 versi ×
  6 scale × 6 motivi × 3 registri ≈ **3,9 × 10⁷** desideri diversi per una persona. Quelli plausibili per una persona in un giorno
  (filtrati dalla salienza) sono qualche centinaio.
- **I piani**: con fascio 6 e profondità 3 sono fino a 6³ = 216 piani per desiderio, e ogni ruolo ha in media 6 riempimenti plausibili:
  **≈ 10³ piani distinti** per desiderio, cioè **≈ 10¹⁰** coppie desiderio-piano.
- **Gli esiti**: riuscito, a metà, cinque modi di fallire in modo comico (§2.1), per chi guarda: almeno **×5**.
- **In pratica**: in 100 giorni di gioco con 1.000 abitanti nascono ~10⁵ desideri; la probabilità che due siano uguali per tipo di
  variabile, tipo di bersaglio, motivo **e** mezzo è bassa, e il regista la tiene bassa apposta (§9.9).

Non è «infinito» in senso matematico, ma **è più grande di quanto un giocatore possa vedere**, e soprattutto **cresce senza scrivere**:
ogni variabile o verbo nuovo moltiplica tutto il resto.

### 9.7 I nomi: Lingua dà un nome ai grappoli di variabili

I nomi umani («volare», «diventare ricco», «farsi un nome», «vendicarsi») sono **etichette** di grappoli, in una tabella corta e
aperta (`Lingua.DESIDERI`), che **non serve per generare**:

| nome | il grappolo |
|---|---|
| volare | quota > 2 m e niente sostegno |
| stare in alto | quota > 5 m |
| andare veloce | velocità > 12 m/s |
| farsi vedere, diventare famoso | pubblico alto ora / dicerie e Gazzetta |
| diventare ricco | soldi + conto ≥ 3 × la mediana del quartiere |
| essere temuto / amato | reputazione «temuto» / affetto di molti |
| vendicarsi | il rovescio di un torto |
| avere un tetto | copertura sopra il posto dove dormo |
| essere libero | niente fascicolo, niente ricerca, niente sorveglianza sul posto |
| liberare un posto | il posto senza Grigi e con il colore nostro |
| ... | (ogni riga in più è solo un nome più bello) |

Se nessun nome combacia, `Lingua` compone il generico: «vuole **più** {variabile} **di** {B}», «vuole che {B} **non** abbia più
{cosa}», «vuole che {posto} sia {colore}». **La generazione non dipende dai nomi**: i nomi servono solo a farla leggere.

Gli `EFFETTI` di `unico_gruppi.js` (stare_in_aria, essere_in_alto, andare_veloce, essere_visti, avere_soldi, avere_riparo, liberare,
rovesciare, fare_festa) diventano **i primi grappoli** di questa tabella: il lavoro fatto non si butta, si generalizza.

### 9.8 Quanto costa sul telefono

- **Si genera solo agli eventi**: un fatto nuovo arriva ai sensi di chi lo vede (`vis`) o lo sente (diceria); per ognuno si calcola la
  **salienza** = |Δ| × vicinanza (relazione o distanza) × peso del tratto × rarità. Sotto la soglia non succede niente.
- **Poche voglie per testa**: **2 attive + 1 dormiente** per NPC; una nuova scaccia la più debole. In tutto ≤ 3 × 1.000 piccoli record.
- **A campione**: a ogni battito della mente si guardano **8 NPC** (16 su Iris Xe), a rotazione, prima quelli vicini al giocatore.
- **La ricerca** ha il tetto dei 60 nodi e la cache; si fa in una fetta di tempo libero del passo (≤ 0,3 ms), a conteggio, quindi
  deterministica.
- **Lontano** (oltre 60 m dal giocatore) il piano si risolve **in astratto**: la durata e l'esito dal dado a seme e dallo stato, senza
  camminare (la parità vicino/lontano di `SISTEMA_UNICO` §9.1).

### 9.9 Come resta nuovo

- Ogni desiderio ha una **firma** (tipo di variabile × tipo di bersaglio × motivo × famiglia del mezzo). La città tiene il conto delle
  firme dell'ultima settimana; una firma ripetuta perde peso (×0,6 per ogni ripetizione, recupera in 3 giorni).
- Ogni persona tiene le sue ultime 12 firme: non rifà lo stesso sogno nello stesso modo (ma può rifarlo **in un altro modo**: è la regola
  del tre: la terza volta il mezzo cambia).
- Le variabili **mai desiderate** in città hanno un premio di salienza: il primo che vuole il colore di un posto è più probabile del
  decimo che vuole i soldi.

### 9.10 Campioni (prodotti dalla grammatica, **non** un elenco da scrivere)

Ognuno di questi è **un esempio** di quello che esce dal meccanismo; nessuno è scritto nel gioco. Per i primi quattro c'è il percorso
completo.

**Campione 1: «Totò vuole volare»**
1. *Fatto*: `salta_con_mezzo` di Freccia dalla rampa della discarica, quota 2,8 m, 14 m/s, 9 testimoni. Totò è fra i testimoni.
2. *Differenza*: testimonianza (quota e velocità rare, Δ grande) + mimesi (Totò stima Freccia: `rel.stima` 0,7). Salienza 0,82.
3. *Desiderio*: `{ var: quota + sostegno=0, di: me, verso: +, scala: me, motivo: vista+mimesi, registro: ? }`. Lingua: «volare».
4. *Ricerca*: indice inverso «quota +, sostegno 0» → la rampa (struttura: serve un mezzo, Totò non ce l'ha → sotto-desiderio
   `possiede:mezzo` → troppo caro, profondità 3, costo alto); il tetto + un `telo` (l'ombrello di casa riempie il ruolo: plausibilità
   0,6); la catapulta (le parti: 1 asse, 1 fusto, 1 camera d'aria; ne ha 0 → discarica a 140 m); la gru del porto (quota sì, sostegno
   no: approssimazione).
5. *Scelta*: Totò ha follia 0,4 → vince «il tetto con l'ombrello» (costo basso, rischio alto, registro **assurdo**).
6. *Esito* dal mondo: `arrampicati` sulla scala del Vico dei Bottai (riesce), `salta` con l'ombrello: l'ombrello si rovescia (GUASTI:
   `telo` + vento di maestrale), cade sul tendone del fruttivendolo (CRAC: il tendone si rompe), atterra sulle cassette. Fatti:
   `caduta` (livido), `rompe` (tendone del fruttivendolo: rancore 0,3, debito 40 Sb), `figuraccia` (6 testimoni). La Gazzetta:
   «Volo di 4 metri in Vico dei Bottai. Atterrato sulle arance».
7. *Fili che nascono*: il debito col fruttivendolo; la diceria «Totò vola»; Freccia che lo prende in giro, o lo prende come pulcino.

**Campione 2: «La vedova Assunta vuole indietro la sua poltrona»**
1. *Fatto*: `pignora` (l'ufficiale giudiziario porta via la poltrona) e poi `compra_all_asta` di Ignazio, il vicino.
2. *Differenza*: **perdita** (possiede:poltrona da 1 a 0) + **torto** verso Ignazio (Δ fatto da lui a lei, anche se legale).
3. *Desiderio*: `possiede:poltrona = 1` (riavere); la scala «strada».
4. *Ricerca*: `compra` da Ignazio (soldi: no) → `chiedi_prestito` (fascicolo: no); `baratta` (ha la macchina da cucire: sì);
   `ruba` di notte (tratto onesto 0,8: costo altissimo); `convinci` (relazione con Ignazio bassa); **`presidia`** la poltrona: andare a
   sedercisi sopra ogni pomeriggio sul suo pianerottolo (il ruolo `sedile` lo riempie la poltrona stessa).
5. *Esito*: Assunta va ogni giorno alle 17 a sedersi sulla poltrona di Ignazio, sul pianerottolo dove lui l'ha messa. Dal terzo
   giorno le vicine le portano il caffè. Il regista tiene il filo; il quinto giorno Ignazio gliela riporta (o la mette in casa, e Assunta
   bussa).

**Campione 3: «Il Pastore vuole che le Lamiere siano verdi»**
1. *Fatto*: i Lamierini hanno dipinto di ruggine il muro della chiesa senza tetto, la base dei Carbonai. Il Pastore lo vede.
2. *Differenza*: **torto** (il colore del suo posto cambiato) + **contagio** (l'idea di gruppo «i Lamierini ci rubano la collina»).
3. *Desiderio*: `colore:posto` = verde bosco, per **tutte** le baracche di confine (scala: quartiere, perché è del gruppo).
4. *Ricerca*: `dipingi_baracca` (le bombolette: 4 → `compra` 28 Sb), di notte (`di_nascosto`), in gruppo.
5. *Esito*: alle 3 di notte quattro Carbonai ridipingono tre baracche; alle 6 la Zia Ruggine si sveglia in una casa verde. La faida dei
   colori sale di un gradino.

**Campione 4: «Rosa vuole che il brigadiere la guardi»**
1. *Fatto*: il brigadiere Murru ha sorriso alla tabaccaia (Rosa c'era).
2. *Differenza*: **mimesi** (la tabaccaia ha l'attenzione di Murru; Rosa ha attrazione 0,6 per lui).
3. *Desiderio*: `idea_di:murru:rosa` più alta (che lui pensi a lei).
4. *Ricerca*: `regala` (ha i biscotti: sì); `fatti_vedere` (passare davanti alla caserma col vestito della festa: sì); **`fatti_multare`**
   (lasciare la Vespa in divieto: lui deve scriverle la multa e parlarle: il folle 0,3 lo trova).
5. *Esito*: la multa da 60 Sb, la conversazione più lunga della sua vita (3 battute), un'idea nuova in Murru («la signora della Vespa»).

**Altri campioni, con il percorso in breve** (variabile ← motivo → mezzo trovato → esito possibile):

| # | detto da Lingua | variabile ← motivo | mezzo che la ricerca trova | esiti possibili |
|---|---|---|---|---|
| 5 | diventare ricco | soldi ← mimesi (il cugino con la Giulia) | spaccio per i Carbonai | i soldi; il fermo; il pestaggio della banda rivale |
| 6 | farsi un nome | dicerie su di me ← vista (il comizio applaudito) | `fai_comizio` sulla cassetta in piazza | applausi; la multa per riunione; la cassetta che si sfonda |
| 7 | vendicarsi | rovescio della figuraccia ← torto | `versa` il secchio dal balcone su A, in pubblico | SPLASH, la risata; il secchio sul prete per sbaglio |
| 8 | rovesciare il regime | controllo dei Grigi sul quartiere ← contagio | barricate, scritte, sciopero (gli `EFFETTI` di oggi) | la zona autonoma; lo sgombero; la retata |
| 9 | trovare il tesoro del mare | possiede:prezioso ← diceria (il relitto) | `immergiti` dal gozzo / `scava` alla marina | le anfore; il polpo; nulla e il raffreddore |
| 10 | aprire una radio | pubblico di molti, voce ← vista (Radio Luna) | antenna sulla torre dell'acqua + `allaccia_corrente` + la radiolina | la radio pirata; il blackout del quartiere; la Guardia che sale |
| 11 | fondare una religione | idee di molti su un soggetto ← coincidenza (il prodigio) | `predica` alla statua, `benedici`, `fai_un_voto` | i fedeli; l'ordinanza; il prete geloso |
| 12 | vincere la regata | posizione in mare prima degli altri ← mimesi | costruire la zattera (galleggia) o truccare il gozzo | primo; affondato a metà; squalificato |
| 13 | farsi amare | affetto di Lucia ← attrazione | `fai_la_serenata` sotto il balcone | il bacio; il padre col secchio |
| 14 | essere temuto | reputazione temuto ← torto subito da piccolo | sfidare il picchiatore della Famiglia davanti al bar | il rispetto; l'ospedale |
| 15 | avere un tetto | copertura dove dormo ← perdita (lo sfratto) | baracca alle Lamiere con le lamiere della discarica | la casa; lo sgombero; il crollo alla prima pioggia |
| 16 | liberare il fratello | posizione del fratello fuori dalle carceri ← torto | la petizione; corrompere il secondino; il cunicolo dalle carceri vecchie | libero; dentro anche lui |
| 17 | dormire in pace | rumore notturno vicino a casa ← fastidio (Michele) | `denuncia` il bar; tagliare i fili dell'impianto; trasferirsi sul tetto | silenzio; la faida col bar |
| 18 | essere il primo in fila | posizione nella coda ← mimesi | arrivare alle 5; tenere il posto con una sedia; vendere il posto | primo; la lite della sedia |
| 19 | che il muro sia pulito | stato:dipinto del muro ← fastidio | `cancella` col secchio | pulito; il writer che torna la notte dopo |
| 20 | mangiare il pesce del re | possiede:pesce raro ← vista (la pesca grossa) | pescare di notte al Molo Vecchio | il pesce; la scarpa |
| 21 | toccare la luna | quota altissima ← follia + il prodigio della luna | torre di bancali sul belvedere | 5 metri; giù; la Gazzetta |
| 22 | far ridere il paese | risate del pubblico ← mimesi del mimo | `fai_il_mimo` in piazza | le monete; il Grigio che non capisce |
| 23 | riavere la Vespa | possiede:Vespa ← perdita (rubata dai Saette) | cercarla all'Autorimessa, `riprendi_auto` | ripresa; la rissa con Freccia |
| 24 | far chiudere la bisca | stato:aperto della bisca ← torto (il marito che perde) | `denuncia`; le pentole davanti alla porta | chiusa una settimana; la vetrina rotta per ritorsione |
| 25 | diventare capo della banda | rango ← mimesi del Nostromo | un colpo grosso davanti a tutti | capo; scissione; buttato in mare |
| 26 | avere il permesso di vendere | stato:permesso ← bisogno | la coda (tre giorni), il timbro falso | il banco ambulante; la multa doppia |
| 27 | essere bella per la festa | vestito, pulizia ← festa del patrono | la sarta; rubare il vestito al mercato | la più guardata; la sarta che lo riconosce |
| 28 | sposare la figlia del pescatore | relazione del padre con me ← attrazione | regalare il motore al padre | sì; il motore che non parte |
| 29 | portare la statua al mare | posizione della statua ← surreale (la statua guarda la sua casa) | in gruppo col carretto di ruote | la processione abusiva; la statua in acqua (galleggia? no) |
| 30 | che il gabbiano lo saluti | idea del Comandante su di me ← surreale | dargli da mangiare ogni giorno sul molo | il gabbiano gli ruba il cappello (ed è un saluto) |
| 31 | far piovere | meteo ← siccità dell'orto | `prega`, `fai_un_voto`, `batti_pentole` | piove davvero (il caso): nasce una religione |
| 32 | avere la casa sul molo | possiede:casa sul molo ← eredità contesa | l'avvocato, l'occupazione, la notte dentro | sua; divisa a metà con un muro di bancali |
| 33 | non pagare la multa | soldi conservati ← l'avaro | strapparla davanti al Grigio; perdere il modulo; ricorso | non pagata; raddoppiata; il fascicolo |
| 34 | far sapere a tutti la verità | idea del quartiere su A ← torto | la scritta sul muro, la lettera alla Gazzetta | A svergognato; querela |
| 35 | attraversare a piedi fino all'isola | posizione sull'isola delle Palme ← curiosità | la zattera di fusti; la fune; la chiatta a pedali rubata | arrivato; recuperato dal gozzo |

---

## 10. Il grande brainstorm: 72 situazioni

Legenda di «che cosa serve»: **E** c'è già (verbi, pose, sistemi); **V** un verbo nuovo (posa che c'è, §B.4 del vocabolario); **M** un
modello, un effetto o un'animazione nuova. Il registro: R realistico, A assurdo, S surreale, T tenero, Vi violento, B burocratico,
F festivo, Ma marittimo.

| # | situazione | reg. | serve |
|---|---|---|---|
| 1 | Due pescatori si contendono l'ultima cassetta di ghiaccio; vince chi la lancia sul suo gozzo | R Ma | V (lancia) |
| 2 | Il fruttivendolo difende la bancarella dagli scippatori con il manico della scopa | R Vi | V (minaccia_con) |
| 3 | La nonna lancia la ciabatta al nipote che scappa con la Vespa del nonno | A T | V |
| 4 | Il secchio dal balcone sul corteo dei Grigi; il Grigio sbaglia balcone e multa il prete | A B | V (versa), E |
| 5 | Una rissa al Bar Da Gino con le sedie: chi si siede durante la rissa | A Vi | V (picchia con sedile) |
| 6 | Il KO in vicolo: il primo che passa lo fruga, il secondo lo soccorre, il terzo chiama i Grigi | R Vi | E (KO) + V |
| 7 | Il pignoramento: la televisione esce dalla finestra, la famiglia guarda il Garante dal vicino | R B | V + M (cartello) |
| 8 | L'asta del sabato in piazza: tutti vogliono la poltrona della vedova | R B | V (compra_all_asta) |
| 9 | La coda dello sportello annonario: la pausa caffè alle 10:30 svuota la coda in una rissa | A B | V (fai_la_fila) |
| 10 | Il gabbiano in coda col numeretto; il forestiero chiede, nessuno risponde | S B | E (le regole) + V |
| 11 | Il modulo 12/bis vola via dal molo; tre persone si tuffano | A Ma | V (lancia/tuffati) |
| 12 | Il timbro rubato: per una settimana le Lamiere hanno i permessi più belli della città | A B | V |
| 13 | La delazione scoperta: l'Archivio scassinato, la lista dei nomi letta al falò | R Vi | V + E |
| 14 | La rampa della discarica: la gara dei motorini, il primo volo, il primo dente rotto | R | E (struttura) + V |
| 15 | La torre di bancali sul belvedere per vedere la nave che non arriva | A | E + §8 |
| 16 | La catapulta delle Lamiere tira cocomeri sulla Caserma; il cocomero torna indietro | A Vi | §8 + M (leva) |
| 17 | La zattera di fusti per l'Isola delle Palme: affonda a metà strada, li riporta il gozzo | A Ma | §8 |
| 18 | La barricata di frigoriferi nel Passo delle Baracche; il frigo si apre: dentro i pesci del contrabbando | A | E (barrica) |
| 19 | La baracca addossata alla chiesa senza tetto: il prete ci celebra la messa | T S | E |
| 20 | La guerra dei colori fra Lamierini e Carbonai, una baracca per notte | R | V (dipingi_baracca) |
| 21 | Il pulcino della Ciurma porta la maglia a righe della madre (è una gonna) | A T | E (indossa) |
| 22 | La madre va a riprendersi il figlio nell'autobus dei Lamierini, col mestolo | A T Vi | V |
| 23 | Il carico di sigarette sbarcato di notte al pontile; i Saette lo rubano ai ladri | R Ma | V + E |
| 24 | La sparatoria alla Stazione; un treno passa in mezzo | Vi | E (scontri) |
| 25 | La tregua firmata al Circolo dei Lavoratori su un tovagliolo | R T | V (firma) |
| 26 | Il funerale del picchiatore: le due bande allo stesso funerale, una per lato della chiesa | R T | V + E |
| 27 | Il prestito in banca per la barca nuova; la barca affonda il primo giorno; la rata resta | R Ma | V |
| 28 | Lo strozzino e il cliente che gli paga la rata in pesce | A | E (baratta) |
| 29 | Il portavalori fermo in panne; mezzo paese lo spinge (gruppo per caso) | A | V (spingi_auto) |
| 30 | Il sussidio negato perché all'adunata eri al bagno; il ricorso dura una settimana | B | V |
| 31 | Il premio della delazione speso al bar offrendo da bere a quelli che hai denunciato | A Vi | E |
| 32 | La tessera annonaria intestata al cane | S B | V (intesta) |
| 33 | L'orto sul tetto del condominio Stella; il secchio d'acqua cade sul Grigio | A | V (pianta_orto) |
| 34 | La capra delle Lamiere mangia il modulo del permesso | A B | M (capra) + E |
| 35 | Il venditore ambulante abusivo scappa con tutto il banco quando arriva il Grigio | A | V (scappa con carico) |
| 36 | La serenata: il padre col secchio, il cane, la Vespa che non parte per la fuga | T A | V |
| 37 | Il matrimonio alla Marina; il pranzo sul molo; il gabbiano porta via il velo | F S Ma | E + V |
| 38 | La festa del patrono, la processione a mare; la statua sulla zattera storta | F S Ma | §8 + V |
| 39 | Il falò di Sant'Antonio; le bande portano la legna a gara; i Carbonai vincono | F | E (falò) |
| 40 | Il tuffo dal Molo Vecchio a Capodanno; uno non risale e torna dopo un'ora col polpo | F Ma A | V (tuffati, nuota) |
| 41 | La regata dei gozzi; la chiatta a pedali dei bambini taglia il traguardo per prima | F Ma A | E (mezzi) + V |
| 42 | Il cinema Astor: il film si rompe, il pubblico lancia le noccioline al proiettore | A | V (lancia) |
| 43 | La radio pirata dalla torre dell'acqua; il Garante interrotto da una canzone | A S | V + M (antenna) |
| 44 | La statua del Garante ridipinta di rosa in una notte | A | E (dipingi) |
| 45 | La religione nuova del molo che porta fortuna: tre fedeli il primo giorno, quaranta il quinto | S | E (idee, prodigi) + V (predica) |
| 46 | Il miracolo del lampione che si accende da solo (è l'allaccio abusivo dei Lamierini) | S A | V (allaccia_corrente) |
| 47 | Il cane che ruba la salsiccia al macellaio e la porta al Comandante | A S | M (cane) |
| 48 | L'highline fra il campanile e la torre dell'acqua; il pubblico paga per guardare | A | V + M (fune) |
| 49 | La fuga sui tetti dal Vico del Sale; il Grigio resta sulla grondaia | A Vi | V (arrampicati) |
| 50 | Il monociclo del giocoliere giù per la Salita dei Bottai | A | M |
| 51 | La statua vivente che starnutisce; la gente si rimette in fila per vederla starnutire | A | V |
| 52 | Il bambino che vende i sassi «del muro» ai turisti della nave | A T | E (vendi) |
| 53 | La partita sulla discarica spianata, la palla nel cortile della Caserma | R A | V (calcia) + M (palla) |
| 54 | Il pescatore che regala la pesca grossa alla vedova, di nascosto | T | E (regala di_nascosto) |
| 55 | Il vecchio che ogni sera lega la barca del compagno morto | T Ma | V (lega) |
| 56 | La lettera d'amore persa che il mare restituisce al padre sbagliato | S T | E (regola del mare) |
| 57 | Due rivali bloccati insieme nell'ascensore della Cultura (o nella cabina telefonica) | A | V |
| 58 | La Vespa rubata ritrovata ridipinta col colore dei Saette | R | E |
| 59 | La gara di chi mangia più ricci al Lido; il medico dell'ambulatorio fa il giudice | F A | E (mangia) |
| 60 | Il maestrale porta via il bucato: le mutande del brigadiere sul pennone della Rocca | A S | M (vento sui panni) |
| 61 | La mareggiata entra nella Calata; si salvano le cassette, si perdono le scarpe | R Ma | M (onda) |
| 62 | La nebbia ripete al molo la frase cattiva di ieri; la rissa di oggi | S | E (regola) |
| 63 | Il campanile batte 14 colpi: la scommessa del bar; i gemelli vendevano il conteggio | S A | E |
| 64 | Il ladro che entra dalla botola sbagliata e sbuca nel rifugio antiaereo durante l'adunata | A | E (sotto) |
| 65 | La festa clandestina nel borgo sepolto del 1660 | F S | E (sotto) + V |
| 66 | Lo scavo per il tesoro che sfonda la fogna; l'acqua nella cantina del notaio | A | E (scava) |
| 67 | Il dinosauro dissotterrato sotto la pineta: il Comune lo intesta e gli dà la tessera | S B | E + V |
| 68 | Il treno della metro bloccato a metà elica; i passeggeri si arrampicano sui pioli | A | E (metro) |
| 69 | Il furgone del contrabbando nel Sottopasso Cavour troppo basso | A | E |
| 70 | Il pittore di insegne che rifà l'insegna del bar con l'errore; il bar cambia nome | A | V (dipingi insegna) |
| 71 | Il comizio sulla cassetta del pesce: la cassetta si sfonda alla frase più importante | A | E (sedile in piedi) + GUASTI |
| 72 | Il giocatore che compra il posto in coda e lo rivende più caro | A B | V |

**Conto**: E 24, V 41, M 11 (alcune righe chiedono più cose). Le **M** che tornano più spesso: la fune tesa, il cartello e i decalchi
(pignorato, bruciatura, vernice fresca), la capra e il cane, la palla, l'antenna, il vento sui panni, l'onda della mareggiata. Tutte le
altre si vedono con pose che ci sono, bolla e onomatopea.

---

## 11. Come il regista tiene la varietà

Il regista (`unico_regista.js`) lavora già sui fili e sulle tensioni. Per un mondo così grande servono cinque regole in più, tutte a
conteggio e deterministiche:

1. **Le firme.** Ogni fatto e ogni desiderio hanno una firma (famiglia del verbo × tipo di bersaglio × registro × quartiere). Il
   regista conta le firme viste o sentite dal giocatore nelle ultime 6 ore e **non spinge** un filo la cui firma è già sopra 2.
2. **La rotazione delle famiglie.** Nel raggio del giocatore, ogni ora di gioco almeno 3 famiglie diverse (debito, offesa, affetto,
   costruire, istituzioni, mare, banda, surreale…). Se una famiglia domina, il regista `raffredda` i suoi fili e `spinge` una famiglia
   ferma da più tempo.
3. **I rari a quota.** Tre fasce: comune (senza limite), raro (≤ 3 al giorno: la sparatoria, il pignoramento, il volo, la radio
   pirata), rarissimo (≤ 1 alla settimana: il miracolo, la zona autonoma, la morte di un capo, la religione nuova). La quota è sulle
   **radici** (le spinte e le istituzioni), non sulle conseguenze: se la catena porta lì da sola, ci arriva.
4. **La prima volta.** Le variabili e i verbi mai usati in città hanno un premio (§9.9). Il regista le guarda apposta: la prima
   catapulta vale una Gazzetta.
5. **Il calendario e il meteo come rotazione naturale.** Il lunedì della rata e dell'affitto, il venerdì della paga, il sabato
   dell'asta, la domenica della messa e della partita, il giovedì del Lotto; il maestrale, la nebbia, la mareggiata cambiano che cosa
   è facile (le barche ferme riempiono il bar). Il regista usa le **istituzioni** come leva (già previsto: `radice()`).

Più la **regola del tre** (la terza volta lo schema si rovescia) e **l'interferenza** (almeno una al giorno: due fili che si toccano su
un oggetto: la poltrona pignorata finisce nella barricata).

**La misura** (in `test_regista`): l'entropia delle firme viste dal giocatore per ora di gioco ≥ 2,5 bit; nessuna firma > 25% in 6 ore;
almeno un raro al giorno nel raggio del giocatore.

---

## 12. Il piano, in ordine di «mondo per giorno»

I giorni sono giorni-persona, dietro `?commedia`, ognuno con le sue prove. L'ordine mette prima quello che **si vede di più in strada
per ogni giorno di lavoro**.

| # | passo | che cosa si vede | giorni |
|---|---|---|---|
| 1 | **Il contratto «sempre concreto»** (§2): esito `comico`, la tavola `GUASTI`, `rinuncia` concreta, il divieto della bolla vuota, la prova | ogni voglia finisce con una cosa vera; le cadute e i cocci in strada | 4 |
| 2 | **Gli oggetti in mano e il lancio** (§3): i sei numeri dalle proprietà, la cosa in mano generica, `lancia` per tutti su `st.proj`, rimbalzo, rottura, onomatopee, le cose a terra che si raccolgono | la città si riempie di gesti e di oggetti che volano | 6 |
| 3 | **La scala dell'aggressività** (§4): 8 gradini come verbi, la formula, i verbi della pace, ferite e KO, il filo di vendetta | liti vere, con il bastone, la padella, la fuga | 7 |
| 4 | **I desideri per variabili, prima tappa** (§9): `Var.dichiara` per corpo, borsa, proprietà, relazioni, sguardo; l'indice inverso dagli `EFF`; mimesi, perdita, testimonianza e torto; la ricerca a 60 nodi; `Lingua.DESIDERI` con gli `EFFETTI` di oggi come primi grappoli | i sogni che nascono da quello che la gente vede | 8 |
| 5 | **I fatti della prima volta e le firme** (§9.9, §11): firme, rotazione, rari a quota | la varietà, misurata | 3 |
| | *fino qui: 28 giorni; la città cambia già* | | |
| 6 | **Le Lamiere e due bande** (§5): la crescita delle baracche, Lamierini e Ciurma con colori, tag e basi, territorio per celle, ricettazione e contrabbando, le prime due scale di guerra | un quartiere che vive e si allarga | 9 |
| 7 | **La carta, prima parte** (§6.3): uffici, code vere, sportelli con orario, moduli e timbri come oggetti, permessi, multe, fascicoli | la burocrazia che si vede e fa ridere | 6 |
| 8 | **La banca e lo Stato** (§6.1-6.2): prestiti, rate, pignoramento visibile, asta del sabato, tessera, razione, sussidio con le condizioni, delazione | le conseguenze dei soldi | 6 |
| 9 | **Lo sbleuro** (§7.1): `Soldi.fmt`, il fattore, la tabella dei prezzi, la migrazione dei numeri | la moneta nuova ovunque | 2 |
| 10 | **Le parti e la costruzione libera** (§8): 13 parti, griglia, misure calcolate, l'editor del giocatore, le ricette di forma per la Mente | rampe, torri, zattere, catapulte | 10 |
| 11 | **Le altre due bande e il resto dei mercati** (§5.5-5.7): Saette e Carbonai, armi, spaccio, la retata, la sparatoria | la guerra delle bande | 6 |
| 12 | **Le variabili delle idee, dei gruppi e delle istituzioni** (§9.2): desiderare quello che pensa un altro, il colore di un posto, un permesso | i desideri più strani | 3 |
| 13 | **Il regime, prima tappa** (§R.1-R.2, R.6): il controllo per quartiere con le cinque leve che si vedono, la deriva, i gradi della risposta, l'intolleranza per la controcultura; i tenenti che decidono la politica del quartiere ogni giorno; i fatti e le idee che tornano | i posti di blocco che si spostano, il coprifuoco che cambia | 7 |
| 14 | **Il regime, seconda tappa** (§R.3-R.5, R.7-R.8): generali e campagne, il Consiglio con i trimestri e la lingua aziendale, corruzione, diserzioni e rivalità interne, i verbi verso ogni piano, i quattro indicatori, le soglie dei finali, la mappa del Taccuino | la partita lunga: settimane e mesi | 9 |
| | **In tutto** | | **≈ 84 giorni** (≈ 17 settimane per una persona; 6-7, 10 e 13-14 si possono fare in parallelo) |

Il passo 13 può salire subito dopo il 5 se la direzione vuole vedere prima il regime: poggia sul giro calore → fermo → idee che c'è già.

**Le prime cinque priorità**, in breve: (1) il contratto sempre concreto, (2) gli oggetti in mano e lanciabili, (3) la scala
dell'aggressività, (4) i desideri per variabili e differenze, (5) le Lamiere con le prime due bande, con accanto la prima tappa del
regime (il controllo per quartiere), che dà alle bande il loro nemico.

---

## Appendice tecnica

### T.1 Le variabili (`Var`)

```js
Var.dichiara({ k: 'quota', di: 'attore', leggi: (st, id) => Attore.di(st, id).z, scala: [0, 40], vis: 1 });
Var.dichiara({ k: 'possiede', di: 'attore', per: 'roba', leggi: (st, id, cosa) => Attore.di(st, id).quanti(cosa) });
Var.dichiara({ k: 'colore', di: 'posto', leggi: (st, pid) => UnicoCostruire.colore(st, pid) });
Var.dichiara({ k: 'idea_di', di: 'attore', per: 'soggetto', leggi: (st, id, s) => UnicoIdee.valore(st, id, s) });
```
- `di`: attore, cosa, posto, gruppo, istituzione. `per`: un secondo indice (la cosa, il soggetto, l'altro della relazione).
- Le variabili della vista `Attore` (soldi, borsa, mano, casa, lavoro, salute) e `rel` (10 numeri) si dichiarano da sole al caricamento.
- `vis`: se un cambiamento si vede da fuori (la quota sì, il conto in banca no: quello si sa solo dalle dicerie o dai fatti).

### T.2 L'indice inverso

```js
// al caricamento, da Verbo.REGISTRO[v].eff, dalle misure delle strutture, da Game.VK, dai ruoli degli oggetti
Var.mezzi['quota|+'] = [ { tipo: 'verbo', v: 'arrampicati', d: +6 }, { tipo: 'struttura', f: 'torre', d: +3 },
                         { tipo: 'verbo', v: 'salta_con_mezzo', d: +2.5, pre: ['struttura:rampa', 'possiede:mezzo'] }, ... ];
```
Un verbo con un effetto nuovo entra nell'indice da solo. `Verbo.controlla()` segnala le variabili che **nessun** mezzo può muovere
(sono i desideri impossibili: vanno nella lista `mancanti`, come oggi).

### T.3 La percezione delle differenze

```js
// in Fatto.scrivi (già un solo registro): per ogni fatto, chi lo vede o lo sente
for (const p of sensi(f)) for (const d of f.delta /* [var, di, prima, dopo] dichiarati dagli effetti */) {
  const s = salienza(p, d, f);           // |Δ| × vicinanza × peso tratto × rarità(firma)
  if (s > SOGLIA) Desideri.proponi(st, p, d, motivo(p, d, f), s);   // mimesi | perdita | vista | torto | contagio | curiosità
}
```
Il campo `f.delta` lo scrive `Verbo.fai` dagli effetti (oggi `eff` cambia già lo stato: si aggiunge solo l'annotazione).

### T.4 La ricerca

- Nodo = `(var, di, verso, quanto)`; espansione = `Var.mezzi[var|verso]` filtrati per `pre`; ogni `pre` non soddisfatto è un nodo figlio.
- Ordine: costo (tempo + soldi + rischio, pesati dai tratti) − plausibilità delle sostituzioni − premio della prima volta.
- Tetti: profondità 3, fascio 6, 60 nodi, ripianificazione 1. Cache `(var, verso, quartiere) → ricetta` per 1 giorno di gioco.
- L'esito è quello di `Verbo.fai`; il desiderio si chiude con `{ esito: pieno|meta|comico|rinuncia, delta reale }`.

### T.5 Le cose lanciabili

```js
Roba.fisica(id) → { kg, rimb, rompe: 'mai'|'urto'|'forte', danno, sporca, fuoco }   // calcolata una volta dalle proprietà, in cache
st.proj.push({ x, y, z, vx, vy, vz, g, kind: id, owner, rimb: n })                  // come oggi, con rimb e kind = la roba vera
```
Tetti: 12 in volo, 40 a terra per quartiere, onomatopea dalla tavola materiale × materiale.

### T.6 La banda

```js
Banda = { id, nome, colore: [inchiostro, inchiostro], segno, tag, capo, ruoli: { id: 'cassiera'|'picchiatore'|'pulcino'|... },
          base: { c: cantiere, posto }, territorio: { cella: influenza }, mercati: { ricettazione: { prezzo, scorte } },
          regole: [...], rapporti: { altra: −1..1 }, gradino: { altra: 0..6 }, cassa, calore, nata: fatto }
```
È un gruppo di `unico_gruppi.js` con tre campi in più (territorio, mercati, gradino). Lo stato in `st.u.bande`, solo dati.

### T.7 La pratica

```js
Pratica = { id, chi, tipo: 'permesso_costruire'|'sussidio'|'ricorso'|..., ufficio, modulo: id roba, timbri: [..], stato:
            'in_coda'|'allo_sportello'|'manca'|'accolta'|'respinta', scade, perche }
Fascicolo[id] = { livello, fatti: [id], ultima }
```

### T.8 Le parti

```js
Parte = { id, misure: [w, h, d], kg, prop: [...], giunti: [...] }
Struttura = { id, parti: [[parte, x, y, z, rot]], misure: { altezza, pendenza, portata, stabile, copre, galleggia, rotola, lancia, chiude } }
```
Le misure si ricalcolano a ogni parte posata (≤ 40 parti: pochi microsecondi); le ricette di forma della Mente sono un file di dati
generato fuori dal gioco.

### T.9 Le prove nuove

| prova | criterio |
|---|---|
| `test_unico_concreto.js` | ≥ 95% delle voglie chiuse con un cambiamento vero; 0 voglie > 1 giorno senza passo |
| `test_unico_lancio.js` | 1.000 lanci: nessun proiettile perso, tetti rispettati, esiti per materiale come la tavola |
| `test_unico_rissa.js` | la scala sale e scende; ogni gradino ha un'uscita usata ≥ 10%; le armi da fuoco solo per chi può |
| `test_unico_desideri.js` | seme 1-5, 3 giorni: ≥ 25 tipi di variabile desiderati, ≥ 6 motivi, entropia delle firme ≥ 2,5 bit, costo p95 ≤ 0,3 ms a battito |
| `test_unico_bande.js` | il territorio si sposta con i fatti; nessuna guerra sale più di 2 gradini al giorno; le Lamiere sotto il tetto di baracche |
| `test_unico_carta.js` | una pratica arriva sempre a uno stato finale; la coda non supera 12; il pignoramento restituisce le cose all'asta |
| `test_unico_parti.js` | 200 strutture a caso: le misure coincidono con il calcolo di riferimento; rampa/torre/zattera riconosciute come dice la misura |
| `test_unico_regime.js` | 90 giorni simulati, semi 1-5: C, S, M si muovono entro i limiti al giorno; senza guai la deriva resta lenta ma la risposta ai writer non scende sotto il grado 2; con una popolazione contro al 70% almeno un quartiere si libera in 30-60 giorni e può ricadere; ogni decisione di tenenti, generali e Consiglio è un fatto con un segno |
