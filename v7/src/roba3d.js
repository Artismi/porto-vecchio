/* ================= ROBA 3D: un modello vero per ogni oggetto del catalogo =================
   Prima le 382 voci di oggetti.js avevano un modellino per famiglia fatto di scatole (mini() in menu_ui.js per le anteprime, FAM in
   anim_mano.js per la mano): il latte era un mucchietto di palline gialle, pinze, trapano e bussola la stessa chiave colorata, la
   carne un mattoncino rosa. Qui ogni oggetto ha il suo modello: profili torniti (bottiglie, barattoli, manici), sagome ritagliate ed
   estruse con lo smusso (lame, pinze, chiavi), scatole a spigoli arrotondati, nastri e tubi che seguono una curva, etichette disegnate
   su tela (solo nomi inventati, niente marchi veri). Misure vere in metri, pochi materiali condivisi.
   Sistema di riferimento: la base a y = 0, al centro, il davanti verso +z.
     - attrezzi e cose che si stringono nel pugno (presa 'pugno' o 'lungo'): in piedi lungo +Y, dal fondo del manico verso la
       cima; userData.grip = l'altezza del centro del pugno; userData.diag = l'anteprima li mette in diagonale.
     - cose che si portano per il manico (presa 'appeso'): dritte, col manico in cima; userData.manico = [x, y, z] del punto preso.
     - cose piatte (presa 'piatto'): coricate sul piano XZ.
     - cose grosse (presa 'regge'): dritte; in mano si centrano davanti alla pancia.
   Roba3D.has(id) · Roba3D.make(id) → THREE.Group (nuovo) · Roba3D.presa(id) → { how, ... } come le famiglie di anim_mano.js ·
   Roba3D.inHand(id, gy, gz) → { obj, D }: il modello nel sistema della mano (o del corpo per 'regge') e la sua presa.
   Lo usano menu_ui.js (le anteprime dello Zaino), anim_mano.js (in mano) e studio_roba.html (la griglia di controllo). */
