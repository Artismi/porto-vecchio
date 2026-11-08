/* Porto Vecchio — [commedia] TRENTA SCENE NUOVE (proposta, da incollare nel catalogo SCENE di eventi.js o in coda come matti.js)
   Stesso formato di eventi.js: ruoli con filtro, battute in fila, posto/ora/giorni/soft/player. In più, campi solo descrittivi
   che l'interprete ignora: titolo, tipo, dove, nota, e per ogni ruolo «chi» (come si chiama nel copione).

   Le battute che il motore NON sa ancora fare (oggi l'interprete le salta: nessuna chiave nota → attesa zero) sono:
     {ask:'a', q:[...], opts:[{t:'testo del tasto', then:[...]}], t:12, def:1}
                                 [NUOVO] una scelta per il giocatore (2-3 tasti), t secondi per decidere, def il ramo se non sceglie
     {say:'player', l:[...]}     [NUOVO] la battuta di Nino (fumetto sul giocatore, scelta col ramo)
     {memo:'a', v:+1, k:'...'}   [NUOVO] chi recita si ricorda del giocatore (diario: k è la parola chiave, v il segno)
     {rep:'famiglia', d:+1}      [NUOVO] la reputazione con un gruppo (famiglia, grigi, ragazzi, quartiere, risacca)
     {money:+3}                  [NUOVO] soldi al giocatore (in migliaia; negativo: paga lui)
     {give:'player', id:'...'}   [NUOVO] un oggetto nella Tasca del giocatore
     {hunt:'a', sp, t, catch:[...], lose:[...]}   [NUOVO] a insegue il GIOCATORE (chase oggi vuole due ruoli)
     {playerTo:'a', t}           [NUOVO] aspetta che il giocatore vada da a (al massimo t secondi), se no salta
     {tv:'spot', on:true}        [NUOVO] lo schermo del bar/della piazza col Garante acceso o spento
     {window:'a'}                [NUOVO] a si affaccia a una finestra/balcone sopra il posto (wrH con la quota della finestra)
     {throw:'a', id, to}         [NUOVO] a lancia un oggetto che cade a terra vicino a to (resta per terra, si raccoglie)
     {car:'polizia', pass:true}  [NUOVO] un'auto passa piano sulla via più vicina e se ne va (la ronda)
   Filtri nuovi proposti: 'prete' (il prete di San Rocco), 'marsigliese' (di notte al pontile), 'orecchio' (un informatore);
   posti nuovi: 'caserma' (davanti alla Pietra dell'Onda / al commissariato), 'officina', 'cabina' (il telefono pubblico), 'bar_tv'
   (il dehors con lo schermo). Dove manca, la scheda ha soft:true e un posto di ripiego che esiste già.
   Pose usate: solo quelle che esistono (anim_vita.js / anim_lotta.js); oggetti in mano: famiglie di anim_mano.js.
*/
(function () {
  'use strict';
  const SAY = (r, ...l) => ({ say: r, l });
  const SCENE_NUOVE = [

    // ================= MATTINA =================
    { id: 'timbro_del_timbro', titolo: 'Il timbro del timbro', tipo: 'Grigi, folla', dove: 'mattina, davanti alla caserma (lo sportello)',
      w: 2, when: 'day', ora: [8, 12], giorni: [0, 1, 2, 3, 4], posto: ['caserma', 'fila', 'portone'], soft: true,
      roles: [{ id: 'a', f: 'cop', r: 30, chi: 'il Grigio allo sportello' }, { id: 'b', near: 'a', f: 'old', r: 24, chi: 'il primo della fila' },
        { id: 'c', near: 'a', f: 'adult|any', r: 24, chi: 'il secondo' }, { id: 'd', near: 'a', f: 'young', r: 24, chi: 'il ragazzo in fondo' }],
      nota: 'Folla di 5 in fila. Al 30% il ragazzo viene trattenuto (jail). Serve il posto «caserma» [NUOVO], se no la fila del forno.',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 4, sp: 1.4 }, { slot: 'b', i: 1, n: 4, sp: 1.3 }, { slot: 'c', i: 2, n: 4, sp: 1.3 }, { slot: 'd', i: 3, n: 4, sp: 1.3 }] },
        { crowd: 5, around: 'b', r: 22, p: 'aspetta' }, { pose: 'a', p: 'aspetta' },
        SAY('a', 'Il prossimo. Modulo 7?', 'Avanti. Ha il modulo per il modulo?'),
        SAY('b', 'Ho il 7. Il 7-bis me l\'avete preso voi a marzo.'),
        SAY('a', 'Senza il bis, il 7 è carta. Torni col bis.'),
        SAY('b', 'E il bis dove lo prendo?'), SAY('a', 'Qui. Ci vuole il 7 timbrato.'),
        { mood: 'b', m: 'rabbia' }, { pose: 'b', p: 'discute_su' },
        SAY('b', 'Ma il 7 lo timbrate solo se c\'è il bis!'),
        SAY('a', 'Vede che ha capito? Il prossimo.'), { pose: 'b' },
        SAY('c', 'Io devo fare il certificato di esistenza in vita.'),
        SAY('a', 'Lei è vivo?'), SAY('c', 'Credo.'), SAY('a', 'Credo non è un timbro.'),
        SAY('folla', 'Alle dieci e mezza chiudete! Sono le dieci!', 'Mia madre è morta in questa fila. Aspettava il certificato.',
          'Io vengo per abitudine. A casa mi annoio.', 'Il bis lo vende il cugino del piantone. Diecimila.'),
        SAY('d', 'Fra, io devo solo ridare una tessera. L\'ho trovata.'),
        { look: 'a', at: 'd' }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Trovata? Venga dentro. Si accomodi.'), { pose: 'a' },
        { p: .3, then: [SAY('d', '...ciao a tutti. Salutatemi mia madre.'), { go: 'd', to: 'a', sp: 1.2, d: 1, t: 8 }, { jail: 'd' }],
          else: [SAY('d', 'Sai che c\'è? Me la tengo. Mi piace la foto.'), { flee: 'd', from: 'a', sp: 2.4 }] },
        SAY('a', 'Chiusura per pranzo. Riapriamo quando riapriamo.'),
        SAY('folla', 'Vaffanculo, va\'.', 'Ci vediamo domani. Stessa fila.', 'Io resto. Così domani sono il primo.'), { wait: 3 }] },

    { id: 'cravatte_dal_balcone', titolo: 'Le cravatte dal terzo piano', tipo: 'lite pubblica, folla', dove: 'mattina, sotto un condominio (il portone)',
      w: 2, when: 'day', ora: [7, 11.5], posto: 'portone',
      roles: [{ id: 'a', f: 'f', chi: 'Tiziana, la moglie, al balcone' }, { id: 'b', near: 'a', f: 'adult|m', r: 18, chi: 'il marito, in canottiera' },
        { id: 'c', near: 'a', f: 'f', r: 22, chi: 'la vicina del quarto' }],
      nota: 'Folla di 5. Servono il balcone e gli oggetti lanciati che restano a terra [NUOVO]; senza, la moglie urla dal portone.',
      beats: [
        { window: 'a' }, { slot: 'b', i: 0, n: 1, sp: 1.6, face: 'out' }, { mood: 'b', m: 'freddo' },
        SAY('b', '{a}! Apri! È un malinteso!', '{a}, amore! Ti spiego tutto! Apri!'),
        SAY('a', 'Il malinteso si chiama Loredana e sta al quarto!'),
        { throw: 'a', id: 'maglia', to: 'b' }, SAY('b', 'Le cravatte no! Sono di mia madre!'),
        { crowd: 5, around: 'b', r: 22 },
        SAY('folla', 'Brava {a}!', 'Loredana del quarto? Pure con mio marito.', 'Butta il televisore, che lo vediamo tutti.'),
        { pose: 'b', p: 'discute_su' }, SAY('b', 'Che avete da guardare? Non ce l\'avete una casa?'),
        SAY('folla', 'Sì, ma la tua è più divertente.', 'La mia è noiosa. Mio marito è fedele. Che schifo.'), { pose: 'b' },
        { throw: 'a', id: 'radio', to: 'b' }, SAY('b', 'La radio no! C\'è la partita!'), SAY('a', 'Ascoltala da Loredana!'),
        { window: 'c' }, SAY('c', 'Io non c\'entro! Gli ho prestato lo zucchero!'),
        SAY('a', 'Tre volte a settimana, lo zucchero?!'), SAY('folla', 'Ohhh.', 'Uh, lo zucchero.', 'Io lo zucchero lo compro, eh.'),
        { pose: 'b', p: 'raccoglie', w: 1.4 }, { hand: 'b', id: 'maglia' }, { pose: 'b' },
        SAY('b', 'Va bene. Vado da mia madre.'), SAY('a', 'Tua madre ha già telefonato. Non ti vuole neanche lei.'),
        { flee: 'b', from: 'spot', sp: 1.5 }, SAY('folla', 'Prova dal prete!', 'Ciao, bello!'), { wait: 3 }] },

    { id: 'comitato_del_nove', titolo: 'Il comitato del 9', tipo: 'assemblea, folla, Grigi', dove: 'mattina presto, alla fermata',
      w: 2, ora: [6.5, 9.5], posto: ['fermata', 'pensilina'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'il portavoce improvvisato' }, { id: 'b', near: 'a', f: 'old', r: 18, chi: 'la signora con la borsa' },
        { id: 'c', near: 'a', f: 'young', r: 20, chi: 'il ragazzo' }, { id: 'd', near: 'a', f: 'cop', r: 40, min: 10, chi: 'il Grigio che passa' }],
      nota: 'Folla di 4 + 3 ruoli. Chi alza la mano lo vede il Grigio: niente conseguenze per ora (potrebbe segnare la fermata).',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.2 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { crowd: 4, around: 'a', r: 20, p: 'aspetta' },
        SAY('b', 'Quaranta minuti. Il 9 non passa.'), SAY('c', 'Il 9 non esiste, signora. È una leggenda.'),
        { pose: 'a', p: 'braccia_su' }, SAY('a', 'Basta! Cittadini! Facciamo un comitato!'),
        SAY('folla', 'Bravo!', 'Chi paga?', 'Ci sto, se finisce prima delle otto.'),
        SAY('a', 'Primo punto: il 9. Secondo: chi ha rubato il 9.'), SAY('c', 'Terzo punto: la merenda.'),
        SAY('a', 'Votiamo! Chi è per lo sciopero dell\'attesa?'), { pose: 'folla', p: 'mani_alzate_su' }, { pose: 'c', p: 'mani_alzate_su' },
        { go: 'd', to: 'spot', sp: 1.8, d: 2.4, t: 10 }, { pose: 'folla' }, { pose: 'c' }, { pose: 'a' },
        SAY('d', 'Che è questo capannello? Assembramento?'),
        SAY('a', 'No, agente. Aspettiamo il 9.'), SAY('folla', 'Il 9, sì.', 'Viva il 9.', 'Io manco lo so cos\'è un comitato.'),
        SAY('d', 'Il 9 da oggi è soppresso. Circolare.'), SAY('b', 'E noi come ci andiamo, al lavoro?'),
        SAY('d', 'Con la fantasia, signora. Come tutti.'),
        { all: [{ go: 'b', to: 'away', sp: 1.2, d: 2, t: 10 }, { go: 'd', to: 'away', sp: 1.3, d: 2, t: 10 }] },
        SAY('c', 'Presidente, ci vediamo domani?'), SAY('a', 'Non ti conosco. Non ci conosciamo.'), { wait: 2 }] },

    { id: 'prefica_a_ore', titolo: 'La piangitrice a ore', tipo: 'funerale, folla, scelta', dove: 'mattina, sul sagrato di San Rocco',
      w: 1, player: true, when: 'day', ora: [9, 12.5], posto: 'sagrato',
      roles: [{ id: 'a', f: 'old|f', chi: 'la piangitrice' }, { id: 'b', near: 'a', f: 'f', r: 20, chi: 'la vedova' },
        { id: 'c', near: 'a', f: 'old|m', r: 22, chi: 'il cerimoniere delle pompe funebri' }],
      nota: 'SCELTA. Sì: la vedova ti ricorda (+2) e ti dà il cappello del morto. Paghi lo svenimento: -12 mila, ti ricordano tutte e due.',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 3, sp: 1.2 }, { slot: 'b', i: 1, n: 3, sp: 1.2 }, { slot: 'c', i: 2, n: 3, sp: 1.2 }] }, { crowd: 5, around: 'b', r: 22, p: 'aspetta' },
        { pose: 'a', p: 'prega' }, SAY('a', 'Ohhh Gesualdo! Gesualdo nostro!'), SAY('b', 'Si chiamava Ernesto.'), SAY('a', 'Ohhh Ernesto! Ernesto nostro!'),
        SAY('folla', 'Era uno buono, Ernesto.', 'Mi doveva diecimila lire.', 'Chi è quella?'),
        SAY('folla', 'La piangitrice. Otto a funerale, dodici con lo svenimento.'),
        { pose: 'a' }, SAY('a', 'Signora, lo svenimento è compreso?'), SAY('b', 'Non ho i soldi neanche per i fiori.'), SAY('a', 'Allora piango a metà.'), { pose: 'a', p: 'prega' },
        { look: 'b', at: 'player' }, SAY('b', 'Lei! È il nipote di Torino? Ernesto parlava sempre di lei.'),
        { ask: 'b', t: 12, def: 1, q: ['È lei? Il nipote?'], opts: [
          { t: 'Sì, sono il nipote', then: [
            SAY('folla', 'Il nipote! È venuto!', 'Quello di Torino! Quello ricco!'), SAY('c', 'Il nipote dice due parole.'),
            SAY('player', 'Ernesto era... alto.'), SAY('folla', 'Era basso.', 'Bellissime parole.', 'Ha ragione. Dentro, era alto.'),
            { pose: 'b', p: 'porge', w: 1.5 }, { give: 'player', id: 'cappello' }, { pose: 'b' },
            SAY('b', 'Tieni. Il cappello di Ernesto. Lo voleva a te.'), { memo: 'b', v: 2, k: 'il nipote' }, { rep: 'quartiere', d: 1 }] },
          { t: 'No, mi dispiace', then: [
            SAY('b', 'Peccato. Quello vero non viene da nove anni.'),
            SAY('a', 'Neanche io sono la sorella. Eppure guardi come piango.')] },
          { t: 'Pago io lo svenimento', then: [
            { money: -12 }, SAY('a', 'Ohhh Ernesto! Portami con te!'), { fall: 'a', t: 4 },
            SAY('folla', 'Mamma mia, che professionista.', 'Questo sì che è un funerale.', 'Al mio la voglio uguale.'),
            { up: 'a' }, SAY('a', 'Ricevuta?'), { memo: 'b', v: 1, k: 'lo svenimento' }, { memo: 'a', v: 1, k: 'cliente' }] }] },
        SAY('c', 'Signori, il carro non aspetta. Ha un altro giro alle undici.'), { wait: 3 }] },

    { id: 'arance_sovversive', titolo: 'Le arance d\'importazione', tipo: 'Grigi, folla di vecchie', dove: 'mattina, al mercato',
      w: 2, when: 'day', ora: [8, 12.5], posto: ['mercato', 'banco_pesce'], soft: true,
      roles: [{ id: 'a', f: 'cop', r: 32, chi: 'il Grigio anziano' }, { id: 'b', near: 'a', f: 'cop', r: 30, chi: 'il Grigio giovane' },
        { id: 'c', near: 'a', f: 'old|f', r: 22, chi: 'la signora con la rete' }],
      nota: 'Folla di 5. Se ci sono due Grigi in pattuglia vicini. La rete passa di mano (hand). Nessuna conseguenza sul giocatore.',
      beats: [
        { hand: 'c', id: 'borsa' }, { all: [{ go: 'a', to: 'c', sp: 1.6, d: 1.2, t: 16 }, { follow: 'b', who: 'a', sp: 1.6, d: 1.6 }] }, { look: 'c', at: 'a' },
        SAY('a', 'Signora, cos\'ha nella rete?'), SAY('c', 'Arance.'), SAY('a', 'Da dove?'), SAY('c', 'Dal banco. Lì.'),
        SAY('a', 'E il banco da dove le prende?'), SAY('c', 'Dall\'albero, agente. Le arance vengono dagli alberi.'),
        { pose: 'a', p: 'indica_su' }, SAY('a', 'Frutta d\'importazione non dichiarata. Sequestro.'), { pose: 'a' },
        { hand: 'c', id: null }, { hand: 'b', id: 'borsa' }, { crowd: 5, around: 'c', r: 22 },
        SAY('folla', 'Vergogna! Sono arance!', 'Mio nipote è nei Grigi. Si vergogna pure lui.', 'Quelle dell\'Impero sono più buone, però.'),
        { pose: 'b', p: 'mangia_su' }, SAY('c', 'Se la sta mangiando!'), SAY('b', 'È per l\'analisi.'),
        SAY('a', '...e com\'è?'), SAY('b', 'Sovversiva. Dolcissima.'), { pose: 'b' },
        SAY('c', 'Me ne lasci una, almeno. Per il nipote.'), SAY('a', 'Una. Ma la dichiara.'),
        SAY('c', 'Dichiaro che siete due stronzi.'), SAY('folla', 'Brava {c}!', 'Scrivilo sul modulo!', 'Ha dichiarato!'),
        { pose: 'a', p: 'braccia_su' }, SAY('a', 'Circolare! Tutte! Anche lei, nonna!'),
        SAY('folla', 'Io circolo da ottant\'anni.', 'Circola tu, che sei giovane.'),
        { all: [{ go: 'a', to: 'away', sp: 1.4, d: 2, t: 10 }, { follow: 'b', who: 'a', sp: 1.4, d: 1.6 }] }, { wait: 2 }] },

    { id: 'campagnola_offesa', titolo: 'Il meccanico e la campagnola', tipo: 'lavoro, Grigi', dove: 'mattina, all\'officina dello Scalo',
      w: 1, when: 'day', ora: [7.5, 12.5], posto: ['officina', 'retrobottega', 'facciata_in_riparazione'], soft: true,
      roles: [{ id: 'a', f: 'shop|m', chi: 'il meccanico' }, { id: 'b', near: 'a', f: 'cop', r: 34, chi: 'il Grigio che aspetta la macchina' }],
      nota: 'Una campagnola in doppia fila (van kind campagnola, esiste). Il Grigio paga 5 al meccanico. Posto «officina» [NUOVO].',
      beats: [
        { van: 'spot', kind: 'campagnola' }, { go: 'a', to: 'van', sp: 1.5, d: 1.6, t: 12 }, { pose: 'a', p: 'lavora' },
        { go: 'b', to: 'spot', sp: 1.4, d: 2.2, t: 16 }, { pose: 'b', p: 'aspetta' },
        SAY('a', 'Allora, bella. Chi ti ha ridotta così? I tuoi padroni, eh?'),
        SAY('b', 'Parla con la macchina?'), SAY('a', 'Con lei sì. Con voi è inutile.'),
        SAY('a', 'Senti come tossisce. Ha i polmoni di un Grigio.'),
        SAY('b', 'Quanto ci vuole?'), SAY('a', 'Se le volete bene, due ore. Se no, due settimane.'),
        { pose: 'a', p: 'martella' }, { wait: 3 },
        SAY('a', 'Ti faccio correre, tranquilla. Ma non verso di noi.'),
        SAY('b', 'Che ha detto?'), SAY('a', 'Candela. È un termine tecnico.'), { pose: 'a' },
        SAY('b', 'Mi fa la fattura?'), SAY('a', 'La fattura costa il doppio. La fiducia è gratis.'),
        SAY('b', 'Allora fiducia.'), { pay: ['b', 'a', 5] }, SAY('a', 'Bravo. Fidatevi. Sempre.'), { pose: 'b' }, { wait: 2 }] },

    // ================= GIORNO =================
    { id: 'diciotto_anni_di_cambiali', titolo: 'Diciotto anni di cambiali', tipo: 'crollo pubblico, folla', dove: 'giorno, accanto a un\'auto parcheggiata',
      w: 2, when: 'day', ora: [9, 19], posto: 'sosta', soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'il benpensante a rate' }, { id: 'b', near: 'a', f: 'young|any', r: 20, chi: 'un passante' }],
      nota: 'Folla di 5. «calcio» è la posa di anim_lotta (va bene sulla ruota). La macchina non si muove: è il punto.',
      beats: [
        { go: 'a', to: 'spot', sp: 1.4, d: 1, t: 14 }, { pose: 'a', p: 'fruga', w: 2 }, { pose: 'a' }, { mood: 'a', m: 'rabbia' },
        SAY('a', 'Diciotto anni di cambiali e la radio prende solo il Garante.', 'Ogni mese la rata. Ogni mese parte. Oggi no.'),
        { pose: 'a', p: 'calcio', w: 1 }, { pose: 'a' }, SAY('a', 'Parti! Che ti ho pagato pure i tappetini!'),
        { crowd: 5, around: 'a', r: 22 },
        SAY('folla', 'Signore, si calmi!', 'Le dia un altro calcio, a me ha funzionato.', 'È la cinghia. È sempre la cinghia.'),
        { pose: 'a', p: 'discute_su' }, SAY('a', 'La cinghia l\'ho cambiata a rate! Ventiquattro!'), { pose: 'a' },
        SAY('b', 'Stamattina ne ho viste rubare tre. La sua no.'), SAY('a', 'Neanche i ladri la vogliono?!'),
        { pose: 'a', p: 'calcio', w: 1 }, { pose: 'a' }, SAY('a', 'Sapete che c\'è? Vado a piedi. Come i poveri.'),
        SAY('folla', 'Bentornato.', 'Benvenuto, allora.', 'Si sta bene, quaggiù.'),
        { go: 'a', to: 'away', sp: 1.5, d: 3, t: 6 }, { go: 'a', to: 'spot', sp: 1.5, d: 1, t: 8 },
        SAY('a', 'Però la chiudo a chiave. Non si sa mai.'), { pose: 'a', p: 'siede_terra' },
        SAY('a', 'Mia moglie me l\'aveva detto. Prendi la bici. A rate.'), { wait: 4 }] },

    { id: 'scippo_alla_rovescia', titolo: 'Lo scippo alla rovescia', tipo: 'crimine andato male', dove: 'giorno, al mercato',
      w: 2, when: 'day', ora: [8.5, 13.5], posto: ['mercato', 'banco_pesce', 'fila'], soft: true,
      roles: [{ id: 'a', f: 'old|f', chi: 'la vecchia con la borsa' }, { id: 'b', near: 'a', f: 'young|m', min: 6, chi: 'lo scippatore' }],
      nota: 'La vecchia è più veloce del ladro (la borsa pesa). Se lo prende, lui le porta la spesa: escono insieme di scena.',
      beats: [
        { hand: 'a', id: 'borsa' }, { go: 'b', to: 'a', sp: 1.9, d: .9, t: 16 }, { pose: 'b', p: 'raccoglie', w: .8 }, { pose: 'b' },
        { hand: 'a', id: null }, { hand: 'b', id: 'borsa' }, SAY('a', 'Ah sì? Ah sì?!', 'A me? A me?!'),
        { chase: 'a', who: 'b', sp: 3.6, fsp: 3.1, t: 14, catch: [
          SAY('a', 'Vent\'anni di mercato con questa borsa. Pesa, eh?'),
          SAY('b', 'Signora, ma che c\'è dentro?!'), SAY('a', 'Tre chili di ceci e mio marito. In foto.'),
          SAY('a', 'Adesso me la porti fino a casa. Terzo piano.'), SAY('b', '...senza ascensore?'),
          SAY('a', 'Corri tanto, no?'), { go: 'a', to: 'away', sp: 1.1, d: 2, t: 12 }, { follow: 'b', who: 'a', sp: 1.1, d: 1.2 }],
          lose: [SAY('a', 'Vai, vai! Ci sono le bollette! Pagale!', 'Corri! Tanto ti conosco. Sei il figlio della Pina!'), { wait: 2 }] }] },

    { id: 'davanti_il_garante', titolo: 'Davanti il Garante, dietro le cozze', tipo: 'lavoro assurdo', dove: 'giorno, alla pensilina o in piazza',
      w: 1, when: 'day', ora: [10, 17], posto: ['pensilina', 'angolo', 'edicola'], soft: true,
      roles: [{ id: 'a', f: 'old|m', chi: 'l\'uomo-cartello' }, { id: 'b', near: 'a', r: 18, chi: 'un passante' }],
      nota: 'L\'uomo col cartello lo gira a metà scena [NUOVO: il cartello con due facce; oggi basta il cartello].',
      beats: [
        { hand: 'a', id: 'cartello' }, { wander: 'a', r: 4, sp: .7 },
        SAY('a', 'Stasera alle venti parla il Garante! Non mancate!', 'Alle venti! Il Garante! Posti in piedi!'), { wait: 3 },
        { go: 'b', to: 'a', sp: 1.5, d: 1.3, t: 14 }, SAY('b', 'Ma lei non è quello delle cozze di ieri?'),
        SAY('a', 'Ieri le cozze. Oggi il Garante. Il cartello è lo stesso.'),
        SAY('a', 'A mezzogiorno lo giro. Davanti il Garante, dietro le cozze.'),
        SAY('b', 'E chi paga meglio?'), SAY('a', 'Le cozze. Il Garante paga in rispetto. Non si mangia.'),
        { look: 'a', at: 'around' }, { wait: 2 }, SAY('a', 'Cozze fresche al Molo! Più fresche del discorso!'),
        SAY('b', 'Ssh! Non lo dica forte.'), SAY('a', 'Il discorso è registrato. Le cozze no.'), { wait: 3 }] },

    { id: 'censimento_gabbiani', titolo: 'Il censimento dei gabbiani', tipo: 'lavoro assurdo, Tutela', dove: 'giorno, sulla calata o sul lungomare',
      w: 1, when: 'day', ora: [9, 16.5], posto: ['calata', 'panchina'], soft: true,
      roles: [{ id: 'a', f: 'old|m', chi: 'il censore dei gabbiani' }, { id: 'b', near: 'a', f: 'young', r: 18, chi: 'il ragazzo curioso' }],
      nota: 'Scena da fermi, a due. Se i gabbiani di animali.js sono vicini, a li guarda (look at gabbiano: [NUOVO], oggi guarda via).',
      beats: [
        { hand: 'a', id: 'carta' }, { pose: 'a', p: 'legge_su' }, { look: 'a', at: 'away' },
        SAY('a', 'Trecentododici. Trecentotredici.'), { go: 'b', to: 'a', sp: 1.4, d: 1.4, t: 14 },
        SAY('b', 'Che conti, zio?'), SAY('a', 'Gabbiani. Censimento della Tutela. Tutto ciò che vola si registra.'),
        SAY('b', 'E se uno si sposta?'), SAY('a', 'Lo conto due volte e lo multo.'),
        { pose: 'a', p: 'indica_su' }, SAY('a', 'Quello vola storto. Scrivo: atteggiamento.'), SAY('b', 'Zio, è un piccione.'),
        SAY('a', 'Peggio. Un piccione che si finge gabbiano.'), { pose: 'a', p: 'legge_su' },
        SAY('b', 'Quanto ti pagano?'), SAY('a', 'Un tanto a gabbiano. Per questo amo il giovedì.'),
        SAY('b', 'Perché il giovedì?'), SAY('a', 'Arriva la nave. I gabbiani seguono l\'Impero. Come tutti.'), { wait: 3 }] },

    { id: 'multa_al_defunto', titolo: 'La multa al defunto', tipo: 'Grigi', dove: 'giorno, accanto a un\'auto parcheggiata',
      w: 1, when: 'day', ora: [8.5, 13], posto: 'sosta', soft: true,
      roles: [{ id: 'a', f: 'cop', r: 30, chi: 'il Grigio con il blocchetto' }, { id: 'b', near: 'a', f: 'old|f', r: 22, chi: 'la vedova' }],
      nota: 'Due ruoli, da fermi. Il vaffanculo della vedova non ha conseguenze: è il punto (non c\'è il modulo).',
      beats: [
        { slot: 'a', i: 0, n: 2, sp: 1.4 }, { hand: 'a', id: 'carta' }, { pose: 'a', p: 'legge_su' },
        SAY('a', 'Sosta oltre il disco orario. Trentamila.'), { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 16 },
        SAY('b', 'Agente, la macchina era di mio marito. È morto a settembre.'),
        SAY('a', 'Condoglianze. Il proprietario si presenti in caserma.'),
        SAY('b', 'Sta al cimitero. Terza fila.'), SAY('a', 'Allora il domicilio è il cimitero. Notifico lì.'),
        SAY('b', 'E se non viene?'), SAY('a', 'Scatta la mora. I morti la pagano doppia: hanno tempo.'),
        SAY('b', 'Me la dia. Gliela porto io. Gliela metto sulla tomba.'), SAY('a', 'Sul marmo non si affigge. Ci vuole il modulo.'),
        { mood: 'b', m: 'rabbia' }, SAY('b', 'Vaffanculo, a lei e al modulo.'),
        { pose: 'a' }, SAY('a', 'Questo è oltraggio. Ma per l\'oltraggio il modulo è finito.'), { pose: 'a', p: 'aspetta' }, { wait: 3 }] },

    { id: 'come_si_scrive_nino', titolo: 'Come si scrive Nino', tipo: 'Grigi, scelta', dove: 'giorno o sera, vicino a una porta della città',
      w: 1, player: true, ora: [8, 22], posto: ['porta_della_citta', 'angolo'], soft: true,
      roles: [{ id: 'a', f: 'cop', ring: [6, 26], chi: 'il Grigio che non sa scrivere' }],
      nota: 'SCELTA. Nome vero: schedato (rep grigi -1). Nome falso o il Garante: al 50% ci casca, se no ti insegue (hunt).',
      beats: [
        { go: 'a', to: 'player', sp: 1.7, d: 1.6, t: 16 }, { look: 'a', at: 'player' }, { hand: 'a', id: 'carta' },
        { pose: 'a', p: 'indica_su' }, SAY('a', 'Lei. Fermo. Nome.'), { pose: 'a', p: 'legge_su' },
        { ask: 'a', t: 10, def: 0, q: ['Il nome. Non ho tutto il giorno.'], opts: [
          { t: 'Nino', then: [
            SAY('a', 'Nino come? Con quante enne?'), SAY('player', 'Due.'), SAY('a', 'Due. No, tre. Scrivo N e poi vediamo.'),
            SAY('a', 'Ecco. Adesso lei esiste. Complimenti.'), { memo: 'a', v: -1, k: 'schedato' }, { rep: 'grigi', d: -1 }] },
          { t: 'Gennaro Lanterna', then: [
            SAY('a', 'Lanterna... Lanterna. Ah, il cognato di Ferri!'), SAY('a', 'Passi, passi. Saluti a sua sorella.'), { wait: 2 },
            { p: .5, then: [SAY('a', '...un momento. Ferri non ha sorelle.'), SAY('a', 'Fermo, Lanterna! Fermo!'),
              { hunt: 'a', sp: 3.9, t: 14, catch: [SAY('a', 'Lanterna un cazzo. Documenti.'), { memo: 'a', v: -2, k: 'il bugiardo' }],
                lose: [SAY('a', 'Centrale, cerco un Lanterna. No. Spento.')] }],
              else: [SAY('a', 'Bella famiglia, i Lanterna.')] }] },
          { t: 'Il nome del Garante', then: [
            { pose: 'a' }, SAY('a', '...Signore. Non l\'avevo riconosciuta.'), { pose: 'a', p: 'saluta_su' },
            SAY('a', 'Di persona è più... basso.'), SAY('a', 'Posso dirle che mia madre la ama?'), { pose: 'a' },
            { p: .5, then: [SAY('a', 'Un momento. Il Garante ha i baffi.'),
              { hunt: 'a', sp: 3.9, t: 14, catch: [SAY('a', 'Oltraggio al ritratto vivente. Vieni.'), { rep: 'grigi', d: -2 }],
                lose: [SAY('a', 'Centrale... no, niente. Mi sono sbagliato.')] }],
              else: [SAY('a', 'Vada, Eccellenza. Non ci siamo visti.'), { memo: 'a', v: 1, k: 'il Garante' }, { rep: 'ragazzi', d: 1 }] }] }] },
        { pose: 'a' }, { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] },

    { id: 'la_cugina', titolo: 'La macchina restituita', tipo: 'Famiglia', dove: 'giorno, accanto a un\'auto parcheggiata',
      w: 1, ora: [10, 19], posto: 'sosta', soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'l\'uomo della Famiglia' }, { id: 'b', near: 'a', f: 'young|m', r: 18, chi: 'il ragazzo con l\'occhio nero' },
        { id: 'c', near: 'a', f: 'old|f', r: 24, chi: 'la signora derubata' }],
      nota: 'Il ragazzo ha il mood «ferito». La signora da oggi «è cugina»: [NUOVO] potrebbe entrare nella lista di chi la Famiglia protegge.',
      beats: [
        { mood: 'b', m: 'ferito' }, { all: [{ go: 'a', to: 'c', sp: 1.4, d: 1.3, t: 16 }, { follow: 'b', who: 'a', sp: 1.4, d: 1.4 }] }, { look: 'c', at: 'a' },
        SAY('a', 'Signora, buongiorno. La sua Cinquecento.'), SAY('c', 'Me l\'hanno rubata ieri!'), SAY('a', 'Lo sappiamo. Il ragazzo è nuovo.'),
        SAY('a', 'Chiedi scusa alla signora.'), SAY('b', 'Scusi, signora. Non sapevo che lei era la cugina.'),
        SAY('c', 'Cugina di chi?'), SAY('a', 'Lasci stare. Lei è cugina. Da oggi.'),
        SAY('a', 'Le abbiamo fatto il pieno. E lavata. Il ragazzo, con la lingua.'), SAY('b', 'Non è vero.'), SAY('a', 'Lo sarà.'),
        { pose: 'c', p: 'discute_su' }, SAY('c', 'Ma io non voglio essere cugina di nessuno!'), { pose: 'c' },
        SAY('a', 'Nessuno vuole, signora. Succede.'),
        SAY('a', 'Il primo del mese passiamo per gli auguri.'), SAY('c', 'Quali auguri?'), SAY('a', 'Quelli che si pagano.'),
        { all: [{ flee: 'a', from: 'c', sp: 1.3 }, { flee: 'b', from: 'c', sp: 1.4 }] }, SAY('c', 'Almeno lasciate le chiavi!'), { wait: 2 }] },

    { id: 'classifica_dei_grigi', titolo: 'La classifica dei Grigi', tipo: 'ragazzi, camminata', dove: 'pomeriggio, in periferia (a piedi)',
      w: 2, when: 'day', ora: [14, 19.5], posto: ['angolo', 'lotto_vuoto', 'panchina'], soft: true,
      roles: [{ id: 'a', f: 'young', chi: 'il primo, che fa le classifiche' }, { id: 'b', near: 'a', f: 'young', r: 18, chi: 'il secondo' },
        { id: 'c', near: 'a', f: 'young', r: 18, chi: 'il terzo' }],
      nota: 'Camminata e parlata: a va lontano piano, b e c lo seguono. La ronda che passa [NUOVO] fa il silenzio; senza, resta l\'attesa.',
      beats: [
        { all: [{ go: 'b', to: 'a', sp: 1.6, d: 1.4, t: 14 }, { go: 'c', to: 'a', sp: 1.6, d: 1.8, t: 14 }] },
        { all: [{ go: 'a', to: 'away', sp: 1.05, d: 2, t: 5 }, { follow: 'b', who: 'a', sp: 1.1, d: 1.2 }, { follow: 'c', who: 'b', sp: 1.1, d: 1.2 }] },
        SAY('a', 'Classifica. Il Grigio più scemo del quartiere. Vai.'),
        SAY('b', 'Quello della fontana. Ha multato la fontana.'), SAY('c', 'Secondo. Primo quello che saluta i manifesti.'),
        SAY('a', 'Saluta il Garante sul muro. Quando piove gli tiene l\'ombrello.'),
        SAY('b', 'Quindi è innamorato.'), SAY('c', 'Fra, sono tutti innamorati. Si chiama Tutela.'),
        { car: 'polizia', pass: true }, { look: 'a', at: 'around' }, { look: 'b', at: 'around' }, { look: 'c', at: 'around' }, { wait: 4 },
        SAY('c', '...'), { wait: 2 }, SAY('b', 'Visto? Niente.'), SAY('a', 'Ultimo posto?'),
        SAY('b', 'Ferri. Ferri non è scemo. Ferri è stanco.'), SAY('c', 'Ferri ha preso la mazzetta da mio zio. Gli ha dato il resto.'),
        SAY('a', 'Un Grigio onesto. Fuori classifica.'), SAY('b', 'Mettilo in un museo.'), SAY('c', 'Sotto vetro. Che non si sporchi.'),
        { all: [{ go: 'a', to: 'away', sp: 1.1, d: 2, t: 12 }, { follow: 'b', who: 'a', sp: 1.1, d: 1.2 }, { follow: 'c', who: 'b', sp: 1.1, d: 1.2 }] }] },

    { id: 'pallone_in_caserma', titolo: 'Il pallone dei Grigi', tipo: 'ragazzi, Grigi, scelta', dove: 'pomeriggio, sotto il muro della caserma',
      w: 1, player: true, when: 'day', ora: [14, 18.5], posto: ['caserma', 'lotto_vuoto', 'angolo'], soft: true,
      roles: [{ id: 'a', f: 'young', ring: [7, 24], chi: 'quello che ha tirato' }, { id: 'b', near: 'a', f: 'young', r: 16, chi: 'quello col fascicolo' },
        { id: 'c', near: 'a', f: 'cop', r: 40, chi: 'il piantone' }],
      nota: 'SCELTA. Chiedi: i ragazzi ti rispettano (+1). Scavalchi: il piantone ti insegue, ragazzi +2. Rifiuti: «sbirro» per un giorno.',
      beats: [
        { hand: 'a', id: 'pallone' }, { pose: 'a', p: 'calcio', w: 1 }, { hand: 'a', id: null }, { pose: 'a' },
        SAY('a', 'Gooool! ...Oh, no.'), SAY('b', 'Fra. È finito dentro la caserma.'),
        SAY('a', 'Vai tu.'), SAY('b', 'Io ho già un fascicolo. Vai tu.'), SAY('a', 'Io ho la faccia che piace ai cani.'),
        { all: [{ look: 'a', at: 'player' }, { go: 'b', to: 'player', sp: 1.6, d: 1.8, t: 14 }] },
        SAY('b', 'Oi, tu. Faccia pulita. Ci vai tu a chiedere il pallone?'),
        { ask: 'b', t: 12, def: 2, q: ['Dai, che è l\'unico che abbiamo.'], opts: [
          { t: 'Vai a chiedere', then: [
            { playerTo: 'c', t: 20 }, { look: 'c', at: 'player' },
            SAY('c', 'Un pallone? Compili la richiesta di restituzione corpo estraneo.'),
            SAY('c', 'Cinque giorni. Lo riavrete sgonfio. Per sicurezza.'),
            SAY('a', 'Almeno ci hai provato. Sei dei nostri, oggi.'), { rep: 'ragazzi', d: 1 }, { memo: 'c', v: -1, k: 'il pallone' }] },
          { t: 'Scavalca il muro', then: [
            SAY('a', 'Vai! Vai! Il pallone!'), { wait: 1.5 }, SAY('c', 'Alt! Intrusione! Chi va là?'),
            { hunt: 'c', sp: 3.8, t: 14, catch: [SAY('c', 'Il muro della Tutela non si scavalca. Si aggira.'), { rep: 'grigi', d: -1 }],
              lose: [SAY('b', 'Lascia il pallone! Corri! Lascia stare il pallone!')] }, { rep: 'ragazzi', d: 2 }] },
          { t: 'Arrangiatevi', then: [
            SAY('a', 'Sbirro.'), SAY('b', 'Sbirro e pure brutto.'), { memo: 'a', v: -1, k: 'sbirro' }, { rep: 'ragazzi', d: -1 }] }] },
        { all: [{ flee: 'a', from: 'c', sp: 1.6 }, { flee: 'b', from: 'c', sp: 1.6 }] }, { wait: 2 }] },

    { id: 'battesimo_con_busta', titolo: 'Il battesimo con la busta', tipo: 'Famiglia, rito, folla', dove: 'domenica mattina, sul sagrato di San Rocco',
      w: 2, when: 'day', ora: [10, 12.5], giorni: [6], posto: 'sagrato',
      roles: [{ id: 'a', f: 'adult|m', chi: 'il padrino (Famiglia)' }, { id: 'b', near: 'a', f: 'prete|old', r: 24, chi: 'il prete' },
        { id: 'c', near: 'a', f: 'f', r: 20, chi: 'la madre col bambino' }],
      nota: 'Folla di 6. La busta passa al prete (hand pacchetto). Filtro «prete» [NUOVO]; senza, un vecchio qualsiasi fa il prete.',
      beats: [
        { all: [{ slot: 'b', i: 0, n: 3, sp: 1.2 }, { slot: 'a', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { crowd: 6, around: 'b', r: 24, p: 'aspetta' },
        SAY('b', 'Il padrino rinuncia al male?'), SAY('a', 'Rinuncio. Abbiamo chiuso i conti l\'anno scorso.'),
        SAY('b', 'E alle sue opere?'), SAY('a', 'Dipende dalle opere.'),
        SAY('folla', 'Bello, il bambino.', 'Somiglia al padre.', 'Quale dei due?'),
        { hand: 'a', id: 'pacchetto' }, { pose: 'a', p: 'porge', w: 1.6 }, { hand: 'a', id: null }, { hand: 'b', id: 'pacchetto' }, { pose: 'a' },
        SAY('a', 'Per la chiesa, padre. Per il tetto.'), SAY('b', 'Il tetto non perde.'), SAY('a', 'Per adesso.'),
        SAY('c', 'Come lo chiamiamo, alla fine?'), SAY('a', 'Come il nonno.'), SAY('c', 'Il nonno è latitante.'),
        SAY('a', 'Allora non si chiama. Viene lui, quando vuole.'),
        SAY('folla', 'Ci sono i confetti?', 'Il rinfresco è al Flipper.', 'In chiesa e poi al Flipper?'),
        SAY('folla', 'Dove si battezza, si ricicla.', 'Zitto, che ti sentono.'),
        SAY('b', 'Andate in pace.'), SAY('a', 'Andiamo, padre. E lei stia in pace pure lei.'), { wait: 3 }] },

    { id: 'sposo_in_fuga', titolo: 'Lo sposo corre', tipo: 'matrimonio, folla, scelta, inseguimento', dove: 'sabato a mezzogiorno, sul sagrato',
      w: 2, player: true, when: 'day', ora: [11, 13.5], giorni: [5], posto: 'sagrato',
      roles: [{ id: 'a', f: 'young|m', chi: 'lo sposo' }, { id: 'b', near: 'a', f: 'f', r: 18, chi: 'la sposa' },
        { id: 'c', near: 'a', f: 'old|m', r: 20, chi: 'il padre della sposa' }],
      nota: 'SCELTA + inseguimento. Sgambetto: il suocero ti vuole al pranzo (+2). Scappi con lo sposo: il suocero ti insegue (hunt).',
      beats: [
        { all: [{ slot: 'b', i: 0, n: 3, sp: 1.2 }, { slot: 'a', i: 1, n: 3, sp: 1.2 }, { slot: 'c', i: 2, n: 3, sp: 1.2 }] }, { crowd: 6, around: 'b', r: 24 },
        { pose: 'folla', p: 'braccia_su' }, SAY('folla', 'Viva gli sposi!', 'Il riso! Tirate il riso!', 'Si vede già, eh. Si vede.'), { pose: 'folla' },
        { look: 'a', at: 'around' }, SAY('a', 'Scusate. Prendo una cosa in macchina.'), SAY('b', 'Quale macchina? Non ce l\'hai, la macchina.'),
        { go: 'a', to: 'player', sp: 3.6, d: 2.5, t: 8 }, SAY('c', 'Fermatelo! È mio genero! Lo pago io il pranzo!'),
        { ask: 'a', t: 6, def: 1, q: ['Spostati! Spostati, ti prego!'], opts: [
          { t: 'Sgambetto', then: [
            { fall: 'a', t: 3 }, { go: 'c', to: 'a', sp: 2.6, d: 1, t: 10 },
            SAY('c', 'Bravo! Tu vieni al pranzo. Primo tavolo.'), SAY('a', 'Traditore. Ti credevo un uomo libero.'),
            SAY('b', 'Amore, sei caduto! Vedi che è destino?'), { up: 'a' }, { follow: 'a', who: 'c', sp: 1.2, d: 1 },
            { memo: 'c', v: 2, k: 'lo sgambetto' }, { memo: 'a', v: -2, k: 'lo sgambetto' }] },
          { t: 'Lascialo passare', then: [
            { chase: 'c', who: 'a', sp: 3, fsp: 3.9, t: 10, catch: [SAY('c', 'Dove vai? La dote l\'abbiamo già spesa!')],
              lose: [SAY('c', 'Torna! La dote l\'abbiamo già spesa!'), SAY('b', 'Lascialo, papà. Torna. Ha lasciato il motorino da noi.')] }] },
          { t: 'Scappa con lui', then: [
            SAY('a', 'Fratello! Al porto! C\'è una nave!'), SAY('a', 'Non quella dell\'Impero! Un\'altra! Qualsiasi!'),
            { flee: 'a', from: 'c', sp: 3.9 },
            { hunt: 'c', sp: 3.2, t: 12, catch: [SAY('c', 'Tu! Tu paghi il pranzo, allora! Centoventi coperti!'), { money: -20 }],
              lose: [SAY('c', 'Ti ho visto in faccia! Il quartiere è piccolo!')] },
            { memo: 'c', v: -2, k: 'il complice' }, { memo: 'a', v: 2, k: 'il fratello' }] }] },
        SAY('folla', 'Il riso! Chi lo ripulisce, adesso?', 'Il più bel matrimonio dell\'anno.'), { wait: 3 }] },

    { id: 'santo_e_ritratto', titolo: 'Il santo e il ritratto', tipo: 'processione, folla, Grigi', dove: 'domenica pomeriggio, dal sagrato verso la piazza',
      w: 2, when: 'day', ora: [16.5, 19], giorni: [6], posto: ['sagrato', 'parata'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'il primo portatore' }, { id: 'b', near: 'a', f: 'adult|m', r: 18, chi: 'il secondo portatore' },
        { id: 'c', near: 'a', f: 'prete|old', r: 22, chi: 'il prete' }, { id: 'd', near: 'a', f: 'cop', r: 40, chi: 'il Grigio del cerimoniale' }],
      nota: 'Folla di 7 che segue. La statua e il ritratto in spalla [NUOVO: oggetti a quattro mani]; oggi i portatori con «regge» (cassa).',
      beats: [
        { all: [{ slot: 'c', i: 0, n: 3, sp: 1.1 }, { slot: 'a', i: 1, n: 3, sp: 1.1 }, { slot: 'b', i: 2, n: 3, sp: 1.1 }] },
        { hand: 'a', id: 'cassa' }, { hand: 'b', id: 'cassa' }, { crowd: 7, around: 'c', r: 26, p: 'prega' },
        SAY('folla', 'Viva San Rocco!', 'Quest\'anno il santo è dimagrito.', 'San Rocco, pensaci tu.'),
        { go: 'd', to: 'c', sp: 1.5, d: 1.4, t: 16 }, SAY('d', 'Disposizione della Tutela: il ritratto del Garante va davanti.'),
        SAY('c', 'Davanti? Al santo?'), SAY('d', 'Accanto, va bene. Ma più in alto.'),
        { all: [{ go: 'c', to: 'away', sp: .7, d: 2, t: 5 }, { follow: 'a', who: 'c', sp: .75, d: 1.4 }, { follow: 'b', who: 'a', sp: .75, d: 1.2 }, { follow: 'd', who: 'b', sp: .8, d: 1.6 }] },
        SAY('a', 'Il santo pesa ottanta chili. Il Garante quanto pesa?'), SAY('b', 'Il Garante pesa sempre.'),
        SAY('a', 'Chi l\'ha messo storto, il Garante?'), SAY('b', 'Si è girato a guardare il santo. Per invidia.'),
        SAY('folla', 'San Rocco, facci la grazia!', 'Quale grazia?', 'Quella che sai tu. Ma piano, che sente.'),
        SAY('d', 'Silenzio! Le grazie senza autorizzazione no.'), SAY('c', 'Agente, la processione serve a chiederle.'),
        SAY('d', 'Allora in fila. Una alla volta. Con il nome.'), SAY('folla', '...', 'Io allora niente grazia.', 'La chiedo a casa, sotto voce.'),
        { hand: 'a', id: null }, { hand: 'b', id: null }] },

    // ================= SERA =================
    { id: 'spingi_la_vespa', titolo: 'Il ladro senza spinta', tipo: 'crimine andato male, scelta', dove: 'sera, all\'angolo',
      w: 1, player: true, ora: [18, 23.5], posto: ['angolo', 'sosta'], soft: true,
      roles: [{ id: 'a', f: 'young|m', ring: [7, 22], chi: 'il ladro di Vespe' }, { id: 'b', near: 'a', f: 'adult|m', r: 30, min: 10, chi: 'il padrone della Vespa' }],
      nota: 'SCELTA. Spingi: il padrone ti insegue e ti ricorda (-2). Chiami: mille lire, i ragazzi ti chiamano infame. Tiri dritto: inseguimento fra loro.',
      beats: [
        { van: 'spot', kind: 'vespa' }, { go: 'a', to: 'van', sp: 1.5, d: 1.2, t: 12 }, { pose: 'a', p: 'fruga', w: 2.5 },
        SAY('a', 'Dai, bella. Dai. Non mi fare questo.'), { pose: 'a' }, { look: 'a', at: 'player' },
        SAY('a', 'Oi. Tu. Mi dai una spinta? S\'è ingolfata.'),
        { ask: 'a', t: 10, def: 2, q: ['Due secondi, fra. Giuro che è mia.'], opts: [
          { t: 'Spingi', then: [
            SAY('a', 'Vai! Vai che va! Ti voglio bene!'), { flee: 'a', from: 'player', sp: 4.2 },
            { go: 'b', to: 'spot', sp: 3, d: 1.5, t: 12 }, SAY('b', 'La mia Vespa! E tu? Il complice!'),
            { hunt: 'b', sp: 3.7, t: 12, catch: [SAY('b', 'Adesso mi riporti la Vespa. A spinta.')], lose: [SAY('b', 'Ti trovo! Ho la tua faccia in testa!')] },
            { memo: 'b', v: -2, k: 'il complice' }, { memo: 'a', v: 1, k: 'la spinta' }] },
          { t: 'Grida «al ladro!»', then: [
            SAY('player', 'Al ladro! Al ladro!'), SAY('a', 'Infame. Ma bella faccia, eh.'), { flee: 'a', from: 'player', sp: 4 },
            { go: 'b', to: 'player', sp: 2.6, d: 1.6, t: 12 }, SAY('b', 'Grazie. Tieni, mille lire. Non è molto, è una Vespa.'),
            { money: 1 }, { memo: 'b', v: 1, k: 'l\'onesto' }, { rep: 'ragazzi', d: -1 }] },
          { t: 'Tira dritto', then: [
            SAY('a', 'Grazie, eh. Spingo da solo.'), { pose: 'a', p: 'forza', w: 3 }, { pose: 'a' },
            { go: 'b', to: 'a', sp: 1.8, d: 1.3, t: 12 }, SAY('b', 'Ma che fai, la spingi?'),
            SAY('a', 'La porto dal meccanico. Servizio a domicilio.'), SAY('b', 'Ah. Grazie.'), { wait: 1.5 },
            SAY('b', '...Aspetta. Io non ho chiamato nessun meccanico.'),
            { chase: 'b', who: 'a', sp: 3.6, fsp: 3.8, t: 12, catch: [SAY('b', 'Meccanico, eh? Ti aggiusto io.'), { brawl: ['b', 'a'] }],
              lose: [SAY('b', 'Ladro! E pure educato! Il peggio!')] }] }] },
        { wait: 2 }] },

    { id: 'rapina_alla_banana', titolo: 'Mani in alto, è una banana', tipo: 'crimine andato male', dove: 'sera, davanti al tabacchi',
      w: 1, ora: [18, 21.5], posto: ['vetrina', 'edicola'], soft: true,
      roles: [{ id: 'a', f: 'shop|adult', chi: 'il tabaccaio' }, { id: 'b', near: 'a', f: 'young|m', r: 22, chi: 'il rapinatore' }],
      nota: 'Due ruoli. Il tabaccaio dà comunque un pacchetto al ragazzo (pay 1 al contrario: il ragazzo non paga).',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3, face: 'out' }, { slot: 'b', i: 1, n: 2, sp: 1.6 }] }, { look: 'b', at: 'around' }, { wait: 1.5 },
        { pose: 'b', p: 'tasche_su' }, SAY('b', 'Fermo! È una rapina! Sono armato!'),
        SAY('a', 'Quella è una banana, {b}.'), SAY('b', 'È un\'arma a forma di banana.'),
        SAY('a', 'Tua madre ieri ha pagato il conto. Le sigarette del mese.'), SAY('b', '...ah, sì?'),
        SAY('a', 'E m\'ha detto: a mio figlio non vendergli più niente.'),
        SAY('b', 'Allora è una rapina giusta. Dammi le sigarette.'), { pose: 'b' },
        { pose: 'a', p: 'porge', w: 1.4 }, { hand: 'b', id: 'pacchetto' }, { pose: 'a' },
        SAY('a', 'Prendi le Nazionali e sparisci. E saluta tua madre.'),
        SAY('b', 'Te la saluto. Ma non ci provare.'), { flee: 'b', from: 'a', sp: 1.5 },
        { pose: 'b', p: 'mangia_su' }, SAY('b', 'Comunque è buona.'), { wait: 2 }] },

    { id: 'la_mano_sbagliata', titolo: 'Il bacio sbagliato', tipo: 'Famiglia, rito', dove: 'sera, al dehors del bar',
      w: 1, ora: [19, 23.5], posto: 'dehors',
      roles: [{ id: 'a', f: 'old|m', chi: 'il fidato, seduto' }, { id: 'b', near: 'a', f: 'adult|m', r: 22, chi: 'lo zio' },
        { id: 'c', near: 'a', f: 'young|m', r: 22, chi: 'il nipote emozionato' }, { id: 'd', near: 'a', f: 'shop|any', r: 20, chi: 'il barista' }],
      nota: 'Quattro ruoli, nessuna conseguenza. Il fidato paga i caffè (pay a→d 1).',
      beats: [
        { slot: 'a', i: 0, n: 3, sp: 1.1 }, { pose: 'a', p: 'siede' }, { slot: 'd', i: 2, n: 3, sp: 1.4 },
        { all: [{ go: 'b', to: 'a', sp: 1.3, d: 1.6, t: 16 }, { follow: 'c', who: 'b', sp: 1.3, d: 1 }] },
        SAY('b', 'Dottore, le presento mio nipote. Bravo ragazzo. Muto.'),
        { go: 'c', to: 'd', sp: 1.2, d: .9, t: 8 }, { pose: 'c', p: 'porge', w: 1.2 }, SAY('c', 'Baciamo le mani.'), { pose: 'c' },
        SAY('d', '...il caffè glielo porto lo stesso.'),
        SAY('b', 'Non lui, deficiente! Lui fa i caffè!'), SAY('c', 'Zio, uno che fa i caffè qua dentro conta.'),
        SAY('a', 'Il ragazzo ha capito tutto. Il barista sa più di me.'),
        { go: 'c', to: 'a', sp: 1.2, d: .9, t: 8 }, { pose: 'c', p: 'porge', w: 1.2 }, SAY('c', 'Baciamo le mani, dottore.'), { pose: 'c' },
        SAY('a', 'Una basta. Che poi si consuma.'),
        SAY('d', 'Allora? Tre caffè?'), SAY('a', 'Quattro. Uno al ragazzo, che si è emozionato.'), { pay: ['a', 'd', 1] }, { wait: 3 }] },

    { id: 'applauso_di_stato', titolo: 'L\'applauso di Stato', tipo: 'lavoro assurdo, stand-up, scelta', dove: 'sera, poco prima delle 20, al bar',
      w: 1, player: true, ora: [19.3, 20.2], posto: ['bar_tv', 'dehors'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', ring: [6, 22], chi: 'l\'applauditore di mestiere' }],
      nota: 'SCELTA. Turno: +3 (o +5 se tratti). Lo mandi a quel paese: ti ricorda (-1). Lo schermo del bar [NUOVO] si accende alle 20.',
      beats: [
        { go: 'a', to: 'player', sp: 1.7, d: 1.5, t: 14 }, { look: 'a', at: 'player' },
        SAY('a', 'Oi. Tu che fai alle otto? Niente? Perfetto.'),
        SAY('a', 'Io applaudo il Garante. Al bar. Di mestiere. Tremila a discorso.'),
        SAY('a', 'Se batto io, battono tutti. Se no la Zia segna chi non batte.'),
        SAY('a', 'Stasera ho la cresima di mia figlia. Mi fai il turno?'),
        { ask: 'a', t: 12, def: 2, q: ['Facile: batti e annuisci.'], opts: [
          { t: 'Faccio il turno', then: [
            SAY('a', 'Bravo. Alla parola «ordine» batti più forte.'), SAY('a', 'Alla parola «carezza», ti commuovi.'),
            { money: 3 }, { tv: 'spot', on: true }, { memo: 'a', v: 1, k: 'il turno' }] },
          { t: 'Voglio di più', then: [
            SAY('a', 'Cinquemila? Ma sei un artista o un sindacato?'),
            SAY('a', 'Va bene. Quattro. Se ti scappa una lacrima, cinque.'), { money: 4 }, { tv: 'spot', on: true }, { memo: 'a', v: 1, k: 'il tirchio' }] },
          { t: 'Vergognati', then: [
            SAY('a', 'Vergognarmi? Io pago l\'affitto con le mani. E tu?'),
            SAY('a', 'Con la morale? Fammi sapere quanto rende.'), { memo: 'a', v: -1, k: 'il moralista' }] }] },
        { flee: 'a', from: 'player', sp: 1.6 }, { wait: 2 }] },

    { id: 'una_cabina_sola', titolo: 'La fila al telefono', tipo: 'lite pubblica, folla', dove: 'sera, alla cabina (o all\'edicola)',
      w: 2, ora: [18, 22.5], posto: ['cabina', 'edicola', 'portone'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'l\'uomo al telefono' }, { id: 'b', near: 'a', f: 'f', r: 18, chi: 'la signora in fila' },
        { id: 'c', near: 'a', f: 'old', r: 20, chi: 'il vecchio in fila' }],
      nota: 'Folla di 4 + 3 ruoli. Posto «cabina» [NUOVO]. Il vecchio telefona alla moglie dell\'uomo: chiude lui la scena.',
      beats: [
        { slot: 'a', i: 0, n: 3, sp: 1.3 }, { all: [{ slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.2 }] }, { pose: 'a', p: 'telefona_su' },
        SAY('a', '...no, amore, sono al lavoro. ...Sì, alle sette di sera.'), SAY('a', '...il porto chiude tardi. ...Tardissimo. Tipo domani.'),
        { pose: 'b', p: 'orologio_su', w: 1.5 }, { pose: 'b' }, SAY('b', 'Sono venti minuti! Ho mia madre all\'ospedale!'),
        SAY('a', 'Un attimo! ...No, non a te, amore. A una signora.'),
        SAY('a', '...certo che ti penso. ...Mia moglie? Non lo sa usare, il telefono.'),
        SAY('c', 'Io sua moglie la conosco. Il telefono lo usa benissimo.'), SAY('c', 'Mi chiama tutti i giorni.'),
        { crowd: 4, around: 'a', r: 20 }, SAY('folla', 'Ohhh!', 'Mettila in viva voce!', 'Io sono qui per lo stesso numero, credo.'),
        SAY('a', '...ti richiamo. Qui c\'è un\'assemblea.'), { pose: 'a' },
        SAY('a', 'Che avete da guardare? Mai visto un uomo innamorato?'),
        SAY('b', 'Sì. Di solito di una sola.'), SAY('folla', 'Ahahah!', 'Brava!', 'Questa la racconto al bar.'),
        { go: 'c', to: 'spot', sp: 1.2, d: .8, t: 10 }, { pose: 'c', p: 'telefona_su' },
        SAY('c', '...Pronto, Gina? Sono io. Indovina chi ho davanti.'),
        { flee: 'a', from: 'c', sp: 2.6 }, SAY('folla', 'Corri!', 'Saluta la moglie!'), { wait: 3 }, { pose: 'c' }] },

    { id: 'in_piedi_per_il_garante', titolo: 'In piedi per il Garante', tipo: 'il discorso delle 20, folla, scelta', dove: 'alle 20, al dehors del bar con lo schermo',
      w: 2, player: true, ora: [19.9, 20.5], posto: ['bar_tv', 'dehors'], soft: true,
      roles: [{ id: 'a', f: 'shop|adult', ring: [5, 24], chi: 'il barista' }, { id: 'b', near: 'a', f: 'old|m', r: 20, chi: 'il vecchio che non si alza' },
        { id: 'c', near: 'a', f: 'orecchio|old', r: 22, chi: 'la signora che lavora a maglia (un Orecchio)' }],
      nota: 'SCELTA. In piedi: l\'Orecchio approva. Seduto col vecchio: ti segna (-2, la voce va alla Repressione). Stacchi la spina: tutti sollevati.',
      beats: [
        { tv: 'spot', on: true }, { all: [{ slot: 'b', i: 0, n: 3, sp: 1.1 }, { slot: 'c', i: 1, n: 3, sp: 1.1 }, { slot: 'a', i: 2, n: 3, sp: 1.4 }] },
        { pose: 'b', p: 'siede' }, { pose: 'c', p: 'siede' }, { crowd: 5, around: 'a', r: 20, p: 'siede' },
        SAY('a', 'Sono le otto. In piedi, signori. Il Garante.'), { pose: 'folla', p: 'aspetta' }, { pose: 'c' },
        SAY('folla', '...in piedi, sì.', 'Ogni sera mi si addormenta la gamba proprio adesso.', 'Il cappello! Togliti il cappello.'),
        { mood: 'b', m: 'ubriaco' }, SAY('b', 'Io non mi alzo. Mi sono alzato nel \'79. Guarda com\'è finita.'),
        { pose: 'c', p: 'osserva' }, SAY('c', 'Alzati, figlio mio. Che poi me lo devo ricordare.'),
        { look: 'a', at: 'player' }, SAY('a', 'E tu? Seduto o in piedi? Decidi, che ci guarda.'),
        { ask: 'a', t: 10, def: 0, q: ['Decidi.'], opts: [
          { t: 'In piedi', then: [
            SAY('c', 'Bravo, figlio mio. Bravo.'), SAY('b', 'Pecore. Belle pecore in piedi.'), { memo: 'c', v: 1, k: 'in piedi' }] },
          { t: 'Resta seduto col vecchio', then: [
            SAY('b', 'Ecco! Un uomo! Offro io!'), { pose: 'c', p: 'legge_su' }, SAY('c', 'Me lo segno, figlio mio. Con affetto.'),
            { memo: 'c', v: -2, k: 'seduto' }, { rep: 'risacca', d: 1 }, { memo: 'b', v: 2, k: 'seduto' }] },
          { t: 'Stacca la spina', then: [
            { tv: 'spot', on: false }, { pose: 'folla', p: 'siede' }, SAY('folla', 'Ah. Che peccato.', 'Un guasto! Proprio stasera!', 'Che dispiacere. Un altro giro?'),
            SAY('a', 'Chi è stato?'), SAY('folla', 'Il guasto.', 'Il guasto, sì. È stato il guasto.'),
            { look: 'c', at: 'player' }, SAY('c', 'Io ho visto, figlio mio. Ma ho le gambe stanche.'), { memo: 'c', v: -1, k: 'la spina' }, { rep: 'quartiere', d: 1 }] }] },
        { wait: 3 }, SAY('b', 'Domani staccatela prima. Dopo c\'è il varietà.'), { wait: 2 }] },

    { id: 'pezzo_dell_ape', titolo: 'Il pezzo dell\'Ape', tipo: 'stand-up rivolto a te', dove: 'giorno, dove un\'Ape è in doppia fila',
      w: 1, player: true, when: 'day', ora: [8, 18.5], posto: ['sosta', 'angolo', 'mercato'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', ring: [6, 22], chi: 'l\'uomo dell\'Ape' }],
      nota: 'Pezzo (3-5 battute della stessa persona, la botta in fondo). Nessuna conseguenza.',
      beats: [
        { van: 'spot', kind: 'ape' }, { go: 'a', to: 'player', sp: 1.4, d: 1.8, t: 14 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'indica_su' },
        SAY('a', 'Oi! Sai quanto fa l\'Ape in salita? Ventidue. Mi superano i funerali.'), { pose: 'a' },
        SAY('a', 'Ieri mi ferma un Grigio. Eccesso di lentezza. L\'ha scritto lui.'),
        SAY('a', 'Dice: lei intralcia il traffico. Che traffico? Io, lui e un mulo.'),
        SAY('a', 'E il mulo ha la precedenza. Perché è del Comune.'),
        { pose: 'a', p: 'braccia_su' }, SAY('a', 'Mia moglie dice che l\'Ape mi somiglia. Fa rumore e non arriva.'),
        { pose: 'a' }, { go: 'a', to: 'van', sp: 1.4, d: 1.6, t: 10 }] },

    { id: 'pezzo_della_suocera', titolo: 'La suocera e la Tutela', tipo: 'stand-up rivolto a te (benpensante)', dove: 'giorno, alla fermata',
      w: 1, player: true, when: 'day', ora: [8, 19], posto: ['fermata', 'pensilina', 'panchina'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', ring: [6, 22], chi: 'il benpensante col cappotto buono' }],
      nota: 'Pezzo a te. Nessuna conseguenza.',
      beats: [
        { go: 'a', to: 'player', sp: 1.4, d: 1.7, t: 14 }, { look: 'a', at: 'player' },
        SAY('a', 'Lei è sposato? No? Allora non sa cos\'è la Tutela.'),
        SAY('a', 'Mia suocera vive con noi dal \'79. Come la Tutela. Stesso anno.'),
        SAY('a', 'Lei controlla la spesa, la posta, gli orari. Io firmo e sorrido.'),
        SAY('a', 'Alle otto guarda il Garante e annuisce. Lui annuisce a lei.'),
        SAY('a', 'Una volta ho detto no. Nell\'82. Me lo ricorda a ogni Natale.'),
        SAY('a', 'Il Garante prima o poi muore. Lei ha ottantanove anni e fa ginnastica.'),
        { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] },

    { id: 'pezzo_del_reduce', titolo: 'Il posto di Franco', tipo: 'stand-up rivolto a te (reduce)', dove: 'sera, fuori dall\'osteria',
      w: 1, player: true, ora: [19, 23.5], posto: ['dehors', 'panchina'], soft: true,
      roles: [{ id: 'a', f: 'old|m', ring: [5, 20], chi: 'il reduce con il bicchiere' }],
      nota: 'Pezzo amaro e tenero. Se offri (un tasto «offri» potrebbe esserci: [NUOVO]) ti ricorda bene.',
      beats: [
        { mood: 'a', m: 'ubriaco' }, { hand: 'a', id: 'bottiglia' }, { go: 'a', to: 'player', sp: 1.1, d: 1.6, t: 16 }, { look: 'a', at: 'player' },
        SAY('a', 'Siediti. No, non lì. Lì si sedeva Franco. Franco non viene più.'), { wait: 1.5 },
        SAY('a', 'Tranquillo. Franco è vivo. Ha fatto pace con la moglie.'),
        SAY('a', 'Nel \'79 stavamo sui monti. Tre mesi. Fucili del \'15 e una fisarmonica.'),
        SAY('a', 'La fisarmonica sparava meglio.'), { pose: 'a', p: 'beve_su', w: 1.5 }, { pose: 'a' },
        SAY('a', 'Voi ragazzi fate le onde col gesso. Bello. Pulito.'),
        SAY('a', 'Noi i muri li bucavamo. Voi ci scrivete sopra. Si va avanti.'),
        SAY('a', 'Offri tu. Io ho già offerto la giovinezza.'), { wait: 3 }, { flee: 'a', from: 'player', sp: .9 }] },

    // ================= NOTTE =================
    { id: 'vodka_per_terra', titolo: 'La vodka dell\'Impero', tipo: 'Famiglia, folla, scelta', dove: 'all\'alba del lunedì e del giovedì, sulla calata',
      w: 2, player: true, ora: [5, 8], giorni: [0, 3], posto: ['calata', 'carico'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', ring: [7, 26], chi: 'il soldato della Famiglia' }, { id: 'b', near: 'a', f: 'm', r: 20, chi: 'lo scaricatore' }],
      nota: 'SCELTA, folla di 6 che saccheggia. Tieni il furgone: Famiglia +1. Prendi una bottiglia: vodka in Tasca, lui ti ricorda (-2). «I Grigi!»: tutti scappano.',
      beats: [
        { van: 'spot', kind: 'furgone' }, { go: 'a', to: 'van', sp: 1.5, d: 1.5, t: 12 }, { hand: 'a', id: 'cassa' }, { go: 'a', to: 'spot', sp: 1.2, d: 1, t: 8 },
        { fall: 'a', t: 1.6 }, { hand: 'a', id: null }, SAY('a', 'Cazzo. La vodka.'), { up: 'a' },
        SAY('b', 'Io non ho visto niente. Scarico il niente da vent\'anni.'),
        { crowd: 6, around: 'spot', r: 24, p: 'raccoglie' },
        SAY('folla', 'È caduta! È di nessuno!', 'Vodka dell\'Impero! Quella vera!', 'Ne prendo una per mia suocera. Per pulire.'),
        { mood: 'a', m: 'rabbia' }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Giù le mani! È della Famiglia!'), { pose: 'a' },
        SAY('folla', 'Della Famiglia? C\'è scritto Impero.', 'La famiglia di chi?', 'Io sono di famiglia. Ho sei figli.'),
        { look: 'a', at: 'player' }, SAY('a', 'Tu. Tienimi il furgone. Uno fermo mi serve.'),
        { ask: 'a', t: 10, def: 2, q: ['Allora? Ti muovi o no?'], opts: [
          { t: 'Tieni il furgone', then: [
            SAY('a', 'Bravo. Io mi ricordo chi sei. Tu ricordati chi sono io.'),
            { pose: 'a', p: 'braccia_su' }, SAY('a', 'Chi ha preso, ha comprato! Diecimila a bottiglia! Domani passo!'),
            SAY('folla', 'Domani non ci sono.', 'Io sono morto stamattina.', 'Passa da mia cognata, è lei che paga.'),
            { rep: 'famiglia', d: 1 }, { memo: 'a', v: 1, k: 'il furgone' }] },
          { t: 'Prendi una bottiglia', then: [
            { give: 'player', id: 'vodka' }, SAY('a', 'Anche tu? Ti ho visto. Hai una faccia che si ricorda.'),
            SAY('b', 'Io pure ne ho presa una. Così siamo pari.'), { memo: 'a', v: -2, k: 'la vodka' }] },
          { t: 'Grida «i Grigi!»', then: [
            SAY('player', 'I Grigi! Arrivano i Grigi!'), { flee: 'folla', from: 'spot', sp: 3.4 }, { flee: 'b', from: 'spot', sp: 2.8 },
            SAY('a', 'Dove? ...Non c\'è nessuno.'), SAY('a', 'Simpatico. Ci vediamo, simpatico.'),
            { memo: 'a', v: -1, k: 'lo scherzo' }, { rep: 'ragazzi', d: 1 }] }] },
        { wait: 3 }] },

    { id: 'se_tu_fossi_il_garante', titolo: 'Se tu fossi il Garante', tipo: 'ragazzi, notte, momento serio', dove: 'notte, al muretto o all\'angolo',
      w: 2, ora: [22, 27], posto: ['angolo', 'panchina', 'cypher'], soft: true,
      roles: [{ id: 'a', f: 'young', chi: 'quello delle domande' }, { id: 'b', near: 'a', f: 'young', r: 18, chi: 'il secondo' },
        { id: 'c', near: 'a', f: 'young', r: 18, chi: 'quello che si fa serio' }, { id: 'd', near: 'a', f: 'young|any', r: 20, chi: 'il quarto' }],
      nota: 'Quattro ragazzi. Il momento serio non si commenta e non fa ridere: si riparte con le cazzate. Nessuna conseguenza.',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 4, sp: 1.2 }, { slot: 'b', i: 1, n: 4, sp: 1.2 }, { slot: 'c', i: 2, n: 4, sp: 1.2 }, { slot: 'd', i: 3, n: 4, sp: 1.2 }] },
        { pose: 'a', p: 'siede' }, { pose: 'b', p: 'appoggiato' }, { pose: 'c', p: 'siede_terra' }, { pose: 'd', p: 'fuma_su' }, { mood: 'b', m: 'freddo' },
        SAY('a', 'Se tu fossi il Garante per un giorno, che fai?'),
        SAY('b', 'Spengo la televisione alle otto. Per vedere che faccia fa.'),
        SAY('d', 'Io mi dimetto. Poi vado in TV e dico: ciao, scherzavo.'), SAY('a', 'Ti arrestano.'),
        SAY('d', 'Chi? Sono io il Garante. Mi arresto e mi do la grazia.'),
        SAY('a', 'E tu?'), SAY('c', 'Io faccio una passeggiata. Da solo. Senza guardie. Per vedere com\'è.'), { wait: 2 },
        SAY('c', 'Mio padre diceva sempre: domani. Domani, domani.'), { wait: 3 }, SAY('b', 'Pure il mio.'), { wait: 3.5 },
        SAY('a', 'Oi. Chi ha la siga?'), SAY('d', 'Io ho il drum. Le cartine no.'), SAY('b', 'Allora sei inutile pure da Garante.'),
        SAY('d', 'Fottiti.'), SAY('c', 'Fottiti tu. Con affetto.'), { wait: 4 }, { pose: 'a' }, { pose: 'b' }, { pose: 'c' }, { pose: 'd' }] },

    { id: 'pezzo_del_marsigliese', titolo: 'Il marsigliese al pontile', tipo: 'stand-up rivolto a te (Marsigliesi)', dove: 'notte, sulla calata o al pontile',
      w: 1, player: true, when: 'night', ora: [22, 28], posto: ['calata', 'carico', 'angolo'], soft: true,
      roles: [{ id: 'a', f: 'marsigliese|adult', ring: [6, 22], chi: 'un marsigliese con la sigaretta' }],
      nota: 'Pezzo a te. Filtro «marsigliese» [NUOVO] (o il cast: marcel). Alla fine un passaggio vero per Marsiglia: [NUOVO] aggancio a una missione.',
      beats: [
        { go: 'a', to: 'player', sp: 1.3, d: 2, t: 16 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'fuma_su' },
        SAY('a', 'Toi. Sì, tu. Vieni. Non ti mangio. Ho già cenato. Male.'),
        SAY('a', 'Il vostro caffè: una tragedia. Il vostro vino: un incidente.'),
        SAY('a', 'La vostra polizia ferma tutti. Me no. Sai perché? Pago in franchi.'),
        SAY('a', 'Voi pagate in paura. È una moneta debole, mon ami.'),
        SAY('a', 'Bella isola, eh. Fatta bene. Abitata male.'),
        SAY('a', 'Ti porto a Marsiglia. Centomila. Solo andata.'), SAY('a', 'Il ritorno? Il ritorno non lo vuole nessuno.'),
        { pose: 'a' }, { flee: 'a', from: 'player', sp: 1.2 }, { wait: 2 }] },

    { id: 'ultima_corsa_dell_autobus', titolo: 'L\'ultima corsa', tipo: 'folla, notte, Grigi', dove: 'notte, alla fermata prima dell\'Ora Quieta',
      w: 2, when: 'night', ora: [21.5, 23.5], posto: ['fermata', 'pensilina'], soft: true,
      roles: [{ id: 'a', f: 'adult|m', chi: 'l\'autista (sceso a fumare)' }, { id: 'b', near: 'a', f: 'f', r: 20, chi: 'l\'infermiera del turno di notte' },
        { id: 'c', near: 'a', f: 'young', r: 20, chi: 'il ragazzo senza biglietto' }, { id: 'd', near: 'a', f: 'cop', r: 40, min: 8, chi: 'il Grigio dell\'Ora Quieta' }],
      nota: 'Folla di 5 che aspetta di salire. Il Grigio conta chi c\'è: al 25% trattiene il ragazzo. L\'autobus vero [NUOVO]; oggi l\'autista basta.',
      beats: [
        { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { crowd: 5, around: 'a', r: 22, p: 'aspetta' },
        { pose: 'a', p: 'fuma_su' }, SAY('a', 'Ultima corsa. Chi c\'è, c\'è. Chi non c\'è, dorme qua.'),
        SAY('b', 'Parta, per favore. Attacco alle dieci, all\'ospedale.'), SAY('a', 'Signora, prima la sigaretta. È il mio sindacato.'),
        SAY('folla', 'Sbrigati, che arriva l\'Ora Quieta.', 'Io dormo sul 9. L\'anno scorso l\'ho fatto.', 'Il 9 non esiste.'),
        SAY('c', 'Capo, il biglietto lo pago domani. Giuro sulla Vespa.'), SAY('a', 'Non hai la Vespa.'), SAY('c', 'Giuro su quella che avrò.'),
        { go: 'd', to: 'spot', sp: 1.5, d: 2.4, t: 18 }, { pose: 'd', p: 'indica_su' },
        SAY('d', 'Conto. Uno, due, tre... Siete troppi per un autobus.'), SAY('a', 'È un autobus. Ci vanno cinquanta persone.'),
        SAY('d', 'Cinquanta a bordo. A terra il massimo è tre. Assembramento.'), { pose: 'd' },
        { p: .25, then: [SAY('d', 'Tu, senza biglietto. Con me.'), { pose: 'c', p: 'mani_alzate_su' }, { jail: 'c' }],
          else: [SAY('d', 'Salite. Tutti. Subito. E zitti fino al capolinea.')] },
        { pose: 'a' }, SAY('a', 'Avete sentito il signore. Su. Che c\'è il riscaldamento. Rotto.'),
        { all: [{ go: 'a', to: 'away', sp: 1.4, d: 2, t: 10 }, { go: 'b', to: 'away', sp: 1.6, d: 2, t: 10 }] }, { wait: 2 }] },
  ];

  if (typeof module !== 'undefined') module.exports = SCENE_NUOVE;
  // per provarle nel gioco: si aggiungono al catalogo di eventi.js come fa matti.js (gli ids non ci sono già)
  if (typeof Eventi !== 'undefined' && Eventi.SCENE) SCENE_NUOVE.forEach(D => { if (!Eventi.SCENE.some(s => s.id === D.id)) Eventi.SCENE.push(D); });
})();
