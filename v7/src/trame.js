/* Porto Vecchio — Le Trame: piani, ricognizioni, complici, insabbiare, infamare, tradire (solo logica, nessuna grafica).
   Le cose storte si organizzano come quelle buone (imprese.js), ma di nascosto, e tutto si fa nel gioco:
   - SCASSO a una bottega: chi ha bisogno o il vizio del furto lo propone a chi si fida; ognuno ha un compito (il palo, chi
     scassina, chi porta). Prima la RICOGNIZIONE: uno va davanti alla bottega di giorno e si guarda intorno (chi c'è, se
     passano i Grigi). Se manca il piede di porco qualcuno va a comprarlo. Di notte ci vanno davvero (impegno nella
     giornata); il bottino si porta via in due e si NASCONDE in casa di chi l'ha organizzato, poi si rivende al Magazzino.
     Dopo: ci si accorda su cosa dire (INSABBIARE: l'alibi), chi ha un nemico gli dà la colpa (INFAMARE: lo va a dire in
     giro), e chi ha paura o rispetta la legge può TRADIRE (lo dice ai Grigi).
   - AGGUATO: chi ha un conto in sospeso studia la giornata dell'altro (dove sarà e quando), raduna gli amici e lo aspetta
     là; quando arriva lo picchiano (Azioni). Chi ha visto se lo ricorda.
   - INFAMIA: chi ce l'ha con qualcuno va di persona dai pettegoli e gli racconta che quel furto l'ha fatto lui.
   - PROTESTA: quando la rabbia è di tanti ci si raduna sotto la Rocca o l'Emporio, si grida, qualcuno tira un sasso
     (Game.npcThrow: vola davvero e rompe la vetrina); i Grigi possono portare via qualcuno.
   Si aggancia a Game.HOOKS dopo popolo.js, azioni.js, scambi.js, imprese.js e commissioni.js. */
