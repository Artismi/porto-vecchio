/* Porto Vecchio — Le Azioni (solo logica, nessuna grafica).
   Un catalogo unico di VERBI che chiunque (abitanti, cast, e in parte il giocatore) può fare ovunque abbiano senso, se lo vuole.
   Ogni verbo ha più MODI (uccidere: sparare, coltello, mani nude, investire; trasportare: a mano, in due o tre, carriola, auto…);
   ogni modo dichiara cosa serve (un oggetto IN MANO, le mani libere, un posto adatto, un bersaglio, la forza, i soldi) e il
   PIANIFICATORE (intend) costruisce da solo i passi che mancano: procurarsi l'oggetto (da casa, comprandolo, prendendolo),
   impugnarlo, andare, fare. Ogni passo viene VERIFICATO quando tocca a lui: se non si può più, il piano si ferma.
   Sopra: gli imprevisti e le reazioni, la morte (il corpo resta, all'ambulatorio arriva qualcuno di nuovo), le relazioni tra
   persone (simpatia e paura, mosse da ogni gesto), il tempo di scena (l'orologio rallenta quando succede qualcosa vicino al
   giocatore). Il modello linguistico, quando ci sarà, potrà proporre qualsiasi verbo: Azioni.can() e Azioni.intend() lo verificano.
   Si aggancia a Game.HOOKS dopo la Risacca e il Popolo. Richiede popolo.js. */
