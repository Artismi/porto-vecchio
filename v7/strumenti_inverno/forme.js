  // ================= [case] FORME: ogni oggetto su tre livelli di dettaglio =================
  // Regola di Andrea: niente sfere, cilindri, linee e scatole nude. Ogni oggetto ha
  //   1. VOLUME     — la sagoma vera: profili torniti (vasi, bidoni, bombole, serbatoi, lanterne), spigoli smussati, parti separate;
  //   2. STRUTTURA  — giunture, bordi, cerchiature, bulloni, cerniere, staffe, gambe, nervature, tubi che entrano nel muro;
  //   3. SUPERFICIE — colore, materia (legno, lamiera verniciata, zinco, plastica, cotto, cemento, gomma, rame) e usura
  //                   (scheggiature con la ruggine sotto, colature, sporco che sale dal basso, calcare, muschio, graffi).
  // Tutte le parti usano un atlante solo (FA.mat, celle da 32 px): un materiale per edificio, si fonde con mergeGroup.
  const FA = { n: 0, map: {} };
  function faAtlas() { if (FA.c) return; FA.c = mk(512, 512); FA.x = FA.c.getContext('2d'); FA.tex = canvasTex(FA.c); FA.mat = std({ map: FA.tex, roughness: .85 }); }
  // una cella di materia: colore + grana + usura, decisa dal tipo
  function fCell(hex, kind) {
    faAtlas(); kind = kind || 'solid';
    const key = hex + kind; if (FA.map[key] !== undefined) return FA.map[key];
    const i = Math.min(255, FA.n++), cx = (i % 16) * 32, cy = Math.floor(i / 16) * 32, x = FA.x, r = rng(i * 131 + 17);
    const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(cx + a, cy + b, w, h); };
    const grad = (top, bot) => { for (let y = 0; y < 32; y++) px(0, y, 32, 1, shade(hex, top + (bot - top) * y / 31)); };
    const specks = (n, lo, hi, s) => { for (let k = 0; k < n; k++) px(Math.floor(r() * 32), Math.floor(r() * 32), s || 1, s || 1, shade(hex, lo + r() * (hi - lo))); };
    const dirt = (rows, a) => { for (let y = 32 - rows; y < 32; y++) px(0, y, 32, 1, `rgba(38,30,24,${(a * (y - 32 + rows) / rows).toFixed(3)})`); };
    const rustRun = (n) => { for (let k = 0; k < n; k++) { const sx = Math.floor(r() * 30), sy = Math.floor(r() * 20), L = 5 + Math.floor(r() * 12); px(sx, sy, 2, 1, '#6e3a22'); for (let y = 1; y < L; y++) px(sx + (r() < .2 ? 1 : 0), sy + y, 1, 1, `rgba(120,62,32,${(.5 * (1 - y / L)).toFixed(2)})`); } };
    if (kind === 'paint') {   // lamiera verniciata: bordo consumato, schegge di fondo e ruggine, colature, sporco in basso
      grad(1.06, .9); specks(50, .9, 1.08); px(0, 0, 32, 1, shade(hex, 1.28)); px(0, 0, 1, 32, shade(hex, 1.18));
      for (let k = 0; k < 7; k++) px(Math.floor(r() * 30), Math.floor(r() * 30), 2 + Math.floor(r() * 2), 1, r() < .5 ? '#3a2a22' : '#7a4026');
      rustRun(2); dirt(9, .45);
    } else if (kind === 'galv') {   // zinco: chiazze, ossido bianco, giunti di lamiera con i rivetti
      grad(1.02, .92); specks(70, .82, 1.16, 2); for (let k = 0; k < 10; k++) px(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1, 'rgba(232,230,220,.35)');
      [10, 21].forEach(y => { px(0, y, 32, 1, shade(hex, .6)); for (let q = 1; q < 32; q += 4) px(q, y + 1, 1, 1, shade(hex, 1.3)); });
      rustRun(2); dirt(7, .4);
    } else if (kind === 'rust') { grad(1, .85); specks(120, .7, 1.25, 2); for (let k = 0; k < 14; k++) px(Math.floor(r() * 30), Math.floor(r() * 30), 3, 2, pick(r, ['#5a2e1a', '#8a4a26', '#3a2418'])); dirt(8, .35); }
    else if (kind === 'wood') {   // assi: venatura, fessure, nodi, chiodi, grigio del tempo
      for (let y = 0; y < 32; y++) px(0, y, 32, 1, shade(hex, .9 + .14 * Math.sin(y * 1.7 + r() * 2)));
      for (let k = 0; k < 40; k++) px(Math.floor(r() * 28), Math.floor(r() * 32), 3 + Math.floor(r() * 5), 1, shade(hex, .78 + r() * .1));
      [7, 15, 23, 31].forEach(y => px(0, y, 32, 1, shade(hex, .45)));
      for (let k = 0; k < 2; k++) { const kx = Math.floor(r() * 28), ky = Math.floor(r() * 28); px(kx, ky, 3, 2, shade(hex, .55)); px(kx + 1, ky, 1, 1, shade(hex, .4)); }
      for (let q = 0; q < 4; q++) { px(2, q * 8 + 3, 1, 1, '#2a2420'); px(29, q * 8 + 3, 1, 1, '#2a2420'); }
      for (let k = 0; k < 30; k++) px(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1, 'rgba(160,156,146,.22)'); dirt(6, .35);
    } else if (kind === 'plastic') { grad(1.1, .94); px(0, 0, 32, 2, shade(hex, 1.2)); for (let k = 0; k < 8; k++) px(Math.floor(r() * 26), Math.floor(r() * 30), 4 + Math.floor(r() * 4), 1, 'rgba(255,255,255,.18)'); dirt(10, .5); }
    else if (kind === 'clay') {   // cotto: grana, calcare bianco sotto il bordo, muschio alla base
      grad(1.04, .92); specks(90, .78, 1.15); for (let k = 0; k < 18; k++) px(Math.floor(r() * 30), 3 + Math.floor(r() * 5), 3, 1, 'rgba(236,230,214,.4)');
      for (let k = 0; k < 16; k++) px(Math.floor(r() * 30), 26 + Math.floor(r() * 6), 2, 1, 'rgba(74,92,48,.7)'); dirt(5, .3);
    } else if (kind === 'concrete') { grad(1.04, .9); specks(140, .8, 1.15); for (let k = 0; k < 5; k++) { const sx = Math.floor(r() * 26), sy = Math.floor(r() * 26); px(sx, sy, 6, 4, 'rgba(40,36,34,.15)'); } rustRun(1); dirt(10, .45); }
    else if (kind === 'rubber') { px(0, 0, 32, 32, hex); specks(60, .7, 1.4); }
    else if (kind === 'copper') { grad(1.1, .85); specks(40, .8, 1.2); for (let k = 0; k < 10; k++) px(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2, 'rgba(90,150,120,.6)'); }
    else if (kind === 'glass') { px(0, 0, 32, 32, hex); for (let k = 0; k < 32; k++) { px(k, 31 - k, 2, 1, 'rgba(220,230,240,.25)'); } px(0, 0, 32, 1, '#1a1a1e'); px(0, 0, 1, 32, '#1a1a1e'); dirt(6, .4); }
    else if (kind === 'leaf') { px(0, 0, 32, 32, shade(hex, .7)); for (let k = 0; k < 140; k++) px(Math.floor(r() * 31), Math.floor(r() * 31), 2, 2, shade(hex, .6 + r() * .8)); }
    else if (kind === 'paper') { grad(1.1, .9); for (let y = 3; y < 30; y += 4) px(0, y, 32, 1, shade(hex, .62)); px(0, 0, 32, 1, 'rgba(255,240,200,.4)'); }
    else if (kind === 'cloth') { grad(1.05, .88); for (let q = 0; q < 32; q += 3) px(q, 0, 1, 32, shade(hex, .82)); dirt(6, .3); }
    else if (kind === 'slat') { px(0, 0, 32, 32, shade(hex, .6)); for (let y = 2; y < 30; y += 4) { px(2, y, 28, 2, shade(hex, 1.05)); px(2, y, 28, 1, shade(hex, 1.25)); } px(0, 0, 32, 2, hex); px(0, 30, 32, 2, hex); px(0, 0, 2, 32, hex); px(30, 0, 2, 32, hex); for (let k = 0; k < 6; k++) px(Math.floor(r() * 28), Math.floor(r() * 28), 2, 1, '#3a2a22'); dirt(8, .35); }
    else px(0, 0, 32, 32, hex);
    FA.tex.needsUpdate = true; return FA.map[key] = i;
  }
  // coordinate di tessitura nella cella: proiezione a scatola (oppure quelle già buone di torni e cilindri)
  function fUV(geo, cell, mode) {
    const uv = geo.attributes.uv, pos = geo.attributes.position, nor = geo.attributes.normal, u0 = (cell % 16) * 32, v0 = Math.floor(cell / 16) * 32;
    let bb = null, s = null; if (mode === 'box') { geo.computeBoundingBox(); bb = geo.boundingBox; s = bb.max.clone().sub(bb.min).addScalar(1e-4); }
    for (let k = 0; k < uv.count; k++) {
      let u = uv.getX(k), v = uv.getY(k);
      if (bb) { const X = pos.getX(k), Y = pos.getY(k), Z = pos.getZ(k), nx = Math.abs(nor.getX(k)), ny = Math.abs(nor.getY(k)), nz = Math.abs(nor.getZ(k));
        if (nx >= ny && nx >= nz) { u = (Z - bb.min.z) / s.z; v = (Y - bb.min.y) / s.y; } else if (ny >= nz) { u = (X - bb.min.x) / s.x; v = (Z - bb.min.z) / s.z; } else { u = (X - bb.min.x) / s.x; v = (Y - bb.min.y) / s.y; } }
      u = Math.min(1, Math.max(0, u)); v = Math.min(1, Math.max(0, v));
      uv.setXY(k, (u0 + 1 + u * 30) / 512, 1 - (v0 + 1 + (1 - v) * 30) / 512);
    }
    return geo;
  }
  const GC = {}; let gcN = 0;
  const q3 = v => typeof v === 'number' ? Math.round(v * 1000) : v;
  function fGeo(key, make, hex, kind, mode) {   // geometria pronta (UV nella cella, senza indice), condivisa fra tutti gli oggetti uguali
    const cell = fCell(hex, kind), k = key + '|' + cell + '|' + (mode || ''); let g = GC[k];
    if (!g) { g = make(); if (g.index) g = g.toNonIndexed(); fUV(g, cell, mode); GC[k] = g; gcN++; }
    return g;
  }
  const fMesh = (geo, hex, kind, mode) => new THREE.Mesh(fUV(geo, fCell(hex, kind), mode), FA.mat);
  // scatola con gli spigoli smussati (il bordo prende la luce: niente cartone)
  const BEVC = {};
  function fB(w, h, d, hex, kind, bv) {
    bv = Math.min(bv === undefined ? .03 : bv, w / 3, h / 3, d / 3);
    if (Math.min(w, h, d) < .07) bv = 0;   // sui pezzi sottili lo smusso non si vede: solo triangoli in più
    const key = [w, h, d, bv].map(v => v.toFixed(3)).join(); let g0 = BEVC[key];
    if (!g0) { if (bv < .006) g0 = new THREE.BoxGeometry(w, h, d); else { const s = new THREE.Shape(); s.moveTo(-w / 2 + bv, -h / 2 + bv); s.lineTo(w / 2 - bv, -h / 2 + bv); s.lineTo(w / 2 - bv, h / 2 - bv); s.lineTo(-w / 2 + bv, h / 2 - bv); s.closePath();
      g0 = new THREE.ExtrudeGeometry(s, { depth: d - bv * 2, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 1, curveSegments: 1 }); g0.translate(0, 0, -(d - bv * 2) / 2); if (g0.index) g0 = g0.toNonIndexed(); g0.computeVertexNormals(); } BEVC[key] = g0; }
    return new THREE.Mesh(fGeo('B' + key, () => g0.clone(), hex, kind, 'box'), FA.mat);
  }
  // tornito: profilo [[raggio, quota], ...] dal basso in alto
  const fL = (prof, seg, hex, kind) => new THREE.Mesh(fGeo('L' + prof.map(([a, b]) => q3(a) + ',' + q3(b)).join(';') + seg, () => new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(Math.max(.001, a), b)), seg || 12), hex, kind), FA.mat);
  const fC = (rt, rb, h, seg, hex, kind) => new THREE.Mesh(fGeo('C' + [rt, rb, h, seg].map(q3).join(), () => new THREE.CylinderGeometry(rt, rb, h, seg || 8), hex, kind), FA.mat);
  const fT = (R, t, seg, hex, kind) => { const m = new THREE.Mesh(fGeo('T' + [R, t, seg].map(q3).join(), () => new THREE.TorusGeometry(R, t, 4, seg || 14), hex, kind), FA.mat); m.rotation.x = Math.PI / 2; return m; };
  const fI = (rad, det, hex, kind) => new THREE.Mesh(fGeo('I' + q3(rad) + det, () => new THREE.IcosahedronGeometry(rad, det), hex, kind, 'box'), FA.mat);
  const fAt = (grp, o, x, y, z, rx, ry, rz) => { o.position.set(x, y, z); if (rx || ry || rz) o.rotation.set(rx || o.rotation.x, ry || 0, rz || 0); grp.add(o); return o; };
  // tubo dritto fra due punti (staffe, gambe, aste)
  function fRod(grp, a, b, rad, hex, kind) { const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = d.length(), m = fC(rad, rad, L, 6, hex, kind || 'paint'); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); grp.add(m); return m; }
  const bolt = (grp, x, y, z, ax) => { const b = fC(.018, .018, .02, 6, '#4a4a4e', 'solid'); if (ax === 'z') b.rotation.x = Math.PI / 2; else if (ax === 'x') b.rotation.z = Math.PI / 2; b.position.set(x, y, z); grp.add(b); };

  // ---------- oggetti ----------
  // condizionatore esterno: corpo smussato, griglia con la ventola, alette laterali, tubi di rame isolati, piedini o staffe, colatura sotto
  function oAC(r, wall) {
    const g = new THREE.Group(), body = pick(r, ['#c8c4b8', '#b8b4aa', '#d0ccc0', '#a8aca8']), W = .84, H = .58, D = .3, y0 = wall ? 0 : .1;
    fAt(g, fB(W, H, D, body, 'paint', .035), 0, y0 + H / 2, 0);
    fAt(g, fB(W - .3, H - .1, .02, '#2a2a2e', 'slat', .005), -.12, y0 + H / 2, -D / 2 - .005);           // retro a lamelle
    fAt(g, fB(.02, H - .14, D - .08, '#4a4a4e', 'slat', .004), W / 2 + .005, y0 + H / 2, 0);             // fianco con le alette
    const fx = -.1; fAt(g, fC(.215, .215, .03, 16, '#2a2a2e', 'rubber'), fx, y0 + H / 2, D / 2 + .005, Math.PI / 2);   // bocca della ventola
    fAt(g, fT(.205, .016, 16, shade(body, .8), 'paint'), fx, y0 + H / 2, D / 2 + .02, 0); g.children[g.children.length - 1].rotation.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { const bl = fB(.36, .05, .012, '#5a5a5e', 'solid', .004); bl.position.set(fx, y0 + H / 2, D / 2 - .02); bl.rotation.z = k * 1.05 + r(); g.add(bl); }   // pale
    fAt(g, fC(.04, .04, .05, 8, '#3a3a3e', 'solid'), fx, y0 + H / 2, D / 2 - .01, Math.PI / 2);
    for (let q = -3; q <= 3; q++) fAt(g, fB(.01, .4, .01, shade(body, .7), 'solid', 0), fx + q * .055, y0 + H / 2, D / 2 + .025);   // griglia
    fAt(g, fB(.16, H - .2, .015, shade(body, .85), 'paint', .004), W / 2 - .12, y0 + H / 2 - .02, D / 2 + .005);   // sportello dei raccordi
    [[.26, .022], [.32, .016]].forEach(([oz, rd], q) => { const p = fRod(g, [W / 2 - .1, y0 + .14 + q * .08, D / 2 + .02], [W / 2 + .12, y0 + .14 + q * .08, D / 2 + .02], rd, q ? '#a0603a' : '#d8d4c8', q ? 'copper' : 'plastic'); });
    if (wall) fRod(g, [W / 2 + .12, y0 + .14, D / 2 + .02], [W / 2 + .12, y0 + .9, -D / 2 - .05], .025, '#d8d4c8', 'plastic');   // tubi isolati verso il muro
    else { fRod(g, [W / 2 + .12, y0 + .14, D / 2 + .02], [W / 2 + .12, .03, D / 2 + .02], .025, '#d8d4c8', 'plastic'); fRod(g, [W / 2 + .12, .03, D / 2 + .02], [W / 2 + .6, .03, D / 2 + .3], .025, '#d8d4c8', 'plastic'); }   // giù fino al tetto e via
    if (wall) { [-W / 2 + .12, W / 2 - .12].forEach(xx => { fAt(g, fB(.04, .04, D + .25, '#3a3a3e', 'paint', .008), xx, -.03, -.12); fRod(g, [xx, -.03, D / 2 + .05], [xx, H * .7, -D / 2 - .1], .015, '#3a3a3e'); bolt(g, xx, -.03, D / 2 + .08, 'z'); }); }
    else [-W / 2 + .1, W / 2 - .1].forEach(xx => fAt(g, fB(.08, .1, D + .06, '#2a2a2e', 'rubber', .01), xx, .05, 0));
    return g;
  }
  // parabola: catino tornito con l'orlo, braccio con l'illuminatore, staffa, palo con la fascetta, piastra coi bulloni
  function oDish(yaw, r, s) {
    const g = new THREE.Group(), dsh = new THREE.Group(), R = .45 * (s || 1), col = pick(r, ['#d8d6d0', '#c8c8c2', '#b8bcc0', '#d0c8b8']);
    fAt(g, fB(.32, .03, .32, '#5a5a5e', 'galv', .01), 0, .015, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bolt(g, a * .12, .035, b * .12));
    fAt(g, fC(.035, .04, 1.05, 8, '#6a6a6e', 'galv'), 0, .55, 0); fAt(g, fC(.05, .05, .06, 8, '#4a4a4e', 'paint'), 0, .9, 0);
    const prof = []; for (let k = 0; k <= 6; k++) { const t = k / 6; prof.push([R * t, .16 * t * t * (s || 1)]); } prof.push([R + .02, .17 * (s || 1)]); for (let k = 6; k >= 0; k--) { const t = k / 6; prof.push([R * t * .98, .16 * t * t * (s || 1) - .015]); }
    const bowl = fL(prof, 16, col, 'paint'); dsh.add(bowl);
    fAt(dsh, fT(R + .01, .012, 18, shade(col, .8), 'paint'), 0, .165 * (s || 1), 0);
    fRod(dsh, [0, .02, -R * .55], [0, R * 1.05, 0], .012, '#4a4a4e');                     // braccio
    fAt(dsh, fB(.07, .08, .1, '#2e2e32', 'plastic', .01), 0, R * 1.08, 0);                 // illuminatore
    fAt(dsh, fC(.03, .03, .03, 8, '#1a1a1c', 'rubber'), 0, R * 1.02, 0);
    fAt(dsh, fB(.12, .05, .08, '#4a4a4e', 'paint', .01), 0, -.02, 0);
    dsh.rotation.set(1.0, 0, 0); dsh.position.set(0, .95, .08); const piv = new THREE.Group(); piv.add(dsh); piv.rotation.y = yaw; g.add(piv);
    return g;
  }
  // serbatoio dell'acqua sul tetto: zinco con i giunti e i rivetti, cerchiature, coperchio con la maniglia, telaio con le crociere, tubi
  function oTank(kind, r) {
    const g = new THREE.Group();
    if (kind === 0) {
      const R = .62, H = 1.25, col = pick(r, ['#9a9a94', '#8e9290', '#a8a49a']);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => fAt(g, fB(.07, .5, .07, '#4a4440', 'rust', .01), a * .45, .25, b * .45));
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { const br = fB(a ? .05 : .9, .05, a ? .9 : .05, '#4a4440', 'rust', .008); fAt(g, br, a * .45, .45, b * .45); });
      fRod(g, [-.45, .05, -.45], [.45, .45, -.45], .015, '#4a4440', 'rust'); fRod(g, [.45, .05, .45], [-.45, .45, .45], .015, '#4a4440', 'rust');
      fAt(g, fB(1.05, .05, 1.05, '#5a5450', 'rust', .01), 0, .52, 0);
      fAt(g, fL([[.0, 0], [R - .04, 0], [R, .04], [R, H], [R - .05, H + .12], [.3, H + .22], [.0, H + .24]], 16, col, 'galv'), 0, .55, 0);
      [.25, .62, 1.0].forEach(y => fAt(g, fT(R + .012, .018, 16, shade(col, .75), 'galv'), 0, .55 + y, 0));
      fAt(g, fC(.2, .22, .06, 12, shade(col, .8), 'galv'), 0, .55 + H + .25, 0); fRod(g, [-.08, .55 + H + .3, 0], [.08, .55 + H + .3, 0], .012, '#3a3a3e');
      fRod(g, [R * .7, .62, R * .7], [R * .7 + .1, .1, R * .7 + .1], .035, '#5a5a5e', 'galv');   // scarico
      fRod(g, [-R, .55 + H - .1, 0], [-R - .18, .55 + H - .1, 0], .025, '#5a5a5e', 'galv'); fRod(g, [-R - .18, .55 + H - .1, 0], [-R - .18, .1, 0], .025, '#5a5a5e', 'galv');   // troppopieno
    } else {   // cisterna di plastica squadrata, nervata, scolorita dal sole
      const col = pick(r, ['#3a4a6a', '#2a2a2e', '#5a6a5a', '#7a6a4a']), W = 1.1, H = 1.0;
      fAt(g, fB(W + .1, .08, W + .1, '#6a6a66', 'concrete', .02), 0, .04, 0);
      fAt(g, fB(W, H, W * .8, col, 'plastic', .08), 0, .08 + H / 2, 0);
      for (let q = -2; q <= 2; q++) { fAt(g, fB(.05, H - .14, .03, shade(col, .85), 'plastic', .01), q * .2, .08 + H / 2, W * .4 + .01); fAt(g, fB(.03, H - .14, .05, shade(col, .85), 'plastic', .01), W / 2 + .01, .08 + H / 2, q * .16); }
      fAt(g, fC(.18, .2, .08, 12, shade(col, 1.1), 'plastic'), .15, .08 + H + .04, 0);
      fRod(g, [-W / 2, .3, 0], [-W / 2 - .25, .3, 0], .03, '#c8c4b8', 'plastic'); fRod(g, [-W / 2 - .25, .3, 0], [-W / 2 - .25, .05, 0], .03, '#c8c4b8', 'plastic');
    }
    return g;
  }
  // bidone: tornito con le due cerchiature di rotolamento e gli orli, coperchio coi tappi, ammaccato e arrugginito
  function oDrum(r, col) {
    const g = new THREE.Group(); col = col || pick(r, ['#6a3a2a', '#3a4a5a', '#5a5a3a', '#8a2a22', '#2a3a2a']); const R = .3, H = .88;
    fAt(g, fL([[0, 0], [R - .02, 0], [R, .02], [R, H - .02], [R - .02, H], [0, H]], 14, col, r() < .5 ? 'paint' : 'rust'), 0, 0, 0);
    [.015, H - .015].forEach(y => fAt(g, fT(R + .004, .016, 14, shade(col, .7), 'rust'), 0, y, 0)); [H * .33, H * .66].forEach(y => fAt(g, fT(R + .01, .02, 14, shade(col, .85), 'paint'), 0, y, 0));
    fAt(g, fC(.05, .05, .03, 8, '#3a3a3e', 'paint'), .15, H + .015, .05); fAt(g, fC(.03, .03, .03, 8, '#3a3a3e', 'paint'), -.14, H + .015, -.08);
    return g;
  }
  // cassa di legno: doghe con le fessure, montanti agli spigoli, chiodi, legno ingrigito
  function oCrate(w, h, d, r) {
    const g = new THREE.Group(), col = pick(r, ['#8a6a46', '#7a5e40', '#9a7a52', '#6a5238']);
    const ns = Math.max(2, Math.round(h / .17)), sh = h / ns - .02;
    for (let k = 0; k < ns; k++) { const y = .01 + k * (h / ns) + sh / 2; fAt(g, fB(w, sh, .02, col, 'wood', .005), 0, y, d / 2 - .01); fAt(g, fB(w, sh, .02, col, 'wood', .005), 0, y, -d / 2 + .01); fAt(g, fB(.02, sh, d - .04, col, 'wood', .005), w / 2 - .01, y, 0); fAt(g, fB(.02, sh, d - .04, col, 'wood', .005), -w / 2 + .01, y, 0); }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => fAt(g, fB(.05, h, .05, shade(col, .8), 'wood', .006), a * (w / 2 - .04), h / 2, b * (d / 2 - .04)));
    fAt(g, fB(w - .04, .02, d - .04, shade(col, .7), 'wood', 0), 0, .02, 0);
    if (r() < .5) for (let k = 0; k < 4; k++) fAt(g, fB((w - .1) / 4 - .02, .02, d - .06, col, 'wood', .004), -w / 2 + .05 + (k + .5) * (w - .1) / 4, h - .01, 0);   // coperchio a doghe
    return g;
  }
  // cassetta di plastica da pane e frutta: bordo, sponde a griglia, maniglie ritagliate, impilabili
  function oPCrate(r, col) {
    const g = new THREE.Group(); col = col || pick(r, ['#a83a32', '#3a5a8a', '#c8a03a', '#4a7a4a', '#2a2a2e']); const W = .56, H = .3, D = .38;
    fAt(g, fB(W, .03, D, col, 'plastic', .008), 0, .015, 0);
    [[0, D / 2, W, 0], [0, -D / 2, W, 0], [W / 2, 0, D, 1], [-W / 2, 0, D, 1]].forEach(([x, z, L, s]) => { const p = fB(s ? .025 : L, H - .05, s ? L : .025, col, 'slat', .006); fAt(g, p, x, H / 2, z); fAt(g, fB(s ? .045 : L + .02, .04, s ? L + .02 : .045, shade(col, 1.08), 'plastic', .01), x, H - .02, z); });
    [-1, 1].forEach(s => fAt(g, fB(.025, .05, .14, '#141414', 'solid', 0), s * (W / 2 + .003), H - .08, 0));
    return g;
  }
  // vaso di cotto tornito (orlo, spalla, piede) col sottovaso, e la pianta vera: fusti e ciuffi di foglie
  function oPot(r, s, plant) {
    const g = new THREE.Group(); s = s || 1; const col = pick(r, ['#a8583a', '#9a5236', '#b8683e', '#8a4a32', '#6a6a64']), R = .2 * s, H = .34 * s;
    fAt(g, fL([[0, 0], [R + .05 * s, 0], [R + .055 * s, .03 * s], [R + .02 * s, .03 * s]], 12, shade(col, .85), 'clay'), 0, 0, 0);
    fAt(g, fL([[0, .03 * s], [R * .72, .03 * s], [R * .78, .06 * s], [R, H - .05 * s], [R + .035 * s, H - .045 * s], [R + .035 * s, H], [R - .01, H], [R - .02, H - .02 * s], [0, H - .03 * s]], 12, col, 'clay'), 0, 0, 0);
    if (plant !== false) {
      const kind = plant || pick(r, ['ciuffo', 'cespo', 'geranio', 'fico', 'secco']), LEAFC = pick(r, ['#3e5a32', '#4a6a38', '#56683a', '#46603a']);
      if (kind === 'secco') { for (let k = 0; k < 6; k++) { const a = r() * 6.28, L = .25 + r() * .3; fRod(g, [0, H - .02, 0], [Math.cos(a) * L * .4, H + L, Math.sin(a) * L * .4], .008, '#5a4a36', 'wood'); } }
      else if (kind === 'fico') { fRod(g, [0, H - .02, 0], [.03, H + .55 * s, .02], .025 * s, '#5a4a3a', 'wood'); for (let k = 0; k < 9; k++) { const a = k * .8 + r() * .3, y = H + .28 * s + r() * .42 * s, lf = fI(Math.round(.11 * s * 50) / 50, 0, shade(LEAFC, [.85, 1, 1.15][Math.floor(r() * 3)]), 'leaf'); lf.scale.set(1.3, .22, .7); lf.position.set(Math.cos(a) * .16 * s, y, Math.sin(a) * .16 * s); lf.rotation.set(0, -a, -.35); g.add(lf); fRod(g, [0, y - .06, 0], [Math.cos(a) * .1 * s, y, Math.sin(a) * .1 * s], .006, '#4a5a32', 'wood'); } }
      else { const n = kind === 'cespo' ? 9 : 7; for (let k = 0; k < n; k++) { const a = r() * 6.28, rr = r() * R * .8, y = H + .06 * s + r() * .2 * s, cl = fI(Math.round((.09 + r() * .06) * s * 50) / 50, 1, shade(LEAFC, [.85, 1, 1.15][Math.floor(r() * 3)]), 'leaf'); cl.scale.set(1, .75, 1); cl.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); g.add(cl); }
        if (kind === 'geranio') for (let k = 0; k < 5; k++) { const fl = fB(.05, .05, .05, pick(r, ['#c03a3a', '#d04a6a', '#e05a4a']), 'solid', .01); fl.position.set((r() - .5) * R * 1.6, H + .2 * s + r() * .1, (r() - .5) * R * 1.6); g.add(fl); } }
    }
    return g;
  }
  // bombola del gas: tornita con la spalla, collare di protezione forato, valvola, piede ad anello; vernice scheggiata
  function oGas(r, col) {
    const g = new THREE.Group(); col = col || pick(r, ['#c03a2a', '#d0a040', '#4a6a8a', '#8a8a86']); const R = .15, H = .62;
    fAt(g, fL([[R * .9, 0], [R * .95, .05], [R * .9, .06]], 12, '#3a3a3e', 'rust'), 0, 0, 0);
    fAt(g, fL([[0, .05], [R - .01, .05], [R, .08], [R, H - .12], [R * .8, H - .04], [.035, H], [0, H]], 14, col, 'paint'), 0, 0, 0);
    fAt(g, fL([[R * .62, H - .06], [R * .7, H + .1], [R * .66, H + .1], [R * .58, H - .06]], 12, shade(col, .8), 'paint'), 0, 0, 0);
    fAt(g, fC(.025, .025, .08, 8, '#b8a060', 'copper'), 0, H + .04, 0); fAt(g, fC(.04, .04, .015, 8, '#2a2a2e', 'paint'), 0, H + .085, 0);
    return g;
  }
  // lanterna di carta tornita, con le stecche, i due fondi neri, la nappa
  function oLantern(r, mat) {
    const g = new THREE.Group(), prof = []; for (let k = 0; k <= 8; k++) { const t = k / 8; prof.push([.07 + .14 * Math.sin(t * Math.PI), -.24 + t * .48]); }
    const body = new THREE.Mesh(fUV(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 12), fCell('#b8301e', 'paper')), mat || FA.mat); g.add(body);
    [-.12, 0, .12].forEach(y => fAt(g, fT(.07 + .14 * Math.sin((y + .24) / .48 * Math.PI) + .004, .006, 12, '#3a1a14', 'solid'), 0, y, 0));
    [-.26, .26].forEach(y => fAt(g, fC(.085, .09, .04, 10, '#1a1416', 'paint'), 0, y, 0));
    fAt(g, fC(.006, .006, .14, 4, '#c8a040', 'solid'), 0, -.35, 0); fAt(g, fC(.02, .005, .08, 6, '#c03020', 'cloth'), 0, -.44, 0);
    fAt(g, fC(.004, .004, .2, 3, '#1a1a1c', 'solid'), 0, .38, 0);
    return g;
  }
  // anta di persiana: telaio, lamelle, cerniere, ferma-imposte
  function oShutterLeaf(w, h, col) {
    const g = new THREE.Group();
    fAt(g, fB(w - .06, h - .08, .025, col, 'slat', .004), 0, 0, 0);
    [[0, h / 2 - .03, w, .06], [0, -h / 2 + .03, w, .06], [0, 0, w, .045]].forEach(([x, y, L, t]) => fAt(g, fB(L, t, .045, shade(col, .92), 'paint', .008), x, y, .005));
    [-1, 1].forEach(s => fAt(g, fB(.05, h, .045, shade(col, .9), 'paint', .008), s * (w / 2 - .025), 0, .005));
    [h / 2 - .15, -h / 2 + .15].forEach(y => { fAt(g, fB(.06, .04, .05, '#2a2a2c', 'rust', .006), -w / 2 - .01, y, 0); fAt(g, fB(.16, .025, .012, '#2a2a2c', 'rust', .004), -w / 2 + .08, y, .03); });
    return g;
  }
  // fioriera: cassetta smussata col bordo, mensole di ferro sotto
  function oPlanter(w, r) {
    const g = new THREE.Group(), col = pick(r, ['#9a5236', '#5a5048', '#4a3626', '#7a7a74', '#3a4a3a']);
    fAt(g, fB(w, .18, .22, col, col === '#4a3626' ? 'wood' : 'clay', .02), 0, .09, 0); fAt(g, fB(w + .04, .03, .25, shade(col, 1.1), 'clay', .01), 0, .185, 0);
    [-w / 2 + .1, w / 2 - .1].forEach(x => { fAt(g, fB(.03, .03, .26, '#2a2a2c', 'rust', .005), x, -.02, -.02); fRod(g, [x, -.02, .1], [x, -.2, -.12], .012, '#2a2a2c', 'rust'); });
    return g;
  }
  // antenna TV: piede a treppiede imbullonato, palo zincato con le fascette, culla con gli elementi e l'isolatore, cavo che scende
  function oAntenna(hh, ry, r) {
    const g = new THREE.Group(), z = '#7a7a7c';
    fAt(g, fB(.22, .03, .22, '#5a5a5e', 'galv', .01), 0, .015, 0); [0, 2.09, 4.19].forEach(a => fRod(g, [Math.cos(a) * .35, .02, Math.sin(a) * .35], [0, .7, 0], .014, z, 'galv'));
    fAt(g, fC(.025, .03, hh, 6, z, 'galv'), 0, hh / 2, 0); for (let y = .7; y < hh - .3; y += .9) fAt(g, fC(.034, .034, .05, 6, '#4a4a4e', 'rust'), 0, y, 0);
    const head = new THREE.Group(); head.position.y = hh - .15; head.rotation.y = ry; g.add(head);
    const L = 1.1 + r() * .5; fAt(head, fB(L, .03, .03, z, 'galv', .005), L * .2, 0, 0); fAt(head, fB(.08, .1, .06, '#2a2a2e', 'plastic', .01), -.05, 0, 0);
    for (let q = 0; q < 7; q++) { const w = .62 - q * .055; fAt(head, fB(.015, .015, w, z, 'galv', 0), -L * .25 + q * L * .16, .01, 0); }
    fAt(head, fB(.02, .2, .02, z, 'galv', 0), -L * .3, -.1, 0);
    if (r() < .5) { const h2 = new THREE.Group(); h2.position.y = hh * .62; h2.rotation.y = ry + (r() - .5) * 1.2; g.add(h2); for (let q = 0; q < 4; q++) fAt(h2, fB(.015, .015, .4 - q * .05, z, 'galv', 0), q * .12, 0, 0); fAt(h2, fB(.4, .025, .025, z, 'galv', 0), .18, 0, 0); }
    fRod(g, [.04, hh - .2, .02], [.05, .3, .03], .008, '#1a1a1c', 'rubber'); fRod(g, [.05, .3, .03], [.4, .02, .3], .008, '#1a1a1c', 'rubber');
    return g;
  }
