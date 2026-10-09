# HANDOFF — Attività: interni più ampi e pieni, cose da fare (9 ottobre 2026)

Righe segnate `[attività]`.

## Le attività nuove (world.js)
Quattro botteghe in più, assegnate dopo le altre (quelle di prima restano dove sono): **Autorimessa Centrale**, **Armeria del Cacciatore** (col poligono), **Abiti e Confezioni**, **Birreria del Porto**.
Merce: `oggetti.js` SHOPLIST, `economia.js` SELL, `guardaroba.js` (i capi). Mestieri in `popolo.js` JOBS_BY: armaiolo, istruttore di tiro, commesse, oste e cameriera della birreria (di notte), venditore di auto, meccanici.

## Interni (interiors.js)
- **Più ampi**: dentro è più grande che fuori (`growOf`, `grownBox`). Il muro con la porta resta fermo, si cresce di lato e in profondità: botteghe e locali fino a +3 caselle, case +1/+2, capannoni +1, il faro no. Fuori, mentre sei dentro, non si vede, e chi è fuori non vede chi è dentro (`seesPlayer`).
- **La sala vera è la più grande** (`MAINBIG`): nei locali il bancone, il biliardo, le auto e gli abiti vanno nella stanza più grande, anche se non è quella d'ingresso.
- **Più pieni**: il quinto campo di una stanza in `R` è il riempimento, ripetuto finché la stanza è piena il giusto (26-30% del pavimento).
- `'*a|b'`: a in mezzo alla stanza, se non ci sta b contro il muro.
- **Punti attività**: nei gruppi `V` una voce `[':nome', x, y, rot]` è un posto dove si sta, non si disegna e finisce in `F.spots` (rot `null` vuol dire che guarda il centro del gruppo). Punti: `banco` (dietro il banco), `bevi`, `cliente`, `biliardo`, `freccette` (a 2,37 m dal bersaglio appeso), `jukebox`, `tiro`, `guarda`, `prova`, `auto`, `meccanico`. Ogni punto porta `gi`, il gruppo: se il mobile sparisce, il punto non vale più.
- Stanze nuove: sala_pub, sala_biliardo, cantina_birra, armeria_negozio, poligono, laboratorio_armi, negozio_vestiti, camerini, salone_auto, officina_r, ufficio_vendite. Il bar ha la sala del biliardo; le botteghe hanno il banco con la cassa e il posto del commesso (`@cassa`).

## Mobili nuovi (interni_arte.js)
Freccette, rastrelliera delle stecche, trofeo di caccia, fucili al muro, insegna della birra, cartello dei prezzi, poster delle auto, spillatore, casse di birra, stender, manichino, tavolo delle maglie, scaffale delle scarpe, camerino, vetrina delle armi, casse di munizioni, bersaglio, banco di tiro, auto in esposizione.

## Gli NPC (popolo.js, anim_vita.js, oggetti.js)
- Oggetti intelligenti nuovi: biliardo, freccette, jukebox, birra alla spina, poligono, vetrina dell'armeria, abiti, auto in vendita. Bancone e carte valgono anche in birreria, i motori anche all'autorimessa.
- Interessi nuovi: `giochi` (biliardo e freccette) e `caccia`.
- Al bar non stanno tutti al bancone: secondo gli interessi giocano a biliardo, alle freccette, a carte, mettono un disco, si siedono.
- Chi serve sta dietro il banco, rivolto ai clienti (`Lg.banco` dal punto `banco`); il meccanico sta al ponte.
- Pose nuove: `biliardo` (chino, ponte e tiro con la stecca), `freccette`, `mira` (fucile alla spalla, rinculo), `prova` (davanti allo specchio), `osserva` (mani dietro la schiena). Oggetti in mano nuovi: stecca, freccetta, fucile.

## Il giocatore (attivita.js, nuovo, dopo protagonista.js)
Nel menu QUI, ADESSO:
- **Autorimessa**: compra un mezzo (dalla Vespa a 60.000 lire alla GT-R a 1.200.000), che esce parcheggiato davanti al portone, tuo e non rubato. Potenzia motore, assetto, nitro e corazza del tuo mezzo parcheggiato davanti, con gli stessi livelli dell'Officina. Rivernicia un mezzo rubato (80.000 lire): dopo non risulta più rubato.
- **La cassa** di ogni bottega col banco: col commesso presente e un'arma in pugno la rapini (evento `rapina`, i testimoni lo ricordano); a negozio vuoto la forzi (un quarto d'ora). Dentro c'è l'incasso vero del negozio (`Economia` shops cash). Una cassa svuotata resta vuota 12 ore.
- Biliardo (da solo o in sfida con 5.000 lire sul tavolo), freccette, poligono, jukebox, camerino, volante dell'auto in esposizione.

