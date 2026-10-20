/* ================= [modelli2] VEICOLI 3D: le auto, i furgoni, i camion e le due ruote dell'isola, 1986 =================
   Ogni mezzo è riconoscibile come il suo modello vero (la 126 non è una Panda): misure vere in metri, muso verso +z,
   ruote a terra (y = 0), larghezza e lunghezza dentro il 5% di VK (game.js). Le carrozzerie non sono più profili estrusi:
   - la scocca è un "loft": sezioni lungo l'asse (fianco quasi dritto, spalla arrotondata, cofano bombato) che si stringono
     in pianta agli angoli del muso e della coda, con i passaruota scavati;
   - il padiglione è un secondo loft sopra la cintura, a zone: parabrezza, lunotto e finestrini di vetro (trasparente: dentro
     si vedono sedili, cruscotto e volante), tetto, gocciolatoi e montanti di vernice;
   - paraurti e modanature sono "nastri" che seguono la pianta della scocca;
   - le ruote sono tornite: gomma col battistrada (scanalature e tasselli), cerchio in acciaio, con la coppa o in lega.
   Livello alto (vicino) e livello basso (lontano, poche decine di facce); materiali condivisi tranne la vernice, i vetri
   e i fanali, che i danni e il ciclo del giorno cambiano mezzo per mezzo.
   Veicoli3D.costruisci(modello, colore, opzioni) → { alto, basso, ud } (ud: l'interfaccia di render.js: paint, glass, body,
   ws, wheels, lamps, front, tails, tlMat, parts.bumper, seat, seat2, porta, wipers, beacons...).
   Veicoli3D.scegli(v) dice quale modello per quel mezzo; Veicoli3D.MODELLI elenca i modelli con le loro misure. */
