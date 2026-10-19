/* ================= [modelli1] ARREDO 3D: gli oggetti di strada, rifatti pezzo per pezzo =================
   Italia 1986, misure vere in metri. Ogni modello è un THREE.Group costruito attorno all'origine con la base a y = 0 e il davanti
   verso +z (gli oggetti a muro hanno l'origine sul punto di fissaggio, con userData.aMuro = true, e il muro dietro, a z = 0).
   Regole: niente scatole nude (lastre smussate, profili torniti, sagome estruse); ogni parte tocca un'altra (viti, staffe,
   cerniere, fascette, collari); 2-4 materiali condivisi per genere; usura leggera nei colori; leggibile a 8 px/m, quindi
   le forme grandi contano e i dettagli stanno sopra i 3 cm. Geometrie in cache (GC) e materiali in cache (MC): cento lampioni
   uguali condividono tutto.
   Arredo3D.make(tipo, o) → Group; o.liv = 0 (lontano: senza viti e minuterie) oppure 1 (pieno, predefinito).
   Lo usano render.js (libreria PM e [strade1]), lo studio (`pm:`) e la rete elettrica del filone D (mensola, contatore, isolatore).
   Le parti che si accendono si chiamano 'luce' e il gruppo porta userData.luci = [[x, y, z, colore], ...] per gli aloni. */
