// [controlli8] le prove dei comandi a piedi rispetto alla vista (camera7.js comandi8, lo sguardo avanti lungo la vista, il ricentro che
// aspetta) e del passo pronto (game.js muovi7 con C8: la partenza, 45/50 m/s², la svolta, il giro, lo spigolo, il salto all'atterraggio,
// il banco del mercato fuori dal vicolo), nel mondo vero (world_cittanuova + game) con la colla di main.js/render.js rifatta qui come là:
// l'input dei tasti (a 8 vie) e della levetta rispetto alla camera, il motore, la camera7 (senza raggi), il ricentro nella base tenuta.
// Prima/dopo: G.C8.on e Camera7.C8.on (?nofixcontrolli8); «prima» la base di render.js cam.lock (tenuta finché ti muovi).
// node src/test_controlli8.js   (dalla cartella v7 o da src)
const path = require('path'), src = __dirname;
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const C7 = require(path.join(src, 'camera7.js'));
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = G.TS, D = Math.PI / 180, ang = a => Math.atan2(Math.sin(a), Math.cos(a));
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
let st = G.create(7), p = st.player;
// la quota per la camera (i vertici del terreno, le opere di quotaSuolo)
const VW = W.GW + 1, suolo = (x, y) => { let g = 0; if (W.velev) { const fx = x / TS, fy = y / TS, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, e = (a, b) => W.velev[b * VW + a] || 0; g = e(i, j) * (1 - u) * (1 - v) + e(i + 1, j) * u * (1 - v) + e(i, j + 1) * (1 - u) * v + e(i + 1, j + 1) * u * v; } const q = G.quotaSuolo(x, y, g); return q !== null ? q : g; };
const basis = y => { const fx = -Math.sin(y), fz = -Math.cos(y); return { fx, fz, rx: -fz, rz: fx }; };
function schermo(r, x, h, y) { const F = [r.look.x - r.pos.x, r.look.y - r.pos.y, r.look.z - r.pos.z], fl = Math.hypot(...F); for (let i = 0; i < 3; i++) F[i] /= fl;
  let Rr = [-F[2], 0, F[0]]; const rl = Math.hypot(...Rr); Rr = Rr.map(a => a / rl); const U = [Rr[1] * F[2] - Rr[2] * F[1], Rr[2] * F[0] - Rr[0] * F[2], Rr[0] * F[1] - Rr[1] * F[0]];
  const d = [x - r.pos.x, h - r.pos.y, y - r.pos.z], zc = d[0] * F[0] + d[1] * F[1] + d[2] * F[2], t = Math.tan(r.fov * D / 2);
  return { x: .5 + (d[0] * Rr[0] + d[1] * Rr[1] + d[2] * Rr[2]) / zc / t / (16 / 9) / 2, y: .5 - (d[0] * U[0] + d[1] * U[1] + d[2] * U[2]) / zc / t / 2 }; }
// il pilota umano: il punto ~1,4 m avanti sul percorso (l'indice non torna indietro)
function avanti(sg) { const P = sg.percorso; if (sg._i === undefined) { sg._i = 0; sg._u = 0; }
  let bi = sg._i, bu = sg._u, bd = 1e9; for (let i = sg._i; i < Math.min(P.length - 1, sg._i + 4); i++) { const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; let u = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L2; u = Math.max(i === sg._i ? sg._u : 0, Math.min(1, u)); const d = Math.hypot(a[0] + dx * u - p.x, a[1] + dy * u - p.y); if (d < bd - 1e-9) { bd = d; bi = i; bu = u; } }
  sg._i = bi; sg._u = bu; let rest = 1.4, i = bi, u = bu;
  while (i < P.length - 1) { const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), r = (1 - u) * L; if (r >= rest) { const f = u + rest / (L || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } rest -= r; i++; u = 0; }
  return P[P.length - 1]; }
