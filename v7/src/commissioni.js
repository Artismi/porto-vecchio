/* Porto Vecchio — Le Commissioni: quello che serve si va a fare davvero (solo logica, nessuna grafica).
   Ogni cosa che un abitante decide diventa un viaggio vero (Popolo._.errand): ci va a piedi, ci sta il tempo che serve
   facendo la cosa (vicino al giocatore si vede: in bottega al banco, contro il muro, al banchetto), e solo allora succede.
   - PISCIARE: la vescica si riempie (più in fretta bevendo). A casa il bagno, al bar quello del bar; per strada, quando
     non ce la fa più, contro un muro (chi è brillo o rispetta poco le regole anche di giorno; se lo vede un Grigio, guai).
   - MANGIARE quando gli pare: con la fame si mangia quello che si ha in tasca, o ci si compra un panino al bar.
   - COMPRARE: quello che gli manca (Scambi.wants) si va a comprare nella bottega che lo vende, e si torna col pacco in mano.
     Anche come passo per altro: per sistemare casa servono mobili e vernice, per la scritta la bomboletta.
   - VENDERE: nei giorni di mercato chi ha roba in più (il pescatore, il contadino, chi svende) va in piazza al banchetto.
   - SPACCIARE: chi ha il vizio va dallo spacciatore dove sta facendo il suo giro; lo scambio si fa lì, faccia a faccia.
   - LA CASA: chi ha qualche soldo e una casa spoglia la progetta: compra mobili o vernice, li porta a casa e la sistema.
   - IL LAVORO: chi è senza va di persona a chiedere (Popolo, progetto «lavoro»; qui solo la spinta a farlo).
   Si aggancia a Game.HOOKS dopo popolo.js, economia.js, oggetti.js, scambi.js. */
