/* Porto Vecchio — i tetti (v7, «Writer»).
   Su ogni edificio c'è una scala a pioli di ferro (sul fianco o sul retro, mai sulla porta; su un tetto più basso se la casa
   non ha un lato libero). V ai piedi della scala: sali; V in cima: scendi. Sopra si cammina davvero:
   - LA QUOTA dei tetti è quella del modello (la grafica la misura con un raggio dall'alto, un metro alla volta: terrazzi,
     falde, comignoli e parapetti compresi); finché non l'ha misurata vale la regola dei piani (3,6 m + 2,4 a piano).
   - DA TETTO A TETTO: se si tocca, si passa (un gradino fino a 65 cm si sale, più in basso si scende saltando giù); se c'è un
     vicolo in mezzo si salta (Spazio, tieni per caricare): in aria il vuoto si attraversa, se atterri nel vuoto cadi in strada.
   - CADERE: fino a 4,5 m si atterra bene, oltre ci si fa male (e oltre 12 m molto male).
   - Sul tetto c'è la roba sui tetti (oggetti.js: p.onRoof) e ci sono i muri che da sotto non si raggiungono: gli heaven spot.
   Stato: st.player.lv = { k: 'tetto', b: indice dell'edificio, h: quota dei piedi } | { k: 'scala', L, up, t }.
   Si aggancia a Livelli (freeFn, moved, heightOf, key) senza toccarne il codice; la grafica (in fondo) disegna le scale. */