var Roba3D = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const T = THREE, PI = Math.PI, V2 = (x, y) => new T.Vector2(x, y), V3 = (x, y, z) => new T.Vector3(x, y, z);
  const HAS_DOC = typeof document !== 'undefined';

  // =====================================================================================================================
  // IL KIT
  // =====================================================================================================================
  const MC = {}, TC = {}, GC = {};
  const KIND = {
    opaco: { roughness: .75 }, legno: { roughness: .7 }, carta: { roughness: .9 }, cartone: { roughness: .95 }, tessuto: { roughness: 1 },
    plastica: { roughness: .42 }, gomma: { roughness: .9 }, ceramica: { roughness: .25 }, cibo: { roughness: .65 }, lucido: { roughness: .35 },
    metallo: { roughness: .4, metalness: .3 }, acciaio: { roughness: .32, metalness: .35 }, cromo: { roughness: .2, metalness: .4 },
    ottone: { roughness: .3, metalness: .38 }, ghisa: { roughness: .6, metalness: .25 }, ruggine: { roughness: .9, metalness: .15 },
    pietra: { roughness: .92 }, vetro: { roughness: .08, metalness: .05, transparent: true, opacity: .62 }, vetroS: { roughness: .1, metalness: .05, transparent: true, opacity: .85 },
    liquido: { roughness: .15, transparent: true, opacity: .9 }, cera: { roughness: .5 },
  };
  // ---------------- la patina: segni, usura e sporco per materiale (in grigio, moltiplicati per il colore) ----------------
  // Il riferimento è il diorama (_immagini/riferimenti/scorci): niente tinta unita da plastica nuova. Ogni genere ha la sua tela di
  // segni (venature, spazzolato e graffi, vernice scheggiata, trama, fibre, macchie) che fa anche da rilievo; le uv si proiettano
  // "a scatola" in metri veri (una tela = 12 cm) quando il modello esce da make(); i colori per vertice danno l'ombra di contatto,
  // la sfumatura dal basso e un tono un po' diverso per pezzo. I colori si stingono appena verso il grigio caldo del 1986.
  const PT = {}, TILE = .12;
  function patinaTela(k) {
    if (PT[k] !== undefined) return PT[k]; if (!HAS_DOC) return (PT[k] = null);
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); const r = rng(hashS(k));
    const g = (v, X, Y, w, h, a) => { x.fillStyle = `rgba(${v | 0},${v | 0},${v | 0},${a === undefined ? 1 : a})`; x.fillRect(X, Y, w || 1, h || 1); };
    const rumore = (a, b, n) => { for (let i = 0; i < n; i++) g(a + r() * (b - a), r() * N | 0, r() * N | 0, 1, 1); };
    const macchie = (v, n, rr, a) => { for (let i = 0; i < n; i++) { const X = r() * N, Y = r() * N, R = rr * (.4 + r()); const gr = x.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${v},${v},${v},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = gr; x.fillRect(X - R, Y - R, 2 * R, 2 * R); } };
    const graffi = (v, n, L, a) => { x.strokeStyle = `rgba(${v},${v},${v},${a})`; x.lineWidth = 1; for (let i = 0; i < n; i++) { const X = r() * N, Y = r() * N, an = r() * PI; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(an) * L * (.3 + r()), Y + Math.sin(an) * L * (.3 + r())); x.stroke(); } };
    g(240, 0, 0, N, N);
    if (k === 'legno') { for (let y = 0; y < N; y++) { const v = 222 + Math.sin(y * .45 + Math.sin(y * .07) * 3) * 14; for (let X = 0; X < N; X += 2) g(v + (r() - .5) * 14, X, y, 2 + (r() * 6 | 0), 1); } for (let i = 0; i < 3; i++) { const X = r() * N, Y = r() * N; for (let q = 6; q > 0; q--) { x.strokeStyle = `rgba(120,120,120,${.12 + q * .03})`; x.beginPath(); x.ellipse(X, Y, q * 3, q * 1.2, 0, 0, PI * 2); x.stroke(); } } graffi(170, 10, 14, .35); macchie(150, 5, 18, .18); }
    else if (k === 'metallo' || k === 'acciaio' || k === 'cromo' || k === 'ottone') { for (let y = 0; y < N; y++) for (let X = 0; X < N; X += 3) g(228 + r() * 24, X, y, 3 + (r() * 9 | 0), 1); graffi(175, 40, 18, .45); graffi(255, 20, 12, .5); macchie(140, 6, 10, .25); rumore(150, 200, 200); }
    else if (k === 'ghisa' || k === 'ruggine') { rumore(170, 250, N * N * .6); for (let i = 0; i < 260; i++) g(120 + r() * 40, r() * N | 0, r() * N | 0, 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)); macchie(110, 10, 16, .3); }
    else if (k === 'plastica' || k === 'lucido') { rumore(228, 250, N * N * .3); graffi(200, 18, 10, .35); macchie(170, 6, 20, .18); for (let i = 0; i < 8; i++) g(205, r() * N | 0, r() * N | 0, 2 + (r() * 4 | 0), 1); }
    else if (k === 'carta' || k === 'cartone') { rumore(215, 252, N * N * .7); graffi(200, 30, 20, .25); x.strokeStyle = 'rgba(150,150,150,.35)'; for (let i = 0; i < 3; i++) { x.beginPath(); const Y = r() * N; x.moveTo(0, Y); x.lineTo(N, Y + (r() - .5) * 30); x.stroke(); } macchie(160, 5, 22, .22); }
    else if (k === 'tessuto') { for (let y = 0; y < N; y += 2) for (let X = 0; X < N; X += 2) g(((X + y) / 2) % 2 ? 230 : 205 + r() * 20, X, y, 2, 2); rumore(180, 250, N * N * .25); macchie(150, 8, 20, .2); }
    else if (k === 'gomma') { rumore(190, 240, N * N * .8); macchie(255, 6, 14, .15); }
    else if (k === 'ceramica') { rumore(238, 252, N * N * .2); x.strokeStyle = 'rgba(170,170,170,.35)'; for (let i = 0; i < 6; i++) { x.beginPath(); let X = r() * N, Y = r() * N; x.moveTo(X, Y); for (let q = 0; q < 5; q++) { X += (r() - .5) * 16; Y += (r() - .5) * 16; x.lineTo(X, Y); } x.stroke(); } macchie(180, 3, 20, .15); }
    else if (k === 'cibo' || k === 'cera') { macchie(195, 22, 14, .35); macchie(255, 12, 10, .3); rumore(200, 250, N * N * .3); }
    else if (k === 'pietra') { rumore(160, 250, N * N * .9); for (let i = 0; i < 120; i++) g(120 + r() * 40, r() * N | 0, r() * N | 0, 1 + (r() * 3 | 0), 1 + (r() * 2 | 0)); macchie(130, 8, 20, .3); }
    else { rumore(200, 250, N * N * .5); graffi(180, 14, 14, .3); macchie(150, 7, 22, .22); }   // opaco e il resto: vernice usata
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return (PT[k] = t);
  }
  const BUMPK = { legno: 1, metallo: .5, acciaio: .5, cromo: .3, ottone: .5, ghisa: 1.4, ruggine: 1.6, plastica: .4, lucido: .3, carta: .6, cartone: .9, tessuto: 1.2, gomma: 1, ceramica: .3, cibo: .9, cera: .5, pietra: 1.6, opaco: .7 };
  const STINGI = '#a0968a';
  // il materiale per colore e genere (condiviso); map: una tela per le etichette
  function mat(col, kind, map) {
    const k = col + '|' + (kind || 'opaco') + '|' + (map ? map.uuid : '');
    if (MC[k]) return MC[k];
    if (kind === 'luce') return (MC[k] = new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .9, roughness: .4 }));
    const kd = kind || 'opaco', trasp = kd === 'vetro' || kd === 'vetroS' || kd === 'liquido';
    const o = Object.assign({ color: col, roughness: .6, metalness: 0 }, KIND[kd] || {});
    if (!trasp && !map) { const c = new T.Color(col); c.lerp(new T.Color(STINGI), /metallo|acciaio|cromo|ottone/.test(kd) ? .06 : .14); o.color = c; }   // appena stinto
    if (map) o.map = map;
    else if (!trasp) { const pt = patinaTela(kd); if (pt) { o.map = pt; o.bumpMap = pt; o.bumpScale = (BUMPK[kd] || .7) * .0025; } }
    if (!trasp) o.vertexColors = true;
    if (trasp) o.depthWrite = false;
    if (kd === 'liquido') { const c = new T.Color(col), L = c.r * .3 + c.g * .59 + c.b * .11; if (L > .7) o.opacity = .22; }   // acqua, grappa, vodka: si vede attraverso
    const m = new T.MeshStandardMaterial(o); m.userData.patina = !map && !trasp; m.userData.vc = !trasp; return (MC[k] = m);
  }
  // una mesh in un gruppo: posizione, rotazione, scala (numero o [x, y, z])
  function put(g, geo, m, x, y, z, rx, ry, rz, s) {
    const o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0);
    if (s !== undefined) { if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]); }
    o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
  }
  const gk = (k, f) => GC[k] || (GC[k] = f());
  // profilo tornito attorno a Y: [[raggio, altezza], ...] dal basso in alto
  const lat = (pts, seg) => gk('l' + JSON.stringify(pts) + (seg || 28), () => new T.LatheGeometry(pts.map(p => V2(Math.max(0, p[0]), p[1])), seg || 28));
  const cyl = (r0, r1, h, seg, open) => gk('c' + [r0, r1, h, seg, open], () => new T.CylinderGeometry(r0, r1, h, seg || 24, 1, !!open));
  const sfe = (r, ws, hs, p0, pl, t0, tl) => gk('s' + [r, ws, hs, p0, pl, t0, tl], () => new T.SphereGeometry(r, ws || 18, hs || 12, p0 || 0, pl || PI * 2, t0 || 0, tl || PI));
  const tor = (R, r, arc, rs, ts) => gk('t' + [R, r, arc, rs, ts], () => new T.TorusGeometry(R, r, rs || 8, ts || 28, arc || PI * 2));
  const box = (w, h, d) => gk('b' + [w, h, d], () => new T.BoxGeometry(w, h, d));
  const pia = (w, h) => gk('p' + [w, h], () => new T.PlaneGeometry(w, h));
  // scatola con gli spigoli arrotondati (raggio r), centrata
  function rbox(w, h, d, r) {
    r = Math.min(r === undefined ? .004 : r, w / 2.01, h / 2.01, d / 2.01);
    return gk('r' + [w, h, d, r], () => {
      const s = rrect(-w / 2 + r, -h / 2 + r, w / 2 - r, h / 2 - r, r * .5);
      const geo = new T.ExtrudeGeometry(s, { depth: Math.max(.0005, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 3 });
      geo.translate(0, 0, -(d - 2 * r) / 2); geo.computeVertexNormals(); return geo;
    });
  }
  function rrect(x0, y0, x1, y1, r) {
    const s = new T.Shape(); r = Math.max(.0001, Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2));
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
    s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0); return s;
  }
  // sagoma nel piano XY (punti [[x, y], ...] o una Shape), estrusa lungo Z per lo spessore d, centrata; b = smusso; holes: [{x, y, r}] o [[x,y],...]
  function ext(pts, d, b, holes, seg) {
    const key = 'e' + JSON.stringify(pts.curves ? pts.uuid || (pts.uuid = Math.random()) : pts) + [d, b, JSON.stringify(holes || 0), seg];
    return gk(key, () => {
      let s = pts;
      if (!pts.curves) { s = new T.Shape(); pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); }
      (holes || []).forEach(h => { const pa = new T.Path(); if (h.r) pa.absarc(h.x, h.y, h.r, 0, PI * 2, true); else h.forEach((p, i) => i ? pa.lineTo(p[0], p[1]) : pa.moveTo(p[0], p[1])); s.holes.push(pa); });
      b = b || 0;
      const geo = new T.ExtrudeGeometry(s, { depth: Math.max(.0004, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: seg || 10 });
      geo.translate(0, 0, -(d - 2 * b) / 2); geo.computeVertexNormals(); return geo;
    });
  }
  // tubo per più punti ([[x, y, z], ...]), raggio r
  const tubo = (pts, r, n, rs, closed) => gk('u' + JSON.stringify(pts) + [r, n, rs, closed], () => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2])), !!closed), n || pts.length * 10, r, rs || 8, !!closed));
  // asta dritta da a a b (cilindro), raggio r
  function asta(g, a, b, r, m, seg) {
    const A = V3(a[0], a[1], a[2]), B = V3(b[0], b[1], b[2]), d = B.clone().sub(A), L = d.length();
    const o = put(g, cyl(r, r, L, seg || 10), m); o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return o;
  }
  // un cerchio di punti (per gli anelli e i tubi chiusi)
  const giro = (R, n, y, f) => Array.from({ length: n }, (_, i) => { const a = i / n * PI * 2; const k = f ? f(a, i) : 1; return [Math.cos(a) * R * k, y || 0, Math.sin(a) * R * k]; });
  const shade = (c, k) => { const o = new T.Color(c); o.multiplyScalar(k); return '#' + o.getHexString(); };
  const mix = (a, b, t) => { const o = new T.Color(a); o.lerp(new T.Color(b), t); return '#' + o.getHexString(); };
  function rng(seed) { let h = 2166136261 ^ seed; return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
  const hashS = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

  // ---------------- le tele: etichette, stampe, venature ----------------
  function tela(key, w, h, draw) {
    if (TC[key]) return TC[key]; if (!HAS_DOC) { const t = new T.Texture(); t.wrapS = T.RepeatWrapping; return (TC[key] = t); }   // (senza pagina, nelle prove con node: una tela vuota)
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
    const t = new T.CanvasTexture(c); t.anisotropy = 4; t.wrapS = T.RepeatWrapping; return (TC[key] = t);
  }
  const FONT = (px, w) => `${w || 800} ${px}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
  // etichetta: o = { bg, fg, band (colore della fascia), testo, sub, righe, bordo, w, h, stile }
  function etichetta(o) {
    const w = o.w || 256, h = o.h || 128;
    return tela('et' + JSON.stringify(o), w, h, (x) => {
      x.fillStyle = o.bg || '#efe6cf'; x.fillRect(0, 0, w, h);
      if (o.stile === 'righe') { x.fillStyle = o.band || '#c83a2a'; for (let i = 0; i < w; i += 24) x.fillRect(i, 0, 10, h); }
      if (o.stile === 'onde') { x.strokeStyle = o.band || '#2a5aa8'; x.lineWidth = 6; for (let k = 0; k < 3; k++) { x.beginPath(); for (let i = 0; i <= w; i += 4) x.lineTo(i, h * (.72 + k * .08) + Math.sin(i / 14) * 4); x.stroke(); } }
      if (o.band && o.stile !== 'righe' && o.stile !== 'onde') { x.fillStyle = o.band; x.fillRect(0, h * .14, w, h * .2); x.fillRect(0, h * .78, w, h * .1); }
      if (o.bordo) { x.strokeStyle = o.bordo; x.lineWidth = 4; x.strokeRect(w * .2, h * .3, w * .6, h * .44); }
      if (o.disc) { x.fillStyle = o.disc; x.beginPath(); x.ellipse(w / 2, h * .54, w * .14, h * .26, 0, 0, PI * 2); x.fill(); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (o.testo) { x.fillStyle = o.fg || '#2a1a14'; let px = o.px || h * .26; x.font = FONT(px); while (x.measureText(o.testo).width > w * .56 && px > 8) { px -= 2; x.font = FONT(px); } x.fillText(o.testo, w / 2, h * (o.sub ? .5 : .54)); }
      if (o.sub) { x.fillStyle = o.fg2 || o.fg || '#2a1a14'; x.font = FONT(h * .11, 600); x.fillText(o.sub, w / 2, h * .68); }
      if (o.righe) { x.fillStyle = o.fg2 || 'rgba(40,30,20,.55)'; for (let i = 0; i < o.righe; i++) x.fillRect(w * .62, h * (.42 + i * .07), w * .22, h * .025); }
    });
  }
  // una tela qualsiasi disegnata a mano (cache per chiave)
  const disegno = (key, w, h, f) => tela(key, w, h, f);
  // un adesivo piano davanti a una faccia: larghezza w, altezza h, tela t (centrato in x, y; z = la faccia)
  const DC = {};
  function decal(g, t, w, h, x, y, z, ry, rx) {
    const k = t ? t.uuid : '-', m = DC[k] || (DC[k] = new T.MeshStandardMaterial({ color: '#ffffff', map: t, roughness: .85, transparent: true, alphaTest: .05, polygonOffset: true, polygonOffsetFactor: -2 }));
    const o = put(g, pia(w, h), m, x, y, z, rx || 0, ry || 0, 0); o.castShadow = false; return o;
  }

  // =====================================================================================================================
  // I MODELLI: M.nome = (o) → THREE.Group; o.c = il colore principale, gli altri parametri per modello
  // =====================================================================================================================
  const M = {};
  const G = () => new T.Group();
  const P = {};   // presa per modello (se diversa da quella del gruppo): { how, ... }

  // ---------------- bottiglie, barattoli, latte ----------------
  // bottiglia: o.forma = vino | birra | acqua | liquore | quadrata | gassosa | passata | sciroppo | vuota; o.c = vetro; o.liq = colore del contenuto; o.et = etichetta
  M.bottiglia = o => {
    const g = G(), f = o.forma || 'vino';
    const D = { vino: [.038, .2, .09, .3], birra: [.032, .13, .06, .22], acqua: [.04, .2, .07, .29], liquore: [.036, .17, .07, .26], gassosa: [.03, .14, .06, .2],
      passata: [.037, .15, .045, .23], sciroppo: [.03, .1, .03, .15], quadrata: [.04, .17, .05, .25], vuota: [.038, .2, .09, .3] }[f] || [.038, .2, .09, .3];
    const [R, H, N] = D, nr = f === 'passata' ? .022 : .0135;
    let P0;
    if (f === 'gassosa') P0 = [[0, 0], [R * .9, 0], [R, .008], [R * .92, H * .3], [R, H * .5], [R * .85, H * .75], [R * .6, H * .92], [nr, H + .02], [nr, H + N], [nr + .002, H + N + .004], [0, H + N + .004]];
    else P0 = [[0, 0], [R * .9, 0], [R, .007], [R, H], [R * .96, H + .012], [R * .72, H + .03], [R * .48, H + .045], [nr, H + .06], [nr, H + .06 + N - .012], [nr + .0025, H + .06 + N - .008], [nr + .0025, H + .06 + N], [0, H + .06 + N]];
    const vetro = mat(o.c || '#3a1a1c', 'vetro');
    if (f === 'quadrata') {
      put(g, rbox(R * 2, H, R * 1.5, .008), vetro, 0, H / 2, 0);
      put(g, lat([[0, 0], [R * .7, 0], [R * .7, .015], [nr, .04], [nr, .04 + N], [0, .04 + N]], 20), vetro, 0, H - .003, 0);
      if (o.liq) put(g, box(R * 1.8, H * .8, R * 1.3), mat(o.liq, 'liquido'), 0, H * .42, 0);
      if (o.et !== false) decal(g, etichetta(o.et || { bg: '#e8d8a8', fg: '#3a1a10', testo: 'RISERVA', sub: '12 anni', band: '#7a2a1a' }), R * 1.7, H * .42, 0, H * .45, R * .75 + .0015);
      put(g, cyl(nr + .004, nr + .004, .025, 16), mat('#1a1a1a', 'plastica'), 0, H + .03 + N, 0);
      g.userData.grip = H * .5; return g;
    }
    put(g, lat(P0, 28), vetro);
    if (o.liq && f !== 'vuota') put(g, lat([[0, .004], [R - .003, .004], [R - .003, H * (f === 'gassosa' ? .7 : .9)], [0, H * (f === 'gassosa' ? .7 : .9)]], 24), mat(o.liq, 'liquido'));
    if (f !== 'vuota' && o.et !== false) {
      const t = etichetta(o.et || { bg: '#efe6cf', fg: '#5a1418', testo: 'ROSSO', sub: 'da tavola', band: '#8a2028' });
      t.offset.x = .5; put(g, cyl(R + .0008, R + .0008, H * .42, 28, true), mat('#ffffff', 'carta', t), 0, H * .46, 0);
      if (f === 'vino' || f === 'liquore') put(g, cyl(nr + .0028, nr + .0035, .04, 20), mat(o.cap || '#7a1420', 'plastica'), 0, H + .06 + N - .018, 0);   // la capsula
    }
    if (f === 'birra' || f === 'gassosa') put(g, cyl(nr + .004, nr + .004, .008, 18), mat(o.cap || '#c8a040', 'metallo'), 0, H + (f === 'gassosa' ? .02 + N : .06 + N), 0);   // il tappo a corona
    else if (f === 'acqua' || f === 'passata' || f === 'sciroppo') put(g, cyl(nr + .004, nr + .004, .016, 18), mat(o.cap || '#2a5aa8', 'plastica'), 0, H + .06 + N - .004, 0);
    else if (f !== 'vuota') put(g, cyl(nr - .001, nr - .002, .012, 14), mat('#b8905a', 'legno'), 0, H + .06 + N + .003, 0);   // il sughero
    g.userData.grip = H * .55; return g;
  };
  // il fiasco impagliato del vino rosso
  M.fiasco = o => {
    const g = G(), R = .07;
    put(g, lat([[0, .005], [R * .8, .005], [R, .05], [R, .1], [R * .85, .15], [.03, .18], [.016, .2], [.016, .28], [.019, .285], [.019, .295], [0, .295]], 28), mat('#5a7a3a', 'vetro'));
    put(g, lat([[0, .01], [R * .78, .01], [R * .95, .05], [R * .95, .09], [R * .82, .135], [0, .135]], 24), mat('#6a1018', 'liquido'));
    // la paglia: un cesto tornito con le fasce
    const pg = disegno('paglia', 64, 64, (x) => { x.fillStyle = '#c8a058'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 3) { x.fillStyle = i % 6 ? '#b08840' : '#d8b468'; x.fillRect(i, 0, 2, 64); } x.fillStyle = '#8a6430'; for (let y = 0; y < 64; y += 16) x.fillRect(0, y, 64, 2); });
    pg.repeat.set(6, 1);
    put(g, lat([[R * .78, 0], [R * 1.02, .03], [R * 1.04, .1], [R * .92, .14], [R * .5, .17]], 28), mat('#d0a860', 'tessuto', pg));
    put(g, tor(R * 1.03, .004, 0, 6, 28), mat('#a8202a', 'tessuto'), 0, .1, 0, PI / 2);
    put(g, cyl(.019, .019, .03, 16), mat('#a8202a', 'plastica'), 0, .3, 0);
    g.userData.grip = .07; return g;
  };
  // barattolo di vetro con il coperchio a vite: o.liq = contenuto, o.pezzi = cose dentro (olive), o.et
  M.vasetto = o => {
    const g = G(), R = o.r || .036, H = o.h || .09;
    put(g, lat([[0, 0], [R - .004, 0], [R, .006], [R, H - .012], [R - .006, H - .004], [R - .006, H], [0, H]], 28), mat('#dce8e4', 'vetro'));
    if (o.liq) put(g, lat([[0, .003], [R - .003, .003], [R - .003, H * (o.pieno || .78)], [0, H * (o.pieno || .78)]], 24), mat(o.liq, o.opaco ? 'cibo' : 'liquido'));
    if (o.pezzi) { const r = rng(7); for (let i = 0; i < 9; i++) { const a = r() * PI * 2, d = R * (.4 + r() * .45); put(g, sfe(.009, 10, 8), mat(o.pezzi, 'lucido'), Math.cos(a) * d, .012 + (i % 3) * .022 + r() * .01, Math.sin(a) * d, 0, 0, 0, [1, 1.3, 1]); } }
    put(g, cyl(R - .002, R - .002, .014, 28), mat(o.cap || '#c8a838', 'metallo'), 0, H + .006, 0);
    put(g, tor(R - .002, .0025, 0, 6, 28), mat(shade(o.cap || '#c8a838', .8), 'metallo'), 0, H + .002, 0, PI / 2);
    if (o.et !== false) { const t = etichetta(o.et || { bg: '#f2ead8', fg: '#7a2a1a', testo: 'CASA' }); t.offset.x = .5; put(g, cyl(R + .0008, R + .0008, H * .45, 28, true), mat('#ffffff', 'carta', t), 0, H * .45, 0); }
    if (o.stoffa) { put(g, lat([[R + .004, H - .005], [R + .01, H + .006], [R + .002, H + .016], [0, H + .018]], 24), mat(o.stoffa, 'tessuto')); put(g, tor(R + .001, .0018, 0, 5, 24), mat('#c8202a', 'tessuto'), 0, H - .004, 0, PI / 2); }
    g.userData.grip = H * .5; return g;
  };
  // latta cilindrica: o.r, o.h, o.et (etichetta), o.apriti (con la chiavetta), o.aperta (vuota, il coperchio alzato)
  M.latta = o => {
    const g = G(), R = o.r || .038, H = o.h || .11, A = mat('#c4c8ce', 'acciaio');
    put(g, lat([[0, 0], [R - .004, 0], [R, .004], [R, H - .004], [R - .004, H], [R - .006, H - .003], [0, H - .003]], 32), A);
    for (const y of [.012, H - .012]) put(g, tor(R + .0004, .0016, 0, 5, 32), A, 0, y, 0, PI / 2);   // le bordature
    if (o.et !== false) { const t = etichetta(o.et || { bg: '#c83a2a', fg: '#f2ead8', testo: 'TONNO' }); t.offset.x = .5; put(g, cyl(R + .0008, R + .0008, H - .03, 32, true), mat('#ffffff', 'carta', t), 0, H / 2, 0); }
    if (o.aperta) { const cop = put(g, cyl(R - .004, R - .004, .002, 28), A, 0, H, 0); cop.position.set(0, H + R * .6, -R * .7); cop.rotation.x = -1.1; }
    if (o.apriti) { put(g, ext([[-.004, 0], [.004, 0], [.004, .04], [-.004, .04]], .002, 0), A, R * .3, H + .002, 0, -PI / 2, 0, .4); put(g, tor(.007, .0015, 0, 5, 12), A, R * .3 + .015, H + .002, .03, PI / 2); }
    if (o.manico) { put(g, tor(R * 1.02, .0018, PI, 5, 20), mat('#888c90', 'acciaio'), 0, H, 0, 0, 0, 0); }
    g.userData.grip = H * .5; return g;
  };
  // latta bassa (tonno, acciughe): o.rett = rettangolare con gli angoli tondi
  M.latta_bassa = o => {
    const g = G(), A = mat('#c4c8ce', 'acciaio');
    if (o.rett) {
      const w = .11, d = .065, h = .025;
      put(g, rbox(w, h, d, .01), A, 0, h / 2, 0);
      decal(g, etichetta(o.et || { bg: '#2a5a8a', fg: '#f2ead8', testo: 'ACCIUGHE', stile: 'onde', band: '#5a8ac8' }), w * .9, d * .8, 0, h + .0008, 0, 0, -PI / 2);
      put(g, tor(.008, .0018, 0, 5, 12), A, -w / 2 + .012, h + .003, 0, PI / 2);
      return g;
    }
    const R = .043, H = .032;
    put(g, lat([[0, 0], [R - .003, 0], [R, .003], [R, H - .003], [R - .003, H], [0, H]], 32), A);
    const t = etichetta(o.et || { bg: '#e8c040', fg: '#1a3a7a', testo: 'TONNO', band: '#1a3a7a' }); t.offset.x = .5;
    put(g, cyl(R + .0008, R + .0008, H - .01, 32, true), mat('#ffffff', 'carta', t), 0, H / 2, 0);
    put(g, tor(.009, .0018, 0, 5, 12), A, 0, H + .002, R * .55, PI / 2);   // l'anello dell'apertura facile
    put(g, tor(R - .006, .0012, 0, 4, 28), A, 0, H, 0, PI / 2);
    return g;
  };
  // il brik di cartone (latte, succo): o.c = colore, o.et, o.cannuccia
  M.brik = o => {
    const g = G(), w = o.w || .07, d = o.d || .07, h = o.h || .19;
    put(g, rbox(w, h, d, .003), mat(o.c || '#f2f0ea', 'carta'), 0, h / 2, 0);
    // il tetto a capanna con la cresta
    put(g, ext([[-w / 2, 0], [w / 2, 0], [0, .035]], d - .002, 0), mat(o.c || '#f2f0ea', 'carta'), 0, h, 0, 0, PI / 2, 0);
    put(g, rbox(.006, .012, d - .004, .001), mat(shade(o.c || '#f2f0ea', .92), 'carta'), 0, h + .038, 0);
    const t = etichetta(o.et || { bg: '#f2f0ea', fg: '#1a4a9a', testo: 'LATTE', sub: 'intero', band: '#2a6ad0' });
    decal(g, t, w * .96, h * .9, 0, h * .5, d / 2 + .0008); decal(g, t, d * .96, h * .9, w / 2 + .0008, h * .5, 0, PI / 2);
    if (o.cannuccia) asta(g, [w * .2, h + .01, 0], [w * .3, h + .09, 0], .0025, mat('#e84a3a', 'plastica'));
    g.userData.grip = h * .5; return g;
  };
  // il thermos: corpo d'acciaio verniciato, fascia, tappo-tazza
  M.thermos = o => {
    const g = G(), R = .038;
    put(g, lat([[0, 0], [R - .004, 0], [R, .006], [R, .21], [R - .006, .225], [.028, .23], [0, .23]], 28), mat(o.c || '#2e5a46', 'metallo'));
    put(g, cyl(R + .0005, R + .0005, .03, 28), mat('#c8ccd4', 'cromo'), 0, .03, 0);
    put(g, cyl(R + .0005, R + .0005, .012, 28), mat('#c8ccd4', 'cromo'), 0, .2, 0);
    put(g, lat([[0, .228], [.04, .228], [.042, .232], [.042, .285], [.038, .29], [0, .29]], 28), mat('#2a2a30', 'plastica'));
    put(g, tor(.032, .006, PI, 6, 14), mat('#2a2a30', 'plastica'), R + .002, .12, 0, 0, 0, -PI / 2);   // il manico
    g.userData.grip = .12; return g;
  };
  // flacone di plastica (detersivo, candeggina, shampoo, alcol, disinfettante): o.c, o.cap, o.et, o.manico
  M.flacone = o => {
    const g = G(), w = o.w || .08, d = o.d || .05, h = o.h || .2;
    const s = rrect(-w / 2, 0, w / 2, h * .8, .012); s.lineTo(w / 2, h * .8);
    const prof = new T.Shape(); prof.moveTo(-w / 2 + .01, 0); prof.lineTo(w / 2 - .01, 0); prof.quadraticCurveTo(w / 2, 0, w / 2, .01); prof.lineTo(w / 2, h * .78);
    prof.quadraticCurveTo(w / 2, h * .9, .016, h * .93); prof.lineTo(-.016, h * .93); prof.quadraticCurveTo(-w / 2, h * .9, -w / 2, h * .78); prof.lineTo(-w / 2, .01); prof.quadraticCurveTo(-w / 2, 0, -w / 2 + .01, 0);
    put(g, ext(prof, d, .008, null, 8), mat(o.c || '#e8e4d8', 'plastica'));
    if (o.manico) put(g, ext(rrect(-w * .32, h * .45, -w * .02, h * .84, .01), d * .5, .004, [[[-w * .26, h * .52], [-w * .08, h * .52], [-w * .08, h * .77], [-w * .26, h * .77]]]), mat(o.c || '#e8e4d8', 'plastica'), -w * .18, 0, 0);
    put(g, cyl(.016, .017, .028, 18), mat(o.cap || '#2a5aa8', 'plastica'), 0, h * .93 + .014, 0);
    decal(g, etichetta(o.et || { bg: '#f2f0ea', fg: '#2a5aa8', testo: 'BUCATO', band: '#2a5aa8' }), w * .78, h * .42, 0, h * .4, d / 2 + .001);
    g.userData.grip = h * .45; return g;
  };
  // boccetta da farmacia o d'inchiostro: o.c (vetro), o.liq, o.cap, o.et
  M.boccetta = o => {
    const g = G(), R = o.r || .022, H = o.h || .05;
    put(g, lat([[0, 0], [R - .003, 0], [R, .004], [R, H], [R * .7, H + .01], [.008, H + .014], [.008, H + .024], [0, H + .024]], 22), mat(o.c || '#5a3a1a', 'vetroS'));
    if (o.liq) put(g, cyl(R - .003, R - .003, H * .8, 20), mat(o.liq, 'liquido'), 0, H * .42, 0);
    put(g, cyl(.011, .011, .016, 16), mat(o.cap || '#1a1a1a', 'plastica'), 0, H + .024, 0);
    if (o.et !== false) { const t = etichetta(o.et || { bg: '#f2ead8', fg: '#1a1a1a', testo: 'NERO' }); t.offset.x = .5; put(g, cyl(R + .0006, R + .0006, H * .5, 22, true), mat('#ffffff', 'carta', t), 0, H * .5, 0); }
    g.userData.grip = H * .5; return g;
  };
  // la tanica: metallo (militare con la X) o plastica; o.c, o.plastica
  M.tanica = o => {
    const g = G(), w = o.w || .34, h = o.h || .46, d = o.d || .16, c = o.c || '#a8302a', m = mat(c, o.plastica ? 'plastica' : 'metallo');
    put(g, rbox(w, h, d, .018), m, 0, h / 2, 0);
    if (!o.plastica) {   // le nervature a X
      [-1, 1].forEach(s => { const x = put(g, rbox(Math.hypot(w, h) * .74, .022, .008, .004), mat(shade(c, 1.12), 'metallo'), 0, h * .48, s * (d / 2 + .001)); x.rotation.z = Math.atan2(h, w) * .95; const y = x.clone(); y.rotation.z = -x.rotation.z; g.add(y); });
      put(g, rbox(w + .006, .016, d + .006, .006), mat(shade(c, .8), 'metallo'), 0, h - .02, 0);
    } else decal(g, etichetta({ bg: shade(c, 1.15), fg: '#f2f0ea', testo: o.testo || 'ACQUA' }), w * .6, h * .3, 0, h * .45, d / 2 + .001);
    // tre maniglie in cima e il beccuccio
    const mn = o.plastica ? [0] : [-w * .3, 0, w * .3];
    mn.forEach(x => put(g, ext(rrect(-.035, 0, .035, .045, .012), .02, .004, [[[-.024, .006], [.024, .006], [.024, .032], [-.024, .032]]]), m, x, h - .006, 0));
    put(g, cyl(.022, .024, .04, 16), mat('#2a2a2e', 'plastica'), w * .38, h + .012, 0, 0, 0, -.5);
    g.userData.manico = [0, h + .028, 0]; return g;
  };
  P.tanica = { how: 'appeso' };
  // il secchio zincato col manico; o.dentro = colore di quello che c'è (acqua, malta, catrame)
  M.secchio = o => {
    const g = G(), R0 = .1, R1 = .13, H = .26, Z = mat(o.c || '#a8acb0', o.c ? 'plastica' : 'metallo');
    put(g, lat([[0, .002], [R0, .002], [R0 + .002, 0], [R1, H - .006], [R1 + .006, H], [R1 + .004, H + .004], [R1 - .003, H], [R0 - .003, .008], [0, .008]], 30), Z);
    for (const y of [.08, .17]) put(g, tor(R0 + (R1 - R0) * y / H + .001, .002, 0, 5, 30), Z, 0, y, 0, PI / 2);
    if (o.dentro) { const r = R0 + (R1 - R0) * .8; put(g, cyl(r, r, .004, 28), mat(o.dentro, o.dentro === '#5a8aa8' ? 'liquido' : 'cibo'), 0, H * .8, 0); }
    // il manico di filo e le orecchie
    put(g, tor(R1 + .004, .003, PI, 6, 24), mat('#7a7e84', 'acciaio'), 0, H - .01, 0);
    [-1, 1].forEach(s => put(g, cyl(.008, .008, .006, 10), mat('#7a7e84', 'acciaio'), s * (R1 + .002), H - .012, 0, 0, 0, PI / 2));
    put(g, cyl(.01, .01, .06, 10), mat('#3a2a1a', 'legno'), 0, H + R1 - .002, 0, 0, 0, PI / 2);
    g.userData.manico = [0, H + R1, 0]; return g;
  };
  P.secchio = { how: 'appeso' };
  // il barattolo della vernice con la colatura e il coperchio appoggiato
  M.barattolo_vernice = o => {
    const g = G(), R = .07, H = .13, c = o.c || '#c83a2a';
    put(g, lat([[0, 0], [R - .004, 0], [R, .004], [R, H], [R - .004, H + .004], [R - .008, H], [0, H]], 30), mat('#b8bcc2', 'acciaio'));
    const t = etichetta({ bg: '#f2f0ea', fg: '#1a1a1a', testo: 'SMALTO', band: c, w: 256, h: 128 }); t.offset.x = .5;
    put(g, cyl(R + .0008, R + .0008, H * .7, 30, true), mat('#ffffff', 'carta', t), 0, H * .48, 0);
    put(g, cyl(R - .009, R - .009, .003, 28), mat(c, 'lucido'), 0, H - .004, 0);
    put(g, tubo([[R * .55, H + .002, R * .78], [R * .9, H, R * .45], [R + .002, H - .03, R * .1], [R + .002, H - .07, R * .05]], .005, 20, 6), mat(c, 'lucido'));
    put(g, tor(R * 1.02, .002, PI, 5, 20), mat('#7a7e84', 'acciaio'), 0, H, 0, 0, PI / 2, 0);
    g.userData.manico = [0, H + R, 0]; return g;
  };
  P.barattolo_vernice = { how: 'appeso' };
  // la bomboletta spray: o.c, o.piccola
  M.bomboletta = o => {
    const g = G(), R = o.piccola ? .022 : .033, H = o.piccola ? .1 : .19, c = o.c || '#c83a2a';
    put(g, lat([[0, 0], [R - .004, 0], [R, .006], [R, H], [R * .8, H + .02], [R * .35, H + .028], [0, H + .028]], 28), mat('#c4c8ce', 'acciaio'));
    const t = etichetta({ bg: c, fg: '#f2f0ea', testo: o.testo || 'SPRAY', band: shade(c, .7) }); t.offset.x = .5;
    put(g, cyl(R + .0006, R + .0006, H * .75, 28, true), mat('#ffffff', 'carta', t), 0, H * .45, 0);
    put(g, cyl(R * .3, R * .32, .016, 14), mat('#f2f0ea', 'plastica'), 0, H + .034, 0);
    put(g, box(.004, .004, .004), mat('#1a1a1a', 'plastica'), 0, H + .038, R * .28);
    if (!o.piccola) put(g, cyl(R - .001, R - .001, .05, 28), mat(c, 'plastica'), 0, H + .02, 0);   // il cappuccio
    g.userData.grip = H * .45; return g;
  };
  // il tubetto (colla, dentifricio): coricato
  M.tubetto = o => {
    const g = G(), L = o.L || .13, R = o.r || .014, c = o.c || '#e8e4d8';
    const geo = lat([[0, 0], [R * .55, 0], [R, L * .12], [R, L * .7], [R * .85, L * .92], [R * .2, L], [0, L]], 20);
    const b = put(g, geo, mat(c, 'plastica'), 0, R, 0, 0, 0, -PI / 2, [1, 1, .55]);
    // la coda schiacciata con la piegatura
    put(g, rbox(.006, R * 2.2, R * 1.1, .001), mat(shade(c, .9), 'plastica'), L + .002, R, 0);
    put(g, cyl(.007, .008, .014, 14), mat(o.cap || '#c83a2a', 'plastica'), -.007, R, 0, 0, 0, PI / 2);
    decal(g, etichetta({ bg: c, fg: o.cap || '#c83a2a', testo: o.testo || 'COLLA', band: o.cap || '#c83a2a' }), L * .55, R * .9, L * .45, 2 * R + .001, 0, 0, -PI / 2);
    g.userData.grip = .1; return g;
  };
  P.tubetto = { how: 'piatto' };

  // ---------------- da mangiare ----------------
  // la pagnotta: o.c = crosta, o.forma = tonda | filone
  M.pagnotta = o => {
    const g = G(), c = o.c || '#b8742e', fil = o.forma === 'filone';
    const pr = [[0, 0], [.08, 0], [.095, .012], [.1, .03], [.094, .055], [.075, .078], [.045, .092], [0, .098]];
    put(g, lat(pr, 26), mat(c, 'cibo'), 0, 0, 0, 0, 0, 0, fil ? [1.7, .85, .7] : [1, 1, 1]);
    const n = fil ? 4 : 2;
    for (let i = 0; i < n; i++) {   // i tagli della crosta, chiari e gonfi
      const x = fil ? (i - (n - 1) / 2) * .055 : (i - .5) * .05, y = fil ? .086 : .095 - Math.abs(x) * .3;
      put(g, new T.CapsuleGeometry(.008, fil ? .045 : .09, 4, 8), mat(mix(c, '#f0d8a0', .55), 'cibo'), x, y, 0, PI / 2, fil ? .6 : 0, 0, [1, 1, .45]);
    }
    for (let i = 0; i < 14; i++) { const a = i * 2.4, r = .02 + (i % 4) * .015; put(g, sfe(.003, 5, 4), mat('#f2ead8', 'cibo'), Math.cos(a) * r * (fil ? 1.6 : 1), .094 - r * .25, Math.sin(a) * r * .8); }   // la farina
    g.userData.grip = .05; return g;
  };
  P.pagnotta = { how: 'pugno' };
  // la focaccia: lastra bassa con le fossette e l'olio
  M.focaccia = o => {
    const g = G(), w = .16, d = .12;
    put(g, rbox(w, .025, d, .011), mat('#d8a050', 'cibo'), 0, .0125, 0);
    put(g, box(w - .02, .002, d - .02), mat('#e8b860', 'lucido'), 0, .025, 0);
    const r = rng(3); for (let i = 0; i < 12; i++) put(g, sfe(.006, 8, 6), mat('#a86a28', 'cibo'), (r() - .5) * (w - .03), .025, (r() - .5) * (d - .03), 0, 0, 0, [1, .4, 1]);
    for (let i = 0; i < 6; i++) put(g, sfe(.003, 6, 4), mat('#f2ead8', 'lucido'), (r() - .5) * (w - .03), .027, (r() - .5) * (d - .03));   // il sale grosso
    put(g, box(w + .03, .002, d + .03), mat('#f2ead8', 'carta'), 0, .001, 0, 0, .1, 0);   // la carta del forno
    return g;
  };
  P.focaccia = { how: 'piatto' };
  // il pacco di cartone stampato (biscotti, pasta, riso, sale, zucchero, gallette): o.c, o.et, o.w/h/d, o.finestra
  M.pacco = o => {
    const g = G(), w = o.w || .14, h = o.h || .2, d = o.d || .05, c = o.c || '#e8c040';
    put(g, rbox(w, h, d, .002), mat(c, 'cartone'), 0, h / 2, 0);
    const t = etichetta(Object.assign({ bg: c, fg: '#1a2a5a', testo: 'BISCOTTI', band: '#1a2a5a' }, o.et || {}));
    decal(g, t, w * .96, h * .94, 0, h / 2, d / 2 + .0008); decal(g, t, w * .96, h * .94, 0, h / 2, -d / 2 - .0008, PI);
    if (o.finestra) put(g, pia(w * .5, h * .28), mat('#f2ead8', 'vetro'), 0, h * .36, d / 2 + .0012);
    if (o.dentro) { const r = rng(5); for (let i = 0; i < 6; i++) put(g, cyl(.0025, .0025, .03, 6), mat(o.dentro, 'cibo'), (r() - .5) * w * .4, h * .3 + r() * h * .1, d / 2 - .004, 0, 0, r() * PI); }
    return g;
  };
  P.pacco = { how: 'pugno' };
  // il sacchetto di carta ripiegato in cima (farina, carbonella, zucchero sfuso): o.c, o.et
  M.sacchetto_carta = o => {
    const g = G(), w = o.w || .14, h = o.h || .24, d = o.d || .08, c = o.c || '#e8e0cc';
    const prof = [[-w / 2, 0], [w / 2, 0], [w / 2 + .004, h * .78], [w / 2 - .006, h * .86], [-w / 2 + .006, h * .86], [-w / 2 - .004, h * .78]];
    put(g, ext(prof, d, .01), mat(c, 'carta'));
    put(g, rbox(w * 1.02, .03, d * .3, .004), mat(shade(c, .93), 'carta'), 0, h * .87, 0, .15);   // la piega del bordo
    put(g, rbox(w * 1.02, .02, d * .24, .003), mat(shade(c, .88), 'carta'), 0, h * .89, d * .05, -.25);
    if (o.et !== false) decal(g, etichetta(Object.assign({ bg: c, fg: '#7a2a1a', testo: 'FARINA', sub: 'tipo 00', bordo: '#7a2a1a' }, o.et || {})), w * .82, h * .5, 0, h * .4, d / 2 + .011);
    return g;
  };
  P.sacchetto_carta = { how: 'regge', w: .2, d: .12 };
  // il sacco (juta o carta da cantiere): o.c, o.juta, o.et, o.legato
  M.sacco = o => {
    const g = G(), c = o.c || '#b89a68', juta = o.juta !== false;
    let tx = null;
    if (juta) { tx = disegno('juta', 64, 64, (x) => { x.fillStyle = '#c8b080'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 2) { x.fillStyle = 'rgba(90,70,40,.25)'; x.fillRect(i, 0, 1, 64); x.fillRect(0, i, 64, 1); } }); tx.repeat.set(4, 4); tx.wrapT = T.RepeatWrapping; }
    const prof = [[0, 0], [.15, 0], [.2, .03], [.22, .12], [.21, .3], [.17, .4], [.07, .44], [.05, .47], [.06, .52], [0, .52]];
    const geo = lat(o.legato === false ? [[0, 0], [.15, 0], [.21, .04], [.22, .2], [.2, .34], [.16, .37], [0, .36]] : prof, 22);
    put(g, geo, mat(c, juta ? 'tessuto' : 'carta', tx), 0, 0, 0, 0, 0, 0, [1, 1, .62]);
    if (o.legato !== false) put(g, tor(.055, .008, 0, 6, 16), mat('#8a6a3a', 'tessuto'), 0, .455, 0, PI / 2, 0, 0, [1, .62, 1]);
    if (o.et) decal(g, etichetta(Object.assign({ bg: 'rgba(0,0,0,0)', fg: '#3a2a1a', w: 256, h: 128 }, o.et)), .22, .12, 0, .2, .22 * .62 + .006);
    return g;
  };
  P.sacco = { how: 'regge', w: .44, d: .3 };
  // il sacco di carta a valvola (cemento, calce): un mattone morbido
  M.sacco_carta = o => {
    const g = G(), c = o.c || '#c8c0b0', w = .44, h = .14, d = .3;
    put(g, rbox(w, h, d, .05), mat(c, 'carta'), 0, h / 2, 0);
    [-1, 1].forEach(s => put(g, rbox(.04, h * .7, d * .92, .015), mat(shade(c, .92), 'carta'), s * (w / 2 - .005), h * .48, 0));
    decal(g, etichetta(Object.assign({ bg: c, fg: '#2a2a2a', testo: 'CEMENTO', sub: '25 kg', band: '#c83a2a' }, o.et || {})), w * .7, d * .7, 0, h + .001, 0, 0, -PI / 2);
    return g;
  };
  P.sacco_carta = { how: 'regge', w: .44, d: .3 };
  // frutta e verdura sciolta
  function frutto(g, k, x, y, z, s, seed) {
    const r = rng(seed || 1), ry = r() * PI * 2;
    if (k === 'pomodoro') { put(g, sfe(.032, 18, 12), mat('#d02a1a', 'lucido'), x, y, z, 0, ry, 0, [s, s * .78, s]); for (let i = 0; i < 5; i++) put(g, box(.016 * s, .002, .004 * s), mat('#3a6a2a', 'cibo'), x + Math.cos(i * 1.26) * .007 * s, y + .025 * s, z + Math.sin(i * 1.26) * .007 * s, 0, -i * 1.26, 0); return; }
    if (k === 'limone') { put(g, sfe(.03, 16, 12), mat('#e8d038', 'cibo'), x, y, z, 0, ry, PI / 2, [s * .8, s * 1.15, s * .8]); return; }
    if (k === 'arancia') { put(g, sfe(.036, 18, 12), mat('#e8862a', 'cibo'), x, y, z, 0, ry, 0, [s, s * .95, s]); put(g, sfe(.004, 6, 4), mat('#5a6a2a', 'cibo'), x, y + .034 * s, z); return; }
    if (k === 'mela') { put(g, lat([[0, -.002], [.02, 0], [.034, .012], [.036, .03], [.028, .05], [.012, .054], [0, .046]], 18), mat(r() < .5 ? '#b8282a' : '#9ab83a', 'lucido'), x, y - .027 * s, z, 0, ry, 0, s); put(g, cyl(.0015, .0015, .014, 5), mat('#5a3a1a', 'legno'), x, y + .025 * s, z, .3); return; }
    if (k === 'patata') { put(g, sfe(.03, 12, 9), mat('#b89058', 'cibo'), x, y, z, r() * .5, ry, 0, [s * 1.3, s * .8, s * .95]); return; }
    if (k === 'cipolla') { put(g, lat([[0, -.03], [.012, -.026], [.03, -.01], [.033, .006], [.022, .024], [.006, .036], [.002, .05], [0, .05]], 16), mat('#c88a4a', 'lucido'), x, y, z, 0, ry, 0, s); return; }
    if (k === 'uovo') { put(g, sfe(.021, 14, 10), mat('#ecdcc0', 'cibo'), x, y, z, 0, 0, 0, [s, s * 1.3, s]); return; }
    if (k === 'castagna') { put(g, sfe(.016, 10, 8), mat('#6a3a1a', 'lucido'), x, y, z, 0, ry, 0, [s, s * .7, s * 1.1]); put(g, sfe(.008, 6, 4), mat('#c8a070', 'cibo'), x, y - .009 * s, z); return; }
    if (k === 'noce') { put(g, sfe(.016, 10, 8), mat('#a07848', 'cibo'), x, y, z, 0, ry, 0, [s, s * 1.1, s]); return; }
    if (k === 'fungo') { put(g, cyl(.007, .009, .03, 10), mat('#e8dcc0', 'cibo'), x, y, z); put(g, sfe(.022, 14, 8, 0, PI * 2, 0, PI / 2), mat('#8a5a2a', 'cibo'), x, y + .016, z, 0, 0, 0, [s, s * .55, s]); return; }
    if (k === 'oliva') { put(g, sfe(.008, 10, 8), mat('#4a5a1a', 'lucido'), x, y, z, 0, ry, 0, [s, s * 1.3, s]); return; }
    if (k === 'acino') { put(g, sfe(.009, 10, 8), mat('#5a2a5a', 'lucido'), x, y, z, 0, 0, 0, s); return; }
    if (k === 'fico') { put(g, sfe(.018, 10, 8), mat('#8a6a48', 'cibo'), x, y, z, 0, ry, 0, [s, s * .55, s]); return; }
  }
  // la retina della frutta: un mucchio di frutti in una rete con la fascetta: o.f = tipo di frutto
  M.retina = o => {
    const g = G(), k = o.f || 'arancia', s = o.s || 1, R = k === 'patata' ? .06 : .055, r = rng(hashS(k));
    const pts = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = i < 6 ? R : R * .45, y = i < 6 ? .035 : i < 8 ? .085 : .125; pts.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); }
    pts.forEach((p, i) => frutto(g, k, p[0], p[1] * s, p[2], s, i + 3));
    // la rete: anelli e fili che avvolgono il mucchio, chiusi in cima
    const RM = mat(o.rete || '#d84a2a', 'plastica');
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; put(g, tubo([[Math.cos(a) * .02, 0, Math.sin(a) * .02], [Math.cos(a) * (R + .035), .04 * s, Math.sin(a) * (R + .035)], [Math.cos(a) * (R + .02), .11 * s, Math.sin(a) * (R + .02)], [0, .17 * s, 0]], .0012, 20, 4), RM); }
    for (const [y, rr] of [[.03, R + .036], [.075, R + .03], [.12, R * .7]]) put(g, tor(rr, .0012, 0, 4, 28), RM, 0, y * s, 0, PI / 2);
    put(g, cyl(.007, .007, .02, 10), mat('#e8c040', 'plastica'), 0, .175 * s, 0);
    g.userData.manico = [0, .185 * s, 0]; return g;
  };
  P.retina = { how: 'appeso' };
  // la cassetta di legno della frutta, piena: o.f = frutto (o 'mista')
  M.cassetta_frutta = o => {
    const g = G(), w = .3, d = .2, h = .1, L = mat('#c8a070', 'legno'), L2 = mat('#a88050', 'legno');
    [-1, 1].forEach(s => { put(g, rbox(.012, h, d, .002), L, s * (w / 2 - .006), h / 2, 0); });
    [-1, 1].forEach(s => { for (const y of [.02, .07]) put(g, rbox(w - .024, .03, .008, .002), L2, 0, y, s * (d / 2 - .004)); });
    for (let i = 0; i < 3; i++) put(g, rbox(w - .024, .006, .055, .002), L2, 0, .003, (i - 1) * .065);
    const ks = o.f === 'mista' ? ['mela', 'arancia', 'limone', 'mela', 'arancia'] : [o.f || 'pomodoro'];
    let n = 0; for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 3; iz++) { const k = ks[(n++) % ks.length]; frutto(g, k, (ix - 1.5) * .066, .06 + (n % 2) * .008, (iz - 1) * .056, 1, n); }
    for (let i = 0; i < 3; i++) { const k = ks[(i + 1) % ks.length]; frutto(g, k, (i - 1) * .07, .11, (i % 2 - .5) * .04, 1, 20 + i); }
    decal(g, etichetta({ bg: '#c8a070', fg: '#2a4a8a', testo: 'SICILIA', w: 256, h: 96 }), w * .5, h * .4, 0, .07, d / 2 + .0002);
    return g;
  };
  P.cassetta_frutta = { how: 'regge' };
  // un mucchietto sciolto (mele, cipolle): o.f
  M.mucchietto = o => { const g = G(), k = o.f || 'mela'; [[0, 0], [.07, .02], [-.06, .03], [.01, .065], [.03, -.06]].forEach(([x, z], i) => frutto(g, k, x, .03, z, 1, i + 1)); frutto(g, k, .02, .085, .01, 1, 9); return g; };
  P.mucchietto = { how: 'regge', w: .2, d: .18 };
  // il cestino di vimini con dentro i funghi
  M.cestino = o => {
    const g = G(), R0 = .08, R1 = .11, H = .09;
    const vi = disegno('vimini', 64, 64, (x) => { x.fillStyle = '#b08848'; x.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) for (let i = 0; i < 64; i += 8) { x.fillStyle = (i / 8 + y / 8) % 2 ? '#c8a060' : '#8a6630'; x.fillRect(i, y, 8, 4); } }); vi.repeat.set(8, 2);
    put(g, lat([[0, 0], [R0, 0], [R1, H], [R1 - .006, H], [R0 - .006, .006], [0, .006]], 28), mat('#c8a060', 'tessuto', vi));
    put(g, tor(R1, .006, 0, 6, 28), mat('#8a6630', 'legno'), 0, H, 0, PI / 2);
    put(g, tor(R1 * .95, .006, PI, 6, 20), mat('#8a6630', 'legno'), 0, H, 0, 0, 0, 0);
    for (let i = 0; i < 7; i++) frutto(g, o.f || 'fungo', Math.cos(i * 2.1) * .055, H - .02, Math.sin(i * 2.1) * .05, 1.1, i);
    g.userData.manico = [0, H + R1 * .95, 0]; return g;
  };
  P.cestino = { how: 'appeso' };
  // il cartoccio di carta di giornale (castagne arrosto, noci)
  M.cartoccio = o => {
    const g = G(), k = o.f || 'castagna';
    const gt = disegno('giornale', 128, 128, (x) => { x.fillStyle = '#e4dccb'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(30,30,30,.55)'; for (let y = 6; y < 128; y += 6) for (let c = 0; c < 3; c++) x.fillRect(4 + c * 42, y, 36 - ((y * 7 + c * 13) % 11), 2); x.fillStyle = '#2a2a2a'; x.fillRect(6, 10, 80, 8); });
    const c = put(g, cyl(.06, .006, .17, 20, true), mat('#e4dccb', 'carta', gt)); c.material.side = T.DoubleSide; c.position.set(0, .09, -.02); c.rotation.x = -.35;
    for (let i = 0; i < 8; i++) frutto(g, k, Math.cos(i * 2.2) * .03, .17 + (i % 3) * .01, -.05 + Math.sin(i * 2.2) * .025, 1, i);
    return g;
  };
  P.cartoccio = { how: 'pugno' };
  // la confezione di cartone delle uova, aperta
  M.uova = o => {
    const g = G(), w = .15, d = .1, C = mat('#b8ab92', 'cartone');
    put(g, rbox(w, .035, d, .006), C, 0, .0175, 0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { frutto(g, 'uovo', (i - 1) * .046, .052, (j - .5) * .046, 1, i * 2 + j); }
    const cop = put(g, rbox(w, .03, d, .006), C, 0, .1, -d / 2 - .01, -1.35); cop.position.set(0, .035 + d / 2 * .2, -d / 2 - .012);
    return g;
  };
  P.uova = { how: 'piatto' };
  // la forma di formaggio con lo spicchio tagliato
  M.forma = o => {
    const g = G(), R = .1, H = .07, c = o.c || '#e8c860', cr = o.crosta || '#c89838';
    put(g, new T.CylinderGeometry(R, R, H, 32, 1, false, .5, PI * 2 - .9), mat(cr, 'cibo'), 0, H / 2, 0);
    // la pasta in vista nel taglio
    [.5, .5 - .9].forEach((a, i) => { const p = put(g, pia(R, H), mat(c, 'cibo'), Math.sin(a) * R / 2, H / 2, Math.cos(a) * R / 2, 0, a + PI / 2 * (i ? -1 : 1) + (i ? PI : 0)); p.material.side = T.DoubleSide; });
    put(g, new T.CylinderGeometry(R - .006, R - .006, .002, 32, 1, false, .5, PI * 2 - .9), mat(c, 'cibo'), 0, H + .0005, 0);
    for (let i = 0; i < 5; i++) put(g, sfe(.005, 8, 6), mat(shade(c, .8), 'cibo'), Math.sin(.1 * i) * R * .4, .015 + i * .01, Math.cos(.1 * i) * R * .4 - .01);
    // lo spicchio appoggiato davanti
    const sp = put(g, new T.CylinderGeometry(R * .9, R * .9, H, 12, 1, false, 0, .7), mat(cr, 'cibo'), .05, .04, .1, PI / 2, 0, .3);
    return g;
  };
  P.forma = { how: 'pugno' };
  // la ricotta nella fiscella
  M.ricotta = o => {
    const g = G();
    const fi = disegno('fiscella', 64, 32, (x) => { x.fillStyle = '#e8e4d8'; x.fillRect(0, 0, 64, 32); x.fillStyle = 'rgba(80,90,110,.45)'; for (let i = 0; i < 64; i += 4) for (let y = 0; y < 32; y += 4) if ((i + y) % 8 === 0) x.fillRect(i, y, 2, 2); }); fi.repeat.set(4, 1);
    put(g, lat([[0, 0], [.05, 0], [.065, .07], [.06, .07], [.045, .004], [0, .004]], 28), mat('#e8e4d8', 'plastica', fi));
    put(g, sfe(.062, 22, 10, 0, PI * 2, 0, PI / 2), mat('#f4f0e6', 'cibo'), 0, .068, 0, 0, 0, 0, [1, .45, 1]);
    return g;
  };
  P.ricotta = { how: 'pugno' };
  // la bistecca sulla carta del macellaio
  M.bistecca = o => {
    const g = G();
    put(g, rbox(.24, .003, .2, .001), mat('#e8dccb', 'carta'), 0, .0015, 0, 0, .15, 0);
    const s = new T.Shape(); s.moveTo(-.08, -.03); s.bezierCurveTo(-.1, .04, -.02, .07, .04, .05); s.bezierCurveTo(.1, .04, .1, -.03, .06, -.05); s.bezierCurveTo(.02, -.07, -.06, -.06, -.08, -.03);
    put(g, ext(s, .022, .006), mat(o.c || '#a8302a', 'cibo'), 0, .015, 0, PI / 2);
    const gr = new T.Shape(); gr.moveTo(.04, .05); gr.bezierCurveTo(.1, .04, .1, -.03, .06, -.05); gr.lineTo(.055, -.04); gr.bezierCurveTo(.085, -.02, .085, .03, .04, .04);
    put(g, ext(gr, .024, .004), mat('#f0e0c8', 'cibo'), 0, .015, 0, PI / 2);
    put(g, cyl(.007, .007, .026, 10), mat('#f0e8d8', 'cibo'), -.02, .015, 0);   // l'osso
    return g;
  };
  P.bistecca = { how: 'piatto' };
  // la catena di salsicce
  M.salsicce = o => {
    const g = G(), c = o.c || '#c8706a';
    const pts = [[-.12, .016, -.03], [-.06, .016, .02], [0, .016, .03], [.06, .016, -.01], [.11, .016, -.04], [.15, .016, .01]];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], m = [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2]; const o2 = put(g, new T.CapsuleGeometry(.014, .035, 6, 12), mat(c, 'lucido'), m[0], m[1], m[2], 0, 0, PI / 2); o2.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]); put(g, sfe(.006, 6, 4), mat('#d8b8a8', 'cibo'), b[0], b[1], b[2]); }
    return g;
  };
  P.salsicce = { how: 'appeso' };
  // il salame (o la mortadella): o.c = budello, o.fetta = colore della fetta, o.big
  M.salame = o => {
    const g = G(), big = !!o.big, L = big ? .24 : .22, R = big ? .07 : .028, c = o.c || '#8a3a30', f = o.fetta || '#c8605a';
    const ft = disegno('fetta' + f + big, 64, 64, (x) => { x.fillStyle = f; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); const r = rng(9); x.fillStyle = '#f4e4dc'; for (let i = 0; i < (big ? 12 : 30); i++) { x.beginPath(); x.arc(8 + r() * 48, 8 + r() * 48, big ? 3.5 : 1.6, 0, PI * 2); x.fill(); } if (big) { x.fillStyle = '#5a7a3a'; for (let i = 0; i < 8; i++) { x.beginPath(); x.arc(12 + r() * 40, 12 + r() * 40, 1.3, 0, PI * 2); x.fill(); } } });
    // il corpo coricato lungo X, la punta legata a sinistra, il taglio a destra
    put(g, lat([[0, 0], [R * .5, R * .1], [R * .9, R * .5], [R, R * 1.4], [R, L - R * .2], [0, L - R * .2]], 26), mat(c, big ? 'lucido' : 'cibo'), -L / 2, R, 0, 0, 0, -PI / 2);
    put(g, cyl(R * .97, R * .97, .002, 26), mat('#ffffff', 'cibo', ft), L / 2 - R * .2 + .001, R, 0, 0, 0, PI / 2);
    if (big) { for (let i = 0; i < 3; i++) put(g, cyl(R * .97, R * .97, .003, 26), mat('#ffffff', 'cibo', ft), L / 2 + .02 + i * .035, .003 + i * .0035, .03 + i * .01, 0, i * .4, 0); }
    else { for (let i = 0; i < 5; i++) put(g, tor(R + .001, .0015, 0, 4, 18), mat('#e8dcc0', 'tessuto'), -L / 2 + .05 + i * .035, R, 0, 0, PI / 2, 0); put(g, tubo([[-L / 2, R, 0], [-L / 2 - .02, R + .02, 0], [-L / 2 - .01, R + .04, 0]], .0015, 10, 4), mat('#e8dcc0', 'tessuto')); }
    if (big) for (let i = 0; i < 4; i++) put(g, tor(R + .001, .002, 0, 4, 26), mat('#e8dcc0', 'tessuto'), -L / 2 + .04 + i * .05, R, 0, 0, PI / 2, 0);
    return g;
  };
  P.salame = { how: 'pugno' };
  // il pesce: corpo affusolato schiacciato, coda a forbice, pinne, occhio; o.c, o.L
  function pesce(g, x, y, z, L, c, ry, seed) {
    const s = new T.Group(); s.position.set(x, y, z); s.rotation.y = ry || 0; g.add(s);
    const H = L * .26, pr = [[0, 0], [H * .25, L * .05], [H * .45, L * .2], [H * .5, L * .4], [H * .42, L * .62], [H * .22, L * .8], [H * .08, L * .88], [0, L * .9]];
    const b = put(s, lat(pr, 16), mat(c, 'lucido'), 0, 0, 0, 0, 0, -PI / 2, [1, 1, .38]);
    b.position.x = -L * .45;
    const pancia = put(s, lat(pr.map(p => [p[0] * .96, p[1]]), 16, 0), mat(mix(c, '#f0f0f0', .55), 'lucido'), -L * .45, -H * .06, 0, 0, 0, -PI / 2, [1, .7, .4]);
    const coda = ext([[0, 0], [L * .14, H * .45], [L * .1, 0], [L * .14, -H * .45]], .003, 0); put(s, coda, mat(shade(c, .8), 'lucido'), L * .42, 0, 0);
    put(s, ext([[0, 0], [L * .12, H * .05], [L * .2, 0]], .002, 0), mat(shade(c, .75), 'lucido'), -L * .1, H * .45, 0);   // la pinna dorsale
    [-1, 1].forEach(sd => { put(s, sfe(L * .022, 8, 6), mat('#e8e0c8', 'lucido'), -L * .36, H * .1, sd * H * .17); put(s, sfe(L * .012, 6, 4), mat('#101010', 'lucido'), -L * .37, H * .1, sd * H * .18); });
    return s;
  }
  M.pesce = o => { const g = G(), L = o.L || .3; pesce(g, 0, L * .07, 0, L, o.c || '#7a96a8', 0); g.userData.su = 'x'; g.userData.manico = [L * .5, L * .07, 0]; return g; };   // in mano: per la coda, la testa in giù
  P.pesce = { how: 'appeso' };
  // le sarde sulla carta oleata
  M.sarde = o => { const g = G(); put(g, rbox(.22, .002, .16, .001), mat('#e8e0c8', 'carta'), 0, .001, 0, 0, -.1, 0); for (let i = 0; i < 5; i++) pesce(g, (i % 2) * .02 - .01, .012, (i - 2) * .028, .15, i % 2 ? '#5a7a98' : '#6a88a4', (i % 2 ? .1 : -.1)); return g; };
  P.sarde = { how: 'piatto' };
  // il polpo: la testa e otto tentacoli arricciati
  M.polpo = o => {
    const g = G(), c = o.c || '#b86a6a', m = mat(c, 'lucido');
    put(g, sfe(.05, 18, 12), m, 0, .06, -.02, -.4, 0, 0, [1, 1.3, 1]);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * PI * 2, pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6, rr = .03 + t * .12, aa = a + t * .9 * (i % 2 ? 1 : -1); pts.push([Math.cos(aa) * rr, .02 * (1 - t) + .006, Math.sin(aa) * rr]); }
      const p = put(g, new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2]))), 24, .009, 6), m);
      // il tentacolo si assottiglia: si scala lungo la curva spostando i vertici verso l'asse
      const pos = p.geometry.attributes.position, cur = new T.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2]))), tmp = V3(0, 0, 0);
      for (let v = 0; v < pos.count; v++) { const seg = Math.floor(v / 7) / 24; cur.getPoint(Math.min(1, seg), tmp); const k = 1 - seg * .8; pos.setXYZ(v, tmp.x + (pos.getX(v) - tmp.x) * k, tmp.y + (pos.getY(v) - tmp.y) * k, tmp.z + (pos.getZ(v) - tmp.z) * k); }
      p.geometry.computeVertexNormals();
    }
    [-1, 1].forEach(s => put(g, sfe(.007, 8, 6), mat('#101010', 'lucido'), s * .03, .07, .02));
    return g;
  };
  P.polpo = { how: 'appeso' };
  // il baccalà: la mezzena secca e salata, triangolare
  M.baccala = o => { const g = G(); put(g, ext([[-.16, -.02], [.14, -.07], [.18, 0], [.14, .07], [-.16, .03], [-.2, .06], [-.19, -.06]], .012, .004), mat('#e8dcc0', 'cibo'), 0, .008, 0, PI / 2); put(g, ext([[-.15, -.01], [.12, -.04], [.15, 0], [.12, .04], [-.15, .015]], .004, 0), mat('#f2ecd8', 'cibo'), 0, .015, 0, PI / 2); return g; };
  P.baccala = { how: 'piatto' };
  // il panino imbottito
  M.panino = o => {
    const g = G();
    put(g, sfe(.06, 20, 10, 0, PI * 2, 0, PI / 2), mat('#c8843a', 'cibo'), 0, .028, 0, 0, 0, 0, [1.5, .5, .85]);
    put(g, cyl(.06, .06, .012, 20), mat('#c8843a', 'cibo'), 0, .008, 0, 0, 0, 0, [1.5, 1, .85]);
    put(g, cyl(.064, .064, .006, 20), mat('#c86a6a', 'cibo'), 0, .018, 0, 0, 0, 0, [1.5, 1, .85]);   // la mortadella
    put(g, cyl(.066, .066, .003, 12), mat('#6a9a3a', 'cibo'), 0, .022, 0, 0, .3, 0, [1.45, 1, .9]);   // l'insalata
    put(g, rbox(.22, .002, .16, .001), mat('#f2ead8', 'carta'), 0, .001, 0, 0, .2, 0);
    return g;
  };
  P.panino = { how: 'pugno' };
  // il piatto (pasto caldo): o.cibo = pasta | carne | pesce
  M.piatto = o => {
    const g = G(), R = .12;
    put(g, lat([[0, 0], [R * .5, 0], [R * .55, .008], [R * .62, .012], [R, .025], [R - .006, .028], [R * .6, .016], [0, .016]], 32), mat('#f4f0e8', 'ceramica'));
    put(g, tor(R - .008, .002, 0, 5, 32), mat('#2a5aa8', 'ceramica'), 0, .025, 0, PI / 2);
    // gli spaghetti al sugo: una montagnola di tubetti sottili e la salsa sopra
    const r = rng(4); for (let i = 0; i < 18; i++) { const a = r() * PI * 2, d = r() * .045; put(g, tor(.012 + r() * .02, .0022, PI * (1 + r()), 4, 14), mat('#e8c878', 'cibo'), Math.cos(a) * d, .022 + r() * .018, Math.sin(a) * d, r() * PI, r() * PI, 0); }
    put(g, sfe(.04, 16, 8, 0, PI * 2, 0, PI / 2), mat('#b82a1a', 'lucido'), 0, .036, 0, 0, 0, 0, [1, .35, 1]);
    put(g, sfe(.006, 6, 4), mat('#3a7a2a', 'cibo'), .01, .05, .004);
    asta(g, [.07, .03, .06], [.14, .03, .02], .003, mat('#c8ccd4', 'acciaio'));   // la forchetta
    return g;
  };
  P.piatto = { how: 'regge', w: .26, d: .26 };
  // la gavetta militare d'alluminio col manico ripiegato, piena di minestra
  M.gavetta = o => {
    const g = G(), A = mat('#9aa098', 'metallo');
    const s = rrect(-.09, -.06, .09, .06, .05);
    put(g, ext(s, .07, .006), A, 0, .035, 0, PI / 2);
    put(g, rbox(.17, .002, .11, .045), mat(o.dentro || '#a86a3a', 'lucido'), 0, .062, 0);
    put(g, tubo([[-.08, .068, -.03], [-.16, .07, -.03], [-.16, .07, .03], [-.08, .068, .03]], .004, 16, 5), A);
    asta(g, [.03, .06, .02], [.12, .1, .05], .0035, A);   // il cucchiaio
    return g;
  };
  P.gavetta = { how: 'regge', w: .2, d: .14 };
  // il cono gelato
  M.cono = o => {
    const g = G();
    const ci = disegno('cialda', 64, 64, (x) => { x.fillStyle = '#d8a050'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#a8702a'; x.lineWidth = 2; for (let i = -64; i < 64; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); } }); ci.repeat.set(3, 1);
    put(g, cyl(.032, .004, .12, 20, true), mat('#d8a050', 'cibo', ci), 0, .06, 0);
    put(g, sfe(.034, 18, 12), mat(o.c || '#f0c8d0', 'cibo'), 0, .13, 0);
    put(g, sfe(.03, 18, 12), mat('#6a3a1a', 'cibo'), .006, .17, 0);
    put(g, cyl(.034, .034, .008, 20), mat(o.c || '#f0c8d0', 'cibo'), 0, .118, 0);
    g.userData.grip = .05; return g;
  };
  P.cono = { how: 'pugno' };
  // la tavoletta di cioccolato incartata, un angolo scartato
  M.tavoletta = o => {
    const g = G(), w = .15, d = .07;
    put(g, rbox(w, .012, d, .002), mat('#5a2a14', 'lucido'), 0, .006, 0);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) if (i < 4) put(g, rbox(.02, .004, .018, .002), mat('#6a3418', 'lucido'), -w / 2 + .014 + i * .024, .013, (j - 1) * .022);
    put(g, rbox(w * .66, .014, d + .002, .002), mat('#c8a838', 'metallo'), w * .17, .007, 0);
    decal(g, etichetta({ bg: '#1a3a7a', fg: '#e8c860', testo: 'CIOCCOLATO', band: '#c83a2a' }), w * .64, d, w * .17, .0145, 0, 0, -PI / 2);
    return g;
  };
  P.tavoletta = { how: 'piatto' };
  // il panetto incartato (burro, strutto, lievito, caffè sottovuoto): o.c (carta), o.et, o.w/h/d
  M.panetto = o => {
    const g = G(), w = o.w || .1, h = o.h || .035, d = o.d || .06;
    put(g, rbox(w, h, d, .004), mat(o.c || '#f2ead8', o.lucido ? 'metallo' : 'carta'), 0, h / 2, 0);
    [-1, 1].forEach(s => put(g, ext([[-d / 2, 0], [d / 2, 0], [0, h * .9]], .001, 0), mat(shade(o.c || '#f2ead8', .9), 'carta'), s * (w / 2 + .0006), .001, 0, 0, PI / 2));
    decal(g, etichetta(Object.assign({ bg: o.c || '#f2ead8', fg: '#2a5aa8', testo: 'BURRO', band: '#2a5aa8' }, o.et || {})), w * .9, d * .85, 0, h + .0008, 0, 0, -PI / 2);
    return g;
  };
  P.panetto = { how: 'pugno' };
  // la polenta sul tagliere col filo
  M.polenta = o => {
    const g = G();
    put(g, rbox(.24, .018, .24, .02), mat('#b8905a', 'legno'), 0, .009, 0);
    put(g, sfe(.1, 22, 10, 0, PI * 2, 0, PI / 2), mat('#e8b838', 'cibo'), 0, .018, 0, 0, 0, 0, [1, .55, 1]);
    asta(g, [-.12, .05, .02], [.12, .05, .02], .0008, mat('#e8e0d0', 'tessuto'), 4);
    return g;
  };
  P.polenta = { how: 'regge', w: .26, d: .26 };
  // il grappolo d'uva
  M.grappolo = o => {
    const g = G(), r = rng(11), c = o.c || '#5a2a5a';
    for (let i = 0; i < 26; i++) { const t = i / 26, y = .14 - t * .12, rr = .035 * (1 - t * .7); const a = i * 2.4; put(g, sfe(.011, 10, 8), mat(r() < .3 ? shade(c, 1.2) : c, 'lucido'), Math.cos(a) * rr * r(), y, Math.sin(a) * rr * r()); }
    put(g, tubo([[0, .14, 0], [.004, .17, 0], [-.01, .19, .005]], .0025, 10, 5), mat('#6a5a2a', 'legno'));
    put(g, ext([[0, 0], [.03, .02], [.05, 0], [.04, -.02], [.02, -.01]], .002, 0), mat('#5a7a2a', 'cibo'), .01, .17, 0, 0, 0, .4);
    g.userData.manico = [0, .19, 0]; return g;
  };
  P.grappolo = { how: 'appeso' };
  // la corona di fichi secchi infilati sullo spago
  M.collana_fichi = o => { const g = G(); for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; frutto(g, 'fico', Math.cos(a) * .09, .012, Math.sin(a) * .09, 1, i); } put(g, tor(.09, .0015, 0, 4, 40), mat('#d8c8a0', 'tessuto'), 0, .012, 0, PI / 2); return g; };
  P.collana_fichi = { how: 'appeso' };
  // l'insalata e le carote (verdura)
  M.verdura = o => {
    const g = G(), r = rng(2);
    for (let i = 0; i < 14; i++) { const a = i * 2.4, t = i / 14; put(g, sfe(.05 - t * .02, 12, 8, 0, PI * 2, 0, PI * .6), mat(t < .5 ? '#5a9a3a' : '#8ac858', 'cibo'), Math.cos(a) * .02 * (1 - t), .03 + t * .03, Math.sin(a) * .02 * (1 - t), r() * .8 - .4, a, r() * .6 - .3, [1, .9, .4]); }
    for (let i = 0; i < 3; i++) { const c = put(g, cyl(.012, .002, .13, 10), mat('#e0782a', 'cibo'), .08 + i * .02, .015, -.03 + i * .03, 0, .3 * i, PI / 2 - .1); put(g, cyl(.002, .006, .06, 6), mat('#4a8a2a', 'cibo'), .01 + i * .02, .02, -.03 + i * .03, 0, 0, PI / 2 + .3); }
    return g;
  };
  P.verdura = { how: 'regge', w: .2, d: .16 };
  // il capo di bestiame: una pecora con la lana a batuffoli
  M.pecora = o => {
    const g = G(), L = mat('#e8e0cc', 'tessuto'), Z = mat('#3a3028', 'opaco');
    for (let i = 0; i < 16; i++) { const a = i * 2.4, t = (i % 8) / 8; put(g, sfe(.13, 12, 8), L, -.18 + (i % 8) * .05, .5 + Math.sin(a) * .06, Math.cos(a) * .1, 0, 0, 0, [1, .9, .9]); }
    put(g, sfe(.2, 16, 12), L, 0, .5, 0, 0, 0, 0, [1.5, .9, .95]);
    put(g, new T.CapsuleGeometry(.06, .1, 6, 12), Z, .34, .64, 0, 0, 0, 1.1);   // la testa
    [-1, 1].forEach(s => { put(g, new T.CapsuleGeometry(.018, .06, 4, 8), Z, .32, .7, s * .07, s * .6, 0, 0); put(g, sfe(.01, 6, 4), mat('#101010', 'lucido'), .38, .68, s * .04); });
    [[.2, .1], [.2, -.1], [-.2, .1], [-.2, -.1]].forEach(([x, z]) => put(g, cyl(.022, .018, .38, 8), Z, x, .19, z));
    put(g, new T.CapsuleGeometry(.03, .05, 4, 8), L, -.34, .5, 0, 0, 0, -.5);
    return g;
  };
  P.pecora = { how: 'regge', w: .4, d: .4 };

  // ---------------- tazze e bicchieri ----------------
  M.tazzina = o => {
    const g = G(), W = mat('#f4f0e8', 'ceramica');
    put(g, lat([[0, 0], [.03, 0], [.034, .003], [.064, .009], [.066, .012], [.06, .012], [.03, .007], [0, .007]], 30), W);
    put(g, lat([[0, .008], [.018, .008], [.02, .01], [.03, .03], [.033, .05], [.03, .05], [.027, .032], [.016, .014], [0, .014]], 26), W);
    put(g, cyl(.027, .027, .002, 22), mat('#3a1a0c', 'lucido'), 0, .044, 0);
    put(g, tor(.011, .0035, PI * 1.3, 6, 14), W, .036, .032, 0, 0, 0, -PI * .65);
    put(g, tor(.031, .0015, 0, 4, 26), mat('#c8a040', 'metallo'), 0, .049, 0, PI / 2);
    return g;
  };
  P.tazzina = { how: 'pugno' };
  // il bicchiere di vetro (tè, orzo): o.liq
  M.bicchiere = o => {
    const g = G(), R = .033, H = .1;
    put(g, lat([[0, 0], [R * .9, 0], [R, .01], [R * 1.08, H], [R * 1.04, H], [R * .94, .012], [0, .012]], 26), mat('#e8f0ee', 'vetro'));
    put(g, lat([[0, .012], [R * .92, .012], [R * 1.01, H * .82], [0, H * .82]], 22), mat(o.liq || '#a8581a', 'liquido'));
    if (o.cucchiaino) asta(g, [0, .03, 0], [.02, H + .04, -.012], .0022, mat('#c8ccd4', 'acciaio'));
    if (o.limone) put(g, cyl(.016, .016, .003, 16), mat('#e8d040', 'cibo'), R * .6, H - .01, 0, 0, 0, 1.2);
    g.userData.grip = H * .45; return g;
  };
  P.bicchiere = { how: 'pugno' };
  // la tazza grande col manico (orzo, caffellatte)
  M.tazza = o => {
    const g = G(), W = mat(o.c || '#f0ece2', 'ceramica'), R = .042, H = .085;
    put(g, lat([[0, 0], [R * .8, 0], [R * .85, .006], [R, H], [R - .004, H], [R * .82, .01], [0, .01]], 28), W);
    put(g, cyl(R - .005, R - .005, .002, 24), mat(o.liq || '#7a4a2a', 'lucido'), 0, H - .01, 0);
    put(g, tor(.022, .006, PI * 1.25, 8, 16), W, R + .006, H * .5, 0, 0, 0, -PI * .62);
    if (o.fascia) put(g, cyl(R * .97 + .0012, R * .92 + .0012, .012, 28, true), mat(o.fascia, 'ceramica'), 0, H * .72, 0);
    return g;
  };
  P.tazza = { how: 'pugno' };

  // ---------------- attrezzi (in piedi lungo +Y, userData.grip = il pugno) ----------------
  // un manico tornito di legno da y0 a y1 (raggio r, ovale k)
  function manico(g, y0, y1, r, c, k) { const L = y1 - y0; const h = put(g, lat([[0, 0], [r * .8, 0], [r, L * .04], [r * 1.05, L * .5], [r * .92, L * .9], [r * .8, L], [0, L]], 16), mat(c || '#a8743e', 'legno'), 0, y0, 0); if (k) h.scale.z = k; return h; }
  // impugnatura di plastica bicolore con le scanalature (cacciaviti, lime, saldatore)
  function impugnatura(g, y0, L, r, c) {
    put(g, lat([[0, 0], [r * .8, 0], [r, L * .08], [r * 1.05, L * .6], [r * .9, L * .9], [r * .6, L], [0, L]], 18), mat(c || '#c83a2a', 'plastica'), 0, y0, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; put(g, rbox(.003, L * .5, .003, .001), mat(shade(c || '#c83a2a', .7), 'plastica'), Math.cos(a) * r * 1.02, y0 + L * .45, Math.sin(a) * r * 1.02); }
  }
  M.cacciavite = o => {
    const g = G(); impugnatura(g, 0, .1, .014, o.c || '#e8c030');
    put(g, cyl(.0035, .0035, .12, 10), mat('#c8ccd4', 'cromo'), 0, .16, 0);
    put(g, rbox(.008, .012, .0015, .0005), mat('#c8ccd4', 'cromo'), 0, .225, 0);
    put(g, cyl(.006, .004, .008, 10), mat('#c8ccd4', 'cromo'), 0, .1, 0);
    g.userData.grip = .05; g.userData.diag = true; return g;
  };
  // pinze e tronchesi: due bracci ricoperti di plastica che si incrociano sul perno
  M.pinze = o => {
    const g = G(), tr = !!o.tronchese, A = mat('#8a8e96', 'acciaio'), Pm = mat(o.c || '#c83a2a', 'plastica');
    [-1, 1].forEach(s => {
      // il braccio: dal manico (in basso) al perno, poi la ganascia che incrocia
      const br = [[s * .012, 0], [s * .018, .02], [s * .016, .09], [s * .007, .13], [-s * .002, .14]];
      put(g, tubo(br.map(p => [p[0], p[1], s * .002]), .0045, 20, 6), A);
      put(g, tubo(br.slice(0, 3).map(p => [p[0] * 1.05, p[1] + .008, s * .002]), .0075, 14, 8), Pm);
      const gan = tr ? [[-s * .002, .14], [-s * .012, .15], [-s * .01, .17], [-s * .002, .175]] : [[-s * .002, .14], [-s * .007, .16], [-s * .005, .2], [-s * .0015, .205]];
      put(g, tubo(gan.map(p => [p[0], p[1], s * .002]), .0045, 14, 6), A);
    });
    put(g, cyl(.007, .007, .012, 14), A, 0, .14, 0, PI / 2);
    g.userData.grip = .05; g.userData.diag = true; return g;
  };
  // la chiave inglese regolabile (a rullino)
  M.chiave_inglese = o => {
    const g = G(), A = mat('#a8acb4', 'cromo'), L = o.L || .2;
    put(g, ext(rrect(-.009, 0, .009, L * .78, .008), .007, .0015, [{ x: 0, y: .012, r: .004 }]), A);
    // la testa con la bocca fissa e la ganascia mobile
    put(g, ext([[-.02, 0], [.022, 0], [.026, .03], [.012, .042], [.008, .022], [-.004, .022], [-.012, .044], [-.026, .03]], .008, .0015), A, 0, L * .78, 0);
    put(g, cyl(.006, .006, .007, 14), mat('#7a7e86', 'acciaio'), -.006, L * .78 + .01, 0, PI / 2);   // il rullino
    g.userData.grip = .06; g.userData.diag = true; return g;
  };
  // la chiave a tubo (giratubi)
  M.chiave_tubo = o => {
    const g = G(), R = mat(o.c || '#b82a24', 'ghisa'), A = mat('#8a8e96', 'acciaio');
    put(g, ext(rrect(-.011, 0, .011, .26, .01), .016, .003), R);
    put(g, ext([[-.012, 0], [.03, 0], [.034, .02], [.02, .028], [.016, .012], [-.012, .012]], .02, .002), A, 0, .26, 0);
    put(g, ext([[-.012, 0], [.02, 0], [.024, .014], [-.012, .014]], .018, .002), A, 0, .3, 0);
    put(g, cyl(.01, .01, .03, 14), A, -.012, .29, 0);
    g.userData.grip = .07; g.userData.diag = true; return g;
  };
  // il seghetto da ferro: archetto, lama tesa, impugnatura a pistola
  M.seghetto = o => {
    const g = G(), F = mat(o.c || '#2a5aa8', 'metallo'), A = mat('#c8ccd4', 'acciaio');
    put(g, tubo([[0, .1, 0], [0, .12, 0], [.06, .13, 0], [.3, .13, 0], [.32, .12, 0], [.32, .07, 0]], .005, 30, 6), F);
    put(g, box(.3, .012, .001), A, .17, .07, 0);
    put(g, ext([[-.01, 0], [.03, 0], [.04, .1], [.0, .11], [-.02, .03]], .022, .004, [[[.0, .025], [.022, .025], [.028, .08], [.006, .085]]]), mat('#1a1a1e', 'plastica'), -.02, 0, 0);
    g.userData.arma = [-.01, .05, 0]; return g;
  };
  // la sega da falegname: lama trapezia con i denti, impugnatura di legno a occhio
  M.sega = o => {
    const g = G(), A = mat('#c4c8ce', 'acciaio');
    const den = [[0, .1]]; for (let i = 0; i <= 40; i++) den.push([.02 + i * .011, (i % 2 ? .1 : .093) - i * .0012]);
    put(g, ext([[0, .1], ...den.slice(1), [.46, .1 - 40 * .0012 + .07], [0, .2]].map(p => [p[0], p[1]]), .0012, 0), A, .06, 0, 0);
    put(g, ext([[-.02, .08], [.08, .08], [.08, .22], [0, .23], [-.04, .16]], .022, .005, [[[0, .12], [.05, .12], [.05, .19], [.005, .19]]]), mat(o.c || '#9a6030', 'legno'));
    [.11, .17].forEach(y => put(g, cyl(.005, .005, .026, 10), mat('#c8a040', 'ottone'), .065, y, 0, PI / 2));
    g.userData.arma = [.02, .15, 0]; return g;
  };
  // la lima e il raspino
  M.lima = o => {
    const g = G(); manico(g, 0, .1, .012, '#9a6a3a');
    put(g, cyl(.008, .008, .008, 12), mat('#9aa0a8', 'metallo'), 0, .1, 0);
    const li = disegno('lima', 32, 64, (x) => { x.fillStyle = '#6a6e76'; x.fillRect(0, 0, 32, 64); x.fillStyle = '#4a4e56'; for (let y = 0; y < 64; y += 3) x.fillRect(0, y, 32, 1); });
    put(g, ext([[-.008, 0], [.008, 0], [.006, .16], [0, .17], [-.006, .16]], .004, .0008), mat('#ffffff', 'metallo', li), 0, .104, 0);
    g.userData.grip = .05; g.userData.diag = true; return g;
  };
  // lo scalpello da legno
  M.scalpello = o => {
    const g = G(); manico(g, 0, .12, .014, '#a8743e');
    put(g, cyl(.012, .015, .012, 14), mat('#7a7e86', 'acciaio'), 0, .126, 0);
    put(g, ext([[-.012, 0], [.012, 0], [.011, .1], [-.011, .11]], .005, .001), mat('#a8acb4', 'acciaio'), 0, .132, 0);
    g.userData.grip = .06; g.userData.diag = true; return g;
  };
  // la cazzuola: lama a goccia, collo piegato, manico tornito
  M.cazzuola = o => {
    const g = G(); manico(g, 0, .11, .014, '#a8743e');
    put(g, tubo([[0, .11, 0], [0, .13, 0], [0, .14, .02], [0, .145, .04]], .004, 10, 6), mat('#7a7e86', 'acciaio'));
    const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(.05, .01, .055, .09, 0, .17); s.bezierCurveTo(-.055, .09, -.05, .01, 0, 0);
    put(g, ext(s, .002, 0), mat('#a8acb4', 'acciaio'), 0, .147, .04, 0, 0, 0);
    g.userData.grip = .055; g.userData.diag = true; return g;
  };
  // le forbici: lame incrociate, anelli
  M.forbici = o => {
    const g = G(), A = mat('#c8ccd4', 'cromo'), Pm = mat(o.c || '#1a1a1e', 'plastica');
    [-1, 1].forEach(s => {
      put(g, ext([[0, 0], [s * .007, .002], [s * .004, .1], [0, .11], [-s * .002, .05]], .002, .0004), A, -s * .002, .06, s * .0012, 0, 0, s * .06);
      put(g, tor(.016, .005, 0, 8, 20), Pm, s * .018, .03, 0);
      asta(g, [s * .012, .045, 0], [-s * .001, .066, 0], .004, Pm);
    });
    put(g, cyl(.004, .004, .008, 10), mat('#8a8e96', 'acciaio'), 0, .066, 0, PI / 2);
    g.userData.grip = .03; g.userData.diag = true; return g;
  };
  // le cesoie da potatura: lame curve, molla, manici rossi
  M.cesoie = o => {
    const g = G(), A = mat('#a8acb4', 'acciaio'), R = mat('#c83a2a', 'plastica');
    [-1, 1].forEach(s => { put(g, tubo([[s * .014, 0, 0], [s * .018, .06, 0], [s * .006, .13, 0]], .007, 14, 8), R); put(g, ext([[0, 0], [-s * .016, .03], [-s * .012, .07], [0, .06]], .003, .0005), A, s * .004, .13, s * .002); });
    put(g, cyl(.007, .007, .01, 12), mat('#c8a040', 'ottone'), 0, .135, 0, PI / 2);
    put(g, tubo([[-.008, .1, 0], [0, .09, 0], [.008, .1, 0]], .0015, 8, 4), A);
    g.userData.grip = .06; g.userData.diag = true; return g;
  };
  // il coltellino a serramanico (aperto)
  M.coltellino = o => {
    const g = G();
    put(g, ext(rrect(-.009, 0, .009, .09, .008), .014, .003), mat(o.c || '#b82a24', 'plastica'));
    put(g, ext([[-.005, -.002], [.004, -.002], [.004, .002], [-.005, .002]], .003, 0), mat('#f2f0ea', 'plastica'), 0, .05, .0075);   // la croce, solo un segno
    put(g, ext([[-.008, .088], [.008, .088], [.007, .15], [0, .17], [-.006, .158]], .002, .0004), mat('#d0d4dc', 'cromo'));
    put(g, cyl(.004, .004, .016, 10), mat('#c8ccd4', 'cromo'), 0, .085, 0, PI / 2);
    g.userData.grip = .045; g.userData.diag = true; return g;
  };
  // il metro pieghevole del falegname, aperto a zig-zag
  M.metro = o => {
    const g = G();
    const mt = disegno('metro', 128, 16, (x) => { x.fillStyle = '#e8c840'; x.fillRect(0, 0, 128, 16); x.fillStyle = '#1a1a1a'; for (let i = 0; i < 128; i += 4) x.fillRect(i, 0, 1, i % 20 ? 4 : 8); x.font = 'bold 8px sans-serif'; x.fillText('10', 18, 14); x.fillText('20', 58, 14); x.fillText('30', 98, 14); });
    const M1 = mat('#ffffff', 'legno', mt), A = mat('#c8ccd4', 'metallo');
    // il pacchetto delle stecche chiuse (20 cm) e le ultime due aperte a gomito: si legge come metro da falegname
    for (let i = 0; i < 6; i++) put(g, box(.2, .0035, .017), M1, 0, .002 + i * .0036, 0);
    put(g, cyl(.006, .006, .024, 12), A, .1, .012, 0);
    put(g, box(.2, .0035, .017), M1, .1 + Math.cos(.7) * .1, .024, Math.sin(.7) * .1, 0, -.7, 0);
    put(g, cyl(.005, .005, .006, 12), A, .1 + Math.cos(.7) * .2, .025, Math.sin(.7) * .2);
    put(g, box(.2, .0035, .017), M1, .1 + Math.cos(.7) * .2 + Math.cos(-.5) * .1, .028, Math.sin(.7) * .2 + Math.sin(-.5) * .1, 0, .5, 0);
    return g;
  };
  P.metro = { how: 'piatto' };
  // la pialla: cassa di legno, lama inclinata, pomello
  M.pialla = o => {
    const g = G(), L = mat('#b8864a', 'legno');
    put(g, rbox(.24, .05, .06, .01), L, 0, .025, 0);
    put(g, lat([[0, 0], [.018, 0], [.02, .02], [.014, .04], [0, .045]], 16), mat('#8a5a2a', 'legno'), .09, .05, 0);
    put(g, ext([[-.04, 0], [.02, 0], [.03, .07], [-.05, .08], [-.06, .05]], .03, .005, [[[-.035, .015], [.01, .015], [.015, .055], [-.04, .06]]]), mat('#8a5a2a', 'legno'), -.08, .05, 0);
    put(g, rbox(.05, .008, .055, .002), mat('#7a7e86', 'acciaio'), .0, .065, 0, 0, 0, -.8);
    put(g, cyl(.008, .008, .02, 12), mat('#c8a040', 'ottone'), .0, .08, 0);
    return g;
  };
  P.pialla = { how: 'pugno' };
  // l'ascia da boscaiolo: manico curvo, testa con il filo
  M.ascia = o => {
    const g = G();
    put(g, tubo([[0, 0, 0], [.008, .2, 0], [0, .45, 0], [-.006, .62, 0]], .016, 30, 10), mat('#b8864a', 'legno'));
    // la testa nel piano XY: l'occhio sul manico, la lama che si allarga verso +X, il filo lucido
    const testa = [[-.035, -.025], [.02, -.022], [.07, -.05], [.1, -.055], [.1, .055], [.07, .05], [.02, .022], [-.035, .025], [-.045, 0]];
    put(g, ext(testa, .03, .004), mat('#4a4c54', 'ghisa'), 0, .6, 0);
    put(g, ext([[.088, -.054], [.104, -.056], [.104, .056], [.088, .054]], .032, .002), mat('#c8ccd4', 'acciaio'), 0, .6, 0);
    g.userData.grip = .1; g.userData.diag = true; return g;
  };
  P.ascia = { how: 'lungo' };
  // la mazza da muratore (o la mazzetta)
  M.mazza = o => {
    const g = G(), big = !o.piccola, L = big ? .7 : .28;
    manico(g, 0, L, big ? .018 : .014, '#b8864a', .8);
    const H = big ? [.16, .06] : [.1, .04];
    put(g, rbox(H[0], H[1], H[1], .008), mat('#3a3c42', 'ghisa'), 0, L + H[1] * .3, 0);
    [-1, 1].forEach(s => put(g, cyl(H[1] * .52, H[1] * .52, .006, 14), mat('#5a5c62', 'acciaio'), s * H[0] / 2, L + H[1] * .3, 0, 0, 0, PI / 2));
    g.userData.grip = big ? .12 : .08; g.userData.diag = true; return g;
  };
  P.mazza = { how: 'lungo' };
  // il piccone
  M.piccone = o => {
    const g = G(); manico(g, 0, .85, .02, '#b8864a', .8);
    const s = new T.Shape(); s.moveTo(-.3, .0); s.quadraticCurveTo(-.15, .05, 0, .04); s.quadraticCurveTo(.15, .05, .3, 0); s.lineTo(.3, -.008); s.quadraticCurveTo(.15, .02, 0, -.01); s.quadraticCurveTo(-.15, .02, -.3, -.008);
    put(g, ext(s, .03, .004), mat('#4a4c52', 'ghisa'), 0, .82, 0);
    put(g, rbox(.05, .06, .045, .008), mat('#3a3c42', 'ghisa'), 0, .835, 0);
    g.userData.grip = .14; g.userData.diag = true; return g;
  };
  P.piccone = { how: 'lungo' };
  // la pala: manico lungo con l'impugnatura a T, lama a cucchiaio
  M.pala = o => {
    const g = G(); manico(g, .22, 1.08, .018, '#b8864a');
    put(g, cyl(.012, .012, .12, 10), mat('#b8864a', 'legno'), 0, 1.1, 0, 0, 0, PI / 2);
    asta(g, [-.05, 1.06, 0], [0, 1.1, 0], .008, mat('#7a7e86', 'acciaio')); asta(g, [.05, 1.06, 0], [0, 1.1, 0], .008, mat('#7a7e86', 'acciaio'));
    const s = new T.Shape(); s.moveTo(-.11, .25); s.lineTo(.11, .25); s.lineTo(.12, .08); s.quadraticCurveTo(.06, -.02, 0, -.03); s.quadraticCurveTo(-.06, -.02, -.12, .08);
    const l = put(g, ext(s, .004, .001), mat('#5a5e64', 'metallo'), 0, 0, .015); l.scale.z = 1;
    put(g, cyl(.024, .02, .1, 12), mat('#5a5e64', 'metallo'), 0, .28, .01);
    g.userData.grip = .7; g.userData.diag = true; return g;
  };
  P.pala = { how: 'lungo' };
  // la zappa
  M.zappa = o => {
    const g = G(); manico(g, 0, 1, .018, '#b8864a');
    put(g, ext([[-.07, 0], [.07, 0], [.075, .14], [-.075, .14]], .004, .001), mat('#5a5e64', 'metallo'), 0, .98, .08, -PI / 2 + .4, 0, 0);
    put(g, cyl(.024, .024, .06, 12), mat('#4a4c52', 'ghisa'), 0, .98, .02, PI / 2);
    g.userData.grip = .15; g.userData.diag = true; return g;
  };
  P.zappa = { how: 'lungo' };
  // la falce messoria (falcetto)
  M.falce = o => {
    const g = G(); manico(g, 0, .13, .016, '#9a6a3a');
    put(g, cyl(.012, .016, .015, 12), mat('#7a7e86', 'acciaio'), 0, .135, 0);
    const s = new T.Shape(); s.moveTo(-.006, 0); s.bezierCurveTo(-.01, .1, .12, .22, .2, .14); s.bezierCurveTo(.14, .19, .02, .1, .008, 0);
    put(g, ext(s, .002, .0005), mat('#c4c8ce', 'acciaio'), 0, .14, 0);
    g.userData.grip = .06; g.userData.diag = true; return g;
  };
  // il piede di porco
  M.piede_porco = o => {
    const g = G(), A = mat(o.c || '#2a2c32', 'ghisa');
    put(g, tubo([[0, .02, 0], [0, .55, 0], [.01, .6, 0], [.05, .63, 0], [.08, .615, 0]], .011, 30, 8), A);
    put(g, tubo([[0, .02, 0], [-.01, -.005, 0], [-.04, -.015, 0]], .011, 10, 8), A);
    put(g, ext([[.07, .6], [.095, .605], [.09, .625], [.075, .63]], .02, .002), A, 0, 0, 0);
    g.userData.grip = .2; g.userData.diag = true; return g;
  };
  P.piede_porco = { how: 'lungo' };
  // i grimaldelli nell'astuccio di pelle
  M.grimaldelli = o => {
    const g = G();
    put(g, rbox(.14, .008, .07, .004), mat('#5a3a22', 'tessuto'), 0, .004, 0);
    for (let i = 0; i < 5; i++) { const z = -.025 + i * .0125; put(g, rbox(.1, .002, .003, .0006), mat('#c8ccd4', 'cromo'), -.005, .0095, z); put(g, rbox(.004, .002, .006 + (i % 3) * .003, .0005), mat('#c8ccd4', 'cromo'), .046, .0095, z + .003); put(g, rbox(.03, .006, .008, .002), mat('#1a1a1e', 'plastica'), -.045, .011, z); }
    return g;
  };
  P.grimaldelli = { how: 'piatto' };
  // il trapano elettrico a pistola (anni '80, carrozzeria verde e nera)
  M.trapano = o => {
    const g = G(), C = mat(o.c || '#3a7a4a', 'plastica'), K = mat('#1a1a1e', 'plastica');
    put(g, lat([[0, 0], [.03, 0], [.034, .02], [.034, .13], [.026, .15], [0, .155]], 22), C, 0, 0, 0, 0, 0, -PI / 2);
    for (let i = 0; i < 5; i++) put(g, rbox(.022, .004, .002, .001), K, -.02 - i * .008, 0, .035);   // le prese d'aria
    put(g, ext([[-.02, 0], [.02, 0], [.025, -.11], [-.005, -.12], [-.03, -.1]], .03, .008, [[[-.01, -.02], [.008, -.02], [.01, -.04], [-.01, -.04]]]), K, -.02, -.01, 0);
    put(g, rbox(.006, .016, .012, .002), mat('#c83a2a', 'plastica'), -.008, -.035, 0);   // il grilletto
    put(g, lat([[0, 0], [.016, 0], [.018, .01], [.014, .04], [.006, .045], [0, .045]], 16), mat('#7a7e86', 'acciaio'), .155, 0, 0, 0, 0, -PI / 2);
    put(g, cyl(.003, .003, .07, 8), mat('#a8acb4', 'cromo'), .23, 0, 0, 0, 0, PI / 2);
    put(g, tubo([[-.02, -.13, 0], [-.03, -.18, 0], [0, -.22, .04]], .004, 14, 5), K);   // il filo
    g.userData.arma = [-.02, -.06, 0]; return g;   // come un'arma: la canna lungo +X, il pugno sull'impugnatura
  };
  P.trapano = { how: 'pugno' };
  // il saldatore a stilo
  M.saldatore = o => {
    const g = G(); impugnatura(g, 0, .11, .013, '#1a1a1e');
    put(g, cyl(.007, .006, .04, 12), mat('#c8ccd4', 'cromo'), 0, .13, 0); put(g, cyl(.003, .001, .05, 8), mat('#8a6a3a', 'ottone'), 0, .175, 0);
    put(g, tubo([[0, 0, 0], [.01, -.04, 0], [.04, -.06, .02]], .003, 10, 5), mat('#1a1a1e', 'gomma'));
    g.userData.grip = .055; g.userData.diag = true; return g;
  };
  // il rocchetto (stagno, filo da cucito con l'ago): o.c = filo, o.metallo
  M.rocchetto = o => {
    const g = G(), W = mat(o.metallo ? '#2a2a2e' : '#e8dcc0', o.metallo ? 'plastica' : 'legno');
    put(g, lat([[0, 0], [.024, 0], [.024, .006], [.014, .008], [.014, .046], [.024, .048], [.024, .054], [0, .054]], 22), W);
    put(g, cyl(.02, .02, .036, 22), mat(o.c || '#c83a2a', o.metallo ? 'cromo' : 'tessuto'), 0, .027, 0);
    if (o.ago) asta(g, [.03, .002, -.02], [.06, .002, .04], .0008, mat('#d8dce4', 'cromo'), 6);
    return g;
  };
  P.rocchetto = { how: 'pugno' };
  // i ferri da maglia nel gomitolo
  M.ferri_maglia = o => {
    const g = G(), c = o.c || '#c84a6a';
    put(g, sfe(.045, 16, 12), mat(c, 'tessuto'), 0, .045, 0);
    for (let i = 0; i < 5; i++) put(g, tor(.045, .003, PI * .9, 4, 16), mat(shade(c, .85), 'tessuto'), 0, .045, 0, i * .7, i * 1.1, 0);
    [-1, 1].forEach(s => { asta(g, [s * .02, .02, -.06], [s * .03, .1, .08], .0025, mat('#c8ccd4', 'cromo')); put(g, sfe(.006, 8, 6), mat('#e8c040', 'plastica'), s * .02, .02, -.06); });
    put(g, rbox(.06, .02, .05, .006), mat(c, 'tessuto'), .07, .01, .02, 0, .3, 0);   // il lavoro cominciato
    return g;
  };
  P.ferri_maglia = { how: 'pugno' };
  // la pentola col coperchio e i manici
  M.pentola = o => {
    const g = G(), A = mat('#b8bcc2', 'acciaio'), R = .11, H = .13;
    put(g, lat([[0, 0], [R - .01, 0], [R, .01], [R, H], [R + .003, H + .003], [R - .004, H], [0, H]], 32), A);
    put(g, lat([[0, H + .01], [R + .002, H + .002], [R * .9, H + .02], [R * .3, H + .03], [0, H + .03]], 32), A);
    put(g, lat([[0, 0], [.014, 0], [.016, .012], [0, .016]], 14), mat('#1a1a1e', 'plastica'), 0, H + .03, 0);
    [-1, 1].forEach(s => put(g, tor(.02, .005, PI, 6, 12), mat('#1a1a1e', 'plastica'), s * (R + .004), H - .02, 0, PI / 2, 0, s * PI / 2));
    return g;
  };
  P.pentola = { how: 'regge', w: .26, d: .24 };
  // la padella di ferro col manico lungo
  M.padella = o => {
    const g = G(), F = mat('#2a2a2e', 'ghisa'), R = .12;
    put(g, lat([[0, 0], [R * .85, 0], [R, .045], [R - .004, .046], [R * .84, .004], [0, .004]], 32), F, 0, 0, .12);
    put(g, ext(rrect(-.012, 0, .012, .2, .01), .012, .003), mat('#1a1a1e', 'plastica'), 0, .04, -.03, -PI / 2 + .15, 0, 0);
    g.userData.grip = 0; return g;
  };
  P.padella = { how: 'piatto' };
  // la moka: due tronchi di piramide a otto facce, il manico nero, il pomello
  M.moka = o => {
    const g = G(), A = mat('#b8bcc2', 'metallo'), K = mat('#1a1a1e', 'plastica');
    put(g, cyl(.04, .048, .07, 8), A, 0, .035, 0);
    put(g, cyl(.014, .014, .008, 8), A, 0, .074, 0);   // la vita
    put(g, cyl(.046, .036, .085, 8), A, 0, .12, 0);
    put(g, lat([[0, 0], [.046, 0], [.038, .012], [.012, .016], [0, .016]], 8), A, 0, .162, 0);
    put(g, lat([[0, 0], [.008, 0], [.01, .012], [0, .016]], 12), K, 0, .178, 0);
    put(g, ext([[0, 0], [.012, -.004], [.04, .02], [.05, .08], [.04, .08], [.03, .03], [0, .012]], .016, .004), K, .044, .1, 0);
    put(g, ext([[0, 0], [.02, .012], [0, .014]], .02, .002), A, -.046, .148, 0);   // il becco
    return g;
  };
  P.moka = { how: 'pugno' };
  // la canna da pesca col mulinello
  M.canna_pesca = o => {
    const g = G();
    put(g, cyl(.006, .015, .3, 12), mat('#2a2a2e', 'gomma'), 0, .15, 0);
    put(g, cyl(.004, .009, 1.3, 10), mat(o.c || '#5a3a2a', 'lucido'), 0, .95, 0);
    for (let i = 0; i < 5; i++) put(g, tor(.006 - i * .0008, .0008, 0, 4, 10), mat('#c8ccd4', 'cromo'), .008, .45 + i * .22, 0, 0, PI / 2);
    // il mulinello
    put(g, cyl(.028, .028, .02, 20), mat('#3a3a40', 'metallo'), .035, .26, 0, 0, 0, PI / 2);
    put(g, cyl(.02, .02, .022, 18), mat('#e8e0c8', 'tessuto'), .035, .26, 0, 0, 0, PI / 2);
    asta(g, [.006, .26, 0], [.03, .26, 0], .004, mat('#3a3a40', 'metallo'));
    asta(g, [.048, .26, 0], [.048, .24, .03], .002, mat('#c8ccd4', 'cromo'));
    put(g, tubo([[.035, .282, 0], [.012, .45, 0], [.009, 1.6, 0], [.03, 1.5, 0], [.06, 1.2, .02]], .0005, 40, 3), mat('#e8e8e8', 'plastica'));
    g.userData.grip = .16; g.userData.diag = true; return g;
  };
  P.canna_pesca = { how: 'lungo' };
  // la rete da pesca ammucchiata coi galleggianti di sughero
  M.rete_pesca = o => {
    const g = G();
    const rt = disegno('rete', 64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.strokeStyle = '#3a6a5a'; x.lineWidth = 2; for (let i = 0; i < 64; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 64); x.stroke(); x.beginPath(); x.moveTo(i + 32, 0); x.lineTo(i, 64); x.stroke(); } });
    rt.repeat.set(3, 2); rt.wrapT = T.RepeatWrapping;
    const m = new T.MeshStandardMaterial({ map: rt, transparent: true, alphaTest: .3, side: T.DoubleSide, roughness: .9, color: '#5a8a7a' });
    for (let i = 0; i < 4; i++) put(g, sfe(.16 - i * .025, 14, 8, 0, PI * 2, 0, PI / 2), m, (i % 2) * .03, 0, (i - 1.5) * .02, 0, i, 0, [1.3, .55, 1]);
    const r = rng(6); for (let i = 0; i < 6; i++) { const a = i * 1.1; put(g, rbox(.04, .018, .025, .006), mat('#c8904a', 'legno'), Math.cos(a) * .17, .02 + r() * .04, Math.sin(a) * .12, 0, a, 0); }
    return g;
  };
  P.rete_pesca = { how: 'regge', w: .4, d: .3 };
  // la morsa da banco
  M.morsa = o => {
    const g = G(), F = mat(o.c || '#2a4a7a', 'ghisa'), A = mat('#8a8e96', 'acciaio');
    put(g, rbox(.12, .02, .08, .006), F, 0, .01, 0);
    put(g, rbox(.03, .08, .05, .006), F, -.03, .06, 0);
    put(g, rbox(.03, .06, .05, .006), F, .03, .07, 0);
    put(g, rbox(.03, .12, .03, .006), F, 0, .04, 0, 0, 0, PI / 2); g.children[3].position.set(.02, .045, 0);
    [-.014, .014].forEach(x => put(g, rbox(.004, .025, .052, .001), mat('#4a4c52', 'acciaio'), x, .095, 0));
    put(g, cyl(.006, .006, .1, 10), A, .09, .055, 0, 0, 0, PI / 2);
    put(g, cyl(.004, .004, .07, 8), A, .14, .055, 0);
    [-1, 1].forEach(s => put(g, sfe(.007, 8, 6), A, .14, .055 + s * .035, 0));
    return g;
  };
  P.morsa = { how: 'regge', w: .2, d: .1 };
  // la carriola: cassone di lamiera, ruota davanti, stanghe e gambe
  M.carriola = o => {
    const g = G(), c = o.c || '#3a6a4a', L = mat(c, 'metallo'), F = mat('#2a2a2e', 'ghisa');
    put(g, lat([[0, 0], [.18, 0], [.32, .22], [.3, .23], [.17, .02], [0, .02]], 4), L, -.05, .3, 0, 0, PI / 4, 0, [1.3, 1, 1]);
    [-1, 1].forEach(s => { put(g, tubo([[.4, .2, s * .05], [.2, .32, s * .2], [-.35, .38, s * .24], [-.75, .52, s * .26]], .016, 24, 8), F); put(g, cyl(.02, .02, .12, 10), mat('#1a1a1e', 'gomma'), -.74, .52, s * .26, 0, 0, PI / 2 - .3); asta(g, [-.3, .36, s * .23], [-.32, 0, s * .23], .012, F); });
    put(g, tor(.17, .045, 0, 10, 24), mat('#1a1a1e', 'gomma'), .42, .2, 0);
    put(g, cyl(.11, .11, .06, 18), mat('#c8a040', 'metallo'), .42, .2, 0, PI / 2);
    asta(g, [.42, .2, -.06], [.42, .2, .06], .012, F);
    return g;
  };
  P.carriola = { how: 'regge', w: .6, d: .6 };
  // lo stetoscopio
  M.stetoscopio = o => {
    const g = G(), K = mat('#1a1a1e', 'gomma'), A = mat('#c8ccd4', 'cromo');
    put(g, tubo([[0, .01, .1], [.05, .01, .04], [.03, .01, -.04], [-.04, .01, -.06], [-.07, .01, 0], [-.05, .01, .06], [0, .01, .1]], .005, 40, 6), K);
    put(g, tubo([[-.07, .01, 0], [-.11, .01, -.02], [-.13, .01, .02], [-.1, .01, .06]], .005, 20, 6), K);
    put(g, lat([[0, 0], [.022, 0], [.022, .01], [.008, .014], [0, .014]], 20), A, -.1, .002, .06);
    put(g, tubo([[0, .01, .1], [.04, .01, .14], [.08, .01, .12]], .0035, 10, 6), A); put(g, tubo([[0, .01, .1], [-.03, .01, .15], [-.07, .01, .15]], .0035, 10, 6), A);
    [[.08, .12], [-.07, .15]].forEach(([x, z]) => put(g, sfe(.007, 8, 6), K, x, .01, z));
    return g;
  };
  P.stetoscopio = { how: 'piatto' };
  // il tester (multimetro analogico) coi puntali
  M.tester = o => {
    const g = G();
    put(g, rbox(.09, .14, .035, .008), mat(o.c || '#c8a020', 'plastica'), 0, .07, 0);
    put(g, rbox(.07, .05, .004, .003), mat('#f2ead8', 'plastica'), 0, .1, .0175);
    const q = disegno('quadrante', 64, 32, (x) => { x.fillStyle = '#f2ead8'; x.fillRect(0, 0, 64, 32); x.strokeStyle = '#1a1a1a'; x.beginPath(); x.arc(32, 34, 26, PI * 1.15, PI * 1.85); x.stroke(); for (let i = 0; i <= 10; i++) { const a = PI * 1.15 + i * PI * .07; x.beginPath(); x.moveTo(32 + Math.cos(a) * 22, 34 + Math.sin(a) * 22); x.lineTo(32 + Math.cos(a) * 26, 34 + Math.sin(a) * 26); x.stroke(); } x.strokeStyle = '#c83a2a'; x.beginPath(); x.moveTo(32, 32); x.lineTo(44, 10); x.stroke(); });
    put(g, pia(.066, .046), mat('#ffffff', 'plastica', q), 0, .1, .0198);
    put(g, cyl(.016, .016, .01, 18), mat('#1a1a1e', 'plastica'), 0, .045, .02, PI / 2);
    put(g, box(.004, .022, .002), mat('#f2f0ea', 'plastica'), 0, .045, .0255);
    [['#c83a2a', .02], ['#1a1a1e', -.02]].forEach(([c, x]) => { put(g, tubo([[x, .012, .01], [x * 2, -.03, .04], [x * 4, -.02, .1], [x * 5, .0, .12]], .002, 14, 4), mat(c, 'gomma')); asta(g, [x * 5, .0, .12], [x * 6, .0, .18], .004, mat(c, 'plastica')); });
    g.userData.manico = [0, .14, 0]; return g;
  };
  // il binocolo
  M.binocolo = o => {
    const g = G(), K = mat('#1a1a1e', 'gomma'), A = mat('#3a3a40', 'metallo');
    [-1, 1].forEach(s => { put(g, lat([[0, 0], [.024, 0], [.026, .02], [.024, .07], [.018, .1], [.014, .12], [0, .12]], 18), K, s * .034, 0, 0); put(g, cyl(.022, .022, .002, 18), mat('#5a7a9a', 'vetroS'), s * .034, .001, 0); put(g, rbox(.03, .05, .05, .01), A, s * .03, .085, .01); });
    put(g, cyl(.008, .008, .05, 12), A, 0, .1, .01, 0, 0, PI / 2);
    put(g, cyl(.01, .01, .02, 12), A, 0, .115, .01);
    put(g, tubo([[-.06, .1, 0], [-.09, .2, -.04], [0, .28, -.06], [.09, .2, -.04], [.06, .1, 0]], .003, 30, 4), mat('#5a3a22', 'tessuto'));
    g.userData.grip = .06; return g;
  };
  // la bussola militare a coperchio, aperta
  M.bussola = o => {
    const g = G(), C = mat(o.c || '#4a5a3a', 'metallo');
    put(g, lat([[0, 0], [.03, 0], [.032, .004], [.032, .014], [0, .014]], 26), C);
    const q = disegno('rosa', 64, 64, (x) => { x.fillStyle = '#f2ead8'; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); x.strokeStyle = '#1a1a1a'; for (let i = 0; i < 36; i++) { const a = i / 36 * PI * 2; x.beginPath(); x.moveTo(32 + Math.cos(a) * 26, 32 + Math.sin(a) * 26); x.lineTo(32 + Math.cos(a) * 30, 32 + Math.sin(a) * 30); x.stroke(); } x.fillStyle = '#c83a2a'; x.beginPath(); x.moveTo(32, 6); x.lineTo(36, 32); x.lineTo(28, 32); x.fill(); x.fillStyle = '#1a1a1a'; x.beginPath(); x.moveTo(32, 58); x.lineTo(36, 32); x.lineTo(28, 32); x.fill(); x.font = 'bold 9px sans-serif'; x.fillText('N', 29, 18); });
    put(g, cyl(.028, .028, .001, 26), mat('#ffffff', 'carta', q), 0, .0135, 0);
    put(g, cyl(.029, .029, .002, 26), mat('#e8f0ee', 'vetro'), 0, .015, 0);
    const cop = put(g, cyl(.032, .032, .006, 26), C, 0, .045, -.034, PI / 2 - .25);
    put(g, rbox(.012, .005, .012, .002), C, 0, .007, .036);
    put(g, tor(.008, .002, 0, 5, 12), mat('#c8ccd4', 'cromo'), 0, .007, .046, PI / 2);
    return g;
  };
  P.bussola = { how: 'piatto' };
  // la pompa della bicicletta
  M.pompa = o => {
    const g = G();
    put(g, cyl(.016, .016, .34, 16), mat(o.c || '#c83a2a', 'metallo'), 0, .19, 0);
    put(g, cyl(.018, .018, .02, 16), mat('#1a1a1e', 'plastica'), 0, .02, 0);
    put(g, cyl(.004, .004, .05, 8), mat('#c8ccd4', 'cromo'), 0, .385, 0);
    put(g, rbox(.1, .022, .024, .008), mat('#1a1a1e', 'plastica'), 0, .42, 0);
    put(g, tubo([[0, .01, .016], [.02, -.01, .06], [.04, .05, .08], [.03, .12, .05]], .003, 14, 5), mat('#1a1a1e', 'gomma'));
    g.userData.grip = .2; g.userData.diag = true; return g;
  };
  // il martello: quello di oggetti3d.js se c'è, altrimenti questo
  M.martello = o => {
    const g = G(); manico(g, 0, .3, .015, '#a8743e', .75);
    const head = new T.Shape(); [[-.035, .014], [.03, .014], [.034, .01], [.036, -.01], [.03, -.014], [-.02, -.014], [-.07, -.03], [-.09, -.02], [-.06, -.004], [-.035, .002]].forEach((p, i) => i ? head.lineTo(p[0], p[1]) : head.moveTo(p[0], p[1]));
    put(g, ext(head, .026, .003), mat('#4a4c54', 'acciaio'), 0, .3, 0);
    put(g, cyl(.016, .016, .016, 20), mat('#6a6c74', 'acciaio'), .042, .3, 0, 0, 0, PI / 2);
    g.userData.grip = .09; g.userData.diag = true; return g;
  };
  // la torcia elettrica
  M.torcia = o => {
    const g = G();
    put(g, lat([[0, 0], [.017, 0], [.019, .004], [.019, .15], [.026, .17], [.03, .2], [.03, .215], [0, .215]], 24), mat(o.c || '#2a2a30', 'metallo'));
    for (let i = 0; i < 6; i++) put(g, tor(.0192, .0015, 0, 4, 20), mat('#3a3a42', 'metallo'), 0, .03 + i * .014, 0, PI / 2);
    put(g, cyl(.027, .027, .003, 24), mat('#fff4c8', 'luce'), 0, .216, 0);
    put(g, rbox(.012, .02, .006, .002), mat('#c83a2a', 'plastica'), 0, .13, .019);
    g.userData.grip = .08; g.userData.diag = true; return g;
  };

  // ---------------- ferramenta ----------------
  // la scatolina di cartone aperta con la minuteria: o.k = chiodi | viti | bulloni | tasselli | molle | bottoni
  M.minuteria = o => {
    const g = G(), w = .1, d = .07, h = .04, k = o.k || 'chiodi', C = mat(o.c || '#c8a868', 'cartone');
    put(g, rbox(w, .003, d, .001), C, 0, .0015, 0);
    [[0, d / 2, w], [0, -d / 2, w], [w / 2, 0, d], [-w / 2, 0, d]].forEach(([x, z, L], i) => put(g, box(i < 2 ? L : .003, h, i < 2 ? .003 : L), C, x, h / 2, z));
    const cop = put(g, box(w, .003, d * .9), C, 0, h + .02, -d / 2 - .02, -1.1);
    decal(g, etichetta({ bg: o.c || '#c8a868', fg: '#1a1a1a', testo: k.toUpperCase(), band: '#c83a2a' }), w * .8, h * .8, 0, h / 2, d / 2 + .002);
    const A = mat(k === 'bottoni' ? '#d8d0c0' : k === 'tasselli' ? '#d8d4c8' : '#a8acb4', k === 'tasselli' || k === 'bottoni' ? 'plastica' : 'acciaio'), r = rng(hashS(k));
    for (let i = 0; i < 16; i++) {
      const x = (r() - .5) * (w - .02), z = (r() - .5) * (d - .02), y = h * .55 + r() * .015, a = r() * PI;
      const s = G(); s.position.set(x, y, z); s.rotation.set(PI / 2 + (r() - .5) * .6, a, r()); g.add(s);
      if (k === 'chiodi') { put(s, cyl(.0012, .0012, .04, 6), A); put(s, cyl(.0035, .0035, .0012, 10), A, 0, .02, 0); }
      else if (k === 'viti') { put(s, cyl(.0018, .0005, .03, 6), A); put(s, cyl(.004, .0025, .003, 10), A, 0, .016, 0); }
      else if (k === 'bulloni') { put(s, cyl(.003, .003, .025, 8), A); put(s, cyl(.006, .006, .004, 6), A, 0, .013, 0); }
      else if (k === 'tasselli') { put(s, cyl(.003, .0035, .03, 8), A); }
      else if (k === 'molle') { put(s, tubo(Array.from({ length: 30 }, (_, j) => [Math.cos(j * .8) * .004, j * .001, Math.sin(j * .8) * .004]), .0007, 60, 4), A); }
      else if (k === 'bottoni') { put(s, cyl(.006, .006, .002, 12), mat(['#c83a2a', '#2a4a8a', '#e8e0cc', '#1a1a1a'][i % 4], 'plastica')); }
    }
    return g;
  };
  P.minuteria = { how: 'pugno' };
  // le cerniere a libro (una coppia)
  M.cerniere = o => { const g = G(), A = mat('#b8bcc2', 'acciaio'); [-1, 1].forEach(s => { const c = G(); c.position.set(s * .03, .002, 0); c.rotation.y = s * .3; g.add(c); [-1, 1].forEach(t => { put(c, ext(rrect(0, -.03, .025, .03, .003), .002, 0, [{ x: .012, y: .015, r: .002 }, { x: .012, y: -.015, r: .002 }]), A, t * .0005, 0, 0, -PI / 2, 0, t > 0 ? 0 : PI); }); put(c, cyl(.003, .003, .06, 10), A, 0, .002, 0, PI / 2); }); return g; };
  P.cerniere = { how: 'pugno' };
  // il lucchetto d'ottone con la chiave
  M.lucchetto = o => {
    const g = G();
    put(g, rbox(.045, .04, .018, .006), mat('#c8a040', 'ottone'), 0, .02, 0);
    put(g, tor(.014, .0035, PI, 6, 16), mat('#c8ccd4', 'cromo'), 0, .045, 0);
    [-1, 1].forEach(s => put(g, cyl(.0035, .0035, .008, 8), mat('#c8ccd4', 'cromo'), s * .014, .042, 0));
    put(g, cyl(.003, .003, .002, 10), mat('#1a1a1a', 'plastica'), 0, .014, .0095, PI / 2);
    put(g, ext([[-.002, 0], [.002, 0], [.002, .02], [.004, .022], [.004, .026], [-.002, .026]], .002, 0), mat('#c8ccd4', 'cromo'), .02, .002, .02, 0, .5, -1.2);
    put(g, tor(.007, .002, 0, 5, 12), mat('#c8ccd4', 'cromo'), .042, .002, .03, PI / 2);
    return g;
  };
  P.lucchetto = { how: 'pugno' };
  // la catena (anche quella della bici): o.c, o.fine
  M.catena = o => {
    const g = G(), A = mat(o.c || '#7a7e86', 'acciaio');
    if (o.fine) {   // la catena della bici: un anello chiuso, piastrine e rulli
      const n = 40;
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2, x = Math.cos(a) * .14, z = Math.sin(a) * .06, a2 = (i + 1) / n * PI * 2, x2 = Math.cos(a2) * .14, z2 = Math.sin(a2) * .06; const ang = Math.atan2(z2 - z, x2 - x); put(g, rbox(.016, .009, .003, .0012), A, (x + x2) / 2, .006, (z + z2) / 2, 0, -ang, 0); put(g, cyl(.003, .003, .008, 6), mat('#a8acb4', 'acciaio'), x, .006, z); }
      return g;
    }
    const r = .012, t = .003;
    let a = 0; for (let i = 0; i < 22; i++) { a += .35 + Math.sin(i) * .2; const R = .05 + i * .004, x = Math.cos(a) * R, z = Math.sin(a) * R; put(g, tor(r, t, 0, 5, 12), A, x, t + (i % 2) * .002, z, i % 2 ? PI / 2 : 0, a, 0, [1.6, 1, 1]); }
    return g;
  };
  P.catena = { how: 'appeso' };
  // la matassa (corda, filo di ferro, cavo, rame): o.c, o.r (spessore), o.k
  M.matassa = o => {
    const g = G(), c = o.c || '#c89a5a', k = o.kind || 'tessuto', t = o.r || .006;
    for (let i = 0; i < 9; i++) put(g, tor(.1 - (i % 3) * .004, t, 0, 6, 36), mat(i % 2 ? shade(c, .9) : c, k), (i % 3 - 1) * .004, t + Math.floor(i / 3) * t * 1.6, (i % 2) * .004, PI / 2, 0, i * .05);
    put(g, tubo([[.1, .02, 0], [.12, .03, .02], [.15, .015, .06], [.16, .01, .1]], t, 12, 6), mat(c, k));
    if (o.legata !== false) [0, PI].forEach(a => put(g, tor(.014, .003, 0, 5, 12), mat('#c83a2a', 'plastica'), Math.cos(a) * .1, .015, Math.sin(a) * .1, 0, a, 0));
    return g;
  };
  P.matassa = { how: 'appeso' };
  // il rotolo di nastro (isolante, telato): o.c, o.big
  M.rotolino = o => {
    const g = G(), R = o.big ? .05 : .025, Wd = o.big ? .05 : .019, c = o.c || '#1a1a1e';
    put(g, lat([[R * .62, 0], [R, 0], [R, Wd], [R * .62, Wd], [R * .62, 0]], 30), mat(c, 'lucido'));
    put(g, lat([[R * .56, 0], [R * .62, 0], [R * .62, Wd], [R * .56, Wd], [R * .56, 0]], 24), mat('#c8a868', 'cartone'));
    put(g, box(.0008, Wd, R * .9), mat(c, 'lucido'), R + .0004, Wd / 2, R * .45, 0, -.15, 0);   // il capo del nastro che pende
    return g;
  };
  P.rotolino = { how: 'pugno' };
  // la pila di sacchi vuoti piegati
  M.sacchi_piegati = o => { const g = G(); for (let i = 0; i < 5; i++) put(g, rbox(.3, .012, .2, .005), mat(i % 2 ? '#c8b080' : '#b8a070', 'tessuto'), (i % 2) * .01, .006 + i * .012, (i % 3) * .006, 0, (i - 2) * .04, 0); return g; };
  P.sacchi_piegati = { how: 'regge', w: .32, d: .22 };
  // il pennarello col cappuccio
  M.pennarello = o => { const g = G(), c = o.c || '#1a1a1e'; put(g, cyl(.008, .008, .11, 14), mat('#e8e4d8', 'plastica'), 0, .055, 0); put(g, cyl(.0085, .0085, .04, 14), mat(c, 'plastica'), 0, .13, 0); put(g, rbox(.003, .03, .004, .001), mat(c, 'plastica'), .009, .13, 0); put(g, cyl(.006, .008, .006, 14), mat(c, 'plastica'), 0, .003, 0); g.userData.grip = .05; g.userData.diag = true; return g; };
  P.pennarello = { how: 'pugno' };
  // i gessetti nella scatolina
  M.gessetti = o => { const g = G(); put(g, rbox(.08, .02, .05, .003), mat('#2a5aa8', 'cartone'), 0, .01, 0); ['#f2f0ea', '#e8d040', '#e88a8a', '#8ad0e8', '#f2f0ea'].forEach((c, i) => put(g, cyl(.005, .005, .07, 10), mat(c, 'opaco'), -.02 + i * .01, .025, 0, PI / 2, 0, .02 * i)); return g; };
  P.gessetti = { how: 'pugno' };
  // il paio di guanti da lavoro (o di lana): o.c, o.lana
  M.guanti = o => {
    const g = G(), c = o.c || '#c8a868', m = mat(c, o.lana ? 'tessuto' : 'opaco');
    [-1, 1].forEach(s => {
      const h = G(); h.position.set(s * .05, 0, s * .02); h.rotation.y = s * .25 + (s > 0 ? PI : 0); g.add(h);
      put(h, rbox(.085, .022, .1, .01), m, 0, .011, 0);
      for (let i = 0; i < 4; i++) put(h, new T.CapsuleGeometry(.009, .05 - Math.abs(i - 1.5) * .008, 4, 8), m, -.03 + i * .02, .011, .075, PI / 2, 0, 0);
      put(h, new T.CapsuleGeometry(.01, .035, 4, 8), m, .05, .011, .02, PI / 2, 0, -.8);
      put(h, rbox(.09, .024, .04, .01), mat(o.lana ? shade(c, .8) : '#3a5a8a', 'tessuto'), 0, .012, -.06);
    });
    return g;
  };
  P.guanti = { how: 'piatto' };
  // il mazzetto di fascette
  M.fascette = o => { const g = G(); for (let i = 0; i < 12; i++) put(g, box(.2, .0015, .005), mat(i % 3 ? '#1a1a1e' : '#e8e4d8', 'plastica'), 0, .001 + i * .0016, (i - 6) * .002, 0, (i - 6) * .03, 0); put(g, tor(.008, .003, 0, 5, 10), mat('#1a1a1e', 'plastica'), 0, .012, 0, 0, PI / 2, 0); return g; };
  P.fascette = { how: 'piatto' };
  // i fogli (carta vetrata, moduli, matrici): o.c, o.n, o.t (una tela)
  M.fogli = o => { const g = G(), n = o.n || 5; for (let i = 0; i < n; i++) put(g, box(o.w || .21, .0015, o.d || .28), mat(o.c || '#c8a868', 'carta', i === n - 1 ? o.t || null : null), (i % 2) * .004, .001 + i * .0016, 0, 0, (i - n / 2) * .04, 0); return g; };
  P.fogli = { how: 'piatto' };
  // l'oliatore a pompetta col becco lungo
  M.oliatore = o => { const g = G(); put(g, lat([[0, 0], [.035, 0], [.04, .01], [.038, .04], [.02, .05], [.008, .056], [0, .056]], 22), mat('#c8a040', 'ottone')); put(g, cyl(.0035, .0015, .14, 8), mat('#c8a040', 'ottone'), .03, .1, 0, 0, 0, -.5); return g; };
  P.oliatore = { how: 'pugno' };
  // il moschettone
  M.moschettone = o => { const g = G(), A = mat(o.c || '#b8bcc2', 'cromo'); put(g, tubo(giro(.024, 24, 0, (a) => 1 + Math.cos(a) * .35), .0035, 48, 6, true), A, 0, .04, 0, PI / 2, 0, PI / 2); put(g, cyl(.004, .004, .01, 8), mat('#5a5e64', 'acciaio'), .0, .03, .02); return g; };
  P.moschettone = { how: 'pugno' };
  // la cartuccia del silicone
  M.cartuccia = o => { const g = G(); put(g, cyl(.024, .024, .2, 22), mat('#e8e4d8', 'plastica'), 0, .1, 0); put(g, cyl(.006, .002, .07, 12), mat('#e8e4d8', 'plastica'), 0, .235, 0); const t = etichetta({ bg: '#e8e4d8', fg: '#2a5aa8', testo: 'SILICONE', band: '#2a5aa8' }); t.offset.x = .5; put(g, cyl(.0248, .0248, .12, 22, true), mat('#ffffff', 'carta', t), 0, .11, 0); g.userData.grip = .1; return g; };
  P.cartuccia = { how: 'pugno' };

  // ---------------- combustibili e fuoco ----------------
  // la fascina di ciocchi legati con lo spago
  M.fascina = o => {
    const g = G(), r = rng(8), cor = mat('#6a4a2a', 'legno'), dentro = mat('#d8b080', 'legno');
    const pos = [[0, 0], [.075, 0], [-.075, 0], [.038, .065], [-.038, .065], [0, .13]];
    pos.forEach(([x, y], i) => { const R = .036 + r() * .01, L = .36 + r() * .06; put(g, cyl(R, R * 1.05, L, 9), cor, x, y + .04, 0, PI / 2, 0, 0); [-1, 1].forEach(s => put(g, cyl(R * .92, R * .92, .002, 9), dentro, x, y + .04, s * L / 2)); });
    [-.1, .1].forEach(z => put(g, tor(.11, .004, 0, 5, 20), mat('#c8a868', 'tessuto'), 0, .1, z, 0, 0, 0, [1.05, .9, 1]));
    return g;
  };
  P.fascina = { how: 'regge', w: .3, d: .4 };
  // la bombola del gas con la valvola e il collare
  M.bombola = o => {
    const g = G(), c = o.c || '#c86a2a', R = .15, H = .5;
    put(g, lat([[0, 0], [R * .9, 0], [R * .95, .02], [R, .06], [R, H - .08], [R * .85, H - .02], [R * .4, H + .01], [0, H + .01]], 30), mat(c, 'metallo'));
    put(g, lat([[R * .85, 0], [R * .88, 0], [R * .88, .05], [R * .85, .05]], 30), mat(shade(c, .8), 'metallo'));
    put(g, lat([[R * .5, 0], [R * .6, 0], [R * .62, .1], [R * .56, .1], [R * .5, .04]], 24), mat(shade(c, .85), 'metallo'), 0, H - .03, 0);
    [-1, 1].forEach(s => put(g, ext(rrect(-.04, 0, .04, .05, .015), .01, .003, [[[-.025, .012], [.025, .012], [.025, .038], [-.025, .038]]]), mat(shade(c, .85), 'metallo'), s * .065, H + .02, 0, 0, PI / 2, 0));
    put(g, cyl(.016, .018, .05, 14), mat('#c8a040', 'ottone'), 0, H + .04, 0);
    put(g, cyl(.02, .02, .012, 6), mat('#c8a040', 'ottone'), 0, H + .065, 0);
    decal(g, etichetta({ bg: c, fg: '#f2f0ea', testo: 'GAS', sub: '10 kg' }), .14, .08, 0, H * .55, R + .001);
    g.userData.manico = [0, H + .07, 0]; return g;
  };
  P.bombola = { how: 'appeso' };
  // la scatola di fiammiferi da cucina, mezza aperta
  M.fiammiferi = o => {
    const g = G(), w = .1, d = .06, h = .022;
    put(g, rbox(w, h, d, .002), mat('#e8c040', 'cartone'), 0, h / 2, 0);
    put(g, rbox(w * .96, h * .8, d * .94, .002), mat('#c8a868', 'cartone'), .03, h * .45, 0);
    for (let i = 0; i < 8; i++) { put(g, box(.06, .002, .002), mat('#e8d0a0', 'legno'), .03, h * .7, -.02 + i * .005); put(g, sfe(.002, 6, 4), mat('#a82a1a', 'opaco'), .061, h * .7, -.02 + i * .005, 0, 0, 0, [1.4, 1, 1]); }
    decal(g, etichetta({ bg: '#e8c040', fg: '#c83a2a', testo: 'CERINI', band: '#1a3a7a' }), w * .64, d * .9, -.018, h + .0008, 0, 0, -PI / 2);
    put(g, box(.004, h * .7, d * .9), mat('#6a3a2a', 'carta'), -w / 2 - .0002, h / 2, 0);
    return g;
  };
  P.fiammiferi = { how: 'pugno' };
  // l'accendino usa e getta
  M.accendino = o => { const g = G(), c = o.c || '#c83a2a'; put(g, rbox(.024, .06, .012, .005), mat(c, 'vetroS'), 0, .03, 0); put(g, rbox(.024, .016, .012, .002), mat('#c8ccd4', 'cromo'), 0, .066, 0); put(g, cyl(.005, .005, .008, 12), mat('#4a4c52', 'acciaio'), .006, .078, 0, 0, 0, PI / 2); put(g, box(.008, .006, .006), mat('#1a1a1a', 'plastica'), -.006, .077, 0); g.userData.grip = .03; return g; };
  P.accendino = { how: 'pugno' };
  // il mazzetto di candele legate
  M.candele = o => { const g = G(); for (let i = 0; i < 5; i++) { const x = (i - 2) * .02; put(g, cyl(.009, .009, .2, 14), mat('#f2ead8', 'cera'), x, .011, 0, 0, 0, PI / 2); put(g, cyl(.0012, .0012, .012, 5), mat('#1a1a1a', 'opaco'), x, .011, .106, PI / 2); } put(g, tor(.045, .003, 0, 5, 18), mat('#c83a2a', 'tessuto'), 0, .011, 0, 0, PI / 2, 0, [1, .4, 1]); g.children.forEach(c => { if (c.geometry.type === 'CylinderGeometry' && c.rotation.z) { c.rotation.set(PI / 2, 0, 0); c.position.set(c.position.x, .011, 0); } }); return g; };
  P.candele = { how: 'pugno' };
  // il lume a petrolio: serbatoio, vetro, cappello, manico
  M.lume = o => {
    const g = G(), c = o.c || '#c83a2a', m = mat(c, 'metallo');
    put(g, lat([[0, 0], [.06, 0], [.065, .01], [.065, .07], [.04, .085], [0, .085]], 26), m);
    put(g, lat([[.03, 0], [.035, .03], [.04, .1], [.032, .13], [.025, .14]], 24), mat('#f2ead8', 'vetro'), 0, .085, 0);
    put(g, sfe(.008, 8, 8), mat('#ffd890', 'luce'), 0, .13, 0, 0, 0, 0, [1, 1.8, 1]);
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + .4; asta(g, [Math.cos(a) * .05, .08, Math.sin(a) * .05], [Math.cos(a) * .036, .23, Math.sin(a) * .036], .0025, m); }
    put(g, lat([[0, 0], [.05, 0], [.04, .02], [.02, .03], [0, .03]], 24), m, 0, .225, 0);
    put(g, tor(.07, .003, PI, 5, 20), mat('#3a3a3e', 'acciaio'), 0, .255, 0);
    put(g, cyl(.006, .006, .02, 10), mat('#c8a040', 'ottone'), .066, .06, 0, 0, 0, PI / 2);
    g.userData.manico = [0, .325, 0]; return g;
  };
  P.lume = { how: 'appeso' };
  // il razzo di segnalazione
  M.razzo = o => { const g = G(); put(g, cyl(.018, .018, .24, 16), mat('#c83a2a', 'plastica'), 0, .12, 0); put(g, cyl(.02, .02, .04, 16), mat('#1a1a1a', 'plastica'), 0, .02, 0); put(g, cyl(.019, .019, .02, 16), mat('#e8c040', 'plastica'), 0, .25, 0); put(g, tor(.012, .002, 0, 5, 10), mat('#c8ccd4', 'metallo'), 0, .265, 0, 0, PI / 2, 0); decal(g, etichetta({ bg: '#c83a2a', fg: '#f2f0ea', testo: 'SOS', w: 128, h: 128 }), .03, .03, 0, .14, .0185); g.userData.grip = .06; return g; };
  P.razzo = { how: 'pugno' };

  // ---------------- edilizia ----------------
  function venatura(c) { return disegno('ven' + c, 64, 64, (x) => { x.fillStyle = c; x.fillRect(0, 0, 64, 64); const r = rng(hashS(c)); for (let i = 0; i < 26; i++) { x.fillStyle = r() < .5 ? 'rgba(60,35,15,.18)' : 'rgba(255,240,210,.12)'; x.fillRect(0, Math.floor(r() * 64), 64, 1 + Math.floor(r() * 2)); } x.fillStyle = 'rgba(60,35,15,.35)'; x.beginPath(); x.ellipse(20 + r() * 20, 30, 4, 2, 0, 0, PI * 2); x.fill(); }); }
  // la pila di tavole: o.c, o.n, o.L
  M.tavole = o => { const g = G(), n = o.n || 4, c = o.c || '#c8a070', L = o.L || .8; for (let i = 0; i < n; i++) put(g, rbox(L, .022, .12, .002), mat(c, 'legno', venatura(c)), (i % 2) * .02, .011 + i * .023, (i % 2 ? .004 : -.004), 0, (i - n / 2) * .015, 0); return g; };
  P.tavole = { how: 'regge', w: .5, d: .16 };
  M.trave = o => { const g = G(), c = o.c || '#a8804e'; put(g, rbox(1, .12, .12, .006), mat(c, 'legno', venatura(c)), 0, .06, 0); [-1, 1].forEach(s => put(g, box(.001, .11, .11), mat(mix(c, '#e8c898', .4), 'legno'), s * .5, .06, 0)); return g; };
  P.trave = { how: 'regge', w: .5, d: .16 };
  // il pannello (compensato, sughero, latta, plexiglas): o.c, o.kind, o.t
  M.pannello = o => { const g = G(), c = o.c || '#d8b080'; for (let i = 0; i < (o.n || 2); i++) put(g, rbox(o.w || .6, o.s || .012, o.d || .45, .002), mat(c, o.kind || 'legno', o.kind === 'legno' || !o.kind ? venatura(c) : null), (i % 2) * .015, (o.s || .012) * (i + .5), (i % 2) * .01, 0, i * .04, 0); return g; };
  P.pannello = { how: 'regge', w: .4, d: .1 };
  // la pila di mattoni forati
  M.mattoni = o => {
    const g = G(), c = o.c || '#b8584a', w = .25, h = .08, d = .12;
    const fo = disegno('forato', 64, 32, (x) => { x.fillStyle = c; x.fillRect(0, 0, 64, 32); x.fillStyle = shade(c, .45); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) x.fillRect(5 + i * 15, 5 + j * 13, 10, 9); });
    for (let l = 0; l < 3; l++) for (let i = 0; i < (l === 2 ? 1 : 2); i++) { const z = (i - .5) * (d + .006) * (l === 2 ? 0 : 1), b = put(g, rbox(w, h, d, .004), mat(c, 'pietra'), 0, h / 2 + l * (h + .003), z, 0, l % 2 ? PI / 2 : 0, 0); [-1, 1].forEach(s => put(g, pia(d * .92, h * .9), mat('#ffffff', 'pietra', fo), (l % 2 ? 0 : s * (w / 2 + .0006)), h / 2 + l * (h + .003), (l % 2 ? s * (w / 2 + .0006) : z), 0, (l % 2 ? (s > 0 ? 0 : PI) : s * PI / 2), 0)); }
    return g;
  };
  P.mattoni = { how: 'regge', w: .3, d: .28 };
  // il mucchio di pietre
  M.pietre = o => { const g = G(), r = rng(12), c = o.c || '#9a958a'; for (let i = 0; i < 9; i++) { const s = .05 + r() * .04, a = i * 2.4, d = i < 6 ? .08 : .03; put(g, new T.DodecahedronGeometry(s, 0), mat(i % 3 ? c : shade(c, .85), 'pietra'), Math.cos(a) * d, s * .7 + (i < 6 ? 0 : .06), Math.sin(a) * d, r() * 3, r() * 3, r() * 3, [1.2, .75, 1]); } return g; };
  P.pietre = { how: 'regge', w: .3, d: .3 };
  // la lamiera ondulata (un paio di fogli)
  M.ondulata = o => {
    const g = G(), c = o.c || '#9a9e9a';
    for (let k = 0; k < 2; k++) { const geo = new T.PlaneGeometry(.9, .6, 36, 1), p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / .9 * 36 / 2 * PI) * .012); geo.computeVertexNormals(); const m = put(g, geo, mat(k ? shade(c, .9) : c, 'metallo'), k * .03, .014 + k * .026, k * .02, -PI / 2, 0, k * .05); m.material.side = T.DoubleSide; }
    return g;
  };
  P.ondulata = { how: 'regge', w: .5, d: .1 };
  // il fascio di tondini, tubi o profilati: o.k = tondini | tubi | profilati, o.c
  M.fascio = o => {
    const g = G(), k = o.k || 'tondini', c = o.c || '#5a4a3e', n = k === 'tondini' ? 9 : 6, L = 1, sp = k === 'tondini' ? .016 : .045;
    for (let i = 0; i < n; i++) {
      const z = (i % 3 - 1) * sp, y = Math.floor(i / 3) * sp * .9 + sp / 2 + .002, x = (i % 2) * .03;
      if (k === 'tondini') put(g, cyl(.006, .006, L, 8), mat(c, 'ruggine'), x, y, z, 0, 0, PI / 2);
      else if (k === 'tubi') { put(g, cyl(.021, .021, L, 16, true), mat(c, 'metallo'), x, y, z, 0, 0, PI / 2).material.side = T.DoubleSide; put(g, tor(.021, .002, 0, 4, 16), mat(shade(c, .8), 'metallo'), x + L / 2, y, z, 0, PI / 2, 0); }
      else put(g, ext([[-.02, -.02], [.02, -.02], [.02, -.016], [-.016, -.016], [-.016, .02], [-.02, .02]], L, 0), mat(c, 'ruggine'), x, y, z, 0, PI / 2, 0);
    }
    [-.3, .3].forEach(x => put(g, tor(k === 'tondini' ? .028 : .07, .003, 0, 5, 18), mat('#3a3a3e', 'acciaio'), x, sp * 1.1, 0, 0, PI / 2, 0));
    return g;
  };
  P.fascio = { how: 'regge', w: .3, d: .2 };
  // il rotolo (rete metallica, filo spinato, isolante, stoffa, telo): o.k, o.c
  M.rotolo = o => {
    const g = G(), k = o.k || 'rete', c = o.c || '#8a9098', R = o.R || .15, L = o.L || .5;
    if (k === 'spinato') {
      for (let i = 0; i < 9; i++) put(g, tor(R - (i % 3) * .015, .0018, 0, 4, 40), mat('#7a7a78', 'acciaio'), (i - 4) * .04, R, 0, 0, PI / 2, 0);
      const r = rng(3); for (let i = 0; i < 40; i++) { const a = r() * PI * 2, x = (r() - .5) * .34; const s = G(); s.position.set(x, R + Math.sin(a) * R, Math.cos(a) * R); g.add(s); for (let j = 0; j < 2; j++) put(s, box(.022, .0016, .0016), mat('#7a7a78', 'acciaio'), 0, 0, 0, r() * 3, r() * 3, r() * 3); }
      return g;
    }
    let tx = null, kind = 'metallo';
    if (k === 'rete') { tx = disegno('retemetallo', 64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.strokeStyle = '#d8dcdc'; x.lineWidth = 3; for (let i = -64; i < 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.stroke(); x.beginPath(); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); } }); tx.repeat.set(5, 3); tx.wrapT = T.RepeatWrapping; }
    if (k === 'isolante' || k === 'stoffa' || k === 'telo') kind = 'tessuto';
    const m = tx ? new T.MeshStandardMaterial({ color: c, map: tx, transparent: true, alphaTest: .4, side: T.DoubleSide, roughness: .5, metalness: .3 }) : mat(c, kind);
    for (let i = 0; i < (tx ? 4 : 1); i++) put(g, cyl(R - i * .025, R - i * .025, L, 28, !!tx), m, 0, R, 0, 0, 0, PI / 2);
    if (!tx) { [-1, 1].forEach(s => { put(g, cyl(R * .98, R * .98, .002, 28), mat(shade(c, .8), kind), s * L / 2, R, 0, 0, 0, PI / 2); put(g, cyl(R * .25, R * .25, .004, 16), mat('#c8a868', 'cartone'), s * (L / 2 + .001), R, 0, 0, 0, PI / 2); for (let j = 1; j < 5; j++) put(g, tor(R * j / 5, .0008, 0, 3, 28), mat(shade(c, .7), kind), s * (L / 2 + .0012), R, 0, 0, PI / 2, 0); }); }
    if (k === 'telo' || k === 'stoffa') put(g, box(L * .98, .002, .25), mat(c, kind), 0, .001, R + .12);
    if (o.legato) [-L * .3, L * .3].forEach(x => put(g, tor(R + .003, .003, 0, 5, 28), mat('#c83a2a', 'tessuto'), x, R, 0, 0, PI / 2, 0));
    return g;
  };
  P.rotolo = { how: 'regge', w: .5, d: .3 };
  // il telo cerato piegato con l'occhiello
  M.telo = o => { const g = G(), c = o.c || '#4a6a4a'; for (let i = 0; i < 3; i++) put(g, rbox(.4, .02, .3, .008), mat(i % 2 ? shade(c, .9) : c, 'tessuto'), i * .004, .01 + i * .02, 0); [-1, 1].forEach(s => put(g, tor(.008, .002, 0, 5, 12), mat('#c8ccd4', 'cromo'), s * .18, .061, .13, PI / 2)); return g; };
  P.telo = { how: 'regge', w: .42, d: .32 };
  // la lastra di vetro (o di plexiglas) coi bordi verdi
  M.lastra_vetro = o => { const g = G(); put(g, box(.6, .4, .006), mat(o.c || '#cfe6e0', 'vetro'), 0, .2, 0); [[0, .4, .6, .006], [0, 0, .6, .006], [-.3, .2, .006, .4], [.3, .2, .006, .4]].forEach(([x, y, w, h]) => put(g, box(w, h, .007), mat('#6aa89a', 'vetroS'), x, y, 0)); put(g, box(.6, .03, .02), mat('#c8a868', 'cartone'), 0, .015, 0); return g; };
  P.lastra_vetro = { how: 'appeso', manico: [0, .4, 0] };
  // il tubo della stufa col gomito
  M.tubo_stufa = o => { const g = G(), N = mat('#2a2a2e', 'ghisa'); put(g, cyl(.06, .06, .5, 22, true), N, 0, .06, 0, 0, 0, PI / 2).material.side = T.DoubleSide; put(g, tubo([[.25, .06, 0], [.3, .06, 0], [.33, .1, 0], [.33, .16, 0]], .06, 16, 22), N); for (const x of [-.1, .1]) put(g, tor(.061, .003, 0, 4, 22), N, x, .06, 0, 0, PI / 2, 0); return g; };
  P.tubo_stufa = { how: 'regge', w: .4, d: .14 };
  // il bancale
  M.pallet = o => {
    const g = G(), c = o.c || '#c8a070', L = mat(c, 'legno', venatura(c)), w = 1.2, d = .8;
    for (let i = 0; i < 5; i++) put(g, rbox(w, .022, .1, .002), L, 0, .133, (i - 2) * .175);
    for (let i = 0; i < 3; i++) put(g, rbox(w, .022, .1, .002), L, 0, .011, (i - 1) * .35);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) put(g, rbox(.1, .078, .1, .004), mat(shade(c, .85), 'legno'), (i - 1) * .55, .061, (j - 1) * .35);
    return g;
  };
  P.pallet = { how: 'regge', w: .6, d: .2 };
  // la grata di ferro saldata
  M.grata = o => { const g = G(), F = mat(o.c || '#2a2c30', 'ghisa'), w = .6, h = .8; [-w / 2, w / 2].forEach(x => put(g, box(.02, h, .02), F, x, h / 2, 0)); [0, h / 2, h].forEach(y => put(g, box(w, .02, .02), F, 0, y, 0)); for (let i = 1; i < 6; i++) put(g, cyl(.007, .007, h, 8), F, -w / 2 + i * w / 6, h / 2, 0); return g; };
  P.grata = { how: 'appeso', manico: [0, .8, 0] };

  // ---------------- elettrico e radio ----------------
  // la pila a torcia (un paio) o la batteria quadra: o.c
  M.pile = o => {
    const g = G(), c = o.c || '#c83a2a', esauste = !!o.esauste;
    [-1, 1, 0].forEach((s, i) => {
      const x = s * .018, z = i === 2 ? -.03 : 0, rr = i === 2 ? .8 : 1, b = G(); b.position.set(x, 0, z); b.rotation.z = i === 2 ? PI / 2 : 0; if (i === 2) b.position.y = .017; g.add(b);
      put(b, cyl(.017, .017, .06, 20), mat(esauste ? shade(c, .6) : c, 'plastica'), 0, .03, 0);
      put(b, cyl(.0172, .0172, .02, 20), mat('#1a1a1e', 'plastica'), 0, .045, 0);
      put(b, cyl(.006, .006, .004, 12), mat('#c8ccd4', 'cromo'), 0, .062, 0);
      put(b, cyl(.0165, .0165, .002, 20), mat('#a8acb4', 'cromo'), 0, .001, 0);
    });
    if (esauste) { const r = rng(3); for (let i = 0; i < 4; i++) put(g, sfe(.004, 6, 4), mat('#e8e0b0', 'opaco'), (r() - .5) * .04, .062, (r() - .5) * .01); }
    return g;
  };
  P.pile = { how: 'pugno' };
  // la lampadina a goccia
  M.lampadina = o => {
    const g = G();
    put(g, lat([[0, 0], [.008, 0], [.013, .006], [.014, .026], [.016, .03]], 18), mat('#a8acb4', 'metallo'));
    for (let i = 0; i < 4; i++) put(g, tor(.0142, .0015, 0, 4, 18), mat('#a8acb4', 'metallo'), 0, .009 + i * .005, 0, PI / 2);
    put(g, lat([[.016, 0], [.018, .008], [.03, .03], [.031, .05], [.02, .068], [0, .072]], 22), mat('#f4f0e0', 'vetro'), 0, .028, 0);
    put(g, tubo([[-.004, .045, 0], [-.006, .06, 0], [.006, .06, 0], [.004, .045, 0]], .0006, 12, 3), mat('#c8a040', 'metallo'));
    g.userData.grip = .03; return g;
  };
  P.lampadina = { how: 'pugno' };
  // la valvola termoionica
  M.valvola = o => { const g = G(); put(g, cyl(.016, .016, .02, 18), mat('#1a1a1e', 'plastica'), 0, .01, 0); put(g, lat([[.014, 0], [.015, .04], [.012, .055], [0, .06]], 18), mat('#e8f0ee', 'vetro'), 0, .02, 0); put(g, cyl(.009, .009, .03, 12), mat('#5a5e64', 'metallo'), 0, .04, 0); put(g, sfe(.013, 12, 6, 0, PI * 2, 0, PI / 2), mat('#c8c0a8', 'cromo'), 0, .063, 0, 0, 0, 0, [1, .4, 1]); for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2; put(g, cyl(.001, .001, .012, 4), mat('#c8ccd4', 'cromo'), Math.cos(a) * .009, -.004, Math.sin(a) * .009); } g.userData.grip = .03; return g; };
  P.valvola = { how: 'pugno' };
  // la bustina di transistor
  M.transistor = o => { const g = G(); put(g, box(.08, .002, .11), mat('#e8f0ee', 'vetro'), 0, .002, 0); for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * .022, z = Math.floor(i / 2) * .03 - .02; put(g, cyl(.004, .004, .006, 10, false), mat('#1a1a1e', 'plastica'), x, .004, z, PI / 2); for (let j = -1; j <= 1; j++) put(g, box(.0006, .0006, .015), mat('#c8ccd4', 'cromo'), x + j * .0018, .002, z + .01); } put(g, box(.08, .003, .012), mat('#c83a2a', 'plastica'), 0, .003, -.05); return g; };
  P.transistor = { how: 'piatto' };
  // l'altoparlante: cestello, cono di carta, magnete
  M.altoparlante = o => { const g = G(), R = .08; put(g, lat([[R * .3, 0], [R, .03], [R + .004, .032]], 26), mat('#2a2a2e', 'carta'), 0, .02, 0); put(g, tor(R, .004, 0, 6, 26), mat('#1a1a1e', 'gomma'), 0, .052, 0, PI / 2); put(g, sfe(R * .25, 14, 6, 0, PI * 2, 0, PI / 2), mat('#1a1a1e', 'plastica'), 0, .022, 0, 0, 0, 0, [1, .4, 1]); put(g, cyl(.035, .035, .025, 18), mat('#4a4c52', 'metallo'), 0, .0125, 0); for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; asta(g, [Math.cos(a) * .03, .02, Math.sin(a) * .03], [Math.cos(a) * R, .05, Math.sin(a) * R], .003, mat('#8a8e96', 'metallo')); } return g; };
  P.altoparlante = { how: 'pugno' };
  // la batteria dell'auto
  M.batteria_auto = o => {
    const g = G(); put(g, rbox(.26, .18, .17, .008), mat('#1a1a1e', 'plastica'), 0, .09, 0);
    put(g, rbox(.262, .02, .172, .006), mat('#2a2a2e', 'plastica'), 0, .18, 0);
    [['#c83a2a', -.09], ['#1a1a1e', .09]].forEach(([c, x]) => { put(g, cyl(.01, .012, .022, 14), mat('#a8acb4', 'metallo'), x, .2, -.05); put(g, cyl(.016, .016, .004, 14), mat(c, 'plastica'), x, .192, -.05); });
    for (let i = 0; i < 6; i++) put(g, cyl(.008, .008, .006, 12), mat('#e8c040', 'plastica'), -.1 + i * .04, .192, .04);
    decal(g, etichetta({ bg: '#1a1a1e', fg: '#e8c040', testo: '12V 45Ah', band: '#c83a2a' }), .2, .08, 0, .1, .0855);
    put(g, tor(.06, .006, PI, 6, 16), mat('#1a1a1e', 'plastica'), 0, .19, 0, 0, PI / 2, 0);
    g.userData.manico = [0, .25, 0]; return g;
  };
  P.batteria_auto = { how: 'appeso' };
  // la sveglia con le campane
  M.sveglia = o => {
    const g = G(), c = o.c || '#c83a2a', m = mat(c, 'metallo');
    put(g, cyl(.045, .045, .03, 28), m, 0, .06, 0, PI / 2);
    const q = disegno('quadrante_sv', 64, 64, (x) => { x.fillStyle = '#f2ead8'; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); x.fillStyle = '#1a1a1a'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 1; i <= 12; i++) { const a = i / 12 * PI * 2 - PI / 2; x.fillText(String(i), 32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24); } x.lineWidth = 3; x.strokeStyle = '#1a1a1a'; x.beginPath(); x.moveTo(32, 32); x.lineTo(32, 14); x.moveTo(32, 32); x.lineTo(44, 36); x.stroke(); });
    put(g, cyl(.04, .04, .002, 28), mat('#ffffff', 'carta', q), 0, .06, .0155, PI / 2);
    put(g, cyl(.041, .041, .004, 28), mat('#e8f0ee', 'vetro'), 0, .06, .016, PI / 2);
    [-1, 1].forEach(s => { put(g, sfe(.022, 16, 8, 0, PI * 2, 0, PI / 2), m, s * .028, .108, 0, 0, 0, -s * .5); asta(g, [s * .03, .02, 0], [s * .04, 0, 0], .003, m); });
    asta(g, [-.026, .118, 0], [.026, .118, 0], .002, mat('#c8ccd4', 'cromo'));
    put(g, tor(.015, .002, PI, 5, 12), mat('#c8ccd4', 'cromo'), 0, .108, 0);
    return g;
  };
  P.sveglia = { how: 'pugno' };
  // l'interruttore da muro (placca e bilanciere)
  M.interruttore = o => { const g = G(); put(g, rbox(.08, .08, .01, .006), mat('#e8e4d8', 'plastica'), 0, .04, 0); put(g, rbox(.022, .04, .008, .003), mat('#e8e4d8', 'plastica'), 0, .04, .007, .15); put(g, sfe(.002, 6, 4), mat('#e88a2a', 'luce'), 0, .025, .009); g.rotation.x = 0; return g; };
  P.interruttore = { how: 'pugno' };
  // la radiolina a transistor con l'antenna
  M.radiolina = o => {
    const g = G(), c = o.c || '#c83a2a';
    put(g, rbox(.14, .09, .04, .01), mat(c, 'plastica'), 0, .045, 0);
    const gr = disegno('griglia', 64, 64, (x) => { x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#3a3a3e'; for (let i = 2; i < 64; i += 5) for (let j = 2; j < 64; j += 5) x.fillRect(i, j, 2, 2); });
    put(g, pia(.07, .07), mat('#ffffff', 'metallo', gr), -.028, .045, .0202);
    const sc = disegno('scala', 64, 32, (x) => { x.fillStyle = '#f2ead8'; x.fillRect(0, 0, 64, 32); x.fillStyle = '#1a1a1a'; for (let i = 4; i < 64; i += 6) x.fillRect(i, 18, 1, i % 12 ? 5 : 9); x.font = '7px sans-serif'; x.fillText('AM 55 70 90 120 160', 2, 10); x.fillStyle = '#c83a2a'; x.fillRect(30, 12, 2, 18); });
    put(g, pia(.05, .025), mat('#ffffff', 'plastica', sc), .04, .06, .0202);
    put(g, cyl(.012, .012, .008, 18), mat('#c8ccd4', 'cromo'), .04, .028, .022, PI / 2);
    put(g, cyl(.003, .002, .3, 8), mat('#d8dce4', 'cromo'), .055, .2, -.01, 0, 0, -.25);
    put(g, tor(.05, .005, PI, 6, 14), mat('#1a1a1e', 'plastica'), 0, .09, 0);
    g.userData.manico = [0, .14, 0]; return g;
  };
  P.radiolina = { how: 'appeso' };
  // la radio rotta (la stessa, ammaccata, senza antenna e col vetro rotto)
  M.radio_rotta = o => { const g = M.radiolina({ c: o.c || '#7a5a3a' }); g.children[5].visible = false; g.rotation.z = .12; put(g, cyl(.002, .002, .05, 6), mat('#c83a2a', 'plastica'), .07, .09, 0, 0, 0, 1); return g; };
  P.radio_rotta = { how: 'appeso' };
  // la ricetrasmittente militare con la cornetta
  M.ricetrasmittente = o => {
    const g = G(), c = o.c || '#4a5a3a';
    put(g, rbox(.28, .2, .12, .01), mat(c, 'metallo'), 0, .1, 0);
    put(g, rbox(.24, .1, .005, .004), mat('#2a2a2e', 'plastica'), 0, .13, .06);
    [-.08, -.02, .04].forEach(x => { put(g, cyl(.014, .014, .012, 16), mat('#1a1a1e', 'plastica'), x, .13, .066, PI / 2); put(g, box(.003, .012, .002), mat('#f2f0ea', 'plastica'), x, .135, .073); });
    put(g, rbox(.04, .03, .004, .003), mat('#f2ead8', 'plastica'), .1, .14, .063);
    put(g, sfe(.004, 6, 4), mat('#e84a2a', 'luce'), .1, .06, .062);
    put(g, cyl(.004, .002, .5, 8), mat('#1a1a1e', 'plastica'), -.11, .45, -.03, 0, 0, .05);
    // la cornetta appesa al fianco, col filo arricciato
    put(g, ext([[-.07, -.012], [.07, -.012], [.08, .012], [.05, .015], [-.05, .015], [-.08, .012]], .03, .006), mat('#1a1a1e', 'plastica'), .16, .14, 0, 0, PI / 2, PI / 2);
    put(g, tubo(Array.from({ length: 40 }, (_, j) => [.16 + Math.cos(j * 1.2) * .008, .06 - j * .0012, Math.sin(j * 1.2) * .008 + .02]), .0018, 160, 4), mat('#1a1a1e', 'gomma'));
    [-1, 1].forEach(s => put(g, tor(.02, .005, PI, 5, 12), mat('#3a3a3e', 'acciaio'), s * .1, .2, 0));
    g.userData.manico = [0, .22, 0]; return g;
  };
  P.ricetrasmittente = { how: 'appeso' };
  // il walkie-talkie
  M.walkie = o => { const g = G(), c = o.c || '#1a1a1e'; put(g, rbox(.065, .17, .04, .01), mat(c, 'plastica'), 0, .085, 0); const gr = disegno('griglia', 64, 64, () => {}); put(g, pia(.045, .06), mat('#ffffff', 'metallo', gr), 0, .11, .0202); put(g, cyl(.006, .004, .16, 10), mat('#1a1a1e', 'gomma'), .018, .25, 0); put(g, cyl(.007, .007, .012, 12), mat('#5a5e64', 'metallo'), -.018, .176, 0); put(g, rbox(.008, .03, .01, .003), mat('#3a3a3e', 'plastica'), -.035, .1, 0); put(g, sfe(.003, 6, 4), mat('#e84a2a', 'luce'), 0, .16, .02); g.userData.grip = .07; return g; };
  P.walkie = { how: 'pugno' };
  // il kit dell'antenna: aste telescopiche e cavo
  M.antenna = o => { const g = G(); for (let i = 0; i < 3; i++) put(g, cyl(.006 - i * .0015, .006 - i * .0015, .5, 10), mat('#c8ccd4', 'cromo'), 0, .006, (i - 1) * .02, 0, 0, PI / 2); put(g, rbox(.06, .03, .05, .006), mat('#1a1a1e', 'plastica'), -.28, .015, 0); put(g, tubo([[-.3, .01, 0], [-.35, .005, .05], [-.3, .005, .1], [-.2, .005, .08]], .003, 16, 5), mat('#1a1a1e', 'gomma')); return g; };
  P.antenna = { how: 'lungo' };
  // la scatola elettronica fatta in casa (disturbatore, timer): o.c, o.led, o.display
  M.scatola_el = o => {
    const g = G(), c = o.c || '#3a3a40';
    put(g, rbox(.16, .07, .1, .006), mat(c, 'metallo'), 0, .035, 0);
    [-.05, -.02, .01].forEach(x => put(g, cyl(.008, .008, .01, 14), mat('#1a1a1e', 'plastica'), x, .045, .052, PI / 2));
    put(g, sfe(.004, 8, 6), mat(o.led || '#e84a2a', 'luce'), .05, .05, .05);
    if (o.display) { const d = disegno('display' + o.display, 64, 24, (x) => { x.fillStyle = '#1a0a08'; x.fillRect(0, 0, 64, 24); x.fillStyle = '#ff4a2a'; x.font = 'bold 18px monospace'; x.fillText(o.display, 4, 19); }); put(g, pia(.05, .02), mat('#ffffff', 'luce', d), .035, .03, .0502); }
    put(g, tubo([[.08, .02, 0], [.12, .01, .03], [.15, 0, .02]], .003, 10, 5), mat('#c83a2a', 'gomma')); put(g, tubo([[.08, .025, -.02], [.13, .005, -.03], [.16, 0, -.01]], .003, 10, 5), mat('#1a1a1e', 'gomma'));
    if (o.antenna) put(g, cyl(.003, .002, .2, 8), mat('#c8ccd4', 'cromo'), -.06, .17, -.03);
    return g;
  };
  P.scatola_el = { how: 'pugno' };
  // il telefono SIP a disco
  M.telefono = o => {
    const g = G(), c = o.c || '#7a7e78', m = mat(c, 'plastica');
    put(g, lat([[0, 0], [.09, 0], [.095, .01], [.085, .07], [.06, .09], [0, .095]], 4), m, 0, 0, 0, 0, PI / 4, 0, [1, 1, 1.1]);
    const di = disegno('disco', 64, 64, (x) => { x.fillStyle = '#e8e4d8'; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); x.fillStyle = '#2a2a2a'; x.font = 'bold 7px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; for (let i = 0; i < 10; i++) { const a = PI * .35 + i * .5; x.fillText(String((i + 1) % 10), 32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21); } });
    put(g, cyl(.035, .035, .004, 28), mat('#ffffff', 'plastica', di), 0, .07, .04, .55);
    const dd = put(g, new T.RingGeometry(.012, .034, 28), mat(shade(c, .8), 'vetroS'), 0, .073, .042, -PI / 2 + .55);
    put(g, cyl(.01, .01, .006, 16), mat(c, 'plastica'), 0, .073, .042, .55);
    // la cornetta sulla forcella
    put(g, ext([[-.1, -.014], [.1, -.014], [.11, .01], [.08, .02], [-.08, .02], [-.11, .01]], .04, .01), m, 0, .105, -.01, 0, 0, 0);
    [-1, 1].forEach(s => put(g, cyl(.024, .028, .03, 16), m, s * .1, .09, -.01));
    put(g, tubo(Array.from({ length: 30 }, (_, j) => [-.12 - j * .004, .08 - j * .0025 + Math.sin(j * 1.3) * .006, Math.cos(j * 1.3) * .006]), .002, 120, 4), mat(c, 'gomma'));
    return g;
  };
  P.telefono = { how: 'pugno' };
  // il telefono da campo in cassetta di legno con la manovella
  M.telefono_campo = o => { const g = G(); put(g, rbox(.24, .16, .12, .006), mat('#5a6a3a', 'legno'), 0, .08, 0); put(g, ext([[-.07, -.012], [.07, -.012], [.08, .012], [.05, .015], [-.05, .015], [-.08, .012]], .03, .006), mat('#1a1a1e', 'plastica'), 0, .175, 0); put(g, cyl(.006, .006, .03, 10), mat('#5a5e64', 'metallo'), .125, .1, 0, 0, 0, PI / 2); asta(g, [.14, .1, 0], [.14, .06, .02], .004, mat('#5a5e64', 'metallo')); put(g, cyl(.007, .007, .03, 10), mat('#1a1a1e', 'plastica'), .155, .06, .02, 0, 0, PI / 2); [-1, 1].forEach(s => put(g, tor(.015, .004, PI, 5, 12), mat('#3a3a3e', 'acciaio'), s * .1, .16, 0)); g.userData.manico = [0, .19, 0]; return g; };
  P.telefono_campo = { how: 'appeso' };
  // la macchina fotografica reflex
  M.fotocamera = o => {
    const g = G(), K = mat('#1a1a1e', 'gomma'), C = mat('#c8ccd4', 'cromo');
    put(g, rbox(.14, .08, .045, .008), K, 0, .04, 0);
    put(g, rbox(.142, .025, .047, .006), C, 0, .07, 0);
    put(g, ext([[-.025, 0], [.025, 0], [.015, .03], [-.015, .03]], .04, .004), C, 0, .08, 0);
    put(g, cyl(.032, .032, .05, 24), K, 0, .04, .045, PI / 2);
    put(g, cyl(.028, .03, .015, 24), C, 0, .04, .075, PI / 2);
    put(g, cyl(.024, .024, .002, 24), mat('#3a4a6a', 'vetroS'), 0, .04, .083, PI / 2);
    put(g, cyl(.008, .008, .006, 14), C, .045, .088, 0); put(g, cyl(.006, .006, .008, 12), mat('#c83a2a', 'plastica'), -.045, .088, 0);
    return g;
  };
  P.fotocamera = { how: 'pugno' };
  // il rullino nel barattolino
  M.rullino = o => { const g = G(); put(g, cyl(.016, .016, .05, 18), mat('#1a1a1e', 'plastica'), 0, .025, 0); put(g, cyl(.017, .017, .008, 18), mat('#7a7e86', 'plastica'), 0, .053, 0); const r = G(); r.position.set(.04, .018, 0); r.rotation.x = PI / 2; g.add(r); put(r, cyl(.013, .013, .036, 18), mat('#e8c040', 'metallo')); put(r, cyl(.004, .004, .046, 8), mat('#1a1a1e', 'plastica')); put(g, box(.03, .001, .036), mat('#5a3a1a', 'plastica'), .066, .002, 0); return g; };
  P.rullino = { how: 'pugno' };
  // la musicassetta con la custodia: o.c (etichetta)
  M.cassetta = o => {
    const g = G(), c = o.c || '#e8e4d8';
    put(g, rbox(.1, .012, .064, .003), mat('#1a1a1e', 'plastica'), 0, .006, 0);
    const et = disegno('cass' + c, 128, 80, (x) => { x.fillStyle = c; x.fillRect(0, 0, 128, 80); x.fillStyle = '#c83a2a'; x.fillRect(0, 8, 128, 6); x.fillStyle = '#1a1a1e'; x.fillRect(24, 32, 80, 22); x.fillStyle = '#5a3a1a'; [44, 84].forEach(cx => { x.beginPath(); x.arc(cx, 43, 9, 0, PI * 2); x.fill(); }); x.fillStyle = '#e8e4d8'; [44, 84].forEach(cx => { x.beginPath(); x.arc(cx, 43, 4, 0, PI * 2); x.fill(); }); x.fillStyle = '#3a3a3a'; x.font = 'italic 10px sans-serif'; x.fillText('lato A', 8, 26); });
    put(g, pia(.094, .058), mat('#ffffff', 'plastica', et), 0, .0122, 0, -PI / 2);
    put(g, rbox(.11, .016, .07, .002), mat('#e8f0ee', 'vetro'), .03, .008, .06, 0, .4, 0);
    return g;
  };
  P.cassetta = { how: 'piatto' };
  // le cuffie col archetto
  M.cuffie = o => { const g = G(), K = mat('#1a1a1e', 'plastica'); put(g, tor(.08, .006, PI, 6, 24), mat('#c8ccd4', 'cromo'), 0, .03, 0); [-1, 1].forEach(s => { put(g, cyl(.035, .035, .025, 22), mat(o.c || '#e88a2a', 'tessuto'), s * .08, .03, 0, 0, 0, PI / 2); put(g, cyl(.03, .03, .02, 20), K, s * .095, .03, 0, 0, 0, PI / 2); }); put(g, tubo([[-.1, .02, 0], [-.12, -.01, .03], [-.08, -.02, .08], [0, -.02, .1]], .002, 16, 4), K); g.rotation.x = 0; return g; };
  P.cuffie = { how: 'pugno' };
  // il microfono da palco
  M.microfono = o => { const g = G(); put(g, lat([[0, 0], [.012, 0], [.016, .11], [.02, .13], [0, .13]], 18), mat('#1a1a1e', 'plastica')); const gr = disegno('griglia', 64, 64, () => {}); put(g, sfe(.026, 18, 14), mat('#c8ccd4', 'metallo', gr), 0, .15, 0); put(g, tubo([[0, 0, 0], [0, -.04, 0], [.03, -.08, .02]], .003, 10, 5), mat('#1a1a1e', 'gomma')); g.userData.grip = .06; return g; };
  P.microfono = { how: 'pugno' };
  // il registratore a cassette portatile
  M.registratore = o => {
    const g = G(), c = o.c || '#2a2a2e';
    put(g, rbox(.26, .08, .05, .008), mat(c, 'plastica'), 0, .04, 0);
    put(g, rbox(.11, .05, .004, .003), mat('#e8f0ee', 'vetro'), .05, .042, .025);
    [[-1, '#c83a2a'], [0, '#1a1a1e'], [1, '#1a1a1e'], [2, '#1a1a1e']].forEach(([i, cc]) => put(g, rbox(.022, .012, .03, .002), mat(cc, 'plastica'), .02 + i * .025, .086, .005));
    const gr = disegno('griglia', 64, 64, () => {}); put(g, cyl(.035, .035, .002, 22), mat('#ffffff', 'metallo', gr), -.07, .042, .0255, PI / 2);
    put(g, tor(.06, .006, PI, 6, 16), mat(c, 'plastica'), 0, .08, 0);
    g.userData.manico = [0, .14, 0]; return g;
  };
  P.registratore = { how: 'appeso' };
  // la dinamo da bicicletta
  M.dinamo = o => { const g = G(); put(g, lat([[0, 0], [.018, 0], [.02, .06], [.016, .07], [0, .072]], 18), mat('#c8ccd4', 'cromo')); put(g, cyl(.01, .01, .012, 14), mat('#1a1a1e', 'gomma'), 0, .078, 0); put(g, rbox(.03, .02, .01, .003), mat('#7a7e86', 'metallo'), .02, .02, 0); g.userData.grip = .03; return g; };
  P.dinamo = { how: 'pugno' };
  // il motorino elettrico
  M.motore_el = o => { const g = G(); put(g, cyl(.06, .06, .14, 24), mat(o.c || '#2a4a7a', 'metallo'), 0, .07, 0, 0, 0, PI / 2); for (let i = 0; i < 8; i++) put(g, rbox(.12, .006, .01, .002), mat('#1a3a6a', 'metallo'), 0, .07 + Math.sin(i / 8 * PI * 2) * .06, Math.cos(i / 8 * PI * 2) * .06, i / 8 * PI * 2); put(g, cyl(.008, .008, .05, 10), mat('#c8ccd4', 'cromo'), .09, .07, 0, 0, 0, PI / 2); put(g, rbox(.12, .012, .12, .003), mat('#2a2a2e', 'metallo'), 0, .006, 0); put(g, rbox(.03, .025, .04, .004), mat('#1a1a1e', 'plastica'), 0, .135, 0); return g; };
  P.motore_el = { how: 'regge', w: .2, d: .14 };
  // la radio a galena fatta in casa: tavoletta, bobina, cristallo, cuffia
  M.radio_galena = o => { const g = G(); put(g, rbox(.2, .015, .12, .003), mat('#a87a4a', 'legno'), 0, .0075, 0); put(g, cyl(.025, .025, .07, 20), mat('#c86a2a', 'metallo'), -.04, .05, 0); for (let i = 0; i < 12; i++) put(g, tor(.026, .0012, 0, 4, 20), mat('#b85a1a', 'ottone'), -.04, .02 + i * .005, 0, PI / 2); put(g, cyl(.008, .008, .012, 12), mat('#5a5e64', 'metallo'), .04, .021, .02); put(g, cyl(.002, .001, .03, 6), mat('#c8ccd4', 'cromo'), .04, .035, .02, 0, 0, .6); put(g, tubo([[.06, .02, -.03], [.1, .04, -.05], [.12, .06, -.02]], .0018, 10, 4), mat('#c83a2a', 'gomma')); return g; };
  P.radio_galena = { how: 'regge', w: .2, d: .14 };

  // ---------------- carta e stampa ----------------
  // la risma di carta incartata
  M.risma = o => { const g = G(), c = o.c || '#f4f0e6'; put(g, rbox(.21, .05, .297, .002), mat(c, 'carta'), 0, .025, 0); put(g, rbox(.212, .052, .1, .002), mat(o.carta || '#2a5aa8', 'carta'), 0, .026, .02); decal(g, etichetta({ bg: o.carta || '#2a5aa8', fg: '#f2f0ea', testo: o.testo || 'CARTA', sub: '500 fogli' }), .18, .08, 0, .0525, .02, 0, -PI / 2); return g; };
  P.risma = { how: 'piatto' };
  // il quaderno a righe con la copertina colorata
  M.quaderno = o => { const g = G(), c = o.c || '#c83a2a'; put(g, rbox(.17, .012, .22, .002), mat('#f4f0e6', 'carta'), 0, .006, 0); put(g, rbox(.172, .002, .222, .001), mat(c, 'carta'), 0, .013, 0); put(g, rbox(.172, .002, .222, .001), mat(c, 'carta'), 0, .001, 0); decal(g, etichetta({ bg: c, fg: '#f2f0ea', testo: 'QUADERNO', bordo: '#f2f0ea' }), .13, .07, 0, .0142, -.04, 0, -PI / 2); put(g, box(.004, .014, .222), mat(shade(c, .7), 'carta'), -.086, .007, 0); return g; };
  P.quaderno = { how: 'piatto' };
  // il libretto (anche il libretto rosso, le tessere): o.c, o.testo, o.w, o.d
  M.libretto = o => { const g = G(), c = o.c || '#7a2a2a', w = o.w || .1, d = o.d || .14; put(g, rbox(w, .008, d, .002), mat('#f2ead8', 'carta'), 0, .004, 0); put(g, rbox(w + .002, .0015, d + .002, .0006), mat(c, 'carta'), 0, .0085, 0); put(g, rbox(w + .002, .0015, d + .002, .0006), mat(c, 'carta'), 0, .0004, 0); decal(g, etichetta({ bg: c, fg: o.fg || '#e8c860', testo: o.testo || 'LIBRETTO', disc: o.disc || null }), w * .8, d * .4, 0, .0093, -d * .1, 0, -PI / 2); return g; };
  P.libretto = { how: 'piatto' };
  // il giornale piegato
  M.giornale = o => {
    const g = G();
    const gt = disegno('testata' + (o.testo || ''), 256, 320, (x) => { x.fillStyle = '#ece6d6'; x.fillRect(0, 0, 256, 320); x.fillStyle = '#1a1a1a'; x.font = 'bold 34px Georgia, serif'; x.textAlign = 'center'; x.fillText(o.testo || 'IL TIRRENO', 128, 42); x.fillRect(10, 52, 236, 3); x.font = 'bold 22px Georgia, serif'; x.fillText(o.titolo || 'Sciopero al porto', 128, 84); x.fillStyle = '#6a6660'; x.fillRect(14, 100, 110, 80); x.fillStyle = 'rgba(30,30,30,.6)'; for (let y = 100; y < 310; y += 6) { x.fillRect(132, y, 110 - (y * 7) % 13, 2); if (y > 190) x.fillRect(14, y, 110 - (y * 5) % 9, 2); } });
    put(g, box(.29, .006, .2), mat('#ece6d6', 'carta'), 0, .003, 0);
    put(g, pia(.29, .2), mat('#ffffff', 'carta', gt), 0, .0062, 0, -PI / 2, 0, PI / 2);
    gt.repeat.set(1, .62); gt.offset.set(0, .38);
    return g;
  };
  P.giornale = { how: 'piatto' };
  // i volantini (o la rivista): una mazzetta legata con lo spago
  M.volantini = o => { const g = G(), c = o.c || '#c83a2a', t = etichetta({ bg: '#f2ead8', fg: c, testo: o.testo || 'SCIOPERO!', sub: o.sub || 'tutti in piazza', band: c, w: 128, h: 160 }); for (let i = 0; i < 6; i++) put(g, box(.15, .0012, .21), mat('#f2ead8', 'carta'), (i % 2) * .003, .001 + i * .0014, 0, 0, (i - 3) * .02, 0); put(g, pia(.14, .2), mat('#ffffff', 'carta', t), 0, .0095, 0, -PI / 2, 0, .04); if (o.legati !== false) { put(g, box(.004, .012, .214), mat('#c8a868', 'tessuto'), 0, .005, 0); put(g, box(.154, .012, .004), mat('#c8a868', 'tessuto'), 0, .005, 0); } return g; };
  P.volantini = { how: 'piatto' };
  // il manifesto arrotolato con l'elastico
  M.rotolo_poster = o => { const g = G(); put(g, cyl(.025, .025, .5, 18), mat('#f2ead8', 'carta'), 0, .025, 0, 0, 0, PI / 2); put(g, lat([[.005, 0], [.025, 0], [.025, .001]], 18), mat('#c83a2a', 'carta'), .25, .025, 0, 0, 0, -PI / 2); put(g, tor(.026, .002, 0, 4, 18), mat('#c8a040', 'gomma'), .1, .025, 0, 0, PI / 2, 0); put(g, cyl(.0255, .0255, .2, 18, true), mat(o.c || '#c83a2a', 'carta'), -.1, .025, 0, 0, 0, PI / 2); return g; };
  P.rotolo_poster = { how: 'lungo' };
  // lo stencil di cartone ritagliato
  M.stencil = o => { const g = G(); put(g, ext(rrect(-.15, -.1, .15, .1, .01), .003, 0, [[[-.12, -.04], [-.08, -.04], [-.08, .05], [-.12, .05]], [[-.06, -.04], [-.02, -.04], [-.02, .05], [-.06, .05]], { x: .03, y: 0, r: .04 }, [[.09, -.05], [.12, -.05], [.12, .06], [.09, .06]]]), mat('#c8a868', 'cartone'), 0, .0015, 0, PI / 2); return g; };
  P.stencil = { how: 'piatto' };
  // il timbro di legno col tampone
  M.timbro = o => { const g = G(); put(g, lat([[0, 0], [.014, 0], [.016, .03], [.012, .055], [.018, .065], [.015, .075], [0, .078]], 16), mat('#7a4a2a', 'legno'), 0, .014, 0); put(g, rbox(.05, .014, .03, .003), mat('#5a3a1a', 'legno'), 0, .007, 0); put(g, rbox(.048, .003, .028, .001), mat('#1a1a1a', 'gomma'), 0, .0015, 0); put(g, rbox(.08, .012, .06, .004), mat('#2a4a8a', 'metallo'), .07, .006, 0); g.userData.grip = .06; return g; };
  P.timbro = { how: 'pugno' };
  // le fototessere (una striscia)
  M.foto = o => { const g = G(); const ft = disegno('fototessera', 64, 192, (x) => { x.fillStyle = '#f2f0ea'; x.fillRect(0, 0, 64, 192); for (let i = 0; i < 4; i++) { x.fillStyle = '#9aa0a8'; x.fillRect(4, 4 + i * 47, 56, 43); x.fillStyle = '#3a3430'; x.beginPath(); x.arc(32, 22 + i * 47, 10, 0, PI * 2); x.fill(); x.fillRect(16, 32 + i * 47, 32, 15); } }); put(g, box(.035, .0008, .16), mat('#ffffff', 'carta', ft), 0, .0004, 0); put(g, pia(.035, .16), mat('#ffffff', 'carta', ft), 0, .0009, 0, -PI / 2); return g; };
  P.foto = { how: 'piatto' };
  // la cartellina con l'elastico (documenti, fascicolo, prove): o.c, o.testo
  M.cartellina = o => { const g = G(), c = o.c || '#c8a050'; put(g, rbox(.24, .018, .32, .003), mat(c, 'cartone'), 0, .009, 0); for (let i = 0; i < 3; i++) put(g, box(.21, .001, .29), mat('#f2ead8', 'carta'), .012 + i * .003, .012 + i * .0012, i * .004); [-1, 1].forEach(s => put(g, box(.244, .02, .004), mat('#1a1a1a', 'gomma'), 0, .009, s * .12)); decal(g, etichetta({ bg: c, fg: '#1a1a1a', testo: o.testo || 'PRATICA', bordo: '#1a1a1a' }), .14, .07, 0, .0185, -.03, 0, -PI / 2); if (o.timbro) decal(g, etichetta({ bg: 'rgba(0,0,0,0)', fg: '#c83a2a', testo: o.timbro, bordo: '#c83a2a', w: 128, h: 64 }), .1, .05, .05, .019, .09, 0, -PI / 2); return g; };
  P.cartellina = { how: 'piatto' };
  // la busta gialla imbottita (prove)
  M.busta = o => { const g = G(), c = o.c || '#d8b860'; put(g, rbox(.23, .014, .16, .006), mat(c, 'carta'), 0, .007, 0); put(g, ext([[-.115, 0], [.115, 0], [0, -.06]], .002, 0), mat(shade(c, .92), 'carta'), 0, .015, -.08, PI / 2); decal(g, etichetta({ bg: c, fg: '#c83a2a', testo: o.testo || 'RISERVATO', bordo: '#c83a2a', w: 256, h: 96 }), .12, .045, .03, .0145, .03, 0, -PI / 2); return g; };
  P.busta = { how: 'piatto' };
  // le penne a sfera (un mazzetto)
  M.penne = o => { const g = G(); ['#2a5aa8', '#c83a2a', '#1a1a1e'].forEach((c, i) => { const p = G(); p.position.set(0, .005, (i - 1) * .014); p.rotation.set(0, (i - 1) * .1, PI / 2); g.add(p); put(p, cyl(.004, .004, .13, 6), mat('#e8f0ee', 'vetroS')); put(p, cyl(.0025, .0025, .12, 6), mat(c, 'plastica')); put(p, cyl(.0045, .0045, .02, 6), mat(c, 'plastica'), 0, .065, 0); put(p, cyl(.0015, .004, .012, 8), mat('#e8f0ee', 'vetroS'), 0, -.07, 0); }); return g; };
  P.penne = { how: 'pugno' };
  // la macchina per scrivere portatile
  M.macchina_scrivere = o => {
    const g = G(), c = o.c || '#5a6a5a', m = mat(c, 'metallo');
    put(g, ext([[-.15, 0], [.15, 0], [.15, .03], [.02, .06], [-.15, .085]], .32, .01), m, 0, 0, 0, 0, -PI / 2, 0);   // la cassa a cuneo, bassa davanti
    for (let r = 0; r < 4; r++) for (let i = 0; i < 10 - (r === 3 ? 3 : 0); i++) { put(g, cyl(.007, .007, .004, 12), mat('#1a1a1e', 'plastica'), -.11 + i * .024 + r * .008, .045 + r * .012, .1 - r * .022); put(g, cyl(.006, .006, .0045, 12), mat('#e8e4d8', 'plastica'), -.11 + i * .024 + r * .008, .046 + r * .012, .1 - r * .022); }
    put(g, cyl(.022, .022, .34, 18), mat('#1a1a1e', 'gomma'), 0, .1, -.06, 0, 0, PI / 2);
    [-1, 1].forEach(s => put(g, cyl(.016, .016, .012, 14), mat('#c8ccd4', 'cromo'), s * .176, .1, -.06, 0, 0, PI / 2));
    put(g, box(.21, .2, .001), mat('#f4f0e6', 'carta'), 0, .19, -.075, -.15);
    asta(g, [-.17, .11, -.04], [-.22, .14, -.02], .004, mat('#c8ccd4', 'cromo'));
    return g;
  };
  P.macchina_scrivere = { how: 'regge', w: .34, d: .3 };
  // il nastro per la macchina da scrivere (due bobine nella scatolina)
  M.nastro_mds = o => { const g = G(); put(g, rbox(.07, .02, .07, .003), mat('#e8e4d8', 'cartone'), 0, .01, 0); put(g, cyl(.024, .024, .012, 20), mat('#1a1a1e', 'plastica'), .05, .006, .03); put(g, cyl(.024, .024, .004, 20), mat('#c83a2a', 'plastica'), .05, .013, .03); decal(g, etichetta({ bg: '#e8e4d8', fg: '#1a1a1a', testo: 'NASTRO', band: '#c83a2a', w: 128, h: 128 }), .06, .06, 0, .0205, 0, 0, -PI / 2); return g; };
  P.nastro_mds = { how: 'pugno' };
  // la carta geografica piegata a fisarmonica
  M.mappa = o => {
    const g = G();
    const mp = disegno('mappa' + (o.c || ''), 256, 192, (x) => { x.fillStyle = '#8ab8d8'; x.fillRect(0, 0, 256, 192); x.fillStyle = o.c || '#d8d0a0'; x.beginPath(); x.moveTo(40, 30); x.bezierCurveTo(150, 10, 230, 60, 210, 120); x.bezierCurveTo(190, 180, 80, 175, 50, 140); x.bezierCurveTo(20, 100, 10, 50, 40, 30); x.fill(); x.strokeStyle = '#c83a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(60, 60); x.lineTo(120, 90); x.lineTo(190, 80); x.stroke(); x.strokeStyle = '#6a8a4a'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(110 + i * 4, 110, 26 - i * 5, 0, PI * 2); x.stroke(); } x.fillStyle = '#1a1a1a'; x.beginPath(); x.arc(120, 90, 4, 0, PI * 2); x.fill(); x.strokeStyle = 'rgba(60,40,20,.4)'; x.lineWidth = 1; for (let i = 64; i < 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 192); x.stroke(); } x.beginPath(); x.moveTo(0, 96); x.lineTo(256, 96); x.stroke(); });
    // quattro pannelli a fisarmonica, ognuno con la sua parte della carta
    for (let i = 0; i < 4; i++) {
      const t = mp.clone(); t.needsUpdate = true; t.repeat.set(.25, 1); t.offset.set(i * .25, 0);
      const m = new T.MeshStandardMaterial({ map: t, roughness: .9, side: T.DoubleSide });
      const pn = put(g, pia(.07, .18), m, -.105 + i * .07, .012 + (i % 2 ? -.004 : .004), 0, -PI / 2, 0, 0); pn.rotation.y = (i % 2 ? .12 : -.12);
    }
    return g;
  };
  P.mappa = { how: 'piatto' };

  // ---------------- medicine ----------------
  // la scatola del farmaco: o.c, o.testo, o.w/h/d
  M.scatola_farmaco = o => { const g = G(), w = o.w || .1, h = o.h || .025, d = o.d || .055, c = o.c || '#c83a2a'; put(g, rbox(w, h, d, .0015), mat('#f2f0ea', 'cartone'), 0, h / 2, 0); decal(g, etichetta({ bg: '#f2f0ea', fg: c, testo: o.testo || 'COMPRESSE', sub: o.sub || '20 cpr', band: c }), w * .96, d * .92, 0, h + .0008, 0, 0, -PI / 2); decal(g, etichetta({ bg: '#f2f0ea', fg: c, testo: o.testo || 'COMPRESSE', band: c, w: 256, h: 64 }), w * .96, h * .9, 0, h / 2, d / 2 + .0008); return g; };
  P.scatola_farmaco = { how: 'pugno' };
  // il flaconcino delle pillole col tappo a pressione
  M.pillole = o => { const g = G(), c = o.c || '#e88a2a'; put(g, cyl(.018, .018, .06, 20), mat(c, 'vetroS'), 0, .03, 0); put(g, cyl(.019, .019, .016, 20), mat('#f2f0ea', 'plastica'), 0, .068, 0); const t = etichetta({ bg: '#f2f0ea', fg: '#1a1a1a', testo: o.testo || 'Rx', w: 128, h: 64 }); t.offset.x = .5; put(g, cyl(.0185, .0185, .03, 20, true), mat('#ffffff', 'carta', t), 0, .03, 0); for (let i = 0; i < 3; i++) put(g, new T.CapsuleGeometry(.0035, .007, 4, 8), mat(i ? '#f2f0ea' : '#c83a2a', 'lucido'), .03 + i * .01, .004, .01 * i, PI / 2, i, 0); return g; };
  P.pillole = { how: 'pugno' };
  // il blister (sonniferi)
  M.blister = o => { const g = G(); put(g, rbox(.09, .002, .05, .002), mat('#c8ccd4', 'metallo'), 0, .001, 0); for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { put(g, sfe(.006, 10, 6, 0, PI * 2, 0, PI / 2), mat('#e8f0ee', 'vetro'), -.034 + i * .017, .002, (j - .5) * .022, 0, 0, 0, [1, .7, 1]); if (i < 4) put(g, sfe(.004, 8, 6), mat(o.c || '#8ab0e8', 'lucido'), -.034 + i * .017, .003, (j - .5) * .022, 0, 0, 0, [1, .6, 1]); } return g; };
  P.blister = { how: 'piatto' };
  // le garze (pacchetto) e il rotolo di benda
  M.garze = o => { const g = G(); put(g, rbox(.1, .015, .1, .003), mat('#f4f0e8', 'carta'), 0, .0075, 0); decal(g, etichetta({ bg: '#f4f0e8', fg: '#c83a2a', testo: 'GARZA', sub: 'sterile', band: '#2a5aa8' }), .09, .09, 0, .0155, 0, 0, -PI / 2); return g; };
  P.garze = { how: 'piatto' };
  M.benda = o => {
    const g = G(), W = mat('#f4f0e8', 'tessuto');
    put(g, cyl(.03, .03, .06, 24), W, 0, .03, 0, PI / 2);
    put(g, cyl(.011, .011, .061, 14), mat('#d8d0c0', 'tessuto'), 0, .03, 0, PI / 2);
    for (let j = 1; j < 3; j++) [-1, 1].forEach(s => put(g, tor(.011 + j * .0065, .0006, 0, 3, 22), mat('#d8d0c0', 'tessuto'), 0, .03, s * .0305));
    put(g, box(.06, .0015, .14), W, 0, .0008, .09);   // il capo srotolato sul piano
    return g;
  };
  P.benda = { how: 'pugno' };
  // la siringa: cilindro trasparente con la scala, stantuffo, ago
  M.siringa = o => {
    const g = G();
    put(g, cyl(.007, .007, .08, 14, true), mat('#e8f0ee', 'vetro'), 0, .04, 0).material.side = T.DoubleSide;
    put(g, cyl(.006, .006, .05, 12), mat(o.liq || '#e8d8a0', 'liquido'), 0, .028, 0);
    put(g, cyl(.006, .006, .01, 12), mat('#1a1a1e', 'gomma'), 0, .056, 0);
    put(g, cyl(.002, .002, .05, 6), mat('#e8f0ee', 'plastica'), 0, .085, 0);
    put(g, rbox(.03, .003, .012, .001), mat('#e8f0ee', 'plastica'), 0, .11, 0);
    put(g, rbox(.03, .003, .012, .001), mat('#e8f0ee', 'plastica'), 0, .08, 0);
    put(g, cyl(.002, .003, .01, 8), mat('#2a5aa8', 'plastica'), 0, -.005, 0);
    put(g, cyl(.0005, .0005, .03, 4), mat('#d8dce4', 'cromo'), 0, -.025, 0);
    g.userData.grip = .07; g.userData.diag = true; return g;
  };
  P.siringa = { how: 'pugno' };
  // la fiala (morfina)
  M.fiala = o => { const g = G(); for (let i = 0; i < 3; i++) { const p = G(); p.position.set(i * .016 - .016, .007, 0); p.rotation.z = PI / 2; g.add(p); put(p, lat([[0, 0], [.006, 0], [.007, .002], [.007, .04], [.003, .046], [.002, .05], [.004, .058], [0, .062]], 14), mat('#d8c8a0', 'vetroS')); put(p, cyl(.0072, .0072, .006, 14), mat('#c83a2a', 'carta'), 0, .02, 0); } g.children.forEach((p, i) => p.position.set(-.03, .007, (i - 1) * .016)); return g; };
  P.fiala = { how: 'pugno' };
  // la valigetta del pronto soccorso
  M.valigetta_medica = o => { const g = G(), c = o.c || '#f2f0ea'; put(g, rbox(.32, .22, .1, .015), mat(c, 'plastica'), 0, .11, 0); put(g, rbox(.322, .01, .102, .004), mat(shade(c, .85), 'plastica'), 0, .15, 0); [[.12, .04], [.04, .12]].forEach(([w, h]) => put(g, box(w, h, .003), mat('#c83a2a', 'plastica'), 0, .1, .051)); put(g, tor(.04, .008, PI, 6, 14), mat('#1a1a1e', 'plastica'), 0, .22, 0); [-1, 1].forEach(s => put(g, rbox(.02, .02, .012, .003), mat('#c8ccd4', 'cromo'), s * .1, .16, .05)); g.userData.manico = [0, .26, 0]; return g; };
  P.valigetta_medica = { how: 'appeso' };
  // il laccio emostatico, la stecca, il termometro
  M.laccio = o => { const g = G(); put(g, tubo([[-.15, .004, 0], [-.05, .004, .04], [.05, .004, -.02], [.12, .004, .03]], .004, 30, 6), mat('#c8905a', 'gomma')); put(g, rbox(.03, .01, .02, .003), mat('#5a5e64', 'metallo'), .13, .006, .03); return g; };
  P.laccio = { how: 'pugno' };
  M.stecca = o => { const g = G(); put(g, rbox(.08, .006, .4, .003), mat('#e8c060', 'plastica'), 0, .003, 0); put(g, rbox(.07, .012, .38, .005), mat('#c8c0b0', 'tessuto'), 0, .009, 0); [-.1, .1].forEach(z => put(g, box(.085, .015, .03), mat('#e8e0d0', 'tessuto'), 0, .008, z)); return g; };
  P.stecca = { how: 'lungo' };
  M.termometro = o => { const g = G(); put(g, cyl(.004, .004, .12, 10), mat('#e8f0ee', 'vetroS'), 0, .06, 0); put(g, cyl(.0012, .0012, .06, 6), mat('#c8ccd4', 'cromo'), 0, .05, 0); put(g, sfe(.0035, 8, 6), mat('#c8ccd4', 'cromo'), 0, .004, 0); put(g, rbox(.016, .14, .012, .005), mat('#2a5aa8', 'plastica'), .02, .07, 0); g.children[3].position.set(.022, .065, 0); g.userData.grip = .08; g.userData.diag = true; return g; };
  P.termometro = { how: 'pugno' };

  // ---------------- igiene ----------------
  M.saponetta = o => { const g = G(), c = o.c || '#e8b0c8'; put(g, rbox(.09, .03, .06, .014), mat(c, 'cera'), 0, .015, 0); decal(g, etichetta({ bg: 'rgba(0,0,0,0)', fg: shade(c, .7), testo: o.testo || 'SAPONE', w: 256, h: 128 }), .06, .03, 0, .0302, 0, 0, -PI / 2); return g; };
  P.saponetta = { how: 'pugno' };
  // il fustino del detersivo, col manico
  M.fustino = o => { const g = G(), c = o.c || '#2a7ac8'; put(g, cyl(.11, .11, .3, 28), mat(c, 'cartone'), 0, .15, 0); put(g, cyl(.112, .112, .02, 28), mat('#c8ccd4', 'metallo'), 0, .3, 0); put(g, cyl(.112, .112, .015, 28), mat('#c8ccd4', 'metallo'), 0, .007, 0); const t = etichetta({ bg: c, fg: '#f2f0ea', testo: o.testo || 'BIANCO', sub: 'più bianco', band: '#e8c040', w: 512, h: 128 }); t.offset.x = .5; put(g, cyl(.1108, .1108, .16, 28, true), mat('#ffffff', 'carta', t), 0, .16, 0); put(g, tor(.07, .006, PI, 6, 14), mat('#1a1a1e', 'plastica'), 0, .31, 0); g.userData.manico = [0, .38, 0]; return g; };
  P.fustino = { how: 'appeso' };
  // la spugna (e la paglietta)
  M.spugna = o => { const g = G(); put(g, rbox(.1, .035, .065, .012), mat(o.c || '#e8d040', 'tessuto'), 0, .0175, 0); put(g, rbox(.1, .008, .065, .003), mat('#3a7a4a', 'tessuto'), 0, .039, 0); put(g, rbox(.08, .03, .06, .012), mat(o.c2 || '#e88a5a', 'tessuto'), .02, .015, .07, 0, .3, 0); return g; };
  P.spugna = { how: 'pugno' };
  // il dentifricio nella scatola
  M.dentifricio = o => { const g = M.tubetto({ c: '#f2f0ea', cap: '#2a5aa8', testo: 'DENTI', L: .15, r: .016 }); return g; };
  P.dentifricio = { how: 'piatto' };
  // il rasoio di sicurezza
  M.rasoio = o => { const g = G(); put(g, lat([[0, 0], [.006, 0], [.007, .01], [.0065, .085], [.008, .09], [0, .092]], 14), mat('#c8ccd4', 'cromo')); for (let i = 0; i < 8; i++) put(g, tor(.0068, .0008, 0, 3, 14), mat('#9aa0a8', 'cromo'), 0, .02 + i * .008, 0, PI / 2); put(g, rbox(.045, .006, .014, .002), mat('#c8ccd4', 'cromo'), 0, .095, 0); put(g, box(.046, .0006, .016), mat('#e8ecf0', 'cromo'), 0, .097, 0); g.userData.grip = .04; g.userData.diag = true; return g; };
  P.rasoio = { how: 'pugno' };
  // gli stracci appallottolati
  M.stracci = o => {
    const g = G(), r = rng(4), cs = ['#a8a090', '#8a6a5a', '#5a6a8a', '#c8b8a0'];
    for (let i = 0; i < 5; i++) { const w = .16 + r() * .06, d = .12 + r() * .05; const b = put(g, rbox(w, .018, d, .008), mat(cs[i % 4], 'tessuto'), (r() - .5) * .06, .01 + i * .016, (r() - .5) * .05, (r() - .5) * .25, r() * PI, (r() - .5) * .25); }
    put(g, tubo([[.05, .085, .02], [.1, .07, .06], [.13, .02, .08], [.16, .005, .05]], .012, 16, 6), mat(cs[1], 'tessuto'));   // un lembo che pende
    return g;
  };
  P.stracci = { how: 'regge', w: .24, d: .18 };
  // i rotoli di carta igienica (un pacco da quattro)
  M.rotoli = o => { const g = G(); for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * .105, z = (Math.floor(i / 2) - .5) * .105; put(g, lat([[.02, 0], [.05, 0], [.05, .1], [.02, .1], [.02, 0]], 24), mat('#f4f0ea', 'tessuto'), x, 0, z); put(g, lat([[.018, 0], [.02, 0], [.02, .1], [.018, .1]], 16), mat('#c8a868', 'cartone'), x, 0, z); } put(g, box(.215, .1, .215), mat('#e8f0ee', 'vetro'), 0, .05, 0); return g; };
  P.rotoli = { how: 'regge', w: .22, d: .22 };
  // il pettine
  M.pettine = o => { const g = G(), c = o.c || '#1a1a1e'; put(g, rbox(.16, .012, .004, .002), mat(c, 'plastica'), 0, .03, 0); for (let i = 0; i < 30; i++) put(g, box(.0022, .022 + (i < 12 ? .004 : 0), .003), mat(c, 'plastica'), -.075 + i * .0052, .013, 0); g.rotation.x = -PI / 2; const w = G(); w.add(g); g.position.y = .002; return w; };
  P.pettine = { how: 'piatto' };
  // la tenda arrotolata nella sacca coi paletti
  M.tenda = o => { const g = G(), c = o.c || '#4a6a3a'; put(g, new T.CapsuleGeometry(.08, .32, 6, 18), mat(c, 'tessuto'), 0, .08, 0, 0, 0, PI / 2); [-.12, .12].forEach(x => put(g, tor(.082, .006, 0, 5, 20), mat('#1a1a1e', 'tessuto'), x, .08, 0, 0, PI / 2, 0)); put(g, tor(.03, .004, 0, 5, 12), mat('#1a1a1e', 'tessuto'), -.24, .08, 0, 0, PI / 2, 0); for (let i = 0; i < 3; i++) put(g, cyl(.006, .006, .5, 8), mat('#a8acb4', 'metallo'), 0, .17, -.03 + i * .02, 0, 0, PI / 2); return g; };
  P.tenda = { how: 'regge', w: .4, d: .2 };
  // il sacco a pelo arrotolato con le cinghie
  M.sacco_pelo = o => { const g = G(), c = o.c || '#c86a2a'; put(g, cyl(.11, .11, .36, 26), mat(c, 'tessuto'), 0, .11, 0, 0, 0, PI / 2); [-1, 1].forEach(s => { put(g, cyl(.106, .106, .002, 26), mat(shade(c, .7), 'tessuto'), s * .181, .11, 0, 0, 0, PI / 2); for (let j = 1; j < 4; j++) put(g, tor(.106 * j / 4, .002, 0, 3, 24), mat(shade(c, .8), 'tessuto'), s * .182, .11, 0, 0, PI / 2, 0); put(g, tor(.113, .007, 0, 5, 26), mat('#1a1a1e', 'tessuto'), s * .1, .11, 0, 0, PI / 2, 0); }); return g; };
  P.sacco_pelo = { how: 'regge', w: .4, d: .24 };

  // ---------------- vestiti ----------------
  // il capo piegato (maglione, giacca, divisa, tuta, jeans): o.c, o.k = maglia | giacca | jeans | divisa | cappotto, o.n (quanti)
  M.capo_piegato = o => {
    const g = G(), c = o.c || '#4a5a8a', k = o.k || 'maglia', n = o.n || 1, kind = k === 'giacca' && /2a22|2220/.test(c) ? 'opaco' : 'tessuto';
    const m = mat(c, kind), mS = mat(shade(c, .82), kind), mL = mat(shade(c, 1.1), kind), W = .3, D = .24, h = .04;
    for (let i = 0; i < n; i++) {   // la pila: ogni capo un cuscinetto morbido, i bordi gonfi, un po' sfalsati
      const y0 = i * (h + .004), mm = i ? mat(shade(c, .8 + i * .07), kind) : m;
      put(g, rbox(W, h, D, .018), mm, (i % 2) * .008 - .004, y0 + h / 2, (i % 2) * .006, 0, i * .04 - .03, 0);
    }
    const top = n * (h + .004) - .004;
    // le maniche ripiegate sul davanti, a croce, e i polsini
    if (k !== 'jeans') [-1, 1].forEach(sd => {   // dalla spalla (angolo dietro) verso il centro davanti, larghe e piatte, col polsino a coste in fondo
      const x0 = sd * (W / 2 - .03), z0 = -D / 2 + .04, x1 = sd * .03, z1 = D / 2 - .06, L = Math.hypot(x1 - x0, z1 - z0), an = Math.atan2(x1 - x0, z1 - z0);
      put(g, rbox(.085, .012, L, .006), mS, (x0 + x1) / 2, top + .004, (z0 + z1) / 2, 0, an, 0);
      put(g, rbox(.088, .014, .03, .006), mat(shade(c, .72), kind), x1 - Math.sin(an) * .012, top + .005, z1 - Math.cos(an) * .012, 0, an, 0);
    });
    if (k === 'maglia' || k === 'cappotto' || k === 'divisa') {
      // il collo a coste, piatto sul dietro, e la costa in fondo
      put(g, tor(.05, .012, PI * 1.2, 6, 20), mat(shade(c, .75), kind), 0, top + .005, -.06, -PI / 2, 0, -PI * .1, [1, 1, .5]);
      put(g, rbox(W - .01, .006, .03, .003), mat(shade(c, .74), kind), 0, top - .001, D / 2 - .016);
      for (let i = -9; i <= 9; i++) put(g, box(.0025, .0062, .03), mat(shade(c, .6), kind), i * .015, top + .001, D / 2 - .016);
      if (k !== 'maglia') { for (let i = 0; i < 4; i++) put(g, cyl(.008, .008, .004, 14), mat(k === 'divisa' ? '#b89038' : '#2a2420', k === 'divisa' ? 'ottone' : 'plastica'), 0, top + .006, -.08 + i * .045); [-1, 1].forEach(sd => put(g, rbox(.07, .005, .045, .003), mS, sd * .08, top + .004, -.04)); }
      if (k === 'divisa') { put(g, rbox(.05, .004, .025, .002), mat('#a8302a', 'tessuto'), .1, top + .008, -.075); put(g, rbox(.04, .006, .015, .002), mat('#b89038', 'ottone'), -.1, top + .008, -.08); }
    } else if (k === 'giacca') {
      // il bavero a rever, la cerniera o i bottoni, le tasche a filetto
      [-1, 1].forEach(sd => put(g, ext([[0, 0], [sd * .07, -.02], [sd * .075, -.1], [sd * .02, -.13], [0, -.06]], .006, .002), mS, sd * .006, top + .004, -.06, PI / 2));
      put(g, rbox(.012, .004, .15, .002), mat('#a8acb0', 'metallo'), 0, top + .004, .03);
      put(g, cyl(.006, .006, .006, 12), mat('#a8acb0', 'metallo'), 0, top + .006, -.04);
      [-1, 1].forEach(sd => put(g, rbox(.06, .003, .008, .002), mat(shade(c, .6), kind), sd * .08, top + .002, .06));
    } else if (k === 'jeans') {
      // il dietro dei jeans piegati: la cintura coi passanti, le due tasche cucite in arancio, l'etichetta di cuoio
      put(g, rbox(W, .01, .035, .004), mS, 0, top + .002, -D / 2 + .02);
      for (let i = -2; i <= 2; i++) put(g, rbox(.008, .012, .02, .002), mS, i * .06, top + .006, -D / 2 + .02);
      put(g, rbox(.05, .006, .02, .002), mat('#8a5a32', 'opaco'), .09, top + .006, -D / 2 + .02);
      const cu = mat('#d88a3a', 'tessuto');
      [-1, 1].forEach(sd => { put(g, ext([[-.04, 0], [.04, 0], [.035, -.06], [0, -.075], [-.035, -.06]], .004, .001), mL, sd * .07, top + .002, -.04, PI / 2); put(g, tubo([[-.035, top + .0045, -.042], [.035, top + .0045, -.042]].map(p => [p[0] + sd * .07, p[1], p[2]]), .0012, 4, 3), cu); });
      put(g, tubo([[-W / 2 + .01, top + .002, .03], [W / 2 - .01, top + .002, .03]], .0012, 4, 3), cu);
    }
    return g;
  };
  P.capo_piegato = { how: 'piatto' };
  // il paio di scarpe (o di stivali): o.c, o.alti
  M.scarpe = o => {
    const g = G(), c = o.c || '#5a3a22';
    [-1, 1].forEach(s => {
      const h = G(); h.position.set(s * .06, 0, s * .015); h.rotation.y = s * .1; g.add(h);
      const sole = new T.Shape(); sole.moveTo(-.035, -.13); sole.bezierCurveTo(-.045, -.05, -.05, .06, -.03, .13); sole.bezierCurveTo(-.01, .15, .03, .15, .04, .11); sole.bezierCurveTo(.05, .04, .04, -.08, .03, -.13); sole.bezierCurveTo(.01, -.15, -.02, -.15, -.035, -.13);
      put(h, ext(sole, .018, .004), mat('#1a1614', 'gomma'), 0, .009, 0, PI / 2);
      put(h, ext(sole, .06, .02), mat(c, 'opaco'), 0, .045, -.01, PI / 2, 0, 0, [.95, .92, 1]);
      if (o.alti) put(h, rbox(.075, .2, .1, .03), mat(c, 'opaco'), 0, .16, -.06);
      else put(h, rbox(.07, .05, .08, .02), mat(c, 'opaco'), 0, .08, -.07);
      for (let i = 0; i < 4; i++) put(h, box(.05, .004, .006), mat('#e8e0cc', 'tessuto'), 0, (o.alti ? .14 : .08) + i * .005, .0 - i * .015);
      put(h, sfe(.03, 12, 8), mat(c, 'opaco'), 0, .045, .085, 0, 0, 0, [1.15, .9, 1.4]);
    });
    return g;
  };
  P.scarpe = { how: 'appeso', manico: [0, .12, -.08] };
  // il berretto (passamontagna, coppola, elmetto, berretto di lana): o.k, o.c
  M.berretto = o => {
    const g = G(), k = o.k || 'lana', c = o.c || '#4a5a3a';
    if (k === 'elmetto') { put(g, sfe(.15, 24, 12, 0, PI * 2, 0, PI / 2), mat(c, 'metallo'), 0, .02, 0, 0, 0, 0, [1, .85, 1.1]); put(g, lat([[.14, 0], [.17, -.004], [.172, .004], [.15, .012]], 28), mat(c, 'metallo'), 0, .02, 0, 0, 0, 0, [1, 1, 1.1]); put(g, tubo([[-.13, .02, 0], [-.08, -.04, .02], [.08, -.04, .02], [.13, .02, 0]], .006, 20, 5), mat('#5a4a2a', 'tessuto')); return g; }
    if (k === 'passamontagna') { put(g, sfe(.1, 20, 14), mat(c, 'tessuto'), 0, .09, 0, 0, 0, 0, [1, 1.1, 1]); put(g, rbox(.11, .03, .02, .012), mat('#1a1a1a', 'opaco'), 0, .1, .095); put(g, rbox(.04, .02, .02, .008), mat('#1a1a1a', 'opaco'), 0, .05, .095); put(g, cyl(.1, .11, .04, 20), mat(c, 'tessuto'), 0, .01, 0); return g; }
    if (k === 'coppola') { put(g, sfe(.11, 22, 10, 0, PI * 2, 0, PI / 2), mat(c, 'tessuto'), 0, 0, 0, 0, 0, 0, [1, .45, 1.1]); put(g, sfe(.11, 18, 6, -PI / 2.6, PI / 1.3, PI / 2, .25), mat(shade(c, .9), 'tessuto'), 0, .01, .02, 0, 0, 0, [1, .5, 1.4]); put(g, cyl(.006, .006, .004, 10), mat(c, 'tessuto'), 0, .05, 0); return g; }
    put(g, sfe(.1, 22, 12, 0, PI * 2, 0, PI / 2), mat(c, 'tessuto'), 0, .03, 0, 0, 0, 0, [1, 1.1, 1]);
    put(g, cyl(.102, .104, .05, 24), mat(shade(c, .8), 'tessuto'), 0, .025, 0);
    for (let i = 0; i < 24; i++) put(g, box(.006, .048, .004), mat(shade(c, .7), 'tessuto'), Math.cos(i / 24 * PI * 2) * .104, .025, Math.sin(i / 24 * PI * 2) * .104, 0, -i / 24 * PI * 2, 0);
    put(g, sfe(.03, 10, 8), mat(o.pompon || shade(c, 1.25), 'tessuto'), 0, .15, 0);
    return g;
  };
  P.berretto = { how: 'pugno' };
  // la sciarpa arrotolata a righe
  M.sciarpa = o => { const g = G(), c = o.c || '#a83a3a', c2 = o.c2 || '#e8d8b0'; for (let i = 0; i < 6; i++) put(g, cyl(.05 - i * .004, .05 - i * .004, .04, 18), mat(i % 2 ? c2 : c, 'tessuto'), (i - 2.5) * .04, .05, 0, 0, 0, PI / 2); put(g, rbox(.04, .006, .18, .003), mat(c, 'tessuto'), .14, .003, .1); for (let i = 0; i < 6; i++) put(g, box(.003, .002, .02), mat(c, 'tessuto'), .125 + i * .006, .003, .2); return g; };
  P.sciarpa = { how: 'pugno' };
  // lo zaino militare
  M.zaino = o => {
    const g = G(), c = o.c || '#5a6a3a', m = mat(c, 'tessuto');
    put(g, rbox(.34, .44, .18, .05), m, 0, .22, 0);
    put(g, rbox(.35, .16, .2, .04), mat(shade(c, .85), 'tessuto'), 0, .4, .01);   // la patta
    put(g, rbox(.22, .16, .07, .025), mat(shade(c, .92), 'tessuto'), 0, .17, .11);
    [-.06, .06].forEach(x => { put(g, box(.025, .14, .006), mat(shade(c, .6), 'tessuto'), x, .38, .112); put(g, rbox(.03, .02, .01, .003), mat('#c8a040', 'ottone'), x, .32, .115); });
    [-1, 1].forEach(s => put(g, tubo([[s * .08, .43, -.09], [s * .1, .36, -.13], [s * .12, .12, -.12], [s * .1, .03, -.09]], .012, 20, 5), mat(shade(c, .7), 'tessuto')));
    put(g, tor(.035, .008, PI, 6, 12), mat(shade(c, .7), 'tessuto'), 0, .44, -.04);
    g.userData.manico = [0, .475, -.04]; return g;
  };
  P.zaino = { how: 'appeso' };
  // la coperta (o le lenzuola) piegata: o.c, o.quadri
  M.coperta = o => {
    const g = G(), c = o.c || '#7a3a2a';
    const q = o.quadri ? disegno('quadri' + c, 64, 64, (x) => { x.fillStyle = c; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 64; i += 16) { x.fillRect(i, 0, 6, 64); x.fillRect(0, i, 64, 6); } x.fillStyle = 'rgba(255,240,200,.25)'; for (let i = 8; i < 64; i += 16) { x.fillRect(i, 0, 2, 64); x.fillRect(0, i, 64, 2); } }) : null;
    for (let i = 0; i < 4; i++) put(g, rbox(.4, .03, .3, .013), mat(c, 'tessuto', q), i * .003, .015 + i * .03, 0);
    return g;
  };
  P.coperta = { how: 'regge', w: .4, d: .3 };
  // il rotolo di stoffa sull'anima di cartone
  M.stoffa = o => M.rotolo({ k: 'stoffa', c: o.c || '#8a5a6a', R: .07, L: .55 });
  P.stoffa = { how: 'regge', w: .55, d: .2 };
  // i gomitoli di lana nel cestino
  M.gomitoli = o => { const g = G(); ['#c84a6a', '#e8d8b0', '#4a6a9a', '#7a9a4a'].forEach((c, i) => { const x = (i % 2 - .5) * .09, z = (Math.floor(i / 2) - .5) * .09; put(g, sfe(.045, 16, 12), mat(c, 'tessuto'), x, .045 + (i === 3 ? .04 : 0), z); for (let j = 0; j < 4; j++) put(g, tor(.045, .0025, PI * .8, 4, 16), mat(shade(c, .8), 'tessuto'), x, .045 + (i === 3 ? .04 : 0), z, j * .8, j * 1.3, 0); }); return g; };
  P.gomitoli = { how: 'regge', w: .2, d: .2 };
  // la pelle conciata arrotolata
  M.pelle = o => { const g = G(); put(g, cyl(.06, .06, .4, 20), mat('#8a5a32', 'opaco'), 0, .06, 0, 0, 0, PI / 2); put(g, ext([[0, 0], [.18, .02], [.25, .1], [.2, .2], [0, .22]], .004, .002), mat('#8a5a32', 'opaco'), -.2, .002, .06, -PI / 2); put(g, tor(.062, .004, 0, 5, 20), mat('#3a2a1a', 'tessuto'), .1, .06, 0, 0, PI / 2, 0); return g; };
  P.pelle = { how: 'regge', w: .4, d: .2 };
  // le calze di nylon nella bustina
  M.calze = o => { const g = G(); put(g, rbox(.14, .006, .2, .002), mat('#e8dcc8', 'cartone'), 0, .003, 0); put(g, box(.14, .008, .2), mat('#e8f0ee', 'vetro'), 0, .007, 0); put(g, ext([[-.03, .08], [.02, .08], [.03, -.05], [.06, -.08], [.0, -.09], [-.03, -.04]], .004, .002), mat('#c8946a', 'tessuto'), 0, .008, 0, PI / 2); decal(g, etichetta({ bg: 'rgba(0,0,0,0)', fg: '#c83a2a', testo: 'NYLON', w: 256, h: 64 }), .1, .025, 0, .0115, -.07, 0, -PI / 2); return g; };
  P.calze = { how: 'piatto' };
  // la maschera antigas
  M.maschera_gas = o => {
    const g = G(), c = o.c || '#3a4a3a';
    put(g, sfe(.1, 20, 14, 0, PI * 2, 0, PI * .6), mat(c, 'gomma'), 0, .1, 0, -PI / 2, 0, 0, [1, 1.2, .8]);
    [-1, 1].forEach(s => { put(g, cyl(.028, .028, .012, 20), mat('#2a2a2e', 'metallo'), s * .04, .13, .07, PI / 2 - .2); put(g, cyl(.024, .024, .002, 20), mat('#6a8a8a', 'vetroS'), s * .04, .131, .077, PI / 2 - .2); });
    put(g, cyl(.04, .045, .07, 20), mat('#4a5a4a', 'metallo'), 0, .05, .1, PI / 2 + .5);
    for (let i = 0; i < 4; i++) put(g, tor(.042, .002, 0, 4, 18), mat('#3a4a3a', 'metallo'), 0, .05 + i * .007, .095 + i * .012, PI / 2 + .5);
    put(g, tubo([[-.09, .12, -.02], [-.07, .2, -.08], [.07, .2, -.08], [.09, .12, -.02]], .006, 20, 5), mat('#2a2a2e', 'gomma'));
    return g;
  };
  P.maschera_gas = { how: 'pugno' };
  // la manciata di bottoni (scatolina minuteria)
  M.bottoni = o => M.minuteria({ k: 'bottoni', c: '#e8d8b0' });
  P.bottoni = { how: 'pugno' };

  // ---------------- arredi ----------------
  M.sedia = o => {
    const g = G(), c = o.c || '#8a5a32', L = mat(c, 'legno', venatura(c));
    put(g, rbox(.42, .03, .4, .006), L, 0, .45, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => put(g, cyl(.016, .013, .45, 10), L, a * .18, .225, b * .17));
    [-1, 1].forEach(a => { put(g, cyl(.016, .016, .45, 10), L, a * .18, .67, -.18); asta(g, [a * .18, .15, -.17], [a * .18, .15, .17], .008, L); });
    for (let i = 0; i < 3; i++) put(g, rbox(.34, .04, .015, .004), L, 0, .6 + i * .1, -.18);
    return g;
  };
  P.sedia = { how: 'appeso', manico: [0, .88, -.18] };   // per lo schienale, lungo la gamba
  M.tavolo = o => { const g = G(), c = o.c || '#8a5a32', L = mat(c, 'legno', venatura(c)); put(g, rbox(.9, .035, .6, .006), L, 0, .74, 0); put(g, rbox(.82, .07, .52, .004), L, 0, .69, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => put(g, rbox(.045, .7, .045, .006), L, a * .4, .35, b * .26)); return g; };
  P.tavolo = { how: 'regge', w: .6, d: .4 };
  M.branda = o => { const g = G(), c = o.c || '#4a5a3a', F = mat('#5a5e64', 'metallo'); put(g, rbox(1.8, .02, .7, .01), mat(c, 'tessuto'), 0, .4, 0); [-1, 1].forEach(s => put(g, cyl(.015, .015, 1.85, 10), F, 0, .4, s * .36, 0, 0, PI / 2)); [-.8, 0, .8].forEach(x => [-1, 1].forEach(s => { asta(g, [x - .15, 0, s * .36], [x + .15, .4, s * .36], .012, F); asta(g, [x + .15, 0, s * .36], [x - .15, .4, s * .36], .012, F); })); return g; };
  P.branda = { how: 'regge', w: .6, d: .3 };
  // il materasso arrotolato e legato
  M.materasso = o => { const g = G(); const tx = disegno('materasso', 64, 64, (x) => { x.fillStyle = '#e8e0cc'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#6a8ab0'; for (let i = 0; i < 64; i += 8) x.fillRect(i, 0, 3, 64); }); tx.repeat.set(3, 1); put(g, cyl(.22, .22, .9, 28), mat('#ffffff', 'tessuto', tx), 0, .22, 0, 0, 0, PI / 2); [-1, 1].forEach(s => { put(g, cyl(.215, .215, .002, 28), mat('#d8d0bc', 'tessuto'), s * .451, .22, 0, 0, 0, PI / 2); for (let j = 1; j < 5; j++) put(g, tor(.22 * j / 5, .003, 0, 3, 28), mat('#c8c0ac', 'tessuto'), s * .452, .22, 0, 0, PI / 2, 0); put(g, tor(.225, .008, 0, 5, 28), mat('#8a6a3a', 'tessuto'), s * .25, .22, 0, 0, PI / 2, 0); }); return g; };
  P.materasso = { how: 'regge', w: .5, d: .44 };
  M.scaffale = o => { const g = G(), F = mat(o.c || '#7a7e86', 'metallo'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => put(g, ext([[-.02, -.02], [.02, -.02], [.02, -.016], [-.016, -.016], [-.016, .02], [-.02, .02]], 1.6, 0), F, a * .44, .8, b * .17, PI / 2, 0, a * b > 0 ? 0 : PI / 2)); for (let i = 0; i < 5; i++) put(g, rbox(.9, .02, .36, .004), F, 0, .05 + i * .38, 0); return g; };
  P.scaffale = { how: 'regge', w: .6, d: .3 };
  // la cassa di legno a doghe (casse, merce)
  M.cassa_legno = o => {
    const g = G(), c = o.c || '#b8905a', L = mat(c, 'legno', venatura(c)), w = o.w || .6, h = o.h || .4, d = o.d || .4;
    for (let i = 0; i < 4; i++) { const y = h / 8 + i * h / 4; put(g, rbox(w, h / 4 - .008, .018, .003), L, 0, y, d / 2 - .009); put(g, rbox(w, h / 4 - .008, .018, .003), L, 0, y, -d / 2 + .009); put(g, rbox(.018, h / 4 - .008, d - .036, .003), L, w / 2 - .009, y, 0); put(g, rbox(.018, h / 4 - .008, d - .036, .003), L, -w / 2 + .009, y, 0); }
    for (let i = 0; i < 5; i++) put(g, rbox(w / 5 - .006, .018, d, .003), L, -w / 2 + w / 10 + i * w / 5, h, 0);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([a, b]) => put(g, rbox(.045, h, .045, .004), mat(shade(c, .8), 'legno'), a * (w / 2 - .02), h / 2, b * (d / 2 - .02)));
    if (o.stampa) decal(g, etichetta({ bg: 'rgba(0,0,0,0)', fg: '#2a2a2a', testo: o.stampa, sub: o.sub || 'FRAGILE', bordo: '#2a2a2a', w: 256, h: 128 }), w * .6, h * .5, 0, h / 2, d / 2 + .0005);
    return g;
  };
  P.cassa_legno = { how: 'regge', w: .6, d: .4 };
  // la barricata: assi inchiodate a croce su due cavalletti
  M.barricata = o => { const g = G(), L = mat('#8a6a42', 'legno', venatura('#8a6a42')); [-.4, .4].forEach(x => { asta(g, [x - .15, 0, -.2], [x, .9, 0], .03, L); asta(g, [x + .15, 0, -.2], [x, .9, 0], .03, L); asta(g, [x, 0, .25], [x, .9, 0], .03, L); }); [.3, .55, .8].forEach(y => put(g, rbox(1.2, .1, .03, .004), L, 0, y, .02)); put(g, rbox(1.3, .1, .03, .004), L, 0, .55, .05, 0, 0, .5); return g; };
  P.barricata = { how: 'regge', w: .6, d: .3 };
  // la porta rinforzata con la lamiera e le spranghe
  M.porta = o => { const g = G(); put(g, rbox(.8, 2, .05, .006), mat('#7a5a3a', 'legno', venatura('#7a5a3a')), 0, 1, 0); put(g, rbox(.76, 1.94, .006, .002), mat('#7a7e7a', 'metallo'), 0, 1, .028); for (let i = 0; i < 40; i++) put(g, sfe(.006, 6, 4), mat('#4a4c50', 'acciaio'), -.36 + (i % 10) * .08, .1 + Math.floor(i / 10) * .6, .032); [.5, 1.5].forEach(y => put(g, rbox(.84, .08, .03, .004), mat('#3a3c40', 'ghisa'), 0, y, .045)); put(g, cyl(.02, .02, .05, 12), mat('#c8a040', 'ottone'), .3, 1, .06, PI / 2); return g; };
  P.porta = { how: 'regge', w: .8, d: .1 };
  // la botola con l'anello
  M.botola = o => { const g = G(); put(g, rbox(.7, .04, .7, .006), mat('#6a4a2a', 'legno', venatura('#6a4a2a')), 0, .02, 0); [-.2, .2].forEach(z => put(g, rbox(.72, .01, .06, .003), mat('#3a3c40', 'ghisa'), 0, .045, z)); put(g, tor(.04, .006, 0, 6, 16), mat('#3a3c40', 'ghisa'), .25, .046, 0, PI / 2); return g; };
  P.botola = { how: 'regge', w: .7, d: .1 };
  // la lampada da tavolo a braccio
  M.lampada = o => { const g = G(), c = o.c || '#2a5a3a', m = mat(c, 'metallo'); put(g, cyl(.07, .08, .02, 22), m, 0, .01, 0); asta(g, [0, .02, 0], [.05, .25, 0], .006, m); asta(g, [.05, .25, 0], [.16, .33, 0], .006, m); put(g, sfe(.012, 10, 8), m, .05, .25, 0); put(g, lat([[0, 0], [.02, 0], [.06, .08], [.064, .085]], 20), m, .17, .3, 0, 0, 0, PI * .85); put(g, sfe(.025, 12, 8), mat('#fff4c8', 'luce'), .19, .26, 0); return g; };
  P.lampada = { how: 'regge', w: .2, d: .16 };
  // la stufetta elettrica a resistenze col riflettore
  M.stufetta = o => { const g = G(); put(g, rbox(.38, .3, .14, .02), mat('#c8b890', 'metallo'), 0, .17, 0); put(g, rbox(.32, .22, .004, .01), mat('#d8dcdc', 'cromo'), 0, .19, .066); [.15, .23].forEach(y => put(g, cyl(.012, .012, .3, 14), mat('#ff7a3a', 'luce'), 0, y, .08, 0, 0, PI / 2)); for (let i = 0; i < 12; i++) put(g, cyl(.002, .002, .24, 4), mat('#c8ccd4', 'cromo'), -.15 + i * .027, .19, .1); [-1, 1].forEach(s => put(g, rbox(.04, .02, .2, .006), mat('#5a5040', 'metallo'), s * .15, .01, 0)); return g; };
  P.stufetta = { how: 'regge', w: .4, d: .2 };
  // il fornello da campo a una piastra con la cartuccia
  M.fornello = o => { const g = G(); put(g, rbox(.3, .08, .24, .012), mat('#c83a2a', 'metallo'), 0, .04, 0); put(g, cyl(.08, .08, .012, 24), mat('#2a2a2e', 'ghisa'), 0, .086, 0); for (let i = 0; i < 4; i++) put(g, rbox(.2, .01, .012, .002), mat('#2a2a2e', 'ghisa'), 0, .1, 0, 0, i * PI / 4, 0); put(g, cyl(.012, .012, .02, 12), mat('#1a1a1e', 'plastica'), .11, .05, .12, PI / 2); return g; };
  P.fornello = { how: 'regge', w: .3, d: .24 };

  // ---------------- armi ----------------
  // la scatola delle cartucce aperta
  M.munizioni = o => { const g = G(), c = o.c || '#4a5a3a'; put(g, rbox(.12, .045, .08, .004), mat(c, 'metallo'), 0, .0225, 0); const cop = put(g, rbox(.12, .006, .08, .003), mat(c, 'metallo'), 0, .07, -.07, -1.2); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = -.044 + i * .022, z = -.022 + j * .022; put(g, cyl(.008, .008, .035, 12), mat('#c8902a', 'ottone'), x, .045 + .01, z); put(g, sfe(.008, 10, 6, 0, PI * 2, 0, PI / 2), mat('#a86a3a', 'ottone'), x, .0725, z, 0, 0, 0, [1, 1.4, 1]); } decal(g, etichetta({ bg: c, fg: '#e8d8a0', testo: '9 mm', bordo: '#e8d8a0', w: 256, h: 96 }), .1, .035, 0, .0225, .0405); return g; };
  P.munizioni = { how: 'pugno' };
  // la molotov: bottiglia con lo straccio infilato
  M.molotov = o => { const g = M.bottiglia({ forma: 'vino', c: '#3a5a2a', liq: '#c8a040', et: false }); put(g, tubo([[0, .33, 0], [.01, .38, .01], [-.01, .42, 0], [.02, .45, .02]], .009, 14, 6), mat('#e8dcc0', 'tessuto')); put(g, tor(.016, .004, 0, 5, 12), mat('#8a6a3a', 'tessuto'), 0, .33, 0, PI / 2); return g; };
  P.molotov = { how: 'pugno' };
  // il candelotto di dinamite con la miccia (un mazzo di tre col nastro)
  M.candelotto = o => { const g = G(); for (let i = 0; i < 3; i++) { const x = (i - 1) * .032; put(g, cyl(.016, .016, .2, 16), mat('#c83a2a', 'carta'), x, .016, 0, PI / 2); } put(g, rbox(.1, .036, .04, .01), mat('#1a1a1e', 'lucido'), 0, .016, 0); put(g, tubo([[0, .02, .1], [.01, .04, .13], [-.02, .05, .16], [.0, .035, .19]], .002, 14, 4), mat('#3a3a3a', 'tessuto')); return g; };
  P.candelotto = { how: 'pugno' };
  // i triboli (chiodi a tre punte)
  M.triboli = o => { const g = G(), A = mat('#5a5e64', 'acciaio'), r = rng(2); for (let i = 0; i < 5; i++) { const s = G(); s.position.set((r() - .5) * .14, .014, (r() - .5) * .14); s.rotation.y = r() * PI; g.add(s); [[0, 1, 0], [.94, -.33, 0], [-.47, -.33, .82], [-.47, -.33, -.82]].forEach(d => asta(s, [0, 0, 0], [d[0] * .025, d[1] * .025, d[2] * .025], .0025, A, 6)); } return g; };
  P.triboli = { how: 'pugno' };
  // il kit di sabotaggio: rotolino di nastro, filo, cronometro, pinze in un astuccio
  M.kit_sabotaggio = o => { const g = G(); put(g, rbox(.22, .04, .14, .01), mat('#3a3a2a', 'tessuto'), 0, .02, 0); const c = M.scatola_el({ display: '00:59', c: '#2a2a2e' }); c.scale.setScalar(.6); c.position.set(-.04, .04, 0); g.add(c); const r = M.rotolino({ c: '#1a1a1e' }); r.position.set(.07, .04, .04); g.add(r); const m = M.matassa({ c: '#c83a2a', kind: 'gomma', r: .002, legata: false }); m.scale.setScalar(.35); m.position.set(.06, .04, -.03); g.add(m); return g; };
  P.kit_sabotaggio = { how: 'piatto' };
  // le manette
  M.manette = o => { const g = G(), A = mat('#c8ccd4', 'cromo'); [-1, 1].forEach(s => { put(g, tor(.032, .005, PI * 1.6, 6, 20), A, s * .05, .006, 0, PI / 2, 0, s * .3); put(g, rbox(.022, .01, .016, .003), A, s * .025, .006, 0); }); for (let i = 0; i < 3; i++) put(g, tor(.005, .0015, 0, 4, 10), A, -.007 + i * .007, .006, 0, 0, i % 2 ? PI / 2 : 0, 0, [1.5, 1, 1]); return g; };
  P.manette = { how: 'pugno' };
  // la fionda: forcella di legno, elastico, tasca di cuoio
  M.fionda = o => { const g = G(), L = mat('#8a5a32', 'legno'); put(g, tubo([[0, 0, 0], [0, .08, 0], [-.01, .1, 0], [-.04, .16, 0]], .008, 14, 8), L); put(g, tubo([[0, .08, 0], [.01, .1, 0], [.04, .16, 0]], .008, 12, 8), L); put(g, tubo([[-.04, .155, 0], [-.02, .12, .05], [0, .1, .08]], .002, 10, 4), mat('#c8905a', 'gomma')); put(g, tubo([[.04, .155, 0], [.02, .12, .05], [0, .1, .08]], .002, 10, 4), mat('#c8905a', 'gomma')); put(g, rbox(.025, .015, .006, .004), mat('#5a3a22', 'opaco'), 0, .1, .083); g.userData.grip = .04; return g; };
  P.fionda = { how: 'pugno' };
  // la mazza da baseball
  M.mazza_baseball = o => { const g = G(); put(g, lat([[0, 0], [.022, 0], [.024, .008], [.014, .016], [.014, .25], [.024, .5], [.033, .74], [.032, .8], [.02, .815], [0, .82]], 22), mat(o.c || '#c89a5a', 'legno', venatura(o.c || '#c89a5a'))); put(g, cyl(.0145, .0145, .2, 18), mat('#1a1a1e', 'gomma'), 0, .12, 0); g.userData.grip = .1; g.userData.diag = true; return g; };
  P.mazza_baseball = { how: 'lungo' };
  // il tirapugni
  M.tirapugni = o => { const g = G(); put(g, ext(rrect(-.05, 0, .05, .04, .012), .008, .002, [{ x: -.035, y: .026, r: .01 }, { x: -.012, y: .026, r: .01 }, { x: .012, y: .026, r: .01 }, { x: .035, y: .026, r: .01 }]), mat('#c8ccd4', 'cromo'), 0, .004, 0, -PI / 2); put(g, ext([[-.04, 0], [.04, 0], [.03, -.025], [-.03, -.025]], .008, .003), mat('#c8ccd4', 'cromo'), 0, .004, .0, -PI / 2); return g; };
  P.tirapugni = { how: 'pugno' };
  // il fumogeno e i petardi
  M.fumogeno = o => { const g = G(); put(g, cyl(.03, .03, .14, 20), mat('#5a6a5a', 'metallo'), 0, .07, 0); put(g, cyl(.031, .031, .03, 20), mat('#e8c040', 'metallo'), 0, .12, 0); put(g, cyl(.012, .012, .02, 12), mat('#3a3a3e', 'metallo'), 0, .15, 0); put(g, tor(.012, .002, 0, 5, 12), mat('#c8ccd4', 'cromo'), .02, .155, 0, 0, PI / 2, 0); asta(g, [.008, .16, 0], [.03, .07, 0], .003, mat('#5a5e64', 'metallo')); g.userData.grip = .06; return g; };
  P.fumogeno = { how: 'pugno' };
  M.petardi = o => { const g = G(); for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * .02, z = Math.floor(i / 3) * .02 - .01; put(g, cyl(.008, .008, .07, 12), mat(i % 2 ? '#c83a2a' : '#e8c040', 'carta'), x, .035, z); put(g, cyl(.001, .001, .02, 4), mat('#3a3a3a', 'tessuto'), x, .08, z, .3); } put(g, cyl(.034, .034, .02, 18, true), mat('#e8dcc0', 'carta'), 0, .03, 0); return g; };
  P.petardi = { how: 'pugno' };
  // il moschetto (fucile vecchio a otturatore)
  M.moschetto = o => { const g = G(), W = mat('#7a4a2a', 'legno', venatura('#7a4a2a')), B = mat('#2a2c32', 'ghisa'); put(g, ext([[-.45, -.06], [-.4, -.07], [-.1, -.02], [.0, -.03], [.4, -.01], [.4, .01], [.0, .015], [-.1, .02], [-.4, .02], [-.45, .0]], .04, .005), W, 0, .07, 0); put(g, cyl(.009, .009, .8, 12), B, .3, .1, 0, 0, 0, PI / 2); put(g, rbox(.12, .025, .03, .005), B, -.05, .1, 0); asta(g, [-.04, .11, .015], [-.04, .1, .05], .004, B); put(g, sfe(.008, 8, 6), B, -.04, .1, .052); put(g, tor(.014, .002, PI, 5, 12), B, -.1, .05, 0, 0, 0, PI); put(g, tubo([[.2, .06, .022], [-.1, .02, .03], [-.4, .03, .024]], .004, 14, 4), mat('#5a3a22', 'tessuto')); return g; };
  P.moschetto = { how: 'lungo' };

  // ---------------- valori e contrabbando ----------------
  // il pacchetto di sigarette (o la stecca): o.c, o.stecca
  M.sigarette = o => {
    const g = G(), c = o.c || '#c83a2a';
    const t = disegno('sig' + c, 128, 192, (x) => { x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, 128, 192); x.fillStyle = c; x.beginPath(); x.moveTo(0, 70); x.lineTo(64, 40); x.lineTo(128, 70); x.lineTo(128, 0); x.lineTo(0, 0); x.fill(); x.fillStyle = '#1a1a1a'; x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.fillText(o.testo || 'NAZIONALI', 64, 120); x.font = '10px Arial'; x.fillText('20 sigarette', 64, 140); });
    if (o.stecca) { for (let i = 0; i < 5; i++) { put(g, rbox(.055, .088, .024, .002), mat('#f4f0e6', 'cartone'), (i - 2) * .056, .044, 0); decal(g, t, .054, .086, (i - 2) * .056, .044, .0122); } put(g, box(.285, .09, .026), mat('#f4f0e6', 'vetro'), 0, .045, 0); return g; }
    put(g, rbox(.055, .088, .024, .002), mat('#f4f0e6', 'cartone'), 0, .044, 0); decal(g, t, .054, .086, 0, .044, .0122);
    const cop = put(g, rbox(.056, .022, .025, .002), mat(c, 'cartone'), 0, .095, -.01, -.8);
    for (let i = 0; i < 3; i++) { put(g, cyl(.004, .004, .03, 8), mat('#f4f0e6', 'carta'), -.012 + i * .012, .095, .004); put(g, cyl(.0041, .0041, .01, 8), mat('#d8a050', 'carta'), -.012 + i * .012, .085, .004); }
    return g;
  };
  P.sigarette = { how: 'pugno' };
  // la busta del tabacco con le cartine
  M.tabacco = o => { const g = G(); put(g, rbox(.12, .02, .09, .008), mat('#3a5a3a', 'opaco'), 0, .01, 0); put(g, rbox(.12, .004, .05, .002), mat('#2a4a2a', 'opaco'), 0, .022, .02, -.15); decal(g, etichetta({ bg: '#3a5a3a', fg: '#e8c860', testo: 'TRINCIATO', w: 256, h: 96 }), .1, .035, 0, .0205, -.02, 0, -PI / 2); put(g, rbox(.045, .006, .03, .001), mat('#e8a040', 'cartone'), .08, .003, .05, 0, .3, 0); return g; };
  P.tabacco = { how: 'piatto' };
  // il mazzo di carte da gioco (napoletane) con una carta girata
  M.carte = o => {
    const g = G(); put(g, rbox(.058, .02, .1, .003), mat('#f2ead8', 'carta'), 0, .01, 0);
    const dorso = disegno('dorso', 64, 96, (x) => { x.fillStyle = '#2a4a8a'; x.fillRect(0, 0, 64, 96); x.strokeStyle = '#e8d8b0'; x.lineWidth = 2; x.strokeRect(4, 4, 56, 88); for (let i = 0; i < 96; i += 8) { x.beginPath(); x.moveTo(4, i); x.lineTo(60, i + 8); x.stroke(); } });
    put(g, pia(.058, .1), mat('#ffffff', 'carta', dorso), 0, .0202, 0, -PI / 2);
    const fr = disegno('asso', 64, 96, (x) => { x.fillStyle = '#f2ead8'; x.fillRect(0, 0, 64, 96); x.fillStyle = '#c8a020'; x.beginPath(); x.arc(32, 48, 18, 0, PI * 2); x.fill(); x.fillStyle = '#c83a2a'; x.beginPath(); x.arc(32, 48, 9, 0, PI * 2); x.fill(); x.fillStyle = '#1a1a1a'; x.font = 'bold 12px serif'; x.fillText('1', 6, 16); });
    put(g, box(.058, .001, .1), mat('#f2ead8', 'carta'), .05, .0005, .02, 0, .4, 0); put(g, pia(.058, .1), mat('#ffffff', 'carta', fr), .05, .0012, .02, -PI / 2, 0, .4);
    return g;
  };
  P.carte = { how: 'pugno' };
  // l'orologio da polso: cassa, quadrante con le lancette, cinturino
  M.orologio = o => {
    const g = G(), O = mat(o.c || '#c8a848', 'ottone');
    put(g, lat([[0, 0], [.018, 0], [.02, .004], [.02, .009], [.017, .011], [0, .011]], 26), O, 0, .008, 0);
    const q = disegno('quadrante_or', 64, 64, (x) => { x.fillStyle = '#f4efe2'; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); x.fillStyle = '#1a1a1a'; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; x.fillRect(32 + Math.cos(a) * 24 - 1, 32 + Math.sin(a) * 24 - 1, 3, 3); } x.lineWidth = 3; x.strokeStyle = '#1a1a1a'; x.beginPath(); x.moveTo(32, 32); x.lineTo(32, 14); x.moveTo(32, 32); x.lineTo(46, 38); x.stroke(); });
    put(g, cyl(.016, .016, .001, 26), mat('#ffffff', 'carta', q), 0, .0195, 0);
    put(g, cyl(.017, .017, .002, 26), mat('#e8f0ee', 'vetro'), 0, .0205, 0);
    put(g, cyl(.003, .003, .006, 10), O, .022, .014, 0, 0, 0, PI / 2);
    [-1, 1].forEach(s => put(g, tubo([[0, .012, s * .018], [0, .012, s * .04], [0, .006, s * .065], [0, .002, s * .08]], .0016, 14, 4), mat('#5a3a22', 'opaco'), 0, 0, 0, 0, 0, 0, [7, 1, 1]));
    return g;
  };
  P.orologio = { how: 'pugno' };
  // il portagioie aperto con collane e anelli
  M.portagioie = o => { const g = G(), c = o.c || '#6a2a3a'; put(g, rbox(.14, .05, .1, .006), mat(c, 'legno'), 0, .025, 0); put(g, rbox(.13, .004, .09, .002), mat('#8a1a2a', 'tessuto'), 0, .049, 0); put(g, rbox(.14, .03, .1, .006), mat(c, 'legno'), 0, .1, -.07, -1.2); for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; put(g, sfe(.004, 6, 4), mat(i % 3 ? '#e0c060' : '#f4f0f0', 'ottone'), Math.cos(a) * .045, .053 + Math.sin(a * 2) * .004, Math.sin(a) * .03); } put(g, tor(.01, .0025, 0, 6, 16), mat('#e0c060', 'ottone'), .045, .06, .025, PI / 2 - .4); put(g, new T.OctahedronGeometry(.005), mat('#8ad0e8', 'vetroS'), .045, .072, .025); return g; };
  P.portagioie = { how: 'pugno' };
  // l'anello d'oro con la pietra
  M.anello = o => { const g = G(); put(g, tor(.012, .0025, 0, 8, 24), mat('#e0c060', 'ottone'), 0, .012, 0); put(g, cyl(.004, .005, .004, 8), mat('#e0c060', 'ottone'), 0, .025, 0); put(g, new T.OctahedronGeometry(.005), mat(o.pietra || '#c82a3a', 'vetroS'), 0, .03, 0); return g; };
  P.anello = { how: 'pugno' };
  // la mazzetta di banconote con la fascetta
  M.banconote = o => { const g = G(), c = o.c || '#5a8a5a'; const b = disegno('banconota' + c, 128, 64, (x) => { x.fillStyle = mix(c, '#f2ead8', .5); x.fillRect(0, 0, 128, 64); x.strokeStyle = c; x.lineWidth = 3; x.strokeRect(4, 4, 120, 56); x.fillStyle = c; x.beginPath(); x.arc(90, 32, 16, 0, PI * 2); x.fill(); x.font = 'bold 18px serif'; x.fillText(o.testo || '100', 14, 40); }); for (let i = 0; i < 4; i++) put(g, box(.15, .004, .07), mat(mix(c, '#f2ead8', .5), 'carta'), (i % 2) * .004, .002 + i * .004, 0, 0, (i - 2) * .03, 0); put(g, pia(.15, .07), mat('#ffffff', 'carta', b), .004, .0162, 0, -PI / 2, 0, .03); put(g, box(.03, .018, .074), mat('#e8dcc0', 'carta'), 0, .008, 0); return g; };
  P.banconote = { how: 'piatto' };
  // le posate d'argento legate col nastro
  M.posate = o => { const g = G(), A = mat('#d8dce4', 'cromo'); [-1, 0, 1].forEach((s, i) => { put(g, rbox(.014, .003, .14, .002), A, s * .02, .004, 0); if (i === 0) put(g, sfe(.016, 12, 8), A, s * .02, .004, .08, 0, 0, 0, [1, .25, 1.3]); if (i === 1) for (let k = 0; k < 4; k++) put(g, box(.002, .002, .035), A, s * .02 - .006 + k * .004, .004, .085); if (i === 2) put(g, ext([[-.008, 0], [.008, 0], [.006, .07], [-.008, .06]], .002, 0), A, s * .02, .004, .07, -PI / 2); }); put(g, box(.08, .006, .02), mat('#2a4a8a', 'tessuto'), 0, .006, -.02); return g; };
  P.posate = { how: 'piatto' };
  // il quadro con la cornice dorata
  M.quadro = o => { const g = G(); const tela = disegno('quadro', 128, 96, (x) => { const gr = x.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, '#e8b070'); gr.addColorStop(.6, '#c86a5a'); gr.addColorStop(.61, '#3a5a7a'); gr.addColorStop(1, '#2a3a5a'); x.fillStyle = gr; x.fillRect(0, 0, 128, 96); x.fillStyle = '#1a1a2a'; x.beginPath(); x.moveTo(20, 60); x.lineTo(40, 30); x.lineTo(60, 60); x.fill(); x.fillStyle = '#f2e0a0'; x.beginPath(); x.arc(96, 40, 10, 0, PI * 2); x.fill(); }); put(g, box(.4, .3, .01), mat('#ffffff', 'opaco', tela), 0, .17, 0); [[0, .33, .46, .04], [0, .01, .46, .04], [-.21, .17, .04, .36], [.21, .17, .04, .36]].forEach(([x, y, w, h]) => put(g, rbox(w, h, .03, .008), mat('#c8a040', 'ottone'), x, y, .005)); return g; };
  P.quadro = { how: 'regge', w: .46, d: .1 };
  // l'album dei francobolli aperto
  M.album = o => { const g = G(); put(g, rbox(.2, .02, .28, .004), mat('#3a2a2a', 'opaco'), -.1, .01, 0); put(g, rbox(.2, .02, .28, .004), mat('#3a2a2a', 'opaco'), .1, .01, 0); put(g, box(.38, .004, .26), mat('#f2ead8', 'carta'), 0, .022, 0); const r = rng(5); for (let i = 0; i < 12; i++) put(g, box(.03, .002, .036), mat(['#c83a2a', '#2a5aa8', '#3a7a3a', '#c8a040'][i % 4], 'carta'), -.15 + (i % 6) * .055 + (i % 6 > 2 ? .03 : 0), .025, -.06 + Math.floor(i / 6) * .1); return g; };
  P.album = { how: 'piatto' };
  // i dischi in vinile nella copertina
  M.dischi = o => { const g = G(); const cop = disegno('copertina', 128, 128, (x) => { x.fillStyle = '#1a1a2a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#e84a8a'; x.beginPath(); x.arc(64, 64, 40, 0, PI * 2); x.fill(); x.fillStyle = '#4ae8e8'; x.font = 'bold 18px Arial'; x.textAlign = 'center'; x.fillText('ITALO', 64, 30); x.fillText('DISCO', 64, 112); }); for (let i = 0; i < 3; i++) put(g, rbox(.31, .004, .31, .001), mat(['#1a1a2a', '#c83a2a', '#e8c040'][i], 'cartone'), i * .01, .002 + i * .004, i * .01, 0, i * .08, 0); put(g, pia(.31, .31), mat('#ffffff', 'cartone', cop), .02, .0145, .02, -PI / 2, 0, .16); put(g, cyl(.15, .15, .002, 40), mat('#111114', 'lucido'), .12, .006, -.04); put(g, cyl(.05, .05, .0025, 24), mat('#c83a2a', 'carta'), .12, .006, -.04); return g; };
  P.dischi = { how: 'piatto' };
  // il flacone di profumo sfaccettato
  M.profumo = o => { const g = G(); put(g, cyl(.035, .04, .07, 6), mat(o.c || '#e8a8c8', 'vetroS'), 0, .035, 0); put(g, cyl(.03, .035, .06, 6), mat('#e8c060', 'liquido'), 0, .032, 0); put(g, cyl(.008, .008, .01, 10), mat('#e0c060', 'ottone'), 0, .075, 0); put(g, new T.OctahedronGeometry(.018), mat('#f2e0e8', 'vetroS'), 0, .095, 0, 0, 0, 0, [1, 1.3, .7]); return g; };
  P.profumo = { how: 'pugno' };
  // il fossile (ammonite), l'anfora, la moneta romana, la medaglia
  M.fossile = o => { const g = G(); put(g, new T.DodecahedronGeometry(.07, 0), mat('#b8ab90', 'pietra'), 0, .03, 0, .2, .4, 0, [1.3, .5, 1]); const sp = []; for (let i = 0; i < 60; i++) { const a = i * .25, r = .004 + i * .0009; sp.push([Math.cos(a) * r, .058, Math.sin(a) * r]); } put(g, tubo(sp, .004, 120, 5), mat('#8a7a60', 'pietra')); return g; };
  P.fossile = { how: 'pugno' };
  M.anfora = o => { const g = G(), c = o.c || '#b86a3a'; put(g, lat([[0, 0], [.02, .0], [.06, .08], [.1, .2], [.1, .32], [.07, .42], [.035, .46], [.03, .55], [.04, .57], [.035, .58], [0, .58]], 26), mat(c, 'pietra')); [-1, 1].forEach(s => put(g, tubo([[s * .03, .54, 0], [s * .08, .54, 0], [s * .09, .47, 0], [s * .07, .42, 0]], .012, 14, 6), mat(c, 'pietra'))); put(g, sfe(.04, 8, 6), mat('#8a9a8a', 'pietra'), .06, .25, .07, 0, 0, 0, [1, .5, .3]); return g; };
  P.anfora = { how: 'regge', w: .24, d: .24 };
  M.moneta = o => { const g = G(); const f = disegno('moneta' + (o.c || ''), 64, 64, (x) => { x.fillStyle = o.c || '#a8804a'; x.beginPath(); x.arc(32, 32, 31, 0, PI * 2); x.fill(); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.arc(30, 28, 12, 0, PI * 2); x.fill(); x.fillRect(22, 36, 18, 10); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; x.beginPath(); x.arc(32, 32, 26, 0, PI * 2); x.stroke(); }); for (let i = 0; i < (o.n || 1); i++) { put(g, cyl(.012, .012, .003, 22), mat(o.c || '#a8804a', 'ottone'), i * .018, .0015, (i % 2) * .01); put(g, cyl(.0118, .0118, .0004, 22), mat('#ffffff', 'ottone', f), i * .018, .0032, (i % 2) * .01); } return g; };
  P.moneta = { how: 'pugno' };
  M.medaglia = o => { const g = G(); put(g, rbox(.03, .05, .003, .001), mat('#2a4a8a', 'tessuto'), 0, .06, 0); put(g, box(.008, .05, .0032), mat('#c83a2a', 'tessuto'), 0, .06, 0); put(g, cyl(.02, .02, .004, 24), mat('#c8a040', 'ottone'), 0, .02, 0, PI / 2); put(g, new T.CylinderGeometry(.012, .012, .0045, 5), mat('#e0c060', 'ottone'), 0, .02, .001, PI / 2); return g; };
  P.medaglia = { how: 'pugno' };
  // il fagotto di stoffa annodato (roba, refurtiva)
  M.fagotto = o => { const g = G(), c = o.c || '#8a5a5a'; put(g, sfe(.13, 16, 12), mat(c, 'tessuto'), 0, .1, 0, 0, 0, 0, [1.2, .8, 1]); [[.06, .2, 0, .5], [-.06, .2, 0, -.5]].forEach(([x, y, z, r]) => put(g, new T.ConeGeometry(.04, .1, 8), mat(c, 'tessuto'), x, y, z, 0, 0, r)); put(g, sfe(.03, 10, 8), mat(shade(c, .8), 'tessuto'), 0, .19, 0); const q = disegno('pois' + c, 64, 64, (x) => { x.fillStyle = c; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 64; i += 16) for (let j = 0; j < 64; j += 16) { x.beginPath(); x.arc(i + 8, j + 8, 3, 0, PI * 2); x.fill(); } }); g.children[0].material = mat(c, 'tessuto', q); g.userData.manico = [0, .22, 0]; return g; };
  P.fagotto = { how: 'appeso' };
  // il borsone da ginnastica (refurtiva)
  M.borsone = o => { const g = G(), c = o.c || '#2a3a6a'; put(g, new T.CapsuleGeometry(.14, .3, 8, 20), mat(c, 'tessuto'), 0, .14, 0, 0, 0, PI / 2); put(g, box(.42, .008, .012), mat('#c8ccd4', 'cromo'), 0, .28, 0); [-1, 1].forEach(s => put(g, cyl(.13, .13, .004, 24), mat('#e8e4d8', 'tessuto'), s * .29, .14, 0, 0, 0, PI / 2)); put(g, tubo([[-.12, .26, 0], [-.08, .36, 0], [.08, .36, 0], [.12, .26, 0]], .01, 16, 6), mat(shade(c, .7), 'tessuto')); g.userData.manico = [0, .36, 0]; return g; };
  P.borsone = { how: 'appeso' };
  // lo scatolone di cartone col nastro (merce di contrabbando, razione, cartone)
  M.scatolone = o => {
    const g = G(), w = o.w || .4, h = o.h || .3, d = o.d || .3, c = o.c || '#b8905a';
    const ct = disegno('cartone' + c, 64, 64, (x) => { x.fillStyle = c; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 64; i += 3) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i, 0, 1, 64); } });
    put(g, rbox(w, h, d, .004), mat(c, 'cartone', ct), 0, h / 2, 0);
    put(g, box(w * .2, .002, d + .002), mat('#d8c9a0', 'plastica'), 0, h + .0008, 0);
    put(g, box(w * .2, h * .3, .002), mat('#d8c9a0', 'plastica'), 0, h * .85, d / 2 + .001);
    put(g, box(.002, h - .01, d * .002 + .0005), mat(shade(c, .8), 'cartone'), 0, h / 2, d / 2 + .0006);
    if (o.stampa !== false) decal(g, etichetta(Object.assign({ bg: 'rgba(0,0,0,0)', fg: '#3a2a1a', testo: 'MERCE', sub: 'non capovolgere', bordo: '#3a2a1a', w: 256, h: 128 }, o.et || {})), w * .55, h * .45, -w * .15, h * .45, d / 2 + .0015);
    return g;
  };
  P.scatolone = { how: 'regge' };
  // la tessera (annonaria, del partito): o.c, o.testo
  M.tessera = o => { const g = G(), c = o.c || '#c8b890'; put(g, rbox(.09, .002, .06, .001), mat(c, 'cartone'), 0, .001, 0); decal(g, etichetta({ bg: c, fg: o.fg || '#7a2a1a', testo: o.testo || 'TESSERA', sub: o.sub || 'n. 04127', band: o.band || '#7a2a1a', righe: 3 }), .088, .058, 0, .0022, 0, 0, -PI / 2); return g; };
  P.tessera = { how: 'piatto' };
  // la rivista
  M.rivista = o => { const g = G(); const cop = disegno('rivista' + (o.c || ''), 128, 160, (x) => { x.fillStyle = o.c || '#e84a6a'; x.fillRect(0, 0, 128, 160); x.fillStyle = '#f2f0ea'; x.font = 'bold 28px Arial'; x.textAlign = 'center'; x.fillText(o.testo || 'NOTTE', 64, 34); x.fillStyle = '#d8a890'; x.beginPath(); x.ellipse(64, 100, 30, 44, 0, 0, PI * 2); x.fill(); x.fillStyle = '#1a1a1a'; x.fillRect(10, 140, 60, 6); }); put(g, rbox(.21, .008, .28, .002), mat('#f2ead8', 'carta'), 0, .004, 0); put(g, pia(.21, .28), mat('#ffffff', 'carta', cop), 0, .0085, 0, -PI / 2); return g; };
  P.rivista = { how: 'piatto' };

  // ---------------- rottami ----------------
  M.rottami = o => { const g = G(), r = rng(9); put(g, ext([[-.2, 0], [.18, -.02], [.22, .1], [-.15, .12]], .004, 0), mat('#8a5a3a', 'ruggine'), 0, .05, 0, -PI / 2 + .3, .4, .1); put(g, cyl(.02, .02, .4, 10), mat('#7a7e86', 'ruggine'), .02, .03, .05, 0, .8, PI / 2); put(g, tor(.07, .02, 0, 6, 16), mat('#2a2a2e', 'gomma'), -.12, .02, -.06, PI / 2); put(g, rbox(.12, .06, .08, .01), mat('#5a6a7a', 'metallo'), .1, .05, -.08, .2, .5, .1); for (let i = 0; i < 5; i++) put(g, rbox(.04, .006, .02, .002), mat('#a86a3a', 'ruggine'), (r() - .5) * .3, .01, (r() - .5) * .2, 0, r() * 3, 0); return g; };
  P.rottami = { how: 'regge', w: .4, d: .3 };
  // il televisore (rotto: lo schermo crepato)
  M.tv = o => {
    const g = G(), rotta = o.rotta !== false;
    put(g, rbox(.5, .4, .4, .03), mat('#5a3a22', 'legno', venatura('#5a3a22')), 0, .2, 0);
    put(g, rbox(.34, .28, .02, .03), mat('#2a2a2e', 'plastica'), -.05, .21, .2);
    const sc = disegno('schermo' + rotta, 64, 64, (x) => { x.fillStyle = '#2a3430'; x.fillRect(0, 0, 64, 64); if (rotta) { x.strokeStyle = '#c8d8d0'; x.lineWidth = 1; [[30, 30, 5, 2], [30, 30, 60, 50], [30, 30, 40, 64], [30, 30, 0, 40], [30, 30, 50, 0]].forEach(([a, b, c, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }); } });
    put(g, sfe(.3, 16, 12, -.5, 1, PI / 2 - .4, .8), mat('#ffffff', 'vetroS', sc), -.05, .21, -.08, 0, 0, 0, [1, 1, .4]);
    put(g, rbox(.08, .3, .01, .004), mat('#c8b890', 'plastica'), .19, .21, .201);
    [.28, .2].forEach(y => put(g, cyl(.016, .016, .015, 14), mat('#1a1a1e', 'plastica'), .19, y, .21, PI / 2));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => put(g, cyl(.01, .006, .06, 8), mat('#2a2a2e', 'metallo'), a * .2, -.03, b * .15));
    asta(g, [-.05, .4, -.1], [-.2, .62, -.12], .003, mat('#c8ccd4', 'cromo')); asta(g, [-.05, .4, -.1], [.12, .6, -.1], .003, mat('#c8ccd4', 'cromo'));
    g.children.forEach(c => c.position.y += .06);
    return g;
  };
  P.tv = { how: 'regge', w: .5, d: .4 };
  // l'elettrodomestico rotto (il frullatore, il ferro da stiro)
  M.ferro_stiro = o => {
    const g = G(), pianta = [[-.11, -.05], [.06, -.05], [.13, 0], [.06, .05], [-.11, .05]];
    put(g, ext(pianta, .025, .004), mat('#c8ccd4', 'cromo'), 0, .0125, 0, -PI / 2);   // la piastra a punta
    put(g, ext(pianta.map(p => [p[0] * .92, p[1] * .9]), .03, .008), mat(o.c || '#c83a2a', 'plastica'), -.005, .04, 0, -PI / 2);
    put(g, ext([[-.09, 0], [.05, 0], [.02, .07], [-.09, .07]], .025, .008, [[[-.065, .015], [.015, .015], [0, .05], [-.065, .05]]]), mat(o.c || '#c83a2a', 'plastica'), 0, .055, 0);   // il manico
    put(g, cyl(.012, .012, .008, 14), mat('#f2f0ea', 'plastica'), .03, .058, 0);
    put(g, tubo([[-.1, .08, 0], [-.16, .06, .02], [-.2, .01, .06]], .004, 12, 5), mat('#1a1a1e', 'gomma'));
    return g;
  };
  P.ferro_stiro = { how: 'pugno' };
  M.frigo = o => { const g = G(); put(g, rbox(.55, 1.2, .55, .05), mat('#e8e4d8', 'metallo'), 0, .6, 0); put(g, box(.54, .006, .005), mat('#a8a49a', 'metallo'), 0, .85, .276); put(g, rbox(.03, .2, .03, .01), mat('#c8ccd4', 'cromo'), .22, .7, .29); put(g, rbox(.03, .1, .03, .01), mat('#c8ccd4', 'cromo'), .22, 1, .29); put(g, sfe(.04, 8, 6), mat('#8a5a3a', 'ruggine'), -.2, .3, .27, 0, 0, 0, [1.5, 1, .2]); return g; };
  P.frigo = { how: 'regge', w: .55, d: .55 };
  // il mobile rotto: un cassettone sfondato
  M.mobile_rotto = o => { const g = G(), L = mat('#7a5a3a', 'legno', venatura('#7a5a3a')); put(g, rbox(.6, .04, .4, .006), L, 0, .62, 0, 0, 0, .06); [-1, 1].forEach(s => put(g, rbox(.03, .6, .4, .005), L, s * .29, .3, 0, 0, 0, s * .03)); put(g, rbox(.55, .16, .02, .004), L, 0, .45, .2); put(g, rbox(.55, .16, .02, .004), L, .05, .1, .32, -.4, .3, 0); put(g, rbox(.3, .02, .1, .004), L, -.15, .02, .3, 0, .8, 0); return g; };
  P.mobile_rotto = { how: 'regge', w: .6, d: .4 };
  // i ricambi: carburatore, ingranaggio, candela, pistone
  M.ricambi = o => { const g = G(), A = mat('#8a8e96', 'metallo'); const gear = new T.Shape(); for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r = i % 2 ? .05 : .042; i ? gear.lineTo(Math.cos(a) * r, Math.sin(a) * r) : gear.moveTo(Math.cos(a) * r, Math.sin(a) * r); } put(g, ext(gear, .012, .001, [{ x: 0, y: 0, r: .012 }]), A, -.06, .006, 0, PI / 2); put(g, lat([[0, 0], [.035, 0], [.036, .05], [.03, .06], [0, .06]], 20), mat('#a8acb4', 'metallo'), .06, 0, 0); put(g, cyl(.006, .006, .07, 10), mat('#c8ccd4', 'cromo'), .06, .03, 0, PI / 2); const c = G(); c.position.set(0, .01, .07); c.rotation.z = PI / 2; g.add(c); put(c, cyl(.008, .008, .03, 6), A); put(c, cyl(.009, .006, .04, 12), mat('#f2f0ea', 'ceramica'), 0, .035, 0); put(c, cyl(.004, .004, .02, 8), A, 0, -.025, 0); return g; };
  P.ricambi = { how: 'pugno' };
  // il copertone
  M.pneumatico = o => { const g = G(); const tr = disegno('battistrada', 64, 16, (x) => { x.fillStyle = '#1e1e20'; x.fillRect(0, 0, 64, 16); x.fillStyle = '#0e0e10'; for (let i = 0; i < 64; i += 8) { x.fillRect(i, 2, 4, 5); x.fillRect(i + 4, 9, 4, 5); } }); tr.repeat.set(12, 1); put(g, tor(.22, .08, 0, 14, 36), mat('#1e1e20', 'gomma', tr), 0, .08, 0, PI / 2, 0, 0, [1, 1, .8]); return g; };
  P.pneumatico = { how: 'regge', w: .6, d: .2 };
  // la bicicletta: il modello di veicoli3d.js se c'è
  M.bici = o => { const g = G(); try { if (typeof Veicoli3D !== 'undefined' && Veicoli3D) { const id = (Veicoli3D.ids || []).find(k => /bici/.test(k)) || 'bici'; const r = Veicoli3D.costruisci(id, o.c || '#2a5a8a', {}); if (r) { g.add(r.alto); if (o.rotta) { r.alto.rotation.z = PI / 2; r.alto.position.y = .3; } return g; } } } catch (e) { } return M.telaio_bici(o); };
  P.bici = { how: 'regge', w: .6, d: .3 };
  // il telaio nudo della bici
  M.telaio_bici = o => { const g = G(), F = mat(o.c || '#2a5a8a', 'metallo'); const P0 = [[-.38, .34, 0], [0, .34, 0], [.15, .9, 0], [-.18, .88, 0], [.52, .34, 0]]; [[0, 1], [1, 2], [1, 3], [3, 2], [0, 3], [2, 4]].forEach(([a, b]) => asta(g, P0[a], P0[b], .014, F)); asta(g, [-.18, .88, 0], [-.2, .98, 0], .012, mat('#c8ccd4', 'cromo')); put(g, rbox(.22, .04, .08, .02), mat('#1a1a1e', 'opaco'), -.2, 1, 0); asta(g, [.15, .9, 0], [.13, 1.02, 0], .012, mat('#c8ccd4', 'cromo')); put(g, cyl(.012, .012, .5, 10), mat('#c8ccd4', 'cromo'), .13, 1.02, 0, PI / 2); put(g, cyl(.08, .08, .01, 24), mat('#c8ccd4', 'cromo'), 0, .34, .03, PI / 2); return g; };
  P.telaio_bici = { how: 'regge', w: .6, d: .3 };
  // la ruota della bici coi raggi
  M.ruota_bici = o => { const g = G(), R = .33; put(g, tor(R, .016, 0, 8, 40), mat('#1e1e20', 'gomma'), 0, R + .016, 0); put(g, tor(R - .02, .007, 0, 5, 40), mat('#c8ccd4', 'cromo'), 0, R + .016, 0); for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; asta(g, [0, R + .016, (i % 2 - .5) * .03], [Math.cos(a) * (R - .02), R + .016 + Math.sin(a) * (R - .02), 0], .0012, mat('#d8dce4', 'cromo'), 4); } put(g, cyl(.02, .02, .06, 12), mat('#a8acb4', 'cromo'), 0, R + .016, 0, PI / 2); if (o.storta) g.children[0].scale.set(1, .92, 1); return g; };
  P.ruota_bici = { how: 'appeso', manico: [0, .68, 0] };
  // le lattine schiacciate
  M.lattine = o => { const g = G(), r = rng(7); for (let i = 0; i < 6; i++) { const s = G(); s.position.set((r() - .5) * .18, .02, (r() - .5) * .14); s.rotation.set(PI / 2, r() * PI, r() * PI); g.add(s); put(s, cyl(.033, .033, .04 + r() * .04, 14), mat(['#c83a2a', '#2a5aa8', '#e8c040', '#c8ccd4'][i % 4], 'metallo'), 0, 0, 0, 0, 0, 0, [1, 1, .4]); } return g; };
  P.lattine = { how: 'regge', w: .2, d: .16 };
  // il piombo: lingotti e un tubo schiacciato
  M.piombo = o => { const g = G(), A = mat('#6a6e74', 'metallo'); for (let i = 0; i < 3; i++) put(g, ext([[-.06, 0], [.06, 0], [.05, .03], [-.05, .03]], .04, .004), A, 0, i * .031, (i - 1) * .02, 0, i * .3, 0); put(g, cyl(.018, .018, .25, 14), A, .05, .02, .08, 0, .4, PI / 2, [1, 1, .5]); return g; };
  P.piombo = { how: 'pugno' };

  // =====================================================================================================================
  // GLI OGGETTI DEL CATALOGO → MODELLO E PARAMETRI
  // =====================================================================================================================
  const E = (bg, fg, testo, sub, band, x) => Object.assign({ bg, fg, testo, sub, band }, x || {});
  const ID = {
    // --- da mangiare ---
    pane: ['pagnotta'], focaccia: ['focaccia'], pane_nero: ['pagnotta', { c: '#6a4022', forma: 'filone' }],
    biscotti: ['pacco', { c: '#e8c040', w: .16, h: .1, d: .06, et: E('#e8c040', '#7a2a1a', 'FROLLINI', 'della nonna', '#7a2a1a') }],
    gallette: ['pacco', { c: '#6a7a4a', w: .12, h: .08, d: .05, et: E('#6a7a4a', '#e8e0c0', 'GALLETTE', 'razione', '#3a4a2a') }],
    verdura: ['verdura'], patate: ['retina', { f: 'patata', rete: '#c8a040' }], pomodori: ['cassetta_frutta', { f: 'pomodoro' }], cipolle: ['retina', { f: 'cipolla', rete: '#c83a2a' }],
    frutta: ['cassetta_frutta', { f: 'mista' }], limoni: ['retina', { f: 'limone', rete: '#3a8a3a' }], olive: ['vasetto', { liq: '#a8b070', pezzi: '#4a5a1a', et: E('#f2ead8', '#3a5a1a', 'OLIVE', 'in salamoia') }],
    uova: ['uova'], latte: ['brik'], formaggio: ['forma'], ricotta: ['ricotta'],
    carne: ['bistecca'], salsiccia: ['salsicce'], salame: ['salame'], mortadella: ['salame', { big: true, c: '#d89090', fetta: '#e8a0a0' }],
    pesce: ['pesce'], sarde: ['sarde'], polpo: ['polpo'], baccala: ['baccala'], acciughe: ['latta_bassa', { rett: true }],
    scatolame: ['latta_bassa'], carne_scatola: ['latta', { r: .042, h: .09, apriti: true, et: E('#8a2a2a', '#e8d8a0', 'CARNE', 'in scatola', '#e8d8a0') }],
    legumi: ['latta', { et: E('#3a7a3a', '#f2ead8', 'FAGIOLI', 'borlotti', '#e8c040') }], ceci: ['latta', { et: E('#c8a040', '#3a2a1a', 'CECI', 'lessati', '#3a2a1a') }],
    conserva: ['vasetto', { liq: '#b82a1a', opaco: true, pieno: .85, stoffa: '#e8e0d0', et: E('#f2ead8', '#b82a1a', 'CONSERVA', 'di casa') }],
    miele: ['vasetto', { liq: '#d89a2a', pieno: .9, cap: '#3a2a1a', et: E('#e8c860', '#5a3a1a', 'MIELE', 'millefiori') }],
    marmellata: ['vasetto', { liq: '#8a2a4a', opaco: true, pieno: .85, stoffa: '#c84a4a', et: E('#f2ead8', '#8a2a4a', 'MARMELLATA') }],
    razione: ['scatolone', { w: .26, h: .14, d: .18, c: '#a89a6a', et: { testo: 'VIVERI', sub: 'pacco aiuti' } }], razione_tutela: ['scatolone', { w: .22, h: .12, d: .16, c: '#7a7e78', et: { testo: 'TUTELA', sub: 'razione unica', fg: '#1a1a1a' } }],
    panino: ['panino'], pasto: ['piatto'], minestra: ['gavetta'], minestrone: ['gavetta', { dentro: '#7a8a3a' }], polenta: ['polenta'],
    gelato: ['cono'], cioccolato: ['tavoletta'], castagne: ['cartoccio', { f: 'castagna' }], castagne_arrosto: ['cartoccio', { f: 'castagna' }], noci: ['cartoccio', { f: 'noce' }],
    funghi: ['cestino', { f: 'fungo' }], mele: ['mucchietto', { f: 'mela' }], arance: ['retina', { f: 'arancia' }], fichi_secchi: ['collana_fichi'],
    latte_polvere: ['latta', { r: .055, h: .14, et: E('#f2f0ea', '#2a5aa8', 'LATTE', 'in polvere', '#2a5aa8') }],
    chewing_gum: ['pacco', { c: '#e84a8a', w: .07, h: .02, d: .03, et: E('#e84a8a', '#f2f0ea', 'GOMME', null, '#4ae8e8') }],
    capi: ['pecora'],
    // --- da bere ---
    acqua: ['bottiglia', { forma: 'acqua', c: '#a8d0e8', liq: '#c8e8f8', et: E('#f2f8fa', '#2a5aa8', 'FONTE', 'oligominerale', '#2a8ac8', { stile: 'onde' }) }],
    tanica_acqua: ['tanica', { plastica: true, c: '#2a6ab0', testo: 'ACQUA', w: .26, h: .34, d: .14 }],
    acqua_pozzo: ['secchio', { dentro: '#5a8aa8' }], caffe_tazza: ['tazzina'], thermos: ['thermos'],
    te: ['bicchiere', { liq: '#b8661a', limone: true, cucchiaino: true }], caffe_orzo: ['tazza', { liq: '#8a5a3a', fascia: '#2a5aa8' }],
    vino: ['fiasco'], birra: ['bottiglia', { forma: 'birra', c: '#5a3010', liq: '#a86a1a', et: E('#e8d8a0', '#7a1a1a', 'BIONDA', 'birra chiara', '#c83a2a') }],
    grappa: ['bottiglia', { forma: 'liquore', c: '#dce8e4', liq: '#f2f0ea', cap: '#1a1a1a', et: E('#f2ead8', '#1a1a1a', 'GRAPPA', 'di vinacce', '#c8a040') }],
    whisky: ['bottiglia', { forma: 'quadrata', c: '#c8a070', liq: '#a8641a' }],
    aranciata: ['bottiglia', { forma: 'gassosa', c: '#dce8e4', liq: '#e8862a', cap: '#e8862a', et: E('#e8862a', '#f2f0ea', 'ARANCIATA', null, '#2a5aa8') }],
    mirto: ['bottiglia', { forma: 'liquore', c: '#2a1a2a', liq: '#3a1a3a', cap: '#c8a040', et: E('#1a1a2a', '#c8a040', 'MIRTO', 'di Sardegna', '#c8a040') }],
    succo: ['brik', { c: '#e8a040', w: .045, d: .03, h: .09, cannuccia: true, et: E('#e8a040', '#7a2a1a', 'SUCCO', 'pesca', '#3a8a3a') }],
    vodka: ['bottiglia', { forma: 'liquore', c: '#dce8e4', liq: '#f4f8f8', cap: '#c83a2a', et: E('#f2f0ea', '#c83a2a', 'VODKA', 'dell\'Est', '#1a3a7a') }],
    // --- dispensa ---
    farina: ['sacchetto_carta'], farina_mais: ['sacchetto_carta', { c: '#e8c870', et: { bg: '#e8c870', testo: 'MAIS', sub: 'per polenta' } }],
    pasta: ['pacco', { c: '#2a5aa8', w: .1, h: .24, d: .05, finestra: true, dentro: '#e8c878', et: E('#2a5aa8', '#f2ead8', 'SPAGHETTI', 'n. 5', '#e8c040') }],
    riso: ['pacco', { c: '#e8e4d8', w: .12, h: .18, d: .05, et: E('#e8e4d8', '#c83a2a', 'RISO', 'arborio', '#c83a2a') }],
    sale: ['pacco', { c: '#2a6ab0', w: .09, h: .14, d: .05, et: E('#2a6ab0', '#f2f0ea', 'SALE', 'grosso', '#f2f0ea') }],
    zucchero: ['pacco', { c: '#f2f0ea', w: .1, h: .17, d: .06, et: E('#f2f0ea', '#2a5aa8', 'ZUCCHERO', '1 kg', '#2a5aa8') }],
    orzo: ['pacco', { c: '#a87a4a', w: .1, h: .16, d: .06, et: E('#a87a4a', '#f2ead8', 'ORZO', 'solubile', '#5a3a1a') }],
    passata: ['bottiglia', { forma: 'passata', c: '#e8e0d8', liq: '#b82a1a', cap: '#c8a040', et: E('#c83a2a', '#f2ead8', 'PASSATA', 'di pomodoro', '#3a7a3a') }],
    olio: ['bottiglia', { forma: 'liquore', c: '#6a7a2a', liq: '#9a9a2a', cap: '#3a5a1a', et: E('#e8dcb0', '#3a5a1a', 'OLIO', 'extra vergine', '#3a5a1a') }],
    aceto: ['bottiglia', { forma: 'liquore', c: '#dce8e4', liq: '#a83a3a', cap: '#c83a2a', et: E('#f2ead8', '#8a2a2a', 'ACETO', 'di vino') }],
    caffe: ['panetto', { w: .07, h: .11, d: .045, c: '#8a2a1a', lucido: true, et: E('#8a2a1a', '#e8c860', 'CAFFÈ', 'moka', '#e8c860') }],
    te_foglie: ['latta', { r: .035, h: .09, et: E('#2a5a4a', '#e8c860', 'TÈ', 'nero', '#e8c860') }],
    lievito: ['panetto', { w: .05, h: .025, d: .05, c: '#e8e0b0', et: E('#e8e0b0', '#c83a2a', 'LIEVITO') }],
    strutto: ['panetto', { w: .1, h: .06, d: .07, c: '#f2ead8', et: E('#f2ead8', '#8a2a2a', 'STRUTTO') }],
    burro: ['panetto'], uva: ['grappolo'],
    spezie: ['vasetto', { r: .02, h: .06, liq: '#a8401a', opaco: true, pieno: .9, cap: '#c83a2a', et: E('#f2ead8', '#8a2a1a', 'PEPE') }],
    // --- combustibili ---
    legna: ['fascina'], carbone: ['sacco', { c: '#3a3434', et: { testo: 'CARBONE', fg: '#e8e0c8' } }], carbonella: ['sacchetto_carta', { c: '#3a3434', et: { bg: '#3a3434', fg: '#e8c040', testo: 'CARBONELLA', bordo: '#e8c040' } }],
    benzina: ['tanica'], gasolio: ['tanica', { c: '#3a6a3a' }], petrolio: ['tanica', { c: '#2a4a7a', w: .22, h: .3, d: .12 }],
    bombola: ['bombola'], fiammiferi: ['fiammiferi'], accendino: ['accendino'], candele: ['candele'],
    alcol: ['flacone', { c: '#e8a0c0', cap: '#c83a2a', et: E('#e8a0c0', '#7a1a3a', 'ALCOL', 'denaturato', '#7a1a3a') }],
    olio_motore: ['latta', { r: .055, h: .17, et: E('#e8c040', '#1a1a1a', 'OLIO', 'motore 20W', '#1a1a1a') }],
    lampada_petrolio: ['lume'], razzo: ['razzo'],
    // --- edilizia ---
    legno: ['tavole', { c: '#c8a070', L: .7 }], assi: ['tavole', { c: '#b8905a', n: 6, L: 1 }], travi: ['trave'], compensato: ['pannello'], sughero: ['pannello', { c: '#a87a4a', kind: 'cartone', s: .02 }],
    mattoni: ['mattoni'], cemento: ['sacco_carta'], calce: ['sacco_carta', { c: '#e8e4d8', et: { bg: '#e8e4d8', testo: 'CALCE', sub: 'idrata', band: '#2a5aa8' } }],
    sabbia: ['sacco', { c: '#c8b080', et: { testo: 'SABBIA' } }], ghiaia: ['sacco', { c: '#a8a090', et: { testo: 'GHIAIA' } }], sacco_sabbia: ['sacco', { c: '#b8a070', legato: false }],
    pietre: ['pietre'], malta: ['secchio', { dentro: '#a8a49a' }], catrame: ['secchio', { c: '#2a2a2e', dentro: '#0a0a0c' }],
    lamiera: ['ondulata'], latta: ['pannello', { c: '#c8ccd2', kind: 'metallo', s: .002, n: 4, w: .5, d: .35 }],
    tondino: ['fascio'], ferro: ['fascio', { k: 'profilati' }], tubi: ['fascio', { k: 'tubi', c: '#8a8e96' }],
    rete: ['rotolo', { k: 'rete', R: .2, L: .6 }], filo_spinato: ['rotolo', { k: 'spinato', R: .16 }], isolante: ['rotolo', { k: 'isolante', c: '#e8c860', R: .2, L: .6, legato: true }],
    telo: ['telo'], vetro: ['lastra_vetro'], plexiglas: ['lastra_vetro', { c: '#e8f0f0' }], tubo_stufa: ['tubo_stufa'], pallet: ['pallet'], grata: ['grata'],
    // --- ferramenta ---
    chiodi: ['minuteria', { k: 'chiodi' }], viti: ['minuteria', { k: 'viti', c: '#c83a2a' }], bulloni: ['minuteria', { k: 'bulloni', c: '#2a5aa8' }], tasselli: ['minuteria', { k: 'tasselli', c: '#e8c040' }], molle: ['minuteria', { k: 'molle', c: '#5a8a5a' }],
    cerniere: ['cerniere'], lucchetto: ['lucchetto'], catena: ['catena'],
    filo_ferro: ['matassa', { c: '#8a8e96', kind: 'acciaio', r: .002 }], corda: ['matassa'], cavo_acciaio: ['matassa', { c: '#a8acb4', kind: 'acciaio', r: .004 }],
    nastro: ['rotolino'], nastro_telato: ['rotolino', { c: '#9a9e9a', big: true }],
    colla: ['tubetto'], sacchi: ['sacchi_piegati'], secchio: ['secchio'], vernice: ['barattolo_vernice'], bomboletta: ['bomboletta'], pennarello: ['pennarello'], gesso: ['gessetti'],
    tanica_vuota: ['tanica', { c: '#7a3a2a' }], guanti: ['guanti'], fascette: ['fascette'],
    carta_vetrata: ['fogli', { c: '#c8a868', w: .23, d: .28, n: 6 }], lubrificante: ['oliatore'], moschettoni: ['moschettone'], silicone: ['cartuccia'],
    // --- attrezzi ---
    martello: ['martello'], cacciavite: ['cacciavite'], pinze: ['pinze'], tronchesi: ['pinze', { tronchese: true, c: '#2a5aa8' }], chiave_inglese: ['chiave_inglese'],
    seghetto: ['seghetto'], sega: ['sega'], ascia: ['ascia'], lima: ['lima'], trapano: ['trapano'], stetoscopio: ['stetoscopio'],
    taglierino: ['o3:coltello'], forbici: ['forbici'], cazzuola: ['cazzuola'], pala: ['pala'], piccone: ['piccone'], piede: ['piede_porco'],
    grimaldello: ['grimaldelli'], carriola: ['carriola'], saldatore: ['saldatore'], stagno: ['rocchetto', { c: '#c8ccd4', metallo: true }],
    pentola: ['pentola'], padella: ['padella'], moka: ['moka'], ferri_maglia: ['ferri_maglia'], ago_filo: ['rocchetto', { ago: true }],
    rete_pesca: ['rete_pesca'], canna: ['canna_pesca'], torcia: ['torcia'], morsa: ['morsa'], pialla: ['pialla'], scalpello: ['scalpello'], metro: ['metro'],
    mazza: ['mazza'], zappa: ['zappa'], falce: ['falce'], cesoie: ['cesoie'], chiave_tubo: ['chiave_tubo'], tester: ['tester'], binocolo: ['binocolo'], bussola: ['bussola'],
    coltellino: ['coltellino'], pompa: ['pompa'],
    // --- elettrico ---
    pile: ['pile'], lampadine: ['lampadina'], cavo: ['matassa', { c: '#1a1a1e', kind: 'gomma', r: .004 }], cavo_coax: ['matassa', { c: '#e8e4d8', kind: 'plastica', r: .005 }],
    valvole: ['valvola'], transistor: ['transistor'], altoparlante: ['altoparlante'], batteria_auto: ['batteria_auto'], sveglia: ['sveglia'], interruttore: ['interruttore'],
    radiolina: ['radiolina'], ricetrasmittente: ['ricetrasmittente'], antenna_kit: ['antenna'], disturbatore: ['scatola_el', { antenna: true, led: '#e84a2a' }], timer: ['scatola_el', { display: '12:00', c: '#2a2a2e' }],
    telefono: ['telefono'], fotocamera: ['fotocamera'], rullino: ['rullino'], cassetta: ['cassetta'], cuffie: ['cuffie'], microfono: ['microfono'], registratore: ['registratore'],
    walkie: ['walkie'], dinamo: ['dinamo'], rame: ['matassa', { c: '#c86a2a', kind: 'ottone', r: .002 }], motore_el: ['motore_el'], telefono_campo: ['telefono_campo'], radio_galena: ['radio_galena'],
    // --- stampa ---
    carta: ['risma'], cartoncino: ['risma', { c: '#e8d8a8', carta: '#c83a2a', testo: 'CARTONCINO' }], inchiostro: ['boccetta'], penne: ['penne'], quaderno: ['quaderno'],
    buste: ['busta', { c: '#f2ead8', testo: 'POSTA' }], carta_bollata: ['fogli', { c: '#f2ead8', n: 3, t: etichetta({ bg: '#f2ead8', fg: '#2a2a2a', testo: 'BOLLO', bordo: '#2a5aa8', righe: 6, w: 128, h: 160 }) }],
    giornale: ['giornale'], volantini: ['volantini'], poster: ['rotolo_poster'], libretto: ['libretto', { c: '#c83a2a', testo: 'LIBRETTO', fg: '#f2ead8' }],
    stencil: ['stencil'], timbro_falso: ['timbro'], foto_tessera: ['foto'], documenti: ['cartellina', { testo: 'DOCUMENTI' }], prove: ['busta', { testo: 'PROVE' }],
    fascicolo: ['cartellina', { c: '#c8b080', testo: 'FASCICOLO', timbro: 'SEGRETO' }], moduli: ['fogli', { c: '#f2ead8', t: etichetta({ bg: '#f2ead8', fg: '#2a2a2a', testo: 'MODULO', band: '#2a5aa8', righe: 6, w: 128, h: 160 }) }],
    macchina_scrivere: ['macchina_scrivere'], nastro_mds: ['nastro_mds'], matrici: ['fogli', { c: '#5a7ac8', n: 4 }],
    tessera_annonaria: ['tessera', { c: '#c8b890', testo: 'ANNONARIA', sub: 'pane latte zucchero' }], tessera_partito: ['tessera', { c: '#c83a2a', fg: '#f2ead8', band: '#e8c040', testo: 'PARTITO', sub: 'iscritto' }],
    mappa: ['mappa'], piantina: ['mappa', { c: '#e8e0c8' }], rivista_proibita: ['rivista'],
    // --- medicine ---
    medicine: ['scatola_farmaco'], antibiotici: ['pillole', { c: '#e88a2a', testo: 'ANTIB.' }], garze: ['garze'], bende: ['benda'], cerotti: ['scatola_farmaco', { c: '#e8a040', testo: 'CEROTTI', sub: 'assortiti', w: .08, h: .03, d: .05 }],
    disinfettante: ['flacone', { c: '#f2f0ea', cap: '#c83a2a', w: .06, d: .04, h: .15, et: E('#f2f0ea', '#c83a2a', 'DISINF.', null, '#c83a2a') }],
    siringhe: ['siringa'], morfina: ['fiala'], kit_medico: ['valigetta_medica'], sciroppo: ['bottiglia', { forma: 'sciroppo', c: '#6a3a1a', liq: '#8a2a1a', cap: '#f2f0ea', et: E('#f2f0ea', '#2a5aa8', 'SCIROPPO', 'tosse') }],
    vitamine: ['pillole', { c: '#e8c040', testo: 'VIT. C' }], iodio: ['boccetta', { c: '#5a3a1a', liq: '#6a2a1a', et: E('#f2ead8', '#6a2a1a', 'IODIO') }],
    laccio: ['laccio'], stecca: ['stecca'], termometro: ['termometro'], sonniferi: ['blister'],
    // --- igiene ---
    sapone: ['saponetta'], detersivo: ['fustino'], candeggina: ['flacone', { c: '#f2f0ea', cap: '#2a6ab0', manico: true, w: .1, h: .24, et: E('#f2f0ea', '#2a6ab0', 'CANDEGGINA', null, '#2a6ab0') }],
    spugne: ['spugna'], dentifricio: ['dentifricio'], rasoio: ['rasoio'], stracci: ['stracci'],
    bottiglia_vuota: ['bottiglia', { forma: 'vuota', c: '#3a6a3a' }], barattolo: ['vasetto', { et: false, cap: '#a8acb4' }], latta_vuota: ['latta', { et: false, aperta: true }],
    cartone: ['scatolone', { stampa: false, w: .36, h: .24, d: .28 }], carta_igienica: ['rotoli'],
    shampoo: ['flacone', { c: '#e8c040', cap: '#c83a2a', w: .07, d: .04, h: .18, et: E('#e8c040', '#7a2a1a', 'SHAMPOO', 'alle uova', '#7a2a1a') }],
    pettine: ['pettine'], tenda: ['tenda'], sacco_pelo: ['sacco_pelo'],
    // --- vestiti ---
    stoffa: ['stoffa'], stoffa_grigia: ['stoffa', { c: '#7a7e80' }], lana: ['gomitoli'], pelle: ['pelle'], bottoni: ['bottoni'],
    vestiti: ['capo_piegato', { c: '#6a7a9a', n: 3 }], maglione: ['capo_piegato', { c: '#8a3a3a' }], cappotto: ['capo_piegato', { c: '#4a4038', k: 'cappotto', n: 2 }],
    scarpe: ['scarpe'], guanti_lana: ['guanti', { c: '#8a4a6a', lana: true }], passamontagna: ['berretto', { k: 'passamontagna', c: '#1a1a1e' }],
    zaino: ['zaino'], coperta: ['coperta', { quadri: true }], lenzuola: ['coperta', { c: '#f2f0ea' }], divisa: ['capo_piegato', { c: '#4a5a3a', k: 'divisa' }],
    impermeabile: ['capo_piegato', { c: '#c8a858', k: 'giacca' }], stivali: ['scarpe', { alti: true, c: '#2a2a2a' }], berretto: ['berretto', { c: '#3a4a6a' }],
    sciarpa: ['sciarpa'], tuta: ['capo_piegato', { c: '#2a5aa8', k: 'giacca' }], giacca_pelle: ['capo_piegato', { c: '#2a2220', k: 'giacca' }],
    maschera_gas: ['maschera_gas'], elmetto: ['berretto', { k: 'elmetto', c: '#4a5a3a' }], giubbotto: ['capo_piegato', { c: '#3a4a3a', k: 'giacca' }], jeans: ['capo_piegato', { c: '#3a5a8a', k: 'jeans' }],
    // --- arredi ---
    mobili: ['mobile_rotto'], sedia: ['sedia'], tavolo: ['tavolo'], branda: ['branda'], materasso: ['materasso'], scaffale: ['scaffale'],
    casse: ['cassa_legno'], barricata: ['barricata'], porta_rinforzata: ['porta'], botola: ['botola'],
    stufa: ['st:st_stufa'], fornello: ['fornello'], banco: ['st:st_banco_lavoro'], macchina_cucire: ['st:st_macchina_cucire'], ciclostile: ['st:st_ciclostile'],
    banco_radio: ['st:st_banco_radio'], alambicco: ['st:st_alambicco'], ingranditore: ['st:st_camera_oscura'], lampada: ['lampada'], stufetta: ['stufetta'], bicicletta: ['bici'],
    // --- armi ---
    coltello: ['o3:coltello'], pistola: ['o3:pistola'], lupara: ['o3:lupara'], mitra: ['o3:mitra'],
    munizioni: ['munizioni'], molotov: ['molotov'], candelotto: ['candelotto'], triboli: ['triboli'], kit: ['kit_sabotaggio'], manette: ['manette'],
    fionda: ['fionda'], mazza_baseball: ['mazza_baseball'], tirapugni: ['tirapugni'], spray_peperoncino: ['bomboletta', { piccola: true, c: '#c83a2a', testo: 'DIFESA' }],
    fumogeno: ['fumogeno'], petardi: ['petardi'],
    // --- valori ---
    sigarette: ['sigarette'], sigarette_contr: ['sigarette', { stecca: true, c: '#2a4a8a', testo: 'EXPORT' }], marlboro: ['sigarette', { c: '#c83a2a', testo: 'AMERICANE' }],
    tabacco: ['tabacco'], carte: ['carte'], orologio: ['orologio'], gioielli: ['portagioie'], valuta: ['banconote', { c: '#4a7a5a', testo: '$ 20' }],
    merce: ['cassa_legno', { w: .5, h: .32, d: .34, stampa: 'MADE IN', sub: 'HONG KONG' }], roba: ['fagotto'], refurtiva: ['borsone'],
    anello_oro: ['anello'], posate_argento: ['posate'], quadro: ['quadro'], francobolli: ['album'], dischi: ['dischi'], cassette_proibite: ['cassetta', { c: '#e84a8a' }],
    profumo: ['profumo'], calze_nylon: ['calze'], fossile: ['fossile'], anfora: ['anfora'], moneta_romana: ['moneta', { n: 3 }], medaglia: ['medaglia'], moschetto: ['moschetto'],
    // --- rottami ---
    rottami: ['rottami'], radio_rotta: ['radio_rotta'], tv_rotta: ['tv'], elettrodomestico: ['ferro_stiro'], mobile_rotto: ['mobile_rotto'], ricambi: ['ricambi'],
    pneumatico: ['pneumatico'], frigo_rotto: ['frigo'], bici_rotta: ['bici', { rotta: true }], telaio: ['telaio_bici'], ruota_bici: ['ruota_bici', { storta: true }],
    catena_bici: ['catena', { fine: true, c: '#3a3a3e' }], lattine: ['lattine'], piombo: ['piombo'], batterie_esauste: ['pile', { esauste: true }],
  };
  // la presa di ripiego per i modelli che non la dicono: le cose grosse a due mani, il resto nel pugno
  const PRESA_DEF = { how: 'pugno' };

  // =====================================================================================================================
  // L'INTERFACCIA
  // =====================================================================================================================
  const has = id => !!ID[id];
  function build(id) {
    const r = ID[id]; if (!r) return null;
    const [k, o] = r;
    if (/^o3:/.test(k)) { const O3 = typeof Oggetti3D !== 'undefined' && Oggetti3D; const m = O3 && O3.make(k.slice(3), null, id); if (m && /^(pistola|lupara|mitra|fucile)$/.test(k.slice(3))) m.userData.arma3 = true; return m || null; }
    if (/^st:/.test(k)) { const OU = typeof OggettiUI !== 'undefined' && OggettiUI; const m = OU && OU.stModel && OU.stModel(k.slice(3)); if (m) { m.userData.st = true; return m; } return M.scatolone({ et: { testo: 'POSTAZIONE' } }); }
    const f = M[k]; if (!f) return null;
    const g = f(Object.assign({}, o || {})); g.userData.modello = k; return g;
  }
  // le mesh con lo stesso materiale diventano una sola (un oggetto in mano costa 3-8 chiamate di disegno invece di 20-100)
  // la patina sui vertici: uv "a scatola" in metri per i materiali con la tela dei segni, colori per vertice (contatto, sfumatura, tono per pezzo)
  const _n = V3(0, 0, 0);
  function patina(g) {
    g.updateMatrixWorld(true); const inv = new T.Matrix4().copy(g.matrixWorld).invert(), bb = new T.Box3().setFromObject(g, true), H = Math.max(.02, bb.max.y - bb.min.y), y0 = bb.min.y;
    let pezzo = 0;
    g.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.userData || !o.material.userData.vc || o.geometry.userData.patinata) return;
      const geo = o.geometry.clone(); geo.userData = Object.assign({}, geo.userData, { patinata: true }); o.geometry = geo;   // (clone condivide userData con la geometria in cache)
      const M4 = new T.Matrix4().multiplyMatrices(inv, o.matrixWorld), NM = new T.Matrix3().getNormalMatrix(M4), P = geo.attributes.position, Nn = geo.attributes.normal, n = P.count;
      const col = new Float32Array(n * 3), tono = 1 + ((hashS(String(pezzo++)) % 100) / 100 - .5) * .1, pat = o.material.userData.patina, uv = pat ? new Float32Array(n * 2) : null, v = V3(0, 0, 0);
      for (let i = 0; i < n; i++) {
        v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(M4);
        const yy = v.y - y0, contatto = 1 - .5 * Math.max(0, 1 - yy / .03), sfuma = .8 + .2 * Math.min(1, yy / H), k = contatto * sfuma * tono;
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
        if (uv) { if (Nn) _n.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)).applyMatrix3(NM); else _n.set(0, 1, 0); const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
          if (ax >= ay && ax >= az) { uv[i * 2] = v.z / TILE; uv[i * 2 + 1] = v.y / TILE; } else if (ay >= az) { uv[i * 2] = v.x / TILE; uv[i * 2 + 1] = v.z / TILE; } else { uv[i * 2] = v.x / TILE; uv[i * 2 + 1] = v.y / TILE; } }
      }
      geo.setAttribute('color', new T.BufferAttribute(col, 3)); if (uv) geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    });
    return g;
  }
  function fondi(g) {
    patina(g);
    const gruppi = new Map(); g.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(g.matrixWorld).invert();
    g.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && !o.name) { if (!gruppi.has(o.material)) gruppi.set(o.material, []); gruppi.get(o.material).push(o); } });
    for (const [m, list] of gruppi) {
      if (list.length < 2) continue;
      const parts = list.map(o => { const q = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); q.applyMatrix4(new T.Matrix4().multiplyMatrices(inv, o.matrixWorld)); if (!q.attributes.uv) q.setAttribute('uv', new T.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2)); return q; });
      let n = 0; parts.forEach(q => { n += q.attributes.position.count; });
      const vc = parts.every(q => q.attributes.color);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = vc ? new Float32Array(n * 3) : null; let o3 = 0, o2 = 0;
      for (const q of parts) { pos.set(q.attributes.position.array, o3); nor.set(q.attributes.normal.array, o3); uv.set(q.attributes.uv.array, o2); if (col) col.set(q.attributes.color.array, o3); o3 += q.attributes.position.count * 3; o2 += q.attributes.position.count * 2; q.dispose(); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); if (col) geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mm = new T.Mesh(geo, m); mm.castShadow = list.some(o => o.castShadow); mm.receiveShadow = true; g.add(mm);
      list.forEach(o => o.parent && o.parent.remove(o));
    }
    const vuoti = []; g.traverse(o => { if (o !== g && !o.isMesh && o.children.length === 0) vuoti.push(o); }); vuoti.forEach(o => o.parent && o.parent.remove(o));
    return g;
  }
  function make(id) {
    try { const g = build(id); if (g && g.userData.modello) fondi(g); return g; }
    catch (e) { if (typeof console !== 'undefined') console.warn('[roba3d]', id, e.message); return null; }
  }
  // la presa: quella del modello, altrimenti quella di ripiego; w e d per 'regge' misurati sul modello
  function presa(id, g) {
    const r = ID[id]; if (!r) return null;
    const k = r[0], D = Object.assign({}, k.startsWith('st:') ? { how: 'regge' } : k.startsWith('o3:') ? { how: 'pugno' } : (P[k] || PRESA_DEF));
    if (D.how === 'regge' && g && (!D.w || !D.d)) { const s = new T.Box3().setFromObject(g).getSize(V3(0, 0, 0)); D.w = D.w || Math.min(.7, s.x); D.d = D.d || Math.min(.6, s.z); }
    if (D.how === 'regge') { D.w = D.w || .4; D.d = D.d || .3; }
    return D;
  }
  // il modello nel sistema della mano di anim_mano.js (Y lungo le dita, Z fuori dal palmo, X verso il pollice; il centro del pugno
  // in (0, gy, gz)), o nel sistema del corpo per 'regge' (centrato). Restituisce { obj, D } oppure null.
  const _b = new T.Box3(), _c = V3(0, 0, 0), _s = V3(0, 0, 0), _m4 = new T.Matrix4();
  function inHand(id, gy, gz) {
    const g = make(id); if (!g) return null;
    const D = presa(id, g), w = new T.Group(), root = new T.Group(); w.add(g); root.add(w);
    const ud = g.userData;
    _b.setFromObject(g); _b.getCenter(_c); _b.getSize(_s);
    if (ud.arma3) { root.remove(w); const O3 = Oggetti3D; const a = O3.armaInMano(ID[id][0].slice(3), gy, gz); return { obj: a, D: { how: 'pugno', grip: [.9, .85] } }; }
    if (ud.arma) {   // la canna (+X) lungo le dita, il sopra verso il pollice, il pugno sull'impugnatura
      g.position.set(-ud.arma[0], -ud.arma[1], -ud.arma[2]);
      w.quaternion.setFromRotationMatrix(_m4.makeBasis(V3(0, 1, 0), V3(1, 0, 0), V3(0, 0, -1)));
      w.position.set(0, gy, gz); return { obj: root, D: Object.assign({}, D, { how: 'pugno', grip: [.9, .85] }) };
    }
    if (D.how === 'regge') { g.position.set(-_c.x, -_c.y, -_c.z); return { obj: root, D }; }
    if (D.how === 'appeso') {
      // il manico nel pugno, la cosa sotto (le dita in giù: +Y della mano va verso terra); il lato largo lungo la gamba
      let mn = D.manico || ud.manico || [0, _b.max.y, 0];
      if (ud.su === 'x') { g.rotation.z = PI / 2; mn = [-mn[1], mn[0], mn[2]]; }   // appeso per un capo (il pesce per la coda): +X va in su
      g.position.set(-mn[0], -mn[1], -mn[2]); w.rotation.z = PI; w.position.set(0, gy, gz);
      return { obj: root, D: Object.assign({ atGrip: true, grip: [.9, .85] }, D) };
    }
    if (D.how === 'piatto') {
      // coricato sul piano XZ: si raddrizza nel piano della mano (XY), contro il palmo, lungo le dita
      g.position.set(-_c.x, -_b.min.y, -_c.z); w.rotation.x = -PI / 2; w.position.set(.02, gy + .04, gz - .005);
      if (_s.z < _s.x) w.rotateY(0), g.rotation.y = PI / 2;
      return { obj: root, D: Object.assign({ grip: [.4, .7] }, D) };
    }
    // pugno e lungo: l'asse lungo (+Y del modello) verso il pollice, il punto di presa nel centro del pugno
    const gy0 = ud.grip !== undefined ? ud.grip : _s.y * .45;
    g.position.set(-_c.x, -gy0, -_c.z); w.rotation.z = -PI / 2; w.position.set(0, gy, gz);
    // le cose tozze (più larghe che alte) stanno sul palmo, appena davanti
    if (ud.grip === undefined && Math.max(_s.x, _s.z) > _s.y * 1.3) { w.rotation.z = -PI / 2; w.position.z += Math.min(.05, _s.z * .4); }
    return { obj: root, D: Object.assign({ grip: D.how === 'lungo' ? [.95, .9] : [.8, .7] }, D) };
  }
  // per chi fonde nella geometria statica del mondo (render.js mergeGeos tiene solo posizione, normale e uv): niente colori per vertice
  const SVC = new Map();
  function statico(g) {
    if (!g) return g;
    g.traverse(o => { if (!o.isMesh || !o.material || !o.material.vertexColors) return; let m = SVC.get(o.material); if (!m) { m = o.material.clone(); m.vertexColors = false; SVC.set(o.material, m); } o.material = m; if (o.geometry.attributes.color) { o.geometry = o.geometry.clone(); o.geometry.deleteAttribute('color'); } });
    return g;
  }
  return { has, make, presa, inHand, fondi, statico, ID, M, get ids() { return Object.keys(ID); } };
})();
if (typeof module !== 'undefined') module.exports = Roba3D;
