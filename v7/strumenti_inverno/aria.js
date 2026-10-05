  // ================= [luci2] L'ARIA: densità, cristalli nella luce, fiato =================
  // Il freddo si vede nell'aria: brina sospesa che scintilla solo dentro i coni di luce, il fiato di chi passa,
  // coni di luce che pesano vicino alla lampada e svaniscono verso terra.
  const AIR = { on: false };
  function initAir() {
    AIR.on = true;
    // cristalli: punti colorati dalla luce in cui stanno
    const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .1, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
    AIR.pts = pts; AIR.pos = pos; AIR.col = col; AIR.N = N; AIR.s = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    // fiato: sbuffi morbidi davanti alla testa
    const bm = new THREE.SpriteMaterial({ map: glowTexture(), color: '#e4e8ea', transparent: true, opacity: 0, depthWrite: false });
    AIR.puffs = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(bm.clone()); sp.visible = false; sp.renderOrder = 3; scene.add(sp); AIR.puffs.push(sp); }
  }
  function tickAir(time, night) {
    if (!AIR.on) initAir();
    // --- cristalli nei coni di luce ---
    const Ls = (dyn.lsp || []).filter(L => !L.off && L.base > 0 && L.gy !== undefined && L.y - L.gy > 1.2), n = Ls.length, P = AIR.pos, C = AIR.col;
    const vis = night > .12 && n > 0; AIR.pts.visible = vis;
    if (vis) for (let i = 0; i < AIR.N; i++) {
      const s = AIR.s[i], L = Ls[i % n], H = L.y - L.gy, rad = H * .6;
      const rr = Math.sqrt(s[0]) * rad, a = s[1] * 6.283 + time * (.04 + s[3] * .05);
      const fall = (time * (.12 + s[2] * .22) + s[2] * H) % H, y = L.y - .2 - fall;
      const x = L.x + Math.cos(a) * rr + Math.sin(time * .6 + i) * .18, z = L.z + Math.sin(a) * rr + Math.cos(time * .5 + i * 1.3) * .18;
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
      const inCone = Math.pow(Math.max(0, 1 - rr / rad), 1.4), hf = Math.pow(1 - fall / H, .8);   // più fitti e accesi vicino alla lampada
      const tw = Math.sin(time * (2.5 + s[3] * 6) + i * 7.1) > .82 ? 1.6 : .45;                       // ogni tanto un cristallo prende la luce
      const b = night * inCone * hf * tw * 1.3;
      C[i * 3] = L.color.r * b; C[i * 3 + 1] = L.color.g * b; C[i * 3 + 2] = L.color.b * b;
    }
    if (vis) { AIR.pts.geometry.attributes.position.needsUpdate = true; AIR.pts.geometry.attributes.color.needsUpdate = true; }
    // --- fiato di chi è vicino alla camera ---
    let k = 0; const cx = cam.x, cz = cam.y;
    for (const id in dyn.people) {
      if (k >= AIR.puffs.length) break; const g = dyn.people[id]; if (!g || !g.visible) continue;
      const dx = g.position.x - cx, dz = g.position.z - cz; if (dx * dx + dz * dz > 26 * 26) continue;
      let hsh = 0; for (let q = 0; q < id.length; q++) hsh = (hsh * 31 + id.charCodeAt(q)) | 0;
      const per = 2.8 + (Math.abs(hsh) % 10) * .08, t = (time + (Math.abs(hsh) % 100) * .037) % per; if (t > 1.4) continue;
      const u = t / 1.4, fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y), sp = AIR.puffs[k++], sc = g.scale.y || 1;
      sp.position.set(g.position.x + fx * (.22 + u * .45), g.position.y + (1.52 + u * .22) * sc, g.position.z + fz * (.22 + u * .45));
      const sz = .25 + u * .7; sp.scale.set(sz, sz, 1); sp.material.opacity = Math.sin(u * Math.PI) * (.16 + night * .1); sp.visible = true;
    }
    for (; k < AIR.puffs.length; k++) AIR.puffs[k].visible = false;
  }
