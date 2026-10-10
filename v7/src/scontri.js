/* Porto Vecchio — Gli scontri: la scala della violenza di strada (solo logica, nessuna grafica: scontri_arte.js disegna).
   Regola di ferro: «finché tiri una bottiglia rischi una carica di manganelli; se alzi una barricata devi essere pronto a
   sparare, perché loro verranno con i caricatori pieni».
   Livello 1 — ATTRITO (sopra le proteste di ordine.js): i più decisi del corteo tirano sanpietrini, bottiglie ghiacciate e
     qualche molotov; la celere dei Grigi risponde con gli scudi di alluminio bugnato (fermano i sassi), i candelotti
     lacrimogeni al fosforo (una nube che toglie il respiro e svuota la piazza) e l'idrante del Blindato (liquido antighiaccio:
     ti butta a terra e i vestiti ti gelano addosso). Più si tira, prima caricano (salta il terzo avviso).
     Le conseguenze sono da piazza: manganellate, fermo, notte in camera di sicurezza, multa. Finché il giocatore resta
     sulle bottiglie e i pugni, i Grigi non sparano (HOOKS.wantedCap tiene l'allerta al livello dell'arresto); con un'arma da
     fuoco in mano la regola salta.
   Livello 3 — LA BARRICATA: dove c'è gente in strada si può chiudere il viale con cassonetti, carcasse e pancali (azione
     «Alza una barricata», o da sola quando la Risacca è forte e la piazza bolle). La celere si ritira, i più decisi tirano
     fuori le pistole e restano dietro; dopo poco arriva il reparto d'assalto dell'esercito, col Blindato che sfonda: nessun
     avviso, si spara per uccidere. La barricata cade sempre, prima o poi: la differenza la fa quanto costa a loro.
   Livello 2 — IL BANDITISMO: il portavalori del Banco (soldi.js) viaggia con due guardie giurate private. Un mezzo o una
     barricata di traverso lo fermano e le guardie scendono in allerta; l'assalto è uno scontro a fuoco vero (escono sparando,
     si arrendono solo se sono messe male). Le armi per il colpo le dà la Famiglia, che vuole il 40%. Col bottino in tasca si
     sceglie: la quota alla Famiglia, la cassa comune della Risacca (le serre clandestine), o tenerlo per le cambiali.
     Chi è armato dalla Famiglia e non paga entro sei ore se la ritrova contro.
   Si aggancia a Game.HOOKS concatenando (dopo ordine.js). Stato in st.sc. Prova: node test_scontri.js */
