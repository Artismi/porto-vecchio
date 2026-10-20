/* ================= PEZZI DELLA CITTÀ: la libreria dei pezzi urbani grandi che fanno leggere le epoche =================
   [pezzi_citta] Campanili, portici, torri, tettoie, stazioni, binari, moli, bastioni, mura, sopraelevate, Vele, gradoni, pozzi, posti di
   blocco: i pezzi che nessuna casa a schiera può raccontare. Parametrici (lunghezze, campate, piani, lato dell'apertura), con le misure
   vere in metri, e NON posati: chi fa i volumi della città (world_cittanuova.js) li prende da qui e li mette al loro posto.
   Convenzioni, uguali per tutti i pezzi:
     - la base sta a y = 0 (il piano di posa; dove l'origine è sotto il piano, come il fossato, lo dice userData.quotaPosa);
     - la lunghezza corre lungo +X a partire da x = 0 (i segmenti si accostano traslando di L); il fronte guarda +Z (il lato della strada,
       del mare, del binario), il retro sta verso −Z; l'asse di simmetria sta su x = L/2 dove ha senso;
     - tutte le parti si toccano (grafo di contatto connesso: lo controlla strumenti/pezzi_check.js) e nulla galleggia;
     - 2-5 materiali condivisi per genere (tufo, travertino, pietra, ghisa, cemento, ferro, maioliche...) presi da mat(): chi posa molte
       copie dello stesso pezzo può fondere le mesh per materiale, come fa Superfici.unisci;
     - opzioni.lod = 'basso' toglie smussi, conci, ringhiere fini e lampade: la stessa sagoma con un decimo dei triangoli, per la distanza.
   PezziCitta.make(tipo, opzioni) → THREE.Group (userData: { tipo, opzioni, misure: [L, H, P] });  PezziCitta.TIPI;  PezziCitta.DOC[tipo]
   dice le opzioni con i valori di base. Niente marchi veri: solo nomi dell'isola. */
