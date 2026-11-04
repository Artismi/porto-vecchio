/* Porto Vecchio — [camera7] LA VISTA UNICA A MEZZA ALTEZZA (le regole, senza grafica: le usa render.js, le prova test_camera7.js).
   Il committente: una vista sola, a mezza altezza, che legga la profondità e veda lontano; a piedi ci si muove come nella terza persona
   di GTA V. Al posto dei tredici strati di prima (CALMA2, BASSA, INQ4, RG5, REG, CAM6, VIS3, VIS4, IQ5, la mano, il sollevamento, il
   rollio, l'aggancio ai pixel, il taglio vicino) UN braccio di gru solo:
   - TRE MOLLE: lo yaw (il giocatore lo gira subito; il ricentro passa da qui, liscio), il braccio (si accorcia in K.armIn s, torna fuori
     in K.armOut s) e il punto guardato (il petto, K.chest m, più K.ahead m avanti lungo la velocità smussata; la quota del suolo smussata);
   - UN raggio a sfera (raggio K.r) dal petto verso la camera contro la geometria vera (render.js: le mesh della scena, con mesh_bvh): il
     braccio si ferma prima del muro, nessuna casa tagliata; sotto K.close[0] m di braccio la pendenza sale fino a K.close[2] a K.close[1] m;
   - la pendenza K.pitch (34°, la variante C: la camera a ~6,8 m, il bordo alto ~11° sotto l'orizzonte), ±K.orbit col giocatore; il campo verticale K.vfov, almeno
     K.hfovMin di orizzontale (il telefono in verticale), al più K.vfovMax; il piano vicino K.near;
   - IL RICENTRO solo camminando, solo dopo K.recentAfter s senza toccare la camera, verso il dietro della velocità, al più K.recentMax
     rad/s; mai se vai verso la camera (oltre K.recentAng da dietro). Niente asse dei vicoli, niente regista, niente zoom da soli;
   - LA MIRA sopra la spalla: la camera va K.aimSide m a destra e il braccio a K.aimArm m.
   Gli angoli: yaw come cam.yaw di render.js (la camera sta in direzione (sin yaw, cos yaw) dal punto guardato, sul piano x-z);
   il piano del gioco è (x, y) = (x, z) della scena. ?nofixcamera7: la camera di prima.  */
