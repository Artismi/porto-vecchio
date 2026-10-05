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
    if (M.world && M.world.eco) {   // [ambienti] il suolo dell'ambiente, sfumato; sotto le masse di piante più scuro e più verde
      c = vdMix(c, vdGroundTint(X, Y), .5);
      const pl = vdPlan(vdEcoMix(X, Y)), [, hv] = vdWin(pl.H, X, Y), [, sv] = vdWin(pl.S, X, Y), mass = Math.max(vdS(0, .25, hv - pl.hth), vdS(0, .25, sv - pl.sth));
      c = vdMix(c, vdMix(pl.g, [30, 44, 24], .55), mass * .5);
      c = vdMix(c, [52, 82, 34], .4);   // fra gli steli
      if (pl.hb !== undefined) { const hf = vdHi(X, Y, pl.hb); c = vdMix(c, hf > .02 ? [30, 46, 22] : [74, 112, 40], hf > .02 ? hf * .55 : .45); }   // fra gli steli è buio: il tappeto si stacca dal suolo; il rilievo: scuro sotto l'erba alta, chiaro sotto il prato basso
    }
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
  // le strade bianche e i sentieri: la terra battuta sfuma nell'erba, due solchi e l'erba in mezzo; i sentieri a piedi più chiari al centro
  function vdSterrate(x, X0, Y0, X1, Y1) {
    (M.roads || []).forEach(rd => {
      if (rd.rect || rd.kind !== 'sterrato') return;
      const pad = rd.w + 8, runs = []; let cur = null;
      rd.pts.forEach((p, k) => { const near = p[0] > X0 - pad && p[0] < X1 + pad && p[1] > Y0 - pad && p[1] < Y1 + pad; if (near) { if (!cur) runs.push(cur = []); cur.push(k); } else cur = null; });
      const off = (run, o) => run.map(k => { const a = rd.pts[Math.max(0, k - 1)], b = rd.pts[Math.min(rd.pts.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, p = rd.pts[k], wob = vnz(p[0] / 7, p[1] / 7) * .5; return [(p[0] - dy / L * (o + wob * .3) - X0) * PPM, (p[1] + dx / L * (o + wob * .3) - Y0) * PPM]; });
      const stroke = (run, o, w, col) => { const q = off(run, o); x.beginPath(); q.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.lineWidth = Math.max(1, w * PPM); x.strokeStyle = col; x.stroke(); };
      x.lineJoin = 'round'; x.lineCap = 'round';
      runs.forEach(run => {
        const w = rd.w, foot = rd.traccia || w < 2.5;
        stroke(run, 0, w + 2.4, 'rgba(60,56,36,.10)'); stroke(run, 0, w + 1.5, 'rgba(78,66,44,.16)'); stroke(run, 0, w + .7, 'rgba(96,80,56,.32)');
        stroke(run, 0, w, foot ? 'rgba(118,98,70,.9)' : '#84704e');
        if (!foot) { const ro = w * .27; stroke(run, -ro, w * .15, 'rgba(82,66,46,.7)'); stroke(run, ro, w * .15, 'rgba(82,66,46,.7)'); stroke(run, 0, w * .22, 'rgba(76,104,46,.62)'); stroke(run, -ro, w * .05, 'rgba(150,132,100,.45)'); stroke(run, ro, w * .05, 'rgba(150,132,100,.45)'); }
        else stroke(run, 0, w * .32, 'rgba(146,122,90,.55)');
      });
    });
  }
  // si chiama da paintTiles prima del bosco: prende prato, macchia aperta e campi fuori città
  function prato38(x, px, py, P, tx, ty, r, v, z, ii) {
    const T = G.T, W0 = M.world; if (z === ZN.CITTA) return false;
    if (RW[ii] > 0 && !RECT[ii] && (v === T.VIA || v === T.DIRT || v === T.DESERT || v === T.SHRUB || v === T.SAND || v === T.GRASS)) v = T.GRASS;   // sotto la strada: prato, niente quadrati
    const F = W0 && W0.feat ? W0.feat[ii] : 0; if (F & 8192 && v !== T.GRASS) return false;   // il ghiaione resta del bosco
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
      const X = wx + (si + .5) * .5, Y = wy + (sj + .5) * .5, c0 = vdPrato(X, Y, top, rough), c = v === T.ROCK ? vdMix(c0, VDC.rock, vdS(-.3, .25, vnz(X / 4 + 7, Y / 4 + 3))) : c0, j = (r() - .5) * 3, cc = [c[0] + j, c[1] + j, c[2] + j * .6];
      cols.push(cc); x.fillStyle = vdRGB(cc); x.fillRect(px + si * S4, py + sj * S4, S4, S4);
    }
    // fili d'erba: trattini più chiari e più scuri del posto
    for (let q = 0; q < 4; q++) { const ix = Math.floor(r() * P), iy = Math.floor(r() * P), c = cols[(iy >> 2) * 4 + (ix >> 2)], k = r() < .55 ? 1.06 : .94; x.fillStyle = vdRGB([c[0] * k, c[1] * k, c[2] * k]); x.fillRect(px + ix, py + iy, 1, r() < .5 ? 2 : 1); }
    const w0 = vdWet(wx + 1, wy + 1);
    // cumuli di talpa dove la terra è grassa
    if (!top && th(tx, ty, 61) < (w0 > 0 ? .02 : .007)) { const cx = px + 3 + r() * 10, cy = py + 3 + r() * 10; x.fillStyle = '#4a3626'; x.beginPath(); x.ellipse(cx, cy, 2.6, 2, 0, 0, 6.3); x.fill(); x.fillStyle = '#6a5038'; x.beginPath(); x.ellipse(cx - .6, cy - .5, 1.5, 1.1, 0, 0, 6.3); x.fill(); }
    // sassi affioranti
    if (th(tx, ty, 64) < (top ? .1 : .025)) { const cx = px + 2 + r() * 12, cy = py + 2 + r() * 12, rr = 1.2 + r() * 1.6; x.fillStyle = '#5e5a54'; x.beginPath(); x.ellipse(cx, cy, rr, rr * .75, r() * 3, 0, 6.3); x.fill(); x.fillStyle = 'rgba(170,166,156,.6)'; x.fillRect(Math.floor(cx - rr * .4), Math.floor(cy - rr * .5), 1, 1); }
    // fiori a colonie (bianchi, gialli, viola), mai sparsi uno per casella
    const fl = vnz(wx / 7 + 70, wy / 7 + 70); if (fl > 9 && !rough) { const h = th(Math.floor(wx / 26), Math.floor(wy / 26), 63), col = h < .4 ? '#e8e4d8' : h < .72 ? '#e0c040' : '#9a78c0', k = Math.floor((fl - .18) * 60);
      for (let q = 0; q < k; q++) { x.fillStyle = col; x.fillRect(px + Math.floor(r() * P), py + Math.floor(r() * P), 1, 1); } }
    return true;
  }

  // ---------------- le forme delle piante: triangoli coi colori veri per vertice, il vento più forte in alto ----------------
  const vdH = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const vdL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const vdK = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  // l'atlante delle texture: 4 × 4 celle da 128 px. La cella 7 è bianca piena: le parti senza texture la usano (un materiale per tutto)
  const VDA = { N: 8, WHITE: 7 };
  const vdUV = (cell, u, v) => { const cx = cell % VDA.N, cy = Math.floor(cell / VDA.N), m = .02; return [(cx + m + u * (1 - 2 * m)) / VDA.N, 1 - (cy + m + (1 - v) * (1 - 2 * m)) / VDA.N]; };
  const VDWUV = (() => { const a = vdUV(7, .5, .5); return [a[0], a[1], a[0], a[1], a[0], a[1]]; })();
  // ---------------- l'atlante: frasche d'abete ad aghi, fronde di felce, ciuffi d'erba, erba coi fiorellini, foglie, aghi di pino,
  // palma a ventaglio, foglia a cuore, squame di ginepro, muschio. Dipinto a mano su canvas, con la trasparenza (le carte si ritagliano)
  function vdAtlas() {
    if (VD.atlas) return VD.atlas;
    const S = 128, c = mk(S * 8, S * 8), x = c.getContext('2d'), r = rng(4242);
    const cell = (k, fn) => { const ox = (k % 8) * S, oy = Math.floor(k / 8) * S; x.save(); x.beginPath(); x.rect(ox + 3, oy + 3, S - 6, S - 6); x.clip(); x.translate(ox, oy); fn(); x.restore(); };
    const G1 = ['#1e3a14', '#2a4a1a', '#3a6022', '#4e7a2a', '#6a9432', '#86ac3c', '#a4c04a'], G2 = ['#4a7a2a', '#5a8a30', '#6a9a36', '#7aa83c', '#8ab444', '#9cc04e', '#b0cc5c'];
    const line = (x0, y0, x1, y1, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
    const gblade = (x0, y0, h, lean, w, c0, c1) => { const g = x.createLinearGradient(0, y0, 0, y0 - h); g.addColorStop(0, c0); g.addColorStop(.55, c1); g.addColorStop(1, c1); x.fillStyle = g; x.beginPath(); x.moveTo(x0 - w, y0); x.quadraticCurveTo(x0 + lean * .3, y0 - h * .6, x0 + lean, y0 - h); x.quadraticCurveTo(x0 + lean * .3 + w * .3, y0 - h * .55, x0 + w, y0); x.fill(); };
    const blade = (x0, y0, h, lean, w, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(x0 - w, y0); x.quadraticCurveTo(x0 + lean * .3, y0 - h * .6, x0 + lean, y0 - h); x.quadraticCurveTo(x0 + lean * .3 + w * .3, y0 - h * .55, x0 + w, y0); x.fill(); };
    // 0: frasca d'abete, vista di sopra: il rametto al centro, rametti laterali, aghi fitti e corti, punte chiare
    cell(0, () => { line(64, 126, 64, 6, 2.5, '#4a3424');
      for (let y = 118; y > 12; y -= 9) { const L = 18 + (y - 12) / 106 * 34; [-1, 1].forEach(sd => { const ex = 64 + sd * L, ey = y - L * .55; line(64, y, ex, ey, 1.4, '#4a3828');
        for (let t = 0; t < 1; t += .06) { const px = 64 + (ex - 64) * t, py = y + (ey - y) * t, n = 7 * (1 - t * .4); [-1, 1].forEach(s2 => { const col = G1[Math.min(6, Math.floor(1 + t * 5 + r() * 2))]; line(px, py, px + s2 * n * .5 + sd * n * .45, py - n * .8, 1.6, col); }); } }); }
      for (let y = 124; y > 6; y -= 3) [-1, 1].forEach(s2 => line(64, y, 64 + s2 * 5, y - 5, 1.5, G1[3 + Math.floor(r() * 3)])); });
    // 1: fronda di felce: rachide e pinne seghettate che si stringono in punta
    cell(1, () => { line(64, 126, 64, 6, 2, '#3a5a1e');
      for (let y = 120; y > 10; y -= 7) { const t = (126 - y) / 116, L = 50 * Math.sin(Math.PI * (t * .85 + .12)); [-1, 1].forEach(sd => { for (let k = 0; k < L; k += 3) { const px = 64 + sd * k, py = y - k * .35, w = 4.5 * (1 - k / L) + 1; x.fillStyle = G1[Math.min(6, 2 + Math.floor(t * 3 + r() * 2.2))]; x.fillRect(Math.min(px, px + sd * 2), py - w, 2.6, w * 1.6); } }); } });
    // 2: ciuffo d'erba fitto
    cell(2, () => { for (let k = 0; k < 150; k++) { const x0 = 14 + r() * 100, h = 40 + Math.pow(r(), 1.6) * 64, l = r(); gblade(x0, 128, h, (r() - .5) * 34, 2.6 + r() * 2, '#2e4a1c', l < .5 ? '#7aa83c' : l < .85 ? '#8cb846' : '#a8cc5c'); } });
    // 3: erba alta con le spighe
    cell(3, () => { for (let k = 0; k < 60; k++) { const x0 = 18 + r() * 92, h = 50 + Math.pow(r(), 1.5) * 56; blade(x0, 128, h, (r() - .5) * 30, 1.6 + r() * 1.2, pick(r, ['#3e6024', '#5a7a2c', '#86983c', '#a8a85a', '#c0b06a'])); }
      for (let k = 0; k < 9; k++) { const x0 = 24 + r() * 80, top = 14 + r() * 26, lx = x0 + (r() - .5) * 16; line(x0, 128, lx, top + 12, 1.2, '#8a8a4a'); x.fillStyle = pick(r, ['#b8a060', '#c8a868', '#a89050']); x.beginPath(); x.ellipse(lx, top + 6, 2.6, 9, (r() - .5) * .4, 0, 6.3); x.fill(); } });
    // 4: rametto di foglie larghe (faggio, betulla, sambuco, rovo)
    cell(4, () => { line(64, 126, 64, 10, 2, '#4a3a28');
      for (let k = 0; k < 26; k++) { const y = 118 - k * 4.2, sd = k % 2 ? 1 : -1, L = 16 + r() * 22, ex = 64 + sd * L, ey = y - 8 - r() * 10, a = Math.atan2(ey - y, ex - 64); line(64, y, ex, ey, 1, '#4a3a28');
        x.fillStyle = pick(r, G1.slice(2)); x.beginPath(); x.ellipse(ex, ey, 11 + r() * 5, 6 + r() * 2.5, a, 0, 6.3); x.fill(); line(ex - Math.cos(a) * 9, ey - Math.sin(a) * 9, ex + Math.cos(a) * 9, ey + Math.sin(a) * 9, .8, 'rgba(200,220,140,.6)'); } });
    // 5: ciuffi di aghi di pino, lunghi
    cell(5, () => { for (let k = 0; k < 7; k++) { const cx = 20 + r() * 88, cy = 24 + r() * 80; for (let q = 0; q < 26; q++) { const a = r() * 6.28, L = 12 + r() * 16; line(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 1.3, pick(r, G1.slice(1, 6))); } } });
    // 6: erba bassa piena di fiorellini bianchi (il prato del riferimento)
    cell(6, () => { for (let k = 0; k < 130; k++) { const x0 = 14 + r() * 100, h = 34 + Math.pow(r(), 1.6) * 60, l = r(); gblade(x0, 128, h, (r() - .5) * 30, 2.4 + r() * 1.8, '#2e4a1c', l < .6 ? '#80ac40' : '#98c050'); }
      for (let k = 0; k < 7; k++) { const fx = 20 + r() * 88, fy = 34 + r() * 40; for (let q = 0; q < 9; q++) { const a = r() * 6.28, d = r() * 12; x.fillStyle = q % 3 ? '#f4f2e8' : '#e8e4d0'; x.beginPath(); x.arc(fx + Math.cos(a) * d, fy + Math.sin(a) * d * .6, 3.4, 0, 6.3); x.fill(); } } });
    // 7: bianco pieno
    { x.fillStyle = '#ffffff'; x.fillRect(7 * S, 0, S, S); }
    // 8: palma a ventaglio
    cell(8, () => { for (let k = 0; k < 17; k++) { const a = Math.PI + .12 + k / 16 * (Math.PI - .24), a2 = a + .1; x.fillStyle = k % 2 ? '#3e7a26' : '#5a9e34'; x.beginPath(); x.moveTo(64, 124); x.lineTo(64 + Math.cos(a) * 62, 124 + Math.sin(a) * 118); x.lineTo(64 + Math.cos(a2) * 58, 124 + Math.sin(a2) * 112); x.fill(); line(64, 124, 64 + Math.cos(a + .05) * 60, 124 + Math.sin(a + .05) * 114, .8, 'rgba(180,220,120,.6)'); } });
    // la lamina lucida: un riflesso chiaro lungo un lato e qualche goccia (la luce del gioco è opaca: la lucentezza è dipinta)
    const gloss = (cx, cy, rx, ry, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx); g.addColorStop(0, 'rgba(235,255,200,.55)'); g.addColorStop(1, 'rgba(235,255,200,0)'); x.save(); x.translate(cx, cy); x.rotate(a); x.scale(1, ry / rx); x.fillStyle = g; x.beginPath(); x.arc(0, 0, rx, 0, 6.3); x.fill(); x.restore(); };
    const drops = (n, x0, y0, w, h) => { for (let k = 0; k < n; k++) { const dx = x0 + r() * w, dy = y0 + r() * h, rr = 1 + r() * 1.6; x.fillStyle = 'rgba(20,50,20,.45)'; x.beginPath(); x.arc(dx + .6, dy + .8, rr, 0, 6.3); x.fill(); x.fillStyle = 'rgba(240,255,230,.9)'; x.beginPath(); x.arc(dx - .3, dy - .3, rr * .55, 0, 6.3); x.fill(); } };
    // 9: foglia a cuore con le nervature
    cell(9, () => { x.fillStyle = '#3a7a26'; x.beginPath(); x.moveTo(64, 120); x.bezierCurveTo(4, 70, 18, 4, 64, 30); x.bezierCurveTo(110, 4, 124, 70, 64, 120); x.fill();
      x.fillStyle = 'rgba(120,180,70,.35)'; x.beginPath(); x.ellipse(50, 60, 22, 30, -.3, 0, 6.3); x.fill(); line(64, 120, 64, 30, 2.4, '#9ad064'); for (let k = 0; k < 6; k++) { const y = 104 - k * 13; line(64, y, 26 + k * 3, y - 18, 1.2, '#7ab84a'); line(64, y, 102 - k * 3, y - 18, 1.2, '#7ab84a'); } gloss(46, 62, 30, 14, -1.1); gloss(86, 76, 18, 8, 1); drops(14, 30, 40, 70, 60); });
    // 10: squame fitte (ginepro, erica): grumi di aghi con buchi
    cell(10, () => { for (let k = 0; k < 900; k++) { const px = 4 + r() * 120, py = 4 + r() * 120, d = Math.hypot(px - 64, py - 64); if (d > 60 * (.75 + r() * .3)) continue; x.fillStyle = pick(r, ['#1e3424', '#2e4a34', '#3e5e44', '#4e6e50', '#62806a']); x.fillRect(px, py, 2 + r() * 2, 2); } });
    // 11: muschio e trifoglio, tappeto basso
    cell(11, () => { for (let k = 0; k < 160; k++) { const x0 = 4 + r() * 120, h = 18 + r() * 30; gblade(x0, 128, h, (r() - .5) * 24, 2.8 + r() * 2, '#2a4618', r() < .6 ? '#6a9a34' : '#7eac3e'); }
      for (let k = 0; k < 30; k++) { const fx = 8 + r() * 112, fy = 92 + r() * 30; x.fillStyle = pick(r, ['#5a9a34', '#6aac3a', '#4a8a2a']); for (let q = 0; q < 3; q++) { x.beginPath(); x.arc(fx + Math.cos(q * 2.1) * 3, fy + Math.sin(q * 2.1) * 3, 3, 0, 6.3); x.fill(); } } });
    // 12: erba secca e paglia (dune, pascolo bruciato dal vento)
    cell(12, () => { for (let k = 0; k < 120; k++) { const x0 = 14 + r() * 100, h = 40 + Math.pow(r(), 1.6) * 66; gblade(x0, 128, h, (r() - .5) * 40, 2.2 + r() * 1.6, '#4a5228', r() < .6 ? '#b4aa6a' : '#ccc286'); } });
    // 13: fiori di campo misti (gialli e viola)
    cell(13, () => { for (let k = 0; k < 110; k++) { const x0 = 14 + r() * 100, h = 30 + Math.pow(r(), 1.6) * 60; gblade(x0, 128, h, (r() - .5) * 26, 2.4 + r() * 1.6, '#2e4a1c', '#86b044'); }
      for (let k = 0; k < 16; k++) { const fx = 12 + r() * 104, fy = 40 + r() * 50, col = pick(r, ['#e8c430', '#f0d850', '#8a6ab8', '#a080d0', '#e8e4d8']); line(fx, 128, fx, fy, 1, '#4e7a2a'); x.fillStyle = col; x.beginPath(); x.arc(fx, fy, 4, 0, 6.3); x.fill(); } });
    // 14: rametto spoglio (betulla d'inverno in punta, arbusti): rametti sottili con poche foglie
    cell(14, () => { const tw = (x0, y0, a, L, d) => { if (d > 4 || L < 5) return; const ex = x0 + Math.cos(a) * L, ey = y0 + Math.sin(a) * L; line(x0, y0, ex, ey, Math.max(.8, 2.4 - d * .5), '#5a4a3e'); if (d > 1 && r() < .7) { x.fillStyle = pick(r, ['#8aac3c', '#a4c04a', '#6a9432', '#c0c860']); x.beginPath(); x.ellipse(ex, ey, 5, 3, a, 0, 6.3); x.fill(); } tw(ex, ey, a - .45 - r() * .3, L * .72, d + 1); tw(ex, ey, a + .45 + r() * .3, L * .72, d + 1); }; tw(64, 126, -Math.PI / 2, 40, 0); });
    // 15: canne e giunchi
    cell(15, () => { for (let k = 0; k < 50; k++) { const x0 = 10 + r() * 108, h = 70 + r() * 56; blade(x0, 128, h, (r() - .5) * 14, 1.4, pick(r, ['#2e4a1e', '#3e5e26', '#4e6e2c', '#6a7a3a'])); } for (let k = 0; k < 6; k++) { const fx = 16 + r() * 96, fy = 10 + r() * 30; x.fillStyle = '#6a4a2a'; x.beginPath(); x.ellipse(fx, fy, 3, 10, 0, 0, 6.3); x.fill(); } });
    // 16: foglia a lancia (eretta, lucida, nervatura centrale chiara)
    cell(16, () => { x.fillStyle = '#2e6a22'; x.beginPath(); x.moveTo(64, 126); x.bezierCurveTo(30, 90, 40, 30, 64, 4); x.bezierCurveTo(88, 30, 98, 90, 64, 126); x.fill();
      x.fillStyle = '#4a8e30'; x.beginPath(); x.moveTo(64, 126); x.bezierCurveTo(46, 90, 52, 30, 64, 4); x.lineTo(64, 126); x.fill(); line(64, 124, 64, 8, 1.8, '#a8d878'); for (let k = 0; k < 9; k++) { const y = 112 - k * 11; line(64, y, 46 + k * 1.4, y - 14, .8, 'rgba(160,210,110,.6)'); line(64, y, 82 - k * 1.4, y - 14, .8, 'rgba(160,210,110,.6)'); } gloss(56, 50, 14, 40, 0); drops(6, 50, 30, 28, 70); });
    // 17: felce riccia: fronda con le pinnule fitte e arricciate, verde chiaro
    cell(17, () => { line(64, 126, 64, 6, 1.6, '#4a7a2a');
      for (let y = 120; y > 10; y -= 5) { const t = (126 - y) / 116, L = 48 * Math.sin(Math.PI * (t * .85 + .12)); [-1, 1].forEach(sd => { for (let k = 2; k < L; k += 4) { const px = 64 + sd * k, py = y - k * .3, rr = 3.4 * (1 - k / L) + 1.2; x.fillStyle = G2[Math.min(6, 2 + Math.floor(t * 3 + r() * 2.5))]; x.beginPath(); x.ellipse(px, py, rr * 1.2, rr, sd * .6, 0, 6.3); x.fill(); x.fillStyle = 'rgba(30,60,20,.35)'; x.fillRect(px - .5, py + rr * .4, 1, 1); } }); } });
    // 18: felce larga: pinne lunghe e larghe, verde scuro con la luce sui bordi
    cell(18, () => { line(64, 126, 64, 4, 2.4, '#2e4a1c');
      for (let y = 118; y > 12; y -= 9) { const t = (126 - y) / 114, L = 56 * Math.sin(Math.PI * (t * .8 + .15)); [-1, 1].forEach(sd => { x.fillStyle = t > .7 ? '#5a9a32' : '#3a7a24'; x.beginPath(); x.moveTo(64, y); x.quadraticCurveTo(64 + sd * L * .5, y - 12, 64 + sd * L, y - 10); x.quadraticCurveTo(64 + sd * L * .5, y + 2, 64, y + 4); x.fill(); line(64, y + 1, 64 + sd * L * .95, y - 9, .9, 'rgba(150,200,100,.55)'); for (let k = 6; k < L; k += 5) line(64 + sd * k, y - k * .17 - 2, 64 + sd * (k + 2), y - k * .17 + 3, .8, 'rgba(20,40,14,.4)'); }); } });
    // 19: liane a tenda: tanti fili che pendono con le foglioline, fitti in alto, radi in basso
    cell(19, () => { for (let k = 0; k < 11; k++) { const x0 = 6 + r() * 116, len = 50 + r() * 74, sw = (r() - .5) * 10; let px = x0, py = 2;
        x.strokeStyle = pick(r, ['#3a5a22', '#4a6a2a', '#5a7a32']); x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py);
        for (let q = 0; q < len; q += 4) { px = x0 + Math.sin(q * .08 + k) * 3 + sw * q / len; py = 2 + q; x.lineTo(px, py); } x.stroke();
        for (let q = 6; q < len; q += 10 + r() * 8) { const lx = x0 + Math.sin(q * .08 + k) * 3 + sw * q / len, ly = 2 + q, sd = r() < .5 ? -1 : 1; x.fillStyle = pick(r, ['#3e7a26', '#5a9a34', '#7ab83e', '#4a8a2c']); x.beginPath(); x.ellipse(lx + sd * 3, ly, 4, 2.4, sd * .5, 0, 6.3); x.fill(); } } });
    // 20: foglia a cuore scura con le nervature bianche (alocasia)
    cell(20, () => { x.fillStyle = '#1e3e1a'; x.beginPath(); x.moveTo(64, 4); x.bezierCurveTo(12, 30, 6, 100, 50, 118); x.lineTo(64, 104); x.lineTo(78, 118); x.bezierCurveTo(122, 100, 116, 30, 64, 4); x.fill();
      line(64, 6, 64, 108, 2.6, '#d8e8d0'); for (let k = 0; k < 5; k++) { const y = 22 + k * 17; line(64, y, 22 + k * 2, y + 22, 1.6, '#c8dcc0'); line(64, y, 106 - k * 2, y + 22, 1.6, '#c8dcc0'); } gloss(46, 46, 24, 12, -.8); drops(8, 34, 30, 60, 60); });
    // 21: foglia a pagaia (banano, strelizia): lunga, con gli strappi laterali
    cell(21, () => { x.fillStyle = '#3e7e26'; x.beginPath(); x.moveTo(64, 126); x.bezierCurveTo(26, 100, 30, 20, 64, 2); x.bezierCurveTo(98, 20, 102, 100, 64, 126); x.fill();
      line(64, 124, 64, 4, 3, '#b8d888'); for (let k = 0; k < 16; k++) { const y = 118 - k * 7, sd = k % 2 ? 1 : -1; line(64, y, 64 + sd * 34, y - 9, .8, 'rgba(170,220,120,.5)'); if (r() < .4) { x.strokeStyle = 'rgba(0,0,0,1)'; x.globalCompositeOperation = 'destination-out'; line(64 + sd * 10, y - 3, 64 + sd * 40, y - 11, 1.6, '#000'); x.globalCompositeOperation = 'source-over'; } } gloss(54, 54, 16, 44, .1); });
    const W = c.width, Hh = c.height, src = x.getImageData(0, 0, W, Hh).data, d = new Uint8Array(src), fill = new Uint8Array(W * Hh);
    for (let i = 0; i < W * Hh; i++) fill[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    for (let pass = 0; pass < 12; pass++) { const nf = fill.slice(); for (let y = 0; y < Hh; y++) for (let xx = 0; xx < W; xx++) { const i = y * W + xx; if (fill[i]) continue; let rr = 0, gg = 0, bb = 0, k = 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = xx + ox, b = y + oy; if (a < 0 || b < 0 || a >= W || b >= Hh) continue; const q = b * W + a; if (!fill[q]) continue; rr += d[q * 4]; gg += d[q * 4 + 1]; bb += d[q * 4 + 2]; k++; }
      if (k) { d[i * 4] = rr / k; d[i * 4 + 1] = gg / k; d[i * 4 + 2] = bb / k; nf[i] = 1; } } fill.set(nf); }
    for (let i = 0; i < W * Hh; i++) if (!fill[i]) { d[i * 4] = 80; d[i * 4 + 1] = 110; d[i * 4 + 2] = 50; }
    const out = new Uint8Array(W * Hh * 4); for (let y = 0; y < Hh; y++) out.set(d.subarray((Hh - 1 - y) * W * 4, (Hh - y) * W * 4), y * W * 4);   // la DataTexture non si capovolge: le righe dal basso
    const t = new THREE.DataTexture(out, W, Hh, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
    return (VD.atlas = t);
  }
  // un materiale per tutta la vegetazione nuova: atlante, ritaglio, colori per vertice, vento e il bosco che si apre attorno al giocatore
  function vdMat() {
    if (VD.mat) return VD.mat;
    const m = natMat(vdAtlas(), false); m.vertexColors = true; m.alphaTest = .45; m.side = THREE.DoubleSide; m.color.setRGB(1.3, 1.3, 1.25);
    return (VD.mat = m);
  }
  function vdB(soft) {
    const P = [], C = [], W = [], U = [], NN = [];
    const tri = (a, b, c, ca, cb, cc, wa, wb, wc, uv, nrm) => { NN.push(nrm || null); P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); C.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]); W.push(wa || 0, wb || 0, wc || 0); const q = uv || VDWUV; U.push(q[0], q[1], q[2], q[3], q[4], q[5]); };
    // una carta con la texture di una cella: a, b in basso (sinistra, destra), c, d in alto (destra, sinistra)
    const card = (a, b, c, d, cell, c0, c1, w0, w1) => { const A = vdUV(cell, 0, 0), B = vdUV(cell, 1, 0), Cc = vdUV(cell, 1, 1), D = vdUV(cell, 0, 1);
      tri(a, b, c, c0, c0, c1, w0, w0, w1, [A[0], A[1], B[0], B[1], Cc[0], Cc[1]]); tri(a, c, d, c0, c1, c1, w0, w1, w1, [A[0], A[1], Cc[0], Cc[1], D[0], D[1]]); };
    // una carta piegata in due segmenti (fronde, frasche che pendono): base, metà, punta; larghezza w, perpendicolare orizzontale
    const bent = (p0, p1, p2, w, cell, c0, c1, w0, w1, flat, fold) => {
      if (fold) {   // la lamina piegata: nervatura alzata, i due lati che scendono; la base più scura (dentro la pianta c'è ombra)
        const dx = p2[0] - p0[0], dz = p2[2] - p0[2], L = Math.hypot(dx, dz) || 1, nx = -dz / L * w, nz = dx / L * w, up = w * fold;
        const P3 = [p0, p1, p2], K = [.65, 1, .75], V = [0, .5, 1], cs = [vdK(c0, .62), vdL(c0, c1, .55), c1], ws = [w0, (w0 + w1) / 2, w1];
        for (let k = 0; k < 2; k++) { const a = P3[k], b = P3[k + 1];
          const aL = [a[0] - nx * K[k], a[1] - up * K[k], a[2] - nz * K[k]], aR = [a[0] + nx * K[k], a[1] - up * K[k], a[2] + nz * K[k]], bL = [b[0] - nx * K[k + 1], b[1] - up * K[k + 1], b[2] - nz * K[k + 1]], bR = [b[0] + nx * K[k + 1], b[1] - up * K[k + 1], b[2] + nz * K[k + 1]];
          const uA = vdUV(cell, 0, V[k]), uB = vdUV(cell, 0, V[k + 1]), mA = vdUV(cell, .5, V[k]), mB = vdUV(cell, .5, V[k + 1]), rA = vdUV(cell, 1, V[k]), rB = vdUV(cell, 1, V[k + 1]);
          tri(aL, a, b, vdK(cs[k], .8), cs[k], cs[k + 1], ws[k], ws[k], ws[k + 1], [uA[0], uA[1], mA[0], mA[1], mB[0], mB[1]]); tri(aL, b, bL, vdK(cs[k], .8), cs[k + 1], vdK(cs[k + 1], .8), ws[k], ws[k + 1], ws[k + 1], [uA[0], uA[1], mB[0], mB[1], uB[0], uB[1]]);
          tri(a, aR, bR, cs[k], vdK(cs[k], .8), vdK(cs[k + 1], .8), ws[k], ws[k], ws[k + 1], [mA[0], mA[1], rA[0], rA[1], rB[0], rB[1]]); tri(a, bR, b, cs[k], vdK(cs[k + 1], .8), cs[k + 1], ws[k], ws[k + 1], ws[k + 1], [mA[0], mA[1], rB[0], rB[1], mB[0], mB[1]]); }
        return; }
      const dx = p2[0] - p0[0], dz = p2[2] - p0[2], L = Math.hypot(dx, dz) || 1, nx = flat ? -dz / L * w : w, nz = flat ? dx / L * w : 0, ny = 0;
      const pl = (p, k) => [p[0] - nx * k, p[1] - ny, p[2] - nz * k], pr = (p, k) => [p[0] + nx * k, p[1] + ny, p[2] + nz * k];
      const A = vdUV(cell, 0, 0), B = vdUV(cell, 1, 0), M0 = vdUV(cell, 0, .5), M1 = vdUV(cell, 1, .5), T0 = vdUV(cell, 0, 1), T1 = vdUV(cell, 1, 1), cm = vdL(c0, c1, .5), wm = (w0 + w1) / 2;
      const a = pl(p0, .7), b = pr(p0, .7), m0 = pl(p1, 1), m1 = pr(p1, 1), t0 = pl(p2, .8), t1 = pr(p2, .8);
      tri(a, b, m1, c0, c0, cm, w0, w0, wm, [A[0], A[1], B[0], B[1], M1[0], M1[1]]); tri(a, m1, m0, c0, cm, cm, w0, wm, wm, [A[0], A[1], M1[0], M1[1], M0[0], M0[1]]);
      tri(m0, m1, t1, cm, cm, c1, wm, wm, w1, [M0[0], M0[1], M1[0], M1[1], T1[0], T1[1]]); tri(m0, t1, t0, cm, c1, c1, wm, w1, w1, [M0[0], M0[1], T1[0], T1[1], T0[0], T0[1]]); };
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
      g.setAttribute('aSnow', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(W, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      g.computeVertexNormals();
      { const nn = g.attributes.normal; NN.forEach((q, t) => { if (!q) return; for (let k = 0; k < 3; k++) nn.setXYZ(t * 3 + k, q[0], q[1], q[2]); }); }
      if (soft) { const nn = g.attributes.normal; for (let i = 0; i < n; i++) { const x = nn.getX(i) * .75, y = Math.abs(nn.getY(i)) * .5 + .42, z = nn.getZ(i) * .75, L = Math.hypot(x, y, z); nn.setXYZ(i, x / L, y / L, z / L); } }
      g.computeBoundingSphere(); return g;
    };
    return { tri, quad, card, bent, blade, stalk, head, leaf, ribbon, lobe, build };
  }
  // le specie: ognuna in 2-3 varianti di forma
  function vdGeoms() {
    if (VD.geo) return VD.geo;
    const Gm = {}, H = vdH, TAU = 6.2832;
    const many = (name, k, fn) => { Gm[name] = []; for (let v = 0; v < k; v++) Gm[name].push(fn(rng(name.length * 977 + v * 131 + 7), v)); };
    // cespo d'erba d'inverno: base verde-oliva, punte color paglia, qualche filo tutto secco
    // cespo d'erba: un ciuffo grande a ventaglio (carte d'erba e di paglia), più alto del tappeto
    many('cespo', 3, (r, v) => { const b = vdB(true);
      for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + r() * .5, ux = Math.cos(a), uz = Math.sin(a), w = .38 + r() * .12, px = -uz * w, pz = ux * w, hh = .55 + r() * .25, o = hh * (.5 + r() * .3);
        b.card([-px, 0, -pz], [px, 0, pz], [px + ux * o, hh, pz + uz * o], [-px + ux * o, hh, -pz + uz * o], q % 2 || v === 2 ? 12 : 2, [.32, .42, .22], [1.25, 1.28, 1], 0, hh * 1.8); }
      return b.build(); });
    // erba bassa e verde dei prati umidi e dei bordi strada
    // erba bassa e verde dei prati umidi e dei bordi strada: ciuffo basso e largo
    many('cespoV', 2, r => { const b = vdB(true);
      for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + r() * .6, ux = Math.cos(a), uz = Math.sin(a), w = .35 + r() * .1, px = -uz * w, pz = ux * w, hh = .3 + r() * .15, o = hh * (.9 + r() * .4);
        b.card([-px, 0, -pz], [px, 0, pz], [px + ux * o, hh * .8, pz + uz * o], [-px + ux * o, hh * .8, -pz + uz * o], q === 0 ? 11 : 2, [.3, .44, .22], [1.28, 1.34, 1.02], 0, hh * 1.8); }
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
      for (let k = 0; k < 8; k++) { const a = r() * TAU, rr = .6 * (.55 + r() * .5), y = .35 * (.6 + r() * .8), cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, w = .22 + r() * .12, ux = Math.cos(a + 1.57) * w, uz = Math.sin(a + 1.57) * w; b.card([cx - ux, y - w * .3, cz - uz], [cx + ux, y - w * .3, cz + uz], [cx + ux + Math.cos(a) * w * 1.6, y + w * .9, cz + uz + Math.sin(a) * w * 1.6], [cx - ux + Math.cos(a) * w * 1.6, y + w * .9, cz - uz + Math.sin(a) * w * 1.6], 4, H('#7a9070'), H('#ffffff'), y * .3, y * .5); }
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
      for (let k = 0; k < 10; k++) { const a = r() * TAU, rr = .5 * (.55 + r() * .5), y = .4 * (.6 + r() * .8), cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, w = .22 + r() * .12, ux = Math.cos(a + 1.57) * w, uz = Math.sin(a + 1.57) * w; b.card([cx - ux, y - w * .3, cz - uz], [cx + ux, y - w * .3, cz + uz], [cx + ux + Math.cos(a) * w * 1.6, y + w * .9, cz + uz + Math.sin(a) * w * 1.6], [cx - ux + Math.cos(a) * w * 1.6, y + w * .9, cz - uz + Math.sin(a) * w * 1.6], 10, H('#c0d0c8'), H('#ffffff'), y * .3, y * .5); }
      return b.build(); });
    // erica: cuscini bassi ruggine e malva
    many('erica', 2, r => { const b = vdB(false);
      b.lobe(0, .14, 0, .5, .2, .45, H('#2a2018'), H('#6a4a4a'), 5, .3, 1, .2, H('#7a5a6a'));
      for (let k = 0; k < 2; k++) { const a = r() * TAU; b.lobe(Math.cos(a) * .4, .1, Math.sin(a) * .4, .3, .14, .28, H('#2a2018'), H('#7a5244'), 9 + k, .35, 0, .2, H('#8a6070')); }
      for (let k = 0; k < 6; k++) { const a = r() * TAU, rr = .45 * (.55 + r() * .5), y = .18 * (.6 + r() * .8), cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, w = .22 + r() * .12, ux = Math.cos(a + 1.57) * w, uz = Math.sin(a + 1.57) * w; b.card([cx - ux, y - w * .3, cz - uz], [cx + ux, y - w * .3, cz + uz], [cx + ux + Math.cos(a) * w * 1.6, y + w * .9, cz + uz + Math.sin(a) * w * 1.6], [cx - ux + Math.cos(a) * w * 1.6, y + w * .9, cz - uz + Math.sin(a) * w * 1.6], 10, H('#d0a8b0'), H('#ffffff'), y * .3, y * .5); }
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
      for (let k = 0; k < 12; k++) { const a = r() * TAU, rr = .5 * (.55 + r() * .5), y = .55 * (.6 + r() * .8), cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, w = .22 + r() * .12, ux = Math.cos(a + 1.57) * w, uz = Math.sin(a + 1.57) * w; b.card([cx - ux, y - w * .3, cz - uz], [cx + ux, y - w * .3, cz + uz], [cx + ux + Math.cos(a) * w * 1.6, y + w * .9, cz + uz + Math.sin(a) * w * 1.6], [cx - ux + Math.cos(a) * w * 1.6, y + w * .9, cz - uz + Math.sin(a) * w * 1.6], 4, H('#9ab088'), H('#ffffff'), y * .3, y * .5); }
      return b.build(); });
    // cavolo dell'orto: cuore tondo e foglie larghe blu-verdi
    many('cavolo', 2, r => { const b = vdB(false); b.lobe(0, .14, 0, .16, .13, .16, H('#2a3a30'), H('#6a8a74'), 4, .2, 0, 0);
      for (let k = 0; k < 6; k++) b.leaf([0, .06, 0], .26, .1, k / 6 * TAU + r() * .4, .25, H('#2e4234'), H('#56766a'), .2); return b.build(); });
    // ramo caduto al margine del bosco
    many('ramo', 2, r => { const b = vdB(false), L = 1.6 + r() * .8, pts = [[-L / 2, .06, 0], [-L / 6, .08, (r() - .5) * .2], [L / 6, .07, (r() - .5) * .2], [L / 2, .05, (r() - .5) * .3]];
      b.ribbon(pts, .06, H('#3a3028'), H('#5a4c3e'), 0); for (let k = 0; k < 3; k++) { const p = pts[1 + (k % 2)], a = r() * TAU; b.ribbon([p, [p[0] + Math.cos(a) * .4, .15 + r() * .2, p[2] + Math.sin(a) * .4]], .025, H('#4a3e32'), H('#6a5a4a'), 0); } return b.build(); });
    // felce verde e folta: fronde ad arco fatte con la texture della fronda (cella 1)
    const frond = (b, N, cell, L0, H0, W0, cA, cB, r) => { for (let f = 0; f < N; f++) { const inner = f < N * .35, a = f / N * TAU * (inner ? 3 : 1) + r() * .5, L = (inner ? .45 : 1) * (L0 + r() * L0 * .5), Hh = (inner ? 1.5 : 1) * (H0 + r() * H0 * .6), dx = Math.cos(a), dz = Math.sin(a), droop = inner ? .85 : .35 + r() * .3;
      b.bent([dx * .03, .02, dz * .03], [dx * L * .45, Hh, dz * L * .45], [dx * L, Hh * droop, dz * L], W0 * (.85 + r() * .3), cell, vdL(cA, cB, r()), H('#ffffff'), 0, 1.6, true, .45); } };
    many('felceV', 3, r => { const b = vdB(false); frond(b, 9 + Math.floor(r() * 3), 1, .8, .5, .2, H('#5a7a44'), H('#8aa070'), r);
      return b.build(); });
    // felce aquilina secca: la stessa fronda tinta di ruggine
    many('felce', 2, r => { const b = vdB(false); frond(b, 7 + Math.floor(r() * 3), 1, .7, .42, .2, H('#a06a3a'), H('#e0a060'), r);
      return b.build(); });
    // palma a ventaglio del sottobosco: picciolo e il ventaglio dipinto (cella 8), inclinato verso fuori
    many('palmaV', 2, r => { const b = vdB(false), N = 5 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .6, l = .3 + r() * .4, h = .5 + r() * .6, c = [Math.cos(a) * l, h, Math.sin(a) * l], R = .5 + r() * .2, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, tilt = .35 + r() * .35;
        b.stalk([0, 0, 0], c, .012, H('#2a4a1a'), H('#4a7a2a'), 1.2);
        b.card([c[0] - px * R, c[1] - .02, c[2] - pz * R], [c[0] + px * R, c[1] - .02, c[2] + pz * R], [c[0] + px * R + dx * R * 1.6, c[1] + R * tilt, c[2] + pz * R + dz * R * 1.6], [c[0] - px * R + dx * R * 1.6, c[1] + R * tilt, c[2] - pz * R + dz * R * 1.6], 8, H('#c8e0b0'), H('#ffffff'), h, h * 1.4); }
      return b.build(); });
    // foglie grandi a cuore (cella 9) su piccioli lunghi, piegate in giù verso la punta
    many('foglione', 2, r => { const b = vdB(false), N = 4 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .7, l = .2 + r() * .25, h = .55 + r() * .6, c = [Math.cos(a) * l, h, Math.sin(a) * l], L = .6 + r() * .3, dx = Math.cos(a), dz = Math.sin(a);
        b.stalk([0, 0, 0], c, .016, H('#2e5a1e'), H('#4a8a2a'), 1);
        b.bent([c[0] - dx * L * .1, c[1] + .04, c[2] - dz * L * .1], [c[0] + dx * L * .45, c[1] + .08, c[2] + dz * L * .45], [c[0] + dx * L, c[1] - L * .35, c[2] + dz * L], L * .42, 9, H('#d0e8c0'), H('#ffffff'), h, h * 1.2, true, .35); }
      return b.build(); });
    // foglie a lancia erette (calla, spatifillo): un cespo di lame alte e lucide
    many('lancia', 3, r => { const b = vdB(false), N = 6 + Math.floor(r() * 4);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .6, h = .7 + r() * .6, l = .12 + r() * .25, dx = Math.cos(a), dz = Math.sin(a);
        b.bent([dx * .03, 0, dz * .03], [dx * l * .4, h * .55, dz * l * .4], [dx * l, h, dz * l], .11 + r() * .05, 16, vdL(H('#9ab890'), H('#d8f0c8'), r()), H('#ffffff'), 0, h * 1.2, true, .35); }
      return b.build(); });
    // felce riccia (chiara, a pinnule fitte) e felce larga (scura, a pinne lunghe)
    many('felceR', 3, r => { const b = vdB(false); frond(b, 11 + Math.floor(r() * 4), 17, .62, .52, .17, H('#88a070'), H('#c0d8a0'), r);
      return b.build(); });
    many('felceL', 3, r => { const b = vdB(false); frond(b, 7 + Math.floor(r() * 3), 18, 1.15, .75, .3, H('#6a8a5a'), H('#a8c090'), r);
      return b.build(); });
    // foglia a cuore scura (alocasia): poche foglie grandi su piccioli lunghi
    many('foglioneS', 2, r => { const b = vdB(false), N = 3 + Math.floor(r() * 3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .7, l = .15 + r() * .2, h = .7 + r() * .7, c = [Math.cos(a) * l, h, Math.sin(a) * l], L = .75 + r() * .3, dx = Math.cos(a), dz = Math.sin(a);
        b.stalk([0, 0, 0], c, .02, H('#2a4a1e'), H('#4a7a2a'), 1);
        b.bent([c[0] - dx * L * .1, c[1] + .05, c[2] - dz * L * .1], [c[0] + dx * L * .45, c[1] + .12, c[2] + dz * L * .45], [c[0] + dx * L, c[1] - L * .3, c[2] + dz * L], L * .45, 20, H('#c8d8c0'), H('#ffffff'), h, h * 1.2, true, .35); }
      return b.build(); });
    // banano / strelizia: foglie a pagaia lunghe su gambi alti, che si aprono a ventaglio
    many('banano', 2, r => { const b = vdB(false), N = 5 + Math.floor(r() * 3), H0 = .9 + r() * .5;
      b.stalk([0, 0, 0], [0, H0, 0], .07, H('#4a6a2e'), H('#6a8a3a'), .3);
      for (let f = 0; f < N; f++) { const a = f / N * TAU + r() * .5, L = 1.3 + r() * .6, dx = Math.cos(a), dz = Math.sin(a), up = .4 + r() * .7;
        b.bent([dx * .05, H0, dz * .05], [dx * L * .45, H0 + up * L * .55, dz * L * .45], [dx * L, H0 + up * L * .35, dz * L], .2 + r() * .05, 21, H('#b8d0a8'), H('#ffffff'), H0 * .6, H0 * 1.4, true, .35); }
      return b.build(); });
    // liane a tenda: strisce di fili che pendono dai rami, a semicerchio sotto la chioma
    many('tenda', 3, r => { const b = vdB(true), N = 6 + Math.floor(r() * 4), top = 5.2 + r() * 2.2;
      for (let k = 0; k < N; k++) { const a = r() * TAU, d = .6 + r() * 1.4, cx = Math.cos(a) * d, cz = Math.sin(a) * d, w = .25 + r() * .2, len = 2.2 + r() * 2.8, px = -Math.sin(a) * w, pz = Math.cos(a) * w, sw = (r() - .5) * .3;
        b.card([cx - px + sw, top - len, cz - pz], [cx + px + sw, top - len, cz + pz], [cx + px, top, cz + pz], [cx - px, top, cz - pz], 19, H('#c0d8b0'), H('#90a880'), .9, .2); }
      return b.build(); });
    // il tappeto d'erba: tre carte incrociate con la texture di un ciuffo (erba, fiorellini, muschio, paglia, fiori di campo, erba alta, canne)
    const tap = (name, cell, w, h, k) => many(name, k || 2, r => { const b = vdB(true);
      const NQ = 4 + Math.floor(r() * 3); for (let q = 0; q < NQ; q++) { const a = q / NQ * TAU + (r() - .5) * 1.1, ux = Math.cos(a), uz = Math.sin(a), ww = w * (.45 + r() * .4), hh = h * (.6 + r() * .6), o = hh * (.35 + r() * .55), droop = r() * .3;
        b.bent([-ux * .04, 0, -uz * .04], [ux * o * .45, hh * .62, uz * o * .45], [ux * o, hh * (.78 - droop), uz * o], ww / 2, cell, [.42, .58, .3], [1.42, 1.46, 1.1], 0, hh * 1.8, true); }
      return b.build(); });
    tap('tErba', 2, .95, .55, 5); tap('tFiori', 6, .9, .45, 3); tap('tMuschio', 11, 1, .3, 3); tap('tPaglia', 12, .9, .6, 4); tap('tCampo', 13, .9, .5, 3); tap('tAlta', 3, .95, 1.15); tap('tCanne', 15, .7, 1.1);
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
      for (let k = 0; k < 14; k++) { const a = r() * TAU, rr = .55 * (.55 + r() * .5), y = .6 * (.6 + r() * .8), cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, w = .22 + r() * .12, ux = Math.cos(a + 1.57) * w, uz = Math.sin(a + 1.57) * w; b.card([cx - ux, y - w * .3, cz - uz], [cx + ux, y - w * .3, cz + uz], [cx + ux + Math.cos(a) * w * 1.6, y + w * .9, cz + uz + Math.sin(a) * w * 1.6], [cx - ux + Math.cos(a) * w * 1.6, y + w * .9, cz - uz + Math.sin(a) * w * 1.6], 4, H('#9ab088'), H('#ffffff'), y * .3, y * .5); }
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
    vdMat(); return (VD.geo = Gm);
  }
  const VDSC = { lancia: [.8, 1.3], felceR: [.8, 1.3], felceL: [.85, 1.35], foglioneS: [.8, 1.25], banano: [.8, 1.25], tenda: [.8, 1.2], felceV: [.9, 1.5], palmaV: [.8, 1.4], foglione: [.45, .75], liana: [.8, 1.2], sambuco: [.8, 1.3], tronco: [.9, 1.1], cespo: [1, 1.6], cespoV: [1, 1.5], alta: [.9, 1.3], giunco: [.9, 1.3], felce: [.9, 1.4], cardo: [.8, 1.2], ombrella: [.8, 1.15], verbasco: [.8, 1.2], fiori: [.8, 1.2],
    rovo: [.8, 1.4], rosa: [.8, 1.3], spoglio: [.8, 1.5], ginepro: [.7, 1.5], erica: [.8, 1.4], ginestra: [.8, 1.3], cespuglio: [.7, 1.3], sasso: [.5, 1.3], ramo: [.8, 1.1], mucchio: [.8, 1.2], cavolo: [.8, 1.15],
    tErba: [.8, 1.3], tFiori: [.8, 1.2], tMuschio: [.8, 1.3], tPaglia: [.8, 1.3], tCampo: [.8, 1.2], tAlta: [1, 1.45], tCanne: [.8, 1.3] };
  const VDSHADOW = { banano: 1, foglioneS: 1, tenda: 1, tAlta: 1, cespo: 1, sambuco: 1, tronco: 1, palmaV: 1, foglione: 1, rovo: 1, rosa: 1, spoglio: 1, ginepro: 1, erica: 1, ginestra: 1, cespuglio: 1, sasso: 1, mucchio: 1 };
  // ---------------- gli ambienti: cosa cresce in ognuno ----------------
  // Le erbe e gli arbusti non si spargono: ogni specie ha un suo campo largo e morbido (la "deriva", come cresce davvero: a masse
  // che si allargano); in ogni punto vince la specie più forte, quindi il manto è continuo, a macchie che si toccano, con i bordi
  // organici e una fascia dove le due si intrecciano. Più forte il campo, più grandi le piante: le masse si gonfiano al centro.
  // tap: tipi del tappeto d'erba; H/S: strati di erbe e di arbusti [specie, vantaggio]; th: sotto questa forza resta il tappeto
  // g: il colore del suolo; t: il tono delle piante.
  const VDPLAN = {
    ABETAIA: { T: [['tMuschio', .15], ['tErba', -.05]], H: [['felceL', .04], ['felceV', 0], ['felceR', -.02], ['foglioneS', -.15]], hth: .0, S: [['cespuglio', -.25]], sth: .1, g: [44, 72, 34], t: '#c8d8c0', d: .7 },
    FAGGETA: { T: [['tErba', .06], ['tAlta', -.02], ['tFiori', -.06], ['tMuschio', 0]], H: [['felceV', .1], ['felceR', .04], ['felceL', .02], ['foglione', -.08], ['lancia', -.1], ['palmaV', -.12], ['fiori', -.12], ['cespoV', -.05]], hth: -.1, S: [['cespuglio', -.05], ['sambuco', -.12]], sth: .12, g: [64, 84, 40], t: '#f0f4d8', d: 1 },
    VALLONE: { T: [['tMuschio', .1], ['tErba', 0]], H: [['felceV', .12], ['felceL', .1], ['felceR', .06], ['palmaV', .08], ['foglione', .06], ['foglioneS', .02], ['lancia', .04], ['banano', -.02]], hth: -.3, S: [['sambuco', -.05]], sth: .15, g: [40, 84, 32], t: '#e0f8d0', d: 1.15 },
    PINETA: { T: [['tPaglia', .1], ['tErba', -.05]], H: [['cespo', .05], ['palmaV', 0], ['alta', -.1], ['felce', -.1]], hth: .0, S: [['cespuglio', .05], ['ginepro', 0], ['ginestra', -.08]], sth: -.02, g: [104, 82, 52], t: '#fff0d8', d: .8 },
    DUNA: { T: [['tPaglia', .1]], H: [['alta', .05], ['cespo', 0]], hth: -.05, S: [['ginepro', -.2]], sth: .2, g: [150, 140, 100], t: '#fff4d8', d: .6 },
    MACCHIA: { T: [['tPaglia', 0], ['tErba', 0]], H: [['cespo', 0], ['palmaV', .02], ['felceL', -.1]], hth: 0, S: [['cespuglio', .1], ['ginepro', .02], ['ginestra', -.02], ['erica', -.05], ['rovo', -.1]], sth: -.2, g: [56, 62, 38], t: '#e4ecd0', d: .9 },
    FARO: { hb: -.08, T: [['tPaglia', .05], ['tErba', 0], ['tCampo', -.05]], H: [['cespo', .05], ['palmaV', -.04]], hth: .02, S: [['erica', .05], ['ginepro', 0], ['sasso', -.1]], sth: .02, g: [104, 110, 66], t: '#f8f4d8', d: .9 },
    PASCOLO: { hb: .05, T: [['tErba', .05], ['tPaglia', .03], ['tAlta', 0], ['tFiori', -.03]], H: [['cespoV', 0], ['cardo', -.25]], hth: .22, S: [['ginepro', 0], ['erica', -.05]], sth: .32, g: [92, 134, 52], t: '#f8fff0', d: 1.1 },
    GHIAIONE: { T: [['tPaglia', 0]], H: [['cespo', 0]], hth: .15, S: [['sasso', 0], ['ginepro', -.1]], sth: .1, g: [90, 88, 80], t: '#e8ecd8', d: .4 },
    SALINA: { T: [['tCanne', .1], ['tErba', 0]], H: [['giunco', .1], ['cespoV', -.1]], hth: -.1, S: [['erica', -.1]], sth: .2, g: [100, 98, 74], t: '#f0f0d8', d: 1 },
    RUDERALE: { hb: .0, T: [['tErba', .05], ['tPaglia', 0]], H: [['cespoV', .02], ['cardo', 0], ['ombrella', 0], ['verbasco', -.08]], hth: -.02, S: [['rovo', 0], ['sambuco', -.05]], sth: .12, g: [92, 86, 56], t: '#f4f0d8', d: .9 },
    RADURA: { hb: .02, T: [['tErba', .04], ['tAlta', .04], ['tFiori', 0], ['tPaglia', -.04], ['tCampo', -.05]], H: [['alta', .02], ['fiori', 0], ['felceR', -.02], ['felceV', -.04], ['lancia', -.1], ['foglione', -.12]], hth: .0, S: [['sambuco', -.02], ['rovo', -.05]], sth: .2, g: [78, 118, 46], t: '#f0ffe8', d: 1.2 },
    RIPARIALE: { T: [['tCanne', .1], ['tErba', 0], ['tMuschio', 0]], H: [['giunco', .1], ['lancia', .06], ['foglione', .02], ['foglioneS', -.04]], hth: -.15, S: [['cespuglio', -.05]], sth: .15, g: [56, 96, 44], t: '#e8f8d8', d: 1.1 },
    BETULLE: { hb: .04, T: [['tErba', .1], ['tAlta', 0], ['tFiori', 0]], H: [['felce', .05], ['felceR', .02], ['alta', 0], ['lancia', -.1], ['fiori', -.05]], hth: -.04, S: [['cespuglio', -.2]], sth: .2, g: [86, 116, 52], t: '#f8ffe0', d: 1.1 },
    PINIMONTE: { T: [['tPaglia', .05], ['tErba', 0]], H: [['cespo', 0], ['felceV', -.05]], hth: .05, S: [['ginepro', 0], ['ginestra', -.05]], sth: .08, g: [92, 86, 54], t: '#f4f0d8', d: .8 },
    VIGNE: { hb: -.1, T: [['tErba', .05], ['tCampo', 0]], H: [['cespoV', 0], ['ombrella', -.1]], hth: .1, S: [['rovo', -.1]], sth: .25, g: [80, 104, 48], t: '#f0f8e0', d: .9 },
    ULIVETO: { T: [['tErba', 0], ['tPaglia', 0]], H: [['cespo', 0]], hth: .1, S: [['ginestra', -.05]], sth: .2, g: [104, 100, 62], t: '#f8f4dc', d: .8 },
    NONE: { hb: -.04, T: [['tErba', 0]], H: [['cespoV', 0], ['cespo', 0]], hth: .05, S: [['cespuglio', -.1], ['rovo', -.1]], sth: .2, g: [70, 100, 46], t: '#f0f8e0', d: .8 },
  };
  // la deriva di una specie: rumore largo (la massa) con un po' di rumore fine (il bordo frastagliato)
  const VDDS = { lancia: 6, felceR: 8, felceL: 10, foglioneS: 6, banano: 7, felceV: 9, palmaV: 7, foglione: 6, cespoV: 11, cespo: 10, alta: 8, fiori: 6, cardo: 7, ombrella: 7, verbasco: 6, giunco: 8, felce: 9,
    cespuglio: 13, sambuco: 10, ginepro: 9, ginestra: 9, erica: 8, rovo: 8, sasso: 6, tErba: 12, tFiori: 7, tMuschio: 9, tPaglia: 12, tCampo: 8, tAlta: 9, tCanne: 8 };
  const VDHASH = s => { let h = 0; for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0; return Math.abs(h) % 97; };
  function vdDrift(sp, X, Y) { const k = VDHASH(sp), sc = VDDS[sp] || 8; return vnz(X / sc + k * 7.13, Y / sc + k * 3.71) + vnz(X / (sc * .32) - k * 1.3, Y / (sc * .32) + k * 2.1) * .3; }
  // chi vince in un punto: [specie, forza]; vicino al pareggio le due si alternano (r)
  function vdHi(X, Y, hb) { const v = vnz(X / 15 + 41, Y / 15 + 17) + vnz(X / 5 + 3, Y / 5 - 9) * .22 + hb; return vdS(-.12, .14, v); }
  function vdWin(L, X, Y, r) { let b = null, bv = -9, c = null, cv = -9; for (const [sp, adv] of L) { const v = vdDrift(sp, X, Y) + adv; if (v > bv) { c = b; cv = bv; b = sp; bv = v; } else if (v > cv) { c = sp; cv = v; } } if (r && c && bv - cv < .07 && r() < .45) return [c, cv]; return [b, bv]; }
  const VDEN = {}; (() => { const E = (M.world && M.world.ECO) || {}; for (const k in E) VDEN[E[k]] = k; })();
  const vdEco = (tx, ty) => { const W0 = M.world; if (!W0 || !W0.eco || tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; return W0.eco[ty * G.GW + tx]; };
  // l'ambiente in un punto, mescolato come in world.js: si legge da un punto spostato (rumore largo + grana), ai bordi si alternano
  const vdEcoMix = (X, Y, j) => { const dx = vnz(X / 30, Y / 30) * 26 + (j || 0) * 10 * (vnz(X * 1.7, Y * 1.3) * 2), dy = vnz(X / 30 + 9, Y / 30 + 4) * 26 + (j || 0) * 10 * (vnz(X * 1.3 + 5, Y * 1.9) * 2); return vdEco(Math.floor((X + dx) / TS), Math.floor((Y + dy) / TS)) || vdEco(Math.floor(X / TS), Math.floor(Y / TS)); };
  const vdPlan = e => VDPLAN[VDEN[e] || 'NONE'] || VDPLAN.NONE;
  // il colore del suolo dell'ambiente, sfumato: media di quattro letture spostate
  function vdGroundTint(X, Y) { let r = 0, g = 0, b = 0; for (const [ox, oy] of [[-7, -3], [6, -6], [-4, 7], [7, 5]]) { const c = vdPlan(vdEcoMix(X + ox, Y + oy)).g; r += c[0]; g += c[1]; b += c[2]; } return [r / 4, g / 4, b / 4]; }
  const vdCol = (k, X, Y, sc) => Math.max(0, Math.min(1.6, .15 + 2.4 * (vnz(X / sc + k * 17.13, Y / sc + k * 9.31) + .25)));
  function vdPick(r, W) { let t = 0; for (const k in W) t += Math.max(0, W[k]); let q = r() * t; for (const k in W) { q -= Math.max(0, W[k]); if (q <= 0) return k; } return 'none'; }
  function vdRoadField(tx0, ty0, n, m) {
    const S = .5, X0 = tx0 * TS - 4, Y0 = ty0 * TS - 4, NX = Math.ceil((n * TS + 8) / S), NY = Math.ceil((m * TS + 8) / S), f = new Float32Array(NX * NY).fill(99);
    (M.roads || []).forEach(rd => { if (rd.rect) return; const urb = rd.kind === 'citta' || rd.kind === 'litoranea', hw = rd.w / 2 + (urb ? 3.2 : rd.kind === 'sterrato' ? .35 : .6), R = hw + 2.5;
      rd.pts.forEach(([ax, ay]) => { if (ax < X0 - R || ay < Y0 - R || ax > X0 + NX * S + R || ay > Y0 + NY * S + R) return;
        const i0 = Math.max(0, Math.floor((ax - R - X0) / S)), i1 = Math.min(NX - 1, Math.ceil((ax + R - X0) / S)), j0 = Math.max(0, Math.floor((ay - R - Y0) / S)), j1 = Math.min(NY - 1, Math.ceil((ay + R - Y0) / S));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(X0 + (i + .5) * S - ax, Y0 + (j + .5) * S - ay) - hw, k = j * NX + i; if (d < f[k]) f[k] = d; } }); });
    return (X, Y) => { const i = Math.floor((X - X0) / S), j = Math.floor((Y - Y0) / S); return i < 0 || j < 0 || i >= NX || j >= NY ? 99 : f[j * NX + i]; };
  }
  function verde38(tx0, ty0, n, m) {
    const grp = new THREE.Group(); grp.name = 'verde'; const tapG = new THREE.Group(); tapG.name = 'tap'; grp.add(tapG); grp.userData.tap = tapG;
    if (!VD.on) return grp;
    const Gm = vdGeoms(), T = G.T, W0 = M.world, F = W0 && W0.feat, B = new Map(), low = LOWQ.on, E = (W0 && W0.ECO) || {};
    const put = (sp, r, x, z, o) => { const vs = Gm[sp]; if (!vs) return; const key = sp + '|' + Math.floor(r() * vs.length); let a = B.get(key); if (!a) B.set(key, a = []); const sr = VDSC[sp] || [1, 1];
      a.push(Object.assign({ x, z, s: sr[0] + r() * (sr[1] - sr[0]), ry: r() * 6.2832, rx: (r() - .5) * .12, rz: (r() - .5) * .12, sy: 1, col: null }, o || {})); };
    const tone = (hex, k, X, Y) => { const c = new THREE.Color(hex), w = vdWet(X, Y), l = k * (.84 + (vnz(X / 22 + 3, Y / 22 + 8) + .5) * .3 + vnz(X / 7, Y / 7) * .06); return '#' + c.setRGB(Math.min(1, c.r * l * (1 - w * .05)), Math.min(1, c.g * l * (1 + w * .06)), Math.min(1, c.b * l)).getHexString(); };
    const natural = v => v === T.GRASS || v === T.SHRUB || v === T.ROCK || v === T.GRAVEL || v === T.FIELD || v === T.TREE || v === T.SAND || v === T.DIRT || v === T.VIA;
    const rdAt = vdRoadField(tx0, ty0, n, m);
    const forest = e => e === E.ABETAIA || e === E.FAGGETA || e === E.VALLONE || e === E.PINETA || e === E.BETULLE || e === E.PINIMONTE;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx, z = zoneT(tx, ty); let v = gT(tx, ty);
      if (z === ZN.CITTA || !natural(v)) continue;
      if (RW[ii] > 0 || v === T.VIA || v === T.DIRT) { if (RECT[ii] || !(RW[ii] > 0)) continue; v = T.GRASS; }   // le caselle sotto la strada: erba fino al ciglio vero
      const f = F ? F[ii] : 0; if ((f & 8192) && v !== T.GRASS && v !== T.ROCK && v !== T.GRAVEL) continue;
      const r = rng((tx * 69061 + ty * 30011) >>> 0), wx = tx * TS, wy = ty * TS, X0 = wx + 1, Y0 = wy + 1;
      const e0 = vdEco(tx, ty);
      if (v === T.SAND && (e0 !== E.DUNA || coastIn(X0, Y0) < 6)) continue;   // sulla sabbia solo la duna, mai sul bagnasciuga
      const nt = vdTreeN(tx, ty), rd = Math.min(1, vdRoadN(tx, ty) / 5);
      const slot = () => [wx + .2 + r() * 1.6, wy + .2 + r() * 1.6];
      // il tappeto d'erba: fitto (3 × 3 per casella), del tipo che vince in quel punto
      const tmul = v === T.GRASS ? 1 : v === T.SHRUB ? .9 : v === T.TREE ? .55 : v === T.FIELD ? 0 : v === T.SAND ? .45 : v === T.ROCK ? .4 : .2, NT = low ? 3 : 4;
      for (let q = 0; q < NT * NT; q++) { const X = wx + (q % NT + .5 + (r() - .5) * .8) * TS / NT, Y = wy + (Math.floor(q / NT) + .5 + (r() - .5) * .8) * TS / NT, pl = vdPlan(vdEcoMix(X, Y, 1));
        const dr = rdAt(X, Y); if (dr < .1 || r() > tmul * pl.d * vdS(.1, .9, dr)) continue;
        const hf = pl.hb !== undefined ? vdHi(X, Y, pl.hb) * vdS(.6, 2.5, dr) : -1;   // il rilievo del prato: isole d'erba alta e prato basso fra l'una e l'altra
        if (hf >= 0) {
          if (r() < hf) { put('tAlta', r, X, Y, { col: tone(pl.t, .92 + hf * .12, X, Y), rx: (r() - .5) * .25, rz: (r() - .5) * .25, s: (.7 + 1 * hf) * (.85 + r() * .3) }); if (hf > .55 && r() < .5) put('tErba', r, X + (r() - .5) * .3, Y + (r() - .5) * .3, { col: tone(pl.t, .85, X, Y), s: .9 + hf * .5 }); }
          else { const L2 = pl.T.filter(t => t[0] !== 'tAlta'); for (let k = 0; k < 2; k++) { const [sp] = vdWin(L2, X, Y, r); put(sp, r, X + (r() - .5) * .35, Y + (r() - .5) * .35, { col: tone(pl.t, 1.12 - hf * .1, X, Y), rx: (r() - .5) * .15, rz: (r() - .5) * .15, s: (.75 + .3 * hf + r() * .25) * (.55 + .45 * vdS(.1, 1.6, dr)) }); } }
          continue;
        }
        const [sp] = vdWin(pl.T, X, Y, r), sr = VDSC[sp] || [1, 1]; put(sp, r, X, Y, { col: tone(pl.t, 1, X, Y), rx: (r() - .5) * .2, rz: (r() - .5) * .2, s: (sr[0] + r() * (sr[1] - sr[0])) * (.55 + .45 * vdS(.1, 1.6, dr)) }); }
      if (v === T.FIELD) {   // i campi: la capezzagna ha le sue erbe e la siepe, l'orto i cavoli a file, il maggese i cardi
        const pc = vdParcel(X0, Y0);
        if (pc.e < 1.4) {
          for (let q = 0; q < (low ? 1 : 3); q++) { const [X, Y] = slot(); if (vdParcel(X, Y).e < 1.2) { put(vdPick(r, { tErba: 1, tCampo: .8, tAlta: .6 }), r, X, Y, { col: tone('#f0f8e0', 1, X, Y) }); const sp = vdPick(r, { ombrella: .6, cardo: .4, cespoV: .6, none: 1 }); if (sp !== 'none') put(sp, r, X, Y); } }
          if (pc.e < .9) { if (th(tx, ty, 71) < .03) put('mucchio', r, X0, Y0); else { const sp = vdPick(r, { rovo: .5, sambuco: .4, cespuglio: .4, none: 2.2 }); if (sp !== 'none') put(sp, r, X0 + (r() - .5), Y0 + (r() - .5), { rx: 0, rz: 0 }); } }
        } else if (pc.t === 3) { for (let q = 0; q < (low ? 1 : 3); q++) { const [X, Y] = slot(), sp = vdPick(r, { cardo: 1.2, ombrella: .8, tPaglia: 1, tErba: 1, none: .4 }); if (sp !== 'none') put(sp, r, X, Y, sp[0] === 't' ? { col: tone('#fff0d8', 1, X, Y) } : null); } }
        else if (pc.t === 1) { if (r() < .4) { const [X, Y] = slot(); put('tPaglia', r, X, Y, { col: '#fff4d8' }); } }
        else if (pc.t === 4) {
          const ca = Math.cos(pc.ang), sa = Math.sin(pc.ang), C = [[wx, wy], [wx + TS, wy], [wx, wy + TS], [wx + TS, wy + TS]].map(([X, Y]) => [X * ca + Y * sa, -X * sa + Y * ca]);
          const u0 = Math.min(...C.map(c => c[0])), u1 = Math.max(...C.map(c => c[0])), v0 = Math.min(...C.map(c => c[1])), v1 = Math.max(...C.map(c => c[1])), ct = th(pc.a, pc.b, 85) < .5 ? '#a8d890' : '#8cb8a0';
          for (let k = Math.floor(u0 / 1.4); k <= Math.ceil(u1 / 1.4); k++) for (const off of [.3, .7]) { const u = k * 1.4 + off; if (u < u0 || u > u1) continue;
            for (let vv = Math.floor(v0 / .55) * .55; vv <= v1; vv += .55) { const X = u * ca - vv * sa, Y = u * sa + vv * ca; if (X < wx || X >= wx + TS || Y < wy || Y >= wy + TS) continue;
              const p2 = vdParcel(X, Y); if (p2.a !== pc.a || p2.b !== pc.b || p2.e < 1.1 || vdField(vdIsF, X, Y) < .55 || r() < .15) continue; put('cavolo', r, X, Y, { col: ct, rx: 0, rz: 0 }); } }
        }
        continue;
      }
      // le erbe: a masse continue (2 × 2 per casella), più grandi dove la specie è più forte
      const NH = low ? 1 : 2;
      for (let q = 0; q < NH * NH; q++) { const X = wx + (q % NH + .5 + (r() - .5) * .7) * TS / NH, Y = wy + (Math.floor(q / NH) + .5 + (r() - .5) * .7) * TS / NH, pl = vdPlan(vdEcoMix(X, Y, 1));
        let L = pl.H, th0 = pl.hth; if (rd > .3) { L = L.concat([['cespoV', .1 * rd], ['ombrella', 0], ['cardo', -.05]]); th0 -= .1 * rd; }   // il bordo strada
        const [sp, val] = vdWin(L, X, Y, r), k = (val - th0) / .3; if (k < 0 || (k < .2 && r() > k * 5) || (v === T.SAND && r() < .5) || rdAt(X, Y) < .9) continue;
        const nm = sp === 'fiori' ? (th(Math.floor(X / 26), Math.floor(Y / 26), 63) < .4 ? 'fioriB' : th(Math.floor(X / 26), Math.floor(Y / 26), 63) < .72 ? 'fioriG' : 'fioriV') : sp, sr = VDSC[nm] || [1, 1];
        put(nm, r, X, Y, { col: tone(pl.t, 1, X, Y), s: (sr[0] + (sr[1] - sr[0]) * Math.min(1, k)) * (.88 + r() * .24) }); }
      // gli arbusti: macchie e cespuglieti continui; al margine del bosco il mantello (rovi, sambuco, cespugli) segue il margine
      { const X = X0 + (r() - .5) * 1.1, Y = Y0 + (r() - .5) * 1.1, e1 = vdEcoMix(X, Y, 1), pl = vdPlan(e1); let L = pl.S, th0 = pl.sth;
        if (v !== T.TREE && nt >= 3 && nt <= 14 && forest(e1)) { L = [['rovo', .05], ['sambuco', 0], ['cespuglio', .05]]; th0 = -.1; }   // il mantello
        if (v === T.TREE) th0 += .15;
        if (v === T.SAND) th0 += .2;
        const [sp, val] = vdWin(L, X, Y, r), k = (val - th0) / .3, sr = VDSC[sp] || [1, 1];
        if (k > 0 && !(k < .2 && r() > k * 5) && rdAt(X, Y) > 1.6) put(sp, r, X, Y, { col: tone(pl.t, 1.02, X, Y), rx: 0, rz: 0, s: (sr[0] + (sr[1] - sr[0]) * Math.min(1, k)) * (.88 + r() * .24) }); }
      // un tronco caduto ogni tanto nel bosco fitto (uno per cella di 18 m, non a pioggia)
      if (v === T.TREE && (e0 === E.ABETAIA || e0 === E.FAGGETA || e0 === E.VALLONE)) { const ci = Math.floor(X0 / 18), cj = Math.floor(Y0 / 18); if (Math.floor(((ci + th(ci, cj, 181)) * 18) / TS) === tx && Math.floor(((cj + th(ci, cj, 182)) * 18) / TS) === ty && th(ci, cj, 183) < .5) put('tronco', r, X0, Y0, { rx: 0, rz: 0, ry: th(ci, cj, 184) * 6.28 }); }
      // le liane pendono dagli alberi dei valloni e delle faggete umide
      if (v === T.TREE && (e0 === E.VALLONE || (e0 === E.FAGGETA && vdWet(X0, Y0) > .15)) && r() < (e0 === E.VALLONE ? .5 : .14) * (low ? .5 : 1)) put('tenda', r, X0 + (r() - .5) * .5, Y0 + (r() - .5) * .5, { rx: 0, rz: 0, col: tone('#f0ffe8', 1, X0, Y0) });
      if (v === T.TREE && (e0 === E.VALLONE || (e0 === E.FAGGETA && vdWet(X0, Y0) > .25)) && r() < (e0 === E.VALLONE ? .35 : .1) * (low ? .5 : 1)) put('liana', r, X0 + (r() - .5) * .6, Y0 + (r() - .5) * .6, { rx: 0, rz: 0, col: tone('#e8f8d8', 1, X0, Y0) });
    }
    for (const [key, arr] of B) {
      const [sp, vi] = key.split('|'), geo = Gm[sp][+vi]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
      arr.forEach(o => { o.y = groundH(o.x, o.z) - .03; x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + 2); });
      const g2 = geo.clone(); g2.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 3);
      const im = new THREE.InstancedMesh(g2, vdMat(), arr.length);
      arr.forEach((o, k) => { vE.set(o.rx, o.ry, o.rz, 'YXZ'); vQ.setFromEuler(vE); vV.set(o.x, o.y, o.z); vS.set(o.s, o.s * o.sy, o.s); vM4.compose(vV, vQ, vS); im.setMatrixAt(k, vM4); im.setColorAt(k, vC.set(o.col || '#ffffff')); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = !!VDSHADOW[sp] && !low; im.receiveShadow = !low; (sp[0] === 't' && sp[1] === sp[1].toUpperCase() ? tapG : grp).add(im);
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
    const y0 = .2 * H, y1 = .96 * H, NW = 18, cIn = H_('#24401a'), cMid = H_('#4a7a2a'), cOut = H_('#94bc48');
    for (let w = 0; w < NW; w++) {
      const t = w / (NW - 1), y = y0 + (y1 - y0) * t + (r() - .5) * .025 * H, L = .19 * H * Math.pow(1 - t, .85) + .025 * H, nb = t > .85 ? 4 : 6, rot = r() * TAU;
      for (let b = 0; b < nb; b++) {
        const a = rot + b / nb * TAU + (r() - .5) * .5, dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, droop = .5 + r() * .25;
        const P = u => [dx * L * u, y + L * (.1 * u - droop * u * u), dz * L * u], sw = u => (y / H) * (.4 + u * 1.2);
        const tip = vdL(cOut, H_('#c0c460'), r() * .5), mid = vdL(cMid, cOut, r() * .3);
        bw.ribbon([P(0), P(.5), P(1)], .022 * H * (1 - t * .7) * .4, H_('#4a3428'), H_('#5a4232'), .2);
        // la frasca lungo il ramo (texture degli aghi, cella 0), piegata come il ramo, e due frasche che pendono sotto
        const tc = vdL(H_('#a8c890'), H_('#ffffff'), r() * .6);
        bl.bent(P(.05), P(.55), P(1.04), L * .3, 0, H_('#7a9070'), tc, sw(0), sw(1), true);
        for (const u of [.45, .8]) { const c = P(u), ww = L * .2, hh = L * .55 * (.7 + r() * .5), o = L * .08;
          bl.card([c[0] - px * ww + dx * o, c[1] - hh, c[2] - pz * ww + dz * o], [c[0] + px * ww + dx * o, c[1] - hh, c[2] + pz * ww + dz * o], [c[0] + px * ww, c[1] + .02, c[2] + pz * ww], [c[0] - px * ww, c[1] + .02, c[2] - pz * ww], 0, tc, H_('#8aa080'), sw(u) * 1.4, sw(u)); }
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
  // la betulla: fusto bianco con le macchie nere, rami fini che salgono e poi ricadono, chioma leggera di rametti a foglie (celle 4 e 14)
  function betullaGeo(seed, H) {
    const r = rng(seed), bw = vdB(false), bl = vdB(true), TAU = 6.2832, H_ = vdH, R0 = .016 * H, SD = 7, lean = (r() - .5) * .06 * H;
    for (let k = 0; k < 10; k++) { const ya = k / 10 * .92 * H, yb = (k + 1) / 10 * .92 * H, ra = R0 * (1 - ya / H * .85) + .015, rb = R0 * (1 - yb / H * .85) + .015, ox = lean * k / 10, ox2 = lean * (k + 1) / 10;
      for (let i = 0; i < SD; i++) { const a0 = i / SD * TAU, a1 = (i + 1) / SD * TAU, dark = r() < (k < 2 ? .6 : .22), ca = dark ? H_('#2a2624') : H_('#ece8e0'), cb = dark ? H_('#3a3430') : H_('#f4f0e8');
        bw.quad([ox + Math.cos(a0) * ra, ya, Math.sin(a0) * ra], [ox + Math.cos(a1) * ra, ya, Math.sin(a1) * ra], [ox2 + Math.cos(a1) * rb, yb, Math.sin(a1) * rb], [ox2 + Math.cos(a0) * rb, yb, Math.sin(a0) * rb], ca, ca, cb, cb, 0, 0, yb / H * .2, yb / H * .2); } }
    for (let k = 0; k < 16; k++) { const y = (.38 + r() * .55) * H, a = r() * TAU, L = (.12 + r() * .14) * H * (1.15 - y / H), dx = Math.cos(a), dz = Math.sin(a), o = lean * y / H;
      const p0 = [o + dx * .02 * H, y, dz * .02 * H], p1 = [o + dx * L * .6, y + L * .55, dz * L * .6], p2 = [o + dx * L, y + L * .3, dz * L];
      bw.ribbon([p0, p1, p2], .006 * H, H_('#d8d2c8'), H_('#5a4a3e'), .4);
      for (let q = 0; q < 3; q++) { const t = .4 + q * .3, c = [p0[0] + (p2[0] - p0[0]) * t, p1[1] + (r() - .3) * L * .3, p0[2] + (p2[2] - p0[2]) * t], w = .05 * H, hh = .11 * H * (.7 + r() * .5), px = -dz, pz = dx;
        bl.card([c[0] - px * w + dx * w * .3, c[1] - hh, c[2] - pz * w + dz * w * .3], [c[0] + px * w + dx * w * .3, c[1] - hh, c[2] + pz * w + dz * w * .3], [c[0] + px * w, c[1] + .05, c[2] + pz * w], [c[0] - px * w, c[1] + .05, c[2] - pz * w], r() < .6 ? 4 : 14, vdL(H_('#c8e0a0'), H_('#f0f8d0'), r()), H_('#ffffff'), y / H * 1.4, y / H * 1.1); } }
    return { wood: bw.build(), leaf: bl.build() };
  }
  // le latifoglie: otto forme (tonda, ovale alta, larga a ombrello, a colonna, piangente, sbilanciata dal vento, a nuvole, giovane rada)
  // e otto tavolozze; la chioma è un involucro pieno di tanti grappoli piccoli che si sovrappongono, la luce la attraversa (crownMat)
  const QSHAPE = [
    { rx: .42, ry: .34, cy: .64, n: 16, pal: ['#2e5a1c', '#6a9a34', '#c8e070'] },   // quercia tonda
    { rx: .3, ry: .42, cy: .6, n: 15, pal: ['#2a5226', '#5a8e3a', '#b0d870'] },    // faggio ovale alto
    { rx: .55, ry: .24, cy: .72, n: 18, pal: ['#34581e', '#7a9a3a', '#d8e078'], flat: 1 },   // ombrello largo
    { rx: .2, ry: .45, cy: .55, n: 12, pal: ['#2e4e2a', '#5a7e46', '#a8c880'] },   // a colonna (pioppo)
    { rx: .45, ry: .38, cy: .55, n: 16, pal: ['#3a5e22', '#7aa040', '#e0e888'], weep: 1 },   // piangente (salice)
    { rx: .44, ry: .3, cy: .66, n: 15, pal: ['#2c4e30', '#4e7a50', '#98c088'], wind: 1 },   // sbilanciata, verde-blu (leccio)
    { rx: .5, ry: .38, cy: .62, n: 20, pal: ['#40601a', '#8aaa30', '#ece070'], clouds: 1 },   // a nuvole, gialla (acero)
    { rx: .3, ry: .28, cy: .62, n: 9, pal: ['#3a6020', '#6e9c3a', '#c0dc6a'] },   // giovane rada
  ];
  function querciaGeo(seed, H, sh) {
    const r = rng(seed), bw = vdB(false), bl = vdB(false), TAU = 6.2832, H_ = vdH, S = QSHAPE[sh % QSHAPE.length];
    const R0 = .03 * H * (sh === 7 ? .6 : 1), bend = S.wind ? [.12 * H, 0] : [(r() - .5) * .05 * H, (r() - .5) * .05 * H];
    const C0 = [bend[0] * .6, H * S.cy, bend[1] * .6], trunkTop = H * (S.cy - S.ry * .55);
    const seg = (a, b, ra, rb, ca, cb) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
      let px = -uz, py = 0, pz = ux; if (Math.hypot(px, pz) < .1) { px = 1; pz = 0; } const pl = Math.hypot(px, py, pz); px /= pl; pz /= pl;
      const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px, SD = 6;
      for (let i = 0; i < SD; i++) { const a0 = i / SD * TAU, a1 = (i + 1) / SD * TAU, o = (an, rr) => [Math.cos(an) * px * rr + Math.sin(an) * qx * rr, Math.cos(an) * py * rr + Math.sin(an) * qy * rr, Math.cos(an) * pz * rr + Math.sin(an) * qz * rr];
        const A0 = o(a0, ra), A1 = o(a1, ra), B0 = o(a0, rb), B1 = o(a1, rb);
        bw.quad([a[0] + A0[0], a[1] + A0[1], a[2] + A0[2]], [a[0] + A1[0], a[1] + A1[1], a[2] + A1[2]], [b[0] + B1[0], b[1] + B1[1], b[2] + B1[2]], [b[0] + B0[0], b[1] + B0[1], b[2] + B0[2]], ca, ca, cb, cb, 0, 0, b[1] / H * .3, b[1] / H * .3); } };
    const TOP = [bend[0] * .35, trunkTop, bend[1] * .35];
    seg([0, 0, 0], [bend[0] * .15, trunkTop * .5, bend[1] * .15], R0 * 1.3, R0, H_('#3e3228'), H_('#4e4034')); seg([bend[0] * .15, trunkTop * .5, bend[1] * .15], TOP, R0, R0 * .75, H_('#4e4034'), H_('#5a4a3c'));
    // i grappoli dentro l'involucro: punti sparsi (più fitti verso fuori), il primo in cima
    const CL = [];
    for (let k = 0; k < S.n; k++) { let u, v, w; do { u = r() * 2 - 1; v = r() * 2 - 1; w = r() * 2 - 1; } while (u * u + v * v + w * w > 1);
      const L = Math.hypot(u, v, w) || 1, out = .45 + .55 * Math.pow(L, .5); u = u / L * out; v = v / L * out; w = w / L * out;
      let x = C0[0] + u * S.rx * H, y = C0[1] + v * S.ry * H, z = C0[2] + w * S.rx * H;
      if (S.flat) y = C0[1] + Math.abs(v) * S.ry * H * .7 - S.ry * H * .15;
      if (S.wind) x += (v + 1) * .06 * H;
      if (S.clouds && k % 4 === 0) y += .06 * H;
      CL.push([x, y, z, H * (S.flat ? .13 : S.n < 12 ? .1 : .115) * (.75 + r() * .5)]); }
    const P0 = vdH(S.pal[0]), P1 = vdH(S.pal[1]), P2 = vdH(S.pal[2]);
    CL.forEach(([cx, cy, cz, R], k) => {
      const mid = [TOP[0] + (cx - TOP[0]) * .45, TOP[1] + (cy - R * .9 - TOP[1]) * .5, TOP[2] + (cz - TOP[2]) * .45];
      seg(TOP, mid, R0 * .5, R0 * .28, H_('#3a2e24'), H_('#3e3228')); seg(mid, [cx * .9 + TOP[0] * .1, cy - R * .75, cz * .9 + TOP[2] * .1], R0 * .28, R0 * .1, H_('#3e3228'), H_('#46382c'));
      const hue = (r() - .5) * .12, NL = 16;   // ogni grappolo un filo diverso di tinta
      for (let q = 0; q < NL; q++) {
        const yy = 1 - (q + .5) / NL * 2, rad = Math.sqrt(1 - yy * yy), th = q * 2.39996 + k * 1.7, n = [Math.cos(th) * rad, yy * .8 + .2, Math.sin(th) * rad], nl = Math.hypot(n[0], n[1], n[2]); n[0] /= nl; n[1] /= nl; n[2] /= nl;
        // la normale è quella dell'involucro intero (la chioma si illumina come un solo volume), mescolata a quella del grappolo
        const ex = (cx - C0[0]) / (S.rx * H), ey = (cy - C0[1]) / (S.ry * H), ez = (cz - C0[2]) / (S.rx * H), el = Math.hypot(ex, ey, ez) || 1, N = [n[0] * .5 + ex / el * .5, n[1] * .5 + ey / el * .5 + .1, n[2] * .5 + ez / el * .5], Nl = Math.hypot(N[0], N[1], N[2]); N[0] /= Nl; N[1] /= Nl; N[2] /= Nl;
        const rr = R * (.6 + r() * .45), p = [cx + n[0] * rr, cy + n[1] * rr * .85 - (S.weep ? Math.max(0, -n[1]) * R * 1.2 : 0), cz + n[2] * rr], sz = R * (.55 + r() * .35) * (S.weep && n[1] < 0 ? 1.3 : 1);
        let t1 = [-n[2], 0, n[0]]; const tl = Math.hypot(t1[0], t1[2]) || 1; t1 = [t1[0] / tl, 0, t1[2] / tl]; const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
        const ang = r() * TAU, ca = Math.cos(ang), sa = Math.sin(ang), u = [t1[0] * ca + t2[0] * sa, t1[1] * ca + t2[1] * sa, t1[2] * ca + t2[2] * sa], v = [t2[0] * ca - t1[0] * sa, t2[1] * ca - t1[1] * sa, t2[2] * ca - t1[2] * sa];
        // la tinta: dalla luce sull'involucro (sole da sud-ovest in alto), il lato in ombra resta verde vivo (la luce passa)
        const lit = Math.max(0, Math.min(1, N[1] * .6 + (N[0] * -.45 + N[2] * -.25) * .6 + .35)), inner = Math.min(1, el);
        let cT = lit > .5 ? vdL(P1, P2, (lit - .5) * 2) : vdL(P0, P1, lit * 2); cT = vdL(cT, P0, (1 - inner) * .35);
        cT = [cT[0] * (1 + hue), cT[1], cT[2] * (1 - hue)]; const cB = vdK(cT, .72);
        const A = [p[0] - u[0] * sz - v[0] * sz, p[1] - u[1] * sz - v[1] * sz, p[2] - u[2] * sz - v[2] * sz], B = [p[0] + u[0] * sz - v[0] * sz, p[1] + u[1] * sz - v[1] * sz, p[2] + u[2] * sz - v[2] * sz];
        const Cc = [p[0] + u[0] * sz + v[0] * sz, p[1] + u[1] * sz + v[1] * sz, p[2] + u[2] * sz + v[2] * sz], D = [p[0] - u[0] * sz + v[0] * sz, p[1] - u[1] * sz + v[1] * sz, p[2] - u[2] * sz + v[2] * sz];
        const cell = r() < .75 ? 4 : 14, w = cy / H * 1.1, uvA = vdUV(cell, 0, 0), uvB = vdUV(cell, 1, 0), uvC = vdUV(cell, 1, 1), uvD = vdUV(cell, 0, 1);
        bl.tri(A, B, Cc, cB, cB, cT, w, w, w * 1.2, [uvA[0], uvA[1], uvB[0], uvB[1], uvC[0], uvC[1]], N); bl.tri(A, Cc, D, cB, cT, cT, w, w * 1.2, w * 1.2, [uvA[0], uvA[1], uvC[0], uvC[1], uvD[0], uvD[1]], N);
      }
    });
    return { wood: bw.build(), leaf: bl.build() };
  }
  // il materiale delle chiome: la luce attraversa le foglie (il lato in ombra si accende di verde-giallo), mai nero
  function crownMat() {
    if (VD.crown) return VD.crown;
    const m = natMat(vdAtlas(), true, '#fffffe'); m.vertexColors = true; m.alphaTest = .45; m.color.setRGB(1.25, 1.25, 1.2);
    m.emissive = new THREE.Color('#6a8a3a'); m.emissiveMap = vdAtlas(); m.emissiveIntensity = .5;
    return (VD.crown = m);
  }
  function abeteModel(name) {
    if (/^Quercia_/.test(name)) { const v = +name.slice(-1) || 0, ref = natModel('CommonTree_1'), H = (ref && ref.top ? ref.top * .95 : 9) * [1, 1.1, .85, 1.2, .95, .9, 1, .7][v], g = querciaGeo(8101 + v * 97, H, v); return { parts: [{ geo: g.wood, mat: vdMat(), leafy: false }, { geo: g.leaf, mat: crownMat(), leafy: true }], top: H }; }
    if (/^Betulla_/.test(name)) { const pine = natModel('Pine_1'), H = pine && pine.top ? pine.top * .95 : 10, g = betullaGeo(5101 + (+name.slice(-1) || 0) * 53, H); return { parts: [{ geo: g.wood, mat: vdMat(), leafy: false }, { geo: g.leaf, mat: vdMat(), leafy: true }], top: H }; }
    if (/^Abete_secco/.test(name)) { const pine = natModel('Pine_1'), H = pine && pine.top ? pine.top * 1.15 : 13; return { parts: [{ geo: seccoGeo(7311 + (+name.slice(-1) || 0) * 31, H), mat: vdMat(), leafy: false }], top: H }; }
    const v = +(name.split('_')[1] || 0), pine = natModel('Pine_1'), H = pine && pine.top ? pine.top * 1.08 : 12, g = abeteGeo(9001 + v * 77, H);
    return { parts: [{ geo: g.wood, mat: vdMat(), leafy: false }, { geo: g.leaf, mat: vdMat(), leafy: true }], top: H };
  }
  // l'albero di una casella secondo l'ambiente (letto mescolato: ai bordi le specie si alternano). [nome, scala, inclinazione]
  function eco38(tx, ty, r) {
    const W0 = M.world, E = (W0 && W0.ECO) || {}; if (!VD.on || !W0 || !W0.eco) return natTree(tx, ty, r);
    const X = tx * TS + 1, Y = ty * TS + 1, e = vdEcoMix(X, Y, 1), q = th(tx, ty, 96), k = th(tx, ty, 97), sc = th(tx, ty, 95), pk = (a) => a[Math.floor(k * a.length) % a.length];
    const AB = () => q < .06 ? ['Abete_secco' + (k < .5 ? 0 : 1), .9 + sc * .3] : ['Abete_' + Math.floor(k * 3), q < .16 ? .4 + sc * .25 : .9 + sc * .35];
    const OAK = (s0, L) => { L = L || [0, 1, 2, 5, 6, 7]; const h = vnz(X / 20 + 3, Y / 20 + 7) + (k - .5) * .6; return ['Quercia_' + L[Math.max(0, Math.min(L.length - 1, Math.floor((h + .5) * L.length)))], s0 + sc * .25]; };
    switch (e) {
      case E.ABETAIA: return q < .94 ? AB() : ['Pine_3', .9 + sc * .3];
      case E.FAGGETA: return q < .82 ? OAK(.72, [0, 1, 1, 6, 7]) : q < .92 ? ['Betulla_' + Math.floor(k * 3), .85 + sc * .25] : AB();
      case E.VALLONE: return q < .65 ? OAK(.8, [4, 0, 6, 1]) : AB();
      case E.PINETA: return q < .72 ? ['Pine_5', .9 + sc * .35] : ['Pine_2', .85 + sc * .3];
      case E.MACCHIA: return q < .8 ? [pk(['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5']), .26 + sc * .1] : ['Pine_5', .55 + sc * .2, -.12];
      case E.FARO: return ['Pine_5', .6 + sc * .25, -.18 - sc * .12];   // piegati dal vento di ponente
      case E.PASCOLO: return q < .4 ? [pk(['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_4']), .36 + sc * .12] : OAK(.85, [2, 5, 0]);
      case E.RADURA: case E.RUDERALE: return q < .75 ? OAK(.85, [0, 2, 6, 3]) : ['Betulla_' + Math.floor(k * 3), .9 + sc * .2];
      case E.RIPARIALE: return q < .55 ? OAK(.8, [4, 3]) : ['Betulla_' + Math.floor(k * 3), .8 + sc * .2];
      case E.BETULLE: return q < .9 ? ['Betulla_' + Math.floor(k * 3), .8 + sc * .35] : AB();
      case E.PINIMONTE: return [pk(['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4']), .85 + sc * .35];
      default: return natTree(tx, ty, r);
    }
  }
