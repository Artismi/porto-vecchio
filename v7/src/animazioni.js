/* ================= ANIMAZIONI: il motore comune =================
   I personaggi del kit (Quaternius) hanno poche clip: Idle, Walk, Run, Punch, Death, Wave, Interact, Gun_Shoot...
   Qui sopra le clip si aggiunge uno strato procedurale: ogni fotogramma, dopo il mixer, si piegano le ossa
   verso le pose delle azioni (sedersi, bere, scavare, mirare...). Le pose si scrivono nello SPAZIO DEL PERSONAGGIO,
   così non serve conoscere gli assi delle singole ossa:
     +z = avanti (dove guarda), +y = su, +x = sinistra del personaggio (la sua destra è -x).
   Ossa (nomi di three.js, senza il punto): Hips Abdomen Torso Chest Neck Head
     ShoulderL UpperArmL LowerArmL WristL   ShoulderR UpperArmR LowerArmR WristR
     UpperLegL LowerLegL FootL              UpperLegR LowerLegR FootR
   Chi scrive una posa usa:
     P.aim(osso, [x,y,z], peso)   punta l'osso (dalla sua base verso l'osso figlio) nella direzione data
     P.rot(osso, ax, ay, az, peso) ruota l'osso attorno agli assi del personaggio (radianti, in ordine x, y, z)
     P.body({ y, z, x, rx, ry, rz }) sposta/ruota tutto il corpo (sedersi: y negativo; sdraiarsi: rx)
                                   (si applica DOPO la posa: le pose sdraiate si scrivono come se si stesse in piedi)
     P.prop(nome)                  accende un oggetto in mano (vedi Anim.prop)
     P.t (secondi da quando la posa è attiva), P.time (orologio), P.w (peso della posa, 0-1, sale e scende da solo),
     P.o (le opzioni passate ad animPerson), P.r (numero fisso per persona, 0-1, per variare le pose),
     P.bulk (metri di vestiti su busto e braccia: allargare gomiti e mani di tanto, per non bucare il cappotto)
     P.base(clip)                  chiede una clip sotto la posa (es. 'Idle' per stare fermi mentre si siede)
   Le pose si registrano con Anim.def(nome, { fn(P), full, base, fade }) e si scelgono con le «mappe»:
     Anim.npcMap(fn(st, n, s))  e  Anim.playerMap(fn(st, p, s))  riempiono s = { act, upper, mood, talk, lookAt }
       act:   posa di tutto il corpo (una sola: 'siede', 'dorme', 'scava'...)
       upper: posa delle braccia sopra la camminata (una sola: 'telefono', 'fuma', 'porta'...)
       mood:  strati leggeri sempre attivi (lista: 'ubriaco', 'freddo', 'ferito', 'paura', 'rabbia')
       talk:  true se sta parlando (gesti delle mani e della testa)
       lookAt: { x, y, z } punto del mondo da guardare (la testa ci gira, entro i limiti del collo)
   Il file è indipendente dal resto: se una posa lancia un errore, si spegne da sola e il personaggio resta com'era. */
