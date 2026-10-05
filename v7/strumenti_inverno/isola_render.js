  // ================= [isola31] L'ISOLA NUOVA: baracche, palazzi a gradoni, banchi di fortuna, opere stradali, arredo rovinato, faro, stazioni =================
  // Tutto di recupero: lamiera, teli, legno, cemento. Colori spenti, ruggine, niente righe pulite. Bordi organici, mai a scalini.
  const I31 = { tex: {} };
  // lamiera ondulata: costole verticali, ruggine che cola, qualche toppa
  function corrTex(col) {
    if (I31.tex['c' + col]) return I31.tex['c' + col];
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(col.length * 77 + parseInt(col.slice(1), 16) % 997), base = new THREE.Color(col);
    for (let i = 0; i < 32; i += 2) { const k = .82 + (i % 4 ? .1 : 0) + r() * .08; x.fillStyle = '#' + base.clone().multiplyScalar(k).getHexString(); x.fillRect(i, 0, 2, 32); }
    for (let k = 0; k < 7; k++) { const px = Math.floor(r() * 32), len = 6 + r() * 20; const g = x.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(110,58,30,.55)'); g.addColorStop(1, 'rgba(110,58,30,0)'); x.fillStyle = g; x.fillRect(px, Math.floor(r() * 10), 1 + Math.floor(r() * 2), len); }
    if (r() < .6) { x.fillStyle = 'rgba(40,36,34,.35)'; x.fillRect(Math.floor(r() * 20), Math.floor(r() * 20), 8 + Math.floor(r() * 6), 6 + Math.floor(r() * 6)); }
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (I31.tex['c' + col] = t);
  }
  const corrM = (col, rep) => { const k = 'cm' + col + (rep || 1); return I31.tex[k] || (I31.tex[k] = std({ map: corrTex(col), roughness: .75, metalness: .35 })); };
  // cartone o compensato scritto a mano (cartelli dei banchi, avvisi)
  function handTex(text, bg, ink) {
    const key = 'h' + text + bg; if (I31.tex[key]) return I31.tex[key];
    const c = mk(128, 48), x = c.getContext('2d'), r = rng(text.length * 31 + 5); x.fillStyle = bg; x.fillRect(0, 0, 128, 48);
    for (let k = 0; k < 40; k++) { x.fillStyle = 'rgba(0,0,0,' + (r() * .08) + ')'; x.fillRect(Math.floor(r() * 128), Math.floor(r() * 48), 6, 1); }
    x.fillStyle = ink; x.font = 'bold 22px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.save(); x.translate(64, 25); x.rotate((r() - .5) * .08); x.fillText(text, 0, 0); x.restore();
    x.fillStyle = 'rgba(30,20,10,.25)'; x.fillRect(0, 44, 128, 4);
    return (I31.tex[key] = canvasTex(c));
  }
  const RUSTY = ['#6a6e6a', '#7a5a44', '#5a6a74', '#8a7a5a', '#6a4a3e', '#4e5a50', '#8a8478', '#5e4e44', '#7a6a50', '#4a5258'];

  // ---------------- le baracche ----------------
  function buildShack(b, i, base, low) {
    const r = rng(i * 53 + 3), w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2, grp = new THREE.Group();
    const fl = Math.max(1, b.fl), H1 = 2.4 + r() * .5, face = faceOf(b), dark = std({ color: '#141016', roughness: 1 });
    const body = (bx, bz, bw, bd, y0, h, col) => {
      // pannelli di lamiera e di legno di colori diversi, ognuno un po' storto: la baracca è fatta di pezzi
      const core = box(bw - .12, h, bd - .12, dark); core.position.set(bx, y0 + h / 2, bz); grp.add(core);
      [[0, bd / 2, bw, 0], [0, -bd / 2, bw, Math.PI], [bw / 2, 0, bd, Math.PI / 2], [-bw / 2, 0, bd, -Math.PI / 2]].forEach(([ox, oz, len, ry]) => {
        let u = -len / 2; while (u < len / 2 - .05) { const pw = Math.min(len / 2 - u, .9 + r() * .7), wood = r() < .22, m = wood ? (r() < .5 ? PM.wood() : PM.woodD()) : corrM(r() < .55 ? col : pick(r, RUSTY));
          const pnl = box(pw + .04, h - r() * .15, .05, m), c2 = Math.cos(ry), s2 = Math.sin(ry), mu = u + pw / 2;
          pnl.position.set(bx + ox + mu * c2, y0 + h / 2 - .04, bz + oz - mu * s2); pnl.rotation.set(0, ry, (r() - .5) * .04); grp.add(pnl); u += pw; } });
      // il tetto: lamiera inclinata con lo sbalzo, tenuta giù da pietre e copertoni
      const rf = box(bw + .7, .07, bd + .7, corrM(pick(r, ['#5a5a58', '#6a5244', '#4e5450', '#7a6a58']))); rf.position.set(bx, y0 + h + .18, bz); rf.rotation.set((r() - .5) * .2, 0, (r() < .5 ? -1 : 1) * (.08 + r() * .1)); grp.add(rf);
      for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(.16 + r() * .1, 0), sm('#6a6660', { roughness: 1 })); st.position.set(bx + (r() - .5) * bw * .7, y0 + h + .32, bz + (r() - .5) * bd * .7); grp.add(st); }
      if (r() < .35) { const ty = new THREE.Mesh(new THREE.TorusGeometry(.3, .11, 5, 10), sm('#1e1c1e', { roughness: 1 })); ty.rotation.x = Math.PI / 2; ty.position.set(bx + (r() - .5) * bw * .5, y0 + h + .32, bz + (r() - .5) * bd * .5); grp.add(ty); }
    };
    const col0 = pick(r, RUSTY);
    body(cx, cz, w - .2, d - .2, base, H1, col0);
    // sopra: un'altra stanza più piccola, spostata, con la scala a pioli
    if (fl > 1) { const bw = Math.max(1.8, w * (.5 + r() * .3)), bd = Math.max(1.8, d * (.5 + r() * .3)), ox = (r() - .5) * (w - bw - .3), oz = (r() - .5) * (d - bd - .3);
      body(cx + ox, cz + oz, bw, bd, base + H1 + .25, 2.1 + r() * .3, pick(r, RUSTY));
      const lad = new THREE.Group(); [-.22, .22].forEach(o => add(lad, box(.05, H1 + .6, .05, PM.woodD()), o, (H1 + .6) / 2, 0)); for (let y = .3; y < H1 + .4; y += .38) add(lad, box(.46, .04, .04, PM.woodD()), 0, y, 0);
      lad.position.set(x0 + .2, base, z0 + d * (.3 + r() * .4)); lad.rotation.z = .12; grp.add(lad); }
    // porta (di legno o una tenda), finestrella con la luce calda, tubo della stufa
    const N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[face], dx = b.door ? b.door[0] * TS + 1 : cx, dz = b.door ? b.door[1] * TS + 1 : cz + d / 2;
    const fx = N[0] ? cx + N[0] * (w / 2 - .02) : Math.max(x0 + .7, Math.min(x0 + w - .7, dx)), fz = N[1] ? cz + N[1] * (d / 2 - .02) : Math.max(z0 + .7, Math.min(z0 + d - .7, dz)), ry = Math.atan2(N[0], N[1]);
    const dr = box(.9, 1.85, .08, r() < .4 ? sm(pick(r, ['#5a3a2a', '#3a4a5a', '#6a2a24']), { roughness: 1 }) : PM.woodD()); dr.position.set(fx, base + .93, fz); dr.rotation.y = ry; grp.add(dr);
    const wx = fx + Math.cos(ry) * 1.1 * (r() < .5 ? 1 : -1), wz = fz - Math.sin(ry) * 1.1, win = box(.6, .45, .06, r() < .7 ? litMat(pick(r, LIT)) : dark); win.position.set(N[0] ? fx : Math.max(x0 + .4, Math.min(x0 + w - .4, wx)), base + 1.5, N[1] ? fz : Math.max(z0 + .4, Math.min(z0 + d - .4, wz))); win.rotation.y = ry; grp.add(win);
    const pp = cyl(.07, .07, 1.3, 6, sl('#2a2624')); pp.position.set(cx + (r() - .5) * (w - 1), base + H1 + .8, cz + (r() - .5) * (d - 1)); grp.add(pp); const ph = cyl(.12, .1, .12, 6, sl('#2a2624')); ph.position.set(pp.position.x, pp.position.y + .7, pp.position.z); grp.add(ph);
    // tettoia di telo davanti alla porta, su due pali storti
    if (r() < .55) { const tw = 1.8 + r(), td = 1.2 + r() * .5, tela = box(N[0] ? td : tw, .03, N[0] ? tw : td, sm(pick(r, ['#4a5a6a', '#6a6448', '#5a4a40', '#3e4e48', '#6e5040']), { roughness: 1 }));
      tela.position.set(fx + N[0] * td / 2, base + 2.15, fz + N[1] * td / 2); tela.rotation.set(N[1] * .18, 0, -N[0] * .18); grp.add(tela);
      [-1, 1].forEach(s2 => { const p = box(.06, 2.1, .06, PM.woodD()); p.position.set(fx + N[0] * td + (N[1] ? s2 * tw / 2 : 0), base + 1.02, fz + N[1] * td + (N[0] ? s2 * tw / 2 : 0)); p.rotation.z = (r() - .5) * .1; grp.add(p); }); }
    shadowed(grp); const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);
    const topY = base + H1 + (fl > 1 ? 2.6 : 0) + .4;
    const rec = { b, flat: false, shack: true, grp: merged, fade: 0, box3: new THREE.Box3(new THREE.Vector3(x0 + .2, low, z0 + .2), new THREE.Vector3(x0 + w - .2, topY + 1, z0 + d - .2)), mats: [] };
    ownMats(merged, rec); dyn.buildings.push(rec); rec.geo = { x0, z0, w, d, y0: base, H: topY - base }; DZ.bRec[i] = rec; rec.stove = [pp.position.x, pp.position.y + .76, pp.position.z];   // bocca del tubo della stufa (la usa aria2.js per il fumo)
    // luce calda dalla finestra di notte, poca
    if (r() < .5) addLight(win.position.x + N[0] * .8, base + 1.4, win.position.z + N[1] * .8, '#ffb060', .9, 4, .1);
  }

  // ---------------- le torri del governo: cemento a lesene, coronamento con l'insegna sul traliccio e la luce rossa ----------------
  function govCrown(grp, b, base, top, x0, z0, w, d) {
    const cm = concrete('#8a8884'), cd = concrete('#6a6a68'), iron = sm('#26282c', { roughness: .8, metalness: .4 });
    const H = top - base;
    // lesene verticali fitte e fasce orizzontali ogni due piani: il ritmo del regime
    for (let u = 1; u < w - .5; u += 2) { [z0 - .12, z0 + d + .12].forEach(zz => { const l = box(.28, H - 3.4, .26, cm); l.position.set(x0 + u, base + 3.6 + (H - 3.4) / 2 - .2, zz); grp.add(l); }); }
    for (let u = 1; u < d - .5; u += 2) { [x0 - .12, x0 + w + .12].forEach(xx => { const l = box(.26, H - 3.4, .28, cm); l.position.set(xx, base + 3.6 + (H - 3.4) / 2 - .2, z0 + u); grp.add(l); }); }
    for (let y = base + 3.6; y < top - 1; y += MF * 2) { const f = box(w + .5, .22, d + .5, cd); f.position.set(x0 + w / 2, y, z0 + d / 2); grp.add(f); }
    const cap = box(w + .8, .9, d + .8, cd); cap.position.set(x0 + w / 2, top + .45, z0 + d / 2); grp.add(cap);
    // traliccio sul tetto con le lettere e l'antenna con la luce rossa
    const tw = Math.min(w - 1, 9), th0 = 2.6;
    for (let k = 0; k <= 4; k++) { const px = x0 + w / 2 - tw / 2 + k * tw / 4; const p = box(.12, th0, .12, iron); p.position.set(px, top + .9 + th0 / 2, z0 + d / 2); grp.add(p); if (k < 4) { const dg = box(.06, Math.hypot(tw / 4, th0), .06, iron); dg.position.set(px + tw / 8, top + .9 + th0 / 2, z0 + d / 2 - .1); dg.rotation.z = Math.atan2(tw / 4, th0) * (k % 2 ? 1 : -1); grp.add(dg); } }
    if (b.sign) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(tw, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(b.sign.t, '#e8c0a0', '#2a0c0c'), toneMapped: false })); sg.position.set(x0 + w / 2, top + .9 + th0 - .8, z0 + d / 2 + .12); sg.userData.keep = true; grp.add(sg);
      const bk = sg.clone(); bk.rotation.y = Math.PI; bk.position.z -= .24; grp.add(bk); glow(x0 + w / 2, top + 2.6, z0 + d / 2 + 1, '#b84a3c', 6); }
    const mast = cyl(.06, .1, 7, 6, iron); mast.position.set(x0 + w * .75, top + 4.4, z0 + d * .3); grp.add(mast);
    const rl = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), sb('#ff2a1a')); rl.position.set(mast.position.x, top + 8, mast.position.z); rl.userData.keep = true; grp.add(rl);
    glow(mast.position.x, top + 8, mast.position.z, '#ff3a20', 2.4);
  }
  // cartellone sul tetto montato su un traliccio (come sui tetti di Hong Kong): pubblicità sbiadita o il Garante
  function roofBillboard(grp, bi, top, x0, z0, w, d, r) {
    const iron = sm('#2a2a2c', { roughness: .85, metalness: .35 }), along = w >= d, bw = Math.min((along ? w : d) - .8, 5 + r() * 3), bh = 2.2 + r(), legH = 1.4 + r() * 1.4;
    const cx = x0 + w / 2 + (along ? 0 : (r() - .5) * (w - 1)), cz = z0 + d / 2 + (along ? (r() - .5) * (d - 1) : 0), g = new THREE.Group();
    for (let k = 0; k <= 3; k++) { const u = -bw / 2 + k * bw / 3; add(g, box(.1, legH + bh, .1, iron), u, (legH + bh) / 2, 0); add(g, box(.08, legH * 1.2, .08, iron), u, legH * .5, -.6, .5, 0, 0); }
    add(g, box(bw, .08, .08, iron), 0, legH, 0); add(g, box(bw, .08, .08, iron), 0, legH + bh, 0);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), r() < .3 && typeof eyeMat === 'function' ? eyeMat('screen') : adMat(bi)); pl.position.set(0, legH + bh / 2, .07); g.add(pl);
    const back = box(bw, bh, .04, sm('#3a3632', { roughness: 1 })); back.position.set(0, legH + bh / 2, .02); g.add(back);
    g.position.set(cx, top, cz); g.rotation.y = along ? 0 : Math.PI / 2; grp.add(g);
  }

  // ---------------- banchi del mercato: di fortuna, non da centro commerciale ----------------
  // bancone di cassette e assi, telo di plastica sbiadito e rattoppato legato a pali storti, merce nelle cassette, cartone scritto a mano, lampadina appesa
  const MERCE = {
    frutta: { sign: 'MELE · ARANCE', heap: ['#8a3a2a', '#a8642a', '#7a6a2a', '#6a2a24'], tarp: '#5a6a74' },
    verdura: { sign: 'VERDURA', heap: ['#4a6a34', '#6a7a3a', '#7a3a2a', '#8a7a4a'], tarp: '#6a6448' },
    pesce: { sign: 'PESCE FRESCO', heap: ['#8a9094', '#6a7074', '#9aa0a2'], tarp: '#3e4e58', ice: true },
    forno: { sign: 'PANE', heap: ['#8a6a3a', '#9a7444', '#6a4a2a'], tarp: '#6e5040' },
  };
  function banco(it, r) {
    const G2 = MERCE[it.goods] || MERCE.verdura, g = G0(), wood = PM.wood(), woodD = PM.woodD(), crateM = sm('#8a6a48', { roughness: 1 }), crateD = sm('#6a5038', { roughness: 1 });
    // il bancone: cassette impilate e due assi sopra, mai dritte
    for (let k = 0; k < 4; k++) { const cxk = -1.35 + k * .9; add(g, box(.82, .42, .78, k % 2 ? crateM : crateD), cxk, .21, 0, 0, (r() - .5) * .12, 0); add(g, box(.82, .42, .78, k % 3 ? crateD : crateM), cxk + (r() - .5) * .08, .63, (r() - .5) * .06, 0, (r() - .5) * .14, 0); }
    add(g, box(3.7, .05, .5, wood), 0, .87, -.2, 0, 0, (r() - .5) * .03); add(g, box(3.6, .05, .45, woodD), .05, .88, .25, 0, .02, 0);
    // la merce: mucchi nelle cassette basse (niente frutta da cartone animato)
    const ice = G2.ice ? sm('#c8d0d2', { roughness: .4 }) : null;
    for (let k = 0; k < 4; k++) { const cxk = -1.35 + k * .9, cr = add(g, box(.8, .14, .5, crateM), cxk, .97, 0); if (ice) add(g, box(.74, .03, .44, ice), cxk, 1.04, 0);
      const hc = pick(r, G2.heap); for (let q = 0; q < 7; q++) { const s = .07 + r() * .05, o = new THREE.Mesh(G2.ice ? new THREE.SphereGeometry(1, 6, 4) : new THREE.IcosahedronGeometry(1, 0), sm(q % 3 ? hc : pick(r, G2.heap), { roughness: .8 })); o.scale.set(G2.ice ? s * 2.2 : s, s * (G2.ice ? .6 : 1), s); o.position.set(cxk + (r() - .5) * .6, 1.08 + r() * .05, (r() - .5) * .34); o.rotation.y = r() * 6; g.add(o); } }
    // pali: uno di legno, uno di tubo, legati; il telo pende e ha le toppe
    const iron = PM.iron(); add(g, box(.08, 2.5, .08, woodD), -1.9, 1.25, -.5, 0, 0, .04); add(g, cyl(.04, .04, 2.6, 6, iron), 1.9, 1.3, -.5, 0, 0, -.05);
    add(g, box(.08, 2.1, .08, woodD), -1.9, 1.05, .7, 0, 0, -.06); add(g, cyl(.04, .04, 2.2, 6, iron), 1.85, 1.1, .7, 0, 0, .05);
    const tarpM = sm(mute(G2.tarp, .9), { roughness: 1, side: THREE.DoubleSide }), patchM = sm(mute(pick(r, ['#6a6448', '#5a4a40', '#4a5a6a']), .9), { roughness: 1 });
    // il telo in tre falde con l'avvallamento al centro (dove si ferma l'acqua)
    [[-1.3, .1], [0, -.08], [1.3, .1]].forEach(([ox, dy], k) => add(g, box(1.36, .03, 1.5, tarpM), ox, 2.32 + dy, .1, .25, 0, (k - 1) * -.06));
    add(g, box(.6, .035, .5, patchM), .7, 2.3, .2, .25, 0, 0);
    for (let k = 0; k < 3; k++) add(g, box(.02, .02, .5 + r() * .3, sm('#c8c0a8')), -1.9 + k * 1.9, 2.1, .9 + r() * .2, .6, 0, 0);   // corde
    // cartone scritto a mano, appeso con lo spago
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .45), new THREE.MeshStandardMaterial({ map: handTex(G2.sign, '#b8a07a', '#2a1a12'), roughness: 1 })); sg.position.set((r() - .5) * 1.4, 1.95, .86); sg.rotation.z = (r() - .5) * .12; g.add(sg);
    // bilancia, sacchetti, cassette vuote a terra, la lampadina sul filo
    add(g, box(.3, .1, .25, sm('#5a6066', { metalness: .4, roughness: .5 })), 1.45, .95, .3); add(g, cyl(.13, .13, .02, 10, sm('#8a9094', { metalness: .5 })), 1.45, 1.06, .3);
    for (let k = 0; k < 3; k++) add(g, box(.6, .3, .45, k % 2 ? crateM : crateD), -1.2 + k * .55 + (r() - .5) * .2, .15 + (k === 1 ? .3 : 0), -1.05, 0, r() * .4, 0);
    const bulb = add(g, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), sb('#ffd8a0')), -.2, 2.0, .2); bulb.userData.keep = true; add(g, box(.01, .3, .01, sl('#1a1a1a')), -.2, 2.17, .2);
    const o = place(g, it.x, it.y, it.rot); const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0), lx = it.x - .2 * c + .2 * s, lz = it.y + .2 * s * 0 + .2 * c;
    addLight(lx, groundH(it.x, it.y) + 1.9, lz, '#ffc080', 1.2, 5, .15); glow(lx, groundH(it.x, it.y) + 2, lz, '#ffc080', .9);
    return o;
  }

  // ---------------- il faro di Punta Scogli: torre conica di lamiera arancione su gambe d'acciaio, ballatoi, scale, cabina in cima ----------------
  function buildLighthouse(b, cx, cz, base) {
    const g = new THREE.Group(), steel = sm('#3a3634', { roughness: .7, metalness: .5 }), orange = corrM('#b0502a'), orangeD = corrM('#8a3e24'), rail = sm('#2e2c2a', { metalness: .4 }), r = rng(77);
    // gambe a traliccio
    const L = 3.2, legH = 4.2; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => { add(g, cyl(.32, .4, legH, 8, steel), a * L, legH / 2, c * L); add(g, box(.12, Math.hypot(L * 2, legH), .12, steel), a * L, legH / 2, 0, Math.atan2(L * 2, legH) * a * c * .5, 0, 0); });
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const br = box(L * 2 * 1.06, .1, .1, steel); br.position.set(Math.cos(a) * L * 0, legH * .45, 0); br.rotation.set(0, a, Math.atan2(legH * .9, L * 2) * (k % 2 ? 1 : -1)); g.add(br); }
    // piattaforma con ringhiera e la casetta del guardiano
    const deck = (y, R, sq) => { add(g, sq ? box(R * 2, .22, R * 2, steel) : cyl(R, R, .22, 16, steel), 0, y, 0); const n = sq ? 16 : 18; for (let k = 0; k < n; k++) { const a = k / n * 6.283, px = sq ? Math.max(-R, Math.min(R, Math.cos(a) * R * 1.45)) : Math.cos(a) * R, pz = sq ? Math.max(-R, Math.min(R, Math.sin(a) * R * 1.45)) : Math.sin(a) * R; add(g, box(.05, 1, .05, rail), px, y + .5, pz); }
      if (sq) [[0, R, R * 2, .05], [0, -R, R * 2, .05], [R, 0, .05, R * 2], [-R, 0, .05, R * 2]].forEach(([px, pz, ww, dd]) => add(g, box(ww, .05, dd, rail), px, y + 1, pz)); else add(g, new THREE.Mesh(new THREE.TorusGeometry(R, .03, 4, 24), rail), 0, y + 1, 0, Math.PI / 2, 0, 0); };
    deck(legH + .1, L + .8, true);
    add(g, box(2.6, 2.4, 2, orangeD), L - .6, legH + 1.4, L - .4); add(g, box(2.9, .1, 2.3, corrM('#5a5654')), L - .6, legH + 2.7, L - .4, 0, 0, .1); add(g, box(.8, 1.8, .06, sm('#3a4a5a')), L - 1.2, legH + 1.1, L + .62);
    // la torre conica, due ballatoi a metà
    const T0 = legH + .2, TH = 12; add(g, cyl(1.6, 2.6, TH, 14, orange), 0, T0 + TH / 2, 0);
    [T0 + TH * .45].forEach(y => deck(y, 2.6, false)); add(g, cyl(2.3, 2.3, .5, 14, steel), 0, T0 + TH * .45 - .2, 0);
    // scala alla marinara sul fianco e scala dalla piattaforma
    for (let y = T0; y < T0 + TH; y += .45) add(g, box(.5, .04, .04, rail), 0, y, 2.62 - (y - T0) / TH * 1.02);
    [-1, 1].forEach(s2 => { const st = box(.05, TH, .05, rail); st.position.set(s2 * .25, T0 + TH / 2, 2.12); st.rotation.x = -Math.atan2(1.02, TH); g.add(st); });
    // cabina in cima: ottagono con vetri, tetto di lamiera a spiovente, parabole, antenne, la lanterna
    const CY = T0 + TH; deck(CY + .1, 3.1, false);
    add(g, cyl(2.2, 2.2, 2.4, 8, orangeD), 0, CY + 1.3, 0); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + .39; const wpl = box(1, .8, .06, litMat('#ffd8a0')); wpl.position.set(Math.cos(a) * 2.15, CY + 1.6, Math.sin(a) * 2.15); wpl.rotation.y = -a + Math.PI / 2; g.add(wpl); }
    add(g, new THREE.Mesh(new THREE.ConeGeometry(3, 1.3, 8), corrM('#6a5e54')), 0, CY + 3.15, 0);
    const lamp = cyl(.7, .7, 1, 10, new THREE.MeshBasicMaterial({ color: '#fff4c0', toneMapped: false })); lamp.position.y = CY + 4.2; lamp.userData.keep = true; g.add(lamp); add(g, cyl(.8, .8, .1, 10, steel), 0, CY + 4.75, 0); add(g, cyl(.06, .06, 2.2, 5, steel), 0, CY + 5.8, 0);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(.6, 10, 4, 0, Math.PI * 2, 0, Math.PI * .4), sm('#c0c4c8', { side: THREE.DoubleSide, metalness: .3 })); dish.rotation.set(.9, .5, 0); dish.position.set(-1.6, CY + 3.2, 1.2); g.add(dish);
    for (let k = 0; k < 2; k++) { add(g, cyl(.03, .03, 3 + k, 5, steel), 1.2 - k * 2.2, CY + 4.4 + k * .4, -1); for (let c2 = 0; c2 < 3; c2++) add(g, box(.9 - c2 * .2, .03, .03, steel), 1.2 - k * 2.2, CY + 4.8 + c2 * .4 + k * .4, -1); }
    // un braccio di gru per i rifornimenti e un tubo della stufa
    add(g, box(3.6, .14, .14, steel), -2.6, CY + 2.4, 0, 0, 0, -.25); add(g, cyl(.09, .09, 1.6, 6, sl('#2a2624')), 1.4, CY + 3.4, 1.2);
    g.position.set(cx, base, cz); shadowed(g); scene.add(g);
    glow(cx, base + CY + 4.2, cz, '#fff0b0', 5); addLight(cx, base + CY + 2, cz, '#fff0c0', 3, 20, 0).always = true; addLight(cx + L, base + legH + 2, cz + L, '#ffb060', 1.4, 7, .1);
    const bm = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const beams = new THREE.Group(); beams.position.set(cx, base + CY + 4.2, cz);
    [0, Math.PI].forEach(a => { const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 10, 1, true), bm); cone.rotation.z = Math.PI / 2; cone.position.x = 30; const p = new THREE.Group(); p.rotation.y = a; p.add(cone); beams.add(p); });
    scene.add(beams); dyn.spin.push({ o: beams, speed: .9 });
  }

  // ---------------- le stazioni di estrazione: mattoni, ciminiere a fasce, condotti inclinati, il silo ----------------
  function stazione31(q, k, r) {
    const brick = std({ map: (() => { const c = mk(32, 32), x = c.getContext('2d'); x.fillStyle = '#5a2e26'; x.fillRect(0, 0, 32, 32); for (let y = 0; y < 32; y += 4) for (let i = (y / 4 % 2) * 4; i < 32; i += 8) { x.fillStyle = pick(r, ['#7a3e30', '#6e382c', '#844434', '#663228']); x.fillRect(i, y, 7, 3); } const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t; })(), roughness: 1 });
    const steel = sm('#3a3a3e', { metalness: .4, roughness: .7 }), cm = concrete('#7a7874'), g = G0(), ox = q.x - 10, oz = q.y + (k ? 8 : -8);
    // il corpo alto di mattoni con le finestre ad arco cieche
    add(g, box(7, 12, 5, brick), 0, 6, 0); add(g, box(7.4, .5, 5.4, cm), 0, 12.2, 0);
    for (let i = 0; i < 3; i++) add(g, box(1.1, 3.4, .1, sm('#1a1416')), -2.2 + i * 2.2, 7.5, 2.52);
    // le ciminiere, bianche e rosse sbiadite, con le passerelle
    const nC = 3 + (k % 2); for (let i = 0; i < nC; i++) { const px = -2.6 + i * (5.2 / (nC - 1)); add(g, box(1.2, 3, 1.2, brick), px, 13.7, 0);
      for (let s = 0; s < 4; s++) add(g, cyl(.45, .5, 2, 10, sm(s % 2 ? '#a84a3a' : '#c8c2b8', { roughness: .9 })), px, 16.2 + s * 2, 0); add(g, cyl(.55, .55, .3, 10, steel), px, 24.1, 0); }
    add(g, box(6.4, .1, .8, steel), 0, 20.2, .9); for (let i = 0; i < 7; i++) add(g, box(.04, .9, .04, steel), -3 + i, 20.7, 1.3);
    // condotti inclinati verso la tramoggia, su cavalletti
    for (let i = 0; i < 2; i++) { const p = cyl(.55, .55, 13, 10, sm(i ? '#5a5654' : '#6a4a3a', { roughness: .8, metalness: .3 })); p.position.set(-1.8 + i * 3.6, 5.5, 7.5); p.rotation.x = 1.05; g.add(p);
      add(g, box(.2, 3.5, .2, steel), -1.8 + i * 3.6, 1.75, 11); add(g, box(.2, 7, .2, steel), -1.8 + i * 3.6, 3.5, 6.2); }
    // il silo con la cupola, la tramoggia a terra coi carrelli
    add(g, cyl(2.8, 2.8, 9, 14, sm('#5e5c5a', { roughness: .8, metalness: .2 })), -7.5, 4.5, 2); add(g, new THREE.Mesh(new THREE.ConeGeometry(3, 1.8, 14), corrM('#5a5654')), -7.5, 9.9, 2);
    for (let s = 1; s < 4; s++) add(g, cyl(2.9, 2.9, .14, 14, steel), -7.5, s * 2.3, 2);
    add(g, box(5, 2.6, 3.4, cm), 0, 1.3, 12.6); for (let i = 0; i < 3; i++) { add(g, box(1.6, .9, 1.1, corrM('#6a4a3a')), -3 + i * 2.2, .75, 15.6); add(g, new THREE.Mesh(new THREE.ConeGeometry(.6, .4, 6), sm('#1a181a')), -3 + i * 2.2, 1.35, 15.6); }
    place(g, ox, oz, k ? Math.PI : 0);
    glow(ox, groundH(ox, oz) + 24.5, oz, '#ff8a40', 2); addLight(ox, groundH(ox, oz) + 10, oz + (k ? -3 : 3), '#ffb060', 1.6, 12, .05);
  }

  // ---------------- le strade: guardrail, cartelli, lavori in corso, transenne, arredo ----------------
  function buildStrade31() {
    const T = G.T, r = rng(2031), W0 = M.world; if (!W0) return 0;
    const free = (x, z) => { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return v !== T.BLD && v !== T.WATER && v !== T.VIA && v !== T.FOUNT && v !== T.TREE && v !== T.CLIFF; };
    const city = (x, z) => zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.CITTA;
    let n = 0;
    const rail = sm('#8a8c8a', { metalness: .55, roughness: .45 }), railR = sm('#7a6250', { metalness: .4, roughness: .7 }), post = sm('#5a5c5e', { metalness: .5, roughness: .6 }), conc = concrete('#8a8682'), concD = concrete('#6e6a66');
    // guardrail e parapetti: dove il bordo cade (muro di sostegno, scarpata) o sul mare; mai in città, mai sugli incroci
    (M.roads || []).forEach(rd => {
      if (!rd.edge || rd.rect || rd.kind === 'vicolo' || (rd.kind === 'sterrato' && rd.w < 5)) return;
      const P = rd.pts, side = rd.kind === 'citta' || rd.kind === 'litoranea' ? 2 : 0;
      [0, 1].forEach(si => {
        let run = [];
        const flush = () => {
          if (run.length < 4) { run = []; return; }
          const g = new THREE.Group(), damaged = r() < .35, rustAll = r() < .4, parapet = run.some(q => q.wall);
          for (let k = 0; k < run.length; k++) {
            const q = run[k]; if (damaged && r() < .06) continue;   // un tratto mancante
            const nx = q.nx, nz = q.nz, y = groundH(q.x, q.z);
            if (parapet) { if (k < run.length - 1) { const q2 = run[k + 1], L = Math.hypot(q2.x - q.x, q2.z - q.z); const pw = box(L + .02, .7, .3, k % 9 === 4 ? concD : conc); pw.position.set((q.x + q2.x) / 2, (y + groundH(q2.x, q2.z)) / 2 + .35, (q.z + q2.z) / 2); pw.rotation.y = Math.atan2(-(q2.z - q.z), q2.x - q.x); g.add(pw); } continue; }
            const p = box(.12, .85, .12, post); p.position.set(q.x, y + .42, q.z); p.rotation.z = damaged && r() < .1 ? (r() - .5) * .5 : 0; g.add(p);
            if (k < run.length - 1) { const q2 = run[k + 1], L = Math.hypot(q2.x - q.x, q2.z - q.z), y2 = groundH(q2.x, q2.z);
              const bent = damaged && r() < .12, bm = rustAll || r() < .15 ? railR : rail;
              const bar = box(L + .06, .32, .06, bm); bar.position.set((q.x + q2.x) / 2 + nx * .08, (y + y2) / 2 + .62 - (bent ? .18 : 0), (q.z + q2.z) / 2 + nz * .08);
              bar.rotation.set(bent ? .35 : 0, Math.atan2(-(q2.z - q.z), q2.x - q.x), Math.atan2(y2 - y, L)); g.add(bar); }
          }
          addStatic(g); n++; run = [];
        };
        for (let k = 2; k < P.length - 2; k += 1) {
          const e = rd.edge[k * 2 + si], a = P[k - 1], c = P[k + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / L * (si ? -1 : 1), nz = (c[0] - a[0]) / L * (si ? -1 : 1);
          const off = rd.w / 2 + side + .45, x = P[k][0] + nx * off, z = P[k][1] + nz * off;
          const ok = (e === 2 || e === 3) && !city(x, z) && !nearJ(x, z, 3) && free(x, z);
          if (!ok) { flush(); continue; }
          if (run.length && Math.hypot(run[run.length - 1].x - x, run[run.length - 1].z - z) < 1.8) continue;
          const ft = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)), F = W0.feat ? W0.feat[Math.floor(z / TS) * G.GW + Math.floor(x / TS)] : 0;
          run.push({ x, z, nx, nz, wall: !!(F & 16384) || e === 3 && rd.kind === 'litoranea' && r() < .0 });
        }
        flush();
      });
      // massi caduti ai piedi della roccia tagliata
      for (let k = 3; k < P.length - 3; k += 7) for (let si = 0; si < 2; si++) { if (rd.edge[k * 2 + si] !== 1 || r() > .3) continue; const a = P[k - 1], c = P[k + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / L * (si ? -1 : 1), nz = (c[0] - a[0]) / L * (si ? -1 : 1);
        const off = rd.w / 2 + side + .6, x = P[k][0] + nx * off, z = P[k][1] + nz * off; if (!free(x, z)) continue; const g = G0(); for (let q = 0; q < 2 + Math.floor(r() * 3); q++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.18 + r() * .35, 0), sm(pick(r, ['#6e6a66', '#7a7470', '#5e5a56']), { roughness: 1 })), (r() - .5) * 1.4, .15, (r() - .5) * .8, r(), r(), r()); place(g, x, z, r() * 6); }
    });
    // cartelli stradali rovinati agli incroci fuori città: pericolo, precedenza, frecce con i nomi, qualcuno storto o bucato
    const signTex = (kind, text) => { const key = 'sg' + kind + text; if (I31.tex[key]) return I31.tex[key]; const c = mk(64, 64), x = c.getContext('2d'), rr = rng(key.length * 13);
      x.clearRect(0, 0, 64, 64);
      if (kind === 'tri') { x.fillStyle = '#e8e2d4'; x.beginPath(); x.moveTo(32, 4); x.lineTo(60, 58); x.lineTo(4, 58); x.closePath(); x.fill(); x.strokeStyle = '#a82a22'; x.lineWidth = 7; x.stroke(); x.fillStyle = '#1a1a1a'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText(text || '!', 32, 50); }
      else if (kind === 'round') { x.fillStyle = '#e8e2d4'; x.beginPath(); x.arc(32, 32, 28, 0, 6.3); x.fill(); x.strokeStyle = '#a82a22'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#1a1a1a'; x.font = 'bold 24px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text || '50', 32, 34); }
      else { x.fillStyle = '#2a4a6a'; x.fillRect(0, 14, 64, 36); x.strokeStyle = '#e8e2d4'; x.lineWidth = 2; x.strokeRect(2, 16, 60, 32); x.fillStyle = '#e8e2d4'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 30, 32); x.beginPath(); x.moveTo(54, 26); x.lineTo(61, 32); x.lineTo(54, 38); x.fill(); }
      // ruggine, adesivi, fori di proiettile
      for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(${90 + rr() * 40},${50 + rr() * 20},30,${rr() * .5})`; x.beginPath(); x.arc(rr() * 64, rr() * 64, 1 + rr() * 4, 0, 6.3); x.fill(); }
      for (let k = 0; k < 3; k++) { x.fillStyle = '#121212'; x.beginPath(); x.arc(12 + rr() * 40, 16 + rr() * 34, 1.3, 0, 6.3); x.fill(); }
      if (rr() < .5) { x.fillStyle = pick(rr, ['#c8b030', '#e8e2d4', '#8a2a2a']); x.fillRect(8 + rr() * 30, 30 + rr() * 20, 10, 7); }
      const t = canvasTex(c); return (I31.tex[key] = t); };
    const NAMES = ['ЦЕНТР', 'ПОРТ', 'МАЯК', 'ТАВОЛАТО', 'СТЕНА', 'ЛЕС', 'ПЛЯЖ', 'ГАВАНЬ'];
    const roadSign = (x, z, rot, kind, text, r2) => {
      const g = G0(), tilt = r2() < .3 ? (r2() - .5) * .6 : (r2() - .5) * .08;
      add(g, cyl(.04, .05, 2.4, 6, post), 0, 1.2, 0);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(kind === 'dir' ? 1.4 : .8, kind === 'dir' ? 1.4 : .8), new THREE.MeshStandardMaterial({ map: signTex(kind, text), transparent: true, alphaTest: .5, roughness: .6, side: THREE.DoubleSide })); add(g, pl, 0, 2.3, .05, 0, 0, 0);
      add(g, box(kind === 'dir' ? 1.3 : .7, kind === 'dir' ? .5 : .7, .03, sm('#4a4c4e', { metalness: .4 })), 0, 2.3, 0);
      g.rotation.z = tilt; return place(g, x, z, rot);
    };
    junctions().forEach(([jx, jy, jr], k) => {
      if (city(jx, jy) || r() > .75) return;
      const arms = armsAt(jx, jy, jr); arms.forEach((a, ai) => { if (r() > .55) return; const px = jx + a.ux * (jr + 3) - a.uy * (a.w / 2 + 1.6), pz = jy + a.uy * (jr + 3) + a.ux * (a.w / 2 + 1.6); if (!free(px, pz)) return;
        const kind = r() < .35 ? 'dir' : r() < .6 ? 'tri' : 'round'; roadSign(px, pz, Math.atan2(a.ux, a.uy), kind, kind === 'dir' ? pick(r, NAMES) : kind === 'round' ? pick(r, ['50', '30', '70', 'STOP']) : pick(r, ['!', '⚠']), r); n++; });
    });
    // lavori in corso: coni, transenne bianche e rosse sbiadite, il cartello, la lampada gialla, un mucchio di ghiaia
    const transenna = (x, z, rot) => { const g = G0(), wood = PM.woodL(); [-1, 1].forEach(s => { add(g, box(.06, 1, .06, PM.iron()), s * .9, .5, -.2, .25, 0, 0); add(g, box(.06, 1, .06, PM.iron()), s * .9, .5, .2, -.25, 0, 0); });
      const bt = box(2, .26, .04, std({ map: (() => { const k = 'tr'; if (I31.tex[k]) return I31.tex[k]; const c = mk(32, 8), x2 = c.getContext('2d'); for (let i = 0; i < 32; i += 8) { x2.fillStyle = '#d8d0c0'; x2.fillRect(i, 0, 4, 8); x2.fillStyle = '#9a3a2a'; x2.fillRect(i + 4, 0, 4, 8); } x2.fillStyle = 'rgba(60,40,30,.35)'; x2.fillRect(0, 5, 32, 3); return (I31.tex[k] = canvasTex(c)); })(), roughness: .9 })); add(g, bt, 0, .88, 0);
      return place(g, x, z, rot); };
    const cone = (x, z) => { const g = G0(); add(g, box(.42, .05, .42, sm('#2a2a2a')), 0, .025, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(.17, .62, 8), sm('#c8642a', { roughness: .7 })), 0, .34, 0); add(g, cyl(.12, .14, .08, 8, sm('#d8d4cc')), 0, .38, 0); return place(g, x, z, r() * 6); };
    const SITES = [], RD = (M.roads || []).filter(rd => !rd.rect && (rd.kind === 'litoranea' || rd.kind === 'strada'));
    for (let tries = 0; tries < 80 && SITES.length < 9; tries++) {
      const rd = pick(r, RD), k = 4 + Math.floor(r() * (rd.pts.length - 8)), [x, z] = rd.pts[k]; if (SITES.some(s => Math.hypot(s[0] - x, s[1] - z) < 120) || nearJ(x, z, 6)) continue;
      SITES.push([x, z]); const a = rd.pts[k - 2], c = rd.pts[k + 2], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, ux = (c[0] - a[0]) / L, uz = (c[1] - a[1]) / L, nx = -uz, nz = ux, sd = r() < .5 ? 1 : -1, off = rd.w / 4;
      // si chiude mezza carreggiata: coni in diagonale, due transenne, il cartello
      for (let q = -3; q <= 3; q++) { const px = x + ux * q * 2.2 + nx * sd * (off + (Math.abs(q) === 3 ? .8 : 0)), pz = z + uz * q * 2.2 + nz * sd * (off + (Math.abs(q) === 3 ? .8 : 0)); cone(px, pz); }
      transenna(x + nx * sd * (off + .2) - ux * 1.2, z + nz * sd * (off + .2) - uz * 1.2, Math.atan2(ux, uz)); transenna(x + nx * sd * (off + .2) + ux * 1.6, z + nz * sd * (off + .2) + uz * 1.6, Math.atan2(ux, uz) + .2);
      const sx = x - ux * 9 + nx * sd * (rd.w / 2 + 1.2), sz = z - uz * 9 + nz * sd * (rd.w / 2 + 1.2); if (free(sx, sz)) roadSign(sx, sz, Math.atan2(-ux, -uz), 'tri', '⚒', r);
      const lx = x + nx * sd * (off + .2) - ux * 1.2, lz = z + nz * sd * (off + .2) - uz * 1.2; glow(lx, groundH(lx, lz) + 1.15, lz, '#f0a030', 1.1); addLight(lx, groundH(lx, lz) + 1.2, lz, '#f0a030', .8, 4, .9);
      const gx = x + nx * sd * (rd.w / 2 + 3), gz = z + nz * sd * (rd.w / 2 + 3); if (free(gx, gz)) { const pile = new THREE.Mesh(new THREE.ConeGeometry(1.6, .9, 9), sm('#8a8478', { roughness: 1 })); pile.position.set(gx, groundH(gx, gz) + .4, gz); addStatic(pile); }
      n++;
    }
    // posti di blocco della Tutela: davanti al Muro e alla Piazza del Governo, transenne e sacchi di sabbia
    [G.PLACES.varco, G.PLACES.piazza_gov, G.PLACES.muro].forEach(p => { if (!p) return; for (let k = 0; k < 4; k++) { const a = k * 1.57 + .4, x = p.x + Math.cos(a) * 6, z = p.y + Math.sin(a) * 6; if (free(x, z)) transenna(x, z, a); }
      for (let k = 0; k < 2; k++) { const g = G0(); for (let q = 0; q < 7; q++) add(g, box(.7, .3, .4, sm(pick(r, ['#7a6e56', '#6a5e48', '#84785e']), { roughness: 1 })), (q % 4) * .65 - 1, .15 + Math.floor(q / 4) * .3, 0, 0, r() * .2, 0); const x = p.x + (k ? 5 : -5), z = p.y + 4; if (free(x, z)) place(g, x, z, r()); } });
    // arredo delle vie di città: panchine scrostate, paletti, cabine del telefono, buche delle lettere; mai sulla carreggiata
    (M.roads || []).filter(rd => rd.kind === 'citta' || rd.kind === 'litoranea').forEach(rd => {
      let acc = 0, nx0 = 9 + r() * 14;
      for (let k = 1; k < rd.pts.length - 1; k++) { const [ax, az] = rd.pts[k], [bx, bz] = rd.pts[k + 1], L = Math.hypot(bx - ax, bz - az) || 1; acc += L; if (acc < nx0) continue; acc = 0; nx0 = 9 + r() * 16;
        const nx = -(bz - az) / L, nz = (bx - ax) / L, sd = r() < .5 ? 1 : -1, off = rd.w / 2 + (rd.rect ? 1.1 : 1.5), x = ax + nx * sd * off, z = az + nz * sd * off;
        if (!free(x, z) || !city(x, z) || nearJ(x, z, 2)) continue; const rot = Math.atan2(-nx * sd, -nz * sd), q = r();
        if (q < .3) bench(x, z, rot, 'iron'); else if (q < .52) { bollard(x, z); if (free(x + (bx - ax) / L * 1.6, z + (bz - az) / L * 1.6)) bollard(x + (bx - ax) / L * 1.6, z + (bz - az) / L * 1.6); } else if (q < .62) phoneBooth(x, z, rot); else if (q < .7) mailbox(x, z, rot); else if (q < .78) busStop(x + nx * sd * .6, z + nz * sd * .6, rot + Math.PI);
        n++; }
    });
    return n;
  }

  // ---------------- tagli nella roccia e muri di sostegno lungo le strade, dipinti a bordi morbidi (niente scalini) ----------------
  function paintOpere(x, tx0, ty0, n, m) {
    const W0 = M.world, F = W0 && W0.feat; if (!F) return; const P = TP;
    const pat = (kind) => { const k = 'op' + kind; if (I31.tex[k]) return I31.tex[k]; const c = mk(16, 16), g = c.getContext('2d'), rr = rng(kind === 'cut' ? 5 : 6);
      if (kind === 'cut') { g.fillStyle = '#6e6862'; g.fillRect(0, 0, 16, 16); for (let y = 0; y < 16; y += 3) { g.fillStyle = pick(rr, ['#7a746e', '#625c58', '#847c74', '#5a5450']); g.fillRect(0, y, 16, 2); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(30,26,24,.6)'; g.fillRect(2 + i * 4, 0, 1, 16); } }   // strati e i fori delle mine
      else { g.fillStyle = '#5e5a54'; g.fillRect(0, 0, 16, 16); for (let y = 0; y < 16; y += 4) for (let i = (y / 4 % 2) * 3; i < 16; i += 6) { g.fillStyle = pick(rr, ['#8a8478', '#7e786e', '#948e84', '#76706a']); g.fillRect(i, y, 5, 3); } }   // pietre squadrate e malta
      return (I31.tex[k] = x.createPattern(c, 'repeat')); };
    const cut = pat('cut'), wall = pat('wall');
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, f = F[ty * G.GW + tx]; if (!(f & (1024 | 16384))) continue;
      x.fillStyle = f & 16384 ? wall : cut; x.beginPath(); x.ellipse(i * P + P / 2, j * P + P / 2, P * .78, P * .78, 0, 0, 6.3); x.fill();
    }
  }

  // ---------------- vegetazione: sottobosco e chiome, viva, varia, piena ----------------
  const VG31 = { GRN: ['#3e5a34', '#4a6a3a', '#56703e', '#3a5236', '#62743a', '#44603a'], AUT: ['#7a6a34', '#8a5a2e', '#6a4a3a', '#7e6232'], HEATH: ['#5e4a56', '#6a5060', '#7a6a4a'], FLOW: ['#c8b46a', '#d8d0c0', '#8a6a8a', '#b88a4a'] };
  function veg31(v, z, tx, ty, r, put, L0, LT) {
    const T = G.T, x0 = tx * TS, z0 = ty * TS, wild = z === ZN.MACCHIA || z === ZN.MONTE || z === ZN.CAMPAGNA;
    const blob = (x, zz, s, col, lift) => put(LT.leaf, x, groundH(x, zz) + (lift || 0) + s * .25, zz, s * (1 + r() * .4), s * (.6 + r() * .4), s * (1 + r() * .4), r() * 6, col);
    const tf = (x, zz, s, col) => put(LT.tuft, x, groundH(x, zz) - .02, zz, s * (.7 + r() * .6), s * (.8 + r() * .7), s * (.7 + r() * .6), r() * 6, col);
    if (v === T.TREE && wild) {
      // sottobosco: cespugli e felci sotto gli alberi, qualche alberello giovane
      if (r() < .6) blob(x0 + r() * 2, z0 + r() * 2, .55 + r() * .7, pick(r, VG31.GRN));
      if (r() < .45) for (let q = 0; q < 2; q++) tf(x0 + r() * 2, z0 + r() * 2, .9, pick(r, VG31.GRN));
      if (r() < .18) blob(x0 + r() * 2, z0 + r() * 2, .4 + r() * .3, pick(r, VG31.AUT));
      // chiome in più: il bosco è pieno, le chiome si toccano
      if (r() < .22) blob(x0 + .5 + r(), z0 + .5 + r(), 1.4 + r() * 1.1, pick(r, r() < .8 ? VG31.GRN : VG31.AUT), 2.8 + r() * 2.2);
    } else if (v === T.SHRUB) {
      for (let q = 0, k = 1 + Math.floor(r() * 3); q < k; q++) blob(x0 + r() * 2, z0 + r() * 2, .45 + r() * .6, pick(r, z === ZN.DESERTO ? VG31.HEATH : r() < .75 ? VG31.GRN : VG31.AUT));
      if (r() < .5) tf(x0 + r() * 2, z0 + r() * 2, 1, pick(r, VG31.GRN));
    } else if (v === T.GRASS && z !== ZN.CITTA) {
      const k = z === ZN.DESERTO ? 2 : 3; for (let q = 0; q < k; q++) tf(x0 + r() * 2, z0 + r() * 2, .95, pick(r, z === ZN.DESERTO ? VG31.HEATH.concat(['#8e7e52', '#a69668']) : VG31.GRN));
      if (r() < .1) blob(x0 + r() * 2, z0 + r() * 2, .35 + r() * .35, pick(r, VG31.GRN));
      if (r() < .06) for (let q = 0; q < 4; q++) { const fx = x0 + r() * 2, fz = z0 + r() * 2; put(LT.leaf, fx, groundH(fx, fz) + .12, fz, .09, .07, .09, 0, pick(r, VG31.FLOW)); }
    } else if (v === T.ROCK && r() < .3) { blob(x0 + r() * 2, z0 + r() * 2, .3 + r() * .3, pick(r, VG31.GRN)); }
    else if (v === T.GRAVEL && r() < .12) tf(x0 + r() * 2, z0 + r() * 2, .7, pick(r, VG31.GRN));
  }
