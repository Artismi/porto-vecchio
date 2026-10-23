// [riva] Il rilievo della riva fine visto dall'alto (ombreggiato, coi colori del suolo): node strumenti/riva_rilievo.js uscita.png x0 y0 x1 y1 [px per metro]
// Accanto: la riva di prima (la quota a caselle) per confronto, a sinistra.
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const log0 = console.log; console.log = () => {}; global.World = require(path.join(__dirname, '..', 'src', 'world_cittanuova.js')); console.log = log0;
const Riva = require(path.join(__dirname, '..', 'src', 'riva.js')); const W = World; Riva.init(W);
const [out, a0, b0, a1, b1, p0] = process.argv.slice(2), X0 = +a0, Y0 = +b0, X1 = +a1, Y1 = +b1, P = +(p0 || 4);
const w = Math.round((X1 - X0) * P), h = Math.round((Y1 - Y0) * P), px = Buffer.alloc(w * 2 * h * 3);
const vq = (x, y) => { const tx = Math.floor(x / 2), ty = Math.floor(y / 2), u = x / 2 - tx, v = y / 2 - ty; const q = (i, j) => W.quotaRiva(i, j); return q(tx, ty) * (1 - u) * (1 - v) + q(tx + 1, ty) * u * (1 - v) + q(tx, ty + 1) * (1 - u) * v + q(tx + 1, ty + 1) * u * v; };
const fine = (x, y) => { const q = Riva.quota(x, y); return q === null ? vq(x, y) : q; };
const t0 = Date.now();
for (const [side, f] of [[0, vq], [1, fine]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
  const x = X0 + i / P, y = Y0 + j / P, e = 1 / P, z = f(x, y), zx = f(x + e, y) - z, zy = f(x, y + e) - z;
  const nx = -zx / e, ny = -zy / e, L = Math.hypot(nx, ny, 1), sh = Math.max(0, (nx * -.6 + ny * -.5 + .65) / L) * 1.25;
  let c; if (z < W.WL) { const dd = Math.min(1, (W.WL - z) / 2.5); c = [90 - 50 * dd, 170 - 80 * dd, 180 - 50 * dd]; }
  else { const tx = Math.floor(x / 2), ty = Math.floor(y / 2), s = side && Riva.inBanda(tx, ty) ? Riva.suolo(tx, ty, x, y, z) : null;
    c = [150, 150, 120]; if (s) { const sab = [218, 200, 160], roc = [168, 162, 150]; c = c.map((q, k) => q * (1 - s[0] - s[1] * (1 - s[0])) + sab[k] * s[0] + roc[k] * s[1] * (1 - s[0])); const bg = s[2]; c = c.map(q => q * (1 - .4 * bg)); } }
  const o = (j * w * 2 + i + side * w) * 3; for (let k = 0; k < 3; k++) px[o + k] = Math.max(0, Math.min(255, c[k] * (.45 + .6 * sh)));
}
const W2 = w * 2, raw = Buffer.alloc((W2 * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (W2 * 3 + 1)] = 0; px.copy(raw, y * (W2 * 3 + 1) + 1, y * W2 * 3, (y + 1) * W2 * 3); }
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W2, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('rilievo', out, W2 + '×' + h, (Date.now() - t0) + ' ms');
