/* Porto Vecchio — L'INQUADRATURA IN STRADA (le regole, senza grafica: le usano render.js e strumenti/inquadratura.js, le prova
   test_inquadratura.js). [inquadratura] Il committente: «i tetti sono belli ma in certe zone si vedono solo tetti a schermo, e i palazzi
   coprono troppo le vie». Quando il giocatore è in strada la via deve leggersi; quando è sui tetti si vedono i tetti (qui non si tocca niente).
   Tre leve, che si provano una alla volta o insieme (VARIANTI, scelte con ?inquadratura=; ?vecchiacamera torna alla camera di [visuale5]):
   - L'ASSE: nelle vie strette la visuale si gira lungo l'asse della via (letto dalla rete stradale, W.roads), nel verso più vicino a
     dietro il personaggio: si guarda dentro il vicolo invece che sopra le case di un lato. Il giro è lento, con l'isteresi, e non scatta
     per lo sbocco di un vicolo di lato; nelle piazze e nelle vie larghe la visuale resta dov'è (non torna all'orientamento dell'isola).
   - LA PENDENZA: quella della camera che si adatta (Visuale.camPasso), che con l'asse chiede meno (lungo la via il muro di lato non copre).
   - IL TAGLIO MIRATO: solo le case che coprono davvero il suolo attorno al personaggio (un disco di punti, raggi verso la camera) scendono,
     intere, a un piano: la quota più alta che libera la via, presa sulla linea di un solaio (un metro, poi 3,4 m, poi a ogni piano), con la
     copertina e il filo chiaro del muretto. Le altre case restano intere, coi loro tetti. */