var Scontri = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const OR = () => (typeof Ordine !== 'undefined' ? Ordine : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const SD = () => (typeof Soldi !== 'undefined' ? Soldi : null);
  const RS = () => (typeof Risacca !== 'undefined' ? Risacca : null);
  const PLACES = G.PLACES, TS = G.TS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };

  const CFG = {
    radicali: .3,            // quota del corteo che tira roba (tra i più decisi)
    lancio: [3.5, 8],        // secondi tra due lanci di un radicale
    molotov: .08,            // probabilità che il lancio sia una molotov (con la piazza calda)
    gasDopo: 1.6,            // calore della piazza che fa partire i lacrimogeni
    caricaDopo: 6,           // calore che fa saltare l'ultimo avviso
    idranteDopo: 3.5,        // calore che fa aprire l'idrante
    gasR: 5.5, gasDur: 26,   // la nube: raggio, durata (secondi)
    gasOgni: [9, 14],
    idranteOgni: [14, 20], idranteDur: 5, idranteR: 15,
    barrTempo: 22,           // secondi per tirare su la barricata
    assaltoDopo: 38,         // secondi dalla barricata alzata al reparto d'assalto
    squadra: 8,              // il reparto d'assalto
    difensori: 5,
    calma: 25,               // secondi senza bersagli: il reparto rientra
    quotaFam: .4,            // la parte della Famiglia sul colpo, se le armi sono sue
    pagaEntro: 360,          // minuti di gioco per portarle la parte
  };

  // ================= STATO =================
  const S = st => st.sc;
  function create(st) {
    st.sc = { gas: [], proj: [], jets: [], barr: [], squad: [], lastEv: 0, wet: 0, gasP: 0, cap: null, tips: {}, nextId: 1, rev: 0,
      guards: [], colpo: null, bottino: null,
      stats: { lanci: 0, molotov: 0, parati: 0, gas: 0, idranti: 0, barricate: 0, assalti: 0, morti: 0, soldatiMorti: 0, blocchiFurgone: 0, assaltiFurgone: 0, guardieMorte: 0 } };
    // il reparto d'assalto: in caserma, non si vede finché non serve
    const r = G.MAP && G.MAP.world ? G.MAP.world.rng(4419) : Math.random;
    const C = ['Sanna', 'Murgia', 'Deiana', 'Melis', 'Porcu', 'Fadda', 'Atzori', 'Floris', 'Lai', 'Scano', 'Cossu', 'Spano'];
    for (let i = 0; i < CFG.squadra; i++) st.sc.squad.push(recruit(st, i, C[Math.floor(r() * C.length)], r));
    // le guardie giurate del Banco: viaggiano sul portavalori
    const home = PLACES.banca ? 'banca' : 'commissariato';
    [['Efisio', 'Piras', 'pistola'], ['Walter', 'Mereu', 'lupara']].forEach(([f, c, w], i) => {
      const n = G.makeNpc(st, { id: 'gb_' + i, name: `Guardia giurata ${f} ${c}`, first: f, role: 'Guardia giurata del Banco di Porto Vecchio', home, hp: 110, weapon: w,
        tr: { cor: .55 + r() * .3, loq: .3, avid: .5, legge: .8 }, sched: [[0, home]], faction: 'banco',
        look: { skin: pick(['#e3c1a0', '#dcae88', '#c99a76']), top: '#2c3a52', bottom: '#22283a', uniform: '#2c3a52', hair: '#2a1d14', hat: 'police', build: 1.05, extra: 'belt' } });
      n.first = f; n.inside = true; n.action = { name: 'dentro', scores: [], why: 'Sul portavalori.', since: 0 };
      n.sc = { k: 'guardia', on: false, i }; st.npcs.push(n); st.sc.guards.push(n.id);
    });
  }
  function recruit(st, i, cogn, r) {
    r = r || Math.random;
    const home = PLACES.caserma_p ? 'caserma_p' : 'commissariato', tir = i < 2;
    const n = G.makeNpc(st, { id: 'as_' + i + '_' + (st.sc.nextId++), name: `${tir ? 'Tiratore' : 'Assaltatore'} ${cogn}`, role: tir ? 'Tiratore scelto del reparto d\'assalto' : 'Reparto d\'assalto dell\'esercito', home, hp: 230, weapon: 'mitra',   // giubbotto e elmetto d'acciaio
      tr: { cor: .9, loq: .1, avid: .1, legge: 1 }, sched: [[0, home]], faction: 'assalto', military: true,
      look: { skin: pick(['#e3c1a0', '#dcae88', '#c99a76', '#d8a982']), top: '#3a4034', bottom: '#2a2e26', uniform: '#3a4034', hair: '#1a1410', hat: 'elmetto', build: 1.05 + r() * .15, extra: 'belt' } });
    n.inside = true; n.action = { name: 'dentro', scores: [], why: 'In caserma, pronto.', since: 0 };
    n.sc = { k: 'assalto', on: false, tir, i };
    st.npcs.push(n);
    return n.id;
  }

  // ================= LA PIAZZA CHE BOLLE (livello 1) =================
  const proteste = st => (st.ord && st.ord.proteste || []).filter(Pr => Pr.phase !== 'fine');
  const center = Pr => { const L = Pr.leader && Pr._L; return L ? { x: L.x, y: L.y } : { x: Pr.x, y: Pr.y }; };
  function scOf(Pr) { return Pr.sc || (Pr.sc = { heat: 0, gasT: 0, idrT: 0, lanci: 0, rad: null, barr: null, hint: 0 }); }
  function riotCops(st, Pr) { return Pr.police.map(id => G.byId(st, id)).filter(n => n && !n.dead && !(n.jailedUntil > st.t)); }
  function crowd(st, Pr) { return Pr.people.map(id => G.byId(st, id)).filter(n => n && !n.dead && n.ord && n.ord.protester); }
  function heat(st, Pr, k, why) {
    const s = scOf(Pr); s.heat += k;
    if (s.heat >= CFG.caricaDopo && Pr.phase === 'cordone' && Pr.warn < 2) { Pr.warn = 2; Pr.warnAt = st.t; }   // basta avvisi: alla prossima si carica
    if (why && dist(st.player.x, st.player.y, Pr.x, Pr.y) < 60 && st.clock > (s.hint || 0)) { s.hint = st.clock + 20; G.feed(st, why, 'bad'); }
  }
  function lanciatori(st, Pr) {
    const s = scOf(Pr);
    if (!s.rad) {   // i più decisi e i più giovani: una parte del corteo
      s.rad = crowd(st, Pr).filter(n => { const P = n.ord.protester, age = n.pop ? n.pop.age : 30; return P.resolve > .62 && (age < 32 || (n.ris && n.ris.ideo > .6)); })
        .slice(0, Math.max(1, Math.round(Pr.people.length * CFG.radicali))).map(n => n.id);
      s.radT = {};
    }
    return s.rad.map(id => G.byId(st, id)).filter(n => n && !n.dead && !(n.stun > 0) && n.ord && n.ord.protester && n.ord.protester.pr === Pr.id);
  }
  function piazza(st, Pr, dt) {
    const s = scOf(Pr); Pr._L = G.byId(st, Pr.leader);
    const cops = riotCops(st, Pr), hot = Pr.phase === 'carica' || (Pr.phase === 'cordone' && Pr.warn >= 1);
    // i lanci: sanpietrini, bottiglie, ogni tanto una molotov, contro il cordone
    if (hot && cops.length && !s.barr) lanciatori(st, Pr).forEach(n => {
      const due = s.radT[n.id] || (s.radT[n.id] = st.clock + 1 + rnd() * 3); if (st.clock < due) return;
      s.radT[n.id] = st.clock + CFG.lancio[0] + rnd() * (CFG.lancio[1] - CFG.lancio[0]);
      let tgt = null, bd = 17; for (const c of cops) { const d = dist(n.x, n.y, c.x, c.y); if (d < bd) { bd = d; tgt = c; } }
      if (!tgt) return;
      const molo = s.heat > 3 && n.ris && n.ris.ideo > .7 && rnd() < CFG.molotov;
      G.npcThrow(st, n, tgt.x + (rnd() - .5) * 1.6, tgt.y + (rnd() - .5) * 1.6, molo ? 'molotov' : 'sasso');
      if (rnd() < .35) G.say(st, n, pick(molo ? ['Prendete questa!', 'Bruciate!'] : ['Servi!', 'Via dalla nostra piazza!', 'Tenete!', 'Venduti!']), 1.6);
      s.lanci++; S(st).stats.lanci++; if (molo) S(st).stats.molotov++;
      heat(st, Pr, molo ? 1.5 : .45, s.lanci === 3 ? `Volano sanpietrini e bottiglie contro il cordone a ${Pr.place}.` : null);
    });
    if (!cops.length || s.barr) return;
    // i lacrimogeni: un candelotto sulla folla
    if (s.heat >= CFG.gasDopo && st.clock > s.gasT && Pr.people.length) {
      s.gasT = st.clock + CFG.gasOgni[0] + rnd() * (CFG.gasOgni[1] - CFG.gasOgni[0]);
      const c = center(Pr), th = cops.filter(k => !(k.ord && k.ord.svc && k.ord.svc.tgt))[0] || cops[0];
      lob(st, th, c.x + (rnd() - .5) * 5, c.y + (rnd() - .5) * 5, 'gas');
      if (rnd() < .5) G.say(st, th, 'Lacrimogeni!', 1.4);
      if (!s.gasN) { s.gasN = 1; G.addLog(st, `${G.clockStr(st.t)} · I Grigi sparano lacrimogeni sulla folla a ${Pr.place}.`, 'bad'); }
    }
    // l'idrante del Blindato: liquido antighiaccio sulla folla
    const v = Pr.blind && st.vehicles.find(q => q.id === Pr.blind && !q.wreck && q.rider !== 'player');
    if (v && s.heat >= CFG.idranteDopo && st.clock > s.idrT) {
      const c = center(Pr); if (dist(v.x, v.y, c.x, c.y) < 30) {
        s.idrT = st.clock + CFG.idranteOgni[0] + rnd() * (CFG.idranteOgni[1] - CFG.idranteOgni[0]);
        S(st).jets.push({ vid: v.id, x: v.x, y: v.y, a: Math.atan2(c.y - v.y, c.x - v.x), until: st.clock + CFG.idranteDur, t0: st.clock });
        S(st).stats.idranti++; st.sfx.push({ k: 'idrante', x: v.x, y: v.y });
        if (!s.idrN) { s.idrN = 1; G.addLog(st, `${G.clockStr(st.t)} · L'idrante del Blindato spara liquido antighiaccio sulla folla a ${Pr.place}.`, 'bad'); }
      }
    }
  }
  // un lancio a parabola (candelotti)
  function lob(st, n, tx, ty, kind) {
    const d = Math.max(1, dist(n.x, n.y, tx, ty)), Tf = clamp(d / 12, .4, 1.4), g = 9.8;
    n.face = Math.atan2(ty - n.y, tx - n.x); n.gesture = .4;
    S(st).proj.push({ x: n.x, y: n.y, z: 1.6, vx: (tx - n.x) / Tf, vy: (ty - n.y) / Tf, vz: (-1.6 + .5 * g * Tf * Tf) / Tf, g, kind, owner: n.id });
    st.sfx.push({ k: 'candelotto', x: n.x, y: n.y });
  }
  function projStep(st, dt) {
    const Sc = S(st);
    Sc.proj = Sc.proj.filter(pr => {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.vz -= pr.g * dt;
      if (pr.z > 0) return true;
      if (pr.kind === 'gas') { Sc.gas.push({ x: pr.x, y: pr.y, r: .8, t0: st.clock, until: st.clock + CFG.gasDur }); Sc.stats.gas++; st.sfx.push({ k: 'gas', x: pr.x, y: pr.y }); }
      return false;
    });
  }
  // gli scudi: un sasso che arriva su un agente col fronte coperto si ferma lì
  function shields(st) {
    const cops = []; proteste(st).forEach(Pr => riotCops(st, Pr).forEach(c => cops.push(c)));
    if (!cops.length) return;
    st.proj.forEach(pr => {
      if (pr.kind !== 'sasso' || pr.z <= 0 || pr.z > 2.4 || pr.blocked) return;
      for (const c of cops) {
        if (c.id === pr.owner || Math.abs(c.x - pr.x) > 1.2 || Math.abs(c.y - pr.y) > 1.2 || dist(c.x, c.y, pr.x, pr.y) > 1.05) continue;
        if (Math.abs(angDiff(Math.atan2(pr.y - c.y, pr.x - c.x), c.face)) > 1.25) continue;   // preso alle spalle: niente scudo
        pr.blocked = true; pr.vx *= -.15; pr.vy *= -.15; pr.vz = Math.min(pr.vz, 0); pr.hit = null;
        st.sfx.push({ k: 'scudo', x: c.x, y: c.y }); S(st).stats.parati++; break;
      }
    });
  }
  // la nube e l'idrante: cosa fanno a chi c'è dentro
  function gasStep(st, dt) {
    const Sc = S(st), p = st.player, OD = OR();
    Sc.gas = Sc.gas.filter(g => st.clock < g.until);
    let inP = 0;
    Sc.gas.forEach(g => {
      const age = st.clock - g.t0; g.r = Math.min(CFG.gasR, .8 + age * 1.6) * (st.clock > g.until - 6 ? .6 + .4 * (g.until - st.clock) / 6 : 1);
      st.npcs.forEach(n => {
        if (n.dead || n.inside || n.sc && n.sc.k === 'assalto' || Math.abs(n.x - g.x) > g.r || Math.abs(n.y - g.y) > g.r) return;
        if (dist(n.x, n.y, g.x, g.y) > g.r) return;
        if (n.ord && n.ord.riot) return;   // la celere ha le maschere
        if (n.ord && n.ord.protester) { if (rnd() < dt * .9) { const Pr = st.ord.proteste.find(q => q.id === n.ord.protester.pr); if (Pr && OD && OD.leaveProtest) { OD.leaveProtest(st, n, Pr, 'gas'); n.fleeFrom = { x: g.x, y: g.y }; } } }
        else if (!n.cop) { n.panic = Math.max(n.panic || 0, 3); n.fleeFrom = { x: g.x, y: g.y }; }
        if (rnd() < dt * .3) { G.say(st, n, pick(['Non respiro!', '*tossisce*', 'Gli occhi!']), 1.2); n.stun = Math.max(n.stun || 0, .5); }
      });
      if (!p.vehicle && !p.indoor && dist(p.x, p.y, g.x, g.y) < g.r) inP = Math.max(inP, 1 - dist(p.x, p.y, g.x, g.y) / g.r * .5);
    });
    Sc.gasP = clamp(Sc.gasP + (inP > Sc.gasP ? (inP - Sc.gasP) * Math.min(1, dt * 3) : -dt * .12), 0, 1);
    if (inP > 0 && st.clock - (Sc.gasHurtT || -9) > .9) {
      Sc.gasHurtT = st.clock; G.damagePlayer(st, 1.6, 0, 'gas'); p.stun = Math.max(p.stun || 0, .15);
      if (!Sc.tips.gas) { Sc.tips.gas = 1; G.feed(st, 'Il fumo dei lacrimogeni ti brucia gli occhi e la gola: esci dalla nube.', 'bad'); }
    }
    // l'idrante
    Sc.jets = Sc.jets.filter(J => {
      if (st.clock > J.until) return false;
      const v = st.vehicles.find(q => q.id === J.vid); if (!v || v.wreck) return false;
      v.driveTo = null; v.speed = 0; v.vx = v.vy = 0; J.x = v.x; J.y = v.y;
      const hitBy = (x, y) => { const d = dist(J.x, J.y, x, y); if (d > CFG.idranteR || d < 1) return 0; return Math.abs(angDiff(Math.atan2(y - J.y, x - J.x), J.a)) < .2 + 1.2 / d ? 1 - d / CFG.idranteR * .5 : 0; };
      st.npcs.forEach(n => {
        if (n.dead || n.inside || n.cop || n.sc && n.sc.k === 'assalto') return; const k = hitBy(n.x, n.y); if (!k) return;
        const nx = n.x + Math.cos(J.a) * 3 * k * dt, ny = n.y + Math.sin(J.a) * 3 * k * dt; if (G.walkM(nx, ny)) { n.x = nx; n.y = ny; }
        n.stun = Math.max(n.stun || 0, .8); n.wet = 1;
        if (n.ord && n.ord.protester && OD && OD.leaveProtest) { const Pr = st.ord.proteste.find(q => q.id === n.ord.protester.pr); if (Pr) OD.leaveProtest(st, n, Pr, 'idrante'); }
      });
      if (!p.vehicle && !p.indoor) { const k = hitBy(p.x, p.y); if (k) {
        const nx = p.x + Math.cos(J.a) * 3.4 * k * dt, ny = p.y + Math.sin(J.a) * 3.4 * k * dt; if (G.walkM(nx, ny)) { p.x = nx; p.y = ny; }
        p.stun = Math.max(p.stun || 0, .35); Sc.wet = 1;
        if (!Sc.tips.wet) { Sc.tips.wet = 1; G.feed(st, 'L\'idrante ti butta giù: liquido antighiaccio gelato. Trova un riparo al caldo prima che i vestiti ti gelino addosso.', 'bad'); }
      } }
      return true;
    });
    // bagnati col gelo: finché non ti asciughi al chiuso o vicino a un fuoco, il freddo morde
    if (Sc.wet > 0) {
      const warm = p.indoor || (st.fires || []).some(f => dist(f.x, f.y, p.x, p.y) < 4);
      Sc.wet = clamp(Sc.wet - dt * (warm ? .05 : .0035), 0, 1);
      if (!warm && Sc.wet > .2 && st.clock - (Sc.coldT || -9) > 6) { Sc.coldT = st.clock; G.damagePlayer(st, 2, 0, 'gelo'); if (rnd() < .3) p.stun = Math.max(p.stun || 0, .25); }
    }
  }

  // ================= LA REGOLA: CON LE BOTTIGLIE NON SI SPARA =================
  // gli eventi del giocatore vicino a una piazza calda: la scaldano; un'arma da fuoco cambia tutto
  const RIOT_EV = { molotov: 2, aggressione: 1.2, vandalismo: .6, ferimento: 1.5 };
  function playerEvents(st) {
    const Sc = S(st), live = proteste(st);
    for (let i = st.events.length - 1; i >= 0; i--) {
      const ev = st.events[i]; if (ev.id <= Sc.lastEv || ev.actor !== 'player') continue;
      const Pr = live.find(q => dist(ev.x, ev.y, q.x, q.y) < 40);
      if (Pr) {
        const s = scOf(Pr);
        if (ev.type === 'spari' || ev.type === 'omicidio' || (ev.type === 'ferimento' && st.player.cur !== 'pugni' && st.player.cur !== 'molotov')) { s.armato = true; if (!Sc.tips.armato) { Sc.tips.armato = 1; G.feed(st, 'Hai sparato in piazza: adesso i Grigi rispondono col piombo.', 'bad'); } }
        else if (RIOT_EV[ev.type]) heat(st, Pr, RIOT_EV[ev.type]);
      }
    }
    Sc.lastEv = st.events.length ? Math.max(Sc.lastEv, st.events[0].id) : Sc.lastEv;
    // il tetto: chi sta in una piazza calda senza armi da fuoco rischia la cella, non il piombo
    const p = st.player, Pr = live.find(q => dist(p.x, p.y, q.x, q.y) < 45);
    Sc.cap = Pr && !scOf(Pr).armato && !scOf(Pr).barr && !st.copKilled ? Pr.id : null;
    if (Pr && !Sc.tips.regola && scOf(Pr).heat > 1) { Sc.tips.regola = 1; G.feed(st, 'Finché tiri bottiglie rischi una carica e una notte in cella. Una barricata è un\'altra cosa: lì si spara.', 'info'); }
  }

  // ================= LA BARRICATA (livello 3) =================
  // la direzione della strada qui: dalla corsia più vicina, altrimenti dalle caselle
  function roadDir(x, y) {
    let best = null, bd = 14;
    (G.LANES || []).forEach(L => { for (let i = 1; i < L.pts.length; i++) { const a = L.pts[i - 1], b = L.pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1), d = dist(x, y, a.x + dx * t, a.y + dy * t); if (d < bd) { bd = d; best = Math.atan2(dy, dx); } } });
    if (best !== null) return best;
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS), via = (i, j) => G.tileAt(i, j) === G.T.VIA;
    let h = 0, v = 0; for (let k = -3; k <= 3; k++) { if (via(tx + k, ty)) h++; if (via(tx, ty + k)) v++; }
    return h >= v ? 0 : Math.PI / 2;
  }
  const onRoad = (x, y) => { const t = G.tileAt(Math.floor(x / TS), Math.floor(y / TS)); return t === G.T.VIA || t === G.T.PIAZZA || t === G.T.COB; };
  function raise(st, Pr, x, y, by) {
    const Sc = S(st), s = scOf(Pr); if (s.barr) return null;
    const a = roadDir(x, y) + Math.PI / 2;   // di traverso alla strada
    const b = { id: Sc.nextId++, x, y, a, w: 9, hp: 700, hp0: 700, prog: 0, phase: 'su', t0: st.clock, pr: Pr.id, place: Pr.place, by, def: [], killed: 0, lost: 0, seed: Math.floor(rnd() * 1e6) };
    Sc.barr.push(b); s.barr = b.id; Sc.stats.barricate++; Sc.rev++;
    G.addLog(st, `${G.clockStr(st.t)} · ${by === 'player' ? 'Cominciate' : 'I più decisi cominciano'} a chiudere la strada a ${Pr.place}: cassonetti, carcasse d'auto, pancali.`, 'bad');
    if (dist(st.player.x, st.player.y, x, y) < 150) G.feed(st, by === 'player' ? 'Trascinate cassonetti e carcasse in mezzo alla strada. Da adesso non è più una protesta: verranno con i caricatori pieni.' : `A ${Pr.place} alzano una barricata. Quando arriva l'esercito non si scherza più.`, 'bad');
    if (st.ris) st.ris.repr = clamp(st.ris.repr + 5, 0, 100);
    return b;
  }
  const barrById = (st, id) => S(st).barr.find(b => b.id === id);
  // dietro la barricata: il lato dove sta la gente; davanti: da dove arriva l'esercito
  function sides(st, b) { const nx = Math.cos(b.a + Math.PI / 2), ny = Math.sin(b.a + Math.PI / 2); return { nx, ny, back: b.backS || 1 }; }
  function barrStep(st, dt) {
    const Sc = S(st), OD = OR();
    Sc.barr = Sc.barr.filter(b => {
      const Pr = st.ord && st.ord.proteste.find(q => q.id === b.pr);
      if (b.phase === 'su') {
        const help = Pr ? crowd(st, Pr).filter(n => dist(n.x, n.y, b.x, b.y) < 16).length : 0;
        b.prog += dt / CFG.barrTempo * (.6 + Math.min(1.4, help * .12));
        if (b.prog >= 1) up(st, b, Pr);
        return true;
      }
      // i mezzi non passano
      st.vehicles.forEach(v => {
        if (v.hidden || v.wreck || v.id === b.ram) return; const dx = v.x - b.x, dy = v.y - b.y, along = dx * Math.cos(b.a) + dy * Math.sin(b.a), across = -dx * Math.sin(b.a) + dy * Math.cos(b.a);
        if (Math.abs(along) < b.w / 2 + 1 && Math.abs(across) < 3.2) { if (v.traffic) { v.speed = 0; v.vx = v.vy = 0; } else if (Math.abs(v.speed || 0) > 3 && Math.abs(across) < 2) { G.damageVehicle(st, v, Math.abs(v.speed) * 2, null); b.hp -= Math.abs(v.speed) * 4; v.speed *= -.3; v.vx *= -.3; v.vy *= -.3; } }
      });
      if (b.phase === 'alzata' && st.clock > b.assaltoAt) assault(st, b);
      if (b.phase === 'assalto') assaultTick(st, b, dt);
      if (b.hp <= 0 && b.phase !== 'giu') fall(st, b);
      if (b.phase === 'giu') return st.clock < b.goneAt;
      return true;
    });
  }
  function up(st, b, Pr) {
    const OD = OR(); b.phase = 'alzata'; b.assaltoAt = st.clock + CFG.assaltoDopo; S(st).rev++;
    // la gente sta dal lato del centro del corteo
    const c = Pr ? center(Pr) : { x: b.x, y: b.y }, nx = Math.cos(b.a + Math.PI / 2), ny = Math.sin(b.a + Math.PI / 2);
    b.backS = ((c.x - b.x) * nx + (c.y - b.y) * ny) >= 0 ? 1 : -1;
    if (Pr) {
      // la celere si ritira: adesso tocca all'esercito
      const cops = riotCops(st, Pr); if (cops[0]) G.say(st, cops[0], 'Indietro! Lasciate fare all\'esercito!', 2.5);
      cops.forEach(n => { if (n.ord) { n.ord.svc = null; n.ord.riot = false; } n.hand = null; });
      Pr.police = []; Pr.policeAt = 1e12; if (Pr.phase !== 'corteo') Pr.phase = 'raduno'; Pr.until = st.t + 1e6;
      Pr.x = b.x + nx * b.backS * 6; Pr.y = b.y + ny * b.backS * 6; Pr.corteo = false; Pr.march = null;
      // i più decisi tirano fuori le armi e restano dietro la barricata
      const def = crowd(st, Pr).sort((p, q) => q.ord.protester.resolve - p.ord.protester.resolve).filter(n => n.ord.protester.resolve > .7).slice(0, CFG.difensori);
      def.forEach((n, i) => {
        if (OD && OD.leaveProtest) OD.leaveProtest(st, n, Pr, 'fine'); n.panic = 0; n.fleeFrom = null;
        n.weapon = n.weapon || pick(['pistola', 'pistola', 'lupara', 'pistola']); n.mag = G.WEAPONS[n.weapon].mag; n.reloadT = 0; n.cool = 0;
        n.sc = { k: 'difensore', b: b.id, slot: i - (def.length - 1) / 2 }; b.def.push(n.id);
        if (n.pop) { const PL = PO(); if (PL) PL.note(st, n, `sono rimast${n.pop.sex === 'f' ? 'a' : 'o'} dietro la barricata con la pistola in mano`, 'bad', { w: .9, tag: 'barricata' }); }
      });
    }
    G.addLog(st, `${G.clockStr(st.t)} · La barricata a ${b.place} è su. La celere si ritira.`, 'bad');
    if (dist(st.player.x, st.player.y, b.x, b.y) < 150) G.feed(st, 'La barricata è su. La celere si ritira: adesso arriva l\'esercito, e non fa avvisi.', 'bad');
    st.sfx.push({ k: 'sirena', x: b.x, y: b.y });
  }
  // il reparto d'assalto: dal lato davanti, a 45 m; il Blindato sfonda
  function assault(st, b) {
    const Sc = S(st); b.phase = 'assalto'; b.calmT = st.clock; Sc.stats.assalti++; Sc.rev++;
    const nx = Math.cos(b.a + Math.PI / 2) * -b.backS, ny = Math.sin(b.a + Math.PI / 2) * -b.backS;
    // chi è morto si rimpiazza
    Sc.squad = Sc.squad.map((id, i) => { const n = G.byId(st, id); return n && !n.dead ? id : recruit(st, i, pick(['Sanna', 'Loi', 'Serra', 'Carta', 'Usai', 'Piras', 'Mereu', 'Cocco']), null); });
    Sc.squad.forEach((id, i) => {
      const n = G.byId(st, id); if (!n) return;
      const k = i - (Sc.squad.length - 1) / 2; let x = b.x + nx * (40 + rnd() * 8) + Math.cos(b.a) * k * 2.2, y = b.y + ny * (40 + rnd() * 8) + Math.sin(b.a) * k * 2.2;
      if (!G.walkM(x, y)) { x = b.x + nx * 34; y = b.y + ny * 34; } if (!G.walkM(x, y)) { const s = G.wanderSpot(st, G.nearestPlace(b.x, b.y)); x = s.x; y = s.y; }
      n.x = x; n.y = y; n.inside = false; n.hp = Math.max(n.hp, n.maxHp * .9); n.mag = G.WEAPONS.mitra.mag; n.reloadT = 0; n.cool = rnd(); n.stun = 0; n.panic = 0;
      n.sc.on = true; n.sc.b = b.id; n.sc.slot = k; n.action = { name: 'assalto', scores: [], why: 'Sgombera la barricata.', since: st.clock };
    });
    const bl = st.vehicles.find(v => v.id === 'gr_blind' && !v.wreck && v.rider !== 'player');
    if (bl) {   // il Blindato arriva lungo la strada sbarrata, dritto contro la barricata
      b.ram = bl.id; let k = 36; while (k > 12 && !G.walkM(b.x + nx * k, b.y + ny * k)) k -= 3;
      bl.x = b.x + nx * k; bl.y = b.y + ny * k; bl.vx = bl.vy = 0; bl.speed = 0; bl.ang = Math.atan2(-ny, -nx); bl.driveTo = null; bl.ronda = false; bl.scCtl = b.id; bl.hidden = false; }
    G.addLog(st, `${G.clockStr(st.t)} · Arriva il reparto d'assalto alla barricata di ${b.place}: ${Sc.squad.length} soldati${bl ? ' e il Blindato' : ''}. Nessun avviso.`, 'bad');
    if (dist(st.player.x, st.player.y, b.x, b.y) < 160) G.feed(st, 'Il reparto d\'assalto: elmetti, mitra, il Blindato con le feritoie. Sparano per uccidere.', 'bad');
    st.sfx.push({ k: 'sirena', x: b.x, y: b.y });
    // chi è in piazza senza armi scappa al primo colpo (vedi assaultTick)
  }
  function assaultTick(st, b, dt) {
    const Sc = S(st), OD = OR(), Pr = st.ord && st.ord.proteste.find(q => q.id === b.pr);
    // il Blindato sfonda
    const bl = b.ram && st.vehicles.find(v => v.id === b.ram);
    if (bl && !bl.wreck && bl.rider !== 'player') {
      bl.driveTo = null; bl.vx = bl.vy = 0; bl.ang = Math.atan2(b.y - bl.y, b.x - bl.x);
      const d = dist(bl.x, bl.y, b.x, b.y);
      if (d < 4.5) { bl.speed = 0; b.hp -= 45 * dt; if (rnd() < dt * 1.5) st.sfx.push({ k: 'wallhit', x: b.x, y: b.y }); }
      else { const sp = 3.2, s0 = Math.min(d - 4.4, sp * dt); bl.x += Math.cos(bl.ang) * s0; bl.y += Math.sin(bl.ang) * s0; bl.speed = 0; bl.scMove = sp; }
    }
    // al primo sparo la piazza si svuota: resta solo chi ha un'arma
    if (b.fired && Pr && !b.fled) { b.fled = true; crowd(st, Pr).forEach(n => { if (OD && OD.leaveProtest) OD.leaveProtest(st, n, Pr, 'spari'); n.panic = 8; n.fleeFrom = { x: b.x, y: b.y }; }); }
    const alive = Sc.squad.map(id => G.byId(st, id)).filter(n => n && !n.dead && n.sc && n.sc.on);
    const targets = targetsOf(st, b);
    if (targets.length) b.calmT = st.clock;
    if (!alive.length) { // il reparto è a terra: la barricata tiene, per stavolta
      if (!b.held) { b.held = true; G.addLog(st, `${G.clockStr(st.t)} · Il reparto d'assalto non passa: la barricata di ${b.place} tiene. Arriveranno in di più.`, 'bad'); if (st.ris) { st.ris.morale = clamp(st.ris.morale + 10, 0, 100); st.ris.repr = clamp(st.ris.repr + 15, 0, 100); } b.phase = 'alzata'; b.assaltoAt = st.clock + CFG.assaltoDopo * 1.5; }
      return;
    }
    if (st.clock - b.calmT > CFG.calma) { // non c'è più nessuno: si smonta e si rientra
      b.hp = 0; alive.forEach(n => standDown(st, n));
    }
  }
  function standDown(st, n) { n.sc.on = false; n.inside = true; n.action = { name: 'dentro', scores: [], why: 'Rientrato in caserma.', since: st.clock }; }
  function fall(st, b) {
    const Sc = S(st), Pr = st.ord && st.ord.proteste.find(q => q.id === b.pr), OD = OR();
    b.phase = 'giu'; b.goneAt = st.clock + 240; Sc.rev++;
    b.def.forEach(id => { const n = G.byId(st, id); if (n && n.sc) { n.sc = null; n.panic = 8; n.fleeFrom = { x: b.x, y: b.y }; } });
    if (Pr && Pr.phase !== 'fine') { crowd(st, Pr).forEach(n => { if (OD && OD.leaveProtest) OD.leaveProtest(st, n, Pr, 'spari'); }); Pr.until = st.t; }
    const bl = b.ram && st.vehicles.find(v => v.id === b.ram); if (bl) { bl.driveTo = null; bl.ronda = false; bl.scCtl = null; bl.scMove = 0; }
    Sc.squad.forEach(id => { const n = G.byId(st, id); if (n && n.sc && n.sc.b === b.id && n.sc.on) n.sc.sweepUntil = st.clock + 20; });
    G.addLog(st, `${G.clockStr(st.t)} · La barricata di ${b.place} è caduta${b.lost ? `: ${b.lost} morti dietro` : ''}${b.killed ? `, ${b.killed} soldati a terra` : ''}.`, 'bad');
    if (dist(st.player.x, st.player.y, b.x, b.y) < 160) G.feed(st, 'La barricata è caduta.', 'bad');
    if (st.ris) { st.ris.repr = clamp(st.ris.repr + 10 + b.lost * 2, 0, 100); st.ris.morale = clamp(st.ris.morale + (b.killed >= 2 ? 6 : -4) - b.lost, 0, 100); }
    // chi era in città se lo ricorda
    const PL = PO(); if (PL) st.npcs.forEach(n => { if (n.pop && !n.dead && !n.cop && dist(n.x, n.y, b.x, b.y) < 90 && rnd() < .7) PL.note(st, n, b.lost ? `hanno sparato sulla barricata a ${b.place}: ${b.lost} morti` : `l'esercito ha sfondato la barricata a ${b.place}`, 'bad', { w: .9, tag: 'barricata' }); });
  }
  // chi sparano: chiunque stia dietro la barricata con un'arma, il giocatore vicino, chi tira roba
  function targetsOf(st, b) {
    const out = [], p = st.player, R = 34;
    if (!p.indoor && !(st.over) && dist(p.x, p.y, b.x, b.y) < R) out.push(p);
    b.def.forEach(id => { const n = G.byId(st, id); if (n && !n.dead && n.sc && dist(n.x, n.y, b.x, b.y) < R) out.push(n); });
    if (b.phase === 'giu') return out;
    const Pr = st.ord && st.ord.proteste.find(q => q.id === b.pr); if (Pr && !b.fled) crowd(st, Pr).forEach(n => { if (dist(n.x, n.y, b.x, b.y) < R) out.push(n); });
    return out;
  }

  // ================= IL PENSIERO E IL MOVIMENTO DI CHI È NEGLI SCONTRI =================
  function think(st, n) {
    if (!n.sc) return false;
    if ((n.sc.k === 'assalto' || n.sc.k === 'guardia') && !n.sc.on) { n.inside = true; return true; }
    if (n.dead) return false;
    return true;   // il movimento lo decide move()
  }
  function move(st, n, dt) {
    if (!n.sc) return false;
    if (n.sc.k === 'assalto') return n.sc.on ? soldierMove(st, n, dt) : true;
    if (n.sc.k === 'difensore') return defenderMove(st, n, dt);
    if (n.sc.k === 'guardia') return guardMove(st, n, dt);
    return false;
  }
  // camminare: dritti se la strada è libera, altrimenti col percorso del motore (le case in mezzo si aggirano)
  function clear(x0, y0, x1, y1) { const d = dist(x0, y0, x1, y1), k = Math.ceil(d / .8); for (let m = 1; m <= k; m++) if (!G.walkM(x0 + (x1 - x0) * m / k, y0 + (y1 - y0) * m / k)) return false; return true; }
  function walk(st, n, x, y, dt, sp) {
    const d = dist(n.x, n.y, x, y); if (d < .4) { n.speedNow = 0; return true; }
    if (d < 3 || clear(n.x, n.y, x, y)) {
      const a = Math.atan2(y - n.y, x - n.x), s = Math.min(d, sp * dt), nx = n.x + Math.cos(a) * s, ny = n.y + Math.sin(a) * s;
      if (G.walkM(nx, ny)) { n.x = nx; n.y = ny; n.speedNow = sp; n.face += angDiff(a, n.face) * Math.min(1, dt * 8); n.path = []; return false; }
    }
    // il percorso si ricalcola di rado (una ricerca fallita esplora tutta l'isola): ogni 2,5 s, o se la meta si è spostata
    if (st.clock > (n.__pt || 0) && (!n.path || !n.path.length || !n.__g || dist(n.__g.x, n.__g.y, x, y) > 4)) { G.goTo(n, x, y); n.__g = { x, y }; n.__pt = st.clock + 2.5; }
    if (n.path && n.path.length) { G.stepAlong(n, sp, dt); return false; }
    // niente percorso: si gira attorno all'ostacolo
    const a = Math.atan2(y - n.y, x - n.x), s = Math.min(d, sp * dt);
    for (const o of [0, .7, -.7, 1.4, -1.4]) { const tx = n.x + Math.cos(a + o) * s, ty = n.y + Math.sin(a + o) * s; if (G.walkM(tx, ty)) { n.x = tx; n.y = ty; n.speedNow = sp; n.face += angDiff(a + o, n.face) * Math.min(1, dt * 8); return false; } }
    n.speedNow = 0; return false;
  }
  function fireAt(st, n, t, dt, skill) {
    const W = G.WEAPONS[n.weapon]; if (!W) return;
    if (n.reloadT > 0) { n.reloadT -= dt; if (n.reloadT <= 0) n.mag = W.mag; return; }
    n.cool = (n.cool || 0) - dt; if (n.cool > 0 || n.stun > 0) return;
    if (n.mag <= 0) { n.reloadT = W.reload * 1.3; return; }
    const ang = Math.atan2(t.y - n.y, t.x - n.x), d = dist(n.x, n.y, t.x, t.y); n.face = ang;
    G.shoot(st, n, n.weapon, ang, W.spread + skill + d * .003, n.id); n.mag--;
    if (W.auto) { n.burst = (n.burst > 0 ? n.burst : 3 + Math.floor(rnd() * 3)) - 1; n.cool = n.burst > 0 ? W.rate * 1.4 : .7 + rnd() * .7; } else n.cool = W.rate * 2.4 + rnd() * .4;
    G.panicAround(st, n.x, n.y, 26, 6);
  }
  function soldierMove(st, n, dt) {
    const Sc = S(st), b = barrById(st, n.sc.b);
    if (!b || (b.phase === 'giu' && st.clock > (n.sc.sweepUntil || 0))) { standDown(st, n); return true; }
    n.inside = false;   // il percorso può passare da una porta: in assalto si resta in strada
    if (n.stun > 0) { n.stun -= dt; n.speedNow = 0; return true; }
    const T = targetsOf(st, b); let t = null, bd = 1e9; for (const q of T) { const d = dist(n.x, n.y, q.x, q.y); if (d < bd) { bd = d; t = q; } }
    const nx = Math.cos(b.a + Math.PI / 2) * -b.backS, ny = Math.sin(b.a + Math.PI / 2) * -b.backS;
    // la linea avanza lungo la strada sbarrata: i tiratori restano indietro, gli altri arrivano a tiro corto;
    // quando dietro non c'è più nessuno armato vanno a smontarla a mano
    const armedLeft = b.def.some(id => { const q = G.byId(st, id); return q && !q.dead && q.sc; }) || (dist(st.player.x, st.player.y, b.x, b.y) < 20 && !st.player.indoor);
    const along = b.phase === 'giu' ? 0 : n.sc.tir ? 22 : armedLeft ? 9 : 1.6;
    const x = b.x + nx * along + Math.cos(b.a) * n.sc.slot * (n.sc.tir ? 3 : 1.4), y = b.y + ny * along + Math.sin(b.a) * n.sc.slot * (n.sc.tir ? 3 : 1.4);
    const arrived = dist(n.x, n.y, x, y) < 1;
    if (!arrived) walk(st, n, x, y, dt, t && bd < 20 ? 1.6 : 2.6); else n.speedNow = 0;
    if (t) {
      if (arrived) n.face = Math.atan2(t.y - n.y, t.x - n.x);
      if (bd < (n.sc.tir ? 32 : 22)) { b.fired = true; fireAt(st, n, t, dt, n.sc.tir ? .005 : .025); }
      if (G.say && rnd() < dt * .05) G.say(st, n, pick(['Avanti!', 'Fuoco!', 'Copritemi!', 'Sgomberare!']), 1.2);
    } else if (arrived && b.phase !== 'giu' && !armedLeft && !n.sc.tir) { b.hp -= 10 * dt; n.gesture = .3; if (rnd() < dt * .6) st.sfx.push({ k: 'wallhit', x: b.x, y: b.y }); }
    return true;
  }
  function defenderMove(st, n, dt) {
    const b = barrById(st, n.sc.b);
    if (!b || b.phase === 'giu' || n.dead) { n.sc = null; return false; }
    n.inside = false;
    if (n.hp < n.maxHp * .3 || (n.mag <= 0 && n.reloadT <= 0 && rnd() < dt * .1)) { // ferito o senza colpi: scappa
      const PL = PO(); if (PL && n.pop) PL.note(st, n, 'sono scappat' + (n.pop.sex === 'f' ? 'a' : 'o') + ' dalla barricata quando hanno cominciato a sparare', 'bad', { w: .9, tag: 'barricata' });
      b.def = b.def.filter(id => id !== n.id); n.sc = null; n.panic = 10; n.fleeFrom = { x: b.x, y: b.y }; return false;
    }
    if (n.stun > 0) { n.stun -= dt; n.speedNow = 0; return true; }
    const bx = Math.cos(b.a + Math.PI / 2) * b.backS, by = Math.sin(b.a + Math.PI / 2) * b.backS;
    const x = b.x + bx * 1.6 + Math.cos(b.a) * n.sc.slot * 1.7, y = b.y + by * 1.6 + Math.sin(b.a) * n.sc.slot * 1.7;
    walk(st, n, x, y, dt, 3);
    const sol = S(st).squad.map(id => G.byId(st, id)).filter(q => q && !q.dead && q.sc && q.sc.on);
    let t = null, bd = (G.WEAPONS[n.weapon] || { range: 15 }).range; for (const q of sol) { const d = dist(n.x, n.y, q.x, q.y); if (d < bd) { bd = d; t = q; } }
    if (t) fireAt(st, n, t, dt, .13);   // chi spara per la prima volta, da dietro i cassonetti
    else n.face = Math.atan2(-by, -bx);
    if (rnd() < dt * .04) G.say(st, n, pick(['Non passano!', 'Tenete la linea!', 'Per i nostri morti!', 'Giù la testa!']), 1.4);
    return true;
  }

  // ================= LA BARRICATA DA SOLA: quando la Risacca è forte e la piazza bolle =================
  function npcBarricade(st, Pr) {
    const s = scOf(Pr), R = st.ris;
    if (s.barr || s.noBarr || Pr.kind !== 'organizzata' || !R) return;
    if (s.heat < 6 || R.morale < 60 || R.repr < 55) return;
    s.noBarr = true; if (rnd() > .3) return;
    const c = center(Pr); let x = c.x, y = c.y;
    for (let k = 0; k < 12 && !onRoad(x, y); k++) { x = c.x + (rnd() - .5) * 16; y = c.y + (rnd() - .5) * 16; }
    if (onRoad(x, y)) raise(st, Pr, x, y, 'npc');
  }


  // ================= IL PORTAVALORI (livello 2) =================
  const vanOf = st => { const D = SD(); return D && D.van ? D.van(st) : null; };
  const cargo = st => (st.soldi && st.soldi.van ? st.soldi.van.cargo : 0);
  const gunOut = st => { const p = st.player; return !!(p.cur && p.cur !== 'pugni' && p.cur !== 'molotov' && G.WEAPONS[p.cur] && !p.hand); };
  function guards(st) { return S(st).guards.map(id => G.byId(st, id)).filter(n => n && !n.dead && !(n.jailedUntil > st.t)); }
  // le guardie scendono: allerta (blocco) o fuoco (assalto)
  function guardsOut(st, v, mode) {
    const g = guards(st); if (!g.length) return false;
    g.forEach((n, i) => {
      if (!n.sc.on) { const a = (v.ang || 0) + (i ? -Math.PI / 2 : Math.PI / 2); let x = v.x + Math.cos(a) * 1.8, y = v.y + Math.sin(a) * 1.8; if (!G.walkM(x, y)) { x = v.x - Math.cos(v.ang || 0) * 3; y = v.y - Math.sin(v.ang || 0) * 3; } n.x = x; n.y = y; }
      n.inside = false; n.sc.on = true; n.sc.mode = mode === 'fuoco' || n.sc.mode === 'fuoco' ? 'fuoco' : 'allerta'; n.sc.calmT = st.clock; n.sc.vid = v.id;
      n.mag = n.mag || G.WEAPONS[n.weapon].mag; n.action = { name: 'guardia', scores: [], why: 'Difende il portavalori.', since: st.clock };
    });
    if (g[0]) G.say(st, g[0], mode === 'fuoco' ? pick(['Assalto! Fuoco!', 'Giù! Giù!', 'Rapina!']) : pick(['Blocco! Tutti fuori!', 'Occhi aperti!', 'Che succede là davanti?']), 2);
    return true;
  }
  function vanStep(st, dt) {
    const Sc = S(st), v = vanOf(st), V = st.soldi && st.soldi.van; if (!v || !V) return;
    const G0 = guards(st);
    // in giro col carico: le guardie stanno a bordo (si muovono col furgone)
    G0.forEach(n => { if (!n.sc.on) { n.inside = true; n.x = v.x; n.y = v.y; } });
    if (v.wreck) { G0.forEach(n => { if (!n.sc.on) { n.sc.on = true; n.sc.mode = 'fuoco'; n.inside = false; n.x = v.x + 2; n.y = v.y; n.sc.vid = v.id; } }); return; }
    // il blocco: un mezzo fermo o una barricata davanti al muso ferma il furgone
    if (V.crew && cargo(st) > 0 && !Sc.vanBlock) {
      const hx = Math.cos(v.ang || 0), hy = Math.sin(v.ang || 0);
      const ahead = (x, y, r) => { const dx = x - v.x, dy = y - v.y, along = dx * hx + dy * hy, across = Math.abs(-dx * hy + dy * hx); return along > 1 && along < 11 && across < r; };
      const car = st.vehicles.find(q => q !== v && !q.hidden && !q.traffic && Math.abs(q.speed || 0) < .5 && ahead(q.x, q.y, 2.4));
      const bar = Sc.barr.find(b => b.phase !== 'giu' && b.phase !== 'su' && ahead(b.x, b.y, b.w / 2));
      if (car || bar) { Sc.vanBlock = { until: st.clock + 45, by: car ? car.id : 'barricata' }; Sc.stats.blocchiFurgone++; guardsOut(st, v, 'allerta');
        G.addLog(st, `${G.clockStr(st.t)} · Il portavalori trova la strada chiusa e si ferma.`, 'bad'); if (dist(st.player.x, st.player.y, v.x, v.y) < 60) G.feed(st, 'Il portavalori inchioda: la strada è chiusa. Le guardie scendono con le armi in mano.', 'bad'); }
    }
    if (Sc.vanBlock) { v.speed = 0; v.vx = v.vy = 0; if (st.clock > Sc.vanBlock.until && !guards(st).some(n => n.sc.mode === 'fuoco')) { Sc.vanBlock = null; guards(st).forEach(n => { n.sc.on = false; }); } }
    // chi spara al furgone o alle guardie, o arriva con l'arma in pugno durante un blocco: fuoco
    const p = st.player;
    if (G0.some(n => n.sc.on && n.sc.mode === 'allerta') && gunOut(st) && dist(p.x, p.y, v.x, v.y) < 12) guardsOut(st, v, 'fuoco');
  }
  // l'assalto del giocatore: le guardie non alzano le mani, a meno di essere messe male
  function assaltoFurgone(st) {
    const Sc = S(st), v = vanOf(st); if (!v) return null;
    const g = guards(st);
    if (!g.length || g.every(n => n.sc.surrender)) return null;   // nessuna guardia in piedi: vale la regola di soldi.js
    const p = st.player, heavy = p.cur === 'mitra' || p.cur === 'lupara', crew = st.npcs.filter(n => n.sc && n.sc.k === 'complice' && !n.dead && dist(n.x, n.y, v.x, v.y) < 12).length;
    Sc.stats.assaltiFurgone++;
    if (heavy && (g.length < 2 || crew >= 2) && rnd() < .55) {
      g.forEach(n => { n.sc.surrender = true; n.sc.on = true; n.sc.mode = 'resa'; n.inside = false; n.weapon = null; G.say(st, n, 'Non sparare! Ho famiglia!', 2); });
      return null;
    }
    guardsOut(st, v, 'fuoco'); G.emit(st, 'rapina', { shop: 'il portavalori' });
    return 'Le guardie giurate escono sparando. Prima loro, poi i sacchi.';
  }
  function guardMove(st, n, dt) {
    if (!n.sc.on) { n.inside = true; return true; }
    if (n.stun > 0) { n.stun -= dt; n.speedNow = 0; return true; }
    const v = st.vehicles.find(q => q.id === n.sc.vid), p = st.player;
    if (n.sc.mode === 'resa') { n.speedNow = 0; n.gesture = .3; if (dist(p.x, p.y, n.x, n.y) > 40 && st.clock - n.sc.calmT > 30) { n.sc.on = false; n.sc.surrender = false; n.sc.mode = null; n.weapon = n.i ? 'lupara' : 'pistola'; } return true; }
    if (n.hp < n.maxHp * .35 && n.sc.mode === 'fuoco' && !n.sc.fled) { n.sc.fled = true; n.sc.mode = 'resa'; n.sc.surrender = true; n.weapon = null; G.say(st, n, 'Basta! Mi arrendo!', 2); return true; }
    if (n.sc.mode === 'allerta') { if (v) { n.face = Math.atan2(p.y - n.y, p.x - n.x); n.speedNow = 0; } return true; }
    // fuoco: al riparo dietro il furgone, sparano a chi li assalta
    const d = dist(n.x, n.y, p.x, p.y);
    if (d < 26 && !p.indoor && !st.over) { n.sc.calmT = st.clock; if (d > 12) walk(st, n, p.x, p.y, dt, 2.4); else n.speedNow = 0; fireAt(st, n, p, dt, .08); }
    else if (st.clock - n.sc.calmT > 30) { n.sc.on = false; n.sc.mode = null; }
    return true;
  }
  // il bottino: da dove viene, chi lo vuole
  function lootWatch(st) {
    const Sc = S(st), M = st.soldi; if (!M) return;
    const r = M.stats ? M.stats.rapine || 0 : 0;
    if (Sc.rapine0 === undefined) Sc.rapine0 = r;
    if (r > Sc.rapine0) {
      const x = M.stats.refurtiva - (Sc.ref0 || 0); Sc.rapine0 = r;
      if (x > 0 && st.player.money >= x * .5) {
        const fam = Sc.colpo && Sc.colpo.fam;
        Sc.bottino = { x, t: st.t, fam, quota: fam ? Math.round(x * CFG.quotaFam) : 0, entro: st.t + CFG.pagaEntro, deciso: false };
        G.feed(st, fam ? `Bottino: ${Math.round(x)}.000 lire. La Famiglia aspetta la sua parte (${Sc.bottino.quota}.000) entro sei ore.` : `Bottino: ${Math.round(x)}.000 lire. Adesso decidi dove vanno.`, 'money');
        Sc.colpo = null;
      }
    }
    Sc.ref0 = M.stats ? M.stats.refurtiva : 0;
    const B = Sc.bottino;
    if (B && B.fam && !B.pagato && st.t > B.entro) {   // la Famiglia non aspetta
      B.pagato = 'no'; B.deciso = true;
      G.feed(st, 'La Famiglia non ha visto la sua parte. Gli uomini di Sandro ti cercano.', 'bad'); G.addLog(st, `${G.clockStr(st.t)} · La Famiglia ti dà la caccia: non hai pagato la parte del portavalori.`, 'bad');
      st.npcs.forEach(n => { if (n.faction === 'squalo' && !n.dead) { n.aggro = true; n.inside = false; if (n.action && n.action.name === 'dentro') n.action.name = 'routine'; } });   // Sandro e i suoi: il motore li fa sparare
    }
  }
  function lootActions(st, out) {
    const Sc = S(st), p = st.player, B = Sc.bottino;
    // le armi dalla Famiglia: da uno dei suoi uomini
    const fm = st.npcs.find(n => n.fam && n.fam.rank !== 'capo' && !n.dead && !n.inside && dist(n.x, n.y, p.x, p.y) < 2.6);
    if (fm && !Sc.colpo && !(B && B.fam && !B.pagato)) out.push({ id: 'colpo_armi', label: `Chiedi a ${fm.first} le armi per il portavalori (la Famiglia vuole il 40%)`, run: () => {
      if (typeof G.giveWeapon === 'function') { G.giveWeapon(st, 'lupara', 10); G.giveWeapon(st, 'mitra', 60); } else { p.arms.lupara = { mag: 2 }; p.arms.mitra = { mag: 30 }; }
      Sc.colpo = { fam: true, by: fm.id, t: st.t };
      if (st.fam) st.fam.log && st.fam.log.unshift({ t: st.t, text: `${fm.first} ha dato le armi per il portavalori` });
      return `${fm.first} apre il bagagliaio: una lupara e uno Skorpion. «Il furgone passa due volte al giorno. Il quaranta per cento è nostro. E non farti vedere in faccia.»`;
    } });
    if (!B || B.deciso) return;
    const left = Math.max(0, B.x - (B.speso || 0));
    if (B.fam && !B.pagato) out.push({ id: 'colpo_fam', label: `Porta la parte alla Famiglia (${B.quota}.000)`, run: () => {
      if (p.money < B.quota) return `Ti mancano ${Math.ceil(B.quota - p.money)}.000 lire.`;
      p.money -= B.quota; B.pagato = 'si'; B.speso = (B.speso || 0) + B.quota; if (st.fam) st.fam.cash = (st.fam.cash || 0) + B.quota;
      return 'Un fidato conta i soldi senza alzare gli occhi. «Bravo. Ci si rivede.»';
    } });
    if (st.ris) out.push({ id: 'colpo_serre', label: `Finanzia le serre: il resto nella cassa comune (${Math.round(left)}.000)`, run: () => {
      const q = Math.min(left, p.money); if (q < 1) return 'Non hai più niente in tasca.';
      p.money -= q; st.ris.cassa += q; st.ris.morale = clamp(st.ris.morale + 8, 0, 100); B.speso = (B.speso || 0) + q; B.deciso = !B.fam || !!B.pagato;
      return 'I soldi del Banco finiscono in lampade, semi e pannelli rubati: le serre sotto i magazzini respirano per un inverno.';
    } });
    out.push({ id: 'colpo_tieni', label: 'Tieni il bottino per le cambiali', run: () => { B.deciso = !B.fam || !!B.pagato; return B.fam && !B.pagato ? 'Lo tieni. Ma la Famiglia la sua parte la vuole comunque, entro sei ore.' : 'Lo tieni: il debito con Sandro scende.'; } });
  }

  // ================= IL PASSO =================
  function step(st, dt) {
    if (!st.sc) return;
    const live = proteste(st);
    live.forEach(Pr => { piazza(st, Pr, dt); npcBarricade(st, Pr); });
    shields(st); projStep(st, dt); gasStep(st, dt); barrStep(st, dt); playerEvents(st); vanStep(st, dt); lootWatch(st);
    // i morti degli scontri
    const Sc = S(st);
    Sc.barr.forEach(b => {
      b.def.forEach(id => { const n = G.byId(st, id); if (n && n.dead && !n.scCounted) { n.scCounted = true; b.lost++; Sc.stats.morti++; } });
    });
    Sc.squad.forEach(id => { const n = G.byId(st, id); if (n && n.dead && !n.scCounted) { n.scCounted = true; Sc.stats.soldatiMorti++; const b = barrById(st, n.sc && n.sc.b); if (b) b.killed++; } });
    Sc.guards.forEach(id => { const n = G.byId(st, id); if (n && n.dead && !n.scCounted) { n.scCounted = true; Sc.stats.guardieMorte++; } });
  }

  // ================= LE AZIONI DEL GIOCATORE =================
  function actions(st) {
    const out = [], p = st.player; if (!st.sc || p.vehicle || p.indoor || st.over) return out;
    lootActions(st, out);
    const Pr = proteste(st).find(q => dist(p.x, p.y, q.x, q.y) < 40);
    const b = S(st).barr.find(q => q.phase !== 'giu' && dist(q.x, q.y, p.x, p.y) < 12);
    if (b) {
      if (b.phase === 'su') out.push({ id: 'barricata_aiuta', label: `La barricata sale (${Math.round(b.prog * 100)}%): dai una mano`, run: () => { b.prog = Math.min(1, b.prog + .12); return 'Trascini un cassonetto sul mucchio.'; } });
      return out;
    }
    if (Pr && Pr.people.length >= 6) {
      if (!onRoad(p.x, p.y)) out.push({ id: 'barricata', label: 'Alza una barricata', off: 'Mettiti in mezzo alla strada.' });
      else out.push({ id: 'barricata', label: 'Alza una barricata (poi si spara)', run: () => { const r = raise(st, Pr, p.x, p.y, 'player'); return r ? '' : 'Qui c\'è già una barricata.'; } });
    } else if (onRoad(p.x, p.y) && proteste(st).length) out.push({ id: 'barricata', label: 'Alza una barricata', off: 'Da solo non sposti le carcasse: serve una piazza piena.' });
    return out;
  }

  // ================= RESOCONTO =================
  function report(st) {
    const Sc = S(st); if (!Sc) return null;
    return { stats: Sc.stats, furgone: { carico: Math.round(cargo(st)), guardie: guards(st).map(n => `${n.first}${n.sc.on ? ' (' + n.sc.mode + ')' : ''}`), blocco: !!Sc.vanBlock }, bottino: Sc.bottino, gas: Sc.gas.length, barricate: Sc.barr.map(b => ({ id: b.id, fase: b.phase, hp: Math.round(b.hp), dove: b.place, difensori: b.def.length, morti: b.lost, soldati: b.killed })), bagnato: +Sc.wet.toFixed(2), gas_su_di_te: +Sc.gasP.toFixed(2) };
  }

  // ================= INSTALLAZIONE =================
  (function install() {
    const H = G.HOOKS; if (H.__scontri) return; H.__scontri = true;
    const c0 = H.create, t0 = H.think, m0 = H.move, s0 = H.step, w0 = H.wantedCap;
    H.create = st => { if (c0) c0(st); try { create(st); } catch (e) { if (typeof console !== 'undefined') console.warn('[scontri] create', e); } };
    H.think = (st, n) => (st.sc && n.sc && think(st, n)) || (t0 ? t0(st, n) : false);
    H.move = (st, n, dt, a) => (st.sc && n.sc && move(st, n, dt, a)) || (m0 ? m0(st, n, dt, a) : false);
    H.step = (st, dt) => { if (s0) s0(st, dt); step(st, dt); };
    // finché la piazza è di bottiglie e pugni, l'allerta si ferma all'arresto: i Grigi caricano, fermano, non sparano
    H.wantedCap = (st, lv) => { lv = w0 ? w0(st, lv) : lv; return st.sc && st.sc.cap ? Math.min(lv, 1) : lv; };
    const AZ0 = AZ(); if (AZ0 && AZ0.playerActions) { const prev = AZ0.playerActions; AZ0.playerActions = st => (prev(st) || []).map(a => a.id === 'sd_assalto' && a.run && st.sc ? Object.assign({}, a, { run: () => assaltoFurgone(st) || a.run() }) : a).concat(actions(st)); }
    const R0 = RS(); if (R0 && R0.playerAct) { const pa = R0.playerAct; R0.playerAct = (st, id, arg, extra) => { if (id === 'sd_assalto' && st.sc) { const m = assaltoFurgone(st); if (m) return { ok: false, msg: m }; } return pa(st, id, arg, extra); }; }
  })();

  return { CFG, create, step, report, raise, actions, scOf, heat, roadDir, assaltoFurgone, guardsOut };
})();
if (typeof module !== 'undefined') module.exports = Scontri;
