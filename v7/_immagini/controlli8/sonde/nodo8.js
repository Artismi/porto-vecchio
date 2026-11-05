// [controlli8] la colla in Node (COLLA=prima|dopo prima del require: il banco del mercato si piazza una volta): il mondo vero (world_cittanuova + game), la camera7 senza raggi, la colla dei comandi di main.js/render.js
const path = require('path');
const SRC = process.env.SRC8 || path.resolve(__dirname, '../../../src');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(SRC, 'world_cittanuova.js')); global.Interior = require(path.join(SRC, 'interiors.js')); global.Game = require(path.join(SRC, 'game.js'));
const C7 = require(path.join(SRC, 'camera7.js'));
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = G.TS, D = Math.PI / 180;
const VW = W.GW + 1;
function suolo(x, y) { let g; if (W.velev) { const fx = x / TS, fy = y / TS, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, e = (a, b) => W.velev[b * VW + a] || 0; g = e(i, j) * (1 - u) * (1 - v) + e(i + 1, j) * u * (1 - v) + e(i, j + 1) * (1 - u) * v + e(i + 1, j + 1) * u * v; } else g = W.elev[Math.floor(y / TS) * W.GW + Math.floor(x / TS)] || 0;
  const q = G.quotaSuolo(x, y, g); return q !== null ? q : g; }
const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
// il pilota umano: il punto del percorso ~avanti m davanti al più vicino (l'indice non torna indietro)
function mira(sg, p) { const P = sg.percorso; if (sg._i === undefined) { sg._i = 0; sg._u = 0; }
  let bi = sg._i, bu = sg._u, bd = 1e9; for (let i = sg._i; i < Math.min(P.length - 1, sg._i + 4); i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; let u = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L2; u = Math.max(i === sg._i ? sg._u : 0, Math.min(1, u)); const d = Math.hypot(a[0] + dx * u - p.x, a[1] + dy * u - p.y); if (d < bd - 1e-9) { bd = d; bi = i; bu = u; } }
  sg._i = bi; sg._u = bu; let rest = sg.avanti || 1.4, i = bi, u = bu;
  while (i < P.length - 1) { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), r = (1 - u) * L; if (r >= rest) { const f = u + rest / (L || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } rest -= r; i++; u = 0; }
  return P[P.length - 1]; }
if (process.env.COLLA === 'prima' && G.C8) { G.C8.on = false; C7.C8.on = false; }
let st = G.create(7), p = st.player;
function calma() { p.stun = 0; p.hp = 100; st.police = []; st.heat = 0; p.vx = p.vy = 0; p.speed = 0; p.jz = 0; p.jvz = 0; p.kbx = p.kby = 0; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; st.npcs.forEach(n => { n.x = -999; n.y = -999; }); st.vehicles.forEach(v => { v.x = -999; v.y = -999; v.hidden = true; }); }
const dietro = (hx, hy) => C7.dietro(hx, hy);
// la base della camera (render.js camBasis): fx, fz davanti; rx, rz destra (nel piano del gioco x, y)
const basis = y => { const fx = -Math.sin(y), fz = -Math.cos(y); return { fx, fz, rx: -fz, rz: fx }; };
// proietta (x, quota, y) dalla camera r (pos, look, fov) in [0..1] sullo schermo 16:9
function schermo(r, x, h, y, aspect = 16 / 9) { const F = [r.look.x - r.pos.x, r.look.y - r.pos.y, r.look.z - r.pos.z], fl = Math.hypot(...F); F[0] /= fl; F[1] /= fl; F[2] /= fl;
  let R = [-F[2], 0, F[0]]; const rl = Math.hypot(...R); R = R.map(a => a / rl); const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const d = [x - r.pos.x, h - r.pos.y, y - r.pos.z], zc = d[0] * F[0] + d[1] * F[1] + d[2] * F[2], xc = d[0] * R[0] + d[1] * R[1] + d[2] * R[2], yc = d[0] * U[0] + d[1] * U[1] + d[2] * U[2], t = Math.tan(r.fov * D / 2);
  return { x: .5 + xc / zc / t / aspect / 2, y: .5 - yc / zc / t / 2 }; }
/* la corsa: piano = { fps, start:[x,y], yaw (della camera) | verso:[x,y], segs:[{ sec, keys:{w,a,s,d,shift}, stick:[sx,sy] (destra, giù), pilota:[x,y], percorso:[[x,y]..], tasti8 (pilota coi tasti a 8 vie), drag (rad/s), mira, salta:t }] }
   colla: 'prima' (main.js/render.js di origin/main: cam.lock accumulato finché ti muovi) o 'dopo' (Camera7.comandi8 se c'è) */
