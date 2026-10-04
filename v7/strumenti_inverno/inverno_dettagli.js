  // ================= [inverno] DETTAGLI: manifesti, volantini, caratteri dei locali, arredo di strada =================
  const POST = {};
  function posterTex(k) {
    if (POST[k]) return POST[k];
    const W = 24, H = 34, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(k, n, 21), px = (a, b, w, hh, col) => { x.fillStyle = col; x.fillRect(a, b, w, hh); };
    const kind = k % 8;
    if (kind === 0) { px(0, 0, W, H, '#a8221f'); px(7, 6, 10, 12, '#16100e'); px(9, 4, 6, 4, '#16100e'); px(3, 24, 18, 3, '#f0e6d0'); px(5, 29, 14, 2, '#f0e6d0'); px(0, 0, W, 2, '#16100e'); }          // il Garante
    else if (kind === 1) { px(0, 0, W, H, '#14101e'); px(0, 6, W, 4, '#ff3fa4'); px(0, 13, W, 4, '#38e8ff'); px(3, 22, 18, 3, '#ffe03a'); px(6, 28, 12, 2, '#f0e6d0'); }                     // concerto
    else if (kind === 2) { px(0, 0, W, H, '#e8e2d0'); px(6, 5, 12, 12, '#28242a'); for (let i = 0; i < 4; i++) px(3, 20 + i * 3, 18 - Math.floor(h(i) * 8), 1, '#4a4650'); px(3, 2, 18, 2, '#a8221f'); }   // persona scomparsa
    else if (kind === 3) { px(0, 0, W, H, '#0c1620'); x.strokeStyle = '#38e8ff'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 14 + Math.sin(i * .6) * 4); x.stroke(); x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 21 + Math.sin(i * .6 + 1) * 3); x.stroke(); px(4, 28, 16, 2, '#38e8ff'); }   // l'onda della Risacca
    else if (kind === 4) { px(0, 0, W, H, '#f0d030'); px(3, 4, 18, 10, '#1a1618'); px(4, 18, 16, 2, '#1a1618'); px(4, 22, 12, 2, '#1a1618'); px(4, 26, 14, 2, '#a8221f'); }              // inserzione
    else if (kind === 5) { px(0, 0, W, H, '#2c5a3a'); px(0, 0, W, 5, '#e8e0c0'); px(4, 9, 16, 14, '#e8e0c0'); px(8, 12, 8, 8, '#2c5a3a'); px(3, 27, 18, 3, '#e8e0c0'); }                      // lavoro
    else if (kind === 6) { px(0, 0, W, H, '#d8d4c8'); for (let i = 0; i < 9; i++) px(2, 3 + i * 3, 20 - Math.floor(h(i + 3) * 10), 1, '#46424a'); px(0, 0, 5, 5, '#b8b4a8'); px(W - 6, H - 7, 6, 7, '#b8b4a8'); }   // volantino strappato
    else { x.clearRect(0, 0, W, H); x.strokeStyle = ['#ff3fa4', '#38e8ff', '#ffe03a', '#7dff6a'][Math.floor(h(9) * 4)]; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 8; i++) x.lineTo(2 + h(i) * 20, 3 + h(i + 20) * 28); x.stroke(); }   // scritta a spray
    const t = canvasTex(c); return POST[k] = t;
  }
  function buildDetails() {
    const T = G.T, mats = [], plane = (k) => mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ map: posterTex(k), transparent: k % 8 === 7, alphaTest: k % 8 === 7 ? .3 : 0, side: THREE.DoubleSide, emissive: '#2a2830' }));
    const metal = sm('#4a4e54', { roughness: .6, metalness: .5 }), dark = sm('#1c1c22', { roughness: 1 }), yel = sm('#c8a82a', { roughness: .8 }), red = sm('#a02a24', { roughness: .7 }), wood = sm('#6a5238', { roughness: 1 }), white = sm('#d8d4c8', { roughness: 1 });
    const glowM = c => new THREE.MeshBasicMaterial({ color: c }), bulb = glowM('#ffd890');
    const doors = new Set(); G.BUILDINGS.forEach(b => { if (b.door) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) doors.add((b.door[0] + dx) + ',' + (b.door[1] + dy)); });
    let np = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.detDone) return; rec.detDone = true;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1;
      const r = rng(bi * 311 + 29), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], base - .1, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      const lightAt = (a, x, y, z, col, I, D) => { const q = new THREE.Vector3(x, y, z); a.updateMatrixWorld(true); q.applyMatrix4(a.matrixWorld); addLight(q.x, q.y, q.z, col, I, D, .05); };
      // --- manifesti, volantini, scritte: sul piano terra, sui lati che danno sulla strada ---
      sides.forEach(sd => {
        const n = 2 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const u = .7 + r() * Math.max(.1, sd.len - 1.4), a = mkA(sd, u), kind = Math.floor(r() * 24) % 16, big = kind % 8 !== 6 && kind % 8 !== 7 && r() < .6, sz = big ? [.6, .85] : [.34, .46];
          const m = new THREE.Mesh(new THREE.PlaneGeometry(sz[0], sz[1]), plane(kind)); m.rotation.z = (r() - .5) * .1; ad(a, m, 0, .9 + r() * 1.3 + (kind % 8 === 7 ? .3 : 0), .07 + r() * .01);
          if (kind % 8 === 7) m.scale.set(2.2, 2.2, 1);
        }
        // piccoli oggetti attaccati al muro
        const extra = Math.floor(r() * 4);
        for (let k = 0; k < extra; k++) {
          const a = mkA(sd, .6 + r() * Math.max(.1, sd.len - 1.2)), t = r();
          if (t < .25) { ad(a, box(.3, .4, .14, metal), 0, 1.4, .1); ad(a, box(.24, .04, .02, dark), 0, 1.5, .18); }                          // contatore
          else if (t < .45) { ad(a, cyl(.14, .14, .08, 8, dark), 0, 2.3, .1).rotation.x = Math.PI / 2; ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), 0, 2.3, .18); if (r() < .3) lightAt(a, 0, 2.3, .5, '#ffb35c', 1.1, 6); }   // lampada a muro
          else if (t < .6) { ad(a, box(.04, 2.6, .04, yel), .3, 1.3, .08); ad(a, box(.6, .04, .04, yel), 0, 1.0, .08); }                       // tubo del gas
          else if (t < .75) { ad(a, box(.3, .38, .16, red), 0, 1.3, .1); ad(a, box(.2, .03, .02, dark), 0, 1.38, .19); }                       // cassetta delle lettere
          else if (t < .9) { ad(a, cyl(.22, .22, .06, 10, metal), 0, 2.0 + r() * .6, .08).rotation.x = Math.PI / 2; ad(a, box(.3, .03, .03, dark), 0, 2.0, .12); }   // griglia di sfiato
          else { ad(a, box(.16, .26, .06, white), 0, 1.3, .08); ad(a, box(.1, .04, .02, glowM('#38e8ff')), 0, 1.38, .12); }                      // citofono
        }
      });
      // --- il carattere del locale, davanti alla porta ---
      if (b.door) {
        const f = faceOf(b), sd = { S: 0, N: 1, E: 2, W: 3 }[f], S0 = [
          { at: u => [x0 + u, z0 + d], yaw: 0 }, { at: u => [x0 + w - u, z0], yaw: Math.PI }, { at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2 }, { at: u => [x0, z0 + u], yaw: -Math.PI / 2 }][sd];
        const lt = f === 'S' ? b.door[0] - b.x : f === 'N' ? b.x + b.w - 1 - b.door[0] : f === 'E' ? b.y + b.h - 1 - b.door[1] : b.door[1] - b.y, u0 = (lt * TS + TS / 2) + (f === 'S' || f === 'N' ? 0 : 0);
        const a = mkA(S0, u0 + .3), use = b.use || (b.warehouse ? 'magazzino' : b.church ? 'chiesa' : '');
        const table = (x, z) => { ad(a, cyl(.4, .4, .05, 8, wood), x, .78, z); ad(a, cyl(.05, .05, .75, 5, metal), x, .4, z); [[-.5, 0], [.5, 0]].forEach(([dx]) => { ad(a, cyl(.17, .17, .04, 6, red), x + dx, .48, z); ad(a, cyl(.03, .03, .46, 4, metal), x + dx, .24, z); }); };
        if (use === 'bar' || use === 'trattoria' || use === 'osteria') { table(-1.6, 1.8); table(1.8, 2.0); ad(a, box(.5, .8, .06, dark), 0, .4, 1.4); for (let k = 0; k < 6; k++) { const q = ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), -2.2 + k * .85, 2.6 - Math.sin(k / 5 * Math.PI) * .25, 2.4); } ad(a, box(4.4, .02, .02, dark), 0, 2.55, 2.4); lightAt(a, 0, 2.4, 2.2, '#ffb35c', 1.8, 9); }
        else if (use === 'panetteria' || use === 'forno') { [-1.1, 1.3].forEach(x => { ad(a, box(.7, .4, .5, wood), x, .2, 1.1); ad(a, box(.6, .12, .4, sm('#c8923c', { roughness: 1 })), x, .46, 1.1); }); ad(a, box(.5, .9, .05, dark), 1.9, .45, 1.6); }
        else if (use === 'pescheria') { for (let k = 0; k < 3; k++) { ad(a, box(.8, .35, .5, sm('#8ab0c4', { roughness: .8 })), -1.2 + k * 1.0, .18, 1.1); ad(a, box(.7, .08, .4, sm('#c8d8e0', { roughness: .5 })), -1.2 + k * 1.0, .38, 1.1); } }
        else if (use === 'ferramenta' || use === 'officina' || use === 'garage') { for (let k = 0; k < 3; k++) { ad(a, cyl(.3, .3, .4, 10, dark), -1.4 + k * .35, .2 + k * .0, 1.2 + (k % 2) * .4); } ad(a, cyl(.3, .3, .9, 10, rust0()), 1.6, .45, 1.2); ad(a, box(.1, 2.2, .1, metal), 2.4, 1.1, .5).rotation.z = .12; ad(a, box(.1, 2.2, .1, metal), 2.8, 1.1, .5).rotation.z = .12; }
        else if (use === 'farmacia' || use === 'ambulatorio') { const cr = glowM('#4dff9a'); ad(a, box(.14, 1.0, .9, dark), -1.2, 3.3, .45); ad(a, box(.18, .72, .24, cr), -1.2, 3.3, .45); ad(a, box(.18, .24, .72, cr), -1.2, 3.3, .45); lightAt(a, -1.2, 3.3, 1.1, '#4dff9a', 1.5, 8); }
        else if (use === 'barbiere') { ad(a, cyl(.1, .1, .8, 8, white), -1.1, 1.5, .25); ad(a, cyl(.105, .105, .2, 8, red), -1.1, 1.65, .25); ad(a, cyl(.105, .105, .2, 8, sm('#2a4a9a', { roughness: .7 })), -1.1, 1.35, .25); }
        else if (use === 'tabacchi') { ad(a, box(.14, .8, .6, sm('#1a3a8a', { roughness: .7 })), -1.2, 3.2, .35); ad(a, box(.16, .55, .1, white), -1.2, 3.2, .34); }
        else if (use === 'teatro' || use === 'cinema') { ad(a, box(4.2, .5, 1.1, dark), 0, 3.4, .6); for (let k = 0; k < 9; k++) ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), -1.9 + k * .48, 3.2, 1.18); ad(a, box(.9, 1.3, .06, red), -2.6, 1.4, .1); ad(a, box(.9, 1.3, .06, sm('#2a3a8a', { roughness: .8 })), 2.6, 1.4, .1); lightAt(a, 0, 3, 1.4, '#ffd890', 2, 10); }
        else if (use === 'magazzino') { for (let k = 0; k < 6; k++) ad(a, box(.9, .9, .9, wood), -1.6 + (k % 3) * 1.0, .45 + Math.floor(k / 3) * .9, 1.3).rotation.y = (k - 2) * .1; ad(a, box(1.6, .14, 1.2, wood), 2.4, .1, 1.4); }
        else if (use === 'casa' || use === 'cascina' || !use) { ad(a, cyl(.22, .18, .35, 8, sm('#7a4a34', { roughness: 1 })), -1.2, .18, .5); ad(a, new THREE.Mesh(new THREE.SphereGeometry(.2, 6, 5), sm('#3a5a34', { roughness: 1 })), -1.2, .5, .5); if (r() < .5) { ad(a, box(.05, .9, 1.7, metal), 1.5, .45, 1.1).rotation.y = Math.PI / 2; ad(a, cyl(.3, .3, .06, 10, dark), 1.5, .35, 1.1).rotation.z = Math.PI / 2; } }
        else if (use === 'chiesa') { [-1.5, 1.5].forEach(x => { ad(a, cyl(.14, .14, 1.4, 6, white), x, .7, .9); ad(a, new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), glowM('#ffb35c')), x, 1.5, .9); }); }
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.detGrp = gm; np++; }
    });
    // --- arredo di strada: colonnine, cabine, cassette, Ape parcheggiate ---
    const rs = rng(7007), kit = new THREE.Group(), apeCol = ['#c8b43a', '#3a6a8a', '#a04a3a', '#e8e4dc', '#4a7a52'], used = new Set(); let apes = 0, cols = 0;
    for (let ty = 28; ty < 104; ty++) for (let tx = 166; tx < 242; tx++) {
      if (G.tileAt(tx, ty) !== T.WALK || doors.has(tx + ',' + ty)) continue;
      let vx = 0, vz = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.tileAt(tx + dx, ty + dy) === T.VIA) { vx = dx; vz = dy; }
      if (!vx && !vz) continue; const q = rs(), X = tx * TS + 1 + vx * .75, Z = ty * TS + 1 + vz * .75, Y = groundH(X, Z);
      if (q < .05) { for (const o of [-.8, .8]) { const bl = cyl(.1, .12, .8, 7, dark); bl.position.set(X + (vz ? o : 0), Y + .4, Z + (vx ? o : 0)); kit.add(bl); const cap = cyl(.105, .105, .1, 7, yel); cap.position.set(X + (vz ? o : 0), Y + .72, Z + (vx ? o : 0)); kit.add(cap); } }
      else if (q < .066 && cols < 40) { cols++; const col = ['#38e8ff', '#ff3fa4', '#ffe03a'][Math.floor(rs() * 3)], c2 = box(.5, 1.9, .5, sm('#2a2c34', { roughness: .6, metalness: .4 })); c2.position.set(X - vx * .3, Y + .95, Z - vz * .3); kit.add(c2); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.34, .5), glowM(col)); sc.position.set(X - vx * .3 + vx * -.0, Y + 1.35, Z - vz * .3); if (vx) { sc.position.x += vx * -.26; sc.rotation.y = -vx * Math.PI / 2; } else { sc.position.z += vz * -.26; sc.rotation.y = vz > 0 ? Math.PI : 0; } kit.add(sc); }
      else if (q < .074) { const m = box(.4, .55, .4, sm('#a02a24', { roughness: .6 })); m.position.set(X, Y + .8, Z); kit.add(m); const l = box(.1, .8, .1, dark); l.position.set(X, Y + .4, Z); kit.add(l); }
      else if (q < .082 && apes < 14) { apes++; const ap = apeMesh(apeCol[Math.floor(rs() * apeCol.length)]); ap.position.set(X - vx * .3, Y, Z - vz * .3); ap.rotation.y = vx ? (rs() < .5 ? 0 : Math.PI) : (rs() < .5 ? Math.PI / 2 : -Math.PI / 2); shadowed(ap); kit.add(ap); }
    }
    scene.add(kit);
    return np;
  }
  const rust0 = () => sm('#7a4a34', { roughness: 1 });
  // ---- secondo giro: murales, stendardi, bucato tra le case, bovindi, arredo urbano ----
  const MURAL = {};
  function muralTex(k) {
    if (MURAL[k]) return MURAL[k];
    const W = 48, H = 32, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(k, n, 33), kind = k % 6;
    x.fillStyle = ['#14182a', '#1e1418', '#101c24', '#1c1c14', '#2a1420', '#141e18'][kind]; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(Math.floor(h(i) * W), Math.floor(h(i + 50) * H), 3, 1); }
    if (kind === 0) { x.strokeStyle = '#38e8ff'; x.lineWidth = 2; x.beginPath(); x.ellipse(24, 16, 15, 8, 0, 0, 6.3); x.stroke(); x.fillStyle = '#38e8ff'; x.beginPath(); x.arc(24, 16, 5, 0, 6.3); x.fill(); x.fillStyle = '#14182a'; x.fillRect(23, 14, 3, 4); }
    else if (kind === 1) { x.fillStyle = '#ff3fa4'; x.fillRect(12, 14, 22, 8); x.fillRect(32, 12, 7, 5); x.fillRect(8, 10, 5, 5); x.fillStyle = '#0a0a0e'; x.fillRect(20, 6, 8, 8); x.fillRect(34, 22, 8, 2); }
    else if (kind === 2) { x.strokeStyle = '#38a8ff'; x.lineWidth = 3; for (let r2 = 0; r2 < 3; r2++) { x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 8 + r2 * 8 + Math.sin(i * .35 + r2) * 3); x.stroke(); } }
    else if (kind === 3) { x.fillStyle = '#d8281f'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .6283 - 1.57, rr = i % 2 ? 5 : 12; x.lineTo(24 + Math.cos(a) * rr, 16 + Math.sin(a) * rr); } x.fill(); x.fillStyle = '#ffe03a'; x.fillRect(22, 14, 4, 4); }
    else if (kind === 4) { x.fillStyle = '#ffe03a'; x.fillRect(16, 4, 16, 18); x.fillStyle = '#2a1420'; x.fillRect(19, 9, 4, 3); x.fillRect(26, 9, 4, 3); x.fillRect(20, 16, 9, 2); x.strokeStyle = '#ff3fa4'; x.lineWidth = 2; x.beginPath(); x.moveTo(10, 28); x.lineTo(38, 6); x.stroke(); }
    else { ['#ff3fa4', '#38e8ff', '#ffe03a', '#7dff6a'].forEach((col, i) => { x.fillStyle = col; x.font = 'bold 13px sans-serif'; x.fillText('РЕЗ'.charAt(i % 3) || 'Я', 4 + i * 11, 12 + (i % 2) * 11); }); }
    return MURAL[k] = canvasTex(c);
  }
  function buildDetails2() {
    const T = G.T, cloth = ['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a', '#7a9a6a', '#c86aa0'].map(c => sm(c, { roughness: 1 })), dark = sm('#1c1c22', { roughness: 1 }), metal = sm('#4a4e54', { roughness: .6, metalness: .5 });
    const glowM = c => new THREE.MeshBasicMaterial({ color: c }), WALLC = ['#8a8278', '#7a7e86', '#8e7a68', '#6e7a70'];
    const mats = {}, lam = (k, tex) => mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ map: tex, emissive: '#26242c', side: THREE.DoubleSide }));
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.det2) return; rec.det2 = true;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1, fl = Math.max(1, b.fl || 1);
      const r = rng(bi * 523 + 71), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) }, { len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) }, { len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], base - .1, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      sides.forEach(sd => {
        if (sd.len > 5 && r() < .4) { const a = mkA(sd, 1.6 + r() * (sd.len - 3.2)), k = Math.floor(r() * 12), m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1), lam('m' + (k % 6), muralTex(k))); ad(a, m, 0, 1.5 + r() * .5, .09); }
        if (fl >= 3 && r() < .3) { const a = mkA(sd, 1 + r() * (sd.len - 2)), f = 1 + Math.floor(r() * (fl - 1)), y = base + MG + (f - 1) * MF + .3, k = [0, 3, 5][Math.floor(r() * 3)];
          const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, 2.4), lam('b' + k, posterTex(k))); ad(a, m, 0, y + 1.2, .5); ad(a, box(.05, .05, .9, metal), 0, y + 2.45, .45); m.rotation.y = r() < .5 ? 0 : 0; m.rotation.x = -.04; const m2 = m.clone(); m2.rotation.y = Math.PI; m2.position.z = .52; a.add(m2); }
        if (fl >= 3 && r() < .28) { const f = 2 + Math.floor(r() * (fl - 2)), a = mkA(sd, 1.2 + r() * (sd.len - 2.4)), y = base + MG + (f - 1) * MF; ad(a, box(1.7, 1.5, .8, sm(WALLC[Math.floor(r() * 4)], { roughness: 1 })), 0, y + .75, .4); ad(a, box(1.8, .1, .9, sm('#bcc0c6', { roughness: 1 })), 0, y + 1.55, .42); ad(a, new THREE.Mesh(new THREE.PlaneGeometry(1.3, .9), glowM(r() < .6 ? '#ffd890' : '#38e8ff')), 0, y + .8, .81); }
      });
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.det2Grp = gm; n++; }
    });
    // bucato steso tra le case, attraverso i vicoli
    const lg = new THREE.Group(), pts = [], rl = rng(8181), bs = dyn.buildings.filter(q => q.b && q.b.fl >= 2);
    for (let i = 0; i < bs.length; i++) { let links = 0; for (let j = i + 1; j < bs.length && links < 1; j++) {
      const A = bs[i].box3, B = bs[j].box3, ax = (A.min.x + A.max.x) / 2, az = (A.min.z + A.max.z) / 2, bx = (B.min.x + B.max.x) / 2, bz = (B.min.z + B.max.z) / 2, L = Math.hypot(bx - ax, bz - az);
      const gap = Math.max(B.min.x - A.max.x, A.min.x - B.max.x, B.min.z - A.max.z, A.min.z - B.max.z); if (gap < 3 || gap > 9 || L > 34 || rl() < .55) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.VIA && G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.WALK && G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.COB) continue;
      const cl = (P, q) => { const dx = q[0] - (P.min.x + P.max.x) / 2, dz = q[1] - (P.min.z + P.max.z) / 2, hx = (P.max.x - P.min.x) / 2, hz = (P.max.z - P.min.z) / 2, k = Math.min(hx / (Math.abs(dx) || 1e-6), hz / (Math.abs(dz) || 1e-6)); return [(P.min.x + P.max.x) / 2 + dx * k, (P.min.z + P.max.z) / 2 + dz * k]; };
      const p0 = cl(A, [bx, bz]), p1 = cl(B, [ax, az]), y = A.min.y + MG + MF * (1 + Math.floor(rl() * 2)) + .5, Ln = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (Ln < 3) continue;
      let prev = [p0[0], y, p0[1]]; for (let k = 1; k <= 8; k++) { const t = k / 8, sag = Math.sin(t * Math.PI) * Ln * .05, cur = [p0[0] + (p1[0] - p0[0]) * t, y - sag, p0[1] + (p1[1] - p0[1]) * t]; pts.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]); prev = cur; }
      for (let t = .15; t < .9; t += .12 + rl() * .08) { const sag = Math.sin(t * Math.PI) * Ln * .05, c = box(.32, .5 + rl() * .3, .03, cloth[Math.floor(rl() * cloth.length)]); c.position.set(p0[0] + (p1[0] - p0[0]) * t, y - sag - .28, p0[1] + (p1[1] - p0[1]) * t); c.rotation.y = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]) + Math.PI / 2; lg.add(c); }
      links++; } }
    if (pts.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH)); const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#2a2a30' })); ln.frustumCulled = false; scene.add(ln); }
    scene.add(shadowed(mergeGroup(lg), false, false));
    // arredo urbano contro i muri: bidoni, sacchi, bancali, panchine, distributori, edicole
    const rs = rng(6006), kit = new THREE.Group(), binM = sm('#2e4a3a', { roughness: .8 }), bagM = sm('#16161a', { roughness: .9 }), snow = sm('#c4c8ce', { roughness: 1 }), palM = sm('#8a6a44', { roughness: 1 }), benchM = sm('#5a4636', { roughness: 1 });
    let cnt = 0;
    for (let ty = 28; ty < 104 && cnt < 260; ty++) for (let tx = 166; tx < 242 && cnt < 260; tx++) {
      if (G.tileAt(tx, ty) !== T.WALK) continue; let wx = 0, wz = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.tileAt(tx + dx, ty + dy) === T.BLD) { wx = dx; wz = dy; }
      if (!wx && !wz) continue; const q = rs(), X = tx * TS + 1 + wx * .6, Z = ty * TS + 1 + wz * .6, Y = groundH(X, Z), yaw = Math.atan2(-wx, -wz);
      const put = (o, x, y, z) => { o.position.set(X + x, Y + y, Z + z); kit.add(o); return o; };
      if (q < .1) { cnt++; put(cyl(.3, .27, .85, 9, binM), 0, .42, 0); put(cyl(.32, .32, .08, 9, snow), 0, .88, 0); if (rs() < .6) { put(new THREE.Mesh(new THREE.SphereGeometry(.28, 6, 5), bagM), wz ? .6 : 0, .25, wx ? .6 : 0); put(new THREE.Mesh(new THREE.SphereGeometry(.22, 6, 5), bagM), wz ? .9 : .3, .2, wx ? .9 : .3); } }
      else if (q < .15) { cnt++; for (let k = 0; k < 3; k++) put(box(1, .14, 1.2, palM), 0, .07 + k * .14, 0).rotation.y = yaw + (k - 1) * .08; put(box(.7, .5, .6, sm('#b88a5a', { roughness: 1 })), 0, .64, 0).rotation.y = yaw; }
      else if (q < .19) { cnt++; const bn = new THREE.Group(); bn.position.set(X, Y, Z); bn.rotation.y = yaw; kit.add(bn); const add2 = (o, x, y, z) => { o.position.set(x, y, z); bn.add(o); }; add2(box(1.6, .08, .45, benchM), 0, .5, .35); add2(box(1.6, .5, .06, benchM), 0, .78, .12); add2(box(.08, .5, .4, dark), -.7, .25, .35); add2(box(.08, .5, .4, dark), .7, .25, .35); }
      else if (q < .215) { cnt++; const col = ['#ff3fa4', '#38e8ff', '#ffe03a', '#ff7a2a'][Math.floor(rs() * 4)], vm = new THREE.Group(); vm.position.set(X, Y, Z); vm.rotation.y = yaw; kit.add(vm); const b1 = box(.8, 1.9, .65, sm('#2a2c34', { roughness: .6, metalness: .4 })); b1.position.set(0, .95, .35); vm.add(b1); const fr = new THREE.Mesh(new THREE.PlaneGeometry(.6, 1.2), glowM(col)); fr.position.set(0, 1.2, .69); vm.add(fr); }
      else if (q < .225) { cnt++; const kk = new THREE.Group(); kk.position.set(X, Y, Z); kk.rotation.y = yaw; kit.add(kk); const a2 = (o, x, y, z) => { o.position.set(x, y, z); kk.add(o); return o; }; a2(box(1.8, 2.2, 1.2, sm('#4a5a4a', { roughness: .8 })), 0, 1.1, .8); a2(box(2.1, .1, 1.6, sm('#a02a24', { roughness: 1 })), 0, 2.3, .9); a2(new THREE.Mesh(new THREE.PlaneGeometry(1.4, .8), new THREE.MeshBasicMaterial({ map: posterTex(Math.floor(rs() * 16)) })), 0, 1.4, 1.42); }
    }
    scene.add(shadowed(mergeGroup(kit), true, false));
    return n;
  }
