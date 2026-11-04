// il pilota a passi: ferma il giro di main.js e fa i fotogrammi da qui, con l'input VERO di main.js (__pv.input(), i tasti in __pv.keys),
// il motore (G.step) e la camera (R.frame). Le foto solo quando servono (gli altri fotogrammi senza disegni: SwiftShader è lento).
// corsa(pg, piano): piano = { start:[x,y] | null, yawDietro: bool, zoom, K6: {..override CAM6.K..}, segs:[{sec, keys:{w:1}, drag: rad/s, mira, pilota:[x,y] (va verso il punto con la levetta relativa alla camera), run}], foto: ogni s }
async function corsa(pg, piano) {
  return pg.evaluate(async P => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), DT = P.dt || 1 / 15;
    window.PV_ATTESA.on = () => true;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
    const C6 = R.__cam6.CAM6, C7 = R.__cam7, V3S = R.__vis3.S, MAPA = R.__vis4.M;
    if (!window.__K6orig) window.__K6orig = JSON.parse(JSON.stringify(C6.K));
    // ripristina e applica le varianti
    const deep = (dst, src) => { for (const k in src) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) { dst[k] = dst[k] || {}; deep(dst[k], src[k]); } else dst[k] = src[k]; } };
    deep(C6.K, JSON.parse(JSON.stringify(window.__K6orig))); if (P.K6) deep(C6.K, P.K6);
    for (const k in pv.keys) pv.keys[k] = false;
    if (P.ora !== undefined) st.t = P.ora * 60; window.__meteo = P.meteo || 'sereno';
    if (P.start) { const giu = q => { if (G.walkM(q[0], q[1])) return q; for (let r = .5; r < 8; r += .5) for (let a = 0; a < 6.28; a += .4) { const x = q[0] + Math.cos(a) * r, y = q[1] + Math.sin(a) * r; if (G.walkM(x, y)) return [x, y]; } return q; };
      const a = giu(P.start); p.x = a[0]; p.y = a[1]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = [];
      if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
      if (P.verso) { const h = Math.atan2(P.verso[1] - a[1], P.verso[0] - a[0]); cam.uy = Math.atan2(-Math.cos(h), -Math.sin(h)) - R.YAW; p.face = h; }
      if (P.avvio && C7 && C7.on && R.avvio7) R.avvio7(p); }
    pv.ui.zoom = P.zoom || .5; pv.ui.tilt = 0;
    const ui = { zoom: pv.ui.zoom, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
    const LEAD = { x: 0, y: 0, m: 0 };
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return { x: v.x * .5 + .5, y: 1 - (v.y * .5 + .5), z: v.z }; };
    const stato = () => { const d = new THREE.Vector3(); camera.getWorldDirection(d); const gh = R.groundH(p.x, p.y), pitch = -Math.asin(Math.max(-1, Math.min(1, d.y))), hf = camera.fov * Math.PI / 360, hc = camera.position.y - gh, hz = Math.hypot(camera.position.x - p.x, camera.position.z - p.y), top = pitch - hf;
      const f = proj(p.x, gh, p.y), t = proj(p.x, gh + 1.75, p.y);
      return { t: +(ui.time).toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2), face: +p.face.toFixed(3), yaw: +cam.yaw.toFixed(3), pitch: +(pitch * 57.3).toFixed(1), fov: +camera.fov.toFixed(1), camH: +hc.toFixed(2), dist: +camera.position.distanceTo(new THREE.Vector3(p.x, gh + 1, p.y)).toFixed(2), horiz: +hz.toFixed(2),
        davanti: top > .01 ? +(hc / Math.tan(top) - hz).toFixed(1) : 999, omH: +(f.y - t.y).toFixed(3), omX: +f.x.toFixed(3), omY: +f.y.toFixed(3), jz: +(p.jz || 0).toFixed(2), spd: +Math.abs(p.speed || 0).toFixed(2), coll: C6.coll.x !== null ? +C6.coll.x.toFixed(2) : null, near: +camera.near.toFixed(2), asse: C6.asse !== null, urto: !!C6.urto, taglio: (() => { let n = 0; V3S.forEach(s => { if (s.a > .02) n++; }); return n; })(), cose: C7 ? C7.cose.size : 0, c7: !!(C7 && C7.attivo), dsp: +(ui.__dsp || 0).toFixed(2), mano: !!ui.camMano || !!ui.drag, dentro: (() => { const M = R.__vis4.M; return M ? +(M.alto(camera.position.x, camera.position.z) - camera.position.y).toFixed(2) : null; })(), arm: C7 && C7.ultimo && C7.attivo ? +C7.ultimo.arm.toFixed(2) : null }; };
    const passo = (inp) => { const x0 = p.x, y0 = p.y; G.step(st, DT, inp); ui.__dsp = Math.hypot(p.x - x0, p.y - y0) / DT; ui.muove = !!(inp && (inp.x || inp.y)); ui.time += DT; pv.ui.time = ui.time; R.frame(st, DT, ui); };
    for (let i = 0; i < 15; i++) { ui.drag = 0; passo({ x: 0, y: 0 }); }
    const out = { fotos: [], log: [] }; let t = 0, prossima = 0; const step = P.foto || .5;
    for (const sg of P.segs) {
      const t1 = t + sg.sec;
      while (t < t1 - 1e-6) {
        for (const k in pv.keys) pv.keys[k] = false; if (sg.keys) for (const k in sg.keys) pv.keys[k] = !!sg.keys[k];
        let inp;
        if (sg.percorso) { while (sg._k === undefined || (sg._k < sg.percorso.length - 1 && Math.hypot(sg.percorso[sg._k][0] - p.x, sg.percorso[sg._k][1] - p.y) < 1.2)) sg._k = (sg._k === undefined ? 0 : sg._k + 1); sg.pilota = sg.percorso[sg._k]; }
        if (sg.salta !== undefined) { const tt = t - (t1 - sg.sec); if (Math.abs(tt - sg.salta) < DT / 2) { G.jumpHold(st, true); G.jumpHold(st, false); } }
        if (sg.jump !== undefined) { const tt = t - (t1 - sg.sec); if (tt < DT / 2) G.jumpHold(st, true); if (Math.abs(tt - sg.jump) < DT / 2) G.jumpHold(st, false); }
        ui.edge = sg.edge || 0;
        if (sg.pilota) { const B = R.camBasis(), dx = sg.pilota[0] - p.x, dy = sg.pilota[1] - p.y, l = Math.hypot(dx, dy); if (l < .6) inp = { x: 0, y: 0 }; else { inp = { x: dx / l, y: dy / l, sprint: !!sg.run, aim: Math.atan2(dy, dx), mag: sg.mag === undefined ? 1 : sg.mag }; } }
        else inp = pv.input() || { x: 0, y: 0 };
        if (sg.mira) { const B = R.camBasis(); ui.mira = { a: Math.atan2(B.fz, B.fx), punto: false, spalla: true }; inp.aim = ui.mira.a; } else ui.mira = null;
        ui.lead = inp && inp.mag !== undefined && (inp.x || inp.y) ? (LEAD.x = inp.x / Math.hypot(inp.x, inp.y), LEAD.y = inp.y / Math.hypot(inp.x, inp.y), LEAD.m = .4 + .6 * Math.min(1, inp.mag), LEAD) : null;
        ui.drag = (sg.drag || 0) * DT; ui.camMano = !!sg.drag; ui.tilt = sg.tilt || 0;
        const scatta = P.foto !== 0 && t >= prossima - 1e-6; if (scatta) draws(true);
        passo(inp);
        if (scatta) { out.fotos.push([+t.toFixed(1), rd.domElement.toDataURL('image/jpeg', .8), stato()]); draws(false); prossima += step; }
        out.log.push(stato());
        t += DT; await new Promise(r => setTimeout(r, 0));
      }
    }
    draws(true); for (const k in pv.keys) pv.keys[k] = false;
    // [stile] alla fine, lo stesso istante in ogni variante (R.stile cambia il look dal vivo; senza: una foto sola)
    if (P.varianti) { out.var = []; for (const v of P.varianti) { if (v && R.stile) R.stile(v); for (let i = 0; i < 2; i++) { ui.time += 1e-3; R.frame(st, 1e-3, ui); } gl.finish();
      const t0 = performance.now(); for (let i = 0; i < (P.tempi || 2); i++) { ui.time += 1e-3; R.frame(st, 1e-3, ui); } gl.finish(); const ms = (performance.now() - t0) / (P.tempi || 2);
      const s0 = stato(); s0.ms = +ms.toFixed(0); const img = rd.domElement.toDataURL('image/png'); let img2 = null;
      if (P.tremolio) { const W0 = rd.domElement.width, H0 = rd.domElement.height; camera.setViewOffset(W0, H0, .5, .5, W0, H0); R.frame(st, 1e-6, ui); gl.finish(); img2 = rd.domElement.toDataURL('image/png'); camera.clearViewOffset(); R.frame(st, 1e-6, ui); }
      out.var.push([v, img, s0, img2]); } if (R.stile) R.stile(P.varianti[0]); }
    return out;
  }, piano);
}
module.exports = { corsa };
