  // ================= [inverno30] LUCE COTTA: la città col coprifuoco =================
  // Per ogni blocco di terreno, una volta sola: la luce di TUTTE le sorgenti accese (lampioni, insegne, porte, vetrine, finestre
  // del piano terra) cade a terra con le ombre degli edifici (raggio sulla mappa delle caselle). Diventa la luce emissiva del terreno,
  // accesa di notte. Compressione morbida (1 - e^-x): le pozze si sommano senza mai bruciare.
  // SPILL = luce che esce da vetrine e finestre: calda, bassa, solo verso la strada.
  const SPILLS = [], BAKEQ = 4;   // 4 texel per casella = mezzo metro
  function addSpill(x, z, nx, nz, color, base, dist) { const gy = groundH(x, z); SPILLS.push({ x, z, y: gy + 1.3, gy, nx, nz, color: new THREE.Color(color), base, dist: dist || 6, spill: true }); }
  function bakeLight(tx0, ty0, n, m) {
    const T = G.T, Q = BAKEQ, W = n * Q, H = m * Q, acc = new Float32Array(W * H * 3), X0 = tx0 * TS, Z0 = ty0 * TS, tq = TS / Q;
    const solid = (wx, wz) => { const tx = Math.floor(wx / TS), ty = Math.floor(wz / TS); return G.tileAt(tx, ty) === T.BLD; };
    const src = LSRC.filter(L => !L.off && L.base > 0).concat(SPILLS);
    src.forEach(L => {
      const R = (L.dist || 8) * (L.spill ? 1 : 1.5); if (L.x < X0 - R || L.x > X0 + n * TS + R || L.z < Z0 - R || L.z > Z0 + m * TS + R) return;
      if (L.gy === undefined) L.gy = groundH(L.x, L.z); if (solid(L.x, L.z)) return;
      const h = Math.max(.8, L.y - L.gy), h2 = h * h, cr = L.color.r, cg = L.color.g, cb = L.color.b, I = L.base * (L.spill ? .55 : .38) * (L.flick > .5 ? .7 : 1);
      const i0 = Math.max(0, Math.floor((L.x - R - X0) / tq)), i1 = Math.min(W - 1, Math.ceil((L.x + R - X0) / tq)), j0 = Math.max(0, Math.floor((L.z - R - Z0) / tq)), j1 = Math.min(H - 1, Math.ceil((L.z + R - Z0) / tq));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = X0 + (i + .5) * tq, pz = Z0 + (j + .5) * tq, dx = px - L.x, dz = pz - L.z, d2 = dx * dx + dz * dz; if (d2 > R * R) continue;
        const d = Math.sqrt(d2);
        let f = Math.pow(h2 / (d2 + h2), 1.5) * Math.pow(1 - d / R, 2);
        if (L.spill) { const dot = (dx * L.nx + dz * L.nz) / (d || 1); if (dot <= .05) continue; f *= Math.pow(dot, .6); }
        if (f < .004) continue;
        if (solid(px, pz)) continue;
        // ombra: dal punto verso la sorgente, a passi di un metro; il primo metro vicino alla sorgente non conta (lampade a muro)
        let lit = true; const st = Math.floor(d / 1); for (let s = 1; s < st; s++) { const t = s / st; if (d * (1 - t) < .9) break; if (solid(px - dx * t, pz - dz * t)) { lit = false; break; } }
        if (!lit) continue;
        const o = (j * W + i) * 3, v = f * I; acc[o] += cr * v; acc[o + 1] += cg * v; acc[o + 2] += cb * v;
      }
    });
    const c = mk(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), D = id.data;
    for (let q = 0; q < W * H; q++) { for (let k = 0; k < 3; k++) D[q * 4 + k] = Math.round((1 - Math.exp(-acc[q * 3 + k] * 1.35)) * 255); D[q * 4 + 3] = 255; }
    x.putImageData(id, 0, 0);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
    return t;
  }
  // ---- riflessi sull'asfalto bagnato: una striscia di luce allungata verso la camera sotto ogni sorgente accesa ----
  const REFL = [];
  let reflTexC = null;
  function reflTex() { if (reflTexC) return reflTexC; const c = mk(16, 64), x = c.getContext('2d'), r = rng(4);
    for (let y = 0; y < 64; y++) { const a = Math.pow(1 - y / 64, 1.6) * (y < 3 ? y / 3 : 1); for (let i = 0; i < 16; i++) { const e = 1 - Math.abs(i - 7.5) / 8; const n = .7 + r() * .3; x.fillStyle = `rgba(255,255,255,${(a * e * e * n).toFixed(3)})`; x.fillRect(i, y, 1, 1); } }
    reflTexC = new THREE.CanvasTexture(c); return reflTexC; }
  function wetAt(x, z) { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)), T = G.T; return v === T.VIA || v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY; }
  function initRefl() { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, .5, 0); g.rotateX(-Math.PI / 2);
    for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: reflTex(), color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); m.visible = false; m.renderOrder = 1; scene.add(m); REFL.push(m); } }
  function updateRefl(night, list) {
    if (!REFL.length) initRefl();
    const cx = camera.position.x, cz = camera.position.z; let k = 0;
    if (night > .15) for (const L of list) {
      if (k >= REFL.length) break; if (L.off || !L.base) continue; if (L.gy === undefined) L.gy = groundH(L.x, L.z);
      const h = L.y - L.gy; if (h < .6) continue; let dx = cx - L.x, dz = cz - L.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const bx = L.x + dx * .3, bz = L.z + dz * .3; if (!wetAt(bx, bz)) continue;
      const m = REFL[k++], len = Math.min(9, h * 1.7 + 1), wid = L.spill ? 1.6 : .55 + h * .08;
      m.position.set(bx, groundH(bx, bz) + .04, bz); m.rotation.set(0, Math.atan2(dx, dz), 0); m.scale.set(wid, 1, len);
      m.material.color.copy(L.color); m.material.opacity = night * (L.spill ? .22 : .42) * Math.min(1, L.base / 2); m.visible = true;
    }
    for (; k < REFL.length; k++) REFL[k].visible = false;
  }
