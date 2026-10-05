  // ================= [isola32] IL TAVOLATO E IL POTERE: la parete del tepui, i palazzi del governo =================
  const I32 = { tex: {} };
  function tex32(key, w, h, draw, rep) { if (I32.tex[key]) return I32.tex[key]; const c = mk(w, h), x = c.getContext('2d'); draw(x, rng(key.length * 97 + 13)); const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return (I32.tex[key] = t); }
  // granito rosato a conci, cemento macchiato (colature, muschio giallo-verde), rame verde
  const granitoT = () => tex32('granito', 64, 64, (x, r) => { x.fillStyle = '#7a5a50'; x.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) for (let i = (y / 8 % 2) * 8; i < 64; i += 16) { x.fillStyle = pick(r, ['#8a685c', '#80604f', '#946e60', '#76584c']); x.fillRect(i, y, 15, 7); for (let k = 0; k < 20; k++) { x.fillStyle = 'rgba(30,20,20,' + r() * .25 + ')'; x.fillRect(i + r() * 15, y + r() * 7, 1, 1); } } });
  const cementoT = () => tex32('cemento', 64, 64, (x, r) => { x.fillStyle = '#8a887e'; x.fillRect(0, 0, 64, 64); for (let k = 0; k < 26; k++) { const px = r() * 64, len = 10 + r() * 50, g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(34,34,30,.5)'); g.addColorStop(1, 'rgba(34,34,30,0)'); x.fillStyle = g; x.fillRect(px, r() * 20, 1 + r() * 3, len); }
    for (let k = 0; k < 10; k++) { x.fillStyle = 'rgba(120,120,60,' + (.15 + r() * .2) + ')'; x.beginPath(); x.ellipse(r() * 64, r() * 64, 3 + r() * 8, 2 + r() * 5, 0, 0, 6.3); x.fill(); } for (let y = 0; y < 64; y += 16) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, y, 64, 1); } });
  const roccia32 = () => tex32('rocciaT', 64, 64, (x, r) => { x.fillStyle = '#6e6660'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 2) { x.fillStyle = pick(r, ['#7a726a', '#665e58', '#827a70', '#5e5650', '#706a62']); x.fillRect(i, 0, 2, 64); } for (let y = 0; y < 64; y += 9 + Math.floor(r() * 6)) { x.fillStyle = 'rgba(30,26,24,.35)'; x.fillRect(0, y, 64, 1); } for (let k = 0; k < 8; k++) { x.fillStyle = 'rgba(80,96,60,.35)'; x.fillRect(r() * 64, r() * 64, 2, 6 + r() * 10); } });
  const finestreT = (lit) => tex32('fin' + lit, 32, 32, (x, r) => { x.fillStyle = '#2a2a30'; x.fillRect(0, 0, 32, 32); for (let y = 2; y < 32; y += 8) for (let i = 2; i < 32; i += 8) { x.fillStyle = r() < (lit ? .35 : 0) ? pick(r, ['#c89048', '#d8a860', '#b88040']) : pick(r, ['#14161c', '#1a1c22', '#20222a']); x.fillRect(i, y, 5, 5); } });
  const mat32 = (t, rep, o) => { const m = std(Object.assign({ map: t.clone(), roughness: .95 }, o || {})); m.map.needsUpdate = true; m.map.repeat.set(rep[0], rep[1]); return m; };
  function finish32(b, i, grp, base, low, H) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS;
    shadowed(grp); const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);
    const rec = { b, flat: false, special: true, grp: merged, fade: 0, box3: new THREE.Box3(new THREE.Vector3(x0 + .3, low, z0 + .3), new THREE.Vector3(x0 + w - .3, base + H, z0 + d - .3)), mats: [] };
    ownMats(merged, rec); dyn.buildings.push(rec); rec.geo = { x0, z0, w, d, y0: base, H }; DZ.bRec[i] = rec; return rec;
  }
  // una statua colossale squadrata: in piedi su una colonna, regge un globo di luce
  function colosso(grp, x, y, z, ry, s, stone) {
    const g = new THREE.Group(), lamp = new THREE.MeshBasicMaterial({ color: '#f4e4c0', toneMapped: false });
    add(g, box(1.6 * s, 4 * s, 1.4 * s, stone), 0, 2 * s, 0);                       // il fusto-colonna (le gambe sono dentro la pietra)
    add(g, box(1.9 * s, 2.2 * s, 1.3 * s, stone), 0, 5.1 * s, 0);                   // il torace
    add(g, box(1.1 * s, 1.3 * s, 1 * s, stone), 0, 6.9 * s, -.1 * s);               // la testa, i capelli lunghi lisci
    add(g, box(1.2 * s, 1 * s, .5 * s, stone), 0, 6.6 * s, -.55 * s);
    [-1, 1].forEach(sd => { add(g, box(.55 * s, .55 * s, 1.9 * s, stone), sd * .95 * s, 5.2 * s, .7 * s); add(g, box(.6 * s, .9 * s, .6 * s, stone), sd * 1.05 * s, 5.9 * s, 0); });
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.75 * s, 10, 8), lamp); gl.position.set(0, 5.3 * s, 1.75 * s); gl.userData.keep = true; g.add(gl);
    for (let k = 0; k < 4; k++) add(g, box(.05 * s, 1.5 * s, 1.5 * s, sm('#2a2622')), 0, 5.3 * s, 1.75 * s, 0, k * .785, 0);
    g.position.set(x, y, z); g.rotation.y = ry; grp.add(g);
    const wx = x + Math.sin(ry) * 1.75 * s, wz = z + Math.cos(ry) * 1.75 * s; glow(wx, y + 5.3 * s, wz, '#f4dca0', 3.4 * s); addLight(wx, y + 5.3 * s, wz + 0, '#f0d0a0', 2.2, 12, .02).always = true;
  }
  // il Palazzo del Governo: granito a lesene, i due colossi all'ingresso, la torre dell'orologio col cupolino di rame
  function palazzoGoverno(b, i, base, low) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group(), H = 16;
    const gr = mat32(granitoT(), [w / 6, H / 6]), grD = sm('#5a4038', { roughness: 1 }), rame = sm('#6a9a86', { roughness: .7, metalness: .2 });
    add(grp, box(w, H, d, gr), cx, base + H / 2, cz); add(grp, box(w + .6, 1.2, d + .6, grD), cx, base + H + .6, cz);
    // lesene a fascio e finestre strette alte tra una e l'altra
    const face = faceOf(b), N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face], along = N[1] !== 0, len = along ? w : d;
    for (let u = 1.5; u < len - 1; u += 3) { const px = along ? x0 + u : cx + N[0] * (w / 2 + .25), pz = along ? cz + N[1] * (d / 2 + .25) : z0 + u;
      add(grp, box(along ? .7 : .5, H - 1, along ? .5 : .7, grD), px, base + H / 2, pz);
      if (u + 1.5 < len - 1) { const wx = along ? x0 + u + 1.5 : cx + N[0] * (w / 2 + .03), wz = along ? cz + N[1] * (d / 2 + .03) : z0 + u + 1.5; add(grp, box(along ? 1 : .05, H - 6, along ? .05 : 1, litMat(pick(rng(u * 7), LIT))), wx, base + 4 + (H - 6) / 2, wz); } }
    // il portale e i due colossi che reggono i globi
    const px = cx + N[0] * (w / 2), pz = cz + N[1] * (d / 2), tx = along ? 1 : 0, tz = along ? 0 : 1;
    add(grp, box(along ? 5 : .6, 6, along ? .6 : 5, grD), px + N[0] * .3, base + 3, pz + N[1] * .3); add(grp, box(along ? 3.6 : .2, 4.6, along ? .2 : 3.6, sm('#18140f')), px + N[0] * .62, base + 2.3, pz + N[1] * .62);
    [-1, 1].forEach(sd => colosso(grp, px + N[0] * 1.1 + tx * sd * 3.8, base, pz + N[1] * 1.1 + tz * sd * 3.8, Math.atan2(N[0], N[1]), 1.05, gr));
    // la torre dell'orologio sull'angolo, col cupolino di rame verde e i quadranti
    const tw = 6, th = 30, tcx = x0 + (N[0] > 0 || N[1] < 0 ? w - tw / 2 : tw / 2), tcz = z0 + (N[1] > 0 || N[0] < 0 ? d - tw / 2 : tw / 2);
    add(grp, box(tw, th, tw, mat32(granitoT(), [1, th / 6])), tcx, base + th / 2, tcz);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, ox = Math.sin(a) * (tw / 2 + .02), oz = Math.cos(a) * (tw / 2 + .02); const q = new THREE.Mesh(new THREE.CircleGeometry(1.5, 20), litMat('#e8dcb0')); q.position.set(tcx + ox, base + th - 3, tcz + oz); q.rotation.y = a; grp.add(q); add(grp, box(.08, 1.1, .05, sm('#1a1410')), tcx + ox * 1.01, base + th - 3 + .4, tcz + oz * 1.01, 0, a, 0); }
    add(grp, box(tw + .8, 3.4, tw + .8, rame), tcx, base + th + 1.7, tcz); add(grp, new THREE.Mesh(new THREE.ConeGeometry(tw * .5, 4.5, 8), rame), tcx, base + th + 5.6, tcz);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => add(grp, new THREE.Mesh(new THREE.SphereGeometry(.7, 8, 6, 0, 6.3, 0, 1.6), rame), tcx + a * (tw / 2 + .2), base + th + 3.6, tcz + c * (tw / 2 + .2)));
    // le prese d'aria a feritoie sul tetto
    for (let k = 0; k < 4; k++) add(grp, box(3, 1.6, d - 3, rame), x0 + 3 + k * (w - 6) / 3, base + H + 2, cz);
    finish32(b, i, grp, base, low, th + 8);
    addLight(tcx, base + th - 3, tcz, '#e8d8a0', 1.4, 10, 0).always = true;
  }
  // gli Uffici del Garante: la torre col busto colossale del Garante in uniforme incastrato nella facciata, sopra il portico curvo
  function ufficiGarante(b, i, base, low) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group(), H = 30;
    const cem = mat32(cementoT(), [w / 8, H / 8]), stone = sm('#7e7a72', { roughness: 1 }), stoneD = sm('#5e5a54', { roughness: 1 });
    add(grp, box(w, H, d, cem), cx, base + H / 2, cz);
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([nx, nz]) => { const len = nz ? w : d, m = std({ map: finestreT(true).clone(), emissive: '#ffffff', emissiveMap: finestreT(true).clone(), emissiveIntensity: 0, roughness: .8 }); m.map.needsUpdate = true; m.map.repeat.set(len / 3, H / 3); m.emissiveMap.needsUpdate = true; m.emissiveMap.repeat.set(len / 3, H / 3);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(len - 1, H - 6), m); pl.position.set(cx + nx * (w / 2 + .02), base + 4 + (H - 6) / 2, cz + nz * (d / 2 + .02)); pl.rotation.y = Math.atan2(nx, nz); grp.add(pl); });
    // il busto sul lato della piazza (ovest), alto due terzi della torre
    const N = [-1, 0], bx = x0 - .6, by = base + 8, s = 2.1;
    add(grp, box(4.5, 2, w * .9, stoneD), bx - 1.6, base + 7, cz);                                         // il portico curvo
    add(grp, box(3 * s, 7 * s, 4.8 * s, stone), bx - 1.4 * s, by + 3.5 * s, cz);                           // il petto con le medaglie
    [-1, 1].forEach(sd => { add(grp, box(3.2 * s, 1.3 * s, 2 * s, stone), bx - 1.2 * s, by + 6.6 * s, cz + sd * 2.9 * s); add(grp, box(.6 * s, .25 * s, 1.6 * s, sm('#8a8270')), bx - 2.6 * s, by + 7.2 * s, cz + sd * 2.9 * s); });   // le spalle e le spalline
    for (let k = 0; k < 6; k++) add(grp, cyl(.22 * s, .22 * s, .2 * s, 8, sm('#8a8270')), bx - 2.95 * s, by + 2 * s + k * .8 * s, cz - .5 * s, 0, 0, Math.PI / 2);   // i bottoni
    add(grp, box(2.2 * s, 1.2 * s, 2.4 * s, stone), bx - 1.4 * s, by + 7.6 * s, cz);                         // il collo col colletto alto
    add(grp, box(2.6 * s, 3 * s, 2.4 * s, stone), bx - 1.6 * s, by + 9.4 * s, cz);                           // la testa
    add(grp, box(.5 * s, .7 * s, .6 * s, stone), bx - 3 * s, by + 9.3 * s, cz);                              // il naso
    add(grp, cyl(1.9 * s, 1.7 * s, 1.2 * s, 14, stoneD), bx - 1.6 * s, by + 11.3 * s, cz);                   // il berretto
    add(grp, box(1.6 * s, .2 * s, 2.6 * s, stoneD), bx - 2.9 * s, by + 10.8 * s, cz, 0, 0, -.25);            // la visiera
    finish32(b, i, grp, base, low, H + 2);
    glow(bx - 3 * s, by + 4, cz, '#c8a070', 8); addLight(bx - 6, base + 4, cz, '#e0b070', 2.4, 16, 0).always = true;
  }
  // il Ministero dell'Ordine: piramidi di cemento a gradoni, macchiate, con la torre delle scale
  function ministero(b, i, base, low) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group(), cem = mat32(cementoT(), [3, 2]), cemD = mat32(cementoT(), [2, 1], { color: '#8a8a7a' });
    add(grp, box(w, 4, d, cem), cx, base + 2, cz);
    const step = (ccx, ccz, R, y0, n) => { let y = y0; for (let k = 0; k < n; k++) { const r0 = R * (1 - k / (n + 1)), r1 = r0 * .72, h = 3.2; const fr = new THREE.Mesh(new THREE.CylinderGeometry(r1 * Math.SQRT1_2 * 1.0, r0 * Math.SQRT1_2 * 1.42, h, 4), cemD); fr.rotation.y = Math.PI / 4; fr.position.set(ccx, y + h / 2, ccz); grp.add(fr); add(grp, box(r1 * 1.1, .4, r1 * 1.1, cem), ccx, y + h + .2, ccz); y += h + .4; }
      const tip = new THREE.Mesh(new THREE.ConeGeometry(R * .32, 6, 4), cemD); tip.rotation.y = Math.PI / 4; tip.position.set(ccx, y + 3, ccz); grp.add(tip); return y + 6; };
    const h1 = step(cx - w * .12, cz + d * .1, w * .55, base + 4, 4), h2 = step(cx + w * .28, cz - d * .22, w * .32, base + 4, 3);
    add(grp, box(3, 26, 3, cem), x0 + 2, base + 13, z0 + 2);
    for (let y = base + 6; y < base + 24; y += 2.4) add(grp, box(3.1, .5, .1, sm('#1a1a1c')), x0 + 2, y, z0 + 3.55);
    finish32(b, i, grp, base, low, Math.max(h1, h2) - base);
  }
  // La Pietra dell'Onda: il fusto di cemento con la scala esterna e la capsula rossa a finestre in cima
  function pietraOnda(b, i, base, low) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group(), cem = mat32(cementoT(), [2, 6]), red = sm('#a8402e', { roughness: .6, metalness: .2 }), redD = sm('#7a2a20', { roughness: .7 });
    const stemH = 26; add(grp, cyl(3.2, 3.6, stemH, 14, cem), cx, base + stemH / 2, cz); add(grp, box(w, 3.6, d, cem), cx, base + 1.8, cz);
    // la scala esterna a rampe, sul lato della strada
    for (let k = 0; k < 7; k++) { const y = base + 3.6 + k * 3.2, sd = k % 2 ? 1 : -1; add(grp, box(3, .25, 1.4, cem), cx + sd * 1.5, y + 1.6, cz + 4.2, sd * .45, 0, 0); add(grp, box(1.4, .2, 1.4, cem), cx + sd * 3.2, y + 3.2, cz + 4.2); add(grp, box(.06, 1, 1.4, sm('#2a2a2a')), cx + sd * 3.9, y + 3.7, cz + 4.2); }
    // la capsula: tre piani che si allargano a sbalzo, otto facce, finestre a nastro con le costole rosse
    let y = base + stemH, R = 5.6;
    for (let k = 0; k < 3; k++) { const h = 3.2, r0 = R + k * .9, body = new THREE.Mesh(new THREE.CylinderGeometry(r0 + .9, r0, h, 8), red); body.position.set(cx, y + h / 2, cz); body.rotation.y = Math.PI / 8; grp.add(body);
      for (let q = 0; q < 8; q++) { const a = q / 8 * 6.283 + Math.PI / 8, rr = r0 + .5; const wpl = box(3.6, 1.6, .1, litMat(pick(rng(q + k * 9), LIT))); wpl.position.set(cx + Math.sin(a) * rr, y + h * .55, cz + Math.cos(a) * rr); wpl.rotation.set(-.2, a, 0); grp.add(wpl);
        add(grp, box(.35, h + .2, .5, redD), cx + Math.sin(a + .39) * (rr + .2), y + h / 2, cz + Math.cos(a + .39) * (rr + .2), 0, a + .39, 0); }
      y += h; }
    add(grp, cyl(R + 2.4, R + 2.8, .8, 8, redD), cx, y + .4, cz); add(grp, box(4, 3, 4, sm('#c8c4bc')), cx, y + 2.3, cz); add(grp, cyl(.08, .08, 6, 6, sm('#2a2a2a')), cx + 1.5, y + 6.5, cz);
    finish32(b, i, grp, base, low, y + 4 - base);
    glow(cx, y - 4, cz, '#ffb060', 7); addLight(cx, y - 5, cz, '#ffb060', 2, 18, 0).always = true;
  }
  // l'Archivio di Stato e i depositi della Base: il bunker di cemento a contrafforti, con le arcate buie
  function bunker(b, i, base, low) {
    const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group(), H = b.military ? 11 : 13, cem = mat32(cementoT(), [w / 10, H / 8]), cemD = sm('#6a6862', { roughness: 1 }), dark = sm('#0e0e10');
    add(grp, box(w, H, d, cem), cx, base + H / 2, cz); add(grp, box(w + 1, 2.2, d + 1, cem), cx, base + H + 1.1, cz);
    const face = faceOf(b), N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face], along = N[1] !== 0, len = along ? w : d, nA = Math.max(2, Math.floor(len / 7));
    for (let k = 0; k <= nA; k++) { const u = -len / 2 + k * len / nA, px = along ? cx + u : cx + N[0] * (w / 2 + 1), pz = along ? cz + N[1] * (d / 2 + 1) : cz + u;
      add(grp, box(along ? 1.4 : 2.2, H + 2, along ? 2.2 : 1.4, cemD), px, base + (H + 2) / 2, pz, along ? N[1] * .08 : 0, 0, along ? 0 : -N[0] * .08);
      if (k < nA) { const u2 = u + len / nA / 2, ax = along ? cx + u2 : cx + N[0] * (w / 2 + .02), az = along ? cz + N[1] * (d / 2 + .02) : cz + u2; add(grp, box(along ? len / nA - 2.2 : .1, H * .55, along ? .1 : len / nA - 2.2, dark), ax, base + H * .28, az); } }
    finish32(b, i, grp, base, low, H + 2.2);
  }
  const GOV32 = { governo: palazzoGoverno, garante: ufficiGarante, ministero, pietra: pietraOnda, archivio: bunker, hangar1: bunker, hangar2: bunker };

  // ---------------- la parete del Tavolato: liscia sulla curva vera, a costole verticali, col ciglio che copre il bordo del terreno ----------------
  function buildTavolato() {
    const W0 = M.world; if (!W0 || !W0.TAV || !W0.tavR) return 0;
    const TV = W0.TAV, C = W0.CANALI || [], pos = [], uv = [], cpos = [], cuv = [], tvTop = (a, rr) => groundH(TV.x + Math.cos(a) * rr, TV.y + Math.sin(a) * rr);
    const inCan = a => C.some(c => { const da = Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a)); return Math.abs(da) * (c.R || TV.r) < W0.canHalf(0) + .8; });
    const NA = 720, rib = a => .45 * Math.sin(a * 61) + .3 * Math.sin(a * 137 + 1.3) + .25 * (vegHash(Math.floor(a * 90), 3, 7) - .5);
    for (let k = 0; k < NA; k++) {
      const a0 = k / NA * 6.2832, a1 = (k + 1) / NA * 6.2832; if (inCan(a0) || inCan(a1)) continue;
      const R0 = W0.tavR(a0) + rib(a0), R1 = W0.tavR(a1) + rib(a1);
      const top0 = tvTop(a0, W0.tavR(a0) - 7.5) + .25, top1 = tvTop(a1, W0.tavR(a1) - 7.5) + .25, bot0 = tvTop(a0, W0.tavR(a0) + 2.2) - .6, bot1 = tvTop(a1, W0.tavR(a1) + 2.2) - .6;
      // tre fasce: la parete rientra e sporge un poco salendo (strati di roccia)
      const rows = 4; for (let q = 0; q < rows; q++) { const t0 = q / rows, t1 = (q + 1) / rows, o0 = .35 * Math.sin(t0 * 7 + a0 * 9), o1 = .35 * Math.sin(t1 * 7 + a0 * 9);
        const P = (a, R, bot, top, t, o) => [TV.x + Math.cos(a) * (R + o), bot + (top - bot) * t, TV.y + Math.sin(a) * (R + o)];
        const A = P(a0, R0, bot0, top0, t0, o0), B = P(a1, R1, bot1, top1, t0, o0), Cc = P(a1, R1, bot1, top1, t1, o1), D = P(a0, R0, bot0, top0, t1, o1);
        pos.push(...A, ...B, ...Cc, ...A, ...Cc, ...D); const u0 = k / 8, u1 = (k + 1) / 8, v0 = (bot0 + (top0 - bot0) * t0) / 6, v1 = (bot0 + (top0 - bot0) * t1) / 6; uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1); }
      // il ciglio: un anello di pianoro sopra il bordo del terreno
      const ri = W0.tavR(a0) - 7.5, ri1 = W0.tavR(a1) - 7.5;
      const E = [TV.x + Math.cos(a0) * ri, top0 - .05, TV.y + Math.sin(a0) * ri], F = [TV.x + Math.cos(a1) * ri1, top1 - .05, TV.y + Math.sin(a1) * ri1], Gq = [TV.x + Math.cos(a1) * (R1 + .4), top1, TV.y + Math.sin(a1) * (R1 + .4)], Hq = [TV.x + Math.cos(a0) * (R0 + .4), top0, TV.y + Math.sin(a0) * (R0 + .4)];
      cpos.push(...E, ...Gq, ...F, ...E, ...Hq, ...Gq); cuv.push(E[0] / 4, E[2] / 4, Gq[0] / 4, Gq[2] / 4, F[0] / 4, F[2] / 4, E[0] / 4, E[2] / 4, Hq[0] / 4, Hq[2] / 4, Gq[0] / 4, Gq[2] / 4);
    }
    const mkG = (p, u) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.computeVertexNormals(); return g; };
    const wall = new THREE.Mesh(mkG(pos, uv), std({ map: roccia32(), roughness: 1, side: THREE.DoubleSide })); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
    const capT = tex32('ciglio', 32, 32, (x, r) => { x.fillStyle = '#5a6248'; x.fillRect(0, 0, 32, 32); for (let k = 0; k < 120; k++) { x.fillStyle = pick(r, ['#6a7252', '#4e5640', '#7a7a66', '#666a5a', '#585c4a']); x.fillRect(r() * 32, r() * 32, 2, 2); } });
    const cap = new THREE.Mesh(mkG(cpos, cuv), std({ map: capT, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); cap.receiveShadow = true; scene.add(cap);
    // massi caduti ai piedi della parete
    const r = rng(4242); for (let k = 0; k < 140; k++) { const a = r() * 6.2832; if (inCan(a)) continue; const rr = W0.tavR(a) + 2 + r() * 9, x = TV.x + Math.cos(a) * rr, z = TV.y + Math.sin(a) * rr, s = .3 + r() * 1.1;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), sm(pick(r, ['#6e6660', '#7a726a', '#5e5650']), { roughness: 1 })); m.position.set(x, groundH(x, z) + s * .3, z); m.rotation.set(r(), r(), r()); m.scale.y = .7; addStatic(m); }
    return pos.length / 18;
  }