// LA CORSA: piano = { fps, dopo, start, yaw | verso, segs:[{ sec, keys:{w,a,s,d,shift}, stick:[sx,sy], percorso, tasti8, drag (rad/s), salta }] }
function corsa(piano) {
  const dt = 1 / (piano.fps || 60), dopo = piano.dopo !== false; G.C8.on = dopo; C7.C8.on = dopo;
  st = G.create(7); p = st.player; p.stun = 0; p.hp = 100; st.police = []; st.heat = 0; p.vx = p.vy = 0; p.speed = 0; p.jz = 0; p.jvz = 0;
  st.npcs.forEach(n => { n.x = n.y = -999; }); st.vehicles.forEach(v => { v.x = v.y = -999; v.hidden = true; });
  p.x = piano.start[0]; p.y = piano.start[1]; let y0 = piano.yaw || 0; if (piano.verso) { const h = Math.atan2(piano.verso[1] - p.y, piano.verso[0] - p.x); y0 = C7.dietro(Math.cos(h), Math.sin(h)); p.face = h; }
  const S = C7.create(), B8 = C7.comandi8.crea(); let lock = 0, ppx = p.x, ppy = p.y, faceVis = p.face, t = 0;
  let R7 = C7.passo(S, { px: p.x, py: p.y, fy: suolo(p.x, p.y), vx: 0, vy: 0, aspect: 16 / 9, init: { yaw: y0 } }, dt), yaw = R7.yaw, yawIn = yaw;
  const L = [];
  for (const sg of piano.segs) { const t1 = t + sg.sec;
    while (t < t1 - 1e-9) {
      let sx = 0, sy = 0, mag, tasti = false; const sprint = !!(sg.keys && sg.keys.shift);
      if (sg.keys && !sg.percorso) { sy = (sg.keys.w ? 1 : 0) - (sg.keys.s ? 1 : 0); sx = (sg.keys.d ? 1 : 0) - (sg.keys.a ? 1 : 0); tasti = true; }
      if (sg.stick) { sx = sg.stick[0]; sy = sg.stick[1]; mag = Math.min(1, Math.hypot(sx, sy)); }
      if (sg.percorso) { const q = avanti(sg), dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy); if (l > .3) { const Bc = basis(yaw), a = Math.atan2((dx * Bc.rx + dy * Bc.rz) / l, (dx * Bc.fx + dy * Bc.fz) / l);   // la camera che si vede
        let o = Math.round(a / (Math.PI / 4)); if (sg._o !== undefined && Math.abs(ang(a - sg._o * Math.PI / 4)) < 35 * D) o = sg._o; sg._o = o; sx = Math.round(Math.sin(o * Math.PI / 4)); sy = Math.round(Math.cos(o * Math.PI / 4)); tasti = true; } }
      const dyaw = (sg.drag || 0) * dt; let inp = { x: 0, y: 0, sprint };
      if (sx || sy) { let d; if (dopo) d = C7.comandi8.dir(B8, sx, sy, yaw + dyaw, tasti, dt); else { const B = basis(yawIn); d = { x: B.rx * sx + B.fx * sy, y: B.rz * sx + B.fz * sy }; }
        const l = Math.hypot(d.x, d.y) || 1; inp = { x: d.x / l, y: d.y / l, sprint, aim: Math.atan2(d.y, d.x) }; if (mag !== undefined) inp.mag = mag; else inp.tasti = true; }
      else if (dopo) C7.comandi8.dir(B8, 0, 0);
      if (sg.salta !== undefined && Math.abs(t - (t1 - sg.sec) - sg.salta) < dt / 2) G.jumpHold(st, true);
      const x0 = p.x, yy0 = p.y; G.step(st, dt, inp);
      const vx = (p.x - ppx) / dt, vy = (p.y - ppy) / dt; ppx = p.x; ppy = p.y; const muove = !!(inp.x || inp.y);
      R7 = C7.passo(S, { px: p.x, py: p.y, fy: suolo(p.x, p.y), vx, vy, dyaw, tocca: !!sg.drag, aspect: 16 / 9, tenuto: dopo && B8.a !== null ? B8.t : undefined }, dt); yaw = R7.yaw;
      if (dopo) C7.comandi8.dopo(B8, R7); else { lock = muove ? lock - R7.dyRic : 0; yawIn = yaw + lock; }
      faceVis += ang(p.face - faceVis) * (1 - Math.exp(-Math.min(dt, .1) * (dopo ? G.C8.K.vista : 22)));   // render.js turnTo
      const sc = schermo(R7, p.x, suolo(p.x, p.y) + .9, p.y);
      L.push({ seg: piano.segs.indexOf(sg), x: p.x, y: p.y, dsp: Math.hypot(p.x - x0, p.y - yy0) / dt, v: Math.hypot(p.vx || 0, p.vy || 0), face: p.face, faceVis, yaw, ix: inp.x, iy: inp.y, sx: sc.x, sy: sc.y, jz: p.jz || 0, i: sg._i });
      t += dt; } }
  return L;
}
const APERTO = [1276, 268];   // 11 m liberi attorno (la piazzetta a nord della stazione)
const AV = (fps, dopo) => { const L = corsa({ fps, dopo, start: APERTO, yaw: 0, segs: [{ sec: .3, keys: {} }, { sec: 1, keys: { w: 1 } }] }), i0 = L.findIndex(q => q.seg === 1), a = L[i0 - 1];
  return { prima: L.slice(i0).findIndex(q => Math.hypot(q.x - a.x, q.y - a.y) > .02) + 1, v90: L.slice(i0).findIndex(q => q.v > 3.24) + 1 }; };
