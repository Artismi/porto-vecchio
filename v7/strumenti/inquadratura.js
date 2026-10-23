// [inquadratura] LA MISURA DEL QUADRO: quanta parte dello schermo è tetto e quanta è strada, facciate, personaggio, lungo i percorsi
// principali della città nuova (Percorsi.dati.percorsi e le scorciatoie) e nei dodici luoghi (W.luoghi), con la camera vera del gioco
// (render.js: fov 30°, la distanza dall'inquadratura VIEW 44 × zoom, la pendenza) e con le varianti da confrontare.
//   node strumenti/inquadratura.js [uscita.json] [--varianti=oggi,asse,...] [--passo=3] [--foto=cartella]   (dalla cartella v7)
// Il quadro è una griglia di raggi (64 × 36 sul computer, 30 × 64 sul telefono in verticale) dalla camera nella città in pianta: le case
// come un campo d'altezze (i muri fino alla gronda, sopra il tetto a capanna sul lato lungo o il lastrico; Visuale.mappa per gronda e
// colmo), il suolo con la sua quota, le volte (portici, archi, sottopassi) come scatole, il personaggio come un cilindro di 0,3 × 1,8 m.
// Ogni raggio prende la classe della prima cosa che tocca: tetto (sopra la gronda), facciata, strada (il suolo che non è acqua), acqua,
// volta, copertina (la faccia di una casa tagliata o del tetto sbiadito), personaggio, cielo. In più due misure dirette:
//   - intorno: la parte del suolo libero entro 7 m dal personaggio che si vede dalla camera (la via attorno a lui si legge?);
//   - corpo: la parte dei nove punti del corpo (piedi, busto, testa × tre) che si vede (senza la sagoma).
// Le varianti (Inquadratura.VARIANTI, src/inquadratura.js) simulano la camera camminando lungo il percorso (con le isteresi vere).
// Esce: il riassunto per percorso e variante, i punti peggiori (≥ 25 m l'uno dall'altro) e, con --foto, le immagini a classi dei punti
// peggiori (PNG) e la pianta dei punti; i fogli li compone strumenti/fogli_inquadratura.py.
const path = require('path'), fs = require('fs'), zlib = require('zlib'), src = path.join(__dirname, '..', 'src');
const log = console.log; console.log = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
global.Percorsi = require(path.join(src, 'percorsi.js'));
console.log = log;
const V = require(path.join(src, 'visuale.js')), IQ = require(path.join(src, 'inquadratura.js'));
const W = World, TS = W.TS || 2, GW = W.GW, GH = W.GH, T = W.T, BI = W.bIndex, B = W.BUILDINGS, EL = W.elev, grid = W.grid;
const M = V.mappa(W), RETE = IQ.rete(W);
const YAW = Math.PI / 4, PITCH = .78, VIEW = 44, ZOOM = .72, TAN15 = Math.tan(15 * Math.PI / 180);
const args = process.argv.slice(2), opt = k => { const a = args.find(s => s.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const OUT = args.find(s => !s.startsWith('--')), PASSO = +(opt('passo') || 3), FOTO = opt('foto');
const VAR = (opt('varianti') || Object.keys(IQ.VARIANTI).join(',')).split(',');

// ---------------- LA CITTÀ COME CAMPO D'ALTEZZE ----------------
const CASA = B.map((b, i) => { const gr = M.gronda(b), co = M.colmo(b), x0 = b.x * TS, z0 = b.y * TS, x1 = (b.x + b.w) * TS, z1 = (b.y + b.h) * TS;
  const capanna = (b.era === 'E0' || b.era === 'E3') && !b.torre && !b.annesso, lungoX = x1 - x0 >= z1 - z0;
  return { i, b, gr, co, x0, z0, x1, z1, capanna, lungoX, base: b.base || 0 }; });
const tile = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? -1 : ty * GW + tx; };
const suolo = (x, z) => { const k = tile(x, z); return k < 0 ? 0 : EL[k]; };
// l'altezza del pieno della casa c nel punto; tagli: Map(i -> quota) delle case tagliate (o col tetto sbiadito: la quota è la gronda)
function altoCasa(c, x, z) {
  if (!c.capanna) return c.gr + .35;
  const m = c.lungoX ? Math.abs(z - (c.z0 + c.z1) / 2) / ((c.z1 - c.z0) / 2) : Math.abs(x - (c.x0 + c.x1) / 2) / ((c.x1 - c.x0) / 2);
  return c.gr + (c.co - c.gr) * Math.max(0, 1 - m);
}
// la cosa nel punto: { h, k: 'casa' | 'suolo' | 'acqua', c, cut }
function pieno(x, z, tagli) {
  const k = tile(x, z); if (k < 0) return { h: -50, k: 'fuori' };
  if (grid[k] === T.BLD) { const bi = BI ? BI[k] : -1, c = bi >= 0 ? CASA[bi] : null;
    if (!c) return { h: EL[k] + 6, k: 'casa', c: null };
    const h = altoCasa(c, x, z), t = tagli && tagli.has(c.i) ? tagli.get(c.i) : null;
    return t !== null && t < h ? { h: t, k: 'casa', c, cut: true } : { h, k: 'casa', c }; }
  return { h: EL[k], k: grid[k] === T.WATER ? 'acqua' : 'suolo' };
}
const VOLTE = M.V.map(v => { const c = Math.cos(v.p.rot || 0), s = Math.sin(v.p.rot || 0), P = [[v.x0, v.z0], [v.x1, v.z0], [v.x0, v.z1], [v.x1, v.z1]].map(([l, m]) => [v.p.x + l * c + m * s, v.p.y - l * s + m * c]);
  return { min: { x: Math.min(...P.map(q => q[0])), y: v.y0, z: Math.min(...P.map(q => q[1])) }, max: { x: Math.max(...P.map(q => q[0])), y: v.y0 + 1.2, z: Math.max(...P.map(q => q[1])) } }; });
function scatola(o, d, b) { let t0 = 0, t1 = Infinity;
  for (const k of ['x', 'y', 'z']) { const lo = b.min[k], hi = b.max[k];
    if (Math.abs(d[k]) < 1e-9) { if (o[k] < lo || o[k] > hi) return null; continue; }
    let a = (lo - o[k]) / d[k], c = (hi - o[k]) / d[k]; if (a > c) { const q = a; a = c; c = q; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) return null; }
  return t0; }
// la prima cosa che il raggio tocca. o: origine, d: direzione unitaria; P: il personaggio { x, z, fy } (null: niente cilindro)
const ALTO = 34;
function raggio(o, d, tagli, P, volte, tMax) {
  tMax = tMax || 260; let t = 0;
  if (o.y > ALTO) { if (d.y >= 0) return { k: 'cielo', t: Infinity }; t = (o.y - ALTO) / -d.y; }
  let tp = Infinity; if (P) { const ox = o.x - P.x, oz = o.z - P.z, a = d.x * d.x + d.z * d.z, b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - .09, D = b * b - 4 * a * c;
    if (D >= 0 && a > 1e-9) { const t0 = (-b - Math.sqrt(D)) / (2 * a), y = o.y + d.y * t0; if (t0 > 0 && y >= P.fy && y <= P.fy + 1.8) tp = t0; } }
  let tv = Infinity; for (const v of volte || []) { const q = scatola(o, d, v); if (q !== null && q < tv) tv = q; }
  const st = .22; let prev = t;
  for (; t < tMax; t += st) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < -8) break;
    const q = pieno(x, z, tagli); if (y > q.h) { prev = t; continue; }
    let a = prev, b = t; for (let k = 0; k < 6; k++) { const m = (a + b) / 2, qm = pieno(o.x + d.x * m, o.z + d.z * m, tagli); if (o.y + d.y * m > qm.h) a = m; else b = m; }
    const th = b, hx = o.x + d.x * th, hy = o.y + d.y * th, hz = o.z + d.z * th, qh = pieno(hx, hz, tagli);
    if (tp < th || tv < th) return tp < tv ? { k: 'personaggio', t: tp } : { k: 'volta', t: tv };
    let k = qh.k === 'casa' ? 'facciata' : qh.k === 'acqua' ? 'acqua' : 'strada';
    if (qh.k === 'casa') { const top = qh.h; if (hy >= top - .18) k = qh.cut ? 'copertina' : (qh.c && hy < qh.c.gr - .15 ? 'facciata' : 'tetto'); }
    return { k, t: th, x: hx, y: hy, z: hz, c: qh.c };
  }
  if (tp < Infinity || tv < Infinity) return tp < tv ? { k: 'personaggio', t: tp } : { k: 'volta', t: tv };
  return { k: 'cielo', t: Infinity };
}
// è libero il segmento dal punto p alla camera?
function libero(p, cam, tagli, volte) { const dx = cam.x - p.x, dy = cam.y - p.y, dz = cam.z - p.z, l = Math.hypot(dx, dy, dz), d = { x: dx / l, y: dy / l, z: dz / l };
  const o = { x: p.x + d.x * .25, y: p.y + d.y * .25, z: p.z + d.z * .25 };
  for (const v of volte || []) { const q = scatola(o, d, v); if (q !== null && q < l) return false; }
  for (let t = 0; t < l; t += .22) { const y = o.y + d.y * t; if (y > ALTO) return true; if (y <= pieno(o.x + d.x * t, o.z + d.z * t, tagli).h) return false; }
  return true; }

