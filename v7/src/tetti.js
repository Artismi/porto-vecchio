/* Porto Vecchio — i tetti (v7, «Writer»).
   Su ogni edificio c'è una scala a pioli di ferro (sul fianco o sul retro, mai sulla porta; su un tetto più basso se la casa
   non ha un lato libero). V ai piedi della scala: sali; V in cima: scendi. Sopra si cammina davvero:
   - LA QUOTA dei tetti è quella del modello (la grafica la misura con un raggio dall'alto, un metro alla volta: terrazzi,
     falde, comignoli e parapetti compresi); finché non l'ha misurata vale la regola dei piani (3,6 m + 2,4 a piano).
   - DA TETTO A TETTO: se si tocca, si passa (un gradino fino a 65 cm si sale, più in basso si scende saltando giù); se c'è un
     vicolo in mezzo si salta (Spazio, tieni per caricare): in aria il vuoto si attraversa, se atterri nel vuoto cadi in strada.
   - CADERE: fino a 4,5 m si atterra bene, oltre ci si fa male (e oltre 12 m molto male).
   - Sul tetto c'è la roba sui tetti (oggetti.js: p.onRoof) e ci sono i muri che da sotto non si raggiungono: gli heaven spot.
   Stato: st.player.lv = { k: 'tetto', b: indice dell'edificio, h: quota dei piedi } | { k: 'scala', L, up, t }.
   Si aggancia a Livelli (freeFn, moved, heightOf, key) senza toccarne il codice; la grafica (in fondo) disegna le scale. */
