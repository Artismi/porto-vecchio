// [pianta] LA TAVOLA DELLA VIABILITÀ: la rete delle strade della città nuova com'è oggi (dal mondo del gioco) e come la propone il
// progetto (dati scritti qui, in metri finali: x verso est, y verso sud), con la gerarchia (litoranea, viali, vie, vicoli), le sezioni
// tipo, le linee del bus, i parcheggi, la spianata ricucita, il mercato e la porta ridotti, la costa rifatta.
// Il committente: «tra la ferrovia e le case e il mare/litorale deve passare una strada, adesso è tutto compresso, manca qualcuno che si
// occupi davvero di viabilità»; «la città finisce di colpo, vuoto e poi fortezza»; «l'arco di trionfo al massimo nella piazza, un po' più
// piccolo»; «il mercato coperto è enorme»; «spesso la costa è mangiata dal mare».
//   node strumenti/tavola_viabilita.js [cartella]   (predefinita: _immagini/pianta)
// Esce: tavola_viabilita.png (oggi sopra, progetto sotto, le sezioni e la legenda a destra) e opzioni_spianata.png (le due letture di
// «potresti metterlo lì l'arco che rimane sul mare», da far scegliere al committente). Disegna in Chromium senza testa (per le scritte).
// Con PIANTA_PRIMA=<cartella src di prima> (un worktree del commit di partenza) esce anche venuta.png: sopra la rete di prima, sotto quella
// del gioco di adesso, tutte e due lette dai dati (strade per livello, la linea del bus col giro e le fermate, gli stalli della sosta).
const path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const SRC = path.join(__dirname, '..', 'src'), OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', '_immagini', 'pianta'));
fs.mkdirSync(OUT, { recursive: true });
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
// [pianta] il mondo di prima (se c'è): solo le caselle e le strade, prima di caricare quello di adesso
let PRIMA = null;
if (process.env.PIANTA_PRIMA) { global.World = require(path.join(path.resolve(process.env.PIANTA_PRIMA), 'world_cittanuova.js')); PRIMA = World; }
global.World = require(path.join(SRC, 'world_cittanuova.js'));
let VV = null; if (PRIMA) { global.Interior = require(path.join(SRC, 'interiors.js')); global.Game = require(path.join(SRC, 'game.js')); global.Chiarezza = require(path.join(SRC, 'chiarezza.js')); VV = require(path.join(SRC, 'vievive.js')); }
console.log = log; console.warn = warn;
const W = World, T = W.T, TS = W.TS, GW = W.GW, B = W.BUILDINGS;
const F = { x0: 1222, y0: 236, x1: 1612, y1: 452, s: 3.2 };   // la cornice (metri) e i pixel per metro

// ---------- il fondo: le caselle di oggi, smorzate ----------
const nx = Math.ceil((F.x1 - F.x0) / TS), ny = Math.ceil((F.y1 - F.y0) / TS);
const fondo = (smorza, W = World) => { const T = W.T, B = W.BUILDINGS, GW = W.GW; const px = Buffer.alloc(nx * ny * 4);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const tx = Math.floor(F.x0 / TS) + i, ty = Math.floor(F.y0 / TS) + j, k = ty * GW + tx, v = W.grid[k]; let c;
    if (v === T.WATER) c = W.zone[k] === W.Z.MARE ? [168, 196, 214] : [176, 204, 220];
    else if (v === T.BLD) { const b = B[W.bIndex[k]], f = b ? b.fl || 1 : 3; const l = Math.max(118, 212 - f * 16); c = b && b.military ? [150, 152, 140] : [l, l * .95, l * .9]; }
    else if (v === T.GRASS || v === T.TREE || v === T.SHRUB) c = [200, 212, 182]; else if (v === T.SAND) c = [236, 224, 190]; else if (v === T.ROCK) c = [190, 184, 176];
    else if (v === T.QUAY || v === T.PIER) c = [214, 208, 198]; else if (v === T.GRAVEL) c = [196, 188, 178]; else if (W.roadW[k] > 0) c = [248, 244, 234]; else if (v === T.PIAZZA) c = [240, 232, 214]; else c = [232, 226, 214];
    if (smorza) c = c.map(q => q + (246 - q) * smorza);
    const o = (j * nx + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
  return px.toString('base64'); };

// ---------- OGGI: la rete del gioco, classificata ----------
const inC = p => p[0] > F.x0 - 30 && p[0] < F.x1 && p[1] > F.y0 && p[1] < F.y1;
const ANELLO = new Set(['lung_nord', 'passeggiata', 'passeggiata_sud', 'marina']);
const livello = rd => rd.kind === 'litoranea' || (rd.kind === 'citta' && (rd.litorale || ANELLO.has(rd.id))) ? 'lit' : rd.kind === 'citta' ? 'viale' : rd.kind === 'vicolo' ? (rd.w >= 4.5 ? 'via' : 'vicolo') : 'altro';
const rete = W => W.roads.filter(rd => rd.pts && rd.pts.some(inC) && rd.kind !== 'sterrato').map(rd => ({ id: rd.id, nome: rd.name, w: rd.w, liv: livello(rd), pts: rd.pts.map(q => [+q[0].toFixed(1), +q[1].toFixed(1)]) }));
const oggi = rete(PRIMA || W);
const rail = (W.railCity || []).filter(p => p[0] > F.x0 - 20 && p[0] < 1470).map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]);
const ry = x => { let a = rail[0], b = rail[rail.length - 1]; for (let k = 0; k < rail.length - 1; k++) if (rail[k][0] <= x && rail[k + 1][0] >= x) { a = rail[k]; b = rail[k + 1]; break; } return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); };
// i problemi di oggi, misurati
const mare = (x, y) => { const WW = PRIMA || W, tx = Math.floor(x / TS), ty = Math.floor(y / TS), i = ty * GW + tx; return WW.grid[i] === T.WATER && WW.zone[i] === WW.Z.MARE; };
const costaN = x => { let y = ry(Math.min(1460, x)); while (y > F.y0 && !mare(x, y)) y -= 1; return y + 1; };
const strettoia = []; for (let x = 1256; x <= 1460; x += 4) { const d = ry(x) - 3 - costaN(x); if (d < 9) strettoia.push([x, ry(x) - 3, +d.toFixed(1)]); }
const PROBLEMI = [
  { x: 1400, y: 262, r: 34, t: 'ferrovia sugli scogli: niente strada fra binari, case e mare' },
  { x: 1488, y: 296, r: 24, t: 'la spianata: 36 × 76 m di terra vuota' },
  { x: 1274, y: 343, r: 17, t: 'tettoia del Mercato: 28 m di vetro' },
  { x: 1306, y: 304, r: 11, t: 'Porta di Terra: 23 m × 15' },
  { x: 1390, y: 391, r: 20, t: 'Via della Marina: 5 m fra case e calata' },
  { x: 1500, y: 343, r: 10, t: 'la Vittoria muore sulla porta (inversione)' },
];