// ---------------- LA CAMERA DEL GIOCO ----------------
// q: { x, z, fy, yaw, pitch, zoom (lo zoom del giocatore), z4 (lo zoom della stretta), tel (telefono in verticale) }
function camera(q) {
  const viewH = VIEW * (q.zoom || ZOOM) * (q.z4 || 1) * (q.tel ? .78 : 1), dist = viewH / 2 / TAN15, cp = Math.cos(q.pitch);
  const tg = { x: q.x, y: q.fy, z: q.z }, pos = { x: q.x + Math.sin(q.yaw) * cp * dist, y: q.fy + Math.sin(q.pitch) * dist, z: q.z + Math.cos(q.yaw) * cp * dist };
  const f = norm({ x: tg.x - pos.x, y: tg.y - pos.y, z: tg.z - pos.z }), r = norm({ x: -f.z, y: 0, z: f.x }), u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  return { pos, f, r, u: u.y < 0 ? { x: -u.x, y: -u.y, z: -u.z } : u, asp: q.tel ? 390 / 844 : 16 / 9, dist };
}
function norm(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }
const CLASSI = ['tetto', 'facciata', 'strada', 'acqua', 'volta', 'copertina', 'personaggio', 'cielo'];
const COLORI = { tetto: [196, 72, 48], facciata: [226, 205, 160], strada: [70, 150, 220], acqua: [40, 70, 120], volta: [120, 90, 160], copertina: [120, 96, 80], personaggio: [255, 210, 0], cielo: [235, 240, 245] };
// il quadro: la griglia di raggi; nx × ny; img: anche l'immagine a classi
function quadro(q, tagli, nx, ny, img) {
  const C = camera(q), P = { x: q.x, z: q.z, fy: q.fy }, volte = VOLTE.filter(v => v.max.x > q.x - 70 && v.min.x < q.x + 70 && v.max.z > q.z - 70 && v.min.z < q.z + 70);
  nx = nx || (q.tel ? 30 : 64); ny = ny || (q.tel ? 64 : 36);
  const n = {}; CLASSI.forEach(k => n[k] = 0); const pix = img ? new Uint8Array(nx * ny) : null;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const sx = ((i + .5) / nx * 2 - 1) * TAN15 * C.asp, sy = (1 - (j + .5) / ny * 2) * TAN15;
    const d = norm({ x: C.f.x + C.r.x * sx + C.u.x * sy, y: C.f.y + C.r.y * sx + C.u.y * sy, z: C.f.z + C.r.z * sx + C.u.z * sy });
    const h = raggio(C.pos, d, tagli, P, volte); n[h.k]++; if (pix) pix[j * nx + i] = CLASSI.indexOf(h.k); }
  const N = nx * ny, fr = {}; CLASSI.forEach(k => fr[k] = n[k] / N);
  // la via attorno: il suolo libero entro 7 m (un punto ogni metro)
  let tot = 0, vis = 0; for (let a = -7; a <= 7; a++) for (let b = -7; b <= 7; b++) { if (a * a + b * b > 49) continue; const x = q.x + a, z = q.z + b, p = pieno(x, z, null); if (p.k !== 'suolo' || Math.abs(p.h - q.fy) > 1.6) continue;
    tot++; if (libero({ x, y: p.h + .05, z }, C.pos, tagli, volte)) vis++; }
  let cv = 0; for (const h of [.2, .95, 1.65]) for (const l of [-.22, 0, .22]) if (libero({ x: q.x + C.r.x * l, y: q.fy + h, z: q.z + C.r.z * l }, C.pos, tagli, volte)) cv++;
  return { fr, intorno: tot ? vis / tot : 1, corpo: cv / 9, pix, nx, ny, cam: C };
}

