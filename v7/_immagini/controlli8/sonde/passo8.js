// [controlli8] il pilota a passi: ferma il giro di main.js e fa i fotogrammi da qui, con l'input VERO di main.js (__pv.input(), i tasti in
// __pv.keys: anche la base dei comandi, comandi8), il motore (G.step) e la camera (R.frame). Come camera7/sonde/passo7.js, più:
//   - il pilota UMANO coi tasti: un punto ~1,4 m avanti sul percorso, il tasto (a 8 vie) rispetto alla camera che si vede, tenuto finché
//     lo scarto non passa i 35° (come un dito sulla tastiera); passa per main.js input() come i tasti veri;
//   - dopo R.frame il giro del ricentro va alla base tenuta (main.js lo fa dopo FRAME: qui il giro di main.js è fermo);
//   - lo stato: il braccio, la quota vera (R.groundH), il personaggio sullo schermo, lo yaw usato per i tasti.
// corsa(pg, piano): piano = { start:[x,y], verso:[x,y], dt, foto (ogni s, 0 niente), segs:[{ sec, keys:{w:1}, percorso:[[x,y]..], corsa }] }
async function corsa(pg, piano) {
  return pg.evaluate(async P => {
    const pv = window.__pv, R = pv.R, G = pv.G, st = pv.st, p = st.player, cam = R.cam, camera = R.getCamera(), rd = R.__models.renderer, gl = rd.getContext(), DT = P.dt || 1 / 30;
    window.PV_ATTESA.on = () => true;
    if (!gl.__vero) { gl.__vero = {}; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { gl.__vero[k] = gl[k]; gl[k] = function () { }; } }
    const draws = on => { for (const k in gl.__vero) gl[k] = on ? gl.__vero[k] : function () { }; };
    const C7 = R.__cam7, B8 = pv.B8, ang = a => Math.atan2(Math.sin(a), Math.cos(a));
    for (const k in pv.keys) pv.keys[k] = false;
    st.police = []; st.heat = 0; p.stun = 0; p.hp = 100;
    if (P.start) { p.x = P.start[0]; p.y = P.start[1]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.vx = p.vy = 0;
      if (R.camReset) R.camReset(); R.snap(st); cam.ppx = undefined;
      if (P.verso) { const h = Math.atan2(P.verso[1] - p.y, P.verso[0] - p.x); C7.yaw0 = Math.atan2(-Math.cos(h), -Math.sin(h)); C7.S = null; p.face = h; } }
    pv.ui.zoom = .5; pv.ui.tilt = 0; pv.ui.drag = 0;
    const ui = { zoom: .5, time: pv.ui.time || 0, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: DT, mira: null };
    const proj = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(camera); return { x: v.x * .5 + .5, y: 1 - (v.y * .5 + .5) }; };
    const stato = () => { const gh = R.groundH(p.x, p.y), f = proj(p.x, gh + .9, p.y), u = C7.ultimo;
      return { t: +ui.time.toFixed(3), x: +p.x.toFixed(3), y: +p.y.toFixed(3), face: +p.face.toFixed(3), yaw: +cam.yaw.toFixed(4), gh: +gh.toFixed(3), sx: +f.x.toFixed(3), sy: +f.y.toFixed(3),
        arm: u && C7.attivo ? +u.arm.toFixed(2) : null, pitch: u && C7.attivo ? +(u.pitch * 57.2958).toFixed(1) : null, camY: +camera.position.y.toFixed(2), b8: B8 && B8.a !== null ? +B8.yaw.toFixed(4) : null, c7: !!C7.attivo }; };
    const passo = inp => { const x0 = p.x, y0 = p.y; G.step(st, DT, inp); ui.__dsp = Math.hypot(p.x - x0, p.y - y0) / DT; ui.muove = !!(inp && (inp.x || inp.y)); ui.tenuto8 = B8 && B8.a !== null ? B8.t : undefined;
      ui.time += DT; pv.ui.time = ui.time; R.frame(st, DT, ui); if (B8 && C7.attivo && C7.ultimo && window.Camera7 && Camera7.comandi8) Camera7.comandi8.dopo(B8, C7.ultimo); };
    for (let i = 0; i < 10; i++) passo({ x: 0, y: 0 });
    // il pilota umano: il punto avanti sul percorso (l'indice non torna indietro)
    const mira = sg => { const Q = sg.percorso; if (sg._i === undefined) { sg._i = 0; sg._u = 0; }
      let bi = sg._i, bu = sg._u, bd = 1e9; for (let i = sg._i; i < Math.min(Q.length - 1, sg._i + 4); i++) { const a = Q[i], b = Q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; let u = ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L2; u = Math.max(i === sg._i ? sg._u : 0, Math.min(1, u)); const d = Math.hypot(a[0] + dx * u - p.x, a[1] + dy * u - p.y); if (d < bd - 1e-9) { bd = d; bi = i; bu = u; } }
      sg._i = bi; sg._u = bu; let rest = 1.4, i = bi, u = bu;
      while (i < Q.length - 1) { const a = Q[i], b = Q[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), r = (1 - u) * L; if (r >= rest) { const f = u + rest / (L || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } rest -= r; i++; u = 0; }
      return Q[Q.length - 1]; };
    const out = { fotos: [], log: [] }; let t = 0, prossima = 0; const step = P.foto || .5;
    for (const sg of P.segs) {
      const t1 = t + sg.sec;
      while (t < t1 - 1e-6) {
        for (const k in pv.keys) pv.keys[k] = false; if (sg.keys) for (const k in sg.keys) pv.keys[k] = !!sg.keys[k];
        if (sg.percorso) { const q = mira(sg), dx = q[0] - p.x, dy = q[1] - p.y, l = Math.hypot(dx, dy), fine = sg.percorso[sg.percorso.length - 1];
          if (sg._i >= sg.percorso.length - 3 && Math.hypot(fine[0] - p.x, fine[1] - p.y) < .8) sg.arrivato = sg.arrivato || +(t - (t1 - sg.sec)).toFixed(3);
          else if (l > .3) { const yw = cam.yaw, fx = -Math.sin(yw), fz = -Math.cos(yw), rx = -fz, rz = fx, a = Math.atan2((dx * rx + dy * rz) / l, (dx * fx + dy * fz) / l);   // la camera che si vede
            let o = Math.round(a / (Math.PI / 4)); if (sg._o !== undefined && Math.abs(ang(a - sg._o * Math.PI / 4)) < 35 * Math.PI / 180) o = sg._o; sg._o = o;
            const aa = o * Math.PI / 4, kx = Math.round(Math.sin(aa)), ky = Math.round(Math.cos(aa)); if (ky > 0) pv.keys.w = true; if (ky < 0) pv.keys.s = true; if (kx > 0) pv.keys.d = true; if (kx < 0) pv.keys.a = true; if (sg.corsa) pv.keys.shift = true; } }
        const inp = pv.input() || { x: 0, y: 0 };
        const scatta = P.foto && t >= prossima - 1e-6; if (scatta) draws(true);
        passo(inp);
        const s0 = stato(); s0.dsp = +(ui.__dsp || 0).toFixed(2); s0.inp = [+(inp.x || 0).toFixed(3), +(inp.y || 0).toFixed(3)]; s0.seg = P.segs.indexOf(sg);
        if (scatta) { out.fotos.push([+t.toFixed(2), rd.domElement.toDataURL('image/jpeg', .8), s0]); draws(false); prossima += step; }
        out.log.push(s0);
        t += DT; await new Promise(r => setTimeout(r, 0));
      }
      out.arrivato = out.arrivato || []; out.arrivato.push(sg.arrivato || null);
    }
    draws(true); for (const k in pv.keys) pv.keys[k] = false;
    return out;
  }, piano);
}
module.exports = { corsa };
