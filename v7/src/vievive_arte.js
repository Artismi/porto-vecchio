/* Porto Vecchio — [vievive] LE VIE VIVE: la grafica (legge Vievive e st.vv, non cambia mai lo stato del gioco).
   - L'arredo della linea 1 e dei giornali: le fermate (il palo con la paletta FERMATA e la tabella dell'orario; la pensilina dove il
     marciapiede è largo, se no la panchina: di travertino sull'asse), le edicole (il chiosco verde di arredo3d.js con le riviste) con la
     locandina del giorno a cavalletto (il titolo del Corriere del Gelo cambia ogni giorno), le plance delle affissioni sulle vie coi
     manifesti a strati (il regime, l'utilitaria a rate, Radio Luna, il Disgelo mezzo strappato; sull'asse solo quelli del regime).
     Tutto fuso per materiale: poche chiamate di disegno per tutta la città.
   - Il suolo: i ciuffi d'erba nei giunti e al piede dei muri, le foglie sotto i filari, le pozzanghere alle caditoie (la mattina dopo
     la notte, o quando piove), il gatto sul gradino, il volantino caduto sotto la plancia. A istanze: una chiamata per genere.
   - Le cose che vengono dalle scene: l'affisso del Disgelo sul muro della Vittoria (fresco, poi raschiato: resta un brandello), il
     pallone dei ragazzini, il carretto del venditore.
   Si aggancia a render.js attraverso ordine_arte.js (come scontri_arte.js): attach() e tick(). */
