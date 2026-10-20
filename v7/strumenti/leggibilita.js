// [volumi2] Il validatore della leggibilità (LEGGIBILITA.md sez. 4): per ogni casella di strada della città nuova si chiede se il suolo
// si vede dalla camera senza varco. Il raggio parte dal centro della casella, va verso la camera (yaw π/4: la camera sta a sud-est, verso
// x e y crescenti) salendo col pitch del gioco, e urta le scatole degli edifici (corpo pieno + gradoni di b.tiers, quota del tetto come
// tetti.js) e dei pezzi alti (la cortina dei portici sopra le arcate, la torre littoria, il campanile, i torrioni...).
// Stampa la % di caselle viste per tipo di strada (vicoli, rua/marina, vie, corsi, Vittoria, piazze), il conteggio dei dislivelli > 1 piano
// fra case adiacenti del borgo, i volumi oltre i 4 piani a meno di 20 m da un vicolo o da una piazza, e la pianta delle zone cieche (png).
// Uso (da v7): node strumenti/leggibilita.js [uscita.png] [x0 y0 x1 y1 in metri] [scala]     PV_PITCH=0.72 per cambiare l'inclinazione
//   prima/dopo: git show HEAD~1:v7/src/world_cittanuova.js > /tmp/w.js && PV_MONDO=/tmp/w.js node strumenti/leggibilita.js prima.png
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const src = path.join(__dirname, '..', 'src');
// PV_MONDO: un'altra versione del mondo, per il prima/dopo
global.World = require(process.env.PV_MONDO ? path.resolve(process.env.PV_MONDO) : path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const G = Game, W = World, T = G.T, GW = G.GW, GH = G.GH, TS = G.TS, B = G.BUILDINGS, EL = G.MAP.elev, BI = W.bIndex, GR = W.grid;
const [out = 'leggibilita.png', a0 = 1080, b0 = 220, a1 = 1620, b1 = 480, sc0 = 3] = process.argv.slice(2);
const X0 = Math.floor(+a0 / TS), Y0 = Math.floor(+b0 / TS), X1 = Math.ceil(+a1 / TS), Y1 = Math.ceil(+b1 / TS), S = +sc0;
const PITCH = +(process.env.PV_PITCH || .72), TANP = Math.tan(PITCH), DX = Math.SQRT1_2, DY = Math.SQRT1_2;   // verso la camera, in pianta
const MG = 3.6, MF = 2.4, CORN = .5;   // come tetti.js / render.js; + il cornicione o il parapetto
const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;

// ---------------- LE SCATOLE ----------------
// per casella: la quota più alta di quello che c'è sopra (edifici, gradoni, pezzi) e, per i portici, la quota sotto cui si passa
const TOP = new Float32Array(GW * GH).fill(-1e9), BOT = new Float32Array(GW * GH).fill(-1e9);
const hFl = (b, fl) => (b.base || 0) + (b.lighthouse ? 12 : b.kiosk ? 2.8 : fl >= 1 ? MG + (fl - 1) * MF : 3) + CORN;
B.forEach((b, k) => {
  const tiers = b.tiers || [], f0 = tiers.length ? Math.min(...tiers.filter(t => !t.room).map(t => t.f0).concat([b.fl])) : b.fl;
  for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { if (!inb(tx, ty)) continue; const i = ty * GW + tx; if (BI[i] !== k) continue;
    let h = hFl(b, f0); tiers.forEach(t => { if (tx >= t.x && tx < t.x + t.w && ty >= t.y && ty < t.y + t.h) h = Math.max(h, hFl(b, t.f0 + t.fl)); });
    TOP[i] = Math.max(TOP[i], h); }
});
// i pezzi: rettangolo locale [x0, x1, z0, z1], quota sopra il piede (q), quota sotto cui il raggio passa (le arcate del portico)
const ALT = { torre_littoria: p => p.opz.h || 30, campanile: p => p.opz.h || 24, facciata_chiesa: () => 14, torrione: () => 12, bastione: () => 8, porta_terra: () => 11, porta_monumentale: () => 11,
  cortina: () => 7, caserma: () => 8, stazione: () => 9, magazzini_volta: () => 7, muro_garante: () => 4.5, tettoia_mercato: () => 6, mura_tramontana: () => 6 };
const pzW = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
const pzL = (p, wx, wy) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = wx - p.x, dy = wy - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
const box = (p, r, hTop, hBot) => {
  const C = [[r[0], r[2]], [r[1], r[2]], [r[1], r[3]], [r[0], r[3]]].map(([a, b]) => pzW(p, a, b));
  const ax = Math.min(...C.map(c => c[0])), bx = Math.max(...C.map(c => c[0])), ay = Math.min(...C.map(c => c[1])), by = Math.max(...C.map(c => c[1]));
  for (let ty = Math.floor(ay / TS); ty <= Math.floor(by / TS); ty++) for (let tx = Math.floor(ax / TS); tx <= Math.floor(bx / TS); tx++) { if (!inb(tx, ty)) continue;
    const [lx, lz] = pzL(p, tx * TS + 1, ty * TS + 1); if (lx < r[0] || lx > r[1] || lz < r[2] || lz > r[3]) continue; const i = ty * GW + tx;
    if ((p.q || 0) + hTop > TOP[i]) { TOP[i] = (p.q || 0) + hTop; BOT[i] = hBot === undefined ? -1e9 : (p.q || 0) + hBot; } }
};
(W.pezzi || []).forEach(p => {
  if (p.tipo === 'portico') { const o = p.opz, L = o.campate * o.campata, P = o.profondita; box(p, [0, L, -P / 2 - .25, P / 2 + .25], o.h + 3.5 + o.piani * 3.4, o.h); return; }
  const f = ALT[p.tipo]; if (!f) return; const rs = (p.imp || []).filter(m => m[0] === 'B'); if (!rs.length) return;
  rs.forEach(m => box(p, m.slice(1), f(p)));
});

// ---------------- I TIPI DI STRADA ----------------
const TIPO = id => /^vic_/.test(id) || id === 'mezzo' || id === 'cavour_sotto' ? 'vicoli' : id === 'rua' || id === 'marina' ? 'rua/marina'
  : id === 'corso' ? 'corso' : id === 'vittoria' ? 'Vittoria' : /^via_/.test(id) ? 'vie' : null;
const SEG = []; W.roads.forEach(r => { const t = TIPO(r.id); if (!t || !r.pts) return; for (let k = 0; k < r.pts.length - 1; k++) SEG.push([r.pts[k][0], r.pts[k][1], r.pts[k + 1][0], r.pts[k + 1][1], r.w, t, r.id]); });
const dSeg = (x, y, s) => { const vx = s[2] - s[0], vy = s[3] - s[1], L2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((x - s[0]) * vx + (y - s[1]) * vy) / L2)); return Math.hypot(x - s[0] - u * vx, y - s[1] - u * vy); };
const PORT = (W.pezzi || []).filter(p => p.tipo === 'portico').map(p => { const L = p.opz.campate * p.opz.campata, P = p.opz.profondita / 2 + .25, x0 = p.rot ? p.x - L : p.x; return [x0, x0 + L, p.y - P, p.y + P]; });
const OPEN = new Set([T.VIA, T.WALK, T.PIAZZA, T.COB, T.STAIRS, T.QUAY]);
const tipoAt = (tx, ty) => {
  const i = ty * GW + tx, v = GR[i]; if (W.zone[i] !== W.Z.CITTA || !OPEN.has(v) || BI[i] >= 0) return null;
  const x = tx * TS + 1, y = ty * TS + 1; let best = null, bd = 1e9;
  for (const s of SEG) { if (x < Math.min(s[0], s[2]) - 14 || x > Math.max(s[0], s[2]) + 14 || y < Math.min(s[1], s[3]) - 14 || y > Math.max(s[1], s[3]) + 14) continue;
    const d = dSeg(x, y, s) - s[4] / 2; if (d < bd) { bd = d; best = s; } }
  if (v === T.PIAZZA) return bd < 1 ? best[5] : 'piazze';
  if (best && best[5] === 'Vittoria' && v === T.WALK && PORT.some(r => x >= r[0] && x <= r[1] && y >= r[2] && y <= r[3])) return 'sotto i portici';   // un livello coperto: si vede col varco
  if (best && bd <= (best[5] === 'Vittoria' ? 7.5 : best[5] === 'vicoli' ? .5 : 3.5)) return best[5];   // i marciapiedi (e i portici) vanno con la loro strada
  if (v === T.COB && W.roadW[i] > 0) return 'vicoli';
  return null;
};