var Commissioni = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Ec = typeof Economia !== 'undefined' ? Economia : require('./economia.js');
  const Og = typeof Oggetti !== 'undefined' ? Oggetti : require('./oggetti.js');
  const Sc = typeof Scambi !== 'undefined' ? Scambi : require('./scambi.js');
  const I = Po._, CAT = Og.CAT, TS = G.TS, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const nm = id => (CAT[id] ? CAT[id].nome : id);
  const S = st => st.comm || (st.comm = { hour: Math.floor(st.t / 60), tick: 0, stats: { raccolti: 0, pipi: 0, pipiMuro: 0, multe: 0, compre: 0, vendite: 0, spaccio: 0, casa: 0, panini: 0, mangiato: 0 } });
  const ok = (st, n) => n && !n.dead && n.pop && n.pop.ints && !(n.jailedUntil > st.t) && !I.isPassive(st, n) && !n.pop.errand && !(n.pop.with);
  const say = (st, n, t) => { if (n.pop.near && !n.inside && dist(n.x, n.y, st.player.x, st.player.y) < 30 && st.clock > (n.barkCd || 0)) { G.say(st, n, t, 2.2); n.barkCd = st.clock + 6; } };
  const roadAt = (x, y) => G.MAP.grid[Math.floor(y / TS) * G.MAP.world.GW + Math.floor(x / TS)] === G.T.VIA;

  // ---------------- LE BOTTEGHE ----------------
  function shopsSelling(st, ids) {
    const E = Ec.eco(st), wd = Po.weekday(st.t), h = G.hour(st);
    return Object.values(E.shops).filter(Sh => Sh.t && !Sh.black && ids.some(id => Sh.sells[id] && (Sh.stock[id] || 0) > 0) && !(Sh.market && !([2, 5].includes(wd) && h >= 6 && h < 13)) && h >= 7 && h < 20);
  }
  const nearest = (n, list) => list.slice().sort((a, b) => dist(a.t.x, a.t.y, n.x, n.y) - dist(b.t.x, b.t.y, n.x, n.y))[0];

  // ---------------- PISCIARE ----------------
  function bladder(st, n, mins) {
    const P = n.pop, N = P.need; if (!N) return;
    const drinking = P.cur && (P.cur.obj === 'bancone' || P.cur.act === 'sfogo' || /bere/.test(P.cur.label || ''));
    N.vescica = clamp((N.vescica || rnd() * .4) + mins / 300 * (drinking ? 2.2 : 1) * (P.age > 65 ? 1.3 : 1), 0, 1);
  }
  function relieve(st, n) {
    const P = n.pop, N = P.need, b = P.cur, X = S(st).stats; if (!N || N.vescica < .78 || !b) return false;
    // dentro (casa, bar, bottega, lavoro): si usa il bagno, non si vede
    if (n.inside || b.act === 'sonno') { if (n.inside || N.vescica > .95) { N.vescica = 0; X.pipi++; } return true; }
    if (!P.near) { N.vescica = 0; X.pipi++; return true; }
    // fuori: casa o bar se sono vicini; se no, quando non ce la fa più, un muro
    const home = P.homeT && dist(P.homeT.x, P.homeT.y, n.x, n.y) < 25 ? P.homeT : null;
    const bar = home ? null : ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2', 'flipper'].map(id => I.target(id)).filter(t => t && dist(t.x, t.y, n.x, n.y) < 35).sort((a, c) => dist(a.x, a.y, n.x, n.y) - dist(c.x, c.y, n.x, n.y))[0];
    if ((home || bar) && N.vescica < .93) return I.errand(st, n, { kind: 'pipi', tgt: home || bar, act: 'commissione', label: home ? 'corre a casa un momento' : `entra al bar per il bagno`, secs: 4, mins: 5 });
    const brazen = (n.tr ? n.tr.legge < .4 : false) || (P.drunk || 0) > .3 || G.isNight(st) || N.vescica > .97;
    if (!brazen) return false;
    const pl = G.nearestPlace(n.x, n.y), t = I.target(pl.id); if (!t || t.k !== 'p') return false;
    const ws = I.wallSpot(st, t); if (!ws) return false;
    return I.errand(st, n, { kind: 'pipiMuro', tgt: t, act: 'commissione', label: 'si apparta contro un muro', secs: 9, mins: 5, spot: ws });
  }
  I.ERRAND.pipi = (st, n) => { n.pop.need.vescica = 0; S(st).stats.pipi++; };
  I.ERRAND.pipiMuro = (st, n) => {
    const X = S(st).stats; n.pop.need.vescica = 0; X.pipi++; X.pipiMuro++;
    // un Grigio che vede: multa, e chi passa se lo ricorda
    const cop = st.npcs.find(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, n.x, n.y) < 14);
    if (cop && rnd() < .6) { const f = Math.min(5, Math.max(0, n.pop.money)); n.pop.money -= f; X.multe++; G.say(st, cop, 'Ehi tu! Sei in un paese civile. Multa.', 2.5); I.note(st, n, `multato da un Grigio: l'ha visto fare pipì contro un muro`, 'bad', { w: .3, tag: 'fermato' }); }
    else say(st, n, pick(['Ahh…', 'Non ce la facevo più.']));
    st.npcs.forEach(k => { if (k !== n && k.pop && !k.inside && dist(k.x, k.y, n.x, n.y) < 8 && rnd() < .3) I.note(st, k, `ha visto ${n.first} fare pipì contro un muro`, 'info', { w: .15, who: n.id }); });
  };

  // ---------------- MANGIARE QUANDO GLI PARE ----------------
  function hunger(st, n) {
    const P = n.pop, N = P.need; if (!N || N.fame < .7 || n.inside || !P.near) return false;
    if (Sc.has(n, 'panino') || Sc.has(n, 'pane') || Sc.has(n, 'focaccia')) return false;   // mangia dalle tasche (scambi.js)
    if (P.money < 3) return false;
    const L = shopsSelling(st, ['panino', 'pane', 'focaccia']), Sh = nearest(n, L); if (!Sh || dist(Sh.t.x, Sh.t.y, n.x, n.y) > 60) return false;
    return I.errand(st, n, { kind: 'compra', tgt: Sh.t, act: 'commissione', obj: 'bottega', label: `ha fame: va a prendersi qualcosa da ${Sh.label}`, secs: 8, mins: 15, data: { ids: ['panino', 'focaccia', 'pane'], eat: true } });
  }

  // ---------------- COMPRARE ----------------
  function shopping(st, n) {
    const P = n.pop; if (st.t - (P.lastShop || -1e9) < 240 || P.money < 4) return false;
    const W = Sc.wants(st, n).filter(w => w.urg > .3); if (!W.length) return false;
    for (const w of W) {
      const L = shopsSelling(st, w.ids); if (!L.length) continue;
      const Sh = nearest(n, L); if (dist(Sh.t.x, Sh.t.y, n.x, n.y) > 140) continue;
      const id = w.ids.find(x => Sh.sells[x] && (Sh.stock[x] || 0) > 0); if (!id || Ec.price(st, Sh, id) > P.money) continue;
      P.lastShop = st.t;
      return I.errand(st, n, { kind: 'compra', tgt: Sh.t, act: 'commissione', obj: 'bottega', label: `va a comprare ${nm(id)} da ${Sh.label}`, secs: 10, mins: 20, data: { ids: [id], own: w.own } });
    }
    return false;
  }
  I.ERRAND.compra = (st, n, E) => {
    const Sh = Ec.shopAt(st, E.tgt); if (!Sh) return;
    const id = E.data.ids.find(x => Sh.sells[x] && (Sh.stock[x] || 0) > 0); if (!id) { I.note(st, n, `da ${Sh.label} ${nm(E.data.ids[0])} era finito`, 'bad', { w: .2, tag: 'scarsita' }); say(st, n, 'Finito? Di nuovo?'); return; }
    const p = Ec.buy(st, n, E.tgt, id, 1); if (p === null) return;
    S(st).stats.compre++;
    if (E.data.eat) { const N = n.pop.need; N.fame = clamp(N.fame - .45, 0, 1); S(st).stats.panini++; n.hand = null; say(st, n, 'Ci voleva.'); return; }
    Sc.put(n, id, 1); if (E.data.own) n.pop.owns[E.data.own] = true;
    n.hand = CAT[id] && (CAT[id].peso || 0) > 3 ? 'mobili' : 'merce';   // il pacco in mano fino a casa
    if (HEAVY(id)) { const h = helperFor(st, n); if (h && I.errand(st, h, { kind: 'aiutaPortare', tgt: n.pop.homeT, act: 'commissione', label: `aiuta ${n.first} a portare ${nm(id)}`, secs: 6, mins: 20, data: { who: n.id, id }, force: true })) { h.hand = 'mobili'; say(st, n, `${h.first}, mi dai una mano?`); I.note(st, n, `${h.first} gli dà una mano a portare ${nm(id)}`, 'good', { w: .25, who: h.id, tag: 'insieme' }); } }
    n.pop.carryHome = st.t;
    I.note(st, n, `comprato ${nm(id)} da ${Sh.label} (${Math.round(p * 10) / 10}.000 lire)`, 'info', { w: .15, tag: 'spesa' });
    if (E.data.then) { const nx = E.data.then; I.errand(st, n, Object.assign({ force: true }, nx)); }
  };

  // ---------------- VENDERE AL MERCATO ----------------
  const MAKES = [[/pescator/, ['pesce', 'sarde']], [/braccian|contadin|ortolan/, ['verdura', 'patate', 'pomodori']], [/allevator/, ['uova', 'formaggio']], [/fornai/, ['pane', 'focaccia']], [/vignaiol/, ['vino']], [/boscaiol/, ['legna']]];
  function selling(st, n) {
    const P = n.pop, wd = Po.weekday(st.t), h = G.hour(st); if (![2, 5].includes(wd) || h < 7 || h > 11 || st.t - (P.lastSell || -1e9) < 1440) return false;
    // chi produce porta al banchetto quello che fa col suo lavoro; gli altri quello che hanno in più
    const job = ((P.job && (P.job.base || P.job.title)) || '').toLowerCase(), mk = MAKES.find(([re]) => re.test(job));
    if (mk && !P.marketStock) { mk[1].filter(id => CAT[id]).forEach(id => Sc.put(n, id, 5)); P.marketStock = st.t; }   // oltre alla sua scorta
    const goods = Sc.surplus(n).filter(id => CAT[id] && (CAT[id].cat === 'cibo' || CAT[id].cat === 'dispensa' || CAT[id].heat || CAT[id].cat === 'rottami'));
    const qty = goods.reduce((s0, id) => s0 + Sc.has(n, id), 0); if (qty < 2) return false;
    const t = I.target('piazza'); if (!t) return false; P.lastSell = st.t;
    return I.errand(st, n, { kind: 'vende', tgt: t, act: 'mercato', obj: 'bancarelle', label: `va al mercato a vendere ${nm(goods[0])}${goods.length > 1 ? ' e altro' : ''}`, secs: 40, mins: 120, data: { goods } });
  }
  I.ERRAND.vende = (st, n, E) => {
    // chi passa al mercato compra (le persone vere che sono in piazza adesso)
    const buyers = st.npcs.filter(k => k !== n && k.pop && k.pop.at && I.tkey(k.pop.at) === I.tkey(E.tgt) && k.pop.money > 6 && !k.dead);
    let got = 0, sold = 0;
    n.pop.marketStock = 0;
    E.data.goods.forEach(id => { let q = Math.floor(Math.max(0, Sc.has(n, id) - 1)); buyers.forEach(k => { if (q <= 0 || rnd() > .35) return; const pr = Math.round((CAT[id].prezzo || 1) * (.8 + rnd() * .3) * 10) / 10; if (k.pop.money < pr) return; Sc.take(n, id, 1); Sc.put(k, id, 1); k.pop.money -= pr; n.pop.money += pr; got += pr; sold++; q--; }); });
    S(st).stats.vendite += sold;
    I.note(st, n, sold ? `al mercato ha venduto ${sold} cose (${Math.round(got)}.000 lire)` : 'al mercato non ha venduto niente', sold ? 'good' : 'bad', { w: .3, tag: 'scambio' });
  };

  // ---------------- SPACCIO ----------------
  function craving(st, n) {
    const P = n.pop; if (P.vice !== 'roba' || P.money < 6 || Sc.has(n, 'roba') || st.t - (P.lastFix || -1e9) < 600) return false;
    const dealer = st.npcs.find(k => k.pop && k.pop.giro === 'spacciatore' && !k.dead && !(k.jailedUntil > st.t) && k.pop.cur && k.pop.cur.act === 'giro' && k.pop.at);
    if (!dealer) return false; P.lastFix = st.t;
    const t = dealer.pop.at, spot = t.k === 'p' && dealer.pop.spot ? { x: dealer.x + Math.cos(dealer.face) * .9, y: dealer.y + Math.sin(dealer.face) * .9, face: dealer.face + Math.PI } : null;
    return I.errand(st, n, { kind: 'roba', tgt: t, act: 'commissione', label: 'va a cercare la roba', secs: 6, mins: 15, data: { dealer: dealer.id }, spot });
  }
  I.ERRAND.roba = (st, n, E) => {
    const d = G.byId(st, E.data.dealer); if (!d || d.dead || !d.pop || !d.pop.at || I.tkey(d.pop.at) !== I.tkey(E.tgt)) { I.note(st, n, 'lo spacciatore non c\'era', 'bad', { w: .2 }); return; }
    const c = Math.min(n.pop.money, 4 + rnd() * 4); n.pop.money -= c; d.pop.money += c; Sc.put(n, 'roba', 1); S(st).stats.spaccio++;
    if (d.pop.near && !d.inside) { d.face = Math.atan2(n.y - d.y, n.x - d.x); say(st, d, pick(['Tieni. Non mi hai visto.', 'Svelto.'])); }
    I.note(st, n, n.pop.money < 10 ? 'ha speso gli ultimi soldi per la roba' : `ha comprato la roba da ${d.first}`, 'bad', { w: .35, who: d.id, tag: 'roba' });
    I.note(st, d, `venduto la roba a ${n.first}`, 'shady', { w: .2, who: n.id });
    const cop = st.npcs.find(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, n.x, n.y) < 12);
    if (cop && rnd() < .35) I.arrestFar(st, d, 'spaccio');
  };

  // ---------------- LA CASA: progettarla e sistemarla ----------------
  function homeProject(st, n) {
    const P = n.pop; if (P.money < 30 || st.t - (P.lastHome || -1e9) < 3 * 1440 || !P.homeT || P.age < 20) return false;
    const casa = P.casa || {}, need = !casa.sedia ? 'sedia' : !casa.tavolo ? 'tavolo' : !casa.coperta ? 'coperta' : (P.intW && P.intW.arte > .4 && !casa.vernice) ? 'vernice' : null;
    if (!need || rnd() > .5) return false;
    const L = shopsSelling(st, [need, 'mobili']); const Sh = nearest(n, L); if (!Sh) return false;
    const id = Sh.sells[need] && Sh.stock[need] > 0 ? need : 'mobili'; if (Ec.price(st, Sh, id) > P.money - 10) return false;
    P.lastHome = st.t;
    I.note(st, n, `ha deciso di sistemare casa: gli serve ${nm(id)}`, 'info', { w: .3, tag: 'progetto' });
    return I.errand(st, n, { kind: 'compra', tgt: Sh.t, act: 'commissione', obj: 'bottega', label: `va a prendere ${nm(id)} per la casa`, secs: 10, mins: 20,
      data: { ids: [id], then: { kind: 'casa', tgt: P.homeT, act: 'casa', label: id === 'vernice' ? 'imbianca casa' : 'sistema casa', secs: 25, mins: 90, data: { id } } } });
  }
  I.ERRAND.casa = (st, n, E) => {
    const P = n.pop; S(st).stats.casa++; n.hand = null;
    if (P.need) P.need.svago = Math.max(0, (P.need.svago || 0) - .3);
    I.note(st, n, E.data.id === 'vernice' ? 'ha imbiancato una stanza: la casa sembra un\'altra' : `ha sistemato casa (${nm(E.data.id)} nuovo)`, 'good', { w: .35, tag: 'progetto' });
  };

  // ---------------- RACCOGLIERE DA TERRA ----------------
  // soldi caduti, un'arma lasciata lì: chi è vicino e avido (o al verde, o poco onesto) ci va, si china e la prende
  function pickup(st, n) {
    const P = n.pop; if (!P.near || n.inside) return false;
    const greedy = (n.tr ? n.tr.avid > .55 || n.tr.legge < .4 : false) || P.money < 5; if (!greedy) return false;
    const k = (st.pickups || []).find(q => q.drop && (q.takenAt === null || q.takenAt === undefined) && !q.claimed && dist(q.x, q.y, n.x, n.y) < 16 && (q.kind === 'soldi' || (n.tr && n.tr.cor > .6 && n.tr.legge < .45)));
    if (!k) return false;
    const pl = G.nearestPlace(k.x, k.y), t = { k: 'p', pid: pl.id, x: k.x, y: k.y, label: pl.name, place: pl.id };
    if (!I.errand(st, n, { kind: 'raccogli', tgt: t, act: 'commissione', label: 'raccoglie qualcosa da terra', secs: 2.5, mins: 3, data: { id: k.id }, spot: { x: k.x, y: k.y, face: n.face } })) return false;
    k.claimed = n.id; return true;
  }
  I.ERRAND.raccogli = (st, n, E) => {
    const k = (st.pickups || []).find(q => q.id === E.data.id); if (!k || (k.takenAt !== null && k.takenAt !== undefined)) { say(st, n, 'Sparito…'); return; }
    k.takenAt = st.t; const P = n.pop; S(st).stats.raccolti++;
    if (k.kind === 'soldi') { P.money += k.amount || 5; I.note(st, n, `trovato ${k.amount || 5}.000 lire per terra`, 'good', { w: .3 }); say(st, n, 'Guarda qua…'); }
    else { P.inv = P.inv || {}; P.inv[k.kind] = (P.inv[k.kind] || 0) + 1; I.note(st, n, `raccolto da terra: ${G.PICKUP_LABEL[k.kind] || k.kind}`, 'shady', { w: .45 }); }
    st.npcs.forEach(w => { if (w !== n && w.pop && !w.inside && dist(w.x, w.y, n.x, n.y) < 10 && Math.random() < .5) I.note(st, w, `ha visto ${n.first} raccogliere ${k.kind === 'soldi' ? 'dei soldi' : 'un\'arma'} da terra`, 'info', { w: .25, who: n.id }); });
  };

  // ---------------- PORTARE IN DUE ----------------
  // le cose grosse (un tavolo, un mobile, una branda) non le porta uno solo: si chiama un amico o un parente che è vicino
  function helperFor(st, n) {
    const P = n.pop, cands = (P.friends || []).concat(((st.pop.households[P.hh] || {}).members || [])).map(id => G.byId(st, id)).filter(k => k && k !== n && ok(st, k) && k.pop.cur && !k.pop.cur.fixed && k.pop.cur.act !== 'lavoro' && k.pop.cur.act !== 'sonno' && dist(k.x, k.y, n.x, n.y) < 70);
    return cands.sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y))[0] || null;
  }
  const HEAVY = id => CAT[id] && (CAT[id].peso || 0) >= 6;
  I.ERRAND.aiutaPortare = (st, n, E) => {
    const o = G.byId(st, E.data.who); n.hand = null;
    I.note(st, n, `ha aiutato ${o ? o.first : 'un amico'} a portare a casa ${nm(E.data.id)}`, 'good', { w: .35, who: E.data.who, tag: 'insieme' });
    if (o && o.pop) { I.note(st, o, `${n.first} l'ha aiutato a portare ${nm(E.data.id)}`, 'good', { w: .35, who: n.id, tag: 'insieme' }); try { Azioni.moveRel(st, o, n, .05, 0); } catch (e) { } }
  };

  // ---------------- IL GIRO DI OGNI ORA ----------------
  function tick(st) {
    const M = S(st); if (st.clock < M.tick) return; M.tick = st.clock + 1.5;
    for (const n of st.npcs) {
      if (!ok(st, n)) continue;
      const P = n.pop;
      // il pacco si posa una volta a casa
      if (n.hand && (n.hand === 'merce' || n.hand === 'mobili') && P.carryHome && P.at && I.isHomeT(P, P.at) && n.inside) { n.hand = null; P.carryHome = 0; }
      if (relieve(st, n)) continue;
      if (rnd() > .25) continue;   // non tutti decidono tutto nello stesso istante
      if (hunger(st, n) || craving(st, n) || pickup(st, n)) continue;
      const b = P.cur; if (!b || b.fixed || b.act === 'lavoro' || b.act === 'sonno') continue;
      const urgent = Sc.wants(st, n).some(w => w.urg > .5);
      if (selling(st, n) || (!urgent && homeProject(st, n)) || shopping(st, n)) continue;
    }
  }
  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => {
    if (s0) s0(st, dt);
    if (!st.pop) return;
    const M = S(st), hm = Math.floor(st.t / 60);
    while (M.hour < hm) { M.hour++; st.npcs.forEach(n => { if (n.pop && n.pop.need && !n.dead) bladder(st, n, 60); }); }
    tick(st);
  };
  function report(st) { return Object.assign({}, S(st).stats); }
  return { report, shopsSelling };
})();
if (typeof module !== 'undefined') module.exports = Commissioni;
