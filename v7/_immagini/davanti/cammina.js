(async () => {
  const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, camera = R.getCamera(), C7 = R.__cam7;
  window.PV_ATTESA.on = () => true;
  const rd = R.__models.renderer, gl = rd.getContext(); const salva = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { salva[k] = gl[k]; gl[k] = function () { }; }
  const ui = { zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1 / 30, camMano: true };
  const out = [];
  const tratti = window.__TRATTI || [{ nome: 'dietro il muro', a: [1280, 344], b: [1300, 344], yaw: 0 }, { nome: 'tetto b', a: [1287, 337], b: [1287, 357], yaw: .785 }];
  for (const T of tratti) {
    p.x = T.a[0]; p.y = T.a[1]; p.path = []; C7.S = null; C7.ppx = undefined; C7.yaw0 = T.yaw; R.camReset && null;
    for (let i = 0; i < 30; i++) { ui.time += 1 / 30; R.frame(st, 1 / 30, ui); }
    let prev = null; const dx = T.b[0] - T.a[0], dy = T.b[1] - T.a[1], L = Math.hypot(dx, dy), v = 1.5, dt = 1 / 30;
    for (let t = 0; t * v < L; t += dt) {
      const nx = T.a[0] + dx / L * v * t, ny = T.a[1] + dy / L * v * t; p.face = Math.atan2(dy, dx);
      ui.time += dt; ui.reale = dt; p.x = nx; p.y = ny; R.frame(st, dt, ui);
      const cp = camera.position, d = C7.dav; const r = { t: +t.toFixed(3), davF: +(C7.davF || 0).toFixed(3), n: d ? d.n : 0, fT: d ? +d.fT.toFixed(2) : 0, arm: +C7.ultimo.arm.toFixed(2), pos: [cp.x, cp.y, cp.z] };
      r.passo = prev ? +Math.hypot(cp.x - prev[0] - dx / L * v * dt, cp.y - prev[1], cp.z - prev[2] - dy / L * v * dt).toFixed(3) : 0; prev = [cp.x, cp.y, cp.z]; r.tratto = T.nome; out.push(r);
      if (out.length % 20 === 0) await new Promise(r => setTimeout(r, 0));
    }
  }
  for (const k in salva) gl[k] = salva[k]; window.PV_ATTESA.on = () => false;
  return out;
})()