function corsa(piano) {
  const dt = 1 / (piano.fps || 60), C8 = C7.comandi8 && piano.colla !== 'prima' ? C7.comandi8 : null;
  if (G.C8) G.C8.on = piano.colla !== 'prima'; if (C7.C8) C7.C8.on = piano.colla !== 'prima';
  st = G.create(7); p = st.player; M.st = st; M.p = p;
  calma(); p.x = piano.start[0]; p.y = piano.start[1]; p.face = piano.face !== undefined ? piano.face : 0;
  let y0 = piano.yaw; if (piano.verso) { const h = Math.atan2(piano.verso[1] - p.y, piano.verso[0] - p.x); y0 = dietro(Math.cos(h), Math.sin(h)); p.face = h; }
  const S = C7.create(); let lock = 0, yaw = y0, yawIn = y0, ppx = p.x, ppy = p.y, faceVis = p.face; const B8 = C8 ? C8.crea() : null;
  const L = []; let t = 0, drag = 0;
  // il primo passo della camera (ferma)
  let R7 = C7.passo(S, { px: p.x, py: p.y, fy: suolo(p.x, p.y), vx: 0, vy: 0, aspect: 16 / 9, init: { yaw: y0 } }, dt); yaw = R7.yaw; yawIn = yaw;
  for (const sg of piano.segs) { const t1 = t + sg.sec; let k = 0;
    while (t < t1 - 1e-9) {
      // 1. l'input (main.js input0): f/s dai tasti, o la levetta, o il pilota
      let sx = 0, sy = 0, mag, sprint = !!(sg.keys && sg.keys.shift) || !!sg.run, tasti = false;
      if (sg.keys && !sg.percorso) { const K = sg.keys; sy = (K.w ? 1 : 0) - (K.s ? 1 : 0); sx = (K.d ? 1 : 0) - (K.a ? 1 : 0); tasti = true; }
      if (sg.percorso && sg.umano) { sg.pilota = mira(sg, p); }
      else if (sg.percorso) { while (sg._k === undefined || (sg._k < sg.percorso.length - 1 && Math.hypot(sg.percorso[sg._k][0] - p.x, sg.percorso[sg._k][1] - p.y) < (sg.raggio || .9))) sg._k = sg._k === undefined ? 0 : sg._k + 1; sg.pilota = sg.percorso[sg._k]; }
      if (sg.pilota) { const dx = sg.pilota[0] - p.x, dy = sg.pilota[1] - p.y, l = Math.hypot(dx, dy);
        if (l > .3) { const Bc = basis(yaw), fwd = (dx * Bc.fx + dy * Bc.fz) / l, rgt = (dx * Bc.rx + dy * Bc.rz) / l;   // il giocatore guarda lo schermo: la direzione voluta nello spazio della camera VERA
          if (sg.tasti8) { const a = Math.atan2(rgt, fwd); let o = Math.round(a / (Math.PI / 4));
            if (sg._o !== undefined && Math.abs(ang(a - sg._o * Math.PI / 4)) < (sg.isteresi || 35) * D) o = sg._o; sg._o = o;   // il dito resta sul tasto finché lo scarto non passa i 35°
            const aa = o * Math.PI / 4; sx = Math.round(Math.sin(aa)); sy = Math.round(Math.cos(aa)); tasti = true; }
          else { sx = rgt; sy = fwd; mag = 1; } } }
      if (sg.stick) { sx = sg.stick[0]; sy = -sg.stick[1]; mag = Math.min(1, Math.hypot(sx, sy)); }
      const dyaw = (sg.drag || 0) * dt;
      let inp = { x: 0, y: 0, sprint };
      if (sx || sy) {
        let d;
        if (C8) d = C8.dir(B8, sx, sy, yaw + dyaw, tasti, dt);   // [controlli8] la camera di adesso (col giro di questo fotogramma), la direzione tenuta
        else { const B = basis(yawIn); d = { x: B.rx * sx + B.fx * sy, y: B.rz * sx + B.fz * sy }; }
        const l = Math.hypot(d.x, d.y) || 1; inp = { x: d.x / l, y: d.y / l, sprint, aim: Math.atan2(d.y / l, d.x / l) }; if (mag !== undefined) inp.mag = mag; else inp.tasti = true;
      } else if (C8) C8.dir(B8, 0, 0, yaw, tasti, dt);
      if (sg.mira) { const Bm = basis(C8 ? yaw : yawIn); inp.aim = Math.atan2(Bm.fz, Bm.fx); }
      if (sg.salta !== undefined && Math.abs(t - (t1 - sg.sec) - sg.salta) < dt / 2) { G.jumpHold(st, true); G.jumpHold(st, false); }
      // 2. il motore
      const x0 = p.x, yy0 = p.y; G.step(st, dt, inp);
      // 3. la camera (render.js camera7Frame)
      const vx = (p.x - ppx) / dt, vy = (p.y - ppy) / dt; ppx = p.x; ppy = p.y;
      const muove = !!(inp.x || inp.y);
      R7 = C7.passo(S, { px: p.x, py: p.y, fy: suolo(p.x, p.y), vx, vy, dyaw, tocca: !!sg.drag, mira: !!sg.mira, aspect: 16 / 9, tenuto: C8 && B8.a !== null ? B8.t : undefined }, dt);
      yaw = R7.yaw;
      if (C8) C8.dopo(B8, R7);
      else { lock = muove ? lock - R7.dyRic : 0; yawIn = yaw + lock; }
      const kTurn = (G.C8 && G.C8.on && G.C8.K.vista) || 22; faceVis += ang(p.face - faceVis) * (1 - Math.exp(-Math.min(dt, .1) * kTurn));   // render.js turnTo
      const sc = schermo(R7, p.x, suolo(p.x, p.y) + .9, p.y);
      L.push({ t: +(t + dt).toFixed(4), seg: piano.segs.indexOf(sg), x: p.x, y: p.y, dsp: Math.hypot(p.x - x0, p.y - yy0) / dt, v: Math.hypot(p.vx || 0, p.vy || 0), face: p.face, faceVis, yaw, yawIn: C8 ? (C8.yawUsato ? C8.yawUsato(B8) : yaw) : yawIn, inp: { x: inp.x, y: inp.y }, sx: sc.x, sy: sc.y, fy: suolo(p.x, p.y), jz: p.jz || 0, i: sg._i });
      t += dt; k++;
    } }
  return L;
}
const M = module.exports = { G, W, C7, st, p, corsa, suolo, basis, ang, dietro, schermo, D, TS };