const GIRO = (fps, dopo) => { const L = corsa({ fps, dopo, start: APERTO, yaw: 0, segs: [{ sec: 1.2, keys: { w: 1 } }, { sec: 1, keys: { s: 1 } }] }), j0 = L.findIndex(q => q.seg === 1), want = Math.atan2(L[j0].iy, L[j0].ix);
  return { vista: (L.slice(j0).findIndex(q => Math.abs(ang(q.faceVis - want)) < 10 * D) + 1) / fps, motore: (L.slice(j0).findIndex(q => Math.abs(ang(q.face - want)) < 10 * D) + 1) / fps, marcia: (L.slice(j0).findIndex(q => q.dsp > 3.24 && Math.cos(Math.atan2(q.y - L[j0 - 1].y, q.x - L[j0 - 1].x) - want) > 0) + 1) / fps }; };
const FRENA = (fps, dopo) => { const L = corsa({ fps, dopo, start: APERTO, yaw: 0, segs: [{ sec: 1, keys: { w: 1, shift: 1 } }, { sec: 1, keys: {} }] }), k0 = L.findIndex(q => q.seg === 1), kf = L.slice(k0).findIndex(q => q.dsp < .05) + 1;
  return { s: kf / fps, m: Math.hypot(L[k0 + kf - 1].x - L[k0 - 1].x, L[k0 + kf - 1].y - L[k0 - 1].y) }; };
const SVOLTA = (fps, dopo) => { const L = corsa({ fps, dopo, start: APERTO, yaw: 0, segs: [{ sec: 1, keys: { w: 1, shift: 1 } }, { sec: 1, keys: { d: 1, shift: 1 } }] }), s0 = L.findIndex(q => q.seg === 1), b = basis(L[s0 - 1].yaw); let over = 0;
  for (const q of L.slice(s0)) over = Math.max(over, (q.x - L[s0 - 1].x) * b.fx + (q.y - L[s0 - 1].y) * b.fz); return over; };

