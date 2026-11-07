// [camera9] il pilota a passi (come controlli8/sonde/passo8.js: il giro di main.js fermo, i fotogrammi da qui con l'input VERO di main.js,
// G.step e R.frame) più, a ogni fotogramma, lo stato del braccio di camera7/camera9 che passo() tiene dentro (S): la pendenza del braccio,
// quella vera della vista, il braccio voluto e quello vero, la salita (lift), la rampa del braccio corto (close), il campo; e ogni
// `ogniSfondo` s quanto del quadro vede lontano (sfondo) e dov'è l'orizzonte.
//   corsa(pg, piano): piano = { start:[x,y], verso:[x,y], dt, foto (ogni s, 0 niente), c9 (true/false: la camera9 accesa dal vivo),
//     segs:[{ sec, keys:{w:1}, percorso:[[x,y]..], corsa }] }
async function corsa(pg, piano) {
  return pg.evaluate(async P => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), DT = P.dt || 1 / 30;
    window.PV_ATTESA.on = () => true;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
    const C7 = R.__cam7, B8 = pv.B8, ang = a => Math.atan2(Math.sin(a), Math.cos(a)), K = Camera7.K, D = 180 / Math.PI;
    if (P.c9 !== undefined && Camera7.C9) Camera7.C9.on = !!P.c9;
    for (const k in pv.keys) pv.keys[k] = false;
    st.police = []; st.heat = 0; p.stun = 0; p.hp = 100;
    if (P.start) { p.x = P.start[0]; p.y = P.start[1]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.vx = p.vy = 0;
      if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
      if (P.verso) { const h = Math.atan2(P.verso[1] - p.y, P.verso[0] - p.x); C7.yaw0 = Math.atan2(-Math.cos(h), -Math.sin(h)); C7.S = null; p.face = h; } }
    pv.ui.zoom = .5; pv.ui.tilt = 0; pv.ui.drag = 0;
    const ui = { zoom: .5, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
    const v3 = new THREE.Vector3(), proj = (x, y, z) => { v3.set(x, y, z).project(camera); return { x: v3.x * .5 + .5, y: 1 - (v3.y * .5 + .5) }; };
    const M = R.__vis4.M || (R.__vis4.M = Visuale.mappa(G.MAP.world));
    // quanto del quadro vede lontano: una griglia 16x9 di raggi (sfondoAlto: il terzo alto) dalla camera contro la mappa delle case e il suolo; lontano = oltre 60 m o il cielo
    const sfondo = () => { const o = camera.position, inv = camera.projectionMatrixInverse, mw = camera.matrixWorld; let far = 0, cielo = 0, n = 0, alto = 0, altoN = 0; const d = new THREE.Vector3();
      for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) { d.set((i + .5) / 16 * 2 - 1, 1 - (j + .5) / 9 * 2, .5).applyMatrix4(inv).applyMatrix4(mw).sub(o).normalize();
        let s = .5, hit = null; while (s < 250) { const x = o.x + d.x * s, y = o.y + d.y * s, z = o.z + d.z * s; if (M.alto(x, z) > y || R.groundH(x, z) > y) { hit = s; break; } s += s < 20 ? .4 : s < 80 ? 1.2 : 3; if (y > 60 && d.y > 0) break; }
        const lont = hit === null || hit > 60; n++; if (lont) far++; if (hit === null && d.y > 0) cielo++; if (j < 3) { altoN++; if (lont) alto++; } }
      return { sfondo: +(far / n).toFixed(3), cielo: +(cielo / n).toFixed(3), sfondoAlto: +(alto / altoN).toFixed(3) }; };
    const stato = (lento) => { const gh = R.groundH(p.x, p.y), f = proj(p.x, gh, p.y), tst = proj(p.x, gh + 1.75, p.y), u = C7.ultimo, S = C7.S, dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const vp = -Math.asin(Math.max(-1, Math.min(1, dir.y))), hf = camera.fov * Math.PI / 360, oriz = .5 - .5 * Math.tan(vp) / Math.tan(hf);   // l'orizzonte dall'alto dello schermo (< 0: sopra il quadro)
      const o = { t: +ui.time.toFixed(3), x: +p.x.toFixed(2), y: +p.y.toFixed(2), yaw: +cam.yaw.toFixed(4), gh: +gh.toFixed(2), sx: +f.x.toFixed(3), sy: +f.y.toFixed(3), sh: +(f.y - tst.y).toFixed(3),
        arm: u && C7.attivo ? +u.arm.toFixed(2) : null, pitch: u && C7.attivo ? +(u.pitch * D).toFixed(1) : null, vista: +(vp * D).toFixed(1), fov: +camera.fov.toFixed(1), oriz: +oriz.toFixed(3),
        camY: +(camera.position.y - gh).toFixed(2), c7: !!C7.attivo, c9: !!(Camera7.C9 && Camera7.C9.on) };
      if (S) { o.want = +(S.want9 !== undefined ? S.want9 : K.arm).toFixed(2); o.armT = +(S.armT || 0).toFixed(2); o.colpo = S.colpo === null || S.colpo === undefined ? null : +S.colpo.toFixed(2); o.lift = +(S.lift.x * D).toFixed(1); o.liftW = +(S.liftW * D).toFixed(1);
        o.close = u ? +Math.max(0, Math.min(1, (K.close[0] - u.arm) / (K.close[0] - K.close[1]))).toFixed(2) : null; if (u && u.side9 !== undefined) o.side = +u.side9.toFixed(2); }
      if (lento) Object.assign(o, sfondo());
      return o; };
    const passo = inp => { const x0 = p.x, y0 = p.y; G.step(st, DT, inp); ui.__dsp = Math.hypot(p.x - x0, p.y - y0) / DT; ui.muove = !!(inp && (inp.x || inp.y)); ui.tenuto8 = B8 && B8.a !== null ? B8.t : undefined;
      ui.time += DT; pv.ui.time = ui.time; R.frame(st, DT, ui); if (B8 && C7.attivo && C7.ultimo && window.Camera7 && Camera7.comandi8) Camera7.comandi8.dopo(B8, C7.ultimo); };
    for (let i = 0; i < 10; i++) passo({ x: 0, y: 0 });
    const mira = sg => { const Q = sg.percorso; if (sg._i === undefined) { sg._i = 0; sg._u = 0; }
      let bi = sg._i, bu = sg._u, bd = 1e9; for (let i = sg._i; i < Math.min(Q.length - 1, sg._i + 4); i++) { const a = Q[i], b = Q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; let u = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L2; u = Math.max(i === sg._i ? sg._u : 0, Math.min(1, u)); const d = Math.hypot(a[0] + dx * u - p.x, a[1] + dy * u - p.y); if (d < bd - 1e-9) { bd = d; bi = i; bu = u; } }
      sg._i = bi; sg._u = bu; let rest = 1.4, i = bi, u = bu;
      while (i < Q.length - 1) { const a = Q[i], b = Q[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), r = (1 - u) * L; if (r >= rest) { const f = u + rest / (L || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } rest -= r; i++; u = 0; }
      return Q[Q.length - 1]; };
    const out = { fotos: [], log: [] }; let t = 0, prossima = 0, prossimaS = 0; const step = P.foto || .5, stepS = P.ogniSfondo || .5;
    for (const sg of P.segs) {
      const t1 = t + sg.sec;
      while (t < t1 - 1e-6) {
        for (const k in pv.keys) pv.keys[k] = false; if (sg.keys) for (const k in sg.keys) pv.keys[k] = !!sg.keys[k];
        if (sg.percorso) { const q = mira(sg), dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy), fine = sg.percorso[sg.percorso.length - 1];
          if (sg._i >= sg.percorso.length - 3 && Math.hypot(fine[0] - p.x, fine[1] - p.y) < .8) sg.arrivato = sg.arrivato || +(t - (t1 - sg.sec)).toFixed(3);
          else if (l > .3) { const yw = cam.yaw, fx = -Math.sin(yw), fz = -Math.cos(yw), rx = -fz, rz = fx, a = Math.atan2((dx * rx + dy * rz) / l, (dx * fx + dy * fz) / l);
            let o = Math.round(a / (Math.PI / 4)); if (sg._o !== undefined && Math.abs(ang(a - sg._o * Math.PI / 4)) < 35 * Math.PI / 180) o = sg._o; sg._o = o;
            const aa = o * Math.PI / 4, kx = Math.round(Math.sin(aa)), ky = Math.round(Math.cos(aa)); if (ky > 0) pv.keys.w = true; if (ky < 0) pv.keys.s = true; if (kx > 0) pv.keys.d = true; if (kx < 0) pv.keys.a = true; if (sg.corsa) pv.keys.shift = true; } }
        const inp = pv.input() || { x: 0, y: 0 };
        const scatta = P.foto && t >= prossima - 1e-6; if (scatta) draws(true);
        passo(inp);
        const lento = t >= prossimaS - 1e-6; if (lento) prossimaS += stepS;
        const s0 = stato(lento); s0.dsp = +(ui.__dsp || 0).toFixed(2); s0.seg = P.segs.indexOf(sg);
        if (scatta) { out.fotos.push([+t.toFixed(2), rd.domElement.toDataURL('image/jpeg', .82), s0]); draws(false); prossima += step; }
        out.log.push(s0);
        t += DT; await new Promise(r => setTimeout(r, 0));
      }
      out.arrivato = out.arrivato || []; out.arrivato.push(sg.arrivato || null);
    }
    draws(true); for (const k in pv.keys) pv.keys[k] = false;
    return out;
  }, piano);
}
// la foto ferma: il personaggio in (x, y) rivolto verso `verso`, la camera dietro (lo yaw dietro la marcia), `assesta` s di fotogrammi da fermo
// (fermo: le molle arrivano), poi una foto (foto: false, niente). Rende { url, s }: lo stato, quanto del quadro vede lontano, se il busto è coperto
async function posa(pg, P) {
  return pg.evaluate(async P => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), DT = 1 / 30;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
    const C7 = R.__cam7, D = 180 / Math.PI; if (P.c9 !== undefined && Camera7.C9) Camera7.C9.on = !!P.c9;
    const lont0 = Camera7.K9.lontano, neb0 = Camera7.K9.nebbia; if (P.lontano !== undefined) Camera7.K9.lontano = P.lontano; if (P.nebbia !== undefined) Camera7.K9.nebbia = P.nebbia;   // il tetto del piano lontano (per il banco)
    for (const k in pv.keys) pv.keys[k] = false; st.police = []; st.heat = 0; p.stun = 0; p.hp = 100;
    let at = P.at; if (!G.walkM(at[0], at[1])) { cerca: for (let r = .3; r < 4; r += .3) for (let k = 0; k < 6.28; k += .3) { const z = [at[0] + Math.cos(k) * r, at[1] + Math.sin(k) * r]; if (G.walkM(z[0], z[1])) { at = z; break cerca; } } } P.at = at;   // un punto dove si cammina
    p.x = P.at[0]; p.y = P.at[1]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.vx = p.vy = 0;
    if (R.camReset) R.camReset(); R.snap(st);
    const h = Math.atan2(P.verso[1] - p.y, P.verso[0] - p.x); C7.yaw0 = Math.atan2(-Math.cos(h), -Math.sin(h)); C7.S = null; p.face = h;
    const ui = { zoom: .5, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
    const fr = (inp) => { G.step(st, DT, inp || { x: 0, y: 0 }); ui.time += DT; pv.ui.time = ui.time; R.frame(st, DT, ui); };
    for (let i = 0; i < 6; i++) fr();
    // fermo, poi assesta: la camera arriva (le molle)
    for (let i = 0; i < Math.round((P.assesta || 2) / DT); i++) fr();
    // riporta il personaggio esattamente in (x, y)
    p.x = P.at[0]; p.y = P.at[1]; p.face = h; for (let i = 0; i < 20; i++) fr();
    let url = null; if (P.foto !== false) { draws(true); fr(); url = rd.domElement.toDataURL('image/jpeg', .85); draws(false); } else fr();
    // il costo (perf: n fotogrammi coi disegni accesi): i disegni e i triangoli di un fotogramma intero (tutti i passaggi), i ms d'orologio
    let perf = null; if (P.perf) { draws(true); const ar = rd.info.autoReset; rd.info.autoReset = false; const ms = [], dc = [], tri = [];
      for (let i = 0; i < P.perf; i++) { rd.info.reset(); const a = performance.now(); fr(); ms.push(performance.now() - a); dc.push(rd.info.render.calls); tri.push(rd.info.render.triangles); }
      rd.info.autoReset = ar; draws(false); const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1]; perf = { ms: +md(ms).toFixed(1), disegni: md(dc), triangoli: md(tri), far: camera.far, nebbia: [+R.__models.scene.fog.near.toFixed(0), +R.__models.scene.fog.far.toFixed(0)] }; }
    // quanto del quadro vede lontano (come in corsa) e se il busto si vede dalla camera (il raggio del braccio, sottile)
    const M = R.__vis4.M || (R.__vis4.M = Visuale.mappa(G.MAP.world)), o = camera.position, inv = camera.projectionMatrixInverse, mw = camera.matrixWorld, dd = new THREE.Vector3(); let far = 0, n = 0, alto = 0, altoN = 0;
    for (let j = 0; j < 14; j++) for (let i = 0; i < 24; i++) { dd.set((i + .5) / 24 * 2 - 1, 1 - (j + .5) / 14 * 2, .5).applyMatrix4(inv).applyMatrix4(mw).sub(o).normalize();
      let s = .5, hit = null; while (s < 250) { const x = o.x + dd.x * s, y = o.y + dd.y * s, z = o.z + dd.z * s; if (M.alto(x, z) > y || R.groundH(x, z) > y) { hit = s; break; } s += s < 20 ? .4 : s < 80 ? 1.2 : 3; if (y > 60 && dd.y > 0) break; }
      const lont = hit === null || hit > 60; n++; if (lont) far++; if (j < 5) { altoN++; if (lont) alto++; } }
    Camera7.K9.lontano = lont0; Camera7.K9.nebbia = neb0;
    const ghc = R.groundH(p.x, p.y), ch = { x: p.x, y: ghc + 1.2, z: p.y }, dv = { x: ch.x - o.x, y: ch.y - o.y, z: ch.z - o.z }, Lc = Math.hypot(dv.x, dv.y, dv.z), hc = R.cast7({ x: o.x, y: o.y, z: o.z }, { x: dv.x / Lc, y: dv.y / Lc, z: dv.z / Lc }, Lc, .02);
    const gh = R.groundH(p.x, p.y), u = C7.ultimo, dir = new THREE.Vector3(); camera.getWorldDirection(dir); const vp = -Math.asin(dir.y), hf = camera.fov * Math.PI / 360;
    const v = new THREE.Vector3(p.x, gh, p.y).project(camera);
    return { url, s: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), arm: u ? +u.arm.toFixed(2) : null, pitch: u ? +(u.pitch * D).toFixed(1) : null, vista: +(vp * D).toFixed(1), fov: +camera.fov.toFixed(1), oriz: +(.5 - .5 * Math.tan(vp) / Math.tan(hf)).toFixed(3), sy: +(1 - (v.y * .5 + .5)).toFixed(3), camY: +(camera.position.y - gh).toFixed(2), lift: C7.S ? +(C7.S.lift.x * D).toFixed(1) : null, side: u && u.side9 !== undefined ? +u.side9.toFixed(2) : null, terra: u && u.terra !== undefined ? +(u.terra * D).toFixed(1) : null, sfondo: +(far / n).toFixed(3), sfondoAlto: +(alto / altoN).toFixed(3), coperto: hc !== null && hc < Lc - .4, perf, c9: !!(Camera7.C9 && Camera7.C9.on) } };
  }, P);
}
module.exports = { corsa, posa };
