  // ================= [inverno] PAESAGGIO: il Muro, la Base, il porto cargo, le stazioni, i beduini, i bivacchi, i fuochi =================
  // Tutto statico tranne i fuochi (fiamme che tremano), il radar, i riflettori delle torri e l'elicottero di notte.
  const WX = { fires: [], beams: [], radar: null, heli: null, blink: [] };
  function fireMat() { return WX.fm || (WX.fm = [new THREE.MeshBasicMaterial({ color: '#ffb040', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ff5a1a', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ffe8a0', toneMapped: false })]); }
  // fiamma: tre coni che tremano, una luce calda vera e un alone
  function flame(x, y, z, s, lightK) {
    const g = G0(), fm = fireMat();
    [[0, .9, 1], [.12, .7, 0], [-.1, .6, 2]].forEach(([o, h, mi]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(.22 * s, h * s, 5), fm[mi]); c.position.set(o * s, h * s / 2, o * .7 * s); g.add(c); });
    g.position.set(x, y, z); scene.add(g); WX.fires.push({ g, ph: Math.random() * 9 });
    const L = addLight(x, y + .8 * s, z, '#ff8a3a', 2.4 * (lightK || 1), 11, .35); L.always = true;
    glow(x, y + .6 * s, z, '#ff9a40', 2.6 * s);
    return g;
  }
  // il barile col fuoco per scaldarsi: ruggine, qualche cassetta intorno
  function fireBarrel(x, z, r) {
    const g = G0(), rust = sm(pick(r, ['#5a3a2a', '#6a4430', '#4e3428']), { roughness: .9 });
    add(g, cyl(.32, .3, .9, 10, rust), 0, .45, 0); add(g, cyl(.34, .34, .05, 10, sl('#2a2422')), 0, .2, 0); add(g, cyl(.34, .34, .05, 10, sl('#2a2422')), 0, .7, 0);
    add(g, cyl(.29, .29, .04, 10, sb('#ff6a20')), 0, .86, 0);
    if (r() < .6) add(g, box(.5, .3, .35, PM.wood()), .65, .15, .2, 0, r() * 2, 0);
    place(g, x, z, r() * 6);
    flame(x, groundH(x, z) + .85, z, .9);
  }
  function camp(x, z, r) { // fuoco a terra: pietre in cerchio, legna
    const g = G0(), st = sm('#6a6660');
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.18, 0), st), Math.cos(a) * .5, .1, Math.sin(a) * .5); }
    add(g, box(.8, .1, .12, PM.woodD()), 0, .08, 0, 0, .6, 0); add(g, box(.8, .1, .12, PM.woodD()), 0, .1, 0, 0, -.6, 0);
    place(g, x, z, 0); flame(x, groundH(x, z) + .1, z, 1.1);
  }
  function tent(x, z, rot, col, s) { // tenda bassa: due falde
    const g = G0(), m = sm(col, { roughness: 1 }), w = 2.2 * s, d = 2.8 * s, h = 1.2 * s;
    const geo = new THREE.BufferGeometry(); const v = [-w / 2, 0, -d / 2, 0, h, -d / 2, w / 2, 0, -d / 2, -w / 2, 0, d / 2, 0, h, d / 2, w / 2, 0, d / 2];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 0, 2, 1, 3, 4, 5]); geo.computeVertexNormals();
    const mm = m.clone(); mm.side = THREE.DoubleSide; add(g, new THREE.Mesh(geo, mm), 0, 0, 0);
    add(g, box(.04, h + .2, .04, PM.woodD()), 0, h / 2, d / 2 + .05);
    return place(g, x, z, rot);
  }
  function hut(x, z, rot, r) { // bivacco: capanna di tronchi col tetto a capanna sotto la neve
    const g = G0(), wd = sm('#4e3a2a'), snow = sm('#e2e6ec');
    add(g, box(3, 1.8, 2.6, wd), 0, .9, 0);
    for (let k = 0; k < 6; k++) add(g, cyl(.09, .09, 3.1, 6, sm('#5e4632')), 0, .15 + k * .3, 1.32, 0, 0, Math.PI / 2);
    const rf = new THREE.Mesh(roofGeo(3.6, 3.2, 1.5), snow); rf.position.set(0, 1.8, 0); g.add(rf);
    add(g, box(.8, 1.4, .06, sm('#2a2018')), 0, .7, 1.34); add(g, box(.5, .4, .05, sb('#ffcf80')), .9, 1.1, 1.34);
    add(g, box(.4, 1, .4, sm('#5a5450')), 1, 2.6, -.5);
    place(g, x, z, rot); addLight(x + Math.sin(rot) * 2, groundH(x, z) + 1.2, z + Math.cos(rot) * 2, '#ffb060', 1.2, 6, .1).always = true;
  }
  function concrete(c) { return sm(c || '#8a8a88', { roughness: 1 }); }
  function buildWinter() {
    const W0 = M.world; if (!W0 || !W0.WALL) return;
    const P = G.PLACES, r = rng(1953), T = G.T;
    const free = (x, z) => { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return v !== T.BLD && v !== T.WATER && v !== T.VIA && v !== T.FOUNT && v !== T.TREE; };
    // ---- il Muro: lastre di cemento, filo spinato, scritte del regime e della Risacca, torri coi riflettori ----
    const WL = W0.WALL, slabM = [concrete('#7e7e7c'), concrete('#8a8a86'), concrete('#747472')], wire = sl('#2a2a2e');
    const posters = ['ОПЕКА', '보호', 'ПОРЯДОК', 'ТРУД', 'ГАРАНТ'];
    for (let y = WL.y0; y < WL.y1; y += 2) {
      if (y + 1 > WL.gate[0] && y + 1 < WL.gate[1]) continue;
      const x = WL.x + 1, g = G0();
      add(g, box(.5, 4.2, 2.02, pick(r, slabM)), 0, 2.1, 0); add(g, box(.7, .25, 2.02, concrete('#6a6a68')), 0, .12, 0);
      add(g, box(.04, .04, 2, wire), .1, 4.45, 0); add(g, box(.04, .04, 2, wire), -.1, 4.6, 0);
      for (let k = 0; k < 3; k++) add(g, new THREE.Mesh(new THREE.TorusGeometry(.18, .015, 3, 8), wire), 0, 4.55, -.7 + k * .7, 0, Math.PI / 2, 0);
      // da questa parte (la città) manifesti strappati e scritte
      if (r() < .18) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, posters), '#f2e8d8', '#9a1c1c') })); pm.position.set(-.27, 2.2, 0); pm.rotation.y = -Math.PI / 2; g.add(pm); }
      else if (r() < .14) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .7), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, ['RISACCA', 'НЕТ', '자유', 'RIDATECI MARCO']), pick(r, ['#ff4a8a', '#3ae0ff', '#ffe04a', '#7aff6a']), '#7e7e7c'), transparent: true, opacity: .9 })); pm.position.set(-.27, 1.4, 0); pm.rotation.y = -Math.PI / 2; g.add(pm); }
      place(g, x, y + 1, 0);
    }
    WL.towers.forEach(([x, y], k) => {
      const g = G0(), cm = concrete('#7a7a78');
      add(g, box(2.2, 8, 2.2, cm), 0, 4, 0); add(g, box(3.2, 2, 3.2, cm), 0, 9, 0);
      add(g, box(3, .8, 3, sb('#ffe6a0')), 0, 9.2, 0).material = new THREE.MeshBasicMaterial({ color: '#c8b88a', toneMapped: false });
      add(g, box(3.6, .25, 3.6, concrete('#5a5a58')), 0, 10.1, 0); add(g, box(3.4, .3, 3.4, sm('#e2e6ec')), 0, 10.35, 0);
      const flag = add(g, box(.05, 2.4, .05, wire), 1.4, 11.4, 1.4); add(g, box(.9, .55, .02, sb('#b81c1c')), 1.86, 12.2, 1.4);
      const red = add(g, new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false })), -1.4, 10.8, -1.4); WX.blink.push({ m: red, ph: k });
      place(g, x + 1, y, 0);
      // il fascio del riflettore che spazza la neve
      const piv = new THREE.Group(), beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 18, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f0d0', transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = -9; piv.add(beam); piv.position.set(x + 1, groundH(x, y) + 9.4, y); piv.rotation.z = .9; scene.add(piv); WX.beams.push({ piv, ph: k * 1.7, side: -1 });
    });
    // il varco: sbarre, garitta, cavalli di Frisia
    { const y0 = WL.gate[0], y1 = WL.gate[1], gx = WL.x + 1, cy = (y0 + y1) / 2;
      const booth = G0(); add(booth, box(2, 2.4, 2, concrete('#6e7468')), 0, 1.2, 0); add(booth, box(1.6, .7, .06, sb('#ffd890')), 0, 1.6, 1.02); add(booth, box(2.3, .2, 2.3, sm('#e2e6ec')), 0, 2.5, 0);
      place(booth, gx + 4, y0 - 2, 0);
      [[cy - 3, 1], [cy + 3, -1]].forEach(([y, s]) => { const g = G0(); add(g, box(.3, 1.1, .3, sm('#d8d0c0')), 0, .55, 0); for (let k = 0; k < 4; k++) add(g, box(.12, .12, 1.4, sm(k % 2 ? '#c8201c' : '#f2eee6')), 0, 1.05, s * (.7 + k * 1.4) - s * .7 + s * .7); place(g, gx - 2, y, 0); });
      for (let k = 0; k < 3; k++) { const g = G0(); [0, 1.05, 2.1].forEach(a => add(g, box(.1, .1, 2, sl('#3a3a3e')), 0, .55, 0, a, 0, .6)); place(g, gx - 8, cy - 4 + k * 4, r()); }
      const L = addLight(gx, groundH(gx, cy) + 6, cy, '#f0f0ff', 3, 22, .02); L.always = true; glow(gx, groundH(gx, cy) + 6, cy, '#f0f0ff', 3);
      const pole = G0(); add(pole, box(.2, 6, .2, wire), 0, 3, 0); add(pole, box(.8, .4, .5, sl('#2a2a30')), 0, 6, 0); place(pole, gx, cy - 5.5, 0);
    }
    // ---- la Base: radar, antenna, pennoni, riflettori, eliporto ----
    if (P.rocca) {
      const R0 = P.rocca, rg = G0(); add(rg, box(1.6, 5, 1.6, concrete('#6a6e66')), 0, 2.5, 0);
      const dish = G0(); add(dish, new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 6, 0, Math.PI * 2, 0, .9), sm('#c8ccd0', { side: THREE.DoubleSide })), 0, 0, 0, Math.PI / 2 + .4, 0, 0); add(dish, box(.2, .2, 1.6, sl('#3a3a40')), 0, 0, .8); dish.position.y = 5.8; rg.add(dish);
      place(rg, R0.x + 22, R0.y - 22, 0); WX.radar = dish;
      const ant = G0(); add(ant, box(.5, 22, .5, sl('#b8201c')), 0, 11, 0); for (let k = 1; k < 7; k++) add(ant, box(1.6 - k * .15, .12, .12, sl('#e8e4dc')), 0, k * 3, 0);
      const top = add(ant, new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false })), 0, 22.2, 0); WX.blink.push({ m: top, ph: 0, slow: true });
      place(ant, R0.x - 18, R0.y + 22, 0);
      [-6, 0, 6].forEach(o => { const g = G0(); add(g, box(.12, 9, .12, sl('#3a3a40')), 0, 4.5, 0); add(g, box(2.2, 1.3, .03, sb('#a81818')), 1.1, 8.2, 0); add(g, box(.5, .5, .035, sb('#f2d84a')), 1.1, 8.2, .02); place(g, R0.x + o, R0.y + 12, 0); });
      if (P.eliporto) { const e = P.eliporto, pad = G0(); add(pad, cyl(5, 5, .06, 24, sm('#5a5a5c')), 0, .03, 0); add(pad, box(.6, .02, 3.4, sb('#e8e4c0')), -1, .07, 0); add(pad, box(.6, .02, 3.4, sb('#e8e4c0')), 1, .07, 0); add(pad, box(2, .02, .6, sb('#e8e4c0')), 0, .07, 0); place(pad, e.x, e.y, 0); }
    }
    // l'elicottero: di giorno a terra sull'eliporto, di notte gira sopra la Base e la periferia est (non va oltre)
    { const h = G0(), body = sm('#4a5446', { roughness: .7 }), glass = sm('#1a2228', { roughness: .2 });
      add(h, new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), body), 0, 1.4, 0).scale.set(1, .8, 1.6);
      add(h, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), glass), 0, 1.6, 1.3).scale.set(.9, .7, .8);
      add(h, box(.4, .4, 5, body), 0, 1.6, -3.6); add(h, box(.06, 1.2, .6, body), 0, 2.2, -6);
      add(h, box(.1, .1, 3.6, sl('#2a2a2e')), -.9, .2, 0); add(h, box(.1, .1, 3.6, sl('#2a2a2e')), .9, .2, 0);
      const rot = G0(); add(rot, box(9, .06, .3, sl('#1a1a1e')), 0, 0, 0); add(rot, box(.3, .06, 9, sl('#1a1a1e')), 0, 0, 0); rot.position.y = 2.6; h.add(rot);
      const nav = add(h, new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false })), 0, .4, -1);
      const sp = new THREE.SpotLight('#f4f2e0', 0, 60, .32, .5, 1.2); sp.position.set(0, .5, 1.5); h.add(sp); const tgt = new THREE.Object3D(); scene.add(tgt); sp.target = tgt;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f2e0', transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(cone);
      h.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(h);
      WX.heli = { g: h, rot, nav, sp, tgt, cone, home: P.eliporto || P.rocca };
    }
    // ---- il porto cargo: gru, container, bitte ----
    if (P.molo_cargo) {
      const q = P.molo_cargo;
      [[-6, -22], [-6, 22], [8, 0]].forEach(([dx, dz], k) => crane(q.x + dx, q.y + dz, k === 2 ? Math.PI / 2 : 0, k ? '#c8642a' : '#d8b02a'));
      for (let k = 0; k < 26; k++) { const x = q.x - 22 + r() * 30, z = q.y - 30 + r() * 60; if (!free(x, z) || !free(x, z + 3) || !free(x, z - 3)) continue; container(x, z, r() < .7 ? 0 : Math.PI / 2, pick(r, ['#7a3a2a', '#3a5a6a', '#5a6a4a', '#8a6a3a', '#6a6a70']), r() < .3 ? 2.6 : 0); }
    }
    // ---- le stazioni di estrazione nella prateria: torre di trivella, nastro, cumuli di carbone, recinto, guardie ----
    ['miniera', 'stazione2'].forEach((id, k) => {
      const b = G.BUILDINGS && G.BUILDINGS.find(o => o.id === id); const q = b ? { x: (b.x + b.w / 2) * TS, y: (b.y + b.h / 2) * TS } : P[k ? 'stazione_s' : 'stazione_n']; if (!q) return;
      const ox = q.x + 12, oz = q.y + (k ? -6 : 6), g = G0(), steel = sl('#3a3a40'), rust = sm('#7a4a2a');
      for (let y = 0; y < 16; y += 2) { const s = 1.6 - y * .07; [[-s, -s], [s, -s], [-s, s], [s, s]].forEach(([a, c]) => add(g, box(.16, 2.05, .16, steel), a, y + 1, c)); add(g, box(s * 2, .1, .1, rust), 0, y + 2, -s); add(g, box(.1, .1, s * 2, rust), -s, y + 2, 0); }
      add(g, box(1.6, 1.4, 1.6, rust), 0, 16.5, 0); add(g, cyl(.6, .6, .3, 10, sl('#2a2a2e')), 0, 17.4, 0, Math.PI / 2, 0, 0);
      add(g, box(1, .4, 14, sm('#4a4a4e')), 6, 3, 0, .25, 0, 0);
      place(g, ox, oz, 0);
      for (let c = 0; c < 3; c++) { const hp = new THREE.Mesh(new THREE.ConeGeometry(2.2 + r(), 2 + r() * 1.5, 7), sm('#1c1a1c', { roughness: 1 })); const gx = ox + 8 + c * 3.4, gz = oz + (r() - .5) * 6; hp.position.set(gx, groundH(gx, gz) + 1, gz); addStatic(hp); }
      const fl = G0(); add(fl, cyl(.2, .25, 8, 8, sl('#3a3a40')), 0, 4, 0); place(fl, ox - 7, oz + 5, 0); flame(ox - 7, groundH(ox - 7, oz + 5) + 8, oz + 5, 1.6, 1.4);
      for (let a = 0; a < 6.28; a += .26) { const fx = ox + Math.cos(a) * 16, fz = oz + Math.sin(a) * 12; if (!free(fx, fz)) continue; const pg = G0(); add(pg, box(.1, 2, .1, steel), 0, 1, 0); add(pg, box(.03, .03, 4, wire), 0, 1.7, 0); add(pg, box(.03, .03, 4, wire), 0, 1.1, 0); place(pg, fx, fz, -a); }
      fireBarrel(ox - 3, oz - 8, r);
    });
    // ---- l'accampamento dei beduini: tende basse color erba secca, si vedono solo da vicino ----
    if (P.beduini) { const q = P.beduini; const cols = ['#7a6c52', '#6e624a', '#84765a', '#5e5444'];
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + r() * .3, d = 7 + r() * 4, x = q.x + Math.cos(a) * d, z = q.y + Math.sin(a) * d * .7; if (free(x, z)) tent(x, z, a + Math.PI / 2, pick(r, cols), 1 + r() * .3); }
      camp(q.x, q.y, r);
      for (let k = 0; k < 3; k++) { const g = G0(), x = q.x - 8 + k * 5, z = q.y - 12; add(g, box(.08, 1.6, .08, PM.woodD()), -1, .8, 0); add(g, box(.08, 1.6, .08, PM.woodD()), 1, .8, 0); add(g, box(2.1, .06, .06, PM.woodD()), 0, 1.5, 0); add(g, box(1.6, .9, .02, sm(pick(r, ['#8a3a2a', '#6a5a3a', '#3a4a5a']))), 0, 1.0, 0); if (free(x, z)) place(g, x, z, r()); }
    }
    // ---- dorsali: bivacchi, il monolite, gli spiazzi da campeggio ----
    Object.values(P).forEach(q => {
      if (q.camp === 'bivacco') { hut(q.x + 2, q.y - 2, r() * 6, r); camp(q.x - 2.5, q.y + 2, r); }
      else if (q.camp === 'tende') { for (let k = 0; k < 3; k++) { const x = q.x + (k - 1) * 3.4, z = q.y + (k % 2) * 2; if (free(x, z)) tent(x, z, r() * 6, pick(r, ['#6a2a2a', '#2a4a3a', '#5a5a2a']), .8); } camp(q.x, q.y - 3, r); }
      else if (q.camp === 'rudere') { const g = G0(), st2 = sm('#7a746c', { roughness: 1 }); [[0, 0, 6, .5], [3, 2.5, .5, 5], [-3, 1.5, .5, 3]].forEach(([dx, dz, w, d], k) => add(g, box(w, 1.2 + r() * 1.6, d, st2), dx, .8, dz)); add(g, box(2, .4, 2, sm('#c8ccd2')), 1, .2, 1.5); place(g, q.x + 2, q.y - 2, r() * 6); }
      else if (q.camp === 'carbonaia') { const g = G0(); add(g, new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 9), sm('#2a2622', { roughness: 1 })), 0, 1, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.4, .6, 9), sm('#bcc0c6')), 0, 1.75, 0); for (let k = 0; k < 6; k++) add(g, box(1.6, .3, .3, PM.woodD()), 3 + (k % 2) * .4, .15 + Math.floor(k / 2) * .3, -1 + (k % 3) * .4); place(g, q.x, q.y, 0); flame(q.x - 1.6, groundH(q.x, q.y) + .2, q.y + .4, .5, .6); }
      else if (q.camp === 'legna') { for (let k = 0; k < 3; k++) { const g = G0(); for (let j = 0; j < 7; j++) add(g, cyl(.16, .16, 1.4, 6, PM.woodD()), (j % 4) * .34 - .5, .16 + Math.floor(j / 4) * .3, 0, 0, 0, Math.PI / 2); add(g, box(1.6, .1, 1.6, sm('#c8ccd2')), 0, .62, 0); place(g, q.x + k * 2.2 - 2, q.y + (k % 2) * 2, r()); } const sb2 = G0(); add(sb2, cyl(.35, .4, .5, 8, PM.woodD()), 0, .25, 0); add(sb2, box(.06, .7, .2, sl('#8a8a90')), .1, .75, 0, 0, 0, .4); place(sb2, q.x + 3, q.y - 2, 0); }
      else if (q.camp === 'vedetta') { const g = G0(), wd = PM.woodD(); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => add(g, box(.18, 6, .18, wd), a, 3, c)); add(g, box(2.6, .15, 2.6, wd), 0, 6, 0); add(g, box(2.8, .2, 2.8, sm('#c8ccd2')), 0, 7.6, 0); add(g, box(.1, 1.5, .1, wd), 1.2, 6.8, 1.2); place(g, q.x, q.y, .3); }
      else if (q.camp === 'grotta') { const g = G0(), rk = sm('#5a5856', { roughness: 1, flatShading: true }); [[0, 0, 3.2], [2.6, .5, 2.4], [-2.4, .3, 2.6], [.5, 2, 2]].forEach(([dx, dy, s2]) => { const m = add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(s2, 0), rk), dx, dy + 1, -1.5); m.scale.y = .8; }); add(g, new THREE.Mesh(new THREE.CircleGeometry(1.3, 10), sb('#08080a')), 0, 1.2, .6); place(g, q.x, q.y - 2, r()); }
      else if (q.camp === 'sorgente') { const g = G0(); add(g, cyl(2.2, 2.4, .2, 12, sm('#a8c4d4', { roughness: .15 })), 0, .1, 0); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.4, 0), sm('#6a6866')), Math.cos(a) * 2.4, .2, Math.sin(a) * 2.4); } place(g, q.x, q.y, 0); }
      else if (q.camp === 'monolite') { const g = G0(); add(g, box(1.6, 6.5, .7, sm('#0e0e12', { roughness: .2, metalness: .3 })), 0, 3.2, 0, 0, 0, .04); add(g, box(2.4, .3, 1.4, sm('#e2e6ec')), 0, .15, 0); place(g, q.x, q.y - 3, .4); const L = addLight(q.x, groundH(q.x, q.y) + 1, q.y - 2, '#9ab0ff', .8, 6, .05); L.always = true; }
    });
    // ---- fuochi nei barili: dove la gente aspetta, lavora, si scalda ----
    const spots = ['piazza', 'calata', 'molo', 'marina', 'caruggio', 'vico', 'piazzetta', 'lungomare', 'giardini', 'passeggiata', 'discarica', 'cava', 'macchia', 'sangiacomo', 'villaggio', 'muro', 'varco', 'poligono', 'molo_cargo', 'covo', 'spiaggia'];
    spots.forEach(id => { const q = P[id]; if (!q) return; for (let t = 0; t < 12; t++) { const x = q.x + (r() - .5) * 8, z = q.y + (r() - .5) * 8; if (free(x, z) && free(x + .8, z) && free(x, z + .8)) { fireBarrel(x, z, r); break; } } });
    // e qualcuno nei cortili e lungo le costiere, nelle periferie
    let nb = 0; for (let t = 0; t < 900 && nb < 34; t++) { const x = 250 + r() * 300, z = 70 + r() * 150, tx = Math.floor(x / TS), tz = Math.floor(z / TS), v = G.tileAt(tx, tz); if ((v !== T.WALK && v !== T.COB) || !free(x + 1, z) || !free(x, z + 1)) continue; let near = false; for (const f of WX.fires) if (Math.hypot(f.g.position.x - x, f.g.position.z - z) < 16) near = true; if (near) continue; fireBarrel(x, z, r); nb++; }
    // ---- neon sgangherati: tubi rosa, ciano, giallo, azzurro freddo sulle facciate; alcuni rotti o che sfarfallano ----
    const NEON = ['#ff4fa3', '#35e6ff', '#ffd23b', '#a8d8ff', '#ff6a3b', '#c05cff'];
    WX.neon = WX.neon || [];
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (!b.door || b.military || b.farm || b.wood) return;
      const d = W0.districtAt ? W0.districtAt(b.x * TS) : 'centro'; if (d === 'prateria' || d === 'foresta' || d === 'base' || d === 'porto') return;
      if (!(b.shop || b.sign || r() < .4)) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, dd = b.h * TS, [dx, dy] = b.door, base = groundH(x0 + w / 2, z0 + dd / 2);
      // la facciata della porta
      let ax, az, bx, bz, nx, nz;
      if (dy >= b.y + b.h) { ax = x0; bx = x0 + w; az = bz = z0 + dd + .12; nx = 0; nz = 1; }
      else if (dy < b.y) { ax = x0; bx = x0 + w; az = bz = z0 - .12; nx = 0; nz = -1; }
      else if (dx >= b.x + b.w) { ax = bx = x0 + w + .12; az = z0; bz = z0 + dd; nx = 1; nz = 0; }
      else { ax = bx = x0 - .12; az = z0; bz = z0 + dd; nx = -1; nz = 0; }
      const col = pick(r, NEON), mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), y = base + 3.3, L = Math.hypot(bx - ax, bz - az), broken = r() < .3;
      const segs = Math.max(2, Math.round(L / 1.2));
      for (let k = 0; k < segs; k++) {
        if (broken && r() < .25) continue;                                    // tubo rotto: un pezzo manca
        const t0 = k / segs + .02, t1 = (k + 1) / segs - .02, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2, len = L * (t1 - t0);
        const tube = new THREE.Mesh(new THREE.BoxGeometry(nz ? len : .07, .07, nz ? .07 : len), mat); tube.position.set(mx, y, mz); scene.add(tube);
      }
      // un tubo verticale sullo spigolo, e a volte una cornice attorno alla vetrina
      if (r() < .6) { const v = new THREE.Mesh(new THREE.BoxGeometry(.07, 3, .07), mat); v.position.set(ax + nz * 0, base + 1.8, az); scene.add(v); }
      const Lt = addLight(dx * TS + 1 + nx * 1.5, base + 2.6, dy * TS + 1 + nz * 1.5, col, 1.6, 9, broken ? .9 : .05); Lt.always = true;
      glow((ax + bx) / 2 + nx * .3, y, (az + bz) / 2 + nz * .3, col, 3.2);
      if (broken) WX.neon.push({ m: mat, col: new THREE.Color(col), ph: r() * 20, L: Lt });
    });
    // ---- manifesti del Garante lungo le costiere ----
    let nm = 0; (M.roads || []).filter(rd => rd.id === 'nord' || rd.id === 'litoranea' || rd.id === 'porto').forEach(rd => { for (let k = 10; k < rd.pts.length - 2; k += 24) { const [ax, az] = rd.pts[k], [bx, bz] = rd.pts[k + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L, x = ax + nx * (rd.w / 2 + 3), z = az + nz * (rd.w / 2 + 3); if (!free(x, z)) continue;
      const g = G0(); add(g, box(.15, 3, .15, sl('#2a2a30')), -1.6, 1.5, 0); add(g, box(.15, 3, .15, sl('#2a2a30')), 1.6, 1.5, 0);
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, ['ОПЕКА ТЕБЯ ВИДИТ', '보호는 사랑', 'ТРУД · ПОРЯДОК', 'IL GARANTE VEGLIA']), '#f2e8d8', pick(r, ['#8a1a1a', '#1a3a6a'])), side: THREE.DoubleSide })); bb.position.y = 3.6; g.add(bb); add(g, box(4.2, .15, .3, sm('#e2e6ec')), 0, 4.78, 0);
      place(g, x, z, Math.atan2(nx, nz)); nm++; } });
  }
  function tickWinter(time, night) {
    WX.fires.forEach(f => { const k = 1 + Math.sin(time * 11 + f.ph) * .12 + Math.sin(time * 23 + f.ph * 2) * .06; f.g.scale.set(1, k, 1); f.g.rotation.y = time * .7 + f.ph; });
    WX.beams.forEach(b => { b.piv.rotation.y = Math.sin(time * .35 + b.ph) * 1.1 - Math.PI / 2; b.piv.children[0].material.opacity = .03 + night * .13; });
    WX.blink.forEach(b => { b.m.visible = Math.sin(time * (b.slow ? 2 : 3.2) + b.ph) > 0; });
    (WX.neon || []).forEach(n => { const on = Math.sin(time * 13 + n.ph) > -.6 && Math.sin(time * 1.7 + n.ph) > -.85; n.m.color.copy(n.col).multiplyScalar(on ? 1 : .18); });
    if (WX.radar) WX.radar.rotation.y = time * .8;
    const H = WX.heli; if (H && H.home) {
      if (night > .35) {
        // gira sopra la Base e il Muro, si spinge sulla periferia est ma non oltre
        const a = time * .12, cx = 560 + Math.sin(time * .05) * 28, cz = 140, rx = 52, rz = 46, x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz;
        H.g.position.set(x, 24 + Math.sin(time * .7) * 1.5, z); H.g.rotation.set(.12, -a, .08);
        H.rot.rotation.y = time * 40; H.sp.intensity = 2.2 * night; const tx = x + Math.sin(time * .9) * 6, tz = z + Math.cos(time * .7) * 6;
        H.tgt.position.set(tx, 0, tz); H.cone.visible = true; H.cone.position.set((x + tx) / 2, 12, (z + tz) / 2); H.cone.lookAt(x, 24, z); H.cone.rotateX(Math.PI / 2); H.cone.material.opacity = .03 + night * .04;
        H.nav.visible = Math.sin(time * 6) > 0;
      } else { H.g.position.set(H.home.x, groundH(H.home.x, H.home.y) + .3, H.home.y); H.g.rotation.set(0, .6, 0); H.rot.rotation.y = .3; H.sp.intensity = 0; H.cone.visible = false; H.nav.visible = false; }
    }
  }