var Inquadratura = (function () {
  'use strict';
  const MANO_TAU = .22;   // s: il ricentro (Visuale.MANO.tau)
  const cl = (v, a, b) => Math.max(a, Math.min(b, v)), ang = a => Math.atan2(Math.sin(a), Math.cos(a));
  // le varianti. camera: la pendenza ('adatta' = Visuale.camPasso con CAMERA4; 'verticale' = più dall'alto nei vicoli; 'fissa' = quella di
  // sempre); tetti: il tetto della casa che copre sbiadisce (Visuale.tetti); asse: la visuale lungo la via; taglio: il taglio mirato;
  // dietro: sul computer la visuale automatica sta dietro alla marcia (come sul telefono) invece che sull'orientamento dell'isola
  const VARIANTI = {
    oggi: { camera: 'adatta', tetti: true },
    asse: { camera: 'adatta', tetti: true, asse: true },
    verticale: { camera: 'verticale', tetti: true },
    taglio: { camera: 'adatta', taglio: true },
    asse_taglio: { camera: 'adatta', asse: true, taglio: true },
  };
  const DIFETTO = 'asse';   // [inquadratura] il taglio mirato confonde (case a quote diverse chiuse da lastre piatte): resta in prova con ?inquadratura=taglio   // la variante del gioco (senza ?inquadratura=)
  // le manopole (window.__INQUADRATURA per le prove dal vivo)
  const K = {
    asseLargo: 6.5,       // m: le vie fino a tanto si guardano lungo l'asse (vicoli 2,5-3, Rua e Marina 5, Vittoria 7 solo dove si stringe)
    asseVicino: 1.6,      // m oltre la mezza larghezza: fin dove il personaggio sta ancora sulla via
    asseMax: 1.75,        // rad (100°): più di tanto la visuale non gira per allinearsi (nel verso più vicino a dietro il personaggio)
    asseBanda: .3,        // rad: il bersaglio cambia solo oltre questo scarto (le curve dolci della Rua non la fanno girare a ogni passo)
    tAsse: .45,           // s sulla stessa via (o fuori) prima che il bersaglio cambi: lo sbocco di un vicolo di lato non la fa girare
    tauAsse: .55,         // s: lo smorzamento del giro (95% in 1,6 s)
    verticale: { stretta: 1.16, max: 1.32, larga: 7, strettaL: 4.2, entra: .5 },   // la variante 'verticale': sopra CAMERA4
    // il taglio mirato
    raggio: 5,            // m: il disco di suolo attorno al personaggio che deve vedersi
    passoD: 1.25,         // m: il passo dei punti del disco
    margine: .25,         // m sotto il primo raggio che entra nella casa
    muretto: 1,           // m sopra la base: la quota più bassa (come il muretto)
    primo: 3.4,           // m sopra la base: il primo solaio, poi ogni `piano`
    piano: 2.4,
    davanti: -1,          // m: la casa sta sul lato camera se il suo centro è davanti al personaggio di tanto (verso la camera)
    vicine: 28,           // m: fin dove si cercano le case
    tieni: .7, alza: .6, salto: .75, apri: .35, chiudi: .55,   // l'isteresi e lo scivolare del piano (Visuale.passo)
  };
  // ---------------- LA RETE: la via e il suo asse in un punto ----------------
  function rete(W) {
    const C = new Map(), cella = (x, z) => Math.floor(x / 8) * 8192 + Math.floor(z / 8);
    (W.roads || []).forEach(r => { if (!r.pts || r.pts.length < 2) return; const w = r.w || 3;
      for (let k = 1; k < r.pts.length; k++) { const a = r.pts[k - 1], b = r.pts[k]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) < .05) continue; const sg = { ax: a[0], az: a[1], bx: b[0], bz: b[1], w, id: r.id, r: w / 2 + K.asseVicino };
        for (let x = Math.min(a[0], b[0]) - sg.r; x <= Math.max(a[0], b[0]) + sg.r + 8; x += 8) for (let z = Math.min(a[1], b[1]) - sg.r; z <= Math.max(a[1], b[1]) + sg.r + 8; z += 8) { const kk = cella(x, z); const L = C.get(kk) || C.set(kk, []).get(kk); if (!L.includes(sg)) L.push(sg); } } });
    // la via che contiene il punto, col suo asse in pianta: quella su cui si è già (pref: chi passa davanti allo sbocco di un vicolo resta
    // sulla sua via), se no la più stretta (entrando da una via in un vicolo è lì che serve guardare lungo)
    function asse(x, z, pref) { let best = null, mia = null;
      for (const s of C.get(cella(x, z)) || []) { const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz, t = cl(((x - s.ax) * dx + (z - s.az) * dz) / l2, 0, 1), d = Math.hypot(s.ax + dx * t - x, s.az + dz * t - z);
        if (d > s.r) continue; const q = { a: Math.atan2(dz, dx), w: s.w, id: s.id, d };
        if (pref && s.id === pref && (!mia || d < mia.d)) mia = q;
        if (!best || s.w < best.w - .1 || (Math.abs(s.w - best.w) <= .1 && d < best.d)) best = q; }
      return mia || best; }
    return { asse };
  }
  // la visuale (yaw di render.js: la camera sta a (sin yaw, cos yaw) dal personaggio) che guarda lungo la direzione a in pianta
  const yawDa = a => Math.atan2(-Math.cos(a), -Math.sin(a));
  // ---------------- LA CAMERA: yaw, pendenza, zoom ----------------
  // S dura fra i fotogrammi; q: x, z, fy (i piedi), dir (la marcia in pianta, atan2(dz, dx); undefined da fermo), vel (m/s), tel (la visuale
  // segue la marcia), yaw0 (la visuale automatica di adesso: l'isola sul computer, la marcia sul telefono), base (la pendenza di sempre),
  // rete, mappa (Visuale.mappa), V (Visuale), v (la variante), ok (in strada: non sul tetto, non al chiuso, non alla guida).
  // Ritorna { dy: lo scarto di yaw da sommare a yaw0, yaw, pitch, zoom, asse }
  function camera(S, q, dt) {
    const v = q.v || VARIANTI.oggi, V = q.V;
    if (S.dy === undefined) Object.assign(S, { dy: 0, dyT: 0, t: 0, via: null, cam4: {} });
    // il ricentro sul computer (q.ricentro: Visuale.mano ha appena deciso di ricentrare): non l'orientamento dell'isola ma dietro al
    // personaggio. render.js passa qui la parte girata a mano (q.assorbi) e la azzera: il giro riparte da dove si guarda, col τ del ricentro
    if (q.assorbi) { S.dy = ang(S.dy + q.assorbi); S.dyT = S.dy; }
    if (q.ricentro && q.dir !== undefined) { S.dyT = ang(yawDa(q.dir) - q.yaw0); S.tau = MANO_TAU; }
    // l'asse
    let dyT = S.dyT;
    if (v.asse && q.ok && !q.tieni) { const a = q.rete.asse(q.x, q.z, S.via), via = a && a.w <= K.asseLargo ? a.id : null;
      if (via !== S.via) { S.t += dt; if (S.t >= K.tAsse) { S.via = via; S.t = 0; } } else S.t = 0;
      if (S.via && a && a.id === S.via) {   // sulla via: i due versi dell'asse, quello più vicino a dietro la marcia (o alla visuale di adesso)
        const rif = q.dir !== undefined && q.vel > .6 ? yawDa(q.dir) : q.yaw0 + S.dy; let best = null;
        for (const y of [yawDa(a.a), yawDa(a.a + Math.PI)]) { const d = Math.abs(ang(y - rif)); if (!best || d < best.d) best = { y, d }; }
        const t = ang(best.y - q.yaw0); if (Math.abs(ang(best.y - rif)) <= K.asseMax && Math.abs(ang(t - S.dyT)) > K.asseBanda) { dyT = t; S.tau = 0; } } }   // nelle piazze e nelle vie larghe la visuale resta dov'è
    else if (!v.asse && !q.ok) S.via = null;
    if (!q.ok || q.tieni) S.via = q.ok ? S.via : null;
    S.dyT = dyT; const ka = 1 - Math.exp(-dt / (S.tau || K.tauAsse)); S.dy += ang(S.dyT - S.dy) * ka; S.dy = ang(S.dy);
    if (S.tau && Math.abs(ang(S.dyT - S.dy)) < 1e-3) S.tau = 0;
    const yaw = q.yaw0 + S.dy;
    // la pendenza
    let pitch = q.base, zoom = 1;
    if (v.camera !== 'fissa') { const KC = Object.assign({}, V.CAMERA4, { base: q.base }, v.camera === 'verticale' ? K.verticale : {});
      const m = q.ok ? V.misura(q.mappa, q.x, q.z, q.fy, Math.sin(yaw), Math.cos(yaw), KC) : null; V.camPasso(S.cam4, m, dt, KC, yaw); pitch = S.cam4.p; zoom = S.cam4.z; }
    return { dy: S.dy, yaw, pitch, zoom, asse: S.via };
  }
  // ---------------- IL TAGLIO MIRATO ----------------
  // le case da abbassare e la loro quota: Map(casa -> { y, top }). case_: i record con box3 ({ min, max }) e geo.y0 (la base), come
  // dyn.buildings; cam: la posizione della camera. Solo le case sul lato camera che coprono un punto del disco di suolo attorno al
  // personaggio (o il suo corpo); la quota è la linea di solaio più alta sotto il primo raggio che vi entra
  function tagli(px, pz, fy, cam, case_, V, on, out) {
    out = out || new Map(); out.clear(); if (!on) return out;
    const P = [], R = K.raggio, st = K.passoD;
    for (let a = -R; a <= R + 1e-6; a += st) for (let b = -R; b <= R + 1e-6; b += st) if (a * a + b * b <= R * R) P.push({ x: px + a, y: fy + .1, z: pz + b });
    P.push({ x: px, y: fy + .9, z: pz }, { x: px, y: fy + 1.7, z: pz });
    const dx = cam.x - px, dz = cam.z - pz, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const D = P.map(p => { const ex = cam.x - p.x, ey = cam.y - p.y, ez = cam.z - p.z, ll = Math.hypot(ex, ey, ez) || 1; return { x: ex / ll, y: ey / ll, z: ez / ll }; });
    const o0 = { x: px, y: fy + .1, z: pz }, l0 = Math.hypot(cam.x - px, cam.y - o0.y, cam.z - pz) || 1, d0 = { x: (cam.x - px) / l0, y: (cam.y - o0.y) / l0, z: (cam.z - pz) / l0 }, E = R + 2, bb = { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    for (const B of case_) { const b3 = B.box3; if (!b3 || b3.max.y < fy + 1.5) continue;
      const cx = (b3.min.x + b3.max.x) / 2 - px, cz = (b3.min.z + b3.max.z) / 2 - pz; if (cx * cx + cz * cz > K.vicine * K.vicine) continue;
      // lo scarto veloce: il raggio dal centro del disco verso la camera manca la casa allargata del raggio del disco (più lo scarto delle direzioni)
      bb.min.x = b3.min.x - E; bb.min.y = b3.min.y - E; bb.min.z = b3.min.z - E; bb.max.x = b3.max.x + E; bb.max.y = b3.max.y + E; bb.max.z = b3.max.z + E; if (V.entra(o0, d0, bb) === null) continue;
      if (cx * ux + cz * uz < K.davanti) continue;   // dietro il personaggio: non copre
      if (px > b3.min.x && px < b3.max.x && pz > b3.min.z && pz < b3.max.z) continue;   // ci sta sotto (androne, sottopasso)
      let need = Infinity; for (let i = 0; i < P.length; i++) { const y = V.entra(P[i], D[i], b3); if (y !== null && y < need) need = y; }
      if (need === Infinity) continue;
      const base = B.geo && B.geo.y0 !== undefined ? B.geo.y0 : b3.min.y, gr = B.gr !== undefined ? B.gr : B.b && B.b.__top !== undefined ? B.b.__top : b3.max.y - 2.5;
      const lim = need - K.margine; let y = base + K.muretto;
      for (let h = base + K.primo; h <= Math.min(lim, gr); h += K.piano) y = h;
      if (lim >= gr) y = gr;   // basta togliere il tetto: la casa resta coi suoi muri fino alla gronda
      out.set(B, { y, top: b3.max.y }); }
    return out;
  }
  // un fotogramma della variante: la camera (sopra) e, se la variante taglia o sbiadisce, le case. Per gli strumenti (render.js fa i due
  // passi a parte, con la camera vera). q come camera() più dist (la distanza della camera a zoom 1), vicine(R) (le case attorno).
  // Ritorna anche tagli: Map(casa -> quota disegnata) delle case abbassate o col tetto via (sbiadito oltre metà)
  function passo(S, q, dt) {
    const v = q.v || (q.K && typeof q.K === 'object' ? q.K : VARIANTI.oggi), V = q.V; q.v = v; if (q.ok === undefined) q.ok = true;
    const y0 = q.tel && q.dir !== undefined ? yawDa(q.dir) : q.yaw0;
    S.y0 = S.y0 === undefined ? y0 : S.y0 + ang(y0 - S.y0) * (1 - Math.exp(-dt * 3.2));   // sul telefono la visuale segue la marcia (render.js [camera3])
    const c = camera(S, Object.assign({}, q, { yaw0: S.y0 }), dt), d = (q.dist || 59) * c.zoom, cp = Math.cos(c.pitch);
    const cam = { x: q.x + Math.sin(c.yaw) * cp * d, y: q.fy + Math.sin(c.pitch) * d, z: q.z + Math.cos(c.yaw) * cp * d };
    const out = new Map(), vic = q.vicine ? q.vicine(32) : [];
    if (v.tetti) { S.tetti = S.tetti || new Map(); const vu = V.tetti(q.x, q.z, q.fy, cam, vic, V.TETTO4, !q.ok); V.passo(S.tetti, vu, dt, V.TETTO4);
      S.tetti.forEach((s, B) => { if (V.sbiadito(s) > .5) out.set(B, B.gr !== undefined ? B.gr : B.box3.max.y - 2.5); }); }
    if (v.taglio) { S.tagli = S.tagli || new Map(); const vu = tagli(q.x, q.z, q.fy, cam, vic, V, q.ok); V.passo(S.tagli, vu, dt, K);
      S.tagli.forEach((s, B) => { const y = V.quota(s); if (s.a > .5) out.set(B, Math.min(out.has(B) ? out.get(B) : Infinity, y)); }); }
    return { yaw: c.yaw, pitch: c.pitch, zoom: c.zoom, tagli: out, cam, largo: c.asse };
  }
  const api = { VARIANTI, DIFETTO, K, rete, yawDa, camera, tagli, passo };
  if (typeof window !== 'undefined') window.__INQUADRATURA = K;
  return api;
})();
if (typeof module !== 'undefined') module.exports = Inquadratura;
