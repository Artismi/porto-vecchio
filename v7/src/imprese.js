/* Porto Vecchio — Le Imprese: la gente si organizza (solo logica, nessuna grafica).
   Quando un problema o una voglia è di tanti, qualcuno prende l'iniziativa e mette su un'impresa:
   - legna:    in tanti senza legna per la stufa → si va insieme in pineta (chi ha l'ascia taglia, chi ha la carriola porta)
   - colletta: una famiglia nei guai (un fermo, un furto, un lutto, al verde) → amici e vicini mettono qualcosa ciascuno
   - rocca:    un parente fermato → la famiglia e gli amici vanno insieme alla Rocca a chiedere (in tanti fa meno paura)
   - cena:     amici che hanno voglia di compagnia → una cena all'osteria, ognuno porta qualcosa
   - ronda:    furti nel quartiere → i vicini col coraggio fanno la ronda di notte
   - pesca:    amici con la stessa passione → all'alba al molo, insieme
   COME: chi ha l'iniziativa (coraggio e parlantina) decide cosa, dove e quando (fuori dagli orari di lavoro suoi), poi
   cerca gente: la famiglia, gli amici, i vicini, quelli a cui serve; chi accetta passa parola a un amico suo. Ognuno
   decide da sé (quanto gli importa, quanto stima chi chiede, se gli deve un favore, se ha paura, se è libero a quell'ora)
   e prende un ruolo secondo quello che ha (attrezzi, soldi, cibo). L'impegno entra nella sua giornata (popolo.js,
   P.impegni). Se un'ora prima non sono abbastanza si rinuncia; all'ora giusta chi c'è la fa, e se lo ricorda insieme a
   chi è venuto e a chi non si è visto. Si parla delle imprese per strada e in chat, e il giocatore ci si può unire.
   Si aggancia a Game.HOOKS e a Risacca.EXT dopo popolo.js, scambi.js e convivenza.js. */
