// [camera9] LA SCANSIONE DI TUTTI I VICOLI IN NODE (senza pagina: la macchina condivisa uccideva le pagine per la memoria). Il mondo vero
// (world_cittanuova + game, come test_controlli8.js), la camera vera (camera7.js passo e passo9), il raggio del braccio contro la MAPPA
// DELLE CASE (Visuale.mappa: le case al colmo; è il ripiego di render.js cast7v quando le mesh non ci sono: niente
// tende, balconi, archi piccoli, arredo). Ogni 3 m lungo ogni vicolo (le vie con larghezza ≤ 3,6 m e i vic_*), nei due versi, il
// personaggio fermo e rivolto lungo la via, la camera dietro: 1,5 s di passi a 30 fps. Misura il braccio, la pendenza della vista, quanto
// del terzo alto del quadro vede oltre 60 m o il cielo, se il busto si vede dalla camera.
//   node scansione9_node.js → ../scansione9.json (tutti i punti), ../posti_stretti.json (i peggiori per camera9), riassunto a schermo
const path = require('path'), fs = require('fs'), src = path.resolve(__dirname, '../../../src'), OUT = path.resolve(__dirname, '..');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const C = require(path.join(src, 'camera7.js')), Visuale = require(path.join(src, 'visuale.js'));
console.log = log; console.warn = warn;
const G = Game, W = G.MAP.world, TS = G.TS, D = Math.PI / 180, M = Visuale.mappa(W);
const VW = W.GW + 1, suolo = (x, y) => { let g = 0; if (W.velev) { const fx = x / TS, fy = y / TS, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, e = (a, b) => W.velev[b * VW + a] || 0; g = e(i, j) * (1 - u) * (1 - v) + e(i + 1, j) * u * (1 - v) + e(i, j + 1) * (1 - u) * v + e(i + 1, j + 1) * u * v; } const q = G.quotaSuolo(x, y, g); return q !== null ? q : g; };
// il raggio a sfera contro la mappa delle case (come cast7v senza mesh; le volte dei sottopassi no)
function cast(o, d, len, r) { for (let s = .3; s <= len; s += .2) { const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s; if (M.alto(x, z) > y - r) return Math.max(0, s - r); } return null; }
// quanto del terzo alto del quadro vede lontano (oltre 60 m o il cielo), e il quadro intero
function sfondo(r) { const A = r.aim || r.look, f = [A.x - r.pos.x, A.y - r.pos.y, A.z - r.pos.z], fl = Math.hypot(...f), F = f.map(a => a / fl), Rr = [-F[2], 0, F[0]], rl = Math.hypot(...Rr), R = Rr.map(a => a / rl);
  const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]], tv = Math.tan(r.fov * D / 2), th = tv * 16 / 9; let far = 0, n = 0, alto = 0, altoN = 0;
  for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) { const sx = ((i + .5) / 16 * 2 - 1) * th, sy = (1 - (j + .5) / 9 * 2) * tv, d = [F[0] + R[0] * sx + U[0] * sy, F[1] + R[1] * sx + U[1] * sy, F[2] + R[2] * sx + U[2] * sy], dl = Math.hypot(...d);
    let s = .5, hit = null; while (s < 250) { const x = r.pos.x + d[0] / dl * s, y = r.pos.y + d[1] / dl * s, z = r.pos.z + d[2] / dl * s; if (M.alto(x, z) > y || suolo(x, z) > y) { hit = s; break; } s += s < 20 ? .4 : s < 80 ? 1.2 : 3; if (y > 60 && d[1] > 0) break; }
    const l = hit === null || hit > 60; n++; if (l) far++; if (j < 3) { altoN++; if (l) alto++; } }
  return { sfondo: far / n, sfondoAlto: alto / altoN }; }