var Camera7 = (function () {
  'use strict';
  const D = Math.PI / 180;
  const K = {
    // [camera7] LA VISTA (la variante C scelta dal committente: «sbocco 4s», «lungomare 3s»): tutti i numeri da ritoccare stanno qui
    pitch: 34 * D,       // la pendenza della vista (giù dall'orizzonte): col campo di 46° il bordo alto sta ~11° sotto l'orizzonte
    orbit: 12 * D,       // il giocatore la inclina di tanto, in su e in giù
    arm: 10,             // m: il braccio (la camera ~6,8 m sopra la strada)
    armMin: 1.2,         // m: mai più vicino (il raggio a sfera ferma prima)
    chest: 1.15,         // m: il punto guardato sopra i piedi (il busto: più in basso del petto, così davanti resta più strada)
    ahead: 1.9,          // m: lo sguardo avanti da K.aheadV in su (sotto in proporzione): camminando e correndo il personaggio sta a ~62% dell'altezza
    aheadV: 4,           // m/s
    aheadT: .6,          // s: la molla della velocità smussata (lo sguardo avanti non segue i tremiti)
    heightT: .2,         // s: la molla della quota del suolo (gradini, scalinate)
    vfov: 46, hfovMin: 62, vfovMax: 80,   // gradi
    near: .25,           // m
    r: .35,              // m: il raggio della sfera del braccio
    armIn: .1, armOut: .6,   // s: il braccio si accorcia, il braccio torna fuori
    armSlip: .1,         // m: il braccio non sta mai oltre il colpo più di tanto (mentre si accorcia)
    close: [6.5, 3.5, 50 * D],   // sotto 6,5 m di braccio la pendenza sale, lineare, fino a 50° a 3,5 m (si sale invece di entrare addosso)
    yawT: .12,           // s: la molla dello yaw (il ricentro; il giocatore gira subito)
    recentAfter: 2,      // s senza toccare la camera
    recentMax: Math.PI / 2,   // rad/s (90°/s)
    recentK: 1.6,        // 1/s: vicino al dietro rallenta (la velocità è K.recentK × lo scarto, al più K.recentMax)
    recentRamp: .6,      // s: il ricentro parte piano
    recentVel: .8,       // m/s: sotto, fermi: niente ricentro
    recentAng: 2.1,      // rad: oltre (vai verso la camera) niente ricentro
    pitchBack: 1.5,      // s: camminando senza toccare, l'inclinazione del giocatore torna a zero (la molla)
    aimSide: .75, aimArm: 6.8, aimT: .22,  // la mira sopra la spalla destra (il braccio resta sopra K.close[0]: mirando non si sale)
    clearUp: .45,        // m: la camera mai più bassa di tanto sopra il suolo sotto di lei
  };
  const ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // la molla smorzata al punto critico: arriva al 95% in T s, niente oltre; uguale a ogni dt (a passi di al più 1/60 s)
  function molla(S, meta, T, dt) {
    if (!(T > 0) || dt > 1) { S.x = meta; S.v = 0; return S.x; }
    const w = 4.74 / T; let t = dt;
    while (t > 1e-6) { const h = Math.min(t, 1 / 60), e = Math.exp(-w * h), d = S.x - meta, c = S.v + w * d;
      S.x = meta + (d + c * h) * e; S.v = (S.v - c * w * h) * e; t -= h; }
    return S.x;
  }
  // il campo verticale per l'aspetto (larghezza / altezza): almeno K.hfovMin di orizzontale, al più K.vfovMax
  function vfov(aspect, k) {
    k = k || K; const a = aspect > 0 ? aspect : 1, need = 2 * Math.atan(Math.tan(k.hfovMin * D / 2) / a) / D;
    return clamp(Math.max(k.vfov, need), 1, k.vfovMax);
  }
  // la pendenza per un braccio lungo `arm`: quella di base più l'inclinazione del giocatore, poi sotto K.close[0] sale fino a K.close[2]
  function pitchFor(arm, user, k) {
    k = k || K; const base = k.pitch + clamp(user || 0, -k.orbit, k.orbit), c = k.close, f = clamp((c[0] - arm) / (c[0] - c[1]), 0, 1);
    return base + (Math.max(base, c[2]) - base) * f;
  }
  function create() { return { on: false, yaw: { x: 0, v: 0 }, yawT: 0, arm: { x: K.arm, v: 0 }, aim: { x: 0, v: 0 }, vx: { x: 0, v: 0 }, vy: { x: 0, v: 0 }, h: { x: 0, v: 0 },
    pu: 0, quiet: 99, recent: 0, mosse: 0, colpo: null, armT: K.arm }; }
  // il ricentro: lo yaw che mette la camera dietro la velocità (vx, vy nel piano del gioco)
  const dietro = (vx, vy) => { const h = Math.atan2(vy, vx); return Math.atan2(-Math.cos(h), -Math.sin(h)); };
  /* un passo. q: { px, py, fy (la quota dei piedi), vx, vy (la velocità vera, m/s), dyaw, dpitch (il giocatore, rad, in questo passo),
     tocca (il giocatore sta toccando la camera), mira (bool), aspect, init: {yaw, dist} (la camera di prima, per partire da lì),
     snap (le molle arrivano subito), cast(o, dir, len) → distanza del primo colpo della sfera o null, suolo(x, z) → quota }
     Rende la camera: { pos, look, yaw, pitch, arm, fov, near, side, dyRic (lo yaw girato dal ricentro in questo passo) } */
  function passo(S, q, dt, k) {
    k = k || K; dt = Math.max(0, dt || 0);
    const snap = !!q.snap || !S.on || dt > 1;
    if (!S.on) { S.on = true; const y0 = q.init && isFinite(q.init.yaw) ? q.init.yaw : 0; S.yaw.x = S.yawT = y0; S.yaw.v = 0; S.pu = 0; S.quiet = 0; S.recent = 0;
      S.arm.x = q.init && q.init.dist > 0 ? clamp(q.init.dist, k.armMin, 30) : k.arm; S.arm.v = 0; S.vx.x = S.vy.x = 0; S.vx.v = S.vy.v = 0; S.h.x = q.fy; S.h.v = 0; S.aim.x = q.mira ? 1 : 0; S.aim.v = 0; }
    // 1. il giocatore: lo yaw subito (anche il bersaglio, così la molla non lo trattiene), l'inclinazione dentro ±K.orbit
    const dy = q.dyaw || 0; S.yaw.x += dy; S.yawT += dy;
    if (q.pu !== undefined) S.pu = clamp(q.pu, -k.orbit, k.orbit); else S.pu = clamp(S.pu + (q.dpitch || 0), -k.orbit, k.orbit);   // q.pu: l'inclinazione la tiene chi chiama (main.js ui.tilt)
    if (q.tocca || dy || q.dpitch) S.quiet = 0; else S.quiet += dt;
    // 2. la velocità smussata (lo sguardo avanti e il ricentro)
    if (snap) { S.vx.x = q.vx || 0; S.vy.x = q.vy || 0; S.vx.v = S.vy.v = 0; } else { molla(S.vx, q.vx || 0, k.aheadT, dt); molla(S.vy, q.vy || 0, k.aheadT, dt); }
    const sv = Math.hypot(S.vx.x, S.vy.x);
    // 3. il ricentro: in cammino, dopo K.recentAfter s senza toccare, verso il dietro della velocità (al più K.recentMax rad/s)
    let dyRic = 0;
    if (!q.mira && sv > k.recentVel && S.quiet > k.recentAfter) {
      const d = ang(dietro(S.vx.x, S.vy.x) - S.yawT);
      if (Math.abs(d) < k.recentAng) { S.recent = Math.min(1, S.recent + dt / k.recentRamp);
        const w = Math.min(k.recentMax, k.recentK * Math.abs(d)) * S.recent, st = Math.sign(d) * Math.min(Math.abs(d), w * dt); S.yawT += st; dyRic = st; if (Math.abs(st) > 1e-4) S.mosse++; }
      else S.recent = 0;
      if (q.pu === undefined) { S.pu += (0 - S.pu) * (1 - Math.exp(-dt * 3 / k.pitchBack)); if (Math.abs(S.pu) < 1e-4) S.pu = 0; }
    } else S.recent = 0;
    const y0 = S.yaw.x; if (snap) { S.yaw.x = S.yawT; S.yaw.v = 0; } else { S.yaw.x = S.yawT + ang(S.yaw.x - S.yawT); molla(S.yaw, S.yawT, k.yawT, dt); }
    const yaw = S.yaw.x;
    // 4. la mira sopra la spalla
    const ka = snap ? (S.aim.x = q.mira ? 1 : 0) : clamp(molla(S.aim, q.mira ? 1 : 0, k.aimT, dt), 0, 1);
    // 5. il punto guardato: il petto, più lo sguardo avanti, più la spalla; la quota con la molla
    const fy = snap ? (S.h.x = q.fy, S.h.v = 0, q.fy) : molla(S.h, q.fy, k.heightT, dt);
    const av = k.ahead * Math.min(1, sv / k.aheadV) * (1 - ka), ax = sv > 1e-3 ? S.vx.x / sv * av : 0, ay = sv > 1e-3 ? S.vy.x / sv * av : 0;
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), side = k.aimSide * ka;   // la destra dello schermo nel piano x-z
    const look = { x: q.px + ax + rx * side, y: fy + k.chest, z: q.py + ay + rz * side };
    // 6. il braccio voluto, il raggio a sfera dal petto verso la camera voluta, il braccio che si ferma prima
    const want = k.arm + (k.aimArm - k.arm) * ka, pW = pitchFor(want, S.pu, k), cpW = Math.cos(pW);
    const cw = { x: look.x + Math.sin(yaw) * cpW * want, y: look.y + Math.sin(pW) * want, z: look.z + Math.cos(yaw) * cpW * want };
    const o = { x: q.px + rx * side, y: fy + k.chest, z: q.py + rz * side }, dx = cw.x - o.x, dyy = cw.y - o.y, dz = cw.z - o.z, L = Math.hypot(dx, dyy, dz) || 1;
    let hit = q.cast ? q.cast(o, { x: dx / L, y: dyy / L, z: dz / L }, L, k.r) : null;
    S.colpo = hit; const armT = clamp(hit !== null && hit !== undefined && hit < L ? want * hit / L : want, k.armMin, want); S.armT = armT;
    if (snap) { S.arm.x = armT; S.arm.v = 0; }
    else if (armT < S.arm.x) { const e = 1 - Math.exp(-dt * 3 / k.armIn); S.arm.x += (armT - S.arm.x) * e; S.arm.v = 0; if (S.arm.x > armT + k.armSlip) S.arm.x = armT + k.armSlip; }
    else molla(S.arm, armT, k.armOut, dt);
    const arm = clamp(S.arm.x, k.armMin, 40), pitch = pitchFor(arm, S.pu, k), cp = Math.cos(pitch);
    const pos = { x: look.x + Math.sin(yaw) * cp * arm, y: look.y + Math.sin(pitch) * arm, z: look.z + Math.cos(yaw) * cp * arm };
    if (q.suolo) { const g = q.suolo(pos.x, pos.z) + k.clearUp; if (isFinite(g) && pos.y < g) pos.y = g; }
    return { pos, look, yaw, pitch, arm, fov: vfov(q.aspect, k), near: k.near, side, dyRic, yawGiro: yaw - y0, ka };
  }
  // L'AVVIO: fra sedici direzioni quella con più strada libera davanti al personaggio e almeno K.arm m liberi dietro (il lato camera).
  // libero(x, y, ux, uy, max) → metri liberi lungo (ux, uy) dal punto (la mappa delle case o i raggi veri). Rende { face, yaw, avanti, dietro }
  function avvio(x, y, libero, k) {
    k = k || K; let best = null;
    for (let i = 0; i < 16; i++) { const f = i * Math.PI / 8, ux = Math.cos(f), uy = Math.sin(f);
      const av = libero(x, y, ux, uy, 40), di = libero(x, y, -ux, -uy, k.arm * Math.cos(k.pitch) + 1), lat = Math.min(libero(x, y, -uy, ux, 6), libero(x, y, uy, -ux, 6));
      const v = (di >= k.arm * Math.cos(k.pitch) ? 100 : di * 8) + Math.min(av, 40) + Math.min(lat, 6) * .5;
      if (!best || v > best.v) best = { v, face: f, avanti: av, dietro: di }; }
    best.yaw = dietro(Math.cos(best.face), Math.sin(best.face)); return best;
  }
  return { K, passo, create, vfov, pitchFor, molla, avvio, dietro, ang };
})();
if (typeof window !== 'undefined') window.__CAMERA7 = Camera7.K;
if (typeof module !== 'undefined') module.exports = Camera7;
