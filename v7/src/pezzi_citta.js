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
    buio: '#1c1a18', lampada: '#ffe9b0', verde: '#3e6b3a', ottone: '#b08d4a', alluminio: '#b9bcc0', arancio: '#d8772a', giallo: '#e3b23c', blu: '#2a4a7a'
  };
  const MC = {};
  function mat(nome) {
    if (MC[nome]) return MC[nome];
    const o = { color: COL[nome] || nome, roughness: .85, metalness: 0 };
    if (/ferro|ghisa|ruggine|alluminio|ottone/.test(nome)) Object.assign(o, { roughness: .5, metalness: .25 });   // (metallo pieno senza riflessi attorno viene nero)
    if (nome === 'vetro') Object.assign(o, { roughness: .2, metalness: .1, transparent: true, opacity: .7 });
    if (nome === 'acqua') Object.assign(o, { roughness: .15, metalness: .05, transparent: true, opacity: .8 });
    if (nome === 'lampada') Object.assign(o, { emissive: '#ffd890', emissiveIntensity: .8 });
    if (nome === 'rosso') Object.assign(o, { roughness: .6 });
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
  function cil(g, rb, rt, h, seg, m, x, y0, z) { return add(g, geoCache(`C${rb}|${rt}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, LOD ? Math.max(6, seg >> 1) : seg)), m, x, (y0 || 0) + h / 2, z); }
  function tornito(g, pts, seg, m, x, y0, z) { return add(g, new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(Math.max(0, p[0]), p[1])), LOD ? Math.max(6, seg >> 1) : seg), m, x, y0, z); }
  function toro(g, r, t, seg, m, x, y, z, rx, ry, arco) { return add(g, new THREE.TorusGeometry(r, t, LOD ? 4 : 8, LOD ? Math.max(8, seg >> 1) : seg, arco || PI * 2), m, x, y, z, rx, ry); }
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
    if (!LOD) for (let i = 0; i <= n; i++) blocco(gg, .05, h, .05, m, i * L / n, 0, 0);
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
    toro(gg, r, .05, 24, 'ghisa', 0, 0, .03);
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
    tornito(gg, [[0, 0], [.22, 0], [.2, .12], [.12, .3], [.09, .6], [.07, 1.2], [.06, h - .6], [.09, h - .5], [.06, h - .4], [.05, h], [0, h]], 12, 'ghisa', 0, 0, 0);
    if (!LOD) { blocco(gg, .36, .5, .36, 'vetro', 0, h, 0, .02); blocco(gg, .4, .04, .4, 'ghisa', 0, h - .02, 0); blocco(gg, .44, .06, .44, 'ghisa', 0, h + .5, 0, .02); cil(gg, .14, .04, .16, 8, 'ghisa', 0, h + .56, 0); blocco(gg, .12, .2, .12, 'lampada', 0, h + .12, 0); }
    else blocco(gg, .36, .56, .36, 'lampada', 0, h, 0);
    return gg;
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

  const TIPI = Object.keys(T);
  function make(tipo, opzioni) {
    if (!T[tipo]) return null; LOD = !!(opzioni && opzioni.lod === 'basso');
    const g = T[tipo](opzioni || {}); LOD = false; g.name = 'pezzo_' + tipo; g.userData.tipo = tipo; g.userData.opzioni = def(opzioni, DOC[tipo]);
    return g;
  }
  return { make, TIPI, DOC, COL, mat, _aiuti: { blocco, cil, tornito, prisma, sezione, pareteArchi, scala, ringhiera, merli, conci, cornice, orologio, scritta, lampione, maioliche, tettoFalde } };
})();
if (typeof module !== 'undefined') module.exports = PezziCitta;
