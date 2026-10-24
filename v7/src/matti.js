/* Porto Vecchio — [matti] LE STRANEZZE DEGLI ALTRI (solo logica, niente grafica, niente IA)
   La città fa ridere quando, dal nulla, ti ritrovi dentro la vita di qualcun altro. Tre cose, tutte leggere:
   1. I FRAMMENTI: passando accanto a due che parlano, senti un pezzo della loro storia, a metà, senza contesto
      («Mia suocera è tornata.» «Da dove?» «Non lo dice. Ha portato un'anatra.»). Ogni 35-75 s al massimo, solo se
      sei a piedi e all'aperto; un mazzo mescolato, così non tornano finché non li hai sentiti tutti.
   2. I MATTI DI QUARTIERE: cinque abitanti veri (scelti all'avvio fra chi non è del cast, uno vicino a casa di Nino,
      gli altri sparsi) hanno una fissazione. Fanno la loro giornata come tutti; quando gli passi vicino ti dicono la
      loro, ti riconoscono le volte dopo, e la chat dell'IA sa chi sono (Matti.scheda → mente.js).
   3. LE SCENE STRANE: schede per eventi.js (in fondo), con il filtro 'matto' (prima un matto, se non c'è un vecchio
      qualsiasi) e le battute del matto giusto ({matto:'a', k:'chiave'}).
   Costo: un giro sui 5 matti e, ogni tanto, una ricerca di due persone vicine al giocatore.
   Prove: node test_matti.js; anche test_eventi.js prova le scene nuove. */