var Tetti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const LV = typeof Livelli !== 'undefined' ? Livelli : require('./livelli.js');
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, EL = G.MAP.elev, BI = W.bIndex, B = G.BUILDINGS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  const MG = 3.6, MF = 2.4;                   // come render.js: piano terra e piani sopra
  const STEP = .65, SAFE = 4.5, CLIMB_V = 1.7; // gradino che si sale camminando, caduta senza danni, velocità sulla scala (m/s)
  const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const tileH = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return inb(tx, ty) ? EL[ty * GW + tx] : 0; };
  const bAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!inb(tx, ty)) return -1; const i = BI[ty * GW + tx]; return i >= 0 && B[i] ? i : -1; };

  // ---------------- LA QUOTA DEI TETTI ----------------
  // la regola dei piani (prima che la grafica misuri il modello)
  function roofRule(b) {
    const base = b.base || 0;
    if (b.lighthouse) return base + 12;
    if (b.kiosk) return base + 2.8;
    return base + (b.fl >= 1 ? MG + (b.fl - 1) * MF : 3);
  }
  // la quota del tetto dell'edificio bi nel punto x, y (null: lì non c'è tetto, per esempio un cortile)
  function roofH(bi, x, y) {
    const b = B[bi]; if (!b) return null;
    const g = b.__rH; if (!g) return roofRule(b);
    const W1 = b.w * TS, gx = clamp(Math.floor(x - b.x * TS), 0, W1 - 1), gy = clamp(Math.floor(y - b.y * TS), 0, b.h * TS - 1), v = g[gy * W1 + gx];
    return Number.isFinite(v) ? v : null;
  }
  // il tetto sotto un punto: { bi, h } o null
  function roofAt(x, y) {
    const bi = bAt(x, y), h = bi < 0 ? null : roofH(bi, x, y), q = h === null ? null : { bi, h };
    const pk = PLANKS.length ? plankAt(x, y) : null;   // [tetti2] sulla passerella vale la quota delle assi (anche sopra il vicolo)
    return pk && (!q || pk.h >= q.h - .05) ? pk : q;
  }

  // ---------------- LE SCALE ----------------
  // una per edificio (due per i grandi), sul lato libero più nascosto: fianchi e retro, meglio negli angoli
  const DOOR = b => b.door ? b.door : null;
  function sidesOf(b) {
    return [
      { f: 'S', n: b.w, out: [0, 1], tile: k => [b.x + k, b.y + b.h], wall: k => [(b.x + k + .5) * TS, (b.y + b.h) * TS] },
      { f: 'N', n: b.w, out: [0, -1], tile: k => [b.x + k, b.y - 1], wall: k => [(b.x + k + .5) * TS, b.y * TS] },
      { f: 'E', n: b.h, out: [1, 0], tile: k => [b.x + b.w, b.y + k], wall: k => [(b.x + b.w) * TS, (b.y + k + .5) * TS] },
      { f: 'W', n: b.h, out: [-1, 0], tile: k => [b.x - 1, b.y + k], wall: k => [b.x * TS, (b.y + k + .5) * TS] },
    ];
  }
  function frontOf(b) {
    const d = DOOR(b); if (!d) return null;
    if (d[1] >= b.y + b.h) return 'S'; if (d[1] < b.y) return 'N'; if (d[0] >= b.x + b.w) return 'E'; if (d[0] < b.x) return 'W'; return null;
  }
  const LADDERS = [];
  function buildLadders() {
    LADDERS.length = 0;
    const used = new Set();
    B.forEach((b, bi) => {
      if (b.lighthouse) return;
      const d = DOOR(b), front = frontOf(b), cand = [];
      sidesOf(b).forEach(sd => {
        for (let k = 0; k < sd.n; k++) {
          const [tx, ty] = sd.tile(k); if (!inb(tx, ty)) continue;
          if (d && Math.max(Math.abs(tx - d[0]), Math.abs(ty - d[1])) <= 1) continue;   // non davanti alla porta
          if (used.has(ty * GW + tx)) continue;
          const other = BI[ty * GW + tx];
          let foot = -1;
          if (other >= 0 && other !== bi && B[other]) { if (roofRule(B[other]) < roofRule(b) - 1.5) foot = other; else continue; }   // dal tetto più basso del vicino
          else if (!G.walkT(tx, ty)) continue;
          let s = (sd.f === front ? -4 : 0) + (k === 0 || k === sd.n - 1 ? 2 : 0) + (sd.f === 'E' || sd.f === 'W' ? 1 : 0) + (foot >= 0 ? -3 : 0);
          // la casella davanti alla scala deve avere un po' di spazio (non un budello fra due muri ciechi)
          if (foot < 0) { const [ox, oy] = sd.out; if (!G.walkT(tx + ox, ty + oy)) s -= 1.5; }
          cand.push({ s, sd, k, tx, ty, foot });
        }
      });
      if (!cand.length) return;
      cand.sort((p, q) => q.s - p.s);
      const take = b.w * b.h >= 30 ? 2 : 1, got = [];
      for (const c of cand) {
        if (got.length >= take) break;
        if (got.some(g => g.sd.f === c.sd.f)) continue;
        got.push(c); used.add(c.ty * GW + c.tx);
        let [wx, wy] = c.sd.wall(c.k), [ox, oy] = c.sd.out;
        // [città2] la casa che segue la strada è girata attorno al suo centro (render.js rotRec): la scala gira con il muro
        const rot = b.rot && !b.sign && !b.shop ? b.rot : 0;
        if (rot) { const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, co = Math.cos(rot), si = Math.sin(rot), qx = wx - cx, qy = wy - cy;
          wx = cx + qx * co - qy * si; wy = cy + qx * si + qy * co; const nx = ox * co - oy * si, ny = ox * si + oy * co; ox = nx; oy = ny;
          const fx2 = wx + ox * .55, fy2 = wy + oy * .55, d0 = b.door ? hyp(fx2 - (b.door[0] + .5) * TS, fy2 - (b.door[1] + .5) * TS) : 99;
          if ((c.foot < 0 && !G.walkM(fx2, fy2)) || bAt(wx - ox * .8, wy - oy * .8) !== bi || bAt(wx - ox * 1.6, wy - oy * 1.6) !== bi || d0 < 2.6) { got.pop(); used.delete(c.ty * GW + c.tx); continue; } }
        LADDERS.push({ i: LADDERS.length, bi, f: c.sd.f, x: wx, y: wy, ox, oy, fx: wx + ox * .55, fy: wy + oy * .55, tx: wx - ox * .8, ty: wy - oy * .8, footB: c.foot, ang: Math.atan2(oy, ox) });
      }
    });
  }
  buildLadders();

  // ---------------- [tetti2] LE PASSERELLE: assi di legno sui vicoli larghi ----------------
  // Un vicolo di una casella (2 m) si salta; da due a tre caselle (4–6 m) il salto non basta: lì c'è una passerella di
  // tavole col corrimano di corda, fra due tetti di quota simile. Così i tetti di un isolato diventano un percorso:
  // si attraversa il quartiere senza scendere. Le estremità scendono a rampa dal parapetto al lastrico.
  // Una passerella: P0 (dentro il tetto a) → P1 (bordo di a) → P2 (bordo di b) → P3 (dentro b), larga 2·hw.
  const PLANKS = [], PCELL = new Map();
  const PIN = 1.5, PHW = .5;   // quanto entra nel tetto la rampa, mezza larghezza delle assi
  function buildPlanks() {
    PLANKS.length = 0; PCELL.clear();
    const pairs = new Set(), per = new Map(), ladTops = LADDERS.map(L => [L.tx, L.ty]);
    const okB = b => b && !b.lighthouse && !b.kiosk && !b.barrack && !b.military && !b.church && !b.rot && b.w >= 2 && b.h >= 2;   // [città2] non sulle case girate
    B.forEach((b, bi) => {
      if (!okB(b)) return;
      sidesOf(b).forEach(sd => {
        const [ox, oy] = sd.out, runs = new Map();
        for (let k = 0; k < sd.n; k++) {
          const [tx0, ty0] = sd.tile(k);
          for (let g = 0; g <= 3; g++) {
            const tx = tx0 + ox * g, ty = ty0 + oy * g; if (!inb(tx, ty)) break;
            const o = BI[ty * GW + tx];
            if (o >= 0 && B[o]) { if (o !== bi && g >= 2) { const R = runs.get(o) || runs.set(o, []).get(o); R.push({ k, g }); } break; }
            if (!G.walkT(tx, ty)) break;   // acqua, alberi, pareti: niente assi
          }
        }
        runs.forEach((R, bj) => {
          const c = B[bj], key = Math.min(bi, bj) + ':' + Math.max(bi, bj);
          if (!okB(c) || pairs.has(key) || Math.abs(roofRule(b) - roofRule(c)) > 2.4) return;
          const pmax = b.era || c.era ? 1 : 3;   // [città2] nella città per epoche una passerella per casa: le assi non devono coprire i vicoli
          if ((per.get(bi) || 0) >= pmax || (per.get(bj) || 0) >= pmax) return;
          const cnt = {}; R.forEach(q => cnt[q.g] = (cnt[q.g] || 0) + 1); const g = +Object.keys(cnt).sort((u, v) => cnt[v] - cnt[u])[0], R2 = R.filter(q => q.g === g);
          if (R2.length < 2) return;   // almeno due caselle di muro dritto di fronte
          const m = R2[Math.floor(R2.length / 2)], [wx, wy] = sd.wall(m.k);
          if (ladTops.some(([lx, ly]) => hyp(lx - wx, ly - wy) < 1.8)) return;   // non sopra l'arrivo di una scala
          const gap = g * TS, P = { i: PLANKS.length, a: bi, b: bj, ox, oy, px: -oy, py: ox, hw: PHW, gap,
            x0: wx - ox * PIN, y0: wy - oy * PIN, wa: [wx, wy], wb: [wx + ox * gap, wy + oy * gap] };
          P.L = PIN * 2 + gap; P.s1 = PIN; P.s2 = PIN + gap;
          PLANKS.push(P); pairs.add(key); per.set(bi, (per.get(bi) || 0) + 1); per.set(bj, (per.get(bj) || 0) + 1);
          // le caselle che tocca, per trovarla in fretta
          for (let s2 = 0; s2 <= P.L; s2 += .5) for (const t of [-PHW, 0, PHW]) { const x = P.x0 + ox * s2 + P.px * t, y = P.y0 + oy * s2 + P.py * t, ck = Math.floor(y / TS) * GW + Math.floor(x / TS);
            const L = PCELL.get(ck) || PCELL.set(ck, []).get(ck); if (L.indexOf(P) < 0) L.push(P); }
        });
      });
    });
  }
  // le quote delle quattro tappe: il lastrico dentro, il colmo del parapetto sul bordo (misurati se la grafica l'ha fatto)
  function edgeH(bi, wx, wy, ox, oy) { let h = -Infinity; for (let d = .15; d <= .9; d += .25) { const v = roofH(bi, wx - ox * d, wy - oy * d); if (v !== null && v > h) h = v; } return h > -Infinity ? h : roofRule(B[bi]); }
  function plankHs(P) {
    const key = (B[P.a].__rH ? 1 : 0) + (B[P.b].__rH ? 2 : 0); if (P.__k === key) return P.__h;
    const fa = roofH(P.a, P.x0, P.y0) ?? roofRule(B[P.a]), fb = roofH(P.b, P.wb[0] + P.ox * PIN, P.wb[1] + P.oy * PIN) ?? roofRule(B[P.b]);
    const ea = Math.max(fa, edgeH(P.a, P.wa[0], P.wa[1], P.ox, P.oy)), eb = Math.max(fb, edgeH(P.b, P.wb[0], P.wb[1], -P.ox, -P.oy));
    P.__k = key; return (P.__h = [fa, ea + .04, eb + .04, fb]);
  }
  function plankH(P, s2) {
    const h = plankHs(P);
    if (s2 <= P.s1) return h[0] + (h[1] - h[0]) * (s2 / P.s1);
    if (s2 <= P.s2) return h[1] + (h[2] - h[1]) * ((s2 - P.s1) / (P.s2 - P.s1));
    return h[2] + (h[3] - h[2]) * ((s2 - P.s2) / (P.L - P.s2));
  }
  function plankAt(x, y) {
    if (!inb(Math.floor(x / TS), Math.floor(y / TS))) return null;
    const L = PCELL.get(Math.floor(y / TS) * GW + Math.floor(x / TS)); if (!L) return null;
    for (const P of L) { const dx = x - P.x0, dy = y - P.y0, s2 = dx * P.ox + dy * P.oy, t = dx * P.px + dy * P.py;
      if (s2 < 0 || s2 > P.L || Math.abs(t) > P.hw) continue;
      return { bi: s2 < P.L / 2 ? P.a : P.b, h: plankH(P, s2), plank: P.i }; }
    return null;
  }
  buildPlanks();

  // ---------------- [tetti2] I BELVEDERI: i tetti più alti di ogni quartiere ----------------
  // Un motivo per salire: in cima ai palazzi più alti c'è un angolo con la panca e la bandierina. Arrivarci la prima volta
  // è una piccola scoperta (passa la noia); poi ci si può sedere a guardare il porto.
  const BELV = [];
  function buildBelv() {
    BELV.length = 0; const withL = new Set(LADDERS.map(L => L.bi));
    const cand = B.map((b, bi) => ({ b, bi })).filter(({ b, bi }) => withL.has(bi) && !b.military && !b.barrack && !b.kiosk && !b.lighthouse && !b.church && b.w >= 3 && b.h >= 3 && (b.fl || 1) >= 2)
      .sort((p, q) => roofRule(q.b) - roofRule(p.b) || p.bi - q.bi);
    for (const { b, bi } of cand) {
      if (BELV.length >= 12) break;
      const x = (b.x + b.w / 2) * TS, y = (b.y + b.h / 2) * TS;
      if (BELV.some(v => hyp(v.x - x, v.y - y) < 90)) continue;
      const W0 = G.MAP.world, dist = W0 && W0.districtAt ? W0.districtAt(x, y) : '';
      BELV.push({ i: BELV.length, bi, x, y, name: 'Belvedere · ' + (b.name || b.label || 'tetto'), dist });
    }
  }
  buildBelv();
  const belvNear = (st, r) => { const p = st.player; if (!p.lv || p.lv.k !== 'tetto') return null; for (const v of BELV) if (v.bi === p.lv.b && hyp(p.x - v.x, p.y - v.y) < (r || 3.5)) return v; return null; };
  function belvStep(st) {
    const v = belvNear(st, 3.2); if (!v) return;
    const T0 = st.tetti || (st.tetti = { belv: {}, sat: {} }); if (T0.belv[v.i]) return;
    T0.belv[v.i] = st.t; const N = st.me && st.me.need; if (N && N.svago !== undefined) N.svago = clamp(N.svago - .25, 0, 1);
    const n = Object.keys(T0.belv).length;
    G.feed(st, `${v.name}: da quassù si vede tutto il porto. (${n} belvedere su ${BELV.length})`, 'good');
  }
  function belvSit(st, v) {
    const T0 = st.tetti || (st.tetti = { belv: {}, sat: {} }), N = st.me && st.me.need;
    if (T0.sat[v.i] && st.t - T0.sat[v.i] < 360) return 'Ci sei già stato da poco. Il panorama non scappa.';
    T0.sat[v.i] = st.t; st.t += 20; if (N && N.svago !== undefined) N.svago = clamp(N.svago - .15, 0, 1);
    const P = ['Le barche rientrano, i gabbiani dietro. Venti minuti senza pensare a niente.', 'Il vento porta il sale e l\'odore del pane. Sotto, la città fa il suo rumore.', 'Conti le antenne, poi le luci che si accendono. Ti passa la voglia di scendere.'];
    return P[(v.i + Math.floor(st.t / 60)) % P.length];
  }

  // ---------------- [tetti2] IL NASCONDIGLIO: sul tetto le guardie ti perdono ----------------
  // Alto sopra la strada, lontano da una guardia, fermo o quasi: quello che le guardie ricordano di te sbiadisce più in fretta.
  function hideStep(st, dt) {
    const p = st.player; if (!p.lv || p.lv.k !== 'tetto') return;
    if (p.lv.h - tileH(p.x, p.y) < 5) return;
    let near = false; const mine = [];
    for (const n of st.npcs) { if (!n.cop || n.dead) continue; if (hyp(n.x - p.x, n.y - p.y) < 10) { near = true; break; } mine.push(n); }
    if (near) return;
    const k = Math.max(0, 1 - dt * ((p.speed || 0) < 1.5 ? .06 : .02));
    let any = false; mine.forEach(n => (n.mem || []).forEach(m => { if (m.actor === 'player' && m.conf > .02) { m.conf *= k; any = true; } }));
    if (any && G.wantedLevel && G.wantedLevel(st) > 0 && !(st.tetti && st.tetti.hint)) { (st.tetti || (st.tetti = { belv: {}, sat: {} })).hint = true; G.feed(st, 'Quassù non ti vedono. Stai giù e lasciali perdere.'); }
  }
  const footH = L => L.footB >= 0 ? (roofH(L.footB, L.fx, L.fy) ?? roofRule(B[L.footB])) : tileH(L.fx, L.fy);
  const topH = L => { const h = roofH(L.bi, L.tx, L.ty); return h === null ? roofRule(B[L.bi]) : h; };
  // la scala più vicina: ai piedi (per salire) o in cima (per scendere)
  function ladderNear(st, top, r) {
    const p = st.player; let best = null, bd = r || 1.5;
    for (const L of LADDERS) {
      if (top) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.bi) continue; const d = hyp(p.x - L.tx, p.y - L.ty); if (d < bd) { bd = d; best = L; } }
      else {
        if (L.footB >= 0) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.footB) continue; }
        else if (p.lv || p.indoor) continue;
        const d = hyp(p.x - L.fx, p.y - L.fy); if (d < bd) { bd = d; best = L; }
      }
    }
    return best;
  }

  // ---------------- SALIRE E SCENDERE ----------------
  function climb(st, L, up) {
    const p = st.player; if (p.vehicle) return null;
    if (p.sk && p.sk.on && typeof Skate !== 'undefined') Skate.dismount(st, true);
    const a = footH(L), b = topH(L);
    p.lv = { k: 'scala', L: L.i, up: !!up, t: 0, h0: up ? a : b, h1: up ? b + .05 : a, dur: Math.max(1.2, Math.abs(b - a) / CLIMB_V) };
    p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.jz = 0; p.jvz = 0; p.path = [];
    hooks.climb.forEach(f => { try { f(st, L, up); } catch (e) { } });
    return up ? `Sali la scala di ferro: ${Math.round(b - a)} metri.` : 'Scendi la scala.';
  }
  function climbStep(st, dt) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'scala') return;
    const L = LADDERS[lv.L]; p.jcharge = null; lv.t = Math.min(1, lv.t + dt / lv.dur); p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.anim = (p.anim || 0) + dt * 4;
    if (lv.t < 1) return;
    if (lv.up) { p.x = L.tx; p.y = L.ty; p.lv = { k: 'tetto', b: L.bi, h: topH(L) }; p.face = L.ang + Math.PI; G.feed(st, 'Sei sul tetto. Spazio per saltare da un tetto all\'altro; V sulla scala per scendere.'); }
    else if (L.footB >= 0) { p.lv = { k: 'tetto', b: L.footB, h: footH(L) }; }
    else p.lv = null;
  }
  const climbH = lv => lv.h0 + (lv.h1 - lv.h0) * lv.t;

  // ---------------- CAMMINARE SUI TETTI ----------------
  // dove si può mettere un piede: su un tetto (non più alto di un gradino, salto compreso); in aria anche sul vuoto
  function roofFree(o, r) {
    const lv = o.lv, k = r * .7;
    return (x, y) => {
      const air = (o.jz || 0) > .15, top = lv.h + STEP + Math.max(0, o.jz || 0);
      for (const [a, c] of [[x, y], [x - k, y - k], [x + k, y - k], [x - k, y + k], [x + k, y + k]]) {
        const q = roofAt(a, c);
        if (!q) { if (!air) return false; if (bAt(a, c) < 0 && !G.walkM(a, c) && !(G.seaM && G.seaM(a, c))) return false; continue; }
        if (q.h > top) return false;
        if (!air && q.h < lv.h - SAFE) return false;   // camminando non si casca da un tetto alto: per buttarsi giù si salta
      }
      return true;
    };
  }
  // dopo ogni passo (e a ogni fotogramma): la quota del tetto sotto i piedi, il salto giù, il vuoto
  function settle(st) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'tetto') return;
    const q = roofAt(p.x, p.y);
    if (q) {
      if (q.bi !== lv.b) lv.b = q.bi;
      const d = lv.h - q.h;
      if (Math.abs(d) > 1e-3) {
        if (d > 0) { p.jz = (p.jz || 0) + d; if (!(p.jvz < 0)) p.jvz = p.jvz || 0; }
        else { p.jz = Math.max(0, (p.jz || 0) + d); if (!p.jz) p.jvz = 0; }
        lv.h = q.h;
      }
    } else if (!(p.jz > 0)) {   // nel vuoto: giù in strada (o in mare)
      const g = tileH(p.x, p.y); p.jz = Math.max(.001, lv.h - g); p.jvz = Math.min(0, p.jvz || 0); p.lv = null;
      G.feed(st, 'Il vuoto sotto i piedi!', 'bad');
    }
  }
  // l'atterraggio: da quanto in alto si è caduti
  function fallStep(st) {
    const p = st.player, feet = (p.lv && p.lv.k === 'tetto') ? p.lv.h : tileH(p.x, p.y), top = feet + (p.jz || 0);
    if (p.jz > 0) { p.__airTop = Math.max(p.__airTop == null ? top : p.__airTop, top); return; }
    if (p.__airTop == null) return;
    const drop = p.__airTop - feet; p.__airTop = null;
    if (drop > SAFE) {
      const dmg = Math.round((drop - SAFE) * 14 + (drop > 12 ? 40 : 0)); p.hp = Math.max(1, p.hp - dmg); p.hurtT = st.clock; p.stun = Math.max(p.stun || 0, Math.min(2.5, .4 + (drop - SAFE) * .25));
      G.feed(st, drop > 9 ? `Volo di ${Math.round(drop)} metri. Le gambe non rispondono.` : `Atterri male (${Math.round(drop)} m).`, 'bad');
      st.sfx && st.sfx.push({ k: 'land', x: p.x, y: p.y });
    }
  }

  // ---------------- AGGANCI A LIVELLI ----------------
  const hooks = { climb: [] };
  const F0 = LV.freeFn, M0 = LV.moved, H0 = LV.heightOf, K0 = LV.key;
  LV.freeFn = (o, r) => { const lv = o.lv; if (lv && lv.k === 'tetto') return roofFree(o, r); if (lv && lv.k === 'scala') return () => false; return F0(o, r); };
  LV.moved = (st, dx, dy, hit) => { const p = st.player, lv = p.lv; if (lv && (lv.k === 'tetto' || lv.k === 'scala')) { settle(st); return true; } return M0(st, dx, dy, hit); };
  LV.heightOf = (st, o) => { const lv = o.lv; if (lv && lv.k === 'tetto') return lv.h; if (lv && lv.k === 'scala') return climbH(lv); return H0(st, o); };
  function vKey(st) {
    const p = st.player; if (p.vehicle || p.indoor) return null;
    if (p.lv && p.lv.k === 'scala') return 'Sei sulla scala.';
    const top = ladderNear(st, true, 1.6); if (top) return climb(st, top, false);
    const foot = ladderNear(st, false, 1.6); if (foot) return climb(st, foot, true);
    if (p.lv && p.lv.k === 'tetto') return 'Qui non c\'è la scala. Cerca i pioli sul bordo, o salta giù (Spazio).';
    return null;
  }
  LV.key = (st, k, sh) => { if (k === 'v') { const m = vKey(st); if (m) return m; } return K0(st, k, sh); };
  // il suggerimento in basso (G.context) e il menu «Qui, adesso»
  if (G.context) { const c0 = G.context; G.context = st => { const out = c0(st), p = st.player; if (!p || p.vehicle || st.over) return out;
    if (ladderNear(st, true, 1.6)) out.push({ key: 'V', label: 'Scendi dalla scala' }); else if (ladderNear(st, false, 1.6)) out.push({ key: 'V', label: 'Sali sul tetto' });
    return out; }; }
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => { const out = (prev(st) || []).slice();
    const t = ladderNear(st, true, 1.6), f = !t && ladderNear(st, false, 1.6);
    if (t) out.push({ id: 'tetto', label: 'Scendi dalla scala (V)', run: () => climb(st, t, false), off: '' }); else if (f) out.push({ id: 'tetto', label: 'Sali sul tetto (V)', run: () => climb(st, f, true), off: '' });
    const v = belvNear(st); if (v) out.push({ id: 'belvedere', label: 'Siediti a guardare il porto', run: () => belvSit(st, v), off: '' });   // [tetti2]
    return out; }; }
  // il passo: la scala, il tetto sotto i piedi, le cadute; p.onRoof per la roba sui tetti (oggetti.js)
  function step(st, dt) {
    const p = st.player; if (!p) return;
    climbStep(st, dt);
    if (p.lv && p.lv.k === 'tetto') settle(st);
    fallStep(st);
    p.onRoof = !!(p.lv && p.lv.k === 'tetto');
    if (p.onRoof) { belvStep(st); hideStep(st, dt); }
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Tetti]', e); } } }; }
  const onRoof = st => !!(st.player.lv && st.player.lv.k === 'tetto');
  const roofB = st => onRoof(st) ? B[st.player.lv.b] : null;
  const feetH = st => { const p = st.player; return LV.heightOf(st, p) ?? tileH(p.x, p.y); };

  // =====================================================================================================================
  // LA GRAFICA: le scale (tre InstancedMesh per tutta l'isola) e la misura dei tetti
  // =====================================================================================================================
  const GFX = { built: 0, sig: '', meshes: null, scanQ: [], scanned: new Set() };
  function recs(R) { return (R && R.__buildings) || []; }
  // i pezzi del modello di un edificio (le case a gradoni ne hanno più d'uno: il corpo e i volumi sopra)
  function recsOf(R, b) { return recs(R).filter(r => r.grp && r.b && (r.b === b || r.b.id === b.id)); }
  // la quota vera: un raggio dall'alto ogni metro, sul modello dell'edificio (solo i pezzi sopra il primo piano)
  // [fluido] la misura è a pezzi: un lavoro per edificio (scanStart) che avanza riga per riga finché c'è tempo nel fotogramma
  // (scanWork), poi riprende dal punto dove era arrivato. Stessi raggi, stessa quota: prima tutto in un colpo bloccava il
  // gioco (fino a centinaia di raggi per casa, contro tutti i triangoli del modello, due case ogni 60 ms).
  function scanStart(R, bi) {
    const b = B[bi]; if (!b || b.__rH) return null; const parts = []; recsOf(R, b).forEach(r => [r.grp, r.roofGrp, r.cityGrp].forEach(q => { if (q) parts.push(q); })); if (!parts.length) return false;   // [ordine1] anche la roba sul tetto: ci si sale sopra
    parts.forEach(g => g.updateMatrixWorld(true));
    const W1 = b.w * TS, H1 = b.h * TS;
    return { bi, b, parts, W1, H1, g: new Float32Array(W1 * H1), floor: (b.base || 0) + 1.6, rule: roofRule(b), gy: 0, hits: 0 };
  }
  function scanWork(J, deadline) {   // true: finito (misurato, o il modello non si presta)
    const T3 = THREE, rc = GFX.rc || (GFX.rc = new T3.Raycaster()), o = GFX.ro || (GFX.ro = new T3.Vector3()), dn = GFX.rd || (GFX.rd = new T3.Vector3(0, -1, 0));
    const { b, parts, W1, H1, g, floor, rule } = J;
    while (J.gy < H1) {
      const gy = J.gy++;
      for (let gx = 0; gx < W1; gx++) {
        const x = b.x * TS + gx + .5, z = b.y * TS + gy + .5; o.set(x, rule + 40, z); rc.set(o, dn); rc.far = 80;
        const h = rc.intersectObjects(parts, true).find(h => !h.object.userData.velo && !h.object.userData.noRoof && h.point.y > floor);
        g[gy * W1 + gx] = h ? h.point.y : NaN; if (h) J.hits++;
      }
      if (performance.now() > deadline) return J.gy >= H1 ? scanEnd(J) : false;
    }
    return scanEnd(J);
  }
  function scanEnd(J) {
    const { b, g, W1, H1, hits } = J;
    if (hits < W1 * H1 * .25) return true;   // il modello non si presta (vuoto, trasparente): resta la regola dei piani
    // i buchi isolati (uno spigolo mancato) prendono la quota dei vicini; i cortili veri restano vuoti
    for (let gy = 0; gy < H1; gy++) for (let gx = 0; gx < W1; gx++) { const i = gy * W1 + gx; if (Number.isFinite(g[i])) continue; let s = 0, n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= W1 || Y >= H1) continue; const v = g[Y * W1 + X]; if (Number.isFinite(v)) { s += v; n++; } } if (n >= 3) g[i] = s / n; }
    b.__rH = g; return true;
  }
  // la quota vera: un raggio dall'alto ogni metro, sul modello dell'edificio (solo i pezzi sopra il primo piano). Tutto subito (le prove)
  function scanRoof(R, bi) { const J = scanStart(R, bi); if (J === null) return true; if (!J) return false; return scanWork(J, Infinity); }
  function ladderGeo() {
    const T3 = THREE, box = new T3.BoxGeometry(1, 1, 1);
    const iron = new T3.MeshStandardMaterial({ color: '#3b3a3c', metalness: .55, roughness: .55 }), rust = new T3.MeshStandardMaterial({ color: '#6a3c28', metalness: .3, roughness: .8 });
    // [tetti2] leggibilità: fascia gialla ai piedi delle scale, lanterna calda in cima; assi, corda, panca e bandierina
    const yell = new T3.MeshStandardMaterial({ color: '#e8b828', roughness: .6 }), lamp = new T3.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false });
    const wood = new T3.MeshStandardMaterial({ color: '#8a6a44', roughness: .9 }), rope = new T3.MeshStandardMaterial({ color: '#c8b48a', roughness: 1 }), flag = new T3.MeshStandardMaterial({ color: '#c8302a', roughness: .8, side: T3.DoubleSide });
    return { box, iron, rust, yell, lamp, wood, rope, flag };
  }
  // le scale: due montanti, i pioli ogni 30 cm, la gabbia sopra i 2,5 m, il corrimano che scavalca il bordo del tetto
  function buildLaddersGfx(R) {
    const T3 = THREE, scene = R.__models.scene; if (!scene) return;
    if (GFX.meshes) GFX.meshes.forEach(m => { scene.remove(m); });
    const G3 = GFX.geo || (GFX.geo = ladderGeo()), rails = [], rungs = [], hoops = [], yel = [], lamps = [], boards = [], ropes = [], flags = [];
    const m4 = new T3.Matrix4(), q = new T3.Quaternion(), e = new T3.Euler(), s3 = new T3.Vector3(), p3 = new T3.Vector3();
    const put = (arr, x, y, z, sx, sy, sz, yaw) => { e.set(0, yaw, 0); q.setFromEuler(e); arr.push(m4.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz)).clone()); };
    LADDERS.forEach(L => {
      const y0 = footH(L), y1 = topH(L) + .95, Hh = y1 - y0; if (Hh < .5 || Hh > 40) return;
      const off = .2, cx = L.x + L.ox * off, cz = L.y + L.oy * off, yaw = -L.ang;   // 20 cm fuori dal muro
      const sx = -L.oy * .22, sz = L.ox * .22;   // i due montanti, 44 cm l'uno dall'altro
      for (const s of [-1, 1]) put(rails, cx + sx * s, y0 + Hh / 2, cz + sz * s, .05, Hh, .05, yaw);
      for (let y = y0 + .3; y < y1 - .9; y += .3) put(rungs, cx, y, cz, .03, .03, .44, yaw);
      // il corrimano ad arco sopra il bordo: due montanti che piegano verso il tetto
      for (const s of [-1, 1]) put(rails, cx - L.ox * .35 + sx * s, y1 - .02, cz - L.oy * .35 + sz * s, .7, .05, .05, yaw);
      // la gabbia: anelli a U ogni 70 cm sopra i 2,5 m (le scale lunghe)
      if (Hh > 4) for (let y = y0 + 2.5; y < y1 - .6; y += .7) {
        put(hoops, cx + L.ox * .38, y, cz + L.oy * .38, .03, .03, .62, yaw);
        for (const s of [-1, 1]) put(hoops, cx + L.ox * .2 + sx * s * 1.35, y, cz + L.oy * .2 + sz * s * 1.35, .36, .03, .03, yaw);
      }
      for (const s of [-1, 1]) put(yel, cx + sx * s, y0 + .55, cz + sz * s, .07, .9, .07, yaw);   // [tetti2] i montanti gialli: da lontano si vede dove si sale
      put(lamps, cx - L.ox * .1, y1 + .12, cz - L.oy * .1, .14, .16, .14, yaw); put(rails, cx - L.ox * .1, y1 + .02, cz - L.oy * .1, .2, .04, .2, yaw);   // la lanterna in cima
      if (Hh > 4) for (const s of [-1, 0, 1]) { const top = y1 - .6, bot = y0 + 2.5; if (top > bot) put(hoops, cx + L.ox * (s ? .2 : .38) + sx * s * 1.35, (top + bot) / 2, cz + L.oy * (s ? .2 : .38) + sz * s * 1.35, .025, top - bot, .025, yaw); }
    });
    // [tetti2] le passerelle: tavole di traverso su due travi, i paletti alle estremità e la corda tesa ai lati
    const qy = new T3.Quaternion(), qz = new T3.Quaternion(), ax = new T3.Vector3(0, 1, 0), az = new T3.Vector3(0, 0, 1);
    const seg = (arr, x1, y1, z1, x2, y2, z2, w, t, yaw) => { const L = hyp(x2 - x1, z2 - z1); qy.setFromAxisAngle(ax, yaw); qz.setFromAxisAngle(az, Math.atan2(y2 - y1, L)); q.copy(qy).multiply(qz);
      arr.push(m4.compose(p3.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), q, s3.set(Math.hypot(L, y2 - y1), t, w)).clone()); };
    PLANKS.forEach(P => {
      const h = plankHs(P), yaw = -Math.atan2(P.oy, P.ox), pt = s2 => [P.x0 + P.ox * s2, P.y0 + P.oy * s2];
      const S = [0, P.s1, P.s2, P.L];
      for (let k = 0; k < 3; k++) { const [x1, z1] = pt(S[k]), [x2, z2] = pt(S[k + 1]);
        for (const t of [-.32, .32]) seg(boards, x1 + P.px * t, h[k] - .06, z1 + P.py * t, x2 + P.px * t, h[k + 1] - .06, z2 + P.py * t, .1, .1, yaw);   // le travi
        const L = S[k + 1] - S[k]; for (let u = .12; u < L; u += .28) { const s2 = S[k] + u, [x, z] = pt(s2); e.set(0, yaw, 0); q.setFromEuler(e); boards.push(m4.compose(p3.set(x, plankH(P, s2) - .02, z), q, s3.set(.22, .04, .96)).clone()); } }
      for (const t of [-1, 1]) {   // paletti e corda solo sul tratto sospeso
        const [xa, za] = pt(S[1]), [xb, zb] = pt(S[2]), oa = [xa + P.px * t * .5, za + P.py * t * .5], ob = [xb + P.px * t * .5, zb + P.py * t * .5];
        put(ropes, oa[0], h[1] + .45, oa[1], .06, .9, .06, yaw); put(ropes, ob[0], h[2] + .45, ob[1], .06, .9, .06, yaw);
        seg(ropes, oa[0], h[1] + .88, oa[1], ob[0], h[2] + .88, ob[1], .03, .03, yaw);
      }
    });
    // [tetti2] i belvederi: la panca verso il panorama, il palo con la bandierina rossa
    BELV.forEach(v => {
      const y = roofH(v.bi, v.x, v.y) ?? roofRule(B[v.bi]), yaw = (v.i * 1.7) % 6.283;
      e.set(0, yaw, 0); q.setFromEuler(e);
      boards.push(m4.compose(p3.set(v.x, y + .45, v.y), q, s3.set(1.4, .07, .4)).clone());
      boards.push(m4.compose(p3.set(v.x + Math.sin(yaw) * .18, y + .72, v.y + Math.cos(yaw) * .18), q, s3.set(1.4, .3, .05)).clone());
      for (const s of [-.6, .6]) rails.push(m4.compose(p3.set(v.x + Math.cos(yaw) * s, y + .22, v.y - Math.sin(yaw) * s), q, s3.set(.06, .44, .36)).clone());
      const fx = v.x - Math.sin(yaw) * .9, fz = v.y - Math.cos(yaw) * .9;
      rails.push(m4.compose(p3.set(fx, y + 1.4, fz), q, s3.set(.05, 2.8, .05)).clone());
      flags.push(m4.compose(p3.set(fx + .32, y + 2.5, fz), q, s3.set(.6, .38, .02)).clone());
      lamps.push(m4.compose(p3.set(fx, y + 2.86, fz), q, s3.set(.1, .1, .1)).clone());
    });
    const mk = (arr, m) => { const im = new T3.InstancedMesh(G3.box, m, Math.max(1, arr.length)); arr.forEach((mm, i) => im.setMatrixAt(i, mm)); im.count = arr.length; im.castShadow = true; im.receiveShadow = true; im.userData.noRoof = true; im.frustumCulled = false; scene.add(im); return im; };
    GFX.meshes = [mk(rails, G3.iron), mk(rungs, G3.iron), mk(hoops, G3.rust), mk(yel, G3.yell), mk(lamps, G3.lamp), mk(boards, G3.wood), mk(ropes, G3.rope), mk(flags, G3.flag)];
    GFX.meshes[4].castShadow = false;
  }
  function frame() {
    try {
      const pv = window.__pv, R = pv && pv.R, st = pv && pv.st;
      if (R && R.__models && R.__models.scene && st && window.THREE) {
        const L = recs(R), sig = L.length + ':' + (L[0] && L[0].b ? L[0].b.id : '') + ':' + (L.length && L[L.length - 1].grp ? L[L.length - 1].grp.uuid : '');
        if (L.length && sig !== GFX.sig) { GFX.sig = sig; GFX.stableT = performance.now(); GFX.dirty = true; }
        // la quota dei tetti dove servono le scale: la si misura una casa alla volta, vicino al giocatore
        const p = st.player, now = performance.now();
        if (L.length) {   // [fluido] un edificio alla volta, a pezzi: 1,5 ms per fotogramma (3 sul tetto, i vicini per i salti prima)
          const roof = onRoof(st), deadline = now + (roof ? 3 : 1.5);
          if (GFX.job && (B[GFX.job.bi].__rH || GFX.scanned.has(GFX.job.bi))) GFX.job = null;
          if (!GFX.job && now - (GFX.scanT || 0) > 60) {
            GFX.scanT = now; let pick = -1;
            if (roof) for (let dy = -6; dy <= 6 && pick < 0; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const bi = bAt(p.x + dx, p.y + dy); if (bi >= 0 && !B[bi].__rH && !GFX.scanned.has(bi)) { pick = bi; break; } }
            if (pick < 0) { let bd = 70; for (let bi = 0; bi < B.length; bi++) { const b = B[bi]; if (b.__rH || GFX.scanned.has(bi)) continue; const d = hyp((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y); if (d < bd) { bd = d; pick = bi; } } }
            if (pick >= 0) { const J = scanStart(R, pick); if (J === null) GFX.scanned.add(pick); else if (J) GFX.job = J; }
          }
          if (GFX.job && scanWork(GFX.job, deadline)) { GFX.scanned.add(GFX.job.bi); GFX.dirty = true; GFX.job = null; }
        }
        if (GFX.dirty && now - (GFX.stableT || 0) > 1500 && now - (GFX.builtT || 0) > 2500) { GFX.dirty = false; GFX.builtT = now; buildLaddersGfx(R); }
        if (GFX.st !== st) { GFX.st = st; }
      }
    } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[Tetti]', e); } }
    requestAnimationFrame(frame);
  }
  if (typeof window !== 'undefined') {
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 300); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }

  return { LADDERS, PLANKS, BELV, belvNear, belvSit, plankAt, roofAt, roofH, roofRule, bAt, climb, ladderNear, onRoof, roofB, feetH, settle, scanRoof, hooks, STEP, SAFE, _: { buildLadders, GFX, footH, topH } };
})();
if (typeof module !== 'undefined') module.exports = Tetti;
