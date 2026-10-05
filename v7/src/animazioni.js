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
  const BONES = ['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'FootL', 'UpperLegR', 'LowerLegR', 'FootR'];
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
    u.rig = { m, b, layers: {}, r: hashStr(String(g.id) + (u.model || '')), headYaw: 0, headPitch: 0, talkT: 0 };
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
        applyWorld(bn, _q); return P;
      },
      body(o) { P._body = P._body || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }; for (const k in o) P._body[k] += o[k] * P.w; return P; },
      base(c) { P._base = c; return P; },
      prop(name) { (P._props = P._props || []).push(name); return P; },
      wave: (f, ph) => Math.sin(P.t * f * Math.PI * 2 + (ph || 0) + P.r * 6.28),
      _gq: gq,
    };
    return P;
  }
  // ruota l'osso di q (quaternione nel mondo) e aggiorna i figli
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
    // le ossa nel mondo servono aggiornate per puntare
    g.updateMatrixWorld(true);
    const P = R.P || (R.P = makeP(g, R)); g.getWorldQuaternion(P._gq);
    P.o = o; P.time = time || 0; P._body = null;
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
    if (P._body && u.body) { const B = P._body; u.body.position.set(B.x, B.y, B.z); u.body.rotation.set(B.rx, B.ry, B.rz); }
    // lo sguardo: la testa gira verso il punto, con i limiti del collo e un po' di ritardo
    look(g, R, A.lookAt, dt, P);
    // attrezzi
    for (const n in PROPS) { const want = !!showProps[n]; if (!want && !(R.props && R.props[n])) continue; const h = getProp(g, R, n); if (h) h.visible = want; }
  }
  function restore(g) { const R = g.userData.rig; if (!R || !R.pre) return; for (const k in R.pre) R.b[k].quaternion.copy(R.pre[k]); }
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
