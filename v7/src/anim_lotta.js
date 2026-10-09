/* ================= ANIMAZIONI: combattimento, ferite, stati d'animo e del corpo =================
   Pose (vedi il motore in animazioni.js) e mappe che le scelgono dallo stato del gioco, per abitanti e protagonista.
   Questo file si carica DOPO anim_vita.js: le sue mappe girano dopo e, quando c'è lotta o pericolo, sovrascrivono
   s.act / s.upper della vita quotidiana (hanno la precedenza). Gli stati del corpo (ubriaco, freddo, ferito...) si
   aggiungono a s.mood e convivono con il resto.
   Pose di tutto il corpo (act): colpito, barcolla, stordito, rialza, calcio, schivata, rannicchiato, perquisisce,
     ammanetta, ammanettato, in_vespa, in_bmx, carica, salto
   Pose delle braccia (upper): mira (pistola a una o due mani, mitra all'anca, lupara e fucile alla spalla, coltello
     in guardia, molotov pronta), ricarica, lancia (la molotov), guardia (pugni alternati), spinta, mani_alzate, fuga,
     indica, alt
   Strati leggeri (mood): ubriaco, postumi, freddo, ferito, paura, rabbia, stanco
   Le mappe passano alle pose qualche numero in più dentro s (= A nelle pose):
     A.rinc (rinculo 0-1, NPC; il giocatore usa o.recoil), A.unaMano / A.dueMani (pistola), A.colpoK (0-1, fase del
     colpo: pugno, coltellata, calcio, spinta), A.colpoLato (+1 sinistro, -1 destro), A.ricK (0-1, avanzamento della
     ricarica), A.lancioK (0-1, avanzamento del lancio), A.dietro (colpito alle spalle), A.colpitoK (forza del colpo),
     A.ebbro (0-1), A.dolore (0-1), A.punta {x,z} (punto del mondo da indicare)
   Niente allocazioni per fotogramma: le direzioni passano per un vettore di appoggio, lo stato per persona sta in una
   WeakMap creata una volta sola. */