var Matti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const EV = () => (typeof Eventi !== 'undefined' ? Eventi : null);
  const CFG = { fram: [35, 75], framR: [2.5, 11], coppia: 3.6, passa: 5.5, solo: [6, 15], cdMatto: 45, cdTutti: 18, gap: 2.7 };
  const rnd = Math.random, hyp = Math.hypot, pick = a => a[Math.floor(rnd() * a.length)];
  // il cast scritto a mano non diventa matto (ha già la sua voce)
  const CAST = new Set(['lupo', 'beppe', 'lucia', 'pietro', 'vinile', 'betamax', 'divisa', 'cono', 'vasco', 'pardo', 'zia', 'malanotte', 'gino', 'wu', 'marta', 'tonino', 'elena', 'rosa', 'nico', 'sandro', 'carla', 'ferri']);

  // ================= I MATTI =================
  // chi: il filtro per sceglierlo; voce e fissa: per la chat (IA); passa: quando gli passi vicino; ritorno: le volte dopo;
  // solo: parla da solo mentre gli passi a qualche metro; le altre chiavi servono alle scene.
  const MATTI = {
    generale: {
      nick: 'il Generale', chi: n => n.pop.sex !== 'f' && n.pop.age >= 60,
      fissa: 'Crede che la guerra non sia mai finita. Ha fatto il cuoco in caserma per due anni nel \'43 e da allora comanda: i piccioni, i lampioni, i ragazzi. Saluta militarmente le fontane. È gentilissimo con tutti, purché si mettano sull\'attenti.',
      voce: 'ordini secchi, gradi inventati, rapporti militari su cose da niente; mai cattivo, solo convintissimo',
      passa: ['Riposo, soldato. No, lei no. Lei è ancora in punizione.', 'Il nemico è nei tombini. Non in tutti. Nel terzo a sinistra.', 'Ha visto passare un piccione con l\'aria furba? Ne sto cercando uno.', 'Rapporto: la fontana tiene. Per ora.', 'Mi stia vicino. Oggi c\'è un\'aria da imboscata.', 'Lei ha la faccia di uno che ha disertato. Mi piace. Lo dica a nessuno.'],
      ritorno: ['Ancora lei. Bene. Ho bisogno di uomini.', 'Soldato! Le avevo detto di sorvegliare quella panchina. Chi l\'ha spostata?', 'Ah, il disertore. Riposo.'],
      solo: ['Uno, due. Uno, due. Uno.', 'Quel lampione mi guarda storto da una settimana.', 'Ritirata strategica verso il bar.', 'Sergente Bocca, a rapporto. Ah già, Bocca è morto. A rapporto lo stesso.'],
      ordine: ['Tu! Sull\'attenti!', 'Recluta! Quel passo lì non me lo fai in tempo di guerra!', 'Fermo lì! Nome, grado e cosa hai mangiato!'],
      ordine2: ['Riposo. Attenti. Riposo. Attenti. Così fino a nuovo ordine.', 'Adesso giri attorno alla fontana e mi riferisce se c\'è il nemico.', 'Vai al bar e chiedi se c\'è posta per il Comando.'],
      congedo: ['Bravo. Ti promuovo caporale. Non ti pago, ma ti promuovo.', 'Congedato. Torna a casa da tua madre, ragazzo. Dille che il Generale è contento.', 'Medaglia al valore.'],
    },
    contessa: {
      nick: 'la Contessa', chi: n => n.pop.sex === 'f' && n.pop.age >= 58,
      fissa: 'È convinta di essere una nobile decaduta e che tutta la città sia la sua servitù, un po\' scansafatiche. Vive in due stanze. Parla di un palazzo, di un marito "potentissimo" e di balli col Garante. Non è arrogante: è sinceramente dispiaciuta per quanto è difficile trovare personale.',
      voce: 'altezzosa e svagata, dà del lei a tutti come a camerieri, si lamenta del servizio; candida, mai crudele',
      passa: ['Lei. Sì, lei. Mi porti il cappotto. No, non ce l\'ho. Lo porti lo stesso.', 'Il servizio, in questa città, è peggiorato dal Settecento.', 'Ha l\'aria di uno che sa lucidare l\'argenteria. Si vede dalle mani.', 'Le concedo di salutarmi.', 'Mio marito era un uomo potentissimo. Poi è morto. Che debolezza.', 'Il mio palazzo è là. Dietro il distributore. Non si vede perché è molto discreto.'],
      ritorno: ['Ah, il giovane della servitù. Lei è in ritardo. Di tre giorni.', 'Mi è tornato in mente il suo nome. No, era quello del cavallo.', 'Lei di nuovo. Le aumento lo stipendio: da niente a niente e mezzo.'],
      solo: ['Bisognerà far ridipingere il mare.', 'Le perle, le perle... ah, sono qui, sono le cipolle.', 'Nel \'62 ho ballato col Garante. Pestava i piedi come governa.', 'Qualcuno dica al fornaio che il pane si fa con l\'oro. Non so come, è il suo mestiere.'],
      ordine: ['Lei! Mi regga l\'ombrello.', 'Giovanotto, la borsa. Pesa come la nobiltà.', 'Mi accompagni. Due passi dietro, come si deve.'],
      ordine2: ['Più dritto. Lei cammina come un notaio.', 'Non così vicino. Si sente che non è di famiglia.', 'Questo palazzo lo costruì il mio bisnonno. Adesso è una lavanderia, ma i muri lo sanno.'],
      congedo: ['Basta così. Si ritiri. Le farò avere una mancia per testamento.', 'Ottimo servizio. La raccomanderò ai Savoia.', 'Può andare. E si pettini.'],
    },
    profeta: {
      nick: 'il Profeta', chi: n => n.pop.sex !== 'f' && n.pop.age >= 35,
      fissa: 'Annuncia la fine del mondo con date e orari precisissimi, e quando non succede la sposta senza scomporsi. Le sue profezie sono enormi e banali insieme. Dorme poco, legge l\'elenco del telefono come un libro sacro. Ogni tanto ci azzecca su cose minuscole, e questo lo rende molto pericoloso.',
      voce: 'tono da predica, profezie con l\'ora esatta, segni presi da cose qualunque; calmo, mai minaccioso',
      passa: ['Martedì finisce il mondo. Verso le quattro. Si porti un ombrello.', 'L\'ho visto in sogno: tu, un\'anguria, e una decisione sbagliata.', 'Pentitevi. O almeno lavatevi.', 'Il segno arriverà sotto forma di un uomo con un\'Ape. Ah, eccolo. No, era un altro.', 'Fra tre giorni piove pesce. Non tanto. Due o tre.', 'Non ti dico cosa ti succede domani. Ti dico solo: non comprare le acciughe.'],
      ritorno: ['Tu! Te l\'avevo detto. Non so cosa, ma te l\'avevo detto.', 'La fine del mondo è rimandata a giovedì. C\'era la tombola.', 'Le acciughe. Le hai comprate? Lo vedo che le hai comprate.'],
      solo: ['Pagina quattrocentododici. Rossi, Rossi, Rossi... troppi Rossi. È un segno.', 'Ore sedici e quaranta. Niente. Ore sedici e quarantuno.', 'Le gru del porto si sono mosse. Si muovono sempre, ma oggi con intenzione.', 'Il settimo sigillo è il tappo del vino. Ci arriveranno, ci arriveranno.'],
      predica: ['Fratelli! La fine è vicina!', 'Ascoltatemi! Ho fatto i conti!', 'Popolo di Porto Vecchio! Ho una data!'],
      predica2: ['Sabato alle nove e un quarto! Il mare si alza di una spanna e poi torna giù! Ci rimarrete male!', 'Un vento verrà da Nord e ci porterà via tutti i cappelli! Prima quelli belli!', 'L\'Apocalisse comincerà dal panettiere! Non dico quale! Ce n\'è uno solo!'],
      folla: ['A che ora, scusi?', 'E sabato non posso, c\'è il matrimonio di mia cugina.', 'L\'altra volta aveva detto giovedì.', 'Si può spostare a dopo cena?', 'Io me lo segno.'],
      chiusa: ['Avete tempo per pentirvi. Poco. Tipo un caffè.', 'Ve l\'ho detto. Poi non venite a lamentarvi da me.', 'Ci vediamo alla fine. Io sarò lì vicino alla fontana.'],
    },
    smemorato: {
      nick: 'Nonno Peppino', chi: n => n.pop.age >= 70,
      fissa: 'Ha più di settant\'anni e la memoria che va e viene. Scambia tutti per qualcun altro, quasi sempre per gente del \'50; racconta la stessa storia ogni volta con un finale diverso. È contento, affettuoso, curioso. Ogni tanto dice una cosa lucidissima che ti gela, poi chiede che giorno è.',
      voce: 'affettuoso, confuso, chiama per nomi sbagliati, storie che cambiano a metà; ogni tanto una frase lucidissima',
      passa: ['Ninetto! Ti credevo morto. Ah, sei un altro. Peccato, Ninetto mi doveva dei soldi.', 'Che giorno è? No, non me lo dire. Voglio la sorpresa.', 'Hai visto mia moglie? Alta così, vestita di blu. Morta nel \'74, ma magari è uscita.', 'Una volta qui era tutto mare. Poi tutto campi. Poi di nuovo mare. Io non ci capisco più niente.', 'Scusi, io abito qui? Mi sembra un bel posto.', 'Ti racconto quella del mulo e del prete. Allora c\'era un prete. Fine.'],
      ritorno: ['Ciao, Ninetto! Ah no, sei quello che non è Ninetto. Ciao lo stesso.', 'Tu mi conosci? Perché io ti conosco, ma non so da dove. Sei della banca?', 'Eccoti. Ti ho tenuto il posto. Non so per cosa.'],
      solo: ['Il pane l\'ho preso. O l\'ho mangiato. Una delle due.', 'Avevo un cane. Oppure ero il cane. No, avevo un cane.', 'Tutti morti, i miei amici. Che maleducati.', 'Torno indietro a vedere se ho chiuso il gas. Da che casa, non lo so.'],
      storia: ['Nel \'52 ho salvato un uomo dal mare.', 'Ti ho mai detto di quando ho conosciuto Coppi?', 'Io una volta ho fatto il pugile.'],
      storia2: ['Era un tonno. Ma era un tonno molto per bene.', 'Gli ho bucato una gomma. Non apposta. Cioè, apposta, ma non a lui.', 'Ho vinto un incontro. Poi ho scoperto che era un matrimonio.'],
      congedo: ['Vabbè, ciao Ninetto.', 'Salutami tua madre. Anche se è mia sorella. Non mi ricordo.', 'Che bello parlare con te. Chi eri?'],
    },
    venditore: {
      nick: 'il Venditore', nickF: 'la Venditrice', chi: n => n.pop.age >= 25 && n.pop.age <= 66,
      fissa: 'Vende cose che non esistono: il silenzio in scatola, ombre usate, buchi da scavare, "il diritto di sedersi su questa panchina", ricordi di altre persone. Fa tutto con la serietà di un rappresentante di aspirapolveri: ha listino, garanzia, rate. Qualcuno compra.',
      voce: 'imbonitore cortese, garanzie e listini per merce inesistente, sconti assurdi; serissimo',
      passa: ['Ombre usate, mille lire. Questa era di un notaio, è ancora come nuova.', 'Le vendo un buco. Lo scava lei, io le do il diritto.', 'Silenzio in scatola. Non la apra qui, si sprecherebbe.', 'Un ricordo d\'infanzia? Ne ho uno di un ragazzo di Ostia. Lo vede il mare? Ecco.', 'Per lei, sconto: compra niente e gliene do il doppio.', 'Garanzia a vita. La sua, non la mia.'],
      ritorno: ['Cliente! Com\'è andato il buco? Profondo?', 'Ah, il signore dell\'ombra. Se la tiene bene, vedo.', 'Ho una novità: l\'eco. Glielo ripeto: l\'eco.'],
      solo: ['Silenzio, silenzio fresco... di giornata...', 'Il diritto di prelazione sul tramonto. Ne ho tre, me ne restano tre.', 'Rate da cinquecento lire per diciotto anni. Il niente non si svaluta.'],
      offre: ['Silenzio in scatola! Cinquecento lire!', 'Ombre di prima mano! Chi le vuole!', 'Il posto in fila, venduto per intero! Si risparmia la fila!'],
      offre2: ['Per lei, signora, la scatola grande. Dentro c\'è più silenzio.', 'Le ombre col cappello costano di più. Si capisce.', 'Questa sedia invisibile è antica. Antichissima. Non l\'ha mai vista nessuno.'],
      venduto: ['Lo apra a casa. E se sente qualcosa, me lo riporti: è difettoso.', 'Ottimo acquisto. È l\'ultimo. Fino a domani.', 'Firmi qui. No, la penna non c\'è. Ma la firma vale.'],
    },
  };
  const KEYS = Object.keys(MATTI);

  // ================= I FRAMMENTI SENTITI PASSANDO =================
  // due, tre battute fra A e B, senza contesto: tu passi, loro sono a metà della loro vita
  const FRAM = [
    ['Mia suocera è tornata.', 'Da dove?', 'Non lo dice. Ha portato un\'anatra.'],
    ['Trent\'anni di matrimonio, e stamattina scopro che russa in francese.', 'E che dice?', 'Non lo so, io il francese non lo so.'],
    ['Ho sognato che ero una sedia.', 'E allora?', 'Ci si sedeva tuo cugino. Non gli parlo più.'],
    ['Non è che non voglio sposarti. È che quel giorno ho un impegno.', 'Quale giorno?', 'Qualsiasi.'],
    ['Il dentista dice che ho i denti di un uomo di novant\'anni.', 'E tu?', 'Gli ho detto di ridarglieli.'],
    ['Allora, il cane l\'ha mangiato.', 'Il compito?', 'Mio zio. Il cappello di mio zio. Ma lo zio ci teneva come a un figlio.'],
    ['Ha detto che mi ama.', 'E tu?', 'Gli ho detto grazie. Poi sono scappata. Poi sono tornata a dire che il grazie era sincero.'],
    ['Io a mio fratello non presto più niente.', 'Cosa gli hai prestato?', 'La moglie. Per il matrimonio di un cugino. Me l\'ha ridata diversa.'],
    ['Lo sai che il pesce rosso di Ines ha compiuto ventidue anni?', 'Ventidue?', 'Secondo me ne ha cambiati sette. Ma lei festeggia.'],
    ['L\'avvocato ha detto: o la casa o il gatto.', 'E tu?', 'Ho tenuto il gatto. Adesso viviamo dal gatto.'],
    ['Allora ho detto: se il cane parla, il cane paga l\'affitto.', 'E lui?', 'Il padrone di casa ha pagato. Il cane no.'],
    ['Quindi la zia Pina è morta o no?', 'Dipende.', 'Da cosa?', 'Dal testamento.'],
    ['Ho trovato il mio nome sul giornale.', 'Per cosa?', 'Non lo so, era un altro con il mio nome. Ma mi sono sentito importante.'],
    ['Lui ti piace?', 'Ha un bel modo di aprire le porte.', 'E poi?', 'Poi basta. Ma le apre benissimo.'],
    ['Ho preso la patente!', 'Dopo quante volte?', 'Non l\'ho fatto l\'esame. L\'ho presa proprio. Era sul tavolo.'],
    ['E il bambino?', 'Dice che vuole fare il prete.', 'Il prete?', 'Per le scarpe. Gli piacciono le scarpe dei preti.'],
    ['Ti giuro che il frigorifero di notte fa un rumore come di uno che pensa.', 'A cosa?', 'A me. Pensa a me. Lo sento.'],
    ['Me l\'hai restituito il martello?', 'Quale martello?', 'Quello che ti ho prestato nel \'71.', 'Ah. Sì. No.'],
    ['Allora ci sei a cena domenica?', 'Chi c\'è?', 'Mamma, papà, e l\'uomo che dorme in cantina.', 'Chi è?', 'Non lo sappiamo. Ma è educato.'],
    ['Ho deciso: da domani cambio vita.', 'Come?', 'Mi alzo dall\'altro lato del letto.'],
    ['Mi ha lasciato per un geometra.', 'Che geometra?', 'Il mio. Quello della casa. Adesso non so più quanto è grande il bagno.'],
    ['Mio nonno è diventato vegetariano.', 'A novant\'anni?', 'Dice che le mucche non gli hanno fatto niente. Io dico che non le ha mai conosciute.'],
    ['Quanto ti ha chiesto?', 'Cinquemila.', 'Per cosa?', 'Per smettere di cantare. Gliele ho date. Ha smesso. È stato bellissimo.'],
    ['Ma tua sorella con il pompiere?', 'Lasciati.', 'Peccato.', 'No, lei è contenta. È il pompiere che non si dà pace. Dorme sotto casa con la scala.'],
    ['Sai chi ho visto al mercato?', 'Chi?', 'Me. Da giovane. Era un ragazzo identico. Gli ho detto di non sposarsi.'],
    ['Ho chiesto un aumento.', 'E?', 'Mi hanno dato una sedia. Più alta. Dicono che è un aumento.'],
    ['Lo vedi quello lì?', 'Sì.', 'Non guardarlo.', 'Perché?', 'Non lo so, me l\'ha detto mia madre nel \'64 e non ho mai smesso.'],
    ['Lo hai rimesso nel freezer?', 'Chi?', 'Cosa. Ho detto cosa. Il pollo. Ho detto cosa.'],
    ['Io la notte conto le pecore.', 'Funziona?', 'No. Me ne manca sempre una. Non dormo per cercarla.'],
    ['Mio marito ha detto che va a comprare le sigarette.', 'Quando?', 'Nel \'79.', 'E?', 'Ogni Natale manda una cartolina. Dice che c\'è la fila.'],
    ['Ho fatto la dieta del pompelmo.', 'E?', 'Ho perso tre chili e un amico. Lui odiava il pompelmo.'],
    ['Dicono che il nuovo prete balla.', 'Balla?', 'Di notte, in sacrestia. Da solo. Benissimo, dicono.'],
    ['Me lo dai un consiglio?', 'Dimmi.', 'Se uno ti regala un pappagallo che dice il tuo nome, cosa fai?', 'Dipende da come lo dice.'],
    ['Ho chiamato il bambino come il Garante.', 'Sei matto?', 'Così quando lo sgrido mi sento meglio.'],
    ['Allora gliel\'hai detto?', 'No.', 'Perché?', 'Era di spalle. Di spalle non si può.'],
    ['Lei mi piace, ma ha un difetto.', 'Quale?', 'Ha un marito.', 'Grave?', 'Grosso.'],
    ['Ti ricordi Tonio che diceva di essere stato in America?', 'Sì.', 'Non era vero.', 'Lo sapevo.', 'Era stato in Belgio. Che è peggio, ma è vero.'],
    ['Tu ci credi ai fantasmi?', 'No.', 'Neanche io. Ma la nonna, da morta, mi sposta ancora le ciabatte.'],
    ['Il mio pappagallo ha imparato a fare il telefono.', 'Bello!', 'No. Tutta la notte mi alzo a rispondere. È lui.'],
    ['Ma tu cosa fai di lavoro, alla fine?', 'Te l\'ho detto cento volte.', 'Lo so. Ma non ho mai capito.', 'Neanche io. Ma pagano il venerdì.'],
    ['Lei è vedova?', 'Quasi.', 'Come quasi?', 'Lui sta benissimo. Io mi porto avanti.'],
    ['L\'oroscopo dice che oggi incontro l\'amore.', 'Sono le sette di sera.', 'Ancora cinque ore. Non mi muovo da qui.'],
  ];

  // ================= STATO =================
  const S = st => st.__matti || (st.__matti = { ready: false, ids: {}, cd: 0, fram: 0, deck: [], q: [], incontri: {} });
  const isMatto = n => !!(n && n.pop && n.pop.matto);
  const alive = n => n && !n.dead;
  function ok(st, n) {   // può parlare per conto suo (né dentro, né in una scena, né in una rissa)
    return alive(n) && !n.inside && !n.room && !n.__ev && !n.cop && !n.faction && !n.aggro && !(n.stun > 0) && !n.inVeh && !(n.panic > 0) && !(n.jailedUntil > st.t) && n.pop && n.pop.near !== false && (!n.action || n.action.name === 'routine');
  }
  // all'avvio: uno vicino a casa di Nino (così lo si incontra davvero), gli altri sparsi per la città
  function choose(st) {
    const M = S(st), p = st.player, used = new Set(), homes = [];
    const pool = st.npcs.filter(n => n.pop && !n.dead && !n.cop && !n.faction && !n.military && !CAST.has(n.id) && !n.pop.writer && !n.pop.giro && n.pop.homeT);
    KEYS.forEach((k, i) => {
      const D = MATTI[k]; let c = pool.filter(n => !used.has(n) && D.chi(n));
      if (!c.length) return;
      const jobless = c.filter(n => !n.pop.job); if (jobless.length >= 2) c = jobless;   // chi non lavora gira di più
      const h = n => n.pop.homeT;
      const score = i === 0 ? (n => -hyp(h(n).x - p.x, h(n).y - p.y)) : (n => Math.min(...homes.map(q => hyp(h(n).x - q.x, h(n).y - q.y)), 400) + rnd() * 30);
      c.sort((a, b) => score(b) - score(a)); const n = c[0];
      used.add(n); homes.push(h(n)); n.pop.matto = k; M.ids[k] = n.id; n.nick = (n.pop.sex === 'f' && D.nickF) || D.nick;
      card(st, n, D);
    });
    M.ready = true;
  }
  // la scheda che legge la chat: la voce e la fissazione vengono prima della biografia
  function card(st, n, D) {
    const R = typeof Risacca !== 'undefined' ? Risacca : null; if (!R || !R.CARDS) return;
    const c0 = R.CARDS[n.id] || {}, bio0 = Object.getOwnPropertyDescriptor(c0, 'bio');
    const c = Object.assign({}, c0); delete c.bio;
    c.voice = D.voce;
    Object.defineProperty(c, 'bio', { enumerable: true, get: () => `Per tutti è ${n.nick}. ${D.fissa} ${bio0 ? (bio0.get ? bio0.get() : bio0.value) || '' : ''}`.trim() });
    R.CARDS[n.id] = c;
  }
  const scheda = n => { const D = n && n.pop && MATTI[n.pop.matto]; return D ? { soprannome: n.nick, fissazione: D.fissa, voce: D.voce } : undefined; };
  const linea = (n, k) => { const D = n && n.pop && MATTI[n.pop.matto]; return D && D[k] ? pick(D[k]) : null; };

  // ================= IL PASSO =================
  function step(st, dt) {
    const M = S(st), p = st.player;
    if (!M.ready) { if (st.pop && st.npcs && st.npcs.length && st.clock > 2) choose(st); return; }
    // le battute in coda (i frammenti a due voci): ognuno parla al suo turno, se è ancora lì
    if (M.q.length) { const now = st.clock; while (M.q.length && M.q[0].at <= now) { const b = M.q.shift(); const n = G.byId(st, b.id); if (ok(st, n) && hyp(n.x - p.x, n.y - p.y) < 20) G.say(st, n, b.text, 3.4); else M.q = M.q.filter(x => x.g !== b.g); } }
    if (p.indoor || p.vehicle || p.lv || st.chase || st.over) return;
    if ((st.__mtT = (st.__mtT || 0) + dt) < .5) return; st.__mtT = 0;   // due volte al secondo basta
    // i matti: ti parlano quando passi
    if (st.clock > M.cd) for (const k of KEYS) {
      const n = G.byId(st, M.ids[k]); if (!ok(st, n) || (n.__mtCd || 0) > st.clock) continue;
      const d = hyp(n.x - p.x, n.y - p.y);
      let line = null;
      if (d < CFG.passa) { const met = M.incontri[k] || 0; line = linea(n, met > 0 && rnd() < .55 ? 'ritorno' : 'passa'); M.incontri[k] = met + 1; if (G.HOOKS && n.face !== undefined) n.face = Math.atan2(p.y - n.y, p.x - n.x); }
      else if (d > CFG.solo[0] && d < CFG.solo[1] && rnd() < .08) line = linea(n, 'solo');
      if (!line) continue;
      G.say(st, n, line, 4); n.__mtCd = st.clock + CFG.cdMatto; M.cd = st.clock + CFG.cdTutti;
      if (typeof Popolo !== 'undefined' && Popolo.note && d < CFG.passa && M.incontri[k] === 1) try { Popolo.note(st, n, 'ha parlato con lo straniero, che lo ha ascoltato', 'info', { w: .2, tag: 'giocatore', who: 'player' }); } catch (e) { }
      break;
    }
    // i frammenti: due che parlano lì vicino, a metà della loro storia
    if (st.clock < M.fram || M.q.length) return;
    M.fram = st.clock + CFG.fram[0] + rnd() * (CFG.fram[1] - CFG.fram[0]);
    const near = st.npcs.filter(n => { const d = hyp(n.x - p.x, n.y - p.y); return d > CFG.framR[0] && d < CFG.framR[1] && ok(st, n) && !isMatto(n); });
    for (const a of near) {
      const b = near.find(k => k !== a && hyp(k.x - a.x, k.y - a.y) < CFG.coppia); if (!b) continue;
      if (!M.deck.length) M.deck = FRAM.map((_, i) => i).sort(() => rnd() - .5);
      const F = FRAM[M.deck.pop()], g = st.clock;
      F.forEach((text, i) => M.q.push({ id: (i % 2 ? b : a).id, text, at: st.clock + i * CFG.gap, g }));
      a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = Math.atan2(a.y - b.y, a.x - b.x);
      return;
    }
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Matti]', e); } } }; }

  // ================= LE SCENE STRANE (per eventi.js) =================
  // {matto:'a', k} dice la battuta del matto di quel ruolo; se il ruolo è un vecchio qualunque (nessun matto vicino), una delle
  // battute di riserva. Le scene col giocatore (player: true) vengono a cercarti, di rado (una ogni 10 minuti, decide eventi.js).
  const SAY = (r, ...l) => ({ say: r, l });
  const ML = (r, k, riserva, w) => ({ fn: (st, sc) => { const n = sc.roles[r], E = EV(); if (!n || n.dead || !E) return; const line = linea(n, k) || pick(riserva); E._.sayEv(st, n, line.replace(/\{([a-z]+)\}/g, (_, q) => (sc.roles[q] && (sc.roles[q].first || sc.roles[q].name)) || q), 3.6); }, w: w !== undefined ? w : 3 });
  const SCENE = [
    // --- i matti ---
    { id: 'matto_generale', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.5, d: 1.3, t: 16 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'indica_su' },
      ML('a', 'ordine', ['Tu! Sull\'attenti!', 'Recluta! Fermo lì!']), SAY('b', 'Io? Sto andando a lavorare.', 'Ma ci conosciamo?', 'Signore, ho fretta.'),
      ML('a', 'ordine2', ['Il lavoro è un\'invenzione del nemico. Attenti!', 'Riposo. Attenti. Riposo.']), { pose: 'b', p: 'saluta_su' },
      SAY('b', 'Va bene... signorsì.', 'Agli ordini, Generale.', 'Signorsì. Posso andare a pisciare?'), { pose: 'a', p: 'saluta_su' },
      ML('a', 'congedo', ['Bravo. Ti promuovo caporale.', 'Congedato.']), { pose: 'a' }, { pose: 'b' }, { flee: 'b', from: 'a', sp: 1.6 }, { wait: 2 }] },
    { id: 'matto_contessa', w: 1, when: 'day', roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.2, d: 1.3, t: 18 }, { look: 'b', at: 'a' },
      ML('a', 'ordine', ['Giovanotto, la borsa.', 'Mi regga l\'ombrello.']), SAY('b', 'Prego?', 'Signora, io non lavoro per lei.', 'Ma quale ombrello? Non piove.'),
      { pose: 'b', p: 'porta_su' }, { follow: 'b', who: 'a', sp: 1.2, d: 1.4 }, { wander: 'a', r: 4, sp: .8 }, { wait: 3 },
      ML('a', 'ordine2', ['Più dritto. Lei cammina come un notaio.', 'Non così vicino.']), SAY('b', 'Ma come ci sono finito qui...', 'Mia madre lo deve sapere.', 'Va bene, ma solo fino alla fontana.'), { wait: 2 },
      ML('a', 'congedo', ['Può andare. E si pettini.', 'Le farò avere una mancia per testamento.']), { pose: 'b' }, { flee: 'b', from: 'a', sp: 1.5 }, { wait: 2 }] },
    { id: 'matto_profeta', w: 1, posto: ['sagrato', 'mercato', 'pensilina'], soft: true, roles: [{ id: 'a', f: 'matto|m' }], beats: [
      { pose: 'a', p: 'braccia_su' }, ML('a', 'predica', ['Fratelli! La fine è vicina!', 'Ascoltatemi! Ho fatto i conti!']), { crowd: 3, around: 'a', r: 22, p: 'aspetta' }, { wait: 2 },
      ML('a', 'predica2', ['Sabato alle nove e un quarto! Il mare si alza di una spanna e poi torna giù!', 'L\'Apocalisse comincerà dal panettiere!'], 4),
      SAY('folla', 'A che ora, scusi?', 'E sabato non posso, c\'è il matrimonio di mia cugina.', 'L\'altra volta aveva detto giovedì.', 'Si può spostare a dopo cena?', 'Io me lo segno.'), { wait: 2.5 },
      SAY('folla', 'Ma chi è questo?', 'È quello del giovedì.', 'Lascialo stare, l\'anno scorso ci ha preso sulla grandine.'), { pose: 'a', p: 'indica_su' },
      ML('a', 'chiusa', ['Avete tempo per pentirvi. Poco. Tipo un caffè.', 'Poi non venite a lamentarvi da me.']), { pose: 'a' }, { wait: 2 }] },
    { id: 'matto_smemorato', w: 1, posto: ['panchina', 'sagrato', 'dehors'], soft: true, roles: [{ id: 'a', f: 'matto|old' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.1, d: 1.2, t: 18 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Ninetto! Sei tu!', 'Rosaria! Quanto tempo!', 'Comandante! Lei è vivo!'), SAY('b', 'Veramente io sono {b}.', 'No, guardi, si sbaglia.', 'Sono {b}, il figlio della Carmela.'),
      SAY('a', 'Ah, {b}! Ma certo. Il figlio di Ninetto.', 'Meglio ancora. Siediti che ti racconto.'), { pose: 'a' },
      ML('a', 'storia', ['Nel \'52 ho salvato un uomo dal mare.', 'Io una volta ho fatto il pugile.']), SAY('b', 'Ah sì?', 'E poi?', 'Davvero?'),
      ML('a', 'storia2', ['Era un tonno. Ma era un tonno molto per bene.', 'Ho vinto un incontro. Poi ho scoperto che era un matrimonio.'], 3.5),
      SAY('b', 'Bella storia.', 'Ma l\'altra volta era un cavallo.', '...va bene.'), ML('a', 'congedo', ['Vabbè, ciao Ninetto.', 'Che bello parlare con te. Chi eri?']), { flee: 'b', from: 'a', sp: 1.4 }, { wait: 2 }] },
    { id: 'matto_venditore', w: 1, when: 'day', posto: ['mercato', 'pensilina', 'sagrato', 'angolo'], soft: true, roles: [{ id: 'a', f: 'matto|adult' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, ML('a', 'offre', ['Silenzio in scatola! Cinquecento lire!', 'Ombre di prima mano!']), { wait: 2.5 }, { pose: 'a' },
      { go: 'a', to: 'b', sp: 1.6, d: 1.3, t: 14 }, { look: 'b', at: 'a' }, ML('a', 'offre2', ['Per lei, la scatola grande. Dentro c\'è più silenzio.', 'Questa sedia invisibile è antica.']),
      SAY('b', 'Ma non c\'è niente.', 'E cosa me ne faccio?', 'Quanto, per due?'), { pose: 'a', p: 'porge', w: 1.2 },
      { p: .45, then: [{ pay: ['b', 'a', 1] }, SAY('b', 'Va bene, dammene uno. Per mia moglie.', 'Ecco. Mi serviva, in effetti.'), ML('a', 'venduto', ['Lo apra a casa. Se sente qualcosa, è difettoso.', 'Ottimo acquisto.'])],
        else: [SAY('b', 'Ce l\'ho già, grazie.', 'Ne ho a casa una cassa.'), SAY('a', 'Allora gliela compro io. Usata, cinquanta lire.', 'Peccato. Era l\'ultima. Ne ho altre trenta.')] }, { pose: 'a' }, { wait: 2 }] },

    // --- la vita degli altri, che ti passa davanti ---
    { id: 'prova_discorso', w: 1, roles: [{ id: 'a', f: 'adult' }], beats: [
      { wander: 'a', r: 3, sp: .7 }, SAY('a', 'Cara, ho perso la casa a carte. No.', 'Amore, la Vespa... la Vespa ha preso una decisione.', 'Mamma, ti devo dire una cosa. Il prete è d\'accordo.'), { wait: 3.5 },
      SAY('a', 'Cara, la casa ha perso me. Meglio.', 'Amore, la Vespa si è innamorata. Di un camion. No...', 'Mamma, il prete non è proprio d\'accordo. Ma ha capito.'), { wait: 3.5 },
      { pose: 'a', p: 'braccia_su' }, SAY('a', 'Va bene. Ci vado. Tanto mi ammazza lo stesso.', 'Gliela dico a Natale. Davanti ai parenti non urla.', 'No, scrivo una lettera e parto.'), { pose: 'a' }, { go: 'a', to: 'away', sp: 1.8, d: 2, t: 9, soft: true }] },
    { id: 'prova_pianto', w: 1, when: 'day', roles: [{ id: 'a', f: 'f' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'aspetta' }, SAY('a', 'Buuuh... no, troppo.', 'Uh... uh-uh... no, sembro una civetta.'), { wait: 2.5 }, SAY('a', 'Buh. Ecco. Così.', 'Uh. Sì, questo è dignitoso.'), { wait: 1.5 },
      { go: 'b', to: 'a', sp: 1.5, d: 1.3, t: 14 }, SAY('b', 'Signora, tutto bene?', 'Le è successo qualcosa?'),
      SAY('a', 'Mi alleno. Giovedì muore lo zio Tore.', 'È per il funerale di mio cognato.'), SAY('b', 'Oddio, è malato?', 'Mi dispiace. Quando è morto?'),
      SAY('a', 'No, sta benissimo. Ma ha fatto testamento.', 'Non ancora. Ma è uno puntuale.'), { pose: 'a' }, SAY('b', '...', 'Ah. Allora auguri.', 'Ci vediamo giovedì, allora.'), { flee: 'b', from: 'a', sp: 1.5 }, { wait: 2 }] },
    { id: 'chi_muore_prima', w: 1, posto: ['panchina', 'dehors'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'old', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.2, d: 1.1, t: 18 }, { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'siede_terra' },
      SAY('a', 'Il medico mi ha dato sei mesi.', 'Il dottore dice che ho il cuore di un passerotto.'), SAY('b', 'A me tre.', 'Io ce l\'ho di un passerotto morto.'),
      SAY('a', 'Sbruffone.', 'Sempre a vantarti.'), SAY('b', 'Scommettiamo diecimila?', 'Diecimila che vado prima io.'), { wait: 1.5 },
      SAY('a', 'Andata. Ma se vinco tu, come me li dai?', 'Andata. Li lascio a mia nuora, lei paga tutti.'), SAY('b', 'Ci penso io. Ho un amico in parrocchia.', 'Te li porto di persona. Tu aspettami.'), { wait: 3 }] },
    { id: 'vedova_panchina', w: 1, posto: 'panchina', soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'siede_terra' }, SAY('a', 'Pino, non sederti sul bagnato. Ti ho detto mille volte.', 'Gianni, hai preso la sciarpa? No? Bravo, così impari.'), { wait: 3 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.5, t: 14 }, SAY('b', 'Signora, con chi parla?', 'Scusi, ma lì non c\'è nessuno.'),
      SAY('a', 'Lo so. Ma lui non lo sa.', 'Con mio marito. È morto nel \'77, ma è sempre stato distratto.'), SAY('b', 'Ah. Mi scusi.', 'Mi saluti suo marito, allora.'),
      SAY('a', 'Glielo dico. Ma non ti risponde, eh. Non rispondeva neanche prima.'), { wait: 3 }] },
    { id: 'lettera_garante', w: 1, when: 'day', roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'legge_su' }, SAY('a', '«Egregio Garante, le scrivo per lamentarmi del freddo.»', '«Illustrissimo Garante, mio vicino ha un gallo.»'), { wait: 2 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('a', '«So che non è colpa sua. Ma tutto il resto sì.»', '«Il gallo canta alle quattro. Chiedo che venga rettificato. Il gallo, non il vicino. Per ora.»'),
      SAY('b', 'Ma sei matto? Spediscila e spediscono anche te.', 'Bella. La firmi?'), SAY('a', 'La firmo col nome di mio cognato.', 'Non la spedisco. La leggo forte, così la sentono lo stesso.'), { pose: 'a' }, { wait: 2 }] },
    { id: 'turno_arrabbiarsi', w: 1, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.7, d: 1.2, t: 16 }, { pose: 'b', p: 'discute_su' }, SAY('b', 'Adesso mi arrabbio!', 'Guarda che m\'incazzo, eh!'),
      { pose: 'a', p: 'indica_su' }, SAY('a', 'No, tocca a me. Tu ti sei arrabbiato ieri.', 'Un momento. Prima io, l\'ho detto prima.'),
      SAY('b', 'Ieri era per il cane, non vale.', 'Allora facciamo metà per uno.'), SAY('a', 'Va bene. Comincia tu. Ma breve.', 'Va bene, ma oggi decido io per cosa.'), { pose: 'a' }, { pose: 'b' },
      SAY('b', 'Ecco... adesso non mi viene più.', 'Non mi ricordo più perché.'), SAY('a', 'Visto? Lo fai sempre.', 'Allora andiamo a bere.'), { wait: 2 }] },
    { id: 'ora_esatta', w: 1, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1.2, t: 16 }, SAY('a', 'Scusi, che ore sono?', 'Mi dice l\'ora, per favore?'), { look: 'b', at: 'a' }, SAY('b', 'Le cinque e un quarto.', 'Quasi le sei.', 'Le undici precise.'),
      SAY('a', 'Sicuro? Il mio dice giovedì.', 'Strano. A casa mia sono le otto. Da tre anni.', 'Ah. Allora sono in ritardo di un matrimonio.'), SAY('b', '...', 'Allora le serve un altro orologio.', 'Auguri.'), { flee: 'a', from: 'b', sp: 1.6 }, { wait: 2 }] },
    { id: 'confessione', w: 1, posto: ['panchina', 'dehors', 'portone'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { go: 'a', to: 'b', sp: 1.3, d: 1.2, t: 18 }, SAY('a', 'Le galline del \'71 le ho rubate io. Ecco. L\'ho detto.', 'Sono stato io a mettere il sale nella fontana nel \'66.'),
      SAY('b', 'E a me che lo dice?', 'Ma chi gliel\'ha chiesto?'), SAY('a', 'Nessuno. È questo il bello.', 'A lei perché ha la faccia di uno che non conta niente.'),
      SAY('b', 'Grazie, eh.', 'Si sente meglio?'), SAY('a', 'Benissimo. Domani le dico chi ha rubato le sue.', 'Moltissimo. Arrivederci, complice.'), { flee: 'a', from: 'b', sp: 1.3 }, { wait: 2 }] },
    { id: 'pesce_addio', w: 1, when: 'day', posto: ['banco_pesce', 'mercato'], soft: true, roles: [{ id: 'a', f: 'shop|m' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, SAY('a', 'Ciao Gino. Eri il più bello della cassetta.', 'Addio, Mario. Ti ho voluto bene, ma devo pagare l\'affitto.'), { wait: 2.5 },
      { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('b', 'Ma parla col pesce?', 'Mi dà quella spigola?'), SAY('a', 'Quella è Teresa. Se la vuole, la tratti bene.', 'Mario no. Mario è promesso.'),
      { pose: 'a', p: 'porge', w: 1 }, { pay: ['b', 'a', 1] }, SAY('b', 'La tratto benissimo. Al forno.', 'Allora mi dia quella che non ha nome.'), SAY('a', 'Ciao Teresa...', 'Quella si chiama Loredana. Adesso.'), { pose: 'a' }, { wait: 2 }] },
    { id: 'appuntamento_sbagliato', w: 1, roles: [{ id: 'a', f: 'adult' }, { id: 'b', near: 'a', f: 'adult', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1.2, t: 16 }, SAY('a', 'Lei è quella dell\'annuncio sul giornale?', 'Scusi, è lei il signore col garofano?'),
      SAY('b', 'No, sono il geometra.', 'Quale annuncio?', 'Il garofano è perché ho un funerale.'), { wait: 1 },
      SAY('a', 'Va bene lo stesso. Ho già prenotato.', 'Fa niente. Ha da fare stasera?'), SAY('b', '...a che ora?', 'Pagate voi?', 'Il funerale finisce alle sette.'),
      { follow: 'b', who: 'a', sp: 1.4 }, { go: 'a', to: 'away', sp: 1.4, d: 2, t: 9, soft: true }] },
    { id: 'saluto_autobus', w: 1, posto: ['fermata', 'pensilina'], soft: true, ora: [7, 21], roles: [{ id: 'a', f: 'old' }], beats: [
      SAY('a', 'Aspetta! Aspettaaa!', 'Fermo! Fermo!'), { go: 'a', to: 'away', sp: 3, d: 2, t: 8, soft: true }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Ciao Renato! Ti volevo solo salutare!', 'Buon viaggio, Renato! Salutami tua moglie!'), { wait: 2 }, { pose: 'a' }, { mood: 'a', m: 'stanco' },
      SAY('a', 'Trent\'anni che lo saluto. Non sono mai salito.', 'Domani gli porto i biscotti.'), { wait: 2 }] },
    { id: 'pecora_mancante', w: 1, when: 'night', posto: ['angolo', 'dehors'], soft: true, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { mood: 'a', m: 'ubriaco' }, { go: 'b', to: 'a', sp: 1.2, d: 1.1, t: 16 }, SAY('a', 'Se un Grigio cade nel bosco e nessuno lo sente...', 'Secondo me la luna ci guarda. Ma non ci giudica.'),
      SAY('b', '...è una bella notizia lo stesso.', '...cade lo stesso.', 'La luna è una spia.'), { mood: 'b', m: 'ubriaco' }, { wait: 2 },
      SAY('a', 'Ti voglio bene. Ma non te lo dico.', 'Se domani mi sveglio scrivo un libro.'), SAY('b', 'Me l\'hai detto adesso.', 'Scrivilo su di me. Mettimi più alto.'), { wander: 'a', r: 4, sp: .7 }, { follow: 'b', who: 'a', sp: .9, d: 1.2 }, { wait: 4 }] },

    // --- ti tirano dentro (vengono da te; di rado) ---
    { id: 'fai_mio_fratello', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.9, d: 1.4, t: 16 }, { look: 'a', at: 'player' }, SAY('a', 'Psst. Fai finta di essere mio fratello. Due secondi.', 'Abbracciami. Sei mio cugino di Torino. Non chiedere.'), { wait: 2 },
      { pose: 'a', p: 'saluta_su' }, SAY('a', 'Visto? È tornato! Ve l\'avevo detto che esisteva!', 'Ecco mio fratello! Quello che fa l\'avvocato!'), { wait: 2.5 }, { pose: 'a' },
      SAY('a', 'Grazie. Ora mi credono. Se qualcuno chiede, sei allergico ai gatti e hai una moglie in Svizzera.', 'Perfetto. Tu non mi hai mai visto. Però sei mio fratello.'), { flee: 'a', from: 'player', sp: 1.6 }, { wait: 2 }] },
    { id: 'leggimi_lettera', w: 1, player: true, roles: [{ id: 'a', f: 'old', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.4, d: 1.5, t: 16 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'porge' }, SAY('a', 'Scusi, lei sa leggere? Ho dimenticato gli occhiali. Nel \'70.', 'Mi legge questa? È di mio figlio.'), { wait: 2.5 },
      SAY('a', '«Torno a fine mese. Il gatto è nel forno.» Ah... e poi?', 'Come dice? «Mamma, mi sono sposato, è un marinaio»?'), { wait: 2 },
      SAY('a', '«Spento». Il forno è spento. Meno male.', 'Un marinaio. Bene. Almeno sa nuotare.'), { pose: 'a' }, SAY('a', 'Grazie, giovanotto. Le offrirei un caffè ma lei ha la faccia di uno che dorme poco.'), { flee: 'a', from: 'player', sp: 1.2 }, { wait: 2 }] },
    { id: 'sei_tu_pacco', w: 1, player: true, roles: [{ id: 'a', f: 'adult', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.5, d: 1.4, t: 16 }, { look: 'a', at: 'around' }, SAY('a', 'Psst. Sei tu quello del pacco?', 'Sei tu? Il cugino di Michele?'), { wait: 3 },
      SAY('a', 'No? Allora non mi hai visto.', 'Ah, no. Non sei tu. Si vede, hai la faccia onesta.'), { wait: 1.5 },
      SAY('a', 'Però se sei tu, è sotto la terza panchina. E il canarino non c\'entra.', 'Se vedi Michele digli che la mucca è arrivata. Lui capisce.'), { flee: 'a', from: 'player', sp: 1.7 }, { wait: 2 }] },
    { id: 'parola_a_caso', w: 1, player: true, roles: [{ id: 'a', f: 'young', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.8, d: 1.5, t: 14 }, { look: 'a', at: 'player' }, SAY('a', 'Scusa, mi dici un nome a caso?', 'Dimmi un numero da uno a dieci. Veloce.'), { wait: 3 },
      SAY('a', 'Perfetto. Mia figlia si chiamerà così.', 'Sette? Ok. Allora lo lascio.', 'Bene. Ho appena venduto la Vespa.'), { wait: 1.5 },
      SAY('a', 'Se viene male, è colpa tua.', 'Grazie. Non lo saprai mai, ma mi hai cambiato la vita.'), { flee: 'a', from: 'player', sp: 1.6 }, { wait: 2 }] },
    { id: 'nonno_ti_riconosce', w: 1, player: true, roles: [{ id: 'a', f: 'matto|old', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.3, d: 1.5, t: 18 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'saluta_su' },
      SAY('a', 'Nino! Sei tornato dalla guerra!', 'Nino! Ma quanto sei cresciuto! L\'ultima volta eri un neonato. Nel \'31.'), { wait: 2.5 }, { pose: 'a' },
      SAY('a', 'Ah no. Il Nino che dico io è morto nel \'43. Gli somigli.', 'Aspetta, tu non hai i baffi. Il Nino mio aveva i baffi già a otto anni.'), { wait: 2 },
      SAY('a', 'Anche lui aveva quella faccia da uno che deve dei soldi.', 'Vabbè. Ti voglio bene lo stesso. Saluta tua madre.'), { flee: 'a', from: 'player', sp: 1.1 }, { wait: 2 }] },
    { id: 'tienimi_posto', w: 1, player: true, posto: ['fila', 'edicola', 'fermata', 'pensilina'], soft: true, roles: [{ id: 'a', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.8, d: 1.4, t: 14 }, { look: 'a', at: 'player' }, SAY('a', 'Mi tieni il posto? Torno subito.', 'Mi guardi la borsa un attimo? Dentro c\'è un gallo, non gli dar retta.'), { wait: 2 },
      { go: 'a', to: 'away', sp: 2.2, d: 2, t: 8, soft: true }, SAY('a', 'Se chiede di me, sono morto.', 'Se arriva mia moglie, io sono te!'), { wait: 2 }] },
  ];
  // si aggiungono al catalogo di eventi.js (che le prova come le altre, test_eventi.js)
  { const E = EV(); if (E && E.SCENE) SCENE.forEach(D => { if (!E.SCENE.some(s => s.id === D.id)) E.SCENE.push(D); }); }

  return { CFG, MATTI, FRAM, SCENE, S, scheda, linea, choose, step };
})();
if (typeof module !== 'undefined') module.exports = Matti;
