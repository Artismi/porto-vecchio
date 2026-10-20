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
   Si porta come si fa davvero: lungo il fianco (palmo verso la coscia), a due mani contro la pancia le cose grosse; la presa è
   quella vera del motore (P.grab: il centro del pugno nel punto, la mano orientata).
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
    pane: { how: 'pugno', grip: [.45, .5], make: () => { const g = new THREE.Group(); box(g, .22, .07, .08, '#c88a40', .02, GY + .01, GZ + .03); box(g, .2, .02, .06, '#e0b060', .02, GY + .045, GZ + .03); return g; } },
    tondo: { how: 'appeso', grip: [.9, .8], make: c => { const g = new THREE.Group(); [[0, .17, 0], [.05, .2, .03], [-.05, .2, .02], [0, .23, -.03], [.03, .26, .03]].forEach(([x, y, z]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(.045, 7, 5), lm(c || '#d84a3a')); s.position.set(x, y, GZ + z); g.add(s); }); box(g, .01, .1, .01, '#8a7a5a', 0, .08, GZ); return g; } },
    pesce: { how: 'appeso', grip: [.85, .8], make: c => { const g = new THREE.Group(), k = c || '#7a9ab0'; const b = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 7), lm(k)); b.scale.set(.6, 2.6, 1.3); b.position.set(0, .2, GZ + .01); g.add(b); const t = new THREE.Mesh(new THREE.ConeGeometry(.045, .07, 4), lm(shade(k, .8))); t.position.set(0, .06, GZ + .01); t.scale.z = .3; g.add(t); [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(.007, 5, 4), lm('#111')); e.position.set(s * .028, .31, GZ + .03); g.add(e); }); return g; } },   // per la coda: corpo affusolato, coda a ventaglio, occhi
    carne: { how: 'pugno', grip: [.45, .45], make: c => { const g = new THREE.Group(); box(g, .16, .06, .11, '#e8e0d0', .01, GY + .01, GZ + .045); box(g, .12, .062, .08, c || '#b84a4a', .01, GY + .01, GZ + .045); return g; } },
    formaggio: { how: 'pugno', grip: [.4, .4], make: c => { const g = new THREE.Group(); cyl(g, .07, .07, .06, c || '#e8c860', 0, GY + .01, GZ + .05, PI / 2, 0, 0, 12); return g; } },
    tazza: { how: 'pugno', grip: [.8, .7], make: c => { const g = new THREE.Group(); cyl(g, .035, .035, .2, '#3a5a4a', .02, GY, GZ + .015, ...X, 10); cyl(g, .037, .037, .04, '#c8c8d0', .13, GY, GZ + .015, ...X, 10); return g; } },
    viti: { how: 'pugno', grip: [.5, .5], make: c => { const g = new THREE.Group(); box(g, .1, .05, .06, '#c8a050', 0, GY + .01, GZ + .03); box(g, .101, .02, .061, '#8a6a2a', 0, GY + .01, GZ + .03); return g; } },
    corda: { how: 'appeso', grip: [.9, .8], make: c => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(.11, .022, 6, 14), lm(c || '#c89a5a')); t.position.set(0, .13, GZ); g.add(t); const t2 = t.clone(); t2.scale.setScalar(.85); t2.position.z += .02; g.add(t2); return g; } },
    martello: { how: 'pugno', grip: [.95, .9], make: c => { const g = new THREE.Group(); cyl(g, .014, .014, .3, '#8a6a42', .07, GY, GZ, ...X, 6); box(g, .04, .04, .12, c || '#5a5e68', .21, GY, GZ); return g; } },
    chiave: { how: 'pugno', grip: [.95, .9], make: c => { const g = new THREE.Group(); box(g, .2, .018, .03, c || '#8a8e98', .06, GY, GZ); box(g, .04, .05, .03, c || '#8a8e98', .17, GY, GZ); box(g, .03, .02, .032, '#2a2a2e', .18, GY + .015, GZ); return g; } },
    lama: { how: 'pugno', grip: [.95, .9], make: c => { const g = new THREE.Group(); box(g, .1, .025, .03, c || '#3a2a20', 0, GY, GZ); box(g, .13, .022, .004, '#c8ccd4', .11, GY + .004, GZ); return g; } },
    sega: { how: 'lungo', grip: [.9, .8], make: c => { const g = new THREE.Group(); box(g, .12, .03, .1, '#8a5a2a', 0, GY, GZ); box(g, .45, .002, .1, '#c8ccd4', .27, GY, GZ - .02); return g; } },
    ascia: { how: 'lungo', grip: [.95, .9], make: c => { const g = new THREE.Group(); cyl(g, .016, .016, .7, '#8a5a2a', .2, GY, GZ, ...X, 6); box(g, .05, .03, .16, '#8a8e98', .52, GY, GZ + .06); return g; } },
    pala: { how: 'lungo', grip: [.95, .9], make: () => { const g = new THREE.Group(); cyl(g, .016, .016, 1, '#8a6a42', .25, GY, GZ, ...X, 6); box(g, .24, .02, .2, '#5a5a60', .82, GY, GZ); return g; } },
    pila: { how: 'pugno', grip: [.7, .7], make: c => { const g = new THREE.Group(); cyl(g, .018, .018, .06, c || '#c8a03a', 0, GY, GZ + .01, ...X, 8); return g; } },
    radio: { how: 'appeso', atGrip: true, grip: [.9, .85], make: c => { const g = new THREE.Group(), k = c || '#4a5a4a', H = GY + .07; box(g, .16, .016, .02, '#1a1a1e', 0, GY, GZ); [-1, 1].forEach(s => box(g, .014, .07, .014, '#1a1a1e', s * .075, GY + .035, GZ)); box(g, .28, .16, .08, k, 0, H + .08, GZ); [-1, 1].forEach(s => { cyl(g, .045, .045, .01, '#2a2a2e', s * .08, H + .085, GZ - .041, PI / 2, 0, 0, 12); cyl(g, .025, .025, .012, '#5a5a60', s * .08, H + .085, GZ - .042, PI / 2, 0, 0, 10); }); box(g, .08, .03, .012, '#c8c0a0', 0, H + .03, GZ - .041); return g; } },
    scatola: { how: 'regge', d: .3, w: .36, make: c => { const g = new THREE.Group(); box(g, .36, .28, .3, c || '#5a6a7a', 0, 0, 0); box(g, .28, .18, .005, '#2a2e34', 0, .02, .152); return g; } },
    lampadina: { how: 'pugno', grip: [.85, .8], x: [0, -.15, 1], make: () => { const g = new THREE.Group(); cyl(g, .022, .022, .18, '#3a3a40', .03, GY, GZ + .01, ...X, 8); cyl(g, .032, .024, .05, '#3a3a40', .14, GY, GZ + .01, ...X, 8); cyl(g, .028, .028, .005, '#fff4c8', .166, GY, GZ + .01, ...X, 8); return g; } },
    carta: { how: 'piatto', grip: [.4, .7], make: c => { const g = new THREE.Group(); box(g, .22, .3, .006, '#f2ead8', .04, GY + .08, GZ - .005); box(g, .2, .04, .007, c || '#c84a4a', .04, GY + .2, GZ - .005); return g; } },
    medicina: { how: 'pugno', grip: [.45, .5], make: c => { const g = new THREE.Group(); box(g, .13, .08, .06, '#f2ead8', 0, GY + .01, GZ + .03); box(g, .03, .081, .061, c || '#d83a3a', 0, GY + .01, GZ + .03); return g; } },
    siringa: { how: 'pugno', grip: [.7, .8], make: () => { const g = new THREE.Group(); cyl(g, .008, .008, .1, '#d8e4ec', .02, GY, GZ, ...X, 6); cyl(g, .001, .001, .04, '#a8acb4', .09, GY, GZ, ...X, 4); return g; } },
    sapone: { how: 'pugno', grip: [.45, .45], make: c => { const g = new THREE.Group(); box(g, .1, .05, .07, c || '#e8b0d0', 0, GY + .01, GZ + .035); return g; } },
    maglia: { how: 'piatto', grip: [.5, .6], make: c => { const g = new THREE.Group(); box(g, .26, .22, .06, c || '#4a5a8a', .06, GY + .06, GZ + .02); box(g, .26, .02, .062, shade(c || '#4a5a8a', .75), .06, GY + .13, GZ + .02); return g; } },
    scarpa: { how: 'appeso', grip: [.85, .8], make: c => { const g = new THREE.Group(); [-.035, .035].forEach(x => { box(g, .06, .1, .26, c || '#5a3a2a', x, .14, GZ + .08); box(g, .062, .025, .27, '#1a1a1e', x, .09, GZ + .08); }); return g; } },
    cappello: { how: 'pugno', grip: [.5, .5], make: c => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 5, 0, PI * 2, 0, PI / 2), lm(c || '#4a5a3a')); s.position.set(0, GY + .02, GZ + .05); s.rotation.x = -PI / 2; g.add(s); return g; } },
    borsa: { how: 'appeso', atGrip: true, grip: [.9, .85], make: c => { const g = new THREE.Group(), k = c || '#5a6a3a', H = GY + .09; [-1, 1].forEach(s => { box(g, .02, .11, .012, shade(k, .6), s * .05, GY + .045, GZ, 0, 0, s * .25); }); box(g, .12, .018, .014, shade(k, .6), 0, GY, GZ); box(g, .34, .24, .14, k, 0, H + .12, GZ); box(g, .345, .06, .145, shade(k, .78), 0, H + .02, GZ); box(g, .04, .03, .148, '#c8a040', 0, H + .05, GZ); return g; } },
    sedia: { how: 'appeso', atGrip: true, out: .07, grip: [.9, .8], make: c => { const g = new THREE.Group(), k = c || '#8a6a4a'; box(g, .42, .035, .035, shade(k, .85), 0, GY, GZ); box(g, .4, .32, .025, k, 0, GY + .19, GZ); [-1, 1].forEach(s => box(g, .03, .45, .03, k, s * .19, GY + .22, GZ)); box(g, .42, .035, .4, k, 0, GY + .44, GZ - .2); [[-.19, -.02], [.19, -.02], [-.19, -.38], [.19, -.38]].forEach(([x, z]) => box(g, .03, .44, .03, k, x, GY + .67, GZ + z)); return g; } },   // per lo schienale, il sedile verso fuori
    arma: { how: 'lungo', grip: [.95, .9], make: c => { const g = new THREE.Group(); cyl(g, .02, .035, .8, c || '#8a6a42', .3, GY, GZ, ...X, 8); return g; } },
    munizioni: { how: 'pugno', grip: [.45, .5], make: c => { const g = new THREE.Group(); box(g, .12, .07, .07, '#4a5a3a', 0, GY + .01, GZ + .035); box(g, .121, .02, .071, c || '#8a6a2a', 0, GY + .03, GZ + .035); return g; } },
    moneta: { how: 'pugno', grip: [.75, .7], make: c => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.SphereGeometry(.045, 7, 5), lm('#7a5a3a')); s.position.set(0, GY + .01, GZ + .03); s.scale.y = .8; g.add(s); cyl(g, .012, .02, .03, '#5a3a20', .045, GY + .01, GZ + .03, ...X, 6); return g; } },
    pacchetto: { how: 'pugno', grip: [.55, .6], make: c => { const g = new THREE.Group(); box(g, .055, .085, .024, '#f2ead8', 0, GY + .01, GZ + .015, 0, 0, PI / 2); box(g, .03, .086, .025, c || '#c83a3a', 0, GY + .01, GZ + .015, 0, 0, PI / 2); return g; } },
    cassetta: { how: 'piatto', grip: [.45, .7], make: c => { const g = new THREE.Group(); box(g, .1, .065, .015, c || '#3a3a4a', .02, GY + .03, GZ - .005); box(g, .07, .025, .016, '#f2ead8', .02, GY + .03, GZ - .005); return g; } },
    ruota: { how: 'appeso', atGrip: true, out: .08, grip: [.9, .8], make: () => { const g = new THREE.Group(), cy = GY + .27; const t = new THREE.Mesh(new THREE.TorusGeometry(.26, .045, 6, 18), lm('#1a1a1e')); t.position.set(0, cy, GZ - .02); g.add(t); const r = new THREE.Mesh(new THREE.TorusGeometry(.22, .012, 4, 18), lm('#a8acb4')); r.position.set(0, cy, GZ - .02); g.add(r); for (let k = 0; k < 6; k++) box(g, .005, .44, .005, '#a8acb4', 0, cy, GZ - .02, 0, 0, k * PI / 6); cyl(g, .03, .03, .1, '#5a5a60', 0, cy, GZ - .02, PI / 2, 0, 0, 8); return g; } },   // per il cerchione, di taglio lungo la gamba
    tanica: { how: 'appeso', atGrip: true, grip: [.92, .85], make: c => { const g = new THREE.Group(), k = c || '#c83a3a', H = GY + .05; box(g, .13, .022, .028, k, 0, GY, GZ); [-1, 1].forEach(s => box(g, .022, .05, .028, k, s * .055, GY + .025, GZ)); box(g, .3, .36, .14, k, 0, H + .18, GZ); box(g, .24, .3, .145, shade(k, 1.12), 0, H + .2, GZ); cyl(g, .022, .022, .04, '#1a1a1e', .12, H + .01, GZ, 0, 0, -.6, 8); return g; } },
    rottame: { how: 'regge', d: .25, w: .4, make: c => { const g = new THREE.Group(); box(g, .4, .16, .22, c || '#6a6e78', 0, -.04, 0, 0, .2, .1); box(g, .25, .12, .2, '#7a4a2a', .04, .08, .02, .3, 0, -.2); cyl(g, .03, .03, .35, '#8a8e98', -.05, .02, .05, 0, 0, 1.2); return g; } },
    cassa: { how: 'regge', d: .32, w: .4, make: c => { const g = new THREE.Group(), k = c || '#9a7a4a'; box(g, .4, .28, .32, k, 0, 0, 0); [-.08, .08].forEach(y => box(g, .405, .03, .325, shade(k, .7), 0, y, 0)); return g; } },
    sacco: { how: 'regge', d: .3, w: .42, make: c => { const g = new THREE.Group(), k = c || '#c8b080'; const s = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), lm(k)); s.scale.set(1, .85, .6); g.add(s); box(g, .1, .06, .1, shade(k, .8), 0, .2, 0); return g; } },
    tronco: { how: 'regge', d: .22, w: .34, make: c => { const g = new THREE.Group(), k = c || '#8a5a2a'; [[-.08, -.04], [.08, -.04], [0, .08]].forEach(([y, z]) => cyl(g, .055, .055, .55, k, 0, y, z, 0, 0, PI / 2, 7)); return g; } },
    mattone: { how: 'regge', d: .13, w: .3, make: c => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) box(g, .25, .065, .12, c || '#b8584a', 0, -.1 + i * .068, 0, 0, (i % 2) * .08, 0); return g; } },
    lastra: { how: 'appeso', atGrip: true, out: .05, grip: [.85, .8], make: c => { const g = new THREE.Group(); box(g, .6, .5, .012, c || '#8a9098', .1, GY + .2, GZ - .03); box(g, .6, .02, .02, shade(c || '#8a9098', .8), .1, GY - .04, GZ - .03); return g; } },   // presa per il bordo di sopra, di taglio lungo la gamba
    mucchio: { how: 'regge', d: .3, w: .4, make: c => FAM.sacco.make(c || '#3a3838') },
  };
  // le famiglie che hanno un modello definito in oggetti3d.js (profili torniti, sagome estruse): id → tipo
  const O3 = { bottiglia: () => 'bottiglia', latta: () => 'latta', tazza: id => /thermos/.test(id) ? 'thermos' : null, lampadina: id => /torcia/.test(id) ? 'torcia' : null,
    martello: id => /martell/.test(id) ? 'martello' : null, chiave: id => /chiave/.test(id) ? 'chiave' : null, lama: id => /coltell|taglierino/.test(id) ? 'coltello' : null };
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
      const o3 = typeof Oggetti3D !== 'undefined' && Oggetti3D && O3[F.f] && O3[F.f](id);   // [modelli] la versione definita, se c'è
      const obj = o3 ? Oggetti3D.inHand(o3, F.c, id, GY, GZ) : D.make(F.c, id); h = new THREE.Group(); h.add(obj);
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
  const _d = [0, 0, 0], D3 = (x, y, z) => { _d[0] = x; _d[1] = y; _d[2] = z; return _d; };
  const _s0 = new THREE.Vector3(), _s1 = new THREE.Vector3(), _s2 = new THREE.Vector3();
  const SW = P => Math.sin(P.time * 5.5 + P.r * 6) * Math.min(1, Math.abs(P.o.speed || 0) / 3);   // il dondolio camminando

  Anim.def('tiene', { fade: .25, fn(P, A) {
    const R = P.R; hideAll(R);
    const id = A.tiene; if (!id || P.w <= 0) return;
    const F = famOf(id), D = FAM[F.f]; if (!D) return;
    const sw = SW(P), grip = D.grip || [.8, .7], bk = P.bulk || 0;
    if (D.how === 'regge') {
      // a due mani, contro la pancia: i palmi sui fianchi della cosa, le dita in giù e avanti; la schiena compensa il peso
      const w = (D.w || .4) / 2, d = D.d || .3, y = 1.0 + .012 * sw, z = .13 + bk + d / 2;
      P.rot('Abdomen', -.08, 0, 0); P.rot('Chest', -.05, 0, 0);
      P.hold('R', -(w + .015), y - .03, z, [1, 0, 0], [-.8, -.5, -.3]); P.hold('L', w + .015, y - .03, z, [-1, 0, 0], [.8, -.5, -.3]);
      P.fingers('R', .35, .3); P.fingers('L', .35, .3);
      const h = holderFor(P, id); if (h && P.w > .5) { h.position.set(0, y, z); h.visible = true; }
      return;
    }
    // [mani] tutto il resto si porta lungo il fianco destro, come si fa davvero: il palmo verso la coscia, il gomito morbido
    if (D.how === 'appeso') {
      // per il manico, il braccio quasi teso, la cosa sotto il pugno (le dita in giù); il peso tira giù la spalla
      P.hold('R', -.23 - bk - (D.out || 0), .8, .03 + .04 * sw, [1, 0, 0], [-.3, -1, -.4]);
      P.rot('Chest', 0, 0, -.04);
    } else if (D.how === 'lungo') {
      // l'attrezzo orizzontale, in avanti, scostato dalla gamba
      P.hold('R', -.27 - bk, .87 + .015 * sw, .1 + .05 * sw, [1, 0, 0], [-.3, -1, -.6]);
    } else {
      // pugno e piatto: il gomito piegato, l'avambraccio avanti e in giù, la mano IN LINEA con l'avambraccio (polso dritto):
      // la cosa nel pugno sta quasi dritta, inclinata in avanti come l'avambraccio (prima la mano puntava avanti e il polso
      // si piegava di 80°). La torcia invece si tiene col braccio giù, la luce in avanti.
      if (D.x) P.hold('R', -.25 - bk, .84, .1 + .04 * sw, [1, 0, 0], [-.35, -1, -.6]);
      else {
        // il braccio lungo il fianco e l'avambraccio orizzontale in avanti: col polso dritto e il pollice in su la cosa sta dritta
        const b = P.R.b, ua = b.UpperArmR, la = b.LowerArmR, wr = b.WristR;
        ua.getWorldPosition(_s0); la.getWorldPosition(_s1); wr.getWorldPosition(_s2);
        const A = _s0.distanceTo(_s1), Bf = _s1.distanceTo(_s2); P.g.worldToLocal(_s0);
        P.hold('R', _s0.x - .03 - bk * .5, _s0.y - A + .02 + .01 * sw, _s0.z + Bf + .09 + .03 * sw, [1, 0, 0], [-.2, -1, -.9]);
      }
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
