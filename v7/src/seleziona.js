/* Porto Vecchio — [graffiti] LO STRUMENTO DI SELEZIONE DEI GRAFFITI (seleziona.js; ?noseleziona: com'era).
   Il committente: «TUTTI I MURI E LE SUPERFICI DEVONO ESSERE GRAFFITTABILI, ANCHE LE AUTO, È COME UNO STRUMENTO DI SELEZIONE OTTIMIZZATO».
   Prima (writing.js tavHov / tavPick / supDavanti) la cornice stava al centro dello schermo: un raggio dalla camera contro tutte le mesh
   candidate, poi fino a 20 raggi orizzontali dal petto, poi una griglia di 63 raggi (fitWall) per stringere il riquadro, ogni 120-700 ms;
   una sola cornice gialla a filo (1 px), nessun modo di passare a un altro muro se non girarsi; e il riquadro rifiutava saracinesche (il
   riquadro passava sul muro dietro di 4,5 cm), muretti sotto il metro, mezzi in movimento, i lati corti di chioschi e cassonetti.
   Qui la scelta non tira raggi: lavora su una INTERROGAZIONE DI SUPERFICIE fatta prima.
   1. I PIANI (estrai): le mesh ferme vicino al giocatore si leggono una volta, a fette (al più ~1 ms per fotogramma, 0,7 sul telefono),
      triangolo per triangolo: le facce verticali si raggruppano per piano (la normale a 1,5°, la distanza a 3 cm, i vicini fusi) e ogni
      piano diventa una griglia di celle da 25 cm sul muro (u lungo il muro, y in altezza: coperta o no, dai triangoli veri). I vani di
      finestre e porte restano buchi da soli (il vetro e il fondo stanno dietro); in più le aperture vere delle case (R.aperture: finestre,
      porte, vetrine, la fascia dell'insegna) si tolgono dal piano della facciata. Una tabella delle somme (SAT) dice in O(1) se un
      rettangolo è tutto buono. I piani vanno in una griglia del mondo di 8 m (indice per tassello): restano finché la mesh è in scena.
   2. I MEZZI (scatole): le auto, i furgoni, l'Ape, le barche ferme (velocità < 0,3 m/s) dalla loro scatola nel loro sistema (fatta una
      volta per modello): i due fianchi (la fascia delle portiere) e il retro; la vernice poi si posa sui triangoli veri (writing.js decalGeo)
      e segue il mezzo.
   3. LA TERRA: davanti ai piedi, se il suolo è piano (cinque quote, entro 12 cm) e percorribile.
   cerca() mette insieme i candidati entro 6,5 m (davanti al personaggio o alla camera), per ognuno il riquadro della misura scelta (tag,
   throw-up, pezzo, burner) più vicino al punto davanti a te dentro la fascia che la mano raggiunge (12 cm - 2,75 m sopra i piedi), e se non
   ci sta la misura più grande che ci sta; scarta quello che un altro piano copre (lo stesso indice: un muretto davanti alla facciata) e
   ordina per distanza, angolo, misura. Il più adatto è scelto da solo; ◄ ► passa al candidato a sinistra / a destra sullo schermo, ▲ ▼ la
   misura. LA CORNICE (anteprima): il riquadro sul piano della superficie, della misura vera, col bordo spesso giallo su nero (si legge su
   ogni muro, sopra a tutto), il velo che pulsa, gli angoli, l'etichetta (misura in metri, cosa è: MURO, SARACINESCA, AUTO…, 2/5 ◄ ►), e
   gli altri candidati a filo bianco. A (o il tocco nella cornice) apre la tavoletta lì (writing.js tavOpen: le regole di sempre, i
   testimoni, i Grigi, la volante, il regime).
   Fuori dall'impronta dei tasselli (build.py TASS_FUORI): non tocca la città. Prova: node src/test_seleziona.js. */
