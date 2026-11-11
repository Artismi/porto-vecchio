(async () => {
  const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, camera = R.getCamera(), dyn = R.__dyn, C7 = R.__cam7;
  const ARGS = window.__GRIGLIA || { cx: 1265, cy: 349, rag: 26, passo: 3, yaws: 8, n: 20 };
  window.PV_ATTESA.on = () => true;
  const rd = R.__models.renderer, gl = rd.getContext(); const salva = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { salva[k] = gl[k]; gl[k] = function () { }; }
  const ui = { zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1 / 30 };
  const passo = dt => { ui.time += dt; ui.reale = dt; R.frame(st, dt, ui); };
  const rc = new THREE.Raycaster(), V = new THREE.Vector3(), D = new THREE.Vector3();
  const roots = new Set(); for (const k in dyn.people) if (dyn.people[k]) roots.add(dyn.people[k]); for (const k in dyn.vehicles) if (dyn.vehicles[k]) roots.add(dyn.vehicles[k]);
  const sotto = (o) => { for (let q = o, i = 0; q && i < 12; q = q.parent, i++) if (roots.has(q)) return true; return false; };
  const okM = m => m && m.visible !== false && m.depthWrite !== false && m.colorWrite !== false && !(m.transparent && m.opacity < .3);
  const coperto = () => {
    const fy = R.groundH(p.x, p.y), cp = camera.position, list = R.__bmb.bmbCands(cp.x, cp.z).filter(m => !m.userData.ghost5 && !m.userData.velo && !m.isPoints && !m.isLine && !sotto(m));
    let n = 0, info = null;
    for (const h of [.5, 1.15, 1.6]) {
      V.set(p.x, fy + h, p.y); D.subVectors(V, cp); const L = D.length(); D.normalize(); rc.set(cp, D); rc.near = 0; rc.far = L - .35;
      const hs = rc.intersectObjects(list, false).filter(x => { let m = x.object.material; if (Array.isArray(m)) m = m[x.face ? x.face.materialIndex : 0]; return okM(m) && !(m.uniforms && m.uniforms.uR7); });
      if (hs.length) { n++; if (!info) { const x = hs[0], ob = x.object, bs = ob.geometry.boundingSphere, m = Array.isArray(ob.material) ? ob.material[x.face.materialIndex] : ob.material;
        info = { h, t: +x.distance.toFixed(2), nome: ob.name, ud: Object.keys(ob.userData).slice(0, 8).join(','), r: bs ? +(bs.radius * ob.matrixWorld.getMaxScaleOnAxis()).toFixed(1) : null, mt: m.type, side: m.side, p: [x.point.x, x.point.y, x.point.z].map(v => +v.toFixed(1)), inList7: false }; } }
    }
    return { n, info };
  };
  const res = [], tot = { n: 0, nasc: 0, nascFuori: 0, dav: 0 };
  const P = []; for (let dx = -ARGS.rag; dx <= ARGS.rag; dx += ARGS.passo) for (let dy = -ARGS.rag; dy <= ARGS.rag; dy += ARGS.passo) { const x = ARGS.cx + dx, y = ARGS.cy + dy; if (G.walkM(x, y)) P.push([x, y]); }
  let k = 0;
  for (const [x, y] of P) for (let j = 0; j < ARGS.yaws; j++) {
    const yaw = j * 2 * Math.PI / ARGS.yaws; p.x = x; p.y = y; p.path = []; C7.S = null; C7.ppx = undefined; C7.yaw0 = yaw;
    for (let i = 0; i < ARGS.n; i++) passo(1 / 30);
    const u = C7.ultimo, c = coperto();
    tot.n++; if (c.n >= 2) tot.nasc++; if (c.n >= 2 && u.arm > 1.3) tot.nascFuori++; if (C7.davF > .01) tot.dav++; if (c.n) { // diagnosi: il raggio di camera7 (petto → camera) e il raggio al contrario (camera → petto) con la stessa lista di cast7
      const fy = R.groundH(p.x, p.y), o = { x: p.x, y: fy + 1.15, z: p.y }, cp = camera.position, d = { x: cp.x - o.x, y: cp.y - o.y, z: cp.z - o.z }, L = Math.hypot(d.x, d.y, d.z);
      const CAM7 = window.__CAM7; CAM7.spia = []; const h7 = R.cast7(o, { x: d.x / L, y: d.y / L, z: d.z / L }, L, .05); const spia = CAM7.spia; CAM7.spia = null;
      res.push({ davF: +(C7.davF || 0).toFixed(2), x, y, yaw: +(yaw * 57.3).toFixed(0), arm: +u.arm.toFixed(2), pitch: +(u.pitch * 57.3).toFixed(1), n: c.n, info: c.info, h7: h7 === null ? null : +h7.toFixed(2), L: +L.toFixed(2) });
    }
    if (++k % 20 === 0) await new Promise(r => setTimeout(r, 0));
  }
  for (const kk in salva) gl[kk] = salva[kk];
  window.PV_ATTESA.on = () => false;
  return { prove: k, punti: P.length, coperti: res.length, tot, res };
})()