var Anim = (function () {
  const POSES = {}, NPCMAPS = [], PLMAPS = [], PROPS = {};
  const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
  const _a = V(), _b = V(), _c = V(), _d = V(), _q = Q(), _q2 = Q(), _q3 = Q(), _q4 = Q(), _e = new THREE.Euler();
  const ID = Q();
  const CHILD = { UpperArmL: 'LowerArmL', LowerArmL: 'WristL', UpperArmR: 'LowerArmR', LowerArmR: 'WristR', UpperLegL: 'LowerLegL', LowerLegL: 'FootL', UpperLegR: 'LowerLegR', LowerLegR: 'FootR', Neck: 'Head', Chest: 'Neck', Torso: 'Chest', Abdomen: 'Torso', Hips: 'Abdomen', ShoulderL: 'UpperArmL', ShoulderR: 'UpperArmR' };
  const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'], FB = [];
  ['L', 'R'].forEach(sd => { FINGERS.forEach(f => [1, 2, 3, 4].forEach(k => FB.push(f + k + sd))); [1, 2, 3].forEach(k => FB.push('Thumb' + k + sd)); });
  const BONES = FB.concat(['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'FootL', 'UpperLegR', 'LowerLegR', 'FootR']);
  const disabled = {};
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const smooth = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  // ---------------- lo scheletro di una persona ----------------
  function rig(g) {
    const u = g.userData; if (u.rig !== undefined) return u.rig;
    const m = u.body && u.body.children.find(c => c.isObject3D && c.getObjectByName && c.getObjectByName('Hips'));
    if (!m) { u.rig = null; return null; }
    const b = {}; BONES.forEach(k => { const o = m.getObjectByName(k); if (o) b[k] = o; });
    // le ossa del kit Toon Shooter hanno spesso il figlio con un nome diverso: si prende il primo osso figlio
    for (const k in b) if (!CHILD[k] || !b[CHILD[k]]) { const c = b[k].children.find(x => x.isBone); if (c && !CHILD[k]) CHILD[k] = c.name; }
    // lunghezza dello stinco, presa subito (dopo il piede viene spostato dalle pose)
    let shin = .45; if (b.LowerLegL && b.FootL) { g.updateMatrixWorld(true); const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(); b.LowerLegL.getWorldPosition(p1); b.FootL.getWorldPosition(p2); shin = p1.distanceTo(p2) || .45; }
    u.rig = { shin, m, b, layers: {}, r: hashStr(String(g.id) + (u.model || '')), headYaw: 0, headPitch: 0, talkT: 0 };
    return u.rig;
  }

  // ---------------- gli attrezzi delle pose (sigaretta, bicchiere, telefono...) ----------------
  // Anim.prop(nome, costruttore, osso, [x,y,z] in metri nello spazio del personaggio rispetto al polso, [rx,ry,rz])
  // Il costruttore restituisce un Object3D (misure in metri). Si crea alla prima richiesta, una volta per persona.
  function prop(name, make, bone, off, rot) { PROPS[name] = { make, bone: bone || 'WristR', off: off || [0, -.08, .04], rot: rot || [0, 0, 0] }; }
  function getProp(g, R, name) {
    R.props = R.props || {};
    if (R.props[name]) return R.props[name];
    const D = PROPS[name], bone = D && R.b[D.bone]; if (!D || !bone) return null;
    const obj = D.make(); if (!obj) return null;
    // si aggancia all'osso compensando la scala del modello (le ossa del kit sono in centimetri)
    g.updateMatrixWorld(true); bone.getWorldScale(_a); const gs = V(); g.getWorldScale(gs);
    const holder = new THREE.Group(); holder.scale.setScalar(gs.x / (_a.x || 1));
    holder.add(obj); bone.add(holder);
    // posizione e rotazione date nello spazio del personaggio: si convertono in quelle dell'osso
    bone.getWorldQuaternion(_q); g.getWorldQuaternion(_q2); const rel = _q.clone().invert().multiply(_q2);
    holder.quaternion.copy(rel).multiply(_q3.setFromEuler(_e.set(D.rot[0], D.rot[1], D.rot[2])));
    const off = V().fromArray(D.off).multiplyScalar(gs.x).applyQuaternion(_q2); // spostamento nel mondo
    off.applyQuaternion(_q.clone().invert()).divideScalar(_a.x || 1);
    holder.position.copy(off);
    holder.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    holder.visible = false; R.props[name] = holder; return holder;
  }

  // ---------------- l'oggetto che le pose usano ----------------
  function makeP(g, R) {
    const gq = Q();
    const P = {
      g, R, w: 1, t: 0, time: 0, o: {}, r: R.r, bulk: 0, _base: null, _props: null, _body: null,
      bone: k => R.b[k],
      // punta l'osso (base → figlio) verso la direzione data nello spazio del personaggio
      aim(k, dir, w) {
        const bn = R.b[k], ch = R.b[CHILD[k]]; if (!bn || !ch) return P;
        const ww = (w === undefined ? 1 : w) * P.w; if (ww <= 0) return P;
        // gambe: il piede del kit non è figlio dello stinco (è un bersaglio sotto Root): si punta l'asse dell'osso
        // e poi il piede torna in fondo allo stinco, sennò la scarpa si stira
        const leg = LEG[k]; if (leg) { _c.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(gq); aimY(bn, _c, ww); footToShin(R, leg); return P; }
        bn.getWorldPosition(_a); ch.getWorldPosition(_b); _b.sub(_a); if (_b.lengthSq() < 1e-10) return P;
        _b.normalize(); _c.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(gq);
        _q4.setFromUnitVectors(_b, _c); _q.copy(ID).slerp(_q4, ww);
        applyWorld(bn, _q); return P;
      },
      // ruota l'osso attorno agli assi del personaggio
      rot(k, ax, ay, az, w) {
        const bn = R.b[k]; if (!bn) return P;
        const ww = (w === undefined ? 1 : w) * P.w; if (ww <= 0) return P;
        _q.setFromEuler(_e.set(ax * ww, ay * ww, az * ww, 'XYZ'));
        _q.premultiply(gq).multiply(_q2.copy(gq).invert());   // asse del personaggio → asse del mondo
        applyWorld(bn, _q); if (LEG[k]) footToShin(R, LEG[k]); return P;
      },
      body(o) { P._body = P._body || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }; for (const k in o) P._body[k] += o[k] * P.w; return P; },
      base(c) { P._base = c; return P; },
      prop(name) { (P._props = P._props || []).push(name); return P; },
      wave: (f, ph) => Math.sin(P.t * f * Math.PI * 2 + (ph || 0) + P.r * 6.28),
      _gq: gq,
      // gamba: caviglia in (x, y, z) nello spazio del personaggio PRIMA dello spostamento di P.body (x vero: + = sinistra),
      // ginocchio verso il polo (kx, ky, kz), piede piatto con la punta alzata di pitch e girata in fuori di yaw.
      // IK a due ossa sull'asse Y delle ossa; il piede (bersaglio sotto Root) va in fondo allo stinco: niente scarpe stirate.
      legTo(side, fx, fy, fz, kx, ky, kz, pitch, yaw, w) { legTo(P, side === 'L' || side > 0 ? 'L' : 'R', fx, fy, fz, kx, ky, kz, pitch || 0, yaw || 0, (w === undefined ? 1 : w) * P.w); return P; },
      // dita: curl 0 (aperta) → 1 (pugno); thumb 0-1 il pollice che chiude sopra; spread allarga
      fingers(side, curl, thumb, w) { hand(P, side, curl, thumb === undefined ? curl : thumb, (w === undefined ? 1 : w) * P.w); return P; },
      // gira la mano perché la direzione A (vettore del MONDO, solidale alla mano: la canna, il manico) vada verso dir
      // (spazio del personaggio). Prima ruota l'avambraccio sul suo asse (pronazione, fino a ~95°), il resto lo fa il polso
      // entro maxWrist radianti (default 0,7): niente polsi spezzati; se non basta, l'attrezzo resta un po' fuori asse.
      turnHand(side, A, dir, maxWrist, w) { turn(P, side, A, dir, maxWrist === undefined ? .7 : maxWrist, (w === undefined ? 1 : w) * P.w); return P; },
    };
    return P;
  }
  // ruota l'osso di q (quaternione nel mondo) e aggiorna i figli
  // ---------------- le gambe ----------------
  const LEG = { UpperLegL: 'L', LowerLegL: 'L', UpperLegR: 'R', LowerLegR: 'R' };
  // il piede in fondo allo stinco (lungo l'asse Y dello stinco), con la rotazione che segue quella dello stinco
  function footToShin(R, sd) {
    const ll = R.b['LowerLeg' + sd], ft = R.b['Foot' + sd]; if (!ll || !ft || !ft.parent) return;
    if (!R.shin) { ll.getWorldPosition(_K); ft.getWorldPosition(_T); R.shin = _K.distanceTo(_T) || .45; }
    const key = 'fr' + sd; ll.getWorldQuaternion(_lq);
    if (!R[key] || R[key + 't'] !== R.__frame) { ft.getWorldQuaternion(_lq2); R[key] = (R[key] || Q()).copy(_lq).invert().multiply(_lq2); R[key + 't'] = R.__frame; }   // piede rispetto allo stinco, preso a inizio fotogramma
    ll.getWorldPosition(_K); _Y.set(0, 1, 0).applyQuaternion(_lq); _T.copy(_K).addScaledVector(_Y, R.shin);
    ft.parent.worldToLocal(_T); ft.position.copy(_T);
    _lq2.copy(_lq).multiply(R[key]); ft.parent.getWorldQuaternion(_q4); ft.quaternion.copy(_q4.invert().multiply(_lq2)); ft.updateMatrixWorld(true);
  }
  const _H = V(), _K = V(), _T = V(), _U = V(), _N = V(), _Y = V(), _lq = Q(), _lq2 = Q(), _le = new THREE.Euler();
  function aimY(bone, dir, ww) {   // ruota l'osso perché il suo asse Y (nel mondo) vada verso dir
    bone.getWorldQuaternion(_lq); _Y.set(0, 1, 0).applyQuaternion(_lq);
    _lq2.setFromUnitVectors(_Y, dir); if (ww < 1) { _fq.copy(_lq2); _lq2.copy(ID).slerp(_fq, ww); }
    applyWorld(bone, _lq2);
  }
  function legTo(P, sd, fx, fy, fz, kx, ky, kz, pitch, yaw, ww) {
    const R = P.R, ul = R.b['UpperLeg' + sd], ll = R.b['LowerLeg' + sd], ft = R.b['Foot' + sd]; if (!ul || !ll || !ft || ww <= 0) return;
    if (!R.shin) { ll.getWorldPosition(_K); ft.getWorldPosition(_T); R.shin = _K.distanceTo(_T) || .45; }
    ul.getWorldPosition(_H); ll.getWorldPosition(_K);
    const a = _H.distanceTo(_K), b = R.shin, s = sd === 'L' ? 1 : -1;
    _T.set(fx, fy, fz); P.g.localToWorld(_T);
    _U.subVectors(_T, _H); let d = _U.length(); if (d < 1e-5) return; _U.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, a + b - .002);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _N.set(kx, ky, kz).applyQuaternion(P._gq); _N.addScaledVector(_U, -_N.dot(_U)); if (_N.lengthSq() < 1e-8) _N.set(0, 0, 1).applyQuaternion(P._gq); _N.normalize();
    _K.copy(_H).addScaledVector(_U, x).addScaledVector(_N, h);           // il ginocchio
    _T.copy(_H).addScaledVector(_U, d);                                  // la caviglia (raggiungibile)
    _N.subVectors(_K, _H).normalize(); aimY(ul, _N, ww);
    ll.getWorldPosition(_K); _N.subVectors(_T, _K).normalize(); aimY(ll, _N, ww);
    _T.copy(_K).addScaledVector(_N, b);                                  // il piede in fondo allo stinco
    ft.getWorldPosition(_K); _K.lerp(_T, ww); ft.parent.worldToLocal(_K); ft.position.copy(_K);
    _lq2.setFromEuler(_le.set(Math.PI / 2 - pitch, yaw * s, 0, 'YXZ')); _lq2.premultiply(P._gq);   // asse Y del piede = avanti, Z = giù
    ft.getWorldQuaternion(_lq); _lq.slerp(_lq2, ww);
    ft.parent.getWorldQuaternion(_q4); _lq.premultiply(_q4.invert()); ft.quaternion.copy(_lq); ft.updateMatrixWorld(true);
  }
  // ---------------- le mani ----------------
  const _f1 = V(), _f2 = V(), _ax = V(), _fq = Q(), _tw = Q(), _sw = Q();
  // il verso in cui le dita si chiudono si scopre una volta per scheletro: si prova a piegare il medio e si guarda
  // se la punta si avvicina alla base del pollice (il palmo)
  function curlSign(R, sd) {
    const key = 'cs' + sd; if (R[key]) return R[key];
    // ATTENZIONE: nel kit le radici delle dita (Index1, Middle1, Pinky1, Thumb1) stanno tutte nello stesso punto, al polso:
    // l'asse del palmo si prende dalle nocche (le seconde ossa) e si piega dalla nocca in poi
    const m2 = R.b['Middle2' + sd], m3 = R.b['Middle3' + sd], th = R.b['Thumb2' + sd], i2 = R.b['Index2' + sd], p2 = R.b['Pinky2' + sd];
    if (!m2 || !m3 || !th || !i2 || !p2) return (R[key] = 1);
    const q0 = m2.quaternion.clone(); let best = 1, bd = 1e9;
    [1, -1].forEach(sg => {
      m2.quaternion.copy(q0); m2.updateMatrixWorld(true); i2.getWorldPosition(_f1); p2.getWorldPosition(_f2); _ax.subVectors(_f1, _f2).normalize();
      _fq.setFromAxisAngle(_ax, sg * 1.2); applyWorld(m2, _fq); m3.getWorldPosition(_f1); th.getWorldPosition(_f2); const d = _f1.distanceTo(_f2);
      if (d < bd) { bd = d; best = sg; }
    });
    m2.quaternion.copy(q0); m2.updateMatrixWorld(true); return (R[key] = best);
  }
  // angolo di ogni osso col pugno chiuso: 1 = palmo (dal polso, quasi fermo), 2 = nocca, 3 e 4 = falangi
  const CURL = [.08, 1.45, 1.35, .9];
  function hand(P, side, curl, thumb, ww) {
    const R = P.R, sd = side === 'L' ? 'L' : 'R', i2 = R.b['Index2' + sd], p2 = R.b['Pinky2' + sd]; if (!i2 || !p2 || ww <= 0) return;
    const sg = curlSign(R, sd);
    for (let f = 0; f < 4; f++) {
      const c = curl * (1 + (f - 1.5) * .06);   // il mignolo chiude un filo di più
      for (let k = 0; k < 4; k++) {
        const b = R.b[FINGERS[f] + (k + 1) + sd]; if (!b) continue;
        i2.getWorldPosition(_f1); p2.getWorldPosition(_f2); _ax.subVectors(_f1, _f2).normalize();   // asse delle nocche (si muove poco)
        _fq.setFromAxisAngle(_ax, sg * CURL[k] * c * ww); applyWorld(b, _fq);
      }
    }
    // il pollice: la prima falange si porta davanti al palmo, le altre si chiudono sopra le dita
    const t2 = R.b['Thumb2' + sd], t3 = R.b['Thumb3' + sd], m2 = R.b['Middle2' + sd], w0 = R.b['Wrist' + sd];
    if (t2 && m2 && w0 && thumb > 0) {
      i2.getWorldPosition(_f1); p2.getWorldPosition(_f2); _ax.subVectors(_f1, _f2).normalize();
      w0.getWorldPosition(_f1); m2.getWorldPosition(_f2); const fd = _f2.sub(_f1).normalize();
      _fq.setFromAxisAngle(fd, sg * .5 * thumb * ww); applyWorld(t2, _fq);
      if (t3) { _fq.setFromAxisAngle(_ax, sg * .7 * thumb * ww); applyWorld(t3, _fq); }
    }
  }
  // twist (attorno all'asse dell'avambraccio) e swing (il resto) di una rotazione
  function turn(P, side, A, dir, maxW, ww) {
    const R = P.R, sd = side === 'L' ? 'L' : 'R', la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd]; if (!la || !wr || ww <= 0) return;
    la.getWorldPosition(_f1); wr.getWorldPosition(_f2); const F = _f2.sub(_f1).normalize();   // asse dell'avambraccio
    const B = _c.set(dir[0], dir[1], dir[2]).normalize().applyQuaternion(P._gq);
    _fq.setFromUnitVectors(_f1.copy(A).normalize(), B);
    // decomposizione swing-twist attorno a F
    const d = _fq.x * F.x + _fq.y * F.y + _fq.z * F.z;
    _tw.set(F.x * d, F.y * d, F.z * d, _fq.w).normalize();
    let ta = 2 * Math.acos(clamp(_tw.w, -1, 1)); if (ta > Math.PI) ta -= 2 * Math.PI;
    const lim = 1.65, tk = Math.abs(ta) > lim ? lim / Math.abs(ta) : 1;
    _sw.copy(ID).slerp(_tw, tk * ww); applyWorld(la, _sw);              // l'avambraccio ruota (porta con sé polso e mano)
    A.applyQuaternion(_sw);                                              // la direzione dell'attrezzo dopo il twist
    _fq.setFromUnitVectors(_f1.copy(A).normalize(), B);
    const sa = 2 * Math.acos(clamp(_fq.w, -1, 1)), sk = sa > maxW ? maxW / sa : 1;
    _sw.copy(ID).slerp(_fq, sk * ww); applyWorld(wr, _sw);              // il polso fa il resto, entro il limite
  }
  function applyWorld(bn, q) {
    bn.getWorldQuaternion(_q2); _q3.copy(q).multiply(_q2);                 // nuova rotazione nel mondo
    if (bn.parent) { bn.parent.getWorldQuaternion(_q2); _q2.invert(); _q3.premultiply(_q2); }
    bn.quaternion.copy(_q3); bn.updateMatrixWorld(true);
  }

  // ---------------- registro ----------------
  function def(name, spec) { POSES[name] = Object.assign({ fade: .25, full: false }, spec); }
  const npcMap = fn => NPCMAPS.push(fn), playerMap = fn => PLMAPS.push(fn);
  function runMaps(list, st, who) {
    const s = { act: null, upper: null, mood: [], talk: false, lookAt: null };
    for (const fn of list) { try { fn(st, who, s); } catch (e) { if (!fn.__err) { fn.__err = 1; console.warn('[anim] mappa', e); } } }
    return s;
  }
  const npcState = (st, n) => runMaps(NPCMAPS, st, n);
  const playerState = (st) => runMaps(PLMAPS, st, st.player);

  // ---------------- per fotogramma: chiamato da Models.animPerson dopo il mixer ----------------
  // o.anim = { act, upper, mood, talk, lookAt } (da npcState/playerState). Restituisce la clip di base voluta (o null).
  function want(g, o) {
    const A = o && o.anim; if (!A) return null;
    const p = A.act && POSES[A.act]; return p && p.base ? p.base : null;
  }
  function apply(g, o, dt, time) {
    const R = rig(g); if (!R) return;
    const A = (o && o.anim) || {}, u = g.userData;
    const wanted = {};
    if (A.act && POSES[A.act] && !o.down) wanted[A.act] = 1;
    if (A.upper && POSES[A.upper] && !o.down) wanted[A.upper] = 1;
    (A.mood || []).forEach(k => { if (POSES[k] && !o.down) wanted[k] = 1; });
    if (A.talk && POSES.parla && !o.down) wanted.parla = 1;
    if (POSES.vita && !o.down) wanted.vita = 1;   // respiro, peso che si sposta: sempre
    // pesi: salgono e scendono col fade della posa
    for (const k in wanted) if (!R.layers[k]) R.layers[k] = { w: 0, t: 0 };
    for (const k in R.layers) {
      const L = R.layers[k], spec = POSES[k], f = spec ? spec.fade : .2;
      L.w = clamp(L.w + (wanted[k] ? 1 : -1) * dt / Math.max(.01, f), 0, 1); L.t += dt;
      if (!wanted[k] && L.w <= 0) delete R.layers[k];
    }
    // il corpo torna al suo posto ogni fotogramma (le pose lo spostano; flight() in render.js lo sposta dopo, in volo)
    if (u.body && !u.__flying) { u.body.position.set(0, 0, 0); u.body.rotation.set(0, 0, 0); }
    // si fotografano le ossa come le ha lasciate la clip: restore() le rimette così prima del prossimo mixer
    // (le ossa che la clip non anima, altrimenti, accumulerebbero le rotazioni fotogramma dopo fotogramma)
    if (!R.pre) { R.pre = {}; for (const k in R.b) R.pre[k] = R.b[k].quaternion.clone(); }
    else for (const k in R.b) R.pre[k].copy(R.b[k].quaternion);
    // anche la POSIZIONE di piedi e punte: sono bersagli IK sotto Root, e la clip Idle non le anima (resterebbero dove le ha messe l'ultima posa)
    if (!R.prePos) { R.prePos = []; ['FootL', 'FootR', 'PTL', 'PTR'].forEach(k => { const o = R.b[k] || R.m.getObjectByName(k); if (o) R.prePos.push({ o, p: o.position.clone(), q: o.quaternion.clone() }); }); }
    else R.prePos.forEach(e => { e.p.copy(e.o.position); e.q.copy(e.o.quaternion); });
    // la punta del piede (PT, un osso a parte sotto Root, con la pelle della scarpa) deve seguire il piede:
    // si fotografa dov'è rispetto al piede prima delle pose e la si rimette lì dopo (sennò la scarpa si stira)
    toeSnap(g, R);
    // le ossa nel mondo servono aggiornate per puntare
    g.updateMatrixWorld(true);
    const P = R.P || (R.P = makeP(g, R)); g.getWorldQuaternion(P._gq);
    P.o = o; P.time = time || 0; P._body = null;
    R.__frame = (R.__frame || 0) + 1;
    // quanto sono spessi i vestiti su busto e braccia (vestiario.js): le pose tengono le braccia più larghe
    { const S = u.spessore; P.bulk = S ? Math.min(.12, (S.torso || 0) + (S.braccia || 0) * .5) : 0; }
    const showProps = {};
    // ordine: prima tutto il corpo, poi le braccia, poi gli strati leggeri, ultimo lo sguardo
    const order = Object.keys(R.layers).sort((a, b) => rank(a, A) - rank(b, A));
    for (const k of order) {
      const L = R.layers[k], spec = POSES[k]; if (!spec || disabled[k]) continue;
      P.w = smooth(L.w); P.t = L.t; P._props = null;
      try { spec.fn(P, A); } catch (e) { disabled[k] = true; console.warn('[anim] posa spenta:', k, e); }
      if (P._props && L.w > .5) P._props.forEach(n => showProps[n] = 1);
    }
    toeFollow(R);
    if (P._body && u.body) { const B = P._body; u.body.position.set(B.x, B.y, B.z); u.body.rotation.set(B.rx, B.ry, B.rz); }
    // lo sguardo: la testa gira verso il punto, con i limiti del collo e un po' di ritardo
    look(g, R, A.lookAt, dt, P);
    // attrezzi
    for (const n in PROPS) { const want = !!showProps[n]; if (!want && !(R.props && R.props[n])) continue; const h = getProp(g, R, n); if (h) h.visible = want; }
  }
  const _tm = new THREE.Matrix4(), _tq = Q(), _tp = V();
  function toeSnap(g, R) {
    if (R.toe === undefined) { R.toe = []; ['L', 'R'].forEach(sd => { const F = R.b['Foot' + sd], T = R.m.getObjectByName('PT' + sd); if (F && T && T.parent !== F) R.toe.push({ F, T, p: V(), q: Q() }); }); }
    if (!R.toe.length) return; g.updateMatrixWorld(true);
    for (const t of R.toe) { _tm.copy(t.F.matrixWorld).invert(); t.T.getWorldPosition(t.p).applyMatrix4(_tm); t.F.getWorldQuaternion(_tq).invert(); t.T.getWorldQuaternion(t.q).premultiply(_tq); }
  }
  function toeFollow(R) {
    if (!R.toe || !R.toe.length) return;
    for (const t of R.toe) {
      t.F.updateMatrixWorld(true); _tp.copy(t.p).applyMatrix4(t.F.matrixWorld); t.T.parent.worldToLocal(_tp); t.T.position.copy(_tp);
      t.F.getWorldQuaternion(_tq).multiply(t.q); t.T.parent.getWorldQuaternion(_q4); t.T.quaternion.copy(_q4.invert().multiply(_tq)); t.T.updateMatrixWorld(true);
    }
  }
  function restore(g) { const R = g.userData.rig; if (!R || !R.pre) return; for (const k in R.pre) R.b[k].quaternion.copy(R.pre[k]); if (R.prePos) R.prePos.forEach(e => { e.o.position.copy(e.p); e.o.quaternion.copy(e.q); }); }
  function rank(k, A) { return k === A.act ? 0 : k === A.upper ? 1 : k === 'vita' ? -1 : k === 'parla' ? 3 : 2; }
  function look(g, R, at, dt, P) {
    let yaw = 0, pitch = 0;
    if (at && R.b.Head) {
      R.b.Head.getWorldPosition(_a); _b.set(at.x, (at.ground ? g.position.y : 0) + at.y, at.z).sub(_a);   // ground: y è l'altezza sopra i piedi di chi guarda
      _b.applyQuaternion(_q.copy(P._gq).invert());          // nello spazio del personaggio
      yaw = clamp(Math.atan2(_b.x, _b.z), -1.2, 1.2); pitch = clamp(-Math.atan2(_b.y, Math.hypot(_b.x, _b.z)), -.5, .6);
      if (Math.abs(Math.atan2(_b.x, _b.z)) > 2.2) { yaw = 0; pitch = 0; }   // dietro le spalle: lascia perdere
    }
    const k = 1 - Math.exp(-dt * 6); R.headYaw += (yaw - R.headYaw) * k; R.headPitch += (pitch - R.headPitch) * k;
    if (Math.abs(R.headYaw) + Math.abs(R.headPitch) < .002) return;
    P.w = 1; P.rot('Neck', R.headPitch * .4, R.headYaw * .4, 0); P.rot('Head', R.headPitch * .6, R.headYaw * .6, 0);
  }

  return { restore, def, npcMap, playerMap, npcState, playerState, apply, want, prop, rig, POSES, PROPS, CHILD, clamp, smooth, hashStr };
})();

// ================= POSE DI BASE (motore) =================
// vita: sempre accesa, leggera. Il respiro alza il petto, il peso passa da un piede all'altro quando si sta fermi.
Anim.def('vita', { fade: .5, fn(P) {
  const still = Math.abs(P.o.speed || 0) < .2;
  P.rot('Chest', -.025 * (1 + P.wave(.25)), 0, 0);
  if (still) { P.rot('Hips', 0, 0, .025 * P.wave(.06)); P.rot('Head', .03 * P.wave(.11, 1), .06 * P.wave(.045, 2), 0); }
} });
// mappe di base: chi parla gesticola, chi è vicino al giocatore lo guarda
Anim.npcMap((st, n, s) => {
  if (n.dead) return;
  if (n.bark && n.bark.until > st.clock) s.talk = true;
  const p = st.player, d = Math.hypot(n.x - p.x, n.y - p.y);
  if (d < 7 && !(n.action && n.action.name === 'fugge')) s.lookAt = { x: p.x, y: 1.55, z: p.y, ground: true };
});
