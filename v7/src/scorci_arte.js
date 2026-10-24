/* Porto Vecchio — [scorci] IL KIT DEI FRONTI E LA POSA DEGLI SCORCI (la grafica; la logica e le ricette sono in scorci.js).
   ScorciKit: i pezzi parametrici, in metri, il davanti verso +z. I pezzi a muro hanno l'origine sul filo del muro, in basso al centro;
   quelli a terra al centro, a y = 0. Tutto a colori nei vertici su pochi materiali condivisi (opaco, medio, lucido, luce, vetro) più
   un atlante solo per le scritte, i manifesti e le carte (2048 × 2048, tessere disegnate una volta): così uno scorcio intero, fuso per
   materiale, costa una manciata di chiamate di disegno.
   - Il fronte: la fascia (cassonetto luminoso coi pannelli del marchio, dipinta sull'intonaco, tavola di legno, a mano, fantasma),
     le insegne secondarie dipinte, la bandiera luminosa (la T dei tabacchi, Peroni, Sammontana, il gas), il palo del barbiere, la
     lampada a collo d'oca, la serranda nei suoi stati (arrotolata, a metà, giù con la tag), la griglia di filo, la vetrofania (riviste,
     prezzi scritti a mano, la tendina), il pannello forato arrugginito, lo zoccolo sporco, la crepa che scopre i mattoni, i manifesti a
     strati, i necrologi, la targa della via di marmo, il telefono a gettoni (a muro e sul palo), i festoni, la soglia consumata, la
     bocca del forno, i lumini, la lavagna.
   - Fuori: la locandina del giornale, il cassone col lucchetto, le cassette di frutta e verdura, il banchetto del pane, le scope nel
     secchio, le bombole incatenate, i secchi, le cassette del latte, i sacchi di farina, la catasta di legna, le casse delle birre, la
     panca, i rifiuti al piede del muro, i secchi dei fiori, il mangianastri sulla cassetta.
   - Nello spazio: il tavolino della scopa (le sedie attorno o impilate), il banco del pesce, il polistirolo, il cartellone
     dell'officina, le gomme, i fusti, il banco da lavoro, il motore sul bancale; di traverso le luminarie e il bucato.
   ScorciArte: posa gli scorci di Scorci.tutti() nel mondo, li fonde per stato e materiale, registra ogni pezzo nel regista di pulizia2
   (le compenetrazioni le misura lui, strumenti/compenetrazioni.js) e accende gli stati per ora (serrande, luci, tavoli, merce). */
