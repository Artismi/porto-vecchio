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
      if (!D.noSosp) [-1, 1].forEach(s => { const xi = s * (hw0 - D.tw / 2 - .03 + D.tw / 2 + ({ camion: -.01, lega: -.045, coppa: -.015 }[D.cerchi] || -.02)), xm = s * (hw0 - .42); asta(alto, [xi, D.r, z], [xm, D.r, z], .035, C.scuro, 4); asta(alto, [xm, D.r - .03, z], [xm, D.r + R - .02, z], .03, C.scuro, 4); });
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
    const zv = zW - .4, yv = yAt(zv) + .2, vol = D.manubrio ? M(alto, CY(.015, .015, .62, 6), C.nero, -xs * 0, yv, zv, 0, 0, PI / 2) : M(alto, new THREE.TorusGeometry(.16, .013, 4, 14), C.nero, xs, yv, zv, -1.05); if (!D.manubrio) { M(vol, BX(.31, .03, .012), C.nero); M(vol, BX(.03, .14, .012), C.nero, 0, -.07, 0); M(vol, CY(.04, .04, .03, 10), C.nero, 0, 0, 0, PI / 2); }   // il volante con le razze
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
    ud.seat = [xs, ys + .02, zs + .12]; ud.seat2 = [-xs, ys + .02, zs + .12];   // guida a sinistra (+x: col muso verso +z, la destra è -x)
    ud.porta = { hw: hwAt(D, zs), cw: hwAt(D, zs) - Cb.inset - Cb.tumble * .5, zf: D.porte[0][0] - .02, zb: D.porte[0][1] + .02, yb: D.sill + .06, yt: ytAt(D, zs), yw: P.yR(zs) - .05 };
    ud.len = D.L;
    // ---- il livello basso: poche facce, stessa vernice ----
    M(basso, loft(stazioniBasse(D), { sh: D.sh, tuck: 0, crown: D.crown, basso: true }), paint);
    const Pb = padiglione(D, Cb, true); if (Pb.tetto) M(basso, Pb.tetto, paint); if (Pb.vetro) M(basso, Pb.vetro, C.vetroscuro);
    RU.forEach(([x, z]) => M(basso, CY(D.r, D.r, D.tw, 6), C.gomma, x, D.r, z, 0, 0, PI / 2)); D.asse.forEach(z => M(basso, CY(.05, .05, D.W - .1, 5), C.scuro, 0, D.r, z, 0, 0, PI / 2));   // gli assali tengono le ruote
    [-1, 1].forEach(s => { M(basso, BX(.2, .12, .03), C.faro, s * (hw0 - .25), ud.lamps[0] ? ud.lamps[0][1] : .6, zf + .01); if (!D.soloCabina) M(basso, BX(.22, .1, .03), tl, s * (hw0 - .25), .65, zr - .01); });
    M(basso, BX(D.W + .02, D.paraurti.h, .1), mat(D.paraurti.tipo === 'cromo' ? '#d4d6dc' : (D.paraurti.col || '#1c1c20'), D.paraurti.tipo === 'cromo' ? 'cromo' : 'plastica'), 0, D.paraurti.y + D.paraurti.h / 2, zf + .02);
    if (!D.soloCabina) M(basso, BX(D.W + .02, D.paraurti.h, .1), mat(D.paraurti.tipo === 'cromo' ? '#d4d6dc' : (D.paraurti.col || '#1c1c20'), D.paraurti.tipo === 'cromo' ? 'cromo' : 'plastica'), 0, D.paraurti.y + D.paraurti.h / 2, zr - .02);
    return { alto, basso, ud, ctx, P };
  }
  function stazioniBasse(D) {
    const T = D.top, zf = T[0][0], zr = T[T.length - 1][0], Z = new Set([zf, zr, zf - D.rf * .5, zr + D.rr * .5]);
    T.forEach(p => Z.add(p[0])); D.wells.forEach(([z, R]) => { Z.add(z - R); Z.add(z); Z.add(z + R); });
    return [...Z].filter(z => z <= zf && z >= zr).sort((a, b) => a - b).map(z => ({ z, hw: hwAt(D, z), yb: Math.min(D.sill + (z > zf - .16 ? D.ybF - D.sill : z < zr + .16 ? D.ybR - D.sill : 0), ytAt(D, z) - .1), yt: ytAt(D, z) }));
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
  // [scorci] Fiat Nuova 500 (1957-75): la bombatissima, il muso tondo senza griglia coi fari tondi sui parafanghi e i baffi cromati,
  // i paraurti sottili cromati, il lunotto piccolo e il cofano del motore dietro con le feritoie. Nel 1986 c'è ancora, in sosta nei vicoli.
  AUTO.f500 = () => { const zf = 1.46, zr = -1.48; return {
    id: 'f500', nome: 'Fiat 500', L: 2.97, W: 1.32, r: .255, tw: .125, asse: [.92, -.92], R: .3, sill: .25, ybF: .36, ybR: .36, rf: .32, rr: .3, sh: .14, tuck: .06, crown: .05,
    top: [[zf, .47], [zf - .03, .56], [zf - .12, .64], [zf - .3, .7], [.85, .74], [.6, .76], [-.92, .8], [-1.1, .78], [-1.3, .7], [zr + .05, .6], [zr, .5]],
    cab: { w0: [.6, .76], w1: [.18, 1.29], r1: [-.58, 1.31], r0: [-.96, .8], inset: .09, tumble: .17, B: [-.26], S: -.86, pw: .045, crown: .05 },
    porte: [[.56, -.26]], paraurti: { y: .3, h: .045, t: .035, wrap: .22, tipo: 'cromo' }, cerchi: 'coppa', colCerchi: '#c4c6ca', sedile: .8, divano: .55, interni: '#7a3a2a', antenna: false,
    muso(k) { k.fari([['tondo', .47, .58, .07]]); const b = k.davanti(new THREE.Group(), 0, .5); [-1, 1].forEach(s => M(b, BX(.13, .022, .02), C.cromo, s * .08, 0, .006, 0, 0, s * .2)); b.add(stemmaFiat(.07).translateZ(.012)); k.frecce(.42, .44, .05, .035); },   // i baffi cromati e lo stemma
    coda(k) {
      k.fanali(.5, .58, .07, .12, 'frb');
      for (let i = 0; i < 7; i++) { const z = -1.2 - i * .035, y = ytAt(k.D, z) + k.D.crown + .004; M(k.g, BX(.42, .012, .018), C.nero, 0, y, z, Math.atan2(ytAt(k.D, z - .02) - ytAt(k.D, z + .02), .04)); }   // le feritoie del cofano del motore
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
  // Fiat Ducato (1981): muso corto inclinato, tetto alto, porta scorrevole, porte dietro a due ante coi vetri
  AUTO.ducato = () => { const zf = 2.29, zr = -2.29; return {
    id: 'ducato', nome: 'Fiat Ducato', L: 4.7, W: 1.96, r: .33, tw: .185, asse: [1.53, -1.39], R: .38, sill: .4, ybF: .44, ybR: .46, rf: .1, rr: .05, sh: .06, tuck: .05, crown: .02,
    top: [[zf, .62], [zf, .96], [zf - .1, 1.0], [1.55, 1.12], [-2.2, 1.2], [zr, 1.18], [zr, .6]],
    cab: { w0: [1.55, 1.12], w1: [.9, 2.12], r1: [-2.272, 2.2], r0: [-2.285, 1.2], inset: .04, tumble: .06, S: .5, pw: .07, crown: .03, lunVetro: false },
    porte: [[1.48, .52]], paraurti: { y: .38, h: .2, t: .08, wrap: .3 }, cerchi: 'acciaio', colCerchi: '#d8d8dc', interni: '#3a3a3c', sedile: .92, divano: 99, antenna: 1.75,
    muso(k) { const p = k.davanti(new THREE.Group(), 0, .83); M(p, BX(1.76, .3, .02), C.scuro, 0, 0, 0); k.fari([['rett', .72, .83, .22, .16]]); const gr = griglia(.9, .2, 6); gr.position.z = .012; p.add(gr); p.add(stemmaFiat(.14).translateZ(.025)); k.frecce(.78, .62, .12, .06); },
    coda(k) {
      const D = k.D; k.fanali(.86, .58, .12, .26, 'rfb', true);
      const ln = (y0, y1, x) => k.g.add(posa(new THREE.Mesh(BX(.008, y1 - y0, .01), C.scuro), D, x, (y0 + y1) / 2, -1, .002));
      ln(.5, 2.1, 0); [-1, 1].forEach(s => { k.g.add(posa(new THREE.Mesh(BX(.62, .42, .012), C.vetroscuro), D, s * .42, 1.72, -1, .004)); k.g.add(posa(new THREE.Mesh(BX(.03, .12, .03), C.nero), D, s * .08, 1.1, -1, .012)); });
      k.g.add(posa(new THREE.Mesh(BX(.52, .115, .008), targa(true, 1)), D, 0, .78, -1, .004));
    },
    fianchi(k) {   // la porta scorrevole sul lato del passeggero, con la guida in alto
      const D = k.D, x = hwAt(D, 0) + .002; [.4, -.62].forEach(z => { M(k.g, BX(.008, 1.2 - .46, .008), C.scuro, x, (1.2 + .46) / 2, z); lista(k.g, [x - D.cab.inset + .004, 1.21, z], [x - D.cab.inset - D.cab.tumble + .006, 1.9, z], .008, .008, C.scuro); });
      lista(k.g, [x - D.cab.inset - D.cab.tumble + .01, 1.86, -.6], [x - D.cab.inset - D.cab.tumble + .01, 1.86, -2.1], .03, .03, C.nero);
      M(k.g, BX(.012, .03, .14), C.nero, x + .004, 1.0, .25);
    } }; };
  // Fiat Campagnola (1974-87): il fuoristrada della Guardia, cassone squadrato, parafanghi piatti, fari tondi nella griglia, capote di tela
  AUTO.campagnola = () => { const zf = 1.97, zr = -1.99; return {
    id: 'campagnola', nome: 'Fiat Campagnola', L: 4.03, W: 1.62, r: .37, tw: .2, asse: [1.18, -1.12], R: .42, sill: .56, ybF: .62, ybR: .62, rf: .05, rr: .05, sh: .04, tuck: .04, crown: .01,
    top: [[zf, .62], [zf, 1.08], [zf - .05, 1.11], [.66, 1.15], [-1.95, 1.15], [zr, 1.12], [zr, .62]],
    cab: { w0: [.66, 1.15], w1: [.56, 1.64], r1: [-1.9, 1.88], r0: [-1.975, 1.16], inset: .04, tumble: .05, B: [-.3], S: -.6, pw: .05, crown: .03 },
    porte: [[.6, -.32]], paraurti: { y: .5, h: .14, t: .06, wrap: .15, col: '#2a2a2a' }, cerchi: 'camion', colCerchi: '#3a3e34', interni: '#2e2e2a', sedile: .85, divano: 99, antenna: -1.6, tergi: 2, maniglia: 'cromo',
    muso(k) {
      const p = k.davanti(griglia(1.0, .34, 9, C.scuro, true), 0, .86); void p;
      k.fari([['tondo', .62, .9, .085]]); k.frecce(.62, .74, .07, .05);
      [-1, 1].forEach(s => { asta(k.g, [s * .5, .5, 1.96], [s * .5, .4, 2.0], .025, C.scuro, 4); });   // i ganci di traino
    },
    coda(k) { k.fanali(.68, .7, .1, .16, 'rf', true); const sc = ruota(.37, .2, 'camion', '#3a3e34', 1, false); sc.position.set(0, ytAt(k.D, 1.3) + k.D.crown + .1, 1.3); sc.rotation.z = PI / 2; k.g.add(sc); },   // la ruota di scorta sul cofano
    opz(D, o) { if (o.military) D.tetto = '#4f553e'; },
    fianchi(k) {   // i parafanghi piatti sporgenti
      const D = k.D; D.asse.forEach(z => [-1, 1].forEach(s => { const x = s * (D.W / 2 + .04); M(k.g, BX(.1, .05, .95), k.paint, x, D.r + D.R + .02, z); M(k.g, BX(.1, .2, .05), k.paint, x, D.r + D.R - .08, z + s * 0 + .46); M(k.g, BX(.1, .2, .05), k.paint, x, D.r + D.R - .08, z - .46); }));
      if (k.D.tetto) [-1, 1].forEach(s => { for (let z = -1.6; z <= .1; z += .85) M(k.g, BX(.01, .7, .03), mat('#3c4232', 'tela'), s * (D.W / 2 - D.cab.inset - .02), 1.5, z); });   // le cuciture della capote
    } }; };
  // l'autobus urbano (Fiat 421, arancio ministeriale): finestrini in fila, tre porte a libro sul lato del marciapiede, la linea sopra il parabrezza
  AUTO.autobus = () => { const zf = 5.36, zr = -5.36, B = []; for (let z = 4.25; z > -4.6; z -= 1.06) B.push(+z.toFixed(2)); return {
    id: 'autobus', nome: 'Autobus', L: 10.8, W: 2.5, r: .48, tw: .28, asse: [3.0, -2.6], R: .56, sill: .32, ybF: .4, ybR: .42, rf: .14, rr: .12, sh: .05, tuck: .04, crown: .01,
    top: [[zf, .42], [zf, 1.15], [zf - .04, 1.2], [-5.3, 1.22], [zr, 1.2], [zr, .42]],
    cab: { w0: [5.33, 1.2], w1: [5.12, 2.86], r1: [-5.22, 2.9], r0: [-5.33, 1.3], inset: .03, tumble: .07, B, bw: .12, S: -5.0, pw: .08, crown: .06 },
    porte: [[5.0, 4.0]], paraurti: { y: .3, h: .22, t: .06, wrap: .3, col: '#2a2a2a' }, cerchi: 'camion', colCerchi: '#c8c8cc', interni: '#5a5a5a', sedile: .95, divano: 99, antenna: false, tergi: 2,
    muso(k) {
      const p = k.davanti(new THREE.Group(), 0, 2.6); M(p, BX(1.7, .28, .1), C.scuro, 0, .2, 0); M(p, BX(1.5, .2, .02), scritta('1  MARINA', '#141414', '#ffb020', 256, 32), 0, .2, .055);   // la linea [vievive] la linea 1
      M(k.g, BX(.05, 1.6, .04), C.scuro, 0, 2.02, k.zf - .08);   // il montante in mezzo al parabrezza
      k.fari([['tondo', 1.0, .72, .085], ['tondo', .78, .72, .085]]); k.davanti(griglia(.9, .22, 5), 0, .7); k.frecce(1.12, .5, .1, .06);
    },
    coda(k) { k.fanali(1.08, .9, .14, .5, 'rrfb', true); k.dietro(griglia(1.4, .5, 8), 0, 1.3); k.dietro(new THREE.Mesh(BX(.5, .115, .008), targa(true, 2)), 0, .62); },
    fianchi(k) {
      const D = k.D, dark = C.vetroscuro;
      // [vievive] le porte a libro sul lato del marciapiede: con la rotazione di render.js (rotation.y = π/2 - ang) +x è la sinistra di chi guida,
      // la destra (il marciapiede) è -x: verificato a schermo (strumenti/vievive_guida.json).
      // Ogni porta ha due ante di vetro col telaio, incernierate ai montanti: ud.porteBus le apre (render.js, vehMondo) quando l'autobus è in fermata
      const ante = []; k.ud.porteBus = ante;
      [[4.95, 4.0], [1.3, .25], [-3.85, -4.9]].forEach(([a, b]) => {
        const zm = (a + b) / 2, x = -(hwAt(D, zm) + .004), L = a - b; M(k.g, BX(.012, 2.3, L), dark, x, .45 + 1.15, zm); M(k.g, BX(.3, .06, L), C.nero, x + .14, .3, zm);   // il vano e il gradino
        [[a, -1], [b, 1]].forEach(([zc, sg]) => { const piv = new THREE.Group(); piv.position.set(x - .02, 0, zc); piv.userData.keepTree = true; const an = new THREE.Group(); piv.add(an);
          M(an, BX(.03, 2.24, L / 2 - .02), mat('#2a2a2a', 'metallo'), 0, .45 + 1.12, sg * (L / 4)); M(an, BX(.036, 1.7, L / 2 - .14), C.vetroscuro, 0, .45 + 1.25, sg * (L / 4)); M(an, BX(.04, .03, L / 2 - .1), C.cromo, -.01, 1.5, sg * (L / 4));
          k.g.add(piv); ante.push({ piv, sg }); });
      });
      for (let z = 3.6; z > -4.4; z -= .8) [-1, 1].forEach(s => { if (s < 0 && (Math.abs(z - .78) < .7 || z < -3.6)) return; lista(k.g, [s * .8, 1.23, z], [s * .8, 1.7, z - .1], .7, .08, mat('#7a5a3a', 'plastica')); });   // i sedili in fila
      [1.2, -2.6].forEach(z => M(k.g, BX(.7, .1, .7), mat('#d8d4c8', 'plastica'), 0, 2.97, z));   // i lucernai
      [-1, 1].forEach(s => M(k.g, BX(.01, .12, 8.8), mat('#f2efe6', 'plastica'), s * (D.W / 2 + .004), 1.05, 0));
    } }; };
  const ALTRI = {};
  // ================= I CABINATI: la cabina sopra le ruote davanti, il telaio, le ruote dietro (gemellate sui camion), il cassone =================
  // S: { id, nome, L, Wc (cabina), Wb (cassone), r, tw, zf, zc (dietro la cabina), zr, aF, aR (assali), belt, tetto, sill, yBed, gemelle, cassone, coloreCassone }
  function cabinato(S, col, o) {
    o = o || {};
    const D = { id: S.id, nome: S.nome, L: S.L, W: S.Wc, r: S.r, tw: S.tw, asse: [S.aF], R: S.r + .07, sill: S.sill, ybF: S.sill + .05, ybR: S.sill + .1, rf: .08, rr: .03, sh: .07, tuck: .04, crown: .02,
      top: [[S.zf, S.sill + .08], [S.zf, S.belt - .06], [S.zf - .06, S.belt], [S.zc + .03, S.belt + .01], [S.zc, S.belt - .02], [S.zc, S.sill + .2]],
      cab: { w0: [S.zf - .07, S.belt], w1: [S.zf - .3, S.tetto - .06], r1: [S.zc + .07, S.tetto], r0: [S.zc + .015, S.belt + .01], inset: .035, tumble: .07, S: S.zc + .55, pw: .07, crown: .05, lunVetro: false },
      porte: [[S.zf - .2, S.zc + .15]], paraurti: { y: S.sill - .12, h: .24, t: .08, wrap: .2, col: '#2a2a2c' }, cerchi: 'camion', colCerchi: S.colCerchi || '#c8c8cc', interni: '#3a3a3a', sedile: .7, divano: 99, antenna: false,
      soloCabina: true, tergi: 2, muso: S.muso };
    const R = auto(D, col, o), { alto, basso, ud } = R, k = R.ctx, Wb = S.Wb, hb = Wb / 2, y0 = S.yBed, z0 = S.zc - .07, z1 = S.zr + .06, Lb = z0 - z1;
    const rail = .4, yRail = y0 - .2;   // il telaio: due longheroni sotto il cassone, dalla cabina alla coda
    [-1, 1].forEach(s => M(alto, BX(.11, .2, S.zf - .5 - (S.zr + .1)), C.scuro, s * rail, yRail + .1 - .1, (S.zf - .5 + S.zr + .1) / 2));
    M(alto, BX(Wb - .1, .12, .1), C.scuro, 0, yRail - .02, S.zr + .1);   // la traversa di coda
    // gli assali e le ruote dietro (gemellate o no)
    const gem = S.gemelle, xo = hb - S.tw / 2 - .02;
    asta(alto, [-(xo + S.tw / 2 - .01), S.r, S.aR], [xo + S.tw / 2 - .01, S.r, S.aR], .05, C.scuro, 6); asta(alto, [-(hwAt(D, S.aF) - .03), S.r, S.aF], [hwAt(D, S.aF) - .03, S.r, S.aF], .045, C.scuro, 6);
    [-1, 1].forEach(s => {
      const piv = new THREE.Group(); piv.position.set(s * xo, S.r, S.aR); const wh = new THREE.Group(); wh.add(ruota(S.r, S.tw, 'camion', S.colCerchi, s));
      if (gem) wh.add(ruota(S.r, S.tw, 'camion', S.colCerchi, s).translateX(-s * (S.tw + .03))); piv.add(wh); alto.add(piv); ud.wheels.push({ wh, piv, front: false, r: S.r });
      const xg = s * (xo - (gem ? (S.tw + .03) / 2 : 0)), wg = gem ? 2 * S.tw + .1 : S.tw + .08;   // il parafango sopra, attaccato al pianale con due staffe
      M(alto, new THREE.CylinderGeometry(S.r + .08, S.r + .08, wg, 10, 1, true, 0, PI), passa(), xg, S.r, S.aR, 0, 0, PI / 2);
      M(alto, BX(.05, y0 - .1 - (2 * S.r + .08) + .02, .05), C.scuro, xg, (y0 - .1 + 2 * S.r + .08) / 2, S.aR);
      asta(alto, [s * (rail + .05), yRail + .05, S.aR], [xg, S.r, S.aR], .03, C.scuro, 4);   // la balestra
      M(alto, BX(.04, S.r * 1.4, .02), mat('#1a1a1a', 'gomma'), xg, S.r * .7, S.aR - S.r - .12);   // il paraspruzzi
      asta(alto, [xg, S.r * 1.4, S.aR - S.r - .12], [xg, y0 - .1, S.aR - S.r - .12], .015, C.scuro, 4);
    });
    // serbatoio, cassetta della batteria, tubo di scarico dietro la cabina
    M(alto, CY(.22, .22, .7, 10), mat('#3a3a3e', 'metallo'), -(rail + .27), yRail - .02, (S.zc + S.aR) / 2 + .2, PI / 2);
    M(alto, BX(.36, .3, .4), C.scuro, rail + .23, yRail - .02, (S.zc + S.aR) / 2 + .2);
    asta(alto, [rail + .05, yRail, S.zc - .1], [hb - .35, yRail, S.zc - .1], .045, C.acciaio, 6); asta(alto, [hb - .35, yRail - .04, S.zc - .1], [hb - .35, S.tetto + .25, S.zc - .1], .045, C.acciaio, 6); M(alto, BX(.1, S.tetto - yRail, .04), C.scuro, hb - .35, (S.tetto + yRail) / 2, S.zc - .03);   // lo scarico verticale dietro la cabina
    // le luci di coda sulla traversa, la targa, il paraincastro
    const tl = ud.tlMat;
    [-1, 1].forEach(s => { const f = fanale(.22, .1, s > 0 ? 'frb' : 'bfr', tl); f.position.set(s * (hb - .25), yRail - .02, S.zr + .05 - .015); f.rotation.y = PI; alto.add(f); if (f.userData.rosso) ud.tails.push(f.userData.rosso); });
    const tg = new THREE.Mesh(BX(.52, .115, .008), targa(true, o.targa || 0)); tg.position.set(0, yRail - .17, S.zr + .045); tg.rotation.y = PI; alto.add(tg); M(alto, BX(.04, .12, .04), C.scuro, 0, yRail - .08, S.zr + .07);
    M(alto, BX(Wb - .5, .1, .08), C.scuro, 0, .5, S.zr + .12); [-1, 1].forEach(s => M(alto, BX(.06, yRail - .1 - .5, .06), C.scuro, s * rail, (yRail - .1 + .5) / 2, S.zr + .12));
    // il cassone
    const cc = S.coloreCassone || col, cm = S.coloreCassone ? mat(S.coloreCassone, S.coloreCassone === '#8a6a44' ? 'legno' : 'metallo') : k.paint;
    M(alto, BX(Wb, .1, Lb), mat('#5a4a38', 'legno'), 0, y0 - .05, (z0 + z1) / 2);
    for (let z = z1 + .3; z < z0; z += .7) M(alto, BX(Wb - .1, .08, .08), C.scuro, 0, y0 - .14, z);   // le traverse sotto il pianale
    if (S.cassone === 'cassone' || S.cassone === 'telone') {
      const hs = S.cassone === 'telone' ? .42 : .55;
      [-1, 1].forEach(s => { M(alto, BX(.04, hs, Lb), cm, s * (hb - .02), y0 + hs / 2, (z0 + z1) / 2); for (let z = z1 + .02; z <= z0; z += Lb / 4) M(alto, BX(.05, hs, .05), C.scuro, s * (hb - .01), y0 + hs / 2, Math.min(z, z0 - .025)); });
      M(alto, BX(Wb, hs + .25, .05), cm, 0, y0 + (hs + .25) / 2, z0 - .025); M(alto, BX(Wb, hs, .04), cm, 0, y0 + hs / 2, z1 + .02);   // la sponda davanti (più alta) e la sponda dietro
      for (let i = 0; i < 3; i++) M(alto, BX(Wb - .02, .02, .06), C.scuro, 0, y0 + hs * (i + .5) / 3, z1 - .002);
      if (S.cassone === 'cassone' && S.carico !== false) [[-.58, 0, -.45], [0, 0, -.45], [.58, 0, -.45], [-.3, 1, -.45], [.3, 1, -.45], [-.58, 0, -1.0], [0, 0, -1.02]].forEach(([x, l, z], i) => M(alto, BX(.55, .4, .45), mat(['#8a6440', '#7a5430', '#a07a50'][i % 3], 'legno'), x, y0 + .2 + l * .4, z0 + z, 0, (i % 3 - 1) * .06, 0));   // le casse del carico
      if (S.cassone === 'telone') {   // il telone sugli archi, con le corde
        const tc = mat(S.tela || '#4a5a3c', 'tela'), yT = S.tetto + .1;
        M(alto, loft([{ z: z1 + .01, hw: hb - .005, yb: y0 + hs - .05, yt: yT }, { z: z0 - .02, hw: hb - .005, yb: y0 + hs - .05, yt: yT }], { sh: .22, tuck: 0, crown: .04 }), tc);
        [-1, 1].forEach(s => { for (let z = z1 + .3; z < z0 - .1; z += .55) M(alto, BX(.012, .5, .015), C.scuro, s * (hb + .002), y0 + hs + .2, z); });
        M(alto, BX(Wb * .8, .015, .012), C.scuro, 0, y0 + hs + .3, z1 + .002);
      }
    } else if (S.cassone === 'rifiuti') {   // il compattatore: cassa bombata, la bocca di carico dietro, i bracci alzacassonetti, le pedane
      const yT = S.tetto + .15, zb = z1 + .75;
      M(alto, loft([{ z: zb, hw: hb - .02, yb: y0, yt: yT }, { z: (zb + z0) / 2, hw: hb - .01, yb: y0, yt: yT + .05 }, { z: z0 - .02, hw: hb - .02, yb: y0, yt: yT }], { sh: .45, tuck: .04, crown: .06 }), cm);
      [-1, 1].forEach(s => { M(alto, BX(.01, .14, z0 - zb - .2), mat('#e07018', 'plastica'), s * (hb - .01), y0 + .55, (zb + z0) / 2); M(alto, new THREE.PlaneGeometry(.6, .3), scritta('N.U.', '#e8e4d8', '#2a5a2a', 128, 64), s * (hb - .005), y0 + 1.05, (zb + z0) / 2, 0, s * PI / 2, 0); });
      [-1, 1].forEach(s => { for (let z = zb + .3; z < z0 - .2; z += .55) M(alto, BX(.03, yT - y0 - .55, .05), C.scuro, s * (hb - .01), y0 + .05 + (yT - y0 - .55) / 2, z); });   // le nervature
      const hop = new THREE.Group(); hop.position.set(0, y0, zb); alto.add(hop);   // la bocca di carico, inclinata
      M(hop, BX(Wb - .08, yT - y0 - .1, .74), cm, 0, (yT - y0 - .1) / 2, -.37, -.12);
      M(hop, BX(Wb - .4, .5, .05), C.scuro, 0, .45, -.762, -.12); M(hop, BX(Wb - .3, .06, .06), mat('#e07018', 'plastica'), 0, .73, -.77, -.12);
      [-1, 1].forEach(s => { asta(alto, [s * (hb - .25), y0 + .2, zb - .76], [s * (hb - .25), y0 - .45, zb - .95], .04, C.scuro, 4); M(alto, BX(.3, .05, .3), mat('#8a8a90', 'metallo'), s * (hb - .3), .5, S.zr + .2); asta(alto, [s * (hb - .12), .5, S.zr + .2], [s * (hb - .12), 1.5, zb - .75], .018, C.acciaio, 4); });
      const fl = new THREE.Mesh(BX(.18, .12, .18), mat('#ff8a1a', 'lente')); fl.position.set(0, S.tetto + D.cab.crown + .06, (S.zc + S.zf) / 2); alto.add(fl);   // il lampeggiante sulla cabina
    }
    // ---- livello basso del resto ----
    M(basso, BX(Wb, (S.cassone === 'cassone' ? .6 : S.tetto + .1 - y0), Lb), S.cassone === 'telone' ? mat(S.tela || '#4a5a3c', 'tela') : cm, 0, y0 + (S.cassone === 'cassone' ? .3 : (S.tetto + .1 - y0) / 2), (z0 + z1) / 2);
    [-1, 1].forEach(s => M(basso, CY(S.r, S.r, gem ? 2 * S.tw : S.tw, 6), C.gomma, s * (xo - (gem ? S.tw / 2 : 0)), S.r, S.aR, 0, 0, PI / 2));
    M(basso, BX(Wb, .2, .1), C.scuro, 0, yRail, S.zr + .1);
    ud.len = S.L; void cc;
    return { alto, basso, ud };
  }
  const muscoCamion = k => { const p = k.davanti(new THREE.Group(), 0, k.D.sill + .42); M(p, BX(k.D.W - .3, .34, .02), C.scuro, 0, 0, 0); const gr = griglia(1.0, .26, 6, C.cromo); gr.position.z = .012; p.add(gr); k.fari([['rett', k.D.W / 2 - .26, k.D.sill + .3, .2, .14]]); k.frecce(k.D.W / 2 - .12, k.D.sill + .5, .1, .08); };
  const CAB = {
    om: { id: 'om', nome: 'OM Leoncino telonato', L: 4.75, Wc: 1.84, Wb: 1.9, r: .36, tw: .19, zf: 2.32, zc: 1.0, zr: -2.375, aF: 1.62, aR: -1.22, belt: 1.32, tetto: 2.2, sill: .66, yBed: 1.0, gemelle: false, cassone: 'telone', tela: '#3e5a7a', coloreCassone: '#8a6a44', muso: muscoCamion },
    cassonato: { id: 'cassonato', nome: 'Camion col cassone', L: 5.9, Wc: 2.02, Wb: 2.1, r: .45, tw: .24, zf: 2.89, zc: 1.25, zr: -2.95, aF: 1.98, aR: -1.55, belt: 1.55, tetto: 2.55, sill: .8, yBed: 1.18, gemelle: true, cassone: 'cassone', coloreCassone: '#8a6a44', muso: muscoCamion },
    telonato: { id: 'telonato', nome: 'Camion militare telonato', L: 5.9, Wc: 2.02, Wb: 2.1, r: .45, tw: .24, zf: 2.89, zc: 1.25, zr: -2.95, aF: 1.98, aR: -1.55, belt: 1.55, tetto: 2.55, sill: .8, yBed: 1.18, gemelle: true, cassone: 'telone', tela: '#4a5038', colCerchi: '#3a3e34', muso: muscoCamion },
    rifiuti: { id: 'rifiuti', nome: 'Camion dei rifiuti', L: 5.9, Wc: 2.02, Wb: 2.08, r: .45, tw: .24, zf: 2.89, zc: 1.25, zr: -2.95, aF: 1.98, aR: -1.55, belt: 1.55, tetto: 2.55, sill: .8, yBed: 1.12, gemelle: true, cassone: 'rifiuti', coloreCassone: '#5f7a5a', muso: muscoCamion },
  };
  for (const id in CAB) ALTRI[id] = { nome: CAB[id].nome, L: CAB[id].L, W: CAB[id].Wb, tipo: 'cabinato', make: (col, o) => cabinato(CAB[id], id === 'rifiuti' ? '#efece2' : col, o) };
  // ================= IL BLINDATO DELLA GUARDIA (sul tipo del Fiat 6614): scafo a spigoli, ruote grandi fuori dallo scafo, torretta con la mitragliatrice =================
  function blindato(col, o) {
    o = o || {};
    const alto = new THREE.Group(), basso = new THREE.Group(), paint = vernice(col), glass = new THREE.MeshStandardMaterial({ color: '#1c2834', roughness: .1, metalness: .3 }), tl = fanaleMat();
    const ud = { paint: [paint], glass, lamps: [], tails: [], tlMat: tl, wheels: [], front: [], dents: 0, parts: {} };
    const W = 2.22, r = .5, tw = .32, aF = 1.55, aR = -1.45, hw = W / 2;
    const D = { W, r, sill: .62, ybF: .78, ybR: .72, rf: .14, rr: .1, top: [[2.66, .95], [2.6, 1.22], [1.42, 1.7], [-2.55, 1.76], [-2.66, 1.6], [-2.66, .9]], wells: [[aF, .64], [aR, .64]] };
    ud.body = M(alto, loft(stazioni(D, .5), { sh: .28, tuck: .34, crown: .03 }), paint);   // lo scafo: i fianchi bassi rientrano, quelli alti si smussano
    D.wells.forEach(([z, R]) => { M(alto, new THREE.CylinderGeometry(R - .01, R - .01, W - .2, 8, 1, true, 0, PI), passa(), 0, r, z, 0, 0, PI / 2); [-1, 1].forEach(s => { asta(alto, [s * .72, r, z], [s * (hw - .02), r, z], .06, C.scuro, 6); asta(alto, [s * .75, r - .03, z], [s * .75, r + R - .03, z], .06, C.scuro, 6); }); });
    [aF, aR].forEach(z => [-1, 1].forEach(s => { const piv = new THREE.Group(); piv.position.set(s * (hw - tw / 2 - .02), r, z); const wh = ruota(r, tw, 'camion', '#2e3228', s); piv.add(wh); alto.add(piv); ud.wheels.push({ wh, piv, front: z > 0, r }); }));
    const yAt = z => ytAt(D, z) + .03, slope = Math.atan2(1.7 - 1.22, 2.6 - 1.42);
    // le feritoie del pilota sul piano inclinato davanti (una è il «parabrezza» che si incrina)
    [-.45, .05].forEach((x, i) => { const z = 1.62, m = M(alto, BX(.36, .14, .05), glass, x, ytAt(D, z) + .045, z, -Math.atan2(1.18, .48)); if (!i) ud.ws = m; });
    [-1, 1].forEach(s => { for (const z of [.6, -.6, -1.7]) M(alto, BX(.04, .1, .22), C.vetroscuro, s * (hw + .005), 1.4, z); });   // le feritoie sui fianchi
    void slope;   // le feritoie sui fianchi, sotto lo smusso
    // sul tetto: la botola del pilota, la cupola con la mitragliatrice, le botole dietro, le antenne
    M(alto, CY(.27, .29, .1, 12), paint, -.45, yAt(1.15), 1.15); M(alto, CY(.25, .25, .06, 12), paint, -.45, yAt(1.15) + .1, 1.0, .5);
    const tu = new THREE.Group(); tu.position.set(.1, yAt(-.3) - .02, -.3); alto.add(tu);
    M(tu, CY(.48, .52, .32, 14), paint, 0, .16, 0); M(tu, CY(.5, .5, .04, 14), C.scuro, 0, .02, 0); M(tu, CY(.3, .3, .06, 12), paint, -.1, .35, -.1);
    M(tu, BX(.6, .38, .04), paint, 0, .5, .38, -.15); M(tu, BX(.16, .14, .5), C.scuro, 0, .45, .12); asta(tu, [0, .47, .3], [0, .5, 1.25], .022, C.scuro, 6); M(tu, CY(.03, .03, .12, 8), C.scuro, 0, .5, 1.2, PI / 2);   // la scudatura e la canna
    M(tu, BX(.12, .12, .2), mat('#4a4a30', 'metallo'), .14, .42, .1);
    [-1, 1].forEach(s => M(alto, BX(.6, .06, .55), paint, s * .45, yAt(-1.7) + .03, -1.7));
    [[-.75, -2.2], [.75, -2.2]].forEach(([x, z]) => { M(alto, CY(.04, .05, .08, 8), C.scuro, x, yAt(z) + .02, z); const a = asta(alto, [x, yAt(z) + .06, z], [x, yAt(z) + 2.1, z - .25], .006, C.scuro, 4); a.userData.sporge = true; });
    // i lanciafumogeni sugli spigoli davanti
    [-1, 1].forEach(s => { const y = ytAt(D, 1.2) + .03; M(alto, BX(.14, .08, .34), paint, s * (hw - .42), y + .02, 1.2); for (let i = 0; i < 3; i++) M(alto, CY(.04, .04, .2, 8), C.scuro, s * (hw - .42), y + .08, 1.32 - i * .1, -.6); });
    // davanti: fari con la grata, paraurti a tubo, verricello, ganci, targa
    [-1, 1].forEach(s => { const f = faroTondo(.08, C.scuro); f.position.set(s * .78, 1.08, zFaccia(D, s * .78, 1) - .02); f.rotation.x = -.35; alto.add(f); ud.front.push(f.userData.lente); ud.lamps.push([s * .78, 1.08, 2.7]);
      for (let k = 0; k < 3; k++) M(alto, BX(.012, .2, .012), C.scuro, s * .78 - .06 + k * .06, 1.08, zFaccia(D, s * .78, 1) + .02); M(alto, BX(.2, .012, .012), C.scuro, s * .78, 1.17, zFaccia(D, s * .78, 1) + .02); });
    ud.parts.bumper = M(alto, BX(2.0, .12, .12), C.scuro, 0, .82, 2.69); [-1, 1].forEach(s => { M(ud.parts.bumper, BX(.08, .12, .2), C.scuro, s * .7, 0, -.12); asta(alto, [s * .45, .79, 2.7], [s * .45, .68, 2.77], .03, C.scuro, 4); });
    M(alto, BX(.5, .26, .2), C.scuro, 0, 1.02, 2.68); const tg = new THREE.Mesh(BX(.36, .1, .008), targa(false, o.targa || 0)); tg.position.set(0, 1.0, 2.79); alto.add(tg);
    // dietro: la porta grande, i fanali con la grata, le taniche
    M(alto, BX(1.2, .9, .04), paint, 0, 1.15, -2.68); M(alto, BX(.04, .2, .06), C.scuro, .45, 1.15, -2.71);
    [-1, 1].forEach(s => { const f = fanale(.12, .1, 'rf', tl); f.position.set(s * .85, 1.05, -2.67); f.rotation.y = PI; alto.add(f); ud.tails.push(f.userData.rosso);
      M(alto, BX(.32, .4, .16), mat('#4a5238', 'metallo'), s * .72, ytAt(D, -2.3) + .23, -2.3); M(alto, BX(.36, .03, .18), C.scuro, s * .72, ytAt(D, -2.3) + .3, -2.3); });   // le taniche sul tetto, legate
    // il portello sul fianco, la fascia della Guardia
    [-1, 1].forEach(s => { M(alto, BX(.02, .7, .85), paint, s * (hw + .005), 1.15, -.55); M(alto, BX(.03, .03, .14), C.scuro, s * (hw + .02), 1.2, -.85);
      M(alto, new THREE.PlaneGeometry(1.2, .16), scritta('GUARDIA', '#3a4038', '#d8d4c4', 256, 32), s * (hw + .012), 1.45, 1.0, 0, s * PI / 2, 0); });
    ud.seat = [.45, 1.25, 1.15]; ud.seat2 = [.1, 1.3, -.3]; ud.len = 5.4; ud.wipers = null;
    ud.porta = { hw, cw: hw - .1, zf: -.12, zb: -.98, yb: .8, yt: 1.5, yw: 1.55 };
    M(basso, loft(stazioniBasse(D), { sh: .28, tuck: 0, crown: .03, basso: true }), paint); M(basso, CY(.5, .5, .3, 8), paint, .1, yAt(-.3) + .13, -.3);
    [aF, aR].forEach(z => [-1, 1].forEach(s => M(basso, CY(r, r, tw, 6), C.gomma, s * (hw - tw / 2 - .02), r, z, 0, 0, PI / 2)));
    return { alto, basso, ud };
  }
  ALTRI.blindato = { nome: 'Blindato della Guardia', L: 5.4, W: 2.25, tipo: 'blindato', make: blindato };

  // ================= L'APE (Piaggio Ape P50): cabina tonda col faro in mezzo, ruota singola davanti, cassone con le sponde =================
  function ape(col, o) {
    o = o || {};
    const D = { id: 'ape', nome: 'Ape Piaggio', L: 2.8, W: 1.22, r: .23, tw: .11, asse: [1.02], ruote: [[0, 1.02, true]], R: .3, sill: .36, ybF: .5, ybR: .38, rf: .3, rr: .05, sh: .12, tuck: .04, crown: .05, noSosp: true,
      top: [[1.38, .5], [1.4, .7], [1.34, .84], [1.2, .9], [.3, .91], [.28, .88], [.28, .4]],
      cab: { w0: [1.31, .9], w1: [1.1, 1.58], r1: [.42, 1.64], r0: [.3, .92], inset: .05, tumble: .1, S: .62, pw: .06, crown: .04 },
      porte: [[1.2, .62]], paraurti: { y: .3, h: .06, t: .04, wrap: .2, tipo: 'cromo', noTarga: true }, cerchi: 'acciaio', colCerchi: '#c8c8cc', interni: '#3a3632', sedile: .82, divano: 99, antenna: false, tergi: 1, manubrio: true, soloCabina: true };
    const R = auto(D, col, o), { alto, basso, ud } = R, k = R.ctx;
    // la forcella della ruota davanti e il parafango
    [-1, 1].forEach(s => asta(alto, [s * .075, D.r, 1.02], [s * .075, D.r + .28, .98], .02, C.scuro, 5));
    M(alto, new THREE.CylinderGeometry(.27, .27, .16, 10, 1, true, -.3, PI * .9), k.paint, 0, D.r, 1.02, 0, 0, PI / 2);
    const f = faroTondo(.075); posa(f, D, 0, .74, 1, .002); alto.add(f); ud.front.push(f.userData.lente); ud.lamps = [[0, .74, 1.45]];
    k.frecce(.5, .74, .06, .04);
    const tgF = new THREE.Mesh(BX(.2, .1, .008), targa(false, o.targa || 0)); posa(tgF, D, 0, .58, 1, .006); alto.add(tgF);
    // il telaio, il cassone, l'assale dietro coi parafanghi
    const y0 = .64, z0 = .25, z1 = -1.38, Wb = 1.3, hb = Wb / 2, Lb = z0 - z1;
    M(alto, BX(.16, .14, 1.85), C.scuro, 0, .44, -.5);   // la trave centrale
    M(alto, BX(Wb, .06, Lb), mat('#6a5a48', 'legno'), 0, y0 - .03, (z0 + z1) / 2); M(alto, BX(Wb - .2, .1, .08), C.scuro, 0, y0 - .08, z1 + .3); M(alto, BX(Wb - .2, .1, .08), C.scuro, 0, y0 - .08, z0 - .2);
    M(alto, BX(.08, .14, Lb - .3), C.scuro, 0, y0 - .1, (z0 + z1) / 2);
    const hs = .32; [-1, 1].forEach(s => { M(alto, BX(.03, hs, Lb), k.paint, s * (hb - .015), y0 + hs / 2, (z0 + z1) / 2); for (const z of [z1 + .03, (z0 + z1) / 2, z0 - .03]) M(alto, BX(.04, hs, .04), C.scuro, s * (hb - .01), y0 + hs / 2, z); });
    M(alto, BX(Wb, hs, .03), k.paint, 0, y0 + hs / 2, z0 - .015); M(alto, BX(Wb, hs, .03), k.paint, 0, y0 + hs / 2, z1 + .015);
    asta(alto, [-.605, D.r, -.95], [.605, D.r, -.95], .03, C.scuro, 5); asta(alto, [0, D.r, -.95], [0, .44, -.8], .04, C.scuro, 4);
    [-1, 1].forEach(s => { const piv = new THREE.Group(); piv.position.set(s * .57, D.r, -.95); const wh = ruota(D.r, .12, 'acciaio', '#c8c8cc', s); piv.add(wh); alto.add(piv); ud.wheels.push({ wh, piv, front: false, r: D.r });
      M(alto, new THREE.CylinderGeometry(.29, .29, .16, 8, 1, true, 0, PI), passa(), s * .57, D.r, -.95, 0, 0, PI / 2); M(alto, BX(.04, y0 - .06 - (D.r + .29) + .02, .04), C.scuro, s * .57, (y0 - .06 + D.r + .29) / 2, -.95); });
    [-1, 1].forEach(s => { const fl = fanale(.1, .08, 'rf', ud.tlMat); fl.position.set(s * .5, y0 + .07, z1 - .01); fl.rotation.y = PI; alto.add(fl); ud.tails.push(fl.userData.rosso); });
    const tg = new THREE.Mesh(BX(.28, .12, .008), targa(true, o.targa || 0)); tg.position.set(0, y0 + .12, z1 - .006); tg.rotation.y = PI; alto.add(tg);
    // il carico: cassette di frutta o bombole del gas
    const sd = (o.seme || 1) % 3;
    if (sd === 0) [[-.32, -.25], [.32, -.25], [-.32, -.8], [.32, -.8], [0, -.52, 1]].forEach(([x, z, l]) => { const c = M(alto, BX(.5, .26, .36), mat('#a07a50', 'legno'), x, y0 + .13 + (l ? .26 : 0), z); for (let i = 0; i < 6; i++) M(c, new THREE.IcosahedronGeometry(.055, 0), mat(['#e0a020', '#d04a20', '#7a9a3a'][(i + (l || 0)) % 3], 'plastica'), -.16 + (i % 3) * .16, .14, -.09 + Math.floor(i / 3) * .18); });
    else if (sd === 1) for (let i = 0; i < 6; i++) { const b = M(alto, CY(.15, .15, .55, 10), mat(i % 2 ? '#c8402a' : '#e8e4da', 'metallo'), -.4 + (i % 3) * .4, y0 + .28, -.35 - Math.floor(i / 3) * .5); M(b, CY(.05, .06, .08, 8), C.acciaio, 0, .3, 0); }
    else { M(alto, BX(1.0, .36, 1.2), mat('#4a5a3a', 'tela'), 0, y0 + .18, -.55); }
    ud.seat = [0, .62, .58]; ud.len = 2.8;
    M(basso, BX(Wb, hs + .06, Lb), k.paint, 0, y0 + hs / 2 - .03, (z0 + z1) / 2); [-1, 1].forEach(s => M(basso, CY(D.r, D.r, .12, 6), C.gomma, s * .57, D.r, -.95, 0, 0, PI / 2));
    return { alto, basso, ud };
  }
  ALTRI.ape = { nome: 'Ape Piaggio', L: 2.8, W: 1.3, tipo: 'ape', make: ape };
  // ================= LE DUE RUOTE =================
  const due = col => { const p = vernice(col); p.side = THREE.DoubleSide; const tl = fanaleMat(); return { alto: new THREE.Group(), basso: new THREE.Group(), p, tl, ud: { paint: [p], lamps: [], tails: [], tlMat: tl, wheels: [], front: [], two: true, dents: 0, parts: {} } }; };
  // ruota a raggi: gomma (toro), cerchio, raggi incrociati, mozzo; asse lungo x
  function ruotaRaggi(R, sez, rimM, n, hubW, tasselli) {
    const w = new THREE.Group(); M(w, new THREE.TorusGeometry(R - sez, sez, 5, 18), C.gomma, 0, 0, 0, 0, PI / 2, 0);
    if (tasselli) for (let k = 0; k < 18; k++) { const a = k / 18 * PI * 2; M(w, BX(sez * 1.6, .012, .03), C.gomma, 0, Math.cos(a) * (R - .004), Math.sin(a) * (R - .004), -a, 0, 0); }   // il battistrada a tasselli
    M(w, new THREE.TorusGeometry(R - 2 * sez - .006, .013, 3, 18), rimM, 0, 0, 0, 0, PI / 2, 0);
    const rr = R - 2 * sez - .012; for (let k = 0; k < n; k++) M(w, BX(.004, rr * 2, .004), C.acciaio, (k % 2 ? 1 : -1) * .01, 0, 0, k / n * PI, 0, 0);
    M(w, CY(.024, .024, hubW || .09, 8), C.acciaio, 0, 0, 0, 0, 0, PI / 2); return w;
  }
  function parafango(g, R, w, z, y, t0, tl, m) { return M(g, new THREE.CylinderGeometry(R, R, w, 12, 1, true, t0, tl), m, 0, y, z, 0, 0, PI / 2); }
  function mettiRuota(ud, g, wh, z, r, front) { const piv = new THREE.Group(); piv.position.set(0, r, z); piv.add(wh); g.add(piv); ud.wheels.push({ wh, piv, front, r }); return piv; }

  // Vespa PX (1977): scudo, scocca bombata coi cofani, sella lunga, faro nel manubrio. Le misure dei punti di contatto sono quelle della posa in_vespa
  // (anim_lotta.js: sella a .98, manopole a ±.33 alte 1.30 e avanti .70, pedana a .37).
  function vespa(col) {
    const { alto: g, basso, p, tl, ud } = due(col), nero = C.nero, sella = mat('#2a1c16', 'plastica');
    M(g, BX(.42, .06, .6), p, 0, .31, .32); M(g, BX(.38, .02, .54), mat('#2a2a2a', 'gomma'), 0, .355, .32);   // la pedana col tappetino
    for (let i = 0; i < 5; i++) M(g, BX(.012, .014, .54), C.cromo, -.15 + i * .075, .37, .32);
    M(g, new THREE.CylinderGeometry(.46, .46, .8, 12, 1, true, -.62, 1.24), p, 0, .76, .3, -.12);   // lo scudo
    M(g, BX(.09, .2, .04), mat('#9a9ca2', 'metallo'), 0, .92, .76, -.12);   // la cravatta del clacson
    asta(g, [0, 1.2, .7], [0, .5, .8], .035, p, 8);   // il piantone dello sterzo
    const cap = M(g, new THREE.SphereGeometry(1, 12, 8), p, 0, 1.27, .72); cap.scale.set(.17, .09, .15);   // il manubrio carenato
    const f = faroTondo(.062, C.cromo); f.position.set(0, 1.27, .855); g.add(f); ud.front.push(f.userData.lente); ud.lamps.push([0, 1.27, .9]);
    M(g, CY(.045, .045, .03, 10), nero, 0, 1.355, .66, -.6);   // il tachimetro
    [-1, 1].forEach(s => {
      asta(g, [s * .14, 1.29, .7], [s * .3, 1.3, .7], .018, p, 6); M(g, CY(.032, .032, .07, 8), nero, s * .33, 1.3, .7, 0, 0, PI / 2);
      lista(g, [s * .2, 1.31, .72], [s * .32, 1.33, .78], .02, .012, C.cromo);   // le leve
      asta(g, [s * .22, 1.31, .7], [s * .25, 1.5, .67], .006, C.cromo, 4); M(g, CY(.05, .05, .014, 10), C.cromo, s * .25, 1.52, .665, PI / 2);   // gli specchietti
    });
    const fe = M(g, new THREE.SphereGeometry(.26, 10, 6, 0, PI * 2, 0, PI / 2), p, 0, .22, .86); fe.scale.set(.55, 1, 1);   // il parafango davanti
    asta(g, [0, .52, .8], [-.07, .5, .82], .025, C.scuro, 5); asta(g, [-.07, .5, .82], [-.07, .22, .86], .022, C.scuro, 5);   // il braccio della sospensione
    ud.body = M(g, new THREE.SphereGeometry(1, 14, 10).scale(.31, .25, .4).translate(0, .64, -.4), p);   // la scocca coi cofani (la misura dentro la geometria: le ammaccature lavorano in metri)
    [-1, 1].forEach(s => M(g, BX(.01, .03, .3), C.cromo, s * .3, .62, -.42));   // i fregi sui cofani
    M(g, BX(.24, .28, .34), p, 0, .48, -.06);   // il tunnel
    M(g, BX(.16, .26, .12), C.scuro, 0, .76, .05);
    lista(g, [0, .93, .13], [0, .93, -.64], .3, .1, sella); M(g, BX(.3, .01, .08), C.cromo, 0, .9, -.45);
    [-1, 1].forEach(s => asta(g, [s * .12, .96, -.6], [s * .12, .96, -.82], .01, C.cromo, 4)); asta(g, [-.12, .96, -.82], [.12, .96, -.82], .01, C.cromo, 4); asta(g, [0, .96, -.82], [0, .74, -.8], .01, C.cromo, 4);   // il portapacchi
    const t = M(g, BX(.16, .07, .05), tl, 0, .72, -.8); ud.tails.push(t);
    const tg = M(g, BX(.22, .1, .01), targa(true, 0), 0, .55, -.78); tg.rotation.y = PI;
    M(g, BX(.14, .18, .42), mat('#5a5c62', 'metallo'), -.12, .3, -.5); M(g, CY(.06, .07, .36, 10), C.scuro, -.22, .3, -.62, PI / 2); asta(g, [-.12, .25, -.3], [-.22, .28, -.45], .02, C.scuro, 4);   // il motore e la marmitta
    mettiRuota(ud, g, ruota(.22, .1, 'acciaio', '#c8c8cc', 1), .86, .22, true); mettiRuota(ud, g, ruota(.22, .1, 'acciaio', '#c8c8cc', -1), -.6, .22, false);
    ud.len = 1.9;
    const b = M(basso, new THREE.SphereGeometry(1, 6, 4), p, 0, .64, -.4); b.scale.set(.31, .25, .4); M(basso, BX(.4, .8, .1), p, 0, .76, .72); M(basso, BX(.3, .1, .7), sella, 0, .93, -.25);
    [.86, -.6].forEach(z => M(basso, CY(.22, .22, .1, 6), C.gomma, 0, .22, z, 0, 0, PI / 2));
    return { alto: g, basso, ud };
  }
  ALTRI.vespa = { nome: 'Vespa', L: 1.9, W: .7, tipo: 'due', make: vespa };

  // Piaggio Ciao: il motorino col telaio a trave di lamiera, il serbatoio sotto la sella, i pedali da bicicletta
  function ciao(col) {
    const { alto: g, basso, p, tl, ud } = due(col), R = .3, zF = .56, zR = -.5;
    asta(g, [0, .97, .35], [0, .7, .42], .032, p, 8);   // il cannotto dello sterzo
    lista(g, [0, .74, .4], [0, .34, .06], .09, .07, p); lista(g, [0, .34, .06], [0, .8, -.28], .09, .08, p);   // la trave
    ud.body = M(g, new THREE.SphereGeometry(1, 10, 8).scale(.12, .1, .2).translate(0, .72, -.32), mat('#ece8dc', 'plastica'));   // il serbatoio
    asta(g, [0, .8, -.28], [0, .86, -.32], .02, C.cromo, 6); M(g, BX(.2, .07, .32), mat('#1e1e20', 'plastica'), 0, .9, -.34);   // la sella
    [-1, 1].forEach(s => asta(g, [s * .05, .74, .41], [s * .05, R, zF], .016, C.cromo, 6));   // la forcella
    asta(g, [0, .97, .35], [0, 1.0, .35], .02, C.cromo, 6); asta(g, [-.28, 1.0, .33], [.28, 1.0, .33], .012, C.cromo, 6);
    [-1, 1].forEach(s => { M(g, CY(.02, .02, .1, 8), C.nero, s * .31, 1.0, .33, 0, 0, PI / 2); lista(g, [s * .18, 1.0, .35], [s * .28, 1.0, .4], .02, .01, C.nero); });
    const f = faroTondo(.055, C.cromo); f.position.set(0, .93, .405); g.add(f); ud.front.push(f.userData.lente); ud.lamps.push([0, .93, .45]);
    M(g, BX(.18, .2, .26), mat('#6a6c72', 'metallo'), 0, .28, .02); for (let i = 0; i < 4; i++) M(g, CY(.075, .075, .012, 10), mat('#8a8c92', 'metallo'), 0, .4 + i * .025, .08, -.5);   // il motore con le alette
    asta(g, [-.06, .24, -.08], [-.12, .3, -.5], .018, C.scuro, 5); M(g, CY(.04, .04, .24, 8), C.scuro, -.12, .3, -.6, PI / 2);
    [-1, 1].forEach(s => { asta(g, [s * .1, .28, .02], [s * .1, .28 - s * .14, .02 + s * .04], .012, C.scuro, 4); M(g, BX(.08, .02, .05), C.nero, s * .14, .28 - s * .14, .02 + s * .04); });   // i pedali
    M(g, BX(.008, .04, .5), C.scuro, -.1, .3, -.24);   // la catena
    [-1, 1].forEach(s => { asta(g, [s * .05, .8, -.3], [s * .05, R, zR], .014, p, 5); asta(g, [s * .06, .82, -.42], [s * .06, .82, -.78], .01, C.cromo, 4); asta(g, [s * .06, .82, -.76], [s * .05, R, zR], .009, C.cromo, 4); });   // gli steli dietro e il portapacchi
    asta(g, [-.06, .82, -.78], [.06, .82, -.78], .01, C.cromo, 4); const t = M(g, BX(.08, .05, .03), tl, 0, .8, -.8); ud.tails.push(t);
    parafango(g, R + .025, .07, zF, R, .35, 1.9, p); parafango(g, R + .025, .07, zR, R, PI / 2 - .3, 2.0, p);
    mettiRuota(ud, g, ruotaRaggi(R, .026, C.cromo, 16, .1), zF, R, true); mettiRuota(ud, g, ruotaRaggi(R, .028, C.cromo, 16, .1), zR, R, false);
    ud.len = 1.65;
    lista(basso, [0, .74, .4], [0, .34, .06], .09, .07, p); lista(basso, [0, .34, .06], [0, .86, -.3], .1, .1, p); [zF, zR].forEach(z => M(basso, CY(R, R, .05, 8), C.gomma, 0, R, z, 0, 0, PI / 2));
    return { alto: g, basso, ud };
  }
  ALTRI.ciao = { nome: 'Piaggio Ciao', L: 1.65, W: .72, tipo: 'due', make: ciao };

  // la bicicletta da donna: telaio aperto, manubrio all'indietro, cestino, portapacchi, parafanghi cromati, fanale a dinamo
  function bici(col) {
    const { alto: g, basso, p, tl, ud } = due(col), R = .335, zF = .54, zR = -.54, bb = [0, .3, -.02];
    asta(g, [0, .93, .35], [0, .76, .4], .022, p, 8);
    asta(g, [0, .82, .37], [0, .48, .16], .02, p, 6); asta(g, [0, .48, .16], bb, .02, p, 6);   // il tubo basso piegato
    asta(g, bb, [0, .86, -.2], .019, p, 6);
    [-1, 1].forEach(s => { asta(g, [s * .02, .3, -.02], [s * .05, R, zR], .011, p, 5); asta(g, [s * .015, .84, -.19], [s * .05, R, zR], .01, p, 5); asta(g, [s * .03, .77, .4], [s * .05, R, zF], .013, p, 6); });
    M(g, CY(.04, .04, .07, 10), p, 0, .3, -.02, 0, 0, PI / 2);
    asta(g, [0, .93, .35], [0, 1.02, .33], .014, C.cromo, 6);
    const bar = [[-.29, 1.0, .2], [-.12, 1.02, .33], [.12, 1.02, .33], [.29, 1.0, .2]]; for (let i = 0; i < 3; i++) asta(g, bar[i], bar[i + 1], .011, C.cromo, 5);
    [-1, 1].forEach(s => M(g, CY(.018, .018, .1, 8), mat('#5a3a24', 'plastica'), s * .31, 1.0, .17, 0, s * .6, PI / 2)); M(g, CY(.025, .025, .02, 10), C.cromo, .14, 1.04, .32);   // le manopole e il campanello
    asta(g, [0, .86, -.2], [0, .92, -.22], .012, C.cromo, 6); M(g, BX(.17, .06, .26), mat('#5a3a24', 'plastica'), 0, .95, -.25); [-1, 1].forEach(s => M(g, CY(.012, .012, .05, 6), C.cromo, s * .05, .905, -.32));   // la sella con le molle
    [-1, 1].forEach(s => { asta(g, [s * .07, .8, -.22], [s * .07, .8, -.8], .008, C.cromo, 4); asta(g, [s * .07, .8, -.62], [s * .05, R, zR], .007, C.cromo, 4); }); for (const z of [-.3, -.5, -.7]) asta(g, [-.07, .8, z], [.07, .8, z], .007, C.cromo, 4);   // il portapacchi
    const ce = new THREE.Group(); ce.position.set(0, .86, .52); g.add(ce);   // il cestino di fil di ferro
    const cw = .32, ch = .2, cd = .24; M(ce, BX(cw, .006, cd), C.acciaio, 0, -ch / 2, 0);
    for (const y of [-ch / 2, 0, ch / 2]) { M(ce, BX(cw, .006, .006), C.acciaio, 0, y, cd / 2); M(ce, BX(cw, .006, .006), C.acciaio, 0, y, -cd / 2); M(ce, BX(.006, .006, cd), C.acciaio, cw / 2, y, 0); M(ce, BX(.006, .006, cd), C.acciaio, -cw / 2, y, 0); }
    for (let i = 0; i < 5; i++) { M(ce, BX(.005, ch, .005), C.acciaio, -cw / 2 + i * cw / 4, 0, cd / 2); M(ce, BX(.005, ch, .005), C.acciaio, -cw / 2 + i * cw / 4, 0, -cd / 2); }
    asta(g, [0, .8, .4], [0, .78, .4], .01, C.scuro, 4);
    const f = faroTondo(.032, C.cromo); f.position.set(-.06, .6, .47); g.add(f); ud.front.push(f.userData.lente); ud.lamps.push([-.06, .6, .5]); asta(g, [-.06, .6, .45], [-.04, .6, .43], .01, C.cromo, 4);
    asta(g, [-.07, .8, -.8], [.07, .8, -.8], .007, C.cromo, 4); const t = M(g, BX(.06, .04, .02), tl, 0, .78, -.81); ud.tails.push(t);
    parafango(g, R + .02, .055, zF, R, .3, 2.0, C.cromo); parafango(g, R + .02, .055, zR, R, PI / 2 - .4, 2.1, C.cromo);
    M(g, BX(.01, .06, .48), p, -.07, .33, -.27);   // il carter della catena
    [-1, 1].forEach(s => { asta(g, [s * .035, .3, -.02], [s * .07, .3 + s * .15, -.02 - s * .04], .01, C.scuro, 4); M(g, BX(.09, .02, .05), C.nero, s * .11, .3 + s * .15, -.02 - s * .04); });
    mettiRuota(ud, g, ruotaRaggi(R, .02, C.cromo, 18, .1), zF, R, true); mettiRuota(ud, g, ruotaRaggi(R, .021, C.cromo, 18, .1), zR, R, false);
    ud.len = 1.75; ud.body = null;
    asta(basso, [0, .82, .37], bb, .03, p, 4); asta(basso, bb, [0, .86, -.2], .03, p, 4); [zF, zR].forEach(z => M(basso, CY(R, R, .04, 8), C.gomma, 0, R, z, 0, 0, PI / 2));
    return { alto: g, basso, ud };
  }
  ALTRI.bici = { nome: 'Bicicletta da donna', L: 1.75, W: .7, tipo: 'due', make: bici };

  // la BMX tascabile: ruote da 20" con le gomme grasse a tasselli e i cerchi viola, telaio a diamante, manubrio alto, pegs, la tabella del numero.
  // Le misure sono quelle di BMX_GEO in render.js (la posa in_bmx ci mette mani e piedi): non cambiarle da una parte sola.
  const BMXG = { R: .26, zF: .47, zR: -.47, bbY: .29, bbZ: -.04, crank: .17, pedX: .17, seatY: .81, seatZ: -.27, gripY: 1.04, gripZ: .22, gripX: .34 };
  function bmx(col) {
    const { alto: g, basso, p: c, ud } = due(col), Gm = BMXG, R = Gm.R, blk = mat('#16151a', 'plastica'), rimM = mat('#8a5ad8', 'metallo'), steel = mat('#3a3a42', 'metallo');
    ud.lamps = []; ud.tlMat = null;
    const bb = [0, Gm.bbY, Gm.bbZ], st = [0, .66, -.21], ht = [0, .73, .29], hb = [0, .56, .34];
    asta(g, bb, st, .024, c, 8); asta(g, st, ht, .026, c, 8); asta(g, bb, hb, .03, c, 8); asta(g, hb, ht, .034, c, 8);
    [-1, 1].forEach(s => { asta(g, [s * .03, Gm.bbY, Gm.bbZ], [s * .065, R, Gm.zR], .016, c, 6); asta(g, [s * .025, .65, -.22], [s * .065, R, Gm.zR], .014, c, 6); });
    ud.body = M(g, CY(.035, .035, .1, 10), c, 0, Gm.bbY, Gm.bbZ, 0, 0, PI / 2);
    [-1, 1].forEach(s => asta(g, [s * .045, .57, .35], [s * .065, R, Gm.zF], .018, blk, 6));
    asta(g, [0, .73, .29], [0, .82, .27], .02, blk, 6); M(g, BX(.1, .05, .1), blk, 0, .82, .28);
    [-1, 1].forEach(s => { asta(g, [s * .06, .82, .28], [s * .2, Gm.gripY, Gm.gripZ], .014, blk, 6); asta(g, [s * .2, Gm.gripY, Gm.gripZ], [s * .35, Gm.gripY, Gm.gripZ], .014, blk, 6); M(g, CY(.02, .02, .08, 8), blk, s * Gm.gripX, Gm.gripY, Gm.gripZ, 0, 0, PI / 2); });
    asta(g, [-.13, .94, .25], [.13, .94, .25], .011, blk, 6);
    const tab = M(g, BX(.2, .17, .01), mat('#f0ece0', 'plastica'), 0, .9, .3, -.25); M(tab, BX(.1, .1, .004), mat('#1a1a1a', 'plastica'), 0, 0, .007);   // la tabella col numero
    asta(g, [0, .66, -.21], [0, .78, -.25], .016, C.cromo, 6); M(g, BX(.13, .05, .27), blk, 0, Gm.seatY - .02, Gm.seatZ, .1); M(g, BX(.07, .04, .06), blk, 0, Gm.seatY - .03, Gm.seatZ + .15);
    M(g, CY(.075, .075, .012, 14), steel, -.06, Gm.bbY, Gm.bbZ, 0, 0, PI / 2);
    asta(g, [-.06, Gm.bbY + .07, Gm.bbZ], [-.06, R + .03, Gm.zR], .006, steel, 4); asta(g, [-.06, Gm.bbY - .07, Gm.bbZ], [-.06, R - .03, Gm.zR], .006, steel, 4);
    M(g, BX(.06, .04, .05), steel, .0, .6, -.24); asta(g, [0, .6, -.24], [.05, .8, .26], .004, blk, 4);   // il freno dietro e il suo cavo
    [Gm.zF, Gm.zR].forEach(z => [-1, 1].forEach(s => M(g, CY(.026, .026, .1, 8), steel, s * .13, R, z, 0, 0, PI / 2)));
    const cr = new THREE.Group(); cr.position.set(0, Gm.bbY, Gm.bbZ); cr.userData.keepTree = true;
    [[-1, 1], [1, -1]].forEach(([s, v]) => { M(cr, BX(.022, Gm.crank + .03, .03), blk, s * .06, v * Gm.crank / 2, 0); asta(cr, [s * .06, v * Gm.crank, 0], [s * (Gm.pedX - .04), v * Gm.crank, 0], .008, steel, 4); const ped = new THREE.Group(); ped.position.set(s * Gm.pedX, v * Gm.crank, 0); cr.add(ped); M(ped, BX(.1, .022, .095), blk); ped.userData.ped = true; (ud.pedals = ud.pedals || []).push(ped); });
    g.add(cr); ud.crank = cr;
    mettiRuota(ud, g, ruotaRaggi(R, .05, rimM, 9, .1, true), Gm.zF, R, true); mettiRuota(ud, g, ruotaRaggi(R, .05, rimM, 9, .1, true), Gm.zR, R, false);
    ud.len = 1.5;
    asta(basso, bb, ht, .03, c, 4); asta(basso, bb, [0, R, Gm.zR], .025, c, 4); [Gm.zF, Gm.zR].forEach(z => M(basso, CY(R, R, .1, 8), C.gomma, 0, R, z, 0, 0, PI / 2));
    return { alto: g, basso, ud };
  }
  ALTRI.bmx = { nome: 'BMX', L: 1.5, W: .74, tipo: 'due', make: bmx };

  // ================= LE BARCHE =================
  // Gli scafi di [costa] (render.js) rifatti qui: sezioni che si stringono verso prua, il fasciame (le tavole del legno disegnate
  // sullo scafo), la falchetta che corre lungo il bordo, le bitte, il timone, le cabine coi vetri, reti e nasse.
  // Prua verso +z, la linea di galleggiamento a y = 0 (render.js mette il gruppo a pelo d'acqua + pescaggio).
  // Veicoli3D.barca(tipo, r, o) → { g, H, draft }: H serve a render.js per la sagoma che tiene fuori l'acqua.
  const PESCAGGIO = { gozzo: .27, lancia: .3, motoscafo: .28, peschereccio: .62, traghetto: 1.3 };   // come DRAFT in render.js
  const pickR = (r, a) => a[Math.floor(r() * a.length) % a.length];
  function scafoForma(L, B, D, pointed) {   // come hullShape di render.js
    const hw = t => pointed ? B / 2 * Math.pow(Math.max(.02, Math.sin(PI * (.03 + t * .94))), .55) : B / 2 * (t < .5 ? .84 + .16 * Math.sin(t / .5 * PI / 2) : Math.pow(Math.max(0, Math.cos((t - .5) / .5 * PI / 2)), .75) * .98 + .02);
    const sh = t => D * .32 * Math.pow(t, 3) + (pointed ? D * .22 * Math.pow(1 - t, 3) : 0);
    const kd = t => D * (t > .78 ? 1 - Math.pow((t - .78) / .22, 1.6) * .75 : pointed && t < .14 ? 1 - Math.pow((.14 - t) / .14, 1.6) * .6 : 1);
    return { hw, sh, kd, L, B, D, pointed };
  }
  const sP = (H, t, u, s) => { const ph = u * PI / 2; return [H.hw(t) * Math.pow(Math.sin(ph), .55) * s, H.sh(t) - (H.kd(t) + H.sh(t)) * Math.pow(Math.cos(ph), 1.6), -H.L / 2 + t * H.L]; };
  // la fascia dello scafo fra u0 e u1 (0 chiglia, 1 bordo), con le uv per il fasciame: u lungo la barca in metri, v una tavola ogni 1/8 di sezione
  function scafoGeo(H, u0, u1, cap) {
    const NS = 20, NU = 6, pos = [], uv = [];
    const put = (t, u, s) => { pos.push(...sP(H, t, u, s)); uv.push(t * H.L / 2, u * 8); };
    for (const s of [1, -1]) for (let i = 0; i < NS; i++) for (let j = 0; j < NU; j++) {
      const t0 = i / NS, t1 = (i + 1) / NS, v0 = u0 + (u1 - u0) * j / NU, v1 = u0 + (u1 - u0) * (j + 1) / NU, Q = [[t0, v0], [t1, v0], [t1, v1], [t0, v1]];
      const o = s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]; o.forEach(k => put(Q[k][0], Q[k][1], s));
    }
    for (const te of H.pointed ? [0, 1] : cap ? [0] : []) for (let j = 0; j < NU; j++) { const v0 = u0 + (u1 - u0) * j / NU, v1 = u0 + (u1 - u0) * (j + 1) / NU; [[v0, 1], [v1, 1], [v1, -1], [v0, 1], [v1, -1], [v0, -1]].forEach(([u, s]) => put(te, u, s)); }   // lo specchio di poppa (e i due dritti chiusi del gozzo)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  function ponteGeo(H, y, ins, t0, t1) {   // il ponte o il pagliolato alla quota y, ristretto di ins
    const sh = new THREE.Shape(), N = 16, a = t0 || 0, b = t1 || 1;
    for (let i = 0; i <= N; i++) { const t = a + (b - a) * i / N, x = Math.max(.02, H.hw(t) - ins), z = -H.L / 2 + t * H.L; i ? sh.lineTo(x, z) : sh.moveTo(x, z); }
    for (let i = N; i >= 0; i--) { const t = a + (b - a) * i / N; sh.lineTo(-Math.max(.02, H.hw(t) - ins), -H.L / 2 + t * H.L); }
    const g = new THREE.ShapeGeometry(sh); g.rotateX(PI / 2); g.translate(0, y, 0);
    const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const q = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = q; } const n = g.attributes.normal.array; for (let k = 0; k < n.length; k++) n[k] = -n[k]; return g;
  }
  // il fasciame: una trama grigia (tavole con i comenti scuri) che moltiplica il colore dello scafo
  let FASC = null;
  function fasciame() {
    if (FASC !== null) return FASC; if (!DOC) return (FASC = undefined);
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#f0f0f0'; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, i * 8, 64, 1); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, i * 8 + 1, 64, 1); for (let k = 0; k < 2; k++) { const xx = ((i * 37 + k * 29) % 60); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(xx, i * 8 + 1, 1, 7); } }
    FASC = new THREE.CanvasTexture(c); FASC.wrapS = FASC.wrapT = THREE.RepeatWrapping; FASC.anisotropy = 4; return FASC;
  }
  const DS = THREE.DoubleSide;
  function matScafo(col, legno) { const k = col + '|scafo' + (legno ? 'L' : ''); if (MC[k]) return MC[k]; const o = { color: col, roughness: legno ? .7 : .4, side: DS }; if (legno && fasciame()) o.map = fasciame(); return (MC[k] = new THREE.MeshStandardMaterial(o)); }
  const legnoM = c => { const k = (c || '#8a6040') + '|legnoDS'; return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c || '#8a6040', roughness: .8, side: DS })); };
  // le tre fasce dello scafo: antivegetativa, colore, fascia sotto il bordo
  function scafoMesh(g, H, colLow, colBand, band, cap, draft, anti, legno) {
    const sh = H.sh(.5), kd = H.kd(.5), uw = Math.min(.8, Math.acos(Math.pow(clamp((sh + draft - .12) / (kd + sh), 0, 1), 1 / 1.6)) * 2 / PI);
    M(g, scafoGeo(H, 0, uw, cap), matScafo(anti || '#7a2a22', false)); const corpo = M(g, scafoGeo(H, uw, 1 - band, cap), matScafo(colLow, legno)); M(g, scafoGeo(H, 1 - band, 1, cap), matScafo(colBand, legno));
    return corpo;
  }
  // la falchetta: il listello di legno che corre sul bordo, dai due lati
  function falchetta(g, H, w, h, m, t0, t1) {
    const pos = [], N = 24, a = t0 || 0, b = t1 === undefined ? 1 : t1;
    for (const s of [1, -1]) for (let i = 0; i < N; i++) {
      const T = [a + (b - a) * i / N, a + (b - a) * (i + 1) / N].map(t => sP(H, t, 1, s));
      const C4 = p => [[p[0] - s * w * .5, p[1] + h * .7, p[2]], [p[0] + s * w * .5, p[1] + h * .7, p[2]], [p[0] + s * w * .5, p[1] - h * .3, p[2]], [p[0] - s * w * .5, p[1] - h * .3, p[2]]];
      const A = C4(T[0]), B = C4(T[1]); for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; pos.push(...A[k], ...B[k], ...B[k2], ...A[k], ...B[k2], ...A[k2]); }
    }
    return M(g, geoDa(pos), m);
  }
  function bitta(g, x, y, z) { M(g, CY(.035, .045, .12, 8), C.scuro, x, y + .06, z); M(g, CY(.06, .06, .025, 8), C.scuro, x, y + .12, z); }
  function rete(g, x, y, z, w, d, r, col) {   // la rete ammucchiata coi sugheri arancioni
    const m = M(g, new THREE.IcosahedronGeometry(1, 1), mat(col || '#2f4a3a', 'tela'), x, y + .1, z); m.scale.set(w / 2, .2, d / 2);
    for (let k = 0; k < 7; k++) { const a = r() * PI * 2, rr = .75 + r() * .2; M(g, new THREE.SphereGeometry(.05, 6, 4), mat('#f06a2a', 'plastica'), x + Math.cos(a) * w / 2 * rr, y + .1 + r() * .08, z + Math.sin(a) * d / 2 * rr); }
    return m;
  }
  function nassa(g, x, y, z, ry) {   // la nassa di giunco: un cilindro a maglie con la bocca a imbuto
    const n = new THREE.Group(); n.position.set(x, y + .17, z); n.rotation.set(0, ry || 0, PI / 2); g.add(n);
    M(n, CY(.17, .17, .55, 10, true), mat('#9a7a48', 'tela')); for (const yy of [-.27, 0, .27]) M(n, new THREE.TorusGeometry(.17, .012, 3, 12), mat('#6a5030', 'legno'), 0, yy, 0, PI / 2);
    M(n, CY(.17, .05, .16, 10, true), mat('#8a6a3a', 'tela'), 0, .2, 0);
  }
  function parabordo(g, x, y, z) { M(g, CY(.07, .07, .4, 10), mat('#f2f2ee', 'plastica'), x, y - .25, z).userData.sporge = true; asta(g, [x, y + .01, z], [x, y - .06, z], .008, mat('#d8cfae', 'tela'), 4).userData.sporge = true; }
  // il fuoribordo appeso allo specchio di poppa (z0): staffa, calotta, gambo, elica
  function fuoribordo(g, x, y, z0, w, h, L) {
    const fb = new THREE.Group(); fb.position.set(x, y, z0); g.add(fb);
    M(fb, BX(.2, .2, .03), C.scuro, 0, -.02, -.015); M(fb, BX(w, h, w), mat('#1a1a20', 'plastica'), 0, .1, -.03 - w / 2);
    const yb = .1 - h / 2; M(fb, BX(w * .32, L, w * .36), C.scuro, 0, yb - L / 2 + .01, -.03 - w * .6); M(fb, CY(.035, .035, .16, 8), C.scuro, 0, yb - L + .04, -.03 - w * .75, PI / 2);
    for (let k = 0; k < 3; k++) M(fb, BX(.02, .2, .06), C.acciaio, 0, yb - L + .04, -.03 - w * .75 - .09, k * PI * 2 / 3, 0, 0);
  }
  // la cabina: un blocco coi vetri su tre lati, il tetto che sporge, la porta
  function cabina(g, w, h, d, x, y, z, col, vetri) {
    const c = new THREE.Group(); c.position.set(x, y, z); g.add(c);
    M(c, BX(w, h, d), mat(col, 'plastica'), 0, h / 2, 0); M(c, BX(w + .12, .06, d + .14), mat(col, 'plastica'), 0, h + .03, 0);
    const vy = h * .68, vh = h * .3, vm = vetri || C.vetroscuro;
    M(c, BX(w * .86, vh, .02), vm, 0, vy, d / 2 + .005); [-1, 1].forEach(s => { M(c, BX(.02, vh, d * .7), vm, s * (w / 2 + .005), vy, .02); M(c, BX(.01, h * .85, .03), C.scuro, s * (w / 2 + .01), h * .45, -d / 2 + .25); });
    M(c, BX(w * .4, h * .8, .02), mat('#3a3a3e', 'plastica'), w * .2, h * .42, -d / 2 - .005); M(c, BX(w * .32, vh * .7, .02), vm, w * .2, vy, -d / 2 - .012);
    return c;
  }
  const BARCHE = {
    // il gozzo: legno a punta da tutte e due le parti, il dritto di prua alto, banchi, remi negli scalmi, reti o nasse, il timone con la barra
    gozzo(r, o) {
      const g = new THREE.Group(), H = scafoForma(5, 1.75, .78, true), col = o && o.col || pickR(r, ['#f2eee4', '#f2eee4', '#2f6aa0', '#3a8a6a', '#e8d8a8']), band = o && o.band || pickR(r, ['#2a5a9a', '#c83a2a', '#2a8a6a', '#e0b040', '#1a2a4a']), dr = PESCAGGIO.gozzo;
      const corpo = scafoMesh(g, H, col, band, .2, false, dr, null, true);
      M(g, ponteGeo(H, -dr + .06, .12, .08, .92), legnoM('#a07448'));   // il pagliolato
      falchetta(g, H, .07, .06, legnoM('#6a4428'));
      [.3, .5, .7].forEach(t => M(g, BX(H.hw(t) * 2 - .14, .05, .24), legnoM('#a07448'), 0, H.sh(t) - .2, -2.5 + t * 5));   // i banchi
      M(g, BX(.08, .62, .12), mat(band, 'plastica'), 0, H.sh(1) + .1, 2.44, -.2); M(g, BX(.08, .42, .12), mat(band, 'plastica'), 0, H.sh(0) + .04, -2.44, .2);   // il dritto di prua alto, alla ligure
      [-1, 1].forEach(s => { const t = .52, x = s * H.hw(t), y = H.sh(t) + .06; asta(g, [x, y, -2.5 + t * 5], [x, y + .12, -2.5 + t * 5], .015, legnoM('#5a3a26'), 4); lista(g, [x - s * .06, y + .1, -2.5 + t * 5 + .9], [x - s * .26, H.sh(.3) - .17, -2.5 + t * 5 - 1.6], .05, .03, legnoM('#8a6040')); });   // scalmi e remi tirati in barca
      [[.2, 1], [.82, 1], [.2, -1], [.82, -1]].forEach(([t, s]) => bitta(g, s * (H.hw(t) - .06), H.sh(t) + .03, -2.5 + t * 5));
      M(g, BX(.03, .55, .18), legnoM('#7a5236'), 0, -.18, -2.53); M(g, BX(.04, .12, .06), legnoM('#5a3a26'), 0, H.sh(0) + .02, -2.47); asta(g, [0, H.sh(0) + .06, -2.47], [0, H.sh(0) + .18, -1.7], .022, legnoM('#a07448'), 5);   // il timone con la barra
      if (r() < .55) rete(g, .15, -dr + .07, -1.3, .8, .7, r); else { nassa(g, -.25, -dr + .07, -1.25, .2); nassa(g, .3, -dr + .07, -1.4, -.1); nassa(g, .02, -dr + .4, -1.3, .05); }
      if (r() < .5) { M(g, BX(.4, .3, .5), mat('#3a3a40', 'metallo'), 0, -dr + .2, .3); M(g, BX(.42, .04, .52), legnoM('#6a4428'), 0, -dr + .36, .3); }   // il motorino entrobordo nella sua cassa
      M(g, new THREE.TorusGeometry(.09, .02, 4, 8), mat('#4a4a50', 'metallo'), 0, -dr + .085, 1.9, PI / 2);   // l'ancorotto e la cima
      void corpo; return { g, H };
    },
    // la lancia a motore: specchio di poppa, cabinetta a prua coi vetri, fuoribordo, parabordi
    lancia(r, o) {
      const g = new THREE.Group(), H = scafoForma(5.6, 2.1, .9, false), Z = t => -2.8 + t * 5.6, col = o && o.col || pickR(r, ['#f2eee4', '#e8e4da', '#3a6a9a']), band = pickR(r, ['#2a5a9a', '#c8402a', '#1f3a5a']), dr = PESCAGGIO.lancia;
      scafoMesh(g, H, col, band, .18, true, dr, null, true);
      M(g, ponteGeo(H, -dr + .06, .1), legnoM('#a07448')); M(g, ponteGeo(H, H.sh(.8) - .04, .04, .72, 1), mat('#e8e2d6', 'plastica'));   // pagliolato e ponte di prua
      falchetta(g, H, .07, .06, legnoM('#6a4428'));
      cabina(g, 1.4, .62, 1.3, 0, -dr + .06, 1.1, '#f2eee6');
      [.15, .5].forEach(t => M(g, BX(H.hw(t) * 2 - .12, .06, .3), legnoM('#a07448'), 0, H.sh(t) - .25, Z(t)));
      fuoribordo(g, 0, H.sh(0), Z(0), .36, .4, .7);
      [[.15, 1], [.85, 1], [.15, -1], [.85, -1]].forEach(([t, s]) => bitta(g, s * (H.hw(t) - .07), H.sh(t) + .03, Z(t)));
      [.35, .6].forEach(t => [-1, 1].forEach(s => parabordo(g, s * (H.hw(t) + .05), H.sh(t) + .02, Z(t))));
      return { g, H };
    },
    // il motoscafo: vetroresina bianca con la fascia di colore, parabrezza, sedili imbottiti, prendisole, tientibene cromati
    motoscafo(r) {
      const g = new THREE.Group(), H = scafoForma(6.6, 2.4, .95, false), c2 = pickR(r, ['#c83a2a', '#1f3a6a', '#2a6a8a', '#e0b040', '#1a1a22']), dr = PESCAGGIO.motoscafo;
      scafoMesh(g, H, '#f4f2ee', c2, .22, true, dr, '#1f2a3a', false);
      M(g, ponteGeo(H, H.sh(.5) - .02, .04, .52, 1), mat('#f4f2ee', 'plastica')); M(g, ponteGeo(H, -dr + .07, .14, 0, .52), mat('#c8b89a', 'plastica'));
      falchetta(g, H, .05, .04, C.cromo, .02, .98);
      const yd = H.sh(.5); lista(g, [-.95, yd - .03, .45], [-.95, yd + .5, .3], .1, .06, C.cromo); lista(g, [.95, yd - .03, .45], [.95, yd + .5, .3], .1, .06, C.cromo);
      M(g, BX(1.9, .5, .03), mat('#3a4a5a', 'vetroscuro'), 0, yd + .26, .38, -.3);   // il parabrezza
      M(g, BX(.7, .45, .55), mat('#e8e2d6', 'plastica'), .5, -dr + .3, -.3); M(g, BX(.55, .12, .5), mat('#8a2a24', 'stoffa'), .5, -dr + .58, -.3); M(g, BX(.55, .4, .1), mat('#8a2a24', 'stoffa'), .5, -dr + .75, -.55);   // il posto di guida
      M(g, new THREE.TorusGeometry(.14, .015, 4, 12), C.nero, .5, yd + .1, .05, -.9); M(g, BX(.5, .25, .3), mat('#e8e2d6', 'plastica'), .5, -dr + .45, .12);
      M(g, BX(.6, .45, .55), mat('#e8e2d6', 'plastica'), -.5, -dr + .3, -.3); M(g, BX(.55, .12, .5), mat('#8a2a24', 'stoffa'), -.5, -dr + .58, -.3);
      M(g, BX(1.8, .3, 1.1), mat('#e8e2d6', 'plastica'), 0, -dr + .22, -2.1); M(g, BX(1.7, .1, 1.0), mat('#8a2a24', 'stoffa'), 0, -dr + .42, -2.1);   // il prendisole
      fuoribordo(g, 0, H.sh(0), -3.3, .5, .62, .75);
      [[.1, 1], [.9, 1], [.1, -1], [.9, -1]].forEach(([t, s]) => bitta(g, s * (H.hw(t) - .07), H.sh(t) + .02, -3.3 + t * 6.6));
      asta(g, [.7, H.sh(0) - .05, -3.28], [.7, H.sh(0) + .9, -3.3], .012, C.cromo, 4); M(g, BX(.004, .22, .32), mat('#2a8a3a', 'tela'), .7, H.sh(0) + .78, -3.45);   // l'asta della bandiera
      return { g, H };
    },
    // il peschereccio: scafo di legno, murata, timoneria coi vetri su tre lati, albero coi fanali, portale di poppa, verricello con la rete, cassette
    peschereccio(r) {
      const g = new THREE.Group(), H = scafoForma(11, 3.7, 1.7, false), col = pickR(r, ['#2a5a9a', '#c83a2a', '#2a8a6a', '#f0e8d8', '#1f3a5a']), dr = PESCAGGIO.peschereccio;
      scafoMesh(g, H, col, pickR(r, ['#f2eee6', '#e8c040', '#f2eee6']), .16, true, dr, null, true);
      const yd = H.sh(.45) - .45; M(g, ponteGeo(H, yd, .08), legnoM('#9a7a58'));
      falchetta(g, H, .1, .08, legnoM('#5a3a26'));
      for (let t = .06; t < .98; t += .09) [-1, 1].forEach(s => M(g, BX(.06, .45, .06), legnoM('#5a3a26'), s * (H.hw(t) - .05), H.sh(t) - .2, -5.5 + t * 11));   // gli scalmotti della murata
      const ch = cabina(g, 2.3, 1.9, 2.4, 0, yd, 1.2, '#ece6d8', mat('#203040', 'vetroscuro')); void ch;
      M(g, BX(2.5, .14, 2.6), mat(col, 'plastica'), 0, yd + 1.97, 1.2);
      asta(g, [0, yd + 2.0, 1.6], [0, yd + 5.8, 1.6], .08, mat('#26242c', 'metallo'), 6); M(g, BX(1.6, .06, .06), mat('#26242c', 'metallo'), 0, yd + 5.2, 1.6); [-.7, .7].forEach(s => M(g, BX(.14, .14, .14), mat(s < 0 ? '#e04030' : '#30c050', 'lente'), s, yd + 5.3, 1.6));   // l'albero coi fanali
      M(g, BX(1.2, .08, .14), C.scuro, 0, yd + 2.25, 1.6); M(g, BX(.3, .06, .04), C.scuro, 0, yd + 2.3, 1.6);   // il radar
      [-1.4, 1.4].forEach(s => M(g, BX(.16, 3.2, .16), mat('#e8a020', 'metallo'), s, yd + 1.6, -4.4)); M(g, BX(3, .18, .18), mat('#e8a020', 'metallo'), 0, yd + 3.2, -4.4);   // il portale di poppa
      const vr = new THREE.Group(); vr.position.set(0, yd + .65, -3.1); g.add(vr);   // il verricello con la rete avvolta
      M(vr, CY(.55, .55, 2, 12), mat('#2f4a3a', 'tela'), 0, 0, 0, 0, 0, PI / 2); [-1.05, 1.05].forEach(x => M(vr, CY(.62, .62, .1, 12), mat('#8a2a20', 'metallo'), x, 0, 0, 0, 0, PI / 2)); [-1.05, 1.05].forEach(x => M(vr, BX(.1, .65, .3), mat('#8a2a20', 'metallo'), x, -.32, 0));
      rete(g, -.9, yd, -1.6, 1.0, 1.2, r); rete(g, .8, yd, -.6, .8, .9, r, '#5a3a2a');
      for (let k = 0; k < 6; k++) M(g, BX(.5, .25, .38), mat(pickR(r, ['#4a8ab0', '#e8e0d0', '#e04030']), 'plastica'), -1 + (k % 3) * .55, yd + .13, -.2 - (k % 2) * .42);
      for (let k = 0; k < 4; k++) [-1, 1].forEach(s => { M(g, new THREE.TorusGeometry(.3, .1, 5, 10), C.gomma, s * (H.hw(.25 + k * .15) + .06), H.sh(.3) - .4, -3 + k * 1.6, 0, PI / 2, 0).userData.sporge = true; });   // i copertoni appesi fuori
      [[.12, 1], [.92, 1], [.12, -1], [.92, -1], [.55, 1], [.55, -1]].forEach(([t, s]) => bitta(g, s * (H.hw(t) - .25), yd, -5.5 + t * 11));
      M(g, CY(.25, .25, .7, 10), mat('#f2f2ee', 'plastica'), 1.0, yd + 2.2, 2.0, 0, 0, PI / 2);   // la zattera di salvataggio
      M(g, BX(.06, 1.1, .7), legnoM('#5a3a26'), 0, -1.2, -5.58);   // il timone
      return { g, H };
    },
    // il traghetto per il continente: prua a portellone, ponte delle auto aperto con le auto a bordo, sovrastruttura coi finestrini, plancia, fumaiolo, scialuppe
    traghetto(r) {
      const g = new THREE.Group(), H = scafoForma(40, 10, 3.6, false), dr = PESCAGGIO.traghetto;
      scafoMesh(g, H, '#1f3a6a', '#f2efe6', .32, true, dr, '#8a2a20', false);
      const yd = H.sh(.4) + .2; M(g, ponteGeo(H, yd, .25), mat('#5a5a56', 'plastica'));   // il ponte delle auto
      falchetta(g, H, .3, .9, mat('#f2efe6', 'plastica'), .0, .97);   // la murata alta
      const sv = new THREE.Group(); sv.position.set(0, yd, -9); g.add(sv);   // la sovrastruttura a poppa
      M(sv, BX(8.4, 2.6, 14), mat('#f2efe6', 'plastica'), 0, 1.3 + 2.6, 0); for (let i = 0; i < 12; i++) [-1, 1].forEach(s => M(sv, BX(.04, .7, .8), mat('#1c2834', 'vetroscuro'), s * 4.21, 4.2, -6 + i * 1.1));
      [-1, 1].forEach(s => { M(sv, BX(.3, 2.6, .3), mat('#f2efe6', 'plastica'), s * 4, 1.3, 6.8); M(sv, BX(.3, 2.6, .3), mat('#f2efe6', 'plastica'), s * 4, 1.3, -6.8); });   // i pilastri sopra il ponte delle auto
      M(sv, BX(7, 2.2, 5), mat('#f2efe6', 'plastica'), 0, 6.3, 3.5); M(sv, BX(7.04, .8, 5.04), mat('#1c2834', 'vetroscuro'), 0, 6.7, 3.5); M(sv, BX(10, .3, 2), mat('#f2efe6', 'plastica'), 0, 7.5, 5);   // la plancia con le alette
      M(sv, CY(1.0, 1.2, 3.5, 12), mat('#c83a2a', 'plastica'), 0, 6.94, -3); M(sv, CY(1.02, 1.02, .8, 12), C.scuro, 0, 8.9, -3); M(sv, BX(2.1, .3, 2.1), mat('#f2efe6', 'plastica'), 0, 7.3, -3);   // il fumaiolo rosso
      [-1, 1].forEach(s => { const lb = M(sv, CY(.7, .7, 4, 10), mat('#f06a1a', 'plastica'), s * 4.6, 5.6, -2, PI / 2); lb.scale.set(1, 1, .8); asta(sv, [s * 4.2, 5.2, -3.4], [s * 4.6, 6.4, -3.4], .06, C.acciaio, 4); asta(sv, [s * 4.2, 5.2, -.6], [s * 4.6, 6.4, -.6], .06, C.acciaio, 4); M(sv, BX(.4, .12, 4.2), C.acciaio, s * 4.4, 6.4, -2); });   // le scialuppe sulle gru
      asta(sv, [0, 7.38, 3.5], [0, 12, 3.5], .1, C.scuro, 6); M(sv, BX(2.4, .12, .12), C.scuro, 0, 10.5, 3.5);   // l'albero
      M(g, BX(6, 4, .5), mat('#f2efe6', 'plastica'), 0, yd + 2, 19.3, -.25);   // il portellone di prua alzato
      // le auto a bordo, nella loro fila (i modelli lontani: bastano)
      const fila = ['f126', 'panda', 'ritmo', 'uno', 'f127', 'ducato'], cols = TAVOLOZZA;
      for (let i = 0; i < 6; i++) { const id = fila[i], R = COSTR[id] && COSTR[id](pickR(r, cols), {}); if (!R) continue; const a = R.basso; a.position.set(i % 2 ? 2 : -2, yd - .03, 12 - Math.floor(i / 2) * 5); g.add(a); }
      [[.06, 1], [.06, -1], [.95, 1], [.95, -1]].forEach(([t, s]) => { const x = s * (H.hw(t) - .6); M(g, CY(.18, .22, .5, 8), C.scuro, x, yd + .25, -20 + t * 40); M(g, CY(.3, .3, .06, 8), C.scuro, x, yd + .52, -20 + t * 40); });
      [-1, 1].forEach(s => M(g, BX(.5, 1.5, .1), mat('#f2efe6', 'plastica'), s * 2.5, -.9, -20.05));   // i timoni gemelli
      return { g, H };
    },
  };
  function barca(tipo, r, o) { const f = BARCHE[tipo]; if (!f) return null; const B = f(r, o || {}); B.draft = PESCAGGIO[tipo]; return B; }
  const rngSeme = s => { let x = (s >>> 0) || 7; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const LUNGHEZZE = { gozzo: [5, 1.75], lancia: [6, 2.1], motoscafo: [7, 2.4], peschereccio: [11, 3.7], traghetto: [40, 10.5] };
  for (const id in BARCHE) ALTRI[id] = { nome: id[0].toUpperCase() + id.slice(1), L: LUNGHEZZE[id][0], W: LUNGHEZZE[id][1], tipo: 'barca', make: (col, o) => { o = o || {}; const B = barca(id, rngSeme(o.seme || 5), { col: o.colScafo }); const basso = new THREE.Group(); return { alto: B.g, basso, ud: { barca: true, pescaggio: B.draft, H: B.H, wheels: [] } }; } };

  // ================= scelta e costruzione =================
  const COSTR = {};   // id → (colore, opzioni) → { alto, basso, ud }
  for (const id in AUTO) COSTR[id] = (col, o) => { const D = AUTO[id](); if (D.opz) D.opz(D, o || {}); return auto(D, col, o); };
  for (const id in ALTRI) COSTR[id] = ALTRI[id].make;
  // per ogni tipo di mezzo del gioco (VK) i modelli che ci stanno dentro (entro il 5% di lunghezza e larghezza)
  const VARIANTI = { cinquecento: ['f126', 'f126', 'panda'], ritmo: ['ritmo', 'f127', 'uno', 'uno', 'delta'], giulia: ['giulietta', 'alfa33', 'f131'], polizia: ['alfetta', 'f131'],
    furgone: ['ducato', 'om'], fuoristrada: ['campagnola'], campagnola: ['campagnola'], camion: ['rifiuti', 'cassonato', 'telonato'], blindato: ['blindato'], ape: ['ape'], vespa: ['vespa'], bmx: ['bmx'], autobus: ['autobus'], ciao: ['ciao'] };   // [vievive] l'autobus della linea, il Ciao
  function hash(s) { let h = 0; s = String(s || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }
  function scegli(v) {
    const k = v.kind, h = hash(v.id);
    if (v.modello && COSTR[v.modello]) return v.modello;   // [scorci] il mezzo dello scorcio ha il suo modello (la 500 in sosta)
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
  return { costruisci, scegli, perVeicolo, epoca, barca, PESCAGGIO, MODELLI, VARIANTI, get ids() { return Object.keys(COSTR); },
    __core: { mat, C, nastro, loft, padiglione, ruota, ytAt, hwAt } };
})();
