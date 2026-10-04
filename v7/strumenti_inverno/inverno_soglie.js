  // ================= [inverno] SOGLIE: tettoie, fermate, vicoli e luoghi di mezzo =================
  // Tra la casa e la strada c'è sempre qualcosa: lamiera e teli, portici, panche, fuochi in barile, fermate dell'autobus, un cavo con una lampadina in un vicolo.
  // Le luci qui sono piccole e basse: illuminano sotto le tettoie e nei vicoli, non la strada.
  function buildThresholds() {
    const T = G.T, r = rng(7717), g = new THREE.Group(), V3 = new THREE.Vector3();
    const iron = sm('#23262a', { roughness: .8, metalness: .3 }), tin = sm('#4e5652', { roughness: .65, metalness: .45 }), rustM = sm('#6a4a38', { roughness: 1 }), conc = sm('#6c7074', { roughness: 1 }), wood = sm('#5a4632', { roughness: 1 }), woodD = sm('#3a2e24', { roughness: 1 });
    const glassM = std({ color: '#7fc8d0', roughness: .2, transparent: true, opacity: .28, side: THREE.DoubleSide });
    const TARPS = ['#3a5a64', '#5a3a40', '#3e4a3a', '#4a4a58', '#5a5036'].map(c => sm(c, { roughness: 1, side: THREE.DoubleSide }));
    const litM = c => { const m = std({ color: '#161616', emissive: c, emissiveIntensity: .8, roughness: 1 }); (dyn.backdropMats = dyn.backdropMats || []).push(m); return m; };
    const L = { amber: litM('#ffb050'), cyan: litM('#38e8ff'), mag: litM('#ff3fa4'), cold: litM('#bfeee6') };
    const bulb = sb('#ffc070');
    const A = (px, pz, yaw) => { const gg = new THREE.Group(); gg.position.set(px, groundH(px, pz), pz); gg.rotation.y = yaw; g.add(gg); gg.updateMatrixWorld(true); return gg; };
    const bx = (gg, w, h, dd, mat, x, y, z, rx, ry, rz) => { const m = box(w, h, dd, mat); m.position.set(x, y, z); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); gg.add(m); return m; };
    const cy = (gg, rt, rb, h, mat, x, y, z, seg) => { const m = cyl(rt, rb, h, seg || 7, mat); m.position.set(x, y, z); gg.add(m); return m; };
    const lamp = (gg, x, y, z, col, i, dist, sz) => { const v = V3.set(x, y, z).applyMatrix4(gg.matrixWorld); addLight(v.x, v.y, v.z, col, i, dist, .05); const gl = glow(v.x, v.y, v.z, col, sz || 2.4); gl.material.opacity = .3; };
    const hang = (gg, x, y, z) => { cy(gg, .008, .008, .5, iron, x, y + .25, z, 3); const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), bulb); b.position.set(x, y, z); gg.add(b); };
    const stool = (gg, x, z) => { cy(gg, .16, .16, .04, wood, x, .45, z); cy(gg, .03, .03, .45, iron, x, .22, z, 4); };
    const table = (gg, x, z) => { bx(gg, .9, .05, .6, woodD, x, .78, z); [[-.4, -.25], [.4, -.25], [-.4, .25], [.4, .25]].forEach(([a, b]) => bx(gg, .04, .78, .04, iron, x + a, .39, z + b)); };
    const crates = (gg, x, z) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) bx(gg, .55, .4, .55, wood, x + (r() - .5) * .5, .2 + k * .4, z + (r() - .5) * .3, 0, r() * 1.2, 0); };
    const barrel = (gg, x, z, fire) => { cy(gg, .3, .3, .85, rustM, x, .43, z, 8); if (fire) { bx(gg, .4, .2, .4, L.amber, x, .92, z); lamp(gg, x, 1.1, z, '#ffa040', 2.2, 7, 2.6); } };
    const col = () => TARPS[Math.floor(r() * TARPS.length)];
    // ---- tettoie davanti alle porte ----
    const WLK = v => v === T.WALK || v === T.COB || v === T.PIAZZA || v === T.QUAY;
    let nc = 0;
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (!b.door || b.military || b.farm || b.wood || b.church || b.lighthouse || b.kiosk) return;
      const dd = M.world && M.world.districtAt ? M.world.districtAt(b.x * TS) : 'centro'; if (dd === 'prateria' || dd === 'foresta' || dd === 'base') return;
      const [dx, dy] = b.door; if (!WLK(G.tileAt(dx, dy))) return;
      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;
      const f = faceOf(b), x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, cx = (dx + .5) * TS, cz = (dy + .5) * TS;
      const P = f === 'S' ? [cx, z0 + d, 0] : f === 'N' ? [cx, z0, Math.PI] : f === 'E' ? [x0 + w, cz, Math.PI / 2] : [x0, cz, -Math.PI / 2];
      const gg = A(P[0], P[1], P[2]), k = Math.floor(r() * 4), W = k === 1 ? 6 : 4.4, D = 2.0 + (k === 1 ? .2 : 0);
      if (k === 0) { // lamiera
        [-1, 1].forEach(s => bx(gg, .08, 2.9, .08, iron, s * W / 2, 1.45, D)); bx(gg, W + .5, .07, D + .6, tin, 0, 3.05, D / 2, .1);
        bx(gg, W - .6, .04, .12, L.amber, 0, 2.93, D - .25); hang(gg, -W * .22, 2.8, D * .6); crates(gg, W * .3, D * .7); barrel(gg, -W / 2 + .5, D * .75, r() < .35); lamp(gg, 0, 2.7, D * .55, '#ffb050', 2.4, 7);
      } else if (k === 1) { // portico a colonne
        for (let c = 0; c <= 3; c++) cy(gg, .17, .2, 3.2, conc, -W / 2 + c * W / 3, 1.6, D, 8); bx(gg, W + .4, .3, .45, conc, 0, 3.35, D); bx(gg, W + .4, .1, D, conc, 0, 3.25, D / 2);
        for (let c = 0; c < 3; c++) { bx(gg, W / 3 - .6, .04, .1, c === 1 ? L.cold : L.amber, -W / 3 + c * W / 3, 3.18, D * .5); } bx(gg, 2.2, .08, .45, wood, -W * .22, .5, D * .8); lamp(gg, 0, 3.0, D * .5, '#ffb050', 2.6, 8);
        if (r() < .5) bx(gg, .05, 1.1, .05, r() < .5 ? L.cyan : L.mag, W / 2 + .1, 2.2, D);
      } else if (k === 2) { // telo teso
        [-1, 1].forEach(s => { const p = bx(gg, .06, 2.7, .06, iron, s * W / 2, 1.35, D); p.rotation.x = -.04; }); bx(gg, W, .04, D + .5, col(), 0, 2.85, D / 2, .3);
        hang(gg, 0, 2.3, D * .55); table(gg, W * .22, D * .6); stool(gg, W * .22 - .5, D * .6); stool(gg, W * .22 + .5, D * .6); lamp(gg, 0, 2.2, D * .55, '#ffb050', 2.2, 6.5);
      } else { // gazebo di teli e pallet
        [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(gg, .07, 2.6, .07, iron, sx * W / 2, 1.3, .2 + sz * (D - .2)));
        bx(gg, W + .3, .05, D + .2, col(), 0, 2.65, D / 2, 0, 0, (r() - .5) * .2); bx(gg, W * .5, .05, .09, r() < .5 ? L.cyan : L.mag, 0, 2.55, D);
        bx(gg, 1.2, .14, .9, wood, -W * .25, .08, D * .7); bx(gg, 1.2, .14, .9, wood, -W * .25, .22, D * .7, 0, .3, 0); crates(gg, W * .25, D * .6); lamp(gg, 0, 2.4, D * .5, '#ffb050', 2, 6.5);
      }
      nc++;
    });
    // ---- fermate dell'autobus ----
    const stops = []; let nb = 0;
    for (let ty = 2; ty < G.GH - 2 && nb < 14; ty += 2) for (let tx = 2; tx < G.GW - 2 && nb < 14; tx += 2) {
      if (G.tileAt(tx, ty) !== T.WALK) continue;
      const dirs = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]], dr = dirs.find(([ax, ay]) => G.tileAt(tx + ax, ty + ay) === T.VIA && G.tileAt(tx - ax, ty - ay) !== T.VIA);
      if (!dr) continue; const px = (tx + .5) * TS, pz = (ty + .5) * TS;
      if (r() > .05 || stops.some(s => Math.hypot(s[0] - px, s[1] - pz) < 55)) continue;
      const gg = A(px - dr[0] * .5, pz - dr[1] * .5, dr[2]); stops.push([px, pz]); nb++;
      bx(gg, 3, 2.1, .04, glassM, 0, 1.15, -.6); [-1, 1].forEach(s => bx(gg, .04, 2.1, 1.1, glassM, s * 1.5, 1.15, -.05)); bx(gg, 3.4, .09, 1.7, iron, 0, 2.3, 0); [-1, 1].forEach(s => bx(gg, .06, 2.3, .06, iron, s * 1.55, 1.15, .75));
      bx(gg, 2.4, .07, .4, wood, 0, .5, -.35); [-1, 1].forEach(s => bx(gg, .05, .5, .35, iron, s * 1.0, .25, -.35)); bx(gg, 2.6, .04, .16, L.cold, 0, 2.23, .1);
      const lb = bx(gg, .14, 1.9, 1.1, iron, 1.95, 1.1, .1), k = (tx * 3 + ty) % 2; [-1, 1].forEach(s => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.7), adMat(k)); pl.rotation.y = s * Math.PI / 2; pl.position.set(1.95 + s * .08, 1.1, .1); gg.add(pl); });
      cy(gg, .04, .04, 3, iron, -2.0, 1.5, .5, 5); const sg = new THREE.Mesh(new THREE.PlaneGeometry(.9, .26), new THREE.MeshBasicMaterial({ map: signTexture(pick(r, ['12', 'Н-7', '44К', '3', 'НОЧЬ']), '#ffb050'), toneMapped: false })); sg.position.set(-2.0, 3.05, .55); gg.add(sg);
      barrel(gg, 2.3, -.4, false); lamp(gg, 0, 2.1, .1, '#8fe0d4', 2.4, 8, 2.2);
    }
    // ---- stazioni: lunga pensilina su una spianata libera ----
    let ns = 0; const free = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.PIAZZA || v === T.COB || v === T.WALK; };
    for (let ty = 3; ty < G.GH - 4 && ns < 2; ty += 2) for (let tx = 3; tx < G.GW - 9 && ns < 2; tx += 2) {
      let ok = true; for (let j = 0; j < 3 && ok; j++) for (let i = 0; i < 7 && ok; i++) if (!free(tx + i, ty + j)) ok = false; if (!ok || r() > .35) continue;
      const px = (tx + 3.5) * TS, pz = (ty + 1.5) * TS, gg = A(px, pz, 0); ns++;
      for (let c = 0; c < 5; c++) { cy(gg, .09, .09, 3.2, iron, -6 + c * 3, 1.6, .6, 6); cy(gg, .09, .09, 3.2, iron, -6 + c * 3, 1.6, -1.6, 6); }
      bx(gg, 13, .12, 3.6, tin, 0, 3.25, -.5, .06); bx(gg, 12, .05, .14, L.cold, 0, 3.15, .6); bx(gg, 12, .05, .14, L.cold, 0, 3.15, -1.6);
      for (let c = 0; c < 4; c++) { bx(gg, 2.2, .07, .45, wood, -4.5 + c * 3, .5, -1.1); }
      bx(gg, 12.6, .03, .3, L.amber, 0, .02, 1.5); bx(gg, 2.6, 2.2, 1.6, iron, 5.2, 1.1, -1.9); bx(gg, 1.8, .9, .05, L.cyan, 5.2, 1.5, -1.07);
      const bd = bx(gg, 3.6, 1.1, .1, iron, -2, 2.5, -2.2); const bp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .9), eyeMat('screen')); bp.position.set(-2, 2.5, -2.14); gg.add(bp);
      lamp(gg, -3, 3, -.5, '#8fe0d4', 3, 11, 3); lamp(gg, 3, 3, -.5, '#8fe0d4', 3, 11, 3);
    }
    // ---- vicoli: un cavo con una lampadina e un po' di roba ----
    const alleys = []; let na = 0;
    for (let ty = 2; ty < G.GH - 2 && na < 70; ty++) for (let tx = 2; tx < G.GW - 2 && na < 70; tx++) {
      const v = G.tileAt(tx, ty); if (!(v === T.COB || v === T.WALK || v === T.PIAZZA || v === T.DIRT)) continue;
      const B2 = (a, b) => G.tileAt(a, b) === T.BLD, ew = (B2(tx - 1, ty) || B2(tx - 2, ty)) && (B2(tx + 1, ty) || B2(tx + 2, ty)), ns2 = (B2(tx, ty - 1) || B2(tx, ty - 2)) && (B2(tx, ty + 1) || B2(tx, ty + 2));
      if (!ew && !ns2) continue; const px = (tx + .5) * TS, pz = (ty + .5) * TS;
      if (r() > .5 || alleys.some(s => Math.hypot(s[0] - px, s[1] - pz) < 7)) continue;
      alleys.push([px, pz]); na++;
      const gg = A(px, pz, ew ? 0 : Math.PI / 2); bx(gg, 2.1, .02, .02, iron, 0, 3.3, 0); hang(gg, 0, 2.95, 0); lamp(gg, 0, 2.9, 0, r() < .8 ? '#ffb050' : '#38e8ff', 1.7, 6, 2.1);
      if (r() < .6) barrel(gg, .7, .6, r() < .2); if (r() < .5) crates(gg, -.6, -.5); if (r() < .3) bx(gg, .05, 1, .05, r() < .5 ? L.cyan : L.mag, .85, 2.2, .1);
      if (r() < .4) { cy(gg, .06, .06, 2.4, iron, -.85, 1.2, .1, 5); bx(gg, .3, .3, .3, iron, -.85, 2.5, .1); }
    }
    // ---- luoghi comuni: fuoco in barile con panche, distributori, bacheca del regime ----
    let nk = 0;
    for (let ty = 3; ty < G.GH - 3 && nk < 16; ty += 2) for (let tx = 3; tx < G.GW - 3 && nk < 16; tx += 2) {
      if (G.tileAt(tx, ty) !== T.PIAZZA && G.tileAt(tx, ty) !== T.COB) continue;
      let open = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (free(tx + i, ty + j)) open++; if (open < 9 || r() > .02) continue;
      const px = (tx + .5) * TS, pz = (ty + .5) * TS, gg = A(px, pz, r() * 6.28), kk = nk % 3; nk++;
      if (kk === 0) { barrel(gg, 0, 0, true); [0, 2.1, 4.2].forEach(a => bx(gg, 1.4, .1, .35, wood, Math.cos(a) * 1.5, .42, Math.sin(a) * 1.5, 0, -a + 1.57, 0)); }
      else if (kk === 1) { for (let c = 0; c < 3; c++) { bx(gg, .85, 1.9, .7, iron, -1.1 + c * 1.1, .95, 0); bx(gg, .6, .9, .04, [L.cyan, L.mag, L.amber][c], -1.1 + c * 1.1, 1.3, .37); } lamp(gg, 0, 2.2, .8, '#38e8ff', 1.8, 6, 2); }
      else { bx(gg, 2.4, 1.7, .1, iron, 0, 1.3, 0); const bp = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), eyeMat('banner')); bp.position.set(0, 1.3, .06); gg.add(bp); [-1, 1].forEach(s => cy(gg, .04, .04, 2.2, iron, s * 1.1, 1.1, 0, 5)); for (let c = 0; c < 4; c++) cy(gg, .025, .025, 1.1, iron, -1.2 + c * .8, .55, 1.6, 4); bx(gg, 3, .03, .03, L.amber, 0, 1.05, 1.6); }
    }
    const gm = shadowed(mergeGroup(g), true, true); scene.add(gm);
    return nc + nb + ns + na + nk;
  }