// ---------- IL PROGETTO (metri finali) ----------
// la gerarchia: lit = litoranea (l'anello sul mare: 6,5 m di carreggiata, marciapiede di 2,5 lato mare col parapetto, guardrail sulla
// ferrovia); viale = 7 m a doppio senso coi marciapiedi; via = 5 m, zona a traffico limitato (Ape, moto, carico e scarico); vicolo = 2-3 m, a piedi
const off = (x, d) => [x, +(ry(x) + d).toFixed(1)];
const LUNG_N = [[1252, 281], [1262, 270], [1276, 262.5], [1296, 259], [1318, 262.5], [1334, 263.5]].concat([1346, 1362, 1378, 1394, 1410, 1426, 1440, 1452].map(x => off(x, -10)), [[1462, 252], [1468.5, 258], [1469, 268]]);
const SPIAN_X = 1469;   // l'asse del Viale della Spianata (la Passeggiata allargata: i lecci sul lato della spianata)
const PRJ = {
  lit: [
    { nome: 'Lungomare di Tramontana', pts: LUNG_N, nuova: true },
    { nome: 'Viale della Spianata', pts: [[1469, 268], [1469, 343]], nuova: true },
    { nome: 'Via del Lido', pts: [[1466.5, 343], [1466.5, 405]], nuova: true },
    { nome: 'Lungomare della Marina', pts: [[1310, 388], [1350, 387], [1380, 387.5], [1405, 388.5], [1420, 395], [1438, 402.5], [1454, 405.5], [1466.5, 406]], nuova: true },
    { nome: 'Via del Porto', pts: [[1250, 388], [1286, 387], [1310, 388]] },
    { nome: 'Costiera Nord', pts: [[1222, 300], [1240, 292], [1252, 285]] }, { nome: 'Costiera Sud', pts: [[1222, 392], [1250, 388]] },
  ],
  viale: [
    { nome: 'Via della Stazione', pts: [[1252, 285], [1254, 296], [1256, 308]] },
    { nome: 'Corso Garibaldi', pts: [[1290, 309], [1302, 318], [1302, 328], [1299, 343], [1301, 358], [1306, 374], [1310, 388]] },
    { nome: 'Via della Vittoria', pts: [[1288, 343], [1519, 343]] },
  ],
  via: [
    { nome: 'Rua Maestra', pts: oggi.find(r => r.id === 'rua').pts.slice(0, -1).concat([[SPIAN_X - 3.5, 313]]) },
    { nome: 'Via di Mezzo', pts: oggi.find(r => r.id === 'mezzo').pts },
    { nome: 'Via delle Mura', pts: oggi.find(r => r.id === 'vic_mura').pts.slice(0, -1).concat([[SPIAN_X - 3.5, 274]]) },
    { nome: 'Riva della Rocca', pts: [[1499, 262], [1499.5, 300], [1499.5, 318]], nuova: true, pedonale: true },
    { nome: 'Vico del Glacis', pts: [[1472.5, 290], [1497, 290]], nuova: true, pedonale: true },
  ],
  vicolo: oggi.filter(r => r.liv === 'vicolo').map(r => ({ nome: r.nome, pts: r.pts })),
};
// la spianata ricucita: gli isolati bassi fra il viale e la riva, la piazza della Rocca sulla Vittoria, le case addossate
const ISOLATI = [
  { pts: [[1475, 262], [1495, 262], [1495, 287.5], [1475, 287.5]], piani: '1-2', nome: 'case dei bottai (E3)' },
  { pts: [[1475, 292.5], [1495, 292.5], [1495, 312], [1475, 312]], piani: '2', nome: 'case del glacis (E3)' },
  { pts: [[1462, 349], [1471, 349], [1471, 353], [1462, 353]], piani: '1', nome: '' },
  { pts: [[1473, 357], [1478, 357], [1478, 382], [1473, 382]], piani: '1-2', nome: 'case addossate al muro (E5)' },
];
const PIAZZA_ROCCA = [[1474, 316], [1491, 316], [1491, 338.5], [1474, 338.5]];   // fino al muro della testa di ponte (x 1492)
const BUS = [
  { nome: 'Linea 1 · Circolare del Borgo', col: '#c0392b', pts: [[1256, 306], [1254, 296], [1252, 285]].concat(LUNG_N.slice(1), [[1469, 343], [1466.5, 343], [1466.5, 406]], [[1454, 405.5], [1438, 402.5], [1420, 395], [1405, 388.5], [1380, 387.5], [1350, 387], [1310, 388], [1306, 374], [1301, 358], [1299, 343], [1302, 328], [1302, 318], [1290, 309], [1270, 308], [1256, 306]]), dx: -1.2,
    fermate: [[1256, 306, 'Stazione (capolinea)'], [1300, 259, 'Baracche'], [1394, 258, 'Mura'], [1469, 300, 'Spianata'], [1466.5, 372, 'Lido'], [1392, 388, 'Pescheria'], [1310, 388, 'Scalo'], [1300, 335, 'Mercato']] },
  { nome: 'Linea 2 · Stazione – Rocca', col: '#2471a3', pts: [[1256, 308], [1290, 309], [1302, 318], [1302, 328], [1299, 343], [1469, 343]], dx: 1.6,
    fermate: [[1328, 343, 'Piazza Grande'], [1410, 343, 'Pozzo'], [1462, 343, 'Piazza della Rocca (capolinea)']] },
  { nome: 'Corriera dell\'isola', col: '#1e8449', pts: [[1222, 300], [1240, 292], [1252, 285], [1254, 296], [1256, 306]], dx: 0, tratteggio: true, fermate: [] },
];
const PARK = [
  { x: 1236, y: 312, n: 24, nome: 'P Scambiatore di Ponente', w: 22, h: 14 },
  { x: 1268, y: 309, n: 6, nome: 'P Stazione', w: 0 },
  { x: 1380, y: 268, n: 18, nome: 'stalli in linea', lungo: [1346, 1440] },
  { x: 1296, y: 386, n: 10, nome: 'P Scalo', w: 14, h: 6 },
  { x: 1472.5, y: 285, n: 8, nome: 'stalli fra i lecci', lungo: true },
];
// la costa rifatta: dove il mare mangia la riva, una linea credibile (scogliera di massi sotto il lungomare, banchina, spiaggia)
const COSTA_NUOVA = [
  { k: 'scogliera', pts: LUNG_N.slice(2, -2).map(([x, y]) => [x, y - 6]) },
  { k: 'scogliera', pts: [[1468, 248], [1488, 251], [1500, 260], [1506, 280], [1506, 296]] },
  { k: 'spiaggia', pts: [[1408, 405], [1436, 413], [1462, 416]] },
];
const SEZIONI = [
  { nome: 'S1 · Lungomare di Tramontana', x: 1400, y: ry(1400) - 10, fasce: [['mare', 3, '#a8c4d6'], ['scogliera', 3.5, '#9a948c'], ['marciapiede + parapetto', 2.5, '#d8d0c0'], ['carreggiata 2 × 3,5', 7, '#55575c'], ['guardrail', .6, '#b0b4b8'], ['ferrovia (rilevato)', 6, '#8a6e58'], ['mura', 2.4, '#b8a888'], ['Via delle Mura', 2.5, '#efe4cc'], ['case', 4, '#c9b9a5']] },
  { nome: 'S2 · Viale della Spianata', x: SPIAN_X, y: 300, fasce: [['case del borgo', 4, '#c9b9a5'], ['marciapiede (la passeggiata)', 3, '#e6dcc6'], ['carreggiata 2 × 3,5', 7, '#55575c'], ['marciapiede coi lecci', 2, '#b9c8a0'], ['isolati bassi', 4, '#d4bfa0'], ['vico', 2, '#efe4cc'], ['riva della Rocca', 4, '#e6dcc6'], ['canale', 3, '#a8c4d6']] },
  { nome: 'S3 · Via della Marina (lungomare)', x: 1395, y: 388, fasce: [['case della marina', 4, '#c9b9a5'], ['marciapiede', 2, '#e6dcc6'], ['carreggiata 2 × 3,5', 7, '#55575c'], ['marciapiede (bitte / ringhiera)', 2, '#d8d0c0'], ['calata / spiaggia', 5, '#e2d8bc'], ['mare', 3, '#a8c4d6']] },
  { nome: 'S4 · Via della Vittoria (com\'è)', x: 1420, y: 343, fasce: [['case', 3, '#c9b9a5'], ['portico', 3.6, '#e0cfae'], ['marciapiede', 1.4, '#e6dcc6'], ['carreggiata 2 × 3', 6, '#55575c'], ['marciapiede', 1.6, '#e6dcc6'], ['case', 3, '#c9b9a5']] },
  { nome: 'S5 · Rua Maestra (ZTL)', x: 1420, y: 312, fasce: [['case', 3, '#c9b9a5'], ['basoli, senza marciapiede: Ape, moto, a piedi', 5, '#d6c6a4'], ['case', 3, '#c9b9a5']] },
];

