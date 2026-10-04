# Porto Vecchio — La Vita: interessi, bisogni, progetti, piani, azioni (3 ottobre, notte)

Base: v3 (città + abitanti). Direzione: il documento "Città che ricorda", strati 1-4 degli NPC, con il modello linguistico ancora da agganciare.

## Cosa è cambiato

Tutto il lavoro sta in `src/popolo.js`. Le sezioni nuove si chiamano `LA VITA` e le righe toccate nelle funzioni vecchie sono segnate `[vita]`. In `main.js` c'è una sola riga `[vita]`: nel Taccuino, sotto ogni personaggio, compaiono interessi, progetti e l'ultimo pensiero. `game.js`, `world.js`, `risacca.js` e `render.js` non sono stati toccati.

### La catena, uguale per tutti
**interessi + bisogni → progetti (di notte, la Mente) → piani (passi su più giorni) → azioni (blocchi della giornata, fatte con gli oggetti)**

- **Tutti i personaggi** (`adopt`): oltre ai 173 abitanti, entrano nella vita i 33 personaggi del cast: Gino, Lupo, Vinile, lo Squalo e i suoi, i marsigliesi, Malanotte, il Colonnello, la Pardo, la Zia, i passanti e gli automobilisti. Ognuno tiene la casa, gli orari e il mestiere che ha nella storia (`planCast`: Lupo resta in biblioteca negli orari di lavoro). Intorno agli orari ci sono sonno, bisogni, appuntamenti e progetti.
- **Passivi**: i Grigi in servizio e i membri o incaricati della Risacca li muove il motore (`isPassive`). Hanno comunque bisogni, diario e pensieri notturni, ma non progetti propri: la banda si muove con i compiti della Risacca.
- **Oggetti intelligenti** (`OGG`, 27): letto, cucina (consuma la dispensa), bagno, TV del Garante (propaganda), radio, bancone, tavolo da scopa, tavola dell'osteria, panino, bottega, bancarelle (solo nei giorni di mercato), panchina, fontana, spiaggia, canna da pesca, banchi della chiesa, cero, libri, flipper, pista della Luna, cinema, pallone, palestra, officina, orto, barbiere, macchina fotografica. Ogni oggetto dichiara dove sta, in che orari si usa, quanto costa, cosa toglie all'arrivo (`once`) e per ogni ora (`perH`), e quale interesse soddisfa. `chooseObj` sceglie per bisogno o interesse, tenendo conto di strada, prezzo, paura, posti da evitare e risparmio. Basta aggiungere una riga a `OGG` perché tutti trovino da soli il nuovo comportamento.
- **Bisogni**: fame, sonno, igiene, compagnia, svago, rabbia, paura, più **soldi** (affitto, debito, contanti). Crescono con le ore e li calano gli oggetti in uso. Quando uno diventa urgente, `urge` sceglie l'oggetto migliore e sposta il programma. Chi dorme non si alza per un capriccio. Al lavoro si mangia sul posto, con la schiscetta o un panino. La dispensa si svuota e si va a fare la spesa.
- **Interessi** (16, `INTERESSI`): ognuno ne ha 2-3, pesati per età, sesso e mestiere (i pescatori la pesca, i tipografi i libri, chi ha perso qualcuno la politica). La voglia di ciascuno cresce di circa 0,15 al giorno e cala usando gli oggetti di quell'interesse. Pesano sulle scelte di svago di ogni giorno.
- **Memoria** (`note`): il diario tiene 30 ricordi, ognuno con peso emotivo, posto, persona ed etichetta (`arresto`, `fermato`, `furto`, `bidone`, `squalo`, `scritta`, `progetto`…). Quando è pieno se ne va il ricordo che pesa meno in proporzione a quanto è vecchio.
- **La Mente** (`reflect`, a mezzanotte, per tutti): rilegge il diario e le memorie del motore e ne ricava:
  - i posti da evitare per 3 giorni ("Via al Mare non è più un posto sicuro");
  - chi non è affidabile, perché ha dato buca due volte;
  - chi è un ladro (`enemies`);
  - se c'è da risparmiare;
  - la paura che tiene in casa la sera (`selfCurfew`);
  - la rabbia che cresce rimuginando su un torto.

  Poi apre i progetti: prima quelli dei bisogni, poi un interesse trascurato. Il pensiero che pesa di più finisce nel diario. `CFG.mind` è l'aggancio pronto per il modello linguistico: riceve `mindPrompt` (chi è, interessi, bisogni, ricordi pesati, progetti, pensieri).
