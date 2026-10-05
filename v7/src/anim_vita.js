/* [animazioni] VITA QUOTIDIANA: pose e mappe di abitanti e protagonista (in lavorazione) */
(function () {
  'use strict';
  if (typeof Anim === 'undefined' || typeof THREE === 'undefined') return;
  const PI = Math.PI, clamp = Anim.clamp, smooth = Anim.smooth;

  // ---------------- piccoli strumenti (niente allocazioni per fotogramma) ----------------
  const _d = [0, 0, 0];
  const D = (x, y, z) => { _d[0] = x; _d[1] = y; _d[2] = z; return _d; };
  // ossa per lato: s = +1 sinistra (asse +x del personaggio), -1 destra
  const SIDE = {
    L: { s: 1, ua: 'UpperArmL', la: 'LowerArmL', wr: 'WristL', sh: 'ShoulderL', ul: 'UpperLegL', ll: 'LowerLegL', ft: 'FootL' },
    R: { s: -1, ua: 'UpperArmR', la: 'LowerArmR', wr: 'WristR', sh: 'ShoulderR', ul: 'UpperLegR', ll: 'LowerLegR', ft: 'FootR' },
  };
  // braccio: direzioni con x «verso l'esterno» (positivo = lontano dal corpo, dal lato del braccio)
  // con i vestiti spessi (P.bulk, metri) gomito e mano si scostano dal busto: niente maniche dentro il cappotto
  function arm(P, side, ux, uy, uz, lx, ly, lz, w) { const S = SIDE[side], b = P.bulk || 0; P.aim(S.ua, D((ux + b * 3.2) * S.s, uy, uz + b * 1.5), w); P.aim(S.la, D((lx + b * 1.6) * S.s, ly, lz + b * 2.5), w); }
  // ---- gambe: nello scheletro del kit i piedi NON sono figli degli stinchi (sono bersagli IK figli di Root).
  // P.aim('LowerLeg…') punterebbe verso un piede che non si muove con la gamba: qui si fa un IK a due ossa vero,
  // si punta l'asse Y delle ossa (che corre lungo l'osso) e si porta il piede in fondo allo stinco.
  const _H = new THREE.Vector3(), _K = new THREE.Vector3(), _T = new THREE.Vector3(), _U = new THREE.Vector3(), _N = new THREE.Vector3(), _Y = new THREE.Vector3();
  const _q0 = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _qI = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _e = new THREE.Euler();
  // ruota l'osso perché il suo asse Y (nel mondo) vada verso dir (vettore del mondo, normalizzato)
  function aimW(bone, dir, ww) {
    bone.getWorldQuaternion(_q0); _Y.set(0, 1, 0).applyQuaternion(_q0);
    _q1.setFromUnitVectors(_Y, dir); if (ww < 1) _q1.slerpQuaternions(_qI, _q1, ww);
    _q1.multiply(_q0);
    if (bone.parent) { bone.parent.getWorldQuaternion(_qp); _q1.premultiply(_qp.invert()); }
    bone.quaternion.copy(_q1); bone.updateMatrixWorld(true);
  }
  // piede (fx,fy,fz) nello spazio del personaggio (x verso l'esterno, PRIMA dello spostamento di P.body), ginocchio verso (kx,ky,kz)
  // pitch: punta del piede in su (radianti); yaw: punta verso l'esterno
  function legTo(P, side, fx, fy, fz, kx, ky, kz, pitch, yaw, w) {
    const S = SIDE[side], R = P.R, ul = R.b[S.ul], ll = R.b[S.ll], ft = R.b[S.ft]; if (!ul || !ll || !ft) return;
    const ww = (w === undefined ? 1 : w) * P.w; if (ww <= 0) return;
    if (!R.shin) { ll.getWorldPosition(_K); ft.getWorldPosition(_T); R.shin = _K.distanceTo(_T) || .45; }
    ul.getWorldPosition(_H); ll.getWorldPosition(_K);
    const a = _H.distanceTo(_K), b = R.shin;
    _T.set(fx * S.s, fy, fz); P.g.localToWorld(_T);
    _U.subVectors(_T, _H); let d = _U.length(); if (d < 1e-5) return; _U.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, a + b - .002);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _N.set(kx * S.s, ky, kz).applyQuaternion(P._gq); _N.addScaledVector(_U, -_N.dot(_U)); if (_N.lengthSq() < 1e-8) _N.set(0, 0, 1).applyQuaternion(P._gq); _N.normalize();
    _K.copy(_H).addScaledVector(_U, x).addScaledVector(_N, h);           // il ginocchio
    _T.copy(_H).addScaledVector(_U, d);                                  // la caviglia (raggiungibile)
    _N.subVectors(_K, _H).normalize(); aimW(ul, _N, ww);
    ll.getWorldPosition(_K); _N.subVectors(_T, _K).normalize(); aimW(ll, _N, ww);
    // il piede: in fondo allo stinco, piatto e in avanti (asse Y del piede = avanti, Z = giù)
    _T.copy(_K).addScaledVector(_N, b);
    ft.getWorldPosition(_K); _K.lerp(_T, ww); ft.parent.worldToLocal(_K); ft.position.copy(_K);
    _q1.setFromEuler(_e.set(PI / 2 - (pitch || 0), (yaw || 0) * S.s, 0, 'YXZ')); _q1.premultiply(P._gq);
    ft.getWorldQuaternion(_q0); _q0.slerp(_q1, ww);
    ft.parent.getWorldQuaternion(_qp); _q0.premultiply(_qp.invert()); ft.quaternion.copy(_q0); ft.updateMatrixWorld(true);
  }
  const QHAND = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI);   // mano → osso del polso
  // mano in un punto (x verso l'esterno, y, z nello spazio del personaggio), gomito verso il polo (x esterno, y, z): IK a due ossa
  const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _M = new THREE.Matrix4();
  function handTo(P, side, hx, hy, hz, px, py, pz, w) {
    const S = SIDE[side], R = P.R, ua = R.b[S.ua], la = R.b[S.la], wr = R.b[S.wr]; if (!ua || !la || !wr) return;
    const b0 = P.bulk || 0; hx += b0 * .8; hz += b0 * .8;
    _M.copy(P.g.matrixWorld).invert();
    ua.getWorldPosition(_S).applyMatrix4(_M); la.getWorldPosition(_E).applyMatrix4(_M); wr.getWorldPosition(_W).applyMatrix4(_M);
    const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
    _T.set(hx * S.s, hy, hz); _U.subVectors(_T, _S); let d = _U.length(); if (d < 1e-4) return; _U.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, (a + b) * .998);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _N.set(px * S.s, py, pz); _N.addScaledVector(_U, -_N.dot(_U)); if (_N.lengthSq() < 1e-8) _N.set(S.s, -1, 0); _N.normalize();
    _E.copy(_S).addScaledVector(_U, x).addScaledVector(_N, h);
    _K.subVectors(_E, _S); P.aim(S.ua, D(_K.x, _K.y, _K.z), w);
    _K.copy(_S).addScaledVector(_U, d).sub(_E); P.aim(S.la, D(_K.x, _K.y, _K.z), w);
  }
  // presa: gira il polso perché la punta dell'attrezzo (-X del sistema della mano: lama, testa, cima della canna, ugello)
  // guardi nella direzione data (spazio del personaggio, x verso l'esterno). Senza, l'orientamento lo decide la clip.
  const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _qg = new THREE.Quaternion(), _qh = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
  function grip(P, side, dx, dy, dz, w) {
    const S = SIDE[side], wr = P.R.b[S.wr]; if (!wr || !wr.parent) return;
    const ww = (w === undefined ? 1 : w) * P.w; if (ww <= 0) return;
    wr.getWorldQuaternion(_qg); _qh.copy(_qg).multiply(QHAND); _A.set(-1, 0, 0).applyQuaternion(_qh);
    _B.set(dx * S.s, dy, dz).normalize().applyQuaternion(P._gq);
    _q3.setFromUnitVectors(_A, _B); _qh.identity().slerp(_q3, ww); _qg.premultiply(_qh);
    wr.parent.getWorldQuaternion(_qp); wr.quaternion.copy(_qp.invert().multiply(_qg)); wr.updateMatrixWorld(true);
  }
  // la seconda mano sul manico: punto a «dist» metri dal pugno destro verso la punta dell'attrezzo (dopo grip)
  function secondHand(P, dist, px, py, pz) {
    const wr = P.R.b.WristR; if (!wr) return;
    wr.getWorldQuaternion(_qg); _qh.copy(_qg).multiply(QHAND); _A.set(-1, 0, 0).applyQuaternion(_qh);
    wr.getWorldPosition(_B); _B.addScaledVector(_A, dist); _M.copy(P.g.matrixWorld).invert(); _B.applyMatrix4(_M);
    handTo(P, 'L', _B.x, _B.y, _B.z, px, py, pz);   // x già nel verso della sinistra (+x)
  }
  // ciclo 0-1 di periodo T secondi, sfasato per persona
  const cyc = (P, T) => ((P.t + P.r * T * 7.13) / T) % 1;
  // un impulso 0→1→0 dentro il ciclo: sale in [a,b], resta fino a c, scende entro d
  function pulse(k, a, b, c, d) { return k < a ? 0 : k < b ? smooth((k - a) / (b - a)) : k < c ? 1 : k < d ? 1 - smooth((k - c) / (d - c)) : 0; }
  const lerp = (a, b, k) => a + (b - a) * k;
  // variante fissa per persona: 0..n-1
  const fract = x => x - Math.floor(x);
  const pickR = (P, n, salt) => Math.floor(fract(Math.sin((P.r + (salt || 0) * .618) * 127.1) * 43758.5453) * n) % n;

  // ---------------- ATTREZZI: agganciati alla mano in un sistema fisso della mano ----------------
  // Sistema della mano (metri): Y lungo le dita, Z fuori dal palmo, X verso il pollice (mano destra) / verso il mignolo (sinistra).
  // Così l'attrezzo segue la mano qualunque sia la posa in cui nasce (non dipende dal momento in cui compare).
  // where: 'R' / 'L' (polso), 'body' (il corpo: spazio del personaggio, segue sedersi/sdraiarsi), 'g' (a terra, spazio del personaggio)
  const VP = {};
  const LM = {}, GEO = {};
  const lm = (c, e) => { const k = c + (e || ''); return LM[k] || (LM[k] = new THREE.MeshLambertMaterial(e ? { color: c, emissive: e } : { color: c })); };
  const bg = (w, h, d) => { const k = 'b' + w + '_' + h + '_' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); };
  const cg = (rt, rb, h, s) => { const k = 'c' + rt + '_' + rb + '_' + h + '_' + (s || 8); return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, s || 8)); };
  function box(g, w, h, d, c, x, y, z, rx, ry, rz, e) { const m = new THREE.Mesh(bg(w, h, d), lm(c, e)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
  function cyl(g, rt, rb, h, c, x, y, z, rx, ry, rz, s, e) { const m = new THREE.Mesh(cg(rt, rb, h, s), lm(c, e)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
  function vprop(name, where, make) { VP[name] = { where, make }; }
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _qa = new THREE.Quaternion();
  function makeVP(P, name) {
    const Dp = VP[name]; if (!Dp) return null;
    const g = P.g, u = g.userData, R = P.R, holder = new THREE.Group(), obj = Dp.make();
    holder.add(obj);
    if (Dp.where === 'R' || Dp.where === 'L') {
      const bone = R.b[SIDE[Dp.where].wr]; if (!bone) return null;
      bone.getWorldScale(_v); g.getWorldScale(_v2);
      const k = _v2.x / (_v.x || 1);
      holder.scale.setScalar(k); holder.quaternion.copy(QHAND); bone.add(holder);
    } else if (Dp.where === 'body' && u.body) {
      const s = u.body.scale; holder.scale.set(1 / s.x, 1 / s.y, 1 / s.z); u.body.add(holder);
    } else g.add(holder);
    holder.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    holder.visible = false; return holder;
  }
  // accende l'attrezzo per questo fotogramma (si spegne da solo quando la posa non lo chiede più)
  function show(P, name) {
    if (P.w < .5) return null;
    const m = P.R.vp || (P.R.vp = {});
    let h = m[name]; if (h === undefined) h = m[name] = makeVP(P, name);
    if (h) h.visible = true; return h;
  }
  // l'attrezzo che il modello mostra da sé (models.js: bomboletta, telefono, fotocamera, piede, gesso; la pala del kit) si nasconde
  function hideHeld(P) {
    if (P.w < .5) return; const u = P.g.userData, h = P.o && P.o.held;
    if (h && u.props && u.props[h]) u.props[h].visible = false;
    if (u.mguns && u.mguns.Shovel && h === 'pala') u.mguns.Shovel.visible = false;
  }
  // il respiro del motore, più la pulizia degli attrezzi: ogni fotogramma si spengono, le pose li riaccendono
  const VITA0 = Anim.POSES.vita;
  if (VITA0 && !VITA0.__vp) Anim.def('vita', { fade: VITA0.fade, __vp: true, fn(P, A) { const m = P.R.vp; if (m) for (const k in m) if (m[k]) m[k].visible = false; VITA0.fn(P, A); } });

  // ---------------- gli attrezzi ----------------
  // impugnatura: nel pugno l'asse degli oggetti lunghi corre lungo X (dal pollice al mignolo), a ~8 cm lungo le dita e 3 cm verso il palmo
  const GY = .075, GZ = .03;
  vprop('sigaretta', 'R', () => { const g = new THREE.Group(); cyl(g, .005, .005, .07, '#f4f0e6', 0, .1, .01, 0, 0, PI / 2, 5); cyl(g, .0055, .0055, .012, '#ff5a1a', -.04, .1, .01, 0, 0, PI / 2, 5, '#a02000'); return g; });
  vprop('bicchiere', 'R', () => { const g = new THREE.Group(); cyl(g, .035, .028, .1, '#c8dce0', 0, GY, GZ + .01, 0, 0, PI / 2, 8); cyl(g, .031, .027, .06, '#8a1a2a', -.015, GY, GZ + .01, 0, 0, PI / 2, 8); return g; });
  vprop('bottiglia', 'R', () => { const g = new THREE.Group(); cyl(g, .035, .035, .2, '#2e5a2a', -.03, GY, GZ, 0, 0, PI / 2, 8); cyl(g, .012, .03, .08, '#2e5a2a', -.17, GY, GZ, 0, 0, PI / 2, 6); return g; });
  vprop('panino', 'R', () => { const g = new THREE.Group(); box(g, .13, .045, .07, '#d8a860', -.02, GY + .02, GZ + .02); box(g, .135, .012, .072, '#c84a3a', -.02, GY + .02, GZ + .02); return g; });
  // telefono: la cornetta a filo del bar o il radiotelefono anni '80 (con l'antenna)
  vprop('cornetta', 'R', () => { const g = new THREE.Group(); box(g, .045, .19, .04, '#1a1a1e', 0, GY + .01, GZ + .01); box(g, .055, .05, .05, '#1a1a1e', 0, GY + .1, GZ + .025); box(g, .055, .05, .05, '#1a1a1e', 0, GY - .08, GZ + .025); return g; });
  vprop('giornale', 'R', () => { const g = new THREE.Group(); box(g, .4, .3, .01, '#e8e2cf', .17, GY + .08, GZ + .02); box(g, .3, .02, .011, '#3a3a3a', .17, GY + .18, GZ + .02); box(g, .12, .1, .011, '#8a8a8a', .08, GY + .06, GZ + .02); return g; });
  vprop('libro', 'R', () => { const g = new THREE.Group(); box(g, .15, .21, .02, '#7a2a24', .05, GY + .02, GZ + .02); box(g, .14, .2, .022, '#f0e8d4', .055, GY + .02, GZ + .02); return g; });
  vprop('carte', 'L', () => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) box(g, .055, .085, .002, i % 2 ? '#f4f0e6' : '#ece4d0', 0, GY + .03, GZ + .01 + i * .002, 0, 0, (i - 2) * .22); return g; });
  vprop('soldi', 'R', () => { const g = new THREE.Group(); box(g, .12, .06, .004, '#9ab08a', 0, GY + .04, GZ + .01); return g; });
  vprop('cero', 'R', () => { const g = new THREE.Group(); cyl(g, .012, .012, .22, '#f4ecd8', 0, GY, GZ, 0, 0, PI / 2, 6); cyl(g, .0, .008, .03, '#ffc040', -.125, GY, GZ, 0, 0, PI / 2, 5, '#ff9020'); return g; });
  vprop('martello', 'R', () => { const g = new THREE.Group(); cyl(g, .014, .014, .3, '#8a6a42', -.08, GY, GZ, 0, 0, PI / 2, 6); box(g, .04, .04, .12, '#4a4a50', -.22, GY, GZ); return g; });
  vprop('cassa', 'R', () => { const g = new THREE.Group(); box(g, .3, .26, .42, '#9a7a4a', .18, GY + .06, GZ + .1); box(g, .31, .03, .43, '#7a5a32', .18, GY + .12, GZ + .1); return g; });
  // attrezzi lunghi: asse lungo X, il pugno destro a metà; la sinistra va più in là sul manico
  vprop('pala', 'R', () => { const g = new THREE.Group(); cyl(g, .016, .016, 1.1, '#8a6a42', .05, GY, GZ, 0, 0, PI / 2, 6); box(g, .26, .2, .02, '#5a5a60', -.55, GY, GZ, 0, 0, 0); return g; });
  vprop('zappa', 'R', () => { const g = new THREE.Group(); cyl(g, .016, .016, 1.15, '#8a6a42', .1, GY, GZ, 0, 0, PI / 2, 6); box(g, .03, .2, .16, '#4a4a50', -.48, GY - .08, GZ); return g; });
  vprop('piccone', 'R', () => { const g = new THREE.Group(); cyl(g, .018, .018, .9, '#8a6a42', .05, GY, GZ, 0, 0, PI / 2, 6); box(g, .04, .55, .04, '#4a4a50', -.38, GY, GZ, 0, 0, 0); return g; });
  vprop('scopa', 'R', () => { const g = new THREE.Group(); cyl(g, .014, .014, 1.2, '#b08a52', .1, GY, GZ, 0, 0, PI / 2, 6); box(g, .12, .3, .06, '#c8a050', -.55, GY, GZ, 0, 0, 0); return g; });
  vprop('canna', 'R', () => { const g = new THREE.Group(); cyl(g, .006, .014, 2.4, '#4a3a2a', -1.0, GY, GZ, 0, 0, PI / 2, 5); cyl(g, .03, .03, .04, '#2a2a2a', .1, GY, GZ + .04, 0, 0, 0, 8); return g; });
  vprop('piede', 'R', () => { const g = new THREE.Group(); cyl(g, .013, .013, .6, '#3a3a44', -.2, GY, GZ, 0, 0, PI / 2, 6); box(g, .08, .02, .025, '#3a3a44', -.52, GY + .03, GZ, 0, 0, .9); return g; });
  vprop('bomboletta', 'R', () => { const g = new THREE.Group(); cyl(g, .032, .032, .17, '#c8302a', .0, GY, GZ, 0, 0, PI / 2, 8); cyl(g, .01, .01, .02, '#e8e8e8', -.095, GY, GZ, 0, 0, PI / 2, 5); return g; });
  vprop('gesso', 'R', () => { const g = new THREE.Group(); box(g, .02, .07, .02, '#f4f4ee', -.01, GY + .06, GZ - .01); return g; });
  vprop('pennello', 'R', () => { const g = new THREE.Group(); cyl(g, .01, .01, .25, '#b08a52', -.08, GY, GZ, 0, 0, PI / 2, 5); box(g, .06, .05, .02, '#c03028', -.22, GY, GZ); return g; });
  vprop('fotocamera', 'R', () => { const g = new THREE.Group(); box(g, .13, .08, .06, '#202024', .04, GY, GZ + .03); cyl(g, .025, .025, .05, '#101012', .04, GY, GZ + .08, PI / 2, 0, 0, 8); return g; });
  vprop('album', 'L', () => { const g = new THREE.Group(); box(g, .3, .22, .015, '#f2ead8', -.08, GY + .04, GZ + .02); return g; });
  // la carriola: a terra davanti, segue chi la spinge
  // stanghe dalle mani (z .2, y .72) alla ruota; vasca davanti; due piedini dietro la vasca
  vprop('carriola', 'g', () => { const g = new THREE.Group(); box(g, .56, .26, .66, '#5a6a72', 0, .55, .98, .06); box(g, .5, .04, .6, '#3e4a50', 0, .69, .98, .06); cyl(g, .17, .17, .07, '#1a1a1a', 0, .17, 1.42, 0, 0, PI / 2, 12); cyl(g, .05, .05, .09, '#8a8a90', 0, .17, 1.42, 0, 0, PI / 2, 8);
    box(g, .035, .035, 1.25, '#6a5030', .22, .5, .82, .3); box(g, .035, .035, 1.25, '#6a5030', -.22, .5, .82, .3); box(g, .03, .32, .03, '#3a3a3a', .2, .3, .78); box(g, .03, .32, .03, '#3a3a3a', -.2, .3, .78); return g; });

  // ================= LE POSE =================
  const FULL = { base: 'Idle', fade: .4 };
  const def = (name, spec, fn) => Anim.def(name, Object.assign({}, spec, { fn }));

  // ---- SEDUTO (panchina, sedia): varianti per persona: composto, gambe accavallate, gomiti sulle ginocchia ----
  // il sedile è a ~45 cm: il corpo scende di 40 cm, i piedi restano a terra (y = 0,43 prima dello spostamento)
  const SEAT = .4, GF = .025;
  function seated(P, v) {
    P.body({ y: -SEAT });
    if (v === 2) { // gomiti sulle ginocchia, curvo in avanti
      legTo(P, 'L', .16, SEAT + GF, .46, .2, .3, 1); legTo(P, 'R', .16, SEAT + GF, .46, .2, .3, 1);
      P.rot('Abdomen', .38, 0, 0); P.rot('Chest', .18, 0, 0);
      arm(P, 'L', .05, -.8, .55, -.35, .05, 1); arm(P, 'R', .05, -.8, .55, -.35, .05, 1);
      P.rot('Head', -.3, 0, 0);
    } else if (v === 1) { // gambe accavallate, la destra sopra
      P.rot('Abdomen', -.06, 0, 0);
      legTo(P, 'L', .12, SEAT + GF, .5, .1, .3, 1); legTo(P, 'R', -.06, SEAT + .14, .56, -.1, 1, .5, -.3);
      arm(P, 'L', .15, -.9, .35, -.15, -.6, .75); arm(P, 'R', .15, -.9, .35, -.1, -.6, .75);
    } else { // composto, mani sulle cosce
      legTo(P, 'L', .13, SEAT + GF, .5, .1, .3, 1); legTo(P, 'R', .13, SEAT + GF, .5, .1, .3, 1);
      arm(P, 'L', .12, -.9, .35, -.05, -.65, .75); arm(P, 'R', .12, -.9, .35, -.05, -.65, .75);
    }
  }
  def('siede', FULL, (P) => seated(P, pickR(P, 3, 1)));

  // ---- SEDUTO A TERRA: ginocchia su e braccia attorno, oppure gambe stese e mani dietro ----
  const FLOOR = .74;
  def('siede_terra', FULL, (P) => {
    const v = pickR(P, 2, 2);
    P.body({ y: -FLOOR });
    if (v === 0) {
      legTo(P, 'L', .14, FLOOR + GF, .42, .1, 1, .3); legTo(P, 'R', .14, FLOOR + GF, .42, .1, 1, .3);
      P.rot('Abdomen', .32, 0, 0);
      arm(P, 'L', .15, -.6, .75, -.75, -.25, .55); arm(P, 'R', .15, -.6, .75, -.75, -.3, .55);
    } else {
      legTo(P, 'L', .13, FLOOR + .06, .8, 0, 1, 0, .2); legTo(P, 'R', .2, FLOOR + .1, .72, .2, 1, 0, .1, .3);
      P.rot('Abdomen', -.25, 0, 0);
      arm(P, 'L', .25, -.7, -.65, .2, -.8, -.4); arm(P, 'R', .25, -.7, -.65, .2, -.8, -.4);
    }
  });

  // ---- DORME: sdraiato sulla schiena, un braccio sotto la testa; il petto si alza piano ----
  def('dorme', { base: 'Idle', fade: .6 }, (P) => {
    const v = pickR(P, 2, 3);
    // sdraiato sulla schiena: la testa verso -z, i piedi verso +z (i piedi del kit stanno sotto Root e seguono il corpo)
    P.body({ rx: -PI / 2, y: .14, z: .9 });
    // ATTENZIONE: la rotazione del corpo si applica dopo la posa: le braccia si scrivono come se stesse in piedi
    arm(P, 'L', .25, -1, -.15, .05, -1, .2);                        // lungo il fianco, la mano sulla pancia
    if (v) arm(P, 'R', .45, .9, -.1, -.9, .3, -.2); else arm(P, 'R', .25, -1, -.15, -.25, -.9, .45);   // sotto la testa, o sulla pancia
    P.rot('Chest', -.04 * (1 + Math.sin(P.t * 1.4 + P.r * 6)), 0, 0);
    P.rot('Head', 0, (P.r - .5) * .8, 0);
  });

  // ---- FUMA (braccia, sopra la camminata): boccata ogni 6-9 secondi ----
  def('fuma', { fade: .3 }, (P) => {
    const T = 6 + P.r * 3, k = cyc(P, T), up = pulse(k, .0, .12, .3, .42);
    // a riposo: avambraccio piegato davanti alla vita; boccata: mano alla bocca
    arm(P, 'R', lerp(.2, .25, up), lerp(-.9, -.4, up), lerp(.15, .6, up), lerp(-.25, -.55, up), lerp(.3, .8, up), lerp(.9, .2, up));
    if (up > .6) P.rot('Head', -.12 * up, 0, 0);
    show(P, 'sigaretta');
  });

  // ---- BRACCIA CONSERTE ----
  def('braccia', { fade: .35 }, (P) => {
    arm(P, 'R', .25, -.85, .35, -.95, .2, .3); arm(P, 'L', .25, -.85, .3, -.95, .05, .35);
  });

  // ---- MANI IN TASCA ----
  def('tasche', { fade: .35 }, (P) => {
    arm(P, 'R', .2, -.95, -.12, -.15, -.9, .35); arm(P, 'L', .2, -.95, -.12, -.15, -.9, .35);
    P.rot('Chest', .04, 0, 0);
  });

  // ---- PARLA: gesti alternati delle mani, cenni di testa (si somma alle altre pose) ----
  def('parla', { fade: .3 }, (P, A) => {
    const busy = A && (A.upper || (A.act && BUSY[A.act]));
    const r = P.r, T = 1.6 + r * 1.4, k = cyc(P, T), hand = Math.floor((P.t + r * 9) / T) % 3;
    P.rot('Head', .07 * Math.sin(P.t * (3 + r * 2)), .1 * Math.sin(P.t * .7 + r * 5), 0);
    if (busy) return;
    const g = Math.sin(k * PI), wob = Math.sin(P.t * 5 + r * 3) * .12;
    if (hand !== 1) arm(P, 'R', .25, -.85, .35, -.15 + wob, .25 + g * .4, .9, .55 + g * .45);
    if (hand !== 0) arm(P, 'L', .25, -.85, .35, -.15 - wob, .2 + g * .35, .9, .5 + g * .4);
  });
  const BUSY = {};   // pose con le mani occupate: chi parla mentre le fa muove solo la testa

  // ================= BRACCIA (sopra la camminata o sopra una posa di tutto il corpo) =================
  // ---- BEVE: bicchiere (o bottiglia) all'altezza della pancia, un sorso ogni 5-8 secondi ----
  function sip(P, prop) {
    const T = 5 + P.r * 3, k = cyc(P, T), up = pulse(k, 0, .15, .32, .45);
    arm(P, 'R', lerp(.2, .2, up), lerp(-.9, -.35, up), lerp(.25, .6, up), lerp(-.2, -.45, up), lerp(.35, .85, up), lerp(.9, .25, up));
    if (up > .5) P.rot('Head', -.25 * up, 0, 0);
    show(P, prop);
  }
  def('beve', { fade: .3 }, (P) => sip(P, 'bicchiere'));
  def('bottiglia', { fade: .3 }, (P) => sip(P, 'bottiglia'));
  // ---- MANGIA: panino in mano, morsi ----
  def('mangia', { fade: .3 }, (P) => {
    const T = 3.2 + P.r * 1.5, k = cyc(P, T), up = pulse(k, 0, .2, .35, .55);
    arm(P, 'R', .18, lerp(-.85, -.4, up), lerp(.3, .55, up), lerp(-.25, -.45, up), lerp(.4, .85, up), lerp(.85, .2, up));
    arm(P, 'L', .2, -.9, .25, .1, -.2, .95);
    P.rot('Head', .08 - .15 * up, 0, 0); show(P, 'panino');
  });
  // ---- TELEFONA: cornetta all'orecchio, l'altra mano gesticola o in tasca ----
  def('telefona', { fade: .3 }, (P) => {
    arm(P, 'R', .5, -.35, .25, -.45, .9, -.1);
    if (P.r > .5) arm(P, 'L', .2, -.95, -.12, -.15, -.9, .35); else arm(P, 'L', .25, -.85, .35, -.2, .2 + .2 * P.wave(.5), .95);
    P.rot('Head', .05, 0, -.18); show(P, 'cornetta');
  });
  // ---- LEGGE: giornale (o libro) aperto davanti, testa china; ogni tanto gira pagina ----
  function reads(P, prop) {
    const k = cyc(P, 9 + P.r * 4), turn = pulse(k, .85, .9, .93, 1);
    arm(P, 'R', .3, -.75, .45, -.35, .3 + turn * .3, .9); arm(P, 'L', .3, -.75, .45, -.45, .3, .9);
    P.rot('Head', .35, 0, 0); P.rot('Chest', .06, 0, 0); show(P, prop);
  }
  def('legge', { fade: .4 }, (P) => reads(P, 'giornale'));
  def('libro', { fade: .4 }, (P) => reads(P, 'libro'));
  // ---- GUARDA L'OROLOGIO: polso sinistro davanti, testa giù ----
  def('orologio', { fade: .3 }, (P) => { arm(P, 'L', .2, -.8, .4, -.7, .45, .55); P.rot('Head', .35, .15, 0); });
  // ---- PORTA UNA CASSA: due mani sotto, braccia piegate davanti alla pancia; schiena un po' indietro ----
  def('porta', { fade: .3 }, (P) => {
    arm(P, 'R', .15, -.75, .5, -.1, .05, 1); arm(P, 'L', .15, -.75, .5, -.1, .05, 1);
    P.rot('Abdomen', -.1, 0, 0); show(P, 'cassa');
  });
  // ---- SPINGE LA CARRIOLA: braccia tese in basso avanti, busto in avanti ----
  def('carriola', { fade: .3 }, (P) => {
    P.rot('Abdomen', .18, 0, 0);
    handTo(P, 'R', .22, .7, .26, .3, -.4, -.4); handTo(P, 'L', .22, .7, .26, .3, -.4, -.4);
    hideHeld(P); show(P, 'carriola');
  });
  // ---- REGGE IL CERO: davanti al petto con due mani ----
  def('cero', { fade: .4 }, (P) => {
    arm(P, 'R', .15, -.8, .45, -.35, .6, .7); arm(P, 'L', .15, -.8, .45, -.45, .5, .7);
    grip(P, 'R', 0, 1, .1); P.rot('Head', .3, 0, 0); show(P, 'cero');
  });
  // ---- SALUTA: mano alzata che oscilla ----
  def('saluta', { fade: .2 }, (P) => { arm(P, 'R', .55, .35, .25, .1, 1, .05); P.rot('LowerArmR', 0, 0, .35 * P.wave(1.8)); });

  // ================= TUTTO IL CORPO =================
  // ---- IN GINOCCHIO (fruga, raccoglie, lavora a terra) ----
  function kneel(P, deep) {
    P.body({ y: -.42 - deep * .1 });
    legTo(P, 'L', .14, .42 + deep * .1 + GF, .32, .1, .3, 1);                        // la sinistra col piede a terra
    legTo(P, 'R', .14, .62 + deep * .1, -.32, .1, -.6, .8, -.6);                     // la destra col ginocchio a terra
    P.rot('Abdomen', .35 + deep * .2, 0, 0); P.rot('Chest', .15, 0, 0); P.rot('Head', .2, 0, 0);
  }
  def('fruga', FULL, (P) => {
    kneel(P, .5); const a = Math.sin(P.t * 4 + P.r * 9) * .15;
    arm(P, 'R', .15, -.55, .8, .05 + a, -.75, .6); arm(P, 'L', .15, -.55, .8, .05 - a, -.75, .6);
  }); BUSY.fruga = 1;
  def('raccoglie', FULL, (P) => {
    const k = cyc(P, 3), d = pulse(k, 0, .3, .55, .85);
    P.body({ y: -.3 * d }); P.rot('Abdomen', .7 * d, 0, 0); P.rot('Chest', .2 * d, 0, 0);
    legTo(P, 'L', .12, .3 * d + GF, .2, .1, .2, 1); legTo(P, 'R', .12, .3 * d + GF, -.05, .1, .2, 1);
    arm(P, 'R', .1, -.6, .7, 0, -.9, .3, d);
  }); BUSY.raccoglie = 1;
  // ---- PREGA: in ginocchio, mani giunte, testa bassa ----
  def('prega', FULL, (P) => {
    kneel(P, 0); P.rot('Abdomen', -.3, 0, 0);
    handTo(P, 'R', .03, 1.12, .26, .8, -.5, -.1); handTo(P, 'L', .03, 1.12, .26, .8, -.5, -.1);
    P.rot('Head', .4 + .05 * P.wave(.15), 0, 0);
  }); BUSY.prega = 1;
  // ---- SCAVA: pala, piede sulla lama, solleva e butta di lato; ciclo di 2,4 s ----
  def('scava', FULL, (P) => {
    const k = cyc(P, 2.4), dn = pulse(k, 0, .25, .45, .6), up = pulse(k, .5, .7, .8, 1);
    P.rot('Abdomen', .35 + .35 * dn - .15 * up, .35 * up, 0); P.rot('Chest', .1, .15 * up, 0);
    P.body({ y: -.08 * dn });
    arm(P, 'R', .15, -.55, .6, .05, lerp(-.75, -.2, up), lerp(.6, .9, up)); arm(P, 'L', .15, -.35, .75, .1, lerp(-.8, -.5, up), .55);
    grip(P, 'R', 0, lerp(-1, -.3, up), lerp(.45, .8, up)); secondHand(P, .38, .8, -.4, 0); hideHeld(P); show(P, 'pala');
  }); BUSY.scava = 1;
  // ---- ZAPPA: alza la zappa sopra la spalla e la cala ----
  def('zappa', FULL, (P) => {
    const k = cyc(P, 1.9), hit = k < .25 ? smooth(k / .25) : 1 - smooth((k - .25) / .75);   // giù veloce, su piano
    P.rot('Abdomen', .1 + .45 * hit, 0, 0); P.rot('Chest', .05 + .1 * hit, 0, 0);
    arm(P, 'R', .12, lerp(.2, -.6, hit), lerp(.6, .75, hit), .05, lerp(.75, -.5, hit), lerp(.4, .85, hit));
    arm(P, 'L', .12, lerp(.1, -.55, hit), lerp(.6, .8, hit), .05, lerp(.7, -.55, hit), lerp(.5, .8, hit));
    grip(P, 'R', 0, lerp(.9, -.6, hit), lerp(.2, .9, hit)); secondHand(P, .32, .8, -.4, 0); hideHeld(P); show(P, 'zappa');
  }); BUSY.zappa = 1;
  // ---- MARTELLA (inchioda): chinato, la sinistra tiene il chiodo, la destra batte veloce ----
  def('martella', FULL, (P) => {
    const k = cyc(P, .55), hit = k < .3 ? smooth(k / .3) : 1 - smooth((k - .3) / .7);
    P.rot('Abdomen', .2, 0, 0); P.rot('Head', .3, 0, 0);
    handTo(P, 'L', .02, 1.0, .42, .8, -.5, 0);                                       // la sinistra tiene il chiodo sull'asse
    handTo(P, 'R', lerp(.16, .1, hit), lerp(1.32, 1.04, hit), lerp(.22, .4, hit), .9, -.3, -.3);
    grip(P, 'R', 0, lerp(.95, -.1, hit), lerp(.3, 1, hit)); hideHeld(P); show(P, 'martello');
  }); BUSY.martella = 1;
  // ---- FORZA UNA PORTA: piede di porco nella fessura, tira indietro con tutto il peso ----
  def('forza', FULL, (P) => {
    const k = cyc(P, 1.6), pull = pulse(k, 0, .4, .6, 1);
    P.rot('Abdomen', .1 - .25 * pull, 0, 0); P.body({ z: -.08 * pull });
    arm(P, 'R', .1, -.3, .9, .05, -.1, 1); arm(P, 'L', .1, -.25, .9, -.05, -.05, 1);
    grip(P, 'R', -.3, .1, 1); secondHand(P, .2, .8, -.5, 0); hideHeld(P); show(P, 'piede');
  }); BUSY.forza = 1;
  // ---- SPAZZA: scopa avanti e indietro davanti ai piedi ----
  def('spazza', FULL, (P) => {
    const sw = Math.sin(P.t * 3.2 + P.r * 6);
    P.rot('Abdomen', .25, .15 * sw, 0);
    arm(P, 'R', .1, -.75, .35, .05, -.75, .6 + .1 * sw); arm(P, 'L', .1, -.55, .65, .05, -.6, .75 + .1 * sw);
    grip(P, 'R', .1, -1, .45); secondHand(P, .35, .8, -.4, 0); show(P, 'scopa');
  }); BUSY.spazza = 1;
  // ---- PESCA: canna tenuta alta, ogni tanto si tira su e si rilancia ----
  def('pesca', FULL, (P) => {
    const k = cyc(P, 14 + P.r * 8), cast = pulse(k, .9, .94, .96, 1);
    arm(P, 'R', .12, -.6, .6, -.05, lerp(.35, .95, cast), lerp(.9, -.2, cast)); arm(P, 'L', .12, -.75, .5, -.2, -.1, .95);
    grip(P, 'R', 0, lerp(.65, 1, cast), lerp(1, -.2, cast)); P.rot('Head', .05, 0, 0); show(P, 'canna');
  }); BUSY.pesca = 1;
  // ---- BALLA: anche e braccia a tempo (120 bpm), passi sul posto ----
  def('balla', FULL, (P) => {
    const b = P.t * 2 * PI + P.r * 6, s1 = Math.sin(b), s2 = Math.sin(b * .5);
    P.body({ y: -.04 + .04 * Math.abs(s1), x: .05 * s2 });
    P.rot('Hips', 0, .2 * s2, .08 * s2); P.rot('Chest', 0, -.25 * s2, -.06 * s2);
    const v = pickR(P, 2, 5);
    if (v) { arm(P, 'R', .5, .3 + .3 * s1, .3, .2, 1, .1); arm(P, 'L', .3, -.6, .5, -.3, .5 + .3 * s1, .7); }
    else { arm(P, 'R', .3, -.7, .45, -.2, .4 + .4 * s1, .8); arm(P, 'L', .3, -.7, .45, -.2, .4 - .4 * s1, .8); }
    P.rot('Head', .1 * s1, .15 * s2, 0);
  }); BUSY.balla = 1;
  // ---- APPOGGIATO al muro: schiena indietro, un piede piegato contro il muro, braccia conserte o in tasca ----
  def('appoggiato', FULL, (P) => {
    P.body({ z: -.06, rx: -.08 });
    legTo(P, 'R', .12, .35, -.12, .1, .3, 1, .3);
    if (P.r > .5) { arm(P, 'R', .25, -.85, .35, -.95, .2, .3); arm(P, 'L', .25, -.85, .3, -.95, .05, .35); }
    else { arm(P, 'R', .2, -.95, -.12, -.15, -.9, .35); arm(P, 'L', .2, -.95, -.12, -.15, -.9, .35); }
  });
  // ---- AL BANCONE: avambracci appoggiati davanti, peso su una gamba, un sorso ogni tanto ----
  def('bancone', FULL, (P) => {
    P.rot('Abdomen', .22, 0, 0);
    arm(P, 'L', .15, -.55, .7, -.6, .05, .8);
    const k = cyc(P, 7 + P.r * 3), up = pulse(k, 0, .15, .3, .42);
    arm(P, 'R', .15, lerp(-.55, -.3, up), lerp(.7, .6, up), lerp(-.6, -.45, up), lerp(.05, .85, up), lerp(.8, .25, up));
    if (up > .5) P.rot('Head', -.25 * up, 0, 0);
    legTo(P, 'R', .02, GF, .05, 0, .3, 1, 0, .2);
    show(P, 'bicchiere');
  });
  // ---- SI FERMA E RESPIRA: mani sulle ginocchia, il petto che va su e giù ----
  def('respira', FULL, (P) => {
    P.body({ y: -.1 });
    legTo(P, 'L', .14, .1 + GF, .02, .1, .2, 1); legTo(P, 'R', .14, .1 + GF, .02, .1, .2, 1);
    P.rot('Abdomen', .6, 0, 0); P.rot('Chest', .15 + .06 * Math.sin(P.t * 7), 0, 0); P.rot('Head', -.45, 0, 0);
    handTo(P, 'R', .14, .55, .26, .6, .3, -.3); handTo(P, 'L', .14, .55, .26, .6, .3, -.3);
  }); BUSY.respira = 1;
  // ---- SI STIRACCHIA (al risveglio): braccia in alto, poi giù ----
  def('stiracchia', FULL, (P) => {
    const k = cyc(P, 5), up = pulse(k, 0, .25, .55, .8);
    arm(P, 'R', .3, lerp(-.9, .9, up), .05, .1, lerp(-.5, 1, up), .1); arm(P, 'L', .3, lerp(-.9, .9, up), .05, .1, lerp(-.5, 1, up), .1);
    P.rot('Chest', -.25 * up, 0, 0); P.rot('Head', -.3 * up, 0, 0);
  }); BUSY.stiracchia = 1;
  // ---- SI SCALDA al fuoco: mani tese avanti, palmi verso la fiamma, sfregate ogni tanto ----
  def('scalda', FULL, (P) => {
    const rub = pulse(cyc(P, 6), 0, .1, .4, .5), r = Math.sin(P.t * 14) * .08 * rub;
    P.rot('Abdomen', .15, 0, 0); P.rot('Chest', .05, 0, 0); P.rot('Head', .2, 0, 0);
    handTo(P, 'R', .08 + r, 1.12, .48, .7, -.5, -.2); handTo(P, 'L', .08 - r, 1.12, .48, .7, -.5, -.2);
  }); BUSY.scalda = 1;
  // ---- ATTACCA MANIFESTI: braccia alte sul muro, pennello di colla che passa ----
  def('attacchina', FULL, (P) => {
    const sw = Math.sin(P.t * 2.6 + P.r * 4);
    handTo(P, 'R', .15 + .12 * sw, 1.6 + .08 * Math.sin(P.t * 1.3), .55, .8, -.3, 0); handTo(P, 'L', .25, 1.7, .5, .8, -.3, 0);
    P.rot('Head', -.2, .25 * Math.sin(P.t * .4), 0);   // si guarda intorno
    grip(P, 'R', -.2, .2, 1); show(P, 'pennello');
  }); BUSY.attacchina = 1;
  // ---- BOMBOLETTA: braccio teso sul muro che disegna, ogni tanto agita la bomboletta ----
  def('vernicia', FULL, (P) => {
    const k = cyc(P, 8), shake = pulse(k, 0, .05, .15, .2);
    if (shake > .5) arm(P, 'R', .2, -.8, .4, -.2, .4 + .3 * Math.sin(P.t * 30), .9);
    else arm(P, 'R', .25, .05 + .2 * Math.sin(P.t * 1.7), .85, .15 * Math.sin(P.t * 2.3), .1, 1);
    arm(P, 'L', .2, -.95, -.12, -.15, -.9, .35);
    P.rot('Head', -.05, .2 * Math.sin(P.t * .5), 0);
    if (shake <= .5) grip(P, 'R', -.1, 0, 1); hideHeld(P); show(P, 'bomboletta');
  }); BUSY.vernicia = 1;
  // ---- GESSO: chinato, scrive basso sul muro o per terra ----
  def('gesso', FULL, (P) => {
    P.rot('Abdomen', .5, 0, 0); P.body({ y: -.12 });
    arm(P, 'R', .15, -.5, .8, .1 * Math.sin(P.t * 3), -.4, .9); arm(P, 'L', .15, -.7, .5, 0, -.8, .5);
    hideHeld(P); show(P, 'gesso');
  }); BUSY.gesso = 1;
  // ---- FOTOGRAFA: macchina all'occhio, ogni tanto la abbassa e guarda ----
  def('foto', FULL, (P) => {
    const k = cyc(P, 7), low = pulse(k, .6, .7, .9, 1);
    arm(P, 'R', .45, lerp(-.3, -.85, low), .45, -.5, lerp(.85, .2, low), lerp(.2, .9, low));
    arm(P, 'L', .45, lerp(-.3, -.85, low), .45, -.5, lerp(.85, .2, low), lerp(.2, .9, low));
    P.rot('Head', .05 + .25 * low, 0, 0); hideHeld(P); show(P, 'fotocamera');
  }); BUSY.foto = 1;
  // ---- DISEGNA: album sul braccio sinistro, la destra traccia ----
  def('disegna', FULL, (P) => {
    arm(P, 'L', .2, -.75, .4, -.55, .25, .8);
    arm(P, 'R', .2, -.75, .45, -.45 + .08 * Math.sin(P.t * 3), .3, .85);
    P.rot('Head', .35 - .2 * pulse(cyc(P, 4), 0, .1, .3, .4), 0, 0); show(P, 'album');
  }); BUSY.disegna = 1;
  // ---- GUARDA LA MERCE (banco, mercato): chino sul banco, una mano tocca, gira la testa ----
  def('merce', FULL, (P) => {
    const k = cyc(P, 5);
    P.rot('Abdomen', .3, 0, 0); P.rot('Head', .25, .4 * Math.sin(k * 2 * PI), 0);
    handTo(P, 'R', .12, .9 + .08 * pulse(k, .3, .4, .6, .7), .5, .8, -.4, 0);
    handTo(P, 'L', .12, .95, .3, .8, -.4, -.2); show(P, 'soldi');
  });
  // ---- LAVORA (a un banco: officina, bottega, rete da riparare): mani sul piano, gesti piccoli ----
  def('lavora', FULL, (P) => {
    const a = Math.sin(P.t * 2.6 + P.r * 7), b = Math.sin(P.t * 3.4 + P.r * 3);
    P.rot('Abdomen', .32, 0, 0); P.rot('Head', .3, .1 * a, 0);
    arm(P, 'R', .15, -.55, .7, -.1 + .12 * a, -.3, .95); arm(P, 'L', .15, -.55, .7, -.1 + .12 * b, -.3, .95);
  }); BUSY.lavora = 1;
  // ---- GIOCA A CARTE (seduto): carte nella sinistra, la destra cala una carta ogni tanto ----
  def('carte', FULL, (P) => {
    seated(P, 0);
    const k = cyc(P, 6), play = pulse(k, .7, .8, .85, .95);
    arm(P, 'L', .12, -.7, .5, -.4, .4, .8); arm(P, 'R', .12, -.7, .55, -.1, lerp(.3, -.2, play), .95);
    P.rot('Head', .3, 0, 0); show(P, 'carte');
  }); BUSY.carte = 1;
  // ---- MANGIA SEDUTO a tavola ----
  def('tavola', FULL, (P) => {
    seated(P, 0);
    const k = cyc(P, 3.5), up = pulse(k, 0, .2, .35, .55);
    arm(P, 'R', .15, lerp(-.7, -.4, up), .55, lerp(-.1, -.45, up), lerp(.1, .85, up), lerp(.95, .2, up)); arm(P, 'L', .15, -.7, .55, -.1, .1, .95);
    P.rot('Head', .25 - .3 * up, 0, 0);
  }); BUSY.tavola = 1;
  // ---- FLIPPER: due mani sui pulsanti, colpi rapidi, il corpo che segue la pallina ----
  def('flipper', FULL, (P) => {
    const f = Math.sin(P.t * 11) > .6 ? 1 : 0, g = Math.sin(P.t * 9 + 2) > .7 ? 1 : 0;
    P.rot('Abdomen', .25, .1 * Math.sin(P.t * 1.5), .08 * Math.sin(P.t * 2.1));
    arm(P, 'R', .3, -.5, .7, -.1, -.3 + .1 * f, .95); arm(P, 'L', .3, -.5, .7, -.1, -.3 + .1 * g, .95);
    P.rot('Head', .35, 0, 0);
  }); BUSY.flipper = 1;
  // ---- ASPETTA: si guarda attorno, il peso che passa da un piede all'altro ----
  def('aspetta', FULL, (P) => {
    P.rot('Head', 0, .7 * Math.sin(P.t * .35 + P.r * 6), 0); P.rot('Chest', 0, .15 * Math.sin(P.t * .35 + P.r * 6), 0);
    P.body({ x: .04 * Math.sin(P.t * .2 + P.r * 3) });
    arm(P, 'R', .2, -.95, -.12, -.15, -.9, .35); arm(P, 'L', .2, -.95, -.12, -.15, -.9, .35);
  });
  ['siede_terra', 'dorme', 'siede'].forEach(k => BUSY[k] = 0);
  ['beve', 'bottiglia', 'mangia', 'telefona', 'legge', 'libro', 'porta', 'carriola', 'cero', 'fuma'].forEach(k => BUSY[k] = 1);

  // ================= LE MAPPE: dallo stato del gioco alla posa =================
  // testo del passo del piano (azioni.js, regia.js «fai»: «ripara la rete», «dipinge la barca»...) → posa
  const BY_LABEL = [
    [/scav|seppell|buca|fossa|vanga|pala/, 'scava'], [/zapp|orto|semin|pianta|raccogl.*(olive|uva|frutta)|vign/, 'zappa'],
    [/inchiod|martell|ripara il tetto|aggiust|costruis|assi/, 'martella'], [/forza|scassin|piede di porco|serratura/, 'forza'],
    [/fruga|tasche|perquis|cerca (per terra|nei)|rovist/, 'fruga'], [/colla|manifest|volantin|affigg/, 'attacchina'],
    [/bomboletta|scritta|vernic|spruzz|graffit/, 'vernicia'], [/gesso/, 'gesso'], [/foto|scatta/, 'foto'],
    [/disegn|schizz|ritratt|album/, 'disegna'], [/dipin|pittur|tinteggi/, 'vernicia'],
    [/rete|ripara|cuc|lavora a|intaglia|pulisce il pesce|sistema|smonta|motore|officina|banco/, 'lavora'],
    [/spazz|pulisc|lava (la|il|le|i) /, 'spazza'], [/pesca|canna/, 'pesca'], [/preg|rosario|messa|cero/, 'prega'],
    [/ball/, 'balla'], [/carte|scopa|briscola|tombola/, 'carte'], [/flipper/, 'flipper'],
    [/solleva|raccoglie|tira fuori|prende (da terra|il corpo)|posa|scarica|carica/, 'raccoglie'],
    [/respira|riprende fiato|si ferma/, 'respira'], [/mangia|pranz|cena|merend/, 'mangia_su'], [/beve|brinda|vino|bicchier/, 'beve_su'],
    [/legge|giornal|libro/, 'legge_su'], [/telefon/, 'telefona_su'], [/fuma|sigarett/, 'fuma_su'], [/scald|fuoco|braci/, 'scalda'],
    [/aspett|attend|fa il palo|sorveglia|osserva|guarda/, 'aspetta'], [/nascost|si nasconde/, 'siede_terra'],
  ];
  function byLabel(txt, s) {
    if (!txt) return false; const t = txt.toLowerCase();
    for (let i = 0; i < BY_LABEL.length; i++) if (BY_LABEL[i][0].test(t)) { const v = BY_LABEL[i][1]; if (v.endsWith('_su')) s.upper = v.slice(0, -3); else s.act = v; return true; }
    return false;
  }
  // oggetti intelligenti di popolo.js (il blocco della giornata) → posa
  const BY_OBJ = { panchina: 'siede', bancone: 'bancone', carte: 'carte', tavola: 'tavola', panino: 'mangia_su', bottega: 'merce', bancarelle: 'merce',
    spiaggia: 'siede_terra', canna: 'pesca', banco_chiesa: 'prega', cero: 'cero_su', libri: 'legge_su', flipper: 'flipper', pista: 'balla', pallone: 'aspetta',
    palestra: 'lavora', motori: 'lavora', orto: 'zappa', barbiere: 'siede', album: 'disegna', foto: 'foto', fontana: 'lavora', cinema: 'siede', tv: 'siede', radio: 'siede' };
  // il mestiere, quando si lavora all'aperto
  const BY_JOB = [[/pescat|marinai/, 'lavora'], [/murator|manoval|carpent|operai/, 'martella'], [/contadin|bracciant|ortolan|giardin/, 'zappa'],
    [/spazzin|netturb|bidell/, 'spazza'], [/portual|scaricat|facchin|magazzin/, 'porta_su'], [/barist|camerier|oste/, 'bancone'],
    [/venditor|ambulant|bottegai|commess|fruttiv|pescivend|macell|fornai|edicol|tabacc/, 'merce'], [/meccanic|fabbro|elettric|calzolai|sart|barbier/, 'lavora'],
    [/guardi|vigil|sorvegl|portier|custod/, 'aspetta'], [/prete|suor|parroc/, 'cero_su']];
  function put(v, s) { if (!v) return; if (v.endsWith('_su')) s.upper = v.slice(0, -3); else s.act = v; }
  // attrezzo in mano (n.hand / p.hand) mentre si cammina → braccia
  const HELD_UP = { carriola: 'carriola', cassa: 'porta', roba: 'porta', merce: 'porta', viveri: 'porta', materiali: 'porta', mobili: 'porta', refurtiva: 'porta' };
  // il «modo di fare» da fermi: piccole abitudini per persona, cambiano ogni minuto circa
  const HABITS = ['tasche', 'braccia', 'fuma', 'orologio', 'tasche', 'aspetta_act', 'appoggiato_act', 'braccia', null, null];
  function habit(n, clock, s) {
    const slot = Math.floor((clock + (n.__h || (n.__h = Anim.hashStr(String(n.id)) * 97))) / 55);
    const h = HABITS[Math.floor(Anim.hashStr(n.id + ':' + slot) * HABITS.length)];
    if (!h) return; if (h.endsWith('_act')) s.act = h.slice(0, -4); else s.upper = h;
  }
  Anim.npcMap((st, n, s) => {
    if (n.dead || n.stun > 0 || n.inside) return;
    const P = n.pop, moving = Math.abs(n.speedNow || 0) > .3;
    // portare qualcosa (un corpo, un carico) o la carriola: braccia, anche camminando
    if (P && P.carrying) s.upper = 'porta';
    if (n.hand && HELD_UP[n.hand]) s.upper = HELD_UP[n.hand];
    if (n.inVeh) return;
    // un piano in corso (azioni.js, anche quelli della Regia): il passo che sta facendo
    const E = P && P.emer;
    if (E && E.phase === 'do' && !moving) { const st0 = E.steps[E.i]; if (st0 && byLabel(st0.label, s)) return; if (byLabel(E.label, s)) return; }
    if (moving) return;
    // il blocco della giornata (popolo.js)
    const b = P && P.cur;
    if (b && n.action && n.action.name === 'routine') {
      if (b.obj && BY_OBJ[b.obj]) return put(BY_OBJ[b.obj], s);
      if (b.act === 'lavoro' && P.job) { const j = (P.job.base || P.job.title || '').toLowerCase(); for (const [re, v] of BY_JOB) if (re.test(j)) return put(v, s); return put('lavora', s); }
      if (b.act === 'messa') return put('prega', s);
      if (b.act === 'mercato' || b.act === 'spesa') return put('merce', s);
      if (b.act === 'pranzo') return put('mangia_su', s);
      if (byLabel(b.label, s)) return;
    }
    if (!s.upper) habit(n, st.clock, s);
  });
  // il protagonista: il tempo che corre (dorme, lavora, mangia...) e l'attrezzo in mano
  Anim.playerMap((st, p, s) => {
    if (p.stun > 0 || p.vehicle) return;
    const W = st.me && st.me.warp;
    if (W) { const k = W.kind || ''; if (/sonno/.test(k)) s.act = W.nap ? 'siede' : 'dorme'; else if (/lavor/.test(k)) s.act = 'lavora'; else if (/mang|pranz/.test(k)) s.act = 'tavola'; else if (/tv|casa|svago/.test(k)) s.act = 'siede'; else byLabel(W.label, s); return; }
    if (p.hand && HELD_UP[p.hand]) s.upper = HELD_UP[p.hand];
    if (p.carrying) s.upper = 'porta';
  });
})();
