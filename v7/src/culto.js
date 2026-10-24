/* Porto Vecchio — [culto] LA VOCE DEL REGIME: il culto della Calma (solo logica e testi, niente IA)
   Il regime non perde la sua violenza, ma è grottesco: il Garante parla come un tribuno gonfio di sé (superlativi, folle
   record, nemici coi soprannomi, «moltissimi lo dicono»), venerato da una religione tutta sua, la Calma (niente
   cristianesimo: saluti, doveri, reliquie e miracoli suoi), e l'apparato parla per supercazzole burocratiche. La gente ci
   vive dentro: ripete le formule, ci crede a metà, si arrangia, ha paura.
   1. IL DISCORSO DELLE 20 (Culto.garante, lo usa risacca.js) e la TV di casa (Culto.tv, protagonista.js): ogni sera un pezzo diverso.
   2. GLI ALTOPARLANTI: ogni 3-6 minuti, se sei all'aperto, un comunicato della Tutela; poco dopo uno lì vicino commenta.
   3. LE SCENE del culto per eventi.js (in fondo).
   4. Culto.supercazzola(): un comma a caso, per multe e ordinanze (ordine.js).
   Prova: node test_culto.js */
var Culto = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const EV = () => (typeof Eventi !== 'undefined' ? Eventi : null);
  const CFG = { annuncio: [190, 360], reazione: 3.2, reazR: 13 };
  const rnd = Math.random, hyp = Math.hypot, pick = a => a[Math.floor(rnd() * a.length)];

  // ================= IL GARANTE, ALLE 20 =================
  const GARANTE = [
    'Stasera il mare è calmo. Ci ho parlato io. Il mare mi rispetta. Moltissimo.',
    'La folla di domenica era la più grande della storia. Più grande del mare. Il mare stesso era lì, a guardare.',
    'Il nostro pane è il pane più bello del mondo. Pane enorme. Così bello che mangiarlo è quasi uno spreco. Quindi ve ne diamo meno.',
    'La Risacca? Gente piccola. Gente triste, con le biciclette. Io non ho mai visto una bicicletta vincere. Mai.',
    'Mi chiamano il Padre della Calma. Non lo dico io. Lo dicono tutti. Chi non lo dice, lo dirà.',
    'Ho inventato il freddo per insegnarvi a stare vicini. Prego. Non c\'è di che.',
    'Oggi abbiamo rettificato meno gente di ieri. Un record. Domani faremo ancora meglio. O ancora di più. Vedremo.',
    'Gli esperti mi dicono: Garante, l\'isola non può crescere. Io dico: guardate la mia faccia. È cresciuta.',
    'Ricordate i Sette Doveri. Il primo è la Calma. Gli altri sei li conosco io. Fidatevi.',
    'Lupo il Lento ha detto cose cattive su di me. Ha settant\'anni. Settanta! Io alla sua età avrò ancora la mia età.',
    'Chi applaude vivrà a lungo. Chi non applaude verrà applaudito. In caserma. Forte.',
    'Il prezzo del carbone è sceso. Me l\'ha detto il carbone. Personalmente.',
    'Non esistono sparizioni. Esistono persone che hanno scelto di essere irraggiungibili. Rispettiamo le loro scelte.',
    'Lunga Calma a tutti. Lunga Calma soprattutto a me.',
    'La crescita, come dicevo, è circolare ma dritta, in senso antiorario per chi viene da destra. Chi ha capito è con noi. Chi non ha capito è con noi lo stesso.',
    'Stasera vi dico una cosa che non ho mai detto a nessuno. Non ve la dico. È troppo forte. Ma è fortissima.',
    'Il Mare Grande mi ha scelto. L\'ha scritto sulla sabbia. Poi è arrivata l\'onda, ma io l\'avevo già letto.',
    'Rita la Radiolina dice che io non dormo. È vero. Io non dormo: io ricarico.',
    'Malanotte Malaconcia vive in un ovile. Un ovile! Io vivo nella Rocca. Pensateci, quando scegliete.',
    'Il Continente ci invidia. Ci invidia tantissimo. Mi telefonano piangendo: Garante, come fai? Io non rispondo. Calma.',
  ];
  const garante = st => `«${GARANTE[(Math.floor((st && st.t || 0) / 1440) * 7 + 3) % GARANTE.length]}»`;
  const TV = [
    '«Lunga Calma a tutti. Soprattutto a me.» Il Garante si applaude da solo per sei minuti.',
    'Il quiz del sabato: «Quanto ami il Garante?». Vincono tutti. Chi perde non è più in studio.',
    'Il telegiornale: il carbone è record, il pane è enorme, il mare è d\'accordo.',
    'Una televendita di ritratti del Garante. Il presentatore piange. Anche il ritratto, sembra.',
    'Documentario: «Il Garante e il freddo, una storia d\'amore». Due ore. Nessuno sbatte le palpebre.',
    'Il meteo della Calma: domani sereno. Chi vede nuvole è pregato di non vederle.',
  ];

  // ================= GLI ALTOPARLANTI =================
  const ANNUNCI = [
    'Oggi il cielo è stato approvato. Eventuali nuvole sono da considerarsi sovversive.',
    'Si ricorda che segnalare è un gesto d\'amore. Ama il tuo vicino: segnalalo.',
    'Il pane non è finito: è in fase di miracolo. Ripassate.',
    'Cittadino, ti senti osservato? È il Garante che ti vuole bene. Da vicino. Da molto vicino.',
    'Questa settimana l\'Ora Quieta comincia prima, per farvi riposare di più. Chi non riposa verrà riposato.',
    'Le sparizioni di oggi sono state un grande successo. Grazie a tutti i partecipanti.',
    'Ricordiamo i Sette Doveri: Calma, Calma, Rata, Calma, Applauso, Silenzio. E quello segreto.',
    'È vietato pensare ad alta voce. Pensare a bassa voce è tollerato fino alle ventidue.',
    'Il Garante ha toccato la fontana di Piazza San Rocco. L\'acqua ora è più buona. Il prezzo aumenta.',
    'Firma una cambiale, ricevi in omaggio un ritratto del Garante. Appenderlo è facoltativo e obbligatorio.',
    'Gli interrogatori sono registrati per migliorare la qualità della Calma.',
    'Il Garante ha battuto il record di Calma: sei ore senza sbattere le palpebre. Gli occhi stanno bene. Gli occhi stanno benissimo.',
    'Ricordiamo che il Muro non è un muro: è un abbraccio molto lungo, in cemento.',
    'La Commissaria Pardo comunica: non esistono domande sbagliate. Solo persone sbagliate. Le aspettiamo.',
    'La felicità di questo quartiere è stata misurata: insufficiente. Seguirà controllo.',
    'Chi ha capito questo comunicato è pregato di presentarsi in caserma.',
    'Lunga Calma! Ripetete con noi: Lunga Calma! Più forte! Ecco. Vi abbiamo sentiti. Tutti.',
    'Oggi è la Giornata del Sorriso. I volti non sorridenti verranno fotografati per un ricordo.',
  ];
  // la supercazzola: commi, decreti e scappellamenti per multe e ordinanze
  const SC = [['Ai sensi del comma', 'Visto il decreto', 'In ottemperanza al disposto', 'Come da circolare'], ['antani', 'tarapìa bis', 'sette e mezzo', 'quater prematurato', 'della Calma ventitré'], ['con scappellamento a destra', 'salvo conguaglio', 'in modalità serena', 'come fosse antani', 'per la sbrindellata della pratica']];
  const supercazzola = () => SC.map(pick).join(' ');
  const ordinanza = () => `${supercazzola()}, ${pick(['la fila è da intendersi prematurata', 'la piazza è temporaneamente rotonda', 'il marciapiede di sinistra è riservato ai fedeli', 'i cappelli vanno portati con Calma', 'il vento è autorizzato solo da nord', 'il caffè è dichiarato bevanda serena'])}. Lunga Calma.`;
  // la gente lì vicino: ripete, ci crede a metà, si arrangia
  const REAZIONI = [
    'Lunga Calma.', '...lunga Calma, sì.', 'Lunga Calma a te. E a chi ci ascolta. Ci ascoltano, eh.',
    'Mio cugino dice che il Garante ha toccato il mare e il mare si è calmato. Era bassa marea. Ma vabbè.',
    'Il ritratto l\'ho messo in bagno. Girato verso il muro. Per rispetto.',
    'Sette Doveri. Io ne so cinque. Gli altri due li faccio a caso.',
    'In fase di miracolo. Anche ieri. È un miracolo lunghissimo.',
    'Hai capito il comma? Neanch\'io. Applaudiamo e basta.',
    'Ho segnalato mia suocera. Per amore. Lei ha segnalato me. Per amore anche lei. Siamo una famiglia molto amorevole.',
    'Shh. Ha detto che è registrato.',
    'Ogni volta che parla il pane costa di più. Dovrebbe parlare meno. Non l\'ho detto.',
    'Io penso a bassissima voce. Anche adesso. Non sento niente.',
    'Mia nonna prega lo schermo. Lo schermo è rotto. Lei dice che così ascolta meglio.',
    'Sei ore senza sbattere le palpebre. Mio zio ce ne ha messe otto. Era morto, ma conta.',
    'Un abbraccio in cemento. Allora lasciami andare, abbraccio. ...Non l\'ho detto.',
    'Io sorrido sempre. Mi fanno male le guance dal \'79.',
    'Applausi?', 'Ma chi l\'ha scritto questo? Mio figlio fa la terza e scrive meglio. Non dirglielo.',
  ];

  // ================= STATO E PASSO =================
  const S = st => st.__culto || (st.__culto = { next: (st.clock || 0) + 60, q: null, deckA: [], deckR: [] });
  const ok = (st, n) => n && !n.dead && !n.inside && !n.room && !n.__ev && !n.cop && !n.faction && !n.aggro && !(n.stun > 0) && !n.inVeh && !(n.panic > 0) && n.pop && (!n.action || n.action.name === 'routine');
  const draw = (deck, L) => { if (!deck.length) L.forEach((_, i) => deck.push(i)), deck.sort(() => rnd() - .5); return L[deck.pop()]; };
  function annuncio(st) {
    const C = S(st), text = rnd() < .2 ? ordinanza() : draw(C.deckA, ANNUNCI);
    G.feed(st, `Altoparlante della Tutela: «${text}»`, 'radio');
    const f = st.feed && st.feed[0]; if (f && f.text.endsWith(`«${text}»`)) f.until = st.clock + 11;   // il tempo di leggerlo
    C.q = { at: st.clock + CFG.reazione };
    return text;
  }
  function step(st, dt) {
    const C = S(st), p = st.player;
    if (C.q && st.clock >= C.q.at) {   // uno lì vicino commenta
      C.q = null;
      const n = st.npcs.filter(k => ok(st, k) && hyp(k.x - p.x, k.y - p.y) < CFG.reazR).sort((a, b) => hyp(a.x - p.x, a.y - p.y) - hyp(b.x - p.x, b.y - p.y))[0];
      if (n) G.say(st, n, draw(C.deckR, REAZIONI), 3.6);
    }
    if (st.clock < C.next) return;
    C.next = st.clock + CFG.annuncio[0] + rnd() * (CFG.annuncio[1] - CFG.annuncio[0]);
    if (p.indoor || st.chase || st.over || (p.lv && p.lv.k !== 'tetto')) return;
    annuncio(st);
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Culto]', e); } } }; }

  // ================= LE SCENE DEL CULTO (per eventi.js) =================
  const SAY = (r, ...l) => ({ say: r, l });
  const SCENE = [
    { id: 'preghiera_schermo', w: 1, posto: ['sagrato', 'mercato', 'panchina'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'siede_terra' }, SAY('a', 'Garante, fa\' che domani la rata sia più leggera. Non tanto. Un po\'.', 'Padre della Calma, proteggi il mio nipote. E se proprio devi prendere qualcuno, prendi il genero.'), { wait: 3 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('b', 'Nonna, lo schermo è spento.', 'Signora, si alzi, fa freddo.'),
      SAY('a', 'Lui ascolta lo stesso. Ha le antenne.', 'Spento è più intimo.'), SAY('b', '...Lunga Calma, nonna.', 'Va bene. Chieda anche per me.'), SAY('a', 'Per te ho già chiesto. Ha detto di no.', 'Lunga Calma, caro.'), { wait: 2 }] },
    { id: 'reliquia', w: 1, when: 'day', posto: ['mercato', 'sagrato', 'angolo'], soft: true, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, SAY('a', 'Reliquie della Calma! Autentiche!', 'Un capello del Garante! Caduto durante il Discorso del \'79!'), { wait: 2 }, { go: 'a', to: 'b', sp: 1.5, d: 1.3, t: 14 }, { pose: 'a', p: 'porge' },
      SAY('b', 'Ma è biondo. Il Garante è calvo.', 'E questo cos\'è? Un tappo?'), SAY('a', 'Appunto. È l\'ultimo.', 'Il tappo della bottiglia che ha guardato. Guardato! Funziona per il mal di schiena.'),
      { p: .4, then: [{ pay: ['b', 'a', 2] }, SAY('b', 'Va bene, uno. Per mia madre.', 'Lo prendo. Non si sa mai.'), SAY('a', 'Lunga Calma a sua madre. E a lei, quando ha pagato tutto.')], else: [SAY('b', 'Ne ho già tre a casa.', 'No, grazie, sono a posto con la Calma.'), SAY('a', 'Poi non dica che non gliel\'ho offerto. Lo dica, anzi: in caserma.')] }, { pose: 'a' }, { wait: 2 }] },
    { id: 'convertito', w: 1, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', f: 'adult', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.6, d: 1.2, t: 16 }, SAY('b', 'Ti vedo bene!', 'Ma sei tu? Sembri un altro.'), SAY('a', 'Ho preso la tessera della Calma. Dormo benissimo.', 'Ho fatto il corso dei Sette Doveri. Ora sono sereno di terzo grado.'),
      SAY('b', 'Ma non ti hanno preso la casa?', 'E il negozio?'), SAY('a', 'Appunto. Meno pensieri.', 'Il negozio pensava troppo.'), { wait: 1 },
      SAY('b', 'E adesso dove dormi?', 'E tua moglie?'), SAY('a', 'Benissimo. Te l\'ho detto.', 'Anche lei è serena. Da sua madre.'), { pose: 'a', p: 'saluta_su' }, SAY('a', 'Lunga Calma!'), { pose: 'a' }, { wait: 2 }] },
    { id: 'sportello', w: 1, posto: ['portone', 'vetrina', 'edicola'], soft: true, roles: [{ id: 'a', f: 'shop|adult' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.5, d: 1.2, t: 16 }, SAY('b', 'Scusi, per la licenza del banco?', 'Sono venuto per la pratica della casa.'),
      { pose: 'a', p: 'discute_su' }, { fn: (st, sc) => { const E = EV(); if (E) E._.sayEv(st, sc.roles.a, `La sua domanda è stata accolta in via prematurata. ${supercazzola()}.`, 4.4); }, w: 4.4 },
      SAY('b', 'Quindi me la danno?', 'Cioè sì?'), SAY('a', 'Quindi no. Ma con molta Calma.', 'Quindi ripassi. Con un\'altra faccia.', 'Quindi sì, salvo il no.'),
      SAY('b', 'E quando?', 'E adesso?'), { fn: (st, sc) => { const E = EV(); if (E) E._.sayEv(st, sc.roles.a, `Come fosse antani: entro i termini, ${pick(['salvo i termini', 'oltre i termini', 'quando lo dice il Bollettino'])}.`, 3.8); }, w: 3.8 }, { pose: 'a' }, { flee: 'b', from: 'a', sp: 1.4 }, { wait: 2 }] },
    { id: 'nuvola_garante', w: 1, when: 'day', roles: [{ id: 'a' }], beats: [
      { pose: 'a', p: 'indica_su' }, SAY('a', 'Guardate! La nuvola! Ha la faccia del Garante!', 'Un segno! Il Garante è nel cielo!'), { crowd: 3, around: 'a', r: 22, p: 'indica_su' }, { wait: 2 },
      SAY('folla', 'È uguale!', 'È più magra.', 'Non dirlo forte che è più magra.', 'Quella è una nuvola a forma di pera.'), { wait: 2.5 },
      SAY('folla', 'Lunga Calma!', 'Bisogna denunciarla, quella nuvola. Per somiglianza.', 'Se piove adesso, è lui che piange.'), SAY('a', 'Se n\'è andata. Ci ha guardati ed è andata.', 'Io lo sapevo. Lo sapevo da martedì.'), { pose: 'a' }, { wait: 2 }] },
    { id: 'lunga_calma', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.6, d: 1.5, t: 14 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'saluta_su' }, SAY('a', 'Lunga Calma, fratello!', 'Lunga Calma! Sereno?'), { wait: 3.2 }, { pose: 'a' },
      SAY('a', 'Non rispondi? Va bene. Va bene. Non ti ho visto.', 'Niente formula? Ognuno ha i suoi tempi.'), { wait: 1.6 },
      SAY('a', 'Però non ti ho visto molto bene. Chiaro?', 'Ma io non lo dico a nessuno. Lo scrivo soltanto.'), { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] },
    { id: 'controllo_calma', w: 2, roles: [{ id: 'a', f: 'cop', ring: [8, 40] }, { id: 'b', near: 'a', r: 22 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 18 }, { look: 'b', at: 'a' }, SAY('a', 'Alt. Controllo di Calma. Lei mi sembra agitato.', 'Fermo. Lei cammina in modo poco sereno.'),
      SAY('b', 'Sono calmissimo, agente.', 'Lunga Calma, agente. Calmissimo.'), SAY('a', 'Troppo calmo. È sospetto.', 'Calmissimo è un superlativo. I superlativi li usa solo il Garante.'),
      SAY('a', 'Mi reciti i Sette Doveri.', 'Il secondo Dovere. Subito.'), SAY('b', '...Il primo è stare calmi?', 'Calma, Calma... Rata?'),
      { p: .7, then: [SAY('a', 'Il primo è non chiedere qual è il primo. Quindicimila lire.', 'Insufficiente. Multa serena.'), { pay: ['b', 'a', 3] }, SAY('b', 'Lunga Calma...', 'Grazie, agente. Molto calmo.')],
        else: [SAY('a', 'Ai sensi del comma antani, lei viene con me.'), { pose: 'a', p: 'ammanetta' }, { pose: 'b', p: 'ammanettato' }, { wait: 3 }, { jail: 'b' }] }, { wait: 2 }] },
    { id: 'segnalazione_amore', w: 1, posto: ['portone', 'dehors', 'panchina'], soft: true, roles: [{ id: 'a', f: 'f|any' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.5, d: 1.2, t: 16 }, SAY('a', 'Ti ho segnalato. Non prenderla male.', 'Volevo dirtelo io: ti ho segnalato.'),
      SAY('b', 'Mi hai segnalato?!', 'Per cosa?'), SAY('a', 'Per amore. Ama il tuo vicino: segnalalo.', 'Avevi stretto la mano con poca Calma.'),
      SAY('b', 'Va bene. Allora ti segnalo anch\'io.', 'Ah sì? Io ti ho segnalata martedì.'), SAY('a', 'Che bello. Siamo vicini davvero.', 'Lo sapevo. Per questo ti ho segnalato.'), { pose: 'a', p: 'saluta_su' }, { wait: 2 }] },
  ];
  { const E = EV(); if (E && E.SCENE) SCENE.forEach(D => { if (!E.SCENE.some(s => s.id === D.id)) E.SCENE.push(D); }); }

  return { CFG, GARANTE, TV, ANNUNCI, REAZIONI, SCENE, S, garante, tv: () => pick(TV), annuncio, supercazzola, ordinanza, step };
})();
if (typeof module !== 'undefined') module.exports = Culto;
