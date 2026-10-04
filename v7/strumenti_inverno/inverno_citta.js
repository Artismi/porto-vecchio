  // ================= [inverno] CITTÀ: ogni edificio ha una personalità =================
  // Volumi sul tetto (torrette con finestre accese, rialzi, baracche), balconi a sbalzo con condizionatori e piante,
  // insegne verticali fitte al neon, schermi pubblicitari e del regime, parabole e antenne. Colori forti, non pastello.
  const CITY = {};
  const CGLY = ['電', '脳', '夜', '薬', '酒', '食', '銀', '館', 'РАБ', 'БАР', 'МИР', 'ЧАЙ', '약', '국', '24', 'HOTEL', 'OK', 'ЛОМ', '診', '愛'];
  const CCOL = ['#38e8ff', '#ff3fa4', '#e8ff3a', '#7dff6a', '#ff7a2a', '#b07aff'];
  function cityWin(pane) {
    const key = 'w' + pane; if (CITY[key]) return CITY[key];
    const c = mk(64, 24), x = c.getContext('2d'), e = mk(64, 24), ex = e.getContext('2d'), n = 4;
    x.fillStyle = '#1c2026'; x.fillRect(0, 0, 64, 24); ex.fillStyle = '#000'; ex.fillRect(0, 0, 64, 24);
    for (let k = 0; k < n; k++) { const px = 2 + k * 15.5, on = (k * 7 + pane.length) % 4 !== 0; x.fillStyle = on ? pane : '#2a3640'; x.fillRect(px, 4, 12, 16); if (on) { ex.fillStyle = pane; ex.fillRect(px, 4, 12, 16); ex.fillStyle = '#000'; ex.fillRect(px + 5, 4, 1, 16); } }
    return CITY[key] = std({ map: canvasTex(c), emissiveMap: canvasTex(e), emissive: '#ffffff', emissiveIntensity: 1, roughness: .85 });
  }
  function bladeMat(col, seed) {
    const key = 'b' + col + seed; if (CITY[key]) return CITY[key];
    const W = 32, H = 128, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(seed, n, 31);
    x.fillStyle = '#0a0b10'; x.fillRect(4, 0, 24, H); x.fillStyle = col; x.fillRect(4, 0, 2, H); x.fillRect(26, 0, 2, H);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col;
    for (let k = 0; k < 5; k++) { const gl = CGLY[Math.floor(h(k) * CGLY.length)]; x.globalAlpha = h(k + 9) < .15 ? .25 : 1; x.font = 'bold ' + (gl.length > 2 ? 11 : 19) + 'px sans-serif'; x.fillText(gl, W / 2, 13 + k * 25); }
    x.globalAlpha = 1; const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return CITY[key] = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false });
  }
  function adMat(k) {
    const key = 'a' + k; if (CITY[key]) return CITY[key];
    const c = mk(64, 36), x = c.getContext('2d'), col = CCOL[k % CCOL.length], col2 = CCOL[(k + 2) % CCOL.length];
    x.fillStyle = '#060a10'; x.fillRect(0, 0, 64, 36); x.fillStyle = col; x.fillRect(0, 0, 64, 3); x.fillRect(0, 33, 64, 3);
    x.fillStyle = col2; x.beginPath(); x.arc(20, 18, 10 + k % 3, 0, 7); x.fill(); x.fillStyle = '#060a10'; x.beginPath(); x.arc(24, 16, 8 + k % 3, 0, 7); x.fill();
    x.fillStyle = col; for (let q = 0; q < 4; q++) x.fillRect(36, 8 + q * 6, 18 - q * 3 + (k % 2) * 4, 3);
    for (let q = 0; q < 36; q += 3) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, q, 64, 1); }
    const t = canvasTex(c); return CITY[key] = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false });
  }
  function buildCity() {
    const T = G.T, WALLS = ['#3f6f78', '#8a5a44', '#6a7078', '#a89a64', '#4a5a52', '#7a4a58', '#58606a', '#a06a3c'];
    const dishG = new THREE.SphereGeometry(.55, 10, 4, 0, Math.PI * 2, 0, Math.PI * .4), dishM = sm('#c0c4c8', { roughness: .5, metalness: .3, side: THREE.DoubleSide });
    const iron = sm('#23262a', { roughness: .8, metalness: .3 }), conc = sm('#6c7074', { roughness: 1 }), tin = sm('#58605c', { roughness: .65, metalness: .45 }), acM = sm('#8a8e94', { roughness: .6 }), plant = sm('#2f5a34', { roughness: 1 });
    const PANE = ['#ffb050', '#ffc070', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b, g0 = rec.geo; if (!b || !g0 || rec.cityDone) return;
      const w = g0.w, d = g0.d, x0 = g0.x0, z0 = g0.z0, base = g0.y0, fl = Math.max(1, b.fl || 1), top = rec.box3.max.y - 2.5;
      if (w < 3.6 || d < 3.6) return;
      const r = rng(bi * 211 + 5), g = new THREE.Group(), gs = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { n: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { n: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { n: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { n: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (grp, sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], 0, p[1]); a.rotation.y = sd.yaw; grp.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      const put = (o, x, y, z, ry) => { o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      // ---- volumi sul tetto ----
      const q = r(), wallC = pick(r, WALLS), wallM = sm(wallC, { roughness: .95 });
      if (rec.flat && fl >= 2 && w >= 6 && d >= 6) {
        const pw = Math.max(2.6, w * (.38 + r() * .2)), pd = Math.max(2.6, d * (.38 + r() * .2)), ox = (r() - .5) * (w - pw - .6), oz = (r() - .5) * (d - pd - .6), cx = x0 + w / 2 + ox, cz = z0 + d / 2 + oz;
        if (q < .34) { // torretta di avvistamento con la cintura di finestre accese e il tetto a sbalzo
          const H = 2.5 + r() * 1.2, wm = cityWin(pick(r, PANE));
          put(box(pw, H, pd, wallM), cx, H / 2, cz).position.y += top; g.children[g.children.length - 1].position.y = top + H / 2;
          const ring = [[0, pd / 2 + .02, 0, pw * .92], [0, -pd / 2 - .02, Math.PI, pw * .92], [pw / 2 + .02, 0, Math.PI / 2, pd * .92], [-pw / 2 - .02, 0, -Math.PI / 2, pd * .92]];
          ring.forEach(([dx, dz, ry, len]) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, H * .5), wm); pl.position.set(cx + dx, top + H * .58, cz + dz); pl.rotation.y = ry; g.add(pl); });
          put(box(pw + 1, .22, pd + 1, iron), cx, top + H + .12, cz);
          const k = Math.floor(r() * 3); for (let a = 0; a < 2 + k; a++) { const ax = cx + (r() - .5) * pw * .8, az = cz + (r() - .5) * pd * .8, hh = 1.6 + r() * 2.4; put(cyl(.03, .035, hh, 5, iron), ax, top + H + .2 + hh / 2, az); for (let c2 = 0; c2 < 4; c2++) put(box(1.2 - c2 * .22, .03, .03, iron), ax, top + H + .5 + c2 * .42, az, r() * 3); }
          const dsh = new THREE.Mesh(dishG, dishM); dsh.scale.setScalar(.8 + r() * .8); dsh.rotation.set(.9, r() * 6, 0); put(dsh, cx + (r() - .5) * pw, top + H + .6, cz + (r() - .5) * pd);
        } else if (q < .56) { // rialzo con un'altra tinta e il tetto in lamiera
          const H = 2.3 + r() * 1.4;
          put(box(pw, H, pd, wallM), cx, top + H / 2, cz); put(box(pw + .3, .14, pd + .3, tin), cx, top + H + .07, cz);
          const dm = box(.9, 1.9, .12, iron); put(dm, cx, top + 1, cz + pd / 2 + .06);
          [-1, 1].forEach(s2 => put(box(.7, .8, .06, cityWin(pick(r, PANE)).clone()), cx + s2 * pw * .28, top + H * .6, cz + pd / 2 + .04));
          for (let k = 0; k < 2; k++) put(box(.8, .55, .6, acM), cx + (r() - .5) * pw * .7, top + H + .36, cz + (r() - .5) * pd * .7, r() * 3);
        } else if (q < .7) { // baracche di lamiera addossate: città vissuta sui tetti
          for (let k = 0; k < 3; k++) { const sw = 1.6 + r() * 1.6, sd2 = 1.4 + r() * 1.2, sh = 1.7 + r() * .9, sx = x0 + 1.5 + r() * (w - 3), sz = z0 + 1.5 + r() * (d - 3); put(box(sw, sh, sd2, k % 2 ? tin : sm(pick(r, ['#5a6a5c', '#7a5a44', '#4a5a6a']), { roughness: .9 })), sx, top + sh / 2, sz, r() * 1.5); put(box(sw + .2, .08, sd2 + .2, iron), sx, top + sh + .04, sz, 0).rotation.y = g.children[g.children.length - 2].rotation.y; }
        }
      }
      // parabole e antenne su quasi tutto
      for (let k = 0, m = rec.flat ? 1 + Math.floor(r() * 3) : 0; k < m; k++) { const ax = x0 + 1 + r() * (w - 2), az = z0 + 1 + r() * (d - 2); if (r() < .5) { put(cyl(.04, .04, 1.1, 5, iron), ax, top + .55, az); const ds = new THREE.Mesh(dishG, dishM); ds.scale.setScalar(.6 + r() * .7); ds.rotation.set(.9, r() * 6, 0); put(ds, ax, top + 1.2, az); } else { const hh = 2 + r() * 3; put(cyl(.03, .035, hh, 5, iron), ax, top + hh / 2, az); const ry0 = r() * 3; for (let c2 = 0; c2 < 5; c2++) put(box(1.3 - c2 * .22, .03, .03, iron), ax, top + hh * .45 + c2 * hh * .12, az, ry0); } }
      // ---- balconi a sbalzo con condizionatori e piante sul lato di strada ----
      if (sides.length && fl >= 3 && r() < .75) {
        const sd = pick(r, sides), nb = 1 + Math.floor(r() * 3);
        for (let k = 0; k < nb; k++) {
          const bw = 1.8 + r() * 1.6, u = .8 + r() * Math.max(.1, sd.len - bw - 1.6), a = mkA(g, sd, u + bw / 2), f = 1 + Math.floor(r() * (fl - 1)), y = base + MG + (f - 1) * MF + .03;
          ad(a, box(bw, .12, .95, conc), 0, y, .5); ad(a, box(bw, .05, .05, iron), 0, y + .95, .97); [-1, 1].forEach(s2 => ad(a, box(.05, .95, .05, iron), s2 * bw / 2, y + .48, .97)); for (let c2 = 0; c2 <= 6; c2++) ad(a, box(.03, .9, .03, iron), -bw / 2 + c2 * bw / 6, y + .48, .97);
          if (r() < .6) ad(a, box(.8, .55, .5, acM), -bw / 2 + .6, y + .4, .55);
          for (let c2 = 0, np = Math.floor(r() * 3); c2 < np; c2++) ad(a, new THREE.Mesh(new THREE.IcosahedronGeometry(.26, 0), plant), bw / 2 - .4 - c2 * .45, y + .3, .7);
          if (r() < .4) { const cn = box(bw + .3, .06, 1.2, tin); ad(a, cn, 0, y + 1.9, .6).rotation.x = .2; }
        }
      }
      // ---- insegne verticali fitte, schermi ----
      if (sides.length) {
        const nbl = r() < .9 ? 2 + Math.floor(r() * 3) : 0;
        for (let k = 0; k < nbl; k++) {
          const sd = pick(r, sides), u = r() < .5 ? .5 + r() * 1.2 : sd.len - .5 - r() * 1.2, a = mkA(gs, sd, Math.max(.4, Math.min(sd.len - .4, u))), col = pick(r, CCOL), H = 2.2 + r() * 3.4, y = Math.max(base + 2.7, top - 1.2 - r() * 2) - 0;
          const mt = bladeMat(col, bi * 5 + k), bl = new THREE.Mesh(new THREE.PlaneGeometry(.75, H), mt); bl.rotation.y = Math.PI / 2; ad(a, bl, 0, y - H / 2 + 1.4, .62);
          ad(a, box(.05, .05, .65, iron), 0, y + 1.3, .33); ad(a, box(.05, .05, .65, iron), 0, y + 1.3 - H + .2, .33);
          const gl = glow(a.position.x + Math.sin(sd.yaw) * .62, y - H / 2 + 1.4, a.position.z + Math.cos(sd.yaw) * .62, col, 3.2); gl.material.opacity = .4;
          dyn.signs.push({ m: mt, gl, flick: r() < .3 });
          if (k === 0 && r() < .5) addLight(a.position.x + Math.sin(sd.yaw) * 1.6, y - H / 2 + 1.4, a.position.z + Math.cos(sd.yaw) * 1.6, col, 2.4, 9, .08);
        }
        if (r() < .45) { const sd = pick(r, sides), u = 1.2 + r() * Math.max(.1, sd.len - 3.6), a = mkA(gs, sd, u + 1.6), reg = r() < .3, mt = reg ? eyeMat('screen') : adMat(bi), tall = r() < .5, sw = tall ? 1.8 : 3.2, sh = tall ? 3.2 : 1.8;
          const sc = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mt); ad(a, sc, 0, Math.max(base + 3, top - sh / 2 - 1.2), .1); ad(a, box(sw + .15, sh + .15, .08, iron), 0, sc.position.y, .04);
          const gl = glow(a.position.x + Math.sin(sd.yaw) * .4, sc.position.y, a.position.z + Math.cos(sd.yaw) * .4, reg ? '#7ff0e0' : pick(r, CCOL), 5.5); gl.material.opacity = .35; dyn.signs.push({ m: mt, gl, flick: r() < .3 }); }
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), true, true); ownMats(gm, rec); scene.add(gm); rec.cityGrp = gm; n++; }
      if (gs.children.length) scene.add(gs);
      rec.cityDone = true;
    });
    return n;
  }