(function () {
  if (typeof Anim === 'undefined') return;
  const D = Anim.def, clamp = Anim.clamp, smooth = Anim.smooth;
  const GUN = { pistola: 1, mitra: 1, lupara: 1, fucile: 1 };
  const armaDi = o => (o.weapon && o.weapon !== 'guardia' ? o.weapon : null) || o.held || null;
  // direzioni senza creare array: aim legge subito i tre numeri
  const _v = [0, 0, 0];
  function AIM(P, b, x, y, z, w) { _v[0] = x; _v[1] = y; _v[2] = z; return P.aim(b, _v, w); }
  // lo stesso per i due lati: s = +1 sinistra, -1 destra (la x si specchia)
  function AIMS(P, side, b, x, y, z, w) { return AIM(P, b + (side > 0 ? 'L' : 'R'), x * side, y, z, w); }
  const lerp = (a, b, k) => a + (b - a) * k;
  const bump = k => k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI);          // 0 → 1 → 0
  const strike = k => k <= 0 || k >= 1 ? 0 : k < .3 ? smooth(k / .3) : 1 - smooth((k - .3) / .7);   // veloce all'andata, lento al ritorno

  // ---------------- ARMI ----------------
  // la molotov: bottiglia con lo straccio, nella mano destra
  Anim.prop('molotov', () => {
    const g = new THREE.Group(), M = c => new THREE.MeshLambertMaterial({ color: c });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .17, 8), M('#3c6a3a')); g.add(b);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(.016, .03, .08, 6), M('#3c6a3a')); n.position.y = .12; g.add(n);
    const r = new THREE.Mesh(new THREE.BoxGeometry(.035, .07, .03), M('#d8cfb4')); r.position.y = .18; r.rotation.z = .3; g.add(r);
    return g;
  }, 'WristR', [0, .11, .03], [0, 0, 0]);

  // ---- strumenti: la mano in un punto (due ossa, gomito verso il «polo») e la canna dell'arma in una direzione ----
  const V3 = () => new THREE.Vector3();
  const _S = V3(), _E = V3(), _T = V3(), _u = V3(), _pl = V3(), _a1 = V3(), _a2 = V3(), _m4 = new THREE.Matrix4();
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
  // posizione di un osso nello spazio del personaggio (in out)
  function local(P, k, out) { const b = P.bone(k); if (!b) return null; b.getWorldPosition(out); _m4.copy(P.g.matrixWorld).invert(); return out.applyMatrix4(_m4); }
  // porta il polso del lato (s: +1 sinistro, -1 destro) nel punto T (spazio del personaggio); il gomito va verso il polo
  function reach(P, side, tx, ty, tz, px, py, pz, w) {
    const L = side > 0 ? 'L' : 'R', up = 'UpperArm' + L, lo = 'LowerArm' + L, wr = 'Wrist' + L;
    if (!local(P, up, _S) || !local(P, lo, _E) || !local(P, wr, _a1)) return;
    const a = _S.distanceTo(_E), b = _E.distanceTo(_a1);
    _T.set(tx, ty, tz); _u.copy(_T).sub(_S); let d = _u.length(); if (d < 1e-4) return; _u.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, (a + b) * .999);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _pl.set(px, py, pz); _pl.addScaledVector(_u, -_pl.dot(_u)); if (_pl.lengthSq() < 1e-6) _pl.set(0, -1, 0); _pl.normalize();
    _E.copy(_S).addScaledVector(_u, x).addScaledVector(_pl, h);           // dove va il gomito
    _a1.copy(_E).sub(_S); AIM(P, up, _a1.x, _a1.y, _a1.z, w);
    _a2.copy(_S).addScaledVector(_u, d).sub(_E); AIM(P, lo, _a2.x, _a2.y, _a2.z, w);
  }
  // reach relativo alla spalla (la base del braccio): così vale per tutte le corporature. x positivo = verso il centro
  // (per tutti e due i lati), anche per il polo: px negativo = gomito in fuori
  function reachS(P, side, ox, oy, oz, px, py, pz, w) { const L = side > 0 ? 'L' : 'R', bk = P.bulk || 0; ox -= bk * .6; oz += bk * 1.2; px -= bk * 2;   // [vestiti] più largo sui cappotti
    if (!local(P, 'UpperArm' + L, _T)) return; reach(P, side, _T.x - ox * side, _T.y + oy, _T.z + oz, -px * side, py, pz, w); }
  // l'arma in mano: l'oggetto del modello e il suo asse (dall'impugnatura alla bocca), calcolato una volta sola
  function gunOf(P, w) { const u = P.g.userData, k = u.gunsByWeapon && u.gunsByWeapon[w]; return (k && u.mguns && u.mguns[k]) || null; }
  function gunAxis(gn) {
    if (gn.userData.__ax) return gn.userData.__ax;
    gn.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(gn.matrixWorld).invert(), box = new THREE.Box3(), tmp = new THREE.Box3(), m = new THREE.Matrix4();
    gn.traverse(o => { if (o.isMesh) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tmp.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(gi, o.matrixWorld)); box.union(tmp); } });
    const sz = box.getSize(V3()), c = box.getCenter(V3()), k = sz.x > sz.y && sz.x > sz.z ? 'x' : sz.y > sz.z ? 'y' : 'z';
    const e0 = c.clone(), e1 = c.clone(); e0[k] = box.min[k]; e1[k] = box.max[k];
    // la bocca è l'estremo più lontano dall'impugnatura (l'origine dell'arma, dove la tiene la mano)
    const ax = e1.length() >= e0.length() ? e1.clone().sub(e0) : e0.clone().sub(e1);
    gn.userData.__ax = ax.normalize(); gn.userData.__len = sz[k]; return gn.userData.__ax;
  }
  // gira il polso destro perché la canna punti nella direzione data (spazio del personaggio)
  function aimGun(P, w, x, y, z, wt) {
    const gn = gunOf(P, w), wr = P.bone('WristR'); if (!gn || !wr || !wr.parent) return;
    const ww = (wt === undefined ? 1 : wt) * P.w; if (ww <= 0) return;
    const ax = gunAxis(gn); gn.getWorldQuaternion(_q1); _a1.copy(ax).applyQuaternion(_q1).normalize();
    // [mani] l'avambraccio ruota e il polso piega entro un limite (niente polsi spezzati); le dita stringono l'impugnatura
    _v[0] = x; _v[1] = y; _v[2] = z; P.turnHand('R', _a1, _v, Math.PI, wt);   // armi: prima l'avambraccio, poi il polso quanto serve (la canna deve andare dove si mira)
    P.fingers('R', w === 'coltello' ? .95 : .85, .85, wt);
  }
  // un punto lungo la canna, a «dist» metri dall'impugnatura (spazio del personaggio): dove va la mano che sostiene
  function alongGun(P, w, dist, out) {
    const gn = gunOf(P, w); if (!gn) return null; const ax = gunAxis(gn);
    gn.getWorldPosition(out); gn.getWorldQuaternion(_q1); _a1.copy(ax).applyQuaternion(_q1).normalize();
    out.addScaledVector(_a1, dist * (P.g.userData.body ? P.g.userData.body.scale.y : 1));
    _m4.copy(P.g.matrixWorld).invert(); return out.applyMatrix4(_m4);
  }
  const _G = V3();
  // ---- le gambe. ATTENZIONE: in questi modelli i piedi (FootL/R) NON sono figli dello stinco: stanno sotto Root, come
  // bersagli di un IK cotto nelle clip, e lo stinco (LowerLeg) è una foglia. Ruotare la coscia lascia il piede dov'era e
  // la scarpa si stira fino a terra. Qui si fa l'IK a due ossa e si sposta anche il piede (posizione e rotazione).
  // Le coordinate del bersaglio sono nello spazio del personaggio DOPO P.body() (lo spostamento del corpo si toglie).
  const _K0 = V3(), _K1 = V3(), _F0 = V3(), _qk = new THREE.Quaternion(), _qf = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
  function rotWorld(bn, q) {   // ruota l'osso di q (nel mondo)
    bn.getWorldQuaternion(_q1); _q1.premultiply(q); bn.parent.getWorldQuaternion(_q2); _q2.invert(); bn.quaternion.copy(_q2.multiply(_q1)); bn.updateMatrixWorld(true);
  }
  // [anim] delega al motore: l'IK di prima lasciava lo stinco storto rispetto al piede e la scarpa si stirava
  function legIK(P, side, tx, ty, tz, px, py, pz, follow, w) {
    const B = P._body; if (B) { tx -= B.x; ty -= B.y; tz -= B.z; }
    P.legTo(side > 0 ? 'L' : 'R', tx, ty, tz, px, py, pz, 0, 0, w);
  }

  // tiene il piede dov'è ora (spazio del personaggio prima dello spostamento del corpo): quando il corpo si abbassa
  // o scarta di lato, la gamba si piega e il piede resta piantato
  function plant(P, side, w, dy, dz) {
    const L = side > 0 ? 'L' : 'R', F = P.bone('Foot' + L); if (!F) return;
    if (!local(P, 'Foot' + L, _G)) return;
    legIK(P, side, _G.x, _G.y + (dy || 0), _G.z + (dz || 0), side * .15, 0, 1, 0, w);
  }

  // pistola: a due mani (Weaver) o a una mano, tesa davanti; il rinculo alza le braccia e la canna
  function pistola(P, A, rec) {
    const una = A.unaMano || (!A.dueMani && P.r < .3), k = rec * .5;
    P.rot('Chest', -rec * .08, una ? -.28 : -.06, 0);
    P.rot('Neck', .04, una ? .15 : .04, 0); P.rot('Head', .05, una ? .12 : .03, 0);
    // la mano destra davanti al petto, braccio quasi teso, all'altezza degli occhi
    reachS(P, -1, una ? .1 : .16, .08 + k * .12, .42, -.6, -.6, 0);
    aimGun(P, 'pistola', 0, k * .9, 1);
    if (una) { reachS(P, 1, -.04, -.5, .04, -1, 0, -.2, .8); }
    else if (alongGun(P, 'pistola', .02, _G)) { reach(P, 1, _G.x + .01, _G.y - .05, _G.z - .03, .6, -.7, 0); P.fingers('L', .7, .7); }   // la sinistra avvolge la destra
  }
  // mitra (Skorpion): basso, all'anca, la sinistra sotto la canna; il rinculo è un tremito veloce
  function mitra(P, A, rec) {
    const j = rec * .1 * Math.sin(P.time * 70);
    P.rot('Chest', -rec * .04, -.15, 0);
    reachS(P, -1, -.02, -.32 + j * .2, .3, -.6, -.8, -.3);
    aimGun(P, 'mitra', 0, .02 + j + rec * .08, 1);
    if (alongGun(P, 'mitra', .22, _G)) reach(P, 1, _G.x, _G.y - .07, _G.z, .5, -.8, 0);  P.fingers('L', .7, .7);   // [mani] la sinistra avvolge
  }
  // lupara e fucile: alla spalla, il busto girato, la sinistra sotto la canna; il rinculo spinge indietro spalla e busto
  function spalla(P, A, rec) {
    const w = armaDi(P.o), k = rec * (w === 'lupara' ? .5 : .3);
    P.rot('Abdomen', -k * .2, -.2, 0); P.rot('Chest', -k * .3, -.2, 0);
    P.rot('Neck', .08, .22, 0); P.rot('Head', .1, .16, -.14);
    reachS(P, -1, -.01, -.05 + k * .05, .25 - k * .08, -.7, -.7, -.3);
    aimGun(P, w, 0, k * .8, 1);
    if (alongGun(P, w, w === 'lupara' ? .38 : .42, _G)) reach(P, 1, _G.x, _G.y - .08, _G.z, .5, -.8, 0);  P.fingers('L', .7, .7);   // [mani] la sinistra avvolge
  }
  // coltello: guardia bassa, lama avanti; A.colpoK fa la coltellata
  function coltello(P, A) {
    const e = strike(A.colpoK || 0);
    P.rot('Abdomen', .12 + e * .1, -.15 + e * .25, 0);
    reachS(P, -1, lerp(.06, .2, e), lerp(-.18, -.04, e), lerp(.32, .55, e), -.7, -.6, 0);
    aimGun(P, 'coltello', 0, lerp(.6, .1, e), 1);
    reachS(P, 1, -.1, -.06 + e * .05, lerp(.3, .12, e), -.6, -.7, 0);
  }
  // molotov pronta: bottiglia alta dietro la spalla (il caricamento), la sinistra avanti a prendere la mira
  function molotovPronta(P, A, w) {
    P.rot('Chest', -.06 * w, -.3 * w, 0);
    AIM(P, 'UpperArmR', -.9, .12, -.35, w); AIM(P, 'LowerArmR', .05, 1, -.3, w); AIM(P, 'WristR', 0, 1, -.1, w);
    AIM(P, 'UpperArmL', .3, -.05, 1, w); AIM(P, 'LowerArmL', .1, .1, 1, w);
    P.prop('molotov');
  }
  D('mira', { fade: .15, fn(P, A) {
    const w = armaDi(P.o);
    const rec = clamp(P.o.recoil !== undefined && P.o.recoil > 0 ? P.o.recoil : (A.rinc || 0), 0, 1.3);
    if (w === 'pistola') pistola(P, A, rec);
    else if (w === 'mitra') mitra(P, A, rec);
    else if (w === 'lupara' || w === 'fucile') spalla(P, A, rec);
    else if (w === 'coltello') coltello(P, A);
    else if (w === 'molotov') molotovPronta(P, A, 1);
  } });
  // ricarica: l'arma davanti al petto (la pistola e il mitra in su, la lupara spezzata in giù), la sinistra va alla
  // cintura a prendere il caricatore (o le cartucce), torna all'arma, lo infila; lo sguardo sull'arma
  const _B = V3();
  D('ricarica', { fade: .15, fn(P, A) {
    const w = armaDi(P.o), k = clamp(A.ricK || 0, 0, 1), lungo = w === 'lupara' || w === 'fucile';
    const toBelt = k < .2 ? smooth(k / .2) : k < .42 ? 1 - smooth((k - .2) / .22) : 0;   // la mano va alla cintura e torna
    const push = k > .42 && k < .75 ? Math.sin((k - .42) / .33 * Math.PI) : 0;             // infila il caricatore
    const shut = lungo && k > .82 ? smooth((k - .82) / .18) : 0;                           // la lupara si richiude con uno scatto
    P.rot('Abdomen', .06, -.12, 0); P.rot('Neck', .22, 0, 0); P.rot('Head', .28, -.1, 0);
    if (lungo) { reachS(P, -1, .02, -.3, .26, -.7, -.6, -.2); aimGun(P, w, .1, lerp(-.75, .15, shut), 1); }
    else { reachS(P, -1, .1, -.18, .3, -.7, -.6, 0); aimGun(P, w, .25, .55, 1); }
    // dove va la mano sinistra: sotto l'arma (all'impugnatura o alla culatta) oppure alla tasca della giacca
    if (!local(P, 'WristR', _G)) return;
    if (lungo && alongGun(P, w, .3, _B)) _G.copy(_B);
    _G.y -= lungo ? .06 : .12 - push * .05; _G.x += .03;
    if (!local(P, 'UpperArmL', _B)) return;
    _B.x += .07; _B.y -= .45; _B.z -= .02;                                                  // la tasca sinistra
    _G.lerp(_B, toBelt);
    reach(P, 1, _G.x, _G.y, _G.z, .6, -.7, -.2);
  } });
  // il lancio della molotov: dal caricamento dietro la spalla, il braccio passa sopra la testa e va avanti e in basso
  D('lancia', { fade: .06, fn(P, A) {
    const k = clamp(A.lancioK || 0, 0, 1);
    const a = smooth(clamp(k / .35, 0, 1)), f = smooth(clamp((k - .35) / .65, 0, 1));   // a: il braccio va avanti; f: torna giù
    P.rot('Abdomen', .15 * a, lerp(-.25, .3, a) - .2 * f, 0); P.rot('Chest', .2 * a - .1 * f, lerp(-.3, .25, a) * (1 - f), 0);
    if (a < 1) { AIM(P, 'UpperArmR', lerp(-.85, -.2, a), lerp(.35, .7, a), lerp(-.3, .7, a)); AIM(P, 'LowerArmR', lerp(-.05, .1, a), lerp(1, .3, a), lerp(-.35, 1, a)); }
    else { AIM(P, 'UpperArmR', lerp(-.2, .1, f), lerp(.7, -.6, f), lerp(.7, .8, f)); AIM(P, 'LowerArmR', .1, lerp(.3, -.7, f), lerp(1, .6, f)); }
    AIM(P, 'UpperArmL', lerp(.3, .8, a), lerp(-.05, -.55, a), lerp(1, -.35, a)); AIM(P, 'LowerArmL', lerp(.1, .3, a), lerp(.1, -.5, a), lerp(1, .3, a));
    if (k < .3) P.prop('molotov');
  } });

  // ---------------- CORPO A CORPO ----------------
  // guardia da pugile: pugni al mento, sinistro avanti; A.colpoK/A.colpoLato fanno partire il pugno
  // ---- le dita: pugno chiuso (k 0-1). Le dita che la clip non anima terrebbero la rotazione di ieri: si ricorda
  // la rotazione di base e quella messa da noi; se nessuno l'ha toccata nel frattempo, si riparte dalla base ----
  const FING = ['Index1', 'Index2', 'Index3', 'Middle1', 'Middle2', 'Middle3', 'Ring1', 'Ring2', 'Ring3', 'Pinky1', 'Pinky2', 'Pinky3', 'Thumb1', 'Thumb2'];
  const _fq = new THREE.Quaternion(), _fx = new THREE.Vector3(1, 0, 0);
  function dita(P, side) {
    const R = P.R, key = side > 0 ? 'fL' : 'fR'; if (R[key]) return R[key];
    const out = [], L = side > 0 ? 'L' : 'R';
    FING.forEach(n => { const b = R.m.getObjectByName(n + L); if (b) out.push({ b, base: b.quaternion.clone(), mine: b.quaternion.clone(), th: /^Thumb/.test(n) }); });
    return (R[key] = out);
  }
  function pugno(P, side, k) {
    const F = dita(P, side), ww = (k === undefined ? 1 : k) * P.w;
    for (let i = 0; i < F.length; i++) {
      const f = F[i], q = f.b.quaternion;
      if (!q.equals(f.mine)) f.base.copy(q);              // l'ha mossa la clip: quella è la nuova base
      _fq.setFromAxisAngle(_fx, (f.th ? .7 : 1.25) * ww);
      q.copy(f.base).multiply(_fq); f.mine.copy(q);
    }
  }
  // un pugno chiuso davanti al mento; e (0-1) lo porta in avanti, teso, verso il centro
  function fist(P, side, fwd, e, w) {
    reachS(P, side, lerp(.1, .2, e), lerp(.02, .08, e), lerp(fwd, .62, e), -.5, -.85, -.1, w);
    AIMS(P, side, 'Wrist', -.2, .05, 1, (w === undefined ? 1 : w) * .8);
    pugno(P, side, w);
  }
  function guardiaBraccia(P, w) { fist(P, -1, .2, 0, w); fist(P, 1, .3, 0, w); }
  D('guardia', { fade: .15, fn(P, A) {
    const e = strike(A.colpoK || 0), lato = A.colpoLato || -1;
    const bob = .03 * P.wave(1.6);
    P.rot('Abdomen', .1, -.18 - e * lato * .3, 0); P.rot('Chest', .05 + e * .08, -.1 - e * lato * .25, 0);
    P.rot('Neck', .12, .15, 0); P.rot('Head', .08, .1, 0);
    if (Math.abs(P.o.speed || 0) < .3) P.body({ y: -.04 + bob * .5 });
    fist(P, -1, .2, lato < 0 ? e : 0); fist(P, 1, .3, lato > 0 ? e : 0);
  } });
  // spinta: due mani avanti all'altezza del petto, il busto dietro
  D('spinta', { fade: .1, fn(P, A) {
    const e = strike(A.colpoK || 0) * .8 + .2;
    P.rot('Abdomen', .15 * e, 0, 0); P.rot('Chest', .1 * e, 0, 0);
    AIM(P, 'UpperArmR', -.15, lerp(-.6, -.05, e), lerp(.5, 1, e)); AIM(P, 'LowerArmR', .1, lerp(.4, .05, e), 1); AIM(P, 'WristR', 0, 1, .4 - e * .2);
    AIM(P, 'UpperArmL', .15, lerp(-.6, -.05, e), lerp(.5, 1, e)); AIM(P, 'LowerArmL', -.1, lerp(.4, .05, e), 1); AIM(P, 'WristL', 0, 1, .4 - e * .2);
  } });
  // calcio frontale: la gamba destra sale avanti, il busto va indietro, le braccia restano in guardia
  D('calcio', { fade: .08, base: 'Idle', fn(P, A) {
    const e = strike(A.colpoK || 0);
    P.rot('Abdomen', -.2 * e, -.1, 0); P.rot('Chest', -.1 * e, 0, 0);
    AIM(P, 'UpperLegR', 0, lerp(-1, .15, e), lerp(.05, 1, e)); AIM(P, 'LowerLegR', 0, lerp(-1, .05, e), lerp(-.05, 1, e)); AIM(P, 'FootR', 0, .2, 1, e);
    AIM(P, 'UpperLegL', 0, -1, -.15 * e); P.body({ z: -.08 * e, y: -.03 * e });
    guardiaBraccia(P, 1);
  } });
  // schivata: il busto scarta di lato e indietro, le braccia restano su
  D('schivata', { fade: .08, fn(P, A) {
    const e = bump(A.colpoK || 0), s = A.colpoLato || 1;
    P.body({ x: .14 * s * e, y: -.08 * e, rz: -.08 * s * e });
    P.rot('Abdomen', -.08 * e, 0, .25 * s * e); P.rot('Chest', -.05 * e, .15 * s * e, .2 * s * e);
    AIM(P, 'UpperLegL', .25 * (s > 0 ? 1 : .3), -1, 0, e * .6); AIM(P, 'UpperLegR', -.25 * (s < 0 ? 1 : .3), -1, 0, e * .6);
    guardiaBraccia(P, 1);
  } });
  // colpito: davanti il busto va indietro e la testa dietro; alle spalle il bacino va avanti e la schiena si inarca
  D('colpito', { fade: .05, fn(P, A) {
    const k = clamp(A.colpitoK === undefined ? 1 : A.colpitoK, 0, 1), e = Math.sin(Math.min(1, P.t / .35) * Math.PI) * k;
    if (A.dietro) {
      P.body({ z: .05 * e, rx: -.05 * e }); P.rot('Abdomen', -.25 * e, 0, 0); P.rot('Chest', -.2 * e, 0, 0); P.rot('Head', -.35 * e, 0, 0);
      AIM(P, 'UpperArmR', -.6, -.5, -.4, e * .7); AIM(P, 'UpperArmL', .6, -.5, -.4, e * .7);
    } else {
      P.body({ z: -.06 * e }); P.rot('Abdomen', -.18 * e, .1 * e, 0); P.rot('Chest', -.22 * e, .15 * e, .08 * e); P.rot('Head', -.3 * e, .2 * e, .15 * e);
      AIM(P, 'UpperArmR', -.6, -.25, .4, e * .6); AIM(P, 'UpperArmL', .6, -.25, .4, e * .6);
    }
  } });
  // barcolla: due passi incerti, il busto ondeggia, le braccia cercano l'equilibrio
  D('barcolla', { fade: .15, fn(P, A) {
    const s = P.wave(.9), s2 = P.wave(1.7, 1);
    P.body({ rz: .07 * s, x: .05 * s, rx: .05 + .03 * s2 });
    P.rot('Abdomen', .15, .1 * s2, -.1 * s); P.rot('Chest', .1, 0, -.08 * s); P.rot('Head', .2, .15 * s2, .2 * s);
    if (!A.upper) { AIM(P, 'UpperArmR', -.8, -.55, .1 + .2 * s, .7); AIM(P, 'UpperArmL', .8, -.55, .1 - .2 * s, .7); AIM(P, 'LowerArmR', -.4, -.6, .5, .5); AIM(P, 'LowerArmL', .4, -.6, .5, .5); }
  } });
  // stordito: in piedi ma intontito, una mano alla testa, le ginocchia molli
  D('stordito', { fade: .2, base: 'Idle', fn(P, A) {
    const s = P.wave(.45), c = P.wave(.3, 2);
    P.body({ y: -.05, rz: .05 * s, x: .04 * c });
    P.rot('Abdomen', .18, 0, 0); P.rot('Chest', .1, 0, .05 * s); P.rot('Neck', .2, 0, 0); P.rot('Head', .15 + .1 * c, .2 * s, .2 * c);
    AIM(P, 'UpperLegL', .05, -1, .15); AIM(P, 'UpperLegR', -.05, -1, .15); AIM(P, 'LowerLegL', 0, -1, -.15); AIM(P, 'LowerLegR', 0, -1, -.15);
    AIM(P, 'UpperArmR', -.55, .1, .8); AIM(P, 'LowerArmR', .75, .6, -.2); AIM(P, 'WristR', .5, .3, -.5, .6);
    AIM(P, 'UpperArmL', .35, -1, .1, .8);
  } });
  // rialzarsi da terra: da un ginocchio a terra, la mano sul ginocchio, si spinge su
  D('rialza', { fade: .04, base: 'Idle', fn(P, A) {
    const k = clamp(P.t / .95, 0, 1), d = 1 - smooth(clamp((k - .25) / .75, 0, 1));   // d: quanto è ancora giù
    P.body({ y: -.48 * d, rx: .3 * d });
    P.rot('Abdomen', .4 * d, 0, 0); P.rot('Chest', .2 * d, 0, 0); P.rot('Head', -.3 * d, 0, 0);
    AIM(P, 'UpperLegR', 0, -.25, 1, d); AIM(P, 'LowerLegR', 0, -1, .1, d);                  // piede destro avanti, piantato
    AIM(P, 'UpperLegL', 0, -1, -.05, d); AIM(P, 'LowerLegL', 0, -.15, -1, d); AIM(P, 'FootL', 0, -.3, -1, d);   // ginocchio sinistro a terra
    AIM(P, 'UpperArmR', -.15, -.75, .65, d); AIM(P, 'LowerArmR', .1, -.95, .2, d);          // mano sul ginocchio
    AIM(P, 'UpperArmL', .4, -.8, .4, d); AIM(P, 'LowerArmL', 0, -1, .1, d);
  } });

  // ---------------- PAURA E RESA ----------------
  // mani alzate: palmi avanti, spalle su, tremano; la testa bassa
  D('mani_alzate', { fade: .2, fn(P, A) {
    const t1 = .04 * P.wave(7.3), t2 = .04 * P.wave(6.1, 1.3);
    P.rot('Chest', -.05, 0, 0); P.rot('Neck', .15, 0, 0); P.rot('Head', .12 + t1, 0, 0);
    P.rot('ShoulderL', 0, 0, .15); P.rot('ShoulderR', 0, 0, -.15);
    AIM(P, 'UpperArmL', .9, .45 + t1, .12); AIM(P, 'LowerArmL', .05, 1, .18 + t2); AIM(P, 'WristL', 0, 1, -.15);
    AIM(P, 'UpperArmR', -.9, .45 + t2, .12); AIM(P, 'LowerArmR', -.05, 1, .18 + t1); AIM(P, 'WristR', 0, 1, -.15);
  } });
  // rannicchiato: accovacciato, la testa tra le braccia
  D('rannicchiato', { fade: .25, base: 'Idle', fn(P, A) {
    const t = .03 * P.wave(5.5);
    P.body({ y: -.5, z: -.05 });
    P.rot('Abdomen', .55, 0, 0); P.rot('Chest', .4, 0, t); P.rot('Neck', .4, 0, 0); P.rot('Head', .3, 0, 0);
    AIM(P, 'UpperLegL', .2, -.1, 1); AIM(P, 'UpperLegR', -.2, -.1, 1); AIM(P, 'LowerLegL', .05, -1, -.35); AIM(P, 'LowerLegR', -.05, -1, -.35);
    AIM(P, 'FootL', 0, -.2, 1); AIM(P, 'FootR', 0, -.2, 1);
    AIM(P, 'UpperArmL', .45, .55, .6); AIM(P, 'LowerArmL', -.75, .3, -.1); AIM(P, 'UpperArmR', -.45, .55, .6); AIM(P, 'LowerArmR', .75, .3, -.1);
  } });
  // fuga: sulla corsa, un braccio sopra la testa a ripararsi, l'altro che si agita
  D('fuga', { fade: .2, fn(P, A) {
    const s = P.wave(2.4), s2 = P.wave(3.1, 1);
    P.rot('Chest', .15, 0, 0); P.rot('Neck', .2, 0, 0);
    if (P.r < .5) { AIM(P, 'UpperArmL', .55, .6, .35); AIM(P, 'LowerArmL', -.8, .3, .1); AIM(P, 'UpperArmR', -.7, -.3 + .35 * s, .3 * s2, .85); AIM(P, 'LowerArmR', -.4, .2 + .5 * s2, .5, .7); }
    else { AIM(P, 'UpperArmR', -.55, .6, .35); AIM(P, 'LowerArmR', .8, .3, .1); AIM(P, 'UpperArmL', .7, -.3 + .35 * s, .3 * s2, .85); AIM(P, 'LowerArmL', .4, .2 + .5 * s2, .5, .7); }
  } });
  // indica: il braccio destro teso verso il punto A.punta («è lui!»), la sinistra sul fianco
  const _w = new THREE.Vector3(), _qi = new THREE.Quaternion();
  D('indica', { fade: .2, fn(P, A) {
    let x = 0, z = 1;
    if (A.punta) { P.g.getWorldPosition(_w); _w.set(A.punta.x - _w.x, 0, A.punta.z - _w.z); _qi.copy(P._gq).invert(); _w.applyQuaternion(_qi); x = _w.x; z = _w.z; const l = Math.hypot(x, z) || 1; x /= l; z /= l; }
    if (z < .2) { x = x < 0 ? -.9 : .9; z = .2; }   // dietro di sé non si indica: si resta di lato
    const jab = .06 * Math.max(0, P.wave(2.2));
    P.rot('Chest', -.04, clamp(Math.atan2(x, z) * .35, -.4, .4), 0);
    AIM(P, 'UpperArmR', x, .12 + jab, z); AIM(P, 'LowerArmR', x, .18 + jab, z); AIM(P, 'WristR', x, .2, z);
    AIM(P, 'UpperArmL', .45, -.85, -.15, .8); AIM(P, 'LowerArmL', -.55, -.1, -.4, .8);
  } });
  // alt: Guardia o Tutela, braccio sinistro teso col palmo avanti, la destra sulla fondina
  D('alt', { fade: .2, fn(P, A) {
    P.rot('Chest', -.06, .1, 0); P.rot('Head', -.05, 0, 0);
    AIM(P, 'UpperArmL', .12, .12, 1); AIM(P, 'LowerArmL', .05, .2, 1); AIM(P, 'WristL', 0, 1, .25);
    AIM(P, 'UpperArmR', -.35, -1, -.1); AIM(P, 'LowerArmR', .25, -.55, .45);
  } });
  // perquisisce: chino in avanti, le mani che tastano a turno
  D('perquisisce', { fade: .25, base: 'Idle', fn(P, A) {
    const s = P.wave(1.6), s2 = P.wave(1.6, Math.PI);
    P.rot('Abdomen', .35, 0, 0); P.rot('Chest', .15, .1 * s, 0); P.rot('Head', .2, 0, 0); P.body({ y: -.04 });
    AIM(P, 'UpperArmR', -.25, -.55 + .2 * s, .8); AIM(P, 'LowerArmR', .2, -.45 + .25 * s, 1); AIM(P, 'WristR', 0, -.3, 1);
    AIM(P, 'UpperArmL', .25, -.55 + .2 * s2, .8); AIM(P, 'LowerArmL', -.2, -.45 + .25 * s2, 1); AIM(P, 'WristL', 0, -.3, 1);
  } });
  // ammanetta: le mani avanti, basse, sui polsi di chi ha davanti
  D('ammanetta', { fade: .2, base: 'Idle', fn(P, A) {
    const s = .05 * P.wave(1.3);
    P.rot('Abdomen', .25, 0, 0); P.rot('Head', .25, 0, 0);
    AIM(P, 'UpperArmR', -.2, -.7, .7); AIM(P, 'LowerArmR', .45, -.35 + s, 1); AIM(P, 'UpperArmL', .2, -.7, .7); AIM(P, 'LowerArmL', -.45, -.35 - s, 1);
  } });
  // ammanettato: le mani dietro la schiena, le spalle indietro, la testa bassa
  D('ammanettato', { fade: .25, fn(P, A) {
    P.rot('Chest', -.08, 0, 0); P.rot('Neck', .2, 0, 0); P.rot('Head', .25, 0, 0);
    AIM(P, 'UpperArmL', .25, -.85, -.45); AIM(P, 'LowerArmL', -.8, -.15, -.35); AIM(P, 'WristL', -1, 0, -.1, .6);
    AIM(P, 'UpperArmR', -.25, -.85, -.45); AIM(P, 'LowerArmR', .8, -.15, -.35); AIM(P, 'WristR', 1, 0, -.1, .6);
  } });

  // ---------------- IN VESPA ----------------
  // seduto, le mani al manubrio, i piedi sulla pedana; il corpo è già alzato di 35 cm da render.js
  D('in_vespa', { fade: .1, base: 'Idle', fn(P, A) {
    P.body({ y: -.3, z: -.12 });
    P.rot('Abdomen', .08, 0, 0); P.rot('Chest', .06, 0, 0);
    AIM(P, 'UpperLegL', .12, -.15, 1); AIM(P, 'UpperLegR', -.12, -.15, 1); AIM(P, 'LowerLegL', 0, -1, .3); AIM(P, 'LowerLegR', 0, -1, .3);
    AIM(P, 'FootL', 0, -.1, 1); AIM(P, 'FootR', 0, -.1, 1);
    AIM(P, 'UpperArmL', .3, -.5, .8); AIM(P, 'LowerArmL', .15, -.05, 1); AIM(P, 'UpperArmR', -.3, -.5, .8); AIM(P, 'LowerArmR', -.15, -.05, 1);
  } });

  // ---------------- IN BMX ----------------
  // [bmx] seduto basso sul sellino, busto in avanti, braccia tese al manubrio alto, i piedi SUI PEDALI: le caviglie seguono
  // l'angolo delle pedivelle (A.crank, lo stesso che render.js dà al modello), le ginocchia salgono e scendono come nei
  // fotogrammi di una pedalata vera. A.carica (0-1): si accuccia prima del bunny hop; A.aria: in aria tira su il manubrio.
  // Le misure sono quelle di bmxMesh (BMX_GEO in render.js); il corpo è già alzato di 35 cm da render.js (LIFT).
  const BMX = { bbY: .29, bbZ: -.04, crank: .17, pedX: .14, seatY: .81, seatZ: -.27, gripY: 1.04, gripZ: .22, gripX: .32, pegX: .19, pegY: .31, pegZ: -.5, LIFT: .35 };
  const _bp = new THREE.Vector3(), _bs = new THREE.Vector3(), _be = new THREE.Vector3(), _bt = new THREE.Vector3(), _bw = new THREE.Vector3();
  const bmxLocal = (P, bone, out) => { P.R.b[bone].getWorldPosition(out); return P.g.worldToLocal(out); };
  // braccio a due ossa: il polso in (tx,ty,tz) nello spazio del personaggio, gomito verso il basso e in fuori
  function armTo(P, sd, tx, ty, tz) {
    const R = P.R, ub = 'UpperArm' + sd, lb = 'LowerArm' + sd, wb = 'Wrist' + sd; if (!R.b[ub] || !R.b[lb] || !R.b[wb]) return;
    if (!R['arm' + sd]) { bmxLocal(P, ub, _bs); bmxLocal(P, lb, _be); bmxLocal(P, wb, _bw); R['arm' + sd] = [_bs.distanceTo(_be), _be.distanceTo(_bw)]; }
    const [a, b] = R['arm' + sd], sg = sd === 'L' ? 1 : -1;
    bmxLocal(P, ub, _bs); _bt.set(tx, ty, tz); _bp.subVectors(_bt, _bs); let d = _bp.length(); if (d < 1e-4) return; _bp.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, a + b - .005);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _bw.set(sg * .55, -1, -.25); _bw.addScaledVector(_bp, -_bw.dot(_bp)).normalize();
    _be.copy(_bs).addScaledVector(_bp, x).addScaledVector(_bw, h).sub(_bs);
    AIM(P, ub, _be.x, _be.y, _be.z, 1);
    bmxLocal(P, lb, _be); _bt.sub(_be); AIM(P, lb, _bt.x, _bt.y, _bt.z, 1);
  }
  D('in_bmx', { fade: .12, base: 'Idle', fn(P, A) {
    const R = P.R, th = A.crank || 0, ck = A.carica || 0, air = A.aria || 0, wk = A.impenna || 0, pk = Math.abs(A.peg || 0), ps = (A.peg || 0) > 0 ? 1 : -1;
    // impennata (freccia giù): il corpo ruota già con la bici (render.js); qui ci si tira indietro a braccia tese.
    // pedalina (frecce destra/sinistra): in piedi, il piede di quel lato sul peg dietro, il corpo fuori da quel lato
    if (R.hipY === undefined && R.b.Hips) { bmxLocal(P, 'Hips', _bp); R.hipY = _bp.y; R.hipZ = _bp.z; }
    // il sedere sul sellino; caricando si abbassa e va indietro, in aria si raccoglie in avanti
    const By = (BMX.seatY + .08 - BMX.LIFT) - (R.hipY || .95) + .06 * ck + .08 * air + .1 * pk, Bz = BMX.seatZ - .06 - (R.hipZ || 0) - .1 * ck + .06 * air - .05 * wk - .04 * pk, Bx = ps * .09 * pk;   // carica: su dal sellino e indietro, come prima di un bunny hop
    P.body({ x: Bx, y: By, z: Bz, rz: .035 * Math.sin(th) * (1 - air) * (1 - pk) - ps * .05 * pk });
    P.rot('Abdomen', .45 + .3 * ck + .1 * air - .3 * wk + .3 * pk, 0, 0); P.rot('Chest', .2, .06 * Math.sin(th), 0); P.rot('Neck', -.3 - .1 * ck, 0, 0); P.rot('Head', -.25, 0, 0);
    // i piedi sui pedali: destra a th, sinistra di fronte (th + π); la caviglia sta 7 cm sopra il pedale, la punta in avanti
    [['R', -1, th], ['L', 1, th + Math.PI]].forEach(([sd, sg, a]) => {
      let px = sg * BMX.pedX, py = BMX.bbY + BMX.crank * Math.cos(a) + .035, pz = BMX.bbZ + BMX.crank * Math.sin(a) - .07;   // la caviglia: sopra il pedale e un po' dietro, così ci poggia l'avampiede
      if (sg === ps && pk > 0) { px += (sg * BMX.pegX - px) * pk; py += (BMX.pegY - py) * pk; pz += (BMX.pegZ - pz) * pk; }   // sul peg dietro
      P.legTo(sd, px - Bx, py - BMX.LIFT - By, pz - Bz, sg * .2, .4, 1, .12 * Math.sin(a) - .05, .05);
    });
    // le mani sulle manopole: il polso sta dietro la manopola, così la mano la stringe (in aria le tira verso il petto)
    ['L', 'R'].forEach(sd => { const sg = sd === 'L' ? 1 : -1; armTo(P, sd, sg * BMX.gripX - Bx, BMX.gripY + .02 - BMX.LIFT - By + .08 * air, BMX.gripZ - .08 - Bz - .06 * air); P.fingers(sd, .85, .7); });
  } });
  // ---------------- SALTO A PIEDI ----------------
  // [salto] carica: ci si accuccia (più carichi, più giù), le braccia indietro; in aria: ginocchia al petto, braccia su
  D('carica', { fade: .08, base: 'Idle', fn(P, A) {
    const k = A.carica || 0, dn = .08 + .2 * k;
    P.body({ y: -dn }); P.rot('Abdomen', .25 + .25 * k, 0, 0); P.rot('Head', -.2 * k, 0, 0);
    P.legTo('L', .13, .09 + dn, .06, .1, 0, 1, 0, .1); P.legTo('R', -.13, .09 + dn, .06, -.1, 0, 1, 0, .1);
    AIMS(P, 1, 'UpperArm', .2, -.7, -.5 * k); AIMS(P, -1, 'UpperArm', .2, -.7, -.5 * k); AIMS(P, 1, 'LowerArm', .1, -.6, -.2); AIMS(P, -1, 'LowerArm', .1, -.6, -.2);
  } });
  D('salto', { fade: .06, fn(P, A) {
    const up = A.su ? 1 : 0, tuck = A.raccolto || 0;
    P.rot('Abdomen', .15 + .2 * tuck, 0, 0);
    P.legTo('L', .12, .25 + .3 * tuck, .12 + .1 * tuck, .1, .3, 1, .2, .1); P.legTo('R', -.12, .15 + .25 * tuck, -.05, -.1, .3, 1, -.1, .1);
    AIMS(P, 1, 'UpperArm', .35, .3 + .4 * up, .5); AIMS(P, -1, 'UpperArm', .35, .3 + .4 * up, .5); AIMS(P, 1, 'LowerArm', .1, .6, .4); AIMS(P, -1, 'LowerArm', .1, .6, .4);
  } });

  // ---------------- STATI DEL CORPO E DELL'ANIMO (strati leggeri) ----------------
  // ubriaco: il corpo ondeggia, la testa ciondola, le braccia larghe; A.ebbro dà la forza
  D('ubriaco', { fade: .6, fn(P, A) {
    const k = clamp(A.ebbro === undefined ? .7 : A.ebbro, 0, 1), s = P.wave(.38), s2 = P.wave(.23, 2), mv = Math.abs(P.o.speed || 0) > .3;
    P.body({ rz: .07 * k * s, x: .05 * k * s2, ry: (mv ? .12 : .04) * k * s2 });
    P.rot('Abdomen', .06 * k, 0, -.06 * k * s); P.rot('Chest', 0, .1 * k * s2, .05 * k * s);
    P.rot('Neck', .12 * k, 0, 0); P.rot('Head', .1 * k + .08 * k * s2, .1 * k * s, .18 * k * s);
    if (!A.upper && !A.act) { AIM(P, 'UpperArmL', .45, -1, .05, .5 * k); AIM(P, 'UpperArmR', -.45, -1, .05, .5 * k); }
  } });
  // postumi: la testa pesante e bassa, le spalle giù; da fermo una mano alla fronte ogni tanto
  D('postumi', { fade: .6, fn(P, A) {
    P.rot('Chest', .1, 0, 0); P.rot('Neck', .2, 0, 0); P.rot('Head', .15, 0, .05 * P.wave(.15));
    P.rot('ShoulderL', 0, 0, -.06); P.rot('ShoulderR', 0, 0, .06);
    const still = Math.abs(P.o.speed || 0) < .2, h = still && !A.upper && !A.act ? clamp(P.wave(.07) * 3 - 1.5, 0, 1) : 0;
    if (h > 0) { AIM(P, 'UpperArmL', .25, -.1, .9, h); AIM(P, 'LowerArmL', -.55, .8, .1, h); P.rot('Head', .15 * h, 0, 0); }
  } });
  // freddo: spalle strette e alte, braccia strette al petto, tremito
  D('freddo', { fade: .6, fn(P, A) {
    const t = .025 * Math.sin(P.time * 47 + P.r * 9), t2 = .02 * Math.sin(P.time * 39);
    P.rot('ShoulderL', 0, .12, .18); P.rot('ShoulderR', 0, -.12, -.18);
    P.rot('Chest', .1, t2, t); P.rot('Neck', .1, 0, 0); P.rot('Head', .05 + t, 0, 0);
    if (!A.upper && !(A.act && A.act !== 'ubriaco')) {
      AIM(P, 'UpperArmL', .2, -.75, .45); AIM(P, 'LowerArmL', -.9, .25 + t, .25);
      AIM(P, 'UpperArmR', -.2, -.75, .45); AIM(P, 'LowerArmR', .9, .35 + t2, .3);
    }
  } });
  // ferito: si tiene il fianco con la sinistra, piegato da quella parte; zoppica camminando
  D('ferito', { fade: .5, fn(P, A) {
    const k = clamp(A.dolore === undefined ? 1 : A.dolore, 0, 1), sp = Math.abs(P.o.speed || 0);
    P.rot('Abdomen', .15 * k, 0, .1 * k); P.rot('Chest', .08 * k, 0, .06 * k); P.rot('Head', .1 * k, 0, 0);
    if (sp > .25) { const ph = Math.max(0, Math.sin(P.time * sp * 3.4)); P.body({ y: -.05 * ph * k, rz: .06 * ph * k }); }
    if (!A.upper) { AIM(P, 'UpperArmL', .45, -.85, .25, k); AIM(P, 'LowerArmL', -.55, -.15, .7, k); AIM(P, 'WristL', -.7, -.3, .3, .6 * k); }
  } });
  // paura: curvo, la testa che si guarda attorno a scatti, braccia strette
  D('paura', { fade: .4, fn(P, A) {
    const look = Math.sin(P.time * 1.3 + P.r * 7), dart = look > .4 ? .55 : look < -.4 ? -.55 : 0;
    P.rot('Abdomen', .1, 0, 0); P.rot('Chest', .12, 0, 0); P.rot('ShoulderL', 0, 0, .1); P.rot('ShoulderR', 0, 0, -.1);
    if (!A.lookAt) { P.rot('Neck', .05, dart * .4, 0); P.rot('Head', .05, dart * .6, 0); }
    if (!A.upper && !A.act) { AIM(P, 'UpperArmL', .15, -1, .2, .5); AIM(P, 'UpperArmR', -.15, -1, .2, .5); AIM(P, 'LowerArmL', -.3, -.6, .6, .4); AIM(P, 'LowerArmR', .3, -.6, .6, .4); }
  } });
  // rabbia: petto in fuori, spalle aperte, testa avanti e bassa, braccia rigide un po' larghe, respiro pesante
  D('rabbia', { fade: .4, fn(P, A) {
    const br = .03 * P.wave(.6);
    P.rot('Abdomen', .06, 0, 0); P.rot('Chest', -.12 - br, 0, 0); P.rot('ShoulderL', 0, -.1, 0); P.rot('ShoulderR', 0, .1, 0);
    P.rot('Neck', .2, 0, 0); P.rot('Head', .05, 0, 0);
    if (!A.upper && !A.act) { AIM(P, 'UpperArmL', .4, -1, -.05, .6); AIM(P, 'UpperArmR', -.4, -1, -.05, .6); AIM(P, 'LowerArmL', .1, -1, .35, .5); AIM(P, 'LowerArmR', -.1, -1, .35, .5); }
  } });
  // stanco: spalle cadenti, testa giù, un lento dondolio; da fermo, ogni tanto uno sbadiglio con la mano alla bocca
  D('stanco', { fade: .6, fn(P, A) {
    P.rot('Chest', .14, 0, .03 * P.wave(.12)); P.rot('Neck', .15, 0, 0); P.rot('ShoulderL', 0, 0, -.08); P.rot('ShoulderR', 0, 0, .08);
    const still = Math.abs(P.o.speed || 0) < .2, y = still && !A.upper && !A.act ? clamp(P.wave(.05, 1) * 4 - 3, 0, 1) : 0;
    P.rot('Head', .18 - y * .55, 0, 0);
    if (y > 0) { AIM(P, 'UpperArmR', -.2, -.3, .9, y); AIM(P, 'LowerArmR', .4, .9, .15, y); }
  } });

  // =============================== MAPPE ===============================
  const W_ = () => (window.Game && Game.WEAPONS) || {};
  const ST = new WeakMap();   // stato per persona (una volta sola): tempi dei colpi, dei pugni, delle cadute
  function memo(who) { let m = ST.get(who); if (!m) { m = { mag: -1, shotT: -99, gest: 0, hitAt: -99, strikeT: -99, side: 1, kick: false, wasDown: false, downT: 0, upT: -99, longDown: false, punch: 0, punchT: -99, cur: '', throwT: -99, shoveT: -99, dodgeT: -99, dodgeS: 1 }; ST.set(who, m); } return m; }
  const hourOf = st => ((st.t / 60) % 24 + 24) % 24;
  const isNight = st => { const h = hourOf(st); return h >= 20.5 || h < 6; };
  const raining = st => !!(window.Render && Render.isRaining && Render.isRaining(st.t));
  const KICK = { pistola: .45, mitra: .25, lupara: 1, fucile: .7 };
  // a terra → in piedi: segna quando si rialza (per 'rialza' e 'stordito')
  function downTrack(m, down, clock) {
    if (down && !m.wasDown) m.downT = clock;
    if (!down && m.wasDown) { m.upT = clock; m.longDown = clock - m.downT > .6; }
    m.wasDown = down;
  }
  // dopo una caduta: prima ci si rialza, poi si resta intontiti un momento
  function afterFall(m, clock, s) {
    if (!m.longDown) return false;
    const dt = clock - m.upT;
    if (dt < .95) { s.act = 'rialza'; return true; }
    if (dt < 2.6) { s.act = 'stordito'; return true; }
    return false;
  }
  function moodsOf(s, list) { for (let i = 0; i < list.length; i++) if (s.mood.indexOf(list[i]) < 0) s.mood.push(list[i]); }

  // ---------------- ABITANTI ----------------
  Anim.npcMap((st, n, s) => {
    if (n.dead || n.inside) return;
    const m = memo(n), clock = st.clock, p = st.player, a = n.action ? n.action.name : '';
    const E = n.pop && n.pop.emer, brawl = !!(E && (E.kind === 'rissa' || E.kind === 'picchia' || E.kind === 'uccidi'));
    const down = n.stun > 0, sp = Math.abs(n.speedNow || 0);
    downTrack(m, down, clock);
    const dx = p.x - n.x, dz = p.y - n.y, dP = Math.hypot(dx, dz);
    // armato? (stessa regola di render.js) oppure con un'arma in mano dentro un piano di violenza
    const WP = W_();
    let gun = null;
    if (n.weapon && (a === 'combatte' || (n.cop && window.Game && Game.hostile(st, n)))) gun = n.weapon;
    else if (n.hand && WP[n.hand] && !WP[n.hand].melee && !WP[n.hand].throw) gun = n.hand;
    // colpi sparati: il caricatore che cala (combatte) o le munizioni del piano (azioni)
    const mag = gun ? (a === 'combatte' ? n.mag : (n.pop && n.pop.ammo ? n.pop.ammo[gun] || 0 : 0)) : -1;
    if (gun && m.mag >= 0 && mag < m.mag) m.shotT = clock;
    m.mag = mag;
    // gesti di lotta (azioni.js mette n.gesture = .35 a ogni colpo): un nuovo colpo quando il gesto risale
    const g = n.gesture || 0;
    if (brawl && g > m.gest + .1) { m.strikeT = clock; m.side = -m.side; m.kick = !n.hand && sp < .3 && Math.random() < .2; }
    m.gest = g;
    // schivata: il giocatore tira un pugno da vicino e non lo prende
    if (p.punch > 0 && p.punch > m.punch + .05 && dP < 2 && (brawl || a === 'affronta' || a === 'combatte')) { m.dodgeT = clock; m.dodgeS = Math.random() < .5 ? 1 : -1; }
    m.punch = p.punch || 0;
    if (down) return;   // a terra: resta la clip Death
    // ---- stati del corpo (strati leggeri) ----
    const N = n.pop && n.pop.need;
    if (n.hp < (n.maxHp || 60) * .35) { s.mood.push('ferito'); s.dolore = 1 - n.hp / ((n.maxHp || 60) * .35) * .5; }
    if (N) {
      if (N.paura > .6 && a !== 'combatte') s.mood.push('paura');
      else if (N.rabbia > .6) s.mood.push('rabbia');
      if (N.sonno > .85) s.mood.push('stanco');
    }
    if (n.pop && n.pop.vice === 'vino' && !gun && !brawl) { const h = hourOf(st); if ((h >= 21.5 || h < 3) && Anim.hashStr(n.id + '') < .7) { s.mood.push('ubriaco'); s.ebbro = .5 + Anim.hashStr(n.id + 'v') * .4; } }
    if (!n.cop && !n.military && (isNight(st) || raining(st)) && Anim.hashStr(n.id + 'f') < .3) s.mood.push('freddo');
    // ---- azioni (hanno la precedenza sulla vita quotidiana) ----
    if (afterFall(m, clock, s)) return;
    // colpito: davanti o alle spalle, rispetto a chi ha colpito (il giocatore, se ha appena sparato o colpito)
    const sinceHit = clock - (n.hitT || -99);
    if (sinceHit < .4) {
      s.act = 'colpito'; s.colpitoK = 1;
      const fx = Math.cos(n.face), fz = Math.sin(n.face);
      s.dietro = dP < 30 && fx * dx + fz * dz < 0;
    } else if (sinceHit < 1.6 && n.hp < (n.maxHp || 60) * .5 && sp < 2) s.act = 'barcolla';
    // la Guardia: perquisizione, manette, l'alt
    if (n.cop && a === 'perquisisce' && sp < .3) s.act = 'perquisisce';
    if (st.moments && st.moments.length) for (let i = 0; i < st.moments.length; i++) { const M = st.moments[i]; if (M.kind === 'jail' && M.until > clock && M.npcs && M.npcs[1] === n.id) s.act = 'ammanetta'; }
    if (n.jailedUntil > st.t) { s.act = 'ammanettato'; return; }
    if (gun) {
      if (a === 'combatte' && n.reloadT > 0) { s.upper = 'ricarica'; s.ricK = 1 - n.reloadT / (((WP[gun] && WP[gun].reload) || 1.2) * 1.2); }
      else { s.upper = 'mira'; s.rinc = Math.max(0, 1 - (clock - m.shotT) * 9) * (KICK[gun] || .5); s.unaMano = !n.cop && !n.military && Anim.hashStr(n.id + 'p') < .45; s.dueMani = !s.unaMano; }
      s.lookAt = { x: p.x, y: 1.4, z: p.y, ground: true };
      return;
    }
    if (brawl || (a === 'affronta' && dP < 2.2)) {
      const k = (clock - m.strikeT) / .45;
      if (clock - m.dodgeT < .45) { s.act = 'schivata'; s.colpoK = (clock - m.dodgeT) / .45; s.colpoLato = m.dodgeS; }
      if (n.hand === 'coltello') { s.upper = 'mira'; s.colpoK = k < 1 ? k : 0; }
      else if (a === 'affronta' && !brawl) {
        // chi affronta: rabbia addosso, e la spinta quando la dà (game.js: shoveAt = adesso + 6)
        if (n.shoveAt && clock - (n.shoveAt - 6) < .5) { s.upper = 'spinta'; s.colpoK = (clock - (n.shoveAt - 6)) / .5; }
        else if (dP < 2.2) { s.upper = 'indica'; s.punta = { x: p.x, z: p.y }; }
        moodsOf(s, ['rabbia']);
      } else if (m.kick && k < 1) { s.act = 'calcio'; s.colpoK = k; s.upper = null; }
      else { s.upper = 'guardia'; s.colpoK = k < 1 ? k : 0; s.colpoLato = m.side; }
      return;
    }
    if (a === 'fugge') {
      if (n.panic > 0) { if (sp < .5) s.act = 'rannicchiato'; else if (sp > 2.5) s.upper = 'fuga'; }
      else if (dP < 9 && p.cur && p.cur !== 'pugni' && p.cur !== 'molotov') { s.upper = 'mani_alzate'; s.act = null; }
      moodsOf(s, ['paura']);
      return;
    }
    if (n.panic > 0 && !n.faction && !n.cop) { moodsOf(s, ['paura']); if (sp < .4) s.act = 'rannicchiato'; return; }
    // la Guardia intima l'alt (allerta 1: non spara ancora)
    if (n.cop && a === 'insegue' && dP < 12 && window.Game && Game.wantedLevel && Game.wantedLevel(st) === 1) { s.upper = 'alt'; s.lookAt = { x: p.x, y: 1.5, z: p.y, ground: true }; return; }
    // «è lui!»: chi denuncia davanti a un agente, o chi riconosce il giocatore («Sei quello che...»)
    const bk = n.bark && n.bark.until > clock ? n.bark.text || '' : '';
    if (bk && (bk.indexOf('Sei quello che') === 0 || bk.indexOf('Agente') === 0 || bk.indexOf('È lui') === 0) && dP < 20) { s.upper = 'indica'; s.punta = { x: p.x, z: p.y }; }
  });

  // ---------------- PROTAGONISTA ----------------
  Anim.playerMap((st, p, s) => {
    const m = memo(p), clock = st.clock;
    downTrack(m, p.stun > 0, clock);
    // in Vespa: seduto, mani al manubrio; in auto non si vede
    if (p.vehicle) {
      let v = null; const vs = st.vehicles || []; for (let i = 0; i < vs.length; i++) if (vs[i].id === p.vehicle) { v = vs[i]; break; }
      if (v && v.kind === 'vespa') { s.act = 'in_vespa'; s.upper = null; s.mood.length = 0; }
      if (v && v.kind === 'bmx') { s.act = 'in_bmx'; s.upper = null; s.mood.length = 0; s.crank = v.crank || 0; s.carica = p.jcharge != null ? clamp(p.jcharge / .7, 0, 1) : 0; s.aria = p.jz > 0 ? clamp(p.jz / .5, 0, 1) : 0; s.impenna = v.wheelie || 0; s.peg = v.peg || 0; }   // [bmx]
      return;
    }
    // [salto] a piedi: accucciato mentre carichi, raccolto in aria (sotto quello che fanno le braccia: si può saltare con la pistola in mano)
    if (p.jz > 0 && !(p.stun > 0)) { s.act = 'salto'; s.su = (p.jvz || 0) > 0; s.raccolto = clamp(p.jz / .6, 0, 1); }
    else if (p.jcharge != null && !(p.stun > 0)) { s.act = 'carica'; s.carica = clamp(p.jcharge / .7, 0, 1); }
    // il lancio della molotov: p.punch risale mentre in mano c'è (o c'era) la molotov
    const pu = p.punch || 0;
    if (pu > m.punch + .05) {
      if (p.cur === 'molotov' || m.cur === 'molotov') m.throwT = clock;
      else { m.punchT = clock; m.side = -m.side; }
    }
    m.punch = pu; m.cur = p.cur;
    if (p.stun > 0) return;
    // stati del corpo
    const M = st.me;
    if (M) {
      if (M.drunk > .25) { s.mood.push('ubriaco'); s.ebbro = clamp((M.drunk - .15) * 1.3, 0, 1); }
      else if (M.hangover > .3) s.mood.push('postumi');
      if (M.need && M.need.sonno > .75) s.mood.push('stanco');
    }
    if (window.Guardaroba && Guardaroba.warmth) {
      if (clock - (m.warmT || -99) > 2) { m.warmT = clock; try { m.warm = Guardaroba.warmth(st); } catch (e) { m.warm = 1; } }
      const cold = !p.indoor && (m.warm < .3 || (m.warm < .55 && (isNight(st) || raining(st))));
      if (cold) s.mood.push('freddo');
    }
    if (p.hp < 35) { s.mood.push('ferito'); s.dolore = 1 - p.hp / 70; }
    // arrestato: mani dietro la schiena mentre lo portano dentro
    if (st.moments) for (let i = 0; i < st.moments.length; i++) { const Mo = st.moments[i]; if (Mo.kind === 'arrest' && Mo.until > clock) { s.act = 'ammanettato'; s.upper = null; return; } }
    if (afterFall(m, clock, s)) return;
    if (clock - (p.hurtT || -99) < .4) { s.act = 'colpito'; s.colpitoK = .8; s.dietro = false; }
    const WP = W_(), W = WP[p.cur];
    // molotov: lancio, poi di nuovo pronta (se ne restano)
    if (clock - m.throwT < .6) { s.upper = 'lancia'; s.lancioK = (clock - m.throwT) / .6; return; }
    if (p.cur === 'molotov') { s.upper = 'mira'; return; }
    if (GUN[p.cur]) {
      if (p.reload > 0) { s.upper = 'ricarica'; s.ricK = 1 - p.reload / ((W && W.reload) || 1.2); }
      else { s.upper = 'mira'; s.dueMani = true; }
      return;
    }
    if (p.cur === 'coltello') { s.upper = 'mira'; const k = (clock - m.punchT) / .4; s.colpoK = k < 1 ? k : 0; return; }
    // pugni: in guardia per qualche secondo dopo l'ultimo pugno o l'ultimo colpo preso
    if (clock - m.punchT < 3 || clock - (p.hurtT || -99) < 2.5) { s.upper = 'guardia'; const k = (clock - m.punchT) / .4; s.colpoK = k < 1 ? k : 0; s.colpoLato = m.side; }
  });
})();
