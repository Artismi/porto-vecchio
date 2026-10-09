/* Interni, la grafica [interni 4/10].
   Disegna il piano dove sei a partire dalla pianta di interiors.js: pavimenti e pareti diversi per ogni stanza
   (carta da parati sovietica, pittura a due colori, piastrelle, mattoni, perline…) con lo sporco e l'usura,
   le cornici delle porte, la scala (su, giù, il vano all'ultimo piano), le finestre gelate con la luce fredda per terra,
   le lampade (lampadina nuda, lampadario, neon che sfarfalla, candele, fuoco della stufa) e tutti i mobili e gli oggetti
   fatti a mano (ia_*, e la stufa st_stufa). Il resto dei mobili viene dal kit (Models.furniture).
   render.js chiama InterniArte.build(b, f, ctx) dentro buildIndoor e InterniArte.light(o) a ogni fotogramma al chiuso. */
var InterniArte = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, PPM = 16; let BASE = .4;   // quota del pavimento: quella del terreno sotto l'edificio (la imposta buildFloor)
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; r = Math.min(255, Math.max(0, Math.round(r * f))); g = Math.min(255, Math.max(0, Math.round(g * f))); b = Math.min(255, Math.max(0, Math.round(b * f))); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const c = k => Math.round(((A >> k) & 255) * (1 - t) + ((B >> k) & 255) * t); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); }
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const tex = c => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding; return t; };
  // materiali (in cache per colore)
  const MC = {};
  const M = (c, o) => { const k = c + (o ? JSON.stringify(o) : ''); return MC[k] || (MC[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, o || {}))); };
  const GL = (c, i) => { const k = 'G' + c + i; return MC[k] || (MC[k] = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i == null ? 1.2 : i, roughness: .6 })); };
  const BASIC = c => { const k = 'B' + c; return MC[k] || (MC[k] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); };
  const GEO = {}; const bgeo = (w, h, d) => { const k = w + ',' + h + ',' + d; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); };
  const cgeo = (r0, r1, h, s) => { const k = 'c' + r0 + ',' + r1 + ',' + h + ',' + s; return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(r0, r1, h, s || 8)); };
  const sgeo = (r, s) => { const k = 's' + r + ',' + s; return GEO[k] || (GEO[k] = new THREE.SphereGeometry(r, s || 8, Math.max(4, (s || 8) - 2))); };

  // =====================================================================================================================
  // PAVIMENTI (una tela per stanza, in metri × PPM)
  // =====================================================================================================================
  const LINO = ['#7a4a38', '#6a6e5a', '#8a6a42', '#5a6470', '#7a5a5a'];
  function floorCanvas(q, r, wet) {
    const cw = Math.max(4, Math.round(q.w * PPM)), ch = Math.max(4, Math.round(q.h * PPM)), c = mk(cw, ch), x = c.getContext('2d'), st = q.floor;
    const fill = col => { x.fillStyle = col; x.fillRect(0, 0, cw, ch); };
    const px = (col, X, Y, w, h) => { x.fillStyle = col; x.fillRect(X, Y, w || 1, h || 1); };
    if (st === 'parquet' || st === 'assi') {
      const pw = st === 'assi' ? 6 : 3, base = st === 'assi' ? pick(r, ['#6e5a46', '#7a6248', '#5e5040']) : pick(r, ['#7a4e30', '#6a4228', '#845a38']);
      fill(base);
      for (let j = 0; j < ch; j += pw) { let i = -Math.floor(r() * 30); while (i < cw) { const L = 12 + Math.floor(r() * 26); px(shade(base, .86 + r() * .28), i, j, L - 1, pw - 1); px(shade(base, .6), i + L - 1, j, 1, pw); i += L; } px(shade(base, .55), 0, j + pw - 1, cw, 1); }
    } else if (st === 'spina') {
      const base = pick(r, ['#8a5a34', '#7a4a2a', '#94643c']); fill(shade(base, .7));
      for (let j = -8; j < ch + 8; j += 4) for (let i = -8; i < cw + 8; i += 8) { const o = ((j / 4) & 1) * 4; px(shade(base, .85 + r() * .3), i + o, j, 6, 2); px(shade(base, .8 + r() * .3), i + o + 4, j + 2, 2, 6 > ch ? 2 : 6); }
    } else if (st === 'linoleum') {
      const base = pick(r, LINO); fill(base);
      for (let k = 0; k < cw * ch / 6; k++) px(shade(base, .9 + r() * .2), Math.floor(r() * cw), Math.floor(r() * ch), 2, 1);
      x.strokeStyle = shade(base, .8); for (let i = 16; i < cw; i += 32) { x.fillStyle = shade(base, .82); x.fillRect(i, 0, 1, ch); }
    } else if (st === 'scacchi') {
      const [a, b] = pick(r, [['#d8d0c0', '#2a2a2e'], ['#c8b090', '#6a3a2a'], ['#e0d8c8', '#3a5a6a'], ['#d0c4a8', '#5a6a4a']]), s = 8;
      for (let j = 0; j < ch; j += s) for (let i = 0; i < cw; i += s) { px(((i + j) / s) % 2 ? a : b, i, j, s, s); if (r() < .06) px('rgba(0,0,0,.25)', i + Math.floor(r() * s), j + Math.floor(r() * s), 3, 1); }
    } else if (st === 'piastrelle' || st === 'piastrelle_b') {
      const s = st === 'piastrelle' ? 4 : 3, a = st === 'piastrelle' ? pick(r, ['#e4e0d6', '#d8dcd8', '#e8dcc8']) : pick(r, ['#5a7a9a', '#4a6a7a', '#6a8a8a']);
      fill(shade(a, .72));
      for (let j = 0; j < ch; j += s) for (let i = 0; i < cw; i += s) { px(r() < .04 ? shade(a, .6) : shade(a, .95 + r() * .08), i, j, s - 1, s - 1); }
    } else if (st === 'graniglia') {
      const base = pick(r, ['#c8b8a0', '#b8b0a4', '#c0a890']); fill(base);
      for (let k = 0; k < cw * ch / 2.5; k++) px(pick(r, ['#8a7a6a', '#e8dcc8', '#a8584a', '#6a7a8a', '#f4ecd8', '#4a4440']), Math.floor(r() * cw), Math.floor(r() * ch));
      x.fillStyle = shade(base, .6); x.fillRect(0, 0, cw, 3); x.fillRect(0, ch - 3, cw, 3); x.fillRect(0, 0, 3, ch); x.fillRect(cw - 3, 0, 3, ch);
      for (let i = 0; i < cw; i += 16) px(shade(base, .75), i, 0, 1, ch); for (let j = 0; j < ch; j += 16) px(shade(base, .75), 0, j, cw, 1);
    } else if (st === 'cotto') {
      for (let j = 0; j < ch; j += 6) for (let i = 0; i < cw; i += 6) px(pick(r, ['#a8583a', '#9a5034', '#b4643e', '#8e4a30', '#a05a3c']), i, j, 5, 5);
      x.fillStyle = '#5e3624'; for (let i = 5; i < cw; i += 6) x.fillRect(i, 0, 1, ch); for (let j = 5; j < ch; j += 6) x.fillRect(0, j, cw, 1);
    } else if (st === 'marmo') {
      const base = pick(r, ['#ddd6ca', '#d0ccc4', '#e0d4c4']); fill(base);
      for (let k = 0; k < cw * ch / 9; k++) px(shade(base, .88 + r() * .2), Math.floor(r() * cw), Math.floor(r() * ch), 2, 1);
      for (let k = 0; k < cw * ch / 300; k++) { let X = r() * cw, Y = r() * ch; for (let s = 0; s < 22; s++) { px('rgba(90,80,70,.35)', Math.floor(X), Math.floor(Y)); X += r() * 2 - .6; Y += r() * 2 - 1; } }
      x.fillStyle = shade(base, .7); for (let i = 0; i < cw; i += 16) x.fillRect(i, 0, 1, ch); for (let j = 0; j < ch; j += 16) x.fillRect(0, j, cw, 1);
    } else if (st === 'moquette_r' || st === 'moquette_b') {
      const base = st === 'moquette_r' ? pick(r, ['#6a1a24', '#7a2a2a', '#5a1420']) : pick(r, ['#1c2048', '#20183a', '#162438']); fill(base);
      for (let j = 0; j < ch; j += 8) for (let i = 0; i < cw; i += 8) { px(shade(base, 1.35), i + 3, j + 1, 2, 1); px(shade(base, 1.35), i + 2, j + 2, 4, 1); px(shade(base, 1.35), i + 3, j + 3, 2, 1); if (st === 'moquette_b' && r() < .3) px(pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b']), i + 6, j + 6); }
    } else if (st === 'terra') {
      fill('#5a4a38'); for (let k = 0; k < cw * ch / 3; k++) px(pick(r, ['#4a3c2e', '#6a5844', '#7a6a50', '#3e3226', '#8a7a58']), Math.floor(r() * cw), Math.floor(r() * ch), 1 + Math.floor(r() * 2), 1);
    } else if (st === 'gomma') {
      fill('#2a2c30'); for (let j = 0; j < ch; j += 3) px('#24262a', 0, j, cw, 1); x.fillStyle = '#c8a040'; x.fillRect(4, 4, cw - 8, 1); x.fillRect(4, ch - 5, cw - 8, 1);
    } else {   // cemento
      const base = pick(r, ['#6a6660', '#5e5c58', '#727068']); fill(base);
      for (let k = 0; k < cw * ch / 5; k++) px(shade(base, .85 + r() * .3), Math.floor(r() * cw), Math.floor(r() * ch), 2, 1);
      for (let k = 0; k < cw * ch / 900 + 1; k++) { let X = r() * cw, Y = r() * ch; for (let s = 0; s < 30; s++) { px('rgba(30,26,22,.5)', Math.floor(X), Math.floor(Y)); X += r() * 2 - 1; Y += r() * 2 - 1; } }
      for (let k = 0; k < cw * ch / 1500 + 1; k++) { x.fillStyle = 'rgba(20,18,16,.3)'; x.beginPath(); x.ellipse(r() * cw, r() * ch, 3 + r() * 7, 2 + r() * 5, r() * 3, 0, 7); x.fill(); }
    }
    // usura: polvere lungo i muri, macchie, il passaggio consumato in mezzo
    const d = q.dirt || .3;
    x.fillStyle = `rgba(20,16,12,${.18 + d * .25})`; x.fillRect(0, 0, cw, 2); x.fillRect(0, ch - 2, cw, 2); x.fillRect(0, 0, 2, ch); x.fillRect(cw - 2, 0, 2, ch);
    for (let k = 0; k < cw * ch / 400 * (.3 + d); k++) { x.fillStyle = `rgba(${r() < .5 ? '40,30,20' : '60,50,40'},${.08 + r() * .14 * (.5 + d)})`; x.beginPath(); x.ellipse(r() * cw, r() * ch, 2 + r() * 6, 1 + r() * 4, r() * 3, 0, 7); x.fill(); }
    const g = x.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch) * .6); g.addColorStop(0, 'rgba(255,240,220,.06)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); x.fillStyle = g; x.fillRect(0, 0, cw, ch);
    // neve sciolta e impronte vicino all'ingresso
    if (wet) { const [ex, ey] = wet; for (let k = 0; k < 40; k++) { const a = r() * 6.3, rr = r() * 26; x.fillStyle = r() < .7 ? 'rgba(30,34,40,.35)' : 'rgba(230,236,244,.5)'; x.fillRect(Math.floor(ex + Math.cos(a) * rr), Math.floor(ey + Math.sin(a) * rr), 2, 1 + Math.floor(r() * 2)); } }
    return c;
  }

  // =====================================================================================================================
  // PARETI (una tela per lato di muro: lunghezza × 2,9 m)
  // =====================================================================================================================
  const WALLH = 2.9;
  const BICOL = { verde: ['#3e6a58', '#5a7a5e', '#4a6e6a'], blu: ['#3a5a7a', '#4a6488', '#36506a'], ocra: ['#b0884a', '#a87a40', '#c09450'], rosso: ['#7a2a2a', '#8a3430', '#6a2626'], crema: ['#8a6a48', '#7a5a3e', '#9a7a52'], ospedale: ['#8ab0a0', '#9cc0b0', '#86a8a0'], rosa: ['#d08aa0', '#c87a94', '#e0a0b0'], azzurro: ['#6aa0c0', '#7ab0c8', '#5a90b0'] };
  const PAPER = { fiori: ['#c8b08a', '#b4a080', '#a8b090', '#c0a0a0', '#a0a8b8', '#d0bc94'], righe: ['#b8a890', '#a8b0a0', '#c0a088', '#9aa8b0'], rombi: ['#a89a7a', '#b0a088', '#9a9a88', '#b89890'] };
  function wallStyleCanvas(style, lenM, seed, dirt) {
    const r = rng(seed), cw = Math.max(2, Math.round(lenM * PPM)), ch = Math.round(WALLH * PPM), c = mk(cw, ch), x = c.getContext('2d');
    const px = (col, X, Y, w, h) => { x.fillStyle = col; x.fillRect(X, Y, w || 1, h || 1); };
    const fill = col => { x.fillStyle = col; x.fillRect(0, 0, cw, ch); };
    const upper = pick(r, ['#b8b2a4', '#aea898', '#bcb4a4', '#a8a498', '#b0a890']);
    const lowerH = Math.round(1.45 * PPM);
    if (PAPER[style]) {
      const base = pick(r, PAPER[style]); fill(base);
      if (style === 'fiori') { const fc = shade(base, .72), lc = pick(r, ['#8a4a4a', '#5a6a8a', '#6a7a4a', '#9a6a3a']); for (let j = 2; j < ch; j += 7) for (let i = (j / 7 & 1) * 3; i < cw; i += 6) { px(lc, i, j); px(fc, i - 1, j); px(fc, i + 1, j); px(fc, i, j - 1); px(fc, i, j + 1); } }
      if (style === 'righe') { const a = shade(base, .82), b = shade(base, 1.1); for (let i = 0; i < cw; i += 5) { px(a, i, 0, 2, ch); px(b, i + 3, 0, 1, ch); } }
      if (style === 'rombi') { const a = shade(base, .8); for (let j = 0; j < ch; j += 6) for (let i = (j / 6 & 1) * 3; i < cw; i += 6) { px(a, i, j); px(a, i - 1, j + 1); px(a, i + 1, j + 1); px(a, i, j + 2); } }
      for (let i = 0; i < cw; i += 8) px('rgba(0,0,0,.08)', i, 0, 1, ch);   // giunte dei rotoli
      px(shade(base, .6), 0, 3, cw, 1);                                     // bordura
      // carta strappata: si vede l'intonaco
      for (let k = 0; k < lenM * (.3 + dirt); k++) { const X = Math.floor(r() * cw), Y = Math.floor(r() * ch * .8), w = 2 + Math.floor(r() * 6), h = 2 + Math.floor(r() * 8); px('#cfc6b4', X, Y, w, h); px('rgba(0,0,0,.2)', X, Y + h, w, 1); }
    } else if (BICOL[style]) {
      const low = pick(r, BICOL[style]); fill(upper); px(low, 0, ch - lowerH, cw, lowerH); px(shade(low, .55), 0, ch - lowerH - 1, cw, 1); px(shade(low, 1.25), 0, ch - lowerH + 1, cw, 1);
      for (let k = 0; k < lenM * 2 * (.3 + dirt); k++) px(shade(low, 1.4), Math.floor(r() * cw), ch - lowerH + Math.floor(r() * lowerH), 1 + Math.floor(r() * 3), 1);   // vernice scrostata
    } else if (style === 'piastrelle') {
      fill(upper); const t = pick(r, ['#e8e8e0', '#dce4e0', '#e0dcd0']), th = Math.round(1.7 * PPM);
      px(shade(t, .7), 0, ch - th, cw, th); for (let j = ch - th; j < ch; j += 3) for (let i = (j & 1) ? 0 : 1; i < cw; i += 3) px(r() < .03 ? shade(t, .6) : t, i, j, 2, 2);
      px(shade(t, .55), 0, ch - th - 1, cw, 1);
    } else if (style === 'mattoni') {
      fill('#6a3a2a'); for (let j = 0; j < ch; j += 3) for (let i = (j / 3 & 1) * 3 - 3; i < cw; i += 6) px(pick(r, ['#8a4a34', '#7a4030', '#9a5a3e', '#6e3a2a', '#8e5038']), i, j, 5, 2);
      for (let k = 0; k < lenM * .6; k++) { const X = Math.floor(r() * cw), Y = Math.floor(r() * ch), w = 4 + Math.floor(r() * 10), h = 4 + Math.floor(r() * 10); px('#b8ae9c', X, Y, w, h); }
    } else if (style === 'cemento') {
      fill('#7a7872'); for (let k = 0; k < cw * ch / 5; k++) px(shade('#7a7872', .85 + r() * .3), Math.floor(r() * cw), Math.floor(r() * ch), 2, 1); for (let j = 8; j < ch; j += 12) px('rgba(0,0,0,.15)', 0, j, cw, 1);
    } else if (style === 'legno') {
      const w0 = pick(r, ['#5a3a24', '#6a4228', '#4e3220']); fill(upper); const h = Math.round(1.5 * PPM);
      for (let i = 0; i < cw; i += 4) px(shade(w0, .9 + r() * .2), i, ch - h, 3, h); px(shade(w0, .6), 0, ch - h - 1, cw, 2);
    } else if (style === 'velluto') {
      fill('#5a1420'); for (let i = 0; i < cw; i += 4) { px('#6e1a28', i, 0, 2, ch); px('#44101a', i + 3, 0, 1, ch); } px('#c8a040', 0, ch - Math.round(1 * PPM), cw, 1); px('#c8a040', 0, 4, cw, 1);
    } else if (style === 'nero') {
      fill('#16121c'); for (let k = 0; k < cw * ch / 30; k++) px(pick(r, ['#ff4fa3', '#35e6ff', '#2a2034', '#2a2034', '#2a2034']), Math.floor(r() * cw), Math.floor(r() * ch));
    } else if (style === 'perline') {
      fill('#b0844a'); for (let j = 0; j < ch; j += 3) { px(shade('#b0844a', .9 + r() * .2), 0, j, cw, 2); px('#7a5430', 0, j + 2, cw, 1); }
    } else {   // calce
      fill(upper); for (let k = 0; k < cw * ch / 7; k++) px(shade(upper, .9 + r() * .12), Math.floor(r() * cw), Math.floor(r() * ch), 2, 1);
    }
    // macchie d'acqua e muffa in alto, segni in basso, crepe, battiscopa
    for (let k = 0; k < lenM * .25 * (.4 + dirt); k++) { const X = r() * cw, g = x.createRadialGradient(X, 0, 0, X, 0, 6 + r() * 14); g.addColorStop(0, 'rgba(90,70,40,.35)'); g.addColorStop(1, 'rgba(90,70,40,0)'); x.fillStyle = g; x.fillRect(0, 0, cw, ch * .5); }
    for (let k = 0; k < lenM * (.5 + dirt * 2); k++) px('rgba(30,24,20,.25)', Math.floor(r() * cw), ch - 3 - Math.floor(r() * 12), 1 + Math.floor(r() * 4), 1);
    for (let k = 0; k < lenM * .2 * (.3 + dirt); k++) { let X = r() * cw, Y = r() * ch * .6; for (let s = 0; s < 14; s++) { px('rgba(20,16,12,.45)', Math.floor(X), Math.floor(Y)); X += r() * 2 - 1; Y += 1; } }
    if (dirt > .5) { const g = x.createLinearGradient(0, ch, 0, ch - 14); g.addColorStop(0, 'rgba(40,50,30,.4)'); g.addColorStop(1, 'rgba(40,50,30,0)'); x.fillStyle = g; x.fillRect(0, ch - 14, cw, 14); }
    px(style === 'velluto' || style === 'nero' ? '#0e0a10' : '#3a2a20', 0, ch - 2, cw, 2);
    return c;
  }

  // =====================================================================================================================
  // TELE PER LE COSE APPESE (manifesti, ritratto, tappeto, mappa…)
  // =====================================================================================================================
  const CANV = {};
  function canv(key, w, h, draw) { if (CANV[key]) return CANV[key]; const c = mk(w, h), x = c.getContext('2d'); draw(x, w, h); return (CANV[key] = tex(c)); }
  const eye = (x, cx, cy, s, col, pupil) => { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, s, s * .55, 0, 0, 7); x.fill(); x.fillStyle = pupil; x.beginPath(); x.arc(cx, cy, s * .32, 0, 7); x.fill(); x.fillStyle = col; x.fillRect(cx - s * .08, cy - s * .12, s * .12, s * .12); };
  const T = {
    garante: () => canv('garante', 28, 34, (x, w, h) => {   // il Garante: un uomo senza volto in divisa, berretto, la mostrina con l'occhio
      x.fillStyle = '#2a2a30'; x.fillRect(0, 0, w, h); const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4a4a54'); g.addColorStop(1, '#1e1e24'); x.fillStyle = g; x.fillRect(2, 2, w - 4, h - 4);
      x.fillStyle = '#5a5e58'; x.beginPath(); x.moveTo(4, h - 2); x.lineTo(7, 22); x.lineTo(w - 7, 22); x.lineTo(w - 4, h - 2); x.fill();
      x.fillStyle = '#c8b49a'; x.fillRect(11, 11, 6, 9); x.fillStyle = '#3a3a3e'; x.fillRect(9, 8, 10, 4); x.fillRect(8, 11, 12, 1); x.fillStyle = '#b02a2a'; x.fillRect(13, 9, 2, 2);
      x.fillStyle = '#7a6a5a'; x.fillRect(12, 15, 4, 1); x.fillStyle = '#c8302a'; x.fillRect(9, 25, 3, 2); x.fillStyle = '#d8c060'; x.fillRect(16, 25, 4, 1); x.fillRect(16, 27, 4, 1);
    }),
    manifesto: v => canv('man' + v, 20, 28, (x, w, h) => {
      const bg = ['#b02a2a', '#d8c8a8', '#1e1e24', '#c8a040'][v % 4], fg = ['#f0e4cc', '#b02a2a', '#c8302a', '#1e1e24'][v % 4];
      x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg;
      if (v % 3 === 0) { eye(x, w / 2, 10, 7, fg, bg); } else if (v % 3 === 1) { x.beginPath(); x.moveTo(w / 2, 3); x.lineTo(w - 4, 16); x.lineTo(4, 16); x.fill(); x.fillStyle = bg; x.fillRect(w / 2 - 1, 8, 2, 6); } else { x.fillRect(3, 4, w - 6, 3); x.fillRect(5, 9, 4, 9); x.fillRect(11, 9, 4, 9); x.fillRect(3, 18, w - 6, 1); }
      for (let k = 0; k < 3; k++) x.fillRect(3, 20 + k * 2.6, (w - 6) * (k === 2 ? .6 : 1), 1.4);
      x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(0, 0, w, 1); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(w - 3, h - 4, 3, 4);
    }),
    tappeto: v => canv('tap' + v, 32, 22, (x, w, h) => {   // il tappeto appeso al muro, quello di ogni casa sovietica
      const pal = [['#7a1a20', '#c8a060', '#1e2a4a', '#e8d8b0'], ['#5a1a3a', '#d8b070', '#2a4a3a', '#f0e0c0'], ['#8a2a1a', '#e0c080', '#3a2a4a', '#e8d0a0']][v % 3];
      x.fillStyle = pal[0]; x.fillRect(0, 0, w, h); x.fillStyle = pal[2]; x.fillRect(2, 2, w - 4, h - 4); x.fillStyle = pal[0]; x.fillRect(4, 4, w - 8, h - 8);
      x.fillStyle = pal[1]; for (let i = 3; i < w - 3; i += 3) { x.fillRect(i, 2, 1, 1); x.fillRect(i, h - 3, 1, 1); }
      const cx = w / 2, cy = h / 2; x.fillStyle = pal[2]; x.beginPath(); x.moveTo(cx, 5); x.lineTo(cx + 9, cy); x.lineTo(cx, h - 5); x.lineTo(cx - 9, cy); x.fill();
      x.fillStyle = pal[1]; x.beginPath(); x.moveTo(cx, 8); x.lineTo(cx + 5, cy); x.lineTo(cx, h - 8); x.lineTo(cx - 5, cy); x.fill(); x.fillStyle = pal[3]; x.fillRect(cx - 1, cy - 1, 2, 2);
      [[7, 7], [w - 8, 7], [7, h - 8], [w - 8, h - 8]].forEach(([a, b]) => { x.fillStyle = pal[1]; x.fillRect(a - 1, b, 3, 1); x.fillRect(a, b - 1, 1, 3); });
    }),
    calendario: v => canv('cal' + v, 10, 16, (x, w, h) => { x.fillStyle = '#f0ece0'; x.fillRect(0, 0, w, h); x.fillStyle = ['#4a7aa0', '#b04a3a', '#6a8a4a'][v % 3]; x.fillRect(1, 1, w - 2, 6); x.fillStyle = '#e0d8c0'; x.fillRect(2, 3, 3, 2); x.fillStyle = '#5a5a5a'; for (let j = 8; j < 15; j += 2) for (let i = 1; i < 9; i += 2) x.fillRect(i, j, 1, 1); x.fillStyle = '#c02a2a'; x.fillRect(5, 10, 1, 1); }),
    quadro: v => canv('qua' + v, 20, 14, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, ['#8aa0b8', '#c8a080', '#9ab0a0'][v % 3]); g.addColorStop(1, '#e0dcd0'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = ['#3a5a6a', '#5a4a3a', '#4a6a4a'][v % 3]; x.beginPath(); x.moveTo(0, h * .7); x.lineTo(w * .35, h * .35); x.lineTo(w * .6, h * .6); x.lineTo(w * .8, h * .45); x.lineTo(w, h * .7); x.lineTo(w, h); x.lineTo(0, h); x.fill(); x.fillStyle = '#2a4a6a'; x.fillRect(0, h * .82, w, h * .18); if (v % 2) { x.fillStyle = '#f0e8d0'; x.fillRect(w * .7, h * .2, 2, 2); } }),
    mappa: () => canv('mappa', 34, 20, (x, w, h) => { x.fillStyle = '#c8d8d8'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8c89a'; x.beginPath(); x.moveTo(2, 9); x.bezierCurveTo(8, 4, 20, 6, 32, 8); x.lineTo(32, 13); x.bezierCurveTo(20, 15, 9, 14, 2, 12); x.fill(); x.fillStyle = '#6a8a5a'; x.fillRect(6, 9, 10, 2); x.fillStyle = '#8a7a6a'; x.fillRect(16, 9, 4, 3); x.fillStyle = '#b02a2a'; x.fillRect(26, 7, 1, 7); x.fillRect(22, 10, 2, 2); x.fillStyle = '#2a2a2a'; x.fillRect(12, 10, 1, 1); x.fillRect(19, 11, 1, 1); x.strokeStyle = '#5a5a5a'; x.strokeRect(.5, .5, w - 1, h - 1); }),
    lavagna: () => canv('lav', 32, 16, (x, w, h) => { x.fillStyle = '#2a3a30'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(230,230,220,.75)'; for (let j = 3; j < h - 3; j += 3) x.fillRect(3, j, 6 + ((j * 7) % 18), 1); x.fillRect(22, 4, 6, 6); x.fillStyle = '#2a3a30'; x.fillRect(23, 5, 4, 4); x.fillStyle = '#6a4a2a'; x.fillRect(0, h - 1, w, 1); }),
    risacca: () => canv('ris', 24, 16, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(70,200,220,.95)'; x.lineWidth = 2; x.beginPath(); x.moveTo(2, 11); x.bezierCurveTo(6, 2, 10, 2, 12, 8); x.bezierCurveTo(14, 13, 18, 12, 22, 5); x.stroke(); x.fillStyle = 'rgba(240,240,240,.85)'; x.fillRect(4, 14, 16, 1); }),
    volantini: () => canv('vol', 16, 12, (x, w, h) => { x.clearRect(0, 0, w, h); [[0, 1], [5, 0], [10, 2], [3, 6]].forEach(([a, b], i) => { x.fillStyle = i % 2 ? '#e8e4d8' : '#f4f0e4'; x.fillRect(a, b, 6, 6); x.strokeStyle = '#2a8aa0'; x.beginPath(); x.moveTo(a + 1, b + 4); x.quadraticCurveTo(a + 3, b + 1, a + 5, b + 3); x.stroke(); }); }),
    poster: v => canv('pos' + v, 14, 20, (x, w, h) => { const c = ['#ff4fa3', '#35e6ff', '#ffd23b', '#c05cff', '#e86a2a'][v % 5]; x.fillStyle = '#14101c'; x.fillRect(0, 0, w, h); x.fillStyle = c; x.fillRect(1, 1, w - 2, 2); x.beginPath(); x.arc(w / 2, 9, 4, 0, 7); x.fill(); x.fillStyle = '#14101c'; x.fillRect(w / 2 - 1, 7, 2, 4); x.fillStyle = '#f0f0f0'; x.fillRect(2, 15, w - 4, 1); x.fillRect(3, 17, w - 6, 1); }),
    bacheca: () => canv('bac', 20, 14, (x, w, h) => { x.fillStyle = '#a8804a'; x.fillRect(0, 0, w, h); [[1, 1, 6, 8, '#f0ece0'], [8, 2, 5, 6, '#e8e0b0'], [14, 1, 5, 7, '#f4f0e8'], [3, 9, 8, 4, '#b02a2a'], [13, 9, 6, 4, '#e0e8f0']].forEach(([a, b, c, d, col]) => { x.fillStyle = col; x.fillRect(a, b, c, d); x.fillStyle = 'rgba(0,0,0,.4)'; for (let j = b + 2; j < b + d - 1; j += 2) x.fillRect(a + 1, j, c - 2, 1); x.fillStyle = '#c02a2a'; x.fillRect(a + c / 2, b, 1, 1); }); }),
    tv: () => canv('tvscr', 12, 9, (x, w, h) => { x.fillStyle = '#1a2a3a'; x.fillRect(0, 0, w, h); eye(x, w / 2, h / 2, 4, '#e8eef4', '#1a2a3a'); x.fillStyle = 'rgba(255,255,255,.15)'; for (let j = 0; j < h; j += 2) x.fillRect(0, j, w, 1); }),
    frost: () => canv('frost', 16, 16, (x, w, h) => { x.clearRect(0, 0, w, h); for (let k = 0; k < 120; k++) { const a = Math.random(), b = Math.random(), e = Math.min(a, b, 1 - a, 1 - b); if (Math.random() < .45 - e * 2.2) { x.fillStyle = `rgba(240,248,255,${.4 + Math.random() * .5})`; x.fillRect(Math.floor(a * w), Math.floor(b * h), 1, 1); } } x.fillStyle = 'rgba(30,26,22,.9)'; x.fillRect(7, 0, 2, h); x.fillRect(0, 7, w, 2); }),
    patch: () => canv('patch', 16, 24, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(3, 0); x.lineTo(13, 0); x.lineTo(16, h); x.lineTo(0, h); x.fill(); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(7, 0, 2, h); x.fillRect(0, 8, w, 2); }),
    stuoia: () => canv('stuoia', 16, 12, (x, w, h) => { x.fillStyle = '#ff8a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#6a3a1a'; x.fillRect(2, 2, w - 4, h - 4); for (let j = 3; j < h - 3; j += 2) { x.fillStyle = j % 4 ? '#8a4a22' : '#7a4020'; x.fillRect(3, j, w - 6, 1); } }),
    neon: v => canv('neon' + v, 30, 10, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; const L = [[2, 2, 2, 6], [2, 2, 5, 2], [2, 5, 5, 2], [2, 7, 5, 1], [9, 2, 2, 6], [9, 2, 5, 2], [13, 2, 1, 6], [9, 5, 5, 1], [16, 2, 2, 6], [16, 2, 5, 2], [20, 2, 1, 4], [16, 5, 5, 1], [24, 2, 4, 2], [24, 2, 2, 6]]; L.slice(0, v % 2 ? 14 : 10).forEach(([a, b, c, d]) => x.fillRect(a, b, c, d)); }),
    pozzo: () => canv('pozzo', 16, 16, (x, w, h) => { x.fillStyle = '#08060a'; x.fillRect(0, 0, w, h); for (let k = 0; k < 5; k++) { x.fillStyle = `rgba(150,140,125,${.55 - k * .11})`; x.fillRect(1, 1 + k * 3, w - 2, 1); x.fillStyle = `rgba(60,55,50,${.5 - k * .1})`; x.fillRect(1, 2 + k * 3, w - 2, 2); } x.fillStyle = '#3a2a1e'; x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h); }),
    freccia: up => canv('fr' + up, 16, 16, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = up ? '#ffd23b' : '#5ad2ff'; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h); x.beginPath(); if (up) { x.moveTo(8, 2); x.lineTo(14, 9); x.lineTo(10, 9); x.lineTo(10, 14); x.lineTo(6, 14); x.lineTo(6, 9); x.lineTo(2, 9); } else { x.moveTo(8, 14); x.lineTo(14, 7); x.lineTo(10, 7); x.lineTo(10, 2); x.lineTo(6, 2); x.lineTo(6, 7); x.lineTo(2, 7); } x.fill(); }),
    radar: () => canv('radar', 16, 16, (x, w, h) => { x.fillStyle = '#0a1a10'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a8a4a'; x.beginPath(); x.arc(8, 8, 6, 0, 7); x.stroke(); x.beginPath(); x.arc(8, 8, 3, 0, 7); x.stroke(); x.fillStyle = '#6aff8a'; x.fillRect(11, 5, 1, 1); x.fillRect(5, 10, 1, 1); }),
    oilcloth: v => canv('oil' + v, 8, 8, (x, w, h) => { const c = ['#c83a3a', '#3a6aa0', '#4a8a4a'][v % 3]; for (let j = 0; j < h; j += 2) for (let i = 0; i < w; i += 2) { x.fillStyle = ((i + j) / 2) % 2 ? '#f0ece0' : c; x.fillRect(i, j, 2, 2); } }),
    libri: v => canv('lib' + v, 16, 8, (x, w, h) => { x.fillStyle = '#2a1a10'; x.fillRect(0, 0, w, h); let i = 0; const r = rng(v * 13 + 1); while (i < w) { const bw = 1 + Math.floor(r() * 2); x.fillStyle = pick(r, ['#7a2a2a', '#2a3a6a', '#3a5a3a', '#a08040', '#5a2a4a', '#c8c0a8', '#4a4a4a']); x.fillRect(i, 1 + Math.floor(r() * 2), bw, h - 1); i += bw; } }),
  };
  // un pannello piatto (davanti verso +z) con una tela
  const panelGeo = {}; const plane = (w, h) => { const k = w + 'x' + h; return panelGeo[k] || (panelGeo[k] = new THREE.PlaneGeometry(w, h)); };
  function decal(g, t, w, h, x, y, z, emissive) { const m = new THREE.Mesh(plane(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: .9, emissive: emissive ? '#ffffff' : '#000000', emissiveMap: emissive ? t : null, emissiveIntensity: emissive || 0 })); m.position.set(x, y, z); g.add(m); return m; }

  // =====================================================================================================================
  // GLI OGGETTI FATTI A MANO: gruppo con l'origine sul pavimento (o al centro, per le cose appese), davanti verso +z
  // =====================================================================================================================
  const WOOD = ['#5a3a24', '#6a4228', '#4e3220', '#7a5236'], FAB = ['#7a3a3a', '#3a4a6a', '#5a6a3a', '#8a6a3a', '#6a4a6a', '#4a5a5a', '#8a4a2a'];
  function build(id, r) {
    const g = new THREE.Group(); g.userData.ia = id;
    const B = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(bgeo(w, h, d), typeof c === 'string' ? M(c) : c); m.position.set(x, y + h / 2, z); g.add(m); return m; };
    const C = (r0, h, x, y, z, c, s, r1) => { const m = new THREE.Mesh(cgeo(r0, r1 == null ? r0 : r1, h, s), typeof c === 'string' ? M(c) : c); m.position.set(x, y + h / 2, z); g.add(m); return m; };
    const S = (rad, x, y, z, c, s) => { const m = new THREE.Mesh(sgeo(rad, s), typeof c === 'string' ? M(c) : c); m.position.set(x, y, z); g.add(m); return m; };
    const wood = pick(r, WOOD), fab = pick(r, FAB);
    const legs = (w, d, h, c, t) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B(t || .05, h, t || .05, a * (w / 2 - .06), 0, b * (d / 2 - .06), c));
    const bottle = (x, y, z, c) => { C(.035, .2, x, y, z, M(c || pick(r, ['#2a5a2a', '#5a3a1a', '#3a4a2a', '#c8d8d8']), { roughness: .2 }), 6); C(.012, .07, x, y + .2, z, '#2a2a2a', 5); };
    switch (id) {
      // ---- caldo ----
      case 'st_stufa': {   // stufa di ghisa: il fuoco dietro la grata, il tubo che sale e entra nel muro
        legs(.55, .5, .14, '#1a1a1c', .06); B(.6, .62, .55, 0, .14, 0, M('#26262a', { metalness: .5, roughness: .55 })); B(.66, .05, .6, 0, .76, 0, M('#1c1c1e', { metalness: .5, roughness: .5 }));
        B(.36, .26, .02, 0, .26, .28, '#1a1a1c'); const f = B(.3, .18, .02, 0, .3, .29, GL('#ff6a1a', 2.2)); f.userData.fire = 1; for (let i = 0; i < 4; i++) B(.02, .2, .03, -.11 + i * .075, .29, .3, '#1a1a1c');
        C(.07, 1.85, -.12, .81, -.12, M('#2a2a2c', { metalness: .4 }), 10); B(.14, .14, .5, -.12, 2.58, -.37, M('#2a2a2c', { metalness: .4 }));
        C(.1, .14, .16, .81, .1, M('#8a8a90', { metalness: .6, roughness: .4 }), 10); C(.015, .08, .24, .9, .1, '#8a8a90', 5);
        g.userData.fire = [0, .4, .45]; break;
      }
      case 'ia_focolare': {
        B(1.8, .45, .9, 0, 0, 0, '#7a7068'); B(1.8, 1.6, .25, 0, .45, -.32, '#8a8074'); B(1.4, .9, .05, 0, .45, -.18, '#1a1410'); const f = B(.9, .25, .4, 0, .45, -.05, GL('#ff5a14', 2.4)); f.userData.fire = 1;
        for (let i = 0; i < 4; i++) C(.05, .7, -.3 + i * .2, .5, 0, '#4a3020', 6); B(1.9, .12, .5, 0, 2.05, -.2, '#6a6058'); C(.17, .22, .2, .9, -.05, '#2a2a2a', 10); B(.01, .5, .01, .2, 1.12, -.05, '#1a1a1a');
        g.userData.fire = [0, .6, .1]; break;
      }
      case 'ia_legna': for (let j = 0; j < 3; j++) for (let i = 0; i < 4 - j; i++) { const m = C(.08, .48, -.27 + i * .17 + j * .085, 0, .02, pick(r, ['#5a3a20', '#6a4628', '#4a3018']), 7); m.rotation.x = PI / 2; m.position.y = .08 + j * .14; } break;
      case 'ia_secchio_carbone': C(.15, .3, 0, 0, 0, M('#4a4c50', { metalness: .5 }), 10, .12); for (let i = 0; i < 6; i++) S(.05, (r() - .5) * .16, .3, (r() - .5) * .16, '#121214', 4); break;
      // ---- case ----
      case 'ia_stenka': {   // la parete attrezzata: armadio, vetrina coi cristalli, libri, cassetti
        const v = wood, light = shade(v, 1.35);
        B(2.6, 2.1, .48, 0, 0, 0, v); B(2.64, .08, .52, 0, 2.1, 0, shade(v, .7));
        B(.78, 1.9, .02, -.88, .1, .25, light); B(.02, 1.9, .03, -.88, .1, .26, shade(v, .6)); B(.03, .14, .03, -.92, 1, .27, '#c8b070'); B(.03, .14, .03, -.84, 1, .27, '#c8b070');
        B(.98, .9, .02, 0, 1.1, .25, M('#a8c0c8', { roughness: .1, metalness: .2, transparent: true, opacity: .45 }));
        for (let i = 0; i < 6; i++) C(.03, .12, -.38 + i * .15, 1.35, .1, M('#d8e8f0', { roughness: .1 }), 6); for (let i = 0; i < 4; i++) C(.035, .18, -.3 + i * .2, 1.65, .1, M('#c8e0e8', { roughness: .1 }), 6);
        B(.98, .02, .4, 0, 1.55, 0, shade(v, .8)); decal(g, T.libri(Math.floor(r() * 9)), .96, .4, 0, .85, .245); B(.98, .5, .02, 0, .1, .25, light);
        B(.78, 1.9, .02, .88, .1, .25, light); B(.03, .14, .03, .84, 1, .27, '#c8b070'); for (let k = 0; k < 3; k++) B(.7, .02, .02, .88, .55 + k * .5, .26, shade(v, .6));
        S(.08, .88, 2.25, .05, M('#c8b07a', { metalness: .6, roughness: .3 }), 6); break;
      }
      case 'ia_credenza': { const v = wood; B(1.6, .85, .5, 0, 0, 0, v); B(1.66, .05, .54, 0, .85, 0, shade(v, .7)); [-.4, .4].forEach(x => { B(.74, .7, .02, x, .08, .26, shade(v, 1.3)); B(.03, .1, .03, x + (x < 0 ? .3 : -.3), .45, .28, '#c8b070'); });
        B(1.5, .9, .3, 0, .9, -.08, v); B(1.4, .8, .02, 0, .95, .08, M('#b8d0d8', { roughness: .1, transparent: true, opacity: .4 })); for (let i = 0; i < 5; i++) { const p = C(.12, .02, -.55 + i * .27, 1.1, -.08, '#f0ece4', 12); p.rotation.x = PI / 2.4; } for (let i = 0; i < 6; i++) C(.035, .1, -.55 + i * .22, 1.45, -.05, '#e8eef0', 6); B(1.56, .05, .34, 0, 1.8, -.08, shade(v, .7)); break; }
      case 'ia_armadio': { const v = wood; B(1.2, 2, .58, 0, 0, 0, v); B(1.24, .06, .62, 0, 2, 0, shade(v, .7)); B(.56, 1.85, .02, -.29, .08, .3, shade(v, 1.25)); B(.56, 1.85, .02, .29, .08, .3, M('#a8b4b8', { roughness: .15, metalness: .3 })); B(.03, .16, .03, -.04, 1, .32, '#c8b070'); B(.03, .16, .03, .04, 1, .32, '#c8b070'); if (r() < .5) B(.7, .2, .45, 0, 2.06, 0, pick(r, ['#6a3a2a', '#3a4a5a'])); break; }
      case 'ia_cassapanca': B(1.2, .5, .5, 0, 0, 0, wood); B(1.24, .06, .54, 0, .5, 0, shade(wood, .75)); B(1.1, .05, .02, 0, .3, .26, shade(wood, 1.3)); B(.1, .08, .03, 0, .4, .26, '#8a8a80'); break;
      case 'ia_castello': { const c = M('#4a5248', { metalness: .4, roughness: .5 }); [[-.45, -.98], [.45, -.98], [-.45, .98], [.45, .98]].forEach(([x, z]) => B(.05, 1.8, .05, x, 0, z, c)); [.3, 1.25].forEach(y => { B(.95, .06, 2, 0, y, 0, c); B(.85, .14, 1.9, 0, y + .06, 0, '#c8c4b8'); B(.86, .07, 1.3, 0, y + .2, .3, pick(r, ['#5a6a7a', '#6a5a4a', '#4a5a4a', '#7a3a3a'])); B(.4, .1, .28, 0, y + .22, -.75, '#e8e4dc'); }); for (let k = 0; k < 4; k++) B(.04, .04, .3, .48, .5 + k * .3, .8, c); break; }
      case 'ia_branda': { B(.75, .05, 1.9, 0, .32, 0, '#5a6040'); [[-.33, -.9], [.33, -.9], [-.33, .9], [.33, .9]].forEach(([x, z]) => B(.04, .32, .04, x, 0, z, '#3a3e30')); B(.7, .08, 1.2, 0, .37, .3, '#4a4e44'); B(.36, .09, .25, 0, .38, -.72, '#d8d4c8'); break; }
      case 'ia_lettino': { const c = M('#2a2a2e', { metalness: .5 }); B(.85, .12, 1.95, 0, .35, 0, c); [[-.4, -.95], [.4, -.95], [-.4, .95], [.4, .95]].forEach(([x, z]) => B(.04, .45, .04, x, 0, z, c)); B(.85, .55, .04, 0, .35, -.97, c); for (let i = 0; i < 5; i++) B(.02, .5, .02, -.3 + i * .15, .35, -.97, c); B(.78, .14, 1.85, 0, .47, 0, '#d0ccc0'); B(.8, .08, 1.2, 0, .6, .3, pick(r, FAB)); B(.4, .1, .28, 0, .62, -.7, '#ece8e0'); break; }
      case 'ia_materasso': B(.95, .14, 1.9, 0, 0, 0, '#b8b0a0'); B(.9, .1, 1.1, .03, .14, .35, pick(r, ['#4a4e44', '#6a3a3a', '#3a4a5a'])); B(.4, .1, .3, 0, .14, -.7, '#d0ccc0'); break;
      case 'ia_letto_ospedale': { const c = M('#d8dcdc', { metalness: .4 }); B(.9, .1, 2, 0, .55, 0, c); legs(.9, 2, .55, c, .04); B(.86, .14, 1.9, 0, .65, 0, '#f0f4f4'); B(.9, .4, .04, 0, .55, -.98, c); B(.9, .3, .04, 0, .55, .98, c); B(.85, .06, 1.2, 0, .79, .3, '#b8ccd8'); B(.02, .02, 1.5, .47, .9, 0, c); break; }
      case 'ia_poltrona': { const c = fab; B(.85, .4, .8, 0, .1, 0, c); B(.85, .55, .2, 0, .45, -.3, c); B(.16, .55, .8, -.37, .1, 0, shade(c, .85)); B(.16, .55, .8, .37, .1, 0, shade(c, .85)); B(.3, .02, .2, 0, .9, -.25, '#f0ece0'); legs(.8, .75, .1, '#2a1a10'); break; }
      case 'ia_divano': { const c = fab; B(2.1, .42, .85, 0, .1, 0, c); B(2.1, .55, .22, 0, .48, -.32, c); [-1, 1].forEach(s => B(.2, .58, .85, s * .95, .1, 0, shade(c, .85))); B(.4, .02, .25, -.5, 1.0, -.3, '#f0ece0'); B(.4, .02, .25, .5, 1.0, -.3, '#f0ece0'); legs(2, .8, .1, '#2a1a10'); if (r() < .5) B(.45, .12, .35, .6, .52, .1, pick(r, FAB)); break; }
      case 'ia_tv': { B(.8, .5, .45, 0, .3, 0, M(shade(wood, 1.1), { roughness: .5 })); legs(.7, .4, .3, '#2a2a2a', .03); const s = new THREE.Mesh(plane(.42, .32), new THREE.MeshStandardMaterial({ map: T.tv(), emissive: '#ffffff', emissiveMap: T.tv(), emissiveIntensity: .9 })); s.position.set(-.08, .56, .231); g.add(s); s.userData.screen = 1; B(.14, .3, .02, .28, .4, .228, '#3a3028'); B(.03, .03, .03, .28, .62, .24, '#c8b070'); B(.02, .3, .02, -.1, .8, -.1, '#8a8a8a'); B(.02, .3, .02, .1, .8, -.1, '#8a8a8a'); g.userData.screen = [0, .56, .3]; break; }
      case 'ia_radio_grande': { B(1.1, .75, .45, 0, .15, 0, M(wood, { roughness: .5 })); legs(1, .4, .15, '#2a1a10', .04); B(.6, .4, .02, -.15, .3, .23, '#8a7a5a'); for (let i = 0; i < 6; i++) B(.58, .01, .01, -.15, .34 + i * .06, .24, '#5a4a32'); const d = B(.3, .1, .02, .3, .6, .23, GL('#ffcf7a', .8)); d.userData.dial = 1; B(.06, .06, .03, .3, .38, .24, '#c8b070'); B(.06, .06, .03, .3, .25, .24, '#c8b070'); B(1.12, .04, .47, 0, .9, 0, shade(wood, .7)); break; }
      case 'ia_tavolino': { B(1.1, .04, .8, 0, .72, 0, wood); legs(1, .7, .72, shade(wood, .8)); decal(g, T.oilcloth(Math.floor(r() * 3)), 1.12, .82, 0, .745, 0).rotation.x = -PI / 2; break; }
      case 'ia_tavolino_tondo': { C(.4, .04, 0, .72, 0, M('#e8e0d0'), 14); C(.03, .72, 0, 0, 0, '#2a2a2e', 6); C(.22, .03, 0, 0, 0, '#2a2a2e', 10); if (r() < .5) C(.42, .1, 0, .63, 0, pick(r, ['#c83a3a', '#e8e4dc', '#3a6aa0']), 14, .44); break; }
      case 'ia_tavolo_lungo': B(3.2, .05, .9, 0, .72, 0, wood); legs(3.1, .8, .72, shade(wood, .8)); B(3, .04, .04, 0, .3, 0, shade(wood, .8)); break;
      case 'ia_panca_lunga': B(3, .05, .35, 0, .42, 0, wood); legs(2.9, .3, .42, shade(wood, .8)); break;
      case 'ia_panca_chiesa': B(2, .06, .42, 0, .44, 0, '#4a2e1a'); B(2, .5, .05, 0, .5, -.19, '#4a2e1a'); B(.06, .95, .5, -1, 0, 0, '#3e2616'); B(.06, .95, .5, 1, 0, 0, '#3e2616'); B(2, .04, .1, 0, .12, .1, '#3e2616'); break;
      case 'ia_cucina_gas': { B(.75, .82, .58, 0, 0, 0, '#e8e4d8'); B(.75, .03, .58, 0, .82, 0, '#2a2a2e'); [[-.18, -.13], [.18, -.13], [-.18, .13], [.18, .13]].forEach(([x, z]) => C(.07, .02, x, .85, z, '#1a1a1a', 8)); B(.6, .35, .02, 0, .2, .3, '#3a3a40'); for (let i = 0; i < 4; i++) B(.04, .04, .03, -.24 + i * .16, .65, .3, '#2a2a2a'); C(.13, .5, .5, 0, -.1, M('#c83a2a', { metalness: .3 }), 10); if (r() < .6) C(.13, .18, .18, .87, .13, '#7a7a80', 10, .11); break; }
      case 'ia_lavello': { B(1.2, .1, .6, 0, .78, 0, '#e8e8e4'); B(.5, .02, .4, -.25, .88, 0, '#c8ccd0'); legs(1.15, .55, .78, '#5a5a5a', .04); B(1.2, .62, .02, 0, .1, .28, pick(r, ['#c8a060', '#a85a5a', '#6a8aa0'])); B(.05, .25, .05, -.25, .88, -.25, M('#a8a8b0', { metalness: .7 })); B(.04, .04, .18, -.25, 1.1, -.17, M('#a8a8b0', { metalness: .7 })); break; }
      case 'ia_frigo_vecchio': B(.75, 1.45, .62, 0, 0, 0, M('#ece8de', { roughness: .4 })); B(.77, .2, .64, 0, 1.4, 0, M('#ece8de', { roughness: .4 })); B(.04, .3, .05, .3, .9, .33, M('#b8b8c0', { metalness: .8 })); B(.5, .08, .01, 0, 1.25, .315, '#a0a0a8'); break;
      case 'ia_tinozza': C(.55, .5, 0, 0, 0, M('#9aa0a6', { metalness: .6, roughness: .4 }), 14, .48); C(.5, .02, 0, .42, 0, '#8ab0c0', 14); break;
      case 'ia_bacinella': legs(.5, .4, .7, '#4a4a4a', .03); C(.25, .1, 0, .7, 0, M('#e8ecf0', { roughness: .3 }), 12, .2); C(.2, .02, 0, .75, 0, '#c8d8e0', 12); break;
      case 'ia_secchio': C(.15, .32, 0, 0, 0, M('#8a9096', { metalness: .6, roughness: .4 }), 10, .12); if (r() < .5) { const m = C(.02, 1.1, .05, .3, 0, '#8a6a42', 5); m.rotation.z = .3; } break;
      case 'ia_bucato': { const c = '#8a8a8a'; B(1.2, .02, .02, 0, 1.2, -.2, c); B(1.2, .02, .02, 0, 1.2, .2, c); [[-.6], [.6]].forEach(([x]) => { const a = B(.02, 1.25, .02, x, 0, -.2, c); a.rotation.x = .2; const b = B(.02, 1.25, .02, x, 0, .2, c); b.rotation.x = -.2; }); for (let i = 0; i < 4; i++) B(.22, .4 + r() * .2, .01, -.45 + i * .3, .72, -.2 + (i % 2) * .4, pick(r, ['#e8e4dc', '#6a8ab0', '#c84a4a', '#d8c070', '#7a9a6a'])); break; }
      case 'ia_cesto': C(.22, .3, 0, 0, 0, '#a8844a', 10, .18); for (let i = 0; i < 4; i++) S(.07, (r() - .5) * .2, .32, (r() - .5) * .2, pick(r, ['#8a6a3a', '#5a8a3a', '#c8a050', '#e8e4d8']), 5); break;
      case 'ia_gatto': { const c = pick(r, ['#c8783a', '#5a5a5e', '#1e1e22', '#d8d0c0', '#8a6a4a']); const b = S(.17, 0, .12, 0, c, 8); b.scale.set(1.3, .65, 1); S(.09, .2, .17, .06, c, 6); B(.04, .06, .03, .17, .26, .04, c); B(.04, .06, .03, .25, .26, .04, c); const t = B(.25, .05, .05, -.13, .07, .14, c); t.rotation.y = .6; break; }
      case 'ia_valigia': B(.68, .22, .4, 0, 0, 0, pick(r, ['#6a3a2a', '#3a4a5a', '#7a6040', '#4a3a3a'])); B(.16, .03, .03, 0, .22, 0, '#2a1a10'); B(.7, .02, .41, 0, .11, 0, '#2a1a10'); break;
      case 'ia_stivali': [-.08, .08].forEach(x => { B(.1, .32, .12, x, 0, -.02, '#1e1c1a'); B(.1, .06, .22, x, 0, .04, '#1e1c1a'); }); break;
      case 'ia_giornali': for (let i = 0; i < 4 + Math.floor(r() * 5); i++) { const m = B(.4, .025, .3, (r() - .5) * .04, i * .025, (r() - .5) * .04, pick(r, ['#d8d4c8', '#c8c4b4', '#e0dcd0'])); m.rotation.y = (r() - .5) * .2; } B(.02, .01, .32, 0, .1 + .1 * r(), 0, '#8a7a5a'); break;
      case 'ia_bottiglie': for (let i = 0; i < 3 + Math.floor(r() * 4); i++) { if (r() < .3) { const m = C(.035, .25, (r() - .5) * .35, .035, (r() - .5) * .25, pick(r, ['#2a5a2a', '#5a3a1a']), 6); m.rotation.z = PI / 2; } else bottle((r() - .5) * .35, 0, (r() - .5) * .25); } break;
      case 'ia_casse': { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const c = pick(r, ['#9a7448', '#8a6a40', '#a8845a', '#6a6a4a']); const y = k * .62, o = (r() - .5) * .1; B(.95, .6, .75, o, y, 0, c); for (let s = 0; s < 3; s++) B(.96, .03, .76, o, y + .1 + s * .2, 0, shade(c, .75)); if (r() < .4) B(.3, .12, .01, o, y + .25, .38, k % 2 ? '#2a2a2a' : '#b02a2a'); } break; }
      case 'ia_sacchi': for (let i = 0; i < 2 + Math.floor(r() * 3); i++) { const m = B(.45, .35, .6, -.3 + i * .3 + (r() - .5) * .1, (i > 2 ? .3 : 0), (r() - .5) * .15, pick(r, ['#b8a07a', '#a89070', '#c0aa84'])); m.rotation.y = (r() - .5) * .5; } break;
      case 'ia_bici': { const c = pick(r, ['#2a5a8a', '#8a2a2a', '#2a2a2a']); [-.55, .55].forEach(x => { const w = new THREE.Mesh(new THREE.TorusGeometry(.32, .025, 5, 14), M('#1a1a1a')); w.position.set(x, .34, 0); g.add(w); }); const a = B(1, .04, .04, 0, .5, 0, c); a.rotation.z = .1; const b = B(.04, .5, .04, -.15, .34, 0, c); b.rotation.z = .3; B(.2, .04, .1, -.2, .85, 0, '#1a1a1a'); B(.04, .04, .45, .5, .9, 0, '#8a8a8a'); g.rotation.y = 0; break; }
      case 'ia_carrozzina': { B(.7, .4, .45, 0, .35, 0, pick(r, ['#3a4a6a', '#6a3a4a', '#4a5a4a'])); const cap = C(.24, .45, -.2, .58, 0, '#2a2a3a', 10); cap.rotation.x = PI / 2; [[-.25, -.2], [.25, -.2], [-.25, .2], [.25, .2]].forEach(([x, z]) => { const w = C(.12, .03, x, .12, z, '#1a1a1a', 10); w.rotation.x = PI / 2; }); B(.03, .5, .03, .38, .5, 0, '#8a8a8a'); break; }
      // ---- piccole cose sopra i mobili ----
      case 'ia_samovar': C(.1, .3, 0, 0, 0, M('#c8a050', { metalness: .7, roughness: .3 }), 10, .08); C(.06, .08, 0, .3, 0, M('#c8a050', { metalness: .7 }), 8); B(.06, .03, .03, 0, .1, .11, '#3a2a1a'); C(.05, .04, 0, .38, 0, '#f0ece4', 8); break;
      case 'ia_moka': C(.045, .09, 0, 0, 0, M('#9a9aa0', { metalness: .7 }), 8, .055); C(.055, .08, 0, .09, 0, M('#9a9aa0', { metalness: .7 }), 8, .04); B(.02, .06, .05, .06, .08, 0, '#1a1a1a'); break;
      case 'ia_macchina_scrivere': B(.4, .1, .3, 0, 0, 0, '#2a2e2a'); B(.38, .06, .12, 0, .08, -.06, '#3a3e3a'); C(.03, .42, 0, .15, -.1, '#1a1a1a', 8).rotation.z = PI / 2; B(.3, .2, .01, 0, .15, -.14, '#f0ece0'); break;
      case 'ia_telefono': B(.2, .07, .22, 0, 0, 0, '#1a1a1c'); C(.06, .01, 0, .07, .03, '#d8d0c0', 10); B(.22, .05, .06, 0, .08, -.06, '#1a1a1c'); break;
      case 'ia_lampada_tavolo': { C(.07, .02, 0, 0, 0, '#8a6a3a', 8); C(.012, .3, 0, .02, 0, M('#c8a050', { metalness: .6 }), 5); const sh = C(.06, .1, 0, .3, .04, GL('#2a6a3a', .2), 8, .14); sh.rotation.x = -.3; S(.035, 0, .3, .05, GL('#ffe0a0', 3), 5); g.userData.lamp = [0, .3, .05]; break; }
      case 'ia_pila_carte': for (let i = 0; i < 5; i++) B(.24, .015, .32, (r() - .5) * .02, i * .016, (r() - .5) * .02, i % 2 ? '#e8e4d8' : '#d8d0c0'); B(.25, .02, .33, 0, .08, 0, pick(r, ['#c8b080', '#a8b8c8'])); break;
      case 'ia_pila_libri': for (let i = 0; i < 4 + Math.floor(r() * 5); i++) { const m = B(.3 - r() * .08, .05, .22, (r() - .5) * .05, i * .052, (r() - .5) * .04, pick(r, ['#7a2a2a', '#2a3a6a', '#3a5a3a', '#a08040', '#c8c0a8'])); m.rotation.y = (r() - .5) * .4; } break;
      case 'ia_giradischi': B(.4, .1, .35, 0, 0, 0, '#5a3a24'); C(.14, .01, -.03, .1, 0, '#1a1a1a', 14); B(.02, .02, .18, .14, .11, .02, '#c8c8c8'); break;
      case 'ia_bilancia': B(.3, .06, .2, 0, 0, 0, '#e8e4dc'); C(.12, .01, 0, .2, 0, M('#c8c8d0', { metalness: .7 }), 12); B(.04, .14, .04, 0, .06, 0, '#e8e4dc'); B(.16, .12, .03, 0, .1, -.08, '#f0ece4'); break;
      case 'ia_candela': { C(.02, .14, 0, 0, 0, '#f0e8d0', 6); const f = S(.018, 0, .16, 0, GL('#ffb84a', 3), 4); f.scale.y = 1.6; g.userData.candle = [0, .2, 0]; break; }
      case 'ia_posacenere': C(.06, .025, 0, 0, 0, M('#a8b0b8', { roughness: .2, metalness: .3 }), 8); B(.06, .01, .01, .03, .025, 0, '#e8e0d0'); break;
      case 'ia_bicchieri': for (let i = 0; i < 3; i++) C(.03, .08, -.08 + i * .08, 0, (r() - .5) * .06, M('#d8e8f0', { roughness: .1, transparent: true, opacity: .7 }), 6); break;
      case 'ia_radiolina': B(.24, .14, .08, 0, 0, 0, pick(r, ['#c83a2a', '#e8e0c8', '#2a4a6a'])); B(.12, .08, .01, -.04, .03, .041, '#4a4a4a'); C(.004, .25, .09, .14, 0, '#c8c8c8', 4); break;
      case 'ia_vaso': C(.06, .15, 0, 0, 0, pick(r, ['#3a6a8a', '#c8b8a0', '#8a3a2a']), 8, .04); for (let i = 0; i < 3; i++) { const s = C(.006, .2, (r() - .5) * .05, .14, (r() - .5) * .05, '#6a5a3a', 3); S(.025, s.position.x, .36, s.position.z, '#8a5a4a', 4); } break;
      case 'ia_carte_gioco': for (let i = 0; i < 5; i++) { const m = B(.06, .004, .09, (r() - .5) * .3, .002 * i, (r() - .5) * .3, i % 2 ? '#f0ece4' : '#a02a2a'); m.rotation.y = r() * 3; } B(.1, .03, .1, 0, 0, 0, '#2a2a6a'); break;
      case 'ia_pane': for (let i = 0; i < 3; i++) { const m = S(.07, (r() - .5) * .2, .05, (r() - .5) * .1, '#c8904a', 6); m.scale.set(1.4, .7, 1); } break;
      // ---- bar, botteghe ----
      case 'ia_bancone_bar': { B(.9, 1.0, .58, 0, 0, 0, shade(wood, .9)); B(.9, .7, .02, 0, .15, .3, shade(wood, 1.3)); B(.9, .15, .02, 0, 0, .3, '#1e1814'); B(.94, .05, .66, 0, 1.0, .02, M('#d8d0c4', { roughness: .3 })); B(.9, .03, .03, 0, .12, .36, M('#b8a050', { metalness: .7 })); break; }
      case 'ia_scaffale_bottiglie': { B(2.2, 2.1, .3, 0, 0, -.02, shade(wood, .8)); B(2.1, .55, .02, 0, 1.3, .14, M('#a8b8c0', { roughness: .1, metalness: .4 })); for (let s = 0; s < 3; s++) { B(2.15, .03, .3, 0, .35 + s * .42, 0, shade(wood, .6)); for (let i = 0; i < 12; i++) if (r() < .85) bottle(-.95 + i * .17, .38 + s * .42, .03, pick(r, ['#2a5a2a', '#5a3a1a', '#d8c070', '#c8d8d8', '#8a1a2a', '#3a2a5a'])); } B(2.2, .2, .32, 0, 1.95, 0, shade(wood, .7)); break; }
      case 'ia_scaffale_merci': { const c = '#8a8e88'; B(1.6, .04, .44, 0, .1, 0, c); [[-.78], [.78]].forEach(([x]) => B(.04, 1.9, .44, x, 0, 0, c)); B(1.6, 1.9, .02, 0, 0, -.21, shade(c, .8)); for (let s = 0; s < 4; s++) { B(1.56, .03, .42, 0, .14 + s * .45, 0, c); let x = -.7; while (x < .7) { const w = .1 + r() * .12, h = .12 + r() * .2, col = pick(r, ['#c8b48a', '#8a4a2a', '#d8d0c0', '#b02a2a', '#3a5a8a', '#e0c070', '#5a7a4a', '#9a9aa0']); if (r() < .85) { const yy = .17 + s * .45, k0 = r(); if (k0 < .3) { C(w / 2.2, h, x + w / 2, yy, 0, M('#b8bcc0', { metalness: .8, roughness: .35 }), 8); C(w / 2.2 + .002, h * .7, x + w / 2, yy + h * .15, 0, col, 8); } else if (k0 < .5) { C(w / 2.3, h, x + w / 2, yy, 0, M('#e0eef0', { roughness: .05, transparent: true, opacity: .4 }), 8); C(w / 2.6, h * .75, x + w / 2, yy + .005, 0, col, 8); C(w / 2.2, .02, x + w / 2, yy + h, 0, '#c8a040', 8); } else B(w, h, .25, x + w / 2, yy, 0, col); }   /* [roba] lattine con l'etichetta, vasetti di vetro, scatole */ x += w + .03; } } break; }
      case 'ia_vetrina_frigo': { B(1.6, .8, .8, 0, 0, 0, '#e8e8e4'); B(1.6, .06, .8, 0, .8, 0, '#c8c8c8'); const gl = B(1.5, .5, .02, 0, .85, .2, M('#c8e8f8', { transparent: true, opacity: .35, roughness: .05 })); gl.rotation.x = -.5; B(1.5, .04, .7, 0, .82, -.05, GL('#d8f4ff', .6)); for (let i = 0; i < 6; i++) B(.2, .08, .25, -.6 + i * .24, .86, -.05, pick(r, ['#e8c8b0', '#c86a5a', '#f0e8c8', '#a85a4a', '#d8b890'])); B(1.6, .12, .02, 0, .1, .41, '#3a6aa0'); g.userData.cold = [0, .9, 0]; break; }
      case 'ia_cassette_frutta': for (let k = 0; k < 2 + Math.floor(r() * 2); k++) { const x = -.42 + k * .44, y = k > 1 ? .22 : 0, col = pick(r, ['#c83a2a', '#6a9a3a', '#8a6a3a', '#e0b040', '#5a8a4a']); B(.4, .22, .55, x, y, 0, '#a8844a'); for (let i = 0; i < 6; i++) S(.06, x + (i % 2 - .5) * .14, y + .26, -.18 + Math.floor(i / 2) * .16, col, 5); } break;
      case 'ia_jukebox': { B(.9, 1.1, .6, 0, 0, 0, '#5a2a1a'); const t = C(.45, .6, 0, 1.1, 0, '#6a3020', 12); t.rotation.x = PI / 2; t.scale.set(1, 1, 1); t.position.y = 1.1; B(.7, .5, .02, 0, .5, .31, GL('#ffb04a', 1.2)); for (let i = 0; i < 3; i++) B(.04, .9, .02, -.3 + i * .3, .15, .32, GL(['#ff4fa3', '#35e6ff', '#ffd23b'][i], 1.5)); g.userData.neon = [0, 1, .4, '#ffb04a']; break; }
      case 'ia_poltrona_barbiere': { C(.22, .1, 0, 0, 0, M('#c8c8d0', { metalness: .8, roughness: .3 }), 10); C(.06, .4, 0, .1, 0, M('#c8c8d0', { metalness: .8 }), 8); B(.6, .14, .6, 0, .5, 0, '#8a1a1a'); B(.6, .7, .12, 0, .55, -.28, '#8a1a1a'); B(.24, .16, .1, 0, 1.25, -.28, '#8a1a1a'); B(.08, .1, .55, -.33, .65, 0, M('#c8c8d0', { metalness: .8 })); B(.08, .1, .55, .33, .65, 0, M('#c8c8d0', { metalness: .8 })); B(.4, .04, .2, 0, .2, .35, M('#c8c8d0', { metalness: .8 })); break; }
      case 'ia_biliardo': { B(2.5, .12, 1.4, 0, .78, 0, '#2a6a3a'); B(2.6, .12, .08, 0, .82, -.72, shade(wood, .8)); B(2.6, .12, .08, 0, .82, .72, shade(wood, .8)); B(.08, .12, 1.5, -1.28, .82, 0, shade(wood, .8)); B(.08, .12, 1.5, 1.28, .82, 0, shade(wood, .8)); B(2.4, .1, 1.3, 0, .68, 0, shade(wood, .7)); legs(2.3, 1.2, .7, shade(wood, .7), .14); for (let i = 0; i < 6; i++) S(.04, (r() - .5) * 2, .94, (r() - .5) * 1.1, pick(r, ['#f0ece0', '#c83a2a', '#e8c030', '#2a3a8a', '#1a1a1a']), 6); const q = B(1.5, .03, .03, .3, .94, .4, '#c8a060'); q.rotation.y = .3; break; }
      case 'ia_schedario': { const c = pick(r, ['#6a7468', '#7a7a74', '#5a6a6a']); B(.5, 1.32, .6, 0, 0, 0, M(c, { metalness: .4, roughness: .5 })); for (let k = 0; k < 4; k++) { B(.44, .3, .02, 0, .04 + k * .32, .3, M(shade(c, 1.1), { metalness: .4 })); B(.12, .03, .02, 0, .26 + k * .32, .315, '#c8c8c0'); B(.1, .05, .01, 0, .2 + k * .32, .315, '#e8e4d8'); } break; }
      case 'ia_armadietti': { const c = pick(r, ['#5a6a5a', '#6a7078', '#4a5a6a']); for (let i = 0; i < 3; i++) { B(.48, 1.85, .48, -.5 + i * .5, 0, 0, M(c, { metalness: .4, roughness: .5 })); for (let k = 0; k < 4; k++) B(.3, .02, .01, -.5 + i * .5, 1.5 + k * .06, .245, shade(c, .6)); B(.03, .12, .02, -.32 + i * .5, 1, .25, '#c8c8c0'); } break; }
      case 'ia_scaffale_metallo': { const c = '#5a6a7a'; [-1.15, 1.15].forEach(x => [-.25, .25].forEach(z => B(.05, 2.2, .05, x, 0, z, c))); for (let s = 0; s < 4; s++) { B(2.35, .04, .58, 0, .15 + s * .65, 0, '#7a7a74'); for (let i = 0; i < 4; i++) if (r() < .7) B(.45, .35 + r() * .2, .45, -.85 + i * .57, .19 + s * .65, 0, pick(r, ['#b8966a', '#9a7448', '#6a6a5a', '#8a3a2a', '#3a5a6a'])); } break; }
      case 'ia_bidone': { const c = pick(r, ['#2a4a7a', '#8a2a1a', '#4a5a2a', '#6a6a6a', '#c88a2a']); C(.3, .9, 0, 0, 0, M(c, { metalness: .5, roughness: .5 }), 12); C(.31, .03, 0, .3, 0, shade(c, .7), 12); C(.31, .03, 0, .6, 0, shade(c, .7), 12); break; }
      // ---- regime ----
      case 'ia_bandiera': { C(.15, .05, 0, 0, 0, '#2a2a2a', 8); C(.025, 2.4, 0, 0, 0, M('#c8a040', { metalness: .6 }), 6); S(.05, 0, 2.42, 0, M('#c8a040', { metalness: .6 }), 6); const fl = B(.02, 1.1, .7, 0, 1.2, .37, '#a82a2a'); B(.025, .25, .7, 0, 1.6, .37, '#1e1e22'); S(.15, .02, 1.75, .37, '#e8dcc0', 8).scale.set(.2, 1, 1); break; }
      case 'ia_busto': { B(.5, 1.1, .5, 0, 0, 0, '#d8d0c4'); B(.56, .06, .56, 0, 1.1, 0, '#c8c0b4'); const b = S(.24, 0, 1.3, 0, M('#4a4038', { metalness: .6, roughness: .4 }), 8); b.scale.set(1.3, .6, .8); S(.13, 0, 1.55, .02, M('#4a4038', { metalness: .6, roughness: .4 }), 8); B(.26, .06, .26, 0, 1.64, 0, M('#3a3028', { metalness: .6 })); break; }
      case 'ia_palco': { B(5, .6, 2.2, 0, 0, 0, '#3a2418'); B(5, .04, 2.2, 0, .6, 0, '#5a3a24'); B(1.2, .2, .4, 0, 0, 1.25, '#3a2418'); B(1.2, .2, .4, 0, .2, 1.1, '#3a2418'); for (let i = 0; i < 8; i++) B(.6, 2.4, .1, -2.2 + i * .63, .6, -1.05, i % 2 ? '#7a1420' : '#8a1a28'); B(5, .3, .12, 0, 3, -1, '#5a0e18'); B(.6, 1.1, .45, 0, .6, .1, '#4a2a1a'); C(.015, .4, .1, 1.7, .25, '#1a1a1a', 5); S(.04, .1, 2.1, .25, '#2a2a2a', 6); B(.3, .3, .02, 0, 1.25, .33, '#c8a040'); break; }
      case 'ia_vetrina': { B(1.4, .9, .7, 0, 0, 0, '#3a2418'); B(1.36, .7, .66, 0, .9, 0, M('#c8e0e8', { transparent: true, opacity: .25, roughness: .05 })); for (let i = 0; i < 3; i++) B(.2 + r() * .2, .1 + r() * .25, .15, -.4 + i * .4, .9, 0, pick(r, ['#c8a040', '#a82a2a', '#e8dcc0', '#4a4a4a'])); B(1.42, .04, .72, 0, 1.6, 0, '#3a2418'); break; }
      case 'ia_scrivania_grande': B(2.2, .06, 1, 0, .76, 0, '#3a2014'); B(.5, .76, .9, -.8, 0, 0, '#3a2014'); B(.5, .76, .9, .8, 0, 0, '#3a2014'); B(1.6, .02, .7, 0, .82, 0, '#2a4a3a'); B(1.1, .5, .04, 0, .26, -.45, '#3a2014'); break;
      case 'ia_mappa_tavolo': { B(2.2, .06, 1.4, 0, .82, 0, '#4a3020'); legs(2.1, 1.3, .82, '#3a2014', .1); const m = decal(g, T.mappa(), 2, 1.2, 0, .855, 0); m.rotation.x = -PI / 2; for (let i = 0; i < 5; i++) C(.025, .06, (r() - .5) * 1.6, .86, (r() - .5) * .9, i < 3 ? '#b02a2a' : '#2a6a8a', 6); break; }
      case 'ia_ricetrasmittente': { B(1.4, .06, .65, 0, .74, 0, '#5a5e58'); legs(1.3, .6, .74, '#3a3e3a', .05); B(.6, .4, .4, -.35, .8, -.08, '#3a4a3a'); B(.5, .35, .35, .3, .8, -.1, '#4a4e44'); for (let i = 0; i < 4; i++) B(.06, .06, .02, -.55 + i * .13, .95, .13, GL(['#6aff8a', '#ffb84a', '#ff4a4a', '#6aff8a'][i], 1.5)); C(.07, .02, .3, 1.0, .08, '#c8c8c0', 10).rotation.x = PI / 2; C(.01, .8, .5, 1.15, -.2, '#8a8a8a', 4); B(.08, .2, .06, .1, .8, .2, '#1a1a1a'); g.userData.blink = 1; break; }
      case 'ia_quadro_comandi': { B(2, .8, .6, 0, 0, 0, '#5a6a6a'); const p = B(2, .45, .04, 0, .85, 0, '#4a5858'); p.rotation.x = -.6; p.position.z = .12; for (let i = 0; i < 14; i++) B(.05, .05, .02, -.85 + (i % 7) * .28, .92 + Math.floor(i / 7) * .14, .2 - Math.floor(i / 7) * .08, GL(pick(r, ['#6aff8a', '#ff4a4a', '#ffb84a', '#4ab8ff']), 1.4)); for (let i = 0; i < 3; i++) C(.07, .02, -.6 + i * .6, 1.25, -.1, '#e8e4d8', 10).rotation.x = PI / 2.5; B(2, .5, .1, 0, 1.15, -.25, '#4a5858'); g.userData.blink = 1; break; }
      case 'ia_lanterna_faro': { C(.9, .3, 0, 0, 0, '#3a3a3a', 12); for (let k = 0; k < 4; k++) C(.6 - k * .05, .25, 0, .3 + k * .25, 0, GL('#fff0b0', 1.2 + k * .2), 12); C(.3, .4, 0, 1.3, 0, '#2a2a2a', 10, .1); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; B(.04, 1.4, .04, Math.cos(a) * .95, .3, Math.sin(a) * .95, '#8a7a4a'); } g.userData.lantern = [0, .9, 0]; break; }
      // ---- chiesa, scuola, svago ----
      case 'ia_altare': B(2, 1, .9, 0, 0, 0, '#d8d0c0'); B(2.1, .06, 1, 0, 1, 0, '#e8e0cc'); B(2.05, .4, .02, 0, .6, .47, '#e8e4dc'); B(2.05, .06, .02, 0, .6, .48, '#c8a040'); B(.06, .7, .06, 0, 1.06, -.2, '#c8a040'); B(.36, .06, .06, 0, 1.5, -.2, '#c8a040'); break;
      case 'ia_candelabro': { C(.12, .04, 0, 0, 0, '#c8a040', 8); C(.02, 1.2, 0, 0, 0, M('#c8a040', { metalness: .6 }), 6); for (let i = -1; i <= 1; i++) { C(.02, .12, i * .1, 1.2, 0, '#f0e8d0', 6); const f = S(.018, i * .1, 1.34, 0, GL('#ffb84a', 3), 4); f.scale.y = 1.6; } g.userData.candle = [0, 1.35, 0]; break; }
      case 'ia_confessionale': B(1.3, 2.1, 1, 0, 0, 0, '#3e2616'); B(1.36, .1, 1.04, 0, 2.1, 0, '#2e1a0e'); B(.4, 1.6, .02, -.4, .2, .51, '#6a1a22'); B(.4, 1.6, .02, .4, .2, .51, '#6a1a22'); B(.3, 1.6, .02, 0, .2, .51, '#4a2e1a'); break;
      case 'ia_pianoforte': B(1.5, 1.25, .6, 0, 0, 0, '#141216'); B(1.4, .1, .25, 0, .72, .38, '#141216'); B(1.3, .04, .15, 0, .82, .38, '#f0ece4'); for (let i = 0; i < 18; i++) B(.03, .02, .08, -.6 + i * .07, .85, .35, '#141216'); B(1.5, .05, .62, 0, 1.25, 0, '#1e1a20'); if (r() < .6) C(.04, .2, .4, 1.3, -.1, '#c8b8a0', 6); break;
      case 'ia_banco_scuola': B(.9, .05, .45, 0, .7, .05, '#8a6a42'); B(.9, .3, .04, 0, .45, .26, '#5a4a3a'); legs(.86, .5, .7, '#3a3a3a', .03); B(.9, .05, .3, 0, .42, -.3, '#8a6a42'); B(.9, .35, .04, 0, .45, -.45, '#8a6a42'); break;
      case 'ia_cavalletto': { const a = B(.04, 1.7, .04, -.25, 0, 0, '#8a6a42'); a.rotation.z = .12; const b = B(.04, 1.7, .04, .25, 0, 0, '#8a6a42'); b.rotation.z = -.12; B(.04, 1.6, .04, 0, 0, -.35, '#8a6a42').rotation.x = -.2; B(.6, .04, .08, 0, .7, .03, '#8a6a42'); B(.55, .7, .03, 0, .74, .05, '#f0ece0'); decal(g, T.quadro(Math.floor(r() * 3)), .5, .5, 0, 1.1, .07); break; }
      case 'ia_tele': for (let i = 0; i < 3; i++) { const m = B(.6 + r() * .3, .7 + r() * .3, .03, (r() - .5) * .15, 0, i * .07, pick(r, ['#f0ece0', '#c8b890', '#d8c8b0'])); m.rotation.x = -.15; } break;
      case 'ia_consolle_dj': B(1.8, .9, .7, 0, 0, 0, '#1a1a22'); for (const x of [-.5, .5]) { C(.18, .03, x, .9, 0, '#2a2a2e', 14); C(.15, .01, x, .93, 0, '#0a0a0a', 14); } B(.3, .05, .3, 0, .9, 0, '#3a3a44'); B(1.8, .06, .02, 0, .7, .36, GL('#ff4fa3', 2)); g.userData.neon = [0, 1, .5, '#ff4fa3']; break;
      case 'ia_pista': { const cols = ['#ff4fa3', '#35e6ff', '#ffd23b', '#c05cff', '#2a1a40']; for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) { const c = cols[(i * 3 + j * 7 + Math.floor(r() * 5)) % 5], m = new THREE.Mesh(bgeo(.48, .03, .48), c === '#2a1a40' ? M(c) : GL(c, .9).clone()); m.position.set(-2.25 + i * .5, .015, -1.75 + j * .5); g.add(m); if (c !== '#2a1a40') m.userData.tile = 1; } g.userData.dance = 1; break; }
      case 'ia_sacco_boxe': B(.08, 2.2, .08, -.35, 0, -.25, '#3a3a3a'); B(.5, .06, .06, -.12, 2.15, -.25, '#3a3a3a'); C(.2, .9, 0, .9, -.25, '#7a1a1a', 10); B(.6, .06, .6, -.2, 0, -.25, '#3a3a3a'); break;
      case 'ia_pesi': B(1.2, .05, .35, 0, .45, 0, '#2a2a2a'); legs(1.1, .3, .45, '#3a3a3a', .05); B(.04, .04, 1.5, 0, .9, -.1, '#8a8a8a').rotation.y = PI / 2; [-.6, .6].forEach(x => { const d = C(.18, .05, x, .9, -.1, '#1a1a1a', 12); d.rotation.z = PI / 2; d.position.y = .9; }); break;
      case 'ia_ring': { B(4, .25, 4, 0, 0, 0, '#3a3a5a'); B(3.8, .02, 3.8, 0, .25, 0, '#d8d0c0'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b], i) => B(.1, 1.2, .1, a * 1.9, .25, b * 1.9, ['#b02a2a', '#2a4ab0', '#e8e4dc', '#e8e4dc'][i])); for (let k = 0; k < 3; k++) { const y = .6 + k * .3, col = ['#b02a2a', '#e8e4dc', '#2a4ab0'][k]; B(3.8, .025, .025, 0, y, -1.9, col); B(3.8, .025, .025, 0, y, 1.9, col); B(.025, .025, 3.8, -1.9, y, 0, col); B(.025, .025, 3.8, 1.9, y, 0, col); } break; }
      case 'ia_panca_sauna': B(2.2, .08, .6, 0, .45, 0, '#c8964a'); B(2.2, .45, .05, 0, 0, .27, '#a8783a'); for (let i = 0; i < 5; i++) B(2.2, .02, .06, 0, .53, -.25 + i * .12, '#b8864a'); break;
      case 'ia_barca': { const hull = pick(r, ['#2a5a8a', '#e8e4dc', '#8a2a2a', '#3a6a4a']); for (let i = 0; i < 10; i++) { const t = i / 9, w = 2.2 * Math.sin(Math.max(.15, Math.min(1, (1 - Math.abs(t - .45) * 1.6))) * PI / 2) * (t > .8 ? (1 - t) * 4.5 : 1); B(Math.max(.3, w), .9 - t * .2, .58, 0, .7 + t * .15, -2.6 + t * 5.4, i % 3 ? hull : '#e8e4dc'); } B(.12, .5, 5.6, 0, .55, .1, '#4a3020'); [-1.8, 0, 1.8].forEach(z => { B(1.6, .7, .15, 0, 0, z, '#6a5a44'); }); break; }
      case 'ia_telo': { const c = pick(r, ['#4a5a3a', '#5a5a4a', '#3a4a4a']); const b = S(1, 0, .5, 0, c, 10); b.scale.set(1.25, .85, 1.75); B(2.6, .45, 3.4, 0, 0, 0, c); B(2.65, .02, .04, 0, .9, -.8, '#8a7a5a'); B(2.65, .02, .04, 0, .9, .8, '#8a7a5a'); break; }
      case 'ia_macerie': for (let i = 0; i < 10; i++) { const m = B(.12 + r() * .3, .06 + r() * .18, .1 + r() * .25, (r() - .5) * 1, r() * .1, (r() - .5) * .8, pick(r, ['#8a8074', '#6a5a4a', '#a89a88', '#7a4a3a', '#5a5048'])); m.rotation.set(r(), r() * 3, r()); } break;
      case 'ia_sedia_rotta': { const c = pick(r, WOOD); B(.45, .05, .45, 0, .2, 0, c).rotation.z = .5; B(.45, .5, .05, .15, .05, -.2, c).rotation.z = 1.2; B(.04, .45, .04, -.2, 0, .2, c).rotation.x = .9; break; }
      case 'ia_ciclostile_vecchio': B(.8, .7, .6, 0, 0, 0, '#3a3e44'); C(.18, .5, 0, .85, 0, '#2a2a2e', 12).rotation.z = PI / 2; B(.5, .02, .4, 0, .78, .25, '#e8e4d8'); B(.04, .3, .04, .35, .8, 0, '#8a8a8a'); break;
      case 'ia_botti': for (const x of [-.45, .45]) { const b = C(.38, .75, x, .4, 0, '#6a4228', 12, .34); b.rotation.x = PI / 2; b.position.y = .45; } B(1.8, .1, .7, 0, 0, 0, '#3a2a1a'); break;
      // ---- appese ai muri (origine al centro, dietro sul muro) ----
      case 'ia_ritratto': B(.9, 1.1, .05, 0, -.55, .025, M('#b8963a', { metalness: .6, roughness: .35 })); decal(g, T.garante(), .76, .94, 0, 0, .055); if (r() < .4) B(.2, .5, .02, -.45, -.6, .03, '#a82a2a'); break;
      case 'ia_manifesto': decal(g, T.manifesto(Math.floor(r() * 9)), .7, .98, 0, 0, .01); break;
      case 'ia_tappeto_muro': decal(g, T.tappeto(Math.floor(r() * 6)), 2, 1.38, 0, 0, .012); break;
      case 'ia_calendario': decal(g, T.calendario(Math.floor(r() * 6)), .32, .5, 0, 0, .01); break;
      case 'ia_orologio': { const c = C(.18, .05, 0, -.025, .03, M('#2a2a2e'), 14); c.rotation.x = PI / 2; c.position.set(0, 0, .03); const f = C(.16, .01, 0, 0, .06, M('#f0ece0'), 14); f.rotation.x = PI / 2; f.position.set(0, 0, .06); B(.01, .1, .01, 0, -.02, .07, '#1a1a1a'); B(.07, .01, .01, .03, -.005, .07, '#1a1a1a'); break; }
      case 'ia_specchio': B(.56, .8, .03, 0, -.4, .015, '#5a4a3a'); B(.48, .72, .01, 0, -.36, .035, M('#c8d4dc', { roughness: .05, metalness: .8 })); break;
      case 'ia_specchio_bar': B(1.6, .8, .03, 0, -.4, .015, '#3a2418'); B(1.5, .7, .01, 0, -.35, .035, M('#b8c8d0', { roughness: .05, metalness: .8 })); B(.9, .1, .01, 0, .18, .04, '#c8a040'); break;
      case 'ia_mensola': case 'ia_mensola_alta': { B(1, .03, .22, 0, -.1, .11, wood); B(.03, .12, .2, -.4, -.22, .1, wood); B(.03, .12, .2, .4, -.22, .1, wood); for (let i = 0; i < 5; i++) { if (r() < .5) C(.05, .12 + r() * .06, -.4 + i * .2, -.07, .1, M(pick(r, ['#c8d8d0', '#e8d8a0', '#a8584a', '#5a7a4a']), { roughness: .2 }), 7); else B(.12, .14, .1, -.4 + i * .2, -.07, .1, pick(r, ['#c83a2a', '#e0c070', '#3a5a8a', '#e8e4d8'])); } break; }
      case 'ia_quadro': B(.8, .6, .04, 0, -.3, .02, '#6a4a2a'); decal(g, T.quadro(Math.floor(r() * 6)), .7, .5, 0, 0, .045); break;
      case 'ia_foto': for (let i = 0; i < 5; i++) { const w = .14 + r() * .1, h = .18 + r() * .08, x = -.35 + (i % 3) * .33 + (r() - .5) * .05, y = (i < 3 ? .12 : -.14); B(w + .03, h + .03, .02, x, y - (h + .03) / 2, .01, pick(r, ['#2a2a2a', '#6a4a2a', '#c8a040'])); B(w, h, .01, x, y - h / 2, .025, pick(r, ['#a89a88', '#c8bca8', '#8a7a6a'])); } break;
      case 'ia_icona': B(.4, .5, .03, 0, -.25, .015, '#c8a040'); B(.32, .42, .01, 0, -.21, .035, '#7a2a1a'); S(.06, 0, .08, .045, '#e8c890', 6).scale.z = .2; B(.12, .18, .01, 0, -.18, .045, '#2a3a6a'); B(.5, .03, .18, 0, -.35, .09, wood); { const f = S(.02, .15, -.25, .12, GL('#ff5a2a', 2.5), 4); f.scale.y = 1.4; } g.userData.candle = [0, -.2, .2]; break;
      case 'ia_crocifisso': B(.04, .4, .03, 0, -.2, .015, '#3a2418'); B(.24, .04, .03, 0, .06, .015, '#3a2418'); break;
      case 'ia_mappa': B(1.4, .9, .02, 0, -.45, .01, '#e8e4d8'); decal(g, T.mappa(), 1.34, .84, 0, 0, .025); break;
      case 'ia_bandiera_muro': { B(1.2, .04, .04, 0, .6, .04, M('#c8a040', { metalness: .6 })); B(.9, 1.4, .02, 0, -.8, .04, '#a82a2a'); B(.9, .25, .021, 0, -.1, .04, '#1e1e22'); const c = C(.16, .01, 0, -.2, .055, '#e8dcc0', 12); c.rotation.x = PI / 2; c.position.set(0, -.25, .056); break; }
      case 'ia_stella_regime': { const c = C(.36, .04, 0, 0, .03, '#a82a2a', 12); c.rotation.x = PI / 2; c.position.set(0, 0, .03); const e = S(.16, 0, 0, .06, '#e8dcc0', 10); e.scale.set(1, .55, .2); S(.06, 0, 0, .08, '#1e1e22', 6).scale.z = .3; for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; B(.04, .2, .02, Math.cos(a) * .45, Math.sin(a) * .45 - .1, .03, '#c8a040').rotation.z = a - PI / 2; } break; }
      case 'ia_lavagna': B(2, 1.1, .04, 0, -.55, .02, '#5a3a24'); decal(g, T.lavagna(), 1.9, 1, 0, 0, .045); B(1.9, .04, .08, 0, -.58, .05, '#5a3a24'); break;
      case 'ia_termosifone': for (let i = 0; i < 10; i++) B(.08, .6, .1, -.45 + i * .1, -.3, .1, M('#d8d4c8', { metalness: .3, roughness: .5 })); B(1, .03, .03, 0, .28, .1, '#c8c4b8'); B(1, .03, .03, 0, -.28, .1, '#c8c4b8'); break;
      case 'ia_appendiabiti': { B(1, .08, .04, 0, -.04, .02, wood); for (let i = 0; i < 4; i++) { B(.02, .02, .08, -.38 + i * .25, 0, .06, '#c8c8c0'); if (r() < .75) B(.3, .7 + r() * .3, .08, -.38 + i * .25, -.85, .1, pick(r, ['#3a3a40', '#5a4a3a', '#2a3a4a', '#6a2a2a', '#4a4a3a'])); if (r() < .3) C(.12, .08, -.38 + i * .25, .02, .1, '#2a2a2a', 8); } break; }
      case 'ia_reti': { for (let i = 0; i < 6; i++) { B(.01, 1.1, .01, -.7 + i * .28, -.6, .03, '#6a6a5a'); B(1.6, .01, .01, 0, -.6 + i * .2, .03, '#6a6a5a'); } for (let i = 0; i < 4; i++) S(.06, -.6 + i * .4, .5, .05, '#d8702a', 6); B(1.7, .05, .05, 0, .55, .04, '#5a4a3a'); break; }
      case 'ia_insegna_neon': { const col = pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b', '#ff7a3b']), m = decal(g, T.neon(Math.floor(r() * 2)), 1.3, .44, 0, 0, .05, 2.5); m.material.color.set(col); m.material.emissive.set(col); B(1.35, .5, .03, 0, -.25, .015, '#14101a'); g.userData.neon = [0, 0, .3, col]; break; }
      case 'ia_tv_muro': { B(.1, .1, .4, 0, .05, .2, '#2a2a2a'); B(.7, .55, .45, 0, -.27, .45, '#2a2a30'); const s = new THREE.Mesh(plane(.5, .38), new THREE.MeshStandardMaterial({ map: T.tv(), emissive: '#ffffff', emissiveMap: T.tv(), emissiveIntensity: 1 })); s.position.set(0, 0, .68); g.add(s); s.userData.screen = 1; g.userData.screen = [0, 0, .9]; break; }
      case 'ia_volantini': decal(g, T.volantini(), .8, .6, 0, 0, .01); break;
      case 'ia_scritta_risacca': decal(g, T.risacca(), 1.3, .85, 0, 0, .008); break;
      case 'ia_menu': B(.7, .9, .04, 0, -.45, .02, '#5a3a24'); decal(g, T.lavagna(), .62, .8, 0, 0, .045); break;
      case 'ia_bacheca': B(1.2, .84, .04, 0, -.42, .02, '#5a3a24'); decal(g, T.bacheca(), 1.12, .76, 0, 0, .045); break;
      case 'ia_cassette_posta': for (let i = 0; i < 8; i++) { const x = -.45 + (i % 4) * .3, y = i < 4 ? .12 : -.18; B(.28, .28, .2, x, y - .14, .1, M('#6a6a5a', { metalness: .4 })); B(.18, .03, .01, x, y + .02, .205, '#1a1a1a'); B(.08, .04, .01, x, y - .08, .205, '#e8e4d8'); } break;
      case 'ia_gancio_carne': B(1.4, .05, .05, 0, .1, .1, M('#a8a8b0', { metalness: .7 })); for (let i = 0; i < 4; i++) { B(.02, .15, .02, -.5 + i * .33, -.05, .1, '#a8a8b0'); const m = S(.13, -.5 + i * .33, -.35, .12, pick(r, ['#a83a3a', '#c85a4a', '#8a2a2a']), 6); m.scale.set(.8, 1.6, .7); } break;
      case 'ia_attrezzi_muro': { B(1.5, 1, .03, 0, -.5, .015, '#8a7a5a'); for (let i = 0; i < 8; i++) { const x = -.6 + (i % 4) * .4, y = i < 4 ? .25 : -.2; B(.05, .3 + r() * .15, .03, x, y - .2, .045, pick(r, ['#5a5e66', '#8a6a42', '#c83a2a', '#3a6aa0'])); B(.15, .06, .03, x, y + .05, .045, '#5a5e66'); } break; }
      case 'ia_poster_film': decal(g, T.poster(Math.floor(r() * 5)), .62, .9, 0, 0, .01); break;
      case 'ia_poster_disco': decal(g, T.poster(Math.floor(r() * 5) + 1), .7, 1, 0, 0, .01, .6); break;
      case 'ia_quadro_elettrico': B(.5, .6, .12, 0, -.3, .06, M('#8a8e88', { metalness: .4 })); B(.06, .06, .01, .15, .15, .125, GL('#ff4a2a', 2)); for (let i = 0; i < 3; i++) B(.02, .5, .02, -.15 + i * .08, .3, .03, '#1a1a1a'); break;
      case 'ia_estintore': C(.08, .5, 0, -.25, .1, '#c82a2a', 8); B(.08, .06, .06, 0, .25, .1, '#1a1a1a'); break;
      case 'ia_trofei': B(1.2, .03, .25, 0, -.1, .12, wood); for (let i = 0; i < 5; i++) { const h = .15 + r() * .15; C(.04, h, -.45 + i * .22, -.08, .12, M('#c8a040', { metalness: .8, roughness: .3 }), 6, .07); } break;
      case 'ia_salami': B(1.2, .04, .04, 0, .1, .15, '#4a3020'); for (let i = 0; i < 6; i++) { if (i % 3 === 2) { for (let k = 0; k < 4; k++) S(.04, -.5 + i * .2, -.1 - k * .08, .15, '#e8e0d0', 5); } else C(.04, .45, -.5 + i * .2, -.5, .15, pick(r, ['#8a3a2a', '#7a2a2a', '#a85a3a']), 6); } break;
      case 'ia_altoparlante': { B(.1, .3, .2, 0, -.1, .1, '#3a3a3a'); const h = C(.04, .4, 0, .05, .3, M('#8a8e88', { metalness: .5 }), 10, .2); h.rotation.x = PI / 2 + .3; h.position.set(0, -.05, .38); break; }
      case 'ia_lampada_muro': B(.08, .2, .08, 0, -.1, .04, '#c8a040'); S(.07, 0, .08, .12, GL('#ffd090', 2), 6); g.userData.lamp = [0, .08, .2]; break;
      case 'ia_ventaglio_carte': for (let i = 0; i < 5; i++) { const m = B(.12, .18, .005, -.1 + i * .05, -.1, .01 + i * .002, i % 2 ? '#f0ece4' : '#e8e0d4'); m.rotation.z = -.4 + i * .2; } break;
      case 'ia_tabella_turni': B(.6, .8, .01, 0, -.4, .005, '#e8e4d8'); for (let j = 0; j < 8; j++) B(.5, .01, .002, 0, .3 - j * .09, .012, '#5a5a5a'); B(.01, .7, .002, -.1, -.35, .012, '#5a5a5a'); break;
      case 'ia_schermo_radar': { B(1, .9, .3, 0, -.45, .15, '#3a4a3a'); const m = decal(g, T.radar(), .6, .6, 0, 0, .31, 1.6); g.userData.radar = m; break; }
      case 'ia_pannello_strumenti': { B(1.6, .8, .08, 0, -.4, .04, '#4a5858'); for (let i = 0; i < 6; i++) { const c = C(.1, .02, -.6 + (i % 3) * .6, (i < 3 ? .2 : -.15), .09, '#e8e4d8', 10); c.rotation.x = PI / 2; c.position.set(-.6 + (i % 3) * .6, i < 3 ? .2 : -.15, .09); } break; }
      // ---- [attività] biliardo e freccette, birreria, abiti, armeria, autorimessa ----
      case 'ia_freccette': { const c = C(.24, .04, 0, 0, .03, '#1e1e1e', 20); c.rotation.x = PI / 2; c.position.set(0, 0, .03); for (let i = 0; i < 3; i++) { const k = C(.2 - i * .065, .01, 0, 0, .06 + i * .003, i % 2 ? '#c83a2a' : '#e8dcc0', 20); k.rotation.x = PI / 2; k.position.set(0, 0, .06 + i * .003); }
        const e = C(.02, .01, 0, 0, .075, '#2a8a3a', 8); e.rotation.x = PI / 2; e.position.set(0, 0, .075); B(.6, .6, .02, 0, -.3, .005, '#3a2a1e'); for (let i = 0; i < 3; i++) { const d = B(.01, .01, .12, -.05 + i * .05, .04 - i * .05, .1, '#c8c8c0'); d.rotation.x = .2; } B(.4, .04, .06, 0, -.62, .03, '#5a3a24'); break; }
      case 'ia_stecche': { B(.8, .06, .1, 0, -.6, .05, wood); B(.8, .06, .1, 0, .55, .05, wood); for (let i = 0; i < 5; i++) { const s = C(.014, 1.25, -.32 + i * .16, -.62, .08, pick(r, ['#c8a060', '#8a5a34', '#a87a48']), 6, .009); s.position.y = 0; } B(.1, .1, .1, .3, -.66, .1, '#3a7ad0'); break; }
      case 'ia_trofeo_caccia': { B(.5, .6, .04, 0, -.3, .02, '#4a2e1a'); const h = S(.2, 0, 0, .18, '#4a3628', 8); h.scale.set(.9, 1, 1.4); S(.1, 0, -.08, .38, '#3a2a20', 6).scale.set(1, .8, 1.3); B(.03, .1, .03, -.08, -.14, .44, '#e8e0c8'); B(.03, .1, .03, .08, -.14, .44, '#e8e0c8'); B(.08, .12, .05, -.15, .14, .18, '#3a2a20'); B(.08, .12, .05, .15, .14, .18, '#3a2a20'); break; }
      case 'ia_fucili_muro': { B(1.6, 1.1, .03, 0, -.55, .015, '#5a4630'); B(1.5, .05, .12, 0, -.5, .07, wood); B(1.5, .05, .12, 0, .35, .07, wood); for (let i = 0; i < 5; i++) { const x = -.6 + i * .3; B(.05, .9, .05, x, -.46, .1, '#2a2a2c'); B(.07, .35, .06, x, -.46, .1, pick(r, ['#6a4228', '#5a3a24', '#7a5236'])); B(.02, .55, .02, x, .0, .12, M('#4a4c52', { metalness: .7, roughness: .35 })); } break; }
      case 'ia_insegna_birra': { B(1, .5, .05, 0, -.25, .025, '#1a1a1a'); B(.86, .12, .02, 0, .02, .06, GL('#ffb030', 2)); B(.86, .1, .02, 0, -.18, .06, GL('#ff4a2a', 1.8)); const m = C(.07, .2, -.35, -.2, .07, GL('#ffd040', 1.6), 8); m.position.z = .07; g.userData.neon = [0, 0, .3, '#ffb030']; break; }
      case 'ia_cartello_prezzi': B(.8, 1, .04, 0, -.5, .02, '#3a2a1e'); decal(g, T.lavagna(), .72, .9, 0, 0, .045); break;
      case 'ia_poster_auto': { B(.8, .6, .01, 0, -.3, .005, '#e8dcc0'); B(.6, .14, .012, 0, -.18, .01, pick(r, ['#c82a2a', '#2a5ac8', '#e8a020'])); B(.4, .1, .013, -.02, -.06, .01, '#3a3a40'); C(.06, .013, -.2, -.24, .012, '#1a1a1a', 10).rotation.x = PI / 2; C(.06, .013, .2, -.24, .012, '#1a1a1a', 10).rotation.x = PI / 2; break; }
      case 'ia_spillatore': { B(.5, .06, .18, 0, 0, 0, M('#c8c8d0', { metalness: .8, roughness: .25 })); for (let i = 0; i < 3; i++) { C(.02, .3, -.15 + i * .15, .06, 0, M('#d8d8e0', { metalness: .9, roughness: .2 }), 6); B(.04, .1, .04, -.15 + i * .15, .36, .02, pick(r, ['#1a1a1a', '#a82a2a', '#2a5a2a'])); } break; }
      case 'ia_casse_birra': { const n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const c = pick(r, ['#c8a030', '#3a6a3a', '#a83a2a']), y = k * .3; B(.75, .28, .5, (r() - .5) * .06, y, 0, c); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) C(.03, .06, -.27 + i * .18, y + .28, -.12 + j * .24, '#5a3a1a', 5); } break; }
      case 'ia_stender': { const c = M('#a8a8b0', { metalness: .7, roughness: .3 }); B(.04, 1.55, .04, -.66, 0, 0, c); B(.04, 1.55, .04, .66, 0, 0, c); B(.04, .04, .5, -.66, 0, 0, c); B(.04, .04, .5, .66, 0, 0, c); B(1.36, .03, .03, 0, 1.5, 0, c);
        for (let i = 0; i < 9; i++) { const col = pick(r, ['#3a3a44', '#6a2a2a', '#2a4a6a', '#8a7a5a', '#4a5a3a', '#c8c0b0', '#5a3a5a', '#2a2a2a']), x = -.56 + i * .14; B(.05, .65 + r() * .25, .42, x, 1.5 - .75 - r() * .1, 0, col); B(.01, .06, .01, x, 1.47, 0, c); } break; }
      case 'ia_manichino': { C(.18, .04, 0, 0, 0, '#2a2a2a', 10); C(.02, .9, 0, 0, 0, '#2a2a2a', 6); const col = pick(r, ['#3a3a44', '#6a2a2a', '#2a4a6a', '#8a6a3a', '#4a5a3a']); const t = C(.16, .55, 0, .9, 0, col, 10, .2); t.scale.z = .65; B(.42, .08, .2, 0, 1.4, 0, col); C(.05, .08, 0, 1.48, 0, '#e8dcc8', 6); S(.1, 0, 1.64, 0, '#e8dcc8', 8);
        if (r() < .6) C(.18, .3, 0, .62, 0, pick(r, ['#2a2a2a', '#5a4a3a', '#3a3a5a']), 10, .15); else B(.3, .08, .04, 0, 1.3, .1, pick(r, ['#c83a2a', '#e8e0d0'])); break; }
      case 'ia_tavolo_maglie': { B(1.4, .05, .8, 0, .72, 0, wood); legs(1.3, .7, .72, shade(wood, .8)); for (let i = 0; i < 6; i++) { const col = pick(r, ['#8a2a2a', '#2a4a7a', '#c8b890', '#3a5a3a', '#6a6a6a', '#e8e0d0', '#7a5a8a']), x = -.45 + (i % 3) * .45, z = i < 3 ? -.18 : .18, hh = .05 + Math.floor(r() * 4) * .045; B(.36, hh, .28, x, .77, z, col); } break; }
      case 'ia_scaffale_scarpe': { B(1.4, 1.2, .38, 0, 0, -.02, shade(wood, .9)); for (let s = 0; s < 4; s++) { B(1.36, .02, .36, 0, .05 + s * .3, 0, shade(wood, 1.2)); for (let i = 0; i < 4; i++) if (r() < .8) { const col = pick(r, ['#1e1c1a', '#5a3a24', '#7a5a3a', '#c8c0b0', '#2a2a3a']); [-.05, .05].forEach(d => B(.08, .08, .24, -.48 + i * .32 + d, .07 + s * .3, .02, col)); } } break; }
      case 'ia_camerino': { const c = M(shade(wood, 1.1)); B(1.2, 2, .04, 0, 0, -.58, c); B(.04, 2, 1.2, -.58, 0, 0, c); B(.04, 2, 1.2, .58, 0, 0, c); B(1.2, .04, .04, 0, 1.96, .58, M('#c8b070', { metalness: .6 })); B(.6, 1.75, .02, -.28, .2, .56, pick(r, ['#8a2a3a', '#3a4a6a', '#5a6a3a'])); B(.4, 1.2, .02, 0, .5, -.55, M('#c8d8e0', { roughness: .1, metalness: .4 })); B(.3, .03, .2, .3, 1.2, -.45, wood); break; }
      case 'ia_vetrina_armi': { B(1.8, .8, .66, 0, 0, 0, shade(wood, .85)); B(1.8, .25, .66, 0, .8, 0, M('#b8d0d8', { roughness: .05, metalness: .2, transparent: true, opacity: .35 })); B(1.84, .03, .7, 0, 1.05, 0, M('#a8b0b0', { metalness: .6, roughness: .3 })); B(1.7, .02, .58, 0, .81, 0, '#5a2a2a');
        for (let i = 0; i < 4; i++) { const x = -.6 + i * .4, m = M('#2a2a2e', { metalness: .7, roughness: .35 }); B(.2, .03, .06, x, .83, -.05, m); B(.05, .03, .1, x - .07, .83, .03, '#4a3020'); } B(.18, .02, .05, .1, .83, .18, M('#c8c8d0', { metalness: .8 })); break; }
      case 'ia_casse_munizioni': { const n = 2 + Math.floor(r() * 3), m = M('#4a5a3a', { metalness: .4, roughness: .55 }); for (let k = 0; k < n; k++) { const y = k * .26, o = (r() - .5) * .08; B(.8, .25, .45, o, y, 0, m); B(.12, .04, .04, o, y + .25, 0, '#2a2a2a'); B(.3, .08, .01, o, y + .08, .23, '#d8c890'); } break; }
      case 'ia_bersaglio': { B(.06, 1.4, .06, -.3, 0, 0, wood); B(.06, 1.4, .06, .3, 0, 0, wood); B(.7, .9, .02, 0, .7, 0, '#e8dcc0'); S(.12, 0, 1.38, .02, '#1e1e1e', 8).scale.z = .1; const t = B(.36, .5, .02, 0, .8, .012, '#1e1e1e'); t.scale.y = 1;
        for (let i = 0; i < 3; i++) { const k = C(.25 - i * .08, .01, 0, 1.1, .03 + i * .002, i % 2 ? '#1e1e1e' : '#e8dcc0', 16); k.rotation.x = PI / 2; k.position.set(0, 1.1, .03 + i * .002); } B(.8, .15, .4, 0, 0, 0, '#5a4a3a'); break; }
      case 'ia_banco_tiro': { B(2.6, .95, .45, 0, 0, 0, shade(wood, .85)); B(2.66, .04, .5, 0, .95, 0, shade(wood, .65)); for (let i = 0; i < 4; i++) B(.04, 1, .55, -1.3 + i * .866, .95, -.05, M('#6a6e6a', { metalness: .3 })); for (let i = 0; i < 3; i++) { B(.18, .1, .12, -.86 + i * .866, .99, .05, '#c83a2a'); B(.1, .04, .1, -.66 + i * .866, .99, .1, '#d8c890'); } break; }
      case 'ia_auto_esposta': { const col = pick(r, ['#c82a2a', '#2a5ac8', '#e8e4d8', '#e8a020', '#2a6a3a', '#1e1e22', '#8a8a90']), body = M(col, { metalness: .5, roughness: .3 }), glass = M('#1e2a34', { roughness: .1, metalness: .4 });
        B(1.7, .45, 3.9, 0, .3, 0, body); B(1.5, .45, 1.9, 0, .75, -.15, body); B(1.46, .38, 1.84, 0, .78, -.15, glass); B(1.72, .12, .1, 0, .38, 1.96, M('#c8c8d0', { metalness: .8 })); B(1.72, .12, .1, 0, .38, -1.96, M('#c8c8d0', { metalness: .8 }));
        [[-.78, 1.25], [.78, 1.25], [-.78, -1.25], [.78, -1.25]].forEach(([x, z]) => { const w0 = C(.3, .2, x, .3, z, '#141414', 12); w0.rotation.z = PI / 2; w0.position.set(x, .3, z); }); B(.3, .1, .02, -.55, .55, 1.96, GL('#fff0c0', 1.2)); B(.3, .1, .02, .55, .55, 1.96, GL('#fff0c0', 1.2));
        B(.5, .02, .3, 0, 1.21, -.15, '#e8dcc0'); break; }
      // ---- [banca] gli sportelli, la fila, il caveau ----
      case 'ia_sportello': { B(2.2, 1.05, .7, 0, 0, 0, shade(wood, .9)); B(2.26, .05, .76, 0, 1.05, 0, M('#d8d0c0', { roughness: .4 })); B(2.2, .85, .03, 0, 1.1, .05, M('#c8dce4', { roughness: .05, metalness: .2, transparent: true, opacity: .35 }));
        B(2.24, .06, .1, 0, 1.95, .05, shade(wood, .7)); [-1.1, 0, 1.1].forEach(x => B(.06, .9, .1, x, 1.1, .05, shade(wood, .7))); [-.55, .55].forEach(x => { B(.3, .06, .02, x, 1.12, .07, '#1a1a1a'); B(.24, .14, .01, x, 1.6, .07, '#e8dcc0'); B(.12, .2, .1, x - .25, 1.1, -.15, '#2a2a2e'); });
        B(.3, .02, .2, -.4, 1.1, -.2, '#e8e4d8'); B(.2, .02, .14, .7, 1.1, -.2, '#e8e4d8'); break; }
      case 'ia_paletti': { const c = M('#c8a040', { metalness: .7, roughness: .3 }); [-.75, 0, .75].forEach(x => { C(.12, .03, x, 0, 0, c, 10); C(.03, .9, x, 0, 0, c, 6); S(.05, x, .92, 0, c, 6); }); [-.375, .375].forEach(x => { const m = B(.72, .04, .04, x, .78, 0, '#a82a2a'); m.scale.y = 1; }); break; }
      case 'ia_porta_caveau': { const st0 = M('#8a8e94', { metalness: .85, roughness: .3 }); B(2.2, 2.3, .3, 0, 0, -.15, '#5a5e64'); const d = C(.95, .35, -.15, 1.1, .2, st0, 24); d.rotation.x = PI / 2; d.position.set(-.2, 1.12, .32); d.rotation.z = -.5;
        const h = C(.35, .12, -.2, 1.12, .55, M('#c8ccd0', { metalness: .9, roughness: .2 }), 12); h.rotation.x = PI / 2; h.position.set(-.2, 1.12, .55); for (let i = 0; i < 3; i++) { const sp = B(.06, .8, .06, -.2, .72, .62, M('#c8ccd0', { metalness: .9 })); sp.rotation.z = i * PI / 3; sp.position.set(-.2, 1.12, .62); }
        for (let i = 0; i < 8; i++) { const a = i * PI / 4; B(.12, .12, .2, -.2 + Math.cos(a) * .82, 1.06 + Math.sin(a) * .82, .32, st0); } break; }
      case 'ia_cassette_sicurezza': { B(2.4, 2.1, .42, 0, 0, 0, M('#6a6e72', { metalness: .6, roughness: .4 })); for (let j = 0; j < 7; j++) for (let i = 0; i < 8; i++) { const x = -1.05 + i * .3, y = .12 + j * .28; B(.27, .25, .02, x, y, .215, M(shade('#a8acb0', .9 + ((i * 7 + j * 3) % 5) * .04), { metalness: .7, roughness: .3 })); B(.05, .05, .02, x, y + .1, .23, '#3a3a3a'); B(.1, .03, .01, x, y + .18, .225, '#e8dcc0'); } break; }
      case 'ia_mazzette': for (let i = 0; i < 4 + Math.floor(r() * 5); i++) { const m = B(.16, .05, .08, (i % 3) * .17 - .17, Math.floor(i / 3) * .05, (r() - .5) * .04, '#8aa07a'); m.rotation.y = (r() - .5) * .3; B(.02, .051, .081, m.position.x, Math.floor(i / 3) * .05, m.position.z, '#e8dcc0'); } break;
      case 'ia_lingotti': for (let i = 0; i < 6; i++) { B(.18, .06, .08, (i % 3) * .2 - .2, Math.floor(i / 3) * .06, (i % 2) * .02, M('#e0b040', { metalness: .95, roughness: .25 })); } break;
      case 'ia_carrello_soldi': { const c = M('#8a8e94', { metalness: .7, roughness: .35 }); B(.75, .04, .55, 0, .25, 0, c); B(.75, .04, .55, 0, .7, 0, c); legs(.7, .5, .7, c, .03); for (let i = 0; i < 4; i++) { const s = S(.15, -.2 + (i % 2) * .38, .43 + Math.floor(i / 2) * .45, (i % 2 ? .1 : -.1), '#c8b890', 8); s.scale.y = 1.2; } C(.05, .04, -.3, 0, -.22, '#1a1a1a', 8); C(.05, .04, .3, 0, .22, '#1a1a1a', 8); break; }
      // ---- [case] le cose di tutti i giorni: sopra i tavoli (h dal gruppo) ----
      case 'ia_piatti': { const pc = pick(r, ['#f0ece4', '#e8e0c8', '#d8e0e8']); [[-.35, -.22], [.35, -.22], [-.35, .22], [.35, .22]].forEach(([x, z]) => { C(.11, .015, x, 0, z, pc, 14); C(.08, .005, x, .015, z, shade(pc, .9), 14); B(.015, .005, .16, x + .15, 0, z, '#b8b8c0'); }); if (r() < .7) C(.035, .12, 0, 0, 0, M('#d8ecf0', { transparent: true, opacity: .5 }), 8); break; }
      case 'ia_pentola': { C(.16, .16, 0, 0, 0, M('#9aa0a6', { metalness: .7, roughness: .35 }), 14); C(.165, .015, 0, .16, 0, M('#8a9096', { metalness: .7 }), 14); B(.06, .03, .02, 0, .2, 0, '#1a1a1a'); B(.08, .02, .02, -.2, .12, 0, '#1a1a1a'); B(.08, .02, .02, .2, .12, 0, '#1a1a1a'); break; }
      case 'ia_tazze': [[-.08, 0], [.1, .06], [0, -.1]].slice(0, 2 + Math.floor(r() * 2)).forEach(([x, z]) => { C(.04, .07, x, 0, z, pick(r, ['#f0ece4', '#c83a2a', '#3a6aa0']), 10, .035); C(.035, .005, x, .065, z, '#3a2014', 10); C(.06, .006, x, 0, z, '#e8e4dc', 12); }); break;
      case 'ia_lettere': { for (let i = 0; i < 5; i++) { const m = B(.16, .006, .11, (r() - .5) * .12, i * .006, (r() - .5) * .1, pick(r, ['#e8e0c8', '#d8d0b8', '#c8d8e8'])); m.rotation.y = (r() - .5) * .8; } B(.04, .03, .01, .1, .03, .06, '#a82a2a'); break; }
      case 'ia_radio_clandestina': { B(.32, .2, .18, 0, 0, 0, '#3a3e34'); B(.24, .1, .01, -.02, .05, .09, '#1a1a1a'); for (let i = 0; i < 3; i++) C(.02, .02, .08 + i * .0, .06 + i * .05, .095, '#c8c8c0', 8).rotation.x = PI / 2; const a = B(.01, .5, .01, .14, .2, -.05, '#8a8a8a'); a.rotation.z = -.4; B(.2, .002, .14, -.3, 0, .1, '#e8e0c8'); break; }
      case 'ia_cesto_frutta': { C(.16, .08, 0, 0, 0, '#a8844a', 10, .12); for (let i = 0; i < 5; i++) S(.045, (r() - .5) * .16, .1, (r() - .5) * .16, pick(r, ['#e8a020', '#c83a2a', '#d8c040', '#6a9a3a']), 6); break; }
      case 'ia_bottiglia_vino': { bottle(0, 0, 0, '#3a1a1a'); C(.035, .1, .1, 0, .05, M('#d8ecf0', { transparent: true, opacity: .5 }), 8); C(.03, .05, .1, 0, .05, '#6a1424', 8); break; }
      case 'ia_quaderni': { for (let i = 0; i < 3; i++) { const m = B(.21, .012, .15, (r() - .5) * .1, i * .012, (r() - .5) * .06, pick(r, ['#3a6aa0', '#c83a2a', '#e8d040', '#4a8a4a'])); m.rotation.y = (r() - .5) * .4; } B(.008, .008, .14, .12, .04, 0, '#e8b830'); break; }
      case 'ia_ferro_stiro': { const m = B(.12, .06, .22, 0, 0, 0, M('#a8acb0', { metalness: .8 })); B(.03, .06, .14, 0, .06, 0, '#2a2a2a'); B(.3, .006, .3, .2, 0, .05, pick(r, ['#e8e0d0', '#c8d0e0'])); break; }
      // ---- [case] per terra ----
      case 'ia_giocattoli': { B(.18, .1, .1, -.2, 0, .1, '#c83a2a'); [[-.27, .05], [-.13, .05]].forEach(([x]) => C(.03, .02, x, 0, .16, '#1a1a1a', 8).rotation.x = PI / 2); for (let i = 0; i < 6; i++) B(.08, .08, .08, .1 + (i % 3) * .09, Math.floor(i / 3) * .08, -.1, pick(r, ['#e8d040', '#3a6aa0', '#c83a2a', '#4a8a4a'])); const d = C(.06, .2, .25, 0, .15, '#e8c8b0', 8); d.rotation.z = PI / 2; d.position.set(.25, .06, .15); S(.05, .36, .06, .15, '#e8c8b0', 6); B(.14, .1, .12, .22, .02, .15, '#d85a8a'); break; }
      case 'ia_palla': { const m = S(.11, 0, .11, 0, pick(r, ['#c83a2a', '#e8e0d0', '#3a6aa0']), 10); break; }
      case 'ia_cesto_cucito': { C(.2, .14, 0, 0, 0, '#a8844a', 12, .17); for (let i = 0; i < 4; i++) S(.05, (r() - .5) * .2, .14, (r() - .5) * .2, pick(r, ['#c83a2a', '#3a6aa0', '#e8d040', '#e8e0d0']), 6); B(.26, .02, .2, .05, .14, .05, pick(r, ['#8a6a8a', '#6a8a6a'])); B(.01, .01, .14, -.05, .18, 0, '#c8c8c0'); break; }
      case 'ia_valigia_aperta': { const c = pick(r, ['#6a3a2a', '#3a4a5a', '#7a6040']); B(.7, .12, .45, 0, 0, 0, c); const lid = B(.7, .45, .05, 0, .12, -.22, c); lid.rotation.x = -.3; for (let i = 0; i < 3; i++) B(.3, .04, .18, -.18 + i * .18, .12 + i * .01, .02, pick(r, ['#e8e0d0', '#5a6a8a', '#8a3a3a'])); break; }
      case 'ia_scarpe': [[-.1, 0, .2], [.12, .05, -.3]].forEach(([x, z, ry]) => { const m = B(.1, .08, .26, x, 0, z, pick(r, ['#1e1c1a', '#5a3a24', '#7a5a3a'])); m.rotation.y = ry; }); break;
      case 'ia_sgabello': { C(.17, .04, 0, .45, 0, shade(wood, 1.1), 10); [0, 1, 2].forEach(i => { const a = i * 2.1; const l = B(.03, .46, .03, Math.cos(a) * .12, 0, Math.sin(a) * .12, shade(wood, .8)); }); break; }
      case 'ia_sedia_rovesciata': { const g2 = new THREE.Group(); g.add(g2); const c = shade(wood, 1.05); const m1 = new THREE.Mesh(bgeo(.45, .05, .45), M(c)); m1.position.set(0, .22, 0); m1.rotation.x = PI / 2; g2.add(m1); const m2 = new THREE.Mesh(bgeo(.45, .5, .05), M(c)); m2.position.set(0, .03, .3); m2.rotation.x = PI / 2; g2.add(m2); [[-.2], [.2]].forEach(([x]) => { const l = new THREE.Mesh(bgeo(.04, .04, .45), M(shade(c, .8))); l.position.set(x, .45, -.05); g2.add(l); }); break; }
      case 'ia_asse_stiro': { B(1.2, .03, .35, 0, .82, 0, pick(r, ['#c8d0e0', '#e8d8c0'])); const a = B(.03, .9, .03, -.25, 0, 0, '#8a8e94'); a.rotation.z = .35; const b2 = B(.03, .9, .03, .25, 0, 0, '#8a8e94'); b2.rotation.z = -.35; B(.12, .06, .22, .4, .85, 0, M('#a8acb0', { metalness: .8 })); break; }
      // ---- [case] appeso: l'altarino della nonna ----
      case 'ia_altarino': { B(.6, .03, .2, 0, -.35, .1, wood); B(.3, .4, .03, 0, -.3, .02, '#c8a040'); B(.24, .32, .01, 0, -.26, .035, '#7a2a1a'); C(.025, .1, -.22, -.32, .12, '#f0ece0', 6); C(.025, .1, .22, -.32, .12, '#f0ece0', 6); S(.015, -.22, -.2, .12, GL('#ffb040', 2.5), 5); S(.015, .22, -.2, .12, GL('#ffb040', 2.5), 5); B(.12, .15, .01, .15, -.31, .12, '#2a2a2a'); g.userData.lamp = [0, -.2, .15]; break; }
      // ---- [roba] sui tavoli: sigarette, birre, vodka, barattoli, vasetti ----
      case 'ia_sigarette': { const [a, bnd] = pick(r, [['#c8302a', '#f0e8d8'], ['#e8e4d8', '#2a4a8a'], ['#e8c040', '#5a3a1a'], ['#2a5a3a', '#e8d8a0'], ['#1e1e22', '#c8a040']]); const p0 = B(.056, .022, .088, 0, 0, 0, a); p0.rotation.y = (r() - .5) * .8; const s = B(.058, .023, .03, 0, 0, -.02, bnd); s.rotation.y = p0.rotation.y;
        if (r() < .6) { const c = C(.004, .07, .07, .005, .02, '#f4f0e6', 5); c.rotation.z = PI / 2; c.position.set(.06, .006, .02); }
        if (r() < .5) B(.04, .012, .025, -.07, 0, .05, pick(r, ['#c8a040', '#a82a2a', '#3a6aa0'])); break; }
      case 'ia_birre': { const n = 2 + Math.floor(r() * 2); for (let i = 0; i < n; i++) { const x = -.08 + i * .08, z = (r() - .5) * .06, col = pick(r, ['#5a3a12', '#2a5a2a', '#6a4a1a']); if (i === n - 1 && r() < .35) { const m = C(.03, .2, x, .03, z, M(col, { roughness: .2 }), 8); m.rotation.z = PI / 2; m.position.set(x, .03, z); } else { C(.03, .15, x, 0, z, M(col, { roughness: .2 }), 8); C(.013, .06, x, .15, z, M(col, { roughness: .2 }), 6); C(.015, .01, x, .21, z, '#c8a040', 6); C(.031, .05, x, .04, z, '#e8dcb0', 8); } } break; }
      case 'ia_vodka': { C(.035, .2, 0, 0, 0, M('#e8f0f4', { roughness: .05, transparent: true, opacity: .55 }), 10); C(.014, .07, 0, .2, 0, M('#e8f0f4', { roughness: .05, transparent: true, opacity: .55 }), 8); C(.016, .02, 0, .27, 0, '#c82a2a', 8); C(.036, .06, 0, .06, 0, pick(r, ['#e8e0d0', '#c83a2a']), 10);
        [[.09, .03], [.07, -.06]].forEach(([x, z]) => { C(.018, .05, x, 0, z, M('#d8e8f0', { roughness: .1, transparent: true, opacity: .6 }), 8); C(.016, .02, x, .005, z, M('#f0f4f8', { transparent: true, opacity: .4 }), 8); }); break; }
      case 'ia_barattoli': { const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) { const x = (i % 3) * .085 - .085, z = Math.floor(i / 3) * .085 - .03, h = pick(r, [.11, .08, .13]), col = pick(r, ['#c83a2a', '#3a6aa0', '#e8c040', '#4a8a4a', '#e8e0d0', '#8a4a2a']); C(.035, h, x, 0, z, M('#b8bcc0', { metalness: .8, roughness: .35 }), 10); C(.0355, h * .7, x, h * .15, z, col, 10); C(.03, .005, x, h, z, M('#c8ccd0', { metalness: .9 }), 10); } break; }
      case 'ia_vasetti': { const n = 2 + Math.floor(r() * 2); for (let i = 0; i < n; i++) { const x = -.07 + i * .08, col = pick(r, ['#8a2a3a', '#4a6a2a', '#c87a2a', '#d8a030', '#6a2a2a']); C(.035, .11, x, 0, 0, M('#e0eef0', { roughness: .05, transparent: true, opacity: .4 }), 10); C(.03, .08, x, .005, 0, col, 10); C(.037, .02, x, .11, 0, pick(r, ['#c8a040', '#d8d0c0', '#c82a2a']), 10); } break; }
      case 'ia_scaffale_barattoli': { B(1.2, 1.7, .32, 0, 0, -.02, shade(wood, .9)); for (let s = 0; s < 4; s++) { const y = .1 + s * .42; B(1.16, .03, .3, 0, y, 0, shade(wood, 1.15)); let x = -.52; while (x < .5) { const kind = r(), col = pick(r, ['#c83a2a', '#3a6aa0', '#e8c040', '#4a8a4a', '#8a2a3a', '#c87a2a', '#e8e0d0']);
        if (kind < .45) { C(.04, .12, x, y + .03, 0, M('#b8bcc0', { metalness: .8, roughness: .35 }), 8); C(.0405, .08, x, y + .05, 0, col, 8); } else if (kind < .85) { C(.042, .14, x, y + .03, 0, M('#e0eef0', { roughness: .05, transparent: true, opacity: .4 }), 8); C(.036, .1, x, y + .035, 0, col, 8); C(.044, .02, x, y + .17, 0, '#c8a040', 8); } x += .1 + r() * .04; } } break; }
      // ---- [roba] le armi lasciate in giro (si raccolgono: oggetti.js, LOOTX di interiors.js) ----
      case 'ia_pistola': { const mt = M('#2a2a2e', { metalness: .75, roughness: .35 }), g2 = new THREE.Group(); g.add(g2); g2.rotation.y = r() * PI * 2;
        const add = (w, h, d, x, y, z, m, rz) => { const k = new THREE.Mesh(bgeo(w, h, d), m); k.position.set(x, y, z); if (rz) k.rotation.z = rz; g2.add(k); };
        add(.2, .035, .03, 0, .02, 0, mt); add(.07, .03, .032, -.06, .005, .02, M('#4a3020'), 0); add(.03, .012, .012, .02, .01, .02, mt); break; }
      case 'ia_coltello': { const g2 = new THREE.Group(); g.add(g2); g2.rotation.y = r() * PI * 2; const bl = new THREE.Mesh(bgeo(.14, .006, .028), M('#c8ccd0', { metalness: .9, roughness: .2 })); bl.position.set(.07, .004, 0); g2.add(bl); const hd = new THREE.Mesh(bgeo(.1, .02, .026), M(pick(r, ['#4a3020', '#1e1e22', '#6a4228']))); hd.position.set(-.05, .01, 0); g2.add(hd); break; }
      case 'ia_lupara': { const g2 = new THREE.Group(); g.add(g2); g2.rotation.y = (r() - .5) * .6; const mt = M('#3a3c42', { metalness: .75, roughness: .35 });
        [-.012, .012].forEach(z => { const c = new THREE.Mesh(cgeo(.012, .012, .5, 6), mt); c.rotation.z = PI / 2; c.position.set(.15, .03, z); g2.add(c); }); const st0 = new THREE.Mesh(bgeo(.36, .05, .045), M('#6a4228')); st0.position.set(-.25, .03, 0); st0.rotation.z = .08; g2.add(st0); const tr = new THREE.Mesh(bgeo(.08, .03, .04), mt); tr.position.set(-.06, .02, 0); g2.add(tr); break; }
      case 'ia_mitra': { const g2 = new THREE.Group(); g.add(g2); g2.rotation.y = (r() - .5) * .8; const mt = M('#2a2c30', { metalness: .7, roughness: .4 });
        const add = (w, h, d, x, y, z, m) => { const k = new THREE.Mesh(bgeo(w, h, d), m); k.position.set(x, y, z); g2.add(k); return k; }; add(.4, .06, .05, 0, .04, 0, mt); add(.03, .14, .03, -.02, .04, .045, mt).rotation.x = PI / 2; const c = new THREE.Mesh(cgeo(.01, .01, .25, 6), mt); c.rotation.z = PI / 2; c.position.set(.3, .05, 0); g2.add(c); add(.2, .03, .03, -.28, .04, 0, M('#5a3a24')); break; }
      case 'ia_cassa_armi': { B(1.05, .38, .48, 0, 0, 0, '#5a6040'); for (let s = 0; s < 2; s++) B(1.06, .03, .49, 0, .08 + s * .2, 0, '#3e4430'); const lid = B(1.05, .03, .48, 0, .38, -.26, '#5a6040'); lid.rotation.x = -1.2; lid.position.set(0, .55, -.3); B(.3, .1, .005, 0, .2, .245, '#d8c890');
        for (let i = 0; i < 3; i++) { const k = B(.95, .05, .07, (r() - .5) * .05, .34, -.15 + i * .14, M('#3a3c42', { metalness: .6 })); B(.3, .06, .08, -.3, .34, -.15 + i * .14, '#6a4228'); } break; }
      case 'ia_lupara_muro': { B(1.0, .05, .05, 0, .15, .03, wood); B(1.0, .05, .05, 0, -.15, .03, wood); [-.3, .3].forEach(x => { B(.04, .1, .08, x, -.05, .06, '#2a2a2a'); }); const mt = M('#3a3c42', { metalness: .75, roughness: .35 }); [-.012, .012].forEach(dy => { const c = C(.012, .55, .2, -.02 + dy, .1, mt, 6); c.rotation.z = PI / 2; c.position.set(.2, .0 + dy, .1); }); B(.38, .06, .045, -.25, -.03, .1, '#6a4228'); break; }
      default: return null;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }
  // le cose appese hanno il centro all'altezza h: i pannelli sono già costruiti così
  // Models.furniture sa fare anche le nostre
  if (typeof Models !== 'undefined' && Models.furniture) {
    const f0 = Models.furniture; let n = 0;
    Models.furniture = name => { if (/^ia_|^st_stufa$/.test(name)) { const g = build(name, rng(++n * 7919)); if (g) return Promise.resolve(g); } return f0(name); };
  }

  // =====================================================================================================================
  // IL PIANO
  // =====================================================================================================================
  const S = { grp: null, mats: [], lights: [], fires: [], neons: [], screens: [], wins: [], patches: [], radar: [], lantern: [], blinks: [], hidden: [] };
  const LIGHT = { bulbo: ['#ffb468', 1.1], lampadario: ['#ffc888', 1.2], neon: ['#d0e6ff', 1.1], neon_rosa: ['#ff5ab0', 1.3], candela: ['#ff9a40', .7], spenta: null, buio: ['#7a90c0', .8], verde: ['#ffe0a0', 1.1], rossa: ['#ff3a2a', .9], fuoco: ['#ff8a3a', 1.0], disco: ['#c05cff', 1.4] };
  function fixture(grp, q, type, r) {
    const cx = q.x + q.w / 2, cz = q.y + q.h / 2, top = BASE + WALLH;
    const cord = (h) => { const m = new THREE.Mesh(bgeo(.015, h, .015), M('#1a1a1a')); m.position.set(cx, top - h / 2, cz); grp.add(m); };
    if (type === 'bulbo') { cord(.55); const b = new THREE.Mesh(sgeo(.07, 6), GL('#fff0c0', 3)); b.position.set(cx, top - .62, cz); grp.add(b); return [cx, top - .7, cz]; }
    if (type === 'lampadario') { cord(.5); const s = new THREE.Mesh(cgeo(.12, .32, .22, 10), M(pick(r, ['#e8d8b0', '#c8a060', '#d8c8a8', '#8a5a3a']), { side: THREE.DoubleSide })); s.position.set(cx, top - .6, cz); grp.add(s); const b = new THREE.Mesh(sgeo(.06, 6), GL('#fff0c0', 3)); b.position.set(cx, top - .66, cz); grp.add(b); return [cx, top - .75, cz]; }
    if (type === 'neon' || type === 'neon_rosa') { const along = q.w >= q.h, n = Math.max(1, Math.min(3, Math.round(Math.max(q.w, q.h) / 4))); for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * Math.max(q.w, q.h) / n; const m = new THREE.Mesh(bgeo(along ? 1.2 : .1, .05, along ? .1 : 1.2), GL(type === 'neon' ? '#e8f4ff' : '#ff5ab0', 2.4).clone()); m.position.set(cx + (along ? off : 0), top - .1, cz + (along ? 0 : off)); grp.add(m); S.neons.push({ m, base: 2.4, bad: r() < .35, ph: r() * 10 }); } return [cx, top - .4, cz]; }
    if (type === 'verde') { cord(.6); const s = new THREE.Mesh(bgeo(1.4, .14, .5), M('#1e5a2e')); s.position.set(cx, top - .75, cz); grp.add(s); const b = new THREE.Mesh(bgeo(1.2, .02, .35), GL('#fff0c0', 2.5)); b.position.set(cx, top - .83, cz); grp.add(b); return [cx, top - 1.0, cz]; }
    if (type === 'rossa') { const b = new THREE.Mesh(sgeo(.06, 6), GL('#ff3a2a', 3)); b.position.set(cx, top - .3, cz); grp.add(b); return [cx, top - .4, cz]; }
    if (type === 'disco') { const b = new THREE.Mesh(sgeo(.3, 8), M('#d8d8e8', { metalness: .9, roughness: .15 })); b.position.set(cx, top - .5, cz); grp.add(b); S.radar.push({ m: b, spin: 1 }); return [cx, top - .9, cz]; }
    if (type === 'buio') return [cx, top - .2, cz];   // niente lampada: un po' di luce fredda dalle crepe
    return [cx, top - .6, cz];
  }
  function buildFloor(b, f, ctx) {
    const I = ctx.G.INT, L = I.layout(b), F = L.floors[f]; if (!F) return null;
    const grp = new THREE.Group(), [X0, Y0, W, H] = L.box, cam = ctx.cam, r = rng((b.x * 131 + b.y * 977 + f * 31) >>> 0);
    BASE = ctx.groundH && L.ent ? ctx.groundH(L.ent.in[0], L.ent.in[1]) : (b.base != null ? b.base : .4); if (!isFinite(BASE)) BASE = .4;
    Object.keys(S).forEach(k => { if (Array.isArray(S[k]) && k !== 'hidden') S[k] = []; }); S.grp = grp;
    // fondo nero tutto intorno: il fuori non c'è
    const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 400, H + 400), new THREE.MeshBasicMaterial({ color: '#06050a' })); under.rotation.x = -PI / 2; under.position.set(X0 + W / 2, BASE - .06, Y0 + H / 2); grp.add(under);
    // pavimenti
    F.rooms.forEach(q => {
      const wet = f === 0 && L.ent && q.x <= L.ent.in[0] && L.ent.in[0] <= q.x + q.w && q.y <= L.ent.in[1] && L.ent.in[1] <= q.y + q.h ? [(L.ent.in[0] - q.x) * PPM, (L.ent.in[1] - q.y) * PPM] : null;
      const t = tex(floorCanvas(q, rng((b.x * 17 + q.x * 3 + q.y * 7 + f * 101) >>> 0), wet));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(q.w, q.h), new THREE.MeshStandardMaterial({ map: t, roughness: /marmo|piastrelle|graniglia|linoleum|scacchi/.test(q.floor) ? .45 : .85, metalness: 0 }));
      m.rotation.x = -PI / 2; m.position.set(q.x + q.w / 2, BASE + .01, q.y + q.h / 2); m.receiveShadow = true; grp.add(m);
    });
    // muri: quelli di fondo (perimetro dal lato lontano dalla camera) alti, gli altri bassi a sezione; ogni faccia ha la parete della sua stanza
    const cy = Math.cos(cam.yaw || 0), sy = Math.sin(cam.yaw || 0);
    const backSide = { N: cy > .2, S: cy < -.2, W: sy > .2, E: sy < -.2 };
    const roomOf = (x, y) => F.rooms.find(q => x >= q.x - .01 && x <= q.x + q.w + .01 && y >= q.y - .01 && y <= q.y + q.h + .01);
    const capM = M('#241c20'), WT = .22;
    F.walls.forEach(w => {
      const [x, y, ww, hh] = w, vert = hh > ww, len = vert ? hh : ww;
      const onN = !vert && Math.abs(y + hh / 2 - Y0) < .3, onS = !vert && Math.abs(y + hh / 2 - Y0 - H) < .3, onW = vert && Math.abs(x + ww / 2 - X0) < .3, onE = vert && Math.abs(x + ww / 2 - X0 - W) < .3;
      const perim = onN || onS || onW || onE, side = onN ? 'N' : onS ? 'S' : onW ? 'W' : onE ? 'E' : null;
      const tall = perim && backSide[side], ht = tall ? WALLH : 1.05;
      // le due facce: [stanza, spostamento verso quella faccia]
      const mid = vert ? [x + ww / 2, y + hh / 2] : [x + ww / 2, y + hh / 2];
      const faces = vert ? [[roomOf(mid[0] - .3, mid[1]), -1], [roomOf(mid[0] + .3, mid[1]), 1]] : [[roomOf(mid[0], mid[1] - .3), -1], [roomOf(mid[0], mid[1] + .3), 1]];
      faces.forEach(([q, sgn]) => {
        if (!q) return;
        if (perim && !(q.x - .01 <= mid[0] && mid[0] <= q.x + q.w + .01 && q.y - .01 <= mid[1] && mid[1] <= q.y + q.h + .01)) return;
        const th = perim ? WT : WT / 2, c = wallStyleCanvas(q.wall, len, ((q.x * 13 + q.y * 7) ^ (b.x * 3)) >>> 0, q.dirt || .3);
        const t = tex(c); t.repeat.set(1, ht / WALLH); t.offset.set(0, 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(vert ? th : len, ht, vert ? len : th), [M('#2a2226'), M('#2a2226'), capM, capM, M('#2a2226'), M('#2a2226')]);
        const mat = new THREE.MeshStandardMaterial({ map: t, roughness: q.wall === 'piastrelle' ? .4 : .92 });
        // la faccia giusta: per i muri verticali ±x (indici 0/1), per gli orizzontali ±z (4/5)
        const mats = m.material.slice(); if (vert) { mats[0] = mat; mats[1] = mat; } else { mats[4] = mat; mats[5] = mat; } m.material = mats;
        const off = perim ? 0 : sgn * WT / 4;
        m.position.set(x + ww / 2 + (vert ? off : 0), BASE + ht / 2, y + hh / 2 + (vert ? 0 : off)); m.castShadow = true; m.receiveShadow = true; grp.add(m);
      });
      if (!tall) { const cap = new THREE.Mesh(bgeo(ww + .02, .04, hh + .02), capM); cap.position.set(x + ww / 2, BASE + ht + .02, y + hh / 2); grp.add(cap); }
    });
    // stipiti delle porte interne
    (F.doors || []).forEach(d => { const fr = M('#3a2a1e'); [-1, 1].forEach(s => { const m = new THREE.Mesh(bgeo(d.v ? .3 : .08, 1.12, d.v ? .08 : .3), fr); m.position.set(d.x + (d.v ? 0 : s * .68), BASE + .56, d.y + (d.v ? s * .68 : 0)); grp.add(m); }); const th = new THREE.Mesh(bgeo(d.v ? .3 : 1.3, .02, d.v ? 1.3 : .3), M('#5a4030')); th.position.set(d.x, BASE + .01, d.y); grp.add(th); });
    // finestre: sui muri alti, gelate; di giorno lasciano una lama di luce fredda per terra
    F.wins.forEach(w => {
      if (!backSide[w.side]) return;
      const vert = w.side === 'W' || w.side === 'E', n = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] }[w.side], ry = { N: 0, S: PI, W: PI / 2, E: -PI / 2 }[w.side];
      const g = new THREE.Group(); g.position.set(w.x + n[0] * .115, BASE, w.y + n[1] * .115); g.rotation.y = ry; grp.add(g);
      const fr = M(pick(r, ['#e8e4d8', '#6a4a2a', '#4a5a5a'])); [[1.3, .08, 0, 1.0], [1.3, .08, 0, 2.3], [.08, 1.38, -.61, 1.0], [.08, 1.38, .61, 1.0]].forEach(([a, b0, x0, y0]) => { const m = new THREE.Mesh(bgeo(a, b0, .1), fr); m.position.set(x0, y0 + b0 / 2, .04); g.add(m); });
      const sill = new THREE.Mesh(bgeo(1.4, .05, .25), M('#c8c0b0')); sill.position.set(0, .98, .1); g.add(sill);
      const gm = new THREE.MeshBasicMaterial({ color: '#a8bccc', toneMapped: false }); const glass = new THREE.Mesh(plane(1.16, 1.22), gm); glass.position.set(0, 1.66, .0); g.add(glass);
      const fm = new THREE.MeshBasicMaterial({ map: T.frost(), transparent: true, toneMapped: false }); const frost = new THREE.Mesh(plane(1.16, 1.22), fm); frost.position.set(0, 1.66, .01); g.add(frost);
      if (L.mood && /famiglia|anziana|funzionario|albergo|kommunalka|contadino/.test(F.mood) && r() < .8) { const cc = pick(r, ['#c8b090', '#a85a5a', '#d8d0b8', '#7a8a6a']); [-1, 1].forEach(s => { const c = new THREE.Mesh(bgeo(.24, 1.5, .03), M(cc)); c.position.set(s * .58, 1.0, .07); g.add(c); }); }
      if (r() < .35) { const p = build(pick(r, ['ia_vaso', 'ia_bottiglie', 'ia_candela', 'ia_radiolina']), r); if (p) { p.position.set((r() - .5) * .6, 1.0, .1); p.scale.setScalar(.9); g.add(p); } }
      // lama di luce
      const pm = new THREE.MeshBasicMaterial({ map: T.patch(), color: '#b8d0ff', transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const patch = new THREE.Mesh(plane(1.5, 2.6), pm); patch.rotation.x = -PI / 2; patch.rotation.z = -ry; patch.position.set(w.x + n[0] * 1.45, BASE + .025, w.y + n[1] * 1.45); grp.add(patch);
      S.wins.push({ gm, fm }); S.patches.push(pm);
    });
    // scala
    if (L.stairs) stairsFor(grp, L, f);
    // soglia d'ingresso (arancione: si esce di qui) con lo zerbino
    if (f === 0 && L.ent) { const e = L.ent, rot = e.side === 'N' || e.side === 'S' ? 0 : PI / 2; const mat = new THREE.Mesh(plane(1.4, .9), new THREE.MeshStandardMaterial({ map: T.stuoia(), emissive: '#ff8a2a', emissiveIntensity: .25, roughness: .9 })); mat.rotation.x = -PI / 2; mat.rotation.z = rot; mat.position.set(e.in[0], BASE + .03, e.in[1]); grp.add(mat); }
    // mobili e oggetti
    const fires = [], lamps = [];
    F.furn.forEach(o => {
      if (o.taken) return;   // [roba] portata via
      if (o.decor && !o.low && !backSide[o.wall]) return;   // appesa a un muro tagliato basso: non si vede
      const p = /^ia_|^st_stufa$/.test(o.id) ? Promise.resolve(build(o.id, rng((o.x * 97 + o.y * 31) >>> 0))) : (window.Models ? Models.furniture(o.id) : Promise.resolve(null));
      p.then(m => {
        if (!m || S.grp !== grp) return;
        if (window.Officina) Officina.apply('mobile:' + o.id, m);   // [studio]
        m.position.set(o.x, BASE + (o.h || 0), o.y); m.rotation.y = o.ry || 0; if (o.s) m.scale.multiplyScalar(o.s); m.userData.furn = o; grp.add(m);   // [editor]
        const u = m.userData;
        if (u.fire || u.candle) { const q = u.fire || u.candle, v = new THREE.Vector3(q[0], q[1], q[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.ry || 0); S.fires.push({ at: [o.x + v.x, BASE + (o.h || 0) + v.y, o.y + v.z], big: !!u.fire, meshes: [] }); m.traverse(k => { if (k.isMesh && k.userData.fire) { k.material = k.material.clone(); S.fires[S.fires.length - 1].meshes.push(k); } }); addLights(); }
        if (u.neon) { m.traverse(k => { if (k.isMesh && k.material && k.material.emissiveIntensity > 1) { k.material = k.material.clone(); } if (k.isMesh && k.material && k.material.emissiveIntensity > 1) S.neons.push({ m: k, base: k.material.emissiveIntensity, bad: Math.random() < .4, ph: Math.random() * 10 }); }); }
        if (u.screen) m.traverse(k => { if (k.isMesh && k.userData.screen) S.screens.push(k); });
        if (u.radar) S.radar.push({ m: u.radar, tex: 1 });
        if (u.lantern) S.lantern.push(m);
        if (u.dance) m.traverse(k => { if (k.isMesh && k.userData.tile) S.blinks.push({ m: k, ph: Math.random() * 10, dance: 1 }); });
        if (u.blink) m.traverse(k => { if (k.isMesh && k.material && k.material.emissiveIntensity > 1) { k.material = k.material.clone(); S.blinks.push({ m: k, ph: Math.random() * 10 }); } });
      });
    });
    // luci: una per stanza (le più grandi), più i fuochi
    const roomsL = F.rooms.map((q, i) => ({ q, i })).sort((a, c) => c.q.w * c.q.h - a.q.w * a.q.h);
    S.roomLights = [];
    // le stanze grandi hanno più lampade (una ogni 40 m² circa); le luci vere sono al massimo 9, prima alle stanze più grandi
    const cand = [];
    roomsL.forEach((x, k) => {
      const q = x.q, type = LIGHT[q.light] ? q.light : q.light === 'spenta' ? 'buio' : 'bulbo', nx = Math.max(1, Math.min(3, Math.round(q.w / 6.5))), ny = Math.max(1, Math.min(3, Math.round(q.h / 6.5)));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const sub = { x: q.x + q.w * i / nx, y: q.y + q.h * j / ny, w: q.w / nx, h: q.h / ny }, at = fixture(grp, sub, type, r);
        cand.push({ pri: (i + j) * 100 - q.w * q.h, at: [at[0], Math.min(at[1], BASE + 2.15), at[2]], col: LIGHT[type][0], int: LIGHT[type][1] * (nx * ny > 1 ? .8 : 1), dist: Math.max(sub.w, sub.h) * 1.1 + 3, type, q });
      }
    });
    cand.sort((a, c) => a.pri - c.pri).slice(0, 8).forEach(c => S.roomLights.push(c));
    function addLights() { }
    // le luci si accendono dopo: i fuochi arrivano con i modelli
    setTimeout(() => { if (S.grp === grp) placeLights(ctx); }, 0);
    placeLights(ctx);
    return grp;
  }
  function placeLights(ctx) {
    const scene = ctx.scene, INDOOR = ctx.INDOOR;
    (INDOOR.lights || []).forEach(l => scene.remove(l)); INDOOR.lights = []; S.lights = [];
    S.roomLights.forEach(R0 => { const l = new THREE.PointLight(R0.col, R0.int, R0.dist, 1.5); l.position.set(R0.at[0], R0.at[1], R0.at[2]); scene.add(l); INDOOR.lights.push(l); S.lights.push({ l, base: R0.int, type: R0.type, ph: Math.random() * 10, bad: R0.type === 'neon' && Math.random() < .3 }); });
    S.fires.slice(0, 2).forEach(F0 => { const l = new THREE.PointLight(F0.big ? '#ff7a2a' : '#ffa850', F0.big ? 1.1 : .5, F0.big ? 5.5 : 3, 1.6); l.position.set(F0.at[0], F0.at[1] + .1, F0.at[2] + .1); scene.add(l); INDOOR.lights.push(l); S.lights.push({ l, base: F0.big ? 1.1 : .5, type: 'fuoco', ph: Math.random() * 10, f: F0 }); });
  }
  function stairsFor(grp, L, f) {
    const s = L.stairs, last = L.floors.length - 1, [dx, dy] = s.d || (s.dir === 'E' ? [1, 0] : [0, 1]);
    const T0 = [s.top[0] + 1, s.top[1] + 1], O0 = [s.o[0] + 1, s.o[1] + 1];
    const stepM = M('#8a8274'), edgeM = M('#5a5248'), railM = M('#3a2a1e', { metalness: .2 });
    // gradini che salgono da 'from' verso 'to' (centri di casella), da h0 a h1
    const flight = (from, to, n, h0, h1, len) => { for (let k = 0; k < n; k++) { const t = (k + .5) / n, cx = from[0] + (to[0] - from[0]) * t, cz = from[1] + (to[1] - from[1]) * t, h = h0 + (h1 - h0) * (k + 1) / n, top = Math.max(.04, h); const along = len / n + .02; const m = new THREE.Mesh(bgeo(dx ? along : 1.8, Math.max(.04, Math.abs(h)), dx ? 1.8 : along), h >= 0 ? stepM : M('#2a2420')); m.position.set(cx, BASE + (h >= 0 ? h / 2 : h / 2), cz); m.castShadow = true; m.receiveShadow = true; grp.add(m); const e = new THREE.Mesh(bgeo(dx ? .04 : 1.8, .02, dx ? 1.8 : .04), edgeM); e.position.set(cx + dx * along / 2, BASE + top + .01, cz + dy * along / 2); grp.add(e); } };
    // il pozzo della scala che scende: i gradini si perdono nel buio (in giù verso la rampa di sotto)
    const hole = (c, steps) => { const m = new THREE.Mesh(plane(1.9, 1.9), new THREE.MeshBasicMaterial({ map: steps ? T.pozzo() : null, color: steps ? '#ffffff' : '#0a080c' })); m.rotation.x = -PI / 2; m.rotation.z = Math.atan2(dx, -dy) + PI; m.position.set(c[0], BASE + .02, c[1]); grp.add(m); };
    const rail = (a, b) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const m = new THREE.Mesh(bgeo(Math.abs(b[0] - a[0]) + .05, .05, Math.abs(b[1] - a[1]) + .05), railM); m.position.set((a[0] + b[0]) / 2, BASE + 1.0, (a[1] + b[1]) / 2); grp.add(m); for (let t = 0; t <= 1.001; t += .25 / Math.max(.5, len / 2)) { const p = new THREE.Mesh(bgeo(.04, 1.0, .04), railM); p.position.set(a[0] + (b[0] - a[0]) * t, BASE + .5, a[1] + (b[1] - a[1]) * t); grp.add(p); } };
    // tappeti della scala: giallo con la freccia in su = sali, azzurro con la freccia in giù = scendi; pulsano
    const mat = (c, col) => { const up = col === '#ffd28a', mm = new THREE.MeshBasicMaterial({ map: T.freccia(up), transparent: true, opacity: .9, toneMapped: false, depthWrite: false }); const m = new THREE.Mesh(plane(1.6, 1.6), mm); m.rotation.x = -PI / 2; m.rotation.z = Math.atan2(dx, dy) + (up ? 0 : 0); m.position.set(c[0], BASE + (c[2] || .04) + .01, c[1]); grp.add(m); S.mats.push(mm);
      const gl = new THREE.Mesh(plane(1.9, 1.9), new THREE.MeshBasicMaterial({ color: up ? '#ffd23b' : '#5ad2ff', transparent: true, opacity: .25, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending })); gl.rotation.x = -PI / 2; gl.position.set(c[0], BASE + (c[2] || .04), c[1]); grp.add(gl); S.mats.push(gl.material); };
    // il lato aperto (dove c'è il pianerottolo) ha il corrimano
    const lx = s.landing[0] - T0[0], ly = s.landing[1] - T0[1], ln = Math.hypot(lx, ly) || 1, side = [lx / ln * .95, ly / ln * .95];
    const foot = [O0[0] + dx * 1, O0[1] + dy * 1], topE = [T0[0] - dx * 1, T0[1] - dy * 1];
    if (f === 0) { flight(foot, topE, 12, 0, 2.9, 4); mat([T0[0], T0[1], 2.95], '#ffd28a'); rail([foot[0] + side[0], foot[1] + side[1]], [topE[0] + side[0], topE[1] + side[1]]); }
    else {
      hole(T0, 1); mat(T0, '#8ad2ff');
      if (f < last) { flight(foot, [O0[0] - dx, O0[1] - dy], 6, 0, 1.4, 2); mat([O0[0], O0[1], .12], '#ffd28a'); rail([foot[0] + side[0], foot[1] + side[1]], [O0[0] - dx + side[0], O0[1] - dy + side[1]]); }
      else { hole(O0); rail([foot[0] + side[0], foot[1] + side[1]], [O0[0] - dx + side[0], O0[1] - dy + side[1]]); rail([foot[0] - side[0], foot[1] - side[1]], [foot[0] + side[0], foot[1] + side[1]]); }
    }
  }

  // =====================================================================================================================
  // A OGNI FOTOGRAMMA: luce del giorno dalle finestre, neon che sfarfallano, fuochi, televisori del Garante
  // =====================================================================================================================
  let tAcc = 0;
  function light(o) {
    const st = o.st, h = st ? ((st.t / 60) % 24) : 12, day = Math.max(0, Math.min(1, (Math.min(h - 6.5, 17.5 - h)) / 1.5)), dusk = h > 16 && h < 19 ? 1 : 0;
    tAcc += 1 / 60; const t = (o.time != null ? o.time : tAcc);
    // la luce di fuori entra poco: siamo dentro
    if (o.hemi) { o.hemi.intensity = .2 + day * .2; o.hemi.color.set(day > .5 ? '#c8d4e4' : '#5a6888'); o.hemi.groundColor.set('#2a2228'); }
    if (o.fillAmb) { o.fillAmb.intensity = .12 + day * .06; o.fillAmb.color.set('#3a3440'); }
    if (o.moon) o.moon.intensity = .1 + day * .22;
    if (o.dyn) { if (o.dyn.fill) o.dyn.fill.intensity = .08 + day * .1; if (o.dyn.rim) o.dyn.rim.intensity = .05; }
    // le luci di fuori (lampioni, insegne) non entrano
    if (o.scene && !S.hiddenDone) { S.hidden = []; o.scene.children.forEach(k => { if ((k.isPointLight || k.isSpotLight) && !(o.INDOOR.lights || []).includes(k) && k.visible) { k.visible = false; S.hidden.push(k); } }); S.hiddenDone = true; }
    const winC = day > .5 ? '#a8bccc' : dusk ? '#c89a88' : '#18223a';
    S.wins.forEach(w => { w.gm.color.set(winC); w.fm.opacity = .9; });
    S.patches.forEach(p => { p.opacity = day * .2; });
    S.lights.forEach(L0 => {
      let k = 1;
      if (L0.type === 'fuoco' || L0.type === 'candela') k = .82 + Math.sin(t * 11 + L0.ph) * .08 + Math.sin(t * 23 + L0.ph * 2) * .06 + (Math.random() - .5) * .08;
      else if (L0.bad) k = Math.sin(t * 31 + L0.ph) > .93 || (Math.sin(t * 1.7 + L0.ph) > .97) ? .25 : 1;
      else if (L0.type === 'disco') { L0.l.color.setHSL((t * .15) % 1, .8, .55); }
      L0.l.intensity = L0.base * k;
    });
    S.neons.forEach(N => { const off = N.bad && (Math.sin(t * 29 + N.ph) > .9 || Math.sin(t * 2.1 + N.ph) > .985); N.m.material.emissiveIntensity = off ? N.base * .15 : N.base; });
    S.fires.forEach(F0 => F0.meshes.forEach(m => { m.material.emissiveIntensity = 1.8 + Math.sin(t * 13 + F0.at[0]) * .4 + Math.random() * .3; }));
    // i televisori: alle 20 parla il Garante, gli schermi si accendono forte
    const garante = h >= 20 && h < 20.5;
    S.screens.forEach(s => { s.material.emissiveIntensity = (garante ? 1.6 : .7) + Math.sin(t * 17) * .08; });
    S.radar.forEach(R0 => { if (R0.spin) R0.m.rotation.y = t * 1.2; else R0.m.rotation.z = -t * 2; });
    S.lantern.forEach(m => { m.rotation.y = t * .6; });
    S.mats.forEach((m, i) => { m.opacity = (i % 2 ? .18 : .75) + Math.sin(t * 3) * (i % 2 ? .12 : .2); });
    S.blinks.forEach(B0 => { B0.m.material.emissiveIntensity = B0.dance ? (Math.sin(t * 4 + B0.ph) > 0 ? 1.4 : .15) : (Math.sin(t * 3 + B0.ph) > -.2 ? 1.6 : .2); });
  }
  // usciti di casa: le luci di fuori tornano
  function exit() { S.hidden.forEach(k => { k.visible = true; }); S.hidden = []; S.hiddenDone = false; S.grp = null; }
  function build_(b, f, ctx) { S.hiddenDone = false; S.hidden.forEach(k => { k.visible = true; }); S.hidden = []; return buildFloor(b, f, ctx); }
  // [editor] i materiali degli interni per il pennello: pavimenti senza usura ai bordi (ritagliati a passi di 48 px, così le piastrelle ripetono pari), pareti da 6 m
  function materiali() {
    const out = [];
    ['piastrelle', 'piastrelle_b', 'cotto', 'graniglia', 'marmo', 'scacchi', 'parquet', 'assi', 'spina', 'linoleum', 'moquette_r', 'moquette_b', 'cemento', 'terra', 'gomma'].forEach((st, i) => {
      const c0 = floorCanvas({ w: 30, h: 30, floor: st, dirt: 0 }, rng(977 + i * 131)), n = Math.floor((c0.width - 96) / 48) * 48, c = mk(n, n);
      c.getContext('2d').drawImage(c0, 48, 48, n, n, 0, 0, n, n); out.push({ nome: st, gruppo: 'Pavimenti', c, ppm: PPM });
    });
    ['calce', 'verde', 'blu', 'ocra', 'rosso', 'crema', 'ospedale', 'rosa', 'azzurro', 'fiori', 'righe', 'rombi', 'piastrelle', 'mattoni', 'cemento', 'legno', 'perline', 'velluto', 'nero'].forEach((st, i) => out.push({ nome: st, gruppo: 'Pareti', c: wallStyleCanvas(st, 6, 4099 + i * 71, 0), ppm: PPM }));
    return out;
  }
  return { build: build_, light, exit, prop: build, materiali, floorY: () => (S.grp ? BASE : null) };
})();
