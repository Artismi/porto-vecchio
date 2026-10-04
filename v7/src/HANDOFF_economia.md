# Porto Vecchio — L'economia e le Tasche (v6)

Base: v5 (azioni v2). Moduli nuovi:
- `src/economia.js`: solo logica, caricato dopo `azioni.js` (`<script>/*economia.js*/</script>`);
- `src/tasche_ui.js`: interfaccia, caricato dopo `risacca_ui.js` (`<script>/*tasche_ui.js*/</script>`).

Modifiche ad altri file, tutte segnate `[economia]` o `[azioni]`:
- `popolo.js`: `USE` (un oggetto della vita può essere vietato o costare scorte), `AVAIL` (si scartano le botteghe vuote), `ESSENTIAL` (mestieri coperti per primi: pescatori, allevatori, macellaio, saldatore, fabbro, falegname, fornai, boscaioli, cuochi…), le nuove botteghe nella spesa;
- `azioni.js`: oggetti nuovi (corda, sacchi, spugne, sapone, colla, chiodi, carta, inchiostro, manifesti, libretti), acquisti legati a scorte e prezzi (`setEconomy`), sangue che resta, verbi `pulisci`, `barrica`, `attacca`;
- `main.js`: l'icona e il nome nel HUD mostrano l'attrezzo in mano.

## Le merci
`MERCI`: ~55 cose con prezzo base (migliaia di lire), genere e scorta normale: cibo (pane, verdura, frutta, olio, latte, formaggio, carne, pesce, scatolame, pasta, caffè, zucchero, vino, sale, pasto caldo), materie (farina, capi di bestiame, ferro, legno, stoffa), attrezzi, roba di casa, vizi, e la stampa clandestina.

## Chi vende
- **Nuove botteghe** su case di città libere vicino alla piazza: Macelleria Gavino, Frutta e verdura Tina, Fabbro Nello, Falegnameria Efisio. La più grande diventa l'**Emporio Imperiale** (insegna EMPORIO, rossa).
- **Emporio Imperiale**: il supermercato del regime nazicapitalista, con tutto quello che l'isola non fa (corda, sacchi, spugne, sapone, colla, nastro, pile, lampadine, carta, inchiostro, caffè, zucchero, pasta, farina, ferro, legno, benzina, telefoni…).
  - Prezzi ×1,5.
  - Comprare sotto i ritratti del Garante abbassa un po' l'ideologia.
  - Lo rifornisce la **nave dell'Impero**, lunedì e giovedì all'alba. Con repressione alta la Tutela ne trattiene metà, e può bloccarla (`eco.blocked`).
- **Le altre**: Wu, panetterie, pescheria, ferramenta, tabacchi, officina, benzina, videoteca, farmacia, sartoria, osterie (pasti), bar (panini).
- **Il mercato** in piazza: mercoledì e sabato, dalle cascine, fino all'una.
- **Il magazzino dello Squalo**: mercato nero a prezzo doppio.

## Chi produce
Si produce solo durante l'ora di lavoro, nel posto di lavoro, consumando quello che serve (`PROD`):
- il fornaio fa il pane con la farina;
- i braccianti fanno verdura e frutta, l'oliveto l'olio, il vignaiolo il vino;
- l'allevatore (all'ovile) dà latte, formaggio e capi; il macellaio fa la carne dai capi;
- il pescatore porta il pesce, il conservificio ne fa scatolame;
- il saldatore fa il ferro, il fabbro ci fa coltelli, pale, piedi di porco e chiodi;
- il boscaiolo (sugheri, pineta) fa il legno, il falegname ci fa casse, mobili e carriole;
- il cuoco fa i pasti con gli ingredienti dell'osteria; la sarta i vestiti; il salinaro il sale.

Quando il magazzino è pieno si lavora a vuoto. Le **consegne** ogni ora portano la roba alla bottega più sguarnita che la vende, le materie prime ai laboratori, gli ingredienti alle osterie.

## I prezzi e la scarsità
- Il prezzo sale fino a ×3 quando una cosa scarseggia.
- La spesa (oggetti `bottega`, `bancarelle`), il pasto all'osteria e il panino al bar tolgono dalle scorte. Se manca, la persona se lo segna ("a Wu è finito il pane", tag `scarsita`), si arrabbia un po' e la prossima volta va altrove.
- Due mancanze in due giorni portano un pensiero notturno: "non si trova più niente, e all'Emporio costa il doppio" / "la Tutela ci affama", e l'ideologia sale.
- Gli oggetti in mano (pala, corda, sacchi…) si comprano solo dove ce ne sono, al prezzo del momento; vale anche per il giocatore.