// ---------------- LE VARIANTI SIMULATE CAMMINANDO ----------------
// lo stato di una camera per variante: IQ.passoCamera fa le regole (in src/inquadratura.js, le stesse del gioco)
const caseVicine = (x, z, R) => CASA.filter(c => c.x1 > x - R && c.x0 < x + R && c.z1 > z - R && c.z0 < z + R && !c.b.pezzo);
const BOX = CASA.map(c => ({ c, box3: { min: { x: c.x0, y: c.base, z: c.z0 }, max: { x: c.x1, y: c.gr + 2.5, z: c.z1 } }, geo: { y0: c.base }, b: c.b, i: c.i, gr: c.gr }));
const boxVicine = (x, z, R) => BOX.filter(o => o.c.x1 > x - R && o.c.x0 < x + R && o.c.z1 > z - R && o.c.z0 < z + R && !o.c.b.pezzo);
function simula(nome, campioni, tel, mappa) {   // mappa: un altro Visuale.mappa (gli strumenti che contano i passi)
  const K = IQ.VARIANTI[nome], S = {}, out = [], dt = PASSO / 1.4;
  campioni.forEach((s, idx) => {
    const fy = suolo(s.x, s.z), dir = s.dir;   // dir: la direzione di marcia in pianta (atan2(dz, dx))
    const r = IQ.passo(S, { x: s.x, z: s.z, fy, dir, vel: 1.4, tel, yaw0: YAW, base: PITCH, rete: RETE, mappa: mappa || M, V, v: K,
      dist: VIEW * ZOOM * (tel ? .78 : 1) / 2 / TAN15, vicine: R => boxVicine(s.x, s.z, R) }, idx === 0 ? 10 : dt);
    const q = { x: s.x, z: s.z, fy, yaw: r.yaw, pitch: r.pitch, z4: r.zoom, tel }, tagli = new Map(); r.tagli.forEach((y, o) => tagli.set(o.i, y));
    const m = quadro(q, tagli);
    const a = RETE.asse(s.x, s.z); out.push({ vic: !!(a && a.w <= 3.6), x: s.x, z: s.z, fy, yaw: r.yaw, pitch: r.pitch, z4: r.zoom, tagli: [...tagli], fr: m.fr, intorno: m.intorno, corpo: m.corpo, largo: r.largo });
  });
  return out;
}