var Tetti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const LV = typeof Livelli !== 'undefined' ? Livelli : require('./livelli.js');
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, EL = G.MAP.elev, BI = W.bIndex, B = G.BUILDINGS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  const MG = 3.6, MF = 2.4;                   // come render.js: piano terra e piani sopra
  const STEP = .65, SAFE = 4.5, CLIMB_V = 1.7; // gradino che si sale camminando, caduta senza danni, velocità sulla scala (m/s)
  const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const tileH = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return inb(tx, ty) ? EL[ty * GW + tx] : 0; };
  // [tetti4] col lotto libero (girato, o col centro e le misure suoi) la casa sotto un punto si legge dal lotto, non dalla casella: le
  // caselle sono l'impronta approssimata, e fra due lotti attaccati possono lasciare un buco o sporgere. Senza lotti liberi: la casella.
  let LIB4 = null, SEP4 = 9;
  const bAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!inb(tx, ty)) return -1; const i = BI[ty * GW + tx];
    const L = LIB4 && LIB4.get(ty * GW + tx); if (L && !(i >= 0 && B[i] && !libero4(B[i]))) { for (const q of L) if (dentro4(B[q], x, y, 0)) return q;   // la casella di una casa sulla pianta resta sua
      for (const q of L) if (dentro4(B[q], x, y, -.25)) return q;   // la gronda: fra due lotti un varco fino a 50 cm si scavalca
      if (i >= 0 && B[i]) return -1; }
    return i >= 0 && B[i] ? i : -1; };

  // ---------------- LA QUOTA DEI TETTI ----------------
  // la regola dei piani (prima che la grafica misuri il modello)
  function roofRule(b) {
    const base = b.base || 0;
    if (b.lighthouse) return base + 12;
    if (b.kiosk) return base + 2.8;
    return base + (b.fl >= 1 ? MG + (b.fl - 1) * MF : 3);
  }
  // la quota del tetto dell'edificio bi nel punto x, y (null: lì non c'è tetto, per esempio un cortile)
  function roofH(bi, x, y) {
    const b = B[bi]; if (!b) return null;
    const g = b.__rH; if (!g) return roofRule(b);
    const W1 = b.w * TS, gx = clamp(Math.floor(x - b.x * TS), 0, W1 - 1), gy = clamp(Math.floor(y - b.y * TS), 0, b.h * TS - 1), v = g[gy * W1 + gx];
    return Number.isFinite(v) ? v : null;
  }
  // il tetto sotto un punto: { bi, h } o null
  function roofAt(x, y) {
    const bi = bAt(x, y), h = bi < 0 ? null : roofH(bi, x, y), q = h === null ? null : { bi, h };
    const pk = PLANKS.length ? plankAt(x, y) : null;   // [tetti2] sulla passerella vale la quota delle assi (anche sopra il vicolo)
    const r = pk && (!q || pk.h >= q.h - .05) ? pk : q;
    const cm = CAMM.length ? cammAt(x, y) : null;   // [percorsi] sul camminamento delle mura, sopra il rilevato
    return cm && (!r || cm.h >= r.h - .05) ? cm : r;
  }

  // ---------------- LE SCALE ----------------
  // una per edificio (due per i grandi), sul lato libero più nascosto: fianchi e retro, meglio negli angoli
  const DOOR = b => b.door ? b.door : null;
  function sidesOf(b) {
    return [
      { f: 'S', n: b.w, out: [0, 1], tile: k => [b.x + k, b.y + b.h], wall: k => [(b.x + k + .5) * TS, (b.y + b.h) * TS] },
      { f: 'N', n: b.w, out: [0, -1], tile: k => [b.x + k, b.y - 1], wall: k => [(b.x + k + .5) * TS, b.y * TS] },
      { f: 'E', n: b.h, out: [1, 0], tile: k => [b.x + b.w, b.y + k], wall: k => [(b.x + b.w) * TS, (b.y + k + .5) * TS] },
      { f: 'W', n: b.h, out: [-1, 0], tile: k => [b.x - 1, b.y + k], wall: k => [b.x * TS, (b.y + k + .5) * TS] },
    ];
  }
  function frontOf(b) {
    const d = DOOR(b); if (!d) return null;
    if (d[1] >= b.y + b.h) return 'S'; if (d[1] < b.y) return 'N'; if (d[0] >= b.x + b.w) return 'E'; if (d[0] < b.x) return 'W'; return null;
  }
  const LADDERS = [];
  // [tetti4] LE CASE GIRATE (b.rot: la casa che segue la sua strada, render.js rotRec la gira attorno al centro; le caselle restano dritte).
  // Il tetto, il parapetto, il terrazzo vivono nel riferimento della casa: questi aiuti passano dal mondo alla casa e ritorno, e dicono se un
  // punto sta davvero dentro la casa girata (non nella casella).
  const rotC4 = b => b && b.rot && !b.sign && !b.shop ? b.rot : 0;
  // [tetti4] IL LOTTO ORIENTATO ([pianta]): la casa ha il suo centro libero in metri (b.cx, b.cy), la sua larghezza e profondità nel suo
  // riferimento (b.lw lungo la x locale, b.ld lungo la y locale) e b.rot attorno al centro; le caselle sono solo l'impronta approssimata.
  // Senza i campi vale la casella: (b.x + b.w/2)·TS, (b.y + b.h/2)·TS, b.w·TS, b.h·TS (identico a prima). Il riferimento della casa è il
  // mondo girato di −rot attorno al centro: lì la casa occupa [cx − lw/2, cx + lw/2] × [cy − ld/2, cy + ld/2], e lì stanno il piano dei
  // tetti (rect, gruppi, colmo, riserve), i tetti vissuti e le misure.
  const L4C = new WeakMap();   // [tetti4] il lotto di ogni casa, rifatto solo se cambiano i suoi campi
  function lotto4(b) {
    const c = L4C.get(b); if (c && c.s0 === b.cx && c.s1 === b.cy && c.s2 === b.lw && c.s3 === b.ld && c.s4 === b.x && c.s5 === b.y && c.s6 === b.w && c.s7 === b.h) return c;
    const cx = b.cx !== undefined ? b.cx : (b.x + b.w / 2) * TS, cy = b.cy !== undefined ? b.cy : (b.y + b.h / 2) * TS, lw = b.lw !== undefined ? b.lw : b.w * TS, ld = b.ld !== undefined ? b.ld : b.h * TS;
    const L = { cx, cy, lw, ld, x0: cx - lw / 2, x1: cx + lw / 2, y0: cy - ld / 2, y1: cy + ld / 2, s0: b.cx, s1: b.cy, s2: b.lw, s3: b.ld, s4: b.x, s5: b.y, s6: b.w, s7: b.h }; L4C.set(b, L); return L;
  }
  // la casa sta fuori dalle sue caselle? (girata, o col centro e le misure suoi)
  const libero4 = b => { if (!b) return false; if (rotC4(b)) return true; if (b.cx === undefined && b.lw === undefined) return false; const L = lotto4(b);
    return Math.abs(L.x0 - b.x * TS) > .01 || Math.abs(L.y0 - b.y * TS) > .01 || Math.abs(L.x1 - (b.x + b.w) * TS) > .01 || Math.abs(L.y1 - (b.y + b.h) * TS) > .01; };
  const cen4 = b => { const L = lotto4(b); return [L.cx, L.cy]; };
  // il punto del muro del lotto che corrisponde alla casella k del lato sd (riferimento della casa): stessa frazione lungo il lato
  // [tetti4] il piede della scala davanti al muro del lotto: a 55 cm, o più in là (fino a 95 cm) se il lotto arretrato lascia la fascia della casella che non si cammina
  const piede4 = (wx, wy, ox, oy) => { for (let d = .55; d <= .951; d += .1) { const x = wx + ox * d, y = wy + oy * d; if (G.walkM(x, y) && bAt(x, y) < 0) return d; } return .55; };
  const muroL4 = (b, sd, k) => { const L = lotto4(b), u = (k + .5) / sd.n; return sd.f === 'S' ? [L.x0 + L.lw * u, L.y1] : sd.f === 'N' ? [L.x0 + L.lw * u, L.y0] : sd.f === 'E' ? [L.x1, L.y0 + L.ld * u] : [L.x0, L.y0 + L.ld * u]; };
  const giraV4 = (a, ux, uy) => { if (!a) return [ux, uy]; const c = Math.cos(a), s = Math.sin(a); return [ux * c - uy * s, ux * s + uy * c]; };
  const toW4 = (b, lx, ly) => { const a = rotC4(b); if (!a) return [lx, ly]; const [cx, cy] = cen4(b), [qx, qy] = giraV4(a, lx - cx, ly - cy); return [cx + qx, cy + qy]; };
  const fuori4 = (b, x, y) => { const [lx, ly] = toL4(b, x, y), L = lotto4(b), dx = Math.max(0, L.x0 - lx, lx - L.x1), dy = Math.max(0, L.y0 - ly, ly - L.y1); return hyp(dx, dy); };   // [tetti4] quanto fuori dal lotto (agli spigoli in tondo)
  const toL4 = (b, x, y) => { const a = rotC4(b); if (!a) return [x, y]; const [cx, cy] = cen4(b), [qx, qy] = giraV4(-a, x - cx, y - cy); return [cx + qx, cy + qy]; };
  const dentro4 = (b, x, y, m) => { const [lx, ly] = toL4(b, x, y), L = lotto4(b); return lx >= L.x0 + m && lx <= L.x1 - m && ly >= L.y0 + m && ly <= L.y1 - m; };
  // il raggio da (x, y) nel verso (ux, uy) contro il rettangolo girato della casa: { tin, tout, cos } (cos: fra il raggio e la normale della faccia d'entrata)
  function raggio4(b, x, y, ux, uy) {
    const [lx, ly] = toL4(b, x, y), [dx, dy] = giraV4(-rotC4(b), ux, uy), L4 = lotto4(b), x0 = L4.x0, x1 = L4.x1, y0 = L4.y0, y1 = L4.y1;
    let tin = -Infinity, tout = Infinity, nin = null;
    for (const [p, d, lo, hi, n] of [[lx, dx, x0, x1, 'x'], [ly, dy, y0, y1, 'y']]) {
      if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) return null; continue; }
      let t0 = (lo - p) / d, t1 = (hi - p) / d; if (t0 > t1) { const t = t0; t0 = t1; t1 = t; }
      if (t0 > tin) { tin = t0; nin = n; } if (t1 < tout) tout = t1; }
    if (tin > tout || tout < 0) return null;
    return { tin, tout, cos: nin === 'x' ? Math.abs(dx) : Math.abs(dy) };
  }
  const girata4 = (a, b) => !!(libero4(a) || libero4(b));
  // [pulizia2] i pezzi urbani grandi della città nuova (W.pezzi, le caselle che riservano): una scala che ci sta dietro, vista dalla camera
  // (che guarda da sud-est), non si vede; meglio un altro lato
  const PZ = (W.pezzi || []).map(p => p.imp || !p.opz ? p : p.tipo === 'portico' ? Object.assign({}, p, { misura: true, imp: [[0, 0, p.opz.campate * p.opz.campata, -p.opz.profondita / 2, p.opz.profondita / 2]] }) : p.tipo === 'carro_merci' ? Object.assign({}, p, { misura: true, imp: [[0, 0, 10, -1.5, 1.5]] }) : p)   // [pianta] il portico e il carro sul tronchino non riservano caselle: l'ingombro dalle misure
    .filter(p => p.imp && p.tipo !== 'binari' && p.tipo !== 'bitta'), CAM = Math.SQRT1_2;
  const inPz = (x, y, pad0) => PZ.some(p => { const pad = p.misura ? pad0 + .4 : /portico|porta_terra|tettoia/.test(p.tipo) ? pad0 + 2 : pad0, c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dy = y - p.y, l = dx * c - dy * s, z = dx * s + dy * c; return p.imp.some(r => l >= r[1] - pad && l <= r[2] + pad && z >= r[3] - pad && z <= r[4] + pad); });   // le volte dei portici sporgono oltre le caselle riservate
  const coperta = (wx, wy, ox, oy) => { if (!PZ.length) return false; for (let a = .3; a <= 2.3; a += .5) for (let b = 0; b <= 11; b += 1) if (inPz(wx + ox * a + CAM * b, wy + oy * a + CAM * b, .3)) return true; return false; };
  // [tetti3] LA CITTÀ NUOVA (le case con l'epoca): le salite si vedono. La camera guarda da sud-est, alta 41°: una scala sui lati
  // nord e ovest sta dietro la sua casa; una sul lato sud o est si vede, se davanti non c'è un'altra casa più alta o un pezzo grande.
  const CN3 = B.some(b => b.era), PIT3 = .72, TAN3 = Math.tan(PIT3);
  const hPz3 = (x, y) => { let h = -1; for (const p of PZ) { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dy = y - p.y, l = dx * c - dy * s, z = dx * s + dy * c;
    if (p.imp.some(r => l >= r[1] && l <= r[2] && z >= r[3] && z <= r[4])) h = Math.max(h, (p.q || 0) + ((p.opz && p.opz.h) || 6)); } return h; };
  // la cima di una casa per il raggio, prima del piano dei tetti: le case del borgo e dell'Ottocento possono avere la falda (il colmo)
  const alto03 = b => roofRule(b) + ((b.era === 'E0' || b.era === 'E3') && !b.torre && !b.annesso ? Math.min(b.w, b.h) * TS / 2 * Math.tan(b.era === 'E3' ? .42 : .3) + .2 : .6);
  // il raggio dalla camera: dal punto (x, y, z) verso la camera, ogni mezzo metro fino a 45 m; true se nessuna casa e nessun pezzo lo taglia
  function vista3(x, y, z, salta) {
    for (let d = .5; d <= 45; d += .5) {
      const px = x + CAM * d, py = y + CAM * d, pz = z + d * TAN3, o = bAt(px, py);
      if (o >= 0 && o !== salta && (!libero4(B[o]) || dentro4(B[o], px, py, -.3)) && alto03(B[o]) > pz) return false;   // [tetti4] il rettangolo girato
      if (PZ.length && hPz3(px, py) > pz) return false;
      if (pz > 40) return true;
    }
    return true;
  }
  // una scala si vede se almeno due dei tre punti (il piede, la metà, la cima), un palmo fuori dal muro, vedono la camera
  function scalaVista3(wx, wy, ox, oy, h0, h1) {
    let n = 0; for (const t of [.12, .5, .9]) if (vista3(wx + ox * .35, wy + oy * .35, h0 + (h1 - h0) * t, -1)) n++;
    return n >= 2;
  }
  // i palazzi del potere, le chiese e le caserme non hanno la scala dalla strada (era la scala antincendio americana sul Governo)
  const potere3 = b => CN3 && !b.era && (b.gov || b.military || b.church);
  const vicinoTetto3 = (b, bi) => { for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) { if (!inb(tx, ty)) continue; const o = BI[ty * GW + tx];
    if (o >= 0 && o !== bi && B[o] && !B[o].lighthouse && Math.abs(roofRule(B[o]) - roofRule(b)) <= 1.2) return true; } return false; };
  // ---------------- [scale-finestre] LE APERTURE DELLE FACCIATE ----------------
  // Andrea: «scala su finestra, capita quasi ovunque». La scala di ferro stava al centro di una casella, cioè proprio sulla colonna
  // delle finestre: render.js monta le facciate a moduli di una casella (buildModular: la finestra al centro del modulo) o coi blocchi
  // del kit urbano (casaKit). Qui le stesse regole, dagli stessi dati (la casa, la vista del lotto come BLD(), le caselle, gli hash th
  // di render.js), dicono dove la facciata ha le aperture: finestre, porte, vetrine e insegne delle botteghe, la scala esterna della
  // marina, le serrande del kit. Dove render.js tira a sorte (rng) si sta larghi: l'apertura c'è.
  // Ogni apertura ha due misure: il VANO (il buco nel muro: dalla scala ci vogliono almeno 25 cm, sempre) e l'INGOMBRO (le persiane
  // aperte, il davanzale, il balcone che sta sulla finestra, la tettoia e il balcone del kit: la scala li evita se può). La scala
  // va prima sul muro cieco (la colonna senza finestre a nessun piano, nessun ingombro), poi fra due colonne di finestre (fra i vani
  // di due finestre di un modulo restano 1,05 m: la scala ne prende 49, 28 cm d'aria per parte), mai sopra un vano.
  // aperture4(bi) → { S, N, E, W: [[u0, u1, y0, y1, vano]] } con u lungo la faccia come sidesOf (S e N da ovest, E e W da nord, nel
  // riferimento della casa), y sopra il piede della casa, vano 1 (il buco) o 0 (l'ingombro); null se la facciata non la monta
  // buildModular né casaKit.
  const SCALA_HW4 = .245, SCALA_AGIO4 = .25;   // mezza larghezza della scala (i due montanti, 44 cm l'uno dall'altro, spessi 5) e l'aria fino al vano
  const thR4 = (tx, ty, s) => { let h = (tx * 374761393 + ty * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };   // render.js th
  const ZN4 = G.MAP.Z || {}, ZONA4 = G.MAP.zone || null;
  const modKind4 = b => b.gov ? 'civic' : b.military ? (b.warehouse ? 'port' : 'mil') : b.warehouse ? 'port' : (b.farm || /^(masseria|cantina|ovile_b|salinaio)$/.test(b.id || '')) ? 'farm' : /^(commissariato|biblioteca|ambulatorio)$/.test(b.id || '') ? 'civic' : 'borgo';   // render.js modKind
  const faceOf4 = b => !b.door ? 'S' : b.door[1] === b.y + b.h ? 'S' : b.door[0] === b.x + b.w ? 'E' : b.door[1] === b.y - 1 ? 'N' : 'W';   // render.js faceOf
  const EPOCA4 = { E0: { wide: false, winP: .62 }, E2: { wide: false, winP: .75 }, E3: { wide: false, winP: 1 }, E4: { wide: true, winP: 1 }, E6: { wide: true, winP: 1 } };   // render.js epPiano: X.upper, X.winP
  // come render.js BLD(): la casa col lotto suo si monta dritta sulla sua scatola (caselle frazionarie), le porte sulla faccia giusta
  function vista4(b) {
    if (!(b.cx !== undefined && !b.__tierOf && !(b.tiers && b.tiers.length) && (Math.abs(b.cx - (b.x + b.w / 2) * TS) > .01 || Math.abs(b.cy - (b.y + b.h / 2) * TS) > .01 || Math.abs(b.lw - b.w * TS) > .01 || Math.abs(b.ld - b.h * TS) > .01))) return b;
    const a = b.rot && !b.sign && !b.shop ? b.rot : 0, c = Math.cos(a), s = Math.sin(a), vx = b.cx / TS - b.lw / (2 * TS), vy = b.cy / TS - b.ld / (2 * TS), vw = b.lw / TS, vh = b.ld / TS;
    const porta = d => { if (!d) return d; const X = (d[0] + .5) * TS - b.cx, Y = (d[1] + .5) * TS - b.cy, lx = X * c + Y * s, ly = -X * s + Y * c, cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const ux = cl((b.cx + lx) / TS - .5, vx, vx + vw - 1), uy = cl((b.cy + ly) / TS - .5, vy, vy + vh - 1);
      return Math.abs(ly) / vh >= Math.abs(lx) / vw ? [ux, ly > 0 ? vy + vh : vy - 1] : [lx > 0 ? vx + vw : vx - 1, uy]; };
    const V = Object.create(b); Object.assign(V, { x: vx, y: vy, w: vw, h: vh, door: porta(b.door) }); if (b.shopFront) V.shopFront = Object.assign({}, b.shopFront, { door: porta(b.shopFront.door) }); return V;
  }
  // quale costruttore di render.js monta la casa (buildBuildings): 'kit' (casaKit, usaKit34), 'moduli' (buildModular), null (gli altri)
  function muratore4(b) {
    if (b.pezzo || b.lighthouse || b.id === 'rocca') return null;
    if (b.kiosk) return 'chiosco'; if (b.shack) return 'baracca';
    if (b.church || (b.gov && b.id)) return null;
    if (b.deco) return 'deco';
    if (b.house && !b.fisher && !b.farm && !b.block && !(b.tiers && b.tiers.length) && !b.name && ZONA4) { const z = ZONA4[b.y * GW + b.x];
      if (z === ZN4.CITTA && (b.era ? b.era === 'E6' && thR4(b.x, b.y, 341) < .3 : thR4(b.x, b.y, 341) < .58)) return 'kit'; }
    return 'moduli';
  }
  const libT4 = (tx, ty) => { const v = G.tileAt(tx, ty), T0 = G.T; return v === T0.VIA || v === T0.WALK || v === T0.PIAZZA || v === T0.COB || v === T0.QUAY || v === T0.DIRT; };
  const AP4 = new Map();
  function aperture4(bi) {
    const b0 = B[bi]; if (!b0) return null; const c0 = AP4.get(bi); if (c0 && c0.b === b0 && c0.x === b0.x && c0.y === b0.y && c0.cx === b0.cx && c0.cy === b0.cy && c0.rot === b0.rot && c0.door === b0.door) return c0.O;
    const b = vista4(b0), chi = muratore4(b), O = chi ? { S: [], N: [], E: [], W: [], chi } : null;
    if (chi === 'moduli') apModuli4(b, O); else if (chi === 'kit') apKit4(b, O); else if (chi) apAltre4(b, O, chi);
    AP4.set(bi, { b: b0, x: b0.x, y: b0.y, cx: b0.cx, cy: b0.cy, rot: b0.rot, door: b0.door, O }); return O;
  }
  // i lati come li gira render.js (sd.tile, sd.at): N ed E contano da est e da sud, qui si riportano al verso di sidesOf
  const latiR4 = b => [
    { f: 'S', n: b.w, L: b.w * TS, rev: false, tile: k => [b.x + k, b.y + b.h] },
    { f: 'N', n: b.w, L: b.w * TS, rev: true, tile: k => [b.x + b.w - 1 - k, b.y - 1] },
    { f: 'E', n: b.h, L: b.h * TS, rev: true, tile: k => [b.x + b.w, b.y + b.h - 1 - k] },
    { f: 'W', n: b.h, L: b.h * TS, rev: false, tile: k => [b.x - 1, b.y + k] }];
  const run4 = () => Math.round((MG - .2) / .26) * .22;   // render.js EP_RUN: quanto corre la scala esterna lungo la facciata
  function apModuli4(b, O) {
    const kind = modKind4(b), EP = kind === 'borgo' && !b.__tierOf ? EPOCA4[b.era] : null, fl = Math.max(1, b.fl || 1), face0 = faceOf4(b);
    const wideUp = EP ? EP.wide : kind === 'port' || (kind === 'civic' && !!b.gov), winP = !EP ? 1 : b.era === 'E0' && b.torre ? .32 : EP.winP;
    // [vano, ingombro] dal centro: la finestra (95 cm; le persiane aperte, il davanzale e il balcone arrivano a 1,25 m), la finestra a nastro
    // (3,1 m), la porta (1 m, col telaio e la lampada 65 cm), il portone largo (3,2 m); la bottega: l'insegna sopra la porta e le vetrine
    const WIN = [.475, 1.25], WIDE = [1.55, 1.75], DOOR = [.5, .65], WDOOR = [1.6, 1.8], SHOP = .15, G0 = [.4, 2.25], DOORY = [0, 2.75], SHOPY = [0, MG + .4];
    const put = (sd, uR, H, y) => { const u = sd.rev ? sd.L - uR : uR; O[sd.f].push([u - H[0], u + H[0], y[0], y[1], 1]); O[sd.f].push([u - H[1], u + H[1], y[0], y[1], 0]); };
    const sides = latiR4(b);
    // la scala esterna della marina (epPiano: E2 da due piani, l'85%): il primo lato sulla strada dove ci sta; il murale (propPlan, S o E)
    // può spostarla al lato dopo, allora si segnano tutti e due
    const scale = [], run = run4();
    if (EP && b.era === 'E2' && fl >= 2) [null, 'S', 'E'].forEach(no => { let ok = null;
      for (const sd of sides) { if (ok) break; if (sd.f === no || !(sd.n >= 3)) continue;
        let doorK = -1; if (b.door && face0 === sd.f) for (let k = 0; k < sd.n; k++) { const t = sd.tile(k); if (t[0] === b.door[0] && t[1] === b.door[1]) doorK = k; }
        if (((b.shop || b.sign) && doorK >= 0) || (b.shopFront && sd.f === face0)) continue;
        const L = sd.n * TS, ks = doorK >= 0 ? [doorK] : Array.from({ length: Math.ceil(sd.n) }, (_, k) => k);
        for (const kk of ks) { if (ok) break; const uD = kk * TS + 1; for (const dir of [1, -1]) { const uE = uD + dir * (.65 + run);
          if (uE > .25 && uE < L - .25 && uD - .65 > .1 && uD + .65 < L - .1 && libT4(...sd.tile(kk)) && libT4(...sd.tile(Math.min(sd.n - 1, Math.max(0, Math.floor((uD + dir * 2.2) / TS)))))) { ok = { sd, u: uD, dir }; break; } } } }
      if (ok && !scale.some(q => q.sd === ok.sd && q.u === ok.u && q.dir === ok.dir)) scale.push(ok); });
    scale.forEach(S => { const a = Math.min(S.u - .9, S.u + S.dir * (.65 + run)), c = Math.max(S.u + .9, S.u + S.dir * (.65 + run)), h = (c - a) / 2 + .1; put(S.sd, (a + c) / 2, [h, h], [0, MG + 2.4]); });
    sides.forEach(sd => {
      let doorK = -1; if (b.door && face0 === sd.f) for (let k = 0; k < sd.n; k++) { const t = sd.tile(k); if (t[0] === b.door[0] && t[1] === b.door[1]) doorK = k; }
      const SH = b.shopFront && !b.__tierOf && sd.f === face0 ? (b.shopFront.span ? shopKs4(b, sd) : { ks: [], kd: -1 }) : null;
      const shop = (b.shop || b.sign) && doorK >= 0 && !SH, front = sd.f === face0, used = new Set(), piu = (H, q) => [H[0] + q, H[1] + q];
      // il piano terra
      if (doorK >= 0) {
        if ((shop || b.warehouse) && sd.n >= 2) { const k2 = doorK + 1 < sd.n ? doorK : doorK - 1; put(sd, (k2 + .5) * TS + 1, shop ? piu(WDOOR, SHOP) : WDOOR, shop ? SHOPY : DOORY); used.add(k2); used.add(k2 + 1); }
        else { put(sd, doorK * TS + 1, DOOR, DOORY); used.add(doorK); }
      }
      if (SH && SH.kd >= 0) {   // la bottega: la porta, le vetrine, l'insegna sopra
        put(sd, SH.kd * TS + 1, piu(DOOR, SHOP), SHOPY); used.add(SH.kd);
        const rest = SH.ks.filter(k => !used.has(k)).sort((a, c) => a - c);
        for (let q = 0; q < rest.length; q++) { const k = rest[q]; if (rest[q + 1] === k + 1) { put(sd, (k + .5) * TS + 1, piu(WIDE, SHOP), SHOPY); used.add(k); used.add(k + 1); q++; } else { put(sd, k * TS + 1, piu(WIN, SHOP), SHOPY); used.add(k); } }
      }
      for (let k = 0; k < sd.n; k++) { if (used.has(k)) continue;
        if (EP && b.era === 'E0' && thR4(b.x + k, b.y + sd.f.charCodeAt(0), 1607) > .45) continue;
        if ((front || sd.f === 'S' || sd.f === 'E') && (k % 2 === (doorK + 1) % 2 || kind === 'civic')) put(sd, k * TS + 1, WIN, G0); }
      // i piani sopra
      for (let f = 1; f < fl; f++) {
        const y = MG + (f - 1) * MF, Y = [y + G0[0], y + G0[1]];
        if (wideUp) { let k = 0; if (sd.n % 2 === 1) k = 1; for (; k + 1 < sd.n; k += 2) put(sd, (k + .5) * TS + 1, WIDE, Y); continue; }
        for (let k = 0; k < sd.n; k++) {
          const back = sd.f === 'N' || sd.f === 'W', win = !EP || winP >= 1 || thR4(b.x * 31 + k + (sd.f.charCodeAt(0) << 4), b.y + f * 3, 1601) < winP || (f === 1 && k === Math.floor(sd.n / 2));
          if (win && !(back && k % 2)) put(sd, k * TS + 1, WIN, Y); }
      }
    });
  }
  function shopKs4(b, sd) {   // render.js shopKs
    const S = b.shopFront, [a, c] = S.span, ks = []; let kd = -1;
    for (let k = 0; k < sd.n; k++) { const t = sd.tile(k); if (t[0] >= Math.min(a[0], c[0]) && t[0] <= Math.max(a[0], c[0]) && t[1] >= Math.min(a[1], c[1]) && t[1] <= Math.max(a[1], c[1])) ks.push(k); if (S.door && t[0] === S.door[0] && t[1] === S.door[1]) kd = k; }
    return { ks, kd };
  }
  // casaKit: blocchi di una casella (2,5 m a piano). Le colonne di mezzo possono avere la finestra o la serranda, gli spigoli mai
  // (render.js: «corner» non ha finestre); la porta, la lampada accanto; sulla strada la tettoia sopra il piano terra e i balconi
  // ai piani alti cadono a sorte su qualsiasi colonna, spigoli compresi (ingombri)
  function apKit4(b, O) {
    const fl = Math.max(1, b.fl || 1), FH = 2.5, top = fl * FH, d = b.door || null, face = faceOf4(b);
    const sides = [
      { f: 'S', n: b.w, out: k => [b.x + k, b.y + b.h] }, { f: 'N', n: b.w, out: k => [b.x + k, b.y - 1] },
      { f: 'E', n: b.h, out: k => [b.x + b.w, b.y + k] }, { f: 'W', n: b.h, out: k => [b.x - 1, b.y + k] }];
    sides.forEach(sd => { const put = (u, h, y0, y1, v) => O[sd.f].push([u - h, u + h, y0, y1, v]);
      for (let k = 0; k < sd.n; k++) { const corner = (k === 0 || k === sd.n - 1) && sd.n > 1, street = libT4(...sd.out(k)), u = k * TS + 1;
        if (!corner) { put(u, .55, 0, top, 1); if (street) put(u, .9, 0, FH, 1); }   // la finestra in colonna, la serranda sulla strada
        if (d && sd.f === face && sd.out(k)[0] === d[0] && sd.out(k)[1] === d[1]) { put(u, .55, 0, 2.6, 1); const kl = Math.max(0, Math.min(sd.n - 1, (sd.f === 'S' || sd.f === 'N' ? d[0] - b.x : d[1] - b.y) + 1)); put(kl * TS + 1, .25, .8, 2.2, 1); }
        if (street) { put(u, 1.15, FH * .6, FH * 1.05, 0); if (fl >= 2) put(u, 1.15, FH, top, 0); } }
    });
  }
  // le altre facciate di render.js: il palazzo déco (decoFacade: il piano terra tutto vetrate da 50 cm dagli spigoli, sopra le colonne di
  // vetrocemento larghe 1,5 m, max(2, L/2,4) per piano), la baracca (buildShack: la porta di 90 cm, la finestrella di 60 cm a 1,1 m di
  // qua o di là), il chiosco (le vetrine e il banco su tutti i lati)
  function apAltre4(b, O, chi) {
    const fl = Math.max(1, b.fl || 1), face = faceOf4(b);
    ['S', 'N', 'E', 'W'].forEach(f => { const L = (f === 'S' || f === 'N' ? b.w : b.h) * TS, put = (u0, u1, y0, y1) => { O[f].push([u0, u1, y0, y1, 1]); O[f].push([u0 - .2, u1 + .2, y0, y1, 0]); };
      if (chi === 'chiosco') put(0, L, 0, 3);
      else if (chi === 'deco') { put(.5, L - .5, 0, 3); const cols = Math.max(2, Math.floor(L / 2.4)); for (let f2 = 1; f2 < fl; f2++) for (let k = 0; k < cols; k++) { const u = (k + .5) * L / cols; put(u - .75, u + .75, f2 * 3 + .6, f2 * 3 + 2); } }
      else if (chi === 'baracca' && f === face) { const dk = b.door ? (f === 'S' || f === 'N' ? (b.door[0] - b.x) * TS + 1 : (b.door[1] - b.y) * TS + 1) : L / 2, ud = Math.max(.7, Math.min(L - .7, dk));
        put(ud - .45, ud + .45, 0, 2); [-1.1, 1.1].forEach(s => { const uw = Math.max(.4, Math.min(L - .4, ud + s)); put(uw - .3, uw + .3, 1.2, 1.8); }); } });
  }
  // la scala (punto sul muro wx, wy, normale verso fuori ox, oy, sulla casa bi; il piede a terra o sul tetto della casa foot) passa su
  // un vano (o, con ingombri, anche su un ingombro)? → { f, u, A } (la faccia, la u della scala, l'apertura) o null
  function sopraApertura4(bi, wx, wy, ox, oy, foot, ingombri) {
    const b = B[bi], O = aperture4(bi); if (!b || !O) return null;
    const [lx, ly] = toL4(b, wx, wy), [nx, ny] = giraV4(-rotC4(b), ox, oy), L4 = lotto4(b);
    const f = Math.abs(nx) >= Math.abs(ny) ? (nx > 0 ? 'E' : 'W') : (ny > 0 ? 'S' : 'N'), u = f === 'S' || f === 'N' ? lx - L4.x0 : ly - L4.y0;
    const fl = Math.max(1, b.fl || 1), base = roofRule(b) - (b.fl >= 1 ? MG + (fl - 1) * MF : 3), y0 = foot >= 0 && B[foot] ? roofRule(B[foot]) - base : -1;
    for (const A of O[f]) { if (!A[4] && !ingombri) continue; const m = SCALA_HW4 + (A[4] ? SCALA_AGIO4 : .02);
      if (u > A[0] - m && u < A[1] + m && A[3] > y0 + .05) return { f, u, A }; }
    return null;
  }
  // le posizioni lungo un lato di n caselle: il centro di ogni casella (k) e il giunto fra due caselle (k − ½: fra due colonne di finestre)
  const posti4 = n => { const P = []; for (let k = 0; k < n; k++) { if (k > 0) P.push(k - .5); P.push(k); } return P; };
  // sul lotto libero i moduli di render.js corrono sulla scatola vera (un modulo ogni 2 m dallo spigolo, render.js BLD()): le posizioni
  // sono i centri e i giunti dei moduli, in k di sidesOf (muroL4: la frazione (k + ½) / n del lato), più i centri delle caselle. I lati
  // N ed E render.js li monta dall'altro capo (da est, da sud): lì i moduli partono dalla fine del lato
  const postiL4 = (b, sd) => { if (!libero4(b)) return posti4(sd.n); const L4 = lotto4(b), L = sd.f === 'S' || sd.f === 'N' ? L4.lw : L4.ld, rev = sd.f === 'N' || sd.f === 'E', P = [];
    for (let v = 1; v < L - .3; v += 1) if (v > .3) P.push(rev ? L - v : v);
    return P.map(u => u / L * sd.n - .5).concat(Array.from({ length: sd.n }, (_, k) => k)); };
  function buildLadders() {
    LADDERS.length = 0;
    const used = new Set();
    B.forEach((b, bi) => {
      if (b.lighthouse || potere3(b)) return;
      const d = DOOR(b), front = frontOf(b), cand = [];
      sidesOf(b).forEach(sd => {
        // le caselle davanti al muro dove la scala può posare il piede (la porta, il vicino, il budello, i pezzi grandi)
        const tessera = k => {
          let [tx, ty] = sd.tile(k);
          if (libero4(b)) { const [wx1, wy1] = toW4(b, ...muroL4(b, sd, k)), [nx1, ny1] = giraV4(rotC4(b), ...sd.out); tx = Math.floor((wx1 + nx1 * .7) / TS); ty = Math.floor((wy1 + ny1 * .7) / TS);   // [tetti4] il piede davanti al muro del lotto
            if (d && hyp(wx1 + nx1 * .55 - (d[0] + .5) * TS, wy1 + ny1 * .55 - (d[1] + .5) * TS) < .9) return null; }   // [scale-finestre] lontano dalla porta lo dice il vano (aperture4)
          else if (d && tx === d[0] && ty === d[1]) return null;   // non davanti alla porta ([scale-finestre] accanto sì, a 25 cm dal vano: lo dice aperture4)
          if (!inb(tx, ty)) return null;
          if (used.has(ty * GW + tx)) return null;
          const other = BI[ty * GW + tx];
          let foot = -1;
          if (other >= 0 && other !== bi && B[other]) { if (roofRule(B[other]) < roofRule(b) - 1.5) foot = other; else return null; }   // dal tetto più basso del vicino
          else if (!G.walkT(tx, ty)) return null;
          // [pulizia2] davanti alla scala, verso la camera, non deve esserci un pezzo grande (arco, portico, mura, tettoia): la coprirebbe
          { const [wx0, wy0] = sd.wall(k), [ox0, oy0] = sd.out; if (coperta(wx0, wy0, ox0, oy0)) return null; }   // [pianta] coperta da un pezzo grande (il portico, un arco, il carro sul tronchino): lì la scala non si mette
          if (CN3 && foot < 0) { const [ox0, oy0] = libero4(b) ? giraV4(rotC4(b), ...sd.out) : sd.out, o2 = inb(tx + ox0, ty + oy0) ? BI[(ty + oy0) * GW + tx + ox0] : -1; if (o2 >= 0 && o2 !== bi) return null; }   // nel budello di una casella (dove si salta da tetto a tetto) la scala ingombra il salto e non si vede
          return { tx, ty, foot }; };
        const TE = []; for (let k = 0; k < sd.n; k++) TE.push(libero4(b) ? null : tessera(k));
        // [scale-finestre] la scala al centro di una casella (la colonna cieca) o sul giunto fra due (fra due colonne di finestre), mai su un vano
        for (const k of postiL4(b, sd)) {
          const k0 = Math.floor(k), k1 = Math.ceil(k), A = libero4(b) ? tessera(k) : TE[k0], C = libero4(b) ? A : TE[k1]; if (!A || !C || A.foot !== C.foot) continue;
          const { tx, ty, foot } = C, cop = false;
          const [wa, wb] = libero4(b) ? toW4(b, ...muroL4(b, sd, k)) : sd.wall(k), [na, nb] = libero4(b) ? giraV4(rotC4(b), ...sd.out) : sd.out;
          if (sopraApertura4(bi, wa, wb, na, nb, foot)) continue;
          const cieca = !sopraApertura4(bi, wa, wb, na, nb, foot, true);   // niente persiane, davanzali, balconi, tettoie: il muro cieco
          let s = (sd.f === front ? -4 : 0) + (k === 0 || k === sd.n - 1 ? 2 : 0) + (sd.f === 'E' || sd.f === 'W' ? 1 : 0) + (foot >= 0 ? -3 : 0) + (cieca ? 4 : 0);
          // la casella davanti alla scala deve avere un po' di spazio (non un budello fra due muri ciechi)
          if (foot < 0) { const [ox, oy] = sd.out; if (!G.walkT(A.tx + ox, A.ty + oy) || !G.walkT(tx + ox, ty + oy)) s -= 1.5; }
          // [tetti3] nella città nuova la scala sta dalla parte della camera (sud, est) e nessuno davanti la copre: il lato della porta va
          // bene (sta lontana dalla porta), il fianco nascosto no
          let vis = true;
          if (CN3) { const h0 = foot >= 0 ? roofRule(B[foot]) : tileH(wa + na, wb + nb);
            vis = scalaVista3(wa, wb, na, nb, h0, roofRule(b));
            s +=(sd.f === front ? 3 : 0) + (sd.f === 'S' || sd.f === 'E' ? 3 : -3) + (vis ? 6 : 0); }
          cand.push({ s, sd, k, tx, ty, t0: [A.tx, A.ty], foot, cop, vis, cieca });
        }
        // [scale-finestre] LO SPIGOLO FRA DUE CASE: nelle file di case strette (una casella, la finestra in mezzo a ogni piano) il muro non
        // ha un posto libero; la scala sta allora sul giunto fra due facciate a filo, coi due tetti alla stessa quota (entro 30 cm): 28 cm
        // d'aria dalle due finestre, il piede sulla strada davanti al giunto, in cima si entra nel tetto di questa casa
        if (CN3 && !libero4(b)) [[-.5, -1, 0], [sd.n - .5, sd.n, sd.n - 1]].forEach(([k, kc, kb]) => {
          const [ox, oy] = sd.out, al = ox ? [0, 1] : [1, 0], sgn = k < 0 ? -1 : 1, [tcx, tcy] = sd.tile(kc), cx0 = tcx - ox, cy0 = tcy - oy;   // la casella del vicino lungo il muro
          if (!inb(cx0, cy0)) return; const ci = BI[cy0 * GW + cx0], Cb = ci >= 0 ? B[ci] : null;
          if (!Cb || ci === bi || libero4(Cb) || Cb.lighthouse || Math.abs(roofRule(Cb) - roofRule(b)) > .3 || !aperture4(ci)) return;
          const A = TE[kb], Cq = tessera(kc); if (!A || !Cq || A.foot >= 0 || Cq.foot >= 0) return;
          const [wa, wb] = sd.wall(k); if (sopraApertura4(bi, wa, wb, ox, oy, -1) || sopraApertura4(ci, wa, wb, ox, oy, -1)) return;
          const dentro = [-al[0] * sgn * .6, -al[1] * sgn * .6]; if (bAt(wa - ox * .8 + dentro[0], wb - oy * .8 + dentro[1]) !== bi) return;
          const cieca = !sopraApertura4(bi, wa, wb, ox, oy, -1, true) && !sopraApertura4(ci, wa, wb, ox, oy, -1, true);
          let s = (sd.f === front ? -4 : 0) + 2 + (sd.f === 'E' || sd.f === 'W' ? 1 : 0) + (cieca ? 4 : 0) - 1;   // un punto meno del muro suo
          if (!G.walkT(A.tx + ox, A.ty + oy) || !G.walkT(Cq.tx + ox, Cq.ty + oy)) s -= 1.5;
          const vis = scalaVista3(wa, wb, ox, oy, tileH(wa + ox, wb + oy), roofRule(b)); s += (sd.f === front ? 3 : 0) + (sd.f === 'S' || sd.f === 'E' ? 3 : -3) + (vis ? 6 : 0);
          cand.push({ s, sd, k, tx: A.tx, ty: A.ty, t0: [Cq.tx, Cq.ty], foot: -1, cop: false, vis, cieca, dentro });
        });
      });
      if (!cand.length) return;
      cand.sort((p, q) => q.s - p.s);
      // [tetti3] una scala che non si vede da nessun lato non serve, se sul tetto si arriva dal vicino attaccato (dislivello entro 1,2 m):
      // meglio nessuna salita che una salita che non si trova
      if (CN3 && b.era && !cand.some(c => c.vis) && vicinoTetto3(b, bi)) return;
      // e la scala da terra che la camera non vede non si mette proprio (resta quella dal tetto più basso del vicino, se c'è)
      if (CN3) for (let k = cand.length - 1; k >= 0; k--) if (!cand[k].vis && cand[k].foot < 0) cand.splice(k, 1);
      const take = b.w * b.h >= 30 ? 2 : 1, got = [];
      for (const c of cand) {
        if (got.length >= take) break;
        if (got.some(g => g.sd.f === c.sd.f) || ((c.cop || !c.vis) && got.length)) continue;   // [pulizia2] la seconda scala solo se si vede ([tetti3] anche dalla camera)
        if (used.has(c.ty * GW + c.tx) || used.has(c.t0[1] * GW + c.t0[0])) continue;   // [scale-finestre] il giunto prende due caselle
        got.push(c); used.add(c.ty * GW + c.tx); used.add(c.t0[1] * GW + c.t0[0]);
        let [wx, wy] = c.sd.wall(c.k), [ox, oy] = c.sd.out, dp = .55;
        // [città2] la casa che segue la strada è girata attorno al suo centro (render.js rotRec): la scala gira con il muro
        const rot = b.rot && !b.sign && !b.shop ? b.rot : 0;
        if (libero4(b)) { const [lx0, ly0] = muroL4(b, c.sd, c.k); [wx, wy] = toW4(b, lx0, ly0); [ox, oy] = giraV4(rot, ox, oy);   // [tetti4] il muro del lotto (girato, o col centro suo)
          dp = c.foot < 0 ? piede4(wx, wy, ox, oy) : .55; const fx2 = wx + ox * dp, fy2 = wy + oy * dp, d0 = b.door ? hyp(fx2 - (b.door[0] + .5) * TS, fy2 - (b.door[1] + .5) * TS) : 99;
          if ((c.foot < 0 && !G.walkM(fx2, fy2)) || bAt(wx - ox * .8, wy - oy * .8) !== bi || bAt(wx - ox * 1.6, wy - oy * 1.6) !== bi || d0 < .9) { got.pop(); used.delete(c.ty * GW + c.tx); used.delete(c.t0[1] * GW + c.t0[0]); continue; } }
        if (LIB4 && c.foot < 0 && bAt(wx + ox * dp, wy + oy * dp) >= 0) { got.pop(); used.delete(c.ty * GW + c.tx); used.delete(c.t0[1] * GW + c.t0[0]); continue; }   // [tetti4] il piede nel lotto girato di un vicino: no
        if (c.foot >= 0 && [-.3, 0, .3].some(t => bAt(wx + ox * dp - oy * t, wy + oy * dp + ox * t) !== c.foot)) { got.pop(); used.delete(c.ty * GW + c.tx); used.delete(c.t0[1] * GW + c.t0[0]); continue; }   // [scale-finestre] il piede tutto sul tetto basso (sul giunto, vicino allo spigolo del lotto)
        const dx = c.dentro ? c.dentro[0] : 0, dy = c.dentro ? c.dentro[1] : 0;   // [scale-finestre] dallo spigolo fra due case, in cima si entra nel tetto suo
        LADDERS.push({ i: LADDERS.length, bi, f: c.sd.f, x: wx, y: wy, ox, oy, fx: wx + ox * dp, fy: wy + oy * dp, tx: wx - ox * .8 + dx, ty: wy - oy * .8 + dy, footB: c.foot, ang: Math.atan2(oy, ox), vis: c.vis });
      }
    });
  }
  // le caselle toccate da ogni lotto libero (col margine di una casella): lì bAt guarda il lotto
  function rifaiLib4() { const M = new Map(); B.forEach((b, bi) => { if (!b || b.lighthouse || b.__tierOf || !libero4(b)) return; const L = lotto4(b), R = hyp(L.lw, L.ld) / 2;
      for (let ty = Math.floor((L.cy - R) / TS) - 1; ty <= Math.floor((L.cy + R) / TS) + 1; ty++) for (let tx = Math.floor((L.cx - R) / TS) - 1; tx <= Math.floor((L.cx + R) / TS) + 1; tx++) { if (!inb(tx, ty)) continue; const k = ty * GW + tx; (M.get(k) || M.set(k, []).get(k)).push(bi); } });
    LIB4 = M.size ? M : null; }
  // [cotto] LA RETE DEI TETTI COTTA NELLA BUILD (cotto.js, strumenti/cuoci.js): le scale, le passerelle, i salti, i camminamenti, la rete4,
  // le corti, i belvederi, i legami dei percorsi, i premi, il piano e i profili sono dati, sempre uguali per lo stesso mondo. Col file
  // cotto (e lo stato del mondo uguale a quello della cottura) i calcoli qui sotto non girano: i vettori si riempiono alla fine (dopo
  // profili4) con quello che la cottura ha salvato, e le modifiche ai dati degli altri (le case, i giri di Percorsi) si riapplicano.
  const CT4 = typeof Cotto !== 'undefined' ? Cotto : null, PC4 = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi : null;
  const COT4 = CT4 ? CT4.apri('tetti', { W, MAP: G.MAP, B, PZ, LADDERS, P: PC4 && PC4.cotto ? PC4.cotto : null, SO: typeof Sottosuolo !== 'undefined' && Sottosuolo && Sottosuolo.TPL ? Sottosuolo.TPL : null }) : null;
  if (!COT4) { rifaiLib4(); buildLadders(); }

  // ---------------- [tetti2] LE PASSERELLE: assi di legno sui vicoli larghi ----------------
  // Un vicolo di una casella (2 m) si salta; da due a tre caselle (4–6 m) il salto non basta: lì c'è una passerella di
  // tavole col corrimano di corda, fra due tetti di quota simile. Così i tetti di un isolato diventano un percorso:
  // si attraversa il quartiere senza scendere. Le estremità scendono a rampa dal parapetto al lastrico.
  // Una passerella: P0 (dentro il tetto a) → P1 (bordo di a) → P2 (bordo di b) → P3 (dentro b), larga 2·hw.
  const PLANKS = [], PCELL = new Map();
  // [tetti4] l'impronta della passerella (col margine di 60 cm per parte, le gronde) tocca solo case col piano dei tetti: sopra un palazzo,
  // una chiesa o un pezzo grande la quota del tetto non si conosce e la passerella non si mette
  // [tetti4] LA TERZA CASA: sotto l'impalcato (teste comprese) nessun'altra casa, letta dal suo lotto (b.cx, b.cy, b.lw, b.ld, b.rot) e non
  // dalle caselle: regge se [pianta] sposta una casa (salti di terreno, pendii, lotti orientati) senza ristampare la pianta a caselle
  const terza4 = P => { const mx = P.x0 + P.ox * P.L / 2, my = P.y0 + P.oy * P.L / 2, R0 = P.L / 2 + P.hw + .2;
    const vic = [], vs = new Set(), R1 = R0 + 1, tx0 = Math.floor((mx - R1) / TS), tx1 = Math.floor((mx + R1) / TS), ty0 = Math.floor((my - R1) / TS), ty1 = Math.floor((my + R1) / TS);   // le case delle caselle attorno (e i lotti liberi che ci cadono)
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { if (!inb(tx, ty)) continue; const k = ty * GW + tx, o = BI[k]; if (o >= 0) vs.add(o); const L4 = LIB4 && LIB4.get(k); if (L4) L4.forEach(q => vs.add(q)); }
    vs.forEach(q => { const b = B[q]; if (!b || q === P.a || q === P.b || b.__tierOf || b.lighthouse) return; vic.push(b); });
    if (!vic.length) return false;
    for (let s2 = 0; s2 <= P.L + 1e-6; s2 += .2) for (const t of [-P.hw, 0, P.hw]) { const x = P.x0 + P.ox * s2 + P.px * t, y = P.y0 + P.oy * s2 + P.py * t; if (vic.some(b => dentro4(b, x, y, .02))) return true; }
    return false; };
  const sgombra4 = P => { if (terza4(P)) return false;
    for (let s2 = P.s1 + .3; s2 <= P.s2 - .3; s2 += .5) for (const t of [-P.hw - .6, 0, P.hw + .6]) { const v = G.tileAt(Math.floor((P.x0 + P.ox * s2 + P.px * t) / TS), Math.floor((P.y0 + P.oy * s2 + P.py * t) / TS)); if (v === G.T.PIAZZA || v === G.T.FOUNT) return false; }   /* [sporcherie] niente assi sopra le piazzette (la passerella sul Pozzo) */
    for (let s2 = 0; s2 <= P.L + 1e-6; s2 += .25) for (let t = -P.hw - 1.0; t <= P.hw + 1.0 + 1e-6; t += .25) { const x = P.x0 + P.ox * s2 + P.px * t, y = P.y0 + P.oy * s2 + P.py * t, tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (!inb(tx, ty)) return false;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (!inb(tx + i, ty + j)) continue; const q = BI[(ty + j) * GW + tx + i]; if (q < 0 || q === P.a || q === P.b || !B[q] || !libero4(B[q]) || !dentro4(B[q], x, y, -.6)) continue;   /* la gronda sporge fino a 55 cm */
      if ((s2 < P.s1 - .05 || s2 > P.s2 + .05) && !dentro4(B[q], x, y, 0) && roofRule(B[q]) <= Math.min(roofRule(B[P.a]), roofRule(B[P.b])) - .3) continue;   // [tetti4] sopra le teste, la gronda di un vicino girato più basso sta sotto le assi   // [tetti4] gli spigoli delle case girate vicine
      if ((!conPiano4(B[q]) && Math.abs(t) <= P.hw + .6) || Math.abs(t) <= P.hw + .1 || (roofRule(B[q]) > Math.min(roofRule(B[P.a]), roofRule(B[P.b])) + .1 && Math.abs(t) - P.hw < .95)) return false; }   /* accanto, solo chi è più alto e vicino toglie la passerella */
    const o = BI[ty * GW + tx]; if (o >= 0 && o !== P.a && o !== P.b && !libero4(B[o]) && ((!conPiano4(B[o]) && Math.abs(t) <= P.hw + .6 && !(SEP4 < 4 && Math.abs(t) > P.hw + .1 && roofRule(B[o]) < Math.min(roofRule(B[P.a]), roofRule(B[P.b])) - 1.5)) || Math.abs(t) <= P.hw + .1 || (roofRule(B[o]) > Math.min(roofRule(B[P.a]), roofRule(B[P.b])) + .1 && Math.abs(t) - P.hw < .95))) return false;   /* sotto l'impalcato solo le sue due case; accanto solo case più basse (i muri, i cornicioni e i balconi di una casa più alta sporgono) */ if (o < 0 && Math.abs(t) <= P.hw + .6 && G.tileAt(tx, ty) === G.T.BLD) return false; } return true; };
  const conPiano4 = b => !!(b && b.era && b.era !== 'E7' && !b.shack && !b.pezzo && !b.lighthouse && !b.kiosk && !b.__tierOf);   // [tetti4] come ok3 di piano3
  const PIN = 1.5, PHW = .5;   // quanto entra nel tetto la rampa, mezza larghezza delle assi
  function buildPlanks() {
    PLANKS.length = 0; PCELL.clear();
    const pairs = new Set(), per = new Map(), ladTops = LADDERS.map(L => [L.tx, L.ty]);
    const okB = b => b && !b.lighthouse && !b.kiosk && !b.barrack && !b.military && !b.church && !b.rot && !libero4(b) && b.w >= 2 && b.h >= 2;   // [città2] non sulle case girate ([tetti4] né sui lotti liberi: le fa rete4)
    B.forEach((b, bi) => {
      if (!okB(b)) return;
      sidesOf(b).forEach(sd => {
        const [ox, oy] = sd.out, runs = new Map();
        for (let k = 0; k < sd.n; k++) {
          const [tx0, ty0] = sd.tile(k);
          for (let g = 0; g <= 3; g++) {
            const tx = tx0 + ox * g, ty = ty0 + oy * g; if (!inb(tx, ty)) break;
            const o = BI[ty * GW + tx];
            if (o >= 0 && B[o]) { if (o !== bi && g >= 2) { const R = runs.get(o) || runs.set(o, []).get(o); R.push({ k, g }); } break; }
            if (!G.walkT(tx, ty)) break;   // acqua, alberi, pareti: niente assi
          }
        }
        runs.forEach((R, bj) => {
          const c = B[bj], key = Math.min(bi, bj) + ':' + Math.max(bi, bj);
          if (!okB(c) || pairs.has(key) || Math.abs(roofRule(b) - roofRule(c)) > 2.4) return;
          if (CN3 && !(conPiano4(b) && conPiano4(c))) return;   // [tetti4] nella città nuova le assi solo fra case col piano dei tetti: i capi devono posare su un terrazzo che si conosce
          const pmax = b.era || c.era ? 1 : 3;   // [città2] nella città per epoche una passerella per casa: le assi non devono coprire i vicoli
          if ((per.get(bi) || 0) >= pmax || (per.get(bj) || 0) >= pmax) return;
          const cnt = {}; R.forEach(q => cnt[q.g] = (cnt[q.g] || 0) + 1); const g = +Object.keys(cnt).sort((u, v) => cnt[v] - cnt[u])[0], R2 = R.filter(q => q.g === g);
          if (R2.length < 2) return;   // almeno due caselle di muro dritto di fronte
          const m = R2[Math.floor(R2.length / 2)], [wx, wy] = sd.wall(m.k);
          if (ladTops.some(([lx, ly]) => hyp(lx - wx, ly - wy) < 1.8)) return;   // non sopra l'arrivo di una scala
          const gap = g * TS, P = { i: PLANKS.length, a: bi, b: bj, ox, oy, px: -oy, py: ox, hw: PHW, gap,
            x0: wx - ox * PIN, y0: wy - oy * PIN, wa: [wx, wy], wb: [wx + ox * gap, wy + oy * gap] };
          P.L = PIN * 2 + gap; P.s1 = PIN; P.s2 = PIN + gap;
          if (CN3 && !sgombra4(P)) return;   // [tetti4]
          PLANKS.push(P); pairs.add(key); per.set(bi, (per.get(bi) || 0) + 1); per.set(bj, (per.get(bj) || 0) + 1);
          // le caselle che tocca, per trovarla in fretta
          for (let s2 = 0; s2 <= P.L; s2 += .5) for (const t of [-PHW, 0, PHW]) { const x = P.x0 + ox * s2 + P.px * t, y = P.y0 + oy * s2 + P.py * t, ck = Math.floor(y / TS) * GW + Math.floor(x / TS);
            const L = PCELL.get(ck) || PCELL.set(ck, []).get(ck); if (L.indexOf(P) < 0) L.push(P); }
        });
      });
    });
  }
  // le quote delle quattro tappe: il lastrico dentro, il colmo del parapetto sul bordo (misurati se la grafica l'ha fatto)
  function edgeH(bi, wx, wy, ox, oy) { let h = -Infinity; for (let d = .15; d <= .9; d += .25) { const v = roofH(bi, wx - ox * d, wy - oy * d); if (v !== null && v > h) h = v; } return h > -Infinity ? h : roofRule(B[bi]); }
  function plankHs(P) {
    const key = (B[P.a].__rH ? 1 : 0) + (B[P.b].__rH ? 2 : 0); if (P.__k === key) return P.__h;
    const fa = roofH(P.a, P.x0, P.y0) ?? roofRule(B[P.a]), fb = roofH(P.b, P.wb[0] + P.ox * (P.pin || PIN), P.wb[1] + P.oy * (P.pin || PIN)) ?? roofRule(B[P.b]);   /* [tetti4] P.pin: sulle case di una casella la rampa entra meno */
    const ea = Math.max(fa, edgeH(P.a, P.wa[0], P.wa[1], P.ox, P.oy)), eb = Math.max(fb, edgeH(P.b, P.wb[0], P.wb[1], -P.ox, -P.oy));
    P.__k = key; return (P.__h = [fa, ea + .04, eb + .04, fb]);
  }
  function plankH(P, s2) {
    if (P.prof) { const K = profCur4(P).k; if (s2 <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (s2 <= K[i][0]) { const [a0, h0] = K[i - 1], [a1, h1] = K[i]; return h0 + (h1 - h0) * (s2 - a0) / Math.max(1e-6, a1 - a0); } return K[K.length - 1][1]; }   // [tetti4]
    const h = plankHs(P);
    if (s2 <= P.s1) return h[0] + (h[1] - h[0]) * (s2 / P.s1);
    if (s2 <= P.s2) return h[1] + (h[2] - h[1]) * ((s2 - P.s1) / (P.s2 - P.s1));
    return h[2] + (h[3] - h[2]) * ((s2 - P.s2) / (P.L - P.s2));
  }
  function plankAt(x, y) {
    if (!inb(Math.floor(x / TS), Math.floor(y / TS))) return null;
    const L = PCELL.get(Math.floor(y / TS) * GW + Math.floor(x / TS)); if (!L) return null;
    for (const P of L) { const dx = x - P.x0, dy = y - P.y0, s2 = dx * P.ox + dy * P.oy, t = dx * P.px + dy * P.py;
      if (s2 < 0 || s2 > P.L || Math.abs(t) > P.hw) continue;
      return { bi: s2 < P.L / 2 ? P.a : P.b, h: plankH(P, s2), plank: P.i }; }
    return null;
  }
  if (!COT4) buildPlanks();

  // [pulizia2] I SALTI FATTIBILI: dove fra due tetti di quota simile (entro 1,2 m) c'è un vicolo di una casella (2 m, si salta), i due
  // bordi hanno la copertina color crema: lo stesso segno delle teste delle passerelle e del gradino ai piedi delle scale. Il percorso
  // sui tetti si legge così, con un linguaggio solo: ferro color minio per salire, crema per dove si passa. Solo grafica (le regole restano).
  const JUMPS = [], JMAX4 = 2.9;   // [tetti4] fino a 2,9 m fra i due lotti il salto riesce (provato col gioco nei due versi)
  function buildJumps() {
    JUMPS.length = 0; const seen = new Set(), okJ = b => b && !b.lighthouse && !b.kiosk && !b.church && !b.rot && !rotC4(b) && !b.pezzo && b.w >= 2 && b.h >= 2;   // [tetti4] anche i lotti arretrati di [pianta] (non girati)
    // [tetti4] il vicolo vero fra i due lotti: da = quanto il muro di a sta dietro il filo della casella, db lo stesso per b; si salta fino a 2,6 m
    const fil4 = (b, ox, oy, lato) => { const L = lotto4(b); return lato > 0 ? (ox > 0 ? L.x1 : ox < 0 ? -L.x0 : oy > 0 ? L.y1 : -L.y0) : (ox > 0 ? L.x0 : ox < 0 ? -L.x1 : oy > 0 ? L.y0 : -L.y1); };   // il muro lungo il verso del salto
    const dentroX4 = (b, x, y, ox) => { const L = lotto4(b); return ox ? (y > L.y0 + .3 && y < L.y1 - .3) : (x > L.x0 + .3 && x < L.x1 - .3); };
    B.forEach((b, bi) => { if (!okJ(b)) return;
      sidesOf(b).forEach(sd => { const [ox, oy] = sd.out; let run = null;
        const flush = () => { if (run && run.k1 > run.k0) { JUMPS.push(run); seen.add(run.bi + ':' + run.bj); } run = null; };
        for (let k = 0; k < sd.n; k++) { const [tx, ty] = sd.tile(k), tx2 = tx + ox, ty2 = ty + oy, o0 = inb(tx, ty) ? BI[ty * GW + tx] : -1;
          // il vicolo di una casella (g = 1); [tetti4] o la casa subito accanto (g = 0) quando i due lotti arretrati lasciano un vuoto da 50 cm in su
          const g = o0 >= 0 ? 0 : 1, o = g ? (inb(tx2, ty2) ? BI[ty2 * GW + tx2] : -1) : o0;
          const gap = g ? inb(tx, ty) && G.walkT(tx, ty) : o0 !== bi && (libero4(b) || libero4(B[o0])), c = o >= 0 ? B[o] : null;
          let ok = gap && c && o !== bi && okJ(c) && Math.abs(roofRule(b) - roofRule(c)) <= 1.2 && !seen.has(o + ':' + bi), da = 0, db = 0;
          if (ok) { const [wx, wy] = sd.wall(k), w = wx * ox + wy * oy, mx = wx + ox * TS * g / 2, my = wy + oy * TS * g / 2;
            da = Math.max(0, w - fil4(b, ox, oy, 1)); db = Math.max(0, fil4(c, ox, oy, -1) - (w + TS * g));
            const L4 = TS * g + da + db; if (L4 > JMAX4 || (!g && L4 < .5) || !dentroX4(b, mx, my, ox) || !dentroX4(c, mx, my, ox)) ok = false; }
          if (ok && run && run.bj === o && run.g === g && run.k1 === k - 1 && Math.abs(run.da - da) < .05 && Math.abs(run.db - db) < .05) run.k1 = k; else { flush(); if (ok) run = { bi, bj: o, sd, k0: k, k1: k, ox, oy, da, db, g }; } }
        flush(); });
    });
  }
  // i due muri del salto (sul lotto): quello di a e quello di b
  const jA = (J, k) => { const [wx, wy] = J.sd.wall(k); return [wx - J.ox * (J.da || 0), wy - J.oy * (J.da || 0)]; };
  const jB = (J, k) => { const [wx, wy] = J.sd.wall(k), d = TS * (J.g === 0 ? 0 : 1) + (J.db || 0); return [wx + J.ox * d, wy + J.oy * d]; };
  if (!COT4) buildJumps();

  // ---------------- [percorsi] I CAMMINAMENTI: le mura di tramontana e il rilevato sopra il sottopasso ----------------
  // Sui pezzi grandi della città nuova (W.pezzi) due superfici si camminano come un tetto: il camminamento di ronda delle mura di
  // tramontana (dietro il parapetto coi merli, a 1,4 m sotto la cima) e il piano del rilevato sopra il sottopasso della Via Cavour.
  // Ci si sale dalla scala di ronda di pietra e da due scale di ferro color minio murate sul lato della città (le mura); sul
  // rilevato da due scale di ferro, una per parte (l'alternativa al sottopasso: si scavalca la ferrovia). Una catena di campi:
  // { i, tipo, p (il pezzo), x0..x1, z0..z1 (locali), h (quota assoluta), L, a, b (i capi, metri), bi (l'edificio che fa da lv.b) }.
  const CAMM = [], CCELL = new Map();
  const pzW = (p, lx, lz) => { const c = Math.cos(p.rot), s = Math.sin(p.rot); return [p.x + lx * c + lz * s, p.y - lx * s + lz * c]; };
  const pzL = (p, x, y) => { const c = Math.cos(p.rot), s = Math.sin(p.rot), dx = x - p.x, dy = y - p.y; return [dx * c - dy * s, dx * s + dy * c]; };
  function cammAt(x, y) {
    if (!inb(Math.floor(x / TS), Math.floor(y / TS))) return null; const L = CCELL.get(Math.floor(y / TS) * GW + Math.floor(x / TS)); if (!L) return null;
    let best = null; for (const c of L) { const [l, z] = pzL(c.p, x, y); if (l < c.x0 || l > c.x1 || z < c.z0 || z > c.z1) continue; if (!best || c.h > best.h) best = c; }
    return best ? { bi: best.bi, h: best.h, camm: best.i } : null;
  }
  function buildCamm() {
    CAMM.length = 0; CCELL.clear(); const PZ0 = W.pezzi || []; if (!PZ0.length) return;
    const vicinoB = (x, y) => { let bi = -1, bd = 1e9; B.forEach((b, i) => { if (b.lighthouse || !b.door) return; const d = hyp((b.x + b.w / 2) * TS - x, (b.y + b.h / 2) * TS - y); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const campo = (p, tipo, x0, x1, z0, z1, h, bi) => { const c = { i: CAMM.length, tipo, p, x0, x1, z0, z1, h, bi, L: x1 - x0, a: pzW(p, x0, (z0 + z1) / 2), b: pzW(p, x1, (z0 + z1) / 2) }; CAMM.push(c);
      for (let lx = x0; lx <= x1 + .01; lx += .5) for (let lz = z0; lz <= z1 + .01; lz += .5) { const [x, y] = pzW(p, lx, lz), k = Math.floor(y / TS) * GW + Math.floor(x / TS); const A = CCELL.get(k) || CCELL.set(k, []).get(k); if (A.indexOf(c) < 0) A.push(c); }
      return c; };
    // una scala di ferro murata sulla faccia z = zf del pezzo, al punto lx; i piedi sulla prima casella percorribile verso fuori (sz: il verso)
    const scalaCamm = (c, lx, zf, sz, ex) => {
      const [wx, wy] = pzW(c.p, lx, zf), [ex0, ey0] = pzW(c.p, lx, zf + sz), ox = ex0 - wx, oy = ey0 - wy; let fx = null, fy = null;
      for (let d = .55; d <= 2.2; d += .15) { const x = wx + ox * d, y = wy + oy * d; if (G.walkM(x, y) && bAt(x, y) < 0) { fx = x; fy = y; break; } }
      if (fx === null) return null; const [tx, ty] = pzW(c.p, lx, zf - sz * .8);
      const L = Object.assign({ i: LADDERS.length, bi: c.bi, f: 'camm', x: wx, y: wy, ox, oy, fx, fy, tx, ty, footB: -1, ang: Math.atan2(oy, ox), camm: c, hTop: c.h }, ex || {}); LADDERS.push(L); return L;
    };
    // le mura di tramontana, da levante a ponente; i tratti si sormontano di 40 cm ai giunti
    const mura = PZ0.filter(p => p.tipo === 'mura_tramontana' && p.opz && p.opz.L).sort((a, b) => b.x - a.x);
    if (mura.length) {
      const m = mura[Math.floor(mura.length / 2)], bi = vicinoB(m.x, m.y + 8), C = mura.map(p => campo(p, 'mura_tramontana', -.4, p.opz.L + .4, -1.25, .62, (p.q || 0) + (p.opz.h || 8) - 1.4, bi));
      // la scala di ronda di pietra (il pezzo la disegna): i piedi davanti al primo gradino, la cima sul camminamento
      mura.forEach((p, k) => { if (!p.opz.scala) return; const hw = (p.opz.h || 8) - 1.4, n = Math.ceil(hw / .2), x0 = Math.max(.5, p.opz.L - n * .3 - 1.6);
        for (let d = .6; d <= 2.6; d += .2) { const [fx, fy] = pzW(p, x0 - d, -2.0); if (!G.walkM(fx, fy) || bAt(fx, fy) >= 0) continue; const [wx, wy] = pzW(p, x0, -2.0), [tx, ty] = pzW(p, Math.min(p.opz.L - .6, x0 + n * .3 + .5), -.4), [ax, ay] = pzW(p, x0 + 1, -2.0);
          LADDERS.push({ i: LADDERS.length, bi, f: 'camm', x: wx, y: wy, ox: wx - ax, oy: wy - ay, fx, fy, tx, ty, footB: -1, ang: Math.atan2(wy - ay, wx - ax), camm: C[k], hTop: C[k].h, rampa: true }); break; } });
      // le due scale di ferro ai capi: sul lato della città (−z), a un metro e mezzo dalla testata
      const e = C[0], o = C[C.length - 1]; scalaCamm(e, 1.6, -1.3, -1); scalaCamm(o, o.p.opz.L - 1.6, -1.3, -1);
    }
    // il rilevato sopra il sottopasso: il piano dentro i parapetti, una scala di ferro per parte accanto al fornice
    PZ0.filter(p => p.tipo === 'sottopasso').forEach(p => { const L = Math.max(p.opz.L || 14, (p.opz.w || 4) + 6), Hr = Math.max(p.opz.hRilevato || 4.8, (p.opz.h || 3.2) + 1.6);
      const c = campo(p, 'sottopasso', .3, L - .3, -4.05, 4.05, (p.q || 0) + Hr, vicinoB(p.x + L / 2, p.y)); scalaCamm(c, 1.4, 4.5, 1); scalaCamm(c, 1.4, -4.5, -1); });
  }
  if (!COT4) buildCamm();

  // ---------------- [tetti4] LA RETE DEI TETTI: le isole si legano ----------------
  // Andrea: «vedo ancora tetti e zone che non mi piacciono: semplici, non percorribili o non connessi, piatti e poco espressivi, non
  // attraversati da percorsi esplorativi». Nel borgo un piano di dislivello (2,4 m) basta a spezzare il livello dei tetti: il grafo si
  // fermava a ogni casa più alta, e le passerelle erano una per casa. Qui, sui tre quartieri vecchi (borgo, marina, Ottocento), si
  // cercano i legami che mancano e si mettono, come dato, col vocabolario che c'è già:
  //   - la SCALETTA di ferro minio fra due tetti attaccati che differiscono di un piano o due (2,4-4,8 m): sta sul muro del più alto,
  //     il piede sul tetto più basso (è una LADDERS con footB, il motore la sale già);
  //   - l'ARCO DI CONTRASTO sopra il vicolo di una o due caselle (2-4 m) nel borgo e nella marina: un arco di pietra col dorso
  //     calpestabile, fra due tetti entro un piano (è una PLANKS con arco: true, il motore la cammina già);
  //   - la PASSERELLA di tavole (o il ponticello di ferro sopra le tre caselle) dove il vicolo è più largo, o nell'Ottocento.
  // Si legano prima le isole fra loro (un albero: ogni legame unisce due pezzi di rete diversi, dal più economico), poi pochi legami
  // in più che chiudono un anello dove il giro sui tetti era lungo più di otto passi. Mai sopra le vie da 5 m in su (Rua, Marina,
  // Vittoria, Corso) né sopra le piazze; un attraversamento ogni 9 m al più, due legami nuovi per casa al più. Tutto dalle caselle e
  // dalle case: cambia la pianta, la rete si rifà.
  const ZONE4 = { E0: 'borgo', E2: 'marina', E3: 'ottocento' };
  const ok4 = b => b && ZONE4[b.era] && !b.__tierOf && !b.lighthouse && !b.kiosk && !b.church && !b.military && !b.gov && !b.shack && !b.pezzo;   // [tetti4] anche le case girate
  const RETE4 = { scalette: [], archi: [], passerelle: [], anelli: 0 }, DBG4 = typeof process !== 'undefined' && process.env && process.env.RETE4_DBG ? [] : null;
  function rete4() {
    if (!CN3) return;
    const E0 = grafo(), par = new Map(), find = a => { while (par.has(a) && par.get(a) !== a) a = par.get(a); return a; }, uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par.set(a, b); };
    B.forEach((b, i) => par.set(i, i));
    E0.forEach((L, a) => L.forEach(e => { if ((E0.get(e.b) || []).some(f => f.b === a)) uni(a, e.b); }));   // un pezzo di rete: ci si va e si torna
    const cand = new Map();   // per coppia: il legame migliore
    // [scale-finestre] e gli altri legami della stessa coppia (un altro muro, l'arco o la passerella su un altro lato): se il migliore non ci
    // sta (la scaletta finirebbe su una finestra), l'albero prova questi, dopo tutti i migliori
    const riserve4 = new Map();
    const tileOk = (tx, ty) => { if (!inb(tx, ty) || !G.walkT(tx, ty)) return false; const k = ty * GW + tx; return BI[k] < 0 && (W.roadW[k] || 0) <= 7 && G.tileAt(tx, ty) !== G.T.PIAZZA; };   // [cucitura] la Vittoria ora è di 7 m: anche lei si scavalca, di rado
    const via5 = (tx, ty, ox, oy, g) => { for (let q = 0; q < g; q++) if ((W.roadW[(ty + oy * q) * GW + tx + ox * q] || 0) >= 5) return true; return false; };   // la Rua e la Marina: solo l'arco, uno ogni 30 m
    B.forEach((b, bi) => {
      if (!ok4(b) || b.w < 1 || b.h < 1) return;
      sidesOf(b).forEach(sd => {
        const [ox, oy] = sd.out, runs = new Map();
        for (let k = 0; k < sd.n; k++) {
          const [tx0, ty0] = sd.tile(k);
          if (libero4(b)) {   // [tetti4] il lotto girato o col centro suo: dal suo muro, lungo la sua normale, la prima casa che s'incontra (le caselle sono solo l'impronta)
            const [wx, wy] = toW4(b, ...muroL4(b, sd, k)), [nx, ny] = giraV4(rotC4(b), ox, oy);
            for (let d = .25; d <= 8.5; d += .25) { const x = wx + nx * d, y = wy + ny * d, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!inb(tx, ty)) break; const o = BI[ty * GW + tx];
              if (o >= 0 && B[o] && o !== bi && (!libero4(B[o]) || dentro4(B[o], x, y, 0))) { const g = d < .5 ? 0 : clamp(Math.round(d / TS), 1, 3), key = o + ':' + g + ':0', R = runs.get(key) || runs.set(key, []).get(key); R.push(k); break; }
              if (o === bi || (o >= 0 && B[o])) continue; if (!tileOk(tx, ty)) break; }
            continue; }
          for (let g = 0; g <= 4; g++) {
            const tx = tx0 + ox * g, ty = ty0 + oy * g; if (!inb(tx, ty)) break;
            const o = BI[ty * GW + tx];
            if (o >= 0 && B[o]) { if (o !== bi) { const v5 = g > 0 && via5(tx0, ty0, ox, oy, g), key = o + ':' + g + ':' + (v5 ? 1 : 0), R = runs.get(key) || runs.set(key, []).get(key); R.push(k); } break; }
            if (!tileOk(tx, ty)) break;
          }
        }
        runs.forEach((R, key) => {
          const [o, g, v5] = key.split(':').map(Number), c = B[o]; if (!ok4(c)) return;
          if (g === 4 && !v5) return;   // [cucitura] sopra le vie da 5-7 m (Rua, Vittoria) solo dove i due muri si guardano per due caselle; quattro caselle solo lì
          const ha = roofRule(b), hc = roofRule(c), dh = hc - ha; let tipo = null, costo = 0;
          if (g === 0 && girata4(b, c) && Math.abs(dh) <= 1.2) { if ((E0.get(bi) || []).some(e => e.b === o)) return; tipo = 'passerella'; costo = 1.1; }   // [tetti4] case attaccate ma girate: dove i due tetti non si toccano, la passerella corta
          else if (g === 0) { if (dh <= 1.2 || dh > 4.9) return; tipo = 'scaletta'; costo = 1 + dh * .15; }   // b più basso, c più alto: la scala sul muro di c
          else { if (Math.abs(dh) > 2.7) return;   /* [cucitura] anche davanti a un muro di una casella sola (le case strette della marina): le assi sono larghe un metro */   /* un piano, più il terreno che sale (2,7 m) */ if (g === 1 && Math.abs(dh) <= 1.2 && JUMPS.some(J => (J.bi === bi && J.bj === o) || (J.bi === o && J.bj === bi))) return;
            tipo = v5 ? ((b.era === 'E3' || c.era === 'E3' || g >= 3) ? 'ponte' : 'arco') : (b.era === 'E3' || c.era === 'E3') ? (g >= 2 ? 'ponte' : 'passerella') : g <= 2 ? 'arco' : 'passerella'; costo = 1.4 + g * .5 + Math.abs(dh) * .2 + (v5 ? 1.5 : 0); }
          const m = R[Math.floor(R.length / 2)], pk = Math.min(bi, o) + ':' + Math.max(bi, o), q = cand.get(pk);
          const R2 = girata4(b, c) && tipo !== 'scaletta' ? (() => { const Q = []; for (let k = Math.min(...R) - .375; k <= Math.max(...R) + .376; k += .25) Q.push(k);
              // e il mezzo della parte dove i due lotti si guardano (fra due spigoli vicini la finestra buona è stretta)
              if (!rotC4(b) && !rotC4(c)) { const La = lotto4(b), Lc = lotto4(c), ns = sd.f === 'N' || sd.f === 'S', lo = ns ? Math.max(La.x0, Lc.x0) : Math.max(La.y0, Lc.y0), hi = ns ? Math.min(La.x1, Lc.x1) : Math.min(La.y1, Lc.y1);
                if (hi > lo) { const u = ((lo + hi) / 2 - (ns ? La.x0 : La.y0)) / (ns ? La.lw : La.ld), k = u * sd.n - .5; if (k >= Math.min(...R) - .5 && k <= Math.max(...R) + .5) Q.unshift(k); } }
              return Q; })() : tipo === 'scaletta' ? R.concat(R.filter(k => R.includes(k + 1)).map(k => k + .5)) : R;   // [scale-finestre] la scaletta anche sul giunto fra due caselle (fra due colonne di finestre)   // [tetti4] sul muro del lotto ogni mezzo metro, non solo ogni casella: fra due scale e un arretramento il posto giusto può stare a metà
          const ks = R2.slice().sort((u, v) => Math.abs(u - m) - Math.abs(v - m));   // [tetti4] la posizione di mezzo, poi le altre: se una è occupata si prova la vicina
          const C = { tipo, costo: costo - Math.min(R.length, 4) * .1, a: bi, b: o, sd, k: m, ks, g, dh, v5: !!v5 };
          if (!q || C.costo < q.costo) cand.set(pk, C);
          if (q && q !== C) (riserve4.get(pk) || riserve4.set(pk, []).get(pk)).push(C.costo < q.costo ? q : C);   // [scale-finestre] i legami di riserva della coppia
        });
      });
    });
    const per = new Map(), passi = [], archi5 = [], lad0 = LADDERS.map(L => [L.tx, L.ty]);
    PLANKS.forEach(P => passi.push([(P.wa[0] + P.wb[0]) / 2, (P.wa[1] + P.wb[1]) / 2]));
    const mettiC = (C, sep) => { for (const k of C.ks) { if ((sep || 9) > 3 && k !== Math.round(k) && C.tipo !== 'scaletta') continue;   /* [tetti4] le posizioni a metà casella solo per ricucire (passi da 3 m in giù) */ const r = mettiK(C, k, sep || 9); if (r === true) return true; if (r === 'per') return false; } return false; };
    const mettiK = (C, kk, sep) => {
      SEP4 = sep;   // [tetti4] per ricucire un pezzo staccato (a meno di 4 m da un altro passaggio) le regole si allargano un poco
      const [wx, wy] = C.sd.wall(kk), [ox, oy] = C.sd.out;
      if ((per.get(C.a) || 0) >= 3 || (per.get(C.b) || 0) >= 3) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'per']), 'per');
      if (C.tipo === 'scaletta') {   // sul muro della casa alta (c), il piede sul tetto della bassa (b): out va da c verso b
        const hi = C.b, lo = C.a; let ux = -ox, uy = -oy, ax = wx, ay = wy;   // il muro di b verso c è il muro condiviso
        if (girata4(B[hi], B[lo])) {   // [tetti4] la scala sul muro girato della casa alta, il piede dentro la bassa: lungo il muro di hi che guarda lo, il primo punto buono
          const H = B[hi], LH = lotto4(H), hx0 = LH.x0, hy0 = LH.y0, hx1 = LH.x1, hy1 = LH.y1, [nx, ny] = [-ox, -oy];   // nel riferimento di hi, la faccia verso lo ha normale (nx, ny)
          const faccia = nx ? [[nx > 0 ? hx1 : hx0, hy0 + .45], [nx > 0 ? hx1 : hx0, hy1 - .45]] : [[hx0 + .45, ny > 0 ? hy1 : hy0], [hx1 - .45, ny > 0 ? hy1 : hy0]];
          [ux, uy] = giraV4(rotC4(H), nx, ny); const loc0 = toL4(H, wx, wy); let ok = false;
          const tt = []; for (let t = 0; t <= 1.0001; t += .1) tt.push(t);
          { const Lf = nx ? LH.ld : LH.lw; for (let v = 1; v < Lf - .45; v += 1) for (const u of [v, Lf - v]) if (u > .45 && u < Lf - .45) tt.push((u - .45) / (Lf - .9)); }   // [scale-finestre] anche i centri e i giunti dei moduli della facciata alta tt.sort((p, q) => { const d = t => hyp(faccia[0][0] + (faccia[1][0] - faccia[0][0]) * t - loc0[0], faccia[0][1] + (faccia[1][1] - faccia[0][1]) * t - loc0[1]); return d(p) - d(q); });
          for (const t of tt) { [ax, ay] = toW4(H, faccia[0][0] + (faccia[1][0] - faccia[0][0]) * t, faccia[0][1] + (faccia[1][1] - faccia[0][1]) * t);
            if (dentro4(B[lo], ax + ux * .55, ay + uy * .55, .05) && !dentro4(H, ax + ux * .55, ay + uy * .55, -.05) && dentro4(H, ax - ux * .8, ay - uy * .8, .2) && bAt(ax + ux * .55, ay + uy * .55) === lo && bAt(ax - ux * .8, ay - uy * .8) === hi && !sopraApertura4(hi, ax, ay, ux, uy, lo)) { ok = true; break; } }   // [scale-finestre] e non su un vano
          if (!ok) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'girata']), false); }
        const L = { i: LADDERS.length, bi: hi, f: 'r4', x: ax, y: ay, ox: ux, oy: uy, fx: ax + ux * .55, fy: ay + uy * .55, tx: ax - ux * .8, ty: ay - uy * .8, footB: lo, ang: Math.atan2(uy, ux), vis: true, tipo4: 'scaletta' };
        if (bAt(L.fx, L.fy) !== lo || bAt(L.tx, L.ty) !== hi) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'piede']), false);
        if (sopraApertura4(hi, ax, ay, ux, uy, lo)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'finestra']), false);   // [scale-finestre] sopra il tetto basso il muro alto ha le finestre: la scaletta va fra le colonne cieche
        if (lad0.some(([x, y]) => hyp(x - L.tx, y - L.ty) < (sep < 4 ? 1.4 : sep < 6 ? 1.7 : 2.2) || hyp(x - L.fx, y - L.fy) < 1.4)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'scala vicina']), false);
        if (passi.some(([x, y]) => hyp(x - ax, y - ay) < 3)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'passo vicino']), false);
        LADDERS.push(L); lad0.push([L.tx, L.ty]); RETE4.scalette.push(L.i);
      } else {
        if (girata4(B[C.a], B[C.b])) return obliqua4(C, kk, sep);   // [tetti4]
        const gap = C.g * TS, cx = wx + ox * gap / 2, cy = wy + oy * gap / 2;
        if (passi.some(([x, y]) => hyp(x - cx, y - cy) < sep)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, '9m']), false);
        if (C.v5 && archi5.some(([x, y]) => hyp(x - cx, y - cy) < 30)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, '30m']), false);   // sopra la Rua e la Marina un arco ogni 30 m (LEGGIBILITA.md)
        if (lad0.some(([x, y]) => hyp(x - wx, y - wy) < (sep < 2.5 ? .9 : sep < 4 ? 1.1 : 1.8) || hyp(x - wx - ox * gap, y - wy - oy * gap) < (sep < 2.5 ? .9 : sep < 4 ? 1.1 : 1.8))) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'scala vicina2']), false);
        const pin = (ox ? Math.min(B[C.a].w, B[C.b].w) : Math.min(B[C.a].h, B[C.b].h)) >= 2 ? PIN : 1.36;   // [tetti4] sulle case di una casella la rampa si ferma a 64 cm dal muro di là (il parapetto e la copertina): la scaletta resta dolce   // la testa delle assi entra un metro e mezzo; sulle case di una casella (2 m) novanta centimetri
        const P = { i: PLANKS.length, a: C.a, b: C.b, ox, oy, px: -oy, py: ox, hw: C.tipo === 'arco' ? .45 : PHW, gap, pin, x0: wx - ox * pin, y0: wy - oy * pin, wa: [wx, wy], wb: [wx + ox * gap, wy + oy * gap], arco: C.tipo === 'arco', tipo4: C.tipo };
        P.L = pin * 2 + gap; P.s1 = pin; P.s2 = pin + gap;
        if (!sgombra4(P)) return (DBG4 && DBG4.push([C.a, C.b, C.tipo, 'ingombro']), false);   // [tetti4] accanto a un palazzo, una chiesa o un pezzo grande no
        PLANKS.push(P); passi.push([cx, cy]); if (C.v5) { archi5.push([cx, cy]); P.via5 = true; } (C.tipo === 'arco' ? RETE4.archi : RETE4.passerelle).push(P.i);
        for (let s2 = 0; s2 <= P.L; s2 += .5) for (const t of [-P.hw, 0, P.hw]) { const x = P.x0 + ox * s2 + P.px * t, y = P.y0 + oy * s2 + P.py * t, ck = Math.floor(y / TS) * GW + Math.floor(x / TS);
          const A = PCELL.get(ck) || PCELL.set(ck, []).get(ck); if (A.indexOf(P) < 0) A.push(P); }
      }
      per.set(C.a, (per.get(C.a) || 0) + 1); per.set(C.b, (per.get(C.b) || 0) + 1); return true;
    };
    // [tetti4] L'ATTRAVERSAMENTO FRA CASE GIRATE: parte dal muro girato di a, perpendicolare a lui, e va finché entra nel rettangolo girato di b
    // (la faccia d'entrata al più 35° di sbieco). Le teste entrano nelle due case quanto ci stanno (fino a 1,5 m, 62 cm dal muro di là); il
    // pianerottolo sul capo di b è più lungo quanto è sbieco l'ingresso. Sotto l'impalcato, sopra il vicolo, nessuna casa; nelle teste solo la sua.
    const obliqua4 = (C, kk, sep) => {
      const A = B[C.a], Bb = B[C.b], [w0x, w0y] = muroL4(A, C.sd, kk); let [wx, wy] = toW4(A, w0x, w0y); const nA = giraV4(rotC4(A), C.sd.out[0], C.sd.out[1]);
      // la faccia di b che guarda a: delle quattro normali girate, la più opposta a quella di a
      const nB = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([u, v]) => giraV4(rotC4(Bb), u, v)).sort((p, q) => (p[0] * nA[0] + p[1] * nA[1]) - (q[0] * nA[0] + q[1] * nA[1]))[0];
      const bis = (() => { const u = nA[0] - nB[0], v = nA[1] - nB[1], l = hyp(u, v) || 1; return [u / l, v / l]; })();
      let ultimo = 'sbieco';
      // [tetti4] sul muro stretto (fino a tre caselle) si prova anche il mezzo del muro: la testa larga un metro non ci sta vicino allo spigolo
      const mezzo = C.sd.n <= 3 ? toW4(A, ...muroL4(A, { f: C.sd.f, n: 1 }, 0)) : null;
      for (const w of mezzo ? [[wx, wy], mezzo] : [[wx, wy]]) { [wx, wy] = w; for (const d of [nA, [-nB[0], -nB[1]], bis]) { const r = prova(d); if (r === true) return true; ultimo = r; } }
      return (DBG4 && DBG4.push([C.a, C.b, C.tipo, ultimo]), false);
      // una retta per il punto del muro di a nel verso d: dove esce da a, dove entra in b, quanto di sbieco
      // [tetti4] la testa entra 1,5 m nel tetto; se non ci sta (la casa stretta, girata) si prova più corta, fino a 95 cm
      function prova(d) { let r; for (const fp of sep <= 3 ? [1, .8, .63] : [1]) { r = prova1(d, fp); if (r === true || (r !== 'testa a' && r !== 'testa b')) return r; } return r; }
      function prova1([ox, oy], fp) {
        const px0 = wx - ox * 100, py0 = wy - oy * 100, rA = raggio4(A, px0, py0, ox, oy), rB = raggio4(Bb, px0, py0, ox, oy), c35 = Math.cos((SEP4 < 4 ? 45 : 35) * Math.PI / 180);
        if (!rA || !rB || rB.tin < rA.tout + .1 || rB.tin - rA.tout > 8.5) return 'sbieco';
        const rA2 = raggio4(A, px0 + ox * 300, py0 + oy * 300, -ox, -oy); if (!rA2) return 'sbieco';
        const cosA = rA2.cos, cosB = rB.cos; if (cosA < c35 || cosB < c35) return 'sbieco';
        const ax = px0 + ox * rA.tout, ay = py0 + oy * rA.tout, gap = rB.tin - rA.tout, hw = C.tipo === 'arco' ? .45 : PHW, lw = hw + .06, tan = c => Math.sqrt(Math.max(0, 1 - c * c)) / c;
        const pin = Math.min(1.5 * fp, rA.tout - rA.tin - .62 / cosA), pinB = Math.min(1.5 * fp, rB.tout - rB.tin - .62 / cosB); if (pin < .9 || pinB < .9) return 'stretta';
        const P = { i: PLANKS.length, a: C.a, b: C.b, ox, oy, px: -oy, py: ox, hw, gap, pin, pinB, x0: ax - ox * pin, y0: ay - oy * pin, wa: [ax, ay], wb: [ax + ox * gap, ay + oy * gap], arco: C.tipo === 'arco', tipo4: C.tipo, obliqua: true,
          margA: .45 / cosA + lw * tan(cosA), margB: .45 / cosB + lw * tan(cosB) };
        P.s1 = pin; P.s2 = pin + gap; P.L = P.s2 + pinB; if (P.s1 - P.margA < .3 || P.L - P.s2 - P.margB < .3) return 'stretta';
        const cx = ax + ox * gap / 2, cy = ay + oy * gap / 2;
        if (passi.some(([x, y]) => hyp(x - cx, y - cy) < sep)) return '9m';
        if (lad0.some(([x, y]) => hyp(x - ax, y - ay) < (sep < 2.5 ? .9 : sep < 4 ? 1.1 : 1.8) || hyp(x - P.wb[0], y - P.wb[1]) < (sep < 2.5 ? .9 : sep < 4 ? 1.1 : 1.8))) return 'scala vicina2';
        // le teste dentro la loro casa (lontano dai parapetti di fianco), l'impalcato sopra il vuoto, accanto nessuno più alto (di una casa senza piano, 60 cm d'aria)
        if (terza4(P)) return 'terza';   // [tetti4]
        const mA4 = .42, mB4 = .42;   // le teste a 42 cm dai muri di fianco (il parapetto e la copertina)
        const hmin = Math.min(roofRule(A), roofRule(Bb));
        for (let s2 = 0; s2 <= P.L + 1e-6; s2 += .2) for (const t of [-lw - .95, -lw - .6, -lw - .3, -lw, -lw / 2, 0, lw / 2, lw, lw + .3, lw + .6, lw + .95]) {
          const x = P.x0 + ox * s2 + P.px * t, y = P.y0 + oy * s2 + P.py * t, sotto = Math.abs(t) <= lw + .01;
          if (sotto && s2 <= P.s1 - P.margA && !dentro4(A, x, y, mA4)) return 'testa a';
          if (sotto && s2 >= P.s2 + P.margB && !dentro4(Bb, x, y, mB4)) return 'testa b';
          if (sotto && s2 > P.s1 + .05 && s2 < P.s2 - .05 && (dentro4(A, x, y, .02) || dentro4(Bb, x, y, .02))) return 'vicolo';
          const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
          const visti4 = []; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (!inb(tx + i, ty + j)) continue; const o = BI[(ty + j) * GW + tx + i]; if (o < 0 || o === C.a || o === C.b || !B[o] || visti4.includes(o)) continue; visti4.push(o);
            if (!dentro4(B[o], x, y, -.6)) continue; const era = conPiano4(B[o]); if (fuori4(B[o], x, y) > .6) continue;   /* col margine della gronda (agli spigoli in tondo) */
            // [tetti4] la quota delle assi lì (sulle teste quella del loro tetto, sul vuoto in pendenza fra i due): accanto conta chi è più alto di quella
            const u4 = Math.max(0, Math.min(1, (s2 - P.s1) / Math.max(.1, P.s2 - P.s1))), hq = Math.min(roofRule(A) + (roofRule(Bb) - roofRule(A)) * u4, Math.max(roofRule(A), roofRule(Bb)));
            if (roofRule(B[o]) <= hq - .1 && ((s2 <= P.s1 && dentro4(A, x, y, 0)) || (s2 >= P.s2 && dentro4(Bb, x, y, 0)))) continue;   // sulla testa, sopra il suo tetto, la gronda di un vicino più basso sta sotto
            if ((!sotto && roofRule(B[o]) + 2.2 < hq) || (!sotto && era && roofRule(B[o]) <= hq + .3 && Math.abs(t) - lw > .4) || (!dentro4(B[o], x, y, 0) && roofRule(B[o]) + 1.2 < hq) || (!dentro4(B[o], x, y, -.1) && roofRule(B[o]) + .1 < hq)) continue;   // sopra la sola gronda di un vicino più basso si passa (il cornicione sporge 10 cm)
            if (sotto || (!era && Math.abs(t) - lw < .6) || (roofRule(B[o]) > hq + .1 && Math.abs(t) - lw < .95)) return 'ingombro'; }
          if (sotto && BI[ty * GW + tx] < 0 && G.tileAt(tx, ty) === G.T.BLD) return 'pezzo'; }
        PLANKS.push(P); passi.push([cx, cy]); if (C.v5) { archi5.push([cx, cy]); P.via5 = true; } (C.tipo === 'arco' ? RETE4.archi : RETE4.passerelle).push(P.i);
        for (let s2 = 0; s2 <= P.L; s2 += .5) for (const t of [-P.hw, 0, P.hw]) { const x = P.x0 + ox * s2 + P.px * t, y = P.y0 + oy * s2 + P.py * t, ck = Math.floor(y / TS) * GW + Math.floor(x / TS);
          const Ar = PCELL.get(ck) || PCELL.set(ck, []).get(ck); if (Ar.indexOf(P) < 0) Ar.push(P); }
        per.set(C.a, (per.get(C.a) || 0) + 1); per.set(C.b, (per.get(C.b) || 0) + 1); return true;
      }
    };
    // 1) l'albero: si legano pezzi di rete diversi, dal legame più economico
    const tutti = [...cand.values()].sort((p, q) => p.costo - q.costo || p.a - q.a || p.b - q.b), usati = new Set();
    tutti.push(...[...riserve4.values()].flat().sort((p, q) => p.costo - q.costo || p.a - q.a || p.b - q.b));   // [scale-finestre]
    tutti.forEach(C => { if (find(C.a) === find(C.b)) return; if (mettiC(C, 6) || mettiC(C, 4.5) || mettiC(C, 3) || mettiC(C, 2.2)) { uni(C.a, C.b); usati.add(C); } });   // [cucitura] se a 6 m c'è già un passaggio, a 4,5 m: un pezzo staccato vale un attraversamento in più
    salite4(find, lad0, passi);
    // 2) gli anelli: dove sui tetti per andare da una casa all'altra servono più di otto passaggi, un legame li accorcia
    const E1 = grafo(), hop = (s, t, max) => { const d = new Map([[s, 0]]), Q = [s]; for (let k = 0; k < Q.length; k++) { const a = Q[k], da = d.get(a); if (a === t) return da; if (da >= max) continue; (E1.get(a) || []).forEach(e => { if (!d.has(e.b)) { d.set(e.b, da + 1); Q.push(e.b); } }); } return Infinity; };
    tutti.forEach(C => { if (usati.has(C) || RETE4.anelli >= 24 || C.tipo === 'scaletta') return; if (hop(C.a, C.b, 9) <= 8) return; if (mettiC(C, 9)) { usati.add(C); RETE4.anelli++; } });
  }
  // [tetti4] LE SALITE DELLA RETE: ogni pezzo di rete dei tre quartieri vecchi ha almeno tre scale da terra (due per un giro, una per
  // la terza via), viste dalla camera come vuole [tetti3]: sul lato sud o est, mai coperte da una casa o da un pezzo grande, mai nel
  // budello, lontane dalla porta, staccate dieci metri dalle altre scale del pezzo.
  function salite4(find0, lad0, passi) {
    // [scale-finestre] i pezzi si contano sui soli tetti dei quartieri vecchi (come i giri di percorsi.js): un pezzo che si tiene solo
    // passando per una casa d'altra epoca sono due pezzi, e ognuno vuole le sue salite (le scale che non stanno sulle finestre sono meno,
    // e i legami fra le case strette dell'Ottocento non ci stanno: senza questo un pezzo restava con una scala sola)
    const E5 = grafo(), par5 = new Map(), find = a => { while (par5.get(a) !== a) a = par5.get(a); return a; };
    B.forEach((b, i) => { if (ok4(b)) par5.set(i, i); });
    E5.forEach((L, a) => { if (!par5.has(a)) return; L.forEach(e => { if (!par5.has(e.b) || !(E5.get(e.b) || []).some(f => f.b === a)) return; const u = find(a), v = find(e.b); if (u !== v) par5.set(u, v); }); });
    const pezzi = new Map(); B.forEach((b, i) => { if (!ok4(b)) return; const r = find(i); (pezzi.get(r) || pezzi.set(r, []).get(r)).push(i); });
    RETE4.salite = []; const no4 = (bi, r) => { if (DBG4) DBG4.push([bi, bi, 'salita', r]); };
    pezzi.forEach(P => {
      if (P.length < 5) return; const S = new Set(P), terra = () => LADDERS.filter(L => L.footB < 0 && !L.camm && S.has(L.bi));
      const voglio = Math.min(5, 3 + Math.floor(P.length / 30)); let forza4 = false;
      const lontane = () => { const T1 = terra(); let m = 0; T1.forEach(a => T1.forEach(c => { m = Math.max(m, hyp(a.fx - c.fx, a.fy - c.fy)); })); return m; };   // [cucitura] un giro sale e scende a 18 m almeno: due salite lontane
      for (let giro = 0; giro < 8 && (terra().length < voglio || (P.length >= 20 && lontane() < 24)); giro++) {
        let best = null; const T0 = terra(), largo = giro >= 6 || forza4 || (giro >= 1 && T0.length === 0);   // [cucitura] il pezzo che non ha altre salite: anche nel vicolo di una casella, purché la scala si veda
        P.forEach(bi => { const b = B[bi], d = DOOR(b);
          if (libero4(b)) { sidesOf(b).forEach(sd => { if (sd.f !== 'S' && sd.f !== 'E' && !(largo && T0.length < 2)) return;   /* [tetti4] il pezzo senza due salite: anche sugli altri muri, se la camera vede la scala */ const [ox, oy] = giraV4(rotC4(b), ...sd.out);   // [tetti4] la casa girata (o col lotto suo): la salita sul muro del lotto
              for (const k of postiL4(b, sd)) { const [wx, wy] = toW4(b, ...muroL4(b, sd, k)), dp = piede4(wx, wy, ox, oy), fx = wx + ox * dp, fy = wy + oy * dp, tx2 = wx - ox * .8, ty2 = wy - oy * .8;
                if (bAt(fx, fy) >= 0 || !G.walkM(fx, fy) || !G.walkM(wx + ox * 2.2, wy + oy * 2.2) || (bAt(wx + ox * 2.2, wy + oy * 2.2) >= 0 && !largo) || bAt(tx2, ty2) !== bi || bAt(wx - ox * 1.6, wy - oy * 1.6) !== bi) { no4(bi, 'budello'); continue; }
                if (d && hyp(fx - (d[0] + .5) * TS, fy - (d[1] + .5) * TS) < 1.6) { no4(bi, 'porta'); continue; }
                if (sopraApertura4(bi, wx, wy, ox, oy, -1)) { no4(bi, 'finestra'); continue; }   // [scale-finestre]
                if (lad0.some(([x, y]) => hyp(x - tx2, y - ty2) < 2.2) || LADDERS.some(L => hyp(L.fx - fx, L.fy - fy) < 2) || passi.some(([x, y]) => hyp(x - wx, y - wy) < 3)) { no4(bi, 'vicina'); continue; }
                if (coperta(wx, wy, ox, oy)) { no4(bi, 'coperta'); continue; } if (!scalaVista3(wx, wy, ox, oy, tileH(fx, fy), roofRule(b))) { no4(bi, 'nonvista'); continue; }
                const dmin = T0.length ? Math.min(...T0.map(L => hyp(L.fx - fx, L.fy - fy))) : 99; if (dmin < 10) { no4(bi, '10m'); continue; }
                const s = Math.min(dmin, 40) + (k === 0 || k === sd.n - 1 ? 2 : 0);
                if (!best || s > best.s) best = { s, bi, sd, k, wx, wy, ox, oy, fx, fy, tx: tx2, ty: ty2 }; } }); return; }
          sidesOf(b).forEach(sd => { if (sd.f !== 'S' && sd.f !== 'E' && !(largo && T0.length < 2)) return;   /* [tetti4] il pezzo senza due salite: anche sugli altri muri, se la camera vede la scala */ const [ox, oy] = sd.out;
            const no = r => { if (DBG4) DBG4.push([bi, bi, 'salita', r]); };
            for (const k of posti4(sd.n)) { const KT = [Math.floor(k), Math.ceil(k)].map(q => sd.tile(q)), [tx, ty] = KT[1];   // [scale-finestre] al centro della casella o sul giunto fra due
              if (KT.some(([tx, ty]) => !inb(tx, ty) || BI[ty * GW + tx] >= 0 || !G.walkT(tx, ty) || !G.walkT(tx + ox, ty + oy) || (BI[(ty + oy) * GW + tx + ox] >= 0 && !largo))) { no('budello'); continue; }
              if (d && k === Math.round(k) && Math.abs(tx - d[0]) + Math.abs(ty - d[1]) < 1) { no("porta"); continue; }   // [scale-finestre] sul giunto accanto alla porta il vano lo guarda aperture4   // accanto alla porta va bene (la porta è larga un metro)
              const [wx, wy] = sd.wall(k), fx = wx + ox * .55, fy = wy + oy * .55, tx2 = wx - ox * .8, ty2 = wy - oy * .8;
              if (LIB4 && bAt(fx, fy) >= 0) { no('budello'); continue; }   // [tetti4] il piede nel lotto girato di un vicino
              if (sopraApertura4(bi, wx, wy, ox, oy, -1)) { no('finestra'); continue; }   // [scale-finestre]
              if (lad0.some(([x, y]) => hyp(x - tx2, y - ty2) < 2.2) || LADDERS.some(L => hyp(L.fx - fx, L.fy - fy) < 2) || passi.some(([x, y]) => hyp(x - wx, y - wy) < 3)) { no('vicina'); continue; }
              if (coperta(wx, wy, ox, oy)) { no('coperta'); continue; } if (!scalaVista3(wx, wy, ox, oy, tileH(fx, fy), roofRule(b))) { no('nonvista'); continue; }
              const dmin = T0.length ? Math.min(...T0.map(L => hyp(L.fx - fx, L.fy - fy))) : 99; if (dmin < 10) { no('10m'); continue; }
              const s = Math.min(dmin, 40) + (k === 0 || k === sd.n - 1 ? 2 : 0);
              if (!best || s > best.s) best = { s, bi, sd, k, wx, wy, ox, oy, fx, fy, tx: tx2, ty: ty2 }; } }); });
        if (!best) { if (!forza4 && T0.length < 2) { forza4 = true; continue; } break; }   // [tetti4] il pezzo con meno di due salite: si riprova largo (anche nel vicolo, anche sugli altri muri)
        const L = { i: LADDERS.length, bi: best.bi, f: best.sd.f, x: best.wx, y: best.wy, ox: best.ox, oy: best.oy, fx: best.fx, fy: best.fy, tx: best.tx, ty: best.ty, footB: -1, ang: Math.atan2(best.oy, best.ox), vis: true, tipo4: 'salita' };
        LADDERS.push(L); lad0.push([L.tx, L.ty]); RETE4.salite.push(L.i);
      }
    });
  }
  if (!COT4) rete4();

  // ---------------- [tetti4] LE CORTI: il vuoto dentro gli isolati ha uno scopo ----------------
  // Dentro gli isolati del borgo, della marina e dell'Ottocento il suolo che non è strada (le caselle senza larghezza di via, chiuse per
  // buona parte da case dei tre quartieri) era un fondo beige senza niente: cortili vuoti, angoli morti. Ognuno prende UNO scopo, come i
  // tetti di [tetti3]: la CORTE COL POZZO (borgo, le corti grandi), l'ORTO MURATO (gli aranci e le aiuole; l'Ottocento e le corti piccole
  // del borgo), il CORTILE DELLE RETI (la marina: il banco, le nasse, le reti stese), il PASSAGGIO COPERTO (la striscia larga una casella
  // fra due strade: il pergolato sopra). I percorsi ci passano: una scala minio scende dal tetto nella corte (è il premio «corte» dei
  // giri), il passaggio lega due strade. CORTI: { i, k, nome, x, y, celle: [[tx, ty]], n, era, scala }.
  const CORTI = [];
  function corti4() {
    CORTI.length = 0; if (!CN3) return;
    const T0 = G.T, seen = new Uint8Array(GW * GH), suolo = (tx, ty) => { if (!inb(tx, ty)) return false; const k = ty * GW + tx, v = G.tileAt(tx, ty); return BI[k] < 0 && !(W.roadW[k] > 0) && G.walkT(tx, ty) && v !== T0.PIAZZA && v !== T0.WATER && v !== T0.QUAY && v !== T0.PIER && v !== T0.SAND; };
    const strada = (tx, ty) => inb(tx, ty) && (W.roadW[ty * GW + tx] > 0 || G.tileAt(tx, ty) === T0.PIAZZA);
    const lad0 = () => LADDERS.map(L => [L.fx, L.fy, L.tx, L.ty]);
    for (let ty0 = 0; ty0 < GH; ty0++) for (let tx0 = 0; tx0 < GW; tx0++) {
      if (seen[ty0 * GW + tx0] || !suolo(tx0, ty0)) continue;
      const cel = [], Q = [[tx0, ty0]]; seen[ty0 * GW + tx0] = 1; let bordo = 0, case4 = 0, strade = 0; const ere = {};
      for (let k = 0; k < Q.length && Q.length < 400; k++) { const [tx, ty] = Q[k]; cel.push([tx, ty]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = tx + dx, y = ty + dy; if (!inb(x, y)) continue; const j = y * GW + x;
          if (suolo(x, y)) { if (!seen[j]) { seen[j] = 1; Q.push([x, y]); } continue; }
          bordo++; const o = BI[j]; if (o >= 0 && B[o] && ZONE4[B[o].era]) { case4++; ere[B[o].era] = (ere[B[o].era] || 0) + 1; } else if (strada(x, y)) strade++; } }
      if (DBG4) DBG4.push(["corte", cel.length, Math.round(100 * case4 / bordo), Q.length >= 400]);
      if (Q.length >= 400 || cel.length < 3 || cel.length > 160 || case4 < bordo * .25 || strade > bordo * .5) continue;   // chiuso almeno per un quarto da case dei quartieri vecchi, e non un marciapiede (metà del bordo strada)
      const xs = cel.map(c => c[0]), ys = cel.map(c => c[1]), wX = Math.max(...xs) - Math.min(...xs) + 1, wY = Math.max(...ys) - Math.min(...ys) + 1;
      if (PZ.length && cel.some(([tx, ty]) => inPz(tx * TS + 1, ty * TS + 1, 0))) continue;   // ci sta già un pezzo (lavatoio, pozzo, arco): non è vuoto
      const era = Object.entries(ere).sort((a, c) => c[1] - a[1])[0][0], h = ((tx0 * 73856093) ^ (ty0 * 19349663)) >>> 0;
      const k = Math.min(wX, wY) === 1 && Math.max(wX, wY) >= 3 && strade >= 2 ? 'passaggio' : era === 'E2' ? 'bottega' : era === 'E3' ? 'orto' : cel.length >= 14 || h % 3 === 0 ? 'pozzo' : 'orto';
      const NOMI = { pozzo: 'la corte del pozzo', orto: "l'orto murato", bottega: 'il cortile delle reti', passaggio: 'il passaggio coperto' };
      const cx = cel.reduce((s2, c) => s2 + c[0], 0) / cel.length, cy = cel.reduce((s2, c) => s2 + c[1], 0) / cel.length;
      CORTI.push({ i: CORTI.length, k, nome: NOMI[k], x: (cx + .5) * TS, y: (cy + .5) * TS, celle: cel, n: cel.length, era, wX, wY, scala: -1 });
    }
    // la scala nella corte: dal tetto di una casa dei quartieri vecchi che ci si affaccia, i piedi in corte (non nel passaggio)
    CORTI.forEach(C => {
      if (C.k === 'passaggio' || C.n < 5) return; const S = new Set(C.celle.map(([x, y]) => y * GW + x)), L0 = lad0(); let best = null;
      B.forEach((b, bi) => { if (!ok4(b) || b.annesso || libero4(b)) return; const d = DOOR(b);
        sidesOf(b).forEach(sd => { const [ox, oy] = sd.out; for (const k of posti4(sd.n)) { const KT = [Math.floor(k), Math.ceil(k)].map(q => sd.tile(q));   // [scale-finestre] anche sul giunto fra due caselle
          if (KT.some(([tx, ty]) => !S.has(ty * GW + tx) || !S.has((ty + oy) * GW + tx + ox))) continue;
          if (d && KT.some(([tx, ty]) => d[0] === tx && d[1] === ty)) continue; const [wx, wy] = sd.wall(k), fx = wx + ox * .55, fy = wy + oy * .55, tx2 = wx - ox * .8, ty2 = wy - oy * .8;
          if (L0.some(([a, b2, c, e]) => hyp(a - fx, b2 - fy) < 2.5 || hyp(c - tx2, e - ty2) < 2.2)) continue;
          if (sopraApertura4(bi, wx, wy, ox, oy, -1)) continue;   // [scale-finestre] anche in corte, sul muro cieco
          const vis = scalaVista3(wx, wy, ox, oy, tileH(fx, fy), roofRule(b)), s2 = (vis ? 5 : 0) + (sd.f === 'S' || sd.f === 'E' ? 2 : 0) - Math.abs(roofRule(b) - 6) * .3;
          if (!best || s2 > best.s) best = { s: s2, bi, sd, wx, wy, ox, oy, fx, fy, tx: tx2, ty: ty2, vis }; } }); });
      if (!best) return;
      const L = { i: LADDERS.length, bi: best.bi, f: best.sd.f, x: best.wx, y: best.wy, ox: best.ox, oy: best.oy, fx: best.fx, fy: best.fy, tx: best.tx, ty: best.ty, footB: -1, ang: Math.atan2(best.oy, best.ox), vis: best.vis, corte: C.i, tipo4: 'corte' };
      LADDERS.push(L); C.scala = L.i;
    });
  }
  if (!COT4) corti4();
  // [percorsi] IL GRAFO DEI TETTI per i percorsi (percorsi.js): per ogni tetto gli archi orientati verso i tetti dove si passa, col punto
  // del passaggio. k: 'tetto' (si tocca, dislivello entro un gradino), 'gradino' (si tocca, si sale col salto fino a 1,2 m), 'salto'
  // (il vicolo di una casella coi bordi crema, JUMPS), 'passerella' (PLANKS), 'scala' (la scala di ferro fra un tetto basso e uno alto).
  // Si scende sempre fino alla caduta senza danni (SAFE).
  function grafo() {
    const E = new Map(), add = (a, b, k, x, y, i, ux, uy) => { const L = E.get(a) || E.set(a, []).get(a); if (!L.some(e => e.b === b && e.k === k)) L.push({ a, b, k, x, y, i, ux, uy }); };   // ux, uy: il verso del passaggio
    const seen = new Map();
    B.forEach((b, bi) => { if (b.lighthouse) return; for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) { if (BI[ty * GW + tx] !== bi) continue;
      for (const [dx, dy] of [[1, 0], [0, 1]]) { const x2 = tx + dx, y2 = ty + dy; if (!inb(x2, y2)) continue; const o = BI[y2 * GW + x2]; if (o < 0 || o === bi || !B[o]) continue;
        const key = Math.min(bi, o) + ':' + Math.max(bi, o), L = seen.get(key) || seen.set(key, []).get(key); L.push([(tx + .5 + dx * .5) * TS, (ty + .5 + dy * .5) * TS, bi, dx, dy]); } } });
    // [tetti4] i lotti liberi: le case vicine anche dove l'impronta delle caselle lascia un buco (il contatto si cerca poi sui muri del lotto)
    B.forEach((b, bi) => { if (b.lighthouse || !libero4(b)) return; for (let ty = b.y - 2; ty < b.y + b.h + 2; ty++) for (let tx = b.x - 2; tx < b.x + b.w + 2; tx++) { if (!inb(tx, ty)) continue; const o = BI[ty * GW + tx];
      if (o < 0 || o === bi || !B[o] || B[o].lighthouse) continue; const key = Math.min(bi, o) + ':' + Math.max(bi, o); if (!seen.has(key)) seen.set(key, []); } });
    // [tetti4] il gioco ci cammina? Da 1,3 m di qua a 1,3 m di là della cucitura (x, y) nel verso (ux, uy), largo quanto chi cammina
    // (40 cm per parte): di qua i0, di là i1, di fianco l'una o l'altra (bAt legge i lotti liberi)
    // [tetti4] quanto è largo il passaggio: un metro dentro ciascuna delle due case, la distanza dal bordo più vicino del lotto (il parapetto)
    const largo4 = (x, y, ux, uy, i0, i1) => { const m = (b, px, py) => { const [lx, ly] = toL4(b, px, py), L = lotto4(b); return Math.min(lx - L.x0, L.x1 - lx, ly - L.y0, L.y1 - ly); };
      return Math.min(m(B[i0], x - ux, y - uy), m(B[i1], x + ux, y + uy)); };
    const cammina4 = (x, y, ux, uy, i0, i1, g) => { g = g || 0; for (let d = -1.3; d <= g + 1.3 + 1e-6; d += .1) for (const t of [-.4, 0, .4]) {
      const q = roofAt(x + ux * d - uy * t, y + uy * d + ux * t), o = q ? q.bi : -1; if (o !== i0 && o !== i1) return false; if (q.h > roofRule(B[o]) + .3) return false;   /* il tetto vero sotto i piedi (le gronde girate non si camminano, e non i parapetti) */ if (!t && ((d < -.15 && o !== i0) || (d > g + .15 && o !== i1))) return false; } return true; };
    // il contatto fra due lotti sul muro di a: un punto del muro dove di qua c'è a, di là b, e in mezzo al più 45 cm di vuoto
    const contatto4 = (a, b) => { const A = B[a], Bb = B[b], L = lotto4(A);
      for (const [fx, fy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const [nx, ny] = giraV4(rotC4(A), fx, fy);
        for (const t of [.5, .4, .6, .3, .7, .2, .8, .1, .9]) { const lx = fx ? (fx > 0 ? L.x1 : L.x0) : L.x0 + L.lw * t, ly = fy ? (fy > 0 ? L.y1 : L.y0) : L.y0 + L.ld * t, [x, y] = toW4(A, lx, ly);
          if (!dentro4(A, x - nx * .6, y - ny * .6, 0)) continue; let gap = -1; for (let d = 0; d <= .5; d += .05) if (dentro4(Bb, x + nx * d, y + ny * d, -.05)) { gap = d; break; }
          if (gap < 0 || !dentro4(Bb, x + nx * (gap + .6), y + ny * (gap + .6), 0)) continue;
          if (!cammina4(x, y, nx, ny, a, b, gap)) continue;   // il gioco cammina sulle caselle (e sui lotti)
          return [x + nx * gap / 2, y + ny * gap / 2, a, nx, ny]; } }
      return null; };
    seen.forEach((P, key) => { const [a, b] = key.split(':').map(Number); let m = P[Math.floor(P.length / 2)]; const ha = roofRule(B[a]), hb = roofRule(B[b]);
      if (girata4(B[a], B[b])) {   // [tetti4] da un tetto girato (o col lotto suo) all'altro: si tocca? Lungo tutta la cucitura delle caselle, dal mezzo in fuori, il primo punto buono
        const tocca = m => { const ux = m[3], uy = m[4], A0 = m[2] === a ? B[a] : B[b], A1 = A0 === B[a] ? B[b] : B[a];
          let vuoto = 0, peggio = 0; for (let k = -6; k <= 6; k++) { const x = m[0] + ux * k * .1, y = m[1] + uy * k * .1; if (dentro4(A0, x, y, -.05) || dentro4(A1, x, y, -.05)) vuoto = 0; else { vuoto += .1; peggio = Math.max(peggio, vuoto); } }
          if (!(peggio <= .45 && dentro4(A0, m[0] - ux * .6, m[1] - uy * .6, 0) && dentro4(A1, m[0] + ux * .6, m[1] + uy * .6, 0))) return false;   // un varco di 45 cm si scavalca, di più no
          if (!cammina4(m[0], m[1], ux, uy, B.indexOf(A0), B.indexOf(A1))) return false;   // e il gioco ci cammina: di qua a, di là b
          return true; };
        const ord = P.map((q, i) => [Math.abs(i - (P.length - 1) / 2) - 3 * Math.min(1.2, largo4(q[0], q[1], q[2] === a ? q[3] : -q[3], q[2] === a ? q[4] : -q[4], a, b)), q]).sort((u, v) => u[0] - v[0]).map(u => u[1]), mm = ord.find(tocca) || contatto4(a, b) || contatto4(b, a); if (!mm) return; m = mm; }   // dal mezzo, ma prima dove il passaggio è largo
      else if (LIB4 && P.some(q => LIB4.has(Math.floor(q[1] / TS) * GW + Math.floor(q[0] / TS)))) {   // [tetti4] due case sulla pianta, ma un lotto libero vicino può sporgere sulla cucitura: il primo punto dove il gioco passa
        const passa = m => cammina4(m[0], m[1], m[3], m[4], m[2], m[2] === a ? b : a);
        const ord = P.map((q, i) => [Math.abs(i - (P.length - 1) / 2) - 3 * Math.min(1.2, largo4(q[0], q[1], q[3], q[4], q[2], q[2] === a ? b : a)), q]).sort((u, v) => u[0] - v[0]).map(u => u[1]), mm = ord.find(passa); if (!mm) return; m = mm; }
      for (const [p, q, dh] of [[a, b, hb - ha], [b, a, ha - hb]]) { if (dh > 1.2 || dh < -SAFE) continue; const sg = m[2] === p ? 1 : -1;
        // [tetti3] scendendo più di un gradino si cade per un po': il tetto d'arrivo deve essere profondo almeno due caselle, se no si scavalca
        if (dh < -STEP && girata4(B[a], B[b])) { const ux = m[3] * sg, uy = m[4] * sg; if (!dentro4(B[q], m[0] + ux, m[1] + uy, 0) || !dentro4(B[q], m[0] + ux * 2.6, m[1] + uy * 2.6, 0)) continue; }   // [tetti4] fra lotti: 2,6 m di tetto d'arrivo (due caselle, meno l'arretramento del lotto)
        else if (dh < -STEP) { const ux = m[3] * sg, uy = m[4] * sg; let tx = Math.floor(m[0] / TS - ux * .4), ty = Math.floor(m[1] / TS - uy * .4), n = 0;
          if (BI[ty * GW + tx] !== p) { tx += ux; ty += uy; } for (let s2 = 1; s2 <= 3; s2++) { const x2 = tx + ux * s2, y2 = ty + uy * s2; if (inb(x2, y2) && BI[y2 * GW + x2] === q) n++; else break; } if (n < 2) continue; }
        add(p, q, dh > STEP ? 'gradino' : 'tetto', m[0], m[1], undefined, m[3] * sg, m[4] * sg); } });
    JUMPS.forEach((J, i) => { const k = Math.floor((J.k0 + J.k1) / 2), [ax, ay] = jA(J, k), [bx2, by2] = jB(J, k), x = (ax + bx2) / 2, y = (ay + by2) / 2; add(J.bi, J.bj, 'salto', x, y, i, J.ox, J.oy); add(J.bj, J.bi, 'salto', x, y, i, -J.ox, -J.oy); });
    PLANKS.forEach(P => { const x = (P.wa[0] + P.wb[0]) / 2, y = (P.wa[1] + P.wb[1]) / 2; add(P.a, P.b, 'passerella', x, y, P.i, P.ox, P.oy); add(P.b, P.a, 'passerella', x, y, P.i, -P.ox, -P.oy); });
    LADDERS.forEach(L => { if (L.footB < 0 || L.camm) return; add(L.footB, L.bi, 'scala', L.fx, L.fy, L.i); add(L.bi, L.footB, 'scala', L.tx, L.ty, L.i); });
    return E;
  }

  // ---------------- [tetti2] I BELVEDERI: i tetti più alti di ogni quartiere ----------------
  // Un motivo per salire: in cima ai palazzi più alti c'è un angolo con la panca e la bandierina. Arrivarci la prima volta
  // è una piccola scoperta (passa la noia); poi ci si può sedere a guardare il porto.
  const BELV = [];
  function buildBelv() {
    BELV.length = 0; const withL = new Set(LADDERS.map(L => L.bi));
    const cand = B.map((b, bi) => ({ b, bi })).filter(({ b, bi }) => withL.has(bi) && !b.military && !b.barrack && !b.kiosk && !b.lighthouse && !b.church && b.w >= 3 && b.h >= 3 && (b.fl || 1) >= 2)
      .sort((p, q) => roofRule(q.b) - roofRule(p.b) || p.bi - q.bi);
    for (const { b, bi } of cand) {
      if (BELV.length >= 12) break;
      const [x, y] = cen4(b);   // [tetti4] il centro del lotto
      if (BELV.some(v => hyp(v.x - x, v.y - y) < 90)) continue;
      const W0 = G.MAP.world, dist = W0 && W0.districtAt ? W0.districtAt(x, y) : '';
      BELV.push({ i: BELV.length, bi, x, y, name: 'Belvedere · ' + (b.name || b.label || 'tetto'), dist });
    }
  }
  if (!COT4) buildBelv();
  const belvNear = (st, r) => { const p = st.player; if (!p.lv || p.lv.k !== 'tetto') return null; for (const v of BELV) if (v.bi === p.lv.b && hyp(p.x - v.x, p.y - v.y) < (r || 3.5)) return v; return null; };
  function belvStep(st) {
    const v = belvNear(st, 3.2); if (!v) return;
    const T0 = st.tetti || (st.tetti = { belv: {}, sat: {} }); if (T0.belv[v.i]) return;
    T0.belv[v.i] = st.t; const N = st.me && st.me.need; if (N && N.svago !== undefined) N.svago = clamp(N.svago - .25, 0, 1);
    const n = Object.keys(T0.belv).length;
    G.feed(st, `${v.name}: da quassù si vede tutto il porto. (${n} belvedere su ${BELV.length})`, 'good');
  }
  function belvSit(st, v) {
    const T0 = st.tetti || (st.tetti = { belv: {}, sat: {} }), N = st.me && st.me.need;
    if (T0.sat[v.i] && st.t - T0.sat[v.i] < 360) return 'Ci sei già stato da poco. Il panorama non scappa.';
    T0.sat[v.i] = st.t; st.t += 20; if (N && N.svago !== undefined) N.svago = clamp(N.svago - .15, 0, 1);
    const P = ['Le barche rientrano, i gabbiani dietro. Venti minuti senza pensare a niente.', 'Il vento porta il sale e l\'odore del pane. Sotto, la città fa il suo rumore.', 'Conti le antenne, poi le luci che si accendono. Ti passa la voglia di scendere.'];
    return P[(v.i + Math.floor(st.t / 60)) % P.length];
  }

  // ---------------- [tetti2] IL NASCONDIGLIO: sul tetto le guardie ti perdono ----------------
  // Alto sopra la strada, lontano da una guardia, fermo o quasi: quello che le guardie ricordano di te sbiadisce più in fretta.
  function hideStep(st, dt) {
    const p = st.player; if (!p.lv || p.lv.k !== 'tetto') return;
    if (p.lv.h - tileH(p.x, p.y) < 5) return;
    let near = false; const mine = [];
    for (const n of st.npcs) { if (!n.cop || n.dead) continue; if (hyp(n.x - p.x, n.y - p.y) < 10) { near = true; break; } mine.push(n); }
    if (near) return;
    const k = Math.max(0, 1 - dt * ((p.speed || 0) < 1.5 ? .06 : .02));
    let any = false; mine.forEach(n => (n.mem || []).forEach(m => { if (m.actor === 'player' && m.conf > .02) { m.conf *= k; any = true; } }));
    if (any && G.wantedLevel && G.wantedLevel(st) > 0 && !(st.tetti && st.tetti.hint)) { (st.tetti || (st.tetti = { belv: {}, sat: {} })).hint = true; G.feed(st, 'Quassù non ti vedono. Stai giù e lasciali perdere.'); }
  }
  const footH = L => L.footB >= 0 ? (roofH(L.footB, L.fx, L.fy) ?? roofRule(B[L.footB])) : tileH(L.fx, L.fy);
  const topH = L => { if (L.hTop != null) return L.hTop; const h = roofH(L.bi, L.tx, L.ty); return h === null ? roofRule(B[L.bi]) : h; };   // [percorsi] la scala dei camminamenti arriva alla loro quota
  // la scala più vicina: ai piedi (per salire) o in cima (per scendere)
  function ladderNear(st, top, r) {
    const p = st.player; let best = null, bd = r || 1.5;
    for (const L of LADDERS) {
      if (top) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.bi) continue; const d = hyp(p.x - L.tx, p.y - L.ty); if (d < bd) { bd = d; best = L; } }
      else {
        if (L.footB >= 0) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.footB) continue; }
        else if (p.lv || p.indoor) continue;
        const d = hyp(p.x - L.fx, p.y - L.fy); if (d < bd) { bd = d; best = L; }
      }
    }
    return best;
  }

  // ---------------- SALIRE E SCENDERE ----------------
  function climb(st, L, up) {
    const p = st.player; if (p.vehicle) return null;
    if (p.sk && p.sk.on && typeof Skate !== 'undefined') Skate.dismount(st, true);
    const a = footH(L), b = topH(L);
    p.lv = { k: 'scala', L: L.i, up: !!up, t: 0, h0: up ? a : b, h1: up ? b + .05 : a, dur: Math.max(1.2, Math.abs(b - a) / CLIMB_V) };
    p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.jz = 0; p.jvz = 0; p.path = [];
    hooks.climb.forEach(f => { try { f(st, L, up); } catch (e) { } });
    return up ? `Sali la scala di ferro: ${Math.round(b - a)} metri.` : 'Scendi la scala.';
  }
  function climbStep(st, dt) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'scala') return;
    const L = LADDERS[lv.L]; p.jcharge = null; lv.t = Math.min(1, lv.t + dt / lv.dur); p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.anim = (p.anim || 0) + dt * 4;
    if (lv.t < 1) return;
    if (lv.up) { p.x = L.tx; p.y = L.ty; p.lv = { k: 'tetto', b: L.bi, h: topH(L) }; p.face = L.ang + Math.PI; G.feed(st, 'Sei sul tetto. Spazio per saltare da un tetto all\'altro; V sulla scala per scendere.'); }
    else if (L.footB >= 0) { p.lv = { k: 'tetto', b: L.footB, h: footH(L) }; }
    else p.lv = null;
  }
  const climbH = lv => lv.h0 + (lv.h1 - lv.h0) * lv.t;

  // ---------------- CAMMINARE SUI TETTI ----------------
  // dove si può mettere un piede: su un tetto (non più alto di un gradino, salto compreso); in aria anche sul vuoto
  function roofFree(o, r) {
    const lv = o.lv, k = r * .7;
    return (x, y) => {
      const air = (o.jz || 0) > .15 || ((o.jz || 0) > 0 && (o.jvz || 0) < 0 && !!roofAt(x, y)), top = lv.h + STEP + Math.max(0, o.jz || 0);   // [tetti3] in discesa, col piede già sopra il tetto d'arrivo, il bordo si prende (prima il salto di 2 m moriva sul filo)
      for (const [a, c] of [[x, y], [x - k, y - k], [x + k, y - k], [x - k, y + k], [x + k, y + k]]) {
        const q = roofAt(a, c);
        if (!q) { if (!air) return false; if (bAt(a, c) < 0 && !G.walkM(a, c) && !(G.seaM && G.seaM(a, c)) && !(LIB4 && LIB4.has(Math.floor(c / TS) * GW + Math.floor(a / TS)))) return false; continue; }   // [tetti4] in aria si passa sopra la striscia fra il lotto arretrato e la sua casella
        if (q.h > top) return false;
        if (!air && q.h < lv.h - SAFE) return false;   // camminando non si casca da un tetto alto: per buttarsi giù si salta
      }
      return true;
    };
  }
  // dopo ogni passo (e a ogni fotogramma): la quota del tetto sotto i piedi, il salto giù, il vuoto
  function settle(st) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'tetto') return;
    const q = roofAt(p.x, p.y);
    if (q) {
      if (q.bi !== lv.b) lv.b = q.bi;
      const d = lv.h - q.h;
      if (Math.abs(d) > 1e-3) {
        if (d > 0) { p.jz = (p.jz || 0) + d; if (!(p.jvz < 0)) p.jvz = p.jvz || 0; }
        else { p.jz = Math.max(0, (p.jz || 0) + d); if (!p.jz) p.jvz = 0; }
        lv.h = q.h;
      }
    } else if (!(p.jz > 0)) {   // nel vuoto: giù in strada (o in mare)
      const g = tileH(p.x, p.y); p.jz = Math.max(.001, lv.h - g); p.jvz = Math.min(0, p.jvz || 0); p.lv = null;
      G.feed(st, 'Il vuoto sotto i piedi!', 'bad');
    }
  }
  // l'atterraggio: da quanto in alto si è caduti
  function fallStep(st) {
    const p = st.player, feet = (p.lv && p.lv.k === 'tetto') ? p.lv.h : tileH(p.x, p.y), top = feet + (p.jz || 0);
    if (p.jz > 0) { p.__airTop = Math.max(p.__airTop == null ? top : p.__airTop, top); return; }
    if (p.__airTop == null) return;
    const drop = p.__airTop - feet; p.__airTop = null;
    if (drop > SAFE) {
      const dmg = Math.round((drop - SAFE) * 14 + (drop > 12 ? 40 : 0)); p.hp = Math.max(1, p.hp - dmg); p.hurtT = st.clock; p.stun = Math.max(p.stun || 0, Math.min(2.5, .4 + (drop - SAFE) * .25));
      G.feed(st, drop > 9 ? `Volo di ${Math.round(drop)} metri. Le gambe non rispondono.` : `Atterri male (${Math.round(drop)} m).`, 'bad');
      st.sfx && st.sfx.push({ k: 'land', x: p.x, y: p.y });
    }
  }

  // ---------------- AGGANCI A LIVELLI ----------------
  const hooks = { climb: [] };
  const F0 = LV.freeFn, M0 = LV.moved, H0 = LV.heightOf, K0 = LV.key;
  LV.freeFn = (o, r) => { const lv = o.lv; if (lv && lv.k === 'tetto') return roofFree(o, r); if (lv && lv.k === 'scala') return () => false; return F0(o, r); };
  LV.moved = (st, dx, dy, hit) => { const p = st.player, lv = p.lv; if (lv && (lv.k === 'tetto' || lv.k === 'scala')) { settle(st); return true; } return M0(st, dx, dy, hit); };
  LV.heightOf = (st, o) => { const lv = o.lv; if (lv && lv.k === 'tetto') return lv.h; if (lv && lv.k === 'scala') return climbH(lv); return H0(st, o); };
  function vKey(st) {
    const p = st.player; if (p.vehicle || p.indoor) return null;
    if (p.lv && p.lv.k === 'scala') return 'Sei sulla scala.';
    const top = ladderNear(st, true, 1.6); if (top) return climb(st, top, false);
    const foot = ladderNear(st, false, 1.6); if (foot) return climb(st, foot, true);
    if (p.lv && p.lv.k === 'tetto') return 'Qui non c\'è la scala. Cerca i pioli sul bordo, o salta giù (Spazio).';
    return null;
  }
  LV.key = (st, k, sh) => { if (k === 'v') { const m = vKey(st); if (m) return m; } return K0(st, k, sh); };
  // il suggerimento in basso (G.context) e il menu «Qui, adesso»
  if (G.context) { const c0 = G.context; G.context = st => { const out = c0(st), p = st.player; if (!p || p.vehicle || st.over) return out;
    if (ladderNear(st, true, 1.6)) out.push({ key: 'V', label: 'Scendi dalla scala' }); else if (ladderNear(st, false, 1.6)) out.push({ key: 'V', label: 'Sali sul tetto' });
    return out; }; }
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => { const out = (prev(st) || []).slice();
    const t = ladderNear(st, true, 1.6), f = !t && ladderNear(st, false, 1.6);
    if (t) out.push({ id: 'tetto', label: 'Scendi dalla scala (V)', run: () => climb(st, t, false), off: '' }); else if (f) out.push({ id: 'tetto', label: 'Sali sul tetto (V)', run: () => climb(st, f, true), off: '' });
    const v = belvNear(st); if (v) out.push({ id: 'belvedere', label: 'Siediti a guardare il porto', run: () => belvSit(st, v), off: '' });   // [tetti2]
    return out; }; }
  // il passo: la scala, il tetto sotto i piedi, le cadute; p.onRoof per la roba sui tetti (oggetti.js)
  function step(st, dt) {
    const p = st.player; if (!p) return;
    climbStep(st, dt);
    if (p.lv && p.lv.k === 'tetto') settle(st);
    fallStep(st);
    p.onRoof = !!(p.lv && p.lv.k === 'tetto');
    if (p.onRoof) { belvStep(st); hideStep(st, dt); if (typeof tesoroStep === 'function') tesoroStep(st); }   // [tetti4] il tesoro
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Tetti]', e); } } }; }
  const onRoof = st => !!(st.player.lv && st.player.lv.k === 'tetto');
  const roofB = st => onRoof(st) ? B[st.player.lv.b] : null;
  const feetH = st => { const p = st.player; return LV.heightOf(st, p) ?? tileH(p.x, p.y); };

  // =====================================================================================================================
  // LA GRAFICA: le scale (tre InstancedMesh per tutta l'isola) e la misura dei tetti
  // =====================================================================================================================
  const GFX = { built: 0, sig: '', meshes: null, scanQ: [], scanned: new Set() };
  function recs(R) { return (R && R.__buildings) || []; }
  // i pezzi del modello di un edificio (le case a gradoni ne hanno più d'uno: il corpo e i volumi sopra)
  function recsOf(R, b) { return recs(R).filter(r => r.grp && r.b && (r.b === b || r.b.id === b.id)); }
  // la quota vera: un raggio dall'alto ogni metro, sul modello dell'edificio (solo i pezzi sopra il primo piano)
  // [fluido] la misura è a pezzi: un lavoro per edificio (scanStart) che avanza riga per riga finché c'è tempo nel fotogramma
  // (scanWork), poi riprende dal punto dove era arrivato. Stessi raggi, stessa quota: prima tutto in un colpo bloccava il
  // gioco (fino a centinaia di raggi per casa, contro tutti i triangoli del modello, due case ogni 60 ms).
  function scanStart(R, bi) {
    const b = B[bi]; if (!b || b.__rH) return null; const parts = []; recsOf(R, b).forEach(r => [r.grp, r.roofGrp, r.cityGrp].forEach(q => { if (q) parts.push(q); })); if (!parts.length) return false;   // [ordine1] anche la roba sul tetto: ci si sale sopra
    parts.forEach(g => g.updateMatrixWorld(true));
    const W1 = b.w * TS, H1 = b.h * TS;
    return { bi, b, parts, W1, H1, g: new Float32Array(W1 * H1), floor: (b.base || 0) + 1.6, rule: roofRule(b), gy: 0, hits: 0 };
  }
  function scanWork(J, deadline) {   // true: finito (misurato, o il modello non si presta)
    const T3 = THREE, rc = GFX.rc || (GFX.rc = new T3.Raycaster()), o = GFX.ro || (GFX.ro = new T3.Vector3()), dn = GFX.rd || (GFX.rd = new T3.Vector3(0, -1, 0));
    const { b, parts, W1, H1, g, floor, rule } = J;
    while (J.gy < H1) {
      const gy = J.gy++;
      for (let gx = 0; gx < W1; gx++) {
        const x = b.x * TS + gx + .5, z = b.y * TS + gy + .5; o.set(x, rule + 40, z); rc.set(o, dn); rc.far = 80;
        const h = rc.intersectObjects(parts, true).find(h => !h.object.userData.velo && !h.object.userData.noRoof && h.point.y > floor);
        g[gy * W1 + gx] = h ? h.point.y : NaN; if (h) J.hits++;
      }
      if (performance.now() > deadline) return J.gy >= H1 ? scanEnd(J) : false;
    }
    return scanEnd(J);
  }
  function scanEnd(J) {
    const { b, g, W1, H1, hits } = J;
    if (hits < W1 * H1 * .25) return true;   // il modello non si presta (vuoto, trasparente): resta la regola dei piani
    // i buchi isolati (uno spigolo mancato) prendono la quota dei vicini; i cortili veri restano vuoti
    for (let gy = 0; gy < H1; gy++) for (let gx = 0; gx < W1; gx++) { const i = gy * W1 + gx; if (Number.isFinite(g[i])) continue; let s = 0, n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= W1 || Y >= H1) continue; const v = g[Y * W1 + X]; if (Number.isFinite(v)) { s += v; n++; } } if (n >= 3) g[i] = s / n; }
    b.__rH = g; return true;
  }
  // la quota vera: un raggio dall'alto ogni metro, sul modello dell'edificio (solo i pezzi sopra il primo piano). Tutto subito (le prove)
  // [tetti4] LA MISURA SUL MODELLO VERO delle passerelle (strumenti/compenetrazioni.js): sotto ogni punto dell'impalcato (ogni 10 cm per
  // lungo, cinque per largo) un raggio dall'alto contro i modelli delle case che stanno lì sotto (il corpo, il tetto, la roba del tetto e dei
  // tetti vissuti; non la grafica di tetti.js): se il primo solido sta più di 2 cm sopra il fondo dell'impalcato è un urto. Sulle scalette il
  // fondo è il lastrico (le pedate ci posano). window.__passerelle4() → { passerelle, urti: [{ i, tipo, n, cm, x, y, z, casa }] }.
  function misuraPasserelle4(R, soloImpalcato) {
    const T3 = THREE, rc = new T3.Raycaster(), o = new T3.Vector3(), dn = new T3.Vector3(0, -1, 0), out = { passerelle: 0, urti: [] }, parti = new Map();
    const partiDi = bi => { if (parti.has(bi)) return parti.get(bi); const L = []; recsOf(R, B[bi]).forEach(r => [r.grp, r.roofGrp, r.cityGrp, r.vissutiGrp].forEach(g => { if (g) { g.updateMatrixWorld(true); L.push(g); } })); parti.set(bi, L); return L; };
    PLANKS.forEach(P => { if (!P.prof) return; profCur4(P); out.passerelle++; const sp = P.arco ? .28 : .12, larg = P.hw + (P.arco ? 0 : .06); let n = 0, peggio = 0, dove = null;
      for (let s2 = 0; s2 <= P.L + 1e-6; s2 += .1) { const sc = P.prof.scala.some(([u0, u1]) => s2 >= u0 - 1e-6 && s2 <= u1 + 1e-6); if (sc && soloImpalcato) continue; const fondo = sc ? P.prof.pavimento(s2) : plankH(P, s2) - sp;
        for (let t = -larg; t <= larg + 1e-6; t += larg / 2) { const x = P.x0 + P.ox * s2 + P.px * t, y = P.y0 + P.oy * s2 + P.py * t;
          caseSotto4(x, y).forEach(bi => { const L = partiDi(bi); if (!L.length) return; o.set(x, fondo + 6, y); rc.set(o, dn); rc.far = 12;
            const h = rc.intersectObjects(L, true).find(q => !q.object.userData.noRoof && !q.object.userData.velo); if (!h) return; const d = h.point.y - fondo;
            if (sc && d < .1) return;   // la pedata sul lastrico (l'onda del lastrico, i bocchettoni a filo)
            if (d > TOLL4) { n++; if (d > peggio) { peggio = d; dove = { x, y, z: fondo, casa: B[bi].id, s: +s2.toFixed(2), t: +t.toFixed(2), hy: +h.point.y.toFixed(2), rr: +(h.point.y - roofRule(B[bi])).toFixed(2), og: (h.object.name || '') + '|' + (h.object.parent ? h.object.parent.name || h.object.parent.type : '') + '|' + (h.object.geometry && h.object.geometry.attributes.position ? h.object.geometry.attributes.position.count : 0), sc }; } } }); } }
      if (n) out.urti.push(Object.assign({ i: P.i, tipo: P.tipo4 || 'passerella', capi: B[P.a].id + '>' + B[P.b].id, sotto: bAt(dove.x, dove.y) >= 0 ? B[bAt(dove.x, dove.y)].id : '-', fa: +roofRule(B[P.a]).toFixed(2), n, cm: Math.round(peggio * 100), L: +P.L.toFixed(2), s1: P.s1, s2: +P.s2.toFixed(2), k: P.prof.k.map(q => q.map(v => +v.toFixed(2))) }, dove)); });
    return out;
  }
  // [tetti4] IL MODELLO VERO DECIDE: prima di disegnare le passerelle, la stessa misura di misuraPasserelle4 sui pianerottoli e sull'impalcato
  // (non sulle scalette, che posano sul lastrico): se un solido vero sta sopra il fondo, i due pianerottoli si alzano di tanto (+1 cm) e il
  // profilo si rifà. Il dato resta quello di Node; la pagina aggiunge solo i centimetri che il dato non sapeva (una cosa, un cornicione).
  function affinaVero4(R) {
    for (let giro = 0; giro < 3; giro++) { const M = misuraPasserelle4(R, true); if (!M.urti.length) return;
      M.urti.forEach(u => { const P = PLANKS[u.i]; if (!P || u.sc) return; P.alzaVero4 = (P.alzaVero4 || 0) + u.cm / 100 + .01; profilo4(P); }); }
  }
  if (typeof window !== 'undefined') window.__passerelle4 = () => { const pv = window.__pv; return pv && pv.R && window.THREE ? misuraPasserelle4(pv.R) : null; };
  function scanRoof(R, bi) { const J = scanStart(R, bi); if (J === null) return true; if (!J) return false; return scanWork(J, Infinity); }
  function ladderGeo() {
    const T3 = THREE, box = new T3.BoxGeometry(1, 1, 1);
    // [pulizia2] il ferro delle scale è color minio (l'antiruggine): stacca da ogni intonaco, chiaro o scuro, e si legge da lontano
    const iron = new T3.MeshStandardMaterial({ color: '#b8462a', metalness: .35, roughness: .55 }), rust = new T3.MeshStandardMaterial({ color: '#7a3a24', metalness: .3, roughness: .8 });
    const crema = new T3.MeshStandardMaterial({ color: '#efe6cc', roughness: .7, emissive: '#3a3628', emissiveIntensity: .5 });
    // [tetti2] leggibilità: fascia gialla ai piedi delle scale, lanterna calda in cima; assi, corda, panca e bandierina
    const yell = new T3.MeshStandardMaterial({ color: '#e8b828', roughness: .6 }), lamp = new T3.MeshBasicMaterial({ color: '#ffd27a', toneMapped: false });
    const wood = new T3.MeshStandardMaterial({ color: '#8a6a44', roughness: .9 }), rope = new T3.MeshStandardMaterial({ color: '#c8b48a', roughness: 1 }), flag = new T3.MeshStandardMaterial({ color: '#c8302a', roughness: .8, side: T3.DoubleSide });
    // [percorsi] la traccia dei passi sui lastrici. [percorsi2] Il velo crema al 50% non si vedeva sul lastrico chiaro: ora è il
    // cocciopesto che affiora dove i passi hanno consumato la calce bianca, una striscia continua color mattone, opaca al 78%
    const traccia = new T3.MeshStandardMaterial({ color: '#a8694a', roughness: .9, transparent: true, opacity: .78, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    // [percorsi2] la base scura sotto il primo gradino: il piede della scala stacca anche sul selciato chiaro
    const fondo = new T3.MeshStandardMaterial({ color: '#2a2420', roughness: 1 });
    // [tetti4] la pietra degli archi di contrasto e delle vere dei pozzi, la terra degli orti, il verde, il lastrico chiaro delle corti
    const pietra = new T3.MeshStandardMaterial({ color: '#cbbfa6', roughness: .9 }), terra = new T3.MeshStandardMaterial({ color: '#5a4432', roughness: 1 }), verde = new T3.MeshStandardMaterial({ color: '#5f7d3c', roughness: .95 });
    const lastrico = new T3.MeshStandardMaterial({ color: '#d9cdb2', roughness: .95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    return { box, iron, rust, yell, lamp, wood, rope, flag, crema, traccia, fondo, pietra, terra, verde, lastrico };
  }
  // le scale: due montanti, i pioli ogni 30 cm, la gabbia sopra i 2,5 m, il corrimano che scavalca il bordo del tetto
  function buildLaddersGfx(R) {
    const T3 = THREE, scene = R.__models.scene; if (!scene) return;
    try { if (!GFX.affinato4) { affinaVero4(R); GFX.affinato4 = true; } } catch (e2) { if (!affinaVero4.err) { affinaVero4.err = 1; console.warn('[tetti4]', e2); } }
    if (GFX.meshes) GFX.meshes.forEach(m => { scene.remove(m); });
    const G3 = GFX.geo || (GFX.geo = ladderGeo()), rails = [], rungs = [], hoops = [], yel = [], lamps = [], boards = [], ropes = [], flags = [], crema = [], fondo = [], pietra = [], terra = [], verde = [], lastr = [];
    const m4 = new T3.Matrix4(), q = new T3.Quaternion(), e = new T3.Euler(), s3 = new T3.Vector3(), p3 = new T3.Vector3();
    const put = (arr, x, y, z, sx, sy, sz, yaw) => { e.set(0, yaw, 0); q.setFromEuler(e); arr.push(m4.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz)).clone()); };
    LADDERS.forEach(L => {
      const y0 = footH(L), y1 = topH(L) + .95, Hh = y1 - y0; if (Hh < .5 || Hh > 40) return;
      const off = .2, cx = L.x + L.ox * off, cz = L.y + L.oy * off, yaw = -L.ang;   // 20 cm fuori dal muro
      const sx = -L.oy * .22, sz = L.ox * .22;   // i due montanti, 44 cm l'uno dall'altro
      const bb = B[L.bi], old = !L.camm && bb && (bb.era === 'E0' || bb.era === 'E2' || bb.era === 'E3' || bb.era === 'E4');   // [percorsi] sui camminamenti la scala di ferro
      if (L.rampa) { put(crema, L.fx, y0 + .06, L.fy, .5, .12, .9, yaw); return; }   // [percorsi] la scala di ronda è di pietra (il pezzo): solo il primo gradino chiaro
      put(fondo, L.x + L.ox * .38, y0 + .015, L.y + L.oy * .38, .74, .03, 1.0, yaw);   // [percorsi2] la base scura, più larga del gradino
      put(crema, L.x + L.ox * .38, y0 + .06, L.y + L.oy * .38, .5, .12, .78, yaw);   // [pulizia2] il primo gradino, chiaro, ai piedi della scala
      // [tetti3] dove si arriva: la lastra crema sul lastrico (il pianerottolo che si vede da lontano), solo sui terrazzi
      const PA3 = PIANO[L.bi]; if (CN3 && (!PA3 || PA3.tipo === 'piano') && L.footB < 0) put(crema, L.tx + L.ox * .1, topH(L) + .1, L.ty + L.oy * .1, .9, .04, 1.0, yaw);
      if (old) {   // [epoche] nel borgo, sull'Ottocento e sul regime niente scala di ferro: le staffe alla marinara murate nella parete (pioli a U, ruggine)
        const wx = L.x + L.ox * .02, wz = L.y + L.oy * .02;
        if (CN3) put(crema, L.x + L.ox * .012, y0 + (y1 - .4 - y0) / 2, L.y + L.oy * .012, .02, y1 - .4 - y0, .72, yaw);   // [tetti3] dietro le staffe la fascia di calce chiara: il minio stacca su ogni intonaco e la salita si legge
        for (let y = y0 + .35; y < y1 - .85; y += .32) { put(rungs, wx + L.ox * .16, y, wz + L.oy * .16, .03, .03, .4, yaw); for (const s of [-1, 1]) put(rungs, wx + L.ox * .08 + sx * s * .9, y, wz + L.oy * .08 + sz * s * .9, .16, .03, .03, yaw); }
        for (const s of [-1, 1]) put(rails, cx - L.ox * .3 + sx * s, y1 - .3, cz - L.oy * .3 + sz * s, .04, .6, .04, yaw);   // i due ferri che aiutano a scavalcare il parapetto
        put(lamps, wx + L.ox * .1, y1 - .2, wz + L.oy * .1, .1, .12, .1, yaw); put(lamps, wx + L.ox * .1, y0 + 2.3, wz + L.oy * .1, .08, .1, .08, yaw); return;   // [pulizia2] e una lucina all'attacco, a 2,3 m
      }
      for (const s of [-1, 1]) put(rails, cx + sx * s, y0 + Hh / 2, cz + sz * s, .05, Hh, .05, yaw);
      for (let y = y0 + .3; y < y1 - .9; y += .3) put(rungs, cx, y, cz, .03, .03, .44, yaw);
      // il corrimano ad arco sopra il bordo: due montanti che piegano verso il tetto
      for (const s of [-1, 1]) put(rails, cx - L.ox * .35 + sx * s, y1 - .02, cz - L.oy * .35 + sz * s, .7, .05, .05, yaw);
      // la gabbia: anelli a U ogni 70 cm sopra i 2,5 m (le scale lunghe)
      // [tetti3] nella città nuova niente gabbia all'americana: sopra i 6 m la scala di ferro ha i pianerottoli (grigliato e parapetto minio)
      if (CN3 && Hh > 6) for (let y = y0 + 3.2; y < y1 - 1.6; y += 3.2) { const px = cx + L.ox * .45, pz = cz + L.oy * .45, ex = -L.oy, ez = L.ox;
        put(rails, px + ex * .55, y, pz + ez * .55, .8, .05, .7, yaw); put(rails, px + ex * .55 + L.ox * .38, y + .5, pz + ez * .55 + L.oy * .38, .05, 1.0, .7, yaw); put(rails, px + ex * .9, y + .5, pz + ez * .9, .8, 1.0, .05, yaw); }
      else if (Hh > 4) for (let y = y0 + 2.5; y < y1 - .6; y += .7) {
        put(hoops, cx + L.ox * .38, y, cz + L.oy * .38, .03, .03, .62, yaw);
        for (const s of [-1, 1]) put(hoops, cx + L.ox * .2 + sx * s * 1.35, y, cz + L.oy * .2 + sz * s * 1.35, .36, .03, .03, yaw);
      }
      for (const s of [-1, 1]) put(yel, cx + sx * s, y0 + .55, cz + sz * s, .07, .9, .07, yaw);   // [tetti2] i montanti gialli: da lontano si vede dove si sale
      put(lamps, cx - L.ox * .1, y1 + .12, cz - L.oy * .1, .14, .16, .14, yaw); put(rails, cx - L.ox * .1, y1 + .02, cz - L.oy * .1, .2, .04, .2, yaw);   // la lanterna in cima
      if (Hh > 4 && !(CN3 && Hh > 6)) for (const s of [-1, 0, 1]) { const top = y1 - .6, bot = y0 + 2.5; if (top > bot) put(hoops, cx + L.ox * (s ? .2 : .38) + sx * s * 1.35, (top + bot) / 2, cz + L.oy * (s ? .2 : .38) + sz * s * 1.35, .025, top - bot, .025, yaw); }
    });
    // [tetti2] le passerelle: tavole di traverso su due travi, i paletti alle estremità e la corda tesa ai lati
    const qy = new T3.Quaternion(), qz = new T3.Quaternion(), ax = new T3.Vector3(0, 1, 0), az = new T3.Vector3(0, 0, 1);
    const seg = (arr, x1, y1, z1, x2, y2, z2, w, t, yaw) => { const L = hyp(x2 - x1, z2 - z1); qy.setFromAxisAngle(ax, yaw); qz.setFromAxisAngle(az, Math.atan2(y2 - y1, L)); q.copy(qy).multiply(qz);
      arr.push(m4.compose(p3.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), q, s3.set(Math.hypot(L, y2 - y1), t, w)).clone()); };
    PLANKS.forEach(P => {
      const h = plankHs(P), yaw = -Math.atan2(P.oy, P.ox), pt = s2 => [P.x0 + P.ox * s2, P.y0 + P.oy * s2];
      const S = [0, P.s1, P.s2, P.L];
      if (P.prof) { passerella4(P, yaw, pt); return; }   // [tetti4] col profilo: pianerottoli, scalette, impalcato col telaio di ferro
      if (P.arco) {   // [tetti4] l'arco di contrasto: il dorso di pietra calpestabile fra i due muri, l'intradosso ad arco ribassato sotto, le teste crema
        const [xa, za] = pt(S[1]), [xb, zb] = pt(S[2]), w2 = P.hw * 2;
        for (let k = 0; k < 3; k++) { const [x1, z1] = pt(S[k]), [x2, z2] = pt(S[k + 1]); if (k !== 1) continue; seg(pietra, x1, h[k] - .14, z1, x2, h[k + 1] - .14, z2, w2, .28, yaw); }
        const n = 7, rise = Math.min(.9, P.gap * .3), yb = Math.min(h[1], h[2]) - .28;
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, a0 = Math.sin(Math.PI * t0) * rise, a1 = Math.sin(Math.PI * t1) * rise;
          seg(pietra, xa + (xb - xa) * t0, yb - rise + a0, za + (zb - za) * t0, xa + (xb - xa) * t1, yb - rise + a1, za + (zb - za) * t1, w2 - .06, .22, yaw);
          const xm = xa + (xb - xa) * (t0 + t1) / 2, zm = za + (zb - za) * (t0 + t1) / 2, am = Math.sin(Math.PI * (t0 + t1) / 2) * rise, top = yb - .1, bot = yb - rise + am; if (top - bot > .1) { e.set(0, yaw, 0); q.setFromEuler(e); pietra.push(m4.compose(p3.set(xm, (top + bot) / 2, zm), q, s3.set(P.gap / n + .02, top - bot, w2 - .1)).clone()); } }
        for (const s2 of [P.s1, P.s2]) { const [x, z] = pt(s2); e.set(0, yaw, 0); q.setFromEuler(e); crema.push(m4.compose(p3.set(x, plankH(P, s2) + .01, z), q, s3.set(.3, .05, w2)).clone()); }
        return; }
      for (let k = 0; k < 3; k++) { const [x1, z1] = pt(S[k]), [x2, z2] = pt(S[k + 1]);
        for (const t of [-.32, .32]) seg(boards, x1 + P.px * t, h[k] - .06, z1 + P.py * t, x2 + P.px * t, h[k + 1] - .06, z2 + P.py * t, .1, .1, yaw);   // le travi
        const L = S[k + 1] - S[k]; for (let u = .12; u < L; u += .28) { const s2 = S[k] + u, [x, z] = pt(s2); e.set(0, yaw, 0); q.setFromEuler(e); boards.push(m4.compose(p3.set(x, plankH(P, s2) - .02, z), q, s3.set(.22, .04, .96)).clone()); } }
      for (const s2 of [P.s1, P.s2]) { const [x, z] = pt(s2); e.set(0, yaw, 0); q.setFromEuler(e); crema.push(m4.compose(p3.set(x, plankH(P, s2) + .01, z), q, s3.set(.3, .05, 1.0)).clone()); }   // [pulizia2] le teste chiare sui due bordi
      for (const t of [-1, 1]) {   // paletti e corda solo sul tratto sospeso
        const [xa, za] = pt(S[1]), [xb, zb] = pt(S[2]), oa = [xa + P.px * t * .5, za + P.py * t * .5], ob = [xb + P.px * t * .5, zb + P.py * t * .5];
        put(ropes, oa[0], h[1] + .45, oa[1], .06, .9, .06, yaw); put(ropes, ob[0], h[2] + .45, ob[1], .06, .9, .06, yaw);
        seg(ropes, oa[0], h[1] + .88, oa[1], ob[0], h[2] + .88, ob[1], .03, .03, yaw);
      }
    });
    // [tetti4] LA PASSERELLA COL PROFILO (Tetti.PLANKS[i].prof): le stesse istanze di prima (ferro, legno, pietra, crema), nessun disegno in più.
    // L'impalcato va da un pianerottolo all'altro: due longheroni sottili di ferro sotto (8 cm), le assi di traverso con lo spigolo chiaro
    // lungo i due bordi; il ponte di ferro ha il grigliato fitto; l'arco il dorso di pietra e l'intradosso ribassato sopra il vicolo. Ai capi
    // la scaletta posa sul lastrico: due cosciali di ferro dal lastrico al pianerottolo e le pedate (di pietra, piene, per l'arco). I
    // montanti stanno sui longheroni, il corrimano li segue; i capi chiari sul filo dei due muri.
    function passerella4(P, yaw, pt) {
      const K = profCur4(P).k, hw = P.hw, w2 = hw * 2, ferro = P.tipo4 === 'ponte', at = (s2, t, dy) => { const [x, z] = pt(s2); return [x + P.px * t, plankH(P, s2) + (dy || 0), z + P.py * t]; };
      const box4 = (arr, s2, t, y, l, hh, w) => { const [x, , z] = at(s2, t); e.set(0, yaw, 0); q.setFromEuler(e); arr.push(m4.compose(p3.set(x, y, z), q, s3.set(l, hh, w)).clone()); };
      const a0 = K[1][0], b1 = K[4][0];
      // l'impalcato, tratto per tratto fra i nodi
      for (let k = 1; k < 4; k++) { const u0 = K[k][0], u1 = K[k + 1][0]; if (u1 - u0 < .01) continue;
        if (P.arco) { const A = at(u0, 0, -.14), Z = at(u1, 0, -.14); seg(pietra, A[0], A[1], A[2], Z[0], Z[1], Z[2], w2, .28, yaw); continue; }
        for (const t of [-(hw - .05), hw - .05]) { const A = at(u0, t, -.08), Z = at(u1, t, -.08); seg(rails, A[0], A[1], A[2], Z[0], Z[1], Z[2], .05, .08, yaw); }   // i longheroni
        for (const t of [-(hw - .015), hw - .015]) { const A = at(u0, t, -.02), Z = at(u1, t, -.02); seg(crema, A[0], A[1], A[2], Z[0], Z[1], Z[2], .03, .045, yaw); }   // lo spigolo chiaro
        const passo = ferro ? .12 : .26, larga = ferro ? .05 : .22;
        for (let u = u0 + passo / 2; u < u1; u += passo) box4(ferro ? rungs : boards, u, 0, plankH(P, u) - .02, larga, .04, w2 - .06); }
      if (P.arco) {   // l'intradosso ribassato sopra il vicolo
        const [xa, za] = pt(P.s1), [xb, zb] = pt(P.s2), n = 7, rise = Math.min(.8, P.gap * .25);
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, sa = P.s1 + (P.s2 - P.s1) * t0, sb = P.s1 + (P.s2 - P.s1) * t1, ya = plankH(P, sa) - .28, yb = plankH(P, sb) - .28, a0r = Math.sin(Math.PI * t0) * rise, a1r = Math.sin(Math.PI * t1) * rise;
          seg(pietra, xa + (xb - xa) * t0, ya - rise + a0r, za + (zb - za) * t0, xa + (xb - xa) * t1, yb - rise + a1r, za + (zb - za) * t1, w2 - .06, .2, yaw);
          const sm = (sa + sb) / 2, tm = (t0 + t1) / 2, topm = plankH(P, sm) - .28, bot = topm - rise + Math.sin(Math.PI * tm) * rise; if (topm - bot > .08) box4(pietra, sm, 0, (topm + bot) / 2, (P.s2 - P.s1) / n + .02, topm - bot, w2 - .1); } }
      // le scalette sul lastrico, ai due capi
      [[0, a0, P.prof.fa, K[1][1], 1], [P.L, b1, P.prof.fb, K[4][1], -1]].forEach(([u0, u1, pav, alto, dir]) => {
        const len = Math.abs(u1 - u0), rise = alto - pav, n = Math.max(2, Math.ceil(rise / .2)), dep = len / n;
        for (let i = 0; i < n; i++) { const um = u0 + dir * dep * (i + .5), ht = pav + rise * (i + 1) / n;
          if (P.arco) box4(pietra, um, 0, (pav + ht) / 2, dep + .01, ht - pav, w2);   // i gradini di pietra pieni
          else box4(ferro ? rungs : boards, um, 0, ht - .02, dep - .03, .04, w2 - .06); }   // le pedate
        if (!P.arco) for (const t of [-(hw - .03), hw - .03]) { const [x0, , z0] = at(u0, t), [x1, , z1] = at(u1, t); seg(rails, x0, pav + .04, z0, x1, alto - .06, z1, .04, .08, yaw); }   // i cosciali, dal lastrico al pianerottolo
      });
      // i montanti e il corrimano (non sull'arco)
      if (!P.arco) { const pali = [a0 + .05, P.s1 + .08, P.s2 - .08, b1 - .05];
        for (const t of [-(hw - .02), hw - .02]) { pali.forEach(u => { const [x, y, z] = at(u, t); put(rails, x, y + .47, z, .04, .94, .04, yaw); });
          for (let k = 0; k < pali.length - 1; k++) { const A = at(pali[k], t, .93), Z = at(pali[k + 1], t, .93); seg(ferro ? rails : ropes, A[0], A[1], A[2], Z[0], Z[1], Z[2], .03, .03, yaw); } } }
      for (const s2 of [P.s1, P.s2]) box4(crema, s2, 0, plankH(P, s2) + .005, .3, .03, w2);   // i capi chiari sul filo dei muri
    }
    // [pulizia2] i salti fattibili: la copertina crema sui due bordi del vicolo
    JUMPS.forEach(J => { const yaw = -Math.atan2(J.oy, J.ox);
      for (let k = J.k0; k <= J.k1; k++) { const [wx, wy] = jA(J, k), [bx, by] = jB(J, k);
        const ha = edgeH(J.bi, wx, wy, J.ox, J.oy), hb = edgeH(J.bj, bx, by, -J.ox, -J.oy);
        put(crema, wx - J.ox * .16, ha + .03, wy - J.oy * .16, .32, .06, TS - .06, yaw); put(crema, bx + J.ox * .16, hb + .03, by + J.oy * .16, .32, .06, TS - .06, yaw); } });
    // [tetti2] i belvederi: la panca verso il panorama, il palo con la bandierina rossa
    BELV.forEach(v => {
      const y = roofH(v.bi, v.x, v.y) ?? roofRule(B[v.bi]), yaw = (v.i * 1.7) % 6.283;
      e.set(0, yaw, 0); q.setFromEuler(e);
      boards.push(m4.compose(p3.set(v.x, y + .45, v.y), q, s3.set(1.4, .07, .4)).clone());
      boards.push(m4.compose(p3.set(v.x + Math.sin(yaw) * .18, y + .72, v.y + Math.cos(yaw) * .18), q, s3.set(1.4, .3, .05)).clone());
      for (const s of [-.6, .6]) rails.push(m4.compose(p3.set(v.x + Math.cos(yaw) * s, y + .22, v.y - Math.sin(yaw) * s), q, s3.set(.06, .44, .36)).clone());
      const fx = v.x - Math.sin(yaw) * .9, fz = v.y - Math.cos(yaw) * .9;
      rails.push(m4.compose(p3.set(fx, y + 1.4, fz), q, s3.set(.05, 2.8, .05)).clone());
      flags.push(m4.compose(p3.set(fx + .32, y + 2.5, fz), q, s3.set(.6, .38, .02)).clone());
      lamps.push(m4.compose(p3.set(fx, y + 2.86, fz), q, s3.set(.1, .1, .1)).clone());
    });
    // [tetti4] I PREMI: il tesoro è una cassetta di legno con la scatola di latta sopra, dietro il suo comignolo; la terrazza e il belvedere
    // li arreda il piano (il pergolato, l'altana) e i belvederi (la panca e la bandierina)
    PREMI.forEach(z => { if (z.k !== 'tesoro') return; const y = roofH(z.bi, z.x, z.y) ?? roofRule(B[z.bi]), yaw = z.i * .7; e.set(0, yaw, 0); q.setFromEuler(e);
      boards.push(m4.compose(p3.set(z.x, y + .2, z.y), q, s3.set(.6, .4, .45)).clone()); boards.push(m4.compose(p3.set(z.x, y + .41, z.y), q, s3.set(.64, .03, .49)).clone());
      rails.push(m4.compose(p3.set(z.x + .05, y + .5, z.y), q, s3.set(.3, .16, .22)).clone()); lamps.push(m4.compose(p3.set(z.x - .22, y + .48, z.y + .1), q, s3.set(.06, .1, .06)).clone()); });
    // [tetti4] LE CORTI: il lastrico chiaro (si legge come un posto, non come un avanzo) e la cosa che dice lo scopo
    CORTI.forEach(C => { const foot = (x, y) => LADDERS.some(L => hyp(L.fx - x, L.fy - y) < 1.6), hc = (x, y) => tileH(x, y);
      C.celle.forEach(([tx, ty]) => { const x = (tx + .5) * TS, y = (ty + .5) * TS; put(lastr, x, hc(x, y) + .02, y, TS - .04, .03, TS - .04, 0); });
      const cel = C.celle.map(([tx, ty]) => [(tx + .5) * TS, (ty + .5) * TS]).filter(([x, y]) => !foot(x, y)).sort((a, b) => hyp(a[0] - C.x, a[1] - C.y) - hyp(b[0] - C.x, b[1] - C.y));
      if (!cel.length) return; const [cx, cy] = cel[0], g0 = hc(cx, cy);
      if (C.k === 'pozzo') {   // la vera di pietra, la bocca scura, i due ritti col trave e la carrucola, il secchio
        put(pietra, cx, g0 + .45, cy, 1.2, .9, 1.2, 0); put(fondo, cx, g0 + .91, cy, .8, .02, .8, 0);
        for (const sx of [-.62, .62]) put(rails, cx + sx, g0 + 1.25, cy, .08, 1.7, .08, 0); put(rails, cx, g0 + 2.1, cy, 1.4, .08, .08, 0); put(ropes, cx, g0 + 1.6, cy, .02, 1.0, .02, 0); put(rails, cx, g0 + 1.05, cy, .22, .26, .22, 0);
        for (const [dx, dy] of [[1.6, 0], [0, 1.6]]) if (C.celle.length > 4) put(pietra, cx + dx, g0 + .22, cy + dy, 1.4, .44, .4, dx ? 0 : Math.PI / 2);   // le panche di pietra
      } else if (C.k === 'orto') {   // le aiuole rialzate con la terra e il verde, il limone in mezzo
        cel.slice(1, 7).forEach(([x, y]) => { put(pietra, x, g0 + .15, y, 1.5, .3, 1.5, 0); put(terra, x, g0 + .31, y, 1.3, .04, 1.3, 0); for (let k = 0; k < 3; k++) put(verde, x - .4 + k * .4, g0 + .45, y + ((k % 2) - .5) * .4, .3, .26, .3, k); });
        put(boards, cx, g0 + .8, cy, .16, 1.6, .16, 0); put(verde, cx, g0 + 2.0, cy, 1.5, 1.1, 1.5, .4); put(verde, cx, g0 + 2.5, cy, 1.0, .6, 1.0, .1);
      } else if (C.k === 'bottega') {   // il banco del pescatore, le nasse, le reti stese su due paletti
        put(boards, cx, g0 + .45, cy, 1.6, .08, .7, 0); for (const sx of [-.7, .7]) put(boards, cx + sx, g0 + .22, cy, .08, .44, .6, 0);
        for (let k = 0; k < 3; k++) put(ropes, cx + 1.3 + k * .1, g0 + .25 + k * .3, cy + .6, .5, .3, .5, k);
        put(rails, cx - 1, g0 + .9, cy - .9, .05, 1.8, .05, 0); put(rails, cx + 1, g0 + .9, cy - .9, .05, 1.8, .05, 0); put(ropes, cx, g0 + 1.3, cy - .9, 2.0, .9, .03, 0);
      } else if (C.k === 'passaggio') {   // il passaggio coperto: il pergolato di travi e la vite sopra, a 2,8 m
        C.celle.forEach(([tx, ty], k) => { const x = (tx + .5) * TS, y = (ty + .5) * TS, g1 = hc(x, y), along = C.wX >= C.wY;
          for (const sg of [-1, 1]) put(boards, x + (along ? 0 : sg * .85), g1 + 1.4, y + (along ? sg * .85 : 0), .1, 2.8, .1, 0);
          put(boards, x, g1 + 2.82, y, along ? .1 : 1.9, .1, along ? 1.9 : .1, 0); if (k % 2 === 0) put(verde, x, g1 + 2.95, y, 1.6, .22, 1.6, k); });
      } });
    // [percorsi] I CIRCUITI SUI TETTI SI VEDONO (percorsi.js): la traccia più chiara sul lastrico fra una scala e l'altra (i passi
    // consumano lo sporco), una lanterna su un ferro color minio a ogni svolta, il bucato teso lungo il tratto più lungo, la corda annodata
    // dove si sale di un gradino col salto, la cassa e l'asse appoggiate ai piedi della scala da cui si parte. Stesso linguaggio:
    // minio per salire, crema per dove si passa; solo i materiali di qui.
    const PD = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null, traccia = [];
    if (PD) {
      const giri = PD.circuiti.filter(c => c.k === 'tetti').concat(PD.porte.map(q => q.alternativa).filter(a => a && a.k === 'tetti' && !a.camm));
      giri.forEach((c, ci) => {
        const P = c.pts.slice(1, -1), ok = new Set(c.edifici), hAt = (x, y) => { const q = roofAt(x, y); return q && (ok.has(q.bi) || q.plank !== undefined) ? q.h : null; };
        // la traccia: [percorsi2] una striscia continua larga 72 cm (pezzi di 60 cm accostati, senza sovrapporsi), alla quota del lastrico
        for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L = hyp(bx - ax, by - ay), yaw = -Math.atan2(by - ay, bx - ax), n = Math.max(1, Math.round(L / .6)), l = L / n;
          for (let i = 0; i < n; i++) { const s = (i + .5) * l, x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L, h = hAt(x, y); if (h === null) continue; put(traccia, x, h + .015, y, l, .02, .72, yaw); } }
        // le svolte: la lanterna sul ferro minio, mezzo metro fuori dalla svolta
        for (let k = 1; k < P.length - 1; k++) { const [ax, ay] = P[k - 1], [x, y] = P[k], [bx, by] = P[k + 1], a1 = Math.atan2(y - ay, x - ax), a2 = Math.atan2(by - y, bx - x);
          let d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; if (d < .6 || hyp(x - ax, y - ay) < 1.5) continue;
          const mx = Math.cos(a1) - Math.cos(a2), my = Math.sin(a1) - Math.sin(a2), ml = hyp(mx, my) || 1, px = x + mx / ml * .6, py = y + my / ml * .6, h = hAt(px, py); if (h === null) continue;
          put(rails, px, h + .45, py, .05, .9, .05, 0); put(lamps, px, h + .96, py, .13, .15, .13, 0); }
        // il bucato sul tratto più lungo del giro (almeno 4 m): due paletti, la corda, i panni color crema
        let bk = -1, bl = 4; for (let k = 0; k < P.length - 1; k++) { const l = hyp(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]); if (l > bl) { bl = l; bk = k; } }
        if (bk >= 0) { const [ax, ay] = P[bk], [bx, by] = P[bk + 1], ux = (bx - ax) / bl, uy = (by - ay) / bl, sx = -uy * .9, sy = ux * .9, x0 = ax + ux * 1 + sx, y0 = ay + uy * 1 + sy, x1 = bx - ux * 1 + sx, y1 = by - uy * 1 + sy, h0 = hAt(x0, y0), h1 = hAt(x1, y1);
          if (h0 !== null && h1 !== null) { const yaw = -Math.atan2(uy, ux); put(ropes, x0, h0 + .85, y0, .05, 1.7, .05, yaw); put(ropes, x1, h1 + .85, y1, .05, 1.7, .05, yaw); seg(ropes, x0, h0 + 1.66, y0, x1, h1 + 1.66, y1, .02, .02, yaw);
            const n = Math.max(2, Math.min(6, Math.floor((bl - 2) / 1.1))); for (let i = 1; i <= n; i++) { const t = i / (n + 1), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, hh = h0 + (h1 - h0) * t + 1.66 - .05 * Math.sin(t * Math.PI); put(crema, x, hh - .26, y, .38 + (i % 2) * .12, .48 - (i % 3) * .08, .02, yaw); } } }
        // la corda dove si sale di un gradino: dal bordo del tetto alto, annodata
        (c.passi || []).forEach(e => { if (e.k !== 'gradino') return; const ha = roofRule(B[e.a]), hb = roofRule(B[e.b]); const qa = roofAt(e.x - e.ux * .3, e.y - e.uy * .3), qb = roofAt(e.x + e.ux * .3, e.y + e.uy * .3), h0 = qa ? qa.h : ha, h1 = qb ? qb.h : hb;
          const x = e.x + e.ux * .08 - e.uy * .5, y = e.y + e.uy * .08 + e.ux * .5, yaw = -Math.atan2(e.uy, e.ux); put(ropes, x, (h0 + h1) / 2 + .25, y, .04, h1 - h0 + .5, .04, yaw); for (let t = h0 + .3; t < h1; t += .35) put(ropes, x, t, y, .08, .06, .08, yaw); });
        // dove si sale: la cassa e l'asse appoggiate al muro, un metro accanto alla scala
        const L0 = LADDERS[c.sali]; if (L0 && L0.footB < 0) { const sx = -L0.oy, sy = L0.ox, g0 = footH(L0), yaw = -L0.ang, cx = L0.x + L0.ox * .4 + sx * 1.15, cy = L0.y + L0.oy * .4 + sy * 1.15;
          if (G.walkM(cx, cy) && bAt(cx, cy) < 0) { put(boards, cx, g0 + .26, cy, .55, .52, .6, yaw + .2); put(boards, cx, g0 + .53, cy, .58, .03, .63, yaw + .2);
            const ax = L0.x + L0.ox * .75 - sx * 1.1, ay = L0.y + L0.oy * .75 - sy * 1.1; if (G.walkM(ax, ay) && bAt(ax, ay) < 0) seg(boards, ax, g0 + .02, ay, L0.x + L0.ox * .08 - sx * 1.1, g0 + 1.7, L0.y + L0.oy * .08 - sy * 1.1, .26, .04, -Math.atan2(-L0.oy, -L0.ox)); } }
      });
      // [percorsi2] anche il camminamento delle mura ha la sua traccia consumata, da una scala all'altra (la quota la dà il camminamento)
      PD.circuiti.filter(c => c.k === 'mura').forEach(c => { const P = c.pts.slice(1, -1), hAt = (x, y) => { const q = roofAt(x, y); return q ? q.h : null; };
        for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], L = hyp(bx - ax, by - ay); if (L < .3) continue; const yaw = -Math.atan2(by - ay, bx - ax), n = Math.max(1, Math.round(L / .6)), l = L / n;
          for (let i = 0; i < n; i++) { const s = (i + .5) * l, x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L, h = hAt(x, y); if (h === null) continue; put(traccia, x, h + .015, y, l, .02, .72, yaw); } } });
    }
    const mk = (arr, m) => { const im = new T3.InstancedMesh(G3.box, m, Math.max(1, arr.length)); arr.forEach((mm, i) => im.setMatrixAt(i, mm)); im.count = arr.length; im.castShadow = true; im.receiveShadow = true; im.userData.noRoof = true; im.frustumCulled = false; scene.add(im); return im; };
    GFX.meshes = [mk(rails, G3.iron), mk(rungs, G3.iron), mk(hoops, G3.rust), mk(yel, G3.yell), mk(lamps, G3.lamp), mk(boards, G3.wood), mk(ropes, G3.rope), mk(flags, G3.flag), mk(crema, G3.crema), mk(traccia, G3.traccia), mk(fondo, G3.fondo),
      mk(pietra, G3.pietra), mk(terra, G3.terra), mk(verde, G3.verde), mk(lastr, G3.lastrico)];   // [tetti4]
    GFX.meshes[14].castShadow = false;
    GFX.meshes[9].castShadow = false; GFX.meshes[9].renderOrder = 1;   // [percorsi] la traccia è un velo sul lastrico
    GFX.meshes[10].castShadow = false;   // [percorsi2] la base del piede della scala è piatta
    GFX.meshes[4].castShadow = false;
  }
  function frame() {
    try {
      const pv = window.__pv, R = pv && pv.R, st = pv && pv.st;
      if (R && R.__models && R.__models.scene && st && window.THREE) {
        const L = recs(R), sig = L.length + ':' + (L[0] && L[0].b ? L[0].b.id : '') + ':' + (L.length && L[L.length - 1].grp ? L[L.length - 1].grp.uuid : '');
        if (L.length && sig !== GFX.sig) { GFX.sig = sig; GFX.stableT = performance.now(); GFX.dirty = true; }
        // la quota dei tetti dove servono le scale: la si misura una casa alla volta, vicino al giocatore
        const p = st.player, now = performance.now();
        if (L.length) {   // [fluido] un edificio alla volta, a pezzi: 1,5 ms per fotogramma (3 sul tetto, i vicini per i salti prima)
          const roof = onRoof(st), deadline = now + (roof ? 3 : 1.5);
          if (GFX.job && (B[GFX.job.bi].__rH || GFX.scanned.has(GFX.job.bi))) GFX.job = null;
          if (!GFX.job && now - (GFX.scanT || 0) > 60) {
            GFX.scanT = now; let pick = -1;
            if (roof) for (let dy = -6; dy <= 6 && pick < 0; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const bi = bAt(p.x + dx, p.y + dy); if (bi >= 0 && !B[bi].__rH && !GFX.scanned.has(bi)) { pick = bi; break; } }
            if (pick < 0) { let bd = 70; for (let bi = 0; bi < B.length; bi++) { const b = B[bi]; if (b.__rH || GFX.scanned.has(bi)) continue; const d = hyp((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y); if (d < bd) { bd = d; pick = bi; } } }
            if (pick >= 0) { const J = scanStart(R, pick); if (J === null) GFX.scanned.add(pick); else if (J) GFX.job = J; }
          }
          if (GFX.job && scanWork(GFX.job, deadline)) { GFX.scanned.add(GFX.job.bi); GFX.dirty = true; GFX.job = null; }
        }
        if (GFX.dirty && now - (GFX.stableT || 0) > 1500 && now - (GFX.builtT || 0) > 2500) { GFX.dirty = false; GFX.builtT = now; buildLaddersGfx(R); }
        if (GFX.st !== st) { GFX.st = st; }
      }
    } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[Tetti]', e); } }
    requestAnimationFrame(frame);
  }
  if (typeof window !== 'undefined') {
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 300); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }

  const API = { lotto4, libero4, toW4, LADDERS, PLANKS, BELV, JUMPS, CAMM, belvNear, belvSit, plankAt, roofAt, roofH, roofRule, bAt, climb, ladderNear, onRoof, roofB, feetH, settle, scanRoof, grafo, edgeH, hooks, STEP, SAFE, _: { buildLadders, GFX, footH, topH, aperture4, sopraApertura4 } };
  // [percorsi] la rete dei percorsi (percorsi.js) lega i circuiti sui tetti e le alternative delle porte, ora che le scale ci sono
  if (!COT4 && typeof Percorsi !== 'undefined' && Percorsi.attivo) try { Percorsi.lega({ Tetti: API, Sottosuolo: typeof Sottosuolo !== 'undefined' ? Sottosuolo : null, Game: G }); } catch (e) { if (typeof console !== 'undefined') console.warn('[percorsi]', e); }
  // [tetti4] I PREMI dei giri (percorsi.js, i rami): il belvedere entra fra i belvederi (la panca, la bandierina, «Siediti a guardare»),
  // la terrazza la arreda il piano (il pergolato), il tesoro è una cassetta di latta che si apre la prima volta, la corte è la scala che
  // scende nel cortile. PREMI: { k, x, y, bi, nome, giro }.
  const PREMI = [];
  function premi4() {
    PREMI.length = 0; const D = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null; if (!D) return;
    D.circuiti.filter(c => c.k === 'tetti').forEach(c => (c.rami || []).forEach(r => {
      const b = B[r.bi]; let x = r.x, y = r.y;
      if (r.premio === 'tesoro' || r.premio === 'belvedere' || r.premio === 'terrazza') {   // il posto: nel quarto del tetto più lontano dalla camera (nord-ovest), dentro il parapetto
        const LT = lotto4(b), x0 = LT.x0, y0 = LT.y0, W1 = LT.lw, D1 = LT.ld; [x, y] = toW4(b, x0 + Math.max(1.1, W1 * .3), y0 + Math.max(1.1, D1 * .3));   // [tetti4] nel lotto, poi nel mondo
        // [tetti4] lontano dalle passerelle e dalle scale che arrivano su questo tetto: fra i posti dentro il parapetto, quello più staccato
        const via = []; PLANKS.forEach(Q => { if (Q.a !== r.bi && Q.b !== r.bi) return; for (let s2 = 0; s2 <= Q.L; s2 += .25) via.push([Q.x0 + Q.ox * s2, Q.y0 + Q.oy * s2]); }); LADDERS.forEach(L => { if (L.bi === r.bi) via.push([L.tx, L.ty]); if (L.footB === r.bi) via.push([L.fx, L.fy]); });
        if (via.length) { let best = -1; for (let u = .25; u <= .76; u += .25) for (let w = .25; w <= .76; w += .25) { const [px, py] = toW4(b, x0 + .7 + (W1 - 1.4) * u, y0 + .7 + (D1 - 1.4) * w), d = Math.min(...via.map(([a, c]) => hyp(a - px, c - py))); if (d > best) { best = d; x = px; y = py; } } } }
      const V0 = r.premio === 'belvedere' ? BELV.find(v => v.bi === r.bi) : null; if (V0) { x = V0.x; y = V0.y; }   // [tetti4] su un tetto che ha già il suo belvedere, il premio è quello
      const q = { i: PREMI.length, k: r.premio, x, y, bi: r.bi, nome: r.nome, giro: c.id, scala: r.scala };
      PREMI.push(q); r.premioI = q.i;
      if (V0 && !V0.giro) V0.giro = c.id;
      if (r.premio === 'belvedere' && !V0) BELV.push({ i: BELV.length, bi: r.bi, x, y, name: 'Belvedere · ' + (c.tema || c.nome), dist: '', giro: c.id });
    }));
  }
  if (!COT4) premi4();
  // il tesoro: la prima volta che ci passi accanto (sul suo tetto, entro un metro e mezzo) la cassetta si apre
  const TESORI4 = ['Una scatola di latta dietro il comignolo: dentro, soldi arrotolati con l\'elastico.', 'Sotto una tegola smossa, un sacchetto di plastica: qualcuno ci teneva i risparmi.', 'Nella cassetta del contatore vecchio, una busta: chi l\'ha dimenticata non torna a prenderla.'];
  function tesoroStep(st) {
    const p = st.player; if (!p.lv || p.lv.k !== 'tetto') return;
    for (const q of PREMI) { if (q.k !== 'tesoro' || q.bi !== p.lv.b || hyp(p.x - q.x, p.y - q.y) > 1.6) continue;
      const T0 = st.tetti || (st.tetti = { belv: {}, sat: {} }), Tz = T0.tesori || (T0.tesori = {}); if (Tz[q.i]) return;
      Tz[q.i] = st.t; const soldi = 25 + (q.i * 17) % 40; p.money = (p.money || 0) + soldi;
      G.feed(st, `${TESORI4[q.i % TESORI4.length]} (+${soldi} mila lire · ${Object.keys(Tz).length} tesori su ${PREMI.filter(z => z.k === 'tesoro').length})`, 'money'); return; }
  }

  // =====================================================================================================================
  // [tetti3] IL PIANO DEI TETTI: il tetto è la cosa che si vede di più in città, quindi è un quadro composto e non un deposito
  // =====================================================================================================================
  // Andrea: «i tetti sono ancora molto carichi: tante cose sovrapposte e non così leggibili, compenetrazioni o modelli inadatti, scale
  // che non si trovano. Devono essere piacevoli all'occhio nell'insieme e comprensibili, così come le vie: devono essere scorci».
  // Il piano si decide QUI, come dato, per ogni casa con l'epoca (b.era, fl, rk, la misura), e render.js lo esegue e basta: cambia la
  // pianta, il piano si rifà da solo. Le regole:
  // 1. IL MANTO PER EPOCA, sempre uguale: borgo e marina coppi (E0) o terrazzo di pianelle (E2, e le case-torre); Ottocento tegole
  //    marsigliesi col cornicione (E3); regime e boom lastrico di quadrotti (E4, E6). Due famiglie di colore: il cotto e il chiaro.
  // 2. IL RITMO: un tetto su tre è ABITATO (terrazzo con la vita sopra), gli altri sono CALMI (il manto pulito, al più i comignoli o
  //    un'antenna). Gli abitati si scelgono dove va l'occhio: sui giri dei tetti di W.percorsi, attorno alle piazze, lungo i percorsi
  //    dominanti. Un tetto abitato è sempre un terrazzo (si cammina, ci si vive); i calmi del borgo e dell'Ottocento sono falde.
  // 3. I GRUPPI, mai cose sparse: da zero a due per tetto, ognuno una piccola composizione con UNO scopo (CAT3): il bucato col filo e
  //    la bacinella, il pergolato col tavolino e le sedie, i vasi contro il parapetto, i comignoli in gruppo, un'antenna, la stanza in
  //    più (veranda di lamiera, solo borgo, marina e boom). Ciò che non serve a uno scopo non si posa.
  // 4. ZERO COMPENETRAZIONI: ogni gruppo è un rettangolo (in pianta, nel riferimento della casa non girata) dentro il parapetto (50 cm),
  //    staccato dagli altri (35 cm), dall'arrivo delle scale, dalle teste delle passerelle, dai salti, dal belvedere e dal corridoio del
  //    giro dei tetti (90 cm per parte); sulle falde solo il colmo porta qualcosa (comignoli e antenna, distanti fra loro); niente più
  //    alto di 1,2 m a meno di 1,5 m dai bordi verso la camera (sud, est).
  // 5. LE SALITE (sopra, buildLadders): sul lato della camera, mai coperte, mai nei budelli; il ferro minio, il crema dove si passa.
  // I modelli inadatti (serbatoi all'americana con l'insegna, scale antincendio a zig-zag, parabole nel 1986, condizionatori a schiera
  // sul borgo, piccioni e bottiglie sparsi, sfiati e canaline singole, il ciarpame del «ritrovo» e del «cantiere») non hanno un posto qui:
  // render.js li chiede al registro dei posti (rpTake) e nella città nuova il registro dei tetti col piano è chiuso.
  const CAT3 = {
    bucato: { scopo: 'stendere i panni: il filo fra due paletti e la bacinella', alto: 1.75 },
    pergola: { scopo: "stare all'ombra: il pergolato col tavolino e due sedie", alto: 2.4 },
    vasi: { scopo: 'le piante: i vasi in fila contro il parapetto', alto: .9 },
    stanza: { scopo: 'una stanza in più: la veranda di lamiera addossata', alto: 2.6 },
    altana: { scopo: "guardare lontano: l'altana, la loggetta di legno col tetto di coppi", alto: 2.9 },   // [tetti4]
    torretta: { scopo: 'i piccioni: la colombaia a torretta col tettuccio', alto: 3.1 },   // [tetti4]
    comignoli: { scopo: 'il fumo della cucina: i comignoli in gruppo', alto: 1.7 },
    antenna: { scopo: "la televisione: un'antenna sola", alto: 3.6 },
  };
  const VIVI3 = ['bucato', 'pergola', 'vasi', 'stanza', 'altana'], CALMI3 = ['comignoli', 'antenna', 'torretta'];
  // [tetti4] le teste dei comignoli per quartiere (render.js comignolo1): il tettuccio di coppi, la torretta a feritoie e il vaso nel borgo,
  // la lastra e il cappello di lamiera sulla marina, le canne di cotto e la lastra nell'Ottocento
  const TESTE4 = { E0: ['coppi', 'torretta', 'vaso', 'coppi', 'lastra'], E2: ['lastra', 'cappello', 'coppi'], E3: ['canne', 'cappello', 'lastra'] };
  const MANTO3 = { E0: 'coppi', E2: 'coppi', E3: 'tegole', E4: 'lastrico', E6: 'lastrico' };
  const PIANO = [], M3 = .5, ALTO3 = 1.2, CAMB3 = 1.5;   // margine dal filo esterno (parapetto 28 cm + aria), il bordo verso la camera
  const h3 = (a, b, s) => { let h = (a * 374761393 + b * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const rot3 = b => b.rot && !b.sign && !b.shop ? b.rot : 0;
  // dal mondo al riferimento della casa non girata (render.js gira il gruppo del tetto attorno al centro: rotRec)
  const loc3 = (b, x, y) => { const a = -rot3(b); if (!a) return [x, y]; const [cx, cy] = cen4(b), c = Math.cos(a), s = Math.sin(a), qx = x - cx, qy = y - cy; return [cx + qx * c - qy * s, cy + qx * s + qy * c]; };
  const rr3 = (g, q) => Math.max(0, Math.abs(q[0] - g.x) - g.hx, 0) ** 2 + Math.max(0, Math.abs(q[1] - g.y) - g.hy) ** 2;   // distanza² punto-rettangolo
  const gap3 = (a, b) => Math.max(Math.abs(a.x - b.x) - a.hx - b.hx, Math.abs(a.y - b.y) - a.hy - b.hy);   // > 0: staccati di tanto
  function piano3() {
    PIANO.length = 0; if (!CN3) return;
    const D = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
    const giri = D ? D.circuiti.filter(c => c.k === 'tetti').concat(D.porte.map(q => q.alternativa).filter(a => a && a.k === 'tetti' && !a.camm)) : [];
    const sulGiro = new Set(); giri.forEach(c => (c.edifici || []).forEach(i => sulGiro.add(i)));
    // [tetti4] dove passano le vie e i rami dei giri, e dove sta un premio: lì niente cupole né falde a una sola acqua, il premio sul terrazzo
    const sulPerc = new Set(sulGiro), premio = new Map(); if (D) D.circuiti.filter(c => c.k === 'tetti').forEach(c => { (c.vie || []).forEach(v => v.edifici.forEach(i => sulPerc.add(i))); (c.rami || []).forEach(r => { r.edifici.forEach(i => sulPerc.add(i)); sulPerc.add(r.bi); }); });
    PREMI.forEach(q => { if (q.k !== 'corte') premio.set(q.bi, q.k); });
    const piazze = D ? D.nodi.filter(n => n.k === 'piazza' || n.k === 'porta' || n.k === 'sbocco') : [], dom = D ? D.percorsi.filter(p => p.k === 'dominante' || p.k === 'secondario') : [];   // lungo i percorsi, dove si cammina e si guarda
    const ok3 = b => b.era && b.era !== 'E7' && !b.shack && !b.pezzo && !b.lighthouse && !b.kiosk && !b.__tierOf;
    const cand = [];
    B.forEach((b, bi) => { if (!ok3(b)) return;
      const LT = lotto4(b), cx = LT.cx, cy = LT.cy, W1 = LT.lw, D1 = LT.ld;   // [tetti4] il lotto
      const giro = sulGiro.has(bi), piazza = piazze.some(n => hyp(n.x - cx, n.y - cy) < 30), lungo = dom.some(p => p.pts.some(q => hyp(q[0] - cx, q[1] - cy) < (p.k === 'dominante' ? 12 : 9)));
      const pr = premio.get(bi), s = (giro ? 3 : 0) + (piazza ? 2 : 0) + (lungo ? 1.5 : 0) + h3(b.x, b.y, 31) * .9 - (W1 * D1 < 20 ? .8 : 0) - (b.era === 'E3' ? 1.2 : 0) + (pr === 'terrazza' ? 20 : 0) + (b.sottoPortico ? 2.5 : 0);   // [pianta] sopra i portici della Vittoria il terrazzo si vede dalla strada: resta abitato anche senza la scala sotto le arcate   // i terrazzini di 4 × 4 m vengono dopo; l'Ottocento è soprattutto tegole; [tetti4] la terrazza nascosta prima di tutte
      const puo = b.era !== 'E4' && W1 >= 4 && D1 >= 4;
      cand.push({ b, bi, s, giro, piazza, lungo, puo, perc: sulPerc.has(bi), premio: pr });
    });
    const meta = Math.round(cand.length / 3 * 1.12); let nv = 0;   // [tetti4] un abitato su cinque non trova posto per la vita e resta calmo: se ne scelgono un po' di più
    // il ritmo: due terrazzi abitati non si toccano (almeno 5 m fra i centri, salvo sul giro): fra uno e l'altro il campo calmo dei coppi
    const cen3 = c => cen4(c.b), presi = []; let n3 = 0; const max3 = Math.ceil(cand.filter(c => c.b.era === 'E3').length / 5);
    cand.slice().sort((p, q) => q.s - p.s).forEach(c => { if (!c.puo || nv >= meta) return; const [x, y] = cen3(c);
      if (!c.giro && !c.perc && c.premio !== 'terrazza' && presi.some(([u, v]) => hyp(u - x, v - y) < 4.6)) return; if (c.b.era === 'E3' && !c.giro && n3 >= max3) return;   // l'Ottocento: al più un terrazzo abitato ogni cinque tetti
      c.vivo = true; nv++; presi.push([x, y]); if (c.b.era === 'E3') n3++; });
    cand.forEach(c => { PIANO[c.bi] = pianoCasa3(c, giri); });
  }
  // il tetto di una casa: manto, forma, gruppi
  function pianoCasa3(c, giri) {
    const { b, bi } = c, era = b.era, LT4 = lotto4(b), x0 = LT4.x0, y0 = LT4.y0, W1 = LT4.lw, D1 = LT4.ld, fl = Math.max(1, b.fl || 1), q = s => h3(b.x, b.y, s);
    const piano = era === 'E2' || era === 'E4' || era === 'E6' || b.torre || b.annesso || c.vivo || c.giro || !!c.premio || !!c.forza || PLANKS.some(Q => Q.a === bi || Q.b === bi);   // [tetti4] dove arriva una passerella, un arco o un ponte il tetto è un terrazzo: il capo posa sul lastrico   // i calmi del borgo e dell'Ottocento sono tutti falde: il campo di coppi e di tegole che ripete; [tetti4] il premio sta su un terrazzo
    const P = { bi, era, vivo: !!c.vivo, giro: c.giro, piazza: c.piazza, lungo: c.lungo, tipo: piano ? 'piano' : 'falde', manto: piano ? (era === 'E4' || era === 'E6' ? 'quadrotti' : 'pianelle') : MANTO3[era] || 'coppi', gruppi: [], riserve: [], corr: [],
      rect: { x0: x0 + M3, y0: y0 + M3, x1: x0 + W1 - M3, y1: y0 + D1 - M3 } };
    if (!piano) {   // la falda: forma, colmo (lungo il lato lungo, al centro), pendenza come render.js
      const sq = Math.min(W1, D1) >= 6 && Math.abs(W1 - D1) <= 4.1; let along = W1 >= D1, L1 = along ? W1 : D1, S1 = along ? D1 : W1;
      // [tetti4] IL CAMPO DEI TETTI NON È UNA GRIGLIA: nel borgo e nell'Ottocento la capanna col colmo lungo resta la più comune, ma una casa su
      // quattro gira il colmo (la testata del timpano sulla strada), le quadrate prendono il padiglione, le strette la falda a una sola acqua
      // appoggiata al vicino; la pendenza cambia da casa a casa (coppi 0,22-0,36, tegole 0,34-0,46), come se ognuna fosse rifatta in un anno.
      const u = q(71), w4 = h3(b.x, b.y, 73);
      if ((sq || (Math.min(W1, D1) >= 4 && Math.abs(W1 - D1) <= 2.1)) && u < (era === 'E3' ? .55 : .45)) P.forma = 'padiglione';   // anche le quadrate piccole
      else if (S1 <= 4.1 && L1 >= 4 && u > .78 && !c.perc) P.forma = 'falda';
      else { P.forma = 'capanna'; if (u > .52 && L1 <= 12 && !sq) { P.forma4 = 'traverso'; along = !along; const t = L1; L1 = S1; S1 = t; } }
      const p0 = era === 'E3' ? .34 + w4 * .12 : .22 + w4 * .14;
      P.pitch = Math.round(Math.min(p0, Math.atan(3.2 / (P.forma === 'falda' ? S1 : S1 / 2))) * 50) / 50;
      const rl = P.forma === 'padiglione' ? Math.max(0, L1 - S1) : L1, cx = x0 + W1 / 2, cy = y0 + D1 / 2;
      P.colmo = { along, rl, cx, cy, h: (P.forma === 'falda' ? S1 : S1 / 2) * Math.tan(P.pitch), L1, S1 };
    }
    P.alto = roofRule(b) + (piano ? .6 : P.colmo.h + .2);
    // [tetti4] il parapetto dei terrazzi: basso (50 cm, o il cordolo da 35) verso la camera e dove si passa a un vicino; alto (80 cm o un
    // metro, con la copertina) sui lati di dietro che danno sul vuoto della strada. Le cupolette e le volte della marina e del borgo.
    if (piano && (era === 'E0' || era === 'E2' || era === 'E3')) {
      const passa = f => { const sd = sidesOf(b).find(z => z.f === f); for (let k = 0; k < sd.n; k++) { const [tx, ty] = sd.tile(k); for (let g = 0; g <= 2; g++) { const X = tx + sd.out[0] * g, Y = ty + sd.out[1] * g; if (inb(X, Y) && BI[Y * GW + X] >= 0 && BI[Y * GW + X] !== bi) return true; } }
        return LADDERS.some(L => (L.bi === bi || L.footB === bi) && L.f === f) || PLANKS.some(Q => (Q.a === bi || Q.b === bi)) || JUMPS.some(J => J.bi === bi || J.bj === bi); };
      P.parapetti = {}; ['S', 'E', 'N', 'W'].forEach((f, k) => { const v = q(81 + k); P.parapetti[f] = f === 'S' || f === 'E' ? (v < .3 && !c.giro ? .35 : .5) : passa(f) ? .5 : v < .4 ? .8 : v < .75 ? 1.0 : .5; });
      P.alto = Math.max(P.alto, roofRule(b) + Math.max(...Object.values(P.parapetti)) + .1);
    }
    // le riserve: dove arrivano le scale, le teste delle passerelle, i salti, il belvedere (tutto nel riferimento della casa)
    const ris = (x, y, r) => { const [a, d] = loc3(b, x, y); P.riserve.push([a, d, r]); };
    LADDERS.forEach(L => { if (L.camm) return; if (L.bi === bi) { ris(L.tx, L.ty, 1.3); ris(L.x - L.ox * .3, L.y - L.oy * .3, 1.1); } if (L.footB === bi) ris(L.fx, L.fy, 1.3); });
    PLANKS.forEach(Q => { if (Q.a === bi) { ris(Q.wa[0] - Q.ox * .5, Q.wa[1] - Q.oy * .5, 1.1); ris(Q.x0, Q.y0, 1.0); } if (Q.b === bi) { ris(Q.wb[0] + Q.ox * .5, Q.wb[1] + Q.oy * .5, 1.1); ris(Q.wb[0] + Q.ox * 1.5, Q.wb[1] + Q.oy * 1.5, 1.0); } });
    JUMPS.forEach(J => { for (let k = J.k0; k <= J.k1; k++) { const [wx, wy] = jA(J, k), [vx, vy] = jB(J, k); if (J.bi === bi) ris(wx - J.ox * .6, wy - J.oy * .6, 1.0); if (J.bj === bi) ris(vx + J.ox * .6, vy + J.oy * .6, 1.0); } });
    BELV.forEach(V => { if (V.bi === bi) ris(V.x, V.y, 1.8); });
    PREMI.forEach(Q => { if (Q.bi === bi && Q.k !== 'belvedere') ris(Q.x, Q.y, 1.0); });   // [tetti4] il premio ha il suo posto
    // il corridoio del giro: i tratti della linea del giro che passano sopra questa casa
    giri.forEach(g => { for (let k = 0; k < g.pts.length - 1; k++) { const [ax, ay] = g.pts[k], [bx, by] = g.pts[k + 1], L = hyp(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / .5)); let dentro = false;
      for (let j = 0; j <= n; j++) if (bAt(ax + (bx - ax) * j / n, ay + (by - ay) * j / n) === bi) { dentro = true; break; }
      if (dentro) P.corr.push([loc3(b, ax, ay), loc3(b, bx, by)]); } });
    // [tetti4] e i passaggi da tetto a tetto delle vie su e giù e dei rami (non solo la linea del giro): un metro e mezzo per parte della cucitura
    giri.forEach(g => { const E4 = [].concat(g.passi || [], ...(g.vie || []).map(v => (v.su || []).concat(v.giu || [])), ...(g.rami || []).map(r => r.passi || []));
      E4.forEach(e => { if (!e || (e.k !== 'tetto' && e.k !== 'gradino') || (e.a !== bi && e.b !== bi)) return; const ux = e.ux || 0, uy = e.uy || 0;
        P.corr.push([loc3(b, e.x - ux * 1.5, e.y - uy * 1.5), loc3(b, e.x + ux * 1.5, e.y + uy * 1.5)]); }); });
    const libero = g => {
      const R = P.rect; if (P.tipo === 'piano' && (g.x - g.hx < R.x0 - 1e-6 || g.x + g.hx > R.x1 + 1e-6 || g.y - g.hy < R.y0 - 1e-6 || g.y + g.hy > R.y1 + 1e-6)) return false;
      if (P.tipo === 'piano' && CAT3[g.k].alto > ALTO3 && (g.y + g.hy > y0 + D1 - CAMB3 || g.x + g.hx > x0 + W1 - CAMB3)) return false;
      if (P.riserve.some(r => rr3(g, r) < (r[2] + .15) ** 2)) return false;
      if (P.gruppi.some(o => gap3(o, g) < .35)) return false;
      if (P.cupola && gap3(P.cupola, g) < .35) return false;   // [tetti4]
      for (const [A, Bq] of P.corr) { const L = hyp(Bq[0] - A[0], Bq[1] - A[1]), n = Math.max(1, Math.ceil(L / .3)); for (let j = 0; j <= n; j++) if (rr3(g, [A[0] + (Bq[0] - A[0]) * j / n, A[1] + (Bq[1] - A[1]) * j / n]) < .81) return false; }
      return true; };
    const metti = (g, posti) => { for (const p of posti) { const h = Object.assign({ scopo: CAT3[g.k].scopo, alto: CAT3[g.k].alto }, g, p); if (libero(h)) { P.gruppi.push(h); return true; } } return false; };
    const R = P.rect, iw = R.x1 - R.x0, id = R.y1 - R.y0, cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
    let vasi2 = false; const T4 = TESTE4[era] || TESTE4.E0, testa4 = T4[Math.floor(q(91) * T4.length)];
    // [tetti4] la cupoletta (o la volta a botte) estradossata, imbiancata a calce: sulle case piccole e calme della marina e del borgo, mai
    // dove passa un giro, una via o un ramo, né dove arriva una scala, una passerella o un salto. Sta nel mezzo, lascia il giro del parapetto.
    if (P.tipo === 'piano' && !c.vivo && !c.perc && !c.premio && (era === 'E2' || era === 'E0') && W1 <= 10 && D1 <= 10 && !P.riserve.length && q(77) < (era === 'E2' ? .5 : .4)) {
      const m4 = Math.min(W1, D1) >= 4 ? .45 : 0, hx = iw / 2 - m4, hy = id / 2 - m4; /* sulle case di una casella la cupola prende tutto il tetto */ if (hx >= .5 && hy >= .5) { P.forma4 = Math.abs(W1 - D1) <= 2 ? 'cupola' : 'volta'; P.cupola = { k: P.forma4, x: cx, y: cy, hx, hy, alto: Math.min(1.15, .45 + Math.min(hx, hy) * .35), along: W1 >= D1 }; } }
    const prova = k => {
      if (P.tipo === 'falde') {   // sul colmo: il gruppo dei comignoli verso un capo, l'antenna verso l'altro (dietro, sulla falda lontana)
        const C = P.colmo; if (C.rl < 1.6 || P.forma === 'falda') return false;   // [tetti4] sulla falda a una sola acqua niente sul colmo
        const at = t => { const u = (t - .5) * C.rl; return C.along ? [C.cx + u, C.cy] : [C.cx, C.cy + u]; };
        const altri = P.gruppi.map(g => g.t), ts = [.22, .78, .5, .35, .65].filter(t => altri.every(t2 => Math.abs(t2 - t) * C.rl >= 1.6));
        const n = k === 'comignoli' ? (C.rl > 6 && q(47) < .5 ? 2 : 1) : 0, lu = k === 'comignoli' ? (n === 2 ? .85 : .45) : .2, la = k === 'comignoli' ? .8 : .2;   // lungo il colmo e di traverso (la canna sta sulla falda lontana)
        return metti({ k, falda: true, n, tipo4: k === 'comignoli' ? testa4 : undefined, hx: C.along ? lu : la, hy: C.along ? la : lu }, ts.map(t => { const [x, y] = at(t); return { t, x, y }; }));
      }
      if (k === 'altana') { const hx = .95, hy = .95; if (iw < 2 * hx + .6 || id < 2 * hy + 1 || (era !== 'E0' && era !== 'E2') || fl < 2) return false; return metti({ k, hx, hy }, [[R.x0 + hx, R.y0 + hy], [R.x1 - hx, R.y0 + hy], [R.x0 + hx, R.y1 - hy]].map(([x, y]) => ({ x, y }))); }
      if (k === 'torretta') { const hx = .6, hy = .6; if (iw < 3 || id < 3) return false; return metti({ k, hx, hy }, [[R.x0 + hx + .1, R.y0 + hy + .1], [R.x1 - hx - .1, R.y0 + hy + .1], [R.x0 + hx + .1, R.y1 - hy - .1]].map(([x, y]) => ({ x, y }))); }
      if (k === 'pergola') { const hx = 1.3, hy = 1.1; if (iw < 2 * hx + .2 || id < 2 * hy + .2) return false; return metti({ k, hx, hy }, [[R.x0 + hx, R.y0 + hy], [R.x1 - hx, R.y0 + hy], [R.x0 + hx, R.y1 - hy]].map(([x, y]) => ({ x, y }))); }
      if (k === 'stanza') { const pw = Math.max(2.6, Math.min(iw - 1.6, W1 * .42)), pd = Math.max(2.4, Math.min(id - 1.6, D1 * .42)); if (pw > iw || pd > id) return false;
        return metti({ k, hx: pw / 2, hy: pd / 2 }, [[R.x0 + pw / 2, R.y0 + pd / 2], [R.x1 - pw / 2, R.y0 + pd / 2], [R.x0 + pw / 2, R.y1 - pd / 2]].map(([x, y]) => ({ x, y }))); }
      if (k === 'bucato') {   // il filo lungo il lato lungo, verso il fondo (nord, ovest): alto 1,75, non sta sul bordo verso la camera
        const along = iw >= id, L = Math.min(4.2, (along ? W1 : D1) - CAMB3 - M3 - .4); if (L < 1.8) return false; const hx = along ? L / 2 + .2 : .45, hy = along ? .45 : L / 2 + .2;
        const posti = along ? [R.y0 + .45, R.y0 + 1.3].flatMap(y => [R.x0 + hx, cx].map(x => ({ x, y, ry: 0, L }))) : [R.x0 + .45, R.x0 + 1.3].flatMap(x => [R.y0 + hy, cy].map(y => ({ x, y, ry: 1, L })));
        return metti({ k, hx, hy }, posti); }
      if (k === 'vasi') { const n = vasi2 ? 2 : Math.max(3, Math.min(5, Math.floor(Math.max(iw, id) / 1.6))), l = n * .28 + .1, posti = [];
        [['S', 1], ['E', 1], ['N', 0], ['W', 0]].forEach(([f]) => [.25, .75, .5].forEach(u => {
          if (f === 'S' || f === 'N') posti.push({ lato: f, x: R.x0 + l + (iw - 2 * l) * u, y: f === 'S' ? R.y1 - .32 : R.y0 + .32, ry: 0 }); else posti.push({ lato: f, x: f === 'E' ? R.x1 - .32 : R.x0 + .32, y: R.y0 + l + (id - 2 * l) * u, ry: 1 }); }));
        return metti({ k, n, hx: l, hy: .32 }, posti.map(p => p.ry ? Object.assign(p, { hx: .32, hy: l }) : p)); }
      if (k === 'comignoli') return metti({ k, hx: .75, hy: .38, n: 2, tipo4: testa4 === 'vaso' ? 'vaso' : 'cappello' },   /* sul terrazzo le teste compatte */ [{ x: R.x0 + iw * .3, y: R.y0 + .38, ry: 0 }, { x: R.x0 + iw * .7, y: R.y0 + .38, ry: 0 }, { x: R.x0 + .38, y: R.y0 + id * .4, ry: 1, hx: .38, hy: .75 }]);
      if (k === 'antenna') return metti({ k, hx: .3, hy: .3 }, [[cx - iw * .15, R.y0 + 1.1], [R.x0 + 1.1, cy - id * .15], [cx + iw * .2, R.y0 + 1.1], [cx, cy - id * .2]].map(([x, y]) => ({ x, y })));
      return false;
    };
    if (P.vivo) {   // il primo gruppo dà il carattere; il secondo, se c'è, lo accompagna
      const base = (era === 'E0' || era === 'E2' || era === 'E6') && fl <= 3 && W1 >= 6 && D1 >= 6 && q(51) < .14 ? ['stanza'] : [];
      const alt4 = c.premio === 'belvedere' || (c.premio !== 'terrazza' && q(57) < .3) ? ['altana'] : [], ter4 = c.premio === 'terrazza' ? ['pergola'] : [];   // [tetti4] l'altana sul belvedere e qua e là; il pergolato sulla terrazza nascosta
      const ord = ter4.concat(alt4, base, q(53) < .45 ? ['bucato', 'pergola', 'vasi'] : q(53) < .75 ? ['pergola', 'vasi', 'bucato'] : ['vasi', 'bucato', 'pergola']);
      for (const k of ord) if (prova(k)) break;
      if (P.gruppi.length && q(55) < .55) { const pri = P.gruppi[0].k, sec = (era === 'E0' || era === 'E2') && q(59) < .5 ? ['torretta', 'vasi', 'antenna'].filter(k => k !== pri) : (pri === 'vasi' ? ['bucato', 'antenna'] : pri === 'stanza' ? ['vasi', 'antenna'] : ['vasi', 'antenna', 'comignoli']);   /* [tetti4] la colombaia accanto alla vita */ for (const k of sec) if (prova(k)) break; }
      if (!P.gruppi.length) { vasi2 = true; prova('vasi'); vasi2 = false; }   // [tetti4] due vasi soli, se la fila di tre non ci sta
      if (!P.gruppi.length) P.vivo = false;   // non c'è posto per vivere: resta calmo
    }
    if (!P.vivo) {
      if (P.tipo === 'falde') { if (q(61) < .7) prova('comignoli'); if (fl >= 2 && q(63) < .3) prova('antenna'); }
      else { const t = q(65); if ((era === 'E0' || era === 'E2') && !P.cupola && q(67) < .16) prova('torretta'); if (fl >= 2 && t < .3) prova('antenna'); else if (t < .55) prova('comignoli'); }   // [tetti4] la colombaia
    }
    P.firma4 = P.tipo === 'falde' ? P.forma + (P.forma4 ? '/' + P.forma4 : '') + ':' + P.pitch.toFixed(2) : 'piano' + (P.forma4 ? '/' + P.forma4 : '') + (P.parapetti ? ':' + ['N', 'W', 'S', 'E'].map(f => P.parapetti[f]).join('/') : '');   // [tetti4] la firma della forma (copertura4, test_tetti4)
    return P;
  }
  if (!COT4) piano3();
  // [tetti4] il parapetto alto (80 cm, un metro) non deve coprire una salita: se una scala da terra che si vedeva prima del piano ora è
  // coperta dal parapetto di una casa davanti, quel parapetto torna a 50 cm (le case girate spostano le scale, e il piano lo deve sapere)
  if (!COT4) { const D6 = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null; if (D6) D6.circuiti.filter(c => c.k === 'tetti').forEach(c => [c.sali, c.scendi].forEach(i => { if (LADDERS[i]) LADDERS[i].giro4 = true; }));
    for (let giro = 0; giro < 3; giro++) { let cambi = 0;
      LADDERS.forEach(L => { if (L.camm || L.footB >= 0 || L.corte !== undefined || L.vis === false || vistaL3(L)) return;
        const h0 = tileH(L.fx, L.fy), h1 = roofRule(B[L.bi]);
        for (const t of [.12, .5, .9]) { const x = L.x + L.ox * .35, y = L.y + L.oy * .35, z = h0 + (h1 - h0) * t;
          for (let d = .5; d <= 45; d += .5) { const px = x + CAM * d, py = y + CAM * d, pz = z + d * TAN3; if (pz > 40) break; const o = bAt(px, py); const P = o >= 0 ? PIANO[o] : null;
            if (!P || P.alto <= pz) continue; if (libero4(B[o]) && !dentro4(B[o], px, py, -.3)) continue;
            if (P.tipo === 'falde' && L.giro4) {   // la falda davanti all'ingresso di un giro: la casa diventa un terrazzo (più basso del colmo)
              const D5 = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null, giri5 = D5 ? D5.circuiti.filter(c => c.k === 'tetti') : [];
              PIANO[o] = pianoCasa3({ b: B[o], bi: o, s: 0, giro: false, piazza: false, lungo: false, puo: false, perc: false, forza: true }, giri5); cambi++; continue; }
            if (!P.parapetti) continue;
            let c = false; ['N', 'W'].forEach(f => { if (P.parapetti[f] > .5) { P.parapetti[f] = .5; c = true; } });
            if (c) { P.alto = Math.max(roofRule(B[o]) + .6, roofRule(B[o]) + Math.max(...Object.values(P.parapetti)) + .1); P.firma4 = 'piano' + (P.forma4 ? '/' + P.forma4 : '') + ':' + ['N', 'W', 'S', 'E'].map(f => P.parapetti[f]).join('/'); cambi++; } } } });
      if (!cambi) break; } }
  // [tetti4] le vie dei giri si ricontrollano col piano fatto (le falde alzano il colmo): una via la cui scala la camera non vede si toglie
  if (!COT4) { const D4 = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
    if (D4) D4.circuiti.filter(c => c.k === 'tetti' && c.vie).forEach(c => { c.vie = c.vie.filter(v => { const L = LADDERS[v.i]; return vistaL3(L) && G.walkT(Math.floor(L.fx / TS), Math.floor(L.fy / TS)) && bAt(L.fx, L.fy) < 0; });   /* [tetti4] e il piede in strada (sulle case girate la scala può finire su una casella della casa) */ c.salite = [c.sali].concat(c.vie.map(v => v.i)); c.discese = [c.scendi].concat(c.vie.map(v => v.i)); }); }
  // [tetti4] IL PROFILO DELLE PASSERELLE: i due capi posano sul lastrico dei terrazzi (il piano li ha resi terrazzi), si sale con una
  // scaletta di gradini fino al pianerottolo che scavalca il parapetto e la copertina (2 cm d'aria sotto il telaio), poi l'impalcato va
  // dritto da un pianerottolo all'altro sopra il vicolo. La quota dei pianerottoli è quella del solido più alto sotto di loro (Tetti.solido4)
  // più lo spessore dell'impalcato; il motore cammina lo stesso profilo (plankH). P.prof = { k: nodi [s, quota], scala: i tratti a gradini,
  // pavimento(s): la quota del lastrico sotto la scaletta }.
  const TOLL4 = .02, FONDO4 = .12, ARCO4 = .28;   // la tolleranza, il fondo dell'impalcato sotto il piano di calpestio (assi 4 cm + telaio di ferro 8), il dorso dell'arco
  function profili4() {
    if (!CN3) return;
    PLANKS.forEach(P => {
      if (!PIANO[P.a] || !PIANO[P.b] || PIANO[P.a].tipo !== 'piano' || PIANO[P.b].tipo !== 'piano') return;
      profilo4(P);
    });
  }
  // [tetti4] nella pagina la quota delle case si assesta dopo (render.js posa le case sul terreno): il profilo si rifà quando cambia la quota
  // di una delle due case (o di una vicina: si rifà comunque tutto il profilo), al primo uso dopo il cambio
  function profCur4(P) { const p = P.prof; if (p && (Math.abs(p.ra - roofRule(B[P.a])) > 1e-4 || Math.abs(p.rb - roofRule(B[P.b])) > 1e-4)) profilo4(P); return P.prof; }
  const pavimento4 = (P, fa, fb) => s2 => s2 < P.L / 2 ? fa : fb;   // [cotto] la quota del lastrico sotto la scaletta (la rifà anche il mondo cotto)
  function profilo4(P) {
    {
      const sp = (P.arco ? ARCO4 : FONDO4) + .015, larg = P.hw + .06, fa = roofRule(B[P.a]) + .08, fb = roofRule(B[P.b]) + .08;
      const solMax = (u0, u1) => { let m = -Infinity; for (let s2 = u0 - .1; s2 <= u1 + .1 + 1e-6; s2 += .05) for (let t = -larg - .05; t <= larg + .05 + 1e-6; t += (larg + .05) / 4) {   /* un poco più largo e più fitto della misura */ const x = P.x0 + P.ox * s2 + P.px * t, y = P.y0 + P.oy * s2 + P.py * t; caseSotto4(x, y).forEach(bi => { m = Math.max(m, solido4(bi, x, y)); }); } return m; };
      const a0 = Math.max(.25, P.s1 - (P.margA || .45)), b1 = Math.min(P.L - .25, P.s2 + (P.margB || .45));   // il pianerottolo copre il parapetto (28 cm) e la copertina (21), la scaletta il resto
      let Ha = solMax(a0, P.s1 + .14) + sp, Hb = solMax(P.s2 - .14, b1) + sp;
      // sopra il vicolo: se una gronda vicina sporge sotto la retta, si alzano i due pianerottoli
      let alza = 0; for (let s2 = P.s1 + .14; s2 <= P.s2 - .14 + 1e-6; s2 += .1) { const t0 = (s2 - P.s1 - .14) / Math.max(.1, P.s2 - P.s1 - .28), h = Ha + (Hb - Ha) * t0, m = solMax(s2, s2) + sp; if (m - h > alza) alza = m - h; }
      Ha += alza + (P.alzaVero4 || 0); Hb += alza + (P.alzaVero4 || 0);   // [tetti4] nella pagina, quanto chiede il modello vero (affinaVero4)
      P.prof = { k: [[0, fa], [a0, Ha], [P.s1 + .14, Ha], [P.s2 - .14, Hb], [b1, Hb], [P.L, fb]], scala: [[0, a0], [b1, P.L]], fa, fb, pavimento: pavimento4(P, fa, fb), ra: roofRule(B[P.a]), rb: roofRule(B[P.b]) };
    }
  }
  if (!COT4) profili4();
  // [cotto] la fine del punto: nella cottura si salva, col file cotto si riempie (le funzioni nei dati si rifanno: i lati dei salti, il
  // pavimento dei profili)
  if (CT4 && (COT4 || CT4.cuoci)) {
    const R4 = CT4.chiudi('tetti', { LIB4, SEP4, PLANKS, PCELL, JUMPS, CAMM, CCELL, RETE4, CORTI, BELV, PREMI, PIANO }, COT4, () => CT4.RIFARE);
    if (R4) { LIB4 = R4.LIB4; SEP4 = R4.SEP4; rifaiFunzioni4(); }
    else if (COT4) throw new Error('[cotto] la rete dei tetti non si legge');
  }
  function rifaiFunzioni4() {
    const lati = new Map();
    JUMPS.forEach(J => { const sd = J.sd; if (!sd || lati.has(sd)) return; lati.set(sd, 1); const s0 = sidesOf(B[J.bi]).find(q => q.f === sd.f); sd.tile = s0.tile; sd.wall = s0.wall; });
    PLANKS.forEach(P => { if (P.prof && P.prof.pavimento === CT4.RIFARE) P.prof.pavimento = pavimento4(P, P.prof.fa, P.prof.fb); });
  }
  // [tetti3] la verifica (test_tetti3.js e render.js): il conto per tetto, gli scopi, le compenetrazioni del piano, le salite che si vedono
  function verifica3() {
    const V = { tetti: 0, vivi: 0, calmi: 0, perGruppi: [0, 0, 0], gruppi: {}, perEra: {}, senzaScopo: 0, doppi: 0, compenetrazioni: [], viviDove: { giro: 0, piazza: 0, lungo: 0, altrove: 0 } };
    PIANO.forEach(P => { if (!P) return; V.tetti++;
      if (P.cupola) { P.riserve.forEach(r => { if (rr3(P.cupola, r) < r[2] ** 2) V.compenetrazioni.push([P.bi, P.cupola.k, 'riserva']); }); P.gruppi.forEach(g => { if (gap3(P.cupola, g) < .3) V.compenetrazioni.push([P.bi, P.cupola.k + '/' + g.k, 'urto']); }); }   // [tetti4]
      P.vivo ? V.vivi++ : V.calmi++; const n = P.gruppi.length; V.perGruppi[Math.min(2, n)]++; if (n > 2) V.compenetrazioni.push([P.bi, 'troppi gruppi']);
      const E = V.perEra[P.era] || (V.perEra[P.era] = { tetti: 0, vivi: 0, falde: 0, gruppi: 0 }); E.tetti++; if (P.vivo) E.vivi++; if (P.tipo === 'falde') E.falde++; E.gruppi += n;
      if (P.vivo) V.viviDove[P.giro ? 'giro' : P.piazza ? 'piazza' : P.lungo ? 'lungo' : 'altrove']++;
      const ks = new Set(); P.gruppi.forEach((g, i) => { V.gruppi[g.k] = (V.gruppi[g.k] || 0) + 1; if (!CAT3[g.k] || !g.scopo) V.senzaScopo++; if (ks.has(g.k)) V.doppi++; ks.add(g.k);
        const R = P.rect, b = B[P.bi];
        if (P.tipo === 'piano') { if (g.x - g.hx < R.x0 - 1e-6 || g.x + g.hx > R.x1 + 1e-6 || g.y - g.hy < R.y0 - 1e-6 || g.y + g.hy > R.y1 + 1e-6) V.compenetrazioni.push([P.bi, g.k, 'parapetto']);
          if (g.alto > ALTO3 && (g.y + g.hy > lotto4(b).y1 - CAMB3 || g.x + g.hx > lotto4(b).x1 - CAMB3)) V.compenetrazioni.push([P.bi, g.k, 'bordo verso la camera']); }
        else { if (!CALMI3.includes(g.k)) V.compenetrazioni.push([P.bi, g.k, 'falda']); const C = P.colmo, off = C.along ? Math.abs(g.y - C.cy) : Math.abs(g.x - C.cx); if (off > .05 || g.t < .1 || g.t > .9) V.compenetrazioni.push([P.bi, g.k, 'fuori dal colmo']); }
        P.riserve.forEach(r => { if (rr3(g, r) < r[2] ** 2) V.compenetrazioni.push([P.bi, g.k, 'riserva']); });
        P.gruppi.forEach((o, j) => { if (j > i && gap3(o, g) < .3) V.compenetrazioni.push([P.bi, g.k + '/' + o.k, 'urto']); });
        P.corr.forEach(([A, Bq]) => { const L = hyp(Bq[0] - A[0], Bq[1] - A[1]), n = Math.max(1, Math.ceil(L / .3)); for (let j = 0; j <= n; j++) if (rr3(g, [A[0] + (Bq[0] - A[0]) * j / n, A[1] + (Bq[1] - A[1]) * j / n]) < .64) { V.compenetrazioni.push([P.bi, g.k, 'giro']); break; } });
        // il vicino: il gruppo sta dentro la sua casa (nel riferimento girato); la casa accanto più alta non lo copre fino a metà
      }); });
    // le salite: dalla strada, viste dalla camera (col piano: le falde alzano il colmo)
    const S = { scale: 0, viste: 0, nascoste: [], giri: [] };
    LADDERS.forEach(L => { if (L.corte !== undefined) { S.corti = (S.corti || 0) + 1; return; }   // [tetti4] la scala nella corte è il premio di un giro, una discesa nascosta: si conta a parte
      if (L.camm || L.footB >= 0 || !B[L.bi].era) return; S.scale++; if (vistaL3(L)) S.viste++; else S.nascoste.push(L.i); });
    const D = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
    if (D) D.circuiti.filter(c => c.k === 'tetti').forEach(c => [c.sali, c.scendi].forEach(i => { const L = LADDERS[i]; S.giri.push({ giro: c.id, i, lato: L.f, vista: vistaL3(L), piede: G.walkT(Math.floor(L.fx / TS), Math.floor(L.fy / TS)) }); }));
    V.salite = S; return V;
  }
  // il raggio dalla camera con le quote del piano (il colmo delle falde conta)
  function vistaL3(L) {
    const h0 = L.footB >= 0 ? roofRule(B[L.footB]) : tileH(L.fx, L.fy), h1 = roofRule(B[L.bi]); let n = 0;
    for (const t of [.12, .5, .9]) { const x = L.x + L.ox * .35, y = L.y + L.oy * .35, z = h0 + (h1 - h0) * t; let ok = true;
      for (let d = .5; d <= 45 && ok; d += .5) { const px = x + CAM * d, py = y + CAM * d, pz = z + d * TAN3; if (pz > 40) break; const o = bAt(px, py);
        if (o >= 0 && (!libero4(B[o]) || dentro4(B[o], px, py, -.3)) && (PIANO[o] ? PIANO[o].alto : roofRule(B[o]) + .6) > pz) ok = false;   /* [tetti4] la casa girata copre col suo rettangolo girato, non con le caselle */ else if (PZ.length && hPz3(px, py) > pz) ok = false; }
      if (ok) n++; }
    return n >= 2;
  }
  // =====================================================================================================================
  // [tetti4] LA COPERTURA DEI TETTI: quali tetti del borgo, della marina e dell'Ottocento stanno sulla rete (test_tetti4.js, la pianta)
  // =====================================================================================================================
  // Per ogni casa con l'epoca dei tre quartieri vecchi (E0 borgo, E2 marina, E3 Ottocento) una classe sola:
  //   giro   sta su un circuito dei tetti (la linea, i suoi rami, le sue salite e discese);
  //   rete   ci si arriva camminando sui tetti da un circuito (la rete dei tetti, archi orientati del grafo);
  //   isola  ci si sale da terra, ma dai circuiti non ci si arriva (un'isola di tetti);
  //   muro   non ci si sale proprio (nessuna scala, nessun passaggio da un tetto dove si sale).
  // In più: «muto» il tetto senza niente sopra e della forma più comune del suo quartiere (il lastrico vuoto, la capanna di serie).
  function copertura4() {
    const E = grafo(), D = typeof Percorsi !== 'undefined' && Percorsi.attivo ? Percorsi.dati : null;
    const giri = D ? D.circuiti.filter(c => c.k === 'tetti') : [], sulGiro = new Set();
    giri.forEach(c => { (c.edifici || []).forEach(i => sulGiro.add(i)); (c.rami || []).forEach(r => (r.edifici || []).forEach(i => sulGiro.add(i))); (c.vie || []).forEach(v => (v.edifici || []).forEach(i => sulGiro.add(i))); });
    const bfs = src => { const S = new Set(src), Q = [...S]; for (let k = 0; k < Q.length; k++) (E.get(Q[k]) || []).forEach(e => { if (!S.has(e.b)) { S.add(e.b); Q.push(e.b); } }); return S; };
    const daRete = bfs(sulGiro), daTerra = bfs(LADDERS.filter(L => L.footB < 0 && !L.camm).map(L => L.bi));
    const firma = i => { const P = PIANO[i]; return P ? P.firma4 || (P.tipo + ':' + (P.forma || P.manto)) : '?'; }, comune = {};
    B.forEach((b, i) => { const z = ZONE4[b.era]; if (!z) return; const f = firma(i), c = comune[z] || (comune[z] = {}); c[f] = (c[f] || 0) + 1; });
    const piu = {}; for (const z in comune) piu[z] = Object.entries(comune[z]).sort((a, c) => c[1] - a[1])[0][0];
    const classe = [], Z = {};
    B.forEach((b, i) => { const z = ZONE4[b.era]; if (!z || b.__tierOf) return;
      const k = sulGiro.has(i) ? 'giro' : daRete.has(i) ? 'rete' : daTerra.has(i) ? 'isola' : 'muro', P = PIANO[i], muto = !!P && !P.gruppi.length && firma(i) === piu[z] && !P.forma4;
      classe[i] = { k, muto, z };
      const s = Z[z] || (Z[z] = { tetti: 0, giro: 0, rete: 0, isola: 0, muro: 0, muti: 0, forme: {} }); s.tetti++; s[k]++; if (muto) s.muti++; const f = P ? (P.forma4 || P.forma || P.tipo) : '?'; s.forme[f] = (s.forme[f] || 0) + 1; });
    for (const z in Z) { const s = Z[z]; s.raggiungibili = (s.giro + s.rete) / Math.max(1, s.tetti); s.attraversati = s.giro / Math.max(1, s.tetti); s.quotaMuti = s.muti / Math.max(1, s.tetti); }
    return { classe, zone: Z, giri: giri.length };
  }
  // =====================================================================================================================
  // [tetti4] LE PASSERELLE CONTRO I TETTI: ogni passerella, arco e ponte (PLANKS) contro la geometria dei tetti che tocca
  // =====================================================================================================================
  // Andrea: «le passerelle tra i tetti si compenetrano spesso con i tetti». La misura (test_tetti4.js, strumenti/passerelle4.js): il
  // volume dell'impalcato (le assi e il telaio di ferro sotto, 12 cm; il dorso di pietra dell'arco, 28 cm), largo quanto la passerella più
  // il telaio, campionato ogni 10 cm per lungo e per largo, contro il SOLIDO dei tetti di ogni casa che sta sotto quel punto (le due che
  // lega e qualunque altra, gronde comprese), rifatto dal dato come lo costruisce render.js:
  //   terrazzo: il lastrico (+8 cm), il parapetto lato per lato (Tetti.PIANO.parapetti, 50 cm per difetto) con la copertina che sporge
  //             21 cm per parte (+7 cm), i gruppi del piano (la loro altezza), la cupola, i premi, il belvedere, le cose dei tetti vissuti;
  //   falde:    la falda col manto (+16 cm i coppi, +12 le tegole), lo sbalzo della gronda (32 cm il borgo, 55 l'Ottocento) che scende,
  //             il colmo, i comignoli, le cose dei tetti vissuti sulla falda;
  //   le case senza piano (i palazzi con nome): il tetto alla regola dei piani più 60 cm (non si sa com'è: si sta larghi).
  // Un urto è un punto dove il fondo dell'impalcato sta più di 2 cm sotto il solido. La scaletta di gradini con cui si scende sul
  // lastrico (P.prof) poggia sul lastrico e si misura a parte: deve stare sopra il lastrico e fuori dal parapetto.
  // (le misure TOLL4, FONDO4, ARCO4 stanno sopra profili4)
  function vissuti4(bi) { const TV = typeof TettiVissuti !== 'undefined' ? TettiVissuti : null; return TV && TV.VISSUTI && TV.VISSUTI[bi] ? TV.VISSUTI[bi].cose : []; }
  function solido4(bi, x, y) {   // la quota più alta del tetto della casa bi nel punto (x, y), o -Infinity se lì la casa non c'è
    const b = B[bi]; if (!b) return -Infinity; const P = PIANO[bi], [lx, ly] = loc3(b, x, y), L4s = lotto4(b), x0 = L4s.x0, y0 = L4s.y0, x1 = L4s.x1, y1 = L4s.y1, top = roofRule(b);
    const dentro = lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1;
    let h = -Infinity; const su = v => { if (v > h) h = v; };
    const inRect = (g, m) => Math.abs(lx - g.x) <= g.hx + (m || 0) && Math.abs(ly - g.y) <= g.hy + (m || 0);
    if (!P) { if (lx >= x0 - .25 && lx <= x1 + .25 && ly >= y0 - .25 && ly <= y1 + .25) su(top + .6); return h; }
    if (P.tipo === 'piano') {
      const dW = lx - x0, dE = x1 - lx, dN = ly - y0, dS = y1 - ly, pp = P.parapetti || {}, ph = f => pp[f] !== undefined ? pp[f] : .5;
      if (dentro) su(top + .08);
      // il parapetto e la copertina (21 cm fuori e dentro il filo del muro), per lato
      [['W', dW, ly >= y0 - .12 && ly <= y1 + .12], ['E', dE, ly >= y0 - .12 && ly <= y1 + .12], ['N', dN, lx >= x0 - .12 && lx <= x1 + .12], ['S', dS, lx >= x0 - .12 && lx <= x1 + .12]].forEach(([f, d, ok]) => {
        if (!ok) return; if (d >= 0 && d <= .28) su(top + ph(f)); if (d >= -.12 && d <= .4) su(top + ph(f) + .07); });   /* render.js: la copertina del piano sporge 8 cm fuori, 36 dentro */   /* la copertina: 8 cm fuori, 36 dentro (render.js), con margine */
      if (!dentro) return h;
      P.gruppi.forEach(g => { if (inRect(g, .05)) su(top + .08 + (g.alto || 1)); });
      if (P.cupola && inRect(P.cupola, 0)) su(top + .08 + P.cupola.alto);
      PREMI.forEach(q => { if (q.bi === bi && q.k === 'tesoro' && Math.abs(x - q.x) < .4 && Math.abs(y - q.y) < .4) su(top + .6); });
      BELV.forEach(v => { if (v.bi === bi && Math.abs(x - v.x) < 1.0 && Math.abs(y - v.y) < 1.0) su(top + .9); });
      vissuti4(bi).forEach(o => { if (o.k === 'colatura') return;   /* la colatura è una macchia sul muro di fuori, non un volume */ const c = TettiVissuti.CAT[o.k] || {}; if (Math.abs(lx - o.x) <= (o.hx || c.hx || .2) && Math.abs(ly - o.y) <= (o.hy || c.hy || .2)) su(top + .08 + (o.qz || 0) + (c.h || .3) * (o.s || 1)); });
      return h;
    }
    // la falda: come tetto1 (render.js) e quotaFalda (tetti_vissuti.js), col manto e lo sbalzo della gronda
    const C = P.colmo, tp = Math.tan(P.pitch), th = P.manto === 'tegole' ? .12 : .16, ov = P.era === 'E3' ? .55 : .32, ovg = P.forma === 'padiglione' ? ov : Math.max(.2, ov * .7);
    const perp = C.along ? Math.min(ly - y0, y1 - ly) : Math.min(lx - x0, x1 - lx), par = C.along ? Math.min(lx - x0, x1 - lx) : Math.min(ly - y0, y1 - ly);
    const oP = P.forma === 'padiglione' ? ov : ovg, inPerp = perp >= -ov, inPar = par >= -oP; if (!inPerp || !inPar) return h;
    let q;
    if (P.forma === 'padiglione') q = Math.min(perp, par) * tp;
    else if (P.forma === 'falda') { const u = C.along ? y1 - ly : x1 - lx, w = C.along ? y1 - y0 : x1 - x0; if (u > w + .3) return h; q = Math.max(-ov, u) * tp; }
    else q = perp * tp;
    su(top + q + th);
    P.gruppi.forEach(g => { if (inRect(g, .1)) su(top + C.h + 1.4); });   // i comignoli sul colmo
    vissuti4(bi).forEach(o => { const c = TettiVissuti.CAT[o.k] || {}; if (Math.abs(lx - o.x) <= (o.hx || c.hx || .2) && Math.abs(ly - o.y) <= (o.hy || c.hy || .2)) su(top + (o.qz || 0) + (c.h || .1) * (o.s || 1)); });
    return h;
  }
  // le case sotto un punto (anche con la gronda che sporge): le caselle attorno
  function caseSotto4(x, y) { const S = new Set(), tx = Math.floor(x / TS), ty = Math.floor(y / TS); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (!inb(tx + i, ty + j)) continue; const o = BI[(ty + j) * GW + tx + i]; if (o >= 0 && B[o]) S.add(o); } return S; }
  function passerelle4() {
    const urti = [], perP = [];
    PLANKS.forEach(P => {
      const arco = !!P.arco, spess = arco ? ARCO4 : FONDO4, larg = P.hw + (arco ? .0 : .06); let n = 0, peggio = 0, dove = null;
      const scala = P.prof ? profCur4(P).scala : null;   // [s0, s1] della scaletta sul lastrico, ai due capi
      for (let s2 = 0; s2 <= P.L + 1e-6; s2 += .1) {
        const inScala = scala && scala.some(([u0, u1]) => s2 >= u0 - 1e-6 && s2 <= u1 + 1e-6);
        if (arco && (s2 < P.s1 - .3 || s2 > P.s2 + .3) && !P.prof) continue;   // l'arco di prima disegnava solo il tratto sopra il vicolo
        const h = plankH(P, s2);
        for (let t = -larg; t <= larg + 1e-6; t += larg / 3) {
          const x = P.x0 + P.ox * s2 + P.px * t, y = P.y0 + P.oy * s2 + P.py * t;
          caseSotto4(x, y).forEach(bi => { const sol = solido4(bi, x, y); if (sol === -Infinity) return;
            const fondo = inScala ? P.prof.pavimento(s2) : h - spess, d = sol - fondo;
            // sulla scaletta il fondo è il lastrico su cui posa: un solido più alto del lastrico (un vicino, una cosa) è un urto
            if (d > TOLL4) { n++; if (d > peggio) { peggio = d; dove = { x, y, z: fondo, bi, s: s2, t }; } } }); } }
      if (n) { urti.push({ i: P.i, a: P.a, b: P.b, tipo: P.tipo4 || 'passerella', n, cm: Math.round(peggio * 100), x: +dove.x.toFixed(2), y: +dove.y.toFixed(2), z: +dove.z.toFixed(2), contro: B[dove.bi].id, forma: PIANO[dove.bi] ? (PIANO[dove.bi].forma || PIANO[dove.bi].tipo) : 'senza piano', s: +dove.s.toFixed(2), t: +dove.t.toFixed(2), L: +P.L.toFixed(2) }); }
      perP.push(n);
    });
    return { passerelle: PLANKS.length, urti, conPunti: urti.length };
  }
  Object.assign(API, { lotto4, libero4, toW4, PIANO, CAT3, piano3, verifica3, vistaL3, loc3, copertura4, PREMI, RETE4, DBG4, CORTI, passerelle4, solido4 });
  return API;
})();
if (typeof module !== 'undefined') module.exports = Tetti;