// 1. LA RISPOSTA: la prima mossa, il passo pieno, il dietrofront, la frenata, la svolta (60 e 30 fotogrammi al secondo)
for (const fps of [60, 30]) {
  const a0 = AV(fps, false), a1 = AV(fps, true), g0 = GIRO(fps, false), g1 = GIRO(fps, true), f0 = FRENA(fps, false), f1 = FRENA(fps, true), s0 = SVOLTA(fps, false), s1 = SVOLTA(fps, true);
  ok(a1.prima === 1 && a1.v90 <= Math.ceil(.07 * fps), `${fps} fps: premuto W ci si muove nel primo fotogramma (prima ${a0.prima}), al 90% del passo in ${a1.v90} fotogrammi = ${(a1.v90 / fps * 1000).toFixed(0)} ms (prima ${a0.v90} = ${(a0.v90 / fps * 1000).toFixed(0)} ms)`);
  ok(g1.vista <= .21 && g1.marcia <= .15 && g1.vista < g0.vista - .05, `${fps} fps: il dietrofront: il corpo (come si vede) girato in ${g1.vista.toFixed(2)} s (prima ${g0.vista.toFixed(2)}), la marcia invertita in ${g1.marcia.toFixed(2)} s (prima ${g0.marcia.toFixed(2)})`);
  ok(f1.s <= .15 && f1.m < .4, `${fps} fps: di corsa, lasciato il tasto, fermi in ${f1.s.toFixed(2)} s e ${f1.m.toFixed(2)} m (prima ${f0.s.toFixed(2)} s, ${f0.m.toFixed(2)} m)`);
  ok(s1 < .35, `${fps} fps: la svolta di 90° di corsa si allarga ${s1.toFixed(2)} m (prima ${s0.toFixed(2)})`);
}
// 2. I TASTI RISPETTO ALLA VISTA: D per 4 s (il ricentro gira la camera), poi W: W va dritto sullo schermo; tenendo D non si gira in tondo
for (const dopo of [false, true]) {
  const L = corsa({ fps: 30, dopo, start: APERTO, yaw: 0, segs: [{ sec: 4, keys: { d: 1 } }, { sec: .5, keys: { w: 1 } }] }), iW = L.findIndex(q => q.seg === 1) + 1, q = L[iW], B = basis(q.yaw);
  const giro = ang(L[iW - 2].yaw - L[0].yaw) / D, lato = ang(Math.atan2(q.iy, q.ix) - Math.atan2(B.fz, B.fx)) / D; let tondo = 0; for (let i = 1; i < iW - 1; i++) tondo += ang(Math.atan2(L[i].iy, L[i].ix) - Math.atan2(L[i - 1].iy, L[i - 1].ix));
  if (!dopo) console.log(`     prima: dopo 4 s di D (la camera girata di ${giro.toFixed(0)}° dal ricentro) W andava ${lato.toFixed(0)}° di lato sullo schermo`);
  else { ok(Math.abs(lato) < 1, `dopo 4 s di D (la camera girata di ${giro.toFixed(0)}° dal ricentro) W va ${lato.toFixed(1)}° dal «su» dello schermo (via dalla camera)`); ok(Math.abs(tondo) < 2 * D && Math.abs(giro) > 45, `tenendo D la marcia resta quella (${(tondo / D).toFixed(1)}°) mentre la camera ti viene dietro: niente giri in tondo`); }
}
// la levetta: tenuta ferma la via non gira col ricentro; girata, la base torna alla camera di quanto la giri; lasciata, riparte dalla camera
{ const B = C7.comandi8.crea(); C7.comandi8.dir(B, 0, 1, 0, false, 1 / 30); for (let i = 0; i < 30; i++) { C7.comandi8.dir(B, 0, 1, 0, false, 1 / 30); C7.comandi8.dopo(B, { yawGiro: .02 }); }
  const fermo = C7.comandi8.dir(B, 0, 1, .6, false, 1 / 30); const d1 = C7.comandi8.dir(B, Math.sin(.3), Math.cos(.3), .6, false, 1 / 30), offDopo = B.off; C7.comandi8.dir(B, 0, 0); const d2 = C7.comandi8.dir(B, 0, 1, .6, false, 1 / 30);
  ok(Math.abs(Math.atan2(fermo.y, fermo.x) - Math.atan2(-Math.cos(0), -Math.sin(0))) < 1e-6 && Math.abs(offDopo - .3) < 1e-6 && Math.abs(Math.atan2(d2.y, d2.x) - Math.atan2(-Math.cos(.6), -Math.sin(.6))) < 1e-6,
    `la levetta: tenuta, la via resta nel mondo (il ricentro ha girato 0,6 rad); girata di 0,3 rad la base torna di 0,3 (resta ${offDopo.toFixed(2)}); lasciata e ripresa è la camera di adesso`); }
