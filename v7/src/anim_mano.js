/* ================= ANIMAZIONI: quello che si ha in mano =================
   Chiunque può impugnare un oggetto dell'inventario (azioni.js: n.hand = id; il giocatore dalla Tasca: p.hand = id), ma il
   modello aveva pronti solo pochi attrezzi (models.js: bomboletta, telefono, fotocamera, piede, gesso, manganello, cartello;
   le armi del kit). Per tutto il resto la mano restava vuota e il braccio penzolava.
   Qui ogni oggetto prende la sagoma della sua famiglia (le stesse delle icone del Menu: MenuUI.famOf) e un modo di tenerlo:
     pugno   stretto davanti al fianco, il pollice in su (bottiglia, latta, attrezzo piccolo, pacchetto...)
     lungo   il braccio giù, l'attrezzo orizzontale in avanti (ascia, sega, pala, mazza...)
     appeso  per il manico, sotto il pugno (tanica, borsa, radio, la rete della frutta, il pesce...)
     piatto  tra il pollice e le dita (carte, panni, cassette)
     regge   a due mani davanti alla pancia (sedia, ruota, sacco, scatola, assi, rottami)
   La posa è uno strato delle braccia ('tiene', s.tiene = id): non prende il posto della lotta né dei lavori che hanno già il
   loro attrezzo; sostituisce solo i gesti da fermi (mani in tasca, braccia conserte, mani dietro). */