- **Progetti** (`PROJ`, al massimo 2 in testa):
  - dai bisogni: trovare un lavoro, pagare lo Squalo, trovare i soldi dell'affitto, conoscere qualcuno, sapere che fine ha fatto un parente fermato, fargliela pagare alla Tutela, vendicarsi di un ladro;
  - dagli interessi: pescare all'alba, una partita a scopa con un amico, un libro, capire cosa succede davvero, comprarsi una radio o una macchina fotografica, il sabato alla Luna, una partitella, il cinema, sistemare la Vespa, il pranzo della domenica, l'orto, la caletta, un vestito nuovo, raccogliere voci.

  I passi sono di tre tipi: `go` (un posto a un'ora, con un oggetto), `save` (mettere da parte, attivando il risparmio) e `meet` (un appuntamento vero con un amico o uno sconosciuto). `planProjects` mette nel programma il passo di oggi senza toccare il lavoro; se il passo si fa sul posto di lavoro, lo si fa lì. I progetti si interrompono, si ripetono, falliscono o scadono dopo 6 giorni. Un fermo in famiglia cambia la giornata subito: appena staccato dal lavoro, si va alla Rocca.
- **Simmetria** (`npcWrite`): chi è arrabbiato, coraggioso e vicino alla Risacca scrive sul muro di notte ("Ridateci Marco"). Ne esce un evento `scritta` (con `npcCrime`), si alzano morale e repressione e può scattare un fermo. Chi passa davanti alla scritta la legge e reagisce: adesione, paura o una soffiata ai Grigi.
- **Chat**: la scheda di ogni personaggio (`Risacca.CARDS[id].bio`) si legge in diretta. Al testo scritto della storia si aggiungono interessi, cosa ha fatto oggi, progetti, l'ultimo pensiero, i bisogni e i ricordi più pesanti (`lifeOf`).

## Prove
- `src/test_vita.js`: `node test_vita.js [giorni] [seme]`. Produce un registro giorno per giorno di 13 personaggi (7 del cast e 6 abitanti), con giornata, pensieri della notte, progetti con il passo a cui sono, progetti chiusi e bisogni. Mercoledì alle 10 forza un fermo per seguire la reazione della madre. Esempio in `registro_vita.txt`.
- 5 giorni, seme 1: 206 personaggi, circa 0,65 ms di logica per passo; circa 200 progetti nati e 110 riusciti, 86 appuntamenti (23 bidoni). Semi 2 e 3 senza errori. Pagina aperta in Chromium senza errori, Taccuino controllato.
- La catena rabbia → osteria → scritta l'ho verificata forzando i valori di partenza. Nei 5 giorni normali non scatta, perché la repressione resta bassa e i fermi sono pochi: si accende quando la Tutela stringe.

## Da fare dopo (ordine del documento)
1. Agganciare `CFG.mind` al modello linguistico (budget per personaggio al giorno): i pensieri e i piani li scrive lui, e il motore controlla i passi con `PROJ`/`OGG`.
2. Le azioni base generiche (prendi, sposta, rompi, nascondi, scava, accendi…) sopra gli oggetti, con un arbitro per i casi non coperti.
3. La chat della banda al telefono, i ripetitori, le scritte sul canvas pixel.