var Veicoli3D = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const DOC = typeof document !== 'undefined' && !!document.createElement;

  // ---------------- materiali ----------------
  const MC = {};
  function mat(col, kind) {   // condivisi fra tutti i mezzi
    const k = col + '|' + (kind || ''); if (MC[k]) return MC[k];
    if (kind === 'luce') return (MC[k] = new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    const o = { color: col, roughness: .6, metalness: 0 };
    if (kind === 'cromo') Object.assign(o, { roughness: .2, metalness: .5 });
    if (kind === 'metallo') Object.assign(o, { roughness: .45, metalness: .3 });
    if (kind === 'gomma') Object.assign(o, { roughness: .95 });
    if (kind === 'plastica') Object.assign(o, { roughness: .55 });
    if (kind === 'stoffa') Object.assign(o, { roughness: .97 });
    if (kind === 'lente') Object.assign(o, { roughness: .12, metalness: .1, emissive: col, emissiveIntensity: .35 });
    if (kind === 'vetroscuro') Object.assign(o, { roughness: .1, metalness: .3, emissive: '#06101a' });
    if (kind === 'tela') Object.assign(o, { roughness: 1 });
    if (kind === 'legno') Object.assign(o, { roughness: .8 });
    return (MC[k] = new THREE.MeshStandardMaterial(o));
  }
  const vernice = col => new THREE.MeshStandardMaterial({ color: col, roughness: .36, metalness: .22 });   // di ogni mezzo: i danni la scuriscono
  const vetro = () => new THREE.MeshStandardMaterial({ color: '#33475a', roughness: .05, metalness: .3, emissive: '#050c14', transparent: true, opacity: .5, depthWrite: false });
  const fanaleMat = () => new THREE.MeshBasicMaterial({ color: '#8a1010', toneMapped: false });   // render.js lo accende in frenata
  const C = {   // i materiali più usati
    get cromo() { return mat('#d4d6dc', 'cromo'); }, get nero() { return mat('#1a1a1e', 'plastica'); }, get gomma() { return mat('#18171a', 'gomma'); },
    get grigio() { return mat('#4a4a50', 'plastica'); }, get scuro() { return mat('#0d0d10', 'gomma'); }, get faro() { return mat('#fff4d6', 'luce'); },
    get freccia() { return mat('#ff9a2a', 'lente'); }, get retro() { return mat('#f0f0ec', 'lente'); }, get rosso() { return mat('#a01818', 'lente'); },
    get acciaio() { return mat('#9a9ca4', 'metallo'); }, get interno() { return mat('#2a2624', 'stoffa'); }, get vetroscuro() { return mat('#1c2834', 'vetroscuro'); },
  };
  // [modelli2] i colori del 1986: i toni che arrivano dal traffico si portano al più vicino dei colori di serie di allora
  const TAVOLOZZA = ['#e9e4d6', '#f2efe6', '#b5221c', '#8a1c1c', '#1f3a5f', '#2e4a7a', '#7b8a99', '#a8acb0', '#4d5257', '#2b2b2e', '#3c5a3a', '#6b7a3a',
    '#c9b27a', '#d8c79a', '#8a5a32', '#5a3a24', '#e0b13a', '#c8762a', '#8fb0c4', '#5f8a8a', '#7a2a3a', '#9a8a6a', '#556b7a', '#c4c0b0'];
  function epoca(col) {
    const c = new THREE.Color(col), hc = {}, hsl = c.getHSL(hc); void hsl; let best = TAVOLOZZA[0], bd = 9;
    for (const t of TAVOLOZZA) { const q = new THREE.Color(t), h = {}; q.getHSL(h); const dh = Math.min(Math.abs(h.h - hc.h), 1 - Math.abs(h.h - hc.h)) * (hc.s + h.s), d = dh * 2.2 + Math.abs(h.l - hc.l) * 1.6 + Math.abs(h.s - hc.s) * .7; if (d < bd) { bd = d; best = t; } }
    return best;
  }

  // ---------------- aiuti ----------------
  function M(g, geo, m, x, y, z, rx, ry, rz) { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0); g.add(o); return o; }
  const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d), CY = (r0, r1, h, s, open) => new THREE.CylinderGeometry(r0, r1, h, s || 12, 1, !!open);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  function asta(g, a, b, r, m, seg) {   // un tubo da un punto all'altro
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); const d = _b.clone().sub(_a), L = d.length();
    const o = M(g, CY(r, r, L, seg || 6), m); o.position.copy(_a).add(_b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); return o;
  }
  function lista(g, a, b, w, t, m) {   // una piattina da un punto all'altro (larga w, spessa t), col piatto verso l'alto
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); const L = _a.distanceTo(_b);
    const o = M(g, BX(w, t, L), m); o.position.copy(_a).add(_b).multiplyScalar(.5); o.lookAt(_b); return o;
  }
  function tondo(g, r, d, m, x, y, z, seg, asse) {   // un disco con la faccia verso +z (asse 'x': verso x)
    const o = M(g, CY(r, r, d, seg || 14), m, x, y, z); if (asse === 'x') o.rotation.z = PI / 2; else o.rotation.x = PI / 2; return o;
  }
  // geometria da triangoli: pos = [x,y,z,...]; uv planari (x, z) per la crepa del parabrezza
  function geoDa(pos, uvAxes) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = new Float32Array(pos.length / 3 * 2), ax = uvAxes || [0, 2];
    let mn = [1e9, 1e9], mx = [-1e9, -1e9]; for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 2; k++) { mn[k] = Math.min(mn[k], pos[i + ax[k]]); mx[k] = Math.max(mx[k], pos[i + ax[k]]); }
    for (let i = 0, j = 0; i < pos.length; i += 3, j += 2) { uv[j] = (pos[i + ax[0]] - mn[0]) / (mx[0] - mn[0] || 1); uv[j + 1] = (pos[i + ax[1]] - mn[1]) / (mx[1] - mn[1] || 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  // un nastro (paraurti, modanature, fasce): percorso in pianta [[x, z], ...], sezione alta h da y0, spessa t verso fuori
  function nastro(path, y0, h, t, out) {
    const P = path, n = P.length, pos = [], N = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
      let nx = tz / l, nz = -tx / l; if (out && nx * (P[i][0] - out[0]) + nz * (P[i][1] - out[1]) < 0) { nx = -nx; nz = -nz; } N.push([nx, nz]);
    }
    const V = (i, o, top) => [P[i][0] + N[i][0] * o, y0 + (top ? h : 0), P[i][1] + N[i][1] * o];
    const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < n - 1; i++) {
      const ib = V(i, 0, 0), ob = V(i, t, 0), ot = V(i, t, 1), it = V(i, 0, 1), jb = V(i + 1, 0, 0), jo = V(i + 1, t, 0), jt = V(i + 1, t, 1), ji = V(i + 1, 0, 1);
      quad(ob, jo, jt, ot); quad(ot, jt, ji, it); quad(ib, jb, jo, ob); quad(it, ji, jb, ib);
    }
    const cap = (i, s) => { const a = V(i, 0, 0), b = V(i, t, 0), c = V(i, t, 1), d = V(i, 0, 1); if (s > 0) quad(a, b, c, d); else quad(a, d, c, b); };
    cap(0, 1); cap(n - 1, -1);
    return orienta(geoDa(pos));
  }
  // rigira i triangoli che guardano dentro (rispetto al centro del pezzo): i nastri si costruiscono da tutte e due le parti
  function orienta(g) {
    const p = g.attributes.position.array, c = new THREE.Vector3(); g.computeBoundingBox(); g.boundingBox.getCenter(c);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 9) {
      A.fromArray(p, i); B.fromArray(p, i + 3); Cc.fromArray(p, i + 6); n.subVectors(B, A).cross(m.subVectors(Cc, A)); m.copy(A).add(B).add(Cc).multiplyScalar(1 / 3).sub(c);
      if (n.dot(m) < 0) for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); return g;
  }

  // ---------------- la scocca: loft di sezioni ----------------
  // S: stazioni [{ z, hw, yb, yt, cr }] da dietro a davanti; o: { sh (raggio della spalla), tuck (rientro in basso), crown (bombatura) }
  function loft(S, o) {
    const pos = [], idx = [], NR = o.basso ? 7 : 13;
    const ring = s => {   // da sotto a destra (+x), su per il fianco, sopra, giù a sinistra
      const hgt = s.yt - s.yb, sh = Math.min(o.sh, hgt * .35, s.hw * .4), tk = Math.min(o.tuck, hgt * .25), cr = s.cr !== undefined ? s.cr : o.crown;
      const H = o.basso ? [[s.hw, s.yb], [s.hw, s.yt - sh], [s.hw - sh, s.yt + cr * .25], [0, s.yt + cr]]
        : [[s.hw - tk, s.yb], [s.hw, s.yb + tk * 1.2], [s.hw, s.yt - sh], [s.hw - sh * .29, s.yt - sh * .29], [s.hw - sh, s.yt + cr * .25], [s.hw * .5, s.yt + cr * .85], [0, s.yt + cr]];
      return H.concat(H.slice(0, H.length - 1).reverse().map(p => [-p[0], p[1]]));
    };
    const R = S.map(ring);
    R.forEach((r, i) => r.forEach(p => pos.push(p[0], p[1], S[i].z)));
    for (let i = 0; i < S.length - 1; i++) for (let k = 0; k < NR; k++) {
      const a = i * NR + k, b = i * NR + (k + 1) % NR, c = (i + 1) * NR + (k + 1) % NR, d = (i + 1) * NR + k; idx.push(a, b, c, a, c, d);
    }
    [[0, -1], [S.length - 1, 1]].forEach(([i, s]) => {   // i tappi: muso e coda, con le loro normali
      const b0 = pos.length / 3; let cx = 0, cy = 0; R[i].forEach(p => { pos.push(p[0], p[1], S[i].z); cx += p[0]; cy += p[1]; });
      const c = pos.length / 3; pos.push(cx / NR, cy / NR, S[i].z);
      for (let k = 0; k < NR; k++) { const p = b0 + k, q = b0 + (k + 1) % NR; if (s > 0) idx.push(c, p, q); else idx.push(c, q, p); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // i tappi hanno vertici loro: normali piatte
    const nA = g.attributes.normal, nCap = S.length * NR;
    for (let v = nCap; v < pos.length / 3; v++) nA.setXYZ(v, 0, 0, v < nCap + NR + 1 ? -1 : 1);
    return g;
  }
  // il profilo della scocca → le stazioni. D: top [[z, y] davanti→dietro], sill, ybF, ybR, rf, rr (raggi in pianta), W, wells [[z, R]], step
  function stazioni(D, step) {
    const T = D.top, zf = T[0][0], zr = T[T.length - 1][0], hw0 = D.W / 2, Z = new Set();
    const add = z => { if (z <= zf + 1e-6 && z >= zr - 1e-6) Z.add(Math.round(z * 1000) / 1000); };
    T.forEach(p => add(p[0])); for (let z = zr; z < zf; z += step || .4) add(z);
    D.wells.forEach(([zw, R]) => { for (let k = 0; k <= 6; k++) add(zw + R * Math.cos(k / 6 * PI)); add(zw + R + .04); add(zw - R - .04); });
    for (let k = 0; k <= 4; k++) { add(zf - D.rf + D.rf * Math.sin(k / 4 * PI / 2)); add(zr + D.rr - D.rr * Math.sin(k / 4 * PI / 2)); }
    add(zf - .04); add(zr + .04);
    const zs = [...Z].sort((a, b) => a - b);
    return zs.map(z => ({ z, hw: hwAt(D, z), yb: ybAt(D, z), yt: ytAt(D, z) }));
  }
  function ytAt(D, z) { const T = D.top; for (let i = 0; i < T.length - 1; i++) { const a = T[i], b = T[i + 1]; if (z <= a[0] && z >= b[0]) return a[0] === b[0] ? Math.max(a[1], b[1]) : lerp(a[1], b[1], (a[0] - z) / (a[0] - b[0])); } return T[0][1]; }
  function hwAt(D, z) {
    const T = D.top, zf = T[0][0], zr = T[T.length - 1][0], hw0 = D.W / 2;
    if (z > zf - D.rf) { const d = z - (zf - D.rf); return hw0 - D.rf + Math.sqrt(Math.max(0, D.rf * D.rf - d * d)) * (D.rfK || 1) + D.rf * (1 - (D.rfK || 1)); }
    if (z < zr + D.rr) { const d = (zr + D.rr) - z; return hw0 - D.rr + Math.sqrt(Math.max(0, D.rr * D.rr - d * d)); }
    return hw0 - (D.taper || 0) * Math.max(0, z / zf);
  }
  function ybAt(D, z) {
    const T = D.top, zf = T[0][0], zr = T[T.length - 1][0]; let y = D.sill;
    if (z > zf - .16) y = lerp(D.sill, D.ybF, (z - (zf - .16)) / .16); else if (z < zr + .16) y = lerp(D.sill, D.ybR, ((zr + .16) - z) / .16);
    D.wells.forEach(([zw, R]) => { const d = Math.abs(z - zw); if (d < R) y = Math.max(y, D.r + Math.sqrt(R * R - d * d)); });
    return y;
  }
  // il padiglione: loft a zone sopra la cintura. Cb: { w0 [z,y] base del parabrezza, w1 cima, r1 fine del tetto, r0 base del lunotto,
  //   inset (rientro dal fianco), tumble (quanto si stringe in alto), B [z...] montanti centrali, S (dove finiscono i finestrini, poi il montante C),
  //   pw (larghezza dei montanti A), crown, lunVetro (false: il dietro è lamiera, i furgoni) }
  function padiglione(D, Cb, coarse) {
    const z0 = Cb.r0[0], z1 = Cb.w0[0], Z = new Set(), add = z => { if (z >= z0 - 1e-6 && z <= z1 + 1e-6) Z.add(Math.round(z * 1000) / 1000); };
    add(z0); add(z1); add(Cb.w1[0]); add(Cb.r1[0]); if (Cb.S !== undefined && Cb.S !== null) add(Cb.S);
    (Cb.B || []).forEach(b => { add(b - (Cb.bw || .07) / 2); add(b + (Cb.bw || .07) / 2); });
    for (let z = z0; z < z1; z += coarse ? .6 : .32) add(z);
    const zs = [...Z].sort((a, b) => a - b), yRoof = (Cb.w1[1] + Cb.r1[1]) / 2;
    const yR = z => z > Cb.w1[0] ? lerp(Cb.w1[1], Cb.w0[1], (z - Cb.w1[0]) / (Cb.w0[0] - Cb.w1[0])) : z < Cb.r1[0] ? lerp(Cb.r1[1], Cb.r0[1], (Cb.r1[0] - z) / (Cb.r1[0] - Cb.r0[0])) : lerp(Cb.r1[1], Cb.w1[1], (z - Cb.r1[0]) / (Cb.w1[0] - Cb.r1[0])) + Math.sin(clamp((z - Cb.r1[0]) / (Cb.w1[0] - Cb.r1[0]), 0, 1) * PI) * .012;
    const sec = z => {
      const yb = ytAt(D, z) - .008, hb = hwAt(D, z) - Cb.inset, y = Math.max(yb + .004, yR(z)), k = clamp((y - yb) / Math.max(.05, yRoof - yb), 0, 1), hr = hb - Cb.tumble * k;
      const rr = Math.min(.035, (y - yb) * .3), pw = Cb.pw || .06, cr = (Cb.crown || .02) * k;
      const H = [[hb, yb], [hr, y - rr], [hr - pw * k, y], [0, y + cr]];
      return H.concat(H.slice(0, 3).reverse().map(p => [-p[0], p[1]]));   // 7 punti, aperto sotto
    };
    const zone = { tetto: [], ws: [], lun: [], vetro: [] }, side = (z) => {
      if ((Cb.B || []).some(b => Math.abs(z - b) < (Cb.bw || .07) / 2)) return 'tetto';
      if (Cb.S !== undefined && Cb.S !== null && z < Cb.S) return 'tetto';
      if (Cb.Sf !== undefined && z > Cb.Sf) return 'tetto';
      return 'vetro';
    };
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i], zb = zs[i + 1], zm = (za + zb) / 2, A = sec(za), B = sec(zb);
      for (let k = 0; k < 6; k++) {
        let zn = k === 0 || k === 5 ? side(zm) : k === 1 || k === 4 ? 'tetto' : zm > Cb.w1[0] ? 'ws' : zm < Cb.r1[0] ? (Cb.lunVetro === false ? 'tetto' : 'lun') : 'tetto';
        if (coarse && zn !== 'tetto') zn = 'vetro';
        const a = [A[k][0], A[k][1], za], b = [A[k + 1][0], A[k + 1][1], za], c = [B[k + 1][0], B[k + 1][1], zb], d = [B[k][0], B[k][1], zb];
        zone[zn].push(...a, ...b, ...c, ...a, ...c, ...d);
      }
    }
    const out = {}; for (const k in zone) if (zone[k].length) out[k] = geoDa(zone[k], k === 'ws' || k === 'lun' ? [0, 1] : [2, 1]);
    out.yR = yR; out.sec = sec; return out;
  }

  // ---------------- ruote ----------------
  const GW = {};
  function ruotaGeo(r, w, tipo, side, low) {
    const key = [r, w, tipo, side, low].join('|'); if (GW[key]) return GW[key];
    const seg = low ? 8 : 12, V2 = (x, y) => new THREE.Vector2(x, y);
    // la gomma: spalla, battistrada con due scanalature; i tasselli: un segmento sì e uno no un po' più dentro
    const P = low ? [[r * .64, -w / 2], [r, -w / 2 + .02], [r, w / 2 - .02], [r * .64, w / 2]]
      : [[r * .63, -w / 2 + .004], [r * .82, -w / 2], [r, -w / 2 + .03], [r, -w * .12], [r - .012, 0], [r, w * .12], [r, w / 2 - .03], [r * .82, w / 2], [r * .63, w / 2 - .004]];
    const tire = new THREE.LatheGeometry(P.map(p => V2(p[0], p[1])), seg);
    if (!low) { const a = tire.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), z = a.getZ(i), y = a.getY(i), rr = Math.hypot(x, z); if (rr > r - .004 && Math.abs(y) < w / 2 - .025) { const ang = Math.atan2(z, x), s = Math.floor((ang + PI) / (2 * PI) * seg * 2) % 2; if (s) { a.setX(i, x * (1 - .018 / r)); a.setZ(i, z * (1 - .018 / r)); } } } tire.computeVertexNormals(); }
    // il cerchio, dal lato di fuori (+y prima di girarlo)
    const rc = r * .64, o = w / 2;
    const RP = tipo === 'lega' ? [[0, o - .035], [rc * .3, o - .045], [rc * .85, o - .04], [rc, o - .01], [rc, -o + .02]]
      : tipo === 'coppa' ? [[0, o - .005], [rc * .22, o - .02], [rc * .8, o - .028], [rc, o - .012], [rc, -o + .02]]
      : tipo === 'camion' ? [[0, o + .02], [rc * .25, o - .02], [rc * .65, o - .1], [rc * .9, o - .1], [rc, o - .02], [rc, -o + .02]]
      : [[0, o - .01], [rc * .24, o - .03], [rc * .6, o - .06], [rc * .9, o - .05], [rc, o - .015], [rc, -o + .02]];
    const rim = new THREE.LatheGeometry(RP.map(p => V2(p[0], p[1])).reverse(), low ? 8 : 10);
    [tire, rim].forEach(gg => { gg.rotateZ(side > 0 ? -PI / 2 : PI / 2); });
    return (GW[key] = { tire, rim });
  }
  // la ruota pronta: un gruppo (gomma, cerchio, bulloni o fori), il fuori verso side
  function ruota(r, w, tipo, colC, side, low) {
    const g = new THREE.Group(), G = ruotaGeo(r, w, tipo, side, low);
    g.add(new THREE.Mesh(G.tire, C.gomma));
    const cm = tipo === 'coppa' ? C.cromo : tipo === 'lega' ? mat(colC || '#8a8c92', 'metallo') : mat(colC || '#a8aab0', 'metallo');
    g.add(new THREE.Mesh(G.rim, cm));
    if (!low) {
      const o = w / 2, rc = r * .64, x = side * (o - (tipo === 'lega' ? .042 : tipo === 'coppa' ? .024 : .04));
      if (tipo === 'lega') for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; M(g, CY(rc * .17, rc * .17, .012, 6), C.scuro, x, Math.cos(a) * rc * .56, Math.sin(a) * rc * .56, 0, 0, PI / 2); }   // i fori «a telefono»
      else if (tipo === 'coppa') M(g, CY(rc * .16, rc * .16, .01, 8), C.nero, side * (o - .002), 0, 0, 0, 0, PI / 2);
      else if (tipo === 'camion') for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; M(g, CY(.018, .018, .03, 6), C.acciaio, side * (o + .01), Math.cos(a) * rc * .3, Math.sin(a) * rc * .3, 0, 0, PI / 2); }
      else M(g, CY(rc * .22, rc * .22, .02, 8), C.cromo, side * (o - .008), 0, 0, 0, 0, PI / 2);   // il coprimozzo
    }
    return g;
  }

  // ---------------- targhe ----------------
  const TT = {};
  function targa(post, n) {
    const k = (post ? 'p' : 'a') + (n % 4); if (TT[k]) return TT[k];
    if (!DOC) return (TT[k] = mat('#f2f0e8', 'plastica'));
    const c = document.createElement('canvas'); c.width = post ? 128 : 96; c.height = 32; const x = c.getContext('2d');
    x.fillStyle = '#f4f2ea'; x.fillRect(0, 0, c.width, 32); x.strokeStyle = '#222'; x.lineWidth = 2; x.strokeRect(1, 1, c.width - 2, 30);
    const num = ['A38214', '512307', 'B70493', '284615'][n % 4];
    x.fillStyle = '#e8701a'; x.font = 'bold 18px sans-serif'; x.textBaseline = 'middle'; x.fillText('PV', 5, 17);
    x.fillStyle = '#141414'; x.font = 'bold 20px monospace'; x.fillText(post ? num : num.slice(0, 5), 34, 17);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return (TT[k] = new THREE.MeshStandardMaterial({ map: t, roughness: .5 }));
  }
  const TX = {};
  function scritta(testo, fondo, inchiostro, w, h) {   // una fascia con le lettere (POLIZIA, TUTELA, la linea dell'autobus)
    const k = [testo, fondo, inchiostro, w, h].join('|'); if (TX[k]) return TX[k];
    if (!DOC) return (TX[k] = mat(fondo, 'plastica'));
    const c = document.createElement('canvas'); c.width = w || 256; c.height = h || 32; const x = c.getContext('2d');
    x.fillStyle = fondo; x.fillRect(0, 0, c.width, c.height); x.fillStyle = inchiostro; x.font = `bold ${Math.round(c.height * .62)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(testo, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return (TX[k] = new THREE.MeshStandardMaterial({ map: t, roughness: .45 }));
  }

  // ================= LE AUTO =================
  let PASSA = null;   // il passaruota scuro (visto da dentro)
  const passa = () => PASSA || (PASSA = new THREE.MeshStandardMaterial({ color: '#0b0b0d', roughness: 1, side: THREE.DoubleSide }));
  // la scocca in pianta: z della faccia (muso end = 1, coda -1) alla distanza x dal centro, e l'angolo della sua normale
  function zFaccia(D, x, end) {
    const T = D.top, zE = end > 0 ? T[0][0] : T[T.length - 1][0], rc = end > 0 ? D.rf : D.rr, c0 = D.W / 2 - rc, ax = Math.abs(x);
    if (ax <= c0 || rc <= 0) return zE; const d = Math.min(rc, ax - c0); return zE - end * (rc - Math.sqrt(rc * rc - d * d));
  }
  function nFaccia(D, x, end) { const rc = end > 0 ? D.rf : D.rr, c0 = D.W / 2 - rc, ax = Math.abs(x); if (ax <= c0 || rc <= 0) return 0; return Math.sign(x) * Math.asin(Math.min(.999, (ax - c0) / rc)); }
  // posa un pezzo (fatto con la faccia verso +z) sul muso o sulla coda, girato come la scocca in quel punto, sporgente di sp
  function posa(o, D, x, y, end, sp) { const n = nFaccia(D, x, end), s = sp || 0; o.position.set(x + Math.sin(n) * s, y, zFaccia(D, x, end) + end * Math.cos(n) * s); o.rotation.y = end > 0 ? n : PI - n; return o; }
  // il percorso del paraurti in pianta: dal fianco destro, attorno all'angolo, sulla faccia, all'altro fianco.
  // Sul fianco sta dentro la sagoma (non allarga il mezzo), davanti sporge di 7/10 dello spessore.
  function percorsoParaurti(D, end, t, wrap) {
    const T = D.top, zE = end > 0 ? T[0][0] : T[T.length - 1][0], rc = Math.max(end > 0 ? D.rf : D.rr, t * 1.5 + .03), hw0 = D.W / 2, gF = -.3 * t, gS = -t - .006, P = [];
    P.push([hw0 + gS, zE - end * Math.max(wrap, rc + .02)]);
    for (let k = 0; k <= 6; k++) { const th = k / 6 * PI / 2, R = rc + lerp(gS, gF, Math.sin(th) * Math.sin(th)) /* sin²: all angolo il paraurti non esce dal fianco */; P.push([hw0 - rc + R * Math.cos(th), zE - end * rc + end * R * Math.sin(th)]); }
    const half = P.slice(); for (let k = half.length - 1; k >= 0; k--) P.push([-half[k][0], half[k][1]]);
    return P;
  }
  function paraurti(g, D, end, pr, ud, nT) {
    const T = D.top, zE = end > 0 ? T[0][0] : T[T.length - 1][0], path = percorsoParaurti(D, end, pr.t, pr.wrap), out = [0, zE - end * 1.5];
    const geo = nastro(path, pr.y, pr.h, pr.t, out), c = new THREE.Vector3(); geo.computeBoundingBox(); geo.boundingBox.getCenter(c); geo.translate(-c.x, -c.y, -c.z);
    const m = M(g, geo, pr.tipo === 'cromo' ? C.cromo : mat(pr.col || '#1c1c20', 'plastica'), c.x, c.y, c.z);
    if (pr.tipo === 'cromo') { const s = nastro(path, pr.y + pr.h * .3, pr.h * .34, pr.t + .014, out); s.translate(-c.x, -c.y, -c.z); m.add(new THREE.Mesh(s, C.nero)); }   // la gomma nera sulla lama
    if (pr.tipo !== 'cromo' && pr.h > .15) { const s = nastro(path, pr.y + pr.h * .55, .018, pr.t + .006, out); s.translate(-c.x, -c.y, -c.z); m.add(new THREE.Mesh(s, C.scuro)); }   // la riga in rilievo
    if (end > 0 && !pr.noTarga) {   // la targa davanti, sul paraurti
      const tg = new THREE.Mesh(BX(.36, .1, .008), targa(false, nT)), y = pr.h > .15 ? pr.y + pr.h * .5 : pr.y - .06; tg.position.set(-c.x, y - c.y, zE + .7 * pr.t + .004 - c.z); m.add(tg);
      if (pr.h <= .15) { const st = new THREE.Mesh(BX(.2, .06, .01), C.nero); st.position.set(-c.x, pr.y - .02 - c.y, zE + .7 * pr.t - .002 - c.z); m.add(st); }
    }
    return m;
  }
  // fari e fanali: gruppi con la faccia verso +z
  function faroTondo(r, cornice) { const o = new THREE.Group(), lens = M(o, CY(r, r * .96, .03, 12), C.faro, 0, 0, .014, PI / 2); M(o, new THREE.TorusGeometry(r + .006, .01, 3, 10), cornice || C.cromo, 0, 0, .022); o.userData.lente = lens; return o; }
  function faroRett(w, h, cornice) { const o = new THREE.Group(), lens = M(o, BX(w, h, .026), C.faro, 0, 0, .013); M(o, BX(w + .026, h + .026, .02), cornice || C.nero, 0, 0, 0); M(o, BX(w * .02, h, .028), C.cromo, 0, 0, .014); o.userData.lente = lens; return o; }
  // un fanale a settori: parti = 'frb' (freccia, rosso di posizione/stop, retromarcia), in fila lungo x (o in colonna con vert)
  function fanale(w, h, parti, tl, vert) {
    const o = new THREE.Group(), n = parti.length; let red = null;
    M(o, BX(w + .02, h + .02, .02), C.nero, 0, 0, 0);
    for (let i = 0; i < n; i++) { const p = parti[i], m = p === 'r' ? tl : p === 'f' ? C.freccia : p === 'b' ? C.retro : C.rosso, sw = vert ? w : w / n, sh = vert ? h / n : h;
      const q = M(o, BX(sw - .006, sh - .006, .026), m, vert ? 0 : -w / 2 + sw * (i + .5), vert ? h / 2 - sh * (i + .5) : 0, .012); if (p === 'r' && !red) red = q; }
    o.userData.rosso = red; return o;
  }
  function griglia(w, h, n, barre, vert) {   // il fondo nero e le barre (orizzontali o verticali)
    const o = new THREE.Group(); M(o, BX(w, h, .02), C.scuro, 0, 0, 0);
    for (let i = 0; i < n; i++) { const t = (i + .5) / n; if (vert) M(o, BX(.012, h - .01, .02), barre || C.nero, -w / 2 + w * t, 0, .012); else M(o, BX(w - .01, .012, .02), barre || C.nero, 0, -h / 2 + h * t, .012); }
    return o;
  }
  function scudetto(h) {   // lo scudetto dell'Alfa: triangolo cromato con la punta in giù, la griglia dentro
    const s = new THREE.Shape(); s.moveTo(-h * .42, h / 2); s.lineTo(h * .42, h / 2); s.quadraticCurveTo(h * .4, 0, 0, -h / 2); s.quadraticCurveTo(-h * .4, 0, -h * .42, h / 2);
    const o = new THREE.Group(), e = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: false }); M(o, e, C.cromo);
    for (let i = 0; i < 4; i++) M(o, BX(h * (.62 - i * .12), .012, .012), C.scuro, 0, h * (.28 - i * .17), .022);
    return o;
  }
  function stemmaFiat(w) { const o = new THREE.Group(); for (let i = 0; i < 5; i++) M(o, BX(w * .09, w * .32, .012), C.cromo, -w * .3 + i * w * .15, 0, 0, 0, 0, -.32); return o; }   // le cinque barre oblique

  // ---------- l'auto ----------
  function auto(D, col, o) {
    o = o || {};
    const alto = new THREE.Group(), basso = new THREE.Group(), paint = vernice(col), glass = vetro(), tl = fanaleMat();
    const ud = { paint: [paint], glass, lamps: [], tails: [], tlMat: tl, wheels: [], front: [], dents: 0, parts: {}, modello: D.id };
    const hw0 = D.W / 2, T = D.top, zf = T[0][0], zr = T[T.length - 1][0], Cb = D.cab, nT = o.targa || 0;
    D.wells = (D.asse || []).map(z => [z, D.R || D.r + .045]); D.porte = D.porte || [[Cb.w0[0] - .05, Cb.w0[0] - 1.1]];
    // scocca e padiglione
    ud.body = M(alto, loft(stazioni(D), { sh: D.sh, tuck: D.tuck || .04, crown: D.crown }), paint);
    const P = padiglione(D, Cb);
    if (P.tetto) M(alto, P.tetto, D.tetto ? mat(D.tetto, 'tela') : paint); if (P.vetro) M(alto, P.vetro, glass); if (P.lun) M(alto, P.lun, glass); if (P.ws) ud.ws = M(alto, P.ws, glass);
    {   // la guarnizione nera dei vetri lungo la cintura e alla base del parabrezza
      const zA = Cb.w0[0] - .02, zE = Math.max(Cb.r0[0] + .02, Cb.S !== undefined && Cb.S !== null ? Cb.S : -99), n = Math.max(1, Math.ceil((zA - zE) / .6));
      for (let i = 0; i < n; i++) { const a = zA - (zA - zE) * i / n, b = zA - (zA - zE) * (i + 1) / n; [-1, 1].forEach(s => lista(alto, [s * (hwAt(D, a) - Cb.inset + .004), ytAt(D, a) - .002, a], [s * (hwAt(D, b) - Cb.inset + .004), ytAt(D, b) - .002, b], .022, .022, C.scuro)); }
      const yw = ytAt(D, Cb.w0[0]); lista(alto, [hwAt(D, Cb.w0[0]) - Cb.inset - .01, yw + .004, Cb.w0[0] - .01], [-(hwAt(D, Cb.w0[0]) - Cb.inset - .01), yw + .004, Cb.w0[0] - .01], .03, .02, C.scuro);
    }
    D.wells.forEach(([z, R]) => {   // il passaruota (mezzo cilindro, sopra) e la sospensione: semiasse e montante che reggono la ruota
      M(alto, new THREE.CylinderGeometry(R - .012, R - .012, D.W - .1, 8, 1, true, 0, PI), passa(), 0, D.r, z, 0, 0, PI / 2);
      [-1, 1].forEach(s => { const xi = s * (hw0 - .045 - (D.cerchi === 'lega' ? .035 : .012)), xm = s * (hw0 - .42); asta(alto, [xi, D.r, z], [xm, D.r, z], .035, C.scuro, 4); asta(alto, [xm, D.r - .03, z], [xm, D.r + R - .02, z], .03, C.scuro, 4); });
    });
    // interni, visti dai vetri: il pianale, i sedili coi poggiatesta, il divano, il cruscotto, il volante
    const zW = Cb.w0[0], zL = Cb.r0[0], yAt = z => ytAt(D, z) + (D.crown || 0) + .004, hb = z => hwAt(D, z) - Cb.inset - .04;
    const zA = zW - .05, zB = Math.max(zL + .1, Cb.r1[0] - .05);
    lista(alto, [0, yAt(zA), zA], [0, yAt(zB), zB], hb((zA + zB) / 2) * 2, .012, C.interno);
    const xs = D.W * .19, zs = zW - (D.sedile || .95), ys = yAt(zs), seatCol = mat(D.interni || '#4a3a30', 'stoffa');
    [-1, 1].forEach(s => {
      const hs = Math.min(.36, P.yR(zs - .12) - ys - .2);   // lo schienale e il poggiatesta restano sotto il tetto
      lista(alto, [s * xs, ys - .006, zs], [s * xs, ys + hs, zs - .12], .42, .1, seatCol);
      M(alto, BX(.24, .13, .08), seatCol, s * xs, ys + hs + .09, zs - .135, -.2);
      asta(alto, [s * xs, ys + hs - .01, zs - .125], [s * xs, ys + hs + .04, zs - .13], .012, C.cromo);
    });
    const zr2 = zs - (D.divano || .85), hd = zr2 > zL ? Math.min(.34, P.yR(zr2 - .1) - yAt(zr2) - .07) : 0; if (zr2 > zL + .05 && hd > .12) lista(alto, [0, yAt(zr2) - .006, zr2], [0, yAt(zr2) + hd, zr2 - .1], hb(zr2) * 2 - .04, .1, seatCol);
    const zd = zW - .17, yd = yAt(zd); M(alto, BX(hb(zd) * 2 - .02, .09, .26), C.nero, 0, yd + .04, zd);
    const zv = zW - .4, yv = yAt(zv) + .2, vol = D.manubrio ? M(alto, CY(.015, .015, .62, 6), C.nero, -xs * 0, yv, zv, 0, 0, PI / 2) : M(alto, new THREE.TorusGeometry(.16, .013, 4, 14), C.nero, -xs, yv, zv, -1.05); if (!D.manubrio) { M(vol, BX(.31, .03, .012), C.nero); M(vol, BX(.03, .14, .012), C.nero, 0, -.07, 0); M(vol, CY(.04, .04, .03, 10), C.nero, 0, 0, 0, PI / 2); }   // il volante con le razze
    asta(alto, [D.manubrio ? 0 : -xs, yv, zv], [D.manubrio ? 0 : -xs, yd + .06, zd - .1], .018, C.nero);
    // porte: le fessure, le maniglie; specchietti, antenna, tappo della benzina
    const linea = (s, z, y0, y1) => M(alto, BX(.006, y1 - y0, .007), C.scuro, s * (hwAt(D, z) + .001), (y0 + y1) / 2, z);
    (D.porte || []).forEach(([a, b], i) => [-1, 1].forEach(s => {
      const y0 = Math.max(ybAt(D, a), ybAt(D, b)) + .04, y1 = Math.min(ytAt(D, a), ytAt(D, b)) - .02;
      linea(s, a, Math.max(ybAt(D, a) + .03, D.sill + .04), ytAt(D, a) - .015); linea(s, b, Math.max(ybAt(D, b) + .03, D.sill + .04), ytAt(D, b) - .015);
      const zh = b + .16, yh = ytAt(D, zh) - .1;
      if (D.maniglia === 'tonda') M(alto, CY(.03, .03, .012, 10), C.nero, s * (hwAt(D, zh) + .004), yh, zh, 0, 0, PI / 2);
      else { M(alto, BX(.012, .028, .13), D.maniglia === 'cromo' ? C.cromo : C.nero, s * (hwAt(D, zh) + .004), yh, zh); }
      void y0; void y1; void i;
    }));
    const zm = zW - .1, ym = ytAt(D, zm);
    [-1, 1].forEach(s => {
      const h = hwAt(D, zm), y0 = ym - D.sh - .02, a = asta(alto, [s * (h - .006), y0, zm], [s * (h + .09), ym + .07, zm - .03], .012, C.nero); a.userData.sporge = true;   // il braccio parte dalla portiera, sotto la spalla
      const sp = M(alto, BX(.12, .085, .06), C.nero, s * (h + .12), ym + .08, zm - .04, 0, s * .15); sp.userData.sporge = true;
      M(sp, BX(.1, .065, .004), mat('#b8c4cc', 'cromo'), 0, 0, -.031);
    });
    if (D.antenna !== false) { const za = D.antenna || zW + .2, xa = hw0 - .14, ya = ytAt(D, za) + (D.crown || 0) * .3; M(alto, CY(.014, .018, .02, 8), C.nero, xa, ya + .008, za); const an = asta(alto, [xa, ya + .015, za], [xa - .02, ya + .78, za - .18], .0035, C.cromo, 4); an.userData.sporge = true; }
    if (D.asse.length > 1) { const zc = D.asse[1] - .05, yc = ytAt(D, zc) - .13; M(alto, CY(.042, .042, .012, 12), paint, -(hwAt(D, zc) + .004), yc, zc, 0, 0, PI / 2); }
    // modanature e fasce sui fianchi
    (D.fasce || []).forEach(f => [-1, 1].forEach(s => {
      const pts = []; for (let z = f.z1; z >= f.z0 - 1e-6; z -= .25) pts.push([s * (hwAt(D, z) - .002), z]); if (pts[pts.length - 1][1] > f.z0) pts.push([s * (hwAt(D, f.z0) - .002), f.z0]);
      M(alto, nastro(pts, f.y, f.h, f.t || .014, [0, (f.z0 + f.z1) / 2]), f.tipo === 'cromo' ? C.cromo : mat(f.col || '#1c1c20', 'plastica'));
    }));
    if (D.archi) D.wells.forEach(([z, R]) => [-1, 1].forEach(s => M(alto, new THREE.TorusGeometry(R + .012, .026, 4, 12, PI), mat(D.archi, 'plastica'), s * (hwAt(D, z) - .005), D.r, z, 0, s * PI / 2, 0)));   // le sopracciglia di plastica sui passaruota
    // paraurti (il davanti è quello che si stacca)
    ud.parts.bumper = paraurti(alto, D, 1, D.paraurti, ud, nT); if (!D.soloCabina) paraurti(alto, D, -1, D.paraurti, ud, nT);
    if (!D.soloCabina) { const ty = D.targaY || ytAt(D, zr) * .5 + D.paraurti.y * .5 + .1, tg = posa(new THREE.Mesh(BX(.52, .115, .008), targa(true, nT)), D, 0, ty, -1, .004); alto.add(tg); M(alto, BX(.14, .02, .03), C.cromo, 0, ty + .075, zr - .012); }   // la targa dietro con la sua lucina
    // tergicristalli: due spazzole (o una) ferme in basso; render.js le fa andare quando piove (ud.wipers)
    {
      const [z0, y0] = Cb.w0, [z1, y1] = Cb.w1, fr = new THREE.Group(); fr.position.set(0, y0 + .03, z0 - .015); fr.rotation.x = Math.atan2(z1 - z0, y1 - y0);
      const hbw = hwAt(D, z0) - Cb.inset, n = D.tergi || 2, len = n === 1 ? hbw * 1.15 : hbw * .82, arms = [];
      (n === 1 ? [-hbw * .1] : [-hbw * .78, -hbw * .02]).forEach(x => {
        const p = new THREE.Group(); p.position.set(x, .02, 0); fr.add(p);
        M(p, BX(len * .92, .012, .016), C.nero, len * .46, 0, .022); M(p, BX(len * .8, .02, .01), C.scuro, len * .52, 0, .01); M(p, CY(.018, .018, .03, 8), C.nero, 0, 0, .02, PI / 2);
        p.rotation.z = .06; arms.push(p);
      });
      fr.userData.keepTree = true; alto.add(fr); ud.wipers = arms;
    }
    // ruote
    const RU = D.ruote || D.asse.flatMap(z => [-1, 1].map(s => [s * (hw0 - D.tw / 2 - .03), z, z > 0]));
    RU.forEach(([x, z, fr]) => {
      const piv = new THREE.Group(); piv.position.set(x, D.r, z); const wh = ruota(D.r, D.tw, D.cerchi || 'acciaio', D.colCerchi, x >= 0 ? 1 : -1); piv.add(wh); alto.add(piv);
      ud.wheels.push({ wh, piv, front: fr, r: D.r });
    });
    // muso e coda: il modello mette fari, griglia, fanali
    const ctx = { g: alto, D, ud, paint, tl, zf, zr, hw0,
      fari(lst) { lst.forEach(([kind, x, y, a, b, cor]) => [-1, 1].forEach(s => { const f = kind === 'tondo' ? faroTondo(a, cor) : faroRett(a, b, cor); posa(f, D, s * x, y, 1, .002); alto.add(f); ud.front.push(f.userData.lente); if (ud.lamps.length < 2 || Math.abs(x) > Math.abs(ud.lamps[0][0])) ud.lamps.push([s * x, y, zFaccia(D, x, 1) + .05]); })); ud.lamps = ud.lamps.slice(-2); },
      frecce(x, y, w, h) { [-1, 1].forEach(s => alto.add(posa(new THREE.Mesh(BX(w, h, .02), C.freccia), D, s * x, y, 1, .006))); },
      fanali(x, y, w, h, parti, vert) { [-1, 1].forEach(s => { const f = fanale(w, h, s > 0 ? parti : [...parti].reverse().join(''), tl, vert); posa(f, D, s * x, y, -1, .003); alto.add(f); if (f.userData.rosso) ud.tails.push(f.userData.rosso); }); },
      davanti(obj, x, y, sp) { alto.add(posa(obj, D, x || 0, y, 1, sp || .004)); return obj; },
      dietro(obj, x, y, sp) { alto.add(posa(obj, D, x || 0, y, -1, sp || .004)); return obj; },
      sopra(obj, x, z, dy) { obj.position.set(x, ytAt(D, z) + (D.crown || 0) + (dy || 0), z); alto.add(obj); return obj; },
    };
    if (D.muso) D.muso(ctx); if (D.coda) D.coda(ctx); if (D.fianchi) D.fianchi(ctx);
    if (o.livrea) livrea(ctx, o.livrea);
    // sedili per chi guida (render.js ci mette il guidatore) e la portiera che si apre
    ud.seat = [-xs, ys + .02, zs + .12]; ud.seat2 = [xs, ys + .02, zs + .12];
    ud.porta = { hw: hwAt(D, zs), cw: hwAt(D, zs) - Cb.inset - Cb.tumble * .5, zf: D.porte[0][0] - .02, zb: D.porte[0][1] + .02, yb: D.sill + .06, yt: ytAt(D, zs), yw: P.yR(zs) - .05 };
    ud.len = D.L;
    // ---- il livello basso: poche facce, stessa vernice ----
    M(basso, loft(stazioniBasse(D), { sh: D.sh, tuck: 0, crown: D.crown, basso: true }), paint);
    const Pb = padiglione(D, Cb, true); if (Pb.tetto) M(basso, Pb.tetto, paint); if (Pb.vetro) M(basso, Pb.vetro, C.vetroscuro);
    RU.forEach(([x, z]) => M(basso, CY(D.r, D.r, D.tw, 6), C.gomma, x, D.r, z, 0, 0, PI / 2));
    [-1, 1].forEach(s => { M(basso, BX(.2, .12, .03), C.faro, s * (hw0 - .25), ud.lamps[0] ? ud.lamps[0][1] : .6, zf + .01); if (!D.soloCabina) M(basso, BX(.22, .1, .03), tl, s * (hw0 - .25), .65, zr - .01); });
    M(basso, BX(D.W + .02, D.paraurti.h, .1), mat(D.paraurti.tipo === 'cromo' ? '#d4d6dc' : (D.paraurti.col || '#1c1c20'), D.paraurti.tipo === 'cromo' ? 'cromo' : 'plastica'), 0, D.paraurti.y + D.paraurti.h / 2, zf + .02);
    if (!D.soloCabina) M(basso, BX(D.W + .02, D.paraurti.h, .1), mat(D.paraurti.tipo === 'cromo' ? '#d4d6dc' : (D.paraurti.col || '#1c1c20'), D.paraurti.tipo === 'cromo' ? 'cromo' : 'plastica'), 0, D.paraurti.y + D.paraurti.h / 2, zr - .02);
    return { alto, basso, ud, ctx, P };
  }
  function stazioniBasse(D) {
    const T = D.top, zf = T[0][0], zr = T[T.length - 1][0], Z = new Set([zf, zr, zf - D.rf * .5, zr + D.rr * .5]);
    T.forEach(p => Z.add(p[0])); D.wells.forEach(([z, R]) => { Z.add(z - R); Z.add(z); Z.add(z + R); });
    return [...Z].filter(z => z <= zf && z >= zr).sort((a, b) => a - b).map(z => ({ z, hw: hwAt(D, z), yb: Math.min(ybAt(D, z), ytAt(D, z) - .1), yt: ytAt(D, z) }));
  }
  // livree: la Polizia (fascia bianca con la scritta, barra dei lampeggianti) e la Tutela (fascia scura, due lampeggianti, la scritta)
  function livrea(k, tipo) {
    const D = k.D, g = k.g, za = D.porte[0][0] - .05, zb = D.porte[D.porte.length - 1][1] + .1, zm = (za + zb) / 2, L = za - zb;
    const pol = tipo === 'polizia', m = pol ? scritta('POLIZIA', '#f2f2ee', '#1c3a78', 512, 48) : scritta('TUTELA', '#2a3340', '#e8e2cc', 512, 48);
    [-1, 1].forEach(s => { const p = M(g, new THREE.PlaneGeometry(L, .16), m, s * (hwAt(D, zm) + .006), ytAt(D, zm) - .2, zm, 0, s * PI / 2, 0); void p; });
    if (pol) { [-1, 1].forEach(s => M(g, BX(.008, .03, L + .3), mat('#f2f2ee', 'plastica'), s * (hwAt(D, zm) + .005), ytAt(D, zm) - .09, zm)); }
    const zr = (D.cab.w1[0] + D.cab.r1[0]) / 2, yr = k.D.cab.w1[1] + .02;
    const b1 = new THREE.MeshBasicMaterial({ color: '#10204a', toneMapped: false }), b2 = new THREE.MeshBasicMaterial({ color: '#10204a', toneMapped: false });
    if (pol) {
      M(g, BX(1.12, .08, .26), mat('#e8e8ea', 'plastica'), 0, yr + .06, zr); [-1, 1].forEach(s => { M(g, BX(.06, .05, .18), C.nero, s * .4, yr + .005, zr); });
      M(g, BX(.3, .16, .22), b1, -.38, yr + .17, zr); M(g, BX(.3, .16, .22), b2, .38, yr + .17, zr);
      M(g, BX(.4, .1, .2), scritta('POLIZIA', '#f2f2ee', '#1c3a78', 128, 32), 0, yr + .15, zr);
    } else {
      M(g, BX(.9, .05, .2), C.nero, 0, yr + .04, zr); M(g, CY(.09, .1, .14, 10), b1, -.3, yr + .13, zr); M(g, CY(.09, .1, .14, 10), b2, .3, yr + .13, zr);
      M(g, BX(.34, .1, .02), scritta('ALT', '#c8202a', '#f4f0e6', 64, 32), 0, yr + .1, zr + .08);
    }
    k.ud.beacons = [b1, b2];
  }
  // ---------- i modelli: misure vere (lunghezza coi paraurti, larghezza della scocca, passo, ruote) ----------
  // top: il filo superiore della scocca da muso a coda [z, y]; cab: il padiglione; asse: z degli assali; porte: [davanti, dietro]
  const AUTO = {};
  // Fiat 126 Personal (1976-87): la bombata a motore dietro, fari rettangolari stondati, paraurti neri, griglie del motore sul cofano dietro
  AUTO.f126 = () => { const zf = 1.5, zr = -1.5; return {
    id: 'f126', nome: 'Fiat 126', L: 3.08, W: 1.38, r: .265, tw: .135, asse: [.97, -.87], R: .31, sill: .25, ybF: .33, ybR: .35, rf: .24, rr: .22, sh: .1, tuck: .05, crown: .035,
    top: [[zf, .5], [zf - .02, .6], [zf - .09, .69], [zf - .25, .75], [.95, .79], [.62, .81], [-.98, .845], [-1.13, .835], [-1.32, .78], [zr + .06, .7], [zr, .56]],
    cab: { w0: [.62, .81], w1: [.15, 1.3], r1: [-.56, 1.32], r0: [-.98, .845], inset: .075, tumble: .13, B: [-.3], S: -.86, pw: .05, crown: .03 },
    porte: [[.58, -.3]], paraurti: { y: .28, h: .13, t: .06, wrap: .3 }, cerchi: 'acciaio', colCerchi: '#c4c6ca', sedile: .82, divano: .6, interni: '#3a3a3e', antenna: .95,
    muso(k) { k.fari([['rett', .43, .62, .17, .12, k.paint]]); k.frecce(.4, .49, .08, .05); const b = k.davanti(new THREE.Group(), 0, .58); M(b, BX(.5, .05, .015), C.nero, 0, 0, 0); b.add(stemmaFiat(.1).translateZ(.01)); },
    coda(k) {
      k.fanali(.5, .6, .2, .1, 'frb');
      for (let i = 0; i < 6; i++) { const z = -1.15 - i * .04, y = ytAt(k.D, z) + k.D.crown + .004; M(k.g, BX(.62, .012, .022), C.nero, 0, y, z, Math.atan2(ytAt(k.D, z - .02) - ytAt(k.D, z + .02), .04)); }   // le griglie del motore
    } }; };
  // Fiat Panda 30/45 (1980): tutta piatta, vetri dritti, la fascia grigia tutt'attorno, griglia asimmetrica
  AUTO.panda = () => { const zf = 1.63, zr = -1.63; return {
    id: 'panda', nome: 'Fiat Panda', L: 3.38, W: 1.46, r: .28, tw: .145, asse: [1.11, -1.05], R: .32, sill: .27, ybF: .3, ybR: .32, rf: .07, rr: .06, sh: .04, tuck: .03, crown: .012,
    top: [[zf, .5], [zf, .77], [zf - .04, .8], [.8, .87], [-1.56, .93], [zr, .91], [zr, .5]],
    cab: { w0: [.8, .87], w1: [.1, 1.43], r1: [-1.48, 1.45], r0: [-1.585, .93], inset: .045, tumble: .05, B: [-.3], S: -1.36, pw: .05, crown: .01 },
    porte: [[.76, -.3]], paraurti: { y: .26, h: .22, t: .075, wrap: .42, col: '#55565a' }, fasce: [{ y: .29, h: .15, z0: -.68, z1: .74, col: '#55565a', t: .016 }],
    cerchi: 'acciaio', colCerchi: '#d0d0d4', interni: '#5a5a52', divano: .9, tergi: 2,
    muso(k) { const p = k.davanti(new THREE.Group(), 0, .675); M(p, BX(1.36, .17, .018), C.scuro, 0, 0, 0); k.fari([['rett', .56, .675, .17, .13]]); const gr = griglia(.5, .12, 5); gr.position.set(-.2, 0, .012); p.add(gr); M(p, BX(.16, .035, .01), C.cromo, .22, .03, .012); k.frecce(.52, .41, .1, .05); },
    coda(k) { k.fanali(.63, .63, .12, .22, 'rfb', true); M(k.g, BX(.14, .03, .03), C.nero, 0, .86, -1.635); } }; };
  // Fiat 127 terza serie (1981): due volumi col portellone inclinato, fari rettangolari grandi, paraurti neri
  AUTO.f127 = () => { const zf = 1.765, zr = -1.765; return {
    id: 'f127', nome: 'Fiat 127', L: 3.62, W: 1.53, r: .275, tw: .145, asse: [1.19, -1.04], R: .315, sill: .27, ybF: .3, ybR: .32, rf: .1, rr: .1, sh: .06, tuck: .04, crown: .02,
    top: [[zf, .5], [zf, .7], [zf - .06, .73], [.72, .84], [-1.62, .9], [zr, .86], [zr, .52]],
    cab: { w0: [.72, .84], w1: [.02, 1.34], r1: [-.92, 1.36], r0: [-1.64, .9], inset: .055, tumble: .1, B: [-.36], S: -1.08, pw: .055, crown: .02 },
    porte: [[.68, -.36]], paraurti: { y: .28, h: .15, t: .065, wrap: .32 }, fasce: [{ y: .55, h: .04, z0: -1.4, z1: 1.45 }], cerchi: 'coppa', interni: '#3e3630', divano: .85,
    muso(k) { k.fari([['rett', .5, .6, .24, .14]]); const gr = k.davanti(griglia(.64, .14, 4), 0, .6); gr.add(stemmaFiat(.1).translateZ(.02)); k.frecce(.55, .44, .1, .045); },
    coda(k) { k.fanali(.55, .62, .3, .12, 'frb'); } }; };
  // Fiat Uno (1983): alta e squadrata, un solo tergicristallo, fari larghi e sottili, paraurti neri grandi
  AUTO.uno = () => { const zf = 1.77, zr = -1.77; return {
    id: 'uno', nome: 'Fiat Uno', L: 3.64, W: 1.55, r: .275, tw: .155, asse: [1.2, -1.16], R: .32, sill: .27, ybF: .3, ybR: .32, rf: .1, rr: .07, sh: .055, tuck: .04, crown: .022,
    top: [[zf, .52], [zf, .7], [zf - .07, .73], [.84, .86], [-1.64, .94], [zr, .91], [zr, .52]],
    cab: { w0: [.84, .86], w1: [.02, 1.42], r1: [-1.4, 1.44], r0: [-1.69, .94], inset: .05, tumble: .08, B: [-.42], S: -1.18, pw: .06, crown: .025 },
    porte: [[.8, -.42]], paraurti: { y: .27, h: .2, t: .07, wrap: .45 }, fasce: [{ y: .5, h: .05, z0: -.75, z1: .8 }], cerchi: 'acciaio', colCerchi: '#c4c5c9', interni: '#45403c', tergi: 1, divano: .9,
    muso(k) { k.fari([['rett', .52, .61, .27, .12]]); const gr = k.davanti(griglia(.72, .12, 5), 0, .61); gr.add(stemmaFiat(.11).translateX(.2).translateZ(.02)); k.frecce(.6, .52, .08, .05); },
    coda(k) { k.fanali(.63, .66, .14, .26, 'rfb', true); } }; };
  // Fiat Ritmo seconda serie (1982): tonda, quattro fari tondi, grandi paraurti grigi avvolgenti, maniglie tonde
  AUTO.ritmo = () => { const zf = 1.9, zr = -1.9; return {
    id: 'ritmo', nome: 'Fiat Ritmo', L: 3.92, W: 1.65, r: .285, tw: .16, asse: [1.24, -1.19], R: .33, sill: .28, ybF: .3, ybR: .3, rf: .16, rr: .12, sh: .09, tuck: .05, crown: .03,
    top: [[zf, .52], [zf - .015, .68], [zf - .1, .74], [.8, .87], [-1.7, .92], [zr, .88], [zr, .52]],
    cab: { w0: [.8, .87], w1: [.06, 1.37], r1: [-1.1, 1.39], r0: [-1.75, .93], inset: .065, tumble: .11, B: [-.3], S: -1.25, pw: .06, crown: .03 },
    porte: [[.76, -.3], [-.3, -1.22]], paraurti: { y: .26, h: .26, t: .09, wrap: .55, col: '#3e3f44' }, maniglia: 'tonda', cerchi: 'coppa', interni: '#3a3836',
    muso(k) { k.fari([['tondo', .56, .63, .085], ['tondo', .37, .63, .07]]); k.davanti(griglia(.5, .13, 4), 0, .63).add(stemmaFiat(.1).translateZ(.02)); k.frecce(.62, .5, .1, .04); },
    coda(k) { k.fanali(.56, .63, .32, .13, 'frb'); } }; };
  // Lancia Delta (1979): il cuneo di Giugiaro, spigoli vivi, montante dietro largo, griglia a barre verticali con lo scudo
  AUTO.delta = () => { const zf = 1.895, zr = -1.895; return {
    id: 'delta', nome: 'Lancia Delta', L: 3.89, W: 1.62, r: .28, tw: .165, asse: [1.24, -1.23], R: .325, sill: .28, ybF: .3, ybR: .3, rf: .08, rr: .06, sh: .04, tuck: .04, crown: .015,
    top: [[zf, .52], [zf, .68], [zf - .07, .7], [.78, .86], [-1.66, .92], [zr, .89], [zr, .52]],
    cab: { w0: [.78, .86], w1: [-.02, 1.36], r1: [-1.02, 1.37], r0: [-1.73, .93], inset: .06, tumble: .1, B: [-.32], S: -1.14, pw: .06, crown: .015 },
    porte: [[.74, -.32], [-.32, -1.16]], paraurti: { y: .28, h: .16, t: .07, wrap: .38 }, fasce: [{ y: .5, h: .07, z0: -1.55, z1: 1.55 }], cerchi: 'lega', colCerchi: '#9a9ca2', interni: '#3a3228',
    muso(k) { k.fari([['rett', .56, .6, .25, .13]]); const gr = k.davanti(griglia(.82, .13, 9, C.cromo, true), 0, .6); const sc = new THREE.Mesh(BX(.1, .16, .02), C.cromo); sc.position.z = .02; gr.add(sc); k.frecce(.6, .45, .1, .05); },
    coda(k) { k.fanali(.52, .66, .38, .14, 'frrb'); } }; };
  // Alfa Romeo 33 (1983): cuneo basso col sedere alto, fari sottili, lo scudetto
  AUTO.alfa33 = () => { const zf = 1.955, zr = -1.955; return {
    id: 'alfa33', nome: 'Alfa 33', L: 4.01, W: 1.61, r: .28, tw: .165, asse: [1.24, -1.22], R: .325, sill: .29, ybF: .32, ybR: .32, rf: .08, rr: .06, sh: .05, tuck: .04, crown: .02,
    top: [[zf, .5], [zf - .01, .63], [zf - .09, .66], [.8, .84], [-1.55, .92], [-1.82, .965], [zr, .95], [zr, .52]],
    cab: { w0: [.8, .84], w1: [-.02, 1.33], r1: [-.92, 1.35], r0: [-1.55, .92], inset: .06, tumble: .1, B: [-.35], S: -1.05, pw: .06, crown: .02 },
    porte: [[.76, -.35], [-.35, -1.12]], paraurti: { y: .3, h: .14, t: .07, wrap: .38 }, fasce: [{ y: .52, h: .05, z0: -1.6, z1: 1.6 }], cerchi: 'lega', colCerchi: '#8e9096', interni: '#2e2e30',
    muso(k) { k.fari([['rett', .53, .56, .3, .1]]); [-1, 1].forEach(s => k.davanti(griglia(.2, .08, 3), s * .22, .55)); k.davanti(scudetto(.17), 0, .52, .006); k.frecce(.62, .44, .08, .04); },
    coda(k) { k.fanali(.48, .8, .42, .12, 'frb'); } }; };
  // Alfa Romeo Giulietta (1977): berlina a cuneo con la coda tronca e alta
  AUTO.giulietta = () => { const zf = 2.05, zr = -2.05; return {
    id: 'giulietta', nome: 'Alfa Giulietta', L: 4.21, W: 1.65, r: .285, tw: .165, asse: [1.3, -1.21], R: .33, sill: .29, ybF: .32, ybR: .33, rf: .07, rr: .05, sh: .05, tuck: .04, crown: .02,
    top: [[zf, .54], [zf - .02, .67], [zf - .12, .7], [.86, .86], [-1.3, .96], [-1.96, 1.0], [zr, .99], [zr, .56]],
    cab: { w0: [.86, .86], w1: [.18, 1.36], r1: [-.72, 1.38], r0: [-1.32, .96], inset: .07, tumble: .11, B: [-.2], S: -.96, pw: .065, crown: .02 },
    porte: [[.82, -.2], [-.2, -1.06]], paraurti: { y: .3, h: .15, t: .08, wrap: .42 }, fasce: [{ y: .6, h: .022, z0: -1.8, z1: 1.8, tipo: 'cromo', t: .01 }], cerchi: 'lega', colCerchi: '#a0a2a6', interni: '#4a3a2a',
    muso(k) { [-1, 1].forEach(s => k.davanti(new THREE.Mesh(BX(.36, .14, .02), C.scuro), s * .52, .6)); k.fari([['tondo', .62, .6, .068], ['tondo', .43, .6, .068]]); [-1, 1].forEach(s => k.davanti(griglia(.12, .1, 3, C.cromo), s * .16, .58)); k.davanti(scudetto(.2), 0, .56, .006); k.frecce(.66, .45, .1, .04); },
    coda(k) { k.fanali(.5, .82, .42, .16, 'frrb'); } }; };
  // Fiat 131 seconda serie (1978): tre volumi squadrati, cofano piatto, fari rettangolari grandi
  AUTO.f131 = () => { const zf = 2.075, zr = -2.075; return {
    id: 'f131', nome: 'Fiat 131', L: 4.26, W: 1.65, r: .285, tw: .165, asse: [1.27, -1.22], R: .33, sill: .29, ybF: .32, ybR: .33, rf: .06, rr: .05, sh: .045, tuck: .04, crown: .015,
    top: [[zf, .55], [zf, .78], [zf - .06, .8], [.88, .86], [-1.26, .9], [-1.98, .92], [zr, .9], [zr, .56]],
    cab: { w0: [.88, .86], w1: [.25, 1.38], r1: [-.78, 1.39], r0: [-1.28, .9], inset: .06, tumble: .09, B: [-.18], S: -.9, pw: .06, crown: .015 },
    porte: [[.84, -.18], [-.18, -1.02]], paraurti: { y: .3, h: .17, t: .08, wrap: .42 }, fasce: [{ y: .56, h: .05, z0: -1.85, z1: 1.85 }], cerchi: 'coppa', interni: '#3a3632', maniglia: 'cromo',
    muso(k) { k.fari([['rett', .6, .66, .26, .15]]); k.davanti(griglia(.82, .14, 5, C.cromo), 0, .66).add(stemmaFiat(.12).translateZ(.022)); k.frecce(.62, .49, .1, .05); },
    coda(k) { k.fanali(.5, .7, .42, .14, 'frrb'); } }; };
  // Alfa Romeo Alfetta (serie 1984): la berlina delle volanti, quattro fari tondi, coda alta, paraurti cromati con la gomma
  AUTO.alfetta = () => { const zf = 2.09, zr = -2.09; return {
    id: 'alfetta', nome: 'Alfa Alfetta', L: 4.28, W: 1.64, r: .285, tw: .165, asse: [1.28, -1.23], R: .33, sill: .29, ybF: .32, ybR: .33, rf: .07, rr: .05, sh: .05, tuck: .04, crown: .02,
    top: [[zf, .55], [zf - .015, .69], [zf - .1, .72], [.86, .87], [-1.28, .94], [-1.98, .97], [zr, .95], [zr, .56]],
    cab: { w0: [.86, .87], w1: [.22, 1.4], r1: [-.74, 1.42], r0: [-1.3, .94], inset: .07, tumble: .11, B: [-.18], S: -.92, pw: .065, crown: .02 },
    porte: [[.82, -.18], [-.18, -1.04]], paraurti: { y: .32, h: .1, t: .07, wrap: .38, tipo: 'cromo' }, fasce: [{ y: .58, h: .04, z0: -1.9, z1: 1.9 }], cerchi: 'lega', colCerchi: '#9a9ca0', interni: '#2e2a28', maniglia: 'cromo',
    muso(k) { k.davanti(griglia(1.36, .16, 4), 0, .62); k.fari([['tondo', .6, .62, .072], ['tondo', .42, .62, .066]]); k.davanti(scudetto(.2), 0, .58, .012); k.frecce(.66, .45, .1, .04); },
    coda(k) { k.fanali(.52, .74, .36, .14, 'frb'); } }; };
  const ALTRI = {};

  // ================= scelta e costruzione =================
  const COSTR = {};   // id → (colore, opzioni) → { alto, basso, ud }
  for (const id in AUTO) COSTR[id] = (col, o) => auto(AUTO[id](), col, o);
  //@@ALTRI@@
  // per ogni tipo di mezzo del gioco (VK) i modelli che ci stanno dentro (entro il 5% di lunghezza e larghezza)
  const VARIANTI = { cinquecento: ['f126', 'f126', 'panda'], ritmo: ['ritmo', 'f127', 'uno', 'uno', 'delta'], giulia: ['giulietta', 'alfa33', 'f131'], polizia: ['alfetta', 'f131'],
    furgone: ['ducato', 'om'], fuoristrada: ['campagnola'], campagnola: ['campagnola'], camion: ['rifiuti', 'cassonato', 'telonato'], blindato: ['blindato'], ape: ['ape'], vespa: ['vespa'], bmx: ['bmx'] };
  function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }
  function scegli(v) {
    const k = v.kind, h = hash(v.id);
    if (k === 'polizia') return v.livrea ? 'f131' : 'alfetta';
    if (k === 'camion') return v.military || v.tutela ? 'telonato' : ['rifiuti', 'cassonato'][h % 2];
    if (k === 'furgone') return h % 3 === 2 ? 'om' : 'ducato';
    const L = VARIANTI[k]; if (L) return L[h % L.length];
    return null;
  }
  // il mezzo di quel record del gioco: colore d'epoca per i privati, livree per Polizia e Tutela, mimetico per i Grigi
  function perVeicolo(v) {
    const id = scegli(v); if (!id || !COSTR[id]) return null;
    const pub = v.police || v.livrea || v.military || v.tutela, col = pub || v.kind === 'bmx' ? (v.color || '#6c7684') : epoca(v.color || '#e9e4d6');
    return costruisci(id, col, { livrea: v.livrea ? 'tutela' : v.police ? 'polizia' : null, military: !!(v.military || v.tutela), targa: hash(v.id), seme: hash(v.id) });
  }
  function costruisci(id, col, o) { const f = COSTR[id]; if (!f) return null; const r = f(col, o || {}); r.ud.modello = id; return r; }
  const MODELLI = {}; for (const id in AUTO) { const D = AUTO[id](); MODELLI[id] = { nome: D.nome, L: D.L, W: D.W, tipo: 'auto' }; }
  for (const id in ALTRI) MODELLI[id] = { nome: ALTRI[id].nome, L: ALTRI[id].L, W: ALTRI[id].W, tipo: ALTRI[id].tipo };
  return { costruisci, scegli, perVeicolo, epoca, MODELLI, VARIANTI, get ids() { return Object.keys(COSTR); },
    __core: { mat, C, nastro, loft, padiglione, ruota, ytAt, hwAt } };
})();