var Trame = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Az = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const Ec = typeof Economia !== 'undefined' ? Economia : require('./economia.js');
  const Sc = typeof Scambi !== 'undefined' ? Scambi : require('./scambi.js');
  const Cm = typeof Commissioni !== 'undefined' ? Commissioni : null;
  const RS = typeof Risacca !== 'undefined' ? Risacca : null;
  const I = Po._, PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const hhmm = I.hhmm, minOfDay = I.minOfDay, dayIdx = I.dayIdx;
  const S = st => st.trame || (st.trame = { list: [], next: 1, hour: Math.floor(st.t / 60), stats: { nate: 0, ricognizioni: 0, attrezzi: 0, scassi: 0, scassiFalliti: 0, bottino: 0, nascosti: 0, rivenduti: 0, alibi: 0, infamie: 0, tradimenti: 0, agguati: 0, proteste: 0, sassi: 0, arresti: 0 } });
  const common = n => !(n.cop || n.military || n.faction || (RS && RS.CARDS[n.id] && RS.CARDS[n.id].antag) || ['sandro', 'vasco', 'pardo', 'zia', 'ferri'].includes(n.id));
  const free = (st, n) => n && !n.dead && n.pop && n.pop.ints && !(n.jailedUntil > st.t) && !I.isPassive(st, n) && common(n);
  const friends = (st, n) => (n.pop.friends || []).map(id => G.byId(st, id)).filter(k => free(st, k));
  const say = (st, n, t) => { if (n.pop && n.pop.near && !n.inside && dist(n.x, n.y, st.player.x, st.player.y) < 30 && st.clock > (n.barkCd || 0)) { G.say(st, n, t, 2.4); n.barkCd = st.clock + 6; } };
  const busy = new Set();
  function freeAt(st, n, t, dur) {
    const P = n.pop, m = minOfDay(t), wd = (dayIdx(t) + 1) % 7;
    if (P.job && !P.job.night && wd !== 6 && m + dur > P.job.start * 60 - 30 && m < P.job.end * 60) return false;
    if (P.appt && Math.abs(P.appt.t - t) < dur + 60) return false;
    return !(P.impegni || []).some(e => Math.abs(e.t - t) < dur + 60);
  }
  function commit(st, n, T, label, dur, tgt) {
    const P = n.pop; P.impegni = (P.impegni || []).filter(e => e.id !== T.id);
    P.impegni.push({ id: T.id, t: T.t, dur, tgt: tgt || T.tgt, label: label || T.label, obj: null });
    if (dayIdx(T.t) === dayIdx(st.t)) Po.planDay(st, n, dayIdx(st.t));
  }
  function uncommit(st, n, T) { if (n && n.pop && n.pop.impegni) { n.pop.impegni = n.pop.impegni.filter(e => e.id !== T.id); if (dayIdx(T.t) === dayIdx(st.t)) Po.planDay(st, n, dayIdx(st.t)); } }
  const present = (st, n, T) => !!(n && n.pop && n.pop.at && I.tkey(n.pop.at) === I.tkey(T.tgt) && n.pop.cur && n.pop.cur.imp === T.id && !(n.jailedUntil > st.t));
  const crimeEv = (st, type, actor, t, extra) => { const ev = Object.assign({ id: st.nextId++, type, actor: actor.id, x: t.x, y: t.y, t: st.t, sev: G.SEV[type] || .5, noise: 0, place: t.label, npcCrime: true }, extra || {}); st.events.unshift(ev); if (st.events.length > 60) st.events.pop(); return ev; };
  // chi era lì vicino e sveglio vede; al buio e da lontano non riconosce
  function witnesses(st, T, ev, crew) {
    let seen = 0;
    st.npcs.forEach(k => { if (k.dead || k.inside || !k.pop || crew.includes(k)) return; const d = dist(k.x, k.y, T.tgt.x, T.tgt.y); if (d > 22) return;
      const knows = d < 10 && rnd() < .6; G.addMemory(st, k, { eventId: ev.id, type: ev.type, actor: knows ? ev.actor : 'ignoto', place: ev.place, t: ev.t, conf: knows ? .8 : .5, source: 'visto' }); seen++; });
    return seen;
  }

  // ---------------- LO SCASSO ----------------
  function proposeScasso(st, n) {
    if (S(st).list.some(T => T.kind === 'scasso' && st.t - T.born < 1440)) return null;   // al massimo un colpo nuovo al giorno in tutta l'isola
    const P = n.pop, needy = P.money < 8 || (P.debt && P.debt.amount > P.money);
    if (!(P.giro === 'ladro' || (needy && n.tr.legge < .38 && n.tr.cor > .5))) return null;
    const E = Ec.eco(st), job = P.job && P.job.t ? I.tkey(P.job.t) : '';
    const shops = Object.values(E.shops).filter(Sh => Sh.t && Sh.t.k === 'b' && !Sh.black && Sh.cash > 25 && Sh.k !== job).sort((a, b) => (b.cash + (b.emporio ? 40 : 0)) - (a.cash + (a.emporio ? 40 : 0)));
    const Sh = shops[Math.floor(rnd() * Math.min(4, shops.length))]; if (!Sh) return null;
    // i complici: gli amici di cui ci si fida e che non sono troppo onesti, e la malavita che si conosce
    const crew = friends(st, n).filter(k => k.tr.legge < .55).concat(st.npcs.filter(k => k !== n && free(st, k) && k.pop.giro && k.pop.giro !== 'orecchio' && dist(k.pop.homeT.x, k.pop.homeT.y, P.homeT.x, P.homeT.y) < 150)).filter((k, i, a) => !busy.has(k.id) && a.indexOf(k) === i);
    if (!crew.length) return null;
    const day = dayIdx(st.t) + 1, t = day * 1440 + (1 + Math.floor(rnd() * 3)) * 60;
    return { kind: 'scasso', leader: n.id, tgt: Sh.t, shop: Sh.k, t, label: 'un lavoretto di notte', pool: crew.slice(0, 6).map(k => k.id), need: 1, max: 3, dur: 60, roles: { [n.id]: 'scassina' } };
  }
  const SCASSO_ROLES = ['palo', 'porta', 'porta'];
  function scassoSteps(st, T) {
    const L = G.byId(st, T.leader), X = S(st).stats; if (!free(st, L)) return;
    // la ricognizione: il giorno prima (o la mattina), uno si piazza davanti e guarda
    if (!T.recon && !T.reconGo && G.hour(st) >= 9 && G.hour(st) <= 18) {
      const scout = T.members.map(id => G.byId(st, id)).find(k => free(st, k) && !k.pop.errand) || L;
      if (I.errand(st, scout, { kind: 'ricog', tgt: T.tgt, act: 'commissione', label: `si guarda intorno davanti a ${T.tgt.label}`, secs: 18, mins: 30, data: { trama: T.id } })) { T.reconGo = scout.id; }
    }
    // l'attrezzo: se nessuno ha un piede di porco o un grimaldello, chi scassina va a comprarlo
    if (!T.tool && !T.toolGo) {
      const has = T.members.some(id => { const k = G.byId(st, id); return k && (Sc.has(k, 'piede') || Sc.has(k, 'grimaldello')); });
      if (has) T.tool = true;
      else if (Cm && G.hour(st) >= 8 && G.hour(st) < 19) { const Ls = Cm.shopsSelling(st, ['piede']); const Sh = Ls.sort((a, b) => dist(a.t.x, a.t.y, L.x, L.y) - dist(b.t.x, b.t.y, L.x, L.y))[0];
        if (Sh && L.pop.money >= 5 && I.errand(st, L, { kind: 'compra', tgt: Sh.t, act: 'commissione', obj: 'bottega', label: `va a comprare un piede di porco da ${Sh.label}`, secs: 8, mins: 15, data: { ids: ['piede'] } })) { T.toolGo = true; X.attrezzi++; } }
    }
  }
  I.ERRAND.ricog = (st, n, E) => {
    const T = S(st).list.find(x => x.id === E.data.trama); if (!T) return;
    const cops = st.npcs.filter(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, T.tgt.x, T.tgt.y) < 40).length;
    T.recon = { cops, t: st.t, by: n.id }; S(st).stats.ricognizioni++;
    I.note(st, n, `ha studiato ${T.tgt.label}: ${cops ? 'passano i Grigi, bisogna stare attenti' : 'di notte non c\'è nessuno'}`, 'shady', { w: .35, tag: 'trama' });
    T.members.forEach(id => { const k = G.byId(st, id); if (k && k !== n) I.note(st, k, `${n.first} è andato a vedere ${T.tgt.label}`, 'shady', { w: .2, who: n.id, tag: 'trama' }); });
  };
  function doScasso(st, T, here) {
    const X = S(st).stats, Sh = Ec.eco(st).shops[T.shop], L = G.byId(st, T.leader);
    const palo = here.some(k => T.roles[k.id] === 'palo'), cops = st.npcs.filter(k => k.cop && !k.dead && !k.inside && dist(k.x, k.y, T.tgt.x, T.tgt.y) < 30).length;
    const pOk = clamp(.45 + (T.recon ? .15 : -.1) + (T.tool ? .2 : -.25) + (palo ? .12 : 0) - cops * .2 - (st.ris ? st.ris.repr / 400 : 0), .05, .9);
    const ev = crimeEv(st, 'scasso', L, T.tgt, { target: null });
    witnesses(st, T, ev, here);
    if (rnd() > pOk || !Sh) {
      X.scassiFalliti++;
      here.forEach(k => I.note(st, k, `il colpo a ${T.tgt.label} è andato storto: siamo scappati`, 'bad', { w: .5, tag: 'trama' }));
      if (cops && rnd() < .5) { const k = pick(here); I.arrestFar(st, k, 'tentato scasso'); X.arresti++; }
      return;
    }
    X.scassi++;
    const cash = Math.round(Sh.cash * (.4 + rnd() * .3)); Sh.cash -= cash;
    const goods = Object.keys(Sh.stock).filter(g => Sh.stock[g] > 0).sort(() => rnd() - .5).slice(0, 3), loot = {};
    goods.forEach(g => { const q = Math.min(Sh.stock[g], 1 + Math.floor(rnd() * 3)); Sh.stock[g] -= q; loot[g] = q; });
    X.bottino += cash;
    const share = cash / here.length; here.forEach(k => { k.pop.money += share; });
    // la roba si porta via in due e si nasconde in casa di chi l'ha organizzato
    const porters = here.filter(k => T.roles[k.id] === 'porta' || k === L).slice(0, 2);
    porters.forEach(k => { k.hand = 'cassa'; k.pop.carryHome = st.t; });
    L.pop.stash = L.pop.stash || {}; Object.entries(loot).forEach(([g, q]) => { L.pop.stash[g] = (L.pop.stash[g] || 0) + q; }); X.nascosti++;
    here.forEach(k => I.note(st, k, `il colpo a ${T.tgt.label} è riuscito: ${cash}.000 lire${goods.length ? ' e un po\' di roba' : ''}, ${Math.round(share)}.000 a testa`, 'shady', { w: .7, tag: 'trama' }));
    // il proprietario se ne accorge la mattina
    st.timers.push({ at: st.t + 300, kind: 'popDiscover', npc: (st.npcs.find(k => k.shop && PLACES[k.shop] && dist(PLACES[k.shop].x, PLACES[k.shop].y, T.tgt.x, T.tgt.y) < 8) || L).id, ev: ev.id, thief: null, type: 'scasso', place: T.tgt.label, took: cash });
    // dopo: alibi, infamia, tradimento
    after(st, T, here, ev);
  }
  function after(st, T, crew, ev) {
    const X = S(st).stats, L = G.byId(st, T.leader);
    // INSABBIARE: ci si accorda su cosa dire; chi ha visto e conosce uno di loro può decidere di tacere
    const alibi = pick(['eravamo tutti a casa di ' + L.first + ' a giocare a carte', 'quella notte eravamo all\'osteria', 'dormivamo, come tutti']);
    crew.forEach(k => { k.pop.alibi = { ev: ev.id, text: alibi }; I.note(st, k, `d'accordo con gli altri: «${alibi}»`, 'shady', { w: .4, tag: 'trama' }); }); X.alibi++;
    st.npcs.forEach(k => { const m = k.mem && k.mem.find(x => x.eventId === ev.id); if (!m || m.actor === 'ignoto') return; const c = G.byId(st, m.actor); if (c && I.closeness(st, k, c) > .5) { m.silenced = true; I.note(st, k, `ha visto ${c.first} quella notte, ma non dirà niente`, 'shady', { w: .4, who: c.id, tag: 'trama' }); } });
    // INFAMARE: chi ha un nemico va a dire in giro che è stato lui
    crew.forEach(k => { const en = (k.pop.enemies || []).map(id => G.byId(st, id)).find(x => x && !x.dead && x.pop); if (en && rnd() < .5) slanderTrip(st, k, en, ev); });
    // TRADIRE: chi ha paura o rispetta la legge (o ce l'ha col capo) può parlare coi Grigi
    crew.forEach(k => { if (k === L) return; const p = (k.tr.legge - .35) * .5 + ((k.pop.need || {}).paura || 0) * .25 - I.closeness(st, k, L) * .3 + (Po.opinionOf(st, k, L.id) < 0 ? .15 : 0);
      if (rnd() < p) { X.tradimenti++; const cop = st.npcs.find(c => c.cop && !c.dead); if (cop) G.addMemory(st, cop, { eventId: ev.id, type: ev.type, actor: L.id, place: ev.place, t: ev.t, conf: .85, source: 'denuncia', via: [k.first] });
        I.note(st, k, `ha detto ai Grigi chi ha fatto il colpo a ${ev.place}`, 'shady', { w: .6, who: L.id, tag: 'tradimento' });
        if (rnd() < .5) { I.arrestFar(st, L, 'scasso (una soffiata)'); X.arresti++; crew.forEach(c => { if (c !== k) I.note(st, c, rnd() < .5 ? `è stato ${k.first} a fare la spia` : 'qualcuno ha fatto la spia', 'bad', { w: .8, who: rnd() < .5 ? k.id : null, tag: 'tradimento' }); }); } } });
  }
  // la refurtiva nascosta si rivende al Magazzino (lo Squalo), di persona
  function fence(st) {
    st.npcs.forEach(n => { const P = n.pop; if (!P || !P.stash || !Object.keys(P.stash).length || n.dead || P.errand || !free(st, n) || rnd() > .2) return;
      const t = I.target('magazzino'); if (!t) return; const h = G.hour(st); if (h < 10 || h > 19) return;
      I.errand(st, n, { kind: 'ricetta', tgt: t, act: 'commissione', label: 'porta un po\' di roba al Magazzino', secs: 10, mins: 20 }); });
  }
  I.ERRAND.ricetta = (st, n) => {
    const P = n.pop; let got = 0; Object.entries(P.stash || {}).forEach(([g, q]) => { const v = (Ec.MERCI[g] ? Ec.MERCI[g][1] : 2) * q * .45; got += v; }); P.stash = {}; P.money += got; S(st).stats.rivenduti++;
    I.note(st, n, `rivenduto la refurtiva al Magazzino: ${Math.round(got)}.000 lire`, 'shady', { w: .35, tag: 'trama' });
  };

  // ---------------- INFAMARE ----------------
  function slanderTrip(st, n, enemy, ev) {
    const gossips = st.npcs.filter(k => k !== n && k !== enemy && free(st, k) && k.tr.loq > .6 && k.pop.at && !k.inside && dist(k.x, k.y, n.x, n.y) < 120).slice(0, 6);
    const g = pick(gossips.length ? gossips : [null]); if (!g) return false;
    if (!ev) ev = st.events.find(e => G.NEG[e.type] && st.t - e.t < 2 * 1440 && e.actor !== enemy.id);
    if (!ev) return false;
    return I.errand(st, n, { kind: 'infamia', tgt: g.pop.at, act: 'commissione', label: `va a parlare con ${g.first}`, secs: 10, mins: 15, data: { to: g.id, enemy: enemy.id, ev: ev.id } });
  }
  I.ERRAND.infamia = (st, n, E) => {
    const g = G.byId(st, E.data.to), en = G.byId(st, E.data.enemy), ev = st.events.find(e => e.id === E.data.ev); if (!g || !en || !ev) return;
    S(st).stats.infamie++;
    say(st, n, `Lo sai chi è stato, a ${ev.place}? ${en.first}. Ma non l'hai sentito da me.`);
    // chi ascolta ci crede di più se si fida di chi parla e non stima già l'altro
    const belief = clamp(.35 + I.closeness(st, g, n) * .3 + Po.opinionOf(st, g, n.id) * .2 - Po.opinionOf(st, g, en.id) * .3, .1, .9);
    if (rnd() < belief) { G.addMemory(st, g, { eventId: ev.id, type: ev.type, actor: en.id, place: ev.place, t: ev.t, conf: .45 + belief * .3, source: 'voce', via: [n.first], framedBy: n.id }); I.note(st, g, `${n.first} dice che è stato ${en.first} (${ev.place})`, 'info', { w: .3, who: en.id }); try { Az.moveRel(st, g, en, -.1, 0); } catch (e) { } }
    I.note(st, n, `ha messo in giro che a ${ev.place} è stato ${en.first}`, 'shady', { w: .5, who: en.id, tag: 'infamia' });
  };

  // ---------------- L'AGGUATO ----------------
  function proposeAgguato(st, n) {
    if (n.tr.cor < .55) return null;
    const P = n.pop, grudge = (P.lunga || []).concat(P.diary || []).filter(m => m.kind === 'bad' && m.who && m.who !== 'player' && /furto|tradimento|bidone|infamia/.test(m.tag || '') && m.w > .45).sort((a, b) => b.w - a.w)[0];
    const en = grudge && G.byId(st, grudge.who); if (!en || !free(st, en) || !en.pop.plan) return null;
    // la ricognizione: dove sarà oggi, all'aperto, fra un paio d'ore
    const m = minOfDay(st.t), b = en.pop.plan.find(x => x.at > m + 120 && x.tgt && x.tgt.k === 'p' && x.act !== 'sonno'); if (!b) return null;
    const crew = friends(st, n).filter(k => k.tr.cor > .45 && k !== en && !busy.has(k.id)); if (!crew.length) return null;
    I.note(st, n, `sa che ${en.first} alle ${hhmm(b.at)} sarà a ${b.tgt.label}`, 'shady', { w: .4, who: en.id, tag: 'trama' });
    return { kind: 'agguato', leader: n.id, tgt: b.tgt, t: dayIdx(st.t) * 1440 + b.at + 10, label: 'una faccenda da sistemare', victim: en.id, why: grudge.text, pool: crew.map(k => k.id), need: 1, max: 2, dur: 60, roles: { [n.id]: 'mena' } };
  }
  function doAgguato(st, T, here) {
    const v = G.byId(st, T.victim), X = S(st).stats; if (!v || v.dead) return;
    if (!(v.pop && v.pop.at && I.tkey(v.pop.at) === I.tkey(T.tgt))) { here.forEach(k => I.note(st, k, `abbiamo aspettato ${v.first} a ${T.tgt.label}, ma non è passato`, 'info', { w: .3, tag: 'trama' })); return; }
    X.agguati++;
    here.forEach(k => { try { Az.intend(st, k, 'picchia', { chi: v, perche: T.why || 'un conto in sospeso' }, 3); } catch (e) { } });
    here.forEach(k => I.note(st, k, `con gli altri abbiamo dato una lezione a ${v.first}`, 'shady', { w: .6, who: v.id, tag: 'trama' }));
  }

  // ---------------- LA PROTESTA ----------------
  function proposeProtesta(st, n) {
    const P = n.pop; if (!n.ris || n.ris.ideo < .6 || (P.need || {}).rabbia < .65 || n.tr.cor < .5) return null;
    const angry = st.npcs.filter(k => k !== n && free(st, k) && k.ris && k.ris.ideo > .5 && ((k.pop.need || {}).rabbia > .45 || I.closeness(st, n, k) > .6) && !busy.has(k.id));
    if (angry.length < 3) return null;
    const where = rnd() < .5 ? 'rocca' : (G.BUILDINGS.findIndex(b => b.use === 'emporio') >= 0 ? 'b:' + G.BUILDINGS.find(b => b.use === 'emporio').id : 'rocca');
    const tgt = I.target(where); if (!tgt) return null;
    const day = dayIdx(st.t) + (G.hour(st) < 14 ? 0 : 1), t = day * 1440 + 17 * 60 + 30;
    return { kind: 'protesta', leader: n.id, tgt, t, label: `ritrovarsi sotto ${tgt.label}`, pool: angry.slice(0, 12).map(k => k.id), need: 4, max: 10, dur: 60, roles: { [n.id]: 'grida' } };
  }
  function doProtesta(st, T, here) {
    const X = S(st).stats; X.proteste++;
    const lines = ['Ridateci i nostri figli!', 'Il Garante mente!', 'Vergogna!', 'Basta Tutela!', 'Liberi!'];
    here.forEach(k => { say(st, k, pick(lines)); if (k.pop.need) k.pop.need.rabbia = Math.max(0, k.pop.need.rabbia - .4); });
    // i più arrabbiati tirano un sasso contro la facciata (vola davvero, la vetrina si rompe)
    here.filter(k => k.tr.legge < .45 && k.tr.cor > .55).slice(0, 2).forEach(k => { if (k.pop.near && !k.inside) { G.npcThrow(st, k, T.tgt.x + (rnd() - .5) * 2, T.tgt.y - Math.sign(T.tgt.y - k.y) * .9); X.sassi++; I.note(st, k, `ha tirato un sasso contro ${T.tgt.label}`, 'shady', { w: .55, tag: 'trama' }); } else { X.sassi++; } });
    if (st.ris) { st.ris.morale = clamp(st.ris.morale + here.length * .4, 0, 100); st.ris.repr = clamp(st.ris.repr + here.length * .5, 0, 100); }
    const rl = st.ris ? Math.min(5, Math.floor(st.ris.repr / 20)) : 1;
    here.forEach(k => { if (rnd() < .04 + rl * .03) { I.arrestFar(st, k, 'manifestazione non autorizzata'); X.arresti++; } });
    here.forEach(k => I.note(st, k, `eravamo in ${here.length} sotto ${T.tgt.label} a gridare`, 'good', { w: .55, tag: 'trama' }));
    G.addLog(st, `${G.clockStr(st.t)} · In ${here.length} sotto ${T.tgt.label} a gridare contro la Tutela.`, 'info');
  }

  // ---------------- IL CICLO: proporre, cercare complici, preparare, fare ----------------
  const PROPOSE = [proposeScasso, proposeAgguato, proposeProtesta];
  function propose(st) {
    const M = S(st); if (M.list.filter(T => T.status === 'cerca' || T.status === 'pronta').length >= 6) return;
    busy.clear(); M.list.forEach(T => { if (T.status === 'cerca' || T.status === 'pronta') T.members.forEach(id => busy.add(id)); });
    const cands = st.npcs.filter(n => free(st, n) && !busy.has(n.id) && rnd() < .03);
    for (const n of cands) for (const f of PROPOSE) {
      const T = f(st, n); if (!T) continue;
      if (M.list.some(x => x.kind === T.kind && (x.status === 'cerca' || x.status === 'pronta') && (x.leader === n.id || (T.victim && x.victim === T.victim)))) continue;
      if (!freeAt(st, n, T.t, T.dur)) continue;
      Object.assign(T, { id: 't' + M.next++, members: [n.id], asked: [n.id], status: 'cerca', born: st.t }); M.list.push(T); M.stats.nate++;
      commit(st, n, T, T.label, T.dur);
      I.note(st, n, `ha in mente ${T.kind === 'scasso' ? `un colpo a ${T.tgt.label}` : T.kind === 'agguato' ? `di aspettare ${G.nameOf(st, T.victim)} a ${T.tgt.label}` : T.label}`, 'shady', { w: .5, tag: 'trama' });
      return;
    }
  }
  function recruit(st) {
    S(st).list.filter(T => T.status === 'cerca').forEach(T => {
      const L = G.byId(st, T.leader); if (!free(st, L)) { T.status = 'annullata'; return; }
      const pool = T.pool.filter(id => !T.asked.includes(id)).map(id => G.byId(st, id)).filter(k => free(st, k));
      pool.slice(0, 2).forEach(k => {
        T.asked.push(k.id);
        const p = .1 + I.closeness(st, k, L) * .45 + Po.opinionOf(st, k, L.id) * .3 + (T.kind === 'scasso' ? (.5 - k.tr.legge) * .6 + (k.pop.money < 10 ? .2 : 0) : T.kind === 'agguato' ? k.tr.cor * .3 : (k.ris ? k.ris.ideo * .4 : 0)) + ((k.pop.debiti || {})[L.id] ? .25 : 0);
        if (freeAt(st, k, T.t, T.dur) && rnd() < p) {
          T.members.push(k.id); T.roles[k.id] = T.kind === 'scasso' ? SCASSO_ROLES[(T.members.length - 2) % 3] : T.kind === 'agguato' ? 'mena' : 'grida';
          commit(st, k, T, T.label, T.dur);
          I.note(st, k, `${L.first} gli ha proposto ${T.kind === 'scasso' ? `un colpo a ${T.tgt.label} (fa ${T.roles[k.id]})` : T.kind === 'agguato' ? `di aspettare ${G.nameOf(st, T.victim)}` : T.label}: ha detto di sì`, 'shady', { w: .5, who: L.id, tag: 'trama' });
        } else {
          I.note(st, k, `${L.first} gli ha proposto una cosa storta: ha detto di no`, 'info', { w: .35, who: L.id, tag: 'trama' });
          // chi rifiuta e rispetta la legge può avvisare (il piano salta, il capo se lo ricorda)
          if (T.kind !== 'protesta' && k.tr.legge > .7 && rnd() < .25) { const cop = st.npcs.find(c => c.cop && !c.dead); if (cop) G.addMemory(st, cop, { eventId: 'piano' + T.id, type: 'aggressione', actor: L.id, place: T.tgt.label, t: st.t, conf: .5, source: 'denuncia', via: [k.first] }); T.leak = true; }
        }
      });
      if (T.members.length - 1 >= T.need) T.status = 'pronta';
    });
  }
  function run(st) {
    const M = S(st);
    M.list.forEach(T => {
      if (T.status === 'pronta' || T.status === 'cerca') { if (T.kind === 'scasso' && st.t < T.t - 60) scassoSteps(st, T); }
      if (T.status === 'cerca' && st.t > T.t - 30) { T.status = 'annullata'; T.members.forEach(id => uncommit(st, G.byId(st, id), T)); const L = G.byId(st, T.leader); if (L && L.pop) I.note(st, L, 'non ha trovato nessuno che ci stesse: lascia perdere', 'info', { w: .3, tag: 'trama' }); return; }
      if (T.status !== 'pronta') return;
      if (st.t >= T.t - 15 && st.t <= T.t + 35) { T.here = T.here || {}; T.members.forEach(id => { const k = G.byId(st, id); if (present(st, k, T)) T.here[id] = 1; }); }
      if (st.t < T.t + 35) return;
      const here = T.members.filter(id => T.here && T.here[id]).map(id => G.byId(st, id)).filter(Boolean);
      T.status = 'fatta';
      if (here.length < Math.min(2, T.members.length)) { here.forEach(k => I.note(st, k, 'gli altri non sono venuti: niente da fare', 'bad', { w: .4, tag: 'trama' })); T.status = 'fallita'; return; }
      if (T.kind === 'scasso') doScasso(st, T, here); else if (T.kind === 'agguato') doAgguato(st, T, here); else doProtesta(st, T, here);
      T.members.filter(id => !T.here[id]).forEach(id => { const k = G.byId(st, id); if (k && !k.dead && !(k.jailedUntil > st.t)) here.forEach(h => I.note(st, h, `${k.first} si è tirato indietro all'ultimo`, 'bad', { w: .45, who: id, tag: 'bidone' })); });
    });
    M.list = M.list.filter(T => !(['fatta', 'fallita', 'annullata'].includes(T.status) && st.t - T.t > 2 * 1440));
  }
  // il pacco del colpo si posa a casa
  function unload(st) { st.npcs.forEach(n => { if (n.hand === 'cassa' && n.pop && n.pop.at && I.isHomeT(n.pop, n.pop.at) && n.inside) n.hand = null; }); }
  // infamie anche senza colpi: chi ha un nemico, ogni tanto, lo fa
  function grudges(st) {
    st.npcs.forEach(n => { if (!free(st, n) || n.pop.errand || rnd() > .01) return; const en = (n.pop.enemies || []).map(id => G.byId(st, id)).find(x => x && !x.dead && x.pop); if (en && n.tr.legge < .6) slanderTrip(st, n, en, null); });
  }

  // in chat il personaggio sa delle sue trame, ma non le racconta a chiunque
  if (RS) RS.EXT.stateExtra.push((st, n) => {
    const L = S(st).list.filter(T => (T.status === 'cerca' || T.status === 'pronta') && T.members.includes(n.id)); if (!L.length) return '';
    return '[SEGRETO, NON DIRLO SE NON TI FIDI CIECAMENTE] ' + L.map(T => `${T.leader === n.id ? 'Ha organizzato' : 'È dentro a'}: ${T.kind === 'scasso' ? `un colpo a ${T.tgt.label}` : T.kind === 'agguato' ? `aspettare ${G.nameOf(st, T.victim)} a ${T.tgt.label}` : T.label}, ${dayIdx(T.t) > dayIdx(st.t) ? 'domani' : 'oggi'} alle ${hhmm(minOfDay(T.t))}, con ${T.members.filter(id => id !== n.id).map(id => G.nameOf(st, id)).join(', ') || 'nessuno ancora'}.`).join(' ') + (n.pop.alibi ? ` Alibi concordato: «${n.pop.alibi.text}».` : '');
  });

  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => {
    if (s0) s0(st, dt);
    if (!st.pop) return;
    const M = S(st), hm = Math.floor(st.t / 60);
    while (M.hour < hm) { M.hour++; const hr = M.hour % 24; if (hr >= 8 && hr <= 22) { propose(st); recruit(st); fence(st); grudges(st); } }
    run(st); if (st.clock > (M.ul || 0)) { M.ul = st.clock + 1; unload(st); }
  };
  function report(st) { return Object.assign({ attive: S(st).list.filter(T => T.status === 'cerca' || T.status === 'pronta').length }, S(st).stats); }
  return { report, list: st => S(st).list, slanderTrip };
})();
if (typeof module !== 'undefined') module.exports = Trame;
