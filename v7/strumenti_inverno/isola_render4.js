  // ================= [isola35] LA CITTÀ: SUOLO LEGGIBILE, NIENTE COMPENETRAZIONI, VERDE E COSE TROVATE PER CASO =================
  // Il suolo dice cosa è: asfalto scuro e consumato, marciapiede di lastre col cordolo di granito, vicoli di basoli storti con la
  // canaletta, cortili di terra battuta, erbacce, ciottoli vecchi. Le strisce pedonali solo agli incroci delle vie larghe.
  // Tutto quello che sta a terra poggia sulla quota vera (il marciapiede è alto 15 cm). Gli arredi dentro le case, sulla
  // carreggiata o uno dentro l'altro si tolgono. Poi il verde (alberi dove c'è posto, erbacce ai piedi dei muri, orti nei cortili)
  // e le cose con una storia: davanti al negozio le casse, davanti al bar le sedie e le casse di vuoti, sul retro i bidoni e il
  // pattume, nei cortili la roba vecchia, i cantieri fermi, le lampadine tese sui vicoli.
  let SWF35 = null, SWF35ok = false;
  function swField() {
    if (SWF35ok) return SWF35; SWF35ok = true;
    if (!M.roads || !M.zone) return null;
//@@SWBLOCK@@
    return (SWF35 = { R, NW, NH, H, m });
  }
  // altezza del marciapiede sopra il terreno in (x, z): 0 fuori, 0,15 sopra
  function swH(x, z) {
    const F = SWF35ok ? SWF35 : swField(); if (!F) return 0;
    const fx = x / F.R, fz = z / F.R, i = Math.floor(fx), j = Math.floor(fz); if (i < 0 || j < 0 || i >= F.NW - 1 || j >= F.NH - 1) return 0;
    const u = fx - i, v = fz - j, H = F.H, k = j * F.NW + i;
    return H[k] * (1 - u) * (1 - v) + H[k + 1] * u * (1 - v) + H[k + F.NW] * (1 - u) * v + H[k + F.NW + 1] * u * v;
  }

  // ---- texture a pattern allineate al mondo (niente cuciture fra i blocchi del terreno) ----
  const P35 = {};
  function patCanvas35(kind) {
    if (P35[kind]) return P35[kind];
    const S = 128, c = mk(S, S), x = c.getContext('2d'), r = rng(kind.length * 131 + 7);
    if (kind === 'asfalto') {   // 16 m: bitume scuro, inerti chiari, rattoppi, crepe, chiazze d'olio
      x.fillStyle = '#2c2928'; x.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) { const g = 38 + Math.floor(r() * 24); x.fillStyle = `rgb(${g + 2},${g},${g - 2})`; x.fillRect(Math.floor(r() * S), Math.floor(r() * S), 1, 1); }
      for (let i = 0; i < 7; i++) { x.fillStyle = r() < .5 ? 'rgba(22,20,20,.55)' : 'rgba(64,60,56,.35)'; const w = 6 + r() * 22, h = 4 + r() * 12; x.fillRect(r() * S, r() * S, w, h); }   // rattoppi
      for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(22,21,24,.7)'; x.lineWidth = 1; x.beginPath(); let px = r() * S, py = r() * S; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .5) * 14; py += (r() - .5) * 14; x.lineTo(px, py); } x.stroke(); }
      for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(16,14,18,.35)'; x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, 6.3); x.fill(); }   // olio
      for (let i = 0; i < 4; i++) { const cx = r() * S, cy = r() * S, rr = 2 + r() * 2.5; x.fillStyle = '#2a282b'; x.beginPath(); x.ellipse(cx, cy, rr, rr * .75, r() * 3, 0, 6.3); x.fill(); x.fillStyle = 'rgba(90,88,92,.5)'; x.fillRect(cx - rr, cy - rr * .8, rr, 1); }   // buche
    } else if (kind === 'basolato') {   // basoli di pietra lavica a correre, storti, consumati al centro
      x.fillStyle = '#2a2624'; x.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 5) { let px = -Math.floor(r() * 6); const ro = r() * 4; while (px < S) { const w = 5 + Math.floor(r() * 6); const g = 56 + Math.floor(r() * 24), t = Math.floor(r() * 10);
        x.fillStyle = `rgb(${g + t},${g - 4 + t / 2},${g - 10})`; x.fillRect(px + 1, y + 1, w - 1, 4); x.fillStyle = 'rgba(255,240,220,.07)'; x.fillRect(px + 1, y + 1, w - 1, 1); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(px + 1, y + 4, w - 1, 1); px += w + (ro > 3 ? 1 : 0); } }
      for (let i = 0; i < 70; i++) { x.fillStyle = pick(r, ['rgba(60,80,40,.55)', 'rgba(40,58,30,.5)']); x.fillRect(Math.floor(r() * S), Math.floor(r() * S / 5) * 5, 1 + Math.floor(r() * 2), 1); }   // muschio nei giunti
      for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(14,14,18,.32)'; x.beginPath(); x.ellipse(r() * S, r() * S, 3 + r() * 6, 2 + r() * 3, 0, 0, 6.3); x.fill(); }
    } else if (kind === 'lastre') {   // marciapiede: lastre di cemento da 50 cm (moltiplicate per il colore dei vertici)
      x.fillStyle = '#d8d4cc'; x.fillRect(0, 0, S, S);
      const q = S / 4;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const g = 200 + Math.floor(r() * 40); x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.fillRect(i * q + 1, j * q + 1, q - 2, q - 2);
        for (let k = 0; k < 40; k++) { const h = 170 + Math.floor(r() * 60); x.fillStyle = `rgba(${h},${h - 4},${h - 8},.6)`; x.fillRect(i * q + 1 + r() * (q - 2), j * q + 1 + r() * (q - 2), 1, 1); }
        if (r() < .22) { x.strokeStyle = 'rgba(80,76,70,.7)'; x.beginPath(); x.moveTo(i * q + r() * q, j * q); x.lineTo(i * q + r() * q, j * q + q); x.stroke(); }   // lastra crepata
        if (r() < .12) { x.fillStyle = 'rgba(70,90,50,.6)'; x.fillRect(i * q, j * q + r() * q, 2, 3); } }   // erbetta fra le lastre
      x.fillStyle = 'rgba(90,86,80,.85)'; for (let k = 0; k < 4; k++) { x.fillRect(k * q, 0, 1, S); x.fillRect(0, k * q, S, 1); }
      for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(40,36,34,.28)'; x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 6, 2 + r() * 4, 0, 0, 6.3); x.fill(); }   // macchie e gomme da masticare
      for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(30,30,30,.5)'; x.fillRect(r() * S, r() * S, 1, 1); }
    }
    return (P35[kind] = c);
  }
  function pat35(x, kind, X0, Y0) {   // pattern che ripete ogni 16 m di mondo
    const c = patCanvas35(kind), p = x.createPattern(c, 'repeat'), sc = 16 * PPM / c.width;
    try { p.setTransform(new DOMMatrix([sc, 0, 0, sc, -((X0 * PPM) % (16 * PPM)), -((Y0 * PPM) % (16 * PPM))])); } catch (e) {}
    return p;
  }
  function lastre35() {
    if (P35.__lt) return P35.__lt; const t = new THREE.CanvasTexture(patCanvas35('lastre')); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; return (P35.__lt = t);
  }
  // colore del marciapiede per vertice: canaletta scura in basso, cordolo di granito chiaro sul bordo, lastre in cima
  const _c35 = new THREE.Color(), _d35 = new THREE.Color();
  function colMarc35(c, top, n1, n2) {
    c.set('#7c756a').multiplyScalar(1 + n1 * .16 + n2 * .07);
    const curb = Math.max(0, 1 - Math.abs(top - .7) / .32); if (curb > 0) c.lerp(_c35.set('#a49e92'), curb * .8);
    if (top < .5) c.lerp(_d35.set('#3a3734'), (1 - top * 2) * .9);
    return c;
  }

  // ---- il suolo della città dove non è strada: terra battuta, ciottoli vecchi, cemento rotto, erbacce, orti ----
  function suolo35(x, px, py, P, tx, ty, r, v) {
    const T = G.T, wx = tx * TS, wy = ty * TS, S4 = P / 4;
    const nearB = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gT(tx + a, ty + b) === T.BLD);
    for (let sj = 0; sj < 4; sj++) for (let si = 0; si < 4; si++) {
      const X = wx + (si + .5) * .5, Y = wy + (sj + .5) * .5, k1 = vnz(X / 11, Y / 11) + vnz(X / 3.2, Y / 3.2) * .45, k2 = vnz(X / 7 + 40, Y / 7 + 40);
      // cosa c'è in questo mezzo metro: dipende dalla casella (cortile verde, terra, ciottolato) e da due rumori lisci
      let kind = v === T.GRASS ? (k1 > -.08 ? 'erba' : k1 > -.3 ? 'terra' : 'ghiaia') : v === T.DIRT ? (k1 > .25 ? 'erba' : 'terra') : (k1 > .22 ? 'cemento' : k1 > -.18 ? 'ciottoli' : k2 > .1 ? 'terra' : 'erba');
      if (nearB && v !== T.GRASS && k2 > -.2) kind = 'ciottoli';
      const sx = px + si * S4, sy = py + sj * S4;
      if (kind === 'ciottoli') { x.fillStyle = '#221f1d'; x.fillRect(sx, sy, S4, S4); for (let q = 0; q < 4; q++) { const g = 52 + Math.floor(r() * 22); x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.fillRect(sx + (q % 2) * 2, sy + Math.floor(q / 2) * 2, 2 - (r() < .3 ? 1 : 0), 2 - (r() < .2 ? 1 : 0)); } }
      else if (kind === 'cemento') { const g = 56 + Math.floor((k2 + .5) * 14); x.fillStyle = `rgb(${g},${g - 3},${g - 7})`; x.fillRect(sx, sy, S4, S4); if (r() < .3) { x.fillStyle = 'rgba(30,28,28,.6)'; x.fillRect(sx + Math.floor(r() * S4), sy, 1, S4); } }
      else if (kind === 'terra') { const g = Math.floor((k2 + .5) * 14); x.fillStyle = `rgb(${56 + g},${45 + g},${34 + g / 2})`; x.fillRect(sx, sy, S4, S4); if (r() < .4) { x.fillStyle = 'rgba(40,32,26,.55)'; x.fillRect(sx + Math.floor(r() * 3), sy + Math.floor(r() * 3), 2, 1); } }
      else if (kind === 'ghiaia') { x.fillStyle = '#4a453e'; x.fillRect(sx, sy, S4, S4); for (let q = 0; q < 3; q++) { x.fillStyle = pick(r, ['#7a746a', '#4a4640', '#8a8478']); x.fillRect(sx + Math.floor(r() * S4), sy + Math.floor(r() * S4), 1, 1); } }
      else { const g = Math.floor((k2 + .5) * 18); x.fillStyle = `rgb(${44 + g / 2},${58 + g},${32})`; x.fillRect(sx, sy, S4, S4); for (let q = 0; q < 3; q++) { x.fillStyle = pick(r, ['#6a7a40', '#48582e', '#7a7448', '#58682f']); x.fillRect(sx + Math.floor(r() * S4), sy + Math.floor(r() * S4), 1, 1 + Math.floor(r() * 2)); } }
    }
  }

  // ---- strisce pedonali: solo agli incroci fra vie larghe di città, su ogni braccio, appena fuori dall'incrocio ----
  let CW35 = null;
  function crossings35() {
    if (CW35) return CW35; CW35 = [];
    const urb = rd => rd.kind === 'citta' || rd.kind === 'litoranea', R = (M.roads || []).filter(urb);
    const nearRoad = (rd, x, y) => { const P = rd.pts; for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); if (Math.hypot(ax + dx * t - x, ay + dy * t - y) < rd.w / 2 + 1.5) return true; } return false; };
    junctions().forEach(([jx, jy, jr]) => {
      if (zoneT(Math.floor(jx / TS), Math.floor(jy / TS)) !== ZN.CITTA) return;
      if (R.filter(rd => nearRoad(rd, jx, jy)).length < 2) return;   // due vie larghe che si incontrano davvero
      armsAt(jx, jy, jr).forEach(a => { if (a.w < 6) return; CW35.push({ x: jx + a.ux * (jr + 1.4), y: jy + a.uy * (jr + 1.4), ux: a.ux, uy: a.uy, w: a.w, s: (Math.round(jx * 7 + jy * 3) >>> 0) }); });
    });
    return CW35;
  }
  function strisce35(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    crossings35().forEach(c => {
      if (c.x < X0 - 8 || c.x > X1 + 8 || c.y < Y0 - 8 || c.y > Y1 + 8) return;
      const r = rng(c.s), ang = Math.atan2(c.uy, c.ux);
      for (let o = -c.w / 2 + .6; o <= c.w / 2 - .6; o += 1) {
        const px = c.x - c.uy * o, py = c.y + c.ux * o;
        x.save(); x.translate((px - X0) * PPM, (py - Y0) * PPM); x.rotate(ang);
        for (let s = 0; s < 5; s++) { if (r() < .12) continue; x.fillStyle = `rgba(222,218,204,${.45 + r() * .35})`; x.fillRect((-1.25 + s * .5) * PPM, -.25 * PPM, .5 * PPM, .5 * PPM); }   // vernice consumata a pezzi
        x.restore();
      }
      // linea d'arresto sulla corsia che arriva
      x.save(); x.translate((c.x + c.ux * 1.8 - X0) * PPM, (c.y + c.uy * 1.8 - Y0) * PPM); x.rotate(ang); x.fillStyle = 'rgba(222,218,204,.5)'; x.fillRect(0, 0, .3 * PPM, c.w / 2 * PPM * .9); x.restore();
    });
  }

  // ---- sporco a terra: cicche, cartacce, macchie, foglie, vetri, più fitto vicino alle porte dei bar e agli angoli ----
  let DOORS35 = null;
  function doors35() { if (DOORS35) return DOORS35; DOORS35 = (G.BUILDINGS || []).filter(b => b.door).map(b => ({ x: (b.door[0] + .5) * TS, y: (b.door[1] + .5) * TS, bar: /bar|osteria|circolo|cinema|tabacchi/.test(b.id + ' ' + (b.use || '')) || (b.shop && /БАР|BAR/i.test((b.sign && b.sign.t) || '')), shop: !!b.shop })); return DOORS35; }
  function sporco35(x, tx0, ty0, n, m) {
    const T = G.T, X0 = tx0 * TS, Y0 = ty0 * TS;
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j; if (zoneT(tx, ty) !== ZN.CITTA) continue; const v = gT(tx, ty); if (v === T.BLD || v === T.WATER) continue;
      const r = rng((tx * 3301 + ty * 7717 + 35) >>> 0), wx = tx * TS + 1, wy = ty * TS + 1;
      let dirt = .12; for (const d of doors35()) { const q = Math.hypot(d.x - wx, d.y - wy); if (q < 6) dirt += (d.bar ? 1.1 : d.shop ? .5 : .25) * (1 - q / 6); }
      const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => gT(tx + a, ty + b) === T.BLD); if (wall) dirt += .25;
      const k = Math.min(9, Math.floor(dirt * 3 + r() * 1.5)), px = i * TP, py = j * TP;
      for (let q = 0; q < k; q++) { const u = px + r() * (TP - 2), w = py + r() * (TP - 2), t = r();
        if (t < .45) { x.fillStyle = r() < .7 ? 'rgba(220,206,176,.85)' : 'rgba(200,120,60,.85)'; x.fillRect(u, w, 1, 1); }   // cicca
        else if (t < .62) { x.fillStyle = pick(r, ['rgba(226,222,212,.8)', 'rgba(200,190,160,.75)', 'rgba(170,60,50,.7)', 'rgba(70,110,160,.7)']); x.fillRect(u, w, 2, 1 + (r() < .5 ? 1 : 0)); }   // cartaccia, pacchetto
        else if (t < .75) { x.fillStyle = 'rgba(26,22,22,.35)'; x.beginPath(); x.ellipse(u, w, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, 6.3); x.fill(); }   // macchia
        else if (t < .88) { x.fillStyle = pick(r, ['rgba(120,80,40,.8)', 'rgba(150,110,50,.75)', 'rgba(90,70,40,.7)']); x.fillRect(u, w, 1, 1); x.fillRect(u + 1, w + 1, 1, 1); }   // foglie secche
        else { x.fillStyle = pick(r, ['rgba(90,140,90,.8)', 'rgba(160,120,60,.8)', 'rgba(200,210,215,.8)']); x.fillRect(u, w, 1, 1); } }   // cocci di vetro
    }
  }

  // ---- il verde in città: alberi dove c'è spazio vero, cespugli e orti nei cortili, erbacce ai piedi dei muri ----
  let TREES35 = null;
  function alberiCitta35() {
    if (TREES35) return TREES35; TREES35 = [];
    const T = G.T, isB = (x, z) => gT(Math.floor(x / TS), Math.floor(z / TS)) === T.BLD;
    const roomy = (x, z, rad) => { for (let a = 0; a < 8; a++) { const q = a * .785; if (isB(x + Math.cos(q) * rad, z + Math.sin(q) * rad)) return false; } return !isB(x, z); };
    const onRoad = (x, z) => { const k = Math.floor(z / TS) * G.GW + Math.floor(x / TS); return RW[k] > 0 && gT(Math.floor(x / TS), Math.floor(z / TS)) === T.VIA; };
    (M.roads || []).filter(rd => rd.kind === 'citta' || rd.kind === 'litoranea').forEach((rd, ri) => {
      let acc = 0, next = 6 + th(ri, 0, 351) * 8; const P = rd.pts;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az) || 1; acc += L; if (acc < next) continue; acc = 0; next = 9 + th(ri, k, 352) * 7;
        const nx = -(bz - az) / L, nz = (bx - ax) / L;
        [-1, 1].forEach(sd => { const x = ax + nx * sd * (rd.w / 2 + 1.25), z = az + nz * sd * (rd.w / 2 + 1.25);
          if (zoneT(Math.floor(x / TS), Math.floor(z / TS)) !== ZN.CITTA || onRoad(x, z) || nearJ(x, z, 4) || !roomy(x, z, 2.6)) return;
          if (th(Math.round(x), Math.round(z), 353) < .3) return;
          TREES35.push({ x, z, kind: 'viale', s: .3 + th(Math.round(x), Math.round(z), 354) * .08 }); });
      }
    });
    // un albero nelle piazzette e negli slarghi, uno ogni tanto nei cortili grandi
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (zoneT(tx, ty) !== ZN.CITTA) continue; const v = gT(tx, ty); if (v !== T.PIAZZA && v !== T.GRASS) continue;
      if (th(tx, ty, 355) > (v === T.PIAZZA ? .04 : .022)) continue;
      const x = tx * TS + 1, z = ty * TS + 1; if (onRoad(x, z) || !roomy(x, z, 3) || TREES35.some(t => Math.hypot(t.x - x, t.z - z) < 7)) continue;
      TREES35.push({ x, z, kind: v === T.PIAZZA ? 'piazza' : 'cortile', s: .34 + th(tx, ty, 356) * .1 });
    }
    return TREES35;
  }
  function verdeCitta35(add, tx0, ty0, n, m) {
    const T = G.T, X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    const LEAF = ['#e8f0e0', '#f4f2e4', '#e0ead8', '#fff8e8', '#f0e8c8'];
    alberiCitta35().forEach(t => { if (t.x < X0 || t.x >= X1 || t.z < Y0 || t.z >= Y1) return; const r = rng((Math.round(t.x * 13) + Math.round(t.z * 7)) >>> 0);
      const name = t.kind === 'cortile' && r() < .35 ? pick(r, NM.olive) : t.kind === 'viale' && r() < .2 ? pick(r, NM.bare) : pick(r, NM.oak);
      add(name, t.x, groundH(t.x, t.z) - .05, t.z, (/Twisted/.test(name) ? .22 : /Dead/.test(name) ? .26 : t.s) * (.92 + r() * .16), r() * 6.28, { rx: (r() - .5) * .05, rz: (r() - .5) * .05, col: pick(r, LEAF) });
      if (t.kind !== 'viale') for (let q = 0; q < 3; q++) add(q ? 'Grass_Common_Tall' : 'Bush_Common', t.x + (r() - .5) * 2.4, 0, t.z + (r() - .5) * 2.4, q ? .7 + r() * .4 : .45 + r() * .2, r() * 6.28, { ground: true, col: pick(r, LEAF) }); });
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j; if (zoneT(tx, ty) !== ZN.CITTA) continue; const v = gT(tx, ty); if (v === T.BLD || v === T.WATER || v === T.VIA || v === T.QUAY) continue;
      const r = rng((tx * 6151 + ty * 2399 + 35) >>> 0), walls = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => gT(tx + a, ty + b) === T.BLD);
      // erbacce e ciuffi ai piedi dei muri, dove non passa nessuno
      walls.forEach(([a, b]) => { if (r() > (v === T.WALK ? .3 : .55)) return; const u = (r() - .5) * 1.6, x = tx * TS + 1 + a * .78 + (a ? 0 : u), z = ty * TS + 1 + b * .78 + (b ? 0 : u);
        const q = r(); add(q < .5 ? 'Grass_Wispy_Short' : q < .8 ? 'Grass_Common_Tall' : 'Plant_1', x, 0, z, q < .5 ? .9 + r() * .5 : q < .8 ? .45 + r() * .3 : .35 + r() * .2, r() * 6.28, { ground: true, col: pick(r, LEAF) }); });
      // cortili e orti: cespugli, felci, piante grandi; più fitto lontano dalle porte
      if (v === T.GRASS) { const k = 1 + Math.floor(r() * 3); for (let q = 0; q < k; q++) { const x = tx * TS + .3 + r() * 1.4, z = ty * TS + .3 + r() * 1.4, w = r();
          if (walls.length > 1 && w < .3) continue;
          add(w < .3 ? 'Bush_Common' : w < .55 ? 'Grass_Common_Tall' : w < .75 ? 'Fern_1' : w < .9 ? 'Plant_7_Big' : 'Plant_1_Big', x, 0, z, w < .3 ? .4 + r() * .25 : w < .55 ? .6 + r() * .4 : w < .75 ? .3 + r() * .15 : .28 + r() * .14, r() * 6.28, { ground: true, col: pick(r, LEAF) }); } }
      else if (v === T.DIRT && r() < .4) add('Grass_Wispy_Short', tx * TS + r() * 2, 0, ty * TS + r() * 2, .8 + r() * .5, r() * 6.28, { ground: true, col: '#f0e4c0' });
      else if (v === T.COB && !walls.length && r() < .18) add(r() < .6 ? 'Grass_Wispy_Short' : 'Plant_1', tx * TS + r() * 2, 0, ty * TS + r() * 2, .5 + r() * .4, r() * 6.28, { ground: true, col: pick(r, LEAF) });
    }
  }

  // ---- pulizia: gli arredi a terra non stanno dentro le case, sulla carreggiata, nei vicoli stretti o uno dentro l'altro ----
  function propGone35(rec) {   // prima della fusione la geometria è ancora nei secchi: la si schiaccia lì
    const t = TAGS.get(rec.tag); if (t) t.parts.forEach(p => { if (p.b.mesh) return; const g = p.b.geos[p.gi]; if (!g) return; const a = g.attributes.position.array; for (let k = 0; k < a.length; k += 3) { a[k] = 0; a[k + 1] = -80; a[k + 2] = 0; } });
    hideTag(rec.tag); rec.state = 2; rec.gone35 = true;
    if (rec.hk !== undefined) { const a = DZ.hash.get(rec.hk); if (a) { const i = a.indexOf(rec); if (i >= 0) a.splice(i, 1); } }
  }
  function pulizia35() {
    const T = G.T, BB = (G.BUILDINGS || []).map(b => [b.x * TS, b.y * TS, (b.x + b.w) * TS, (b.y + b.h) * TS]);
    const BH = new Map(), bk = (i, j) => i * 4096 + j; BB.forEach((q, k) => { for (let i = Math.floor(q[0] / 8); i <= Math.floor(q[2] / 8); i++) for (let j = Math.floor(q[1] / 8); j <= Math.floor(q[3] / 8); j++) { const kk = bk(i, j); let a = BH.get(kk); if (!a) BH.set(kk, a = []); a.push(q); } });
    const inHouse = (x0, z0, x1, z1) => { const a = BH.get(bk(Math.floor((x0 + x1) / 16), Math.floor((z0 + z1) / 16))) || []; return a.some(q => Math.min(x1, q[2]) - Math.max(x0, q[0]) > .25 && Math.min(z1, q[3]) - Math.max(z0, q[1]) > .25); };
    const SEG = new Map(); (M.roads || []).forEach(rd => { if (!(rd.kind === 'citta' || rd.kind === 'vicolo')) return; const P = rd.pts; for (let k = 0; k < P.length - 1; k++) { const kk = bk(Math.floor(P[k][0] / 8), Math.floor(P[k][1] / 8)); let a = SEG.get(kk); if (!a) SEG.set(kk, a = []); a.push([P[k][0], P[k][1], P[k + 1][0], P[k + 1][1], rd.w / 2 - (rd.kind === 'vicolo' ? .35 : .15)]); } });
    const onCarr = (x, z, rad) => { const i0 = Math.floor(x / 8), j0 = Math.floor(z / 8); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (const s of SEG.get(bk(i, j)) || []) { const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)); if (Math.hypot(s[0] + dx * t - x, s[1] + dz * t - z) < s[4] + rad * .5) return true; } return false; };
    let gone = 0; const kept = [], KH = new Map();
    DZ.props.slice().sort((a, b) => (b.he.x * b.he.z) - (a.he.x * a.he.z)).forEach(rec => {
      if (rec.gone35 || rec.state !== 0) return;
      const c = rec.c, hx = rec.he.x * .85, hz = rec.he.z * .85, gy = groundH(c.x, c.z);
      if (rec.base > gy + .6 || zoneT(Math.floor(c.x / TS), Math.floor(c.z / TS)) !== ZN.CITTA) return;   // solo quello che sta a terra in città
      if (inHouse(c.x - hx, c.z - hz, c.x + hx, c.z + hz) || onCarr(c.x, c.z, Math.min(hx, hz))) { propGone35(rec); gone++; return; }
      const i0 = Math.floor(c.x / 4), j0 = Math.floor(c.z / 4); let hit = false;
      for (let i = i0 - 1; i <= i0 + 1 && !hit; i++) for (let j = j0 - 1; j <= j0 + 1 && !hit; j++) for (const o of KH.get(bk(i, j)) || []) if (Math.abs(o.c.x - c.x) < o.he.x * .85 + hx && Math.abs(o.c.z - c.z) < o.he.z * .85 + hz) { hit = true; break; }
      if (hit) { propGone35(rec); gone++; return; }
      kept.push(rec); const kk = bk(i0, j0); let a = KH.get(kk); if (!a) KH.set(kk, a = []); a.push(rec);
    });
    OCC35.seed(kept); if (window.__dbg35) console.log('oggetti35 pulizia: tolti', gone, 'tenuti', kept.length);
    return gone;
  }
  // occupazione a mezzo metro per gli oggetti nuovi: niente sopra gli arredi tenuti, le case, la carreggiata
  const OCC35 = { g: new Map(), seed(list) { list.forEach(rec => this.mark(rec.c.x, rec.c.z, rec.he.x + .2, rec.he.z + .2)); },
    key: (i, j) => i * 8192 + j,
    mark(x, z, hx, hz) { for (let i = Math.floor((x - hx) / .5); i <= Math.floor((x + hx) / .5); i++) for (let j = Math.floor((z - hz) / .5); j <= Math.floor((z + hz) / .5); j++) this.g.set(this.key(i, j), 1); },
    free(x, z, hx, hz) { for (let i = Math.floor((x - hx) / .5); i <= Math.floor((x + hx) / .5); i++) for (let j = Math.floor((z - hz) / .5); j <= Math.floor((z + hz) / .5); j++) { if (this.g.has(this.key(i, j))) return false; const tx = Math.floor(i * .5 / TS), ty = Math.floor(j * .5 / TS), v = gT(tx, ty); if (v === G.T.BLD || v === G.T.WATER || v === G.T.FOUNT || (v === G.T.VIA && RW[ty * G.GW + tx] > 0)) return false; } return true; } };

  // ================= LE COSE TROVATE PER CASO, MA CON UNA LOGICA =================
  const O35 = {};
  const m35 = (c, o) => sm(c, Object.assign({ roughness: .95 }, o || {}));
  function cardTex35(kind) {   // etichette e scritte delle cose: cartone, sacco di cemento, bombola, cassetta della birra
    const key = 'o35' + kind; if (I32.tex[key]) return I32.tex[key];
    return tex32(key, 32, 32, (x, r) => {
      if (kind === 'cartone') { x.fillStyle = '#a07a50'; x.fillRect(0, 0, 32, 32); x.fillStyle = 'rgba(80,56,30,.5)'; x.fillRect(0, 15, 32, 2); x.fillStyle = 'rgba(40,30,20,.6)'; x.font = 'bold 7px sans-serif'; x.fillText(pick(r, ['FRAGILE', 'ТОВАР', '↑↑', 'МЫЛО', 'CONSERVE']), 3, 10); for (let k = 0; k < 20; k++) { x.fillStyle = 'rgba(60,40,20,.25)'; x.fillRect(r() * 32, r() * 32, 2, 1); } }
      else if (kind === 'cemento') { x.fillStyle = '#c8c4b8'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#b02a22'; x.fillRect(0, 10, 32, 6); x.fillStyle = '#f0ece0'; x.font = 'bold 6px sans-serif'; x.fillText('ЦЕМЕНТ', 3, 15); x.fillStyle = 'rgba(90,86,80,.4)'; for (let k = 0; k < 30; k++) x.fillRect(r() * 32, r() * 32, 1, 1); }
      else if (kind === 'birra') { x.fillStyle = '#2a5a3a'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#e8d8a0'; x.font = 'bold 8px sans-serif'; x.fillText('ПИВО', 4, 19); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, 26, 32, 6); }
      else if (kind === 'lavori') { x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#a82a22'; x.fillRect(0, 0, 32, 5); x.fillRect(0, 27, 32, 5); x.fillStyle = '#1a1a1a'; x.font = 'bold 6px sans-serif'; x.fillText('ЛАВОРИ', 3, 15); x.fillText('ЗАКРЫТО', 2, 23); }
      else if (kind === 'righe') { for (let k = -32; k < 64; k += 8) { x.fillStyle = '#d8b030'; x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 4, 0); x.lineTo(k + 36, 32); x.lineTo(k + 32, 32); x.fill(); x.fillStyle = '#1a1a1a'; x.beginPath(); x.moveTo(k + 4, 0); x.lineTo(k + 8, 0); x.lineTo(k + 40, 32); x.lineTo(k + 36, 32); x.fill(); } x.fillStyle = 'rgba(60,40,30,.3)'; for (let k = 0; k < 40; k++) x.fillRect(r() * 32, r() * 32, 2, 1); }
      else if (kind === 'rete') { x.clearRect(0, 0, 32, 32); x.strokeStyle = '#8a8c88'; x.lineWidth = 1; for (let k = 0; k < 32; k += 4) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 32); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(32, k); x.stroke(); } }
    });
  }
  // pezzi piccoli: tutti in metri, con la base a terra
  const B35 = {
    cassa(g, x, z, ry, col, full) { const w = sm(col || '#8a6440'); add(g, box(.55, .05, .38, w), x, .02, z, 0, ry, 0); [-1, 1].forEach(s => { add(g, box(.55, .26, .03, w), x + Math.sin(ry) * s * .18, .16, z + Math.cos(ry) * s * .18, 0, ry, 0); }); [-1, 1].forEach(s => add(g, box(.03, .26, .36, w), x + Math.cos(ry) * s * .26, .16, z - Math.sin(ry) * s * .26, 0, ry, 0));
      if (full) { const q = rng(Math.round(x * 31 + z * 17) >>> 0); for (let k = 0; k < 6; k++) add(g, new THREE.IcosahedronGeometry ? new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), sm(full)) : box(.1, .1, .1, sm(full)), x + (q() - .5) * .4, .26, z + (q() - .5) * .25); } },
    cartone(g, x, z, ry, s, open) { s = s || 1; const m = std({ map: cardTex35('cartone'), roughness: 1 }); add(g, box(.5 * s, .36 * s, .4 * s, m), x, .18 * s, z, 0, ry, 0); if (open) { add(g, box(.5 * s, .02, .2 * s, m), x + Math.sin(ry) * .28 * s, .4 * s, z + Math.cos(ry) * .28 * s, -.9, ry, 0); } },
    sacco(g, x, z, ry, col) { const geo = new THREE.IcosahedronGeometry(.32, 1); geo.scale(1, .78, .9); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, Math.max(y, -.18)); if (y > .15) { p.setX(i, p.getX(i) * .5); p.setZ(i, p.getZ(i) * .5); } } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, sm(col || '#1a1a1e', { roughness: .45, metalness: .1 })); m.scale.setScalar(.9 + (x * 7 % 1) * .3); add(g, m, x, .2, z, 0, ry, 0); add(g, box(.06, .08, .06, sm('#e8e2d0')), x, .44, z); },
    bidone(g, x, z, ry, col) { const m = sm(col || '#3a5a3e', { roughness: .7, metalness: .3 }); add(g, cyl(.32, .28, .9, 10, m), x, .45, z); add(g, cyl(.35, .35, .07, 10, m), x + .05, .93, z, .12, 0, 0); },
    pallet(g, x, z, ry, n) { const w = sm('#9a7a50'); for (let q = 0; q < (n || 1); q++) { const y = q * .14; [-.5, 0, .5].forEach(o => add(g, box(.1, .1, 1.2, w), x + Math.cos(ry) * o, y + .05, z - Math.sin(ry) * o, 0, ry, 0)); for (let k = 0; k < 5; k++) add(g, box(1.2, .025, .14, w), x + Math.sin(ry) * (k - 2) * .26, y + .115, z + Math.cos(ry) * (k - 2) * .26, 0, ry, 0); } },
    gomma(g, x, z, y, tilt) { const t = new THREE.Mesh(new THREE.TorusGeometry(.3, .11, 6, 12), sm('#1c1c1e', { roughness: .9 })); add(g, t, x, (y || 0) + (tilt ? .32 : .11), z, tilt ? .2 : Math.PI / 2, 0, tilt || 0); },
    fusto(g, x, z, col, down) { const m = sm(col || '#3a4a6a', { roughness: .6, metalness: .4 }); if (down) add(g, cyl(.29, .29, .88, 12, m), x, .29, z, 0, 0, Math.PI / 2); else { add(g, cyl(.29, .29, .88, 12, m), x, .44, z); add(g, cyl(.3, .3, .04, 12, m), x, .2, z); add(g, cyl(.3, .3, .04, 12, m), x, .66, z); } },
    bombola(g, x, z, col) { const m = sm(col || '#c84a2a', { roughness: .5, metalness: .3 }); add(g, cyl(.15, .15, .55, 10, m), x, .28, z); add(g, new THREE.Mesh(new THREE.SphereGeometry(.15, 10, 5, 0, 6.3, 0, 1.6), m), x, .55, z); add(g, cyl(.04, .04, .1, 6, sm('#8a8a80', { metalness: .6 })), x, .72, z); },
    sedia(g, x, z, ry, col, down) { const m = sm(col || '#e8e4dc', { roughness: .5 }); const s = G0(); add(s, box(.42, .04, .42, m), 0, .44, 0); add(s, box(.42, .4, .04, m), 0, .66, -.2, -.1, 0, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => add(s, cyl(.02, .02, .44, 5, m), a * .18, .22, b * .18)); s.position.set(x, down ? .21 : 0, z); s.rotation.set(down ? -1.5 : 0, ry, 0); g.add(s); },
    tavolino(g, x, z, col) { const m = sm(col || '#e8e4dc', { roughness: .5 }); add(g, cyl(.38, .38, .03, 14, m), x, .72, z); add(g, cyl(.03, .03, .72, 6, m), x, .36, z); add(g, cyl(.22, .26, .04, 10, m), x, .02, z); },
    vaso(g, x, z, h, leaf) { const t = sm('#9a4a30', { roughness: .9 }); h = h || .32; add(g, cyl(h * .55, h * .4, h, 9, t), x, h / 2, z); const p = new THREE.Mesh(new THREE.IcosahedronGeometry(h * .7, 0), sl(leaf || '#3f6a35')); p.scale.set(1, 1.1, 1); add(g, p, x, h + h * .5, z); },
    bici(g, x, z, ry) { const m = sm('#5a2a24', { roughness: .5, metalness: .4 }), tk = sm('#1a1a1c'); const s = G0(); [-.5, .5].forEach(o => add(s, new THREE.Mesh(new THREE.TorusGeometry(.32, .025, 5, 14), tk), o, .34, 0)); add(s, box(.9, .03, .03, m), 0, .5, 0, 0, 0, -.2); add(s, box(.03, .5, .03, m), -.1, .55, 0, 0, 0, .25); add(s, box(.03, .45, .03, m), .45, .6, 0, 0, 0, -.2); add(s, box(.22, .04, .1, tk), -.18, .82, 0); add(s, box(.04, .04, .45, m), .4, .85, 0);
      s.position.set(x, 0, z); s.rotation.set(0, ry, .32); g.add(s); },
    poltrona(g, x, z, ry, col) { const m = sm(col || '#8a2a24', { roughness: 1 }), s = G0(); add(s, box(.8, .4, .75, m), 0, .25, 0); add(s, box(.8, .55, .2, m), 0, .65, -.3, -.15, 0, 0); [-1, 1].forEach(q => add(s, box(.16, .35, .75, m), q * .38, .55, 0)); add(s, box(.7, .1, .55, sm(shade(col || '#8a2a24', .8))), 0, .5, .05); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); },
    tv(g, x, z, ry) { const s = G0(); add(s, box(.55, .45, .45, sm('#3a3632', { roughness: .6 })), 0, .23, 0); add(s, box(.42, .32, .02, sm('#1e2a2a', { roughness: .2, metalness: .3 })), 0, .25, .23); s.position.set(x, 0, z); s.rotation.set(0, ry, (x * 3 % 1) < .3 ? .4 : 0); g.add(s); },
    frigo(g, x, z, ry, down) { const s = G0(), m = sm('#d8d4c8', { roughness: .5 }); add(s, box(.6, 1.5, .6, m), 0, .75, 0); add(s, box(.03, .4, .04, sm('#8a8a8a')), .25, 1.05, .31); add(s, box(.6, .02, .62, sm('#a8a49a')), 0, .95, 0); s.position.set(x, down ? .3 : 0, z); s.rotation.set(down ? -Math.PI / 2 : 0, ry, 0); g.add(s); },
    lattina(g, x, z, col) { const m = sm(col || '#b03028', { roughness: .4, metalness: .6 }); add(g, cyl(.035, .035, .12, 7, m), x, .035, z, 0, 0, Math.PI / 2); },
    bottiglia(g, x, z, col, up) { const m = sm(col || '#2a5a2a', { roughness: .2, metalness: .1, transparent: true, opacity: .85 }); const s = G0(); add(s, cyl(.04, .04, .2, 7, m), 0, .1, 0); add(s, cyl(.015, .04, .1, 7, m), 0, .25, 0); s.position.set(x, up ? 0 : .04, z); s.rotation.set(up ? 0 : Math.PI / 2, (x * 13) % 6, 0); g.add(s); },
    bicchiere(g, x, z) { add(g, cyl(.045, .035, .12, 8, sm('#e8e2d4', { roughness: .6 })), x, .045, z, 0, 0, Math.PI / 2); },
    tubo(g, x, z, ry, r0, L) { const m = sm('#8a8680', { roughness: 1, side: THREE.DoubleSide }); const t = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, L, 14, 1, true), m); add(g, t, x, r0, z, 0, ry, Math.PI / 2); const rim = new THREE.Mesh(new THREE.TorusGeometry(r0 - .04, .05, 5, 14), m); add(g, rim, x + Math.cos(ry) * L / 2, r0, z - Math.sin(ry) * L / 2, 0, ry + Math.PI / 2, 0); },
    bobina(g, x, z, ry) { const w = sm('#8a6a44'); [-1, 1].forEach(s => add(g, cyl(.5, .5, .05, 14, w), x + Math.cos(ry) * s * .3, .5, z - Math.sin(ry) * s * .3, 0, 0, Math.PI / 2).rotation.set(0, ry, Math.PI / 2)); add(g, cyl(.38, .38, .56, 14, sm('#a8342a', { roughness: .6 })), x, .5, z).rotation.set(0, ry, Math.PI / 2); },
    mattoni(g, x, z, ry) { B35.pallet(g, x, z, ry, 1); const m = sm('#9a5a40', { roughness: 1 }); for (let k = 0; k < 4; k++) add(g, box(1, .2, .9, m), x, .24 + k * .21, z, 0, ry + (k % 2) * .03, 0); add(g, box(1.02, .02, .92, sm('#d8d4c8', { transparent: true, opacity: .5 })), x, 1.08, z, 0, ry, 0); },
    sacchiCemento(g, x, z, ry) { B35.pallet(g, x, z, ry, 1); const m = std({ map: cardTex35('cemento'), roughness: 1 }); for (let k = 0; k < 7; k++) add(g, box(.55, .13, .38, m), x + Math.cos(ry) * ((k % 2) - .5) * .58 + Math.sin(ry) * (Math.floor(k / 2) % 3 - 1) * .38, .2 + Math.floor(k / 6) * .13, z - Math.sin(ry) * ((k % 2) - .5) * .58 + Math.cos(ry) * (Math.floor(k / 2) % 3 - 1) * .38, 0, ry + (k * .13 % .2), 0); },
    rete(g, x, z, ry, L) { const fm = new THREE.MeshStandardMaterial({ map: cardTex35('rete'), transparent: true, alphaTest: .4, side: THREE.DoubleSide, roughness: .6, metalness: .4 }); cardTex35('rete').repeat && 0;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(L, 1.9), fm); add(g, p, x, 1.05, z, 0, ry, 0); const ft = sm('#8a8c88', { metalness: .5, roughness: .5 }); [-1, 1].forEach(s => { add(g, box(.04, 1.95, .04, ft), x + Math.cos(ry) * s * L / 2, 1.05, z - Math.sin(ry) * s * L / 2); add(g, box(.6, .14, .22, sm('#5a5a5c')), x + Math.cos(ry) * s * L / 2, .07, z - Math.sin(ry) * s * L / 2, 0, ry, 0); }); },
    pannello(g, x, z, ry, L) { const m = std({ map: cardTex35('righe'), roughness: .8 }); add(g, box(L, 1.1, .05, m), x, .62, z, 0, ry, 0); [-1, 1].forEach(s => add(g, box(.5, .1, .25, sm('#2a2a2c')), x + Math.cos(ry) * s * L * .4, .05, z - Math.sin(ry) * s * L * .4, 0, ry, 0)); },
    cesso(g, x, z, ry) { const s = G0(), m = sm('#2a5aa0', { roughness: .5 }); add(s, box(1.1, 2.2, 1.1, m), 0, 1.1, 0); add(s, box(1.16, .1, 1.16, sm('#e8e8e4')), 0, 2.25, 0); add(s, box(.7, 1.8, .02, sm('#24508a')), 0, 1, .56); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s); },
    torre(g, x, z, ry) { const y = sm('#d0a028', { roughness: .6 }), d = sm('#2a2a2c'); add(g, box(1.4, .9, .9, y), x, .5, z, 0, ry, 0); add(g, cyl(.05, .07, 4.4, 6, d), x, 2.6, z); add(g, box(1.2, .1, .1, d), x, 4.8, z, 0, ry, 0); [-1, 1].forEach(s => add(g, box(.4, .3, .2, sm('#e8e4d4', { emissive: '#3a3020' })), x + Math.cos(ry) * s * .4, 4.7, z - Math.sin(ry) * s * .4, 0, ry, 0)); },
  };
  // un oggetto del kit, scalato per altezza o per lato
  function kit35(name, size, byH) { if (!Kit.has || !Kit.has(name)) return null; const o = Kit.get(name); o.updateMatrixWorld(true); const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); return kp(name, size / Math.max(byH ? s.y : Math.max(s.x, s.z), .01)); }
  function oggetti35() {
    const T = G.T, r = rng(3535); let n = 0;
    const city = (x, z) => zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.CITTA;
    // mette un gruppo se il suo ingombro (hx, hz) è libero; gira il gruppo con ry
    const put = (g, x, z, ry, hx, hz) => { const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), ex = hx * c + hz * s, ez = hx * s + hz * c; if (!city(x, z) || !OCC35.free(x, z, ex, ez)) return false; OCC35.mark(x, z, ex, ez); place(g, x, z, ry); n++; return true; };
    // davanti alla porta: dove guarda la facciata (dalla casa verso la porta) e a che lato si sta
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (!b.door || b.gov || b.shack || b.tower || zoneT(b.door[0], b.door[1]) !== ZN.CITTA) return;
      const cx = (b.x + b.w / 2) * TS, cz = (b.y + b.h / 2) * TS, dx0 = (b.door[0] + .5) * TS, dz0 = (b.door[1] + .5) * TS;
      let fx = dx0 - cx, fz = dz0 - cz; if (Math.abs(fx) / b.w > Math.abs(fz) / b.h) { fx = Math.sign(fx); fz = 0; } else { fz = Math.sign(fz); fx = 0; }
      const tx = -fz, tz = fx, ry = Math.atan2(fx, fz), rb = rng(bi * 7919 + 35);   // lungo la facciata: (tx, tz)
      const wall = fx ? (fx > 0 ? (b.x + b.w) * TS : b.x * TS) : (fz > 0 ? (b.y + b.h) * TS : b.y * TS);
      const at = (u, off) => fx ? [wall + fx * off, dz0 + tz * u] : [dx0 + tx * u, wall + fz * off];   // u lungo il muro, off dal muro
      const id = b.id + ' ' + (b.use || ''), bar = /bar|osteria|circolo|cinema|tabacchi/.test(id), food = /wu|alimentar|panett|pescher|forno|frutt|mercat/.test(id) || (b.shop && /식료품|ТОВАР|ПРОДУКТ/.test((b.sign && b.sign.t) || '')), off = /officin|ferrament|garage|meccan/.test(id);
      const side = rb() < .5 ? -1 : 1;
      if (bar) {   // il bar: due tavolini di plastica, le sedie storte, le casse dei vuoti accatastate, cicche e bottiglie
        for (let k = 0; k < 2; k++) { const [x, z] = at(side * (1.6 + k * 1.6), 1.3); const g = G0(); B35.tavolino(g, 0, 0, pick(rb, ['#e8e4dc', '#c8302a', '#2a5a8a'])); B35.sedia(g, -.55, .1, 1.2 + rb(), '#e8e4dc'); B35.sedia(g, .5, -.1, -1.6 + rb(), '#e8e4dc', rb() < .15); if (rb() < .7) B35.bottiglia(g, .1, 0, '#3a2a14', true); put(g, x, z, ry + rb() * .3, .9, .7); }
        { const [x, z] = at(-side * 1.4, .45); const g = G0(); const bm = std({ map: cardTex35('birra'), roughness: .7 }); for (let k = 0; k < 4 + Math.floor(rb() * 4); k++) add(g, box(.42, .28, .32, bm), (k % 2) * .05 - .02, .14 + k * .29 * .5 * (k % 2 ? 1 : 1), Math.floor(k / 2) * .02, 0, rb() * .2, 0).position.y = .14 + Math.floor(k / 2) * .29; for (let k = 0; k < 3; k++) B35.bottiglia(g, .4 + rb() * .5, .3 + rb() * .3, pick(rb, ['#2a5a2a', '#3a2a14', '#5a6a6a'])); put(g, x, z, ry, .45, .45); }
      } else if (food && b.shop) {   // alimentari: casse di frutta fuori, i cartoni vuoti accatastati di lato, un sacco
        const [x, z] = at(side * 1.5, .6); const g = G0(); for (let k = 0; k < 3; k++) B35.cassa(g, (k - 1) * .6, 0, 0, '#8a6440', pick(rb, ['#c43c32', '#e8a030', '#d8c840', '#5a8a3a'])); B35.cassa(g, 0, 0, 0, '#7a5a3a'); g.children.slice(-5).forEach(o => o.position.y += .3); put(g, x, z, ry, 1, .35);
        const [x2, z2] = at(-side * 1.6, .45); const g2 = G0(); B35.cartone(g2, 0, 0, .2, 1); B35.cartone(g2, .1, 0, -.1, .85); g2.children[g2.children.length - 1].position.y += .36; B35.cartone(g2, .55, .1, .6, .9, true); put(g2, x2, z2, ry, .6, .35);
      } else if (off) {   // officina o ferramenta: pila di gomme, fusto dell'olio, taniche
        const [x, z] = at(side * 1.7, .6); const g = G0(); for (let k = 0; k < 4; k++) B35.gomma(g, 0, 0, k * .22); B35.gomma(g, .75, .1, 0, .3); B35.fusto(g, -.8, 0, '#2a3a5a'); put(g, x, z, ry, 1.2, .45);
      } else if (b.shop) {   // un'altra bottega: la cassetta della frutta per le piante, la sedia del padrone
        const [x, z] = at(side * 1.4, .5); const g = G0(); B35.sedia(g, 0, 0, 0, pick(rb, ['#5a4a3a', '#e8e4dc', '#2a4a6a'])); if (rb() < .6) B35.vaso(g, .6, 0, .3); put(g, x, z, ry, .6, .35);
      } else {   // casa: i vasi ai lati della porta, la bici appoggiata, la bombola, la sedia di chi si siede al sole
        const k = rb();
        if (k < .55) { [-1, 1].forEach(s => { if (rb() < .25) return; const [x, z] = at(s * (.95 + rb() * .2), .3); const g = G0(); B35.vaso(g, 0, 0, .26 + rb() * .16, pick(rb, ['#3f6a35', '#4f7e3a', '#5a7a3a', '#6a5a3a'])); put(g, x, z, ry, .22, .22); }); }
        if (k > .3 && rb() < .4) { const [x, z] = at(side * (1.6 + rb()), .32); const g = G0(); B35.bici(g, 0, 0, Math.PI / 2); put(g, x, z, ry, .65, .2); }
        else if (rb() < .25) { const [x, z] = at(side * 1.3, .3); const g = G0(); B35.bombola(g, 0, 0, pick(rb, ['#c84a2a', '#4a6a8a', '#a8a8a0'])); put(g, x, z, ry, .2, .2); }
        else if (rb() < .2) { const [x, z] = at(side * 1.3, .45); const g = G0(); B35.sedia(g, 0, 0, Math.PI, pick(rb, ['#5a4a3a', '#7a6a50'])); put(g, x, z, ry, .3, .3); }
      }
    });
    // sul retro e sui fianchi delle case: il punto dei bidoni (sempre all'angolo, vicino a una strada) e la roba vecchia nei cortili
    let bins = 0;
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (b.gov || b.shack || zoneT(b.x, b.y) !== ZN.CITTA) return; const rr = rng(bi * 4111 + 35); if (rr() > .3) return;
      const dside = b.door ? (b.door[1] < b.y ? 0 : b.door[0] >= b.x + b.w ? 1 : b.door[1] >= b.y + b.h ? 2 : 3) : -1;
      const sides = [0, 1, 2, 3].filter(k => k !== dside).sort(() => rr() - .5);
      for (const k of sides) {
        const fx = k === 1 ? 1 : k === 3 ? -1 : 0, fz = k === 2 ? 1 : k === 0 ? -1 : 0, ry = Math.atan2(fx, fz);
        const u = rr() < .5 ? .25 : .75, tx = fx ? (fx > 0 ? b.x + b.w : b.x - 1) : Math.floor(b.x + b.w * u), ty = fz ? (fz > 0 ? b.y + b.h : b.y - 1) : Math.floor(b.y + b.h * u);
        if (gT(tx, ty) === T.BLD || gT(tx, ty) === T.WATER) continue;
        if (![[0, 0], [fx, fz], [fx * 2, fz * 2]].some(([a, c]) => RW[(ty + c) * G.GW + tx + a] > 0)) continue;   // ci passa il camion: vicino a una strada
        const x = fx ? (fx > 0 ? (b.x + b.w) * TS + .85 : b.x * TS - .85) : (tx + .5) * TS, z = fz ? (fz > 0 ? (b.y + b.h) * TS + .85 : b.y * TS - .85) : (ty + .5) * TS;
        const g = G0(), dk = kit35(rr() < .5 ? 'urbano/detail-dumpster-closed' : 'urbano/detail-dumpster-open', 1.5);
        if (dk) add(g, dk, 0, 0, 0); else { B35.bidone(g, -.4, 0, 0); B35.bidone(g, .4, 0, 0, '#5a5a5c'); }
        for (let q = 0; q < 2 + Math.floor(rr() * 4); q++) B35.sacco(g, .95 + rr() * .5, (rr() - .5) * .6, rr() * 6, pick(rr, ['#1a1a1e', '#1a1a1e', '#2a3a2a', '#3a3a50']));
        if (rr() < .7) { B35.cartone(g, -1.05, .05, rr() * .4, .9, rr() < .5); if (rr() < .5) B35.cartone(g, -1.0, .1, rr(), .7); }
        for (let q = 0; q < 4; q++) { const w = rr(), px = (rr() - .5) * 2.6, pz = .4 + rr() * .5; if (w < .4) B35.lattina(g, px, pz, pick(rr, ['#b03028', '#c8b030', '#3a6a9a', '#d8d8d0'])); else if (w < .7) B35.bottiglia(g, px, pz, pick(rr, ['#2a5a2a', '#3a2a14'])); else B35.bicchiere(g, px, pz); }
        if (put(g, x, z, ry, 1.5, .55)) { bins++; break; }
      }
    });
    // i cortili: roba vecchia buttata (poltrona, televisore, frigo, gomme, pallet), una cassetta di piante, un fusto per il fuoco
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (zoneT(tx, ty) !== ZN.CITTA) continue; const v = gT(tx, ty); if (v !== T.GRASS && v !== T.DIRT && v !== T.COB) continue; if (RW[ty * G.GW + tx] > 0) continue;
      const rr = rng((tx * 9337 + ty * 1291 + 35) >>> 0); if (rr() > .03) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => gT(tx + a, ty + b) === T.BLD); if (!near.length) continue;
      const [a, b] = near[0], ry = Math.atan2(-a, -b), x = tx * TS + 1 + a * .3, z = ty * TS + 1 + b * .3, g = G0(), q = rr();
      if (q < .4) { B35.poltrona(g, 0, 0, rr() * .6 - .3, pick(rr, ['#8a2a24', '#4a5a3a', '#6a5040', '#3a4a6a'])); if (rr() < .6) B35.tv(g, .9, .2, rr() - .5); if (rr() < .5) B35.cartone(g, -.8, .2, rr(), .8, true); }
      else if (q < .6) { B35.frigo(g, 0, 0, rr() * .4, rr() < .4); B35.gomma(g, .9, .3, 0, .25); B35.gomma(g, .9, -.4, 0); }
      else if (q < .8) { B35.pallet(g, 0, 0, rr() * .3, 2 + Math.floor(rr() * 3)); B35.fusto(g, 1, 0, '#5a3a2a', rr() < .3); }
      else { B35.fusto(g, 0, 0, '#4a3a30'); for (let k = 0; k < 3; k++) B35.sedia(g, Math.cos(k * 2.1) * .9, Math.sin(k * 2.1) * .9, k * 2.1 + Math.PI / 2, pick(rr, ['#e8e4dc', '#5a4a3a', '#c8302a']), rr() < .2); }   // il fusto per il fuoco con le sedie attorno
      put(g, x, z, ry, 1.1, 1);
    }
    // i cantieri fermi: un lotto vuoto grande, la rete, il cassone di macerie, i bancali di mattoni e di cemento, i tubi, la bobina, il gabinetto, la torre faro
    const lots = []; for (let ty = 0; ty < G.GH; ty += 3) for (let tx = 0; tx < G.GW; tx += 3) {
      if (zoneT(tx, ty) !== ZN.CITTA) continue; let ok = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const v = gT(tx + i, ty + j); if ((v === T.GRASS || v === T.DIRT || v === T.COB) && !(RW[(ty + j) * G.GW + tx + i] > 0)) ok++; }
      if (ok >= 15 && lots.every(l => Math.hypot(l[0] - tx, l[1] - ty) > 26)) lots.push([tx, ty]);
    }
    lots.slice(0, 6).forEach(([tx, ty], li) => {
      const x = (tx + 2) * TS, z = (ty + 2) * TS, rr = rng(li * 313 + 35), ry = Math.floor(rr() * 4) * Math.PI / 2;
      const cs = Math.cos(ry), sn = Math.sin(ry), P = (u, w) => [x + cs * u + sn * w, z - sn * u + cs * w];
      const one = (fn, u, w, rot, hx, hz) => { const g = G0(); fn(g); const [px, pz] = P(u, w); put(g, px, pz, ry + (rot || 0), hx, hz); };
      [[-3.6, 0, Math.PI / 2], [3.6, 0, Math.PI / 2], [0, -3.6, 0]].forEach(([u, w, rot], k) => one(g => k === 2 ? B35.pannello(g, 0, 0, 0, 3.2) : B35.rete(g, 0, 0, 0, 3.2), u, w, rot, 1.7, .25));
      one(g => { const sk = kit35('stazione/skip-rocks', 2.4) || kit35('stazione/skip', 2.4); if (sk) add(g, sk, 0, 0, 0); else B35.fusto(g, 0, 0); }, -1.6, -1.6, 0, 1.3, .8);
      one(g => B35.mattoni(g, 0, 0, 0), 1.6, -1.8, .1, .6, .6);
      one(g => B35.sacchiCemento(g, 0, 0, 0), 1.6, .2, -.1, .65, .65);
      one(g => { B35.tubo(g, 0, 0, 0, .55, 2); B35.tubo(g, 0, 1.15, .05, .55, 2); }, -1.2, 1.6, 0, 1.1, 1.2);
      one(g => B35.bobina(g, 0, 0, 0), .6, 1.9, .5, .55, .55);
      if (rr() < .6) one(g => B35.cesso(g, 0, 0, 0), 2.8, 2.6, Math.PI, .6, .6);
      if (rr() < .5) { one(g => B35.torre(g, 0, 0, 0), -2.8, 2.6, .4, .75, .5); }
      for (let k = 0; k < 3; k++) one(g => { add(g, box(.42, .05, .42, sm('#2a2a2a')), 0, .025, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(.17, .62, 8), sm('#c8642a', { roughness: .7 })), 0, .34, 0); add(g, cyl(.12, .14, .08, 8, sm('#d8d4cc')), 0, .38, 0); }, -3 + k * 1.1 + rr() * .3, -3.9, rr(), .22, .22);
      one(g => { add(g, cyl(.04, .04, 1.6, 5, sm('#5a5c5e')), 0, .8, 0); add(g, box(.7, .7, .03, std({ map: cardTex35('lavori'), roughness: .7 })), 0, 1.4, .03); }, 0, -4.2, Math.PI, .4, .2);
    });
    // le lampadine tese sui vicoli e sulle piazzette, da una casa all'altra: poche, calde, qualcuna rotta
    let strings = 0; const LMP = sb('#ffc070'), LMPo = sm('#4a4038', { roughness: .5 }), WIRE = sl('#1a1a1c');
    (M.roads || []).filter(rd => rd.kind === 'vicolo').forEach((rd, ri) => {
      if (th(ri, 3, 357) > .45 || strings > 30) return; const P = rd.pts; for (const kq of [.5, .3, .7]) { const k = Math.floor((P.length - 1) * kq), [ax, az] = P[Math.max(0, k - 1)], [bx, bz] = P[Math.min(P.length - 1, k + 1)], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L;
      const [mx, mz] = P[k]; let e1 = null, e2 = null; for (let d = 1; d < 7 && !(e1 && e2); d += .5) { if (!e1 && gT(Math.floor((mx + nx * d) / TS), Math.floor((mz + nz * d) / TS)) === T.BLD) e1 = d - .1; if (!e2 && gT(Math.floor((mx - nx * d) / TS), Math.floor((mz - nz * d) / TS)) === T.BLD) e2 = d - .1; }
      if (!e1 || !e2) continue; const y0 = groundH(mx, mz) + 3.6, g = G0(), N = Math.max(4, Math.round((e1 + e2) * 1.6)), rr = rng(ri * 41 + 35);
      for (let q = 0; q <= N; q++) { const t = q / N, s = -e2 + (e1 + e2) * t, sag = Math.sin(t * Math.PI) * .45, x = mx + nx * s, z = mz + nz * s;
        if (q < N) { const s2 = -e2 + (e1 + e2) * (q + 1) / N, x2 = mx + nx * s2, z2 = mz + nz * s2, sag2 = Math.sin((q + 1) / N * Math.PI) * .45, w = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x2 - x, z2 - z) + .02, .015, .015), WIRE); w.position.set((x + x2) / 2, y0 - (sag + sag2) / 2, (z + z2) / 2); w.rotation.set(0, Math.atan2(-(z2 - z), x2 - x), Math.atan2(-(sag2 - sag), Math.hypot(x2 - x, z2 - z))); addStatic(w, true); }
        if (q > 0 && q < N) { const broken = rr() < .2, lb = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), broken ? LMPo : LMP); lb.position.set(x, y0 - sag - .1, z); addStatic(lb, true); if (!broken && q === Math.floor(N / 2)) addLight(x, y0 - sag - .2, z, '#ffc070', .5, 6, .1); } }
      strings++; break; }
    });
    // pattume sparso lungo i cordoli e nei vicoli: lattine, bottiglie, bicchieri, un sacco abbandonato
    (M.roads || []).filter(rd => rd.kind === 'citta' || rd.kind === 'vicolo').forEach((rd, ri) => {
      const P = rd.pts; let acc = 0, next = 3 + th(ri, 0, 358) * 6;
      for (let k = 0; k < P.length - 1; k++) { const [ax, az] = P[k], [bx, bz] = P[k + 1], L = Math.hypot(bx - ax, bz - az) || 1; acc += L; if (acc < next) continue; acc = 0; next = (rd.kind === 'vicolo' ? 4 : 7) + th(ri, k, 359) * 8;
        const nx = -(bz - az) / L, nz = (bx - ax) / L, sd = th(ri, k, 360) < .5 ? -1 : 1, off = rd.kind === 'vicolo' ? rd.w / 2 - .25 : rd.w / 2 + .35, x = ax + nx * sd * off, z = az + nz * sd * off;
        const g = G0(), rr = rng((ri * 131 + k * 17) >>> 0), q = rr();
        if (q < .3) B35.lattina(g, 0, 0, pick(rr, ['#b03028', '#c8b030', '#3a6a9a', '#d8d8d0']));
        else if (q < .5) B35.bottiglia(g, 0, 0, pick(rr, ['#2a5a2a', '#3a2a14', '#5a6a6a']));
        else if (q < .68) B35.bicchiere(g, 0, 0);
        else if (q < .8) B35.cartone(g, 0, 0, rr(), .7, rr() < .5);
        else if (q < .9) B35.sacco(g, 0, 0, rr() * 6, '#1a1a1e');
        else { B35.lattina(g, 0, 0, '#c8b030'); B35.bottiglia(g, .3, .2, '#2a5a2a'); B35.bicchiere(g, -.2, .25); }
        DZ.hint = 'static'; if (!put(g, x, z, Math.atan2(nx, nz) + rr(), .2, .2)) DZ.hint = null;
      }
    });
    if (window.__dbg35) console.log('oggetti35', n, 'bidoni', bins, 'cantieri', Math.min(6, lots.length), 'lampadine', strings);
    return n;
  }
