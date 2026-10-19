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
   Le pose si registrano con Anim.def(nome, { fn(P), full, base, fade, air }) e si scelgono con le «mappe»:
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
  const CHILD = { UpperArmL: 'LowerArmL', LowerArmL: 'WristL', UpperArmR: 'LowerArmR', LowerArmR: 'WristR', UpperLegL: 'LowerLegL', LowerLegL: 'FootL', UpperLegR: 'LowerLegR', LowerLegR: 'FootR', Neck: 'Head', Chest: 'Neck', Torso: 'Chest', Abdomen: 'Torso', Hips: 'Abdomen', ShoulderL: 'UpperArmL', ShoulderR: 'UpperArmR',
    // il polso punta lungo la mano, verso la nocca del medio: le radici delle dita (Index1...) stanno a 2-3 cm dal polso, di lato,
    // e puntare verso quelle girava la mano di traverso
    WristL: 'Middle2L', WristR: 'Middle2R' };
  const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'], FB = [];
  ['L', 'R'].forEach(sd => { FINGERS.forEach(f => [1, 2, 3, 4].forEach(k => FB.push(f + k + sd))); [1, 2, 3].forEach(k => FB.push('Thumb' + k + sd)); });
  const BONES = FB.concat(['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'FootL', 'UpperLegR', 'LowerLegR', 'FootR']);
  const disabled = {};
  const HAND = .85;   // [mani] scala delle mani (vedi rig)
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
    // [mani] le mani del kit sono grandi (14 cm dal polso alle nocche, una mano vera ne fa ~10): si rimpiccioliscono un po'
    const hs = {}; ['L', 'R'].forEach(sd => { const w = b['Wrist' + sd]; if (w) hs[sd] = w.scale.clone(); });
    u.rig = { shin, m, b, hs, layers: {}, r: hashStr(String(g.id) + (u.model || '')), headYaw: 0, headPitch: 0, talkT: 0 };
    for (const sd in hs) b['Wrist' + sd].scale.copy(hs[sd]).multiplyScalar(HAND);
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
      // dita una per una: c = [indice, medio, anulare, mignolo] (0 aperto → 1 chiuso); per indicare: P.fingerEach('R', [0, 1, 1, 1], .8)
      fingerEach(side, c, thumb, w) { hand(P, side, c, thumb === undefined ? .5 : thumb, (w === undefined ? 1 : w) * P.w); return P; },
      // gira la mano perché la direzione A (vettore del MONDO, solidale alla mano: la canna, il manico) vada verso dir
      // (spazio del personaggio). Prima ruota l'avambraccio sul suo asse (pronazione, fino a ~95°), il resto lo fa il polso
      // entro maxWrist radianti (default 0,7): niente polsi spezzati; se non basta, l'attrezzo resta un po' fuori asse.
      turnHand(side, A, dir, maxWrist, w) { turn(P, side, A, dir, maxWrist === undefined ? .7 : maxWrist, (w === undefined ? 1 : w) * P.w); return P; },
      // [mani] presa vera: il centro del pugno nel punto (x, y, z) (spazio del personaggio, prima di P.body), la mano orientata
      // con X (dal mignolo al pollice per la destra, dal pollice al mignolo per la sinistra: per tutte e due «verso +x» se
      // impugnano una barra di traverso con le nocche avanti) lungo ax, e le dita verso fy; il gomito verso il polo p.
      // il polso in (x, y, z) (spazio del personaggio, prima di P.body), il gomito verso il polo p: IK a due ossa
      reach(side, x, y, z, p, w) { armIK(P, side === 'L' ? 'L' : 'R', _rT.set(x, y, z), p || [0, -1, -.3], (w === undefined ? 1 : w) * P.w); return P; },
      // [mani] come grab, ma la mano resta IN LINEA con l'avambraccio (polso dritto): si dà solo il verso del palmo (pz),
      // le dita seguono l'avambraccio che esce dall'IK (tre passate: orientamento → IK → orientamento)
      hold(side, x, y, z, pz, p, w) { hold(P, side === 'L' ? 'L' : 'R', x, y, z, pz, p || [0, -1, -.3], (w === undefined ? 1 : w) * P.w); return P; },
      grab(side, x, y, z, ax, fy, p, w) { grab(P, side === 'L' ? 'L' : 'R', x, y, z, ax, fy, p || [0, -1, -.3], (w === undefined ? 1 : w) * P.w); return P; },
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
  const _f1 = V(), _f2 = V(), _ax = V(), _fq = Q(), _tw = Q(), _sw = Q(), _tA = V(), _tB = V(), _tT = V();
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
      const c = Array.isArray(curl) ? curl[f] : curl * (1 + (f - 1.5) * .06);   // il mignolo chiude un filo di più
      for (let k = 0; k < 4; k++) {
        const b = R.b[FINGERS[f] + (k + 1) + sd]; if (!b) continue;
        i2.getWorldPosition(_f1); p2.getWorldPosition(_f2); _ax.subVectors(_f1, _f2).normalize();   // asse delle nocche (si muove poco)
        _fq.setFromAxisAngle(_ax, sg * CURL[k] * c * ww); applyWorld(b, _fq);
      }
    }
    // il pollice: la sua punta va verso la falange di mezzo dell'indice (già chiuso): ruota la radice, poi la punta si piega.
    // Prima girava su assi fissi e nel pugno restava dritto, come un pollice alzato.
    const t1 = R.b['Thumb1' + sd], t2 = R.b['Thumb2' + sd], t3 = R.b['Thumb3' + sd], i3 = R.b['Index3' + sd], m3 = R.b['Middle3' + sd];
    if (t1 && t2 && t3 && i3 && m3 && thumb > 0) {
      const k = clamp(thumb, 0, 1) * ww;
      t1.getWorldPosition(_f1); t3.getWorldPosition(_tA); t2.getWorldPosition(_tB);
      _tT.copy(_tA).sub(_tB).multiplyScalar(.9).add(_tA);                 // la punta (oltre l'ultima falange)
      i3.getWorldPosition(_tB); m3.getWorldPosition(_f2); _tB.lerp(_f2, Array.isArray(curl) && curl[0] < .5 ? 1 : .3); // dove va: sopra indice e medio (sul medio, se l'indice è teso)
      _tT.sub(_f1); _tB.sub(_f1);
      if (_tT.lengthSq() > 1e-10 && _tB.lengthSq() > 1e-10) { _fq.setFromUnitVectors(_tT.normalize(), _tB.normalize()); _sw.copy(ID).slerp(_fq, k * .85); applyWorld(t1, _sw); }
      i2.getWorldPosition(_f1); p2.getWorldPosition(_f2); _ax.subVectors(_f1, _f2).normalize();
      _fq.setFromAxisAngle(_ax, sg * .5 * k); applyWorld(t3, _fq);
    }
  }
  // ---------------- la presa ----------------
  const QH = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), QHI = QH.clone().invert();
  const _gx = V(), _gy = V(), _gz = V(), _gm = new THREE.Matrix4(), _gq = Q(), _gS = V(), _gE = V(), _gW = V(), _gT = V(), _gU = V(), _gN = V(), _gI = new THREE.Matrix4();
  function grab(P, sd, x, y, z, ax, fy, pole, ww) {
    const R = P.R, ua = R.b['UpperArm' + sd], la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd], m2 = R.b['Middle2' + sd]; if (!ua || !la || !wr || !m2 || ww <= 0) return;
    if (ww > .5) R['grab' + sd] = R.__frame;   // presa scelta a mano: i limiti del polso non la ritoccano
    // l'orientamento voluto della mano (spazio del personaggio → mondo)
    _gx.set(ax[0], ax[1], ax[2]).normalize(); _gy.set(fy[0], fy[1], fy[2]); _gz.crossVectors(_gx, _gy).normalize(); _gy.crossVectors(_gz, _gx).normalize();
    _gm.makeBasis(_gx, _gy, _gz); _gq.setFromRotationMatrix(_gm).premultiply(P._gq);
    // dove sta il centro del pugno rispetto al polso (misurato sul kit: 11,8 cm lungo le dita e 2,2 verso il palmo, su 14,1 alle nocche)
    wr.getWorldPosition(_gW); m2.getWorldPosition(_gT); const k = _gT.distanceTo(_gW) / .141;
    _gU.set(0, .118 * k, .022 * k).applyQuaternion(_gq);
    _gI.copy(P.g.matrixWorld).invert();
    _gT.set(x, y, z); P.g.localToWorld(_gT); _gT.sub(_gU).applyMatrix4(_gI);       // il polso, nello spazio del personaggio
    armIK(P, sd, _gT, pole, ww);
    // il polso: dalla rotazione attuale a quella voluta (mano = polso · QH)
    _gq.multiply(QHI); wr.getWorldQuaternion(_q4); _q.copy(_gq).multiply(_q4.invert()); _gq.copy(ID).slerp(_q, ww); applyWorld(wr, _gq);   // (applyWorld usa _q2 e _q3 per sé)
  }
  const _hY = V(), _hZ = V(), _hX = V(), _hE = V(), _hW = V(), _hI = new THREE.Matrix4(), _hA = [0, 0, 0], _hB = [0, 0, 0];
  function hold(P, sd, x, y, z, pz, pole, ww) {
    const R = P.R, la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd], ua = R.b['UpperArm' + sd]; if (!la || !wr || !ua || ww <= 0) return;
    // prima stima: le dita dalla spalla verso il punto
    _hI.copy(P.g.matrixWorld).invert(); ua.getWorldPosition(_hE).applyMatrix4(_hI); _hY.set(x, y, z).sub(_hE).normalize();
    for (let i = 0; i < 3; i++) {
      _hZ.set(pz[0], pz[1], pz[2]); _hZ.addScaledVector(_hY, -_hZ.dot(_hY)).normalize(); _hX.crossVectors(_hY, _hZ).normalize();
      _hA[0] = _hX.x; _hA[1] = _hX.y; _hA[2] = _hX.z; _hB[0] = _hY.x; _hB[1] = _hY.y; _hB[2] = _hY.z;
      grab(P, sd, x, y, z, _hA, _hB, pole, ww);
      _hI.copy(P.g.matrixWorld).invert(); la.getWorldPosition(_hE).applyMatrix4(_hI); wr.getWorldPosition(_hW).applyMatrix4(_hI); _hY.subVectors(_hW, _hE).normalize();
    }
  }
  // IK a due ossa del braccio: il polso in T (spazio del personaggio, prima di P.body), il gomito verso il polo
  function armIK(P, sd, T, pole, ww) {
    const R = P.R, ua = R.b['UpperArm' + sd], la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd]; if (!ua || !la || !wr || ww <= 0) return;
    _gI.copy(P.g.matrixWorld).invert(); if (T !== _gT) _gT.copy(T);
    ua.getWorldPosition(_gS).applyMatrix4(_gI); la.getWorldPosition(_gE).applyMatrix4(_gI); wr.getWorldPosition(_gW).applyMatrix4(_gI);
    const a = _gS.distanceTo(_gE), b = _gE.distanceTo(_gW);
    _gU.subVectors(_gT, _gS); let d = _gU.length(); if (d < 1e-4) return; _gU.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, (a + b) * .998);
    const xx = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - xx * xx));
    _gN.set(pole[0], pole[1], pole[2]); _gN.addScaledVector(_gU, -_gN.dot(_gU)); if (_gN.lengthSq() < 1e-8) _gN.set(0, -1, 0); _gN.normalize();
    _gE.copy(_gS).addScaledVector(_gU, xx).addScaledVector(_gN, h);
    const w0 = P.w; P.w = ww;
    _gW.subVectors(_gE, _gS); P.aim('UpperArm' + sd, [_gW.x, _gW.y, _gW.z], 1);
    _gW.copy(_gS).addScaledVector(_gU, d).sub(_gE); P.aim('LowerArm' + sd, [_gW.x, _gW.y, _gW.z], 1);
    P.w = w0;
  }
  const _rT = V();
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
    for (const sd in R.hs) R.b['Wrist' + sd].scale.copy(R.hs[sd]).multiplyScalar(HAND);
    const A = (o && o.anim) || {}, u = g.userData;
    const wanted = {};
    if (A.act && POSES[A.act] && !o.down) wanted[A.act] = 1;
    if (A.upper && POSES[A.upper] && !o.down) wanted[A.upper] = 1;
    (A.mood || []).forEach(k => { if (POSES[k] && !o.down) wanted[k] = 1; });
    if (A.talk && POSES.parla && !o.down) wanted.parla = 1;
    if (POSES.vita && !o.down) wanted.vita = 1;   // respiro, peso che si sposta: sempre
    // pesi: salgono e scendono col fade della posa
    for (const k in wanted) if (!R.layers[k]) R.layers[k] = { w: 0, t: 0 };
    // [anim] niente scatti: si entra in una posa in almeno 0,1 s e se ne esce in almeno 0,18 (uscire è più lento, come nei
    // gesti veri); una posa chiesta a fotogrammi alterni resta accesa per 0,12 s invece di sfarfallare
    for (const k in R.layers) {
      const L = R.layers[k], spec = POSES[k], f = spec ? spec.fade : .2;
      if (wanted[k]) L.gone = 0; else L.gone = (L.gone || 0) + dt;
      const on = wanted[k] || (L.gone < .12 && !o.down);
      L.w = clamp(L.w + (on ? dt / Math.max(.1, f) : -dt / Math.max(.18, f * 1.3)), 0, 1); L.t += dt;
      if (!on && L.w <= 0) delete R.layers[k];
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
    P._air = !!(A.act && POSES[A.act] && POSES[A.act].air);   // in sella o in aria: i piedi non cercano il pavimento
    limits(P, R);
    toeFollow(R);
    if (P._body && u.body) { const B = P._body; u.body.position.set(B.x, B.y, B.z); u.body.rotation.set(B.rx, B.ry, B.rz); }
    // lo sguardo: la testa gira verso il punto, con i limiti del collo e un po' di ritardo
    look(g, R, A.lookAt, dt, P);
    // attrezzi
    for (const n in PROPS) { const want = !!showProps[n]; if (!want && !(R.props && R.props[n])) continue; const h = getProp(g, R, n); if (h) h.visible = want; }
  }
  // ---------------- limiti delle articolazioni (dopo tutte le pose) ----------------
  // polso: la mano resta entro WRIST_MAX dall'asse dell'avambraccio (niente polsi spezzati, qualunque cosa chiedano le pose);
  // ginocchio: lo stinco non si piega mai in avanti rispetto alla coscia (il ginocchio va davanti alla linea anca-caviglia)
  const WRIST_MAX = 1.2, _l1 = V(), _l2 = V(), _l3 = V(), _lqa = Q();
  function limits(P, R) {
    for (const sd of ['L', 'R']) { untwist(P, R, sd); collide(P, R, sd); }
    for (const sd of ['L', 'R']) {
      const la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd], m2 = R.b['Middle2' + sd];
      if (la && wr && m2 && R['grab' + sd] !== R.__frame) {
        la.getWorldPosition(_l1); wr.getWorldPosition(_l2); m2.getWorldPosition(_l3);
        _l3.sub(_l2); _l2.sub(_l1);
        if (_l2.lengthSq() > 1e-8 && _l3.lengthSq() > 1e-8) {
          _l2.normalize(); _l3.normalize(); const a = Math.acos(clamp(_l2.dot(_l3), -1, 1));
          if (a > WRIST_MAX) { _lqa.setFromUnitVectors(_l3, _l2); _q.copy(ID).slerp(_lqa, (a - WRIST_MAX) / a); applyWorld(wr, _q); }
          deviation(R, sd, wr, m2);
        }
      }
      knee(P, R, sd);
      ground(P, R, sd);
    }
  }
  // piedi a terra: se una posa abbassa il corpo (P.body con y negativo) e il piede finirebbe sotto il pavimento, la gamba
  // si piega e il piede resta appoggiato (prima rannicchiato, gesso, stordito... avevano le scarpe sotto terra).
  // Non vale da sdraiati o in volo (corpo ruotato, o sollevato da render.js).
  const FOOT_Y = .02;
  function ground(P, R, sd) {
    const B = P._body; if (!B || B.y >= 0 || P._air || Math.abs(B.rx) > .35 || Math.abs(B.rz) > .35 || P.g.userData.__flying) return;
    const ft = R.b['Foot' + sd]; if (!ft) return;
    ft.getWorldPosition(_kA).applyMatrix4(_kI.copy(P.g.matrixWorld).invert());
    if (_kA.y + B.y >= FOOT_Y - .015) return;
    const w = P.w; P.w = 1; legTo(P, sd, _kA.x, FOOT_Y - B.y, _kA.z, sd === 'L' ? .15 : -.15, .1, 1, 0, sd === 'L' ? .15 : .15, 1); P.w = w;
  }
  // ---- torsioni: niente avvitamenti netti ----
  // Le pose girano le ossa in tanti passi; sommati, il braccio può finire avvitato sul suo asse (spalla «strizzata») o la mano
  // girata tutta nel polso. Qui, rispetto alla clip di base (R.pre): il braccio non gira sul suo asse oltre UA_TW (il gomito
  // resta dov'è, l'avambraccio si ripunta allo stesso polso, la mano resta com'era); la rotazione della mano si divide fra
  // avambraccio (60%) e polso (40%), come fanno radio e ulna, entro i loro limiti.
  const UA_TW = .45, LA_TW = 1.3, WR_TW = .5, _uA = Q(), _uB = Q(), _uY = new THREE.Vector3(0, 1, 0), _uW = V(), _uE = V(), _uI = new THREE.Matrix4();
  function twistOf(b, pre) { _uA.copy(pre).invert().multiply(b.quaternion); let a = 2 * Math.atan2(_uA.y, _uA.w); if (a > Math.PI) a -= 2 * Math.PI; if (a < -Math.PI) a += 2 * Math.PI; return a; }
  function spinLocal(b, a) { _uB.setFromAxisAngle(_uY, a); b.quaternion.multiply(_uB); b.updateMatrixWorld(true); }
  function keepHand(wr, Qw) { wr.parent.getWorldQuaternion(_q4); wr.quaternion.copy(_q4.invert().multiply(Qw)); wr.updateMatrixWorld(true); }
  function untwist(P, R, sd) {
    const ua = R.b['UpperArm' + sd], la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd]; if (!ua || !la || !wr || !R.pre) return;
    const Qw = wr.getWorldQuaternion(Q());
    const tu = twistOf(ua, R.pre['UpperArm' + sd]);
    if (Math.abs(tu) > UA_TW) {
      wr.getWorldPosition(_uW);
      spinLocal(ua, -(tu - clamp(tu, -UA_TW, UA_TW)));
      la.getWorldPosition(_uE); _uI.copy(P.g.matrixWorld).invert();
      _uW.applyMatrix4(_uI); _uE.applyMatrix4(_uI); _uW.sub(_uE);
      const w0 = P.w; P.w = 1; P.aim('LowerArm' + sd, [_uW.x, _uW.y, _uW.z], 1); P.w = w0;
      keepHand(wr, Qw);
    }
    // la mano rispetto al braccio: quanto gira in tutto, e come si divide
    const tl = twistOf(la, R.pre['LowerArm' + sd]), tw = twistOf(wr, R.pre['Wrist' + sd]), tot = tl + tw;
    const nl = clamp(tot * .6, -LA_TW, LA_TW);
    if (Math.abs(nl - tl) > .03) { spinLocal(la, nl - tl); keepHand(wr, Qw); }
    const tw2 = twistOf(wr, R.pre['Wrist' + sd]); if (Math.abs(tw2) > WR_TW) spinLocal(wr, -(tw2 - clamp(tw2, -WR_TW, WR_TW)));
  }
  // ---- compenetrazioni: gomiti e mani fuori dal busto e dalla testa ----
  // Il busto è un'ellisse (larga e profonda come il torace, più lo spessore dei vestiti) lungo l'asse bacino-collo; la testa
  // una sfera. Un gomito dentro il busto si sposta sulla superficie (il braccio lo segue, la mano resta); una mano dentro il
  // busto o la testa si sposta fuori e il braccio si riadatta (IK), con la mano girata come prima.
  const _cC = V(), _cH = V(), _cN = V(), _cU = V(), _cS = V(), _cF = V(), _cP = V(), _cL = V(), _cR = V(), _cW = V(), _cE = V(), _cM = V(), _cX = new THREE.Matrix4();
  function inTorso(p, out) {   // true se dentro; out = il punto sulla superficie
    _cP.subVectors(p, _cH); const L = _cH.distanceTo(_cN), u = _cP.dot(_cU);
    if (u < L * .12 || u > L * 1.04) return false;
    const a = .155 + _cBulk, b = .115 + _cBulk, sx = _cP.dot(_cS), fz = _cP.dot(_cF), r = (sx / a) * (sx / a) + (fz / b) * (fz / b);
    if (r >= 1) return false;
    const k = 1.04 / Math.sqrt(Math.max(r, 1e-4)); let ns = sx * k, nf = fz * k; if (r < 1e-3) { ns = 0; nf = b * 1.04; }
    out.copy(_cH).addScaledVector(_cU, u).addScaledVector(_cS, ns).addScaledVector(_cF, nf); return true;
  }
  let _cBulk = 0;
  function inHead(p, out, R) {
    const h = R.b.Head; if (!h) return false; h.getWorldPosition(_cM); _cL.subVectors(_cM, _cN).normalize(); _cM.addScaledVector(_cL, .1);
    const d = p.distanceTo(_cM), rad = .125; if (d >= rad) return false;
    out.subVectors(p, _cM); if (out.lengthSq() < 1e-8) out.set(0, 0, 1); out.normalize().multiplyScalar(rad * 1.03).add(_cM); return true;
  }
  function collide(P, R, sd) {
    const b = R.b, ua = b['UpperArm' + sd], la = b['LowerArm' + sd], wr = b['Wrist' + sd], m2 = b['Middle2' + sd];
    if (!ua || !la || !wr || !m2 || !b.Hips || !b.Neck || !b.ShoulderL || !b.ShoulderR) return;
    const sc = P.g.getWorldScale(_cE).x || 1;   // le misure sono in metri: il personaggio può essere scalato
    _cBulk = (P.bulk || 0) * .8;
    b.Hips.getWorldPosition(_cH); b.Neck.getWorldPosition(_cN); _cU.subVectors(_cN, _cH).normalize();
    b.ShoulderL.getWorldPosition(_cS); b.ShoulderR.getWorldPosition(_cL); _cS.sub(_cL); _cS.addScaledVector(_cU, -_cS.dot(_cU)).normalize(); _cF.crossVectors(_cS, _cU);
    if (sc !== 1) _cBulk *= sc;
    const Qw = wr.getWorldQuaternion(Q()); _cX.copy(P.g.matrixWorld).invert();
    // il gomito
    la.getWorldPosition(_cE);
    if (inTorso(_cE, _cR)) {
      wr.getWorldPosition(_cW); ua.getWorldPosition(_cP);
      const w0 = P.w; P.w = 1;
      _cM.subVectors(_cR, _cP).transformDirection(_cX); P.aim('UpperArm' + sd, [_cM.x, _cM.y, _cM.z], 1);
      la.getWorldPosition(_cE); _cM.subVectors(_cW, _cE).transformDirection(_cX); P.aim('LowerArm' + sd, [_cM.x, _cM.y, _cM.z], 1);
      P.w = w0; keepHand(wr, Qw);
    }
    // la mano (il centro del palmo: a metà fra polso e nocche)
    wr.getWorldPosition(_cW); m2.getWorldPosition(_cM); const hc = _cC.copy(_cW).lerp(_cM, .55);
    if (inTorso(hc, _cR) || inHead(hc, _cR, R)) {
      _cR.sub(hc).add(_cW).applyMatrix4(_cX);                                        // il nuovo polso, spazio del personaggio
      la.getWorldPosition(_cE); ua.getWorldPosition(_cP); wr.getWorldPosition(_cW); _cM.copy(_cP).lerp(_cW, .5); _cE.sub(_cM).transformDirection(_cX);
      armIK(P, sd, _cR, [_cE.x, _cE.y, _cE.z], 1); keepHand(wr, Qw);
    }
  }
  // deviazione laterale del polso (verso il pollice / verso il mignolo): una mano vera arriva a ~20° e ~35°, non come in avanti.
  // Si scompone la direzione della mano nel piano avambraccio-nocche e si riporta l'angolo dentro i limiti.
  const DEV_RAD = .35, DEV_ULN = .6, _dF = V(), _dK = V(), _dN = V(), _dH = V(), _dP = V();
  function deviation(R, sd, wr, m2) {
    const la = R.b['LowerArm' + sd], i2 = R.b['Index2' + sd], p2 = R.b['Pinky2' + sd]; if (!la || !i2 || !p2) return;
    la.getWorldPosition(_dF); wr.getWorldPosition(_dP); _dF.subVectors(_dP, _dF).normalize();            // avambraccio
    m2.getWorldPosition(_dH); _dH.sub(_dP).normalize();                                                  // mano
    i2.getWorldPosition(_dK); p2.getWorldPosition(_dN); _dK.sub(_dN); _dK.addScaledVector(_dF, -_dK.dot(_dF)); if (_dK.lengthSq() < 1e-8) return; _dK.normalize();   // verso il pollice
    _dN.crossVectors(_dF, _dK);                                                                          // normale al palmo
    const hf = _dH.dot(_dF), hk = _dH.dot(_dK), hn = _dH.dot(_dN), dev = Math.atan2(hk, Math.max(1e-4, hf));
    const lim = clamp(dev, -DEV_ULN, DEV_RAD); if (Math.abs(lim - dev) < .01 || hf <= 0) return;
    const r = Math.sqrt(Math.max(0, 1 - hn * hn));
    _dP.copy(_dF).multiplyScalar(Math.cos(lim) * r).addScaledVector(_dK, Math.sin(lim) * r).addScaledVector(_dN, hn);
    _lqa.setFromUnitVectors(_dH, _dP.normalize()); applyWorld(wr, _lqa);
  }
  const _kH = V(), _kK = V(), _kA = V(), _kM = V(), _kI = new THREE.Matrix4();
  function knee(P, R, sd) {
    const ul = R.b['UpperLeg' + sd], ll = R.b['LowerLeg' + sd], ft = R.b['Foot' + sd]; if (!ul || !ll || !ft) return;
    _kI.copy(P.g.matrixWorld).invert();
    ul.getWorldPosition(_kH).applyMatrix4(_kI); ll.getWorldPosition(_kK).applyMatrix4(_kI); ft.getWorldPosition(_kA).applyMatrix4(_kI);
    _kM.subVectors(_kA, _kH); const L = _kM.length(); if (L < .05) return; _kM.divideScalar(L);
    const t = _l1.subVectors(_kK, _kH).dot(_kM); _kM.multiplyScalar(t).add(_kH);   // il punto della linea anca-caviglia più vicino al ginocchio
    const off = _kK.sub(_kM);
    // ginocchio dietro la linea (z negativo nello spazio del personaggio) di più di 2 cm: gamba piegata al contrario
    if (off.z > -.02 || Math.abs(off.x) > Math.abs(off.z) * 1.5) return;
    const w = P.w; P.w = 1; legTo(P, sd, _kA.x, _kA.y, _kA.z, 0, .2, 1, 0, 0, 1); P.w = w;
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

  return { HAND, restore, def, npcMap, playerMap, npcState, playerState, apply, want, prop, rig, POSES, PROPS, CHILD, clamp, smooth, hashStr };
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
  // [passo] il giocatore si guarda per un motivo: se ti conoscono, se hai un'arma o corri, se ti parlano, se passi rasente
  // (un'occhiata di un paio di secondi, ognuno col suo ritardo), non tutti insieme ogni volta che passi
  if (d > 9 || (n.action && n.action.name === 'fugge')) { n.__gl = 0; return; }
  const armed = p.cur && p.cur !== 'pugni' && p.arms && p.arms[p.cur], fast = Math.hypot(p.vx || 0, p.vy || 0) > 3 || p.sprint;
  const knows = n.op && (n.op.trust > .3 || n.op.grudge > .3 || n.op.fear > .4), talking = n.bark && n.bark.until > st.clock && d < 4;
  if (!n.__gl && d < 2.6) n.__gl = st.clock + .25 + (n.__ph2 = n.__ph2 || ((String(n.id).length * 7919 + 13) % 97) / 97) * .6;   // l'occhiata arriva un attimo dopo
  const glance = n.__gl && st.clock > n.__gl && st.clock < n.__gl + 1.8;
  if (knows || talking || ((armed || fast) && d < 8) || glance) s.lookAt = { x: p.x, y: 1.55, z: p.y, ground: true };
  if (d > 4) n.__gl = 0;
});
