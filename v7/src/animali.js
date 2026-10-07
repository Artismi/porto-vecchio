/* Porto Vecchio — Gli animali (solo logica, nessuna grafica).
   Cani randagi al porto, nei vicoli e alla discarica; gatti sui moli e davanti alle botteghe; pecore e capre all'ovile
   e sul monte, mucche, asini e galline alla masseria e al Borgo dei Carbonai; i cani della Base al guinzaglio dei cinofili.
   Ognuno ha una casa (un posto e un raggio), un umore e poche cose che sa fare: girare, annusare, dormire, pascolare,
   scappare (dal giocatore che corre, dalle macchine, dagli spari), abbaiare ai Grigi, seguire chi gli dà retta.
   I cani della Base attaccano chi è nella zona militare senza lasciapassare o chi è ricercato.
   Vicino al giocatore si muovono a ogni passo, lontano una volta al secondo. Stato in st.ani. */
var Animali = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const PLACES = G.PLACES;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  const hourOf = t => Math.floor(t / 60) % 24;

  // specie: passo, corsa, raggio di casa, distanza di fuga, colori del mantello
  const SP = {
    cane: { walk: 1.25, run: 5.2, home: 28, flee: 3.2, cols: ['#8a6a48', '#2a2420', '#c8a878', '#5a4030', '#e8dcc8', '#6a6a68'], sound: 'bau' },
    cane_base: { walk: 1.3, run: 6.2, home: 0, flee: 0, cols: ['#b47a3a', '#a06a30'], sound: 'bau' },
    gatto: { walk: .75, run: 4.6, home: 16, flee: 2.8, cols: ['#d88a3a', '#2a2420', '#8a8a88', '#e8dcc8', '#6a5040', '#c8b090'], sound: 'miao' },
    pecora: { walk: .45, run: 3, home: 16, flee: 5, cols: ['#e8e2d4', '#ddd4c0', '#f0eadc', '#3a3430'], sound: 'bee', herd: true },
    capra: { walk: .6, run: 3.6, home: 18, flee: 4.5, cols: ['#e8e0d0', '#6a4a30', '#2a2420', '#a08060'], sound: 'bee', herd: true },
    mucca: { walk: .45, run: 2, home: 14, flee: 3.5, cols: ['#e8e2d4', '#5a3a26', '#2a2420'], sound: 'muu', herd: true },
    asino: { walk: .55, run: 2.6, home: 10, flee: 2.5, cols: ['#7a7068', '#5a5048', '#8a8070'], sound: 'raglio' },
    gallina: { walk: .45, run: 2.4, home: 8, flee: 2.2, cols: ['#e8e0d0', '#a85a2a', '#2a2420', '#c8883a'], sound: 'coccodè' },
  };
  // dove stanno: [specie, luogo, quanti, sparpagliati (m)]
  const WHERE = [
    ['cane', 'calata', 2, 8], ['cane', 'molo', 1, 6], ['cane', 'discarica', 3, 10], ['cane', 'caruggio', 1, 5], ['cane', 'piazzetta', 1, 5], ['cane', 'marina', 1, 6], ['cane', 'pineta', 1, 10], ['cane', 'villaggio', 1, 8], ['cane', 'masseria', 1, 6],
    ['gatto', 'vico', 2, 5], ['gatto', 'caruggio', 2, 5], ['gatto', 'calata', 2, 7], ['gatto', 'molo', 2, 6], ['gatto', 'marina', 1, 5], ['gatto', 'piazzetta', 1, 4], ['gatto', 'fontana', 1, 4], ['gatto', 'wu', 1, 3], ['gatto', 'osteria', 1, 3], ['gatto', 'chiesa', 1, 4], ['gatto', 'giardini', 1, 6], ['gatto', 'sangiacomo', 1, 5],
    ['pecora', 'ovile', 9, 9], ['pecora', 'masseria', 5, 8], ['capra', 'ovile', 4, 10], ['capra', 'monte', 5, 12], ['capra', 'villaggio', 3, 8],
    ['mucca', 'masseria', 3, 8], ['asino', 'masseria', 1, 4], ['asino', 'villaggio', 1, 4], ['gallina', 'masseria', 6, 5], ['gallina', 'villaggio', 6, 5], ['gallina', 'sangiacomo', 3, 4],
  ];

  function create(st) {
    const r = G.MAP && G.MAP.world ? G.MAP.world.rng(9133) : Math.random;
    const A = st.ani = { list: [], nextId: 1, rev: 0, companion: null };
    const put = (sp, x, y, extra) => {
      const S = SP[sp], k = A.nextId++;
      const a = Object.assign({ id: 'a' + k, sp, x, y, face: r() * 6.28, v: 0, mode: 'fermo', t: r() * 4, hx: x, hy: y, tx: x, ty: y, col: Math.floor(r() * S.cols.length), size: .88 + r() * .24, ph: r() * 9, dead: false, bark: 0, act: 0 }, extra || {});
      A.list.push(a); return a;
    };
    WHERE.forEach(([sp, pid, n, spread]) => {
      const q = PLACES[pid]; if (!q) return;
      for (let i = 0; i < n; i++) {
        let x = q.x, y = q.y;
        for (let k = 0; k < 12; k++) { const tx = q.x + (r() - .5) * 2 * spread, ty = q.y + (r() - .5) * 2 * spread; if (G.walkM(tx, ty)) { x = tx; y = ty; break; } }
        put(sp, x, y, { herd: SP[sp].herd ? pid : null });
      }
    });
    // i cani della Base: uno per cinofilo
    st.npcs.filter(n => n.ord && n.ord.dog).forEach(n => put('cane_base', n.x - 1, n.y, { owner: n.id, col: 0, size: 1.12 }));
    A.herds = {}; A.list.forEach(a => { if (a.herd) { const H = A.herds[a.herd + a.sp] || (A.herds[a.herd + a.sp] = { x: a.hx, y: a.hy, n: 0, ox: a.hx, oy: a.hy, t: 0 }); H.n++; a.hk = a.herd + a.sp; } });
  }

  // ---------------- PERICOLI ----------------
  function threat(st, a, S) {
    const p = st.player, d = dist(a.x, a.y, p.x, p.y);
    if (st.clock - (st.lastShotAt || -99) < 3 && d < 30) return { x: p.x, y: p.y, k: 2 };
    if (st.clock - (st.panicAt || -99) < 2 && d < 20) return { x: p.x, y: p.y, k: 1.5 };
    if (!p.vehicle && d < S.flee * (Math.abs(p.speed || 0) > 2.6 ? 2 : 1) && !(a.friend && a.sp === 'cane')) return { x: p.x, y: p.y, k: 1 };
    for (const v of st.vehicles) { if (v.hidden || Math.abs(v.speed || 0) < 3) continue; const dv = dist(a.x, a.y, v.x, v.y); if (dv < 6) return { x: v.x, y: v.y, k: 1.4, car: v }; }
    return null;
  }
  function goToward(a, x, y, sp, dt) {
    const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy); if (d < .05) { a.v = 0; return true; }
    const want = Math.atan2(dy, dx); a.face += angDiff(want, a.face) * Math.min(1, dt * (sp > 2 ? 8 : 4));
    const s = Math.min(d, sp * dt), nx = a.x + Math.cos(a.face) * s, ny = a.y + Math.sin(a.face) * s;
    if (G.walkM(nx, ny)) { a.x = nx; a.y = ny; a.v = sp; a.stuck = 0; } else { a.v = 0; a.stuck = (a.stuck || 0) + dt; if (a.stuck > .6) { a.tx = a.x; a.ty = a.y; a.t = 0; } }
    return d < .3;
  }
  function pickSpot(a, R, r) { for (let k = 0; k < 8; k++) { const ang = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * R, x = (a.hk ? a.hcx : a.hx) + Math.cos(ang) * rr, y = (a.hk ? a.hcy : a.hy) + Math.sin(ang) * rr; if (G.walkM(x, y)) { a.tx = x; a.ty = y; return; } } a.tx = a.hx; a.ty = a.hy; }

  // ---------------- UN ANIMALE ----------------
  function tickOne(st, a, dt) {
    const S = SP[a.sp], A = st.ani, h = hourOf(st.t), night = h >= 22 || h < 6;
    a.bark = Math.max(0, a.bark - dt); a.act = Math.max(0, a.act - dt);
    if (a.dead) { a.v = 0; return; }
    // investiti
    for (const v of st.vehicles) { if (v.hidden || Math.hypot(v.vx || 0, v.vy || 0) < 4) continue; if (dist(a.x, a.y, v.x, v.y) < (G.VK[v.kind] ? G.VK[v.kind].len / 2 : 1.5)) { a.dead = true; a.mode = 'morto'; a.v = 0; A.rev++; st.sfx.push({ k: 'guaito', x: a.x, y: a.y }); if (v.rider === 'player') G.feed(st, a.sp === 'cane' ? 'Hai investito un cane.' : a.sp === 'gatto' ? 'Hai investito un gatto.' : 'Hai investito un animale.', 'bad'); return; } }
    if (a.sp === 'cane_base') return tickGuardDog(st, a, dt);
    if (a.herd) { const H = A.herds[a.hk]; a.hcx = H.x; a.hcy = H.y; }
    const T = threat(st, a, S);
    if (T) {
      if (a.mode !== 'fugge') { a.mode = 'fugge'; a.t = 1.5 + Math.random() * 2; const ang = Math.atan2(a.y - T.y, a.x - T.x) + (Math.random() - .5) * .8, L = 6 + Math.random() * 6; a.tx = a.x + Math.cos(ang) * L; a.ty = a.y + Math.sin(ang) * L; if (Math.random() < .5) { a.bark = .6; st.sfx.push({ k: S.sound, x: a.x, y: a.y }); } }
    }
    if (a.mode === 'fugge') { a.t -= dt; goToward(a, a.tx, a.ty, S.run * (a.sp === 'gallina' ? .9 + Math.sin(st.clock * 20) * .3 : 1), dt); if (a.t <= 0) { a.mode = 'fermo'; a.t = 2 + Math.random() * 3; } return; }
    // il cane che ti segue
    if (a.sp === 'cane' && A.companion === a.id) {
      const p = st.player, d = dist(a.x, a.y, p.x, p.y);
      if (st.t > a.friendUntil || d > 40 || p.vehicle) { A.companion = null; a.friend = false; a.mode = 'fermo'; a.hx = a.x; a.hy = a.y; if (d < 40) G.feed(st, 'Il cane se ne torna per i fatti suoi.', 'info'); }
      else if (d > 2.2) goToward(a, p.x - Math.cos(p.face) * 1.2, p.y - Math.sin(p.face) * 1.2, d > 6 ? S.run * .8 : S.walk * 1.4, dt);
      else { a.v = 0; if (Math.random() < dt * .5) a.act = .5; }
      barkAtCops(st, a, S); return;
    }
    // il cane si affeziona a chi gli sta vicino, fermo, per un po'
    if (a.sp === 'cane' && !A.companion && !st.player.vehicle) {
      const p = st.player, d = dist(a.x, a.y, p.x, p.y);
      if (d < 3 && Math.abs(p.speed || 0) < .3) { a.near = (a.near || 0) + dt; if (a.near > 3.5) { if (Math.random() < .6) { A.companion = a.id; a.friend = true; a.friendUntil = st.t + 20 + Math.random() * 40; G.feed(st, 'Un cane randagio ha deciso di seguirti.', 'good'); a.bark = .5; st.sfx.push({ k: 'bau', x: a.x, y: a.y }); } a.near = -20; } }
      else a.near = Math.max(0, (a.near || 0) - dt);
    }
    if (a.sp === 'cane') { if (barkAtCops(st, a, S)) return; }
    // la giornata
    const sleepy = a.sp === 'gatto' ? (h >= 11 && h < 15) : (a.sp === 'gallina' ? night || h >= 20 : night);
    if (sleepy && a.mode !== 'dorme' && Math.random() < dt * .05) { a.mode = 'dorme'; a.t = 30 + Math.random() * 60; a.tx = a.hx + (Math.random() - .5) * 2; a.ty = a.hy + (Math.random() - .5) * 2; }
    if (a.mode === 'dorme') { if (dist(a.x, a.y, a.tx, a.ty) > .4 && !a.lying) goToward(a, a.tx, a.ty, S.walk, dt); else { a.lying = true; a.v = 0; } a.t -= dt; if (a.t <= 0 && !sleepy) { a.mode = 'fermo'; a.lying = false; a.t = 1; } return; }
    a.lying = false;
    a.t -= dt;
    if (a.mode === 'fermo' || a.mode === 'pascola' || a.mode === 'siede' || a.mode === 'annusa') {
      a.v = 0;
      if (a.t <= 0) {
        // dove andare: un punto a caso nella sua zona
        const R = S.home * (a.herd ? .45 : 1);
        pickSpot(a, R); a.mode = 'va'; a.t = 20;
      }
      return;
    }
    if (a.mode === 'va') {
      const sp = S.walk * (a.sp === 'gallina' ? (Math.sin(st.clock * 9 + a.ph) > 0 ? 1.6 : .2) : 1);
      if (goToward(a, a.tx, a.ty, sp, dt) || a.t <= 0) {
        a.mode = a.herd ? 'pascola' : a.sp === 'gatto' ? 'siede' : a.sp === 'cane' ? 'annusa' : 'fermo';
        a.t = a.herd ? 6 + Math.random() * 18 : a.sp === 'gatto' ? 8 + Math.random() * 30 : a.sp === 'gallina' ? .8 + Math.random() * 2 : 2 + Math.random() * 6;
        if (Math.random() < .08) { a.bark = .5; st.sfx.push({ k: S.sound, x: a.x, y: a.y }); }
      }
    }
  }
  // i randagi ce l'hanno coi Grigi
  function barkAtCops(st, a, S) {
    if (st.clock < (a.barkCd || 0)) return false;
    for (const n of st.npcs) {
      if (!n.cop || n.dead || n.inside) continue; const d = dist(a.x, a.y, n.x, n.y); if (d > 6) continue;
      a.barkCd = st.clock + 6 + Math.random() * 6; a.bark = 1.4; a.mode = 'fermo'; a.t = 1.6; a.v = 0; a.face = Math.atan2(n.y - a.y, n.x - a.x);
      st.sfx.push({ k: 'bau', x: a.x, y: a.y });
      if (Math.random() < .3 && st.clock > (n.barkCd || 0)) G.say(st, n, ['Via, bestiaccia!', 'Sciò! Sciò!', 'Qualcuno lo porti al canile.'][Math.floor(Math.random() * 3)], 2);
      return true;
    }
    return false;
  }
  // ---------------- I CANI DELLA BASE ----------------
  function tickGuardDog(st, a, dt) {
    const S = SP.cane_base, o = G.byId(st, a.owner), p = st.player;
    if (!o || o.dead) { a.mode = 'fermo'; a.v = 0; return; }
    if (o.inside) { a.x = o.x; a.y = o.y; a.hidden = true; return; } a.hidden = false;
    const wanted = G.wantedLevel ? G.wantedLevel(st) : 0, base = G.MAP.world && G.MAP.world.WALL && p.x > G.MAP.world.WALL.x + 1;
    const inv = p.inv || {}, pass = inv.lasciapassare > 0 || inv.documenti > 0, dp = dist(a.x, a.y, p.x, p.y);
    const hunt = !p.vehicle && !p.indoor && dp < 16 && ((wanted >= 2) || (base && !pass && (st.ord && !st.ord.passOk || st.t > (st.ord && st.ord.passOk || 0))) && dist(o.x, o.y, p.x, p.y) < 14);
    if (hunt) {
      a.mode = 'attacca';
      if (dp > 1.1) goToward(a, p.x, p.y, S.run, dt);
      else { a.v = 0; a.face = Math.atan2(p.y - a.y, p.x - a.x); if (st.clock > (a.biteT || 0)) { a.biteT = st.clock + 1.3; a.act = .4; a.bark = .5; if (G.damagePlayer) G.damagePlayer(st, 6, a.face, o.id); st.sfx.push({ k: 'ringhio', x: a.x, y: a.y }); if (!a.told) { a.told = true; G.feed(st, 'Il cane della Base ti azzanna!', 'bad'); } } }
      if (st.clock > (a.barkCd || 0)) { a.barkCd = st.clock + 1.5; a.bark = .8; st.sfx.push({ k: 'bau', x: a.x, y: a.y }); }
      return;
    }
    a.told = false;
    // al guinzaglio: a sinistra del soldato, un passo avanti
    const s = o.face - Math.PI / 2, x = o.x + Math.cos(s) * .8 + Math.cos(o.face) * .5, y = o.y + Math.sin(s) * .8 + Math.sin(o.face) * .5;
    const d = dist(a.x, a.y, x, y);
    if (d > 6) { a.x = x; a.y = y; }
    if (d > .25) goToward(a, x, y, Math.max(S.walk, (o.speedNow || 0) * 1.25 + d * .8), dt); else { a.v = 0; a.face += angDiff(o.face, a.face) * Math.min(1, dt * 3); }
    a.mode = a.v > .2 ? 'va' : 'fermo';
    // annusa chi passa e ringhia agli sconosciuti nella Base
    if (base && dp < 8 && !pass && st.clock > (a.barkCd || 0)) { a.barkCd = st.clock + 3; a.bark = 1; st.sfx.push({ k: 'ringhio', x: a.x, y: a.y }); }
  }

  // ---------------- IL PASSO ----------------
  let far = 0;
  function step(st, dt) {
    const A = st.ani; if (!A) return;
    try {
      far += dt; const doFar = far >= 1; const fdt = far; if (doFar) far = 0;
      const p = st.player;
      // le greggi si spostano piano attorno a casa
      if (doFar) for (const k in A.herds) { const H = A.herds[k]; H.t -= fdt; if (H.t <= 0) { H.t = 40 + Math.random() * 80; const ang = Math.random() * 6.28, r = Math.random() * 10; const x = H.ox + Math.cos(ang) * r, y = H.oy + Math.sin(ang) * r; if (G.walkM(x, y)) { H.x = x; H.y = y; } } }
      for (const a of A.list) {
        const near = Math.abs(a.x - p.x) < 80 && Math.abs(a.y - p.y) < 80;
        if (near) tickOne(st, a, dt); else if (doFar) tickOne(st, a, Math.min(fdt, 1.2));
      }
    } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[animali]', e); } }
  }
  function report(st) { const A = st.ani; if (!A) return null; const o = {}; A.list.forEach(a => { o[a.sp] = (o[a.sp] || 0) + (a.dead ? 0 : 1); }); o.morti = A.list.filter(a => a.dead).length; return o; }

  (function install() {
    const H = G.HOOKS; if (H.__animali) return; H.__animali = true;
    const c0 = H.create, s0 = H.step;
    H.create = st => { if (c0) c0(st); try { create(st); } catch (e) { if (typeof console !== 'undefined') console.warn('[animali] create', e); } };
    H.step = (st, dt) => { if (s0) s0(st, dt); step(st, dt); };
  })();
  return { SP, WHERE, create, step, report };
})();
if (typeof module !== 'undefined') module.exports = Animali;