// il ricentro aspetta 1 s nella stessa via: D dopo 1 s di W resta di lato (90°) per tutto il primo secondo
{ const L = corsa({ fps: 30, dopo: true, start: APERTO, yaw: 0, segs: [{ sec: 3, keys: { w: 1 } }, { sec: .9, keys: { d: 1 } }] }), q = L[L.length - 1], B = basis(q.yaw), lato = ang(Math.atan2(q.iy, q.ix) - Math.atan2(B.fz, B.fx)) / D;
  ok(Math.abs(Math.abs(lato) - 90) < 3, `girato un angolo con D (dopo 3 s di W) la camera aspetta: D resta ${lato.toFixed(0)}° sullo schermo (si scansa di lato, la vista ferma)`); }
// il giro col mouse (trascinando) gira la via subito, nello stesso fotogramma
{ const B = C7.comandi8.crea(); C7.comandi8.dir(B, 0, 1, 0, true, 1 / 60); const d = C7.comandi8.dir(B, 0, 1, .25, true, 1 / 60); ok(Math.abs(ang(Math.atan2(d.y, d.x) - Math.atan2(-Math.cos(.25), -Math.sin(.25)))) < 1e-9, 'trascinando la camera con W tenuto la via gira con lei nello stesso fotogramma'); }
// il braccio accorciato (un muro fra te e la camera, la ringhiera della scala): il ricentro non aspetta e gira fino a 150°/s; libero aspetta
{ const prova = muro => { const S = C7.create(), y0 = C7.dietro(1, 0) + 1.2; let r, vmax = 0, prev = null; for (let i = 0; i < 45; i++) { r = C7.passo(S, { px: i * 3.6 / 30, py: 0, fy: 0, vx: 3.6, vy: 0, aspect: 16 / 9, init: { yaw: y0 }, tenuto: i / 30, cast: muro ? () => 2 : () => null }, 1 / 30); S.quiet = 9;
    if (prev !== null) vmax = Math.max(vmax, Math.abs(ang(r.yaw - prev)) * 30); prev = r.yaw; } return { scarto: Math.abs(ang(r.yaw - C7.dietro(1, 0))) / D, vmax: vmax / D }; };
  const a = prova(false), b = prova(true); ok(b.scarto < 15 && b.vmax <= 151 && a.scarto > 40, `col braccio accorciato la camera si gira dietro la marcia in 1,5 s (resta ${b.scarto.toFixed(0)}°, al più ${b.vmax.toFixed(0)}°/s); col braccio libero aspetta la via tenuta (resta ${a.scarto.toFixed(0)}°)`); }
// 3. IL CENTRO: W S A D W di corsa, mezzo secondo l'uno: il personaggio resta vicino al suo posto sullo schermo
{ const dev = dopo => { const L = corsa({ fps: 60, dopo, start: APERTO, yaw: 0, segs: [{ sec: 1, keys: {} }, ...['w', 's', 'a', 'd', 'w'].map(k => ({ sec: .5, keys: { [k]: 1, shift: 1 } })), { sec: .6, keys: {} }] }), r0 = L[55]; let m = 0, mx = 0; L.forEach(q => { m = Math.max(m, Math.hypot((q.sx - r0.sx) * 16 / 9, q.sy - r0.sy)); mx = Math.max(mx, Math.abs(q.sx - r0.sx)); }); return { m, mx }; };
  const a = dev(false), b = dev(true); ok(b.m < .14 && b.mx < .04, `cambi di direzione svelti: il personaggio si sposta sullo schermo al più ${(b.m * 100).toFixed(1)}% dell'altezza, di lato ${(b.mx * 100).toFixed(1)}% della larghezza (prima ${(a.m * 100).toFixed(1)}% e ${(a.mx * 100).toFixed(1)}%)`); }
