/* ================= [modelli1] ARREDO 3D: gli oggetti di strada, rifatti pezzo per pezzo =================
   Italia 1986, misure vere in metri. Ogni modello è un THREE.Group costruito attorno all'origine con la base a y = 0 e il davanti
   verso +z. Gli oggetti a muro hanno l'origine sul punto di fissaggio, il muro dietro a z = 0 e userData.aMuro = true; quelli che
   si stringono a un palo che c'è già (le targhe dei cartelli sui pali dei lampioni) hanno l'origine sull'asse del palo e userData.aPalo.
   Regole: niente scatole nude (lastre smussate, profili torniti, sagome estruse); ogni parte tocca un'altra (viti, staffe,
   cerniere, fascette, collari): lo controlla strumenti/modelli_check.js (grafo connesso per contatto entro 2 cm, un pezzo a y = 0,
   triangoli). Pochi materiali condivisi per genere (ghisa, zinco, vernice, legno, cemento, pietra, plastica, gomma, tela, vetro);
   i colori del 1986 un po' passati (usura leggera); leggibile a 8 px/m: contano le forme grandi, i dettagli stanno sopra i 2-3 cm.
   Geometrie e materiali in cache: cento lampioni uguali condividono tutto.
   Arredo3D.make(tipo, o) → Group; o.liv = 1 (pieno, predefinito) oppure 0 (lontano: senza viti e minuterie, meno segmenti).
   Lo usano render.js (libreria PM, [strade1], [case] FORME e la pagina disegnata da [segni]: lampioni per epoca, mensole, contatori,
   cabine, antenne, targhe dei cartelli, bidoni, dehors) e lo studio degli oggetti (`pm:tipo`).
   Le parti che si accendono si chiamano 'luce' e il gruppo porta userData.luci = [[x, y, z, colore], ...] per gli aloni e le luci. */
