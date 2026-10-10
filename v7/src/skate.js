/* Porto Vecchio — lo skate (v7, «Tavola»).
   Una tavola da skate, sei posti dove usarla e una fisica fatta per sentirla sotto i piedi.
   - I POSTI (SPOTS): il Piazzale della Cultura (banchi di granito, due banchine che si guardano, la sbarra), Piazza San Rocco
     (il blocco del manual e le panchine di marmo), Piazza del Governo (gradoni e corrimano, ma la Tutela non vuole), il Capannone
     al porto cargo (rampe di legno sotto una tettoia: d'inverno l'unico posto asciutto), la vasca vuota dei Giardini di Ponente,
     il muretto della Via al Mare. Si cercano un posto libero vicino al luogo vero (mai su strade, porte o banchi del mercato) e
     le loro caselle diventano ingombro per gli NPC (Game.layout().block), così la gente gira attorno alle rampe.
   - LA TAVOLA: in ogni posto ce n'è una appoggiata (X per prenderla). Poi X sale e scende ovunque all'aperto.
   - LA FISICA: la tavola va dove punta (le ruote non scivolano di lato). Sulle rampe conta la velocità lungo la superficie
     (l'energia si conserva: in salita si rallenta, in cima a una rampa verticale si vola dritti in su e si ricade dentro).
     Il suolo è un campo d'altezze fatto dai pezzi (banchine, rampe, quarter, funbox, piscina); i pezzi stretti (muretti, panchine,
     sbarre) sono ostacoli con gli spigoli da grindare.
   - I COMANDI: W spinta (a colpi, va verso il puntatore), S frena, A/D curva, Spazio: tieni per caricare, lascia per l'ollie.
     Mentre tieni Spazio, uno scatto del mouse sceglie il trick (a sinistra kickflip, a destra heelflip, in giù pop shove-it,
     un giro 360 flip). In aria si atterra solo a trick chiuso e con la tavola dritta, se no si cade.
     Grind e slide si agganciano da soli scendendo su uno spigolo; Spazio per uscire con un ollie. Tenendo Spazio vicino a un
     cordolo basso si fa lo slappy (anni '80).
   - LA LINEA: i trick si sommano finché si resta sulla tavola; il moltiplicatore è il numero di trick. Due secondi a terra senza
     trick chiudono la linea. Chi ti vede fare una bella linea commenta, e se è grossa lo racconta (evento `numero`: entra nelle
     memorie e nelle voci come gli altri fatti). In Piazza del Governo la Tutela ti richiama e alla terza ti sequestra la tavola.
   Stato: st.skate = { owned, total, best, warn, ... }, st.player.sk = la tavola sotto i piedi.
   Agganci: game.js `movePlayer` (una riga [skate]) e render.js dopo `swimPose` (una riga [skate]). La grafica sta in fondo. */