// 4. LA SCALA DEL MERCATO (Piazza dell'Ottagono → la via di sotto, 14 gradini, il varco di 1,4 m nella ringhiera) coi tasti, giù e su
const GIU = [[1281, 342.4], [1286.6, 342.4], [1288.84, 342.6], [1288.84, 347.42], [1289, 349], [1292, 349.5]], SU = GIU.slice().reverse();
const intoppi = (L, v) => { let ev = 0, run = 0; for (const q of L) { if ((q.ix || q.iy) && q.dsp < v * .3) { run++; if (run === 5) ev++; } else run = 0; } return ev; };
const tratto = (P, dopo, fps, shift) => { const L = corsa({ fps, dopo, start: P[0], verso: P[2], segs: [{ sec: 40, percorso: P, keys: shift ? { shift: 1 } : undefined }] }), fine = P[P.length - 1], k = L.findIndex(q => q.i >= P.length - 3 && Math.hypot(q.x - fine[0], q.y - fine[1]) < 1.2);
  return { s: k > 0 ? k / fps : null, n: intoppi(k > 0 ? L.slice(0, k) : L, shift ? 6.4 : 3.6) }; };
for (const [nome, P] of [['giù', GIU], ['su', SU]]) { const a = tratto(P, false, 30), b = tratto(P, true, 30), c = tratto(P, true, 30, true);
  ok(b.s !== null && b.n === 0 && b.s <= a.s && c.s !== null && c.n === 0, `la Scala del Mercato ${nome} coi tasti: ${b.s && b.s.toFixed(2)} s al passo, ${c.s && c.s.toFixed(2)} s di corsa, intoppi ${b.n + c.n} (prima ${a.s && a.s.toFixed(2)} s, intoppi ${a.n})`); }
// 5. I VICOLI STORTI E LE TESTE DELLE SPALLETTE (coi tasti, di corsa): la bocca di vic_lanternini (prima chiusa dal banco del mercato),
// vic_monache, vic_storto, vic_arco, lo sbocco della Scala del Forno, la cima della Scalinata di Vico Lungo (vic_lungo)
{ const R = id => W.roads.find(r => r.id === id).pts.map(q => [q[0], q[1]]); let n = 0, no = 0, tot = 0; const mal = [];
  for (const id of ['vic_lanternini', 'vic_monache', 'vic_storto', 'vic_arco', 'vic_forno', 'vic_lungo', 'cavour_sotto']) { const r = tratto(R(id), true, 30, true); tot++; n += r.n; if (r.s === null) { no++; mal.push(id); } else if (r.n) mal.push(id + ' ' + r.n); }
  ok(no === 0 && n <= 1, `${tot} vicoli e scalinate coi tasti di corsa: ${tot - no} arrivati, ${n} intoppi${mal.length ? ' (' + mal.join(', ') + ')' : ''} (prima: vic_lanternini non si passava, 1 intoppo in vic_monache e in vic_storto)`); }
// 6. LO SPIGOLO: contro la testa di una barriera di sbieco ci si sposta di lato; contro un muro pieno no (niente scivolate inventate)
{ G.C8.on = true; const bar = W.barriere.find(b => b[4] === 'testata' && Math.abs(b[0] - 1287.8) < .01);   // la testata della Scala del Mercato: il capo in (1287.8, 341.69), la ringhiera giù a nord
  st = G.create(7); p = st.player; st.npcs.forEach(n => { n.x = n.y = -999; }); st.vehicles.forEach(v => { v.x = v.y = -999; v.hidden = true; });
  p.x = 1286.9; p.y = 341.62; p.vx = p.vy = 0; p.stun = 0; for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: 1, y: 0, aim: 0 });   // verso est, dritto contro il capo della ringhiera (y 337.2-341.7)
  const passato = p.x > 1287.9; ok(!!bar && passato, `dritto contro il capo della ringhiera della scala: lo spigolo ti porta nel varco (x ${p.x.toFixed(2)}, y ${p.y.toFixed(2)})`);
  let Wm = null; for (let ty = 130; ty < 170 && !Wm; ty++) for (let tx = 640; tx < 700 && !Wm; tx++) { let k = true; for (let i = -2; i <= 2 && k; i++) k = G.walkT(tx + i, ty) && G.walkT(tx + i, ty + 1) && !G.walkT(tx + i, ty - 1); if (k) Wm = [tx, ty]; }
  if (Wm) { p.x = Wm[0] * TS + 1; p.y = Wm[1] * TS + 1; p.vx = p.vy = 0; const x0 = p.x; for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { x: 0, y: -1, aim: -Math.PI / 2 }); ok(Math.abs(p.x - x0) < .05, `dritto contro un muro pieno largo 5 caselle niente scivolata di lato (${(p.x - x0).toFixed(3)} m)`); } }