var Arredo3D = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, V2 = (x, y) => new THREE.Vector2(x, y), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const MC = {}, GC = {};
  let LV = 1; const F = () => LV > 0;
  const sg = n => (LV > 0 || n < 10) ? n : Math.max(6, Math.round(n * .6));   // al livello lontano meno segmenti (4 e 8 restano: sono forme)
  // ---------- materiali per genere (pochi, condivisi) ----------
  const SUP = { ghisa: 'ghisa', zinco: 'metallo', vernice: 'vernice', ottone: 'metallo', legno: 'legno', cemento: 'pietra', pietra: 'pietra', plastica: 'vernice', gomma: 'gomma', tela: 'tessuto', carta: 'carta', porcellana: 'vernice', cotto: 'pietra', smalto: 'vernice', vimini: 'legno' };   // [vasi2] cotto, smalto e vimini dei vasi
  function mat(col, kind) {
    const k = col + '|' + kind; if (MC[k]) return MC[k];
    if (kind === 'luce') return (MC[k] = Object.assign(new THREE.MeshBasicMaterial({ color: col, toneMapped: false, fog: false }), { name: 'luce' }));
    const o = { color: col, roughness: .6, metalness: 0 };
    Object.assign(o, { ghisa: { roughness: .55, metalness: .3 }, zinco: { roughness: .42, metalness: .3 }, vernice: { roughness: .5, metalness: .1 }, ottone: { roughness: .35, metalness: .3 }, legno: { roughness: .75 }, cemento: { roughness: .95 }, pietra: { roughness: .88 }, plastica: { roughness: .45 }, gomma: { roughness: .92 }, tela: { roughness: .95, side: THREE.DoubleSide }, carta: { roughness: .88 }, porcellana: { roughness: .25, metalness: .05 }, vetro: { roughness: .15, metalness: .05, transparent: true, opacity: .55, depthWrite: false }, cotto: { roughness: .9 }, smalto: { roughness: .28, metalness: .05 }, vimini: { roughness: .9 }, foglia: { roughness: .7 }, fiore: { roughness: .8 } }[kind] || {});   // [vasi2]
    const m = new THREE.MeshStandardMaterial(o); m.name = kind; if (SUP[kind]) m.userData.sup = SUP[kind];
    return (MC[k] = m);
  }
  // la tavolozza del 1986: verde comunale, ghisa nera, zinco, cemento sporco, legno al sole, rosso PT, giallo lavori (tutti un po' passati)
  const C = { ghisa: '#2a2c2e', verde: '#2f5a3e', zinco: '#9a9e9a', zincoS: '#6e7270', cem: '#8e8a82', cemS: '#6e6a62', legno: '#8a6440', legnoS: '#5a3e2a', legnoG: '#a08a66', rosso: '#b03030', giallo: '#c8a034', bianco: '#e2ded4', crema: '#d6d0c0', arancio: '#cc6a2e', blu: '#2a4a78', vetro: '#8ab0bc', luce: '#ffd890', luceB: '#eef2ff', ottone: '#b08a40', porc: '#e8e4dc', gomma: '#1e1e20', nero: '#1c1c1e', cotto: '#a8583a', pietra: '#b8b0a0', terra: '#3a2a1e', foglia: '#4a6a3a', fogliaC: '#5a7a44', tela: '#d8ccb0', mare: '#2f4a3a', ruggine: '#6e3a22' };
  const GH = mat(C.ghisa, 'ghisa'), ZN = mat(C.zinco, 'zinco'), ZS = mat(C.zincoS, 'zinco'), CM = mat(C.cem, 'cemento'), CS = mat(C.cemS, 'cemento'), LG = mat(C.legno, 'legno'), LS = mat(C.legnoS, 'legno'), LGG = mat(C.legnoG, 'legno'), VD = mat(C.verde, 'vernice'), RS = mat(C.rosso, 'vernice'), GL = mat(C.giallo, 'vernice'), BC = mat(C.bianco, 'vernice'), VT = mat(C.vetro, 'vetro'), LU = mat(C.luce, 'luce'), LUB = mat(C.luceB, 'luce'), OT = mat(C.ottone, 'ottone'), PO = mat(C.porc, 'porcellana'), GM = mat(C.gomma, 'gomma'), NR = mat(C.nero, 'plastica'), RG = mat(C.ruggine, 'vernice');
  // ---------- geometrie (in cache per chiave: le istanze condividono i vertici) ----------
  const geo = (k, f) => GC[k] || (GC[k] = f());
  const q3 = v => Math.round(v * 1000);
  const cylG = (r0, r1, h, seg) => { seg = sg(seg || 10); return geo('c' + [r0, r1, h, seg].map(q3), () => new THREE.CylinderGeometry(r0, r1, h, seg)); };
  const latheG = (pts, seg) => { seg = sg(seg || 10); return geo('l' + pts.map(p => q3(p[0]) + ',' + q3(p[1])).join(';') + '|' + seg, () => new THREE.LatheGeometry(pts.map(p => V2(Math.max(.0005, p[0]), p[1])), seg)); };
  const torG = (R, r, seg) => { seg = sg(seg || 12); return geo('t' + [R, r, seg].map(q3), () => new THREE.TorusGeometry(R, r, LV > 0 ? 5 : 4, seg)); };
  const sphG = (r, s) => { s = s || 8; return geo('s' + q3(r) + '|' + s, () => new THREE.SphereGeometry(r, s, Math.max(4, Math.round(s * .6)))); };
  const icoG = (r, d) => geo('i' + q3(r) + '|' + (d || 0), () => new THREE.IcosahedronGeometry(r, d || 0));
  const planeG = (w, h) => geo('p' + [w, h].map(q3), () => new THREE.PlaneGeometry(w, h));
  // lastra smussata: la scatola con gli spigoli che prendono la luce (sotto i 3 cm di spessore resta una scatola: lo smusso non si vede)
  function slabG(w, h, d, b) {
    b = Math.min(b === undefined ? .02 : b, w / 3, h / 3, d / 3); if (Math.min(w, h, d) < .03) b = 0;
    return geo('b' + [w, h, d, b].map(q3), () => { if (b < .004) return new THREE.BoxGeometry(w, h, d);
      const s = new THREE.Shape(); s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g; });
  }
  // sagoma estrusa: punti [[x, y], ...] nel piano xy, spessore d lungo z (centrato), smusso b che resta dentro la sagoma; `holes` = [[[x, y], ...]]
  function shape(pts, holes) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
    (holes || []).forEach(h => { const pa = new THREE.Path(); h.forEach((p, i) => i ? pa.lineTo(p[0], p[1]) : pa.moveTo(p[0], p[1])); s.holes.push(pa); });
    return s;
  }
  function extG(k, sh, d, b, seg) {
    b = b || 0; return geo('e' + k + [d, b].map(q3), () => { const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.001, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: seg || 8 }); g.translate(0, 0, -(d - 2 * b) / 2); g.computeVertexNormals(); return g; });
  }
  // ---------- montaggio ----------
  function put(g, ge, m, x, y, z, rx, ry, rz) { const o = new THREE.Mesh(ge, m); o.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
  const slab = (g, w, h, d, m, x, y, z, b, rx, ry, rz) => put(g, slabG(w, h, d, b), m, x, y, z, rx, ry, rz);
  const cyl = (g, r0, r1, h, seg, m, x, y, z, rx, ry, rz) => put(g, cylG(r0, r1, h, seg), m, x, y, z, rx, ry, rz);
  const lathe = (g, pts, seg, m, x, y, z, ry) => put(g, latheG(pts, seg), m, x, y, z, 0, ry || 0, 0);
  const tor = (g, R, r, seg, m, x, y, z, rx, ry, rz) => put(g, torG(R, r, seg), m, x, y, z, rx === undefined ? PI / 2 : rx, ry, rz);   // di piatto (anello orizzontale) se non detto altro
  const ext = (g, k, sh, d, b, m, x, y, z, rx, ry, rz, seg) => put(g, extG(k, sh, d, b, seg), m, x, y, z, rx, ry, rz);
  // asta/tubo da un punto a un altro: la giuntura che tiene insieme i pezzi (gambe, bracci, tiranti, montanti)
  const _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function asta(g, a, b, r, m, seg) { _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _d.length(); const o = put(g, cylG(r, r, 1, seg || 6), m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.scale.y = L; o.quaternion.setFromUnitVectors(_up, _d.normalize()); return o; }
  const tubo = asta;
  // cavo per più punti (catene, cime, cavi elettrici, volute di ghisa)
  function cavo(g, pts, r, m, seg) { const cur = new THREE.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2]))); const o = new THREE.Mesh(new THREE.TubeGeometry(cur, seg || Math.max(4, pts.length * 3), r, LV > 0 ? 6 : 4), m); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
  // minuterie: bullone a testa esagonale, fascetta col bullone, cerniera, maniglia a staffa
  function bullone(g, x, y, z, ax, r, m) { r = r || .012; const o = put(g, cylG(r, r, r * 1.4, 6), m || ZS, x, y, z); if (ax === 'z') o.rotation.x = PI / 2; else if (ax === 'x') o.rotation.z = PI / 2; return o; }
  function fascetta(g, y, r0, m, x, z) { tor(g, r0 + .01, .009, 10, m || ZS, x || 0, y, z || 0); return bullone(g, x || 0, y, (z || 0) + r0 + .026, 'z', .009, m || ZS); }
  function cerniera(g, x, y, z, L, ax, m) { const o = put(g, cylG(.014, .014, L, 6), m || ZS, x, y, z); if (ax === 'x') o.rotation.z = PI / 2; else if (ax === 'z') o.rotation.x = PI / 2; return o; }
  function maniglia(g, x, y, z, w, m, vert) { const r = .011, d = .05; if (vert) { asta(g, [x, y - w / 2, z], [x, y - w / 2, z + d], r, m); asta(g, [x, y + w / 2, z], [x, y + w / 2, z + d], r, m); asta(g, [x, y - w / 2, z + d], [x, y + w / 2, z + d], r, m); } else { asta(g, [x - w / 2, y, z], [x - w / 2, y, z + d], r, m); asta(g, [x + w / 2, y, z], [x + w / 2, y, z + d], r, m); asta(g, [x - w / 2, y, z + d], [x + w / 2, y, z + d], r, m); } }
  // targhetta scritta (tela, solo nel browser; in Node resta il colore di fondo). Nomi inventati, mai marchi veri.
  const TX = {};
  function targaMat(testo, bg, fg, w, h) {
    const k = [testo, bg, fg, w, h].join('|'); if (TX[k]) return TX[k];
    if (typeof document === 'undefined') return (TX[k] = mat(bg, 'vernice'));
    const pw = 128, ph = Math.max(16, Math.round(128 * h / w)), c = document.createElement('canvas'); c.width = pw; c.height = ph; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, pw, ph); x.strokeStyle = fg; x.lineWidth = 3; x.strokeRect(3, 3, pw - 6, ph - 6);
    const righe = String(testo).split('\n'), fs = Math.min(ph / (righe.length + .6), pw / (Math.max(...righe.map(r => r.length), 1) * .62 + 1));
    x.fillStyle = fg; x.font = `bold ${Math.floor(fs)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    righe.forEach((r, i) => x.fillText(r, pw / 2, ph / 2 + (i - (righe.length - 1) / 2) * fs * 1.05));
    // l'usura: qualche puntino di ruggine e lo sporco in basso
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(90,52,30,${(.15 + (i * 37 % 10) / 30).toFixed(2)})`; x.fillRect((i * 53) % pw, (i * 29) % ph, 2, 1); }
    const gr = x.createLinearGradient(0, ph * .7, 0, ph); gr.addColorStop(0, 'rgba(40,32,24,0)'); gr.addColorStop(1, 'rgba(40,32,24,.25)'); x.fillStyle = gr; x.fillRect(0, 0, pw, ph);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4;
    return (TX[k] = new THREE.MeshStandardMaterial({ map: t, roughness: .5, metalness: .05 }));
  }
  // la faccia scritta a z, con la lamiera di supporto (spessore sp) subito dietro, nel verso ry: il retro della lamiera sta a z - sp - 1,5 mm
  function targa(g, testo, w, h, x, y, z, ry, bg, fg, sp) {
    ry = ry || 0; sp = sp === undefined ? .006 : sp; const o = put(g, planeG(w, h), targaMat(testo, bg || C.bianco, fg || C.ghisa, w, h), x, y, z, 0, ry, 0);
    if (sp) { const d = sp / 2 + .0015; put(g, slabG(w + .016, h + .016, sp, .002), bg ? mat(bg, 'vernice') : BC, x - Math.sin(ry) * d, y, z - Math.cos(ry) * d, 0, ry, 0); }
    return o; }
  const luci = (g, x, y, z, col) => { (g.userData.luci = g.userData.luci || []).push([x, y, z, col || C.luce]); };
  // profili condivisi: il palo zincato tornito (piede, fusto, collare, tappo) e il piede di cemento
  function palo(g, h, r0, m, x, z) { return lathe(g, [[r0 * 1.9, 0], [r0 * 1.9, .05], [r0 * 1.2, .09], [r0, .14], [r0, h - .05], [r0 * 1.2, h - .03], [r0 * 1.1, h], [.001, h + .02]], 8, m || ZN, x || 0, 0, z || 0); }
  const piedeCem = (g, r, m, x, z) => lathe(g, [[r, 0], [r, .03], [r * .55, .06], [.001, .07]], 8, m || CM, x || 0, 0, z || 0);
  // un punto su una lastra inclinata (rx): centro c, su per la lastra v, fuori dalla lastra n
  const sulPiano = (c, rx, v, n) => [c[0], c[1] + Math.cos(rx) * v - Math.sin(rx) * n, c[2] + Math.sin(rx) * v + Math.cos(rx) * n];
  const shade = (c, k) => { const o = new THREE.Color(c); o.multiplyScalar(k); return '#' + o.getHexString(); };
  const T = {};
  // ================= LAMPIONI =================
  // la lanterna in ghisa a quattro facce rastremate (lati allineati agli assi), tettuccio a piramide col pomolo, pigna sotto; i vetri si accendono.
  // y è il fondo della lanterna; il pomolo arriva a y + 0,81 s
  function lanterna(g, x, y, z, s, lm) { s = s || 1; const q = PI / 4, c = Math.SQRT1_2;
    lathe(g, [[.001, -.08 * s], [.025 * s, -.06 * s], [.03 * s, -.02 * s], [.1 * s, 0], [.13 * s, .02 * s], [.13 * s, .04 * s], [.16 * s, .06 * s]], 4, GH, x, y, z, q);   // il fondo con la pigna
    put(g, latheG([[.14 * s, .06 * s], [.17 * s, .5 * s]], 4), lm || LU, x, y, z, 0, q, 0).name = 'luce';   // i vetri
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) asta(g, [x + a * c * .15 * s, y + .06 * s, z + b * c * .15 * s], [x + a * c * .185 * s, y + .5 * s, z + b * c * .185 * s], .012 * s, GH, 4);   // i montantini agli spigoli
    lathe(g, [[.2 * s, .5 * s], [.2 * s, .53 * s], [.1 * s, .64 * s], [.04 * s, .7 * s], [.04 * s, .74 * s], [.001, .76 * s]], 4, GH, x, y, z, q);   // il tettuccio
    put(g, sphG(.03 * s, 6), GH, x, y + .78 * s, z); luci(g, x, y + .3 * s, z); }
  T.lampione_muro = () => {   // borgo: mensola in ghisa fissata al muro (origine sulla piastra, muro a z = 0), il braccio con la voluta e il riccio, la lanterna appesa all'anello
    const g = new THREE.Group(); g.userData.aMuro = true;
    slab(g, .16, .34, .03, GH, 0, 0, .015, .008); if (F()) [[-.05, .13], [.05, .13], [-.05, -.13], [.05, -.13]].forEach(([x, y]) => bullone(g, x, y, .035, 'z', .011, GH));   // la piastra coi quattro tasselli
    asta(g, [0, .1, .02], [0, .1, .66], .02, GH, 8); put(g, sphG(.032, 6), GH, 0, .1, .68);   // il braccio col pomo in punta
    cavo(g, [[0, -.14, .03], [0, -.1, .2], [0, 0, .38], [0, .07, .52], [0, .09, .6]], .015, GH, 14);   // la voluta che lo regge da sotto
    if (F()) cavo(g, [[0, .08, .22], [0, .03, .19], [0, -.005, .24], [0, .02, .3], [0, .07, .3]], .008, GH, 10);   // il riccio fra braccio e voluta
    tor(g, .034, .008, 10, GH, 0, .1, .62, 0);   // l'anello di aggancio attorno al braccio
    lanterna(g, 0, -.744, .62, 1, LU); return g; };
  T.lampione_corso = () => {   // Corso: palo in ghisa tornito con la base modanata e lo sportellino, i collari, il pastorale col cerchio e il riccio, la lanterna appesa; 4,3 m
    const g = new THREE.Group();
    lathe(g, [[.26, 0], [.26, .08], [.22, .1], [.2, .3], [.17, .36], [.19, .42], [.14, .5], [.12, .95], [.15, 1.0], [.15, 1.06], [.09, 1.12], [.075, 2.2], [.07, 3.6], [.095, 3.66], [.095, 3.72], [.06, 3.78], [.001, 3.8]], 10, GH);
    tor(g, .085, .012, 10, GH, 0, 1.6, 0); tor(g, .08, .012, 10, GH, 0, 2.9, 0);   // i collari
    if (F()) { targa(g, 'COMUNE\n1912', .1, .08, 0, .72, .138, 0, C.ghisa, '#8a8c88'); slab(g, .1, .14, .012, GH, 0, .22, .208, .003); bullone(g, 0, .27, .218, 'z', .006, GH); }   // la targhetta e lo sportellino della base
    cavo(g, [[0, 3.7, 0], [0, 4.15, .12], [0, 4.3, .5], [0, 4.25, .82]], .028, GH, 14); cavo(g, [[0, 4.25, .82], [0, 4.1, .9], [0, 4.0, .8], [0, 4.05, .74]], .02, GH, 8);   // il pastorale e il riccio
    tor(g, .12, .014, 12, GH, 0, 3.92, .2, 0, PI / 2, 0); asta(g, [0, 3.55, 0], [0, 4.24, .4], .014, GH, 4);   // il cerchio decorativo nell'angolo e il tirante
    tor(g, .04, .01, 10, GH, 0, 4.2, .82, 0); lanterna(g, 0, 3.32, .82, 1.05, LU); return g; };
  T.lampione_regime = () => {   // piazza della Vittoria: basamento quadro, fusto ottagonale bianco di travertino col capitello, braccio a T coi saettoni e due coppe di luce bianca; 6 m
    const g = new THREE.Group(), m = mat(C.crema, 'pietra'), mD = mat('#b8b2a4', 'pietra');
    slab(g, .96, .12, .96, mD, 0, .06, 0, .02);   // il basamento quadro
    lathe(g, [[.42, .1], [.42, .18], [.36, .2], [.36, .5], [.3, .55], [.22, .6], [.2, 4.9], [.26, 5.0], [.26, 5.1], [.18, 5.2], [.001, 5.22]], 8, m, 0, 0, 0, PI / 8);
    lathe(g, [[.2, 0], [.3, 0], [.3, .05], [.22, .06]], 8, mD, 0, 5.2, 0, PI / 8); if (F()) targa(g, 'A. MCMXXXVI', .16, .1, 0, .9, .227, 0, C.crema, '#7a6a5a');   // il collare e la lapide dell'anno
    asta(g, [0, 5.2, 0], [0, 5.55, 0], .06, GH, 8); asta(g, [-.95, 5.55, 0], [.95, 5.55, 0], .045, GH, 8); [-1, 1].forEach(s => asta(g, [0, 5.3, 0], [s * .8, 5.52, 0], .02, GH, 4));   // il braccio a T coi saettoni
    [-.9, .9].forEach(x => { lathe(g, [[.001, 0], [.1, 0], [.14, .02], [.1, .06]], 10, GH, x, 5.55, 0); put(g, latheG([[.06, .06], [.24, .22], [.26, .34], [.2, .42], [.001, .46]], 10), LUB, x, 5.55, 0).name = 'luce'; luci(g, x, 5.85, 0, C.luceB); });   // le due coppe opaline
    return g; };
  T.lampione_boom = () => {   // boom: stelo di cemento centrifugato rastremato, sportello imbullonato, braccio curvo con la fascetta, armatura al sodio; 7,7 m
    const g = new THREE.Group(), arm = mat('#4a4c52', 'vernice');
    lathe(g, [[.17, 0], [.17, .4], [.15, .45], [.085, 7.0], [.085, 7.05], [.001, 7.06]], 9, CM);
    slab(g, .14, .34, .02, ZS, 0, .9, .155, .004); if (F()) { bullone(g, 0, 1.02, .169, 'z', .008); bullone(g, 0, .78, .169, 'z', .008); targa(g, 'ENEL\n0427', .1, .07, 0, 1.4, .148, 0, C.zinco, C.ghisa); }   // sportello e targhetta
    cavo(g, [[0, 6.6, 0], [0, 7.25, .25], [0, 7.5, .9], [0, 7.55, 1.5]], .04, arm, 12); tor(g, .1, .014, 10, ZS, 0, 6.65, 0); if (F()) bullone(g, .11, 6.65, 0, 'x', .01);   // il braccio e la fascetta di attacco
    slab(g, .3, .14, .72, arm, 0, 7.5, 1.78, .03); put(g, slabG(.24, .05, .6, .012), LU, 0, 7.42, 1.8).name = 'luce'; put(g, latheG([[.001, 0], [.17, 0], [.2, .04], [.17, .12], [.001, .13]], 10), arm, 0, 7.5, 1.6, PI / 2, 0, 0);   // l'armatura, il vetro, il cappuccio sul braccio
    luci(g, 0, 7.35, 1.8, '#ffb060'); return g; };
  T.lampione_deco = () => {   // lungomare: palo bianco con la base a bulbo, l'anello coi raggi, il globo di opalina; 5,8 m
    const g = new THREE.Group(), m = mat(C.bianco, 'vernice');
    lathe(g, [[.3, 0], [.3, .1], [.24, .14], [.2, .5], [.12, .55], [.1, 4.9], [.13, 4.95], [.13, 5.0], [.08, 5.05], [.001, 5.07]], 10, m); tor(g, .34, .025, 16, m, 0, 5.0, 0); [0, 1, 2, 3].forEach(i => asta(g, [0, 4.95, 0], [Math.cos(i * PI / 2) * .33, 5.0, Math.sin(i * PI / 2) * .33], .014, m, 4));
    lathe(g, [[.08, 5.06], [.16, 5.1], [.14, 5.16]], 10, GH); put(g, sphG(.34, 10), LU, 0, 5.46, 0).name = 'luce'; luci(g, 0, 5.46, 0, '#ffe2b8'); return g; };
  // ================= SEMAFORO E SEGNALETICA =================
  T.semaforo = () => {   // palo zincato sul piede di cemento, lanterna a tre luci con le visiere e il pannello di contrasto, il pedonale sulla sua staffa, il pulsante
    const g = new THREE.Group(); palo(g, 3.4, .07); cyl(g, .13, .15, .3, 10, CM, 0, .15, 0); if (F()) [3.35, 2.65, 2.3].forEach(y => fascetta(g, y, .07));
    const y = 3.0; slab(g, .34, 1.04, .28, VD, 0, y, .12, .03); slab(g, .54, 1.22, .03, NR, 0, y, -.03, 0); slab(g, .58, 1.26, .02, BC, 0, y, -.05, 0);
    g.userData.lenti = [];
    for (let i = 0; i < 3; i++) { const ly = y + .32 - i * .32; put(g, geo('vis', () => new THREE.CylinderGeometry(.15, .15, .22, 8, 1, true, -PI / 2, PI)), VD, 0, ly + .02, .37, PI / 2, 0, 0); put(g, cylG(.12, .12, .02, 12), NR, 0, ly, .265, PI / 2, 0, 0); put(g, cylG(.1, .1, .01, 12), mat(['#3a0c0a', '#3a2a08', '#0a2a14'][i], 'luce'), 0, ly, .28, PI / 2, 0, 0).name = 'lente' + i; g.userData.lenti.push([0, ly, .29]); }
    asta(g, [0, y + .3, .07], [0, y + .3, .12], .02, ZS); asta(g, [0, y - .3, .07], [0, y - .3, .12], .02, ZS);   // le staffe che la tengono al palo
    slab(g, .22, .5, .16, VD, -.32, 1.75, .06, .02); slab(g, .24, .04, .14, VD, -.32, 2.02, .16, 0); asta(g, [-.06, 1.75, 0], [-.21, 1.75, .06], .018, ZS); [1.88, 1.62].forEach(ly => put(g, cylG(.06, .06, .01, 10), mat(ly > 1.7 ? '#3a0c0a' : '#0a2a14', 'luce'), -.32, ly, .145, PI / 2, 0, 0));   // il pedonale spento, sulla sua staffa
    slab(g, .14, .22, .1, GL, 0, 1.15, .1, .02); put(g, cylG(.03, .03, .012, 8), NR, 0, 1.15, .155, PI / 2, 0, 0); return g; };
  // la piastra di un cartello stretta al palo di raggio r0 (asse in x = 0, z = 0): faccia dipinta, lamiera di zinco col bordo, nervatura, due fascette imbullonate.
  // t = { w, h, tonda, retro: [w, h], mat (materiale dipinto di render.js) | testo, bg, fg }
  function piastra(g, t, yc, r0) {
    const fm = t.mat || targaMat(t.testo || '', t.bg || C.bianco, t.fg || C.ghisa, t.w, t.h);
    put(g, geo(t.tonda ? 'dk' + q3(t.w) : 'p' + [t.w, t.h].map(q3), () => t.tonda ? new THREE.CircleGeometry(t.w / 2, 18) : new THREE.PlaneGeometry(t.w, t.h)), fm, 0, yc, r0 + .03);
    if (t.tonda) put(g, cylG(t.w * .48, t.w * .48, .018, 18), ZN, 0, yc, r0 + .018, PI / 2, 0, 0); else slab(g, t.retro ? t.retro[0] : t.w * .98, t.retro ? t.retro[1] : t.h * .98, .018, ZN, 0, yc, r0 + .018, 0);   // t.retro: la lamiera più piccola della faccia (le facce dipinte con il bordo trasparente)
    slab(g, Math.min(t.w * .7, .5), .04, .03, ZN, 0, yc, r0 + .005, 0); [t.h * .3, -t.h * .3].forEach(d => { slab(g, .04, .03, .03, ZN, 0, yc + d, r0 + .005, 0); if (F()) fascetta(g, yc + d, r0); else tor(g, r0 + .01, .009, 8, ZS, 0, yc + d, 0); }); }
  // il cartello: palo zincato tornito sul piede di cemento; o.targhe dall'alto in basso (render.js passa le sue facce dipinte), o.h l'altezza del palo
  T.cartello = (o) => { const g = new THREE.Group(), r0 = .03, H = (o && o.h) || 2.62, targhe = (o && o.targhe) || [{ w: .6, h: .6, tonda: true, testo: '30', bg: '#e4e0d6', fg: '#b8282a' }];
    palo(g, H, r0); piedeCem(g, .11); let y = H - .12; targhe.forEach(t => { piastra(g, t, y - t.h / 2, r0); y -= t.h + .07; }); return g; };
  // le sole piastre, da stringere a un palo che c'è già (i cartelli sui pali dei lampioni): origine sull'asse del palo, all'altezza della prima piastra
  T.staffa_cartello = (o) => { const g = new THREE.Group(); g.userData.aPalo = true; const r0 = g.userData.r = (o && o.r) || .075, targhe = (o && o.targhe) || [{ w: .6, h: .6, tonda: true, testo: 'P', bg: '#2a4a8a', fg: '#e8e4d8' }]; let y = 0;
    targhe.forEach(t => { piastra(g, t, y, r0); y -= t.h + .07; }); return g; };
  T.targa_via = (o) => {   // targa toponomastica in marmo (60 × 35) con la scritta incisa e i quattro tasselli; a muro
    const g = new THREE.Group(); g.userData.aMuro = true; const t = (o && o.testo) || 'VIA DEI\nPESCATORI', m = mat('#e8e2d4', 'pietra');
    slab(g, .6, .35, .035, m, 0, 0, .018, .008); targa(g, t, .54, .29, 0, 0, .037, 0, '#e8e2d4', '#2a2a2e', 0);
    if (F()) [[-.27, .15], [.27, .15], [-.27, -.15], [.27, -.15]].forEach(([x, y]) => bullone(g, x, y, .038, 'z', .008, mat('#7a7a7a', 'zinco'))); return g; };
  T.civico = (o) => {   // numero civico smaltato blu col bordo bianco (15 × 12) e le due viti; a muro
    const g = new THREE.Group(); g.userData.aMuro = true; slab(g, .15, .12, .012, mat(C.blu, 'vernice'), 0, 0, .006, .004); targa(g, (o && o.testo) || '14', .14, .11, 0, 0, .013, 0, C.blu, C.bianco, 0);
    if (F()) [-.06, .06].forEach(x => bullone(g, x, .045, .014, 'z', .006, ZS)); return g; };
  // ================= PANCHINE =================
  T.panchina_ghisa = () => {   // Corso e villa: due fianchi in ghisa traforati (seduta, bracciolo, schienale), quattro doghe di seduta e due di schienale, la traversa, i bulloni; 1,8 m
    const g = new THREE.Group(), prof = shape([[-.3, 0], [.28, 0], [.3, .04], [.26, .06], [.1, .08], [.12, .4], [.28, .42], [.3, .46], [.26, .5], [.1, .52], [-.2, .62], [-.26, .96], [-.3, .98], [-.34, .94], [-.26, .58], [-.24, .5], [-.22, .44], [-.2, .08], [-.24, .06], [-.3, .04]], [[[-.12, .14], [.06, .14], [.08, .36], [-.14, .36]]]);
    [-.78, .78].forEach(x => ext(g, 'pf', prof, .05, .006, GH, x, 0, 0, 0, -PI / 2, 0));   // la sagoma: x della sagoma verso +z (il davanti)
    for (let k = 0; k < 4; k++) slab(g, 1.8, .035, .09, LG, 0, .455, -.14 + k * .11, .006);
    [[.7, -.25], [.88, -.29]].forEach(([y, z]) => slab(g, 1.8, .09, .035, LG, 0, y, z, .006, -.175, 0, 0));   // lo schienale lungo la linea dei fianchi
    asta(g, [-.78, .05, 0], [.78, .05, 0], .018, GH);   // la traversa che lega i piedi
    if (F()) [-.78, .78].forEach(x => { const xo = x + (x > 0 ? .031 : -.031); [-.1, .08].forEach(z => bullone(g, xo, .455, z, 'x', .009, GH)); [[.7, -.25], [.88, -.29]].forEach(([y, z]) => bullone(g, xo, y, z, 'x', .009, GH)); }); return g; };
  T.panchina_cemento = () => {   // boom: due sostegni trapezi di cemento, lastra di seduta smussata con le tre doghe di legno avvitate, niente schienale; 2 m
    const g = new THREE.Group(), prof = shape([[-.26, 0], [.26, 0], [.22, .42], [-.22, .42]]);
    [-.75, .75].forEach(x => ext(g, 'pc', prof, .12, .01, CM, x, 0, 0, 0, PI / 2, 0)); slab(g, 2.0, .08, .5, mat('#9a968e', 'cemento'), 0, .46, 0, .015);
    for (let k = 0; k < 3; k++) slab(g, 1.9, .03, .13, LGG, 0, .515, -.17 + k * .17, .005); if (F()) [-.5, .5].forEach(x => [-.17, .17].forEach(z => bullone(g, x, .532, z, 'y', .007, ZS))); return g; };
  T.panchina_marmo = () => {   // la panca di travertino del regime: due blocchi modanati e la lastra col bordo smussato; 2 m
    const g = new THREE.Group(), m = mat(C.crema, 'pietra'), mD = mat('#c4bca8', 'pietra'), prof = shape([[-.24, 0], [.24, 0], [.24, .06], [.2, .1], [.2, .3], [.24, .34], [.24, .39], [-.24, .39], [-.24, .34], [-.2, .3], [-.2, .1], [-.24, .06]]);
    [-.7, .7].forEach(x => ext(g, 'pm', prof, .3, .012, mD, x, 0, 0, 0, PI / 2, 0)); slab(g, 2.0, .1, .52, m, 0, .44, 0, .025); return g; };
  // ================= RIFIUTI =================
  T.cassonetto = () => {   // AMU 1,1 m³ in lamiera verde: cassa smussata con le costole, coperchio bombato sulle cerniere, pedale, maniglie, quattro ruote con la forcella, targhetta
    const g = new THREE.Group(), W = 1.4, H = 1.1, D = .9, vd = mat('#3a6a3e', 'vernice'), vdS = mat('#2a4a2e', 'vernice');
    slab(g, W, H - .3, D, vd, 0, .3 + (H - .3) / 2, 0, .035); [-.5, 0, .5].forEach(x => slab(g, .06, H - .34, D + .02, vdS, x, .3 + (H - .3) / 2, 0, .01));   // le costole
    ext(g, 'cop', shape([[-D / 2 - .02, 0], [D / 2 + .02, 0], [D / 2, .06], [.2, .13], [-.2, .13], [-D / 2, .06]]), W + .04, .012, vdS, 0, H, 0, 0, PI / 2, 0);   // il coperchio bombato (sagoma trasversale)
    cerniera(g, 0, H, -D / 2 - .01, W * .9, 'x'); if (F()) { maniglia(g, 0, H + .04, D / 2 + .01, .4, ZS); [-.45, .45].forEach(x => maniglia(g, x, .7, D / 2, .14, ZS)); targa(g, 'A.M.U.\nRIFIUTI', .36, .18, 0, .72, D / 2 + .009, 0, C.bianco, '#2a4a2e'); }
    asta(g, [-.3, .36, D / 2 + .08], [.3, .36, D / 2 + .08], .014, ZS); [-.3, .3].forEach(x => asta(g, [x, .36, D / 2 + .08], [x, .32, D / 2 - .05], .014, ZS));   // il pedale
    [[-.55, .32], [.55, .32], [-.55, -.32], [.55, -.32]].forEach(([x, z]) => { slab(g, .06, .14, .08, ZS, x, .25, z, .008); put(g, cylG(.1, .1, .05, 10), GM, x, .0951, z, 0, 0, PI / 2); put(g, cylG(.035, .035, .07, 6), ZS, x, .0951, z, 0, 0, PI / 2); asta(g, [x, .0951, z], [x, .2, z], .02, ZS, 4); });   // ruote con forcella e mozzo
    return g; };
  T.bidone = () => {   // bidone di zinco da 110 l: tornito con le nervature, due maniglie laterali, coperchio col pomolo
    const g = new THREE.Group(); lathe(g, [[.2, 0], [.24, .02], [.25, .1], [.27, .78], [.29, .8], [.29, .84], [.27, .86]], 12, ZN); [.3, .55].forEach(y => tor(g, .254 + (y - .1) * .0295, .01, 12, ZN, 0, y, 0));
    lathe(g, [[.001, .85], [.3, .85], [.3, .88], [.26, .9], [.06, .95], [.04, .98], [.001, .99]], 12, ZS); [-1, 1].forEach(s => maniglia(g, s * .272, .62, 0, .14, ZS, true)); return g; };
  T.cestino = () => {   // cestino comunale su palo: cesto in lamiera verde bombato (tornito), due staffe al palo, tappo, fascia catarifrangente
    const g = new THREE.Group(); lathe(g, [[.09, 0], [.09, .04], [.05, .06], [.045, 1.0], [.05, 1.02], [.001, 1.03]], 8, GH); put(g, cylG(.047, .047, .06, 8), BC, 0, .55, 0);
    lathe(g, [[.001, 0], [.14, 0], [.2, .05], [.23, .3], [.21, .5], [.24, .53], [.21, .55]], 12, VD, 0, .5, .2); lathe(g, [[.001, 0], [.22, 0], [.2, .03], [.001, .04]], 12, mat('#2a4a2e', 'vernice'), 0, 1.05, .2);   // cesto e coperchio
    asta(g, [0, .75, .04], [0, .75, .2], .016, GH, 4); asta(g, [0, .6, .04], [0, .6, .2], .016, GH, 4); if (F()) bullone(g, 0, .75, .235, 'z', .008); return g; };
  T.campana = () => {   // campana del vetro verde: tornita con le tre bocchette di gomma e l'anello di sollevamento
    const g = new THREE.Group(), vd = mat('#3a7a4a', 'vernice'); lathe(g, [[.55, 0], [.6, .03], [.6, 1.15], [.56, 1.3], [.4, 1.5], [.2, 1.62], [.08, 1.66], [.001, 1.67]], 14, vd);
    [0, 2.1, 4.2].forEach(a => { tor(g, .11, .03, 10, GM, Math.cos(a) * .46, 1.42, Math.sin(a) * .46, PI / 2 - .6, 0, -a); }); tor(g, .06, .012, 10, ZS, 0, 1.72, 0, 0); asta(g, [0, 1.62, 0], [0, 1.68, 0], .02, ZS); return g; };
  // ================= ARREDO URBANO =================
  T.cabina_sip = () => {   // cabina del telefono anni '80: basamento, montanti e traversi d'alluminio, vetri su tre lati, porta a due ante, cassonetto TELEFONO acceso, apparecchio a gettoni con cornetta, mensolina, elenco
    const g = new THREE.Group(), al = mat('#b8bcc0', 'zinco'), W = 1.0, H = 2.3, gt = mat('#c8a020', 'vernice');
    slab(g, W + .16, .1, W + .16, CM, 0, .05, 0, .02); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .06, H, .06, al, a * W / 2, .1 + H / 2, b * W / 2, .008));
    [[0, -W / 2, 0], [-W / 2, 0, PI / 2], [W / 2, 0, PI / 2], [0, W / 2, 0]].forEach(([px, pz, ry], k) => { [.5, 1.3, 2.05].forEach(y => slab(g, W, .04, .04, al, px, .1 + y, pz, 0, 0, ry, 0)); slab(g, W, .06, .06, al, px, .13, pz, 0, 0, ry, 0);
      if (k !== 3) put(g, slabG(W - .06, 1.92, .012, 0), VT, px, 1.17, pz, 0, ry, 0); });
    [-1, 1].forEach(q => { put(g, slabG(W / 2 - .05, 1.86, .012, 0), VT, q * W / 4, 1.17, W / 2, 0, 0, 0); slab(g, .04, 1.92, .04, al, q * .025, 1.17, W / 2, 0); });   // la porta a due ante col montante di battuta
    if (F()) maniglia(g, .07, 1.15, W / 2 + .02, .2, al, true);
    slab(g, W + .12, .08, W + .12, mat('#c8ccd0', 'vernice'), 0, .1 + H + .04, 0, .02); put(g, slabG(W - .1, .3, W - .1, .02), LU, 0, .1 + H + .23, 0).name = 'luce'; slab(g, W + .06, .05, W + .06, mat('#c8ccd0', 'vernice'), 0, .1 + H + .405, 0, .015); luci(g, 0, .1 + H + .23, 0, '#fff0c0');
    [[0, (W - .1) / 2 + .002, 0], [0, -(W - .1) / 2 - .002, PI], [(W - .1) / 2 + .002, 0, PI / 2], [-(W - .1) / 2 - .002, 0, -PI / 2]].forEach(([px, pz, ry]) => targa(g, 'TELEFONO', .8, .2, px, .1 + H + .23, pz, ry, '#f2eee0', '#c89020', 0));
    slab(g, .5, .9, .02, mat('#5a5e60', 'vernice'), 0, 1.45, -W / 2 + .016, .004);   // il pannello che porta l'apparecchio
    slab(g, .32, .48, .2, gt, 0, 1.45, -W / 2 + .126, .02); slab(g, .1, .2, .08, NR, -.1, 1.52, -W / 2 + .266, .01); cavo(g, [[-.1, 1.42, -W / 2 + .27], [-.12, 1.3, -W / 2 + .3], [-.02, 1.32, -W / 2 + .25]], .006, NR, 8);   // apparecchio, cornetta, il filo a spirale
    if (F()) { slab(g, .12, .14, .012, mat('#3a3a3e', 'plastica'), .06, 1.38, -W / 2 + .231, 0); slab(g, .06, .012, .02, NR, .06, 1.62, -W / 2 + .234, 0); }   // la tastiera e la feritoia dei gettoni
    slab(g, .3, .03, .14, mat('#3a3a3e', 'vernice'), 0, 1.05, -W / 2 + .096, .006); slab(g, .2, .04, .13, mat('#d8d0b8', 'carta'), 0, 1.085, -W / 2 + .096, .006);   // la mensolina e l'elenco
    return g; };
  T.cassetta_postale = () => {   // cassetta delle lettere rossa su piantana: cassa smussata, tetto tondo, feritoia con la linguetta, targhetta degli orari, serratura
    const g = new THREE.Group(); lathe(g, [[.1, 0], [.1, .03], [.05, .06], [.045, 1.0], [.07, 1.02]], 8, mat('#3a3c40', 'vernice')); slab(g, .5, .55, .32, RS, 0, 1.25, 0, .03);
    put(g, cylG(.25, .25, .32, 12), RS, 0, 1.52, 0, 0, 0, PI / 2); slab(g, .3, .035, .025, NR, 0, 1.42, .17, 0); slab(g, .32, .04, .06, mat('#8a1a1c', 'vernice'), 0, 1.45, .18, .006, -.5, 0, 0);
    if (F()) { targa(g, 'LEVATE\n8 - 14 - 18', .26, .14, 0, 1.15, .168, 0, '#e8e4d8', '#3a3a3e'); targa(g, 'PT', .1, .1, .17, 1.32, .168, 0, '#e0c040', '#b8282a'); put(g, cylG(.015, .015, .01, 8), ZS, -.18, 1.08, .165, PI / 2, 0, 0); } return g; };
  T.fermata = () => {   // fermata dell'autobus con la pensilina bassa (2,3 m): due montanti, travi, lamiera ondulata con le gronde, fondo di vetro nel telaio, panchetta a doghe sui supporti, palo con la paletta stretto al tetto
    const g = new THREE.Group(), m = mat('#5a5e60', 'vernice'), W = 3.0, D = 1.2;
    [-1.4, 1.4].forEach(x => { slab(g, .08, 2.2, .08, m, x, 1.1, -.5, .01); slab(g, .16, .02, .16, ZS, x, .01, -.5, 0); slab(g, .06, .06, D + .1, m, x, 2.23, 0, .008); if (F()) [-.05, .05].forEach(o => bullone(g, x + o, .025, -.5 + o, 'y', .01)); });   // montanti con la piastra, le travi del tetto
    const onda = []; for (let i = 0; i <= 16; i++) onda.push([-D / 2 - .05 + i / 16 * (D + .1), Math.sin(i / 16 * PI * 8) * .012]); const sh = new THREE.Shape(); onda.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); for (let i = 16; i >= 0; i--) sh.lineTo(onda[i][0], onda[i][1] + .02); sh.closePath();
    put(g, geo('onda', () => { const e = new THREE.ExtrudeGeometry(sh, { depth: W + .2, bevelEnabled: false }); e.translate(0, 0, -(W + .2) / 2); e.computeVertexNormals(); return e; }), ZN, 0, 2.272, 0, 0, PI / 2, 0);   // la lamiera ondulata sulle travi
    slab(g, W + .2, .05, .04, m, 0, 2.27, D / 2 + .07, 0); slab(g, W + .2, .05, .04, m, 0, 2.27, -D / 2 - .07, 0);   // le gronde
    put(g, slabG(2.7, 1.8, .012, 0), VT, 0, 1.3, -.5); slab(g, 2.72, .04, .04, m, 0, 2.18, -.5, 0); slab(g, 2.72, .04, .04, m, 0, .4, -.5, 0);   // il fondo di vetro nel telaio
    for (let k = 0; k < 3; k++) slab(g, 2.0, .035, .1, LG, 0, .51, -.38 + k * .12, .005);
    [-.9, .9].forEach(x => { asta(g, [x, .49, -.47], [x, 0, -.47], .02, m); asta(g, [x, .49, -.47], [x, .49, -.12], .02, m); asta(g, [x, .49, -.2], [x, .2, -.47], .016, m); slab(g, .1, .01, .1, ZS, x, .005, -.47, 0); });   // la panchetta sui supporti a L
    const p = new THREE.Group(); p.position.set(1.64, 0, .3); g.add(p); palo(p, 2.6, .035, m); put(p, cylG(.3, .3, .03, 16), mat('#c8862a', 'vernice'), 0, 2.48, .07, PI / 2, 0, 0); targa(p, 'FERMATA\n12 · 14', .4, .3, 0, 1.95, .05, 0, '#e8e4d8', '#2a4a7a');
    [1.95, 2.48].forEach(y => slab(p, .05, .05, .05, ZS, 0, y, .04, 0)); if (F()) [1.8, 2.3].forEach(y => fascetta(p, y, .035));   // paletta, orario, le staffette
    asta(g, [1.64, 2.24, .3], [1.4, 2.24, .3], .016, ZS); return g; };   // la staffa che stringe il palo alla trave
  T.edicola = () => {   // edicola dei giornali: chiosco in lamiera verde sullo zoccolo, tetto a padiglione col colmo, bancone sulle mensole, rastrelliera inclinata con le riviste, serranda arrotolata, insegna accesa, porta di servizio
    const SG = !(typeof location !== 'undefined' && /[?&]nosegni\b/.test(location.search));   // [segni] il verde hip hop pieno (?nosegni: il verde spento di prima)
    const g = new THREE.Group(), W = 2.4, D = 1.6, H = 2.4, vd = mat(SG ? '#1E8A4A' : '#3a6a4a', 'vernice'), vdS = mat(SG ? '#16683a' : '#2a4a3a', 'vernice');
    slab(g, W + .1, .18, D + .1, CS, 0, .09, 0, .02); slab(g, W, H - .18, D, vd, 0, .18 + (H - .18) / 2, 0, .04); [-1, 1].forEach(s => [-1, 1].forEach(t => slab(g, .08, H - .2, .08, vdS, s * (W / 2 - .02), .18 + (H - .18) / 2, t * (D / 2 - .02), .01)));
    ext(g, 'pad', shape([[-D / 2 - .25, 0], [D / 2 + .25, 0], [D / 2 + .22, .08], [0, .42], [-D / 2 - .22, .08]]), W + .5, .015, vdS, 0, H, 0, 0, PI / 2, 0); put(g, cylG(.05, .05, W + .5, 8), ZS, 0, H + .42, 0, 0, 0, PI / 2);   // il tetto e il colmo
    slab(g, W + .1, .08, .5, LGG, 0, .95, D / 2 + .22, .01); [-1, 1].forEach(s => { asta(g, [s * 1.1, .91, D / 2 + .42], [s * 1.1, .91, D / 2 - .02], .02, GH, 4); asta(g, [s * 1.1, .91, D / 2 + .4], [s * 1.1, .4, D / 2 - .02], .02, GH, 4); });   // il bancone sulle mensole
    put(g, cylG(.09, .09, W - .1, 10), ZS, 0, H - .22, D / 2 + .09, 0, 0, PI / 2); [-1, 1].forEach(s => slab(g, .06, .2, .2, vdS, s * (W / 2 - .02), H - .22, D / 2 + .1, .006));   // la serranda arrotolata nei suoi fianchetti
    const rx = -.25, c0 = [0, 1.52, D / 2 + .12]; slab(g, W - .3, .9, .02, LS, c0[0], c0[1], c0[2], 0, rx, 0, 0);   // la rastrelliera appoggiata alla parete
    for (let k = 0; k < 2; k++) for (let q = 0; q < 6; q++) { const p = sulPiano(c0, rx, -.2 + k * .42, .016); put(g, slabG(.28, .34, .012, 0), mat(['#d84a4a', '#ece0c0', '#4a7ad0', '#e8b840', '#e0e0d8', '#50b098'][(q + k * 2) % 6], 'carta'), -.95 + q * .38, p[1], p[2], rx, 0, 0); }
    put(g, slabG(1.3, .32, .06, .01), LU, 0, H - .05, D / 2 + .04).name = 'luce'; targa(g, 'GIORNALI · TABACCHI', 1.26, .28, 0, H - .05, D / 2 + .074, 0, '#f4e8c8', '#2a4a3a', 0); luci(g, 0, H - .05, D / 2 + .1, '#ffe0a0');
    slab(g, .7, 1.8, .04, vdS, 0, 1.1, -D / 2 - .02, .006); if (F()) { cerniera(g, -.36, 1.5, -D / 2 - .04, .1, 'y'); cerniera(g, -.36, .7, -D / 2 - .04, .1, 'y'); maniglia(g, .25, 1.1, -D / 2 - .04, .12, ZS, true); }   // la porta di servizio dietro
    // [scorci] stipata come quella del Quarticciolo: sui due fianchi le riviste appese ai fili con le mollette, due file per lato (le copertine
    // coi colori dei settimanali del 1986 e la testata scura), il filo teso fra due occhielli; sul bancone le pile dei quotidiani legate
    const COP = ['#d84a4a', '#ece0c0', '#4a7ad0', '#e8b840', '#e070a0', '#50b098', '#f4f0e0', '#c8302a'], TES = mat('#1e1e22', 'carta');
    [-1, 1].forEach(s => { const x = s * (W / 2 + .006); [1.62, 1.12].forEach((y, r) => { asta(g, [x + s * .02, y + .2, -D / 2 + .12], [x + s * .02, y + .2, D / 2 - .12], .005, ZS, 4);
        for (let q = 0; q < 4; q++) { const z = -D / 2 + .32 + q * .32; put(g, planeG(.28, .4), mat(COP[(q + r * 3 + (s > 0 ? 1 : 4)) % COP.length], 'carta'), x + s * .008, y, z, 0, s * PI / 2, 0); put(g, planeG(.26, .07), TES, x + s * .012, y + .14, z, 0, s * PI / 2, 0); } }); });
    [-.7, .55].forEach((x, i) => { slab(g, .34, .1 + i * .04, .24, mat('#ece6d4', 'carta'), x, .99 + (.1 + i * .04) / 2, D / 2 + .2, .004); if (F()) asta(g, [x - .17, 1.02, D / 2 + .2], [x + .17, 1.02, D / 2 + .2], .004, mat('#c8a050', 'tela'), 4); });   // i quotidiani in pila, legati
    return g; };
  T.chiosco = () => {   // chiosco del lungomare: pianta ottagonale bianca e azzurra, bancone tutto intorno, tetto a cono con la punta, frigo delle bibite, insegna
    const SG = !(typeof location !== 'undefined' && /[?&]nosegni\b/.test(location.search));   // [segni] il blu reale al posto dell'azzurro (?nosegni: come prima)
    const g = new THREE.Group(), R = 1.3, H = 2.3, bi = mat(SG ? '#F2EFE8' : '#e6e4da', 'vernice'), az = mat(SG ? '#1E4FB4' : '#5a92b0', 'vernice');
    lathe(g, [[R + .1, 0], [R + .1, .12], [R, .14], [R, 1.0], [R + .18, 1.0], [R + .18, 1.08], [R, 1.1], [R - .02, H - .3], [R, H - .25]], 8, bi, 0, 0, 0, PI / 8); lathe(g, [[R + .005, .14], [R + .005, .55]], 8, az, 0, 0, 0, PI / 8);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; asta(g, [Math.cos(a) * (R - .02), 1.1, Math.sin(a) * (R - .02)], [Math.cos(a) * (R - .02), H - .2, Math.sin(a) * (R - .02)], .03, az); if (i !== 4) put(g, slabG(.9, .9, .012, 0), VT, Math.cos(a + PI / 8) * (R - .02) * .99, 1.6, Math.sin(a + PI / 8) * (R - .02) * .99, 0, -a - PI / 8 + PI / 2, 0); }   // montanti e vetrate (una lasciata aperta: il passaggio)
    lathe(g, [[R + .35, H - .3], [R + .35, H - .25], [.3, H + .35], [.05, H + .45], [.05, H + .6], [.001, H + .62]], 8, az, 0, 0, 0, PI / 8); put(g, sphG(.06, 6), bi, 0, H + .64, 0);
    targa(g, 'BAR · GELATI · BIBITE', 1.0, .2, 0, H - .42, R * Math.cos(PI / 8) + .004, 0, '#e8e6dc', '#2a4a7a', 0); luci(g, 0, 1.8, 0, '#ffe8c0');
    slab(g, .6, .9, .5, bi, .4, .59, -.5, .02); put(g, slabG(.5, .5, .012, 0), VT, .4, 1.05, -.5, -PI / 2, 0, 0); targa(g, 'GELATI', .4, .12, .4, .7, -.243, 0, '#5a9ab8', '#e8e6dc', 0); return g; };
  // ================= TRANSENNE, JERSEY, PALETTI =================
  T.transenna = () => {   // transenna zincata 2 × 1,1: telaio tubolare, barre verticali, piedi a T coi tappi di gomma, anello e gancio per agganciarne un'altra (userData.aggancio)
    const g = new THREE.Group(), L = 2.0, H = 1.1; asta(g, [-L / 2, .17, 0], [-L / 2, H, 0], .02, ZN); asta(g, [L / 2, .17, 0], [L / 2, H, 0], .02, ZN); asta(g, [-L / 2, H, 0], [L / 2, H, 0], .02, ZN); asta(g, [-L / 2, .35, 0], [L / 2, .35, 0], .016, ZN);
    for (let k = 1; k < 10; k++) asta(g, [-L / 2 + k * L / 10, .35, 0], [-L / 2 + k * L / 10, H, 0], .009, ZN, 4);
    [-L / 2, L / 2].forEach(x => { asta(g, [x, .19, -.3], [x, .19, .3], .018, ZN); asta(g, [x, .19, -.3], [x, .03, -.3], .018, ZN); asta(g, [x, .19, .3], [x, .03, .3], .018, ZN); put(g, cylG(.03, .03, .03, 6), GM, x, .015, -.3); put(g, cylG(.03, .03, .03, 6), GM, x, .015, .3); });   // i piedi a T
    tor(g, .03, .007, 8, ZS, -L / 2 - .045, .9, 0, 0, 0, 0); asta(g, [-L / 2, .9, 0], [-L / 2 - .02, .9, 0], .008, ZS, 4); asta(g, [L / 2, .95, 0], [L / 2 + .06, .95, 0], .009, ZS, 4); asta(g, [L / 2 + .06, .95, 0], [L / 2 + .06, .86, 0], .009, ZS, 4);   // l'anello e il gancio
    g.userData.aggancio = [[-L / 2 - .045, .9, 0], [L / 2 + .06, .9, 0]]; return g; };
  T.jersey = (o) => {   // new jersey da 2 m: profilo estruso smussato; di cemento (orecchie di sollevamento, piedini di gomma) o di plastica bianca e rossa (tappi dell'acqua); si mettono in fila
    const g = new THREE.Group(), pl = o && o.plastica, m = pl ? mat(o.col || '#c8c2b6', 'plastica') : CM, hh = pl ? .72 : .8;
    ext(g, 'nj' + (pl ? 'p' : ''), shape([[-.3, 0], [.3, 0], [.28, .08], [.12, .26 * hh / .8], [.08, hh], [-.08, hh], [-.12, .26 * hh / .8], [-.28, .08]]), 1.9, .015, m, 0, 0, 0, 0, 0, 0, 4);
    if (pl) { [.5, -.5].forEach(z => put(g, cylG(.06, .06, .03, 8), m, 0, hh + .01, z)); slab(g, .05, .08, .1, m, 0, hh * .7, .97, .01); } else { [-.7, .7].forEach(z => slab(g, .62, .02, .12, GM, 0, .01, z, 0)); [.8, -.8].forEach(z => tor(g, .05, .01, 8, RG, 0, hh + .04, z, 0)); }
    g.userData.aggancio = [[0, .4, -.95], [0, .4, .95]]; return g; };
  T.paletto = () => {   // paletto dissuasore in ghisa: tornito col collare, la testa a cupola, l'anello per la catena, la fascia catarifrangente
    const g = new THREE.Group(); lathe(g, [[.085, 0], [.085, .04], [.065, .07], [.058, .55], [.07, .6], [.07, .66], [.058, .7], [.055, .82], [.04, .9], [.001, .93]], 8, GH); put(g, cylG(.06, .06, .07, 8), BC, 0, .76, 0);
    tor(g, .025, .007, 8, GH, 0, .64, .085, 0, PI / 2, 0); return g; };
  T.paletti_catena = (o) => {   // n paletti a interasse 1,5 m uniti dalla catena che pende a catenaria (lungo x, centrata)
    const g = new THREE.Group(), n = (o && o.n) || 3, P = 1.5, x0 = -(n - 1) * P / 2;
    for (let i = 0; i < n; i++) { const p = T.paletto(); p.position.x = x0 + i * P; g.add(p); }
    for (let i = 0; i < n - 1; i++) { const xa = x0 + i * P, pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([xa + t * P, .615 - .16 * 4 * t * (1 - t), .085]); } cavo(g, pts, .008, GH, 16); }
    g.userData.aggancio = [[x0, .64, .085], [x0 + (n - 1) * P, .64, .085]]; return g; };
  T.fioriera = (o) => {   // fioriera di cemento (o di cotto) col bordo, la terra, i cespi e i gerani; 1,2 m: segna il confine dei dehors
    const g = new THREE.Group(), w = (o && o.w) || 1.2, cotto = o && o.cotto, m = cotto ? mat(C.cotto, 'pietra') : CM, mB = cotto ? mat('#b86a48', 'pietra') : mat('#9a968e', 'cemento');
    slab(g, w, .42, .5, m, 0, .21, 0, .035); slab(g, w + .06, .06, .56, mB, 0, .45, 0, .015); slab(g, w - .08, .03, .42, mat(C.terra, 'pietra'), 0, .47, 0, 0);
    // [vasi2] le piante vere della famiglia dei vasi (gerani, erbe, la buganvillea che ricade davanti), non più icosaedri e palline
    const sd = o.seed === undefined ? 5 : Math.abs(o.seed | 0), n = Math.max(2, Math.round(w / .34)), V0 = { R: .19, Rr: .25, Hs: .45, rimY: .03, giu: .3, arco: [PI * .25, PI * .75] };
    for (let k = 0; k < n; k++) { const x = -w / 2 + (k + .5) * w / n, kind = ['geranio', 'erbe', 'geranio', 'buganvillea', 'geranio', 'basilico'][(k + sd) % 6]; piantaIn(g, kind, (sd + k) % 5, V0, x, .485, k % 2 ? .05 : -.04, kind === 'buganvillea' ? 0 : (k * 2.1 + sd) % 6, null, sd * 8 + k * 8); }
    return g; };
  // ================= ACQUA =================
  T.fontanella = () => {   // fontanella pubblica in ghisa: colonnina tornita, il bocchello curvo d'ottone, il pulsante, la vaschetta a terra con la griglia, il filo d'acqua
    const g = new THREE.Group(); lathe(g, [[.2, 0], [.2, .04], [.14, .07], [.12, .1], [.1, .9], [.13, .95], [.13, 1.0], [.09, 1.06], [.001, 1.08]], 10, GH);
    cavo(g, [[0, .78, .08], [0, .86, .22], [0, .8, .3], [0, .72, .31]], .018, OT, 10); put(g, cylG(.02, .02, .07, 6), OT, 0, .66, .13, PI / 2, 0, 0); put(g, cylG(.028, .028, .012, 6), OT, 0, .66, .17, PI / 2, 0, 0);   // bocchello e pulsante
    slab(g, .5, .06, .5, mat('#8a8478', 'cemento'), 0, .03, .3, .01); for (let k = -2; k <= 2; k++) asta(g, [k * .08, .065, .1], [k * .08, .065, .5], .008, GH, 4); asta(g, [-.2, .065, .3], [.2, .065, .3], .008, GH, 4);   // la vaschetta e la griglia
    asta(g, [0, .7, .31], [0, .07, .31], .01, mat('#6a8a9a', 'vetro'), 5);   // il filo d'acqua
    return g; };
  T.idrante = () => {   // idrante soprasuolo rosso: colonna tornita con la flangia a bulloni, due bocche laterali coi tappi e le catenelle, il cappello col quadrello
    const g = new THREE.Group(); lathe(g, [[.14, 0], [.14, .05], [.1, .07], [.09, .5], [.12, .55], [.12, .6], [.09, .64], [.085, .95], [.11, 1.0], [.07, 1.08], [.03, 1.14], [.03, 1.2]], 10, RS);
    if (F()) for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; bullone(g, Math.cos(a) * .115, .575, Math.sin(a) * .115, 'y', .009, GH); }
    [-1, 1].forEach(s => { put(g, cylG(.05, .05, .1, 8), RS, s * .13, .8, 0, 0, 0, PI / 2); put(g, cylG(.055, .045, .03, 8), GH, s * .19, .8, 0, 0, 0, PI / 2); if (F()) cavo(g, [[s * .19, .78, .04], [s * .16, .68, .08], [s * .1, .7, .07]], .005, GH, 8); });
    put(g, cylG(.035, .045, .06, 4), GH, 0, 1.23, 0); return g; };
  // ================= ENEL (li usa anche la rete elettrica) =================
  T.isolatore = () => {   // isolatore di porcellana a campana doppia sul suo perno zincato
    const g = new THREE.Group(); lathe(g, [[.012, .02], [.012, .05], [.03, .05], [.05, .09], [.052, .1], [.035, .11], [.03, .13], [.05, .17], [.052, .18], [.028, .2], [.02, .23], [.001, .24]], 8, PO); put(g, cylG(.011, .011, .07, 6), ZS, 0, .035, 0); return g; };
  // mensola ENEL a muro: piastra coi tasselli, braccio che sporge (o.sporgenza, 32 cm), saettone, traversa parallela al muro con n isolatori (o.n, 3);
  // origine sulla piastra (a muro); userData.attacchi: le teste degli isolatori, dove arrivano i fili
  T.mensola = (o) => {
    const g = new THREE.Group(); g.userData.aMuro = true; const n = (o && o.n) || 3, L = (o && o.sporgenza) || .32, P = .16;
    slab(g, .1, .3, .02, GH, 0, -.08, .01, .004); if (F()) [-.2, .04].forEach(y => bullone(g, 0, y, .022, 'z', .01, GH));
    asta(g, [0, 0, .02], [0, 0, L + .02], .018, GH); asta(g, [0, -.21, .02], [0, -.01, L - .06], .012, GH);   // il braccio e il saettone
    asta(g, [-(n - 1) * P / 2 - .05, 0, L], [(n - 1) * P / 2 + .05, 0, L], .014, GH); g.userData.attacchi = [];
    for (let i = 0; i < n; i++) { const iso = T.isolatore(), x = (i - (n - 1) / 2) * P; iso.position.set(x, 0, L); g.add(iso); g.userData.attacchi.push([x, .24, L]); }
    g.userData.attacco = [0, .24, L]; return g; };
  T.contatore = () => {   // contatore ENEL a muro: cassetta grigia smussata con lo sportellino di vetro, il quadrante, il sigillo, i due tubi che salgono e scendono, le viti
    const g = new THREE.Group(); g.userData.aMuro = true; const m = mat('#a8a8a0', 'plastica'), tb = mat('#9a9a92', 'plastica');
    slab(g, .36, .5, .14, m, 0, 0, .07, .02); put(g, slabG(.18, .14, .01, 0), VT, 0, .08, .145); targa(g, 'kWh\n0 4 2 7 1', .14, .08, 0, .08, .1415, 0, '#e8e4d8', '#2a2a2e', 0); slab(g, .3, .03, .02, mat('#8a8a82', 'plastica'), 0, -.14, .145, .004);
    asta(g, [.1, .24, .05], [.1, .6, .05], .02, tb); asta(g, [-.1, -.24, .05], [-.1, -.55, .05], .02, tb); if (F()) { [-.15, .15].forEach(x => [-.21, .21].forEach(y => bullone(g, x, y, .145, 'z', .007, ZS))); tor(g, .028, .006, 8, ZS, .1, .45, .05); put(g, cylG(.012, .012, .01, 6), RS, .1, -.2, .145, PI / 2, 0, 0); }
    return g; };
  T.cabina_enel = () => {   // cabina ENEL prefabbricata: cassone di cemento sullo zoccolo col tetto a sbalzo, porta di lamiera a feritoie con le cerniere e il lucchetto, targhe di pericolo e del numero, griglia, mensola sul tetto e il contatore a fianco
    const g = new THREE.Group(), W = 2.0, D = 1.6, H = 2.5, m = mat('#a8a49a', 'cemento'), mS = mat('#8e8a80', 'cemento'), lam = mat('#5f6a64', 'vernice'), fer = mat('#4f5854', 'vernice');
    slab(g, W + .1, .12, D + .1, mS, 0, .06, 0, .02); slab(g, W, H - .12, D, m, 0, .12 + (H - .12) / 2, 0, .04); slab(g, W + .3, .12, D + .3, mS, 0, H + .06, 0, .02);
    slab(g, .9, 2.0, .05, lam, -.3, 1.15, D / 2 + .02, .008); for (let k = 0; k < 5; k++) slab(g, .7, .02, .03, fer, -.3, .45 + k * .09, D / 2 + .05, 0); for (let k = 0; k < 4; k++) slab(g, .7, .02, .03, fer, -.3, 1.6 + k * .09, D / 2 + .05, 0);   // la porta con le feritoie
    cerniera(g, -.75, 1.7, D / 2 + .045, .1, 'y'); cerniera(g, -.75, .6, D / 2 + .045, .1, 'y'); if (F()) { maniglia(g, .05, 1.15, D / 2 + .045, .12, ZS, true); slab(g, .06, .08, .03, OT, .05, .95, D / 2 + .06, .006); }
    targa(g, 'PERICOLO\nDI MORTE', .36, .26, -.3, 1.38, D / 2 + .052, 0, '#e8c830', '#1a1a1c', 0); targa(g, 'ENEL\nCABINA 12', .3, .14, .6, 1.9, D / 2 + .0085, 0, '#e8e4d8', '#2a4a7a');
    slab(g, .5, .4, .03, lam, .6, .7, D / 2 + .015, .004); for (let k = 0; k < 6; k++) slab(g, .44, .015, .02, fer, .6, .53 + k * .065, D / 2 + .035, 0);   // la griglia di aerazione
    const ms = T.mensola({ n: 3, sporgenza: .26 }); ms.rotation.x = -PI / 2; ms.position.set(.5, H + .12, -.3); g.add(ms);   // la mensola in piedi sul tetto
    const ct = T.contatore(); ct.rotation.y = PI / 2; ct.position.set(W / 2, 1.4, .2); g.add(ct); return g; };
  // ================= COSE DEL LAVORO E DEL MERCATO =================
  T.bombola = (o) => {   // bombola GPL da 15 kg: tornita con la spalla, il piede ad anello, il collare forato, la valvola d'ottone col tappo
    const g = new THREE.Group(), m = mat((o && o.col) || '#b83a2c', 'vernice'), R = .15, H = .62;
    lathe(g, [[R * .9, 0], [R * .95, .05], [R * .9, .06]], 12, GH); lathe(g, [[.001, .05], [R - .01, .05], [R, .08], [R, H - .12], [R * .8, H - .04], [.035, H], [.001, H]], 12, m);
    lathe(g, [[R * .62, H - .06], [R * .7, H + .1], [R * .66, H + .1], [R * .58, H - .06]], 10, mat('#8a2a20', 'vernice')); if (F()) for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; put(g, cylG(.022, .022, .02, 6), NR, Math.cos(a) * R * .67, H + .04, Math.sin(a) * R * .67, PI / 2, -a + PI / 2, 0); }   // i fori del collare
    put(g, cylG(.025, .025, .08, 6), OT, 0, H + .04, 0); put(g, cylG(.04, .04, .015, 6), NR, 0, H + .085, 0); if (F()) targa(g, 'GAS\n15 kg', .1, .06, 0, .32, R + .0005, 0, '#e8e4d8', '#2a2a2e', 0); return g; };
  T.carretto = () => {   // carretto a mano a due ruote: cassone a doghe con le sponde, telaio, le stanghe col manico, le ruote a dieci raggi col cerchione di ferro, il piede d'appoggio
    const g = new THREE.Group(), W = 1.0, L = 1.4, R = .3, ry = R + .018; slab(g, W, .035, L, LG, 0, .55, 0, .004);
    [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) slab(g, .025, .11, L, LG, s * (W / 2 - .012), .62 + k * .12, 0, .003); [-.6, 0, .6].forEach(z => slab(g, .04, .42, .04, LS, s * (W / 2 - .032), .77, z, .004)); });   // sponde a doghe coi montanti
    for (let k = 0; k < 3; k++) slab(g, W, .11, .025, LG, 0, .62 + k * .12, -L / 2 + .012, .003); slab(g, W, .07, .03, LS, 0, .5, 0, .004); [-.3, .3].forEach(x => slab(g, .06, .07, L, LS, x, .5, 0, .004));   // sponda di fondo e il telaio sotto
    [-.3, .3].forEach(x => asta(g, [x, .47, .2], [x, ry, .2], .025, LS)); asta(g, [-.52, ry, .2], [.52, ry, .2], .022, GH);   // i supporti e l'asse
    [-1, 1].forEach(s => { const x = s * .55; tor(g, R, .018, 18, GH, x, ry, .2, 0, PI / 2, 0); put(g, cylG(.05, .05, .07, 8), LS, x, ry, .2, 0, 0, PI / 2); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; asta(g, [x, ry, .2], [x, ry + Math.cos(a) * (R - .01), .2 + Math.sin(a) * (R - .01)], .009, LGG, 4); } });   // ruote a raggi
    [-.35, .35].forEach(x => asta(g, [x, .52, L / 2 - .1], [x, .62, L / 2 + .9], .022, LS)); asta(g, [-.35, .62, L / 2 + .9], [.35, .62, L / 2 + .9], .018, LS);   // le stanghe col manico
    asta(g, [.3, .47, -.55], [.3, .03, -.62], .02, GH, 4); put(g, cylG(.04, .04, .03, 6), GM, .3, .015, -.62); return g; };
  T.bancarella = (o) => {   // bancarella del mercato: piano su quattro gambe col ripiano basso, tenda a strisce sul telaio, cassette inclinate con la merce, bilancia, cartellini dei prezzi, la lampadina
    const g = new THREE.Group(), ca = (o && o.col) || C.verde, cb = (o && o.col2) || C.bianco, mT = mat(ca, 'tela'), mT2 = mat(cb, 'tela'), W = 2.4, D = 1.3, merci = (o && o.merci) || ['#c84a2a', '#e0b030', '#4a8a3a', '#d06a2a'];
    slab(g, W, .05, D, LGG, 0, .9, 0, .008); slab(g, W - .1, .035, D - .2, LG, 0, .3, 0, .005); [[-1.15, -.6], [1.15, -.6], [-1.15, .6], [1.15, .6]].forEach(([x, z]) => { slab(g, .07, .88, .07, LS, x, .44, z, .006); asta(g, [x, .9, z], [x * .97, 2.35, z * .9], .02, GH, 4); });
    slab(g, W, .55, .025, LG, 0, .6, D / 2 - .03, .004);   // la pannellatura davanti
    asta(g, [-1.12, 2.35, -.54], [1.12, 2.35, -.54], .02, GH, 4); asta(g, [-1.12, 2.35, .54], [1.12, 2.35, .54], .02, GH, 4); asta(g, [-1.12, 2.35, -.54], [-1.12, 2.35, .54], .02, GH, 4); asta(g, [1.12, 2.35, -.54], [1.12, 2.35, .54], .02, GH, 4);   // il telaio della tenda
    const N = 8; for (let k = 0; k < N; k++) { const w = (W + .3) / N, x = -(W + .3) / 2 + w * (k + .5); put(g, slabG(w, .012, D + .3, 0), k % 2 ? mT2 : mT, x, 2.375, 0); put(g, slabG(w, .2, .012, 0), k % 2 ? mT2 : mT, x, 2.28, D / 2 + .15); }   // il telo e la mantovana a strisce
    for (let k = 0; k < 4; k++) { const x = -.9 + k * .6, c0 = [x, 1.0, .15]; slab(g, .5, .14, .36, LGG, c0[0], c0[1], c0[2], .006, .3, 0, 0); const mm = mat(merci[k % merci.length], 'tela'); for (let q = 0; q < 6; q++) { const p = sulPiano(c0, .3, (q > 2 ? .07 : -.07), .1); put(g, icoG(.055, 0), mm, x - .14 + (q % 3) * .14, p[1], p[2]); } }
    slab(g, .3, .1, .22, BC, .95, .975, -.4, .01); put(g, cylG(.14, .14, .02, 10), ZN, .95, 1.1, -.4); asta(g, [.95, 1.02, -.4], [.95, 1.09, -.4], .02, ZS, 4);   // la bilancia
    for (let k = 0; k < 3; k++) { if (F()) targa(g, ['1200', '800', '1500'][k], .14, .09, -.8 + k * .7, .85, D / 2 + .008, 0, '#f0ead8', '#2a2a2e', 0); }
    asta(g, [0, 2.35, -.54], [0, 2.35, .54], .015, GH, 4); cavo(g, [[0, 2.34, 0], [.01, 2.27, 0], [0, 2.2, 0]], .004, NR, 4); put(g, sphG(.05, 6), LU, 0, 2.15, 0).name = 'luce'; luci(g, 0, 2.15, 0, '#ffe4b0');   // la lampadina appesa al telaio
    return g; };
  // il tavolino da bar: piano tondo (marmo, plastica bianca o lamiera), colonna e piede (ghisa a tre zampe, o disco); Ø 70
  T.tavolino = (o) => { const g = new THREE.Group(), tipo = (o && o.tipo) || 'marmo';
    if (tipo === 'plastica') { const m = mat('#eeece6', 'plastica'); put(g, cylG(.35, .34, .03, 16), m, 0, .735, 0); tor(g, .345, .012, 16, m, 0, .72, 0); lathe(g, [[.25, 0], [.25, .02], [.06, .05], [.035, .08], [.03, .7], [.06, .72]], 10, m); return g; }
    const top = tipo === 'ferro' ? mat('#c8c2b6', 'vernice') : mat('#e8e2d6', 'pietra'); put(g, cylG(.35, .35, .035, 16), top, 0, .735, 0); tor(g, .35, .012, 16, tipo === 'ferro' ? GH : mat('#d8d2c6', 'pietra'), 0, .72, 0);
    lathe(g, [[.06, 0], [.06, .03], [.03, .07], [.025, .6], [.035, .66], [.09, .7], [.09, .72]], 8, GH); for (let i = 0; i < 3; i++) { const a = i / 3 * PI * 2; cavo(g, [[0, .08, 0], [Math.cos(a) * .18, .05, Math.sin(a) * .18], [Math.cos(a) * .3, .02, Math.sin(a) * .3]], .016, GH, 6); put(g, cylG(.025, .025, .02, 6), GH, Math.cos(a) * .3, .01, Math.sin(a) * .3); }
    return g; };
  // la sedia: pieghevole da bar (telaio verde, doghe), di plastica bianca monoblocco, o bistrot di ferro col sedile di legno
  T.sedia = (o) => { const g = new THREE.Group(), tipo = (o && o.tipo) || 'pieghevole';
    if (tipo === 'plastica') { const m = mat('#eeece6', 'plastica'); slab(g, .44, .05, .42, m, 0, .44, 0, .015); slab(g, .44, .4, .04, m, 0, .68, -.2, .012, -.12, 0, 0); [[-.19, .18], [.19, .18], [-.19, -.18], [.19, -.18]].forEach(([a, b]) => lathe(g, [[.026, 0], [.022, .42]], 6, m, a, 0, b)); [-.21, .21].forEach(a => slab(g, .035, .04, .36, m, a, .6, -.02, 0)); [-.21, .21].forEach(a => asta(g, [a, .6, .15], [a, .46, .17], .015, m, 4)); return g; }
    if (tipo === 'bistrot') { slab(g, .4, .035, .4, mat('#a8804a', 'legno'), 0, .46, 0, .008); [[-.17, .17], [.17, .17], [-.17, -.17], [.17, -.17]].forEach(([a, b]) => asta(g, [a, 0, b * 1.08], [a * .95, .45, b], .013, GH, 5)); [-.17, .17].forEach(a => asta(g, [a * .95, .45, -.17], [a, .88, -.22], .013, GH, 5)); asta(g, [-.17, .88, -.22], [.17, .88, -.22], .013, GH, 5); asta(g, [-.17, .72, -.2], [.17, .72, -.2], .01, GH, 5); tor(g, .17, .008, 12, GH, 0, .2, 0); return g; }
    const m = VD; [-1, 1].forEach(s => { asta(g, [s * .2, .02, .2], [s * .2, .86, -.22], .011, m); asta(g, [s * .2, .02, -.2], [s * .2, .45, .18], .011, m); asta(g, [s * .2, .45, .18], [s * .2, .45, -.19], .011, m); put(g, cylG(.015, .015, .02, 6), GM, s * .2, .01, .2); put(g, cylG(.015, .015, .02, 6), GM, s * .2, .01, -.2); });
    asta(g, [-.2, .86, -.22], [.2, .86, -.22], .011, m); asta(g, [-.2, .03, .2], [.2, .03, .2], .011, m); asta(g, [-.2, .03, -.2], [.2, .03, -.2], .011, m);
    for (let k = 0; k < 4; k++) slab(g, .42, .022, .07, LGG, 0, .466, -.15 + k * .1, .004); slab(g, .42, .1, .022, LGG, 0, .78, -.2, .004, .12, 0, 0); if (F()) [-1, 1].forEach(s => bullone(g, s * .211, .45, .0, 'x', .008, ZS)); return g; };
  T.ombrellone = (o) => {   // ombrellone da bar: base di cemento tornita, palo bianco, otto stecche coi puntali, il telo a spicchi di due colori, la mantovana, il pomolo
    const g = new THREE.Group(), mA = mat((o && o.col) || '#e0cdb0', 'tela'), mB = mat((o && o.col2) || (o && o.col) || '#e0cdb0', 'tela'), H = (o && o.h) || 2.3, R = 1.4, hc = .42;
    lathe(g, [[.25, 0], [.25, .05], [.15, .1], [.06, .12], [.04, .16]], 12, CM); asta(g, [0, .1, 0], [0, H + .05, 0], .022, BC);
    for (let i = 0; i < 8; i++) { const th = i / 8 * PI * 2, sx = Math.sin(th), sz = Math.cos(th); asta(g, [0, H - .02, 0], [sx * R, H - hc, sz * R], .009, BC, 4); put(g, sphG(.018, 5), BC, sx * R, H - hc, sz * R); asta(g, [0, H - .6, 0], [sx * R * .5, H - hc * .5 - .02, sz * R * .5], .007, BC, 4);
      put(g, geo('omb' + i, () => new THREE.ConeGeometry(R, hc, 1, 1, true, th, PI / 4)), i % 2 ? mB : mA, 0, H - hc / 2, 0);
      put(g, geo('mnt' + i, () => new THREE.CylinderGeometry(R, R, .12, 1, 1, true, th, PI / 4)), i % 2 ? mB : mA, 0, H - hc - .06, 0); }
    put(g, sphG(.03, 6), BC, 0, H + .07, 0); return g; };
  T.lavagna = () => {   // lavagna del menù a cavalletto: due telai di legno a cerniera in cima, la lavagna nera scritta col gesso, la catenella che li tiene aperti
    const g = new THREE.Group(), tilt = .2, L = 1.0, zf = Math.sin(tilt) * L; [-1, 1].forEach(s => { const z1 = s * zf; [-.28, .28].forEach(x => asta(g, [x, 0, z1], [x, L * Math.cos(tilt), s * .02], .018, LG, 5)); asta(g, [-.28, .95, s * .028], [.28, .95, s * .028], .016, LG, 5); asta(g, [-.28, .25, s * zf * .75], [.28, .25, s * zf * .75], .016, LG, 5); });
    const c0 = [0, .6, zf * .4 + .005]; put(g, slabG(.54, .64, .012, 0), NR, c0[0], c0[1], c0[2] + .01, -tilt, 0, 0); const tp = sulPiano([0, .6, c0[2] + .01], -tilt, 0, .008); targa(g, 'OGGI\nPASTA E CECI\nFRITTURA', .46, .54, 0, tp[1], tp[2], 0, '#1a1a1c', '#e8e4d8', 0).rotation.x = -tilt;
    cerniera(g, 0, L * Math.cos(tilt) - .01, 0, .6, 'x'); if (F()) cavo(g, [[.28, .25, -zf * .75], [.28, .12, 0], [.28, .25, zf * .75]], .004, ZS, 8); return g; };
  T.frigo_gelati = () => {   // frigo dei gelati a pozzetto: cassa bianca smussata, due coperchi scorrevoli di vetro sui binari, griglia sul retro, ruote, insegna
    const g = new THREE.Group(), W = 1.2, H = .9, D = .7, bi = mat('#e8e6e0', 'vernice');
    slab(g, W, H - .08, D, bi, 0, .08 + (H - .08) / 2, 0, .03); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { put(g, cylG(.04, .04, .03, 8), GM, a * (W / 2 - .08), .04, b * (D / 2 - .08), 0, 0, PI / 2); slab(g, .03, .06, .03, ZS, a * (W / 2 - .08), .07, b * (D / 2 - .08), 0); });
    slab(g, W + .02, .04, D + .02, mat('#c8c6c0', 'vernice'), 0, H, 0, .01); [-1, 1].forEach(s => { put(g, slabG(W / 2 - .06, .01, D - .12, 0), VT, s * (W / 4 - .02), H + .025, 0); slab(g, W / 2 - .06, .03, .03, ZS, s * (W / 4 - .02), H + .03, D / 2 - .06, 0); });
    targa(g, 'GELATI\nMOTTINO', .7, .4, 0, .55, D / 2 + .0005, 0, '#2a6aa8', '#ffffff', 0); for (let k = 0; k < 8; k++) slab(g, W - .3, .01, .02, mat('#5a5a5a', 'vernice'), 0, .2 + k * .05, -D / 2 - .005, 0);
    if (F()) { targa(g, '-18°', .12, .06, -.45, .82, D / 2 + .0005, 0, '#e8e6e0', '#2a2a2e', 0); } return g; };
  // ================= IL PORTO =================
  T.bitta = () => {   // bitta d'ormeggio: ghisa tornita a fungo sulla piastra a quattro bulloni, con la cima avvolta
    const g = new THREE.Group(); lathe(g, [[.001, 0], [.34, 0], [.34, .05], [.2, .07], [.17, .12], [.15, .36], [.19, .42], [.26, .46], [.26, .52], [.2, .56], [.001, .57]], 12, GH);
    if (F()) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => bullone(g, a * .24, .055, b * .24, 'y', .016, mat('#4a4a4e', 'zinco'))); tor(g, .18, .035, 12, mat('#c8b88a', 'tela'), 0, .2, 0); tor(g, .175, .03, 12, mat('#c0b082', 'tela'), 0, .27, 0); return g; };
  T.reti = () => {   // reti da pesca ammucchiate sulla banchina: il mucchio verde-mare coi sugheri sulla lima, la boa arancione legata, la cima arrotolata a fianco
    const g = new THREE.Group(), mR = mat(C.mare, 'tela'), mR2 = mat('#3a5a4a', 'tela'), corda = mat('#c8b88a', 'tela');
    const blob = (x, z, sx, sy, sz, m) => { const ge = icoG(.5, 1), o = put(g, ge, m, x, 0, z); if (!ge.boundingBox) ge.computeBoundingBox(); o.scale.set(sx, sy, sz); o.position.y = -ge.boundingBox.min.y * sy; return o; };
    blob(0, 0, 1.1, .5, .82, mR); blob(.42, .28, .7, .42, .52, mR2); blob(-.5, -.18, .62, .38, .45, mR2); blob(.12, -.12, .5, .62, .4, mR);
    const lima = [[-.75, .1, .2], [-.4, .3, .25], [0, .42, .22], [.35, .38, .3], [.7, .16, .3]]; cavo(g, lima, .01, corda, 14);
    for (let k = 0; k < 5; k++) { const p = lima[k]; put(g, cylG(.045, .045, .07, 6), mat('#c8a868', 'legno'), p[0], p[1], p[2], PI / 2, 0, 0); }   // i sugheri sulla lima
    put(g, sphG(.15, 8), mat('#d86a2a', 'plastica'), .78, .34, .38); asta(g, [.7, .16, .3], [.75, .3, .36], .008, corda, 4);   // la boa legata alla lima
    tor(g, .2, .045, 12, corda, -.85, .045, .45); tor(g, .18, .04, 12, corda, -.85, .12, .45); asta(g, [-.68, .1, .4], [-.6, .12, .3], .012, corda, 4); return g; };
  T.nassa = () => {   // nassa: cesta cilindrica con tre cerchi e le stecche di canna, la rete, l'imbocco a cono, il galleggiante legato
    const g = new THREE.Group(), m = mat('#a08a5a', 'legno'), R = .3, H = .5; [.012, H / 2, H - .012].forEach(y => tor(g, R, .012, 14, m, 0, y, 0));
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; asta(g, [Math.cos(a) * R, .0, Math.sin(a) * R], [Math.cos(a) * R, H, Math.sin(a) * R], .007, m, 4); }
    put(g, geo('nas', () => new THREE.CylinderGeometry(R - .008, R - .008, H - .02, 12, 1, true)), mat('#3a5a4a', 'vetro'), 0, H / 2, 0); put(g, geo('imb', () => new THREE.ConeGeometry(R - .01, .3, 10, 1, true)), mat('#3a5a4a', 'vetro'), 0, H - .16, 0);
    if (F()) { cavo(g, [[R, H - .01, 0], [R + .1, H + .08, .06], [R + .15, H + .1, .1]], .005, mat('#c8b88a', 'tela'), 6); put(g, sphG(.06, 6), mat('#e8e4d8', 'plastica'), R + .19, H + .12, .12); } return g; };
  T.cassetta_pesce = (o) => {   // cassetta del pesce: polistirolo bianco (o legno a doghe) bassa, col ghiaccio e i pesci argentati
    const g = new THREE.Group(), legno = o && o.legno, W = .55, H = .16, D = .38, m = legno ? LGG : mat('#eceae2', 'plastica');
    if (legno) { slab(g, W, .02, D, m, 0, .01, 0, 0); [-1, 1].forEach(s => { slab(g, W, .06, .015, m, 0, .05, s * (D / 2 - .008), 0); slab(g, W, .06, .015, m, 0, .12, s * (D / 2 - .008), 0); slab(g, .015, .14, D, m, s * (W / 2 - .008), .08, 0, 0); }); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .03, H, .03, LS, a * (W / 2 - .02), H / 2, b * (D / 2 - .02), 0)); }
    else { slab(g, W, H, D, m, 0, H / 2, 0, .015); slab(g, W - .06, .02, D - .06, mat('#dcdad2', 'plastica'), 0, H - .005, 0, 0); if (F()) [-1, 1].forEach(s => slab(g, .08, .03, .04, mat('#c8c6be', 'plastica'), s * (W / 2 - .06), H - .06, D / 2 + .01, 0)); }
    put(g, slabG(W - .08, .03, D - .08, .01), mat('#dfe8ee', 'vetro'), 0, H - .02, 0);
    for (let k = 0; k < 6; k++) { const f = put(g, latheG([[.001, 0], [.025, .05], [.03, .15], [.02, .22], [.008, .26], [.001, .27]], 6), mat(k % 2 ? '#9ab0c0' : '#b8c8d0', 'zinco'), -.19 + k * .076, H - .004, -.13 + (k % 2) * .02); f.rotation.order = 'YXZ'; f.rotation.set(PI / 2, (k % 3 - 1) * .12, 0); f.scale.z = .5; }   // distesi sul ghiaccio, la testa verso il davanti
    return g; };
  // ================= CANTIERE E TETTI =================
  T.scala_pioli = () => {   // scala a pioli di legno da 3 m appoggiata (15°): due montanti, dieci pioli, i piedini di gomma, i due tiranti di ferro
    const g = new THREE.Group(), L = 3.0, t = .26, m = LGG; const P = (x, s) => [x, Math.cos(t) * s, Math.sin(t) * s];
    [-.2, .2].forEach(x => { asta(g, P(x, 0), P(x * .85, L), .024, m); put(g, cylG(.028, .028, .03, 6), GM, x, .015, 0); });
    for (let k = 0; k < 10; k++) { const s = .25 + k * .28, w = .2 - .03 * s / L; asta(g, P(-w, s), P(w, s), .014, LG, 5); } if (F()) [.9, 2.1].forEach(s => { const w = .2 - .03 * s / L; asta(g, P(-w - .01, s + .04), P(w + .01, s + .04), .005, ZS, 4); }); return g; };
  T.impalcatura = () => {   // una campata di impalcatura 1,8 × 2 piani: montanti con le basette, correnti, parapetti, diagonali, tavole, fermapiede, giunti, la rete arancione
    const g = new THREE.Group(), L = 1.8, piani = 2, H = piani * 2 + 1.05, X = [-L / 2, L / 2], Z = [0, 1.0];
    X.forEach(x => Z.forEach(z => { asta(g, [x, .02, z], [x, H, z], .024, ZN); slab(g, .15, .02, .15, ZN, x, .01, z, 0); for (let l = 1; l <= piani; l++) put(g, cylG(.034, .034, .07, 6), ZS, x, l * 2, z); }));   // montanti, basette, giunti
    for (let l = 1; l <= piani; l++) { const y = l * 2; Z.forEach(z => asta(g, [X[0], y, z], [X[1], y, z], .02, ZN)); X.forEach(x => asta(g, [x, y, Z[0]], [x, y, Z[1]], .02, ZN)); [.5, 1.0].forEach(h => asta(g, [X[0], y + h, Z[1]], [X[1], y + h, Z[1]], .02, ZN));   // correnti e parapetto
      [.2, .5, .8].forEach(t => slab(g, L, .045, .26, LGG, 0, y + .043, Z[0] + t, .004)); slab(g, L, .15, .02, GL, 0, y + .12, Z[1] - .03, 0); }   // tavole e fermapiede
    asta(g, [X[0], .1, Z[1]], [X[1], 2.0, Z[1]], .02, ZN); asta(g, [X[0], .1, Z[0]], [X[1], 2.0, Z[0]], .02, ZN);
    put(g, geo('rete', () => new THREE.PlaneGeometry(L - .1, H - .6)), mat('#e06a1e', 'tela'), 0, H / 2 + .2, Z[1] + .025); return g; };
  T.cavalletto = () => {   // cavalletto da cantiere ad A: due gambe di legno per lato, traversa in cima, catena che le tiene; 1 m
    const g = new THREE.Group(), m = LG; [-1, 1].forEach(s => { [-.45, .45].forEach(x => asta(g, [x, .0, s * .32], [x * .9, .95, s * .04], .028, m)); asta(g, [-.45, .3, s * .22], [.45, .3, s * .22], .018, m); });
    slab(g, 1.1, .06, .1, LS, 0, .98, 0, .008); cerniera(g, 0, .96, 0, 1.0, 'x'); if (F()) cavo(g, [[.42, .3, -.22], [.42, .2, 0], [.42, .3, .22]], .004, ZS, 8); return g; };
  T.antenna_tv = (o) => {   // antenna TV 1986: palo zincato sul piede a treppiede imbullonato, fascette, la culla con gli elementi a lunghezza crescente, il dipolo, il cavo che scende
    const g = new THREE.Group(), hh = (o && o.h) || 2.6, ry = (o && o.ry) || 0; slab(g, .22, .03, .22, ZS, 0, .015, 0, .006); [0, 2.09, 4.19].forEach(a => { asta(g, [Math.cos(a) * .35, .02, Math.sin(a) * .35], [0, .7, 0], .014, ZN, 4); slab(g, .06, .01, .06, ZS, Math.cos(a) * .35, .005, Math.sin(a) * .35, 0); });
    lathe(g, [[.028, 0], [.028, hh - .02], [.001, hh]], 6, ZN); if (F()) for (let y = .7; y < hh - .3; y += .9) fascetta(g, y, .028);
    const h = new THREE.Group(); h.position.y = hh - .15; h.rotation.y = ry; g.add(h);
    const L = 1.3; asta(h, [-L * .3, 0, 0], [L * .7, 0, 0], .014, ZN, 4); slab(h, .08, .1, .06, NR, -.05, 0, 0, .01);
    for (let q = 0; q < 7; q++) { const w = .62 - q * .055, x = -L * .25 + q * L * .16; asta(h, [x, .014, -w / 2], [x, .014, w / 2], .007, ZN, 4); } asta(h, [-L * .3, 0, 0], [-L * .3, -.2, 0], .009, ZN, 4); asta(h, [-L * .3, -.2, -.2], [-L * .3, -.2, .2], .007, ZN, 4);   // elementi e riflettore
    cavo(g, [[.02, hh - .2, .02], [.04, 1.4, .035], [.04, .3, .03], [.4, .01, .3]], .007, GM, 10); return g; };
  T.cassone = () => {   // cassone per le macerie 3 × 1,5: lamiera con le nervature, le quattro orecchie di sollevamento con gli anelli, la sponda ribaltabile sulle cerniere, le macerie
    const g = new THREE.Group(), W = 3.0, H = 1.2, D = 1.5, m = mat('#4a6a3a', 'vernice'), mS = mat('#3a5a2a', 'vernice');
    ext(g, 'cas', shape([[-D / 2, 0], [D / 2, 0], [D / 2 + .1, H], [-D / 2 - .1, H]]), W, .02, m, 0, 0, 0, 0, PI / 2, 0); for (let k = -3; k <= 3; k++) ext(g, 'casN', shape([[-D / 2 - .02, .03], [D / 2 + .02, .03], [D / 2 + .12, H - .05], [-D / 2 - .12, H - .05]]), .05, .006, mS, k * .42, 0, 0, 0, PI / 2, 0);
    slab(g, W + .04, .08, .06, mS, 0, H - .04, D / 2 + .1, .01); slab(g, W + .04, .08, .06, mS, 0, H - .04, -D / 2 - .1, .01); [-.45, .45].forEach(z => slab(g, W, .06, .08, mS, 0, .03, z, .01));   // orli e pattini
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { slab(g, .06, .2, .1, mS, a * (W / 2 - .3), H + .06, b * (D / 2 + .08), .008); if (F()) tor(g, .04, .01, 8, ZS, a * (W / 2 - .3), H + .2, b * (D / 2 + .08), 0, 0, 0); }); cerniera(g, 0, H - .03, D / 2 + .14, W * .9, 'x');
    put(g, slabG(W - .4, .25, D - .3, .03), mat('#8a8278', 'cemento'), 0, H - .3, 0); return g; };
  T.comignolo = (o) => {   // comignolo: canna d'intonaco con la cornice e la fascia di fuliggine, cappello di lamiera conico sul collo
    const g = new THREE.Group(), H = (o && o.h) || 1.4, m = mat((o && o.col) || '#c8c0b0', 'cemento');
    slab(g, .62, H, .5, m, 0, H / 2, 0, .02); slab(g, .76, .1, .64, mat('#a8a094', 'cemento'), 0, H - .05, 0, .02); slab(g, .64, .22, .52, mat('#2a2624', 'cemento'), 0, H - .2, 0, .01);
    put(g, cylG(.12, .12, .22, 10), ZS, 0, H + .1, 0); lathe(g, [[.05, 0], [.06, .2], [.36, .22], [.04, .42], [.001, .44]], 10, mat('#6a6e70', 'zinco'), 0, H, 0); return g; };
  // ================= LA PIAZZETTA =================
  T.edicola_votiva = () => {   // edicola votiva a muro: nicchia con la cornice a timpano in stucco, l'immagine, la grata di ferro, la mensolina coi lumini e i fiori; origine sul fondo della nicchia
    const g = new THREE.Group(); g.userData.aMuro = true; const st = mat('#d8c8aa', 'pietra'), stS = mat('#b8a888', 'pietra');
    slab(g, .9, 1.2, .12, st, 0, 0, .06, .015); slab(g, .6, .8, .1, mat('#2a1c24', 'pietra'), 0, 0, .13, 0); targa(g, '', .36, .5, 0, .02, .19, 0, '#3a5aa8', '#c8a040', 0);
    [-.4, .4].forEach(x => slab(g, .1, 1.0, .1, stS, x, -.05, .17, .01)); ext(g, 'tim', shape([[-.55, 0], [.55, 0], [0, .3]]), .14, .012, stS, 0, .5, .19, 0, 0, 0, 1); slab(g, 1.1, .08, .18, st, 0, .48, .17, .01);
    slab(g, 1.1, .1, .4, mat('#8a5d4e', 'pietra'), 0, -.66, .22, .012); [-.15, .15].forEach(x => { put(g, cylG(.035, .035, .1, 8), mat('#c83a2a', 'vetro'), x, -.56, .32); put(g, cylG(.01, .01, .03, 6), LU, x, -.5, .32).name = 'luce'; });
    luci(g, 0, -.5, .35, '#ffb040'); for (let k = 0; k < 3; k++) put(g, icoG(.06, 0), mat(['#e0405a', '#f0f0f0', '#f0c040'][k], 'tela'), -.25 + k * .25, -.55, .36);
    for (let k = -2; k <= 2; k++) asta(g, [k * .13, -.4, .2], [k * .13, .4, .2], .006, GH, 4); [-.3, .3].forEach(y => asta(g, [-.3, y, .2], [.3, y, .2], .006, GH, 4)); return g; };
  T.pozzo = () => {   // pozzo della piazzetta: vera ottagonale in pietra col gradino, due colonnine di ghisa, l'arco con la carrucola, la catena e il secchio
    const g = new THREE.Group(), st = mat(C.pietra, 'pietra'); lathe(g, [[.9, 0], [.9, .12], [.72, .14], [.72, .9], [.78, .92], [.78, 1.0], [.72, 1.02], [.6, 1.02], [.6, .3], [.001, .3]], 8, st, 0, 0, 0, PI / 8);
    [-1, 1].forEach(s => { lathe(g, [[.07, 0], [.07, .04], [.04, .07], [.035, 1.4], [.05, 1.45], [.001, 1.5]], 8, GH, s * .66, 1.0, 0); }); cavo(g, [[-.66, 2.4, 0], [-.4, 2.75, 0], [0, 2.85, 0], [.4, 2.75, 0], [.66, 2.4, 0]], .025, GH, 14);
    put(g, cylG(.12, .12, .04, 12), GH, 0, 2.55, 0, 0, 0, PI / 2); asta(g, [0, 2.84, 0], [0, 2.6, 0], .014, GH, 4); cavo(g, [[0, 2.55, .12], [0, 1.6, .12], [0, 1.33, .1]], .012, ZS, 8);   // carrucola e catena
    lathe(g, [[.001, 0], [.13, 0], [.15, .03], [.16, .25], [.17, .27]], 10, ZN, 0, 1.05, .1); asta(g, [-.16, 1.31, .1], [0, 1.45, .1], .008, ZS, 4); asta(g, [0, 1.45, .1], [.16, 1.31, .1], .008, ZS, 4); return g; };
  T.tombino = () => {   // chiusino tondo in ghisa Ø 70: cornice a terra, piatto col bordo, due anelli di nervature e i due fori di presa
    const g = new THREE.Group(); lathe(g, [[.36, 0], [.42, 0], [.42, .02], [.36, .025]], 16, mat('#3a3936', 'ghisa')); lathe(g, [[.001, 0], [.35, 0], [.35, .035], [.3, .04], [.001, .04]], 16, GH);
    tor(g, .26, .008, 16, mat('#3a3a3e', 'ghisa'), 0, .04, 0); tor(g, .15, .008, 12, mat('#3a3a3e', 'ghisa'), 0, .04, 0); if (F()) [-.2, .2].forEach(x => put(g, cylG(.02, .02, .01, 6), mat('#1a1a1c', 'ghisa'), x, .042, 0)); return g; };
  T.caditoia = () => {   // caditoia al cordolo 50 × 30: telaio in ghisa e dieci barre con la luce fra l'una e l'altra
    const g = new THREE.Group(), m = mat('#3a3936', 'ghisa'); slab(g, .52, .03, .32, m, 0, .015, 0, .004); put(g, slabG(.44, .02, .24, 0), mat('#121214', 'ghisa'), 0, .02, 0);
    for (let k = 0; k < 10; k++) asta(g, [-.2 + k * .044, .032, -.12], [-.2 + k * .044, .032, .12], .008, m, 4); asta(g, [-.22, .032, 0], [.22, .032, 0], .008, m, 4); return g; };
  // ================= LA CITTÀ VIVA =================
  T.bastone = () => {   // bastone da vecchio: fusto di castagno, manico ricurvo, ghiera d'ottone, puntale di gomma; 92 cm, in piedi sul puntale (userData.presa: dove sta la mano)
    const g = new THREE.Group(), m = mat('#5a3a24', 'legno');
    put(g, cylG(.014, .016, .04, 8), GM, 0, .02, 0); asta(g, [0, .035, 0], [0, .82, 0], .012, m, 8); put(g, cylG(.0145, .0145, .025, 8), OT, 0, .8, 0);
    cavo(g, [[0, .81, 0], [0, .88, .005], [0, .92, .045], [0, .915, .1], [0, .87, .12]], .013, m, 12); put(g, sphG(.0135, 6), m, 0, .87, .12);
    g.userData.presa = [0, .91, .06]; return g; };

  // ================= [roba3d] PORTO, MAGAZZINO, SPIAGGIA E DISCARICA: le scatole che restavano in render.js =================
  // la cassa grande di legno a doghe (90 × 70 × 90): quattro montanti agli spigoli, doghe con le fughe, i chiodi, aperta sopra
  // con la merce: o.merce = 'pesce' (ghiaccio e pesci), 'bottiglie' (in piedi negli scomparti), un colore (frutta a mucchio), niente (il coperchio inchiodato)
  T.cassa = (o) => {
    const g = new THREE.Group(), W = .9, H = .7, D = .9, me = o && o.merce, mL = mat((o && o.col) || '#a88a5c', 'legno'), mS = mat('#6e5434', 'legno');
    const n = 4, h = H / n;
    for (let k = 0; k < n; k++) { const y = h * (k + .5) + .01; slab(g, W - .1, h - .016, .024, mL, 0, y, D / 2 - .012, .004); slab(g, W - .1, h - .016, .024, mL, 0, y, -D / 2 + .012, .004); slab(g, .024, h - .016, D - .1, mL, W / 2 - .012, y, 0, .004); slab(g, .024, h - .016, D - .1, mL, -W / 2 + .012, y, 0, .004); }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .07, H + .02, .07, mS, a * (W / 2 - .035), (H + .02) / 2, b * (D / 2 - .035), .008));
    slab(g, W - .06, .022, D - .06, mS, 0, .03, 0, .004);   // il fondo
    if (F()) for (let k = 0; k < n; k++) [-1, 1].forEach(s => { bullone(g, s * (W / 2 - .06), h * (k + .5), D / 2 + .001, 'z', .006, GH); bullone(g, s * (W / 2 - .06), h * (k + .5), -D / 2 - .001, 'z', .006, GH); });
    if (F()) targa(g, (o && o.scritta) || 'FRAGILE', W * .5, .16, 0, H * .55, D / 2 + .002, 0, (o && o.col) || '#a88a5c', '#2a2622', 0);   // lo stampino della ditta
    if (!me) { for (let k = 0; k < 5; k++) slab(g, .17, .024, D - .02, mL, -W / 2 + .1 + k * .175, H + .022, 0, .004); return g; }
    if (me === 'pesce') {
      put(g, slabG(W - .1, .04, D - .1, .01), mat('#dfe8ee', 'vetro'), 0, H - .06, 0);
      for (let k = 0; k < 8; k++) { const f = put(g, latheG([[.001, 0], [.035, .07], [.045, .2], [.03, .3], [.012, .36], [.001, .37]], 6), mat(k % 2 ? '#9ab0c0' : '#b8c8d0', 'zinco'), -.3 + (k % 4) * .2, H - .035, -.18 + Math.floor(k / 4) * .36); f.rotation.order = 'YXZ'; f.rotation.set(PI / 2, (k % 3 - 1) * .15, 0); f.scale.z = .5; }
      return g; }
    if (me === 'bottiglie') {
      slab(g, W - .1, .02, D - .1, mL, 0, H - .26, 0, 0);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = -.3 + i * .2, z = -.3 + j * .2, mv = mat((i + j) % 2 ? '#2e5a2a' : '#5a3418', 'vetro'); lathe(g, [[.001, 0], [.04, 0], [.042, .2], [.03, .25], [.015, .27], [.015, .33], [.001, .33]], 8, mv, x, H - .25, z); if (F()) put(g, cylG(.017, .017, .02, 6), mat('#c8a040', 'ottone'), x, H + .085, z); }
      return g; }
    // frutta o verdura a mucchio, del colore dato
    const mf = mat(me, 'plastica'), mf2 = mat(me, 'vernice'); let q = 0;
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { const x = -.33 + i * .132, z = -.33 + j * .132, y = H - .07 + Math.sin(i * 1.3 + j) * .02 + (Math.abs(i - 2.5) < 2 && Math.abs(j - 2.5) < 2 ? .04 : 0); put(g, sphG(.07, LV > 0 ? 8 : 6), (q++ % 3) ? mf : mf2, x, y, z); }
    return g; };
  // il fusto di lamiera da 200 l: corpo con le due nervature di rotolamento e gli orli, il coperchio coi due tappi, la targhetta, la ruggine
  T.fusto = (o) => {
    const g = new THREE.Group(), col = (o && o.col) || '#2a5ab8', m = mat(col, 'vernice'), mS = mat('#5a5e60', 'zinco'), R = .29, H = .88;
    lathe(g, [[.001, .006], [R - .01, .006], [R, .02], [R, H - .02], [R - .01, H - .006], [.001, H - .006]], 14, m);
    [.012, H - .012].forEach(y => tor(g, R + .002, .012, 14, mS, 0, y, 0)); [H * .33, H * .67].forEach(y => tor(g, R + .004, .014, 14, m, 0, y, 0));
    put(g, cylG(.03, .03, .025, 8), mS, .14, H, 0); put(g, cylG(.018, .018, .02, 6), mS, -.15, H, .05);
    if (F()) targa(g, (o && o.scritta) || 'OLIO\nMINERALE', .22, .14, 0, H * .5, R + .006, 0, '#e8e4d8', '#2a2a2e', 0);
    if (o && o.ruggine) lathe(g, [[R + .001, .02], [R + .003, .02], [R + .003, .22]], 14, RG);
    if (o && o.coricato) { const r = new THREE.Group(); while (g.children.length) r.add(g.children[0]); r.rotation.z = PI / 2; r.position.set(H / 2, R + .006, 0); g.add(r); }
    return g; };
  // il barile di legno a doghe bombate coi quattro cerchi di ferro
  T.barile = (o) => {
    const g = new THREE.Group(), R0 = .3, R1 = .37, H = .95, m = mat('#7a4e2c', 'legno');
    lathe(g, [[.001, .01], [R0, .01], [R0 + .04, H * .2], [R1, H * .5], [R0 + .04, H * .8], [R0, H - .01], [.001, H - .01]], 12, m);
    [[.07, R0 + .012], [.24, R0 + .052], [H - .24, R0 + .052], [H - .07, R0 + .012]].forEach(([y, r]) => tor(g, r + .006, .012, 12, GH, 0, y, 0));
    put(g, cylG(R0 - .02, R0 - .02, .012, 12), mat('#5a3a20', 'legno'), 0, H - .02, 0); if (F()) put(g, cylG(.03, .03, .03, 6), mat('#5a3a20', 'legno'), 0, H * .5, R1 - .01, PI / 2);
    if (o && o.coricato) { const r = new THREE.Group(); while (g.children.length) r.add(g.children[0]); r.rotation.z = PI / 2; r.position.set(H / 2, R1, 0); g.add(r); }
    return g; };
  // la pila di copertoni: ogni gomma tornita col battistrada e i fianchi, un po' sfalsate
  T.pila_gomme = (o) => {
    const g = new THREE.Group(), n = (o && o.n) || 4, R = .31, Ri = .2, Wd = .2;
    for (let k = 0; k < n; k++) { const x = Math.sin(k * 2.1) * .03, z = Math.cos(k * 1.7) * .03;
      lathe(g, [[Ri, .02], [R - .03, 0], [R, .03], [R + .005, Wd / 2], [R, Wd - .03], [R - .03, Wd], [Ri, Wd - .02], [Ri, .02]], 14, GM, x, k * (Wd + .004), z);
      if (F()) for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; slab(g, .012, Wd * .7, .05, mat('#141416', 'gomma'), x + Math.cos(a) * (R + .004), k * (Wd + .004) + Wd / 2, z + Math.sin(a) * (R + .004), 0, 0, -a, 0); } }
    return g; };
  // il bancale (europallet 120 × 80): tre traversi sotto, nove blocchi, cinque assi sopra; o.carico = sacchi o scatole avvolte e reggiate
  T.bancale = (o) => {
    const g = new THREE.Group(), mL = mat('#b8986a', 'legno'), mS = mat('#8a6e48', 'legno'), W = 1.2, D = .8;
    [-.35, 0, .35].forEach(z => slab(g, W, .022, .1, mL, 0, .011, z, .003));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) slab(g, .1, .078, j === 1 ? .145 : .1, mS, (i - 1) * .55, .061, (j - 1) * .35, .006);
    [-.55, 0, .55].forEach(x => slab(g, .1, .022, D, mL, x, .111, 0, .003));   // i traversi, di traverso alle assi di sopra
    for (let k = 0; k < 5; k++) slab(g, W, .022, k % 2 ? .1 : .145, mL, 0, .133, -.33 + k * .165, .003);
    const c = o && o.carico; if (!c) return g;
    if (c === 'sacchi') { const ms = mat('#c8b890', 'tela'); for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) { const b = put(g, slabG(.55, .14, .36, .05), ms, l % 2 ? (i - .5) * .58 : (i - .5) * .58, .214 + l * .14, l % 2 ? .18 : -.18); b.rotation.y = l % 2 ? .03 : -.03; put(g, slabG(.55, .14, .36, .05), ms, (i - .5) * .58, .214 + l * .14, l % 2 ? -.2 : .2); } return g; }
    const mc = mat((o && o.col) || '#b8905a', 'carta'), mF = mat('#dfe6e8', 'vetro');
    for (let l = 0; l < 3; l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) slab(g, .56, .28, .38, mc, (i - .5) * .58, .284 + l * .29, (j - .5) * .39, .01);
    put(g, slabG(W + .01, .88, D + .01, .02), mF, 0, .58, 0);   // il film
    [-.3, .3].forEach(x => { slab(g, .025, .9, D + .03, mat('#2a4a8a', 'plastica'), x, .59, 0, 0); slab(g, .025, .02, D + .03, mat('#2a4a8a', 'plastica'), x, 1.03, 0, 0); });   // le reggette
    return g; };
  // il lettino da spiaggia: telaio di tubo d'alluminio, seduta e schienale reclinato a listelli di plastica, le rotelle; o.col, o.telo
  T.lettino = (o) => {
    const g = new THREE.Group(), col = (o && o.col) || '#e8e4d8', mP = mat(col, 'plastica'), mA = mat('#c8ccd0', 'zinco'), W = .62, L = 1.25, y = .34;
    [-1, 1].forEach(s => { const x = s * W / 2; asta(g, [x, y, -.25], [x, y, L / 2 + .1], .016, mA, 8); asta(g, [x, y, -.25], [x, .9, -.75], .016, mA, 8); asta(g, [x, y, L / 2], [x, 0, L / 2 + .02], .016, mA, 6); asta(g, [x, y, -.15], [x, .06, -.2], .016, mA, 6); asta(g, [x, .55, -.45], [x, y, -.05], .012, mA, 6); if (F()) put(g, cylG(.05, .05, .03, 10), GM, x, .05, -.22, 0, 0, PI / 2); });
    for (let k = 0; k < 9; k++) slab(g, W - .02, .02, .11, mP, 0, y + .01, -.2 + k * .12, .006);
    for (let k = 0; k < 5; k++) { const t = (k + .5) / 5, p = [0, y + .01 + (.9 - y) * t, -.25 - .5 * t]; slab(g, W - .02, .02, .11, mP, p[0], p[1], p[2], .006, -.83, 0, 0); }
    [-.25, L / 2 + .1].forEach(z => asta(g, [-W / 2, y, z], [W / 2, y, z], .014, mA, 6)); asta(g, [-W / 2, .9, -.75], [W / 2, .9, -.75], .014, mA, 6);
    if (o && o.telo) { const mT = mat(o.telo, 'tela'); slab(g, W - .1, .012, .95, mT, 0, y + .03, .2, 0); slab(g, W - .1, .012, .3, mT, 0, .55, -.43, 0, -.83, 0, 0); }
    return g; };
  // l'ombrellone da spiaggia: palo bianco a due pezzi col giunto inclinato, otto spicchi a strisce alterne con le stecche, la mantovana, il puntale
  T.ombrellone_mare = (o) => {
    const g = new THREE.Group(), ca = mat((o && o.col) || '#d84a4a', 'tela'), cb = mat((o && o.col2) || C.bianco, 'tela'), H = 2.3, R = 1.45, N = 8;
    put(g, cylG(.03, .022, .06, 6), ZS, 0, .03, 0); asta(g, [0, .05, 0], [0, 1.3, 0], .022, BC, 8); put(g, cylG(.032, .032, .08, 8), mat('#6e7270', 'zinco'), 0, 1.32, 0);
    const top = new THREE.Group(); top.position.set(0, 1.35, 0); top.rotation.z = (o && o.incl !== undefined) ? o.incl : .12; g.add(top);
    asta(top, [0, 0, 0], [0, H - 1.35, 0], .02, BC, 8);
    const Hc = H - 1.35 - .05;
    for (let k = 0; k < N; k++) { const a0 = k / N * PI * 2, a1 = (k + 1) / N * PI * 2; const geo = new THREE.BufferGeometry(); const P = [0, Hc + .32, 0, Math.cos(a0) * R, Hc, Math.sin(a0) * R, Math.cos(a1) * R, Hc, Math.sin(a1) * R]; geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals(); const mm = (k % 2 ? cb : ca).clone(); mm.side = THREE.DoubleSide; put(top, geo, mm);
      const fx = (Math.cos(a0) + Math.cos(a1)) / 2 * R, fz = (Math.sin(a0) + Math.sin(a1)) / 2 * R; const mt = put(top, planeG(2 * R * Math.sin(PI / N), .16), mm, fx * .99, Hc - .08, fz * .99, 0, -((a0 + a1) / 2) + PI / 2, 0);
      asta(top, [0, Hc + .3, 0], [Math.cos(a0) * R * .98, Hc + .005, Math.sin(a0) * R * .98], .006, ZS, 4); asta(top, [0, Hc - .35, 0], [Math.cos(a0) * R * .55, Hc + .1, Math.sin(a0) * R * .55], .005, ZS, 4); }
    put(top, sphG(.04, 6), BC, 0, Hc + .34, 0); put(top, cylG(.03, .03, .05, 6), ZS, 0, Hc - .35, 0);
    return g; };
  // il salvagente sul palo: anello a strisce rosse e bianche, la cima avvolta, il gancio
  T.salvagente = () => {
    const g = new THREE.Group(), mW = mat('#f0ece2', 'plastica'), mR = mat('#d83a2a', 'plastica');
    piedeCem(g, .16); asta(g, [0, .05, 0], [0, 1.6, 0], .04, mat('#d8d0c0', 'legno'), 8); slab(g, .5, .1, .06, mat('#d8d0c0', 'legno'), 0, 1.55, .0, .01);
    const R = .3, r = .075, N = 8; for (let k = 0; k < N; k++) { const geo = new THREE.TorusGeometry(R, r, LV > 0 ? 6 : 5, 3, PI * 2 / N); put(g, geo, k % 2 ? mW : mR, 0, 1.18, .1, 0, 0, k / N * PI * 2); }
    cavo(g, [[-.24, 1.38, .12], [-.38, 1.2, .14], [-.3, .95, .14], [0, .86, .13], [.3, .95, .14], [.38, 1.2, .14], [.24, 1.38, .12]], .01, mat('#d8c8a0', 'tela'), 18);
    asta(g, [0, 1.5, .03], [0, 1.5, .1], .01, ZS, 4);
    return g; };
  // il pedalò: due galleggianti affusolati, il ponte, i due sedili a guscio, la ruota a pale nel carter, il manubrio
  T.pedalo = (o) => {
    const g = new THREE.Group(), m = mat((o && o.col) || '#3aa8c8', 'plastica'), mW = mat(C.bianco, 'plastica');
    [-.55, .55].forEach(x => { const p = lathe(g, [[.001, -1.25], [.12, -1.1], [.22, -.7], [.24, 0], [.22, .8], [.12, 1.15], [.001, 1.3]], 12, m, x, .19, 0); p.rotation.x = PI / 2; p.scale.set(1, 1, .8); });
    slab(g, 1.4, .06, 1.6, mW, 0, .4, -.1, .02); [-.32, .32].forEach(x => { slab(g, .46, .06, .45, m, x, .46, -.35, .03); slab(g, .46, .45, .06, m, x, .68, -.58, .03, -.2, 0, 0); });
    slab(g, .2, .45, .9, mW, 0, .62, .45, .05); lathe(g, [[.001, 0], [.36, 0], [.38, .05], [.001, .06]], 14, mW, -.1, .62, .45).rotation.z = PI / 2;
    asta(g, [0, .43, .0], [0, .85, .05], .02, ZS, 6); asta(g, [-.18, .85, .05], [.18, .85, .05], .015, NR, 6);
    if (F()) targa(g, String((o && o.num) || 7), .2, .14, .7, .4, .8, PI / 2, C.bianco, '#2a2a2e', 0);
    return g; };
  // il container da 20 piedi (6 × 2,44 × 2,6): fianchi di lamiera grecata, i quattro angolari di ghisa, le porte con le quattro aste di chiusura, la targa
  T.container = (o) => {
    const g = new THREE.Group(), col = (o && o.col) || '#9a4a2a', m = mat(col, 'vernice'), mS = mat(shade(col, .75), 'vernice'), L = 6, W = 2.44, H = 2.6, t = .05;
    // i fianchi grecati: la lamiera di fondo e le greche in rilievo, una ogni 28 cm
    const N = LV > 0 ? 16 : 8, dz = (L - .3) / N;
    [-1, 1].forEach(sd => { slab(g, .02, H - .24, L - .3, m, sd * (W / 2 - .04), H / 2, 0, 0); for (let i = 0; i < N; i++) slab(g, .045, H - .26, dz * .45, m, sd * (W / 2 - .02), H / 2, -L / 2 + .15 + dz * (i + .5), .008); });
    if (F()) for (let i = 0; i < 8; i++) slab(g, (W - .3) / 8 * .45, H - .26, .04, m, -W / 2 + .15 + (W - .3) / 8 * (i + .5), H / 2, -L / 2 + .03, .008);   // le greche della testata
    slab(g, W - .1, H - .2, .04, m, 0, H / 2, -L / 2 + .06, .01);   // la testata
    slab(g, W, .1, L, mS, 0, H - .05, 0, .01); slab(g, W, .14, L, mS, 0, .07, 0, .01);   // tetto e longheroni
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { slab(g, .16, H, .16, mS, a * (W / 2 - .08), H / 2, b * (L / 2 - .08), .01); [.09, H - .09].forEach(y => slab(g, .18, .12, .18, GH, a * (W / 2 - .08), y, b * (L / 2 - .08), .01)); });
    [-1, 1].forEach(s => slab(g, W / 2 - .12, H - .3, .04, mS, s * (W / 4 - .02), H / 2, L / 2 - .05, .01));   // le due ante
    [-.85, -.35, .35, .85].forEach(x => { asta(g, [x, .2, L / 2 + .01], [x, H - .2, L / 2 + .01], .022, ZS, 6); if (F()) slab(g, .07, .14, .04, ZS, x, 1.2, L / 2 + .03, .006); });
    if (F()) targa(g, (o && o.sigla) || 'TRIU 204417', .9, .22, .55, H - .4, L / 2 - .02, 0, col, '#e8e4d8', 0);
    return g; };
  // il muletto: carrozzeria smussata, contrappeso, tettuccio di protezione sui quattro montanti, il montante con le forche, sedile e volante, ruote tornite
  T.muletto = (o) => {
    const g = new THREE.Group(), m = mat((o && o.col) || '#e0a020', 'vernice'), mK = mat('#2a2a2e', 'ghisa');
    slab(g, 1.1, .55, 1.6, m, 0, .55, -.1, .08); slab(g, 1.12, .5, .45, mK, 0, .62, -.85, .1);   // il corpo e il contrappeso
    [[-.55, .55, .28], [.55, .55, .28], [-.55, -.65, .24], [.55, -.65, .24]].forEach(([x, z, R]) => { lathe(g, [[R * .5, -.1], [R - .02, -.1], [R, 0], [R - .02, .1], [R * .5, .1]], 12, GM, x, R, z).rotation.z = PI / 2; put(g, cylG(R * .5, R * .5, .21, 10), mat('#c8c4b8', 'vernice'), x, R, z, 0, 0, PI / 2); });
    slab(g, .5, .1, .45, NR, 0, .88, -.35, .04); slab(g, .5, .45, .08, NR, 0, 1.1, -.55, .04);   // il sedile
    asta(g, [0, .8, .3], [0, 1.15, .12], .02, NR, 6); tor(g, .16, .016, 14, NR, 0, 1.155, .12, PI / 2 - .5, 0, 0); [0, PI * 2 / 3, PI * 4 / 3].forEach(a => asta(g, [0, 1.155, .12], [Math.cos(a) * .15, 1.155 + Math.sin(a) * .15 * Math.cos(PI / 2 - .5), .12 - Math.sin(a) * .15 * Math.sin(PI / 2 - .5)], .008, NR, 4));
    [[-.5, .4], [.5, .4], [-.5, -.75], [.5, -.75]].forEach(([x, z]) => asta(g, [x, .8, z], [x, 2.15, z * .9], .03, mK, 6)); slab(g, 1.06, .05, 1.2, mK, 0, 2.17, -.15, .01);
    for (let k = 0; k < 5; k++) slab(g, .03, .03, 1.1, mK, -.4 + k * .2, 2.2, -.15, 0);   // la griglia del tettuccio
    [-.35, .35].forEach(x => slab(g, .08, 2.3, .1, mK, x, 1.2, .75, .01)); slab(g, .8, .12, .08, mK, 0, .3, .8, .01); slab(g, .8, .1, .08, mK, 0, 2.3, .78, .01);   // il montante
    slab(g, .8, .5, .04, ZS, 0, .5, .82, .006); [-.25, .25].forEach(x => { slab(g, .1, .5, .05, ZS, x, .5, .86, .006); slab(g, .1, .04, 1.0, ZS, x, .27, 1.34, .006); });   // la piastra porta-forche e le forche, alzate   // le forche
    if (F()) { cavo(g, [[0, 2.3, .74], [0, 1.8, .7], [0, .4, .78]], .008, GH, 6); put(g, sphG(.06, 6), mat('#e88a2a', 'luce'), 0, 2.24, -.1).name = 'luce'; }
    return g; };
  // la gru da banchina: torre a traliccio sui quattro piedi, la cabina, il braccio a traliccio col tirante, il contrappeso, il gancio col cavo
  T.gru = (o) => {
    const g = new THREE.Group(), m = mat((o && o.col) || '#d86a2a', 'vernice'), mG = mat('#5a5a60', 'cemento'), Hs = 8, B = 1.5, r = .07;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { slab(g, .5, .3, .5, mG, a * B, .15, b * B, .02); asta(g, [a * B, .3, b * B], [a * B * .8, Hs, b * B * .8], r, m, 6); });
    for (let k = 0; k < 4; k++) { const y0 = .3 + k * (Hs - .3) / 4, y1 = y0 + (Hs - .3) / 4, k0 = 1 - .2 * (y0 / Hs), k1 = 1 - .2 * (y1 / Hs);
      [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([a, b, c, d]) => { asta(g, [a * B * k0, y0, b * B * k0], [c * B * k1, y1, d * B * k1], r * .5, m, 4); asta(g, [a * B * k1, y1, b * B * k1], [c * B * k1, y1, d * B * k1], r * .55, m, 4); }); }
    const Ht = Hs; slab(g, 2.6, .3, 2.6, m, 0, Ht + .15, 0, .03); slab(g, 1.6, 1.4, 1.6, mat('#e8a040', 'vernice'), .5, Ht + 1, 1.0, .06); put(g, slabG(1.2, .7, .02, 0), VT, .5, Ht + 1.2, 1.81);   // ralla e cabina
    const yb = Ht + .5; for (let k = 0; k < 2; k++) [-.3, .3].forEach(x => asta(g, [x, yb + k * .6, -4], [x, yb + k * .6 * (1 - .9), 13], r * .7, m, 4));
    for (let z = -4; z < 13; z += 1.4) { asta(g, [-.3, yb, z], [.3, yb, z + .7], r * .4, m, 4); asta(g, [.3, yb, z + .7], [-.3, yb, z + 1.4], r * .4, m, 4); asta(g, [-.3, yb + .6 * (1 - .9 * (z + 4) / 17), z], [-.3, yb, z + .7], r * .4, m, 4); }
    asta(g, [0, Ht + .3, 0], [0, Ht + 3, 0], r, m, 6); asta(g, [0, Ht + 3, 0], [0, yb + .1, 12.5], .015, GH, 4); asta(g, [0, Ht + 3, 0], [0, yb + .5, -3.8], .015, GH, 4);
    slab(g, 1.4, 1.4, 1.2, mG, 0, yb - .3, -3.7, .03);   // il contrappeso
    slab(g, .7, .12, .5, mat('#5a5a60', 'zinco'), 0, yb - .05, 11.5, .02); asta(g, [0, yb, 11.5], [0, yb - 5.55, 11.5], .012, GH, 4); slab(g, .4, .3, .3, GL, 0, yb - 5.7, 11.5, .03); put(g, torG(.12, .025, 8), GH, 0, yb - 5.96, 11.5, 0, PI / 2, 0);
    put(g, sphG(.15, 6), mat('#ff3030', 'luce'), 0, Ht + 3.15, 0).name = 'luce'; luci(g, 0, Ht + 3.15, 0, '#ff4040');
    return g; };
  // l'invasatura del cantiere per lo scafo all'asciutto: taccate di legno a croce, i puntelli inclinati e l'impalcatura di tubi coi tavolati
  T.invasatura = (o) => {
    const g = new THREE.Group(), L = (o && o.L) || 11, W = (o && o.W) || 3.4, mL = mat('#6e5434', 'legno'), mA = mat('#9a9aa0', 'zinco'), mT = mat('#b8986a', 'legno');
    for (let z = -L / 2 + 1; z <= L / 2 - 1; z += 2) { for (let l = 0; l < 3; l++) slab(g, l % 2 ? .9 : .3, .2, l % 2 ? .3 : .9, mL, 0, .1 + l * .2, z, .02); [-1, 1].forEach(s => { asta(g, [s * (W / 2 + .6), .1, z], [s * W * .32, 1.6, z], .07, mL, 4); slab(g, .5, .1, .5, mL, s * (W / 2 + .6), .05, z, .01); }); }
    const xs = W / 2 + .9; for (let z = -L / 2; z <= L / 2; z += 2.5) [-1, 1].forEach(s => asta(g, [s * xs, .06, z], [s * xs, 4.8, z], .03, mA, 6));
    [-1, 1].forEach(s => slab(g, .16, .06, L + .2, mL, s * xs, .03, 0, .006)); for (let z = -L / 2 + 1; z <= L / 2 - 1; z += 2) slab(g, 2 * xs, .06, .14, mL, 0, .03, z, .006);   // le travi a terra
    [1.5, 3, 4.5].forEach(h => [-1, 1].forEach(s => asta(g, [s * xs, h, -L / 2], [s * xs, h, L / 2], .03, mA, 6)));
    [-1, 1].forEach(s => slab(g, .9, .05, L, mT, s * (xs - .45), 3.02, 0, .005));
    return g; };
  // il mucchio della discarica: lamiere storte, una portiera, copertoni, tubi, una rete di letto, macerie; o.seme
  T.rottami = (o) => {
    const g = new THREE.Group(), sd = (o && o.seme) || 1; let h = sd * 9301 + 49297; const rn = () => { h = (h * 16807) % 2147483647; return h / 2147483647; };
    const mR = mat('#6e3a22', 'vernice'), mC = [mat('#5a6a7a', 'vernice'), mat('#8a3a2a', 'vernice'), mat('#c8b890', 'vernice')], mM = mat('#7a766c', 'cemento');
    for (let k = 0; k < 7; k++) { const rr = .18 + rn() * .2; put(g, icoG(rr, 0), mM, (rn() - .5) * 1.6, rr * .4, (rn() - .5) * 1.2, rn() * 3, rn() * 3, 0).scale.set(1.2, .55, 1); }
    for (let k = 0; k < 3; k++) slab(g, .9 + rn() * .5, .02, .6 + rn() * .4, k % 2 ? mR : mC[k % 3], (rn() - .5) * .9, .2 + k * .1, (rn() - .5) * .6, 0, (rn() - .5) * .6, rn() * 3, (rn() - .5) * .5);
    slab(g, .95, .7, .08, mC[0], .3, .4, -.2, .03, .2, .7, -.5); if (F()) put(g, slabG(.5, .3, .01, 0), VT, .32, .5, -.15, .2, .7, -.5);   // la portiera col finestrino
    for (let k = 0; k < 2; k++) lathe(g, [[.2, .02], [.23, 0], [.29, 0], [.31, .1], [.29, .2], [.23, .2], [.2, .18]], 12, GM, -.5 + k * .3, .3 * k, .4 - k * .1).rotation.set(k * .7, 0, k * .9);
    for (let k = 0; k < 3; k++) asta(g, [(rn() - .5) * 1.4, .05, (rn() - .5) * 1], [(rn() - .5) * 1.4, .25 + rn() * .3, (rn() - .5) * 1], .03, mat('#7d8288', 'zinco'), 6);
    if (F()) { const x0 = -.2, z0 = .1; for (let i = 0; i < 6; i++) asta(g, [x0 - .5 + i * .2, .5, z0 - .4], [x0 - .5 + i * .2, .2, z0 + .5], .006, GH, 4); asta(g, [x0 - .55, .5, z0 - .4], [x0 + .55, .5, z0 - .4], .012, GH, 4); asta(g, [x0 - .55, .2, z0 + .5], [x0 + .55, .2, z0 + .5], .012, GH, 4); }
    g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g, true); g.children.forEach(c => { c.position.y -= bb.min.y; });   // il mucchio poggia a terra
    return g; };

  // ================= [vasi2] VASI E PIANTE: il verde dipinto dei balconi liguri =================
  // Vasi torniti di cotto col bordo grosso e il sottovaso, smaltati (blu, verde acqua, ocra), bianchi con la fascia dipinta, urne, ciotole a
  // mosaico, cesti di vimini, cassette di legno dipinte, latte e secchi riusati; piante con le foglie vere: poche foglie-pennellata fuse in
  // una geometria per colore (la pagina sopra chiara, il rovescio scuro), gerani, pothos che ricade dal bordo, sansevieria, monstera, cactus,
  // agave, limone, erbe, basilico, ortensie, buganvillea.
  //   T.vaso(o): o.vaso (terracotta | smaltato | dipinto | urna | mosaico | cesto | cassetta | latta | secchio), o.pianta (geranio | pothos |
  //     sansevieria | monstera | cactus | agave | limone | erbe | basilico | ortensia | buganvillea | fico | secco | nessuna), o.s (scala),
  //     o.seed, o.col (il colore del vaso), o.fiore, o.forma (del cotto: classico | basso | alto | pancia), o.su (cassa | sgabello | mattoni).
  //   T.vaso_appeso(o): il macramè col vaso e la pianta che ricade; origine sul gancio, pende in giù (userData.appeso); o.L la calata.
  //   T.fioriera_tetto(o): la fioriera lunga dei giardini sui tetti, o.L (m), o.mat (mattoni | legno), le piante in fila mescolate.
  //   Arredo3D.vasoCaso(rnd, o): la scelta col gusto (metà cotto, il resto smaltati, dipinti, riusati) dal generatore rnd del chiamante.
  // Le geometrie delle piante in cache per (pianta, variante 0..4, misura del vaso, livello): cento gerani ne condividono cinque.
  const rngV = sd => { let h = (Math.abs(sd | 0) * 9301 + 49297) % 2147483647; if (h <= 0) h += 2147483646; return () => { h = (h * 16807) % 2147483647; return h / 2147483647; }; };
  const pkV = (rn, a) => a[Math.floor(rn() * a.length)];
  const mixC = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
  const kR = R => Math.max(.55, Math.min(1.7, R / .18));
  // ---- il pennello: triangoli con la normale della faccia (piegata un po' verso il cielo: le cime prendono la luce) ----
  const vb = () => ({ p: [], n: [], u: [] });
  const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tn = new THREE.Vector3();
  function vTri(B, a, b, c, ua, ub, uc, alza, verso) {
    _ta.subVectors(b, a); _tb.subVectors(c, a); _tn.crossVectors(_ta, _tb); const l = _tn.length(); if (l < 1e-10) return;
    _tn.divideScalar(l); if (verso && _tn.dot(verso) < 0) { const t = b; b = c; c = t; const tu = ub; ub = uc; uc = tu; _tn.negate(); }
    B.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); B.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
    if (PIEGA) for (const q of [a, b, c]) { _bn.subVectors(q, PIEGA.c); if (PIEGA.s) _bn.divide(PIEGA.s); _bn.normalize(); _bn.y += PIEGA.up || 0; _bn.normalize(); B.n.push(_bn.x, _bn.y, _bn.z); }   // [vasi2] la normale dal centro: il fogliame tondo e dipinto, senza faccette
    else { if (alza) { _tn.y += alza; _tn.normalize(); } for (let i = 0; i < 3; i++) B.n.push(_tn.x, _tn.y, _tn.z); }
  }
  // PIEGA = { c, s, up }: mentre c'è, le normali escono dal centro c (diviso per s, l'ellissoide) e salgono un po' (up): il trucco del fogliame stilizzato
  let PIEGA = null; const _bn = new THREE.Vector3();
  const piega = (c, up, f, sc) => { const p0 = PIEGA; PIEGA = { c, up, s: sc }; try { f(); } finally { PIEGA = p0; } };
  function vbGeo(B) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.computeBoundingSphere(); g.computeBoundingBox(); return g; }
  // la sagoma della foglia: mezza larghezza (0..1) lungo la lunghezza t (0 il picciolo, 1 la punta)
  const FORME = {
    ovale: t => Math.pow(Math.sin(PI * t), .75),
    tondo: t => Math.sqrt(Math.sin(PI * t)),   // il geranio: quasi un disco
    cuore: t => Math.sin(PI * Math.pow(t, .6)),              // larga al picciolo: pothos, monstera
    lancia: t => Math.min(1, t * 3) * Math.pow(1 - t, .65),  // agave, erbe
    lama: t => Math.min(1, .55 + t * 2) * Math.pow(1 - t, .5),   // sansevieria: larga quasi da subito
  };
  const _fM = new THREE.Matrix4(), _fQ = new THREE.Quaternion(), _fE = new THREE.Euler(), _fP = new THREE.Vector3(), _f1 = new THREE.Vector3(1, 1, 1);
  // una foglia: picciolo in (x, y, z), verso a (0 = +x, π/2 = +z), alzata e sull'orizzonte, lunga L, larga W; la pagina in T, il rovescio in S.
  // o.n segmenti lungo la nervatura, o.cade (la punta che pende), o.coppa (i bordi che scendono: la nervatura fa il colmo), o.rot, o.lobi
  function foglia(T, S, x, y, z, a, e, L, W, o) {
    o = o || {}; const n = o.n || 2, f = FORME[o.f || 'ovale'], cade = o.cade || 0, cop = o.coppa === undefined ? .3 : o.coppa, al = o.alza === undefined ? .45 : o.alza;
    _fE.set(o.rot || 0, -a, e, 'YZX'); _fQ.setFromEuler(_fE); _fM.compose(_fP.set(x, y, z), _fQ, _f1);
    const m = [], l = [], r = [], t = [];
    for (let i = 0; i <= n; i++) { const ti = i / n, dy = -cade * ti * ti * L; let w = f(ti) * W / 2; if (o.lobi && i > 0 && i < n && i % 2 === 0) w *= o.lobi;
      t.push(ti); m.push(V3(ti * L, dy, 0).applyMatrix4(_fM)); l.push(V3(ti * L, dy - cop * w, -w).applyMatrix4(_fM)); r.push(V3(ti * L, dy - cop * w, w).applyMatrix4(_fM)); }
    for (let i = 0; i < n; i++) { const A = [.5, t[i]], B = [.5, t[i + 1]], R0 = [1, t[i]], R1 = [1, t[i + 1]], L0 = [0, t[i]], L1 = [0, t[i + 1]];
      vTri(T, m[i], r[i], m[i + 1], A, R0, B, al); vTri(T, m[i + 1], r[i], r[i + 1], B, R0, R1, al);
      vTri(T, m[i], m[i + 1], l[i], A, B, L0, al); vTri(T, m[i + 1], l[i + 1], l[i], B, L1, L0, al); }
    if (S) for (let i = 0; i < n; i++) { vTri(S, m[0], r[i + 1], r[i], [.5, 0], [1, t[i + 1]], [1, t[i]]); vTri(S, m[0], l[i], l[i + 1], [.5, 0], [0, t[i]], [0, t[i + 1]]); }
  }
  // il gambo: un prisma a tre facce da a a b (picciolo, tralcio, ramo, tronco)
  function stelo(B, a, b, r0, r1) {
    const A = V3(a[0], a[1], a[2]), Bv = V3(b[0], b[1], b[2]), d = Bv.clone().sub(A); if (d.lengthSq() < 1e-8) return; d.normalize();
    const u = (Math.abs(d.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(d).normalize(), v = d.clone().cross(u), pa = [], pb = [], dir = [];
    for (let k = 0; k < 3; k++) { const an = k * 2 * PI / 3, o = u.clone().multiplyScalar(Math.cos(an)).addScaledVector(v, Math.sin(an)); dir.push(o); pa.push(A.clone().addScaledVector(o, r0)); pb.push(Bv.clone().addScaledVector(o, r1 === undefined ? r0 : r1)); }
    for (let k = 0; k < 3; k++) { const j = (k + 1) % 3, out = dir[k].clone().add(dir[j]); vTri(B, pa[k], pa[j], pb[j], [0, 0], [1, 0], [1, 1], 0, out); vTri(B, pa[k], pb[j], pb[k], [0, 0], [1, 1], [0, 1], 0, out); }
  }
  // la zolla bitorzoluta (chioma, cuscino d'erbe, testa d'ortensia, limone): una sfera bassa coi bozzi, a facce
  const hh3 = (x, y, z) => { const s = Math.sin(Math.round(x * 1e3) * 12.9898 + Math.round(y * 1e3) * 78.233 + Math.round(z * 1e3) * 37.719) * 43758.5453; return s - Math.floor(s); };
  function palla(B, x, y, z, rx, ry, rz, ws, hs, bozzi, piatta, alza) {
    const s = new THREE.SphereGeometry(1, ws, hs).toNonIndexed(), P = s.attributes.position, c = V3(x, y, z), vv = [], uu = [];
    for (let i = 0; i < P.count; i++) { const X = P.getX(i), Y = P.getY(i), Z = P.getZ(i), k = 1 + (bozzi === undefined ? .2 : bozzi) * (hh3(X + x * 7, Y + y * 3, Z + z * 5) - .5) * 2;
      vv.push(V3(X * rx * k + x, Math.max(Y, piatta === undefined ? -1 : piatta) * ry * k + y, Z * rz * k + z)); uu.push([(X + 1) / 2, (Y + 1) / 2]); }
    piega(c, alza || 0, () => { for (let i = 0; i < vv.length; i += 3) vTri(B, vv[i], vv[i + 1], vv[i + 2], uu[i], uu[i + 1], uu[i + 2], 0, vv[i].clone().add(vv[i + 1]).add(vv[i + 2]).divideScalar(3).sub(c)); }, V3(rx, ry, rz));   // liscia: le normali dell'ellissoide
    s.dispose();
  }
  // la pennellata di colore: un rombo appena a coppa che guarda verso nrm (fiorellini, brattee)
  function petalo(B, c, nrm, s, rot) {
    const nn = nrm.clone().normalize(), u = (Math.abs(nn.y) < .95 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(nn).normalize(), v = nn.clone().cross(u);
    if (rot) { u.applyAxisAngle(nn, rot); v.applyAxisAngle(nn, rot); }
    const p0 = c.clone().addScaledVector(u, -s).addScaledVector(nn, -s * .25), p1 = c.clone().addScaledVector(v, -s * .75), p2 = c.clone().addScaledVector(u, s).addScaledVector(nn, -s * .25), p3 = c.clone().addScaledVector(v, s * .75);
    vTri(B, p0, p1, p2, [0, .5], [.5, 0], [1, .5], .3, nn); vTri(B, p0, p2, p3, [0, .5], [1, .5], [.5, 1], .3, nn);
  }
  // il mazzetto a cupola (l'ombrella del geranio, il grappolo della buganvillea): una pennellata in cima e k attorno
  function ombrella(B, x, y, z, r, k, rn) {   // i petali attorno a una pallina: le normali dal centro, il mazzetto è tondo
    const c = V3(x, y, z); piega(c.clone().add(V3(0, -r * .3, 0)), .25, () => { petalo(B, c.clone().add(V3(0, r * .35, 0)), V3(0, 1, 0), r * .55, rn() * 3);
      for (let i = 0; i < k; i++) { const ph = i / k * 2 * PI + rn() * .5, th = .8 + rn() * .5, d = V3(Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); petalo(B, c.clone().addScaledVector(d, r * .6), d, r * .5, rn() * 3); } });
  }
  // il fusto a coste del cactus: anelli di 2·coste punti (costa e solco) lungo l'asse dir, prof = [[t, k del raggio], ...], la punta tonda
  function colonna(B, base, dir, R, H, coste, prof) {
    const d = dir.clone().normalize(), u = (Math.abs(d.y) < .9 ? V3(0, 1, 0) : V3(1, 0, 0)).cross(d).normalize(), v = d.clone().cross(u), N = coste * 2, R2 = [];
    prof.forEach(([t, k]) => { const c = base.clone().addScaledVector(d, t * H), ring = []; for (let i = 0; i < N; i++) { const an = i / N * 2 * PI, rr = R * k * (i % 2 ? .78 : 1); ring.push(c.clone().addScaledVector(u, Math.cos(an) * rr).addScaledVector(v, Math.sin(an) * rr)); } R2.push({ c, ring }); });
    for (let j = 0; j < R2.length - 1; j++) { const cm = R2[j].c.clone().add(R2[j + 1].c).multiplyScalar(.5), v0 = j / R2.length, v1 = (j + 1) / R2.length;
      for (let i = 0; i < N; i++) { const i2 = (i + 1) % N, a = R2[j].ring[i], b = R2[j].ring[i2], c2 = R2[j + 1].ring[i2], e = R2[j + 1].ring[i], out = a.clone().add(c2).multiplyScalar(.5).sub(cm);
        vTri(B, a, b, c2, [i / N, v0], [(i + 1) / N, v0], [(i + 1) / N, v1], .15, out); vTri(B, a, c2, e, [i / N, v0], [(i + 1) / N, v1], [i / N, v1], .15, out); } }
    const Lr = R2[R2.length - 1], top = Lr.c.clone().addScaledVector(d, R * .12); for (let i = 0; i < N; i++) vTri(B, Lr.ring[i], Lr.ring[(i + 1) % N], top, [0, 0], [1, 0], [.5, 1], .2, d);
  }
  // ---- le piante: ognuna disegna nei pennelli T (pagina), T2 (pagina, secondo verde), S (rovescio e gambi), F (fiori e frutti), L (legno) ----
  // V: R il raggio della terra, Rr quello dell'orlo, Hs l'altezza della terra sul fondo del vaso, rimY l'orlo sopra la terra, giu quanto ricade, arco i versi dei tralci
  const PIANTE = {
    geranio: { c: ['#5a9a40', '#3f7c34', '#2c5a28'], fiori: ['#d8283a', '#e8507a', '#f2eee4', '#c81e30', '#f07a9a', '#e0344a'], f(P, V, rn, lv) {
      const k = kR(V.R), nL = lv ? 6 : 5, nF = 3 + Math.floor(rn() * (lv ? 2 : 1));
      palla(P.T2, 0, .03 * k, 0, V.R * .8, .07 * k, V.R * .8, 6, 3, .15, -.6, .35);   // il cuore liscio della rosetta
      piega(V3(0, -.03 * k, 0), .5, () => { for (let i = 0; i < nL; i++) { const a = (i + rn() * .5) / nL * 2 * PI, d = V.R * (.15 + .35 * rn()), Lf = (.115 + rn() * .04) * k;   // le foglie tonde smerlate, basse, a raggiera
        foglia(i % 2 ? P.T : P.T2, P.S, Math.cos(a) * d, (.05 + rn() * .04) * k, Math.sin(a) * d, a, .12 + rn() * .3, Lf, Lf * 1.1, { f: 'tondo', n: lv ? 3 : 2, lobi: .78, cade: .3, coppa: .15 }); } });
      for (let i = 0; i < nF; i++) { const a = i * 2.1 + rn(), d = V.R * (.1 + .45 * rn()), x = Math.cos(a) * d, z = Math.sin(a) * d, y = (.22 + rn() * .08) * k; stelo(P.S, [x * .4, .05 * k, z * .4], [x, y + .012, z], .005, .0035); ombrella(P.F, x, y, z, .06 * k, lv ? 5 : 4, rn); }
    } },
    pothos: { c: ['#64a844', '#4a9036', '#336a2c'], f(P, V, rn, lv, sv) {
      const k = kR(V.R), ns = lv ? 3 + sv % 2 : 2, giu = V.giu || V.Hs * (.55 + rn() * .35), fondo = V.giu ? 9 : V.Hs - .05, rim = V.rimY || .02;
      palla(P.T2, 0, .03 * k, 0, V.R * .82, .06 * k, V.R * .82, lv ? 6 : 5, 4, .3, -.7, .35);
      for (let i = 0; i < (lv ? 5 : 3); i++) { const a = i * 2.4 + rn(), d = V.R * .3 * rn(); foglia(P.T, P.S, Math.cos(a) * d, .06 * k, Math.sin(a) * d, a, .45 + rn() * .4, .11 * k, .09 * k, { f: 'cuore', cade: .5, coppa: .15 }); }
      for (let s = 0; s < ns; s++) {
        const a = V.arco ? V.arco[0] + (V.arco[1] - V.arco[0]) * (s + .2 + rn() * .6) / ns : s / ns * 2 * PI + rn() * .8, len = Math.min(fondo, giu * (.45 + rn() * .75)), sw = (rn() - .5) * .5;
        const path = [[V.R * .45, .04, 0], [V.Rr + .012, rim + .03, .03], [V.Rr + .05, rim - .07, .08], [V.Rr + .07, -len * .5, .18 + sw * .5], [V.Rr + .09, -len, .26 + sw]].map(([q, y, da]) => [Math.cos(a + da * sw * 2) * q, y, Math.sin(a + da * sw * 2) * q]);
        if (lv) for (let j = 0; j < path.length - 1; j++) stelo(P.S, path[j], path[j + 1], .0045);
        let side = 1; for (let j = 1; j < path.length - 1; j++) { const A = path[j], B = path[j + 1], nseg = Math.max(1, Math.round(Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) / (lv ? .095 : .14)));
          for (let q = 0; q < nseg; q++) { const t = (q + .5) / nseg, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t, z = A[2] + (B[2] - A[2]) * t; side = -side;
            const Lf = (.075 + rn() * .03) * k * (1 - t * .15); foglia(side > 0 ? P.T : P.T2, P.S, x, y, z, a + side * (.8 + rn() * .6), -.25 + rn() * .55, Lf, Lf * .82, { f: 'cuore', cade: .35, coppa: .15 }); } }
      }
    } },
    sansevieria: { c: ['#3a6e3a', '#5e8e3c', '#2c4e2e'], f(P, V, rn, lv) {
      const k = kR(V.R), n = lv ? 8 : 5;
      for (let i = 0; i < n; i++) { const a = i * 2.4 + rn(), d = V.R * .35 * rn(), Lf = (.36 + rn() * .24) * k * (i ? 1 : 1.15), out = i > n * .6; foglia(i % 2 ? P.T : P.T2, P.S, Math.cos(a) * d, -.01, Math.sin(a) * d, a, out ? 1.05 + rn() * .2 : 1.28 + rn() * .22, Lf, (.06 + rn() * .025) * k, { f: 'lama', n: lv ? 3 : 2, coppa: .45, rot: rn() * 1.2 - .6, cade: -.04, alza: .25 }); }
    } },
    monstera: { c: ['#2f7a3e', '#3f8a44', '#24502c'], f(P, V, rn, lv) {
      const k = kR(V.R) * 1.1, n = lv ? 6 : 4;
      for (let i = 0; i < n; i++) { const a = i * 2.4 + rn() * .5, el = .75 + rn() * .5, pl = (.2 + rn() * .2) * k, tip = [Math.cos(a) * Math.cos(el) * pl, Math.sin(el) * pl, Math.sin(a) * Math.cos(el) * pl];
        stelo(P.S, [Math.cos(a) * .02, -.005, Math.sin(a) * .02], tip, .009 * k, .006 * k);
        const Lf = (.2 + rn() * .1) * k; foglia(i % 2 ? P.T : P.T2, P.S, tip[0], tip[1], tip[2], a + (rn() - .5) * .4, -.05 + rn() * .35, Lf, Lf * .95, { f: 'cuore', n: lv ? 6 : 4, lobi: lv ? .6 : .75, cade: .35, coppa: .12 }); }
    } },
    cactus: { c: ['#5a9a4a', '#4a8a44', '#3a6a34'], fiori: ['#e85a8a', '#f0c040', '#e8608a', '#f08a3a'], f(P, V, rn, lv, sv) {
      const k = kR(V.R), cs = lv ? 6 : 4;
      if (sv % 2 === 0) {   // la colonna con un braccio o due
        const H = (.34 + rn() * .2) * k, R0 = .062 * k, d0 = V3((rn() - .5) * .15, 1, (rn() - .5) * .15).normalize(); colonna(P.T, V3(0, -.01, 0), d0, R0, H, cs, [[0, .95], [.7, 1], [.92, .78], [1, .38]]);
        for (let i = 0, na = lv && rn() < .6 ? 2 : 1; i < na; i++) { const b = i * PI + rn() * 1.5, h0 = H * (.35 + rn() * .25), ca = Math.cos(b), sa = Math.sin(b), st = V3(ca * R0 * .6 + d0.x * h0, h0, sa * R0 * .6 + d0.z * h0), r1 = R0 * .62, l1 = (.09 + rn() * .04) * k;
          colonna(P.T2, st, V3(ca, .55, sa), r1, l1, 4, [[0, .9], [1, 1]]); const e = st.clone().add(V3(ca, .55, sa).normalize().multiplyScalar(l1)); colonna(P.T2, e.clone().add(V3(0, -r1 * .5, 0)), V3(0, 1, 0), r1, (.11 + rn() * .08) * k, 4, [[0, 1], [1, .6]]); }
        if (rn() < .5) ombrella(P.F, d0.x * H, H + R0 * .1, d0.z * H, .03 * k, 4, rn);
      } else {   // i barili tondi raccolti
        for (let i = 0, nb = 2 + Math.floor(rn() * 2); i < nb; i++) { const a = i * 2.2 + rn(), d = i ? V.R * (.4 + rn() * .25) : 0, Rb = (i ? .06 + rn() * .02 : .09) * k, H = Rb * 1.6;
          colonna(i % 2 ? P.T2 : P.T, V3(Math.cos(a) * d, -.01, Math.sin(a) * d), V3(0, 1, 0), Rb, H, cs, [[0, .8], [.45, 1], [1, .5]]); if (lv && rn() < .6) ombrella(P.F, Math.cos(a) * d, H + Rb * .05, Math.sin(a) * d, .024 * k, 3, rn); }
      }
    } },
    agave: { c: ['#7aa890', '#6a9a84', '#557a68'], f(P, V, rn, lv) {
      const k = kR(V.R) * 1.15, n = lv ? 13 : 8;
      for (let i = 0; i < n; i++) { const inner = i > n * .62, a = i * 2.4 + rn() * .3; foglia(i % 2 ? P.T : P.T2, P.S, Math.cos(a) * .02, .005, Math.sin(a) * .02, a, inner ? 1.0 + rn() * .4 : .3 + rn() * .5, (inner ? .2 : .26 + rn() * .1) * k, .08 * k, { f: 'lancia', coppa: .55, cade: inner ? 0 : .35 }); }
    } },
    limone: { c: ['#4f8f3c', '#2f6a30', '#24502a', '#6a5038'], fiori: ['#f0c828'], f(P, V, rn, lv) {
      const k = kR(V.R) * .9, h = .58 * k; stelo(P.L, [0, -.01, 0], [.02 * k, h * .55, .01], .024 * k, .018 * k); stelo(P.L, [.02 * k, h * .55, .01], [-.01, h, 0], .018 * k, .012 * k);
      const C = [[0, h + .14 * k, 0, .24 * k, .19 * k], [.13 * k, h + .05 * k, .09 * k, .15 * k, .12 * k], [-.13 * k, h + .08 * k, -.07 * k, .15 * k, .12 * k]];
      C.forEach(([x, y, z, rr, ry], i) => { if (lv || !i) palla(P.T2, x, y, z, rr, ry, rr, lv ? 7 : 6, lv ? 5 : 4, .14, undefined, .35); });
      for (let i = 0, nl = lv ? 22 : 10; i < nl; i++) { const ph = rn() * 2 * PI, th = .2 + rn() * 1.6, [x, y, z, rr, ry] = C[i % C.length], d = V3(Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)), b = V3(x + d.x * rr * .85, y + d.y * ry * .85, z + d.z * rr * .85);
        piega(V3(x, y, z), .3, () => foglia(P.T, P.S, b.x, b.y, b.z, ph, .6 - th * .5, .1 * k, .048 * k, { cade: .3, coppa: .25 })); }
      for (let i = 0, nf = lv ? 5 : 4; i < nf; i++) { const ph = i * 2.3 + rn(), th = 1.3 + rn() * .5, [x, y, z, rr, ry] = C[i % 2 ? 0 : (i % 3)]; palla(P.F, x + Math.cos(ph) * Math.sin(th) * rr * .98, y + Math.cos(th) * ry * .98, z + Math.sin(ph) * Math.sin(th) * rr * .98, .03 * k, .038 * k, .03 * k, lv ? 6 : 5, lv ? 4 : 3, .03, undefined, .2); }
    } },
    erbe: { c: ['#6e9a5a', '#58805a', '#46644a'], fiori: ['#9a88d0', '#b0a0e0', '#e8e4f0', '#8a78c8'], f(P, V, rn, lv) {
      const k = kR(V.R); palla(P.S, 0, .01, 0, V.R * .9, .11 * k, V.R * .9, lv ? 7 : 5, 4, .32, -.1, .35);
      for (let i = 0, n = lv ? 11 : 6; i < n; i++) { const a = i * 2.4 + rn(), d = V.R * .45 * rn(), Lf = (.18 + rn() * .12) * k, e = .9 + rn() * .5; foglia(i % 2 ? P.T : P.T2, null, Math.cos(a) * d, .04 * k, Math.sin(a) * d, a, e, Lf, .04 * k, { f: 'lancia', coppa: .5, cade: .12, alza: .3 });
        if (i % 2 === 0) { const tip = Lf * .95; ombrella(P.F, Math.cos(a) * (d + Math.cos(e) * tip), .04 * k + Math.sin(e) * tip, Math.sin(a) * (d + Math.cos(e) * tip), .018 * k, 2, rn); } }
    } },
    basilico: { c: ['#6abd40', '#55a536', '#3c7a2c'], f(P, V, rn, lv) {
      const k = kR(V.R); palla(P.T2, 0, .03 * k, 0, V.R * .88, .12 * k, V.R * .88, lv ? 7 : 5, 4, .3, -.2, .4);
      piega(V3(0, 0, 0), .4, () => { for (let i = 0, n = lv ? 12 : 6; i < n; i++) { const a = i * 2.4 + rn(), d = V.R * (.2 + .5 * rn()), Lf = (.075 + rn() * .025) * k; foglia(P.T, P.S, Math.cos(a) * d, (.08 + rn() * .06) * k, Math.sin(a) * d, a, .35 + rn() * .45, Lf, Lf * .7, { coppa: .45, cade: .25 }); } });
    } },
    ortensia: { c: ['#4f8f3c', '#3e7a36', '#2c5a2c'], fiori: ['#6a8ad8', '#e08ab8', '#a88ad8', '#e8e8f2', '#7ab0e0', '#d070a0'], f(P, V, rn, lv) {
      const k = kR(V.R); palla(P.T2, 0, .04 * k, 0, V.R * .9, .09 * k, V.R * .9, lv ? 7 : 5, 4, .15, -.6, .35);
      piega(V3(0, 0, 0), .4, () => { for (let i = 0, n = lv ? 8 : 5; i < n; i++) { const a = i * 2.4 + rn(), d = V.R * .55, Lf = (.14 + rn() * .04) * k; foglia(i % 2 ? P.T : P.T2, P.S, Math.cos(a) * d, (.06 + rn() * .05) * k, Math.sin(a) * d, a, .15 + rn() * .3, Lf, Lf * .62, { cade: .3, coppa: .25 }); } });
      for (let i = 0, n = (lv ? 3 : 2) + (V.R > .2 ? 1 : 0); i < n; i++) { const a = i * 2.1 + rn() * .8, d = V.R * (.15 + .35 * rn()), x = Math.cos(a) * d, z = Math.sin(a) * d, y = (.17 + rn() * .07) * k;
        stelo(P.S, [x * .3, .04, z * .3], [x, y - .03 * k, z], .007 * k); palla(P.F, x, y, z, .095 * k, .08 * k, .095 * k, lv ? 7 : 5, lv ? 5 : 4, .14, -.45, .3); }
    } },
    buganvillea: { c: ['#4f8f3c', '#3c7834', '#2c5a28'], fiori: ['#d0307a', '#e04a9a', '#c82a6a', '#e86aa8'], f(P, V, rn, lv) {
      const k = kR(V.R), cz = V3(0, .065 * k, 0); palla(P.T2, 0, .065 * k, 0, V.R * .98, .17 * k, V.R * .98, lv ? 7 : 5, 4, .15, -.45, .35);
      for (let i = 0, n = lv ? 8 : 4; i < n; i++) { const ph = i * 2.4 + rn(), th = .3 + rn() * 1.0, d = V3(Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); ombrella(P.F, d.x * V.R * .9, .08 * k + d.y * .17 * k, d.z * V.R * .9, .058 * k, lv ? 4 : 3, rn); }
      piega(cz, .35, () => { for (let i = 0, n = lv ? 12 : 5; i < n; i++) { const ph = i * 2.4 + 1 + rn(), th = .3 + rn() * 1.1, d = V3(Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); foglia(i % 2 ? P.T : P.T2, P.S, d.x * V.R * .85, .065 * k + d.y * .15 * k, d.z * V.R * .85, ph, .55 - th * .4, .085 * k, .05 * k, { cade: .3 }); } });   // le foglie che escono dalla zolla
      for (let s = 0, ns = lv ? 2 : 1; s < ns; s++) { const a = V.arco ? (V.arco[0] + V.arco[1]) / 2 + (s - .5) * .8 : s * PI + rn() * 2, giu = Math.min(V.giu ? 9 : V.Hs - .06, (V.giu || V.Hs) * (.4 + rn() * .4));   // il ramo che ricade dal bordo
        const p0 = [Math.cos(a) * V.R * .7, .08 * k, Math.sin(a) * V.R * .7], p1 = [Math.cos(a) * (V.Rr + .04), (V.rimY || .02) - .02, Math.sin(a) * (V.Rr + .04)], p2 = [Math.cos(a) * (V.Rr + .08), -giu, Math.sin(a) * (V.Rr + .08)];
        stelo(P.L, p0, p1, .006); stelo(P.L, p1, p2, .005); ombrella(P.F, p1[0], p1[1] - .02, p1[2], .045 * k, lv ? 4 : 3, rn); ombrella(P.F, p2[0], p2[1], p2[2], .045 * k, lv ? 4 : 3, rn); foglia(P.T, P.S, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2, a, 0, .07 * k, .042 * k, { cade: .3 }); }
    } },
    fico: { c: ['#2f5e34', '#3a6c3a', '#5a7a48', '#5a4a34'], f(P, V, rn, lv) {
      const k = kR(V.R), h = (.5 + rn() * .14) * k; stelo(P.L, [0, -.01, 0], [.01, h, 0], .013 * k, .008 * k);
      for (let i = 0, n = lv ? 8 : 5; i < n; i++) { const t = (i + 1) / (n + 1), a = i * 2.4 + rn() * .4, Lf = (.16 + rn() * .05) * k * (1 - t * .3); foglia(i % 2 ? P.T : P.T2, P.S, .01 * t, h * (.12 + t * .88), 0, a, .15 + t * .4, Lf, Lf * .52, { n: lv ? 3 : 2, cade: .25, coppa: .15 }); }
      foglia(P.T2, P.S, .01, h, 0, rn() * 6, 1.35, .09 * k, .022 * k, { f: 'lancia', coppa: .6 });   // la gemma arrotolata in cima
    } },
    secco: { c: ['#8a7442', '#6e5c38', '#5a4a30', '#5a4632'], f(P, V, rn, lv) {
      const k = kR(V.R);
      for (let i = 0, n = lv ? 6 : 4; i < n; i++) { const a = i * 1.7 + rn(), d = V.R * .25 * rn(), h = (.2 + rn() * .22) * k, x0 = Math.cos(a) * d, z0 = Math.sin(a) * d, x1 = x0 + Math.cos(a) * h * .3, z1 = z0 + Math.sin(a) * h * .3;
        stelo(P.L, [x0, -.01, z0], [x1, h, z1], .006, .003); if (i % 2 === 0) foglia(P.T, P.S, x1 * .8, h * .7, z1 * .8, a + 1, -.6, .06 * k, .032 * k, { cade: .8, coppa: .5 }); }
    } },
  };
  const ALIAS_P = { ciuffo: 'erbe', cespo: 'ortensia', palma: 'monstera', rosmarino: 'erbe', lavanda: 'erbe', geranium: 'geranio', limoni: 'limone', none: 'nessuna', niente: 'nessuna' };
  const PCV = {};
  function piantaGeo(kind, sv, V) {
    const key = kind + '|' + sv + '|' + [V.R, V.Rr, V.Hs, V.rimY || 0, V.giu || 0].map(q3).join(',') + (V.arco ? '|' + V.arco.map(q3).join(',') : '') + '|' + LV;
    if (PCV[key]) return PCV[key];
    const P = { T: vb(), T2: vb(), S: vb(), F: vb(), L: vb() }; PIANTE[kind].f(P, V, rngV(sv * 131 + kind.length * 17 + 5), LV > 0, sv);
    const out = {}; for (const r of ['T', 'T2', 'S', 'F', 'L']) if (P[r].p.length) out[r] = vbGeo(P[r]);
    return (PCV[key] = out);
  }
  // la pianta nel gruppo g: la terra in (x, y, z), girata di ry (la stessa geometria, cento verse diverse); fiore: il colore dei fiori
  function piantaIn(g, kind, sv, V, x, y, z, ry, fiore, sd) {
    kind = ALIAS_P[kind] || kind; const D = PIANTE[kind]; if (!D) return;
    const G = piantaGeo(kind, sv, V), col = { T: D.c[0], T2: D.c[1], S: D.c[2], L: D.c[3] || '#6a5038', F: fiore || (D.fiori ? D.fiori[((sd || 0) >>> 3) % D.fiori.length] : '#e0e0d0') };
    for (const r in G) { const m = put(g, G[r], mat(col[r], r === 'F' ? 'fiore' : r === 'L' ? 'legno' : 'foglia'), x, y, z, 0, ry || 0, 0); m.name = r === 'F' ? 'fiori' : 'pianta'; }
  }
  // ---- i vasi: ognuno si costruisce in g col fondo a y0 e dice dove sta la terra ----
  const TERRA = mat('#3e2c20', 'pietra');
  const terraV = (g, R, y) => lathe(g, [[R, -.004], [.001, .008]], 12, TERRA, 0, y, 0);
  const COTTO = ['#b4603e', '#a8583a', '#c06e48', '#9a5236', '#b9734f', '#a4624a', '#c27650'];
  const FT = {
    classico: { p: [[.13, .012], [.185, .232], [.207, .24], [.214, .296], [.196, .305], [.18, .272]], R: .18, Hs: .272, Rr: .214, top: .305, sc: [.13, .228] },
    basso: { p: [[.155, .012], [.222, .148], [.238, .156], [.242, .19], [.226, .198], [.214, .172]], R: .214, Hs: .172, Rr: .242, top: .198, sc: [.155, .255] },
    alto: { p: [[.105, .012], [.16, .33], [.178, .338], [.183, .392], [.166, .4], [.155, .37]], R: .155, Hs: .37, Rr: .183, top: .4, sc: [.105, .2] },
    pancia: { p: [[.12, .012], [.185, .085], [.205, .19], [.182, .262], [.206, .27], [.214, .306], [.196, .313], [.178, .288]], R: .178, Hs: .288, Rr: .214, top: .313, sc: [.12, .21] },
  };
  const sposta = (p, dy) => p.map(([r, y]) => [r, y + dy]);
  const VG = {
    terracotta(g, y0, o, rn) {   // il cotto tornito: piede, pancia, il bordo grosso arrotondato, il sottovaso
      const F = FT[o.forma] || FT[pkV(rn, ['classico', 'classico', 'basso', 'alto', 'pancia'])], c0 = o.col || pkV(rn, COTTO), col = rn() < .2 ? mixC(c0, '#d8ccb8', .35) : c0, dy = o.senzaPiatto ? -.012 : 0;   // uno su cinque col bianco del calcare
      lathe(g, sposta(F.p, dy), 16, mat(col, 'cotto'), 0, y0, 0);
      if (!o.senzaPiatto) { const [rf, rr] = F.sc; lathe(g, [[rr * .96, 0], [rr, .034], [rf, .012]], 12, mat(shade(col, .9), 'cotto'), 0, y0, 0); }
      terraV(g, F.R, y0 + F.Hs + dy); return { R: F.R, Rr: F.Rr, Hs: F.Hs + dy, rimY: F.top - F.Hs, H: F.top + dy }; },
    smaltato(g, y0, o, rn) {   // la ceramica smaltata a pancia tonda, il piede di cotto nudo
      const col = o.col || pkV(rn, ['#2f5f9e', '#2a8a88', '#c8962e', '#3f7a4a', '#e6dcc4', '#8a3a3a', '#4a78b8', '#d8b048', '#2e6e6a']), m = mat(col, 'smalto');
      lathe(g, [[.13, 0], [.13, .024]], 16, mat('#b88a6a', 'cotto'), 0, y0, 0);
      lathe(g, [[.125, .02], [.18, .055], [.212, .15], [.2, .25], [.18, .29], [.19, .302], [.166, .284]], 16, m, 0, y0, 0);
      terraV(g, .166, y0 + .284); return { R: .166, Rr: .19, Hs: .284, rimY: .02, H: .302 }; },
    dipinto(g, y0, o, rn) {   // bianco, con le fasce dipinte a mano
      const body = pkV(rn, ['#ece4d2', '#e8dcc0', '#f0ece2']), band = o.col || pkV(rn, ['#2f5fa0', '#2a8a7a', '#c8902a', '#b8402e', '#3a6ab0']), mb = mat(band, 'smalto');
      lathe(g, [[.15, 0], [.152, .012], [.19, .26], [.206, .266], [.206, .292], [.19, .296], [.18, .272]], 16, mat(body, 'smalto'), 0, y0, 0);
      lathe(g, [[.1716, .13], [.1809, .19]], 16, mb, 0, y0, 0); lathe(g, [[.2078, .268], [.2078, .29]], 16, mb, 0, y0, 0);
      terraV(g, .18, y0 + .272); return { R: .18, Rr: .206, Hs: .272, rimY: .024, H: .296 }; },
    urna(g, y0, o, rn) {   // l'urna sul piede, il collo, le due anse
      const col = o.col || pkV(rn, COTTO.concat(['#c8bca6', '#bcae96'])), m = mat(col, col === '#c8bca6' || col === '#bcae96' ? 'pietra' : 'cotto');
      lathe(g, [[.12, 0], [.12, .03], [.085, .055], [.2, .18], [.205, .28], [.13, .38], [.165, .41], [.168, .45], [.145, .456], [.135, .43]], 16, m, 0, y0, 0);
      const an = geo('ansaV' + LV, () => new THREE.TorusGeometry(.055, .012, 4, LV > 0 ? 8 : 6, PI)); put(g, an, m, .17, y0 + .3, 0, 0, 0, -PI / 2); put(g, an, m, -.17, y0 + .3, 0, 0, 0, PI / 2);
      terraV(g, .135, y0 + .43); return { R: .135, Rr: .168, Hs: .43, rimY: .026, H: .456 }; },
    mosaico(g, y0, o, rn) {   // la ciotola larga a mosaico: la fascia di tessere di tre colori
      const m = mat('#e4dccc', 'smalto'), tc = [pkV(rn, ['#2f6fa8', '#2a8a9a']), pkV(rn, ['#e8c040', '#f0e8d8']), pkV(rn, ['#c84a30', '#3a9a6a'])];
      lathe(g, [[.1, 0], [.112, .04], [.24, .1], [.29, .17], [.292, .19], [.272, .192], [.25, .165]], 16, m, 0, y0, 0);
      const nt = LV > 0 ? 12 : 8; for (let i = 0; i < nt; i++) { const ge = geo('mos' + nt + '|' + i, () => new THREE.LatheGeometry([V2(.2445, .1), V2(.2945, .17)], 2, i / nt * 2 * PI, 2 * PI / nt * .9)); put(g, ge, mat(tc[i % 3], 'smalto'), 0, y0, 0); }
      terraV(g, .25, y0 + .165); return { R: .25, Rr: .292, Hs: .165, rimY: .027, H: .192 }; },
    cesto(g, y0, o, rn) {   // il cesto di vimini: le costole dell'intreccio e l'orlo arrotolato
      const col = o.col || pkV(rn, ['#b08a52', '#9a7444', '#c09a5e']);
      lathe(g, [[.15, 0], [.163, .05], [.172, .06], [.178, .11], [.188, .12], [.194, .17], [.214, .18], [.216, .215], [.196, .22], [.188, .2]], 14, mat(col, 'vimini'), 0, y0, 0);
      terraV(g, .188, y0 + .2); return { R: .188, Rr: .216, Hs: .2, rimY: .02, H: .22 }; },
    cassetta(g, y0, o, rn) {   // la cassetta di legno dipinta, le doghe, i cantonali, il fiore dipinto sul davanti
      const W = .46, D = .3, H = .24, wc = o.col || pkV(rn, ['#9a7a52', '#3f7a8a', '#c8603a', '#5a8a5a', '#d8cfb8', '#4a6a9a']), mw = mat(wc, 'legno'), ms = mat(shade(wc, .78), 'legno'), mp = mat(pkV(rn, ['#f0ece0', '#e8c040', '#c83a3a']), 'vernice');
      [.065, .18].forEach(y => { [-1, 1].forEach(s => { slab(g, W, .11, .02, mw, 0, y0 + y, s * (D / 2 - .01)); slab(g, .02, .11, D - .04, mw, s * (W / 2 - .01), y0 + y, 0); }); });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .04, H, .04, ms, a * (W / 2 - .03), y0 + H / 2, b * (D / 2 - .03), .006));
      slab(g, W - .04, .02, D - .04, TERRA, 0, y0 + H - .03, 0, 0);
      put(g, cylG(.034, .034, .004, 8), mp, -.09, y0 + .12, D / 2 + .002, PI / 2); put(g, cylG(.012, .012, .006, 6), mat('#e8b830', 'vernice'), -.09, y0 + .12, D / 2 + .004, PI / 2); slab(g, W - .14, .016, .004, mp, .03, y0 + .03, D / 2 + .002, 0);
      return { R: D / 2 - .04, Rr: D / 2, Hs: H - .02, rimY: .02, H, quadra: [W, D] }; },
    latta(g, y0, o, rn) {   // la latta dei pelati riusata: la fascia dell'etichetta, le nervature, la ruggine
      const lab = o.col || pkV(rn, ['#c83a2e', '#e8b830', '#2f7a4a', '#2f5f9e', '#d8d0b8']);
      lathe(g, [[.1, 0], [.108, .008], [.108, .198], [.1, .205], [.096, .185]], 14, mat('#a8a8a0', 'zinco'), 0, y0, 0); lathe(g, [[.1096, .05], [.1096, .15]], 14, mat(lab, 'vernice'), 0, y0, 0);
      terraV(g, .096, y0 + .185); return { R: .096, Rr: .108, Hs: .185, rimY: .02, H: .205 }; },
    secchio(g, y0, o, rn) {   // il secchio zincato: l'orlo arrotolato, le orecchie, il manico appoggiato
      const m = mat(o.col || pkV(rn, ['#9a9e9a', '#8a8e8c', '#a8aca6']), 'zinco');
      lathe(g, [[.1, 0], [.108, .008], [.148, .238], [.157, .243], [.156, .254], [.144, .245]], 14, m, 0, y0, 0);
      [-1, 1].forEach(s => slab(g, .014, .035, .03, ZS, s * .155, y0 + .232, 0, 0));
      put(g, geo('manico' + LV, () => new THREE.TorusGeometry(.162, .005, 3, LV > 0 ? 10 : 6, PI)), ZS, 0, y0 + .236, 0, -1.25, 0, 0);
      terraV(g, .142, y0 + .228); return { R: .142, Rr: .157, Hs: .228, rimY: .026, H: .254 }; },
  };
  // il rialzo sotto un vaso del gruppo: la cassetta capovolta, lo sgabello, due mattoni incrociati; rende la quota del piano
  function rialzo(g, su, rn) {
    if (su === 'sgabello') { const m = mat(pkV(rn, ['#7a5a3a', '#3f6a5a', '#e8e2d6', '#a83a2e']), 'vernice'); put(g, cylG(.17, .17, .035, 14), m, 0, .4225, 0); for (let k = 0; k < 3; k++) { const a = k * 2 * PI / 3 + .3; asta(g, [Math.cos(a) * .13, 0, Math.sin(a) * .13], [Math.cos(a) * .1, .41, Math.sin(a) * .1], .016, m, 6); } return .44; }
    if (su === 'mattoni') { const m = mat(pkV(rn, ['#a85a3e', '#9a4e36']), 'cotto'); slab(g, .25, .06, .12, m, 0, .03, 0, .006); slab(g, .25, .06, .12, m, 0, .09, 0, .006, 0, PI / 2, 0); return .12; }
    const W = .42, D = .3, H = .26, m = mat(pkV(rn, ['#9a7a52', '#8a6a46', '#a8342a', '#3a5a8a']), 'legno');   // la cassetta capovolta: il fondo a doghe in alto
    [.05, .16].forEach(y => [-1, 1].forEach(s => { slab(g, W, .08, .018, m, 0, y, s * (D / 2 - .009)); slab(g, .018, .08, D - .036, m, s * (W / 2 - .009), y, 0); }));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .03, H - .02, .03, m, a * (W / 2 - .02), (H - .02) / 2, b * (D / 2 - .02), 0));
    for (let k = 0; k < 3; k++) slab(g, W, .02, .09, m, 0, H - .01, (k - 1) * .1, 0);
    return H; }
  T.vaso = (o) => {
    const g = new THREE.Group(), sd = o.seed === undefined ? 7 : Math.abs(o.seed | 0), rn = rngV(sd * 7 + 3), inner = new THREE.Group(), s = o.s || 1; inner.scale.setScalar(s); g.add(inner);
    const gen = VG[o.vaso] ? o.vaso : 'terracotta', y0 = o.su ? rialzo(inner, o.su, rn) : 0, V = VG[gen](inner, y0, o, rn), kind = ALIAS_P[o.pianta] || o.pianta || 'geranio', sv = (sd >>> 1) % 5;
    if (PIANTE[kind]) { if (V.quadra) [-1, 1].forEach((q, i) => piantaIn(inner, i && o.pianta2 ? o.pianta2 : kind, (sv + i * 2) % 5, V, q * V.quadra[0] / 4, y0 + V.Hs, 0, i * 2.2, o.fiore, sd + i * 8));
      else piantaIn(inner, kind, sv, V, 0, y0 + V.Hs, 0, (sd % 7) * .9, o.fiore, sd); }
    g.userData.vaso = { r: (V.quadra ? Math.hypot(V.quadra[0], V.quadra[1]) / 2 : V.Rr) * s, h: (y0 + V.H) * s, genere: gen, pianta: kind };
    return g; };
  T.vaso_appeso = (o) => {   // il macramè: l'anello al gancio, il nodo, le corde che si aprono a rete attorno al vaso, la nappa sotto; la pianta ricade
    const g = new THREE.Group(); g.userData.appeso = true; const sd = o.seed === undefined ? 11 : Math.abs(o.seed | 0), rn = rngV(sd * 5 + 1), s = o.s || .75, inner = new THREE.Group(); inner.scale.setScalar(s); g.add(inner);
    const drop = (o.L || .62) / s, m = mat(o.corda || pkV(rn, ['#d6c8a4', '#e0d6bc', '#c8b48a']), 'vimini');
    put(inner, torG(.024, .005, 8), m, 0, -.025, 0, 0);   // l'anello al gancio
    const pot = new THREE.Group(); inner.add(pot); pot.position.y = -drop;
    const gen = ['terracotta', 'smaltato', 'dipinto'].includes(o.vaso) ? o.vaso : pkV(rn, ['terracotta', 'terracotta', 'smaltato', 'dipinto']), V = VG[gen](pot, 0, Object.assign({}, o, { senzaPiatto: true, forma: o.forma || 'classico' }), rn);
    // le corde, i nodi e la nappa in un pennello solo (prismi a tre facce), in cache per vaso e calata
    const cg = geo('macrame|' + [V.Rr, V.H, drop].map(q3).join(',') + '|' + LV, () => { const B = vb(), yK = -.075, yR = -drop + V.H, yM = yK + (yR - yK) * .55, yB = -drop - .035, n = 4;
      stelo(B, [0, -.046, 0], [0, yK, 0], .006); palla(B, 0, yK, 0, .016, .016, .016, 5, 3, .1); palla(B, 0, yB, 0, .018, .018, .018, 5, 3, .1);
      stelo(B, [0, yB, 0], [0, yB - .2, 0], .022, .002);   // la nappa
      for (let i = 0; i < n; i++) { const a = i / n * 2 * PI + .4, mid = [Math.cos(a) * V.Rr * .5, yM, Math.sin(a) * V.Rr * .5], fianco = [Math.cos(a) * V.Rr * .82, -drop + V.H * .3, Math.sin(a) * V.Rr * .82];
        const rim = da => [Math.cos(a + da) * (V.Rr + .006), yR - .008, Math.sin(a + da) * (V.Rr + .006)];
        if (LV > 0) { stelo(B, [0, yK, 0], mid, .005); palla(B, mid[0], mid[1], mid[2], .011, .011, .011, 4, 3, .1); stelo(B, mid, rim(-.35), .004); stelo(B, mid, rim(.35), .004); stelo(B, rim(.35), fianco, .004); stelo(B, fianco, [0, yB, 0], .004); }
        else { stelo(B, [0, yK, 0], rim(0), .005); stelo(B, rim(0), [0, yB, 0], .004); } }
      return vbGeo(B); });
    put(inner, cg, m, 0, 0, 0).name = 'corde';
    piantaIn(pot, o.pianta || pkV(rn, ['pothos', 'pothos', 'pothos', 'geranio', 'buganvillea']), (sd >>> 1) % 5, Object.assign({}, V, { giu: .3 + (sd % 5) * .08 }), 0, V.Hs, 0, (sd % 7) * .9, o.fiore, sd);
    return g; };
  T.fioriera_tetto = (o) => {   // la fioriera lunga del giardino sul tetto: di mattoni a corsi con la copertina, o di tavole col fiore dipinto; le piante mescolate, quelle che ricadono davanti
    const g = new THREE.Group(), L = o.L || 2, legno = o.mat === 'legno', sd = o.seed === undefined ? 3 : Math.abs(o.seed | 0), rn = rngV(sd * 3 + 7), H = legno ? .4 : .46, D = legno ? .36 : .42;
    if (legno) {
      const wc = o.col || pkV(rn, ['#8a6440', '#7a5a3a', '#9a7a52']), mw = mat(wc, 'legno'), ms = mat(shade(wc, .78), 'legno'), mp = mat(pkV(rn, ['#3f7a8a', '#c8503a', '#5a8a5a', '#2f5fa0']), 'vernice'), mf = mat('#f0ece0', 'vernice');
      for (let k = 0; k < 3; k++) { const y = .1 + k * .12, mk = k === 1 ? mp : mw; [-1, 1].forEach(s => { slab(g, L - .06, .115, .025, mk, 0, y, s * (D / 2 - .0125)); slab(g, .025, .115, D - .05, mk, s * (L / 2 - .0125), y, 0); }); }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .05, H, .05, ms, a * (L / 2 - .025), H / 2, b * (D / 2 - .025), .008));
      [-1, 1].forEach(s => slab(g, L + .03, .025, .06, mw, 0, H + .0125, s * (D / 2 - .02), 0));
      for (let x = -L / 2 + .3; x < L / 2 - .2; x += .55) { put(g, cylG(.03, .03, .005, 8), mf, x, .22, D / 2 + .003, PI / 2); put(g, cylG(.01, .01, .007, 6), mat('#e8b830', 'vernice'), x, .22, D / 2 + .004, PI / 2); }
    } else {
      const col = o.col || pkV(rn, ['#a85a3e', '#9a4e36', '#b4684a']), m1 = mat(col, 'cotto'), m2 = mat(shade(col, .86), 'cotto'), nc = 5, ch = (H - .05) / nc;
      for (let k = 0; k < nc; k++) slab(g, L - (k % 2) * .012, ch, D - (k % 2) * .012, k % 2 ? m2 : m1, 0, ch * (k + .5), 0, 0);   // i corsi, uno su due rientrato: i giunti di malta
      const cop = mat('#c8c0b0', 'cemento'); [-1, 1].forEach(s => { slab(g, L + .04, .05, .08, cop, 0, H - .025, s * (D / 2 - .02), .012); slab(g, .08, .05, D - .12, cop, s * (L / 2 - .02), H - .025, 0, .012); });
    }
    slab(g, L - .08, .03, D - .08, TERRA, 0, H - .03, 0, 0);
    const mix = o.piante || ['geranio', 'erbe', 'basilico', 'pothos', 'geranio', 'buganvillea', 'ortensia', 'agave', 'geranio', 'pothos'], n = Math.max(2, Math.round(L / .36)), V0 = { R: D / 2 - .06, Rr: D / 2, Hs: H, rimY: .02, giu: H * .85, arco: [PI * .2, PI * .8] };
    for (let i = 0; i < n; i++) { const kind = pkV(rn, mix), giu = kind === 'pothos' || kind === 'buganvillea', x = -L / 2 + (i + .5) * L / n + (rn() - .5) * .08;
      piantaIn(g, kind, (sd + i) % 5, V0, x, H - .015, giu ? .03 : (rn() - .5) * .06, giu ? 0 : rn() * 6, null, sd * 8 + i * 8); }
    return g; };
  // la scelta col gusto: metà famiglia del cotto, poi smaltati, dipinti e roba riusata; la pianta adatta al vaso e alla misura
  const GEN_P = [['terracotta', 50], ['smaltato', 14], ['dipinto', 10], ['latta', 7], ['secchio', 5], ['cesto', 5], ['urna', 3], ['mosaico', 3], ['cassetta', 3]];
  const PIA_P = {
    terracotta: [['geranio', 28], ['erbe', 8], ['basilico', 7], ['ortensia', 9], ['buganvillea', 7], ['agave', 6], ['cactus', 6], ['sansevieria', 6], ['pothos', 8], ['monstera', 5], ['fico', 3], ['secco', 3], ['limone', 3]],
    smaltato: [['monstera', 14], ['sansevieria', 14], ['pothos', 16], ['fico', 10], ['geranio', 10], ['ortensia', 12], ['cactus', 8], ['agave', 6]],
    dipinto: [['geranio', 18], ['pothos', 16], ['sansevieria', 10], ['ortensia', 14], ['monstera', 8], ['basilico', 10], ['cactus', 8]],
    latta: [['geranio', 30], ['basilico', 25], ['erbe', 15], ['cactus', 22], ['secco', 5]],
    secchio: [['geranio', 30], ['ortensia', 25], ['erbe', 15], ['basilico', 15], ['pothos', 15]],
    cesto: [['pothos', 35], ['ortensia', 25], ['monstera', 15], ['geranio', 25]],
    urna: [['agave', 35], ['limone', 15], ['buganvillea', 25], ['nessuna', 10], ['geranio', 15]],
    mosaico: [['agave', 35], ['cactus', 35], ['erbe', 30]],
    cassetta: [['erbe', 30], ['basilico', 30], ['geranio', 40]],
  };
  const scegliP = (rn, L) => { let t = 0; L.forEach(e => t += e[1]); let x = rn() * t; for (const e of L) if ((x -= e[1]) < 0) return e[0]; return L[0][0]; };
  function vasoCaso(rn, o) {
    o = o || {}; const s = o.s || 1;
    const gen = o.vaso || scegliP(rn, GEN_P.filter(([k]) => (k !== 'urna' || s >= 1.1) && (k !== 'latta' || s <= 1.2) && (k !== 'cassetta' || !o.tondo) && (k !== 'mosaico' || s >= .7) && !(o.niente || []).includes(k)));
    let pi = o.pianta || scegliP(rn, PIA_P[gen] || PIA_P.terracotta); pi = ALIAS_P[pi] || pi;
    if (pi === 'limone' && s < 1.3) pi = 'ortensia'; if ((pi === 'monstera' || pi === 'sansevieria') && s < .7) pi = 'pothos';
    const q = Object.assign({}, o, { vaso: gen, pianta: pi, s, seed: Math.floor(rn() * 1e6) }); delete q.niente; delete q.tondo; return q; }   // forma, col, su, liv passano

  // ================= [dettaglio] I PEZZI CHE ERANO SCATOLE =================
  // il traliccio radio del comando: tre montanti a fasce bianche e rosse (segnalazione aerea) che si stringono salendo, la crociera a zig-zag
  // su ogni faccia e le traverse, le piastre dei piedi sul plinto, il ballatoio col parapetto, la parabola a tamburo, lo stilo in cima.
  // o.h: l'altezza del fusto sopra il plinto (22 m); la luce rossa e i tiranti li mette chi lo posa
  T.traliccio = (o) => {
    const g = new THREE.Group(), H = (o && o.h) || 22, nb = Math.max(6, Math.round(H / 1.6)), mR = mat('#a82a20', 'vernice'), mW = mat('#e4e0d6', 'vernice'), mA = mat('#3a3a3e', 'ghisa'), y0 = .5;
    slab(g, 1.5, .5, 1.5, CM, 0, .25, 0, .05);   // il plinto
    const R0 = .46, R1 = .24, leg = (k, y) => { const t = (y - y0) / H, R = R0 + (R1 - R0) * t, a = k * 2 * PI / 3 + PI / 6; return [Math.cos(a) * R, y, Math.sin(a) * R]; };
    for (let k = 0; k < 3; k++) { const p = leg(k, y0); slab(g, .18, .04, .18, ZS, p[0], y0 + .02, p[2], .008); if (F()) [[-1, -1], [1, 1]].forEach(([a, b]) => bullone(g, p[0] + a * .06, y0 + .05, p[2] + b * .06, 'y', .012, ZS)); }
    for (let i = 0; i < nb; i++) { const ya = y0 + H * i / nb, yb = y0 + H * (i + 1) / nb, m = i % 2 ? mW : mR;
      for (let k = 0; k < 3; k++) { const k2 = (k + 1) % 3, A = leg(k, ya), B = leg(k, yb), C = leg(k2, ya), D = leg(k2, yb);
        asta(g, A, B, .038, m, 6);   // il montante (un tratto per fascia)
        if (i % 2) asta(g, A, D, .013, m, 4); else asta(g, C, B, .013, m, 4);   // la diagonale, a zig-zag
        if (F() || i % 2) asta(g, B, D, .015, m, 4); } }   // la traversa
    const yp = y0 + H * .66, Rp = R0 + (R1 - R0) * .66;   // il ballatoio: il grigliato, i montantini, il corrimano
    slab(g, 1.3, .06, 1.3, mA, 0, yp, 0, .012); for (let k = -2; k <= 2; k++) slab(g, .02, .02, 1.26, ZS, k * .26, yp + .04, 0, 0);
    [[.62, .62], [-.62, .62], [-.62, -.62], [.62, -.62]].forEach(([a, c], k, L) => { asta(g, [a, yp + .03, c], [a, yp + .55, c], .016, mA, 6); const n2 = L[(k + 1) % 4]; asta(g, [a, yp + .55, c], [n2[0], yp + .55, n2[1]], .014, mA, 6); if (F()) asta(g, [a, yp + .3, c], [n2[0], yp + .3, n2[1]], .01, mA, 4); });
    [0, 1, 2].forEach(k => { const p = leg(k, yp); asta(g, [p[0], yp - .02, p[2]], [p[0] * 2.2, yp - .02, p[2] * 2.2], .02, mA, 4); });   // le mensole del grigliato sui montanti
    // la parabola a tamburo sul suo braccio, verso il mare
    const yd = y0 + H * .8, pd = leg(0, yd); asta(g, pd, [pd[0] + .42, yd, pd[2]], .03, mA, 6); put(g, cylG(.32, .34, .2, 14), mat('#d8d4ca', 'vernice'), pd[0] + .52, yd, pd[2], 0, 0, PI / 2); put(g, cylG(.3, .3, .01, 14), mat('#c8c4ba', 'tela'), pd[0] + .625, yd, pd[2], 0, 0, PI / 2);
    lathe(g, [[.06, 0], [.06, .1], [.03, .16], [.022, 2.0], [.01, 2.2], [.001, 2.22]], 6, mA, 0, y0 + H, 0);   // lo stilo
    slab(g, .5, .04, .5, mA, 0, y0 + H + .02, 0, .01);
    return g; };
  // la cabina degli apparati al piede del traliccio: il blocco intonacato sullo zoccolo, il tetto piano che sporge col gocciolatoio, la porta di
  // lamiera nel telaio con la griglia e la maniglia, la lampada sopra la porta, la canalina dei cavi che esce dal fianco
  T.cabina_apparati = () => {
    const g = new THREE.Group(), W = 2.2, H = 2.1, D = 1.7, mI = mat('#6e7468', 'cemento'), mZ = mat('#56594f', 'cemento'), mP = mat('#3a3e3a', 'vernice');
    slab(g, W + .08, .22, D + .08, mZ, 0, .11, 0, .03);
    slab(g, W, H - .22, D, mI, 0, .22 + (H - .22) / 2, 0, .05);
    slab(g, W + .22, .1, D + .22, mat('#4a4c4e', 'cemento'), 0, H + .05, 0, .025); slab(g, W + .26, .03, D + .26, mZ, 0, H + .115, 0, .01);   // il tetto e la scossalina
    slab(g, .94, 1.84, .05, ZS, -.4, .22 + .92, D / 2 + .012, .012); slab(g, .8, 1.72, .04, mP, -.4, .22 + .89, D / 2 + .035, .012);   // il telaio e l'anta
    for (let k = 0; k < 5; k++) slab(g, .5, .025, .035, ZS, -.4, .42 + k * .055, D / 2 + .06, 0, -.6, 0, 0);   // la griglia
    maniglia(g, -.1, 1.15, D / 2 + .055, .12, ZS, true); [.5, 1.6].forEach(y => cerniera(g, -.82, y, D / 2 + .05, .12));
    put(g, latheG([[.11, 0], [.1, .02], [.05, .07], [.012, .08]], 10), GH, .55, 1.85, D / 2 + .2, 0, 0, PI); put(g, sphG(.045, 8), LU, .55, 1.81, D / 2 + .2).name = 'luce'; asta(g, [.55, 1.88, D / 2], [.55, 1.88, D / 2 + .2], .012, GH, 4); luci(g, .55, 1.8, D / 2 + .2);
    slab(g, .2, .06, .9, ZS, W / 2 + .1, 1.7, 0, .01); [-.35, .35].forEach(z => asta(g, [W / 2, 1.66, z], [W / 2 + .1, 1.66, z], .012, ZS, 4));   // la canalina e le sue staffe
    if (F()) { slab(g, .32, .22, .06, mat('#d8d4ca', 'vernice'), .55, 1.3, D / 2 + .03, .01); targa(g, 'PERICOLO', .24, .14, .55, 1.3, D / 2 + .065, 0, '#e8c040', '#1c1c1e', 0); }
    return g; };
  // il pennone: il basamento di pietra a due gradini, il fusto tornito che si rastrema, il collare, il pomo d'ottone, la galloccia con la drizza,
  // la bandiera che si piega al vento (o.col, l'emblema quadrato o.col2, o.h l'altezza)
  const ondaG = (k, w, h, x0, z0) => geo('o' + k + [w, h, x0].map(q3), () => { const p = new THREE.PlaneGeometry(w, h, 10, 2), a = p.attributes.position;
    for (let i = 0; i < a.count; i++) { const x = a.getX(i) + x0, t = Math.max(0, x / 2.2); a.setZ(i, z0 + Math.sin(x * 2.6) * .13 * t); a.setX(i, x); } p.computeVertexNormals(); return p; });
  T.pennone = (o) => {
    const g = new THREE.Group(), H = (o && o.h) || 9, mP = mat('#3a3a40', 'ghisa'), FW = 2.2, FH = 1.3, yf = H - .3 - FH / 2;
    slab(g, .72, .14, .72, mat('#b8b0a0', 'pietra'), 0, .07, 0, .025); slab(g, .46, .16, .46, mat('#c8c0b0', 'pietra'), 0, .22, 0, .025);
    lathe(g, [[.1, .3], [.1, .4], [.07, .48], [.058, 1.6], [.05, H - .2], [.065, H - .12], [.065, H - .06], [.02, H]], 10, mP);
    put(g, sphG(.085, 10), OT, 0, H + .07, 0); tor(g, .066, .014, 10, mP, 0, 1.55, 0);
    slab(g, .03, .16, .03, OT, .075, 1.35, 0, 0); asta(g, [.075, 1.42, 0], [.065, H - .1, 0], .004, GH, 3);   // la galloccia e la drizza
    put(g, ondaG('band', FW, FH, FW / 2 + .06, 0), mat((o && o.col) || '#a81818', 'tela'), 0, yf, 0);
    if (o && o.col2) [.009, -.009].forEach(dz => put(g, ondaG('emb' + (dz > 0 ? 1 : 0), .5, .5, FW / 2 + .06, dz), mat(o.col2, 'tela'), 0, yf, 0));
    return g; };
  // la lanterna a braccio dei vicoli: la piastra coi tasselli, il braccio col ricciolo che lo regge, la lanterna appesa (gabbia di ghisa, vetri
  // accesi, tettuccio col pomolo). Origine sul muro all'altezza della lanterna (userData.aMuro); con o.palo sul palo di ferro scuro tornito
  T.lanterna_braccio = (o) => {
    const g = new THREE.Group(), s = .55;
    if (o && o.palo) { palo(g, 2.4, .045, GH); lathe(g, [[.06, 2.38], [.09, 2.44], [.05, 2.5], [.03, 2.53]], 8, GH); lanterna(g, 0, 2.58, 0, s, LU); return g; }
    g.userData.aMuro = true;
    slab(g, .09, .3, .02, GH, 0, .02, .01, .005); if (F()) [-.1, .14].forEach(y => bullone(g, 0, y, .024, 'z', .009, GH));
    asta(g, [0, .16, .02], [0, .16, .4], .016, GH, 6); put(g, sphG(.022, 6), GH, 0, .16, .41);
    cavo(g, [[0, -.1, .02], [0, -.02, .14], [0, .08, .26], [0, .14, .32]], .011, GH, 10);   // la voluta sotto il braccio
    tor(g, .022, .006, 8, GH, 0, .16, .34, 0); lanterna(g, 0, .16 - .81 * s - .02, .34, s, LU);
    return g; };
  // la tenda da sole della bottega: il cassonetto col rullo, il telo che si incurva fra il rullo e la barra, la mantovana smerlata, i due bracci
  // snodati coi gomiti, le staffe a muro. Origine sul muro all'altezza del cassonetto, verso +z; o.w la larghezza, o.mt il materiale del telo
  // (le righe della bottega), o.dep la sporgenza
  const telaG = (w, L) => geo('tl' + [w, L].map(q3), () => { const p = new THREE.PlaneGeometry(w, L, 1, 5), a = p.attributes.position; for (let i = 0; i < a.count; i++) { const t = .5 - a.getY(i) / L; a.setZ(i, -Math.sin(t * PI) * .045); } p.computeVertexNormals(); return p; });
  const smerloG = (w) => geo('sm' + q3(w), () => { const n = Math.max(3, Math.round(w / .32)), sw = w / n, h = .13, pts = [[-w / 2, 0], [w / 2, 0], [w / 2, -h]];
    for (let k = n - 1; k >= 0; k--) { const xa = -w / 2 + (k + 1) * sw, xb = xa - sw; for (let j = 1; j < 4; j++) { const a = j / 4 * PI; pts.push([xa - sw / 2 + Math.cos(a) * sw / 2, -h - Math.sin(a) * .07]); } pts.push([xb, -h]); }
    pts.pop(); pts.push([-w / 2, -h]);
    const ge = new THREE.ExtrudeGeometry(shape(pts), { depth: .008, bevelEnabled: false, curveSegments: 1 }), uv = ge.attributes.uv, ps = ge.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + w / 2) / w, 1 + ps.getY(i) / .2); ge.computeVertexNormals(); return ge; });
  T.tenda_bottega = (o) => {
    const g = new THREE.Group(); g.userData.aMuro = true; const w = (o && o.w) || 3, dep = (o && o.dep) || 1, mt = (o && o.mt) || mat(C.tela, 'tela'), mK = mat('#5a5e60', 'zinco');
    const zf = dep * .95, yf = -dep * .34, L = Math.hypot(zf - .14, yf + .04);
    slab(g, w + .1, .14, .16, mK, 0, 0, .08, .025); [-1, 1].forEach(sx => slab(g, .03, .16, .18, mK, sx * (w / 2 + .065), 0, .08, .008));   // il cassonetto e i tappi
    const t = put(g, telaG(w, L), mt, 0, (yf - .04) / 2, (zf + .14) / 2); t.rotation.x = -PI / 2 + Math.atan2(-(yf + .04), zf - .14);
    asta(g, [-w / 2, yf, zf], [w / 2, yf, zf], .022, mK, 8);   // la barra di carico
    put(g, smerloG(w), mt, 0, yf - .01, zf + .01);
    [-1, 1].forEach(sx => { const x = sx * (w / 2 - .12), sp = [x, -.62, .03], gm = [x, (yf - .62) / 2 + .05, zf * .5];   // i bracci snodati: la spalla a muro, il gomito, la barra
      slab(g, .06, .14, .04, mK, x, -.62, .02, .008); asta(g, sp, gm, .016, mK, 6); asta(g, gm, [x, yf, zf], .016, mK, 6); put(g, sphG(.028, 6), mK, gm[0], gm[1], gm[2]); });
    return g; };
  // la cassetta della frutta: le sponde a doghe con la fessura, i cantonali, il fondo, la merce a mucchio (o.col; o.merce false: vuota)
  T.cassetta = (o) => {
    const g = new THREE.Group(), W = .5, H = .16, D = .38, mL = mat((o && o.legno) || '#9a7a52', 'legno'), mS = mat('#6e5434', 'legno');
    [.04, .12].forEach(y => { [-1, 1].forEach(s => slab(g, W, .05, .012, mL, 0, y, s * (D / 2 - .006), .003)); [-1, 1].forEach(s => slab(g, .012, .05, D - .02, mL, s * (W / 2 - .006), y, 0, .003)); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => slab(g, .03, H, .03, mS, a * (W / 2 - .018), H / 2, b * (D / 2 - .018), .004));
    slab(g, W - .03, .01, D - .03, mS, 0, .012, 0, 0);
    if (o && o.col) { const m1 = mat(o.col, 'plastica'), m2 = mat(shade(o.col, .82), 'vernice'); let q = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) put(g, sphG(.055, LV > 0 ? 7 : 5), (q++ % 3) ? m1 : m2, -.17 + i * .113, H - .02 + ((i + j) % 2) * .02, -.11 + j * .11); }
    return g; };
  // il palo della luce di legno: il fusto tornito catramato al piede, la traversa smussata coi due isolatori sui perni, il saettone, il cappello
  // di lamiera, i ramponi per salire
  T.palo_legno = () => {
    const g = new THREE.Group(), mL = mat('#5a4634', 'legno'), mT = mat('#2a2420', 'legno');
    lathe(g, [[.13, 0], [.125, .9], [.12, .92], [.09, 6.3], [.07, 6.42], [.001, 6.45]], 9, mL); lathe(g, [[.135, 0], [.13, .9], [.124, .92]], 9, mT);   // il fusto e la catramatura
    lathe(g, [[.11, 6.38], [.12, 6.42], [.04, 6.5], [.001, 6.51]], 9, ZS);
    slab(g, 1.1, .1, .1, mL, 0, 5.85, 0, .02); [-1, 1].forEach(s => { const k = T.isolatore(); k.position.set(s * .45, 5.9, 0); g.add(k); });   // le teste degli isolatori a 6,14 m, dove arrivano i fili
    asta(g, [.05, 5.3, .06], [.38, 5.82, .06], .022, mL, 6); if (F()) [5.3, 5.82].forEach(y => bullone(g, y < 5.6 ? .05 : .38, y, .1, 'z', .012, ZS));
    if (F()) for (let k = 0; k < 6; k++) { const y = 2.2 + k * .5, a = k % 2 ? PI / 2 : -PI / 2, r = .1 - (y / 6.3) * .03; asta(g, [Math.cos(a) * r * .5, y, Math.sin(a) * r * .5], [Math.cos(a) * (r + .1), y, Math.sin(a) * (r + .1)], .01, ZS, 4); }
    return g; };
  // il piedistallo del radar: la torretta di cemento ottagonale rastremata col cordolo, il ballatoio col parapetto tubolare, la scaletta alla marinara
  T.radar_base = () => {
    const g = new THREE.Group(), m = mat('#6a6e66', 'cemento'), mS = mat('#7a7e76', 'cemento');
    slab(g, 2.1, .25, 2.1, mS, 0, .125, 0, .04);
    lathe(g, [[.95, .25], [.92, .4], [.75, .5], [.66, 4.7], [.8, 4.8], [.8, 5.0], [.001, 5.0]], 8, m, 0, 0, 0, PI / 8);
    const rP = .72; for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + PI / 8, b = a + PI / 4; asta(g, [Math.cos(a) * rP, 4.99, Math.sin(a) * rP], [Math.cos(a) * rP, 5.55, Math.sin(a) * rP], .018, ZS, 4); asta(g, [Math.cos(a) * rP, 5.55, Math.sin(a) * rP], [Math.cos(b) * rP, 5.55, Math.sin(b) * rP], .016, ZS, 4); }
    put(g, cylG(.2, .26, .6, 10), mS, 0, 5.3, 0); tor(g, .22, .03, 12, ZS, 0, 5.58, 0);   // il perno su cui gira la parabola
    [-.14, .14].forEach(x => asta(g, [x, .25, .74], [x, 5.0, .7], .016, ZS, 4)); for (let y = .55; y < 5; y += .32) asta(g, [-.14, y, .74 - (y / 5) * .04], [.14, y, .74 - (y / 5) * .04], .011, ZS, 4);   // la scaletta
    return g; };
  const TIPI = Object.keys(T);
  function make(tipo, o) { if (!T[tipo]) return null; const lv0 = LV; LV = o && o.liv !== undefined ? o.liv : 1; try { const g = T[tipo](o || {}); g.userData.tipo = tipo; g.userData.liv = LV; return g; } finally { LV = lv0; } }
  return { make, TIPI, T, mat, C, vasoCaso, PIANTE_V: Object.keys(PIANTE), GENERI_V: Object.keys(VG),   // [vasi2]
    asta, tubo, cavo, bullone, fascetta, slab, lathe, cyl, targa, mensola: o => make('mensola', o), contatore: o => make('contatore', o), isolatore: o => make('isolatore', o) };
})();
if (typeof module !== 'undefined') module.exports = Arredo3D;