const vista = r => { const A = r.aim || r.look, dx = A.x - r.pos.x, dy = A.y - r.pos.y, dz = A.z - r.pos.z; return -Math.atan2(dy, Math.hypot(dx, dz)); };
function inquadra(f, x, y, h) {   // il personaggio fermo in (x, y) rivolto a h; la camera dietro; 1,5 s
  const S = C.create(), fy = suolo(x, y), yaw = C.dietro(Math.cos(h), Math.sin(h)); let r;
  for (let i = 0; i < 45; i++) r = f(S, { px: x, py: y, fy, vx: 0, vy: 0, aspect: 16 / 9, init: { yaw }, cast, suolo }, 1 / 30);
  const ch = { x, y: fy + 1.2, z: y }, dv = { x: ch.x - r.pos.x, y: ch.y - r.pos.y, z: ch.z - r.pos.z }, L = Math.hypot(dv.x, dv.y, dv.z), hc = cast(r.pos, { x: dv.x / L, y: dv.y / L, z: dv.z / L }, L, .02);
  return Object.assign({ arm: +r.arm.toFixed(2), vista: +(vista(r) / D).toFixed(1), lift: +((S.lift ? S.lift.x : 0) / D).toFixed(1), side: r.side9 !== undefined ? +r.side9.toFixed(2) : null, coperto: hc !== null && hc < L - .4 }, Object.fromEntries(Object.entries(sfondo(r)).map(([k, v]) => [k, +v.toFixed(3)])));
}
const VIE = W.roads.filter(r => r.pts && r.pts.length > 1 && !/^vialetto/.test(r.id || '') && (r.w <= 3.6 || /^vic_/.test(r.id || '')));   // i vialetti privati delle case no
const P = [];
for (const rd of VIE) { const Q = rd.pts; let acc = 3;
  for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-6) continue;
    for (let t = 0; t < L; t += .5) { acc += .5; if (acc < 3) continue; acc = 0; const x = a[0] + (b[0] - a[0]) * t / L, y = a[1] + (b[1] - a[1]) * t / L, h = Math.atan2(b[1] - a[1], b[0] - a[0]);
      if (!G.walkM(x, y)) continue;
      for (const v of [0, Math.PI]) { const hh = h + v, o = inquadra(C.passo, x, y, hh), c = inquadra(C.passo9, x, y, hh);
        P.push({ id: rd.id, nome: rd.name || '', w: rd.w, x: +x.toFixed(1), y: +y.toFixed(1), verso: [+(x + Math.cos(hh) * 6).toFixed(1), +(y + Math.sin(hh) * 6).toFixed(1)], oggi: o, c9: c }); } } } }
// il voto del quadro di camera9: il braccio lungo, la vista bassa, lo sfondo in alto, il busto in vista
for (const p of P) { const c = p.c9; p.voto = +((Math.min(c.arm, 7.5) / 7.5) * 2 + Math.max(0, 1 - Math.max(0, c.vista - 15) / 20) * 2 + c.sfondoAlto * 2 + (c.coperto ? -2 : 0)).toFixed(2); }
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.round(p * (b.length - 1)))]; };
const riass = m => { const A = P.map(p => p[m]); return { punti: A.length, vista: [q(A.map(a => a.vista), .1), q(A.map(a => a.vista), .5), q(A.map(a => a.vista), .9)], braccio: [q(A.map(a => a.arm), .1), q(A.map(a => a.arm), .5)],
  braccioSotto3: +(100 * A.filter(a => a.arm < 3).length / A.length).toFixed(1), vistaOltre30: +(100 * A.filter(a => a.vista > 30).length / A.length).toFixed(1), salita: +(100 * A.filter(a => a.lift > .5).length / A.length).toFixed(1),
  sfondoAlto0: +(100 * A.filter(a => a.sfondoAlto === 0).length / A.length).toFixed(1), sfondoAltoMed: q(A.map(a => a.sfondoAlto), .5), coperto: +(100 * A.filter(a => a.coperto).length / A.length).toFixed(1) }; };
const R = { oggi: riass('oggi'), c9: riass('c9') };
// i peggiori per camera9: uno per via, a più di 12 m l'uno dall'altro
const ord = P.slice().sort((a, b) => a.voto - b.voto), peg = [];
for (const p of ord) { if (peg.length >= 12) break; if (peg.some(s => s.id === p.id || Math.hypot(s.x - p.x, s.y - p.y) < 12)) continue; peg.push(p); }
// per via: la media del voto e la parte dei punti brutti (voto < 3)
const perVia = {}; for (const p of P) { const v = perVia[p.id] || (perVia[p.id] = { id: p.id, nome: p.nome, w: p.w, n: 0, brutti: 0, voto: 0, braccio: 0 }); v.n++; v.voto += p.voto; v.braccio += p.c9.arm; if (p.voto < 3) v.brutti++; }
const vie = Object.values(perVia).map(v => ({ id: v.id, nome: v.nome, w: v.w, punti: v.n, voto: +(v.voto / v.n).toFixed(2), braccio: +(v.braccio / v.n).toFixed(1), brutti: +(100 * v.brutti / v.n).toFixed(0) })).sort((a, b) => a.voto - b.voto);
fs.writeFileSync(path.join(OUT, 'scansione9.json'), JSON.stringify({ quando: new Date().toISOString(), cast: 'mappa delle case (Visuale.mappa), senza mesh', riassunto: R, vie, punti: P }));
fs.writeFileSync(path.join(OUT, 'posti_stretti.json'), JSON.stringify(peg, null, 1));
console.log(JSON.stringify(R, null, 1)); console.log(vie.slice(0, 15)); console.log(peg.map(p => `${p.id} ${p.nome} (${p.x}, ${p.y}) → ${p.verso} voto ${p.voto} c9 ${JSON.stringify(p.c9)}`).join('\n'));