var Imprese = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : require('./risacca.js');
  const Sc = typeof Scambi !== 'undefined' ? Scambi : (typeof require !== 'undefined' ? require('./scambi.js') : null);
  const I = Po._, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const NAME = () => G.PLAYER_NAME || 'Nino';
  const hhmm = I.hhmm, minOfDay = I.minOfDay, dayIdx = I.dayIdx;
  const dayWord = (st, t) => { const d = dayIdx(t) - dayIdx(st.t); return d === 0 ? (minOfDay(t) >= 18 * 60 ? 'stasera' : 'oggi') : d === 1 ? 'domani' : Po.WEEK[(dayIdx(t) + 1) % 7]; };
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const S = st => st.imprese || (st.imprese = { list: [], next: 1, hour: Math.floor(st.t / 60), stats: { nate: 0, fatte: 0, annullate: 0, fallite: 0, adesioni: 0, rifiuti: 0, assenti: 0, giocatore: 0 } });
  const CFG = { maxActive: 8 };

  // la gente comune: niente Grigi, bande, marsigliesi, nemici dichiarati (il Colonnello non fa la ronda coi vicini)
  const common = n => !(n.cop || n.military || n.faction || n.aggro || (RS.CARDS[n.id] && RS.CARDS[n.id].antag) || /squalo|marsiglia/.test(n.faction || '') || ['sandro', 'vasco', 'pardo', 'zia', 'ferri'].includes(n.id));
  const free = (st, n) => n && !n.dead && n.pop && n.pop.ints && !(n.jailedUntil > st.t) && !I.isPassive(st, n) && common(n);
  const has = (n, id) => (Sc ? Sc.has(n, id) : ((n.pop.inv || {})[id] || 0));
  const needFuel = n => Sc && Sc.wants(Object.assign({}, {}), n) ? false : false;   // (sostituita sotto, serve st)
  const wantsFuel = (st, n) => !!(Sc && Sc.wants(st, n).some(w => w.ids.includes('legna')));
  const neighbors = (st, n, r) => st.npcs.filter(k => k !== n && free(st, k) && k.pop.homeT && n.pop.homeT && dist(k.pop.homeT.x, k.pop.homeT.y, n.pop.homeT.x, n.pop.homeT.y) < r);
  const family = (st, n) => ((st.pop.households[n.pop.hh] || {}).members || []).map(id => G.byId(st, id)).filter(k => k && k !== n && free(st, k));
  const friends = (st, n) => (n.pop.friends || []).map(id => G.byId(st, id)).filter(k => free(st, k));
  const recentTag = (st, n, tag, days) => (n.pop.diary || []).some(e => e.tag === tag && st.t - e.t < days * 1440);
  // è libero a quell'ora? (lavoro, un altro impegno, un appuntamento)
  function freeAt(st, n, t, dur) {
    const P = n.pop, m = minOfDay(t), wd = (dayIdx(t) + 1) % 7;
    if (P.job && !P.job.night && wd !== 6 && m + dur > P.job.start * 60 - 30 && m < P.job.end * 60) return false;
    if (P.job && P.job.night && (m < 14 * 60 || m > P.job.start * 60 - 60)) return false;
    if (P.appt && Math.abs(P.appt.t - t) < dur + 60) return false;
    if ((P.impegni || []).some(e => Math.abs(e.t - t) < dur + 60)) return false;
    return true;
  }

  // ---------------- I TIPI DI IMPRESA ----------------
  // trigger: chi può prendere l'iniziativa e su cosa (arg); pool: chi chiamare; roles: cosa porta ognuno; done: l'esito
  const KINDS = {
    legna: {
      label: () => 'a far legna in pineta', place: 'pineta', hours: [9, 14], dur: 150, min: 3, max: 6, obj: 'legna',
      trigger: (st, n) => wantsFuel(st, n) && (n.pop.cold || 0) > .2,
      pool: (st, n) => friends(st, n).concat(family(st, n), neighbors(st, n, 50).filter(k => wantsFuel(st, k))),
      care: (st, n, k) => (wantsFuel(st, k) ? .45 : 0) + (k.tr ? k.tr.cor * .1 : 0),
      role: (st, k) => has(k, 'ascia') ? 'taglia' : has(k, 'sega') ? 'taglia' : has(k, 'carriola') ? 'porta' : 'raccoglie',
      done: (st, E, here) => { const axes = here.filter(k => E.roles[k.id] === 'taglia').length, cart = here.some(k => E.roles[k.id] === 'porta'); const per = 1 + Math.min(2, axes) + (cart ? 1 : 0);
        here.forEach(k => { if (Sc) Sc.put(k, 'legna', per); k.pop.cold = 0; }); return `${per} fasci di legna a testa`; },
    },
    colletta: {
      label: E => `una colletta per la famiglia ${E.argName}`, place: 'piazza', hours: [17, 19], dur: 60, min: 3, max: 7,
      trigger: (st, n) => { const k = st.npcs.find(x => x !== n && x.pop && x.pop.hh !== n.pop.hh && I.closeness(st, n, x) > .5 && (x.jailedUntil > st.t || recentTag(st, x, 'furto', 2) || (x.pop.money < 0))); return k && n.pop.money > 15 ? { who: k.id, hh: k.pop.hh, name: k.pop.sur || k.first } : null; },
      pool: (st, n, E) => friends(st, n).concat(neighbors(st, n, 40)).filter(k => k.pop.hh !== E.arg.hh),
      care: (st, n, k, E) => { const v = G.byId(st, E.arg.who); return (v ? I.closeness(st, k, v) * .6 + Po.opinionOf(st, k, v.id) * .3 : 0) + (1 - (k.tr ? k.tr.avid : .5)) * .25 - (k.pop.money < 10 ? .4 : 0); },
      role: (st, k) => k.pop.money > 40 ? 'mette di più' : 'mette quel che può',
      done: (st, E, here) => { const hh = (st.pop.households[E.arg.hh] || {}).members || []; let sum = 0;
        here.forEach(k => { const q = Math.round(clamp(k.pop.money * (.05 + (1 - (k.tr ? k.tr.avid : .5)) * .1), 1, E.roles[k.id] === 'mette di più' ? 15 : 6)); if (k.pop.money >= q) { k.pop.money -= q; sum += q; } });
        const fam = hh.map(id => G.byId(st, id)).filter(k => k && !k.dead && k.pop); if (fam.length) { const share = sum / fam.length; fam.forEach(k => { k.pop.money += share; I.note(st, k, `i vicini hanno fatto una colletta per noi: ${Math.round(sum)}.000 lire`, 'good', { w: .6, tag: 'aiuto', who: E.leader }); }); }
        return `${Math.round(sum)}.000 lire alla famiglia ${E.argName}`; },
    },
    rocca: {
      label: E => `andare tutti insieme alla Rocca a chiedere di ${E.argName}`, place: 'rocca', hours: [9, 17], dur: 90, min: 3, max: 8,
      trigger: (st, n) => { const k = family(st, n).concat(st.npcs.filter(x => x.pop && x.pop.hh === n.pop.hh && x !== n)).find(x => x.jailedUntil > st.t + 600); return k && n.tr && n.tr.cor > .35 ? { who: k.id, name: k.first } : null; },
      pool: (st, n) => family(st, n).concat(friends(st, n), neighbors(st, n, 30)),
      care: (st, n, k, E) => { const v = G.byId(st, E.arg.who); return (v ? I.closeness(st, k, v) * .7 : 0) + (k.tr ? k.tr.cor * .3 : 0) - ((k.pop.need || {}).paura || 0) * .5 - (st.ris ? Math.min(5, st.ris.repr / 20) * .05 : 0); },
      role: () => 'chiede',
      done: (st, E, here) => { const v = G.byId(st, E.arg.who); if (!v || !(v.jailedUntil > st.t)) return 'era già fuori';
        const p = clamp(.15 + here.length * .08, 0, .7); if (rnd() < p) { v.jailedUntil = st.t + 30; I.note(st, v, `la mia gente è venuta in tanti alla Rocca: mi hanno lasciato andare`, 'good', { w: .7, tag: 'aiuto' }); return `${v.first} rilasciato`; }
        here.forEach(k => { if (k.pop.need) k.pop.need.paura = clamp((k.pop.need.paura || 0) + .1, 0, 1); }); if (st.ris) st.ris.morale = clamp(st.ris.morale + 1, 0, 100); return 'niente da fare, ma li hanno visti in tanti'; },
    },
    cena: {
      label: () => 'una cena tutti insieme all\'osteria', place: 'osteria', hours: [20, 20], dur: 120, min: 3, max: 6,
      trigger: (st, n) => ((n.pop.need || {}).compagnia > .55 || (n.pop.need || {}).svago > .6) && n.pop.money > 12 && friends(st, n).length >= 2,
      pool: (st, n) => friends(st, n).concat(family(st, n)),
      care: (st, n, k) => ((k.pop.need || {}).compagnia || 0) * .4 + ((k.pop.need || {}).svago || 0) * .3 - (k.pop.money < 6 ? .3 : 0),
      role: (st, k) => has(k, 'vino') ? 'porta il vino' : Sc && Sc.surplus(k).some(id => /pane|formaggio|salame|olive|focaccia/.test(id)) ? 'porta da mangiare' : 'paga la sua parte',
      done: (st, E, here) => { here.forEach(k => { const r0 = E.roles[k.id]; if (r0 === 'porta il vino' && Sc) Sc.take(k, 'vino', 1); else if (r0 === 'porta da mangiare' && Sc) { const id = Sc.surplus(k).find(x => /pane|formaggio|salame|olive|focaccia/.test(x)); if (id) Sc.take(k, id, 1); } else k.pop.money -= 3;
        if (k.pop.need) { k.pop.need.compagnia = 0; k.pop.need.svago = Math.max(0, k.pop.need.svago - .5); k.pop.need.fame = 0; } });
        here.forEach(a => here.forEach(b => { if (a !== b) try { Azioni.moveRel(st, a, b, .05, 0); } catch (e) { } })); return 'si è mangiato e riso fino a tardi'; },
    },
    ronda: {
      label: () => 'fare la ronda di notte nel quartiere', place: null, hours: [21, 21], dur: 120, min: 3, max: 6, night: true,
      trigger: (st, n) => n.tr && n.tr.cor > .55 && neighbors(st, n, 40).concat([n]).filter(k => recentTag(st, k, 'furto', 3)).length >= 2,
      pool: (st, n) => neighbors(st, n, 45).concat(friends(st, n)).filter(k => k.tr && k.tr.cor > .4 && k.pop.age > 18 && k.pop.age < 65),
      care: (st, n, k) => (recentTag(st, k, 'furto', 4) ? .5 : .1) + (k.tr ? k.tr.cor * .3 : 0) - ((k.pop.need || {}).paura || 0) * .3,
      role: (st, k) => has(k, 'torcia') ? 'fa luce' : 'cammina',
      done: (st, E, here) => { const area = E.tgt; let caught = null;
        st.npcs.forEach(k => { const P = k.pop; if (!P || !P.giro || !/ladro|borsaiolo/.test(P.giro) || k.dead) return; P.avoid = P.avoid || {}; P.avoid[area.label] = st.t + 4 * 1440;   // i ladri lo vengono a sapere: girano al largo
          if (!caught && P.cur && P.cur.act === 'giro' && P.at && dist(P.at.x, P.at.y, area.x, area.y) < 60 && rnd() < .5) caught = k; });
        if (caught) { I.arrestFar(st, caught, 'preso dalla ronda dei vicini'); here.forEach(k => I.note(st, k, `con la ronda abbiamo preso ${caught.first} che rubava`, 'good', { w: .6, who: caught.id, tag: 'furto' })); return `preso ${caught.first}`; }
        return 'notte tranquilla: i ladri hanno capito l\'antifona'; },
    },
    pesca: {
      label: () => 'a pescare insieme all\'alba', place: 'molo', hours: [6, 6], dur: 120, min: 2, max: 4, obj: 'canna',
      trigger: (st, n) => n.pop.intW && n.pop.intW.pesca > .5 && (n.pop.want || {}).pesca > .4 && friends(st, n).some(k => k.pop.intW && k.pop.intW.pesca > .3),
      pool: (st, n) => friends(st, n).filter(k => k.pop.intW && k.pop.intW.pesca > .25),
      care: (st, n, k) => (k.pop.intW.pesca || 0) * .5 + ((k.pop.want || {}).pesca || 0) * .3,
      role: (st, k) => has(k, 'canna') ? 'con la canna' : 'guarda e chiacchiera',
      done: (st, E, here) => { let tot = 0; here.forEach(k => { const q = E.roles[k.id] === 'con la canna' ? 1 + Math.floor(rnd() * 3) : 0; if (q && Sc) Sc.put(k, pick(['pesce', 'sarde']), q); tot += q; if (k.pop.want) k.pop.want.pesca = 0; }); return `${tot} pesci in tutto`; },
    },
  };

  // ---------------- NASCE UN'IMPRESA ----------------
  function placeFor(st, n, K) { if (K.place) return I.target(K.place); const p = G.nearestPlace(n.pop.homeT.x, n.pop.homeT.y); return I.target(p.id); }
  function whenFor(st, n, K) {
    for (let d = 0; d <= 2; d++) for (let h = K.hours[0]; h <= K.hours[1]; h++) {
      const t = (dayIdx(st.t) + d) * 1440 + h * 60 + (rnd() < .5 ? 0 : 30); if (t < st.t + 180) continue;
      if (K.night && minOfDay(t) >= Po.curfewFrom(st) - 30 && !(n.tr && n.tr.cor > .75)) continue;   // con l'Ora Quieta la ronda la fa solo chi ha fegato
      if (freeAt(st, n, t, K.dur)) return t;
    }
    return null;
  }
  function propose(st) {
    const M = S(st); if (M.list.filter(E => E.status === 'cerca' || E.status === 'pronta').length >= CFG.maxActive) return;
    const busy = new Set(); M.list.forEach(E => { if (E.status === 'cerca' || E.status === 'pronta') E.members.forEach(id => busy.add(id)); });
    const cands = st.npcs.filter(n => free(st, n) && !busy.has(n.id) && n.tr && n.tr.cor + n.tr.loq > 1.05 && rnd() < .08);
    for (const n of cands) {
      for (const [kind, K] of Object.entries(KINDS)) {
        if (M.list.some(E => E.kind === kind && (E.status === 'cerca' || E.status === 'pronta') && (E.leader === n.id || (E.arg && K.trigger && E.arg.who && E.arg.who === (K.trigger(st, n) || {}).who)))) continue;
        const arg = K.trigger(st, n); if (!arg) continue;
        // una ronda per quartiere (e non tutte le sere), una legna alla volta
        if (kind === 'ronda' && M.list.some(E => E.kind === 'ronda' && st.t - E.born < 2 * 1440 && dist(E.tgt.x, E.tgt.y, n.pop.homeT.x, n.pop.homeT.y) < 90)) continue;
        if (kind === 'legna' && M.list.some(E => E.kind === 'legna' && (E.status === 'cerca' || E.status === 'pronta'))) continue;
        const t = whenFor(st, n, K); if (!t) continue;
        const tgt = placeFor(st, n, K); if (!tgt) continue;
        const E = { id: M.next++, kind, leader: n.id, members: [n.id], roles: {}, asked: [n.id], arg: typeof arg === 'object' ? arg : null, argName: typeof arg === 'object' ? arg.name : '', t, tgt, status: 'cerca', born: st.t, absent: [] };
        E.label = K.label(E); E.roles[n.id] = K.role(st, n); M.list.push(E); M.stats.nate++;
        commit(st, n, E);
        I.note(st, n, `ha deciso di organizzare: ${E.label}, ${dayWord(st, t)} alle ${hhmm(minOfDay(t))} a ${tgt.label}`, 'info', { w: .45, tag: 'impresa' });
        if (n.pop.near && !n.inside) G.say(st, n, pick([`Bisogna ${E.label.replace(/^a /, 'andare a ')}. Ci penso io.`, 'Così non si può andare avanti: organizziamoci.']), 3);
        return;
      }
    }
  }
  function commit(st, n, E) {
    if (n === 'player' || !n.pop) return;
    const P = n.pop; P.impegni = (P.impegni || []).filter(e => e.id !== E.id); P.impegni.push({ id: E.id, t: E.t, dur: KINDS[E.kind].dur, tgt: E.tgt, label: E.label, obj: KINDS[E.kind].obj });
    if (dayIdx(E.t) === dayIdx(st.t)) Po.planDay(st, n, dayIdx(st.t));
  }
  function uncommit(st, n, E) { if (!n || !n.pop || !n.pop.impegni) return; n.pop.impegni = n.pop.impegni.filter(e => e.id !== E.id); if (dayIdx(E.t) === dayIdx(st.t)) Po.planDay(st, n, dayIdx(st.t)); }

  // ---------------- SI CERCA GENTE ----------------
  // ogni ora chi organizza chiama due persone, e ognuno di quelli che hanno accettato passa parola a uno dei suoi
  function recruit(st) {
    const M = S(st);
    M.list.filter(E => E.status === 'cerca' || E.status === 'pronta').forEach(E => {
      const K = KINDS[E.kind], L = G.byId(st, E.leader); if (!free(st, L)) return;
      if (E.members.length >= K.max) return;
      const callers = [L].concat(E.members.filter(id => id !== E.leader && id !== 'player').map(id => G.byId(st, id)).filter(Boolean).slice(0, 3));
      callers.forEach((c, ci) => {
        const pool = K.pool(st, c, E).filter(k => !E.asked.includes(k.id)); if (!pool.length) return;
        const tries = ci === 0 ? 2 : 1;
        for (let i = 0; i < tries && pool.length && E.members.length < K.max; i++) {
          const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; E.asked.push(k.id);
          ask(st, E, c, k);
        }
      });
      if (E.status === 'cerca' && E.members.length >= K.min) { E.status = 'pronta'; E.members.forEach(id => { const k = G.byId(st, id); if (k && k.pop) I.note(st, k, `siamo in ${E.members.length}: ${E.label}, ${dayWord(st, E.t)} alle ${hhmm(minOfDay(E.t))}`, 'info', { w: .3, tag: 'impresa' }); }); }
    });
  }
  function ask(st, E, caller, k) {
    const K = KINDS[E.kind], M = S(st);
    const owes = !!(k.pop.debiti && (k.pop.debiti[caller.id] || k.pop.debiti[E.leader]));
    const p = .15 + K.care(st, caller, k, E) + I.closeness(st, k, caller) * .35 + Po.opinionOf(st, k, caller.id) * .3 + (owes ? .3 : 0) - (k.tr ? (1 - k.tr.loq) * .1 : 0);
    const can = freeAt(st, k, E.t, K.dur);
    const yes = can && rnd() < p;
    const how = caller.id === E.leader ? 'gliel\'ha chiesto' : `gliel'ha detto ${caller.first}`;
    if (yes) {
      E.members.push(k.id); E.roles[k.id] = K.role(st, k); M.stats.adesioni++; commit(st, k, E);
      I.note(st, k, `si unisce: ${E.label} (${how}), ${dayWord(st, E.t)} alle ${hhmm(minOfDay(E.t))} a ${E.tgt.label}. Ruolo: ${E.roles[k.id]}`, 'info', { w: .4, who: E.leader, tag: 'impresa' });
      I.note(st, caller, `${k.first} ci sta: ${E.label}`, 'good', { w: .25, who: k.id, tag: 'impresa' });
      talkPair(st, caller, k, `${cap(dayWord(st, E.t))} alle ${hhmm(minOfDay(E.t))}: ${E.label}. Ci stai?`, pick(['Ci sto.', 'Conta su di me.', 'Va bene, vengo.']));
    } else {
      M.stats.rifiuti++;
      I.note(st, caller, `${k.first} non viene${can ? '' : ': a quell\'ora non può'}`, 'info', { w: .15, who: k.id, tag: 'impresa' });
      talkPair(st, caller, k, `Ci stai? ${cap(E.label)}.`, can ? pick(['No, lascia stare.', 'Non fa per me.', 'Ho paura, scusa.']) : 'A quell\'ora non posso.');
    }
  }
  function talkPair(st, a, b, la, lb) {
    const vis = n => n.pop && n.pop.near && !n.inside && dist(n.x, n.y, st.player.x, st.player.y) < 30;
    if (vis(a) && vis(b) && dist(a.x, a.y, b.x, b.y) < 6) { G.say(st, a, la, 2.6); setTimeout0(() => G.say(st, b, lb, 2.4)); }
  }
  const setTimeout0 = f => { try { f(); } catch (e) { } };

  // ---------------- IL GIORNO DELL'IMPRESA ----------------
  function run(st) {
    const M = S(st);
    M.list.forEach(E => {
      const K = KINDS[E.kind];
      // un'ora prima: se non si è in abbastanza si rinuncia (e si avvisa chi aveva detto sì)
      if (E.status === 'cerca' && st.t > E.t - 60) {
        E.status = 'annullata'; M.stats.annullate++;
        E.members.forEach(id => { const k = G.byId(st, id); if (k && k.pop) { uncommit(st, k, E); I.note(st, k, id === E.leader ? `non si è trovata abbastanza gente: niente ${E.label}` : `${G.nameOf(st, E.leader)} ha rinunciato: ${E.label}`, 'bad', { w: .3, tag: 'impresa', who: E.leader }); } });
        return;
      }
      if (E.status !== 'pronta') return;
      // chi c'è sul posto mentre si fa
      if (st.t >= E.t - 20 && st.t <= E.t + 45) {
        E.here = E.here || {};
        E.members.forEach(id => {
          if (id === 'player') { const p = st.player, near = p.indoor ? (E.tgt.k === 'b' && p.indoor.b === E.tgt.bi) : dist(p.x, p.y, E.tgt.x, E.tgt.y) < 15; if (near) E.here.player = 1; return; }
          const k = G.byId(st, id), P = k && k.pop; if (!P || k.dead || k.jailedUntil > st.t) return;
          if (P.at && I.tkey(P.at) === I.tkey(E.tgt) && P.cur && P.cur.imp === E.id) E.here[id] = 1;
        });
      }
      if (st.t < E.t + 45) return;
      const here = E.members.filter(id => id !== 'player' && E.here && E.here[id]).map(id => G.byId(st, id)).filter(Boolean), withP = !!(E.here && E.here.player);
      const absent = E.members.filter(id => !(E.here && E.here[id]));
      if (here.length + (withP ? 1 : 0) < Math.max(2, K.min - 1)) {
        E.status = 'fallita'; M.stats.fallite++;
        here.forEach(k => I.note(st, k, `${E.label}: non è venuto quasi nessuno`, 'bad', { w: .45, tag: 'impresa' }));
      } else {
        E.status = 'fatta'; M.stats.fatte++; if (withP) M.stats.giocatore++;
        const res = K.done(st, E, here); E.result = res;
        const names = here.map(k => k.first).concat(withP ? [NAME()] : []);
        here.forEach(k => { I.note(st, k, `${E.label}: fatto, con ${names.filter(x => x !== k.first).join(', ')} (${res})`, 'good', { w: .55, tag: 'impresa', who: E.leader }); if (withP) I.note(st, k, `${NAME()} è venuto anche lui: ${E.label}`, 'good', { w: .45, who: 'player', tag: 'insieme' }); });
        if (withP) { if (E.kind === 'legna') { st.player.inv = st.player.inv || {}; st.player.inv.legna = (st.player.inv.legna || 0) + 2; } G.addLog(st, `${G.clockStr(st.t)} · ${cap(E.label)} con ${here.map(k => k.first).join(', ')}: ${res}.`, 'info'); }
      }
      // chi non si è visto: chi organizza e chi c'era se lo ricordano (chi era in cella o morto è scusato)
      absent.forEach(id => { if (id === 'player') { here.forEach(k => I.note(st, k, `${NAME()} aveva detto che veniva e non si è visto`, 'bad', { w: .45, who: 'player', tag: 'bidone' })); return; }
        const k = G.byId(st, id); if (!k || k.dead || k.jailedUntil > st.t) return; M.stats.assenti++;
        here.slice(0, 3).forEach(h => I.note(st, h, `${k.first} aveva detto di sì e non si è visto (${E.label})`, 'bad', { w: .4, who: id, tag: 'bidone' })); uncommit(st, k, E); });
    });
    M.list = M.list.filter(E => !(['fatta', 'fallita', 'annullata'].includes(E.status) && st.t - E.t > 3 * 1440));
  }

  // ---------------- PER STRADA E IN CHAT ----------------
  const mine = (st, n) => S(st).list.filter(E => (E.status === 'cerca' || E.status === 'pronta') && E.members.includes(n.id));
  I.TALK.unshift((st, n) => {
    const E = mine(st, n)[0]; if (!E || rnd() > .45) return null;
    const when = `${dayWord(st, E.t)} alle ${hhmm(minOfDay(E.t))}`;
    if (E.leader === n.id && E.status === 'cerca') return pick([`Cerco gente: ${E.label}, ${when}.`, `${cap(when)}, ${E.label}. Chi viene?`]);
    return pick([`${cap(when)} ${E.label}, siamo in ${E.members.length}.`, `${cap(when)} c'è ${E.label}. Io ci vado.`]);
  });
  RS.EXT.stateExtra.push((st, n) => {
    const L = mine(st, n); if (!L.length) return '';
    return '[IMPRESE] ' + L.map(E => `${E.leader === n.id ? 'Sta organizzando' : `Partecipa (l'ha organizzata ${G.nameOf(st, E.leader)})`}: ${E.label}, ${dayWord(st, E.t)} alle ${hhmm(minOfDay(E.t))} a ${E.tgt.label}; ${E.status === 'cerca' ? 'cercano ancora gente' : 'sono abbastanza'} (${E.members.map(id => G.nameOf(st, id)).join(', ')}); il suo ruolo: ${E.roles[n.id] || '-'}. Se il giocatore vuole venire: verbo "partecipa".`).join(' ');
  });
  RS.VERBS.partecipa = { label: 'partecipa', risk: 0, args: 'impresa?', desc: 'il giocatore si unisce all\'impresa che il personaggio organizza o a cui partecipa (vedi [IMPRESE])' };
  RS.EXT.immediate.partecipa = (st, n) => {
    const E = mine(st, n)[0]; if (!E) return { ok: false, msg: `${n.first} non sta organizzando niente.` };
    if (E.members.includes('player')) return { ok: true, msg: `Ci sei già: ${E.label}.` };
    E.members.push('player'); E.roles.player = 'dà una mano';
    I.note(st, n, `anche ${NAME()} viene: ${E.label}`, 'good', { w: .35, who: 'player', tag: 'impresa' });
    const msg = `${cap(E.label)}: ${dayWord(st, E.t)} alle ${hhmm(minOfDay(E.t))} a ${E.tgt.label}, con ${E.members.filter(x => x !== 'player').map(id => G.nameOf(st, id)).join(', ')}.`;
    G.addLog(st, `${G.clockStr(st.t)} · ${msg}`, 'info');
    return { ok: true, msg };
  };
  const wm0 = RS.EXT.willMod;
  RS.EXT.willMod = (st, n, verb) => (wm0 ? wm0(st, n, verb) || 0 : 0) + (verb === 'partecipa' ? .6 : 0);

  // ---------------- AGGANCI ----------------
  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => {
    if (s0) s0(st, dt);
    if (!st.pop) return;
    const M = S(st), hm = Math.floor(st.t / 60);
    while (M.hour < hm) { M.hour++; const hr = M.hour % 24; if (hr >= 7 && hr <= 21) { propose(st); recruit(st); } }
    run(st);
  };
  function report(st) { const M = S(st); return Object.assign({ attive: M.list.filter(E => E.status === 'cerca' || E.status === 'pronta').length }, M.stats); }
  return { KINDS, propose, recruit, report, list: st => S(st).list };
})();
if (typeof module !== 'undefined') module.exports = Imprese;