(function () {
  'use strict';
  if (typeof Anim === 'undefined' || typeof THREE === 'undefined') return;
  const PI = Math.PI, clamp = Anim.clamp;
  // sistema della mano (come in anim_vita.js): Y lungo le dita, Z fuori dal palmo, X verso il pollice
  const GY = .1, GZ = .02;   // [mani] il centro del pugno chiuso (misurato: 11,8 cm lungo le dita e 2,2 verso il palmo, per 0,85 di scala)
  const QHAND = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PI);
  const MAT = {}, lm = c => MAT[c] || (MAT[c] = new THREE.MeshLambertMaterial({ color: c }));
  function box(g, w, h, d, c, x, y, z, rx, ry, rz) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
  function cyl(g, rt, rb, h, c, x, y, z, rx, ry, rz, s) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s || 8), lm(c)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
  const shade = (c, k) => { const o = new THREE.Color(c); o.multiplyScalar(k); return '#' + o.getHexString(); };
  const X = [0, 0, -PI / 2];   // un cilindro lungo l'asse X della mano (dal pugno verso il pollice)

  // ---------------- le sagome: (colore) → Object3D nel sistema della mano (o del corpo per «regge») ----------------
  const FAM = {
    bottiglia: { how: 'pugno', grip: [.85, .8], make: c => { const g = new THREE.Group(); cyl(g, .032, .032, .16, c, -.01, GY, GZ + .01, ...X, 10); cyl(g, .013, .032, .04, c, .09, GY, GZ + .01, ...X, 10); cyl(g, .013, .013, .05, c, .13, GY, GZ + .01, ...X, 8); cyl(g, .0325, .0325, .06, '#e8dcb0', -.02, GY, GZ + .01, ...X, 10); return g; } },
    latta: { how: 'pugno', grip: [.75, .7], make: c => { const g = new THREE.Group(); cyl(g, .04, .04, .11, '#a8a4ac', 0, GY, GZ + .02, ...X, 12); cyl(g, .041, .041, .07, c, 0, GY, GZ + .02, ...X, 12); return g; } },
    pane: { how: 'pugno', grip: [.55, .5], make: () => { const g = new THREE.Group(); box(g, .22, .07, .08, '#c88a40', .02, GY + .01, GZ + .03); box(g, .2, .02, .06, '#e0b060', .02, GY + .045, GZ + .03); return g; } },
    tondo: { how: 'appeso', grip: [.9, .8], make: c => { const g = new THREE.Group(); [[0, .17, 0], [.05, .2, .03], [-.05, .2, .02], [0, .23, -.03], [.03, .26, .03]].forEach(([x, y, z]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.045, 7, 5), lm(c || '#d84a3a')); s.position.set(x, y, GZ + z); g.add(s); }); box(g, .01, .1, .01, '#8a7a5a', 0, .08, GZ); return g; } },
    pesce: { how: 'appeso', grip: [.85, .8], make: c => { const g = new THREE.Group(); box(g, .05, .26, .09, c || '#7a9ab0', 0, .2, GZ + .01); box(g, .02, .06, .1, shade(c || '#7a9ab0', .8), 0, .06, GZ + .01); return g; } },
    carne: { how: 'pugno', grip: [.6, .5], make: c => { const g = new THREE.Group(); box(g, .16, .06, .11, '#e8e0d0', .01, GY + .01, GZ + .045); box(g, .12, .062, .08, c || '#b84a4a', .01, GY + .01, GZ + .045); return g; } },
    formaggio: { how: 'pugno', grip: [.55, .5], make: c => { const g = new THREE.Group(); cyl(g, .07, .07, .06, c || '#e8c860', 0, GY + .01, GZ + .05, PI / 2, 0, 0, 12); return g; } },
    tazza: { how: 'pugno', grip: [.8, .7], make: c => { const g = new THREE.Group(); cyl(g, .035, .035, .2, '#3a5a4a', .02, GY, GZ + .015, ...X, 10); cyl(g, .037, .037, .04, '#c8c8d0', .13, GY, GZ + .015, ...X, 10); return g; } },
    viti: { how: 'pugno', grip: [.65, .6], make: c => { const g = new THREE.Group(); box(g, .1, .05, .06, '#c8a050', 0, GY + .01, GZ + .03); box(g, .101, .02, .061, '#8a6a2a', 0, GY + .01, GZ + .03); return g; } },
    corda: { how: 'appeso', grip: [.9, .8], make: c => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(.11, .022, 6, 14), lm(c || '#c89a5a')); t.position.set(0, .13, GZ); g.add(t); const t2 = t.clone(); t2.scale.setScalar(.85); t2.position.z += .02; g.add(t2); return g; } },
    martello: { how: 'pugno', grip: [.95, .9], up: [0, .4, 1], make: c => { const g = new THREE.Group(); cyl(g, .014, .014, .3, '#8a6a42', .07, GY, GZ, ...X, 6); box(g, .04, .04, .12, c || '#5a5e68', .21, GY, GZ); return g; } },
    chiave: { how: 'pugno', grip: [.95, .9], up: [0, .4, 1], make: c => { const g = new THREE.Group(); box(g, .2, .018, .03, c || '#8a8e98', .06, GY, GZ); box(g, .04, .05, .03, c || '#8a8e98', .17, GY, GZ); box(g, .03, .02, .032, '#2a2a2e', .18, GY + .015, GZ); return g; } },
    lama: { how: 'pugno', grip: [.95, .9], up: [0, .1, 1], make: c => { const g = new THREE.Group(); box(g, .1, .025, .03, c || '#3a2a20', 0, GY, GZ); box(g, .13, .022, .004, '#c8ccd4', .11, GY + .004, GZ); return g; } },
    sega: { how: 'lungo', grip: [.9, .8], make: c => { const g = new THREE.Group(); box(g, .12, .03, .1, '#8a5a2a', 0, GY, GZ); box(g, .45, .002, .1, '#c8ccd4', .27, GY, GZ - .02); return g; } },
    ascia: { how: 'lungo', grip: [.95, .9], make: c => { const g = new THREE.Group(); cyl(g, .016, .016, .7, '#8a5a2a', .2, GY, GZ, ...X, 6); box(g, .05, .03, .16, '#8a8e98', .52, GY, GZ + .06); return g; } },
    pala: { how: 'lungo', grip: [.95, .9], make: () => { const g = new THREE.Group(); cyl(g, .016, .016, 1, '#8a6a42', .25, GY, GZ, ...X, 6); box(g, .24, .02, .2, '#5a5a60', .82, GY, GZ); return g; } },
    pila: { how: 'pugno', grip: [.7, .7], make: c => { const g = new THREE.Group(); cyl(g, .018, .018, .06, c || '#c8a03a', 0, GY, GZ + .01, ...X, 8); return g; } },
    radio: { how: 'appeso', atGrip: true, grip: [.9, .85], make: c => { const g = new THREE.Group(), k = c || '#4a5a4a', H = GY + .07; box(g, .16, .016, .02, '#1a1a1e', 0, GY, GZ); [-1, 1].forEach(s => box(g, .014, .07, .014, '#1a1a1e', s * .075, GY + .035, GZ)); box(g, .28, .16, .08, k, 0, H + .08, GZ); [-1, 1].forEach(s => { cyl(g, .045, .045, .01, '#2a2a2e', s * .08, H + .085, GZ - .041, PI / 2, 0, 0, 12); cyl(g, .025, .025, .012, '#5a5a60', s * .08, H + .085, GZ - .042, PI / 2, 0, 0, 10); }); box(g, .08, .03, .012, '#c8c0a0', 0, H + .03, GZ - .041); return g; } },
    scatola: { how: 'regge', w: .36, make: c => { const g = new THREE.Group(); box(g, .36, .28, .3, c || '#5a6a7a', 0, 0, 0); box(g, .28, .18, .005, '#2a2e34', 0, .02, .152); return g; } },
    lampadina: { how: 'pugno', grip: [.85, .8], up: [0, -.05, 1], make: () => { const g = new THREE.Group(); cyl(g, .022, .022, .18, '#3a3a40', .03, GY, GZ + .01, ...X, 8); cyl(g, .032, .024, .05, '#3a3a40', .14, GY, GZ + .01, ...X, 8); cyl(g, .028, .028, .005, '#fff4c8', .166, GY, GZ + .01, ...X, 8); return g; } },
    carta: { how: 'piatto', grip: [.4, .7], make: c => { const g = new THREE.Group(); box(g, .22, .3, .006, '#f2ead8', .04, GY + .08, GZ - .005); box(g, .2, .04, .007, c || '#c84a4a', .04, GY + .2, GZ - .005); return g; } },
    medicina: { how: 'pugno', grip: [.6, .6], make: c => { const g = new THREE.Group(); box(g, .13, .08, .06, '#f2ead8', 0, GY + .01, GZ + .03); box(g, .03, .081, .061, c || '#d83a3a', 0, GY + .01, GZ + .03); return g; } },
    siringa: { how: 'pugno', grip: [.7, .8], make: () => { const g = new THREE.Group(); cyl(g, .008, .008, .1, '#d8e4ec', .02, GY, GZ, ...X, 6); cyl(g, .001, .001, .04, '#a8acb4', .09, GY, GZ, ...X, 4); return g; } },
    sapone: { how: 'pugno', grip: [.55, .5], make: c => { const g = new THREE.Group(); box(g, .1, .05, .07, c || '#e8b0d0', 0, GY + .01, GZ + .035); return g; } },
    maglia: { how: 'piatto', grip: [.5, .6], make: c => { const g = new THREE.Group(); box(g, .26, .22, .06, c || '#4a5a8a', .06, GY + .06, GZ + .02); box(g, .26, .02, .062, shade(c || '#4a5a8a', .75), .06, GY + .13, GZ + .02); return g; } },
    scarpa: { how: 'appeso', grip: [.85, .8], make: c => { const g = new THREE.Group(); [-.035, .035].forEach(x => { box(g, .06, .1, .26, c || '#5a3a2a', x, .14, GZ + .08); box(g, .062, .025, .27, '#1a1a1e', x, .09, GZ + .08); }); return g; } },
    cappello: { how: 'pugno', grip: [.5, .5], make: c => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 5, 0, PI * 2, 0, PI / 2), lm(c || '#4a5a3a')); s.position.set(0, GY + .02, GZ + .05); s.rotation.x = -PI / 2; g.add(s); return g; } },
    borsa: { how: 'appeso', atGrip: true, grip: [.9, .85], make: c => { const g = new THREE.Group(), k = c || '#5a6a3a', H = GY + .09; [-1, 1].forEach(s => { box(g, .02, .11, .012, shade(k, .6), s * .05, GY + .045, GZ, 0, 0, s * .25); }); box(g, .12, .018, .014, shade(k, .6), 0, GY, GZ); box(g, .34, .24, .14, k, 0, H + .12, GZ); box(g, .345, .06, .145, shade(k, .78), 0, H + .02, GZ); box(g, .04, .03, .148, '#c8a040', 0, H + .05, GZ); return g; } },
    sedia: { how: 'regge', w: .42, make: c => { const g = new THREE.Group(), k = c || '#8a6a4a'; box(g, .42, .04, .4, k, 0, -.05, 0); [[-.19, -.18], [.19, -.18], [-.19, .18], [.19, .18]].forEach(([x, z]) => box(g, .035, .45, .035, k, x, -.28, z)); box(g, .42, .4, .035, k, 0, .17, -.18); return g; } },
    arma: { how: 'lungo', grip: [.95, .9], make: c => { const g = new THREE.Group(); cyl(g, .02, .035, .8, c || '#8a6a42', .3, GY, GZ, ...X, 8); return g; } },
    munizioni: { how: 'pugno', grip: [.6, .6], make: c => { const g = new THREE.Group(); box(g, .12, .07, .07, '#4a5a3a', 0, GY + .01, GZ + .035); box(g, .121, .02, .071, c || '#8a6a2a', 0, GY + .03, GZ + .035); return g; } },
    moneta: { how: 'pugno', grip: [.75, .7], make: c => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(.045, 7, 5), lm('#7a5a3a')); s.position.set(0, GY + .01, GZ + .03); s.scale.y = .8; g.add(s); cyl(g, .012, .02, .03, '#5a3a20', .045, GY + .01, GZ + .03, ...X, 6); return g; } },
    pacchetto: { how: 'pugno', grip: [.55, .6], make: c => { const g = new THREE.Group(); box(g, .055, .085, .024, '#f2ead8', 0, GY + .01, GZ + .015, 0, 0, PI / 2); box(g, .03, .086, .025, c || '#c83a3a', 0, GY + .01, GZ + .015, 0, 0, PI / 2); return g; } },
    cassetta: { how: 'piatto', grip: [.45, .7], make: c => { const g = new THREE.Group(); box(g, .1, .065, .015, c || '#3a3a4a', .02, GY + .03, GZ - .005); box(g, .07, .025, .016, '#f2ead8', .02, GY + .03, GZ - .005); return g; } },
    ruota: { how: 'regge', w: .56, make: () => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(.26, .05, 6, 16), lm('#1a1a1e')); g.add(t); for (let k = 0; k < 6; k++) box(g, .006, .48, .006, '#a8acb4', 0, 0, 0, 0, 0, k * PI / 6); cyl(g, .03, .03, .08, '#5a5a60', 0, 0, 0, PI / 2, 0, 0, 8); return g; } },
    tanica: { how: 'appeso', atGrip: true, grip: [.92, .85], make: c => { const g = new THREE.Group(), k = c || '#c83a3a', H = GY + .05; box(g, .13, .022, .028, k, 0, GY, GZ); [-1, 1].forEach(s => box(g, .022, .05, .028, k, s * .055, GY + .025, GZ)); box(g, .3, .36, .14, k, 0, H + .18, GZ); box(g, .24, .3, .145, shade(k, 1.12), 0, H + .2, GZ); cyl(g, .022, .022, .04, '#1a1a1e', .12, H + .01, GZ, 0, 0, -.6, 8); return g; } },
    rottame: { how: 'regge', w: .4, make: c => { const g = new THREE.Group(); box(g, .4, .16, .22, c || '#6a6e78', 0, -.04, 0, 0, .2, .1); box(g, .25, .12, .2, '#7a4a2a', .04, .08, .02, .3, 0, -.2); cyl(g, .03, .03, .35, '#8a8e98', -.05, .02, .05, 0, 0, 1.2); return g; } },
    cassa: { how: 'regge', w: .4, make: c => { const g = new THREE.Group(), k = c || '#9a7a4a'; box(g, .4, .28, .32, k, 0, 0, 0); [-.08, .08].forEach(y => box(g, .405, .03, .325, shade(k, .7), 0, y, 0)); return g; } },
    sacco: { how: 'regge', w: .42, make: c => { const g = new THREE.Group(), k = c || '#c8b080'; const s = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), lm(k)); s.scale.set(1, .85, .6); g.add(s); box(g, .1, .06, .1, shade(k, .8), 0, .2, 0); return g; } },
    tronco: { how: 'regge', w: .34, make: c => { const g = new THREE.Group(), k = c || '#8a5a2a'; [[-.08, -.04], [.08, -.04], [0, .08]].forEach(([y, z]) => cyl(g, .06, .06, .7, k, 0, y, z, 0, 0, PI / 2, 7)); return g; } },
    mattone: { how: 'regge', w: .3, make: c => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) box(g, .25, .065, .12, c || '#b8584a', 0, -.1 + i * .068, 0, 0, (i % 2) * .08, 0); return g; } },
    lastra: { how: 'regge', w: .5, make: c => { const g = new THREE.Group(); box(g, .6, .5, .02, c || '#8a9098', 0, .02, .06); return g; } },
    mucchio: { how: 'regge', w: .4, make: c => FAM.sacco.make(c || '#3a3838') },
  };
  // cose che hanno già il loro modello in mano (models.js, le armi del kit) o una posa a parte (anim_vita.js: HELD_UP)
  const SKIP = /^(bomboletta|telefono|fotocamera|piede|gesso|manganello|cartello|pistola|mitra|lupara|fucile|coltello|pala|molotov|carriola|cassa|roba|merce|viveri|materiali|mobili|refurtiva|pugni)$/;
  // famiglia e colore: quelle delle icone del Menu (se c'è), altrimenti un ripiego sul nome
  const FALLBACK = [[/bottigl|vino|birra|acqua|olio|grappa/, 'bottiglia'], [/latta|scatol/, 'latta'], [/pane|panino/, 'pane'], [/radio/, 'radio'], [/tanica|benzina/, 'tanica'], [/carta|giornal|libr|document/, 'carta'], [/martell/, 'martello'], [/chiave|pinze/, 'chiave'], [/sedia/, 'sedia'], [/ruota/, 'ruota'], [/sacc|farina|cemento/, 'sacco']];
  const FC = {};
  function famOf(id) {
    if (FC[id]) return FC[id];
    let f = null, c = null;
    if (typeof MenuUI !== 'undefined' && MenuUI.famOf) { try { const r = MenuUI.famOf(id); f = r[0]; c = r[1]; } catch (e) { } }
    if (!f || !FAM[f]) { f = null; for (const [re, k] of FALLBACK) if (re.test(id)) { f = k; break; } }
    return (FC[id] = { f: f || 'cassa', c });
  }

  // ---------------- il modello in mano (uno per persona e per oggetto, creato alla prima richiesta) ----------------
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
  function holderFor(P, id) {
    const R = P.R, map = R.mano || (R.mano = {}); if (map[id] !== undefined) return map[id];
    const F = famOf(id), D = FAM[F.f]; let h = null;
    try {
      const obj = D.make(F.c); h = new THREE.Group(); h.add(obj);
      if (D.how === 'appeso' && !D.atGrip) obj.position.y += GY - .05;   // il manico (a ~5 cm nei modelli più semplici) nel centro del pugno, il resto sotto
      if (D.how === 'regge') { const u = P.g.userData; if (u.body) { const s = u.body.scale; h.scale.set(1 / s.x, 1 / s.y, 1 / s.z); u.body.add(h); } else P.g.add(h); }
      else { const bone = R.b.WristR; bone.getWorldScale(_v); P.g.getWorldScale(_v2); h.scale.setScalar(_v2.x / (_v.x || 1)); h.quaternion.copy(QHAND); bone.add(h); }
      h.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      h.visible = false;
    } catch (e) { h = null; }
    return (map[id] = h);
  }
  function hideAll(R) { const m = R.mano; if (m) for (const k in m) if (m[k]) m[k].visible = false; }

  // ---------------- le braccia ----------------
  const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _W = new THREE.Vector3(), _T = new THREE.Vector3(), _U = new THREE.Vector3(), _N = new THREE.Vector3(), _M = new THREE.Matrix4();
  const _d = [0, 0, 0], D3 = (x, y, z) => { _d[0] = x; _d[1] = y; _d[2] = z; return _d; };
  // mano (polso) in (x,y,z) nello spazio del personaggio (x vero: + = sinistra), gomito verso il polo: IK a due ossa
  function handTo(P, sd, hx, hy, hz, px, py, pz) {
    const R = P.R, ua = R.b['UpperArm' + sd], la = R.b['LowerArm' + sd], wr = R.b['Wrist' + sd]; if (!ua || !la || !wr) return;
    _M.copy(P.g.matrixWorld).invert();
    ua.getWorldPosition(_S).applyMatrix4(_M); la.getWorldPosition(_E).applyMatrix4(_M); wr.getWorldPosition(_W).applyMatrix4(_M);
    const a = _S.distanceTo(_E), b = _E.distanceTo(_W);
    _T.set(hx, hy, hz); _U.subVectors(_T, _S); let d = _U.length(); if (d < 1e-4) return; _U.divideScalar(d);
    d = clamp(d, Math.abs(a - b) + .01, (a + b) * .998);
    const x = (a * a - b * b + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
    _N.set(px, py, pz); _N.addScaledVector(_U, -_N.dot(_U)); if (_N.lengthSq() < 1e-8) _N.set(0, -1, 0); _N.normalize();
    _E.copy(_S).addScaledVector(_U, x).addScaledVector(_N, h);
    _W.subVectors(_E, _S); P.aim('UpperArm' + sd, D3(_W.x, _W.y, _W.z));
    _W.copy(_S).addScaledVector(_U, d).sub(_E); P.aim('LowerArm' + sd, D3(_W.x, _W.y, _W.z));
  }
  // gira la mano perché l'asse (ax: 0 = X verso il pollice, 2 = Z fuori dal palmo) del sistema della mano vada verso dir
  const _qa = new THREE.Quaternion(), _A = new THREE.Vector3();
  function orient(P, sd, ax, dir, maxW) {
    const wr = P.R.b['Wrist' + sd]; if (!wr) return;
    wr.getWorldQuaternion(_qa).multiply(QHAND); _A.set(ax === 0 ? 1 : 0, 0, ax === 2 ? 1 : 0).applyQuaternion(_qa);
    P.turnHand(sd, _A, dir, maxW === undefined ? .8 : maxW);
  }
  const SW = P => Math.sin(P.time * 5.5 + P.r * 6) * Math.min(1, Math.abs(P.o.speed || 0) / 3);   // il dondolio camminando

  Anim.def('tiene', { fade: .25, fn(P, A) {
    const R = P.R; hideAll(R);
    const id = A.tiene; if (!id || P.w <= 0) return;
    const F = famOf(id), D = FAM[F.f]; if (!D) return;
    const sw = SW(P), grip = D.grip || [.8, .7];
    if (D.how === 'regge') {
      // a due mani, davanti alla pancia: le mani ai lati della cosa, i palmi verso l'interno; la schiena compensa il peso
      const w = (D.w || .4) / 2 + .03, y = 1.0 + .015 * sw, z = .3;
      P.rot('Abdomen', -.08, 0, 0); P.rot('Chest', -.04, 0, 0);
      handTo(P, 'R', -w - .03, y - .08, z - .04, -.6, -.6, -.3); handTo(P, 'L', w + .03, y - .08, z - .04, .6, -.6, -.3);   // ai lati, verso il fondo: la cosa poggia sulle dita
      orient(P, 'R', 2, D3(1, .35, 0)); orient(P, 'L', 2, D3(-1, .35, 0));
      P.fingers('R', .5, .3); P.fingers('L', .5, .3);
      const h = holderFor(P, id); if (h && P.w > .5) { h.position.set(0, y + .03, z + .03); h.visible = true; }
      return;
    }
    if (D.how === 'lungo' || D.how === 'appeso') {
      // il braccio giù (un po' scostato se la cosa pesa), il pollice in avanti: gli attrezzi lunghi stanno orizzontali
      const out = D.how === 'appeso' ? .1 : .05;
      P.aim('UpperArmR', D3(-.12 - out, -1, .04 + .25 * sw)); P.aim('LowerArmR', D3(-.06 - out * .5, -1, .1 + .3 * sw));
      orient(P, 'R', 0, D3(0, D.how === 'lungo' ? -.15 : 0, 1));
      if (D.how === 'appeso') P.rot('Chest', 0, 0, -.04);   // il peso tira giù la spalla
    } else {
      // pugno e piatto: l'avambraccio avanti all'altezza della vita, il pollice in su (o verso dove punta l'attrezzo)
      handTo(P, 'R', -.2, .98 + .03 * sw, .28, -.5, -.8, -.4);
      const up = D.up || [0, 1, .15]; orient(P, 'R', 0, D3(up[0], up[1], up[2]));
    }
    P.fingers('R', grip[0], grip[1]);
    const h = holderFor(P, id); if (h && P.w > .5) h.visible = true;
  } });

  // quando la posa si spegne del tutto non gira più: la pulizia sta nel respiro (sempre acceso), come in anim_vita.js
  const VITA0 = Anim.POSES.vita;
  if (VITA0 && !VITA0.__mano) Anim.def('vita', { fade: VITA0.fade, __mano: true, __vp: VITA0.__vp, fn(P, A) { hideAll(P.R); VITA0.fn(P, A); } });

  // ---------------- mappe ----------------
  // gli strati delle braccia che si possono lasciare per tenere qualcosa (gesti da fermi)
  const FREE = { tasche: 1, braccia: 1, dietro: 1, orologio: 1, saluta: 0 };
  function pick(id, s) {
    if (!id || SKIP.test(id) || s.act && s.act !== 'aspetta' && s.act !== 'appoggiato') return;
    if (s.upper && !FREE[s.upper]) return;
    const F = famOf(id); if (!FAM[F.f]) return;
    s.upper = 'tiene'; s.tiene = id;
  }
  Anim.npcMap((st, n, s) => { if (n.dead || n.stun > 0 || n.inside || n.inVeh) return; if (n.weapon && n.hand === n.weapon) return; pick(n.hand, s); });
  Anim.playerMap((st, p, s) => { if (p.stun > 0 || p.vehicle || (p.cur && p.cur !== 'pugni')) return; pick(p.hand, s); });
  // un oggetto nel pugno per le pose degli altri file (la molotov in anim_lotta.js): make() costruisce nel sistema della mano
  // (GY, GZ = il centro del pugno). Restituisce il contenitore; resta acceso finché la posa lo chiede (si spegne nel respiro).
  function inHand(P, key, make, sd) {
    const R = P.R, map = R.mano || (R.mano = {}), id = '__' + key + (sd || 'R');
    let h = map[id];
    if (h === undefined) { h = null; const bone = R.b['Wrist' + (sd || 'R')]; if (bone) { h = new THREE.Group(); h.add(make(GY, GZ)); bone.getWorldScale(_v); P.g.getWorldScale(_v2); h.scale.setScalar(_v2.x / (_v.x || 1)); h.quaternion.copy(QHAND); bone.add(h); h.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } }); } map[id] = h; }
    if (h && P.w > .5) h.visible = true; return h;
  }
  // per lo studio delle pose e le prove
  Anim.mano = { FAM, famOf, inHand, GY, GZ };
})();