var Seleziona = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]noseleziona\b/.test(Q);
  const T3 = () => (typeof THREE !== 'undefined' ? THREE : null);
  const PV = () => (typeof window !== 'undefined' && window.__pv) || null;
  const R_ = () => { const p = PV(); return p && p.R; };
  const G_ = () => (typeof Game !== 'undefined' ? Game : null);
  const WR = () => (typeof Writing !== 'undefined' ? Writing : null);
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const K = {
    cella: .25,      // il lato di una cella del piano (m)
    banda: 4,        // quanto del piano si tiene, dal suo punto più basso (m): la mano arriva a 2,75 m sopra i piedi, le strade salgono
    raggio: 6.5,     // fin dove si sceglie (m, dal personaggio al piano)
    lato: 3,         // quanto ci si sposta di lato lungo il muro per far entrare il riquadro (m)
    piede: .12, mano: 2.75, occhio: 1.35,   // la fascia della mano sopra i piedi (come tick, tavHov) e il centro preferito
    minArea: .5,     // un piano più piccolo non è una superficie (m²)
    sotto: 1.5, sopra: 3.6,   // i triangoli fuori dalla fascia che la mano raggiunge (dal suolo lì sotto) non si leggono: tetti, piani alti, cantine
    msTel: .7, msPc: 1.2, msCaldo: .3,      // il tetto per fotogramma della lettura delle mesh (in mano / in tasca)
    periodo: 90,     // la scelta si rifà al più ogni 90 ms (se ti muovi, giri la camera, o ogni 600 ms)
    maxC: 12,        // candidati tenuti
    cellaMondo: 8,   // la griglia dell'indice (m)
  };
  const SCALE = [1, .85, .7, .55, .42];   // la misura che non ci sta si stringe (poi la più piccola)
  const MISURE = { tag: [1.5, .75], throw: [2.7, 1.3], pezzo: [4.8, 2.05], burner: [6.6, 2.5] }, MIS_K = ['tag', 'throw', 'pezzo', 'burner'];
  const MIS_NOME = { tag: 'TAG', throw: 'THROW-UP', pezzo: 'PEZZO', burner: 'BURNER' };
  const NOME = { facciata: 'MURO', muro: 'MURO', saracinesca: 'SARACINESCA', muretto: 'MURETTO', chiosco: 'EDICOLA', oggetto: 'OGGETTO', terra: 'TERRA', barca: 'BARCA' };
  const PEN = { facciata: 0, muro: 0, saracinesca: -.15, muretto: .2, chiosco: .1, oggetto: .45, auto: 0, barca: .1, terra: 3 };   // il gusto: a parità, prima il muro
  const ST = { estratte: 0, piani: 0, celle: 0, byte: 0, fusi: 0, msEstr: 0, triangoli: 0, attese: 0, q: 0, ms: [], msMax: 0, ultimo: 0, scartati: {}, mezzi: 0, nC: 0 };

  // ---------------- 1. I PIANI DELLE MESH FERME ----------------
  let PM = typeof WeakMap !== 'undefined' ? new WeakMap() : null;   // mesh → { stamp, patches, manca }
  const IDX = new Map();   // cella del mondo (8 m) → piani
  let PID = 0;
  const ckey = (ix, iz) => (ix + 32768) * 65536 + (iz + 32768);
  function posAcc(m) {   // le posizioni per leggere i triangoli: il vettore, i 16 bit dei tasselli leggeri, o l'attributo interlacciato
    const g = m.geometry, PA = g && g.attributes && g.attributes.position; if (!PA) return null;
    const Qz = PA.__q; if (Qz && Qz.u) return { n: Qz.u.length / 3, q: Qz.u, mn: Qz.mn, k: Qz.k, a: null, ia: null };
    const A = PA.__pf || (PA.isInterleavedBufferAttribute ? null : PA.array);
    if (A && A.length >= 9 && PA.itemSize === 3 && !PA.normalized) return { n: A.length / 3, q: null, a: A, ia: null };
    if (PA.count >= 3) return { n: PA.count, q: null, a: null, ia: PA };
    return null;
  }
  const vx = (P, i, c) => P.a ? P.a[i * 3 + c] : P.q ? P.mn[c] + P.q[i * 3 + c] * P.k[c] : (c === 0 ? P.ia.getX(i) : c === 1 ? P.ia.getY(i) : P.ia.getZ(i));
  // il vetro (trasparente sotto il 60%, o che non scrive la profondità, o tenuto trasparente) non si dipinge; quello che si spegne o si fa
  // trasparente dopo la lettura si guarda dal vivo, a ogni interrogazione (matOra, come bmbHit)
  const matVis = q => !!q && q.visible !== false && !(q.transparent && (q.opacity < .6 || q.depthWrite === false || (q.userData && q.userData.keepTr))) && !q.isLineBasicMaterial && !q.isPointsMaterial;
  const matOra = q => !q || (q.visible !== false && !(q.transparent && q.opacity < .3));
  const ID16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  // la quota del suolo per casella (R.groundH al centro, tenuta: una volta per casella)
  let QT = null;
  function quota(x, z) {
    const G = G_(), R = R_(); if (!G || !G.TS || !R || !R.groundH) return 0; const tx = Math.floor(x / G.TS), ty = Math.floor(z / G.TS); if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0;
    if (!QT) { QT = new Float32Array(G.GW * G.GH); QT.fill(NaN); } const k = ty * G.GW + tx; let v = QT[k]; if (v !== v) { try { v = R.groundH((tx + .5) * G.TS, (ty + .5) * G.TS); } catch (e) { v = 0; } QT[k] = v; } return v;
  }
  // la lettura di una mesh, a fette: i triangoli verticali per piano, poi la griglia di ognuno. Ritorna la lista dei piani
  function* estraiG(m) {
    const P = posAcc(m); if (!P) return null; const PA = P.a;   // il caso comune: le posizioni lette dritte dal vettore
    const g = m.geometry, ix = g.index ? (g.index.__ix || g.index.array) : null, nT = ((ix ? ix.length : P.n) / 3) | 0, dr = g.drawRange;
    const t0 = Math.max(0, Math.floor(((dr && dr.start) || 0) / 3)), t1 = dr && dr.count !== Infinity ? Math.min(nT, t0 + Math.floor(dr.count / 3)) : nT;
    const E = m.userData && m.userData.qs ? ID16 : m.matrixWorld.elements, idM = E === ID16;
    const mats = Array.isArray(m.material) ? m.material : null, groups = mats && g.groups && g.groups.length ? g.groups : null;
    if (!mats && !matVis(m.material)) return [];
    const cl = new Map(), A1 = 2 * Math.PI / 180, NB = Math.round(2 * Math.PI / A1), DB = .03;   // la normale a 2°, la distanza a 3 cm (i vicini fusi: un muro un po' curvo; la saracinesca a 4,5 cm resta a sé)
    const w = new Float64Array(9);
    let gi = 0;
    for (let t = t0; t < t1; t++) {
      if (((t - t0) & 255) === 255) yield;
      let mt = mats ? null : m.material;
      if (groups) { while (gi < groups.length && t * 3 >= groups[gi].start + groups[gi].count) gi++; const gg = groups[gi] || groups[groups.length - 1]; mt = mats[gg.materialIndex]; if (!matVis(mt)) continue; }
      for (let q = 0; q < 3; q++) { const i = ix ? ix[t * 3 + q] : t * 3 + q; let x, y, z; if (PA) { x = PA[i * 3]; y = PA[i * 3 + 1]; z = PA[i * 3 + 2]; } else { x = vx(P, i, 0); y = vx(P, i, 1); z = vx(P, i, 2); }
        if (idM) { w[q * 3] = x; w[q * 3 + 1] = y; w[q * 3 + 2] = z; }
        else { w[q * 3] = E[0] * x + E[4] * y + E[8] * z + E[12]; w[q * 3 + 1] = E[1] * x + E[5] * y + E[9] * z + E[13]; w[q * 3 + 2] = E[2] * x + E[6] * y + E[10] * z + E[14]; } }
      { const yn = Math.min(w[1], w[4], w[7]), yx = Math.max(w[1], w[4], w[7]), e = quota((w[0] + w[3] + w[6]) / 3, (w[2] + w[5] + w[8]) / 3); if (yn > e + K.sopra || yx < e - K.sotto) continue; }   // la fascia della mano
      const e1x = w[3] - w[0], e1y = w[4] - w[1], e1z = w[5] - w[2], e2x = w[6] - w[0], e2y = w[7] - w[1], e2z = w[8] - w[2];
      let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; const l = Math.sqrt(nx * nx + ny * ny + nz * nz); if (l < 2e-4) continue;
      nx /= l; ny /= l; nz /= l; if (Math.abs(ny) > .17) continue;   // solo le facce verticali (entro 10°)
      const h = Math.hypot(nx, nz); nx /= h; nz /= h;
      let ab = Math.round(Math.atan2(nz, nx) / A1); if (ab < 0) ab += NB; if (ab >= NB) ab -= NB;
      const d = nx * w[0] + nz * w[2], db = Math.round(d / DB), key = ab * 1e6 + (db + 500000);
      let c = cl.get(key); if (!c) { c = { ab, db, tris: new Int32Array(16), n: 0, nx: 0, nz: 0, a: 0, d: 0, p: null, mt }; cl.set(key, c); }
      if (c.n === c.tris.length) { const q = new Int32Array(c.n * 2); q.set(c.tris); c.tris = q; } c.tris[c.n++] = t; const ar = l / 2; c.nx += nx * ar; c.nz += nz * ar; c.d += d * ar; c.a += ar;
    }
    // i vicini (1,5° e 3 cm più in là) sono lo stesso piano
    const par = c => { while (c.p) c = c.p; return c; };
    cl.forEach(c => { for (let da = -1; da <= 1; da++) for (let dd = -1; dd <= 1; dd++) { if (!da && !dd) continue; let ab = c.ab + da; if (ab < 0) ab += NB; if (ab >= NB) ab -= NB; const o = cl.get(ab * 1e6 + (c.db + dd + 500000)); if (!o) continue; const a = par(c), b = par(o); if (a !== b) b.p = a; } });
    const grp = new Map(); cl.forEach(c => { const r = par(c); let L = grp.get(r); if (!L) grp.set(r, L = []); L.push(c); });
    const out = [];
    for (const L of grp.values()) {
      let ar = 0, sx = 0, sz = 0, sd = 0; for (const c of L) { ar += c.a; sx += c.nx; sz += c.nz; sd += c.d; } if (ar < K.minArea) continue;
      const hn = Math.hypot(sx, sz); if (hn < 1e-6) continue; const nx = sx / hn, nz = sz / hn, d = sd / ar, rx = nz, rz = -nx;   // r: a destra guardando il muro
      // le misure sul piano
      let u0 = Infinity, u1 = -Infinity, y0 = Infinity, y1 = -Infinity, nTri = 0;
      const o6 = new Float64Array(6);
      const tri = t => { for (let q = 0; q < 3; q++) { const i = ix ? ix[t * 3 + q] : t * 3 + q; let x, y, z; if (PA) { x = PA[i * 3]; y = PA[i * 3 + 1]; z = PA[i * 3 + 2]; } else { x = vx(P, i, 0); y = vx(P, i, 1); z = vx(P, i, 2); } let X = x, Y = y, Z = z; if (!idM) { X = E[0] * x + E[4] * y + E[8] * z + E[12]; Y = E[1] * x + E[5] * y + E[9] * z + E[13]; Z = E[2] * x + E[6] * y + E[10] * z + E[14]; } o6[q * 2] = rx * X + rz * Z; o6[q * 2 + 1] = Y; } };
      for (const c of L) for (let q2 = 0; q2 < c.n; q2++) { const t = c.tris[q2]; tri(t); for (let q = 0; q < 3; q++) { const u = o6[q * 2], y = o6[q * 2 + 1]; if (u < u0) u0 = u; if (u > u1) u1 = u; if (y < y0) y0 = y; if (y > y1) y1 = y; } if ((++nTri & 255) === 255) yield; }
      const cs = K.cella; u0 = Math.floor(u0 / cs) * cs; y0 = Math.floor(y0 / cs) * cs;   // la griglia del piano sta sul reticolo del mondo: i pezzi dello stesso piano (mesh diverse) hanno le stesse celle
      const yTop = Math.min(y1, y0 + K.banda), W = Math.min(480, Math.max(1, Math.ceil((u1 - u0) / cs))), H = Math.max(1, Math.ceil((yTop - y0) / cs));
      const cov = new Uint8Array(W * H);
      for (const c of L) for (let q2 = 0; q2 < c.n; q2++) { const t = c.tris[q2];
        if ((++nTri & 255) === 255) yield;
        tri(t);
        const ax = (o6[0] - u0) / cs, ay = (o6[1] - y0) / cs, bx = (o6[2] - u0) / cs, by = (o6[3] - y0) / cs, cx = (o6[4] - u0) / cs, cy = (o6[5] - y0) / cs;
        const i0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), i1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx))), j0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), j1 = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
        if (i1 < i0 || j1 < j0) continue;
        const s = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (Math.abs(s) < 1e-9) continue;
        let hit = false;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const px = i + .5, py = j + .5;   // il centro della cella dentro il triangolo
          const w0 = ((bx - px) * (cy - py) - (cx - px) * (by - py)) / s, w1 = ((cx - px) * (ay - py) - (ax - px) * (cy - py)) / s, w2 = 1 - w0 - w1;
          if (w0 >= -1e-6 && w1 >= -1e-6 && w2 >= -1e-6) { cov[j * W + i] = 1; hit = true; } }
        if (!hit) { const i = Math.floor((ax + bx + cx) / 3), j = Math.floor((ay + by + cy) / 3); if (i >= 0 && j >= 0 && i < W && j < H) cov[j * W + i] = 1; }   // i triangoli più piccoli di una cella
      }
      let mt = null, amx = 0; for (const c of L) if (c.a > amx) { amx = c.a; mt = c.mt; }   // il materiale che copre di più (la sua trasparenza si guarda dal vivo)
      if (W < 3 || H < 2) continue;   // più stretto di 75 cm o più basso di 50: niente
      out.push({ id: ++PID, m, mt, nx, nz, rx, rz, d, u0, y0, W, H, cov, sat: null, kind: null, area: ar, top: yTop, ymax: y1 });
    }
    return out;
  }
  // la tabella delle somme (le celle buone: coperte e fuori dalle aperture) e il tipo di superficie
  function finisci(pz) {
    const W = pz.W, H = pz.H, S = (W + 1) * (H + 1) < 65536 ? new Uint16Array((W + 1) * (H + 1)) : new Uint32Array((W + 1) * (H + 1));
    for (let j = 0; j < H; j++) { let row = 0; for (let i = 0; i < W; i++) { row += pz.cov[j * W + i] === 1 ? 1 : 0; S[(j + 1) * (W + 1) + i + 1] = S[j * (W + 1) + i + 1] + row; } }
    pz.sat = S; ST.celle += W * H; ST.byte += S.byteLength;
    let run = 0, col = 0; for (let j = 0; j < H; j++) { let r = 0; for (let i = 0; i < W; i++) { if (pz.cov[j * W + i] === 1) { if (++r > run) run = r; } else r = 0; } }
    for (let i = 0; i < W; i++) { let r = 0; for (let j = 0; j < H; j++) { if (pz.cov[j * W + i] === 1) { if (++r > col) col = r; } else r = 0; } }
    pz.run = run; pz.col = col;   // la corsa più lunga di celle buone in riga e in colonna: un riquadro più largo o più alto non ci sta
  }
  const somma = (pz, i, j, w, h) => { const S = pz.sat, W1 = pz.W + 1; return S[(j + h) * W1 + i + w] - S[j * W1 + i + w] - S[(j + h) * W1 + i] + S[j * W1 + i]; };
  // le aperture vere (finestre, porte, vetrine, insegne) sul piano della facciata; una saracinesca è il piano 2-12 cm davanti a una vetrina
  function aperture(pz) {
    const R = R_(); let L = []; const cu = pz.u0 + pz.W * K.cella / 2, cx = pz.nx * pz.d + pz.rx * cu, cz = pz.nz * pz.d + pz.rz * cu;
    try { L = R && R.aperture ? R.aperture(cx, cz, pz.W * K.cella / 2 + 4) : []; } catch (e) { L = []; }
    let sar = 0, fac = false;
    for (const a of L) {
      if (a.nx * pz.nx + a.nz * pz.nz < .9) continue; const dd = pz.d - (pz.nx * a.x + pz.nz * a.z); if (dd < -.04 || dd > .14) continue;
      const ua = pz.rx * a.x + pz.rz * a.z, ext = a.hw;
      const i0 = Math.max(0, Math.floor((ua - ext - .08 - pz.u0) / K.cella)), i1 = Math.min(pz.W - 1, Math.floor((ua + ext + .08 - pz.u0) / K.cella)), j0 = Math.max(0, Math.floor((a.y0 - .05 - pz.y0) / K.cella)), j1 = Math.min(pz.H - 1, Math.floor((a.y1 + .05 - pz.y0) / K.cella));
      if (i1 < i0 || j1 < j0) continue;
      if (dd > .025 && a.tipo !== 'insegna') {   // un piano poco davanti alla vetrina che la copre: la saracinesca abbassata (si dipinge)
        let c = 0, n = 0; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { n++; if (pz.cov[j * pz.W + i]) c++; } if (n && c / n > .5) sar++; continue; }
      fac = true; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) pz.cov[j * pz.W + i] = 2;   // sul muro: il vano non si dipinge
    }
    return { sar, fac };
  }
  function tipo(pz, ap) {
    const m = pz.m, ud = (m && m.userData) || {}, nm = ((m && m.name) || '') + ' ' + (ud.rc || '');
    if (/saracinesc|serrand/i.test(nm) || (ap && ap.sar && !ap.fac)) return 'saracinesca';
    const G = G_(), cu = pz.u0 + pz.W * K.cella / 2, x = pz.nx * (pz.d - .4) + pz.rx * cu, z = pz.nz * (pz.d - .4) + pz.rz * cu;
    if (G && G.bIndex && G.TS) { const tx = Math.floor(x / G.TS), ty = Math.floor(z / G.TS), bi = tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH ? G.bIndex[ty * G.GW + tx] : -1, b = bi >= 0 && G.BUILDINGS ? G.BUILDINGS[bi] : null;
      if (b) return b.kiosk ? 'chiosco' : 'facciata'; }
    const alto = pz.ymax - pz.y0; if (alto <= 1.7) return 'muretto'; if (pz.area < 6) return 'oggetto'; return 'muro';
  }
  function indicizza(pz) {
    const c = K.cellaMondo, x0 = pz.nx * pz.d + pz.rx * pz.u0, z0 = pz.nz * pz.d + pz.rz * pz.u0, L = pz.W * K.cella, n = Math.max(1, Math.ceil(L / (c / 2))), seen = new Set();
    for (let k = 0; k <= n; k++) { const x = x0 + pz.rx * L * k / n, z = z0 + pz.rz * L * k / n, key = ckey(Math.floor(x / c), Math.floor(z / c)); if (seen.has(key)) continue; seen.add(key); let A = IDX.get(key); if (!A) IDX.set(key, A = []); A.push(pz); }
    pz.celle = [...seen]; ST.piani++;
  }
  // un piano fatto di più mesh è vivo se lo sono tutte; se una se ne va, le altre si rileggono
  const vivoP = pz => { if (!pz.ms) return viva(pz.m); for (const m of pz.ms) if (!viva(m)) return false; return true; };
  function togli(pz) { if (pz.morto) return; pz.morto = true; if (!pz.celle) return; if (pz.sat) ST.byte -= pz.sat.byteLength; ST.piani--; for (const key of pz.celle || []) { const A = IDX.get(key); if (!A) continue; const i = A.indexOf(pz); if (i >= 0) A.splice(i, 1); if (!A.length) IDX.delete(key); } }
  // la mesh è ancora in scena (e visibile)? una volta per interrogazione
  let QS = 0;
  function viva(m) { if (m.__selQ === QS) return m.__selV; let o = m, v = true; for (let i = 0; i < 40 && o; i++) { if (o.visible === false) { v = false; break; } if (!o.parent) { v = !!o.isScene; break; } o = o.parent; } m.__selQ = QS; m.__selV = v; return v; }
  // ---- la coda della lettura: le mesh ferme vicino al giocatore, la più vicina prima ----
  const CODA = { L: [], i: 0, t: 0, cx: 1e9, cz: 1e9, it: null, m: null, veh: null, vehT: 0 };
  function mezzi() { const R = R_(), t = now(); if (CODA.veh && t - CODA.vehT < 500) return CODA.veh; const S = new Set(); const V = R && R.__vehicles; if (V) for (const k in V) if (V[k]) S.add(V[k]); try { const tr = WR() && WR().GFX && WR().GFX.train; if (tr && tr.grp) S.add(tr.grp); } catch (e) { } CODA.veh = S; CODA.vehT = t; return S; }
  function diMezzo(o, S) { if (o.__selVeh !== undefined) return o.__selVeh; let q = o, r = false; for (let i = 0; i < 10 && q; i++) { if (S.has(q)) { r = true; break; } q = q.parent; } o.__selVeh = r; return r; }
  function stampOf(m) { if (m.userData && m.userData.qs) return 'qs'; const e = m.matrixWorld.elements; return e[12].toFixed(2) + ',' + e[13].toFixed(2) + ',' + e[14].toFixed(2) + ',' + e[0].toFixed(3) + ',' + e[2].toFixed(3); }
  function coda(px, pz) {
    const R = R_(); if (!R || !R.__bmb || !R.__bmb.bmbCands) return; const t = now();
    if (t - CODA.t < 700 && hyp(px - CODA.cx, pz - CODA.cz) < 3) return; CODA.t = t; CODA.cx = px; CODA.cz = pz;
    let L = []; try { L = R.__bmb.bmbCands(Math.round(px), Math.round(pz)); } catch (e) { L = []; }
    const S = mezzi(), out = [];
    for (const o of L) { if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) continue; const u = o.userData || {}; if (u.velo || u.wr || u.atlante || u.ghost5 || u.vievive === 'gente') continue; if (o.isPoints || o.isLine) continue;
      if (diMezzo(o, S)) continue;
      const rec = PM && PM.get(o); if (rec && (rec.stamp === stampOf(o) || rec.pending)) { if (!rec.manca || t - rec.manca < 600) continue; }
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); const bs = g.boundingSphere; if (!bs) continue;
      const e = (u.qs ? null : o.matrixWorld.elements), cx = e ? e[0] * bs.center.x + e[4] * bs.center.y + e[8] * bs.center.z + e[12] : bs.center.x, cz = e ? e[2] * bs.center.x + e[6] * bs.center.y + e[10] * bs.center.z + e[14] : bs.center.z;
      const dd = Math.max(0, hyp(cx - px, cz - pz) - bs.radius); if (dd > K.raggio + 4) continue; out.push([dd, o]); }
    out.sort((a, b) => a[0] - b[0]); CODA.L = out.map(a => a[1]); CODA.i = 0;
  }
  // la lettura, a fette: al più ms millisecondi
  function lavora(ms) {
    if (!PM) return 0; const t0 = now(); let fatte = 0;
    while (now() - t0 < ms) {
      if (!CODA.it) {
        let m = null; while (CODA.i < CODA.L.length && !m) { const o = CODA.L[CODA.i++]; const rec = PM.get(o); if (rec && rec.stamp === stampOf(o) && !rec.manca) continue; if (rec && rec.patches) rec.patches.forEach(togli); m = o; }
        if (!m) break;
        if (!posAcc(m)) {   // un tassello leggero senza i dati dei raggi: un raggio li chiede (rayTas), si riprova dopo
          PM.set(m, { stamp: stampOf(m), patches: [], manca: now() }); ST.attese++;
          try { const THREE = T3(), g = m.geometry; if (THREE && m.raycast !== THREE.Mesh.prototype.raycast) { const rc = CODA.rc || (CODA.rc = new THREE.Raycaster()); const c = g.boundingSphere.center.clone().applyMatrix4(m.userData.qs ? new THREE.Matrix4() : m.matrixWorld), p = PV().st.player; rc.set(new THREE.Vector3(p.x, c.y, p.y), new THREE.Vector3(c.x - p.x, 0, c.z - p.y).normalize()); rc.near = 0; rc.far = 30; m.raycast(rc, []); } } catch (e) { }
          continue; }
        CODA.m = m; CODA.it = estraiG(m); PM.set(m, { stamp: stampOf(m), patches: null, pending: true });
      }
      let r; try { r = CODA.it.next(); } catch (e) { r = { done: true, value: [] }; if (typeof console !== 'undefined') console.warn('[Seleziona] lettura', e); }
      if (!r.done) continue;
      const m = CODA.m, L = r.value || []; CODA.it = null; CODA.m = null;
      for (const pz of L) { const ap = aperture(pz); finisci(pz); pz.kind = tipo(pz, ap); pz.cov = null; indicizza(pz); }   // dopo la tabella delle somme la griglia non serve più
      PM.set(m, { stamp: stampOf(m), patches: L }); ST.estratte++; fatte++;
      try { const g = m.geometry; ST.triangoli += ((g.index ? g.index.count : g.attributes.position.count) / 3) | 0; } catch (e) { }
    }
    ST.msEstr += now() - t0; return fatte;
  }
  const inCoda = () => !!CODA.it || CODA.i < CODA.L.length;
  // la pulizia (ogni 2 s): i piani delle mesh uscite di scena (i tasselli lontani si buttano) lasciano l'indice
  let PUL = 0;
  function pulisci(px, pz) {
    const t = now(); if (t - PUL < 2000) return; PUL = t; QS++; const c = K.cellaMondo;
    // oltre 60 m i piani delle mesh uscite di scena; oltre 90 m tutti (la memoria resta quella dei dintorni: tornando si rileggono)
    IDX.forEach((A, key) => { const ix = Math.floor(key / 65536) - 32768, iz = (key % 65536) - 32768, d = hyp((ix + .5) * c - px, (iz + .5) * c - pz); if (d < 60) return;
      for (let i = A.length - 1; i >= 0; i--) { const pz2 = A[i]; if (!pz2.morto && (d > 90 || !vivoP(pz2))) { togli(pz2); VIA.add(pz2.m); } } });
    VIA.forEach(m => { const rec = PM && PM.get(m); if (rec) { if (rec.patches) rec.patches.forEach(togli); PM.delete(m); } }); VIA.clear();   // la mesh intera: tornando si rilegge da capo
  }
  const VIA = new Set();

  // ---------------- 2. LA SCELTA ----------------
  // i candidati: oggetti tenuti (niente allocazioni a ogni interrogazione)
  const CAND = []; for (let i = 0; i < 40; i++) CAND.push({ k: '', kind: '', pz: null, veh: null, v: null, nx: 0, ny: 0, nz: 0, rx: 0, rz: 0, ux: 0, uy: 1, uz: 0, cx: 0, cy: 0, cz: 0, W: 0, H: 0, W0: 0, H0: 0, size: '', giu: null, sc: 0, d: 0, ang: 0, sx: 0, flat: false, side: 0, lu: 0, lv: 0 });
  let NC = 0;
  const FIT = { i: 0, j: 0, W: 0, H: 0, giu: null, k: 1 };
  const ORD_I = [0]; for (let i = 1; i <= Math.ceil(K.lato / K.cella); i++) ORD_I.push(i, -i);
  const ORD_J = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
  // il riquadro più vicino al punto davanti a te (u, sui piedi feet) della misura W×H (o stretta, o più piccola): FIT, o false
  // le misure da provare per ogni misura chiesta, in celle, dalla più grande: la misura, stretta (×.85 ×.7), poi le più piccole (e la tag
  // stretta fino a ×.42: 63 × 32 cm, su un palo o un muretto basso). Una misura per celle (niente doppioni)
  const DIMS = {};
  for (let k0 = 0; k0 < MIS_K.length; k0++) { const L = [], seen = new Set();
    for (let kk = k0; kk >= 0; kk--) for (const s of (kk === k0 ? SCALE : kk === 0 ? [1, .85, .7, .55, .42] : [1, .85])) { const [W0, H0] = MISURE[MIS_K[kk]], W = W0 * s, H = H0 * s, wi = Math.ceil(W / K.cella - 1e-6), hj = Math.ceil(H / K.cella - 1e-6), key = wi * 1000 + hj; if (seen.has(key)) continue; seen.add(key); L.push({ W, H, wi, hj, giu: kk < k0 ? MIS_K[kk] : null, s }); }
    DIMS[MIS_K[k0]] = L; }
  // il riquadro più vicino al punto davanti a te (u, sui piedi feet) della misura chiesta (o stretta, o più piccola): FIT, o false.
  // Prima i tagli che costano niente: la corsa più lunga del piano (in riga e in colonna) e le celle buone nella finestra attorno a te
  let VED = null, VEDN = 0;   // la prova della vista per i riquadri che entrano (coperto), al più 8 per piano
  function adatta(pz, up, feet, size, ved) {
    const cs = K.cella, yLo = Math.max(feet + K.piede, pz.y0), yHi = Math.min(feet + K.mano, pz.y0 + pz.H * cs); if (yHi - yLo < .3) return false;
    const jA = Math.max(0, Math.ceil((yLo - pz.y0) / cs - 1e-6)), jB = Math.min(pz.H, Math.floor((yHi - pz.y0) / cs + 1e-6)); if (jB - jA < 2) return false;
    const iU = Math.round((up - pz.u0) / cs), nI = ORD_I.length >> 1;
    for (const D of DIMS[size]) {
      const wi = D.wi, hj = D.hj; if (wi > pz.run || hj > pz.col || hj > jB - jA) continue;
      const iA = Math.max(0, iU - (wi >> 1) - nI), iB = Math.min(pz.W, iU + wi - (wi >> 1) + nI), need = wi * hj; if (iB - iA < wi) continue;
      if (somma(pz, iA, jA, iB - iA, jB - jA) < need) continue;   // nella finestra non ci sono abbastanza celle buone
      const jMin = jA, jMax = jB - hj, H = D.H, jP = clamp(Math.round((clamp(feet + K.occhio, yLo + H / 2, yHi - H / 2) - H / 2 - pz.y0) / cs), jMin, jMax), iP = iU - (wi >> 1);
      for (const di of ORD_I) { const i = iP + di; if (i < 0 || i + wi > pz.W) continue;
        for (const dj of ORD_J) { const j = jP + dj; if (j < jMin || j > jMax) continue;
          if (somma(pz, i, j, wi, hj) === need) { if (ved && !ved(i, j, D)) { if (++VEDN > 6) return false; continue; } FIT.i = i; FIT.j = j; FIT.W = D.W; FIT.H = D.H; FIT.giu = D.giu; FIT.k = D.s; return true; } } }
    }
    return false;
  }
  // un altro piano copre il riquadro? il segmento dal petto al centro contro i piani vicini (le loro celle coperte)
  let CQ = 0; const SEGK = [0, 0, 0, 0, 0, 0];
  function coperto(ox, oy, oz, cx, cy, cz, self) {
    const dx = cx - ox, dy = cy - oy, dz = cz - oz, cq = ++CQ, x0 = Math.min(ox, cx) - .05, x1 = Math.max(ox, cx) + .05, z0 = Math.min(oz, cz) - .05, z1 = Math.max(oz, cz) + .05, c = K.cellaMondo;
    // solo le celle dell'indice che il segmento attraversa (al più 6)
    let nk = 0; const L = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(L / (c * .5)));
    for (let k = 0; k <= n && nk < 6; k++) { const key = ckey(Math.floor((ox + dx * k / n) / c), Math.floor((oz + dz * k / n) / c)); let dup = false; for (let q = 0; q < nk; q++) if (SEGK[q] === key) { dup = true; break; } if (!dup) SEGK[nk++] = key; }
    for (let kk = 0; kk < nk; kk++) { const A = IDX.get(SEGK[kk]); if (!A) continue;
      for (const pz of A) { if (pz === self || pz.morto || pz.__cq === cq) continue; pz.__cq = cq;   // un piano in più celle: una prova sola
        if (self && self.m && self.nx * pz.nx + self.nz * pz.nz > .999 && Math.abs(self.d - pz.d) < .025) continue;   // lo stesso piano (un altro pezzo della stessa facciata) non copre
        if (pz.__oq !== QS) { pz.__oq = QS; pz.__s0 = pz.nx * ox + pz.nz * oz - pz.d; } const s0 = pz.__s0, s1 = pz.nx * cx + pz.nz * cz - pz.d; if ((s0 > 0) === (s1 > 0)) continue;   // tutti e due dalla stessa parte del piano: non lo attraversa (dal petto: lo stesso punto per tutta l'interrogazione)
        const den = pz.nx * dx + pz.nz * dz; if (Math.abs(den) < 1e-6) continue; const t = -s0 / den; if (t <= .04 || t >= .96) continue;
        const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t; if (x < x0 || x > x1 || z < z0 || z > z1) continue; const i = Math.floor((pz.rx * x + pz.rz * z - pz.u0) / K.cella), j = Math.floor((y - pz.y0) / K.cella);
        if (i < 0 || j < 0 || i >= pz.W || j >= pz.H) continue; if (somma(pz, i, j, 1, 1)) { if (!vivoP(pz)) continue; return true; } } }
    return false;
  }
  function feetOf(st) { const p = st.player; try { if (typeof Tetti !== 'undefined' && Tetti.feetH) return Tetti.feetH(st); } catch (e) { } const R = R_(); try { return R && R.groundH ? R.groundH(p.x, p.y) : 0; } catch (e) { return 0; } }
  const CELLS = [];
  function camDir() { try { const cam = R_().getCamera(), e = cam.matrixWorld.elements, x = -e[8], z = -e[10], l = hyp(x, z); return l > 1e-4 ? Math.atan2(z / l, x / l) : null; } catch (e) { return null; } }
  const angD = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  function nuovo() { if (NC >= CAND.length) return null; const c = CAND[NC++]; c.veh = null; c.v = null; c.pz = null; c.giu = null; c.flat = false; c.side = 0; return c; }
  function punteggio(c, p, fa, ca) {
    const dx = c.cx - p.x, dz = c.cz - p.y, d = hyp(dx, dz), a = Math.atan2(dz, dx), an = Math.min(angD(a, fa), ca == null ? 9 : angD(a, ca) + .15);
    c.d = d; c.ang = an; const fit = (c.W * c.H) / Math.max(1e-6, c.W0 * c.H0);
    c.sc = d * .55 + an * 2.1 + (1 - fit) * 2.4 + (PEN[c.kind] || 0);
  }
  const VBOX = new WeakMap(), SDS = [1, -1, 0];
  // l'altezza del modello del mezzo (una volta per modello): la carrozzeria, non i fari, i vetri, le scie, i coni di luce
  function scatola(g) {
    let B = VBOX.get(g); if (B) return B; const THREE = T3(); if (!THREE) return null;
    g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), M = new THREE.Matrix4(), bb = new THREE.Box3(), b2 = new THREE.Box3(), e = g.matrixWorld.elements;
    g.traverse(o => { if (!o.isMesh || !o.geometry || (o.userData && o.userData.velo) || o.visible === false) return; const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (!mt || mt.transparent || mt.isMeshBasicMaterial || mt.depthWrite === false) return;
      const gg = o.geometry; if (!gg.boundingBox) gg.computeBoundingBox(); if (!gg.boundingBox) return; M.multiplyMatrices(inv, o.matrixWorld); b2.copy(gg.boundingBox).applyMatrix4(M); bb.union(b2); });
    if (bb.isEmpty()) return null; const sy = hyp(e[4], e[5], e[6]), sx = hyp(e[0], e[1], e[2]), sz = hyp(e[8], e[9], e[10]), ex = (bb.max.x - bb.min.x) * sx, ez = (bb.max.z - bb.min.z) * sz;
    B = { h: (bb.max.y - bb.min.y) * sy, y0: e[13] + bb.min.y * sy, len: Math.max(ex, ez), wid: Math.min(ex, ez) }; VBOX.set(g, B); return B;
  }
  // la finestra di un piano attorno al punto davanti a te: le celle buone di tutti i suoi pezzi (le tabelle delle somme, una cella alla volta),
  // u da up - 3 - 3,3 a up + 3 + 3,3 (il burner largo 6,6 spostato di 3 m), y nella fascia della mano; la sua tabella delle somme. In WIN
  const GR = [], WMAX = Math.ceil((2 * K.lato + 6.6) / K.cella) + 2, HMAX = Math.ceil((K.mano - K.piede) / K.cella) + 1;
  const WIN = { u0: 0, y0: 0, W: 0, H: 0, cov: new Uint8Array(WMAX * HMAX), sat: new Uint16Array((WMAX + 1) * (HMAX + 1)), run: 0, col: 0, uP: 0 };
  function finestra(g, ox, oz, feet) {
    const cs = K.cella, up = g.rx * ox + g.rz * oz; let lo = Infinity, hi = -Infinity, yl = Infinity, yh = -Infinity;
    for (let q = 0; q < g.n; q++) { const m = g.m[q], a = m.rx * (g.nx * g.d + g.rx * up) + m.rz * (g.nz * g.d + g.rz * up) - up, u0 = m.u0 - a, u1 = u0 + m.W * cs; if (u0 < lo) lo = u0; if (u1 > hi) hi = u1; if (m.y0 < yl) yl = m.y0; if (m.y0 + m.H * cs > yh) yh = m.y0 + m.H * cs; }
    g.yl = yl; let ymx = -Infinity; for (let q = 0; q < g.n; q++) if (g.m[q].ymax > ymx) ymx = g.m[q].ymax; g.yh = ymx;
    const half = K.lato + 3.4, wa = Math.ceil(Math.max(lo, up - half) / cs - 1e-6) * cs, wb = Math.min(hi, up + half), ya = Math.ceil(Math.max(yl, feet + K.piede) / cs - 1e-6) * cs, yb = Math.min(yh, feet + K.mano);   // sul reticolo dei pezzi
    if (wb - wa < .6 || yb - ya < .3) return false;
    const W = Math.min(WMAX, Math.floor((wb - wa) / cs)), H = Math.min(HMAX, Math.floor((yb - ya) / cs + 1e-6)); if (W < 3 || H < 2) return false;
    WIN.u0 = wa; WIN.y0 = ya; WIN.W = W; WIN.H = H; WIN.uP = clamp(up, wa, wa + W * cs); const cov = WIN.cov; cov.fill(0, 0, W * H);
    for (let q = 0; q < g.n; q++) { const m = g.m[q];
      // il pezzo nel sistema del piano: la sua u (lo stesso verso entro 2,5°) e le sue righe
      const du = m.rx * (g.nx * g.d + g.rx * wa) + m.rz * (g.nz * g.d + g.rz * wa) - m.u0, kr = m.rx * g.rx + m.rz * g.rz;
      // solo le celle della finestra sopra il pezzo (un pilastro: tre colonne, non tutta la finestra)
      const iA = Math.max(0, Math.floor(-du / (cs * kr)) - 1), iB = Math.min(W - 1, Math.ceil((m.W * cs - du) / (cs * kr)) + 1), jA = Math.max(0, Math.floor((m.y0 - ya) / cs) - 1), jB = Math.min(H - 1, Math.ceil((m.y0 + m.H * cs - ya) / cs) + 1);
      for (let j = jA; j <= jB; j++) { const jm = Math.floor((ya + (j + .5) * cs - m.y0) / cs); if (jm < 0 || jm >= m.H) continue;
        for (let i = iA; i <= iB; i++) { if (cov[j * W + i]) continue; const im = Math.floor((du + (i + .5) * cs * kr) / cs); if (im < 0 || im >= m.W) continue; if (somma(m, im, jm, 1, 1)) cov[j * W + i] = 1; } } }
    const S = WIN.sat, W1 = W + 1; let run = 0, col = 0;
    for (let i = 0; i <= W; i++) S[i] = 0;
    for (let j = 0; j < H; j++) { let row = 0, r = 0; S[(j + 1) * W1] = 0; for (let i = 0; i < W; i++) { const v = cov[j * W + i]; row += v; S[(j + 1) * W1 + i + 1] = S[j * W1 + i + 1] + row; if (v) { if (++r > run) run = r; } else r = 0; } }
    for (let i = 0; i < W; i++) { let r = 0; for (let j = 0; j < H; j++) { if (cov[j * W + i]) { if (++r > col) col = r; } else r = 0; } }
    WIN.run = run; WIN.col = col; return run >= 3 && col >= 2;
  }
  // si vede? il centro e il piede del riquadro (i, j, D della finestra) dal petto: un muretto o un cassonetto davanti copre il piede
  const VG0 = { g: null, ox: 0, oy: 0, oz: 0 };
  function vedi(i, j, D) {
    const g = VG0.g; if (g.nx * VG0.ox + g.nz * VG0.oz - g.d < 1.2) return true;   // a un passo dal muro: niente sta in mezzo
    const cs = K.cella, uc = WIN.u0 + i * cs + D.wi * cs / 2, yc = WIN.y0 + j * cs + D.hj * cs / 2, cx = g.nx * (g.d + .03) + g.rx * uc, cz = g.nz * (g.d + .03) + g.rz * uc, hw = D.W / 2 - .1, yb = yc - D.H / 2 + .08;
    return !(coperto(VG0.ox, VG0.oy, VG0.oz, cx, yc, cz, g) || coperto(VG0.ox, VG0.oy, VG0.oz, cx, yb, cz, g));
  }
  function cerca(st, size, pref) {
    const t0 = now(); QS++; NC = 0; ST.q++;
    const p = st.player, R = R_(), G = G_(), THREE = T3(); if (!R || !THREE) return 0;
    const feet = feetOf(st), fa = p.face || 0, ca = camDir(), ox = p.x, oz = p.y, oy = feet + 1.3;
    // ---- i piani dell'indice attorno a te, per piano: lo stesso piano da mesh e pezzi diversi (la facciata fatta a pilastri, i tasselli
    // vicini) si guarda insieme, in una finestra attorno al punto davanti a te (al più 64 × 12 celle, fatta qui: niente fusioni nell'indice)
    const c = K.cellaMondo, ix = Math.floor(ox / c), iz = Math.floor(oz / c), rr = Math.ceil((K.raggio + 1) / c); CELLS.length = 0;
    for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) CELLS.push(ckey(ix + a, iz + b));
    const sc = ST.scartati; for (const k in sc) sc[k] = 0;
    let nG = 0;
    for (const key of CELLS) { const A = IDX.get(key); if (!A) continue;
      for (let q = 0; q < A.length; q++) { const pz = A[q]; if (pz.__qs === QS || pz.morto) continue; pz.__qs = QS;
        const dist = pz.nx * ox + pz.nz * oz - pz.d; if (dist < .2 || dist > K.raggio) continue;   // davanti, e vicino
        const up = pz.rx * ox + pz.rz * oz, uEnd = pz.u0 + pz.W * K.cella; if (up < pz.u0 - K.lato - 3.3 || up > uEnd + K.lato + 3.3) continue;
        if (pz.y0 > feet + K.mano - .3 || pz.y0 + pz.H * K.cella < feet + K.piede + .3) continue;   // fuori dalla fascia della mano
        { const uq = clamp(up, pz.u0, uEnd), qx = pz.nx * pz.d + pz.rx * uq - ox, qz = pz.nz * pz.d + pz.rz * uq - oz, aq = Math.atan2(qz, qx); if (angD(aq, fa) > 1.75 && (ca == null || angD(aq, ca) > 1.75)) continue; }   // alle tue spalle (oltre 100° da dove guardi tu e la camera): no
        if (!vivoP(pz) || !matOra(pz.mt)) { sc.spento = (sc.spento || 0) + 1; continue; }
        let g = null; for (let k = 0; k < nG; k++) { const G0 = GR[k]; if (G0.nx * pz.nx + G0.nz * pz.nz > .999 && Math.abs(G0.d - pz.d) < .025) { g = G0; break; } }
        if (!g) { if (nG >= GR.length) GR.push({ nx: 0, nz: 0, rx: 0, rz: 0, d: 0, m: [], n: 0, a: 0 }); g = GR[nG++]; g.nx = pz.nx; g.nz = pz.nz; g.rx = pz.rx; g.rz = pz.rz; g.d = pz.d; g.n = 0; g.a = 0; }
        g.m[g.n++] = pz; g.a += pz.area;
      } }
    for (let k = 0; k < nG && NC < CAND.length - 4; k++) { const g = GR[k];
      if (!finestra(g, ox, oz, feet)) { sc.noFit = (sc.noFit || 0) + 1; continue; }
      VG0.g = g; VG0.ox = ox; VG0.oy = oy; VG0.oz = oz; VEDN = 0;
      if (!adatta(WIN, WIN.uP, feet, size, vedi)) { sc[VEDN ? 'coperto' : 'noFit'] = (sc[VEDN ? 'coperto' : 'noFit'] || 0) + 1; continue; }
      const uc = WIN.u0 + (FIT.i * K.cella) + FIT.W / 2 + (Math.ceil(FIT.W / K.cella - 1e-6) * K.cella - FIT.W) / 2, yc = WIN.y0 + FIT.j * K.cella + FIT.H / 2 + (Math.ceil(FIT.H / K.cella - 1e-6) * K.cella - FIT.H) / 2;
      const cx = g.nx * g.d + g.rx * uc, cz = g.nz * g.d + g.rz * uc;
      // il pezzo che sta sotto il centro (la mesh per la grana del muro, il tipo); se no il più grande del piano
      let pz = null, best = -1; for (let q = 0; q < g.n; q++) { const m = g.m[q], i = Math.floor((m.rx * cx + m.rz * cz - m.u0) / K.cella), j = Math.floor((yc - m.y0) / K.cella); const sopra = i >= 0 && j >= 0 && i < m.W && j < m.H && somma(m, i, j, 1, 1) ? 1e9 : 0; if (sopra + m.area > best) { best = sopra + m.area; pz = m; } }
      const C = nuovo(); if (!C) break;
      let kind = pz.kind || 'muro'; if ((kind === 'oggetto' || kind === 'muretto') && g.a > 6 && g.yh - g.yl > 1.7) kind = 'muro';   // un pezzo di una parete grande (il pilastro fra due finestre) è la parete
      C.k = 'g' + Math.round(Math.atan2(g.nz, g.nx) * 60) + ':' + Math.round(g.d * 20) + ':' + Math.round(uc * 2) + ':' + Math.round(yc * 2); C.kind = kind; C.pz = pz; C.nx = g.nx; C.ny = 0; C.nz = g.nz; C.rx = g.rx; C.rz = g.rz; C.ux = 0; C.uy = 1; C.uz = 0;
      C.cx = cx + g.nx * .003; C.cy = yc; C.cz = cz + g.nz * .003; C.W = FIT.W - .04; C.H = FIT.H - .04; C.W0 = MISURE[size][0]; C.H0 = MISURE[size][1]; C.size = FIT.giu || size; C.giu = FIT.giu;
      punteggio(C, p, fa, ca);
    }
    // ---- i mezzi fermi: la sagoma dal gioco (lungo, largo, il verso), l'altezza dal modello ----
    const V = R.__vehicles || {}, VK = (G && G.VK) || {};
    for (const v of st.vehicles || []) {
      if (NC >= CAND.length - 3) break; if (!v || v.wreck || v.hidden || v.id === p.vehicle || v.rider === 'player') continue; const kv = VK[v.kind] || {}; if (kv.two || kv.pocket) continue;
      let len = kv.len || 4, wid = kv.wid || 1.7; const dd = hyp(v.x - ox, v.y - oz); if (dd > K.raggio + len / 2) continue;
      if (Math.abs(v.speed || 0) > .3) { sc.inMoto = (sc.inMoto || 0) + 1; continue; }
      const g = V[v.id]; if (!g || !viva(g)) { sc.senzaModello = (sc.senzaModello || 0) + 1; continue; } const B = scatola(g);
      if (B && !kv.boat && B.len > len * .7 && B.len < len * 1.4 && B.wid > wid * .7 && B.wid < wid * 1.4) { len = B.len; wid = B.wid; }   // il modello vero, se torna con la sagoma del gioco
      let gy = 0; try { gy = R.groundH(v.x, v.y); } catch (e) { } if (kv.boat && B) gy = Math.max(gy, B.y0);   // la barca: dal pelo dell'acqua (il fondo del modello sta sotto)
      const hh = clamp(B ? B.h : 1.4, .9, 3.4), yB = gy + Math.max(.25, hh * .2), yT = gy + hh * (kv.boat ? .9 : .58), band = yT - yB;   // la fascia delle portiere, sotto i vetri (la barca: la murata)
      const fx = Math.cos(v.ang || 0), fz = Math.sin(v.ang || 0), [W0, H0] = MISURE[size];
      for (const sd of SDS) {   // i due fianchi, poi il retro (la faccia corta verso di te)
        const side = sd !== 0, s2 = side ? sd : ((ox - v.x) * fx + (oz - v.y) * fz >= 0 ? 1 : -1);
        const nwx = side ? -fz * sd : fx * s2, nwz = side ? fx * sd : fz * s2, Lw = side ? len : wid, half0 = side ? wid / 2 : len / 2;
        const wx = v.x + nwx * half0, wz = v.y + nwz * half0, dist = nwx * (ox - wx) + nwz * (oz - wz); if (dist < .2 || dist > K.raggio) continue;   // la faccia che guarda te
        const Wm = Math.min(W0, Math.max(.6, Lw - .5)), Hm = Math.min(H0, band), kf = Math.min(Wm / W0, Hm / H0), W = W0 * kf, H = H0 * kf; if (W < .5 || H < .3) continue;
        const rx = nwz, rz = -nwx, along = rx * (ox - wx) + rz * (oz - wz), half = Math.max(0, Lw / 2 - W / 2 - .25), u = clamp(along, -half, half);
        const C = nuovo(); if (!C) break;
        C.k = 'v' + v.id + ':' + sd; C.kind = kv.boat ? 'barca' : 'auto'; C.veh = v.id; C.v = v; C.side = sd; C.nx = nwx; C.ny = 0; C.nz = nwz; C.rx = rx; C.rz = rz; C.ux = 0; C.uy = 1; C.uz = 0;
        C.cx = wx + rx * u + nwx * .01; C.cy = (yB + yT) / 2; C.cz = wz + rz * u + nwz * .01; C.W = W; C.H = H; C.W0 = W0; C.H0 = H0; C.size = size; C.giu = kf < .999 ? size : null; C.lu = u;
        punteggio(C, p, fa, ca); C.sc -= side ? .25 : 0; ST.mezzi++;
      }
    }
    // ---- la terra davanti ai piedi ----
    if (NC < CAND.length) {
      const [W0, H0] = MISURE[size], fx = Math.cos(fa), fz = Math.sin(fa);
      for (const s of SCALE) { const W = W0 * s, H = H0 * s, d0 = .9 + H / 2, cx = ox + fx * d0, cz = oz + fz * d0, rx = -fz, rz = fx;   // l'alto del disegno lontano da te
        let ok = true, y0 = Infinity, y1 = -Infinity;
        for (const [a, b] of [[0, 0], [-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) { const x = cx + rx * W * a + fx * H * b, z = cz + rz * W * a + fz * H * b; let y = 0; try { y = R.groundH(x, z); } catch (e) { ok = false; break; }
          if (G && G.walkT && G.TS && !G.walkT(Math.floor(x / G.TS), Math.floor(z / G.TS))) { ok = false; break; } if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (!ok || y1 - y0 > .12 || Math.abs(y0 - feet) > .6) continue;
        { const fe = feet + .35, ex = fx * (d0 + H / 2), ez = fz * (d0 + H / 2); if (coperto(ox, fe, oz, ox + ex, fe, oz + ez, null) || coperto(ox, fe, oz, ox + ex + rx * W / 2, fe, oz + ez + rz * W / 2, null) || coperto(ox, fe, oz, ox + ex - rx * W / 2, fe, oz + ez - rz * W / 2, null)) continue; }   // un muro davanti ai piedi: lì la terra non c'è
        const C = nuovo(); if (!C) break; let yc = 0; try { yc = R.groundH(cx, cz); } catch (e) { }
        C.k = 'terra:' + MIS_K.indexOf(size) + ':' + s; C.kind = 'terra'; C.flat = true; C.nx = 0; C.ny = 1; C.nz = 0; C.rx = rx; C.rz = rz; C.ux = fx; C.uy = 0; C.uz = fz;
        C.cx = cx; C.cy = yc + .01; C.cz = cz; C.W = W; C.H = H; C.W0 = W0; C.H0 = H0; C.size = size; C.giu = s < 1 ? size : null;
        punteggio(C, p, fa, ca); if (pref === 'terra') C.sc -= 3; break; }
    }
    // in ordine (sul posto: niente vettori nuovi); via i doppioni (lo stesso posto da due piani quasi uguali)
    for (let i = 1; i < NC; i++) { const C = CAND[i]; let j = i - 1; while (j >= 0 && CAND[j].sc > C.sc) { CAND[j + 1] = CAND[j]; j--; } CAND[j + 1] = C; }
    let n = 0;
    for (let i = 0; i < NC && n < K.maxC; i++) { const C = CAND[i]; let dup = false; for (let q = 0; q < n; q++) { const o = CAND[q]; if (hyp(o.cx - C.cx, o.cy - C.cy, o.cz - C.cz) < .5 && o.nx * C.nx + o.nz * C.nz + o.ny * C.ny > .9) { dup = true; break; } } if (dup) continue; CAND[i] = CAND[n]; CAND[n] = C; n++; }
    NC = n; ST.nC = n;
    const ms = now() - t0; ST.ultimo = ms; ST.ms.push(ms); if (ST.ms.length > 200) ST.ms.shift(); if (ms > ST.msMax) ST.msMax = ms;
    return n;
  }

  // ---------------- 3. LA SCELTA DEL GIOCATORE E LA CORNICE ----------------
  const SEL = { i: 0, k: '', manual: false, px: 0, py: 0, t: 0, fa: 0, ca: 0, size: '', pref: '', H: null, hk: '', presa: false, giuT: 0, lev: { x: 0, y: 0, dir: '' }, nota: '', vis: false, ord: [] };
  function selezionato() { return NC && SEL.i >= 0 && SEL.i < NC ? CAND[SEL.i] : null; }
  // l'ordine sullo schermo (da sinistra a destra) per ◄ ►
  function ordine() {
    SEL.ord.length = 0; let cam = null; try { cam = R_().getCamera(); } catch (e) { } const THREE = T3(); if (!cam || !THREE) { for (let i = 0; i < NC; i++) SEL.ord.push(i); return; }
    const v = SEL.v3 || (SEL.v3 = new THREE.Vector3());
    for (let i = 0; i < NC; i++) { const C = CAND[i]; v.set(C.cx, C.cy, C.cz).project(cam); C.sx = v.z > 1 ? (v.x > 0 ? 9 : -9) : v.x; SEL.ord.push(i); }
    SEL.ord.sort((a, b) => CAND[a].sx - CAND[b].sx);
  }
  function passo(dir) {
    const W = WR(), st = PV() && PV().st; if (!st) return false;
    if (dir === 'su' || dir === 'giu') { if (W && W.tavSize) { const m = W.tavSize(dir === 'su' ? 1 : -1); SEL.t = 0; SEL.manualSize = true; toast('Misura: ' + MIS_NOME[m].toLowerCase() + '.'); } return true; }
    if (!NC) { toast('Qui intorno non c\'è niente da dipingere: avvicinati a un muro, a una saracinesca o a un\'auto ferma.'); return false; }
    ordine(); const cur = SEL.ord.indexOf(SEL.i), k = (cur < 0 ? 0 : cur + (dir === 'sx' ? -1 : 1) + NC) % NC; SEL.i = SEL.ord[k]; const C = CAND[SEL.i];
    SEL.k = C.k; SEL.manual = true; SEL.px = st.player.x; SEL.py = st.player.y; SEL.hk = ''; disegna(true); return true;
  }
  // il tocco sullo schermo dentro un'altra cornice: quella
  function tocca(nx, ny) {
    const THREE = T3(); let cam = null; try { cam = R_().getCamera(); } catch (e) { } if (!THREE || !cam || !NC) return false;
    const v = SEL.v3 || (SEL.v3 = new THREE.Vector3());
    for (let i = 0; i < NC; i++) { const C = CAND[i]; let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { v.set(C.cx + C.rx * a * C.W / 2 + C.ux * b * C.H / 2, C.cy + C.uy * b * C.H / 2, C.cz + C.rz * a * C.W / 2 + C.uz * b * C.H / 2).project(cam); const sx = (v.x + 1) / 2, sy = (1 - v.y) / 2; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      if (nx > x0 - .03 && nx < x1 + .03 && ny > y0 - .03 && ny < y1 + .03) { const st = PV().st; SEL.i = i; SEL.k = C.k; SEL.manual = true; SEL.px = st.player.x; SEL.py = st.player.y; SEL.hk = ''; return i; } }
    return false;
  }
  const toast = m => { try { const pv = PV(); if (pv && pv.toast) pv.toast(m); } catch (e) { } };
  // la struttura che writing.js (tavOpen, tavDown) capisce: { ok, A, Rc, sup, small, giu }
  function comeH(C) {
    const THREE = T3(); if (!C || !THREE) return null;
    let obj = C.pz ? C.pz.m : null; if (C.veh) { const R = R_(); obj = R && R.__vehicles ? R.__vehicles[C.veh] : null; }
    const n = new THREE.Vector3(C.nx, C.ny, C.nz), r = C.flat ? new THREE.Vector3(C.rx, 0, C.rz) : new THREE.Vector3(C.rx, 0, C.rz), u = new THREE.Vector3(C.ux, C.uy, C.uz);
    if (C.flat) { r.crossVectors(u, n).normalize(); }   // per terra: x a destra di chi guarda giù con l'alto lontano
    const pt = new THREE.Vector3(C.cx, C.cy, C.cz);
    return { ok: true, A: { pt, n, r, u, obj, tool: null, col: null, veh: C.veh || null, size: C.size }, Rc: { W: C.W, H: C.H, c: { x: C.cx, y: C.cy, z: C.cz } }, sup: C.flat ? 'terra' : 'muro', small: !!C.giu || C.W < C.W0 - .05, giu: C.giu, sel: true, kind: C.kind, nx: .5, ny: .5, t: now() };
  }
  // ---- la cornice nel mondo: il velo, il bordo spesso (nero fuori, giallo dentro, gli angoli bianchi), l'etichetta, gli altri a filo ----
  const CR = { g: null, fill: null, bord: null, lab: null, ghost: null, labC: null, labT: null, labTxt: '', pos: null, col: null, gpos: null, key: '', spess: 0 };
  const NB_V = (4 * 6) * 2 + 4 * 2 * 6;   // due nastri (4 lati × 2 triangoli) e gli angoli (4 × 2 bracci × 2 triangoli)
  function cornice() {
    const THREE = T3(), R = R_(); if (CR.g || !THREE || !R || !R.__models || !R.__models.scene) return CR.g;
    const g = new THREE.Group(); g.name = 'pv-seleziona'; g.userData.velo = true; g.renderOrder = 20;
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: .2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    fill.renderOrder = 20; fill.userData.velo = true; fill.raycast = () => { };
    const bg = new THREE.BufferGeometry(); CR.pos = new Float32Array(NB_V * 3); CR.col = new Float32Array(NB_V * 3);
    bg.setAttribute('position', new THREE.BufferAttribute(CR.pos, 3).setUsage(THREE.DynamicDrawUsage)); bg.setAttribute('color', new THREE.BufferAttribute(CR.col, 3).setUsage(THREE.DynamicDrawUsage));
    const bord = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide, toneMapped: false, fog: false })); bord.renderOrder = 22; bord.frustumCulled = false; bord.userData.velo = true; bord.raycast = () => { };
    const lc = document.createElement('canvas'); lc.width = 512; lc.height = 128; const lt = new THREE.CanvasTexture(lc); lt.encoding = THREE.sRGBEncoding; lt.minFilter = THREE.LinearFilter; lt.generateMipmaps = false;
    const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: lt, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, fog: false })); lab.renderOrder = 23; lab.userData.velo = true; lab.raycast = () => { }; lab.center.set(.5, 0);
    const gg = new THREE.BufferGeometry(); CR.gpos = new Float32Array(K.maxC * 8 * 3); gg.setAttribute('position', new THREE.BufferAttribute(CR.gpos, 3).setUsage(THREE.DynamicDrawUsage)); gg.setDrawRange(0, 0);
    const ghost = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false, fog: false })); ghost.renderOrder = 21; ghost.frustumCulled = false; ghost.userData.velo = true; ghost.raycast = () => { };
    g.add(fill, bord); R.__models.scene.add(g, lab, ghost); g.visible = lab.visible = ghost.visible = false;
    Object.assign(CR, { g, fill, bord, lab, labC: lc, labT: lt, ghost }); return g;
  }
  function etichetta(txt1, txt2, ok) {
    const t = txt1 + '|' + txt2 + '|' + ok; if (t === CR.labTxt) return; CR.labTxt = t; const c = CR.labC, x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    x.font = 'bold 44px "Silkscreen", "Pixelify Sans", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const w1 = Math.min(500, x.measureText(txt1).width + 36); x.fillStyle = 'rgba(13,11,26,.88)'; x.fillRect(256 - w1 / 2, 6, w1, 62); x.strokeStyle = ok ? '#ffe14a' : '#9a8f86'; x.lineWidth = 4; x.strokeRect(256 - w1 / 2, 6, w1, 62);
    x.fillStyle = ok ? '#ffe14a' : '#d8d0c4'; x.fillText(txt1, 256, 38, 480);
    if (txt2) { x.font = 'bold 30px "Silkscreen", "Pixelify Sans", monospace'; x.lineWidth = 7; x.strokeStyle = '#0d0b1a'; x.strokeText(txt2, 256, 100, 500); x.fillStyle = '#ffffff'; x.fillText(txt2, 256, 100, 500); }
    CR.labT.needsUpdate = true;
  }
  // il nastro: un rettangolo nel sistema della cornice (x a destra, y in alto), spessore s, dentro di s0
  let NV = 0;
  function quad(ax, ay, bx, by, cr, cg, cb) { const P = CR.pos, Cc = CR.col; const v = [[ax, ay], [bx, ay], [bx, by], [ax, ay], [bx, by], [ax, by]]; for (const [x, y] of v) { P[NV * 3] = x; P[NV * 3 + 1] = y; P[NV * 3 + 2] = 0; Cc[NV * 3] = cr; Cc[NV * 3 + 1] = cg; Cc[NV * 3 + 2] = cb; NV++; } }
  function nastro(W, H, s, off, r, g, b) { const x0 = -W / 2 - off, x1 = W / 2 + off, y0 = -H / 2 - off, y1 = H / 2 + off; quad(x0 - s, y0 - s, x1 + s, y0, r, g, b); quad(x0 - s, y1, x1 + s, y1 + s, r, g, b); quad(x0 - s, y0, x0, y1, r, g, b); quad(x1, y0, x1 + s, y1, r, g, b); }
  function angoli(W, H, s, L, r, g, b) { for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = sx * (W / 2 + s * 1.5), y = sy * (H / 2 + s * 1.5); quad(Math.min(x, x - sx * L), Math.min(y, y + sy * s), Math.max(x, x - sx * L), Math.max(y, y + sy * s), r, g, b); quad(Math.min(x, x + sx * s), Math.min(y, y - sy * L), Math.max(x, x + sx * s), Math.max(y, y - sy * L), r, g, b); } }
  const _m4 = { e: null };
  // la posa della cornice (il centro, gli assi) nel mondo, da un candidato; per un mezzo segue il mezzo
  function posa(C) {
    const THREE = T3(), g = CR.g; let cx = C.cx, cy = C.cy, cz = C.cz, nx = C.nx, ny = C.ny, nz = C.nz, rx = C.rx, ry = 0, rz = C.rz, ux = C.ux, uy = C.uy, uz = C.uz;
    if (C.flat) { // x = u × n
      rx = uy * nz - uz * ny; ry = uz * nx - ux * nz; rz = ux * ny - uy * nx; }
    const M = _m4.e || (_m4.e = new THREE.Matrix4()); M.set(rx, ux, nx, cx + nx * .012, ry, uy, ny, cy + ny * .012, rz, uz, nz, cz + nz * .012, 0, 0, 0, 1);
    g.matrixAutoUpdate = false; g.matrix.copy(M); g.matrixWorldNeedsUpdate = true;
  }
  function disegna(forza) {
    const THREE = T3(); if (!cornice()) return; const C = selezionato(), R = R_();
    if (!C) { CR.g.visible = CR.lab.visible = CR.ghost.visible = false; SEL.vis = false; return; }
    SEL.vis = true; CR.g.visible = CR.lab.visible = true;
    // lo spessore: ~3 px a schermo (dalla distanza della camera e dal suo campo)
    let px = .012; try { const cam = R.getCamera(), e = cam.matrixWorld.elements, d = hyp(e[12] - C.cx, e[13] - C.cy, e[14] - C.cz), H = (R.res && R.res.h) || (typeof innerHeight !== 'undefined' ? innerHeight : 800); px = 2 * d * Math.tan((cam.fov || 50) * Math.PI / 360) / Math.max(200, H); } catch (e) { }
    const s = clamp(px * 4.5, .025, .12), key = C.k + ':' + C.W.toFixed(2) + ':' + C.H.toFixed(2) + ':' + s.toFixed(3);
    if (forza || key !== CR.key) { CR.key = key; NV = 0;
      nastro(C.W, C.H, s * 1.7, s * .4, .05, .04, .1);   // fuori nero
      nastro(C.W, C.H, s, s * .55, 1, .88, .29);        // dentro giallo
      angoli(C.W, C.H, s, Math.min(C.W, C.H) * .22 + s * 2, 1, 1, 1);   // gli angoli bianchi
      CR.bord.geometry.attributes.position.needsUpdate = true; CR.bord.geometry.attributes.color.needsUpdate = true; CR.bord.geometry.setDrawRange(0, NV);
      CR.fill.scale.set(C.W, C.H, 1);
      // gli altri candidati a filo
      let k = 0; const P = CR.gpos;
      for (let i = 0; i < NC && k < K.maxC; i++) { if (i === SEL.i) continue; const O = CAND[i]; let rx = O.rx, ry = 0, rz = O.rz; if (O.flat) { rx = O.uy * O.nz - O.uz * O.ny; ry = O.uz * O.nx - O.ux * O.nz; rz = O.ux * O.ny - O.uy * O.nx; }
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [O.cx + rx * a * O.W / 2 + O.ux * b * O.H / 2 + O.nx * .02, O.cy + ry * a * O.W / 2 + O.uy * b * O.H / 2 + O.ny * .02, O.cz + rz * a * O.W / 2 + O.uz * b * O.H / 2 + O.nz * .02]);
        for (let q = 0; q < 4; q++) { const a = pts[q], b = pts[(q + 1) % 4]; P.set(a, k * 24 + q * 6); P.set(b, k * 24 + q * 6 + 3); } k++; }
      CR.ghost.geometry.setDrawRange(0, k * 8); CR.ghost.geometry.attributes.position.needsUpdate = true; CR.ghost.visible = k > 0;
      // l'etichetta
      const ar = C.W * C.H, nome = MIS_NOME[ar <= 1.3 ? 'tag' : ar <= 4.2 ? 'throw' : ar <= 11 ? 'pezzo' : 'burner'], dims = C.W.toFixed(1).replace('.', ',') + '×' + C.H.toFixed(1).replace('.', ',') + ' m';
      const cosa = C.veh ? ((G_() && G_().VK && G_().VK[C.v && C.v.kind] && G_().VK[C.v.kind].label) || 'auto').toUpperCase() : NOME[C.kind] || 'MURO';
      etichetta(nome + ' ' + dims, (NC > 1 ? '◄ ' : '') + cosa + (NC > 1 ? ' ' + (SEL.ord.indexOf(SEL.i) + 1 || 1) + '/' + NC + ' ►' : ''), true);
    }
    posa(C);
    // l'etichetta sopra la cornice, alta ~18 px
    const lh = clamp(px * 46, .18, 1.2); CR.lab.scale.set(lh * 4, lh, 1);
    CR.lab.position.set(C.cx + C.nx * .05 + (C.flat ? -C.ux * (C.H / 2 + .1) : 0), C.cy + (C.flat ? .05 : C.H / 2 + s * 3), C.cz + C.nz * .05 + (C.flat ? -C.uz * (C.H / 2 + .1) : 0));
  }
  function spegni() { if (CR.g) { CR.g.visible = CR.lab.visible = CR.ghost.visible = false; } SEL.vis = false; SEL.H = null; SEL.presa = false; }
  // ogni fotogramma (writing.js tavFrameTick, con la bomboletta in mano e la tavoletta pronta): la lettura a fette, la scelta (al più ogni
  // 90 ms, se ti muovi o giri), la cornice. Ritorna la H del candidato scelto per writing.js (tavOpen, tavDown), o un messaggio
  function tick(st, size, pref) {
    const t = now(), p = st.player, R = R_(); if (!R) return { no: true };
    coda(p.x, p.y); lavora(R.phone ? K.msTel : K.msPc); pulisci(p.x, p.y);
    const ca = camDir() || 0, mosso = hyp(p.x - SEL.qx, p.y - SEL.qy) > .15 || angD(p.face || 0, SEL.fa) > .08 || angD(ca, SEL.ca) > .08 || size !== SEL.size || pref !== SEL.pref;
    if (!SEL.t || (t - SEL.t > K.periodo && (mosso || t - SEL.t > 600))) {
      SEL.t = t; SEL.qx = p.x; SEL.qy = p.y; SEL.fa = p.face || 0; SEL.ca = ca; SEL.size = size; SEL.pref = pref;
      const prevK = SEL.k, prev = selezionato(), prevSc = prev ? prev.sc : 0; cerca(st, size, pref);
      if (SEL.manual && hyp(p.x - SEL.px, p.y - SEL.py) > 1.5) SEL.manual = false;   // ti sei spostato: si torna alla scelta automatica
      let i = -1; if (prevK) for (let q = 0; q < NC; q++) if (CAND[q].k === prevK) { i = q; break; }
      if (i < 0 && prevK && prev) for (let q = 0; q < NC; q++) if (CAND[q].kind === prev.kind && hyp(CAND[q].cx - prev.cx, CAND[q].cz - prev.cz) < .8) { i = q; break; }   // lo stesso posto, spostato di poco
      if (i >= 0 && !SEL.manual && CAND[i].sc - CAND[0].sc > .45) i = 0;   // un altro molto migliore: quello (con un po' d'isteresi: niente sfarfallio)
      SEL.i = i >= 0 ? i : 0; SEL.k = NC ? CAND[SEL.i].k : ''; if (!NC) SEL.manual = false;
      ordine();
      const C = selezionato(), hk = C ? C.k + ':' + C.W.toFixed(2) + ':' + C.H.toFixed(2) + ':' + C.cx.toFixed(2) + ':' + C.cz.toFixed(2) : '';
      if (hk !== SEL.hk) { SEL.hk = hk; SEL.H = C ? comeH(C) : null; }
      const sig = hk + ':' + NC + ':' + SEL.i; disegna(sig !== SEL.sig); SEL.sig = sig;   // la cornice si rifà solo se cambia qualcosa
      SEL.nota = C ? (C.giu || C.W < C.W0 - .05 ? 'qui ci sta ' + C.W.toFixed(1).replace('.', ',') + ' × ' + C.H.toFixed(1).replace('.', ',') + ' m' : 'A dipinge qui') + (NC > 1 ? ' · ◄► ' + NC + ' posti' : '') : inCoda() ? 'Sto guardando i muri…' : 'avvicinati a un muro, una saracinesca o un\'auto ferma';
    }   // (fra un'interrogazione e l'altra niente si rifà: i mezzi scelti sono fermi, quello che riparte esce alla prossima)
    if (CR.g && CR.g.visible) CR.fill.material.opacity = .16 + .16 * (.5 + .5 * Math.sin(t / 260));
    if (SEL.H) { SEL.H.t = t; return SEL.H; }
    return inCoda() ? { wait: true, msg: 'Sto guardando i muri…' } : { no: true, msg: 'Qui vicino non c\'è niente da dipingere.' };
  }
  // in tasca la bomboletta: la lettura comincia prima (piano, 0,3 ms), così prendendola in mano i muri ci sono già
  function caldo(st) { const p = st.player, R = R_(); if (!R || p.vehicle || p.indoor) return; coda(p.x, p.y); lavora(K.msCaldo); }
  // ---- i comandi: ◄ ► i posti, ▲ ▼ la misura; la bomboletta tenuta fa della levetta questi comandi ----
  function premi(giu) {
    const t = now();
    if (giu) { SEL.giuT = t; SEL.presaT = setTimeout(() => { SEL.presa = true; toast('Levetta: ◄ ► un altro posto, ▲ ▼ la misura. Lascia la bomboletta e premi A.'); }, 280); return; }
    clearTimeout(SEL.presaT); const fu = SEL.presa; SEL.presa = false; SEL.lev.dir = '';
    if (!fu && t - SEL.giuT < 280) passo('dx');   // un tocco: il posto dopo
  }
  function levetta(x, y) {   // la levetta mentre tieni la bomboletta: una spinta, un passo
    const ax = Math.abs(x), ay = Math.abs(y); let d = ''; if (Math.max(ax, ay) > .55) d = ax >= ay ? (x < 0 ? 'sx' : 'dx') : (y < 0 ? 'su' : 'giu');
    if (d && d !== SEL.lev.dir) passo(d); SEL.lev.dir = d; return true;
  }
  const misura = () => { const L = ST.ms.slice().sort((a, b) => a - b), q = f => L.length ? +L[Math.min(L.length - 1, Math.floor(L.length * f))].toFixed(3) : 0;
    return { on: ON, interrogazioni: ST.q, ms: { ultimo: +ST.ultimo.toFixed(3), mediana: q(.5), p95: q(.95), max: +ST.msMax.toFixed(3) }, piani: ST.piani, fusi: ST.fusi, celle: ST.celle, kb: Math.round(ST.byte / 1024), meshLette: ST.estratte, triangoli: ST.triangoli, msLettura: +ST.msEstr.toFixed(1), attese: ST.attese, candidati: ST.nC, inCoda: inCoda(), scartati: Object.assign({}, ST.scartati) }; };
  return { on: ON, K, tick, caldo, spegni, passo, premi, levetta, tocca, cerca, misura, nota: () => SEL.nota, get presa() { return SEL.presa; }, set presa(v) { SEL.presa = !!v; }, attuale: () => SEL.H, get candidati() { return CAND.slice(0, NC); }, get scelto() { return selezionato(); },
    _: { estraiG, lavora, coda, IDX, get PM() { return PM; }, CAND, SEL, CR, adatta, FIT, WIN, GR, finestra, finisci, aperture, tipo, indicizza, ST, MISURE, comeH, reset: () => { IDX.clear(); if (PM) PM = new WeakMap(); ST.byte = 0; CODA.L = []; CODA.i = 0; CODA.it = null; CODA.t = 0; CODA.cx = 1e9; NC = 0; SEL.t = 0; SEL.k = ''; SEL.manual = false; ST.piani = 0; } } };
})();
if (typeof module !== 'undefined') module.exports = Seleziona;