// ---------------- I CAMPIONI: i percorsi e i luoghi ----------------
const D = Percorsi.dati;
const PERC = D.percorsi.map(p => ({ id: p.id, nome: p.nome || p.id, k: p.k, pts: p.pts })).concat(D.scorciatoie.filter(s => s.k === 'scorciatoia').map(s => ({ id: s.vic, nome: s.nome || s.vic, k: 'scorciatoia', pts: s.pts })));
function campiona(P) { const out = []; let acc = 0;
  for (let k = 1; k < P.length; k++) { const [ax, az] = P[k - 1], [bx, bz] = P[k], l = Math.hypot(bx - ax, bz - az); if (l < 1e-6) continue; const dir = Math.atan2(bz - az, bx - ax);
    for (; acc < l; acc += PASSO) { const x = ax + (bx - ax) * acc / l, z = az + (bz - az) * acc / l, kk = tile(x, z); if (kk >= 0 && grid[kk] !== T.BLD && grid[kk] !== T.WATER) out.push({ x, z, dir }); }
    acc -= l; }
  return out; }
// i luoghi: il punto e quattro attorno a 4 m (chi arriva da ogni lato)
const LUOGHI = (W.luoghi || []).map(L => ({ id: L.id, nome: L.nome, pts: [[0, 0], [4, 0], [0, 4], [-4, 0], [0, -4]].map(([a, b]) => ({ x: L.x + a, z: L.y + b, dir: Math.atan2(-b || -1, -a || -1) })).filter(s => { const k = tile(s.x, s.z); return k >= 0 && grid[k] !== T.BLD; }) }));