const venuta = PRIMA ? (() => { const L = VV.linea(), par = (W.pezzi || []).filter(p => p.tipo === 'parapetto').map(p => { const c = Math.cos(p.rot), s2 = Math.sin(p.rot); return [[p.x, p.y], [p.x + p.opz.L * c, p.y - p.opz.L * s2], p.opz.tipo]; });
  const conta = R => { const o = {}; R.forEach(r => { const L2 = r.pts.reduce((a, q, k) => k ? a + Math.hypot(q[0] - r.pts[k - 1][0], q[1] - r.pts[k - 1][1]) : 0, 0); o[r.liv] = (o[r.liv] || 0) + L2; }); return o; };
  const R0 = rete(PRIMA), R1 = rete(W);
  return { prima: R0, dopo: R1, base0: fondo(.25, PRIMA), base1: fondo(.25), giro: L.giro ? L.giro.pts.filter((q, k) => k % 3 === 0) : [], fermate: L.fermate.map(f => [f.x, f.y, f.nome]), nomi: L.nomi, stalli: VV.stalli().map(s2 => [s2.x, s2.y]), parapetti: par,
    m0: conta(R0), m1: conta(R1), case0: PRIMA.BUILDINGS.filter(b => b.x * TS > 1462 && b.x * TS < 1504 && b.y * TS > 250 && b.y * TS < 340).length, case1: W.BUILDINGS.filter(b => b.x * TS > 1462 && b.x * TS < 1504 && b.y * TS > 250 && b.y * TS < 340).length }; })() : null;