var ScorciKit = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  const PI = Math.PI, DOC = typeof document !== 'undefined' && !!document.createElement;
  const AR = () => (typeof Arredo3D !== 'undefined' && Arredo3D ? Arredo3D : null);
  const rngS = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; }; };

  // ================= I MATERIALI: pochi, condivisi; il colore sta nei vertici =================
  const MAT = {};
  function mat(cls) {
    if (MAT[cls]) return MAT[cls]; let m;
    if (cls === 'luce') m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    else if (cls === 'alone') m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    else if (cls === 'vetro') m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .12, metalness: .25, transparent: true, opacity: .42, depthWrite: false });
    else if (cls === 'carta' || cls === 'carta_luce' || cls === 'decal') { const A = atlante();
      m = new THREE.MeshStandardMaterial({ vertexColors: true, map: A.tex, roughness: cls === 'carta_luce' ? .5 : .88, metalness: 0, alphaTest: .32, side: THREE.DoubleSide, transparent: false });
      if (cls === 'carta_luce') { m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = A.tex; m.emissiveIntensity = .12; }
      if (cls === 'decal') { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; } }
    else { const R = { opaco: [.9, 0], medio: [.6, .05], lucido: [.3, .35] }[cls] || [.8, 0]; m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: R[0], metalness: R[1] }); }
    m.name = 'sc_' + cls; m.userData.scorci = cls; return (MAT[cls] = m);
  }

  // ================= L'ATLANTE: le scritte, i manifesti, le carte (tessere disegnate una volta) =================
  let ATL = null;
  function atlante() {
    if (ATL) return ATL; const S = 2048; ATL = { S, x: 0, y: 0, rowH: 0, tiles: new Map(), c: null, g: null, tex: null };
    if (DOC) { ATL.c = document.createElement('canvas'); ATL.c.width = ATL.c.height = S; ATL.g = ATL.c.getContext('2d'); ATL.tex = new THREE.CanvasTexture(ATL.c); ATL.tex.anisotropy = 4; ATL.tex.minFilter = THREE.LinearMipmapLinearFilter; if (typeof LeggeraMem !== 'undefined') LeggeraMem.mezza(ATL.tex); }   // [leggera] sul telefono a metà lato   // come canvasTex di render.js: i colori come sono dipinti (il gioco esce lineare)
    return ATL;
  }
  // la tessera key, pw × ph pixel, disegnata da draw(g, w, h, r) (r: un caso deterministico); torna [u0, v0, u1, v1]
  function tessera(key, pw, ph, draw) {
    const A = atlante(); if (A.tiles.has(key)) return A.tiles.get(key);
    if (A.x + pw > A.S) { A.x = 0; A.y += A.rowH + 2; A.rowH = 0; } if (A.y + ph > A.S) { A.x = 0; A.y = 0; A.rowH = 0; }   // l'atlante pieno ricomincia (non succede con questi scorci)
    const x = A.x, y = A.y; A.x += pw + 2; A.rowH = Math.max(A.rowH, ph);
    if (A.g) { const g = A.g; g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, pw, ph); g.clip(); try { draw(g, pw, ph, rngS(key)); } catch (e) { console.warn('[scorci] tessera', key, e); } g.restore(); A.tex.needsUpdate = true; }
    const t = [x / A.S, 1 - (y + ph) / A.S, (x + pw) / A.S, 1 - y / A.S]; A.tiles.set(key, t); return t;
  }
  const SERIF = 'Georgia, "Times New Roman", serif', SANS = '"Arial Narrow", Arial, Helvetica, sans-serif';
  function testo(g, t, x, y, size, col, font, maxW, align) { g.font = (font || 'bold ') + size + 'px ' + (font && font.includes('|') ? font.split('|')[1] : SANS); if (font && font.includes('|')) g.font = font.split('|')[0] + size + 'px ' + font.split('|')[1];
    g.fillStyle = col; g.textAlign = align || 'center'; g.textBaseline = 'middle'; let s = size; if (maxW) { while (g.measureText(t).width > maxW && s > 6) { s -= 2; g.font = g.font.replace(/\d+px/, s + 'px'); } } g.fillText(t, x, y); }
  function usura(g, w, h, r, n, a) { g.save(); g.globalAlpha = a || .14; for (let i = 0; i < (n || 60); i++) { g.fillStyle = r() < .5 ? '#ffffff' : '#3a2a1a'; g.fillRect(r() * w, r() * h, 2 + r() * 26, 1 + r() * 4); } g.restore(); }
  function sporco(g, w, h, a) { const gr = g.createLinearGradient(0, h * .55, 0, h); gr.addColorStop(0, 'rgba(40,30,20,0)'); gr.addColorStop(1, `rgba(40,30,20,${a || .35})`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  // il marchio di una bibita (il corsivo bianco col nastro sotto) dentro un rettangolo
  function marchioBibita(g, x, y, w, h, nome) {
    g.save(); g.translate(x + w / 2, y + h / 2); g.transform(1, 0, -.18, 1, 0, 0); testo(g, nome, 0, -h * .04, Math.floor(h * .46), '#fbf4ea', 'italic bold |' + SERIF, w * .9); g.restore();
    g.strokeStyle = '#fbf4ea'; g.lineWidth = Math.max(2, h * .05); g.beginPath(); g.moveTo(x + w * .12, y + h * .78); g.bezierCurveTo(x + w * .4, y + h * .62, x + w * .6, y + h * .95, x + w * .9, y + h * .74); g.stroke();
  }
  // i disegni delle tessere, per nome
  const DIS = {
    // la fascia a cassonetto: i due pannelli del marchio e il nome in mezzo (lo plexiglas illuminato da dentro)
    cassonetto: (o) => (g, w, h, r) => { const m = o.marchio, P = m ? w * .26 : 0; g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h);
      if (m) { const col = m === 'cocacola' ? '#c8102e' : m === 'peroni' ? '#1c3f94' : m === 'martini' ? '#b8202a' : '#c8102e'; g.fillStyle = col; g.fillRect(0, 0, P, h); g.fillRect(w - P, 0, P, h);
        const nm = m === 'cocacola' ? 'Coca-Cola' : m === 'peroni' ? 'Peroni' : m === 'martini' ? 'Martini' : m; marchioBibita(g, 4, 4, P - 8, h - 8, nm);
        g.fillStyle = '#5a1018'; g.fillRect(w - P * .7, h * .12, P * .16, h * .76); g.fillStyle = '#e8d8c0'; g.fillRect(w - P * .66, h * .3, P * .08, h * .3); testo(g, nm, w - P * .32, h * .5, Math.floor(h * .2), '#fbf4ea', 'italic bold |' + SERIF, P * .5); }
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 3; i++) g.fillRect(P + 4, h * (.2 + i * .3), w - 2 * P - 8, 1);
      testo(g, o.testo || '', w / 2, h * (o.sotto ? .4 : .5), Math.floor(h * .6), '#b0182a', '900 |' + SANS, w - 2 * P - 12); if (o.sotto) testo(g, o.sotto, w / 2, h * .84, Math.floor(h * .2), '#2a2a2e', 'bold |' + SANS, w - 2 * P - 16);
      g.strokeStyle = '#8a8e92'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); sporco(g, w, h, .18); },
    // dipinta sull'intonaco: lettere a pennello con l'ombra, sbiadite, scrostate; sotto la riga della merce
    dipinta: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); const fan = o.sbiadita;
      if (!fan) { g.fillStyle = o.fondo || 'rgba(240,226,186,.97)'; g.fillRect(0, h * .04, w, h * .92); g.strokeStyle = o.bordo || '#7a2a1e'; g.lineWidth = 8; g.strokeRect(8, h * .04 + 8, w - 16, h * .92 - 16); }
      const col = fan ? 'rgba(90,60,40,.35)' : (o.inchiostro || '#7a2a1e');
      if (o.testo) { g.save(); g.globalAlpha = fan ? .5 : 1; testo(g, o.testo, w / 2 + 4, h * (o.sotto ? .38 : .5) + 4, Math.floor(h * .56), 'rgba(40,20,10,.4)', '900 |' + SANS, w * .9); testo(g, o.testo, w / 2, h * (o.sotto ? .38 : .5), Math.floor(h * .56), col, '900 |' + SANS, w * .9); g.restore(); }
      if (o.sotto) testo(g, o.sotto, w / 2, h * .8, Math.floor(h * .2), fan ? 'rgba(60,40,30,.4)' : '#1e3a6a', 'bold |' + SANS, w * .92);
      // la scrostatura: buchi nella pittura che lasciano l'intonaco
      g.save(); g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < (fan ? 140 : 40); i++) { g.globalAlpha = .3 + r() * .7; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * (fan ? 40 : 14), 2 + r() * 6, r() * 3, 0, 7); g.fill(); } g.restore();
      usura(g, w, h, r, 40, .1); },
    // la tavola di legno laccata, le lettere graziate crema e il filetto
    tavola: (o) => (g, w, h, r) => { g.fillStyle = o.fondo || '#ece2c4'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += Math.round(h / 3)) { g.fillStyle = 'rgba(90,60,30,.18)'; g.fillRect(0, y, w, 2); }
      g.strokeStyle = '#1e4a36'; g.lineWidth = 10; g.strokeRect(6, 6, w - 12, h - 12); testo(g, o.testo || '', w / 2, h * (o.sotto ? .4 : .5), Math.floor(h * .56), '#1e4a36', '900 |' + SANS, w * .88);
      if (o.sotto) testo(g, o.sotto, w / 2, h * .82, Math.floor(h * .19), '#8a2a1e', 'bold |' + SANS, w * .88); usura(g, w, h, r, 70, .14); sporco(g, w, h, .25); },
    // a mano: il bianco a rullo sul muro, le lettere a vernice, la luna gialla
    mano: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(236,232,220,.95)'; g.beginPath(); g.moveTo(8, 10); for (let x = 8; x <= w - 8; x += 24) g.lineTo(x, 6 + r() * 8); for (let x = w - 8; x >= 8; x -= 24) g.lineTo(x, h - 6 - r() * 10); g.fill();
      g.fillStyle = '#e8b020'; g.beginPath(); g.arc(h * .55, h * .5, h * .34, 0, 7); g.fill(); g.fillStyle = 'rgba(236,232,220,1)'; g.beginPath(); g.arc(h * .68, h * .42, h * .3, 0, 7); g.fill();
      testo(g, o.testo || '', w * .56, h * .42, Math.floor(h * .44), '#1a1a24', 'bold italic |' + SANS, w * .72); if (o.sotto) testo(g, o.sotto, w * .56, h * .8, Math.floor(h * .17), '#c8287a', 'bold |' + SANS, w * .7);
      g.fillStyle = 'rgba(30,30,40,.6)'; for (let i = 0; i < 5; i++) g.fillRect(w * (.2 + r() * .7), h * .64, 2, 6 + r() * 14); },   // le colature
    // le insegne secondarie: tavolette dipinte
    insegna2: (o) => (g, w, h, r) => { g.fillStyle = o.fondo || '#f0e8d4'; g.fillRect(0, 0, w, h); g.strokeStyle = o.inchiostro || '#2a3a6a'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); testo(g, o.testo || '', w / 2, h / 2, Math.floor(h * .5), o.inchiostro || '#2a3a6a', 'bold |' + SANS, w * .9); usura(g, w, h, r, 30, .12); sporco(g, w, h, .25); },
    // le bandiere luminose
    bandiera: (o) => (g, w, h, r) => { const m = o.marchio;
      if (m === 'T') { g.fillStyle = '#1a2a6a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ea'; g.fillRect(w * .18, h * .14, w * .64, h * .16); g.fillRect(w * .42, h * .14, w * .16, h * .62); testo(g, 'TABACCHI', w / 2, h * .88, Math.floor(h * .13), '#f4f2ea', 'bold |' + SANS, w * .9); }
      else if (m === 'peroni') { g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c3f94'; g.fillRect(0, h * .7, w, h * .3); g.fillStyle = '#c8102e'; g.beginPath(); g.ellipse(w / 2, h * .38, w * .4, h * .26, 0, 0, 7); g.fill(); testo(g, 'Peroni', w / 2, h * .38, Math.floor(h * .2), '#f4f0e6', 'italic bold |' + SERIF, w * .7); testo(g, 'BIRRA', w / 2, h * .85, Math.floor(h * .14), '#f4f0e6', 'bold |' + SANS); }
      else if (m === 'sammontana') { g.fillStyle = '#2a5ab0'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f2ea'; g.beginPath(); g.arc(w / 2, h * .38, w * .3, 0, 7); g.fill(); testo(g, 'S', w / 2, h * .4, Math.floor(h * .36), '#c8102e', 'italic bold |' + SERIF); testo(g, 'GELATI', w / 2, h * .82, Math.floor(h * .16), '#f4f2ea', 'bold |' + SANS, w * .9); }
      else if (m === 'gas') { g.fillStyle = '#e8b818'; g.fillRect(0, 0, w, h); g.fillStyle = '#b8282a'; g.fillRect(w * .36, h * .14, w * .28, h * .5); g.beginPath(); g.ellipse(w / 2, h * .16, w * .14, h * .07, 0, 0, 7); g.fill(); testo(g, 'GAS', w / 2, h * .84, Math.floor(h * .22), '#1a1a1e', 'bold |' + SANS); }
      else { g.fillStyle = '#c8102e'; g.fillRect(0, 0, w, h); marchioBibita(g, 6, h * .2, w - 12, h * .5, 'Coca-Cola'); }
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); },
    // il palo del barbiere: le strisce in diagonale
    barbiere: () => (g, w, h) => { g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h); const cols = ['#c8202a', '#f4f2ec', '#2a4aa0', '#f4f2ec']; for (let i = -8; i < 16; i++) { g.fillStyle = cols[((i % 4) + 4) % 4]; g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4 + w / 4, 0); g.lineTo(i * w / 4 + w / 4 - w, h); g.lineTo(i * w / 4 - w, h); g.fill(); } },
    // la serranda: le doghe, lo sporco, la tag a spray
    serranda: (o) => (g, w, h, r) => { g.fillStyle = '#7a7268'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 6) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, y + 4, w, 2); }
      g.fillStyle = 'rgba(110,58,34,.35)'; for (let i = 0; i < 40; i++) g.fillRect(r() * w, h * (.5 + r() * .5), 2 + r() * 10, 1 + r() * 6); sporco(g, w, h, .45);
      if (o.tag) { const cols = ['#f4f2ea', '#e84aa0', '#35c0e0', '#f0d020']; g.save(); g.translate(w * .5, h * .42); g.rotate(-.08); g.lineWidth = Math.max(6, h * .05); g.lineJoin = 'round'; g.lineCap = 'round';
        const c = cols[Math.floor(r() * cols.length)]; g.strokeStyle = 'rgba(20,20,24,.85)'; tagPath(g, w, h, r, 3); g.strokeStyle = c; tagPath(g, w, h, rngS('tag' + (o.tagSeme || 1)), 0); g.restore(); } },
    // la griglia di filo zincato (trasparente fra i fili)
    griglia: () => (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#a8aca8'; g.lineWidth = 2; for (let x = 0; x <= w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#6a6e6a'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); },
    // la vetrofania: le riviste stipate, i prezzi a pennarello, la tendina
    vetrofania: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); const k = o.carta;
      if (k === 'riviste') { const cols = ['#d84a4a', '#ece0c0', '#4a7ad0', '#e8b840', '#50b098', '#e070a0', '#f4f0e0', '#2a2a2e']; let y = h * .06;
        while (y < h * .92) { let x = w * .03; const rh = h * (.16 + r() * .08); while (x < w * .96) { const cw = w * (.09 + r() * .06); if (r() < .86) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, cw - 3, rh - 4); g.fillStyle = 'rgba(20,20,20,.8)'; g.fillRect(x + 3, y + 3, cw - 9, rh * .16); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + cw * .2, y + rh * .35, cw * .5, rh * .45); } x += cw; } y += rh; }
        g.fillStyle = '#f4f0e0'; g.fillRect(w * .05, h * .7, w * .32, h * .22); testo(g, 'TOTOCALCIO', w * .21, h * .78, Math.floor(h * .06), '#1a7a3a', 'bold |' + SANS, w * .3); testo(g, 'QUI', w * .21, h * .87, Math.floor(h * .06), '#c8102e', 'bold |' + SANS); }
      else if (k === 'prezzi') { const prezzi = ['PASTA 1100', 'OLIO 3900', 'CAFFÈ 2500', 'ZUCCHERO 1350', 'VINO 1800', 'UOVA 280', 'SAPONE 700']; for (let i = 0; i < 6; i++) { const x = w * (.04 + (i % 3) * .32), y = h * (.12 + Math.floor(i / 3) * .38), cw = w * .28, ch = h * .3; g.save(); g.translate(x + cw / 2, y + ch / 2); g.rotate((r() - .5) * .12);
          g.fillStyle = i % 2 ? '#f8f040' : '#f4f0e4'; g.fillRect(-cw / 2, -ch / 2, cw, ch); const [a, b] = prezzi[i].split(' '); testo(g, a, 0, -ch * .18, Math.floor(ch * .26), '#1a3a8a', 'bold |' + SANS, cw * .9); testo(g, 'L. ' + b, 0, ch * .22, Math.floor(ch * .3), '#c8102e', 'bold |' + SANS, cw * .9); g.restore(); }
        g.fillStyle = '#f4f0e4'; g.fillRect(w * .62, h * .8, w * .34, h * .16); testo(g, 'ATM', w * .79, h * .88, Math.floor(h * .1), '#c8102e', 'bold |' + SANS); }
      else if (k === 'tendina') { g.fillStyle = 'rgba(240,236,224,.88)'; g.fillRect(0, 0, w, h * .62); g.strokeStyle = 'rgba(180,170,150,.8)'; for (let x = 6; x < w; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, h * .62); g.stroke(); }
        g.fillStyle = 'rgba(200,190,170,.9)'; for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x + 8, h * .62, 8, 0, PI); g.fill(); } testo(g, 'BARBIERE · DAL 1952', w / 2, h * .32, Math.floor(h * .09), '#8a2a2a', 'italic bold |' + SERIF, w * .9); }
      else { g.fillStyle = 'rgba(240,236,224,.8)'; g.fillRect(0, 0, w, h * .3); } },
    // il pannello di lamiera forata, arrugginito, con la vernice arancio che se ne va
    forato: () => (g, w, h, r) => { g.fillStyle = '#c8862a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(110,52,24,.75)'; for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * w, h * (.3 + r() * .7), 6 + r() * 30, 4 + r() * 16, r() * 3, 0, 7); g.fill(); }
      g.save(); g.globalCompositeOperation = 'destination-out'; for (let y = 5; y < h; y += 9) for (let x = (y % 18 ? 4 : 8); x < w; x += 9) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); } g.restore();
      g.strokeStyle = '#6a3a1a'; g.lineWidth = 6; g.strokeRect(2, 2, w - 4, h - 4); },
    // lo zoccolo: lo sporco che sale dal marciapiede, le colature, gli scarabocchi
    zoccolo: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(50,40,30,0)'); gr.addColorStop(.45, `rgba(50,40,30,${o.forte ? .35 : .22})`); gr.addColorStop(1, `rgba(36,28,22,${o.forte ? .75 : .55})`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(40,30,22,.35)'; for (let i = 0; i < 30; i++) { const x = r() * w; g.fillRect(x, h * (.2 + r() * .3), 2 + r() * 3, h); }
      g.strokeStyle = 'rgba(30,30,40,.55)'; g.lineWidth = 3; for (let i = 0; i < (o.forte ? 6 : 2); i++) { g.beginPath(); let x = r() * w, y = h * (.3 + r() * .4); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 8 + r() * 16; y += (r() - .5) * 18; g.lineTo(x, y); } g.stroke(); } },
    // la crepa nell'intonaco che scopre i mattoni
    crepa: () => (g, w, h, r) => { g.clearRect(0, 0, w, h); g.save(); g.beginPath(); const cx = w * .5, cy = h * .5; for (let a = 0; a < 18; a++) { const an = a / 18 * PI * 2, rr = (.28 + r() * .2) * Math.min(w, h) * (a % 3 ? 1 : .7); a ? g.lineTo(cx + Math.cos(an) * rr * 1.3, cy + Math.sin(an) * rr) : g.moveTo(cx + Math.cos(an) * rr * 1.3, cy + Math.sin(an) * rr); } g.closePath(); g.clip();
      g.fillStyle = '#c8b8a0'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) for (let x = (y / 14) % 2 ? -14 : 0; x < w; x += 28) { g.fillStyle = ['#a8583a', '#9a4a30', '#b86a48', '#8a4430'][Math.floor(r() * 4)]; g.fillRect(x + 1, y + 1, 26, 12); } g.restore();
      g.strokeStyle = 'rgba(60,46,36,.8)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); let x = w * .5, y = h * .5; g.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - .5) * 40 + (i % 2 ? 10 : -10); y += (r() - .3) * 26 * (i < 2 ? -1 : 1); g.lineTo(x, y); } g.stroke(); } },
    // i manifesti a strati: uno sopra l'altro, uno strappato, la colla che cola
    manifesti: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); const k = o.carta || 'strati';
      const foglio = (x, y, fw, fh, fondo, titolo, col, sotto) => { g.save(); g.translate(x + fw / 2, y + fh / 2); g.rotate((r() - .5) * .06); g.fillStyle = fondo; g.fillRect(-fw / 2, -fh / 2, fw, fh); testo(g, titolo, 0, -fh * .22, Math.floor(fh * .16), col, 'bold |' + SANS, fw * .9); if (sotto) testo(g, sotto, 0, fh * .18, Math.floor(fh * .09), col, 'bold |' + SANS, fw * .85); usura(g, fw, fh, r, 20, .1); g.restore(); };
      if (k === 'concerti') { foglio(w * .02, h * .05, w * .5, h * .6, '#1a1a24', 'RADIO LUNA', '#ff4fa3', 'CYPHER ALLA GRATA · SAB 22'); foglio(w * .46, h * .12, w * .5, h * .55, '#e8b020', '98.6', '#1a1a1a', 'ACCENDI LA LUNA'); foglio(w * .2, h * .55, w * .55, h * .42, '#35c0e0', 'JAM SESSION', '#1a1a24', 'MAGAZZINO · INGRESSO LIBERO'); }
      else if (k === 'disgelo') { foglio(w * .05, h * .04, w * .6, h * .7, '#e4e0d4', 'DISGELO', '#1a1a1a', 'LA MINIERA CI MANGIA VIVI'); foglio(w * .45, h * .3, w * .5, h * .62, '#d8d4c4', 'IL GHIACCIO SI ROMPE', '#a8262a', 'CICLOSTILATO IN PROPRIO'); }
      else { foglio(w * .02, h * .02, w * .62, h * .62, '#e8e0cc', 'IL GARANTE', '#a8262a', 'LAVORA · CONSUMA · PAGA LA RATA'); foglio(w * .36, h * .2, w * .6, h * .55, '#f0e8d8', 'L\'UTILITARIA', '#2a4a8a', '48 RATE SENZA ANTICIPO'); foglio(w * .1, h * .52, w * .52, h * .45, '#e4e0d4', 'DISGELO', '#1a1a1a', 'NON FIRMATE LE CAMBIALI');
        g.fillStyle = '#f4f0e4'; g.save(); g.translate(w * .68, h * .78); g.rotate(-.05); g.fillRect(-w * .22, -h * .12, w * .44, h * .24); testo(g, 'CEDESI ATTIVITÀ', 0, -h * .03, Math.floor(h * .07), '#1a1a1a', 'bold |' + SANS, w * .4); testo(g, 'TEL. 23 41 07', 0, h * .06, Math.floor(h * .05), '#3a3a3a', 'bold |' + SANS); g.restore(); }
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(w, h * .1); for (let i = 0; i < 8; i++) g.lineTo(w - r() * w * .18, h * (.1 + i * .11)); g.lineTo(w, h); g.fill(); g.restore(); },   // il margine strappato
    necrologi: () => (g, w, h, r) => { g.clearRect(0, 0, w, h); const nomi = [['ANTONIO DEIANA', 'di anni 78'], ['ROSA MELIS ved. SERRA', 'di anni 91']]; nomi.forEach(([n, a], i) => { const x = w * (.04 + i * .5), y = h * (.06 + i * .1), fw = w * .44, fh = h * .78; g.fillStyle = '#f4f2ec'; g.fillRect(x, y, fw, fh); g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(x + 4, y + 4, fw - 8, fh - 8);
        g.fillStyle = '#1a1a1a'; g.fillRect(x + fw / 2 - 2, y + fh * .1, 4, fh * .14); g.fillRect(x + fw / 2 - 9, y + fh * .14, 18, 4); testo(g, 'È MANCATO', x + fw / 2, y + fh * .34, Math.floor(fh * .06), '#1a1a1a', 'bold |' + SERIF, fw * .8); testo(g, n, x + fw / 2, y + fh * .48, Math.floor(fh * .085), '#1a1a1a', 'bold |' + SERIF, fw * .85); testo(g, a, x + fw / 2, y + fh * .6, Math.floor(fh * .055), '#3a3a3a', 'italic |' + SERIF);
        for (let k = 0; k < 3; k++) g.fillRect(x + fw * .15, y + fh * (.7 + k * .06), fw * .7, 2); }); },
    targa: (o) => (g, w, h, r) => { g.fillStyle = '#ece8de'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(140,130,120,.4)'; for (let i = 0; i < 6; i++) { g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (r() - .5) * 30; y += 10; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 3; g.strokeRect(8, 8, w - 16, h - 16); const R = String(o.testo || '').split('\n'); R.forEach((t, i) => testo(g, t, w / 2, h / 2 + (i - (R.length - 1) / 2) * h * .3, Math.floor(h * .24), '#1e1e22', 'bold |' + SERIF, w * .86)); sporco(g, w, h, .2); },
    telefono: () => (g, w, h) => { g.fillStyle = '#e07a20'; g.fillRect(0, 0, w, h); testo(g, 'TELEFONO', w / 2, h * .5, Math.floor(h * .6), '#f4f2ea', 'bold |' + SANS, w * .9); },
    tastiera: () => (g, w, h) => { g.fillStyle = '#4a4e52'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8d8d0'; for (let i = 0; i < 12; i++) g.fillRect(w * (.12 + (i % 3) * .28), h * (.1 + Math.floor(i / 3) * .2), w * .2, h * .14); },
    lavagna: (o) => (g, w, h, r) => { g.fillStyle = '#1e2420'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6440'; g.lineWidth = 14; g.strokeRect(0, 0, w, h); const R = String(o.testo || '').split('\n'); R.forEach((t, i) => testo(g, t, w / 2, h * (.32 + i * .26), Math.floor(h * .14), 'rgba(240,236,224,.9)', 'bold |' + SANS, w * .8)); g.fillStyle = 'rgba(240,236,224,.15)'; for (let i = 0; i < 30; i++) g.fillRect(r() * w, r() * h, 10 + r() * 30, 2); },
    locandina: (o) => (g, w, h, r) => { g.fillStyle = '#f2ecdc'; g.fillRect(0, 0, w, h); g.fillStyle = o.testata === 'gazzetta' ? '#e88aa0' : '#a8262a'; g.fillRect(0, 0, w, h * .18); testo(g, o.testata === 'gazzetta' ? 'LA GAZZETTA' : 'CORRIERE DEL GELO', w / 2, h * .09, Math.floor(h * .07), '#f2ecdc', 'bold |' + SERIF, w * .9);
      const T = o.testata === 'gazzetta' ? ['ROSSOBLU', 'SALVI ALL\'ULTIMO', 'MINUTO'] : ['LA MINIERA', 'ASSUME:', 'TURNI DI NOTTE']; T.forEach((t, i) => testo(g, t, w / 2, h * (.34 + i * .17), Math.floor(h * .12), '#1a1a1a', 'bold |' + SANS, w * .9)); usura(g, w, h, r, 30, .12); },
    cartellone: (o) => (g, w, h, r) => { g.fillStyle = '#e8e2d0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1e4a7a'; g.fillRect(0, 0, w, h * .62); testo(g, o.testo || '', w / 2, h * .32, Math.floor(h * .34), '#f2ecdc', 'bold |' + SANS, w * .92); testo(g, o.sotto || '', w / 2, h * .8, Math.floor(h * .17), '#1e4a7a', 'bold |' + SANS, w * .92);
      g.fillStyle = 'rgba(120,60,30,.5)'; for (let i = 0; i < 20; i++) g.fillRect(r() * w, h * (.55 + r() * .45), 2, 4 + r() * 20); usura(g, w, h, r, 80, .14); },
    mantovana: (o) => (g, w, h) => { g.fillStyle = o.col || '#c8202a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h * .7); g.lineTo(x + 32, h); g.fill(); }
      testo(g, o.testo || '', w / 2, h * .38, Math.floor(h * .5), '#f6f0e2', '900 |' + SANS, w * .94); },
    pesce: () => (g, w, h) => { g.fillStyle = '#2a5a7a'; g.fillRect(0, 0, w, h); testo(g, 'PESCE FRESCO', w / 2, h * .38, Math.floor(h * .34), '#f2efe6', 'bold |' + SANS, w * .9); testo(g, 'DEL GOLFO', w / 2, h * .78, Math.floor(h * .2), '#f0d060', 'bold |' + SANS, w * .8); },
    carte: () => (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const x = w * (.06 + (i % 3) * .31), y = h * (.08 + Math.floor(i / 3) * .48), cw = w * .26, ch = h * .4; g.fillStyle = '#f4f0e4'; g.fillRect(x, y, cw, ch); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; g.strokeRect(x, y, cw, ch); g.fillStyle = ['#c8202a', '#d8a020', '#2a6a3a', '#2a3a8a'][i % 4]; g.beginPath(); g.arc(x + cw / 2, y + ch / 2, cw * .22, 0, 7); g.fill(); } },
    sacco: () => (g, w, h) => { g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, w, h); testo(g, 'FARINA', w / 2, h * .38, Math.floor(h * .28), '#2a4a8a', 'bold |' + SANS, w * .9); testo(g, 'TIPO 00 · 25 kg', w / 2, h * .72, Math.floor(h * .14), '#c8202a', 'bold |' + SANS, w * .9); },
    birre: () => (g, w, h) => { g.fillStyle = '#c8202a'; g.fillRect(0, 0, w, h); testo(g, 'PERONI', w / 2, h * .5, Math.floor(h * .6), '#f0d020', 'bold |' + SANS, w * .9); },
    giornale: () => (g, w, h, r) => { g.fillStyle = '#ece6d4'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a1a1a'; g.fillRect(w * .05, h * .06, w * .9, h * .12); for (let c = 0; c < 3; c++) for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(40,40,40,.65)'; g.fillRect(w * (.05 + c * .31), h * (.26 + i * .08), w * .27, 3); } },
    boombox: () => (g, w, h) => { g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, w, h); [w * .22, w * .78].forEach(x => { g.fillStyle = '#6a6e72'; g.beginPath(); g.arc(x, h * .55, h * .32, 0, 7); g.fill(); g.fillStyle = '#1a1a1e'; g.beginPath(); g.arc(x, h * .55, h * .14, 0, 7); g.fill(); }); g.fillStyle = '#c8c4b8'; g.fillRect(w * .4, h * .3, w * .2, h * .4); g.fillStyle = '#e8b020'; g.fillRect(w * .42, h * .1, w * .16, h * .1); },
    tag: (o) => (g, w, h, r) => { g.clearRect(0, 0, w, h); g.save(); g.translate(w / 2, h / 2); g.lineWidth = h * .1; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = 'rgba(20,20,24,.8)'; tagPath(g, w * 1.6, h * 1.6, rngS('t' + (o.seme || 0)), 3); g.strokeStyle = o.col || '#e84aa0'; tagPath(g, w * 1.6, h * 1.6, rngS('t' + (o.seme || 0)), 0); g.restore(); },
  };
  // la firma a spray: tre lettere a nastro, con l'ombra spostata
  function tagPath(g, w, h, r, off) { g.beginPath(); let x = -w * .3 + off, y = off; g.moveTo(x, y); for (let i = 0; i < 14; i++) { x += w * (.03 + r() * .03); y = off + Math.sin(i * 1.7 + r()) * h * .14 + (r() - .5) * h * .06; g.quadraticCurveTo(x - w * .02, y - h * .12 * (i % 2 ? 1 : -1), x, y); } g.stroke(); }
  const T = (key, pw, ph, dis) => tessera(key, pw, ph, dis);

  // ================= LE GEOMETRIE (condivise) =================
  const GEO = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 12), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cyl20: new THREE.CylinderGeometry(1, 1, 1, 20), sph: new THREE.SphereGeometry(1, 10, 7), sph6: new THREE.SphereGeometry(1, 6, 4), cone: new THREE.ConeGeometry(1, 1, 12, 1, true), plane: new THREE.PlaneGeometry(1, 1), tor: new THREE.TorusGeometry(1, .32, 6, 14), ico: new THREE.IcosahedronGeometry(1, 0), circ: new THREE.CircleGeometry(1, 20) };
  const PG = new Map();
  function pianoTessera(t) { const k = t.join(','); if (PG.has(k)) return PG.get(k); const g = GEO.plane.clone(), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, t[0] + (t[2] - t[0]) * uv.getX(i), t[1] + (t[3] - t[1]) * uv.getY(i)); PG.set(k, g); return g; }
  // una mesh nel gruppo: geometria, colore, classe di materiale, posizione, scala, rotazione; userData.col (il colore nei vertici), .stato (il gruppo di stato)
  function M(g, geo, col, cls, x, y, z, sx, sy, sz, rx, ry, rz) { const m = new THREE.Mesh(geo, mat(cls || 'medio')); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); m.userData.col = col || '#ffffff'; if (g.userData.__stato) m.userData.stato = g.userData.__stato; g.add(m); return m; }
  const Bx = (g, w, h, d, col, x, y, z, cls, rx, ry, rz) => M(g, GEO.box, col, cls, x, y, z, w, h, d, rx, ry, rz);   // scatola centrata in x, y, z
  const Cy = (g, r, h, col, x, y, z, cls, rx, ry, rz, seg) => M(g, seg === 6 ? GEO.cyl6 : seg === 20 ? GEO.cyl20 : GEO.cyl, col, cls, x, y, z, r, h, r, rx, ry, rz);
  const Sp = (g, r, col, x, y, z, cls, sx, sy, sz) => M(g, GEO.sph, col, cls, x, y, z, r * (sx || 1), r * (sy || 1), r * (sz || 1));
  const Pi = (g, t, w, h, x, y, z, cls, rx, ry, rz, col) => M(g, pianoTessera(t), col || '#ffffff', cls || 'carta', x, y, z, w, h, 1, rx, ry, rz);   // un piano con una tessera dell'atlante
  // un'asta da a a b (raggio r)
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function As(g, a, b, r, col, cls, seg) { _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = _a.length(); const m = Cy(g, r, L, col, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, cls, 0, 0, 0, seg || 6); m.quaternion.setFromUnitVectors(_up, _a.normalize()); return m; }
  // il gruppo di stato: le mesh fatte dentro f() appartengono allo stato s (merce, tavoli, impilati, serranda_chiusa, serranda_mezza, banco, forno, luminarie)
  function stato(g, s, f) { const p = g.userData.__stato; g.userData.__stato = s; try { f(); } finally { g.userData.__stato = p; } }
  // un pezzo di Arredo3D (i modelli rifatti di [modelli1]) dentro il gruppo, coi colori presi dai suoi materiali
  function arredo(g, tipo, o, x, y, z, ry) { const A = AR(); if (!A) return null; const a = A.make(tipo, Object.assign({ liv: 0 }, o || {})); if (!a) return null; a.position.set(x || 0, y || 0, z || 0); a.rotation.y = ry || 0; a.userData.arredo = true; if (g.userData.__stato) a.traverse(m => { if (m.isMesh) m.userData.stato = g.userData.__stato; }); g.add(a); return a; }

  // ================= I PEZZI =================
  const K = {};
  // ---- la fascia dell'insegna (w × .62 sopra le aperture) ----
  K.fascia = (o) => { const g = new THREE.Group(), w = o.w || 3, h = o.h || .8, st = o.stile || 'dipinta', d = { testo: o.testo || '', sotto: o.sotto || '', marchio: o.marchio || null, sbiadita: !!(o.sbiadita || o.fantasma) };
    const key = 'fascia|' + st + '|' + d.testo + '|' + d.sotto + '|' + d.marchio + '|' + d.sbiadita, pw = 1024, ph = Math.max(96, Math.round(1024 * h / Math.max(1, w)));
    if (st === 'cassonetto') { Bx(g, w + .06, h + .06, .16, '#4a4e52', 0, h / 2, .08, 'lucido'); Bx(g, w + .1, .05, .2, '#6a6e72', 0, h + .055, .1, 'lucido'); Bx(g, w + .1, .05, .2, '#6a6e72', 0, .0, .1, 'lucido');
      Pi(g, T(key, pw, ph, DIS.cassonetto(d)), w, h, 0, h / 2, .165, 'carta_luce'); [-1, 1].forEach(s => Bx(g, .06, .3, .08, '#3a3e42', s * (w / 2 - .25), h + .2, .04, 'lucido')); }
    else if (st === 'tavola') { Bx(g, w + .08, h + .08, .05, '#3a2a1e', 0, h / 2, .025, 'opaco'); Pi(g, T(key, pw, ph, DIS.tavola(d)), w, h, 0, h / 2, .053, 'carta'); Bx(g, w + .12, .04, .08, '#2a1e16', 0, h + .06, .04, 'opaco');
      [-1, 1].forEach(s => { Cy(g, .012, .02, '#8a8e92', s * (w / 2 - .12), h * .5, .06, 'lucido', PI / 2); }); }
    else if (st === 'mano') { Pi(g, T(key, pw, ph, DIS.mano(d)), w, h * 1.25, 0, h * .6, .008, 'decal'); }
    else { Pi(g, T(key, pw, ph, DIS.dipinta(d)), w, h, 0, h / 2, .006, 'decal'); }
    return g; };
  K.insegna2 = (o) => { const g = new THREE.Group(), w = o.w || 1.5, h = .34; Bx(g, w + .04, h + .04, .03, '#5a4a3a', 0, h / 2, .015, 'opaco'); Pi(g, T('ins2|' + o.testo, 512, 116, DIS.insegna2({ testo: o.testo || '', fondo: o.fondo, inchiostro: o.inchiostro })), w, h, 0, h / 2, .032); [-1, 1].forEach(s => Cy(g, .01, .02, '#8a8e92', s * (w / 2 - .06), h / 2, .04, 'lucido', PI / 2)); return g; };
  // ---- la bandiera luminosa a sbalzo: la piastra, i due bracci, la scatola con le due facce accese ----
  K.bandiera = (o) => { const g = new THREE.Group(), s = .56, m = o.marchio || 'cocacola', t = T('band|' + m, 256, 256, DIS.bandiera({ marchio: m }));
    Bx(g, .12, .44, .03, '#3a3e42', 0, .31, .015, 'lucido'); [.14, .48].forEach(y => As(g, [0, y, .02], [0, y, .2], .014, '#3a3e42', 'lucido'));
    Bx(g, .12, s + .04, s + .04, '#5a5e62', 0, .31, .2 + s / 2, 'lucido'); [-1, 1].forEach(sd => Pi(g, t, s, s, sd * .062, .31, .2 + s / 2, 'carta_luce', 0, sd * PI / 2, 0)); return g; };
  K.palo_barbiere = () => { const g = new THREE.Group(), t = T('barbiere', 128, 256, DIS.barbiere()); Bx(g, .14, .5, .03, '#8a8e92', 0, .45, .015, 'lucido'); As(g, [0, .7, .02], [0, .7, .2], .02, '#b8bcc0', 'lucido'); As(g, [0, .2, .02], [0, .2, .2], .02, '#b8bcc0', 'lucido');
    const cyl = new THREE.CylinderGeometry(.075, .075, .56, 16, 1, true), uv = cyl.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, t[0] + (t[2] - t[0]) * uv.getX(i), t[1] + (t[3] - t[1]) * uv.getY(i)); M(g, cyl, '#ffffff', 'carta_luce', 0, .45, .24);
    [.16, .74].forEach(y => { Cy(g, .09, .06, '#c8ccd0', 0, y, .24, 'lucido'); }); Sp(g, .05, '#c8ccd0', 0, .8, .24, 'lucido'); return g; };
  // ---- la lampada a collo d'oca sopra l'insegna, col piatto smaltato e la lampadina ----
  K.lampada = () => { const g = new THREE.Group(); Bx(g, .12, .16, .03, '#2a2c2e', 0, .1, .015, 'lucido');
    As(g, [0, .1, .02], [0, .28, .2], .012, '#2a2c2e', 'lucido'); As(g, [0, .28, .2], [0, .26, .44], .012, '#2a2c2e', 'lucido');
    M(g, GEO.cone, '#2f5a3e', 'lucido', 0, .2, .5, .16, .12, .16); M(g, GEO.circ, '#f4f0e0', 'medio', 0, .14, .5, .155, .155, 1, PI / 2); stato(g, 'luci', () => Sp(g, .04, '#ffe6b0', 0, .15, .5, 'luce')); return g; };
  // ---- la serranda: il cassonetto e le guide sempre; giù (con la tag) o a metà secondo l'ora ----
  K.serranda = (o) => { const g = new THREE.Group(), w = o.w || 1.1, H = o.h || 2.2, tw = w + .1;
    Bx(g, tw + .04, .24, .2, '#6e7174', 0, H + .12, .1, 'lucido'); [-1, 1].forEach(s => Bx(g, .04, H, .05, '#5e6164', s * (tw / 2), H / 2, .03, 'lucido'));
    const tC = T('serr|' + (o.tag ? 'tag' + (o.seme || 0) : 'nuda'), 256, 256, DIS.serranda({ tag: o.tag, tagSeme: o.seme }));
    stato(g, 'serranda_chiusa', () => { Pi(g, tC, tw - .02, H, 0, H / 2, .045, 'carta', 0, 0, 0, '#d8d4cc'); Bx(g, tw - .04, .05, .04, '#4a4c4e', 0, .04, .05, 'lucido'); Bx(g, .12, .05, .05, '#2a2a2c', 0, .3, .07, 'lucido'); });
    const tM = T('serr|mezza', 256, 128, DIS.serranda({})); stato(g, 'serranda_mezza', () => { Pi(g, tM, tw - .02, H * .45, 0, H - H * .225, .045, 'carta', 0, 0, 0, '#d8d4cc'); Bx(g, tw - .04, .05, .04, '#4a4c4e', 0, H * .55, .05, 'lucido'); });
    return g; };
  // la tenda da sole a strisce sopra le vetrine: il telo inclinato, i bracci, la mantovana col nome stampato (dall'alto si legge per prima)
  K.tenda = (o) => { const g = new THREE.Group(), w = o.w || 2, D = o.d || 1.25, cA = o.col || '#c8202a', cB = o.col2 || '#f2ece0', n = Math.max(4, Math.round(w / .32)), ca = .42, H0 = 0;
    Bx(g, w + .1, .1, .12, '#5a5e62', 0, H0 + .05, .06, 'lucido');   // il rullo nel cassonetto
    const tz = Math.cos(ca) * D, ty = Math.sin(ca) * D; for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n; Bx(g, w / n + .002, .015, D, i % 2 ? cB : cA, x, H0 - ty / 2, tz / 2, 'opaco', ca, 0, 0); }
    [-1, 1].forEach(s => As(g, [s * (w / 2 - .04), H0 - .55, .02], [s * (w / 2 - .04), H0 - ty + .02, tz - .02], .014, '#3a3e42', 'lucido'));
    if (o.testo) Pi(g, T('mant|' + o.testo + '|' + cA, 1024, 96, DIS.mantovana({ testo: o.testo, col: cA })), w, .24, 0, H0 - ty - .12, tz + .012, 'carta'); else Bx(g, w, .22, .012, cA, 0, H0 - ty - .11, tz, 'opaco');
    return g; };
  K.griglia = (o) => { const g = new THREE.Group(), w = (o.w || 1.6) * .95, h = 1.5; Pi(g, T('griglia', 256, 256, DIS.griglia()), w, h, 0, .65 + h / 2 - .02, .07, 'carta', 0, 0, 0, '#c8ccc8'); [-1, 1].forEach(s => Bx(g, .03, .06, .07, '#5a5e5a', s * w / 2, .7, .035, 'lucido')); Bx(g, .04, .07, .03, '#8a7a3a', w / 2 - .05, 1.3, .09, 'lucido'); return g; };
  K.vetrofania = (o) => { const g = new THREE.Group(), w = Math.max(.6, (o.w || 1.6) - .2), h = 1.25, k = o.carta || 'riviste'; Pi(g, T('vetro|' + k, 512, 400, DIS.vetrofania({ carta: k })), w, h, 0, .68 + h / 2, .018, 'carta'); return g; };
  K.pannello_forato = (o) => { const g = new THREE.Group(), w = (o.w || 1.6) - .05; Pi(g, T('forato', 512, 256, DIS.forato()), w, .9, 0, .5, .018, 'carta'); [-1, 1].forEach(s => [.12, .88].forEach(y => Cy(g, .012, .02, '#6a3a1a', s * (w / 2 - .05), y, .022, 'medio', PI / 2))); return g; };
  // lo zoccolo sporco: un nastro per tratto di muro pieno (o.tratti: [[u0, u1], ...] relativi al centro)
  K.zoccolo = (o) => { const g = new THREE.Group(), t = T('zoccolo|' + (o.forte ? 1 : 0), 512, 96, DIS.zoccolo({ forte: o.forte })); (o.tratti || [[-(o.w || 3) / 2, (o.w || 3) / 2]]).forEach(([a, c]) => { if (c - a < .12) return; Pi(g, t, c - a, .55, (a + c) / 2, .275, .006, 'decal'); }); return g; };
  K.crepa = () => { const g = new THREE.Group(); Pi(g, T('crepa', 256, 256, DIS.crepa()), 1.1, 1.0, 0, .5, .008, 'decal'); return g; };
  K.manifesti = (o) => { const g = new THREE.Group(), w = o.w || 1.3, h = o.h || 1.1, k = o.carta || 'strati'; Pi(g, T('manif|' + k, 512, 440, DIS.manifesti({ carta: k })), w, h, 0, h / 2, (o.d || .02) * .5 + .006, 'decal'); return g; };
  K.necrologi = () => { const g = new THREE.Group(); Pi(g, T('necro', 512, 440, DIS.necrologi()), .9, .78, 0, .4, .008, 'decal'); return g; };
  K.targa = (o) => { const g = new THREE.Group(); Bx(g, .6, .35, .03, '#e2ded2', 0, .175, .015, 'medio'); Pi(g, T('targa|' + o.testo, 256, 150, DIS.targa({ testo: o.testo || '' })), .56, .31, 0, .175, .031); [[-.26, .03], [.26, .03], [-.26, .32], [.26, .32]].forEach(([x, y]) => Cy(g, .01, .01, '#7a7a7a', x, y, .033, 'lucido', PI / 2)); return g; };
  // il telefono a gettoni della SIP: la cassa grigia, la testata arancio TELEFONO, la cornetta nera col filo, il tettuccio
  function telefono(g, y0) { Bx(g, .32, .5, .16, '#9aa0a4', 0, y0 + .25, .1, 'medio'); Pi(g, T('telefono', 256, 64, DIS.telefono()), .3, .075, 0, y0 + .46, .182, 'carta_luce');
    Pi(g, T('tastiera', 128, 160, DIS.tastiera()), .12, .15, .07, y0 + .26, .182); Bx(g, .07, .26, .07, '#1c1c1e', -.1, y0 + .26, .21, 'lucido'); As(g, [-.1, y0 + .12, .2], [-.04, y0 + .02, .22], .006, '#1c1c1e', 'lucido');
    Bx(g, .06, .02, .02, '#2a2a2e', .07, y0 + .4, .185, 'lucido'); M(g, new THREE.SphereGeometry(1, 12, 6, 0, PI * 2, 0, PI / 2), '#e07a20', 'lucido', 0, y0 + .52, .14, .3, .2, .24); Bx(g, .3, .025, .18, '#5a5e62', 0, y0 - .05, .12, 'medio'); }
  K.telefono_muro = () => { const g = new THREE.Group(); Bx(g, .4, .7, .02, '#6a6e72', 0, .35, .01, 'medio'); telefono(g, .12); return g; };
  K.telefono_palo = () => { const g = new THREE.Group(); Cy(g, .05, 2.0, '#8a8e92', 0, 1.0, -.06, 'lucido'); Cy(g, .1, .05, '#6a6e72', 0, .025, -.06, 'medio'); Bx(g, .36, .5, .02, '#6a6e72', 0, 1.35, 0, 'medio'); telefono(g, 1.12); Pi(g, T('telefono', 256, 64, DIS.telefono()), .4, .1, 0, 1.92, -.002, 'carta_luce', 0, PI); return g; };
  // i festoni: le bandierine sul filo, sopra la fascia
  K.festoni = (o) => { const g = new THREE.Group(), w = o.w || 4, n = Math.max(6, Math.round(w / .26)), cols = ['#d8302a', '#f0d020', '#2a6ad0', '#2aa060', '#f4f0e6'];
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-.09, 0, 0, .09, 0, 0, 0, -.2, 0], 3)); tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2));
    const yf = t => .28 - Math.sin(t * PI) * .08; for (let i = 0; i < 12; i++) As(g, [-w / 2 + i * w / 12, yf(i / 12), .05], [-w / 2 + (i + 1) * w / 12, yf((i + 1) / 12), .05], .006, '#2a2a2a', 'opaco', 4);
    for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = -w / 2 + t * w; M(g, tri, cols[i % cols.length], 'opaco', x, yf(t) + .004, .05); }
    [-1, 1].forEach(s => Bx(g, .03, .05, .06, '#2a2a2a', s * w / 2, .28, .03, 'lucido')); return g; };
  // la soglia di marmo consumata: il gradino, l'avvallamento chiaro in mezzo, lo spigolo scheggiato, la riga di sporco al muro
  K.soglia = (o) => { const g = new THREE.Group(), w = o.w || 1.5, d = o.d || .5, h = o.h || .2; Bx(g, w, h, d, '#cfc6b2', 0, h / 2, 0, 'medio'); M(g, GEO.circ, '#ece4d2', 'lucido', 0, h + .003, .02, w * .3, d * .32, 1, -PI / 2);
    Bx(g, .12, h * .6, .1, '#a89e8a', w / 2 - .06, h * .7, d / 2 - .05, 'opaco'); Bx(g, w, .02, .04, '#3a3228', 0, h + .002, -d / 2 + .02, 'opaco'); Bx(g, w + .04, .025, .06, '#1c1816', 0, .012, d / 2 + .03, 'opaco'); return g; };
  // la bocca del forno: l'arco di mattoni, la soglia di pietra, lo sportello di ghisa socchiuso, il fuoco dentro, la fuliggine sopra
  K.bocca_forno = () => { const g = new THREE.Group(), R = .55, cy = .6;
    for (let i = 0; i <= 8; i++) { const a = PI * i / 8, x = Math.cos(a) * (R + .1), y = cy + Math.sin(a) * (R + .1); Bx(g, .14, .2, .2, ['#a8583a', '#9a4a30', '#b86a48'][i % 3], x, y, .1, 'opaco', 0, 0, a - PI / 2); }
    [-1, 1].forEach(s => Bx(g, .2, cy, .2, '#a8583a', s * (R + .1), cy / 2, .1, 'opaco')); Bx(g, 1.5, .1, .32, '#cfc6b2', 0, .05, .14, 'medio');
    Bx(g, R * 2 - .04, cy + R - .02, .04, '#120c0a', 0, (cy + R) / 2, .02, 'opaco');   // il buio della bocca
    stato(g, 'forno', () => { Bx(g, R * 1.6, cy * .9, .02, '#ff8a2a', 0, cy * .55, .03, 'luce'); Sp(g, .16, '#ffb040', -.15, .2, .04, 'luce', 1.4, .6, .3); Sp(g, .12, '#ff6a1a', .2, .18, .04, 'luce', 1.2, .5, .3); });
    Bx(g, .55, .9, .03, '#2a2624', -.32, .55, .2, 'lucido', 0, -.5, 0); Bx(g, .08, .03, .05, '#8a8e92', -.08, .55, .32, 'lucido');   // lo sportello socchiuso e la maniglia
    Bx(g, 1.0, .5, .006, '#1a1412', 0, cy + R + .45, .003, 'opaco');   // la fuliggine
    return g; };
  K.lumini = () => { const g = new THREE.Group(); Bx(g, .6, .03, .22, '#2a2c2e', 0, .03, .11, 'lucido'); [-1, 1].forEach(s => As(g, [s * .28, .03, .2], [s * .28, -.15, .02], .008, '#2a2c2e', 'lucido'));
    for (let i = 0; i < 6; i++) { const x = -.24 + i * .095; Cy(g, .03, .08, i % 3 ? '#c8202a' : '#e8e0c8', x, .085, .12, 'vetro'); stato(g, 'luci', () => Sp(g, .012, '#ffc060', x, .14, .12, 'luce', 1, 1.6, 1)); }
    Cy(g, .05, .16, '#9a9ea0', .22, .11, .1, 'lucido'); [[.19, .25], [.25, .27], [.22, .29]].forEach(([x, y], i) => { As(g, [.22, .17, .1], [x, y - .03, .1], .005, '#4a6a3a', 'opaco', 4); Sp(g, .04, ['#e0405a', '#f4f0e6', '#f0c040'][i], x, y, .1, 'opaco'); }); return g; };
  K.edicola_votiva = () => { const g = new THREE.Group(); const a = arredo(g, 'edicola_votiva', { liv: 1 }, 0, .6, 0); if (!a) Bx(g, .9, 1.2, .12, '#d8c8aa', 0, .6, .06, 'opaco'); return g; };
  K.lavagna_muro = (o) => { const g = new THREE.Group(); Bx(g, .58, .78, .03, '#6a4a2a', 0, .39, .015, 'opaco'); Pi(g, T('lav|' + o.testo, 256, 340, DIS.lavagna({ testo: o.testo || '' })), .52, .7, 0, .39, .032); return g; };
  // ---- fuori: la merce e le cose della bottega ----
  K.locandina = (o) => { const g = new THREE.Group(), tl = o.testata || 'corriere', H = 1.22; [-1, 1].forEach(s => { const gg = new THREE.Group(); gg.position.set(0, H, 0); gg.rotation.x = s * .2; g.add(gg); Bx(gg, .52, .03, .03, '#2a2c2e', 0, -.02, s * .016, 'lucido'); [-1, 1].forEach(q => Bx(gg, .025, H / Math.cos(.2), .025, '#2a2c2e', q * .25, -H / Math.cos(.2) / 2, s * .016, 'lucido'));
      Pi(gg, T('loc|' + (s > 0 ? tl : 'gazzetta'), 256, 360, DIS.locandina({ testata: s > 0 ? tl : 'gazzetta' })), .48, .66, 0, -.45, s * .032, 'carta', 0, s > 0 ? 0 : PI); }); return g; };
  K.cassone = () => { const g = new THREE.Group(), w = .9, h = .8, d = .5; for (let i = 0; i < 4; i++) Bx(g, w, h / 4 - .01, d, i % 2 ? '#8a6a46' : '#7a5a3a', 0, h / 8 + i * h / 4, 0, 'opaco'); Bx(g, w + .04, .05, d + .04, '#6a4a2e', 0, h + .025, 0, 'opaco');
    [-1, 1].forEach(s => Bx(g, .04, h, .04, '#3a3a3a', s * (w / 2 + .01), h / 2, d / 2, 'medio')); Bx(g, .12, .1, .02, '#5a5e60', 0, h - .1, d / 2 + .01, 'lucido'); Bx(g, .06, .07, .03, '#b8982a', 0, h - .18, d / 2 + .03, 'lucido'); M(g, GEO.tor, '#9a9ea0', 'lucido', 0, h - .13, d / 2 + .03, .022, .022, .022);
    Pi(g, T('tag|1', 256, 128, DIS.tag({ seme: 1, col: '#e84aa0' })), .6, .3, -.05, .4, d / 2 + .004, 'decal'); return g; };
  function frutti(g, x, y, z, w, d, colori, n, r, sx) { for (let i = 0; i < n; i++) Sp(g, r, colori[i % colori.length], x - w / 2 + (i % Math.ceil(n / 2) + .5) * w / Math.ceil(n / 2), y + (i % 3) * .015, z - d / 4 + Math.floor(i / Math.ceil(n / 2)) * d / 2, 'medio', sx || 1, 1, 1); }
  function cassetta(g, x, y, z, w, d, legno, merce, colori) { Bx(g, w, .03, d, legno, x, y + .015, z, 'opaco'); [-1, 1].forEach(s => { Bx(g, w, .1, .02, legno, x, y + .07, z + s * (d / 2 - .01), 'opaco'); Bx(g, .02, .1, d, legno, x + s * (w / 2 - .01), y + .07, z, 'opaco'); }); if (merce) frutti(g, x, y + .1, z, w * .85, d * .8, colori, 8, Math.min(.05, d * .12), merce === 'pesce' ? 2.2 : 1); }
  const MERCE = { frutta: ['#c83a2a', '#e8a020', '#e8c840', '#6a9a3a'], verdura: ['#5a8a3a', '#c8402a', '#7aaa48', '#e0b030'], pesce: ['#a8b0b8', '#8a96a0', '#c8c4b8', '#c86a5a'], pane: ['#c89050', '#a8702e', '#d8a868'] };
  K.cassette = (o) => { const g = new THREE.Group(), m = o.merce || 'frutta', C = MERCE[m] || MERCE.frutta; Bx(g, .8, .38, .42, '#6a5040', 0, .19, 0, 'opaco'); cassetta(g, -.2, .38, 0, .4, .38, '#9a7a52', m, C); cassetta(g, .21, .38, 0, .38, .38, '#8a6a46', m, C.slice().reverse());
    As(g, [.35, .5, .16], [.35, .78, .16], .006, '#6a5040', 'opaco'); Pi(g, T('lav|L. 900 IL KG', 128, 90, DIS.insegna2({ testo: 'L. 900', fondo: '#f8f040', inchiostro: '#c8102e' })), .14, .1, .35, .8, .165); return g; };
  K.banchetto = (o) => { const g = new THREE.Group(), C = MERCE[o.merce || 'pane'];
    [-1, 1].forEach(s => { As(g, [s * .55, 0, -.2], [s * .5, .72, 0], .02, '#7a5e40', 'opaco'); As(g, [s * .55, 0, .2], [s * .5, .72, 0], .02, '#7a5e40', 'opaco'); }); Bx(g, 1.25, .04, .52, '#9a7a52', 0, .74, 0, 'opaco'); Bx(g, 1.27, .2, .01, '#e8e0cc', 0, .66, .265, 'opaco');
    [-.35, .3].forEach((x, i) => { Cy(g, .2, .12, '#b89a62', x, .82, 0, 'opaco', 0, 0, 0, 20); frutti(g, x, .86, 0, .3, .26, C, 7, .06, 1.6); }); return g; };
  K.scope = () => { const g = new THREE.Group(); Cy(g, .2, .32, '#3a6ab0', 0, .16, 0, 'medio', 0, 0, 0, 20); for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2, x = Math.cos(a) * .09, z = Math.sin(a) * .09; As(g, [x, .1, z], [x * 2.2, 1.35, z * 2.2], .012, '#c8a870', 'opaco'); if (i % 2) Bx(g, .22, .14, .05, ['#d8c070', '#c83a2a', '#3a8a5a'][i % 3], x * 2.3, 1.42, z * 2.3, 'opaco', 0, a, 0); else M(g, GEO.ico, '#e8e4dc', 'opaco', x * 2.3, 1.4, z * 2.3, .08); } return g; };
  K.bombole = () => { const g = new THREE.Group(), A = AR(); [-.3, 0, .3].forEach((x, i) => { if (A) arredo(g, 'bombola', { col: ['#b83a2c', '#c8a020', '#b83a2c'][i] }, x, 0, 0); else Cy(g, .15, .62, '#b83a2c', x, .31, 0, 'medio'); }); As(g, [-.45, .5, .16], [.45, .5, .16], .008, '#7a7e80', 'lucido'); return g; };
  K.secchi = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) M(g, GEO.cone, ['#e84a3a', '#3a8ad0', '#f0c020', '#e84a3a'][i], 'medio', -.1, .14 + i * .07, 0, .17 - i * .004, -.26, .17 - i * .004); Cy(g, .1, .24, '#7aa04a', .16, .12, .05, 'medio'); As(g, [.24, .2, .05], [.36, .3, .05], .015, '#7aa04a', 'medio'); return g; };
  K.frigo = () => { const g = new THREE.Group(); if (!arredo(g, 'frigo_gelati', {}, 0, 0, 0)) Bx(g, 1.2, .9, .7, '#e8e6e0', 0, .45, 0, 'medio'); Pi(g, T('band|sammontana', 256, 256, DIS.bandiera({ marchio: 'sammontana' })), .36, .36, 0, .5, .356, 'carta'); return g; };
  K.cassette_latte = () => { const g = new THREE.Group(); [0, .3].forEach(y => { Bx(g, .6, .28, .4, y ? '#2a6ab0' : '#c8302a', 0, y + .14, 0, 'medio'); for (let i = 0; i < 6; i++) { const x = -.2 + (i % 3) * .2, z = -.1 + Math.floor(i / 3) * .2; Cy(g, .045, .26, '#f4f2ea', x, y + .2, z, 'lucido'); Cy(g, .03, .03, '#c8302a', x, y + .34, z, 'medio'); } }); return g; };
  K.sacchi = () => { const g = new THREE.Group(), t = T('sacco', 256, 128, DIS.sacco()); [[-.22, .15, 0], [.22, .15, 0], [0, .42, 0]].forEach(([x, y, z], i) => { M(g, GEO.box, '#e8e0cc', 'opaco', x, y, z, .42, .27, .52); Pi(g, t, .34, .17, x, y, z + .265); }); return g; };
  K.catasta = () => { const g = new THREE.Group(); [-1, 1].forEach(s => Bx(g, .08, .08, .5, '#5a4a3a', s * .5, .04, 0, 'opaco')); for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - (r % 2); i++) Cy(g, .085, .5, ['#8a6a46', '#6a4a2e', '#9a7a52'][(r + i) % 3], -.55 + i * .2 + (r % 2) * .1, .13 + r * .165, 0, 'opaco', PI / 2, 0, 0, 6);
    for (let i = 0; i < 7; i++) As(g, [-.7 + i * .03, .05, .24], [-.5 + i * .02, .95, .1], .012, '#7a6a4a', 'opaco'); return g; };
  K.casse_birre = () => { const g = new THREE.Group(), t = T('birre', 256, 96, DIS.birre()); [[0, 0, 0], [0, .3, 0], [.05, .6, 0]].forEach(([x, y, z], k) => { if (k === 2) { Bx(g, .5, .28, .36, '#c8202a', x, y + .14, z, 'medio'); return; } Bx(g, .5, .28, .36, '#c8202a', x, y + .14, z, 'medio'); Pi(g, t, .4, .12, x, y + .16, z + .182); }); for (let i = 0; i < 6; i++) Cy(g, .028, .22, '#3a5a2a', -.17 + (i % 3) * .17, .99, -.09 + Math.floor(i / 3) * .18, 'lucido'); return g; };
  K.panca = () => { const g = new THREE.Group(); Bx(g, 1.4, .05, .38, '#8a6a46', 0, .45, 0, 'opaco'); [-1, 1].forEach(s => { Bx(g, .05, .45, .34, '#6a4a2e', s * .6, .225, 0, 'opaco'); Bx(g, .05, .45, .04, '#6a4a2e', s * .6, .7, -.17, 'opaco'); }); Bx(g, 1.4, .3, .04, '#8a6a46', 0, .75, -.17, 'opaco'); Cy(g, .08, .9, '#8a8e92', .77, .45, 0, 'lucido'); Cy(g, .14, .05, '#6a6e72', .77, .92, 0, 'lucido'); return g; };
  K.sedia = () => { const g = new THREE.Group(); if (!arredo(g, 'sedia', { tipo: 'bistrot' }, 0, 0, 0, PI)) Bx(g, .4, .45, .4, '#8a6a46', 0, .22, 0, 'opaco'); return g; };
  K.rifiuti = () => { const g = new THREE.Group(), r = rngS('rif'); for (let i = 0; i < 6; i++) M(g, GEO.ico, '#e8e4dc', 'opaco', -.45 + r() * .9, .03, -.15 + r() * .3, .04 + r() * .03); Cy(g, .033, .12, '#c8202a', .2, .033, .1, 'lucido', 0, 0, PI / 2); Bx(g, .09, .02, .055, '#e8e0cc', -.1, .01, .12, 'medio', 0, .6, 0);
    Pi(g, T('giornale', 256, 320, DIS.giornale()), .38, .48, -.25, .006, -.02, 'carta', -PI / 2, 0, .3); return g; };
  K.secchi_fiori = () => { const g = new THREE.Group(); Bx(g, 1.05, .3, .42, '#6a5040', 0, .15, 0, 'opaco'); [-.32, 0, .32].forEach((x, i) => { Cy(g, .14, .26, '#9a9ea0', x, .43, 0, 'lucido'); for (let k = 0; k < 7; k++) Sp(g, .055, ['#e0405a', '#f4f0e6', '#f0c040', '#c84aa0'][(i + k) % 4], x + Math.cos(k) * .08, .62 + (k % 3) * .04, Math.sin(k) * .08, 'opaco'); for (let k = 0; k < 3; k++) As(g, [x, .5, 0], [x + Math.cos(k * 2) * .1, .66, Math.sin(k * 2) * .1], .006, '#4a6a3a', 'opaco'); }); return g; };
  K.boombox = () => { const g = new THREE.Group(); Bx(g, .5, .3, .34, '#c8202a', 0, .15, 0, 'medio'); Bx(g, .52, .2, .14, '#2a2a2e', 0, .4, 0, 'lucido'); Pi(g, T('boombox', 256, 100, DIS.boombox()), .5, .18, 0, .4, .072); As(g, [-.2, .5, 0], [.2, .5, 0], .01, '#8a8e92', 'lucido'); [-1, 1].forEach(s => As(g, [s * .2, .5, 0], [s * .2, .55, 0], .01, '#8a8e92', 'lucido')); return g; };
  // ---- nello spazio ----
  // il tavolino della scopa: il piano di marmo, le carte, i bicchierini, il posacenere; le sedie attorno (tavoli) o impilate (impilati)
  K.tavolo_scopa = () => { const g = new THREE.Group(), A = AR(); if (A) arredo(g, 'tavolino', { tipo: 'marmo' }, 0, 0, 0); else { Cy(g, .35, .04, '#e8e2d6', 0, .74, 0, 'medio'); Cy(g, .03, .72, '#2a2a2c', 0, .36, 0, 'lucido'); }
    Pi(g, T('carte', 256, 160, DIS.carte()), .36, .22, 0, .758, 0, 'carta', -PI / 2, 0, .2); Cy(g, .022, .07, '#d8e0e0', .2, .79, .1, 'vetro'); Cy(g, .022, .07, '#d8e0e0', -.18, .79, -.12, 'vetro'); Cy(g, .05, .02, '#9a9ea0', .05, .765, -.22, 'lucido');
    stato(g, 'tavoli', () => [[0, .58], [PI / 2 + .2, .6], [PI, .58], [-PI / 2, .62]].forEach(([a, r]) => { if (A) arredo(g, 'sedia', { tipo: 'bistrot' }, Math.sin(a) * r, 0, Math.cos(a) * r, a + PI); else Bx(g, .4, .45, .4, '#8a6a46', Math.sin(a) * r, .22, Math.cos(a) * r, 'opaco'); }));
    stato(g, 'impilati', () => { for (let k = 0; k < 4; k++) { if (A) { const s = arredo(g, 'sedia', { tipo: 'bistrot' }, .62, k * .07, .1, PI * .5); if (s) s.rotation.z = 0; } } }); return g; };
  // il banco del pesce: il piano di marmo sui cavalletti, le cassette inclinate col ghiaccio e il pesce, la bilancia, il telo sui pali, la lampadina, il cartello
  K.banco_pesce = () => { const g = new THREE.Group(); [-1, 1].forEach(s => [-1, 1].forEach(t => Bx(g, .06, .8, .06, '#5a5e62', s * 1.1, .4, t * .5, 'lucido'))); Bx(g, 2.4, .06, 1.1, '#e8e4dc', 0, .83, 0, 'medio'); Bx(g, 2.42, .5, .04, '#c8c4bc', 0, .55, .55, 'medio');
    stato(g, 'banco', () => { [-.75, 0, .75].forEach((x, i) => { Bx(g, .7, .06, .62, '#f2f2ee', x, .9, -.02, 'lucido', .25, 0, 0); for (let k = 0; k < 7; k++) Sp(g, .045, MERCE.pesce[(k + i) % 4], x - .26 + (k % 4) * .17, .96 + Math.floor(k / 4) * .05, -.15 + Math.floor(k / 4) * .16, 'lucido', 3.2, .9, 1.2); });
      for (let k = 0; k < 4; k++) Sp(g, .035, '#e8d040', 1.05, .9, -.3 + k * .09, 'medio'); });
    Bx(g, .26, .1, .2, '#e8e4dc', -1.0, .91, .3, 'medio'); Cy(g, .12, .02, '#c8ccd0', -1.0, 1.02, .3, 'lucido');
    [-1, 1].forEach(s => [-1, 1].forEach(t => Cy(g, .025, 2.3, '#7a7e82', s * 1.215, 1.15, t * .565, 'lucido'))); Bx(g, 2.7, .03, 1.5, '#3a6a8a', 0, 2.315, 0, 'opaco'); Bx(g, 2.7, .22, .02, '#e8e4dc', 0, 2.2, .75, 'opaco');
    Pi(g, T('pesce', 512, 160, DIS.pesce()), 1.6, .5, 0, 1.84, .752, 'carta'); Bx(g, 1.64, .54, .02, '#2a3a4a', 0, 1.84, .738, 'opaco'); As(g, [0, 2.3, 0], [0, 2.1, 0], .004, '#1a1a1a', 'opaco'); stato(g, 'luci', () => Sp(g, .05, '#ffe6b0', 0, 2.06, 0, 'luce'));
    return g; };
  K.polistirolo = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) Bx(g, .8, .2, .52, '#f4f4f0', i % 2 ? .02 : 0, .1 + i * .21, 0, 'medio'); return g; };
  K.cartellone = (o) => { const g = new THREE.Group(); [-1, 1].forEach(s => Cy(g, .05, 2.6, '#3a3e42', s * 1.05, 1.3, 0, 'lucido')); Bx(g, 2.4, 1.0, .04, '#d8d2c0', 0, 1.95, 0, 'medio'); Pi(g, T('cart|' + o.testo, 768, 320, DIS.cartellone({ testo: o.testo || '', sotto: o.sotto || '' })), 2.34, .94, 0, 1.95, .022);
    Pi(g, T('cart|' + o.testo, 768, 320, DIS.cartellone({ testo: o.testo || '', sotto: o.sotto || '' })), 2.34, .94, 0, 1.95, -.022, 'carta', 0, PI); stato(g, 'luci', () => { Sp(g, .05, '#ffe6b0', 0, 2.55, .2, 'luce'); }); As(g, [0, 2.45, 0], [0, 2.55, .2], .012, '#2a2a2e', 'lucido'); return g; };
  K.gomme = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) M(g, GEO.tor, '#1c1c1e', 'opaco', 0, .1 + i * .19, 0, .28, .28, .28, PI / 2); M(g, GEO.tor, '#1c1c1e', 'opaco', .36, .3, .1, .28, .28, .28, 0, .3, .1); return g; };
  K.fusti = () => { const g = new THREE.Group(); [[-.29, 0, '#2a5ab8'], [.29, 0, '#c8302a']].forEach(([x, z, c]) => { Cy(g, .28, .88, c, x, .44, z, 'medio', 0, 0, 0, 20); [.25, .62].forEach(y => Cy(g, .29, .03, '#4a4e52', x, y, z, 'lucido', 0, 0, 0, 20)); }); Cy(g, .1, .2, '#c8a020', .1, .98, 0, 'medio'); return g; };
  K.banco_lavoro = () => { const g = new THREE.Group(); [-1, 1].forEach(s => [-1, 1].forEach(t => Bx(g, .06, .9, .06, '#4a4e52', s * .82, .45, t * .28, 'lucido'))); Bx(g, 1.8, .06, .7, '#7a5a3a', 0, .93, 0, 'opaco'); Bx(g, 1.7, .03, .6, '#5a4a3a', 0, .25, 0, 'opaco');
    Bx(g, .2, .14, .14, '#3a5a8a', .6, 1.03, .2, 'lucido'); Bx(g, .5, .22, .25, '#c8302a', -.4, 1.07, -.1, 'medio'); As(g, [.1, .97, .15], [.4, .97, .25], .015, '#8a8e92', 'lucido'); Cy(g, .07, .16, '#2a5a2a', -.1, 1.04, .2, 'lucido'); Bx(g, .4, .3, .3, '#4a4e52', -.5, .4, 0, 'medio'); return g; };
  K.motore = () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) Bx(g, .8, .03, .12, '#a88a5a', 0, .1, -.3 + i * .2, 'opaco'); [-1, 1].forEach(s => Bx(g, .1, .1, .8, '#8a6a46', s * .35, .05, 0, 'opaco')); Bx(g, .5, .4, .45, '#5a5e62', 0, .32, 0, 'lucido'); Bx(g, .4, .14, .38, '#3a3e42', 0, .59, 0, 'lucido'); for (let i = 0; i < 2; i++) As(g, [.25, .4, -.1 + i * .2], [.4, .45, -.15 + i * .3], .03, '#6a4a3a', 'medio'); return g; };
  K.panchina = () => { const g = new THREE.Group(); if (!arredo(g, 'panchina_ghisa', {}, 0, 0, 0)) Bx(g, 1.6, .45, .5, '#2f5a3e', 0, .22, 0, 'medio'); return g; };
  // ---- di traverso ----
  // le luminarie: il filo a catenaria fra due ganci, le lampadine ogni 40 cm (accese la sera: lo stato luminarie)
  K.luminarie = (o) => { const g = new THREE.Group(), fili = o.fili || [];
    fili.forEach(f => { const ax = f.a[0], az = f.a[1], bx = f.b[0], bz = f.b[1], L = Math.hypot(bx - ax, bz - az), n = Math.max(4, Math.round(L / .4)), sag = Math.min(.6, L * .06), y = f.y;
      const P = []; for (let i = 0; i <= 16; i++) { const t = i / 16; P.push([ax + (bx - ax) * t, y - Math.sin(t * PI) * sag, az + (bz - az) * t]); }
      for (let i = 0; i < 16; i++) As(g, P[i], P[i + 1], .005, '#1a1a1a', 'opaco', 4);
      [f.a, f.b].forEach(q => Bx(g, .05, .05, .06, '#2a2a2a', q[0], y + .02, q[1], 'lucido'));
      for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, yy = y - Math.sin(t * PI) * sag - .04; Sp(g, .035, '#f4ead0', x, yy, z, 'vetro'); stato(g, 'luminarie', () => Sp(g, .03, '#ffd890', x, yy, z, 'luce')); } });
    return g; };
  K.bucato = (o) => { const g = new THREE.Group(), cols = ['#e8e2d4', '#c84a5a', '#5a8ad0', '#f0e0a0', '#e8e8e8']; (o.fili || []).forEach(f => { const ax = f.a[0], az = f.a[1], bx = f.b[0], bz = f.b[1], y = f.y; As(g, [ax, y, az], [bx, y - .1, bz], .004, '#d8d8d0', 'opaco', 4);
      for (let i = 1; i < 5; i++) { const t = i / 5, x = ax + (bx - ax) * t, z = az + (bz - az) * t; Bx(g, .45, .55 + (i % 2) * .2, .01, cols[i % cols.length], x, y - .3 - (i % 2) * .1, z, 'opaco', 0, Math.atan2(bx - ax, bz - az) + PI / 2, 0); } }); return g; };
  // la pozza di luce a terra sotto una lampada (accesa la sera, additiva)
  K.alone = (o) => { const g = new THREE.Group(); M(g, GEO.circ, o.col || '#ffb860', 'alone', 0, .03, 0, o.r || 1.5, o.r || 1.5, 1, -PI / 2); return g; };

  const TIPI = Object.keys(K);
  const A_MURO = new Set(['fascia', 'insegna2', 'bandiera', 'palo_barbiere', 'lampada', 'serranda', 'griglia', 'vetrofania', 'pannello_forato', 'zoccolo', 'crepa', 'manifesti', 'necrologi', 'targa', 'telefono_muro', 'festoni', 'bocca_forno', 'lumini', 'edicola_votiva', 'lavagna_muro', 'tenda']);
  const SPARSI = new Set(['rifiuti', 'tavolo_scopa', 'luminarie', 'bucato']);   // cose separate a terra o fili fra due muri: si tengono al suolo o ai muri, non fra loro
  function make(tipo, o) { if (!K[tipo]) return null; const g = K[tipo](o || {}); g.userData.tipo = tipo; if (A_MURO.has(tipo)) g.userData.aMuro = true; if (SPARSI.has(tipo)) g.userData.sparso = true; return g; }
  return { make, TIPI, K, mat, atlante, tessera, DIS, GEO };
})();