var Arredo3D = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const MC = {}, GC = {};
  // ---------- materiali per genere (pochi, condivisi) ----------
  function mat(col, kind) {
    const k = col + '|' + kind; if (MC[k]) return MC[k];
    if (kind === 'luce') return (MC[k] = Object.assign(new THREE.MeshBasicMaterial({ color: col, toneMapped: false, fog: false }), { name: 'luce' }));
    const o = { color: col, roughness: .6, metalness: 0 };
    if (kind === 'ghisa') Object.assign(o, { roughness: .55, metalness: .3 });
    if (kind === 'zinco') Object.assign(o, { roughness: .42, metalness: .35 });
    if (kind === 'vernice') Object.assign(o, { roughness: .5, metalness: .1 });
    if (kind === 'ottone') Object.assign(o, { roughness: .35, metalness: .4 });
    if (kind === 'legno') Object.assign(o, { roughness: .72 });
    if (kind === 'cemento') Object.assign(o, { roughness: .95 });
    if (kind === 'pietra') Object.assign(o, { roughness: .88 });
    if (kind === 'plastica') Object.assign(o, { roughness: .45 });
    if (kind === 'gomma') Object.assign(o, { roughness: .92 });
    if (kind === 'tela') Object.assign(o, { roughness: .95 });
    if (kind === 'carta') Object.assign(o, { roughness: .88 });
    if (kind === 'porcellana') Object.assign(o, { roughness: .25, metalness: .05 });
    if (kind === 'vetro') Object.assign(o, { roughness: .15, metalness: .05, transparent: true, opacity: .55, depthWrite: false });
    const m = new THREE.MeshStandardMaterial(o); m.name = kind; m.userData.sup = { ghisa: 'ghisa', zinco: 'metallo', vernice: 'vernice', legno: 'legno', cemento: 'pietra', pietra: 'pietra', plastica: 'vernice', gomma: 'gomma', tela: 'tessuto', carta: 'carta' }[kind] || 'metallo';
    return (MC[k] = m);
  }
  // la tavolozza del 1986: verde comunale, ghisa nera, zinco, cemento sporco, legno al sole, rosso PT, giallo lavori
  const C = { ghisa: '#2a2c2e', verde: '#2f5a3e', zinco: '#9a9e9a', zincoS: '#6e7270', cem: '#8e8a82', cemS: '#6e6a62', legno: '#8a6440', legnoS: '#5a3e2a', legnoG: '#a08a66', rosso: '#b8282a', giallo: '#d0a830', bianco: '#e4e0d6', crema: '#d8d2c2', arancio: '#d0682a', blu: '#2a4a7a', vetro: '#8ab0bc', luce: '#ffd890', luceB: '#eef2ff', ottone: '#b89040', porc: '#e8e4dc', gomma: '#1e1e20', nero: '#1a1a1c', cotto: '#a8583a', pietra: '#b8b0a0', terra: '#3a2a1e', foglia: '#4a6a3a', fogliaC: '#5a7a44', tela: '#d8ccb0', mare: '#2f4a3a', ruggine: '#6e3a22' };
  const GH = mat(C.ghisa, 'ghisa'), ZN = mat(C.zinco, 'zinco'), ZS = mat(C.zincoS, 'zinco'), CM = mat(C.cem, 'cemento'), CS = mat(C.cemS, 'cemento'), LG = mat(C.legno, 'legno'), LS = mat(C.legnoS, 'legno'), LGG = mat(C.legnoG, 'legno'), VD = mat(C.verde, 'vernice'), RS = mat(C.rosso, 'vernice'), GL = mat(C.giallo, 'vernice'), BC = mat(C.bianco, 'vernice'), VT = mat(C.vetro, 'vetro'), LU = mat(C.luce, 'luce'), LUB = mat(C.luceB, 'luce'), OT = mat(C.ottone, 'ottone'), PO = mat(C.porc, 'porcellana'), GM = mat(C.gomma, 'gomma'), NR = mat(C.nero, 'plastica'), RG = mat(C.ruggine, 'vernice');
  // ---------- geometrie (in cache per chiave: le istanze condividono i vertici) ----------
  const geo = (k, f) => GC[k] || (GC[k] = f());
  const q3 = v => Math.round(v * 1000);
  const cylG = (r0, r1, h, seg) => geo('c' + [r0, r1, h, seg].map(q3), () => new THREE.CylinderGeometry(r0, r1, h, seg || 12));
  const latheG = (pts, seg) => geo('l' + pts.map(p => q3(p[0]) + ',' + q3(p[1])).join(';') + seg, () => new THREE.LatheGeometry(pts.map(p => V2(Math.max(.0005, p[0]), p[1])), seg || 16));
  const torG = (R, r, seg) => geo('t' + [R, r, seg].map(q3), () => new THREE.TorusGeometry(R, r, 6, seg || 16));
  const sphG = (r, s) => geo('s' + q3(r) + s, () => new THREE.SphereGeometry(r, s || 10, Math.max(4, Math.round((s || 10) * .7))));
  const icoG = (r, d) => geo('i' + q3(r) + d, () => new THREE.IcosahedronGeometry(r, d || 1));
  // lastra smussata: la scatola con gli spigoli che prendono la luce (sotto i 3 cm di spessore resta una scatola: lo smusso non si vede)
  function slabG(w, h, d, b) {
    b = Math.min(b === undefined ? .02 : b, w / 3, h / 3, d / 3); if (Math.min(w, h, d) < .03) b = 0;
    return geo('b' + [w, h, d, b].map(q3), () => { if (b < .004) return new THREE.BoxGeometry(w, h, d);
      const s = new THREE.Shape(); s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g; });
  }
  // sagoma estrusa: punti [[x, y], ...] nel piano xy, spessore d lungo z (centrato), smusso b; `holes` = [[[x, y], ...]] o {x, y, r}
  function shape(pts, holes) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
    (holes || []).forEach(h => { const pa = new THREE.Path(); if (h.r) pa.absarc(h.x, h.y, h.r, 0, PI * 2, false); else h.forEach((p, i) => i ? pa.lineTo(p[0], p[1]) : pa.moveTo(p[0], p[1])); s.holes.push(pa); });
    return s;
  }
  function extG(k, sh, d, b, seg) {
    return geo('e' + k + [d, b].map(q3), () => { const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.001, d - 2 * (b || 0)), bevelEnabled: !!b, bevelThickness: b || 0, bevelSize: b || 0, bevelSegments: 2, curveSegments: seg || 10 }); g.translate(0, 0, -(d - 2 * (b || 0)) / 2 - (b || 0) + (b || 0)); g.computeVertexNormals(); return g; });
  }
  // rettangolo arrotondato (sagome di targhe, lanterne, coperchi)
  function rrect(x0, y0, x1, y1, r) { const s = new THREE.Shape(); s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s; }
  // ---------- montaggio ----------
  function put(g, ge, m, x, y, z, rx, ry, rz) { const o = new THREE.Mesh(ge, m); o.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
  const slab = (g, w, h, d, m, x, y, z, b, rx, ry, rz) => put(g, slabG(w, h, d, b), m, x, y, z, rx, ry, rz);
  const cyl = (g, r0, r1, h, seg, m, x, y, z, rx, ry, rz) => put(g, cylG(r0, r1, h, seg), m, x, y, z, rx, ry, rz);
  const lathe = (g, pts, seg, m, x, y, z, ry) => put(g, latheG(pts, seg), m, x, y, z, 0, ry || 0, 0);
  const tor = (g, R, r, seg, m, x, y, z, rx, ry, rz) => put(g, torG(R, r, seg), m, x, y, z, rx === undefined ? PI / 2 : rx, ry, rz);   // di piatto (anello) se non detto altro
  const ext = (g, k, sh, d, b, m, x, y, z, rx, ry, rz, seg) => put(g, extG(k, sh, d, b, seg), m, x, y, z, rx, ry, rz);
  // asta/tubo da un punto a un altro: la giuntura che tiene insieme i pezzi (gambe, bracci, tiranti, montanti)
  const _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function asta(g, a, b, r, m, seg) { _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _d.length(); const o = put(g, cylG(r, r, 1, seg || 8), m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.scale.y = L; o.quaternion.setFromUnitVectors(_up, _d.normalize()); return o; }
  const tubo = asta;
  // cavo per più punti (catene, cime, cavi elettrici, tubi di gomma)
  function cavo(g, pts, r, m, seg) { const cur = new THREE.CatmullRomCurve3(pts.map(p => V3(...p))); const o = new THREE.Mesh(new THREE.TubeGeometry(cur, (seg || pts.length * 5), r, 6), m); o.castShadow = true; g.add(o); return o; }
  // minuterie: bullone a testa esagonale, vite, fascetta col bullone, cerniera, maniglia a staffa
  function bullone(g, x, y, z, ax, r, m) { r = r || .012; const o = put(g, cylG(r, r, r * 1.4, 6), m || ZS, x, y, z); if (ax === 'z') o.rotation.x = PI / 2; else if (ax === 'x') o.rotation.z = PI / 2; return o; }
  function fascetta(g, y, r0, m) { tor(g, r0 + .012, .011, 12, m || ZS, 0, y, 0); return bullone(g, 0, y, r0 + .035, 'z', .01, m || ZS); }
  function cerniera(g, x, y, z, L, ax, m) { const o = put(g, cylG(.014, .014, L, 8), m || ZS, x, y, z); if (ax === 'x') o.rotation.z = PI / 2; else if (ax === 'z') o.rotation.x = PI / 2; return o; }
  function maniglia(g, x, y, z, w, m, vert) { const r = .011, d = .05; if (vert) { asta(g, [x, y - w / 2, z], [x, y - w / 2, z + d], r, m); asta(g, [x, y + w / 2, z], [x, y + w / 2, z + d], r, m); asta(g, [x, y - w / 2, z + d], [x, y + w / 2, z + d], r, m); } else { asta(g, [x - w / 2, y, z], [x - w / 2, y, z + d], r, m); asta(g, [x + w / 2, y, z], [x + w / 2, y, z + d], r, m); asta(g, [x - w / 2, y, z + d], [x + w / 2, y, z + d], r, m); } }
  // targhetta scritta (tela, solo nel browser; in Node resta il colore di fondo). Nomi inventati, mai marchi veri.
  const TX = {};
  function targaMat(testo, bg, fg, w, h) {
    const k = [testo, bg, fg, w, h].join('|'); if (TX[k]) return TX[k];
    if (typeof document === 'undefined') return (TX[k] = mat(bg, 'vernice'));
    const pw = 128, ph = Math.max(16, Math.round(128 * h / w)), c = document.createElement('canvas'); c.width = pw; c.height = ph; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, pw, ph); x.strokeStyle = fg; x.lineWidth = 3; x.strokeRect(3, 3, pw - 6, ph - 6);
    const righe = String(testo).split('\n'), fs = Math.min(ph / (righe.length + .6), pw / (Math.max(...righe.map(r => r.length)) * .62 + 1));
    x.fillStyle = fg; x.font = `bold ${Math.floor(fs)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    righe.forEach((r, i) => x.fillText(r, pw / 2, ph / 2 + (i - (righe.length - 1) / 2) * fs * 1.05));
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
    return (TX[k] = new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: .05 }));
  }
  function targa(g, testo, w, h, x, y, z, ry, bg, fg, sp) { const o = put(g, geo('p' + [w, h].map(q3), () => new THREE.PlaneGeometry(w, h)), targaMat(testo, bg || C.bianco, fg || C.ghisa, w, h), x, y, z, 0, ry || 0, 0); if (sp) { const b = put(g, slabG(w + .02, h + .02, sp, .004), bg ? mat(bg, 'vernice') : BC, x, y, z - sp / 2 - .001, 0, ry || 0, 0); return b; } return o; }
  const luci = (g, x, y, z, col) => { (g.userData.luci = g.userData.luci || []).push([x, y, z, col || C.luce]); };
  // profili condivisi: il palo zincato tornito (piede, fusto, collare, tappo) e il piede di cemento
  function palo(g, h, r0, m) { return lathe(g, [[r0 * 1.9, 0], [r0 * 1.9, .05], [r0 * 1.2, .09], [r0, .14], [r0, h - .05], [r0 * 1.2, h - .03], [r0 * 1.1, h], [.001, h + .02]], 10, m || ZN); }
  const piedeCem = (g, r, m) => lathe(g, [[r, 0], [r, .03], [r * .55, .06], [.001, .07]], 10, m || CM, 0, -.01, 0);

  let LV = 1; const F = () => LV > 0;   // livello di dettaglio: a 0 saltano viti, fascette e minuterie
  const T = {};
  // ================= LAMPIONI =================
  // la lanterna in ghisa a quattro facce rastremate, tettuccio a piramide, pomolo; i vetri si accendono (col = luce)
  function lanterna(g, x, y, z, s, lm) { s = s || 1; lathe(g, [[.1 * s, 0], [.13 * s, .02 * s], [.13 * s, .04 * s], [.16 * s, .06 * s]], 4, GH, x, y, z, PI / 4);   // il fondo
    put(g, latheG([[.14 * s, .06 * s], [.17 * s, .5 * s]], 4), lm || LU, x, y, z, 0, PI / 4, 0).name = 'luce';   // i vetri (quattro facce)
    [[0, 0], [PI / 2, 0]].forEach(([ry]) => { for (const sg of [-1, 1]) asta(g, [x + Math.cos(ry) * .14 * s * sg, y + .06 * s, z + Math.sin(ry) * .14 * s * sg], [x + Math.cos(ry) * .17 * s * sg, y + .5 * s, z + Math.sin(ry) * .17 * s * sg], .012 * s, GH); });   // i montantini agli spigoli (diagonali: ruotati di 45°)
    lathe(g, [[.2 * s, .5 * s], [.2 * s, .53 * s], [.1 * s, .64 * s], [.04 * s, .7 * s], [.04 * s, .74 * s], [.001, .76 * s]], 4, GH, x, y, z, PI / 4);   // il tettuccio
    put(g, sphG(.03 * s, 8), GH, x, y + .76 * s, z); luci(g, x, y + .3 * s, z); }
  // il braccio a voluta in ghisa (la mensola sul muro, il pastorale sul palo): un tubo curvo con il riccio in punta e il tirante
  function voluta(g, a, b, r, m, verso) { const mx = (a[0] + b[0]) / 2, my = Math.max(a[1], b[1]) + .25 * verso, mz = (a[2] + b[2]) / 2; cavo(g, [a, [mx, my, mz], b], r, m, 14); const rr = .07; cavo(g, [b, [b[0], b[1] - rr * verso, b[2]], [b[0] + (a[0] - b[0]) * .1, b[1] - rr * 1.6 * verso, b[2] + (a[2] - b[2]) * .1]], r * .7, m, 8); }
  T.lampione_muro = () => {   // borgo: mensola in ghisa fissata al muro (origine sulla piastra, muro a z = 0), lanterna appesa 60 cm più avanti
    const g = new THREE.Group(); g.userData.aMuro = true;
    slab(g, .18, .32, .03, GH, 0, 0, .015, .006); if (F()) [[-.06, .12], [.06, .12], [-.06, -.12], [.06, -.12]].forEach(([x, y]) => bullone(g, x, y, .034, 'z', .011, GH));
    asta(g, [0, .1, .03], [0, .1, .62], .022, GH); voluta(g, [0, -.12, .03], [0, .1, .6], .018, GH, -1);   // il braccio dritto e la voluta di sotto che lo regge
    tor(g, .035, .009, 10, GH, 0, .1, .62, 0); lanterna(g, 0, -.56, .62, 1, LU); asta(g, [0, .1, .62], [0, .2, .62], .014, GH);   // l'anello di aggancio e la lanterna (il tettuccio arriva a .2)
    return g; };
  T.lampione_corso = () => {   // Corso: palo in ghisa tornito con la base modanata, il collare, il pastorale a voluta e la lanterna; 4,5 m
    const g = new THREE.Group();
    lathe(g, [[.26, 0], [.26, .08], [.22, .1], [.2, .3], [.17, .36], [.19, .42], [.14, .5], [.12, .95], [.15, 1.0], [.15, 1.06], [.09, 1.12], [.075, 2.2], [.07, 3.6], [.095, 3.66], [.095, 3.72], [.06, 3.78], [.001, 3.8]], 10, GH);
    if (F()) { tor(g, .1, .012, 10, GH, 0, 1.6, 0); tor(g, .085, .012, 10, GH, 0, 2.9, 0); targa(g, 'COMUNE\n1912', .1, .08, 0, .72, .158, 0, C.ghisa, C.zincoS); }
    cavo(g, [[0, 3.7, 0], [0, 4.15, .12], [0, 4.3, .5], [0, 4.25, .82]], .028, GH, 14); cavo(g, [[0, 4.25, .82], [0, 4.1, .9], [0, 4.0, .8]], .02, GH, 8);   // il pastorale e il riccio
    asta(g, [0, 3.55, 0], [0, 4.0, .55], .014, GH); tor(g, .04, .01, 10, GH, 0, 4.2, .82, 0);   // il tirante e l'anello
    lanterna(g, 0, 3.52, .82, 1.05, LU); return g; };
  T.lampione_regime = () => {   // piazza della Vittoria: palo ottagonale bianco in travertino con il capitello, braccio a T e due coppe di luce bianca; 6 m
    const g = new THREE.Group(), m = mat(C.crema, 'pietra'), mD = mat('#b8b2a4', 'pietra');
    lathe(g, [[.42, 0], [.42, .18], [.36, .2], [.36, .5], [.3, .55], [.22, .6], [.2, 4.9], [.26, 5.0], [.26, 5.1], [.18, 5.2], [.001, 5.22]], 8, m, 0, 0, 0, PI / 8);
    lathe(g, [[.2, 0], [.3, 0], [.3, .05], [.22, .06]], 8, mD, 0, 5.2, 0, PI / 8); if (F()) targa(g, 'A XIV\nE.F.', .22, .18, 0, .9, .36, 0, C.crema, '#8a6a5a');   // il collare e la targa dell'anno
    asta(g, [0, 5.2, 0], [0, 5.55, 0], .06, GH); asta(g, [-.95, 5.55, 0], [.95, 5.55, 0], .045, GH); [-1, 1].forEach(s => asta(g, [0, 5.3, 0], [s * .8, 5.52, 0], .02, GH));   // il braccio a T coi saettoni
    [-.9, .9].forEach(x => { lathe(g, [[.0, 0], [.1, 0], [.14, .02], [.1, .06]], 10, GH, x, 5.55, 0); put(g, latheG([[.06, .06], [.24, .22], [.26, .34], [.2, .42], [.001, .46]], 12), LUB, x, 5.55, 0).name = 'luce'; luci(g, x, 5.85, 0, C.luceB); });   // le due coppe opaline
    return g; };
  T.lampione_boom = () => {   // boom: stelo di cemento centrifugato rastremato, braccio curvo, armatura al sodio, sportello coi bulloni; 7,5 m
    const g = new THREE.Group(), arm = mat('#4a4c52', 'vernice');
    lathe(g, [[.17, 0], [.17, .4], [.15, .45], [.085, 7.0], [.085, 7.05], [.001, 7.06]], 9, CM); if (F()) { slab(g, .14, .34, .02, ZS, 0, .9, .15, .004); bullone(g, 0, 1.02, .165, 'z', .009); bullone(g, 0, .78, .165, 'z', .009); targa(g, 'ENEL\n0427', .1, .07, 0, 1.4, .13, 0, C.zinco, C.ghisa); }   // sportello e targhetta
    cavo(g, [[0, 6.6, 0], [0, 7.25, .25], [0, 7.5, .9], [0, 7.55, 1.5]], .04, arm, 12); if (F()) { tor(g, .11, .014, 10, ZS, 0, 6.65, 0); bullone(g, .11, 6.65, 0, 'x', .01); }   // il braccio e la fascetta di attacco
    slab(g, .3, .14, .72, arm, 0, 7.5, 1.78, .03); put(g, slabG(.24, .05, .6, .012), LU, 0, 7.42, 1.8).name = 'luce'; put(g, latheG([[.0, 0], [.17, 0], [.2, .04], [.17, .12], [.001, .13]], 10), arm, 0, 7.5, 1.6, PI / 2, 0, 0);   // l'armatura, il vetro, il cappuccio sul braccio
    luci(g, 0, 7.35, 1.8, '#ffb060'); return g; };
  T.lampione_deco = () => {   // lungomare: palo bianco con la base a bulbo, l'anello e il globo di opalina; 5,7 m
    const g = new THREE.Group(), m = mat(C.bianco, 'vernice');
    lathe(g, [[.3, 0], [.3, .1], [.24, .14], [.2, .5], [.12, .55], [.1, 4.9], [.13, 4.95], [.13, 5.0], [.08, 5.05], [.001, 5.07]], 12, m); tor(g, .34, .03, 16, m, 0, 5.0, 0); [0, 1, 2, 3].forEach(i => asta(g, [0, 4.95, 0], [Math.cos(i * PI / 2) * .33, 5.0, Math.sin(i * PI / 2) * .33], .014, m));
    lathe(g, [[.08, 5.06], [.16, 5.1], [.14, 5.16]], 10, GH); put(g, sphG(.34, 14), LU, 0, 5.46, 0).name = 'luce'; luci(g, 0, 5.46, 0, '#ffe2b8'); return g; };
  // ================= SEMAFORO E SEGNALETICA =================
  T.semaforo = () => {   // palo zincato con il piede di cemento, lanterna a tre luci con le visiere e il pannello di contrasto, il pedonale, il pulsante
    const g = new THREE.Group(); palo(g, 3.4, .07); cyl(g, .13, .15, .3, 10, CM, 0, .15, 0); if (F()) [3.35, 2.65, 2.3].forEach(y => fascetta(g, y, .07));
    const y = 3.0; slab(g, .34, 1.04, .28, VD, 0, y, .12, .03); slab(g, .54, 1.22, .03, NR, 0, y, -.03, 0); slab(g, .58, 1.26, .02, BC, 0, y, -.05, 0);
    g.userData.lenti = [];
    for (let i = 0; i < 3; i++) { const ly = y + .32 - i * .32; put(g, geo('vis', () => new THREE.CylinderGeometry(.15, .15, .22, 10, 1, true, -PI / 2, PI)), VD, 0, ly + .02, .37, PI / 2, 0, 0); put(g, cylG(.12, .12, .02, 14), NR, 0, ly, .265, PI / 2, 0, 0); put(g, cylG(.1, .1, .01, 14), mat(['#3a0c0a', '#3a2a08', '#0a2a14'][i], 'luce'), 0, ly, .28, PI / 2, 0, 0).name = 'lente' + i; g.userData.lenti.push([0, ly, .285]); }
    asta(g, [0, y + .3, .07], [0, y + .3, .12], .02, ZS); asta(g, [0, y - .3, .07], [0, y - .3, .12], .02, ZS);   // le staffe che la tengono al palo
    slab(g, .22, .5, .16, VD, -.32, 1.75, .06, .02); slab(g, .24, .04, .14, VD, -.32, 2.02, .16, 0); asta(g, [-.07, 1.75, 0], [-.21, 1.75, .06], .018, ZS); [1.88, 1.62].forEach(ly => put(g, cylG(.06, .06, .01, 12), mat(ly > 1.7 ? '#3a0c0a' : '#0a2a14', 'luce'), -.32, ly, .145, PI / 2, 0, 0));   // il pedonale spento, sulla sua staffa
    slab(g, .14, .22, .1, GL, 0, 1.15, .1, .02); put(g, cylG(.03, .03, .012, 10), NR, 0, 1.15, .155, PI / 2, 0, 0); return g; };
  // il cartello: palo zincato tornito sul piede di cemento; o.targhe = [{w, h, tonda, mat, testo}] dall'alto in basso, con il retro di zinco,
  // la nervatura e le due fascette imbullonate (render.js passa le sue facce dipinte)
  T.cartello = (o) => { const g = new THREE.Group(), r0 = .038, targhe = (o && o.targhe) || [{ w: .6, h: .6, tonda: true, testo: '30', bg: '#e4e0d6', fg: '#b8282a' }];
    palo(g, 2.62, r0); piedeCem(g, .11); let y = 2.5;
    targhe.forEach(t => { const yc = y - t.h / 2, fm = t.mat || targaMat(t.testo || '', t.bg || C.bianco, t.fg || C.ghisa, t.w, t.h);
      put(g, geo(t.tonda ? 'dk' + q3(t.w) : 'p' + [t.w, t.h].map(q3), () => t.tonda ? new THREE.CircleGeometry(t.w / 2, 20) : new THREE.PlaneGeometry(t.w, t.h)), fm, 0, yc, r0 + .03);
      if (t.tonda) put(g, cylG(t.w * .47, t.w * .47, .018, 20), ZN, 0, yc, r0 + .015, PI / 2, 0, 0); else slab(g, t.w * .96, t.h * .96, .018, ZN, 0, yc, r0 + .015, 0);
      slab(g, Math.min(t.w * .7, .5), .04, .03, ZN, 0, yc, r0 + .005, 0); if (F()) [t.h * .3, -t.h * .3].forEach(d => fascetta(g, yc + d, r0)); y -= t.h + .07; });
    return g; };
  T.targa_via = (o) => {   // targa toponomastica in marmo (60 × 35) con la scritta incisa in nero e i quattro tasselli; a muro
    const g = new THREE.Group(); g.userData.aMuro = true; const t = (o && o.testo) || 'VIA DEI\nPESCATORI', m = mat('#e8e2d4', 'pietra');
    slab(g, .6, .35, .035, m, 0, 0, .018, .008); targa(g, t, .54, .29, 0, 0, .037, 0, '#e8e2d4', '#2a2a2e');
    if (F()) [[-.27, .15], [.27, .15], [-.27, -.15], [.27, -.15]].forEach(([x, y]) => bullone(g, x, y, .038, 'z', .008, mat('#7a7a7a', 'zinco'))); return g; };
  T.civico = (o) => {   // numero civico smaltato blu col bordo bianco (15 × 12) e le due viti; a muro
    const g = new THREE.Group(); g.userData.aMuro = true; slab(g, .15, .12, .012, mat(C.blu, 'vernice'), 0, 0, .006, .004); targa(g, (o && o.testo) || '14', .14, .11, 0, 0, .013, 0, C.blu, C.bianco);
    if (F()) [-.06, .06].forEach(x => bullone(g, x, .045, .014, 'z', .006, ZS)); return g; };
  // ================= PANCHINE =================
  T.panchina_ghisa = () => {   // Corso e villa: due fianchi in ghisa a voluta (sagoma traforata), quattro doghe di seduta, due di schienale, bulloni, traversa; 1,8 m
    const g = new THREE.Group(), prof = shape([[-.3, 0], [.28, 0], [.3, .04], [.26, .06], [.1, .08], [.12, .4], [.28, .42], [.3, .46], [.26, .5], [.1, .52], [-.2, .62], [-.26, .96], [-.3, .98], [-.34, .94], [-.26, .58], [-.24, .5], [-.22, .44], [-.2, .08], [-.24, .06], [-.3, .04]], [[[-.12, .14], [.06, .14], [.08, .36], [-.14, .36]]]);
    [-.78, .78].forEach(x => ext(g, 'pf', prof, .05, .006, GH, x, 0, 0, 0, PI / 2, 0));
    for (let k = 0; k < 4; k++) slab(g, 1.8, .035, .09, LG, 0, .455, -.14 + k * .11, .006); [0, 1].forEach(k => slab(g, 1.8, .09, .035, LG, 0, .62 + k * .18, -.2 - k * .055, .006, -.22, 0, 0));
    asta(g, [-.78, .25, -.1], [.78, .25, -.1], .018, GH);   // la traversa che lega i fianchi
    if (F()) [-.78, .78].forEach(x => { [-.1, .22].forEach(z => bullone(g, x + (x > 0 ? .03 : -.03), .47, z, 'x', .009, GH)); bullone(g, x + (x > 0 ? .03 : -.03), .66, -.22, 'x', .009, GH); }); return g; };
  T.panchina_cemento = () => {   // boom: due sostegni trapezi di cemento, lastra di seduta smussata con la fascia di legno, niente schienale; 2 m
    const g = new THREE.Group(), prof = shape([[-.26, 0], [.26, 0], [.22, .42], [-.22, .42]]);
    [-.75, .75].forEach(x => ext(g, 'pc', prof, .12, .01, CM, x, 0, 0, 0, PI / 2, 0)); slab(g, 2.0, .08, .5, mat('#9a968e', 'cemento'), 0, .46, 0, .015);
    for (let k = 0; k < 3; k++) slab(g, 1.9, .03, .13, LGG, 0, .515, -.17 + k * .17, .005); if (F()) [-.5, .5].forEach(x => [-.17, .17].forEach(z => bullone(g, x, .532, z, 'y', .007, ZS))); return g; };
  // ================= RIFIUTI =================
  T.cassonetto = () => {   // AMIU 1,1 m³ in lamiera verde: cassa smussata, coperchio bombato con le cerniere, pedale, due maniglie, quattro ruote con la forcella, targhetta
    const g = new THREE.Group(), W = 1.4, H = 1.1, D = .9, vd = mat('#3a6a3e', 'vernice'), vdS = mat('#2a4a2e', 'vernice');
    slab(g, W, H - .3, D, vd, 0, .3 + (H - .3) / 2, 0, .035); [-.5, 0, .5].forEach(x => slab(g, .06, H - .34, D + .02, vdS, x, .3 + (H - .3) / 2, 0, .01));   // le costole
    ext(g, 'cop', shape([[-D / 2 - .02, 0], [D / 2 + .02, 0], [D / 2, .06], [.2, .13], [-.2, .13], [-D / 2, .06]]), W + .04, .012, vdS, 0, H, 0, 0, PI / 2, 0);   // il coperchio bombato (sagoma trasversale)
    if (F()) { cerniera(g, 0, H, -D / 2 - .01, W * .9, 'x'); maniglia(g, 0, H + .04, D / 2 - .02, .4, ZS); [-.45, .45].forEach(x => maniglia(g, x, .7, D / 2, .14, ZS)); targa(g, 'A.M.I.U.\nRIFIUTI', .36, .18, 0, .72, D / 2 + .004, 0, C.bianco, '#2a4a2e'); }
    asta(g, [-.3, .36, D / 2 + .08], [.3, .36, D / 2 + .08], .014, ZS); [-.3, .3].forEach(x => asta(g, [x, .36, D / 2 + .08], [x, .3, D / 2 - .1], .014, ZS));   // il pedale
    [[-.55, .32], [.55, .32], [-.55, -.32], [.55, -.32]].forEach(([x, z]) => { slab(g, .06, .16, .08, ZS, x, .22, z, .008); put(g, cylG(.1, .1, .05, 12), GM, x, .1, z, 0, 0, PI / 2); put(g, cylG(.035, .035, .07, 8), ZS, x, .1, z, 0, 0, PI / 2); });   // ruote con forcella e mozzo
    return g; };
  T.bidone = () => {   // bidone di zinco da 110 l: tornito con le nervature, due maniglie laterali, coperchio col pomolo
    const g = new THREE.Group(); lathe(g, [[.2, 0], [.24, .02], [.25, .1], [.27, .78], [.29, .8], [.29, .84], [.27, .86]], 14, ZN); [.25, .45, .65].forEach(y => tor(g, .262 + (y - .1) * .025, .012, 14, ZN, 0, y, 0));
    lathe(g, [[.0, .85], [.3, .85], [.3, .88], [.26, .9], [.06, .95], [.04, .98], [.001, .99]], 14, ZS); if (F()) { [-1, 1].forEach(s => maniglia(g, s * .27, .62, 0, .14, ZS, true)); } return g; };
  T.cestino = () => {   // cestino comunale su palo: cesto in lamiera verde bombato (tornito), staffa al palo, tappo, fascia catarifrangente
    const g = new THREE.Group(); lathe(g, [[.09, 0], [.09, .04], [.05, .06], [.045, 1.0], [.05, 1.02], [.001, 1.03]], 10, GH); put(g, cylG(.047, .047, .06, 10), BC, 0, .55, 0);
    lathe(g, [[.0, 0], [.14, 0], [.2, .05], [.23, .3], [.21, .5], [.24, .53], [.21, .55]], 14, VD, 0, .5, .2); lathe(g, [[.0, 0], [.22, 0], [.2, .03], [.001, .04]], 14, mat('#2a4a2e', 'vernice'), 0, 1.03, .2);   // cesto e coperchio
    asta(g, [0, .75, .04], [0, .75, .2], .016, GH); asta(g, [0, .6, .04], [0, .6, .2], .016, GH); if (F()) bullone(g, 0, .75, .25, 'z', .008); return g; };
  T.campana = () => {   // campana del vetro verde: tornita con le tre bocchette di gomma e l'anello di sollevamento
    const g = new THREE.Group(), vd = mat('#3a7a4a', 'vernice'); lathe(g, [[.55, 0], [.6, .03], [.6, 1.15], [.56, 1.3], [.4, 1.5], [.2, 1.62], [.08, 1.66], [.001, 1.67]], 14, vd);
    [0, 2.1, 4.2].forEach(a => { tor(g, .11, .03, 10, GM, Math.cos(a) * .47, 1.42, Math.sin(a) * .47, PI / 2 - .6, 0, -a); }); if (F()) tor(g, .06, .012, 10, ZS, 0, 1.7, 0, 0); asta(g, [0, 1.62, 0], [0, 1.68, 0], .02, ZS); return g; };
  // ================= ARREDO URBANO =================
  T.cabina_sip = () => {   // cabina SIP anni '80: basamento, telaio d'alluminio, vetri a riquadri su tre lati, porta a soffietto, cassonetto TELEFONO acceso, apparecchio a gettoni
    const g = new THREE.Group(), al = mat('#b8bcc0', 'zinco'), W = 1.0, H = 2.3, gt = mat('#c8a020', 'vernice');
    slab(g, W + .16, .1, W + .16, CM, 0, .05, 0, .02); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .06, H, .06, al, a * W / 2, .1 + H / 2, b * W / 2, .008));
    [[0, -W / 2, 0], [-W / 2, 0, PI / 2], [W / 2, 0, PI / 2], [0, W / 2, 0]].forEach(([px, pz, ry], k) => { [.5, 1.3, 2.05].forEach(y => slab(g, W, .04, .04, al, px, .1 + y, pz, 0, 0, ry, 0)); slab(g, W, .06, .06, al, px, .1 + .02, pz, 0, 0, ry, 0);
      if (k !== 3) { put(g, slabG(W - .08, 1.9, .012, 0), VT, px, 1.18, pz, 0, ry, 0); } });
    for (let q = -1; q <= 1; q += 2) { const d = put(g, slabG(W / 2 - .04, 1.9, .025, 0), VT, q * W / 4, 1.18, W / 2 + .02 + (q > 0 ? .05 : 0), 0, q * .18, 0); void d; slab(g, .04, 1.9, .03, al, q * .03, 1.18, W / 2 + .06, 0, 0, q * .18, 0); }   // la porta a soffietto con il montante centrale
    slab(g, W + .12, .08, W + .12, mat('#c8ccd0', 'vernice'), 0, .1 + H + .04, 0, .02); put(g, slabG(W - .1, .3, W - .1, .02), LU, 0, .1 + H + .23, 0).name = 'luce'; luci(g, 0, .1 + H + .23, 0, '#fff0c0');
    [[0, W / 2 - .04, 0], [0, -W / 2 + .04, PI], [W / 2 - .04, 0, PI / 2], [-W / 2 + .04, 0, -PI / 2]].forEach(([px, pz, ry]) => targa(g, 'TELEFONO', .8, .2, px * 1.06, .1 + H + .23, pz * 1.06, ry, '#f2eee0', '#d8a020'));
    slab(g, .32, .48, .2, gt, 0, 1.45, -W / 2 + .14, .02); slab(g, .1, .2, .08, NR, -.1, 1.5, -W / 2 + .27, .01); cavo(g, [[-.1, 1.4, -W / 2 + .3], [-.14, 1.25, -W / 2 + .3], [-.02, 1.3, -W / 2 + .26]], .006, NR, 8);   // apparecchio, cornetta, il filo
    slab(g, .22, .08, .14, mat('#3a3a3e', 'vernice'), 0, 1.05, -W / 2 + .12, .01); slab(g, .24, .04, .3, mat('#d8d0b8', 'carta'), .25, 1.05, -W / 2 + .2, .005);   // la mensolina e l'elenco
    return g; };
  T.cassetta_postale = () => {   // cassetta delle lettere rossa su piantana: cassa smussata, tetto tondo, feritoia con la linguetta, targhetta degli orari, serratura
    const g = new THREE.Group(); lathe(g, [[.1, 0], [.1, .03], [.05, .06], [.045, 1.0], [.07, 1.02]], 10, mat('#3a3c40', 'vernice')); slab(g, .5, .55, .32, RS, 0, 1.25, 0, .03);
    put(g, cylG(.25, .25, .32, 14), RS, 0, 1.52, 0, 0, 0, PI / 2); slab(g, .3, .035, .025, NR, 0, 1.42, .17, 0); slab(g, .32, .04, .06, mat('#8a1a1c', 'vernice'), 0, 1.45, .18, .006, -.5, 0, 0);
    if (F()) { targa(g, 'LEVATE\n8 - 14 - 18', .26, .14, 0, 1.15, .165, 0, '#e8e4d8', '#3a3a3e'); targa(g, 'PT', .1, .1, .17, 1.32, .165, 0, '#e0c040', '#b8282a'); put(g, cylG(.015, .015, .01, 8), ZS, -.18, 1.08, .165, PI / 2, 0, 0); } return g; };
  T.fermata = () => {   // fermata dell'autobus con la pensilina bassa (2,3 m): due montanti, tetto in lamiera ondulata, pannello di fondo in vetro, panchetta a doghe, palo con la paletta
    const g = new THREE.Group(), m = mat('#5a5e60', 'vernice'), W = 3.0, D = 1.2;
    [-1.4, 1.4].forEach(x => { slab(g, .08, 2.2, .08, m, x, 1.1, -.5, .01); slab(g, .16, .02, .16, ZS, x, .01, -.5, 0); asta(g, [x, 2.15, -.5], [x, 2.22, .2], .03, m); });   // montanti con la piastra e il braccio inclinato del tetto
    const onda = []; for (let i = 0; i <= 24; i++) onda.push([-D / 2 + i / 24 * D, Math.sin(i / 24 * PI * 8) * .012]); const sh = new THREE.Shape(); onda.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); for (let i = 24; i >= 0; i--) sh.lineTo(onda[i][0], onda[i][1] + .02); sh.closePath();
    put(g, geo('onda', () => { const e = new THREE.ExtrudeGeometry(sh, { depth: W + .2, bevelEnabled: false }); e.translate(0, 0, -(W + .2) / 2); e.computeVertexNormals(); return e; }), ZN, 0, 2.2, -.15, -.06, PI / 2, 0);   // la lamiera ondulata inclinata verso dietro
    slab(g, W + .2, .05, .04, m, 0, 2.2, .45, 0); slab(g, W + .2, .05, .04, m, 0, 2.13, -.75, 0);   // le gronde
    put(g, slabG(2.7, 1.8, .012, 0), VT, 0, 1.3, -.55); [-1.35, 1.35].forEach(x => slab(g, .04, 1.8, .04, m, x, 1.3, -.55, 0)); slab(g, 2.7, .04, .04, m, 0, 2.2, -.55, 0); slab(g, 2.7, .04, .04, m, 0, .4, -.55, 0);   // pannello di fondo nel telaio
    for (let k = 0; k < 3; k++) slab(g, 2.0, .035, .1, LG, 0, .5, -.3 + k * .12, .005); [-.9, .9].forEach(x => { asta(g, [x, .5, -.4], [x, .5, -.02], .02, m); asta(g, [x, .48, -.4], [x, .06, -.4], .02, m); asta(g, [x, .06, -.4], [x, .06, -.05], .02, m); asta(g, [x, .48, -.08], [x, .06, -.08], .02, m); });   // panchetta a doghe sui supporti a L
    palo(g, 2.6, .04, m); g.children[g.children.length - 1].position.set(1.7, 0, .3); put(g, cylG(.3, .3, .03, 16), mat('#d08a2a', 'vernice'), 1.7, 2.5, .3, PI / 2, 0, 0); targa(g, 'FERMATA\n12 · 14', .4, .3, 1.7, 1.95, .34, 0, '#e8e4d8', '#2a4a7a', .02); if (F()) [1.75, 2.1].forEach(y => fascetta(g, y, .04).position.x += 1.7);
    g.children.filter(o => o.position.y === 1.75 || o.position.y === 2.1).forEach(o => { if (Math.abs(o.position.x) < .1) o.position.x += 1.7; }); return g; };
  T.edicola = () => {   // edicola dei giornali: chiosco in lamiera verde con lo zoccolo, tetto a padiglione, bancone, mensole a riviste, serranda alzata, insegna accesa
    const g = new THREE.Group(), W = 2.4, D = 1.6, H = 2.4, vd = mat('#3a6a4a', 'vernice'), vdS = mat('#2a4a3a', 'vernice');
    slab(g, W + .1, .18, D + .1, CS, 0, .09, 0, .02); slab(g, W, H - .18, D, vd, 0, .18 + (H - .18) / 2, 0, .04); [-1, 1].forEach(s => [-1, 1].forEach(t => slab(g, .08, H - .2, .08, vdS, s * (W / 2 - .02), .18 + (H - .18) / 2, t * (D / 2 - .02), .01)));
    ext(g, 'pad', shape([[-D / 2 - .25, 0], [D / 2 + .25, 0], [D / 2 + .22, .08], [0, .42], [-D / 2 - .22, .08]]), W + .5, .015, vdS, 0, H, .05, 0, PI / 2, 0); put(g, cylG(.05, .05, .4, 8), ZS, 0, H + .36, .05, PI / 2, 0, 0);   // il tetto e il colmo
    slab(g, W + .1, .08, .5, LGG, 0, .95, D / 2 + .22, .01); [-1, 1].forEach(s => asta(g, [s * 1.1, .91, D / 2 + .42], [s * 1.1, .91, D / 2 + .02], .02, GH)); [-1, 1].forEach(s => asta(g, [s * 1.1, .91, D / 2 + .4], [s * 1.1, .4, D / 2 + .02], .02, GH));   // il bancone sulle mensole
    put(g, cylG(.09, .09, W - .1, 12), ZS, 0, H - .22, D / 2 + .12, 0, 0, PI / 2); [-1, 1].forEach(s => slab(g, .06, .2, .2, vdS, s * (W / 2 - .06), H - .22, D / 2 + .1, .006));   // la serranda arrotolata nei suoi fianchetti
    for (let k = 0; k < 2; k++) { slab(g, W - .3, .03, .22, LGG, 0, 1.25 + k * .5, D / 2 + .11, .004, -.35, 0, 0); for (let q = 0; q < 6; q++) slab(g, .28, .34, .012, mat(['#e84a4a', '#f0e0c0', '#4a8ae8', '#f0c040', '#e8e8e0', '#50c0a0'][(q + k) % 6], 'carta'), -1.0 + q * .4, 1.42 + k * .5, D / 2 + .2, 0, -.35, 0, 0); }   // riviste in fila sulle mensole inclinate
    put(g, slabG(1.3, .32, .06, .01), LU, 0, H - .05, D / 2 + .04).name = 'luce'; targa(g, 'GIORNALI · TABACCHI', 1.26, .28, 0, H - .05, D / 2 + .075, 0, '#f4e8c8', '#2a4a3a'); luci(g, 0, H - .05, D / 2 + .1, '#ffe0a0');
    slab(g, .7, 1.8, .04, vdS, 0, 1.1, -D / 2 - .02, .006); if (F()) { cerniera(g, -.36, 1.5, -D / 2 - .04, .1, 'y'); cerniera(g, -.36, .7, -D / 2 - .04, .1, 'y'); maniglia(g, .25, 1.1, -D / 2 - .06, .12, ZS, true); }   // la porta di servizio dietro
    return g; };
  T.chiosco = () => {   // chiosco del lungomare: pianta ottagonale bianca e azzurra, bancone tutto intorno, tetto a cono con la punta, frigo delle bibite, insegna
    const g = new THREE.Group(), R = 1.3, H = 2.3, bi = mat('#e8e6dc', 'vernice'), az = mat('#5a9ab8', 'vernice');
    lathe(g, [[R + .1, 0], [R + .1, .12], [R, .14], [R, 1.0], [R + .18, 1.0], [R + .18, 1.08], [R, 1.1], [R - .02, H - .3], [R, H - .25]], 8, bi, 0, 0, 0, PI / 8); lathe(g, [[R + .005, .14], [R + .005, .55]], 8, az, 0, 0, 0, PI / 8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; asta(g, [Math.cos(a) * (R - .02), 1.1, Math.sin(a) * (R - .02)], [Math.cos(a) * (R - .02), H - .2, Math.sin(a) * (R - .02)], .03, az); if (i !== 4) put(g, slabG(.9, .9, .012, 0), VT, Math.cos(a + PI / 8) * (R - .02) * .99, 1.6, Math.sin(a + PI / 8) * (R - .02) * .99, 0, -a - PI / 8 + PI / 2, 0); }   // montanti e vetrate (una lasciata aperta: il passaggio)
    lathe(g, [[R + .35, H - .3], [R + .35, H - .25], [.3, H + .35], [.05, H + .45], [.05, H + .6], [.001, H + .62]], 8, az, 0, 0, 0, PI / 8); put(g, sphG(.06, 8), bi, 0, H + .62, 0);
    targa(g, 'BAR · GELATI · BIBITE', 1.0, .2, 0, H - .42, R + .03, 0, '#e8e6dc', '#2a4a7a'); luci(g, 0, 1.8, 0, '#ffe8c0');
    slab(g, .6, .9, .5, bi, .4, .45, -.5, .02); put(g, slabG(.5, .5, .012, 0), VT, .4, 1.0, -.5, -PI / 2, 0, 0); targa(g, 'GELATI', .4, .12, .4, .6, -.24, 0, '#5a9ab8', '#e8e6dc'); return g; };
  // ================= TRANSENNE, JERSEY, PALETTI =================
  T.transenna = () => {   // transenna zincata 2 × 1,1 con il telaio tubolare, le barre verticali, i piedi a T e i ganci di collegamento alle due estremità (userData.aggancio)
    const g = new THREE.Group(), L = 2.0, H = 1.1; asta(g, [-L / 2, .18, 0], [-L / 2, H, 0], .02, ZN); asta(g, [L / 2, .18, 0], [L / 2, H, 0], .02, ZN); asta(g, [-L / 2, H, 0], [L / 2, H, 0], .02, ZN); asta(g, [-L / 2, .35, 0], [L / 2, .35, 0], .016, ZN);
    for (let k = 1; k < 10; k++) asta(g, [-L / 2 + k * L / 10, .35, 0], [-L / 2 + k * L / 10, H, 0], .009, ZN);
    [-L / 2, L / 2].forEach(x => { asta(g, [x, .19, -.3], [x, .19, .3], .018, ZN); asta(g, [x, .19, -.3], [x, .0 + .02, -.3], .018, ZN); asta(g, [x, .19, .3], [x, .02, .3], .018, ZN); put(g, cylG(.03, .03, .03, 8), GM, x, .015, -.3); put(g, cylG(.03, .03, .03, 8), GM, x, .015, .3); });   // i piedi a T con i tappi di gomma
    if (F()) { tor(g, .03, .007, 8, ZS, -L / 2 - .03, .9, 0, 0, 0, PI / 2); asta(g, [L / 2, .95, 0], [L / 2 + .06, .95, 0], .009, ZS); asta(g, [L / 2 + .06, .95, 0], [L / 2 + .06, .86, 0], .009, ZS); }   // l'anello e il gancio
    g.userData.aggancio = [[-L / 2, .9, 0], [L / 2, .9, 0]]; return g; };
  T.jersey = (o) => {   // new jersey da 2 m: profilo estruso con lo smusso; di cemento (ganci di sollevamento, piedini di gomma) o di plastica bianca e rossa (tappi dell'acqua); si mettono in fila
    const g = new THREE.Group(), pl = o && o.plastica, m = pl ? mat(o.col || '#c8c2b6', 'plastica') : CM;
    ext(g, 'nj', shape([[-.3, 0], [.3, 0], [.28, .08], [.12, .26], [.08, .8], [-.08, .8], [-.12, .26], [-.28, .08]]), 1.9, .015, m, 0, 0, 0, 0, 0, 0, 4).scale.y = pl ? .9 : 1;
    if (pl) { [.5, -.5].forEach(z => put(g, cylG(.06, .06, .03, 8), m, 0, .73, z)); } else { [-.7, .7].forEach(z => slab(g, .62, .04, .12, GM, 0, .02, z, 0)); tor(g, .05, .01, 8, RG, 0, .82, .8, 0); tor(g, .05, .01, 8, RG, 0, .82, -.8, 0); }
    g.userData.aggancio = [[0, .4, -.95], [0, .4, .95]]; return g; };
  T.paletto = () => {   // paletto dissuasore in ghisa: tornito col collare, la testa a cupola, l'anello per la catena, la fascia catarifrangente
    const g = new THREE.Group(); lathe(g, [[.085, 0], [.085, .04], [.065, .07], [.058, .55], [.07, .6], [.07, .66], [.058, .7], [.055, .82], [.04, .9], [.001, .93]], 12, GH); put(g, cylG(.06, .06, .07, 12), BC, 0, .76, 0);
    if (F()) tor(g, .025, .007, 8, GH, 0, .64, .085, 0, PI / 2, 0); return g; };
  T.paletti_catena = (o) => {   // n paletti a interasse 1,5 m uniti dalla catena a maglie che pende a catenaria (lungo x, centrata)
    const g = new THREE.Group(), n = (o && o.n) || 3, P = 1.5, x0 = -(n - 1) * P / 2;
    for (let i = 0; i < n; i++) { const p = T.paletto(); p.position.x = x0 + i * P; g.add(p); }
    for (let i = 0; i < n - 1; i++) { const xa = x0 + i * P, L = P, N = 16; for (let k = 0; k < N; k++) { const t = (k + .5) / N, x = xa + t * L, y = .64 - .18 * 4 * t * (1 - t); const m = put(g, torG(.028, .007, 8), GH, x, y, .085, k % 2 ? 0 : PI / 2, PI / 2, 0); void m; } }
    g.userData.aggancio = [[x0, .64, .085], [x0 + (n - 1) * P, .64, .085]]; return g; };
  T.fioriera = (o) => {   // fioriera di cemento (o di cotto) col bordo, la terra, i cespi e i gerani; 1,2 m: segna il confine dei dehors
    const g = new THREE.Group(), w = (o && o.w) || 1.2, cotto = o && o.cotto, m = cotto ? mat(C.cotto, 'pietra') : CM, mB = cotto ? mat('#b86a48', 'pietra') : mat('#9a968e', 'cemento');
    slab(g, w, .42, .5, m, 0, .21, 0, .035); slab(g, w + .06, .06, .56, mB, 0, .45, 0, .015); slab(g, w - .08, .03, .42, mat(C.terra, 'pietra'), 0, .47, 0, 0);
    const n = Math.max(2, Math.round(w / .3)); for (let k = 0; k < n; k++) { const x = -w / 2 + .15 + k * (w - .3) / (n - 1); put(g, icoG(.13, 1), mat(k % 2 ? C.foglia : C.fogliaC, 'tela'), x, .58, (k % 2 ? .08 : -.06)).scale.set(1.1, .8, 1); if (F()) for (let q = 0; q < 3; q++) put(g, sphG(.03, 6), mat(['#c03a3a', '#d04a6a', '#e8e0d0'][(k + q) % 3], 'vernice'), x + (q - 1) * .07, .7 + (q % 2) * .03, (k % 2 ? .08 : -.06) + (q - 1) * .04); }
    return g; };
  // ================= ACQUA =================
  T.fontanella = () => {   // fontanella pubblica in ghisa: colonnina tornita, il bocchello curvo che gocciola, il rubinetto a pulsante, la vaschetta a terra con la griglia
    const g = new THREE.Group(); lathe(g, [[.2, 0], [.2, .04], [.14, .07], [.12, .1], [.1, .9], [.13, .95], [.13, 1.0], [.09, 1.06], [.001, 1.08]], 12, GH);
    cavo(g, [[0, .78, .1], [0, .86, .22], [0, .8, .3], [0, .72, .31]], .018, OT, 10); put(g, cylG(.02, .02, .07, 8), OT, 0, .66, .12, PI / 2, 0, 0); put(g, cylG(.028, .028, .012, 8), OT, 0, .66, .165, PI / 2, 0, 0);   // bocchello e pulsante
    slab(g, .5, .06, .5, mat('#8a8478', 'cemento'), 0, .03, .3, .01); for (let k = -2; k <= 2; k++) asta(g, [k * .08, .06, .1], [k * .08, .06, .5], .008, GH); asta(g, [-.2, .06, .3], [.2, .06, .3], .008, GH);   // la vaschetta e la griglia
    if (F()) asta(g, [0, .72, .31], [0, .1, .31], .012, mat('#5a7a8a', 'vetro'));   // il filo d'acqua
    return g; };
  T.idrante = () => {   // idrante soprasuolo rosso: colonna tornita con la flangia a bulloni, due bocche laterali con i tappi e le catenelle, il cappello col quadrello
    const g = new THREE.Group(); lathe(g, [[.14, 0], [.14, .05], [.1, .07], [.09, .5], [.12, .55], [.12, .6], [.09, .64], [.085, .95], [.11, 1.0], [.07, 1.08], [.03, 1.14], [.03, 1.2]], 12, RS);
    if (F()) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; bullone(g, Math.cos(a) * .115, .575, Math.sin(a) * .115, 'y', .009, GH); }
    [-1, 1].forEach(s => { put(g, cylG(.05, .05, .1, 10), RS, s * .13, .8, 0, 0, 0, PI / 2); put(g, cylG(.055, .045, .03, 10), GH, s * .19, .8, 0, 0, 0, PI / 2); if (F()) cavo(g, [[s * .19, .78, .04], [s * .16, .68, .08], [s * .1, .7, .06]], .005, GH, 8); });
    put(g, cylG(.035, .045, .06, 4), GH, 0, 1.23, 0); return g; };
  // ================= ENEL (li usa anche la rete elettrica) =================
  T.isolatore = () => {   // isolatore di porcellana a campana doppia sul suo perno zincato
    const g = new THREE.Group(); lathe(g, [[.012, 0], [.012, .05], [.03, .05], [.05, .09], [.052, .1], [.035, .11], [.03, .13], [.05, .17], [.052, .18], [.028, .2], [.02, .23], [.001, .24]], 12, PO); put(g, cylG(.011, .011, .07, 6), ZS, 0, .025, 0); return g; };
  T.mensola = (o) => {   // mensola ENEL a muro: staffa in ferro a L coi tasselli, traversa con n isolatori (o.n, 3), il tirante; origine sulla piastra (a muro)
    const g = new THREE.Group(); g.userData.aMuro = true; const n = (o && o.n) || 3, L = .18 + n * .16;
    slab(g, .1, .3, .02, GH, 0, 0, .01, .004); if (F()) [-.11, .11].forEach(y => bullone(g, 0, y, .022, 'z', .01, GH)); asta(g, [0, .1, .02], [0, .1, L], .018, GH); asta(g, [0, -.13, .02], [0, .06, L - .04], .012, GH);   // la piastra, il braccio, il saettone
    asta(g, [-(n - 1) * .08, .1, L], [(n - 1) * .08, .1, L], .014, GH); for (let i = 0; i < n; i++) { const iso = T.isolatore(); iso.position.set((i - (n - 1) / 2) * .16, .1, L); g.add(iso); }
    g.userData.attacchi = []; for (let i = 0; i < n; i++) g.userData.attacchi.push([(i - (n - 1) / 2) * .16, .32, L]); return g; };
  T.contatore = () => {   // contatore ENEL a muro: cassetta grigia smussata con lo sportellino di vetro, il quadrante, i due tubi che salgono e scendono, le viti
    const g = new THREE.Group(); g.userData.aMuro = true; const m = mat('#a8a8a0', 'plastica');
    slab(g, .36, .5, .14, m, 0, 0, .07, .02); put(g, slabG(.18, .14, .01, 0), VT, 0, .08, .142); targa(g, 'kWh\n0 4 2 7 1', .14, .08, 0, .08, .139, 0, '#e8e4d8', '#2a2a2e'); slab(g, .3, .03, .02, mat('#8a8a82', 'plastica'), 0, -.14, .145, .004);
    asta(g, [.1, .25, .05], [.1, .6, .05], .02, mat('#9a9a92', 'plastica')); asta(g, [-.1, -.25, .05], [-.1, -.55, .05], .02, mat('#9a9a92', 'plastica')); if (F()) { [-.15, .15].forEach(x => [-.21, .21].forEach(y => bullone(g, x, y, .142, 'z', .007, ZS))); tor(g, .028, .006, 8, ZS, .1, .45, .05, 0); }
    return g; };
  T.cabina_enel = () => {   // cabina ENEL prefabbricata: cassone di cemento con il tetto a sbalzo, porta di lamiera a feritoie con le cerniere e il lucchetto, targa di pericolo, griglie, mensola con isolatori sul tetto e il contatore a fianco
    const g = new THREE.Group(), W = 2.0, D = 1.6, H = 2.5, m = mat('#a8a49a', 'cemento'), mS = mat('#8e8a80', 'cemento'), lam = mat('#6a6e6c', 'vernice');
    slab(g, W + .1, .12, D + .1, mS, 0, .06, 0, .02); slab(g, W, H - .12, D, m, 0, .12 + (H - .12) / 2, 0, .04); slab(g, W + .3, .12, D + .3, mS, 0, H + .06, 0, .02);
    slab(g, .9, 2.0, .05, lam, -.3, 1.15, D / 2 + .02, .008); for (let k = 0; k < 7; k++) slab(g, .7, .02, .03, mat('#5a5e5c', 'vernice'), -.3, .45 + k * .09, D / 2 + .05, 0); for (let k = 0; k < 5; k++) slab(g, .7, .02, .03, mat('#5a5e5c', 'vernice'), -.3, 1.6 + k * .09, D / 2 + .05, 0);   // la porta con le feritoie
    if (F()) { cerniera(g, -.73, 1.7, D / 2 + .05, .1, 'y'); cerniera(g, -.73, .6, D / 2 + .05, .1, 'y'); maniglia(g, .05, 1.15, D / 2 + .05, .12, ZS, true); slab(g, .06, .08, .03, OT, .05, .95, D / 2 + .07, .006); }
    targa(g, 'PERICOLO\nDI MORTE', .36, .26, -.3, 1.95, D / 2 + .052, 0, '#e8c830', '#1a1a1c', .01); targa(g, 'ENEL\nCABINA 12', .3, .14, .7, 1.9, D / 2 + .005, 0, '#e8e4d8', '#2a4a7a', .01);
    slab(g, .5, .4, .03, lam, .6, .7, D / 2 + .015, .004); for (let k = 0; k < 6; k++) slab(g, .44, .015, .02, mat('#4a4e4c', 'vernice'), .6, .53 + k * .065, D / 2 + .03, 0);   // la griglia di aerazione
    const ms = T.mensola({ n: 3 }); ms.rotation.x = -PI / 2; ms.position.set(.5, H + .12, -.3); g.add(ms); asta(g, [.5, H + .12, -.3], [.5, H + .12, -.3 + .01], .02, GH);   // la mensola in piedi sul tetto
    const ct = T.contatore(); ct.rotation.y = -PI / 2; ct.position.set(W / 2, 1.4, .2); g.add(ct); return g; };
  // ================= COSE DEL LAVORO E DEL MERCATO =================
  T.bombola = (o) => {   // bombola GPL da 15 kg: tornita con la spalla, il piede ad anello, il collare forato con le due maniglie, la valvola d'ottone col tappo
    const g = new THREE.Group(), m = mat((o && o.col) || '#c03a2a', 'vernice'), R = .15, H = .62;
    lathe(g, [[R * .9, 0], [R * .95, .05], [R * .9, .06]], 14, GH); lathe(g, [[0, .05], [R - .01, .05], [R, .08], [R, H - .12], [R * .8, H - .04], [.035, H], [0, H]], 14, m);
    lathe(g, [[R * .62, H - .06], [R * .7, H + .1], [R * .66, H + .1], [R * .58, H - .06]], 12, mat('#8a2a20', 'vernice')); [[0, PI / 2]].forEach(() => { for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; put(g, cylG(.025, .025, .02, 8), m, Math.cos(a) * R * .66, H + .02, Math.sin(a) * R * .66, PI / 2, a, 0); } });   // i fori del collare (come borchie incavate)
    put(g, cylG(.025, .025, .08, 8), OT, 0, H + .04, 0); put(g, cylG(.04, .04, .015, 8), NR, 0, H + .085, 0); if (F()) targa(g, 'GAS\n15 kg', .1, .06, 0, .32, R + .002, 0, '#e8e4d8', '#2a2a2e'); return g; };
  T.carretto = () => {   // carretto a mano a due ruote: cassone a doghe con le sponde, le stanghe, le ruote a dodici raggi col cerchione di ferro, il piede d'appoggio
    const g = new THREE.Group(), W = 1.0, L = 1.4; slab(g, W, .035, L, LG, 0, .55, 0, .004); [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) slab(g, .025, .11, L, LG, s * (W / 2 - .012), .62 + k * .12, 0, .003); [-.6, 0, .6].forEach(z => slab(g, .04, .4, .04, LS, s * (W / 2 - .02), .76, z, .004)); });   // sponde a doghe coi montanti
    for (let k = 0; k < 3; k++) slab(g, W, .11, .025, LG, 0, .62 + k * .12, -L / 2 + .012, .003); slab(g, W, .07, .03, LS, 0, .51, 0, .004); [-.3, .3].forEach(x => slab(g, .06, .07, L, LS, x, .51, 0, .004));   // sponda di fondo e il telaio sotto
    asta(g, [-.3, .5, .2], [-.3, .3, .2], .025, LS); asta(g, [.3, .5, .2], [.3, .3, .2], .025, LS); asta(g, [-.5, .3, .2], [.5, .3, .2], .022, GH);   // i supporti e l'asse
    [-1, 1].forEach(s => { const x = s * .55; tor(g, .3, .018, 20, GH, x, .3, .2, 0, PI / 2, 0); put(g, cylG(.05, .05, .07, 10), LS, x, .3, .2, 0, 0, PI / 2); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; asta(g, [x, .3, .2], [x, .3 + Math.cos(a) * .285, .2 + Math.sin(a) * .285], .009, LGG); } });   // ruote a raggi
    [-.35, .35].forEach(x => asta(g, [x, .52, L / 2], [x, .62, L / 2 + .9], .022, LS)); asta(g, [-.35, .62, L / 2 + .9], [.35, .62, L / 2 + .9], .018, LS);   // le stanghe col manico
    asta(g, [0, .5, -L / 2 + .15], [0, .02, -L / 2 + .05], .02, GH); put(g, cylG(.05, .05, .03, 8), GM, 0, .015, -L / 2 + .05); return g; };
  T.bancarella = (o) => {   // bancarella del mercato: piano su quattro gambe col ripiano basso, tenda a strisce sui montanti, cassette inclinate con la merce, bilancia, cartellini
    const g = new THREE.Group(), ca = (o && o.col) || C.verde, mT = mat(ca, 'tela'), W = 2.4, D = 1.3;
    slab(g, W, .05, D, LGG, 0, .9, 0, .008); slab(g, W - .1, .035, D - .2, LG, 0, .3, 0, .005); [[-1.15, -.6], [1.15, -.6], [-1.15, .6], [1.15, .6]].forEach(([x, z]) => { slab(g, .07, .88, .07, LS, x, .44, z, .006); asta(g, [x, .9, z], [x * .97, 2.35, z * .9], .022, GH); });
    slab(g, W, .55, .025, LG, 0, .6, D / 2 - .01, .004);   // la pannellatura davanti
    asta(g, [-1.12, 2.35, -.54], [1.12, 2.35, -.54], .02, GH); asta(g, [-1.12, 2.35, .54], [1.12, 2.35, .54], .02, GH); asta(g, [-1.12, 2.35, -.54], [-1.12, 2.35, .54], .02, GH); asta(g, [1.12, 2.35, -.54], [1.12, 2.35, .54], .02, GH);   // il telaio della tenda
    const telo = put(g, slabG(W + .4, .025, D + .5, 0), mT, 0, 2.4, .1, .18, 0, 0); void telo; slab(g, W + .4, .22, .02, mT, 0, 2.2, D / 2 + .3, 0); for (let k = 0; k < 7; k++) slab(g, .2, .22, .022, BC, -W / 2 - .05 + k * .43, 2.2, D / 2 + .31, 0);   // il telo con la mantovana a strisce
    for (let k = 0; k < 4; k++) { const x = -.9 + k * .6; slab(g, .5, .14, .36, LGG, x, 1.0, .15, .006, .3, 0, 0); for (let q = 0; q < 6; q++) put(g, icoG(.055, 0), mat(['#c84a2a', '#e0b030', '#4a8a3a', '#d06a2a'][(k + Math.floor(q / 2)) % 4], 'tela'), x - .14 + (q % 3) * .14, 1.1 + (q > 2 ? .03 : .0) - (q > 2 ? 0 : .04), .06 + (q > 2 ? .13 : 0)); }
    slab(g, .3, .1, .22, BC, .95, .98, -.4, .01); put(g, cylG(.14, .14, .02, 12), ZN, .95, 1.09, -.4); asta(g, [.95, 1.0, -.4], [.95, 1.08, -.4], .02, ZS); if (F()) for (let k = 0; k < 3; k++) targa(g, ['1200', '800', '1500'][k], .12, .08, -.8 + k * .7, 1.2, .5, 0, '#f0ead8', '#2a2a2e');
    return g; };
  T.tavolino = () => {   // tavolino da bar: piano di marmo smussato, colonna di ghisa tornita su tre piedi a voluta, Ø 70
    const g = new THREE.Group(); put(g, cylG(.35, .35, .035, 20), mat('#e8e2d6', 'pietra'), 0, .735, 0); tor(g, .35, .012, 20, mat('#d8d2c6', 'pietra'), 0, .72, 0);
    lathe(g, [[.06, 0], [.06, .03], [.03, .07], [.025, .6], [.035, .66], [.09, .7], [.09, .72]], 10, GH); for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; cavo(g, [[0, .08, 0], [Math.cos(a) * .18, .05, Math.sin(a) * .18], [Math.cos(a) * .3, .02, Math.sin(a) * .3]], .016, GH, 8); put(g, cylG(.025, .025, .02, 8), GH, Math.cos(a) * .3, .01, Math.sin(a) * .3); }
    return g; };
  T.sedia = () => {   // sedia pieghevole da bar: telaio tubolare verde, sedile e schienale a doghe di legno, i perni della piega
    const g = new THREE.Group(), m = VD; [-1, 1].forEach(s => { asta(g, [s * .2, .02, .2], [s * .2, .86, -.22], .011, m); asta(g, [s * .2, .02, -.2], [s * .2, .45, .18], .011, m); asta(g, [s * .2, .45, .18], [s * .2, .45, -.19], .011, m); put(g, cylG(.015, .015, .02, 8), GM, s * .2, .01, .2); put(g, cylG(.015, .015, .02, 8), GM, s * .2, .01, -.2); });
    asta(g, [-.2, .86, -.22], [.2, .86, -.22], .011, m); asta(g, [-.2, .02, .2], [.2, .02, .2], .011, m); asta(g, [-.2, .02, -.2], [.2, .02, -.2], .011, m);
    for (let k = 0; k < 4; k++) slab(g, .42, .022, .07, LGG, 0, .465, -.15 + k * .1, .004); slab(g, .42, .1, .022, LGG, 0, .78, -.2, .004, .12, 0, 0); if (F()) [-1, 1].forEach(s => bullone(g, s * .21, .45, .03, 'x', .008, ZS)); return g; };
  T.ombrellone = (o) => {   // ombrellone da bar: base di cemento tornita, palo, otto stecche con i puntali, il telo a spicchi, il pomolo
    const g = new THREE.Group(), ca = (o && o.col) || '#e0cdb0', mT = mat(ca, 'tela'), H = 2.3, R = 1.4;
    lathe(g, [[.25, 0], [.25, .05], [.15, .1], [.06, .12], [.04, .16]], 12, CM); asta(g, [0, .1, 0], [0, H + .05, 0], .022, BC);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; asta(g, [0, H - .02, 0], [Math.cos(a) * R, H - .42, Math.sin(a) * R], .009, BC); put(g, sphG(.018, 6), BC, Math.cos(a) * R, H - .42, Math.sin(a) * R); }
    put(g, geo('omb', () => new THREE.ConeGeometry(R, .42, 8, 1, true)), mT, 0, H - .21, 0).material.side = THREE.DoubleSide; put(g, sphG(.03, 8), BC, 0, H + .07, 0); return g; };
  T.lavagna = () => {   // lavagna del menù a cavalletto: due telai di legno a cerniera in cima, lavagna nera con la cornice, la catenella che li tiene aperti
    const g = new THREE.Group(), tilt = .2; [-1, 1].forEach(s => { const z0 = s * .02, z1 = s * Math.sin(tilt) * 1.0; [-.28, .28].forEach(x => asta(g, [x, .02, z1], [x, 1.0, z0], .018, LG)); asta(g, [-.28, .95, z0 + s * .01], [.28, .95, z0 + s * .01], .016, LG); asta(g, [-.28, .25, z1 * .77], [.28, .25, z1 * .77], .016, LG); });
    put(g, slabG(.5, .64, .015, 0), NR, 0, .6, Math.sin(tilt) * .4 + .02, -tilt, 0, 0); targa(g, 'OGGI\nPASTA E CECI\nFRITTURA', .44, .5, 0, .6, Math.sin(tilt) * .4 + .032, 0, '#1a1a1c', '#e8e4d8').rotation.x = -tilt;
    cerniera(g, 0, 1.0, 0, .56, 'x'); if (F()) cavo(g, [[.25, .25, -Math.sin(tilt) * .77], [.25, .12, 0], [.25, .25, Math.sin(tilt) * .77]], .004, ZS, 8); return g; };
  T.frigo_gelati = () => {   // frigo dei gelati a pozzetto: cassa bianca smussata, due coperchi scorrevoli di vetro, maniglie, griglia sul retro, ruote, insegna
    const g = new THREE.Group(), W = 1.2, H = .9, D = .7, bi = mat('#e8e6e0', 'vernice');
    slab(g, W, H - .08, D, bi, 0, .08 + (H - .08) / 2, 0, .03); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { put(g, cylG(.04, .04, .03, 10), GM, a * (W / 2 - .08), .04, b * (D / 2 - .08), 0, 0, PI / 2); slab(g, .03, .06, .03, ZS, a * (W / 2 - .08), .06, b * (D / 2 - .08), 0); });
    slab(g, W + .02, .04, D + .02, mat('#c8c6c0', 'vernice'), 0, H, 0, .01); [-1, 1].forEach(s => { put(g, slabG(W / 2 - .06, .01, D - .12, 0), VT, s * (W / 4 - .02), H + .03, 0); slab(g, W / 2 - .06, .03, .03, ZS, s * (W / 4 - .02), H + .03, D / 2 - .06, 0); });
    targa(g, 'GELATI\nMOTTINO', .7, .4, 0, .55, D / 2 + .005, 0, '#2a6aa8', '#ffffff'); for (let k = 0; k < 8; k++) slab(g, W - .3, .01, .02, mat('#5a5a5a', 'vernice'), 0, .2 + k * .05, -D / 2 - .005, 0);
    if (F()) { targa(g, '-18°', .12, .06, -.45, .82, D / 2 + .005, 0, '#e8e6e0', '#2a2a2e'); } return g; };
  // ================= IL PORTO =================
  T.bitta = () => {   // bitta d'ormeggio: ghisa tornita a fungo sulla piastra a quattro bulloni, con la cima avvolta
    const g = new THREE.Group(); lathe(g, [[.0, 0], [.34, 0], [.34, .05], [.2, .07], [.17, .12], [.15, .36], [.19, .42], [.26, .46], [.26, .52], [.2, .56], [0, .57]], 14, GH);
    if (F()) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bullone(g, a * .24, .055, b * .24, 'y', .016, mat('#4a4a4e', 'zinco'))); tor(g, .2, .035, 14, mat('#c8b88a', 'tela'), 0, .2, 0); tor(g, .19, .03, 14, mat('#c0b082', 'tela'), 0, .27, 0); return g; };
  T.reti = () => {   // reti da pesca ammucchiate sulla banchina: mucchio verde-mare coi sugheri, la boa arancione, la cima arrotolata
    const g = new THREE.Group(), mR = mat(C.mare, 'tela'), mR2 = mat('#3a5a4a', 'tela');
    [[0, 0, 0, 1.1, .22], [.45, .12, .3, .7, .2], [-.5, .1, -.2, .6, .18], [.1, .28, -.1, .5, .16]].forEach(([x, y, z, rx, ry], i) => { const o = put(g, icoG(.5, 1), i % 2 ? mR2 : mR, x, y, z); o.scale.set(rx, ry / .5 * .5, rx * .75); o.scale.y = ry; });
    for (let k = 0; k < 7; k++) put(g, cylG(.05, .05, .07, 8), mat('#c8a868', 'legno'), -.7 + k * .25, .32 + (k % 2) * .06, (k % 3 - 1) * .3, (k % 2) * .6, k, 0);   // i sugheri
    put(g, sphG(.16, 10), mat('#e06a2a', 'plastica'), .75, .42, .35); asta(g, [.75, .58, .35], [.75, .7, .35], .012, ZS); tor(g, .22, .05, 14, mat('#c8b88a', 'tela'), -.9, .05, .5); tor(g, .2, .045, 14, mat('#c8b88a', 'tela'), -.9, .14, .5); return g; };
  T.nassa = () => {   // nassa: cesta cilindrica con tre cerchi e le stecche di canna, l'imbocco a cono, il galleggiante legato
    const g = new THREE.Group(), m = mat('#a08a5a', 'legno'), R = .3, H = .5; [.02, H / 2, H - .02].forEach(y => tor(g, R, .012, 16, m, 0, y, 0));
    for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; asta(g, [Math.cos(a) * R, .02, Math.sin(a) * R], [Math.cos(a) * R, H - .02, Math.sin(a) * R], .007, m); }
    put(g, geo('nas', () => new THREE.CylinderGeometry(R - .01, R - .01, H - .04, 14, 1, true)), mat('#3a5a4a', 'vetro'), 0, H / 2, 0); put(g, geo('imb', () => new THREE.ConeGeometry(R - .02, .3, 12, 1, true)), mat('#3a5a4a', 'vetro'), 0, H - .17, 0);
    if (F()) { asta(g, [R, .5, 0], [R + .15, .62, .1], .005, mat('#c8b88a', 'tela')); put(g, sphG(.06, 8), mat('#e8e4d8', 'plastica'), R + .17, .66, .11); } return g; };
  T.cassetta_pesce = (o) => {   // cassetta del pesce: polistirolo bianco (o legno a doghe) bassa, con il ghiaccio e i pesci argentati a scaglie
    const g = new THREE.Group(), legno = o && o.legno, W = .55, H = .16, D = .38, m = legno ? LGG : mat('#eceae2', 'plastica');
    if (legno) { slab(g, W, .02, D, m, 0, .01, 0, 0); [-1, 1].forEach(s => { slab(g, W, .06, .015, m, 0, .05, s * (D / 2 - .008), 0); slab(g, W, .06, .015, m, 0, .12, s * (D / 2 - .008), 0); slab(g, .015, .14, D, m, s * (W / 2 - .008), .08, 0, 0); }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .03, H, .03, LS, a * (W / 2 - .02), H / 2, b * (D / 2 - .02), 0)); }
    else { slab(g, W, H, D, m, 0, H / 2, 0, .015); slab(g, W - .06, .02, D - .06, mat('#dcdad2', 'plastica'), 0, H - .005, 0, 0); if (F()) [-1, 1].forEach(s => slab(g, .08, .03, .04, mat('#c8c6be', 'plastica'), s * (W / 2 - .06), H - .06, D / 2 + .01, 0)); }
    put(g, slabG(W - .08, .03, D - .08, .01), mat('#dfe8ee', 'vetro'), 0, H - .02, 0);
    for (let k = 0; k < 6; k++) { const f = put(g, latheG([[0, 0], [.025, .05], [.03, .15], [.02, .22], [.008, .26], [0, .27]], 8), mat(k % 2 ? '#9ab0c0' : '#b8c8d0', 'zinco'), -.17 + (k % 3) * .17, H + .005, -.08 + Math.floor(k / 3) * .16, PI / 2, 0, (k % 3 - 1) * .3); f.scale.z = .5; }
    return g; };
  // ================= CANTIERE E TETTI =================
  T.scala_pioli = () => {   // scala a pioli di legno da 3 m appoggiata (15°): due montanti rastremati, dieci pioli torniti, i piedini di gomma, i due tiranti di ferro
    const g = new THREE.Group(), L = 3.0, t = .26, m = LGG; const P = (x, s) => [x, Math.cos(t) * s, Math.sin(t) * s];
    [-.2, .2].forEach(x => { asta(g, P(x, 0), P(x * .85, L), .024, m); put(g, cylG(.028, .028, .03, 8), GM, x, .01, 0); });
    for (let k = 0; k < 10; k++) { const s = .25 + k * .28, w = .2 - .03 * s / L; asta(g, P(-w, s), P(w, s), .014, LG); } if (F()) [.9, 2.1].forEach(s => { const w = .2 - .03 * s / L; asta(g, P(-w - .02, s + .04), P(w + .02, s + .04), .005, ZS); }); return g; };
  T.impalcatura = () => {   // una campata di impalcatura 1,8 × 2 piani: montanti con le basette, correnti, diagonale, tavole, fermapiede, giunti, rete arancione
    const g = new THREE.Group(), L = 1.8, piani = 2, H = piani * 2 + .4, X = [-L / 2, L / 2], Z = [0, 1.0];
    X.forEach(x => Z.forEach(z => { asta(g, [x, 0, z], [x, H, z], .024, ZN); slab(g, .15, .02, .15, ZN, x, .01, z, 0); for (let l = 1; l <= piani; l++) put(g, cylG(.034, .034, .07, 8), ZS, x, l * 2, z); }));   // montanti, basette, giunti
    for (let l = 1; l <= piani; l++) { const y = l * 2; Z.forEach(z => asta(g, [X[0], y, z], [X[1], y, z], .02, ZN)); X.forEach(x => asta(g, [x, y, Z[0]], [x, y, Z[1]], .02, ZN)); [.5, 1.0].forEach(h => asta(g, [X[0], y + h, Z[1]], [X[1], y + h, Z[1]], .02, ZN));   // correnti e parapetto
      [.2, .5, .8].forEach(t => slab(g, L, .045, .26, LGG, 0, y + .03, Z[0] + t, .004)); slab(g, L, .15, .02, GL, 0, y + .12, Z[1] - .02, 0); }   // tavole e fermapiede
    asta(g, [X[0], .1, Z[1]], [X[1], 2.0, Z[1]], .02, ZN); asta(g, [X[0], .1, Z[0]], [X[1], 2.0, Z[0]], .02, ZN);
    put(g, geo('rete', () => new THREE.PlaneGeometry(L - .1, H - .6)), mat('#e06a1e', 'vetro'), 0, H / 2 + .1, Z[1] + .04).material.side = THREE.DoubleSide; return g; };
  T.cavalletto = () => {   // cavalletto da cantiere ad A: due gambe a tronco di cono di legno per lato, traversa in cima, catena che le tiene; 1 m
    const g = new THREE.Group(), m = LG; [-1, 1].forEach(s => { [-.45, .45].forEach(x => asta(g, [x, .0, s * .32], [x * .9, .95, s * .04], .028, m)); asta(g, [-.45, .3, s * .22], [.45, .3, s * .22], .018, m); });
    slab(g, 1.1, .06, .1, LS, 0, .98, 0, .008); cerniera(g, 0, .96, 0, 1.0, 'x'); if (F()) cavo(g, [[.3, .3, -.22], [.3, .2, 0], [.3, .3, .22]], .004, ZS, 8); return g; };
  T.antenna_tv = (o) => {   // antenna TV 1986: palo zincato sul piede a treppiede imbullonato, fascette, la culla con gli elementi a lunghezza crescente, il dipolo, il cavo che scende
    const g = new THREE.Group(), hh = (o && o.h) || 2.6; slab(g, .22, .03, .22, ZS, 0, .015, 0, .006); [0, 2.09, 4.19].forEach(a => asta(g, [Math.cos(a) * .35, .02, Math.sin(a) * .35], [0, .7, 0], .014, ZN));
    lathe(g, [[.028, 0], [.028, hh - .02], [.001, hh]], 8, ZN); if (F()) for (let y = .7; y < hh - .3; y += .9) fascetta(g, y, .028);
    const L = 1.3, y = hh - .15; asta(g, [-L * .3, y, 0], [L * .7, y, 0], .014, ZN); slab(g, .08, .1, .06, NR, -.05, y, 0, .01);
    for (let q = 0; q < 7; q++) { const w = .62 - q * .055, x = -L * .25 + q * L * .16; asta(g, [x, y + .01, -w / 2], [x, y + .01, w / 2], .007, ZN); } asta(g, [-L * .3, y, 0], [-L * .3, y - .2, 0], .009, ZN); asta(g, [-L * .3, y - .2, -.2], [-L * .3, y - .2, .2], .007, ZN);   // elementi e riflettore
    cavo(g, [[.04, hh - .2, .02], [.05, 1.4, .04], [.05, .3, .03], [.4, .02, .3]], .007, GM, 10); return g; };
  T.cassone = () => {   // cassone per le macerie 3 × 1,5: lamiera con le nervature, le quattro orecchie di sollevamento, la catena, la sponda ribaltabile con le cerniere
    const g = new THREE.Group(), W = 3.0, H = 1.2, D = 1.5, m = mat('#4a6a3a', 'vernice'), mS = mat('#3a5a2a', 'vernice');
    ext(g, 'cas', shape([[-D / 2, 0], [D / 2, 0], [D / 2 + .1, H], [-D / 2 - .1, H]]), W, .02, m, 0, 0, 0, 0, PI / 2, 0); for (let k = -3; k <= 3; k++) slab(g, .05, H - .1, D + .24, mS, k * .42, H / 2, 0, .006);
    slab(g, W + .04, .08, .06, mS, 0, H - .04, D / 2 + .12, .01); slab(g, W + .04, .08, .06, mS, 0, H - .04, -D / 2 - .12, .01); [-.3, .3].forEach(z => slab(g, W, .06, .08, mS, 0, .03, z * 0 + z * 1.5, .01));   // orli e pattini
    if (F()) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { slab(g, .06, .2, .1, mS, a * (W / 2 - .3), H + .06, b * (D / 2 + .1), .008); tor(g, .04, .01, 8, ZS, a * (W / 2 - .3), H + .14, b * (D / 2 + .13), 0, 0, 0); }); cerniera(g, 0, H - .03, D / 2 + .16, W * .9, 'x'); }
    put(g, slabG(W - .4, .25, D - .3, .03), mat('#8a8278', 'cemento'), 0, H - .35, 0); return g; };
  T.comignolo = (o) => {   // comignolo: canna d'intonaco con la cornice e la fascia di fuliggine, cappello di lamiera conico sul collo
    const g = new THREE.Group(), H = (o && o.h) || 1.4, m = mat((o && o.col) || '#c8c0b0', 'cemento');
    slab(g, .62, H, .5, m, 0, H / 2, 0, .02); slab(g, .76, .1, .64, mat('#a8a094', 'cemento'), 0, H - .05, 0, .02); slab(g, .64, .22, .52, mat('#2a2624', 'cemento'), 0, H - .2, 0, .01);
    put(g, cylG(.12, .12, .22, 10), ZS, 0, H + .1, 0); lathe(g, [[.05, 0], [.06, .2], [.36, .22], [.04, .42], [0, .44]], 10, mat('#6a6e70', 'zinco'), 0, H, 0); return g; };
  // ================= LA PIAZZETTA =================
  T.edicola_votiva = () => {   // edicola votiva a muro: nicchia con la cornice a timpano in stucco, l'immagine, la grata di ferro, la mensolina coi lumini e i fiori; origine sul fondo della nicchia
    const g = new THREE.Group(); g.userData.aMuro = true; const st = mat('#d8c8aa', 'pietra'), stS = mat('#b8a888', 'pietra');
    slab(g, .9, 1.2, .12, st, 0, 0, .06, .015); slab(g, .6, .8, .1, mat('#2a1c24', 'pietra'), 0, 0, .13, 0); targa(g, '', .36, .5, 0, .02, .19, 0, '#3a5aa8', '#c8a040');
    [-.4, .4].forEach(x => slab(g, .1, 1.0, .1, stS, x, -.05, .17, .01)); ext(g, 'tim', shape([[-.55, 0], [.55, 0], [0, .3]]), .14, .012, stS, 0, .5, .19, 0, 0, 0, 1); slab(g, 1.1, .08, .18, st, 0, .48, .17, .01);
    slab(g, 1.1, .1, .4, mat('#8a5d4e', 'pietra'), 0, -.66, .22, .012); [-.15, .15].forEach(x => { put(g, cylG(.035, .035, .1, 8), mat('#c83a2a', 'vetro'), x, -.56, .32); put(g, cylG(.01, .01, .03, 6), LU, x, -.5, .32).name = 'luce'; });
    luci(g, 0, -.5, .35, '#ffb040'); for (let k = 0; k < 3; k++) put(g, icoG(.06, 0), mat(['#e0405a', '#f0f0f0', '#f0c040'][k], 'tela'), -.25 + k * .25, -.55, .36);
    for (let k = -2; k <= 2; k++) asta(g, [k * .13, -.4, .2], [k * .13, .4, .2], .006, GH); [-.3, .3].forEach(y => asta(g, [-.3, y, .2], [.3, y, .2], .006, GH)); return g; };
  T.pozzo = () => {   // pozzo della piazzetta: vera ottagonale in pietra col gradino, due colonnine di ghisa, l'arco con la carrucola, la catena e il secchio
    const g = new THREE.Group(), st = mat(C.pietra, 'pietra'); lathe(g, [[.9, 0], [.9, .12], [.72, .14], [.72, .9], [.78, .92], [.78, 1.0], [.72, 1.02], [.6, 1.02], [.6, .3], [.001, .3]], 8, st, 0, 0, 0, PI / 8);
    [-1, 1].forEach(s => { lathe(g, [[.07, 0], [.07, .04], [.04, .07], [.035, 1.4], [.05, 1.45], [.001, 1.5]], 10, GH, s * .66, 1.0, 0); }); cavo(g, [[-.66, 2.4, 0], [-.4, 2.75, 0], [0, 2.85, 0], [.4, 2.75, 0], [.66, 2.4, 0]], .025, GH, 14);
    put(g, cylG(.12, .12, .04, 14), GH, 0, 2.55, 0, 0, 0, PI / 2); asta(g, [0, 2.84, 0], [0, 2.6, 0], .014, GH); cavo(g, [[0, 2.55, .12], [0, 1.6, .12], [0, 1.3, .1]], .012, ZS, 8);   // carrucola e catena
    lathe(g, [[.0, 0], [.13, 0], [.15, .03], [.16, .25], [.17, .27]], 10, ZN, 0, 1.05, .1); asta(g, [-.15, 1.32, .1], [0, 1.45, .1], .008, ZS); asta(g, [0, 1.45, .1], [.15, 1.32, .1], .008, ZS); return g; };
  T.tombino = () => {   // chiusino tondo in ghisa Ø 70: cornice a terra, piatto con il bordo, due anelli di nervature e i due fori di presa
    const g = new THREE.Group(); lathe(g, [[.36, 0], [.42, 0], [.42, .02], [.36, .025]], 20, mat('#3a3936', 'ghisa')); lathe(g, [[0, .0], [.35, 0], [.35, .035], [.3, .04], [0, .04]], 20, GH);
    tor(g, .26, .008, 20, mat('#3a3a3e', 'ghisa'), 0, .04, 0); tor(g, .15, .008, 16, mat('#3a3a3e', 'ghisa'), 0, .04, 0); if (F()) [-.2, .2].forEach(x => put(g, cylG(.02, .02, .01, 8), mat('#1a1a1c', 'ghisa'), x, .042, 0)); return g; };
  T.caditoia = () => {   // caditoia al cordolo 50 × 30: telaio in ghisa e dieci barre con la luce fra l'una e l'altra
    const g = new THREE.Group(), m = mat('#3a3936', 'ghisa'); slab(g, .52, .03, .32, m, 0, .015, 0, .004); put(g, slabG(.44, .02, .24, 0), mat('#121214', 'ghisa'), 0, .02, 0);
    for (let k = 0; k < 10; k++) asta(g, [-.2 + k * .044, .035, -.12], [-.2 + k * .044, .035, .12], .008, m); asta(g, [-.22, .035, 0], [.22, .035, 0], .008, m); return g; };

  const TIPI = Object.keys(T);
  function make(tipo, o) { if (!T[tipo]) return null; LV = o && o.liv !== undefined ? o.liv : 1; const g = T[tipo](o || {}); g.userData.tipo = tipo; g.userData.liv = LV; LV = 1; return g; }
  return { make, TIPI, T, mat, C, asta, tubo, cavo, bullone, fascetta, slab, lathe, cyl, targa, mensola: o => make('mensola', o), contatore: o => make('contatore', o), isolatore: o => make('isolatore', o) };
})();
if (typeof module !== 'undefined') module.exports = Arredo3D;