const dati = { F, nx, ny, base: fondo(0, PRIMA || W), baseP: fondo(.35, PRIMA || W), oggi, rail, PROBLEMI, strettoia, PRJ, ISOLATI, PIAZZA_ROCCA, BUS, PARK, COSTA_NUOVA, SEZIONI, SPIAN_X,
  octa: [1274, 343, 16], porta: [1306, 303], venuta };

(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1800, height: 1500 } });
  await pg.setContent('<html><body style="margin:0;background:#f4f0e8"><canvas id="c"></canvas></body></html>');
  const disegna = async (modo) => pg.evaluate(async ([d, modo]) => {
    const S = d.F.s, MW = (d.F.x1 - d.F.x0) * S, MH = (d.F.y1 - d.F.y0) * S, SIDE = 560, PAD = 16, HEAD = 44;
    const c = document.getElementById('c'), x = c.getContext('2d');
    const img = async (b64) => { const raw = Uint8ClampedArray.from(atob(b64), ch => ch.charCodeAt(0)), tc = document.createElement('canvas'); tc.width = d.nx; tc.height = d.ny; tc.getContext('2d').putImageData(new ImageData(raw, d.nx, d.ny), 0, 0); return tc; };
    const tO = await img(d.base), tP = await img(d.baseP);
    let OX = PAD, OY = HEAD;
    const P = (wx, wy) => [OX + (wx - d.F.x0) * S, OY + (wy - d.F.y0) * S];
    const line = (pts, w, col, dash, cap) => { x.beginPath(); pts.forEach((q, i) => { const [a, b] = P(q[0], q[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.lineWidth = w; x.strokeStyle = col; x.setLineDash(dash || []); x.lineCap = cap || 'butt'; x.lineJoin = 'round'; x.stroke(); x.setLineDash([]); };
    const poly = (pts, fill, st, lw) => { x.beginPath(); pts.forEach((q, i) => { const [a, b] = P(q[0], q[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (st) { x.lineWidth = lw || 1; x.strokeStyle = st; x.stroke(); } };
    const dot = (wx, wy, r, col, st) => { const [a, b] = P(wx, wy); x.beginPath(); x.arc(a, b, r, 0, 6.3); x.fillStyle = col; x.fill(); if (st) { x.lineWidth = 1.5; x.strokeStyle = st; x.stroke(); } };
    const txt = (s, wx, wy, col, sz, bold, al) => { const [a, b] = P(wx, wy); x.font = (bold ? 'bold ' : '') + (sz || 11) + 'px sans-serif'; x.textAlign = al || 'left'; x.lineWidth = 3.5; x.strokeStyle = 'rgba(250,247,240,.92)'; x.strokeText(s, a, b); x.fillStyle = col; x.fillText(s, a, b); x.textAlign = 'left'; };
    const sTxt = (s, X, Y, col, sz, bold, al) => { x.font = (bold ? 'bold ' : '') + (sz || 12) + 'px sans-serif'; x.textAlign = al || 'left'; x.fillStyle = col || '#222'; x.fillText(s, X, Y); x.textAlign = 'left'; };
    // il passo dei livelli: larghezza disegnata (in metri veri, più il bordo), colore
    const LIV = { lit: { w: 9.5, col: '#b5651d', bordo: '#5a3210', nome: 'litoranea · 7 m + marciapiedi, parapetto sul mare, doppio senso' }, viale: { w: 7, col: '#e0b040', bordo: '#7a5a10', nome: 'viale · 7 m, doppio senso, marciapiedi' }, via: { w: 5, col: '#f2dc9a', bordo: '#9a8450', nome: 'via · 5 m, ZTL (Ape, moto, carico/scarico)' }, vicolo: { w: 2.6, col: '#fff7e6', bordo: '#b8a888', nome: 'vicolo · 2-3 m, a piedi' }, altro: { w: 2, col: '#ddd', bordo: '#999', nome: '' } };
    const strada = (pts, liv, extra) => { const L = LIV[liv]; line(pts, L.w * S + 2.4, L.bordo, null, 'butt'); line(pts, L.w * S, extra && extra.pedonale ? '#efe4cc' : L.col, null, 'butt'); if (extra && extra.nuova) line(pts, 1.2, 'rgba(0,0,0,.55)', [6, 5]); };
    const etich = (pts, s, col, sz, f) => { const m = pts[Math.floor(pts.length * (f || .45))]; txt(s, m[0] + 2, m[1] - 3, col, sz || 11, true); };
    const pianta = (tile, titolo) => { x.imageSmoothingEnabled = false; x.drawImage(tile, OX, OY, MW, MH); x.imageSmoothingEnabled = true; x.strokeStyle = '#999'; x.lineWidth = 1; x.strokeRect(OX, OY, MW, MH); sTxt(titolo, OX, OY - 10, '#1a1a1a', 17, true); };
    const binari = () => { line(d.rail, 3 * S, '#8a6e58'); line(d.rail, 1.2, '#f4f0e8', [5, 4]); };
    const Z0 = [1246, 250, 1512, 420];
    c.width = PAD * 3 + MW + SIDE; c.height = modo === 'venuta' ? 2 * (MH + HEAD + 18) + 60 : modo === 'opzioni' ? Math.round(70 + (Z0[3] - Z0[1]) * ((c.width - 3 * PAD) / 2) / (Z0[2] - Z0[0]) + 90) : 2 * (MH + HEAD + 18) + 60;
    x.fillStyle = '#f7f4ee'; x.fillRect(0, 0, c.width, c.height);

    if (modo === 'venuta') {
      const V = d.venuta, t0 = await img(V.base0), t1 = await img(V.base1);
      const metri = m => ['lit', 'viale', 'via', 'vicolo'].map(lv => LIV[lv].nome.split(' ·')[0] + ' ' + Math.round(m[lv] || 0) + ' m').join(' · ');
      pianta(t0, 'PRIMA — la rete del gioco al commit di partenza');
      ['vicolo', 'via', 'viale', 'lit'].forEach(lv => V.prima.filter(r => r.liv === lv).forEach(r => strada(r.pts, lv))); binari();
      sTxt(metri(V.m0), OX, OY + MH + 18, '#333', 12);
      let X = OX + MW + PAD, Y = OY + 8; ['lit', 'viale', 'via', 'vicolo'].forEach(lv => { const L = LIV[lv]; x.fillStyle = L.bordo; x.fillRect(X, Y - 9, 40, L.w * 1.6 + 2); x.fillStyle = L.col; x.fillRect(X, Y - 8, 40, L.w * 1.6); sTxt(L.nome, X + 50, Y + 2, '#222', 12, lv === 'lit'); Y += 22; });
      sTxt('case sulla spianata (1462-1504 × 250-340): ' + V.case0, X, Y + 10, '#333', 13);
      OY += MH + HEAD + 40;
      pianta(t1, 'DOPO — la rete del gioco adesso ([pianta]): l\'anello sul mare, la spianata costruita');
      ['vicolo', 'via', 'viale', 'lit'].forEach(lv => V.dopo.filter(r => r.liv === lv).forEach(r => strada(r.pts, lv))); binari();
      V.parapetti.forEach(([a, b2, tp]) => line([a, b2], 2.2, tp === 'guardrail' ? '#555' : '#1a1a1a'));
      V.stalli.forEach(([a, b2]) => { const [px, py] = P(a, b2); x.fillStyle = '#2a5aa0'; x.fillRect(px - 2.5, py - 2.5, 5, 5); });
      line(V.giro, 2.4, '#c0392b', null, 'round'); V.fermate.forEach(([a, b2]) => dot(a, b2, 4.2, '#fff', '#c0392b'));
      sTxt(metri(V.m1), OX, OY + MH + 18, '#333', 12);
      X = OX + MW + PAD; Y = OY + 8;
      x.strokeStyle = '#c0392b'; x.lineWidth = 3; x.beginPath(); x.moveTo(X, Y - 4); x.lineTo(X + 40, Y - 4); x.stroke(); sTxt('Linea 1: ' + [...new Set(V.nomi.map(n => n.replace(/ di Tramontana| della Spianata/, '')))].join(' – '), X + 50, Y, '#222', 12); Y += 20;
      sTxt(V.fermate.length + ' fermate (i due versi)', X + 50, Y, '#222', 12); Y += 22;
      x.fillStyle = '#2a5aa0'; x.fillRect(X + 17, Y - 8, 6, 6); sTxt(V.stalli.length + ' stalli di sosta lungo le vie (prima 6)', X + 50, Y, '#222', 12); Y += 22;
      x.strokeStyle = '#1a1a1a'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(X, Y - 4); x.lineTo(X + 40, Y - 4); x.stroke(); sTxt('parapetti sul mare (' + V.parapetti.filter(q => q[2] !== 'guardrail').length + ' tratti)', X + 50, Y, '#222', 12); Y += 20;
      x.strokeStyle = '#555'; x.beginPath(); x.moveTo(X, Y - 4); x.lineTo(X + 40, Y - 4); x.stroke(); sTxt('guardrail verso la ferrovia (' + V.parapetti.filter(q => q[2] === 'guardrail').length + ')', X + 50, Y, '#222', 12); Y += 26;
      sTxt('case sulla spianata (1462-1504 × 250-340): ' + V.case1, X, Y, '#333', 13);
      return c.toDataURL('image/png').split(',')[1];
    }
    if (modo === 'tavola') {
      // ===== OGGI =====
      pianta(tO, 'OGGI — la rete com\'è nel gioco (?cittanuova)');
      ['vicolo', 'via', 'viale', 'lit'].forEach(lv => d.oggi.filter(r => r.liv === lv).forEach(r => strada(r.pts, lv)));
      binari();
      d.strettoia.forEach(([a, b2]) => dot(a, b2 - 2, 2.2, '#c0392b'));
      d.PROBLEMI.forEach((p, i) => { const [a, b2] = P(p.x, p.y); x.beginPath(); x.arc(a, b2, p.r * S, 0, 6.3); x.lineWidth = 2.5; x.strokeStyle = '#c0392b'; x.setLineDash([6, 4]); x.stroke(); x.setLineDash([]);
        x.beginPath(); x.arc(a + p.r * S * .72, b2 - p.r * S * .72, 10, 0, 6.3); x.fillStyle = '#c0392b'; x.fill(); sTxt(String(i + 1), a + p.r * S * .72, b2 - p.r * S * .72 + 4, '#fff', 12, true, 'center'); });
      // le note dei problemi, sotto la pianta
      let ly = OY + MH + 16; x.font = '12px sans-serif';
      d.PROBLEMI.forEach((p, i) => { const X = OX + (i % 3) * 330, Y = ly + Math.floor(i / 3) * 16; sTxt((i + 1) + '. ' + p.t, X, Y, '#7a1f12', 12); });
      sTxt('• i punti rossi lungo i binari: meno di 9 m fra la ferrovia e il mare (' + d.strettoia.length + ' su 52 campioni)', OX + 0, ly + 34, '#7a1f12', 12);
      ['lit', 'viale', 'via', 'vicolo'].forEach((lv, i) => { const n = d.oggi.filter(r => r.liv === lv), L = Math.round(n.reduce((s, r) => s + r.pts.reduce((a, q, k) => k ? a + Math.hypot(q[0] - r.pts[k - 1][0], q[1] - r.pts[k - 1][1]) : 0, 0), 0)); sTxt(LIV[lv].nome.split(' ·')[0] + ': ' + n.length + ' (' + L + ' m)', OX + MW + PAD, OY + 20 + i * 18, '#333', 13, lv === 'lit'); });
      sTxt('Oggi le auto girano solo su Corso, Vittoria e', OX + MW + PAD, OY + 110, '#333', 13); sTxt('Via della Stazione: le costiere si fermano alla', OX + MW + PAD, OY + 128, '#333', 13);
      sTxt('stazione e allo Scalo; la Marina e la Rua sono', OX + MW + PAD, OY + 146, '#333', 13); sTxt('vicoli da 5 m. Una linea di bus, 6 stalli.', OX + MW + PAD, OY + 164, '#333', 13);
      sTxt('Fra binari e mare non passa niente: la ferrovia', OX + MW + PAD, OY + 192, '#333', 13); sTxt('corre sugli scogli e le case le stanno addosso.', OX + MW + PAD, OY + 210, '#333', 13);
      sTxt('A levante la città si ferma alla Passeggiata:', OX + MW + PAD, OY + 238, '#333', 13); sTxt('poi la spianata vuota, il recinto e la Rocca.', OX + MW + PAD, OY + 256, '#333', 13);
      OY += MH + HEAD + 40;
    }
    // ===== PROGETTO =====
    if (modo === 'tavola') pianta(tP, modo === 'tavola' ? 'PROGETTO — la gerarchia delle strade, l\'anello sul mare, la spianata ricucita' : 'Le due letture di «potresti metterlo lì l\'arco che rimane sul mare»');
    const progetto = (opz) => {
      // la costa rifatta
      d.COSTA_NUOVA.forEach(q => { if (q.k === 'scogliera') { line(q.pts, 4.5 * S, '#8f8a82'); line(q.pts, 1.5 * S, '#b8b2a8', [3, 3]); } else line(q.pts, 5 * S, '#ead9a8'); });
      // la spianata: isolati e piazza
      d.ISOLATI.forEach(q => { poly(q.pts, '#cdb69a', '#6a5440', 1.4); const m = q.pts.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]); txt(q.piani + 'p', m[0], m[1] + 1, '#4a3828', 10, true, 'center'); });
      poly(d.PIAZZA_ROCCA, '#efe2c4', '#9a7a4a', 1.4);
      if (opz === 'A') { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) poly([[1477 + i * 5, 323 + j * 7], [1480.5 + i * 5, 323 + j * 7], [1480.5 + i * 5, 326 + j * 7], [1477 + i * 5, 326 + j * 7]], '#e07a3a', '#7a3a10', 1); txt('mercato all\'aperto', 1482.5, 337, '#7a3a10', 11, true, 'center'); }
      else if (opz === 'B') { const [a, b2] = P(1482.5, 327); x.fillStyle = '#7a6a58'; x.fillRect(a - 7 * S, b2 - 2 * S, 3 * S, 4 * S); x.fillRect(a + 4 * S, b2 - 2 * S, 3 * S, 4 * S); x.fillRect(a - 7 * S, b2 - 2 * S, 14 * S, 1.2 * S); txt('l\'arco', 1482.5, 334, '#4a3a28', 11, true, 'center'); }
      else txt('Piazza della Rocca', 1482.5, 330, '#7a5a2a', 11, true, 'center');
      // le strade per livello
      d.PRJ.vicolo.forEach(r => strada(r.pts, 'vicolo')); d.PRJ.via.forEach(r => strada(r.pts, 'via', r)); d.PRJ.viale.forEach(r => strada(r.pts, 'viale', r)); d.PRJ.lit.forEach(r => strada(r.pts, 'lit', r));
      binari();
      // il guardrail fra la ferrovia e il lungomare; il parapetto sul mare
      line(d.PRJ.lit[0].pts.slice(5, -3).map(([a, b2]) => [a, b2 + 5]), 1.6, '#555', [2, 2]);
      // il mercato ridotto e la porta ridotta
      { const [ox, oy, r] = d.octa; const ot = rr => { const p = []; for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4; p.push([ox + Math.cos(a) * rr, oy + Math.sin(a) * rr]); } return p; };
        poly(ot(r), null, '#9a7a4a', 1); poly(ot(opz === 'A' ? 0 : 7.5), '#7fae8a', '#2f5a3a', 1.6);
        if (opz !== 'A') txt('tettoia 15 m', ox, oy + 2, '#1e3a24', 10, true, 'center'); else txt('piazza alberata', ox, oy + 2, '#1e3a24', 10, true, 'center');
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; dot(ox + Math.cos(a) * 12.5, oy + Math.sin(a) * 12.5, 2.4, '#4a7a3a'); } }
      if (opz !== 'B') { const [px, py] = d.porta; poly([[px - 4.5, py - 3], [px + 4.5, py - 3], [px + 4.5, py + 3], [px - 4.5, py + 3]], '#a89272', '#4a3a28', 1.4); txt('Porta 9 m', px, py - 5, '#4a3a28', 10, true, 'center'); }
      else txt('(la Porta di Terra torna alla cinta: resta solo il varco)', d.porta[0] + 6, d.porta[1] - 5, '#4a3a28', 10, false);
      // bus
      d.BUS.forEach(L => { line(L.pts.map(([a, b2]) => [a + L.dx, b2 + L.dx]), 2.4, L.col, L.tratteggio ? [8, 5] : null, 'round'); L.fermate.forEach(([a, b2, n]) => { dot(a + L.dx, b2 + L.dx, 4.2, '#fff', L.col); }); });
      // parcheggi
      d.PARK.forEach(p => { if (p.w) poly([[p.x - p.w / 2, p.y - p.h / 2], [p.x + p.w / 2, p.y - p.h / 2], [p.x + p.w / 2, p.y + p.h / 2], [p.x - p.w / 2, p.y + p.h / 2]], 'rgba(40,90,170,.18)', '#2a5aa0', 1.2);
        const [a, b2] = P(p.x, p.y); x.fillStyle = '#2a5aa0'; x.fillRect(a - 8, b2 - 8, 16, 16); sTxt('P', a, b2 + 5, '#fff', 13, true, 'center'); txt(p.n + '', p.x + 3.5, p.y + 1.5, '#2a5aa0', 10, true); });
      // le sezioni: il segno sulla pianta
      d.SEZIONI.forEach((s, i) => { dot(s.x, s.y, 7, '#1a1a1a'); txt('S' + (i + 1), s.x, s.y + 1.3, '#fff', 10, true, 'center'); });
      // i nomi
      d.PRJ.lit.forEach(r => r.nome.startsWith('Cost') || etich(r.pts, r.nome, '#5a3210', 12, r.nome === 'Via del Lido' ? .6 : .45));
      d.PRJ.viale.forEach(r => etich(r.pts, r.nome, '#7a5a10', 11, r.nome === 'Via della Vittoria' ? .35 : r.nome.startsWith('Corso') ? .75 : .5)); d.PRJ.via.filter(r => r.nuova).forEach(r => etich(r.pts, r.nome, '#6a5430', 10, .3));
    };
    if (modo === 'tavola') {
      progetto('');
      // la legenda e i numeri a destra
      let X = OX + MW + PAD, Y = OY + 8; const voce = (lv, t) => { const L = LIV[lv]; x.fillStyle = L.bordo; x.fillRect(X, Y - 9, 40, L.w * 1.6 + 2); x.fillStyle = L.col; x.fillRect(X, Y - 8, 40, L.w * 1.6); sTxt(t || L.nome, X + 50, Y + 2, '#222', 12, lv === 'lit'); Y += 22; };
      ['lit', 'viale', 'via', 'vicolo'].forEach(lv => voce(lv));
      x.setLineDash([6, 5]); x.strokeStyle = '#333'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(X, Y - 4); x.lineTo(X + 40, Y - 4); x.stroke(); x.setLineDash([]); sTxt('strada nuova o allargata', X + 50, Y, '#222', 12); Y += 22;
      d.BUS.forEach(L => { x.strokeStyle = L.col; x.lineWidth = 3; x.setLineDash(L.tratteggio ? [8, 5] : []); x.beginPath(); x.moveTo(X, Y - 4); x.lineTo(X + 40, Y - 4); x.stroke(); x.setLineDash([]); sTxt(L.nome + (L.fermate.length ? ' (' + L.fermate.length + ' fermate)' : ''), X + 50, Y, '#222', 12); Y += 20; });
      x.fillStyle = '#2a5aa0'; x.fillRect(X + 12, Y - 13, 16, 16); sTxt('P', X + 20, Y, '#fff', 13, true, 'center'); sTxt('parcheggi: ' + d.PARK.reduce((s, p) => s + p.n, 0) + ' posti (oggi 6)', X + 50, Y, '#222', 12); Y += 22;
      x.fillStyle = '#8f8a82'; x.fillRect(X, Y - 10, 40, 10); sTxt('costa rifatta: scogliera di massi, spiaggia', X + 50, Y, '#222', 12); Y += 22;
      x.fillStyle = '#cdb69a'; x.fillRect(X, Y - 10, 40, 10); x.strokeStyle = '#6a5440'; x.strokeRect(X, Y - 10, 40, 10); sTxt('isolati nuovi sulla spianata (piani)', X + 50, Y, '#222', 12); Y += 30;
      // le sezioni tipo
      sTxt('Le sezioni tipo (in scala, metri)', X, Y, '#1a1a1a', 14, true); Y += 14;
      d.SEZIONI.forEach((s, i) => { const tot = s.fasce.reduce((a, f) => a + f[1], 0), k = Math.min(15, (SIDE - 20) / tot); let xx = X; Y += 14; sTxt(s.nome, X, Y, '#222', 12, true); Y += 6;
        s.fasce.forEach(([n, w, col]) => { x.fillStyle = col; x.fillRect(xx, Y, w * k, 16); x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(xx, Y, w * k, 16); if (n.startsWith('carreggiata')) { x.strokeStyle = '#fff'; x.setLineDash([4, 3]); x.beginPath(); x.moveTo(xx + w * k / 2, Y + 8); x.lineTo(xx + w * k / 2, Y + 8.01); x.stroke(); x.beginPath(); x.moveTo(xx + w * k / 2, Y + 1); x.lineTo(xx + w * k / 2, Y + 15); x.stroke(); x.setLineDash([]); } xx += w * k; });
        xx = X; let alt = 0; s.fasce.forEach(([n, w]) => { x.save(); x.translate(xx + w * k / 2, Y + 20); x.rotate(.62); sTxt(n + (n.match(/\d/) ? '' : ' ' + String(w).replace('.', ',')), 0, 4, '#444', 9.5); x.restore(); xx += w * k; alt++; });
        Y += 70; });
      sTxt('Gli incroci: tutte le strade finiscono su un\'altra strada, in una piazza o contro una chiusura scritta (scala, porta, affaccio):', OX, OY + MH + 18, '#333', 12);
      sTxt('l\'anello sul mare passa la Vittoria con un incrocio vero a croce (Viale della Spianata – Via del Lido); niente vicoli ciechi senza un perché.', OX, OY + MH + 34, '#333', 12);
    } else {
      // le due opzioni affiancate: la stessa pianta, due varianti, ingrandite sulla spianata e sul Mercato
      const zone = [['A', 'A · «metterlo lì» = il mercato sulla spianata', 'Il mercato coperto lascia l\'ottagono (resta una piazza alberata) e scende sulla Piazza della Rocca come mercato all\'aperto, coi banchi; la Porta di Terra resta dov\'è, ridotta a 9 m.'],
        ['B', 'B · «l\'arco che rimane sul mare» = l\'arco sulla spianata', 'La Porta di Terra, ridotta, diventa l\'arco della Piazza della Rocca verso il mare e la Rocca; il mercato resta nell\'ottagono con una tettoia di 15 m invece di 28.']];
      x.clearRect(OX, OY - 30, MW + SIDE, MH + 40); x.fillStyle = '#f7f4ee'; x.fillRect(0, 0, c.width, c.height);
      const ZW = (c.width - 3 * PAD) / 2, ZS = ZW / (Z0[2] - Z0[0]);
      zone.forEach(([opz, tit, desc], i) => { const sx = PAD + i * (ZW + PAD), sy = 70; x.save(); x.beginPath(); x.rect(sx, sy, ZW, (Z0[3] - Z0[1]) * ZS); x.clip();
        const oldS = d.F.s; d.F.s = ZS; OX = sx - (Z0[0] - d.F.x0) * ZS; OY = sy - (Z0[1] - d.F.y0) * ZS; const S2 = ZS;
        x.imageSmoothingEnabled = false; x.drawImage(tP, OX, OY, (d.F.x1 - d.F.x0) * S2, (d.F.y1 - d.F.y0) * S2); x.imageSmoothingEnabled = true; progetto(opz); x.restore(); d.F.s = oldS;
        x.strokeStyle = '#999'; x.strokeRect(sx, sy, ZW, (Z0[3] - Z0[1]) * ZS); sTxt(tit, sx, sy - 12, '#1a1a1a', 17, true);
        const words = desc.split(' '); let ln = '', yy = sy + (Z0[3] - Z0[1]) * ZS + 24; words.forEach(w => { if ((ln + w).length > 95) { sTxt(ln, sx, yy, '#333', 13); yy += 18; ln = ''; } ln += w + ' '; }); sTxt(ln, sx, yy, '#333', 13); });
    }
    return c.toDataURL('image/png').split(',')[1];
  }, [dati, modo]);
  if (process.env.PIANTA_SOLO_VENUTA !== '1') fs.writeFileSync(path.join(OUT, 'tavola_viabilita.png'), Buffer.from(await disegna('tavola'), 'base64'));
  if (process.env.PIANTA_SOLO_VENUTA !== '1') fs.writeFileSync(path.join(OUT, 'opzioni_spianata.png'), Buffer.from(await disegna('opzioni'), 'base64'));
  if (dati.venuta) fs.writeFileSync(path.join(OUT, 'venuta.png'), Buffer.from(await disegna('venuta'), 'base64'));
  log('tavola', path.join(OUT, 'tavola_viabilita.png'), 'strettoie', dati.strettoia.length);
  await b.close();
})();
