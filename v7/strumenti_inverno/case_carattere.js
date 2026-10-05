  // ================= [case] CASE COL CARATTERE =================
  // Le case non sono più scatole uguali: ogni casa ha una storia. Intonaci caldi e diversi (basamento più scuro,
  // l'ultimo piano rifatto in un'altra tinta), persiane di legno (aperte, socchiuse, chiuse, una che manca),
  // fioriere sotto le finestre, tende e tapparelle dietro i vetri accesi, bovindi di legno a sbalzo col tettuccio in coppi,
  // tettoie in coppi sopra le botteghe, lanterne di carta rossa, intonaco scrostato coi mattoni sotto, umidità che sale,
  // colature sotto i davanzali, edera che pende dai tetti, giardini pensili e pergolati, bucato steso tra le finestre.
  // Tutto è deciso dal seme dell'edificio (stessa casa = stesso aspetto a ogni avvio) e fuso per edificio.
  // Riferimenti di Andrea: diorami di case giapponesi, coreane e romane (Quarticciolo), casette verdi di legno.
  function caseScheme(b, i, kind, PA, fl) {   // tinte dei piani: deciso PRIMA di montare i moduli
    if (kind !== 'borgo' && kind !== 'farm') return {};
    const r = rng(i * 389 + 17), q = r(), cs = {};
    if (q < .4) cs.g = palMat([shade(PA[0], .7), PA[1], PA[2], PA[3]]);                                                    // basamento più scuro della stessa tinta
    else if (q < .62) cs.g = palMat([pick(r, ['#8a8276', '#7a7268', '#6e6a64', '#94867a']), shade(PA[1], .9), PA[2], PA[3]]);   // piano terra in pietra o cemento
    if (kind === 'borgo' && fl >= 3 && r() < .38) {   // l'ultimo piano (o gli ultimi due) rifatto dopo, con un'altra tinta
      const P2 = PALS.borgo, p2 = P2[Math.floor(r() * P2.length)];
      cs.split = fl - 1 - (fl >= 5 && r() < .5 ? 1 : 0); cs.u = palMat([p2[0], p2[1], PA[2], PA[3]]);
    }
    return cs;
  }
  // ---- atlante: una texture sola per tutte le parti piccole (un materiale per edificio invece di venti) ----
  const CA = { n: 0, map: {} };
  function caAtlas() {
    if (CA.c) return; CA.c = mk(256, 256); CA.x = CA.c.getContext('2d'); CA.tex = canvasTex(CA.c); CA.mat = std({ map: CA.tex, roughness: .92 });
  }
  function caCell(hex, pat) {
    const key = hex + (pat || ''); if (CA.map[key] !== undefined) return CA.map[key];
    const i = Math.min(255, CA.n++), cx = (i % 16) * 16, cy = Math.floor(i / 16) * 16, x = CA.x, r = rng(i * 31 + 7);
    x.fillStyle = hex; x.fillRect(cx, cy, 16, 16);
    if (pat === 'slat') { for (let k = 1; k < 15; k += 3) { x.fillStyle = shade(hex, .6); x.fillRect(cx + 1, cy + k, 14, 1); x.fillStyle = shade(hex, 1.18); x.fillRect(cx + 1, cy + k + 1, 14, 1); } x.fillStyle = shade(hex, .72); x.fillRect(cx, cy, 16, 1); x.fillRect(cx, cy + 15, 16, 1); x.fillRect(cx, cy, 1, 16); x.fillRect(cx + 15, cy, 1, 16); for (let k = 0; k < 6; k++) { x.fillStyle = 'rgba(40,30,24,.35)'; x.fillRect(cx + Math.floor(r() * 14), cy + Math.floor(r() * 14), 2, 1); } }
    else if (pat === 'leaf') { for (let k = 0; k < 46; k++) { x.fillStyle = shade(hex, .55 + r() * .85); x.fillRect(cx + Math.floor(r() * 15), cy + Math.floor(r() * 15), 2, 2); } }
    else if (pat === 'cloth') { for (let k = 0; k < 16; k += 4) { x.fillStyle = shade(hex, .8); x.fillRect(cx + k, cy, 1, 16); } x.fillStyle = shade(hex, .7); x.fillRect(cx, cy + 14, 16, 2); }
    else if (pat === 'paper') { for (let k = 3; k < 14; k += 3) { x.fillStyle = shade(hex, .72); x.fillRect(cx, cy + k, 16, 1); } x.fillStyle = '#1a1416'; x.fillRect(cx, cy, 16, 2); x.fillRect(cx, cy + 14, 16, 2); }
    else if (pat === 'plank') { for (let k = 0; k < 16; k += 4) { x.fillStyle = shade(hex, .68); x.fillRect(cx + k, cy, 1, 16); x.fillStyle = shade(hex, .88 + r() * .28); x.fillRect(cx + k + 1, cy, 3, 16); } }
    else if (pat === 'glass') { x.fillStyle = shade(hex, 1.5); x.fillRect(cx + 2, cy + 2, 5, 1); x.fillStyle = '#1a1820'; x.fillRect(cx + 7, cy, 2, 16); x.fillRect(cx, cy + 7, 16, 2); }
    if (CA.tex) CA.tex.needsUpdate = true;
    return CA.map[key] = i;
  }
  function caUV(geo, i, full) {
    const u0 = (i % 16) * 16, v0 = Math.floor(i / 16) * 16, uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) { const u = full ? uv.getX(k) : .5, v = full ? uv.getY(k) : .5; uv.setXY(k, (u0 + 1 + u * 14) / 256, 1 - (v0 + 1 + (1 - v) * 14) / 256); }
    return geo;
  }
  const cbox = (w, h, d, hex, pat) => new THREE.Mesh(caUV(new THREE.BoxGeometry(w, h, d), caCell(hex, pat), !!pat), CA.mat);
  const cblob = (rad, hex, pat) => new THREE.Mesh(caUV(new THREE.IcosahedronGeometry(rad, 0), caCell(hex, pat || 'leaf'), false), CA.mat);
  const ccyl = (rt, rb, h, seg, hex, pat) => new THREE.Mesh(caUV(new THREE.CylinderGeometry(rt, rb, h, seg || 8), caCell(hex, pat), !!pat), CA.mat);
  // scatola con una texture che si ripete a misura (s metri per ripetizione), per legno e coppi
  function tbox(w, h, d, mat, s) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
    return new THREE.Mesh(g, mat);
  }
  // ---- texture: assi di legno, decalcomanie (mattoni sotto l'intonaco, colature, macchie), umidità ----
  const CT = {};
  function caseTex() {
    if (CT.wood) return;
    { const c = mk(32, 32), x = c.getContext('2d'), r = rng(707);   // assi verticali, legno vecchio
      for (let k = 0; k < 32; k += 4) { const base = pick(r, ['#6a4e36', '#5e4430', '#74563a', '#634a34', '#57402e']); x.fillStyle = base; x.fillRect(k, 0, 4, 32); x.fillStyle = shade(base, 1.18); x.fillRect(k + 1, 0, 1, 32); x.fillStyle = '#2a1e16'; x.fillRect(k, 0, 1, 32);
        for (let j = 0; j < 3; j++) { x.fillStyle = 'rgba(30,20,14,.35)'; x.fillRect(k + 1 + Math.floor(r() * 2), Math.floor(r() * 30), 2, 1 + Math.floor(r() * 3)); } }
      for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(150,140,120,.18)'; x.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 2); }
      CT.wood = canvasTex(c); CT.wood.wrapS = CT.wood.wrapT = THREE.RepeatWrapping; CT.woodM = std({ map: CT.wood, roughness: 1 }); }
    { const c = mk(32, 32), x = c.getContext('2d'), r = rng(808);   // coppi: file in rilievo, luce sul dorso, ombra sotto, qualche coppo rotto o col muschio
      x.fillStyle = '#4a2a20'; x.fillRect(0, 0, 32, 32);
      for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 4) { const base = pick(r, ['#b0603e', '#a4583a', '#ba6c48', '#9a5034', '#c07450', '#a86040']);
        x.fillStyle = base; x.fillRect(k, y, 4, 7); x.fillStyle = shade(base, 1.22); x.fillRect(k + 1, y, 1, 6); x.fillStyle = shade(base, .62); x.fillRect(k + 3, y, 1, 7); x.fillStyle = 'rgba(20,10,8,.55)'; x.fillRect(k, y + 7, 4, 1);
        if (r() < .12) { x.fillStyle = pick(r, ['#5a6a3a', '#4a5a34', '#3a2a24']); x.fillRect(k, y + 4, 3, 3); } }
      const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; CT.tileM = std({ map: t, roughness: .8 }); }
    { const c = mk(256, 256), x = c.getContext('2d'), r = rng(1312);
      const blob = (cx, cy, R, k) => { x.beginPath(); for (let a = 0; a <= 24; a++) { const t = a / 24 * 6.283, rr = R * (.62 + .38 * Math.sin(t * 3 + k) * Math.sin(t * 2 + k * 1.7) + r() * .22); a ? x.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * .8) : x.moveTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * .8); } x.closePath(); };
      for (let v = 0; v < 8; v++) {   // 0-7: intonaco caduto, mattoni sotto
        const cx = (v % 4) * 64 + 32, cy = Math.floor(v / 4) * 64 + 32;
        x.save(); blob(cx, cy, 30, v); x.fillStyle = 'rgba(236,226,206,.55)'; x.fill(); x.restore();             // bordo d'intonaco rotto, chiaro
        x.save(); blob(cx + 1, cy + 1, 27, v); x.fillStyle = 'rgba(40,30,26,.55)'; x.fill(); x.restore();         // ombra dello spessore
        x.save(); blob(cx, cy, 25, v); x.clip(); x.fillStyle = '#8a8076'; x.fillRect(cx - 32, cy - 32, 64, 64);     // malta
        for (let yy = -32, row = 0; yy < 32; yy += 5, row++) for (let xx = -32 + (row % 2) * 5; xx < 32; xx += 10) { x.fillStyle = pick(r, ['#8e4a36', '#9a563e', '#7e4030', '#a4604a', '#864634', '#6e3a2c']); x.fillRect(cx + xx, cy + yy, 9, 4); if (r() < .3) { x.fillStyle = 'rgba(20,14,12,.3)'; x.fillRect(cx + xx, cy + yy + 3, 9, 1); } }
        for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(30,22,18,.25)'; x.fillRect(cx - 30 + Math.floor(r() * 60), cy - 30 + Math.floor(r() * 60), 2, 2); }
        x.restore();
      }
      for (let v = 8; v < 12; v++) {   // 8-11: colature sotto i davanzali
        const cx = (v % 4) * 64, cy = Math.floor(v / 4) * 64;
        for (let i = 0; i < 9; i++) { const sx = cx + 10 + Math.floor(r() * 44), len = 20 + Math.floor(r() * 40), g = x.createLinearGradient(0, cy, 0, cy + len); g.addColorStop(0, 'rgba(34,28,26,.5)'); g.addColorStop(1, 'rgba(34,28,26,0)'); x.fillStyle = g; x.fillRect(sx, cy, 1 + Math.floor(r() * 3), len); }
        const g = x.createLinearGradient(0, cy, 0, cy + 22); g.addColorStop(0, 'rgba(34,28,26,.35)'); g.addColorStop(1, 'rgba(34,28,26,0)'); x.fillStyle = g; x.fillRect(cx + 6, cy, 52, 22);
      }
      for (let v = 12; v < 16; v++) {   // 12-15: macchie d'umido e muffa
        const cx = (v % 4) * 64 + 32, cy = Math.floor(v / 4) * 64 + 32;
        for (let i = 0; i < 14; i++) { const gx = cx + (r() - .5) * 34, gy = cy + (r() - .5) * 30, R = 6 + r() * 14, g = x.createRadialGradient(gx, gy, 0, gx, gy, R); const col = r() < .4 ? '58,62,40' : '36,30,28'; g.addColorStop(0, `rgba(${col},.3)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(gx - R, gy - R, R * 2, R * 2); }
      }
      CT.dec = canvasTex(c); CT.dec.magFilter = THREE.NearestFilter;
      CT.decM = std({ map: CT.dec, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); }
    { const c = mk(64, 32), x = c.getContext('2d'), r = rng(99);   // umidità che sale dal marciapiede: bordo frastagliato
      let h = 14; for (let k = 0; k < 64; k++) { h = Math.max(6, Math.min(26, h + (r() - .5) * 4)); const g = x.createLinearGradient(0, 32, 0, 32 - h); g.addColorStop(0, 'rgba(30,26,22,.6)'); g.addColorStop(.7, 'rgba(36,32,26,.32)'); g.addColorStop(1, 'rgba(40,36,30,0)'); x.fillStyle = g; x.fillRect(k, 32 - h, 1, h);
        if (r() < .25) { x.fillStyle = 'rgba(220,214,200,.35)'; x.fillRect(k, 32 - h + Math.floor(r() * 3), 1, 1); } }   // salnitro
      CT.damp = canvasTex(c); CT.damp.wrapS = THREE.RepeatWrapping; CT.damp.magFilter = THREE.NearestFilter;
      CT.dampM = std({ map: CT.damp, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); }
    litMat('#000');   // inizializza litTex
    CT.lantM = std({ map: CA.tex, color: '#ffffff', emissive: '#ff5a2a', emissiveMap: litTex, emissiveIntensity: 1, roughness: .8 });
    CT.lit = {};
  }
  function decal(w, h, v, mat) {   // piano con un pezzo dell'atlante delle decalcomanie
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, u0 = (v % 4) * .25, v0 = 1 - (Math.floor(v / 4) + 1) * .25;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * .25, v0 + uv.getY(k) * .25);
    return new THREE.Mesh(g, mat || CT.decM);
  }
  const caseLit = c => CT.lit[c] || (CT.lit[c] = litMat(c));

  function buildCase() {
    caAtlas(); caseTex();
    const T = G.T, WD = M.world && M.world.districtAt;
    const SHUTC = ['#4a5a3e', '#3e4e3a', '#5a4030', '#6a3a2e', '#58626a', '#7a6a4e', '#3a4a48', '#6e4a3a'];   // verde bottiglia, noce, sangue di bue, grigio, sabbia
    const LEAF = ['#3e5a32', '#4a6a38', '#56683a', '#5e6a40', '#46603a'], FLOW = ['#c03a3a', '#d06a8a', '#e0b040', '#e8e0d0', '#b04a70'];
    const CLOTH = ['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a', '#e8e4dc', '#6a8a5a', '#8a5a8a'];
    const IRON = '#26262c', WOODD = '#4a3626', POT = '#9a5236';
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b, G0 = rec.geo; if (!b || !G0 || !b.__win || rec.caseDone) return;
      const kind = modKind(b); if (kind !== 'borgo' && kind !== 'farm') return;
      const dd = WD ? WD(b.x * TS) : 'centro'; if (dd === 'base') return;
      const r = rng(bi * 7919 + 3), x0 = G0.x0, z0 = G0.z0, w = G0.w, d = G0.d, base = G0.y0, fl = Math.max(1, b.fl || 1), top = base + G0.H, borgo = kind === 'borgo';
      const PP = b.__prop, face0 = faceOf(b), g = new THREE.Group();
      const isOpen = v => v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY;
      // i quattro lati: punto di partenza, direzione lungo il muro, orientamento; per ogni lato quanto dà sulla strada e quanto si vede
      const FACES = {
        S: { L: w, p: [x0, z0 + d], yaw: 0, tile: k => [b.x + k, b.y + b.h], n: b.w },
        N: { L: w, p: [x0 + w, z0], yaw: Math.PI, tile: k => [b.x + b.w - 1 - k, b.y - 1], n: b.w },
        E: { L: d, p: [x0 + w, z0 + d], yaw: Math.PI / 2, tile: k => [b.x + b.w, b.y + b.h - 1 - k], n: b.h },
        W: { L: d, p: [x0, z0], yaw: -Math.PI / 2, tile: k => [b.x - 1, b.y + k], n: b.h },
      };
      Object.keys(FACES).forEach(f => { const F = FACES[f]; let o = 0, v = 0; for (let k = 0; k < F.n; k++) { const t = G.tileAt(...F.tile(k)); if (isOpen(t)) o++; if (t !== T.BLD) v++; } F.open = o / F.n >= .5; F.vis = v / F.n >= .5; F.cam = f === 'S' || f === 'E'; });
      const frames = {};
      const fr = f => { if (frames[f]) return frames[f]; const F = FACES[f], a = new THREE.Group(); a.position.set(F.p[0], 0, F.p[1]); a.rotation.y = F.yaw; g.add(a); return frames[f] = a; };
      const at = (f, o, u, y, z) => { o.position.set(u, y, z); fr(f).add(o); return o; };
      const inMural = (f, u) => PP && PP.f === f && u > PP.k0 * TS - .3 && u < PP.k1 * TS + .3;
      const wins = b.__win.filter(W0 => FACES[W0.f].vis && !inMural(W0.f, W0.u));
      const showF = Object.keys(FACES).filter(f => FACES[f].vis && (FACES[f].cam || FACES[f].open));

      // ---- persiane: un colore per casa, quasi tutte aperte, qualcuna socchiusa o chiusa, una che manca ----
      const shut = borgo ? r() < .58 : r() < .35, shutC = pick(r, SHUTC), flowers = r() < .5, blinds = r() < .7;
      wins.forEach(W0 => {
        if (!W0.name.includes('window') || W0.name.includes('wide')) return;
        const D = WIN[W0.name]; if (!D) return;
        const u = W0.u, yc = W0.y + D[2], ww = D[0], hh = D[1], f = W0.f, lw = ww / 2 + .02;
        if (shut && !(W0.g && W0.shop)) {
          const st = r(), closed = st > .9 && !W0.lit;
          [-1, 1].forEach(s => {
            if (st < .04 && s > 0) return;   // un'anta è caduta
            const leaf = cbox(lw, hh + .06, .05, shutC, 'slat');
            if (closed) at(f, leaf, u + s * lw / 2, yc, .1);
            else if (st > .78 && s > 0) { const a = .9 + r() * .5; leaf.rotation.y = s * a; at(f, leaf, u + s * (ww / 2 + Math.cos(a) * lw / 2), yc, .07 + Math.sin(a) * lw / 2); }   // socchiusa
            else at(f, leaf, u + s * (ww / 2 + lw / 2 + .06), yc, .08);   // aperta contro il muro
          });
        }
        // tende e tapparelle dietro ai vetri accesi: le finestre non sono più rettangoli tutti uguali
        if (W0.lit && blinds) { const q = r();
          if (q < .45) at(f, cbox(ww - .08, hh * (.25 + r() * .4), .02, pick(r, ['#c8b89a', '#a89070', '#8a6a52', '#d0c4a8']), 'slat'), u, yc + hh / 2 - .02 - hh * .15, -.08);
          else if (q < .8) { const cc = pick(r, ['#b04838', '#c8a070', '#8a5a70', '#d8c8a8', '#6a7a5a']); [-1, 1].forEach(s => at(f, cbox(ww * .26, hh - .1, .02, cc, 'cloth'), u + s * (ww / 2 - ww * .13 - .03), yc, -.08)); }
        }
        // fioriere sotto il davanzale (non al piano terra dei negozi)
        if (flowers && !W0.g && r() < .55) {
          const by = yc - hh / 2 - .14; at(f, cbox(ww + .1, .2, .26, pick(r, [POT, '#5a5048', WOODD, '#7a7a74'])), u, by, .2);
          for (let q = 0; q < 4; q++) { const bl = cblob(.15 + r() * .07, pick(r, LEAF)); bl.scale.set(1, .8, .9); at(f, bl, u - ww / 2 + .1 + q * (ww - .1) / 3, by + .2, .2 + (r() - .5) * .08); }
          if (r() < .6) for (let q = 0; q < 5; q++) at(f, cbox(.07, .07, .07, pick(r, FLOW)), u + (r() - .5) * ww, by + .3 + r() * .1, .24 + r() * .08);
          if (r() < .4) for (let q = 0; q < 3; q++) { const tr = cblob(.09, pick(r, LEAF)); tr.scale.set(.8, 2.2, .6); at(f, tr, u + (r() - .5) * ww, by - .25 - r() * .2, .3); }   // ricadenti
        }
      });

      // ---- bovindo di legno a sbalzo (uno o due piani), col tettuccio in coppi ----
      if (borgo && fl >= 2 && r() < (fl >= 3 ? .5 : .32)) {
        const cand = showF.filter(f => FACES[f].cam && FACES[f].n >= 2); if (cand.length) {
          const f = pick(r, cand), F = FACES[f], wide = F.n >= 4 && r() < .45, k = Math.floor(r() * (F.n - (wide ? 1 : 0))), u = k * TS + (wide ? 2 : 1);
          if (!inMural(f, u)) {
            const f0 = 1 + Math.floor(r() * (fl - 2)), nf = Math.min(fl - f0, r() < .5 ? 2 : 1), y0 = base + MG + (f0 - 1) * MF + .05, H = nf * MF - .15, bw = wide ? 3.7 : 1.75, dep = .8 + r() * .25;
            const plank = r() < .6, bodyC = pick(r, ['#c8b48a', '#8a6a4a', '#b07a5a', '#6a7a6a', '#a89a7a']);
            const body = plank ? tbox(bw, H, dep, CT.woodM, 1.2) : cbox(bw, H, dep, bodyC);
            at(f, body, u, y0 + H / 2, dep / 2);
            for (let q = 0; q < nf; q++) {   // finestre del bovindo: una fascia sul davanti, due strette sui fianchi
              const yy = y0 + q * MF + 1.25, lit = r() < .55, gm = lit ? caseLit(pick(r, LIT)) : null;
              const pane = gm ? new THREE.Mesh(new THREE.PlaneGeometry(bw - .4, .95), gm) : cbox(bw - .4, .95, .02, '#2a3440', 'glass');
              at(f, pane, u, yy, dep + .015);
              for (let m = 0; m <= (wide ? 4 : 2); m++) at(f, cbox(.06, 1.02, .05, WOODD), u - (bw - .4) / 2 + m * (bw - .4) / (wide ? 4 : 2), yy, dep + .03);
              at(f, cbox(bw - .3, .07, .12, WOODD), u, yy - .52, dep + .04); at(f, cbox(bw - .3, .06, .08, WOODD), u, yy + .52, dep + .03);
              [-1, 1].forEach(s => { const sp = cbox(.02, .8, .32, '#2a3440', 'glass'); at(f, sp, u + s * (bw / 2 + .01), yy, dep * .55); });
              if (gm) { const N = [Math.sin(F.yaw), Math.cos(F.yaw)], T2 = [Math.cos(F.yaw), -Math.sin(F.yaw)], wx = F.p[0] + T2[0] * u + N[0] * (dep + .4), wz = F.p[1] + T2[1] * u + N[1] * (dep + .4); if (r() < .5) addSpill(wx, wz, N[0], N[1], '#ffb060', .9, 5); }
            }
            const roof = tbox(bw + .35, .09, dep + .4, CT.tileM, 1.5); roof.rotation.x = .38; at(f, roof, u, y0 + H + .18, dep / 2 + .12);
            at(f, cbox(bw + .3, .14, .06, WOODD), u, y0 + H + .02, dep + .3);
            [-1, 1].forEach(s => { const br = cbox(.09, .09, dep * 1.25, WOODD); br.rotation.x = -.75; at(f, br, u + s * (bw / 2 - .2), y0 - .35, dep * .42); });   // mensole
            at(f, cbox(bw, .12, dep, shade(bodyC, .7)), u, y0 - .02, dep / 2);
          }
        }
      }

      // ---- tettoia in coppi sopra il piano terra delle botteghe, con le mensole di legno ----
      const F0 = FACES[face0], shopLike = !!(b.shop || b.sign || b.use);
      let pent = false;
      if (borgo && F0 && F0.open && !(PP && PP.f === face0) && (shopLike ? r() < .5 : r() < .22)) {
        pent = true; const L = F0.L + .2, yT = base + MG + .1, dep = 1.05;
        const roof = tbox(L, .1, dep + .1, CT.tileM, 1.5); roof.rotation.x = .34; at(face0, roof, F0.L / 2, yT - Math.sin(.34) * dep / 2, dep / 2);
        at(face0, cbox(L, .12, .06, WOODD), F0.L / 2, yT - Math.sin(.34) * dep - .02, dep + .02);   // gronda
        for (let u2 = .15; u2 < F0.L; u2 += Math.max(1.8, F0.L / Math.max(2, Math.round(F0.L / 2.6)))) { const br = cbox(.1, .1, dep * 1.15, WOODD); br.rotation.x = -.62; at(face0, br, u2, yT - .5, dep * .44); }
      }
      // ---- lanterne di carta rossa ai lati dell'insegna dei locali ----
      if (borgo && F0 && F0.open && b.door && (b.shop || b.sign) && r() < .65) {
        const du = { S: (b.door[0] - b.x) * TS + 1, N: (b.x + b.w - 1 - b.door[0]) * TS + 1, E: (b.y + b.h - 1 - b.door[1]) * TS + 1, W: (b.door[1] - b.y) * TS + 1 }[face0];
        const yL = base + (pent ? MG - .55 : 2.85), zL = pent ? .75 : .55, pts = [];
        [-1, 1].forEach(s => { for (let q = 0; q < 2; q++) { const uu = du + s * (2.0 + q * .55); if (uu < .3 || uu > F0.L - .3) continue; pts.push(uu); } });
        pts.forEach((uu, q) => {
          const la = new THREE.Mesh(caUV(new THREE.SphereGeometry(.2, 8, 6), caCell('#8a2418', 'paper'), true), CT.lantM); la.scale.y = 1.3; at(face0, la, uu, yL - (q % 2) * .12, zL);
          at(face0, ccyl(.1, .1, .05, 8, '#1a1416'), uu, yL - (q % 2) * .12 + .27, zL); at(face0, ccyl(.1, .1, .05, 8, '#1a1416'), uu, yL - (q % 2) * .12 - .27, zL);
          at(face0, cbox(.015, .3, .015, IRON), uu, yL - (q % 2) * .12 + .44, zL);
        });
        if (pts.length) { at(face0, cbox(Math.max(...pts) - Math.min(...pts) + .2, .02, .02, IRON), (Math.max(...pts) + Math.min(...pts)) / 2, yL + .58, zL);
          const F = F0, um = (Math.max(...pts) + Math.min(...pts)) / 2, N = [Math.sin(F.yaw), Math.cos(F.yaw)], T2 = [Math.cos(F.yaw), -Math.sin(F.yaw)];
          addLight(F.p[0] + T2[0] * um + N[0] * (zL + .6), yL, F.p[1] + T2[1] * um + N[1] * (zL + .6), '#ff7040', 1.5, 6.5, .05); }
      }

      // ---- il tempo sui muri: intonaco caduto coi mattoni, colature, macchie, umidità dal basso ----
      showF.forEach(f => {
        const F = FACES[f]; if (F.L < 2) return;
        const np = Math.floor(r() * (borgo ? 5 : 3) + (F.cam ? 1 : 0));
        for (let q = 0; q < np; q++) {
          const k = Math.floor(r() * (F.n + 1)), u = Math.min(F.L - .35, Math.max(.35, k * TS + (r() - .5) * .3)); if (inMural(f, u)) continue;
          const sw = .55 + r() * .5, sh = .45 + r() * .6, yy = base + .9 + r() * Math.max(.2, top - base - 1.8);
          const pa = decal(sw, sh, Math.floor(r() * 8)); pa.rotation.z = (r() - .5) * .5; at(f, pa, u, yy, .075);
        }
        if (r() < .7) { const k = Math.floor(r() * F.n), u = k * TS + 1; if (!inMural(f, u)) at(f, decal(1.6 + r(), 1.4 + r() * 1.2, 12 + Math.floor(r() * 4)), u + (r() - .5), base + 1 + r() * Math.max(.2, top - base - 2.4), .07); }
        // umidità che sale, solo sui moduli di muro pieno del piano terra
        ((b.__gwall && b.__gwall[f]) || []).forEach(k => { const u = k * TS + 1; if (inMural(f, u)) return; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 1.5), CT.dampM); const uv = m.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * .5 + (k % 2) * .5); at(f, m, u, base + .5 + .75 - .2, .068); });
      });
      wins.forEach(W0 => { if (W0.g || r() > .28) return; const D = WIN[W0.name]; if (!D) return; at(W0.f, decal(D[0] * .9, .9 + r() * .6, 8 + Math.floor(r() * 4)), W0.u, W0.y + D[2] - D[1] / 2 - .55, .072); });

      // ---- edera e rampicanti che pendono dal tetto ----
      if (rec.flat && (borgo ? r() < .55 : r() < .3)) {
        const cand = showF.filter(f => FACES[f].cam); const nv = 1 + Math.floor(r() * 3);
        for (let q = 0; q < nv && cand.length; q++) {
          const f = pick(r, cand), F = FACES[f], u = Math.min(F.L - .4, Math.max(.4, Math.floor(r() * (F.n + 1)) * TS + (r() - .5) * .4)); if (inMural(f, u)) continue;
          const len = Math.min(top - base - .5, 1.5 + r() * (top - base) * .55), col = pick(r, LEAF), wd = .5 + r() * .5;
          for (let yy = 0; yy < len; yy += .26) { const t = yy / len, s = (1 - t * .6) * (.22 + r() * .08); for (let m = 0; m < (t < .3 ? 3 : 2); m++) { const bl = cblob(s, r() < .15 ? shade(col, 1.25) : col); bl.scale.set(1.2, 1, .45); at(f, bl, u + (r() - .5) * wd * (1 - t * .5), top + .3 - yy, .12 + r() * .1); } }
          for (let m = 0; m < 4; m++) { const bl = cblob(.3, col); bl.scale.set(1.3, .7, 1); at(f, bl, u + (r() - .5) * 1.2, top + .55, -.2 + r() * .3); }   // il ciuffo sul bordo del tetto
        }
      }
      // ---- giardino pensile e pergolato sui tetti piani ----
      if (rec.flat && borgo && w >= 5 && d >= 5 && r() < .38) {
        const np = 3 + Math.floor(r() * 4);
        for (let q = 0; q < np; q++) {
          const alongS = r() < .5, px = alongS ? x0 + .8 + r() * (w - 1.6) : x0 + w - .8, pz = alongS ? z0 + d - .8 : z0 + .8 + r() * (d - 1.6), t = r();
          const pot = ccyl(.28, .22, .45, 8, pick(r, [POT, '#8a5a40', '#6a6a64'])); pot.position.set(px, top + .3, pz); g.add(pot);
          if (t < .45) { const bl = cblob(.42 + r() * .2, pick(r, LEAF)); bl.position.set(px, top + .85, pz); g.add(bl); }
          else if (t < .75) { const tr = ccyl(.05, .06, 1.1, 5, WOODD); tr.position.set(px, top + 1.05, pz); g.add(tr); for (let m = 0; m < 3; m++) { const bl = cblob(.42, pick(r, LEAF)); bl.position.set(px + (r() - .5) * .5, top + 1.6 + m * .22, pz + (r() - .5) * .5); g.add(bl); } }   // alberello
          else { const c2 = new THREE.Mesh(caUV(new THREE.ConeGeometry(.3, 1.6, 7), caCell('#34502e', 'leaf'), false), CA.mat); c2.position.set(px, top + 1.3, pz); g.add(c2); }   // cipressino
        }
        if (r() < .45) {   // pergolato con la vite secca e una sedia
          const pw = 2.6, pd = 2.2, px = x0 + w - pw / 2 - .7, pz = z0 + d - pd / 2 - .7;
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const p = cbox(.1, 2.3, .1, WOODD); p.position.set(px + sx * pw / 2, top + 1.15, pz + sz * pd / 2); g.add(p); });
          for (let q = 0; q < 5; q++) { const bm = cbox(pw + .3, .08, .08, WOODD); bm.position.set(px, top + 2.32, pz - pd / 2 + q * pd / 4); g.add(bm); }
          for (let q = 0; q < 7; q++) { const bl = cblob(.35 + r() * .2, pick(r, ['#5a6a3a', '#6a6a40', '#4a5a34'])); bl.scale.y = .45; bl.position.set(px + (r() - .5) * pw, top + 2.45, pz + (r() - .5) * pd); g.add(bl); }
          const ch = cbox(.45, .06, .45, '#8a3a2e'); ch.position.set(px - .3, top + .5, pz); g.add(ch); const cb = cbox(.45, .5, .05, '#8a3a2e'); cb.position.set(px - .3, top + .75, pz - .22); g.add(cb);
          const tb = ccyl(.35, .35, .05, 10, '#c8c0b0'); tb.position.set(px + .5, top + .75, pz); g.add(tb); const tl = ccyl(.04, .04, .72, 5, IRON); tl.position.set(px + .5, top + .37, pz); g.add(tl);
        }
      }
      // ---- bucato steso tra due finestre ----
      if (borgo && fl >= 2 && r() < .3) {
        const byF = {}; wins.forEach(W0 => { if (W0.g || !FACES[W0.f].cam) return; const key = W0.f + W0.y.toFixed(1); (byF[key] = byF[key] || []).push(W0); });
        const rows = Object.values(byF).filter(a => a.length >= 2);
        if (rows.length) {
          const row = pick(r, rows).sort((a, b2) => a.k - b2.k), i0 = Math.floor(r() * (row.length - 1)), A = row[i0], B = row[i0 + 1], D = WIN[A.name] || [.95, 1.35, 1.3];
          const u0 = A.u, u1 = B.u, yy = A.y + D[2] - D[1] / 2 - .25, f = A.f;
          [u0, u1].forEach(uu => at(f, cbox(.04, .04, .5, IRON), uu, yy, .27));
          at(f, cbox(u1 - u0, .015, .015, '#d8d8d0'), (u0 + u1) / 2, yy, .5);
          for (let uu = u0 + .3; uu < u1 - .2; uu += .38 + r() * .2) { if (r() < .2) continue; const c = cbox(.28 + r() * .15, .4 + r() * .3, .03, pick(r, CLOTH), 'cloth'); c.rotation.z = (r() - .5) * .1; at(f, c, uu, yy - c.geometry.parameters.height / 2, .5); }
        }
      }

      if (!g.children.length) { rec.caseDone = true; return; }
      const gm = mergeGroup(g);
      gm.traverse(o => { if (!o.isMesh) return; const dec = o.material === CT.decM || o.material === CT.dampM; o.castShadow = !dec; o.receiveShadow = true; if (dec) o.renderOrder = 1; });
      ownMats(gm, rec); scene.add(gm); rec.caseGrp = gm; rec.caseDone = true; n++;
    });
    return n;
  }
