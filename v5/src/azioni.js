/* Porto Vecchio — Le Azioni (solo logica, nessuna grafica).
   Azioni base con regole del mondo, che chiunque può fare ovunque abbiano senso, se lo vuole:
   litigare, picchiare, uccidere, scappare, sollevare e trascinare un corpo, prendere un attrezzo, scavare, seppellire,
   frugare, telefonare, mandare messaggi, chiamare la Guardia, soccorrere, piangere un morto, farsi medicare.
   Gli imprevisti (un cadavere, un omicidio visto, un incidente, una rissa, qualcuno che trascina un corpo) arrivano a chi
   c'è; ognuno sceglie la reazione dal carattere, da quello che sa e da chi è il morto. La reazione diventa un piano a passi
   (vai lì, fai questo, poi quello) che passa davanti alla giornata finché non è finito o non viene interrotto.
   La morte: il corpo resta dov'è; la persona rinasce all'ambulatorio senza memoria.
   Si aggancia a Game.HOOKS dopo la Risacca e il Popolo. Richiede popolo.js. */
var Azioni = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const I = Po._, PLACES = G.PLACES;
  const { note, feel, target, tkey, clamp, dist, o, cap, pick } = I;
  const rnd = Math.random;

  const CFG = {
    rebirth: [120, 300],   // minuti di gioco tra la morte e il risveglio all'ambulatorio
    sight: 13,             // a che distanza si nota un imprevisto (m)
    quarrelEvery: 20,      // minuti di gioco tra due giri di possibili liti
    maxDrivers: 10,        // automobilisti scesi dalle auto in giro contemporaneamente
  };

  // ---------------- FATTI DEL MONDO ----------------
  // dove la terra è morbida (si scava), dove non guarda nessuno, dove c'è una cabina, dove si trova una pala
  const SOFT = ['pineta', 'macchia', 'sugheri', 'radura', 'vigne', 'oliveto', 'discarica', 'sangiacomo', 'spiaggia', 'caletta', 'sentiero', 'monte', 'lago'];
  const HIDDEN = ['pineta', 'macchia', 'sugheri', 'radura', 'discarica', 'sentiero', 'lago', 'caletta'];
  const PHONES = ['piazza', 'bar', 'wu', 'molo', 'sirena', 'lungomare', 'calata', 'benzina', 'osteria', 'flipper', 'piazzetta', 'fontana'];
  const SHOVELS = ['cantiere', 'masseria', 'officina', 'discarica', 'vigne', 'oliveto', 'cava', 'sangiacomo'];
  const SHOVEL_JOBS = /braccian|vignaiol|cavator|carpent|salinar|sagrest|custode|muratore|scaricator/;
  const has = id => !!PLACES[id];
  const tgtOf = id => (has(id) ? target(id) : null);
  function nearest(list, x, y) { let b = null, bd = 1e9; list.forEach(id => { const t = tgtOf(id); if (t) { const d = dist(t.x, t.y, x, y); if (d < bd) { bd = d; b = t; } } }); return b; }
  const placeName = (x, y) => G.nearestPlace(x, y).name;
  const isNightT = t => { const h = Math.floor(t / 60) % 24; return h >= 21 || h < 6; };
  // la forza per sollevare un corpo: età, corporatura, salute
  function strength(n) {
    const P = n.pop, age = P ? P.age : 35, b = (n.look && n.look.build) || 1;
    const a = age < 16 ? .3 : age < 55 ? 1 : age < 65 ? .75 : age < 75 ? .5 : .3;
    return a * b * clamp(n.hp / (n.maxHp || 60), .2, 1);
  }
  const ownsShovel = n => !!(n.pop && (n.pop.owns.pala || (n.pop.job && SHOVEL_JOBS.test(n.pop.job.title || ''))));
  const hasCell = (st, n) => !!(n.ris && n.ris.member) || !!(n.pop && n.pop.owns && n.pop.owns.cellulare);
  // il telefono più vicino: quello di casa (se c'è), una cabina, o il cellulare della rete in tasca
  function phoneSpot(st, n) {
    if (hasCell(st, n)) return { here: true };
    const P = n.pop, cab = nearest(PHONES, n.x, n.y);
    if (P && P.owns.telefono && P.homeT) { if (!cab || dist(n.x, n.y, P.homeT.x, P.homeT.y) < dist(n.x, n.y, cab.x, cab.y) * 1.3) return P.homeT; }
    return cab;
  }
  const alive = n => n && !n.dead && !n.corpse;
  const busyWithLaw = (st, n) => n.jailedUntil > st.t || n.hospUntil > st.t;

  // ---------------- PIANI D'EMERGENZA ----------------
  // passi: { label, at(st,n,E) → bersaglio {x,y,label} | null, dur (minuti sul posto), act(st,n,E) → 'next'|'stop'|'wait', carry, run, slow }
  function startPlan(st, n, kind, label, steps, prio) {
    const P = n.pop; if (!P || !alive(n)) return null;
    if (P.emer && (P.emer.prio || 0) > (prio || 1)) return null;
    if (P.emer) endPlan(st, n, 'interrotto');
    P.emer = { kind, label, steps, i: 0, phase: 'go', t0: st.t, started: st.t, prio: prio || 1, goal: null, arr: 0 };
    st.pop.stats.reazioni = (st.pop.stats.reazioni || 0) + 1;
    return P.emer;
  }
  function endPlan(st, n, why) {
    const P = n.pop, E = P && P.emer; if (!E) return;
    dropCorpse(st, n);
    if (E.kind === 'rissa') n.gesture = 0;
    P.emer = null; n.path = []; P.curKey = ''; P.goalSet = false;
    if (n.action && n.action.name === 'imprevisto') n.action = { name: 'routine', scores: [], why: '', since: st.clock };
  }
  function runPlan(st, n, dt) {
    const P = n.pop, E = P.emer;
    if (!alive(n) || busyWithLaw(st, n)) return endPlan(st, n, 'interrotto');
    if (st.t - E.started > 18 * 60) return endPlan(st, n, 'scaduto');
    const s = E.steps[E.i]; if (!s) return endPlan(st, n, 'fatto');
    const near = P.near && !n.inside;
    if (E.phase === 'go') {
      const t = s.at ? s.at(st, n, E) : null;
      if (s.at && !t) { if (s.must) return endPlan(st, n, 'sparito'); E.i++; return; }   // il posto non c'è più: passo saltato (o piano finito)
      if (!t) { E.phase = 'do'; E.t0 = st.t; return; }
      if (P.near) {
        if (n.inside) { const from = P.at || P.homeT; if (from) { n.x = from.x; n.y = from.y; } n.inside = false; }
        if (!E.goal || dist(E.goal.x, E.goal.y, t.x, t.y) > 2) { E.goal = { x: t.x, y: t.y }; G.goTo(n, t.x, t.y); }
        const sp = (s.run ? 3.4 : 1.5) * (s.carry ? (E.slow || .7) : 1);
        const arrived = G.stepAlong(n, sp, dt) || dist(n.x, n.y, t.x, t.y) < 1.3;
        carryCorpse(st, n);
        if (arrived) { E.phase = 'do'; E.t0 = st.t; E.goal = null; n.speedNow = 0; if (t.k) P.at = t; if (s.inside) n.inside = true; }
      } else {
        if (!E.arr) E.arr = st.t + 3 + dist(n.x, n.y, t.x, t.y) / (s.run ? 18 : 10) / (s.carry ? (E.slow || .7) : 1);
        if (st.t >= E.arr) { n.x = t.x; n.y = t.y; if (t.k) P.at = t; carryCorpse(st, n); E.phase = 'do'; E.t0 = st.t; E.arr = 0; n.inside = !s.outside; }
      }
      if (s.carry) seenCarrying(st, n);
      return;
    }
    // sul posto
    if (near) { n.speedNow = 0; carryCorpse(st, n); }
    if (s.tick) s.tick(st, n, E, dt);
    if (st.t - E.t0 < (s.dur || 0)) return;
    const res = s.act ? s.act(st, n, E) : 'next';
    if (res === 'wait') return;
    if (res === 'stop') return endPlan(st, n, 'fatto');
    E.i++; E.phase = 'go'; E.goal = null; E.arr = 0;
    if (E.i >= E.steps.length) endPlan(st, n, 'fatto');
  }
  const goHome = (label, extra) => Object.assign({ label: label || 'torna a casa', at: (st, n) => n.pop.homeT, dur: 5, inside: true }, extra || {});

  // ---------------- IL CORPO ----------------
  function corpses(st) { return st.npcs.filter(c => c.corpse && !c.corpse.gone && !c.corpse.buried); }
  function makeCorpse(st, n, killer) {
    st.pop.corpseN = (st.pop.corpseN || 0) + 1;
    const c = {
      id: 'corpo' + st.pop.corpseN, name: `il corpo di ${n.name}`, first: n.first, role: 'Morto', look: JSON.parse(JSON.stringify(n.look || {})),
      x: n.x, y: n.y, face: n.face, dead: true, hp: 0, maxHp: n.maxHp || 60, inside: false, path: [], goal: null, mem: [], reported: {},
      action: { name: 'morto', scores: [], why: 'È morto.', since: st.clock }, op: { fear: 0, trust: 0, grudge: 0 }, tr: n.tr, passante: true,
      home: n.home, sched: n.sched || [[0, n.home]], stun: 0, jailedUntil: 0, speedNow: 0, anim: 0, gesture: 0, panic: 0, wait: 0, alert: 0, hitT: -99,
      deathT: st.clock, bark: null, barkCd: 0, thinkAt: 1e9, mag: 0, cool: 0, kbx: 0, kby: 0,
      corpse: { of: n.id, name: n.name, t: st.t, killer: killer || null, place: placeName(n.x, n.y), seen: {}, gone: false, buried: null, carriedBy: null, robbed: false, called: false },
    };
    st.npcs.push(c);
    return c;
  }
  function carryCorpse(st, n) {
    const c = n.pop.carrying && G.byId(st, n.pop.carrying); if (!c) return;
    const a = n.face + Math.PI; c.x = n.x + Math.cos(a) * .7; c.y = n.y + Math.sin(a) * .7; c.face = n.face; c.inside = n.inside && !n.pop.near;
  }
  function dropCorpse(st, n) {
    const P = n.pop, c = P && P.carrying && G.byId(st, P.carrying); if (!c) return;
    c.corpse.carriedBy = null; c.inside = false; P.carrying = null;
  }
  function bury(st, n, c, place) {
    c.corpse.buried = { place, by: n.id, t: st.t }; c.corpse.carriedBy = null; c.inside = true; n.pop.carrying = null;
    st.pop.graves = st.pop.graves || []; st.pop.graves.push({ of: c.corpse.of, name: c.corpse.name, place, by: n.id, t: st.t, x: n.x, y: n.y });
    st.pop.stats.sepolti = (st.pop.stats.sepolti || 0) + 1;
    note(st, n, `ha seppellito ${c.corpse.name} in ${place}. Non lo dirà a nessuno`, 'shady', { w: 1, place, tag: 'segreto', who: c.corpse.of });
    feel(n, 'paura', .2); feel(n, 'igiene', 1);
    emit(st, 'occultamento', n, c.corpse.of, n.x, n.y, place, true);
  }
  // un evento nel registro del motore, perché chi lo vede possa ricordarlo, raccontarlo, denunciarlo
  function emit(st, type, actor, target, x, y, place, secret) {
    const ev = { id: st.nextId++, type, actor: actor ? (actor === 'player' ? 'player' : actor.id) : 'ignoto', target: target || null, owner: target || null, x, y, t: st.t, sev: G.SEV[type] || .5, noise: 0, place, npcCrime: actor !== 'player', secret: !!secret };
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    return ev;
  }

  // ---------------- LA MORTE E IL RISVEGLIO ----------------
  function onDeath(st, n) {
    n._died = true;
    const ev = st.events.find(e => e.type === 'omicidio' && e.target === n.id && st.t - e.t < 10);
    const killer = n.killedBy || (ev && ev.actor) || null;
    const c = makeCorpse(st, n, killer);
    // la persona sparisce dalla strada: si risveglierà all'ambulatorio
    if (n.pop) { if (n.pop.emer) endPlan(st, n, 'morto'); n.pop.carrying = null; }
    const amb = tgtOf('ambulatorio') || { x: n.x, y: n.y };
    n.inside = true; n.x = amb.x; n.y = amb.y; n.path = [];
    st.pop.rebirths = st.pop.rebirths || [];
    st.pop.rebirths.push({ id: n.id, at: st.t + CFG.rebirth[0] + rnd() * (CFG.rebirth[1] - CFG.rebirth[0]) });
    st.pop.stats.morti = (st.pop.stats.morti || 0) + 1;
    if (n.ris && n.ris.member) {
      n.ris.member = false; n.ris.task = null;
      if (st.ris) { st.ris.morale = clamp(st.ris.morale - 6, 0, 100); G.feed(st, `${n.first} è morto. I suoi pezzi sui muri restano.`, 'bad'); }
    }
    // chi ha visto
    perceive(st, { kind: killer ? 'omicidio' : 'morte', x: c.x, y: c.y, place: c.corpse.place, corpse: c, actor: killer, ev });
  }
  function rebirth(st, n) {
    n.dead = false; n.hp = n.maxHp || 60; n.stun = 0; n.panic = 0; n.aggro = false; n.alert = 0; n.mem = []; n.reported = {};
    n.op = { fear: 0, trust: 0, grudge: 0 }; n.bark = null; n._died = false; n.killedBy = null;
    const amb = tgtOf('ambulatorio'); if (amb) { n.x = amb.x; n.y = amb.y; }
    n.inside = true; n.action = { name: 'dentro', scores: [], why: 'Si è appena svegliato all\'ambulatorio.', since: st.clock };
    if (n.ris) Object.assign(n.ris, { member: false, task: null, loyalty: 0, bond: 0, persuade: 0, notes: [], joinedAt: null, fatigue: 0 });
    if (st.ris && st.ris.chats) st.ris.chats[n.id] = [];
    const P = n.pop;
    if (P) {
      Object.assign(P, { diary: [], thoughts: [], projects: [], history: [], enemies: [], avoid: {}, friends: [], started: {}, readWalls: {}, today: [], yesterday: [], appt: null, emer: null, carrying: null, thrift: false, selfCurfew: 0, amnesia: st.t });
      Object.keys(P.want || {}).forEach(k => { P.want[k] = .2; });
      Object.assign(P.need, { fame: .6, sonno: .3, igiene: .5, compagnia: .7, svago: .5, rabbia: 0, paura: .5 });
      if (amb) P.at = amb;
      note(st, n, 'si è svegliat' + o(n) + ' all\'ambulatorio. Non ricorda niente: chi è, chi conosce, cosa è successo', 'bad', { w: 1, tag: 'rinato', place: 'Ambulatorio' });
      const hh = st.pop.households[P.hh];
      (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k !== n && k.pop) { note(st, k, `${n.first} è tornat${o(n)} dall'ambulatorio: è viv${o(n)}, ma non riconosce più nessuno`, 'bad', { w: .85, who: n.id, tag: 'rinato' }); feel(k, 'paura', .2); } });
      I.planDay(st, n, I.dayIdx(st.t));
    }
    st.pop.stats.rinati = (st.pop.stats.rinati || 0) + 1;
    G.addLog(st, `${G.clockStr(st.t)} · ${n.name} si è svegliato all'ambulatorio senza memoria.`, 'info');
  }
  // uccidere: lo può fare chiunque, con le stesse conseguenze di quando lo fa il giocatore
  function kill(st, killer, victim, how) {
    if (!alive(victim)) return;
    victim.dead = true; victim.hp = 0; victim.deathT = st.clock; victim.path = []; victim.stun = 0; victim.panic = 0; victim.bark = null;
    victim.face = killer && killer.x !== undefined ? Math.atan2(victim.y - killer.y, victim.x - killer.x) : victim.face;
    victim.action = { name: 'morto', scores: [], why: 'È morto.', since: st.clock }; victim.killedBy = killer === 'player' ? 'player' : killer.id;
    st.fx.push({ k: 'bloodpool', x: victim.x, y: victim.y });
    const place = placeName(victim.x, victim.y);
    emit(st, 'omicidio', killer, victim.id, victim.x, victim.y, place);
    G.addLog(st, `${G.clockStr(st.t)} · ${victim.name} è stato ucciso${how ? ` (${how})` : ''} a ${place}.`, 'bad');
    if (killer !== 'player' && killer.pop) {
      note(st, killer, `ha ucciso ${victim.first}${how ? ` (${how})` : ''}`, 'shady', { w: 1, who: victim.id, place, tag: 'omicidio' });
      feel(killer, 'paura', .5); feel(killer, 'rabbia', -.6);
      st.pop.stats.omicidi = (st.pop.stats.omicidi || 0) + 1;
    }
  }

  // ---------------- PERCEZIONE DEGLI IMPREVISTI ----------------
  // chi c'è se ne accorge: da vicino con gli occhi (nel motore), da lontano se si trova nello stesso posto
  function witnesses(st, x, y, exclude) {
    const out = [];
    st.npcs.forEach(k => {
      if (!alive(k) || !k.pop || exclude.includes(k.id) || busyWithLaw(st, k)) return;
      if (k.pop.near && !k.inside) { if (dist(k.x, k.y, x, y) < CFG.sight && G.canSee(st, k, x, y)) out.push(k); }
      else if (!k.pop.near && k.pop.at && dist(k.pop.at.x, k.pop.at.y, x, y) < 16 && (k.pop.at.k === 'p' || rnd() < .25)) out.push(k);
    });
    return out;
  }
  function perceive(st, imp) {
    const ex = [imp.actor && imp.actor.id ? imp.actor.id : imp.actor, imp.victim && imp.victim.id].filter(Boolean);
    const list = witnesses(st, imp.x, imp.y, ex);
    list.forEach(k => {
      if (imp.corpse) imp.corpse.corpse.seen[k.id] = st.t;
      if (imp.ev && imp.ev.id) G.addMemory(st, k, { eventId: imp.ev.id, type: imp.ev.type, actor: imp.ev.actor, target: imp.ev.target, owner: imp.ev.owner, place: imp.place, t: st.t, conf: .9, source: 'visto' });
      react(st, k, imp);
    });
    // il killer stesso (un abitante) decide cosa fare del corpo
    if (imp.kind === 'omicidio' && imp.actor && imp.actor !== 'player') { const k = G.byId(st, imp.actor); if (k && k.pop) react(st, k, Object.assign({}, imp, { self: true })); }
    return list.length;
  }
  // ogni tanto: chi passa vicino a un corpo che nessuno ha ancora portato via
  function scanCorpses(st) {
    corpses(st).forEach(c => {
      if (c.corpse.carriedBy) return;
      witnesses(st, c.x, c.y, []).forEach(k => {
        if (c.corpse.seen[k.id] || (!k.pop.near && rnd() > (c.corpse.hidden ? .03 : .5))) return;
        if (c.corpse.hidden && k.pop.near && dist(k.x, k.y, c.x, c.y) > 3) return;
        c.corpse.seen[k.id] = st.t;
        react(st, k, { kind: 'cadavere', x: c.x, y: c.y, place: c.corpse.place, corpse: c, actor: c.corpse.killer });
      });
    });
  }
  // qualcuno che trascina un corpo, visto da vicino: si ricorda e reagisce
  function seenCarrying(st, n) {
    const E = n.pop.emer; if (!E || st.clock - (E.seenChk || 0) < 1.5) return; E.seenChk = st.clock;
    const c = G.byId(st, n.pop.carrying); if (!c) return;
    const night = isNightT(st.t), list = witnesses(st, n.x, n.y, [n.id]).filter(k => !E.seenBy || !E.seenBy[k.id]).filter(k => k.pop.near || rnd() < (night ? .15 : .5));
    if (!list.length) return;
    E.seenBy = E.seenBy || {};
    const ev = E.carryEv || (E.carryEv = emit(st, 'occultamento', n, c.corpse.of, n.x, n.y, placeName(n.x, n.y)));
    list.forEach(k => { E.seenBy[k.id] = true; G.addMemory(st, k, { eventId: ev.id, type: 'occultamento', actor: n.id, target: c.corpse.of, place: ev.place, t: st.t, conf: .85, source: 'visto' }); react(st, k, { kind: 'trasporto', x: n.x, y: n.y, place: ev.place, corpse: c, actor: n.id, carrier: n }); });
  }

  // ---------------- LE REAZIONI ----------------
  // per ogni imprevisto, le scelte possibili con il loro peso: carattere, paura, legami con il morto e con chi l'ha ucciso
  function react(st, n, imp) {
    const P = n.pop; if (!P || !alive(n)) return;
    if (P.emer && (P.emer.prio || 0) >= 3) return;
    const N = P.need, t = n.tr, c = imp.corpse, victim = c ? G.byId(st, c.corpse.of) : imp.victim || null;
    const killer = imp.actor && imp.actor !== 'player' ? G.byId(st, imp.actor) : null, byPlayer = imp.actor === 'player';
    const relV = victim ? I.closeness(st, n, victim) : 0, relK = killer && killer !== n ? I.closeness(st, n, killer) : 0;
    const me = imp.self || (killer && killer === n);
    const shady = !!(P.giro && P.giro !== 'orecchio');
    const vname = victim ? (relV > .5 || victim.pop && victim.pop.cast ? victim.first : 'uno sconosciuto') : 'qualcuno';
    const where = imp.place;
    // la prima emozione
    if (!me) { feel(n, 'paura', .25 + (imp.kind === 'omicidio' ? .2 : 0)); if (relV > .5) feel(n, 'rabbia', .4); }
    if (n.cop) { // la Guardia in servizio: rapporto e rimozione
      if (c && !c.corpse.called) callGuard(st, n, c, imp); return;
    }
    const opts = [];
    const add = (k, v, plan) => opts.push([k, v + rnd() * .15, plan]);
    if (me) {
      add('nasconde', (1 - t.legge) * .9 + t.cor * .6 + (isNightT(st.t) ? .3 : 0) - witnessesNear(st, imp) * .25, () => planHide(st, n, c));
      add('scappa', N.paura * .8 + .4, () => planFlee(st, n, imp));
      add('costituisce', t.legge * 1.2 - .5, () => planSurrender(st, n, c));
    } else if (imp.kind === 'trasporto') {
      add('chiama', t.legge * 1.1 + relV * .6 - (relK > .6 ? 1 : 0) - (shady ? .5 : 0), () => planCall(st, n, c, imp));
      add('scappa', N.paura * .9 + (1 - t.cor) * .4, () => planFlee(st, n, imp));
      add('aiuta', relK > .6 && t.legge < .5 ? .8 + t.cor * .4 : 0, () => planHelpCarry(st, n, imp.carrier));
      add('ignora', .35 + (shady ? .3 : 0), null);
    } else {
      add('chiama', (t.legge * 1.1 + N.paura * .2 + relV * .5) * (relK > .6 ? .25 : 1) * (shady ? .35 : 1) - (byPlayer && n.ris && n.ris.ideo > .7 ? .3 : 0), () => planCall(st, n, c, imp));
      add('scappa', N.paura * .8 + (1 - t.cor) * .55 + (imp.kind === 'omicidio' ? .35 : 0), () => planFlee(st, n, imp));
      if (relV > .5) add('piange', 1.2 + relV * .4, () => planMourn(st, n, c, imp));
      if (c && killer && relK > .6 && t.legge < .5 && strength(n) > .5) add('nasconde', .8 + t.cor * .5 - t.legge * .5, () => planHide(st, n, c));
      if (c && shady && t.legge < .3 && t.cor > .6 && imp.kind === 'cadavere' && strength(n) > .6) add('nasconde', .45, () => planHide(st, n, c));
      if (c && !c.corpse.robbed && relV < .5) add('fruga', t.avid * (1 - t.legge) * .9 - N.paura * .3, () => planRob(st, n, c));
      if (imp.kind === 'omicidio' && killer && alive(killer) && relV > .5 && t.cor > .6) add('affronta', relV + N.rabbia * .5 + t.cor * .3 - N.paura * .5, () => planFight(st, n, killer, { lethal: N.rabbia > .85 && t.legge < .25, why: `per ${victim ? victim.first : 'il morto'}` }));
      if (P.giro === 'orecchio' || (n.id === 'marta')) add('riferisce', .9, () => planTellZia(st, n, imp));
      add('ignora', .3, null);
    }
    opts.sort((a, b) => b[1] - a[1]);
    const [kind, , mk] = opts[0];
    const what = { omicidio: `visto uccidere ${vname}`, morte: `visto morire ${vname}`, cadavere: `trovato ${c && relV > .5 ? `il corpo di ${vname}` : 'un cadavere'}`, trasporto: `visto ${imp.carrier ? imp.carrier.first : 'qualcuno'} trascinare un corpo` }[imp.kind] || 'visto qualcosa di brutto';
    const said = { chiama: 'ha chiamato la Guardia', scappa: `è scappat${o(n)} via`, piange: 'non riesce a smettere di piangere', nasconde: 'ha deciso di far sparire il corpo', fruga: 'gli ha frugato nelle tasche', affronta: `è andat${o(n)} a cercare l'assassino`, riferisce: 'corre a dirlo alla Zia', ignora: 'ha fatto finta di niente', costituisce: 'va a costituirsi', aiuta: 'lo aiuta a portarlo via' }[kind];
    if (!me) note(st, n, `${what} a ${where}: ${said}`, imp.kind === 'trasporto' || imp.kind === 'omicidio' ? 'bad' : 'bad', { w: .9, place: where, who: victim ? victim.id : null, tag: imp.kind });
    if (killer && !me && imp.kind !== 'cadavere' && !P.enemies.includes(killer.id) && relK < .6) P.enemies.push(killer.id);
    if (P.near && !n.inside) G.say(st, n, pick(Math.random, LINES[kind] || LINES.ignora), 2.6);
    if (mk) mk();
    // chi è nella rete della Risacca lo scrive alla banda
    if (n.ris && n.ris.member && st.ris) message(st, n, 'giocatore', `${cap(what)} a ${where}. ${kind === 'chiama' ? 'Ho chiamato la Guardia, girate al largo.' : 'Non venite da queste parti.'}`);
  }
  const witnessesNear = (st, imp) => witnesses(st, imp.x, imp.y, [imp.actor]).length;
  const LINES = {
    chiama: ['Madonna santa! Chiamate qualcuno!', 'Vado al telefono, chiamo la Guardia!', 'Non toccate niente!'], scappa: ['No no no…', 'Io non ho visto niente!', 'Via, via di qui!'],
    piange: ['No! Non lui!', 'Svegliati, ti prego…', 'Chi è stato? CHI È STATO?'], nasconde: ['Zitto. Dammi una mano.', 'Non deve trovarlo nessuno.', 'Prima che arrivino i Grigi…'],
    fruga: ['A lui non servono più…', 'Vediamo cosa c\'è…'], affronta: ['Tu! Assassino!', 'Adesso la paghi!'], riferisce: ['Questa la deve sapere la Zia…'], ignora: ['Non sono affari miei.', '…'], costituisce: ['Che ho fatto…'], aiuta: ['Ti do una mano, sbrighiamoci.'],
  };

  // ---------------- I PIANI ----------------
  function planCall(st, n, c, imp) {
    const ph = phoneSpot(st, n);
    const steps = [];
    if (ph && !ph.here) steps.push({ label: 'corre al telefono più vicino', at: () => ph, dur: 2, run: true, outside: ph.k === 'p' });
    steps.push({ label: 'telefona alla Guardia', dur: 6, act: (st, n) => { if (c && !c.corpse.called) callGuard(st, n, c, imp); else if (imp.kind === 'trasporto' && imp.carrier) reportTo(st, n, imp); return 'next'; } });
    steps.push(goHome('torna a casa sconvolto'));
    return startPlan(st, n, 'chiama', 'chiama la Guardia', steps, 2);
  }
  function planFlee(st, n, imp) {
    feel(n, 'paura', .2);
    return startPlan(st, n, 'scappa', 'scappa a casa', [goHome('scappa a casa', { run: true, dur: 30, act: (st, n) => { const hh = st.pop.households[n.pop.hh]; (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k !== n && k.pop) { I.share(st, n, k); } }); return 'next'; } })], 2);
  }
  function planMourn(st, n, c, imp) {
    const steps = [
      { label: 'corre dal corpo', at: () => c && !c.corpse.gone && !c.corpse.buried ? { x: c.x + .8, y: c.y, label: c.corpse.place } : null, run: true, dur: 0, outside: true },
      { label: `piange su ${c ? c.corpse.name : 'il corpo'}`, dur: 25, act: (st, n) => { feel(n, 'rabbia', .2); feel(n, 'compagnia', .3); return 'next'; } },
    ];
    if (n.tr.legge > .3 && c && !c.corpse.called) steps.push({ label: 'chiede a qualcuno di chiamare la Guardia', dur: 5, act: (st, n) => { callGuard(st, n, c, imp); return 'next'; } });
    steps.push(goHome('torna a casa distrutto'));
    if (c && c.corpse.killer && c.corpse.killer !== 'player' && n.tr.cor > .55) { const k = G.byId(st, c.corpse.killer); if (k && !n.pop.enemies.includes(k.id)) n.pop.enemies.push(k.id); }
    return startPlan(st, n, 'piange', 'piange il morto', steps, 2);
  }
  function planRob(st, n, c) {
    return startPlan(st, n, 'fruga', 'fruga il morto', [
      { label: 'si avvicina al corpo', at: () => c && !c.corpse.gone && !c.corpse.carriedBy ? { x: c.x + .6, y: c.y, label: c.corpse.place } : null, dur: 0, outside: true },
      { label: 'gli fruga nelle tasche', dur: 3, act: (st, n) => { if (!c.corpse.robbed) { const g = 5 + Math.floor(rnd() * 30); n.pop.money += g; c.corpse.robbed = true; note(st, n, `preso ${g}.000 lire dalle tasche di un morto`, 'shady', { w: .7, tag: 'segreto' }); } return 'next'; } },
      goHome('se ne va in fretta', { run: true }),
    ], 2);
  }
  // nascondere un corpo: prendere una pala (se non ce l'ha), sollevarlo, trascinarlo dove non guarda nessuno, scavare, seppellire
  function planHide(st, n, c) {
    if (!c || c.corpse.gone || c.corpse.buried || c.corpse.carriedBy) return null;
    const steps = [];
    const corpseAt = () => (c.corpse.gone || c.corpse.buried || (c.corpse.carriedBy && c.corpse.carriedBy !== n.id) ? null : { x: c.x + .6, y: c.y, label: c.corpse.place });
    const lift = (st, n, E) => {
      if (c.corpse.gone || c.corpse.buried || (c.corpse.carriedBy && c.corpse.carriedBy !== n.id)) return 'stop';
      if (c.corpse.carriedBy === n.id) return 'next';
      const f = strength(n) + (E.helperHere ? .6 : 0);
      if (f < .45) { if (!E.askedHelp) { E.askedHelp = true; note(st, n, `non ce la fa a sollevare ${c.corpse.name} da sol${o(n)}`, 'bad', { w: .4 }); if (askHelp(st, n, c, E)) return 'wait'; } else if (E.helper && !E.helperHere && st.t - E.t0 < 120) return 'wait'; return 'stop'; }
      c.corpse.carriedBy = n.id; n.pop.carrying = c.id; E.slow = f > .9 ? .85 : .55;
      note(st, n, f > .9 ? `caricato ${c.corpse.name} in spalla` : `trascina ${c.corpse.name} a fatica`, 'shady', { w: .6, tag: 'segreto' });
      return 'next';
    };
    const woods = nearest(HIDDEN.filter(id => SOFT.includes(id)), c.x, c.y);
    const inWoods = woods && dist(woods.x, woods.y, c.x, c.y) < 20;
    // 1. subito: toglierlo dalla vista (trascinarlo tra i cespugli se non ci è già, e coprirlo di frasche)
    steps.push({ label: 'si china sul corpo', must: true, at: corpseAt, dur: 1, outside: true, act: lift });
    if (!inWoods) steps.push({ label: `lo trascina verso ${woods ? woods.label : 'il bosco'}`, at: () => (woods ? spotNear(woods) : null), carry: true, dur: 0, outside: true });
    steps.push({ label: 'lo copre di frasche', dur: 8, outside: true, act: (st, n) => { if (c.corpse.carriedBy === n.id) dropCorpse(st, n); c.corpse.hidden = true; note(st, n, `nascosto ${c.corpse.name} tra i cespugli`, 'shady', { w: .8, tag: 'segreto' }); return 'next'; } });
    // 2. la pala
    if (!n.pop.owns.pala) {
      const sh = ownsShovel(n) && n.pop.homeT ? n.pop.homeT : nearest(SHOVELS, c.x, c.y);
      steps.push({ label: sh === n.pop.homeT ? 'passa a casa a prendere la pala' : `va a prendere una pala a ${sh ? sh.label : ''}`, at: () => sh, dur: 4, outside: sh !== n.pop.homeT, act: (st, n) => { n.pop.owns.pala = true; return 'next'; } });
    }
    // 3. tornare, scavare, seppellire
    steps.push({ label: 'torna dove l\'ha nascosto', must: true, at: corpseAt, dur: 1, outside: true, act: lift });
    steps.push({ label: 'scava una fossa', dur: 40 + 60 * (1 - Math.min(1, strength(n))), outside: true, tick: (st, n) => { n.gesture = (st.clock % 1.2) < .5 ? .4 : 0; carryCorpse(st, n); }, act: (st, n) => (n.pop.owns.pala ? 'next' : 'stop') });
    steps.push({ label: 'seppellisce il corpo', dur: 15, outside: true, act: (st, n) => { if (c.corpse.gone || c.corpse.carriedBy !== n.id) return 'stop'; bury(st, n, c, woods && dist(n.x, n.y, woods.x, woods.y) < 30 ? woods.label : placeName(n.x, n.y)); return 'next'; } });
    steps.push(goHome('torna a casa a lavarsi', { act: (st, n) => { feel(n, 'igiene', -1); return 'next'; } }));
    return startPlan(st, n, 'nasconde', `far sparire ${c.corpse.name}`, steps, 3);
  }
  const spotNear = t => (t.k === 'p' && PLACES[t.pid] ? { x: PLACES[t.pid].x + (rnd() - .5) * 6, y: PLACES[t.pid].y + (rnd() - .5) * 6, label: t.label } : t);
  // chiedere aiuto: telefono o cellulare, a un amico che non fa troppe domande
  function askHelp(st, n, c, E) {
    const fr = (n.pop.friends || []).map(id => G.byId(st, id)).find(k => alive(k) && k.pop && !k.pop.emer && k.tr.legge < .55 && strength(k) > .6 && !busyWithLaw(st, k));
    if (!fr) return false;
    if (!message(st, n, fr, `Ho bisogno di te, subito, a ${c.corpse.place}. Non fare domande.`)) return false;
    E.helper = fr.id;
    startPlan(st, fr, 'aiuta', `aiutare ${n.first}`, [
      { label: `corre da ${n.first} a ${c.corpse.place}`, at: () => ({ x: c.x + 1, y: c.y + .5, label: c.corpse.place }), run: true, dur: 2, outside: true, act: (st, k) => { note(st, k, `aiutato ${n.first} a portare via ${c.corpse.name}`, 'shady', { w: 1, who: n.id, tag: 'segreto' }); E.helperHere = true; return 'next'; } },
      { label: `segue ${n.first}`, at: () => ({ x: n.x + .9, y: n.y + .6, label: '' }), dur: 0, outside: true, act: () => (n.pop.emer === E && E.i <= E.steps.length - 2 ? 'wait' : 'next') },
      goHome('torna a casa senza dire niente'),
    ], 3);
    return true;
  }
  function planHelpCarry(st, n, carrier) {
    if (!carrier || !carrier.pop || !carrier.pop.emer) return null;
    const E = carrier.pop.emer; E.slow = Math.max(E.slow || .55, .85);
    note(st, n, `aiutato ${carrier.first} a portare via un corpo`, 'shady', { w: 1, who: carrier.id, tag: 'segreto' });
    return startPlan(st, n, 'aiuta', `aiutare ${carrier.first}`, [
      { label: `segue ${carrier.first}`, at: () => (carrier.pop.emer === E ? { x: carrier.x + .9, y: carrier.y + .6, label: '' } : null), dur: 0, outside: true, act: () => (carrier.pop.emer === E ? 'wait' : 'next') },
      goHome('torna a casa senza dire niente'),
    ], 3);
  }
  function planSurrender(st, n, c) {
    return startPlan(st, n, 'costituisce', 'costituirsi', [
      { label: 'va al commissariato a costituirsi', at: () => tgtOf('commissariato'), dur: 10, act: (st, n) => { if (c) { c.corpse.called = true; scheduleRemoval(st, c, 'guardia', 30); } I.arrestFar(st, n, 'omicidio'); n.jailedUntil = st.t + 3 * 1440; return 'stop'; } },
    ], 3);
  }
  function planTellZia(st, n, imp) {
    return startPlan(st, n, 'riferisce', 'riferire alla Zia', [
      { label: 'corre al Bar Sirena dalla Zia', at: () => tgtOf('sirena'), dur: 15, act: (st, n) => { const z = G.byId(st, 'zia'); if (z && imp.ev) G.addMemory(st, z, { eventId: imp.ev.id, type: imp.ev.type, actor: imp.ev.actor, target: imp.ev.target, place: imp.place, t: st.t, conf: .8, source: 'voce', via: [n.first] }); n.pop.money += 5; return 'next'; } },
      goHome(),
    ], 2);
  }

  // ---------------- TELEFONO E MESSAGGI ----------------
  // a chi si può far arrivare una parola: la Guardia (sempre, da un telefono), un amico (se è a casa col telefono o ha il cellulare), il giocatore (dalla rete della Risacca)
  function message(st, from, to, text) {
    if (to === 'giocatore') {
      if (!st.ris) return false;
      const ch = st.ris.chats[from.id] = st.ris.chats[from.id] || [];
      ch.push({ role: 'npc', text, sys: true, t: st.t });
      st.ris.inbox.unshift({ npc: from.id, text, t: st.t }); if (st.ris.inbox.length > 30) st.ris.inbox.pop();
      G.feed(st, `${from.first}: ${text}`, 'rumor');
      return true;
    }
    if (!to || !to.pop) return false;
    const reach = hasCell(st, to) || (to.pop.owns.telefono && to.pop.at && I.isHomeT(to.pop, to.pop.at));
    if (!reach) return false;
    note(st, to, `${from.first} ha chiamato: «${text}»`, 'info', { w: .5, who: from.id, tag: 'telefonata' });
    st.pop.stats.telefonate = (st.pop.stats.telefonate || 0) + 1;
    return true;
  }
  function callGuard(st, n, c, imp) {
    if (c.corpse.called) return;
    c.corpse.called = n.id; st.pop.stats.chiamate = (st.pop.stats.chiamate || 0) + 1;
    note(st, n, n.cop ? `fatto rapporto: un morto a ${c.corpse.place}` : `telefonato alla Guardia: c'è un morto a ${c.corpse.place}`, 'info', { w: .5, tag: 'telefonata' });
    scheduleRemoval(st, c, 'guardia', 25 + rnd() * 35, imp && imp.actor && imp.kind === 'omicidio' ? { actor: imp.actor, witness: n } : null);
  }
  function reportTo(st, n, imp) {
    const cop = st.npcs.find(k => k.cop && alive(k)); if (!cop || !imp.carrier) return;
    G.addMemory(st, cop, { eventId: (imp.corpse && imp.corpse.corpse.evId) || st.nextId++, type: 'occultamento', actor: imp.carrier.id, place: imp.place, t: st.t, conf: .8, source: 'denuncia', via: [n.first] });
    if (rnd() < .5) I.arrestFar(st, imp.carrier, 'occultamento di cadavere');
  }
  function scheduleRemoval(st, c, by, mins, accuse) {
    st.timers.push({ at: st.t + mins, kind: 'azRemove', corpse: c.id, by, accuse: accuse ? { actor: accuse.actor, witness: accuse.witness.id } : null });
  }
  function onTimers(st) {
    st.timers = st.timers.filter(tm => {
      if (tm.kind !== 'azRemove' || st.t < tm.at) return true;
      const c = G.byId(st, tm.corpse); if (!c || c.corpse.gone || c.corpse.buried) return false;
      if (c.corpse.carriedBy) { const k = G.byId(st, c.corpse.carriedBy); if (k) { endPlan(st, k, 'preso'); note(st, k, `i Grigi l'hanno sorpres${o(k)} con ${c.corpse.name}`, 'bad', { w: 1, tag: 'fermato' }); if (rnd() < .8) { I.arrestFar(st, k, 'occultamento di cadavere'); k.jailedUntil = st.t + 2 * 1440; } } }
      c.corpse.gone = tm.by; c.inside = true;
      G.addLog(st, `${G.clockStr(st.t)} · La Guardia ha portato via ${c.corpse.name} da ${c.corpse.place}.`, 'info');
      if (st.ris) st.ris.repr = clamp(st.ris.repr + 4, 0, 100);
      // la Guardia sa chi è stato, se qualcuno l'ha visto; e lo va a prendere
      if (tm.accuse && tm.accuse.actor && tm.accuse.actor !== 'player') {
        const k = G.byId(st, tm.accuse.actor), w = G.byId(st, tm.accuse.witness);
        st.npcs.filter(x => x.cop && alive(x)).forEach(cop => G.addMemory(st, cop, { eventId: st.nextId++, type: 'omicidio', actor: tm.accuse.actor, target: c.corpse.of, place: c.corpse.place, t: c.corpse.t, conf: .85, source: 'denuncia', via: w ? [w.first] : [] }));
        if (k && alive(k) && k.pop && rnd() < .7) { I.arrestFar(st, k, 'omicidio'); k.jailedUntil = st.t + 3 * 1440; }
      }
      // la famiglia del morto lo viene a sapere
      const v = G.byId(st, c.corpse.of), hh = v && v.pop && st.pop.households[v.pop.hh];
      (hh ? hh.members : []).forEach(id => { const k = G.byId(st, id); if (k && k.pop && k !== v) { note(st, k, `la Guardia è venuta a dire che hanno trovato ${c.corpse.name} a ${c.corpse.place}`, 'bad', { w: .95, who: c.corpse.of, tag: 'lutto' }); feel(k, 'rabbia', .35); feel(k, 'paura', .2); } });
      return false;
    });
  }

  // ---------------- LITI E RISSE ----------------
  function quarrel(st, a, b, why) {
    st.pop.stats.liti = (st.pop.stats.liti || 0) + 1;
    note(st, a, `litigato con ${b.first}${why ? ` (${why})` : ''}`, 'bad', { w: .5, who: b.id, tag: 'lite', place: a.pop.at && a.pop.at.label });
    note(st, b, `litigato con ${a.first}${why ? ` (${why})` : ''}`, 'bad', { w: .5, who: a.id, tag: 'lite', place: b.pop.at && b.pop.at.label });
    feel(a, 'rabbia', .15); feel(b, 'rabbia', .15);
    if (a.pop.near && !a.inside) G.say(st, a, pick(Math.random, QUARREL[why] || QUARREL._), 3);
    if (b.pop.near && !b.inside) G.say(st, b, pick(Math.random, QUARREL._), 3);
    // ci si allontana, o si viene alle mani
    const heat = (a.pop.need.rabbia + b.pop.need.rabbia) / 2 + (a.tr.cor + b.tr.cor) / 4 - (a.tr.legge + b.tr.legge) / 4 + (vino(a) || vino(b) ? .2 : 0);
    if (heat > .55 && rnd() < heat - .35) brawl(st, a, b, { why });
    else if (a.pop.friends.includes(b.id) && rnd() < .3) { a.pop.friends = a.pop.friends.filter(x => x !== b.id); b.pop.friends = b.pop.friends.filter(x => x !== a.id); note(st, a, `non parla più con ${b.first}`, 'info', { who: b.id }); }
  }
  const vino = n => n.pop && n.pop.using && n.pop.using.some(x => x.tag === 'vino') && n.pop.vice === 'vino';
  const QUARREL = { _: ['Ma che dici?!', 'Vattene!', 'Non ti permettere!', 'Ma statti zitto!'], soldi: ['Ridammi i miei soldi!', 'Non ti devo niente!'], politica: ['Il Garante ci protegge, idiota!', 'Svegliati, ci trattano come bestie!'], incidente: ['Ma sei cieco?!', 'Guarda cosa hai fatto alla mia macchina!', 'Chi ti ha dato la patente?!'], buca: ['Ti ho aspettato due ore!'], furto: ['Ladro! Lo so che sei stato tu!'] };
  // la rissa: da vicino si vede (si avvicinano, pugni, chi è a terra); da lontano si decide subito chi ha la meglio
  function brawl(st, a, b, opt) {
    const op = opt || {};
    st.pop.stats.risse = (st.pop.stats.risse || 0) + 1;
    const nearA = a === 'player' || (a.pop && a.pop.near && !a.inside), nearB = b === 'player' || (b.pop && b.pop.near && !b.inside);
    if (nearA && nearB) {
      if (a !== 'player') planFight(st, a, b, op);
      if (b !== 'player') planFight(st, b, a, Object.assign({}, op, { lethal: false }));
      return;
    }
    if (a === 'player' || b === 'player') return;
    // da lontano
    const pw = n => n.tr.cor * .5 + ((n.look && n.look.build) || 1) * .3 + (n.pop.age < 50 ? .2 : 0) + n.pop.need.rabbia * .2 + rnd() * .4;
    const [w, l] = pw(a) > pw(b) ? [a, b] : [b, a];
    l.hp -= 25 + rnd() * 25; w.hp -= 5 + rnd() * 10;
    const place = (a.pop.at && a.pop.at.label) || placeName(a.x, a.y);
    const ev = emit(st, 'aggressione', w, l.id, l.x, l.y, place);
    if (op.lethal && l.hp <= 0) { kill(st, w, l, 'a botte'); return; }
    l.hp = Math.max(8, l.hp); w.hp = Math.max(15, w.hp);
    note(st, w, `fatto a botte con ${l.first}${op.why ? ` (${op.why})` : ''}: ${w.pop.sex === 'f' ? 'ha vinto lei' : 'ha vinto lui'}`, 'shady', { w: .6, who: l.id, tag: 'rissa', place });
    note(st, l, `prese un sacco di botte da ${w.first}${op.why ? ` (${op.why})` : ''}`, 'bad', { w: .75, who: w.id, tag: 'rissa', place });
    feel(l, 'paura', .3); feel(l, 'rabbia', .3); feel(w, 'rabbia', -.3);
    if (!l.pop.enemies.includes(w.id)) l.pop.enemies.push(w.id);
    if (l.hp < l.maxHp * .45) planHeal(st, l);
    // chi c'era
    witnesses(st, l.x, l.y, [w.id, l.id]).slice(0, 4).forEach(k => { G.addMemory(st, k, { eventId: ev.id, type: 'aggressione', actor: w.id, target: l.id, place, t: st.t, conf: .9, source: 'visto' }); if (k.tr.legge > .7 && rnd() < .4) { note(st, k, `chiamato la Guardia per una rissa a ${place}`, 'info', { w: .3 }); if (rnd() < .5) I.arrestFar(st, w, 'rissa'); } });
  }
  // da vicino: avvicinarsi e menare finché uno non è a terra, o scappa, o arriva qualcuno
  function planFight(st, n, foe, opt) {
    const op = opt || {}, P = n.pop; if (!P) return null;
    const E = startPlan(st, n, 'rissa', `fare a botte con ${foe === 'player' ? G.PLAYER_NAME : foe.first}`, [{
      label: `si avventa su ${foe === 'player' ? G.PLAYER_NAME : foe.first}`, dur: 0, outside: true,
      act: (st, n, E) => 'wait',
      tick: (st, n, E, dt) => fightTick(st, n, foe, E, op, dt),
    }], 3);
    if (E) { E.until = st.clock + 25; E.startClock = st.clock; n.inside = false; }
    return E;
  }
  function fightTick(st, n, foe, E, op, dt) {
    const p = st.player, fx = foe === 'player' ? p.x : foe.x, fy = foe === 'player' ? p.y : foe.y;
    const done = why => { n.gesture = 0; note(st, n, why, 'bad', { w: .6, tag: 'rissa' }); endPlan(st, n, 'fatto'); };
    if (foe !== 'player' && (!alive(foe) || foe.stun > 2.5)) return done(`lasciato a terra ${foe.first}`);
    if (st.clock > E.until || dist(n.x, n.y, fx, fy) > 18) return done('la rissa è finita');
    if (n.hp < n.maxHp * .35) { n.panic = 6; n.fleeFrom = { x: fx, y: fy }; return done('le ha prese ed è scappato'); }
    if (!n.pop.near) { if (foe !== 'player') brawl(st, n, foe, op); return endPlan(st, n, 'lontano'); }
    const d = dist(n.x, n.y, fx, fy);
    if (d > 1.15) { if (!E.goal || st.clock - (E.repath || 0) > .5) { E.repath = st.clock; E.goal = { x: fx, y: fy }; G.goTo(n, fx, fy); } G.stepAlong(n, 2.6, dt); return; }
    n.face = Math.atan2(fy - n.y, fx - n.x); n.speedNow = 0;
    if (st.clock < (E.nextHit || 0)) return;
    E.nextHit = st.clock + .7 + rnd() * .5; n.gesture = .35;
    if (rnd() < .35) return;   // a vuoto
    const dmg = 5 + n.tr.cor * 6 + ((n.look && n.look.build) || 1) * 3;
    if (foe === 'player') {
      E.hits = (E.hits || 0) + 1;
      p.hp = Math.max(4, p.hp - dmg * .3); p.stun = Math.max(p.stun, .25); p.hurtT = st.clock; st.shake = Math.max(st.shake, .12);
      // se il giocatore non reagisce, dopo qualche spintone se ne va
      if (E.hits >= 4 && !(n.hitT > E.startClock)) { G.say(st, n, pick(Math.random, ['E impara a guidare!', 'Vigliacco!', 'Ti è andata bene.']), 2.5); return done('ha dato una lezione a chi gli ha distrutto la macchina'); }
      return;
    }
    foe.hp -= dmg; foe.hitT = st.clock; foe.stun = Math.max(foe.stun, .3);
    if (foe.hp <= 0) { if (op.lethal) { kill(st, n, foe, 'a mani nude'); return done(`ha ucciso ${foe.first}`); } foe.hp = 4; foe.stun = 4; note(st, foe, `messo KO da ${n.first}`, 'bad', { w: .8, who: n.id, tag: 'rissa' }); if (foe.pop) planHeal(st, foe); }
  }
  function planHeal(st, n) {
    return startPlan(st, n, 'cura', 'farsi medicare', [{ label: 'va all\'ambulatorio a farsi medicare', at: () => tgtOf('ambulatorio'), dur: 60, inside: true, act: (st, n) => { n.hp = n.maxHp; return 'next'; } }, goHome()], 1);
  }
  // le occasioni di lite: chi si ritrova nello stesso posto con un conto aperto
  function quarrels(st) {
    const groups = {};
    st.npcs.forEach(n => { if (alive(n) && n.pop && !n.pop.emer && !busyWithLaw(st, n) && !I.isPassive(st, n) && n.pop.at && !I.isHomeT(n.pop, n.pop.at)) (groups[tkey(n.pop.at)] = groups[tkey(n.pop.at)] || []).push(n); });
    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      for (let i = 0; i < Math.min(4, g.length); i++) {
        const a = g[Math.floor(rnd() * g.length)], b = g[Math.floor(rnd() * g.length)]; if (a === b) continue;
        const lq = a.pop.lastQ = a.pop.lastQ || {}; if (st.t - (lq[b.id] || -1e9) < 1440) continue;
        let why = null, ten = 0;
        if (a.pop.enemies.includes(b.id)) { ten += .5; why = I.recent(st, a.pop, 'furto', 7, e => e.who === b.id) ? 'furto' : null; }
        if (I.recent(st, a.pop, 'bidone', 3, e => e.who === b.id)) { ten += .3; why = why || 'buca'; }
        if (a.pop.debt && (b.id === 'rocco' || b.id === 'tano' || b.id === 'sandro')) { ten += .35; why = 'soldi'; }
        if (a.ris && b.ris && Math.abs(a.ris.ideo - b.ris.ideo) > .5 && (vino(a) || vino(b))) { ten += .3; why = why || 'politica'; }
        ten += (a.pop.need.rabbia - .3) * .6 + (vino(a) ? .15 : 0) - a.tr.legge * .15;
        if (ten > .2 && rnd() < ten * .4) { lq[b.id] = st.t; (b.pop.lastQ = b.pop.lastQ || {})[a.id] = st.t; quarrel(st, a, b, why); }
      }
    });
  }

  // ---------------- INCIDENTI ----------------
  // un'auto del traffico che sbanda per un urto: il guidatore decide se scappare, scendere a litigare o a fare a botte
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
      const party = other.rider === 'player' ? 'player' : other.traffic ? other : null;
      if (!party) return;
      const drivers = st.npcs.filter(k => k.driverOf && alive(k)).length;
      if (drivers >= CFG.maxDrivers) return;
      const tr = { cor: .2 + rnd() * .8, loq: .3 + rnd() * .7, avid: rnd() * .7, legge: .2 + rnd() * .8 };
      const rage = .4 + rnd() * .4 + (v.hp < 60 ? .2 : 0);
      // scappa: tira dritto (chi ha poco coraggio, o qualcosa da nascondere)
      if (tr.cor < .35 || (tr.legge < .3 && rnd() < .5)) { v.panicT = st.clock; return; }
      const a = spawnDriver(st, v, tr);
      if (!a) return;
      a.pop.need.rabbia = clamp(rage, 0, 1);
      if (party === 'player') {
        const ev = emit(st, 'incidente', 'player', a.id, v.x, v.y, placeName(v.x, v.y));
        G.addMemory(st, a, { eventId: ev.id, type: 'incidente', actor: 'player', target: a.id, owner: a.id, place: ev.place, t: st.t, conf: .95, source: 'visto' });
        G.say(st, a, pick(Math.random, QUARREL.incidente), 3);
        note(st, a, `${G.PLAYER_NAME} gli ha distrutto la macchina a ${ev.place}`, 'bad', { w: .7, tag: 'incidente' });
        if (tr.cor > .6 && rage > .55) { a.op.grudge = 1; planFight(st, a, 'player', { why: 'la macchina' }); }
        else startPlan(st, a, 'incidente', 'litiga e poi va a denunciare', [
          { label: 'urla contro l\'altro guidatore', dur: 8, outside: true, act: () => 'next' },
          tr.legge > .55 ? { label: 'va a denunciare l\'incidente', at: () => tgtOf('commissariato'), dur: 10, act: (st, n) => { const cop = st.npcs.find(k => k.cop && alive(k)); if (cop) G.addMemory(st, cop, { eventId: ev.id, type: 'incidente', actor: 'player', target: n.id, place: ev.place, t: ev.t, conf: .8, source: 'denuncia', via: [n.first] }); return 'next'; } } : null,
          goHome('torna a casa a piedi, furioso'),
        ].filter(Boolean), 2);
        return;
      }
      // tra due auto del traffico: scendono tutti e due
      const b = spawnDriver(st, party, { cor: .2 + rnd() * .8, loq: .3 + rnd() * .7, avid: rnd() * .7, legge: .2 + rnd() * .8 });
      if (!b) return;
      b.pop.need.rabbia = clamp(.4 + rnd() * .4, 0, 1);
      quarrel(st, a, b, 'incidente');
      [a, b].forEach(k => { if (!k.pop.emer) startPlan(st, k, 'incidente', 'dopo l\'incidente', [{ label: 'discute dell\'incidente', dur: 10, outside: true }, goHome('torna a casa a piedi')], 1); });
    });
  }
  function spawnDriver(st, v, tr) {
    const [first, sur] = pick(Math.random, DRV_NAMES), home = pick(Math.random, ['stella', 'aurora', 'mare'].filter(has));
    st.pop.drvK = (st.pop.drvK || 0) + 1;
    const n = G.makeNpc(st, { id: 'aut' + st.pop.drvK, name: `${first} ${sur}`, role: 'Automobilista', home, tr, sched: [[0, home]], passante: true, look: v.driverLook || { skin: '#d8a982', top: '#5a6aa8', bottom: '#2a2a33', hair: '#2a1d14', hat: 'none', build: 1, extra: '' } });
    const side = v.ang + Math.PI / 2; n.x = v.x + Math.cos(side) * 1.6; n.y = v.y + Math.sin(side) * 1.6; if (!G.walkM(n.x, n.y)) { n.x = v.x - Math.cos(side) * 1.6; n.y = v.y - Math.sin(side) * 1.6; }
    n.driverOf = v.id; n.inside = false; n.face = v.ang;
    st.npcs.push(n); I.adopt(st, n); if (!n.pop) return null;
    n.pop.near = true; n.pop.lod = 'vicino';
    // la macchina resta lì
    v.traffic = false; v.stalled = true; v.rider = null; v.speed = 0; v._spd = 0; v.vx = v.vy = v.w = 0; v.owner = n.id;
    return n;
  }

  // ---------------- INIZIATIVA ESTREMA ----------------
  // la Mente (popolo.js) apre questi progetti quando rabbia, odio e carattere arrivano in fondo
  function enemyTarget(st, n) { const P = n.pop; for (const id of P.enemies) { const k = G.byId(st, id); if (alive(k) && k.pop && !busyWithLaw(st, k)) return k; } return null; }
  I.PROJ.conti = { id: 'conti', need: true, label: (st, n, P, a) => `regolare i conti con ${G.nameOf(st, a.who)}`,
    arg: (st, n, P) => { if (P.need.rabbia < .75 || n.tr.legge > .3 || n.tr.cor < .65) return null; const k = enemyTarget(st, n); return k ? { who: k.id } : null; },
    steps: (st, n, P, a) => { const k = G.byId(st, a.who); if (!k) return null; return [
      (n.weapon || P.owns.coltello) ? null : { k: 'go', ref: 'casa', h: 20, act: 'casa', label: 'prende il coltello dalla cucina', fx: (st, n, P) => { P.owns.coltello = true; return 'next'; } },
      { k: 'go', ref: k.pop.homeT, h: 22, label: `aspetta ${k.first} sotto casa`, fx: (st, n, P) => { settle(st, n, k); return 'done'; } },
    ].filter(Boolean); } };
  // gli uomini dello Squalo: chi non paga, una lezione
  I.PROJ.lezione = { id: 'lezione', need: true, label: (st, n, P, a) => `dare una lezione a ${G.nameOf(st, a.who)}`,
    arg: (st, n, P) => { if (!['rocco', 'tano'].includes(n.id) || st.t - (P.lezLast || -1e9) < 2 * 1440) return null; const d = st.npcs.find(k => alive(k) && k.pop && k.pop.debt && k.pop.debt.to === 'sandro' && I.recent(st, k.pop, 'squalo', 7) && !busyWithLaw(st, k) && !(k.pop.lezT > st.t - 3 * 1440)); return d ? { who: d.id } : null; },
    steps: (st, n, P, a) => { const k = G.byId(st, a.who); if (k) k.pop.lezT = st.t; P.lezLast = st.t; return k ? [{ k: 'go', ref: k.pop.homeT, h: 21, label: `va a trovare ${k.first} per conto dello Squalo`, fx: (st, n) => { k.pop.lezT = st.t; if (k.pop.near || n.pop.near) brawl(st, n, k, { why: 'i soldi dello Squalo' }); else brawl(st, n, k, { why: 'i soldi dello Squalo' }); feel(k, 'paura', .4); return 'done'; } }] : null; } };
  function settle(st, n, k) {
    const P = n.pop, here = k.pop.at && P.at ? dist(k.pop.at.x, k.pop.at.y, P.at.x, P.at.y) < 20 : dist(k.x, k.y, n.x, n.y) < 20;
    if (!alive(k) || !here) { note(st, n, `${k.first} non si è fatt${o(k)} vedere`, 'info', { who: k.id }); return; }
    const armed = !!(n.weapon || P.owns.coltello), lethal = armed && P.need.rabbia > .8 && n.tr.legge < .25;
    if (P.near || k.pop.near) { planFight(st, n, k, { lethal, why: 'un conto da regolare' }); return; }
    if (lethal && rnd() < .6) { kill(st, n, k, n.weapon ? 'con la ' + n.weapon : 'con un coltello'); return; }
    brawl(st, n, k, { lethal: false, why: 'un conto da regolare' });
  }
  // ---------------- LA MENTE DAVANTI AI FATTI GRAVI ----------------
  // chi si risveglia senza memoria cerca di capire chi è; chi ha un segreto non dorme; chi ha perso qualcuno vuole giustizia
  I.PROJ.chisono = { id: 'chisono', need: true, label: () => 'capire chi è', arg: (st, n, P) => (P.amnesia && st.t - P.amnesia < 3 * 1440 ? { who: n.id } : null),
    steps: (st, n, P) => [
      { k: 'go', ref: 'ambulatorio', h: 9, label: 'chiede all\'ambulatorio chi l\'ha portato lì', fx: (st, n, P) => { note(st, n, `gli hanno detto il suo nome: ${n.name}, e dove abita`, 'info', { w: .6 }); return 'next'; } },
      { k: 'go', ref: 'casa', h: 12, act: 'casa', label: 'torna nella casa che dicono sia la sua', fx: (st, n, P) => { const hh = st.pop.households[P.hh]; const fam = (hh ? hh.members : []).filter(id => id !== n.id); fam.forEach(id => { if (!P.friends.includes(id)) P.friends.push(id); }); note(st, n, fam.length ? `ha conosciuto la sua famiglia: ${fam.map(id => G.nameOf(st, id)).join(', ')}. Non li riconosce` : 'la casa è vuota. Nessuno lo aspettava', 'bad', { w: .7 }); return 'next'; } },
      P.job && P.job.t ? { k: 'go', ref: P.job.t, h: 16, label: 'va al posto dove dicono che lavorava', fx: (st, n, P) => { note(st, n, 'al lavoro lo guardano strano, ma lo rimettono al suo posto', 'info', { w: .4 }); P.amnesia = 0; return 'done'; } } : null,
    ].filter(Boolean) };
  I.PROJ.coscienza = { id: 'coscienza', need: true, label: () => 'togliersi il peso dalla coscienza', arg: (st, n, P) => { const e = P.diary.find(e => (e.tag === 'segreto' || e.tag === 'omicidio') && st.t - e.t > 1440 && st.t - e.t < 6 * 1440); return e && n.tr.legge > .45 && P.need.paura > .4 ? { who: e.who } : null; },
    steps: (st, n, P) => [
      P.faith > .5 ? { k: 'go', ref: 'chiesa', h: 18, label: 'si confessa in chiesa', fx: (st, n, P) => { feel(n, 'paura', -.3); const pr = G.byId(st, 'pietro'); if (pr && pr.pop) note(st, pr, `${n.first} si è confessat${o(n)}: un peso grosso. Il segreto della confessione resta lì`, 'info', { w: .7, who: n.id, tag: 'segreto' }); return n.tr.legge > .75 ? 'next' : 'done'; } } : null,
      n.tr.legge > .6 ? { k: 'go', ref: 'commissariato', h: 10, label: 'va dalla Guardia a raccontare tutto', fx: (st, n, P) => { I.arrestFar(st, n, 'si è costituito'); n.jailedUntil = st.t + 2 * 1440; return 'done'; } } : null,
    ].filter(Boolean) };
  I.PROJ.giustizia = { id: 'giustizia', need: true, label: (st, n, P, a) => `avere giustizia per ${G.nameOf(st, a.who)}`, arg: (st, n, P) => I.recent(st, P, 'lutto', 3) || I.recent(st, P, 'omicidio', 2, e => e.who && e.who !== n.id && I.closeness(st, n, G.byId(st, e.who) || n) > .5),
    steps: (st, n, P, a) => [
      { k: 'go', ref: 'commissariato', h: 10, label: `va in commissariato a chiedere chi ha ucciso ${G.nameOf(st, a.who)}`, fx: (st, n, P) => { feel(n, 'rabbia', .1); note(st, n, 'la Guardia ha detto che stanno indagando. Nessuno ci crede', 'bad', { w: .5 }); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .06, 0, 1); return 'next'; } },
      { k: 'go', ref: 'chiesa', h: 17, label: 'accende un cero per il morto', obj: 'cero' },
    ] };
  I.REFLECT.push((st, n, thoughts) => {
    const P = n.pop;
    if (P.amnesia) thoughts.push(['chi sono? Non ricordo niente', .9]);
    if (P.diary.some(e => e.tag === 'segreto' && st.t - e.t < 3 * 1440)) { feel(n, 'paura', .1); thoughts.push([n.tr.legge > .5 ? 'non riesco a dormire, ci penso sempre' : 'nessuno deve saperlo. Nessuno', .7]); }
    const seen = I.recent(st, P, 'omicidio', 2) || I.recent(st, P, 'cadavere', 2);
    if (seen && seen.place) { P.avoid[seen.place] = st.t + 4 * 1440; thoughts.push([`non passo più da ${seen.place}`, .65]); }
    const mourn = I.recent(st, P, 'lutto', 3); if (mourn) { const v = G.byId(st, mourn.who); thoughts.push([v && !v.dead ? `hanno ammazzato ${v.first}, e adesso non mi riconosce più` : `${G.nameOf(st, mourn.who)} non c'è più, e nessuno pagherà`, .8]); }
    if (I.recent(st, P, 'rissa', 2)) thoughts.push(['la prossima volta non finisce così', .4]);
  });
  // ---------------- AGGANCI ----------------
  function install() {
    const H = G.HOOKS; if (H.__azioni) return; H.__azioni = true;
    Object.assign(G.SEV, { occultamento: .85, incidente: .3 }); Object.assign(G.NOISE, { occultamento: 1, incidente: 10 }); Object.assign(G.LABEL, { occultamento: 'Cadavere fatto sparire', incidente: 'Incidente' });
    Object.assign(G.NEG, { occultamento: 1, incidente: 1 });
    const t0 = H.think, m0 = H.move, s0 = H.step, v0 = H.verb;
    H.think = (st, n) => {
      if (n.pop && n.pop.emer && alive(n) && !busyWithLaw(st, n) && !(n.panic > 0 && n.pop.emer.kind !== 'rissa')) {
        const E = n.pop.emer, s = E.steps[E.i];
        n.action = { name: 'imprevisto', scores: [], why: `${cap(E.label)}: ${s ? s.label : ''}.`, since: n.action.name === 'imprevisto' ? n.action.since : st.clock };
        return true;
      }
      if (n.pop && n.pop.emer && n.panic > 0) endPlan(st, n, 'panico');
      return t0 ? t0(st, n) : false;
    };
    H.move = (st, n, dt, a) => {
      if (n.pop && n.pop.emer && (a === 'imprevisto' || !n.pop.near)) { runPlan(st, n, dt); return true; }
      return m0 ? m0(st, n, dt, a) : false;
    };
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const S = st.pop;
      // la morte: chiunque sia morto, comunque sia successo
      for (const n of st.npcs) if (n.dead && !n.corpse && !n._died && !n.gone) onDeath(st, n);
      if (S.rebirths && S.rebirths.length) S.rebirths = S.rebirths.filter(r => { if (st.t < r.at) return true; const n = G.byId(st, r.id); if (n && n.dead) rebirth(st, n); return false; });
      onTimers(st);
      crashes(st);
      if (st.t - (S.azScan || 0) >= 5) { S.azScan = st.t; scanCorpses(st); }
      if (st.t - (S.azQuarrel || 0) >= CFG.quarrelEvery) { S.azQuarrel = st.t; quarrels(st); }
      // le ferite guariscono piano
      const hm = Math.floor(st.t / 60); if (S.azHour !== hm) { S.azHour = hm; st.npcs.forEach(n => { if (alive(n) && n.hp < n.maxHp && !n.pop?.emer) n.hp = Math.min(n.maxHp, n.hp + 4); }); }
    };
    H.verb = (st, m, T) => ({ occultamento: 'ha fatto sparire un cadavere', incidente: T === 'me' ? 'mi ha distrutto la macchina' : 'ha fatto un incidente' }[m.type] || (v0 ? v0(st, m, T) : null));
  }
  install();
  return { CFG, SOFT, HIDDEN, PHONES, SHOVELS, kill, brawl, quarrel, react, perceive, planHide, planCall, message, corpses, strength, startPlan, endPlan, rebirth };
})();
if (typeof module !== 'undefined') module.exports = Azioni;