// ---------------- IL GIRO ----------------
if (require.main === module) {
  const t0 = Date.now(), RIS = {}, TUTTI = [];
  for (const tel of [false, true]) for (const v of VAR) {
    const fmt = tel ? 'tel' : 'pc', key = v + '/' + fmt; RIS[key] = { percorsi: [], luoghi: [] };
    PERC.forEach(p => { const C = campiona(p.pts); if (C.length < 3) return; const R = simula(v, C, tel);
      R.forEach(r => TUTTI.push(Object.assign({ v, fmt, perc: p.nome, pk: p.k }, r)));
      const med = k => R.reduce((a, r) => a + (k === 'intorno' || k === 'corpo' ? r[k] : r.fr[k]), 0) / R.length;
      RIS[key].percorsi.push({ id: p.id, nome: p.nome, k: p.k, n: R.length, tetto: med('tetto'), strada: med('strada'), facciata: med('facciata'), copertina: med('copertina'), intorno: med('intorno'), corpo: med('corpo'),
        cattivi: R.filter(r => r.fr.tetto > .5 || r.intorno < .5).length / R.length }); });
    LUOGHI.forEach(L => { const R = simula(v, L.pts, tel); R.forEach(r => TUTTI.push(Object.assign({ v, fmt, perc: 'luogo: ' + L.nome, pk: 'luogo' }, r)));
      const med = k => R.reduce((a, r) => a + (k === 'intorno' || k === 'corpo' ? r[k] : r.fr[k]), 0) / R.length;
      RIS[key].luoghi.push({ id: L.id, nome: L.nome, tetto: med('tetto'), strada: med('strada'), intorno: med('intorno'), corpo: med('corpo') }); });
  }
  const pc = v => (v * 100).toFixed(0).padStart(3) + '%';
  const somma = L => { const n = L.reduce((a, r) => a + r.n, 0), m = k => L.reduce((a, r) => a + r[k] * r.n, 0) / n; return { n, tetto: m('tetto'), strada: m('strada'), facciata: m('facciata'), copertina: m('copertina'), intorno: m('intorno'), corpo: m('corpo'), cattivi: m('cattivi') }; };
  console.log('variante/formato'.padEnd(18), ' tetto strada facc. copert. intorno corpo  cattivi   (media sui percorsi; cattivi: tetto > 50% o via attorno < 50%)');
  const SOM = {}; Object.entries(RIS).forEach(([k, r]) => { const s = SOM[k] = somma(r.percorsi); console.log(k.padEnd(18), pc(s.tetto), '  ', pc(s.strada), pc(s.facciata), '  ', pc(s.copertina), '  ', pc(s.intorno), pc(s.corpo), '  ', pc(s.cattivi)); });
  console.log('\nNEI VICOLI (le vie fino a 3,6 m):', 'tetto strada intorno corpo  strada<25%  via attorno<50%');
  Object.keys(RIS).forEach(k => { const [v, fmt] = k.split('/'), L = TUTTI.filter(r => r.v === v && r.fmt === fmt && r.vic), m = f => L.reduce((a, r) => a + f(r), 0) / L.length;
    SOM[k].vicoli = { n: L.length, tetto: m(r => r.fr.tetto), strada: m(r => r.fr.strada), intorno: m(r => r.intorno), corpo: m(r => r.corpo), poca: m(r => r.fr.strada < .25 ? 1 : 0), cieca: m(r => r.intorno < .5 ? 1 : 0) };
    const s = SOM[k].vicoli; console.log('  ' + k.padEnd(22), pc(s.tetto), pc(s.strada), pc(s.intorno), pc(s.corpo), '   ', pc(s.poca), '      ', pc(s.cieca)); });
  // i punti peggiori della camera di oggi (sul computer): i più coperti di tetti con la via attorno poco leggibile, ≥ 25 m l'uno dall'altro
  const peggiori = (v, fmt, n) => { const L = TUTTI.filter(r => r.v === v && r.fmt === fmt).map(r => Object.assign({ male: r.fr.tetto + (1 - r.intorno) * .6 - r.fr.strada }, r)).sort((a, b) => b.male - a.male), out = [];
    for (const r of L) { if (out.length >= n) break; if (out.some(o => Math.hypot(o.x - r.x, o.z - r.z) < 25)) continue; out.push(r); } return out; };
  const base = VAR[0], P0 = peggiori(base, 'pc', 12), P1 = peggiori(base, 'tel', 12);
  console.log(`\nI PUNTI PEGGIORI (${base}, computer):`); P0.forEach(r => console.log(`  ${r.perc.slice(0, 30).padEnd(30)} ${r.x.toFixed(0)},${r.z.toFixed(0)}  tetto ${pc(r.fr.tetto)} strada ${pc(r.fr.strada)} via attorno ${pc(r.intorno)} corpo ${pc(r.corpo)}`));
  console.log(`\nI PUNTI PEGGIORI (${base}, telefono):`); P1.forEach(r => console.log(`  ${r.perc.slice(0, 30).padEnd(30)} ${r.x.toFixed(0)},${r.z.toFixed(0)}  tetto ${pc(r.fr.tetto)} strada ${pc(r.fr.strada)} via attorno ${pc(r.intorno)} corpo ${pc(r.corpo)}`));
  // nei punti peggiori, le varianti (lo stesso punto, lo stato della simulazione lungo il percorso)
  const conf = (P, fmt) => P.map(r => ({ perc: r.perc, x: r.x, z: r.z, fy: r.fy, dir: null, varianti: Object.fromEntries(VAR.map(v => { const q = TUTTI.find(o => o.v === v && o.fmt === fmt && o.perc === r.perc && o.x === r.x && o.z === r.z); return [v, q ? { tetto: q.fr.tetto, strada: q.fr.strada, facciata: q.fr.facciata, copertina: q.fr.copertina, intorno: q.intorno, corpo: q.corpo, yaw: q.yaw, pitch: q.pitch, z4: q.z4, tagli: q.tagli } : null]; })) }));
  const CP = conf(P0, 'pc'), CT = conf(P1, 'tel');
  console.log('\nnei punti peggiori (computer), media:'); VAR.forEach(v => { const L = CP.map(p => p.varianti[v]).filter(Boolean), m = k => L.reduce((a, q) => a + q[k], 0) / L.length; console.log(`  ${v.padEnd(14)} tetto ${pc(m('tetto'))} strada ${pc(m('strada'))} via attorno ${pc(m('intorno'))} corpo ${pc(m('corpo'))}`); });
  console.log('nei punti peggiori (telefono), media:'); VAR.forEach(v => { const L = CT.map(p => p.varianti[v]).filter(Boolean), m = k => L.reduce((a, q) => a + q[k], 0) / L.length; console.log(`  ${v.padEnd(14)} tetto ${pc(m('tetto'))} strada ${pc(m('strada'))} via attorno ${pc(m('intorno'))} corpo ${pc(m('corpo'))}`); });
  if (FOTO) {   // le immagini a classi dei punti peggiori, per variante, e la pianta
    fs.mkdirSync(FOTO, { recursive: true });
    [[CP, 'pc'], [CT, 'tel']].forEach(([L, fmt]) => L.forEach((p, n) => VAR.forEach(v => { const q = p.varianti[v]; if (!q) return; const tg = new Map(q.tagli);
      const m = quadro({ x: p.x, z: p.z, fy: p.fy, yaw: q.yaw, pitch: q.pitch, z4: q.z4, tel: fmt === 'tel' }, tg, fmt === 'tel' ? 180 : 320, fmt === 'tel' ? 390 : 180, true);
      png(path.join(FOTO, `${fmt}_${String(n + 1).padStart(2, '0')}_${v}.png`), m.nx, m.ny, i => COLORI[CLASSI[m.pix[i]]]); })));
    pianta(path.join(FOTO, 'pianta.png'), TUTTI.filter(r => r.v === base && r.fmt === 'pc'), P0);
  }
  if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify({ quando: new Date().toISOString(), passo: PASSO, varianti: VAR, manopole: IQ.VARIANTI, somme: SOM, per: RIS, peggioriPC: CP, peggioriTel: CT }, null, 1)); console.log('\nscritto', OUT); }
  console.log('in', ((Date.now() - t0) / 1000).toFixed(0), 's');
}