var VievieveArte = (function () {
  'use strict';
  if (typeof THREE === 'undefined') return null;
  let scene = null, G = null, groundH = null, ready = false, built = false, B = null;
  const PI = Math.PI;
  const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color(), _m = new THREE.Matrix4();
  const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(x || 0, y || 0, z || 0); _s.set(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz); return new THREE.Matrix4().compose(_p, _q, _s); };
  const rot = a => PI / 2 - a;   // la direzione a (radianti sul piano x, y del gioco) come rotazione y di un oggetto che guarda +z
  const hash = (x, y, s) => { let h = (Math.round(x * 7) * 374761393 + Math.round(y * 7) * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // ================= L'ATLANTE: manifesti, locandine, l'orario, i volantini (una tela 1024 × 1024, tessere da 256) =================
  const TILE = { regime: 0, auto: 1, concerto: 2, disgelo: 3, elezioni: 4, radio: 5, orario: 6, fermata: 7, disgelo_strappato: 8, raschiato: 9, volantino_disgelo: 10, volantino_concerto: 11, giornale: 12, riviste: 13, disgelo_muro: 14, ciclostile: 15 };
  let ATL = null;
  function atlante() {
    if (ATL) return ATL; const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    const at = k => [(TILE[k] % 4) * 256, Math.floor(TILE[k] / 4) * 256];
    const testo = (t, X, Y, size, col, font, w) => { x.fillStyle = col; x.font = (font || 'bold ') + size + 'px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; String(t).split('\n').forEach((r, i) => x.fillText(r, X, Y + i * size * 1.1, w || 230)); };
    const carta = (X, Y, col, ink, usura) => { x.fillStyle = col; x.fillRect(X + 4, Y + 4, 248, 248); x.globalAlpha = usura || .12; for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? '#000' : '#fff'; x.fillRect(X + 4 + Math.random() * 240, Y + 4 + Math.random() * 240, 2 + Math.random() * 30, 1 + Math.random() * 3); } x.globalAlpha = 1; };
    const strappo = (X, Y, h0) => { x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.moveTo(X, Y + h0); for (let i = 0; i <= 16; i++) x.lineTo(X + i * 16, Y + h0 + (Math.random() - .5) * 40 + i * 3); x.lineTo(X + 256, Y + 256); x.lineTo(X, Y + 256); x.closePath(); x.fill(); x.restore(); };
    let [X, Y] = at('regime'); carta(X, Y, '#e8e0cc'); x.fillStyle = '#a8262a'; x.fillRect(X + 4, Y + 4, 248, 70); testo('IL GARANTE', X + 128, Y + 40, 34, '#f4ecd8'); x.fillStyle = '#2a2622'; x.beginPath(); x.arc(X + 128, Y + 130, 44, 0, 6.3); x.fill(); x.fillStyle = '#e8e0cc'; x.beginPath(); x.arc(X + 128, Y + 120, 16, 0, 6.3); x.fill(); x.fillRect(X + 100, Y + 140, 56, 30); testo('LAVORA · CONSUMA\nPAGA LA RATA', X + 128, Y + 200, 24, '#2a2622');
    [X, Y] = at('auto'); carta(X, Y, '#f0e8d8'); x.fillStyle = '#3a6ab0'; x.fillRect(X + 4, Y + 150, 248, 102); x.fillStyle = '#d83a2a'; x.beginPath(); x.moveTo(X + 50, Y + 130); x.lineTo(X + 80, Y + 95); x.lineTo(X + 170, Y + 95); x.lineTo(X + 205, Y + 130); x.lineTo(X + 215, Y + 150); x.lineTo(X + 40, Y + 150); x.closePath(); x.fill(); x.fillStyle = '#1a1a1e'; [80, 180].forEach(q => { x.beginPath(); x.arc(X + q, Y + 152, 16, 0, 6.3); x.fill(); }); testo('L\'UTILITARIA\nDEL POPOLO', X + 128, Y + 40, 30, '#2a2622'); testo('48 RATE · SENZA ANTICIPO', X + 128, Y + 210, 20, '#f4ecd8');
    [X, Y] = at('concerto'); carta(X, Y, '#1a1a24'); testo('RADIO LUNA', X + 128, Y + 50, 38, '#ff4fa3'); testo('PRESENTA', X + 128, Y + 90, 18, '#f0e8d8'); testo('CYPHER\nALLA GRATA', X + 128, Y + 140, 34, '#35e6ff'); testo('SABATO · ORE 22', X + 128, Y + 222, 20, '#ffd23b');
    [X, Y] = at('disgelo'); carta(X, Y, '#e4e0d4', '#000', .2); testo('DISGELO', X + 128, Y + 46, 46, '#1a1a1a', 'bold italic '); x.fillStyle = '#2a2a2a'; x.fillRect(X + 20, Y + 76, 216, 3); testo('LA MINIERA\nCI MANGIA VIVI', X + 128, Y + 112, 24, '#1a1a1a'); for (let i = 0; i < 7; i++) { x.fillStyle = '#4a4a4a'; x.fillRect(X + 24, Y + 170 + i * 11, 100 + Math.random() * 100, 4); }
    [X, Y] = at('elezioni'); carta(X, Y, '#f2ecdc'); x.fillStyle = '#2a4a8a'; x.fillRect(X + 4, Y + 4, 248, 248); x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(X + 128, Y + 110, 60, 0, 6.3); x.fill(); testo('ORDINE', X + 128, Y + 110, 28, '#a8262a'); testo('VOTA LA LISTA\nDELL\'ORDINE', X + 128, Y + 205, 22, '#f2ecdc');
    [X, Y] = at('radio'); carta(X, Y, '#e8b020'); testo('98.6', X + 128, Y + 90, 70, '#1a1a1a'); testo('ACCENDI\nLA LUNA', X + 128, Y + 175, 30, '#1a1a1a');
    [X, Y] = at('orario'); x.fillStyle = '#f2efe6'; x.fillRect(X, Y, 256, 256); x.fillStyle = '#2a4a7a'; x.fillRect(X, Y, 256, 48); testo('LINEA 1', X + 128, Y + 25, 28, '#f2efe6');
    const nomi = (typeof Vievive !== 'undefined' && Vievive.linea().nomi) || ['STAZIONE', 'MARINA']; nomi.forEach((n, i) => { x.fillStyle = '#2a4a7a'; x.beginPath(); x.arc(X + 30, Y + 70 + i * 30, 7, 0, 6.3); x.fill(); x.textAlign = 'left'; x.font = 'bold 18px Arial'; x.fillStyle = '#1a1a1a'; x.fillText(n.toUpperCase(), X + 46, Y + 76 + i * 30); });
    x.fillStyle = '#2a4a7a'; x.fillRect(X + 28, Y + 70, 4, Math.max(0, (nomi.length - 1) * 30)); testo('FERIALE 6.00–21.30\nOGNI 20 MINUTI', X + 128, Y + 210, 18, '#1a1a1a', 'bold ');
    [X, Y] = at('fermata'); x.fillStyle = '#e8a020'; x.beginPath(); x.arc(X + 128, Y + 128, 124, 0, 6.3); x.fill(); x.fillStyle = '#f2efe6'; x.beginPath(); x.arc(X + 128, Y + 128, 100, 0, 6.3); x.fill(); testo('FERMATA', X + 128, Y + 92, 34, '#2a4a7a'); x.fillStyle = '#2a4a7a'; x.fillRect(X + 70, Y + 120, 116, 50); x.fillStyle = '#f2efe6'; for (let i = 0; i < 4; i++) x.fillRect(X + 78 + i * 27, Y + 126, 20, 18); x.fillStyle = '#1a1a1a'; [92, 164].forEach(q => { x.beginPath(); x.arc(X + q, Y + 172, 9, 0, 6.3); x.fill(); }); testo('1', X + 128, Y + 200, 26, '#a8262a');
    [X, Y] = at('disgelo_strappato'); carta(X, Y, '#e4e0d4', '#000', .25); testo('DISGELO', X + 128, Y + 46, 46, '#1a1a1a', 'bold italic '); testo('NON FIRMATE\nLE CAMBIALI', X + 128, Y + 112, 24, '#1a1a1a'); strappo(X, Y, 130);
    [X, Y] = at('raschiato'); x.clearRect(X, Y, 256, 256); x.fillStyle = 'rgba(228,224,212,.95)'; for (let i = 0; i < 9; i++) { x.beginPath(); const cx = X + 30 + Math.random() * 196, cy = Y + 30 + Math.random() * 196; x.moveTo(cx, cy); for (let k = 0; k < 6; k++) x.lineTo(cx + (Math.random() - .5) * 70, cy + (Math.random() - .5) * 60); x.closePath(); x.fill(); } x.fillStyle = 'rgba(120,120,110,.5)'; for (let i = 0; i < 30; i++) x.fillRect(X + Math.random() * 240, Y + Math.random() * 240, 30 + Math.random() * 60, 2);   // i brandelli e i graffi della spatola
    [X, Y] = at('volantino_disgelo'); carta(X, Y, '#ece8dc'); testo('DISGELO', X + 128, Y + 60, 40, '#1a1a1a', 'bold italic '); for (let i = 0; i < 9; i++) { x.fillStyle = '#5a5a5a'; x.fillRect(X + 30, Y + 110 + i * 14, 120 + Math.random() * 80, 5); }
    [X, Y] = at('volantino_concerto'); carta(X, Y, '#ff9ec7'); testo('RADIO\nLUNA', X + 128, Y + 100, 44, '#1a1a24'); testo('SABATO', X + 128, Y + 200, 26, '#1a1a24');
    [X, Y] = at('giornale'); carta(X, Y, '#ece6d4'); testo('CORRIERE DEL GELO', X + 128, Y + 30, 22, '#1a1a1a', 'bold '); x.fillStyle = '#1a1a1a'; x.fillRect(X + 12, Y + 50, 232, 3); for (let c2 = 0; c2 < 3; c2++) for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(40,40,40,.7)'; x.fillRect(X + 14 + c2 * 78, Y + 70 + i * 12, 64, 4); }
    [X, Y] = at('riviste'); ['#d84a4a', '#ece0c0', '#4a7ad0', '#e8b840', '#50b098', '#e0e0d8'].forEach((col, i) => { const a = X + (i % 3) * 84 + 4, b = Y + Math.floor(i / 3) * 126 + 4; x.fillStyle = col; x.fillRect(a, b, 80, 120); x.fillStyle = 'rgba(20,20,20,.75)'; x.fillRect(a + 6, b + 8, 68, 14); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(a + 14, b + 40, 52, 60); });
    [X, Y] = at('disgelo_muro'); x.clearRect(X, Y, 256, 256); x.fillStyle = '#ece8dc'; x.fillRect(X + 10, Y + 6, 236, 244); testo('DISGELO', X + 128, Y + 50, 44, '#1a1a1a', 'bold italic '); testo('IL GHIACCIO\nSI ROMPE', X + 128, Y + 120, 30, '#a8262a'); for (let i = 0; i < 5; i++) { x.fillStyle = '#5a5a5a'; x.fillRect(X + 30, Y + 180 + i * 12, 150 + Math.random() * 40, 5); } x.fillStyle = 'rgba(240,236,220,.8)'; x.fillRect(X + 4, Y + 2, 30, 14); x.fillRect(X + 222, Y + 238, 30, 14);   // lo scotch agli angoli
    [X, Y] = at('ciclostile'); carta(X, Y, '#e0dccf', '#000', .3); for (let i = 0; i < 16; i++) { x.fillStyle = '#3a3a3a'; x.fillRect(X + 20, Y + 20 + i * 14, 200 + Math.random() * 20, 5); }
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4; if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
    const uv = k => { const [a, b] = at(k); return [a / 1024, 1 - (b + 256) / 1024, (a + 256) / 1024, 1 - b / 1024]; };
    return (ATL = { tex, uv, mat: new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: .35, side: THREE.DoubleSide }) });
  }
  // la locandina del giorno (una tela sua: cambia ogni giorno)
  let LOC = null;
  function locandina(t) {
    const d = Math.floor((t || 0) / 1440); if (!LOC) { const c = document.createElement('canvas'); c.width = 256; c.height = 384; LOC = { c, tex: new THREE.CanvasTexture(c), d: -1 }; if (THREE.sRGBEncoding) LOC.tex.encoding = THREE.sRGBEncoding; LOC.mat = new THREE.MeshLambertMaterial({ map: LOC.tex }); }
    if (LOC.d === d) return LOC; LOC.d = d; const x = LOC.c.getContext('2d'), tit = Vievive.titolo(t, 'corriere');
    x.fillStyle = '#f2ecdc'; x.fillRect(0, 0, 256, 384); x.fillStyle = '#a8262a'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f2ecdc'; x.font = 'bold 26px Georgia, serif'; x.textAlign = 'center'; x.fillText('CORRIERE', 128, 30); x.font = 'bold 18px Georgia, serif'; x.fillText('DEL GELO', 128, 54);
    x.fillStyle = '#1a1a1a'; x.font = 'bold 34px Arial Narrow, Arial, sans-serif'; const words = tit.split(' '); let line = '', yy = 120; words.forEach(w => { if (x.measureText(line + w).width > 230) { x.fillText(line.trim(), 128, yy); line = ''; yy += 42; } line += w + ' '; }); x.fillText(line.trim(), 128, yy);
    x.font = '16px Arial'; x.fillStyle = '#4a4a4a'; x.fillText('EDIZIONE DEL MATTINO · L. 700', 128, 360); LOC.tex.needsUpdate = true; return LOC;
  }

  // ================= LA FUSIONE PER MATERIALE =================
  // ogni mesh (coi suoi gruppi) va nel mucchio del suo materiale, con la matrice del mondo; poi un mesh per materiale
  function Mucchio() { const M = new Map(); return {
    add(obj) { obj.updateMatrixWorld(true); obj.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || !o.material || Array.isArray(o.material) || o.isSprite) return; const m = o.material; let e = M.get(m); if (!e) M.set(m, e = []); e.push({ g: o.geometry, mw: o.matrixWorld.clone() }); }); },
    build(cast) { const out = [];
      M.forEach((L, mat) => { const P = [], N = [], U = [], C = [], hasC = L.every(q => q.g.attributes.color);
        L.forEach(({ g, mw }) => { const gg = (g.index ? g.toNonIndexed() : g.clone()); gg.applyMatrix4(mw); const p = gg.attributes.position, n = gg.attributes.normal, u = gg.attributes.uv, c = gg.attributes.color;
          for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); if (n) N.push(n.getX(i), n.getY(i), n.getZ(i)); else N.push(0, 1, 0); if (u) U.push(u.getX(i), u.getY(i)); else U.push(0, 0); if (hasC) C.push(c.getX(i), c.getY(i), c.getZ(i)); } gg.dispose(); });
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); if (hasC) geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
        geo.computeBoundingSphere(); const me = new THREE.Mesh(geo, mat); me.castShadow = !!cast && !mat.transparent; me.receiveShadow = true; me.matrixAutoUpdate = false; me.userData.vievive = true; out.push(me); });
      return out; } }; }
  // pezzi a colori nei vertici (un materiale solo)
  const VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .75, metalness: .05 });
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), SPH = new THREE.SphereGeometry(1, 10, 7), PLANE = new THREE.PlaneGeometry(1, 1);
  function pezzo(geo, col, m) { const g = geo.clone(); g.applyMatrix4(m); const n = g.attributes.position.count, a = new Float32Array(n * 3); _c.set(col); for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return new THREE.Mesh(g, VC); }
  // una tessera dell'atlante su un piano w × h (la faccia guarda +z), in una matrice
  function tessera(k, w, h, m, rit) { const A = atlante(), [u0, v0, u1, v1] = A.uv(k), g = PLANE.clone(); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const uu = uv.getX(i), vv = uv.getY(i); uv.setXY(i, u0 + (u1 - u0) * (rit ? uu * rit[0] + rit[1] : uu), v0 + (v1 - v0) * (rit ? vv * rit[2] + rit[3] : vv)); } g.applyMatrix4(new THREE.Matrix4().makeScale(w, h, 1)); g.applyMatrix4(m); return new THREE.Mesh(g, A.mat); }
  const gruppo = (x, z, ang) => { const g = new THREE.Group(); g.position.set(x, groundH(x, z), z); g.rotation.y = rot(ang); return g; };

  // ================= L'ARREDO =================
  // il palo della fermata: tubo zincato, la paletta tonda, la tabella dell'orario, il cestino
  function palo(g, asse) {
    g.add(pezzo(CYL, '#8a8e92', M4(0, 1.4, 0, 0, 0, 0, .04, 2.8, .04))); g.add(pezzo(CYL, '#6a6e72', M4(0, .03, 0, 0, 0, 0, .1, .06, .1)));
    g.add(pezzo(CYL, '#e8a020', M4(0, 2.62, 0, PI / 2, 0, 0, .32, .03, .32))); g.add(tessera('fermata', .58, .58, M4(0, 2.62, .018))); g.add(tessera('fermata', .58, .58, M4(0, 2.62, -.018, 0, PI, 0)));
    g.add(pezzo(BOX, '#3a4a5a', M4(0, 1.62, .06, 0, 0, 0, .46, .62, .04))); g.add(tessera('orario', .42, .56, M4(0, 1.62, .083)));   // la tabella con l'orario della linea
    if (!asse) { g.add(pezzo(CYL, '#4a5a4a', M4(.32, .62, .12, 0, 0, 0, .16, .44, .16))); g.add(pezzo(BOX, '#6a6e72', M4(.12, .72, .1, 0, 0, 0, .2, .04, .04))); }
  }
  function costruisci() {
    built = true; const V = Vievive, MU = Mucchio(), AR = typeof Arredo3D !== 'undefined' && Arredo3D ? Arredo3D : null, add = o => MU.add(o);
    const cnt = { fermate: 0, pensiline: 0, edicole: 0, plance: 0 };
    // le fermate: il palo verso la strada; la pensilina dove il marciapiede è largo, se no la panchina (di travertino sull'asse)
    V.fermate().forEach(f => { const asse = /^E4/.test(f.zona || ''), g = gruppo(f.x, f.y, f.dir);   // +z del gruppo: verso la strada
      const pl = new THREE.Group(); pl.position.set(1.7, 0, .45); palo(pl, asse); g.add(pl);
      if (f.pensilina && AR) { const p = AR.make('fermata'); p.position.set(0, 0, -.5); g.add(p); cnt.pensiline++; }
      else if (AR) { const b = AR.make(asse ? 'panchina_marmo' : 'panchina_ghisa'); b.position.set(-.4, 0, -.55); g.add(b); }
      add(g); cnt.fermate++; });
    // le edicole e la locandina del giorno, a cavalletto accanto al bancone
    B.locandine = [];
    V.edicole().forEach(e => { const g = gruppo(e.kx, e.ky, e.kang);
      if (AR) g.add(AR.make('edicola')); else g.add(pezzo(BOX, '#3a6a4a', M4(0, 1.2, 0, 0, 0, 0, 2.4, 2.4, 1.6)));
      [[-.6, .02], [.05, -.04], [.62, .05]].forEach(([gx, ga], i) => g.add(tessera('giornale', .46, .32, M4(gx, 1.005 + i * .002, 1.14, -PI / 2, ga, 0))));   // le pile dei quotidiani sul bancone (le riviste sono già sulla rastrelliera del chiosco)
      // la molletta delle riviste: un filo teso sotto la tettoia coi settimanali appesi
      g.add(pezzo(BOX, '#2a2a2a', M4(0, 2.08, 1.02, 0, 0, 0, 2.2, .015, .015))); for (let i = 0; i < 5; i++) g.add(tessera('riviste', .3, .42, M4(-.9 + i * .45, 1.84, 1.03), [.33, (i % 3) / 3, .5, (i % 2) * .5]));
      // il cavalletto della locandina (i due fogli col titolo del giorno li mette locandineVive: la loro tela cambia ogni giorno)
      const cav = new THREE.Group(); cav.position.set(1.65, 0, 1.0); cav.rotation.y = -.35; [-1, 1].forEach(s => { cav.add(pezzo(BOX, '#3a3a3e', M4(0, .6, s * .15, s * .2, 0, 0, .52, 1.22, .02))); }); g.add(cav); add(g);
      B.locandine.push({ e }); cnt.edicole++; });
    // le plance delle affissioni: telaio di ferro su due gambe, due manifesti per faccia
    V.plance().forEach((p, i) => { const g = gruppo(p.x, p.y, p.ang + PI / 2);   // parallela alla via: una faccia guarda la strada, l'altra le case
      [-1, 1].forEach(s => g.add(pezzo(BOX, '#3a3e42', M4(s * 1.05, 1.15, 0, 0, 0, 0, .06, 2.3, .06))));
      g.add(pezzo(BOX, '#4a4e52', M4(0, 1.6, 0, 0, 0, 0, 2.2, 1.5, .05))); g.add(pezzo(BOX, '#2a2e32', M4(0, 2.38, 0, 0, 0, 0, 2.3, .06, .14)));
      const M2 = p.manifesti; [[1, 0], [-1, PI]].forEach(([s, ry]) => M2.forEach((k, j) => { const kk = k === 'disgelo' && s < 0 ? 'disgelo_strappato' : k; g.add(tessera(kk, .98, 1.38, M4((j - .5) * 1.02 * s, 1.6, s * .03, 0, ry, 0))); }));
      add(g); cnt.plance++; });
    // il gatto sul gradino: acciambellato o seduto, coi colori di animali.js
    const GC = ['#d88a3a', '#2a2420', '#8a8a88', '#e8dcc8'];
    V.suolo().gatti.forEach(c0 => { const g = gruppo(c0.x, c0.y, c0.a), col = GC[c0.c % 4];
      if (c0.dorme) { g.add(pezzo(SPH, col, M4(0, .1, 0, 0, 0, 0, .2, .1, .17))); g.add(pezzo(SPH, col, M4(.12, .12, .08, 0, 0, 0, .08, .07, .08))); g.add(pezzo(CYL, col, M4(-.05, .06, .16, PI / 2, .9, 0, .03, .28, .03))); }
      else { g.add(pezzo(SPH, col, M4(0, .16, 0, 0, 0, 0, .1, .16, .12))); g.add(pezzo(SPH, col, M4(0, .36, .06, 0, 0, 0, .075, .07, .07))); [-1, 1].forEach(s => g.add(pezzo(new THREE.ConeGeometry(1, 1, 4), col, M4(s * .04, .44, .06, 0, 0, s * .2, .025, .05, .02)))); g.add(pezzo(CYL, col, M4(.08, .04, -.12, PI / 2, -.6, 0, .025, .26, .025))); }
      add(g); });
    // i volantini caduti sotto le plance
    V.suolo().volantini.forEach(q => { const g = gruppo(q.x, q.y, q.a); g.add(tessera(q.k === 'disgelo' ? 'volantino_disgelo' : 'volantino_concerto', .21, .3, M4(0, .012, 0, -PI / 2, 0, 0))); add(g); });
    B.statici = MU.build(true); B.statici.forEach(m => scene.add(m));
    // ---------------- il suolo a istanze ----------------
    const S = V.suolo(), d = new THREE.Object3D();
    // l'erba: tre fili affusolati incrociati, verde scuro o paglia secca
    { const P = [], C = []; for (let k = 0; k < 5; k++) { const a = k / 5 * PI, w = .045, h = .16 + (k % 3) * .05, ca = Math.cos(a), sa = Math.sin(a), lean = (k % 2 ? .04 : -.03); P.push(-ca * w, 0, -sa * w, ca * w, 0, sa * w, ca * lean, h, sa * lean); C.push(.42, .42, .42, .42, .42, .42, 1, 1, 1); }   // il piede in ombra, la punta in luce: il colore lo dà l'istanza
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.computeVertexNormals();
      const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), Math.max(1, S.erba.length));
      S.erba.forEach((e, i) => { d.position.set(e.x, groundH(e.x, e.y), e.y); d.rotation.set(0, e.a, 0); d.scale.setScalar(e.s * 1.6); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, _c.set(e.secca ? '#c8b070' : ['#7a9a50', '#8aa858', '#6a8a48'][i % 3])); });
      m.count = S.erba.length; m.receiveShadow = true; m.userData.vievive = true; scene.add(m); B.erba = m; }
    // le foglie secche sotto i filari: piccole losanghe piatte
    { const geo = new THREE.PlaneGeometry(.11, .07); geo.rotateX(-PI / 2); const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), Math.max(1, S.foglie.length)); const FC = ['#8a5a2a', '#a8742e', '#6a4a24', '#b88a3a'];
      S.foglie.forEach((f, i) => { d.position.set(f.x, groundH(f.x, f.y) + .022, f.y); d.rotation.set(0, f.a, 0); d.scale.setScalar(1.4); d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, _c.set(FC[f.c % 4])); });
      m.count = S.foglie.length; m.receiveShadow = true; scene.add(m); B.foglie = m; }
    // le pozzanghere: chiazze lucide e scure al cordolo, che asciugano in mattinata
    { const geo = new THREE.CircleGeometry(.5, 20); geo.rotateX(-PI / 2); const mat = new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: .06, metalness: .35, transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, S.pozze.length)); S.pozze.forEach((q, i) => { d.position.set(q.x, groundH(q.x, q.y) + .03, q.y); d.rotation.set(0, PI / 2 - q.a, 0); d.scale.set(q.w * 2, 1, q.l * 2); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
      m.count = S.pozze.length; m.renderOrder = 1; scene.add(m); B.pozze = m; }
    // ---------------- le cose delle scene ----------------
    { const geo = PLANE.clone(), A = atlante(), [u0, v0, u1, v1] = A.uv('disgelo_muro'), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + (u1 - u0) * uv.getX(i), v0 + (v1 - v0) * uv.getY(i));
      B.affissi = new THREE.InstancedMesh(geo, A.mat, 6); B.affissi.count = 0; B.affissi.frustumCulled = false; scene.add(B.affissi);
      const g2 = PLANE.clone(), [a0, b0, a1, b1] = A.uv('raschiato'), uv2 = g2.attributes.uv; for (let i = 0; i < uv2.count; i++) uv2.setXY(i, a0 + (a1 - a0) * uv2.getX(i), b0 + (b1 - b0) * uv2.getY(i));
      B.raschiati = new THREE.InstancedMesh(g2, A.mat, 6); B.raschiati.count = 0; B.raschiati.frustumCulled = false; scene.add(B.raschiati); }
    { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 12, 8), new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: .5 }), 4); m.count = 0; m.castShadow = true; m.frustumCulled = false; scene.add(m); B.palle = m; }
    { const g = new THREE.Group(); if (AR) g.add(AR.make('carretto')); else g.add(pezzo(BOX, '#8a6a4a', M4(0, .7, 0, 0, 0, 0, 1.4, .5, .8)));
      const frutta = ['#c83a2a', '#e8a020', '#7aa040', '#c8c040']; for (let i = 0; i < 14; i++) g.add(pezzo(SPH, frutta[i % 4], M4(-.45 + (i % 7) * .15, .98 + Math.floor(i / 7) * .06, -.15 + Math.floor(i / 7) * .3, 0, 0, 0, .07)));
      const MC = Mucchio(); MC.add(g); const car = new THREE.Group(); MC.build(true).forEach(m => { m.matrixAutoUpdate = true; car.add(m); }); car.visible = false; scene.add(car); B.carretto = car; }
    if (window.__dbg35 || window.__vvdbg) console.log('[vievive] arredo', JSON.stringify(cnt), 'statici', B.statici.length, 'erba', S.erba.length, 'foglie', S.foglie.length, 'pozze', S.pozze.length);
    B.cnt = cnt;
  }
  // la locandina vera: un piano per edicola col titolo del giorno (la sua tela), sul cavalletto
  function locandineVive(st) { const L = locandina(st.t); if (!B.locMesh) { B.locMesh = []; B.locandine.forEach(({ e }) => { const g = gruppo(e.kx, e.ky, e.kang), c = new THREE.Group(); c.position.set(1.65, 0, 1.0); c.rotation.y = -.35; [-1, 1].forEach(s => { const m = new THREE.Mesh(PLANE, L.mat); m.scale.set(.46, .7, 1); m.position.set(0, .66, s * .165); m.rotation.set(s * .2, s > 0 ? 0 : PI, 0); c.add(m); }); g.add(c); scene.add(g); B.locMesh.push(g); }); } }

  // ================= IL PASSO =================
  function attach(api) { scene = api.scene; G = api.G; groundH = api.groundH; ready = !!(scene && G && groundH); }
  function tick(st, time, night, dt) {
    if (!ready || typeof Vievive === 'undefined' || !Vievive || !Vievive.attivo) return;
    if (!B) B = {};
    if (!built) { costruisci(); }
    locandineVive(st);
    const hr = ((st.t / 60) % 24 + 24) % 24, V = st.vv || { affissi: [], palle: [], carretto: null }, d = B.__d || (B.__d = new THREE.Object3D());
    // le pozzanghere: piene all'alba, asciutte verso le undici; sempre quando piove
    if (B.pozze) { const pioggia = typeof window !== 'undefined' && window.__meteo && /pioggia|neve|temporale/.test(window.__meteo); const k = pioggia ? 1 : hr >= 4 && hr < 8 ? 1 : hr >= 8 && hr < 11 ? 1 - (hr - 8) / 3 : hr >= 23 || hr < 4 ? .6 : 0; B.pozze.visible = k > .02; B.pozze.material.opacity = .55 * k; }
    // gli affissi: freschi sul muro, poi i brandelli raschiati
    if (B.affissi) { let a = 0, r = 0; V.affissi.forEach(q => { const y = groundH(q.x, q.y) + 1.75, ry = Math.atan2(q.nx, q.ny); d.position.set(q.x + q.nx * .02, y, q.y + q.ny * .02); d.rotation.set(0, ry, 0); d.scale.set(.7, .95, 1); d.updateMatrix();
        if (q.raschiato) { if (r < 6) B.raschiati.setMatrixAt(r++, d.matrix); } else if (a < 6) B.affissi.setMatrixAt(a++, d.matrix); });
      B.affissi.count = a; B.raschiati.count = r; B.affissi.instanceMatrix.needsUpdate = true; B.raschiati.instanceMatrix.needsUpdate = true; }
    // il pallone: va e viene fra i due ragazzini con un rimbalzo
    if (B.palle) { let i = 0; V.palle.forEach(b => { if (i >= 4) return; const a = G.byId(st, b.a), c = G.byId(st, b.b); if (!a || !c || a.inside || c.inside) return; const T2 = 1.6, ph = ((st.clock - b.t0) % (T2 * 2)) / T2, f = ph < 1 ? ph : 2 - ph, x = a.x + (c.x - a.x) * f, z = a.y + (c.y - a.y) * f, h = Math.abs(Math.sin(f * PI * 2)) * .5 + .11;
        d.position.set(x, groundH(x, z) + h, z); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); B.palle.setMatrixAt(i++, d.matrix); }); B.palle.count = i; B.palle.instanceMatrix.needsUpdate = true; }
    // il carretto: accanto al venditore della scena
    if (B.carretto) { const cr = V.carretto, n = cr && G.byId(st, cr.npc); if (n && !n.inside) { if (!cr.pos) { const a = n.face || 0; cr.pos = { x: n.x + Math.cos(a) * 1.1, y: n.y + Math.sin(a) * 1.1, a: a + PI / 2 }; if (!G.walkM(cr.pos.x, cr.pos.y)) { cr.pos.x = n.x - Math.cos(a) * 1.1; cr.pos.y = n.y - Math.sin(a) * 1.1; } }
        B.carretto.visible = true; B.carretto.position.set(cr.pos.x, groundH(cr.pos.x, cr.pos.y), cr.pos.y); B.carretto.rotation.y = rot(cr.pos.a); } else B.carretto.visible = false; }
  }
  // per le misure: quante chiamate di disegno aggiunge il filone (i mesh fusi per materiale, le istanze, le locandine)
  function conta() { if (!B) return null; return { fusi: B.statici ? B.statici.length : 0, istanze: 7, locandine: B.locMesh ? B.locMesh.length * 2 : 0, arredo: B.cnt }; }

  // ---------------- AGGANCIO a ordine_arte.js ----------------
  (function hook() {
    if (typeof OrdineArte === 'undefined' || OrdineArte.__vievive) return;
    const a0 = OrdineArte.attach, t0 = OrdineArte.tick; OrdineArte.__vievive = true;
    OrdineArte.attach = api => { a0(api); try { attach(api); } catch (e) { console.error('[vievive_arte] attach', e); } };
    OrdineArte.tick = (st, time, night, dt, cam) => { t0(st, time, night, dt, cam); try { tick(st, time, night, dt); } catch (e) { if (!tick.err) { tick.err = 1; console.error('[vievive_arte]', e); } } };
  })();
  return { attach, tick, conta, atlante };
})();
