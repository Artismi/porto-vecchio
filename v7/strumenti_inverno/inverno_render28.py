# [inverno 28] Studio luci: ogni luce inquadrata fa ombra. Dopo inverno_render27.
# Lampioni, insegne, porte e lampade a muro illuminano verso il basso: diventano FARETTI con ombra (una sola mappa ciascuno,
# non sei come le luci puntiformi). Il numero di faretti con ombra si legge dalla scheda video all'avvio (di solito 9, max 12).
# Si accendono sulle sorgenti dentro l'inquadratura, le più vicine prima; i fuochi (che tremolano, bassi) restano punti senza ombra.
# Le mappe d'ombra si rifanno quando un faretto cambia sorgente e, a turno, 3 per fotogramma: chi cammina sotto la luce fa ombra.
# Sotto i lampioni alti, di notte, un cono di luce leggerissimo nella foschia (rispetta la profondità: dietro i muri non si vede).
# Rimette anche lo sfarfallio delle insegne e dei fuochi (un commento di render23 l'aveva spento per errore).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno28]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
# il gruppo di luci
i0 = s.index("    for (let i = 0; i < 14; i++) { const l = new THREE.PointLight('#ffb35c', 0, 10, 2);")
i1 = s.index("scene.add(l); LPOOL.push(l); }", i0) + len("scene.add(l); LPOOL.push(l); }")
s = s[:i0] + """    // [inverno28] faretti con ombra (quanti ne regge la scheda video) + punti senza ombra per i fuochi
    { const maxT = (renderer.capabilities && renderer.capabilities.maxTextures) || 16, N = Math.max(4, Math.min(12, maxT - 7));
      const coneG = new THREE.ConeGeometry(1, 1, 18, 1, true); coneG.translate(0, -.5, 0);
      for (let i = 0; i < N; i++) { const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.12, .55, 2);
        l.castShadow = true; l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -.0012; l.shadow.normalBias = .035; l.shadow.camera.near = .2; l.shadow.camera.far = 14;
        const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); cone.visible = false; cone.renderOrder = 2;
        l.userData.cone = cone; scene.add(l); scene.add(l.target); scene.add(cone); SPOOL.push(l); LPOOL.push(l); }
      for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffa040', 0, 8, 2); scene.add(l); PPOOL.push(l); LPOOL.push(l); }
      window.__luci = { faretti: N, punti: 8, maxTextures: maxT }; }""" + s[i1:]
rep("  const LPOOL = [];", "  const LPOOL = [], SPOOL = [], PPOOL = [];   // [inverno28]")
# l'aggiornamento
j0 = s.index("  function updateLights(time, night, fx, fz) {"); j1 = s.index("  function frame(st, dt, ui) {")
s = s[:j0] + """  const LFR = new THREE.Frustum(), LPM = new THREE.Matrix4(), LSPH = new THREE.Sphere();
  function updateLights(time, night, fx, fz) {   // [inverno28] studio luci
    frameN++;
    if (frameN % 4 === 1 || !dyn.lsp) {
      camera.updateMatrixWorld(); LPM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); LFR.setFromProjectionMatrix(LPM);
      const on = [];
      LSRC.forEach(L => { const dx = L.x - fx, dz = L.z - fz; L.d2 = dx * dx + dz * dz; if (L.d2 > 80 * 80) return; if (L.gy === undefined) L.gy = groundH(L.x, L.z);
        LSPH.center.set(L.x, (L.y + L.gy) / 2, L.z); LSPH.radius = Math.max(2, (L.dist || 8) * .6); if (LFR.intersectsSphere(LSPH)) on.push(L); });
      on.sort((a, b) => a.d2 - b.d2);
      const sp = [], pp = [];
      on.forEach(L => { const fire = L.flick >= .25 && L.y - L.gy < 2.2; if (!fire && sp.length < SPOOL.length) sp.push(L); else if (pp.length < PPOOL.length) pp.push(L); });
      dyn.lsp = sp; dyn.lpp = pp;
    }
    const kOf = L => { let k = L.always ? .06 + night * .94 : night * night;
      if (L.flick) k *= 1 - L.flick * .5 * (Math.sin(time * 13 + L.phase) * .5 + .5) * (Math.sin(time * 3.7 + L.phase * 2) > .3 ? 1 : .2);
      return k; };
    SPOOL.forEach((l, i) => {
      const L = dyn.lsp[i], cone = l.userData.cone;
      if (!L) { l.intensity = 0; cone.visible = false; return; }
      const k = kOf(L), hh = Math.max(1.2, L.y - L.gy);
      if (l.userData.src !== L) { l.userData.src = L; l.position.set(L.x, L.y, L.z); l.target.position.set(L.x, L.gy - 2, L.z); l.target.updateMatrixWorld(); l.color.copy(L.color);
        l.distance = (L.dist || 8) * 1.25 + hh; l.shadow.camera.far = l.distance; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate = true; }
      l.intensity = L.base * k * .95;
      const tall = hh > 2.8 && night > .25;
      cone.visible = tall && k > .05; if (cone.visible) { const rr = hh * .62; cone.position.set(L.x, L.y - .15, L.z); cone.scale.set(rr, hh - .1, rr); cone.material.color.copy(L.color); cone.material.opacity = .03 * Math.min(1, k); }
    });
    for (let q = 0; q < 3; q++) { const l = SPOOL[(frameN * 3 + q) % SPOOL.length]; if (l && l.intensity > 0) l.shadow.needsUpdate = true; }
    PPOOL.forEach((l, i) => {
      const L = dyn.lpp[i]; if (!L) { l.intensity = 0; return; }
      l.position.set(L.x, L.y, L.z); l.color.copy(L.color); l.distance = L.dist; l.intensity = L.base * kOf(L) * .8;
    });
  }
""" + s[j1:]
rep("LPOOL.forEach(l => l.castShadow = false);", "SPOOL.forEach(l => { l.castShadow = false; });")
open(p, 'w', encoding='utf-8').write(s); print('ok')