// ---------------- LE IMMAGINI ----------------
function png(file, w, h, col) {
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const c = col(y * w + x); raw.set(c, y * (w * 3 + 1) + 1 + x * 3); } }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
// la pianta della città compatta: le case grigie, i campioni colorati dal verde (bene) al rosso (solo tetti), i punti peggiori cerchiati
function pianta(file, R, P) {
  const x0 = 1240, z0 = 250, w = 400, h = 210, s = 3, Wp = w * s, Hp = h * s, img = new Uint8Array(Wp * Hp * 3).fill(250);
  for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) { const k = tile(x0 + x / s, z0 + y / s); if (k < 0) continue; const g = grid[k], c = g === T.BLD ? [150, 140, 130] : g === T.WATER ? [180, 205, 225] : [238, 234, 226]; img.set(c, (y * Wp + x) * 3); }
  const dot = (cx, cy, r, c, ring) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > r || (ring && d < r - 2)) continue; const X = Math.round(cx + x), Y = Math.round(cy + y); if (X >= 0 && Y >= 0 && X < Wp && Y < Hp) img.set(c, (Y * Wp + X) * 3); } };
  R.forEach(r => { const m = Math.max(0, Math.min(1, r.fr.tetto + (1 - r.intorno) * .6 - r.fr.strada)); dot((r.x - x0) * s, (r.z - z0) * s, 3, [Math.round(60 + 195 * m), Math.round(170 - 140 * m), 60]); });
  P.forEach(r => dot((r.x - x0) * s, (r.z - z0) * s, 11, [20, 20, 20], true));
  png(file, Wp, Hp, i => [img[i * 3], img[i * 3 + 1], img[i * 3 + 2]]);
}
module.exports = { quadro, camera, raggio, libero, pieno, CASA, VOLTE, CLASSI, COLORI, png, campiona, PERC, LUOGHI, simula };
