/* Porto Vecchio — Il Protagonista: una vita come quella degli altri (solo logica, nessuna grafica).
   Una casa in periferia ovest, tre amici del quartiere, un lavoro con l'orario d'ingresso, l'affitto del lunedì,
   la paga del venerdì, i bisogni (fame, sonno, igiene, svago, compagnia) e i vizi (vino, sigarette).
   Le azioni compaiono nel menu QUI, ADESSO delle Tasche (Azioni.playerActions) e passano il tempo davvero:
   dormire, lavorare, mangiare fanno correre l'orologio (Game.step accelerato) finché qualcosa non interrompe.
   Si aggancia a Game.HOOKS e a Risacca.EXT.willMod (come ti vedono quando parli: brillo, sporco, stanco). */
var Protagonista = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const W = typeof World !== 'undefined' ? World : require('./world.js');
  const PO = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : null;
  const I = PO._, PLACES = G.PLACES, TS = G.TS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const NAME = () => G.PLAYER_NAME;
  // «al Bar Da Gino», «all'Osteria», «alla Sala giochi»
  const al = id => { const n = PLACES[id] ? PLACES[id].name : id; return /^[AEIOU]/i.test(n) ? `all'${n}` : /^(Sala|Trattoria|Gelateria|Pensione|Discoteca|Taverna)/.test(n) ? `alla ${n}` : `al ${n}`; };

  // ---------------- REGOLE ----------------
  const CFG = {
    rent: 12,                       // affitto a settimana (migliaia di lire), il lunedì
    grow: { fame: .06, sonno: .045, igiene: .028, svago: .035, compagnia: .04 },   // per ora di gioco, da sveglio
    sleepRest: .17,                 // quanto sonno si toglie per ora di letto
    warp: 40,                       // passi di simulazione per fotogramma quando il tempo corre
    friends: 3,
  };
  const BARS = ['bar', 'sirena', 'osteria', 'osteria_sg', 'car_2', 'flipper'];
  const MEALS = { bar: ['un panino', 3, .5], sirena: ['un panino', 3, .5], flipper: ['un toast', 3, .45], osteria: ['un piatto caldo', 6, .9], osteria_sg: ['un piatto caldo', 6, .9], car_2: ['un piatto caldo', 6, .9] };

  // ---------------- DOVE SEI ----------------
  const p = st => st.player;
  const doorOf = bi => { const b = G.BUILDINGS[bi]; return b && b.door ? { x: b.door[0] * TS + TS / 2, y: b.door[1] * TS + TS / 2 } : null; };
  // sei in quell'edificio, o sulla sua soglia
  function atB(st, bi, r) { const P = p(st); if (P.indoor) return P.indoor.b === bi; const d = doorOf(bi); return !!d && dist(d.x, d.y, P.x, P.y) < (r || 3.5); }
  function atPlace(st, id, r) { const bi = G.BUILDINGS.findIndex(b => b.id === id); if (bi >= 0 && G.BUILDINGS[bi].door) return atB(st, bi, r); const q = PLACES[id]; return !!q && !p(st).indoor && dist(q.x, q.y, p(st).x, p(st).y) < (r || 6); }
  const hereBar = st => BARS.find(id => atPlace(st, id));
  const atHome = st => st.me && atB(st, st.me.home.bi);
  // il posto di lavoro più vicino (edifici con mestieri, dalla tabella della vita)
  function workHere(st) {
    const IX = PO.buildIndex();
    return IX.works.filter(w => w.bi >= 0 && atB(st, w.bi, 3)).concat(IX.works.filter(w => w.bi < 0 && atPlace(st, w.id, 7)));
  }
  function freeSlots(st, w) {
    const key = (w.title) + '@' + (w.bi >= 0 ? 'b' + w.bi : 'p' + w.id);
    const used = st.npcs.filter(n => !n.dead && n.pop && n.pop.job && n.pop.job.t && ((n.pop.job.base || n.pop.job.title) + '@' + I.tkey(n.pop.job.t)) === key).length;
    return w.slots - used;
  }

  // ---------------- CREAZIONE ----------------
  function create(st) {
    const P = p(st);
    // la casa: in periferia ovest, una dove non abita nessuno
    const used = new Set(st.npcs.filter(n => n.pop && n.pop.homeT && n.pop.homeT.k === 'b').map(n => n.pop.homeT.bi));
    const all = G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.door && (b.use === 'casa' || b.block) && W.districtAt((b.x + b.w / 2) * TS) === 'perif_o');
    const pool = all.filter(([, bi]) => !used.has(bi)).concat(all).sort((a, c) => W.hash2(a[1], 3, 19) - W.hash2(c[1], 3, 19));
    const hb = pool[0] || G.BUILDINGS.map((b, bi) => [b, bi]).find(([b]) => b.door && b.use === 'casa');
    const home = I.tB(hb[1]); G.BUILDINGS[hb[1]].playerHome = true;
    st.me = {
      home, friends: [], need: { fame: .25, sonno: .2, igiene: .15, svago: .3, compagnia: .35 },
      drunk: 0, hangover: 0, alcol: 0, cig: 6, calmUntil: 0, pantry: 3, job: null, owed: 0, late: 0, absent: 0, shift: null,
      rentDebt: 0, loans: {}, stash: {}, warp: null, lastT: st.t, hourMark: Math.floor(st.t / 60), sayCd: {}, inviteFor: null, warned: -1e9,
      log: [], stats: { lavorato: 0, guadagnato: 0, speso: 0, bevuto: 0, fumato: 0, mangiato: 0, dormito: 0 },
    };
    // si comincia sotto casa
    const d = doorOf(hb[1]); if (d) { P.x = d.x; P.y = d.y; }
    // gli amici del quartiere: vicini di casa, non della malavita né della Tutela
    const near = st.npcs.filter(n => n.pop && !n.pop.cast && !n.dead && !n.cop && !n.fam && !n.faction && n.pop.homeT && n.pop.age >= 18 && dist(n.pop.homeT.x, n.pop.homeT.y, home.x, home.y) < 110)
      .sort((a, c) => dist(a.pop.homeT.x, a.pop.homeT.y, home.x, home.y) - dist(c.pop.homeT.x, c.pop.homeT.y, home.x, home.y));
    const chosen = []; for (const n of near) { if (chosen.length >= CFG.friends) break; if (!chosen.some(k => k.pop.hh === n.pop.hh)) chosen.push(n); }
    chosen.forEach(n => {
      n.meFriend = { since: -365 * 1440, bond: .6 + rnd() * .2, lent: 0 };
      if (n.ris) n.ris.bond = clamp((n.ris.bond || 0) + .35, -1, 1);
      I.note(st, n, `${NAME()} del quartiere: ci si conosce da sempre`, 'good', { w: .3, tag: 'amico' });
      st.me.friends.push(n.id);
      setCard(st, n);
    });
    say(st, `Casa tua è ${home.label}, in periferia ovest. Gli amici del quartiere: ${chosen.map(n => n.first).join(', ') || 'nessuno'}.`, 'info');
  }
  function setCard(st, n) {
    const C = RS && RS.CARDS; if (!C) return; const c = C[n.id] || (C[n.id] = {});
    if (c.__baseMe === undefined) c.__baseMe = c.secret || '';
    const f = n.meFriend; if (!f) return;
    c.secret = [c.__baseMe, `È amic${I.o(n)} di ${NAME()} da sempre: stesso quartiere. Si fida di lui${f.lent ? `; gli ha prestato ${f.lent}.000 lire` : ''}.`].filter(Boolean).join(' ');
  }
  function say(st, text, kind) { G.feed(st, text, kind || 'info'); st.me.log.unshift({ t: st.t, text }); if (st.me.log.length > 30) st.me.log.pop(); }

  // ---------------- BISOGNI E VIZI ----------------
  function needsTick(st) {
    const M = st.me, dm = st.t - M.lastT; M.lastT = st.t; if (dm <= 0) return;
    const h = dm / 60, N = M.need, sleeping = M.warp && M.warp.kind === 'sonno', working = M.warp && M.warp.kind === 'lavoro';
    for (const k in CFG.grow) N[k] = clamp(N[k] + CFG.grow[k] * h * (working && (k === 'fame' || k === 'igiene') ? 1.4 : 1), 0, 1);
    if (sleeping) { N.sonno = clamp(N.sonno - (CFG.sleepRest + CFG.grow.sonno) * h, 0, 1); N.fame = clamp(N.fame - CFG.grow.fame * .6 * h, 0, 1); N.svago = clamp(N.svago - CFG.grow.svago * h, 0, 1); N.compagnia = clamp(N.compagnia - CFG.grow.compagnia * .7 * h, 0, 1); }
    if (working) N.compagnia = clamp(N.compagnia - .05 * h, 0, 1);
    // il vino passa, e lascia il conto
    if (M.drunk > 0) { const was = M.drunk; M.drunk = clamp(M.drunk - .22 * h, 0, 1); if (was > .45 && M.drunk <= .45) M.hangover = Math.max(M.hangover, was); }
    if (M.hangover > 0) M.hangover = clamp(M.hangover - .08 * h, 0, 1);
    // l'abitudine passa piano, se non si beve
    if (M.drunk < .05) M.alcol = clamp(M.alcol - .006 * h, 0, 1);
    // la fame vera fa male
    if (N.fame >= 1) P_hp(st, -2 * h);
  }
  function P_hp(st, d) { const P = p(st); P.hp = clamp(P.hp + d, 15, 100); }
  // gli effetti sul corpo: la mira e il passo
  function bodyTick(st) {
    const M = st.me, P = p(st), N = M.need;
    const tired = Math.max(0, N.sonno - .7) / .3, calm = st.t < M.calmUntil;
    // chi è abituato al vino trema quando non beve (astinenza)
    const withdrawal = M.alcol > .45 && M.drunk < .15 ? (M.alcol - .45) * .1 : 0;
    let shake = M.drunk * .09 + tired * .05 + M.hangover * .03 + (N.fame > .85 ? .02 : 0) + withdrawal;
    if (calm) shake *= .4;
    if (shake > .005 && !P.vehicle) P.bloom = Math.max(P.bloom || 0, shake);
    // colpo di sonno
    if (N.sonno >= 1 && !P.vehicle && rnd() < .002) { P.stun = Math.max(P.stun, .8); say(st, 'Ti si chiudono gli occhi da soli. Ti serve un letto.', 'bad'); }
  }
  const slowFactor = st => { const M = st.me, N = M.need; return clamp(1 - Math.max(0, N.sonno - .75) * .8 - M.drunk * .15 - M.hangover * .1, .6, 1); };

  // ---------------- LAVORO ----------------
  function shiftToday(st) {
    const J = st.me.job; if (!J) return null; const wd = PO.weekday(st.t);
    if (wd === 6) return null;                                   // la domenica si riposa
    const day = Math.floor(st.t / 1440) * 1440;
    return { a: day + J.start * 60, z: day + Math.min(J.end, 23.9) * 60 };
  }
  const atWork = st => { const J = st.me.job; if (!J) return false; return J.bi >= 0 ? atB(st, J.bi, 4) : atPlace(st, J.place, 8); };
  function jobTick(st, dm) {
    const M = st.me, J = M.job; if (!J) return;
    const S = shiftToday(st), dayN = Math.floor(st.t / 1440);
    if (!S) return;
    if (!M.shift || M.shift.day !== dayN) M.shift = { day: dayN, came: null, worked: 0, closed: false };
    const sh = M.shift;
    if (st.t >= S.a && st.t < S.z && atWork(st)) {
      if (sh.came === null) {
        sh.came = st.t;
        if (st.t > S.a + 10) { M.late++; say(st, `Arrivi tardi al lavoro (${Math.round(st.t - S.a)} minuti). Il padrone ti guarda storto.${M.late >= 3 ? ' Un\'altra volta e sei fuori.' : ''}`, 'bad'); }
      }
      sh.worked += dm;
    }
    if (st.t >= S.z && !sh.closed) {
      sh.closed = true;
      const h = sh.worked / 60, full = (S.z - S.a) / 60;
      if (h < full * .3) { M.absent++; say(st, `Oggi al lavoro non ti sei fatto vedere. ${M.absent >= 2 ? '' : 'Il padrone se l\'è segnato.'}`, 'bad'); }
      else { const pay = Math.round(h * J.pay * (sh.came > S.a + 10 ? .85 : 1)); M.owed += pay; M.stats.lavorato += h; if (M.late > 0 && sh.came <= S.a + 10 && rnd() < .3) M.late--; }
      if (M.absent >= 2 || M.late >= 4) fire(st);
    }
  }
  function fire(st) {
    const M = st.me, J = M.job; if (!J) return;
    say(st, `${J.name}: «Non ti voglio più vedere.» Hai perso il posto da ${J.title}.${M.owed ? ` Ti devono ancora ${Math.round(M.owed)}.000 lire: le ritiri venerdì.` : ''}`, 'bad');
    M.job = null; M.late = 0; M.absent = 0;
  }

  // ---------------- AMICI ----------------
  const friends = st => st.me.friends.map(id => G.byId(st, id)).filter(n => n && !n.dead);
  function friendsTick(st) {
    const M = st.me, P = p(st);
    friends(st).forEach(n => {
      if (n.inside || n.jailedUntil > st.t || P.vehicle) return;
      const d = dist(n.x, n.y, P.x, P.y);
      if (d < 7 && st.clock > (M.sayCd[n.id] || 0)) {
        M.sayCd[n.id] = st.clock + 90;
        const N = M.need;
        const line = M.drunk > .5 ? `${NAME()}, sei cotto! Vai a casa, va'.` : N.igiene > .85 ? `Oh ${NAME()}… ma lavarsi, ogni tanto?` : N.sonno > .85 ? 'Hai una faccia… Dormito male?' : !M.job && rnd() < .4 ? 'Trovato qualcosa da fare? Al bar cercano sempre qualcuno.' : pick([`Ciao ${NAME()}!`, 'Ehi, come va?', 'Tutto a posto?', `${NAME()}! Ci vediamo stasera?`]);
        G.say(st, n, line, 3);
        M.need.compagnia = clamp(M.need.compagnia - .08, 0, 1);
      }
    });
  }
  function friendsHour(st, hr) {
    const M = st.me, fr = friends(st).filter(n => !(n.jailedUntil > st.t));
    // un invito al bar per la sera
    if (hr === 17 && fr.length && rnd() < .45 && !M.inviteFor) {
      const n = pick(fr), bar = pick(BARS.filter(id => PLACES[id])), at = Math.floor(st.t / 1440) * 1440 + (20 + Math.floor(rnd() * 2)) * 60;
      M.inviteFor = { who: n.id, bar, at, done: false };
      say(st, `${n.first}: «Stasera alle ${G.clockStr(at)} ${al(bar)}? Offro io il primo.»`, 'rumor');
    }
    const iv = M.inviteFor;
    if (iv && !iv.done && st.t > iv.at + 120) {
      const n = G.byId(st, iv.who); iv.done = true;
      if (n && n.meFriend) { n.meFriend.bond = clamp(n.meFriend.bond - .1, 0, 1); I.note(st, n, `${NAME()} non si è fatto vedere ${al(iv.bar)}`, 'bad', { w: .3, tag: 'bidone' }); }
      M.inviteFor = null;
    }
    // ti avvisano se ti cercano
    if (G.wantedLevel(st) >= 1 && st.t - M.warned > 360 && fr.length) {
      M.warned = st.t; const n = pick(fr);
      say(st, `${n.first}: «Sono passati i Grigi sotto casa tua, chiedevano di te. Stai attento.»`, 'bad');
    }
  }
  function inviteCheck(st) {
    const M = st.me, iv = M.inviteFor; if (!iv || iv.done) return;
    if (st.t >= iv.at - 15 && st.t <= iv.at + 120 && atPlace(st, iv.bar)) {
      const n = G.byId(st, iv.who); iv.done = true; M.inviteFor = null;
      M.need.compagnia = 0; M.need.svago = clamp(M.need.svago - .3, 0, 1); M.drunk = clamp(M.drunk + .2, 0, 1); M.stats.bevuto++;
      if (n) { n.meFriend.bond = clamp(n.meFriend.bond + .1, 0, 1); if (n.ris) n.ris.bond = clamp(n.ris.bond + .03, -1, 1); I.note(st, n, `bevuto qualcosa con ${NAME()} ${al(iv.bar)}`, 'good', { w: .3, who: 'player', tag: 'amico' }); G.say(st, n, 'Alla salute!', 3); }
      say(st, `Una serata con ${n ? n.first : 'gli amici'} ${al(iv.bar)}. Ci voleva.`, 'good');
      rumor(st);
    }
  }
  // al bar si sente quello che gira
  function rumor(st) {
    const P = p(st), near = st.npcs.filter(n => !n.dead && n.mem && n.mem.length && dist(n.x, n.y, P.x, P.y) < 18);
    const n = near.sort(() => rnd() - .5)[0]; if (!n) return null;
    const m = n.mem.filter(m => m.actor !== 'ignoto').sort((a, b) => G.weight(st, b) - G.weight(st, a))[0];
    if (m) { const t = G.rumorText(st, m, n.id); say(st, `Al bancone ${n.first} racconta: ${t.replace(/^Hai sentito\? /, '')}`, 'rumor'); return t; }
    const e = n.pop && n.pop.diary && n.pop.diary.filter(e => e.w >= .4).slice(-1)[0];
    if (e) { say(st, `Al bancone ${n.first} si lamenta: ${e.text}.`, 'rumor'); return e.text; }
    return null;
  }

  // ---------------- IL TEMPO CHE CORRE ----------------
  // dormire, lavorare, mangiare: il gioco va avanti veloce finché non si arriva o qualcosa interrompe
  function startWarp(st, kind, until, label, nap) { st.me.warp = { kind, until, label, nap: !!nap, hp: p(st).hp, wanted: G.wantedLevel(st), t0: st.t }; }
  function warpCheck(st) {
    const M = st.me, Wp = M.warp; if (!Wp) return false;
    const P = p(st);
    let stop = null;
    if (st.t >= Wp.until) stop = 'fine';
    else if (P.hp < Wp.hp - 5) stop = 'Qualcuno ti ha fatto male.';
    else if (G.wantedLevel(st) > Wp.wanted) stop = 'Fuori c\'è movimento: i Grigi.';
    else if (Wp.kind === 'sonno' && Wp.nap && M.need.sonno <= .02) stop = 'fine';   // il pisolino finisce quando sei riposato; la notte, alla sveglia
    else if (Wp.kind === 'lavoro' && !atWork(st)) stop = 'fine';
    if (!stop) return true;
    M.warp = null;
    if (Wp.kind === 'sonno') { M.stats.dormito += (st.t - Wp.t0) / 60; say(st, stop === 'fine' ? `Ti svegli alle ${G.clockStr(st.t)}.${M.hangover > .3 ? ' La testa ti scoppia.' : ''}` : `Ti svegli di colpo: ${stop}`, stop === 'fine' ? 'info' : 'bad'); }
    else if (Wp.kind === 'lavoro') say(st, stop === 'fine' ? `Turno finito alle ${G.clockStr(st.t)}. La paga si ritira venerdì.` : `Smetti di lavorare: ${stop}`, 'info');
    else if (stop !== 'fine') say(st, stop, 'bad');
    return false;
  }

  // ---------------- AZIONI: QUI, ADESSO ----------------
  function myActions(st) {
    const M = st.me; if (!M) return [];
    const P = p(st), out = [], N = M.need, add = (id, label, run, off) => out.push({ id, label, run, off: run ? '' : off || '' });   // il motivo si mostra solo se l'azione è spenta
    // officina: il mezzo (quello su cui sei, o il tuo qui accanto) si potenzia a pagamento
    const UPG = [['motore', 'Motore', [40, 90, 160], 'più spinta e velocità di punta'], ['assetto', 'Assetto e gomme', [30, 70, 130], 'più tenuta e sterzo più pronto'], ['nitro', 'Nitro', [80, 170], 'Shift spinge di più'], ['corazza', 'Corazza saldata', [50, 110, 200], 'regge meglio urti e colpi']];
    if (!M.warp && atPlace(st, 'officina', P.vehicle ? 18 : 7)) {
      const v = P.vehicle ? st.vehicles.find(q => q.id === P.vehicle) : st.vehicles.find(q => q.mine && !q.wreck && !q.hidden && dist(q.x, q.y, P.x, P.y) < 9);
      if (v && v.kind !== 'vespa') {
        v.up = v.up || {};
        const payUp = c => { if (P.money < c) return false; P.money -= c; M.stats.speso += c; return true; };
        UPG.forEach(([k, label, costs, desc]) => {
          const n = k === 'corazza' ? (v.armor || 0) : (v.up[k] | 0);
          if (n >= costs.length) { out.push({ id: 'up_' + k, label: `${label}: al massimo`, run: null, off: '' }); return; }
          const c = costs[n];
          add('up_' + k, `${label} livello ${n + 1}: ${desc} (${c}.000)`, P.money >= c ? () => { payUp(c); if (k === 'corazza') v.armor = n + 1; else v.up[k] = n + 1; v._tk = null; return `Beppe e i suoi: «${label}, livello ${n + 1}.» Si sente subito.`; } : null, 'non hai soldi');
        });
      }
    }
    if (P.vehicle || M.warp) return M.warp ? [{ id: 'sveglia', label: M.warp.kind === 'sonno' ? 'Alzati' : 'Smetti', run: () => { M.warp.until = st.t; return ''; }, off: M.warp.label }] : out;
    const pay = (q, what) => { if (P.money < q) return false; P.money -= q; M.stats.speso += q; return true; };
    // a casa
    if (atHome(st)) {
      const night = G.hour(st) >= 21 || G.hour(st) < 6;
      add('dormi', night ? 'Dormi fino a domattina' : 'Fai un pisolino', N.sonno > .25 || night ? () => {
        if (!P.indoor) G.enterBuilding(st, M.home.bi);
        const h = G.hour(st), wake = Math.floor(st.t / 1440) * 1440 + (h >= 7 ? 1440 : 0) + (M.job && M.job.start < 9 ? Math.max(4, M.job.start - 1) : 7) * 60;
        if (night) startWarp(st, 'sonno', Math.min(wake, st.t + 11 * 60), 'dormi'); else startWarp(st, 'sonno', st.t + 3 * 60, 'fai un pisolino', true);
        return night ? 'Ti butti sul letto.' : 'Ti stendi un attimo.'; } : null, 'non hai sonno');
      add('mangia_casa', `Mangia qualcosa a casa (dispensa: ${M.pantry})`, M.pantry > 0 ? () => { M.pantry--; N.fame = clamp(N.fame - .6, 0, 1); M.stats.mangiato++; startWarp(st, 'pasto', st.t + 25, 'mangi'); return 'Pane, un po\' di formaggio, il caffè della moka.'; } : null, 'la dispensa è vuota: fai la spesa');
      add('lavati', 'Lavati', () => { N.igiene = 0; startWarp(st, 'bagno', st.t + 20, 'ti lavi'); return 'Acqua tiepida, più o meno.'; });
      add('tv', 'Guarda la TV del Garante', () => { N.svago = clamp(N.svago - .2, 0, 1); startWarp(st, 'tv', st.t + 45, 'guardi la TV'); return pick(['«L\'ordine è una carezza.» Il Garante sorride.', 'Varietà del sabato, applausi registrati.', 'Il telegiornale: il raccolto è record, il carbone abbonda.']); });
      const hot = Object.entries(P.inv || {}).filter(([k, v]) => v > 0 && ['refurtiva', 'roba', 'pistola', 'mitra', 'lupara', 'coltello'].includes(k));
      if (hot.length) add('nascondi', 'Nascondi la roba che scotta sotto le assi', () => { hot.forEach(([k, v]) => { M.stash[k] = (M.stash[k] || 0) + v; delete P.inv[k]; if (P.arms && P.arms[k]) { M.stash['_arm_' + k] = P.arms[k]; delete P.arms[k]; if (P.cur === k) P.cur = 'pugni'; } }); return 'Sotto le assi del pavimento. Nessuno ci guarda.'; });
      if (Object.keys(M.stash).some(k => !k.startsWith('_') && M.stash[k] > 0)) add('riprendi', 'Riprendi la roba nascosta', () => { P.inv = P.inv || {}; Object.entries(M.stash).forEach(([k, v]) => { if (k.startsWith('_arm_')) { P.arms[k.slice(5)] = v; } else P.inv[k] = (P.inv[k] || 0) + v; }); M.stash = {}; return 'Ripresa.'; });
    }
    // al bar
    const bar = hereBar(st);
    if (bar) {
      const Bn = PLACES[bar].name;
      add('bevi', `Bevi un bicchiere (2.000)`, P.money >= 2 ? () => { pay(2); M.drunk = clamp(M.drunk + .22 * (1 - M.alcol * .6), 0, 1); M.alcol = clamp(M.alcol + .025, 0, 1); /* chi beve spesso lo sente meno */ N.svago = clamp(N.svago - .15, 0, 1); N.compagnia = clamp(N.compagnia - .12, 0, 1); M.stats.bevuto++; const r = rnd() < .6 ? rumor(st) : null; return M.drunk > .7 ? 'Il bancone gira un po\'.' : M.drunk > .4 ? 'Ti senti più sciolto. E più coraggioso.' : r ? '' : 'Il vino della casa. Si beve.'; } : null, 'non hai soldi');
      const meal = MEALS[bar]; if (meal) add('mangia_bar', `Mangia ${meal[0]} (${meal[1]}.000)`, P.money >= meal[1] ? () => { pay(meal[1]); N.fame = clamp(N.fame - meal[2], 0, 1); M.stats.mangiato++; startWarp(st, 'pasto', st.t + 20, 'mangi'); return `${meal[0][0].toUpperCase() + meal[0].slice(1)} ${al(bar)}.`; } : null, 'non hai soldi');
      const here = st.npcs.filter(n => !n.dead && !n.inside && n.pop && dist(n.x, n.y, P.x, P.y) < 8);
      if (here.length) add('offri', `Offri da bere a chi c'è (${Math.min(here.length, 5) * 2}.000)`, P.money >= Math.min(here.length, 5) * 2 ? () => { const ks = here.slice(0, 5); pay(ks.length * 2); ks.forEach(k => { if (k.ris) k.ris.bond = clamp(k.ris.bond + .05, -1, 1); I.note(st, k, `${NAME()} ha offerto da bere ${al(bar)}`, 'good', { w: .25, who: 'player' }); }); N.compagnia = 0; M.drunk = clamp(M.drunk + .15, 0, 1); return `Un giro per ${ks.map(k => k.first).join(', ')}. Ti guardano con simpatia.`; } : null, 'non hai abbastanza soldi');
      if (bar === 'flipper') add('flipper', 'Una partita a flipper (1.000)', P.money >= 1 ? () => { pay(1); N.svago = clamp(N.svago - .35, 0, 1); startWarp(st, 'gioco', st.t + 20, 'giochi a flipper'); return pick(['Tilt.', 'Partita gratis!', 'Record della sala, quasi.']); } : null, 'non hai soldi');
      add('ascolta', 'Ascolta cosa si dice', () => { startWarp(st, 'bar', st.t + 30, 'ascolti'); return rumor(st) ? '' : 'Oggi si parla solo del freddo.'; });
    }
    // tabacchi
    const tab = G.BUILDINGS.findIndex(b => b.use === 'tabacchi' && b.door && atB(st, G.BUILDINGS.indexOf(b), 3.5));
    if (tab >= 0 || atPlace(st, 'sirena')) add('sigarette', 'Compra un pacchetto di sigarette (4.000)', P.money >= 4 ? () => { pay(4); M.cig += 10; return 'Nazionali. Dieci.'; } : null, 'non hai soldi');
    if (M.cig > 0) add('fuma', `Fuma una sigaretta (${M.cig})`, () => { M.cig--; M.calmUntil = st.t + 45; N.svago = clamp(N.svago - .05, 0, 1); M.stats.fumato++; return 'Il fumo nel freddo. Le mani si fermano.'; });
    // la spesa
    const shop = ['wu', 'emporio'].concat(G.BUILDINGS.filter(b => b.use === 'panetteria').map(b => b.id)).find(id => atPlace(st, id));
    if (shop) add('spesa', 'Fai la spesa per la settimana (8.000)', P.money >= 8 ? () => { pay(8); M.pantry += 3; return 'Pane, pasta, scatolame, caffè. La borsa pesa.'; } : null, 'non hai soldi');
    // il lavoro
    const J = M.job;
    if (J && atWork(st)) {
      const S = shiftToday(st);
      if (S && st.t >= S.a - 30 && st.t < S.z) add('lavora', `Lavora fino a fine turno (${G.clockStr(S.z)})`, () => { startWarp(st, 'lavoro', S.z, 'lavori'); return `Al lavoro: ${J.title}.`; });
      else add('lavora', 'Lavora', null, S ? `il turno è dalle ${G.clockStr(S.a)} alle ${G.clockStr(S.z)}` : 'oggi è domenica');
      add('licenziati', 'Licenziati', () => { const was = J.title; M.job = null; return `Non sei più ${was}. ${M.owed ? 'La paga che ti spetta la ritiri venerdì.' : ''}`; });
    } else if (!J) {
      workHere(st).forEach(w => {
        // chi ha un posto libero assume; altrove, ogni settimana qualcuno cerca comunque una persona in più
        const t = w.title, week = Math.floor(st.t / (7 * 1440)), free = freeSlots(st, w) > 0 || W.hash2(w.bi >= 0 ? w.bi : w.id.length * 31, week, t.length) < .45;
        add('lavoro_' + t, `Chiedi lavoro: ${t} (${w.pay}.000 l'ora, dalle ${w.start} alle ${w.end % 24})`, free ? () => {
          if (N.igiene > .8) return '«Torna quando ti sei lavato.»';
          if (M.drunk > .5) return '«Ripassa quando sei sobrio.»';
          if (G.wantedLevel(st) > 0) return '«Con i Grigi che ti cercano? No, grazie.»';
          M.job = { title: t, pay: w.pay, start: w.start, end: w.end, bi: w.bi, place: w.id, name: w.name || w.label };
          M.late = 0; M.absent = 0; M.shift = { day: Math.floor(st.t / 1440), came: null, worked: 0, closed: G.hour(st) >= w.start };   // il turno di oggi, se è già cominciato, non conta
          return `Assunto: ${t}. Si attacca alle ${w.start}, puntuale. La paga il venerdì.`;
        } : null, 'non cercano nessuno');
      });
    }
    // gli amici: un prestito, da restituire
    friends(st).filter(n => !n.inside && dist(n.x, n.y, P.x, P.y) < 3.5).forEach(n => {
      const f = n.meFriend;
      if (!f.lent) add('prestito_' + n.id, `Chiedi un prestito a ${n.first}`, () => {
        if (st.t - (f.askedAt || -1e9) < 3 * 1440) return `${n.first}: «Te l'ho detto, adesso non posso.»`;
        f.askedAt = st.t; const can = n.pop ? Math.floor(n.pop.money * .3) : 10;
        if (can < 5 || f.bond < .45) return `${n.first}: «Sono al verde anch'io, ${NAME()}.»`;
        const q = Math.min(30, can); n.pop.money -= q; P.money += q; f.lent = q; setCard(st, n);
        I.note(st, n, `prestato ${q}.000 lire a ${NAME()}`, 'info', { w: .4, who: 'player', tag: 'amico' });
        return `${n.first} ti passa ${q}.000 lire: «Me li ridai quando puoi. Ma ridammeli.»`;
      });
      else add('restituisci_' + n.id, `Restituisci a ${n.first} (${f.lent}.000)`, P.money >= f.lent ? () => { P.money -= f.lent; n.pop.money += f.lent; f.bond = clamp(f.bond + .1, 0, 1); f.lent = 0; setCard(st, n); return `${n.first}: «Sapevo che eri di parola.»`; } : null, 'non hai abbastanza soldi');
    });
    return out;
  }

  // ---------------- ORE: affitto, paga, debiti con gli amici ----------------
  function hourTick(st, hr) {
    const M = st.me, P = p(st), wd = PO.weekday(st.t);
    if (wd === 0 && hr === 9) {
      const q = CFG.rent + M.rentDebt;
      if (P.money >= q) { P.money -= q; M.rentDebt = 0; M.stats.speso += q; say(st, `Lunedì: l'affitto (${q}.000 lire) è pagato.`, 'money'); }
      else { M.rentDebt = q - Math.max(0, P.money); M.stats.speso += Math.max(0, P.money); P.money = Math.min(P.money, 0); say(st, `Lunedì: per l'affitto mancano ${Math.round(M.rentDebt)}.000 lire. ${M.rentDebt > CFG.rent ? 'Il padrone di casa: «Ancora una settimana e ti butto fuori.»' : 'Il padrone di casa aspetta, per ora.'}`, 'bad'); }
    }
    if (wd === 4 && hr === 18 && M.owed > 0) { const q = Math.round(M.owed); P.money += q; M.stats.guadagnato += q; M.owed = 0; say(st, `Venerdì: ritiri la paga, ${q}.000 lire.`, 'money'); }
    // un prestito non restituito da troppo pesa sull'amicizia
    friends(st).forEach(n => { const f = n.meFriend; if (f.lent && hr === 20 && rnd() < .15) { f.bond = clamp(f.bond - .05, 0, 1); if (n.pop) I.note(st, n, `${NAME()} non mi ha ancora ridato i soldi`, 'bad', { w: .3, who: 'player', tag: 'amico' }); } });
    if (hr === 7 && M.hangover > .4) say(st, 'Hai la bocca impastata e la testa pesante: il vino di ieri.', 'bad');
    friendsHour(st, hr);
  }

  // ---------------- AGGANCI ----------------
  function hookStep(st, dt) {
    const M = st.me; if (!M) return;
    const before = st.t;
    needsTick(st); bodyTick(st); friendsTick(st); inviteCheck(st);
    jobTick(st, Math.max(0, st.t - (M.jobT || st.t))); M.jobT = st.t;
    const hm = Math.floor(st.t / 60); while (M.hourMark < hm) { M.hourMark++; hourTick(st, M.hourMark % 24); }
  }
  function install() {
    const H = G.HOOKS; if (H.__protagonista) return; H.__protagonista = true;
    const c0 = H.create, s0 = H.step;
    H.create = st => { if (c0) c0(st); create(st); };
    H.step = (st, dt) => { if (s0) s0(st, dt); hookStep(st, dt); };
    // il tempo che corre e il passo che rallenta
    const step0 = G.step;
    G.step = (st, dt, inp) => {
      const M = st.me;
      if (M && M.warp) { const still = { mx: 0, my: 0, aim: inp && inp.aim }; for (let k = 0; k < CFG.warp && warpCheck(st); k++) step0(st, dt, still); return; }
      const P = st.player, x0 = P.x, y0 = P.y, ind = P.indoor;
      step0(st, dt, inp);
      if (M && !P.vehicle && P.indoor === ind) { const f = slowFactor(st), dx = P.x - x0, dy = P.y - y0; if (f < 1 && Math.hypot(dx, dy) < 1.5) { P.x = x0 + dx * f; P.y = y0 + dy * f; } }
    };
    // le azioni del protagonista nel menu QUI, ADESSO
    const acts0 = AZ.playerActions;
    AZ.playerActions = st => (st.me && st.me.warp ? [] : (acts0(st) || [])).concat(myActions(st));
    // come ti vedono quando parli: il vino scioglie la lingua, la sporcizia e la stanchezza no
    if (RS && RS.EXT) RS.EXT.willMod = (st, n) => { const M = st.me; if (!M) return 0; return M.drunk * .12 - M.alcol * .12 - Math.max(0, M.need.igiene - .7) * .3 - Math.max(0, M.need.sonno - .8) * .2 + (n.meFriend ? .15 * n.meFriend.bond : 0); };
  }
  install();

  function report(st) {
    const M = st.me; if (!M) return null;
    return { casa: M.home.label, amici: friends(st).map(n => `${n.first} (${Math.round(n.meFriend.bond * 100)}%)`), lavoro: M.job ? `${M.job.title} da ${M.job.name}, ${M.job.start}-${M.job.end}` : null, ritardi: M.late, assenze: M.absent, daRitirare: Math.round(M.owed),
      bisogni: Object.fromEntries(Object.entries(M.need).map(([k, v]) => [k, Math.round(v * 100) / 100])), brillo: Math.round(M.drunk * 100) / 100, abitudineAlVino: Math.round(M.alcol * 100) / 100, postumi: Math.round(M.hangover * 100) / 100, sigarette: M.cig, dispensa: M.pantry, affittoArretrato: M.rentDebt, soldi: Math.round(st.player.money), stats: M.stats };
  }
  return { CFG, report, myActions, friends, shiftToday, atHome, slowFactor };
})();
if (typeof module !== 'undefined') module.exports = Protagonista;
