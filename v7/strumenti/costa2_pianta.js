// [costa2] La pianta dell'isola vista dall'alto con la costa colorata per tipo: node strumenti/costa2_pianta.js uscita.png [x0 y0 x1 y1] [scala]
// Dalle caselle della città nuova (world_cittanuova.js): l'acqua chiara dove è bassa (il fondale di SEA.depth), la terra per caselle,
// la quota in ombreggiatura, la fascia di riva colorata col suo tipo (W.coastKind2 se c'è, se no W.coastKind), la strada sul mare
// col guardrail in rosso. Accanto scrive uscita.json: i metri di costa per tipo e i tratti con nome (per i fogli di strumenti/fogli_costa2.py).
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const src = path.join(__dirname, '..', 'src');
const log0 = console.log; console.log = () => {};
global.World = require(path.join(src, 'world_cittanuova.js'));
console.log = log0;
const W = World, T = W.T, GW = W.GW, GH = W.GH, TS = W.TS;
const [out = 'costa2.png', a0, b0, a1, b1, sc0] = process.argv.slice(2);
const X0 = Math.floor((+a0 || 330) / TS), Y0 = Math.floor((+b0 || 210) / TS), X1 = Math.ceil((+a1 || 1650) / TS), Y1 = Math.ceil((+b1 || 640) / TS), S = +sc0 || 1;
const KCOL = { duna: [236, 196, 96], spiaggia: [250, 226, 150], foce: [96, 150, 58], cala: [255, 170, 70], scogli: [150, 146, 140], falesia: [92, 66, 58], frangiflutti: [205, 214, 224], porto: [40, 90, 170], reef: [120, 200, 190] };
const kind = (x, y) => (W.coastKind2 || W.coastKind)(x, y);
const isSea = i => W.grid[i] === T.WATER && W.zone[i] === W.Z.MARE;
const w = (X1 - X0) * S, h = (Y1 - Y0) * S, px = Buffer.alloc(w * h * 3);
const put = (tx, ty, c) => { for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = (((ty - Y0) * S + j) * w + (tx - X0) * S + i) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; } };
const LAND = { [T.COB]: [196, 176, 150], [T.VIA]: [92, 88, 92], [T.BLD]: [176, 140, 112], [T.PIAZZA]: [214, 198, 168], [T.QUAY]: [150, 144, 136], [T.PIER]: [140, 110, 80], [T.SAND]: [232, 214, 168], [T.GRASS]: [150, 178, 104], [T.WALK]: [190, 184, 176], [T.ROCK]: [168, 160, 150], [T.TREE]: [62, 108, 56], [T.DIRT]: [176, 146, 104], [T.FIELD]: [196, 186, 112], [T.SHRUB]: [110, 140, 76], [T.CLIFF]: [120, 104, 96], [T.GRAVEL]: [190, 182, 168], [T.SALT]: [236, 238, 238], [T.FOUNT]: [90, 170, 200], [T.STAIRS]: [180, 170, 160] };
const metri = {};
for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) {
  if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue;
  const i = ty * GW + tx, v = W.grid[i];
  if (v === T.WATER) {
    const d = W.SEA && W.SEA.depth ? W.SEA.depth[i] : 6, k = Math.min(1, d / 12);
    put(tx, ty, isSea(i) ? [Math.round(150 - 90 * k), Math.round(214 - 104 * k), Math.round(214 - 54 * k)] : [80, 150, 170]); continue;
  }
  let c = (LAND[v] || [255, 0, 255]).slice(); const e = W.elev[i], sh = Math.max(.75, Math.min(1.25, .9 + e / 40)); c = c.map(q => Math.min(255, Math.round(q * sh)));
  // la riva: una casella di terra che tocca il mare
  let riva = false; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + b) * GW + tx + a; if (tx + a >= 0 && ty + b >= 0 && tx + a < GW && ty + b < GH && isSea(j)) riva = true; }
  if (riva) { const k = v === T.QUAY || v === T.PIER ? 'porto' : kind(tx * TS + 1, ty * TS + 1); metri[k] = (metri[k] || 0) + TS; c = KCOL[k] || [255, 0, 255];
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = (ty + b) * GW + tx + a; if (tx + a >= X0 && ty + b >= Y0 && tx + a < X1 && ty + b < Y1 && isSea(ii)) put(tx + a, ty + b, c.map(q => Math.round(q * .85))); } }
  put(tx, ty, c);
}
// la strada sul mare: i tratti delle costiere col bordo bagnato (rd.edge 3) e i guardrail di [costa2]
const red = [214, 40, 40];
const G2 = W.SEA && W.SEA.costa2;
if (G2 && G2.guardrail) G2.guardrail.forEach(L => L.forEach(([x, y]) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx >= X0 && ty >= Y0 && tx < X1 && ty < Y1) put(tx, ty, red); }));
else W.roads.forEach(rd => { if (!rd.edge || rd.kind !== 'litoranea') return; rd.pts.forEach((q, k) => { if (rd.edge[k * 2] !== 3 && rd.edge[k * 2 + 1] !== 3) return; const tx = Math.floor(q[0] / TS), ty = Math.floor(q[1] / TS); if (tx >= X0 && ty >= Y0 && tx < X1 && ty < Y1) put(tx, ty, red); }); });
// PNG
const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
const CT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CT[n] = c >>> 0; }
const crc = b => { let r = 0xffffffff; for (const x of b) r = CT[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
const info = { cornice: [X0 * TS, Y0 * TS, X1 * TS, Y1 * TS], scala: S, metri, colori: KCOL, tratti: (W.COSTA2 && W.COSTA2.nomi) || [] };
fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify(info, null, 1));
console.log('pianta della costa', out, w + '×' + h, JSON.stringify(metri));