// 7. IL SALTO PREMUTO POCO PRIMA DI ATTERRARE parte all'atterraggio; molto prima no
{ const salti = anticipo => { G.C8.on = true; st = G.create(7); p = st.player; p.x = APERTO[0]; p.y = APERTO[1]; p.stun = 0; p.jz = 0; p.jvz = 0; G.jumpHold(st, true); G.jumpHold(st, false); let n = 1, prem = false;
    for (let i = 0; i < 120; i++) { const tAtt = (p.jvz + Math.sqrt(p.jvz * p.jvz + 2 * 18 * p.jz)) / 18; if (!prem && p.jz > 0 && p.jvz < 0 && tAtt <= anticipo) { G.jumpHold(st, true); G.jumpHold(st, false); prem = true; } const j0 = p.jumpT; G.step(st, 1 / 60, { x: 0, y: 0 }); if (p.jumpT !== j0) n++; if (i > 70) break; } return n; };
  ok(salti(.1) === 2 && salti(.4) === 1, `lo Spazio premuto 0,1 s prima di atterrare salta all'atterraggio (${salti(.1)} salti); 0,4 s prima no (${salti(.4)})`); }
// 8. IL BANCO DEL MERCATO non chiude la bocca di vic_lanternini (prima due banchi lasciavano solo un passaggio d'angolo)
{ G.C8.on = true; let libera = true; for (let y = 301.5; y <= 306.5; y += .5) { let riga = false; for (let x = 1369; x <= 1378; x += .25) if (G.posto8(x, y, .3)) { riga = true; break; } if (!riga) libera = false; }
  const banchi = G.layout().items.filter(i => i.kind === 'banco' || i.type === 'banco').length; ok(libera && banchi >= 2, `la bocca di vic_lanternini sulla piazza San Rocco è aperta (i banchi del mercato ci sono ancora: ${banchi})`); }
// 8b. LA QUOTA LUNGO LE SCALE DEI GRADONI (dall'attacco in basso, su per i gradini, fino al varco in cima e fuori sulla piazza, ogni cm, e
// 30 cm di qua e di là della linea): nessuna fessura senza quota fra due piani rialzati (prima fra la copertina e la scala restavano 4 cm
// senza quota: passando il varco della Scala del Mercato il corpo cadeva per un fotogramma sul terreno, 2,2 m sotto)
{ let fessure = 0, dove = null; for (const s of W.passaggi.filter(q => q.salita)) { const P = s.pts;
    for (const off of [-.3, -.15, 0, .15, .3]) for (let k = 1; k < P.length; k++) { const [ax, ay] = P[k - 1], [bx, by] = P[k], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1); let su = false, buco = 0;
      for (let t = 0; t <= L; t += .01) { const x = ax + (bx - ax) * t / L + nx * off, y = ay + (by - ay) * t / L + ny * off; if (!G.posto8(x, y, .22)) { su = false; buco = 0; continue; } const q = G.quotaSuolo(x, y, -50) !== null;
        if (q) { if (su && buco > 0 && buco < 20) { fessure++; dove = [+x.toFixed(2), +y.toFixed(2), s.id]; } su = true; buco = 0; } else if (su) buco++; } } }
  ok(fessure === 0, `le tre scale del Mercato, dal basso al varco in cima: ${fessure} fessure senza quota fra i piani rialzati${dove ? ' (' + JSON.stringify(dove) + ')' : ''}`); }
// 9. ?nofixcontrolli8: i numeri di camera7 (20 m/s², 1,6 rad/s… il dietrofront di prima)
{ const a = AV(60, false); ok(a.prima === 3 && a.v90 === 10 && C7.C8 && G.C8, `?nofixcontrolli8 torna al passo di camera7 (prima mossa ${a.prima} fotogrammi, 90% in ${a.v90})`); G.C8.on = true; C7.C8.on = true; }
console.log(fail ? `\n${fail} NO` : '\ntutto ok'); process.exit(fail ? 1 : 0);