var Azioni = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const I = Po._, PLACES = G.PLACES, MPS = G.MIN_PER_SEC;
  const { note, feel, target, tkey, clamp, dist, o, cap, pick } = I;
  const rnd = Math.random;

  const CFG = {
    birth: [60, 240],      // minuti tra una morte e l'arrivo di una persona nuova all'ambulatorio
    sight: 13,             // a che distanza si nota un imprevisto (m)
    hear: 38,              // a che distanza si sentono gli spari (m)
    socialEvery: 15,       // minuti di gioco tra due giri di incontri nei posti
    maxDrivers: 10,
    sceneK: .3,            // il tempo di scena: l'orologio va a questa velocità quando succede qualcosa vicino al giocatore
    sceneR: 45,
  };

  // ================= FATTI DEL MONDO =================
  const SOFT = ['pineta', 'macchia', 'sugheri', 'radura', 'vigne', 'oliveto', 'discarica', 'sangiacomo', 'spiaggia', 'caletta', 'sentiero', 'monte', 'lago'];
  const HIDDEN = ['pineta', 'macchia', 'sugheri', 'radura', 'discarica', 'sentiero', 'lago', 'caletta', 'cava'];
  const WATER = ['molo', 'pontile', 'caletta', 'punta', 'marina'];           // da dove si butta qualcosa in mare
  const BINS = ['discarica', 'calata', 'vico', 'caruggio'];                  // cassonetti
  const BURN = ['discarica', 'cava'];                                       // dove si può bruciare qualcosa senza che lo veda tutta l'isola
  const WALLS = ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza', 'lungomare', 'salita', 'passeggiata', 'fontana', 'molo'];
  const PHONES = ['piazza', 'bar', 'wu', 'molo', 'sirena', 'lungomare', 'calata', 'benzina', 'osteria', 'flipper', 'piazzetta', 'fontana'];
  const has = id => !!PLACES[id];
  const tgtOf = id => (typeof id === 'object' ? id : id && id.startsWith && id.startsWith('use:') ? (useT(id.slice(4))[0] || null) : has(id) ? target(id) : null);
  function useT(use) { return G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.use === use && b.door).map(([, bi]) => I.tB(bi)).filter(Boolean); }
  function nearest(list, x, y) { let b = null, bd = 1e9; list.forEach(id => { const ts = typeof id === 'string' && id.startsWith('use:') ? useT(id.slice(4)) : [tgtOf(id)]; ts.forEach(t => { if (t) { const d = dist(t.x, t.y, x, y); if (d < bd) { bd = d; b = t; } } }); }); return b; }
  const placeName = (x, y) => G.nearestPlace(x, y).name;
  const isNightT = t => { const h = Math.floor(t / 60) % 24; return h >= 21 || h < 6; };
  const spotNear = t => (t && t.k === 'p' && PLACES[t.pid] ? { x: PLACES[t.pid].x + (rnd() - .5) * 6, y: PLACES[t.pid].y + (rnd() - .5) * 6, label: t.label } : t);
  const alive = n => !!n && !n.dead;
  const busyLaw = (st, n) => n.jailedUntil > st.t;
  const nameOf = (st, id) => G.nameOf(st, id);

  // ================= OGGETTI =================
  // si usano solo IN MANO: prima si procurano, poi si impugnano. buy: dove si compra e quanto; take: dove si può prendere (o rubare)
  const ITEMS = {
    coltello:   { name: 'coltello', weapon: 'coltello', buy: { 'use:ferramenta': 4 }, take: ['osteria', 'car_2', 'osteria_sg'], kill: .75 },
    pistola:    { name: 'pistola', weapon: 'pistola', ammo: 15, buy: { magazzino: 60, pontile: 45 }, gun: true, kill: .85 },
    lupara:     { name: 'lupara', weapon: 'lupara', ammo: 6, buy: { magazzino: 50 }, take: ['masseria', 'ovile'], gun: true, kill: .9 },
    mitra:      { name: 'mitra', weapon: 'mitra', ammo: 30, buy: { pontile: 120 }, gun: true, kill: .95 },
    pala:       { name: 'pala', buy: { 'use:ferramenta': 6 }, take: ['cantiere', 'masseria', 'officina', 'discarica', 'vigne', 'oliveto', 'cava', 'sangiacomo'] },
    carriola:   { name: 'carriola', two: true, cap: 130, buy: { 'use:ferramenta': 15 }, take: ['cantiere', 'masseria', 'discarica', 'vigne'] },
    piede:      { name: 'piede di porco', buy: { 'use:ferramenta': 4, officina: 4 }, take: ['cantiere', 'officina'] },
    bomboletta: { name: 'bomboletta', buy: { officina: 3, 'use:ferramenta': 3 } },
    pennarello: { name: 'pennarello da tag', buy: { 'use:ferramenta': 2, 'use:tabacchi': 2 } },   // [writer]
    pennello:   { name: 'pennello e vernice', buy: { 'use:ferramenta': 5 } },
    gesso:      { name: 'gesso', buy: { wu: 1, 'use:tabacchi': 1 } },
    telefono:   { name: 'cellulare', buy: { video: 30 } },
    fotocamera: { name: 'macchina fotografica', buy: { video: 25 } },
    benzina:    { name: 'tanica di benzina', buy: { benzina: 4 } },
    carte:      { name: 'mazzo di carte', buy: { 'use:tabacchi': 2, wu: 2 } },
    roba:       { name: 'roba', buy: { flipper: 8 }, stuff: true },
    refurtiva:  { name: 'refurtiva', stuff: true },
    // [economia] la roba della casa: quasi tutta la porta la nave e la vende l'Emporio
    corda:      { name: 'corda', buy: { 'use:emporio': 3, 'use:ferramenta': 2 }, take: ['molo', 'pontile', 'cantiere'], stuff: true },
    sacchi:     { name: 'sacchi neri', buy: { 'use:emporio': 2, 'use:ferramenta': 1 }, take: ['discarica', 'cantiere'], stuff: true },
    spugne:     { name: 'spugne', buy: { 'use:emporio': 2, 'use:farmacia': 1 }, stuff: true },
    sapone:     { name: 'sapone', buy: { 'use:emporio': 2, 'use:farmacia': 1 }, stuff: true },
    colla:      { name: 'colla', buy: { 'use:emporio': 3, 'use:ferramenta': 2 }, stuff: true },
    chiodi:     { name: 'chiodi', buy: { 'use:ferramenta': 1, 'use:fabbro': 1 }, take: ['cantiere'], stuff: true },
    carta:      { name: 'carta', buy: { 'use:emporio': 2, 'use:tabacchi': 1 }, stuff: true },
    inchiostro: { name: 'inchiostro', buy: { 'use:emporio': 4, 'use:tabacchi': 3 }, stuff: true },
    poster:     { name: 'manifesti clandestini', stuff: true },
    libretto:   { name: 'libretti clandestini', stuff: true },
  };
  let ECO = null;   // [economia] scorte e prezzi delle botteghe (economia.js)
  const setEconomy = e => { ECO = e; };
  Object.entries(ITEMS).forEach(([k, v]) => { v.id = k; });
  // chi ha cosa all'inizio: in tasca (inv) e a casa (casa)
  const SHOVEL_JOBS = /braccian|vignaiol|cavator|carpent|salinar|sagrest|custode|muratore|scaricator/;
  function initInv(st, n) {
    const P = n.pop; if (!P || P.inv) return;
    P.inv = {}; P.casa = { coltello: 1 }; P.ammo = {}; P.rapp = P.rapp || {}; P.friends = P.friends || []; P.enemies = P.enemies || [];
    const job = (P.job && (P.job.base || P.job.title)) || '';
    if (SHOVEL_JOBS.test(job)) P.casa.pala = 1;
    if (/braccian|vignaiol|carpent|muratore/.test(job) || (P.homeT && P.homeT.k === 'b' && G.BUILDINGS[P.homeT.bi] && G.BUILDINGS[P.homeT.bi].farm)) { P.casa.carriola = 1; if (rnd() < .4) P.casa.lupara = 1; }
    if (P.owns && P.owns.fotocamera) P.casa.fotocamera = 1;
    if (P.owns && P.owns.colori) P.casa.bomboletta = 1;
    if (P.owns && P.owns.pala) P.casa.pala = 1;
    if (n.weapon) { P.inv[n.weapon] = 1; P.ammo[n.weapon] = (ITEMS[n.weapon] && ITEMS[n.weapon].ammo) || 10; }
    if (P.giro === 'trafficante' || P.giro === 'spacciatore') { if (rnd() < .6) P.casa.pistola = 1; P.ammo.pistola = 15; }
    if (P.giro === 'ladro' || P.giro === 'ricettatore') P.casa.piede = 1;
    if (P.giro === 'spacciatore') P.inv.roba = 6;
    if (n.ris && n.ris.member) P.inv.telefono = 1;
    if (rnd() < .3) P.casa.carte = 1;
    if (P.vice === 'roba' && rnd() < .5) P.inv.roba = 1;
  }
  const hasIn = (n, k) => !!(n.pop && n.pop.inv && n.pop.inv[k] > 0);
  const hasHome = (n, k) => !!(n.pop && n.pop.casa && n.pop.casa[k] > 0);
  const inHand = (n, k) => n.hand === k;
  function give(n, k, q) { const P = n.pop; P.inv[k] = (P.inv[k] || 0) + (q || 1); if (ITEMS[k] && ITEMS[k].ammo && !P.ammo[k]) P.ammo[k] = ITEMS[k].ammo; }
  function takeAway(n, k, q) { const P = n.pop; P.inv[k] = Math.max(0, (P.inv[k] || 0) - (q || 1)); if (!P.inv[k]) { delete P.inv[k]; if (n.hand === k) n.hand = null; } }
  function equip(st, n, k) { if (!hasIn(n, k)) return false; n.hand = k; if (ITEMS[k] && ITEMS[k].weapon && ITEMS[k].gun) n.pop.ammo[k] = n.pop.ammo[k] || ITEMS[k].ammo; return true; }
  function unequip(n) { n.hand = null; }
  // dove procurarsi un oggetto: a casa, comprandolo, prendendolo (o rubandolo) dove si trova, raccogliendolo da terra
  function sourcesOf(st, n, k) {
    const P = n.pop, It = ITEMS[k], out = [];
    if (hasHome(n, k)) out.push({ how: 'casa', t: P.homeT, cost: 0, score: 1 });
    if (It.buy) Object.entries(It.buy).forEach(([where, price]) => { const ts = where.startsWith('use:') ? useT(where.slice(4)).sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y)) : [tgtOf(where)]; const t = ts.find(t => t && (!ECO || ECO.has(st, t, k))); if (!t) return; const pr = ECO ? ECO.price(st, t, k, price) : price; if (P.money >= pr) out.push({ how: 'compra', t, cost: pr, score: .8 - pr / 200 }); });
    if (It.take) It.take.forEach(where => { const t = tgtOf(where); if (t && n.tr.legge < .75) out.push({ how: 'prende', t, cost: 0, score: .6 - n.tr.legge * .4 }); });
    if (It.weapon) st.pickups.forEach(pk => { if (pk.kind === It.weapon && !pk.takenAt) out.push({ how: 'raccoglie', t: { x: pk.x, y: pk.y, label: placeName(pk.x, pk.y), k: null }, pk, cost: 0, score: .7 }); });
    out.forEach(s => { s.score -= dist(n.x, n.y, s.t.x, s.t.y) / 500; });
    return out.sort((a, b) => b.score - a.score);
  }

  // ================= RELAZIONI =================
  // a: simpatia (−1…1), f: paura (0…1). Si muovono con ogni gesto; amici e nemici ne seguono.
  function rel(st, n, k) {
    const P = n.pop; if (!P) return { a: 0, f: 0 };
    P.rapp = P.rapp || {};
    if (!P.rapp[k.id]) { const c = k.pop ? I.closeness(st, n, k) : .25; P.rapp[k.id] = { a: c > .8 ? .8 : c > .6 ? .5 : P.enemies && P.enemies.includes(k.id) ? -.6 : 0, f: 0 }; }
    return P.rapp[k.id];
  }
  function moveRel(st, n, k, da, df) {
    if (!n.pop || !k || k === 'player') return;
    const R = rel(st, n, k), P = n.pop; P.friends = P.friends || []; P.enemies = P.enemies || [];
    R.a = clamp(R.a + (da || 0), -1, 1); R.f = clamp(R.f + (df || 0), 0, 1);
    if (R.a > .5 && !P.friends.includes(k.id)) P.friends.push(k.id);
    if (R.a < .1 && P.friends.includes(k.id)) P.friends = P.friends.filter(x => x !== k.id);
    if (R.a < -.45 && !P.enemies.includes(k.id)) P.enemies.push(k.id);
    if (R.a > -.2 && P.enemies.includes(k.id)) P.enemies = P.enemies.filter(x => x !== k.id);
  }

  // ================= FORZA, CARICHI, MEZZI =================
  // un carico (per ora: un corpo; domani una cassa, un mobile, un ferito) ha un peso. Lo si porta a mano se si ha la forza,
  // in due o in tre, con la carriola, o in un mezzo con abbastanza posto.
  function strength(n) {
    if (n === 'player') return 1.1;
    const P = n.pop, age = P ? P.age : 35, b = (n.look && n.look.build) || 1;
    const a = age < 16 ? .3 : age < 55 ? 1 : age < 65 ? .75 : age < 75 ? .5 : .3;
    return a * b * clamp(n.hp / (n.maxHp || 60), .2, 1);
  }
  const KG = 55;   // quanto solleva una persona di forza 1
  const VCAP = { vespa: 0, cinquecento: 70, ritmo: 90, giulia: 100, ape: 200, polizia: 0, furgone: 400, fuoristrada: 150, camion: 800, campagnola: 0, blindato: 0, rx7: 70, gtr: 70, bursley: 120 };
  const vCap = v => VCAP[v.kind] || 0;
  function vehicleFor(st, n, weight, maxD) {
    let best = null, bd = maxD || 160;
    st.vehicles.forEach(v => {
      if (v.hidden || v.wreck || v.traffic || v.military || v.police || (v.rider && v.rider !== 'npc:' + n.id) || vCap(v) < weight) return;
      const mine = v.owner === n.id, friend = v.owner && n.pop.friends.includes(v.owner);
      if (!mine && !friend && n.tr.legge > .45) return;
      const d = dist(n.x, n.y, v.x, v.y) * (mine ? .6 : friend ? .8 : 1);
      if (d < bd) { bd = d; best = v; }
    });
    return best;
  }
  const corpses = st => st.npcs.filter(c => c.corpse && !c.corpse.gone && !c.corpse.buried);
  // il carico segue chi lo porta (o sta nel mezzo)
  function followLoads(st) {
    st.npcs.forEach(c => {
      const L = c.corpse; if (!L || L.gone || L.buried) return;
      if (L.vehicle) { const v = st.vehicles.find(x => x.id === L.vehicle); if (v) { c.x = v.x; c.y = v.y; c.inside = true; } return; }
      if (!L.leader) return;
      const k = L.leader === 'player' ? st.player : G.byId(st, L.leader); if (!k) { L.leader = null; return; }
      const a = (k.face || 0) + Math.PI, back = L.mode === 'carriola' ? -.9 : .7;
      c.x = k.x + Math.cos(a) * back; c.y = k.y + Math.sin(a) * back; c.face = k.face; c.inside = L.leader !== 'player' && k.inside && !(k.pop && k.pop.near);
    });
  }
  function pickUp(st, n, c, mode) { const L = c.corpse; L.leader = n === 'player' ? 'player' : n.id; L.mode = mode; L.carriers = [L.leader]; if (n !== 'player') n.pop.carrying = c.id; c.inside = false; }
  function putDown(st, n, c) { const L = c.corpse; if (!L) return; L.leader = null; L.mode = null; L.carriers = []; L.vehicle = null; c.inside = false; L.place = placeName(c.x, c.y); L.seen = {}; if (n && n !== 'player' && n.pop) n.pop.carrying = null; }

  // ================= PIANI: il motore che esegue i passi =================
  // passo: { label, at(st,n,E) → bersaglio | null, must, dur (minuti di gioco a velocità normale), act(st,n,E) → 'next'|'stop'|'wait'|'replan',
  //          tick(st,n,E,dt), run, carry, outside, inside, drive: { veh(st,n,E) → mezzo, to(st,n,E) → bersaglio } }
  function startPlan(st, n, kind, label, steps, prio, extra) {
    const P = n.pop; if (!P || !alive(n) || !steps) return null;
    if (P.emer && (P.emer.prio || 0) > (prio || 1)) return null;
    if (P.emer) endPlan(st, n, 'interrotto');
    P.emer = Object.assign({ kind, label, steps, i: 0, phase: 'go', t0: st.t, c0: st.clock, started: st.t, prio: prio || 1, goal: null, arr: 0 }, extra || {});
    st.pop.stats.piani = (st.pop.stats.piani || 0) + 1;
    return P.emer;
  }
  function endPlan(st, n, why) {
    const P = n.pop, E = P && P.emer; if (!E) return;
    P.lastEnd = why; P.lastEndStep = E.steps[E.i] ? E.steps[E.i].label : '';
    const c = P.carrying && G.byId(st, P.carrying); if (c && c.corpse && c.corpse.leader === n.id && !c.corpse.vehicle) putDown(st, n, c);
    if (n.inVeh) leaveVehicle(st, n);
    if (E.kind !== 'rissa' && E.kind !== 'spara') n.gesture = 0;
    n.hand = null;   // finito il piano, quello che si aveva in mano torna in tasca
    P.emer = null; n.path = []; P.curKey = ''; P.goalSet = false;
    if (n.action && n.action.name === 'imprevisto') n.action = { name: 'routine', scores: [], why: '', since: st.clock };
    if (E.onEnd) try { E.onEnd(st, n, why); } catch (e) { }
  }
  function leaveVehicle(st, n) { const v = st.vehicles.find(x => x.id === n.inVeh); if (v) { v.rider = null; delete v.__hp0; v.vx = v.vy = v.w = 0; n.x = v.x + Math.cos(v.ang + Math.PI / 2) * 1.6; n.y = v.y + Math.sin(v.ang + Math.PI / 2) * 1.6; if (!G.walkM(n.x, n.y)) { n.x = v.x; n.y = v.y; } } n.inVeh = null; n.inside = false; }
  function enterVehicle(st, n, v) { v.rider = 'npc:' + n.id; n.inVeh = v.id; n.inside = true; n.x = v.x; n.y = v.y; if (!v.owner) v.owner = n.id; }
  // da vicino, sotto gli occhi del giocatore, si cammina davvero e i gesti durano il tempo vero; più in là si arriva dopo il tempo di strada
  const watched = (st, n) => !!(n.pop && n.pop.near && dist(n.x, n.y, st.player.x, st.player.y) < CFG.sceneR);
  const elapsed = (st, n, E) => (watched(st, n) ? (st.clock - E.c0) * MPS : st.t - E.t0);
  function runPlan(st, n, dt) {
    const P = n.pop, E = P.emer;
    if (!alive(n) || busyLaw(st, n)) return endPlan(st, n, 'interrotto');
    if (st.t - E.started > 20 * 60) return endPlan(st, n, 'scaduto');
    const s = E.steps[E.i]; if (!s) return endPlan(st, n, 'fatto');
    if (E.phase === 'go') {
      if (s.drive) return driveStep(st, n, E, s, dt);
      const t = s.at ? s.at(st, n, E) : null;
      if (s.at && !t) { if (s.must) return endPlan(st, n, 'sparito'); return nextStep(st, n, E); }
      if (!t) { E.phase = 'do'; E.t0 = st.t; E.c0 = st.clock; return; }
      if (n.inVeh && !s.inVehicle) leaveVehicle(st, n);
      if (watched(st, n)) {
        if (n.inside) { const from = P.at || P.homeT; if (from) { n.x = from.x; n.y = from.y; } n.inside = false; }
        if (!E.goal || dist(E.goal.x, E.goal.y, t.x, t.y) > 1.5) { E.goal = { x: t.x, y: t.y }; G.goTo(n, t.x, t.y); }
        const sp = (s.run ? 3.4 : 1.6) * (s.carry ? (E.slow || .7) : 1);
        const arrived = G.stepAlong(n, sp, dt) || dist(n.x, n.y, t.x, t.y) < 1.3;
        if (arrived) { E.phase = 'do'; E.t0 = st.t; E.c0 = st.clock; E.goal = null; n.speedNow = 0; if (t.k) P.at = t; if (s.inside) n.inside = true; }
      } else {
        if (!E.arr) E.arr = st.t + 2 + dist(n.x, n.y, t.x, t.y) / (s.run ? 18 : 11) / (s.carry ? (E.slow || .7) : 1);
        if (st.t >= E.arr) { n.x = t.x; n.y = t.y; if (t.k) P.at = t; E.phase = 'do'; E.t0 = st.t; E.c0 = st.clock; E.arr = 0; n.inside = !s.outside; }
      }
      if (s.carry) watchCarrying(st, n);
      return;
    }
    if (P.near && !n.inside) n.speedNow = 0;
    if (s.tick) s.tick(st, n, E, dt);
    if (!P.emer || P.emer !== E) return;
    if (elapsed(st, n, E) < (s.dur || 0)) return;
    // la verifica: si può ancora fare?
    const res = s.act ? s.act(st, n, E) : 'next';
    if (res === 'wait') return;
    if (res === 'stop') return endPlan(st, n, 'fatto');
    nextStep(st, n, E);
  }
  function nextStep(st, n, E) { E.i++; E.phase = 'go'; E.goal = null; E.arr = 0; E.t0 = st.t; E.c0 = st.clock; if (E.i >= E.steps.length) endPlan(st, n, 'fatto'); }
  // guidare: raggiungere il mezzo, salirci, portarlo a destinazione (da vicino si vede muovere; da lontano si arriva dopo il tempo di strada)
  function driveStep(st, n, E, s, dt) {
    const P = n.pop, v = s.drive.veh(st, n, E);
    if (!v || v.wreck || v.hidden) return endPlan(st, n, 'senza mezzo');
    const to = s.drive.to(st, n, E); if (!to) return nextStep(st, n, E);
    if (n.inVeh !== v.id) {
      if (v.rider && v.rider !== 'npc:' + n.id) return endPlan(st, n, 'mezzo occupato');
      if (dist(n.x, n.y, v.x, v.y) > 2.2) {
        if (watched(st, n)) { if (n.inside) n.inside = false; if (!E.goal) { E.goal = { x: v.x, y: v.y }; G.goTo(n, v.x, v.y); } if (G.stepAlong(n, 1.8, dt) || dist(n.x, n.y, v.x, v.y) < 2.2) E.goal = null; else return; }
        else { if (!E.arr) E.arr = st.t + 2 + dist(n.x, n.y, v.x, v.y) / 11; if (st.t < E.arr) return; E.arr = 0; }
      }
      enterVehicle(st, n, v); E.goal = null;
      if (v.owner !== n.id && !E.stoleNoted) { E.stoleNoted = true; if (!n.pop.friends.includes(v.owner)) { note(st, n, `preso ${G.vehicleName ? G.vehicleName(st, v) : 'un\'auto'} non sua`, 'shady', { w: .5, tag: 'furto' }); emit(st, 'furto_auto', n, v.owner || null, v.x, v.y, placeName(v.x, v.y)); } }
    }
    if (watched(st, n)) {
      if (v.__hp0 === undefined) v.__hp0 = v.hp; v.hp = Math.max(v.hp, v.__hp0);   // [vivi] il mezzo guidato così segue la strada: gli urti finti contro i bordi non lo rompono
      if (!v.dpath || !v.dgoal || dist(v.dgoal.x, v.dgoal.y, to.x, to.y) > 3) { v.dgoal = { x: to.x, y: to.y }; v.dpath = G.findPath(v.x, v.y, to.x, to.y, .5) || []; }   // [vivi] per le strade, non per i marciapiedi
      const w = v.dpath[0];
      if (w) { const dx = w.x - v.x, dy = w.y - v.y, d = Math.hypot(dx, dy), sp = (v.kind === 'vespa' ? 9 : 11) * dt;   /* [vivi] in città sui 35-40 km/h */ if (d <= sp) { v.x = w.x; v.y = w.y; v.dpath.shift(); } else { v.x += dx / d * sp; v.y += dy / d * sp; v.ang = Math.atan2(dy, dx); } }
      v.vx = v.vy = v.w = 0; v.speed = v.kind === 'vespa' ? 9 : 11; n.x = v.x; n.y = v.y;
      if (!v.dpath.length || dist(v.x, v.y, to.x, to.y) < 3) { v.speed = 0; v.dpath = null; E.phase = 'do'; E.t0 = st.t; E.c0 = st.clock; }
    } else {
      if (!E.arr) E.arr = st.t + 2 + dist(v.x, v.y, to.x, to.y) / 150;
      if (st.t >= E.arr) { v.x = to.x; v.y = to.y; n.x = to.x; n.y = to.y; v.vx = v.vy = v.w = 0; E.arr = 0; E.phase = 'do'; E.t0 = st.t; E.c0 = st.clock; }
    }
  }

  // ================= PASSI PRIMITIVI =================
  const S = {
    go: (label, at, opt) => Object.assign({ label, at: typeof at === 'function' ? at : () => at, dur: 0, outside: true }, opt || {}),
    do: (label, dur, act, opt) => Object.assign({ label, dur, act }, opt || {}),
    home: (label, opt) => Object.assign({ label: label || 'torna a casa', at: (st, n) => n.pop.homeT, dur: 5, inside: true, outside: false }, opt || {}),
    equip: k => ({ label: `impugna ${ITEMS[k] ? ITEMS[k].name : k}`, dur: .6, act: (st, n) => (equip(st, n, k) ? 'next' : 'stop') }),
    free: () => ({ label: 'si libera le mani', dur: .3, act: (st, n) => { unequip(n); return 'next'; } }),
    drive: (label, veh, to, opt) => Object.assign({ label, drive: { veh, to }, dur: 1 }, opt || {}),
  };
  // procurarsi un oggetto e impugnarlo: il pezzo di piano che manca, se manca. null se non c'è modo.
  function getItem(st, n, k, noEquip) {
    const It = ITEMS[k]; if (!It) return null;
    const eq = noEquip || It.stuff ? [] : [S.equip(k)];
    if (inHand(n, k)) return [];
    if (hasIn(n, k)) return eq;
    const src = sourcesOf(st, n, k)[0]; if (!src) return null;
    const verb = { casa: `passa a casa a prendere ${It.name}`, compra: `va a comprare ${It.name} a ${src.t.label}`, prende: `va a prendere ${It.name} a ${src.t.label}`, raccoglie: `raccoglie ${It.name} da terra` }[src.how];
    return [S.go(verb, src.t, { dur: src.how === 'compra' ? 4 : 2, outside: src.how === 'raccoglie' || (src.t.k === 'p'), inside: src.how === 'casa',
      act: (st, n) => {
        const P = n.pop;
        if (src.how === 'casa') { if (!hasHome(n, k)) return 'stop'; P.casa[k]--; give(n, k); }
        else if (src.how === 'compra') { if (P.money < src.cost) return 'stop'; if (ECO) { if (!ECO.buy(st, n, src.t, k)) return 'stop'; } else P.money -= src.cost; give(n, k); if (It.gun) note(st, n, `comprato ${It.name} sottobanco a ${src.t.label}`, 'shady', { w: .6, tag: 'segreto' }); }
        else if (src.how === 'prende') { give(n, k); if (k !== 'pala' && k !== 'carriola') note(st, n, `preso ${It.name} a ${src.t.label} senza chiedere`, 'shady', { w: .3 }); }
        else if (src.how === 'raccoglie') { if (src.pk.takenAt) return 'stop'; src.pk.takenAt = st.clock; give(n, k); }
        return 'next';
      } })].concat(eq);
  }
  // chiamare gente fidata per una cosa che da soli non si fa: arrivano (se rispondono) e restano finché non è finita
  // chiamare gente fidata per una cosa che da soli non si fa: per telefono se si può, altrimenti andandoli a prendere di persona
  function helperPlan(st, k, n, why, where) {
    return startPlan(st, k, 'aiuta', `aiutare ${n.first}`, [
      S.go(`corre da ${n.first}${where.label ? ' a ' + where.label : ''}`, () => (n.pop.emer ? { x: n.x + .9, y: n.y + .7, label: where.label } : null), { run: true, must: true, dur: 1, act: (st, k) => { note(st, k, `aiutato ${n.first}: ${why}`, 'shady', { w: .9, who: n.id, tag: 'segreto' }); moveRel(st, k, n, .1); return 'next'; } }),
      S.do(`resta con ${n.first}`, 0, (st, k) => (n.pop.emer && !n.pop.emer.doneHelp ? 'wait' : 'next'), { tick: (st, k) => { if (n.pop.near) { k.x = n.x + .8; k.y = n.y + .6; k.inside = n.inside; } else { k.x = n.x; k.y = n.y; } } }),
      S.home('torna a casa senza dire niente'),
    ], 3);
  }
  function recruit(st, n, need, why, where, E) {
    const P = n.pop;
    const cands = (P.friends || []).map(id => G.byId(st, id)).filter(k => alive(k) && k.pop && !k.pop.emer && !busyLaw(st, k) && !I.isPassive(st, k) && k.tr.legge < .6 && rel(st, k, n).a > .3)
      .sort((a, b) => strength(b) - strength(a) - (dist(n.x, n.y, b.x, b.y) - dist(n.x, n.y, a.x, a.y)) / 300).slice(0, need);
    const got = [], visit = [];
    cands.forEach(k => {
      if (message(st, n, k, `Vieni subito${where.label ? ' a ' + where.label : ''}. Non fare domande.`) || dist(n.x, n.y, k.x, k.y) < 30) { got.push(k.id); helperPlan(st, k, n, why, where); }
      else visit.push(k);
    });
    // chi non risponde al telefono lo si va a prendere
    if (E && visit.length) {
      const extra = visit.map(k => S.go(`va a chiamare ${k.first} di persona`, () => (alive(k) ? whereOf(st, k) : null), { dur: 3, act: (st, n2, E2) => { if (k.pop.emer || busyLaw(st, k)) return 'next'; E2.crew = (E2.crew || []).concat([k.id]); helperPlan(st, k, n, why, where); return 'next'; } }));
      E.steps.splice(E.i + 1, 0, ...extra);
    }
    return got.concat(visit.map(k => k.id));
  }
  // il gruppo è arrivato? quanta forza c'è in tutto?
  function crewHere(st, n, E) { return (E.crew || []).map(id => G.byId(st, id)).filter(k => k && k.pop && k.pop.emer && k.pop.emer.kind === 'aiuta' && k.pop.emer.i >= 1); }
  function crewStrength(st, n, E) { return strength(n) + crewHere(st, n, E).reduce((s, k) => s + strength(k), 0); }

  // ================= I MODI =================
  // uccidere: con cosa. Ogni modo: se è possibile per questa persona adesso, quanto le somiglia, e i passi per prepararsi.
  function killModes(st, n, victim) {
    const out = [], t = n.tr;
    ['pistola', 'lupara', 'mitra'].forEach(g => { if (hasIn(n, g) || hasHome(n, g) || (t.legge < .3 && sourcesOf(st, n, g).length)) out.push({ mode: 'spara', item: g, score: (1 - t.legge) * .6 + t.cor * .3 + (hasIn(n, g) ? .4 : hasHome(n, g) ? .2 : 0) }); });
    out.push({ mode: 'coltello', item: 'coltello', score: .45 + (1 - t.legge) * .2 });
    if (strength(n) > strength(victim) * 1.1) out.push({ mode: 'mani', score: .3 + t.cor * .25 });
    const v = vehicleFor(st, n, 0, 120); if (v && !victim.inside) out.push({ mode: 'investi', veh: v, score: .3 + (v.owner === n.id ? .2 : 0) });
    return out.sort((a, b) => b.score - a.score + (rnd() - .5) * .15);
  }
  // trasportare un carico: a mano, in più persone, con la carriola, in un mezzo
  function transportModes(st, n, c, dest) {
    const w = c.corpse.weight, solo = strength(n) * KG, d = dist(c.x, c.y, dest.x, dest.y), out = [];
    const v = vehicleFor(st, n, w);
    if (v) out.push({ mode: 'auto', veh: v, score: .6 + (d > 80 ? .4 : 0) + (v.owner === n.id ? .15 : 0) });
    if ((hasIn(n, 'carriola') || hasHome(n, 'carriola') || sourcesOf(st, n, 'carriola').length) && solo * 2.4 >= w) out.push({ mode: 'carriola', score: .5 + (d > 40 ? .1 : 0) });
    if (solo >= w * .6) out.push({ mode: solo >= w ? 'spalla' : 'trascina', score: .45 + (solo >= w ? .2 : 0) - d / 400 });
    const fr = (n.pop.friends || []).map(id => G.byId(st, id)).filter(k => alive(k) && k.pop && k.tr.legge < .6 && !k.pop.emer);
    if (fr.length) out.push({ mode: 'insieme', need: Math.min(2, Math.max(1, Math.ceil((w * .8 - solo) / (KG * .8)))), score: .4 + (solo < w * .6 ? .3 : 0) });
    return out.sort((a, b) => b.score - a.score);
  }
  function transportSteps(st, n, c, dest, mode) {
    const L = () => c.corpse, here = () => (L().gone || L().buried || (L().leader && L().leader !== n.id) ? null : { x: c.x + .6, y: c.y, label: L().place });
    const m = mode || transportModes(st, n, c, dest)[0]; if (!m) return null;
    const lift = (how) => (st, n, E) => {
      if (!here()) return 'stop';
      const cap = crewStrength(st, n, E) * KG + (n.hand === 'carriola' ? ITEMS.carriola.cap : 0), w = L().weight;
      if (cap < w * .6) return E.crew && E.crew.length && st.t - E.t0 < 120 ? 'wait' : 'stop';
      pickUp(st, n, c, how === 'carriola' ? 'carriola' : cap >= w ? 'spalla' : 'trascina');
      E.slow = how === 'carriola' ? .75 : cap >= w * 1.3 ? .9 : cap >= w ? .75 : .45;
      note(st, n, how === 'carriola' ? `caricato ${L().name} sulla carriola` : E.crew && E.crew.length ? `sollevato ${L().name} insieme a ${crewHere(st, n, E).map(k => k.first).join(' e ') || 'qualcuno'}` : cap >= w ? `caricato ${L().name} in spalla` : `trascina ${L().name} a fatica`, 'shady', { w: .6, tag: 'segreto' });
      return 'next';
    };
    const drop = (st, n, E) => { const cc = n.pop.carrying && G.byId(st, n.pop.carrying); if (cc) putDown(st, n, cc); return 'next'; };
    const go = S.go(`porta ${L().name} verso ${dest.label || 'il posto'}`, () => (dest.k === 'p' ? spotNear(dest) : dest), { carry: true });
    if (m.mode === 'auto') {
      const v = m.veh;
      return [S.free(), S.drive(`va a prendere ${G.vehicleName ? G.vehicleName(st, v) : 'la macchina'}`, () => v, () => here()),
        S.do('carica il corpo nel bagagliaio', 3, (st, n, E) => { if (!here()) return 'stop'; const cap = crewStrength(st, n, E) * KG; if (cap < L().weight * .35) { if (!E.askedCrew) { E.askedCrew = true; E.crew = recruit(st, n, 1, 'caricare qualcosa di pesante in macchina', { label: L().place }, E); return E.crew.length ? 'wait' : 'stop'; } return st.t - E.t0 < 90 ? 'wait' : 'stop'; } if (cap < L().weight * .6 && !E.heaved) { E.heaved = true; E.t0 = st.t; E.c0 = st.clock; note(st, n, `ci mette un'eternità a issare ${L().name} nel bagagliaio`, 'shady', { w: .4 }); return 'wait'; } L().vehicle = v.id; L().leader = null; c.inside = true; n.pop.carrying = c.id; note(st, n, `caricato ${L().name} nel bagagliaio`, 'shady', { w: .7, tag: 'segreto' }); return 'next'; }, { inVehicle: true }),
        S.drive(`guida fino a ${dest.label || 'destinazione'}`, () => v, () => dest),
        S.do('tira fuori il corpo', 2, (st, n, E) => { L().vehicle = null; c.inside = false; c.x = v.x + 1.5; c.y = v.y; leaveVehicle(st, n); pickUp(st, n, c, 'trascina'); E.slow = .6; return 'next'; }),
      ];
    }
    if (m.mode === 'carriola') { const g = getItem(st, n, 'carriola'); if (!g) return null; return g.concat([S.go('va dove c\'è il corpo', here, { must: true }), S.do('carica il corpo sulla carriola', 2, lift('carriola')), go, S.do('scarica il corpo', 1, drop)]); }
    if (m.mode === 'insieme') return [S.free(), S.do('cerca qualcuno di fidato', 2, (st, n, E) => { E.crew = recruit(st, n, m.need, 'portare via qualcosa di pesante', { label: L().place }, E); return E.crew.length ? 'next' : 'stop'; }), S.go('torna dal corpo', here, { must: true }), S.do('aspetta gli altri, poi lo sollevano', 1, lift('mano')), go, S.do('lo posano', 1, drop)];
    return [S.free(), S.go('si china sul corpo', here, { must: true }), S.do('lo solleva', 1, lift('mano')), go, S.do('lo posa', 1, drop)];
  }
  // far sparire un corpo: dove e come, a seconda di chi lo fa, di cosa ha e di che ora è
  function disposeModes(st, n, c) {
    const night = isNightT(st.t), out = [], t = n.tr;
    const woods = nearest(HIDDEN.filter(id => SOFT.includes(id)), c.x, c.y), sea = nearest(WATER, c.x, c.y), bin = nearest(BINS, c.x, c.y), fire = nearest(BURN, c.x, c.y);
    const dd = x => (x ? dist(c.x, c.y, x.x, x.y) / 400 : 9);
    if (woods) out.push({ mode: 'seppellire', dest: woods, score: .6 + (hasIn(n, 'pala') || hasHome(n, 'pala') ? .2 : 0) - dd(woods) });
    if (sea) out.push({ mode: 'mare', dest: sea, score: .45 + (night ? .3 : -.3) + (P_likes(n, 'pesca') ? .1 : 0) - dd(sea) });
    if (fire) out.push({ mode: 'bruciare', dest: fire, score: .3 + (1 - t.legge) * .2 + (t.cor > .7 ? .1 : 0) - dd(fire) });
    if (bin) out.push({ mode: 'cassonetto', dest: bin, score: .3 + (strength(n) < .6 ? .2 : 0) + (n.pop.need.paura > .6 ? .1 : 0) - dd(bin) });
    if (n.pop.homeT && n.pop.homeT.k === 'b') out.push({ mode: 'cantina', dest: n.pop.homeT, score: .12 + n.pop.need.paura * .25 - dd(n.pop.homeT) });
    return out.map(o => Object.assign(o, { score: o.score + (rnd() - .5) * .2 })).sort((a, b) => b.score - a.score);
  }
  // lavare il sangue: con spugne e sapone viene via del tutto, con l'acqua della fontana resta l'alone
  function cleanSteps(st, n, stain) {
    const kit = ['spugne', 'sapone'].map(k => (hasIn(n, k) ? [] : getItem(st, n, k, true))), ok = kit.every(Boolean);
    return [].concat(ok ? kit[0].concat(kit[1]) : [], [S.go(`torna a ${stain.place} a lavare il sangue`, { x: stain.x, y: stain.y, label: stain.place, k: null }, { dur: 1 }),
      S.do(ok ? 'strofina il sangue con spugne e sapone' : 'butta acqua sul sangue e strofina con le mani', ok ? 20 : 30, (st, n) => {
        if (ok) { takeAway(n, 'spugne'); takeAway(n, 'sapone'); }
        stain.clean = ok ? 1 : .5; st.fx = st.fx.filter(f => !(f.k === 'bloodpool' && dist(f.x, f.y, stain.x, stain.y) < 1.5));
        note(st, n, `lavato il sangue a ${stain.place}${ok ? '' : ': resta un alone'}`, 'shady', { w: .7, tag: 'segreto' }); emitSeen(st, 'occultamento', n, null, n.x, n.y); return 'next';
      }, { tick: (st, n) => { n.gesture = (st.clock % 1) < .5 ? .3 : 0; } })]);
  }
  // il sangue non lavato: chi passa lo nota e se ne parla (un alone lo nota solo chi guarda bene)
  function stainsHour(st) {
    const L = st.pop.stains || []; if (!L.length) return;
    st.pop.stains = L.filter(x => st.t - x.t < 6 * 1440 && x.clean !== 1);
    st.pop.stains.forEach(x => {
      if (x.found || st.t - x.t < 60 || rnd() > (x.clean ? .05 : .3)) return;
      const k = st.npcs.find(k => alive(k) && k.pop && !k.pop.cast && dist(k.x, k.y, x.x, x.y) < 20 && k.id !== x.by);
      if (!k) return; x.found = k.id;
      note(st, k, `visto del sangue a terra a ${x.place}`, 'bad', { w: .5, place: x.place, tag: 'sangue' }); feel(k, 'paura', .15);
      G.addLog(st, `${G.clockStr(st.t)} · A ${x.place} c'è del sangue per terra: ${k.first} l'ha visto e ne parla.`, 'info');
      if (k.tr.legge > .6) { const v = G.byId(st, x.of); if (v && v.corpse && v.corpse.gone) note(st, k, `ha detto alla Guardia del sangue a ${x.place}`, 'info', { w: .3 }); }
    });
  }
  const P_likes = (n, k) => !!(n.pop && n.pop.intW && n.pop.intW[k]);
  function disposeSteps(st, n, c, mode) {
    const m = mode ? disposeModes(st, n, c).find(x => x.mode === mode) || disposeModes(st, n, c)[0] : disposeModes(st, n, c)[0]; if (!m) return null;
    const L = c.corpse, carry = transportSteps(st, n, c, m.dest); if (!carry) return null;
    const pre = [], fin = [];
    if (m.mode === 'seppellire') {
      const shovel = getItem(st, n, 'pala', true);
      if (shovel) pre.push(...shovel);
      fin.push(shovel ? S.equip('pala') : S.do('niente pala: scaverà a mani nude', 0, () => 'next'));
      fin.push(S.do(shovel ? 'scava una fossa' : 'scava a mani nude, piano', shovel ? 40 + 50 * (1 - Math.min(1, strength(n))) : 150, (st, n) => 'next', { tick: (st, n) => { n.gesture = (st.clock % 1.2) < .5 ? .4 : 0; } }));
      fin.push(S.do('seppellisce il corpo', 15, (st, n) => { if (L.gone) return 'stop'; bury(st, n, c, m.dest.label); return 'next'; }));
    } else if (m.mode === 'mare') {
      const rope = hasIn(n, 'corda') ? [] : getItem(st, n, 'corda', true); if (rope) pre.push(...rope);
      fin.push(S.do(rope ? 'lo lega con la corda a una pietra e lo butta in mare' : 'lo zavorra con una pietra e lo butta in mare', 8, (st, n) => { if (L.gone) return 'stop'; const tied = hasIn(n, 'corda'); if (tied) takeAway(n, 'corda'); vanish(st, n, c, 'mare', `buttato ${L.name} in mare da ${m.dest.label}, ${tied ? 'legato stretto a una pietra' : 'con una pietra legata ai piedi'}`); if (rnd() < (tied ? .08 : .4)) st.timers.push({ at: st.t + 1440 + rnd() * 2880, kind: 'azResurface', corpse: c.id }); return 'next'; }));
    } else if (m.mode === 'bruciare') {
      const fuel = getItem(st, n, 'benzina', true); if (!fuel) return disposeSteps(st, n, c, 'seppellire');
      pre.push(...fuel);
      fin.push(S.do('lo cosparge di benzina e gli dà fuoco', 25, (st, n) => { if (L.gone) return 'stop'; takeAway(n, 'benzina'); { const a = Math.atan2(n.y - c.y, n.x - c.x) || 0, nx = c.x + Math.cos(a) * 3.2, ny = c.y + Math.sin(a) * 3.2; if (G.walkM(nx, ny)) { n.x = nx; n.y = ny; } else { n.x = c.x + 3.2; } } st.fires.push({ x: c.x, y: c.y, r: 1.1, until: st.clock + 20, owner: n.id }); vanish(st, n, c, 'bruciato', `bruciato ${L.name} in ${m.dest.label}`); smoke(st, c.x, c.y, m.dest.label); return 'next'; }));
    } else if (m.mode === 'cassonetto') {
      const bags = hasIn(n, 'sacchi') ? [] : getItem(st, n, 'sacchi', true); if (bags) pre.push(...bags);
      fin.push(S.do(bags ? 'lo chiude nei sacchi neri e lo butta in un cassonetto' : 'lo butta in un cassonetto e lo copre di rifiuti', 5, (st, n) => { if (L.gone) return 'stop'; const wrapped = hasIn(n, 'sacchi'); if (wrapped) takeAway(n, 'sacchi'); vanish(st, n, c, 'cassonetto', `buttato ${L.name} in un cassonetto a ${m.dest.label}${wrapped ? ', chiuso nei sacchi' : ''}`); if (rnd() < (wrapped ? .3 : .6)) st.timers.push({ at: st.t + 600 + rnd() * 1440, kind: 'azResurface', corpse: c.id, where: 'discarica', by: 'netturbino' }); return 'next'; }));
    } else if (m.mode === 'cantina') {
      fin.push(S.do('lo nasconde in cantina, sotto dei sacchi', 10, (st, n) => { if (L.gone) return 'stop'; L.hiddenAt = n.pop.homeT.label; c.inside = true; L.hidden = true; L.leader = null; n.pop.carrying = null; note(st, n, `nascosto ${L.name} in cantina`, 'shady', { w: 1, tag: 'segreto' }); st.timers.push({ at: st.t + 2 * 1440 + rnd() * 1440, kind: 'azSmell', corpse: c.id, owner: n.id }); return 'next'; }, { inside: true }));
    }
    const stain = (st.pop.stains || []).find(x => x.of === c.id && !x.clean);
    if (stain && (n.tr.legge < .6 || n.pop.need.paura > .5)) fin.push(...cleanSteps(st, n, stain));
    fin.push(S.home('torna a casa a lavarsi', { act: (st, n) => { feel(n, 'igiene', -1); n.hand = null; return 'next'; } }));
    return pre.concat(carry, fin);
  }

  // ================= I VERBI =================
  // il catalogo che il motore (e domani il modello linguistico) usa per far agire chiunque. can → '' se si può, altrimenti il motivo.
  const near2 = (st, n, k) => dist(n.x, n.y, k.x, k.y);
  const whereOf = (st, k) => (k === 'player' ? st.player : k.pop && !k.pop.near && k.pop.at ? { x: k.pop.at.x, y: k.pop.at.y, label: k.pop.at.label } : { x: k.x, y: k.y, label: placeName(k.x, k.y) });
  const VERBS = {
    vai:        { desc: 'andare in un posto', args: 'dove', plan: (st, n, a) => { const t = tgtOf(a.dove); return t ? [S.go(`va a ${t.label}`, t)] : null; } },
    guida:      { desc: 'andare in un posto col proprio mezzo (lo parcheggia e scende)', args: 'dove', plan: (st, n, a) => { const t = tgtOf(a.dove), v = st.vehicles.find(x => x.owner === n.id && !x.hidden && !x.wreck && !x.traffic && !x.rider && dist(x.x, x.y, n.x, n.y) < 60); if (!t || !v) return null;   // [vivi]
      return [S.drive(`prende ${G.vehicleName ? G.vehicleName(st, v) : 'la macchina'} per andare a ${t.label}`, () => v, () => t), S.do('parcheggia e scende', .4, (st, n) => { leaveVehicle(st, n); return 'next'; })]; } },
    prendi:     { desc: 'procurarsi un oggetto (da casa, comprandolo, prendendolo dove si trova)', args: 'oggetto', can: (st, n, a) => (ITEMS[a.oggetto] ? '' : 'oggetto sconosciuto'), plan: (st, n, a) => getItem(st, n, a.oggetto) },
    impugna:    { desc: 'prendere in mano un oggetto che si ha in tasca', args: 'oggetto', can: (st, n, a) => (hasIn(n, a.oggetto) ? '' : 'non ce l\'ha'), plan: (st, n, a) => [S.equip(a.oggetto)] },
    riponi:     { desc: 'mettere via quello che si ha in mano', plan: () => [S.free()] },
    compra:     { desc: 'comprare un oggetto', args: 'oggetto', can: (st, n, a) => (ITEMS[a.oggetto] && ITEMS[a.oggetto].buy ? '' : 'non si vende'), plan: (st, n, a) => getItem(st, n, a.oggetto, true) },
    uccidi:     { desc: 'uccidere qualcuno (modo: spara, coltello, mani, investi)', args: 'chi, modo?', can: (st, n, a) => (alive(a.chi) ? '' : 'non c\'è'), plan: (st, n, a) => killSteps(st, n, a.chi, a.modo) },
    picchia:    { desc: 'fare a botte', args: 'chi', can: (st, n, a) => (alive(a.chi) || a.chi === 'player' ? '' : 'non c\'è'), plan: (st, n, a) => [S.free(), S.go(`va da ${a.chi === 'player' ? G.PLAYER_NAME : a.chi.first}`, () => whereOf(st, a.chi), { must: true }), fightStep(st, n, a.chi, { why: a.perche })] },
    minaccia:   { desc: 'minacciare qualcuno (con un\'arma se ce l\'ha)', args: 'chi', plan: (st, n, a) => [S.go(`va da ${a.chi.first}`, () => whereOf(st, a.chi), { must: true }), S.do(`minaccia ${a.chi.first}`, 2, (st, n) => { const gun = ['pistola', 'lupara', 'mitra', 'coltello'].find(k => hasIn(n, k)); if (gun) equip(st, n, gun); moveRel(st, a.chi, n, -.3, gun ? .5 : .25); feel(a.chi, 'paura', gun ? .4 : .2); note(st, a.chi, `${n.first} l'ha minacciat${o(a.chi)}${gun ? ' con ' + ITEMS[gun].name : ''}`, 'bad', { w: .7, who: n.id, tag: 'minaccia' }); say(st, n, ['Stai attento a come parli.', 'La prossima volta non finisce così.', 'Hai capito bene?']); return 'next'; })] },
    trasporta:  { desc: 'portare un carico (un corpo) da un posto a un altro (modo: spalla, trascina, insieme, carriola, auto)', args: 'cosa, dove, modo?', can: (st, n, a) => (a.cosa && a.cosa.corpse && !a.cosa.corpse.gone ? '' : 'non c\'è niente da portare'), plan: (st, n, a) => { const t = tgtOf(a.dove); if (!t) return null; const m = a.modo ? transportModes(st, n, a.cosa, t).find(x => x.mode === a.modo) : null; return transportSteps(st, n, a.cosa, t, m); } },
    sbarazzati: { desc: 'far sparire un corpo (modo: seppellire, mare, bruciare, cassonetto, cantina)', args: 'cosa, modo?', can: (st, n, a) => (a.cosa && a.cosa.corpse && !a.cosa.corpse.gone && !a.cosa.corpse.buried ? '' : 'non c\'è niente da far sparire'), plan: (st, n, a) => disposeSteps(st, n, a.cosa, a.modo) },
    scava:      { desc: 'scavare una buca (con la pala, o a mani nude)', args: 'dove', can: (st, n, a) => (SOFT.includes(a.dove) ? '' : 'lì la terra è dura'), plan: (st, n, a) => { const t = tgtOf(a.dove); const g = getItem(st, n, 'pala'); return t ? (g || []).concat([S.go(`va a ${t.label}`, spotNear(t)), S.do('scava una buca', g ? 40 : 150, () => 'next')]) : null; } },
    telefona:   { desc: 'telefonare (a: guardia, ambulanza o una persona)', args: 'a, testo', plan: (st, n, a) => phoneSteps(st, n, a.a, a.testo, a.corpo, a.imp) },
    pulisci:    { desc: 'lavare il sangue rimasto dove è morto qualcuno (spugne e sapone se ci sono)', args: 'chi?', can: (st, n, a) => ((st.pop.stains || []).some(x => !x.clean && (!a || !a.chi || x.of === a.chi.id)) ? '' : 'non c\'è sangue da lavare'), plan: (st, n, a) => { const x = (st.pop.stains || []).filter(x => !x.clean && (!a || !a.chi || x.of === a.chi.id)).sort((p, q) => dist(p.x, p.y, n.x, n.y) - dist(q.x, q.y, n.x, n.y))[0]; return x ? cleanSteps(st, n, x) : null; } },
    barrica:    { desc: 'inchiodare porta e finestre di casa (chiodi e assi)', plan: (st, n) => { const g = hasIn(n, 'chiodi') ? [] : getItem(st, n, 'chiodi', true); return g ? g.concat([S.home('torna a casa'), S.do('inchioda assi a porta e finestre', 40, (st, n) => { takeAway(n, 'chiodi'); n.pop.barricata = st.t + 3 * 1440; note(st, n, 'inchiodato porta e finestre di casa', 'bad', { w: .4 }); return 'next'; }, { inside: true, tick: (st, n) => { n.gesture = (st.clock % .6) < .2 ? .5 : 0; } })]) : null; } },
    attacca:    { desc: 'attaccare manifesti su un muro (servono manifesti e colla)', args: 'dove?', can: (st, n) => (hasIn(n, 'poster') ? '' : 'non ha manifesti'), plan: (st, n, a) => { const g = hasIn(n, 'colla') ? [] : getItem(st, n, 'colla', true); const t = tgtOf((a && a.dove) || pick(rnd, WALLS.filter(has))); return g && t ? g.concat([S.go(`va a ${t.label}`, spotNear(t)), S.do('spalma la colla e attacca i manifesti, guardandosi intorno', 12, (st, n) => { takeAway(n, 'colla'); const q = Math.min(4, n.pop.inv.poster || 0); takeAway(n, 'poster', q); const sk = typeof Economia !== 'undefined' && Economia.posterSketch ? Economia.posterSketch(st, n) : Object.assign(I.sketchFor(st, n), { kind: 'scritta' }); I.paintWall(st, n, { tgt: t }, sk); return 'next'; })]) : null; } },
    scrivi_muro:{ desc: 'scrivere o dipingere su un muro (modo: gesso, bomboletta, pennello, stencil, carbone)', args: 'dove?, modo?', plan: (st, n, a) => wallSteps(st, n, a.dove, a.modo) },
    fotografa:  { desc: 'scattare foto', args: 'dove', plan: (st, n, a) => { const g = getItem(st, n, 'fotocamera'); const t = tgtOf(a.dove || 'lungomare'); return g && t ? g.concat([S.go(`va a ${t.label}`, spotNear(t)), S.do('scatta qualche foto', 10, (st, n) => { feel(n, 'svago', -.3); emitSeen(st, 'foto', n, null, n.x, n.y); return 'next'; })]) : null; } },
    ruba:       { desc: 'rubare (modo: scippo, borseggio, taccheggio, scasso, auto)', args: 'modo, chi?|dove?', plan: (st, n, a) => stealSteps(st, n, a.modo, a) },
    vendi:      { desc: 'vendere quello che si ha (refurtiva al ricettatore, roba a chi la cerca)', args: 'oggetto', plan: (st, n, a) => sellSteps(st, n, a.oggetto) },
    spaccia:    { desc: 'spacciare la roba nei posti della notte', plan: (st, n) => (hasIn(n, 'roba') ? [S.go('va a spacciare', () => tgtOf(pick(rnd, ['flipper', 'disco', 'lungomare']))), S.do('vende la roba a chi passa', 60, (st, n) => { dealHere(st, n); return 'next'; })] : null) },
    mangia:     { desc: 'mangiare (modo: casa, fuori, panino, ruba)', args: 'modo?', plan: (st, n, a) => eatSteps(st, n, a.modo) },
    fruga:      { desc: 'frugare nelle tasche di un morto', args: 'cosa', plan: (st, n, a) => [S.go('si avvicina al corpo', () => (a.cosa.corpse.gone || a.cosa.corpse.leader ? null : { x: a.cosa.x + .6, y: a.cosa.y }), { must: true }), S.do('gli fruga nelle tasche', 3, (st, n) => { if (!a.cosa.corpse.robbed) { const g = 5 + Math.floor(rnd() * 30); n.pop.money += g; a.cosa.corpse.robbed = true; note(st, n, `preso ${g}.000 lire dalle tasche di un morto`, 'shady', { w: .7, tag: 'segreto' }); } return 'next'; }), S.home('se ne va in fretta', { run: true })] },
    scappa:     { desc: 'scappare (modo: piedi, auto, vespa)', args: 'modo?', plan: (st, n, a) => fleeSteps(st, n, a.modo) },
    nasconditi: { desc: 'nascondersi in un posto fuori mano', plan: (st, n) => { const t = nearest(HIDDEN, n.x, n.y); return t ? [S.go('va a nascondersi', spotNear(t), { run: true }), S.do('resta nascosto', 120, () => 'next')] : null; } },
    costituisciti: { desc: 'andare dalla Guardia a confessare', plan: (st, n) => [S.go('va al commissariato a costituirsi', () => tgtOf('commissariato'), { outside: false }), S.do('racconta tutto', 10, (st, n) => { I.arrestFar(st, n, 'si è costituito'); n.jailedUntil = st.t + 3 * 1440; return 'stop'; })] },
    soccorri:   { desc: 'portare un ferito all\'ambulatorio', args: 'chi', plan: (st, n, a) => [S.go(`corre da ${a.chi.first}`, () => whereOf(st, a.chi), { run: true, must: true }), S.do(`aiuta ${a.chi.first} ad alzarsi`, 3, (st, n) => { a.chi.stun = 0; heal(st, a.chi); moveRel(st, a.chi, n, .3); note(st, a.chi, `${n.first} l'ha soccors${o(a.chi)}`, 'good', { w: .6, who: n.id }); return 'next'; })] },
    // tra persone, nello stesso posto
    chiacchiera:{ desc: 'fare due chiacchiere', args: 'chi', social: true },
    sfotti:     { desc: 'prendere in giro', args: 'chi', social: true },
    apprezza:   { desc: 'fare un complimento, apprezzare', args: 'chi', social: true },
    offri:      { desc: 'offrire da bere', args: 'chi', social: true },
    regala:     { desc: 'regalare un oggetto', args: 'chi, oggetto', social: true },
    gioca:      { desc: 'giocare insieme (carte, flipper, pallone, dadi)', args: 'chi, gioco?', social: true },
    litiga:     { desc: 'litigare', args: 'chi', social: true },
  };
  Object.values(VERBS).forEach(V => { if (V.social) V.plan = (st, n, a) => [S.go(`va da ${a.chi.first}`, () => whereOf(st, a.chi), { must: true }), S.do(V.desc, 5, (st, n) => { social(st, n, a.chi, Object.keys(VERBS).find(k => VERBS[k] === V), a); return 'next'; })]; });
  // il punto d'ingresso: un'intenzione → un piano verificato
  function can(st, n, verb, a) { const V = VERBS[verb]; if (!V) return 'verbo sconosciuto'; if (!n.pop || !alive(n)) return 'non può'; if (busyLaw(st, n)) return 'è in cella'; return V.can ? V.can(st, n, a || {}) : ''; }
  function intend(st, n, verb, a, prio, label) {
    initInv(st, n);
    const why = can(st, n, verb, a); if (why) return { ok: false, why };
    const steps = VERBS[verb].plan(st, n, a || {}); if (!steps || !steps.length) return { ok: false, why: 'non ha modo di farlo' };
    const E = startPlan(st, n, verb, label || VERBS[verb].desc, steps, prio || 2);
    return E ? { ok: true, plan: E } : { ok: false, why: 'ha altro di più urgente' };
  }

  // ================= UCCIDERE, PICCHIARE, SPARARE =================
  function killSteps(st, n, victim, mode) {
    const modes = killModes(st, n, victim), m = (mode && modes.find(x => x.mode === mode)) || modes[0]; if (!m) return null;
    const pre = m.item ? getItem(st, n, m.item) : [S.free()]; if (!pre) return null;
    const how = { spara: `a colpi di ${ITEMS[m.item] ? ITEMS[m.item].name : 'pistola'}`, coltello: 'a coltellate', mani: 'a mani nude', investi: 'investito con l\'auto' }[m.mode];
    if (m.mode === 'investi') return [S.drive(`sale in macchina e va a cercare ${victim.first}`, () => m.veh, () => (alive(victim) ? whereOf(st, victim) : null)),
      S.do(`punta ${victim.first} con la macchina`, 1, (st, n) => { if (!alive(victim)) return 'stop'; if (rnd() < .6) kill(st, n, victim, how); else hurt(st, n, victim, 45, 'investit' + o(victim)); return 'next'; }, { inVehicle: true })];
    return pre.concat([S.go(`va a cercare ${victim.first}`, () => (alive(victim) && !busyLaw(st, victim) ? whereOf(st, victim) : null), { must: true }), fightStep(st, n, victim, { lethal: true, how, why: 'per ucciderl' + o(victim) })]);
  }
  function fightStep(st, n, foe, op) {
    return { label: `${op.lethal ? 'aggredisce' : 'si avventa su'} ${foe === 'player' ? G.PLAYER_NAME : foe.first}`, dur: 0, outside: true,
      act: () => 'wait', tick: (st, n, E, dt) => fightTick(st, n, foe, E, op, dt) };
  }
  const say = (st, n, lines, dur) => { if (n.pop && n.pop.near && !n.inside) G.say(st, n, Array.isArray(lines) ? pick(Math.random, lines) : lines, dur || 2.6); };
  function hurt(st, by, k, dmg, how) {
    if (k === 'player') { st.player.hp = Math.max(4, st.player.hp - dmg); st.player.hurtT = st.clock; return; }
    k.hp -= dmg; k.hitT = st.clock;
    if (k.hp <= 0) { k.hp = 6; k.stun = 4; }
    if (k.pop) { note(st, k, `${how || 'ferit' + o(k)} da ${by === 'player' ? G.PLAYER_NAME : by.first}`, 'bad', { w: .85, who: by === 'player' ? null : by.id, tag: 'ferito' }); feel(k, 'paura', .4); feel(k, 'rabbia', .3); if (by !== 'player') moveRel(st, k, by, -.6, .4); if (k.hp < k.maxHp * .45) intend(st, k, 'mangia', { modo: 'cura' }, 2); }
  }
  function heal(st, n) { n.hp = n.maxHp; }
  // da vicino: si vede (si avvicinano, pugni, coltellate, spari); da lontano si decide subito come va a finire
  function fightTick(st, n, foe, E, op, dt) {
    const p = st.player, fp = foe === 'player' ? p : foe;
    const done = why => { n.gesture = 0; if (why) note(st, n, why, 'bad', { w: .6, tag: 'rissa' }); E.doneHelp = true; return nextStep(st, n, E); };
    if (foe !== 'player' && (!alive(foe) || (foe.stun > 2.5 && !op.lethal))) return done(foe.dead ? '' : `lasciato a terra ${foe.first}`);
    if (!E.until) { E.until = st.clock + (op.lethal ? 70 : 25); E.startClock = st.clock; }
    if (st.clock > E.until || dist(n.x, n.y, fp.x, fp.y) > 26) return done(op.lethal ? `${foe === 'player' ? G.PLAYER_NAME : foe.first} gli è sfuggit${foe === 'player' ? 'o' : o(foe)}` : 'la rissa è finita');
    if (n.hp < n.maxHp * .35 && !op.lethal) { n.panic = 6; n.fleeFrom = { x: fp.x, y: fp.y }; return done('le ha prese ed è scappato'); }
    // lontano dal giocatore: si risolve subito
    if (!watched(st, n) && (foe === 'player' || !foe.pop || !watched(st, foe))) { if (foe !== 'player') resolveFar(st, n, foe, op); return done(''); }
    // chi si è chiuso dentro: si sfonda la porta (o lo si tira fuori)
    if (foe !== 'player' && foe.inside) {
      if (dist(n.x, n.y, fp.x, fp.y) < 2.6) { foe.inside = false; foe.stun = Math.max(foe.stun, .7); foe.x += (rnd() - .5); say(st, n, op.lethal ? ['Esci fuori!', 'Ti ho trovato.'] : ['Vieni fuori!']); }
      else { if (!E.goal || st.clock - (E.repath || 0) > .5) { E.repath = st.clock; E.goal = { x: fp.x, y: fp.y }; G.goTo(n, fp.x, fp.y); } G.stepAlong(n, 3, dt); return; }
    }
    const w = n.hand, W = w && G.WEAPONS[w], gun = !!(W && !W.melee && !W.throw);
    const d = dist(n.x, n.y, fp.x, fp.y), want = gun ? Math.min(8, W.range * .6) : 1.15;
    if (d > want) { if (!E.goal || st.clock - (E.repath || 0) > .5) { E.repath = st.clock; E.goal = { x: fp.x, y: fp.y }; G.goTo(n, fp.x, fp.y); } G.stepAlong(n, gun ? 2.4 : 2.8, dt); if (!(gun && d < W.range * .9)) return; }
    n.face = Math.atan2(fp.y - n.y, fp.x - n.x);
    if (st.clock < (E.nextHit || 0)) return;
    if (gun) {
      const P = n.pop; if (!(P.ammo[w] > 0)) { E.nextHit = st.clock + W.reload * 1.5; P.ammo[w] = ITEMS[w].ammo; return; }
      E.nextHit = st.clock + W.rate * (W.auto ? 1.2 : 2.6) + rnd() * .3; P.ammo[w]--;
      const wasAlive = alive(foe) && foe !== 'player';
      G.shoot(st, n, w, n.face, W.spread * .8 + .02, n.id);
      if (wasAlive && foe.dead && !foe.killedBy) { foe.killedBy = n.id; emit(st, 'omicidio', n, foe.id, foe.x, foe.y, placeName(foe.x, foe.y)); if (n.pop) note(st, n, `ha ucciso ${foe.first} ${op.how || 'sparando'}`, 'shady', { w: 1, who: foe.id, tag: 'omicidio' }); }
      gunfire(st, n);
      return;
    }
    E.nextHit = st.clock + (w === 'coltello' ? .8 : .7) + rnd() * .5; n.gesture = .35;
    if (rnd() < .3) return;
    const dmg = w === 'coltello' ? 34 : 5 + n.tr.cor * 6 + ((n.look && n.look.build) || 1) * 3;
    if (foe === 'player') {
      E.hits = (E.hits || 0) + 1; p.hp = Math.max(op.lethal ? 1 : 4, p.hp - dmg * (op.lethal ? .7 : .3)); p.stun = Math.max(p.stun, .25); p.hurtT = st.clock; st.shake = Math.max(st.shake, .12);
      if (!op.lethal && E.hits >= 4 && !(n.hitT > E.startClock)) { say(st, n, ['E impara!', 'Vigliacco!', 'Ti è andata bene.']); return done('ha dato una lezione a ' + G.PLAYER_NAME); }
      return;
    }
    foe.hp -= dmg; foe.hitT = st.clock; foe.stun = Math.max(foe.stun, .3);
    if (foe.hp <= 0) { if (op.lethal) { kill(st, n, foe, op.how || (w === 'coltello' ? 'a coltellate' : 'a mani nude')); return done(''); } foe.hp = 4; foe.stun = 4; note(st, foe, `messo KO da ${n.first}`, 'bad', { w: .8, who: n.id, tag: 'rissa' }); moveRel(st, foe, n, -.5, .4); }
  }
  function resolveFar(st, n, foe, op) {
    const place = (n.pop.at && n.pop.at.label) || placeName(n.x, n.y);
    if (op.lethal) {
      const w = n.hand, pk = (w && ITEMS[w] && ITEMS[w].kill) || (strength(n) > strength(foe) ? .5 : .3);
      if (w && ITEMS[w] && ITEMS[w].gun) { gunfire(st, n); if (n.pop.ammo[w]) n.pop.ammo[w] -= 3; }
      if (rnd() < pk) kill(st, n, foe, op.how);
      else { hurt(st, n, foe, 35, `aggredit${o(foe)}`); emit(st, 'aggressione', n, foe.id, foe.x, foe.y, place); if (!foe.pop.enemies.includes(n.id)) foe.pop.enemies.push(n.id); }
      return;
    }
    brawl(st, n, foe, op);
  }
  // gli spari si sentono lontano: panico vicino, e chi sente reagisce
  function gunfire(st, n) {
    const S0 = n.pop.shotEv; if (S0 && st.clock - S0 < 8) return; n.pop.shotEv = st.clock;
    const place = placeName(n.x, n.y), ev = emit(st, 'spari', n, null, n.x, n.y, place);
    G.panicAround(st, n.x, n.y, 26, 7);
    perceive(st, { kind: 'spari', x: n.x, y: n.y, place, actor: n.id, ev, hear: true });
  }
  // la rissa (senza volere uccidere)
  function brawl(st, a, b, opt) {
    const op = opt || {};
    st.pop.stats.risse = (st.pop.stats.risse || 0) + 1;
    const nearA = a === 'player' || (a.pop && a.pop.near && !a.inside), nearB = b === 'player' || (b.pop && b.pop.near && !b.inside);
    if (nearA && nearB) { if (a !== 'player') startPlan(st, a, 'rissa', `fare a botte con ${b === 'player' ? G.PLAYER_NAME : b.first}`, [fightStep(st, a, b, op)], 3); if (b !== 'player') startPlan(st, b, 'rissa', `fare a botte con ${a.first}`, [fightStep(st, b, a, Object.assign({}, op, { lethal: false }))], 3); return; }
    if (a === 'player' || b === 'player') return;
    const pw = n => n.tr.cor * .5 + ((n.look && n.look.build) || 1) * .3 + (n.pop.age < 50 ? .2 : 0) + n.pop.need.rabbia * .2 + rnd() * .4;
    const [w, l] = pw(a) > pw(b) ? [a, b] : [b, a];
    l.hp -= 25 + rnd() * 25; w.hp -= 5 + rnd() * 10;
    const place = (a.pop.at && a.pop.at.label) || placeName(a.x, a.y);
    const ev = emit(st, 'aggressione', w, l.id, l.x, l.y, place);
    l.hp = Math.max(8, l.hp); w.hp = Math.max(15, w.hp);
    note(st, w, `fatto a botte con ${l.first}${op.why ? ` (${op.why})` : ''}: ${w.pop.sex === 'f' ? 'ha vinto lei' : 'ha vinto lui'}`, 'shady', { w: .6, who: l.id, tag: 'rissa', place });
    note(st, l, `prese un sacco di botte da ${w.first}${op.why ? ` (${op.why})` : ''}`, 'bad', { w: .75, who: w.id, tag: 'rissa', place });
    feel(l, 'paura', .3); feel(l, 'rabbia', .3); feel(w, 'rabbia', -.3); moveRel(st, l, w, -.5, .35); moveRel(st, w, l, -.2);
    if (l.hp < l.maxHp * .45) intend(st, l, 'mangia', { modo: 'cura' }, 2);
    witnesses(st, l.x, l.y, [w.id, l.id]).slice(0, 4).forEach(k => { G.addMemory(st, k, { eventId: ev.id, type: 'aggressione', actor: w.id, target: l.id, place, t: st.t, conf: .9, source: 'visto' }); if (k.tr.legge > .7 && rnd() < .4) { note(st, k, `chiamato la Guardia per una rissa a ${place}`, 'info', { w: .3 }); if (rnd() < .5) I.arrestFar(st, w, 'rissa'); } });
  }

  // ================= TELEFONO, MESSAGGI, GUARDIA =================
  const hasCell = (st, n) => hasIn(n, 'telefono');
  function phoneSpot(st, n) {
    const P = n.pop, cab = nearest(PHONES, n.x, n.y);
    if (P && P.owns && P.owns.telefono && P.homeT) { if (!cab || dist(n.x, n.y, P.homeT.x, P.homeT.y) < dist(n.x, n.y, cab.x, cab.y) * 1.3) return P.homeT; }
    return cab;
  }
  function phoneSteps(st, n, to, text, corpse, imp) {
    const call = (st, n) => {
      if (to === 'guardia' || to === 'ambulanza') { if (corpse && corpse.corpse && !corpse.corpse.called) callGuard(st, n, corpse, imp || { kind: 'cadavere' }, to); else { note(st, n, `telefonato ${to === 'guardia' ? 'alla Guardia' : 'all\'ambulanza'}${text ? ': ' + text : ''}`, 'info', { w: .4, tag: 'telefonata' }); if (text && text.actor) reportTo(st, n, text); } }
      else message(st, n, to, text || 'Ci vediamo?');
      n.hand = null; return 'next';
    };
    if (hasCell(st, n)) return [S.equip('telefono'), S.do(to === 'guardia' ? 'telefona alla Guardia col cellulare' : 'telefona col cellulare', 3, call)];
    const ph = phoneSpot(st, n); if (!ph) return null;
    return [S.go(ph === n.pop.homeT ? 'corre a casa al telefono' : 'corre alla cabina più vicina', ph, { run: true, outside: ph !== n.pop.homeT, inside: ph === n.pop.homeT }), S.do(to === 'guardia' ? 'telefona alla Guardia' : `telefona a ${to && to.first ? to.first : to}`, 4, call)];
  }
  function message(st, from, to, text) {
    if (to === 'giocatore') {
      if (!st.ris) return false;
      const ch = st.ris.chats[from.id] = st.ris.chats[from.id] || [];
      ch.push({ role: 'npc', text, sys: true, t: st.t });
      st.ris.inbox.unshift({ npc: from.id, text, t: st.t }); if (st.ris.inbox.length > 30) st.ris.inbox.pop();
      G.feed(st, `${from.first}: ${text}`, 'rumor'); return true;
    }
    if (!to || !to.pop || !alive(to)) return false;
    const reach = hasCell(st, to) || (to.pop.owns && to.pop.owns.telefono && to.pop.at && I.isHomeT(to.pop, to.pop.at));
    if (!reach) return false;
    note(st, to, `${from.first} ha chiamato: «${text}»`, 'info', { w: .5, who: from.id, tag: 'telefonata' });
    st.pop.stats.telefonate = (st.pop.stats.telefonate || 0) + 1;
    return true;
  }
  function callGuard(st, n, c, imp, by) {
    if (c.corpse.called) return; c.corpse.called = n === 'player' ? 'player' : n.id; st.pop.stats.chiamate = (st.pop.stats.chiamate || 0) + 1;
    if (n !== 'player') note(st, n, n.cop ? `fatto rapporto: un morto a ${c.corpse.place}` : `telefonato ${by === 'ambulanza' ? 'all\'ambulanza' : 'alla Guardia'}: c'è un morto a ${c.corpse.place}`, 'info', { w: .5, tag: 'telefonata' });
    st.timers.push({ at: st.t + 25 + rnd() * 35, kind: 'azRemove', corpse: c.id, by: by || 'guardia', accuse: imp && imp.actor && imp.kind !== 'cadavere' ? { actor: imp.actor, witness: n === 'player' ? null : n.id } : null });
  }
  function reportTo(st, n, imp) {
    const cop = st.npcs.find(k => k.cop && alive(k)); if (!cop || !imp.actor) return;
    G.addMemory(st, cop, { eventId: (imp.ev && imp.ev.id) || st.nextId++, type: (imp.ev && imp.ev.type) || 'occultamento', actor: imp.actor, place: imp.place, t: st.t, conf: .8, source: 'denuncia', via: [n.first] });
    const k = G.byId(st, imp.actor); if (k && k.pop && rnd() < .5) I.arrestFar(st, k, (imp.ev && G.LABEL[imp.ev.type] || 'denuncia').toLowerCase());
  }

  // ================= MURI, FURTI, COMMERCI, CIBO, FUGA =================
  function wallSteps(st, n, dove, modo) {
    const arte = P_likes(n, 'arte'), t = n.tr;
    const modes = [
      { mode: 'gesso', item: 'gesso', dur: 6, score: .4 + (n.pop.money < 10 ? .2 : 0) },
      { mode: 'bomboletta', item: 'bomboletta', dur: 12, score: .5 + (arte ? .3 : 0) },
      { mode: 'pennello', item: 'pennello', dur: 45, score: arte && t.cor > .5 ? .7 : .1 },
      { mode: 'stencil', item: 'bomboletta', dur: 3, score: t.legge > .5 && t.cor < .6 ? .55 : .2, prep: true },
      { mode: 'carbone', dur: 8, score: n.pop.money < 3 ? .6 : .05 },
    ];
    const m = (modo && modes.find(x => x.mode === modo)) || modes.map(x => Object.assign(x, { score: x.score + (rnd() - .5) * .2 })).sort((a, b) => b.score - a.score)[0];
    const pre = m.item ? getItem(st, n, m.item) : [S.go('prende un pezzo di carbone dalla discarica', () => tgtOf('discarica'), { dur: 2 })];
    if (!pre) return null;
    if (m.prep && !n.pop.owns.stencil) pre.unshift(S.home('ritaglia uno stencil a casa', { dur: 30, act: (st, n) => { n.pop.owns.stencil = true; return 'next'; } }));
    const wall = tgtOf(dove) || tgtOf(pick(rnd, WALLS.filter(id => has(id) && !(n.pop.avoid && n.pop.avoid[PLACES[id].name] > st.t)))) || tgtOf('vico');
    return pre.concat([S.go(`va al muro di ${wall.label}`, spotNear(wall)), S.do({ gesso: 'scrive col gesso', bomboletta: 'spruzza la bomboletta', pennello: 'dipinge un murale col pennello', stencil: 'appoggia lo stencil e spruzza', carbone: 'scrive col carbone' }[m.mode], m.dur, (st, n) => {
      const sk = I.sketchFor(st, n); if (m.mode === 'gesso' || m.mode === 'carbone') sk.text = sk.text.replace(/^(il|la|un|una|l') .*/, x => x.split(',')[0]);
      I.paintWall(st, n, { tgt: wall }, Object.assign(sk, { style: m.mode === 'stencil' ? 'stencil precisi' : sk.style }));
      if (m.mode === 'pennello' && st.ris) st.ris.morale = clamp(st.ris.morale + 2, 0, 100);
      n.hand = null; return 'next';
    }), S.home('torna a casa', { run: m.mode !== 'pennello' })]);
  }
  function stealSteps(st, n, modo, a) {
    const t = n.tr, P = n.pop;
    const victimAt = (where) => st.npcs.filter(k => alive(k) && k.pop && k !== n && !I.isPassive(st, k) && k.pop.at && where && dist(k.pop.at.x, k.pop.at.y, where.x, where.y) < 15 && k.pop.money > 5);
    if (modo === 'auto') {
      const v = vehicleFor(st, n, 0, 200); const ric = tgtOf('magazzino'); if (!v || !ric) return null;
      return [S.drive('si mette al volante di una macchina non sua', () => v, () => ric), S.do('la vende allo Squalo per pezzi', 6, (st, n) => { P.money += 40; v.hidden = true; note(st, n, 'venduto un\'auto rubata allo Squalo: 40.000 lire', 'shady', { w: .6, tag: 'furto' }); return 'next'; })];
    }
    if (modo === 'scasso') {
      const g = getItem(st, n, 'piede'); if (!g) return null;
      const homes = st.npcs.filter(k => alive(k) && k.pop && k.pop.homeT && k.pop.homeT.k === 'b' && k.pop.hh !== P.hh && !P.friends.includes(k.id) && k.pop.at && !I.isHomeT(k.pop, k.pop.at)).map(k => k);
      const vic = homes.length ? pick(rnd, homes) : null; if (!vic) return null;
      return g.concat([S.go(`va sotto casa di ${vic.pop.sur || vic.first}`, vic.pop.homeT), S.do('forza la porta col piede di porco', 15, (st, n) => { const took = Math.min(Math.max(3, vic.pop.money * .4), 40); vic.pop.money -= took; P.money += took * .3; give(n, 'refurtiva', 1); note(st, n, `svaligiato casa ${vic.pop.sur || vic.first}`, 'shady', { w: .6, tag: 'furto' }); note(st, vic, 'trovato la porta forzata e la casa svaligiata', 'bad', { w: .8, tag: 'furto', place: vic.pop.homeT.label }); emitSeen(st, 'scasso', n, vic.id, n.x, n.y, .2); n.hand = null; return 'next'; }), S.home('torna a casa con la refurtiva', { run: true })]);
    }
    if (modo === 'taccheggio') {
      const shop = nearest(['wu', 'use:panetteria', 'use:pescheria', 'use:tabacchi', 'piazza'], n.x, n.y); if (!shop) return null;
      return [S.go(`entra a ${shop.label}`, shop), S.do('infila qualcosa sotto la giacca', 3, (st, n) => { P.pantry += 2; if (a && a.mangia) feel(n, 'fame', -.5); const caught = rnd() < .25; if (caught) { note(st, n, `beccat${o(n)} a rubare a ${shop.label}`, 'bad', { w: .7, tag: 'fermato' }); feel(n, 'paura', .3); if (rnd() < .4) I.arrestFar(st, n, 'taccheggio'); return 'stop'; } note(st, n, `rubato da mangiare a ${shop.label}`, 'shady', { w: .4, tag: 'furto' }); return 'next'; }), S.home('se ne va senza correre')];
    }
    // scippo e borseggio
    const crowd = modo === 'borseggio' ? tgtOf(pick(rnd, ['piazza', 'lungomare', 'passeggiata', 'calata'])) : null;
    const vic = a && a.chi ? a.chi : null;
    return [S.go(vic ? `segue ${vic.first}` : `va tra la gente a ${crowd ? crowd.label : ''}`, () => (vic ? (alive(vic) ? whereOf(st, vic) : null) : crowd), { must: true }),
      S.do(modo === 'borseggio' ? 'si infila tra la gente e alleggerisce qualcuno' : `strappa la borsa a ${vic ? vic.first : 'qualcuno'} e scappa`, modo === 'borseggio' ? 20 : 1, (st, n) => {
        const k = vic || pick(rnd, victimAt(crowd || { x: n.x, y: n.y }).concat([null])); if (!k) return 'stop';
        const took = Math.min(Math.max(2, k.pop.money * .4), 25); k.pop.money -= took; P.money += took;
        const seen = rnd() < (modo === 'borseggio' ? .2 : .6);
        note(st, n, `${modo === 'borseggio' ? 'alleggerito' : 'scippato'} ${k.first}`, 'shady', { w: .5, tag: 'furto', who: k.id });
        note(st, k, `${modo === 'borseggio' ? 'derubat' + o(k) : 'scippat' + o(k)}${seen ? `: è stat${o(n)} ${n.first}` : ''}`, 'bad', { w: .7, tag: 'furto', who: seen ? n.id : null, place: (k.pop.at && k.pop.at.label) || '' });
        if (seen) moveRel(st, k, n, -.6);
        emitSeen(st, 'scippo', n, k.id, n.x, n.y, .5);
        if (seen && k.tr.cor > .65 && rnd() < .5) intend(st, k, 'picchia', { chi: n, perche: 'il furto' }, 3);
        return 'next';
      }), S.home('scappa a casa', { run: true })];
  }
  function sellSteps(st, n, item) {
    if (item === 'roba' || (!item && hasIn(n, 'roba'))) return VERBS.spaccia.plan(st, n, {});
    if (!hasIn(n, 'refurtiva')) return null;
    const ric = st.npcs.find(k => alive(k) && k.pop && k.pop.giro === 'ricettatore' && k !== n), where = ric ? whereOf(st, ric) : tgtOf('magazzino');
    return [S.go(ric ? `va dal ricettatore, ${ric.first}` : 'va al Magazzino Neri dallo Squalo', where), S.do('vende la refurtiva', 5, (st, n) => { const q = n.pop.inv.refurtiva || 0; if (!q) return 'stop'; const g = q * (8 + rnd() * 12); n.pop.money += g; takeAway(n, 'refurtiva', q); if (ric) { ric.pop.money -= g * .5; give(ric, 'refurtiva', q); } note(st, n, `venduto la refurtiva: ${Math.round(g)}.000 lire`, 'shady', { w: .4 }); return 'next'; })];
  }
  function dealHere(st, n) {
    const P = n.pop; if (!P.at) return;
    const buyers = st.npcs.filter(k => alive(k) && k.pop && k !== n && k.pop.vice === 'roba' && k.pop.money > 5 && k.pop.at && dist(k.pop.at.x, k.pop.at.y, P.at.x, P.at.y) < 20);
    buyers.slice(0, 3).forEach(k => { if (!hasIn(n, 'roba')) return; const c = 4 + rnd() * 6; k.pop.money -= c; P.money += c; takeAway(n, 'roba'); give(k, 'roba'); note(st, k, `comprato la roba da ${n.first}`, 'bad', { w: .4, who: n.id }); moveRel(st, k, n, .05); });
    if (rnd() < .06) I.arrestFar(st, n, 'spaccio');
  }
  function eatSteps(st, n, modo) {
    const P = n.pop;
    if (modo === 'cura') return [S.go('va all\'ambulatorio a farsi medicare', () => tgtOf('ambulatorio'), { outside: false }), S.do('si fa medicare', 60, (st, n) => { heal(st, n); return 'next'; }), S.home()];
    const m = modo || (P.pantry > 0 && rnd() < .6 ? 'casa' : P.money >= 5 ? 'fuori' : P.money >= 2 ? 'panino' : n.tr.legge < .55 ? 'ruba' : 'casa');
    if (m === 'ruba') return stealSteps(st, n, 'taccheggio', { mangia: true });
    if (m === 'casa') return [S.home('torna a casa a mangiare'), S.do('mangia', 20, (st, n) => { if (P.pantry > 0) { P.pantry--; feel(n, 'fame', -.8); } return 'next'; }, { inside: true })];
    const t = nearest(m === 'fuori' ? ['osteria', 'osteria_sg', 'car_2'] : ['bar', 'sirena', 'gelateria', 'chiosco'], n.x, n.y); if (!t) return null;
    return [S.go(`va a mangiare a ${t.label}`, t, { outside: false }), S.do('mangia', m === 'fuori' ? 40 : 10, (st, n) => { P.money -= m === 'fuori' ? 4 : 2; feel(n, 'fame', m === 'fuori' ? -.8 : -.4); feel(n, 'compagnia', -.1); return 'next'; })];
  }
  function fleeSteps(st, n, modo) {
    const P = n.pop, hide = nearest(HIDDEN, n.x, n.y), dest = P.homeT;
    const v = modo !== 'piedi' && (vehicleFor(st, n, 0, 40) || null);
    if (v && (modo === 'auto' || modo === 'vespa' || (!modo && n.tr.cor > .4))) return [S.drive(`scappa con ${G.vehicleName ? G.vehicleName(st, v) : 'la macchina'}`, () => v, () => (n.tr.legge < .4 && hide ? hide : dest)), S.do('si ferma e respira', 3, (st, n) => { leaveVehicle(st, n); return 'next'; }), S.home()];
    return [S.home('scappa a casa', { run: true, dur: 30, act: (st, n) => { const hh = st.pop.households[P.hh]; (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k !== n && k.pop) I.share(st, n, k); }); return 'next'; } })];
  }

  // ================= TRA PERSONE =================
  const LINES = {
    chiacchiera: ['Hai sentito cosa è successo?', 'Che freddo, eh?', 'Come va la famiglia?'], sfotti: ['Ma guardalo, sembra un Grigio in libera uscita!', 'Ancora con quella giacca?', 'Ah, il grande esperto!'],
    apprezza: ['Bella giacca, sai?', 'Sei uno a posto, tu.', 'Grazie per l\'altro giorno.'], offri: ['Ti offro qualcosa, dai.', 'Questo lo pago io.'], gioca: ['Una partita?', 'Scopa!', 'Tocca a te!'], regala: ['Tieni, è per te.'],
    litiga: ['Ma che dici?!', 'Vattene!', 'Non ti permettere!'],
  };
  function social(st, a, b, kind, args) {
    if (!alive(a) || !alive(b) || !a.pop || !b.pop) return;
    const Ra = rel(st, a, b), Rb = rel(st, b, a), place = (a.pop.at && a.pop.at.label) || placeName(a.x, a.y);
    st.pop.stats.incontri = (st.pop.stats.incontri || 0) + 1;
    { const real = kind === 'chiacchiera' && I.chatLine ? I.chatLine(st, a, a.pop.cur) : null; if (real) G.say(st, a, real, 3); else say(st, a, LINES[kind] || LINES.chiacchiera); }   // [vivi] si parla di cose vere
    if (CFG.talk) try { CFG.talk(st, a, b, kind); } catch (e) { } // la Mente può dare voce vera allo scambio
    switch (kind) {
      case 'chiacchiera': I.share(st, a, b); I.share(st, b, a); moveRel(st, a, b, .03); moveRel(st, b, a, .03); feel(a, 'compagnia', -.15); feel(b, 'compagnia', -.15); break;
      case 'sfotti': {
        const banter = Rb.a > .4 && b.tr.loq > .5;
        if (banter) { moveRel(st, b, a, .04); feel(b, 'svago', -.1); say(st, b, ['Ah ah, senti chi parla!', 'Sei sempre il solito.']); }
        else { moveRel(st, b, a, -.15); feel(b, 'rabbia', .15); note(st, b, `${a.first} l'ha pres${o(b)} in giro a ${place}`, 'bad', { w: .45, who: a.id, tag: 'offesa' }); if (b.pop.need.rabbia > .55 && b.tr.cor > .5 && rnd() < .5) quarrel(st, b, a, 'presa in giro'); }
        break;
      }
      case 'apprezza': moveRel(st, b, a, .12); moveRel(st, a, b, .04); feel(b, 'svago', -.05); feel(b, 'compagnia', -.1); note(st, b, `${a.first} gli ha fatto un complimento`, 'good', { w: .3, who: a.id }); break;
      case 'offri': if (a.pop.money < 2) return; a.pop.money -= 2; feel(b, 'fame', -.1); feel(b, 'svago', -.1); moveRel(st, b, a, .15); note(st, b, `${a.first} gli ha offerto da bere a ${place}`, 'good', { w: .3, who: a.id }); break;
      case 'regala': { const k = (args && args.oggetto) || Object.keys(a.pop.inv).find(x => x !== 'roba' && x !== 'refurtiva'); if (!k || !hasIn(a, k)) return; takeAway(a, k); give(b, k); moveRel(st, b, a, .25); note(st, b, `${a.first} gli ha regalato ${ITEMS[k] ? ITEMS[k].name : k}`, 'good', { w: .5, who: a.id }); break; }
      case 'gioca': {
        const game = (args && args.gioco) || (/Flipper/.test(place) ? 'flipper' : /Spiaggia|Giardini/.test(place) ? 'pallone' : /Osteria|Bar|Circolo|Sirena|Trattoria/.test(place) ? (a.tr.legge < .35 && rnd() < .4 ? 'dadi' : 'carte') : 'dadi');
        feel(a, 'svago', -.3); feel(b, 'svago', -.3); feel(a, 'compagnia', -.2); feel(b, 'compagnia', -.2);
        if (game === 'carte' || game === 'dadi') {
          const cheat = a.tr.avid > .7 && a.tr.legge < .35 && rnd() < .5, bet = 2 + Math.floor(rnd() * 6), aw = cheat ? rnd() < .8 : rnd() < .5;
          if (aw) { a.pop.money += bet; b.pop.money -= bet; } else { a.pop.money -= bet; b.pop.money += bet; }
          note(st, a, `giocato a ${game} con ${b.first}: ${aw ? 'vinto' : 'perso'} ${bet}.000 lire`, aw ? 'good' : 'info', { w: .25, who: b.id });
          note(st, b, `giocato a ${game} con ${a.first}: ${aw ? 'perso' : 'vinto'} ${bet}.000 lire`, aw ? 'info' : 'good', { w: .25, who: a.id });
          if (cheat && rnd() < .4) { note(st, b, `beccato ${a.first} a barare`, 'bad', { w: .6, who: a.id, tag: 'offesa' }); moveRel(st, b, a, -.35); quarrel(st, b, a, 'ha barato'); }
          else { moveRel(st, a, b, .06); moveRel(st, b, a, .06); }
        } else { moveRel(st, a, b, .08); moveRel(st, b, a, .08); note(st, a, `giocato a ${game} con ${b.first}`, 'good', { w: .2, who: b.id }); }
        break;
      }
      case 'litiga': quarrel(st, a, b, args && args.perche); break;
    }
  }
  function quarrel(st, a, b, why) {
    st.pop.stats.liti = (st.pop.stats.liti || 0) + 1;
    note(st, a, `litigato con ${b.first}${why ? ` (${why})` : ''}`, 'bad', { w: .5, who: b.id, tag: 'lite' });
    note(st, b, `litigato con ${a.first}${why ? ` (${why})` : ''}`, 'bad', { w: .5, who: a.id, tag: 'lite' });
    feel(a, 'rabbia', .15); feel(b, 'rabbia', .15); moveRel(st, a, b, -.15); moveRel(st, b, a, -.15);
    say(st, a, LINES.litiga, 3); say(st, b, LINES.litiga, 3);
    const vino = n => n.pop.using && n.pop.using.some(x => x.tag === 'vino') && n.pop.vice === 'vino';
    const heat = (a.pop.need.rabbia + b.pop.need.rabbia) / 2 + (a.tr.cor + b.tr.cor) / 4 - (a.tr.legge + b.tr.legge) / 4 + (vino(a) || vino(b) ? .2 : 0);
    if (heat > .55 && rnd() < heat - .35) brawl(st, a, b, { why });
  }
  // ogni tanto, chi si ritrova nello stesso posto fa qualcosa con qualcun altro: a seconda del carattere e di cosa prova per lui
  function socialize(st) {
    const groups = {};
    st.npcs.forEach(n => { if (alive(n) && n.pop && !n.pop.emer && !busyLaw(st, n) && !I.isPassive(st, n) && n.pop.at && !I.isHomeT(n.pop, n.pop.at)) (groups[tkey(n.pop.at)] = groups[tkey(n.pop.at)] || []).push(n); });
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      for (let i = 0; i < Math.min(5, g.length); i++) {
        const a = g[Math.floor(rnd() * g.length)], b = g[Math.floor(rnd() * g.length)]; if (a === b) continue;
        if (rnd() > .2) continue;
        initInv(st, a); initInv(st, b);
        const R = rel(st, a, b), t = a.tr, lq = a.pop.lastQ = a.pop.lastQ || {};
        const tension = (a.pop.enemies.includes(b.id) ? .5 : 0) + (I.recent(st, a.pop, 'bidone', 3, e => e.who === b.id) ? .3 : 0) + (a.pop.debt && ['rocco', 'tano', 'sandro'].includes(b.id) ? .35 : 0) + (a.ris && b.ris && Math.abs(a.ris.ideo - b.ris.ideo) > .5 ? .15 : 0) + Math.max(0, a.pop.need.rabbia - .3) * .6 - R.a * .4;
        const W = {
          chiacchiera: 1 + t.loq * .5,
          sfotti: Math.max(0, t.loq * .7 - R.a * .3 - t.legge * .2) * .6,
          apprezza: Math.max(0, R.a) * .7 + (1 - t.avid) * .1,
          offri: R.a > .25 && a.pop.money > 15 && t.avid < .55 ? .35 : 0,
          gioca: /Osteria|Bar|Circolo|Sirena|Flipper|Spiaggia|Giardini|Trattoria/.test((a.pop.at && a.pop.at.label) || '') && (P_likes(a, 'carte') || P_likes(a, 'sport') || P_likes(a, 'musica')) && R.a > -.1 ? .5 : 0,
          litiga: st.t - (lq[b.id] || -1e9) > 1440 && tension > .2 ? tension * .8 : 0,
          spaccia: hasIn(a, 'roba') && b.pop.vice === 'roba' ? 1 : 0,
        };
        const tot = Object.values(W).reduce((s, v) => s + v, 0); let r = rnd() * tot, kind = 'chiacchiera';
        for (const [k, v] of Object.entries(W)) { r -= v; if (r <= 0) { kind = k; break; } }
        if (kind === 'litiga') { lq[b.id] = st.t; (b.pop.lastQ = b.pop.lastQ || {})[a.id] = st.t; }
        if (kind === 'spaccia') { dealHere(st, a); continue; }
        social(st, a, b, kind);
      }
    });
  }

  // ================= EVENTI =================
  function emit(st, type, actor, target, x, y, place, secret) {
    const ev = { id: st.nextId++, type, actor: actor ? (actor === 'player' ? 'player' : actor.id) : 'ignoto', target: target || null, owner: target || null, x, y, t: st.t, sev: G.SEV[type] || .5, noise: 0, place, npcCrime: actor !== 'player', secret: !!secret };
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    return ev;
  }
  // un gesto che si vede: chi c'è se lo ricorda (con una certa probabilità di accorgersene)
  function emitSeen(st, type, n, target, x, y, chance) {
    const place = placeName(x, y), ev = emit(st, type, n, target, x, y, place);
    witnesses(st, x, y, [n === 'player' ? 'player' : n.id, target].filter(Boolean)).forEach(k => { if (rnd() < (chance === undefined ? .6 : chance)) G.addMemory(st, k, { eventId: ev.id, type, actor: ev.actor, target, place, t: st.t, conf: .85, source: 'visto' }); });
    return ev;
  }
  function bury(st, n, c, place) {
    const L = c.corpse; L.buried = { place, by: n === 'player' ? 'player' : n.id, t: st.t }; L.leader = null; c.inside = true;
    if (n !== 'player') n.pop.carrying = null;
    st.pop.graves = st.pop.graves || []; st.pop.graves.push({ c: c.id, place, by: L.buried.by, t: st.t, x: c.x, y: c.y });
    st.pop.stats.sepolti = (st.pop.stats.sepolti || 0) + 1;
    if (n !== 'player') { note(st, n, `ha seppellito ${L.name} in ${place}. Non lo dirà a nessuno`, 'shady', { w: 1, place, tag: 'segreto', who: c.id }); feel(n, 'paura', .2); }
    emit(st, 'occultamento', n, c.id, c.x, c.y, place, true);
  }
  function vanish(st, n, c, how, text) {
    const L = c.corpse; L.gone = how; L.leader = null; L.vehicle = null; c.inside = true;
    if (n !== 'player') { n.pop.carrying = null; note(st, n, text, 'shady', { w: 1, tag: 'segreto', who: c.id }); feel(n, 'paura', .15); }
    st.pop.stats.spariti = (st.pop.stats.spariti || 0) + 1;
    emit(st, 'occultamento', n, c.id, c.x, c.y, placeName(c.x, c.y), true);
  }
  function smoke(st, x, y, place) { witnesses(st, x, y, []).forEach(k => { if (rnd() < .3) note(st, k, `visto del fumo nero salire da ${place}, e un odore strano`, 'info', { w: .3, place }); }); }

  // ================= LA MORTE =================
  // chi muore resta morto: il corpo resta dov'è (è lui, col suo nome, e gli altri se lo ricordano). All'ambulatorio arriva qualcuno di nuovo.
  function onDeath(st, n) {
    n._died = true;
    const ev = st.events.find(e => e.type === 'omicidio' && e.target === n.id && st.t - e.t < 10);
    const killer = n.killedBy || (ev && ev.actor) || null;
    if (n.pop) { if (n.pop.emer) endPlan(st, n, 'morto'); n.pop.near = true; n.pop.lod = 'vicino'; }
    if (n.inVeh) leaveVehicle(st, n);
    n.inside = false; n.hand = null;
    n.corpse = { of: n.id, name: n.name, weight: Math.round(55 + 25 * ((n.look && n.look.build) || 1)), t: st.t, killer, place: placeName(n.x, n.y), seen: {}, gone: null, buried: null, leader: null, vehicle: null, mode: null, robbed: false, called: false, hidden: false };
    st.pop.births = st.pop.births || [];
    if (!n.reinforcement && !n.driverOf) st.pop.births.push({ at: st.t + CFG.birth[0] + rnd() * (CFG.birth[1] - CFG.birth[0]), of: n.id });
    st.pop.stats.morti = (st.pop.stats.morti || 0) + 1;
    if (n.ris && n.ris.member) { n.ris.member = false; n.ris.task = null; if (st.ris) { st.ris.morale = clamp(st.ris.morale - 6, 0, 100); G.feed(st, `${n.first} è morto. I suoi pezzi sui muri restano.`, 'bad'); } }
    // chi gli voleva bene lo saprà quando trovano il corpo; intanto, chi ha visto
    perceive(st, { kind: killer ? 'omicidio' : 'morte', x: n.x, y: n.y, place: n.corpse.place, corpse: n, actor: killer, ev });
  }
  function kill(st, killer, victim, how) {
    if (!alive(victim)) return;
    victim.dead = true; victim.hp = 0; victim.deathT = st.clock; victim.path = []; victim.stun = 0; victim.panic = 0; victim.bark = null;
    if (killer && killer.x !== undefined) victim.face = Math.atan2(victim.y - killer.y, victim.x - killer.x);
    victim.action = { name: 'morto', scores: [], why: 'È morto.', since: st.clock }; victim.killedBy = killer === 'player' ? 'player' : killer.id;
    st.fx.push({ k: 'bloodpool', x: victim.x, y: victim.y });
    const place = placeName(victim.x, victim.y);
    if (st.pop) (st.pop.stains = st.pop.stains || []).push({ x: victim.x, y: victim.y, place, t: st.t, by: killer === 'player' ? 'player' : killer && killer.id, of: victim.id });   // [economia] il sangue resta finché qualcuno non lo lava
    emit(st, 'omicidio', killer, victim.id, victim.x, victim.y, place);
    G.addLog(st, `${G.clockStr(st.t)} · ${victim.name} è stat${o(victim)} uccis${o(victim)}${how ? ` (${how})` : ''} a ${place}.`, 'bad');
    if (killer !== 'player' && killer.pop) { note(st, killer, `ha ucciso ${victim.first}${how ? ` (${how})` : ''}`, 'shady', { w: 1, who: victim.id, place, tag: 'omicidio' }); feel(killer, 'paura', .5); feel(killer, 'rabbia', -.6); st.pop.stats.omicidi = (st.pop.stats.omicidi || 0) + 1; }
  }

  // ================= PERCEZIONE E REAZIONI =================
  function witnesses(st, x, y, exclude, hear) {
    const out = [], R = hear ? CFG.hear : CFG.sight;
    st.npcs.forEach(k => {
      if (!alive(k) || !k.pop || exclude.includes(k.id) || busyLaw(st, k)) return;
      if (k.pop.near && !k.inside) { const d = dist(k.x, k.y, x, y); if (d < R && (hear || G.canSee(st, k, x, y))) out.push(k); }
      else if (k.pop.at && dist(k.pop.at.x, k.pop.at.y, x, y) < (hear ? R : 16) && (hear || k.pop.at.k === 'p' || rnd() < .25)) out.push(k);
    });
    return out;
  }
  function perceive(st, imp) {
    const ex = [imp.actor, imp.corpse && imp.corpse.id].filter(Boolean);
    const list = witnesses(st, imp.x, imp.y, ex, imp.hear);
    list.forEach(k => {
      if (imp.corpse) imp.corpse.corpse.seen[k.id] = st.t;
      if (imp.ev && imp.ev.id && !imp.hear) G.addMemory(st, k, { eventId: imp.ev.id, type: imp.ev.type, actor: imp.ev.actor, target: imp.ev.target, owner: imp.ev.owner, place: imp.place, t: st.t, conf: .9, source: 'visto' });
      react(st, k, imp);
    });
    if (imp.kind === 'omicidio' && imp.actor && imp.actor !== 'player') { const k = G.byId(st, imp.actor); if (k && k.pop) react(st, k, Object.assign({}, imp, { self: true })); }
    return list.length;
  }
  function scanCorpses(st) {
    corpses(st).forEach(c => {
      if (c.corpse.leader || c.corpse.vehicle || c.inside) return;
      witnesses(st, c.x, c.y, [c.id]).forEach(k => {
        if (c.corpse.seen[k.id] || (!k.pop.near && rnd() > (c.corpse.hidden ? .03 : .5))) return;
        if (c.corpse.hidden && k.pop.near && dist(k.x, k.y, c.x, c.y) > 3) return;
        c.corpse.seen[k.id] = st.t;
        react(st, k, { kind: 'cadavere', x: c.x, y: c.y, place: c.corpse.place, corpse: c, actor: c.corpse.killer });
      });
    });
  }
  function watchCarrying(st, n) {
    const E = n.pop.emer; if (!E || st.clock - (E.seenChk || 0) < 1.5) return; E.seenChk = st.clock;
    const c = n.pop.carrying && G.byId(st, n.pop.carrying); if (!c || c.corpse.vehicle) return;
    const night = isNightT(st.t), crew = E.crew || [];
    const list = witnesses(st, n.x, n.y, [n.id, c.id].concat(crew)).filter(k => !E.seenBy || !E.seenBy[k.id]).filter(k => k.pop.near || rnd() < (night ? .15 : .5));
    if (!list.length) return;
    E.seenBy = E.seenBy || {};
    const ev = E.carryEv || (E.carryEv = emit(st, 'occultamento', n, c.id, n.x, n.y, placeName(n.x, n.y)));
    list.forEach(k => { E.seenBy[k.id] = true; G.addMemory(st, k, { eventId: ev.id, type: 'occultamento', actor: n.id, target: c.id, place: ev.place, t: st.t, conf: .85, source: 'visto' }); react(st, k, { kind: 'trasporto', x: n.x, y: n.y, place: ev.place, corpse: c, actor: n.id, carrier: n, ev }); });
  }
  const RLINES = {
    chiama: ['Madonna santa! Chiamate qualcuno!', 'Vado al telefono, chiamo la Guardia!'], scappa: ['No no no…', 'Io non ho visto niente!', 'Via, via di qui!'],
    piange: ['No! Non lui!', 'Svegliati, ti prego…', 'Chi è stato? CHI È STATO?'], nasconde: ['Zitto. Dammi una mano.', 'Non deve trovarlo nessuno.'],
    fruga: ['A lui non servono più…'], affronta: ['Tu! Assassino!', 'Adesso la paghi!'], riferisce: ['Questa la deve sapere la Zia…'], ignora: ['Non sono affari miei.'], costituisce: ['Che ho fatto…'], aiuta: ['Ti do una mano, sbrighiamoci.'], nasconditi: ['Giù! Spari!', 'Mettetevi al riparo!'],
  };
  // ogni imprevisto: le scelte possibili col loro peso (carattere, paura, legami col morto e con chi l'ha fatto); la scelta diventa un'intenzione
  function react(st, n, imp) {
    const P = n.pop; if (!P || !alive(n)) return;
    if (P.emer && (P.emer.prio || 0) >= 3) return;
    initInv(st, n);
    const N = P.need, t = n.tr, c = imp.corpse;
    const victim = c || imp.victim || null, killer = imp.actor && imp.actor !== 'player' ? G.byId(st, imp.actor) : null, byPlayer = imp.actor === 'player';
    const relV = victim && victim !== n ? Math.max(I.closeness(st, n, victim), (rel(st, n, victim).a + 1) / 2) : 0;
    const relK = killer && killer !== n ? (rel(st, n, killer).a + 1) / 2 : 0;
    const me = imp.self || (killer && killer === n);
    const shady = !!(P.giro && P.giro !== 'orecchio');
    const vname = victim ? (relV > .6 || (victim.pop && victim.pop.cast) ? victim.first : 'uno sconosciuto') : 'qualcuno';
    if (!me) { feel(n, 'paura', imp.hear ? .2 : .25 + (imp.kind === 'omicidio' ? .2 : 0)); if (relV > .6) feel(n, 'rabbia', .4); }
    if (n.cop) { if (c && !c.corpse.called) callGuard(st, n, c, imp); return; }
    const opts = [], add = (k, v, run) => opts.push([k, v + rnd() * .15, run]);
    if (me) {
      add('nasconde', (1 - t.legge) * .9 + t.cor * .6 + (isNightT(st.t) ? .3 : 0) - witnesses(st, imp.x, imp.y, [n.id]).length * .2, () => intend(st, n, 'sbarazzati', { cosa: c }, 3, `far sparire ${c.corpse.name}`));
      add('scappa', N.paura * .8 + .4, () => intend(st, n, 'scappa', {}, 3));
      add('costituisce', t.legge * 1.2 - .5, () => intend(st, n, 'costituisciti', {}, 3));
    } else if (imp.kind === 'spari') {
      add('scappa', N.paura * .9 + (1 - t.cor) * .5, () => intend(st, n, 'scappa', { modo: 'piedi' }, 2));
      add('nasconditi', .5 + N.paura * .4, () => intend(st, n, 'nasconditi', {}, 2));
      add('chiama', t.legge * .9 - (shady ? .5 : 0), () => intend(st, n, 'telefona', { a: 'guardia', testo: { kind: 'spari', place: imp.place, actor: imp.actor, ev: imp.ev } }, 2));
      add('ignora', shady ? .5 : .15, null);
    } else if (imp.kind === 'trasporto') {
      add('chiama', t.legge * 1.1 + relV * .6 - (relK > .7 ? 1 : 0) - (shady ? .5 : 0), () => intend(st, n, 'telefona', { a: 'guardia', corpo: c, testo: { actor: imp.actor, place: imp.place, ev: imp.ev } }, 2));
      add('scappa', N.paura * .9 + (1 - t.cor) * .4, () => intend(st, n, 'scappa', { modo: 'piedi' }, 2));
      add('aiuta', relK > .7 && t.legge < .5 ? .8 + t.cor * .4 : 0, () => { const E = imp.carrier.pop.emer; if (E) { E.crew = (E.crew || []).concat([n.id]); E.slow = Math.max(E.slow || .5, .85); } startPlan(st, n, 'aiuta', `aiutare ${imp.carrier.first}`, [S.go(`segue ${imp.carrier.first}`, () => (imp.carrier.pop.emer ? { x: imp.carrier.x + .9, y: imp.carrier.y + .6 } : null), { must: true, dur: 0, act: () => (imp.carrier.pop.emer ? 'wait' : 'next') }), S.home('torna a casa senza dire niente')], 3); });
      add('ignora', .35 + (shady ? .3 : 0), null);
    } else {
      add('chiama', (t.legge * 1.1 + N.paura * .2 + relV * .5) * (relK > .7 ? .25 : 1) * (shady ? .35 : 1) - (byPlayer && n.ris && n.ris.ideo > .7 ? .3 : 0), () => intend(st, n, 'telefona', { a: 'guardia', corpo: c, imp }, 2));
      add('scappa', N.paura * .8 + (1 - t.cor) * .55 + (imp.kind === 'omicidio' ? .35 : 0), () => intend(st, n, 'scappa', { modo: 'piedi' }, 2));
      if (relV > .6) add('piange', 1.2 + relV * .4, () => mourn(st, n, c, imp));
      if (c && killer && relK > .7 && t.legge < .5 && strength(n) > .5) add('nasconde', .8 + t.cor * .5 - t.legge * .5, () => intend(st, n, 'sbarazzati', { cosa: c }, 3));
      if (c && shady && t.legge < .3 && t.cor > .6 && imp.kind === 'cadavere') add('nasconde', .45, () => intend(st, n, 'sbarazzati', { cosa: c }, 3));
      if (c && !c.corpse.robbed && relV < .5) add('fruga', t.avid * (1 - t.legge) * .9 - N.paura * .3, () => intend(st, n, 'fruga', { cosa: c }, 2));
      if (imp.kind === 'omicidio' && killer && alive(killer) && relV > .6 && t.cor > .6) add('affronta', relV + N.rabbia * .5 + t.cor * .3 - N.paura * .5, () => intend(st, n, N.rabbia > .85 && t.legge < .25 ? 'uccidi' : 'picchia', { chi: killer, perche: `per ${vname}` }, 3));
      if (P.giro === 'orecchio' || n.id === 'marta') add('riferisce', .9, () => tellZia(st, n, imp));
      add('ignora', .3, null);
    }
    opts.sort((a, b) => b[1] - a[1]);
    const [kind, , run] = opts[0];
    const what = { omicidio: `visto uccidere ${vname}`, morte: `visto morire ${vname}`, cadavere: `trovato ${c && relV > .6 ? `il corpo di ${vname}` : 'un cadavere'}`, trasporto: `visto ${imp.carrier ? imp.carrier.first : 'qualcuno'} trascinare un corpo`, spari: 'sentito degli spari' }[imp.kind] || 'visto qualcosa di brutto';
    const said = { chiama: 'ha chiamato la Guardia', scappa: `è scappat${o(n)} via`, piange: 'non riesce a smettere di piangere', nasconde: 'ha deciso di far sparire il corpo', fruga: 'gli ha frugato nelle tasche', affronta: `è andat${o(n)} a cercare chi è stato`, riferisce: 'corre a dirlo alla Zia', ignora: 'ha fatto finta di niente', costituisce: 'va a costituirsi', aiuta: 'lo aiuta', nasconditi: `si è nascost${o(n)}` }[kind];
    if (!me) note(st, n, `${what} a ${imp.place}: ${said}`, 'bad', { w: imp.kind === 'spari' ? .5 : .9, place: imp.place, who: victim ? victim.id : null, tag: imp.kind });
    if (killer && !me && imp.kind !== 'cadavere' && relK < .6) moveRel(st, n, killer, -.6, .4);
    say(st, n, RLINES[kind] || RLINES.ignora);
    if (run) run();
    if (n.ris && n.ris.member && st.ris && imp.kind !== 'spari') message(st, n, 'giocatore', `${cap(what)} a ${imp.place}. ${kind === 'chiama' ? 'Ho chiamato la Guardia, girate al largo.' : 'Non venite da queste parti.'}`);
  }
  function mourn(st, n, c, imp) {
    const steps = [S.go('corre dal corpo', () => (c && !c.corpse.gone && !c.corpse.buried && !c.corpse.leader ? { x: c.x + .8, y: c.y, label: c.corpse.place } : null), { run: true }),
      S.do(`piange su ${c ? c.corpse.name : 'il corpo'}`, 25, (st, n) => { feel(n, 'rabbia', .2); return 'next'; })];
    if (n.tr.legge > .3 && c && !c.corpse.called) steps.push(...(phoneSteps(st, n, 'guardia', null, c) || []));
    steps.push(S.home('torna a casa distrutto'));
    if (c && c.corpse.killer && c.corpse.killer !== 'player') { const k = G.byId(st, c.corpse.killer); if (k) moveRel(st, n, k, -.9, .3); }
    return startPlan(st, n, 'piange', 'piange il morto', steps, 2);
  }
  function tellZia(st, n, imp) {
    return startPlan(st, n, 'riferisce', 'riferire alla Zia', [S.go('corre al Bar Sirena dalla Zia', () => tgtOf('sirena'), { outside: false }), S.do('le racconta tutto', 15, (st, n) => { const z = G.byId(st, 'zia'); if (z && imp.ev) G.addMemory(st, z, { eventId: imp.ev.id, type: imp.ev.type, actor: imp.ev.actor, target: imp.ev.target, place: imp.place, t: st.t, conf: .8, source: 'voce', via: [n.first] }); n.pop.money += 5; return 'next'; }), S.home()], 2);
  }

  // ================= TIMER: la Guardia, il mare che restituisce, l'odore =================
  function onTimers(st) {
    st.timers = st.timers.filter(tm => {
      if (!/^az/.test(tm.kind) || st.t < tm.at) return true;
      const c = G.byId(st, tm.corpse); if (!c || !c.corpse) return false;
      const L = c.corpse;
      if (tm.kind === 'azRemove') {
        if (L.gone || L.buried) return false;
        if (L.leader && L.leader !== 'player') { const k = G.byId(st, L.leader); if (k) { endPlan(st, k, 'preso'); note(st, k, `i Grigi l'hanno sorpres${o(k)} con ${L.name}`, 'bad', { w: 1, tag: 'fermato' }); if (rnd() < .8) { I.arrestFar(st, k, 'occultamento di cadavere'); k.jailedUntil = st.t + 2 * 1440; } } }
        if (L.vehicle) { if (rnd() < .5) return true; }   // in un bagagliaio: non lo trovano subito
        L.gone = tm.by; L.leader = null; c.inside = true;
        G.addLog(st, `${G.clockStr(st.t)} · La Guardia ha portato via ${L.name} da ${L.place}.`, 'info');
        if (st.ris) st.ris.repr = clamp(st.ris.repr + 4, 0, 100);
        if (tm.accuse && tm.accuse.actor && tm.accuse.actor !== 'player') { const k = G.byId(st, tm.accuse.actor); st.npcs.filter(x => x.cop && alive(x)).forEach(cop => G.addMemory(st, cop, { eventId: st.nextId++, type: 'omicidio', actor: tm.accuse.actor, target: c.id, place: L.place, t: L.t, conf: .85, source: 'denuncia', via: [] })); if (k && alive(k) && k.pop && rnd() < .7) { I.arrestFar(st, k, 'omicidio'); k.jailedUntil = st.t + 3 * 1440; } }
        mournFamily(st, c);
      } else if (tm.kind === 'azResurface') {
        if (L.buried) return false;
        const where = tgtOf(tm.where || pick(rnd, ['spiaggia', 'caletta'].filter(has))); if (!where) return false;
        L.gone = null; L.hidden = false; c.inside = false; c.x = where.x + (rnd() - .5) * 4; c.y = where.y + (rnd() - .5) * 3; L.place = where.label; L.seen = {}; L.called = false;
        G.addLog(st, `${G.clockStr(st.t)} · ${tm.by === 'netturbino' ? 'Un netturbino ha trovato qualcosa tra i rifiuti' : 'Il mare ha restituito un corpo'} a ${where.label}.`, 'bad');
      } else if (tm.kind === 'azSmell') {
        if (L.gone) return false;
        const owner = G.byId(st, tm.owner), home = owner && owner.pop && owner.pop.homeT;
        const nb = st.npcs.find(k => alive(k) && k.pop && k !== owner && k.pop.homeT && home && dist(k.pop.homeT.x, k.pop.homeT.y, home.x, home.y) < 30);
        if (nb) { note(st, nb, `da casa di ${owner.first} viene un odore terribile`, 'bad', { w: .6, who: owner.id }); if (nb.tr.legge > .4) { L.called = nb.id; st.timers.push({ at: st.t + 30, kind: 'azRemove', corpse: c.id, by: 'guardia', accuse: { actor: owner.id } }); } }
      }
      return false;
    });
  }
  function mournFamily(st, c) {
    const v = c, hh = v.pop && st.pop.households[v.pop.hh];
    (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k.pop && k !== v && alive(k)) { note(st, k, `la Guardia è venuta a dire che hanno trovato ${v.name} morto a ${c.corpse.place}`, 'bad', { w: 1, who: v.id, tag: 'lutto' }); feel(k, 'rabbia', .35); feel(k, 'paura', .2); } });
    (v.pop ? v.pop.friends : []).forEach(id => { const k = G.byId(st, id); if (k && k.pop && alive(k) && rnd() < .6) note(st, k, `${v.first} è morto`, 'bad', { w: .8, who: v.id, tag: 'lutto' }); });
  }

  // ================= INCIDENTI =================
  const DRV_NAMES = [['Pino', 'Satta'], ['Lina', 'Cossu'], ['Raffaele', 'Mura'], ['Gabriella', 'Lai'], ['Ottavio', 'Pes'], ['Nunzia', 'Serra'], ['Tore', 'Piras'], ['Delia', 'Manca'], ['Ciro', 'Esposito'], ['Ivana', 'Loi']];
  function crashes(st) {
    st.vehicles.forEach(v => {
      if (!(v.looseUntil > st.clock) || v._crashSeen === v.looseUntil || v.hidden || !v.traffic) return;
      v._crashSeen = v.looseUntil;
      if (st.clock - (v._crashT || -99) < 15) return; v._crashT = st.clock;
      let other = null, bd = 7;
      st.vehicles.forEach(w => { if (w !== v && !w.hidden) { const d = dist(v.x, v.y, w.x, w.y); if (d < bd) { bd = d; other = w; } } });
      if (!other) return;
      st.pop.stats.incidenti = (st.pop.stats.incidenti || 0) + 1;
      const party = other.rider === 'player' ? 'player' : other.traffic ? other : null; if (!party) return;
      if (st.npcs.filter(k => k.driverOf && alive(k)).length >= CFG.maxDrivers) return;
      const tr = { cor: .2 + rnd() * .8, loq: .3 + rnd() * .7, avid: rnd() * .7, legge: .2 + rnd() * .8 }, rage = .4 + rnd() * .4 + (v.hp < 60 ? .2 : 0);
      if (tr.cor < .35 || (tr.legge < .3 && rnd() < .5)) { v.panicT = st.clock; return; }   // tira dritto
      const a = spawnDriver(st, v, tr); if (!a) return;
      a.pop.need.rabbia = clamp(rage, 0, 1);
      if (party === 'player') {
        const ev = emit(st, 'incidente', 'player', a.id, v.x, v.y, placeName(v.x, v.y));
        G.addMemory(st, a, { eventId: ev.id, type: 'incidente', actor: 'player', target: a.id, owner: a.id, place: ev.place, t: st.t, conf: .95, source: 'visto' });
        say(st, a, ['Ma sei cieco?!', 'Guarda cosa hai fatto alla mia macchina!', 'Chi ti ha dato la patente?!'], 3);
        note(st, a, `${G.PLAYER_NAME} gli ha distrutto la macchina a ${ev.place}`, 'bad', { w: .7, tag: 'incidente' });
        if (tr.cor > .6 && rage > .55) { a.op.grudge = 1; brawl(st, a, 'player', { why: 'la macchina' }); }
        else startPlan(st, a, 'incidente', 'litiga e poi va a denunciare', [S.do('urla contro l\'altro guidatore', 8, () => 'next', { outside: true }),
          tr.legge > .55 ? S.go('va a denunciare l\'incidente', () => tgtOf('commissariato'), { outside: false, dur: 10, act: (st, n) => { const cop = st.npcs.find(k => k.cop && alive(k)); if (cop) G.addMemory(st, cop, { eventId: ev.id, type: 'incidente', actor: 'player', target: n.id, place: ev.place, t: ev.t, conf: .8, source: 'denuncia', via: [n.first] }); return 'next'; } }) : null,
          S.home('torna a casa a piedi, furioso')].filter(Boolean), 2);
        return;
      }
      const b = spawnDriver(st, party, { cor: .2 + rnd() * .8, loq: .3 + rnd() * .7, avid: rnd() * .7, legge: .2 + rnd() * .8 }); if (!b) return;
      b.pop.need.rabbia = clamp(.4 + rnd() * .4, 0, 1);
      quarrel(st, a, b, 'incidente');
      [a, b].forEach(k => { if (!k.pop.emer) startPlan(st, k, 'incidente', 'dopo l\'incidente', [S.do('discute dell\'incidente', 10, () => 'next', { outside: true }), S.home('torna a casa a piedi')], 1); });
    });
  }
  function spawnDriver(st, v, tr) {
    const [first, sur] = pick(Math.random, DRV_NAMES), home = pick(Math.random, ['stella', 'aurora', 'mare'].filter(has));
    st.pop.drvK = (st.pop.drvK || 0) + 1;
    const n = G.makeNpc(st, { id: 'aut' + st.pop.drvK, name: `${first} ${sur}`, role: 'Automobilista', home, tr, sched: [[0, home]], passante: true, look: v.driverLook || { skin: '#d8a982', top: '#5a6aa8', bottom: '#2a2a33', hair: '#2a1d14', hat: 'none', build: 1, extra: '' } });
    const side = v.ang + Math.PI / 2; n.x = v.x + Math.cos(side) * 1.6; n.y = v.y + Math.sin(side) * 1.6; if (!G.walkM(n.x, n.y)) { n.x = v.x - Math.cos(side) * 1.6; n.y = v.y - Math.sin(side) * 1.6; }
    n.driverOf = v.id; n.inside = false; n.face = v.ang;
    st.npcs.push(n); I.adopt(st, n); if (!n.pop) return null;
    n.pop.near = true; n.pop.lod = 'vicino'; initInv(st, n);
    v.traffic = false; v.stalled = true; v.rider = null; v.speed = 0; v._spd = 0; v.vx = v.vy = v.w = 0; v.owner = n.id;
    return n;
  }

  // ================= LA MENTE DAVANTI AI FATTI GRAVI =================
  function enemyTarget(st, n) { const P = n.pop; for (const id of P.enemies) { const k = G.byId(st, id); if (alive(k) && k.pop && !busyLaw(st, k)) return k; } return null; }
  I.PROJ.conti = { id: 'conti', need: true, label: (st, n, P, a) => `regolare i conti con ${nameOf(st, a.who)}`,
    arg: (st, n, P) => { if (P.need.rabbia < .75 || n.tr.legge > .3 || n.tr.cor < .65) return null; const k = enemyTarget(st, n); return k ? { who: k.id } : null; },
    steps: (st, n, P, a) => [{ k: 'go', ref: 'casa', h: 21, act: 'casa', label: `decide di farla finita con ${nameOf(st, a.who)}`, fx: (st, n) => { const k = G.byId(st, a.who); if (!alive(k)) return 'fail'; const r = intend(st, n, 'uccidi', { chi: k }, 3, `uccidere ${k.first}`); return r.ok ? 'done' : 'fail'; } }] };
  I.PROJ.lezione = { id: 'lezione', need: true, label: (st, n, P, a) => `dare una lezione a ${nameOf(st, a.who)}`,
    arg: (st, n, P) => { if (!['rocco', 'tano'].includes(n.id) || st.t - (P.lezLast || -1e9) < 2 * 1440) return null; const d = st.npcs.find(k => alive(k) && k.pop && k.pop.debt && k.pop.debt.to === 'sandro' && I.recent(st, k.pop, 'squalo', 7) && !busyLaw(st, k) && !(k.pop.lezT > st.t - 3 * 1440)); return d ? { who: d.id } : null; },
    steps: (st, n, P, a) => { const k = G.byId(st, a.who); if (!k) return null; k.pop.lezT = st.t; P.lezLast = st.t; return [{ k: 'go', ref: k.pop.homeT, h: 21, label: `va a trovare ${k.first} per conto dello Squalo`, fx: (st, n) => { const r = intend(st, n, n.tr.cor > .9 && rnd() < .3 ? 'minaccia' : 'picchia', { chi: k, perche: 'i soldi dello Squalo' }, 3); return r.ok ? 'done' : 'fail'; } }]; } };
  I.PROJ.coscienza = { id: 'coscienza', need: true, label: () => 'togliersi il peso dalla coscienza', arg: (st, n, P) => { const e = P.diary.find(e => (e.tag === 'segreto' || e.tag === 'omicidio') && st.t - e.t > 1440 && st.t - e.t < 6 * 1440); return e && n.tr.legge > .45 && P.need.paura > .4 ? { who: e.who } : null; },
    steps: (st, n, P) => [
      P.faith > .5 ? { k: 'go', ref: 'chiesa', h: 18, label: 'si confessa in chiesa', fx: (st, n, P) => { feel(n, 'paura', -.3); const pr = G.byId(st, 'pietro'); if (pr && pr.pop) note(st, pr, `${n.first} si è confessat${o(n)}: un peso grosso. Il segreto della confessione resta lì`, 'info', { w: .7, who: n.id, tag: 'segreto' }); return n.tr.legge > .75 ? 'next' : 'done'; } } : null,
      n.tr.legge > .6 ? { k: 'go', ref: 'commissariato', h: 10, label: 'va dalla Guardia a raccontare tutto', fx: (st, n) => { I.arrestFar(st, n, 'si è costituito'); n.jailedUntil = st.t + 2 * 1440; return 'done'; } } : null,
    ].filter(Boolean) };
  I.PROJ.giustizia = { id: 'giustizia', need: true, label: (st, n, P, a) => `avere giustizia per ${nameOf(st, a.who)}`, arg: (st, n, P) => I.recent(st, P, 'lutto', 3),
    steps: (st, n, P, a) => [
      { k: 'go', ref: 'commissariato', h: 10, label: `va in commissariato a chiedere chi ha ucciso ${nameOf(st, a.who)}`, fx: (st, n) => { feel(n, 'rabbia', .1); note(st, n, 'la Guardia ha detto che stanno indagando. Nessuno ci crede', 'bad', { w: .5 }); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .06, 0, 1); return 'next'; } },
      { k: 'go', ref: 'chiesa', h: 17, label: 'accende un cero per il morto', obj: 'cero' }] };
  I.REFLECT.push((st, n, thoughts) => {
    const P = n.pop;
    if (I.recent(st, P, 'arrivo', 2)) thoughts.push(['tutto nuovo, qui. Bisogna farsi conoscere', .5]);
    if (P.diary.some(e => e.tag === 'segreto' && st.t - e.t < 3 * 1440)) { feel(n, 'paura', .1); thoughts.push([n.tr.legge > .5 ? 'non riesco a dormire, ci penso sempre' : 'nessuno deve saperlo. Nessuno', .7]); }
    const seen = I.recent(st, P, 'omicidio', 2) || I.recent(st, P, 'cadavere', 2);
    if (seen && seen.place) { P.avoid[seen.place] = st.t + 4 * 1440; thoughts.push([`non passo più da ${seen.place}`, .65]); }
    const mo = I.recent(st, P, 'lutto', 3); if (mo) thoughts.push([`${nameOf(st, mo.who)} non c'è più, e nessuno pagherà`, .8]);
    if (I.recent(st, P, 'rissa', 2) || I.recent(st, P, 'offesa', 2)) thoughts.push(['la prossima volta non finisce così', .4]);
    if (I.recent(st, P, 'ferito', 3)) thoughts.push(['me l\'hanno fatta grossa', .6]);
  });

  // ================= IL GIOCATORE =================
  // le tasche: armi (quelle del motore) e attrezzi (le scorte della Risacca e quello che raccoglie). Prima si impugna, poi si usa.
  const RIS2ITEM = { attrezzi: 'piede', vernice: 'bomboletta', gesso: 'gesso', telefono: 'telefono', fotocamera: 'fotocamera' };
  function playerInv(st) {
    const p = st.player; p.inv = p.inv || {};
    const out = Object.assign({}, p.inv);
    if (st.ris) Object.entries(st.ris.inv || {}).forEach(([k, v]) => { const it = RIS2ITEM[k]; if (it && v > 0) out[it] = (out[it] || 0) + v; });
    return out;
  }
  function playerItems(st) {
    const p = st.player, inv = playerInv(st), list = [];
    Object.keys(p.arms).forEach(w => { if (G.WEAPONS[w]) list.push({ id: w, name: G.WEAPONS[w].name, kind: 'arma', count: p.arms[w].mag !== undefined ? p.arms[w].mag + (p.arms[w].res || 0) : null, on: p.cur === w && !p.hand }); });
    Object.entries(inv).forEach(([k, v]) => { if (ITEMS[k] && !ITEMS[k].weapon) list.push({ id: k, name: ITEMS[k].name, kind: 'attrezzo', count: v, on: p.hand === k }); });
    return list;
  }
  function playerEquip(st, id) {
    const p = st.player;
    if (!id) { p.hand = null; p.cur = 'pugni'; return true; }
    if (p.arms[id]) { p.cur = id; p.hand = null; return true; }
    if (playerInv(st)[id]) { p.hand = id; p.cur = 'pugni'; return true; }
    return false;
  }
  const handsFree = st => !st.player.hand && st.player.cur === 'pugni';
  const placeNear = (st, list, r) => { const p = st.player; let best = null, bd = r || 14; list.forEach(id => { const P0 = PLACES[id]; if (P0) { const d = dist(P0.x, P0.y, p.x, p.y); if (d < bd) { bd = d; best = id; } } }); return best; };
  // le azioni possibili qui e adesso, con quello che ha in mano
  function playerActions(st) {
    const p = st.player, out = [], add = (id, label, run, off) => out.push({ id, label, run, off: off || '' });
    if (p.vehicle || st.over) return out;
    const carried = corpses(st).find(c => c.corpse.leader === 'player');
    const c = carried || corpses(st).filter(c => !c.inside && !c.corpse.leader && !c.corpse.vehicle && dist(c.x, c.y, p.x, p.y) < 1.9).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    const car = st.vehicles.filter(v => !v.hidden && !v.wreck && !v.traffic && vCap(v) > 0 && dist(v.x, v.y, p.x, p.y) < 3.6).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
    if (carried) {
      const L = carried.corpse;
      add('posa', 'Posa il corpo', () => { putDown(st, 'player', carried); return 'Lo posi a terra.'; });
      if (car && vCap(car) >= L.weight) add('bagagliaio', `Mettilo nel bagagliaio (${G.vehicleName ? G.vehicleName(st, car) : car.kind})`, () => { L.vehicle = car.id; L.leader = null; carried.inside = true; watchPlayer(st, 'occultamento', carried); return 'Chiudi il bagagliaio. Nessuno ha visto niente. Speri.'; });
      const sea = placeNear(st, WATER, 10); if (sea) add('mare', 'Buttalo in mare', () => { vanish(st, 'player', carried, 'mare', ''); watchPlayer(st, 'occultamento', carried); if (rnd() < .4) st.timers.push({ at: st.t + 1440 + rnd() * 2880, kind: 'azResurface', corpse: carried.id }); return 'Un tonfo. L\'acqua nera si richiude.'; });
      const bin = placeNear(st, BINS, 10); if (bin) add('cassonetto', 'Buttalo nel cassonetto', () => { vanish(st, 'player', carried, 'cassonetto', ''); watchPlayer(st, 'occultamento', carried); if (rnd() < .6) st.timers.push({ at: st.t + 600 + rnd() * 1440, kind: 'azResurface', corpse: carried.id, where: 'discarica', by: 'netturbino' }); return 'Lo copri con i sacchi della spazzatura.'; });
      const hole = (st.pop.holes || []).find(h => !h.used && dist(h.x, h.y, p.x, p.y) < 2.5); if (hole) add('fossa', 'Mettilo nella fossa e coprila', () => { if (!p.hand || p.hand !== 'pala') return 'Ti serve la pala in mano per ricoprire la fossa.'; hole.used = true; carried.x = hole.x; carried.y = hole.y; bury(st, 'player', carried, placeName(hole.x, hole.y)); return 'Terra sopra terra. Ora è solo un pezzo di bosco.'; });
      if (placeNear(st, BURN, 12) && playerInv(st).benzina) add('fuoco', 'Cospargilo di benzina e dagli fuoco', () => { p.inv.benzina--; st.fires.push({ x: carried.x, y: carried.y, r: 1.4, until: st.clock + 20, owner: 'player' }); vanish(st, 'player', carried, 'bruciato', ''); smoke(st, carried.x, carried.y, placeName(carried.x, carried.y)); return 'Il fumo sale nero. Meglio andarsene.'; });
    } else if (c) {
      if (handsFree(st)) add('solleva', `Solleva ${c.corpse.name}`, () => { pickUp(st, 'player', c, 'spalla'); watchPlayer(st, 'occultamento', c); return 'Pesa più di quanto pensavi.'; });
      else add('solleva', `Solleva ${c.corpse.name}`, null, 'prima liberati le mani (Tasche → mani libere)');
      if (!c.corpse.robbed) add('fruga', 'Frugagli nelle tasche', () => { const g = 5 + Math.floor(rnd() * 30); p.money += g; c.corpse.robbed = true; return `${g}.000 lire. A lui non servono più.`; });
    }
    if (!carried && car) { const inCar = corpses(st).find(x => x.corpse.vehicle === car.id); if (inCar) add('scarica', 'Tira fuori il corpo dal bagagliaio', () => { if (!handsFree(st)) return 'Prima liberati le mani.'; inCar.corpse.vehicle = null; inCar.inside = false; pickUp(st, 'player', inCar, 'spalla'); return 'Lo tiri fuori dal bagagliaio.'; }); }
    // con quello che ha in mano
    const h = p.hand;
    if (h === 'pala') { const soft = placeNear(st, SOFT, 16); if (soft) add('scava', 'Scava una fossa', () => { p.task = { kind: 'scava', until: st.clock + 7, x: p.x, y: p.y }; return 'Cominci a scavare…'; }); else add('scava', 'Scava una fossa', null, 'qui la terra è troppo dura'); }
    if (h === 'telefono') {
      const cc = c || corpses(st).find(x => !x.inside && dist(x.x, x.y, p.x, p.y) < 20);
      add('guardia', 'Chiama la Guardia', () => { if (cc && !cc.corpse.called) { callGuard(st, 'player', cc, { kind: 'cadavere' }); return 'Una voce annoiata: «Mandiamo qualcuno».'; } return 'Dall\'altra parte riattaccano.'; });
      add('ambulanza', 'Chiama l\'ambulanza', () => { if (cc && !cc.corpse.called) { callGuard(st, 'player', cc, { kind: 'cadavere' }, 'ambulanza'); return 'Arrivano. Con calma.'; } return 'Non c\'è nessuno da soccorrere.'; });
      if (st.ris) add('banda', 'Scrivi alla banda: state lontani', () => { G.feed(st, 'Messaggio alla rete: «State lontani da qui stanotte.»', 'rumor'); return 'Inviato.'; });
    }
    if (h === 'bomboletta' || h === 'gesso' || h === 'pennello') { const wall = placeNear(st, WALLS, 14); if (wall) add('dipingi', h === 'gesso' ? 'Scrivi sul muro col gesso' : 'Dipingi il muro', () => { p.task = { kind: 'dipingi', until: st.clock + (h === 'pennello' ? 12 : h === 'gesso' ? 3 : 6), x: p.x, y: p.y, wall, tool: h }; return 'Ti guardi intorno e cominci.'; }); }
    { const inv = playerInv(st), wall = placeNear(st, WALLS, 14); if (inv.poster && wall) add('manifesti', 'Attacca i manifesti', inv.colla ? () => { const t0 = tgtOf(wall); p.inv.colla--; const q = Math.min(4, p.inv.poster); p.inv.poster -= q; st.pop.walls.push({ pk: tkey(t0), place: t0.label, t: st.t, by: 'player', text: 'un manifesto stampato a mano: «LA RISACCA SALE»', kind: 'scritta', style: 'manifesti' }); emitSeen(st, 'scritta', 'player', null, p.x, p.y, .6); if (st.ris) st.ris.morale = clamp(st.ris.morale + q, 0, 100); return `${q} manifesti sul muro. La colla è ancora fresca.`; } : null, inv.colla ? '' : 'serve la colla'); }   // [economia]
    if (h === 'fotocamera') add('foto', 'Scatta una foto', () => { emitSeen(st, 'foto', 'player', null, p.x, p.y, .5); return 'Clic.'; });
    // procurarsi le cose: dove si trovano, dove si comprano
    const tool = placeNear(st, ITEMS.pala.take, 10); if (tool && !playerInv(st).pala) add('prendi_pala', `Prendi una pala (${PLACES[tool].name})`, () => { p.inv.pala = 1; return 'Una pala. Potrebbe servire.'; });
    const tc = placeNear(st, ITEMS.carriola.take, 10); if (tc && !playerInv(st).carriola) add('prendi_carriola', 'Prendi una carriola', () => { p.inv.carriola = 1; return 'Una carriola cigolante.'; });
    Object.values(ITEMS).forEach(It => { if (!It.buy) return; Object.entries(It.buy).forEach(([where, price]) => { const t = where.startsWith('use:') ? useT(where.slice(4)).find(x => dist(x.x, x.y, p.x, p.y) < 6) : (has(where) && dist(PLACES[where].x, PLACES[where].y, p.x, p.y) < 7 ? tgtOf(where) : null); if (!t || out.some(x => x.id === 'compra_' + It.id)) return; if (ECO && !ECO.has(st, t, It.id)) { add('compra_' + It.id, `Compra ${It.name}`, null, 'finito: torna dopo la nave'); return; } const pr = ECO ? ECO.price(st, t, It.id, price) : price; add('compra_' + It.id, `Compra ${It.name} (${pr}.000)`, () => { if (p.money < pr) return 'Non hai abbastanza soldi.'; if (ECO) { const pm = p.money; if (!ECO.buy(st, null, t, It.id)) return 'È appena finito.'; p.money = pm - pr; } else p.money -= pr; if (It.weapon) { p.arms[It.weapon] = p.arms[It.weapon] || (G.WEAPONS[It.weapon].melee ? {} : { mag: G.WEAPONS[It.weapon].mag, res: G.WEAPONS[It.weapon].mag * 2 }); } else p.inv[It.id] = (p.inv[It.id] || 0) + 1; return `Comprato: ${It.name}.`; }); }); });
    return out;
  }
  // i gesti del giocatore li vede chi c'è, con le stesse regole degli altri
  function watchPlayer(st, type, c) {
    const p = st.player, place = placeName(p.x, p.y), ev = emit(st, type, 'player', c ? c.id : null, p.x, p.y, place);
    witnesses(st, p.x, p.y, [c ? c.id : '']).forEach(k => { G.addMemory(st, k, { eventId: ev.id, type, actor: 'player', target: c ? c.id : null, place, t: st.t, conf: .85, source: 'visto' }); react(st, k, { kind: 'trasporto', x: p.x, y: p.y, place, corpse: c, actor: 'player', carrier: { first: G.PLAYER_NAME, pop: null }, ev }); });
  }
  function playerTick(st) {
    const p = st.player, T = p.task;
    if (T) {
      if (dist(p.x, p.y, T.x, T.y) > 1.6 || p.vehicle) { p.task = null; G.feed(st, 'Hai smesso a metà.', 'bad'); }
      else if (st.clock >= T.until) {
        p.task = null;
        if (T.kind === 'scava') { (st.pop.holes = st.pop.holes || []).push({ x: p.x, y: p.y, t: st.t }); G.feed(st, 'La fossa è pronta.', 'job'); }
        if (T.kind === 'dipingi') { const fake = { first: G.PLAYER_NAME, pop: { want: {} }, tr: { cor: .8, loq: .6, legge: .2 } }; const t0 = tgtOf(T.wall); st.pop.walls.push({ pk: tkey(t0), place: t0.label, t: st.t, by: 'player', text: T.tool === 'pennello' ? 'un murale con l\'onda della Risacca' : T.tool === 'gesso' ? 'LA RISACCA SALE, col gesso' : 'l\'onda della Risacca, a spruzzo', kind: 'scritta', style: T.tool }); emitSeen(st, 'scritta', 'player', null, p.x, p.y, .6); if (st.ris) st.ris.morale = clamp(st.ris.morale + (T.tool === 'pennello' ? 5 : 3), 0, 100); G.feed(st, 'Il muro adesso parla.', 'job'); }
      }
    }
    const carried = corpses(st).find(c => c.corpse.leader === 'player');
    if (carried && st.clock - (p._carryChk || 0) > 2) { p._carryChk = st.clock; const list = witnesses(st, p.x, p.y, [carried.id]).filter(k => !(carried.corpse.seenCarry || {})[k.id]); if (list.length) { carried.corpse.seenCarry = carried.corpse.seenCarry || {}; list.forEach(k => { carried.corpse.seenCarry[k.id] = true; }); watchPlayer(st, 'occultamento', carried); } }
  }

  // ================= IL TEMPO DI SCENA =================
  const SCENE = { sbarazzati: 1, trasporta: 1, uccidi: 1, picchia: 1, rissa: 1, aiuta: 1, ruba: 1, scrivi_muro: 1, fruga: 1, piange: 1, incidente: 1, minaccia: 1 };
  function sceneTime(st, dt) {
    const p = st.player;
    let on = !!(p.task || corpses(st).some(c => c.corpse.leader === 'player'));
    if (!on) for (const n of st.npcs) { const E = n.pop && n.pop.emer; if (E && SCENE[E.kind] && n.pop.near && dist(n.x, n.y, p.x, p.y) < CFG.sceneR) { on = true; break; } }
    const want = on ? CFG.sceneK : 1, k = st.timeK || 1;
    st.timeK = k + (want - k) * Math.min(1, dt * 1.5);
    if (Math.abs(st.timeK - 1) < .01) st.timeK = 1;
    st.scene = on;
  }

  // ================= AGGANCI =================
  function install() {
    const H = G.HOOKS; if (H.__azioni) return; H.__azioni = true;
    Object.assign(G.SEV, { occultamento: .85, incidente: .3, furto_auto: .6 }); Object.assign(G.NOISE, { occultamento: 1, incidente: 10 });
    Object.assign(G.LABEL, { occultamento: 'Cadavere fatto sparire', incidente: 'Incidente' }); Object.assign(G.NEG, { occultamento: 1, incidente: 1 });
    const t0 = H.think, m0 = H.move, s0 = H.step, v0 = H.verb;
    H.think = (st, n) => {
      if (n.pop && n.pop.emer && alive(n) && !busyLaw(st, n) && !(n.panic > 0 && (n.pop.emer.prio || 0) < 3)) {
        const E = n.pop.emer, s = E.steps[E.i];
        n.action = { name: 'imprevisto', scores: [], why: `${cap(E.label)}: ${s ? s.label : ''}.`, since: n.action.name === 'imprevisto' ? n.action.since : st.clock };
        return true;
      }
      if (n.pop && n.pop.emer && n.panic > 0 && (n.pop.emer.prio || 0) < 3) endPlan(st, n, 'panico');
      return t0 ? t0(st, n) : false;
    };
    H.move = (st, n, dt, a) => { if (n.pop && n.pop.emer && (a === 'imprevisto' || !n.pop.near)) { runPlan(st, n, dt); return true; } return m0 ? m0(st, n, dt, a) : false; };
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const S0 = st.pop;
      for (const n of st.npcs) if (n.dead && !n._died && !n.gone && !n.corpse) onDeath(st, n);
      if (S0.births && S0.births.length) S0.births = S0.births.filter(b => { if (st.t < b.at) return true; I.newcomer(st, G.byId(st, b.of)); return false; });
      if (Math.floor(st.t / 60) !== S0.azStain) { S0.azStain = Math.floor(st.t / 60); stainsHour(st); }
      onTimers(st); crashes(st); followLoads(st); playerTick(st); sceneTime(st, dt);
      if (st.t - (S0.azScan || 0) >= 5) { S0.azScan = st.t; scanCorpses(st); }
      if (st.t - (S0.azSocial || 0) >= CFG.socialEvery) { S0.azSocial = st.t; socialize(st); }
      const hm = Math.floor(st.t / 60);
      if (S0.azHour !== hm) {
        S0.azHour = hm;
        st.npcs.forEach(n => {
          if (!alive(n) || !n.pop) return;
          initInv(st, n);
          if (n.hp < n.maxHp && !n.pop.emer) n.hp = Math.min(n.maxHp, n.hp + 4);
          // fame e niente soldi: chi non ha troppi scrupoli si arrangia
          const P = n.pop; if (!P.emer && !I.isPassive(st, n) && P.need.fame > .85 && P.money < 2 && P.pantry < 1 && n.tr.legge < .55 && !busyLaw(st, n)) intend(st, n, 'mangia', { modo: 'ruba' }, 2);
        });
        // una fossa poco profonda, un cane che scava…
        (S0.graves || []).forEach(g => { if (!g.found && rnd() < .002) { const c = G.byId(st, g.c); if (c && c.corpse.buried) { g.found = true; c.corpse.buried = null; c.inside = false; c.corpse.seen = {}; c.corpse.place = g.place; G.addLog(st, `${G.clockStr(st.t)} · Un cane ha scavato in ${g.place}: c'è un corpo.`, 'bad'); } } });
      }
    };
    H.verb = (st, m, T) => ({ occultamento: 'ha fatto sparire un cadavere', incidente: T === 'me' ? 'mi ha distrutto la macchina' : 'ha fatto un incidente' }[m.type] || (v0 ? v0(st, m, T) : null));
  }
  install();
  return { CFG, ITEMS, VERBS, SOFT, HIDDEN, WATER, BINS, can, intend, kill, brawl, quarrel, social, react, perceive, message, corpses, strength, startPlan, endPlan,
    killModes, transportModes, disposeModes, rel, moveRel, initInv, equip, give, takeAway, hasIn, getItem, setEconomy, playerItems, playerEquip, playerActions, playerInv, emit };
})();
if (typeof module !== 'undefined') module.exports = Azioni;
