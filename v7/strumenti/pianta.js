// La pianta della città vista dall'alto, a colori, dalle caselle (senza grafica 3D): node strumenti/pianta.js uscita.png [x0 y0 x1 y1 in metri] [scala]
// Serve a disegnare l'urbanistica in fretta: strade, marciapiedi, piazze, case (più scure se più alte), verde, acqua, binari.
const path = require('path'), fs = require('fs'), zlib = require('zlib');
const src = path.join(__dirname, '..', 'src');
global.World = require(path.join(src, 'world.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const G = Game, T = G.T, GW = G.GW, GH = G.GH, TS = G.TS, B = G.BUILDINGS;
const [out = 'pianta.png', a0, b0, a1, b1, sc0] = process.argv.slice(2);
const X0 = Math.floor((+a0 || 0) / TS), Y0 = Math.floor((+b0 || 0) / TS), X1 = Math.ceil((+a1 || GW * TS) / TS), Y1 = Math.ceil((+b1 || GH * TS) / TS), S = +sc0 || 3;
const C = { WATER: [70, 120, 170], VIA: [70, 70, 80], WALK: [190, 185, 175], PIAZZA: [215, 200, 170], COB: [200, 120, 60], QUAY: [150, 145, 135], PIER: [140, 110, 80], TREE: [40, 110, 50], GRASS: [150, 190, 110], SHRUB: [90, 140, 70], SAND: [225, 210, 160], ROCK: [130, 125, 120], GRAVEL: [120, 110, 100], DIRT: [150, 120, 90], FIELD: [170, 170, 90], CLIFF: [100, 90, 80], FOUNT: [90, 170, 220] };
const inv = {}; for (const k in T) inv[T[k]] = k;
const W = (X1 - X0) * S, H = (Y1 - Y0) * S, px = Buffer.alloc(W * H * 3);
const put = (x, y, c) => { for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const o = ((y * S + j) * W + x * S + i) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; } };
for (let ty = Y0; ty < Y1; ty++) for (let tx = X0; tx < X1; tx++) {
  const v = G.tileAt(tx, ty), k = inv[v]; let c = C[k] || [255, 0, 255];
  if (k === 'BLD') { const bi = G.MAP.world.bIndex[ty * GW + tx], b = B[bi], f = b ? b.fl || 1 : 1; const l = Math.max(40, 205 - f * 22); c = b && b.shack ? [150, 95, 70] : b && b.military ? [90, 95, 70] : [l, l * .85, l * .8];
    if (b && (tx === b.x || ty === b.y || tx === b.x + b.w - 1 || ty === b.y + b.h - 1)) c = c.map(q => q * .75); }
  put(tx - X0, ty - Y0, c);
}
const L = G.layout && G.layout(); if (L && L.rail) L.rail.pts.forEach(([x, y]) => { const tx = Math.floor(x / TS) - X0, ty = Math.floor(y / TS) - Y0; if (tx >= 0 && ty >= 0 && tx < X1 - X0 && ty < Y1 - Y0) put(tx, ty, [200, 40, 40]); });
// PNG
const raw = Buffer.alloc((W * 3 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('pianta', out, W + '×' + H, 'caselle', (X1 - X0) + '×' + (Y1 - Y0));