var Skate = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const TS = G.TS, GW = G.GW, GH = G.GH, T = G.T;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  const angD = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const GRAV = 9.8, STEP_UP = .12, PI = Math.PI;
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // =====================================================================================================================
  // I POSTI
  // Ogni pezzo: k tipo, dx/dy posizione nel posto, a angolo (le rampe salgono verso +asse), L lunghezza, W larghezza, H altezza.
  // =====================================================================================================================
  const PLAZA = [T.PIAZZA, T.WALK, T.COB], PORT = [T.QUAY, T.COB, T.WALK, T.DIRT, T.GRAVEL, T.PIAZZA, T.GRASS];
  const SPOTS = [
    { id: 'cultura', name: 'Piazzale della Cultura', place: 'cultura', tiles: PLAZA, crew: 2, pieces: [
      { k: 'bank', dx: -6.6, dy: 0, a: PI, L: 2.6, W: 3.2, H: .7, mat: 'cemento' },
      { k: 'bank', dx: 6.6, dy: 0, a: 0, L: 2.6, W: 3.2, H: .7, mat: 'cemento' },
      { k: 'ledge', dx: 0, dy: -2.6, a: 0, L: 5.5, W: .6, H: .45, mat: 'granito' },
      { k: 'ledge', dx: 0, dy: 2.6, a: 0, L: 5.5, W: .6, H: .45, mat: 'granito' },
      { k: 'rail', dx: 0, dy: 0, a: 0, L: 4, H: .35 } ] },
    { id: 'sanrocco', name: 'Piazza San Rocco', place: 'piazza', tiles: PLAZA, pieces: [
      { k: 'pad', dx: 0, dy: 0, a: 0, L: 4, W: 2, H: .2, mat: 'cemento' },
      { k: 'ledge', dx: 0, dy: -3.2, a: 0, L: 3.2, W: .5, H: .42, mat: 'marmo' },
      { k: 'ledge', dx: 0, dy: 3.2, a: 0, L: 3.2, W: .5, H: .42, mat: 'marmo' } ] },
    { id: 'governo', name: 'Piazza del Governo', place: 'piazza_gov', tiles: PLAZA, forbidden: true, pieces: [
      { k: 'ledge', dx: 0, dy: 0, a: 0, L: 8, W: .7, H: .55, mat: 'granito' },
      { k: 'rail', dx: 0, dy: 3, a: 0, L: 6, H: .55 },
      { k: 'rail', dx: 0, dy: -3, a: 0, L: 6, H: .55 } ] },
    { id: 'capannone', name: 'Il Capannone', place: 'deposito_n', tiles: PORT, covered: true, crew: 3, pieces: [
      { k: 'quarter', dx: -9, dy: 0, a: PI, L: 2.2, W: 5, H: 1.6, D: 1.2, mat: 'legno' },
      { k: 'quarter', dx: 9, dy: 0, a: 0, L: 2.2, W: 5, H: 1.6, D: 1.2, mat: 'legno' },
      { k: 'funbox', dx: 0, dy: 0, a: 0, L: 5, W: 2.6, H: .55, B: 1.6, mat: 'legno' },
      { k: 'rail', dx: 0, dy: 3.4, a: 0, L: 4, H: .4 },
      { k: 'kicker', dx: -3.6, dy: -3.4, a: 0, L: 1.4, W: 1.2, H: .45, mat: 'legno' },
      { k: 'post', dx: -11.9, dy: -5.3, a: 0 }, { k: 'post', dx: 11.9, dy: -5.3, a: 0 }, { k: 'post', dx: -11.9, dy: 5.3, a: 0 }, { k: 'post', dx: 11.9, dy: 5.3, a: 0 },
      { k: 'post', dx: 0, dy: -5.3, a: 0 }, { k: 'post', dx: 0, dy: 5.3, a: 0 } ], roof: { L: 24.4, W: 11.2, H: 4.2 } },
    { id: 'piscina', name: 'La vasca vuota', place: 'giardini', alt: ['collina_o', 'piazza_gov', 'pineta', 'lungomare', 'marina'], tiles: [T.PIAZZA, T.WALK, T.COB, T.GRASS, T.DIRT, T.SHRUB], maxR: 70, pieces: [
      { k: 'bowl', dx: 0, dy: 0, a: 0, A: 4.8, B: 3.2, RC: 2.2, R: 1.7, M: 1 },   // la vasca della fontana monumentale, prosciugata: rialzata, col bordo largo intorno
      { k: 'bank', dx: -7.3, dy: 0, a: 0, L: 3, W: 2.6, H: 1.7, mat: 'cemento' },
      { k: 'post', dx: 5.3, dy: 0, a: 0, hidden: true } ] },   // la statua sul ripiano (la disegna la vasca)   // la rampa per salire sul bordo
    { id: 'lungomare', name: 'Il muretto della Via al Mare', place: 'lungomare', tiles: [T.WALK, T.PIAZZA, T.COB, T.QUAY], pieces: [
      { k: 'ledge', dx: 0, dy: 0, a: 0, L: 10, W: .45, H: .35, mat: 'cemento' },
      { k: 'curb', dx: 0, dy: 2.4, a: 0, L: 8, W: .3, H: .2, mat: 'granito' } ] },
  ];
  const NARROW = { ledge: 1, rail: 1, post: 1, curb: 1 };   // ostacoli con spigoli, fuori dal campo d'altezze

  // coordinate locali di un pezzo: u lungo l'asse, v di lato
  const toL = (P, x, y) => { const c = Math.cos(P.ang), s = Math.sin(P.ang), dx = x - P.x, dy = y - P.y; return [dx * c + dy * s, -dx * s + dy * c]; };
  const toW = (P, u, v) => { const c = Math.cos(P.ang), s = Math.sin(P.ang); return [P.x + u * c - v * s, P.y + u * s + v * c]; };
  // ingombro locale [u0, u1, v0, v1]
  function ext(P) {
    switch (P.k) {
      case 'quarter': return [-P.L / 2, P.L / 2 + P.D, -P.W / 2, P.W / 2];
      case 'rail': return [-P.L / 2, P.L / 2, -.06, .06];
      case 'post': return [-.16, .16, -.16, .16];
      case 'bowl': return [-P.A - P.M, P.A + P.M, -P.B - P.M, P.B + P.M];
      default: return [-P.L / 2, P.L / 2, -P.W / 2, P.W / 2];
    }
  }
  const qR = P => (P.L * P.L + P.H * P.H) / (2 * P.H);   // raggio del quarter
  // distanza verso l'interno dal bordo di un rettangolo arrotondato (negativa fuori)
  function bowlIn(P, u, v) {
    const qx = Math.abs(u) - (P.A - P.RC), qy = Math.abs(v) - (P.B - P.RC);
    return -(hyp(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - P.RC);
  }
  // altezza del pezzo in (u, v), o null se fuori
  function hLocal(P, u, v) {
    const e = ext(P); if (u < e[0] || u > e[1] || v < e[2] || v > e[3]) return null;
    switch (P.k) {
      case 'pad': return P.H;
      case 'bank': return P.H * (u + P.L / 2) / P.L;
      case 'kicker': { const t = (u + P.L / 2) / P.L; return P.H * t * t; }
      case 'quarter': { if (u >= P.L / 2) return P.H; const R = qR(P), x = u + P.L / 2; return R - Math.sqrt(Math.max(0, R * R - x * x)); }
      case 'funbox': { const d = P.L / 2 - Math.abs(u); return d < P.B ? P.H * d / P.B : P.H; }
      case 'bowl': { const d = bowlIn(P, u, v); if (d < 0) return P.R; if (d >= P.R) return 0; return P.R - Math.sqrt(Math.max(0, P.R * P.R - (P.R - d) * (P.R - d))); }   // fuori dal bordo: il ripiano, alto quanto la vasca
      default: return P.H;   // pezzi stretti: la cima
    }
  }

  // ---------------- piazzamento: il posto libero più vicino al luogo ----------------
  const PIECES = [], EDGES = [], PLACED = [], MINE = new Set(), CELL = 8, GRID = new Map();
  const gkey = (cx, cy) => cx * 4096 + cy;
  function gridAdd(o, x0, y0, x1, y1) { for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) { const k = gkey(cx, cy); if (!GRID.has(k)) GRID.set(k, { p: [], e: [] }); const c = GRID.get(k); (o.k ? c.p : c.e).push(o); } }
  const near = (x, y) => GRID.get(gkey(Math.floor(x / CELL), Math.floor(y / CELL))) || { p: [], e: [] };

  (function place() {
    const L = G.layout(), taken = new Set(L.block.map(([tx, ty]) => ty * GW + tx));
    L.items.forEach(it => { if (it.tiles) for (let j = 0; j < it.tiles[3]; j++) for (let i = 0; i < it.tiles[2]; i++) taken.add((it.tiles[1] + j) * GW + it.tiles[0] + i); else taken.add(Math.floor(it.y / TS) * GW + Math.floor(it.x / TS)); });
    const PL = Object.entries(G.PLACES);
    const okTile = (tx, ty, kinds, own) => { const cx = (tx + .5) * TS, cy = (ty + .5) * TS; if (PL.some(([id, q]) => id !== own && Math.abs(q.x - cx) < 3.5 && Math.abs(q.y - cy) < 3.5)) return false; if (tx < 1 || ty < 1 || tx >= GW - 1 || ty >= GH - 1) return false; const i = ty * GW + tx; return kinds.includes(G.tileAt(tx, ty)) && !taken.has(i) && !MINE.has(i) && !G.DOOR_OF.has(i) && !(G.bIndex[i] >= 0); };
    SPOTS.forEach(S => {
      for (const pid of [S.place].concat(S.alt || [])) { const pl = G.PLACES[pid]; if (!pl) continue; if (placeSpot(S, pl, pid)) break; }
    });
    function placeSpot(S, pl, pid) {
      const ok = (cx, cy, ang) => {
        const tiles = new Set();
        const all = S.pieces.concat(S.roof ? [] : []);
        for (const q of all) {
          const P = Object.assign({}, q, { ang: ang + q.a }); [P.x, P.y] = [cx + q.dx * Math.cos(ang) - q.dy * Math.sin(ang), cy + q.dx * Math.sin(ang) + q.dy * Math.cos(ang)];
          const e = ext(P), m = .5;
          for (let u = e[0] - m; u <= e[1] + m + 1e-6; u += Math.min(1, (e[1] - e[0] + 2 * m) / 2)) for (let v = e[2] - m; v <= e[3] + m + 1e-6; v += Math.min(1, (e[3] - e[2] + 2 * m) / 2)) {
            const [x, y] = toW(P, u, v), tx = Math.floor(x / TS), ty = Math.floor(y / TS);
            if (!okTile(tx, ty, S.tiles, pid)) return null; tiles.add(ty * GW + tx);
          }
        }
        return tiles;
      };
      let best = null;
      for (let r = 3; r <= (S.maxR || 46) && !best; r += 1.5) for (let k = 0; k < 24 && !best; k++) for (const ang of [0, PI / 2]) {
        const a = k / 24 * PI * 2, cx = pl.x + Math.cos(a) * r, cy = pl.y + Math.sin(a) * r, t = ok(cx, cy, ang);
        if (t) { best = { cx, cy, ang, tiles: t }; break; }
      }
      if (!best) return false;
      const spot = { id: S.id, name: S.name, x: best.cx, y: best.cy, ang: best.ang, forbidden: !!S.forbidden, covered: !!S.covered, crew: S.crew || 0, roof: S.roof || null, pieces: [], r: 0 };
      S.pieces.forEach(q => {
        const P = Object.assign({}, q, { ang: best.ang + q.a, spot }); [P.x, P.y] = [best.cx + q.dx * Math.cos(best.ang) - q.dy * Math.sin(best.ang), best.cy + q.dx * Math.sin(best.ang) + q.dy * Math.cos(best.ang)];
        P.narrow = !!NARROW[P.k]; P.top = P.k === 'post' ? 3.2 : P.H;
        const e = ext(P), cs = [[e[0], e[2]], [e[1], e[2]], [e[0], e[3]], [e[1], e[3]]].map(([u, v]) => toW(P, u, v));
        P.bb = [Math.min(...cs.map(c => c[0])), Math.min(...cs.map(c => c[1])), Math.max(...cs.map(c => c[0])), Math.max(...cs.map(c => c[1]))];
        spot.r = Math.max(spot.r, hyp(P.x - spot.x, P.y - spot.y) + hyp(e[1] - e[0], e[3] - e[2]) / 2);
        PIECES.push(P); spot.pieces.push(P); gridAdd(P, P.bb[0] - 1, P.bb[1] - 1, P.bb[2] + 1, P.bb[3] + 1);
        edgesOf(P).forEach(E => { EDGES.push(E); gridAdd(E, Math.min(E.ax, E.bx) - 1, Math.min(E.ay, E.by) - 1, Math.max(E.ax, E.bx) + 1, Math.max(E.ay, E.by) + 1); });
      });
      // la tavola appoggiata: fuori dai pezzi, verso il luogo vero
      const da = Math.atan2(pl.y - best.cy, pl.x - best.cx);
      for (let r = spot.r + 1; r < spot.r + 12; r += 1) { const bx = best.cx + Math.cos(da) * r, by = best.cy + Math.sin(da) * r; if (G.walkM(bx, by) && !best.tiles.has(Math.floor(by / TS) * GW + Math.floor(bx / TS))) { spot.board = { x: bx, y: by }; break; } }
      if (!spot.board) spot.board = { x: pl.x, y: pl.y };
      best.tiles.forEach(i => { MINE.add(i); taken.add(i); L.block.push([i % GW, Math.floor(i / GW)]); });   // gli NPC girano attorno
      PLACED.push(spot); return true;
    }
  })();

  function edgesOf(P) {
    const E = [], add = (u0, v0, u1, v1, h, kind) => { const [ax, ay] = toW(P, u0, v0), [bx, by] = toW(P, u1, v1), len = hyp(bx - ax, by - ay); E.push({ ax, ay, bx, by, h, kind, len, ux: (bx - ax) / len, uy: (by - ay) / len, P }); };
    const L2 = (P.L || 0) / 2, W2 = (P.W || 0) / 2;
    switch (P.k) {
      case 'ledge': add(-L2, -W2, L2, -W2, P.H, 'ledge'); add(-L2, W2, L2, W2, P.H, 'ledge'); break;
      case 'curb': add(-L2, 0, L2, 0, P.H, 'curb'); break;
      case 'rail': add(-L2, 0, L2, 0, P.H, 'rail'); break;
      case 'pad': add(-L2, -W2, L2, -W2, P.H, 'ledge'); add(-L2, W2, L2, W2, P.H, 'ledge'); add(-L2, -W2, -L2, W2, P.H, 'ledge'); add(L2, -W2, L2, W2, P.H, 'ledge'); break;
      case 'funbox': add(-L2 + P.B, -W2, L2 - P.B, -W2, P.H, 'ledge'); add(-L2 + P.B, W2, L2 - P.B, W2, P.H, 'ledge'); break;
      case 'quarter': add(L2, -W2, L2, W2, P.H, 'coping'); break;
      case 'bowl': { const N = 28, pts = []; for (let i = 0; i < N; i++) { const a = i / N * PI * 2; let r = 0; for (let s = 0; s < 40; s++) { const rr = r + .25; if (bowlIn(P, Math.cos(a) * rr, Math.sin(a) * rr) < 0) break; r = rr; } pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (let i = 0; i < N; i++) { const a = pts[i], b = pts[(i + 1) % N]; add(a[0], a[1], b[0], b[1], P.R, 'coping'); } break; }
    }
    return E;
  }

  // ---------------- interrogazioni ----------------
  // quota del suolo da skate in (x, y): 0 fuori dai pezzi
  function surface(x, y) {
    let hm = null; const c = near(x, y);
    for (const P of c.p) { if (P.narrow || x < P.bb[0] - .01 || x > P.bb[2] + .01 || y < P.bb[1] - .01 || y > P.bb[3] + .01) continue;
      const [u, v] = toL(P, x, y), q = hLocal(P, u, v); if (q === null) continue;
      hm = hm === null ? q : Math.max(hm, q); }
    return hm !== null ? hm : 0;
  }
  // un pezzo stretto che occupa (x, y): la sua cima, o null
  function solidAt(x, y, r) {
    let top = null; const c = near(x, y);
    for (const P of c.p) { if (!P.narrow || x < P.bb[0] - r || x > P.bb[2] + r || y < P.bb[1] - r || y > P.bb[3] + r) continue;
      const [u, v] = toL(P, x, y), e = ext(P); if (u < e[0] - r || u > e[1] + r || v < e[2] - r || v > e[3] + r) continue; top = Math.max(top === null ? -9 : top, P.top); }
    return top;
  }
  const spotAt = (x, y, m) => PLACED.find(s => hyp(x - s.x, y - s.y) < s.r + (m || 0));
  // dove si può andare in tavola: il terreno vero, più le caselle dei posti (che per gli NPC sono ingombro)
  const free = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return MINE.has(ty * GW + tx) || G.walkM(x, y); };
  function slopes(x, y, yaw) { const e = .06, c = Math.cos(yaw), s = Math.sin(yaw), f = surface(x + c * e, y + s * e) - surface(x - c * e, y - s * e), l = surface(x - s * e, y + c * e) - surface(x + s * e, y - c * e); return [f / (2 * e), l / (2 * e)]; }

  // =====================================================================================================================
  // I TRICK
  // =====================================================================================================================
  const TRICKS = {
    ollie: { name: 'Ollie', pts: 60, dur: 0 }, kick: { name: 'Kickflip', pts: 180, dur: .55 }, heel: { name: 'Heelflip', pts: 180, dur: .55 },
    shove: { name: 'Pop shove-it', pts: 140, dur: .45 }, tre: { name: '360 flip', pts: 360, dur: .75 },   // tempi in aria: senza carica (0,49 s) solo ollie e shove-it
  };
  const AIRS = { ollie: 'Frontside air', kick: 'Indy air', heel: 'Method air', shove: 'Rock to fakie', tre: 'Madonna' };
  const GRINDS = { '50-50': [70, 50], Crooked: [100, 60], Boardslide: [100, 70], Slappy: [50, 40], 'Grind sul bordo': [90, 70] };
  // gesto del mouse (pixel dello schermo, ultimi 300 ms prima di lasciare Spazio) → trick
  function classify(samples) {
    if (!samples || !samples.length) return 'ollie';
    let sx = 0, sy = 0, len = 0; samples.forEach(s => { sx += s.dx; sy += s.dy; len += hyp(s.dx, s.dy); });
    const net = hyp(sx, sy);
    if (len < 45) return 'ollie';
    if (len > 160 && net < len * .42) return 'tre';
    if (Math.abs(sx) > Math.abs(sy) * 1.2) return sx < 0 ? 'kick' : 'heel';
    return sy > 0 ? 'shove' : 'ollie';
  }

  // =====================================================================================================================
  // STATO E COMANDI
  // =====================================================================================================================
  const S = st => st.skate || (st.skate = { owned: true,   /* [writer] la tavola ce l'hai già dall'inizio, come la BMX in tasca e i due pennelli */ total: 0, best: 0, warn: 0, warnT: -99, emitT: -99, hint: false, line: null, lastLine: null });
  const on = st => !!(st.player.sk && st.player.sk.on);
  const KEYS = { w: 0, s: 0, a: 0, d: 0, sp: 0 }, MS = []; let mouseTrack = false;
  function ctl(inp) {
    if (inp && inp.sk) return inp.sk;   // le prove passano i comandi a mano
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    while (MS.length && now - MS[0].t > 350) MS.shift();
    return { push: !!KEYS.w, brake: !!KEYS.s, turn: (KEYS.d ? 1 : 0) - (KEYS.a ? 1 : 0), crouch: !!KEYS.sp, aim: inp ? inp.aim : undefined, gesture: () => classify(MS.filter(m => now - m.t < 300)) };
  }

  function mount(st, quiet) {
    const p = st.player; if (p.vehicle || p.indoor || p.lv || p.swim) return false;
    p.sk = { on: true, z: surface(p.x, p.y), vz: 0, V: 0, vx: 0, vy: 0, yaw: p.face, air: false, grind: null, trick: null, vert: null, crouchT: null, crouchPrev: false, pushT: 0, pushA: -9, lastVS: 0, carveT: 0, boardOff: 0, airT0: 0, free: null };
    if (!quiet) G.feed(st, 'In tavola. W spinta · Spazio ollie · scatto del mouse con Spazio: flip · X scendi.', 'info');
    return true;
  }
  function dismount(st, quiet) {
    const p = st.player, k = p.sk; if (!k) return; k.on = false; k.air = false; k.grind = null; p.speed = 0;
    unstick(st);
    if (!quiet) G.feed(st, 'Giù dalla tavola.', 'info');
  }
  // a piedi non si sta dentro le caselle dei posti (per il motore sono ingombro): si scende di lato
  function unstick(st) {
    const p = st.player, i0 = Math.floor(p.y / TS) * GW + Math.floor(p.x / TS); if (!MINE.has(i0)) return;
    for (let r = 1; r < 14; r += .5) for (let k = 0; k < 16; k++) { const a = k / 16 * PI * 2, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r, i = Math.floor(y / TS) * GW + Math.floor(x / TS); if (!MINE.has(i) && G.walkM(x, y)) { p.x = x; p.y = y; return; } }
  }
  function key(st) {   // X
    const p = st.player, s = S(st);
    if (on(st)) { dismount(st); return true; }
    if (s.owned) { if (p.vehicle || p.indoor || p.lv) return false; return mount(st); }
    const sp = PLACED.find(q => q.board && hyp(q.board.x - p.x, q.board.y - p.y) < 3);
    if (sp) { s.owned = true; G.feed(st, `Hai preso la tavola del ${sp.name}. X per salire e scendere.`, 'money'); return mount(st, true); }
    return false;
  }

  // =====================================================================================================================
  // LA LINEA: trick, punti, moltiplicatore
  // =====================================================================================================================
  function addTrick(st, name, pts) {
    const s = S(st); if (!s.line) s.line = { tricks: [], pts: 0, t: st.clock };
    s.line.tricks.push(name); s.line.pts += Math.round(pts); s.line.t = st.clock;
  }
  function closeLine(st) {
    const s = S(st), L = s.line; if (!L) return; s.line = null;
    const mult = Math.min(10, L.tricks.length), tot = L.pts * mult;
    s.total += tot; s.best = Math.max(s.best, tot); s.lastLine = { tricks: L.tricks, tot, mult, t: st.clock, ok: true };
    react(st, tot);
  }
  function bail(st, why) {
    const p = st.player, k = p.sk, s = S(st); if (!k || !k.on) return;
    const sp = hyp(k.vx, k.vy) || Math.abs(k.V);
    s.lastLine = { tricks: s.line ? s.line.tricks : [], tot: 0, mult: 0, t: st.clock, ok: false, why }; s.line = null;
    k.free = { x: p.x, y: p.y, z: k.z + .1, vx: Math.cos(k.yaw) * sp * .9, vy: Math.sin(k.yaw) * sp * .9, vz: 2 + Math.random(), r: 0, t: st.clock };
    k.on = false; k.bailT = st.clock; k.air = false; k.grind = null; k.trick = null;
    const dir = hyp(k.vx, k.vy) > .3 ? Math.atan2(k.vy, k.vx) : k.yaw;
    p.kbx = Math.cos(dir) * sp * .7; p.kby = Math.sin(dir) * sp * .7; p.airT = st.clock; p.airDur = clamp(.35 + sp * .04, .35, .8); p.airH = clamp(.3 + k.z * .6 + sp * .05, .35, 1.6); p.airSpin = Math.random() < .5 ? -1 : 1;
    p.stun = 1.3; p.hurtT = st.clock; p.hp = Math.max(1, p.hp - Math.round(4 + sp * 1.3 + Math.max(0, k.z) * 4)); p.speed = 0;
    st.shake = Math.max(st.shake || 0, .25); st.sfx.push({ k: 'thud' });
    G.feed(st, why || 'Caduto!', 'bad');
    laugh(st);
  }

  // =====================================================================================================================
  // CHI GUARDA
  // =====================================================================================================================
  const WOW = ['Ammazza!', 'Ma l\'hai visto?', 'Bravo!', 'Uh, che volo.', 'Questo è matto.', 'Rifallo!'];
  const OLD = ['Ragazzi d\'oggi...', 'Si romperà l\'osso del collo.', 'Con questo freddo, poi.'];
  const LAUGH = ['Ahahah!', 'Ahia.', 'Tutto a posto?', 'Si è stampato.'];
  const CREW = ['Rocco: Grande!', 'Tina: Pulito!', 'Il Biondo: Ancora!', 'Mimmo: Sei dei nostri.'];
  function watchers(st, r) {
    const p = st.player;
    return st.npcs.filter(n => !n.dead && !n.inside && hyp(n.x - p.x, n.y - p.y) < r && G.canSee(st, n, p.x, p.y));
  }
  function react(st, tot) {
    if (tot < 250) return;
    const p = st.player, s = S(st), w = watchers(st, 16).sort(() => Math.random() - .5);
    w.slice(0, tot > 900 ? 2 : 1).forEach(n => { const old = (n.age || 30) > 55 || (n.tr && n.tr.cor < .3); G.say(st, n, (old ? OLD : WOW)[Math.floor(Math.random() * (old ? OLD : WOW).length)]); });
    const sp = spotAt(p.x, p.y, 4); if (sp && sp.crew && crewHere(st, sp)) G.feed(st, CREW[Math.floor(Math.random() * CREW.length)], 'info');
    if (tot >= 600 && w.length && st.clock - s.emitT > 60) { s.emitT = st.clock; G.emit(st, 'numero', {}); }   // lo racconteranno
  }
  function laugh(st) { const w = watchers(st, 12); if (w.length && Math.random() < .7) { const n = w[Math.floor(Math.random() * w.length)]; G.say(st, n, LAUGH[Math.floor(Math.random() * LAUGH.length)]); } }
  // la Tutela non vuole la tavola sotto il Palazzo del Governo
  function guards(st) {
    const p = st.player, s = S(st), sp = spotAt(p.x, p.y, 6); if (!sp || !sp.forbidden || st.clock - s.warnT < 25) return;
    const g = st.npcs.find(n => !n.dead && !n.inside && (n.cop || n.military) && hyp(n.x - p.x, n.y - p.y) < 22 && G.canSee(st, n, p.x, p.y)); if (!g) return;
    s.warnT = st.clock; s.warn++;
    if (s.warn < 3) G.say(st, g, s.warn === 1 ? 'Ehi tu! Qui non si gioca, è la piazza del Governo.' : 'Ultimo avviso. Giù da quella tavola.');
    else { G.say(st, g, 'La tavola la prendo io. Vai a casa.'); dismount(st, true); s.owned = false; s.warn = 0; G.feed(st, `${g.first || 'La Tutela'} ti ha sequestrato la tavola. Ce n'è un'altra negli altri posti.`, 'bad'); }
  }
  const crewHere = (st, sp) => { const h = G.hour(st); return h >= 10 && h < 19 && !(typeof window !== 'undefined' && window.__pv && window.__pv.R && window.__pv.R.isRaining && window.__pv.R.isRaining() && !sp.covered); };

  // =====================================================================================================================
  // IL MOTO (chiamato da movePlayer quando sei in tavola)
  // =====================================================================================================================
  function move(st, dt, inp) {
    const p = st.player, k = p.sk; if (!k || !k.on) return false;
    if (p.vehicle || p.indoor || p.lv || p.swim) { dismount(st, true); return false; }
    const c = ctl(inp), s = S(st);
    // Spazio: si carica tenendo, si salta lasciando
    if (c.crouch && !k.crouchPrev) k.crouchT = st.clock;
    const release = !c.crouch && k.crouchPrev, hold = release ? clamp((st.clock - (k.crouchT || st.clock)) / .4, 0, 1) : 0;
    k.crouchPrev = !!c.crouch; k.crouch = !!c.crouch;
    const gest = release ? (typeof c.gesture === 'function' ? c.gesture() : (c.flick || 'ollie')) : null;
    if (k.grind) grindStep(st, k, c, dt, release, hold, gest);
    else if (k.air) airStep(st, k, c, dt, release, gest);
    else groundStep(st, k, c, dt, release, hold, gest);
    if (!k.on) return true;
    // la linea si chiude a terra, dopo un po' senza trick
    if (s.line && !k.air && !k.grind && st.clock - s.line.t > 2) closeLine(st);
    hitPeople(st, k);
    guards(st);
    p.speed = st.clock - k.pushA < .45 ? 2.4 : 0;   // le gambe si muovono solo quando spingi
    p.face = k.yaw; p.anim += dt;
    return true;
  }
  const wetK = (st, k) => { const p = st.player, sp = spotAt(p.x, p.y, 2); if (sp && sp.covered) return 1; const R = typeof window !== 'undefined' && window.__pv && window.__pv.R; return R && R.isRaining && R.isRaining() ? 1.9 : 1.25; };   // d'inverno all'aperto la tavola scorre peggio

  function groundStep(st, k, c, dt, release, hold, gest) {
    const p = st.player;
    // sterzo: A/D a mano; con W la tavola va verso il puntatore
    const rate = 2.9 / (1 + Math.abs(k.V) / 7);
    if (c.turn) k.yaw += c.turn * rate * dt;
    else if (c.push && c.aim !== undefined && !k.crouch) { const tr = k.V >= -.2 ? k.yaw : k.yaw + PI; k.yaw += clamp(angD(c.aim, tr) * 2.2, -rate, rate) * dt; }
    let [sF, sL] = slopes(p.x, p.y, k.yaw);
    if (Math.abs(sL) > .25 && Math.abs(k.V) > .5) k.yaw += clamp(-sL * .55, -.9, .9) * dt * Math.sign(k.V);   // sulla parete la tavola cade verso il basso
    // spinta a colpi
    k.pushT -= dt;
    if (c.push && k.pushT <= 0 && !k.crouch && k.V > -.5 && Math.abs(sF) < .3) { k.V = k.V < .3 ? 2.2 : k.V + 2.3 * clamp(1 - k.V / 8.5, 0, 1); k.pushT = .6; k.pushA = st.clock; }
    if (c.brake) k.V -= Math.sign(k.V) * Math.min(Math.abs(k.V), 3.4 * dt);
    // gravità lungo la superficie, attrito di rotolamento e aria
    const n1 = Math.sqrt(1 + sF * sF);
    k.V += -GRAV * sF / n1 * dt;
    k.V -= Math.sign(k.V) * Math.min(Math.abs(k.V), (.22 * wetK(st, k) + .011 * k.V * k.V) * dt);
    // ollie
    if (release) { pop(st, k, hold, gest, Math.cos(k.yaw) * k.V / n1, Math.sin(k.yaw) * k.V / n1); return; }
    // slappy: tenendo Spazio contro un cordolo basso
    if (k.crouch && Math.abs(k.V) > 1.5) { const E = findEdge(p.x, p.y, k.z, Math.cos(k.yaw) * k.V, Math.sin(k.yaw) * k.V, true); if (E) { lockGrind(st, k, E, Math.cos(k.yaw) * k.V, Math.sin(k.yaw) * k.V, 'Slappy'); return; } }
    const u = k.V / n1, nx = p.x + Math.cos(k.yaw) * u * dt, ny = p.y + Math.sin(k.yaw) * u * dt, Sn = surface(nx, ny), sol = solidAt(nx, ny, .18);
    const rise = STEP_UP + Math.abs(u * dt) * Math.max(0, sF, slopes(nx, ny, k.yaw)[0]) * 1.15;   // sulle rampe si sale col passo, contro i fianchi no
    const blocked = !free(nx, ny) || Sn - k.z > rise || (sol !== null && sol > k.z + STEP_UP * .6);
    if (blocked) { if (Math.abs(k.V) > 3.6) return bail(st, 'Contro il muro!'); k.V = -k.V * .2; return; }
    const vs = (Sn - k.z) / dt;
    if (k.z - Sn > STEP_UP) { const vt = Math.abs(k.lastSF || 0) > 1.6; takeoff(st, k, vt ? p.x : nx, vt ? p.y : ny, Math.cos(k.yaw) * u, Math.sin(k.yaw) * u, k.lastVS, vt); return; }   // giù da un gradino, o dalla cima di una rampa
    if (k.lastVS - vs > GRAV * dt * 1.6 && k.lastVS > .9) {   // il bordo di una rampa: si vola
      const vt = Math.abs(k.lastSF || 0) > 1.6; takeoff(st, k, vt ? p.x : nx, vt ? p.y : ny, Math.cos(k.yaw) * u, Math.sin(k.yaw) * u, k.lastVS, vt); return;
    }
    p.x = nx; p.y = ny; k.z = Sn; k.lastVS = vs; k.lastSF = sF; k.vx = Math.cos(k.yaw) * u; k.vy = Math.sin(k.yaw) * u;
    // carve: sulle pareti curve, a lungo
    if (Math.abs(sF) > .6 || Math.abs(sL) > .6) { k.carveT += dt; if (k.carveT > 1.4) { k.carveT = 0; addTrick(st, 'Carve', 80); } } else k.carveT = Math.max(0, k.carveT - dt);
  }
  function pop(st, k, hold, gest, vx, vy) {
    const t = TRICKS[gest] || TRICKS.ollie;
    k.air = true; k.vz = 2.4 + 2.2 * hold + (gest === 'ollie' ? .15 : 0); k.vx = vx; k.vy = vy; k.airT0 = st.clock; k.vert = null;   // da 30 cm a più di un metro
    k.trick = { id: gest, name: t.name, pts: t.pts, dur: t.dur, t0: st.clock };
    st.sfx.push({ k: 'legno' });
  }
  function takeoff(st, k, x, y, vx, vy, vz, vert) {
    const p = st.player; p.x = x; p.y = y;
    k.air = true; k.vx = vx; k.vy = vy; k.vz = vz; k.airT0 = st.clock; k.trick = null; k.vert = null;
    if (vert && vz > 1.5) {   // da una parete verticale: dritti in su, mezzo giro in aria, si ricade dentro
      k.vx = -Math.cos(k.yaw) * .3; k.vy = -Math.sin(k.yaw) * .3; const T0 = 2 * vz / GRAV;   // un filo verso la rampa: si ricade dentro
      k.vert = { from: k.yaw, t0: st.clock, T: T0 };
      k.trick = { id: 'air', name: 'Air', pts: 120, dur: 0, t0: st.clock, air: true };
    }
  }
  function airStep(st, k, c, dt, release, gest) {
    const p = st.player;
    if (k.vert) { const q = clamp((st.clock - k.vert.t0) / (k.vert.T * .8), 0, 1); k.yaw = k.vert.from + PI * q; }
    // in aria su una rampa verticale, il gesto fatto lasciando Spazio sceglie la presa
    if (release && k.trick && k.trick.air && gest) { k.trick.name = AIRS[gest] || 'Air'; k.trick.pts = 120 + (gest === 'ollie' ? 60 : 160); }
    k.vz -= GRAV * dt;
    const nx = p.x + k.vx * dt, ny = p.y + k.vy * dt, nz = k.z + k.vz * dt, hs = hyp(k.vx, k.vy);
    if (!free(nx, ny)) { if (hs > 3) return bail(st, 'Contro il muro!'); k.vx = k.vy = 0; }
    // grind: scendendo su uno spigolo
    if (k.vz <= 0) { const E = findEdgeAir(nx, ny, k.z, nz, k.vx, k.vy); if (E) {
      if (k.trick && !k.trick.air && st.clock - k.trick.t0 < k.trick.dur) return bail(st, 'Non hai chiuso il trick.');
      if (k.trick && !k.trick.air) addTrick(st, k.trick.name, k.trick.pts); k.trick = null;
      p.x = nx; p.y = ny; lockGrind(st, k, E, k.vx, k.vy); return; } }
    const sol = solidAt(nx, ny, .12);
    if (sol !== null && nz < sol - (k.vz > 0 ? .2 : .05)) { if (hs > 3.2) return bail(st, 'Hai preso lo spigolo.'); k.vx = k.vy = 0; }   // salendo si perdona un po'
    let Sn = surface(p.x + k.vx * dt, p.y + k.vy * dt);
    if (Sn - k.z > STEP_UP + .1 + hs * dt * Math.max(0, slopes(p.x + k.vx * dt, p.y + k.vy * dt, Math.atan2(k.vy, k.vx))[0]) * 1.15) { if (hs > 3.2) return bail(st, 'Contro la rampa.'); k.vx = k.vy = 0; Sn = surface(p.x, p.y); }   // il fianco di una rampa
    if (nz <= Sn) return land(st, k, p.x + k.vx * dt, p.y + k.vy * dt, Sn);
    p.x += k.vx * dt; p.y += k.vy * dt; k.z = nz;
  }
  function land(st, k, x, y, Sn) {
    const p = st.player, hs = hyp(k.vx, k.vy), air = st.clock - k.airT0;
    if (k.trick && !k.trick.air && air < k.trick.dur) return bail(st, 'Troppo basso: il trick non si è chiuso.');
    const hv = hs > .6 ? Math.atan2(k.vy, k.vx) : k.yaw, d = Math.abs(angD(hv, k.yaw)), fakie = d > PI / 2, mis = fakie ? PI - d : d;
    if (hs > 1.6 && mis > .8) return bail(st, 'Atterrato di traverso.');
    const [sF] = slopes(x, y, k.yaw), n1 = Math.sqrt(1 + sF * sF);
    const vn = (k.vz - sF * (k.vx * Math.cos(k.yaw) + k.vy * Math.sin(k.yaw))) / n1;   // botta lungo la normale
    if (vn < -9) return bail(st, 'Troppo alto.');
    k.V = ((k.vx * Math.cos(k.yaw) + k.vy * Math.sin(k.yaw)) + k.vz * sF) / n1 * .93;
    p.x = x; p.y = y; k.z = Sn; k.air = false; k.lastVS = 0; k.vert = null; k.lastSF = sF;
    if (k.trick) { const t = k.trick, bonus = Math.max(0, air - .55) * 120; addTrick(st, t.name + (fakie && !t.air ? ' (fakie)' : ''), (t.pts + bonus) * (fakie && !t.air ? 1.2 : 1)); k.trick = null; }
    st.sfx.push({ k: 'legno' });
  }

  // ---------------- grind ----------------
  function segDist(E, x, y) { const t = clamp((x - E.ax) * E.ux + (y - E.ay) * E.uy, 0, E.len); return [hyp(E.ax + E.ux * t - x, E.ay + E.uy * t - y), t]; }
  function findEdgeAir(x, y, z0, z1, vx, vy) {
    const hs = hyp(vx, vy); if (hs < 1) return null; let best = null, bd = .5;
    for (const E of near(x, y).e) { if (z0 < E.h - .08 || z1 > E.h + .12) continue; const [d, t] = segDist(E, x, y); if (d > bd || t < .15 || t > E.len - .15) continue;
      const along = Math.abs(vx * E.ux + vy * E.uy); if (along < 1.1) continue; bd = d; best = E; }
    return best;
  }
  function findEdge(x, y, z, vx, vy) {   // slappy: cordoli e spigoli bassi presi da terra
    for (const E of near(x, y).e) { if (E.h > .32 || E.h - z < .05 || (E.kind !== 'curb' && E.kind !== 'ledge')) continue; const [d, t] = segDist(E, x, y); if (d > .45 || t < .2 || t > E.len - .2) continue;
      const hs = hyp(vx, vy), a = Math.acos(clamp(Math.abs(vx * E.ux + vy * E.uy) / (hs || 1), 0, 1)); if (a < .45) return E; }
    return null;
  }
  function lockGrind(st, k, E, vx, vy, force) {
    const p = st.player, hs = hyp(vx, vy) || 1, along = vx * E.ux + vy * E.uy, a = Math.acos(clamp(Math.abs(along) / hs, 0, 1));
    const kind = force || (E.kind === 'coping' ? 'Grind sul bordo' : a < .35 ? '50-50' : a < .75 ? 'Crooked' : 'Boardslide');
    const [, t] = segDist(E, p.x, p.y);
    k.grind = { E, s: t, s0: t, dir: Math.sign(along) || 1, v: Math.abs(along) * .95, kind, t0: st.clock };
    k.air = false; k.z = E.h; k.vz = 0; k.yaw = Math.atan2(E.uy * k.grind.dir, E.ux * k.grind.dir);
    k.boardOff = kind === 'Boardslide' ? PI / 2 : kind === 'Crooked' ? .4 : 0;
    st.sfx.push({ k: 'palo' });
  }
  function grindStep(st, k, c, dt, release, hold, gest) {
    const p = st.player, g = k.grind, E = g.E;
    g.v -= (E.kind === 'rail' ? .7 : E.kind === 'coping' ? 1.1 : 1.5) * (g.kind === 'Boardslide' ? 1.3 : 1) * dt;
    g.s += g.v * g.dir * dt;
    const done = release || g.v < .7 || g.s < 0 || g.s > E.len;
    const sc = clamp(g.s, 0, E.len); p.x = E.ax + E.ux * sc; p.y = E.ay + E.uy * sc; k.z = E.h;
    if (!done) return;
    const m = Math.abs(sc - g.s0), base = GRINDS[g.kind] || [70, 50];
    addTrick(st, `${g.kind} ${m.toFixed(1)} m`, base[0] + base[1] * m);
    k.grind = null; k.boardOff = 0;
    const vx = E.ux * g.dir * g.v, vy = E.uy * g.dir * g.v;
    if (release) { pop(st, k, hold, gest, vx, vy); k.z = E.h; }
    else { // in fondo allo spigolo: si scende di là
      const ox = p.x + E.ux * g.dir * .2, oy = p.y + E.uy * g.dir * .2; p.x = ox; p.y = oy;
      k.air = true; k.vx = vx; k.vy = vy; k.vz = .4; k.airT0 = st.clock; k.trick = null; k.vert = null;
      if (surface(ox, oy) >= k.z - .02) { k.air = false; k.V = g.v; k.z = surface(ox, oy); }
    }
  }
  // addosso alla gente
  function hitPeople(st, k) {
    const p = st.player, hs = k.grind ? k.grind.v : (hyp(k.vx, k.vy) || Math.abs(k.V)); if (hs < 1 || k.z > .9) return;
    for (const n of st.npcs) { if (n.dead || n.inside || Math.abs(n.x - p.x) > .7 || Math.abs(n.y - p.y) > .7 || hyp(n.x - p.x, n.y - p.y) > .55) continue;
      if (hs > 3.2) { n.stun = Math.max(n.stun || 0, 1.4); n.kbx = Math.cos(k.yaw) * hs * .5; n.kby = Math.sin(k.yaw) * hs * .5; G.say(st, n, 'Ma guarda dove vai!'); bail(st, `Addosso a ${n.first || 'un passante'}.`); }
      else { k.V *= .3; k.vx *= .3; k.vy *= .3; }
      return; }
  }
  // dopo la caduta ci si rialza e si torna sulla tavola
  function step(st, dt) {
    const p = st.player, k = p.sk; if (!k) return;
    if (!k.on && k.bailT !== undefined && st.clock - k.bailT > 1.8 && p.stun <= 0 && S(st).owned && !p.vehicle && !p.indoor) { const b = k.free; if (b) { p.x = b.x; p.y = b.y; } k.bailT = undefined; k.free = null; mount(st, true); }
    if (!k.on && k.free && st.clock - k.free.t > 1.8 && k.bailT === undefined) k.free = null;
    if (!k.on && !k.free && p.stun <= 0) unstick(st);
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Skate]', e); } } }; }
  // il fatto nuovo: "ha fatto i numeri con lo skate"
  G.SEV.numero = .3; G.NOISE.numero = 6; G.LABEL.numero = 'Numeri con lo skate';
  { const prev = G.HOOKS.verb; G.HOOKS.verb = (st, m, T) => m.type === 'numero' ? `ha fatto i numeri con lo skate${m.place ? ' a ' + m.place : ''}` : (prev ? prev(st, m, T) : null); }

  // =====================================================================================================================
  // LA GRAFICA (solo nel browser)
  // =====================================================================================================================
  const GFX = { built: false, board: null, free: null, crew: [], loose: [], hud: null, hint: null };
  const PPM = 8;
  function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
  function speckle(g, w, h, base, cols, n, seed) { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const r = hash(i, seed); g.fillStyle = cols[Math.floor(hash(seed, i) * cols.length)]; g.fillRect(Math.floor(r * w), Math.floor(hash(i * 7, seed + 3) * h), 1, 1); } }
  const TEX = {};
  function texOf(kind) {
    if (TEX[kind]) return TEX[kind];
    let c, g;
    if (kind === 'cemento') { c = cvs(32, 32); g = c.getContext('2d'); speckle(g, 32, 32, '#8f8b85', ['#7d7973', '#a19d96', '#6e6a65'], 160, 3); g.fillStyle = 'rgba(40,36,32,.18)'; g.fillRect(3, 20, 9, 5); g.fillRect(20, 4, 6, 4); g.fillStyle = '#6b6761'; g.fillRect(0, 31, 32, 1); g.fillRect(31, 0, 1, 32); }
    else if (kind === 'granito') { c = cvs(32, 32); g = c.getContext('2d'); speckle(g, 32, 32, '#b3ada4', ['#8a847b', '#d6d1c8', '#6f6a63', '#c4b9ab'], 340, 5); }
    else if (kind === 'marmo') { c = cvs(32, 32); g = c.getContext('2d'); speckle(g, 32, 32, '#dcd7ce', ['#cfc9bf', '#e8e4dc'], 120, 7); g.strokeStyle = 'rgba(120,115,108,.45)'; g.beginPath(); g.moveTo(0, 9); g.lineTo(11, 14); g.lineTo(19, 11); g.lineTo(32, 18); g.moveTo(4, 27); g.lineTo(15, 24); g.lineTo(32, 29); g.stroke(); }
    else if (kind === 'cera') { c = cvs(8, 8); g = c.getContext('2d'); g.fillStyle = '#3b3833'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#56524b'; g.fillRect(0, 2, 8, 1); }
    else if (kind === 'legno') { c = cvs(32, 32); g = c.getContext('2d'); g.fillStyle = '#5a4634'; g.fillRect(0, 0, 32, 32); for (let i = 0; i < 90; i++) { g.fillStyle = hash(i, 9) < .5 ? '#4e3c2c' : '#66503b'; g.fillRect(Math.floor(hash(i, 2) * 32), Math.floor(hash(i, 4) * 32), 1 + Math.floor(hash(i, 6) * 3), 1); } g.fillStyle = '#3d2f23'; g.fillRect(0, 15, 32, 1); g.fillStyle = 'rgba(20,16,12,.35)'; g.fillRect(10, 6, 7, 2); g.fillRect(22, 24, 5, 2); }
    else if (kind === 'compensato') { c = cvs(32, 32); g = c.getContext('2d'); for (let y = 0; y < 32; y++) { g.fillStyle = y % 4 === 0 ? '#8a6a45' : y % 4 === 2 ? '#c49a62' : '#b48a56'; g.fillRect(0, y, 32, 1); } }
    else if (kind === 'lamiera') { c = cvs(16, 16); g = c.getContext('2d'); for (let x = 0; x < 16; x++) { g.fillStyle = x % 4 < 2 ? '#757b7e' : '#5d6366'; g.fillRect(x, 0, 1, 16); } g.fillStyle = 'rgba(122,62,30,.5)'; g.fillRect(2, 11, 5, 3); g.fillRect(10, 3, 3, 2); }
    else if (kind === 'ferro') { c = cvs(8, 8); g = c.getContext('2d'); g.fillStyle = '#2d3238'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#9aa1a6'; g.fillRect(0, 0, 8, 2); }
    TEX[kind] = tex(c); return TEX[kind];
  }
  const MAT = {};
  function mat(kind, rep) { const k = kind + (rep || ''); if (!MAT[k]) MAT[k] = new THREE.MeshLambertMaterial({ map: texOf(kind), side: THREE.DoubleSide }); return MAT[k]; }
  // una scritta sul fianco delle rampe (tag di vernice, non della Risacca: dei ragazzi)
  function tagTex(seed) {
    const words = ['SK8', 'ZEBRA', 'P.V. 86', 'TINA', 'CAPANNONE', 'ROCCO', 'NO FUTURE'], w = words[Math.floor(hash(seed, 1) * words.length)];
    const c = cvs(64, 32), g = c.getContext('2d'); g.drawImage(texOf('compensato').image, 0, 0, 64, 32);
    g.font = 'bold 13px monospace'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#111'; const col = ['#ff3d8b', '#3ee0d0', '#ffd23a', '#9b5cff'][Math.floor(hash(seed, 3) * 4)];
    g.save(); g.translate(32, 20); g.rotate(-.12 + hash(seed, 5) * .24); g.strokeText(w, 0, 0); g.fillStyle = col; g.fillText(w, 0, 0); g.restore();
    return new THREE.MeshLambertMaterial({ map: tex(c), side: THREE.DoubleSide });
  }
  // estrude un profilo [[u, h], …] largo W: sopra la superficie, ai lati le fiancate, dietro la parete
  function extrude(prof, W, mTop, mSide, base) {
    const b = base === undefined ? -.25 : base, top = [], side = [], back = [];
    const quad = (A, a, b2, c2, d) => { A.push(...a, ...b2, ...c2, ...a, ...c2, ...d); };
    let acc = 0; const uvT = [];
    for (let i = 0; i < prof.length - 1; i++) {
      const [u0, h0] = prof[i], [u1, h1] = prof[i + 1], l = hyp(u1 - u0, h1 - h0);
      quad(top, [u0, h0, W / 2], [u1, h1, W / 2], [u1, h1, -W / 2], [u0, h0, -W / 2]);
      uvT.push(acc, W, acc + l, W, acc + l, 0, acc, W, acc + l, 0, acc, 0); acc += l;
      for (const z of [-W / 2, W / 2]) { if (z < 0) quad(side, [u0, b, z], [u1, b, z], [u1, h1, z], [u0, h0, z]); else quad(side, [u0, b, z], [u0, h0, z], [u1, h1, z], [u1, b, z]); }
    }
    const [ue, he] = prof[prof.length - 1], [us, hs] = prof[0];
    if (he > 0) quad(back, [ue, b, -W / 2], [ue, he, -W / 2], [ue, he, W / 2], [ue, b, W / 2]);
    if (hs > 0) quad(back, [us, b, W / 2], [us, hs, W / 2], [us, hs, -W / 2], [us, b, -W / 2]);
    const mk = (arr, uv, m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); if (!uv) { uv = []; for (let i = 0; i < arr.length; i += 3) uv.push(arr[i] + arr[i + 2] * .7, arr[i + 1]); } uv = uv.map(q => q * .25); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; };
    const grp = new THREE.Group(); grp.add(mk(top, uvT, mTop)); grp.add(mk(side, null, mSide)); if (back.length) grp.add(mk(back, null, mSide)); return grp;
  }
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
  function pieceMesh(P, seed) {
    const g = new THREE.Group(), L2 = (P.L || 0) / 2, W = P.W || 0, iron = mat('ferro');
    const steel = new THREE.MeshLambertMaterial({ color: '#8e979c' });
    switch (P.k) {
      case 'ledge': case 'curb': {
        const m = mat(P.mat || 'granito'); g.add(box(P.L, P.H + .2, W, m, 0, (P.H - .2) / 2, 0));
        const wax = mat('cera'); [-1, 1].forEach(s => g.add(box(P.L - .1, .015, .05, wax, 0, P.H + .006, s * (W / 2 - .025))));   // la cera sugli spigoli
        break; }
      case 'rail': {
        g.add(box(P.L, .05, .05, iron, 0, P.H - .025, 0));
        const n = Math.max(2, Math.round(P.L / 2) + 1); for (let i = 0; i < n; i++) { const u = -L2 + .15 + i * (P.L - .3) / (n - 1); g.add(box(.04, P.H, .04, iron, u, P.H / 2, 0)); g.add(box(.16, .02, .16, iron, u, .01, 0)); }
        break; }
      case 'post': if (P.hidden) break; g.add(box(.26, 4.3, .26, new THREE.MeshLambertMaterial({ color: '#4a4f52' }), 0, 2.1, 0)); g.add(box(.4, .05, .4, iron, 0, .025, 0)); break;
      case 'pad': { g.add(extrude([[-L2, P.H], [L2, P.H]], W, mat('cemento'), mat('cemento'))); [-1, 1].forEach(s => g.add(box(P.L, .03, .04, steel, 0, P.H, s * W / 2))); [-1, 1].forEach(s => g.add(box(.04, .03, W, steel, s * L2, P.H, 0))); break; }
      case 'bank': g.add(extrude([[-L2, 0], [L2, P.H]], W, mat('cemento'), mat('cemento'))); break;
      case 'kicker': { const pr = []; for (let i = 0; i <= 6; i++) { const u = -L2 + P.L * i / 6; pr.push([u, hLocal(P, u, 0)]); } g.add(extrude(pr, W, mat('legno'), mat('compensato'))); g.add(box(.05, .02, W, steel, L2 - .02, P.H, 0)); break; }
      case 'quarter': {
        const pr = []; for (let i = 0; i <= 14; i++) { const u = -L2 + P.L * i / 14; pr.push([u, hLocal(P, u, 0)]); } pr.push([L2 + P.D, P.H]);
        g.add(extrude(pr, W, mat('legno'), tagTex(seed)));
        const cop = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, W, 8), steel); cop.rotation.x = PI / 2; cop.position.set(L2, P.H, 0); g.add(cop);
        g.add(box(P.D, .9, .04, iron, L2 + P.D / 2, P.H + .45, -W / 2)); g.add(box(.04, .9, W, iron, L2 + P.D, P.H + .45, 0));   // la ringhiera della pedana
        break; }
      case 'funbox': { const pr = [[-L2, 0], [-L2 + P.B, P.H], [L2 - P.B, P.H], [L2, 0]]; g.add(extrude(pr, W, mat('legno'), tagTex(seed))); [-1, 1].forEach(s => g.add(box(P.L - 2 * P.B, .04, .05, steel, 0, P.H, s * W / 2))); break; }
      case 'bowl': g.add(bowlMesh(P)); break;
    }
    return g;
  }
  // la vasca: una griglia con le quote vere; il ripiano di cemento intorno, le pietre del bordo, le mattonelle chiare dentro,
  // una fascia blu sotto il bordo, il fondo sporco con un po' di neve; fuori, il muro della vasca fino a terra
  function bowlMesh(P) {
    const st = .2, M = P.M, u0 = -P.A - M, u1 = P.A + M, v0 = -P.B - M, v1 = P.B + M, nu = Math.round((u1 - u0) / st), nv = Math.round((v1 - v0) / st);
    const pos = [], col = [], C = new THREE.Color();
    const H = (u, v) => hLocal(P, clamp(u, u0, u1), clamp(v, v0, v1));
    const color = (u, v, h) => {
      const d = bowlIn(P, u, v);
      if (d < -.32) { C.set('#8d8983'); C.offsetHSL(0, 0, (hash(Math.floor(u * 2.5) + 50, Math.floor(v * 2.5) + 50) - .5) * .07); if (((u + 20) % 1.25) < .06 || ((v + 20) % 1.25) < .06) C.multiplyScalar(.85); return C; }   // il ripiano a lastre
      if (d < 0) { C.set('#d8cfbd'); return C; }   // le pietre del bordo
      const tu = Math.floor((u + 9) / .25), tv = Math.floor((v + 9) / .25), line = ((u + 9) % .25 < .03) || ((v + 9) % .25 < .03);
      if (h > P.R - .32) C.set(((tu + tv) & 1) ? '#244d7a' : '#2b5a8c');   // la fascia sotto il bordo
      else if (h < .02 && hash(tu, tv * 3) < .3 + (Math.abs(u) < 2 && Math.abs(v) < 1.4 ? .4 : 0)) C.set(hash(tu, tv) < .5 ? '#e9eef0' : '#cfd6d9');   // neve e fanghiglia sul fondo
      else C.set('#9cc6cf');
      if (line) C.multiplyScalar(.82); if (h < .02) C.offsetHSL(0, -.1, -.06 * hash(tu, tv));
      return C;
    };
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const ua = u0 + i * st, ub = ua + st, va = v0 + j * st, vb = va + st, q = [[ua, va], [ub, va], [ub, vb], [ua, vb]].map(([u, v]) => [u, H(u, v), v]);
      const cu = (ua + ub) / 2, cv = (va + vb) / 2, cc = color(cu, cv, H(cu, cv));
      [q[0], q[2], q[1], q[0], q[3], q[2]].forEach(p => { pos.push(...p); col.push(cc.r, cc.g, cc.b); });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const o = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); o.receiveShadow = true; o.castShadow = true;
    const grp = new THREE.Group(); grp.add(o);
    // il muro esterno della vasca, intonaco con lo zoccolo
    const wall = new THREE.MeshLambertMaterial({ color: '#a39d93', side: THREE.DoubleSide }), foot = new THREE.MeshLambertMaterial({ color: '#6f6a63' });
    const L = u1 - u0, W = v1 - v0;
    [[0, v0, L, .12], [0, v1, L, .12]].forEach(([x, z, l, t]) => { grp.add(box(l, P.R + .3, t, wall, x, (P.R - .3) / 2, z)); grp.add(box(l + .02, .35, t + .04, foot, x, .02, z)); });
    [[u0, 0, W], [u1, 0, W]].forEach(([x, z, l]) => { grp.add(box(.12, P.R + .3, l, wall, x, (P.R - .3) / 2, z)); grp.add(box(.16, .35, l + .02, foot, x, .02, z)); });
    const dr = new THREE.Mesh(new THREE.CircleGeometry(.18, 10), new THREE.MeshLambertMaterial({ color: '#1f2326' })); dr.rotation.x = -PI / 2; dr.position.set(0, .015, 0); grp.add(dr);   // lo scarico
    // la vecchia statua della fontana, senza testa, su un lato del ripiano
    const stone = new THREE.MeshLambertMaterial({ color: '#cfc8bb' }); grp.add(box(.7, .5, .7, stone, P.A + M / 2, P.R + .25, 0)); grp.add(box(.34, 1.1, .3, stone, P.A + M / 2, P.R + 1.05, 0));
    return grp;
  }
  function roofMesh(sp) {
    const R = sp.roof, g = new THREE.Group(), m = mat('lamiera').clone();
    const r = box(R.L, .06, R.W, m, 0, R.H, 0); r.rotation.x = .05; g.add(r);
    const snow = box(R.L - .2, .12, R.W - .3, new THREE.MeshLambertMaterial({ color: '#e7ecef' }), 0, R.H + .1, 0); snow.rotation.x = .05; g.add(snow);
    [-1, 0, 1].forEach(s => g.add(box(.18, .3, R.W, new THREE.MeshLambertMaterial({ color: '#4a4f52' }), s * (R.L / 2 - .3), R.H - .18, 0)));
    g.add(box(R.L, .3, .18, new THREE.MeshLambertMaterial({ color: '#4a4f52' }), 0, R.H - .18, -R.W / 2 + .3)); g.add(box(R.L, .3, .18, new THREE.MeshLambertMaterial({ color: '#4a4f52' }), 0, R.H - .18, R.W / 2 - .3));
    const lamp = new THREE.PointLight('#ffd59a', .8, 18, 2); lamp.position.set(0, R.H - .5, 0); g.add(lamp); g.userData.lamp = lamp;   // la lampada sotto la tettoia, accesa la sera
    g.userData.mats = []; g.traverse(o => { if (o.isMesh && !g.userData.mats.includes(o.material)) g.userData.mats.push(o.material); }); g.userData.op = 1;
    return g;
  }
  // la tavola: piatta e larga come negli anni '80, coda rialzata, ruote morbide colorate
  function boardMesh(seed) {
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const cols = ['#ff3d8b', '#2fd1c4', '#ffd23a', '#ff7a2a', '#9b5cff'], top = new THREE.MeshLambertMaterial({ color: '#1d1d1f' }), under = new THREE.MeshLambertMaterial({ color: cols[seed % cols.length] });
    inner.add(box(.62, .025, .25, top, 0, .1, 0)); inner.add(box(.62, .01, .25, under, 0, .085, 0));
    const tail = box(.16, .025, .23, top, -.37, .125, 0); tail.rotation.z = .35; inner.add(tail); const nose = box(.12, .025, .22, top, .35, .115, 0); nose.rotation.z = -.25; inner.add(nose);
    const truck = new THREE.MeshLambertMaterial({ color: '#b7bec2' }), wheel = new THREE.MeshLambertMaterial({ color: ['#f2f2ea', '#ffd23a', '#2fd1c4'][seed % 3] });
    [-.2, .2].forEach(u => { inner.add(box(.05, .04, .2, truck, u, .055, 0)); [-.11, .11].forEach(v => { const w = new THREE.Mesh(new THREE.CylinderGeometry(.033, .033, .035, 10), wheel); w.rotation.x = PI / 2; w.position.set(u, .033, v); inner.add(w); }); });
    g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.userData.inner = inner; return g;
  }
  // fonde le mesh ferme di un gruppo in una per materiale (stesso aspetto, molte meno chiamate di disegno)
  function mergeByMat(src) {
    src.updateMatrixWorld(true); const by = new Map(), out = new THREE.Group();
    src.traverse(o => { if (!o.isMesh) return; if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); });
    by.forEach((list, m) => {
      const parts = list.map(o => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
      const names = Object.keys(parts[0].attributes).filter(n => parts.every(g => g.attributes[n] && g.attributes[n].itemSize === parts[0].attributes[n].itemSize));
      const geo = new THREE.BufferGeometry();
      names.forEach(n => { const k = parts[0].attributes[n].itemSize, arr = new Float32Array(parts.reduce((a, g) => a + g.attributes[n].count * k, 0)); let off = 0; parts.forEach(g => { arr.set(g.attributes[n].array, off); off += g.attributes[n].array.length; }); geo.setAttribute(n, new THREE.BufferAttribute(arr, k)); });
      if (!geo.attributes.normal) geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = list.some(o => o.castShadow); mesh.receiveShadow = true; out.add(mesh);
      parts.forEach(g => g.dispose());
    });
    return out;
  }
  function build(R) {
    const scene = R.__models.scene; GFX.group = new THREE.Group(); scene.add(GFX.group);
    // ogni posto è un gruppo suo: i pezzi fusi per materiale, e si disegna solo quando la camera è vicina
    PLACED.forEach(sp => { const raw = new THREE.Group(); sp.pieces.forEach(P => { const m = pieceMesh(P, PIECES.indexOf(P) + 3); m.position.set(P.x, R.groundH(P.x, P.y) - .02, P.y); m.rotation.y = -P.ang; raw.add(m); }); sp.__g = mergeByMat(raw); GFX.group.add(sp.__g); });
    PLACED.forEach((sp, i) => {
      if (sp.roof) { const r = roofMesh(sp); r.position.set(sp.x, R.groundH(sp.x, sp.y), sp.y); r.rotation.y = -sp.ang; sp.__g.add(r); sp.__roof = r; }
      const b = boardMesh(i); b.position.set(sp.board.x, R.groundH(sp.board.x, sp.board.y), sp.board.y); b.userData.inner.rotation.z = 1.25; b.userData.inner.position.y = .3; b.rotation.y = i; sp.__g.add(b); sp.__board = b;
      // il segnale: un cerchio giallo a terra, come i raccoglibili
      const ring = new THREE.Mesh(new THREE.RingGeometry(.45, .58, 20), new THREE.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: .55, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.set(sp.board.x, R.groundH(sp.board.x, sp.board.y) + .04, sp.board.y); sp.__g.add(ring); sp.__ring = ring;
    });
    GFX.board = boardMesh(1); GFX.board.visible = false; scene.add(GFX.board);
    clearProps(R);
    GFX.built = true;
  }
  // gli oggetti di scena della città (panchine, barili, casse…) che cadono dentro un posto si tolgono, come fa l'editor
  function clearProps(R) {
    const E = R.__ed, DZ = R.__dz; if (!E || !E.hideTag || !DZ || !DZ.props) return;
    DZ.props.forEach(rec => { if (rec.state) return; const c = rec.c0 || rec.c; if (!c) return; const x = c.x, y = c.z;
      if (PIECES.some(P => x > P.bb[0] - .9 && x < P.bb[2] + .9 && y > P.bb[1] - .9 && y < P.bb[3] + .9)) { try { E.hideTag(rec.tag); rec.state = 2; } catch (e) { } } });
  }
  // i ragazzi dello skate: solo grafica, vanno avanti e indietro su una corsia libera del posto e saltano
  const LOOKS = [{ skin: '#e2b48f', top: '#2fd1c4', bottom: '#2b3445', hair: '#3a2416', hat: 'none', build: .95 }, { skin: '#c99772', top: '#ff3d8b', bottom: '#1f2733', hair: '#d9b45a', hat: 'none', build: .9 }, { skin: '#dcae88', top: '#f2f2ea', bottom: '#3b2f6b', hair: '#17110e', hat: 'none', build: 1 }];
  function crewInit(R) {
    PLACED.filter(s => s.crew).forEach(sp => {
      let lane = null; for (const dv of [-4.6, 4.6, -1.5, 1.5, -6, 6]) { let ok = true; for (let du = -6; du <= 6; du += .5) { const x = sp.x + du * Math.cos(sp.ang) - dv * Math.sin(sp.ang), y = sp.y + du * Math.sin(sp.ang) + dv * Math.cos(sp.ang); if (surface(x, y) !== 0 || solidAt(x, y, .3) !== null || !free(x, y)) { ok = false; break; } } if (ok) { lane = dv; break; } }
      if (lane === null) return;
      for (let i = 0; i < sp.crew; i++) GFX.crew.push({ sp, lane: lane + (i - (sp.crew - 1) / 2) * .9, ph: i * 2.3, g: null, b: null, look: LOOKS[(i + sp.pieces.length) % LOOKS.length] });
    });
  }
  function crewFrame(st, R, dt) {
    const scene = R.__models.scene, cam = R.getCamera && R.getCamera(), t = st.clock;
    GFX.crew.forEach(C => {
      const show = crewHere(st, C.sp) && (!cam || hyp(cam.position.x - C.sp.x, cam.position.z - C.sp.y) < 90);
      if (!C.g && show && window.Models && Models.charsReady()) { C.g = Models.person(C.look, null); C.b = boardMesh(C.ph | 0); scene.add(C.g); scene.add(C.b); }
      if (!C.g) return; C.g.visible = C.b.visible = show; if (!show) return;
      const T0 = 9, q = ((t / T0 + C.ph / T0) % 1), dir = q < .5 ? 1 : -1, k = q < .5 ? q * 2 : (q - .5) * 2, u = (-6 + 12 * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)) * dir;
      const x = C.sp.x + u * Math.cos(C.sp.ang) - C.lane * Math.sin(C.sp.ang), y = C.sp.y + u * Math.sin(C.sp.ang) + C.lane * Math.cos(C.sp.ang), yaw = C.sp.ang + (dir < 0 ? PI : 0);
      const jp = Math.abs(u) < 1.2 ? Math.sin((u + 1.2) / 2.4 * PI) * .45 : 0, gy = R.groundH(x, y);
      C.b.position.set(x, gy + jp, y); C.b.rotation.y = -yaw; C.b.userData.inner.rotation.x = jp > .05 && C.ph > 2 ? (u + 1.2) / 2.4 * PI * 2 : 0;
      C.g.position.set(x, gy + jp + .12, y); C.g.rotation.y = PI / 2 - (yaw + PI / 2);
      Models.animPerson(C.g, { speed: 0 }, dt);
    });
  }
  // la posa del giocatore (chiamata da render.js dopo swimPose)
  function pose(pg, st, playerH, dt) {
    if (!GFX.built) return;
    const p = st.player, k = p.sk, B = GFX.board;
    if (k && k.free) {   // la tavola che vola via dopo la caduta
      const f = k.free; f.vz -= GRAV * dt; if (free(f.x + f.vx * dt, f.y + f.vy * dt)) { f.x += f.vx * dt; f.y += f.vy * dt; } else { f.vx *= -.3; f.vy *= -.3; } f.z = Math.max(0, f.z + f.vz * dt); if (f.z === 0) { f.vz = Math.abs(f.vz) > 1 ? -f.vz * .3 : 0; f.vx *= .9; f.vy *= .9; } f.r += dt * 9 * hyp(f.vx, f.vy) / 4;
      B.visible = true; B.position.set(f.x, (window.__pv.R.groundH(f.x, f.y)) + f.z, f.y); B.userData.inner.rotation.set(f.r, 0, 0); return;
    }
    if (!k || !k.on) { B.visible = false; return; }
    const lift = k.z + (k.grind ? 0 : 0), crouch = k.crouch ? .14 : (k.air ? .06 : 0);
    B.visible = true; B.position.set(p.x, playerH + lift, p.y); B.rotation.y = -(k.yaw + k.boardOff);
    const I = B.userData.inner, [sF] = k.air || k.grind ? [0] : slopes(p.x, p.y, k.yaw); I.rotation.set(0, 0, 0); I.rotation.z = Math.atan(sF);
    if (k.trick && !k.trick.air) { const q = clamp((st.clock - k.trick.t0) / (k.trick.dur || .4), 0, 1), id = k.trick.id;
      if (id === 'kick') I.rotation.x = q * PI * 2; else if (id === 'heel') I.rotation.x = -q * PI * 2; else if (id === 'shove') I.rotation.y = q * PI; else if (id === 'tre') { I.rotation.x = q * PI * 2; I.rotation.y = q * PI * 2; } }
    if (k.grind && k.grind.kind === 'Crooked') I.rotation.x = .25;
    pg.position.y = playerH + lift + .12 - crouch + (k.trick && !k.trick.air && st.clock - k.trick.t0 < (k.trick.dur || .3) ? .12 : 0);
    pg.rotation.y = PI / 2 - (k.yaw + k.boardOff + PI / 2);   // di traverso sulla tavola
  }
  // ---------------- HUD: la linea in corso, il totale ----------------
  function hud(st) {
    if (!GFX.hud) {
      const d = document.createElement('div'); d.id = 'skateHud';
      d.style.cssText = 'position:fixed;left:50%;top:74px;transform:translateX(-50%);text-align:center;pointer-events:none;z-index:30;font:700 15px/1.25 monospace;color:#ffd23a;text-shadow:2px 2px 0 #ff3d8b,0 0 6px rgba(0,0,0,.6);letter-spacing:.5px;transition:opacity .25s';
      document.body.appendChild(d); GFX.hud = d;
    }
    const s = S(st), d = GFX.hud, p = st.player;
    let html = '';
    if (s.line) { const m = Math.min(10, s.line.tricks.length); html = `${s.line.tricks.slice(-4).join(' + ')}<br><span style="font-size:20px">${s.line.pts} × ${m}</span>`; }
    else if (s.lastLine && st.clock - s.lastLine.t < 2.5) html = s.lastLine.ok ? `<span style="font-size:22px">+${s.lastLine.tot}</span><br><span style="font-size:12px;color:#f2f2ea">${s.lastLine.tricks.slice(-3).join(' + ')}</span>` : `<span style="color:#ff6a5a;text-shadow:2px 2px 0 #3a0d0d">${s.lastLine.why || 'Caduto!'}</span>`;
    else if (on(st)) html = `<span style="font-size:12px;color:#f2f2ea;text-shadow:1px 1px 0 #000">Skate · ${s.total} punti${s.best ? ' · record ' + s.best : ''}</span>`;
    else { const sp = !s.owned && PLACED.find(q => q.board && hyp(q.board.x - p.x, q.board.y - p.y) < 3); if (sp) html = `<span style="font-size:13px;color:#f2f2ea;text-shadow:1px 1px 0 #000">X · prendi la tavola (${sp.name})</span>`; else if (s.owned && !p.vehicle && !p.indoor && spotAt(p.x, p.y, 3)) html = `<span style="font-size:12px;color:#f2f2ea;text-shadow:1px 1px 0 #000">X · in tavola</span>`; }
    if (d.__h !== html) { d.innerHTML = html; d.__h = html; } d.style.opacity = html ? 1 : 0;
  }
  function frame() {
    const pv = window.__pv, st = pv && pv.st, R = pv && pv.R;
    if (st && R && R.__models && R.__models.scene && R.groundH) {
      try {
        if (!GFX.built) { build(R); crewInit(R); }
        const now = performance.now() / 1000, dt = Math.min(.1, now - (frame.t || now)); frame.t = now;
        crewFrame(st, R, dt); hud(st);
        const cam = R.cam || {}, cx = cam.x !== undefined ? cam.x : st.player.x, cy = cam.y !== undefined ? cam.y : st.player.y, far = 75 * Math.max(1, (window.__pv.ui && window.__pv.ui.zoom) || 1);
        PLACED.forEach(sp => { if (sp.__g) { sp.__g.visible = hyp(cx - sp.x, cy - sp.y) < far + sp.r; if (!sp.__g.visible) return; } const has = S(st).owned; if (sp.__board) sp.__board.visible = !has; if (sp.__ring) { sp.__ring.visible = !has; sp.__ring.material.opacity = .35 + .25 * Math.sin(now * 3); } if (sp.__roof) { const u = sp.__roof.userData; u.lamp.intensity = G.isNight(st) || G.hour(st) < 8 || G.hour(st) >= 17 ? 1.1 : 0;
          // la tettoia sparisce quando ci sei sotto o vicino, come gli edifici: dall'alto si vedono le rampe
          const p = st.player, inR = hyp(p.x - sp.x, p.y - sp.y) < sp.r + 7, to = inR ? 0 : 1; u.op += (to - u.op) * Math.min(1, dt * 5);
          sp.__roof.visible = u.op > .03; u.mats.forEach(m => { m.transparent = u.op < .98; m.opacity = u.op; m.depthWrite = u.op >= .98; }); } });
        if (GFX.st !== st) { GFX.st = st; clearProps(R); }   // a ogni partita nuova la grafica rimette gli oggetti: si ritolgono
      } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[Skate]', e); } }
    }
    requestAnimationFrame(frame);
  }
  if (typeof window !== 'undefined') {
    addEventListener('keydown', e => {
      const pv = window.__pv, st = pv && pv.st, ui = pv && pv.ui; if (!st || (ui && (ui.book || ui.menu || ui.dialog || ui.intro || ui.over))) return;
      const k = e.key.toLowerCase();
      if (k === 'x' && !e.repeat) { if (key(st)) e.preventDefault(); return; }
      if (!on(st)) return;
      if (k === 'w' || k === 'arrowup') KEYS.w = 1; else if (k === 's' || k === 'arrowdown') KEYS.s = 1; else if (k === 'a' || k === 'arrowleft') KEYS.a = 1; else if (k === 'd' || k === 'arrowright') KEYS.d = 1;
      else if (k === ' ') { if (!KEYS.sp) MS.length = 0; KEYS.sp = 1; mouseTrack = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k === 'w' || k === 'arrowup') KEYS.w = 0; else if (k === 's' || k === 'arrowdown') KEYS.s = 0; else if (k === 'a' || k === 'arrowleft') KEYS.a = 0; else if (k === 'd' || k === 'arrowright') KEYS.d = 0; else if (k === ' ') { KEYS.sp = 0; mouseTrack = false; } });
    addEventListener('blur', () => { KEYS.w = KEYS.s = KEYS.a = KEYS.d = KEYS.sp = 0; });
    let lx = null, ly = null;
    addEventListener('mousemove', e => { if (lx !== null && mouseTrack) MS.push({ t: performance.now(), dx: e.clientX - lx, dy: e.clientY - ly }); lx = e.clientX; ly = e.clientY; });
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 250); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }

  return { SPOTS: PLACED, PIECES, EDGES, surface, solidAt, spotAt, free, move, mount, dismount, key, on, pose, classify, TRICKS, S, _: { addTrick, closeLine, bail, lockGrind, MINE, hLocal, toL } };
})();
if (typeof module !== 'undefined') module.exports = Skate;