// ---------------- IL RAGGIO ----------------
const visto = (tx, ty, hz) => {
  const x0 = tx * TS + 1, y0 = ty * TS + 1, z0 = EL[ty * GW + tx] + (hz || 0);
  for (let s = .5; s < 70; s += .5) { const x = x0 + DX * s, y = y0 + DY * s, cx = Math.floor(x / TS), cy = Math.floor(y / TS); if (!inb(cx, cy)) return true;
    const i = cy * GW + cx, z = z0 + s * TANP; if (z > 60) return true; if (TOP[i] > z && !(BOT[i] > z)) return false; }
  return true;
};

const ORD = ['vicoli', 'rua/marina', 'vie', 'corso', 'Vittoria', 'sotto i portici', 'piazze'], SOGLIA = { vicoli: 60, 'rua/marina': 90, vie: 90, corso: 100, Vittoria: 100, 'sotto i portici': 0, piazze: 100 };
const N = {}, V = {}, F = {}; ORD.forEach(k => { N[k] = V[k] = F[k] = 0; });
const MAP = new Int8Array((X1 - X0) * (Y1 - Y0)).fill(-1);
for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const t = tipoAt(tx, ty); if (!t) continue;
  const v = visto(tx, ty), f = v || visto(tx, ty, 1.7); N[t]++; if (v) V[t]++; if (f) F[t]++; MAP[(ty - Y0) * (X1 - X0) + tx - X0] = v ? 1 : f ? 2 : 0; }
