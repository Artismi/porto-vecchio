/* Porto Vecchio — logica di gioco (nessuna grafica).
   Mondo in metri: x verso est, y verso sud. Una casella = 2 m. */
var Game = (function () {
  'use strict';
  const TS = 2, GW = 150, GH = 100, WW = GW * TS, WH = GH * TS;
  const MIN_PER_SEC = 2.5, DEBT = 500, START_T = 18 * 60, END_T = 54 * 60;
  const PLAYER_NAME = 'Nino';

  function makeRng(seed) { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // ---------------- MAPPA ----------------
  // L'isola di Porto Vecchio, disegnata attorno alle strade. Il borgo storico (CORE, coi suoi caruggi) sta sul porto,
  // in basso al centro; a nord sale la collina col Santuario (tornanti); a ovest il Ponente (rotonda, cinema, discoteca,
  // distributore, cantiere, marina, faro); a est il Lungomare dritto con gli hotel e la spiaggia, e il ponte verso la
  // terraferma. La litoranea gira tutta l'isola ad anello. Il terreno è una superficie continua (quote negli spigoli
  // delle caselle, MAP.hc): per la logica conta solo la griglia (percorribile o no).
  const T = { COB: 0, VIA: 1, BLD: 2, PIAZZA: 3, WATER: 4, QUAY: 5, FOUNT: 6, PIER: 7, SAND: 8, GRASS: 9, STAIRS: 10, WALK: 11, ROCK: 12 };
  const OX = 46, OY = 46; // posizione del borgo storico (in caselle)
  // zone (per la grafica): 0 campagna, 1 borgo, 2 Ponente, 3 Lungomare, 4 collina, 5 porto, 6 spiaggia
  const Z = { NAT: 0, BORGO: 1, PONENTE: 2, LUNGO: 3, COLLE: 4, PORTO: 5, SPIAGGIA: 6 };
  const CORE = [
    { id: 'casa_a1', x: 0, y: 0, w: 4, h: 7, fl: 5, style: 0 },
    { id: 'bar', name: 'Bar Da Gino', x: 4, y: 0, w: 4, h: 7, fl: 6, style: 1, door: [6, 7], sign: { t: 'BAR GINO', c: '#ff4fa3' }, shop: true },
    { id: 'stella', name: 'Condominio Stella', x: 10, y: 0, w: 4, h: 7, fl: 7, style: 2, door: [12, 7], home: true },
    { id: 'flipper', name: 'Sala giochi Flipper', x: 14, y: 0, w: 4, h: 7, fl: 4, style: 3, door: [16, 7], sign: { t: 'FLIPPER', c: '#35e6ff' } },
    { id: 'chiesa', name: 'Chiesa di San Rocco', x: 20, y: 0, w: 10, h: 6, fl: 5, style: 9, door: [24, 6], church: true, home: true },
    { id: 'aurora', name: 'Condominio Aurora', x: 32, y: 0, w: 6, h: 7, fl: 6, style: 4, door: [34, 7], home: true },
    { id: 'casa_a5', x: 40, y: 0, w: 4, h: 7, fl: 5, style: 5 },
    { id: 'casa_b1', x: 0, y: 9, w: 4, h: 6, fl: 4, style: 6 },
    { id: 'wu', name: 'Alimentari Wu', x: 4, y: 9, w: 4, h: 6, fl: 5, style: 7, door: [6, 8], sign: { t: '吳 ALIMENTARI', c: '#ff3b3b' }, shop: true, lanterns: true },
    { id: 'ambulatorio', name: 'Ambulatorio', x: 10, y: 9, w: 4, h: 6, fl: 3, style: 8, door: [12, 15], sign: { t: '✚ AMBULATORIO', c: '#4dff9a' } },
    { id: 'biblioteca', name: 'Biblioteca civica', x: 14, y: 9, w: 4, h: 6, fl: 4, style: 2, door: [18, 11] },
    { id: 'mare', name: 'Condominio Mare', x: 32, y: 9, w: 6, h: 6, fl: 6, style: 0, door: [34, 15], home: true },
    { id: 'casa_b5', x: 40, y: 9, w: 4, h: 6, fl: 4, style: 1 },
    { id: 'commissariato', name: 'Commissariato', x: 0, y: 18, w: 8, h: 5, fl: 3, style: 10, door: [4, 23], sign: { t: 'POLIZIA', c: '#3b82ff' } },
    { id: 'officina', name: 'Officina di Beppe', x: 10, y: 18, w: 4, h: 5, fl: 2, style: 3, door: [12, 23], sign: { t: 'VESPE', c: '#ffd23b' } },
    { id: 'casa_c2', x: 14, y: 18, w: 4, h: 5, fl: 5, style: 4 },
    { id: 'osteria', name: 'Osteria del Porto', x: 20, y: 18, w: 10, h: 5, fl: 4, style: 5, door: [24, 23], sign: { t: 'OSTERIA', c: '#ffb35c' } },
    { id: 'miramare', name: 'Hotel Miramare', x: 32, y: 18, w: 6, h: 5, fl: 7, style: 6, door: [34, 23], sign: { t: 'MIRAMARE', c: '#ff7ad9' }, deco: true },
    { id: 'casa_c5', x: 40, y: 18, w: 4, h: 5, fl: 4, style: 8 },
    { id: 'magazzino', name: 'Magazzino Neri', x: 36, y: 27, w: 8, h: 3, fl: 3, style: 11, door: [35, 28], sign: { t: 'NERI', c: '#ff6a3b' }, warehouse: true },
  ];
  const BUILDINGS = CORE.map(b => Object.assign({}, b, { x: b.x + OX, y: b.y + OY, zone: 'borgo' }, b.door ? { door: [b.door[0] + OX, b.door[1] + OY] } : {}));
  BUILDINGS.push(
    // Ponente: la discoteca in cima alla pineta, il viale del cinema, la rotonda col distributore
    { id: 'disco', name: 'Discoteca Luna', x: 15, y: 26, w: 9, h: 4, fl: 3, style: 12, door: [19, 30], sign: { t: 'LUNA', c: '#c05cff' }, deco: true, zone: 'ponente' },
    { id: 'cinema', name: 'Cinema Astor', x: 14, y: 38, w: 8, h: 6, fl: 4, style: 13, door: [18, 44], sign: { t: 'CINEMA ASTOR', c: '#ffd23b' }, deco: true, zone: 'ponente' },
    { id: 'casa_w1', x: 23, y: 38, w: 4, h: 4, fl: 5, style: 14, zone: 'ponente' },
    { id: 'benzina', name: 'Distributore', x: 25, y: 52, w: 3, h: 3, fl: 1, style: 16, door: [26, 55], sign: { t: 'BENZINA', c: '#ffd23b' }, kiosk: true, zone: 'ponente' },
    { id: 'sirena', name: 'Bar Sirena', x: 38, y: 56, w: 5, h: 4, fl: 3, style: 17, door: [40, 55], sign: { t: 'BAR SIRENA', c: '#35ffc0' }, shop: true, deco: true, zone: 'ponente' },
    // Ponente: il porto di ponente
    { id: 'cantiere', name: 'Cantiere navale', x: 7, y: 80, w: 6, h: 3, fl: 3, style: 11, door: [10, 83], warehouse: true, zone: 'cantiere', sign: { t: 'CANTIERE', c: '#ff8a3b' } },
    { id: 'faro', name: 'Faro di Punta Scogli', x: 5, y: 87, w: 2, h: 2, fl: 6, style: 9, lighthouse: true },
    // la collina: il Santuario in cima, le case attorno al piazzale
    { id: 'santuario', name: 'Santuario del Mare', x: 70, y: 15, w: 8, h: 3, fl: 4, style: 9, door: [73, 18], church: true, zone: 'alta' },
    { id: 'alta_1', x: 58, y: 14, w: 4, h: 3, fl: 4, style: 18, zone: 'alta' },
    { id: 'alta_2', x: 63, y: 14, w: 4, h: 3, fl: 5, style: 19, zone: 'alta' },
    { id: 'alta_3', x: 80, y: 16, w: 3, h: 3, fl: 4, style: 5, zone: 'alta' },
    { id: 'alta_4', x: 84, y: 15, w: 4, h: 3, fl: 6, style: 20, zone: 'alta' },
    { id: 'alta_5', x: 52, y: 14, w: 3, h: 3, fl: 4, style: 1, zone: 'alta' },
    // la collina: le case lungo il primo tratto dei tornanti, con la trattoria
    { id: 'car_1', x: 46, y: 36, w: 6, h: 3, fl: 5, style: 21, zone: 'alta' },
    { id: 'car_2', x: 54, y: 36, w: 6, h: 3, fl: 6, style: 0, zone: 'alta', door: [57, 39], name: 'Trattoria da Nina', sign: { t: 'TRATTORIA', c: '#ffb35c' }, shop: true },
    { id: 'car_3', x: 62, y: 36, w: 5, h: 3, fl: 5, style: 22, zone: 'alta' },
    { id: 'car_4', x: 69, y: 36, w: 5, h: 3, fl: 6, style: 8, zone: 'alta' },
    { id: 'car_5', x: 76, y: 36, w: 4, h: 3, fl: 5, style: 19, zone: 'alta' },
    // il Lungomare (art déco), di fronte alla spiaggia
    { id: 'video', name: 'Videoteca Stella', x: 106, y: 30, w: 5, h: 4, fl: 3, style: 27, door: [111, 32], sign: { t: 'VIDEO 2000', c: '#ff5a5a' }, deco: true, zone: 'lungo' },
    { id: 'flamingo', name: 'Hotel Flamingo', x: 104, y: 35, w: 7, h: 6, fl: 5, style: 23, door: [111, 38], sign: { t: 'FLAMINGO', c: '#ff4fa3' }, deco: true, zone: 'lungo' },
    { id: 'paradiso', name: 'Hotel Paradiso', x: 104, y: 42, w: 7, h: 6, fl: 6, style: 24, door: [111, 45], sign: { t: 'PARADISO', c: '#35e6ff' }, deco: true, zone: 'lungo' },
    { id: 'gelateria', name: 'Gelateria Polo Nord', x: 106, y: 49, w: 5, h: 4, fl: 2, style: 25, door: [111, 51], sign: { t: 'GELATI', c: '#8affd0' }, deco: true, shop: true, zone: 'lungo' },
    { id: 'oceano', name: 'Hotel Oceano', x: 104, y: 54, w: 7, h: 6, fl: 7, style: 26, door: [111, 57], sign: { t: 'OCEANO', c: '#b28cff' }, deco: true, zone: 'lungo' },
    { id: 'gabbiano', name: 'Pensione Gabbiano', x: 96, y: 60, w: 5, h: 4, fl: 4, style: 15, door: [101, 62], sign: { t: 'PENSIONE', c: '#35e6ff' }, zone: 'lungo' },
    { id: 'chiosco', name: 'Bagni Lido', x: 125, y: 44, w: 4, h: 2, fl: 1, style: 28, door: [126, 46], sign: { t: 'BAGNI LIDO', c: '#ff9a3c' }, kiosk: true, zone: 'spiaggia' },
  );

  // --- strade: curve (Catmull-Rom) per punti in metri, larghezza in metri ---
  const ROAD_DEF = [
    { id: 'litoranea', name: 'Litoranea', w: 10, ws: [8, 8, 8, 8, 8], closed: true, traffic: true, pts: [[92, 142], [112, 142], [136, 142], [160, 142], [180, 142], [204, 139], [224, 128], [234, 110], [237, 90], [237, 72], [233, 54], [220, 36], [200, 26], [180, 22], [160, 12], [136, 14], [114, 8], [92, 12], [70, 10], [48, 20], [28, 40], [20, 62], [20, 84], [29, 104], [46, 124], [70, 138]] },
    { id: 'tornanti', name: 'Salita del Santuario', w: 8, pts: [[64, 96], [74, 90], [96, 85], [130, 84], [168, 84], [186, 82], [196, 76], [198, 66], [190, 59], [172, 56], [140, 56], [112, 54], [100, 48], [104, 42], [122, 40], [146, 42]],
      hs: [.3, .4, .6, 1.2, 2.4, 3.2, 4.2, 5.2, 6, 7.2, 9, 10.6, 11.6, 12.3, 13.8, 15] },
    { id: 'viale', name: 'Viale del Cinema', w: 8, pts: [[56, 96], [40, 96], [20, 96]] },
    { id: 'pini', name: 'Via dei Pini', w: 8, pts: [[64, 86], [66, 74], [76, 62], [72, 48], [60, 36], [52, 26], [48, 20]] },
    { id: 'raccordo', name: 'Via della Rotonda', w: 8, pts: [[64, 104], [60, 116], [50, 126]] },
    { id: 'ponte', name: 'Ponte della Terraferma', w: 10, bridge: true, pts: [[236, 64], [252, 62], [272, 60], [300, 60]] },
    { id: 'porto', name: 'Via del Cantiere', w: 8, pts: [[30, 106], [38, 128], [40, 150], [36, 162]] },
  ];
  // la rotonda: un anello attorno all'aiuola
  const RB = { x: 64, y: 96, r: 10 };
  ROAD_DEF.push({ id: 'rotonda', name: 'Rotonda', w: 7, closed: true, pts: Array.from({ length: 12 }, (_, k) => [RB.x + Math.cos(k / 12 * Math.PI * 2) * RB.r, RB.y + Math.sin(k / 12 * Math.PI * 2) * RB.r]) });
  function sampleRoad(R) {
    const P = R.pts, n = P.length, out = [], hs = [], wsa = [];
    const wAt = i => R.ws && R.ws[(i + n) % n] !== undefined ? R.ws[(i + n) % n] : R.w;
    const get = i => R.closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))];
    const segs = R.closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2), L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), m = Math.max(2, Math.ceil(L));
      for (let k = 0; k < m; k++) {
        const t = k / m, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        if (R.hs) hs.push(R.hs[i] + (R.hs[Math.min(R.hs.length - 1, i + 1)] - R.hs[i]) * t);
        wsa.push(wAt(i) + (wAt(R.closed ? i + 1 : Math.min(n - 1, i + 1)) - wAt(i)) * t);
      }
    }
    if (!R.closed) { out.push(P[n - 1].slice()); if (R.hs) hs.push(R.hs[n - 1]); wsa.push(wAt(n - 1)); }
    const len = [0]; for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    const total = len[len.length - 1] + (R.closed ? Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) : 0);
    return { id: R.id, name: R.name, w: R.w, ws: wsa, closed: !!R.closed, traffic: !!R.traffic, bridge: !!R.bridge, pts: out, len, total, h: R.hs ? hs : null };
  }
  const ROADS = ROAD_DEF.map(sampleRoad);
  // punto più vicino su una strada: { i, d, s, x, y }
  function nearestOnRoad(R, x, y) {
    let best = { i: 0, d: 1e9 };
    for (let i = 0; i < R.pts.length; i++) { const d = (R.pts[i][0] - x) ** 2 + (R.pts[i][1] - y) ** 2; if (d < best.d) best = { i, d }; }
    best.d = Math.sqrt(best.d); best.s = R.len[best.i]; best.x = R.pts[best.i][0]; best.y = R.pts[best.i][1]; return best;
  }
  // posizione e direzione a una certa distanza lungo la strada
  function roadAt(R, s) {
    if (R.closed) s = ((s % R.total) + R.total) % R.total; else s = Math.max(0, Math.min(R.len[R.len.length - 1], s));
    let lo = 0, hi = R.len.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (R.len[m] <= s) lo = m; else hi = m - 1; }
    const a = R.pts[lo], b = R.pts[(lo + 1) % R.pts.length], seg = (lo + 1 < R.len.length ? R.len[lo + 1] : R.total) - R.len[lo], k = seg > 0 ? (s - R.len[lo]) / seg : 0;
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), s };
  }

  // --- costa: poligono in metri ---
  const COAST = [[16, 20], [40, 8], [80, 4], [130, 2], [180, 4], [220, 10], [248, 24], [262, 44], [266, 58], [272, 70], [282, 90], [286, 118], [282, 140], [270, 152], [250, 157], [226, 155], [208, 158], [212, 176], [200, 182], [186, 168], [180, 166],
    [92, 166], [84, 172], [80, 186], [66, 190], [60, 178], [46, 172], [30, 178], [22, 186], [10, 178], [4, 150], [6, 110], [4, 70], [8, 40]];
  function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }

  const grid = new Uint8Array(GW * GH).fill(T.WATER), bIndex = new Int16Array(GW * GH).fill(-1), zone = new Uint8Array(GW * GH);
  const elev = new Float32Array(GW * GH), rampOf = new Int16Array(GW * GH).fill(-1), wallAt = new Uint8Array(GW * GH);
  const HW = GW + 1, hc = new Float32Array(HW * (GH + 1)); // quote negli spigoli delle caselle
  const bridgeAt = new Uint8Array(GW * GH);
  const setT = (x, y, v) => { if (x >= 0 && y >= 0 && x < GW && y < GH) grid[y * GW + x] = v; };
  const rect = (x, y, w, h, v) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(i, j, v); };
  const rectZ = (x, y, w, h, z) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < GW && j < GH) zone[j * GW + i] = z; };
  const RAMPS = [];
  const ramp = (x, y, w, h, axis, h0, h1, stairs) => { const r = { x, y, w, h, axis, h0, h1, stairs: stairs !== false }; RAMPS.push(r); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { rampOf[j * GW + i] = RAMPS.length - 1; wallAt[j * GW + i] = 0; if (r.stairs) setT(i, j, T.STAIRS); } };

  // 1) terra e mare
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) if (inPoly(COAST, tx * TS + 1, ty * TS + 1)) grid[ty * GW + tx] = T.GRASS;
  // 2) zone abitate
  rectZ(8, 22, 38, 52, Z.PONENTE); rectZ(98, 24, 18, 46, Z.LUNGO); rectZ(116, 24, 30, 56, Z.SPIAGGIA); rectZ(40, 8, 60, 38, Z.COLLE); rectZ(100, 8, 16, 16, Z.COLLE);
  rectZ(4, 74, 42, 26, Z.PORTO); rectZ(OX, OY, 44, 37, Z.BORGO);
  for (let i = 0; i < GW * GH; i++) if (grid[i] === T.GRASS && (zone[i] === Z.PONENTE || zone[i] === Z.LUNGO)) grid[i] = T.COB;
  // pineta e giardini restano a prato
  rect(8, 22, 18, 16, T.GRASS); rect(10, 60, 14, 10, T.GRASS); rect(28, 44, 6, 6, T.GRASS);
  // spiaggia: dalla passeggiata al mare
  for (let ty = 24; ty < 80; ty++) for (let tx = 119; tx < GW; tx++) { const i = ty * GW + tx; if (grid[i] !== T.WATER) { grid[i] = T.SAND; zone[i] = Z.SPIAGGIA; } }
  // porto di ponente: banchine e scalo del cantiere
  for (let ty = 74; ty < GH; ty++) for (let tx = 4; tx < 46; tx++) { const i = ty * GW + tx; if (grid[i] !== T.WATER) grid[i] = T.QUAY; }
  // 3) strade (sopra il mare diventano ponte); marciapiedi nelle zone abitate
  const roadDist = new Float32Array(GW * GH).fill(1e9), roadOf = new Int8Array(GW * GH).fill(-1);
  ROADS.forEach((R, ri) => {
    for (let k = 0; k < R.pts.length; k++) {
      const [px, py] = R.pts[k], hw = R.ws[k] / 2, rr = hw + 3, t0x = Math.floor((px - rr) / TS), t1x = Math.floor((px + rr) / TS), t0y = Math.floor((py - rr) / TS), t1y = Math.floor((py + rr) / TS);
      for (let ty = Math.max(0, t0y); ty <= Math.min(GH - 1, t1y); ty++) for (let tx = Math.max(0, t0x); tx <= Math.min(GW - 1, t1x); tx++) {
        const d = Math.hypot(tx * TS + 1 - px, ty * TS + 1 - py) - hw, i = ty * GW + tx;
        if (d < roadDist[i]) { roadDist[i] = d; roadOf[i] = ri; }
      }
    }
  });
  for (let i = 0; i < GW * GH; i++) {
    if (roadDist[i] < 0) { if (grid[i] === T.WATER && !ROADS[roadOf[i]].bridge) continue; if (grid[i] === T.WATER) bridgeAt[i] = 1; grid[i] = T.VIA; }
    else if (roadDist[i] < 2.4 && grid[i] !== T.WATER && grid[i] !== T.SAND && grid[i] !== T.QUAY && (zone[i] === Z.PONENTE || zone[i] === Z.LUNGO || zone[i] === Z.COLLE)) grid[i] = T.WALK;
  }
  // l'aiuola al centro della rotonda
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) if (Math.hypot(tx * TS + 1 - RB.x, ty * TS + 1 - RB.y) < RB.r - 3.4) grid[ty * GW + tx] = T.GRASS;
  // 4) il borgo storico, com'era (con la Via al Mare larga quattro caselle)
  for (let y = 0; y < 37; y++) for (let x = 0; x < 44; x++) {
    let v = T.COB;
    if (y >= 23 && y <= 26) v = T.VIA;
    else if (y >= 27 && y <= 29) v = T.QUAY;
    else if (y >= 30) v = (x === 12 || x === 13 || x === 26 || x === 27) && y < 36 ? T.PIER : T.WATER;
    else if (x >= 20 && x <= 29 && y >= 6 && y <= 14) v = T.PIAZZA;
    setT(x + OX, y + OY, v);
  }
  [[24, 10], [25, 10], [24, 11], [25, 11]].forEach(([x, y]) => setT(x + OX, y + OY, T.FOUNT));
  // la marina: pontile e braccio
  rect(32, 84, 2, 12, T.PIER); rect(26, 90, 14, 1, T.PIER);
  // 5) scogli lungo la costa selvaggia
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
    const i = ty * GW + tx; if (grid[i] !== T.GRASS) continue;
    let w = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= GW || y >= GH || grid[y * GW + x] === T.WATER) w = true; }
    if (w) grid[i] = T.ROCK;
  }
  // 6) quote: collina, rilievo del Ponente, poi le strade impongono la loro quota e il terreno le raccorda
  const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const landAt = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH && grid[ty * GW + tx] !== T.WATER;
  // distanza dal mare (in caselle), per far scendere il terreno verso la costa
  const seaD = new Float32Array(GW * GH).fill(99);
  for (let i = 0; i < GW * GH; i++) if (grid[i] === T.WATER) seaD[i] = 0;
  for (let it = 0; it < 2; it++) {
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx; if (tx > 0) seaD[i] = Math.min(seaD[i], seaD[i - 1] + 1); if (ty > 0) seaD[i] = Math.min(seaD[i], seaD[i - GW] + 1); }
    for (let ty = GH - 1; ty >= 0; ty--) for (let tx = GW - 1; tx >= 0; tx--) { const i = ty * GW + tx; if (tx < GW - 1) seaD[i] = Math.min(seaD[i], seaD[i + 1] + 1); if (ty < GH - 1) seaD[i] = Math.min(seaD[i], seaD[i + GW] + 1); }
  }
  const baseH = (x, y) => {
    let h = 17 * Math.exp(-(((x - 150) / 62) ** 2 + ((y - 38) / 30) ** 2)) + 4 * Math.exp(-(((x - 38) / 22) ** 2 + ((y - 58) / 18) ** 2));
    h += 1.2 * Math.sin(x * .05) * Math.sin(y * .07);
    return Math.max(.4, h);
  };
  for (let cy = 0; cy <= GH; cy++) for (let cx = 0; cx <= GW; cx++) {
    const x = cx * TS, y = cy * TS;
    // spigolo in mare se tutte le caselle attorno sono acqua
    let sea = 99; for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const tx = cx + dx, ty = cy + dy; sea = Math.min(sea, tx >= 0 && ty >= 0 && tx < GW && ty < GH ? seaD[ty * GW + tx] : 0); }
    let h = baseH(x, y) * smooth((sea - .5) / 7);
    if (sea === 0) h = -1.2;
    hc[cy * HW + cx] = h;
  }
  // quota lungo le strade: profilo dato (tornanti) o terreno ammorbidito lungo il percorso, con pendenza massima
  ROADS.forEach(R => {
    const n = R.pts.length;
    let hs = R.h ? R.h.slice() : R.pts.map(([x, y]) => { const tx = Math.min(GW, Math.max(0, Math.round(x / TS))), ty = Math.min(GH, Math.max(0, Math.round(y / TS))); return hc[ty * HW + tx]; });
    if (!R.h) { // media mobile su 40 m, più volte
      for (let pass = 0; pass < 3; pass++) { const o = hs.slice(); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -20; k <= 20; k++) { let j = i + k; if (R.closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; s += o[j]; c++; } hs[i] = s / c; } }
    }
    R.h = hs.map(h => Math.max(R.bridge ? 1 : .3, h));
  });
  // i ponti stanno sopra il mare
  ROADS.forEach(R => { if (R.bridge) R.h = R.h.map(() => 1); });
  // il borgo e il Lungomare sono in piano; il porto pure
  const flat = (x0, y0, w, h, v, m) => {
    for (let cy = y0 - m; cy <= y0 + h + m; cy++) for (let cx = x0 - m; cx <= x0 + w + m; cx++) {
      if (cx < 0 || cy < 0 || cx > GW || cy > GH) continue; const i = cy * HW + cx;
      const d = Math.max(x0 - cx, cx - (x0 + w), y0 - cy, cy - (y0 + h), 0), k = m ? smooth(1 - d / m) : 1;
      if (hc[i] > -1) hc[i] = hc[i] + (v - hc[i]) * k;
    }
  };
  // strade: la carreggiata prende la quota della strada, i bordi raccordano il terreno
  const roadH = new Float32Array(HW * (GH + 1)).fill(NaN), roadW = new Float32Array(HW * (GH + 1)).fill(1e9);
  ROADS.forEach(R => {
    for (let k = 0; k < R.pts.length; k++) {
      const [px, py] = R.pts[k], hw = R.ws[k] / 2, rr = hw + 10;
      for (let cy = Math.max(0, Math.floor((py - rr) / TS)); cy <= Math.min(GH, Math.ceil((py + rr) / TS)); cy++) for (let cx = Math.max(0, Math.floor((px - rr) / TS)); cx <= Math.min(GW, Math.ceil((px + rr) / TS)); cx++) {
        const d = Math.hypot(cx * TS - px, cy * TS - py) - hw, i = cy * HW + cx;
        if (d < roadW[i]) { roadW[i] = d; roadH[i] = R.h[k]; }
      }
    }
  });
  for (let i = 0; i < hc.length; i++) {
    if (isNaN(roadH[i])) continue; const d = roadW[i];
    if (d < 1) hc[i] = roadH[i]; else if (d < 10 && hc[i] > -1) { const k = smooth(1 - (d - 1) / 9); hc[i] = hc[i] + (roadH[i] - hc[i]) * k; }
  }
  flat(OX, OY, 44, 30, 0, 5); flat(98, 26, 24, 50, .3, 4); flat(4, 74, 42, 20, 0, 3);
  // il porto e la calata sono a filo: niente onde nel borgo
  for (let cy = OY; cy <= OY + 30; cy++) for (let cx = OX; cx <= OX + 44; cx++) hc[cy * HW + cx] = 0;
  // la spiaggia scende al mare
  for (let cy = 22; cy <= 82; cy++) for (let cx = 119; cx <= GW; cx++) { const i = cy * HW + cx; if (hc[i] > -1) hc[i] = Math.min(hc[i], .3 - Math.max(0, cx - 121) * .045); }
  // piazzale del Santuario e terrazzino del belvedere in piano
  flat(68, 18, 14, 5, 15, 3);
  // quota per casella (media degli spigoli) e ripidezza
  const cornerAt = (tx, ty, a, b) => hc[(ty + b) * HW + tx + a];
  for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) elev[ty * GW + tx] = (cornerAt(tx, ty, 0, 0) + cornerAt(tx, ty, 1, 0) + cornerAt(tx, ty, 0, 1) + cornerAt(tx, ty, 1, 1)) / 4;
  // 7) edifici
  BUILDINGS.forEach((b, i) => { for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { grid[y * GW + x] = T.BLD; bIndex[y * GW + x] = i; wallAt[y * GW + x] = 0; } });
  // palazzine e ville: riempiono le zone abitate lungo le strade, senza toccare strade, porte e luoghi
  (function filler() {
    let s = 20260930; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const keep = []; BUILDINGS.forEach(b => { if (b.door) keep.push(b.door); });
    const spots = [[16, 33], [16, 64], [32, 86], [9, 86], [40, 44], [66, 40], [79, 21], [130, 52], [121, 46]];
    const free = (x, y, w, h) => {
      for (let j = y - 1; j <= y + h; j++) for (let i = x - 1; i <= x + w; i++) {
        if (i < 0 || j < 0 || i >= GW || j >= GH) return false; const v = grid[j * GW + i], k = j * GW + i;
        const inside = i >= x && i < x + w && j >= y && j < y + h;
        if (v === T.BLD || v === T.WATER || v === T.PIER) return false;
        if (inside && (v === T.VIA || v === T.WALK || v === T.SAND || v === T.QUAY || v === T.ROCK || zone[k] === Z.BORGO)) return false;
      }
      if (keep.some(([a, b]) => a >= x - 2 && a <= x + w + 1 && b >= y - 2 && b <= y + h + 1)) return false;
      if (spots.some(([a, b]) => a >= x - 3 && a <= x + w + 2 && b >= y - 3 && b <= y + h + 2)) return false;
      // la pineta, i giardini e l'aiuola della rotonda restano verdi
      if (x < 26 && x + w > 8 && y < 38 && y + h > 22) return false; if (x < 24 && x + w > 10 && y < 70 && y + h > 60) return false;
      return true;
    };
    const nearRoad = (x, y, w, h) => { for (let j = y - 2; j <= y + h + 1; j++) for (let i = x - 2; i <= x + w + 1; i++) { if (i < 0 || j < 0 || i >= GW || j >= GH) continue; const v = grid[j * GW + i]; if (v === T.VIA || v === T.WALK) return true; } return false; };
    let n = 0;
    for (let tries = 0; tries < 4000 && n < 46; tries++) {
      const w = 4 + Math.floor(rnd() * 3), h = 3 + Math.floor(rnd() * 3), x = 4 + Math.floor(rnd() * (GW - 12)), y = 4 + Math.floor(rnd() * (GH - 10)), z = zone[y * GW + x];
      if (z !== Z.PONENTE && z !== Z.LUNGO && z !== Z.COLLE && z !== Z.PORTO && !(z === Z.NAT && rnd() < .5)) continue;
      if (!free(x, y, w, h) || !nearRoad(x, y, w, h)) continue;
      const colle = z === Z.COLLE || z === Z.NAT, lungo = z === Z.LUNGO;
      BUILDINGS.push({ id: 'fill_' + n, x, y, w, h, fl: colle ? 2 + Math.floor(rnd() * 3) : 3 + Math.floor(rnd() * 4), style: Math.floor(rnd() * 23), zone: colle ? 'alta' : lungo ? 'lungo' : z === Z.PORTO ? 'cantiere' : 'ponente', deco: lungo && rnd() < .6, filler: true });
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j * GW + i] = T.BLD;
      n++;
    }
  })();
  BUILDINGS.forEach((b, i) => { if (b.filler) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) bIndex[y * GW + x] = i; });
  // il pavimento resta solo attorno alle case e lungo le strade: il resto torna prato (giardini, aiuole, campagna)
  (function paving() {
    const near = (tx, ty, r, f) => { for (let j = ty - r; j <= ty + r; j++) for (let i = tx - r; i <= tx + r; i++) { if (i < 0 || j < 0 || i >= GW || j >= GH) continue; if (f(grid[j * GW + i])) return true; } return false; };
    const out = [];
    for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) {
      const i = ty * GW + tx; if (grid[i] !== T.COB || zone[i] === Z.BORGO) continue;
      if (!near(tx, ty, 2, v => v === T.BLD) && !near(tx, ty, 1, v => v === T.WALK)) out.push(i);
    }
    out.forEach(i => grid[i] = T.GRASS);
  })();
  // muraglioni: dove il terreno vicino a una strada è troppo ripido diventa muro di sostegno (e si può sfondare);
  // più lontano dalle strade il pendio ripido resta roccia
  (function retaining() {
    const nearRoad = (tx, ty, r) => { for (let j = ty - r; j <= ty + r; j++) for (let i = tx - r; i <= tx + r; i++) { if (i < 0 || j < 0 || i >= GW || j >= GH) continue; if (grid[j * GW + i] === T.VIA) return true; } return false; };
    const keep = new Set(); BUILDINGS.forEach(b => { if (b.door) keep.add(b.door[1] * GW + b.door[0]); });
    for (let ty = 1; ty < GH - 1; ty++) for (let tx = 1; tx < GW - 1; tx++) {
      const i = ty * GW + tx, v = grid[i]; if (v === T.VIA || v === T.BLD || v === T.WATER || v === T.PIER || v === T.SAND || zone[i] === Z.BORGO || keep.has(i)) continue;
      const c = [hc[ty * HW + tx], hc[ty * HW + tx + 1], hc[(ty + 1) * HW + tx], hc[(ty + 1) * HW + tx + 1]], r = Math.max(...c) - Math.min(...c);
      if (r > 2.1 && nearRoad(tx, ty, 2)) { grid[i] = T.BLD; wallAt[i] = 1; }
      else if (r > 1.7) grid[i] = T.ROCK;
    }
  })();
  // voltoni sopra i caruggi del borgo (solo decorazione)
  const ARCHES = [{ x: OX + 8, y: OY + 2, w: 2, h: 1, z: 0 }, { x: OX + 38, y: OY + 12, w: 2, h: 1, z: 0 }];
  const MAP = { OX, OY, Z, zone, bridgeAt, elev, hc, HW, rampOf, ramps: RAMPS, wallAt, arches: ARCHES, roads: ROADS, rb: RB, coast: COAST };
  // copia della mappa intatta: i muri sfondati tornano al loro posto a ogni nuova partita
  const MAP0 = { grid: grid.slice(), wallAt: wallAt.slice(), elev: elev.slice(), rampOf: rampOf.slice(), ramps: RAMPS.length };
  function restoreMap() { grid.set(MAP0.grid); wallAt.set(MAP0.wallAt); elev.set(MAP0.elev); rampOf.set(MAP0.rampOf); RAMPS.length = MAP0.ramps; }

  const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= GW || ty >= GH) ? T.BLD : grid[ty * GW + tx];
  const walkT = (tx, ty) => { const v = tileAt(tx, ty); return v !== T.BLD && v !== T.WATER && v !== T.FOUNT; };
  const walkM = (x, y) => walkT(Math.floor(x / TS), Math.floor(y / TS));
  const opaqueM = (x, y) => tileAt(Math.floor(x / TS), Math.floor(y / TS)) === T.BLD;
  const solidM = (x, y) => { const v = tileAt(Math.floor(x / TS), Math.floor(y / TS)); return v === T.BLD || v === T.FOUNT; };

  const PLACES = {};
  BUILDINGS.forEach(b => { if (b.door) PLACES[b.id] = { id: b.id, name: b.name, tx: b.door[0], ty: b.door[1] }; });
  Object.assign(PLACES, {
    piazza: { id: 'piazza', name: 'Piazza San Rocco', tx: OX + 22, ty: OY + 9 },
    fontana: { id: 'fontana', name: 'Fontana di San Rocco', tx: OX + 26, ty: OY + 12 },
    vico: { id: 'vico', name: 'Vico dei Lanternini', tx: OX + 2, ty: OY + 8 },
    calata: { id: 'calata', name: 'Calata del porto', tx: OX + 21, ty: OY + 28 },
    molo: { id: 'molo', name: 'Molo dei pescatori', tx: OX + 12, ty: OY + 33 },
    pontile: { id: 'pontile', name: 'Pontile Est', tx: OX + 27, ty: OY + 32 },
    fiori: { id: 'fiori', name: 'Banco dei fiori', tx: OX + 41, ty: OY + 16 },
    lungomare: { id: 'lungomare', name: 'Via al Mare', tx: OX + 30, ty: OY + 24 },
    piazzetta: { id: 'piazzetta', name: 'Vico del Campo', tx: OX + 39, ty: OY + 8 },
    pineta: { id: 'pineta', name: 'Pineta di Ponente', tx: 16, ty: 33 },
    giardini: { id: 'giardini', name: 'Giardini delle Palme', tx: 16, ty: 64 },
    marina: { id: 'marina', name: 'Marina di Ponente', tx: 32, ty: 86 },
    punta: { id: 'punta', name: 'Punta Scogli', tx: 9, ty: 86 },
    salita: { id: 'salita', name: 'Salita del Santuario', tx: 40, ty: 44 },
    caruggio: { id: 'caruggio', name: 'Caruggio dei Pescatori', tx: 66, ty: 40 },
    belvedere: { id: 'belvedere', name: 'Belvedere', tx: 79, ty: 21 },
    spiaggia: { id: 'spiaggia', name: 'Spiaggia del Lido', tx: 130, ty: 52 },
    passeggiata: { id: 'passeggiata', name: 'Lungomare', tx: 121, ty: 46 },
  });
  // i luoghi devono stare su caselle percorribili: se no, la più vicina
  Object.values(PLACES).forEach(p => {
    if (!walkT(p.tx, p.ty)) { let best = null, bd = 1e9; for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (walkT(p.tx + dx, p.ty + dy) && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = [p.tx + dx, p.ty + dy]; } if (best) { p.tx = best[0]; p.ty = best[1]; } }
    p.x = p.tx * TS + TS / 2; p.y = p.ty * TS + TS / 2;
  });
  function nearestPlace(x, y) { let b = null, bd = 1e9; for (const p of Object.values(PLACES)) { const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; b = p; } } return b; }

  // A* con heap binario
  function findPath(sx, sy, gx, gy, roadCost) {
    const s = [clamp(Math.floor(sx / TS), 0, GW - 1), clamp(Math.floor(sy / TS), 0, GH - 1)];
    const g = [Math.floor(gx / TS), Math.floor(gy / TS)];
    if (!walkT(g[0], g[1])) return [];
    const N = GW * GH, came = new Int32Array(N).fill(-1), cost = new Float32Array(N).fill(1e9), closed = new Uint8Array(N);
    const si = s[1] * GW + s[0], gi = g[1] * GW + g[0];
    const heap = [], hf = [];
    const push = (n, f) => { heap.push(n); hf.push(f); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break;[heap[p], heap[i]] = [heap[i], heap[p]];[hf[p], hf[i]] = [hf[i], hf[p]]; i = p; } };
    const pop = () => { const top = heap[0], lh = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lh; hf[0] = lf; let i = 0; for (; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]];[hf[m], hf[i]] = [hf[i], hf[m]]; i = m; } } return top; };
    cost[si] = 0; push(si, 0);
    const hx = g[0], hy = g[1];
    while (heap.length) {
      const cur = pop(); if (closed[cur]) continue; closed[cur] = 1; if (cur === gi) break;
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (let k = 0; k < 8; k++) {
        const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k];
        const nx = cx + dx, ny = cy + dy; if (!walkT(nx, ny)) continue;
        if (k >= 4 && (!walkT(cx + dx, cy) || !walkT(cx, cy + dy))) continue;
        const ni = ny * GW + nx; if (closed[ni]) continue;
        const nc = cost[cur] + (k >= 4 ? 1.414 : 1) * (tileAt(nx, ny) === T.VIA ? (roadCost || 1) : 1);
        if (nc < cost[ni]) { cost[ni] = nc; came[ni] = cur; push(ni, nc + Math.hypot(nx - hx, ny - hy)); }
      }
    }
    if (si !== gi && came[gi] === -1) return [];
    const raw = []; let c = gi;
    while (c !== si && c !== -1) { raw.push({ x: (c % GW) * TS + TS / 2, y: ((c / GW) | 0) * TS + TS / 2 }); c = came[c]; }
    raw.reverse(); if (raw.length) raw[raw.length - 1] = { x: gx, y: gy }; else raw.push({ x: gx, y: gy });
    const out = []; let ax = sx, ay = sy, i = 0;
    while (i < raw.length) {
      let j = raw.length - 1;
      while (j > i && !clearLine(ax, ay, raw[j].x, raw[j].y)) j--;
      out.push(raw[j]); ax = raw[j].x; ay = raw[j].y; i = j + 1;
    }
    return out;
  }
  function clearLine(x0, y0, x1, y1) {
    const d = dist(x0, y0, x1, y1), n = Math.ceil(d / .5);
    for (let i = 1; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      if (!walkM(x, y) || !walkM(x + .45, y) || !walkM(x - .45, y) || !walkM(x, y + .45) || !walkM(x, y - .45)) return false;
    }
    return true;
  }
  function los(x0, y0, x1, y1) {
    const d = dist(x0, y0, x1, y1), n = Math.ceil(d / .6);
    for (let i = 1; i < n; i++) if (opaqueM(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
    return true;
  }

  // ---------------- ARMI E VEICOLI ----------------
  const WEAPONS = {
    pugni: { name: 'Pugni', melee: true, rate: .38, dmg: 14, range: 1.8, slot: 1 },
    pistola: { name: 'Beretta 92', rate: .19, dmg: 30, spread: .035, mag: 15, reload: 1.1, range: 24, pellets: 1, shell: true, kick: .14, shake: .07, bloom: .045, noise: 34, slot: 2, color: '#ffe7a0' },
    lupara: { name: 'Lupara', rate: .72, dmg: 15, spread: .19, mag: 2, reload: 1.5, range: 13, pellets: 8, knock: 1.1, kick: .45, shake: .28, bloom: .08, noise: 38, slot: 3, color: '#ffd080' },
    mitra: { name: 'Skorpion', rate: .075, dmg: 14, spread: .075, mag: 30, reload: 1.35, range: 19, pellets: 1, auto: true, shell: true, kick: .07, shake: .05, bloom: .028, noise: 34, slot: 4, color: '#fff0b0' },
    molotov: { name: 'Molotov', throw: true, rate: .8, range: 14, slot: 5 },
  };
  const VK = {
    vespa: { r: .6, len: 1.9, wid: .7, max: 12.5, accel: 9, turn: 3.3, hp: 60, label: 'Vespa', two: true },
    cinquecento: { r: .95, len: 3.0, wid: 1.4, max: 13, accel: 7, turn: 2.7, hp: 100, label: 'Fiat 500' },
    ritmo: { r: 1.05, len: 3.9, wid: 1.65, max: 16, accel: 8, turn: 2.4, hp: 120, label: 'Fiat Ritmo' },
    giulia: { r: 1.05, len: 4.1, wid: 1.6, max: 17, accel: 8.5, turn: 2.4, hp: 130, label: 'Alfa Giulia' },
    ape: { r: .9, len: 2.8, wid: 1.3, max: 9, accel: 5, turn: 2.8, hp: 70, label: 'Ape Piaggio' },
    polizia: { r: 1.05, len: 4.3, wid: 1.66, max: 18, accel: 9, turn: 2.5, hp: 160, label: 'Alfetta della Polizia' },
  };
  // fisica: massa (kg) e aderenza laterale (m/s²). Vespa e Ape scivolano meno, le berline derapano.
  Object.assign(VK.vespa, { m: 150, grip: 24 }); Object.assign(VK.cinquecento, { m: 560, grip: 19 }); Object.assign(VK.ritmo, { m: 860, grip: 20 });
  Object.assign(VK.giulia, { m: 1050, grip: 21 }); Object.assign(VK.ape, { m: 420, grip: 15 }); Object.assign(VK.polizia, { m: 1150, grip: 22 });
  for (const k in VK) VK[k].I = (VK[k].len * VK[k].len + VK[k].wid * VK[k].wid) / 12; // inerzia / massa
  const PICKUP_LABEL = { pistola: 'Beretta 92', lupara: 'Lupara', mitra: 'Skorpion', molotov: 'Molotov', munizioni: 'Munizioni', salute: 'Cassetta del pronto soccorso', soldi: 'Soldi', valigetta: 'Valigetta dei Marsigliesi' };

  // ---------------- PERSONAGGI ----------------
  const CAST = [
    { id: 'gino', name: 'Gino Ferraro', role: 'Barista del Bar Da Gino', home: 'aurora', shop: 'bar', tr: { cor: .6, loq: .9, avid: .4, legge: .5 }, sched: [[6, 'bar'], [23, 'aurora']], look: { skin: '#d9a47c', top: '#f1ece2', bottom: '#2b2b38', hair: '#1f1a17', hat: 'none', build: 1.15, extra: 'moustache,apron' } },
    { id: 'wu', name: 'Wu Lin', role: 'Bottegaio', home: 'stella', shop: 'wu', tr: { cor: .3, loq: .5, avid: .7, legge: .8 }, sched: [[7, 'wu'], [21, 'piazza'], [23, 'stella']], look: { skin: '#e3bf92', top: '#2f5a4a', bottom: '#1d2230', hair: '#111', hat: 'cap', hatCol: '#8a1f1f', build: .95, extra: 'glasses' } },
    { id: 'marta', name: 'Marta Sala', role: 'Pensionata, sa tutto di tutti', home: 'stella', tr: { cor: .2, loq: 1, avid: .2, legge: .9 }, sched: [[7, 'chiesa'], [10, 'piazza'], [12, 'wu'], [13, 'stella'], [16, 'chiesa'], [18, 'piazza'], [20, 'bar'], [22, 'stella']], look: { skin: '#e8c3a4', top: '#6b4f8a', bottom: '#4a3a5a', hair: '#cfcac4', hat: 'bun', build: .85, extra: 'shawl' } },
    { id: 'tonino', name: 'Tonino Esposito', role: 'Scaricatore di porto', home: 'aurora', tr: { cor: .9, loq: .4, avid: .5, legge: .2 }, sched: [[5, 'calata'], [16, 'osteria'], [23, 'aurora']], look: { skin: '#b9825c', top: '#3b5b86', bottom: '#2a2a2a', hair: '#222', hat: 'beanie', hatCol: '#c9412c', build: 1.35, extra: '' } },
    { id: 'lucia', name: 'Lucia Bentivoglio', role: 'Infermiera', home: 'mare', tr: { cor: .5, loq: .6, avid: .2, legge: .7 }, sched: [[7, 'ambulatorio'], [19, 'wu'], [20, 'piazza'], [22, 'mare']], look: { skin: '#f0cfb2', top: '#e9f1f0', bottom: '#e9f1f0', hair: '#7a3b1f', hat: 'long', build: .95, extra: '' } },
    { id: 'sandro', name: 'Sandro «lo Squalo» Neri', role: 'Ricettatore. Gli devi dei soldi', home: 'magazzino', faction: 'squalo', hp: 110, weapon: 'pistola', tr: { cor: .8, loq: .3, avid: .95, legge: 0 }, sched: [[10, 'magazzino'], [17, 'flipper'], [21, 'magazzino']], look: { skin: '#d7a57e', top: '#f4f1e8', bottom: '#f4f1e8', hair: '#0f0f0f', hat: 'slick', build: 1.1, extra: 'shades,gold' } },
    { id: 'rocco', name: 'Rocco «Mani di pietra»', role: 'Scagnozzo dello Squalo', home: 'magazzino', faction: 'squalo', hp: 120, weapon: 'lupara', tr: { cor: .95, loq: .2, avid: .7, legge: 0 }, sched: [[10, 'magazzino'], [17, 'flipper'], [21, 'magazzino']], look: { skin: '#c28e66', top: '#2a2a30', bottom: '#1a1a20', hair: '#0f0f0f', hat: 'none', build: 1.4, extra: 'gold' } },
    { id: 'tano', name: 'Tano Scarpa', role: 'Scagnozzo dello Squalo', home: 'magazzino', faction: 'squalo', hp: 90, weapon: 'pistola', tr: { cor: .8, loq: .5, avid: .7, legge: 0 }, sched: [[10, 'calata'], [16, 'magazzino'], [20, 'lungomare'], [23, 'magazzino']], look: { skin: '#d6a47a', top: '#6a3a2a', bottom: '#2a2a2a', hair: '#2a1a12', hat: 'fedora', hatCol: '#2a2420', build: 1.05, extra: 'moustache' } },
    { id: 'elena', name: 'Elena Vitale', role: 'Studentessa', home: 'mare', tr: { cor: .5, loq: .8, avid: .3, legge: .6 }, sched: [[9, 'biblioteca'], [13, 'piazza'], [15, 'biblioteca'], [19, 'flipper'], [23, 'mare']], look: { skin: '#f2d2b6', top: '#4d7fbf', bottom: '#2a3b66', hair: '#3a2a1f', hat: 'pony', build: .9, extra: '' } },
    { id: 'beppe', name: 'Beppe Carli', role: 'Meccanico di Vespe', home: 'aurora', tr: { cor: .4, loq: .7, avid: .6, legge: .5 }, sched: [[7, 'officina'], [20, 'osteria'], [23, 'aurora']], look: { skin: '#caa07c', top: '#3f4f3a', bottom: '#3f4f3a', hair: '#5b4a3a', hat: 'flat', hatCol: '#4b3d33', build: 1.05, extra: 'overalls' } },
    { id: 'rosa', name: 'Rosa Amato', role: 'Fioraia', home: 'stella', tr: { cor: .3, loq: .8, avid: .4, legge: .7 }, sched: [[7, 'fiori'], [18, 'chiesa'], [19, 'piazza'], [21, 'stella']], look: { skin: '#e9c1a0', top: '#c43c52', bottom: '#2f2a3a', hair: '#1b1b1b', hat: 'scarf', hatCol: '#f2c14e', build: .9, extra: '' } },
    { id: 'nico', name: 'Nico Galli', role: 'Fattorino', home: 'mare', tr: { cor: .6, loq: .6, avid: .6, legge: .4 }, sched: [[8, 'molo'], [12, 'wu'], [14, 'magazzino'], [18, 'flipper'], [1, 'mare']], look: { skin: '#d8b08c', top: '#e0a72e', bottom: '#2c3a55', hair: '#2a1b12', hat: 'capback', hatCol: '#1f6f5c', build: .95, extra: '' } },
    { id: 'pietro', name: 'Don Pietro', role: 'Parroco di San Rocco', home: 'chiesa', tr: { cor: .5, loq: .7, avid: .1, legge: .9 }, sched: [[6, 'chiesa'], [10, 'piazza'], [12, 'chiesa'], [17, 'osteria'], [19, 'piazza'], [21, 'chiesa']], look: { skin: '#e1b995', top: '#15151c', bottom: '#15151c', hair: '#8a8580', hat: 'none', build: 1.0, extra: 'collar' } },
    { id: 'marcel', name: 'Marcel Fabre', role: 'Contrabbandiere marsigliese', home: 'miramare', faction: 'marsiglia', nocturnal: true, hp: 95, weapon: 'mitra', tr: { cor: .9, loq: .3, avid: .9, legge: 0 }, sched: [[0, 'pontile']], look: { skin: '#d9b08e', top: '#2a3a4a', bottom: '#1a1a22', hair: '#3a2a1a', hat: 'beanie', hatCol: '#1a1a22', build: 1.15, extra: '' } },
    { id: 'jeanluc', name: 'Jean-Luc Bonnet', role: 'Contrabbandiere marsigliese', home: 'miramare', faction: 'marsiglia', nocturnal: true, hp: 85, weapon: 'pistola', tr: { cor: .8, loq: .4, avid: .8, legge: 0 }, sched: [[0, 'pontile']], look: { skin: '#e8c8a8', top: '#7a2a2a', bottom: '#20202a', hair: '#c8a060', hat: 'none', build: 1.0, extra: 'shades' } },
    { id: 'didier', name: 'Didier Roux', role: 'Contrabbandiere marsigliese', home: 'miramare', faction: 'marsiglia', nocturnal: true, hp: 85, weapon: 'mitra', tr: { cor: .85, loq: .3, avid: .8, legge: 0 }, sched: [[0, 'pontile']], look: { skin: '#c89a78', top: '#3a4a2a', bottom: '#20202a', hair: '#111', hat: 'capback', hatCol: '#223344', build: 1.1, extra: 'moustache' } },
    { id: 'carla', name: 'Agente Carla Russo', role: 'Polizia di Stato', home: 'commissariato', hp: 100, weapon: 'pistola', tr: { cor: .8, loq: .5, avid: .2, legge: 1 }, sched: [[0, 'commissariato']], cop: true, look: { skin: '#e6c0a0', top: '#23355e', bottom: '#1b2440', hair: '#2a1d14', hat: 'police', build: 1.0, extra: 'belt' } },
    { id: 'ferri', name: 'Agente Ferri', role: 'Polizia di Stato', home: 'commissariato', hp: 100, weapon: 'pistola', tr: { cor: .7, loq: .4, avid: .6, legge: .8 }, sched: [[0, 'commissariato']], cop: true, standby: true, look: { skin: '#c99a76', top: '#23355e', bottom: '#1b2440', hair: '#111', hat: 'police', build: 1.15, extra: 'belt,moustache' } },
  ];
  const PASSANTI = [['Franca Riva', '#8c6a4f'], ['Mimmo Serra', '#5a6e8c'], ['Ada Colombo', '#9a5b7a'], ['Gigi Longo', '#6d7b4a'], ['Teresa Fumagalli', '#7a4f3a'], ['Paolo Greco', '#4a6a6e']];
  const FRIENDS = [['gino', 'tonino'], ['gino', 'marta'], ['marta', 'rosa'], ['marta', 'pietro'], ['rosa', 'pietro'], ['wu', 'rosa'], ['elena', 'nico'], ['beppe', 'gino'], ['sandro', 'nico'], ['lucia', 'carla'], ['beppe', 'tonino'], ['elena', 'lucia'], ['lucia', 'marta'], ['carla', 'ferri'], ['wu', 'lucia'], ['sandro', 'rocco'], ['sandro', 'tano'], ['rocco', 'tano'], ['marcel', 'jeanluc'], ['marcel', 'didier'], ['jeanluc', 'didier']];
  const PATROL = ['commissariato', 'lungomare', 'piazza', 'vico', 'calata', 'bar', 'fontana', 'piazzetta', 'osteria'];
  const PUBLIC = ['piazza', 'fontana', 'calata', 'vico', 'lungomare', 'osteria', 'bar', 'wu', 'flipper', 'molo', 'fiori', 'piazzetta'];
  const DRIVER_LOOKS = [
    { skin: '#e0b894', top: '#6a5a4a', bottom: '#2a2a33', hair: '#3a2a1a', hat: 'none', build: 1.05, extra: 'moustache' },
    { skin: '#f0cfb2', top: '#a04a6a', bottom: '#2a2a33', hair: '#6a3a1a', hat: 'long', build: .9, extra: '' },
    { skin: '#c99a76', top: '#3a5a7a', bottom: '#2a2a33', hair: '#111', hat: 'flat', hatCol: '#3a3a44', build: 1.1, extra: '' },
    { skin: '#dcae88', top: '#e0d8c8', bottom: '#3a3a44', hair: '#888', hat: 'none', build: 1.0, extra: 'glasses' },
  ];

  const SEV = { scippo: .5, aggressione: .75, rapina: .85, furto_vespa: .6, furto_auto: .65, investimento: .7, corruzione: .4, lavoro: .4, spari: .88, ferimento: .95, omicidio: 1, esplosione: .95, molotov: .9 };
  const NOISE = { scippo: 3, aggressione: 12, rapina: 22, furto_vespa: 10, furto_auto: 12, investimento: 14, corruzione: 2, lavoro: 0, spari: 34, ferimento: 34, omicidio: 34, esplosione: 70, molotov: 16 };
  const NEG = { scippo: 1, aggressione: 1, rapina: 1, furto_vespa: 1, furto_auto: 1, investimento: 1, corruzione: 1, spari: 1, ferimento: 1, omicidio: 1, esplosione: 1, molotov: 1 };
  const LABEL = { scippo: 'Scippo', aggressione: 'Aggressione', rapina: 'Rapina', furto_vespa: 'Furto di Vespa', furto_auto: 'Furto d\'auto', investimento: 'Investimento', corruzione: 'Corruzione', lavoro: 'Lavoro onesto', spari: 'Spari', ferimento: 'Ferimento', omicidio: 'Omicidio', esplosione: 'Esplosione', molotov: 'Molotov' };
  const ESCALATE = { scippo: 'aggressione', investimento: 'aggressione', ferimento: 'omicidio' };

  // ---------------- INVENTARIO E POTENZIAMENTI ----------------
  // Oggetti nello zaino (p.inv: id → quantità) e abilità (p.skills, 0-5) comprate coi punti dei livelli.
  // L'esperienza arriva da lavori, rapine, mezzi venduti, scippi e nemici abbattuti.
  const ITEMS = {
    kit: { name: 'Pronto soccorso', desc: 'Ti rimette in piedi: salute piena.', kind: 'cura', use: true },
    bende: { name: 'Bende', desc: 'Tamponano: +35 salute.', kind: 'cura', use: true },
    sigarette: { name: 'Nazionali', desc: 'Calmano i nervi: mira ferma per 40 secondi.', kind: 'uso', use: true },
    orologio: { name: 'Orologio d\'oro', desc: 'Refurtiva. Lo Squalo la compra.', kind: 'refurtiva', value: 40 },
    catenina: { name: 'Catenina', desc: 'Refurtiva. Lo Squalo la compra.', kind: 'refurtiva', value: 25 },
    radiolina: { name: 'Radiolina', desc: 'Refurtiva. Lo Squalo la compra.', kind: 'refurtiva', value: 15 },
  };
  const SKILLS = {
    fisico: { name: 'Fisico', desc: '+15 salute massima, ti riprendi prima.', max: 5 },
    mira: { name: 'Mira', desc: 'Colpi più raccolti, il rinculo si assesta prima.', max: 5 },
    mani: { name: 'Mani veloci', desc: 'Ricarichi e cambi arma più in fretta.', max: 5 },
    rissa: { name: 'Rissa', desc: 'Pugni più pesanti, stordiscono di più.', max: 5 },
    volante: { name: 'Volante', desc: 'Più spunto e più tenuta in curva.', max: 5 },
    parlantina: { name: 'Parlantina', desc: 'Lo Squalo fa lo sconto, la refurtiva rende di più.', max: 5 },
  };
  function skill(st, k) { const s = st.player.skills; return (s && s[k]) || 0; }
  function maxHp(st) { return 100 + 15 * skill(st, 'fisico'); }
  function xpNext(lvl) { return 60 + lvl * 40; }
  function gainXp(st, n) {
    const p = st.player; if (!n || st.over) return;
    p.xp += n;
    while (p.xp >= xpNext(p.lvl)) { p.xp -= xpNext(p.lvl); p.lvl++; p.pts++; feed(st, `Livello ${p.lvl}: hai un punto da spendere (menu, I).`, 'good'); st.sfx.push({ k: 'pickup' }); }
  }
  function upgrade(st, k) {
    const p = st.player, S = SKILLS[k];
    if (!S || p.pts < 1 || p.skills[k] >= S.max) return false;
    p.skills[k]++; p.pts--; if (k === 'fisico') p.hp += 15;
    return true;
  }
  function addItem(st, id, n) { const p = st.player; p.inv[id] = (p.inv[id] || 0) + (n || 1); }
  function useItem(st, id) {
    const p = st.player, I = ITEMS[id];
    if (!I || !I.use || !(p.inv[id] > 0) || st.over) return { ok: false };
    if (I.kind === 'cura' && p.hp >= maxHp(st)) return { ok: false, msg: 'Stai già bene.' };
    if (id === 'kit') p.hp = maxHp(st);
    if (id === 'bende') p.hp = Math.min(maxHp(st), p.hp + 35);
    if (id === 'sigarette') p.calmUntil = st.clock + 40;
    if (--p.inv[id] <= 0) delete p.inv[id];
    st.sfx.push({ k: 'pickup' });
    return { ok: true, msg: id === 'sigarette' ? 'Una boccata. La mano smette di tremare.' : 'Ti sei medicato.' };
  }
  function lootValue(st) { const p = st.player; let v = 0; for (const k in p.inv) if (ITEMS[k] && ITEMS[k].value) v += ITEMS[k].value * p.inv[k]; return Math.round(v * (1 + .1 * skill(st, 'parlantina'))); }
  function discount(st, price) { return Math.round(price * (1 - .08 * skill(st, 'parlantina'))); }
  // bottino a caso dagli scippi e dalle rapine
  function rollLoot(st, chance) {
    if (st.rng() > chance) return null;
    const pool = ['radiolina', 'catenina', 'catenina', 'orologio', 'bende', 'sigarette', 'sigarette'];
    const id = pool[Math.floor(st.rng() * pool.length)]; addItem(st, id); return id;
  }

  // ---------------- STATO ----------------
  function create(seed) {
    restoreMap();
    const rng = makeRng(seed || 1986);
    const st = {
      rng, t: START_T, clock: 0, nextId: 1, over: null, debt: DEBT, deadline: END_T, slowmo: 0, hitstop: 0, shake: 0,
      player: { x: 0, y: 0, face: -Math.PI / 2, money: 20, arrests: 0, vehicle: null, carrying: null, speed: 0, anim: 0, stun: 0, hp: 100, hurtT: -99, arms: { pugni: {} }, cur: 'pugni', cool: 0, reload: 0, bloom: 0, punch: 0, kills: 0, inv: { bende: 1 }, xp: 0, lvl: 1, pts: 0, skills: { fisico: 0, mira: 0, mani: 0, rissa: 0, volante: 0, parlantina: 0 }, calmUntil: -99 },
      npcs: [], vehicles: [], pickups: [], proj: [], fires: [], fx: [], sfx: [], wallHits: {}, facadeHits: {}, breaches: 0, rooms: [],
      events: [], log: [], feed: [], links: [], timers: [], chats: {}, job: null, jobCd: {}, lastSeen: null, chase: false, moments: [], robbed: {},
      shotEv: null, copKilled: false, reinf: null, reinfCd: 0, pendingEnd: null, hitMark: null, kick: null, panicAt: -99, drvN: 0,
    };
    const pl = st.player; pl.x = PLACES.calata.x - 6; pl.y = PLACES.calata.y;
    CAST.forEach(c => st.npcs.push(makeNpc(st, JSON.parse(JSON.stringify(c)))));
    PASSANTI.forEach(([name, col], i) => {
      const home = ['stella', 'aurora', 'mare'][i % 3];
      const pick = () => PUBLIC[Math.floor(rng() * PUBLIC.length)];
      const sched = [[7, pick()], [10, pick()], [13, pick()], [16, pick()], [18, pick()], [20, pick()], [22, home]];
      const skins = ['#e6c2a2', '#c99a76', '#dcb08c', '#b8845e'];
      st.npcs.push(makeNpc(st, { id: 'p' + i, name, role: 'Abitante del quartiere', home, tr: { cor: .3 + rng() * .5, loq: .4 + rng() * .5, avid: .2 + rng() * .6, legge: .3 + rng() * .6 }, sched, passante: true,
        look: { skin: skins[i % 4], top: col, bottom: '#2a2a33', hair: ['#2a1d14', '#555', '#b58a58', '#111'][i % 4], hat: ['none', 'flat', 'long', 'none', 'bun', 'fedora'][i], hatCol: '#3a3a44', build: .9 + rng() * .3, extra: '' } }));
    });
    // veicoli parcheggiati
    const V = (id, kind, tx, ty, ang, color, owner) => st.vehicles.push(makeVehicle(st, { id, kind, x: tx * TS + TS / 2, y: ty * TS + TS / 2, ang, color, owner }));
    const X = OX, Y = OY;
    V('v_beppe', 'vespa', X + 11, Y + 27, 0, '#e8d9a8', 'beppe');
    V('v_osteria', 'vespa', X + 24, Y + 27, Math.PI, '#58b8a6', 'tonino');
    V('v_miramare', 'vespa', X + 30, Y + 27, 0, '#d8473f', 'lucia');
    V('v_bar', 'vespa', X + 3, Y + 8, 0, '#8ab4e8', 'gino');
    V('v_sandro', 'giulia', X + 33, Y + 28, 0, '#16161c', 'sandro');
    V('v_ape', 'ape', X + 17, Y + 28, 0, '#7a9ab0', 'tonino');
    // mezzi parcheggiati nei quartieri (senza padrone)
    V('pk_benzina', 'cinquecento', 21, 50, 0, '#f4a6c0');
    V('pk_lido', 'vespa', 112, 47, Math.PI / 2, '#ff9ec7');
    V('pk_flamingo', 'ritmo', 112, 41, Math.PI / 2, '#3cc7b8');
    V('pk_oceano', 'giulia', 112, 61, Math.PI / 2, '#f2ead6');
    V('pk_cantiere', 'ape', 24, 82, 0, '#e8c35a');
    V('pk_cinema', 'vespa', 22, 45, Math.PI, '#b8e0ff');
    V('pk_santuario', 'cinquecento', 66, 20, 0, '#c8e0ff');
    // traffico sulla litoranea: auto distribuite sull'anello, nei due sensi
    const RING = ROADS.find(r => r.traffic);
    const TR = [['cinquecento', '#f3c6d4'], ['ritmo', '#b8302a'], ['giulia', '#2f4a3a'], ['cinquecento', '#6ab8c8'], ['ritmo', '#f2e2a0'], ['giulia', '#efe6d2'], ['ritmo', '#7fd0b0'], ['cinquecento', '#d86a4a'], ['giulia', '#5a6aa8']];
    TR.forEach(([kind, color], i) => { const dir = i % 2 ? -1 : 1, sx = RING.total * (i + .3 * (i % 2)) / TR.length, q = laneAt(RING, sx, dir); st.vehicles.push(makeVehicle(st, { id: 'tr' + i, kind, x: q.x, y: q.y, ang: q.ang, color, traffic: true, dir, speed: 6, road: RING.id, s: sx, driverLook: DRIVER_LOOKS[i % DRIVER_LOOKS.length] })); });
    // oggetti da raccogliere (coordinate del borgo, in caselle)
    const P = (kind, cx, cy, extra) => st.pickups.push(Object.assign({ id: st.nextId++, kind, x: (cx + X) * TS, y: (cy + Y) * TS, takenAt: null, respawn: null }, extra || {}));
    P('pistola', 12.5, 34.25, { ammo: 30, respawn: 240 });
    P('lupara', 1.5, 16.5, { ammo: 10, respawn: 300 });
    P('molotov', 9.5, 17.5, { ammo: 3, respawn: 180 });
    P('munizioni', 20.5, 28.5, { ammo: 30, respawn: 150 });
    P('salute', 13.5, 15.75, { respawn: 120 });
    P('salute', 34.5, 28.5, { respawn: 150 });
    P('valigetta', 27.5, 34.75, { amount: 200, nightOnly: true });
    addLog(st, 'Porto Vecchio, 1986. Sei fuori da ieri. Lo Squalo rivuole i suoi 500.000 lire entro l\'alba di giovedì.', 'info');
    return st;
  }
  function makeVehicle(st, o) {
    const K = VK[o.kind];
    return Object.assign({ speed: 0, hp: K.hp, rider: null, traffic: false, stolen: false, lent: false, mine: false, hidden: false, burning: 0, wreck: false, siren: false, crew: [], lastHitBy: null, honk: 0, stuck: 0 }, o);
  }
  function makeNpc(st, c) {
    const n = Object.assign(c, {
      first: c.id === 'pietro' ? 'Don Pietro' : c.name.replace('Agente ', '').split(' ')[0],
      x: 0, y: 0, face: st.rng() * 6.28, path: [], goal: null, goalPlace: null, wait: 0, inside: false, stun: 0, jailedUntil: 0,
      mem: [], reported: {}, action: { name: 'routine', scores: [], why: '', since: 0 }, thinkAt: st.rng() * .3, bark: null, barkCd: 0,
      op: { fear: 0, trust: 0, grudge: 0 }, alert: 0, bribed: false, framedAngry: false, speedNow: 0, anim: st.rng() * 10, gesture: 0,
      hp: c.hp || 60, maxHp: c.hp || 60, dead: false, hitT: -99, panic: 0, fleeFrom: null, aggro: false, cool: 0, mag: c.weapon ? WEAPONS[c.weapon].mag : 0, reloadT: 0, burst: 0, react: 0, seenP: null, strafe: 1, strafeT: 0, burn: 0, warned: false,
    });
    if (c.id === 'sandro') n.first = 'Sandro';
    const p = PLACES[placeFor(st, n)] || PLACES[n.home];
    n.x = p.x + (st.rng() - .5) * 3; n.y = p.y + (st.rng() - .5) * 2;
    if (!walkM(n.x, n.y)) { n.x = p.x; n.y = p.y; }
    if (n.standby || (n.nocturnal && !isNight(st))) { n.inside = true; n.action.name = 'dentro'; }
    return n;
  }

  const byId = (st, id) => st.npcs.find(n => n.id === id);
  function nameOf(st, id) { if (id === 'player') return PLAYER_NAME; if (id === 'ignoto') return 'qualcuno'; if (id === 'automobilista') return 'un automobilista'; const n = byId(st, id); return n ? n.first : '?'; }
  function rel(a, b) { if (!a || !b) return .25; for (const [x, y] of FRIENDS) if ((x === a && y === b) || (x === b && y === a)) return .8; return .25; }
  const hour = st => Math.floor(st.t / 60) % 24;
  const day = st => Math.floor(st.t / 1440) + 1;
  const isNight = st => { const h = hour(st); return h >= 20 || h < 6; };
  const clockStr = t => String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  const DAYS = ['martedì', 'mercoledì', 'giovedì', 'venerdì'];
  const dayName = t => DAYS[Math.floor(t / 1440)] || '';
  function placeFor(st, n) {
    if (n.cop) return n.standby ? 'commissariato' : PATROL[Math.floor(st.t / 40) % PATROL.length];
    const h = hour(st); let cur = n.sched[n.sched.length - 1][1];
    for (const [s, p] of n.sched) if (h >= s) cur = p;
    if (n.nocturnal && !isNight(st)) return n.home;
    return cur;
  }
  function addLog(st, text, kind, eventId) { st.log.unshift({ t: st.t, text, kind, eventId }); if (st.log.length > 120) st.log.pop(); }
  function feed(st, text, kind) { if (st.feed.some(f => f.text === text)) return; st.feed.unshift({ text, kind, until: st.clock + 6 }); if (st.feed.length > 5) st.feed.pop(); }
  const alive = n => !n.dead;

  // ---------------- PERCEZIONE E MEMORIA ----------------
  const visionRange = st => isNight(st) ? 11 : 15;
  function canSee(st, n, x, y) {
    if (n.dead || n.inside || n.stun > 0 || n.jailedUntil > st.t) return false;
    const d = dist(n.x, n.y, x, y);
    if (d > visionRange(st)) return false;
    if (d > 2.2 && Math.abs(angDiff(Math.atan2(y - n.y, x - n.x), n.face)) > 1.15) return false;
    return los(n.x, n.y, x, y);
  }
  const seesPlayer = (st, n) => canSee(st, n, st.player.x, st.player.y);
  function seesPlayerCombat(st, n) { // in combattimento si guarda intorno
    if (n.dead || n.inside || n.stun > 0) return false;
    const d = dist(n.x, n.y, st.player.x, st.player.y);
    return d < (isNight(st) ? 17 : 22) && los(n.x, n.y, st.player.x, st.player.y);
  }
  const fresh = (st, m) => Math.max(.35, Math.exp(-(st.t - m.t) / (60 * 24)));
  const weight = (st, m) => (SEV[m.type] || .5) * m.conf * fresh(st, m);

  function addMemory(st, n, m) {
    if (n.dead) return null;
    const ex = n.mem.find(k => k.eventId === m.eventId);
    if (ex) {
      let ch = false;
      if (ex.actor === 'ignoto' && m.actor !== 'ignoto') { ex.actor = m.actor; ex.framedBy = m.framedBy; if (m.source !== 'visto') { ex.source = m.source; ex.via = m.via || []; } ch = true; }
      else if (ex.actor !== m.actor && m.actor !== 'ignoto' && ex.source !== 'visto' && m.conf > ex.conf + .08) { ex.actor = m.actor; ex.framedBy = m.framedBy; ex.via = m.via; ex.source = m.source; ch = true; }
      if (m.source === 'visto' && ex.source !== 'visto') { ex.source = 'visto'; ex.via = []; ex.actor = m.actor; ex.distorted = false; ex.type = ex.trueType; ex.framedBy = null; ch = true; }
      if (m.conf > ex.conf + .05) { ex.conf = m.conf; ch = true; }
      if (ch) onLearn(st, n, ex);
      return ch ? ex : null;
    }
    const mm = Object.assign({ id: st.nextId++, via: [], distorted: false, silenced: false, closed: false, framedBy: null }, m);
    mm.trueType = mm.trueType || mm.type;
    n.mem.push(mm);
    if (n.mem.length > 30) { n.mem.sort((a, b) => weight(st, b) - weight(st, a)); n.mem.length = 30; }
    onLearn(st, n, mm);
    return mm;
  }
  function onLearn(st, n, m) {
    if (m.actor === n.id && m.framedBy === 'player' && !n.framedAngry) {
      n.framedAngry = true;
      feed(st, `${n.first} ha scoperto che vai dicendo in giro che è stato lui.`, 'bad');
      addLog(st, `${clockStr(st.t)} · ${n.name} sa che l'hai incastrato.`, 'bad');
    }
    // chi viene a sapere che hai fatto del male a uno dei suoi, ti dà la caccia
    if (n.faction && m.actor === 'player' && (m.type === 'ferimento' || m.type === 'omicidio') && byId(st, m.target) && byId(st, m.target).faction === n.faction) aggroFaction(st, n.faction);
    if (n.cop) {
      st.npcs.filter(k => k.cop && k !== n && !k.dead).forEach(other => {
        if (other.mem.find(k => k.eventId === m.eventId && k.actor === m.actor)) return;
        const c = Object.assign({}, m); delete c.id; c.source = 'radio'; c.via = (m.via || []).concat([n.first]);
        const ex = other.mem.find(k => k.eventId === m.eventId);
        if (!ex) other.mem.push(Object.assign({ id: st.nextId++ }, c));
        else if (ex.actor !== m.actor || ex.closed !== m.closed) Object.assign(ex, { actor: m.actor, framedBy: m.framedBy, closed: m.closed, silenced: m.silenced && ex.silenced });
      });
    }
  }

  function perceive(st, n, ev, spotlight) {
    if (n.dead || n.inside || n.jailedUntil > st.t) return;
    const base = { eventId: ev.id, type: ev.type, target: ev.target, owner: ev.owner, place: ev.place, shop: ev.shop, t: ev.t, accepted: ev.accepted };
    if (n.id === ev.target || (ev.type === 'rapina' && n.shop === ev.shopId)) {
      if (ev.type === 'scippo') {
        const noticed = seesPlayer(st, n) || st.rng() < .3;
        if (noticed) addMemory(st, n, Object.assign(base, { actor: 'player', conf: .95, source: 'visto' }));
        else st.timers.push({ at: st.t + 20, kind: 'discover', npc: n.id, ev: ev.id });
      } else addMemory(st, n, Object.assign(base, { actor: 'player', conf: 1, source: 'visto' }));
      return;
    }
    if (canSee(st, n, ev.x, ev.y) && seesPlayer(st, n)) {
      addMemory(st, n, Object.assign(base, { actor: 'player', conf: isNight(st) ? .82 : .95, source: 'visto' }));
      if (NEG[ev.type] && spotlight) spotlight.push(n);
    } else if (dist(n.x, n.y, ev.x, ev.y) <= ev.noise && ev.noise >= 8) {
      addMemory(st, n, Object.assign(base, { actor: 'ignoto', conf: .45, source: 'sentito' }));
      n.face = Math.atan2(ev.y - n.y, ev.x - n.x);
      st.timers.push({ atClock: st.clock + .8, kind: 'glance', npc: n.id, ev: ev.id });
    }
  }

  function emit(st, type, extra) {
    const p = st.player;
    const ev = Object.assign({ id: st.nextId++, type, actor: 'player', target: null, x: p.x, y: p.y, t: st.t, sev: SEV[type], noise: NOISE[type] }, extra || {});
    ev.place = nearestPlace(ev.x, ev.y).name;
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    const spot = [];
    st.npcs.forEach(n => perceive(st, n, ev, spot));
    const quiet = st.clock - (st.lastMomentAt || -99) < 14 || st.clock - (st.lastShotAt || -99) < 4;
    if (NEG[ev.type] && ev.type !== 'corruzione' && ev.type !== 'spari' && !quiet) {
      const named = spot.filter(n => !n.faction || !n.aggro).slice(0, 3);
      if (named.length) { st.moments.push({ kind: 'witness', npcs: named.map(n => n.id), until: st.clock + 1.6, ev: ev.id }); st.slowmo = .8; st.lastMomentAt = st.clock; }
    }
    if (['omicidio', 'esplosione', 'rapina'].includes(type)) feed(st, `Radio Porto: ${LABEL[type].toLowerCase()} a ${ev.place}.`, 'radio');
    return ev;
  }
  function panicAround(st, x, y, r, secs) {
    st.panicAt = st.clock;
    st.npcs.forEach(n => {
      if (n.dead || n.inside || n.cop || n.faction) return;
      const d = dist(n.x, n.y, x, y); if (d > r) return;
      if (d > r * .55 && !los(n.x, n.y, x, y)) return;
      if (n.panic <= 0 && st.clock > n.barkCd) say(st, n, ['Sparano!', 'Aiuto!', 'Tutti giù!', 'Madonna santa!', 'Scappate!'][Math.floor(st.rng() * 5)], 2);
      n.panic = Math.max(n.panic, secs * (1.2 - n.tr.cor * .5)); n.fleeFrom = { x, y }; n.path = [];
    });
  }

  // ---------------- FAZIONI E POLIZIA ----------------
  function aggroFaction(st, f) {
    let first = false;
    st.npcs.forEach(n => { if (n.faction === f && !n.dead && !n.aggro) { n.aggro = true; first = true; n.inside = false; if (n.action.name === 'dentro') n.action.name = 'routine'; } });
    if (first) {
      if (f === 'squalo') { feed(st, 'Gli uomini dello Squalo ti danno la caccia.', 'bad'); addLog(st, `${clockStr(st.t)} · Gli uomini dello Squalo ti danno la caccia.`, 'bad'); }
      if (f === 'marsiglia') { feed(st, 'I Marsigliesi aprono il fuoco.', 'bad'); }
    }
  }
  function hostile(st, n) {
    if (n.dead || n.jailedUntil > st.t) return false;
    if (n.cop) return wantedLevel(st) >= 2;
    if (n.faction === 'squalo') { const s = byId(st, 'sandro'); return n.aggro || n.framedAngry || (s && s.framedAngry) || (s && s.dead); }
    if (n.faction === 'marsiglia') return n.aggro;
    return false;
  }
  function wantedLevel(st) {
    let a = 0; st.npcs.forEach(n => { if (n.cop && !n.dead) { opinions(st, n); a = Math.max(a, n.alert); } });
    let lv = a < .45 ? 0 : a < .8 ? 1 : a < .93 ? 2 : 3;
    if (lv > 0 && (st.copKilled || st.player.kills >= 3)) lv = Math.min(4, Math.max(3, lv + 1));
    return lv;
  }

  // ---------------- AZIONI DEL GIOCATORE ----------------
  function nearestNpc(st, range) {
    let best = null, bd = range || 1.8;
    for (const n of st.npcs) { if (n.dead || n.inside || n.jailedUntil > st.t) continue; const d = dist(n.x, n.y, st.player.x, st.player.y); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function nearestVehicle(st, range) {
    let best = null, bd = 1e9;
    for (const v of st.vehicles) { if (v.rider || v.hidden || v.wreck || v.burning) continue; const K = VK[v.kind], q = vLocal(v, st.player.x, st.player.y); const d = Math.hypot(Math.max(0, Math.abs(q.lx) - K.len / 2), Math.max(0, Math.abs(q.ly) - K.wid / 2)); if (d < (range || 1.8) && d < bd) { bd = d; best = v; } }
    return best;
  }
  function shopkeeperHere(st) {
    const n = nearestNpc(st, 2.4);
    if (n && n.shop && PLACES[n.shop] && dist(n.x, n.y, PLACES[n.shop].x, PLACES[n.shop].y) < 5) return n;
    return null;
  }
  function vehicleName(st, v) { if (v.kind === 'vespa') return `la Vespa${v.owner ? ' di ' + nameOf(st, v.owner) : ''}`; return `la ${VK[v.kind].label}${v.owner ? ' di ' + nameOf(st, v.owner) : ''}`; }
  function context(st) {
    const p = st.player, out = [];
    if (st.over) return out;
    if (p.vehicle) { const v = st.vehicles.find(k => k.id === p.vehicle); out.push({ key: 'F', label: v.kind === 'vespa' ? 'Scendi dalla Vespa' : 'Scendi dall\'auto' }); return out; }
    const n = nearestNpc(st, 2.2), v = nearestVehicle(st, 1.8), sk = shopkeeperHere(st);
    if (n) out.push({ key: 'T', label: `Parla con ${n.first}` });
    if (sk) out.push({ key: 'E', label: `Rapina ${PLACES[sk.shop].name}`, bad: true });
    else if (n && !n.cop && !n.faction) out.push({ key: 'E', label: `Scippa ${n.first}`, bad: true });
    if (v) out.push({ key: 'F', label: v.lent ? 'Sali sulla Vespa di Beppe' : v.traffic ? `Tira giù l'automobilista (${VK[v.kind].label})` : `Ruba ${vehicleName(st, v)}`, bad: !v.lent && !v.mine });
    return out;
  }

  function exitVehicle(st) {
    const p = st.player, v = st.vehicles.find(k => k.id === p.vehicle); if (!v) { p.vehicle = null; return; }
    if (Math.abs(v.speed) > 7) { p.stun = .7; damagePlayer(st, 12, v.ang + Math.PI, 'caduta'); }
    v.rider = null; p.vehicle = null;
    const r = VK[v.kind].r + .6;
    for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) { const x = v.x + Math.cos(v.ang + off) * r, y = v.y + Math.sin(v.ang + off) * r; if (walkM(x, y)) { p.x = x; p.y = y; break; } }
    scaleVel(v, .3);
  }
  function act(st, type) {
    const p = st.player, rng = st.rng;
    if (st.over || p.stun > 0) return { ok: false };
    if (type === 'veicolo') {
      if (p.vehicle) { exitVehicle(st); return { ok: true, msg: '' }; }
      const v = nearestVehicle(st, 1.8); if (!v) return { ok: false, msg: 'Nessun mezzo qui vicino.' };
      if (v.traffic && Math.abs(v.speed) > 3.5) return { ok: false, msg: 'Va troppo veloce. Mettiti davanti per fermarla.' };
      p.carrying = null;
      if (v.traffic) {
        v.traffic = false; v.stolen = true; v.mine = true;
        const d = makeNpc(st, { id: 'drv' + (++st.drvN), name: 'Automobilista', role: 'Gli hai rubato l\'auto', home: ['stella', 'aurora', 'mare'][st.drvN % 3], tr: { cor: .4, loq: .8, avid: .4, legge: .8 }, sched: [[0, 'piazza']], passante: true, driver: true, look: v.driverLook || DRIVER_LOOKS[0] });
        d.first = 'L\'automobilista'; d.x = v.x + Math.cos(v.ang + Math.PI / 2) * 1.6; d.y = v.y + Math.sin(v.ang + Math.PI / 2) * 1.6; if (!walkM(d.x, d.y)) { d.x = v.x; d.y = v.y - 2; }
        d.stun = .6; st.npcs.push(d);
        const ev = emit(st, 'furto_auto', { target: d.id, owner: d.id });
        d.panic = 5; d.fleeFrom = { x: p.x, y: p.y };
        addLog(st, `${clockStr(st.t)} · Hai tirato fuori un automobilista dalla sua ${VK[v.kind].label}.`, 'bad', ev.id);
        v.rider = 'player'; p.vehicle = v.id; v.driverLook = null;
        return { ok: true, msg: `Apri la portiera e lo tiri giù. La ${VK[v.kind].label} è tua.` };
      }
      v.rider = 'player'; p.vehicle = v.id;
      if (!v.lent && !v.mine) {
        v.mine = true; v.stolen = true;
        const ev = emit(st, v.kind === 'vespa' ? 'furto_vespa' : 'furto_auto', { owner: v.owner, target: null, vehId: v.id });
        if (v.owner) st.timers.push({ at: st.t + 30, kind: 'discoverVehicle', npc: v.owner, ev: ev.id, kindV: v.kind });
        if (v.owner === 'sandro') aggroFaction(st, 'squalo');
        addLog(st, `${clockStr(st.t)} · Hai rubato ${vehicleName(st, v)}.`, 'bad', ev.id);
        return { ok: true, msg: v.kind === 'vespa' ? `Colleghi i fili. ${vehicleName(st, v)[0].toUpperCase() + vehicleName(st, v).slice(1)} è tua, per ora.` : `Un cacciavite nel blocchetto e parte. ${vehicleName(st, v)[0].toUpperCase() + vehicleName(st, v).slice(1)} è tua.` };
      }
      return { ok: true, msg: '' };
    }
    if (p.vehicle) return { ok: false };
    if (type === 'scippo') {
      const sk = shopkeeperHere(st);
      if (sk) {
        const key = sk.shop; if (st.t - (st.robbed[key] || -9999) < 12 * 60) return { ok: false, msg: 'La cassa è vuota. L\'hai già svuotata.' };
        st.robbed[key] = st.t; const gain = (key === 'wu' ? 150 : 120) + (p.cur !== 'pugni' ? 30 : 0); p.money += gain;
        sk.gesture = 2;
        const ev = emit(st, 'rapina', { target: sk.id, shopId: key, shop: PLACES[key].name });
        addLog(st, `${clockStr(st.t)} · Hai rapinato ${PLACES[key].name} (+${gain}.000 lire).`, 'bad', ev.id);
        st.sfx.push({ k: 'cash' }); gainXp(st, 25); const lootS = rollLoot(st, .5);
        return { ok: true, msg: (lootS ? `Ti porti via anche: ${ITEMS[lootS].name}. ` : '') + `${sk.first} ti riempie il sacchetto con le mani che tremano. +${gain}.000 lire.` };
      }
      const tg = nearestNpc(st, 1.8); if (!tg || tg.cop || tg.faction) return { ok: false, msg: 'Nessuno a portata di mano.' };
      const gain = st.t - (tg.robbedAt || -999) < 180 ? 0 : 15 + Math.floor(rng() * 30); tg.robbedAt = st.t; p.money += gain;
      const ev = emit(st, 'scippo', { target: tg.id });
      addLog(st, `${clockStr(st.t)} · Hai scippato ${tg.name} (+${gain}.000 lire).`, 'bad', ev.id);
      if (gain) st.sfx.push({ k: 'cash' });
      const lootP = gain ? rollLoot(st, .35) : null; if (gain) gainXp(st, 8);
      return { ok: true, msg: lootP ? `${tg.first}: ${gain}.000 lire e ${ITEMS[lootP].name.toLowerCase()}.` : gain ? `Il portafoglio di ${tg.first}: ${gain}.000 lire.` : `${tg.first} non ha più niente addosso.` };
    }
    return { ok: false };
  }

  // ---------------- COMBATTIMENTO ----------------
  function giveWeapon(st, w, ammo) {
    const p = st.player, W = WEAPONS[w];
    if (w === 'molotov') { p.arms.molotov = { mag: ((p.arms.molotov && p.arms.molotov.mag) || 0) + ammo }; return; }
    if (!p.arms[w]) p.arms[w] = { mag: Math.min(W.mag, ammo), reserve: Math.max(0, ammo - W.mag) };
    else p.arms[w].reserve += ammo;
  }
  function switchWeapon(st, id) {
    const p = st.player, owned = Object.keys(WEAPONS).filter(k => p.arms[k] && (k !== 'molotov' || p.arms.molotov.mag > 0));
    if (typeof id === 'number') { const i = owned.indexOf(p.cur); id = owned[(i + id + owned.length) % owned.length]; }
    if (!p.arms[id] || (id === 'molotov' && !(p.arms.molotov.mag > 0))) return false;
    if (id !== p.cur) { p.cur = id; p.reload = 0; p.cool = Math.max(p.cool, .15 * (1 - .15 * skill(st, 'mani'))); st.sfx.push({ k: 'switch' }); }
    return true;
  }
  function reload(st) {
    const p = st.player, W = WEAPONS[p.cur], a = p.arms[p.cur];
    if (!W.mag || W.throw || p.reload > 0 || a.mag >= W.mag || a.reserve <= 0) return false;
    p.reload = W.reload * (1 - .1 * skill(st, 'mani')); st.sfx.push({ k: 'reload', w: p.cur }); return true;
  }
  // il giocatore preme il grilletto
  function fire(st, aim, aimPoint, pressed) {
    const p = st.player;
    if (st.over || p.stun > 0 || p.cool > 0 || p.reload > 0) return false;
    const W = WEAPONS[p.cur], a = p.arms[p.cur];
    if (!W.auto && !pressed && !W.melee) return false;
    if (W.melee) {
      if (p.vehicle) return false;
      p.cool = W.rate; p.punch = .25; st.sfx.push({ k: 'swing' });
      let best = null, bd = W.range;
      st.npcs.forEach(n => { if (n.dead || n.inside) return; const d = dist(n.x, n.y, p.x, p.y); if (d < bd && Math.abs(angDiff(Math.atan2(n.y - p.y, n.x - p.x), aim)) < 1.0) { bd = d; best = n; } });
      if (best) {
        st.sfx.push({ k: 'punch' }); st.fx.push({ k: 'hitpuff', x: best.x, y: best.y });
        best.stun = Math.max(best.stun, 1.1 + .15 * skill(st, 'rissa'));
        const firstHit = st.clock - (best.lastPunched || -99) > 6; best.lastPunched = st.clock;
        damage(st, best, W.dmg * (1 + .2 * skill(st, 'rissa')), 'player', aim, 'pugni');
        if (firstHit && !best.dead) { const ev = emit(st, 'aggressione', { target: best.id }); addLog(st, `${clockStr(st.t)} · Hai colpito ${best.name}.`, 'bad', ev.id); }
        st.hitMark = { t: st.clock, kill: best.dead };
      }
      return true;
    }
    if (W.throw) {
      if (!(a.mag > 0)) return false;
      a.mag--; p.cool = W.rate; p.punch = .3;
      let tx = aimPoint ? aimPoint.x : p.x + Math.cos(aim) * 8, ty = aimPoint ? aimPoint.y : p.y + Math.sin(aim) * 8;
      const d = Math.min(W.range, dist(p.x, p.y, tx, ty)); tx = p.x + Math.cos(aim) * d; ty = p.y + Math.sin(aim) * d;
      const Tf = .5 + d / 22, g = 18;
      st.proj.push({ x: p.x, y: p.y, z: 1.5, vx: (tx - p.x) / Tf, vy: (ty - p.y) / Tf, vz: (-1.5 + .5 * g * Tf * Tf) / Tf, g, kind: 'molotov', owner: 'player' });
      st.sfx.push({ k: 'throw' });
      if (a.mag <= 0) { delete p.arms.molotov; p.cur = 'pugni'; }
      return true;
    }
    if (a.mag <= 0) { if (!reload(st)) { st.sfx.push({ k: 'empty' }); p.cool = .25; } return false; }
    a.mag--; p.cool = W.rate;
    const moving = Math.abs(p.speed) > .5 ? .03 : 0;
    const calm = st.clock < p.calmUntil ? .7 : 1, aimK = (1 - .1 * skill(st, 'mira')) * calm;
    const spread = (W.spread + p.bloom + moving) * aimK;
    shoot(st, p, p.cur, aim, spread, 'player');
    p.bloom = Math.min(.18, p.bloom + W.bloom * aimK);
    st.kick = { a: aim, amt: W.kick, t: st.clock }; st.shake = Math.max(st.shake, W.shake);
    // l'evento «spari» viene registrato una volta per raffica
    const last = st.shotEv;
    if (!last || st.clock - last.clock > 7 || dist(last.x, last.y, p.x, p.y) > 12) {
      const ev = emit(st, 'spari', {}); st.shotEv = { clock: st.clock, x: p.x, y: p.y, id: ev.id };
      addLog(st, `${clockStr(st.t)} · Hai sparato a ${ev.place}.`, 'bad', ev.id);
    }
    st.lastShotAt = st.clock;
    panicAround(st, p.x, p.y, 26, 7);
    if (a.mag <= 0) reload(st);
    return true;
  }
  // colpo generico (giocatore o NPC)
  function shoot(st, s, wid, ang, spread, who) {
    const W = WEAPONS[wid];
    const sx = s.x + Math.cos(ang) * .55, sy = s.y + Math.sin(ang) * .55;
    const myVeh = who === 'player' ? st.player.vehicle : null;
    st.fx.push({ k: 'muzzle', x: sx, y: sy, a: ang, w: wid, npc: who !== 'player' });
    if (W.shell) st.fx.push({ k: 'shell', x: s.x, y: s.y, a: ang });
    st.sfx.push({ k: 'shot', w: wid, x: s.x, y: s.y, npc: who !== 'player' });
    let anyHit = false, anyKill = false;
    for (let k = 0; k < W.pellets; k++) {
      const a = ang + (st.rng() - .5) * 2 * spread + (st.rng() - .5) * spread * .6;
      const ca = Math.cos(a), sa = Math.sin(a);
      let hx = sx + ca * W.range, hy = sy + sa * W.range, hit = null, hitKind = 'none';
      for (let t = 0; t < W.range; t += .22) {
        const x = sx + ca * t, y = sy + sa * t;
        if (solidM(x, y)) { hx = x; hy = y; hitKind = 'wall'; break; }
        let found = false;
        for (const n of st.npcs) {
          if (n === s || n.dead || n.inside || n.jailedUntil > st.t) continue;
          if (Math.abs(n.x - x) < .45 && Math.abs(n.y - y) < .45 && dist(n.x, n.y, x, y) < .42) { hit = n; hitKind = 'npc'; found = true; break; }
        }
        if (!found && who !== 'player' && !st.player.vehicle && dist(st.player.x, st.player.y, x, y) < .42) { hit = 'player'; hitKind = 'player'; found = true; }
        if (!found) for (const v of st.vehicles) {
          if (v.hidden || v.id === myVeh || (s.vehicleId && s.vehicleId === v.id)) continue;
          if (Math.abs(v.x - x) < 2.5 && Math.abs(v.y - y) < 2.5 && insideVehicle(v, x, y, -.05)) { hit = v; hitKind = 'vehicle'; found = true; break; }
        }
        if (found) { hx = x; hy = y; break; }
      }
      const tlen = dist(sx, sy, hx, hy);
      const fall = tlen > W.range * .55 ? 1 - .55 * (tlen - W.range * .55) / (W.range * .45) : 1;
      const dmg = W.dmg * fall * (who === 'player' ? 1 : .55);
      st.fx.push({ k: 'tracer', x0: sx, y0: sy, x1: hx, y1: hy, w: wid, npc: who !== 'player' });
      if (hitKind === 'wall') st.fx.push({ k: 'spark', x: hx, y: hy, a });
      else if (hitKind === 'npc') { st.fx.push({ k: 'blood', x: hx, y: hy, a }); const wasDead = hit.dead; damage(st, hit, dmg, who, a, wid); anyHit = true; if (!wasDead && hit.dead) anyKill = true; }
      else if (hitKind === 'player') { st.fx.push({ k: 'blood', x: hx, y: hy, a }); damagePlayer(st, dmg, a, s.id); }
      else if (hitKind === 'vehicle') { st.fx.push({ k: 'metal', x: hx, y: hy, a }); damageVehicle(st, hit, dmg * .8, who); if (hit.rider === 'player' && who !== 'player') damagePlayer(st, dmg * .25, a, s.id); }
    }
    if (who === 'player' && anyHit) { st.hitMark = { t: st.clock, kill: anyKill }; st.sfx.push({ k: anyKill ? 'kill' : 'hit' }); }
  }
  function damage(st, n, dmg, attacker, ang, wid) {
    if (n.dead) return;
    n.hp -= dmg; n.hitT = st.clock;
    const kb = (WEAPONS[wid] && WEAPONS[wid].knock) || .35;
    const nx = n.x + Math.cos(ang) * kb * .5, ny = n.y + Math.sin(ang) * kb * .5; if (walkM(nx, ny)) { n.x = nx; n.y = ny; }
    if (n.inside) n.inside = false;
    if (attacker === 'player') {
      if (n.faction) aggroFaction(st, n.faction);
      if (n.id === 'sandro' || n.id === 'rocco' || n.id === 'tano') aggroFaction(st, 'squalo');
      n.aggro = true;
    }
    if (n.hp <= 0) { kill(st, n, attacker, ang); return; }
    n.stun = Math.max(n.stun, .18);
    if (!n.faction && !n.cop) { n.panic = 8; n.fleeFrom = attacker === 'player' ? { x: st.player.x, y: st.player.y } : { x: n.x - Math.cos(ang) * 5, y: n.y - Math.sin(ang) * 5 }; }
    if (attacker === 'player' && wid !== 'pugni' && st.clock - (n.lastWoundEv || -99) > 4) {
      n.lastWoundEv = st.clock;
      const ev = emit(st, 'ferimento', { target: n.id }); addLog(st, `${clockStr(st.t)} · Hai ferito ${n.name}.`, 'bad', ev.id);
      if (!n.faction && !n.cop) say(st, n, ['Mi ha colpito!', 'Aaah! Aiuto!', 'Non sparare!'][Math.floor(st.rng() * 3)], 2);
    }
  }
  function kill(st, n, attacker, ang) {
    n.dead = true; n.hp = 0; n.deathT = st.clock; n.face = ang + Math.PI; n.path = []; n.action = { name: 'morto', scores: [], why: 'È morto.' }; n.bark = null; n.stun = 0; n.panic = 0;
    st.fx.push({ k: 'bloodpool', x: n.x, y: n.y });
    if (n.weapon) { st.pickups.push({ id: st.nextId++, kind: n.weapon, x: n.x + .4, y: n.y, ammo: n.weapon === 'lupara' ? 8 : n.weapon === 'mitra' ? 40 : 20, drop: true }); }
    const cash = n.faction === 'marsiglia' ? 60 : n.faction === 'squalo' ? 40 : n.cop ? 0 : 5 + Math.floor(st.rng() * 15);
    if (cash) st.pickups.push({ id: st.nextId++, kind: 'soldi', x: n.x - .3, y: n.y + .3, amount: cash, drop: true });
    if (n.cop && attacker === 'player') st.copKilled = true;
    if (attacker === 'player') {
      st.player.kills++; if (n.faction || n.cop || n.aggro) gainXp(st, 15);
      const ev = emit(st, 'omicidio', { target: n.id, x: n.x, y: n.y });
      addLog(st, `${clockStr(st.t)} · Hai ucciso ${n.name}.`, 'bad', ev.id);
      st.hitstop = .07; st.slowmo = Math.max(st.slowmo, .35);
    } else addLog(st, `${clockStr(st.t)} · ${n.name} è morto nella sparatoria.`, 'info');
    if (st.job && st.job.giver === n.id) { st.job = null; feed(st, 'Il lavoro è saltato.', 'bad'); }
    if (n.id === 'sandro' && !st.over) {
      st.deadline = 1e9;
      st.pendingEnd = { at: st.clock + 7, win: true, reason: attacker === 'player' ? 'Lo Squalo è morto e con lui il tuo debito. Ma adesso tutto il porto sa chi sei.' : 'Lo Squalo è morto in una sparatoria. Il tuo debito è finito sott\'acqua con lui.' };
      feed(st, 'Lo Squalo è morto. Il debito non esiste più.', 'money');
      aggroFaction(st, 'squalo');
    }
    st.sfx.push({ k: 'death', x: n.x, y: n.y });
  }
  function damagePlayer(st, dmg, ang, src) {
    const p = st.player; if (st.over) return;
    if (p.vehicle) { const v = st.vehicles.find(k => k.id === p.vehicle); if (v) dmg *= .5; }
    p.hp -= dmg; p.hurtT = st.clock; p.lastHurtBy = src; st.shake = Math.max(st.shake, .18);
    st.fx.push({ k: 'hurt', a: ang }); st.sfx.push({ k: 'hurt' });
    if (p.hp <= 0) wasted(st);
  }
  function damageVehicle(st, v, dmg, by) {
    if (v.wreck) return;
    v.hp -= dmg; if (by) v.lastHitBy = by;
    if (v.traffic) { v.panicT = st.clock; }
    if (v.hp <= 0 && !v.burning) { v.burning = 3.2; v.hp = 0; st.sfx.push({ k: 'ignite', x: v.x, y: v.y }); }
  }
  function explode(st, v) {
    v.wreck = true; v.burning = 0; v.speed = 0; v.siren = false; v.traffic = false;
    st.fx.push({ k: 'explosion', x: v.x, y: v.y }); st.sfx.push({ k: 'explosion', x: v.x, y: v.y });
    blastMap(st, v.x, v.y, 3.6);
    st.shake = Math.max(st.shake, dist(v.x, v.y, st.player.x, st.player.y) < 20 ? .7 : .25);
    st.fires.push({ x: v.x, y: v.y, r: 1.6, until: st.clock + 8, owner: v.lastHitBy });
    const byPlayer = v.lastHitBy === 'player' || v.rider === 'player';
    if (v.rider === 'player') { exitVehicle(st); damagePlayer(st, 55, 0, 'esplosione'); st.player.stun = 1; }
    st.npcs.forEach(n => {
      if (n.dead || n.inside) return; const d = dist(n.x, n.y, v.x, v.y);
      if (d < 5.5) { const a = Math.atan2(n.y - v.y, n.x - v.x); n.stun = 1.5; damage(st, n, 130 * (1 - d / 5.5), byPlayer ? 'player' : 'env', a, 'lupara'); }
    });
    if (!v.rider && dist(st.player.x, st.player.y, v.x, v.y) < 5.5 && !st.player.vehicle) damagePlayer(st, 70 * (1 - dist(st.player.x, st.player.y, v.x, v.y) / 5.5), 0, 'esplosione');
    v.vx = 0; v.vy = 0; v.w = (st.rng() - .5) * 3; v.speed = 0; v._spd = 0;
    st.vehicles.forEach(o => {
      if (o === v || o.hidden) return; const d = dist(o.x, o.y, v.x, v.y); if (d > 9) return;
      if (!o.wreck && d < 6) damageVehicle(st, o, 55, v.lastHitBy);
      ensureVel(o); const k = (1 - d / 9) * 14 * 1000 / VK[o.kind].m, a = Math.atan2(o.y - v.y, o.x - v.x);
      o.vx += Math.cos(a) * k; o.vy += Math.sin(a) * k; o.w += (st.rng() - .5) * k * .9; o.speed = fwd(o); o._spd = o.speed; loosen(st, o, 4);
    });
    panicAround(st, v.x, v.y, 40, 10);
    if (byPlayer) { const ev = emit(st, 'esplosione', { x: v.x, y: v.y }); addLog(st, `${clockStr(st.t)} · Hai fatto saltare ${vehicleName(st, v)}.`, 'bad', ev.id); }
    if (v.crew) v.crew = [];
  }
  function wasted(st) {
    const p = st.player; if (p.dead) return;
    if (p.vehicle) exitVehicle(st);
    const fee = Math.ceil(p.money * .3);
    p.money -= fee; p.hp = maxHp(st); p.arms = { pugni: {} }; p.cur = 'pugni'; p.carrying = null; p.stun = 0;
    if (st.job && !st.job.crime) st.job = null;
    p.x = PLACES.ambulatorio.x; p.y = PLACES.ambulatorio.y + 1; st.t += 240;
    closePoliceCases(st);
    st.npcs.forEach(n => { if (n.faction === 'marsiglia') n.aggro = false; });
    addLog(st, `${clockStr(st.t)} · Ti sei risvegliato in ambulatorio. Quattro ore perse, ${fee}.000 lire di spese, armi sparite.`, 'bad');
    feed(st, `Ti hanno ricucito in ambulatorio. −${fee}.000 lire, armi perse.`, 'bad');
    st.moments.push({ kind: 'wasted', until: st.clock + 2.8 });
    if (p.arrests >= 3) return;
  }
  function closePoliceCases(st) {
    st.npcs.forEach(n => { if (n.cop) { n.mem.forEach(m => { if (m.actor === 'player') m.closed = true; }); n.alert = 0; n.path = []; if (!n.dead) n.action.name = 'pattuglia'; } });
    st.lastSeen = null; st.copKilled = false; st.player.kills = 0;
    st.npcs = st.npcs.filter(n => !n.reinforcement || n.dead);
    if (st.reinf) { const car = st.vehicles.find(v => v.id === st.reinf.car); if (car && !car.wreck) car.leaving = true; st.reinf = null; }
  }

  // ---------------- DIALOGHI ----------------
  function verbPast(st, m, listenerId) {
    const T = m.target === listenerId ? 'me' : nameOf(st, m.target);
    const ow = m.owner === listenerId ? 'mia' : 'di ' + nameOf(st, m.owner);
    switch (m.type) {
      case 'scippo': return T === 'me' ? 'mi ha scippato' : `ha scippato ${T}`;
      case 'aggressione': return T === 'me' ? 'mi ha picchiato' : `ha picchiato ${T}`;
      case 'rapina': return m.target === listenerId ? 'mi ha rapinato' : `ha rapinato ${m.shop || 'un negozio'}`;
      case 'furto_vespa': return ow === 'mia' ? 'mi ha rubato la Vespa' : m.owner ? `ha rubato la Vespa ${ow}` : 'ha rubato una Vespa';
      case 'furto_auto': return ow === 'mia' ? 'mi ha rubato la macchina' : m.owner ? `ha rubato la macchina ${ow}` : 'ha rubato una macchina';
      case 'investimento': return T === 'me' ? 'mi ha investito' : `ha investito ${T}`;
      case 'corruzione': return `ha provato a comprare ${T === 'me' ? 'me' : T}`;
      case 'lavoro': return T === 'me' ? 'mi ha dato una mano' : `ha dato una mano a ${T}`;
      case 'spari': return 'ha sparato in mezzo alla strada';
      case 'ferimento': return T === 'me' ? 'mi ha sparato' : `ha sparato a ${T}`;
      case 'omicidio': return `ha ammazzato ${T === 'me' ? 'qualcuno' : T}`;
      case 'esplosione': return 'ha fatto saltare in aria una macchina';
      case 'molotov': return 'ha lanciato una molotov';
    }
    return 'ha fatto qualcosa';
  }
  function youVerb(st, m, listenerId) { return verbPast(st, m, listenerId).replace(/^mi ha /, 'mi hai ').replace(/^ha /, 'hai '); }
  function sourcePhrase(st, n, m) {
    if (m.source === 'visto') return 'Ti ho visto con i miei occhi:';
    if (m.source === 'voce' || m.source === 'radio' || m.source === 'denuncia') return `${m.via[m.via.length - 1] || 'Qualcuno'} mi ha detto che`;
    return 'Lo so e basta:';
  }
  function worstAboutPlayer(st, n) {
    return n.mem.filter(m => m.actor === 'player' && NEG[m.type] && !(m.type === 'corruzione' && m.accepted && m.target === n.id)).sort((a, b) => weight(st, b) - weight(st, a))[0];
  }

  const JOBS = {
    wu: { title: 'Casse dal molo', pickup: 'molo', drop: 'wu', pay: 40, ask: 'Al molo dei pescatori c\'è una cassa di verdura per me. Me la porti?', item: 'una cassa di verdura' },
    gino: { title: 'Ghiaccio per il bar', pickup: 'calata', drop: 'bar', pay: 30, ask: 'Mi serve il ghiaccio dalla calata, stasera si lavora. Vai?', item: 'un blocco di ghiaccio' },
    rosa: { title: 'Fiori per Don Pietro', pickup: 'fiori', drop: 'chiesa', pay: 25, ask: 'Porta questi gigli in chiesa a Don Pietro. Per l\'altare.', item: 'un mazzo di gigli' },
    lucia: { title: 'Medicine per la signora Marta', pickup: 'ambulatorio', drop: 'stella', pay: 30, ask: 'La signora Marta aspetta le sue gocce, Condominio Stella. Me le porti tu?', item: 'le gocce di Marta' },
    tonino: { title: 'Scarico al pontile', pickup: 'pontile', drop: 'osteria', pay: 35, ask: 'Al pontile est c\'è una cassa di vino per l\'osteria. Ho la schiena a pezzi. Di notte però stai lontano: ci sono i Marsigliesi.', item: 'una cassa di vino' },
    beppe: { title: 'Consegna in Vespa', pickup: 'officina', drop: 'miramare', pay: 60, vespa: true, ask: 'Ti presto la mia Vespa: porta questo pezzo di ricambio al portiere del Miramare. E riportamela intera.', item: 'un carburatore' },
    sandro: { title: 'Portami un mezzo', drop: 'magazzino', pay: 100, crime: true, ask: 'Vuoi fare in fretta? Portami un mezzo qui al magazzino. Una Vespa: 100. Una macchina: 160. Non chiedo di chi è.' },
  };
  function jobRefusal(st, n) {
    if (!JOBS[n.id] || n.id === 'sandro') return null;
    const w = worstAboutPlayer(st, n);
    const bad = w && (w.target === n.id || w.owner === n.id || rel(n.id, w.target) >= .7 || rel(n.id, w.owner) >= .7 || SEV[w.type] * w.conf >= .5);
    if (n.op.grudge > .3 || n.op.fear > .45 || bad) {
      if (w) return `${sourcePhrase(st, n, w)} ${youVerb(st, w, n.id)}. ${n.op.fear > n.op.grudge ? 'Lasciami in pace.' : 'Con me hai chiuso.'}`;
      return 'Non mi fido di te. Gira al largo.';
    }
    return null;
  }
  function talk(st, n) {
    opinions(st, n);
    const lines = [], opts = [];
    const w = worstAboutPlayer(st, n);
    if (hostile(st, n)) lines.push(n.cop ? 'Getta l\'arma! Mani in alto!' : 'Tu sei morto, Nino.');
    else if (n.framedAngry) lines.push('Vai in giro a dire che sono stato io? Hai una bella faccia tosta.');
    else if (n.id === 'sandro') lines.push(st.player.money >= st.debt ? `Allora, ${PLAYER_NAME}? Sento odore di soldi.` : `${PLAYER_NAME}. Ti restano ${hoursLeft(st)} ore. Io non aspetto.`);
    else if (n.faction === 'squalo') lines.push(['Lo Squalo è di là. Non farlo aspettare.', 'Hai i soldi? No? Allora sparisci.'][Math.floor(st.rng() * 2)]);
    else if (n.faction === 'marsiglia') lines.push(['Dégage. Ici c\'est pas pour toi.', 'Casse-toi, petit. Vai via.'][Math.floor(st.rng() * 2)]);
    else if (n.op.fear > .5) lines.push('Stammi lontano. Non ho fatto niente.');
    else if (w && n.op.grudge > .25) lines.push(`${sourcePhrase(st, n, w)} ${youVerb(st, w, n.id)}. Cosa vuoi ancora?`);
    else if (n.op.trust > .35) lines.push(n.shop === 'bar' ? `${PLAYER_NAME}! Il caffè per te lo offre la casa.` : `Ciao ${PLAYER_NAME}. Grazie ancora per l\'altra volta.`);
    else if (n.cop) lines.push(n.alert >= .45 ? 'Tu. Ti stavamo cercando.' : 'Documenti in regola? Circolare.');
    else lines.push(['Sì?', 'Dimmi.', 'Ciao. Ti conosco?', 'Mmh?'][Math.floor(st.rng() * 4)]);
    if (hostile(st, n)) { opts.push({ id: 'ciao', label: 'Vattene.' }); return { npc: n.id, lines, opts }; }
    if (n.id === 'sandro' && st.player.money >= st.debt) opts.push({ id: 'paga', label: `Paga lo Squalo (${st.debt}.000 lire)` });
    if (n.id === 'sandro') opts.push({ id: 'ferro', label: 'Mi serve un ferro.' });
    if (n.id === 'sandro' && lootValue(st) > 0) opts.push({ id: 'refurtiva', label: `Ti vendo la roba (${lootValue(st)}.000 lire)` });
    if (JOBS[n.id]) opts.push({ id: 'lavoro', label: n.id === 'sandro' ? 'Hai un lavoretto?' : 'Hai un lavoro per me?' });
    opts.push({ id: 'voci', label: 'Cosa si dice in giro?' });
    if (w && !w.silenced && !n.bribed && !n.cop) opts.push({ id: 'corrompi', label: 'Tieni, e dimentica quello che sai (30.000 lire)' });
    if (st.events.some(e => NEG[e.type] && e.type !== 'corruzione') && !n.cop && !n.faction) opts.push({ id: 'calunnia', label: 'Metti in giro una voce…' });
    opts.push({ id: 'ciao', label: 'Niente, ci vediamo.' });
    return { npc: n.id, lines, opts };
  }
  function hoursLeft(st) { return Math.max(0, Math.ceil((st.deadline - st.t) / 60)); }
  function talkChoice(st, n, choice, arg) {
    const p = st.player; opinions(st, n);
    n.face = Math.atan2(p.y - n.y, p.x - n.x);
    if (choice === 'paga') {
      if (p.money < st.debt) return { lines: ['Non farmi perdere tempo.'], end: true };
      p.money -= st.debt; st.over = { win: true, reason: 'Hai pagato lo Squalo. Il debito è saldato.' };
      return { lines: ['Contati. Tutti. Sei un uomo libero, Nino. Per stavolta.'], end: true };
    }
    if (choice === 'refurtiva') {
      const v = lootValue(st); if (!v) return { lines: ['E cosa mi vendi, l\'aria?'], end: true };
      for (const k in p.inv) if (ITEMS[k] && ITEMS[k].value) delete p.inv[k];
      p.money += v; st.sfx.push({ k: 'cash' }); gainXp(st, 5);
      addLog(st, `${clockStr(st.t)} · Hai venduto la refurtiva allo Squalo (+${v}.000 lire).`, 'info');
      return { lines: ['Roba calda. Te la prendo, ma non farti vedere in giro con quella faccia.'], end: true, result: 'good' };
    }
    if (choice === 'ferro') {
      const has = !!p.arms.pistola;
      if (!arg) return { lines: [has ? 'Vuoi colpi? Venti la scatola.' : 'Una Beretta pulita, mai usata. Sessanta. I colpi a parte.'], opts: [has ? { id: 'ferro', arg: { buy: 'munizioni' }, label: `Scatola di colpi (${discount(st, 20)}.000 lire)` } : { id: 'ferro', arg: { buy: 'pistola' }, label: `Prendo la Beretta con 30 colpi (${discount(st, 60)}.000 lire)` }, { id: 'ferro', arg: { buy: 'molotov' }, label: `Tre bottiglie «speciali» (${discount(st, 30)}.000 lire)` }, { id: 'ciao', label: 'Ci penso.' }] };
      const price = discount(st, { pistola: 60, munizioni: 20, molotov: 30 }[arg.buy]);
      if (p.money < price) return { lines: ['Senza soldi niente ferro. Le regole le sai.'], end: true };
      p.money -= price;
      if (arg.buy === 'pistola') { giveWeapon(st, 'pistola', 30); switchWeapon(st, 'pistola'); }
      if (arg.buy === 'munizioni') giveWeapon(st, 'pistola', 30);
      if (arg.buy === 'molotov') giveWeapon(st, 'molotov', 3);
      st.sfx.push({ k: 'pickup' });
      return { lines: ['Non te l\'ho data io. Non ci siamo mai visti.'], end: true, result: 'good' };
    }
    if (choice === 'lavoro') {
      if (st.job) return { lines: ['Prima finisci quello che stai facendo.'], end: false };
      if (st.jobCd[n.id] && st.t < st.jobCd[n.id]) return { lines: ['Per oggi basta così, grazie. Ripassa più tardi.'], end: false };
      const r = jobRefusal(st, n); if (r) return { lines: [r], end: false, refused: true };
      const J = JOBS[n.id];
      st.job = { giver: n.id, title: J.title, stage: J.pickup ? 'pickup' : 'drop', pickup: J.pickup, drop: J.drop, pay: J.pay, item: J.item, vespa: !!J.vespa, crime: !!J.crime };
      if (J.vespa) { const v = st.vehicles.find(k => k.id === 'v_beppe'); if (v && !v.stolen) { v.lent = true; v.mine = true; } }
      feed(st, `Lavoro: ${J.title}`, 'job');
      return { lines: [J.ask, n.id === 'sandro' ? '' : 'Paga: ' + st.job.pay + '.000 lire.'].filter(Boolean), end: true };
    }
    if (choice === 'voci') {
      const known = n.mem.filter(m => m.actor !== 'ignoto' || m.source !== 'sentito').sort((a, b) => weight(st, b) - weight(st, a));
      if (!known.length) return { lines: [n.faction === 'marsiglia' ? 'Rien. On dit rien.' : 'Tutto tranquillo, per ora. Il solito.'], end: false };
      const m = known[0];
      const who = m.actor === 'player' ? PLAYER_NAME : nameOf(st, m.actor);
      const heard = m.source === 'visto' ? 'L\'ho visto io.' : m.source === 'sentito' ? 'Ho sentito i colpi.' : `Me l\'ha detto ${m.via[m.via.length - 1] || 'qualcuno'}.`;
      const wit = knowers(st, m.eventId).filter(k => k.mem.source === 'visto' && k.npc.id !== n.id && !k.npc.dead).map(k => k.npc.first);
      const act = m.actor === 'ignoto' ? `qualcuno ${verbPast(st, m, n.id)}` : `${who} ${verbPast(st, m, n.id)}`;
      const lines = [`Si dice che ${act}, ${m.place}. ${heard}`];
      if (wit.length && m.source !== 'visto') lines.push(`Pare che l'abbia visto ${wit[0]}.`);
      if (isNight(st) && st.rng() < .5 && !n.faction) lines.push('E stanotte al Pontile Est ci sono di nuovo quei francesi. Hanno una valigetta che non mollano mai.');
      return { lines, end: false };
    }
    if (choice === 'corrompi') {
      if (p.money < 30) return { lines: ['Con questi spiccioli? Ma per favore.'], end: false };
      p.money -= 30;
      const w = worstAboutPlayer(st, n);
      const chance = clamp(n.tr.avid - n.tr.legge * .55 + .35 - (w ? SEV[w.type] * .25 : 0) + n.op.fear * .3 + (p.cur !== 'pugni' ? .1 : 0), .03, .95);
      const ok = st.rng() < chance;
      if (ok) { n.mem.forEach(m => { if (m.actor === 'player' && NEG[m.type]) m.silenced = true; }); n.bribed = true; }
      else p.money += 30;
      const ev = emit(st, 'corruzione', { target: n.id, accepted: ok });
      addLog(st, `${clockStr(st.t)} · ${ok ? 'Hai comprato il silenzio di' : 'Hai provato a comprare'} ${n.name}.`, ok ? 'info' : 'bad', ev.id);
      return { lines: [ok ? 'Non ho visto niente. Non so niente. Chi sei tu?' : 'Tieniteli i tuoi soldi. E adesso lo sanno anche gli altri.'], end: true, result: ok ? 'good' : 'bad' };
    }
    if (choice === 'calunnia') {
      if (!arg) {
        const evs = st.events.filter(e => NEG[e.type] && e.type !== 'corruzione').slice(0, 4);
        return { lines: ['Una voce? Su cosa?'], opts: evs.map(e => ({ id: 'calunnia', arg: { ev: e.id }, label: `${LABEL[e.type]}${e.target ? ' · ' + nameOf(st, e.target) : e.shop ? ' · ' + e.shop : ''} · ${clockStr(e.t)}` })).concat([{ id: 'ciao', label: 'Lascia stare.' }]) };
      }
      if (!arg.who) {
        const cands = ['sandro', 'rocco', 'tano', 'marcel', 'nico', 'tonino'].filter(id => id !== n.id && byId(st, id) && !byId(st, id).dead);
        return { lines: ['E chi sarebbe stato?'], opts: cands.map(id => ({ id: 'calunnia', arg: { ev: arg.ev, who: id }, label: `È stato ${nameOf(st, id)}.` })).concat([{ id: 'ciao', label: 'Lascia stare.' }]) };
      }
      const ev = st.events.find(e => e.id === arg.ev), mine = n.mem.find(m => m.eventId === ev.id);
      if (mine && mine.source === 'visto' && mine.actor === 'player') {
        n.mem.push({ id: st.nextId++, eventId: -st.nextId, type: 'corruzione', trueType: 'corruzione', actor: 'player', target: n.id, place: nearestPlace(p.x, p.y).name, t: st.t, conf: .9, source: 'visto', via: [], liar: true });
        return { lines: ['Ma se c\'eri tu! Ti ho visto. E adesso vuoi dare la colpa a un altro?'], end: true, result: 'bad' };
      }
      if (arg.who === n.id) return { lines: ['Io? Ma sei matto?'], end: true };
      const culprit = byId(st, arg.who);
      const believe = st.rng() < clamp(.55 + n.op.trust * .5 - n.op.grudge * .6 + (culprit && culprit.faction ? .2 : 0), .1, .95);
      if (!believe) return { lines: [`${nameOf(st, arg.who)}? Non ci credo. Non è il tipo.`], end: true };
      addMemory(st, n, { eventId: ev.id, type: ev.type, trueType: ev.type, actor: arg.who, target: ev.target, owner: ev.owner, place: ev.place, shop: ev.shop, t: ev.t, conf: .78, source: 'voce', via: [PLAYER_NAME], framedBy: 'player' });
      addLog(st, `${clockStr(st.t)} · Hai raccontato a ${n.name} che è stato ${nameOf(st, arg.who)}.`, 'info', ev.id);
      feed(st, `${n.first} ci ha creduto. La voce su ${nameOf(st, arg.who)} ora gira.`, 'rumor');
      return { lines: [`${nameOf(st, arg.who)}? L'ho sempre detto che quello è un poco di buono.`], end: true, result: 'good' };
    }
    return { lines: [], end: true };
  }

  // ---------------- LAVORI E RACCOLTA ----------------
  function jobTarget(st) {
    const j = st.job; if (!j) return null;
    if (j.crime) return { x: PLACES.magazzino.x, y: PLACES.magazzino.y, label: 'Porta un mezzo rubato al Magazzino Neri' };
    const pl = PLACES[j.stage === 'pickup' ? j.pickup : j.drop];
    return { x: pl.x, y: pl.y, label: j.stage === 'pickup' ? `Prendi ${j.item}: ${pl.name}` : `Consegna ${j.item}: ${pl.name}` };
  }
  function updateJob(st) {
    const j = st.job, p = st.player; if (!j) return;
    const tg = jobTarget(st);
    if (dist(p.x, p.y, tg.x, tg.y) > (p.vehicle ? 3.8 : 2.6)) return;
    if (j.crime) {
      if (!p.vehicle) return;
      const v = st.vehicles.find(k => k.id === p.vehicle);
      if (v.owner === 'sandro') { feed(st, 'Sandro: «Questa è la MIA macchina, idiota.»', 'bad'); return; }
      if (v.lent) { feed(st, 'Sandro: «Quella Vespa la conoscono tutti. Portami altro.»', 'bad'); return; }
      const pay = v.kind === 'vespa' ? 100 : v.kind === 'polizia' ? 250 : 160;
      v.rider = null; v.hidden = true; p.vehicle = null; p.x = tg.x; p.y = tg.y;
      p.money += pay; feed(st, `+${pay}.000 lire. Sandro fa sparire ${v.kind === 'vespa' ? 'la Vespa' : 'la macchina'}.`, 'money'); st.sfx.push({ k: 'cash' });
      gainXp(st, 30);
      addLog(st, `${clockStr(st.t)} · Hai venduto un mezzo rubato allo Squalo (+${pay}.000 lire).`, 'info');
      st.jobCd.sandro = st.t + 180; st.job = null; return;
    }
    if (j.stage === 'pickup') { j.stage = 'drop'; p.carrying = j.item; feed(st, `Hai preso ${j.item}.`, 'job'); st.sfx.push({ k: 'pickup' }); return; }
    if (j.stage === 'drop') {
      p.carrying = null; p.money += j.pay; st.sfx.push({ k: 'cash' });
      const giver = byId(st, j.giver);
      const ev = emit(st, 'lavoro', { target: j.giver });
      addLog(st, `${clockStr(st.t)} · Lavoro fatto per ${giver.name} (+${j.pay}.000 lire).`, 'good', ev.id);
      addMemory(st, giver, { eventId: ev.id, type: 'lavoro', target: giver.id, place: ev.place, t: st.t, actor: 'player', conf: 1, source: 'visto' });
      feed(st, `+${j.pay}.000 lire. ${giver.first} ti deve un favore.`, 'money'); gainXp(st, 40);
      st.jobCd[j.giver] = st.t + 120;
      if (j.vespa) { const v = st.vehicles.find(k => k.id === 'v_beppe'); if (v) { v.lent = false; v.mine = false; if (p.vehicle === v.id) exitVehicle(st); } }
      st.job = null;
    }
  }
  function pickupVisible(st, k) {
    if (k.takenAt !== null && k.takenAt !== undefined) return false;
    if (k.nightOnly && !isNight(st)) return false;
    return true;
  }
  function updatePickups(st) {
    const p = st.player;
    st.pickups = st.pickups.filter(k => !(k.drop && k.takenAt !== null && k.takenAt !== undefined));
    st.pickups.forEach(k => {
      if (k.takenAt !== null && k.takenAt !== undefined) { if (k.respawn && st.t > k.takenAt + k.respawn) k.takenAt = null; return; }
      if (!pickupVisible(st, k) || dist(p.x, p.y, k.x, k.y) > (p.vehicle ? 1.6 : 1.1)) return;
      k.takenAt = st.t;
      if (WEAPONS[k.kind]) { const had = !!p.arms[k.kind]; giveWeapon(st, k.kind, k.ammo); if (!had) switchWeapon(st, k.kind); feed(st, `${had ? 'Munizioni' : 'Hai trovato'}: ${PICKUP_LABEL[k.kind]}${k.kind === 'molotov' ? ` ×${k.ammo}` : ''}`, 'job'); }
      else if (k.kind === 'munizioni') { const w = p.arms.mitra ? 'mitra' : p.arms.pistola ? 'pistola' : p.arms.lupara ? 'lupara' : null; if (!w) { k.takenAt = null; return; } p.arms[w].reserve += w === 'lupara' ? 8 : k.ammo; feed(st, `Munizioni per ${WEAPONS[w].name}`, 'job'); }
      else if (k.kind === 'salute') { if (p.hp >= maxHp(st) - 5) { addItem(st, 'kit'); feed(st, 'Pronto soccorso nello zaino.', 'job'); } else { p.hp = maxHp(st); feed(st, 'Ti sei medicato.', 'good'); } }
      else if (k.kind === 'soldi') { p.money += k.amount; feed(st, `+${k.amount}.000 lire`, 'money'); }
      else if (k.kind === 'valigetta') {
        p.money += k.amount; feed(st, `La valigetta dei Marsigliesi: +${k.amount}.000 lire!`, 'money');
        addLog(st, `${clockStr(st.t)} · Hai preso la valigetta dei Marsigliesi (+${k.amount}.000 lire).`, 'bad');
        aggroFaction(st, 'marsiglia');
      }
      st.sfx.push({ k: k.kind === 'soldi' || k.kind === 'valigetta' ? 'cash' : 'pickup' });
    });
  }

  // ---------------- OPINIONI ----------------
  function opinions(st, n) {
    let fear = 0, trust = 0, grudge = 0;
    for (const m of n.mem) {
      if (m.actor !== 'player') continue;
      const c = m.conf * fresh(st, m), self = m.target === n.id || m.owner === n.id, fr = rel(n.id, m.target) >= .7 || rel(n.id, m.owner) >= .7;
      const k = self ? 2.2 : fr ? 1.4 : .6, timid = 1.2 - n.tr.cor;
      switch (m.type) {
        case 'scippo': grudge += .35 * c * k; trust -= .25 * c * (self ? 2 : 1); fear += .06 * c; break;
        case 'aggressione': fear += .45 * c * timid; grudge += .3 * c * k; trust -= .3 * c; break;
        case 'rapina': fear += .5 * c * timid; grudge += .3 * c * k; trust -= .3 * c; break;
        case 'furto_vespa': case 'furto_auto': grudge += .3 * c * k; trust -= .2 * c; break;
        case 'investimento': fear += .35 * c * timid; grudge += .3 * c * k; trust -= .25 * c; break;
        case 'spari': fear += .5 * c * timid; grudge += .08 * c; trust -= .3 * c; break;
        case 'molotov': fear += .55 * c * timid; grudge += .1 * c; trust -= .3 * c; break;
        case 'esplosione': fear += .65 * c * timid; trust -= .35 * c; break;
        case 'ferimento': fear += .6 * c * timid; grudge += .45 * c * k; trust -= .5 * c; break;
        case 'omicidio': fear += .9 * c * timid; grudge += .6 * c * k; trust -= .8 * c; break;
        case 'lavoro': trust += .42 * c * (self ? 2 : fr ? 1 : .5); if (self) grudge -= .2 * c; break;
        case 'corruzione': if (self && m.accepted) trust += .15 * c; else { trust -= .2 * c * n.tr.legge; grudge += (m.liar ? .3 : .06) * c; } break;
      }
    }
    if (n.framedAngry) grudge += .8;
    n.op = { fear: clamp(fear, 0, 1), trust: clamp(trust, 0, 1), grudge: clamp(grudge, 0, 1) };
    if (n.cop) {
      let a = 0;
      for (const m of n.mem) if (m.actor === 'player' && NEG[m.type] && !m.silenced && !m.closed) a = Math.max(a, SEV[m.type] * m.conf * fresh(st, m));
      n.alert = a;
    }
    return n.op;
  }
  const priceFor = n => Math.round((1 + n.op.grudge * .8 - n.op.trust * .3) * 100);
  function dangerAt(st, n, placeId) {
    let d = 0; const nm = PLACES[placeId] ? PLACES[placeId].name : '';
    for (const m of n.mem) { if (!NEG[m.type] || m.type === 'corruzione' || st.t - m.t > 8 * 60) continue; if (m.place !== nm) continue; d = Math.max(d, SEV[m.type] * m.conf); }
    return d;
  }
  function pendingReport(st, n) {
    if (n.cop || n.faction || n.tr.legge < .15 || n.dead) return null;
    let best = null, bs = 0;
    for (const m of n.mem) {
      if (m.actor === 'ignoto' || !NEG[m.type] || m.silenced || n.reported[m.eventId] || m.conf < .5 || m.liar) continue;
      if (m.type === 'corruzione' && m.accepted) continue;
      if (m.actor === 'player' && n.op.trust > n.op.grudge + .25 && m.target !== n.id && SEV[m.type] < .9) continue;
      const s = SEV[m.type] * m.conf; if (s > bs) { bs = s; best = m; }
    }
    return best;
  }
  function framedTarget(st, cop) {
    let best = null, bs = .38;
    for (const m of cop.mem) {
      if (m.actor === 'player' || m.actor === 'ignoto' || m.closed || !NEG[m.type]) continue;
      const tn = byId(st, m.actor); if (!tn || tn.dead || tn.jailedUntil > st.t || tn.inside) continue;
      const s = SEV[m.type] * m.conf; if (s > bs) { bs = s; best = m; }
    }
    return best;
  }

  // ---------------- DECISIONI ----------------
  function say(st, n, text, dur) { n.bark = { text, until: st.clock + (dur || 3.4) }; n.barkCd = st.clock + 8; }
  const COMBAT_BARKS = {
    cop: ['Polizia! Getta l\'arma!', 'Fermo o sparo!', 'Centrale, sparatoria in corso!', 'A terra!'],
    squalo: ['Lo Squalo ti saluta!', 'Vieni fuori, Nino!', 'Sei un uomo morto!', 'Te la sei cercata!'],
    marsiglia: ['Tirez! Tirez!', 'Putain, il est là!', 'Crève, petit!', 'À gauche! À gauche!'],
  };
  function think(st, n) {
    if (n.dead) return;
    opinions(st, n);
    if (n.jailedUntil > st.t) { n.action = { name: 'in cella', scores: [], why: 'È al commissariato per un fermo.' }; return; }
    if (n.jailedUntil && n.jailedUntil <= st.t) { n.jailedUntil = 0; n.inside = false; }
    const hos = hostile(st, n);
    if (n.inside) {
      n.action = { name: 'dentro', scores: [], why: `È dentro ${(PLACES[n.goalPlace || n.home] || PLACES[n.home]).name}.` };
      if (n.cop && n.standby && (wantedLevel(st) >= 2 || (wantedLevel(st) >= 1 && st.chase))) { n.inside = false; n.standby = false; say(st, n, 'Esco anch\'io. Dov\'è?'); }
      if (hos && n.faction === 'squalo') { n.inside = false; }
      return;
    }
    if (n.stun > 0) { n.action = { name: 'a terra', scores: [], why: 'È a terra.' }; return; }
    const p = st.player, d = dist(n.x, n.y, p.x, p.y), sees = seesPlayer(st, n), o = n.op, cur = n.action.name;
    const sc = []; const add = (name, v, why) => sc.push({ name, v: Math.max(0, v) + (name === cur ? .05 : 0), why });
    const lv = n.cop ? wantedLevel(st) : 0;
    if (sees && n.cop && lv >= 1) st.lastSeen = { x: p.x, y: p.y, clock: st.clock };
    // i Marsigliesi avvisano chi si avvicina alla valigetta
    if (n.faction === 'marsiglia' && !n.aggro && isNight(st) && d < 4.5 && !p.vehicle) aggroFaction(st, 'marsiglia');
    if (n.faction === 'marsiglia' && !n.aggro && isNight(st) && d < 11 && sees) {
      if (!n.warned) { n.warned = true; say(st, n, 'Hé! Toi! Reste loin. Stai lontano!', 3); }
      else if (d < 6.5 || (p.cur !== 'pugni' && p.cur !== 'molotov' && d < 10)) { aggroFaction(st, 'marsiglia'); }
    }
    if (hos && n.weapon) {
      const seeC = seesPlayerCombat(st, n);
      if (seeC) n.seenP = { x: p.x, y: p.y, clock: st.clock };
      const recent = n.seenP && st.clock - n.seenP.clock < (n.cop ? 16 : 30);
      add('combatte', seeC || recent ? 2 : 0, seeC ? `Ti ha sotto tiro (${WEAPONS[n.weapon].name}).` : 'Ti cerca dove ti ha visto l\'ultima volta.');
      if (n.hp < n.maxHp * .3 && !n.cop) add('fugge', 2.2, 'È ferito gravemente: scappa.');
    }
    if (n.cop) {
      const fresh8 = st.lastSeen && st.clock - st.lastSeen.clock < 14;
      add('insegue', lv === 1 && (sees || fresh8) ? .6 + n.alert : 0, `Allerta ${Math.round(n.alert * 100)}%: ${sees ? 'ti vede' : 'va dove sei stato visto l\'ultima volta'}.`);
      if (lv >= 2 && !seesPlayerCombat(st, n) && st.lastSeen && st.clock - st.lastSeen.clock < 30) add('insegue', 1.2, 'Cerca il sospetto armato dove è stato visto.');
      const fm = framedTarget(st, n);
      if (fm) add('arresta', .5 + SEV[fm.type] * fm.conf * .5, `Crede che ${nameOf(st, fm.actor)} sia colpevole: ${LABEL[fm.type].toLowerCase()} (${m2src(fm)}).`);
      add('pattuglia', .35, `Giro di pattuglia: ${PLACES[placeFor(st, n)].name}.`);
      if (n.id === 'ferri' && n.standby === false && n.alert < .3) add('rientra', .45, 'Nessuno da cercare: torna in commissariato.');
      if (n.reinforcement && lv === 0) add('rientra', .9, 'Allarme rientrato.');
    } else {
      const sched = placeFor(st, n);
      add('routine', .35, `Alle ${clockStr(st.t)} va di solito a ${PLACES[sched].name}.`);
      if (n.panic > 0 && !hos) add('fugge', 1.6, 'Spari! Scappa al riparo.');
      if (!n.faction && sees && d < 13 && o.fear > .12) add('fugge', o.fear * 1.35 * (1 - d / 15) + .1, `Ha paura di te (${Math.round(o.fear * 100)}%) e sei a ${Math.round(d)} metri.`);
      // una pistola puntata addosso
      if (!n.faction && sees && d < 9 && p.cur !== 'pugni' && p.cur !== 'molotov' && Math.abs(angDiff(Math.atan2(n.y - p.y, n.x - p.x), p.face)) < .22) { add('fugge', 1.4, 'Gli stai puntando una pistola addosso.'); if (st.clock > n.barkCd) say(st, n, ['Non sparare! Ti prego!', 'Ho famiglia!', 'Calma, calma…'][Math.floor(st.rng() * 3)], 2); }
      const pr = pendingReport(st, n);
      if (pr && n.panic <= 0) add('denuncia', SEV[pr.type] * pr.conf * (.35 + n.tr.legge) * .8 - o.fear * .12, `Vuole denunciare ${pr.actor === 'player' ? 'te' : nameOf(st, pr.actor)}: ${LABEL[pr.type].toLowerCase()} (${m2src(pr)}).`);
      if (sees && d < 10 && !n.faction && n.panic <= 0) add('affronta', o.grudge * n.tr.cor * 1.25 - o.fear * .45 + (n.framedAngry ? .5 : 0) - (p.cur !== 'pugni' ? .4 : 0), n.framedAngry ? 'Sa che l\'hai incastrato. Vuole chiarire.' : `Rancore ${Math.round(o.grudge * 100)}%, coraggio ${Math.round(n.tr.cor * 100)}%.`);
      const danger = dangerAt(st, n, sched);
      if (danger > 0 && o.fear > .15 && sched !== n.home) add('evita', danger * o.fear * 1.6 + .1, `A ${PLACES[sched].name} è successo qualcosa di brutto: preferisce stare a casa.`);
    }
    sc.sort((a, b) => b.v - a.v);
    const best = sc[0];
    n.action = { name: best.name, scores: sc.map(s => ({ name: s.name, v: +s.v.toFixed(2), why: s.why })), why: best.why, since: cur === best.name ? n.action.since : st.clock };
    if (best.name !== cur) { n.path = []; n.wait = 0; n.goalPlace = null; if (best.name === 'combatte') { n.react = 0; if (st.clock > n.barkCd) say(st, n, COMBAT_BARKS[n.cop ? 'cop' : n.faction][Math.floor(st.rng() * 4)], 2.2); } }
    if (sees && !n.cop && !hos) maybeBark(st, n, d);
    if (n.cop && sees && lv === 1 && cur !== 'insegue') say(st, n, 'Fermo! Polizia!');
  }
  const m2src = m => m.source === 'visto' ? 'l\'ha visto' : m.source === 'voce' ? 'per sentito dire' : m.source;
  function maybeBark(st, n, d) {
    if (st.clock < n.barkCd || d > 8) return;
    const a = n.action.name;
    if (a === 'fugge') return n.panic > 0 ? null : say(st, n, n.op.fear > .5 ? 'Aiuto! Stammi lontano!' : 'Meglio girare al largo…');
    if (n.framedAngry && d < 5) return say(st, n, 'Sei tu che vai in giro a parlare di me, eh?');
    const top = n.mem.filter(m => m.actor === 'player').sort((x, y) => weight(st, y) - weight(st, x))[0];
    if (!top) return;
    if (top.silenced && n.bribed) return say(st, n, 'Io non ho visto niente, eh.');
    if (NEG[top.type] && d < 6) {
      if (top.source === 'visto') return say(st, n, `Sei quello che ${verbPast(st, top, n.id)}!`);
      if (top.source === 'sentito') return;
      return say(st, n, `${top.via[top.via.length - 1] || 'Si'} dice che ${youVerb(st, top, n.id)}…`);
    }
    if (top.type === 'lavoro' && d < 6) return say(st, n, top.source === 'visto' ? 'Ciao Nino! Grazie ancora.' : `Ho sentito che ${youVerb(st, top, n.id)}. Bravo.`);
  }

  // ---------------- VOCI ----------------
  function rumorText(st, m, speakerId) {
    const who = m.actor === 'player' ? PLAYER_NAME : m.actor === 'ignoto' ? 'qualcuno' : nameOf(st, m.actor);
    return `Hai sentito? ${who} ${verbPast(st, m, speakerId || '__')}!`.replace(' ha dato una mano a', ' ha aiutato');
  }
  function shareOne(st, sp, ls) {
    const cand = sp.mem.filter(m => !m.silenced && m.conf >= .3 && !m.liar && (m.actor !== 'ignoto' || m.source !== 'sentito' || m.type === 'rapina' || m.type === 'spari'))
      .filter(m => { const k = ls.mem.find(x => x.eventId === m.eventId); return !k || (k.actor === 'ignoto' && m.actor !== 'ignoto') || (k.actor !== m.actor && k.source !== 'visto' && m.conf > k.conf + .08); })
      .sort((a, b) => weight(st, b) - weight(st, a));
    const m = cand[0]; if (!m) return false;
    const r = rel(sp.id, ls.id);
    if (st.rng() > sp.tr.loq * (.45 + r)) return false;
    let type = m.type, distorted = m.distorted;
    if (ESCALATE[type] && st.rng() < .12) { type = ESCALATE[type]; distorted = true; }
    const copy = { eventId: m.eventId, type, trueType: m.trueType, actor: m.actor, target: m.target, owner: m.owner, place: m.place, shop: m.shop, t: m.t, accepted: m.accepted, conf: m.conf * (r > .5 ? .86 : .76), source: ls.cop ? 'denuncia' : 'voce', via: (m.via || []).concat([sp.first]), distorted, framedBy: m.framedBy };
    if (!addMemory(st, ls, copy)) return false;
    if (ls.cop && NEG[type] && m.actor === 'player') { sp.reported[m.eventId] = true; addLog(st, `${clockStr(st.t)} · ${sp.name} ha raccontato alla polizia: ${LABEL[type].toLowerCase()}.`, 'bad', m.eventId); }
    st.links.push({ a: sp.id, b: ls.id, until: st.clock + 2.4, type, actor: m.actor });
    say(st, sp, rumorText(st, copy, sp.id), 3.6);
    if (m.actor === 'player' || m.framedBy) feed(st, `La voce corre: ${sp.first} → ${ls.first}`, 'rumor');
    sp.gesture = 1.5;
    return true;
  }
  function gossip(st) {
    const out = st.npcs.filter(n => !n.dead && !n.inside && n.stun <= 0 && n.jailedUntil <= st.t && n.action.name !== 'fugge' && n.action.name !== 'combatte');
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
      const a = out[i], b = out[j];
      if (dist(a.x, a.y, b.x, b.y) > 3.2 || !los(a.x, a.y, b.x, b.y)) continue;
      if (a.faction !== b.faction && (a.faction || b.faction) && !(a.cop || b.cop)) continue; // i gangster non chiacchierano coi civili
      const key = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
      if (st.t - (st.chats[key] || -999) < 30) continue;
      if (st.rng() > .35) continue;
      st.chats[key] = st.t;
      const x = shareOne(st, a, b), y = shareOne(st, b, a);
      if (x || y) { a.face = Math.atan2(b.y - a.y, b.x - a.x); b.face = Math.atan2(a.y - b.y, a.x - b.x); a.wait = Math.max(a.wait, 2.2); b.wait = Math.max(b.wait, 2.2); }
    }
  }

  // ---------------- MOVIMENTO ----------------
  function goTo(n, x, y, roadCost) { n.path = findPath(n.x, n.y, x, y, roadCost || 1.6); n.goal = { x, y }; }
  function stepAlong(n, speed, dt, keepFace) {
    n.speedNow = 0;
    if (!n.path.length) return true;
    const w = n.path[0], dx = w.x - n.x, dy = w.y - n.y, d = Math.hypot(dx, dy), s = speed * dt;
    if (d > .01 && !keepFace) { const ta = Math.atan2(dy, dx); n.face += angDiff(ta, n.face) * Math.min(1, dt * 10); }
    n.speedNow = speed;
    if (d <= s) { n.x = w.x; n.y = w.y; n.path.shift(); return !n.path.length; }
    n.x += dx / d * s; n.y += dy / d * s; return false;
  }
  function wanderSpot(st, place) {
    for (let i = 0; i < 10; i++) {
      const tx = place.tx + Math.round((st.rng() - .5) * 5), ty = place.ty + Math.round((st.rng() - .5) * 4);
      if (walkT(tx, ty)) return { x: tx * TS + TS / 2 + (st.rng() - .5) * 1.2, y: ty * TS + TS / 2 + (st.rng() - .5) * 1.2 };
    }
    return { x: place.x, y: place.y };
  }
  function moveNpc(st, n, dt) {
    knockback(st, n, dt);
    if (n.dead) { n.speedNow = 0; return; }
    n.anim += dt * (n.speedNow > 0 ? n.speedNow * 3.2 : 1);
    if (n.gesture > 0) n.gesture -= dt;
    if (n.panic > 0) n.panic -= dt;
    if (n.cool > 0) n.cool -= dt;
    if (n.stun > 0) { n.stun -= dt; n.speedNow = 0; return; }
    if (n.jailedUntil > st.t) { n.x = PLACES.commissariato.x; n.y = PLACES.commissariato.y - 1; n.inside = true; return; }
    const a = n.action.name, p = st.player;
    if (a === 'dentro') {
      if (n.cop) return;
      const want = placeFor(st, n);
      const stay = want === n.home && (n.nocturnal ? !isNight(st) : isNight(st));
      if (!stay) { n.inside = false; n.action.name = 'routine'; n.goalPlace = null; }
      return;
    }
    if (n.wait > 0 && a !== 'fugge' && a !== 'insegue' && a !== 'combatte') { n.wait -= dt; n.speedNow = 0; return; }
    if (a === 'combatte') return combatMove(st, n, dt);
    if (a === 'fugge') {
      const src = n.panic > 0 && n.fleeFrom ? n.fleeFrom : p;
      if (!n.path.length) { let best = null, bd = -1e9; for (const pl of Object.values(PLACES)) { const s = dist(pl.x, pl.y, src.x, src.y) - dist(pl.x, pl.y, n.x, n.y) * .5; if (s > bd) { bd = s; best = pl; } } goTo(n, best.x, best.y); }
      stepAlong(n, 3.6, dt); return;
    }
    if (a === 'denuncia') {
      const cops = st.npcs.filter(k => k.cop && !k.inside && !k.dead);
      const cop = cops.find(k => dist(n.x, n.y, k.x, k.y) < 12 && canSee(st, n, k.x, k.y));
      const tx = cop ? cop.x : PLACES.commissariato.x, ty = cop ? cop.y : PLACES.commissariato.y;
      if (dist(n.x, n.y, tx, ty) < 2) { deliverReport(st, n, cop || st.npcs.find(k => k.cop && !k.dead)); n.path = []; return; }
      if (!n.path.length || !n.goal || dist(n.goal.x, n.goal.y, tx, ty) > 3) goTo(n, tx, ty);
      stepAlong(n, 1.9, dt); return;
    }
    if (a === 'affronta') {
      if (dist(n.x, n.y, p.x, p.y) > 1.6) { if (!n.path.length || dist(n.goal.x, n.goal.y, p.x, p.y) > 2) goTo(n, p.x, p.y); stepAlong(n, 2.2, dt); }
      else { n.face = Math.atan2(p.y - n.y, p.x - n.x); n.speedNow = 0; if (n.framedAngry && n.tr.cor > .7 && st.clock > (n.shoveAt || 0) && !p.vehicle) { n.shoveAt = st.clock + 6; p.stun = .8; damagePlayer(st, 8, n.face, n.id); say(st, n, 'Questa è per le voci che metti in giro!'); } }
      return;
    }
    if (a === 'insegue') {
      const tgt = seesPlayer(st, n) ? p : st.lastSeen;
      if (!tgt) return;
      const pv = p.vehicle ? st.vehicles.find(v => v.id === p.vehicle) : null;
      if (wantedLevel(st) === 1 && dist(n.x, n.y, p.x, p.y) < 1.3 && (!pv || Math.abs(pv.speed) < 2.5)) { arrest(st, n); return; }
      if (!n.path.length || dist(n.goal.x, n.goal.y, tgt.x, tgt.y) > 2) goTo(n, tgt.x, tgt.y, 1);
      stepAlong(n, n.id === 'ferri' ? 4.6 : 4.3, dt); return;
    }
    if (a === 'arresta') {
      const fm = framedTarget(st, n); if (!fm) return;
      const tn = byId(st, fm.actor);
      if (dist(n.x, n.y, tn.x, tn.y) < 1.4) { jailNpc(st, n, tn, fm); return; }
      if (!n.path.length || dist(n.goal.x, n.goal.y, tn.x, tn.y) > 2) goTo(n, tn.x, tn.y, 1);
      stepAlong(n, 2.6, dt); return;
    }
    if (a === 'rientra') {
      if (n.reinforcement) {
        const car = st.vehicles.find(v => v.id === n.car);
        if (!car || car.wreck || dist(n.x, n.y, car.x, car.y) < 2.2) { n.gone = true; return; }
        if (!n.path.length) goTo(n, car.x, car.y, 1); stepAlong(n, 2.4, dt); return;
      }
      const c = PLACES.commissariato;
      if (dist(n.x, n.y, c.x, c.y) < 1.5) { n.inside = true; n.standby = true; n.action.name = 'dentro'; return; }
      if (!n.path.length) goTo(n, c.x, c.y); stepAlong(n, 1.8, dt); return;
    }
    const placeId = a === 'evita' ? n.home : placeFor(st, n), place = PLACES[placeId];
    if (n.goalPlace !== placeId) { n.goalPlace = placeId; const s = n.shop === placeId ? { x: place.x, y: place.y } : wanderSpot(st, place); goTo(n, s.x, s.y); }
    const arrived = stepAlong(n, n.cop ? 1.7 : 1.35, dt);
    if (arrived) {
      const homeTime = n.nocturnal ? !isNight(st) : isNight(st);
      if ((placeId === n.home) && n.id !== 'sandro' && !n.faction && (homeTime || n.cop) && dist(n.x, n.y, place.x, place.y) < 3 && (n.cop ? n.standby : true)) { n.inside = true; n.action.name = 'dentro'; return; }
      if (placeId === n.home && n.nocturnal && homeTime && dist(n.x, n.y, place.x, place.y) < 3) { n.inside = true; n.action.name = 'dentro'; return; }
      if (dist(n.x, n.y, place.x, place.y) > 8) { goTo(n, place.x, place.y); return; }
      n.wait = 2 + st.rng() * 5;
      if (n.shop === placeId) { n.face = Math.PI / 2 * (place.ty > 7 ? -1 : 1); goTo(n, place.x + (st.rng() - .5) * 1.2, place.y); }
      else { const s = wanderSpot(st, place); goTo(n, s.x, s.y); }
    }
  }
  function combatMove(st, n, dt) {
    const p = st.player, W = WEAPONS[n.weapon];
    const seeC = seesPlayerCombat(st, n), d = dist(n.x, n.y, p.x, p.y);
    if (n.reloadT > 0) { n.reloadT -= dt; if (n.reloadT <= 0) n.mag = W.mag; }
    if (!seeC) {
      n.react = 0; const tgt = n.seenP; if (!tgt) return;
      if (!n.path.length || dist(n.goal.x, n.goal.y, tgt.x, tgt.y) > 2) goTo(n, tgt.x, tgt.y, 1);
      stepAlong(n, 3.4, dt); return;
    }
    const ang = Math.atan2(p.y - n.y, p.x - n.x);
    n.face += angDiff(ang, n.face) * Math.min(1, dt * 9);
    n.react += dt;
    // posizione: distanza ideale e movimento laterale
    const ideal = n.weapon === 'lupara' ? 5 : n.weapon === 'mitra' ? 8 : 9;
    n.strafeT -= dt; if (n.strafeT <= 0) { n.strafe = st.rng() < .5 ? -1 : 1; n.strafeT = 1.2 + st.rng() * 1.8; }
    let mx = Math.cos(ang + Math.PI / 2) * n.strafe * .8, my = Math.sin(ang + Math.PI / 2) * n.strafe * .8;
    if (d > ideal + 2) { mx += Math.cos(ang) * 1.2; my += Math.sin(ang) * 1.2; }
    else if (d < ideal - 3) { mx -= Math.cos(ang); my -= Math.sin(ang); }
    const l = Math.hypot(mx, my) || 1, sp = 2.4;
    const nx = n.x + mx / l * sp * dt, ny = n.y + my / l * sp * dt;
    if (walkM(nx, ny) && walkM(nx + .3, ny) && walkM(nx - .3, ny)) { n.x = nx; n.y = ny; n.speedNow = sp; } else { n.strafe *= -1; n.speedNow = 0; }
    n.anim += dt * 4;
    // fuoco
    if (n.reloadT > 0 || n.react < .5 || n.cool > 0) return;
    if (n.mag <= 0) { n.reloadT = W.reload * 1.2; return; }
    if (W.auto) { if (n.burst <= 0) { n.burst = 3 + Math.floor(st.rng() * 4); } }
    const moving = p.vehicle ? .06 : Math.abs(p.speed) > 3 ? .05 : 0;
    const skill = n.cop ? .07 : n.faction === 'marsiglia' ? .08 : .1;
    shoot(st, n, n.weapon, Math.atan2(p.y - n.y, p.x - n.x), W.spread + skill + moving + d * .004, n.id);
    n.mag--;
    if (W.auto) { n.burst--; n.cool = n.burst > 0 ? W.rate * 1.3 : .8 + st.rng() * .6; }
    else n.cool = W.rate * (n.weapon === 'lupara' ? 1.6 : 2.6) + st.rng() * .35;
    panicAround(st, n.x, n.y, 22, 6);
    if (st.clock > n.barkCd && st.rng() < .15) say(st, n, COMBAT_BARKS[n.cop ? 'cop' : n.faction][Math.floor(st.rng() * 4)], 1.8);
  }
  function deliverReport(st, n, cop) {
    let told = 0;
    for (const m of n.mem) {
      if (m.actor === 'ignoto' || !NEG[m.type] || m.silenced || n.reported[m.eventId] || m.conf < .5 || m.liar) continue;
      if (m.type === 'corruzione' && m.accepted) continue;
      n.reported[m.eventId] = true; told++;
      if (cop) addMemory(st, cop, { eventId: m.eventId, type: m.type, trueType: m.trueType, actor: m.actor, target: m.target, owner: m.owner, place: m.place, shop: m.shop, t: m.t, conf: Math.min(1, m.conf * .95), source: 'denuncia', via: (m.via || []).concat([n.first]), distorted: m.distorted, framedBy: m.framedBy });
      if (m.actor === 'player') { if (n._repLogged !== st.t) { addLog(st, `${clockStr(st.t)} · ${n.name} ti ha denunciato.`, 'bad', m.eventId); feed(st, `${n.first} ti ha denunciato alla polizia.`, 'bad'); } n._repLogged = st.t; }
      else addLog(st, `${clockStr(st.t)} · ${n.name} ha denunciato ${nameOf(st, m.actor)}.`, 'info', m.eventId);
    }
    if (told) say(st, n, 'Agente, devo dirle una cosa.');
    n.action.name = 'routine'; n.goalPlace = null;
  }
  function jailNpc(st, cop, tn, m) {
    tn.jailedUntil = st.t + 240; tn.inside = true; tn.path = [];
    st.npcs.forEach(c => { if (c.cop) c.mem.forEach(k => { if (k.actor === tn.id) k.closed = true; }); });
    say(st, cop, `${tn.first}, vieni con me. ${LABEL[m.type]}.`);
    addLog(st, `${clockStr(st.t)} · ${cop.name} ha arrestato ${tn.name} per un fatto commesso da te.`, 'info', m.eventId);
    feed(st, `La polizia ha arrestato ${tn.first}. Al posto tuo.`, 'rumor');
    st.moments.push({ kind: 'jail', npcs: [tn.id, cop.id], until: st.clock + 1.5 });
    if (tn.id === 'sandro') { st.deadline += 240; feed(st, 'Lo Squalo è in cella: la scadenza slitta di 4 ore.', 'money'); }
    if (m.framedBy === 'player') tn.framedAngry = true;
  }
  function arrest(st, cop) {
    const p = st.player; const fine = Math.ceil(p.money * .3);
    if (p.vehicle) exitVehicle(st);
    p.money -= fine; p.arrests++; p.carrying = null; if (st.job && !st.job.crime) st.job = null;
    const lost = Object.keys(p.arms).filter(k => k !== 'pugni').length;
    p.arms = { pugni: {} }; p.cur = 'pugni';
    p.x = PLACES.commissariato.x; p.y = PLACES.commissariato.y + 1; st.t += 180;
    closePoliceCases(st);
    addLog(st, `${clockStr(st.t)} · Arrestato. Tre ore in camera di sicurezza, multa di ${fine}.000 lire${lost ? ', armi sequestrate' : ''}.`, 'bad');
    feed(st, `Arrestato da ${cop.first}. Multa di ${fine}.000 lire${lost ? ', armi sequestrate' : ''}.`, 'bad');
    st.moments.push({ kind: 'arrest', until: st.clock + 2.5 });
    if (p.arrests >= 3) st.over = { win: false, reason: 'Terzo arresto. Stavolta non esci: torni dentro, e lo Squalo ti aspetta fuori.' };
  }

  // ---------------- GIOCATORE E VEICOLI ----------------
  function movePlayer(st, dt, inp) {
    const p = st.player;
    if (p.cool > 0) p.cool -= dt;
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { const W = WEAPONS[p.cur], a = p.arms[p.cur]; if (a && W.mag) { const need = W.mag - a.mag, take = Math.min(need, a.reserve); a.mag += take; a.reserve -= take; } } }
    p.bloom = Math.max(0, p.bloom - dt * .35 * (1 + .15 * skill(st, 'mira')));
    if (p.punch > 0) p.punch -= dt;
    if (st.clock - p.hurtT > 7 - skill(st, 'fisico') * .6 && p.hp < maxHp(st)) p.hp = Math.min(maxHp(st), p.hp + dt * 3 * (1 + .25 * skill(st, 'fisico')));
    if (!p.vehicle) knockback(st, p, dt);
    if (p.stun > 0) { p.stun -= dt; p.speed = 0; return; }
    if (p.vehicle) return driveVehicle(st, st.vehicles.find(v => v.id === p.vehicle), dt, inp);
    const ix = inp.x, iy = inp.y;
    if (ix || iy) {
      const l = Math.hypot(ix, iy), sp = inp.sprint ? 6.4 : (p.cur !== 'pugni' && p.cur !== 'molotov' ? 3.8 : 4.2);
      tryMove(p, ix / l * sp * dt, iy / l * sp * dt, .35);
      const back = inp.aim !== undefined && Math.abs(angDiff(Math.atan2(iy, ix), inp.aim)) > 2.2;
      const ta = inp.aim !== undefined ? inp.aim : Math.atan2(iy, ix); p.face += angDiff(ta, p.face) * Math.min(1, dt * 16); p.speed = back ? -sp : sp;
    } else { p.speed = 0; if (inp.aim !== undefined) p.face += angDiff(inp.aim, p.face) * Math.min(1, dt * 14); }
    p.anim += dt * (p.speed ? Math.abs(p.speed) * 3 : 1);
    pushOutOfVehicles(st, p, .35);
  }
  function tryMove(o, dx, dy, r) {
    const free = (x, y) => walkM(x - r, y - r) && walkM(x + r, y - r) && walkM(x - r, y + r) && walkM(x + r, y + r);
    let hit = false;
    if (free(o.x + dx, o.y)) o.x += dx; else hit = true;
    if (free(o.x, o.y + dy)) o.y += dy; else hit = true;
    return hit;
  }
  // coordinate locali del veicolo: lx lungo il muso, ly di lato
  function vLocal(v, x, y) { const c = Math.cos(v.ang), s = Math.sin(v.ang), dx = x - v.x, dy = y - v.y; return { lx: dx * c + dy * s, ly: -dx * s + dy * c }; }
  function insideVehicle(v, x, y, r) { const K = VK[v.kind], q = vLocal(v, x, y); return Math.abs(q.lx) < K.len / 2 + r && Math.abs(q.ly) < K.wid / 2 + r; }
  function vehicleFree(v, x, y, ang) {
    const K = VK[v.kind], c = Math.cos(ang), s = Math.sin(ang), hl = K.len / 2 - .05, hw = K.wid / 2 - .05;
    for (const [a, b] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0], [0, hw], [0, -hw]]) if (!walkM(x + a * c - b * s, y + a * s + b * c)) return false;
    return true;
  }
  function pushOutOfVehicles(st, o, r) {
    for (const v of st.vehicles) {
      if (v.hidden || v.rider === 'player' && o === st.player) continue;
      const K = VK[v.kind], q = vLocal(v, o.x, o.y), px = K.len / 2 + r - Math.abs(q.lx), py = K.wid / 2 + r - Math.abs(q.ly);
      if (px <= 0 || py <= 0) continue;
      const c = Math.cos(v.ang), s = Math.sin(v.ang);
      let nx = o.x, ny = o.y;
      if (px < py) { const d = Math.sign(q.lx || 1) * px; nx += c * d; ny += s * d; } else { const d = Math.sign(q.ly || 1) * py; nx += -s * d; ny += c * d; }
      if (walkM(nx, ny)) { o.x = nx; o.y = ny; }
    }
  }
  function pushOutOfVehiclesOld(st, o, r) {
    for (const v of st.vehicles) {
      if (v.hidden || v.rider === 'player' && o === st.player) continue;
      const R = VK[v.kind].r + r, d = dist(o.x, o.y, v.x, v.y);
      if (d < R && d > .001) { const push = R - d, nx = o.x + (o.x - v.x) / d * push, ny = o.y + (o.y - v.y) / d * push; if (walkM(nx, ny)) { o.x = nx; o.y = ny; } }
    }
  }
  // ---------------- FISICA DEI VEICOLI ----------------
  // Ogni mezzo ha una velocità vera (vx, vy) e una velocità di rotazione (w). v.speed resta la componente
  // in avanti, per chi la legge (traffico, polizia, grafica). Le gomme tengono fino a K.grip m/s² di
  // accelerazione laterale: oltre, il mezzo scivola e l'aderenza cala (derapata) finché non rallenta.
  // Il freno a mano toglie aderenza al posteriore e fa girare la coda.
  const fwd = v => v.vx * Math.cos(v.ang) + v.vy * Math.sin(v.ang);
  function ensureVel(v) {
    if (v.vx === undefined || v._spd !== v.speed) { // qualcuno ha cambiato v.speed da fuori: la velocità segue il muso
      const lat = v.vx === undefined ? 0 : -v.vx * Math.sin(v.ang) + v.vy * Math.cos(v.ang);
      v.vx = Math.cos(v.ang) * v.speed - Math.sin(v.ang) * lat; v.vy = Math.sin(v.ang) * v.speed + Math.cos(v.ang) * lat; v._spd = v.speed;
    }
    if (v.w === undefined) v.w = 0; if (v.steer === undefined) { v.steer = 0; v.slip = 0; v.skid = 0; v.longA = 0; v.latA = 0; }
  }
  function scaleVel(v, k) { ensureVel(v); v.vx *= k; v.vy *= k; v.w *= k; v.speed = fwd(v); v._spd = v.speed; }
  function loosen(st, v, secs) { if (v.traffic || (v.police && v.rider === 'npc')) v.looseUntil = Math.max(v.looseUntil || 0, st.clock + secs); }
  // primo punto del telaio che finisce dentro qualcosa di solido
  function vehicleHitPoint(v, x, y, ang) {
    const K = VK[v.kind], c = Math.cos(ang), s = Math.sin(ang), hl = K.len / 2 - .05, hw = K.wid / 2 - .05;
    let bx = 0, by = 0, n = 0;
    for (const [a, b] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0], [0, hw], [0, -hw]]) { const px = x + a * c - b * s, py = y + a * s + b * c; if (!walkM(px, py)) { bx += px; by += py; n++; } }
    return n ? { x: bx / n, y: by / n } : null;
  }
  function moveVehicleBody(v, dx, dy, oldAng) { // compatibilità: spostamento secco, senza fisica
    if (!vehicleFree(v, v.x, v.y, v.ang)) { if (vehicleFree(v, v.x, v.y, oldAng)) v.ang = oldAng; }
    if (vehicleFree(v, v.x + dx, v.y + dy, v.ang)) { v.x += dx; v.y += dy; return false; }
    let hit = false;
    if (vehicleFree(v, v.x + dx, v.y, v.ang)) v.x += dx; else hit = true;
    if (vehicleFree(v, v.x, v.y + dy, v.ang)) v.y += dy; else hit = true;
    return hit;
  }
  // integra posizione e rotazione; contro muri e facciate rimbalza, striscia e gira su se stesso
  function physStep(st, v, dt) {
    const K = VK[v.kind], oldAng = v.ang;
    if (!vehicleFree(v, v.x, v.y, v.ang)) { v.ang += v.w * dt; v.x += v.vx * dt; v.y += v.vy * dt; v.speed = fwd(v); v._spd = v.speed; return; } // già incastrato (o fuori mappa): esce senza urti
    v.ang += v.w * dt;
    if (!vehicleFree(v, v.x, v.y, v.ang)) { v.ang = oldAng; v.w *= -.35; }
    const steps = Math.max(1, Math.ceil(Math.hypot(v.vx, v.vy) * dt / .35)), h = dt / steps;
    for (let k = 0; k < steps; k++) {
      const dx = v.vx * h, dy = v.vy * h;
      if (vehicleFree(v, v.x + dx, v.y + dy, v.ang)) { v.x += dx; v.y += dy; continue; }
      const cp = vehicleHitPoint(v, v.x + dx, v.y + dy, v.ang) || { x: v.x + dx, y: v.y + dy };
      let hx = !vehicleFree(v, v.x + dx, v.y, v.ang), hy = !vehicleFree(v, v.x, v.y + dy, v.ang);
      if (!hx && !hy) { if (Math.abs(dx) > Math.abs(dy)) hx = true; else hy = true; }
      const vnx = hx ? v.vx : 0, vny = hy ? v.vy : 0, vn = Math.hypot(vnx, vny);
      if (!hx) v.x += dx; if (!hy) v.y += dy;
      // urto: la componente contro il muro rimbalza, quella lungo il muro striscia
      const e = .28, dvx = hx ? -(1 + e) * v.vx : 0, dvy = hy ? -(1 + e) * v.vy : 0;
      v.vx += dvx; v.vy += dvy;
      if (hx) v.vy *= .82; if (hy) v.vx *= .82;
      // il colpo fuori asse fa girare il mezzo
      const rx = cp.x - v.x, ry = cp.y - v.y;
      v.w = clamp(v.w + (rx * dvy - ry * dvx) / K.I * .9, -7, 7);
      if (vn > 1) onWallHit(st, v, vn, cp, Math.atan2(vny, vnx));
      break;
    }
    v.speed = fwd(v); v._spd = v.speed;
  }
  function onWallHit(st, v, vn, cp, ang) {
    vehicleBump(st, v, vn, cp, ang);
    const pl = v.rider === 'player';
    if (vn > 6) damageVehicle(st, v, (vn - 6) * 4, pl ? 'player' : null);
    if (vn > 3) { st.fx.push({ k: 'carhit', x: cp.x, y: cp.y, v: vn, a: ang, wall: true }); if (pl || dist(v.x, v.y, st.player.x, st.player.y) < 30) st.sfx.push({ k: vn > 9 ? 'crash' : 'bump', x: cp.x, y: cp.y, v: vn }); }
    if (pl) { st.shake = Math.max(st.shake, clamp(vn * .045, .1, .8)); if (vn > 13) st.hitstop = Math.max(st.hitstop || 0, .06); }
    loosen(st, v, 1.5);
  }
  // guida: want = direzione voluta, throttle -1..1, brake = freno, hand = freno a mano
  function vehicleMotion(st, v, dt, want, throttle, brake, sprint, hand, steerIn) {
    const K = VK[v.kind]; ensureVel(v);
    const c = Math.cos(v.ang), s = Math.sin(v.ang);
    let vf = v.vx * c + v.vy * s, vl = -v.vx * s + v.vy * c;
    const vf0 = vf, spd = Math.abs(vf);
    // sterzo: le ruote girano verso la direzione voluta, con un po' di ritardo
    let steer = 0;
    if (steerIn !== undefined) steer = clamp(steerIn, -1, 1);
    else if (want !== null) steer = clamp(angDiff(want, v.ang) * 1.7, -1, 1) * (vf < -.3 ? -1 : 1);
    v.steer += (steer - v.steer) * Math.min(1, dt * (steerIn !== undefined && Math.abs(steer) < Math.abs(v.steer) ? 11 : 9));
    // longitudinale
    const vb = v.rider === 'player' ? 1 + .06 * skill(st, 'volante') : 1;
    const max = (sprint ? K.max * 1.15 : K.max) * (1 + (vb - 1) * .5);
    if (throttle > 0) {
      const off = want === null ? 0 : Math.abs(angDiff(want, v.ang));
      let a = vb * K.accel * (off < 1.2 ? 1 : off < 2.4 ? .45 : .2) * (1 - clamp(vf / max, 0, 1) * .35);
      if (vf < 0) a += 10;
      if (vf < max) vf = Math.min(max, vf + a * dt); else vf -= Math.min(vf - max, 4 * dt);
    } else if (throttle < 0) { if (vf > .6) vf -= 16 * dt; else vf = Math.max(-5, vf - K.accel * .7 * dt); }
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), 2.6 * dt);
    if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 19 * dt);
    const hand0 = hand; if (hand) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 3.5 * dt);
    // aderenza laterale: oltre la soglia si scivola (e si continua a scivolare finché non si rallenta)
    // drift automatico: se il puntatore chiede una curva più stretta di ~35°, ad andatura sostenuta la coda parte da sola
    let hk = hand ? 1 : 0;
    if (!hand && want !== null && v.rider === 'player' && vf > 7) { const off = Math.abs(angDiff(want, v.ang)); hk = clamp((off - .6) / .55, 0, 1) * clamp((vf - 7) / 4, 0, 1); }
    v.autoDrift = hk && !hand ? hk : 0;
    let grip = K.grip * vb;
    const slideOn = Math.abs(vl) > (v.sliding ? 1.6 : 3.2); v.sliding = slideOn;
    if (hk > 0) grip *= 1 - hk * (K.two ? .45 : .58);
    else if (slideOn) grip *= K.two ? .8 : .66;
    if (throttle > 0 && Math.abs(v.steer) > .75 && spd > 9 && !K.two) grip *= .88; // gas in curva: la coda allarga
    vl -= Math.sign(vl) * Math.min(Math.abs(vl), grip * dt);
    // imbardata: lo sterzo chiede una velocità di rotazione, le gomme la concedono fino al limite di aderenza
    const turnK = clamp(spd / 3.2, 0, 1) * (1 - .32 * clamp((spd - 11) / 9, 0, 1));
    let wT = v.steer * K.turn * turnK * (vf < -.3 ? -1 : 1);
    if (hk < .5 && spd > 2) { const lim = (slideOn ? grip * 1.25 : K.grip * 1.12) / spd; wT = clamp(wT, -lim, lim); }
    if (hk > 0 && spd > 4) wT *= 1 + .55 * hk;
    v.w += (wT - v.w) * Math.min(1, dt * (hk > .5 ? 3.2 : slideOn ? 3.6 : 8.5));
    v.vx = vf * c - vl * s; v.vy = vf * s + vl * c;
    v.longA = (vf - vf0) / Math.max(dt, 1e-3); v.latA = v.w * vf; v.slip = vl;
    v.skid = clamp((Math.abs(vl) - 1.2) / 3.5, 0, 1);
    if (brake && spd > 5) v.skid = Math.max(v.skid, .7);
    if (hk > 0 && spd > 4) v.skid = Math.max(v.skid, .8 * hk);
    if (throttle > 0 && spd < 4 && vf0 >= -0.1 && !K.two && v.rider === 'player' && sprint) v.skid = Math.max(v.skid, .6); // sgommata in partenza
    physStep(st, v, dt);
  }
  // mezzo lasciato a sé: rotola o resta frenato, si ferma per attrito
  function freeRoll(st, v, dt, parked) {
    const K = VK[v.kind]; ensureVel(v);
    const c = Math.cos(v.ang), s = Math.sin(v.ang);
    let vf = v.vx * c + v.vy * s, vl = -v.vx * s + v.vy * c;
    if (Math.abs(vf) < .02 && Math.abs(vl) < .02 && Math.abs(v.w) < .02) { v.vx = v.vy = v.w = 0; v.speed = 0; v._spd = 0; v.skid = 0; return; }
    const fr = parked ? 7 : 2.4, lg = K.grip * (parked ? .55 : .7);
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), fr * dt);
    vl -= Math.sign(vl) * Math.min(Math.abs(vl), lg * dt);
    v.w *= Math.exp(-dt * (parked ? 3.5 : 2)); if (Math.abs(v.w) < .03) v.w = 0;
    v.vx = vf * c - vl * s; v.vy = vf * s + vl * c;
    v.slip = vl; v.skid = clamp((Math.abs(vl) - 1) / 3, 0, 1); v.latA = v.w * vf; v.longA = 0; v.steer *= .9;
    physStep(st, v, dt);
  }
  function driveVehicle(st, v, dt, inp) {
    const p = st.player;
    if (!v || v.wreck) { p.vehicle = null; return; }
    ensureVel(v);
    // guida: lo sterzo segue il puntatore (d.want); W gas, S freno e retromarcia, A/D sterzano a mano e scavalcano il puntatore, spazio freno a mano, shift spinta
    if (inp.drive) { const d = inp.drive; vehicleMotion(st, v, dt, d.want !== undefined && d.want !== null && !d.steer ? d.want : null, d.thr || 0, false, !!d.boost, !!d.hb, d.steer || (d.want !== undefined && d.want !== null ? undefined : 0)); p.x = v.x; p.y = v.y; p.face = v.ang; p.speed = v.speed; runOver(st, v, 'player'); return; }
    const want = (inp.x || inp.y) ? Math.atan2(inp.y, inp.x) : null;
    const rev = inp.back && v.speed < 1.2;
    const throttle = rev ? -1 : want !== null ? 1 : 0;
    vehicleMotion(st, v, dt, rev ? null : want, throttle, inp.back && v.speed >= 1.2, inp.sprint, inp.brake);
    p.x = v.x; p.y = v.y; p.face = v.ang; p.speed = v.speed;
    runOver(st, v, 'player');
  }
  // urto tra due mezzi: scatole orientate (SAT), impulso con rotazione, attrito
  function obbCorners(v) { const K = VK[v.kind], c = Math.cos(v.ang), s = Math.sin(v.ang), hl = K.len / 2, hw = K.wid / 2; return [[hl, hw], [hl, -hw], [-hl, -hw], [-hl, hw]].map(([a, b]) => [v.x + a * c - b * s, v.y + a * s + b * c]); }
  function insideObb(v, x, y, m) { const K = VK[v.kind], q = vLocal(v, x, y); return Math.abs(q.lx) <= K.len / 2 + (m || 0) && Math.abs(q.ly) <= K.wid / 2 + (m || 0); }
  function massOf(v) { return VK[v.kind].m * (v.wreck ? 1.4 : 1); }
  function collideVehicles(st, a, b) {
    const KA = VK[a.kind], KB = VK[b.kind];
    if (Math.abs(a.x - b.x) > (KA.len + KB.len) / 2 || Math.abs(a.y - b.y) > (KA.len + KB.len) / 2) return;
    const axes = [[Math.cos(a.ang), Math.sin(a.ang)], [-Math.sin(a.ang), Math.cos(a.ang)], [Math.cos(b.ang), Math.sin(b.ang)], [-Math.sin(b.ang), Math.cos(b.ang)]];
    const ext = (K, ang, ax) => K.len / 2 * Math.abs(Math.cos(ang) * ax[0] + Math.sin(ang) * ax[1]) + K.wid / 2 * Math.abs(-Math.sin(ang) * ax[0] + Math.cos(ang) * ax[1]);
    let best = 1e9, nx = 0, ny = 0;
    for (const ax of axes) {
      const d = (b.x - a.x) * ax[0] + (b.y - a.y) * ax[1], ov = ext(KA, a.ang, ax) + ext(KB, b.ang, ax) - Math.abs(d);
      if (ov <= 0) return;
      if (ov < best) { best = ov; const sg = d < 0 ? -1 : 1; nx = ax[0] * sg; ny = ax[1] * sg; }
    }
    // punto di contatto: lo spigolo più infilato nell'altro mezzo
    let cx = 0, cy = 0, cn = 0;
    obbCorners(b).forEach(([x, y]) => { if (insideObb(a, x, y, .05)) { cx += x; cy += y; cn++; } });
    if (!cn) obbCorners(a).forEach(([x, y]) => { if (insideObb(b, x, y, .05)) { cx += x; cy += y; cn++; } });
    if (cn) { cx /= cn; cy /= cn; } else { cx = (a.x + b.x) / 2; cy = (a.y + b.y) / 2; }
    ensureVel(a); ensureVel(b);
    const ma = massOf(a), mb = massOf(b), ia = 1 / ma, ib = 1 / mb, Ia = ma * KA.I, Ib = mb * KB.I;
    // separa i due mezzi in proporzione al peso, senza infilarli nei muri
    const tot = ia + ib, sa = best * ia / tot + .01, sb = best * ib / tot + .01;
    const aOk = vehicleFree(a, a.x - nx * sa, a.y - ny * sa, a.ang), bOk = vehicleFree(b, b.x + nx * sb, b.y + ny * sb, b.ang);
    if (aOk && bOk) { a.x -= nx * sa; a.y -= ny * sa; b.x += nx * sb; b.y += ny * sb; }
    else if (aOk) { if (vehicleFree(a, a.x - nx * (best + .02), a.y - ny * (best + .02), a.ang)) { a.x -= nx * (best + .02); a.y -= ny * (best + .02); } }
    else if (bOk) { if (vehicleFree(b, b.x + nx * (best + .02), b.y + ny * (best + .02), b.ang)) { b.x += nx * (best + .02); b.y += ny * (best + .02); } }
    // impulso
    const rax = cx - a.x, ray = cy - a.y, rbx = cx - b.x, rby = cy - b.y;
    const vax = a.vx - a.w * ray, vay = a.vy + a.w * rax, vbx = b.vx - b.w * rby, vby = b.vy + b.w * rbx;
    const rvx = vbx - vax, rvy = vby - vay, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return; // si stanno già allontanando
    const ran = rax * ny - ray * nx, rbn = rbx * ny - rby * nx, e = .3;
    const j = -(1 + e) * vn / (ia + ib + ran * ran / Ia + rbn * rbn / Ib);
    // attrito lungo la superficie di contatto
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, rat = rax * ty - ray * tx, rbt = rbx * ty - rby * tx;
    const jt = clamp(-vt / (ia + ib + rat * rat / Ia + rbt * rbt / Ib), -j * .4, j * .4);
    const Jx = nx * j + tx * jt, Jy = ny * j + ty * jt;
    a.vx -= Jx * ia; a.vy -= Jy * ia; a.w = clamp(a.w - (rax * Jy - ray * Jx) / Ia, -8, 8);
    b.vx += Jx * ib; b.vy += Jy * ib; b.w = clamp(b.w + (rbx * Jy - rby * Jx) / Ib, -8, 8);
    a.speed = fwd(a); a._spd = a.speed; b.speed = fwd(b); b._spd = b.speed;
    const hit = -vn;
    if (hit > 1.2) { loosen(st, a, 1 + hit * .25); loosen(st, b, 1 + hit * .25); }
    if (hit < 2.5 || st.clock - (a.crashT || -99) < .25 && st.clock - (b.crashT || -99) < .25) return;
    a.crashT = b.crashT = st.clock;
    const by = a.rider === 'player' || b.rider === 'player' ? 'player' : null;
    if (hit > 4) { damageVehicle(st, a, (hit - 4) * 7 * mb / (ma + mb), by); damageVehicle(st, b, (hit - 4) * 7 * ma / (ma + mb), by); }
    if (a.traffic) a.panicT = st.clock; if (b.traffic) b.panicT = st.clock;
    st.fx.push({ k: 'carhit', x: cx, y: cy, v: hit, a: Math.atan2(ny, nx), ids: [a.id, b.id] });
    if (by || dist(cx, cy, st.player.x, st.player.y) < 30) st.sfx.push({ k: hit > 8 ? 'crash' : 'bump', x: cx, y: cy, v: hit });
    if (by) { st.shake = Math.max(st.shake, clamp(hit * .05, .15, .9)); if (hit > 12) st.hitstop = Math.max(st.hitstop || 0, .07); }
  }
  // un oggetto di scena travolto (lo segnala la grafica): il mezzo perde un po' di velocità
  function propHit(st, vid, mass) {
    const v = st.vehicles.find(k => k.id === vid); if (!v || v.hidden) return;
    ensureVel(v); const k = 1 - clamp(mass * 110 / VK[v.kind].m, .01, .45);
    v.vx *= k; v.vy *= k; v.speed = fwd(v); v._spd = v.speed; v.w += (st.rng() - .5) * mass * .4;
    if (v.rider === 'player') st.shake = Math.max(st.shake, clamp(mass * .2, .06, .35));
  }
  // investito: vola via nella direzione del mezzo, un po' di lato, e rotola a terra
  function launch(st, o, v) {
    const vx = v.vx !== undefined ? v.vx : Math.cos(v.ang) * v.speed, vy = v.vy !== undefined ? v.vy : Math.sin(v.ang) * v.speed, sp = Math.hypot(vx, vy);
    const q = vLocal(v, o.x, o.y), side = Math.sign(q.ly || (st.rng() - .5)), c = Math.cos(v.ang), s = Math.sin(v.ang);
    o.kbx = vx * (.75 + st.rng() * .3) - s * side * sp * .35; o.kby = vy * (.75 + st.rng() * .3) + c * side * sp * .35;
    o.airT = st.clock; o.airDur = clamp(.3 + sp * .04, .35, 1.1); o.airH = clamp(.3 + sp * .12, .4, 2.8); o.airSpin = (st.rng() < .5 ? -1 : 1) * (1 + st.rng());
  }
  // sbalzo: scivola finché l'attrito non lo ferma (poco in aria, molto a terra), rimbalza sui muri
  function knockback(st, o, dt) {
    if (!o.kbx && !o.kby) return;
    const nx = o.x + o.kbx * dt, ny = o.y + o.kby * dt;
    if (walkM(nx, o.y)) o.x = nx; else o.kbx *= -.4;
    if (walkM(o.x, ny)) o.y = ny; else o.kby *= -.4;
    const air = st.clock - (o.airT || -9) < (o.airDur || 0), l = Math.hypot(o.kbx, o.kby), f = Math.max(0, l - (air ? 1 : 14) * dt) / (l || 1);
    o.kbx *= f; o.kby *= f; if (l < .1) { o.kbx = 0; o.kby = 0; }
  }
  function runOver(st, v, by) {
    const K = VK[v.kind];
    for (const n of st.npcs) {
      if (n.inside || n.dead || n.jailedUntil > st.t) continue;
      const d = dist(n.x, n.y, v.x, v.y);
      if (insideVehicle(v, n.x, n.y, .3)) {
        const vsp = v.vx !== undefined ? Math.hypot(v.vx, v.vy) : Math.abs(v.speed);
        if (vsp > 5.5) {
          n.stun = 3; const a = v.vx !== undefined ? Math.atan2(v.vy, v.vx) : v.ang; launch(st, n, v);
          scaleVel(v, .82); if (by === 'player') st.shake = Math.max(st.shake, .3);
          st.sfx.push({ k: 'thud' });
          const dmg = 18 + vsp * 5;
          if (by === 'player' && st.clock - (n.lastHitByCar || -99) > 3) {
            n.lastHitByCar = st.clock;
            if (n.hp - dmg > 0) { const ev = emit(st, 'investimento', { target: n.id }); addLog(st, `${clockStr(st.t)} · Hai investito ${n.name}.`, 'bad', ev.id); }
          }
          damage(st, n, dmg, by === 'player' ? 'player' : 'env', a, 'lupara');
        } else pushOutOfVehicles(st, n, .35);
      }
    }
    if (by !== 'player' && !st.player.vehicle) {
      const p = st.player, d = dist(p.x, p.y, v.x, v.y);
      if (insideVehicle(v, p.x, p.y, .3) && Math.abs(v.speed) > 5.5 && st.clock - (p.carHitT || -99) > 2) { p.carHitT = st.clock; launch(st, p, v); damagePlayer(st, 15 + Math.abs(v.speed) * 3, v.ang, 'auto'); p.stun = 1.2; scaleVel(v, .6); }
    }
  }
  // corsia: la strada a una certa distanza, spostata a destra di chi guida (si tiene la destra)
  const ROAD_BY_ID = {}; ROADS.forEach(r => ROAD_BY_ID[r.id] = r);
  function laneAt(R, s, dir) {
    const q = roadAt(R, s), a = q.ang + (dir < 0 ? Math.PI : 0), off = Math.min(2.6, R.w / 4 + .1);
    return { x: q.x - Math.sin(a) * off, y: q.y + Math.cos(a) * off, ang: a, s: q.s };
  }
  // traffico: segue la sua corsia sulla strada, rallenta in curva, si ferma davanti agli ostacoli
  function updateTraffic(st, v, dt) {
    ensureVel(v);
    const R = ROAD_BY_ID[v.road];
    if (v.looseUntil > st.clock || v.stalled || !R) { freeRoll(st, v, dt, v.stalled || !R); runOver(st, v, 'traffic'); return; }
    if (v.looseUntil) {
      // si riprende dall'urto: se è finito fuori corsia, di traverso o troppo malconcio, il guidatore scende e scappa
      v.looseUntil = 0;
      const nr = nearestOnRoad(R, v.x, v.y), q = laneAt(R, nr.s, v.dir);
      if (Math.abs(angDiff(q.ang, v.ang)) > .9 || v.hp < VK[v.kind].hp * .45 || dist(q.x, q.y, v.x, v.y) > 3.5) { v.stalled = true; v.traffic = false; v.rider = null; v.speed = 0; v._spd = 0; v.vx = v.vy = v.w = 0; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); return; }
      v.s = nr.s;
    }
    const panic = st.clock - (v.panicT || -99) < 8 || st.clock - st.panicAt < 3 && dist(v.x, v.y, st.player.x, st.player.y) < 30;
    // in curva si va piano: quanto gira la strada nei prossimi 18 m
    const a0 = laneAt(R, v.s, v.dir).ang, a1 = laneAt(R, v.s + v.dir * 18, v.dir).ang, bend = Math.abs(angDiff(a1, a0));
    const target = (panic ? 12 : 8) * clamp(1.15 - bend * .9, .45, 1);
    let block = 99;
    const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
    const check = (x, y, r) => { const dx = x - v.x, dy = y - v.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx); if (along > 0 && along < 10 && lat < 1.4 + r) block = Math.min(block, along - r); };
    if (!st.player.vehicle) check(st.player.x, st.player.y, .4);
    st.npcs.forEach(n => { if (!n.inside && !n.dead) check(n.x, n.y, .4); else if (n.dead && !n.inside) check(n.x, n.y, .3); });
    st.vehicles.forEach(o => { if (o === v || o.hidden) return; const dx = o.x - v.x, dy = o.y - v.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx); if (along > 0 && along < 12 && lat < (VK[v.kind].wid + VK[o.kind].wid) / 2 + .35) block = Math.min(block, along - (VK[v.kind].len + VK[o.kind].len) / 2 + 1); });
    const K = VK[v.kind];
    let want = target;
    if (block < 8) want = Math.min(want, Math.max(0, (block - 2.2) * 1.6));
    if (v.speed < want) v.speed = Math.min(want, v.speed + K.accel * .6 * dt); else v.speed = Math.max(want, v.speed - 14 * dt);
    if (block < 3 && v.speed < .5) { v.stuck += dt; if (v.stuck > 2.5 && st.clock > v.honk) { v.honk = st.clock + 3; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); } } else v.stuck = 0;
    // avanza lungo la corsia (le strade aperte: in fondo fa inversione)
    v.s += v.speed * dt * v.dir;
    if (!R.closed && (v.s < 2 || v.s > R.len[R.len.length - 1] - 2)) { v.dir *= -1; v.s = clamp(v.s, 2, R.len[R.len.length - 1] - 2); }
    const q = laneAt(R, v.s, v.dir), ox = v.x, oy = v.y;
    v.x += (q.x - v.x) * Math.min(1, dt * 6); v.y += (q.y - v.y) * Math.min(1, dt * 6);
    v.ang += angDiff(q.ang, v.ang) * Math.min(1, dt * 5);
    v.vx = (v.x - ox) / Math.max(dt, 1e-3); v.vy = (v.y - oy) / Math.max(dt, 1e-3); v.w = 0; v._spd = v.speed; v.skid = 0; v.steer = clamp(angDiff(a1, a0) * 2, -1, 1);
    runOver(st, v, 'traffic');
  }
  // auto della polizia guidata dal computer
  function updatePoliceCar(st, v, dt) {
    const p = st.player;
    if (v.leaving) {
      v.siren = false;
      if (!v.exitPt) { const R = ROADS.find(r => r.traffic), here = nearestOnRoad(R, v.x, v.y); v.exitPt = laneAt(R, here.s + 120, 1); v.path = null; }
      if (!v.path || !v.path.length || st.clock - (v.pathT || 0) > 3) { v.path = findPath(v.x, v.y, v.exitPt.x, v.exitPt.y, 1); v.pathT = st.clock; }
      const w = v.path[0];
      if (!w || dist(v.x, v.y, p.x, p.y) > 70 || v.stuck > 4 || dist(v.x, v.y, v.exitPt.x, v.exitPt.y) < 6) { v.hidden = true; return; }
      if (dist(v.x, v.y, w.x, w.y) < 2.2) { v.path.shift(); return; }
      const want = Math.atan2(w.y - v.y, w.x - v.x), x0 = v.x, y0 = v.y;
      vehicleMotion(st, v, dt, want, 1, false, false, false);
      if (dist(x0, y0, v.x, v.y) < .02) v.stuck += dt; else v.stuck = Math.max(0, v.stuck - dt);
      return;
    }
    if (v.arrived || v.looseUntil > st.clock) { freeRoll(st, v, dt, v.arrived); return; }
    if (!v.path || !v.path.length || st.clock - (v.pathT || 0) > 3) { const tgt = st.lastSeen || p; v.path = findPath(v.x, v.y, tgt.x, tgt.y, 1); v.pathT = st.clock; }
    const w = v.path[0];
    const tgt = st.lastSeen || p;
    if (!w || dist(v.x, v.y, tgt.x, tgt.y) < 9 || v.stuck > 5) { v.arrived = true; spawnCrew(st, v); return; }
    if (dist(v.x, v.y, w.x, w.y) < 2.2) { v.path.shift(); return; }
    const want = Math.atan2(w.y - v.y, w.x - v.x);
    const off = Math.abs(angDiff(want, v.ang));
    const x0 = v.x, y0 = v.y;
    vehicleMotion(st, v, dt, want, off > 1.4 && v.speed > 5 ? 0 : 1, off > 1.4 && v.speed > 5, false, false);
    if (dist(x0, y0, v.x, v.y) < .02) v.stuck += dt; else v.stuck = Math.max(0, v.stuck - dt);
    runOver(st, v, 'police');
  }
  function spawnCrew(st, v) {
    const looks = [
      { skin: '#dcae88', top: '#23355e', bottom: '#1b2440', hair: '#2a1a12', hat: 'police', build: 1.1, extra: 'belt' },
      { skin: '#c99a76', top: '#23355e', bottom: '#1b2440', hair: '#111', hat: 'police', build: 1.0, extra: 'belt,moustache' },
    ];
    const names = [['Agente Morra', 'rinf1'], ['Agente Pini', 'rinf2']];
    names.forEach(([name, id], i) => {
      if (st.npcs.find(n => n.id === id && !n.dead)) return;
      st.npcs = st.npcs.filter(n => n.id !== id);
      const n = makeNpc(st, { id, name, role: 'Rinforzi della Polizia', home: 'commissariato', hp: 100, weapon: i ? 'pistola' : 'mitra', tr: { cor: .8, loq: .3, avid: .2, legge: 1 }, sched: [[0, 'commissariato']], cop: true, reinforcement: true, look: looks[i] });
      const side = i ? 1 : -1;
      n.x = v.x + Math.cos(v.ang + side * Math.PI / 2) * 1.8; n.y = v.y + Math.sin(v.ang + side * Math.PI / 2) * 1.8;
      if (!walkM(n.x, n.y)) { n.x = v.x - Math.cos(v.ang) * 2.5; n.y = v.y - Math.sin(v.ang) * 2.5; }
      n.car = v.id; n.inside = false; n.action.name = 'pattuglia';
      // i rinforzi sanno quello che sa la centrale
      const carla = st.npcs.filter(c => c.cop && !c.reinforcement).sort((a, b) => b.alert - a.alert)[0];
      if (carla) n.mem = carla.mem.map(m => Object.assign({}, m, { id: st.nextId++, source: 'radio', via: (m.via || []).concat([carla.first]) }));
      st.npcs.push(n);
    });
    say(st, st.npcs.find(n => n.id === 'rinf1'), 'Rinforzi sul posto! Dov\'è?', 2.5);
  }
  function updateReinforcements(st) {
    const lv = wantedLevel(st);
    st.npcs = st.npcs.filter(n => !n.gone);
    if (lv >= 3 && !st.reinf && st.clock > st.reinfCd) {
      if (!st.lastSeen) st.lastSeen = { x: st.player.x, y: st.player.y, clock: st.clock };
      const R = ROADS.find(r => r.traffic), here = nearestOnRoad(R, st.player.x, st.player.y);
      let best = null; for (const off of [60, -60, 75, -75, 45, -45, 90, -90]) { const q = laneAt(R, here.s + off, off > 0 ? -1 : 1), d = dist(q.x, q.y, st.player.x, st.player.y); if (d > 35 && (!best || Math.abs(d - 60) < Math.abs(best.d - 60))) best = Object.assign(q, { d }); }
      if (!best) best = laneAt(R, here.s + 60, -1);
      const v = makeVehicle(st, { id: 'police' + st.nextId++, kind: 'polizia', x: best.x, y: best.y, ang: best.ang, color: '#8fb4d8', police: true, rider: 'npc', siren: true, speed: 10 });
      st.vehicles.push(v); st.reinf = { car: v.id, t: st.clock }; st.reinfCd = st.clock + 50;
      feed(st, 'Sirene. Arrivano i rinforzi.', 'bad'); addLog(st, `${clockStr(st.t)} · La centrale manda i rinforzi.`, 'bad');
    }
    if (st.reinf) {
      const car = st.vehicles.find(v => v.id === st.reinf.car);
      const crewAlive = st.npcs.some(n => n.reinforcement && !n.dead);
      if (!car || car.wreck) { if (!crewAlive) st.reinf = null; }
      else if (lv === 0 && car.arrived && !crewAlive) { car.leaving = true; car.arrived = false; car.rider = 'npc'; st.reinf = null; }
      else car.siren = lv >= 2 || !car.arrived;
    }
    st.vehicles = st.vehicles.filter(v => !(v.police && v.hidden));
  }

  // ---------------- DISTRUZIONE ----------------
  // I muraglioni si sfondano: 3 botte in Vespa, 2 con un'auto (una botta conta sopra i 3 m/s).
  // La casella diventa macerie percorribili, con una rampa visiva tra le quote dei due lati.
  // Le facciate degli edifici si crepano e poi si bucano: solo grafica, l'edificio resta pieno.
  const BREAK_NEED = kind => kind === 'vespa' ? 3 : 2;
  function cellH(tx, ty) {
    const i = ty * GW + tx, r = rampOf[i];
    if (r < 0) return elev[i];
    const R = RAMPS[r], k = R.axis === 'x' ? (tx + .5 - R.x) / R.w : (ty + .5 - R.y) / R.h;
    return R.h0 + (R.h1 - R.h0) * clamp(k, 0, 1);
  }
  function breakWallCell(tx, ty, mx, my) {
    const i = ty * GW + tx; if (!wallAt[i]) return false;
    // quota del primo terreno libero dietro e davanti, lungo la direzione dell'urto
    const side = s => { for (let k = 1; k <= 3; k++) { const x = tx + mx * s * k, y = ty + my * s * k; if (x < 0 || y < 0 || x >= GW || y >= GH) return null; const v = grid[y * GW + x]; if (v === T.WATER) return null; if (v !== T.BLD) return cellH(x, y); if (!wallAt[y * GW + x]) return null; } return null; };
    let hb = side(-1), hf = side(1); if (hb === null) hb = hf; if (hf === null) hf = hb; if (hb === null) hb = hf = elev[i];
    const axis = mx ? 'x' : 'y', dir = mx || my;
    RAMPS.push({ x: tx, y: ty, w: 1, h: 1, axis, h0: dir > 0 ? hb : hf, h1: dir > 0 ? hf : hb, stairs: false, rubble: true });
    rampOf[i] = RAMPS.length - 1; elev[i] = (hb + hf) / 2; wallAt[i] = 0; grid[i] = T.ROCK;
    return true;
  }
  function breakWall(st, tx, ty, ang, x, y) {
    const c = Math.cos(ang), s = Math.sin(ang), alongX = Math.abs(c) >= Math.abs(s);
    const mx = alongX ? Math.sign(c) : 0, my = alongX ? 0 : Math.sign(s);
    const cells = [];
    // la breccia è larga tre caselle: la centrale e le due di fianco, se sono muro
    [0, -1, 1].forEach(o => { const cx = tx + (alongX ? 0 : o), cy = ty + (alongX ? o : 0); if (cx >= 0 && cy >= 0 && cx < GW && cy < GH && breakWallCell(cx, cy, mx, my)) cells.push([cx, cy]); });
    if (!cells.length) return;
    st.breaches++;
    st.fx.push({ k: 'wallbreak', cells, a: ang, x, y }); st.sfx.push({ k: 'crollo', x, y });
    st.shake = Math.max(st.shake, dist(x, y, st.player.x, st.player.y) < 16 ? .6 : .2);
    panicAround(st, x, y, 16, 5);
  }
  // un veicolo sbatte contro qualcosa di solido: trova la casella colpita dal muso (o dalla coda, in retromarcia)
  function vehicleBump(st, v, speed, cp, hitAng) {
    if (speed < 3 || st.clock - (v.bumpT || -9) < .35) return;
    const K = VK[v.kind], dir = Math.sign(v.speed || 1);
    const ang = hitAng !== undefined ? hitAng : dir > 0 ? v.ang : v.ang + Math.PI;
    const c = Math.cos(v.ang), s = Math.sin(v.ang), fw = K.len / 2 + .3;
    const probes = cp ? [[cp.x + Math.cos(ang) * .3, cp.y + Math.sin(ang) * .3], [cp.x + Math.cos(ang) * .8, cp.y + Math.sin(ang) * .8]]
      : [0, K.wid / 2 - .1, -(K.wid / 2 - .1)].map(lat => [v.x + c * fw * dir - s * lat, v.y + s * fw * dir + c * lat]);
    for (const [x, y] of probes) {
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (tx < 0 || ty < 0 || tx >= GW || ty >= GH || grid[ty * GW + tx] !== T.BLD) continue;
      v.bumpT = st.clock;
      const i = ty * GW + tx, need = BREAK_NEED(v.kind);
      if (wallAt[i]) {
        const n = st.wallHits[i] = (st.wallHits[i] || 0) + 1;
        st.fx.push({ k: 'wallhit', x, y, a: ang, n, need, tx, ty, speed });
        if (n >= need) breakWall(st, tx, ty, ang, x, y);
      } else if (bIndex[i] >= 0) {
        // la botta si sente anche sulle caselle di fianco: il muro è uno solo
        const alongX = Math.abs(Math.cos(ang)) >= Math.abs(Math.sin(ang));
        [-1, 1].forEach(o => { const j = alongX ? i + o * GW : i + o; if (j >= 0 && j < GW * GH && bIndex[j] === bIndex[i]) st.facadeHits[j] = (st.facadeHits[j] || 0) + 1; });
        const n = st.facadeHits[i] = (st.facadeHits[i] || 0) + 1;
        const glassy = glassFront(BUILDINGS[bIndex[i]], ang), needF = glassy ? 1 : need;
        st.fx.push({ k: 'facadehit', x, y, a: ang, n, need: needF, b: bIndex[i], tx, ty, speed, glass: glassy });
        if (n === needF) { st.sfx.push({ k: 'crollo', x, y }); panicAround(st, x, y, 12, 4); openFacade(st, tx, ty, ang, x, y); }
      }
      return;
    }
  }
  // vetrine: le facciate déco hanno vetrate su tutto il piano terra, negozi e locali solo sul davanti
  function glassFront(b, ang) {
    if (!b || b.church || b.warehouse || b.lighthouse) return false;
    if (b.deco) return true;
    if (!(b.shop || b.sign) || !b.door) return false;
    const c = Math.cos(ang), s = Math.sin(ang), alongX = Math.abs(c) >= Math.abs(s), mx = alongX ? Math.sign(c) : 0, my = alongX ? 0 : Math.sign(s);
    return (my < 0 && b.door[1] >= b.y + b.h) || (my > 0 && b.door[1] < b.y) || (mx < 0 && b.door[0] >= b.x + b.w) || (mx > 0 && b.door[0] < b.x);
  }
  // facciata sfondata: il piano terra dietro al buco diventa percorribile (tre caselle di fronte, fino a due di profondità).
  // La grafica ci costruisce dentro una stanza arredata e abitata.
  function openFacade(st, tx, ty, ang, x, y) {
    const b = bIndex[ty * GW + tx]; if (b < 0) return;
    const c = Math.cos(ang), s = Math.sin(ang), alongX = Math.abs(c) >= Math.abs(s);
    const mx = alongX ? Math.sign(c) : 0, my = alongX ? 0 : Math.sign(s);
    const inB = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && bIndex[j * GW + i] === b;
    const cells = [];
    [0, -1, 1].forEach(o => {
      const cx = tx + (alongX ? 0 : o), cy = ty + (alongX ? o : 0);
      // solo caselle sul bordo dell'edificio, dal lato dell'urto
      if (!inB(cx, cy) || inB(cx - mx, cy - my) || grid[cy * GW + cx] !== T.BLD) return;
      cells.push([cx, cy, 0]);
      if (inB(cx + mx, cy + my) && inB(cx + 2 * mx, cy + 2 * my)) cells.push([cx + mx, cy + my, 1]);
    });
    if (!cells.length) return;
    cells.forEach(([cx, cy]) => { grid[cy * GW + cx] = T.COB; });
    st.rooms.push({ b, cells, mx, my });
    st.fx.push({ k: 'breach', b, cells, mx, my, x, y });
  }
  // l'esplosione sfonda i muraglioni e buca le facciate nel raggio
  function blastMap(st, x, y, r) {
    const t0x = Math.floor((x - r) / TS), t1x = Math.floor((x + r) / TS), t0y = Math.floor((y - r) / TS), t1y = Math.floor((y + r) / TS);
    for (let ty = Math.max(0, t0y); ty <= Math.min(GH - 1, t1y); ty++) for (let tx = Math.max(0, t0x); tx <= Math.min(GW - 1, t1x); tx++) {
      const cx = tx * TS + 1, cy = ty * TS + 1, d = dist(x, y, cx, cy), i = ty * GW + tx; if (d > r + 1) continue;
      const a = Math.atan2(cy - y, cx - x);
      if (wallAt[i]) breakWall(st, tx, ty, a, cx, cy);
      else if (bIndex[i] >= 0 && grid[i] === T.BLD) {
        // punto della facciata più vicino all'esplosione
        const px = clamp(x, tx * TS, tx * TS + TS), py = clamp(y, ty * TS, ty * TS + TS);
        const was = st.facadeHits[i] || 0; st.facadeHits[i] = Math.max(was, 2);
        st.fx.push({ k: 'facadehit', x: px, y: py, a, n: 2, need: 2, b: bIndex[i], tx, ty, speed: 20, blast: true });
        if (was < 2 && d < r * .75) openFacade(st, tx, ty, a, px, py);
      }
    }
  }

  // ---------------- PROIETTILI E FUOCO ----------------
  function updateProjectiles(st, dt) {
    st.proj = st.proj.filter(pr => {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.vz -= pr.g * dt;
      if (solidM(pr.x, pr.y) && pr.z < 8) { pr.z = 0; }
      if (pr.z > 0) return true;
      st.fires.push({ x: pr.x, y: pr.y, r: 2.4, until: st.clock + 6, owner: pr.owner });
      st.fx.push({ k: 'molotov', x: pr.x, y: pr.y }); st.sfx.push({ k: 'glass', x: pr.x, y: pr.y });
      if (pr.owner === 'player') { const ev = emit(st, 'molotov', { x: pr.x, y: pr.y }); addLog(st, `${clockStr(st.t)} · Hai lanciato una molotov a ${ev.place}.`, 'bad', ev.id); }
      panicAround(st, pr.x, pr.y, 20, 7);
      return false;
    });
    st.fires = st.fires.filter(f => {
      if (st.clock > f.until) return false;
      st.npcs.forEach(n => { if (!n.dead && !n.inside && dist(n.x, n.y, f.x, f.y) < f.r) { n.burn = 2; } });
      const p = st.player; if (!p.vehicle && dist(p.x, p.y, f.x, f.y) < f.r && st.clock - (p.fireT || -99) > .5) { p.fireT = st.clock; damagePlayer(st, 9, 0, 'fuoco'); }
      st.vehicles.forEach(v => { if (!v.wreck && !v.hidden && dist(v.x, v.y, f.x, f.y) < f.r + VK[v.kind].r) damageVehicle(st, v, 30 * dt, f.owner); });
      return true;
    });
    st.npcs.forEach(n => {
      if (n.burn > 0 && !n.dead) {
        n.burn -= dt; if (st.clock - (n.burnT || -99) > .5) { n.burnT = st.clock; damage(st, n, 10, 'player', n.face + Math.PI, 'pugni'); }
        if (!n.faction && !n.cop) { n.panic = 3; n.fleeFrom = { x: n.x - Math.cos(n.face), y: n.y - Math.sin(n.face) }; }
      }
    });
  }

  // ---------------- CICLO ----------------
  function step(st, dtReal, inp) {
    if (st.over) return;
    if (st.hitstop > 0) { st.hitstop -= dtReal; return; }
    let dt = dtReal;
    if (st.slowmo > 0) { st.slowmo -= dtReal; dt = dtReal * .35; }
    st.clock += dt; if (!(inp && inp.freeze)) st.t += dt * MIN_PER_SEC;
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dtReal * 1.6);
    movePlayer(st, dt, inp || { x: 0, y: 0 });
    st.timers = st.timers.filter(tm => {
      if (tm.kind === 'glance' && st.clock >= tm.atClock) {
        const n = byId(st, tm.npc), ev = st.events.find(e => e.id === tm.ev);
        if (n && ev && seesPlayer(st, n) && dist(st.player.x, st.player.y, ev.x, ev.y) < 7) addMemory(st, n, { eventId: ev.id, type: ev.type, target: ev.target, owner: ev.owner, shop: ev.shop, place: ev.place, t: ev.t, actor: 'player', conf: .7, source: 'visto' });
        return false;
      }
      if (tm.kind === 'discover' && st.t >= tm.at) {
        const n = byId(st, tm.npc), ev = st.events.find(e => e.id === tm.ev);
        if (n && !n.dead && ev && !n.mem.find(m => m.eventId === ev.id)) { addMemory(st, n, { eventId: ev.id, type: 'scippo', target: n.id, place: ev.place, t: ev.t, actor: 'ignoto', conf: .9, source: 'scoperto' }); if (!n.inside) say(st, n, 'Il portafoglio! Chi è stato?'); addLog(st, `${clockStr(st.t)} · ${n.name} si accorge dello scippo. Non sa chi è stato.`, 'info', ev.id); }
        return false;
      }
      if (tm.kind === 'discoverVehicle' && st.t >= tm.at) {
        const n = byId(st, tm.npc), ev = st.events.find(e => e.id === tm.ev);
        if (n && !n.dead && ev && !n.mem.find(m => m.eventId === ev.id)) { addMemory(st, n, { eventId: ev.id, type: ev.type, owner: n.id, place: ev.place, t: ev.t, actor: 'ignoto', conf: .95, source: 'scoperto' }); addLog(st, `${clockStr(st.t)} · ${n.name} non trova più ${tm.kindV === 'vespa' ? 'la sua Vespa' : 'la sua macchina'}.`, 'info', ev.id); }
        return false;
      }
      return true;
    });
    for (const n of st.npcs) {
      if (n.dead) continue;
      n.thinkAt -= dt;
      if (n.thinkAt <= 0) { n.thinkAt = n.action.name === 'combatte' ? .25 : .35; think(st, n); }
      moveNpc(st, n, dt);
      if (!n.inside) pushOutOfVehicles(st, n, .35);
    }
    for (const v of st.vehicles) {
      if (v.hidden) continue;
      if (v.burning > 0) { v.burning -= dt; if (v.burning <= 0) explode(st, v); }
      if (v.wreck) { freeRoll(st, v, dt, true); continue; }
      if (v.traffic) updateTraffic(st, v, dt);
      else if (v.police && v.rider === 'npc') updatePoliceCar(st, v, dt);
      else if (v.rider !== 'player') { freeRoll(st, v, dt, !v.rider); if (Math.hypot(v.vx, v.vy) > 5.5) runOver(st, v, v.lastHitBy === 'player' ? 'player' : 'loose'); }
    }
    // urti tra veicoli
    for (let i = 0; i < st.vehicles.length; i++) for (let j = i + 1; j < st.vehicles.length; j++) {
      const a = st.vehicles[i], b = st.vehicles[j]; if (a.hidden || b.hidden) continue;
      collideVehicles(st, a, b);
    }
    if (st.player.vehicle && st.player.x !== undefined) { const v = st.vehicles.find(k => k.id === st.player.vehicle); if (v) { st.player.x = v.x; st.player.y = v.y; } }
    updateProjectiles(st, dt);
    updatePickups(st);
    const live = st.npcs.filter(n => !n.inside && !n.dead);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], d = dist(a.x, a.y, b.x, b.y);
      if (d < .55 && d > .001) { const push = (.55 - d) / 2, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; if (walkM(a.x - ux * push, a.y - uy * push)) { a.x -= ux * push; a.y -= uy * push; } if (walkM(b.x + ux * push, b.y + uy * push)) { b.x += ux * push; b.y += uy * push; } }
    }
    st.gossipAt = (st.gossipAt || 0) - dt;
    if (st.gossipAt <= 0) { st.gossipAt = .5; gossip(st); }
    st.links = st.links.filter(l => l.until > st.clock);
    st.moments = st.moments.filter(m => m.until > st.clock);
    st.feed = st.feed.filter(f => f.until > st.clock);
    if (st.lastSeen && st.clock - st.lastSeen.clock > 30) { st.lastSeen = null; feed(st, 'La polizia ti ha perso di vista.', 'good'); }
    st.chase = st.npcs.some(n => n.cop && !n.dead && (n.action.name === 'insegue' || n.action.name === 'combatte'));
    updateReinforcements(st);
    updateJob(st);
    if (st.pendingEnd && st.clock > st.pendingEnd.at) st.over = { win: st.pendingEnd.win, reason: st.pendingEnd.reason };
    if (st.t >= st.deadline && !st.over) st.over = { win: false, reason: 'È l\'alba di giovedì. Lo Squalo è venuto a prendersi quello che gli devi.' };
  }

  function knowers(st, evId) { const out = []; for (const n of st.npcs) { const m = n.mem.find(k => k.eventId === evId); if (m) out.push({ npc: n, mem: m }); } return out; }
  function reputation(st) {
    let known = 0, tr = 0, gr = 0, fe = 0; const liv = st.npcs.filter(n => !n.dead && !n.reinforcement && !n.driver);
    for (const n of liv) { opinions(st, n); if (n.mem.some(m => m.actor === 'player')) known++; tr += n.op.trust; gr += n.op.grudge; fe += n.op.fear; }
    const k = liv.length || 1; return { known, total: liv.length, trust: tr / k, grudge: gr / k, fear: fe / k };
  }
  function attitude(st, n) {
    const o = n.op;
    if (n.dead) return { label: 'Morto', tone: 'dead' };
    if (hostile(st, n)) return { label: n.cop ? 'Ti spara' : 'Ti vuole morto', tone: 'bad' };
    if (n.framedAngry) return { label: 'Vuole vendetta', tone: 'bad' };
    if (o.fear > .5) return { label: 'Terrorizzato', tone: 'bad' };
    if (o.grudge > .45) return { label: 'Ostile', tone: 'bad' };
    if (o.grudge > .2 || o.fear > .25) return { label: 'Diffidente', tone: 'warn' };
    if (o.trust > .45) return { label: 'Amico', tone: 'good' };
    if (o.trust > .15) return { label: 'Ben disposto', tone: 'good' };
    return { label: n.mem.some(m => m.actor === 'player') ? 'Neutrale' : 'Non ti conosce', tone: 'none' };
  }

  return {
    ITEMS, SKILLS, skill, maxHp, xpNext, gainXp, upgrade, addItem, useItem, lootValue, discount,
    TS, GW, GH, WW, WH, T, OX, MAP, BUILDINGS, propHit, glassFront, PLACES, LABEL, NEG, SEV, JOBS, WEAPONS, VK, PICKUP_LABEL, DEBT, START_T, END_T, PLAYER_NAME,
    tileAt, walkT, walkM, bIndex, create, step, act, fire, reload, switchWeapon, context, talk, talkChoice, jobTarget, knowers, reputation, opinions, hostile, pickupVisible,
    attitude, wanted: wantedLevel, wantedLevel, priceFor, clockStr, hour, day, dayName, isNight, nameOf, byId, fresh, weight, visionRange, canSee, nearestNpc, nearestVehicle,
    verbPast, youVerb, rumorText, hoursLeft, findPath, vehicleName, roadAt, nearestOnRoad, OY,
  };
})();
if (typeof module !== 'undefined') module.exports = Game;