var ScorciArte = (function () {
  'use strict';
  if (typeof THREE === 'undefined' || !ScorciKit) return null;
  const PI = Math.PI;
  let B = null;   // { sc: [{ s, grp: { stato: [mesh] }, mats, conta }], api }
  const _c = new THREE.Color(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m3 = new THREE.Matrix3();
  // ---------- la fusione: per stato e per classe di materiale; ogni pezzo sa dove sono i suoi vertici ----------
  function Fusione() { const L = new Map(); return {
    add(obj, pezzo, stato0) { obj.updateMatrixWorld(true); obj.traverse(o => { if (!o.isMesh || !o.geometry || !o.material) return;
        let cls = o.material.userData && o.material.userData.scorci; const st = o.userData.stato || stato0 || 'base';
        let col = o.userData.col;
        if (!cls) {   // un pezzo di Arredo3D: il suo materiale diventa un colore nei vertici e una classe
          const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m.map && !(m.map.image && (m.map.image === ScorciKit.atlante().c || m.map.userData.lmGrande === ScorciKit.atlante().c))) { cls = 'proprio'; } else if (m.isMeshBasicMaterial) { cls = 'luce'; col = '#' + m.color.getHexString(); } else if (m.transparent) { cls = 'vetro'; col = '#' + m.color.getHexString(); } else { cls = m.roughness < .4 ? 'lucido' : m.roughness < .75 ? 'medio' : 'opaco'; col = '#' + m.color.getHexString(); } }
        const k = st + '|' + (cls === 'proprio' ? 'proprio:' + o.material.uuid : cls); let e = L.get(k); if (!e) L.set(k, e = { st, cls, mat: cls === 'proprio' ? o.material : null, parts: [] });
        e.parts.push({ g: o.geometry, mw: o.matrixWorld.clone(), col: col || '#ffffff', pezzo, doppia: !!o.userData.doppia }); }); },
    build(mats) { const out = [];
      L.forEach(e => { const P = [], N = [], U = [], C = [], seg = []; let n0 = 0;
        e.parts.forEach(p => { const gg = p.g.index ? p.g.toNonIndexed() : p.g.clone(); gg.applyMatrix4(p.mw); const pa = gg.attributes.position, na = gg.attributes.normal, ua = gg.attributes.uv, ca = gg.attributes.color; _c.set(p.col);
          for (let i = 0; i < pa.count; i++) { P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); if (na) N.push(na.getX(i), na.getY(i), na.getZ(i)); else N.push(0, 1, 0); if (ua) U.push(ua.getX(i), ua.getY(i)); else U.push(0, 0); if (ca && e.cls !== 'proprio') C.push(ca.getX(i) * _c.r, ca.getY(i) * _c.g, ca.getZ(i) * _c.b); else C.push(_c.r, _c.g, _c.b); }
          seg.push({ pezzo: p.pezzo, s: n0, n: pa.count }); n0 += pa.count; gg.dispose(); });
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
        geo.computeBoundingSphere(); geo.computeBoundingBox(); const mt = e.mat || mats(e.cls); const me = new THREE.Mesh(geo, mt); me.castShadow = !mt.transparent && e.cls !== 'luce' && e.cls !== 'alone' && e.cls !== 'decal'; me.receiveShadow = e.cls !== 'luce' && e.cls !== 'alone';
        me.matrixAutoUpdate = false; me.userData.scorci = true; me.userData.stato = e.st; if (e.cls === 'alone' || e.cls === 'luce') me.renderOrder = 2; out.push({ mesh: me, seg, st: e.st, cls: e.cls }); });
      return out; } }; }

  // ---------- la posa di uno scorcio ----------
  function costruisci(api) {
    if (B || typeof Scorci === 'undefined' || !Scorci || !Scorci.attivo) return null; B = { sc: [], api };
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    Scorci.tutti().forEach(s => { try { B.sc.push(posa(s, api)); } catch (e) { console.warn('[scorci] posa', s.id, e); } });
    B.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    if (typeof window !== 'undefined') window.__scorci = conta;
    return B;
  }
  // il muro: dove sta il filo e quanto sporge il modulo del kit (le cose a muro stanno appena fuori)
  function posa(s, api) {
    const KIT = ScorciKit, WO = (api.sporge || 0) + .012, gh = api.groundH, F = Fusione(), G = api.G, fr = s.fr, b = s.b;
    const rec = b && api.bRec ? api.bRec(s.bi) : null, base = rec && rec.geo ? rec.geo.y0 : (fr ? gh(...fr.wp(0, .5)) : 0);
    // le aperture vere del piano terra (dalla costruzione della casa): le vetrine e la porta della bottega, il portone, le finestre basse
    const ap = api.aperture && b && fr ? api.aperture(b, fr.f) : (fr ? fr.ap.map(a => ({ u0: a.u - a.w / 2, u1: a.u + a.w / 2, y0: 0, y1: 2.1, tipo: a.tipo })) : []);
    const bot = b && b.__bot && fr && b.__bot.face === fr.f ? b.__bot : null;
    const mats = {}; const mat = cls => { if (cls === 'luce' || cls === 'carta_luce' || cls === 'alone') { if (!mats[cls]) { mats[cls] = KIT.mat(cls).clone(); mats[cls].userData.scorci = cls; } return mats[cls]; } return KIT.mat(cls); };
    const pezzi = [];
    const metti = (g, c, x, y, z, yaw, st) => { g.position.set(x, y, z); g.rotation.y = yaw; const p = { c, g, stato: st || c.gruppo || null }; pezzi.push(p); F.add(g, p, p.stato); return p; };
    // gli oggetti a muro: sul fronte, un poco fuori dal filo; le cose davanti alle aperture vere si accorciano o saltano
    const sulMuro = (k, c, o2) => { const [x, z] = fr.wp(c.u, WO), g = KIT.make(k, Object.assign({}, c.opz, { w: c.w }, o2 || {})); if (!g) return null; return metti(g, c, x, base + (c.y || 0), z, fr.rot); };
    const coperta = (u0, u1, y0, y1) => ap.some(a => a.u1 > u0 + .05 && a.u0 < u1 - .05 && a.y1 > y0 + .05 && a.y0 < y1 - .05);
    let alone = null; const fatte = new Set(), spost = {}, usati = [], occupato = (u0, u1, y0, y1) => usati.some(q => q[1] > u0 && q[0] < u1 && q[3] > y0 && q[2] < y1);
    s.cose.forEach(c => {
      if (c.k === 'luminarie') { const fili = c.fili ? c.fili.map(f => ({ a: [f.a[0] + fr.N[0] * WO, f.a[1] + fr.N[1] * WO], b: f.b, y: base + f.y })) : [(() => { const [ax, az] = fr.wp(c.u - c.w / 2, WO + .06), [bx, bz] = fr.wp(c.u + c.w / 2, WO + .06); return { a: [ax, az], b: [bx, bz], y: base + c.y }; })()];
        const g = KIT.make('luminarie', { fili }); metti(g, c, 0, 0, 0, 0); return; }
      if (c.muro) {
        let o2 = {}; if (c.opz && c.opz.di && spost[c.opz.di]) { c.u += spost[c.opz.di]; const q2 = fr.wp(c.u, 0); c.x = q2[0]; c.z = q2[1]; }   // i lumini seguono la loro edicola
        if (c.k === 'zoccolo') { const a = c.u - c.w / 2, z = c.u + c.w / 2, T0 = []; let u = a; ap.filter(q => q.y0 < .5 && q.u1 > a && q.u0 < z).sort((p, q) => p.u0 - q.u0).forEach(q => { if (q.u0 > u) T0.push([u - c.u, q.u0 - c.u]); u = Math.max(u, q.u1); }); if (z > u) T0.push([u - c.u, z - c.u]); o2.tratti = T0; }
        if (c.k === 'serranda' || c.k === 'griglia' || c.k === 'vetrofania' || c.k === 'pannello_forato' || c.k === 'manifesti' && c.opz.carta === 'strati') {   // sulla sua apertura vera (la porta 1,1 m, la vetrina 0,95 o larga 3,1): una per apertura
          let e = null; if (bot) bot.ents.forEach(q => { if (Math.abs(q.u - c.u) < 1.1 && (!e || Math.abs(q.u - c.u) < Math.abs(e.u - c.u))) e = q; });
          if (e) { const key = c.k + '|' + e.u; if (fatte.has(key)) return; fatte.add(key); c.u = e.u; o2.w = c.k === 'manifesti' ? Math.min(e.w - .1, 1.6) : e.w; if (c.k === 'manifesti') c.y = .45; }
          o2.h = 2.2; o2.seme = Math.round(c.u * 10); if ((c.k === 'griglia' || c.k === 'vetrofania' || c.k === 'pannello_forato') && (c.apertura === 'porta' || (e && e.role === 'porta'))) return; }
        if (c.k === 'tenda' && bot) { const V = bot.ents.filter(q => q.role === 'vetrina'); if (V.length) { const a = Math.min(...V.map(q => q.u - q.w / 2)) - .1, z = Math.max(...V.map(q => q.u + q.w / 2)) + .1; c.u = (a + z) / 2; c.w = z - a; } }
        // le cose appese che cadrebbero su una finestra o una porta vera: saltano (la regola: mai su porte e vetrine)
        const libero = ['fascia', 'insegna2', 'bandiera', 'palo_barbiere', 'lampada', 'serranda', 'griglia', 'vetrofania', 'pannello_forato', 'zoccolo', 'festoni', 'manifesti'].includes(c.k) && !(c.k === 'manifesti' && !c.opz.carta);
        if (!libero && coperta(c.u - (c.w || .5) / 2, c.u + (c.w || .5) / 2, c.y, c.y + (c.h || .5))) {   // sopra una finestra vera: si sposta lungo il muro sul pieno più vicino, dentro il tratto dello scorcio
          const w2 = (c.w || .5) / 2, y0 = c.y, y1 = c.y + (c.h || .5), lo = Math.max(.3, (s.ua || 0) - .5) + w2, hi = Math.min(fr.L - .3, (s.ub || fr.L) + .5) - w2; let nu = null;
          for (let d = .1; d <= 3 && nu === null; d += .1) for (const sg of [1, -1]) { const u = c.u + sg * d; if (u < lo || u > hi) continue; if (coperta(u - w2, u + w2, y0, y1) || occupato(u - w2, u + w2, y0, y1)) continue; nu = u; break; }
          if (nu === null) { s.scarti.push(c.k + ': sopra un\'apertura vera'); return; } spost[c.k] = nu - c.u; c.u = nu; const q2 = fr.wp(nu, 0); c.x = q2[0]; c.z = q2[1]; }
        if (!libero) usati.push([c.u - (c.w || .5) / 2, c.u + (c.w || .5) / 2, c.y, c.y + (c.h || .5)]);
        const p = sulMuro(c.k, c, o2); if (c.k === 'lampada' && p) { const [ax, az] = fr.wp(c.u, 1.4); alone = { x: ax, z: az }; }
        if (c.k === 'serranda' && p && c.opz.sempre) p.sempre = true;
        return; }
      // a terra
      const y = gh(c.x, c.z); let o2 = {};
      if (c.k === 'soglia') { const low = Math.min(gh(...fr.wp(c.u - .7, .5)), gh(...fr.wp(c.u + .7, .5)), base); o2.h = Math.max(.12, base - low + .02); const g = KIT.make('soglia', Object.assign({}, c.opz, o2)); metti(g, c, c.x, low, c.z, c.yaw); return; }
      const g = KIT.make(c.k, Object.assign({}, c.opz, o2)); if (!g) return; metti(g, c, c.x, y, c.z, c.yaw);
    });
    if (alone) { const g = ScorciKit.make('alone', { r: 1.6 }); metti(g, { k: 'alone', x: alone.x, z: alone.z, muro: false }, alone.x, gh(alone.x, alone.z), alone.z, 0, 'luci'); }
    const meshes = F.build(mat), grp = new THREE.Group(); grp.name = 'scorcio:' + s.id; meshes.forEach(q => grp.add(q.mesh)); api.scene.add(grp);
    // il registro di pulizia2: ogni pezzo coi suoi vertici nelle mesh fuse (le compenetrazioni e la visuale lo trattano come le altre voci)
    if (api.reg) { const per = new Map(); meshes.forEach(q => q.seg.forEach(sg => { const L = per.get(sg.pezzo) || per.set(sg.pezzo, []).get(sg.pezzo); L.push({ M: q.mesh, s: sg.s, n: sg.n }); }));
      per.forEach((parts, p) => { const c = p.c, k = c.k === 'luminarie' || c.k === 'bucato' ? 'scorcio_filo' : c.k === 'alone' ? null : c.muro ? 'scorcio_muro' : 'scorcio'; if (!k) return;
        try { api.reg(k, c.muro && b ? b : null, c.muro && fr ? fr.f : null, parts, c.yaw || (fr ? fr.rot : 0), 'scorcio:' + s.id, c.id); } catch (e) { /* il registro c'è solo nella città nuova */ } }); }
    // il conto: chiamate di disegno (mesh), triangoli, per stato
    const conto = { draws: meshes.length, tri: meshes.reduce((a, q) => a + q.mesh.geometry.attributes.position.count / 3, 0), stati: {} };
    meshes.forEach(q => { conto.stati[q.st] = (conto.stati[q.st] || 0) + 1; });
    return { s, grp, meshes, mats, conto, pezzi: pezzi.length, sempre: pezzi.filter(p => p.sempre).length };
  }

  // ---------- gli stati per ora ----------
  function tick(st, time, night) {
    if (!B) return; const hr = ((st.t / 60) % 24 + 24) % 24;
    B.sc.forEach(q => { const G2 = Scorci.gruppi(q.s, hr), lum = G2.luci ? (.35 + .65 * Math.max(night, .25)) : .22;
      q.meshes.forEach(m => { const st0 = m.st; if (st0 === 'base' || st0 === 'luci') { m.mesh.visible = st0 === 'base' || G2.luci; return; } m.mesh.visible = !!G2[st0]; });
      if (q.mats.luce) q.mats.luce.color.setScalar(G2.luci ? 1 : .4);
      if (q.mats.carta_luce) q.mats.carta_luce.emissiveIntensity = G2.luci ? .35 + night * .65 : .1;
      if (q.mats.alone) q.mats.alone.opacity = G2.luci ? .18 * night : 0;
      // la lampada della bottega chiusa trema
      if (q.s.R.ore && q.s.R.ore.chiuso && q.mats.luce && G2.luci) { const on = Math.sin(time * 13) > -.7 || Math.sin(time * 1.7) > .3; q.mats.luce.color.setScalar(on ? 1 : .3); if (q.mats.alone) q.mats.alone.opacity = on ? .18 * night : .03; }
      void lum; });
  }
  // per le misure (window.__scorci): chiamate di disegno, triangoli, pezzi, scarti per scorcio
  function conta() { if (!B) return null; return { ms: B.ms, scorci: B.sc.map(q => ({ id: q.s.id, nome: q.s.nome, draws: q.conto.draws, tri: Math.round(q.conto.tri), stati: q.conto.stati, pezzi: q.pezzi, focale: q.s.focale, scarti: q.s.scarti })), atlante: ScorciKit.atlante().tiles.size }; }
  // ---------- l'aggancio a ordine_arte.js per il passo (come vievive_arte.js) ----------
  function aggancia() {
    if (typeof OrdineArte === 'undefined' || !OrdineArte || OrdineArte.__scorci) return; const t0 = OrdineArte.tick; OrdineArte.__scorci = true;
    OrdineArte.tick = (st, time, night, dt, cam) => { t0(st, time, night, dt, cam); try { tick(st, time, night, dt); } catch (e) { if (!tick.err) { tick.err = 1; console.error('[scorci_arte]', e); } } };
  }
  return { costruisci, tick, conta, aggancia, posa, get B() { return B; } };
})();
if (typeof module !== 'undefined') module.exports = { ScorciKit, ScorciArte };
