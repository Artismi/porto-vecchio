/* ================= OGGETTI 3D: i modelli definiti delle cose che si tengono in mano =================
   Al posto delle scatole messe insieme: profili torniti (bottiglie, latte, thermos, torcia, manici) con molti lati e
   ombreggiatura morbida, sagome ritagliate ed estruse con lo smusso (pistola, coltello, chiave inglese, testa del martello,
   calcio e caricatore delle armi). Misure vere, in metri.
   Due sistemi di riferimento:
     attrezzi e contenitori: l'asse lungo +Y (dal fondo, o dalla coda del manico, verso la cima); userData.grip = dove sta il
       centro del pugno lungo l'asse.
     armi: la canna verso +Z, il sopra verso +Y, l'origine al centro dell'impugnatura (dove sta il pugno).
   Oggetti3D.make(tipo, colore) → THREE.Group; Oggetti3D.TIPI elenca i tipi. Lo usano anim_mano.js (in mano), models.js
   (le armi dei personaggi al posto di quelle del kit) e menu_ui.js (le anteprime). */
var Oggetti3D = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, V2 = (x, y) => new THREE.Vector2(x, y);
  const MC = {};
  // materiali condivisi: k = colore + tipo
  function mat(col, kind) {
    const k = col + kind; if (MC[k]) return MC[k];
    const o = { color: col, roughness: .6, metalness: 0 };
    if (kind === 'vetro') Object.assign(o, { roughness: .12, metalness: .05, transparent: true, opacity: .82 });
    if (kind === 'acciaio') Object.assign(o, { roughness: .35, metalness: .35 });   // (senza riflessi attorno il metallo pieno viene nero)
    if (kind === 'brunito') Object.assign(o, { roughness: .4, metalness: .3 });
    if (kind === 'cromo') Object.assign(o, { roughness: .22, metalness: .4 });
    if (kind === 'legno') Object.assign(o, { roughness: .58 });
    if (kind === 'plastica') Object.assign(o, { roughness: .45 });
    if (kind === 'carta') Object.assign(o, { roughness: .85 });
    return (MC[k] = new THREE.MeshStandardMaterial(o));
  }
  function mesh(geo, m, g, x, y, z, rx, ry, rz) { const o = new THREE.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; g.add(o); return o; }
  // profilo tornito attorno a Y: [[raggio, altezza], ...] dal basso in alto
  const lathe = (pts, seg) => new THREE.LatheGeometry(pts.map(p => V2(p[0], p[1])), seg || 28);
  const cyl = (r0, r1, h, seg) => new THREE.CylinderGeometry(r0, r1, h, seg || 24);
  // sagoma estrusa: punti [[u, v], ...] (u = lunghezza, v = altezza), spessore d lungo X, centrata; smusso b
  function shape(pts, holes) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
    (holes || []).forEach(h => { const pa = new THREE.Path(); if (h.r) pa.absarc(h.x, h.y, h.r, 0, PI * 2, false); else h.forEach((p, i) => i ? pa.lineTo(p[0], p[1]) : pa.moveTo(p[0], p[1])); s.holes.push(pa); });
    return s;
  }
  function ext(sh, d, b, seg) {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.001, d - 2 * (b || 0)), bevelEnabled: !!b, bevelThickness: b || 0, bevelSize: b || 0, bevelSegments: 2, curveSegments: seg || 12 });
    geo.rotateY(-PI / 2); geo.translate(d / 2 - (b || 0), 0, 0); geo.computeVertexNormals(); return geo;   // u → +Z, v → +Y, spessore → X
  }
  // una curva arrotondata da un rettangolo (per manici e guancette)
  function rrect(u0, v0, u1, v1, r) { const s = new THREE.Shape(); s.moveTo(u0 + r, v0); s.lineTo(u1 - r, v0); s.quadraticCurveTo(u1, v0, u1, v0 + r); s.lineTo(u1, v1 - r); s.quadraticCurveTo(u1, v1, u1 - r, v1); s.lineTo(u0 + r, v1); s.quadraticCurveTo(u0, v1, u0, v1 - r); s.lineTo(u0, v0 + r); s.quadraticCurveTo(u0, v0, u0 + r, v0); return s; }

  const T = {};
  // ---------------- contenitori ----------------
  T.bottiglia = (c, id) => {   // vino (alta, spalla tonda), birra (corta, scura), acqua (chiara)
    const g = new THREE.Group(), birra = /birra/.test(id || ''), acqua = /acqua/.test(id || ''), col = c || (birra ? '#4a2a10' : acqua ? '#8ac8e8' : '#3a1418');
    const R = birra ? .031 : .037, H = birra ? .13 : .19, N = birra ? .06 : .085;
    const P = [[0, 0], [R * .9, 0], [R, .006], [R, H], [R * .96, H + .012], [R * .7, H + .03], [R * .45, H + .045], [.0135, H + .06], [.013, H + .06 + N], [.0155, H + .062 + N], [.0155, H + .072 + N], [0, H + .072 + N]];
    mesh(lathe(P, 28), mat(col, 'vetro'), g);
    mesh(cyl(R + .0008, R + .0008, H * .42, 28), mat(birra ? '#e8d8a0' : '#efe6cf', 'carta'), g, 0, H * .48);   // l'etichetta
    mesh(cyl(R + .001, R + .001, .008, 28), mat('#a8202a', 'carta'), g, 0, H * .7);
    mesh(cyl(.0158, .0158, birra ? .012 : .045, 20), mat(birra ? '#c8a040' : '#7a1420', birra ? 'cromo' : 'plastica'), g, 0, H + .066 + N - (birra ? 0 : .015));   // tappo o capsula
    g.userData.grip = H * .55; return g;
  };
  T.latta = (c) => {
    const g = new THREE.Group(), R = .038, H = .11;
    mesh(lathe([[0, 0], [R - .004, 0], [R, .004], [R, H - .004], [R - .004, H], [0, H]], 28), mat('#c0c4cc', 'acciaio'), g);
    for (const y of [.03, .08]) mesh(new THREE.TorusGeometry(R, .0012, 4, 28), mat('#a8acb4', 'acciaio'), g, 0, y, 0, PI / 2);   // le nervature
    mesh(cyl(R + .0006, R + .0006, .045, 28, true), mat(c || '#c83a2a', 'carta'), g, 0, .055);
    g.userData.grip = .055; return g;
  };
  T.thermos = (c) => {
    const g = new THREE.Group(), R = .036;
    mesh(lathe([[0, 0], [R - .004, 0], [R, .006], [R, .21], [R - .006, .225], [.028, .23], [0, .23]], 28), mat(c || '#2e5a46', 'acciaio'), g);
    mesh(cyl(R + .0005, R + .0005, .03, 28), mat('#c8ccd4', 'cromo'), g, 0, .03);
    mesh(lathe([[0, .228], [.038, .228], [.04, .232], [.04, .285], [.036, .29], [0, .29]], 28), mat('#2a2a30', 'plastica'), g);   // il tappo-tazza
    g.userData.grip = .12; return g;
  };
  T.torcia = () => {
    const g = new THREE.Group();
    mesh(lathe([[0, 0], [.017, 0], [.019, .004], [.019, .15], [.026, .17], [.03, .2], [.03, .215], [0, .215]], 24), mat('#2a2a30', 'brunito'), g);
    for (let i = 0; i < 6; i++) mesh(new THREE.TorusGeometry(.0192, .0015, 4, 20), mat('#3a3a42', 'brunito'), g, 0, .03 + i * .014, 0, PI / 2);   // la zigrinatura
    mesh(cyl(.027, .027, .003, 24), new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: '#ffe8a0', emissiveIntensity: .7 }), g, 0, .216);
    mesh(new THREE.BoxGeometry(.012, .02, .006), mat('#c83a2a', 'plastica'), g, 0, .13, .019);
    g.userData.grip = .08; return g;
  };
  // ---------------- attrezzi ----------------
  T.martello = () => {   // martello da carpentiere: manico tornito ovale, testa con la penna a granchio
    const g = new THREE.Group();
    const h = mesh(lathe([[0, 0], [.014, 0], [.016, .01], [.015, .1], [.012, .2], [.011, .29], [0, .3]], 16), mat('#a8743e', 'legno'), g); h.scale.z = .75;
    const head = shape([[-.035, .014], [.03, .014], [.034, .01], [.036, -.01], [.03, -.014], [-.02, -.014], [-.07, -.03], [-.09, -.02], [-.06, -.004], [-.035, .002]]);   // la penna si piega verso il manico
    mesh(ext(head, .026, .003), mat('#4a4c54', 'acciaio'), g, 0, .3, 0);
    mesh(cyl(.016, .016, .016, 20), mat('#6a6c74', 'acciaio'), g, 0, .3, .042, PI / 2);   // la bocca
    g.userData.grip = .09; return g;
  };
  T.chiave = () => {   // chiave inglese combinata: bocca aperta da una parte, poligonale chiusa dall'altra
    const g = new THREE.Group(), L = .2;
    const body = shape([[-.008, .02], [.008, .02], [.01, .05], [.01, L - .03], [-.01, L - .03], [-.01, .05]]);
    mesh(ext(body, .006, .0015), mat('#a8acb4', 'cromo'), g);
    // la bocca aperta (in cima) e l'anello (in fondo)
    const jaw = shape([[-.02, 0], [.02, 0], [.024, .025], [.012, .035], [.007, .012], [-.007, .012], [-.012, .035], [-.024, .025]]);
    mesh(ext(jaw, .007, .0015), mat('#a8acb4', 'cromo'), g, 0, L - .035, 0);
    const ring = shape([[0, 0]], [{ x: 0, y: 0, r: .009 }]); const rs = new THREE.Shape(); rs.absarc(0, 0, .018, 0, PI * 2, false); rs.holes = ring.holes;
    mesh(ext(rs, .008, .0015, 20), mat('#a8acb4', 'cromo'), g, 0, .016, 0);
    g.userData.grip = .1; return g;
  };
  T.coltello = (c, id) => {   // coltello da cucina o a serramanico: lama sagomata, manico con i rivetti
    const g = new THREE.Group(), tagl = /taglierino/.test(id || '');
    if (tagl) {
      mesh(ext(rrect(-.009, 0, .009, .13, .006), .014, .002), mat(c || '#e8b830', 'plastica'), g);
      mesh(ext(shape([[-.007, .13], [.007, .13], [.007, .16], [-.007, .175]]), .0012, 0), mat('#d8dce4', 'cromo'), g);
      g.userData.grip = .06; return g;
    }
    mesh(ext(rrect(-.011, 0, .011, .11, .006), .018, .002), mat(c || '#3a2418', 'legno'), g);
    for (const y of [.025, .085]) mesh(cyl(.003, .003, .02, 10), mat('#c8ccd4', 'cromo'), g, 0, y, 0, 0, 0, PI / 2);
    mesh(new THREE.BoxGeometry(.02, .008, .032), mat('#a8acb4', 'acciaio'), g, 0, .113);   // la guardia
    mesh(ext(shape([[-.011, .117], [.012, .117], [.011, .2], [0, .24], [-.011, .21]]), .0025, .0005), mat('#d8dce4', 'cromo'), g);
    g.userData.grip = .055; return g;
  };
  // ---------------- armi (canna +Z, sopra +Y, origine all'impugnatura) ----------------
  // le sagome si disegnano con l'impugnatura dove viene; poi tutto si sposta perché il centro dell'impugnatura (u, v) vada all'origine
  function grip(g, u, v, muzzle) { g.children.forEach(o => { o.position.z -= u; o.position.y -= v; }); g.userData.muzzle = muzzle - u; return g; }
  T.pistola = () => {   // Beretta 92: carrello aperto in cima con la canna in vista, ponticello, guancette di legno, cane esterno
    const g = new THREE.Group(), B = mat('#2e3038', 'brunito'), W = mat('#6a3a1e', 'legno'), C = mat('#c8ccd4', 'cromo');
    // fusto col ponticello (sagoma con il buco del grilletto) e impugnatura inclinata
    const frame = shape([[-.035, .028], [.14, .028], [.14, .046], [-.04, .046], [-.045, .03], [-.05, -.07], [-.012, -.075], [.0, .0], [.012, .008], [.05, .008], [.058, .016], [.055, .028]],
      [[[.008, .014], [.046, .014], [.05, .022], [.012, .022]]]);
    mesh(ext(frame, .03, .002), B, g);
    // il carrello (a forma di C: aperto sopra), la canna cromata dentro, le zigrinature dietro
    mesh(ext(shape([[-.05, .046], [.165, .046], [.165, .072], [.12, .072], [.11, .064], [.04, .064], [.03, .078], [-.05, .078]]), .032, .0015), mat('#2c2e36', 'brunito'), g);
    mesh(cyl(.0075, .0075, .13, 16), C, g, 0, .066, .1, PI / 2);
    for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(.033, .02, .002), mat('#18181c', 'brunito'), g, 0, .062, -.042 + i * .005);
    mesh(new THREE.BoxGeometry(.006, .006, .006), B, g, 0, .081, .155); mesh(new THREE.BoxGeometry(.012, .006, .006), B, g, 0, .081, -.044);   // mire
    mesh(ext(shape([[-.004, -.002], [.004, -.002], [.002, .02], [-.006, .016]]), .008, .001), B, g, 0, .06, -.052, -.3);   // il cane
    mesh(ext(shape([[0, 0], [.004, 0], [.008, .016], [.003, .018]]), .006, .0008), B, g, 0, .006, .02, PI);   // il grilletto
    // le guancette di legno ai due lati dell'impugnatura, con le viti
    [-1, 1].forEach(s => { const gp = mesh(ext(rrect(-.047, -.066, -.012, .022, .008), .005, .0015), W, g, s * .016); gp.rotation.x = .0;
      mesh(cyl(.003, .003, .002, 10), C, g, s * .0195, -.02, -.03, 0, 0, PI / 2); });
    mesh(new THREE.BoxGeometry(.028, .01, .036), mat('#c8ccd4', 'cromo'), g, 0, -.075, -.03);   // il fondo del caricatore
    return grip(g, -.025, -.02, .165);
  };
  T.lupara = () => {   // doppietta a canne mozze: due canne affiancate con la bindella, bascula, cani esterni, impugnatura a pistola
    const g = new THREE.Group(), B = mat('#202228', 'brunito'), W = mat('#6a3a1e', 'legno'), C = mat('#a8acb4', 'acciaio');
    [-1, 1].forEach(s => { mesh(cyl(.0125, .0125, .34, 20), B, g, s * .0128, .04, .24, PI / 2); mesh(cyl(.0085, .0085, .002, 16), mat('#08080a', 'plastica'), g, s * .0128, .04, .411, PI / 2); });
    mesh(new THREE.BoxGeometry(.008, .004, .34), B, g, 0, .054, .24);
    mesh(ext(shape([[-.02, .022], [.07, .022], [.07, .058], [.0, .062], [-.03, .056]]), .046, .003), C, g);   // la bascula
    mesh(ext(shape([[.07, .024], [.2, .028], [.2, .036], [.07, .036]]), .034, .003), W, g);   // l'astina
    [-1, 1].forEach(s => mesh(ext(shape([[-.004, 0], [.004, 0], [.006, .02], [-.002, .024]]), .007, .001), B, g, s * .013, .056, -.018, -.4));   // i cani
    mesh(ext(shape([[-.03, .056], [-.03, .024], [-.045, -.06], [-.012, -.075], [.005, -.01], [.02, .022]]), .036, .004), W, g);   // l'impugnatura
    mesh(new THREE.TorusGeometry(.016, .0025, 6, 16, PI), B, g, 0, .008, .03, 0, PI / 2, PI);   // il ponticello
    return grip(g, -.022, -.01, .41);
  };
  T.mitra = () => {   // Skorpion vz.61: castello squadrato, canna corta, caricatore curvo davanti al ponticello, calcio in filo ripiegato
    const g = new THREE.Group(), B = mat('#262a30', 'brunito'), Bk = mat('#1a1a1e', 'plastica'), C = mat('#9aa0a8', 'acciaio');
    mesh(ext(shape([[-.08, .02], [.13, .02], [.13, .06], [.11, .068], [-.07, .068], [-.08, .06]]), .036, .003), B, g);
    mesh(cyl(.008, .008, .06, 16), B, g, 0, .045, .155, PI / 2); mesh(cyl(.011, .011, .014, 16), B, g, 0, .045, .18, PI / 2);
    // il caricatore curvo: una sagoma ad arco
    const mag = new THREE.Shape(); mag.moveTo(.04, .02); mag.lineTo(.07, .02); mag.quadraticCurveTo(.085, -.04, .11, -.09); mag.lineTo(.085, -.1); mag.quadraticCurveTo(.06, -.05, .04, .02);
    mesh(ext(mag, .016, .0015), Bk, g);
    mesh(ext(shape([[-.012, .022], [.012, .022], [.0, -.06], [-.032, -.058]]), .028, .004), Bk, g);   // l'impugnatura
    mesh(new THREE.TorusGeometry(.015, .0025, 6, 14, PI), B, g, 0, .012, .025, 0, PI / 2, PI);
    // il calcio in filo, ripiegato sopra il castello
    [-1, 1].forEach(s => mesh(cyl(.0025, .0025, .16, 8), C, g, s * .014, .074, .03, PI / 2));
    mesh(cyl(.0025, .0025, .03, 8), C, g, 0, .074, .11, 0, 0, PI / 2);
    return grip(g, -.01, -.02, .19);
  };
  T.fucile = () => {   // fucile d'assalto: castello, canna lunga con il mirino, caricatore curvo, calcio e astina in legno
    const g = new THREE.Group(), B = mat('#22242a', 'brunito'), W = mat('#7a4424', 'legno');
    mesh(ext(shape([[-.05, .02], [.2, .02], [.2, .065], [-.05, .065]]), .036, .003), B, g);
    mesh(cyl(.009, .009, .4, 16), B, g, 0, .05, .4, PI / 2); mesh(new THREE.BoxGeometry(.008, .03, .01), B, g, 0, .07, .56);
    mesh(ext(shape([[.2, .025], [.42, .03], [.42, .062], [.2, .062]]), .042, .004), W, g);
    const mag = new THREE.Shape(); mag.moveTo(.1, .02); mag.lineTo(.14, .02); mag.quadraticCurveTo(.16, -.08, .2, -.15); mag.lineTo(.165, -.165); mag.quadraticCurveTo(.13, -.09, .1, .02);
    mesh(ext(mag, .024, .002), mat('#2a2018', 'plastica'), g);
    mesh(ext(shape([[-.015, .022], [.012, .022], [-.005, -.07], [-.035, -.066]]), .03, .004), W, g);
    mesh(ext(shape([[-.05, .022], [-.05, .066], [-.36, .045], [-.36, -.06], [-.32, -.06], [-.12, .01]]), .036, .004), W, g);
    return grip(g, -.012, -.02, .6);
  };
  const TIPI = Object.keys(T);
  // un contenitore o un attrezzo nel sistema della mano di anim_mano.js: l'asse lungo X (verso il pollice), il punto di presa
  // nel centro del pugno (gy, gz)
  function inHand(tipo, c, id, gy, gz) {
    const o = T[tipo](c, id), w = new THREE.Group(); o.rotation.z = -PI / 2; o.position.set(-(o.userData.grip || 0), 0, 0); w.add(o); w.position.set(0, gy, gz); const g = new THREE.Group(); g.add(w); return g;
  }
  // un'arma nella mano: la canna lungo le dita (Y della mano), il sopra verso il pollice (X), l'impugnatura nel pugno.
  // Restituisce la radice (origine = impugnatura: anim_lotta.js ne ricava l'asse della canna) da mettere nel sistema della mano.
  const _m = new THREE.Matrix4();
  function armaInMano(tipo, gy, gz) {
    const o = tipo === 'coltello' ? (() => { const k = T.coltello(null, 'coltello'), w = new THREE.Group(); k.rotation.z = -PI / 2; k.position.x = -k.userData.grip; w.add(k); return w; })() : T[tipo]();
    const root = new THREE.Group(); root.position.set(0, gy, gz);
    if (tipo !== 'coltello') root.quaternion.setFromRotationMatrix(_m.makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));   // arma X,Y,Z → mano Z,X,Y
    root.add(o); return root;
  }
  return { make: (tipo, c, id) => T[tipo] ? T[tipo](c, id) : null, inHand, armaInMano, TIPI };
})();
if (typeof module !== 'undefined') module.exports = Oggetti3D;