console.log(`[volumi2] leggibilità della città nuova (pitch ${PITCH}, area ${a0},${b0}–${a1},${b1})`);
console.log('tipo'.padEnd(16), 'caselle'.padStart(8), 'suolo visto'.padStart(12), 'figura vista'.padStart(13), ' soglia');
let tot = 0, totV = 0; ORD.forEach(k => { if (!N[k]) return; tot += N[k]; totV += V[k]; const p = 100 * V[k] / N[k];
  console.log(k.padEnd(16), String(N[k]).padStart(8), (p.toFixed(1) + '%').padStart(12), ((100 * F[k] / N[k]).toFixed(1) + '%').padStart(13), ' ≥' + SOGLIA[k] + '%', p >= SOGLIA[k] ? 'ok' : 'SOTTO'); });
console.log('tutte'.padEnd(16), String(tot).padStart(8), ((100 * totV / tot).toFixed(1) + '%').padStart(12));

// ---------------- I TETTI: dislivelli fra case adiacenti del borgo, volumi alti vicino a vicoli e piazze ----------------
const borgo = b => b.house && !b.shack && (b.era === 'E0' || b.era === 'E2');
const coppie = new Set(); let oltre = 0; const OLTRE = [];
B.forEach((a, ka) => { if (!borgo(a)) return; const nb = new Set();
  for (let ty = a.y; ty < a.y + a.h; ty++) for (let tx = a.x; tx < a.x + a.w; tx++) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const x = tx + dx, y = ty + dy; if (!inb(x, y)) continue; const kb = BI[y * GW + x]; if (kb >= 0 && kb !== ka && borgo(B[kb])) nb.add(kb); }
  nb.forEach(kb => { const key = Math.min(ka, kb) + ':' + Math.max(ka, kb); if (coppie.has(key)) return; coppie.add(key); if (Math.abs(a.fl - B[kb].fl) > 1) { oltre++; OLTRE.push(a.id + '(' + a.fl + ')-' + B[kb].id + '(' + B[kb].fl + ')'); } });
});
console.log(`dislivelli > 1 piano fra case adiacenti del borgo: ${oltre} coppie su ${coppie.size}`);
if (process.env.PV_DBG) console.log(OLTRE.join(' '));
const vicino = new Uint8Array(GW * GH); for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const t = MAP[(ty - Y0) * (X1 - X0) + tx - X0]; if (t < 0) continue; const tp = tipoAt(tx, ty); if (tp === 'vicoli' || tp === 'piazze') vicino[ty * GW + tx] = 1; }
const alti = B.filter(b => b.house && b.fl > 4 && b.x >= X0 && b.x < X1 && b.y >= Y0 && b.y < Y1 && (() => { for (let ty = b.y - 10; ty < b.y + b.h + 10; ty++) for (let tx = b.x - 10; tx < b.x + b.w + 10; tx++) if (inb(tx, ty) && vicino[ty * GW + tx]) { const dx = Math.max(0, b.x - tx, tx - (b.x + b.w - 1)), dy = Math.max(0, b.y - ty, ty - (b.y + b.h - 1)); if (Math.hypot(dx, dy) * TS < 20) return true; } return false; })());
console.log(`case oltre i 4 piani a meno di 20 m da un vicolo o da una piazza: ${alti.length}${alti.length ? ' (' + alti.map(b => b.id + ':' + b.fl + (b.torre ? ' torre' : '')).join(', ') + ')' : ''}`);
const hist = {}; B.forEach(b => { if (b.house && b.x >= X0 && b.x < X1 && b.y >= Y0 && b.y < Y1) hist[b.fl] = (hist[b.fl] || 0) + 1; }); console.log('case per piani:', Object.keys(hist).sort((a, b) => a - b).map(k => k + 'p ' + hist[k]).join(', '));

// ---------------- LA PIANTA DELLE ZONE CIECHE ----------------
const PW = (X1 - X0) * S, PH = (Y1 - Y0) * S, px = Buffer.alloc(PW * PH * 3);
const put = (x, y, c) => { for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = ((y * S + j) * PW + x * S + i) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; } };
for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) { const i = ty * GW + tx, m = MAP[(ty - Y0) * (X1 - X0) + tx - X0]; let c;
  if (m === 1) c = [222, 218, 205]; else if (m === 2) c = [235, 170, 60]; else if (m === 0) c = [205, 40, 40];
  else if (BI[i] >= 0 || TOP[i] > -1e8) { const b = B[BI[i]], h = TOP[i] - (b ? b.base || 0 : 0), l = Math.max(30, 190 - h * 7); c = [l, l, l * 1.05]; }
  else if (GR[i] === T.WATER) c = [70, 110, 150]; else c = [150, 160, 130];
  put(tx - X0, ty - Y0, c); }
const raw = Buffer.alloc((PW * 3 + 1) * PH); for (let y = 0; y < PH; y++) { raw[y * (PW * 3 + 1)] = 0; px.copy(raw, y * (PW * 3 + 1) + 1, y * PW * 3, (y + 1) * PW * 3); }
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(PW, 0); ih.writeUInt32BE(PH, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('pianta delle zone cieche', out, PW + '×' + PH, '(chiaro: suolo visto; arancio: si vede solo la figura; rosso: cieco senza varco)');
