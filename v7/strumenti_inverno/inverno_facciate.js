  // ================= [inverno] CARATTERE DELLE FACCIATE =================
  // Ogni edificio ha qualcosa che lo distingue: scale antincendio a zig-zag, tubi, condizionatori appesi, insegne a bandiera
  // verticali al neon, serbatoi sul tetto con l'insegna luminosa, cavi tesi da un tetto all'altro con lampade.
  const FACT = {};
  function labelTex(text, col, vert, w, h) {
    const key = text + col + vert; if (FACT[key]) return FACT[key];
    const c = mk(w, h), x = c.getContext('2d'); x.fillStyle = '#0c0a10'; x.fillRect(0, 0, w, h);
    x.strokeStyle = col; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (vert) { x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.font = 'bold ' + Math.floor(w * .62) + 'px sans-serif'; x.fillText(text, 0, 2); x.restore(); }
    else { x.font = 'bold ' + Math.floor(h * .56) + 'px sans-serif'; x.fillText(text, w / 2, h / 2 + 2); x.fillText(text, w * 1.5, h / 2 + 2); }
    // lettere spente e tubo rotto
    x.fillStyle = 'rgba(12,10,16,.82)'; for (let i = 0; i < 2; i++) x.fillRect(Math.floor(vegHash(text.length, i, 4) * (w - 12)) + 4, Math.floor(vegHash(i, text.length, 5) * (h - 12)) + 4, vert ? w - 10 : 10, vert ? 8 : h - 10);
    const t = canvasTex(c); return FACT[key] = t;
  }
  const NEONS = ['#ffe03a', '#ff3fa4', '#38e8ff', '#ff7a2a', '#7dff6a'], WORDS = ['ПОМПА', 'РАБОТА', 'НОВОСТИ', 'ОТЕЛЬ', 'БАР', 'АПТЕКА', 'СКЛАД', '24 ЧАСА', '새 일자리', '약국', '酒', 'ЛОМБАРД', 'КИНО', 'ЧАЙ', '식당'];
  function buildFacades() {
    const T = G.T, st = sm('#3a3d44', { roughness: .7, metalness: .5 }), rust = sm('#6a4636', { roughness: 1 }), pipeM = sm('#4a4e54', { roughness: .6, metalness: .5 }), acM = sm('#8a8e94', { roughness: .6 });
    const cables = [], anchors = [];
    let nn = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.facDone) return;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1, top = bb.max.y - 2.5, fl = Math.max(1, b.fl || 1);
      const r = rng(bi * 977 + 13), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { n: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { n: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { n: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { n: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], 0, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      if (sides.length && fl >= 2) {
        // scala antincendio
        if (fl >= 3 && r() < .5) { const sd = sides[Math.floor(r() * sides.length)], u = Math.min(sd.len - 1.6, 1 + r() * (sd.len - 3)), a = mkA(sd, u + .8);
          for (let f = 1; f < fl; f++) { const y = base + MG + (f - 1) * MF - .05; ad(a, box(1.8, .07, .85, st), 0, y, .43); ad(a, box(1.8, .05, .04, st), 0, y + .9, .85); ad(a, box(.04, .9, .04, st), -.9, y + .45, .85); ad(a, box(.04, .9, .04, st), .9, y + .45, .85);
            if (f < fl - 1) { const s2 = f % 2 ? 1 : -1, stp = box(1.9, .06, .6, st); ad(a, stp, -s2 * .05, y + MF / 2, .45).rotation.z = s2 * Math.atan(MF / 1.9); } } }
        // tubi lungo il muro
        if (r() < .55) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, .5 + r() * (sd.len - 1)); ad(a, cyl(.07, .07, top - base, 6, pipeM), 0, base + (top - base) / 2, .1); for (let f = 1; f < fl; f++) ad(a, box(.2, .06, .2, pipeM), 0, base + MG + (f - 1) * MF, .1); }
        // condizionatori appesi alla facciata
        const nac = Math.floor(r() * 4); for (let k = 0; k < nac; k++) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, .8 + r() * (sd.len - 1.6)), f = 1 + Math.floor(r() * (fl - 1)); ad(a, box(.8, .5, .45, acM), 0, base + MG + (f - 1) * MF + .2, .25); ad(a, cyl(.17, .17, .03, 8, pipeM), 0, base + MG + (f - 1) * MF + .2, .5).rotation.x = Math.PI / 2; }
        // insegna a bandiera verticale al neon
        if (b.use && r() < .6) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, 1 + r() * Math.max(.1, sd.len - 2)), word = WORDS[Math.floor(r() * WORDS.length)], col = NEONS[Math.floor(r() * NEONS.length)];
          const m = new THREE.MeshBasicMaterial({ map: labelTex(word.slice(0, 5), col, true, 48, 160) }); const H = 2.2 + r() * .8, y = base + MG * .5 + H / 2 + 1;
          [-1, 1].forEach(s2 => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.8, H), m); pl.rotation.y = s2 * Math.PI / 2; ad(a, pl, s2 * .06, y, .55); }); ad(a, box(.1, .08, .7, st), 0, y + H / 2, .35); ad(a, box(.1, .08, .7, st), 0, y - H / 2, .35);
          const L = addLight(...(() => { const q = new THREE.Vector3(); q.set(0, y, 1.1); a.updateMatrixWorld(true); q.applyMatrix4(a.matrixWorld); return [q.x, q.y, q.z]; })(), col, 1.3, 7, .04); }
      }
      // serbatoio sul tetto con l'insegna luminosa
      if (fl >= 3 && w >= 6 && d >= 6 && r() < .32) {
        const tx = bb.min.x + 1.8 + r() * Math.max(.1, w - 4.4), tz = bb.min.z + 1.8 + r() * Math.max(.1, d - 4.4), R = 1.5 + r() * .5, H = 1.5, col = NEONS[Math.floor(r() * NEONS.length)], word = WORDS[Math.floor(r() * WORDS.length)];
        const t = labelTex(word, col, false, 256, 64).clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1, 1);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 18, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); body.position.set(tx, top + 1.2 + H / 2, tz); body.rotation.y = r() * 6; g.add(body);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * .2, R * 1.04, .7, 18), sm('#2e3036', { roughness: .8 })); cap.position.set(tx, top + 1.2 + H + .35, tz); g.add(cap);
        const bot = cyl(R * 1.04, R * .9, .3, 18, sm('#2e3036', { roughness: .8 })); bot.position.set(tx, top + 1.2 + .1, tz); g.add(bot);
        for (let k = 0; k < 4; k++) { const a = k * 1.571 + .7, lg = cyl(.07, .07, 1.3, 5, st); lg.position.set(tx + Math.cos(a) * R * .8, top + .65, tz + Math.sin(a) * R * .8); g.add(lg); }
        const ring = cyl(R * 1.12, R * 1.12, .06, 18, st); ring.position.set(tx, top + 1.2 + H + .02, tz); g.add(ring);
        addLight(tx, top + 1.2 + H * .6, tz, col, 2.2, 14, .03);
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.facGrp = gm; nn++; }
      rec.facDone = true;
      // punti d'attacco dei cavi: gli spigoli del tetto
      anchors.push({ rec, cx: bb.min.x + w / 2 - .3, cz: bb.min.z + d / 2 - .3, hx: w / 2, hz: d / 2, y: top + .5 });
    });
    // cavi tesi da un tetto all'altro, con qualche lampada appesa
    const pts = []; const rc = rng(5151), lampM = ['#ffb35c', '#ff3fa4', '#38e8ff'].map(c => new THREE.MeshBasicMaterial({ color: c })), lg = new THREE.Group();
    anchors.forEach((A, i) => { let links = 0; for (let j = i + 1; j < anchors.length && links < 2; j++) { const B = anchors[j], dx = B.cx - A.cx, dz = B.cz - A.cz, L = Math.hypot(dx, dz); if (L < 11 || L > 30 || rc() < .45) continue;
      const edge = (P, sx, sz) => { const k = Math.min(P.hx / (Math.abs(sx) || 1e-6), P.hz / (Math.abs(sz) || 1e-6)); return [P.cx + sx * k, P.cz + sz * k]; }, ux = dx / L, uz = dz / L, p0 = edge(A, ux, uz), p1 = edge(B, -ux, -uz), y0 = A.y, y1 = B.y, Ln = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (Ln < 4) continue;
      let prev = [p0[0], y0, p0[1]]; for (let k = 1; k <= 7; k++) { const t = k / 7, sag = Math.sin(t * Math.PI) * Ln * .04, cur = [p0[0] + (p1[0] - p0[0]) * t, y0 + (y1 - y0) * t - sag, p0[1] + (p1[1] - p0[1]) * t]; pts.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]); prev = cur; }
      links++; if (rc() < .3) { const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, my = (y0 + y1) / 2 - Ln * .04 - .3, m = new THREE.Mesh(new THREE.SphereGeometry(.16, 6, 5), lampM[Math.floor(rc() * 3)]); m.position.set(mx, my, mz); lg.add(m); if (rc() < .6) addLight(mx, my, mz, '#ffb35c', 1.4, 9, .05); } } });
    if (pts.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH)); const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#15151b' })); ln.frustumCulled = false; scene.add(ln); }
    scene.add(lg);
    return nn;
  }