## Cassaforti (cassaforti.js, nuovo, dopo attivita.js)
- Ci sono in 82 edifici: in tutti i retrobottega (`!st_cassaforte` in `retro`), nel magazzino dello Squalo, al comando, all'Armeria, in direzione e nel caveau della banca. Una volta su due negli uffici, nelle hall degli alberghi, negli studi, in sagrestia, al circolo; una su tre nei salotti buoni.
- **Dentro c'è l'incasso vero**: alle 21 la bottega mette in cassaforte la cassa (lascia 20.000), alle 8 la riprende (resta un fondo di 30.000) e alle 9 soldi.js la versa al Banco. Lo Squalo non versa: la sua cassaforte arriva fino a 3.000.000. In oggetti.js la voce `$safe` mostra l'incasso, `src: 'safe'` lo toglie.
- **Aprirla** (menu QUI, ADESSO davanti alla cassaforte; il pulsante «apri» del frugare usa il modo migliore che hai): combinazione (3 minuti, silenzio); stetoscopio (30-65 minuti, silenzioso, riesce dal 35% al 90% man mano che la mano migliora); trapano (com'era); candelotto (subito: esplosione, panico, brucia le carte e un quarto dei soldi).
- **La combinazione**: si cerca tra le carte di una scrivania dello stesso edificio (20 minuti, una volta al giorno, meglio negli uffici e negli studi), oppure si compra da chi ci lavora o ci abita (60.000 lire: dice di sì chi ha bisogno di soldi; chi dice di no se lo ricorda e a volte lo racconta, evento `corruzione`).
- **Sotto minaccia**: con l'arma in pugno il commesso la apre e resta aperta un'ora.
- **La mattina dopo**: Radio Porto dà la notizia, chi ci lavora o ci abita se lo ricorda, e il giorno dopo la cassaforte è di nuovo chiusa.
- Oggetti nuovi: `stetoscopio` (farmacia, magazzino) e `candelotto` (magazzino dello Squalo).

## Banca
- Il Banco di Porto Vecchio (scelto da soldi.js) ha la sala degli sportelli: sportello col vetro e due finestre, i posti dei cassieri, dei clienti e della fila coi paletti, la guardia accanto alla porta. Poi il caveau (porta tonda, due cassaforti, parete delle cassette di sicurezza, tavolo con mazzette e lingotti, carrello dei valori) e la direzione con la cassaforte del direttore.
- NPC: la guardia giurata sta al suo posto; chi ha pochi contanti va in fila allo sportello (oggetto `sportello`, posa `aspetta`).

## Case: dettagli, varietà, scene
- `'%a|b|c'`: una a caso fra le alternative, non la prima che ci sta. Così due case con la stessa pianta vengono diverse.
- Scene (gruppi `V`): la cena in tavola (piatti, pentola, vino, pane), la colazione (tazze, moka, lettere, frutta), la partita a carte lasciata a metà con la sedia rovesciata, il cucito, l'angolo dei bambini, il bucato da stirare, i compiti, chi fa la valigia, la radio clandestina (rara: studi, atelier, camere spoglie).
- 164 case su 203 hanno almeno una scena. Per terra scarpe, palle, giocattoli, sgabelli; l'altarino della nonna; la pentola sui fornelli e la frutta sulla credenza.

## Roba in giro: armi, barattoli, sigarette, bottiglie, snack
- **Modelli dal pacchetto «Nostalgia 2.5D»** (snack e oggetti anni '90): 18 oggetti `nx_*` in `assets/mf/` (con i gemelli `.json.js`): wafer, zuppa liofilizzata, due noodles, succo, cioccolata, barretta, crostini, tre tipi di caramelle, fetta di pane, maionese, semi, pan di zenzero, telefonino, cartucce, lettera. Convertiti con Blender (script nella sessione, fuori dal repository): misura vera in metri, base a terra, texture a 256 px. `models.js`: `FSCALE` vale 1 per `nx_`.
- **Fatti a mano** (interni_arte.js): pacchetto di sigarette (cinque marche), birre (una a volte rovesciata), vodka coi bicchierini, barattoli di latta con l'etichetta, vasetti di vetro, scaffale dei barattoli; armi: pistola, coltello, lupara, mitra, cassa di armi aperta, lupara appesa al muro. Anche le lattine e i vasetti dello scaffale della merce sono rifatti.
- **Si apparecchia** (`dress` in furnish, tabelle `SURF` e `DRESS`): su tavoli, banconi, credenze, scrivanie e comodini va la roba della stanza. Bar e birreria: birre, sigarette, vodka, bicchieri, posacenere, semi, carte. Cucine: barattoli, vasetti, noodles, pane, maionese. Caserme e armeria: cartucce, pistole, coltelli. Uffici: sigarette, lettere, telefonino. Camere: succhi, caramelle, cioccolata, lettere. Botteghe: snack e barattoli. In tutta la città circa 2000 cose sopra i mobili.
- **Armi sparse**: casse d'armi in caserma, nel magazzino dello Squalo, al poligono, a volte negli hangar e nei depositi; lupare e mitra per terra; una pistola sotto il banco nei retro (una volta su tre), coltelli e pistole nei ruderi; la lupara appesa al muro in casa di pescatori, contadini e del guardiano del faro.
- **Si prende**: ogni oggetto dà la roba vera (`LOOTX`: pistola, lupara, mitra, coltello, munizioni, sigarette, birra, vodka, scatolame, conserva, biscotti, cioccolato, pasta, succo, telefono…). Presa tutta, sparisce dalla stanza (`o.taken`, `pickGone` in oggetti.js, `rebuildIndoor`).

## Prove
- `node test_oggetti.js 1 1`: tutto a posto. 284 edifici, nessun piano irraggiungibile.
- Prova nel gioco: in birreria biliardo, tavolata, botti, bancone e gente; in autorimessa l'auto in esposizione e l'officina; le azioni compaiono nel menu.

## Da fare
- Le pose `biliardo` e `mira` sono controllate solo in piccolo: la stecca e il fucile potrebbero andare girati.
- Vendere all'Autorimessa un mezzo rubato (ricettazione).
- Chi guarda le auto o gli abiti resta fino alla fine del suo blocco, anche dopo la chiusura.
