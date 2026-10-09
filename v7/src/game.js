
/* Porto Vecchio — logica di gioco (nessuna grafica).
   Mondo in metri: x verso est, y verso sud. Una casella = 2 m. */
var Game = (function () {
  'use strict';
  const W0 = typeof World !== 'undefined' ? World : require('./world.js');
  const TS = W0.TS, GW = W0.GW, GH = W0.GH, WW = GW * TS, WH = GH * TS;
  const MIN_PER_SEC = 1.2, DEBT = 500, START_T = 9 * 60, END_T = 54 * 60;   // [vivi] 1,2 minuti di gioco al secondo (erano 2,5): una giornata dura mezz'ora, a piedi 100 m sono circa un'ora e mezza, non tre   // [unione8] si comincia di mattina, col sole (prima alle 18); lo Squalo arriva sempre all'alba di giovedì
  const PLAYER_NAME = 'Nino';

  function makeRng(seed) { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b, c, d) => Math.hypot(c - a, d - b);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  // ---------------- MAPPA ----------------
  // L'isola di Porto Vecchio. Al centro il borgo storico (spostato di OX caselle verso est),
  // a ovest il Ponente (pineta, discoteca, cinema, distributore, cantiere, faro), a est la collina
  // dei caruggi e il Lungomare con gli hotel e la spiaggia. La Via al Mare (righe 23-25) attraversa
  // tutta l'isola e prosegue sui ponti verso la terraferma: le corsie del traffico restano dove erano.
  // I dislivelli sono solo visivi (MAP.elev, MAP.ramps): per la logica i muraglioni sono caselle BLD.
  const T = W0.T;
  // ---------------- IL MONDO: l'isola generata da world.js ----------------
  const OX = 0;
  const BUILDINGS = W0.BUILDINGS;
  const grid = W0.grid.slice(), bIndex = W0.bIndex, elev = W0.elev, rampOf = new Int16Array(GW * GH).fill(-1), wallAt = new Uint8Array(GW * GH);
  const setT = (x, y, v) => { if (x >= 0 && y >= 0 && x < GW && y < GH) grid[y * GW + x] = v; };
  const RAMPS = [], ARCHES = [];
  const MAP = { OX, elev, rampOf, ramps: RAMPS, wallAt, arches: ARCHES, vh: W0.vh, VW: W0.VW, zone: W0.zone, Z: W0.Z, roads: W0.roads, lanes: W0.lanes, world: W0, grid };
  // copia della mappa intatta: alberi tagliati e muri sfondati tornano al loro posto a ogni nuova partita
  const MAP0 = { grid: grid.slice(), wallAt: wallAt.slice(), elev: elev.slice(), rampOf: rampOf.slice(), ramps: 0 };
  function restoreMap() { grid.set(MAP0.grid); wallAt.set(MAP0.wallAt); elev.set(MAP0.elev); rampOf.set(MAP0.rampOf); RAMPS.length = MAP0.ramps; }

  const tileAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= GW || ty >= GH) ? T.WATER : grid[ty * GW + tx];
  const walkT = (tx, ty) => { const v = tileAt(tx, ty); return v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };   // [monte] CLIFF: pareti e muri a secco
  const walkM = (x, y) => walkT(Math.floor(x / TS), Math.floor(y / TS));
  // [costa] il mare: si nuota nell'acqua di mare dentro la mappa; le barche vanno dove è fondo almeno mezzo metro (World.SEA.depth)
  const SEA = W0.SEA || null;
  const seaT = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH && grid[ty * GW + tx] === T.WATER && W0.zone[ty * GW + tx] === W0.Z.MARE;
  const seaM = (x, y) => seaT(Math.floor(x / TS), Math.floor(y / TS));
  const boatM = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return seaT(tx, ty) && (!SEA || SEA.depth[ty * GW + tx] >= .45); };
  // ---- interni: la porta di strada di ogni edificio porta dentro ----
  const INT = typeof Interior !== 'undefined' ? Interior : (typeof require !== 'undefined' ? require('./interior.js') : null);
  const DOOR_OF = new Map(); W0.BUILDINGS.forEach((b, i) => { if (b.door) DOOR_OF.set(b.door[1] * W0.GW + b.door[0], i); });
  function enterBuilding(st, bi) {
    const p = st.player, b = W0.BUILDINGS[bi]; if (!INT || !b || p.vehicle) return false;
    const L = INT.layout(b); if (!L.ent) return false;
    p.indoor = { b: bi, f: 0 }; p.x = L.ent.in[0]; p.y = L.ent.in[1]; p.path = [];
    if (HOOKS.indoor) HOOKS.indoor(st, b, true);
    return true;
  }
  function exitBuilding(st) {
    const p = st.player; if (!p.indoor) return false; const b = W0.BUILDINGS[p.indoor.b], L = INT.layout(b);
    p.indoor = null; p.x = L.ent.out[0]; p.y = L.ent.out[1];
    if (HOOKS.indoor) HOOKS.indoor(st, b, false);
    return true;
  }
  const indoorL = o => o.indoor ? INT.layout(W0.BUILDINGS[o.indoor.b]) : null;
  const opaqueM = (x, y) => { const v = tileAt(Math.floor(x / TS), Math.floor(y / TS)); return v === T.BLD || v === T.TREE || v === T.CLIFF; };
  const solidM = (x, y) => { const v = tileAt(Math.floor(x / TS), Math.floor(y / TS)); return v === T.BLD || v === T.FOUNT || v === T.TREE || v === T.CLIFF; };

  const PLACES = W0.PLACES;
  function nearestPlace(x, y) { let b = null, bd = 1e9; for (const p of Object.values(PLACES)) { const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; b = p; } } return b; }

  // corsie del traffico lungo le strade dell'isola
  const LANES = W0.lanes.map(l => { const cum = [0]; for (let k = 1; k < l.pts.length; k++) cum.push(cum[k - 1] + dist(l.pts[k - 1][0], l.pts[k - 1][1], l.pts[k][0], l.pts[k][1])); return { id: l.id, w: l.w, pts: l.pts, cum, L: cum[cum.length - 1], closed: l.closed }; });
  // incroci: ogni capo di corsia sa su quali altre strade si può proseguire
  LANES.forEach((A, i) => {
    A.conn = [[], []];
    [0, 1].forEach(e => {
      const P = e ? A.pts[A.pts.length - 1] : A.pts[0];
      LANES.forEach((B, j) => {
        if (j === i) return; let best = -1, bd = 1e9;
        for (let k = 0; k < B.pts.length; k++) { const d = dist(P[0], P[1], B.pts[k][0], B.pts[k][1]); if (d < bd) { bd = d; best = k; } }
        if (bd > Math.max(A.w, B.w) / 2 + 4) return;
        const sj = B.cum[best];
        if (sj > 4) A.conn[e].push({ j, s: sj, dir: -1 });
        if (sj < B.L - 4) A.conn[e].push({ j, s: sj, dir: 1 });
      });
    });
  });
  function laneAt(L, s) {
    s = L.closed ? ((s % L.L) + L.L) % L.L : clamp(s, 0, L.L);
    let lo = 0, hi = L.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= s) lo = m; else hi = m; }
    const a = L.pts[lo], b = L.pts[hi], seg = (L.cum[hi] - L.cum[lo]) || 1, t = (s - L.cum[lo]) / seg;
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  function lanePos(L, s, dir) { // corsia di destra rispetto al senso di marcia
    const p = laneAt(L, s), h = dir > 0 ? p.ang : p.ang + Math.PI, off = L.w / 4;
    return { x: p.x - Math.sin(h) * off, y: p.y + Math.cos(h) * off, ang: h };
  }
  function nearestLane(x, y, minD, maxD) {
    let best = null, bd = 1e9;
    LANES.forEach((L, i) => { for (let s = 0; s < L.L; s += 6) { const p = laneAt(L, s), d = dist(p.x, p.y, x, y); if (d < minD || d > maxD) continue; const sc = Math.abs(d - (minD + maxD) / 2); if (sc < bd) { bd = sc; best = { i, s }; } } });
    return best;
  }
  // una casella libera vicino a un punto, fuori dalla carreggiata (per parcheggiare)
  function parkSpot(x, y, wantRoad) {
    const tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS);
    for (let r = 0; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = tx0 + dx, ty = ty0 + dy, v = tileAt(tx, ty); if (!walkT(tx, ty)) continue;
      if (!wantRoad && v === T.VIA) continue;
      let ok = true; for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1 && ok; i++) if (!walkT(tx + i, ty + j) || (!wantRoad && tileAt(tx + i, ty + j) === T.VIA)) ok = false;
      if (ok) return { x: tx * TS + TS / 2, y: ty * TS + TS / 2 };
    }
    return { x, y };
  }

  // A* con heap binario
  const PF = { gen: 0, cap: 70000 }, DX8 = [1, -1, 0, 0, 1, 1, -1, -1], DY8 = [0, 0, 1, -1, 1, -1, 1, -1];
  function findPath(sx, sy, gx, gy, roadCost) {
    const s = [clamp(Math.floor(sx / TS), 0, GW - 1), clamp(Math.floor(sy / TS), 0, GH - 1)];
    const g = [Math.floor(gx / TS), Math.floor(gy / TS)];
    if (!walkT(g[0], g[1])) return [];
    // buffer riusati fra una ricerca e l'altra: l'isola ha 160.000 caselle
    const N = GW * GH; if (!PF.came) { PF.came = new Int32Array(N); PF.cost = new Float32Array(N); PF.seen = new Uint32Array(N); PF.shut = new Uint32Array(N); }
    const gen = ++PF.gen, came = PF.came, cost = PF.cost, seen = PF.seen, shut = PF.shut;
    const C = i => seen[i] === gen ? cost[i] : 1e9;
    const si = s[1] * GW + s[0], gi = g[1] * GW + g[0];
    const heap = [], hf = [];
    const push = (n, f) => { heap.push(n); hf.push(f); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= hf[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hf[p], hf[i]] = [hf[i], hf[p]]; i = p; } };
    const pop = () => { const top = heap[0], lh = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lh; hf[0] = lf; let i = 0; for (; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; [hf[m], hf[i]] = [hf[i], hf[m]]; i = m; } } return top; };
    seen[si] = gen; cost[si] = 0; came[si] = -1; push(si, 0);
    const hx = g[0], hy = g[1]; let found = si === gi, steps = 0;
    while (heap.length && !found) {
      const cur = pop(); if (shut[cur] === gen) continue; shut[cur] = gen; if (cur === gi) { found = true; break; }
      if (++steps > PF.cap) break;
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (let k = 0; k < 8; k++) {
        const dx = DX8[k], dy = DY8[k];
        const nx = cx + dx, ny = cy + dy; if (!walkT(nx, ny)) continue;
        if (k >= 4 && (!walkT(cx + dx, cy) || !walkT(cx, cy + dy))) continue;
        const ni = ny * GW + nx; if (shut[ni] === gen) continue;
        const nc = cost[cur] + (k >= 4 ? 1.414 : 1) * (grid[ni] === T.VIA ? (roadCost || 1) : roadCost > 1.5 && grid[ni] !== T.WALK && grid[ni] !== T.PIAZZA ? 1.25 : 1);   // [inverno] a piedi si preferisce il marciapiede
        if (nc < C(ni)) { seen[ni] = gen; cost[ni] = nc; came[ni] = cur; push(ni, nc + Math.hypot(nx - hx, ny - hy) * 1.05); }
      }
    }
    if (!found) return [];
    const raw = []; let c = gi;
    while (c !== si && c !== -1) { raw.push({ x: (c % GW) * TS + TS / 2, y: ((c / GW) | 0) * TS + TS / 2 }); c = came[c]; }
    raw.reverse(); if (raw.length) raw[raw.length - 1] = { x: gx, y: gy }; else raw.push({ x: gx, y: gy });
    const out = []; let ax = sx, ay = sy, i = 0;
    // [passo] a piedi la scorciatoia non taglia la carreggiata: si raddrizza solo dentro i tratti dello stesso tipo
    // (marciapiede con marciapiede, strada con strada) e il tratto di strada resta quello scelto dalla ricerca: corto, dritto, dall'altra parte
    const ped = roadCost > 1.5, onRoad = q => grid[Math.floor(q.y / TS) * GW + Math.floor(q.x / TS)] === T.VIA;
    const lineOffRoad = (x0, y0, x1, y1) => { const d = dist(x0, y0, x1, y1), k = Math.ceil(d / .7); for (let m = 1; m < k; m++) { const x = x0 + (x1 - x0) * m / k, y = y0 + (y1 - y0) * m / k; if (grid[Math.floor(y / TS) * GW + Math.floor(x / TS)] === T.VIA) return false; } return true; };
    const cls = ped ? raw.map(onRoad) : null, startRoad = ped ? onRoad({ x: sx, y: sy }) : false;
    while (i < raw.length) {
      let j = raw.length - 1;
      if (ped) { const c0 = i ? cls[i - 1] : startRoad; let e = i; while (e + 1 < raw.length && cls[e + 1] === cls[i]) e++; if (cls[i] !== c0) e = i; j = e; }   // non oltre il cambio di tipo
      while (j > i && !(clearLine(ax, ay, raw[j].x, raw[j].y) && (!ped || cls[j] || lineOffRoad(ax, ay, raw[j].x, raw[j].y)))) j--;
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
    coltello: { name: 'Coltello', melee: true, rate: .45, dmg: 34, range: 1.7, slot: 6 },   // [azioni]
  };
  const VK = {
    vespa: { r: .6, len: 1.9, wid: .7, max: 12.5, accel: 9, turn: 3.3, hp: 60, label: 'Vespa', two: true },
    cinquecento: { r: .95, len: 3.0, wid: 1.4, max: 13, accel: 7, turn: 2.7, hp: 100, label: 'Fiat 500' },
    ritmo: { r: 1.05, len: 3.9, wid: 1.65, max: 16, accel: 8, turn: 2.4, hp: 120, label: 'Fiat Ritmo' },
    giulia: { r: 1.05, len: 4.1, wid: 1.6, max: 17, accel: 8.5, turn: 2.4, hp: 130, label: 'Alfa Giulia' },
    ape: { r: .9, len: 2.8, wid: 1.3, max: 9, accel: 5, turn: 2.8, hp: 70, label: 'Ape Piaggio' },
    polizia: { r: 1.05, len: 4.3, wid: 1.66, max: 18, accel: 9, turn: 2.5, hp: 160, label: 'Alfetta della Polizia' },
    furgone: { r: 1.15, len: 4.9, wid: 1.9, max: 13, accel: 6, turn: 2.1, hp: 170, label: 'Furgone', mesh: 'ritmo', scale: [1.15, 1.45, 1.25] },
    fuoristrada: { r: 1.1, len: 4.2, wid: 1.8, max: 15.5, accel: 8, turn: 2.4, hp: 190, label: 'Fuoristrada', mesh: 'giulia', scale: [1.12, 1.3, 1.02], offroad: true },
    camion: { r: 1.4, len: 5.9, wid: 2.1, max: 11, accel: 4.5, turn: 1.8, hp: 260, label: 'Camion', mesh: 'ritmo', scale: [1.27, 1.6, 1.5] },
    campagnola: { r: 1.1, len: 3.9, wid: 1.75, max: 15, accel: 8.5, turn: 2.5, hp: 210, label: 'Campagnola dei Grigi', mesh: 'cinquecento', scale: [1.25, 1.3, 1.3], military: true, offroad: true },
    blindato: { r: 1.45, len: 5.4, wid: 2.25, max: 12, accel: 5, turn: 1.9, hp: 480, label: 'Blindato della Guardia', mesh: 'ritmo', scale: [1.38, 1.55, 1.38], military: true, armor0: 3 },
    rx7: { r: 1.05, len: 4.3, wid: 1.7, max: 21, accel: 10.5, turn: 2.5, hp: 120, label: 'Mazda RX-7', mesh: 'giulia', glb: 'rx7' },
    gtr: { r: 1.08, len: 4.5, wid: 1.75, max: 22, accel: 11, turn: 2.5, hp: 130, label: 'Skyline GT-R', mesh: 'giulia', glb: 'gtr' },
    bursley: { r: 1.12, len: 4.9, wid: 1.9, max: 19, accel: 10, turn: 2.2, hp: 160, label: 'Bursley Defiance', mesh: 'giulia', glb: 'bursley' },
    // [costa] le barche: vanno solo per mare (boatM), scivolano di lato, girano poco da ferme
    gozzo: { r: 1.1, len: 5, wid: 1.75, max: 6.5, accel: 2, turn: 1.15, hp: 90, label: 'Gozzo', boat: true, art: 'il', m0: true },
    lancia: { r: 1.25, len: 6, wid: 2.1, max: 9, accel: 2.8, turn: 1.05, hp: 110, label: 'Lancia a motore', boat: true, art: 'la' },
    motoscafo: { r: 1.4, len: 7, wid: 2.4, max: 17, accel: 5, turn: 1.1, hp: 120, label: 'Motoscafo', boat: true, art: 'il', m0: true },
    // [bmx] la bici tascabile: si tira fuori con P quando vuoi e quando scendi torna in tasca. Niente motore, niente fari, non brucia.
    bmx: { r: .5, len: 1.5, wid: .6, max: 9, accel: 6, turn: 3.8, hp: 45, label: 'BMX', two: true, pocket: true },
  };
  // fisica: massa (kg) e aderenza laterale (m/s²). Vespa e Ape scivolano meno, le berline derapano.
  Object.assign(VK.vespa, { m: 150, grip: 24 }); Object.assign(VK.cinquecento, { m: 560, grip: 19 }); Object.assign(VK.ritmo, { m: 860, grip: 20 });
  Object.assign(VK.giulia, { m: 1050, grip: 21 }); Object.assign(VK.ape, { m: 420, grip: 15 }); Object.assign(VK.polizia, { m: 1150, grip: 22 });
  Object.assign(VK.furgone, { m: 1900, grip: 18 }); Object.assign(VK.fuoristrada, { m: 1600, grip: 24 }); Object.assign(VK.camion, { m: 3600, grip: 17 }); Object.assign(VK.campagnola, { m: 1500, grip: 23 }); Object.assign(VK.blindato, { m: 6200, grip: 21 });
  Object.assign(VK.gozzo, { m: 700, grip: 2.6 }); Object.assign(VK.lancia, { m: 950, grip: 2.8 }); Object.assign(VK.motoscafo, { m: 1200, grip: 3.4 });
  Object.assign(VK.bmx, { m: 95, grip: 23 }); Object.assign(VK.rx7, { m: 1250, grip: 22 }); Object.assign(VK.gtr, { m: 1400, grip: 23 }); Object.assign(VK.bursley, { m: 1600, grip: 19 });
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

  const SEV = { vandalismo: .35, scippo: .5, aggressione: .75, rapina: .85, furto_vespa: .6, furto_auto: .65, investimento: .7, corruzione: .4, lavoro: .4, spari: .88, ferimento: .95, omicidio: 1, esplosione: .95, molotov: .9 };
  const NOISE = { vandalismo: 8, scippo: 3, aggressione: 12, rapina: 22, furto_vespa: 10, furto_auto: 12, investimento: 14, corruzione: 2, lavoro: 0, spari: 34, ferimento: 34, omicidio: 34, esplosione: 70, molotov: 16 };
  const NEG = { vandalismo: 1, scippo: 1, aggressione: 1, rapina: 1, furto_vespa: 1, furto_auto: 1, investimento: 1, corruzione: 1, spari: 1, ferimento: 1, omicidio: 1, esplosione: 1, molotov: 1 };
  const LABEL = { vandalismo: 'Vetrina rotta', scippo: 'Scippo', aggressione: 'Aggressione', rapina: 'Rapina', furto_vespa: 'Furto di Vespa', furto_auto: 'Furto d\'auto', investimento: 'Investimento', corruzione: 'Corruzione', lavoro: 'Lavoro onesto', spari: 'Spari', ferimento: 'Ferimento', omicidio: 'Omicidio', esplosione: 'Esplosione', molotov: 'Molotov' };
  const ESCALATE = { scippo: 'aggressione', investimento: 'aggressione', ferimento: 'omicidio' };
  // agganci per i moduli esterni (Risacca): create, think, move, step, verb
  const HOOKS = {};

  // ---------------- STATO ----------------
  function create(seed) {
    restoreMap(); applyLayout();
    const rng = makeRng(seed || 1986);
    const st = {
      rng, t: START_T, clock: 0, nextId: 1, over: null, debt: DEBT, deadline: END_T, slowmo: 0, hitstop: 0, shake: 0,
      player: { x: 0, y: 0, face: -Math.PI / 2, money: 20, arrests: 0, vehicle: null, carrying: null, speed: 0, anim: 0, stun: 0, hp: 100, hurtT: -99, arms: { pugni: {} }, cur: 'pugni', cool: 0, reload: 0, bloom: 0, punch: 0, kills: 0 },
      npcs: [], vehicles: [], pickups: [], proj: [], fires: [], fx: [], sfx: [], wallHits: {}, facadeHits: {}, breaches: 0, rooms: [],
      events: [], log: [], feed: [], links: [], timers: [], chats: {}, job: null, jobCd: {}, lastSeen: null, chase: false, moments: [], robbed: {},
      hazards: [], shotEv: null, copKilled: false, reinf: null, reinfCd: 0, pendingEnd: null, hitMark: null, kick: null, panicAt: -99, drvN: 0,
    };
    const pl = st.player; { const q = parkSpot(PLACES.calata.x - 4, PLACES.calata.y, true); pl.x = q.x; pl.y = q.y; }
    CAST.forEach(c => st.npcs.push(makeNpc(st, JSON.parse(JSON.stringify(c)))));
    PASSANTI.forEach(([name, col], i) => {
      const home = ['stella', 'aurora', 'mare'][i % 3];
      const pick = () => PUBLIC[Math.floor(rng() * PUBLIC.length)];
      const sched = [[7, pick()], [10, pick()], [13, pick()], [16, pick()], [18, pick()], [20, pick()], [22, home]];
      const skins = ['#e6c2a2', '#c99a76', '#dcb08c', '#b8845e'];
      st.npcs.push(makeNpc(st, { id: 'p' + i, name, role: 'Abitante del quartiere', home, tr: { cor: .3 + rng() * .5, loq: .4 + rng() * .5, avid: .2 + rng() * .6, legge: .3 + rng() * .6 }, sched, passante: true,
        look: { skin: skins[i % 4], top: col, bottom: '#2a2a33', hair: ['#2a1d14', '#555', '#b58a58', '#111'][i % 4], hat: ['none', 'flat', 'long', 'none', 'bun', 'fedora'][i], hatCol: '#3a3a44', build: .9 + rng() * .3, extra: '' } }));
    });
    // veicoli parcheggiati vicino ai loro luoghi, fuori dalla carreggiata
    const V = (id, kind, place, dx, dy, ang, color, owner, extra) => { const pl = PLACES[place]; if (!pl) return; const q = parkSpot(pl.x + (dx || 0), pl.y + (dy || 0)); st.vehicles.push(makeVehicle(st, Object.assign({ id, kind, x: q.x, y: q.y, ang, color, owner }, extra || {}))); };
    V('v_beppe', 'vespa', 'officina', 2, 1, 0, '#e8d9a8', 'beppe');
    V('v_osteria', 'vespa', 'osteria', 3, 1, Math.PI, '#58b8a6', 'tonino');
    V('v_miramare', 'vespa', 'miramare', 3, 1, 0, '#d8473f', 'lucia');
    V('v_bar', 'vespa', 'bar', -3, 1, 0, '#8ab4e8', 'gino');
    V('v_sandro', 'bursley', 'magazzino', 5, 2, Math.PI / 2, '#16161c', 'sandro');
    V('v_ape', 'ape', 'calata', 6, 0, 0, '#7a9ab0', 'tonino');
    V('pk_benzina', 'cinquecento', 'benzina', 3, 2, 0, '#f4a6c0');
    V('pk_lido', 'vespa', 'spiaggia', -4, -3, 0, '#ff9ec7');
    V('pk_flamingo', 'ritmo', 'flamingo', 4, 2, 0, '#3cc7b8');
    V('pk_oceano', 'giulia', 'oceano', 4, 2, Math.PI, '#f2ead6');
    V('pk_miramare', 'rx7', 'miramare', -4, 2, 0, '#f2f2f2');
    V('pk_disco', 'gtr', 'disco', 4, 2, Math.PI, '#2a4ad8');
    V('pk_cantiere', 'ape', 'cantiere', 4, 2, Math.PI / 2, '#e8c35a');
    V('pk_cinema', 'vespa', 'cinema', 3, 1, Math.PI, '#b8e0ff');
    V('pk_camion', 'camion', 'cantiere', -8, 3, 0, '#c8642a');
    V('pk_furgone', 'furgone', 'magazzino', -6, 2, 0, '#e8e0d0');
    V('pk_masseria', 'fuoristrada', 'masseria', 4, 3, 0, '#5a6a3a');
    V('pk_sg', 'cinquecento', 'sangiacomo', 5, 3, 0, '#c8b040');
    V('gr_camp1', 'campagnola', 'commissariato', 4, 3, 0, '#5c6650', null, { military: true });
    V('gr_camp2', 'campagnola', 'rocca', -6, 4, 0, '#5c6650', null, { military: true });
    V('gr_blind', 'blindato', 'rocca', 8, 4, Math.PI / 2, '#4a5446', null, { military: true });
    V('gr_camp3', 'campagnola', 'poligono', 4, 2, 0, '#6a6a50', null, { military: true });
    // [costa] le barche che si possono prendere: i gozzi, le lance e i motoscafi ormeggiati ai pontili (World.SEA.moorings con drive)
    if (SEA) SEA.moorings.forEach((m, k) => { if (m.drive) st.vehicles.push(makeVehicle(st, { id: 'bt' + k, kind: m.kind, x: m.x, y: m.y, ang: m.ang, color: m.col || null, moored: m.at })); });
    // [arcipelago] chi vive sulle isole: i soldati delle basi della Tutela, i guerrieri della tribù, gli isolani dei villaggi.
    // Restano attorno al loro accampamento (sched: un posto solo); niente vita quotidiana (non hanno n.pop).
    if (SEA && SEA.camps) SEA.camps.forEach(C => {
      const SOLD = ['Brega', 'Ferri', 'Calò', 'Dessì', 'Manca', 'Orrù', 'Spano', 'Zedda'], TRIB = ['il Tatuato', 'Denti di Squalo', 'Mano Rossa', 'Occhio di Sale', 'la Corteccia', 'il Fumo', 'il Muto', 'la Lancia', 'il Vecchio', 'Pelle di Lucertola'], ISOL = ['Nanni', 'Peppa', 'Tore', 'Mimmia', 'Bastiano', 'Rina'];
      for (let k = 0; k < C.n; k++) {
        const base = C.type === 'base', trib = C.type === 'tribu', skin = ['#d8b08a', '#c49a74', '#a87a56', '#8a5e3e', '#e2c2a2'][(k * 3 + C.id.length) % 5];
        const c = base ? { name: 'Soldato ' + SOLD[k % SOLD.length], role: 'Soldato della Tutela, di guardia all\'' + C.name.toLowerCase().replace(/^(presidio|batteria|stazione)/, m => m), weapon: k % 3 === 2 ? 'pistola' : 'mitra', hp: 80, look: { skin, top: '#4e5640', bottom: '#3c4232', hair: '#1e1a16', hat: 'beanie', hatCol: '#3c4232', build: 1.05, extra: '' } }
          : trib ? { name: TRIB[k % TRIB.length][0].toUpperCase() + TRIB[k % TRIB.length].slice(1), role: 'Guerriero della tribù dell\'Isola Grande del Sud (dicono che mangino gli uomini)', weapon: 'coltello', hp: 70, look: { skin, top: k % 2 ? '#7a4a2a' : '#a86a3a', bottom: '#4a3420', hair: '#141008', hat: 'none', build: 1.1, extra: '' } }
          : { name: ISOL[k % ISOL.length] + ' dell\'isola', role: 'Isolano di ' + C.name, hp: 50, look: { skin, top: ['#c8b890', '#7a9ab0', '#b86a4a'][k % 3], bottom: '#3a3a44', hair: '#2a2018', hat: k % 2 ? 'flat' : 'none', hatCol: '#5a4a3a', build: .95, extra: '' } };
        const n = makeNpc(st, Object.assign({ id: 'isola_' + C.id + '_' + k, home: C.place, tr: { cor: base ? .7 : trib ? .9 : .3, loq: .3, avid: .3, legge: base ? 1 : 0 }, sched: [[0, C.place]], faction: C.faction || undefined, passante: !C.faction }, c));
        const a = k / C.n * 6.283, pl = PLACES[C.place]; n.x = pl.x + Math.cos(a) * 3; n.y = pl.y + Math.sin(a) * 3; if (!walkM(n.x, n.y)) { n.x = pl.x; n.y = pl.y; }
        n.camp = C; n.isola = true; st.npcs.push(n);
      }
    });
    // traffico lungo le strade dell'isola, nei due sensi di marcia
    const TR = [['rx7', '#e8e8e8'], ['cinquecento', '#f3c6d4'], ['ritmo', '#b8302a'], ['bursley', '#c87a20'], ['giulia', '#2f4a3a'], ['cinquecento', '#6ab8c8'], ['ritmo', '#f2e2a0'], ['giulia', '#efe6d2'], ['ritmo', '#7fd0b0'], ['cinquecento', '#d86a4a'], ['furgone', '#d8d0c0'], ['ape', '#9ab07a'], ['camion', '#3a6a9a'], ['ritmo', '#c8c8d0']];
    const laneIx = id => Math.max(0, LANES.findIndex(l => l.id === id));
    const plan = [['litoranea', .02, 1], ['litoranea', .14, -1], ['litoranea', .3, 1], ['litoranea', .45, -1], ['litoranea', .61, 1], ['litoranea', .77, -1], ['litoranea', .9, 1], ['monte', .3, 1], ['macchia', .5, -1], ['deserto', .4, 1], ['porto', .5, -1], ['nord', .4, 1]];
    plan.forEach(([lid, f, dir], i) => {
      const L = LANES[laneIx(lid)], s = L.L * f, q = lanePos(L, s, dir), [kind, color] = TR[i % TR.length];
      st.vehicles.push(makeVehicle(st, { id: 'tr' + i, kind, x: q.x, y: q.y, ang: q.ang, color, traffic: true, dir, lane: { i: laneIx(lid), s, dir }, speed: 6, driverLook: DRIVER_LOOKS[i % DRIVER_LOOKS.length] }));
    });
    // oggetti da raccogliere
    const P = (kind, place, dx, dy, extra) => { const pl = PLACES[place]; if (!pl) return; const q = parkSpot(pl.x + dx, pl.y + dy, true); st.pickups.push(Object.assign({ id: st.nextId++, kind, x: q.x, y: q.y, takenAt: null, respawn: null }, extra || {})); };
    P('pistola', 'molo', 0, 2, { ammo: 30, respawn: 240 });
    P('lupara', 'magazzino', -4, 3, { ammo: 10, respawn: 300 });
    P('molotov', 'vico', 2, 2, { ammo: 3, respawn: 180 });
    P('munizioni', 'cantiere', 3, 3, { ammo: 30, respawn: 150 });
    P('salute', 'ambulatorio', 2, 2, { respawn: 120 });
    P('salute', 'sangiacomo', 2, 2, { respawn: 150 });
    P('valigetta', 'pontile', 0, 3, { amount: 200, nightOnly: true });
    placeHazards(st);
    addLog(st, 'Porto Vecchio, 1986. Sei fuori da ieri. Lo Squalo rivuole i suoi 500.000 lire entro l\'alba di giovedì.', 'info');
    if (HOOKS.create) HOOKS.create(st);
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
  function canSee(st, n, x, y, k) {
    if (n.dead || n.inside || n.stun > 0 || n.jailedUntil > st.t) return false;
    const d = dist(n.x, n.y, x, y);
    if (d > visionRange(st) * (k || 1)) return false;
    if (d > 2.2 && Math.abs(angDiff(Math.atan2(y - n.y, x - n.x), n.face)) > 1.15) return false;
    return los(n.x, n.y, x, y);
  }
  const seesPlayer = (st, n) => !st.player.indoor && !(st.player.lv && st.player.lv.k === 'ug') && canSee(st, n, st.player.x, st.player.y, st.player.sneak && !st.player.vehicle ? .5 : 1); // strisciando ti vedono solo da vicino
  function seesPlayerCombat(st, n) { // in combattimento si guarda intorno
    if (n.dead || n.inside || n.stun > 0 || st.player.indoor) return false;
    const d = dist(n.x, n.y, st.player.x, st.player.y);
    if (n.camp && n.aggro && d < 24) return true;   // [arcipelago] sulle isole, una volta scoperto, ti seguono anche a orecchio (giungla e capanne non nascondono)
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
        if (noticed) addMemory(st, n, Object.assign(base, { actor: ev.actor || 'player', conf: .95, source: 'visto' }));
        else st.timers.push({ at: st.t + 20, kind: 'discover', npc: n.id, ev: ev.id });
      } else addMemory(st, n, Object.assign(base, { actor: ev.actor || 'player', conf: 1, source: 'visto' }));
      return;
    }
    const other = ev.actor && ev.actor !== 'player';
    if (other && n.id === ev.actor) return;
    if (canSee(st, n, ev.x, ev.y) && (other || seesPlayer(st, n))) {
      addMemory(st, n, Object.assign(base, { actor: ev.actor || 'player', conf: isNight(st) ? .82 : .95, source: 'visto' }));
      if (NEG[ev.type] && spotlight) spotlight.push(n);
    } else if (dist(n.x, n.y, ev.x, ev.y) <= ev.noise && ev.noise >= 8) {
      addMemory(st, n, Object.assign(base, { actor: 'ignoto', conf: .45, source: 'sentito' }));
      n.face = Math.atan2(ev.y - n.y, ev.x - n.x);
      st.timers.push({ atClock: st.clock + .8, kind: 'glance', npc: n.id, ev: ev.id });
    }
  }

  function emit(st, type, extra) {
    const p = st.player;
    const ev = Object.assign({ id: st.nextId++, type, actor: 'player', target: null, x: p.x, y: p.y, t: st.t, sev: SEV[type], noise: NOISE[type] * (p.sneak && !p.vehicle ? .4 : 1) }, extra || {});
    ev.place = nearestPlace(ev.x, ev.y).name;
    st.events.unshift(ev); if (st.events.length > 60) st.events.pop();
    const spot = [];
    st.npcs.forEach(n => perceive(st, n, ev, spot));
    const quiet = st.clock - (st.lastMomentAt || -99) < 14 || st.clock - (st.lastShotAt || -99) < 4;
    if (NEG[ev.type] && ev.type !== 'corruzione' && ev.type !== 'spari' && !quiet && ev.actor === 'player') {
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
      // [passo] chi sta già scappando continua; gli altri prima si fermano, si girano a guardare, poi reagiscono (ognuno coi suoi tempi)
      if (n.panic > 0) { n.panic = Math.max(n.panic, secs * (1.2 - n.tr.cor * .5)); n.fleeFrom = { x, y }; return; }
      if (n.alarm && n.alarm.react > st.clock) return;
      n.alarm = { x, y, d, r, secs, t0: st.clock, react: st.clock + .3 + st.rng() * .55 + (1 - n.tr.cor) * .25 + d / 70 };
    });
  }
  // [passo] il momento fra il rumore e la reazione: fermo, la testa e poi il corpo verso il rumore; poi si scappa, o (chi ha
  // coraggio ed è lontano) si resta a guardare
  function alarmStep(st, n, dt) {
    const A = n.alarm; if (!A) return false;
    const look = Math.atan2(A.y - n.y, A.x - n.x);
    if (st.clock < A.react) { n.speedNow = 0; n.face += angDiff(look, n.face) * Math.min(1, dt * (st.clock - A.t0 > .25 ? 7 : 2)); return true; }
    n.alarm = null;
    if (n.tr.cor > .72 && A.d > A.r * .5 && st.rng() < .6) { n.wait = 1.5 + st.rng() * 2; n.face = look; if (st.clock > n.barkCd) { say(st, n, ['Che succede laggiù?', 'Ma cosa…', 'Hai sentito?'][Math.floor(st.rng() * 3)], 2); n.barkCd = st.clock + 4; } return false; }
    if (st.clock > n.barkCd) say(st, n, ['Sparano!', 'Aiuto!', 'Tutti giù!', 'Madonna santa!', 'Scappate!'][Math.floor(st.rng() * 5)], 2);
    n.panic = Math.max(n.panic, A.secs * (1.2 - n.tr.cor * .5)); n.fleeFrom = { x: A.x, y: A.y }; n.path = [];
    return false;
  }

  // ---------------- FAZIONI E POLIZIA ----------------
  function aggroFaction(st, f) {
    let first = false;
    st.npcs.forEach(n => { if (n.faction === f && !n.dead && !n.aggro) { n.aggro = true; first = true; n.inside = false; if (n.action.name === 'dentro') n.action.name = 'routine'; } });
    if (first) {
      if (f === 'squalo') { feed(st, 'Gli uomini dello Squalo ti danno la caccia.', 'bad'); addLog(st, `${clockStr(st.t)} · Gli uomini dello Squalo ti danno la caccia.`, 'bad'); }
      if (f === 'marsiglia') { feed(st, 'I Marsigliesi aprono il fuoco.', 'bad'); }
      if (f === 'isola:tribu') { feed(st, 'La tribù ti ha visto: arrivano coi coltelli.', 'bad'); addLog(st, `${clockStr(st.t)} · Sull'Isola Grande del Sud la tribù ti dà la caccia.`, 'bad'); }
      else if (f.startsWith('isola:')) { feed(st, 'I soldati della Tutela aprono il fuoco.', 'bad'); addLog(st, `${clockStr(st.t)} · Ti hanno sparato i soldati della base sull'isola.`, 'bad'); }
    }
  }
  function hostile(st, n) {
    if (n.dead || n.jailedUntil > st.t) return false;
    if (n.cop) return wantedLevel(st) >= 2;
    if (n.faction === 'squalo') { const s = byId(st, 'sandro'); return n.aggro || n.framedAngry || (s && s.framedAngry) || (s && s.dead); }
    if (n.faction === 'marsiglia') return n.aggro;
    if (n.faction && n.faction.startsWith('isola:')) return n.aggro;   // [arcipelago] soldati delle basi e guerrieri della tribù
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
  function vehicleName(st, v) { if (v.kind === 'bmx') return 'la BMX'; if (VK[v.kind].art) return `${VK[v.kind].art} ${VK[v.kind].label.toLowerCase()}${v.owner ? ' di ' + nameOf(st, v.owner) : ''}`; if (v.kind === 'vespa') return `la Vespa${v.owner ? ' di ' + nameOf(st, v.owner) : ''}`; return `la ${VK[v.kind].label}${v.owner ? ' di ' + nameOf(st, v.owner) : ''}`; }
  function context(st) {
    const p = st.player, out = [];
    if (st.over) return out;
    if (p.vehicle) { const v = st.vehicles.find(k => k.id === p.vehicle); out.push({ key: 'F', label: v.kind === 'bmx' ? 'Scendi dalla BMX (torna in tasca)' : v.kind === 'vespa' ? 'Scendi dalla Vespa' : VK[v.kind].boat ? 'Scendi dalla barca' : 'Scendi dall\'auto' }); return out; }
    const n = nearestNpc(st, 2.2), v = nearestVehicle(st, 1.8), sk = shopkeeperHere(st);
    if (n) out.push({ key: 'T', label: `Parla con ${n.first}` });
    if (sk) out.push({ key: 'E', label: `Rapina ${PLACES[sk.shop].name}`, bad: true });
    else if (n && !n.cop && !n.faction) out.push({ key: 'E', label: `Scippa ${n.first}`, bad: true });
    if (v) out.push({ key: 'F', label: v.lent ? 'Sali sulla Vespa di Beppe' : v.mine && VK[v.kind].boat ? `Sali sul${VK[v.kind].m0 ? '' : 'la'} ${VK[v.kind].label.toLowerCase()}` : v.traffic ? `Tira giù l'automobilista (${VK[v.kind].label})` : `Ruba ${vehicleName(st, v)}`, bad: !v.lent && !v.mine });
    return out;
  }

  function exitVehicle(st) {
    const p = st.player, v = st.vehicles.find(k => k.id === p.vehicle); if (!v) { p.vehicle = null; return; }
    if (Math.abs(v.speed) > 7 && !VK[v.kind].pocket) { p.stun = .7; damagePlayer(st, 12, v.ang + Math.PI, 'caduta'); }
    v.rider = null; p.vehicle = null;
    const r = VK[v.kind].r + .6;
    if (VK[v.kind].boat) {   // [costa] dalla barca si scende sul pontile o sulla riva più vicina; se non c'è, si finisce in acqua
      const K = VK[v.kind], ext = a => Math.abs(Math.cos(a - v.ang)) * K.len / 2 + Math.abs(Math.sin(a - v.ang)) * K.wid / 2; let done = false;
      for (let rr = .5; rr < 4.6 && !done; rr += .5) for (let k = 0; k < 16 && !done; k++) { const a = v.ang + k / 16 * Math.PI * 2, x = v.x + Math.cos(a) * (ext(a) + rr), y = v.y + Math.sin(a) * (ext(a) + rr); if (walkM(x, y)) { p.x = x; p.y = y; done = true; } }
      if (!done) { p.x = v.x + Math.cos(v.ang + Math.PI / 2) * (VK[v.kind].wid / 2 + .7); p.y = v.y + Math.sin(v.ang + Math.PI / 2) * (VK[v.kind].wid / 2 + .7); p.swim = true; }
    } else
    for (const off of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) { const x = v.x + Math.cos(v.ang + off) * r, y = v.y + Math.sin(v.ang + off) * r; if (walkM(x, y)) { p.x = x; p.y = y; break; } }
    scaleVel(v, .3);
    if (VK[v.kind].pocket) st.vehicles = st.vehicles.filter(k => k !== v);   // [bmx] la pieghi e la rimetti in tasca
  }
  // [bmx] P: tira fuori la BMX dalla tasca e ci salti sopra; se ci sei già, scendi e la rimetti in tasca
  function bmx(st) {
    const p = st.player;
    if (st.over || p.stun > 0) return { ok: false };
    if (p.vehicle) { const v = st.vehicles.find(k => k.id === p.vehicle); if (v && v.kind === 'bmx') { exitVehicle(st); return { ok: true, msg: 'Pieghi la BMX e te la rimetti in tasca.' }; } return { ok: false, msg: 'Prima scendi da qui.' }; }
    if (p.indoor) return { ok: false, msg: 'Al chiuso la BMX resta in tasca.' };
    if (p.lv) return { ok: false, msg: 'Qui non c\'è spazio per pedalare.' };
    if (p.swim) return { ok: false, msg: 'In acqua? La BMX resta in tasca.' };
    if (p.carrying) return { ok: false, msg: 'Hai le mani occupate.' };
    if (!walkM(p.x, p.y)) return { ok: false, msg: 'Qui non ci stai, con la BMX.' };
    st.vehicles = st.vehicles.filter(k => k.kind !== 'bmx');
    const v = makeVehicle(st, { id: 'bmx', kind: 'bmx', x: p.x, y: p.y, ang: p.face, color: '#f0e2a8', mine: true, rider: 'player' });
    st.vehicles.push(v); p.vehicle = v.id; p.path = [];
    return { ok: true, msg: 'Tiri fuori la BMX dalla tasca e ci salti sopra.' };
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
        if (VK[v.kind].boat) { const nm = vehicleName(st, v); return { ok: true, msg: `Sciogli la cima e tiri l'avviamento. ${nm[0].toUpperCase() + nm.slice(1)} è ${VK[v.kind].m0 ? 'tuo' : 'tua'}, per ora.` }; }   // [costa]
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
        st.sfx.push({ k: 'cash' });
        return { ok: true, msg: `${sk.first} ti riempie il sacchetto con le mani che tremano. +${gain}.000 lire.` };
      }
      const tg = nearestNpc(st, 1.8); if (!tg || tg.cop || tg.faction) return { ok: false, msg: 'Nessuno a portata di mano.' };
      const gain = st.t - (tg.robbedAt || -999) < 180 ? 0 : 15 + Math.floor(rng() * 30); tg.robbedAt = st.t; p.money += gain;
      const ev = emit(st, 'scippo', { target: tg.id });
      addLog(st, `${clockStr(st.t)} · Hai scippato ${tg.name} (+${gain}.000 lire).`, 'bad', ev.id);
      if (gain) st.sfx.push({ k: 'cash' });
      return { ok: true, msg: gain ? `Il portafoglio di ${tg.first}: ${gain}.000 lire.` : `${tg.first} non ha più niente addosso.` };
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
    if (id !== p.cur) { p.cur = id; p.reload = 0; p.cool = Math.max(p.cool, .15); st.sfx.push({ k: 'switch' }); }
    return true;
  }
  // [cantiere] le armi del giocatore con le modifiche del banco delle armi
  const pW = (st, k) => (HOOKS.playerWeapon ? HOOKS.playerWeapon(st, k, WEAPONS[k]) : WEAPONS[k]);
  function reload(st) {
    const p = st.player, W = pW(st, p.cur), a = p.arms[p.cur];
    if (!W.mag || W.throw || p.reload > 0 || a.mag >= W.mag || a.reserve <= 0) return false;
    p.reload = W.reload; st.sfx.push({ k: 'reload', w: p.cur }); return true;
  }
  // il giocatore preme il grilletto
  function fire(st, aim, aimPoint, pressed) {
    const p = st.player;
    if (st.over || p.stun > 0 || p.cool > 0 || p.reload > 0) return false;
    if (p.swim && !p.vehicle) return false;   // [costa] a nuoto non si spara
    const W = pW(st, p.cur), a = p.arms[p.cur];
    if (!W.auto && !pressed && !W.melee) return false;
    if (W.melee) {
      if (p.vehicle) return false;
      p.cool = W.rate; p.punch = .25; st.sfx.push({ k: 'swing' });
      let best = null, bd = W.range;
      st.npcs.forEach(n => { if (n.dead || n.inside) return; const d = dist(n.x, n.y, p.x, p.y); if (d < bd && Math.abs(angDiff(Math.atan2(n.y - p.y, n.x - p.x), aim)) < 1.0) { bd = d; best = n; } });
      if (best) {
        st.sfx.push({ k: 'punch' }); st.fx.push({ k: 'hitpuff', x: best.x, y: best.y });
        best.stun = Math.max(best.stun, 1.1);
        const firstHit = st.clock - (best.lastPunched || -99) > 6; best.lastPunched = st.clock;
        damage(st, best, W.dmg, 'player', aim, 'pugni');
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
    const spread = W.spread + p.bloom + moving;
    shoot(st, p, p.cur, aim, spread, 'player');
    p.bloom = Math.min(.18, p.bloom + W.bloom);
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
    const W = who === 'player' ? pW(st, wid) : WEAPONS[wid];
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
        { const hz = hazardAt(st, x, y, .45); if (hz) { hit = hz; hitKind = 'hazard'; found = true; } }
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
      else if (hitKind === 'hazard') { st.fx.push({ k: 'metal', x: hx, y: hy, a }); hurtHazard(st, hit, dmg, who); }
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
      st.player.kills++;
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
    if (p.armor) dmg *= 1 - p.armor;   // [guardaroba] giubbotto, elmetto, paraspalle
    p.hp -= dmg; p.hurtT = st.clock; p.lastHurtBy = src; st.shake = Math.max(st.shake, .18);
    st.fx.push({ k: 'hurt', a: ang }); st.sfx.push({ k: 'hurt' });
    if (p.hp <= 0) wasted(st);
  }
  function damageVehicle(st, v, dmg, by) {
    if (v.wreck) return;
    dmg *= 1 - Math.min(.8, ((v.armor || 0) + (VK[v.kind].armor0 || 0) * (v.armor === undefined ? 1 : 0)) * .22); // le lamiere saldate reggono i colpi
    v.hp -= dmg; if (by) v.lastHitBy = by;
    if (v.traffic) { v.panicT = st.clock; }
    if (VK[v.kind].pocket) { if (v.hp <= 0) { v.hp = VK[v.kind].hp; if (v.rider === 'player') { exitVehicle(st); st.player.stun = .6; feed(st, 'Voli giù dalla BMX. Per fortuna si raddrizza: è di nuovo in tasca.', 'bad'); } } return; }   // [bmx] non brucia: ti butta giù e torna in tasca
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
    p.money -= fee; p.hp = 100; p.arms = { pugni: {} }; p.cur = 'pugni'; p.carrying = null; p.stun = 0;
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
      case 'vandalismo': return 'ha rotto una vetrina a sassate';   // [trame]
    }
    return (HOOKS.verb && HOOKS.verb(st, m, T)) || 'ha fatto qualcosa';
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
    if (choice === 'ferro') {
      const has = !!p.arms.pistola;
      if (!arg) return { lines: [has ? 'Vuoi colpi? Venti la scatola.' : 'Una Beretta pulita, mai usata. Sessanta. I colpi a parte.'], opts: [has ? { id: 'ferro', arg: { buy: 'munizioni' }, label: 'Scatola di colpi (20.000 lire)' } : { id: 'ferro', arg: { buy: 'pistola' }, label: 'Prendo la Beretta con 30 colpi (60.000 lire)' }, { id: 'ferro', arg: { buy: 'molotov' }, label: 'Tre bottiglie «speciali» (30.000 lire)' }, { id: 'ciao', label: 'Ci penso.' }] };
      const price = { pistola: 60, munizioni: 20, molotov: 30 }[arg.buy];
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
      if (VK[v.kind].pocket) { feed(st, 'Sandro: «Una bicicletta? Mi prendi in giro? Portami una macchina.»', 'bad'); return; }   // [bmx]
      const pay = v.kind === 'vespa' ? 100 : v.kind === 'polizia' ? 250 : 160;
      v.rider = null; v.hidden = true; p.vehicle = null; p.x = tg.x; p.y = tg.y;
      p.money += pay; feed(st, `+${pay}.000 lire. Sandro fa sparire ${v.kind === 'vespa' ? 'la Vespa' : 'la macchina'}.`, 'money'); st.sfx.push({ k: 'cash' });
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
      feed(st, `+${j.pay}.000 lire. ${giver.first} ti deve un favore.`, 'money');
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
      if (k.kind === 'salute' && p.hp >= 100) return;
      k.takenAt = st.t;
      if (WEAPONS[k.kind]) { const had = !!p.arms[k.kind]; giveWeapon(st, k.kind, k.ammo); if (!had) switchWeapon(st, k.kind); feed(st, `${had ? 'Munizioni' : 'Hai trovato'}: ${PICKUP_LABEL[k.kind]}${k.kind === 'molotov' ? ` ×${k.ammo}` : ''}`, 'job'); }
      else if (k.kind === 'munizioni') { const w = p.arms.mitra ? 'mitra' : p.arms.pistola ? 'pistola' : p.arms.lupara ? 'lupara' : null; if (!w) { k.takenAt = null; return; } p.arms[w].reserve += w === 'lupara' ? 8 : k.ammo; feed(st, `Munizioni per ${WEAPONS[w].name}`, 'job'); }
      else if (k.kind === 'salute') { p.hp = 100; feed(st, 'Ti sei medicato.', 'good'); }
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
    // [arcipelago]
    'isola:tribu': ['Uuh-ah! Uuh-ah!', 'Carne fresca!', 'Circondatelo!', 'Il fuoco è acceso!'],
    tutela_isola: ['Fuoco! Fuoco!', 'Intruso nella zona militare!', 'Copritemi!', 'Non farlo scappare!'],
  };
  const barksOf = n => COMBAT_BARKS[n.cop ? 'cop' : n.faction] || (n.faction && n.faction.startsWith('isola:') ? COMBAT_BARKS.tutela_isola : COMBAT_BARKS.squalo);
  function think(st, n) {
    if (n.dead) return;
    opinions(st, n);
    if (n.jailedUntil > st.t) { n.action = { name: 'in cella', scores: [], why: 'È al commissariato per un fermo.' }; return; }
    if (n.jailedUntil && n.jailedUntil <= st.t) { n.jailedUntil = 0; n.inside = false; }
    if (HOOKS.think && HOOKS.think(st, n)) return;
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
    // [arcipelago] le basi della Tutela avvisano e poi sparano; la tribù attacca chi entra nel villaggio o si fa vedere da vicino.
    // Se ti allontani molto dall'isola, si calmano.
    if (n.camp && n.faction) { const C = n.camp, dc = dist(p.x, p.y, C.x, C.y);
      if (!n.aggro && C.type === 'tribu' && (dc < C.r + 4 || (sees && d < 15))) { aggroFaction(st, n.faction); say(st, n, ['Uuh-ah! Uuh-ah!', 'Carne fresca!', 'Prendetelo!'][Math.floor(st.rng() * 3)], 3); }
      if (!n.aggro && C.type === 'base' && dc < C.r + 34 && ((sees && d < 32) || d < 12 || dc < C.r + 8)) {   // nella base ti scoprono comunque: ci sono le sentinelle
        if (!n.warned) { n.warned = true; n.warnT = st.clock; n.face = Math.atan2(p.y - n.y, p.x - n.x); say(st, n, 'Zona militare della Tutela! Torna indietro!', 3); }
        else if (dc < C.r * .7 || st.clock - n.warnT > 9) aggroFaction(st, n.faction); }
      if (n.aggro && dc > C.r + 150) { n.aggro = false; n.warned = false; } }
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
    if (best.name !== cur) { n.path = []; n.wait = 0; n.goalPlace = null; if (best.name === 'combatte') { n.react = 0; if (st.clock > n.barkCd) say(st, n, barksOf(n)[Math.floor(st.rng() * 4)], 2.2); } }
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
  function goTo(n, x, y, roadCost) { n.path = findPath(n.x, n.y, x, y, roadCost || 3.2); n.goal = { x, y }; }
  // [passo] si cammina come le persone: ognuno col suo passo e il suo lato (si tiene la destra), le svolte si arrotondano,
  // in curva si rallenta un po'. Il corpo segue la direzione con un poco di ritardo, non scatta.
  const pHash = n => { if (n.__ph === undefined) { let h = 7; const s0 = String(n.id); for (let i = 0; i < s0.length; i++) h = (h * 31 + s0.charCodeAt(i)) % 10007; n.__ph = h / 10007; } return n.__ph; };
  function stepAlong(n, speed, dt, keepFace) {
    n.speedNow = 0;
    if (!n.path.length) return true;
    const h = pHash(n), last = n.path.length === 1;
    // [passo] chi era fermo da un po' e riparte: un attimo per guardare dove va e girarsi, poi si incammina (chi corre no)
    if (speed < 2.5 && !keepFace) {
      if ((n.__still || 0) > 1.5 && !n.__dep) n.__dep = .35 + h * .5;
      if (n.__dep > 0) { const w0 = n.path[0]; n.__dep -= dt; n.__still = 0; n.face += angDiff(Math.atan2(w0.y - n.y, w0.x - n.x), n.face) * Math.min(1, dt * (n.__dep < .25 ? 7 : 1.5)); n.__hd = n.face; if (n.__dep > 0) return false; }
    }
    n.__dep = 0; n.__still = 0;
    speed *= .9 + h * .2;
    // vicino a una svolta si punta già al punto dopo (se lo spigolo è libero)
    if (!last && Math.hypot(n.path[0].x - n.x, n.path[0].y - n.y) < .7 && walkM((n.x + n.path[1].x) / 2, (n.y + n.path[1].y) / 2)) n.path.shift();
    let w = n.path[0];
    // il suo lato: un po' a destra della linea, mai sull'ultimo punto (lì ci deve arrivare)
    if (n.path.length > 1 && !keepFace) {
      const nx2 = n.path[1].x - w.x, ny2 = n.path[1].y - w.y, L = Math.hypot(nx2, ny2) || 1, off = .12 + h * .35;
      const ox = w.x - ny2 / L * off, oy = w.y + nx2 / L * off; if (walkM(ox, oy)) w = { x: ox, y: oy };
    }
    const dx = w.x - n.x, dy = w.y - n.y, d = Math.hypot(dx, dy);
    if (d < 1e-3) { n.path.shift(); return !n.path.length; }
    const ta = Math.atan2(dy, dx);
    // la direzione di marcia gira con un limite (più svelta per chi corre); con una svolta stretta si rallenta
    if (n.__hd === undefined || !isFinite(n.__hd)) n.__hd = ta;
    const turn = angDiff(ta, n.__hd), maxT = (5 + speed * 1.5) * dt;
    n.__hd += Math.max(-maxT, Math.min(maxT, turn));
    const slow = Math.max(.35, Math.cos(Math.min(Math.PI / 2, Math.abs(angDiff(ta, n.__hd))))), s = speed * slow * dt;
    if (!keepFace) n.face += angDiff(n.__hd, n.face) * Math.min(1, dt * 8);
    n.speedNow = speed * slow;
    if (d <= Math.max(s, .12)) { const q = n.path.shift(); n.x = q === w ? w.x : n.x + dx; n.y = q === w ? w.y : n.y + dy; if (!n.path.length) { n.x = q.x; n.y = q.y; } return !n.path.length; }
    // si va nella direzione di marcia; se non si può (un muro) si va dritti al punto
    const mx = Math.cos(n.__hd) * s, my = Math.sin(n.__hd) * s;
    if (walkM(n.x + mx, n.y + my)) { n.x += mx; n.y += my; } else { n.x += dx / d * s; n.y += dy / d * s; n.__hd = ta; }
    return false;
  }
  // [passo] chi cammina vicino al giocatore non passa attraverso gli altri: ci si scansa (appena, ognuno la sua metà)
  function separate(st) {
    const p = st.player, cell = {}, L = [];
    for (const n of st.npcs) { if (n.dead || n.inside || n.room || n.stun > 0 || (n.pop && !n.pop.near) || Math.abs(n.x - p.x) > 60 || Math.abs(n.y - p.y) > 60) continue; const k = Math.floor(n.x / 1.2) + ',' + Math.floor(n.y / 1.2); (cell[k] = cell[k] || []).push(n); L.push(n); }
    for (const n of L) {
      const cx = Math.floor(n.x / 1.2), cy = Math.floor(n.y / 1.2);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const C = cell[(cx + ox) + ',' + (cy + oy)]; if (!C) continue;
        for (const k of C) { if (k === n || k.id < n.id) continue; const dx = k.x - n.x, dy = k.y - n.y, d = Math.hypot(dx, dy), R = .62; if (d >= R || d < 1e-4) continue;
          const push = (R - d) / 2, ux = dx / d, uy = dy / d, a = (n.speedNow > .3 ? .5 : .3), b = (k.speedNow > .3 ? .5 : .3);
          if (walkM(n.x - ux * push * a, n.y - uy * push * a)) { n.x -= ux * push * a; n.y -= uy * push * a; }
          if (walkM(k.x + ux * push * b, k.y + uy * push * b)) { k.x += ux * push * b; k.y += uy * push * b; } } }
    }
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
    if (n.alarm && !n.inside && alarmStep(st, n, dt)) return;   // [passo]
    if (!(n.speedNow > .3)) n.__still = (n.__still || 0) + dt;   // [passo] da quanto è fermo (per la partenza)
    if (n.jailedUntil > st.t) { n.x = PLACES.commissariato.x; n.y = PLACES.commissariato.y - 1; n.inside = true; return; }
    const a = n.action.name, p = st.player;
    if (HOOKS.move && HOOKS.move(st, n, dt, a)) return;
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
    if (W.melee && seeC) {   // [arcipelago] col coltello: si corre addosso (aggirando capanne e alberi), si colpisce da vicino
      const ang = Math.atan2(p.y - n.y, p.x - n.x); n.face = ang; n.mcool = (n.mcool || 0) - dt;
      const busy = st.npcs.filter(k => k !== n && k.camp === n.camp && !k.dead && k.aggro && dist(k.x, k.y, p.x, p.y) < 1.7).length;
      if (busy >= 2 && d < 4.5) { const sa = ang + Math.PI / 2 * (pHash(n) < .5 ? 1 : -1), sx = n.x + Math.cos(sa) * 1.6 * dt, sy = n.y + Math.sin(sa) * 1.6 * dt; if (walkM(sx, sy)) { n.x = sx; n.y = sy; n.speedNow = 1.6; } if (d < 3) { const bx = n.x - Math.cos(ang) * 1.5 * dt, by = n.y - Math.sin(ang) * 1.5 * dt; if (walkM(bx, by)) { n.x = bx; n.y = by; } } return; }   // al massimo due addosso: gli altri girano attorno
      if (d > 1.35 || p.vehicle) { if (!n.path.length || !n.goal || dist(n.goal.x, n.goal.y, p.x, p.y) > 1.5) goTo(n, p.x, p.y, 1); if (n.path.length) stepAlong(n, 3.9, dt); else { const sx = n.x + Math.cos(ang) * 3.9 * dt, sy = n.y + Math.sin(ang) * 3.9 * dt; if (walkM(sx, sy)) { n.x = sx; n.y = sy; n.speedNow = 3.9; } } n.anim += dt * 6; return; }
      if (n.mcool <= 0) { n.mcool = 1.3 + st.rng() * .7; n.gesture = .3; damagePlayer(st, 5 + st.rng() * 4, ang, 'coltello'); st.sfx.push({ k: 'swing', x: n.x, y: n.y }); }
      return; }
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
    const skill = n.cop ? .07 : n.faction === 'marsiglia' ? .08 : n.camp ? .2 : .1;   // [arcipelago] i soldati delle isole sparano male
    shoot(st, n, n.weapon, Math.atan2(p.y - n.y, p.x - n.x), W.spread + skill + moving + d * .004, n.id);
    n.mag--;
    if (W.auto) { n.burst--; n.cool = n.burst > 0 ? W.rate * 1.3 : .8 + st.rng() * .6; }
    else n.cool = W.rate * (n.weapon === 'lupara' ? 1.6 : 2.6) + st.rng() * .35;
    panicAround(st, n.x, n.y, 22, 6);
    if (st.clock > n.barkCd && st.rng() < .15) say(st, n, barksOf(n)[Math.floor(st.rng() * 4)], 1.8);
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
    const own = !m.framedBy && st.events.some(e => e.id === m.eventId && e.actor === tn.id);
    if (own) addLog(st, `${clockStr(st.t)} · ${cop.name} ha arrestato ${tn.name}: ${LABEL[m.type].toLowerCase()}.`, 'bad', m.eventId);
    else { addLog(st, `${clockStr(st.t)} · ${cop.name} ha arrestato ${tn.name} per un fatto commesso da te.`, 'info', m.eventId); feed(st, `La polizia ha arrestato ${tn.first}. Al posto tuo.`, 'rumor'); }
    if (HOOKS.jailed) HOOKS.jailed(st, cop, tn, m, own);
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
  // [salto] tieni premuto (Spazio) per caricare, rilascia per saltare: più carichi, più vai in alto. A piedi e in BMX
  // (il bunny hop), non in auto né a nuoto. p.jz è l'altezza da terra, p.jvz la velocità in su; la BMX salta con te (v.jz).
  const JUMP = { g: 18, maxCharge: .7, foot: [3, 5.2], bmx: [3.6, 6.8] }, PACE_BMX = [1, .55, .8, 1];
  function canJump(st) { const p = st.player; if (st.over || p.stun > 0 || p.swim || p.jz > 0) return false; if (!p.vehicle) return true; const v = st.vehicles.find(k => k.id === p.vehicle); return !!(v && VK[v.kind].pocket); }
  function jumpHold(st, on) {
    const p = st.player;
    if (on) { if (p.jcharge == null && canJump(st)) p.jcharge = 0; return; }
    if (p.jcharge == null) return; const k = clamp(p.jcharge / JUMP.maxCharge, 0, 1); p.jcharge = null;
    if (!canJump(st)) return;
    const R = p.vehicle ? JUMP.bmx : JUMP.foot, sp = Math.abs(p.speed || 0);
    p.jvz = R[0] + (R[1] - R[0]) * k + Math.min(.6, sp * .05); p.jz = .001; p.jumpT = st.clock;
    st.sfx.push({ k: 'jump', x: p.x, y: p.y });
  }
  function jumpStep(st, dt) {
    const p = st.player, v = p.vehicle ? st.vehicles.find(k => k.id === p.vehicle) : null;
    if (p.jcharge != null) { if (!canJump(st)) p.jcharge = null; else p.jcharge = Math.min(JUMP.maxCharge, p.jcharge + dt); }
    if (p.jz > 0) {
      p.jvz -= JUMP.g * dt; p.jz += p.jvz * dt;
      if (p.jz <= 0) { p.landV = -p.jvz; p.jz = 0; p.jvz = 0; p.landT = st.clock; st.sfx.push({ k: 'land', x: p.x, y: p.y }); }
    }
    if (v) { v.jz = p.jz || 0; v.jvz = p.jvz || 0; }
  }
  // [bmx] i trick con le frecce (la bici si guida col punta e clicca): giù tenuta = impennata, destra/sinistra tenuta = un piede
  // sulla pedalina di quel lato, il corpo fuori. v.wheelie (0-1) e v.peg (-1 destra … +1 sinistra) salgono e scendono morbidi.
  function bmxTricks(v, t, dt) {
    const k = Math.min(1, dt * 7), w = t && t.wheelie ? 1 : 0, pg = t ? (t.peg || 0) : 0;
    v.wheelie = (v.wheelie || 0) + (w - (v.wheelie || 0)) * k; if (v.wheelie < .002) v.wheelie = 0;
    v.peg = (v.peg || 0) + (pg - (v.peg || 0)) * k; if (Math.abs(v.peg) < .002) v.peg = 0;
  }
  function movePlayer(st, dt, inp) {
    const p = st.player;
    if (p.cool > 0) p.cool -= dt;
    if (p.reload > 0) { p.reload -= dt; if (p.reload <= 0) { const W = WEAPONS[p.cur], a = p.arms[p.cur]; if (a && W.mag) { const need = W.mag - a.mag, take = Math.min(need, a.reserve); a.mag += take; a.reserve -= take; } } }
    p.bloom = Math.max(0, p.bloom - dt * .35);
    if (p.punch > 0) p.punch -= dt;
    if (st.clock - p.hurtT > 7 && p.hp < 100) p.hp = Math.min(100, p.hp + dt * 3);
    if (!p.vehicle) knockback(st, p, dt);
    jumpStep(st, dt);   // [salto]
    if (p.stun > 0) { p.stun -= dt; p.speed = 0; return; }
    if (p.vehicle) return driveVehicle(st, st.vehicles.find(v => v.id === p.vehicle), dt, inp);
    if (p.sk && p.sk.on && typeof Skate !== 'undefined' && Skate.move(st, dt, inp)) return;   // [skate] in tavola si muove lo skate
    const ix = inp.x, iy = inp.y;
    p.swim = !p.indoor && !p.lv && seaM(p.x, p.y);   // [costa] in acqua si nuota
    if (ix || iy) {
      const l = Math.hypot(ix, iy), sp = p.swim ? (inp.sprint ? 2.7 : 1.8) : (p.sneak ? 1.7 : inp.pace >= 3 ? 7.8 : inp.sprint ? 6.4 : (p.cur !== 'pugni' && p.cur !== 'molotov' ? 3.8 : 4.2)) * (p.loadK || 1);   // [oggetti] col carico addosso si va piano
      p.__st = st;   // [monte] i livelli (sotto terra, sul ponte) sanno dove si cammina
      const hitWall = tryMove(p, ix / l * sp * dt, iy / l * sp * dt, .35, !p.indoor && !p.lv && !p.carrying);   // [costa] il giocatore può entrare in mare (con un peso in braccio no)
      p.swim = !p.indoor && !p.lv && seaM(p.x, p.y);
      const LVm = typeof Livelli !== 'undefined' ? Livelli : null;
      if (LVm && LVm.moved(st, ix / l, iy / l, hitWall)) { /* [monte] gestito dai livelli */ }
      else if (p.indoor) {
        const L = indoorL(p);
        const e = L.ent, ox = e.out[0] - e.in[0], oy = e.out[1] - e.in[1], ol = Math.hypot(ox, oy) || 1;
        const doorX = e.side === 'N' || e.side === 'S' ? e.x : e.side === 'W' ? L.box[0] : L.box[0] + L.box[2], doorY = e.side === 'W' || e.side === 'E' ? e.y : e.side === 'N' ? L.box[1] : L.box[1] + L.box[3];
        if (INT.outside(L, p.x, p.y) || (p.indoor.f === 0 && Math.hypot(p.x - doorX, p.y - doorY) < 1.1 && (ix * ox + iy * oy) / (l * ol) > .3)) exitBuilding(st);
        else if (L.stairs && INT.stairGo) { const g = INT.stairGo(L, p.indoor.f, p.x, p.y); if (g) { p.indoor.f = g.f; p.x = g.x; p.y = g.y; p.path = []; if (HOOKS.indoor) HOOKS.indoor(st, L.b, true); } }   // [interni] scale di più piani
        else if (L.stairs && INT.onStairTop(L, p.x, p.y)) { const f = p.indoor.f; p.indoor.f = f ? 0 : 1; const q = f ? L.stairs.foot : L.stairs.landing; p.x = q[0]; p.y = q[1]; if (HOOKS.indoor) HOOKS.indoor(st, L.b, true); }
      } else if (hitWall) {
        // contro la facciata, sulla soglia di una porta: si entra
        const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS);
        for (const [ox, oy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const bi = DOOR_OF.get((ty + oy) * GW + tx + ox); if (bi === undefined) continue;
          const b = W0.BUILDINGS[bi], cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, dc = Math.hypot(cx - p.x, cy - p.y);
          if (((cx - p.x) * ix + (cy - p.y) * iy) / (dc * l) > .35 && Math.hypot((b.door[0] + .5) * TS - p.x, (b.door[1] + .5) * TS - p.y) < 1.6) { enterBuilding(st, bi); break; }
        }
      }
      const back = inp.aim !== undefined && Math.abs(angDiff(Math.atan2(iy, ix), inp.aim)) > 2.2;
      const ta = inp.aim !== undefined ? inp.aim : Math.atan2(iy, ix); p.face += angDiff(ta, p.face) * Math.min(1, dt * 16); p.speed = back ? -sp : sp;
    } else { p.speed = 0; if (inp.aim !== undefined) p.face += angDiff(inp.aim, p.face) * Math.min(1, dt * 14); }
    p.anim += dt * (p.speed ? Math.abs(p.speed) * 3 : 1);
    if (!p.lv || p.lv.k !== 'ug') pushOutOfVehicles(st, p, .35);   // [monte] sotto terra le auto sono sopra la testa
  }
  function tryMove(o, dx, dy, r, swim) {
    const LVf = o.lv && typeof Livelli !== 'undefined' ? Livelli.freeFn(o, r) : null, L = LVf ? null : indoorL(o);   // [monte]
    const wm = swim ? (x, y) => walkM(x, y) || seaM(x, y) : walkM;   // [costa] chi nuota passa anche per l'acqua
    const free = LVf || (L ? (x, y) => INT.walk(L, o.indoor.f, x, y, r) : (x, y) => wm(x - r, y - r) && wm(x + r, y - r) && wm(x - r, y + r) && wm(x + r, y + r));
    let hit = false;
    if (free(o.x + dx, o.y)) o.x += dx; else hit = true;
    if (free(o.x, o.y + dy)) o.y += dy; else hit = true;
    return hit;
  }
  // coordinate locali del veicolo: lx lungo il muso, ly di lato
  function vLocal(v, x, y) { const c = Math.cos(v.ang), s = Math.sin(v.ang), dx = x - v.x, dy = y - v.y; return { lx: dx * c + dy * s, ly: -dx * s + dy * c }; }
  function insideVehicle(v, x, y, r) { const K = VK[v.kind], q = vLocal(v, x, y); return Math.abs(q.lx) < K.len / 2 + r && Math.abs(q.ly) < K.wid / 2 + r; }
  function vehicleFree(v, x, y, ang) {
    const K = VK[v.kind], c = Math.cos(ang), s = Math.sin(ang), hl = K.len / 2 - .05, hw = K.wid / 2 - .05, pass = K.boat ? boatM : walkM;   // [costa]
    for (const [a, b] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0], [0, hw], [0, -hw]]) if (!pass(x + a * c - b * s, y + a * s + b * c)) return false;
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
    if (v.w === undefined) { v.w = 0; v.steer = 0; v.slip = 0; v.skid = 0; v.longA = 0; v.latA = 0; }
  }
  function scaleVel(v, k) { ensureVel(v); v.vx *= k; v.vy *= k; v.w *= k; v.speed = fwd(v); v._spd = v.speed; }
  function loosen(st, v, secs) { if (v.traffic || (v.police && v.rider === 'npc')) v.looseUntil = Math.max(v.looseUntil || 0, st.clock + secs); }
  // primo punto del telaio che finisce dentro qualcosa di solido
  function vehicleHitPoint(v, x, y, ang) {
    const K = VK[v.kind], c = Math.cos(ang), s = Math.sin(ang), hl = K.len / 2 - .05, hw = K.wid / 2 - .05, pass = K.boat ? boatM : walkM;   // [costa]
    let bx = 0, by = 0, n = 0;
    for (const [a, b] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0], [-hl, 0], [0, hw], [0, -hw]]) { const px = x + a * c - b * s, py = y + a * s + b * c; if (!pass(px, py)) { bx += px; by += py; n++; } }
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
    if (!VK[v.kind].boat) vehicleBump(st, v, vn, cp, ang);   // [costa] una barca contro il molo non sfonda niente
    const pl = v.rider === 'player';
    if (vn > 6) damageVehicle(st, v, (vn - 6) * 4, pl ? 'player' : null);
    if (vn > 3) { st.fx.push({ k: 'carhit', x: cp.x, y: cp.y, v: vn, a: ang, wall: true }); if (pl || dist(v.x, v.y, st.player.x, st.player.y) < 30) st.sfx.push({ k: vn > 9 ? 'crash' : 'bump', x: cp.x, y: cp.y, v: vn }); }
    if (pl) { st.shake = Math.max(st.shake, clamp(vn * .045, .1, .8)); if (vn > 13) st.hitstop = Math.max(st.hitstop || 0, .06); }
    loosen(st, v, 1.5);
  }
  // guida: want = direzione voluta, throttle -1..1, brake = freno, hand = freno a mano
  // potenziamenti dell'officina: motore (accelerazione e velocità), assetto (tenuta e sterzo), nitro (spinta con Shift)
  function tuned(v) {
    const K0 = VK[v.kind], u = v.up; if (!u) return K0;
    const key = (u.motore | 0) + ',' + (u.assetto | 0) + ',' + (u.nitro | 0);
    if (v._tk !== key) { const m = u.motore | 0, a = u.assetto | 0; v._tk = key; v._K = Object.assign({}, K0, { accel: K0.accel * (1 + .11 * m), max: K0.max * (1 + .07 * m), grip: K0.grip * (1 + .08 * a), turn: K0.turn * (1 + .06 * a) }); }
    return v._K;
  }
  function vehicleMotion(st, v, dt, want, throttle, brake, sprint, hand, steerIn) {
    const K = tuned(v); ensureVel(v);
    const c = Math.cos(v.ang), s = Math.sin(v.ang);
    let vf = v.vx * c + v.vy * s, vl = -v.vx * s + v.vy * c;
    const vf0 = vf, spd = Math.abs(vf);
    // sterzo: le ruote girano verso la direzione voluta, con un po' di ritardo
    let steer = 0;
    if (steerIn !== undefined) steer = clamp(steerIn, -1, 1);
    else if (want !== null) steer = clamp(angDiff(want, v.ang) * 1.7, -1, 1) * (vf < -.3 ? -1 : 1);
    v.steer += (steer - v.steer) * Math.min(1, dt * (steerIn !== undefined && Math.abs(steer) < Math.abs(v.steer) ? 11 : 9));
    // longitudinale
    const max = (sprint ? K.max * (1.15 + .06 * ((v.up && v.up.nitro) | 0)) : K.max) * (v.boost || 1) * (v.pace || 1);   // [bmx] v.pace: quanto forte pedali
    if (throttle > 0) {
      const off = want === null ? 0 : Math.abs(angDiff(want, v.ang));
      let a = K.accel * (v.boost || 1) * (off < 1.2 ? 1 : off < 2.4 ? .45 : .2) * (1 - clamp(vf / max, 0, 1) * .35);
      if (vf < 0) a += 10;
      if (vf < max) vf = Math.min(max, vf + a * dt); else vf -= Math.min(vf - max, 4 * dt);
    } else if (throttle < 0) { if (vf > .6) vf -= 16 * dt; else vf = Math.max(-5, vf - K.accel * .7 * dt); }
    else vf -= Math.sign(vf) * Math.min(Math.abs(vf), (K.boat ? .8 + Math.abs(vf) * .07 : 2.6) * dt);   // [costa] in mare si va avanti per abbrivio
    if (brake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 19 * dt);
    if (hand) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 3.5 * dt);
    // aderenza laterale: oltre la soglia si scivola (e si continua a scivolare finché non si rallenta)
    let grip = K.grip;
    const slideOn = Math.abs(vl) > (v.sliding ? 1.6 : 3.2); v.sliding = slideOn;
    if (hand) grip *= K.two ? .55 : .42;
    else if (slideOn) grip *= K.two ? .8 : .66;
    if (throttle > 0 && Math.abs(v.steer) > .75 && spd > 9 && !K.two) grip *= .88; // gas in curva: la coda allarga
    vl -= Math.sign(vl) * Math.min(Math.abs(vl), grip * dt);
    // imbardata: lo sterzo chiede una velocità di rotazione, le gomme la concedono fino al limite di aderenza
    const turnK = K.boat ? clamp(spd / 2.5, throttle ? .35 : .1, 1) : clamp(spd / 3.2, 0, 1) * (1 - .32 * clamp((spd - 11) / 9, 0, 1));   // [costa] l'elica fa girare la barca anche quasi ferma
    let wT = v.steer * K.turn * turnK * (vf < -.3 ? -1 : 1);
    if (!hand && spd > 2 && !K.boat) { const lim = (slideOn ? grip * 1.25 : K.grip * 1.12) / spd; wT = clamp(wT, -lim, lim); }
    if (!hand) wT = clamp(wT, -2.6, 2.6);   // niente trottole a bassa velocità
    if (hand && spd > 4) wT *= 1.55;
    v.w += (wT - v.w) * Math.min(1, dt * (hand ? 3.2 : slideOn ? 3.6 : 8.5));
    v.vx = vf * c - vl * s; v.vy = vf * s + vl * c;
    v.longA = (vf - vf0) / Math.max(dt, 1e-3); v.latA = v.w * vf; v.slip = vl;
    v.skid = clamp((Math.abs(vl) - 1.2) / 3.5, 0, 1);
    if (brake && spd > 5) v.skid = Math.max(v.skid, .7);
    if (hand && spd > 4) v.skid = Math.max(v.skid, .8);
    if (throttle > 0 && spd < 4 && vf0 >= -0.1 && !K.two && v.rider === 'player' && sprint) v.skid = Math.max(v.skid, .6); // sgommata in partenza
    if (K.boat) { v.skid = 0; v.wake = clamp(spd / K.max, 0, 1); }   // [costa] niente gomme: la scia
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
  // calamita di corsia: se vai quasi parallelo a una strada e non sterzi, una piccola spinta ti allinea (mai oltre ±.25)
  function roadMagnet(v) {
    let best = null, bd = 1e9;
    (W0.roads || []).forEach(rd => { if (!rd.pts) return;
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const ax = rd.pts[k][0], ay = rd.pts[k][1], dx = rd.pts[k + 1][0] - ax, dy = rd.pts[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1;
        const t = clamp(((v.x - ax) * dx + (v.y - ay) * dy) / L2, 0, 1), d = Math.hypot(v.x - (ax + dx * t), v.y - (ay + dy * t));
        if (d < bd) { bd = d; best = { ang: Math.atan2(dy, dx), d, rw: rd.w || 6 }; }
      } });
    if (!best || best.d > best.rw * .5 + 1.5) return 0;
    let e = angDiff(best.ang, v.ang); if (Math.abs(e) > Math.PI / 2) e = angDiff(best.ang + Math.PI, v.ang);
    return Math.abs(e) > .6 ? 0 : clamp(e * .6, -.25, .25);
  }
  function driveVehicle(st, v, dt, inp) {
    const p = st.player;
    if (!v || v.wreck) { p.vehicle = null; return; }
    ensureVel(v);
    // tastiera (WASD rispetto al mezzo): W gas, S freno e retromarcia, A/D sterzo, spazio freno a mano, shift spinta
    if (inp.drive) { const d = inp.drive, spd0 = Math.abs(v.speed || 0); let sIn = d.steer || 0;
      sIn *= 1 - .3 * clamp((spd0 - 12) / 14, 0, 1);                       // a velocità alta lo sterzo è meno nervoso
      if (d.assist && d.thr > 0 && !d.hb && spd0 > 6 && Math.abs(sIn) < .05) sIn += roadMagnet(v);   // calamita leggera: la strada tira l'auto dritta
      if (VK[v.kind].pocket) { bmxTricks(v, inp.trick, dt); v.pace = 1; v.pedal = (d.thr || 0) > 0 && !p.jz && Math.abs(v.peg) <= .5; }   // [bmx]
      vehicleMotion(st, v, dt, null, d.thr || 0, false, !!d.boost, !!d.hb, sIn); p.x = v.x; p.y = v.y; p.face = v.ang; p.speed = v.speed; runOver(st, v, 'player'); return; }
    const want = (inp.x || inp.y) ? Math.atan2(inp.y, inp.x) : null;
    const rev = inp.back && v.speed < 1.2;
    const throttle = rev ? -1 : want !== null ? 1 : 0;
    let thr = throttle;
    if (VK[v.kind].pocket) {   // [bmx] più clicchi svelto, più forte pedali; in aria non si pedala
      bmxTricks(v, inp.trick, dt); if (Math.abs(v.peg) > .5) thr = Math.min(thr, 0);   // sulla pedalina un piede è fuori: si va a ruota libera
      v.pace = inp.pace ? PACE_BMX[inp.pace] : 1; v.pedal = thr > 0 && !p.jz;
    }
    vehicleMotion(st, v, dt, rev ? null : want, thr, inp.back && v.speed >= 1.2, inp.sprint, inp.brake);
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
    if (K.pocket) return bikeBump(st, v);   // [bmx] una bici non è un'auto
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
  // [bmx] in BMX contro un pedone: niente volo né morti. Lui va giù stordito (pochi danni) e se lo ricorda; tu cadi e la bici
  // torna in tasca. Ma se sei in aria (bunny hop, più di 45 cm) gli passi sopra: il salto serve a scavalcare la gente.
  function bikeBump(st, v) {
    const p = st.player; if (p.jz > .45) return;
    const vsp = v.vx !== undefined ? Math.hypot(v.vx, v.vy) : Math.abs(v.speed);
    for (const n of st.npcs) {
      if (n.inside || n.dead || n.jailedUntil > st.t || !insideVehicle(v, n.x, n.y, .2)) continue;
      if (vsp < 3.5) { pushOutOfVehicles(st, n, .35); continue; }
      if (st.clock - (n.lastHitByCar || -99) < 2) continue;
      n.lastHitByCar = st.clock; st.sfx.push({ k: 'thud' });
      if (vsp < 6) { n.stun = .7; scaleVel(v, .45); pushOutOfVehicles(st, n, .35); feed(st, `Urti ${n.first} di striscio: barcolla e ti manda a quel paese.`, 'bad'); return; }   // pedalata leggera: resti in sella
      n.stun = 1.4;
      const ev = emit(st, 'investimento', { target: n.id }); addLog(st, `${clockStr(st.t)} · Sei finito in BMX addosso a ${n.name}.`, 'bad', ev.id);
      damage(st, n, 3 + vsp * .8, 'player', Math.atan2(n.y - v.y, n.x - v.x), 'pugni');
      if (p.vehicle === v.id) { exitVehicle(st); p.stun = .7; feed(st, `Prendi in pieno ${n.first} e finite tutti e due per terra. La BMX è di nuovo in tasca.`, 'bad'); }
      return;
    }
  }
  // traffico: corsie della Via al Mare, si ferma davanti agli ostacoli
  function updateTraffic(st, v, dt) {
    ensureVel(v);
    if (v.looseUntil > st.clock || v.stalled) { freeRoll(st, v, dt, v.stalled); runOver(st, v, 'traffic'); return; }
    if (v.looseUntil) {
      // si riprende dall'urto: se è girato di traverso o troppo malconcio il guidatore scende e scappa
      v.looseUntil = 0;
      const q0 = lanePos(LANES[v.lane.i], v.lane.s, v.lane.dir);
      if (Math.abs(angDiff(q0.ang, v.ang)) > .9 || v.hp < VK[v.kind].hp * .45 || dist(q0.x, q0.y, v.x, v.y) > 3) { v.stalled = true; v.traffic = false; v.rider = null; v.speed = 0; v._spd = 0; v.vx = v.vy = v.w = 0; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); panicAround(st, v.x, v.y, 10, 4); return; }
    }
    const panic = st.clock - (v.panicT || -99) < 8 || st.clock - st.panicAt < 3 && dist(v.x, v.y, st.player.x, st.player.y) < 30;
    const Ln = LANES[v.lane.i], target = (panic ? 13 : 0) || (Ln.id === 'litoranea' ? 10 : 7.5);
    let block = 99;
    const fx = Math.cos(v.ang), fy = Math.sin(v.ang);
    const check = (x, y, r) => { const dx = x - v.x, dy = y - v.y, along = dx * fx + dy * fy, lat = Math.abs(-dx * fy + dy * fx); if (along > 0 && along < 9 && lat < 1.3 + Math.min(r, .5)) block = Math.min(block, along - r); };
    if (!st.player.vehicle) check(st.player.x, st.player.y, .4);
    st.npcs.forEach(n => { if (!n.inside && !n.dead) check(n.x, n.y, .4); else if (n.dead && !n.inside) check(n.x, n.y, .3); });
    // [inverno] chi viene in senso opposto sulla sua corsia non blocca (prima due file contrarie si fermavano a vicenda)
    st.vehicles.forEach(o => { if (o === v || o.hidden) return; if (o.traffic && Math.cos(angDiff(o.ang, v.ang)) < -.3) { const dx = o.x - v.x, dy = o.y - v.y; if (Math.abs(-dx * fy + dy * fx) > .9) return; } check(o.x, o.y, VK[o.kind].len / 2 + VK[v.kind].len / 2 - 1); });
    const K = VK[v.kind];
    let want = target;
    if (block < 7) want = Math.max(0, (block - 2.2) * 1.6);
    if (v.speed < want) v.speed = Math.min(want, v.speed + K.accel * .6 * dt); else v.speed = Math.max(want, v.speed - 14 * dt);
    if (block < 3 && v.speed < .5) { v.stuck += dt; if (v.stuck > 2.5 && st.clock > v.honk) { v.honk = st.clock + 3; st.sfx.push({ k: 'honk', x: v.x, y: v.y }); } } else v.stuck = 0;
    // segue la sua corsia; a fine strada fa inversione
    const Lr = v.lane; Lr.s += v.speed * dt * Lr.dir;
    if (!Ln.closed && (Lr.s > Ln.L - 3 || Lr.s < 3)) {
      const e = Lr.s > Ln.L - 3 ? 1 : 0, opts = (e === 1) === (Lr.dir > 0) ? Ln.conn[e] : null;
      if (opts && opts.length) { const o = opts[Math.floor(st.rng() * opts.length)]; v.lane = { i: o.j, s: o.s + o.dir * 1, dir: o.dir }; v.speed = Math.min(v.speed, 5); }
      else if (opts) { Lr.dir *= -1; Lr.s = clamp(Lr.s, 3, Ln.L - 3); }
    }
    const q = lanePos(Ln, Lr.s, Lr.dir), q2 = lanePos(Ln, Lr.s + Lr.dir * 5, Lr.dir);
    { const k = Math.min(1, dt * 3); let mx = (q.x - v.x) * k, my = (q.y - v.y) * k; const md = Math.hypot(mx, my), cap = (v.speed + 1.5) * dt * 1.3; if (md > cap) { mx *= cap / md; my *= cap / md; } v.x += mx; v.y += my; }
    v.ang += angDiff(Math.atan2(q2.y - q.y, q2.x - q.x), v.ang) * Math.min(1, dt * 4);
    v.vx = Math.cos(v.ang) * v.speed; v.vy = Math.sin(v.ang) * v.speed; v.w = 0; v._spd = v.speed; v.skid = 0; v.steer = 0;
    runOver(st, v, 'traffic');
  }
  // auto della polizia guidata dal computer
  function updatePoliceCar(st, v, dt) {
    const p = st.player;
    if (v.leaving) {
      v.siren = false;
      const hm = v.home || { x: 0, y: 0 }; if (!v.path || !v.path.length) v.path = findPath(v.x, v.y, hm.x, hm.y, 1);
      const w = v.path[0]; if (w && dist(v.x, v.y, w.x, w.y) < 2.5) v.path.shift();
      vehicleMotion(st, v, dt, w ? Math.atan2(w.y - v.y, w.x - v.x) : v.ang, 1, false, false, false);
      if (dist(v.x, v.y, st.player.x, st.player.y) > 110 || !w || v.stuck > 4) v.hidden = true;
      if (dist(v.x, v.y, v.x - Math.cos(v.ang) * v.speed * dt, v.y) < .005) v.stuck += dt;
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
      const ln = nearestLane(st.player.x, st.player.y, 70, 130) || nearestLane(st.player.x, st.player.y, 20, 400) || { i: 0, s: 0 };
      const q = lanePos(LANES[ln.i], ln.s, 1);
      const v = makeVehicle(st, { id: 'police' + st.nextId++, kind: 'polizia', x: q.x, y: q.y, ang: q.ang, color: '#8fb4d8', police: true, rider: 'npc', siren: true, speed: 10, home: { x: q.x, y: q.y } });
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
      } else if (bIndex[i] >= 0 && false) {
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
  // [trame] lanciare: chiunque può tirare un sasso (o altro) verso un punto; vola davvero e quando cade fa quello che fa
  function npcThrow(st, n, tx, ty, kind) {
    // se il bersaglio è davanti a un edificio (la porta sta sulla strada) si mira alla facciata più vicina
    const isB = (x, y) => grid[Math.floor(y / TS) * GW + Math.floor(x / TS)] === T.BLD;
    if (!isB(tx, ty)) { let best = null, bd = 9; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]]) for (const r of [1.2, 2.2]) { const x = tx + ox * r, y = ty + oy * r; if (isB(x, y)) { const dd = dist(x, y, n.x, n.y); if (dd < bd) { bd = dd; best = { x, y }; } } } if (best) { tx = best.x; ty = best.y; } }
    const d = Math.max(1, dist(n.x, n.y, tx, ty)), Tf = clamp(d / 11, .35, 1.3), g = 9.8;
    n.face = Math.atan2(ty - n.y, tx - n.x); n.gesture = .4;
    st.proj.push({ x: n.x, y: n.y, z: 1.6, vx: (tx - n.x) / Tf, vy: (ty - n.y) / Tf, vz: (-1.6 + .5 * g * Tf * Tf) / Tf, g, kind: kind || 'sasso', owner: n.id });
  }
  function stoneLand(st, pr) {
    const ang = Math.atan2(pr.vy, pr.vx), tx = Math.floor(pr.x / TS), ty = Math.floor(pr.y / TS), i = ty * GW + tx, by = pr.owner === 'player' ? 'player' : byId(st, pr.owner);
    if (pr.hit) {
      const k = pr.hit; st.sfx.push({ k: 'hurt', x: pr.x, y: pr.y });
      if (k === st.player) damagePlayer(st, 6, ang, pr.owner); else { k.stun = Math.max(k.stun || 0, .6); damage(st, k, 7, by && by !== 'player' ? by : 'env', ang, 'sasso'); }
    } else if (grid[i] === T.BLD && bIndex[i] >= 0) {
      const b = BUILDINGS[bIndex[i]], glassy = glassFront(b, ang);
      st.fx.push({ k: 'facadehit', x: pr.x, y: pr.y, a: ang, n: 1, need: 99, b: bIndex[i], tx, ty, speed: 9, glass: glassy });
      st.sfx.push({ k: glassy ? 'glass' : 'wallhit', x: pr.x, y: pr.y });
      if (glassy) emit(st, 'vandalismo', { x: pr.x, y: pr.y, actor: by && by !== 'player' ? by.id : 'player', npcCrime: by !== 'player' });   // chi vede sa chi è stato
    } else st.sfx.push({ k: 'wallhit', x: pr.x, y: pr.y });
    panicAround(st, pr.x, pr.y, 9, 3);
  }
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



  // ---------------- ARREDO ORDINATO (mercato, cimitero, piazzale container, binario del porto) ----------------
  // La disposizione la decide la logica, sulle caselle: i pezzi grandi occupano caselle intere e le rendono
  // non percorribili (si gira intorno ai banchi, ci si ripara dietro i container). La grafica legge LAYOUT e disegna.
  let LAYOUT = null;
  function layout() {
    if (LAYOUT) return LAYOUT;
    const L = { items: [], block: [] }, T0 = MAP0.grid, tile0 = (tx, ty) => (tx < 0 || ty < 0 || tx >= GW || ty >= GH) ? T.WATER : T0[ty * GW + tx];
    const used = new Set(), key = (tx, ty) => ty * GW + tx;
    const okT = (tx, ty, kinds) => !used.has(key(tx, ty)) && kinds.includes(tile0(tx, ty)) && bIndex[key(tx, ty)] < 0 && !DOOR_OF.has(key(tx, ty));
    // rettangolo libero di w×h caselle tutte del tipo voluto, il più vicino a (x, y)
    const rectNear = (x, y, w, h, kinds, maxR, margin) => {
      const m = margin || 0, cx = Math.floor(x / TS), cy = Math.floor(y / TS); let best = null, bd = 1e9;
      for (let ty = cy - maxR; ty <= cy + maxR; ty++) for (let tx = cx - maxR; tx <= cx + maxR; tx++) {
        let ok = true; for (let j = -m; j < h + m && ok; j++) for (let i = -m; i < w + m && ok; i++) if (!okT(tx + i, ty + j, kinds)) ok = false;
        if (!ok) continue; const d = Math.hypot(tx + w / 2 - cx, ty + h / 2 - cy); if (d < bd) { bd = d; best = [tx, ty]; }
      }
      return best;
    };
    const take = (tx, ty, w, h, block) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { used.add(key(tx + i, ty + j)); if (block) L.block.push([tx + i, ty + j]); } };
    // --- mercato di Piazza San Rocco: quattro banchi in fila, 2 caselle ciascuno, una casella di passaggio fra l'uno e l'altro ---
    if (PLACES.piazza) {
      // [inverno] la piazza ora ha i viali che la attraversano: niente margine, e due file di banchi
      [[-10, ['frutta', 'verdura', 'pesce', 'forno']], [4, ['verdura', 'frutta', 'forno', 'pesce']]].forEach(([ox, goodsRow]) => {
        const q = rectNear(PLACES.piazza.x + ox, PLACES.piazza.y + (ox > 0 ? 3 : -2), 11, 2, [T.PIAZZA], 16, 0) || rectNear(PLACES.piazza.x + ox, PLACES.piazza.y, 11, 2, [T.PIAZZA, T.WALK, T.COB], 20, 0);
        if (q) goodsRow.forEach((goods, k) => { const tx = q[0] + k * 3; take(tx, q[1], 2, 1, true); take(tx, q[1] + 1, 2, 1, false); L.items.push({ kind: 'banco', goods, x: (tx + 1) * TS, y: q[1] * TS + 1, rot: 0, tiles: [tx, q[1], 2, 1] }); });
      });
    }
    // --- piazzale dei container al porto: due file da tre, impilati a scacchiera, corridoio di una casella ---
    const quay = [T.QUAY, T.COB, T.WALK];
    const port = PLACES.cantiere || PLACES.magazzino;
    if (port) {
      // un container (6 × 3 m) occupa 3 × 2 caselle; fra le due file un corridoio di una casella
      const q = rectNear(port.x + 4, port.y + 14, 9, 5, [T.QUAY, T.COB, T.DIRT, T.GRASS], 22, 1);
      if (q) for (let row = 0; row < 2; row++) for (let k = 0; k < 3; k++) { const tx = q[0] + k * 3, ty = q[1] + row * 3; take(tx, ty, 3, 2, true); L.items.push({ kind: 'container', x: tx * TS + 3, y: ty * TS + 2, rot: Math.PI / 2, up: (k + row) % 2 === 0, col: (k * 2 + row) % 3, tiles: [tx, ty, 3, 2] }); }
    }
    // --- binario di raccordo dietro il Magazzino Neri: 4 tratte di rotaia, due carri fermi ---
    // il binario serve il piazzale dei container dietro il cantiere: zona industriale, lontano dalle case
    if (port) {
      const q = rectNear(port.x + 4, port.y + 24, 10, 2, quay.concat([T.DIRT, T.GRASS, T.SAND]), 30, 1);
      if (q) { take(q[0], q[1], 12, 2, false); L.items.push({ kind: 'binario', x: q[0] * TS, y: (q[1] + 1) * TS, len: 20, rot: 0 });
        [[0, 'train-carriage-box'], [4, 'train-carriage-tank']].forEach(([o, m]) => { L.items.push({ kind: 'carro', model: m, x: (q[0] + o + 1.7) * TS, y: (q[1] + 1) * TS, rot: Math.PI / 2 }); for (let i = 0; i < 3; i++) L.block.push([q[0] + o + i, q[1]], [q[0] + o + i, q[1] + 1]); }); }
    }
    // --- cimitero di San Giacomo: recinto in ferro, cappella in fondo, tombe in file regolari ---
    const sg = PLACES.chiesa_sg || PLACES.sangiacomo;
    if (sg) {
      const W = 9, H = 9, q = rectNear(sg.x + 14, sg.y, W, H, [T.GRASS, T.COB, T.DIRT], 26, 1) || rectNear(sg.x + 14, sg.y, W, H, [T.GRASS, T.COB, T.DIRT, T.FIELD, T.SHRUB], 26, 1);
      if (q) {
        take(q[0], q[1], W, H, false);
        // dentro il recinto: ghiaia, niente colture né alberi del campo
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = key(q[0] + i, q[1] + j); MAP0.grid[k] = T.COB; grid[k] = T.COB; }
        for (let i = 0; i < W; i++) for (const j of [0, H - 1]) { if (j === H - 1 && i === Math.floor(W / 2)) { L.items.push({ kind: 'cancello', x: (q[0] + i) * TS + 1, y: (q[1] + j) * TS + 2, rot: 0 }); continue; } L.block.push([q[0] + i, q[1] + j]); L.items.push({ kind: 'recinto', x: (q[0] + i) * TS + 1, y: (q[1] + j) * TS + (j ? 2 : 0), rot: 0 }); }
        for (let j = 1; j < H - 1; j++) for (const i of [0, W - 1]) { L.block.push([q[0] + i, q[1] + j]); L.items.push({ kind: 'recinto', x: (q[0] + i) * TS + (i ? 2 : 0), y: (q[1] + j) * TS + 1, rot: Math.PI / 2 }); }
        L.items.push({ kind: 'cappella', x: (q[0] + W / 2) * TS, y: (q[1] + 1) * TS + 1.4, rot: 0 }); for (let i = 3; i <= 5; i++) L.block.push([q[0] + i, q[1] + 1]);
        let n = 0; for (let j = 3; j <= H - 2; j += 2) for (let i = 1; i < W - 1; i++) { if (i === Math.floor(W / 2) || (j === H - 2 && (i === 1 || i === W - 2))) continue; L.items.push({ kind: 'tomba', n: n++, x: (q[0] + i) * TS + 1, y: (q[1] + j) * TS + 1, rot: 0 }); }
        [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]].forEach(([i, j]) => L.items.push({ kind: 'cipresso', x: (q[0] + i) * TS + 1, y: (q[1] + j) * TS + 1 }));
        L.cemetery = { tx: q[0], ty: q[1], w: W, h: H };
      }
    }
    // --- distributori di bibite accanto alle porte di bar, sala giochi, videoteca, gelateria e benzinaio ---
    ['bar', 'flipper', 'video', 'gelateria', 'benzina', 'sirena'].forEach(id => {
      const b = BUILDINGS.find(o => o.id === id); if (!b || !b.door) return;
      const [dx, dy] = b.door, side = dy === b.y + b.h || dy === b.y - 1;
      for (const o of [1, -1, 2, -2]) { const tx = side ? dx + o : dx, ty = side ? dy : dy + o; if (!okT(tx, ty, [T.WALK, T.COB, T.PIAZZA, T.QUAY])) continue; used.add(key(tx, ty));
        const face = dy === b.y + b.h ? 0 : dy === b.y - 1 ? Math.PI : dx === b.x + b.w ? Math.PI / 2 : -Math.PI / 2;
        L.items.push({ kind: 'bibite', x: tx * TS + 1 + (side ? 0 : (dx === b.x + b.w ? -.55 : .55)), y: ty * TS + 1 + (side ? (dy === b.y + b.h ? -.55 : .55) : 0), rot: face }); break; }
    });
    railLine(L, T0);   // [writer]
    return (LAYOUT = L);
  }
  const LBLOCK = new Set();
  // [writer] LA FERROVIA DELLA MINIERA. Dalla Stazione di estrazione Nord corre lungo la costa nord: nel bosco, a monte della
  // Costiera Nord, tra il monte e il mare; dove la città arriva fino alla riva scavalca la strada e passa sul mare, su un viadotto
  // a dieci metri dagli scogli; oltre il Muro scende lungo il primo pontile e finisce sulla banchina del porto militare della Base.
  // L.rail = { pts: [[x, y, h, mare]] ogni metro, len }: h è il piano del ferro (rilevato sul bosco, viadotto sul mare).
  // Le caselle sotto il binario diventano massicciata (GRAVEL): niente alberi né sassi in mezzo ai binari.
  function railLine(L, T0) {
    const nord = MAP.roads.find(r => r.id === 'nord'); if (!nord) return;
    const RP = nord.pts.filter(q => q[0] > 520 && q[0] < 1495);
    const tile0 = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? T.WATER : T0[ty * GW + tx]; };
    const roadAt = x => { let k = 0, bd = 1e9; RP.forEach((q, i) => { const d = Math.abs(q[0] - x); if (d < bd) { bd = d; k = i; } }); const a = RP[Math.max(0, k - 2)], b = RP[Math.min(RP.length - 1, k + 2)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; let nx = -ty, ny = tx; if (ny < 0) { nx = -nx; ny = -ny; } return { x: RP[k][0], y: RP[k][1], nx, ny }; };
    const coastY = (x, y0) => { for (let y = y0; y > y0 - 60; y -= 1) if (tile0(x, y) === T.WATER) return y; return y0 - 14; };
    const cp = [[542, 279], [556, 279]];
    for (let x = 572; x <= 1070; x += 14) { const r = roadAt(x); cp.push([r.x + r.nx * 15, r.y + r.ny * 15]); }   // nel bosco, a monte della strada
    for (let x = 1112; x <= 1500; x += 14) { const r = roadAt(x); cp.push([x, coastY(x, r.y) - 10]); }   // sul mare, davanti alla città
    cp.push([1514, 250], [1524, 262], [1527, 280], [1530, 296], [1538, 306], [1552, 310], [1568, 310], [1578, 310]);   // oltre il Muro, giù lungo il pontile, sulla banchina
    // arrotondata (Chaikin) e campionata ogni metro
    let P = cp; for (let it = 0; it < 4; it++) { const Q = [P[0]]; for (let k = 0; k < P.length - 1; k++) { const a = P[k], b = P[k + 1]; Q.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]); } Q.push(P[P.length - 1]); P = Q; }
    const pts = [[P[0][0], P[0][1]]]; let acc = 0;
    for (let k = 1; k < P.length; k++) { const a = P[k - 1], b = P[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]); let t = 1 - acc; while (t <= l) { pts.push([a[0] + (b[0] - a[0]) * t / l, a[1] + (b[1] - a[1]) * t / l]); t += 1; } acc = l - (t - 1); }
    // la quota: sul bosco il terreno più alto lì attorno (il binario sta su un rilevato), sul mare il viadotto; pendenza al massimo 2,5%
    const eAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx < 0 || ty < 0 || tx >= GW || ty >= GH ? 0 : elev[ty * GW + tx]; };
    const sea = pts.map(([x, y]) => tile0(x, y) === T.WATER || tile0(x, y) === T.PIER);
    const ter = pts.map(([x, y], i) => { if (sea[i]) return 2.6; let m = -9; for (const [a, b] of [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]]) { const t = tile0(x + a, y + b); if (t !== T.WATER) m = Math.max(m, eAt(x + a, y + b)); } return Math.max(m, .4) + .35; });
    const h = ter.slice(), G2 = .025;
    for (let it = 0; it < 3; it++) { for (let i = 1; i < h.length; i++) h[i] = Math.max(h[i], h[i - 1] - G2); for (let i = h.length - 2; i >= 0; i--) h[i] = Math.max(h[i], h[i + 1] - G2); }
    for (let it = 0; it < 6; it++) { const o = h.slice(); for (let i = 2; i < h.length - 2; i++) h[i] = Math.max(ter[i], (o[i - 2] + o[i - 1] + o[i] + o[i + 1] + o[i + 2]) / 5); }
    L.rail = { pts: pts.map((q, i) => [q[0], q[1], h[i], sea[i] ? 1 : 0]), len: pts.length - 1, conflicts: 0 };
    // la massicciata: le caselle del binario (2,5 m per parte) diventano ghiaia; strade, banchine e acqua restano come sono
    const SOFT = [T.TREE, T.SHRUB, T.GRASS, T.ROCK, T.DIRT, T.FIELD, T.SAND, T.CLIFF, T.DESERT];
    const done = new Set();
    pts.forEach(([x, y], i) => { if (sea[i]) return; for (let a = -2.5; a <= 2.5; a += 1) for (let b = -2.5; b <= 2.5; b += 1) { const tx = Math.floor((x + a) / TS), ty = Math.floor((y + b) / TS); if (tx < 0 || ty < 0 || tx >= GW || ty >= GH) continue; const k = ty * GW + tx; if (done.has(k)) continue; done.add(k); const v = T0[k];
      if (bIndex[k] >= 0 || v === T.BLD) { if (Math.hypot(a, b) < 1.6) L.rail.conflicts++; continue; }
      if (SOFT.includes(v)) { T0[k] = T.GRAVEL; grid[k] = T.GRAVEL; } } });
  }
  function applyLayout() { layout().block.forEach(([tx, ty]) => { setT(tx, ty, T.BLD); LBLOCK.add(ty * GW + tx); }); }
  function baseTile(tx, ty) { const i = ty * GW + tx; return LBLOCK.has(i) ? MAP0.grid[i] : tileAt(tx, ty); }

  // ---------------- BARILI E BOMBOLE ----------------
  // Fusti di carburante e bombole del gas dove ha senso trovarli (distributore, cantiere, porto, discarica, poligono, cava).
  // Si colpiscono coi proiettili, col fuoco e con l'auto: prendono fuoco, poi saltano. Ogni scoppio è un evento che la città ricorda.
  const HZ = { barile: { hp: 22, r: 4.2, dmg: 95, fuse: 1.6 }, gas: { hp: 30, r: 5.2, dmg: 120, fuse: 1.1 }, bombola: { hp: 16, r: 3.4, dmg: 70, fuse: .9 } };
  const HZ_SPOTS = [['benzina', ['barile', 'barile', 'gas']], ['cantiere', ['barile', 'barile', 'barile', 'gas']], ['magazzino', ['barile', 'gas']], ['calata', ['barile', 'barile']],
    ['discarica', ['barile', 'barile', 'gas']], ['poligono', ['barile', 'barile', 'gas', 'gas']], ['cava', ['barile', 'gas']], ['officina', ['bombola', 'barile']], ['osteria', ['bombola']], ['masseria', ['bombola']]];
  function placeHazards(st) {
    st.hazards = [];
    HZ_SPOTS.forEach(([place, kinds], pi) => {
      const pl = PLACES[place]; if (!pl) return;
      // un gruppo ordinato contro un muro o in un angolo libero: prima casella buona vicino al luogo, poi in fila a passo di 1 m
      let anchor = null;
      for (let r = 3; r <= 10 && !anchor; r += 1) for (let a = 0; a < 12 && !anchor; a++) {
        const x = pl.x + Math.cos(a / 12 * 6.283 + pi) * r, y = pl.y + Math.sin(a / 12 * 6.283 + pi) * r;
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS), v = tileAt(tx, ty);
        if (!walkT(tx, ty) || v === T.VIA || v === T.STAIRS || v === T.PIER) continue;
        let ok = true; for (let k = 0; k < kinds.length; k++) { const q = tileAt(Math.floor((x + k) / TS), ty); if (!walkT(Math.floor((x + k) / TS), ty) || q === T.VIA) ok = false; }
        if (ok) anchor = [tx * TS + .6, ty * TS + 1];
      }
      if (!anchor) return;
      kinds.forEach((kind, k) => st.hazards.push({ id: 'hz' + st.hazards.length, kind, place, x: anchor[0] + k * (kind === 'gas' ? 1.25 : 1), y: anchor[1] + (k % 2 ? .25 : -.1), hp: HZ[kind].hp, fuse: 0, gone: false, by: null }));
    });
  }
  function hazardAt(st, x, y, r) { for (const h of st.hazards) if (!h.gone && Math.abs(h.x - x) < r && Math.abs(h.y - y) < r && dist(h.x, h.y, x, y) < r) return h; return null; }
  function hurtHazard(st, h, dmg, by) {
    if (h.gone) return; h.hp -= dmg; if (by) h.by = by;
    if (h.hp <= 0 && !h.fuse) { h.fuse = HZ[h.kind].fuse; st.sfx.push({ k: 'ignite', x: h.x, y: h.y }); }
  }
  function hazardBoom(st, h) {
    const H = HZ[h.kind]; h.gone = true; h.fuse = 0;
    st.fx.push({ k: 'explosion', x: h.x, y: h.y, small: h.kind === 'bombola' }); st.sfx.push({ k: 'explosion', x: h.x, y: h.y });
    blastMap(st, h.x, h.y, H.r * .7);
    st.shake = Math.max(st.shake, dist(h.x, h.y, st.player.x, st.player.y) < 20 ? .55 : .2);
    st.fires.push({ x: h.x, y: h.y, r: h.kind === 'bombola' ? 1.2 : 2, until: st.clock + 7, owner: h.by });
    const byPlayer = h.by === 'player';
    st.npcs.forEach(n => { if (n.dead || n.inside) return; const d = dist(n.x, n.y, h.x, h.y); if (d < H.r) { const a = Math.atan2(n.y - h.y, n.x - h.x); n.stun = 1.2; damage(st, n, H.dmg * (1 - d / H.r), byPlayer ? 'player' : 'env', a, 'lupara'); } });
    const p = st.player; if (!p.vehicle && dist(p.x, p.y, h.x, h.y) < H.r) damagePlayer(st, H.dmg * .6 * (1 - dist(p.x, p.y, h.x, h.y) / H.r), 0, 'esplosione');
    st.vehicles.forEach(v => { if (!v.hidden && !v.wreck && dist(v.x, v.y, h.x, h.y) < H.r + 1) damageVehicle(st, v, H.dmg * .7, h.by); });
    // la catena: i fusti vicini prendono fuoco
    st.hazards.forEach(o => { if (o !== h && !o.gone && dist(o.x, o.y, h.x, h.y) < H.r * .8) hurtHazard(st, o, 99, h.by); });
    panicAround(st, h.x, h.y, 36, 9);
    if (byPlayer) { const ev = emit(st, 'esplosione', { x: h.x, y: h.y }); addLog(st, `${clockStr(st.t)} · Hai fatto saltare ${h.kind === 'barile' ? 'un fusto di benzina' : 'una bombola del gas'} a ${ev.place}.`, 'bad', ev.id); }
  }
  function updateHazards(st, dt) {
    for (const h of st.hazards) {
      if (h.gone) continue;
      if (h.fuse > 0) { h.fuse -= dt; if (h.fuse <= 0) { h.fuse = 0; hazardBoom(st, h); } continue; }
      for (const f of st.fires) if (dist(f.x, f.y, h.x, h.y) < f.r + .4) hurtHazard(st, h, 40 * dt, f.owner);
      for (const v of st.vehicles) if (!v.hidden && Math.abs(v.speed || 0) > 7 && insideVehicle(v, h.x, h.y, .35)) hurtHazard(st, h, 99, v.rider === 'player' ? 'player' : null);
    }
  }
  // ---------------- PROIETTILI E FUOCO ----------------
  function updateProjectiles(st, dt) {
    st.proj = st.proj.filter(pr => {
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.vz -= pr.g * dt;
      if (solidM(pr.x, pr.y) && pr.z < 8) { pr.z = 0; }
      if (pr.kind === 'sasso' && pr.z > 0 && pr.z < 2.2) {   // [trame] un sasso prende chi incontra per strada
        const who = st.npcs.find(k => !k.dead && !k.inside && k.id !== pr.owner && Math.hypot(k.x - pr.x, k.y - pr.y) < .55) || (Math.hypot(st.player.x - pr.x, st.player.y - pr.y) < .55 && pr.owner !== 'player' ? st.player : null);
        if (who) { pr.z = 0; pr.hit = who; }
      }
      if (pr.z > 0) return true;
      if (pr.kind === 'sasso') { stoneLand(st, pr); return false; }
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
    st.clock += dt; if (!(inp && inp.freeze)) st.t += dt * MIN_PER_SEC * (st.timeK || 1);   // [azioni] timeK: il tempo di scena rallenta l'orologio
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
    separate(st);   // [passo]
    for (const v of st.vehicles) {
      if (v.hidden) continue;
      if (v.burning > 0) { v.burning -= dt; if (v.burning <= 0) explode(st, v); }
      if (v.wreck) { freeRoll(st, v, dt, true); continue; }
      if (v.driveTo && v.rider === 'npc' && !v.traffic) continue;   // [ordine] lo guida ordine.js (volanti, Campagnola, camion della nave)
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
    updateHazards(st, dt);
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
    if (HOOKS.step) HOOKS.step(st, dt);
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
    TS, GW, GH, WW, WH, T, OX, MAP, BUILDINGS, propHit, glassFront, npcThrow, PLACES, LABEL, NEG, SEV, JOBS, WEAPONS, VK, PICKUP_LABEL, DEBT, START_T, END_T, PLAYER_NAME,
    tileAt, walkT, walkM, seaM, boatM, bIndex, create, step, act, bmx, jumpHold, fire, reload, switchWeapon, context, talk, talkChoice, jobTarget, knowers, reputation, opinions, hostile, pickupVisible,
    attitude, enterBuilding, exitBuilding, DOOR_OF, INT, wanted: wantedLevel, wantedLevel, priceFor, clockStr, hour, day, dayName, isNight, nameOf, byId, fresh, weight, visionRange, canSee, nearestNpc, nearestVehicle,
    verbPast, youVerb, rumorText, hoursLeft, findPath, vehicleName,
    shoot, damage, kill, emit,   // [azioni]
    LANES, laneAt, lanePos, vehicleMotion, runOver, damagePlayer, arrestPlayer: arrest, parkSpot, seesPlayer,   // [ordine] volanti, posti di blocco, cariche
    HOOKS, NOISE, MIN_PER_SEC, layout, baseTile, HZ, hazardAt, hurtHazard, setTile: setT, makeVehicle, explode, damageVehicle, blastMap, goTo, stepAlong, say, addLog, feed, emit, addMemory, placeFor, nearestPlace, wanderSpot, makeNpc, walkM, los, panicAround, exitVehicle, giveWeapon, CAST,
  };
})();
if (typeof module !== 'undefined') module.exports = Game;
