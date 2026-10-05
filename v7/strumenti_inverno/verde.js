  // ================= [verde] IL PRATO VARIO E LA VEGETAZIONE MEDIA =================
  // Il prato non è più una tinta a puntini: si dipinge a mezzo metro in coordinate di mondo con campi lisci che hanno un senso
  // (umidità, erba secca, macchie di erba morta, trifoglio e muschio dove è umido, terra nuda, bordo strada calpestato, foglie
  // cadute al margine del bosco), più fili d'erba, cumuli di talpa, sassi affioranti e fiori a colonie. I campi coltivati sono
  // appezzamenti veri (celle di Voronoi da ~24 m) con solchi orientati per appezzamento: arato, stoppie, grano giovane, maggese,
  // orto a prose; fra un campo e l'altro la capezzagna d'erba. La vegetazione media è fatta per specie (cespi d'erba, erba alta
  // con le spighe, giunchi, felci secche, rovi, rosa canina coi cinorrodi, arbusti spogli, ginepri, erica, ginestre, cardi,
  // ombrellifere secche, verbasco, fiori, sassi, mucchi di spietramento, rami caduti, cavoli) e messa dove crescerebbe:
  // margine del bosco, prato secco o umido, roccia, bordo strada, capezzagne; ogni specie a colonie, non sparsa a caso.
  const VD = { on: true, geo: null, PRD: new Uint8Array(G.GW * G.GH), EDG: new Float32Array(G.GW * G.GH).fill(-1), RDN: new Float32Array(G.GW * G.GH).fill(-1) };
  const vdS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const vdMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const vdRGB = c => 'rgb(' + Math.max(0, Math.min(255, c[0] | 0)) + ',' + Math.max(0, Math.min(255, c[1] | 0)) + ',' + Math.max(0, Math.min(255, c[2] | 0)) + ')';
  const vdFr = v => v - Math.floor(v);
  const VDC = {
    green: [68, 106, 42], straw: [112, 112, 60], rust: [92, 84, 48], moss: [44, 84, 34], graze: [84, 110, 50], litter: [74, 66, 40], mud: [70, 60, 42],
    dark: [38, 62, 30], rock: [58, 56, 50],
    soil: [78, 60, 44], ridge: [94, 74, 54], furrow: [56, 44, 34], frost: [108, 110, 108], straw2: [126, 112, 78], stub: [100, 86, 58],
    wheat: [72, 94, 44], soil2: [76, 60, 44], bed: [58, 44, 34], path: [90, 78, 60],
  };
  // umidità: macchie larghe, il lago bagna, il vento salato asciuga la riva
  function vdWet(X, Y) {
    let w = vnz(X / 46 + 3.1, Y / 46 + 7.7) * 1.2 + vnz(X / 13 + 1.7, Y / 13 + 4.2) * .45;
    const LK = M.world && M.world.LAKE; if (LK) { const q = Math.hypot((X - LK.x) / LK.rx, (Y - LK.y) / LK.ry); if (q < 2.4) w += (2.4 - q) * .35; }
    const ci = coastIn(X, Y); if (ci > 0 && ci < 14) w -= (14 - ci) / 14 * .25;
    return w;
  }
  // quanti alberi e quanta strada attorno a una casella (5 × 5): il margine del bosco e il bordo strada
  function vdTreeN(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; const i = ty * G.GW + tx; if (VD.EDG[i] >= 0) return VD.EDG[i];
    let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (gT(tx + dx, ty + dy) === G.T.TREE) c++; return (VD.EDG[i] = c);
  }
  function vdRoadN(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; const i = ty * G.GW + tx; if (VD.RDN[i] >= 0) return VD.RDN[i];
    let c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const a = tx + dx, b = ty + dy; if (a < 0 || b < 0 || a >= G.GW || b >= G.GH) continue; const v = gT(a, b); if (v === G.T.VIA || (RW[b * G.GW + a] > 0 && v === G.T.DIRT)) c++; }
    return (VD.RDN[i] = c);
  }
  // un campo per casella, letto in modo lineare fra i centri delle caselle: niente scalini
  function vdField(fn, X, Y) {
    const fx = X / TS - .5, fy = Y / TS - .5, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    return (fn(i, j) * (1 - u) + fn(i + 1, j) * u) * (1 - v) + (fn(i, j + 1) * (1 - u) + fn(i + 1, j + 1) * u) * v;
  }
  // il colore del prato in un punto
  function vdPrato(X, Y, top, rough) {
    const w = vdWet(X, Y), k1 = vnz(X / 9 + 11, Y / 9 + 3), k2 = vnz(X / 3.3 + 5, Y / 3.3 + 9), k3 = vnz(X / 17 + 29, Y / 17 + 13);
    const ed = vdField(vdTreeN, X, Y), rd = vdField(vdRoadN, X, Y);
    let c = vdMix(VDC.green, VDC.straw, vdS(.05, .6, -w + k1 * .4 + (top ? .2 : 0)));
    if (k3 > .24) c = vdMix(c, VDC.rust, Math.min(.35, (k3 - .24) * 2));                       // erba morta, romice, felce secca
    if (k2 > .2 && w > -.15) c = vdMix(c, VDC.moss, Math.min(.55, (k2 - .2) * 3));            // trifoglio e muschio dove è umido
    if (rough) c = vdMix(c, VDC.dark, .22 + Math.max(0, k2) * .3);                            // sotto la macchia è più scuro
    if (rd > 0) c = vdMix(c, VDC.graze, Math.min(.45, rd * .06));                              // bordo strada: erba bassa, calpestata
    if (ed > 0) c = vdMix(c, VDC.litter, Math.min(.55, ed * .05));                             // margine del bosco: foglie cadute
    const bare = vnz(X / 5 + 50, Y / 5 + 50) + rd * .02; if (bare > .34) c = vdMix(c, VDC.mud, Math.min(.7, (bare - .34) * 4));
    if (top) { const q = k1 + vnz(X / 23 + 17, Y / 23 + 17) * .6; if (q > .2) c = vdMix(c, VDC.rock, Math.min(.85, (q - .2) * 4)); }   // il pianoro: roccia bagnata che affiora
    return c;
  }
  // gli appezzamenti: celle di Voronoi da 24 m, ognuna col suo tipo e la direzione dei solchi; e = distanza dal confine
  const VDP = 24;
  function vdParcel(X, Y) {
    const ci = Math.floor(X / VDP), cj = Math.floor(Y / VDP); let d1 = 1e9, d2 = 1e9, a1 = 0, b1 = 0, p1x = 0, p1y = 0, p2x = 0, p2y = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const a = ci + di, b = cj + dj, px = (a + .15 + th(a, b, 81) * .7) * VDP, py = (b + .15 + th(a, b, 82) * .7) * VDP, d = (X - px) ** 2 + (Y - py) ** 2;
      if (d < d1) { d2 = d1; p2x = p1x; p2y = p1y; d1 = d; a1 = a; b1 = b; p1x = px; p1y = py; } else if (d < d2) { d2 = d; p2x = px; p2y = py; }
    }
    const e = (d2 - d1) / (2 * (Math.hypot(p2x - p1x, p2y - p1y) || 1)), q = th(a1, b1, 83);
    return { a: a1, b: b1, e, t: q < .26 ? 0 : q < .46 ? 1 : q < .7 ? 2 : q < .86 ? 3 : 4, ang: th(a1, b1, 84) * Math.PI };
  }
  // quanto un punto è dentro il campo: gli spigoli delle caselle si arrotondano
  const vdIsF = (tx, ty) => tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && gT(tx, ty) === G.T.FIELD ? 1 : 0;
  function vdCampoUV(pc, X, Y) {
    const ca = Math.cos(pc.ang), sa = Math.sin(pc.ang), wob = pc.t === 4 ? 0 : vnz(X / 30 + pc.a, Y / 30 + pc.b) * 2.5;
    return [X * ca + Y * sa + wob, -X * sa + Y * ca];
  }
  function vdCampo(x, px, py, tx, ty, r, top) {
    const wx = tx * TS, wy = ty * TS;
    for (let sj = 0; sj < 8; sj++) for (let si = 0; si < 8; si++) {
      const X = wx + (si + .5) * .25, Y = wy + (sj + .5) * .25, pc = vdParcel(X, Y), u = vdCampoUV(pc, X, Y)[0], n1 = vnz(X / 4 + pc.a * 3, Y / 4 + pc.b * 3);
      const inF = vdField(vdIsF, X, Y) + vnz(X / 2.5, Y / 2.5) * .35;
      let c;
      if (inF < .5) c = vdPrato(X, Y, top, false);
      else if (pc.e < 1.1) c = vdMix(vdPrato(X, Y, top, false), VDC.dark, pc.e < .45 ? .22 : 0);   // la capezzagna fra due campi
      else if (pc.t === 0) { const s = vdFr(u / .8); c = s < .45 ? VDC.ridge : s < .8 ? VDC.soil : VDC.furrow; if (s > .8 && s < .95 && n1 > .08) c = VDC.frost; }   // arato, brina nei solchi
      else if (pc.t === 1) { const s = vdFr(u / .32); c = s < .3 ? VDC.stub : VDC.straw2; if (n1 > .22) c = vdMix(c, VDC.green, .5); }                                  // stoppie
      else if (pc.t === 2) { const s = vdFr(u / .36), dn = .55 + n1 * .8; c = s < .42 * dn + .1 ? VDC.wheat : VDC.soil2; }                                             // grano giovane a file
      else if (pc.t === 3) c = vdMix(vdPrato(X, Y, top, true), VDC.rust, .2 + Math.max(0, n1) * .4);                                                                   // maggese
      else { const s = vdFr(u / 1.4); c = s < .72 ? VDC.bed : VDC.path; }                                                                                             // orto a prose
      const j = (r() - .5) * 8; x.fillStyle = vdRGB([c[0] + j, c[1] + j, c[2] + j * .6]); x.fillRect(px + si * 2, py + sj * 2, 2, 2);
    }
  }
  // si chiama da paintTiles prima del bosco: prende prato, macchia aperta e campi fuori città
  function prato38(x, px, py, P, tx, ty, r, v, z, ii) {
    const T = G.T, W0 = M.world; if (z === ZN.CITTA) return false;
    const F = W0 && W0.feat ? W0.feat[ii] : 0; if (F & 8192) return false;   // il ghiaione resta del bosco
    const top = !!(F & 2048), wx = tx * TS, wy = ty * TS, S4 = P / 4;
    let rough = false;
    if (v === T.FIELD) { vdCampo(x, px, py, tx, ty, r, top); VD.PRD[ii] = 1; return true; }
    if (v === T.SHRUB) { if (!top && vdTreeN(tx, ty) > 6) return false; rough = true; }   // dentro il bosco il suolo è quello del bosco
    else if (v === T.ROCK && top) rough = true;
    else if (v === T.TREE && (top || vdTreeN(tx, ty) <= 3)) rough = true;   // albero isolato nel prato: niente quadrato di bosco sotto
    else if (v !== T.GRASS) return false;
    VD.PRD[ii] = 1;
    const cols = [];
    for (let sj = 0; sj < 4; sj++) for (let si = 0; si < 4; si++) {
      const X = wx + (si + .5) * .5, Y = wy + (sj + .5) * .5, c0 = vdPrato(X, Y, top, rough), c = v === T.ROCK ? vdMix(c0, VDC.rock, vdS(-.3, .25, vnz(X / 4 + 7, Y / 4 + 3))) : c0, j = (r() - .5) * 9, cc = [c[0] + j, c[1] + j, c[2] + j * .6];
      cols.push(cc); x.fillStyle = vdRGB(cc); x.fillRect(px + si * S4, py + sj * S4, S4, S4);
    }
    // fili d'erba: trattini più chiari e più scuri del posto
    for (let q = 0; q < 22; q++) { const ix = Math.floor(r() * P), iy = Math.floor(r() * P), c = cols[(iy >> 2) * 4 + (ix >> 2)], k = r() < .55 ? 1.13 : .86; x.fillStyle = vdRGB([c[0] * k, c[1] * k, c[2] * k]); x.fillRect(px + ix, py + iy, 1, r() < .5 ? 2 : 1); }
    const w0 = vdWet(wx + 1, wy + 1);
    // cumuli di talpa dove la terra è grassa
    if (!top && th(tx, ty, 61) < (w0 > 0 ? .02 : .007)) { const cx = px + 3 + r() * 10, cy = py + 3 + r() * 10; x.fillStyle = '#4a3626'; x.beginPath(); x.ellipse(cx, cy, 2.6, 2, 0, 0, 6.3); x.fill(); x.fillStyle = '#6a5038'; x.beginPath(); x.ellipse(cx - .6, cy - .5, 1.5, 1.1, 0, 0, 6.3); x.fill(); }
    // sassi affioranti
    if (th(tx, ty, 64) < (top ? .1 : .025)) { const cx = px + 2 + r() * 12, cy = py + 2 + r() * 12, rr = 1.2 + r() * 1.6; x.fillStyle = '#5e5a54'; x.beginPath(); x.ellipse(cx, cy, rr, rr * .75, r() * 3, 0, 6.3); x.fill(); x.fillStyle = 'rgba(170,166,156,.6)'; x.fillRect(Math.floor(cx - rr * .4), Math.floor(cy - rr * .5), 1, 1); }
    // fiori a colonie (bianchi, gialli, viola), mai sparsi uno per casella
    const fl = vnz(wx / 7 + 70, wy / 7 + 70); if (fl > .18 && !rough) { const h = th(Math.floor(wx / 26), Math.floor(wy / 26), 63), col = h < .4 ? '#e8e4d8' : h < .72 ? '#e0c040' : '#9a78c0', k = Math.floor((fl - .18) * 60);
      for (let q = 0; q < k; q++) { x.fillStyle = col; x.fillRect(px + Math.floor(r() * P), py + Math.floor(r() * P), 1, 1); } }
    return true;
  }

  // ---------------- le forme delle piante: triangoli coi colori veri per vertice, il vento più forte in alto ----------------
  const vdH = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const vdL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const vdK = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  function vdB(soft) {
    const P = [], C = [], W = [];
    const tri = (a, b, c, ca, cb, cc, wa, wb, wc) => { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); C.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]); W.push(wa || 0, wb || 0, wc || 0); };
    const quad = (a, b, c, d, ca, cb, cc, cd, wa, wb, wc, wd) => { tri(a, b, c, ca, cb, cc, wa, wb, wc); tri(a, c, d, ca, cc, cd, wa, wc, wd); };
    // un filo d'erba (o una foglia lunga): base larga, a metà più stretto, punta che piega
    const blade = (x0, z0, ang, h, lean, w, c0, c1, sw) => {
      const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz * w, pz = dx * w, cm = vdL(c0, c1, .55), S = sw === undefined ? 1.6 : sw;
      const bL = [x0 + px, 0, z0 + pz], bR = [x0 - px, 0, z0 - pz], mx = x0 + dx * lean * .32, mz = z0 + dz * lean * .32, my = h * .55;
      const mL = [mx + px * .6, my, mz + pz * .6], mR = [mx - px * .6, my, mz - pz * .6], tip = [x0 + dx * lean, h * (1 - lean * .18), z0 + dz * lean];
      tri(bL, bR, mR, c0, c0, cm, 0, 0, my * S); tri(bL, mR, mL, c0, cm, cm, 0, my * S, my * S); tri(mL, mR, tip, cm, cm, c1, my * S, my * S, h * S);
    };
    // gambo: due nastri incrociati
    const stalk = (a, t, w, c0, c1, sw) => { for (let k = 0; k < 2; k++) { const ox = k ? w : 0, oz = k ? 0 : w; quad([a[0] - ox, a[1], a[2] - oz], [a[0] + ox, a[1], a[2] + oz], [t[0] + ox * .6, t[1], t[2] + oz * .6], [t[0] - ox * .6, t[1], t[2] - oz * .6], c0, c0, c1, c1, a[1] * sw, a[1] * sw, t[1] * sw, t[1] * sw); } };
    // capolino: tre rombi incrociati (si legge da ogni lato e dall'alto)
    const head = (c, r, col, col2, sw) => {
      const wv = c[1] * (sw || 1), top = [c[0], c[1] + r, c[2]], bot = [c[0], c[1] - r * .8, c[2]], dk = vdK(col, .7);
      for (let k = 0; k < 2; k++) { const ox = k ? r : 0, oz = k ? 0 : r, L = [c[0] - ox, c[1], c[2] - oz], R = [c[0] + ox, c[1], c[2] + oz]; tri(L, R, top, col, col, col2, wv, wv, wv); tri(R, L, bot, col, col, dk, wv, wv, wv); }
      quad([c[0] - r, c[1] + r * .2, c[2]], [c[0], c[1] + r * .2, c[2] - r], [c[0] + r, c[1] + r * .2, c[2]], [c[0], c[1] + r * .2, c[2] + r], col2, col, col2, col, wv, wv, wv, wv);
    };
    // foglia piatta (rosette, foglie del rovo)
    const leaf = (c, len, wid, ang, tilt, col, col2, sw) => {
      const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz * wid, pz = dx * wid, wv = c[1] * (sw || 1);
      const tip = [c[0] + dx * len, c[1] + tilt * len, c[2] + dz * len], m = [c[0] + dx * len * .45, c[1] + tilt * len * .5 + .01, c[2] + dz * len * .45];
      quad(c, [m[0] + px, m[1], m[2] + pz], tip, [m[0] - px, m[1], m[2] - pz], col, col2, col2, col2, wv, wv, wv + .02, wv);
    };
    // nastro lungo una polilinea (canne del rovo, rami)
    const ribbon = (pts, w, c0, c1, sw) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1, wa = w * (1 - k / pts.length * .6), wb = w * (1 - (k + 1) / pts.length * .6);
        const nx = -dz / L, nz = dx / L, ca = vdL(c0, c1, k / (pts.length - 1)), cb = vdL(c0, c1, (k + 1) / (pts.length - 1));
        quad([a[0] - nx * wa, a[1], a[2] - nz * wa], [a[0] + nx * wa, a[1], a[2] + nz * wa], [b[0] + nx * wb, b[1] + w * .5, b[2] + nz * wb], [b[0] - nx * wb, b[1] - w * .5, b[2] - nz * wb], ca, ca, cb, cb, a[1] * sw, a[1] * sw, b[1] * sw, b[1] * sw);
        quad([a[0], a[1] - wa, a[2]], [a[0], a[1] + wa, a[2]], [b[0], b[1] + wb, b[2]], [b[0], b[1] - wb, b[2]], ca, ca, cb, cb, a[1] * sw, a[1] * sw, b[1] * sw, b[1] * sw);
      }
    };
    // lobo: icosaedro lavorato, scuro sotto e dentro, chiaro in alto, ogni vertice col suo tono
    const lobe = (cx, cy, cz, rx, ry, rz, cB, cT, seed, amp, det, sw, mix) => {
      const g0 = new THREE.IcosahedronGeometry(1, det || 0).toNonIndexed(), p = g0.attributes.position;
      const vv = i => { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), q = [Math.round(x * 5), Math.round(y * 5 + z * 3), Math.round(z * 5)], k = 1 + amp * (vegHash(q[0] + seed, q[1], q[2] + seed * 3) - .5) * 2;
        let c = vdL(cB, cT, Math.max(0, Math.min(1, (y + 1) / 2))); if (mix) c = vdL(c, mix, vegHash(q[0], q[1] + seed, q[2]) < .35 ? .55 : 0); c = vdK(c, .88 + .24 * vegHash(q[2], q[0], q[1] + seed));
        return [[cx + x * rx * k, cy + y * ry * k, cz + z * rz * k], c, Math.max(0, cy + y * ry) * (sw || 0)]; };
      for (let i = 0; i < p.count; i += 3) { const A = vv(i), B = vv(i + 1), Cc = vv(i + 2); tri(A[0], B[0], Cc[0], A[1], B[1], Cc[1], A[2], B[2], Cc[2]); }
      g0.dispose();
    };
    const build = () => {
      const g = new THREE.BufferGeometry(), n = P.length / 3;
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setAttribute('aSnow', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(W, 1));
      g.computeVertexNormals();
      if (soft) { const nn = g.attributes.normal; for (let i = 0; i < n; i++) { const x = nn.getX(i) * .35, y = Math.abs(nn.getY(i)) * .35 + .75, z = nn.getZ(i) * .35, L = Math.hypot(x, y, z); nn.setXYZ(i, x / L, y / L, z / L); } }
      g.computeBoundingSphere(); return g;
    };
    return { tri, quad, blade, stalk, head, leaf, ribbon, lobe, build };
  }
  // le specie: ognuna in 2-3 varianti di forma
  function vdGeoms() {
    if (VD.geo) return VD.geo;
    const Gm = {}, H = vdH, TAU = 6.2832;
    const many = (name, k, fn) => { Gm[name] = []; for (let v = 0; v < k; v++) Gm[name].push(fn(rng(name.length * 977 + v * 131 + 7), v)); };
    // cespo d'erba d'inverno: base verde-oliva, punte color paglia, qualche filo tutto secco
    many('cespo', 3, r => { const b = vdB(true), N = 12 + Math.floor(r() * 4);
      for (let k = 0; k < N; k++) { const a = k / N * TAU + r() * .5, h = .32 + r() * .32, d = r() < .25; b.blade(Math.cos(a) * .04, Math.sin(a) * .04, a, h, .12 + r() * .22, .028, d ? H('#3e4a24') : H('#24401a'), d ? H('#a8a860') : vdL(H('#5a9032'), H('#8ab848'), r())); }
      return b.build(); });
    // erba bassa e verde dei prati umidi e dei bordi strada
    many('cespoV', 2, r => { const b = vdB(true), N = 11;
      for (let k = 0; k < N; k++) { const a = k / N * TAU + r() * .6, h = .16 + r() * .16; b.blade(Math.cos(a) * .05, Math.sin(a) * .05, a, h, .08 + r() * .14, .03, H('#2a4a1c'), vdL(H('#5c9a34'), H('#8cc04a'), r())); }
      return b.build(); });
    // erba alta secca con le spighe
    many('alta', 2, r => { const b = vdB(true);
      for (let k = 0; k < 9; k++) { const a = r() * TAU, h = .5 + r() * .35; b.blade(Math.cos(a) * .06, Math.sin(a) * .06, a, h, .18 + r() * .25, .025, H('#2e4a1e'), H('#9ac050')); }
      for (let k = 0; k < 4; k++) { const a = r() * TAU, l = .1 + r() * .2, h = .8 + r() * .35, t = [Math.cos(a) * l, h, Math.sin(a) * l]; b.stalk([0, 0, 0], t, .008, H('#4a6a2a'), H('#a0b060'), 1.6); b.head([t[0] * 1.04, h + .05, t[2] * 1.04], .045, H('#a8a868'), H('#e0dc9c'), 1.6); }
      return b.build(); });
    // giunchi: fusti dritti verde scuro, punte brune, nei posti bagnati
    many('giunco', 2, r => { const b = vdB(true);
      for (let k = 0; k < 15; k++) { const a = r() * TAU, rr = r() * .1, h = .65 + r() * .45; b.blade(Math.cos(a) * rr, Math.sin(a) * rr, a, h, .04 + r() * .1, .016, H('#24321e'), r() < .3 ? H('#7a6038') : H('#4e6234'), 1.2); }
      for (let k = 0; k < 2; k++) { const a = r() * TAU; b.head([Math.cos(a) * .05, .55 + r() * .2, Math.sin(a) * .05], .04, H('#5a4028'), H('#7a5a38'), 1.2); }
      return b.build(); });
    // felce aquilina secca: fronde ad arco color ruggine
    many('felce', 3, r => { const b = vdB(true), N = 4 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .7, L = .6 + r() * .35, Hh = .45 + r() * .3, dx = Math.cos(a), dz = Math.sin(a), pts = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([dx * L * t, Hh * (2 * t - 1.25 * t * t) + .02, dz * L * t]); }
        const cR = vdL(H('#8a4a22'), H('#b07040'), r()), cT = vdL(H('#a8683a'), H('#c89058'), r());
        b.ribbon(pts, .012, H('#5a3a20'), H('#7a5030'), 1.4);
        for (let k = 1; k < 6; k++) { const t = k / 6, p = pts[k], l = .2 * (1 - t * .75) * L; [-1, 1].forEach(sd => b.leaf(p, l, .03, a + sd * 1.35, -.35, cR, cT, 1.4)); } }
      return b.build(); });
    // rovo: canne viola che si arcuano e tornano a terra, foglie scure e bronzo, un cuore fitto
    many('rovo', 2, r => { const b = vdB(false);
      b.lobe(0, .3, 0, .45, .32, .45, H('#18200e'), H('#34401c'), 3, .35, 0, .3, H('#4a2a1c'));
      for (let c = 0; c < 6; c++) { const a = r() * TAU, d = .8 + r() * .6, Hh = .55 + r() * .4, dx = Math.cos(a), dz = Math.sin(a), pts = [];
        for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([dx * d * t, Hh * 4 * t * (1 - t) * .9 + .05, dz * d * t]); }
        b.ribbon(pts, .02, H('#4a1e22'), H('#6a2a2e'), .8);
        for (let k = 1; k < 5; k++) b.leaf(pts[k], .13, .05, a + (r() - .5) * 2.5, -.2, r() < .4 ? H('#5a3420') : H('#1e2c12'), r() < .4 ? H('#7a4a2a') : H('#34461e'), .8); }
      return b.build(); });
    // rosa canina d'inverno: rami spogli ad arco, cinorrodi rossi
    many('rosa', 2, r => { const b = vdB(false);
      for (let c = 0; c < 7; c++) { const a = r() * TAU, d = .35 + r() * .45, Hh = .8 + r() * .6, dx = Math.cos(a), dz = Math.sin(a), pts = [];
        for (let k = 0; k <= 4; k++) { const t = k / 4; pts.push([dx * d * t * t, Hh * Math.sin(t * 1.9) / Math.sin(1.9), dz * d * t * t]); }
        b.ribbon(pts, .016, H('#4a3a2a'), H('#6a4434'), .7);
        for (let k = 2; k <= 4; k++) if (r() < .8) { const p = pts[k]; b.head([p[0] + (r() - .5) * .1, p[1] - .04, p[2] + (r() - .5) * .1], .035, H('#b8281a'), H('#e04a2a'), .7); } }
      return b.build(); });
    // arbusto spoglio (biancospino, nocciolo): ventaglio di rametti grigio-bruni, qualche foglia secca rimasta
    many('spoglio', 3, r => { const b = vdB(false);
      for (let c = 0; c < 11; c++) { const a = r() * TAU, sp = .25 + r() * .5, Hh = .9 + r() * .8, dx = Math.cos(a), dz = Math.sin(a), pts = [[0, 0, 0], [dx * sp * .4, Hh * .5, dz * sp * .4], [dx * sp, Hh, dz * sp]];
        b.ribbon(pts, .02, H('#3e342c'), H('#6a5e52'), .6);
        for (let k = 0; k < 2; k++) { const a2 = a + (r() - .5) * 1.6, l = .25 + r() * .3, p = pts[1 + k], t = [p[0] + Math.cos(a2) * l, p[1] + .1 + r() * .25, p[2] + Math.sin(a2) * l]; b.ribbon([p, t], .01, H('#5a5046'), H('#7a6e62'), .6); }
        if (r() < .3) b.leaf(pts[2], .08, .04, r() * TAU, -.4, H('#8a5a2a'), H('#a8743a'), .6); }
      return b.build(); });
    // ginepro: cuscini spinosi blu-verdi, bassi e larghi o a colonna
    many('ginepro', 3, (r, v) => { const b = vdB(false), N = v === 2 ? 4 : 6;
      for (let k = 0; k < N; k++) { const a = r() * TAU, d = v === 2 ? r() * .12 : r() * .45, y = v === 2 ? .3 + k * .32 : .22 + r() * .25, s = v === 2 ? .38 - k * .05 : .3 + r() * .2;
        b.lobe(Math.cos(a) * d, y, Math.sin(a) * d, s, v === 2 ? s * 1.4 : s * .85, s, H('#14201c'), H('#3a5048'), k * 7 + v, .42, 0, .25, H('#26342a')); }
      return b.build(); });
    // erica: cuscini bassi ruggine e malva
    many('erica', 2, r => { const b = vdB(false);
      b.lobe(0, .14, 0, .5, .2, .45, H('#2a2018'), H('#6a4a4a'), 5, .3, 1, .2, H('#7a5a6a'));
      for (let k = 0; k < 2; k++) { const a = r() * TAU; b.lobe(Math.cos(a) * .4, .1, Math.sin(a) * .4, .3, .14, .28, H('#2a2018'), H('#7a5244'), 9 + k, .35, 0, .2, H('#8a6070')); }
      return b.build(); });
    // ginestra: fascio di verghe verde scuro
    many('ginestra', 2, r => { const b = vdB(true);
      for (let k = 0; k < 18; k++) { const a = r() * TAU, h = .85 + r() * .5; b.blade(Math.cos(a) * .05, Math.sin(a) * .05, a, h, .18 + r() * .3, .016, H('#1e2a14'), H('#3a4e22'), 1); }
      return b.build(); });
    // cardo secco: rosetta grigio-verde, fusto bruno coi capolini e il pappo argentato
    many('cardo', 2, r => { const b = vdB(true);
      for (let k = 0; k < 7; k++) b.leaf([0, .03, 0], .22 + r() * .1, .06, k / 7 * TAU + r() * .4, .05, H('#3a4430'), H('#6a7458'), .2);
      const h = .8 + r() * .4, t = [(r() - .5) * .08, h, (r() - .5) * .08]; b.stalk([0, 0, 0], t, .014, H('#4a3a26'), H('#7a6444'), 1);
      b.head(t, .06, H('#5a4630'), H('#8a7458'), 1); b.head([t[0], h + .07, t[2]], .035, H('#b8b4a8'), H('#e0dcd0'), 1);
      for (let k = 0; k < 2; k++) { const a = r() * TAU, p = [t[0] * .6, h * .62, t[2] * .6], q = [p[0] + Math.cos(a) * .18, p[1] + .2, p[2] + Math.sin(a) * .18]; b.stalk(p, q, .01, H('#4a3a26'), H('#6a5638'), 1); b.head(q, .045, H('#5a4630'), H('#8a7458'), 1); }
      return b.build(); });
    // ombrellifere secche (carota selvatica, finocchio): gambi alti con le ombrelle piatte
    many('ombrella', 2, r => { const b = vdB(true);
      for (let k = 0; k < 3; k++) { const a = r() * TAU, l = .05 + r() * .15, h = 1 + r() * .45, t = [Math.cos(a) * l, h, Math.sin(a) * l]; b.stalk([0, 0, 0], t, .012, H('#6a5a3c'), H('#a8946a'), 1.3);
        const R = .13 + r() * .06, cU = H('#6a5236'), cE = H('#a08460'); for (let q = 0; q < 7; q++) { const a1 = q / 7 * TAU, a2 = (q + 1) / 7 * TAU; b.tri([t[0], t[1] - .02, t[2]], [t[0] + Math.cos(a1) * R, t[1] + .03, t[2] + Math.sin(a1) * R], [t[0] + Math.cos(a2) * R, t[1] + .03, t[2] + Math.sin(a2) * R], cU, cE, cE, h * 1.3, h * 1.3, h * 1.3); } }
      for (let k = 0; k < 4; k++) b.leaf([0, .02, 0], .2, .05, r() * TAU, .1, H('#4a4a30'), H('#6a6640'), .2);
      return b.build(); });
    // verbasco: rosetta di foglie grandi feltrate e la spiga secca
    many('verbasco', 2, r => { const b = vdB(true);
      for (let k = 0; k < 6; k++) b.leaf([0, .03, 0], .28 + r() * .1, .1, k / 6 * TAU + r() * .3, .08, H('#6a6e5a'), H('#9a9c86'), .2);
      const h = 1.2 + r() * .5, t = [(r() - .5) * .1, h, (r() - .5) * .1]; b.stalk([0, 0, 0], t, .018, H('#3e3024'), H('#4a3a2a'), .8); b.stalk([t[0] * .5, h * .5, t[2] * .5], t, .04, H('#2e241a'), H('#46362a'), .8);
      return b.build(); });
    // fiori a ciuffo, tre colori
    [['fioriB', '#ece8dc', '#f4e8a0'], ['fioriG', '#e8c440', '#f0d868'], ['fioriV', '#8a6ab8', '#b49ad8']].forEach(([nm, c1, c2]) => many(nm, 1, r => { const b = vdB(true);
      for (let k = 0; k < 7; k++) { const a = r() * TAU, rr = r() * .14, h = .14 + r() * .14, x = Math.cos(a) * rr, z = Math.sin(a) * rr; b.blade(x, z, a, h, .03, .012, H('#2e4022'), H('#4a6030')); b.head([x + Math.cos(a) * .03, h, z + Math.sin(a) * .03], .035, H(c1), H(c2), 1.6); }
      for (let k = 0; k < 4; k++) b.leaf([0, .02, 0], .1, .03, r() * TAU, .1, H('#2e4022'), H('#4a6030'), .2);
      return b.build(); }));
    // sassi con un po' di muschio sopra
    many('sasso', 3, (r, v) => { const b = vdB(false); b.lobe(0, .12, 0, .4, .26, .32, H('#4a4844'), H('#8a8680'), v * 5 + 2, .35, 0, 0, H('#5a6a3a')); return b.build(); });
    // mucchio di spietramento ai bordi dei campi
    many('mucchio', 2, r => { const b = vdB(false); for (let k = 0; k < 7; k++) { const a = r() * TAU, d = k < 5 ? .35 + r() * .2 : r() * .15, y = k < 5 ? .12 : .32; b.lobe(Math.cos(a) * d, y, Math.sin(a) * d, .2 + r() * .08, .14, .18, H('#56524c'), H('#9a948a'), k * 3, .4, 0, 0, H('#6a7048')); } return b.build(); });
    // cespuglio sempreverde (lentisco, alaterno): lobi scuri e lucidi con qualche rametto
    many('cespuglio', 3, r => { const b = vdB(false), N = 3 + Math.floor(r() * 3);
      for (let k = 0; k < N; k++) { const a = r() * TAU, d = r() * .35, s = .32 + r() * .2; b.lobe(Math.cos(a) * d, .3 + r() * .25, Math.sin(a) * d, s, s * .8, s, H('#101a0c'), H('#3a4c22'), k * 11, .4, 0, .3, H('#2a3a1a')); }
      for (let k = 0; k < 3; k++) { const a = r() * TAU; b.ribbon([[0, 0, 0], [Math.cos(a) * .3, .5, Math.sin(a) * .3], [Math.cos(a) * .55, .85, Math.sin(a) * .55]], .015, H('#3a3028'), H('#5a4a3a'), .4); }
      return b.build(); });
    // cavolo dell'orto: cuore tondo e foglie larghe blu-verdi
    many('cavolo', 2, r => { const b = vdB(false); b.lobe(0, .14, 0, .16, .13, .16, H('#2a3a30'), H('#6a8a74'), 4, .2, 0, 0);
      for (let k = 0; k < 6; k++) b.leaf([0, .06, 0], .26, .1, k / 6 * TAU + r() * .4, .25, H('#2e4234'), H('#56766a'), .2); return b.build(); });
    // ramo caduto al margine del bosco
    many('ramo', 2, r => { const b = vdB(false), L = 1.6 + r() * .8, pts = [[-L / 2, .06, 0], [-L / 6, .08, (r() - .5) * .2], [L / 6, .07, (r() - .5) * .2], [L / 2, .05, (r() - .5) * .3]];
      b.ribbon(pts, .06, H('#3a3028'), H('#5a4c3e'), 0); for (let k = 0; k < 3; k++) { const p = pts[1 + (k % 2)], a = r() * TAU; b.ribbon([p, [p[0] + Math.cos(a) * .4, .15 + r() * .2, p[2] + Math.sin(a) * .4]], .025, H('#4a3e32'), H('#6a5a4a'), 0); } return b.build(); });
    // felce verde e folta: fronde ad arco con le pinne fitte, chiare in punta
    many('felceV', 3, r => { const b = vdB(true), N = 6 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .5, L = .75 + r() * .4, Hh = .5 + r() * .3, dx = Math.cos(a), dz = Math.sin(a), pts = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([dx * L * t, Hh * (2 * t - 1.3 * t * t) + .02, dz * L * t]); }
        b.ribbon(pts, .012, H('#24401a'), H('#4a7a2a'), 1.4);
        for (let k = 1; k < 8; k++) { const t = k / 8, p = pts[k], l = .22 * Math.sin(Math.PI * (t * .85 + .1)) * L, cA = vdL(H('#1e4416'), H('#3e7a26'), t), cB = vdL(H('#4a8a2a'), H('#9ad04a'), t); [-1, 1].forEach(sd => b.leaf(p, l, .028, a + sd * 1.25, -.25, cA, cB, 1.4)); } }
      return b.build(); });
    // palma a ventaglio del sottobosco: picciolo lungo e il ventaglio di lamine pieghettate
    many('palmaV', 2, r => { const b = vdB(true), N = 5 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .6, l = .35 + r() * .45, h = .45 + r() * .55, c = [Math.cos(a) * l, h, Math.sin(a) * l], R = .42 + r() * .18, tilt = .35 + r() * .3;
        b.stalk([0, 0, 0], c, .012, H('#2a4a1a'), H('#4a7a2a'), 1.2);
        const ux = Math.cos(a), uz = Math.sin(a);
        for (let q = 0; q < 12; q++) { const b0 = -1.25 + q / 12 * 2.5, b1 = -1.25 + (q + 1) / 12 * 2.5, bm = (b0 + b1) / 2, dir = g => [Math.cos(a + g), Math.sin(a + g)], d0 = dir(b0), d1 = dir(b1), dm = dir(bm);
          const e0 = [c[0] + d0[0] * R, c[1] + tilt * R * .4 - .05, c[2] + d0[1] * R], e1 = [c[0] + d1[0] * R, c[1] + tilt * R * .4 - .05, c[2] + d1[1] * R], em = [c[0] + dm[0] * R * 1.08, c[1] + tilt * R * .4 + .04, c[2] + dm[1] * R * 1.08];
          const cc = q % 2 ? H('#3a7a26') : H('#56a234'), ce = q % 2 ? H('#6ab03a') : H('#8ccc4a'); b.tri(c, e0, em, cc, ce, ce, h, h * 1.3, h * 1.4); b.tri(c, em, e1, cc, ce, ce, h, h * 1.4, h * 1.3); } }
      return b.build(); });
    // foglie grandi a cuore su piccioli lunghi (colocasia): verde lucido con la nervatura chiara
    many('foglione', 2, r => { const b = vdB(true), N = 4 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .7, l = .2 + r() * .3, h = .55 + r() * .6, c = [Math.cos(a) * l, h, Math.sin(a) * l], L = .55 + r() * .3, W = L * .7, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, dn = -.35;
        b.stalk([0, 0, 0], c, .016, H('#2e5a1e'), H('#4a8a2a'), 1);
        const tip = [c[0] + dx * L, c[1] + dn * L, c[2] + dz * L], m = [c[0] + dx * L * .4, c[1] + dn * L * .3 + .05, c[2] + dz * L * .4], lL = [m[0] + px * W * .5, m[1] - .08, m[2] + pz * W * .5], lR = [m[0] - px * W * .5, m[1] - .08, m[2] - pz * W * .5];
        const lobL = [c[0] - dx * L * .18 + px * W * .32, c[1] - .02, c[2] - dz * L * .18 + pz * W * .32], lobR = [c[0] - dx * L * .18 - px * W * .32, c[1] - .02, c[2] - dz * L * .18 - pz * W * .32];
        const vein = H('#8ac860'), g1 = H('#2e6a22'), g2 = H('#4e9a32');
        b.tri(c, lL, m, vein, g1, vein, h, h, h); b.tri(c, m, lR, vein, vein, g1, h, h, h); b.tri(m, lL, tip, vein, g2, vein, h, h, h * 1.2); b.tri(m, tip, lR, vein, vein, g2, h, h * 1.2, h); b.tri(c, lobL, lL, vein, g1, g2, h, h, h); b.tri(c, lR, lobR, vein, g2, g1, h, h, h); }
      return b.build(); });
    // liana che pende dai rami: fili sottili con le foglioline
    many('liana', 3, r => { const b = vdB(true);
      for (let k = 0; k < 4; k++) { const ox = (r() - .5) * 1.2, oz = (r() - .5) * 1.2, top = 5.5 + r() * 2.5, bot = 1.2 + r() * 2.5, pts = [];
        for (let q = 0; q <= 6; q++) { const t = q / 6; pts.push([ox + Math.sin(t * 5 + k) * .12, top - (top - bot) * t, oz + Math.cos(t * 4 + k) * .12]); }
        b.ribbon(pts, .012, H('#3a5a22'), H('#5a8a32'), .25);
        for (let q = 1; q <= 6; q++) { const p = pts[q]; b.leaf(p, .1, .04, r() * TAU, -.6, H('#3e7a26'), H('#7ab83e'), .25); } }
      return b.build(); });
    // sambuco fiorito: lobi verdi e ombrelle bianche piatte
    many('sambuco', 2, r => { const b = vdB(false);
      for (let k = 0; k < 4; k++) { const a = r() * TAU, d = r() * .4, s2 = .35 + r() * .2; b.lobe(Math.cos(a) * d, .45 + r() * .3, Math.sin(a) * d, s2, s2 * .8, s2, H('#1a3a12'), H('#4a8a2a'), k * 13, .4, 0, .3, H('#2e5a1e')); }
      for (let k = 0; k < 9; k++) { const a = r() * TAU, d = .2 + r() * .45, c = [Math.cos(a) * d, .75 + r() * .45, Math.sin(a) * d], R = .1 + r() * .05;
        for (let q = 0; q < 6; q++) { const a1 = q / 6 * TAU, a2 = (q + 1) / 6 * TAU; b.tri([c[0], c[1] + .02, c[2]], [c[0] + Math.cos(a1) * R, c[1], c[2] + Math.sin(a1) * R], [c[0] + Math.cos(a2) * R, c[1], c[2] + Math.sin(a2) * R], H('#f4f0dc'), H('#e4e0c8'), H('#e4e0c8'), .3, .3, .3); } }
      return b.build(); });
    // tronco caduto col muschio sopra
    many('tronco', 2, r => { const b = vdB(false), L = 3.2 + r() * 1.6, R = .2 + r() * .08, SD = 7;
      for (let k = 0; k < 4; k++) { const xa = -L / 2 + k / 4 * L, xb = -L / 2 + (k + 1) / 4 * L, ra = R * (1 - k / 4 * .25), rb = R * (1 - (k + 1) / 4 * .25);
        for (let i = 0; i < SD; i++) { const a0 = i / SD * TAU, a1 = (i + 1) / SD * TAU, up0 = Math.sin(a0) > .3, up1 = Math.sin(a1) > .3, c0 = up0 ? H('#4a7a2a') : H('#4a3a2a'), c1 = up1 ? H('#4a7a2a') : H('#4a3a2a');
          b.quad([xa, R + Math.sin(a0) * ra, Math.cos(a0) * ra], [xa, R + Math.sin(a1) * ra, Math.cos(a1) * ra], [xb, R + Math.sin(a1) * rb, Math.cos(a1) * rb], [xb, R + Math.sin(a0) * rb, Math.cos(a0) * rb], c0, c1, c1, c0, 0, 0, 0, 0); } }
      b.lobe(-L / 2, R, 0, .05, R, R, H('#8a6a4a'), H('#b89a72'), 3, 0, 0, 0);
      return b.build(); });
    const boost = (k, names) => names.forEach(nm => Gm[nm].forEach(g => { const c = g.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, Math.min(1, c.getX(i) * k), Math.min(1, c.getY(i) * k), Math.min(1, c.getZ(i) * k)); }));
    boost(1.7, ['rovo', 'ginepro', 'erica', 'cespuglio', 'sasso', 'mucchio']); boost(1.35, ['spoglio', 'rosa', 'ramo', 'ginestra']); boost(1.2, ['cespo', 'cespoV', 'alta', 'giunco', 'felce', 'cardo', 'ombrella', 'verbasco', 'felceV', 'palmaV', 'foglione', 'liana']); boost(1.4, ['sambuco', 'tronco']);
    const mat = vegMat(); mat.side = THREE.DoubleSide;
    VD.mat = mat; return (VD.geo = Gm);
  }
  const VDHERB = ['felceV', 'palmaV', 'foglione', 'cespo', 'cespoV', 'alta', 'giunco', 'felce', 'cardo', 'ombrella', 'verbasco', 'fiori'];
  const VDSHRUB = ['rovo', 'rosa', 'spoglio', 'ginepro', 'erica', 'ginestra', 'cespuglio', 'sasso', 'ramo'];
  const VDSC = { felceV: [.9, 1.5], palmaV: [.8, 1.4], foglione: [.8, 1.3], liana: [.8, 1.2], sambuco: [.8, 1.3], tronco: [.9, 1.1], cespo: [1, 1.6], cespoV: [1, 1.5], alta: [.9, 1.3], giunco: [.9, 1.3], felce: [.9, 1.4], cardo: [.8, 1.2], ombrella: [.8, 1.15], verbasco: [.8, 1.2], fiori: [.8, 1.2],
    rovo: [.8, 1.4], rosa: [.8, 1.3], spoglio: [.8, 1.5], ginepro: [.7, 1.5], erica: [.8, 1.4], ginestra: [.8, 1.3], cespuglio: [.7, 1.3], sasso: [.5, 1.3], ramo: [.8, 1.1], mucchio: [.8, 1.2], cavolo: [.8, 1.15] };
  const VDSHADOW = { sambuco: 1, tronco: 1, palmaV: 1, foglione: 1, rovo: 1, rosa: 1, spoglio: 1, ginepro: 1, erica: 1, ginestra: 1, cespuglio: 1, sasso: 1, mucchio: 1 };
  // la colonia: ogni specie vive a macchie sue, non sparsa a caso
  const vdCol = (k, X, Y, sc) => Math.max(0, Math.min(1.6, .15 + 2.4 * (vnz(X / sc + k * 17.13, Y / sc + k * 9.31) + .25)));
  function vdPick(r, W) { let t = 0; for (const k in W) t += Math.max(0, W[k]); let q = r() * t; for (const k in W) { q -= Math.max(0, W[k]); if (q <= 0) return k; } return 'none'; }
  function verde38(tx0, ty0, n, m) {
    const grp = new THREE.Group(); grp.name = 'verde';
    if (!VD.on) return grp;
    const Gm = vdGeoms(), T = G.T, W0 = M.world, F = W0 && W0.feat, B = new Map(), low = LOWQ.on;
    const put = (sp, r, x, z, o) => { const vs = Gm[sp]; if (!vs) return; const key = sp + '|' + Math.floor(r() * vs.length); let a = B.get(key); if (!a) B.set(key, a = []); const sr = VDSC[sp] || [1, 1];
      a.push(Object.assign({ x, z, s: sr[0] + r() * (sr[1] - sr[0]), ry: r() * 6.2832, rx: (r() - .5) * .12, rz: (r() - .5) * .12, sy: 1, col: null }, o || {})); };
    const natural = v => v === T.GRASS || v === T.SHRUB || v === T.ROCK || v === T.GRAVEL || v === T.FIELD || v === T.TREE;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx, v = gT(tx, ty), z = zoneT(tx, ty);
      if (z === ZN.CITTA || !natural(v) || RW[ii] > 0) continue;
      const f = F ? F[ii] : 0; if ((f & 8192) && v !== T.GRASS) continue;
      const r = rng((tx * 69061 + ty * 30011) >>> 0), wx = tx * TS, wy = ty * TS, X0 = wx + 1, Y0 = wy + 1;
      const w = vdWet(X0, Y0), d = Math.max(0, -w), wv = Math.max(0, w), nt = vdTreeN(tx, ty), e = v === T.TREE ? 0 : Math.min(1, nt / 6), rd = Math.min(1, vdRoadN(tx, ty) / 5);
      const top = (f & 2048) ? 1 : 0, mont = z === ZN.MONTE ? 1 : 0, tav = z === ZN.DESERTO ? 1 : 0;
      let rocky = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = gT(tx + dx, ty + dy); if (q === T.ROCK || q === T.CLIFF || q === T.GRAVEL) rocky++; } rocky = Math.min(1, rocky / 4);
      const warm = vdS(-.3, .4, d - wv), tint = (k0) => { const c = vdL(vdH('#e0f0cc'), vdH('#fff0d4'), warm), k = k0 * (.86 + r() * .22); return '#' + new THREE.Color(c[0] * k, c[1] * k, c[2] * k).getHexString(); };
      const herbW = (X, Y, extra) => {
        const W = {
          cespoV: (.9 + rd * 1.6 + wv * .6 - top * .5) * (.5 + vnz(X / 9 + 3, Y / 9 + 1) + .5),
          cespo: (.9 + d * 1.2 + top * .8 + tav * .4) * (.5 + vnz(X / 9 + 8, Y / 9 + 4) + .5),
          alta: (.35 + d * .8 + e * .7 - rd * .3) * vdCol(1, X, Y, 8),
          giunco: (wv > .3 ? (wv - .3) * 7 : 0) * vdCol(2, X, Y, 6),
          felce: (e * 1.4 + mont * .3 + (v === T.TREE ? 1 : 0)) * vdCol(3, X, Y, 7),
          cardo: (.15 + rd * .5 + d * .3) * vdCol(4, X, Y, 9),
          ombrella: (.1 + rd * .9 + e * .25) * vdCol(5, X, Y, 8),
          verbasco: (.06 + d * .25 + rocky * .3) * vdCol(6, X, Y, 10),
          fiori: .3 * vdCol(7, X, Y, 6), felceV: (e * .8 + wv * .4) * vdCol(19, X, Y, 7),
          none: 1 + Math.max(0, vnz(X / 5 + 50, Y / 5 + 50)) * 4 + (v === T.TREE ? 2 : 0),
        };
        if (extra) for (const k in extra) W[k] = (W[k] || 0) * extra[k];
        return W;
      };
      const shrubW = (X, Y, scrub) => ({
        rovo: (e * 1 + rd * .25) * vdCol(11, X, Y, 11), rosa: (e * .35 + rd * .15) * vdCol(12, X, Y, 12), spoglio: (e * .6 + .03) * vdCol(13, X, Y, 10),
        ginepro: (rocky * .5 + top * .25 + mont * .25 + tav * .1) * vdCol(14, X, Y, 12), erica: (top * .45 + tav * .2 + mont * d * .4) * vdCol(15, X, Y, 9),
        ginestra: (d * .45 + rd * .25 + mont * .15) * vdCol(16, X, Y, 11), cespuglio: (e * .4 + .05 + (scrub ? .5 : 0)) * vdCol(17, X, Y, 10), sambuco: (e * .5 + rd * .15) * vdCol(20, X, Y, 12), tronco: e * .1,
        sasso: (rocky * .4 + .03 + top * .12) * vdCol(18, X, Y, 8), ramo: e * .15,
        none: scrub ? 1.6 : 7,
      });
      const herb = (X, Y, extra) => { const sp = vdPick(r, herbW(X, Y, extra)); if (sp === 'none') return; const nm = sp === 'fiori' ? pick(r, th(Math.floor(X / 26), Math.floor(Y / 26), 63) < .4 ? ['fioriB'] : th(Math.floor(X / 26), Math.floor(Y / 26), 63) < .72 ? ['fioriG'] : ['fioriV']) : sp; put(nm, r, X, Y, { col: tint(1) }); };
      const shrub = (X, Y, scrub, W) => { const sp = vdPick(r, W || shrubW(X, Y, scrub)); if (sp === 'none') return; put(sp, r, X, Y, { col: tint(1.02), rx: 0, rz: 0 }); };
      const slot = q => [wx + .5 + (q % 2) + (r() - .5) * .8, wy + .5 + (q >> 1) + (r() - .5) * .8];
      if (v === T.FIELD) {
        const pc = vdParcel(X0, Y0);
        if (pc.e < 1.4) {   // la capezzagna: erba, cardi, ombrellifere; ogni tanto la siepe o il mucchio di sassi
          for (let q = 0; q < (low ? 1 : 3); q++) { const [X, Y] = slot(q); if (vdParcel(X, Y).e < 1.2) herb(X, Y, { ombrella: 2.2, cardo: 1.8, alta: 1.4 }); }
          if (pc.e < .9) { if (th(tx, ty, 71) < .03) put('mucchio', r, X0, Y0); else shrub(X0 + (r() - .5), Y0 + (r() - .5), false, { rovo: .5, rosa: .35, spoglio: .45, ginestra: .15, none: 2.2 }); }
        } else if (pc.t === 3) { for (let q = 0; q < (low ? 1 : 3); q++) { const [X, Y] = slot(q); herb(X, Y, { cardo: 3, ombrella: 1.5, alta: 1.5, none: .7 }); } }   // maggese
        else if (pc.t === 1) { if (r() < .25) { const [X, Y] = slot(0); put('cespo', r, X, Y, { col: tint(1) }); } }   // stoppie
        else if (pc.t === 4) {   // orto: cavoli a file sulle prose
          const ca = Math.cos(pc.ang), sa = Math.sin(pc.ang), C = [[wx, wy], [wx + TS, wy], [wx, wy + TS], [wx + TS, wy + TS]].map(([X, Y]) => [X * ca + Y * sa, -X * sa + Y * ca]);
          const u0 = Math.min(...C.map(c => c[0])), u1 = Math.max(...C.map(c => c[0])), v0 = Math.min(...C.map(c => c[1])), v1 = Math.max(...C.map(c => c[1])), ct = th(pc.a, pc.b, 85) < .5 ? '#a8d890' : '#8cb8a0';
          for (let k = Math.floor(u0 / 1.4); k <= Math.ceil(u1 / 1.4); k++) for (const off of [.3, .7]) { const u = k * 1.4 + off; if (u < u0 || u > u1) continue;
            for (let vv = Math.floor(v0 / .55) * .55; vv <= v1; vv += .55) { const X = u * ca - vv * sa, Y = u * sa + vv * ca; if (X < wx || X >= wx + TS || Y < wy || Y >= wy + TS) continue;
              const p2 = vdParcel(X, Y); if (p2.a !== pc.a || p2.b !== pc.b || p2.e < 1.1 || vdField(vdIsF, X, Y) < .55 || r() < .15) continue; put('cavolo', r, X, Y, { col: ct, rx: 0, rz: 0 }); } }
        }
        continue;
      }
      if (v === T.TREE) {   // nel bosco ci pensa il kit: qui solo il margine (rovi, arbusti, felci) e i rami caduti
        const U = { felceV: 1.8 * vdCol(21, X0, Y0, 9) + .3, palmaV: (.25 + wv * 1.2) * vdCol(22, X0, Y0, 11), foglione: (.1 + wv * 1.4) * vdCol(23, X0, Y0, 10), cespoV: .25, none: low ? 2.5 : 1.1 };
        for (let q = 0; q < (low ? 1 : 2); q++) { const [X, Y] = slot(Math.floor(r() * 4)), sp = vdPick(r, U); if (sp !== 'none') put(sp, r, X, Y, { col: tint(1) }); }
        if (nt < 14 && r() < .22) shrub(X0 + (r() - .5), Y0 + (r() - .5), false, { rovo: .5, sambuco: .5, spoglio: .3, cespuglio: .3, none: 1.2 });
        if (r() < (.05 + wv * .2) * (low ? .5 : 1)) put('liana', r, X0 + (r() - .5) * .6, Y0 + (r() - .5) * .6, { rx: 0, rz: 0, col: tint(1) });
        if (r() < .03) put(r() < .5 ? 'tronco' : 'ramo', r, X0 + (r() - .5), Y0 + (r() - .5), { rx: 0, rz: 0 });
        continue;
      }
      const scrub = v === T.SHRUB, nh = (v === T.GRASS ? 4 : v === T.SHRUB ? 3 : v === T.ROCK ? 2 : 1) >> (low ? 1 : 0);
      for (let q = 0; q < nh; q++) { const [X, Y] = slot(nh === 4 ? q : Math.floor(r() * 4)); herb(X, Y); }
      if (v !== T.GRAVEL || r() < .3) shrub(X0 + (r() - .5) * 1.2, Y0 + (r() - .5) * 1.2, scrub);
    }
    for (const [key, arr] of B) {
      const [sp, vi] = key.split('|'), geo = Gm[sp][+vi]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
      arr.forEach(o => { o.y = groundH(o.x, o.z) - .03; x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + 2); });
      const g2 = geo.clone(); g2.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 3);
      const im = new THREE.InstancedMesh(g2, VD.mat, arr.length);
      arr.forEach((o, k) => { vE.set(o.rx, o.ry, o.rz, 'YXZ'); vQ.setFromEuler(vE); vV.set(o.x, o.y, o.z); vS.set(o.s, o.s * o.sy, o.s); vM4.compose(vV, vQ, vS); im.setMatrixAt(k, vM4); im.setColorAt(k, vC.set(o.col || '#ffffff')); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = !!VDSHADOW[sp] && !low; im.receiveShadow = false; grp.add(im);
    }
    return grp;
  }

  // ---------------- [verde] l'abete rosso (riferimento di Andrea): alto e stretto, palchi di rami che pendono a tende frangiate,
  // verde-giallo chiaro sulle punte e oliva scuro dentro, il tronco rossiccio nudo in basso. Sostituisce una parte dei pini del kit, a macchie.
  function abeteGeo(seed, H) {
    const r = rng(seed), bw = vdB(false), bl = vdB(true), TAU = 6.2832, H_ = vdH;
    // il tronco: si assottiglia, corteccia rossiccia
    const SD = 7, R0 = .022 * H;
    for (let k = 0; k < 5; k++) { const ya = k / 5 * .97 * H, yb = (k + 1) / 5 * .97 * H, ra = R0 * (1 - ya / H * .92) + .02, rb = R0 * (1 - yb / H * .92) + .02, ca = vdL(H_('#5a3a2c'), H_('#7a5a44'), k / 5), cb = vdL(H_('#5a3a2c'), H_('#7a5a44'), (k + 1) / 5);
      for (let i = 0; i < SD; i++) { const a0 = i / SD * TAU, a1 = (i + 1) / SD * TAU; bw.quad([Math.cos(a0) * ra, ya, Math.sin(a0) * ra], [Math.cos(a1) * ra, ya, Math.sin(a1) * ra], [Math.cos(a1) * rb, yb, Math.sin(a1) * rb], [Math.cos(a0) * rb, yb, Math.sin(a0) * rb], ca, ca, cb, cb, 0, 0, yb / H * .3, yb / H * .3); } }
    // i palchi: rami corti in cima, lunghi in basso, che scendono e pendono
    const y0 = .2 * H, y1 = .96 * H, NW = 15, cIn = H_('#24401a'), cMid = H_('#4a7a2a'), cOut = H_('#94bc48');
    for (let w = 0; w < NW; w++) {
      const t = w / (NW - 1), y = y0 + (y1 - y0) * t + (r() - .5) * .025 * H, L = .19 * H * Math.pow(1 - t, .85) + .025 * H, nb = t > .85 ? 4 : 6, rot = r() * TAU;
      for (let b = 0; b < nb; b++) {
        const a = rot + b / nb * TAU + (r() - .5) * .5, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, droop = .5 + r() * .25;
        const P = u => [dx * L * u, y + L * (.1 * u - droop * u * u), dz * L * u], sw = u => (y / H) * (.4 + u * 1.2);
        const tip = vdL(cOut, H_('#c0c460'), r() * .5), mid = vdL(cMid, cOut, r() * .3);
        bw.ribbon([P(0), P(.5), P(1)], .022 * H * (1 - t * .7) * .4, H_('#4a3428'), H_('#5a4232'), .2);
        // il ventaglio lungo il ramo (si vede dall'alto)
        const A = P(.12), Bp = P(1.02), w1 = L * .1, w2 = L * .32;
        bl.quad([A[0] - px * w1, A[1], A[2] - pz * w1], [A[0] + px * w1, A[1], A[2] + pz * w1], [Bp[0] + px * w2, Bp[1] - L * .05, Bp[2] + pz * w2], [Bp[0] - px * w2, Bp[1] - L * .05, Bp[2] - pz * w2], cIn, cIn, tip, tip, sw(0), sw(0), sw(1), sw(1));
        // le tende che pendono dal ramo, col bordo frangiato
        for (const u of [.42, .74, 1]) {
          const c = P(u), ww = L * .3 * (1.15 - u * .35), hh = L * .5 * (.55 + u * .5) * (.8 + r() * .4), o = L * .06;
          const tL = [c[0] - px * ww, c[1], c[2] - pz * ww], tR = [c[0] + px * ww, c[1], c[2] + pz * ww];
          const b1 = [c[0] - px * ww * .75 + dx * o, c[1] - hh * (.75 + r() * .2), c[2] - pz * ww * .75 + dz * o], b2 = [c[0] + dx * o * 1.6, c[1] - hh * (1.05 + r() * .15), c[2] + dz * o * 1.6], b3 = [c[0] + px * ww * .75 + dx * o, c[1] - hh * (.7 + r() * .25), c[2] + pz * ww * .75 + dz * o];
          bl.tri(tL, tR, b2, mid, mid, tip, sw(u), sw(u), sw(u) * 1.4); bl.tri(tL, b2, b1, mid, tip, tip, sw(u), sw(u) * 1.4, sw(u) * 1.3); bl.tri(tR, b3, b2, mid, tip, tip, sw(u), sw(u) * 1.3, sw(u) * 1.4);
        }
      }
    }
    // la cima: una punta sottile e dritta
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU, w = .025 * H; bl.tri([Math.cos(a) * w, .9 * H, Math.sin(a) * w], [Math.cos(a + 2.1) * w, .9 * H, Math.sin(a + 2.1) * w], [0, 1.02 * H, 0], cMid, cMid, cOut, .9, .9, 1.2); }
    return { wood: bw.build(), leaf: bl.build() };
  }
  // abete secco: fusto chiaro e liscio, rametti corti che pendono, la punta spezzata
  function seccoGeo(seed, H) {
    const r = rng(seed), bw = vdB(false), TAU = 6.2832, H_ = vdH, R0 = .02 * H, SD = 6, top = H * (.85 + r() * .12);
    for (let k = 0; k < 5; k++) { const ya = k / 5 * top, yb = (k + 1) / 5 * top, ra = R0 * (1 - ya / H * .8) + .015, rb = R0 * (1 - yb / H * .8) + .015, ca = vdL(H_('#6a625a'), H_('#c8c2b6'), k / 5 + .2), cb = vdL(H_('#6a625a'), H_('#c8c2b6'), (k + 1) / 5 + .2);
      for (let i = 0; i < SD; i++) { const a0 = i / SD * TAU, a1 = (i + 1) / SD * TAU; bw.quad([Math.cos(a0) * ra, ya, Math.sin(a0) * ra], [Math.cos(a1) * ra, ya, Math.sin(a1) * ra], [Math.cos(a1) * rb, yb, Math.sin(a1) * rb], [Math.cos(a0) * rb, yb, Math.sin(a0) * rb], ca, ca, cb, cb, 0, 0, 0, 0); } }
    for (let k = 0; k < 22; k++) { const y = (.25 + r() * .7) * top, a = r() * TAU, L = (.04 + r() * .09) * H * (1.1 - y / H), dx = Math.cos(a), dz = Math.sin(a);
      bw.ribbon([[dx * .02 * H, y, dz * .02 * H], [dx * L * .6, y - L * .1, dz * L * .6], [dx * L, y - L * .45, dz * L]], .012 * H * .3, H_('#8a8278'), H_('#a8a296'), .1); }
    return bw.build();
  }
  function abeteModel(name) {
    if (/^Abete_secco/.test(name)) { const pine = natModel('Pine_1'), H = pine && pine.top ? pine.top * 1.15 : 13, mw = natMat(null, false, '#fffffb'); mw.vertexColors = true; return { parts: [{ geo: seccoGeo(7311 + (+name.slice(-1) || 0) * 31, H), mat: mw, leafy: false }], top: H }; }
    const v = +(name.split('_')[1] || 0), pine = natModel('Pine_1'), H = pine && pine.top ? pine.top * 1.08 : 12, g = abeteGeo(9001 + v * 77, H);
    const mw = natMat(null, false, '#fffffc'); mw.vertexColors = true;
    const ml = natMat(null, false, '#fffffd'); ml.vertexColors = true; ml.side = THREE.DoubleSide;
    return { parts: [{ geo: g.wood, mat: mw, leafy: false }, { geo: g.leaf, mat: ml, leafy: true }], top: H };
  }
  // dove i pini del kit diventano abeti: a macchie larghe (le abetaie), mai il pino marittimo grande (Pine_5)
  function abete38(res, tx, ty) {
    const [name, s] = res; if (!VD.on || !/^Pine_[1-4]$/.test(name)) return res;
    const k = vnz(tx * TS / 46 + 90, ty * TS / 46 + 90) + (th(tx, ty, 93) - .5) * .5;
    if (k <= -.12) return res;
    const q = th(tx, ty, 96);
    if (q < .08) return ['Abete_secco' + Math.floor(th(tx, ty, 97) * 2), s * (.9 + th(tx, ty, 95) * .3)];   // abete morto in piedi
    return ['Abete_' + Math.floor(th(tx, ty, 94) * 3), s * (q < .22 ? .4 + th(tx, ty, 95) * .25 : .9 + th(tx, ty, 95) * .3)];   // qualche abete giovane
  }
