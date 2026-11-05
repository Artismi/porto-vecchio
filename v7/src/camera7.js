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
   il piano del gioco è (x, y) = (x, z) della scena. ?nofixcamera7: la camera di prima.
   [controlli8] I COMANDI DELLA TERZA PERSONA, DAVVERO RISPETTO ALLA VISTA (il committente: «la mira e la direzione del personaggio non
   sono nella vista ma nel controllo spaziale», «è difficile controllare il personaggio», «il controllo è poco reattivo»). Prima la base
   dei tasti e delle levette (render.js cam.lock) restava ferma contro il ricentro finché ci si muoveva: dopo 4 s con D (la camera girata
   di ~80° dal ricentro) W andava di ~80° di lato sullo schermo, e la mira (camDavanti) guardava dove guardava la camera 4 s prima.
   Ora (comandi8): la direzione tenuta resta ferma nel mondo solo finché tieni LA STESSA combinazione di tasti (o la levetta nello stesso
   verso: girandola la base torna alla camera di quanto la giri), e la camera del ricentro si gira dietro di te senza farti girare in tondo;
   cambi tasto e la base è la camera di adesso (W = via dalla camera, sempre), col giro della camera di questo fotogramma. Lo sguardo avanti
   segue la marcia lungo la vista (K8.ahead in avanti, K8.aheadLat di lato, niente all'indietro, molla K8.aheadT): nei cambi di direzione
   svelti il personaggio non scivola via dal centro. ?nofixcontrolli8: com'era  */
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
    lifts: [6 * D, 12 * D, 16 * D],   // prima di accorciare il braccio si prova a salire di tanto (al più fino a K.close[2])
    liftT: .45, liftBack: 1.5,  // s: la molla della salita; libero da tanto, si torna giù
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
    avvioPassi: 10,      // m: all'avvio, quanto il personaggio può spostarsi per avere la via davanti e il braccio libero dietro
  };
  // [controlli8] lo sguardo avanti lungo la vista: in avanti fino a K8.ahead m (da K.aheadV in su), di lato K8.aheadLat della marcia,
  // all'indietro niente; la molla della velocità smussata K8.aheadT (prima 0,6 s: un dietrofront spostava il centro per mezzo secondo)
  // il ricentro aspetta anche K8.recentHold s di marcia nella stessa direzione (un tasto nuovo, la levetta girata di più di K8.giroLev):
  // nelle mosse svelte (scansarsi, girare un angolo) la vista sta ferma e i tasti restano di lato; tenendo la via la camera ti viene dietro
  // (se il braccio è sotto K8.coperto del pieno, un muro o una ringhiera fra te e la camera, il ricentro non aspetta: si gira dietro la marcia)
  const K8 = { ahead: 1.5, aheadLat: .3, aheadT: .3, recentHold: 1, giroLev: 25 * D, coperto: .6 };
  const C8 = { on: !(typeof location !== 'undefined' && /[?&]nofixcontrolli8\b/.test(location.search)) };
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
    pu: 0, quiet: 99, recent: 0, mosse: 0, colpo: null, armT: K.arm, lift: { x: 0, v: 0 }, liftW: 0, liftT: 0 }; }
  // il ricentro: lo yaw che mette la camera dietro la velocità (vx, vy nel piano del gioco)
  const dietro = (vx, vy) => { const h = Math.atan2(vy, vx); return Math.atan2(-Math.cos(h), -Math.sin(h)); };
  /* un passo. q: { px, py, fy (la quota dei piedi), vx, vy (la velocità vera, m/s), dyaw, dpitch (il giocatore, rad, in questo passo),
     tocca (il giocatore sta toccando la camera), mira (bool), aspect, init: {yaw, dist} (la camera di prima, per partire da lì),
     snap (le molle arrivano subito), cast(o, dir, len) → distanza del primo colpo della sfera o null, suolo(x, z) → quota }
     Rende la camera: { pos, look, yaw, pitch, arm, fov, near, side, dyRic (lo yaw girato dal ricentro in questo passo) } */
  function passo(S, q, dt, k) {
    k = k || K; dt = Math.max(0, dt || 0);
    const snap = !!q.snap || !S.on || dt > 1;
    if (!S.on) { S.on = true; const y0 = q.init && isFinite(q.init.yaw) ? q.init.yaw : 0; S.yaw.x = S.yawT = y0; S.yaw.v = 0; S.lift.x = S.lift.v = 0; S.liftW = 0; S.liftT = 0; S.pu = 0; S.quiet = 0; S.recent = 0;
      S.arm.x = q.init && q.init.dist > 0 ? clamp(q.init.dist, k.armMin, 30) : k.arm; S.arm.v = 0; S.vx.x = S.vy.x = 0; S.vx.v = S.vy.v = 0; S.h.x = q.fy; S.h.v = 0; S.aim.x = q.mira ? 1 : 0; S.aim.v = 0; }
    // 1. il giocatore: lo yaw subito (anche il bersaglio, così la molla non lo trattiene), l'inclinazione dentro ±K.orbit
    const dy = q.dyaw || 0; S.yaw.x += dy; S.yawT += dy;
    if (q.pu !== undefined) S.pu = clamp(q.pu, -k.orbit, k.orbit); else S.pu = clamp(S.pu + (q.dpitch || 0), -k.orbit, k.orbit);   // q.pu: l'inclinazione la tiene chi chiama (main.js ui.tilt)
    if (q.tocca || dy || q.dpitch) S.quiet = 0; else S.quiet += dt;
    // 2. la velocità smussata (lo sguardo avanti e il ricentro)
    const aT = C8.on ? K8.aheadT : k.aheadT;   // [controlli8]
    if (snap) { S.vx.x = q.vx || 0; S.vy.x = q.vy || 0; S.vx.v = S.vy.v = 0; } else { molla(S.vx, q.vx || 0, aT, dt); molla(S.vy, q.vy || 0, aT, dt); }
    const sv = Math.hypot(S.vx.x, S.vy.x);
    // 3. il ricentro: in cammino, dopo K.recentAfter s senza toccare, verso il dietro della velocità (al più K.recentMax rad/s)
    let dyRic = 0;
    if (!q.mira && sv > k.recentVel && S.quiet > k.recentAfter && !(C8.on && q.tenuto !== undefined && q.tenuto < K8.recentHold && S.arm.x > k.arm * K8.coperto)) {   // [controlli8] e la stessa via da un secondo (subito se il braccio è accorciato: dietro la marcia c'è aria)
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
    const fA = (1 - ka) * clamp((S.arm.x - k.armMin) / (k.close[0] - k.armMin), 0, 1);   // col braccio corto niente sguardo avanti: il personaggio resta nel quadro
    const av = k.ahead * Math.min(1, sv / k.aheadV) * fA; let ax = sv > 1e-3 ? S.vx.x / sv * av : 0, ay = sv > 1e-3 ? S.vy.x / sv * av : 0;
    const rx = Math.cos(yaw), rz = -Math.sin(yaw), side = k.aimSide * ka;   // la destra dello schermo nel piano x-z
    if (C8.on) { const fx = -Math.sin(yaw), fz = -Math.cos(yaw), vf = S.vx.x * fx + S.vy.x * fz, vl = S.vx.x * rx + S.vy.x * rz;   // [controlli8] lungo la vista: avanti sì, di lato poco, indietro no
      const af = K8.ahead * clamp(vf / k.aheadV, 0, 1) * fA, al = K8.ahead * clamp(vl / k.aheadV, -1, 1) * K8.aheadLat * fA; ax = fx * af + rx * al; ay = fz * af + rz * al; }
    const look = { x: q.px + ax + rx * side, y: fy + k.chest, z: q.py + ay + rz * side };
    // 6. il braccio voluto e il raggio a sfera dal petto verso la camera voluta. Prima si prova a SALIRE (K.lifts: la camera più alta
    // passa sopra le tende, le insegne, gli archi bassi) a braccio pieno; se nessuna altezza è libera il braccio si ferma prima del colpo
    const want = k.arm + (k.aimArm - k.arm) * ka, o = { x: q.px + rx * side, y: fy + k.chest, z: q.py + rz * side };
    const prova = (pp, d) => { const c = Math.cos(pp), cw = { x: look.x + Math.sin(yaw) * c * d, y: look.y + Math.sin(pp) * d, z: look.z + Math.cos(yaw) * c * d },
      dx = cw.x - o.x, dyy = cw.y - o.y, dz = cw.z - o.z, L = Math.hypot(dx, dyy, dz) || 1, h = q.cast ? q.cast(o, { x: dx / L, y: dyy / L, z: dz / L }, L, k.r) : null;
      return h === null || h === undefined || h >= L ? 1 : Math.max(0, h / L); };
    const pB = pitchFor(want, S.pu, k), cap = Math.max(pB, k.close[2]); let lw = 0;
    if (q.cast && prova(pB, want) < .92) { lw = -1; for (const dp of k.lifts) { if (pB + dp > cap + 1e-6) break; if (prova(pB + dp, want) >= .92) { lw = dp; break; } } }
    if (lw >= 0) { if (lw >= S.liftW) { S.liftW = lw; S.liftT = 0; } else { S.liftT += dt; if (S.liftT > k.liftBack) S.liftW = lw; } }   // si sale subito, si torna giù dopo K.liftBack s libero
    const lift = snap ? (S.lift.x = S.liftW, S.lift.v = 0, S.liftW) : molla(S.lift, S.liftW, k.liftT, dt);
    const f6 = prova(Math.min(Math.max(cap, pitchFor(S.arm.x, S.pu, k)), pitchFor(S.arm.x, S.pu, k) + lift), want); S.colpo = f6;   // nella direzione dove la camera sarà davvero (col braccio corto la pendenza sale)
    const armT = clamp(want * f6, k.armMin, want); S.armT = armT;
    if (snap) { S.arm.x = armT; S.arm.v = 0; }
    else if (armT < S.arm.x) { const e = 1 - Math.exp(-dt * 3 / k.armIn); S.arm.x += (armT - S.arm.x) * e; S.arm.v = 0; if (S.arm.x > armT + k.armSlip) S.arm.x = armT + k.armSlip; }
    else molla(S.arm, armT, k.armOut, dt);
    let arm = clamp(S.arm.x, k.armMin, 40); const pitch = Math.min(Math.max(cap, pitchFor(arm, S.pu, k)), pitchFor(arm, S.pu, k) + lift), cp = Math.cos(pitch);
    if (q.cast && !snap) { const fa = prova(pitch, arm); if (fa < 1) { arm = Math.max(k.armMin, arm * fa); S.arm.x = Math.min(S.arm.x, arm + k.armSlip); } }   // la camera vera, l'ultima prova: mai dentro un muro
    const pos = { x: look.x + Math.sin(yaw) * cp * arm, y: look.y + Math.sin(pitch) * arm, z: look.z + Math.cos(yaw) * cp * arm };
    if (q.suolo) { const g = q.suolo(pos.x, pos.z) + k.clearUp; if (isFinite(g) && pos.y < g) pos.y = g; }
    return { pos, look, yaw, pitch, arm, fov: vfov(q.aspect, k), near: k.near, side, dyRic, yawGiro: yaw - y0, ka };
  }
  // L'AVVIO: fra sedici direzioni quella con più strada libera davanti al personaggio e il braccio libero dietro (il lato camera). Se dal
  // punto di partenza nessuna direzione ha l'una e l'altro (la porta di casa in un angolo), il personaggio fa qualche passo (al più
  // K.avvioPassi m, raggiungibili a piedi: va(x0, y0, x1, y1)) verso dove ce l'hanno. libero(x, y, ux, uy, max, dietro) → metri liberi
  // lungo (ux, uy) (dietro: lungo il braccio che sale). Rende { x, y, face, yaw, avanti, dietro, passi }
  function avvio(x, y, libero, k, va) {
    k = k || K; let best = null; const need = k.arm * Math.cos(k.pitch), P = [[x, y]];
    if (va) for (const r of [2, 4, 6, 8, 10].filter(q => q <= k.avvioPassi)) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (va(x, y, qx, qy)) P.push([qx, qy]); }
    for (const [px, py] of P) { const passi = Math.hypot(px - x, py - y);
      for (let i = 0; i < 16; i++) { const f = i * Math.PI / 8, ux = Math.cos(f), uy = Math.sin(f);
        const av = libero(px, py, ux, uy, 40, false), di = libero(px, py, -ux, -uy, need + 1, true), lat = Math.min(libero(px, py, -uy, ux, 6, false), libero(px, py, uy, -ux, 6, false));
        const v = (di >= need ? 100 : di * 8) + Math.min(av, 30) + Math.min(lat, 6) * .5 - passi * 2.5;
        if (!best || v > best.v) best = { v, x: px, y: py, passi, face: f, avanti: av, dietro: di }; } }
    best.yaw = dietro(Math.cos(best.face), Math.sin(best.face)); return best;
  }
  // [controlli8] LA BASE DEI COMANDI A PIEDI (main.js la usa per i tasti, le frecce, la levetta del controller, quella a schermo e quella del
  // Game Boy; test_controlli8.js la prova). B = crea(); a ogni fotogramma dir(B, sx, sy, yaw, tasti): (sx destra, sy avanti) nello spazio
  // della camera → la direzione nel piano del gioco, con yaw la camera di adesso (col giro chiesto in questo fotogramma). La base resta
  // ferma nel mondo contro il ricentro (dopo(B, r): r.yawGiro, il giro fatto dalla molla) solo finché l'ingresso resta quello: un tasto
  // diverso la riporta alla camera di adesso; la levetta girata di δ la riporta di δ (niente scatti). B.t: da quanti s si tiene la via
  const comandi8 = {
    crea: () => ({ a: null, a0: null, off: 0, tasti: false, t: 0 }),
    dir(B, sx, sy, yaw, tasti, dt) {
      if (!sx && !sy) { B.a = null; B.off = 0; B.t = 0; return null; }
      const a = Math.atan2(sx, sy);
      if (B.a === null || !!tasti !== B.tasti || (tasti && Math.abs(ang(a - B.a)) > 1e-3)) { B.off = 0; B.t = 0; B.a0 = a; }   // si parte (o si cambia tasto): la camera di adesso
      else { if (!tasti) { const d = Math.abs(ang(a - B.a)); B.off = Math.sign(B.off) * Math.max(0, Math.abs(B.off) - d); }   // la levetta girata: la base torna alla camera di tanto
        if (Math.abs(ang(a - B.a0)) > K8.giroLev) { B.t = 0; B.a0 = a; } else B.t += dt > 0 ? dt : 0; }   // da quanto si tiene la via (il ricentro: K8.recentHold)
      B.a = a; B.tasti = !!tasti; B.yaw = yaw - B.off;
      const fx = -Math.sin(B.yaw), fz = -Math.cos(B.yaw), rx = -fz, rz = fx;
      return { x: rx * sx + fx * sy, y: rz * sx + fz * sy };
    },
    dopo(B, r) { if (B.a !== null && r && isFinite(r.yawGiro)) B.off = ang(B.off + r.yawGiro); },   // il ricentro ha girato la camera: la direzione tenuta no
    yawUsato: B => B.a !== null ? B.yaw : null,
  };
  return { K, K8, C8, passo, create, vfov, pitchFor, molla, avvio, dietro, ang, comandi8 };
})();
if (typeof window !== 'undefined') window.__CAMERA7 = Camera7.K;
if (typeof module !== 'undefined') module.exports = Camera7;