## Il lavoro clandestino
Progetto `clandestino`, per chi ama l'arte (o il tipografo politicizzato) con ideologia alta e coraggio:
1. compra carta, inchiostro e colla, senza dare nell'occhio;
2. stampa di notte in cantina (o in tipografia, a luci spente): 8 manifesti e 4 libretti;
3. attacca i manifesti su un muro di notte («IL PANE COSTA IL DOPPIO, LA PAURA È GRATIS», «RIDATECI …»);
4. passa i libretti all'osteria: agli amici, e se non bastano a chi c'è e sembra pensarla uguale.

Chi legge un libretto ha l'ideologia più alta, e il morale della Risacca sale. Il rischio: un Orecchio vicino di casa sente il ciclostile, o un lettore porta il libretto alla Zia. Allora arrivano i **Grigi**: perquisizione, due giorni di cella, repressione più alta.

Verbi diretti: `stampa` e `attacca` (servono manifesti e colla).

## Le cose nuove e a cosa servono
- **corda**: chi butta un corpo in mare lo lega a una pietra, e il mare non lo restituisce quasi mai (8% invece di 40%).
- **sacchi neri**: nel cassonetto il corpo chiuso nei sacchi lo trova il netturbino il 30% delle volte invece del 60%.
- **spugne e sapone**: il sangue di un omicidio resta a terra (`st.pop.stains`) finché qualcuno non lo lava (verbo `pulisci`; chi fa sparire un corpo ci torna se è prudente). Senza spugne resta l'alone. Il sangue non lavato prima o poi lo vede qualcuno, e se ne parla.
- **colla**: per attaccare i manifesti.
- **chiodi**: verbo `barrica`, inchiodare assi a porta e finestre.

## Le Tasche (giocatore)
Menu a tutto schermo nello stile del menu Zaino (`menu-zaino-personaggio.zip`): fondo scuro, BORSA a sinistra, dettaglio al centro, QUI a destra, tasti in basso, IN TASCA a destra. Il gioco va in pausa (`ui.menu`).
- **I**, oppure il pulsante TASCHE in basso a destra, apre e chiude il menu.
- **BORSA**: icone pixel 32×16 nello stile di quelle delle armi (coltello, pala, piede di porco, carriola, bomboletta, pennello, gesso, tanica, cellulare, macchina fotografica, carte, corda, sacchi, spugne, sapone, colla, chiodi, carta, inchiostro, manifesti, libretti…). Le cose lunghe (lupara, mitra, pala, carriola) occupano due caselle. Il segno giallo indica quello che hai in mano, il segno rosso la roba che scotta.
- **Dettaglio**: nome, icona grande, descrizione; per le armi caricatore e barre (danno, cadenza, gittata). Sotto c'è il pulsante IMPUGNA.
- **QUI, ADESSO**: le azioni possibili in quel posto con quello che hai in mano (solleva, scava, chiama la Guardia, dipingi, attacca i manifesti, compra…). Quelle non possibili sono spente, con il motivo.
- Comandi: clic seleziona, doppio clic impugna, **0-9** impugna subito (0 = mani libere), **U** fa la prima azione possibile (anche a menu chiuso, con un suggerimento sopra il HUD), **Esc** torna al gioco, **Tab** passa al Taccuino.
- Nel HUD l'icona e il nome dell'arma mostrano l'attrezzo in mano.
- Per unirlo al menu Zaino dell'altra build (stesso tasto I): le Tasche diventano la scheda Zaino, il Personaggio resta com'è.

## Prove
- `src/test_economia.js` (`node test_economia.js [giorni] [seme]`): botteghe nuove, mestieri, scorte e prezzi giorno per giorno, la nave bloccata, il lavoro clandestino forzato, un barricarsi in casa.
- `test_vita.js` e `test_azioni.js` caricano anche `economia.js`.

## Limiti noti
- Le scorte le "vedono" tutti: chi pianifica la spesa evita una bottega vuota anche senza esserci passato.
- I soldi delle botteghe (`cash`) non pagano ancora gli stipendi: la paga viene da `popolo.js` come prima.
- Il mercato del mercoledì e del sabato lo riforniscono solo le cascine, all'alba.