var PezziCitta = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, HP = PI / 2;
  // ---------------- tavolozza: pochi materiali condivisi per genere ----------------
  const COL = {
    tufo: '#c9a86a', tufoScuro: '#a88a52', travertino: '#e2d8c0', pietra: '#8d8378', pietraScura: '#6e665c', pietraChiara: '#a9a090',
    ghisa: '#2f4a3a', cemento: '#9a968e', cementoScuro: '#7c7873', ferro: '#4a4c50', ferroScuro: '#2e3034', ruggine: '#7a4a30',
    maiolica: '#2e7d5a', intonaco: '#d9c9a3', intonacoRosso: '#b5604a', ocra: '#c99a4e', coppi: '#a8623a', tegole: '#9b5a3c', legno: '#7a5a38',
    vetro: '#7fa3b8', asfalto: '#4a4a48', massicciata: '#7d7467', terra: '#8b7355', acqua: '#3f6f7a', bianco: '#e8e4da', rosso: '#b8322a',
    buio: '#1c1a18', lampada: '#ffe9b0', verde: '#3e6b3a', ottone: '#b08d4a', alluminio: '#b9bcc0', arancio: '#d8772a', giallo: '#e3b23c', blu: '#2a4a7a',
    zinco: '#8c9298', piombo: '#64676a', castano: '#6a3d2c', castanoScuro: '#4a2c22', isabella: '#d6c49a', erba: '#6f7a4a', rotaia: '#8a8580',
    mattone: '#9a5a40', lamiera: '#7d8288', intonacoGrigio: '#b9b4aa', azzurro: '#8fb0c0', verdeScuro: '#2c3d2e', corda: '#b8a27a', legnoScuro: '#5a4028', tela: '#a8936a'
  };
  const MC = {};
  function mat(nome) {
    if (MC[nome]) return MC[nome];
    const o = { color: COL[nome] || nome, roughness: .85, metalness: 0 };
    if (/ferro|ghisa|ruggine|alluminio|ottone|zinco|rotaia|lamiera/.test(nome)) Object.assign(o, { roughness: .5, metalness: .25 });   // (metallo pieno senza riflessi attorno viene nero)
    if (nome === 'vetro') Object.assign(o, { roughness: .2, metalness: .1, transparent: true, opacity: .7 });
    if (nome === 'acqua') Object.assign(o, { roughness: .15, metalness: .05, transparent: true, opacity: .8 });
    if (nome === 'lampada') Object.assign(o, { emissive: '#ffd890', emissiveIntensity: .8 });
    if (nome === 'rosso') Object.assign(o, { roughness: .6 });
    if (nome === 'faro') Object.assign(o, { color: '#ff3a2a', emissive: '#ff2a1a', emissiveIntensity: 1 });   // la lampada rossa in cima alle antenne
    if (nome === 'neon') Object.assign(o, { color: '#5ab8ff', emissive: '#3a8aff', emissiveIntensity: .9 });
    const m = new THREE.MeshStandardMaterial(o); m.name = nome; return (MC[nome] = m);
  }
  let LOD = false;   // acceso da make() con opzioni.lod = 'basso'
  const GC = {};     // geometrie condivise per chiave (pilastri, traversine, merli... la stessa forma non si rifà)
  function geoCache(k, f) { return GC[k] || (GC[k] = f()); }
  function add(g, geo, m, x, y, z, rx, ry, rz) { const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
  function grp(p, x, y, z, ry) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); g.rotation.y = ry || 0; p.add(g); return g; }
  // scatola smussata: w lungo X, h lungo Y (dalla base y0), d lungo Z, centrata in x e z; b = smusso (niente con il lod basso)
  function blocco(g, w, h, d, m, x, y0, z, b, ry) {
    b = LOD ? 0 : Math.min(b || 0, w / 2.5, h / 2.5, d / 2.5);
    const geo = geoCache(`B${w}|${h}|${d}|${b}`, () => {
      if (!b) return new THREE.BoxGeometry(w, h, d);
      const s = new THREE.Shape(); s.moveTo(-w / 2 + b, -h / 2 + b); s.lineTo(w / 2 - b, -h / 2 + b); s.lineTo(w / 2 - b, h / 2 - b); s.lineTo(-w / 2 + b, h / 2 - b); s.lineTo(-w / 2 + b, -h / 2 + b);   // (lo smusso riporta la scatola a w×h×d)
      const e = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1 }); e.translate(0, 0, -(d - 2 * b) / 2); e.computeVertexNormals(); return e;
    });
    return add(g, geo, m, x, (y0 || 0) + h / 2, z, 0, ry);
  }
  function cil(g, rb, rt, h, seg, m, x, y0, z) { return add(g, geoCache(`C${rb}|${rt}|${h}|${seg}|${LOD}`, () => new THREE.CylinderGeometry(rt, rb, h, LOD ? Math.max(6, seg >> 1) : seg)), m, x, (y0 || 0) + h / 2, z); }
  function tornito(g, pts, seg, m, x, y0, z) { return add(g, new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0, p[0]), p[1])), LOD ? Math.max(6, seg >> 1) : seg), m, x, y0, z); }
  function toro(g, r, t, seg, m, x, y, z, rx, ry, arco) { return add(g, new THREE.TorusGeometry(r, t, LOD ? 3 : 5, LOD ? Math.max(8, seg >> 1) : seg, arco || PI * 2), m, x, y, z, rx, ry); }
  // prisma verticale su un poligono in pianta [[x, z], ...], alto h dalla base y0
  function prisma(g, pts, h, m, x, y0, z, ry) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1]));
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false }); geo.rotateX(-HP); geo.computeVertexNormals();
    return add(g, geo, m, x, y0, z, 0, ry);
  }
  // sezione [[z, y], ...] estrusa lungo +X per L (muri a scarpa, rilevati, massicciate, impalcati); x0 = inizio, ry per girarla
  function sezione(g, pts, L, m, x0, y0, z0, ry) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(-p[0], p[1]) : s.moveTo(-p[0], p[1]));
    const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }); geo.rotateY(HP); geo.computeVertexNormals();
    return add(g, geo, m, x0 || 0, y0 || 0, z0 || 0, 0, ry);
  }
  // parete lungo X da x a x+L, alta H dalla base y0, spessa T (centrata in z), con aperture: { x (centro), w, h, tipo: 'arco' | 'rett' | 'sesto' }
  // 'arco' = a tutto sesto (rettangolo + semicerchio fino all'altezza h); 'sesto' = arco acuto; 'rett' = finestra/porta rettangolare, da y = h0 (0 se manca); 'tondo' = oculo di raggio w/2 centrato in (x, h)
  function pareteArchi(g, L, H, T, archi, m, x, y0, z, ry) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, H); s.lineTo(0, H); s.lineTo(0, 0);
    (archi || []).forEach(a => {
      const p = new THREE.Path(), w = a.w, r = w / 2, h0 = a.h0 || 0;
      if (a.tipo === 'tondo') p.absarc(a.x, a.h, r, 0, PI * 2, false);
      else if (a.tipo === 'rett') { p.moveTo(a.x - r, h0); p.lineTo(a.x + r, h0); p.lineTo(a.x + r, a.h); p.lineTo(a.x - r, a.h); p.lineTo(a.x - r, h0); }
      else if (a.tipo === 'sesto') { const hs = a.h - h0 - r * 1.3; p.moveTo(a.x - r, h0); p.lineTo(a.x + r, h0); p.lineTo(a.x + r, h0 + hs); p.absarc(a.x - r, h0 + hs, w, 0, PI / 3, false); p.absarc(a.x + r, h0 + hs, w, PI * 2 / 3, PI, false); p.lineTo(a.x - r, h0); }
      else { p.moveTo(a.x - r, h0); p.lineTo(a.x + r, h0); p.lineTo(a.x + r, a.h - r); p.absarc(a.x, a.h - r, r, 0, PI, false); p.lineTo(a.x - r, h0); }
      s.holes.push(p);
    });
    const geo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: LOD ? 6 : 14 }); geo.translate(0, 0, -T / 2); geo.computeVertexNormals();
    return add(g, geo, m, x || 0, y0 || 0, z || 0, 0, ry);
  }
  // scala piena che sale verso +Z: w di larghezza, n gradini per hTot di dislivello, pedata p; con il lod basso è un cuneo
  function scala(g, w, hTot, n, p, m, x, y0, z, ry) {
    const a = (hTot / n), gg = grp(g, x, y0, z, ry);
    if (LOD) { sezione(gg, [[0, 0], [n * p, 0], [n * p, hTot], [p, a]], w, m, -w / 2, 0, 0); return gg; }
    for (let i = 0; i < n; i++) blocco(gg, w, a * (i + 1), p, m, 0, 0, p * (i + .5), .02);
    return gg;
  }
  // ringhiera di ferro lungo +X: montanti, corrimano, corrente basso (col lod basso solo il corrimano)
  function ringhiera(g, L, h, m, x, y0, z, ry, passo) {
    const gg = grp(g, x, y0, z, ry), n = Math.max(1, Math.round(L / (passo || 1.5)));
    blocco(gg, L, .05, .05, m, L / 2, h - .05, 0); if (!LOD) blocco(gg, L, .03, .03, m, L / 2, .12, 0);
    for (let i = 0; i <= n; i++) if (!LOD || i === 0 || i === n) blocco(gg, .05, h, .05, m, i * L / n, 0, 0);
    return gg;
  }
  // merli lungo +X sopra un muro: hm alti, wm larghi, passo (merlo + vuoto); se tipo 'guelfo' sono squadrati, 'ghibellino' a coda di rondine
  function merli(g, L, hm, wm, passo, m, x, y0, z, ry, tipo) {
    const gg = grp(g, x, y0, z, ry), n = Math.floor((L + .01) / passo);
    for (let i = 0; i < n; i++) { const cx = i * passo + wm / 2 + (L - n * passo) / 2; blocco(gg, wm, hm, .5, m, cx, 0, 0, .03);
      if (tipo === 'ghibellino' && !LOD) { blocco(gg, wm * .3, hm * .35, .5, m, cx - wm * .35, hm, 0); blocco(gg, wm * .3, hm * .35, .5, m, cx + wm * .35, hm, 0); } }
    return gg;
  }
  // ghiera di conci attorno a un arco a tutto sesto di raggio r (luce interna), spessa T, centro (x, y); la chiave di volta più alta
  function conci(g, r, T, n, m, x, y, z) {
    if (LOD) return null;
    const gg = grp(g, x, y, z), d = PI / n, lw = 2 * (r + .2) * Math.sin(d / 2) * 1.02;
    for (let i = 0; i < n; i++) { const a = d * (i + .5), chiave = i === (n - 1) / 2, h = chiave ? .62 : .4; const b = blocco(gg, lw, h, T, m, Math.cos(a) * (r + h / 2 + .02), -h / 2, 0, .02); b.position.y += Math.sin(a) * (r + h / 2 + .02); b.rotation.z = a - HP; }
    return gg;
  }
  // cornice sporgente: una fascia più larga del muro, con il sottosquadro (due gradini)
  function cornice(g, L, D, sp, hh, m, x, y0, z, ry) { const gg = grp(g, x, y0, z, ry); blocco(gg, L + sp, hh * .55, D + sp, m, L / 2, 0, 0, .02); blocco(gg, L + sp * 2, hh * .45, D + sp * 2, m, L / 2, hh * .55, 0, .03); return gg; }
  // mensola di pietra sotto un balcone o una gronda (un cuneo che va dal muro al bordo)
  function mensola(g, sp, h, w, m, x, y, z, ry) { return sezione(g, [[0, 0], [sp, h * .4], [sp, h], [0, h]], w, m, x - w / 2, y - h, z, ry); }
  // orologio con le lancette: quadrante bianco di raggio r sul piano +Z, cerchio di ghisa, dodici tacche, ore e minuti (ora:min)
  function orologio(g, r, x, y, z, ry, ora, min) {
    const gg = grp(g, x, y, z, ry); ora = ora === undefined ? 17 : ora; min = min === undefined ? 45 : min;
    add(gg, geoCache(`Oq${r}`, () => new THREE.CylinderGeometry(r, r, .06, 24)), 'bianco', 0, 0, 0, HP);
    toro(gg, r, .05, 20, 'ghisa', 0, 0, .03);
    if (!LOD) for (let i = 0; i < 12; i++) { const a = i * PI / 6, l = i % 3 ? .06 : .12; blocco(gg, l, .03, .02, 'buio', Math.sin(a) * (r - l / 2 - .04), Math.cos(a) * (r - l / 2 - .04) - .015, .04, 0, 0).rotation.z = -a; }
    const am = min * PI / 30, ah = (ora % 12) * PI / 6 + am / 12;
    const lm = blocco(gg, .03, r * .85, .02, 'buio', 0, -.01, .05), lh = blocco(gg, .04, r * .6, .02, 'buio', 0, -.01, .055);
    lm.geometry = lm.geometry.clone(); lm.geometry.translate(0, -r * .85 / 2 + .04, 0); lm.rotation.z = -am; lm.position.y = 0;
    lh.geometry = lh.geometry.clone(); lh.geometry.translate(0, -r * .6 / 2 + .04, 0); lh.rotation.z = -ah; lh.position.y = 0;
    add(gg, new THREE.CylinderGeometry(.04, .04, .04, 10), 'buio', 0, 0, .07, HP);   // il perno
    return gg;
  }
  // scritta su una tela (lettere lapidarie, insegne, numeri): solo dove c'è il documento; in Node (il check) non fa niente
  function scritta(g, txt, w, h, x, y, z, ry, colore, fondo, font) {
    if (typeof document === 'undefined' || LOD) return null;
    const c = document.createElement('canvas'), px = 512; c.width = px; c.height = Math.max(32, Math.round(px * h / w)); const ctx = c.getContext('2d');
    if (fondo) { ctx.fillStyle = fondo; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.fillStyle = colore || '#3a3630'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let fs = c.height * .72; ctx.font = `${font || 'bold'} ${fs}px Georgia, "Times New Roman", serif`; while (ctx.measureText(txt).width > px * .92 && fs > 8) { fs *= .94; ctx.font = `${font || 'bold'} ${fs}px Georgia, "Times New Roman", serif`; }
    ctx.fillText(txt, px / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; const m = new THREE.MeshStandardMaterial({ map: t, transparent: !fondo, roughness: .9 });
    const o = add(g, new THREE.PlaneGeometry(w, h), m, x, y, z, 0, ry); o.userData.noVeste = true; return o;
  }
  // maioliche a losanghe (verde e giallo) per cuspidi e cupole: tela ripetuta; in Node resta il verde pieno
  let MAIOLICA = null;
  function maioliche() {
    if (MAIOLICA) return MAIOLICA;
    if (typeof document === 'undefined') return (MAIOLICA = mat('maiolica'));
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = COL.maiolica; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = COL.giallo;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 32 + 16 + (j % 2) * 16, cy = j * 32 + 16; ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 13); ctx.lineTo(cx - 9, cy); ctx.fill(); }
    ctx.strokeStyle = 'rgba(40,30,20,.35)'; ctx.lineWidth = 1; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(128, i * 32); ctx.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); t.magFilter = THREE.NearestFilter;
    return (MAIOLICA = new THREE.MeshStandardMaterial({ map: t, roughness: .35, metalness: .05 }));
  }
  // lampioni delle tre epoche: 'ghisa' (palo tornito con la lanterna), 'regime' (palo liscio con il globo), 'boom' (palo di cemento col braccio e la plafoniera)
  function lampione(g, tipo, x, z, h) {
    const gg = grp(g, x, 0, z); h = h || (tipo === 'boom' ? 9 : tipo === 'regime' ? 5 : 4);
    if (tipo === 'boom') { cil(gg, .18, .11, h, 10, 'cemento', 0, 0, 0); if (!LOD) { sezione(gg, [[0, 0], [.14, 0], [1.6, .9], [1.6, 1.05], [.1, .18], [0, .2]], .14, 'cemento', -.07, h - .2, 0); blocco(gg, .2, .14, .7, 'alluminio', 0, h + .6, 1.45, .03); blocco(gg, .18, .03, .6, 'lampada', 0, h + .58, 1.45); } return gg; }
    if (tipo === 'regime') { cil(gg, .22, .22, .4, 8, 'travertino', 0, 0, 0); cil(gg, .1, .07, h - .4, 10, 'ferro', 0, .4, 0); add(gg, new THREE.SphereGeometry(.3, LOD ? 8 : 14, LOD ? 6 : 10), 'lampada', 0, h + .25, 0); return gg; }
    if (LOD) { cil(gg, .14, .07, h, 6, 'ghisa', 0, 0, 0); blocco(gg, .36, .56, .36, 'lampada', 0, h, 0); return gg; }
    tornito(gg, [[0, 0], [.22, 0], [.2, .12], [.12, .3], [.07, 1.2], [.06, h - .6], [.09, h - .5], [.06, h - .4], [.05, h], [0, h]], 8, 'ghisa', 0, 0, 0);
    if (!LOD) { blocco(gg, .36, .5, .36, 'vetro', 0, h, 0, .02); blocco(gg, .4, .04, .4, 'ghisa', 0, h - .02, 0); blocco(gg, .44, .06, .44, 'ghisa', 0, h + .5, 0, .02); cil(gg, .14, .04, .16, 8, 'ghisa', 0, h + .56, 0); blocco(gg, .12, .2, .12, 'lampada', 0, h + .12, 0); }
    else blocco(gg, .36, .56, .36, 'lampada', 0, h, 0);
    return gg;
  }
  // un'asta (tubo, trave, montante) da un punto a un altro, di raggio r: per tralicci, controventi, tiranti
  const V3 = a => new THREE.Vector3(a[0], a[1], a[2]);
  function asta(g, a, b, r, m, seg) { const A = V3(a), B = V3(b), d = B.clone().sub(A), o = add(g, new THREE.CylinderGeometry(r, r, d.length(), LOD ? 4 : (seg || 6)), m); o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return o; }
  // traliccio a tronco di piramide (antenne, pali dei riflettori): base b, cima c, alto h, con gli anelli ogni passo e i controventi a croce
  function traliccio(g, b, c, h, m, x, y0, z, passo) {
    const gg = grp(g, x, y0, z), r = LOD ? .05 : .035; passo = passo || 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) asta(gg, [sx * b / 2, 0, sz * b / 2], [sx * c / 2, h, sz * c / 2], r, m);
    for (let y = passo; y < h - .1; y += passo) { const w = b + (c - b) * y / h; for (let k = 0; k < 4; k++) { const gq = grp(gg, 0, y, 0, k * HP); blocco(gq, w, .05, .05, m, 0, -.025, w / 2); if (!LOD) { const w2 = b + (c - b) * (y - passo) / h; asta(gq, [-w2 / 2, -passo, w2 / 2], [w / 2, 0, w / 2], .02, m); } } }
    blocco(gg, c + .1, .06, c + .1, m, 0, h, 0); return gg;
  }
  // falda di tegole: un prisma a doppia falda lungo X (L), largo P, alto hc al colmo, con la gronda sporgente
  function tettoFalde(g, L, P, hc, m, x, y0, z, sp) { sp = sp || .5; return sezione(g, [[-P / 2 - sp, 0], [P / 2 + sp, 0], [P / 2 + sp, .12], [0, hc + .12], [-P / 2 - sp, .12]], L + 2 * sp, m, x - sp, y0, z); }

  const T = {}, DOC = {};
  const def = (o, d) => Object.assign({}, d, o || {});

  // ================= 1. IL BORGO: campanile e Chiesa Madre (E0) =================
  DOC.campanile = { h: 28, lato: 5, campane: 2, orologio: true, cuspide: true, nota: 'torre in tufo con lo zoccolo di pietra, cella ad archi su quattro lati, cuspide ottagonale a maioliche con la palla e la croce' };
  T.campanile = o => {
    o = def(o, DOC.campanile); const g = new THREE.Group(), L = o.lato, hCusp = o.cuspide ? L * 1.3 : 0, hCella = 4.2, hFusto = o.h - hCusp - hCella - 1.2 - .6;
    blocco(g, L + .4, 1.2, L + .4, 'pietraScura', L / 2, 0, 0, .04);                       // zoccolo di pietra
    blocco(g, L, hFusto, L, 'tufo', L / 2, 1.2, 0, .03);                                     // fusto
    for (let y = 1.2 + 6; y < 1.2 + hFusto - 1; y += 6) cornice(g, L, L, .18, .3, 'tufoScuro', 0, y, 0);   // fasce marcapiano
    if (!LOD) for (let y = 4; y < 1.2 + hFusto - 2.5; y += 6) for (let k = 0; k < 4; k++) {                 // monofore strette sui quattro lati
      const gg = grp(g, L / 2, 0, 0, k * HP); blocco(gg, .5, 1.6, .2, 'buio', 0, y, L / 2 - .05); blocco(gg, .9, .12, .26, 'tufoScuro', 0, y + 1.6, L / 2 - .02, .02); blocco(gg, .9, .14, .3, 'tufoScuro', 0, y - .14, L / 2, .02); }
    if (o.orologio) orologio(g, 1, L / 2, 1.2 + hFusto - 2.6, L / 2 + .02, 0, o.ora, o.min);
    const yC = 1.2 + hFusto; cornice(g, L, L, .25, .4, 'tufoScuro', 0, yC - .4, 0);
    for (let k = 0; k < 4; k++) { const gg = grp(g, L / 2, yC, 0, k * HP); pareteArchi(gg, L, hCella, .5, [{ x: L / 2, w: 1.9, h: 3.4 }], 'tufo', -L / 2, 0, L / 2 - .25); conci(gg, .95, .56, 7, 'tufoScuro', 0, 3.4 - .95, L / 2 - .25); if (!LOD) blocco(gg, 2.3, .28, .6, 'tufoScuro', 0, -.01, L / 2 - .25, .02); }   // cella: quattro archi con la ghiera e il davanzale
    blocco(g, L - .9, .4, L - .9, 'tufo', L / 2, yC, 0);                                     // il pavimento della cella (ci stanno le campane)
    if (!LOD) { blocco(g, L - 1, .18, .18, 'legno', L / 2, yC + 3.3, 0); for (let i = 0; i < o.campane; i++) { const x = L / 2 + (i - (o.campane - 1) / 2) * 1.6, y = yC + 3.3; blocco(g, .12, .3, .12, 'ferro', x, y - .3, 0); tornito(g, [[0, 0], [.42, 0], [.4, .08], [.3, .35], [.2, .75], [.1, .9], [0, .92]], 14, 'ottone', x, y - 1.2, 0); } }   // trave e campane col ceppo
    const yT = yC + hCella; cornice(g, L, L, .3, .5, 'tufoScuro', 0, yT, 0);
    if (!LOD) for (let k = 0; k < 4; k++) for (let i = -1; i <= 1; i++) { const gg = grp(g, L / 2, yT + .5, 0, k * HP); blocco(gg, .4, .9, .4, 'tufo', i * (L / 2 - .3), 0, L / 2 - .1, .03); }   // i pilastrini d'angolo e di mezzo del parapetto
    if (o.cuspide) {
      blocco(g, L - .6, .6, L - .6, 'tufo', L / 2, yT + .5, 0);                              // tamburo
      add(g, new THREE.CylinderGeometry(.25, (L - .6) / 2 * 1.06, hCusp - 1.1, 8), maioliche(), L / 2, yT + 1.1 + (hCusp - 1.1) / 2, 0, 0, PI / 8);   // cuspide ottagonale a losanghe
      add(g, new THREE.SphereGeometry(.4, LOD ? 8 : 14, LOD ? 6 : 10), 'ottone', L / 2, yT + hCusp + .3, 0);   // la palla
      blocco(g, .08, 1.6, .08, 'ferro', L / 2, yT + hCusp + .6, 0); blocco(g, .8, .08, .08, 'ferro', L / 2, yT + hCusp + 1.6, 0);   // la croce
    }
    g.userData.misure = [L + .4, o.h + 2.2, L + .4]; return g;
  };
  DOC.facciata_chiesa = { w: 14, h: 16, spessore: 1.2, portale: true, rosone: true, timpano: true, gradini: 3, nota: 'facciata in tufo a due ordini con lesene, portale con la ghiera e il timpano, rosone, timpano con la croce; corpo retrostante corto (corpo = profondità, 0 per la sola facciata)' };
  T.facciata_chiesa = o => {
    o = def(o, DOC.facciata_chiesa); const g = new THREE.Group(), W = o.w, H = o.h, S = o.spessore, h1 = H * .56, lw = W / 3;
    const gS = o.gradini * .17; scala(g, W + 1.2, gS, o.gradini, .4, 'pietraChiara', W / 2, 0, S / 2 + o.gradini * .4, PI);   // il sagrato: tre gradini davanti al portale
    const pw = W * .22, ph = h1 * .62;
    pareteArchi(g, W, h1, S, [{ x: W / 2, w: pw, h: ph }], 'tufo', 0, gS, 0);                 // primo ordine con il vuoto del portale
    if (o.portale) { conci(g, pw / 2, S + .3, 9, 'tufoScuro', W / 2, gS + ph - pw / 2, 0); for (const s of [-1, 1]) blocco(g, .5, ph - pw / 2 + .2, S + .3, 'tufoScuro', W / 2 + s * (pw / 2 + .25), gS, 0, .02);   // stipiti e ghiera di conci con la chiave di volta
      blocco(g, pw + 1.5, .35, S + .5, 'tufoScuro', W / 2, gS + ph + .5, 0, .03); sezione(g, [[-S / 2 - .3, 0], [S / 2 + .3, 0], [S / 2 + .3, .2], [0, 1.4], [-S / 2 - .3, .2]], pw + 1.9, 'tufoScuro', W / 2 - pw / 2 - .95, gS + ph + .85, 0);   // trabeazione e timpano del portale
      blocco(g, pw - .3, .3, S + .1, 'legno', W / 2, gS + ph - pw / 2 - .4, 0); blocco(g, pw - .3, ph - pw / 2 - .4, .14, 'legno', W / 2, gS, S / 2 - .1); }   // il portone (chiuso; la lunetta sopra resta vuota)
    for (let i = 0; i <= 3; i++) if (!LOD || i === 0 || i === 3) blocco(g, .7, h1 + .3, .35, 'tufoScuro', i * lw + (i === 0 ? .35 : i === 3 ? -.35 : 0), gS, S / 2 + .1, .03);   // lesene del primo ordine
    cornice(g, W, S, .4, .6, 'tufoScuro', 0, gS + h1, 0);                                     // cornicione di mezzo
    const w2 = W * .62, y2 = gS + h1 + .6, h2 = H - h1 - .6 - 2.4, rr = w2 * .17;
    pareteArchi(g, w2, h2, S, o.rosone ? [{ x: w2 / 2, w: rr * 2, h: h2 * .5, tipo: 'tondo' }] : [], 'tufo', (W - w2) / 2, y2, 0);   // secondo ordine con l'oculo del rosone
    if (o.rosone) { const cy = y2 + h2 * .5; toro(g, rr + .12, .14, 24, 'tufoScuro', W / 2, cy, S / 2 + .02, 0, 0); add(g, new THREE.CircleGeometry(rr + .05, 24), 'vetro', W / 2, cy, -S / 2 + .3);   // ghiera e vetro (dietro, in ombra)
      if (!LOD) { toro(g, rr * .22, .07, 12, 'tufoScuro', W / 2, cy, S / 2 - .2, 0, 0); for (let i = 0; i < 6; i++) blocco(g, .12, rr * 2 - .1, .16, 'tufoScuro', W / 2, cy - rr + .05, S / 2 - .2, 0, 0).rotation.z = i * PI / 6; } }   // occhio e dodici raggi (sei stecche passanti)
    for (const s of [-1, 1]) { sezione(g, [[-S / 2, 0], [S / 2, 0], [S / 2, .3], [-S / 2, .3]], (W - w2) / 2 - .2, 'tufoScuro', s > 0 ? W / 2 + w2 / 2 + .2 : .0, y2, 0); if (!LOD) sezione(g, [[-S / 2 + .1, 0], [S / 2 - .1, 0], [S / 2 - .1, .4], [0, 2.4], [-S / 2 + .1, .4]], 1, 'tufoScuro', s > 0 ? W - 1 : 0, y2 + .3, 0); }   // le ali col raccordo a voluta (semplificata a cuneo)
    if (!LOD) for (const s of [-1, 1]) blocco(g, .7, h2, .35, 'tufoScuro', W / 2 + s * (w2 / 2 - .35), y2, S / 2 + .1, .03);
    const yT = y2 + h2; cornice(g, w2, S, .35, .5, 'tufoScuro', (W - w2) / 2, yT, 0);
    if (o.timpano) { const ht = 2.4;   // il timpano: un triangolo di fronte, spesso quanto la facciata, con gli spioventi di pietra scura
      const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(w2, 0); tri.lineTo(w2 / 2, ht); tri.lineTo(0, 0); const geo = new THREE.ExtrudeGeometry(tri, { depth: S, bevelEnabled: false }); geo.translate(0, 0, -S / 2); add(g, geo, 'tufo', (W - w2) / 2, yT + .5, 0);
      sezione(g, [[-S / 2 - .3, 0], [S / 2 + .3, 0], [S / 2 + .3, .3], [-S / 2 - .3, .3]], Math.hypot(w2 / 2, ht) + .2, 'tufoScuro', (W - w2) / 2 - .1, yT + .45, 0).rotation.z = Math.atan2(ht, w2 / 2);
      sezione(g, [[-S / 2 - .3, 0], [S / 2 + .3, 0], [S / 2 + .3, .3], [-S / 2 - .3, .3]], Math.hypot(w2 / 2, ht) + .2, 'tufoScuro', W / 2, yT + .5 + ht + .15, 0).rotation.z = -Math.atan2(ht, w2 / 2);   // spioventi
      blocco(g, .6, .6, .6, 'tufoScuro', W / 2, yT + .5 + ht, 0); blocco(g, .1, 1.8, .1, 'ferro', W / 2, yT + ht + 1.1, 0); blocco(g, .9, .1, .1, 'ferro', W / 2, yT + ht + 2.3, 0); }   // acroterio e croce
    if (o.corpo) { blocco(g, W - .4, h1 - .3, o.corpo, 'intonaco', W / 2, gS, -S / 2 - o.corpo / 2 + .05); tettoFalde(g, W - .4, o.corpo, 2.2, 'coppi', .2, gS + h1 - .3, -S / 2 - o.corpo / 2 + .05, .3); }   // corpo retrostante (facoltativo)
    g.userData.misure = [W + 1.2, H + 2.4, S + o.gradini * .4 + (o.corpo || 0)]; return g;
  };

  // ================= 2. IL REGIME: portico razionalista e torre littoria (E4) =================
  DOC.portico = { campate: 6, campata: 4, h: 5, piani: 4, profondita: 4, pilastro: .8, lettere: 'MINISTERO DELL\'ORDINE', nota: 'pilastri quadrati di travertino a passo di campata, trabeazione con le lettere lapidarie, cortina di travertino sopra con le finestre a nastro; il retro è cieco; L = campate × campata' };
  T.portico = o => {
    o = def(o, DOC.portico); const g = new THREE.Group(), L = o.campate * o.campata, P = o.profondita, H = o.h, pl = o.pilastro, hP = o.piani * 3.4, zF = P / 2 - pl / 2;
    blocco(g, L, .15, P + .5, 'travertino', L / 2, 0, -.25);                                 // il pavimento del portico
    for (let i = 0; i <= o.campate; i++) { const x = i * o.campata + (i === 0 ? pl / 2 : i === o.campate ? -pl / 2 : 0); blocco(g, pl, H - .15, pl, 'travertino', x, .15, zF, .03); if (!LOD) { blocco(g, pl + .14, .3, pl + .14, 'travertino', x, .15, zF, .02); blocco(g, pl + .12, .25, pl + .12, 'travertino', x, H - .25, zF, .02); } }   // pilastri con zoccolo e abaco
    const porte = []; for (let i = 0; i < o.campate; i++) porte.push({ x: i * o.campata + o.campata / 2, w: i % 2 ? 2.4 : 2.2, h: i % 2 ? 4 : 3.2, tipo: 'rett', h0: i % 2 ? 0 : .8 });
    pareteArchi(g, L, H, .5, porte, 'travertino', 0, 0, -P / 2 - .25);                      // la parete di fondo: portoni alti e vetrine
    if (!LOD) porte.forEach(a => { if (a.h0) blocco(g, a.w, a.h - a.h0, .08, 'vetro', a.x, a.h0, -P / 2 - .25); else { blocco(g, a.w, a.h, .1, 'legno', a.x, 0, -P / 2 - .3); blocco(g, .06, a.h, .12, 'ottone', a.x, 0, -P / 2 - .3); } });   // vetrine e portoni a due ante
    blocco(g, L, .6, P + .5, 'travertino', L / 2, H, -.25);                                 // il soffitto
    blocco(g, L, 1.4, .7, 'travertino', L / 2, H + .6, P / 2 - .35, .03);                   // trabeazione (la fascia delle lettere)
    if (o.lettere) scritta(g, o.lettere, Math.min(L * .8, o.lettere.length * .9), .9, L / 2, H + 1.3, P / 2 + .01, 0, '#5a5248');
    blocco(g, L, hP, P + .5, 'travertino', L / 2, H + 2, -.25);                             // la cortina sopra
    for (let p = 0; p < o.piani; p++) { const y = H + 2 + p * 3.4 + 1.2; blocco(g, L - 1.6, 1.5, .12, 'buio', L / 2, y, P / 2 - .04); if (!LOD) { for (let x = .8; x <= L - .8; x += 1.6) blocco(g, .1, 1.5, .14, 'alluminio', x, y, P / 2 - .02); blocco(g, L - 1.6, .12, .3, 'travertino', L / 2, y - .12, P / 2 + .06); } }   // finestre a nastro coi montanti e il davanzale
    cornice(g, L, P + .5, .35, .6, 'travertino', 0, H + 2 + hP, -.25);
    blocco(g, L + .7, .9, .4, 'travertino', L / 2, H + 2.6 + hP, P / 2 + .2);               // parapetto del lastrico sul fronte
    g.userData.misure = [L + .7, H + 3.5 + hP, P + .5]; return g;
  };
  DOC.torre_littoria = { h: 30, lato: 8, orologio: true, balcone: true, antenna: true, scritta: 'ORDINE', nota: 'torre di travertino su zoccolo di pietra, fenditura di finestre sul fronte, arengario su mensole a 7 m, orologio, loggia in cima e traliccio dell\'antenna col faro rosso' };
  T.torre_littoria = o => {
    o = def(o, DOC.torre_littoria); const g = new THREE.Group(), L = o.lato, H = o.h, hL = 3, hF = H - hL - 1.5 - .6, zF = L / 2;
    blocco(g, L + .6, 1.5, L + .6, 'pietraScura', L / 2, 0, 0, .04);                      // zoccolo
    blocco(g, L, hF, L, 'travertino', L / 2, 1.5, 0, .03);                                   // fusto
    const yW0 = o.balcone ? 11 : 4, yW1 = 1.5 + hF - (o.orologio ? 7 : 2);
    blocco(g, 1.4, yW1 - yW0, .12, 'buio', L / 2, yW0, zF - .04); if (!LOD) for (let y = yW0 + 3; y < yW1; y += 3) blocco(g, 1.6, .25, .2, 'travertino', L / 2, y, zF);   // la fenditura di finestre col traverso ogni piano
    if (!LOD) for (const s of [-1, 1]) { const gg = grp(g, L / 2, 0, 0, s * HP); for (let y = 6; y < yW1; y += 6) blocco(gg, .4, 2.4, .12, 'buio', 1.5, y, zF - .04); }   // feritoie sui fianchi
    if (o.balcone) { const yB = 7; for (let i = -1; i <= 1; i++) mensola(g, 1.8, 1.2, .5, 'travertino', L / 2 + i * 2.2, yB, zF + .9, 0); blocco(g, 6, .4, 1.9, 'travertino', L / 2, yB, zF + .95, .03); blocco(g, 6, 1.1, .3, 'travertino', L / 2, yB + .4, zF + 1.75, .03); for (const s of [-1, 1]) blocco(g, .3, 1.1, 1.6, 'travertino', L / 2 + s * 2.85, yB + .4, zF + .9, .03); if (!LOD) blocco(g, 6.2, .15, .35, 'travertino', L / 2, yB + 1.5, zF + 1.75, .02);
      blocco(g, 2, 3, .12, 'buio', L / 2, yB + .4, zF - .04); if (!LOD) blocco(g, .06, 2, .3, 'ferro', L / 2 + 1.3, yB + 1.6, zF + 1.5).rotation.z = .3; }   // arengario su tre mensole, porta dietro, pennone inclinato
    if (o.scritta) scritta(g, o.scritta, Math.min(L - 1, o.scritta.length * .9), 1.1, L / 2, yW0 - 1.2, zF + .01, 0, '#5a5248');
    if (o.orologio) orologio(g, Math.min(1.8, L * .22), L / 2, 1.5 + hF - 3.2, zF + .02, 0, o.ora, o.min);
    const yL = 1.5 + hF; cornice(g, L, L, .3, .6, 'travertino', 0, yL - .6, 0);
    for (let k = 0; k < 4; k++) { const gg = grp(g, L / 2, yL, 0, k * HP); pareteArchi(gg, L, hL, .6, [{ x: L / 4, w: 1.6, h: hL - .5, tipo: 'rett', h0: .5 }, { x: L * 3 / 4, w: 1.6, h: hL - .5, tipo: 'rett', h0: .5 }], 'travertino', -L / 2, 0, L / 2 - .3); }   // la loggia in cima: due vuoti squadrati per lato
    blocco(g, L - 1.2, hL, L - 1.2, 'travertino', L / 2, yL, 0);                               // il nucleo dentro la loggia (le scale)
    blocco(g, L + .2, .6, L + .2, 'travertino', L / 2, yL + hL, 0, .03);                      // il coronamento
    if (o.antenna) { traliccio(g, 1.6, .5, 8, 'ferro', L / 2, yL + hL + .6, 0); add(g, new THREE.SphereGeometry(.25, 10, 8), 'faro', L / 2, yL + hL + 8.9, 0); }
    g.userData.misure = [L + .6, H + (o.antenna ? 9.2 : 0), L + .6 + (o.balcone ? 1.9 : 0)]; return g;
  };


  // ================= aiuti comuni dei gruppi 3-7 =================
  // cilindro coricato lungo X o lungo Z (assi, respingenti, tubi, rulli)
  function cilX(g, r, l, seg, m, x, y, z) { return add(g, geoCache(`CX${r}|${l}|${seg}|${LOD}`, () => new THREE.CylinderGeometry(r, r, l, LOD ? Math.max(6, seg >> 1) : seg)), m, x, y, z, 0, 0, HP); }
  function cilZ(g, r, l, seg, m, x, y, z) { return add(g, geoCache(`CZ${r}|${l}|${seg}|${LOD}`, () => new THREE.CylinderGeometry(r, r, l, LOD ? Math.max(6, seg >> 1) : seg)), m, x, y, z, HP, 0, 0); }
  // vano (porta, finestra, arcata, lapide) come lastra sottile: w × h dalla base y0, 'arco' a tutto sesto o 'rett'; spessa t, centrata in (x, z)
  function vano(g, w, h, tipo, m, x, y0, z, t, ry) {
    t = t || .06;
    const geo = geoCache(`V${w}|${h}|${tipo}|${t}|${LOD}`, () => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0);
      if (tipo === 'arco') { s.lineTo(r, Math.max(0, h - r)); s.absarc(0, Math.max(0, h - r), r, 0, PI, false); } else { s.lineTo(r, h); s.lineTo(-r, h); }
      s.lineTo(-r, 0); const e = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: LOD ? 4 : 6 }); e.translate(0, 0, -t / 2); return e; });
    return add(g, geo, m, x, y0, z, 0, ry);
  }
  // finestra completa su un muro che guarda +Z (la faccia del muro a z): cornice di pietra, vetro scuro, davanzale, cimasa, persiane aperte (colore) se richieste
  function finestra(g, w, h, x, y0, z, o) {
    o = o || {}; const mc = o.cornice || 'pietraChiara', tipo = o.arco ? 'arco' : 'rett';
    if (LOD) return vano(g, w + .2, h + .1, tipo, o.vetro || 'buio', x, y0, z + .03, .06);
    vano(g, w + .36, h + .22, tipo, mc, x, y0 - .04, z + .02, .04);
    vano(g, w, h, tipo, o.vetro || 'buio', x, y0, z + .045, .03);
    blocco(g, w + .5, .12, .24, mc, x, y0 - .14, z + .12);
    if (o.cimasa !== false) blocco(g, w + .6, .16, .2, mc, x, y0 + h + .18, z + .1);
    if (o.persiane) for (const s of [-1, 1]) blocco(g, w / 2, h, .04, o.persiane, x + s * (w * .75 + .2), y0, z + .02);
  }
  // balaustra di pietra lungo +X: zoccolo, balaustrini, pilastrini ogni 3 m, cimasa (col lod basso un parapetto pieno)
  function balaustra(g, L, h, m, x, y0, z, ry) {
    const gg = grp(g, x, y0, z, ry); blocco(gg, L, .18, .4, m, L / 2, 0, 0); blocco(gg, L + .1, .14, .46, m, L / 2, h - .14, 0, LOD ? 0 : .02);
    if (LOD) { blocco(gg, L, h - .32, .26, m, L / 2, .18, 0); return gg; }
    const np = Math.max(1, Math.round(L / 3));
    for (let i = 0; i <= np; i++) blocco(gg, .36, h - .32, .36, m, Math.min(L - .18, Math.max(.18, i * L / np)), .18, 0);
    for (let i = 0; i < np; i++) { const x0 = i * L / np + .2, x1 = (i + 1) * L / np - .2, n = Math.max(1, Math.round((x1 - x0) / .45)); for (let j = 0; j < n; j++) blocco(gg, .13, h - .32, .13, m, x0 + (j + .5) * (x1 - x0) / n, .18, 0); }
    return gg;
  }
  // mantovana (frangia a denti) sotto una gronda: lastra sottile lunga L lungo +X da x, alta h, che pende da y
  function frangia(g, L, h, dente, m, x, y, z, ry) {
    if (LOD) return null;
    const n = Math.max(1, Math.round(L / dente)), d = L / n, s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, -h * .45);
    for (let i = n - 1; i >= 0; i--) { s.lineTo(i * d + d / 2, -h); s.lineTo(i * d, -h * .45); }
    s.lineTo(0, 0); const geo = new THREE.ExtrudeGeometry(s, { depth: .03, bevelEnabled: false }); geo.translate(0, 0, -.015);
    return add(g, geo, m, x, y, z, 0, ry);
  }
  // materiale a strisce (sbarre, travi di testa, cavalli di Frisia): n coppie di strisce lungo la u della faccia, diagonali se diag; in Node il primo colore
  const STR = {};
  function strisce(c1, c2, n, diag) {
    const k = `${c1}|${c2}|${n}|${diag}`; if (STR[k]) return STR[k];
    if (typeof document === 'undefined') return (STR[k] = mat(c1));
    const c = document.createElement('canvas'); c.width = 32 * n * 2; c.height = 32; const ctx = c.getContext('2d');
    ctx.fillStyle = COL[c1] || c1; ctx.fillRect(0, 0, c.width, 32); ctx.fillStyle = COL[c2] || c2;
    for (let i = 0; i < n; i++) { const x = i * 64 + 32; ctx.beginPath(); if (diag) { ctx.moveTo(x, 0); ctx.lineTo(x + 32, 0); ctx.lineTo(x, 32); ctx.lineTo(x - 32, 32); } else { ctx.rect(x, 0, 32, 32); } ctx.fill(); }
    if (diag) { ctx.beginPath(); ctx.moveTo(c.width, 0); ctx.lineTo(c.width + 32, 0); ctx.lineTo(c.width, 32); ctx.lineTo(c.width - 32, 32); ctx.fill(); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
    return (STR[k] = new THREE.MeshStandardMaterial({ map: t, roughness: .6 }));
  }
  // traversine di un binario lungo +X in un'unica geometria (solo la faccia di sopra: 2 triangoli l'una; dall'alto i fianchi non si vedono)
  function traversine(L, passo, lw, h, d) {
    return geoCache(`TR${L}|${passo}|${lw}|${h}|${d}`, () => {
      const P = [], n = Math.max(1, Math.floor(L / passo)), q = (a, b, c, e) => P.push(...a, ...b, ...c, ...a, ...c, ...e);
      for (let i = 0; i < n; i++) { const x0 = (i + .5) * L / n - lw / 2, x1 = x0 + lw, z0 = -d / 2, z1 = d / 2;
        q([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0]); }
      P.push(0, 0, 0, L, 0, 0, L, 0, 0);   // un triangolo nullo sul piano di posa: l'ingombro arriva fino alla massicciata su cui le traverse poggiano
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals(); return geo; });
  }
  // un binario lungo +X da x0 per L, asse in z, posato a y0 (sopra la massicciata): traverse di legno ogni 65 cm, due rotaie con la suola (scartamento 1,435)
  function binario(g, L, x0, y0, z) {
    const gg = grp(g, x0, y0, z);
    if (LOD) blocco(gg, L, .15, 2.4, 'legno', L / 2, 0, 0); else add(gg, traversine(L, .65, .24, .15, 2.4), 'legno', 0, 0, 0);
    for (const s of [-1, 1]) { blocco(gg, L, .15, .07, 'rotaia', L / 2, .15, s * .7535); if (!LOD) blocco(gg, L, .03, .15, 'rotaia', L / 2, .15, s * .7535); }
    return gg;
  }
  // massicciata a trapezio lungo +X da x0 per L, fra z0 e z1 (in cima), alta h, con le scarpe a 45°
  function massicciata(g, L, z0, z1, h, x0, y0) { return sezione(g, [[z0 - h, 0], [z1 + h, 0], [z1, h], [z0, h]], L, 'massicciata', x0 || 0, y0 || 0, 0); }
  // colonna di ghisa tornita su plinto di pietra: alta hc sopra il plinto (da y0)
  function colonnaGhisa(g, x, y0, z, hc, plinto, seg) {
    const hp = plinto === false ? 0 : .4; if (hp) blocco(g, .6, hp, .6, 'pietraChiara', x, y0, z, .03);
    if (LOD) return cil(g, .14, .14, hc, 6, 'ghisa', x, y0 + hp, z);
    return tornito(g, [[.22, 0], [.22, .12], [.12, .32], [.1, hc - .6], [.14, hc - .45], [.24, hc - .08], [.27, hc], [0, hc]], seg || 8, 'ghisa', x, y0 + hp, z);
  }

  // ================= 3. L'OTTOCENTO: Mercato, stazione, ferrovia (E3) =================
  DOC.tettoia_mercato = { diametro: 32, h: 7, lanterna: true, orologio: true, nota: 'tettoia ottagonale (diametro fra i lati) in ghisa verde: colonne tornite su plinti, archetti fra le colonne con gli occhi, trave di gronda con la mantovana, falde di lamiera zincata, colonne interne e lanterna di aerazione vetrata con l\'orologio; basolato con lo scalino. Centro in (diametro/2, 0, 0)' };
  T.tettoia_mercato = o => {
    o = def(o, DOC.tettoia_mercato); const g = new THREE.Group(), D = o.diametro, a = D / 2, H = o.h, cx = a, c8 = Math.cos(PI / 8), s8 = Math.sin(PI / 8), yP = .2;
    const ott = r => Array.from({ length: 8 }, (_, k) => { const t = k * PI / 4 + PI / 8; return [Math.cos(t) * r, Math.sin(t) * r]; });
    const Rc = a / c8, Rk = Rc - .6, ak = Rk * c8, e = 2 * Rk * s8, nb = Math.max(2, Math.round(e / 4.5)), bay = e / nb, V = ott(Rk);
    prisma(g, ott(Rc), yP, 'pietra', cx, 0, 0);                                                     // basolato con lo scalino
    const RE = Rc + .9, aE = RE * c8, eE = 2 * RE * s8, yE = H + .45, rL = o.lanterna ? Math.max(2.2, Rc * .26) : .5, hr = (RE - rL) * .3, yTop = yE + hr;
    for (let k = 0; k < 8; k++) {
      const A = V[k], B = V[(k + 1) % 8];
      for (let i = 0; i < nb; i++) colonnaGhisa(g, cx + A[0] + (B[0] - A[0]) * i / nb, yP, A[1] + (B[1] - A[1]) * i / nb, H - yP - .4);
      const gq = grp(g, cx, 0, 0, HP - (k + 1) * PI / 4);                                           // il lato k: x lungo il lato, +Z verso fuori
      blocco(gq, e + .4, .45, .3, 'ghisa', 0, H, ak);                                                // trave di gronda
      if (!LOD) for (let i = 0; i < nb; i++) { const r = bay / 2 - .1; add(gq, geoCache(`TA${r}|${LOD}`, () => new THREE.TorusGeometry(r, .07, 4, LOD ? 5 : 9, PI)), 'ghisa', -e / 2 + bay * (i + .5), H - r, ak);   // archetto fra le colonne
        if (i % 2 === 0) add(gq, geoCache('TO', () => new THREE.TorusGeometry(.24, .04, 3, 8)), 'ghisa', -e / 2 + bay * i, H - .32, ak); }                 // l'occhio sopra il capitello
      if (!LOD) { blocco(gq, eE, .16, .22, 'zinco', 0, yE - .16, aE); frangia(gq, eE, .55, .7, 'ghisa', -eE / 2, yE - .16, aE + .12); }   // grondaia e mantovana
    }
    add(g, new THREE.CylinderGeometry(rL, RE, hr, 8), 'zinco', cx, yE + hr / 2, 0, 0, PI / 8);   // le falde di lamiera
    const Vi = ott(rL - .25);
    for (let k = 0; k < 8; k++) { colonnaGhisa(g, cx + Vi[k][0], yP, Vi[k][1], yTop - yP - .4);   // colonne interne fino alla lanterna
      const gq = grp(g, cx, 0, 0, HP - (k + 1) * PI / 4); blocco(gq, 2 * (rL - .25) * s8 + .3, .3, .25, 'ghisa', 0, yTop - .3, (rL - .25) * c8);
      if (!LOD) asta(g, [cx + V[k][0], H - .1, V[k][1]], [cx + Vi[k][0], yTop - .6, Vi[k][1]], .04, 'ghisa'); }   // tiranti
    if (o.lanterna) { const hL = 1.4 + D * .02, rd = rL * .92;
      add(g, new THREE.CylinderGeometry(rd, rd, hL, 8), 'vetro', cx, yTop + hL / 2, 0, 0, PI / 8);
      if (!LOD) for (const p of ott(rd)) blocco(g, .14, hL, .14, 'ghisa', cx + p[0], yTop, p[1]);
      add(g, new THREE.CylinderGeometry(rL * 1.12, rL * 1.12, .25, 8), 'ghisa', cx, yTop + hL + .12, 0, 0, PI / 8);
      add(g, new THREE.CylinderGeometry(.15, rL * 1.12, rL * .55, 8), 'zinco', cx, yTop + hL + .25 + rL * .275, 0, 0, PI / 8);
      const yF = yTop + hL + .25 + rL * .55; add(g, new THREE.SphereGeometry(.22, LOD ? 6 : 10, LOD ? 4 : 8), 'ottone', cx, yF + .1, 0);
      if (!LOD) { blocco(g, .05, 1.4, .05, 'ferro', cx, yF + .25, 0); blocco(g, .6, .3, .02, 'ferro', cx + .3, yF + 1.2, 0); }   // asta con la banderuola
      if (o.orologio) orologio(g, Math.min(.85, rd * .38), cx, yTop + hL / 2, rd * c8 + .05, 0, o.ora, o.min);
    } else add(g, new THREE.SphereGeometry(.3, 8, 6), 'ottone', cx, yTop + .1, 0);
    g.userData.misure = [2 * RE, yTop + (o.lanterna ? 4 : .4), 2 * RE]; return g;
  };

  DOC.stazione = { L: 40, piani: 2, piazzale: true, binari: 2, pensilina: true, orologio: true, nome: 'PORTO VECCHIO', nota: 'fabbricato viaggiatori dell\'Ottocento: zoccolo di pietra, ali in ocra con le arcate al piano terra e le finestre con le persiane, corpo centrale avanzato con le lesene, il nome e l\'attico dell\'orologio, cornicione su modiglioni e balaustra; dietro (−Z) il marciapiede con la pensilina in ghisa, la mantovana, l\'orologio a bandiera e i binari; davanti (+Z) il piazzale coi lampioni' };
  T.stazione = o => {
    o = def(o, DOC.stazione); const g = new THREE.Group(), L = o.L, P = 11, hp = 5, hW = o.piani * hp, Lc = Math.min(14, L * .34), xc = L / 2, zF = P / 2, hC = hW + 1.2;
    blocco(g, L, .9, P + .2, 'pietra', L / 2, 0, 0, .03);                                          // zoccolo
    blocco(g, L, hW - .9, P, 'ocra', L / 2, .9, 0);                                                 // le ali
    blocco(g, Lc, hC, P + .8, 'intonaco', xc, 0, 0);                                                // corpo centrale, avanzato di 40 cm
    const nB = Math.max(3, Math.round(L / 4)), bay = L / nB, zC = zF + .4;
    for (let i = 0; i < nB; i++) { const x = (i + .5) * bay, cen = Math.abs(x - xc) < Lc / 2 - .5, z = cen ? zC : zF;
      if (Math.abs(x - xc) > Lc / 2 - .5 && Math.abs(x - xc) < Lc / 2 + .5) continue;            // niente vano a cavallo dello spigolo del corpo centrale
      if (!LOD) vano(g, 2.6, 4, 'arco', 'pietraChiara', x, .15, z + .02, .04); vano(g, 2.1, 3.7, 'arco', cen ? 'vetro' : 'buio', x, .15, z + .045, .03);   // arcate del piano terra
      if (!LOD) blocco(g, .4, .55, .14, 'pietraChiara', x, 3.75, z + .07, .02);   // chiave di volta
      if (!LOD) vano(g, 1.9, 3.5, 'rett', 'buio', x, .15, -zF - (cen ? .4 : 0) - .03, .06);                 // porte sul marciapiede
      for (let p = 1; p < o.piani; p++) finestra(g, 1.2, 2.4, x, p * hp + .9, z, { persiane: (i + p) % 3 ? 'verdeScuro' : null, arco: cen });
    }
    for (let p = 1; p < o.piani; p++) cornice(g, L, P, .12, .3, 'pietraChiara', 0, p * hp - .1, 0);   // fasce marcapiano
    for (const s of [-1, 1]) blocco(g, .8, hC, .25, 'pietraChiara', xc + s * (Lc / 2 - .4), 0, zC + .1, .03);   // lesene bugnate del corpo centrale
    cornice(g, L, P, .3, .6, 'pietraChiara', 0, hW, 0); cornice(g, Lc, P + .8, .35, .6, 'pietraChiara', xc - Lc / 2, hC, 0);
    if (!LOD) for (let x = .5; x < L; x += .9) if (Math.abs(x - xc) > Lc / 2 + .2) blocco(g, .18, .3, .3, 'pietraChiara', x, hW - .3, zF + .15);   // modiglioni sotto il cornicione
    for (const [x0, x1] of [[0, xc - Lc / 2], [xc + Lc / 2, L]]) balaustra(g, x1 - x0 - .3, 1, 'pietraChiara', x0 + .15, hW + .6, zF - .1);   // balaustre delle ali
    const wA = Lc * .62, yA = hC + .6; blocco(g, wA, 3, 1.4, 'intonaco', xc, yA, zC - .7);            // l'attico dell'orologio
    cornice(g, wA, 1.4, .25, .45, 'pietraChiara', xc - wA / 2, yA + 3, zC - .7);
    if (!LOD) for (const s of [-1, 1]) { blocco(g, .5, .5, .5, 'pietraChiara', xc + s * (wA / 2 - .25), yA + 3.45, zC - .4); add(g, new THREE.SphereGeometry(.3, 10, 8), 'pietraChiara', xc + s * (wA / 2 - .25), yA + 4.2, zC - .4); }   // acroteri a palla
    if (o.orologio) { toro(g, 1.25, .12, 24, 'pietraChiara', xc, yA + 1.5, zC + .02, 0, 0); orologio(g, 1.1, xc, yA + 1.5, zC + .04, 0, o.ora, o.min); }
    if (o.nome) { blocco(g, Math.min(Lc - 2, o.nome.length * .55 + 1), .9, .1, 'pietraChiara', xc, hC - 1.6, zC + .05); scritta(g, o.nome, Math.min(Lc - 2.2, o.nome.length * .5), .7, xc, hC - 1.15, zC + .11, 0, '#3a3630'); }   // il nome sulla fascia sotto il cornicione
    if (o.pensilina) { const zP = -zF - 3, zE = -zF - 5.6, nc = Math.max(2, Math.round(L / 6));
      blocco(g, L + 6, .9, 6, 'cemento', L / 2, 0, zP, .03); blocco(g, L + 6, .02, .25, 'bianco', L / 2, .9, -zF - 5.2);   // marciapiede con la linea bianca
      for (let i = 0; i <= nc; i++) colonnaGhisa(g, 1 + i * (L - 2) / nc, .9, -zF - 3.8, 3.6, false, 6);
      blocco(g, L + 4, .48, .22, 'ghisa', L / 2, 4.5, -zF - 3.8);                                  // trave sulle colonne
      sezione(g, [[-zF, 5.5], [zE, 4.75], [zE, 4.9], [-zF, 5.68]], L + 4, 'zinco', -2, 0, 0);      // la falda di lamiera
      if (!LOD) { for (let i = 0; i <= nc; i++) { const x = 1 + i * (L - 2) / nc; asta(g, [x, 4.2, -zF - 3.8], [x, 4.82, zE + .1], .05, 'ghisa'); asta(g, [x, 4.2, -zF - 3.8], [x, 5.2, -zF - .3], .05, 'ghisa'); }   // mensole
        frangia(g, L + 4, .45, .9, 'legno', -2, 4.78, zE - .02);
        const bc = (L - 2) / nc, xo = 1 + (Math.floor(nc / 2) - .5) * bc, xn = xo + bc; blocco(g, .08, .8, .08, 'ghisa', xo, 3.7, -zF - 3.8); for (const r of [0, PI]) orologio(g, .45, xo, 3.4, -zF - 3.8 + (r ? -.05 : .05), r, o.ora, o.min);   // l'orologio a bandiera, a due facce
        blocco(g, Math.min(3.6, bc - .6), .7, .08, 'blu', xn, 3.9, -zF - 3.8); scritta(g, o.nome || 'STAZIONE', Math.min(3.3, bc - .9), .55, xn, 4.25, -zF - 3.85, PI, '#ffffff');   // il cartello del nome
        for (const s of [-1, 1]) { const xb = xc + s * L * .28; for (const dx of [-.8, .8]) blocco(g, .08, .45, .45, 'ghisa', xb + dx, .9, -zF - 2.2); blocco(g, 1.8, .06, .45, 'legno', xb, 1.35, -zF - 2.2); blocco(g, 1.8, .4, .06, 'legno', xb, 1.4, -zF - 1.96); } }   // panchine
      const zB0 = -zF - 6, zB1 = zB0 - 1.8 - (o.binari - 1) * 4.2 - 1.8;
      if (o.binari > 0) { massicciata(g, L + 6, zB1, zB0, .3, -3, 0); for (let i = 0; i < o.binari; i++) binario(g, L + 6, -3, .3, zB0 - 1.75 - i * 4.2); }
    }
    if (o.piazzale) { blocco(g, L + 4, .15, 4, 'pietraChiara', L / 2, 0, zF + 2); blocco(g, L + 4, .06, 12, 'asfalto', L / 2, 0, zF + 10);
      for (let x = 2; x <= L - 2 + .01; x += Math.max(12, (L - 4) / Math.round((L - 4) / 16))) lampione(g, 'ghisa', x, zF + 3.5); }
    g.userData.misure = [L + 6, yA + 4.5, P + (o.pensilina ? 6 + o.binari * 4.2 + 2 : 0) + (o.piazzale ? 16 : 0)]; return g;
  };

  DOC.binari = { L: 25, binari: 2, rilevato: true, hRilevato: 2.5, palo: true, nota: 'segmento di ferrovia lungo +X: rilevato di terra col muro di pietra a scarpa sul fronte (+Z, il mare) con la copertina e i barbacani, scarpata d\'erba dietro, massicciata, traverse e rotaie; palo del telegrafo con gli isolatori. Si accostano traslando di L' };
  T.binari = o => {
    o = def(o, DOC.binari); const g = new THREE.Group(), L = o.L, n = Math.max(1, o.binari), h = o.rilevato ? o.hRilevato : 0, wb = (n - 1) * 4 + 3.6, Wt = wb + 3.2;
    if (o.rilevato && h > .8) {
      sezione(g, [[-Wt / 2 - 1.5 * h, 0], [Wt / 2 + .2 * h, 0], [Wt / 2, h], [-Wt / 2, h]], L, 'terra', 0, 0, 0);        // il corpo del rilevato
      sezione(g, [[-Wt / 2 - 1.5 * h, 0], [-Wt / 2 - 1.5 * h + .4, 0], [-Wt / 2 + .3, h - .02], [-Wt / 2, h]], L, 'erba', 0, 0, 0);   // la scarpata d'erba dietro
      sezione(g, [[Wt / 2 - .4, 0], [Wt / 2 + .2 * h + .1, 0], [Wt / 2 + .1, h], [Wt / 2 - .4, h]], L, 'pietra', 0, 0, 0);   // il muro a scarpa sul fronte
      blocco(g, L, .25, .75, 'pietraChiara', L / 2, h, Wt / 2 - .2, LOD ? 0 : .03);                       // copertina
      if (!LOD) for (let x = 2.5; x < L; x += 5) blocco(g, .14, .14, .2, 'buio', x, .6, Wt / 2 + .2 * h * (1 - .6 / h) + .05);   // barbacani
      if (!LOD) for (let x = 1.25; x < L; x += 5) blocco(g, .5, h * .6, .03, 'pietraScura', x, h * .3, Wt / 2 + .1 + .2 * h * .4 + .01).rotation.x = -Math.atan(.2);   // le colature sotto la copertina (usura)
    }
    massicciata(g, L, -wb / 2, wb / 2, .3, 0, h);
    for (let i = 0; i < n; i++) binario(g, L, 0, h + .3, (i - (n - 1) / 2) * 4);
    if (o.palo) { const zp = h ? -Wt / 2 + .6 : -wb / 2 - .35, x = L / 2; cil(g, .12, .09, 7.5, 8, 'legno', x, h, zp);
      blocco(g, 1.6, .12, .12, 'legno', x, h + 6.8, zp); if (!LOD) for (const dx of [-.65, -.25, .25, .65]) cil(g, .05, .04, .18, 6, 'bianco', x + dx, h + 6.92, zp); }
    g.userData.misure = [L, h + (o.palo ? 7.5 : .8), Wt + (h ? 1.7 * h : 0)]; return g;
  };

  DOC.sottopasso = { w: 5, h: 3.6, L: 16, binario: true, hRilevato: 0, nota: 'sottopasso a volta sotto il rilevato (la strada passa lungo Z, la ferrovia corre lungo X): fornice a tutto sesto con la ghiera di conci e la chiave, spalle di bugnato, cornice e parapetti, colature, lampada sotto la volta, strada d\'asfalto; hRilevato 0 = altezza minima' };
  T.sottopasso = o => {
    o = def(o, DOC.sottopasso); const g = new THREE.Group(), L = Math.max(o.L, o.w + 6), w = o.w, Hr = Math.max(o.hRilevato, o.h + 1.6), P = 9, xc = L / 2;
    pareteArchi(g, L, Hr, P, [{ x: xc, w, h: o.h }], 'pietra', 0, 0, 0);                             // il rilevato murato, col fornice che lo attraversa
    blocco(g, w + .6, .06, P + 6, 'asfalto', xc, 0, 0);                                              // la strada sotto
    for (const s of [1, -1]) { const gg = grp(g, xc, 0, 0, s > 0 ? 0 : PI), zf = P / 2;
      conci(gg, w / 2, .5, 11, 'pietraChiara', 0, o.h - w / 2, zf - .15);
      for (const d of [-1, 1]) blocco(gg, .9, o.h - w / 2 + .15, .4, 'pietraChiara', d * (w / 2 + .45), 0, zf, LOD ? 0 : .03);   // spalle
      if (!LOD) for (let y = .55; y < o.h - w / 2; y += .55) for (const d of [-1, 1]) blocco(gg, .95, .05, .42, 'pietraScura', d * (w / 2 + .45), y - .03, zf);   // i giunti del bugnato
      cornice(gg, L, .5, .15, .35, 'pietraChiara', -xc, Hr - .35, zf);                               // cornice
      blocco(gg, L, .9, .4, 'pietraChiara', 0, Hr, zf - .2, LOD ? 0 : .03);                          // parapetto
      if (!LOD) for (const dx of [-w / 2 - 1.6, w / 2 + 1.3, -w / 2 - 3]) blocco(gg, .35 + Math.abs(dx) * .02, Hr * .45, .03, 'pietraScura', dx, Hr * .5, zf + .01);   // colature
    }
    if (!LOD) { blocco(g, .3, .2, .3, 'ferro', xc, o.h - .2, 0); blocco(g, .2, .12, .2, 'lampada', xc, o.h - .32, 0); }   // la lampada sotto la volta
    if (o.binario) { massicciata(g, L, -2.2, 2.2, .3, 0, Hr); binario(g, L, 0, Hr + .3, 0); }
    g.userData.misure = [L, Hr + 1, P + 6]; return g;
  };

  DOC.passaggio_livello = { w: 8, aperto: false, casello: true, nota: 'passaggio a livello: binario lungo X, strada lungo Z (larga w) con le rampe e il riempimento fra le rotaie; due sbarre a strisce bianche e rosse col contrappeso e la forcella, croci di Sant\'Andrea, lanterne rosse, casello del guardiano col tetto di coppi' };
  T.passaggio_livello = o => {
    o = def(o, DOC.passaggio_livello); const g = new THREE.Group(), w = o.w, Lt = w + 14, xc = Lt / 2;
    massicciata(g, Lt, -1.6, 1.6, .15, 0, 0); binario(g, Lt, 0, .15, 0);                          // binario (rotaie in cima a .45)
    blocco(g, w, .44, 3.4, 'asfalto', xc, 0, 0);                                                     // il riempimento fra le rotaie
    for (const s of [-1, 1]) { sezione(g, [[s * 1.7, 0], [s * 4.7, 0], [s * 4.7, .06], [s * 1.7, .44]], w, 'asfalto', xc - w / 2, 0, 0); blocco(g, w, .06, 5, 'asfalto', xc, 0, s * 7.2); }   // rampe e strada
    const strada = strisce('bianco', 'rosso', 4, false);
    for (const s of [1, -1]) {                                                                       // le due sbarre, una per lato, ai capi opposti della strada
      const xp = xc - s * (w / 2 + .7), zp = s * 4, hb = 1.1;
      blocco(g, .5, .5, .5, 'cemento', xp, 0, zp); cil(g, .12, .1, hb + .1, 8, 'bianco', xp, .5, zp);
      const pv = grp(g, xp, .5 + hb, zp); if (o.aperto) pv.rotation.z = s * HP * .95;
      blocco(pv, w + .6, .12, .1, strada, s * (w + .6) / 2, -.06, .14); blocco(pv, 1.1, .3, .25, 'cemento', -s * .6, -.15, .14);   // asta e contrappeso
      if (!LOD) { blocco(pv, .2, .2, .2, 'ferro', 0, -.1, 0); cil(g, .05, .05, .5 + hb - .18, 6, 'bianco', xp + s * (w + .3), 0, zp + .14); blocco(g, .3, .08, .1, 'bianco', xp + s * (w + .3), .5 + hb - .2, zp + .14); }   // perno e forcella
      if (!LOD) { cil(g, .05, .05, 1, 6, 'ferro', xp, .6 + hb, zp); blocco(g, .25, .3, .2, 'buio', xp, 1.6 + hb, zp); for (const d of [-1, 1]) blocco(g, .14, .14, .05, 'faro', xp, 1.68 + hb, zp + d * .11); }   // lanterna rossa
      const xc2 = xc + s * (w / 2 + .9), zc = s * 6.5; cil(g, .05, .05, 2.6, 6, 'ferro', xc2, 0, zc);   // croce di Sant'Andrea
      for (const r of [.55, -.55]) { const b = blocco(g, 1.3, .22, .04, 'rosso', xc2, 2.3, zc + s * .05); b.rotation.set(0, s > 0 ? 0 : PI, r); if (!LOD) { const c = blocco(g, 1.1, .1, .02, 'bianco', xc2, 2.36, zc + s * .08); c.rotation.set(0, s > 0 ? 0 : PI, r); } }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) blocco(g, 1.4, .12, 7.9, 'cemento', xc + sx * (w / 2 + .7), 0, sz * 5.75);   // le banchine ai lati della strada
    if (o.casello) { const gx = xc + w / 2 + 3.1, gz = -6.4, gc = grp(g, gx, 0, gz);
      blocco(gc, 3.6, .4, 3.6, 'pietra', 0, 0, 0); blocco(gc, 3.4, 2.6, 3.4, 'intonacoRosso', 0, .4, 0); tettoFalde(gc, 3.4, 3.4, 1.1, 'coppi', -1.7, 3, 0, .35);
      finestra(gc, .8, 1.1, .7, 1.3, 1.7, { persiane: 'verdeScuro', cimasa: false }); vano(gc, .9, 2, 'rett', 'legno', -.8, .4, 1.73, .06);
      if (!LOD) { blocco(gc, 1.2, .3, .04, 'bianco', -.8, 2.55, 1.72); scritta(gc, 'CASELLO 21', 1.1, .26, -.8, 2.7, 1.75, 0, '#222'); cil(gc, .12, .12, .8, 8, 'cemento', 1.2, 3.2, -.6); } }   // targa e comignolo
    g.userData.misure = [Lt + (o.casello ? 6 : 0), 4.2, 19]; return g;
  };

  DOC.carro_merci = { aperto: false, colore: 'castano', numero: 'PV 21 83 140', nota: 'carro chiuso a due assi (10 m ai respingenti): ruote, assi, boccole e balestre, longheroni e traverse di testa, respingenti e gancio, cassa con i montanti e le crociere, porta scorrevole sulla guida (aperta = buio dentro), tetto a botte, finestrelle d\'aerazione, scaletta. Le ruote poggiano a y = 0 (il piano del ferro)' };
  T.carro_merci = o => {
    o = def(o, DOC.carro_merci); const g = new THREE.Group(), C = o.colore, Cs = C === 'castano' ? 'castanoScuro' : 'ferroScuro', xc = 5, yF = 1.2, hb = 2.35, W = 2.75;
    for (const dx of [-2.75, 2.75]) { const x = xc + dx; cilZ(g, .08, 2.1, 8, 'ferroScuro', x, .5, 0);
      for (const s of [-1, 1]) { cilZ(g, .5, .14, 16, 'ferroScuro', x, .5, s * .75); if (!LOD) cilZ(g, .22, .16, 10, 'ferro', x, .5, s * .75);
        blocco(g, .32, .36, .26, 'ferroScuro', x, .32, s * 1.0, LOD ? 0 : .03); if (!LOD) for (let i = 0; i < 4; i++) blocco(g, 1.3 - i * .22, .045, .14, 'ferro', x, .68 + i * .045, s * 1.0); blocco(g, .9, .6, .04, 'ferroScuro', x, .45, s * 1.08); } }   // ruote, boccole, balestre, parasale
    for (const s of [-1, 1]) blocco(g, 9.1, .32, .14, 'ferroScuro', xc, .85, s * 1.0);               // longheroni
    for (const x of [.55, 9.45]) { blocco(g, .22, .38, 2.9, 'ferroScuro', x, .82, 0);               // traverse di testa coi respingenti
      for (const s of [-1, 1]) { const d = x < 5 ? -1 : 1; cilX(g, .17, .42, 10, 'ferro', x + d * .32, 1.05, s * .875); cilX(g, .21, .05, 12, 'ferroScuro', x + d * .55, 1.05, s * .875); }
      if (!LOD) { blocco(g, .4, .1, .12, 'ferro', x + (x < 5 ? -.25 : .25), .98, 0); blocco(g, .12, .35, .18, 'ferro', x + (x < 5 ? -.42 : .42), .88, 0); } }   // gancio a vite
    blocco(g, 8.8, .12, W + .1, 'ferroScuro', xc, yF - .1, 0);                                       // pavimento
    blocco(g, 8.6, hb, W, C, xc, yF, 0);                                                              // la cassa
    const tetto = []; for (let i = 0; i <= 8; i++) { const z = -W / 2 - .06 + i * (W + .12) / 8; tetto.push([z, .26 * (1 - (2 * z / (W + .12)) ** 2)]); }
    sezione(g, [...tetto, [W / 2 + .06, -.04], [-W / 2 - .06, -.04]], 8.8, 'piombo', xc - 4.4, yF + hb + .04, 0);   // tetto a botte
    for (const s of [-1, 1]) { const gs = grp(g, xc, 0, 0, s > 0 ? 0 : PI), zf = W / 2;
      if (!LOD) for (let x = -4.25; x <= 4.26; x += 8.5 / 8) blocco(gs, .08, hb, .05, Cs, x, yF, zf + .02);   // montanti
      if (!LOD) for (const d of [-1, 1]) { asta(gs, [d * 4.25, yF + .1, zf + .03], [d * 2.2, yF + hb - .1, zf + .03], .035, Cs); blocco(gs, .5, .3, .04, 'buio', d * 3.6, yF + hb - .45, zf + .03); blocco(gs, .6, .08, .1, Cs, d * 3.6, yF + hb - .12, zf + .05); }   // crociere e finestrelle col tettuccio
      const xd = o.aperto ? 1.9 : 0; if (o.aperto) blocco(gs, 1.9, 2.05, .03, 'buio', 0, yF + .05, zf + .01);
      blocco(gs, 1.9, 2.15, .06, C, xd, yF + .02, zf + .06); if (!LOD) { blocco(gs, .06, 2.1, .08, Cs, xd - .7, yF + .05, zf + .1); blocco(gs, .06, 2.1, .08, Cs, xd + .7, yF + .05, zf + .1); blocco(gs, .04, .5, .08, 'ferro', xd - .5, yF + 1, zf + .11); }   // porta scorrevole
      blocco(gs, 4.2, .08, .12, 'ferroScuro', .9, yF + 2.18, zf + .06); blocco(gs, 4.2, .08, .12, 'ferroScuro', .9, yF - .04, zf + .06);   // guide della porta
      if (!LOD) { blocco(gs, 1.2, .35, .03, Cs, -2.6, yF + .25, zf + .02); scritta(gs, o.numero, 1.1, .2, -2.6, yF + .42, zf + .06, 0, '#e8e4da'); scritta(gs, 'Gs  25 t', .7, .18, 2.9, yF + .5, zf + .03, 0, '#e8e4da'); }
      if (!LOD) { blocco(gs, .5, .05, .2, 'ferro', 4.1, .55, zf); blocco(gs, .04, .54, .04, 'ferro', 4.1, .58, zf + .03); blocco(gs, .04, 1.2, .04, 'ferro', 4.2, yF + .6, zf + .03); }   // predellino e maniglione
    }
    blocco(g, .2, .2, 2.0, 'ferroScuro', xc, .9, 0); if (!LOD) { cilX(g, .16, .6, 10, 'ferroScuro', xc, .82, .3); blocco(g, 2.4, .05, .05, 'ferro', xc, .88, -.3); }   // traversa di mezzo, cilindro del freno e tirante   // cilindro del freno
    g.userData.misure = [10.2, yF + hb + .3, 3]; return g;
  };

  DOC.locomotiva = { colore: 'castano', numero: 'LM 6031', nota: 'locomotiva da manovra diesel a tre assi accoppiati (9,2 m ai respingenti): telaio, ruote con le bielle, piano di passaggio con le ringhiere, cofano lungo con le griglie e il radiatore, fumaiolo, cabina a una estremità coi vetri, tetto bombato con le trombe, fanali, travi di testa a strisce gialle e nere, respingenti, scalette. Ruote a y = 0' };
  T.locomotiva = o => {
    o = def(o, DOC.locomotiva); const g = new THREE.Group(), C = o.colore, L = 9.2, xc = L / 2, yW = 1.35, ax = [2.3, 3.75, 5.2], zebra = strisce('giallo', 'buio', 5, true);
    for (const x of ax) { cilZ(g, .09, 1.9, 8, 'ferroScuro', x, .52, 0);
      for (const s of [-1, 1]) { cilZ(g, .52, .14, 16, 'ferroScuro', x, .52, s * .75); if (!LOD) { cilZ(g, .1, .14, 8, 'ferro', x, .52 + .22, s * .87); blocco(g, .34, .3, .2, 'ferroScuro', x, .38, s * .55); } } }
    if (!LOD) for (const s of [-1, 1]) blocco(g, ax[2] - ax[0] + .3, .1, .05, 'rosso', (ax[0] + ax[2]) / 2, .69, s * .96);   // bielle d'accoppiamento
    for (const s of [-1, 1]) blocco(g, L - 1, .75, .14, 'ferroScuro', xc, .6, s * .55);              // il telaio
    blocco(g, L - .4, .2, 2.9, 'ferroScuro', xc, yW - .2, 0);                                        // piano di passaggio
    for (const x of [.3, L - .3]) { blocco(g, .4, .55, 2.9, zebra, x, .75, 0);                       // travi di testa a strisce
      for (const s of [-1, 1]) { const d = x < xc ? -1 : 1; cilX(g, .17, .4, 10, 'ferro', x + d * .38, 1.0, s * .875); cilX(g, .21, .05, 12, 'ferroScuro', x + d * .6, 1.0, s * .875);
        if (!LOD) { blocco(g, .2, .2, .06, 'bianco', x + d * .22, 1.1, s * .9); blocco(g, .08, .52, .4, 'ferro', x + d * .1, .35, s * 1.25); } }   // respingenti, fanali bassi, scalette
      if (!LOD) blocco(g, .4, .1, .12, 'ferro', x + (x < xc ? -.35 : .35), .95, 0); }
    const xh0 = .6, xh1 = 6.2, hH = 1.7;                                                             // il cofano
    blocco(g, xh1 - xh0, hH, 1.8, C, (xh0 + xh1) / 2, yW, 0, LOD ? 0 : .06); blocco(g, xh1 - xh0, .12, 1.9, 'ferroScuro', (xh0 + xh1) / 2, yW + hH, 0);
    if (!LOD) { for (const s of [-1, 1]) for (const x0 of [1.3, 3.6]) { blocco(g, 1.6, 1, .03, 'buio', x0, yW + .35, s * .91); for (let i = 0; i < 7; i++) blocco(g, 1.6, .04, .05, C, x0, yW + .38 + i * .14, s * .92); }   // griglie
      blocco(g, .04, 1.2, 1.4, 'buio', xh0 - .01, yW + .25, 0); for (let i = 0; i < 6; i++) blocco(g, .05, 1.2, .05, 'ferro', xh0 - .02, yW + .25, -.6 + i * .24);   // radiatore
      blocco(g, .2, .2, .06, 'bianco', xh0 - .02, yW + hH - .2, 0).rotation.y = HP;   // fanale alto
      cil(g, .12, .14, .5, 8, 'ferroScuro', 2.4, yW + hH + .1, 0); cil(g, .15, .15, .06, 8, 'ferroScuro', 2.4, yW + hH + .58, 0);   // fumaiolo
      for (const s of [-1, 1]) ringhiera(g, xh1 - xh0, 1, 'giallo', xh0, yW, s * 1.38, 0, 1.4); }
    const xk0 = xh1, xk1 = L - .5, hK = 2.5, gk = grp(g, (xk0 + xk1) / 2, yW, 0);                  // la cabina
    blocco(gk, xk1 - xk0, 1.1, 2.7, C, 0, 0, 0, LOD ? 0 : .04);
    for (const [dx, wx] of [[-(xk1 - xk0) / 2 + .06, .12], [(xk1 - xk0) / 2 - .06, .12]]) for (const s of [-1, 1]) blocco(gk, wx, hK - 1.1, .35, C, dx, 1.1, s * 1.17);   // montanti d'angolo
    blocco(gk, xk1 - xk0 - .2, hK - 1.1, .06, 'vetro', 0, 1.1, 1.3); blocco(gk, xk1 - xk0 - .2, hK - 1.1, .06, 'vetro', 0, 1.1, -1.3);
    for (const d of [-1, 1]) blocco(gk, .06, hK - 1.1, 2.1, 'vetro', d * ((xk1 - xk0) / 2 - .06), 1.1, 0);
    const tetto = []; for (let i = 0; i <= 8; i++) { const z = -1.45 + i * 2.9 / 8; tetto.push([z, .22 * (1 - (z / 1.45) ** 2)]); }
    sezione(gk, [...tetto, [1.45, -.06], [-1.45, -.06]], xk1 - xk0 + .2, 'isabella', -(xk1 - xk0) / 2 - .1, hK + .06, 0);   // tetto bombato
    if (!LOD) { for (const s of [-1, 1]) cilX(gk, .06, .45, 8, 'ottone', .2, hK + .3, s * .4); blocco(gk, .2, .2, .06, 'bianco', (xk1 - xk0) / 2 + .02, hK - .2, 0).rotation.y = HP;
      blocco(gk, 1.6, .35, .03, C, 0, .55, 1.37); scritta(gk, o.numero, 1.4, .3, 0, .72, 1.39, 0, '#e8e4da'); scritta(gk, o.numero, 1.4, .3, 0, .72, -1.39, PI, '#e8e4da'); }
    blocco(g, xk1 - xk0 + .1, .12, 2.9, 'ferroScuro', (xk0 + xk1) / 2, yW + 1.1, 0);                // la fascia sotto i vetri
    g.userData.misure = [L + .5, yW + hK + .4, 2.9]; return g;
  };


  // ================= 4. LA MARINA: magazzini, scalinate, bitte, darsena, molo, scalo (E2) =================
  // profilo [[x, y], ...] estruso lungo Z per D (centrato in z): scalinate, muri a gradoni, sagome di fianco
  function profilo(g, pts, D, m, x, y0, z) {
    const s = new THREE.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
    const geo = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false }); geo.translate(0, 0, -D / 2); geo.computeVertexNormals();
    return add(g, geo, m, x || 0, y0 || 0, z || 0);
  }
  // numeri pseudo-casuali ripetibili (massi, usura): ogni pezzo uguale a sé stesso a ogni chiamata
  function caso(seme) { let s = seme >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // bitta di ghisa a fungo sul suo blocco di pietra (h sopra il piano); con la cima avvolta al collo se cima
  function bittaG(g, x, y0, z, h, cima, ry) {
    const gg = grp(g, x, y0, z, ry); blocco(gg, .7, .1, .7, 'pietraChiara', 0, 0, 0, LOD ? 0 : .02);
    if (LOD) { cil(gg, .16, .24, h, 6, 'ferroScuro', 0, .1, 0); return gg; }
    tornito(gg, [[0, 0], [.27, 0], [.27, .05], [.18, .1], [.15, .3], [.14, h - .2], [.2, h - .12], [.25, h - .07], [.24, h - .02], [.18, h], [0, h]], 12, 'ferroScuro', 0, .1, 0);
    if (cima && !LOD) { add(gg, new THREE.TorusGeometry(.19, .035, 4, 12), 'corda', 0, .1 + h - .25, 0, HP); asta(gg, [0, .1 + h - .25, .2], [0, .06, .55], .022, 'corda'); asta(gg, [0, .06, .55], [.15, .03, 1.6], .022, 'corda'); }
    return gg;
  }
  // scaletta alla marinara di ferro sulla faccia di un muro che guarda +Z (in un gruppo girato per le altre): dal pelo del piano y = 0 giù fino a y1
  function scaletta(g, x, y1, z, ry) {
    const gg = grp(g, x, 0, z, ry);
    for (const s of [-1, 1]) { blocco(gg, .05, -y1 + .9, .05, 'ferro', s * .24, y1, .03); if (!LOD) asta(gg, [s * .24, .9, .03], [s * .24, .9, -.35], .025, 'ferro'); }
    if (!LOD) for (let y = -.3; y > y1 + .1; y -= .3) blocco(gg, .48, .04, .04, 'ferro', 0, y, .05);
    return gg;
  }
  // parabordo: un copertone appeso con la sua cima davanti a una faccia che guarda +Z
  function parabordo(g, x, y, z, ry) { if (LOD) return null; const gg = grp(g, x, 0, z, ry); toro(gg, .32, .12, 12, 'buio', 0, y, .13); blocco(gg, .03, -y + .1 - .3, .03, 'corda', 0, y + .3, .13); return gg; }

  DOC.magazzini_volta = { n: 4, w: 8, p: 16, h: 5.5, aperti: [1], nota: 'fila di magazzini a volta della marina (8 × 16 l\'uno lungo X): fronte di tufo sagomato sulla volta, fornice con la ghiera di conci, la chiave e gli stipiti, portone a due ante (aperti = indici dei fornici spalancati), occhio sopra, lesene e fascia d\'imposta, estradossi a botte intonacati a calce coi rinfianchi, lanterne a braccio, fascia d\'umido alla base' };
  T.magazzini_volta = o => {
    o = def(o, DOC.magazzini_volta); const g = new THREE.Group(), n = Math.max(1, o.n), w = o.w, P = o.p, hI = o.h, f = .45, rv = w / 2, L = n * w, zF = P / 2, tf = .7;
    const wp = Math.min(4.4, w * .54), hp = Math.min(hI - 1.1, 4.6), yo = hI + rv * f * .5;
    const fronte = geoCache(`MF${w}|${hI}|${LOD}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hI); s.absellipse(0, hI, w / 2, rv * f + .3, 0, PI, false); s.lineTo(-w / 2, 0);
      const p = new THREE.Path(); p.moveTo(-wp / 2, 0); p.lineTo(wp / 2, 0); p.lineTo(wp / 2, hp - wp / 2); p.absarc(0, hp - wp / 2, wp / 2, 0, PI, false); p.lineTo(-wp / 2, 0); s.holes.push(p);
      if (!LOD) { const q = new THREE.Path(); q.absarc(0, yo, .45, 0, PI * 2, false); s.holes.push(q); }
      const e = new THREE.ExtrudeGeometry(s, { depth: tf, bevelEnabled: false, curveSegments: LOD ? 5 : 10 }); e.translate(0, 0, -tf); return e; });
    const volta = geoCache(`MV${rv}|${P}|${LOD}`, () => new THREE.CylinderGeometry(rv, rv, P - tf, LOD ? 8 : 14, 1, false, -HP, PI));
    for (let i = 0; i < n; i++) { const xc = i * w + w / 2, aperto = (o.aperti || []).includes(i);
      blocco(g, w, hI, P - tf, 'tufo', xc, 0, -tf / 2);                                              // il corpo
      add(g, volta, 'intonaco', xc, hI, -tf / 2, -HP).scale.z = f;                                   // l'estradosso a botte (ribassato)
      add(g, fronte, 'tufo', xc, 0, zF);                                                             // il fronte sagomato col fornice
      vano(g, wp, hp, 'arco', 'buio', xc, 0, zF - tf - .02, .04);                                    // il buio dentro
      if (!LOD) add(g, geoCache('MO', () => new THREE.CircleGeometry(.45, 12)), 'buio', xc, yo, zF - tf + .05);
      if (!aperto) { vano(g, wp - .04, hp - .04, 'arco', 'legno', xc, 0, zF - .42, .08);             // portone chiuso con la battuta e le fasce di ferro
        if (!LOD) { blocco(g, .05, hp - .1, .04, 'buio', xc, 0, zF - .36); for (const y of [.8, 2.6]) blocco(g, wp - .2, .08, .03, 'ferroScuro', xc, y, zF - .36); blocco(g, .9, 1.8, .03, 'legno', xc + wp * .22, 0, zF - .36); } }   // e lo sportello
      conci(g, wp / 2, tf + .12, 9, 'pietraChiara', xc, hp - wp / 2, zF - tf / 2 + .06);
      for (const s of [-1, 1]) blocco(g, .5, hp - wp / 2, tf + .12, 'pietraChiara', xc + s * (wp / 2 + .25), 0, zF - tf / 2 + .06, LOD ? 0 : .02);   // stipiti
      blocco(g, wp + .8, .12, .7, 'pietraChiara', xc, 0, zF + .2);                                   // soglia
      if (!LOD) toro(g, .52, .07, 16, 'pietraChiara', xc, yo, zF + .02, 0, 0);                       // cornice dell'occhio
    }
    for (let i = 0; i <= n; i++) { const x = i * w + (i === 0 ? .35 : i === n ? -.35 : 0);
      blocco(g, .7, hI + .2, .25, 'pietraChiara', x, 0, zF + .12, LOD ? 0 : .02);                    // lesene
      blocco(g, i % n ? 1.4 : .7, rv * f * .6, P - tf, 'tufo', x, hI, -tf / 2);                      // rinfianchi fra le volte
      if (!LOD && i % n) blocco(g, .5, .1, P - tf, 'pietraChiara', x, hI + rv * f * .6, -tf / 2);    // il compluvio
      if (!LOD && i % 2 === 1 && i < n) { asta(g, [x, 3.6, zF + .25], [x, 3.6, zF + .9], .03, 'ferro'); blocco(g, .25, .35, .25, 'vetro', x, 3.25, zF + .9); blocco(g, .3, .06, .3, 'ferroScuro', x, 3.6, zF + .9); blocco(g, .12, .14, .12, 'lampada', x, 3.3, zF + .9); }   // lanterne a braccio
    }
    blocco(g, L, .3, .32, 'pietraChiara', L / 2, hI - .3, zF + .14);                                // fascia d'imposta
    if (!LOD) { const r = caso(n * 31 + w); for (let i = 0; i < n; i++) blocco(g, w - 1.2, .45 + r() * .4, .03, 'tufoScuro', i * w + w / 2, .12, zF + .015); }   // l'umido alla base
    g.userData.misure = [L, hI + rv * f + .3, P + .6]; return g;
  };

  DOC.scalinata = { w: 4, dislivello: 8, pianerottoli: 1, lampada: true, pedata: .36, nota: 'scalinata parametrica che sale lungo +X: gradini di pietra (alzata ~17 cm), rampe divise da pianerottoli di 1,6 m, arrivo in cima, muri d\'ambito di tufo con la copertina inclinata, corrimano di ferro sul muro, lampioni di ghisa sui pianerottoli, fascia d\'umido al piede dei muri' };
  T.scalinata = o => {
    o = def(o, DOC.scalinata); const g = new THREE.Group(), H = o.dislivello, n = Math.max(1, Math.ceil(H / .17)), a = H / n, pd = o.pedata, nf = Math.max(1, o.pianerottoli + 1), lp = 1.6, W = o.w;
    const pts = [[0, 0]], rampe = [], pian = []; let x = 0, y = 0;
    for (let f = 0; f < nf; f++) { const k = Math.round(n * (f + 1) / nf) - Math.round(n * f / nf), xb = x, yb = y;
      for (let i = 0; i < k; i++) { y += a; pts.push([x, y]); x += pd; pts.push([x, y]); }
      rampe.push([xb, yb, x - pd, y]); const lx = f < nf - 1 ? lp - pd : 1.2; x += lx; pts.push([x, y]); pian.push([x - lx - pd, x, y]); }
    pts.push([x, 0]); profilo(g, pts, W, 'pietraChiara', 0, 0, 0);                                  // i gradini e la massa sotto
    const top = [[0, 0]]; rampe.forEach((r, f) => { top.push([r[0], r[1] + a + 1]); top.push([r[2], r[3] + 1]); top.push([pian[f][1], r[3] + 1]); }); top.push([x, 0]);
    for (const s of [-1, 1]) { profilo(g, top, .45, 'tufo', 0, 0, s * (W / 2 + .225));                // muri d'ambito
      if (!LOD) for (const r of rampe) blocco(g, (r[2] - r[0]) * .9, .4, .03, 'tufoScuro', (r[0] + r[2]) / 2, (r[1] + r[3]) / 2 - .1, s * (W / 2 + .465)).rotation.z = Math.atan2(r[3] - r[1], r[2] - r[0]); }   // fascia d'umido
    for (const s of [-1, 1]) { rampe.forEach((r, f) => { const dx = r[2] - r[0], dy = r[3] - r[1] - a, l = Math.hypot(dx, dy);
        const c = blocco(g, l + .1, .12, .58, 'pietraChiara', r[0] + dx / 2, r[1] + a + 1 + dy / 2 - .02, s * (W / 2 + .225)); c.rotation.z = Math.atan2(dy, dx);
        blocco(g, pian[f][1] - r[2] + (f === rampe.length - 1 ? 0 : 0), .12, .58, 'pietraChiara', (r[2] + pian[f][1]) / 2, r[3] + 1, s * (W / 2 + .225)); }); }   // copertine
    if (!LOD) rampe.forEach(r => asta(g, [r[0] + .2, r[1] + a + .9, -W / 2 + .03], [r[2], r[3] + .9, -W / 2 + .03], .025, 'ferro'));   // corrimano
    if (o.lampada) pian.forEach(p => { const gl = lampione(g, 'ghisa', (p[0] + p[1]) / 2 + .3, W / 2 - .35); gl.position.y = p[2]; });
    g.userData.misure = [x, H + 1.12, W + .9]; return g;
  };

  DOC.bitta = { h: .6, cima: true, nota: 'bitta di ghisa a fungo sul suo blocco di pietra, con la cima avvolta al collo che scende verso +Z' };
  T.bitta = o => { o = def(o, DOC.bitta); const g = new THREE.Group(); bittaG(g, 0, 0, 0, o.h, o.cima); g.userData.misure = [.7, o.h + .1, o.cima ? 1.7 : .7]; return g; };

  DOC.darsena = { L: 40, W: 30, hq: 1.4, banchina: 6, scalette: 2, nota: 'darsena (L lungo X × W lungo Z, la bocca verso +Z): tre banchine di pietra col piano a y = 0, ciglio, testate tonde, bitte ogni 8 m, scalette alla marinara, parabordi di copertoni, fascia di alghe al pelo dell\'acqua (a −hq), lampioni; quotaPosa = piede dei muri' };
  T.darsena = o => {
    o = def(o, DOC.darsena); const g = new THREE.Group(), L = o.L, W = o.W, hq = o.hq, B = o.banchina, yF = -hq - 1.2, Lt = L + 2 * B, xc = Lt / 2;
    blocco(g, Lt, -yF, B, 'pietra', xc, yF, -W / 2 - B / 2);                                         // banchina di fondo
    for (const s of [-1, 1]) { const xb = xc + s * (L / 2 + B / 2); blocco(g, B, -yF, W, 'pietra', xb, yF, 0); cil(g, B / 2, B / 2, -yF, LOD ? 16 : 20, 'pietra', xb, yF, W / 2); }   // fianchi con le testate
    blocco(g, L + .6, .15, .6, 'pietraChiara', xc, 0, -W / 2 - .3); for (const s of [-1, 1]) blocco(g, .6, .15, W, 'pietraChiara', xc + s * (L / 2 + .3), 0, 0);   // ciglio
    blocco(g, L, .04, W + 3, 'acqua', xc, -hq - .04, 1.5);                                           // lo specchio d'acqua
    if (!LOD) { blocco(g, L, .5, .03, 'verdeScuro', xc, -hq - .15, -W / 2 + .015); for (const s of [-1, 1]) blocco(g, .03, .5, W, 'verdeScuro', xc + s * (L / 2 - .015), -hq - .15, 0); }   // le alghe
    const nb = Math.max(1, Math.floor(L / 8)); for (let i = 0; i <= nb; i++) { const x = xc - L / 2 + .8 + i * (L - 1.6) / nb; bittaG(g, x, 0, -W / 2 - .9, .55, i % 3 === 1); parabordo(g, x + 2 > xc + L / 2 - 1 ? x - 2 : x + 2, -.7, -W / 2); }
    const ns = Math.max(1, Math.floor(W / 8)); for (const s of [-1, 1]) for (let i = 0; i <= ns; i++) { const z = -W / 2 + 1 + i * (W - 2) / ns; bittaG(g, xc + s * (L / 2 + .9), 0, z, .55, false); parabordo(g, xc + s * (L / 2), -.7, z + 2.5 > W / 2 - 1 ? z - 2.5 : z + 2.5, -s * HP); }
    for (let k = 0; k < o.scalette; k++) { const lato = k % 3, t = (Math.floor(k / 3) + .5) / Math.ceil(o.scalette / 3);
      if (lato === 0) scaletta(g, xc - L / 2 + L * (.3 + .4 * t), yF + .3, -W / 2); else { const s = lato === 1 ? -1 : 1; scaletta(g, xc + s * L / 2, yF + .3, -W / 2 + W * (.35 + .3 * t), -s * HP); } }
    lampione(g, 'ghisa', xc - L / 2 - B / 2, -W / 2 - B / 2); lampione(g, 'ghisa', xc + L / 2 + B / 2, -W / 2 - B / 2);
    g.userData.quotaPosa = yF; g.userData.misure = [Lt, -yF + 4.6, W + B + B / 2]; return g;
  };

  DOC.molo_vecchio = { L1: 50, L2: 30, w: 7, hq: 1.6, paraonde: 2.4, lanterna: true, nota: 'Molo Vecchio a gomito: il primo braccio corre lungo +X (radice a x = 0), il secondo piega verso +Z; piano a y = 0, paraonde di pietra a scarpa sul lato del mare aperto (−Z e +X) con la copertina e gli scoli, scogliera di massi al piede, ciglio, bitte, scalette, parabordi, lampioni; in testata la lanterna bianca a fasce rosse col ballatoio. quotaPosa = piede dei muri' };
  T.molo_vecchio = o => {
    o = def(o, DOC.molo_vecchio); const g = new THREE.Group(), L1 = o.L1, L2 = o.L2, w = o.w, hq = o.hq, hp = o.paraonde, tp = 1.5, yF = -hq - 1.6, r = caso(L1 * 7 + L2 * 13 + w);
    blocco(g, L1, -yF, w, 'pietra', L1 / 2, yF, 0);                                                    // primo braccio
    if (L2 > 0) blocco(g, w, -yF, L2, 'pietra', L1 - w / 2, yF, w / 2 + L2 / 2);                      // secondo braccio
    const sez = [[0, yF], [0, hp], [-tp * .65, hp], [-tp, hp - .7], [-tp - 1.2, yF]];
    const d1 = sezione(g, sez, L1 + (L2 > 0 ? tp + 1.2 : 0), 'pietra', 0, 0, -w / 2);                 // il paraonde del primo braccio (sul lato −Z)
    if (L2 > 0) sezione(g, sez, L2 + w + tp + 1.2, 'pietra', L1, 0, -w / 2 - tp - 1.2, -HP);         // e del secondo (sul lato +X)
    blocco(g, L1 + (L2 > 0 ? tp * .65 : 0), .18, tp * .65 + .1, 'pietraChiara', (L1 + (L2 > 0 ? tp * .65 : 0)) / 2, hp, -w / 2 - tp * .325);   // copertine
    if (L2 > 0) blocco(g, tp * .65 + .1, .18, L2 + w, 'pietraChiara', L1 + tp * .325, hp, L2 / 2);
    if (!LOD) for (let x = 4; x < L1 - 2; x += 6) blocco(g, .5, .35, .3, 'buio', x, 0, -w / 2 + .1);   // gli scoli alla base del paraonde
    blocco(g, L1 - (L2 > 0 ? w : 0), .15, .5, 'pietraChiara', (L1 - (L2 > 0 ? w : 0)) / 2, 0, w / 2 - .25);   // ciglio sul lato del porto
    if (L2 > 0) blocco(g, .5, .15, L2, 'pietraChiara', L1 - w + .25, 0, w / 2 + L2 / 2);
    // la scogliera di massi al piede del paraonde (col lod basso una scarpa sola)
    const massi = (x0, x1, fz) => { if (LOD) return; for (let x = x0; x < x1; x += 2.2) { const s = 1.2 + r() * 1.1, m = blocco(g, s, s * .8, s, r() < .3 ? 'pietraScura' : 'pietra', 0, 0, 0); const [px, pz] = fz(x, r()); m.position.set(px, yF + s * .75 + r() * Math.max(0, -yF - hq - s * .6), pz); m.rotation.set(r() * .6, r() * PI, r() * .6); } };
    massi(0, L1 + (L2 > 0 ? tp : 0), (x, q) => [x, -w / 2 - tp - .9 - q * 1.2]);
    if (L2 > 0) massi(-w / 2, L2 + w / 2, (z, q) => [L1 + tp + .9 + q * 1.2, z]);
    if (LOD) { sezione(g, [[0, yF], [0, -hq + .2], [-3, yF]], L1, 'pietraScura', 0, 0, -w / 2 - tp - 1.2); if (L2 > 0) sezione(g, [[0, yF], [0, -hq + .2], [-3, yF]], L2 + w, 'pietraScura', L1 + tp + 1.2, 0, -w / 2, -HP); }
    for (let x = 5; x < L1 - (L2 > 0 ? w : 2); x += 10) { bittaG(g, x, 0, w / 2 - .9, .55, x % 20 < 10); parabordo(g, x + 2.5, -.8, w / 2); }
    for (let z = w / 2 + 5; z < w / 2 + L2 - 3; z += 10) { bittaG(g, L1 - w + .9, 0, z, .55, false); parabordo(g, L1 - w, -.8, z + 2.5, -HP); }
    scaletta(g, L1 * .35, yF + .3, w / 2); if (L2 > 0) scaletta(g, L1 - w, yF + .3, w / 2 + L2 * .5, -HP);
    if (!LOD) { blocco(g, L1 - (L2 > 0 ? w : 0), .45, .03, 'verdeScuro', (L1 - (L2 > 0 ? w : 0)) / 2, -hq - .15, w / 2 + .015); if (L2 > 0) blocco(g, .03, .45, L2, 'verdeScuro', L1 - w - .015, -hq - .15, w / 2 + L2 / 2); }
    for (let x = 14; x < L1 - 4; x += 22) lampione(g, 'ghisa', x, -w / 2 + .6);
    const hx = L2 > 0 ? L1 - w / 2 : L1, hz = L2 > 0 ? w / 2 + L2 : 0;                                  // la testata
    cil(g, w / 2 + .6, w / 2 + .6, -yF, LOD ? 12 : 24, 'pietra', hx, yF, hz); toro(g, w / 2 + .45, .12, 24, 'pietraChiara', hx, .02, hz, HP, 0);
    if (o.lanterna) { const gl = grp(g, hx, 0, hz);
      blocco(gl, 2.8, 1, 2.8, 'pietraChiara', 0, 0, 0, .04); cil(gl, 1.05, .85, 6, 16, 'bianco', 0, 1, 0);
      for (const yb of [2.2, 4.4]) cil(gl, 1.02 - yb * .033, 1.0 - yb * .033, .7, 16, 'rosso', 0, yb, 0);   // fasce rosse
      blocco(gl, .7, 1.7, .1, 'legno', 0, 1, 1); cil(gl, 1.4, 1.4, .15, 16, 'bianco', 0, 7, 0);             // porta e ballatoio
      if (!LOD) { for (let i = 0; i < 10; i++) { const t = i * PI / 5; blocco(gl, .04, .9, .04, 'ferro', Math.cos(t) * 1.32, 7.15, Math.sin(t) * 1.32); } toro(gl, 1.32, .03, 20, 'ferro', 0, 8.03, 0, HP, 0); }
      cil(gl, .65, .65, 1.2, 12, 'vetro', 0, 7.15, 0); add(gl, new THREE.SphereGeometry(.3, 10, 8), 'faro', 0, 7.7, 0);
      cil(gl, .75, .1, .7, 12, 'rosso', 0, 8.35, 0); add(gl, new THREE.SphereGeometry(.14, 8, 6), 'ottone', 0, 9.1, 0); }
    else bittaG(g, hx, 0, hz, .6, false);
    g.userData.quotaPosa = yF; g.userData.misure = [L1 + tp + 3, -yF + (o.lanterna ? 9.3 : hp), w + tp + 3 + L2]; return g;
  };

  DOC.scalo_alaggio = { L: 12, w: 6, hq: 1.4, argano: true, nota: 'scalo d\'alaggio: rampa di cemento che scende verso +Z dal piano (y = 0) fin sott\'acqua, chiusa fra due spallette di pietra, guide di legno con le traversine, alghe sotto il pelo dell\'acqua, argano a mano in cima con il cavo, bitta; quotaPosa = piede' };
  T.scalo_alaggio = o => {
    o = def(o, DOC.scalo_alaggio); const g = new THREE.Group(), L = o.L, w = o.w, hq = o.hq, yF = -hq - 1.2, yE = -hq - .8, th = Math.atan2(-yE, L), lr = Math.hypot(L, yE);
    sezione(g, [[-3, yF], [-3, 0], [0, 0], [L, yE], [L, yF]], w, 'cemento', 0, 0, 0);                // la rampa
    for (const s of [0, 1]) blocco(g, 1.2, -yF, L + 3, 'pietra', s ? w + .6 : -.6, yF, (L - 3) / 2); // spallette
    for (const s of [0, 1]) blocco(g, 1.3, .15, L + 3, 'pietraChiara', s ? w + .6 : -.6, 0, (L - 3) / 2);
    const gr = grp(g, w / 2, 0, 0); gr.rotation.x = th;                                             // le guide di legno, inclinate come la rampa
    for (const s of [-1, 1]) blocco(gr, .25, .18, lr, 'legno', s * w * .22, 0, lr / 2);
    if (!LOD) for (let z = .6; z < lr; z += 1.2) blocco(gr, w * .6, .08, .2, 'legno', 0, 0, z);
    if (!LOD) { const zw = L * hq / -yE; blocco(gr, w - .2, .02, lr - Math.hypot(zw, hq), 'verdeScuro', 0, .005, (Math.hypot(zw, hq) + lr) / 2); }   // le alghe sotto il pelo
    if (o.argano) { const ga = grp(g, w / 2, 0, -1.6);
      blocco(ga, 1.6, .2, .6, 'legno', 0, 0, 0); for (const s of [-1, 1]) blocco(ga, .16, 1.05, .3, 'ferroScuro', s * .6, .2, 0);
      cilX(ga, .2, 1.36, 12, 'legno', 0, 1, 0); if (!LOD) { for (const s of [-1, 1]) { blocco(ga, .05, .42, .05, 'ferro', s * .71, .6, 0); blocco(ga, .25, .05, .05, 'ferro', s * .83, .6, 0); } cilX(ga, .3, .06, 14, 'ferroScuro', -.5, 1, 0); }
      asta(g, [w / 2, .82, -1.6 + .15], [w / 2, yE * .3 + .3, L * .3], .02, 'ferroScuro'); }       // il cavo fino al gancio
    bittaG(g, -.6, .15, -1.5, .5, false);
    g.userData.quotaPosa = yF; g.userData.misure = [w + 2.4, -yF + 1.3, L + 3]; return g;
  };


  // ================= 5. LA ROCCA SPAGNOLA E LE MURA (E0-E1) =================
  // area con segno di un poligono in pianta [[x, z], ...] (positiva = il verso di tronco e allarga)
  function areaP(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
  // poligono allargato verso fuori: il lato i (da i a i+1) si sposta di d[i] (0 = fermo); i vertici stanno all'incrocio dei lati spostati
  function allarga(pts, d) {
    const n = pts.length, sg = areaP(pts) > 0 ? 1 : -1;
    const nor = i => { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [sg * dz / l, -sg * dx / l]; };
    return pts.map((v, i) => { const j = (i - 1 + n) % n, n1 = nor(j), n2 = nor(i), d1 = d[j], d2 = d[i], det = n1[0] * n2[1] - n1[1] * n2[0];
      if (Math.abs(det) < 1e-6) return [v[0] + n2[0] * d2, v[1] + n2[1] * d2];
      return [v[0] + (d1 * n2[1] - d2 * n1[1]) / det, v[1] + (n1[0] * d2 - n2[0] * d1) / det]; });
  }
  // tronco di prisma: poligono pb alla base (y0) e pt in cima (y0 + h), stessi vertici; fianchi a scarpa e coperchio
  function tronco(g, pb, pt, h, m, x, y0, z) {
    if (areaP(pt) < 0) { pb = pb.slice().reverse(); pt = pt.slice().reverse(); }
    const P = [], n = pt.length, B = i => [pb[i % n][0], 0, pb[i % n][1]], Tt = i => [pt[i % n][0], h, pt[i % n][1]];
    for (let i = 0; i < n; i++) P.push(...B(i), ...Tt(i + 1), ...B(i + 1), ...B(i), ...Tt(i), ...Tt(i + 1));
    THREE.ShapeUtils.triangulateShape(pt.map(p => new THREE.Vector2(p[0], p[1])), []).forEach(([a, b, c]) => { const A = Tt(a), Bv = Tt(b), C = Tt(c), ny = (Bv[2] - A[2]) * (C[0] - A[0]) - (Bv[0] - A[0]) * (C[2] - A[2]); if (ny >= 0) P.push(...A, ...Bv, ...C); else P.push(...A, ...C, ...Bv); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals();
    return add(g, geo, m, x || 0, y0 || 0, z || 0);
  }
  // un gruppo sul lato a-b di un poligono in pianta: origine a metà lato, +X lungo il lato, +Z verso fuori (out = segno del verso)
  function sulLato(g, a, b, sg, y) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), ox = sg * dz / l, oz = -sg * dx / l; const gq = grp(g, (a[0] + b[0]) / 2, y || 0, (a[1] + b[1]) / 2, Math.atan2(ox, oz)); gq.userData.l = l; return gq; }
  // stemma: scudo con la partizione e la corona, alto s, sulla faccia che guarda +Z, centro in (x, y)
  function stemma(g, s, m, x, y, z, ry) {
    const gg = grp(g, x, y, z, ry), w = s * .74;
    const geo = geoCache(`ST${s}`, () => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, s * .42); sh.lineTo(w / 2, s * .42); sh.lineTo(w / 2, -s * .05); sh.quadraticCurveTo(w / 2, -s * .42, 0, -s * .5); sh.quadraticCurveTo(-w / 2, -s * .42, -w / 2, -s * .05); sh.lineTo(-w / 2, s * .42);
      const e = new THREE.ExtrudeGeometry(sh, { depth: .14, bevelEnabled: false, curveSegments: 5 }); return e; });
    add(gg, geo, m, 0, 0, 0);
    if (!LOD) { blocco(gg, .06, s * .8, .06, m, 0, -s * .42, .15); blocco(gg, w * .9, .06, .06, m, 0, .05, .15);   // la partizione in quarti
      blocco(gg, w * .8, .14, .2, m, 0, s * .44, .07); for (const dx of [-.3, 0, .3]) blocco(gg, .1, .2 + (dx ? 0 : .08), .1, m, dx * w, s * .58, .07);   // la corona
      blocco(gg, w * 1.2, .16, .18, m, 0, -s * .62, .07); }   // il cartiglio sotto
    return gg;
  }
  // ciuffi d'erba e di capperi sui muri vecchi (usura): n ciuffi su una faccia che guarda +Z larga L, fra y0 e y1, a scarpa k (z = z0 - k·y)
  function capperi(g, n, L, y0, y1, z0, k, seme, x0) {
    if (LOD) return; const r = caso(seme);
    for (let i = 0; i < n; i++) { const y = y0 + r() * (y1 - y0), s = .3 + r() * .35; blocco(g, s, s * .7, .25, r() < .5 ? 'erba' : 'verde', (x0 || 0) + .5 + r() * (L - 1), y, z0 - k * y + .05); }
  }

  DOC.cortina = { L: 40, h: 12, cordone: true, cannoniere: 0, terrapieno: 9, nota: 'cortina della Rocca: muro di tufo a scarpa fino al cordone, parapetto spesso con le cannoniere (0 = una ogni 10 m), banchina e camminamento sul terrapieno, muretto interno, doccioni con le colature, capperi. Il piede del fronte sta a z = 0 (il fronte guarda +Z, il fossato), il terrapieno verso −Z' };
  T.cortina = o => {
    o = def(o, DOC.cortina); const g = new THREE.Group(), L = o.L, h = o.h, hc = h - 2.4, hT = h - 1.9, zc = -hc * .2, D = o.terrapieno, nc = o.cannoniere || Math.max(1, Math.round(L / 10));
    sezione(g, [[0, 0], [zc, hc], [zc, hT], [zc - D, hT], [zc - D, 0]], L, 'tufo', 0, 0, 0);          // muro a scarpa e terrapieno
    blocco(g, L, .7, 3, 'tufo', L / 2, hT, zc - 1.5);                                                 // parapetto, parte bassa
    const gap = 1.1; let xa = 0;
    for (let i = 0; i <= nc; i++) { const xb = i < nc ? (i + .5) * L / nc - gap / 2 : L; if (xb - xa > .1) { blocco(g, xb - xa, h - hT - .7, 3, 'tufo', (xa + xb) / 2, hT + .7, zc - 1.5); if (!LOD) blocco(g, xb - xa, .1, 3.1, 'pietraChiara', (xa + xb) / 2, h, zc - 1.5); } xa = xb + gap; }   // i merloni fra le cannoniere
    if (o.cordone) cilX(g, .32, L, 10, 'pietraChiara', L / 2, hc, zc + .06);
    blocco(g, L, .06, D - 3, 'pietra', L / 2, hT, zc - 3 - (D - 3) / 2); blocco(g, L, .9, .5, 'tufo', L / 2, hT, zc - D + .25);   // camminamento e muretto interno
    if (!LOD) for (let x = 4; x < L - 1; x += 8) { blocco(g, .3, .25, 1, 'pietraChiara', x, hT - .5, zc + .35); blocco(g, .45, hc * .55, .03, 'pietraScura', x, hc * .3, -.2 * hc * .575 + .02).rotation.x = -Math.atan(.2); }   // doccioni e colature
    capperi(g, Math.round(L / 6), L, 1, hc - 1, 0, .2, L * 3 + h);
    g.userData.misure = [L, h + .1, -zc + D]; return g;
  };

  DOC.bastione = { faccia: 36, fianco: 12, h: 12, garitta: true, nota: 'bastione pentagonale: la gola sta su z = 0 fra x = 0 e x = gola, i fianchi e le facce sporgono verso +Z fino al saliente; muro a scarpa col cordone, parapetto con le cannoniere sui fianchi, garitta pensile sul saliente, stemma su una faccia, doccioni e capperi' };
  T.bastione = o => {
    o = def(o, DOC.bastione); const g = new THREE.Group(), F = o.fianco, h = o.h, hc = h - 2.4, hT = h - 1.9, G = Math.max(16, o.faccia * .8), df = Math.sqrt(Math.max(1, o.faccia ** 2 - (G / 2) ** 2));
    const pt = [[0, 0], [G, 0], [G, F], [G / 2, F + df], [0, F]], sg = areaP(pt) > 0 ? 1 : -1, pb = allarga(pt, [0, hc * .2, hc * .2, hc * .2, hc * .2]);
    tronco(g, pb, pt, hc, 'tufo', 0, 0, 0); prisma(g, pt, hT - hc, 'tufo', 0, hc, 0);                // la scarpa e il terrapieno
    for (let i = 1; i < 5; i++) { const a = pt[i], b = pt[(i + 1) % 5], gq = sulLato(g, a, b, sg), l = gq.userData.l, fianco = i === 1 || i === 4;
      cilX(gq, .32, l + .5, 10, 'pietraChiara', 0, hc, .05);                          // cordone
      blocco(gq, l + 2.4, .7, 3, 'tufo', 0, hT, -1.5);                                                  // parapetto basso
      const nc = fianco ? Math.max(1, Math.round(l / 6)) : 0, gap = 1.1; let xa = -l / 2 - 1.2;
      for (let k = 0; k <= nc; k++) { const xb = k < nc ? -l / 2 + (k + .5) * l / nc - gap / 2 : l / 2 + 1.2; blocco(gq, xb - xa, h - hT - .7, 3, 'tufo', (xa + xb) / 2, hT + .7, -1.5); xa = xb + gap; }   // merloni e cannoniere
      if (!LOD) { blocco(gq, l + 2.4, .1, 3.1, 'pietraChiara', 0, h, -1.5); for (let x = -l / 2 + 4; x < l / 2 - 2; x += 9) blocco(gq, .3, .25, 1, 'pietraChiara', x, hT - .5, .35); }
      capperi(gq, Math.round(l / 8), l, 1, hc - 1, hc * .2, .2, i * 17 + l, -l / 2);
      if (i === 2 && !LOD) stemma(gq, 2.2, 'pietraChiara', 0, hc - 2.2, .2 * 2.2 + .18, 0); }
    prisma(g, allarga(pt, [0, -3, -3, -3, -3]), .06, 'terra', 0, hT, 0);                               // il terrapieno di terra battuta
    if (o.garitta) { const gr = grp(g, G / 2, hT, F + df - .2);
      add(gr, geoCache(`GR${LOD}`, () => new THREE.CylinderGeometry(1.1, .2, 1.8, LOD ? 8 : 14)), 'pietraChiara', 0, -.9, .4);   // la mensola a cono
      cil(gr, 1.0, 1.0, 2.4, 14, 'tufo', 0, 0, .4); if (!LOD) for (const t of [-.8, 0, .8]) blocco(gr, .12, .5, .2, 'buio', Math.sin(t) * .95, 1.2, .4 + Math.cos(t) * .95).rotation.y = t;
      add(gr, new THREE.SphereGeometry(1.12, LOD ? 8 : 14, LOD ? 4 : 7, 0, PI * 2, 0, HP), 'pietraChiara', 0, 2.4, .4); add(gr, new THREE.SphereGeometry(.14, 8, 6), 'pietraChiara', 0, 3.55, .4); }
    g.userData.misure = [G + hc * .4, h + (o.garitta ? 3.7 : .1), F + df + hc * .2 + .6]; return g;
  };

  DOC.fossato = { L: 30, w: 15, prof: 5, ponte: true, rivellino: true, nota: 'fossato asciutto lungo X: fondo d\'erba a −prof (quotaPosa), escarpa a scarpa sul lato −Z (la Rocca), controscarpa diritta con la copertina e il parapetto sul lato +Z; ponte in muratura ad archi con l\'ultimo tratto levatoio di legno con le catene; oltre la controscarpa il rivellino triangolare, tronco in punta, con l\'androne a volta che la strada passa da parte a parte. Il piano della città è y = 0' };
  T.fossato = o => {
    o = def(o, DOC.fossato); const g = new THREE.Group(), L = o.L, w = o.w, pr = o.prof, xc = L / 2;
    blocco(g, L, .3, w + 1, 'erba', xc, -pr, w / 2);                                                  // il fondo
    sezione(g, [[pr * .2, -pr], [0, 0], [-1.5, 0], [-1.5, -pr]], L, 'tufo', 0, 0, 0);   // l'escarpa a scarpa (la cortina ci sale sopra)
    blocco(g, L, pr, 1.6, 'tufo', xc, -pr, w + .8); blocco(g, L, .18, 1.9, 'pietraChiara', xc, 0, w + .8, LOD ? 0 : .03); for (const s of [-1, 1]) { const lp2 = o.ponte ? L / 2 - 2.6 : L / 2; blocco(g, lp2, .7, .5, 'tufo', xc + s * (L / 2 - lp2 / 2), .18, w + 1.4); }   // controscarpa, copertina e parapetto (aperto sul ponte)
    capperi(g, Math.round(L / 6), L, -pr + .6, -.6, w - .1, 0, L * 5 + w, 0);
    if (!LOD) { blocco(g, L, .35, .03, 'verdeScuro', xc, -pr + .3, w - .015); blocco(g, L, .35, .03, 'verdeScuro', xc, -pr + .3, .2 * (pr - .475) + .02).rotation.x = -Math.atan(.2); }   // l'umido al piede
    if (o.ponte) { const wb = 4.6, lp = Math.min(5, w * .35), zs = lp, ls = w - zs;                 // il ponte: archi di pietra fino a zs, poi il levatoio
      const na = Math.max(1, Math.round(ls / 6)), wa = ls / na - 1.4, gp = grp(g, xc, -pr, zs, -HP);
      pareteArchi(gp, ls, pr - .3, wb, Array.from({ length: na }, (_, i) => ({ x: (i + .5) * ls / na, w: Math.min(wa, pr * 1.4), h: Math.min(pr - 1.1, Math.min(wa, pr * 1.4) / 2 + pr * .45) })), 'tufo', 0, .3, 0);
      for (const s of [-1, 1]) blocco(g, .45, .9, ls, 'tufo', xc + s * (wb / 2 - .22), 0, zs + ls / 2); blocco(g, wb - .9, .06, ls, 'pietra', xc, 0, zs + ls / 2);   // parapetti e selciato
      blocco(g, wb - .6, .3, lp + .2, 'legno', xc, -.3, lp / 2); if (!LOD) { for (let z = .4; z < lp; z += .5) blocco(g, wb - .6, .04, .1, 'legnoScuro', xc, 0, z); for (const s of [-1, 1]) { cil(g, .25, .25, 3.2, 8, 'pietraChiara', xc + s * (wb / 2 + .1), 0, -.4); asta(g, [xc + s * (wb / 2 - .4), 0, lp - .2], [xc + s * (wb / 2 + .1), 3.1, -.4], .04, 'ferroScuro'); } }   // il levatoio con le catene sui piloni
      if (!LOD) for (let i = 0; i < na; i++) blocco(gp, .3, pr * .5, .03, 'pietraScura', (i + 1) * ls / na - .7 * (i < na - 1 ? 1 : 0) - .2, .5, wb / 2 + .01); }
    if (o.rivellino) { const R = Math.min(12, L * .4), Dr = R * .9, hR = 4.2, z0 = w + 1.6, wp = 2.6, dT = Dr * (1 - wp / R);  // il rivellino: due metà a scarpa e l'androne in mezzo
      const half = s => [[xc + s * wp, z0], [xc + s * R, z0], [xc + s * wp, z0 + Dr * (1 - wp / R)]];
      for (const s of [-1, 1]) { const p = half(s), sgn = areaP(p) > 0 ? 1 : -1; tronco(g, allarga(p, [0, .6, 0]), p, hR, 'tufo', 0, 0, 0); const gq = sulLato(g, p[1], p[2], sgn, hR); blocco(gq, gq.userData.l + .6, .9, .7, 'tufo', 0, 0, -.35); }
      pareteArchi(g, wp * 2 + .2, hR, dT, [{ x: wp + .1, w: 3.6, h: 3.4 }], 'tufo', xc - wp - .1, 0, z0 + dT / 2);   // l'androne a volta
      if (!LOD) { for (const zc of [z0 + .1, z0 + dT - .1]) conci(g, 1.8, .4, 7, 'pietraChiara', xc, 1.6, zc); blocco(g, 1.2, .45, .04, 'pietraChiara', xc, 3.65, z0 - .02); blocco(g, wp * 2 + .4, .12, .5, 'pietraChiara', xc, hR, z0 + dT - .25); } }   // le ghiere dei due fornici (il rivellino è tronco in punta: la strada lo passa da parte a parte)
    g.userData.quotaPosa = -pr; g.userData.misure = [L, pr + 3.3, w + 2 + (o.rivellino ? 12 : 0)]; return g;
  };

  DOC.torrione = { r: 7, h: 16, lanterna: true, nota: 'torrione tondo aragonese: scarpa troncoconica, cordone, fusto con le feritoie, beccatelli di pietra sotto il parapetto sporgente, merli; sulla terrazza la lanterna bianca col ballatoio; porta ad arco verso −Z, cannoniere e stemma verso +Z. Centro in (raggio di base, 0, 0)' };
  T.torrione = o => {
    o = def(o, DOC.torrione); const g = new THREE.Group(), r = o.r, H = o.h, hs = H * .42, rb = r + hs * .18, cx = rb, seg = LOD ? 16 : 28, yB = H - 1.6;
    cil(g, rb, r, hs, seg, 'tufo', cx, 0, 0); toro(g, r + .02, .3, seg, 'pietraChiara', cx, hs, 0, HP, 0);   // scarpa e cordone
    cil(g, r, r, yB - hs, seg, 'tufo', cx, hs, 0);                                                     // il fusto
    const nb = Math.round(2 * PI * r / 1.3); if (!LOD) for (let k = 0; k < nb; k++) mensola(grp(g, cx, 0, 0, k * 2 * PI / nb), .75, 1, .45, 'pietraChiara', 0, yB, r - .02);   // beccatelli
    tornito(g, [[r - .4, 0], [r + .75, 0], [r + .75, 1.6], [r - .4, 1.6], [r - .4, 0]], seg, 'tufo', cx, yB, 0);   // parapetto sporgente
    const nm = Math.round(2 * PI * (r + .2) / 2); for (let k = 0; k < nm; k++) blocco(grp(g, cx, 0, 0, k * 2 * PI / nm), 1, 1.1, 1, 'tufo', 0, H, r + .18, LOD ? 0 : .04);   // merli
    if (!LOD) { for (let k = 0; k < 4; k++) blocco(grp(g, cx, 0, 0, PI / 4 + k * HP), .25, 1.5, .12, 'buio', 0, hs + 2 + k * 1.6, r - .02);   // feritoie
      for (const t of [-.5, 0, .5]) blocco(grp(g, cx, 0, 0, t), .6, .45, .4, 'buio', 0, 1.6, rb - .5);   // cannoniere sulla scarpa
      stemma(g, 2, 'pietraChiara', cx, yB - 2.6, r - .02, 0); }
    const gd = grp(g, cx, 0, 0, PI); vano(gd, 2, 2.9, 'arco', 'pietraChiara', 0, 0, rb - .12, .3); vano(gd, 1.4, 2.5, 'arco', 'legno', 0, 0, rb - .05, .3);   // la porta
    if (o.lanterna) { const gl = grp(g, cx, yB, 0);
      cil(gl, 1.7, 1.7, 2.4, 16, 'bianco', 0, 0, 0); vano(gl, .8, 1.8, 'arco', 'legno', 0, 0, 1.68, .06);
      cil(gl, 2.1, 2.1, .15, 16, 'pietraChiara', 0, 2.4, 0); if (!LOD) { for (let i = 0; i < 12; i++) { const t = i * PI / 6; blocco(gl, .04, .9, .04, 'ferro', Math.cos(t) * 2, 2.55, Math.sin(t) * 2); } toro(gl, 2, .03, 24, 'ferro', 0, 3.43, 0, HP, 0); }
      cil(gl, 1.1, 1.1, 1.5, 12, 'vetro', 0, 2.55, 0); add(gl, new THREE.SphereGeometry(.35, 10, 8), 'lampada', 0, 3.3, 0);
      cil(gl, 1.25, .15, .9, 12, 'piombo', 0, 4.05, 0); add(gl, new THREE.SphereGeometry(.15, 8, 6), 'ottone', 0, 5, 0); }
    else { blocco(g, .1, 6, .1, 'ferro', cx, yB, 0); }
    g.userData.misure = [2 * rb, H + (o.lanterna ? 3.6 : 4.4), 2 * rb]; return g;
  };

  DOC.caserma = { L: 60, piani: 2, p: 10, nota: 'caserma spagnola lunga addossata alla cortina (il retro cieco a −Z): zoccolo, cantonali di tufo, finestre con le cornici e le inferriate al piano terra, porte ad arco, portale col bugnato, la ghiera e lo stemma, fasce marcapiano, tetto di coppi a una falda verso la piazza d\'armi (+Z), gronda, comignoli in fila' };
  T.caserma = o => {
    o = def(o, DOC.caserma); const g = new THREE.Group(), L = o.L, P = o.p, hp = 4.2, hW = o.piani * hp + .6, zF = P / 2, nB = Math.max(3, Math.round(L / 4)), bay = L / nB, im = Math.floor(nB / 2), r = caso(L * 11 + o.piani);
    blocco(g, L, .7, P + .2, 'pietra', L / 2, 0, 0, .03); blocco(g, L, hW - .7, P, 'intonaco', L / 2, .7, 0);
    for (let i = 0; i < nB; i++) { const x = (i + .5) * bay;
      if (i === im) { vano(g, 3.6, 4.2, 'arco', 'pietraChiara', x, 0, zF + .06, .12); vano(g, 2.6, 3.6, 'arco', 'legno', x, 0, zF + .1, .06); conci(g, 1.3, .3, 9, 'pietraChiara', x, 2.3, zF + .1); if (o.piani > 1) stemma(g, 1.6, 'pietraChiara', x, 5.3, zF, 0); continue; }   // il portale
      if (i % 3 === 1) { vano(g, 1.5, 2.8, 'arco', 'legno', x, .3, zF + .03, .06); blocco(g, 1.7, .3, .4, 'pietraChiara', x, 0, zF + .2); }
      else { finestra(g, 1, 1.3, x, 1.5, zF, { cimasa: false }); if (!LOD) for (let k = 0; k < 4; k++) blocco(g, .04, 1.34, .04, 'ferro', x - .37 + k * .25, 1.46, zF + .1); }   // finestre con l'inferriata
      for (let p = 1; p < o.piani; p++) finestra(g, 1, 1.6, x, p * hp + 1.3, zF, { cimasa: false, vetro: r() < .3 ? 'legno' : 'buio' }); }
    for (let p = 1; p < o.piani; p++) blocco(g, L, .2, .2, 'pietraChiara', L / 2, p * hp + .55, zF + .08);   // fasce marcapiano
    if (!LOD) for (const [xe, s] of [[0, 1], [L, -1]]) for (let y = .7, k = 0; y < hW - .3; y += .45, k++) { const lx = k % 2 ? .9 : .5, lz = k % 2 ? .5 : .9; blocco(g, lx, .42, lz, 'tufo', xe + s * (lx / 2 - .03), y, zF - lz / 2 + .03); }   // cantonali
    sezione(g, [[-zF - .2, hW + 1.6], [zF + .7, hW - .1], [zF + .7, hW + .05], [-zF - .2, hW + 1.75]], L + .4, 'coppi', -.2, 0, 0);   // tetto a una falda
    sezione(g, [[-zF, hW], [zF, hW], [-zF, hW + 1.62]], L, 'intonaco', 0, 0, 0);                       // il sottotetto
    if (!LOD) cilX(g, .1, L + .4, 6, 'zinco', L / 2, hW - .12, zF + .7);                               // la gronda
    for (let x = 4; x < L - 2; x += 8) { cil(g, .35, .35, 1.4, 6, 'intonaco', x, hW + 1.2, -zF + 1); if (!LOD) blocco(g, .9, .1, .9, 'coppi', x, hW + 2.6, -zF + 1); }   // comignoli
    g.userData.misure = [L + .4, hW + 2.8, P + .9]; return g;
  };

  DOC.polveriera = { L: 12, p: 8, cinta: true, nota: 'polveriera: aula a muri spessi con i contrafforti a scarpa, tetto a capanna di lastre di pietra, timpani, porta di ferro con la cornice, feritoie d\'aerazione a baionetta, parafulmini e la lapide; muro di cinta a 3 m con il cancello verso +Z e il cortile di terra battuta' };
  T.polveriera = o => {
    o = def(o, DOC.polveriera); const g = new THREE.Group(), L = o.L, P = o.p, hW = 4.5, d = 3, xc = L / 2 + (o.cinta ? d + .5 : 0), zF = P / 2;
    blocco(g, L, hW, P, 'tufo', xc, 0, 0); tettoFalde(g, L, P, P * .32, 'pietra', xc - L / 2, hW, 0, .35);   // aula e tetto di lastre
    for (const s of [-1, 1]) { const tri = new THREE.Shape(); tri.moveTo(-P / 2, 0); tri.lineTo(P / 2, 0); tri.lineTo(0, P * .32); tri.lineTo(-P / 2, 0); const geo = new THREE.ExtrudeGeometry(tri, { depth: .4, bevelEnabled: false }); geo.translate(0, 0, -.2); add(g, geo, 'tufo', xc + s * (L / 2 - .2), hW, 0, 0, HP); }   // i timpani
    const nc = Math.max(2, Math.round(L / 4)); for (let i = 0; i <= nc; i++) for (const s of [-1, 1]) { const x = xc - L / 2 + .5 + i * (L - 1) / nc; sezione(g, [[0, 0], [1.4, 0], [.3, hW - .4], [0, hW - .4]].map(p => [s * (zF + p[0] - .02), p[1]]), .9, 'tufo', x - .45, 0, 0);   // contrafforti
      if (!LOD && i < nc) { const gq = grp(g, x + (L - 1) / nc / 2, 0, 0, s > 0 ? 0 : PI); blocco(gq, .14, .9, .06, 'buio', 0, 2.6, zF + .02); blocco(gq, .5, .14, .06, 'buio', .18, 2.6 + .9, zF + .02); } }   // feritoie a baionetta
    if (!LOD) { vano(g, 2, 2.8, 'rett', 'pietraChiara', xc, 0, zF + .05, .1); }
    vano(g, 1.4, 2.4, 'rett', 'ferroScuro', xc, 0, zF + .1, .06);                                     // la porta di ferro
    if (!LOD) { for (let y = .4; y < 2.4; y += .5) blocco(g, 1.4, .04, .04, 'ferro', xc, y, zF + .14); blocco(g, 1.6, .5, .08, 'pietraChiara', xc, 3.1, zF + .04); scritta(g, 'POLVERIERA 1678', 1.5, .3, xc, 3.35, zF + .09, 0, '#4a4036');
      for (const s of [-1, 1]) { blocco(g, .04, 2.2, .04, 'ferro', xc + s * (L / 2 - .5), hW + P * .32 - .5, 0); add(g, new THREE.SphereGeometry(.08, 6, 4), 'ottone', xc + s * (L / 2 - .5), hW + P * .32 + 1.72, 0); } }   // lapide e parafulmini
    if (o.cinta) { const W = L + 2 * d + 1, Dz = P + 2 * d + 1, hc = 3, ga = 2.6;                      // il muro di cinta e il cortile
      blocco(g, W, .05, Dz, 'terra', W / 2, 0, 0);
      for (const s of [-1, 1]) { blocco(g, .5, hc, Dz, 'tufo', s > 0 ? W - .25 : .25, 0, 0); blocco(g, .6, .12, Dz + .1, 'pietraChiara', s > 0 ? W - .25 : .25, hc, 0); }
      blocco(g, W, hc, .5, 'tufo', W / 2, 0, -Dz / 2 + .25); blocco(g, W + .1, .12, .6, 'pietraChiara', W / 2, hc, -Dz / 2 + .25);
      for (const s of [-1, 1]) { const lw = (W - ga) / 2 - .6; blocco(g, lw, hc, .5, 'tufo', s > 0 ? W - lw / 2 : lw / 2, 0, Dz / 2 - .25); blocco(g, lw + .1, .12, .6, 'pietraChiara', s > 0 ? W - lw / 2 : lw / 2, hc, Dz / 2 - .25);
        blocco(g, .7, hc + .6, .7, 'pietraChiara', xc + s * (ga / 2 + .35), 0, Dz / 2 - .25, LOD ? 0 : .03); }
      if (!LOD) for (let x = -ga / 2 + .1; x <= ga / 2 - .1; x += .16) blocco(g, .03, 2.2, .03, 'ferroScuro', xc + x, 0, Dz / 2 - .25);   // il cancello
      blocco(g, ga, .06, d + .5, 'pietra', xc, 0, zF + (d + .5) / 2); }
    g.userData.misure = o.cinta ? [L + 2 * d + 1, hW + P * .32 + 1.8, P + 2 * d + 1] : [L, hW + P * .32 + 1.8, P + 2.8]; return g;
  };

  DOC.porta_monumentale = { w: 10, h: 12, fornice: 4.2, merli: true, scritta: 'ANNO MDCLXXXII', nota: 'la porta della Rocca: massa di tufo profonda 6 m con l\'androne, paraste bugnate, ghiera di conci col mascherone in chiave, le fessure dei bolzoni del ponte levatoio, trabeazione con la scritta, attico con lo stemma coronato fra le volute, merli (o pinnacoli); ante aperte nell\'androne, lanterna a braccio' };
  T.porta_monumentale = o => {
    o = def(o, DOC.porta_monumentale); const g = new THREE.Group(), W = o.w, H = o.h, D = 6, wf = Math.min(o.fornice, W * .45), hf = Math.min(H * .55, wf * 1.55), zF = D / 2, hE = hf + 1.6, xc = W / 2;
    pareteArchi(g, W, H, D, [{ x: xc, w: wf, h: hf }], 'tufo', 0, 0, 0);
    conci(g, wf / 2, .5, 11, 'pietraChiara', xc, hf - wf / 2, zF - .15);
    for (const s of [-1, 1]) { const xp = xc + s * (wf / 2 + 1.1);                                     // paraste bugnate
      for (let y = 0, k = 0; y < hE - .1; y += .55, k++) blocco(g, k % 2 ? 1.5 : 1.9, .5, .35, 'pietraChiara', xp, y, zF + .08, LOD ? 0 : .06);
      if (!LOD) blocco(g, .22, hE - hf - .4, .06, 'buio', xc + s * (wf / 2 - .4), hf + .2, zF + .01); }   // fessure dei bolzoni
    if (!LOD) add(g, new THREE.SphereGeometry(.32, 10, 8), 'pietraChiara', xc, hf + .25, zF + .35);   // mascherone in chiave
    blocco(g, W + .4, 1, .6, 'pietraChiara', xc, hE, zF, LOD ? 0 : .04); cornice(g, W, D, .3, .5, 'pietraChiara', 0, hE + 1, 0);   // trabeazione e cornice
    if (o.scritta) scritta(g, o.scritta, Math.min(W * .7, o.scritta.length * .45), .6, xc, hE + .5, zF + .31, 0, '#4a4036');
    const yS = hE + 1.5 + (H - hE - 1.5) * .45; stemma(g, Math.min(2.6, (H - hE) * .55), 'pietraChiara', xc, yS, zF, 0);
    if (!LOD) for (const s of [-1, 1]) sezione(g, [[zF, 0], [zF + .3, 0], [zF + .3, .5], [zF, 1.6]], .5, 'pietraChiara', xc + s * 2 - .25, hE + 1.5, 0);   // volute (a cuneo)
    blocco(g, W + .2, .3, D + .2, 'pietraChiara', xc, H, 0);
    if (o.merli) merli(g, W, 1.2, .9, 1.6, 'tufo', 0, H + .3, zF - .3, 0, 'ghibellino');
    else for (const x of [.4, W - .4]) { blocco(g, .5, .5, .5, 'pietraChiara', x, H + .3, zF - .3); add(g, new THREE.SphereGeometry(.28, 8, 6), 'pietraChiara', x, H + 1.05, zF - .3); }
    if (!LOD) { for (const s of [-1, 1]) blocco(g, .15, hf - wf / 2, wf / 2 - .1, 'legno', xc + s * (wf / 2 - .1), 0, zF - 1.2 - wf / 4);   // ante spalancate nell'androne
      const xl = xc + wf / 2 + 1.1; asta(g, [xl, 4.2, zF + .24], [xl, 4.2, zF + 1.1], .03, 'ferro'); blocco(g, .25, .35, .25, 'vetro', xl, 3.85, zF + 1.1); blocco(g, .3, .06, .3, 'ferroScuro', xl, 4.2, zF + 1.1); }   // la lanterna a braccio sulla parasta
    conci(g, wf / 2, .4, 9, 'pietraChiara', xc, hf - wf / 2, -zF + .1);
    g.userData.misure = [W + .4, H + (o.merli ? 1.9 : 1.33), D + .9]; return g;
  };

  DOC.mura_tramontana = { L: 30, h: 8, merli: true, scala: true, nota: 'segmento delle mura di tramontana lungo X: fronte a scarpa verso il mare (+Z) poi diritto, camminamento di ronda dietro il parapetto con i merli guelfi, rampa di scale addossata dal lato della città (−Z), feritoie, doccioni, capperi e l\'umido' };
  T.mura_tramontana = o => {
    o = def(o, DOC.mura_tramontana); const g = new THREE.Group(), L = o.L, h = o.h, hs = h * .35, hw = h - 1.4, T2 = 2.6, zo = 1.3;
    sezione(g, [[zo + hs * .2, 0], [zo, hs], [zo, hw], [zo - T2, hw], [zo - T2, 0]], L, 'tufo', 0, 0, 0);   // il muro
    blocco(g, L, 1.4, .6, 'tufo', L / 2, hw, zo - .3);                                                // parapetto
    if (o.merli) merli(g, L, 1.2, 1.1, 2.2, 'tufo', 0, h, zo - .3, 0, 'guelfo'); else blocco(g, L, .12, .7, 'pietraChiara', L / 2, h, zo - .3);
    blocco(g, L, .06, T2 - .6, 'pietra', L / 2, hw, zo - .6 - (T2 - .6) / 2);                        // il camminamento
    if (!LOD) { for (let x = 3; x < L - 1; x += 6) { blocco(g, .2, 1, .1, 'buio', x, hw + .25, zo + .01); blocco(g, .3, .22, .8, 'pietraChiara', x + 3, hw - .4, zo + .3); blocco(g, .4, hw * .5, .03, 'pietraScura', x + 3, hs, zo + .02); }   // feritoie, doccioni e colature
      blocco(g, L, .5, .03, 'tufoScuro', L / 2, 0, zo + hs * .2 - .03).rotation.x = -Math.atan(.2); }
    capperi(g, Math.round(L / 5), L, .8, hs - .3, zo + hs * .2, .2, L * 13 + h);
    if (o.scala) { const n = Math.ceil(hw / .2), a = hw / n, pd = .3, x0 = Math.max(.5, L - n * pd - 1.6), pts = [[x0, 0]]; let x = x0, y = 0;   // la scala addossata, senza parapetto
      for (let i = 0; i < n; i++) { y += a; pts.push([x, y]); x += pd; pts.push([x, y]); } pts.push([Math.min(L, x + 1.2), y], [Math.min(L, x + 1.2), 0]);
      profilo(g, pts, 1.4, 'pietraChiara', 0, 0, zo - T2 - .7); }
    g.userData.misure = [L, h + (o.merli ? 1.2 : .12), T2 + hs * .2 + (o.scala ? 1.4 : 0)]; return g;
  };

  DOC.porta_terra = { w: 6, h: 9, torri: true, nota: 'Porta di Terra della cinta medievale: corpo con il fornice a sesto acuto, la ghiera di conci, la saracinesca alzata che si vede in alto, l\'edicola col santo e la lapide sopra, beccatelli e merli ghibellini; le due torri quadrate avanzate con le feritoie, i beccatelli e i merli' };
  T.porta_terra = o => {
    o = def(o, DOC.porta_terra); const g = new THREE.Group(), w = o.w, h = o.h, D = 6, Wc = w + 4, Hc = h + .22 * w + 4.4, tw = o.torri ? 6.5 : 0, W = Wc + 2 * tw, xc = W / 2, zF = D / 2;
    pareteArchi(g, Wc, Hc, D, [{ x: Wc / 2, w, h, tipo: 'sesto' }], 'tufo', tw, 0, 0);
    const hs = h - w * .65;                                                                          // la ghiera dell'arco acuto: due archi di conci
    if (!LOD) for (const s of [-1, 1]) { const cxA = xc - s * w / 2, gk = grp(g, cxA, hs, zF - .1); for (let i = 0; i < 6; i++) { const t = (s > 0 ? 0 : PI) + s * (i + .5) * (PI / 3) / 6, b = blocco(gk, .45, .5, .4, 'pietraChiara', 0, 0, 0); b.position.set(Math.cos(t) * (w + .25), Math.sin(t) * (w + .25), 0); b.rotation.z = t - HP; } }
    if (!LOD) { blocco(g, w - .1, .25, .3, 'ferroScuro', xc, h - .8, zF - .8); for (let x = -w / 2 + .3; x < w / 2 - .2; x += .45) blocco(g, .08, .7, .08, 'ferroScuro', xc + x, h - 1.4, zF - .8); }   // la saracinesca alzata
    const yL = h + .22 * w + .7, yE = yL + 1; vano(g, 1.5, 2.2, 'arco', 'pietraChiara', xc, yE, zF + .05, .1); vano(g, 1.1, 1.9, 'arco', 'buio', xc, yE + .1, zF + .07, .06);   // l'edicola col santo
    if (!LOD) { cil(g, .2, .16, 1.1, 8, 'bianco', xc, yE + .15, zF - .02); add(g, new THREE.SphereGeometry(.13, 8, 6), 'bianco', xc, yE + 1.38, zF - .02); blocco(g, 1.6, .12, .4, 'pietraChiara', xc, yE - .1, zF + .2); }
    blocco(g, 2.4, .7, .08, 'pietraChiara', xc, yL, zF + .04); scritta(g, 'PORTA DI TERRA', 2.2, .4, xc, yL + .35, zF + .09, 0, '#4a4036');
    const coro = (gx, L2, D2, y, zf) => { if (!LOD) for (let x = .4; x < L2; x += 1.1) mensola(g, .5, .7, .35, 'pietraChiara', gx + x, y, zf); blocco(g, L2 + .1, 1.2, D2 + 1, 'tufo', gx + L2 / 2, y, 0); merli(g, L2, 1.3, .9, 1.7, 'tufo', gx, y + 1.2, zf + .2, 0, 'ghibellino'); };
    coro(tw, Wc, D, Hc, zF);                                                                         // beccatelli e merli del corpo
    if (o.torri) for (const s of [0, 1]) { const x0 = s ? Wc + tw : 0, Ht = Hc + 3;                  // le torri, avanzate di 1,5 m
      blocco(g, tw, Ht, D + 3, 'tufo', x0 + tw / 2, 0, 1.5, LOD ? 0 : .05); blocco(g, tw + .5, 1.2, D + 3.5, 'tufo', x0 + tw / 2, 0, 1.5);   // con lo zoccolo
      if (!LOD) for (let y = 3; y < Ht - 2; y += 4) blocco(g, .22, 1.3, .08, 'buio', x0 + tw / 2, y, zF + 3.01);
      const gt = grp(g, 0, 0, 1.5); for (let x = .4; x < tw && !LOD; x += 1.1) mensola(gt, .5, .7, .35, 'pietraChiara', x0 + x, Ht, (D + 3) / 2);
      blocco(g, tw + .6, 1.2, D + 3.6, 'tufo', x0 + tw / 2, Ht, 1.5); merli(g, tw + .6, 1.3, .9, 1.7, 'tufo', x0 - .3, Ht + 1.2, zF + 3.05, 0, 'ghibellino'); }
    capperi(g, 5, W, 1, h, zF + (o.torri ? 0 : 0), 0, w * 7 + h, 0);
    g.userData.misure = [W + .6, Hc + (o.torri ? 3 : 0) + 2.9, D + (o.torri ? 3.6 : 1)]; return g;
  };


  // ================= 6. IL BOOM: sopraelevata, Vele, INA-Casa, torri (E5-E6) =================
  // antenne della televisione sui tetti piani: n pali con due o tre traverse, sparsi in un rettangolo (x0..x1, z0..z1) sul piano y
  function antenne(g, n, x0, x1, z0, z1, y, seme) {
    if (LOD) return; const r = caso(seme);
    for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), h = 2.5 + r() * 2.5, a = r() * PI; blocco(g, .05, h, .05, 'ferro', x, y, z);
      for (let k = 0; k < 2 + (r() < .5 ? 1 : 0); k++) { const b = blocco(g, 1.4 - k * .35, .03, .03, 'alluminio', x, y + h - .25 - k * .45, z); b.rotation.y = a; } }
  }
  // panni stesi (usura viva): n panni colorati appesi a una faccia che guarda +Z, fra x0 e x1, alla quota y
  const PANNI = ['bianco', 'azzurro', 'rosso', 'giallo', 'bianco', 'blu', 'arancio'];
  function panni(g, n, x0, x1, y, z, seme) { if (LOD) return; const r = caso(seme); for (let i = 0; i < n; i++) blocco(g, .5 + r() * .5, .5 + r() * .4, .03, PANNI[(r() * PANNI.length) | 0], x0 + r() * (x1 - x0), y - .6, z + .02); }

  DOC.sopraelevata = { L: 50, h: 7, w: 10, passo: 25, lampioni: true, nota: 'segmento di sopraelevata lungo X (si accosta traslando di L): pile di cemento ogni passo (25 m) con il plinto, il pulvino a martello, gli appoggi, il pluviale e le colature di ruggine; travi prefabbricate a doppio T, soletta, cordoli, guardrail a lama, rete sul bordo, asfalto con le strisce e i giunti, lampioni a braccio di cemento sopra le pile. h = quota del piano stradale' };
  T.sopraelevata = o => {
    o = def(o, DOC.sopraelevata); const g = new THREE.Group(), L = o.L, H = o.h, W = o.w, sl = .3, hT = 1.4, yS = H - sl, yT = yS - hT, np = Math.max(1, Math.round(L / o.passo)), nb = Math.max(3, Math.round(W / 2.4)), r = caso(L + W * 7 + H);
    for (let i = 0; i < np; i++) { const x = (i + .5) * L / np, yP = yT - 1.2;
      blocco(g, 2.6, .5, 4.6, 'cemento', x, 0, 0, LOD ? 0 : .05); blocco(g, 1.3, yP - .5, 3.2, 'cemento', x, .5, 0, LOD ? 0 : .12);   // plinto e pila
      sezione(g, [[-1.6, yP], [1.6, yP], [W / 2 - .2, yT - .4], [W / 2 - .2, yT], [-W / 2 + .2, yT], [-W / 2 + .2, yT - .4]], 1.8, 'cemento', x - .9, 0, 0);   // pulvino a martello
      if (!LOD) { for (let j = 0; j < nb; j++) blocco(g, 1.2, .1, .6, 'ferroScuro', x, yT - .1, -W / 2 + (j + .5) * W / nb);   // appoggi
        cil(g, .08, .08, yT - .9, 8, 'lamiera', x - .72, .5, 1.5); for (let k = 0; k < 3; k++) blocco(g, .25 + r() * .3, 1.5 + r() * 2.5, .03, k ? 'cementoScuro' : 'ruggine', x - .4 + r() * .8, Math.max(.6, yP - 4.4 + r() * 1.4), 1.615); } }   // pluviale e colature
    for (let j = 0; j < nb; j++) { const z = -W / 2 + (j + .5) * W / nb; blocco(g, L, hT, .28, 'cemento', L / 2, yT, z); if (!LOD) { blocco(g, L, .22, .8, 'cemento', L / 2, yT, z); blocco(g, L, .16, .9, 'cemento', L / 2, yS - .16, z); } }   // travi a doppio T
    blocco(g, L, sl, W, 'cemento', L / 2, yS, 0); blocco(g, L, .06, W - 1.2, 'asfalto', L / 2, H, 0);  // soletta e asfalto
    for (const s of [-1, 1]) { blocco(g, L, .45, .6, 'cemento', L / 2, H, s * (W / 2 - .3), LOD ? 0 : .04);   // cordoli
      blocco(g, L, LOD ? .72 : .32, .06, 'alluminio', L / 2, LOD ? H : H + .4, s * (W / 2 - .85)); if (!LOD) for (let x = 1; x < L; x += 2) blocco(g, .1, .72, .12, 'ferro', x, H, s * (W / 2 - .76));   // guardrail a lama sui paletti
      ringhiera(g, L, 1.1, 'ferro', 0, H + .45, s * (W / 2 - .12), 0, 2.5);                             // la rete del bordo (montanti e correnti)
      blocco(g, L, .02, .15, 'bianco', L / 2, H + .06, s * (W / 2 - 1.3)); }                           // strisce di margine
    if (!LOD) { for (let x = 1.5; x < L - 3; x += 12) blocco(g, 4.5, .02, .15, 'bianco', x + 2.25, H + .06, 0);   // la mezzeria tratteggiata
      for (let i = 0; i <= np; i++) blocco(g, .1, .025, W - 1.2, 'buio', Math.min(L - .05, Math.max(.05, i * L / np)), H + .05, 0); }   // giunti
    if (o.lampioni) for (let i = 0; i < np; i++) { const s = i % 2 ? 1 : -1, gl = lampione(g, 'boom', (i + .5) * L / np, s * (W / 2 - .3), 9); gl.position.y = H + .45; gl.rotation.y = s > 0 ? PI : 0; }
    g.userData.misure = [L, H + (o.lampioni ? 10.5 : 1.6), W + 1.4]; return g;
  };

  DOC.vele = { L: 100, piani: 14, passerelle: 3, gap: 9, base: 14, nota: 'una Vela: due stecche di cemento a gradoni (un gradone ogni due piani, dalla base larga 14 m alla cima stretta) che si guardano attraverso il canyon interno; finestre a nastro e terrazze col parapetto sui gradoni, ballatoi (gallerie) su ogni piano nel canyon, passerelle ogni n piani, torri delle scale, cassoni e antenne in cima, panni stesi e colature. Asse lungo X, simmetrica in z' };
  T.vele = o => {
    o = def(o, DOC.vele); const g = new THREE.Group(), L = o.L, N = o.piani, hp = 2.9, G = o.gap, d0 = o.base, H = N * hp, ns = Math.ceil(N / 2), r = caso(L * 3 + N);
    const d = j => d0 - (d0 - 3.6) * j / Math.max(1, ns - 1), yj = j => Math.min(N, 2 * j) * hp;
    for (const s of [-1, 1]) {
      const pts = [[G / 2, 0]]; for (let j = 0; j < ns; j++) { pts.push([G / 2 + d(j), yj(j)]); pts.push([G / 2 + d(j), yj(j + 1)]); } pts.push([G / 2, H]);
      sezione(g, pts.map(p => [s * p[0], p[1]]), L, 'cemento', 0, 0, 0);                                // la stecca a gradoni
      for (let f = 0; f < N; f++) { const j = f >> 1, z = s * (G / 2 + d(j) + .02);                 // finestre a nastro sui gradoni
        blocco(g, L - 1.2, 1.15, .05, 'buio', L / 2, f * hp + .95, z); }
      for (let j = 0; j < ns - 1; j++) { const z = s * (G / 2 + d(j + 1) + (d(j) - d(j + 1)) - .1); blocco(g, L, 1, .16, 'intonacoGrigio', L / 2, yj(j + 1), z);   // parapetti delle terrazze
        if (!LOD) for (let k = 0; k < 3; k++) { const hh = 1.5 + r() * 2.5; blocco(g, .3 + r() * .3, hh, .03, 'cementoScuro', 2 + r() * (L - 4), yj(j + 1) - .2 - hh, s * (G / 2 + d(j) + .04)); }   // colature
        panni(g, Math.round(L / 25), 2, L - 2, yj(j + 1) + 1.2, s > 0 ? G / 2 + d(j) - .04 : -(G / 2 + d(j)) - .01, j * 7 + s); }   // panni stesi sui parapetti
      for (let f = 1; f < N; f++) { blocco(g, L, .16, 1.6, 'cemento', L / 2, f * hp - .16, s * (G / 2 - .8));   // ballatoi nel canyon
        if (!LOD) blocco(g, L, 1, .1, 'intonacoGrigio', L / 2, f * hp, s * (G / 2 - 1.55)); }
      if (!LOD) for (let f = 0; f < N; f++) blocco(g, L - 1, .9, .04, 'buio', L / 2, f * hp + 1.2, s * (G / 2 - .02));
      blocco(g, L, .9, .2, 'intonacoGrigio', L / 2, H, s * (G / 2 + d(ns - 1) - .1));                  // parapetto in cima
      for (let x = 6; x < L - 4; x += 14) blocco(g, 1.4, 1.3, 1.4, 'cementoScuro', x, H, s * (G / 2 + d(ns - 1) / 2));   // cassoni dell'acqua
      antenne(g, Math.round(L / 10), 2, L - 2, s * (G / 2 + .5), s * (G / 2 + d(ns - 1) - .5), H, L + s * 5);
    }
    const nt = Math.max(1, Math.round(L / 40)); for (let i = 0; i < nt; i++) { const x = (i + .5) * L / nt;   // le torri delle scale nel canyon
      blocco(g, 4.2, H + 2.4, G - 3.2, 'cemento', x, 0, 0, LOD ? 0 : .05); if (!LOD) for (const s of [-1, 1]) blocco(g, .6, H - 2, .04, 'buio', x + s * 1.2, 1.5, 0).position.z = G / 2 - 1.58; }
    const pf = Math.max(1, o.passerelle); for (let f = pf; f < N; f += pf) for (let x = 10; x < L - 5; x += 20) { if (Array.from({ length: nt }, (_, i) => (i + .5) * L / nt).some(xt => Math.abs(xt - x) < 4)) continue;   // passerelle fra le gallerie
      blocco(g, 2, .2, G - 3.2, 'cemento', x, f * hp - .2, 0); if (!LOD) for (const s of [-1, 1]) blocco(g, .08, 1, G - 3.2, 'intonacoGrigio', x + s * .96, f * hp, 0); }
    g.userData.misure = [L, H + 5, G + 2 * d0]; return g;
  };

  DOC.ina_casa = { L: 48, piani: 4, scale: 2, p: 10, colore: 'ocra', nota: 'stecca INA-Casa degli anni Cinquanta: piano terra rialzato in mattoni, piani sopra intonacati (colore), tetto a capanna di tegole con le gronde, vani scala con la griglia di mattoni, ingresso con la pensilina sottile e la targa di maiolica, finestre con le tapparelle a mezz\'asta, balconi con la ringhiera a correnti, marciapiede; il retro (−Z) più semplice' };
  T.ina_casa = o => {
    o = def(o, DOC.ina_casa); const g = new THREE.Group(), L = o.L, P = o.p, N = o.piani, hp = 3, h0 = .6, H = h0 + N * hp, zF = P / 2, ns = Math.max(1, o.scale), r = caso(L * 5 + N * 3 + ns);
    blocco(g, L, h0 + hp, P, 'mattone', L / 2, 0, 0); blocco(g, L, H - h0 - hp, P, o.colore, L / 2, h0 + hp, 0);   // piano terra in mattoni, sopra l'intonaco
    blocco(g, L + .1, .18, P + .1, 'cemento', L / 2, h0 + hp - .1, 0);                                // il marcapiano di cemento
    tettoFalde(g, L, P, 2.4, 'tegole', 0, H, 0, .55);
    for (const xe of [.15, L - .15]) { const tri = new THREE.Shape(); tri.moveTo(-zF, 0); tri.lineTo(zF, 0); tri.lineTo(0, 2.4); tri.lineTo(-zF, 0); const geo = new THREE.ExtrudeGeometry(tri, { depth: .3, bevelEnabled: false }); geo.translate(0, 0, -.15); add(g, geo, o.colore, xe, H, 0, 0, HP); }   // i timpani
    blocco(g, L + 2, .15, 1.6, 'cemento', L / 2, 0, zF + .8);                                        // marciapiede
    const xs = Array.from({ length: ns }, (_, k) => L * (k + .5) / ns);
    xs.forEach((x, k) => { blocco(g, 1.6, H - h0 - hp - .4, .08, LOD ? 'buio' : 'mattone', x, h0 + hp + .2, zF + .04);   // la griglia del vano scala
      if (!LOD) { for (let y = h0 + hp + .5; y < H - .4; y += .45) blocco(g, 1.4, .2, .02, 'buio', x, y, zF + .09); }
      vano(g, 1.6, 2.5, 'rett', 'vetro', x, h0, zF + .04, .06); blocco(g, 2.6, .12, 1.4, 'cemento', x, h0 + 2.7, zF + .7);   // portone vetrato e pensilina
      blocco(g, 2, h0, 1, 'pietraChiara', x, 0, zF + .5); if (!LOD) { blocco(g, .5, .5, .04, 'azzurro', x + 1.3, 1.9, zF + .02); blocco(g, .4, .4, .02, 'bianco', x + 1.3, 1.95, zF + .05); } });   // scalino e targa di maiolica
    const finestre = (zf, fronte) => { for (let f = 0; f < N; f++) { const y = h0 + f * hp + .9;
      for (let x = 1.8; x < L - 1; x += 3.2) { if (xs.some(xx => Math.abs(xx - x) < 1.8)) continue;
        const gq = grp(g, x, 0, zf, fronte ? 0 : PI); finestra(gq, 1.2, 1.4, 0, y, 0, { cornice: 'cemento', cimasa: false });
        if (!LOD) { const ht = .2 + r() * .9; blocco(gq, 1.2, ht, .04, 'intonacoGrigio', 0, y + 1.4 - ht, .07); }   // tapparella calata a mezz'asta
        if (fronte && f > 0 && Math.floor(x / 3.2) % 2 === 0) { blocco(gq, 2.6, .15, 1.2, 'cemento', 0, y - .9, .6); if (!LOD) { for (const yy of [.35, .65, .95]) blocco(gq, 2.6, .04, .04, 'ferro', 0, y - .75 + yy, 1.18); for (const dx of [-1.28, 1.28]) blocco(gq, .05, 1, .05, 'ferro', dx, y - .75, 1.18); } } } } };   // balconi
    finestre(zF, true); finestre(-zF, false);
    for (const s of [-1, 1]) for (let f = 1; f < N; f++) finestra(grp(g, s > 0 ? L : 0, 0, 0, s * HP), .7, 1, 0, h0 + f * hp + 1, 0, { cornice: 'cemento', cimasa: false });   // finestrelle sui timpani
    if (!LOD) for (let x = 4; x < L - 2; x += 9) cil(g, .25, .25, 1.6, 6, o.colore, x, H + .9, -zF + 1.8);   // comignoli
    g.userData.misure = [L + 2, H + 2.6, P + 1.6]; return g;
  };

  DOC.torre_boom = { piani: 12, lato: 18, parcheggio: true, negozi: true, nota: 'torre della speculazione (1960-80): piano terra di negozi con le serrande, le insegne e la pensilina, androne vetrato; sopra balconi a nastro con i parapetti, portefinestre e tapparelle a caso, fianchi ciechi con le colature; tetto piano col parapetto, il locale macchine, i cassoni e la selva di antenne; davanti (+Z) il parcheggio d\'asfalto con gli stalli, il cordolo e il lampione' };
  T.torre_boom = o => {
    o = def(o, DOC.torre_boom); const g = new THREE.Group(), N = o.piani, Lx = o.lato, Pz = Math.round(o.lato * .8), hp = 3, h0 = 4.2, H = h0 + (N - 1) * hp, zF = Pz / 2, r = caso(N * 31 + Lx);
    blocco(g, Lx, H, Pz, 'intonacoGrigio', Lx / 2, 0, 0);                                            // il corpo
    blocco(g, Lx + .3, .25, Pz + .3, 'cemento', Lx / 2, h0 - .25, 0);
    for (const s of [1, -1]) { const gs = grp(g, Lx / 2, 0, 0, s > 0 ? 0 : PI);                      // fronte e retro
      for (let f = 1; f < N; f++) { const y = h0 + (f - 1) * hp, wb = Lx * .72;
        blocco(gs, Lx - 1.2, 2.3, .04, 'buio', 0, y + .2, zF + .02);                                  // portefinestre
        if (!LOD) for (let k = 0; k < 5; k++) { const hh = .3 + r() * 1.8; blocco(gs, (Lx - 1.2) / 5 - .1, hh, .05, 'alluminio', -Lx / 2 + .6 + (k + .5) * (Lx - 1.2) / 5, y + 2.5 - hh, zF + .05); }   // tapparelle
        blocco(gs, wb, .18, 1.5, 'cemento', 0, y, zF + .75); blocco(gs, wb, 1, .1, f % 2 ? 'intonaco' : 'bianco', 0, y + .18, zF + 1.45);   // balcone a nastro col parapetto
        if (!LOD) for (const dx of [-wb / 2 + .05, wb / 2 - .05]) blocco(gs, .1, 1, 1.4, 'intonaco', dx, y + .18, zF + .75);
        if (!LOD && r() < .35) panni(gs, 2, -wb / 2 + 1, wb / 2 - 1, y + 1.25, zF + 1.5, f * 13 + s); }
      if (!LOD) for (let k = 0; k < 4; k++) blocco(gs, .3, 3 + r() * 8, .03, 'cementoScuro', -Lx / 2 + 1 + r() * (Lx - 2), h0 + r() * (H - h0 - 10), zF + .01); }
    for (const s of [-1, 1]) { const gs = grp(g, Lx / 2, 0, 0, s * HP);                                // fianchi ciechi: solo i bagni e le colature
      for (let f = 1; f < N; f++) blocco(gs, .6, .8, .04, 'buio', Pz * .25, h0 + (f - 1) * hp + 1.4, Lx / 2 + .02);
      if (!LOD) for (let k = 0; k < 3; k++) blocco(gs, .4, 4 + r() * 10, .03, 'cementoScuro', -Pz / 2 + 1 + r() * (Pz - 2), h0 + r() * (H - h0 - 14), Lx / 2 + .01); }
    if (o.negozi) { const nn = Math.max(2, Math.round(Lx / 5)), wn = Lx / nn, ins = ['BAR', 'TABACCHI', 'FERRAMENTA', 'ALIMENTARI', 'PARRUCCHIERE', 'ELETTRODOMESTICI'];
      for (let i = 0; i < nn; i++) { const x = (i + .5) * wn, mid = i === Math.floor(nn / 2);
        if (mid) { vano(g, wn - 1, 3, 'rett', 'vetro', x, 0, zF + .04, .06); continue; }               // l'androne vetrato
        const su = r() < .5; vano(g, wn - .8, 3, 'rett', su ? 'vetro' : 'alluminio', x, 0, zF + .04, .06);   // serranda alzata (vetrina) o abbassata
        if (!LOD) { if (su) blocco(g, wn - .8, .4, .08, 'alluminio', x, 2.6, zF + .1); const c = ['rosso', 'blu', 'giallo', 'verde', 'arancio'][(r() * 5) | 0]; blocco(g, wn - .6, .6, .12, c, x, 3.25, zF + .06); scritta(g, ins[(i * 5 + N) % ins.length], wn - 1, .45, x, 3.55, zF + .13, 0, '#ffffff'); } }   // insegne
      blocco(g, Lx + 1, .15, 1.6, 'cemento', Lx / 2, 3.9, zF + .8); }                                    // pensilina
    blocco(g, Lx, .9, .2, 'intonacoGrigio', Lx / 2, H, zF - .1); blocco(g, Lx, .9, .2, 'intonacoGrigio', Lx / 2, H, -zF + .1);   // parapetti del tetto
    for (const s of [-1, 1]) blocco(g, .2, .9, Pz, 'intonacoGrigio', s > 0 ? Lx - .1 : .1, H, 0);
    blocco(g, 3.4, 2.8, 3, 'intonacoGrigio', Lx * .35, H, -zF * .2);                                 // locale macchine
    for (let k = 0; k < 4; k++) blocco(g, 1.3, 1.1, 1, 'cementoScuro', Lx * .6 + (k % 2) * 1.6, H, -zF * .3 + (k >> 1) * 1.3);   // cassoni
    antenne(g, Math.round(Lx * .6), 1, Lx - 1, -zF + 1, zF - 1, H, N * 7 + Lx);
    if (o.parcheggio) { const Dp = 16;                                                              // il parcheggio davanti
      blocco(g, Lx + 6, .06, Dp, 'asfalto', Lx / 2, 0, zF + 1.6 + Dp / 2); blocco(g, Lx + 6, .15, .3, 'cemento', Lx / 2, 0, zF + 1.6 + Dp - .15);
      blocco(g, Lx + 2, .15, 1.6, 'cemento', Lx / 2, 0, zF + .8);
      if (!LOD) for (let x = -2; x <= Lx + 2.01; x += 2.5) { blocco(g, .1, .02, 5, 'bianco', x, .06, zF + 1.6 + 3); blocco(g, .1, .02, 5, 'bianco', x, .06, zF + 1.6 + Dp - 3.2); }
      const gl = lampione(g, 'boom', Lx + 2, zF + 1.6 + Dp / 2, 8); gl.rotation.y = -HP; }
    g.userData.misure = [o.parcheggio ? Lx + 6 : Lx + 1, H + 7, Pz + (o.parcheggio ? 18 : 2)]; return g;
  };


  // ================= 7. LE PIETRE MINUTE E IL GARANTE: gradoni, archi, edicole, acqua, Muro, riflettori =================
  DOC.gradone = { L: 12, h: 2.4, P: 4, rampa: true, scala: false, ringhiera: true, nota: 'gradone con il muro di sostegno lungo X: muro di tufo a scarpa col fronte a +Z (il piano basso), terrapieno dietro (−Z) fino a quota h, copertina, ringhiera, barbacani con le colature, capperi; la cordonata (rampa coi cordoni) o la scala addossata al fronte che sale lungo +X' };
  T.gradone = o => {
    o = def(o, DOC.gradone); const g = new THREE.Group(), L = o.L, h = o.h, P = o.P, k = .12;
    sezione(g, [[h * k, 0], [0, h], [-P, h], [-P, 0]], L, 'tufo', 0, 0, 0);                         // muro e terrapieno
    blocco(g, L, .05, P - .5, 'terra', L / 2, h, -P / 2 - .25);
    blocco(g, L, .16, .6, 'pietraChiara', L / 2, h, -.2, LOD ? 0 : .03);                            // copertina
    if (o.ringhiera) ringhiera(g, L, 1, 'ferro', 0, h + .16, -.2, 0, 1.2);
    if (!LOD) for (let x = 1.5; x < L - .5; x += 3) { blocco(g, .12, .12, .3, 'buio', x, h * .3, h * k * .7 - .1); blocco(g, .25, h * .3 - .1, .03, 'tufoScuro', x, .05, h * k * .85 + .01).rotation.x = -Math.atan(k); }   // barbacani e colature
    capperi(g, Math.max(1, Math.round(L / 5)), L, .3, h - .4, h * k, k, L * 17 + h);
    if (o.scala || o.rampa) { const W = 1.8, z0 = h * k * .5 + W / 2, cord = !o.scala;                  // la cordonata o la scala addossata
      const a = cord ? .14 : .17, n = Math.ceil(h / a), pd = Math.min(cord ? .9 : .32, (L - 1.6) / n), aa = h / n, pts = [[0, 0]]; let x = Math.max(0, L - n * pd - 1.4), xi = x; pts[0] = [x, 0];
      for (let i = 0; i < n; i++) { if (cord) { pts.push([x, aa * i + aa * .4]); x += pd; pts.push([x, aa * (i + 1)]); } else { pts.push([x, aa * (i + 1)]); x += pd; pts.push([x, aa * (i + 1)]); } }
      pts.push([Math.min(L, x + 1.4), h], [Math.min(L, x + 1.4), 0]); profilo(g, pts, W, cord ? 'pietra' : 'pietraChiara', 0, 0, z0);
      if (cord && !LOD) for (let i = 0; i < n; i++) blocco(g, .14, .14, W, 'pietraChiara', xi + i * pd + .07, Math.max(0, aa * i + aa * .4 - .1), z0);   // i cordoni
      if (!LOD) asta(g, [xi + .3, 1, z0 + W / 2 - .05], [x, h + 1, z0 + W / 2 - .05], .03, 'ferro');
      if (!LOD) { cil(g, .03, .03, 1, 6, 'ferro', xi + .3, 0, z0 + W / 2 - .05); cil(g, .03, .03, 1, 6, 'ferro', x, h, z0 + W / 2 - .05); } }
    g.userData.misure = [L, h + (o.ringhiera ? 1.16 : .16), P + h * k + (o.scala || o.rampa ? 1.8 : 0)]; return g;
  };

  DOC.arco_sottopasso = { w: 3, h: 3.4, p: 9, piani: 2, nota: 'casa del borgo traversata da un sottopasso a volta (la strada lungo Z): fornice con la ghiera di conci e la chiave sui due fronti, volta a botte, basoli consumati, lampada sotto la volta, piani sopra con le finestre e le persiane, intonaco scrostato con il tufo che affiora, terrazzo col parapetto' };
  T.arco_sottopasso = o => {
    o = def(o, DOC.arco_sottopasso); const g = new THREE.Group(), w = o.w, h = o.h, P = o.p, W = w + 4.4, hp = 3.1, Hh = h + 1 + o.piani * hp, xc = W / 2, r = caso(w * 13 + P);
    pareteArchi(g, W, Hh, P, [{ x: xc, w, h }], 'intonaco', 0, 0, 0);
    blocco(g, w + .4, .06, P + 2, 'pietra', xc, 0, 0);                                                 // basoli
    if (!LOD) for (let z = -P / 2 - .8; z < P / 2 + 1; z += .6) blocco(g, w - .2, .02, .04, 'pietraScura', xc, .06, z);
    for (const s of [1, -1]) { const gg = grp(g, xc, 0, 0, s > 0 ? 0 : PI);
      conci(gg, w / 2, .4, 9, 'tufo', 0, h - w / 2, P / 2 - .12); for (const d of [-1, 1]) blocco(gg, .5, h - w / 2, .3, 'tufo', d * (w / 2 + .25), 0, P / 2 - .1, LOD ? 0 : .02);
      for (let f = 0; f < o.piani; f++) { const y = h + 1.8 + f * hp; for (const d of [-1, 1]) finestra(gg, .9, 1.4, d * (w / 2 + .6), y, P / 2, { persiane: f % 2 ? 'verde' : 'verdeScuro', cimasa: false }); }
      if (!LOD) for (let k = 0; k < 5; k++) { const ww = .5 + r() * 1.1, hh = .3 + r() * .7, x = -W / 2 + .4 + r() * (W - .8 - ww) + ww / 2, y = .8 + r() * (Hh - 2); if (Math.abs(x) < w / 2 + .6 + ww / 2 && y < h + .6) continue; blocco(gg, ww, hh, .02, 'tufo', x, y, P / 2 + .005); } }   // l'intonaco scrostato
    blocco(g, W + .1, .9, .3, 'intonaco', xc, Hh, P / 2 - .15); blocco(g, W + .1, .9, .3, 'intonaco', xc, Hh, -P / 2 + .15); blocco(g, W + .2, .1, P + .2, 'pietraChiara', xc, Hh - .1, 0);   // terrazzo col parapetto
    if (!LOD) { blocco(g, .3, .25, .3, 'ferro', xc, h - .25, 0); blocco(g, .2, .12, .2, 'lampada', xc, h - .37, 0); }
    g.userData.misure = [W + .2, Hh + .9, P + 2]; return g;
  };

  DOC.arco_contrasto = { w: 2.6, h: 4, doppio: false, nota: 'arco di contrasto fra due case di un vicolo (il vicolo corre lungo Z, l\'arco scavalca lungo X): le due fette di muro, l\'arco ribassato con la ghiera e il rinfianco murato sopra; doppio = un secondo arco più in alto' };
  T.arco_contrasto = o => {
    o = def(o, DOC.arco_contrasto); const g = new THREE.Group(), w = o.w, h = o.h, D = .9, hT = h + w / 2 + 1.8 + (o.doppio ? 3.2 : 0), t = .7;
    for (const x of [t / 2, t + w + t / 2]) { blocco(g, t, hT, D + .6, 'intonaco', x, 0, 0); if (!LOD) blocco(g, t + .02, .5, D + .62, 'tufoScuro', x, 0, 0); }   // le fette dei muri, con l'umido
    const geo = geoCache(`AC${w}|${D}|${LOD}`, () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0, w / 2 + .7); s.lineTo(w, w / 2 + .7); s.lineTo(w, 0); s.absarc(w / 2, 0, w / 2, 0, PI, false);
      const e = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: LOD ? 5 : 10 }); e.translate(0, 0, -D / 2); return e; });
    const arco = y => { add(g, geo, 'tufo', t, y, 0); conci(g, w / 2, D + .08, 7, 'pietraChiara', t + w / 2, y, 0); if (!LOD) blocco(g, w, .12, D + .1, 'pietraChiara', t + w / 2, y + w / 2 + .7, 0); };   // l'arco col rinfianco e la copertina
    arco(h); if (o.doppio) arco(h + 3.2);
    g.userData.misure = [w + 2 * t, hT, D + .6]; return g;
  };

  DOC.edicola_votiva = { h: 2, lume: true, tettuccio: true, nota: 'edicola votiva (centrata nell\'origine) su pilastro d\'angolo: zoccolo, fusto intonacato, nicchia con la cornice di pietra, il quadretto della Madonna con l\'aureola, la mensolina coi fiori e il lume rosso col filo, tettuccio di coppi; h = quota del davanzale della nicchia' };
  T.edicola_votiva = o => {
    o = def(o, DOC.edicola_votiva); const g = new THREE.Group(), h = o.h, W = 1.1, D = .6, hn = 1.2, Ht = h + hn + .5;
    blocco(g, W + .2, .4, D + .2, 'pietra', 0, 0, 0, LOD ? 0 : .03); blocco(g, W, Ht - .4, D, 'intonaco', 0, .4, 0);   // pilastro
    vano(g, .9, hn + .2, 'arco', 'pietraChiara', 0, h - .1, D / 2 + .03, .06); vano(g, .7, hn, 'arco', 'buio', 0, h, D / 2 + .065, .02);   // cornice e fondo della nicchia
    blocco(g, .55, .75, .03, 'azzurro', 0, h + .15, D / 2 + .09);                                    // il quadretto
    if (!LOD) { cil(g, .12, .07, .5, 8, 'bianco', 0, h + .2, D / 2 + .13); add(g, new THREE.SphereGeometry(.07, 8, 6), 'intonaco', 0, h + .76, D / 2 + .13); toro(g, .12, .015, 12, 'ottone', 0, h + .78, D / 2 + .11, 0, 0); }   // la Madonna con l'aureola
    blocco(g, 1.0, .08, .35, 'pietraChiara', 0, h - .15, D / 2 + .17);                              // la mensolina
    if (!LOD) { const fio = ['rosso', 'giallo', 'bianco', 'rosso']; fio.forEach((c, i) => { blocco(g, .04, .25, .04, 'verde', -.38 + i * .08, h - .07, D / 2 + .22); add(g, new THREE.SphereGeometry(.06, 6, 4), c, -.38 + i * .08, h + .2, D / 2 + .22); }); blocco(g, .14, .14, .14, 'vetro', -.38 + .12, h - .07, D / 2 + .22); }   // fiori nel vasetto
    if (o.lume) { cil(g, .06, .05, .16, 8, 'faro', .3, h - .07, D / 2 + .22); if (!LOD) asta(g, [.3, h + .09, D / 2 + .22], [.45, Ht - .1, D / 2 + .02], .01, 'buio'); }   // il lume rosso e il filo
    if (o.tettuccio) { sezione(g, [[-D / 2 - .1, 0], [D / 2 + .45, 0], [D / 2 + .45, .1], [-D / 2 - .1, .45]], W + .3, 'coppi', -W / 2 - .15, Ht, 0); }
    else blocco(g, W + .15, .15, D + .15, 'pietraChiara', 0, Ht, 0);
    g.userData.misure = [W + .3, Ht + .45, D + .9]; return g;
  };

  DOC.pozzo = { r: .8, arco: true, nota: 'pozzo (centrato nell\'origine): piattaforma con lo scalino, puteale tondo di pietra con l\'orlo, archetto di ferro battuto con la carrucola, la catena e il secchio di zinco appoggiato; senza arco, il coperchio di legno' };
  T.pozzo = o => {
    o = def(o, DOC.pozzo); const g = new THREE.Group(), r = o.r, hP = .9;
    cil(g, r + .8, r + .8, .15, 16, 'pietra', 0, 0, 0);                                                // la piattaforma
    tornito(g, [[r - .15, 0], [r + .18, 0], [r + .18, hP - .12], [r + .25, hP - .1], [r + .25, hP], [r - .2, hP], [r - .2, hP - .1], [r - .15, hP - .12], [r - .15, 0]], 18, 'pietraChiara', 0, .15, 0);   // puteale con l'orlo
    add(g, new THREE.CircleGeometry(r - .15, 16), 'buio', 0, .3, 0, -HP);                              // il buio del pozzo
    if (o.arco) { for (const s of [-1, 1]) blocco(g, .05, 1.6, .05, 'ferroScuro', s * (r + .05), .15 + hP, 0);
      toro(g, r + .05, .025, 16, 'ferroScuro', 0, .15 + hP + 1.6, 0, 0, 0, PI);                          // l'archetto
      if (!LOD) { const yc = .15 + hP + 1.6 + r + .05 - .12; cilZ(g, .12, .05, 10, 'ferro', 0, yc, 0); blocco(g, .02, r + .8, .02, 'ferro', .12, yc - (r + .8), 0);
        tornito(g, [[0, 0], [.13, 0], [.17, .28], [0, .28]], 10, 'zinco', .12, yc - (r + .8) - .28, 0); } }   // carrucola, catena e secchio
    else { cil(g, r + .2, r + .2, .08, 16, 'legno', 0, .15 + hP, 0); }
    if (!LOD) tornito(g, [[0, 0], [.14, 0], [.18, .3], [0, .3]], 10, 'zinco', r + .5, .15, .3);         // un secchio a terra
    g.userData.misure = [2 * r + 1.6, .15 + hP + (o.arco ? 1.6 + r + .03 : .08), 2 * r + 1.6]; return g;
  };

  DOC.lavatoio = { L: 6, tettoia: true, nota: 'lavatoio pubblico: vasca lunga di pietra con l\'acqua, le lastre inclinate per sfregare sui due lati lunghi, la cannella di ghisa in testa col suo pilastrino, lo scolo; tettoia su pilastri di tufo con le travi e i coppi; selciato' };
  T.lavatoio = o => {
    o = def(o, DOC.lavatoio); const g = new THREE.Group(), L = o.L, W = 1.6, hv = .85, xc = L / 2 + .6;
    blocco(g, L + 3.2, .08, W + 3.4, 'pietra', xc, 0, 0);                                             // selciato
    blocco(g, L, hv, W, 'pietraChiara', xc, .08, 0, LOD ? 0 : .03); blocco(g, L - .3, .03, W - .3, 'acqua', xc, .08 + hv - .15, 0);   // vasca e acqua
    if (!LOD) for (const s of [-1, 1]) for (let x = .6; x < L; x += 1.1) { const b = blocco(g, .9, .06, .5, 'pietra', xc - L / 2 + x, .08 + hv - .05, s * (W / 2 - .05)); b.rotation.x = s * .35; }   // lastre per sfregare
    blocco(g, .4, 1.5, .4, 'pietraChiara', xc - L / 2 - .2, .08, 0); cilX(g, .04, .4, 6, 'ghisa', xc - L / 2 + .2, .08 + 1.2, 0);   // pilastrino e cannella
    if (!LOD) cil(g, .015, .015, 1.2 - hv + .15, 6, 'acqua', xc - L / 2 + .38, .08 + hv - .15, 0);     // il filo d'acqua
    if (o.tettoia) { const hT = 2.6, Wt = W + 2.6;
      for (const x of [-L / 2 - .8, L / 2 + .8]) for (const s of [-1, 1]) blocco(g, .4, hT, .4, 'tufo', xc + x, .08, s * (Wt / 2 - .3), LOD ? 0 : .03);
      for (const s of [-1, 1]) blocco(g, L + 2.4, .22, .2, 'legno', xc, .08 + hT, s * (Wt / 2 - .3));
      if (!LOD) for (let x = -L / 2 - .8; x <= L / 2 + .81; x += .9) blocco(g, .12, .12, Wt, 'legno', xc + x, .08 + hT + .22, 0);
      tettoFalde(g, L + 2.4, Wt - .4, .9, 'coppi', xc - L / 2 - 1.2, .08 + hT + (LOD ? .22 : .34), 0, .35); }
    g.userData.misure = [L + 3.2, o.tettoia ? 4.1 : 1.6, W + 3.4]; return g;
  };

  DOC.fontana = { h: 2.6, lati: 8, cannelle: 2, r: 2.2, nota: 'fontana di piazza (centrata nell\'origine): gradino, vasca poligonale di pietra con l\'orlo e l\'acqua, fusto con la tazza alta, il pomo, le cannelle di ghisa a mascherone coi fili d\'acqua nella vasca' };
  T.fontana = o => {
    o = def(o, DOC.fontana); const g = new THREE.Group(), R = o.r, n = Math.max(4, o.lati), H = o.h, hv = .6, ry = PI / n;
    add(g, new THREE.CylinderGeometry(R + .5, R + .55, .18, n), 'pietra', 0, .09, 0, 0, ry);                  // gradino
    add(g, new THREE.CylinderGeometry(R, R, hv, n), 'pietraChiara', 0, .18 + hv / 2, 0, 0, ry);              // vasca
    add(g, new THREE.CylinderGeometry(R + .08, R + .08, .1, n), 'pietraChiara', 0, .18 + hv + .05, 0, 0, ry);   // orlo
    add(g, new THREE.CylinderGeometry(R - .15, R - .15, .02, n), 'acqua', 0, .18 + hv + .02, 0, 0, ry);
    tornito(g, [[0, 0], [.42, 0], [.42, .2], [.28, .35], [.22, H - .8], [.3, H - .6], [.25, H - .5], [0, H - .5]], 12, 'pietraChiara', 0, .18 + hv, 0);   // fusto
    tornito(g, [[0, 0], [.2, 0], [.75, .25], [.8, .35], [0, .35]], 14, 'pietraChiara', 0, .18 + hv + H - .6, 0);   // tazza
    tornito(g, [[0, 0], [.14, 0], [.18, .15], [.08, .3], [.1, .38], [0, .45]], 10, 'pietraChiara', 0, .18 + hv + H - .25, 0);   // pomo
    for (let k = 0; k < o.cannelle; k++) { const gk = grp(g, 0, 0, 0, k * 2 * PI / o.cannelle), yc = .18 + hv + 1;
      if (!LOD) add(gk, new THREE.SphereGeometry(.13, 8, 6), 'pietraChiara', 0, yc, .27);               // mascherone
      cilZ(gk, .035, .35, 6, 'ghisa', 0, yc, .42);
      if (!LOD) cil(gk, .02, .02, 1 - .02, 6, 'acqua', 0, .18 + hv + .02, .58); }                         // filo d'acqua
    g.userData.misure = [2 * R + 1.1, .18 + hv + H - .25 + .45, 2 * R + 1.1]; return g;
  };

  DOC.muro_garante = { L: 24, h: 3.6, posto_blocco: true, riflettore: true, settore: 'SETTORE 4', nota: 'il Muro del Garante: lastre prefabbricate di cemento a L coi giunti, la fascia dipinta e la scritta del settore a stencil, filo spinato a spirale sui bracci; il varco del posto di blocco in mezzo (strada lungo Z) con la sbarra, la garitta di lamiera, i cavalli di Frisia, i sacchi di sabbia, il cartello ALT; il palo col riflettore. Il fronte (+Z) è il lato dei controllati' };
  T.muro_garante = o => {
    o = def(o, DOC.muro_garante); const g = new THREE.Group(), L = o.L, h = o.h, pw = 1.2, wv = o.posto_blocco ? 6 : 0, xv = L / 2, r = caso(L * 3 + h);
    blocco(g, L, .05, 2.2, 'cemento', L / 2, 0, -.6);                                                 // la platea
    const lastre = []; for (let x = 0; x + pw <= L + .01; x += pw) if (!wv || x + pw <= xv - wv / 2 + .01 || x >= xv + wv / 2 - .01) lastre.push(x);
    lastre.forEach(x => { blocco(g, pw - .03, h, .2, 'cemento', x + pw / 2, .05, 0); if (!LOD) { blocco(g, pw - .03, .2, 1.2, 'cemento', x + pw / 2, .05, -.7); blocco(g, pw - .03, .5, .02, (Math.floor(x / pw) % 2) ? 'giallo' : 'buio', x + pw / 2, .9, .11); } });   // lastre a L e la fascia
    if (!LOD) { lastre.forEach((x, i) => { if (i % 2 === 0) { blocco(g, .04, .45, .5, 'ferro', x + pw / 2, h + .05, 0).rotation.x = .5; toro(g, .25, .015, 10, 'ferroScuro', x + pw / 2, h + .45, .15, 0, HP); } });   // bracci e filo spinato
      blocco(g, L, .02, .02, 'ferroScuro', L / 2, h + .45, .2); blocco(g, L, .02, .02, 'ferroScuro', L / 2, h + .3, .1);
      const xs = lastre[Math.min(2, lastre.length - 1)] + .1; scritta(g, o.settore, 2.6, .5, xs + 1.2, 2.2, .11, 0, '#e8e4da');
      for (let k = 0; k < 4; k++) blocco(g, .3, 1 + r() * 1.5, .02, 'cementoScuro', r() * L, h - 2.4 + r(), .11); }
    if (wv) { const zb = 2.2; blocco(g, wv + 7, .05, 6, 'cemento', xv, 0, 2.8);   // la piazzola del posto di blocco
      blocco(g, wv, .06, 9, 'asfalto', xv, 0, 0); blocco(g, wv, .02, .2, 'bianco', xv, .06, zb + .4);   // la strada nel varco e la linea d'arresto
      const xp = xv - wv / 2 + .4; blocco(g, .5, 1, .5, 'cemento', xp, 0, zb); const sb = blocco(g, wv - .6, .12, .12, strisce('rosso', 'bianco', 5, false), xp + (wv - .6) / 2, 1, zb); sb.position.y = 1.06;   // la sbarra
      const gk = grp(g, xv + wv / 2 + 1.5, 0, 2.4); blocco(gk, 1.8, 2.3, 1.8, 'lamiera', 0, .1, 0); blocco(gk, 2.1, .12, 2.1, 'lamiera', 0, 2.4, 0); blocco(gk, 1.9, .1, 1.9, 'cemento', 0, 0, 0);   // la garitta
      blocco(gk, 1.4, .7, .04, 'vetro', 0, 1.3, .91); blocco(gk, .04, .7, 1.2, 'vetro', -.91, 1.3, 0); vano(gk, .7, 1.9, 'rett', 'ferroScuro', .5, .1, -.92, .04);
      if (!LOD) { blocco(gk, .06, .06, .7, 'ferro', .5, 2.52, 0); blocco(gk, .3, .22, .22, 'ferroScuro', .5, 2.52, .35); }   // il faretto sul tetto
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i % 2); j++) blocco(g, .6, .25, .35, 'tela', xv - wv / 2 - 1.2 + j * .62 + (i % 2) * .31, i * .25, 1.2, LOD ? 0 : .06);   // sacchi di sabbia
      for (const dx of [-wv / 2 - 2.6, wv / 2 + 3.8]) { const gf = grp(g, xv + dx, 0, 4.2, .4); for (let k = 0; k < 3; k++) { const b = blocco(gf, .1, 1.6, .1, 'ferro', 0, -.3, 0); b.rotation.set(k ? .7 : 0, k * PI / 3, k ? 0 : .7); b.position.y = .65; } }   // cavalli di Frisia
      const gc = grp(g, xv - wv / 2 - .4, 0, zb + 1.4); cil(gc, .04, .04, 2.2, 6, 'ferro', 0, 0, 0); blocco(gc, 1, .6, .04, 'rosso', 0, 1.6, .05); scritta(gc, 'ALT', .8, .45, 0, 1.9, .08, 0, '#ffffff');   // il cartello
      for (const s of [-1, 1]) blocco(g, .5, h + .6, .5, 'cemento', xv + s * (wv / 2 + .25), .05, 0, LOD ? 0 : .03); }
    if (o.riflettore) { const xr = Math.min(L - .6, (wv ? xv + wv / 2 + .25 : L / 2)); cil(g, .09, .07, h + 3, 8, 'ferro', xr, .05, -.4);
      for (const s of [-1, 1]) { const gr2 = grp(g, xr + s * .35, h + 3, -.2); blocco(gr2, .45, .35, .3, 'ferroScuro', 0, 0, 0).rotation.x = .5; blocco(gr2, .38, .28, .02, 'lampada', 0, .08, .17).rotation.x = .5; }
      blocco(g, .9, .06, .06, 'ferro', xr, h + 2.95, -.3); }
    g.userData.misure = [L + (wv ? 2.6 : 0), h + (o.riflettore ? 3.5 : .7), wv ? 9 : 2.2]; return g;
  };

  DOC.palo_riflettori = { h: 12, n: 4, nota: 'palo dei riflettori del Garante: plinto di cemento, cassetta elettrica, fusto tronco-conico zincato con i pioli e il cavo, corona in cima e n riflettori in file da tre puntati in basso verso +Z' };
  T.palo_riflettori = o => {
    o = def(o, DOC.palo_riflettori); const g = new THREE.Group(), h = o.h, n = Math.max(1, o.n), rb = .14 + h * .006;
    blocco(g, 1, .5, 1, 'cemento', 0, 0, 0, LOD ? 0 : .04); cil(g, rb, .08, h - .5, 10, 'alluminio', 0, .5, 0);   // plinto e fusto
    if (!LOD) { blocco(g, .4, .55, .22, 'lamiera', 0, .9, -rb - .1); for (let y = 2.5; y < h - .5; y += .4) blocco(g, .3, .03, .1, 'ferro', 0, y, -(rb - (rb - .08) * (y - .5) / (h - .5)) - .03); cil(g, .02, .02, h - 1.5, 6, 'buio', rb - .02, 1, 0); }   // cassetta, pioli, cavo
    const nr = Math.ceil(n / 3), wq = Math.min(3, n) * .6 + .2;
    blocco(g, wq, .08, .4, 'ferroScuro', 0, h, .1); for (let k = 1; k < nr; k++) blocco(g, wq, .08, .08, 'ferroScuro', 0, h + k * .55, .1); if (nr > 1) for (const s of [-1, 1]) blocco(g, .06, nr * .55 - .5, .06, 'ferroScuro', s * (wq / 2 - .03), h, .1);   // la corona
    for (let i = 0; i < n; i++) { const row = Math.floor(i / 3), col = i % 3, nc = Math.min(3, n - row * 3), gr2 = grp(g, (col - (nc - 1) / 2) * .6, h + .08 + row * .55, .25);
      const b = blocco(gr2, .48, .4, .3, 'ferroScuro', 0, 0, 0); b.rotation.x = .45; const v = blocco(gr2, .4, .32, .02, 'lampada', 0, .04, .16); v.rotation.x = .45; }
    g.userData.misure = [Math.max(1, wq), h + nr * .55 + .2, 1]; return g;
  };

  const TIPI = Object.keys(T);
  function make(tipo, opzioni) {
    if (!T[tipo]) return null; LOD = !!(opzioni && opzioni.lod === 'basso');
    const g = T[tipo](opzioni || {}); LOD = false; g.name = 'pezzo_' + tipo; g.userData.tipo = tipo; g.userData.opzioni = def(opzioni, DOC[tipo]);
    return g;
  }
  return { make, TIPI, DOC, COL, mat, _aiuti: { blocco, cil, tornito, prisma, sezione, pareteArchi, scala, ringhiera, merli, conci, cornice, orologio, scritta, lampione, maioliche, tettoFalde } };
})();
if (typeof module !== 'undefined') module.exports = PezziCitta;
