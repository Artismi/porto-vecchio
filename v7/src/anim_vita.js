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
  function arm(P, side, ux, uy, uz, lx, ly, lz, w) { const S = SIDE[side]; P.aim(S.ua, D(ux * S.s, uy, uz), w); P.aim(S.la, D(lx * S.s, ly, lz), w); }
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
  const QHAND = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI);   // mano → osso del polso
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
  vprop('carriola', 'g', () => { const g = new THREE.Group(); box(g, .6, .25, .7, '#5a6a72', 0, .52, .95, .12); cyl(g, .16, .16, .06, '#1a1a1a', 0, .16, 1.38, 0, 0, PI / 2, 10); box(g, .04, .04, .9, '#6a5030', .22, .5, .55, .25); box(g, .04, .04, .9, '#6a5030', -.22, .5, .55, .25); box(g, .04, .3, .04, '#3a3a3a', .2, .25, .75); box(g, .04, .3, .04, '#3a3a3a', -.2, .25, .75); return g; });

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
    P.body({ rx: -PI / 2, y: .12, z: .85 });
    legTo(P, 'L', .1, -.1, .06, 0, 0, 1, -.3, .25); if (v) legTo(P, 'R', .14, .3, .3, 0, 0, 1, -.3, .2); else legTo(P, 'R', .1, -.1, .06, 0, 0, 1, -.3, .25);
    arm(P, 'L', .2, -1, .1, .05, -.6, .8);
    if (v) arm(P, 'R', .35, .9, -.1, -.6, -.1, -.3); else arm(P, 'R', .2, -1, .1, .1, -.5, .8);
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
  const BUSY = {};   // pose di tutto il corpo con le mani occupate (riempito sotto)
  ['siede'].forEach(k => 0);
})();
