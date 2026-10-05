
/* Porto Vecchio — resa 3D in stile pixel art (Three.js r149).
   Scena renderizzata a bassa risoluzione, poi ingrandita con contorni e color grading.
   Solo grafica: la logica (game.js) non dipende da nulla di questo file. */
var Render = (function () {
  'use strict';
  const G = Game, TS = G.TS, M = G.MAP, OX = G.OX;
  let renderer, scene, camera, rt, postScene, postCam, postMat;
  let hemi, moon, fillAmb;
  const FOGTEAL = new THREE.Color('#2c5a62');
  const dyn = { people: {}, vespas: {}, lights: [], flicker: [], signs: [], buildings: [], water: null, rain: null, motes: null, laundry: [], markers: null, boats: [], gulls: [], beams: [], chasers: [], spin: [], sky: null };
  let PX = 3, W = 0, H = 0, VIEW = 44;
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tz: 1, shake: 0, h: 0 };
  const YAW = Math.PI / 4, PITCH = 0.78;

  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const NEVE = false;   // [inverno19] la neve: true la rimette dappertutto
  const NOSNOW = new THREE.MeshBasicMaterial({ visible: false });
  const NQ = ['#e8d8bc', '#b84a3c', '#f0a048'].map(h => new THREE.Color(h));   // [inverno16] tubo freddo spento, rosso cupo, sodio
  // [inverno27] toni delle luci: chiaro, caldo, freddo, giallo, ambra, molto caldo (pesati verso il caldo)
  const LTONES = ['#fff0d8', '#ffd49a', '#ffc070', '#e4e8ea', '#ffe27a', '#ffae48', '#ff9a40', '#ff8530', '#ffb860', '#f6f2ea'];
  // [luci1] REGIA: sodio per le strade, incandescenza per la gente, bianco duro solo per il regime, rosso-ambra ai bar
  const LSOD = ['#ff9a3c', '#ffa246', '#ff9034', '#ffaa50', '#ff983a'], LPORTO = ['#ff8a2c', '#ff9234', '#ff8428'];
  const LINC = ['#ffc274', '#ffb562', '#ffcf8a', '#ffa850', '#ffbd6a'], LBAR = ['#ff7040', '#ff8248', '#ff6a3a', '#ff7a3c'], LREG = '#dde6e2';
  const LAMPS = ['#ffb35c', '#ffa84a', '#ffb85c'];   // chi chiama addLight/glow con questi colori è un lampione da strada
  let ZONES = null;
  function zoneAt(x, z) {
    if (!ZONES) { ZONES = []; const P = G.PLACES || {};
      const put = (ids, k, r) => ids.forEach(id => { const q = P[id]; if (q) ZONES.push({ x: q.x, z: q.y, k, r2: r * r }); });
      put(['commissariato', 'caserma_p', 'rocca', 'varco', 'muro', 'cultura', 'hangar1', 'hangar2', 'deposito_n', 'deposito_s', 'eliporto', 'poligono'], 'regime', 14);
      put(['sirena', 'bar', 'osteria', 'miramare', 'stella', 'aurora', 'gabbiano', 'flamingo', 'paradiso', 'oceano', 'disco', 'flipper', 'chiosco', 'osteria_sg'], 'bar', 9);
      put(['molo', 'calata', 'pontile', 'marina', 'molo_cargo', 'cantiere'], 'porto', 16); }
    let best = null, bd = 1e9; for (const Z of ZONES) { const d = (Z.x - x) * (Z.x - x) + (Z.z - z) * (Z.z - z); if (d < Z.r2 && d < bd) { bd = d; best = Z.k; } }
    return best; }
  function tone(hex, x, z) { const q = nq(hex); if (q === '#' + NQ[1].getHexString()) return q; const c = new THREE.Color(hex), h = {}; c.getHSL(h);
    const zo = zoneAt(x, z), lamp = LAMPS.includes(hex), k = Math.imul((Math.round(x * 2) * 73856093) ^ (Math.round(z * 2) * 19349663), 2654435761) >>> 0;
    if (h.s >= .5 && h.h * 360 < 26) return hex;                  // fuochi e rossi: restano come sono
    if (zo === 'regime') return LREG;                              // la luce del potere è bianca e dura
    if (h.s < .2 && h.l > .85) return hex;                         // riflettori, fari: già bianchi
    if (lamp) return zo === 'porto' ? LPORTO[k % LPORTO.length] : LSOD[k % LSOD.length];
    if (zo === 'bar') return LBAR[k % LBAR.length];
    return LINC[k % LINC.length]; }
  function nq(hex) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); const hu = h.h * 360; if (h.s < .25) return hex; let best = 0, bd = 999; [185, 355, 32].forEach((t, i) => { let d = Math.abs(hu - t); d = Math.min(d, 360 - d); if (d < bd) { bd = d; best = i; } }); return '#' + NQ[best].getHexString(); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; return t; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .9, metalness: 0 }, o));
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rt, rb, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat);
  function shadowed(m, cast, rec) { m.traverse(o => { if (o.isMesh) { o.castShadow = cast !== false; o.receiveShadow = rec !== false; } }); return m; }
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; r = Math.min(255, Math.max(0, Math.round(r * f))); g = Math.min(255, Math.max(0, Math.round(g * f))); b = Math.min(255, Math.max(0, Math.round(b * f))); return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }

  // materiali condivisi (per gli oggetti statici, che poi vengono fusi)
  const MC = {};
  const sm = (c, o) => { const k = 'S' + c + (o ? JSON.stringify(o) : ''); return MC[k] || (MC[k] = std(Object.assign({ color: c }, o || {}))); };
  const sl = c => MC['L' + c] || (MC['L' + c] = lam(c));
  const sb = c => MC['B' + c] || (MC['B' + c] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false }));   // [inverno30] la nebbia non brucia le luci

  // ---------------- QUOTE DEL TERRENO (solo visive) ----------------
  function rampH(R, x, z) { const k = R.axis === 'x' ? (x / TS - R.x) / R.w : (z / TS - R.y) / R.h; return R.h0 + (R.h1 - R.h0) * clamp(k, 0, 1); }
  function tileElev(tx, ty) { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; return M.elev[ty * G.GW + tx]; }
  const VH = (i, j) => M.vh[Math.max(0, Math.min(G.GH, j)) * M.VW + Math.max(0, Math.min(G.GW, i))];
  function groundH(x, z) { // quota del terreno: interpolata fra i quattro vertici della casella
    const fx = x / TS, fz = z / TS; if (fx < 0 || fz < 0 || fx >= G.GW || fz >= G.GH) return -2;
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    return VH(i, j) * (1 - u) * (1 - v) + VH(i + 1, j) * u * (1 - v) + VH(i, j + 1) * (1 - u) * v + VH(i + 1, j + 1) * u * v;
  }
  function cornerH(tx, ty, cx, cz) { return VH(tx + cx, ty + cz); }
  const isWall = (tx, ty) => false;
  const zoneOf = tx => 'C';

  // ---------------- FUSIONE DELLA GEOMETRIA STATICA ----------------
  // tutte le mesh statiche con lo stesso materiale, nello stesso settore di 48 m, diventano una mesh sola
  const STATIC = new Map();
  const _wp = new THREE.Vector3();
  function addStatic(obj, noShadow) {
    obj.updateMatrixWorld(true); curObj = obj;
    obj.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      o.getWorldPosition(_wp);
      const key = o.material.uuid + '|' + Math.floor(_wp.x / 80) + ',' + Math.floor(_wp.z / 80) + (noShadow ? '|n' : '');
      let b = STATIC.get(key); if (!b) { b = { mat: o.material, geos: [], noShadow }; STATIC.set(key, b); }
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      b.geos.push(g); if (curTag) tagPart(b, g.attributes.position.count);
    });
  }
  function mergeGeos(geos) {
    let n = 0; geos.forEach(g => n += g.attributes.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
    geos.forEach(g => {
      const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3);
      if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += c; g.dispose();
    });
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.computeBoundingSphere(); m.computeBoundingBox(); return m;
  }
  function flushStatic() {
    STATIC.forEach(b => { let o = 0; b.offs = b.geos.map(g => { const k = o; o += g.attributes.position.count; return k; }); const m = new THREE.Mesh(mergeGeos(b.geos), b.mat); b.mesh = m; b.geos = []; m.castShadow = !b.noShadow; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); scene.add(m); });
    STATIC.clear();
  }
  // fonde i figli di un gruppo (in coordinate del gruppo) per materiale.
  // Restano separati: mesh con più materiali, mesh con userData.keep, sottoalberi con userData.keepTree, sprite e luci.
  function mergeGroup(grp) {
    grp.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(grp.matrixWorld).invert(), by = new Map(), keep = [];
    const walk = o => {
      for (const c of o.children) {
        if (c.userData.keepTree || c.isSprite || c.isLight || (c.isMesh && (Array.isArray(c.material) || c.userData.keep))) { keep.push(c); continue; }
        if (c.isMesh) { let b = by.get(c.material); if (!b) { b = []; by.set(c.material, b); } const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld)); b.push(g); }
        walk(c);
      }
    };
    walk(grp);
    const out = new THREE.Group(); out.position.copy(grp.position); out.rotation.copy(grp.rotation); out.scale.copy(grp.scale);
    keep.forEach(o => { const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld); o.parent.remove(o); m.decompose(o.position, o.quaternion, o.scale); out.add(o); });
    by.forEach((geos, mat) => out.add(new THREE.Mesh(mergeGeos(geos), mat)));
    return out;
  }

  // il terreno si dipinge col tipo di casella originale anche sotto gli arredi che bloccano il passaggio (banchi, muri del cimitero, carri)
  const gT = (tx, ty) => G.baseTile ? G.baseTile(tx, ty) : G.tileAt(tx, ty);
  // ---------------- TERRENO ----------------
  const PPM = 8; // pixel per metro nelle texture
  const TP = TS * PPM; // 16 px per casella
  let stoneTex = null, stepTex = null;
  function stoneTexture() {
    if (stoneTex) return stoneTex;
    const c = mk(64, 64), x = c.getContext('2d'), r = rng(31);
    x.fillStyle = '#5a4c44'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) { const off = (y / 8 % 2) * 7; for (let k = -off; k < 64; k += 14) { const w = 12 + Math.floor(r() * 3); x.fillStyle = pick(r, ['#8a7866', '#9a8672', '#7c6a5a', '#a08c74', '#86745f', '#937d68']); x.fillRect(k + 1, y + 1, w, 6); x.fillStyle = 'rgba(255,240,220,.12)'; x.fillRect(k + 1, y + 1, w, 1); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(k + 1, y + 6, w, 1); } }
    for (let i = 0; i < 40; i++) { x.fillStyle = pick(r, ['rgba(70,110,60,.45)', 'rgba(40,70,40,.4)']); x.fillRect(Math.floor(r() * 64), 56 + Math.floor(r() * 8), 2, 1); }
    stoneTex = canvasTex(c); stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; return stoneTex;
  }
  function stepTexture() {
    if (stepTex) return stepTex;
    const c = mk(32, 8), x = c.getContext('2d'), r = rng(4);
    x.fillStyle = '#c8b9a0'; x.fillRect(0, 0, 32, 8);
    for (let k = 0; k < 32; k += 8) { x.fillStyle = pick(r, ['#bcae96', '#d2c4aa', '#c0b098']); x.fillRect(k, 0, 7, 8); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(k + 7, 0, 1, 8); }
    x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(0, 0, 32, 1); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 7, 32, 1);
    stepTex = canvasTex(c); stepTex.wrapS = stepTex.wrapT = THREE.RepeatWrapping; return stepTex;
  }
  // disegno delle caselle nella texture del terreno
  function paintGround(x, rx, r) {
    const tile = (tx, ty) => gT(tx, ty), T = G.T;
    const nearWater = (tx, ty) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([a, b]) => { const v = tile(tx + a, ty + b); return v === T.WATER && tx + a >= 0 && tx + a < G.GW && ty + b < G.GH; });
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const v = tile(tx, ty), px = tx * TP, py = ty * TP, z = zoneOf(tx), el = tileElev(tx, ty);
      if (v === T.COB || v === T.STAIRS) {
        if (z === 'C') { // selciato del borgo
          x.fillStyle = '#2a2433'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 4) { const off = ((ty * 4 + sy / 4) % 2) * 2; for (let sx = -off; sx < TP; sx += 5) { const w = 4 - (r() < .25 ? 1 : 0); x.fillStyle = pick(r, ['#5a5068', '#524862', '#63586f', '#4a425a', '#665a6c']); x.fillRect(px + Math.max(0, sx), py + sy, Math.min(w, TP - Math.max(0, sx)), 3); if (r() < .5) { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + Math.max(0, sx), py + sy, 1, 1); } } }
        } else if (z === 'W') { // mattonato a spina di pesce
          x.fillStyle = '#4a3430'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 2) for (let sx = 0; sx < TP; sx += 4) { const o = ((sx / 4 + sy / 2) % 2); x.fillStyle = pick(r, ['#a0675a', '#94604f', '#ad735f', '#8a5848', '#b07a64']); if (o) x.fillRect(px + sx, py + sy, 3, 1); else x.fillRect(px + sx + 1, py + sy, 1, 2); }
          x.fillStyle = 'rgba(40,20,30,.18)'; x.fillRect(px, py, TP, 1);
        } else if (el > 0) { // risseu: acciottolato ligure bianco e nero
          x.fillStyle = '#2b2a30'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 2) for (let sx = 0; sx < TP; sx += 2) { const gx = tx * 8 + sx / 2, gy = ty * 8 + sy / 2; const d = (Math.abs(((gx + gy) % 16) - 8) + Math.abs(((gx - gy + 256) % 16) - 8)); const white = d < 5 || d > 13 || (gx + gy) % 16 === 0; x.fillStyle = white ? pick(r, ['#e6e0d2', '#d8d2c4', '#efe8da']) : pick(r, ['#2a2830', '#34313a', '#3e3a44']); x.fillRect(px + sx, py + sy, 2, 2); }
        } else { // Lungomare: lastre color crema
          x.fillStyle = '#b89c90'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 8) for (let sx = 0; sx < TP; sx += 8) { x.fillStyle = pick(r, ['#e6cfc0', '#dcc3b4', '#ecd8c8', '#d8bcae']); x.fillRect(px + sx, py + sy, 7, 7); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(px + sx, py + sy, 7, 1); }
        }
      } else if (v === T.WALK) {
        if (z === 'E') { // marciapiede a scacchi rosa e bianchi
          for (let sy = 0; sy < TP; sy += 4) for (let sx = 0; sx < TP; sx += 4) { x.fillStyle = ((sx + sy) / 4 + tx * 4 + ty * 4) % 2 ? '#f4c6d2' : '#f4ece6'; x.fillRect(px + sx, py + sy, 4, 4); }
          for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(80,40,70,.12)'; x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 2, 1); }
        } else { x.fillStyle = '#8a8490'; x.fillRect(px, py, TP, TP); for (let k = 0; k < TP; k += 8) { x.fillStyle = '#76707c'; x.fillRect(px + k, py, 1, TP); } for (let i = 0; i < 8; i++) { x.fillStyle = pick(r, ['#948e9a', '#7e7886']); x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 2, 1); } }
        const road = tile(tx, ty + 1) === T.VIA ? TP - 2 : tile(tx, ty - 1) === T.VIA ? 0 : -1;
        if (road >= 0) { x.fillStyle = '#d8d2cc'; x.fillRect(px, py + road, TP, 2); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px, py + (road ? road - 1 : 2), TP, 1); }
      } else if (v === T.PIAZZA || v === T.FOUNT) {
        for (let sy = 0; sy < TP; sy += 8) for (let sx = 0; sx < TP; sx += 8) {
          x.fillStyle = '#3a3440'; x.fillRect(px + sx, py + sy, 8, 8);
          x.fillStyle = pick(r, ['#8d7f86', '#85787f', '#958890', '#7e7179', '#9a8c8e']); x.fillRect(px + sx, py + sy, 7, 7);
          x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + sx, py + sy, 7, 1);
          if (r() < .12) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + sx + 2, py + sy + 3, 3, 1); }
        }
        // rosa dei venti al centro della piazza
        const cx0 = (OX + 25) * TP, cy0 = 10 * TP + TP;
        if (Math.abs(px + 8 - cx0) < 60 && Math.abs(py + 8 - cy0) < 60) { const dd = Math.hypot(px + 8 - cx0, py + 8 - cy0); if (dd > 40 && dd < 50) { x.fillStyle = '#c8b28a'; x.fillRect(px + 6, py + 6, 4, 4); } }
      } else if (v === T.VIA) {
        x.fillStyle = '#2a2730'; x.fillRect(px, py, TP, TP);
        for (let i = 0; i < 16; i++) { x.fillStyle = pick(r, ['#302d37', '#25222b', '#34303a']); x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 1, 1); }
        if (ty === 24 && tx % 2 === 0) { x.fillStyle = '#e8e2d0'; x.fillRect(px + 2, py + 7, 10, 2); }
        if (ty === 23) { x.fillStyle = '#d8d2c4'; x.fillRect(px, py + 1, TP, 1); }
        if (ty === 25) { x.fillStyle = '#d8d2c4'; x.fillRect(px, py + TP - 2, TP, 1); }
        const zebra = [8, 9, 18, 19, 30, 31, 38, 39].map(k => k + OX).concat([12, 13, 25, 26, 78, 79, 87, 95, 96, 109]);
        if (zebra.includes(tx)) for (let k = 2; k < TP; k += 4) { x.fillStyle = 'rgba(236,230,214,.7)'; x.fillRect(px + 1, py + k, TP - 2, 2); }
        if (tx < 3 || tx > 114) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(px, py, TP, TP); }
      } else if (v === T.QUAY) {
        x.fillStyle = '#56535c'; x.fillRect(px, py, TP, TP);
        x.fillStyle = '#48454f'; x.fillRect(px, py, TP, 1); x.fillRect(px, py, 1, TP);
        for (let i = 0; i < 6; i++) { x.fillStyle = pick(r, ['rgba(120,70,40,.2)', 'rgba(0,0,0,.2)', 'rgba(255,255,255,.05)']); x.fillRect(px + Math.floor(r() * 14), py + Math.floor(r() * 14), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
        if (tile(tx, ty + 1) === T.WATER) for (let k = 0; k < TP; k += 4) { x.fillStyle = (k / 4 + tx) % 2 ? '#e0b83a' : '#1b1b1f'; x.fillRect(px + k, py + TP - 3, 4, 3); }
        if (z === 'W' && ty === 28) { x.fillStyle = '#2a2a30'; x.fillRect(px, py + 3, TP, 2); x.fillRect(px, py + 11, TP, 2); x.fillStyle = '#8a8a90'; x.fillRect(px, py + 3, TP, 1); x.fillRect(px, py + 11, TP, 1); }
        if (z === 'W' && r() < .2) { x.fillStyle = 'rgba(10,10,20,.4)'; x.beginPath(); x.ellipse(px + 8, py + 8, 5, 3, r() * 3, 0, 7); x.fill(); }
      } else if (v === T.PIER) {
        for (let k = 0; k < TP; k += 3) { x.fillStyle = pick(r, ['#8b6a4b', '#7e5e42', '#936f50', '#735840']); x.fillRect(px, py + k, TP, 2); x.fillStyle = '#3a2a1f'; x.fillRect(px, py + k + 2, TP, 1); }
        x.fillStyle = '#3a2a1f'; x.fillRect(px + (tx % 2 ? TP - 1 : 0), py, 1, TP);
      } else if (v === T.SAND) {
        const wet = nearWater(tx, ty);
        x.fillStyle = wet ? '#b89a70' : '#ead3a2'; x.fillRect(px, py, TP, TP);
        for (let i = 0; i < 26; i++) { x.fillStyle = pick(r, wet ? ['#a88a62', '#c4a67c', '#9c8058'] : ['#f2dfb4', '#dcc294', '#e4ca9c', '#f6e6c2']); x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 1 + Math.floor(r() * 2), 1); }
        if (!wet && r() < .25) { x.fillStyle = 'rgba(120,90,50,.35)'; for (let k = 0; k < 4; k++) x.fillRect(px + 3 + k * 3, py + 4 + (k % 2) * 3, 2, 1); }
        if (wet) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px, py + TP - 3 + Math.floor(r() * 2), TP, 1); }
      } else if (v === T.GRASS || v === T.TREE) {
        const pine = (tx < 18 && ty < 6) || tx >= 120; // pineta e Macchia: sottobosco
        x.fillStyle = pine ? '#3a4a2a' : '#3f6a36'; x.fillRect(px, py, TP, TP);
        for (let i = 0; i < 30; i++) { x.fillStyle = pick(r, pine ? ['#5a4a2a', '#6a5634', '#445a30', '#4c3e24'] : ['#4f7c3e', '#5a8a44', '#37602f', '#6a9a4a']); x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 1, 1 + Math.floor(r() * 2)); }
        if (!pine && r() < .5) { x.fillStyle = pick(r, ['#f06a8a', '#f0e060', '#ffffff', '#c080f0']); x.fillRect(px + Math.floor(r() * 14), py + Math.floor(r() * 14), 1, 1); }
      } else if (v === T.ROCK) {
        x.fillStyle = '#4a4248'; x.fillRect(px, py, TP, TP);
        for (let i = 0; i < 9; i++) { x.fillStyle = pick(r, ['#6a6064', '#5a5258', '#7a6e6a', '#3a3438']); const w = 2 + Math.floor(r() * 5); x.fillRect(px + Math.floor(r() * (TP - w)), py + Math.floor(r() * (TP - 3)), w, 2 + Math.floor(r() * 2)); }
      } else if (v === T.WATER) { x.fillStyle = '#0c1a26'; x.fillRect(px, py, TP, TP); }
      // muschio ed erbacce alla base dei muri
      if ((v === T.COB || v === T.PIAZZA || v === T.WALK) && r() < .9) {
        [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
          if (tile(tx + dx, ty + dy) !== T.BLD) return;
          for (let i = 0; i < 5; i++) {
            const mxp = dx === 0 ? px + Math.floor(r() * TP) : (dx < 0 ? px + Math.floor(r() * 2) : px + TP - 1 - Math.floor(r() * 2));
            const myp = dy === 0 ? py + Math.floor(r() * TP) : (dy < 0 ? py + Math.floor(r() * 2) : py + TP - 1 - Math.floor(r() * 2));
            x.fillStyle = pick(r, ['#3f5a3a', '#4c6b3f', '#34492f']); x.fillRect(mxp, myp, 1, 1);
          }
        });
      }
    }
    // pozzanghere (lucide: riflettono i neon)
    for (let i = 0; i < 150; i++) {
      const tx = Math.floor(r() * G.GW), ty = Math.floor(r() * 30), v = tile(tx, ty);
      if (v !== T.COB && v !== T.PIAZZA && v !== T.VIA && v !== T.QUAY) continue;
      const cx = tx * TP + r() * TP, cy = ty * TP + r() * TP, rw = 3 + r() * 9, rh = 2 + r() * 4;
      x.fillStyle = 'rgba(20,26,48,.5)'; x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(160,180,240,.14)'; x.fillRect(cx - rw / 2, cy - 1, rw * .5, 1);
      rx.fillStyle = '#141414'; rx.beginPath(); rx.ellipse(cx, cy, rw, rh, 0, 0, 7); rx.fill();
    }
    // strisce di parcheggio sulla strada dietro gli hotel e al distributore
    for (let k = 0; k < 9; k++) { const px = (80 + k * 3.5) * TP, py = 13 * TP; x.fillStyle = 'rgba(236,230,214,.6)'; x.fillRect(px, py, 1, TP * 1.8); }
    // tombini
    for (let i = 0; i < 20; i++) { const cx = (4 + i * 5.7) * TP, cy = 24 * TP + 3; x.fillStyle = '#1b1920'; x.fillRect(cx, cy, 6, 5); x.fillStyle = '#3a3642'; x.fillRect(cx + 1, cy + 1, 4, 1); x.fillRect(cx + 1, cy + 3, 4, 1); }
  }

  function buildGround() {
    const cw = G.WW * PPM, ch = G.WH * PPM, c = mk(cw, ch), x = c.getContext('2d');
    const rc = mk(cw, ch), rx = rc.getContext('2d');
    const r = rng(42);
    x.fillStyle = '#1a1622'; x.fillRect(0, 0, cw, ch);
    rx.fillStyle = '#e0e0e0'; rx.fillRect(0, 0, cw, ch);
    paintGround(x, rx, r);
    const tex = canvasTex(c), rtex = canvasTex(rc); tex.magFilter = THREE.LinearFilter; // [inverno] bordi della neve e dei marciapiedi senza scalini di texel
    const T = G.T;
    // una casella = un quadrilatero alla sua quota (rampe inclinate); gradini a parte
    const pos = [], uv = [], nor = [], sp = [], suv = [], snor = [];
    const quad = (a, b, c2, d, ua, ub, uc, ud, P, U, N) => { [a, b, c2, a, c2, d].forEach(p => P.push(p[0], p[1], p[2])); [ua, ub, uc, ua, uc, ud].forEach(q => U.push(q[0], q[1])); const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]]; let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; n = n.map(v => v / l);
      // [inverno] sul terreno le normali sono per vertice (dolci), non per casella: niente facce a spigolo vivo sui pendii
      if (P === pos) [a, b, c2, a, c2, d].forEach(q => { const i = Math.round(q[0] / TS), j = Math.round(q[2] / TS); if (Math.abs(q[1] - VH(i, j)) > .02) { N.push(...n); return; } const gx = (VH(i + 1, j) - VH(i - 1, j)) / (2 * TS), gz = (VH(i, j + 1) - VH(i, j - 1)) / (2 * TS), m = Math.hypot(gx, 1, gz); N.push(-gx / m, 1 / m, -gz / m); });
      else for (let k = 0; k < 6; k++) N.push(...n); };
    const U = (px, pz) => [px / G.WW, 1 - pz / G.WH];
    const skip = (tx, ty) => { const v = gT(tx, ty); return v === T.WATER || v === T.STAIRS || isWall(tx, ty); }; // sotto gli edifici il pavimento serve: quando diventano trasparenti
    const edgeH = (tx, ty, side) => { // quote dei due spigoli di un lato: side 0=N,1=E,2=S,3=W
      const c = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]][side];
      return [cornerH(tx, ty, c[0], c[1]), cornerH(tx, ty, c[2], c[3])];
    };
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (skip(tx, ty)) continue;
      const v = gT(tx, ty), inB = v === T.BLD;
      const x0 = tx * TS, z0 = ty * TS, x1 = x0 + TS, z1 = z0 + TS;
      let h00 = cornerH(tx, ty, 0, 0), h10 = cornerH(tx, ty, 1, 0), h11 = cornerH(tx, ty, 1, 1), h01 = cornerH(tx, ty, 0, 1);
      if (v === T.SAND) { // la sabbia scende sotto il pelo dell'acqua
        const wd = (cx, cz) => [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]].some(([a, b]) => gT(a, b) === T.WATER && b < G.GH && a >= 0 && a < G.GW);
        if (wd(tx, ty)) h00 = -.6; if (wd(tx + 1, ty)) h10 = -.6; if (wd(tx + 1, ty + 1)) h11 = -.6; if (wd(tx, ty + 1)) h01 = -.6;
      }
      quad([x0, h00, z0], [x0, h01, z1], [x1, h11, z1], [x1, h10, z0], U(x0, z0), U(x0, z1), U(x1, z1), U(x1, z0), pos, uv, nor);
      // pareti verticali: verso l'acqua (banchine, ponti) e verso le caselle più basse
      const NB = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]];
      if (!inB) NB.forEach(([dx, dy, side]) => {
        const nx = tx + dx, ny = ty + dy, nv = gT(nx, ny);
        const [ha, hb] = edgeH(tx, ty, side);
        let la, lb;
        if (nv === T.WATER || nx < 0 || nx >= G.GW || ny >= G.GH) { if (v === T.SAND) return; la = lb = -1.6; }
        else if (nv === T.BLD || ny < 0) return;
        else { const opp = (side + 2) % 4; const [na, nb] = edgeH(nx, ny, opp); la = nb; lb = na; if (ha - la < .05 && hb - lb < .05) return; la = Math.min(la, ha); lb = Math.min(lb, hb); }
        const c = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]][side];
        const ax = x0 + c[0] * TS, az = z0 + c[1] * TS, bx = x0 + c[2] * TS, bz = z0 + c[3] * TS;
        quad([bx, hb, bz], [bx, lb, bz], [ax, la, az], [ax, ha, az], [1, hb / 2], [1, lb / 2], [0, la / 2], [0, ha / 2], sp, suv, snor);
      });
    }
    const mkGeo = (P, UV, N) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return g; };
    const gm = new THREE.Mesh(mkGeo(pos, uv, nor), std({ map: tex, roughnessMap: rtex, roughness: 1, metalness: 0 }));
    gm.receiveShadow = true; scene.add(gm);
    const wm = new THREE.Mesh(mkGeo(sp, suv, snor), std({ map: stoneTexture(), roughness: .95 })); wm.receiveShadow = true; wm.castShadow = true; scene.add(wm);
    buildStairs(); buildWalls();
  }
  // gradini veri per le scalinate
  function buildStairs() {
    const mat = std({ map: stepTexture(), roughness: .9 }), side = std({ map: stoneTexture() });
    M.ramps.forEach(R => {
      if (!R.stairs) return;
      const len = (R.axis === 'x' ? R.w : R.h) * TS, wid = (R.axis === 'x' ? R.h : R.w) * TS;
      const rise = Math.abs(R.h1 - R.h0), n = Math.max(2, Math.round(rise / .3)), dep = len / n;
      for (let k = 0; k < n; k++) {
        const t0 = k / n, hgt = R.h0 + (R.h1 - R.h0) * ((k + .5) / n), top = Math.round(hgt / .3) * .3 + .0;
        const hTop = Math.max(.15, top), b = box(R.axis === 'x' ? dep + .01 : wid, hTop + .2, R.axis === 'x' ? wid : dep + .01, mat);
        const along = R.axis === 'x' ? R.x * TS + (t0 + .5 / n) * len : R.y * TS + (t0 + .5 / n) * len;
        if (R.axis === 'x') b.position.set(along, hTop / 2 - .1, R.y * TS + wid / 2); else b.position.set(R.x * TS + wid / 2, hTop / 2 - .1, along);
        addStatic(b);
      }
      // corrimano in ferro ai lati
      const rail = sl('#1e1a24');
      [0, 1].forEach(s => {
        for (let k = 0; k <= len; k += 1) {
          const p = R.axis === 'x' ? [R.x * TS + k, R.y * TS + .15 + s * (wid - .3)] : [R.x * TS + .15 + s * (wid - .3), R.y * TS + k];
          const h = rampH(R, p[0], p[1]); const post = box(.05, .95, .05, rail); post.position.set(p[0], h + .47, p[1]); addStatic(post);
        }
        const x0 = R.axis === 'x' ? R.x * TS : R.x * TS + .15 + s * (wid - .3), z0 = R.axis === 'x' ? R.y * TS + .15 + s * (wid - .3) : R.y * TS;
        const x1 = R.axis === 'x' ? x0 + len : x0, z1 = R.axis === 'x' ? z0 : z0 + len;
        const h0 = rampH(R, x0 + (x1 - x0) * .01, z0 + (z1 - z0) * .01), h1 = rampH(R, x1 - (x1 - x0) * .01, z1 - (z1 - z0) * .01);
        const bar = box(.06, .06, Math.hypot(len, h1 - h0), rail); bar.position.set((x0 + x1) / 2, (h0 + h1) / 2 + .95, (z0 + z1) / 2);
        bar.lookAt(x1, h1 + .95, z1); addStatic(bar);
      });
    });
  }
  // muraglioni con balaustra, lampioncini e bouganville
  function buildWalls() {
    const r = rng(8), wallM = std({ map: stoneTexture(), roughness: .95 }), capM = sm('#c9bba2'), balM = sm('#e8e0d0'), bougM = [sl('#e0408a'), sl('#c42a78'), sl('#f06aa8')], leafM = sl('#2f6a35');
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (!isWall(tx, ty)) continue;
      let top = tileElev(tx, ty);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = tx + dx, ny = ty + dy; if (nx < 0 || ny < 0 || nx >= G.GW || ny >= G.GH) continue; if (G.bIndex[ny * G.GW + nx] >= 0 && !(dx === 0 || dy === 0)) continue; top = Math.max(top, tileElev(nx, ny)); }
      const cx = tx * TS + 1, cz = ty * TS + 1, wtag = 'w' + (ty * G.GW + tx), put = (o, fl) => { if (fl) o.userData[fl] = true; curTag = wtag; addStatic(o); curTag = null; tagObj(wtag, o); };
      const w = box(TS, top + .3, TS, wallM); w.position.set(cx, (top + .3) / 2 - .3, cz); put(w, 'block');
      const cap = box(TS + .08, .14, TS + .08, capM); cap.position.set(cx, top + .07, cz); put(cap);
      // balaustra sui lati che danno sul vuoto
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = tx + dx, ny = ty + dy; if (gT(nx, ny) === G.T.BLD) return;
        const nh = groundH(nx * TS + 1, ny * TS + 1); if (top - nh < 1.2) return;
        const ex = cx + dx * .85, ez = cz + dy * .85, along = dx === 0;
        const rail = box(along ? TS : .16, .1, along ? .16 : TS, capM); rail.position.set(ex, top + .95, ez); put(rail, 'bal');
        for (let k = 0; k < 6; k++) { const o = -TS / 2 + .17 + k * .33; const b = cyl(.05, .07, .8, 5, balM); b.position.set(along ? cx + o : ex, top + .5, along ? ez : cz + o); put(b, 'bal'); }
        // bouganville che ricadono dal muro
        if (r() < .3) {
          for (let k = 0; k < 5; k++) { const s = .35 + r() * .35; const f = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), k % 3 === 2 ? leafM : pick(r, bougM)); f.position.set(ex + (along ? (r() - .5) * 1.8 : dx * .3), top - .2 - r() * Math.min(2.2, top - nh - .4), ez + (along ? dy * .3 : (r() - .5) * 1.8)); f.scale.set(1, 1.3, 1); put(f, 'flower'); }
        }
      });
    }
  }

  // ---------------- MARE ----------------
  function buildWater() {
    // maschera della terraferma sfocata: serve per acqua bassa turchese e schiuma sulla riva
    const S = 4, mc = mk(G.GW * S, G.GH * S), mx = mc.getContext('2d');
    mx.fillStyle = '#000'; mx.fillRect(0, 0, mc.width, mc.height);
    const T = G.T;
    mx.fillStyle = '#fff';
    const W0c = M.world;
    if (W0c && W0c.northY) { const q = S / TS; mx.beginPath(); for (let X = 0; X <= G.WW; X += 2) mx.lineTo(X * q, W0c.northY(X) * q); for (let X = G.WW; X >= 0; X -= 2) mx.lineTo(X * q, W0c.southY(X) * q); mx.closePath(); mx.fill();
    }
    else for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty); if (v !== T.WATER && v !== T.PIER) mx.fillRect(tx * S, ty * S, S, S); }
    const bc = mk(mc.width, mc.height), bx = bc.getContext('2d'); bx.filter = 'blur(5px)'; bx.drawImage(mc, 0, 0); bx.filter = 'none';
    const btx = new THREE.CanvasTexture(bc); btx.minFilter = btx.magFilter = THREE.LinearFilter;
    const geo = new THREE.PlaneGeometry(2400, 2400, 1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, night: { value: 1 }, dusk: { value: 0 }, mask: { value: btx }, wsize: { value: new THREE.Vector2(G.WW, G.WH) }, fogC: { value: new THREE.Color() }, camP: { value: new THREE.Vector3() }, fogN: { value: 60 }, fogF: { value: 160 } },
      vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float time; uniform float night; uniform float dusk; uniform sampler2D mask; uniform vec2 wsize; uniform vec3 fogC; uniform vec3 camP; uniform float fogN; uniform float fogF; varying vec3 vP;
        void main(){
          vec2 p = floor(vP.xz*6.)/6.;
          vec2 muv = p/wsize; float m = texture2D(mask, vec2(muv.x, 1.-muv.y)).r;
          if (muv.x<0.||muv.x>1.||muv.y>1.||muv.y<0.) m = 0.;
          float w = sin(p.x*1.3 + time*1.2 + sin(p.y*2.1+time)*1.5) * sin(p.y*3.1 - time*.8);
          float band = step(.82, w);
          vec3 deep = mix(vec3(.11,.15,.18), vec3(.03,.04,.07), night);
          vec3 shal = mix(vec3(.24,.31,.33), vec3(.06,.10,.13), night);
          vec3 c = mix(deep, shal, smoothstep(.04,.55,m));
          c = mix(c, c*vec3(1.08,.95,.95)+vec3(.04,.02,.03), dusk*.4);
          c += band*mix(vec3(.16,.20,.22), vec3(.06,.07,.12), night);
          // schiuma sulla riva, a onde
          float foam = step(.72, sin(m*26. - time*1.8 + sin(p.x*.4)*1.5)) * smoothstep(.35,.62,m) * (1.-smoothstep(.8,.95,m));
          c = mix(c, vec3(.92,.95,1.)*(1.-night*.45), foam*.8);
          // riflessi del tramonto e dei neon verso l'orizzonte
          float sp = step(.9, sin(p.x*3.7+time*2.)*sin(p.y*5.3-time*1.3));
          c += sp*mix(vec3(.5,.45,.3), vec3(1.,.35,.6), max(dusk, night*.7))*.35;
          float d = distance(vP, camP); c = mix(c, fogC, smoothstep(fogN, fogF, d));
          gl_FragColor = vec4(c,1.);
        }`,
    });
    const m = new THREE.Mesh(geo, mat); m.position.set(G.WW / 2, -.45, G.WH / 2); scene.add(m); dyn.water = mat;
    const LK = M.world && M.world.LAKE; if (LK) { const lg = new THREE.PlaneGeometry(LK.rx * 2 + 8, LK.ry * 2 + 8, 1, 1); lg.rotateX(-Math.PI / 2); const lm = new THREE.Mesh(lg, mat); lm.position.set(LK.x, LK.h - .5, LK.y); scene.add(lm); }
  }

  // ================= L'ISOLA: terreno a blocchi caricati vicino alla camera, vegetazione, arredo =================
  // Il terreno è diviso in blocchi da 64 m: si dipingono e si costruiscono solo quelli vicini, gli altri sono
  // coperti da un'isola a bassa risoluzione. La vegetazione è instanziata blocco per blocco.
  const ISO = { CH: 32, chunks: new Map(), base: null, rev: 0 };
  const ZN = M.Z || {};
  const hv = (i, j) => { i = Math.max(0, Math.min(G.GW, i)); j = Math.max(0, Math.min(G.GH, j)); return M.vh[j * M.VW + i]; };
  const zoneT = (tx, ty) => M.zone[ty * G.GW + tx];
  const th = (tx, ty, s) => { let h = (tx * 374761393 + ty * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

  // strade curve: le caselle servono solo alle collisioni; a terra si dipinge il tracciato liscio
  const RECT = new Uint8Array(G.GW * G.GH);
  (M.roads || []).forEach(rd => { if (!rd.rect) return; const q = rd.rect; for (let ty = q[1] - 1; ty <= q[3] + 1; ty++) for (let tx = q[0] - 1; tx <= q[2] + 1; tx++) if (tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH) RECT[ty * G.GW + tx] = 1; });
  const RW = (M.world && M.world.roadW) || new Float32Array(G.GW * G.GH);
  const groundFor = z => z === ZN.MACCHIA || z === ZN.MONTE ? G.T.SHRUB : z === ZN.DESERTO ? G.T.DESERT : z === ZN.SPIAGGIA ? G.T.SAND : z === ZN.CITTA ? G.T.COB : G.T.GRASS;
  function smoothRoads(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    x.lineJoin = 'round'; x.lineCap = 'round';
    const pass = (filter, width, style) => (M.roads || []).forEach(rd => {
      if (rd.rect || !filter(rd)) return;
      const pad = rd.w + 4; let started = false; x.beginPath();
      for (let k = 0; k < rd.pts.length; k++) {
        const [ax, ay] = rd.pts[k], nb = rd.pts[Math.min(k + 1, rd.pts.length - 1)], pb = rd.pts[Math.max(k - 1, 0)];
        const near = Math.max(ax, nb[0], pb[0]) > X0 - pad && Math.min(ax, nb[0], pb[0]) < X1 + pad && Math.max(ay, nb[1], pb[1]) > Y0 - pad && Math.min(ay, nb[1], pb[1]) < Y1 + pad;
        if (!near) { started = false; continue; }
        if (!started) { x.moveTo((ax - X0) * PPM, (ay - Y0) * PPM); started = true; } else x.lineTo((ax - X0) * PPM, (ay - Y0) * PPM);
      }
      x.lineWidth = width(rd) * PPM; x.strokeStyle = style(rd); x.stroke();
    });
    const dirt = rd => rd.kind === 'sterrato', asph = rd => !dirt(rd);
    pass(dirt, rd => rd.w + 1.2, () => 'rgba(110,84,58,.55)');
    pass(dirt, rd => rd.w, () => '#8a6a4a');
    pass(dirt, rd => 1.1, () => 'rgba(150,120,86,.6)');
    pass(asph, rd => rd.w + 1.2, () => 'rgba(150,140,124,.9)');
    pass(asph, rd => rd.w, () => '#626064');
    // grana dell'asfalto
    x.lineCap = 'butt';
  }

  // asfalto vecchio: grigio chiaro, macchie, crepe, qualche buca
  function asphalt(x, px, py, P, tx, ty, r) {
    const base = 96 + Math.floor((vnz(tx / 7, ty / 7) + .5) * 9);   // [inverno17] tinta morbida, non a quadrati
    x.fillStyle = `rgb(${base},${base - 2},${base + 2})`; x.fillRect(px, py, P, P);
    for (let i = 0; i < 26; i++) { const g = base + Math.floor((r() - .5) * 26); x.fillStyle = `rgb(${g},${g - 2},${g + 1})`; x.fillRect(px + Math.floor(r() * P), py + Math.floor(r() * P), 1 + Math.floor(r() * 2), 1); }
    if (r() < .25) { x.fillStyle = 'rgba(60,56,58,.3)'; x.beginPath(); x.ellipse(px + r() * P, py + r() * P, 2 + r() * 4, 1.5 + r() * 2.5, r() * 3, 0, 6.3); x.fill(); }   // rattoppo [inverno18]
    if (r() < .18) { x.strokeStyle = 'rgba(50,46,48,.55)'; x.lineWidth = 1; x.beginPath(); let cx = px + r() * P, cy = py + r() * P; x.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += (r() - .5) * 8; cy += (r() - .5) * 8; x.lineTo(cx, cy); } x.stroke(); }   // crepa
    if (th(tx, ty, 77) < .025) { const cx = px + 3 + r() * (P - 6), cy = py + 3 + r() * (P - 6), rr = 2 + r() * 2.5; x.fillStyle = '#4a4648'; x.beginPath(); x.ellipse(cx, cy, rr, rr * .7, r() * 3, 0, 6.3); x.fill(); x.fillStyle = '#3a3638'; x.beginPath(); x.ellipse(cx + .5, cy + .5, rr * .6, rr * .4, 0, 0, 6.3); x.fill(); }   // buca
  }
  // [inverno] distanza dalla linea di costa vera (metri, positiva verso terra)
  function coastIn(x, y) { const W0 = M.world; if (!W0 || !W0.northY) return 9; const L = W0.LAKE; if (L) { const q = Math.hypot((x - L.x) / L.rx, (y - L.y) / L.ry); if (q < 1.6) return (q - .9) * Math.min(L.rx, L.ry); } return Math.min(y - W0.northY(x), W0.southY(x) - y, x - 6, 672 - x); }
  // ---- pittura del terreno, casella per casella ----
  function paintTiles(x, tx0, ty0, n, m) {
    const T = G.T, P = TP;
    const dots = (px, py, k, cols, r, sz) => { for (let i = 0; i < k; i++) { x.fillStyle = cols[Math.floor(r() * cols.length)]; x.fillRect(px + Math.floor(r() * P), py + Math.floor(r() * P), sz || 1, sz || 1); } };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx; let v = gT(tx, ty);
      if (!RECT[ii] && ((RW[ii] > 0 && (v === T.VIA || v === T.DIRT)) || v === T.WALK)) v = groundFor(zoneT(tx, ty));
      const px = i * P, py = j * P, z = zoneT(tx, ty), r = rng((tx * 7919 + ty * 104729) >>> 0);
      const wx = tx * TS, wy = ty * TS;
      if (v === T.COB || v === T.STAIRS) {
        const old = Math.hypot(wx - 400, wy - 615) < 75, west = wx < 330;
        if (old) { x.fillStyle = '#2a2433'; x.fillRect(px, py, P, P); for (let sy = 0; sy < P; sy += 4) { const off = ((ty * 4 + sy / 4) % 2) * 2; for (let sx = -off; sx < P; sx += 5) { x.fillStyle = pick(r, ['#5a5068', '#4e465c', '#62586e', '#544a62']); x.fillRect(px + sx, py + sy, 4, 3); } } }
        else if (west) { x.fillStyle = '#4a3430'; x.fillRect(px, py, P, P); for (let sy = 0; sy < P; sy += 2) for (let sx = 0; sx < P; sx += 4) { const o = ((sx / 4 + sy / 2) % 2); x.fillStyle = pick(r, ['#a0675a', '#94604f', '#ad735f', '#8a5848']); x.fillRect(px + sx + o * 2, py + sy, 3, 1); } }
        else { x.fillStyle = '#3a3640'; x.fillRect(px, py, P, P); for (let sy = 0; sy < P; sy += 3) for (let sx = (sy % 2) * 2; sx < P; sx += 4) { x.fillStyle = pick(r, ['#8a8290', '#7a7280', '#968e9a', '#6e6676']); x.fillRect(px + sx, py + sy, 3, 2); } }
      } else if (v === T.VIA) {
        asphalt(x, px, py, P, tx, ty, r);
      } else if (v === T.WALK) {
        x.fillStyle = '#54525a'; x.fillRect(px, py, P, P); dots(px, py, 6, ['#48464e', '#62606a'], r);
      } else if (v === T.PIAZZA) {
        x.fillStyle = '#b8ac98'; x.fillRect(px, py, P, P);   // [inverno17] lastre a correre: righe di 7 px, giunti sfalsati per riga, misure variabili; continuano fra le caselle
        for (let yy = 0; yy < P; yy++) { const gy = ty * P + yy, row = Math.floor(gy / 7); if (gy % 7 === 0) { x.fillStyle = 'rgba(120,110,98,.55)'; x.fillRect(px, py + yy, P, 1); continue; }
          for (let xx = 0; xx < P; xx++) { const gx = tx * P + xx, off = th(row, 0, 51) * 23, cell = Math.floor((gx + off) / (9 + th(row, 1, 52) * 6)); if (Math.floor((gx + 1 + off) / (9 + th(row, 1, 52) * 6)) !== cell) { x.fillStyle = 'rgba(120,110,98,.5)'; x.fillRect(px + xx, py + yy, 1, 1); } else if (th(cell, row, 53) < .3) { x.fillStyle = 'rgba(150,138,122,.12)'; x.fillRect(px + xx, py + yy, 1, 1); } } }
        dots(px, py, 10, ['#c8bca8', '#a89c88'], r);
      } else if (v === T.QUAY) {
        x.fillStyle = '#6e6862'; x.fillRect(px, py, P, P); x.fillStyle = '#5a5450'; x.fillRect(px, py + (ty % 2) * 8, P, 1); x.fillRect(px + ((tx + ty) % 2) * 8, py, 1, P); dots(px, py, 14, ['#7a746e', '#625c56', '#847e76'], r);
      } else if (v === T.PIER) {
        x.fillStyle = '#6a4a32'; x.fillRect(px, py, P, P); for (let k = 0; k < P; k += 3) { x.fillStyle = pick(r, ['#7a5638', '#5e4028', '#865e3e']); x.fillRect(px, py + k, P, 2); }
      } else if (v === T.SAND) {
        x.fillStyle = '#e6d0a0'; x.fillRect(px, py, P, P); dots(px, py, 26, ['#f2dfb4', '#dcc294', '#e4ca9c', '#f6e6c2', '#cdb486'], r);
      } else if (v === T.DESERT) {
        x.fillStyle = '#dcb47a'; x.fillRect(px, py, P, P); x.fillStyle = 'rgba(160,110,60,.25)'; for (let k = 0; k < 3; k++) { const yy = Math.floor((Math.sin((wx + k * 5) * .3) * 2 + k * 5 + (wy % 5))) % P; x.fillRect(px, py + Math.abs(yy), P, 1); }
        dots(px, py, 18, ['#e8c48a', '#c8a066', '#f0d09a', '#b89060'], r);
      } else if (v === T.SALT) {
        x.fillStyle = '#eceeee'; x.fillRect(px, py, P, P); x.strokeStyle = 'rgba(150,160,170,.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(px + r() * P, py); x.lineTo(px + r() * P, py + P); x.moveTo(px, py + r() * P); x.lineTo(px + P, py + r() * P); x.stroke(); dots(px, py, 6, ['#ffffff', '#d8dcde'], r);
      } else if (v === T.CLIFF) {   // [monte] parete di roccia: strati, crepe
        x.fillStyle = '#4e4846'; x.fillRect(px, py, P, P); for (let k = 0; k < P; k += 3) { x.fillStyle = pick(r, ['#5e5854', '#46403e', '#686260', '#3a3634']); x.fillRect(px, py + k, P, 2); }
        dots(px, py, 18, ['#7a746e', '#2e2a28', '#6a7458'], r, 2); x.fillStyle = 'rgba(20,18,18,.5)'; x.fillRect(px + Math.floor(r() * P), py, 1, P);
      } else if (v === T.GRAVEL) {   // [monte] ghiaia bianca della fiumara e del fondo della gola
        x.fillStyle = '#b8b2a6'; x.fillRect(px, py, P, P); dots(px, py, 60, ['#e0dad0', '#c8c2b6', '#a49e94', '#d4cec2', '#8e887e', '#f0ece4'], r, 2);
        if (M.world && M.world.monte) { const wx2 = tx * TS + 1, wy2 = ty * TS + 1, k2 = Math.sin(wx2 * .7 + Math.sin(wy2 * .23) * 3); if (Math.abs(k2) < .25) { x.fillStyle = 'rgba(190,220,236,.75)'; x.fillRect(px, py + 5, P, 5); } }
      } else if (v === T.DIRT && M.world && M.world.feat && (M.world.feat[ii] & 2) && !(RW[ii] > 0)) {   // [monte] calanchi: argilla grigia a solchi
        x.fillStyle = '#8a8680'; x.fillRect(px, py, P, P); for (let k = 1; k < P; k += 3) { x.fillStyle = pick(r, ['#76726c', '#9a968e', '#6a6660']); x.fillRect(px + k, py, 1, P); } dots(px, py, 14, ['#a8a49c', '#5e5a54'], r);
      } else if (v === T.ROCK) {
        x.fillStyle = '#7a7270'; x.fillRect(px, py, P, P); dots(px, py, 30, ['#8a827e', '#6a625e', '#968e88', '#5e5652', '#7e8a6a'], r, 2);
        x.fillStyle = 'rgba(30,26,30,.35)'; x.fillRect(px + Math.floor(r() * P), py, 1, Math.floor(r() * P));
      } else if (v === T.DIRT) {
        x.fillStyle = '#8a6a4a'; x.fillRect(px, py, P, P); dots(px, py, 20, ['#9a7a58', '#7a5a3e', '#a08060', '#6a4e36'], r); x.fillStyle = 'rgba(60,40,26,.35)'; x.fillRect(px + 4, py, 2, P); x.fillRect(px + 11, py, 2, P);
      } else if (v === T.FIELD) {
        const f = th(tx >> 3, ty >> 3, 3);
        if (f < .3) { x.fillStyle = '#7a5a3a'; x.fillRect(px, py, P, P); x.fillStyle = '#5a7a34'; for (let k = 2; k < P; k += 5) x.fillRect(px, py + k, P, 2); }          // vigna
        else if (f < .6) { x.fillStyle = '#c8a850'; x.fillRect(px, py, P, P); x.fillStyle = 'rgba(150,110,40,.4)'; for (let k = 0; k < P; k += 3) x.fillRect(px, py + k, P, 1); dots(px, py, 10, ['#e0c060', '#b89040'], r); } // grano
        else if (f < .8) { x.fillStyle = '#8a7a4a'; x.fillRect(px, py, P, P); dots(px, py, 24, ['#9a8a5a', '#7a6a3a', '#a89a62'], r); }    // oliveto
        else { x.fillStyle = '#6a4a30'; x.fillRect(px, py, P, P); x.fillStyle = '#5a3c26'; for (let k = 1; k < P; k += 3) x.fillRect(px + k, py, 1, P); }                     // arato
      } else if (v === T.TREE) {
        const mac = z === ZN.MACCHIA; x.fillStyle = mac ? '#2a3a22' : '#3a4428'; x.fillRect(px, py, P, P); dots(px, py, 30, mac ? ['#3a4a2a', '#24301e', '#4a3a26', '#30402a'] : ['#5a4a2a', '#6a5634', '#445a30', '#4c3e24'], r);
      } else if (v === T.SHRUB) {
        x.fillStyle = z === ZN.MONTE ? '#6a6a40' : '#56683a'; x.fillRect(px, py, P, P); dots(px, py, 26, ['#6a7a44', '#4a5a30', '#7a7a4a', '#8a7a52'], r, 2);
      } else if (v === T.GRASS) {
        const dry = z === ZN.MONTE || z === ZN.DESERTO || z === ZN.SPIAGGIA; x.fillStyle = dry ? '#7a7a48' : '#4a7a3a'; x.fillRect(px, py, P, P);
        dots(px, py, 30, dry ? ['#8a8a52', '#6a6a3e', '#9a8e5a'] : ['#4f7c3e', '#5a8a44', '#37602f', '#6a9a4a'], r);
        if (!dry && r() < .4) { x.fillStyle = pick(r, ['#f06a8a', '#f0e060', '#ffffff', '#c080f0']); x.fillRect(px + Math.floor(r() * 14), py + Math.floor(r() * 14), 1, 1); }
      } else if (v === T.FOUNT || v === T.WATER) {
        x.fillStyle = '#2a6a8a'; x.fillRect(px, py, P, P);
      } else { x.fillStyle = '#2a2433'; x.fillRect(px, py, P, P); } // sotto gli edifici
    }
  }
  // ---- [inverno] la neve sul terreno ----
  // Neve sporca, bagnata e segnata dove passa la gente: fanghiglia sulle strade, impronte e pozzanghere su marciapiedi
  // e cortili, cumuli grigi ai bordi. Candida solo dove non passa nessuno: le dorsali, il fitto della foresta.
  // Fuliggine di carbone al porto cargo e alla Base. Nella prateria dei beduini la neve non c'è: erba secca e brina.
  // I bordi sono curvi: la quantità di neve si calcola per casella su una tela piccola, si allarga sfumata
  // e una soglia rumorosa la ritaglia in chiazze dal contorno morbido. Agli incroci, i solchi curvi delle gomme.
  function snowPass(x, tx0, ty0, n, m) {
    const T = G.T, P = TP, WD = M.world && M.world.districtAt, B = 2, NW = n + B * 2, NH = m + B * 2;
    const isRoad = (tx, ty) => { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return false; const i = ty * G.GW + tx; return RW[i] > 0 || gT(tx, ty) === T.VIA; };
    const blot = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
    const smear = (cx, cy, rw, rh, col, rot) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, 1); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));   // [inverno18]
      x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.scale(rw, rh); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 6.3); x.translate(-cx, -cy); x.fill(); x.restore(); };
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    // 1) quantità e colore della neve per casella (con un bordo di 2 caselle, così i blocchi si raccordano)
    const sc = mk(NW, NH), sx = sc.getContext('2d'), img = sx.createImageData(NW, NH);
    const info = [];
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const tx = tx0 + i - B, ty = ty0 + j - B, o = (j * NW + i) * 4;
      if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) continue;
      const v = gT(tx, ty), z = zoneT(tx, ty), d = WD ? WD(tx * TS) : 'centro', road = isRoad(tx, ty);
      const cal = v === T.DIRT && M.world && M.world.feat && (M.world.feat[ty * G.GW + tx] & 2) && !road;
      const paved = v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY || v === T.STAIRS || v === T.PIER, natural = !road && !paved && v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.CLIFF && v !== T.GRAVEL && !cal;
      const sooty = d === 'base' || d === 'porto' || v === T.QUAY;
      let nearRoad = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (isRoad(tx + dx, ty + dy)) nearRoad++;
      const virgin = NEVE && natural && !nearRoad && (z === ZN.MONTE || z === ZN.MACCHIA) && !sooty;
      let a = 0, col = '#a8acb2';
      if (v === T.WATER || v === T.FOUNT) a = 0;
      else if (v === T.CLIFF) { a = .2; col = '#c6cad0'; }
      else if (v === T.GRAVEL) { a = .4; col = '#dde2e8'; }
      else if (cal) { a = .34; col = '#c8ccd2'; }
      else if (v === T.BLD) { a = .7; col = '#a2a6ac'; }
      else if (d === 'prateria' && natural) { a = Math.max(0, (tx * TS - 128) / 30) * .5; col = '#b4b6b8'; }
      else if (d === 'prateria' && road) { a = .55; col = '#6a5e4c'; }   // pista di terra gelata
      else if (road) { a = .5; col = sooty ? '#4e4a48' : '#5c5854'; }
      else if (paved) { a = .62; col = sooty ? '#727274' : '#868a8f'; }
      else if (virgin) { a = .94; col = '#c8ccd2'; }
      else if (d === 'foresta') { a = .76; col = '#aeb2b8'; }
      else { a = .8; col = sooty ? '#8e8e90' : '#aeb2b8'; }
      if (!road && nearRoad && natural && d !== 'prateria') { a = Math.min(1, a + .15); col = sooty ? '#88888a' : '#a2a6ac'; }
      if (!NEVE) a = 0;   // [inverno19]
      const c = hex(col); img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = Math.round(a * 255);
      if (i >= B && j >= B && i < NW - B && j < NH - B) info.push({ tx, ty, px: (i - B) * P, py: (j - B) * P, road, paved, natural, virgin, sooty, prairie: d === 'prateria' && natural });
    }
    sx.putImageData(img, 0, 0);
    // 2) sotto: terra fradicia scura (il verde d'estate non spunta), erba secca in prateria
    info.forEach(q => { if (!q.natural) return; const r = rng((q.tx * 4561 + q.ty * 9203) >>> 0);
      if (q.prairie) { const wx = q.tx * TS, wy = q.ty * TS, k = vnz(wx / 40, wy / 40) + vnz(wx / 9, wy / 9) * .4; blot(q.px, q.py, P, P, `rgb(${Math.round(122 + k * 30)},${Math.round(108 + k * 26)},${Math.round(74 + k * 16)})`); }   // erba secca color paglia, a macchie larghe
      else blot(q.px, q.py, P, P, pick(r, ['#4e463e', '#524a40', '#4a423c'])); });
    // 3) la neve: velo sfumato, poi chiazze col contorno morbido ritagliate dal rumore
    x.save(); x.imageSmoothingEnabled = true;
    // la mappa a una casella per pixel, ingrandita in modo lineare, fa losanghe a spigolo: la si sfuma con un raggio di ~0,6 caselle
    const BP = B * P, big = mk(NW * P, NH * P), bx = big.getContext('2d'); bx.imageSmoothingEnabled = true;
    try { bx.filter = 'blur(' + Math.round(P * .6) + 'px)'; } catch (e) {}
    bx.drawImage(sc, 0, 0, NW, NH, 0, 0, NW * P, NH * P); try { bx.filter = 'none'; } catch (e) {}
    x.globalAlpha = .5; x.drawImage(big, BP, BP, n * P, m * P, 0, 0, n * P, m * P); x.globalAlpha = 1;
    const id = bx.getImageData(BP, BP, n * P, m * P), D = id.data, X0 = tx0 * P, Y0 = ty0 * P;
    for (let py = 0; py < m * P; py++) for (let px = 0; px < n * P; px++) {
      const o = (py * n * P + px) * 4, a = D[o + 3] / 255; if (!a) continue;
      const wx = X0 + px, wy = Y0 + py, urban = a < .75;
      // in città il bordo della neve è morbido e a macchie larghe: niente rumore fine, niente scalini
      const nz = urban ? vnz(wx / 30, wy / 30) : vnz(wx / 22, wy / 22) * .65 + vnz(wx / 5, wy / 5) * .35;
      const k = urban ? Math.max(0, Math.min(1, (a + (nz - .5) * .3 - .4) * 4)) : Math.max(0, Math.min(1, (a + nz * .5 - .58) * 6));
      D[o + 3] = Math.round(k * 255 * .88);
    }
    const outc = mk(n * P, m * P); outc.getContext('2d').putImageData(id, 0, 0); x.drawImage(outc, 0, 0);
    x.restore();
    // 4) dettagli: fanghiglia, impronte, pozzanghere, fuliggine, erba secca
    info.forEach(q => {
      const r = rng((q.tx * 7717 + q.ty * 3301) >>> 0), px = q.px, py = q.py;
      if (q.prairie) { for (let k = 0; k < 6; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1, 2, pick(r, ['#8a7a56', '#5e5440'])); if (r() < .25) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 3, 1, 'rgba(210,214,220,.45)'); return; }
      if (q.virgin) { for (let k = 0; k < 3; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1 + Math.floor(r() * 2), 1, pick(r, ['rgba(255,255,255,.7)', 'rgba(176,192,214,.45)'])); return; }
      if (q.road) { for (let k = 0; k < 4; k++) blot(px + Math.floor(r() * P), py + Math.floor(r() * P), 1 + Math.floor(r() * 3), 1, 'rgba(52,48,46,.35)'); if (r() < .18) smear(px + r() * P, py + r() * P, 5 + r() * 6, 2.5 + r() * 2, 'rgba(40,44,52,.38)', r() * 3); }
      else {
        if (NEVE && (q.paved || r() < .4)) for (let k = 0; k < (q.paved ? 4 : 2); k++) { const fx = px + Math.floor(r() * (P - 3)), fy = py + Math.floor(r() * (P - 3)); blot(fx, fy, 1, 2, 'rgba(60,58,60,.42)'); blot(fx + 2, fy + 1, 1, 2, 'rgba(60,58,60,.42)'); }
        if (q.paved && r() < .2) smear(px + r() * P, py + r() * P, 4 + r() * 5, 2 + r() * 3, 'rgba(38,42,50,.34)', r() * 3);
      }
      if (q.sooty && r() < .4) smear(px + r() * P, py + r() * P, 3 + r() * 4, 2 + r() * 2, 'rgba(26,24,26,.38)', r() * 3);
    });
    // 4b) ai piedi dei muri: un'ombra morbida di contatto e un cordone di neve ammucchiata
    info.forEach(q => {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        if (gT(q.tx + dx, q.ty + dy) !== T.BLD || q.road) return;
        const gx0 = dx > 0 ? q.px + P : dx < 0 ? q.px : q.px, gy0 = dy > 0 ? q.py + P : dy < 0 ? q.py : q.py, gx1 = dx > 0 ? q.px + P * .35 : dx < 0 ? q.px + P * .65 : gx0, gy1 = dy > 0 ? q.py + P * .35 : dy < 0 ? q.py + P * .65 : gy0;
        const g = x.createLinearGradient(gx0, gy0, dx ? gx1 : gx0, dy ? gy1 : gy0); g.addColorStop(0, 'rgba(18,18,24,.55)'); g.addColorStop(1, 'rgba(18,18,24,0)');
        x.fillStyle = g; x.fillRect(q.px, q.py, P, P);
      });
    });
    if (!NEVE) return;   // [inverno19] i solchi sono nella neve
    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano
    const X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS, X0m = tx0 * TS, Y0m = ty0 * TS;
    x.lineCap = 'round';
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'vicolo') return;
      const lanes = rd.w >= 6 ? [-rd.w * .25, rd.w * .25] : [0];
      lanes.forEach(lo => [-.55, .55].forEach(wo => {
        x.beginPath(); let on = false;
        for (let k = 0; k < rd.pts.length - 1; k++) {
          const [ax, ay] = rd.pts[k], [bx2, by2] = rd.pts[k + 1], L = Math.hypot(bx2 - ax, by2 - ay) || 1, nx = -(by2 - ay) / L, ny = (bx2 - ax) / L;
          if (ax < X0m - 6 || ax > X1 + 6 || ay < Y0m - 6 || ay > Y1 + 6) { on = false; continue; }
          const px = (ax + nx * (lo + wo) - X0m) * PPM, py = (ay + ny * (lo + wo) - Y0m) * PPM;
          if (!on) { x.moveTo(px, py); on = true; } else x.lineTo(px, py);
        }
        x.lineWidth = 1.6; x.strokeStyle = rd.kind === 'sterrato' ? 'rgba(70,58,46,.5)' : 'rgba(40,38,38,.42)'; x.stroke();
      }));
    });
    junctions().forEach(([jx, jy, jr]) => {   // [inverno16] le svolte vere: da un braccio della strada a quello accanto
      if (jx < X0m - 14 || jx > X1 + 14 || jy < Y0m - 14 || jy > Y1 + 14) return;
      const r = rng((Math.round(jx) * 31 + Math.round(jy) * 17) >>> 0), arms = armsAt(jx, jy, jr);
      x.globalAlpha = .18; x.fillStyle = '#4a4644'; x.beginPath(); x.ellipse((jx - X0m) * PPM, (jy - Y0m) * PPM, jr * .7 * PPM, jr * .7 * PPM, 0, 0, 6.3); x.fill(); x.globalAlpha = 1;
      let drawn = 0;
      for (let i = 0; i < arms.length && drawn < 3; i++) for (let j = i + 1; j < arms.length && drawn < 3; j++) {
        const a = arms[i], b = arms[j], dot = a.ux * b.ux + a.uy * b.uy; if (dot < -.6 || dot > .6 || r() < .35) continue;
        // verso l'interno della curva
        let pax = b.ux - a.ux * dot, pay = b.uy - a.uy * dot, pl = Math.hypot(pax, pay) || 1; pax /= pl; pay /= pl;
        let pbx = a.ux - b.ux * dot, pby = a.uy - b.uy * dot, ql = Math.hypot(pbx, pby) || 1; pbx /= ql; pby /= ql;
        const R = jr + 1.5, lane = Math.min(a.w, b.w) * .25;
        [-.55, .55].forEach(wo => { const lo = lane + wo;
          const sx = jx + a.ux * R + pax * lo, sy = jy + a.uy * R + pay * lo, ex = jx + b.ux * R + pbx * lo, ey = jy + b.uy * R + pby * lo, cx = jx + (pax + pbx) * lo, cy = jy + (pay + pby) * lo;
          x.beginPath(); x.moveTo((sx - X0m) * PPM, (sy - Y0m) * PPM); x.quadraticCurveTo((cx - X0m) * PPM, (cy - Y0m) * PPM, (ex - X0m) * PPM, (ey - Y0m) * PPM);
          x.lineWidth = 1.4; x.strokeStyle = 'rgba(38,36,36,.34)'; x.stroke(); });
        drawn++;
      }
    });
  }
  // rumore di valore liscio (per i contorni della neve)
  function vnz(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const A = th(x0, y0, 333), Bq = th(x0 + 1, y0, 333), C = th(x0, y0 + 1, 333), Dq = th(x0 + 1, y0 + 1, 333); return A + (Bq - A) * u + (C - A) * v + (A - Bq - C + Dq) * u * v - .5; }
  // segnaletica orizzontale: linee e tratteggi lungo le strade asfaltate
  // incroci: dove due strade si toccano niente linee di mezzeria; sulle vie di città strisce pedonali prima dell'incrocio
  let JUNC = null;
  function junctions() {
    if (JUNC) return JUNC; JUNC = [];
    const R = (M.roads || []).filter(r => r.kind !== 'sterrato'), seg = [];
    R.forEach((rd, ri) => { for (let k = 0; k < rd.pts.length - 1; k++) seg.push([ri, rd.pts[k], rd.pts[k + 1], rd.w]); });
    const add = (x, y, r) => { if (!JUNC.some(j => Math.hypot(j[0] - x, j[1] - y) < 4)) JUNC.push([x, y, r]); };
    for (let i = 0; i < seg.length; i++) for (let j = i + 1; j < seg.length; j++) {
      const [ra, a1, a2, wa] = seg[i], [rb, b1, b2, wb] = seg[j]; if (ra === rb) continue;
      const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1], den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-6) continue;
      const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den, u = ((b1[0] - a1[0]) * d1y - (b1[1] - a1[1]) * d1x) / den;
      if (t >= -.05 && t <= 1.05 && u >= -.05 && u <= 1.05) add(a1[0] + d1x * t, a1[1] + d1y * t, Math.max(wa, wb) / 2 + 2);
    }
    // estremità che finiscono dentro un'altra strada (incroci a T)
    R.forEach(rd => [rd.pts[0], rd.pts[rd.pts.length - 1]].forEach(e => { for (const o of R) { if (o === rd) continue; for (let k = 0; k < o.pts.length; k += 1) if (Math.hypot(o.pts[k][0] - e[0], o.pts[k][1] - e[1]) < o.w / 2 + 2) { add(e[0], e[1], Math.max(o.w, rd.w) / 2 + 2); return; } } }));
    return JUNC;
  }
  function armsAt(jx, jy, jr) {   // [inverno16]
    const arms = [];
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'vicolo' || rd.kind === 'sterrato') return; const P = rd.pts; if (!P || P.length < 2) return;
      let best = 1e9, bs = 0, acc = 0; const cum = [0];
      for (let k = 0; k < P.length - 1; k++) { const ax = P[k][0], ay = P[k][1], dx = P[k + 1][0] - ax, dy = P[k + 1][1] - ay, L = Math.hypot(dx, dy) || 1e-6;
        const t = Math.max(0, Math.min(1, ((jx - ax) * dx + (jy - ay) * dy) / (L * L))), d = Math.hypot(ax + dx * t - jx, ay + dy * t - jy);
        if (d < best) { best = d; bs = acc + t * L; } acc += L; cum.push(acc); }
      if (best > rd.w / 2 + 2) return;
      const at = s0 => { for (let k = 0; k < P.length - 1; k++) if (s0 <= cum[k + 1]) { const t = (s0 - cum[k]) / ((cum[k + 1] - cum[k]) || 1); return [P[k][0] + (P[k + 1][0] - P[k][0]) * t, P[k][1] + (P[k + 1][1] - P[k][1]) * t]; } return null; };
      [-1, 1].forEach(sg => { const s1 = bs + sg * (jr + 4); if (s1 < 0 || s1 > acc) return; const q = at(s1); if (!q) return; const dx = q[0] - jx, dy = q[1] - jy, L = Math.hypot(dx, dy); if (L < jr * .6) return;
        const ux = dx / L, uy = dy / L; if (arms.some(o => o.ux * ux + o.uy * uy > .94)) return; arms.push({ ux, uy, w: rd.w }); });
    });
    return arms;
  }
  const nearJ = (x, y, extra) => junctions().some(j => Math.hypot(j[0] - x, j[1] - y) < j[2] + (extra || 0));
  function roadMarks(x, tx0, ty0, n, m) {
    const X0 = tx0 * TS, Y0 = ty0 * TS, X1 = (tx0 + n) * TS, Y1 = (ty0 + m) * TS;
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'sterrato' || rd.kind === 'vicolo') return;
      let acc = 0;
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L = Math.hypot(bx - ax, by - ay);
        if (Math.max(ax, bx) < X0 - 8 || Math.min(ax, bx) > X1 + 8 || Math.max(ay, by) < Y0 - 8 || Math.min(ay, by) > Y1 + 8) { acc += L; continue; }
        const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1), mx = (ax + bx) / 2, my = (ay + by) / 2;
        const inJ = nearJ(mx, my, 0), on = Math.floor(acc / 3) % 2 === 0;
        x.lineWidth = 1;
        if (on && !inJ) {
          // tratteggio bianco consumato: a puntini, con buchi
          const steps = Math.ceil(L * PPM / 1.5), rr = rng(((ax * 73) ^ (ay * 151)) >>> 0);
          for (let q = 0; q < steps; q++) { if (rr() < .28) continue; const t = q / steps, px = (ax + (bx - ax) * t - X0) * PPM, py = (ay + (by - ay) * t - Y0) * PPM; x.fillStyle = `rgba(232,228,214,${.35 + rr() * .45})`; x.fillRect(Math.round(px - 1 + nx), Math.round(py - 1 + ny), 2, 2); }
        }
        acc += L;
      }
      // strisce pedonali alle due teste delle vie di città, appena fuori dall'incrocio
      if (rd.rect) {
        const P = rd.pts, ends = [[P[0], P[1]], [P[P.length - 1], P[P.length - 2]]];
        ends.forEach(([e, f]) => {
          if (!nearJ(e[0], e[1], 1)) return;
          const L = Math.hypot(f[0] - e[0], f[1] - e[1]) || 1, ux = (f[0] - e[0]) / L, uy = (f[1] - e[1]) / L, cx = e[0] + ux * 1.6, cy = e[1] + uy * 1.6;
          if (cx < X0 - 6 || cx > X1 + 6 || cy < Y0 - 6 || cy > Y1 + 6) return;
          x.fillStyle = 'rgba(236,232,220,.85)';
          for (let o = -rd.w / 2 + .4; o < rd.w / 2 - .2; o += .9) { const px = cx - uy * o, py = cy + ux * o; x.save(); x.translate((px - X0) * PPM, (py - Y0) * PPM); x.rotate(Math.atan2(uy, ux)); x.fillRect(-1.1 * PPM, -.22 * PPM, 2.2 * PPM, .44 * PPM); x.restore(); }
        });
      }
    });
  }


  // ---- vegetazione instanziata ----
  const VEG = {};
  // ================= [inverno] KIT DELLA VEGETAZIONE =================
  // Abeti a piani cascanti col bordo frastagliato, chiome grumose, ciuffi d'erba secca che escono dalla neve, rocce spigolose.
  // Un solo materiale (Lambert) con due attributi per vertice: aSnow (quanta neve si posa lì: le facce rivolte in su)
  // e aSway (quanto il vento muove quel punto: più in alto, più si muove). La neve e il vento li fa lo shader.
  const VEGU = { time: { value: 0 } };
  function vegHash(a, b, c) { const s = Math.sin(a * 127.1 + b * 311.7 + (c || 0) * 74.7) * 43758.5453; return s - Math.floor(s); }
  function vegBuilder() {
    const P = [], C = [], S = [], W = [];
    const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // un triangolo: tre punti, tre luminosità, tre quantità di neve, tre quantità di vento
    const tri = (a, b, c, ca, cb, cc, sa, sb, sc, wa, wb, wc) => {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1, up = sstep(.42, .88, ny / L);
      [[a, ca, sa, wa], [b, cb, sb, wb], [c, cc, sc, wc]].forEach(([p, col, sn, w]) => { P.push(p[0], p[1], p[2]); C.push(col, col, col); S.push(sn * up); W.push(w); });
    };
    const build = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setAttribute('aSnow', new THREE.Float32BufferAttribute(S, 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(W, 1));
      g.computeVertexNormals(); return g;
    };
    return { tri, build };
  }
  // abete: altezza 1, raggio 1 alla base; 6 piani che si stringono, bordo a punte lunghe e corte, rami bassi che pendono
  function firGeo() {
    const b = vegBuilder(), N = 13, T = 6;
    for (let k = 0; k < T; k++) {
      const t = k / (T - 1), yb = .09 + k * .135, hg = .27 - t * .07, R = .98 * (1 - t * .8), ap = [0, yb + hg + .05, 0];
      const ring = []; for (let i = 0; i < N; i++) { const a = i / N * 6.2832 + k * .7, rr = R * (i % 2 ? .66 : 1) * (.88 + .24 * vegHash(i, k, 1)); ring.push([Math.cos(a) * rr, yb - (i % 2 ? 0 : .045) - .02 * vegHash(i, k, 2), Math.sin(a) * rr]); }
      for (let i = 0; i < N; i++) {
        const p = ring[i], q = ring[(i + 1) % N], sw = .4 + t * .6;
        b.tri(ap, p, q, 1, .78 + .14 * vegHash(i, k, 3), .78 + .14 * vegHash(i + 1, k, 3), 1, .8, .8, sw, sw * .8, sw * .8);
        b.tri([0, yb + .05, 0], q, p, .3, .42, .42, 0, 0, 0, .2, .2, .2);
      }
    }
    return b.build();
  }
  // chioma grumosa: icosaedro lavorato, scuro sotto, neve sopra
  function blobGeo(detail, amp, seed) {
    const g0 = new THREE.IcosahedronGeometry(1, detail).toNonIndexed(), p = g0.attributes.position, b = vegBuilder();
    const v = i => { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + amp * (vegHash(Math.round(x * 5), Math.round(y * 5 + z * 3), seed) - .5) * 2; return [x * k, y * k * .9, z * k]; };
    for (let i = 0; i < p.count; i += 3) { const A = v(i), B = v(i + 1), C = v(i + 2), br = y => .5 + .5 * Math.max(0, Math.min(1, (y + 1) / 2)); b.tri(A, B, C, br(A[1]), br(B[1]), br(C[1]), 1, 1, 1, Math.max(0, A[1] + 1) * .4, Math.max(0, B[1] + 1) * .4, Math.max(0, C[1] + 1) * .4); }
    return b.build();
  }
  // ciuffo d'erba secca: tre lame incrociate, un po' piegate
  function tuftGeo() {
    const b = vegBuilder();
    for (let k = 0; k < 5; k++) {
      const a = k * 1.2566 + .3, dx = Math.cos(a), dz = Math.sin(a), h = .75 + .5 * vegHash(k, 1, 5), lean = .22 + .2 * vegHash(k, 2, 5), w = .11;
      const p0 = [dx * .05 - dz * w, 0, dz * .05 + dx * w], p1 = [dx * .05 + dz * w, 0, dz * .05 - dx * w], tip = [dx * (.05 + lean), h, dz * (.05 + lean)], mid = [dx * (.05 + lean * .35), h * .55, dz * (.05 + lean * .35)];
      b.tri(p0, p1, mid, .9, .9, 1.4, 0, 0, .1, 0, 0, .35); b.tri(p0, mid, tip, .9, 1.4, 1.8, 0, .1, .3, 0, .35, 1); b.tri(p1, tip, mid, .9, 1.8, 1.4, 0, .3, .1, 0, 1, .35);
    }
    const g = b.build(), nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0); return g;
  }
  // tronco: base che si allarga, corteccia scura in basso
  function trunkGeo() {
    const g = new THREE.CylinderGeometry(.13, .23, 1, 7, 4); g.translate(0, .5, 0); const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i), fl = 1 + Math.max(0, .18 - y) * 3.2 + (vegHash(Math.round(x * 20), Math.round(y * 6), Math.round(z * 20)) - .5) * .18; p.setX(i, x * fl); p.setZ(i, z * fl); const c = .5 + .5 * y; col.push(c, c, c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const n = p.count; g.setAttribute('aSnow', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aSway', new THREE.Float32BufferAttribute(new Float32Array(n), 1)); g.computeVertexNormals(); return g;
  }
  function vegMat() {
    const m = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, vertexColors: true });
    m.onBeforeCompile = sh => {
      sh.uniforms.vTime = VEGU.time;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSnow; attribute float aSway; uniform float vTime; varying float vSnow;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vSnow = aSnow;
          float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .29;
          transformed.x += (sin(vTime * 1.3 + ph) * .05 + sin(vTime * 3.1 + ph * 2.) * .014) * aSway;
          transformed.z += cos(vTime * 1.1 + ph) * .04 * aSway;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSnow;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .89, .94), clamp(vSnow, 0., 1.) * ${NEVE ? '.8' : '0.'});`);
    };
    return m;
  }
  function vegInit(V) {
    V.fir = firGeo(); V.blob = blobGeo(1, .22, 7); V.rockG = blobGeo(0, .3, 3); V.tuft = tuftGeo(); V.trunk = trunkGeo();
    V.vegM = vegMat(); V.trunkM = vegMat(); V.trunkM.color.set('#5a4a3c');
    const tex = (() => { const c = document.createElement('canvas'); c.width = 16; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#e4e0d8'; x.fillRect(0, 0, 16, 64);
      for (let i = 0; i < 16; i++) { x.fillStyle = 'rgba(30,28,30,.8)'; x.fillRect(Math.floor(vegHash(i, 1, 9) * 14), Math.floor(vegHash(i, 2, 9) * 62), 2 + Math.floor(vegHash(i, 3, 9) * 5), 1 + Math.floor(vegHash(i, 4, 9) * 2)); }
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t; })();
    V.barkM = new THREE.MeshLambertMaterial({ color: '#ffffff', map: tex, flatShading: true });
  }
  function vegKit() {
    if (VEG.ok) return VEG; VEG.ok = true;
    VEG.trunk = new THREE.CylinderGeometry(.16, .26, 1, 6); VEG.trunk.translate(0, .5, 0);
    VEG.ball = new THREE.IcosahedronGeometry(1, 0);
    VEG.cone = new THREE.ConeGeometry(1, 1, 7); VEG.cone.translate(0, .5, 0);
    VEG.rock = new THREE.DodecahedronGeometry(1, 0);
    VEG.box = new THREE.BoxGeometry(1, 1, 1); VEG.box.translate(0, .5, 0);
    VEG.trunkM = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: .95 });
    VEG.leafM = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true });
    VEG.rockM = new THREE.MeshStandardMaterial({ color: '#9a9ca4', roughness: 1, flatShading: true });
    VEG.cactusM = new THREE.MeshLambertMaterial({ color: '#5a8a4a', flatShading: true });
    vegInit(VEG);
    return VEG;
  }
  // ================= [monte] IL BOSCO VERO: modelli del kit Natura (Quaternius, CC0) =================
  // Vicino alla camera ogni casella d'albero diventa un albero-modello (pini larici, lecci e ulivi contorti, castagni e faggi spogli),
  // le pareti si coprono di massi, la fiumara di ciottoli, le terrazze di muri a secco. Lontano restano gli alberi semplici.
  // Ogni albero sta su una casella TREE: si abbatte e resta il ceppo.
  const NAT = { ok: false, models: {}, mats: {} };
  // le chiome tra la camera e il giocatore si aprono (retinatura): il giocatore nel bosco si vede sempre
  const NATU = { pl: { value: new THREE.Vector3(0, -999, 0) }, cm: { value: new THREE.Vector3(0, 100, 0) } };
  function natMat(map, leafy, tint) {
    const k = (map ? map.uuid : 'x') + (leafy ? 'L' : 'B') + (tint || ''); if (NAT.mats[k]) return NAT.mats[k];
    if (map) { map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.needsUpdate = true; }
    const m = new THREE.MeshLambertMaterial({ map, color: tint || '#ffffff', alphaTest: leafy ? .5 : 0, side: leafy ? THREE.DoubleSide : THREE.FrontSide });
    m.onBeforeCompile = sh => {
      sh.uniforms.vTime = VEGU.time; sh.uniforms.uPl = NATU.pl; sh.uniforms.uCm = NATU.cm;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSnow; attribute float aSway; uniform float vTime; varying float vSnow; varying vec3 vWP;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vSnow = aSnow;
          float ph = instanceMatrix[3].x * .37 + instanceMatrix[3].z * .29;
          transformed.x += (sin(vTime * 1.3 + ph) * .05 + sin(vTime * 3.1 + ph * 2.) * .014) * aSway;
          transformed.z += cos(vTime * 1.1 + ph) * .04 * aSway;`).replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
          vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.)).xyz;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSnow; varying vec3 vWP; uniform vec3 uPl; uniform vec3 uCm;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .89, .94), clamp(vSnow, 0., 1.) * ${NEVE ? '.6' : '0.'});
          { vec3 ab = uCm - uPl; float t = clamp(dot(vWP - uPl, ab) / dot(ab, ab), 0., 1.); float d = length(vWP - (uPl + ab * t));
            float open = (1. - smoothstep(1.6, 3.4, d)) * step(.04, t) * step(vWP.y, uPl.y + 30.) * step(uPl.y + .9, vWP.y);
            vec2 q = floor(gl_FragCoord.xy); float dth = fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453);
            if (open > dth * .9 + .1) discard; }`);
    };
    NAT.mats[k] = m; return m;
  }
  // un modello del kit -> pezzi (geometria nello spazio del modello + materiale), con neve sulle facce in su e ondeggiare in alto
  function natModel(name, snowK) {
    if (NAT.models[name] !== undefined) return NAT.models[name];
    if (name === '__ceppo') { const bark = natModel('Pine_1'); const geo = new THREE.CylinderGeometry(.28, .38, .5, 9); geo.translate(0, .25, 0); const top = new THREE.CircleGeometry(.28, 9); top.rotateX(-Math.PI / 2); top.translate(0, .5, 0);
      const mkp = (g, mat) => { const c = g.attributes.position.count; g.setAttribute('aSnow', new THREE.BufferAttribute(new Float32Array(c), 1)); g.setAttribute('aSway', new THREE.BufferAttribute(new Float32Array(c), 1)); return { geo: g, mat }; };
      return (NAT.models[name] = { parts: [mkp(geo, bark ? bark.parts.find(q => !q.leafy).mat : natMat(null, false, '#6a5040')), mkp(top, natMat(null, false, '#d8b888'))], top: .5 }); }
    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/' + name)) return (NAT.models[name] = null);
    const g = Kit.get('natura/' + name); g.updateMatrixWorld(true); const parts = []; let top = 0;
    g.traverse(o => { if (!o.isMesh) return; const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingBox(); top = Math.max(top, geo.boundingBox.max.y); parts.push({ geo, src: o.material }); });
    parts.forEach(p => {
      const geo = p.geo, n = geo.attributes.normal, pos = geo.attributes.position, cnt = pos.count, sn = new Float32Array(cnt), sw = new Float32Array(cnt);
      const leafy = !!(p.src && p.src.map && /Lea|Leaf|Grass/i.test((p.src.name || '') + (p.src.map.name || '')));
      for (let i = 0; i < cnt; i++) { const ny = n ? n.getY(i) : 1, y = pos.getY(i); sn[i] = Math.max(0, ny - .55) * 1.4 * (snowK === undefined ? 1 : snowK) * (leafy ? .25 + .35 * (y / (top || 1)) : .8); sw[i] = Math.max(0, y - top * .35) / (top || 1) * (leafy ? 1.6 : .6); }
      geo.setAttribute('aSnow', new THREE.BufferAttribute(sn, 1)); geo.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
      p.leafy = leafy; p.mat = natMat(p.src && p.src.map, leafy);
    });
    return (NAT.models[name] = { parts, top });
  }
  // scelta dell'albero per la casella: quota, segni del terreno, zona
  const NM = { pine: ['Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5'], oak: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5'], olive: ['TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5'], bare: ['DeadTree_1', 'DeadTree_2', 'DeadTree_3', 'DeadTree_4', 'DeadTree_5'] };
  function natTree(tx, ty, r) {
    const W0 = M.world, i = ty * G.GW + tx, f = W0 && W0.feat ? W0.feat[i] : 0, MF = (W0 && W0.MF) || {}, e = M.elev[i], z = zoneT(tx, ty), q = r();
    if (f & MF.TERR) return [pick(r, NM.olive), .3 + r() * .1];
    if (f & MF.ALTO) return q < .82 ? [pick(r, NM.pine), .8 + r() * .35] : [pick(r, NM.bare), .42 + r() * .12];
    if (e > 24) return q < .55 ? [pick(r, NM.bare), .34 + r() * .1] : ['Pine_5', .7 + r() * .2];
    if (z === ZN.DESERTO) return [pick(r, NM.bare), .3 + r() * .1];
    if (z === ZN.CITTA) return [pick(r, NM.oak), .62 + r() * .15];
    if (e < 5) return q < .45 ? [pick(r, NM.olive), .28 + r() * .1] : q < .8 ? [pick(r, NM.oak), .62 + r() * .2] : [pick(r, NM.pine), .8 + r() * .3];
    if (e < 15) return q < .38 ? [pick(r, NM.oak), .66 + r() * .22] : q < .72 ? [pick(r, NM.bare), .4 + r() * .14] : [pick(r, NM.pine), .85 + r() * .3];
    return q < .55 ? [pick(r, NM.pine), .85 + r() * .35] : q < .85 ? [pick(r, NM.bare), .42 + r() * .12] : [pick(r, NM.oak), .7 + r() * .2];
  }
  const nM4 = new THREE.Matrix4(), nQ = new THREE.Quaternion(), nE = new THREE.Euler(), nV = new THREE.Vector3(), nS = new THREE.Vector3(), nC = new THREE.Color();
  function buildNat(tx0, ty0, n, m) {
    const grp = new THREE.Group(); grp.name = 'nat';
    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/Pine_1')) return grp;
    const T = G.T, W0 = M.world, F = W0 && W0.feat, MF = (W0 && W0.MF) || {}, orig = W0 && W0.grid;
    const B = new Map();   // nome -> [{x,y,z,s,ry,rx,rz,sy,col}]
    const add = (name, x, y, z, s, ry, o) => { if (!natModel(name)) return; let a = B.get(name); if (!a) B.set(name, a = []); a.push(Object.assign({ x, y, z, s, ry, rx: 0, rz: 0, sy: 1, col: null }, o || {})); };
    const STONE = ['#8a8680', '#7c7872', '#9a948a', '#6e6a66'];
    // composizione come in un bosco vero: macchie fitte e radure, sottobosco ai piedi degli alberi, margini morbidi,
    // massi con le felci attorno, ciottoli ai bordi dei sentieri, funghi sotto gli alberi secchi
    const isT = (a, b) => gT(a, b) === T.TREE, nearT = (a, b) => { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && isT(a + dx, b + dy)) c++; return c; };
    const isTrail = (a, b) => { if (a < 0 || b < 0 || a >= G.GW || b >= G.GH) return false; const k = b * G.GW + a; return RW[k] > 0 && gT(a, b) === T.DIRT; };
    const thick = (x, z) => .5 + vnz(x / 26, z / 26) * .7 + vnz(x / 9, z / 9) * .3;   // 0..1: quanto è fitta la macchia qui
    const LEAF = ['#e8f0e0', '#f4f2e4', '#e0ead8', '#fff8e8'], ROCKC = ['#a8a8a2', '#9c9c96', '#b4b2aa'];
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx, v = gT(tx, ty), f = F ? F[ii] : 0, r = rng((tx * 50411 + ty * 81239) >>> 0);
      const cx = tx * TS + .6 + r() * .8, cz = ty * TS + .6 + r() * .8, th = thick(tx * TS, ty * TS), nt = nearT(tx, ty);
      const under = (x, z, s0) => { const q = r(); add(q < .45 ? 'Fern_1' : q < .75 ? 'Bush_Common' : q < .9 ? 'Grass_Wispy_Tall' : 'Plant_1_Big', x, 0, z, s0 * (q < .45 ? .32 : q < .75 ? .55 : .9), r() * 6.28, { ground: true, col: pick(r, LEAF) }); };
      if (v === T.TREE) {
        const [name, s] = natTree(tx, ty, r), big = (th > .55 ? 1.05 : th < .35 ? .82 : .94) * .78;
        add(name, cx, groundH(cx, cz) - .15, cz, s * big * (.9 + r() * .2), r() * 6.28, { rx: (r() - .5) * .06, rz: (r() - .5) * .06, col: pick(r, LEAF) });
        const k = (th > .5 ? 2 : 1) + (nt < 5 ? 1 : 0); for (let q = 0; q < k; q++) if (r() < .55) under(tx * TS + r() * 2, ty * TS + r() * 2, .8 + r() * .5);
        if (/DeadTree/.test(name) && r() < .45) for (let q = 0; q < 3; q++) add(r() < .7 ? 'Mushroom_Common' : 'Mushroom_Laetiporus', cx + (r() - .5) * 1.2, 0, cz + (r() - .5) * 1.2, .5 + r() * .5, r() * 6.28, { ground: true, col: '#f0e8dc' });
      } else if (orig && orig[ii] === T.TREE) {
        add('__ceppo', cx, groundH(cx, cz) - .05, cz, 1, r() * 6.28, { col: '#c8b8a0' });
        if (r() < .5) add('Bush_Common', tx * TS + r() * 2, 0, ty * TS + r() * 2, .4, r() * 6.28, { ground: true, col: pick(r, LEAF) });
      } else if (v === T.CLIFF) {
        if (f & 512) continue;
        if (r() < .2) { const x = tx * TS + .4 + r() * 1.2, z = ty * TS + .4 + r() * 1.2, s = .4 + r() * .35; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), x, groundH(x, z) - .6 * s, z, s, r() * 6.28, { sy: 1 + r() * .5, col: pick(r, ROCKC) }); }
      } else if (v === T.ROCK) {
        if (f & MF.DITA) { for (let q = 0; q < 2; q++) { const x = tx * TS + .4 + r() * 1.2, z = ty * TS + .4 + r() * 1.2, s = .8 + r() * .5; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), x, groundH(x, z) - 1.2 * s, z, s, r() * 6.28, { sy: 1.6 + r(), col: pick(r, ['#c89a80', '#b88a70', '#d0a688']) }); } }
        else if (r() < .14) { const s = .3 + th * .4 + r() * .3; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .35 * s, cz, s, r() * 6.28, { col: pick(r, ROCKC) }); if (r() < .6) under(cx + 1.2, cz + (r() - .5) * 2, .7); }
      } else if (v === T.GRAVEL) {
        for (let q = 0; q < 2; q++) { const x = tx * TS + r() * 2, z = ty * TS + r() * 2; add(pick(r, ['Pebble_Round_1', 'Pebble_Round_3', 'Pebble_Square_2', 'Pebble_Square_4']), x, groundH(x, z) - .02, z, 1.6 + r() * 2, r() * 6.28, { col: pick(r, ['#f0ece4', '#e4e0d8', '#d8d4cc']) }); }
        if (r() < .08) { const s = .5 + r() * .6; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .3 * s, cz, s, r() * 6.28, { col: '#d0ccc4' }); }
      } else if (v === T.SHRUB || v === T.GRASS) {
        const edge = nt > 0, z0 = zoneT(tx, ty);
        if (z0 === ZN.DESERTO || z0 === ZN.CITTA) { }
        else if (edge && r() < (v === T.SHRUB ? .8 : .55)) { under(cx, cz, 1); if (r() < .4) add('Grass_Wispy_Tall', tx * TS + r() * 2, 0, ty * TS + r() * 2, .9 + r() * .4, r() * 6.28, { ground: true, col: '#f0e4c0' }); }
        else if (v === T.SHRUB && th > .45 && r() < .5) add('Bush_Common', cx, groundH(cx, cz) - .1, cz, .55 + r() * .3, r() * 6.28, { col: pick(r, LEAF) });
        else if ((f & (MF.TERR | MF.ALTO | MF.BORGO) || M.elev[ii] > 3) && r() < .12) add('Grass_Wispy_Short', cx, groundH(cx, cz) - .05, cz, 1 + r() * .4, r() * 6.28, { col: '#f0e4c0' });
      }
      if (v !== T.DIRT && v !== T.CLIFF && v !== T.TREE && r() < .35 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isTrail(tx + dx, ty + dy))) { const x = tx * TS + r() * 2, z = ty * TS + r() * 2; add(pick(r, ['Pebble_Round_1', 'Pebble_Square_2', 'Pebble_Round_3']), x, groundH(x, z) - .02, z, 1.4 + r(), r() * 6.28, { col: '#d8d4cc' }); }
      if (f & 256 && v !== T.CLIFF) for (let q = 0; q < 3; q++) { const x = tx * TS + .5 + q * .5, z = ty * TS + .5 + q * .5; add('RockPath_Square_Small_1', x, groundH(x, z) - .05, z, .9, r() * .4, { col: '#b4b0a8' }); }
    }
    // muri a secco delle terrazze: una fila di pietre piatte sul ciglio (la parete sotto è dipinta a pietra)
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, ii = ty * G.GW + tx; if (!F || !(F[ii] & 512) || gT(tx, ty) !== T.CLIFF) continue;
      let best = null, bd = 1.1; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nn = (ty + dy) * G.GW + tx + dx, d = M.elev[ii] - M.elev[nn]; if (d > bd) { bd = d; best = [dx, dy]; } }
      if (!best) continue; const r = rng((tx * 9301 + ty * 4933) >>> 0);
      for (let q = 0; q < 3; q++) { const u = (q + .5) / 3 - .5, x = (tx + .5 + best[0] * .35) * TS + (best[0] ? 0 : u * TS), z = (ty + .5 + best[1] * .35) * TS + (best[1] ? 0 : u * TS); add('Pebble_Square_' + (r() < .5 ? 2 : 4), x, groundH(x, z) - .05, z, 2.6 + r() * .8, (best[0] ? Math.PI / 2 : 0) + (r() - .5) * .3, { sy: 1.6, col: pick(r, ['#c8c2b6', '#b8b2a6', '#d4cec2']) }); }
    }
    for (const [name, arr] of B) {
      const mdl = natModel(name); if (!mdl) continue;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      arr.forEach(o => { if (o.ground) o.y = groundH(o.x, o.z) - .05; x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + mdl.top * o.s * o.sy); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); });
      const sph = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 10);
      const tree = /Tree|Pine/.test(name);
      mdl.parts.forEach(p => {
        const g2 = p.geo.clone(); g2.boundingSphere = sph;
        const im = new THREE.InstancedMesh(g2, p.mat, arr.length);
        arr.forEach((o, k) => { nE.set(o.rx, o.ry, o.rz, 'YXZ'); nQ.setFromEuler(nE); nV.set(o.x, o.y, o.z); nS.set(o.s, o.s * o.sy, o.s); nM4.compose(nV, nQ, nS); im.setMatrixAt(k, nM4); im.setColorAt(k, nC.set(o.col || '#ffffff')); });
        im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = tree && !LOWQ.on; im.receiveShadow = !tree; grp.add(im);
      });
    }
    return grp;
  }
  // ================= [monte] SOTTO TERRA E SOPRA IL VUOTO =================
  // Sotto terra: la superficie sparisce, restano i cunicoli scavati (pavimento, pareti di terra o di roccia, puntelli),
  // le stanze col loro arredo, la lanterna. In superficie: le botole, gli imbocchi nelle pareti, i pozzi delle grotte, il Ponte del Diavolo.
  const UGR = { key: null, grp: null, lights: [], prev: null, surf: null, surfRev: -1, lantern: null };
  const ugMats = {};
  const ugM = (c, o) => ugMats[c + JSON.stringify(o || {})] || (ugMats[c + JSON.stringify(o || {})] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 1, metalness: 0, flatShading: true }, o || {})));
  function ugTex(kind) {
    if (ugMats['tex' + kind]) return ugMats['tex' + kind];
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(kind === 'roccia' ? 77 : 78);
    x.fillStyle = kind === 'roccia' ? '#5a5652' : '#4a3a2c'; x.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 160; i++) { x.fillStyle = kind === 'roccia' ? pick(r, ['#6a6662', '#4a4642', '#76706a', '#3e3a38']) : pick(r, ['#5a4634', '#3e3024', '#664e3a', '#2e241c', '#7a6a58']); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
    if (kind === 'roccia') for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(20,18,18,.5)'; x.fillRect(0, Math.floor(r() * 32), 32, 1); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return (ugMats['tex' + kind] = new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0 }));
  }
  // il toro inciso nella Grotta del Romito, e l'affresco sbiadito dell'eremo
  function ugPicture(kind) {
    const c = mk(64, 40), x = c.getContext('2d'); x.fillStyle = kind === 'toro' ? '#6e6862' : '#8a7e6a'; x.fillRect(0, 0, 64, 40);
    if (kind === 'toro') {
      x.strokeStyle = '#e8e2d6'; x.lineWidth = 1.4; x.beginPath();
      x.moveTo(10, 22); x.bezierCurveTo(14, 12, 30, 10, 44, 13); x.bezierCurveTo(50, 12, 54, 14, 55, 18); x.lineTo(58, 16); x.moveTo(55, 18); x.lineTo(56, 24); x.lineTo(50, 26);
      x.bezierCurveTo(44, 27, 30, 28, 18, 27); x.lineTo(16, 34); x.moveTo(22, 27); x.lineTo(21, 35); x.moveTo(42, 27); x.lineTo(43, 35); x.moveTo(48, 26); x.lineTo(50, 34);
      x.moveTo(10, 22); x.lineTo(6, 28); x.moveTo(52, 15); x.quadraticCurveTo(56, 6, 62, 8); x.moveTo(50, 14); x.quadraticCurveTo(50, 7, 55, 4); x.stroke();
      x.strokeStyle = 'rgba(232,226,214,.35)'; x.beginPath(); x.moveTo(26, 15); x.lineTo(30, 24); x.moveTo(34, 14); x.lineTo(36, 23); x.stroke();
    } else {
      x.fillStyle = '#5a6a8a'; x.fillRect(18, 4, 28, 34); x.fillStyle = '#d8c070'; x.beginPath(); x.arc(32, 12, 6, 0, 6.3); x.fill();
      x.fillStyle = '#c8a888'; x.beginPath(); x.arc(32, 13, 3.4, 0, 6.3); x.fill(); x.fillStyle = '#8a3a2a'; x.fillRect(26, 18, 12, 18);
      x.fillStyle = 'rgba(138,126,106,.55)'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * 64, Math.random() * 40, 3, 2);
    }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; return new THREE.MeshBasicMaterial({ map: t, transparent: kind === 'toro', opacity: 1 });
  }
  function buildUG(L) {
    const grp = new THREE.Group(), GWd = G.GW, T = G.T, has = (tx, ty) => tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && L.ug[ty * GWd + tx] > 0;
    const quad = [];   // pavimento: una lastra per casella, inclinata coi vicini
    const floorV = (tx, ty, cx, cy) => { let s = 0, c = 0; for (const [a, b] of [[tx + cx - 1, ty + cy - 1], [tx + cx, ty + cy - 1], [tx + cx - 1, ty + cy], [tx + cx, ty + cy]]) if (has(a, b)) { s += L.fl[b * GWd + a]; c++; } return c ? s / c : L.fl[ty * GWd + tx]; };
    const fpos = [], fuv = [], wposR = [], wposT = [], wuvR = [], wuvT = [];
    const wallQuad = (arr, uv, x0, z0, x1, z1, y0, y1) => { arr.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0); const L2 = Math.hypot(x1 - x0, z1 - z0) / 2, H2 = (y1 - y0) / 2; uv.push(0, 0, L2, 0, L2, H2, 0, 0, L2, H2, 0, H2); };
    const props = [], rocks = [];
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const i = ty * GWd + tx; if (!L.ug[i]) continue;
      const x0 = tx * TS, z0 = ty * TS, x1 = x0 + TS, z1 = z0 + TS, h00 = floorV(tx, ty, 0, 0), h10 = floorV(tx, ty, 1, 0), h01 = floorV(tx, ty, 0, 1), h11 = floorV(tx, ty, 1, 1);
      fpos.push(x0, h00, z0, x0, h01, z1, x1, h11, z1, x0, h00, z0, x1, h11, z1, x1, h10, z0); fuv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
      const rockK = (gT(tx, ty) === T.ROCK || gT(tx, ty) === T.CLIFF || L.kind[i] === 1), arr = rockK ? wposR : wposT, uv = rockK ? wuvR : wuvT, f = L.fl[i];
      // pareti dove finisce lo scavo; quelle verso la camera sono basse (si vede dentro)
      const cy2 = Math.cos(cam.yaw), sy2 = Math.sin(cam.yaw);
      [[0, -1, x0, z0, x1, z0], [0, 1, x1, z1, x0, z1], [-1, 0, x0, z1, x0, z0], [1, 0, x1, z0, x1, z1]].forEach(([dx, dy, a, b, c2, d]) => {
        if (has(tx + dx, ty + dy)) return; const P = L.portals.find(P => P.kind === 'imbocco' && P.u[0] === tx && P.u[1] === ty && P.s[0] === tx + dx && P.s[1] === ty + dy); if (P) return;
        const toCam = dx * sy2 + dy * cy2 > .3, top = f + (toCam ? .55 : 2.7);
        wallQuad(arr, uv, a, b, c2, d, f - .2, top);
        if (!toCam && hash2i(tx * 3 + dx, ty * 3 + dy) < .35) rocks.push([(a + c2) / 2 - dx * .2, f + .3, (b + d) / 2 - dy * .2]);
      });
      // puntelli di legno nei cunicoli scavati a mano, ogni tanto
      if (L.kind[i] === 2 && (tx + ty) % 3 === 0) props.push([x0 + 1, f, z0 + 1]);
    }
    const mkGeo = (pos, uv) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; };
    if (fpos.length) { const m = new THREE.Mesh(mkGeo(fpos, fuv), ugTex('terra')); m.receiveShadow = true; grp.add(m); }
    if (wposT.length) { const m = new THREE.Mesh(mkGeo(wposT, wuvT), ugTex('terra')); m.material.side = THREE.DoubleSide; grp.add(m); }
    if (wposR.length) { const m = new THREE.Mesh(mkGeo(wposR, wuvR), ugTex('roccia')); m.material.side = THREE.DoubleSide; grp.add(m); }
    const wood = ugM('#6a4a30');
    props.forEach(([x, y, z]) => { const g = new THREE.Group(); [[-.85, 0], [.85, 0]].forEach(([dx]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.3, .16), wood); b.position.set(dx, 1.15, 0); g.add(b); }); const t = new THREE.Mesh(new THREE.BoxGeometry(1.9, .16, .2), wood); t.position.y = 2.3; g.add(t); g.position.set(x, y, z); g.rotation.y = hash2i(x, z) < .5 ? 0 : Math.PI / 2; grp.add(g); });
    rocks.forEach(([x, y, z]) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(.35 + hash2i(x, z) * .3, 0), ugM('#55504a')); m.position.set(x, y - .1, z); grp.add(m); });
    // scale nei pozzi e nelle botole
    L.portals.forEach(P => {
      if (P.kind !== 'botola' && P.kind !== 'pozzo') return; const i = P.u[1] * GWd + P.u[0], f = L.fl[i], top = M.elev[i] + .2, x = (P.u[0] + .5) * TS, z = (P.u[1] + .25) * TS;
      const g = new THREE.Group(); [-.3, .3].forEach(dx => { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, top - f, .08), wood); b.position.set(dx, (top - f) / 2, 0); g.add(b); });
      for (let y = .3; y < top - f; y += .35) { const s = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .06), wood); s.position.set(0, y, 0); g.add(s); }
      g.position.set(x, f, z); grp.add(g);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, top - f + .2, 10, 1, true), ugM('#2a2420', { side: THREE.BackSide })); sh.position.set(x, (top + f) / 2, z + .3); grp.add(sh);
    });
    // stanze: arredo secondo cosa sono
    L.rooms.forEach(R => {
      const g = new THREE.Group(); g.position.set(R.x, R.f, R.y);
      if (R.deco === 'toro' || R.deco === 'eremo') {
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), ugPicture(R.deco)); pic.position.set(0, 1.4, -1.85); g.add(pic);
        if (R.deco === 'eremo') { const alt = new THREE.Mesh(new THREE.BoxGeometry(1.4, .9, .6), ugM('#8a8276')); alt.position.set(0, .45, -1.4); g.add(alt); for (let k = 0; k < 5; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .22, 6), new THREE.MeshBasicMaterial({ color: '#f0e6c8' })); c.position.set(-.5 + k * .25, 1, -1.35); g.add(c); } const cr = new THREE.Mesh(new THREE.BoxGeometry(.06, .7, .06), wood); cr.position.set(0, 2.4, -1.8); g.add(cr); const cr2 = new THREE.Mesh(new THREE.BoxGeometry(.4, .06, .06), wood); cr2.position.set(0, 2.55, -1.8); g.add(cr2); }
        else { for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry(.25, 0), ugM('#d8d0c0')); b.position.set(-.8 + k * .5, .1, -.6 + k * .2); b.scale.set(1, .4, 2); g.add(b); } }
        UGR.lights.push([R.x, R.f + 1.6, R.y, R.deco === 'eremo' ? '#ffb060' : '#9ab0d0']);
      } else if (R.deco === 'covo') {
        const cot = new THREE.Mesh(new THREE.BoxGeometry(.8, .4, 1.9), ugM('#5a5a3a')); cot.position.set(-1.6, .2, 0); g.add(cot);
        const box = new THREE.Mesh(new THREE.BoxGeometry(.9, .6, .6), wood); box.position.set(1.5, .3, -1.4); g.add(box);
        const tb = new THREE.Mesh(new THREE.BoxGeometry(1, .08, .7), wood); tb.position.set(1.4, .75, .9); g.add(tb);
        UGR.lights.push([R.x + 1.4, R.f + 1.2, R.y + .9, '#ffb060']);
      }
      grp.add(g);
    });
    return grp;
  }
  const hash2i = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  // il passaggio sotto terra: come per gli interni, si nasconde il mondo di sopra e si accende la lanterna
  function ugPass(st) {
    const p = st.player, L = st.lv, on = !!(p.lv && p.lv.k === 'ug' && L);
    const key = on ? L.rev + ':' + (Math.round(((cam.yaw % 6.2832) + 6.2832) % 6.2832 / (Math.PI / 2)) & 3) : null;
    if (key !== UGR.key) {
      if (UGR.grp) { scene.remove(UGR.grp); UGR.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); }); UGR.grp = null; }
      UGR.lights.length = 0; if (UGR.lightObjs) UGR.lightObjs.forEach(l => scene.remove(l)); UGR.lightObjs = [];
      UGR.key = key;
      if (on) { UGR.grp = buildUG(L); scene.add(UGR.grp); UGR.lightObjs = UGR.lights.map(([x, y, z, c]) => { const l = new THREE.PointLight(c, 1.4, 9, 1.6); l.position.set(x, y, z); scene.add(l); return l; }); }
      else if (UGR.was) scene.children.forEach(o => { if (o.userData.__hidUG) { o.visible = true; o.userData.__hidUG = false; } });
    }
    UGR.was = on;
    if (!UGR.lantern) { UGR.lantern = new THREE.PointLight('#ffc070', 0, 11, 1.5); scene.add(UGR.lantern); }
    if (!on) { UGR.lantern.intensity = 0; return false; }
    hemi.intensity *= .12; moon.intensity *= .05; fillAmb.intensity *= .25;
    const pg = dyn.people.__player, h = Livelli.heightOf(st, p);
    UGR.lantern.position.set(p.x + Math.cos(p.face) * .4, h + 1.7, p.y + Math.sin(p.face) * .4); UGR.lantern.intensity = 1.6 + Math.sin(st.clock * 9) * .06;
    scene.children.forEach(o => { if (o === UGR.grp || o === pg || o === UGR.lantern || UGR.lightObjs.includes(o)) return; if (o.isLight && o !== moon && o !== hemi && o !== fillAmb) { if (o.visible) { o.visible = false; o.userData.__hidUG = true; } return; } if (o.isLight) return; if (o.visible) { o.visible = false; o.userData.__hidUG = true; } });
    UGR.grp.visible = true; if (pg) pg.visible = true;
    return true;
  }
  // in superficie: botole, imbocchi, pozzi (si rifanno quando cambia lo scavo) e il Ponte del Diavolo (una volta sola)
  function surfacePortals(st) {
    const L = st.lv; if (!L || L.rev === UGR.surfRev) return; UGR.surfRev = L.rev;
    if (UGR.surf) { scene.remove(UGR.surf); UGR.surf.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const g = new THREE.Group(), wood = ugM('#6a4a30'), dark = new THREE.MeshBasicMaterial({ color: '#050404' }), rockM = ugM('#6a6460');
    L.portals.forEach(P => {
      const [sx, sy] = P.s, cx = (sx + .5) * TS, cz = (sy + .5) * TS;
      if (P.kind === 'botola') { const y = groundH(cx, cz); const h = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, .07, .3), wood); b.position.set(0, .04, -.48 + k * .32); h.add(b); } const ring = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 4, 8), ugM('#3a3a3a', { metalness: .6 })); ring.rotation.x = Math.PI / 2; ring.position.set(.4, .09, 0); h.add(ring); const sn = new THREE.Mesh(new THREE.BoxGeometry(.9, .03, .7), ugM('#dfe3e8')); sn.position.set(-.15, .09, .1); h.add(sn); h.position.set(cx, y, cz); h.rotation.y = hash2i(sx, sy) * 6; g.add(h); }
      else if (P.kind === 'pozzo') { const y = groundH(cx, cz); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.32, 0), rockM); s.position.set(cx + Math.cos(a) * .95, y + .15, cz + Math.sin(a) * .95); g.add(s); } const hole = new THREE.Mesh(new THREE.CircleGeometry(.8, 12), dark); hole.rotation.x = -Math.PI / 2; hole.position.set(cx, y + .05, cz); g.add(hole); const lt = new THREE.Group(); [-.3, .3].forEach(dx => { const b = new THREE.Mesh(new THREE.BoxGeometry(.07, 1.2, .07), wood); b.position.set(dx, .5, 0); lt.add(b); }); lt.position.set(cx, y, cz - .5); g.add(lt); }
      else if (P.kind === 'imbocco') {
        const [ux, uy] = P.u, dx = ux - sx, dy = uy - sy, ex = (sx + .5 + dx * .5) * TS, ez = (sy + .5 + dy * .5) * TS, y = M.elev[sy * G.GW + sx];
        const m = new THREE.Group(); m.position.set(ex - dx * .15, y, ez - dy * .15); m.rotation.y = Math.atan2(-dx, -dy);
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), dark); hole.position.set(0, 1.1, -.02); m.add(hole);
        if (P.nat) { for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI, s = new THREE.Mesh(new THREE.DodecahedronGeometry(.45 + hash2i(k, sx) * .3, 0), rockM); s.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.5 + .4, .1); m.add(s); } }
        else { [[-.85, 1.15], [.85, 1.15]].forEach(([x, yy]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.18, 2.3, .18), wood); b.position.set(x, yy, .05); m.add(b); }); const t = new THREE.Mesh(new THREE.BoxGeometry(2, .2, .22), wood); t.position.set(0, 2.3, .05); m.add(t); }
        g.add(m);
      }
    });
    scene.add(g); UGR.surf = g;
  }
  function buildBridges() {
    const W0 = M.world; if (!W0 || !W0.BRIDGES || typeof Livelli === 'undefined') return;
    const wood = sm('#6a4c34', { roughness: 1 }), woodD = sm('#4a3424', { roughness: 1 }), rope = sm('#8a7a5a', { roughness: 1 }), snow = NEVE ? sm('#dde2e8', { roughness: 1 }) : NOSNOW;
    Livelli.BR.forEach(B => {
      const g = new THREE.Group(), n = Math.ceil(B.len / .45), ang = Math.atan2(B.uy, B.ux), px = -B.uy, pz = B.ux;
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = B.a[0] + B.ux * B.len * t, z = B.a[1] + B.uy * B.len * t, y = Livelli.deckH(B, t) - .08;
        const pl = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, B.w + .2), hash2i(k, 3) < .15 ? woodD : wood); pl.position.set(x, y, z); pl.rotation.y = -ang; pl.rotation.x = (hash2i(k, 5) - .5) * .06; g.add(pl);
        if (hash2i(k, 7) < .5) { const sn = new THREE.Mesh(new THREE.BoxGeometry(.3, .03, B.w * .6), snow); sn.position.set(x, y + .05, z + (hash2i(k, 9) - .5) * .4); sn.rotation.y = -ang; g.add(sn); }
        if (k % 4 === 0) [-1, 1].forEach(sd => { const post = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.05, .08), woodD); post.position.set(x + px * sd * (B.w / 2 + .05), y + .52, z + pz * sd * (B.w / 2 + .05)); g.add(post); });
      }
      // corrimano di corda: segue il ponte con la sua curva
      [-1, 1].forEach(sd => { for (const hh of [1.02, .6]) { const pts = []; for (let k = 0; k <= 24; k++) { const t = k / 24; pts.push(new THREE.Vector3(B.a[0] + B.ux * B.len * t + px * sd * (B.w / 2 + .05), Livelli.deckH(B, t) + hh, B.a[1] + B.uy * B.len * t + pz * sd * (B.w / 2 + .05))); } const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .03, 4), rope); g.add(tube); } });
      // le ancore ai due capi
      [[B.a, -1], [B.b, 1]].forEach(([q, s2]) => [-1, 1].forEach(sd => { const y = groundH(q[0], q[1]); const st2 = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.6, .3), woodD); st2.position.set(q[0] + px * sd * (B.w / 2 + .2) - B.ux * s2 * .2, y + .8, q[1] + pz * sd * (B.w / 2 + .2) - B.uy * s2 * .2); g.add(st2); }));
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(g);
    });
  }
  const vM4 = new THREE.Matrix4(), vQ = new THREE.Quaternion(), vE = new THREE.Euler(), vV = new THREE.Vector3(), vS = new THREE.Vector3(), vC = new THREE.Color();
  const LOWQ = { on: false };
  function buildVeg(tx0, ty0, n, m) {
    const K = vegKit(), T = G.T, L0 = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] }, LT = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] };
    let L = L0;
    const put = (arr, x, y, z, sx, sy, sz, ry, col, rx) => arr.push({ x, y, z, sx, sy, sz, ry, col, rx: rx || 0 });
    // [inverno] alberi: abeti a piani con la neve sui rami, pini con la chioma in cima, betulle e tigli spogli coi rami, secchi
    const SNOW = '#cdd3dc', SNOW2 = '#bfc6d2';
    const FIRS = ['#27422f', '#2d4d3c', '#22392c', '#34503a', '#2a4a44'], PINES = ['#2e4636', '#35503c', '#2a4030'], BARK = ['#4a3c32', '#52443a', '#3e342e', '#5a4a3c'];
    const branch = (x, y, z, len, th, a, tilt) => put(L.trunk, x, y, z, th, len, th, a, null, tilt);
    const tree = (x, z, kind, r) => {
      const y = groundH(x, z) - .1, s = .75 + r() * .6;
      if (kind === 'abete') { const h = (4.6 + r() * 2.2) * s, w = (1.15 + r() * .35) * s; put(L.trunk, x, y, z, 1.2, h * .3, 1.2, r() * 6, null); put(L.fir, x, y + .2, z, w, h, w, r() * 6, pick(r, FIRS)); }
      else if (kind === 'pino') { const h = (4.2 + r() * 1.6) * s; put(L.trunk, x, y, z, .95, h, .95, r() * 6, null, (r() - .5) * .12);
        for (let k = 0; k < 3; k++) { const a = r() * 6.3, d = k ? .7 * s : 0, cw = (1.35 - k * .22) * s; put(L.leaf, x + Math.cos(a) * d, y + h - .2 + k * .55 * s, z + Math.sin(a) * d, cw * 1.25, cw * .6, cw * 1.25, r() * 6, pick(r, PINES)); } }
      else if (kind === 'betulla') { const h = (4.2 + r() * 2) * s; put(L.trunk, x, y, z, .5, h, .5, r() * 6, null, (r() - .5) * .1); put(L.bark, x, y + .15, z, .46, h - .3, .46, 0, '#ffffff');
        for (let k = 0; k < 6; k++) branch(x, y + h * (.55 + r() * .4), z, (1.2 + r() * 1.4) * s, .13, r() * 6.3, .55 + r() * .5); }
      else if (kind === 'secco') { const h = (2 + r() * 1.6) * s; put(L.trunk, x, y, z, .85, h, .85, r() * 6, null, (r() - .5) * .3); for (let k = 0; k < 4; k++) branch(x, y + h * (.5 + r() * .45), z, (.9 + r() * 1.2) * s, .2, r() * 6.3, .6 + r() * .6); }
      else { const h = (1.8 + r() * 1.2) * s; put(L.trunk, x, y, z, .8, h, .8, r() * 6, null, (r() - .5) * .2); for (let k = 0; k < 7; k++) branch(x, y + h * (.7 + r() * .3), z, (1.3 + r() * 1.3) * s, .16, r() * 6.3, .5 + r() * .5); put(L.leaf, x, y + h + .9 * s, z, .9 * s, .45 * s, .9 * s, r() * 6, '#4a463e'); }
    };
    const tuft = (x, z, cols, sc, r) => put((zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.DESERTO ? L0 : LT).tuft, x, groundH(x, z) - .02, z, sc * (.7 + r() * .6), sc * (.7 + r() * .7), sc * (.7 + r() * .6), r() * 6, pick(r, cols));
    const STRAW = ['#a69668', '#8e7e52', '#b4a474', '#7c7048'], DEAD = ['#5a5240', '#6a5e48', '#4a4a3c'], GRN = ['#4a5a40', '#56664a', '#40503c'];
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const tx = tx0 + i, ty = ty0 + j, v = gT(tx, ty), z = zoneT(tx, ty), r = rng((tx * 92821 + ty * 68917) >>> 0);
      const cx = tx * TS + .4 + r() * 1.2, cz = ty * TS + .4 + r() * 1.2;
      if (v === T.TREE && r() < .45) tuft(tx * TS + r() * 2, ty * TS + r() * 2, DEAD, .9, r);
      if (v === T.TREE) { L = LT; tree(cx, cz, z === ZN.MACCHIA ? (q => q < .62 ? 'abete' : q < .86 ? 'betulla' : q < .95 ? 'pino' : 'secco')(r()) : z === ZN.MONTE ? (q => q < .3 ? 'pino' : q < .88 ? 'abete' : 'betulla')(r()) : z === ZN.CITTA ? (r() < .6 ? 'tiglio' : 'betulla') : (r() < .5 ? 'betulla' : 'secco'), r); L = L0; }
      else if (v === T.SHRUB) { for (let q = 0; q < 3; q++) tuft(tx * TS + r() * 2, ty * TS + r() * 2, r() < .5 ? DEAD : STRAW, 1, r); const k = r() < .6 ? 1 : 0; for (let q = 0; q < k; q++) { const x = tx * TS + r() * 2, zz = ty * TS + r() * 2, ss = .5 + r() * .6; put(LT.leaf, x, groundH(x, zz) + ss * .3, zz, ss * 1.1, ss * .7, ss * 1.1, r() * 6, pick(r, ['#3a4434', '#2e3a2c', '#4a4a3e'])); } }
      else if (v === T.FIELD) { if (tx % 2 === 0 && ty % 3 === 0 && r() < .5) put(L.vine, cx, groundH(cx, cz), cz, .08, .9, .08, 0, '#6a5a48'); }   // paletti degli orti sotto la neve
      else if (v === T.GRASS) { if (false) { } else if (z === ZN.DESERTO) { { for (let q = 0; q < 4; q++) tuft(tx * TS + r() * 2, ty * TS + r() * 2, STRAW, 1.1, r); if (r() < .05) put(L.leaf, cx, groundH(cx, cz) + .2, cz, .55, .35, .55, r() * 6, pick(r, DEAD)); } } else if (r() < .5) tuft(cx, cz, r() < .5 ? GRN : DEAD, .9, r); }
      else if (v === T.DESERT) { if (r() < .03) put(L.rock, cx, groundH(cx, cz), cz, .5 + r(), .4 + r() * .6, .5 + r(), r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a'])); }
      else if (v === T.ROCK) { if (r() < .14) put(L.rock, cx, groundH(cx, cz) - .2, cz, .6 + r() * 1.4, .4 + r() * 1, .6 + r() * 1.2, r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a'])); }
      
    }
    let grp = new THREE.Group(); const grpMain = grp;
    const mkI = (arr, geo, mat, colored, shadow) => {
      if (!arr.length) return;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      arr.forEach(o => { x0 = Math.min(x0, o.x); x1 = Math.max(x1, o.x); y0 = Math.min(y0, o.y); y1 = Math.max(y1, o.y + o.sy); z0 = Math.min(z0, o.z); z1 = Math.max(z1, o.z); });
      const g2 = geo.clone(); g2.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + 4);
      const im = new THREE.InstancedMesh(g2, mat, arr.length);
      arr.forEach((o, k) => { vE.set(o.rx, o.ry, 0, 'YXZ'); vQ.setFromEuler(vE); vV.set(o.x, o.y, o.z); vS.set(o.sx, o.sy, o.sz); vM4.compose(vV, vQ, vS); im.setMatrixAt(k, vM4); if (colored) im.setColorAt(k, vC.set(o.col || '#ffffff')); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = !!shadow; im.receiveShadow = false; grp.add(im);
    };
    mkI(L.trunk, K.trunk, K.trunkM, true, true); mkI(L.leaf, K.blob, K.vegM, true, true); mkI(L.fir, K.fir, K.vegM, true, true); mkI(L.tuft, K.tuft, K.vegM, true, false);
    mkI(L.rock, K.rockG, K.vegM, true, true); mkI(L.cactus, K.ball, K.cactusM, false, false); mkI(L.vine, K.box, K.leafM, true, false); mkI(L.bark, K.trunk, K.barkM, false, false);
    // [monte] gli alberi semplici: si vedono quando il bosco vero (buildNat) non c'è
    grp = new THREE.Group(); grp.name = 'loTrees';
    mkI(LT.trunk, K.trunk, K.trunkM, true, true); mkI(LT.leaf, K.blob, K.vegM, true, true); mkI(LT.fir, K.fir, K.vegM, true, true); mkI(LT.bark, K.trunk, K.barkM, false, false); mkI(LT.tuft, K.tuft, K.vegM, true, false);
    grpMain.add(grp); grp = grpMain;
    return grp;
  }

  // cielo cupo verde-acqua con una fascia di orizzonte: è ciò che le strade bagnate riflettono
  let WETENV = null;
  function wetEnv() {
    if (WETENV) return WETENV;
    const c = mk(128, 64), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#3a4a78'); g.addColorStop(.45, '#5a7c92'); g.addColorStop(.5, '#7fa6b0'); g.addColorStop(.56, '#2a3a44'); g.addColorStop(1, '#10141c');
    x.fillStyle = g; x.fillRect(0, 0, 128, 64);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer); WETENV = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    return WETENV;
  }
  // ---- blocchi di terreno ----
  // ================= [inverno30] LUCE COTTA: la città col coprifuoco =================
  // Per ogni blocco di terreno, una volta sola: la luce di TUTTE le sorgenti accese (lampioni, insegne, porte, vetrine, finestre
  // del piano terra) cade a terra con le ombre degli edifici (raggio sulla mappa delle caselle). Diventa la luce emissiva del terreno,
  // accesa di notte. Compressione morbida (1 - e^-x): le pozze si sommano senza mai bruciare.
  // SPILL = luce che esce da vetrine e finestre: calda, bassa, solo verso la strada.
  const SPILLS = [], BAKEQ = 4;   // 4 texel per casella = mezzo metro
  function addSpill(x, z, nx, nz, color, base, dist) { const gy = groundH(x, z); SPILLS.push({ x, z, y: gy + 1.3, gy, nx, nz, color: new THREE.Color(color), base, dist: dist || 6, spill: true }); }
  function bakeLight(tx0, ty0, n, m) {
    const T = G.T, Q = BAKEQ, W = n * Q, H = m * Q, acc = new Float32Array(W * H * 3), X0 = tx0 * TS, Z0 = ty0 * TS, tq = TS / Q;
    const solid = (wx, wz) => { const tx = Math.floor(wx / TS), ty = Math.floor(wz / TS); return G.tileAt(tx, ty) === T.BLD; };
    const src = LSRC.filter(L => !L.off && L.base > 0).concat(SPILLS);
    src.forEach(L => {
      const R = (L.dist || 8) * (L.spill ? 1 : 1.5); if (L.x < X0 - R || L.x > X0 + n * TS + R || L.z < Z0 - R || L.z > Z0 + m * TS + R) return;
      if (L.gy === undefined) L.gy = groundH(L.x, L.z); if (solid(L.x, L.z)) return;
      const h = Math.max(.8, L.y - L.gy), h2 = h * h, cr = L.color.r, cg = L.color.g, cb = L.color.b, I = L.base * (L.spill ? .55 : .46) * (L.flick > .5 ? .7 : 1);   // [luci1]
      const i0 = Math.max(0, Math.floor((L.x - R - X0) / tq)), i1 = Math.min(W - 1, Math.ceil((L.x + R - X0) / tq)), j0 = Math.max(0, Math.floor((L.z - R - Z0) / tq)), j1 = Math.min(H - 1, Math.ceil((L.z + R - Z0) / tq));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const px = X0 + (i + .5) * tq, pz = Z0 + (j + .5) * tq, dx = px - L.x, dz = pz - L.z, d2 = dx * dx + dz * dz; if (d2 > R * R) continue;
        const d = Math.sqrt(d2);
        let f = Math.pow(h2 / (d2 + h2), 1.5) * Math.pow(1 - d / R, 2);
        if (L.spill) { const dot = (dx * L.nx + dz * L.nz) / (d || 1); if (dot <= .05) continue; f *= Math.pow(dot, .6); }
        if (f < .004) continue;
        if (solid(px, pz)) continue;
        // ombra: dal punto verso la sorgente, a passi di un metro; il primo metro vicino alla sorgente non conta (lampade a muro)
        let lit = true; const st = Math.floor(d / 1); for (let s = 1; s < st; s++) { const t = s / st; if (d * (1 - t) < .9) break; if (solid(px - dx * t, pz - dz * t)) { lit = false; break; } }
        if (!lit) continue;
        const o = (j * W + i) * 3, v = f * I; acc[o] += cr * v; acc[o + 1] += cg * v; acc[o + 2] += cb * v;
      }
    });
    const c = mk(W, H), x = c.getContext('2d'), id = x.createImageData(W, H), D = id.data;
    for (let q = 0; q < W * H; q++) { for (let k = 0; k < 3; k++) D[q * 4 + k] = Math.round((1 - Math.exp(-acc[q * 3 + k] * 1.35)) * 255); D[q * 4 + 3] = 255; }
    x.putImageData(id, 0, 0);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; t.encoding = THREE.sRGBEncoding;
    return t;
  }
  // ---- riflessi sull'asfalto bagnato: una striscia di luce allungata verso la camera sotto ogni sorgente accesa ----
  const REFL = [];
  let reflTexC = null;
  function reflTex() { if (reflTexC) return reflTexC; const c = mk(16, 64), x = c.getContext('2d'), r = rng(4);
    for (let y = 0; y < 64; y++) { const a = Math.pow(1 - y / 64, 1.6) * (y < 3 ? y / 3 : 1); for (let i = 0; i < 16; i++) { const e = 1 - Math.abs(i - 7.5) / 8; const n = .7 + r() * .3; x.fillStyle = `rgba(255,255,255,${(a * e * e * n).toFixed(3)})`; x.fillRect(i, y, 1, 1); } }
    reflTexC = new THREE.CanvasTexture(c); return reflTexC; }
  function wetAt(x, z) { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)), T = G.T; return v === T.VIA || v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY; }
  function initRefl() { const g = new THREE.PlaneGeometry(1, 1); g.translate(0, .5, 0); g.rotateX(-Math.PI / 2);
    for (let i = 0; i < 96; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: reflTex(), color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })); m.visible = false; m.renderOrder = 1; scene.add(m); REFL.push(m); } }
  function updateRefl(night, list) {
    if (!REFL.length) initRefl();
    const cx = camera.position.x, cz = camera.position.z; let k = 0;
    if (night > .15) for (const L of list) {
      if (k >= REFL.length) break; if (L.off || !L.base) continue; if (L.gy === undefined) L.gy = groundH(L.x, L.z);
      const h = L.y - L.gy; if (h < .6) continue; let dx = cx - L.x, dz = cz - L.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const bx = L.x + dx * .3, bz = L.z + dz * .3; if (!wetAt(bx, bz)) continue;
      const m = REFL[k++], len = Math.min(13, h * 2.3 + 1.5), wid = L.spill ? 1.6 : .55 + h * .08;
      m.position.set(bx, groundH(bx, bz) + .04, bz); m.rotation.set(0, Math.atan2(dx, dz), 0); m.scale.set(wid, 1, len);
      m.material.color.copy(L.color); m.material.opacity = night * (L.spill ? .4 : .72) * Math.min(1, L.base / 2);   // [luci3] acqua che riflette m.visible = true;
    }
    for (; k < REFL.length; k++) REFL[k].visible = false;
  }
  // ================= [luci2] L'ARIA: densità, cristalli nella luce, fiato =================
  // Il freddo si vede nell'aria: brina sospesa che scintilla solo dentro i coni di luce, il fiato di chi passa,
  // coni di luce che pesano vicino alla lampada e svaniscono verso terra.
  const AIR = { on: false };
  function initAir() {
    AIR.on = true;
    // cristalli: punti colorati dalla luce in cui stanno
    const N = 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .1, vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
    AIR.pts = pts; AIR.pos = pos; AIR.col = col; AIR.N = N; AIR.s = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random(), Math.random()]);
    // fiato: sbuffi morbidi davanti alla testa
    const bm = new THREE.SpriteMaterial({ map: glowTexture(), color: '#e4e8ea', transparent: true, opacity: 0, depthWrite: false });
    AIR.puffs = []; for (let i = 0; i < 40; i++) { const sp = new THREE.Sprite(bm.clone()); sp.visible = false; sp.renderOrder = 3; scene.add(sp); AIR.puffs.push(sp); }
  }
  function tickAir(time, night) {
    if (!AIR.on) initAir();
    // --- cristalli nei coni di luce ---
    const Ls = (dyn.lsp || []).filter(L => !L.off && L.base > 0 && L.gy !== undefined && L.y - L.gy > 1.2), n = Ls.length, P = AIR.pos, C = AIR.col;
    const vis = night > .12 && n > 0; AIR.pts.visible = vis;
    if (vis) for (let i = 0; i < AIR.N; i++) {
      const s = AIR.s[i], L = Ls[i % n], H = L.y - L.gy, rad = H * .6;
      const rr = Math.sqrt(s[0]) * rad, a = s[1] * 6.283 + time * (.04 + s[3] * .05);
      const fall = (time * (.12 + s[2] * .22) + s[2] * H) % H, y = L.y - .2 - fall;
      const x = L.x + Math.cos(a) * rr + Math.sin(time * .6 + i) * .18, z = L.z + Math.sin(a) * rr + Math.cos(time * .5 + i * 1.3) * .18;
      P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
      const inCone = Math.pow(Math.max(0, 1 - rr / rad), 1.4), hf = Math.pow(1 - fall / H, .8);   // più fitti e accesi vicino alla lampada
      const tw = Math.sin(time * (2.5 + s[3] * 6) + i * 7.1) > .82 ? 1.6 : .45;                       // ogni tanto un cristallo prende la luce
      const b = night * inCone * hf * tw * 1.3;
      C[i * 3] = L.color.r * b; C[i * 3 + 1] = L.color.g * b; C[i * 3 + 2] = L.color.b * b;
    }
    if (vis) { AIR.pts.geometry.attributes.position.needsUpdate = true; AIR.pts.geometry.attributes.color.needsUpdate = true; }
    // --- fiato di chi è vicino alla camera ---
    let k = 0; const cx = cam.x, cz = cam.y;
    for (const id in dyn.people) {
      if (k >= AIR.puffs.length) break; const g = dyn.people[id]; if (!g || !g.visible) continue;
      const dx = g.position.x - cx, dz = g.position.z - cz; if (dx * dx + dz * dz > 26 * 26) continue;
      let hsh = 0; for (let q = 0; q < id.length; q++) hsh = (hsh * 31 + id.charCodeAt(q)) | 0;
      const per = 2.8 + (Math.abs(hsh) % 10) * .08, t = (time + (Math.abs(hsh) % 100) * .037) % per; if (t > 1.4) continue;
      const u = t / 1.4, fx = Math.sin(g.rotation.y), fz = Math.cos(g.rotation.y), sp = AIR.puffs[k++], sc = g.scale.y || 1;
      sp.position.set(g.position.x + fx * (.22 + u * .45), g.position.y + (1.52 + u * .22) * sc, g.position.z + fz * (.22 + u * .45));
      const sz = .25 + u * .7; sp.scale.set(sz, sz, 1); sp.material.opacity = Math.sin(u * Math.PI) * (.16 + night * .1); sp.visible = true;
    }
    for (; k < AIR.puffs.length; k++) AIR.puffs[k].visible = false;
  }
  // ================= [luci3] ACQUA, NEBBIOLINA, VAPORE, FUMO =================
  // nebbiolina bassa che prende la luce dei lampioni e delle vetrine; fumo dai camini delle case abitate;
  // il vapore dei tombini preso dalla luce vicina.
  const AIR2 = { on: false };
  const MISTN = 14;
  function initAir2() {
    AIR2.on = true;
    // --- nebbiolina: due veli bassi, illuminati dalle sorgenti vicine ---
    AIR2.lp = Array.from({ length: MISTN }, () => new THREE.Vector3(0, -99, 0)); AIR2.lc = Array.from({ length: MISTN }, () => new THREE.Vector3());
    AIR2.mist = [[.55, 0], [1.5, 1]].map(([hy, k]) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, ctr: { value: new THREE.Vector2() }, base: { value: new THREE.Color() }, amt: { value: .2 }, k: { value: k }, lp: { value: AIR2.lp }, lc: { value: AIR2.lc } },
        vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float time; uniform vec2 ctr; uniform vec3 base; uniform float amt; uniform float k; uniform vec3 lp[${MISTN}]; uniform vec3 lc[${MISTN}]; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){
            vec2 p = vP.xz*.11 + vec2(time*.03*(1.+k), time*.017);
            float f = n(p)*.55 + n(p*2.1+5.)*.3 + n(p*4.7+9.)*.15;
            float a = smoothstep(.3, .75, f) * amt * (1. - smoothstep(30., 46., distance(vP.xz, ctr)));
            vec3 L = vec3(0.); for (int i=0;i<${MISTN};i++){ vec3 q = lp[i]; float dd = distance(vP.xz, q.xz); float rr = 3.5 + max(0., q.y - vP.y) * 1.2; L += lc[i] * pow(max(0., 1. - dd/rr), 2.); }
            vec3 col = base + L;
            gl_FragColor = vec4(col, a * (.55 + min(1., dot(L, vec3(.33))) * 1.2)); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 1, 1), mat); pl.rotation.x = -Math.PI / 2; pl.renderOrder = 4; pl.userData.hy = hy; scene.add(pl); return pl;
    });
    // --- camini: sulle case (non sul regime né sui magazzini), uno su due fuma ---
    AIR2.ch = [];
    const brick = sm('#8a6656', { roughness: 1 }), capM = sm('#4a4644', { roughness: 1 });
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b, bb = rec.box3; if (!b || !bb || b.warehouse) return;
      if (rec.stove) { AIR2.ch.push({ x: rec.stove[0], y: rec.stove[1] + .1, z: rec.stove[2], ph: (bi * 7.3) % 20, k: .6 }); return; }   // baracche: fuma il tubo della stufa
      if (rec.shack || rec.special || b.__tierBase) return;   // baracche senza stufa nota, governo, corpi bassi dei gradoni: niente camino
      const u = String(b.use || '') + String(b.kind || ''); if (/caserma|rocca|hangar|deposito|commiss|cultura|baracca|chiesa/.test(u)) return;
      const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z; if (w < 3 || d < 3) return;
      const r = rng(bi * 977 + 13); if (r() < .3) return;
      const top = rec.flat ? bb.max.y - 2.5 : bb.max.y - .5, cx = bb.min.x + w * (.2 + r() * .6), cz = bb.min.z + d * (.2 + r() * .6);
      const g = new THREE.Group(), hh = 1.3 + r() * .7;
      const st = box(.7, hh, .7, brick); st.position.set(0, hh / 2, 0); g.add(st);
      const cap = box(.9, .12, .9, capM); cap.position.set(0, hh + .05, 0); g.add(cap);
      g.position.set(cx, top, cz); scene.add(g);
      if (r() < .62) AIR2.ch.push({ x: cx, y: top + hh + .15, z: cz, ph: r() * 20, k: .8 + r() * .5 });
    });
    const smM = new THREE.SpriteMaterial({ map: smokeTexture(), color: '#6a6c70', transparent: true, opacity: 0, depthWrite: false });
    AIR2.smoke = []; for (let i = 0; i < 150; i++) { const sp = new THREE.Sprite(smM.clone()); sp.visible = false; sp.renderOrder = 3; scene.add(sp); AIR2.smoke.push(sp); }
    // --- tombini: il chiusino sotto ogni sbuffo di vapore in strada ---
    const lidM = sm('#1a1a1e', { roughness: .5, metalness: .5 }), seen = {};
    VX.steam.forEach(s => { if (s.k > .9) return; const key = Math.round(s.x * 4) + ',' + Math.round(s.z * 4); if (seen[key]) return; seen[key] = 1;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .04, 14), lidM); lid.position.set(s.x, s.y - .02, s.z); scene.add(lid); });
  }
  function tickAir2(time, night) {
    if (!AIR2.on) initAir2();
    // nebbiolina: le sorgenti più vicine la accendono
    const src = (dyn.reflList || []).filter(L => !L.off && L.base > 0);
    for (let i = 0; i < MISTN; i++) { const L = src[i];
      if (L) { AIR2.lp[i].set(L.x, L.y, L.z); const kk = night * Math.min(1.4, L.base * .35) * (L.spill ? .7 : 1); AIR2.lc[i].set(L.color.r * kk, L.color.g * kk, L.color.b * kk); }
      else { AIR2.lp[i].set(0, -99, 0); AIR2.lc[i].set(0, 0, 0); } }
    AIR2.mist.forEach((pl, k) => { const U = pl.material.uniforms; U.time.value = time; U.ctr.value.set(cam.x, cam.y);
      pl.position.set(cam.x, cam.h + pl.userData.hy, cam.y);
      U.base.value.copy(scene.fog.color).multiplyScalar(.55 + (1 - night) * .6); U.amt.value = (.16 + night * .1) * (k ? .7 : 1); });
    // fumo dai camini vicini: sale, si allarga, il vento lo piega verso est
    let q = 0; const cx = cam.x, cz = cam.y;
    const near = AIR2.ch.filter(c => { const a = c.x - cx, b = c.z - cz; return a * a + b * b < 55 * 55; });
    for (const c of near) { for (let j = 0; j < 5 && q < AIR2.smoke.length; j++) {
      const t = ((time * .12 + c.ph + j * .2) % 1), sp = AIR2.smoke[q++], sz = (.7 + t * 3.4) * c.k;
      sp.position.set(c.x + t * t * 4.5 + Math.sin(time * .7 + c.ph + j) * .3 * t, c.y + .2 + t * 5, c.z + t * .8); sp.material.rotation = c.ph + j + t;
      sp.scale.set(sz, sz, 1); sp.material.opacity = Math.pow(1 - t, 1.3) * Math.min(1, t * 6) * (.62 - night * .2);
      sp.material.color.setRGB(.3 + night * .32, .31 + night * .32, .33 + night * .32); sp.visible = true; } }   // fumo di carbone: scuro sulla neve di giorno, chiaro nel buio
    for (; q < AIR2.smoke.length; q++) AIR2.smoke[q].visible = false;
    // vapore dei tombini: di notte prende il colore della luce più vicina
    if (!AIR2.tinted && LSRC.length) { AIR2.tinted = true; VX.steam.forEach(s => { let best = null, bd = 64; LSRC.forEach(L => { if (L.off) return; const d = (L.x - s.x) ** 2 + (L.z - s.z) ** 2; if (d < bd) { bd = d; best = L; } }); s.lc = best ? best.color : null; }); }
    if (!AIR2.puffy) { AIR2.puffy = true; const st = smokeTexture(); VX.steam.forEach(s => { s.sp.material.map = st; s.sp.material.needsUpdate = true; }); }
    VX.steam.forEach(s => { if (!s.lc) return; s.sp.material.color.setRGB(.85, .86, .89).lerp(s.lc, night * .55); });
  }
  function buildChunk(ci, cj) {
    const CH = ISO.CH, tx0 = ci * CH, ty0 = cj * CH, n = Math.min(CH, G.GW - tx0), m = Math.min(CH, G.GH - ty0), T = G.T;
    const c = mk(n * TP, m * TP), x = c.getContext('2d');
    paintTiles(x, tx0, ty0, n, m); smoothRoads(x, tx0, ty0, n, m); roadMarks(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);
    const tex = canvasTex(c);
    let rtex = null;
    try { const W = c.width, H = c.height, id = x.getImageData(0, 0, W, H), d = id.data, rc = mk(W, H), rxx = rc.getContext('2d'), od = rxx.createImageData(W, H), o = od.data;
      for (let q = 0; q < W * H; q++) { const lum = d[q * 4] * .3 + d[q * 4 + 1] * .59 + d[q * 4 + 2] * .11, r = Math.max(.26, Math.min(1, .26 + (lum - 62) / 70 * .74)) * 255; o[q * 4] = o[q * 4 + 1] = o[q * 4 + 2] = r; o[q * 4 + 3] = 255; }
      rxx.putImageData(od, 0, 0); rtex = canvasTex(rc); rtex.magFilter = THREE.LinearFilter; rtex.minFilter = THREE.LinearFilter; rtex.generateMipmaps = false; } catch (e) { rtex = null; }
    const pos = new Float32Array((n + 1) * (m + 1) * 3), uv = new Float32Array((n + 1) * (m + 1) * 2), idx = [];
    for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) {
      const k = j * (n + 1) + i, tx = tx0 + i, ty = ty0 + j;
      let h = hv(tx, ty);
      // [inverno] riva liscia: la quota segue la distanza vera dalla costa (curva), non le caselle; banchine e moli restano a filo
      { const ci2 = coastIn(tx * TS, ty * TS); let hard = false; for (const [a, b] of [[tx - 1, ty - 1], [tx, ty - 1], [tx - 1, ty], [tx, ty]]) { const vv = gT(a, b); if (vv === T.QUAY || vv === T.PIER) hard = true; }
        const LK = M.world && M.world.LAKE, lk = LK && Math.hypot((tx * TS - LK.x) / LK.rx, (ty * TS - LK.y) / LK.ry) < 1.6, b0 = lk ? LK.h - 1.9 : -1.6;   // [monte] il lago è sull'altopiano
        if (!hard && ci2 < 4) { const land = Math.max(lk ? LK.h + .25 : .4, h > b0 + .6 ? h : .4), k = Math.max(0, Math.min(1, (ci2 + 1.2) / 5.2)); h = b0 + (land - b0) * k * k * (3 - 2 * k); } }
      pos[k * 3] = tx * TS; pos[k * 3 + 1] = h; pos[k * 3 + 2] = ty * TS; uv[k * 2] = i / n; uv[k * 2 + 1] = 1 - j / m;
    }
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const v = gT(tx0 + i, ty0 + j); if (v === T.FOUNT) continue;
      if (v === T.WATER && coastIn((tx0 + i + .5) * TS, (ty0 + j + .5) * TS) < -3) continue;   // il fondale vicino alla riva c'è, il mare aperto no
      const a = j * (n + 1) + i, b = (j + 1) * (n + 1) + i, cc = b + 1, d = a + 1;
      idx.push(a, b, cc, a, cc, d);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); geo.computeBoundingSphere();
    const btex = bakeLight(tx0, ty0, n, m);   // [inverno30]
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .55, emissive: '#ffffff', emissiveMap: btex, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(mesh);
    const veg = buildVeg(tx0, ty0, n, m); grp.add(veg);
    const nat = buildNat(tx0, ty0, n, m); grp.add(nat); const lt = veg.getObjectByName('loTrees');
    scene.add(grp);
    return { grp, geo, mat, tex, btex, veg, nat, lt, rev: ISO.rev };
  }
  function dropChunk(ch) {
    scene.remove(ch.grp); ch.geo.dispose(); ch.mat.dispose(); ch.tex.dispose(); if (ch.btex) ch.btex.dispose();
    ch.veg.traverse(im => { if (im.isMesh) { im.geometry.dispose(); if (im.dispose) im.dispose(); } });
    if (ch.nat) ch.nat.children.forEach(im => { im.geometry.dispose(); if (im.dispose) im.dispose(); });
  }
  // isola intera a bassa risoluzione: si vede ai bordi e da lontano, sotto i blocchi veri
  function buildBase() {   // [inverno17]
    const T = G.T, S = 4, nx = Math.ceil(G.GW / S), ny = Math.ceil(G.GH / S);
    const c = mk(G.GW, G.GH), x = c.getContext('2d'), img = x.createImageData(G.GW, G.GH);
    const COL = { [T.COB]: [110, 100, 112], [T.VIA]: [44, 41, 52], [T.BLD]: [90, 70, 80], [T.PIAZZA]: [184, 172, 152], [T.QUAY]: [110, 104, 98], [T.PIER]: [106, 74, 50], [T.SAND]: [230, 208, 160], [T.GRASS]: [74, 122, 58], [T.WALK]: [138, 132, 144], [T.ROCK]: [122, 114, 112], [T.TREE]: [44, 62, 36], [T.DIRT]: [138, 106, 74], [T.FIELD]: [150, 130, 70], [T.DESERT]: [220, 180, 122], [T.SALT]: [236, 238, 238], [T.SHRUB]: [86, 104, 58], [T.FOUNT]: [42, 106, 138], [T.STAIRS]: [140, 130, 120] };
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty), o = (ty * G.GW + tx) * 4, c0 = COL[v] || [40, 60, 80], dd = M.world && M.world.districtAt ? M.world.districtAt(tx * TS) : '', urb = v === T.VIA || v === T.COB || v === T.WALK || v === T.PIAZZA || v === T.QUAY, k = !NEVE || v === T.WATER || v === T.BLD || dd === 'prateria' ? 0 : v === T.VIA ? .3 : urb ? .5 : .8, sn = urb ? [160, 164, 170] : [214, 218, 224], cc = (dd === 'prateria' && !urb ? [128, 114, 80] : c0).map((q, i) => q + (sn[i] - q) * k); img.data[o] = cc[0]; img.data[o + 1] = cc[1]; img.data[o + 2] = cc[2]; img.data[o + 3] = 255; }  // [inverno] neve
    x.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;   // [inverno17] sfumata
    const pos = [], uv = [], idx = [], PIECE = {};
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const tx = Math.min(G.GW, i * S), ty = Math.min(G.GH, j * S); pos.push(tx * TS, hv(tx, ty) - .08, ty * TS); uv.push(tx / G.GW, 1 - ty / G.GH); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let land = false; for (let q = 0; q < S && !land; q++) for (let p = 0; p < S && !land; p++) { const v = gT(i * S + p, j * S + q); if (v !== T.WATER) land = true; }
      if (!land) continue; const a = j * (nx + 1) + i, b = (j + 1) * (nx + 1) + i;
      const key = Math.floor(i * S / ISO.CH) + ',' + Math.floor(j * S / ISO.CH); (PIECE[key] = PIECE[key] || []).push(a, b, b + 1, a, b + 1, a + 1);
    }
    // [inverno17] un pezzo per blocco: si nasconde dove il blocco vero è caricato (prima spuntava a rombi scuri)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 });
    const P32 = new THREE.Float32BufferAttribute(pos, 3), UV2 = new THREE.Float32BufferAttribute(uv, 2), grp = new THREE.Group(); ISO.basePieces = {};
    Object.keys(PIECE).forEach(key => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', P32); geo.setAttribute('uv', UV2); geo.setIndex(PIECE[key]); geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; grp.add(mesh); ISO.basePieces[key] = mesh; });
    scene.add(grp); ISO.base = grp;
  }
  // carica i blocchi vicini alla camera (uno per fotogramma, il più vicino prima) e scarica quelli lontani
  function updateChunks(cx, cz) {
    const W = ISO.CH * TS, NCX = Math.ceil(G.GW / ISO.CH), NCY = Math.ceil(G.GH / ISO.CH);
    let best = null, bd = 1e9;
    for (let cj = 0; cj < NCY; cj++) for (let ci = 0; ci < NCX; ci++) {
      const mx = Math.max(ci * W, Math.min(cx, (ci + 1) * W)), mz = Math.max(cj * W, Math.min(cz, (cj + 1) * W)), d = Math.hypot(mx - cx, mz - cz), key = ci + ',' + cj, ch = ISO.chunks.get(key);
      if (ch && ch.nat) { const hi = ch.nat.children.length > 0 && d < (LOWQ.on ? 34 : 58); ch.nat.visible = hi; if (ch.lt) ch.lt.visible = !hi; }   // [monte] bosco vero vicino
      if (d < 135) { if ((!ch || ch.rev !== ISO.rev) && d < bd) { bd = d; best = [ci, cj, key]; } }
      else if (ch && d > 190) { dropChunk(ch); ISO.chunks.delete(key); }
    }
    if (best) { const old = ISO.chunks.get(best[2]); if (old) dropChunk(old); ISO.chunks.set(best[2], buildChunk(best[0], best[1])); }
    if (ISO.basePieces) for (const key in ISO.basePieces) ISO.basePieces[key].visible = !ISO.chunks.has(key);   // [inverno17]
  }
  // quando la mappa cambia (alberi tagliati, cantieri) i blocchi interessati si ridipingono
  function dirtyAt(x, z) { const key = Math.floor(x / (ISO.CH * TS)) + ',' + Math.floor(z / (ISO.CH * TS)), ch = ISO.chunks.get(key); if (ch) ch.rev = -1; }
  function buildIsland() { buildBase(); }

  // ---- arredo statico: lampioni, palme, porto, spiaggia, piazza, poligono ----

  // ---------------- ARREDO ORDINATO (legge Game.layout) ----------------
  // Modelli dei kit centrati sulla loro base: la posizione è il centro dell'oggetto, a terra.
  function kp(name, s) {
    const o = Kit.get(name); o.scale.setScalar(s); o.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(o), g = G0();
    o.position.set(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); g.add(o); return g;
  }
  // un oggetto del kit di cibo ridotto a stare in una cella di lato c (metri)
  function food(name, c) { const o = Kit.get('food/' + name); o.updateMatrixWorld(true); const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); return kp('food/' + name, c / Math.max(sz.x, sz.z, .01)); }
  const GOODS = {
    frutta: { sign: 'FRUTTA', c: ['#c43c52', '#f4ead6'], crates: [['apple', 'orange', 'lemon'], ['pear', 'grapes', 'banana']], ground: 'watermelon' },
    verdura: { sign: 'VERDURA', c: ['#2f6a4e', '#f4ead6'], crates: [['tomato', 'paprika', 'eggplant'], ['cabbage', 'onion', 'carrot']], ground: 'pumpkin' },
    pesce: { sign: 'PESCHERIA', c: ['#2a5aa8', '#f4ead6'], crates: [['fish', 'fish', 'mussel'], ['fish', 'mussel', 'fish']], ice: true },
    forno: { sign: 'PANE', c: ['#c8862a', '#f4ead6'], crates: [['loaf', 'croissant', 'bread'], ['loaf-baguette', 'cheese', 'loaf']], ground: 'barrel' },
  };
  function banco(it, r) {
    const G2 = GOODS[it.goods], g = G0(), wood = PM.wood(), woodL = PM.woodL();
    // bancone 3,6 × 0,95 m, alto 0,9: due caselle di fronte, il venditore dietro
    add(g, box(3.6, .9, .95, wood), 0, .45, 0); add(g, box(3.7, .06, 1.05, woodL), 0, .93, 0);
    add(g, box(3.6, .5, .02, stripeMat(G2.c[0], G2.c[1])), 0, .6, .49);
    // tendone: pali dietro più alti, telo inclinato verso chi compra
    // tendone a sbalzo sopra il venditore: lascia vedere la merce dall'alto
    [-1.75, 1.75].forEach(x => add(g, box(.07, 2.5, .07, PM.iron()), x, 1.25, -.42));
    const tela = add(g, box(3.8, .05, 1.1, stripeMat(G2.c[0], G2.c[1])), 0, 2.36, -.62); tela.rotation.x = .3;
    add(g, box(3.8, .3, .03, stripeMat(G2.c[1], G2.c[0])), 0, 2.1, -.08);
    // cassette sul banco: 3 per lato corto, ognuna con 3×3 pezzi dello stesso tipo
    const crateM = sm('#b88a5a'), iceM = sm('#e8f4f8', { roughness: .3 });
    G2.crates.forEach((row, ri) => row.forEach((nm, ci) => {
      const cx = -1.2 + ci * 1.2, cz = ri ? .2 : -.24, base = .96;
      add(g, box(1.05, .16, .4, crateM), cx, base + .08, cz);
      if (G2.ice) add(g, box(1, .03, .36, iceM), cx, base + .17, cz);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const f = food(nm, .3); f.position.set(cx - .32 + i * .32, base + .16, cz - .09 + j * .18); f.rotation.y = r() * 6.28; g.add(f); }
    }));
    // insegna dipinta sul fronte del tendone
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .28), new THREE.MeshBasicMaterial({ map: signTexture(G2.sign, '#fff3d8', G2.c[0]), toneMapped: false })); sg.position.set(0, 2.1, -.06); sg.userData.keep = true; g.add(sg);
    // a terra: cassette impilate dietro, un pezzo grosso davanti a un lato
    add(g, box(.7, .4, .5, crateM), -1.3, .2, -.85); add(g, box(.7, .4, .5, crateM), -1.25, .6, -.85); add(g, box(.7, .4, .5, crateM), 1.3, .2, -.85);
    if (G2.ground) { const big = food(G2.ground, .5); big.position.set(1.55, 0, .75); g.add(big); }
    return place(g, it.x, it.y, it.rot);
  }
  function buildLayout() {
    if (!Kit.ready || !G.layout) return;
    const L = G.layout(), r = rng(1979);
    const kitAt = (name, s, x, z, rot, y) => { const o = kp(name, s); o.position.set(x, groundH(x, z) + (y || 0), z); o.rotation.y = rot || 0; addStatic(o); return o; };
    const STONES = ['gravestone-cross', 'gravestone-round', 'gravestone-roof', 'gravestone-bevel', 'gravestone-decorative', 'gravestone-cross-large', 'gravestone-wide'];
    L.items.forEach(it => {
      switch (it.kind) {
        case 'banco': banco(it, r); break;
        case 'binario': { const n = Math.max(1, Math.round(it.len / 10.4)), seg = it.len / n; for (let k = 0; k < n; k++) kitAt('train/railroad-straight', seg / 4, it.x + seg / 2 + k * seg, it.y, Math.PI / 2); break; }
        case 'carro': kitAt('train/' + it.model, 2.6, it.x, it.y, it.rot, .26); break;
        // cimitero all'italiana: muro di cinta intonacato con coppa in cotto, cancello in ferro, cappella bianca, lapidi in marmo
        case 'recinto': { const g = G0(), along = Math.abs(it.rot) < .1; add(g, box(along ? 2 : .4, 2.1, along ? .4 : 2, sm('#efe6d4')), 0, 1.05, 0); add(g, box(along ? 2.02 : .56, .14, along ? .56 : 2.02, sm('#b8583a')), 0, 2.17, 0); add(g, box(along ? 2.02 : .44, .3, along ? .44 : 2.02, sm('#c8bca8')), 0, .15, 0); place(g, it.x, it.y, 0); break; }
        case 'cancello': { kitAt('grave/iron-fence-border-gate', 2, it.x, it.y, it.rot); [-1, 1].forEach(s => { const g = G0(); add(g, box(.5, 2.5, .5, sm('#efe6d4')), 0, 1.25, 0); add(g, box(.62, .16, .62, sm('#b8583a')), 0, 2.58, 0); place(g, it.x + s * 1.05, it.y, 0); }); break; }
        case 'cappella': { const g = G0(), wall = sm('#f2ead8'); add(g, box(4.4, 3.4, 2.6, wall), 0, 1.7, 0); add(g, box(4.6, .2, 2.8, sm('#d8ccb4')), 0, 3.45, 0);
          const rf = new THREE.Mesh(roofGeo(4.9, 3, 1.3), std({ map: cotTex.clone(), color: '#ffffff' })); rf.material.map.needsUpdate = true; rf.material.map.repeat.set(1.2, 1); rf.rotation.y = Math.PI / 2; rf.position.set(0, 3.5, 0); g.add(rf);
          add(g, box(1.2, 2.2, .1, sm('#4a3a2c')), 0, 1.1, 1.31); add(g, box(.12, .7, .08, sm('#d8c690')), 0, 4.6, 1.2); add(g, box(.44, .12, .08, sm('#d8c690')), 0, 4.75, 1.2);
          place(g, it.x, it.y, 0); kitAt('grave/lantern-candle', 1.6, it.x - 1.6, it.y + 1.7, 0); kitAt('grave/lantern-candle', 1.6, it.x + 1.6, it.y + 1.7, 0); addLight(it.x, groundH(it.x, it.y) + 1, it.y + 2, '#ffb060', 1.6, 7, .25); break; }
        case 'tomba': { const g = G0(), mar = sm(it.n % 3 ? '#ece8e0' : '#d8d2c8'); add(g, box(1, .32, 1.9, mar), 0, .16, .35); add(g, box(.84, .06, 1.7, sm('#c8c0b4')), 0, .35, .35);
          const kind = it.n % 3; if (kind === 0) { add(g, box(.9, 1.1, .16, mar), 0, .55, -.62); add(g, box(.14, .5, .06, sm('#c8a050')), 0, .8, -.53); add(g, box(.36, .1, .06, sm('#c8a050')), 0, .9, -.53); }
          else if (kind === 1) { const hs = add(g, box(.8, .9, .14, mar), 0, .45, -.62); const top = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .14, 10, 1, false, 0, Math.PI), mar); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.set(0, .9, -.62); g.add(top); }
          else { add(g, box(.18, 1.3, .18, mar), 0, .65, -.62); add(g, box(.7, .16, .16, mar), 0, 1, -.62); }
          // foto ovale e fiori
          add(g, box(.18, .22, .03, sm('#e8d8b0')), 0, .62, -.53); if (it.n % 2) { add(g, box(.24, .22, .24, sm('#9a5236')), .3, .45, .9); add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), sl(['#c43c52', '#f2c14e', '#e8e2f4'][it.n % 3])), .3, .7, .9); }
          place(g, it.x, it.y, 0); if (it.n % 4 === 1) kitAt('grave/candle-multiple', 1.2, it.x - .3, it.y + 1.1, 0); break; }
        case 'cipresso': cypress(it.x, it.y, r); break;
        case 'bibite': { kitAt('arcade/vending-machine', 2.5, it.x, it.y, it.rot); const fx = it.x + Math.sin(it.rot) * .7, fz = it.y + Math.cos(it.rot) * .7; addLight(fx, groundH(fx, fz) + 1.2, fz, '#a8e0ff', 1.2, 4, .05); break; }
      }
    });
  }

  function buildPropsIsland() {
    const T = G.T, r = rng(2026), P = G.PLACES;
    const free = (x, z) => { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return v !== T.BLD && v !== T.WATER && v !== T.VIA && v !== T.FOUNT && v !== T.TREE; };
    // lampioni e palme lungo le strade
    (M.roads || []).forEach(rd => {
      if (rd.kind === 'sterrato') return;
      let acc = 0, side = 1;
      const step = rd.kind === 'litoranea' ? 30 : rd.kind === 'vicolo' ? 16 : 20;
      for (let k = 0; k < rd.pts.length - 1; k++) {
        const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1], L = Math.hypot(bx - ax, by - ay); acc += L; if (acc < step) continue; acc = 0; side = -side;
        const nx = -(by - ay) / (L || 1), ny = (bx - ax) / (L || 1), off = rd.w / 2 + (rd.kind === 'citta' || rd.kind === 'litoranea' ? 1.2 : .8), x = ax + nx * off * side, z = ay + ny * off * side;
        if (!free(x, z)) continue;
        const city = zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.CITTA, rot = Math.atan2(-nx * side, -ny * side);
        if (rd.kind === 'vicolo') streetLamp(x, z, 'genovese', rot);
        else if ((rd.kind === 'litoranea' && city) || rd.name === 'Via del Porto' || rd.name === 'Lungomare') { streetLamp(x, z, 'deco', rot); const px = x + (by - ay) / L * 5, pz = z - (bx - ax) / L * 5; }
        else if (rd.kind === 'litoranea' || rd.kind === 'strada') { if (city || r() < .5) streetLamp(x, z, 'sodium', rot); }
        else streetLamp(x, z, city && r() < .5 ? 'genovese' : 'sodium', rot);
      }
    });
    // piazza San Rocco: fontana, panchine, alberi, edicola, cabina
    const pz = P.fontana; if (pz) { let fx = 0, fz = 0, c = 0; for (let ty = pz.ty - 8; ty < pz.ty + 8; ty++) for (let tx = pz.tx - 8; tx < pz.tx + 8; tx++) if (G.tileAt(tx, ty) === T.FOUNT) { fx += tx * TS + 1; fz += ty * TS + 1; c++; } if (c) buildFountain(fx / c, fz / c); }
    if (P.piazza) { const q = P.piazza; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, x = q.x + Math.cos(a) * 11, z = q.y + Math.sin(a) * 8; if (free(x, z) && free(x, z - 2.5) && free(x, z + 2.5) && free(x - 2.5, z) && free(x + 2.5, z)) { if (k % 2) bench(x, z, -a + Math.PI / 2, 'iron'); else leafyTree(x, z, r, k === 0); } } if (free(q.x + 6, q.y - 6)) newsstand(q.x + 6, q.y - 6, 0, r); if (free(q.x - 7, q.y + 5)) phoneBooth(q.x - 7, q.y + 5, 0); }
    // tavolini fuori da bar e osterie
    ['bar', 'osteria', 'sirena', 'gelateria', 'osteria_sg', 'car_2'].forEach((id, k) => { const q = P[id]; if (!q) return; for (let t = 0; t < 4; t++) { const x = q.x + (t - 1.5) * 1.8, z = q.y + 1.6; if (free(x, z)) table(x, z, 'cafe', ['caffe', 'birra'], r, 2); } });
    // porto: barche, bitte, casse, reti
    let boats = 0;
    for (let tries = 0; tries < 900 && boats < 22; tries++) {
      const W0 = M.world, x = 360 + r() * 92, z = W0.southY(406) + 4 + r() * 30, tx = Math.floor(x / TS), ty = Math.floor(z / TS);
      let ok = true; for (let j = -3; j <= 3 && ok; j++) for (let i = -2; i <= 2 && ok; i++) if (G.tileAt(tx + i, ty + j) !== T.WATER) ok = false;
      if (!ok) continue; boats++;
      const kind = r(); if (kind < .5) fishingBoat(x, z, pick(r, ['#2a5a9a', '#c83a2a', '#2a8a6a', '#f0e8d8']), pick(r, ['#f2eee6', '#e8c040']), r() * .6 - .3 + Math.PI / 2, r); else if (kind < .8) sailboat(x, z, r() * .6 - .3, r); else yacht(x, z, r() * .6 - .3, pick(r, ['#f4f2ee', '#1a1a22']), r);
    }
    for (let k = 0; k < 260; k++) { const tx = 175 + Math.floor(r() * 55) + (r() < .4 ? 135 : 0), ty = (r() < .5 ? 55 : 80) + Math.floor(r() * 30), v = G.tileAt(tx, ty); if (v !== T.QUAY) continue; const x = tx * TS + 1, z = ty * TS + 1; const w = r(); if (w < .25) bollard(x, z); else if (w < .4) crateStack(x, z, 1 + Math.floor(r() * 4), r, pick(r, ['fish', 'fruit', 'none'])); else if (w < .5) nets(x, z, r); else if (w < .56) drumGroup(x, z, r); }
    // spiaggia del Lido: ombrelloni e lettini
    if (P.spiaggia) { const q = P.spiaggia; let n = 0; for (let k = 0; k < 90 && n < 18; k++) { const x = q.x - 30 + r() * 60, z = q.y - 6 + r() * 24, v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); if (v !== T.SAND) continue; const ca = pick(r, ['#ff6aa0', '#40c0e0', '#f0c030', '#8a60e0']); beachUmbrella(x, z, r, ca, '#f4f0e8'); sunbed(x + 1.1, z + .6, 0, ca, r); n++; } if (n) lifeguardTower(q.x, q.y + 4); }
    // cantiere navale
    if (P.cantiere) { const q = P.cantiere; if (free(q.x + 6, q.y + 4)) hullOnCradle(q.x + 6, q.y + 6, Math.PI / 2); if (free(q.x - 6, q.y + 3)) crane(q.x - 6, q.y + 4, 0, '#d86a2a'); }
    // poligono: carri armati abbandonati, container, recinzioni
    if (P.poligono) { const q = P.poligono; for (let k = 0; k < 5; k++) { const x = q.x - 24 + r() * 48, z = q.y - 14 + r() * 28; if (!free(x, z)) continue; const g = G0(); add(g, box(3.2, 1.1, 5.6, sm('#5a5e4a')), 0, .8, 0); add(g, box(2.2, .8, 2.4, sm('#4e5240')), 0, 1.75, -.3); const gun = add(g, cyl(.13, .13, 4, 6, sm('#3e4234')), 0, 1.8, 1.6); gun.rotation.x = Math.PI / 2 - .1; [-1.5, 1.5].forEach(s => add(g, box(.5, .8, 5.8, sl('#2a2a26')), s, .45, 0)); place(g, x, z, r() * 6); }
      for (let k = 0; k < 6; k++) { const x = q.x - 30 + r() * 60, z = q.y - 16 + r() * 32; if (free(x, z)) container(x, z, r() < .5 ? 0 : Math.PI / 2, pick(r, ['#5a6a4a', '#7a5a3a', '#4a5a6a'])); } }
    // cava e discarica: rottami e massi
    if (P.discarica) { const q = P.discarica; for (let k = 0; k < 12; k++) { const x = q.x - 10 + r() * 20, z = q.y - 7 + r() * 14; if (!free(x, z)) continue; if (r() < .5) drumGroup(x, z, r); else { const g = G0(); add(g, box(1.6 + r() * 2, .4 + r() * .6, 1 + r() * 2, sm(pick(r, ['#6a4a3a', '#5a5a60', '#8a3a2a']))), 0, .3, 0, (r() - .5) * .4, 0, (r() - .5) * .4); place(g, x, z, r() * 6); } } }
  }

  // ================= INTERNI =================
  // Dentro un edificio si vede solo il piano dove sei: pavimenti per stanza, muri di fondo alti e muri davanti bassi
  // (a sezione, così la camera dall'alto vede tutto), scala, mobili. Il resto del mondo si spegne.
  const INDOOR = { key: null, grp: null, lights: [], keep: new Set() };
  const FLOORTEX = {};
  function floorTex(kind) {
    if (FLOORTEX[kind]) return FLOORTEX[kind];
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(kind.length * 31 + 7);
    if (kind === 'legno') { x.fillStyle = '#8a5a3a'; x.fillRect(0, 0, 32, 32); for (let j = 0; j < 32; j += 4) { const o = (j / 4 % 2) * 11; for (let i = -o; i < 32; i += 22) { x.fillStyle = pick(r, ['#94603e', '#7e5234', '#9a6a46', '#86583a']); x.fillRect(i, j, 21, 3); } x.fillStyle = '#5e3a24'; x.fillRect(0, j + 3, 32, 1); } }
    else if (kind === 'piastrelle') { for (let j = 0; j < 32; j += 8) for (let i = 0; i < 32; i += 8) { x.fillStyle = (i + j) % 16 ? '#e8e2d4' : '#4a6a8a'; x.fillRect(i, j, 8, 8); } x.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 32; k += 8) { x.fillRect(k, 0, 1, 32); x.fillRect(0, k, 32, 1); } }
    else if (kind === 'graniglia') { x.fillStyle = '#c8b8a0'; x.fillRect(0, 0, 32, 32); for (let k = 0; k < 140; k++) { x.fillStyle = pick(r, ['#8a7a6a', '#e8dcc8', '#a8584a', '#6a7a8a', '#f4ecd8']); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 1, 1); } }
    else if (kind === 'cotto') { for (let j = 0; j < 32; j += 8) for (let i = 0; i < 32; i += 8) { x.fillStyle = pick(r, ['#b4623e', '#a85a38', '#c06c46', '#9e5232']); x.fillRect(i, j, 8, 8); } x.fillStyle = '#7a3e26'; for (let k = 0; k < 32; k += 8) { x.fillRect(k, 0, 1, 32); x.fillRect(0, k, 32, 1); } }
    else { x.fillStyle = '#7a7672'; x.fillRect(0, 0, 32, 32); for (let k = 0; k < 90; k++) { x.fillStyle = pick(r, ['#868280', '#6e6a66', '#8e8a86']); x.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1); } }
    const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (FLOORTEX[kind] = t);
  }
  const ROOMFLOOR = { bagno: 'piastrelle', cucina: 'piastrelle', retro: 'piastrelle', sala: 'graniglia', bottega: 'graniglia', hall: 'graniglia', attesa: 'graniglia', farmacia: 'graniglia', visite: 'piastrelle',
    navata: 'cotto', cantoria: 'legno', reparto: 'cemento', uffici: 'graniglia', ferramenta: 'graniglia', panetteria: 'graniglia', forno: 'cotto', tabacchi: 'graniglia', pescheria: 'piastrelle', cella_frigo: 'piastrelle', lavanderia: 'piastrelle', barbiere: 'piastrelle', farmacia: 'graniglia', tipografia: 'cemento', sala_giochi: 'piastrelle', spogliatoio: 'piastrelle', circolo: 'cotto', bar_circolo: 'cotto', atrio: 'graniglia', deposito: 'cemento', soppalco: 'cemento', magazzino: 'cemento', armeria: 'cemento', cella: 'cemento', ripostiglio: 'cotto', officina: 'cemento' };
  const WALLCOL = { casa: '#e8d8bc', bar: '#d8b890', bottega: '#e0d4c0', albergo: '#f0e4d0', caserma: '#a8b0a0', biblioteca: '#d8c8a8', ambulatorio: '#e0ece8', chiesa: '#e8e0d0', deposito: '#9a948a', officina: '#8e8c86' };
  function buildIndoor(b, f) {
    if (window.InterniArte) { try { const g0 = InterniArte.build(b, f, { THREE, scene, cam, INDOOR, G, groundH }); if (g0) return g0; } catch (e) { console.error('[interni] InterniArte', e); } }
    const I = G.INT, L = I.layout(b), F = L.floors[f], grp = new THREE.Group(), [X0, Y0, W, H] = L.box, base = .4;
    // fondo nero tutto intorno: il fuori non c'è
    const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 400, H + 400), new THREE.MeshBasicMaterial({ color: '#07050c' })); under.rotation.x = -Math.PI / 2; under.position.set(X0 + W / 2, base - .05, Y0 + H / 2); grp.add(under);
    F.rooms.forEach(q => {
      const t = floorTex(ROOMFLOOR[q.name] || (f ? 'legno' : L.kind === 'casa' ? 'cotto' : 'legno')).clone(); t.needsUpdate = true; t.repeat.set(q.w / 2, q.h / 2);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(q.w, q.h), std({ map: t, roughness: .8 })); m.rotation.x = -Math.PI / 2; m.position.set(q.x + q.w / 2, base + .01, q.y + q.h / 2); m.receiveShadow = true; grp.add(m);
    });
    // muri: quelli di fondo (nord e ovest del perimetro) alti, gli altri bassi
    const wc = WALLCOL[L.kind] || '#e0d4c0', wallM = std({ color: wc, roughness: .95 }), lowM = std({ color: new THREE.Color(wc).multiplyScalar(.85), roughness: .95 }), capM = std({ color: '#3a2a30' });
    F.walls.forEach(w => {
      const [x, y, ww, hh] = w, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
      const onN = hh < .4 && Math.abs(y + hh / 2 - Y0) < .3, onS = hh < .4 && Math.abs(y + hh / 2 - Y0 - H) < .3, onW = ww < .4 && Math.abs(x + ww / 2 - X0) < .3, onE = ww < .4 && Math.abs(x + ww / 2 - X0 - W) < .3;
      const back = (onN && cy > .2) || (onS && cy < -.2) || (onW && sy > .2) || (onE && sy < -.2);
      const ht = back ? 2.9 : 1.05, m = box(ww, ht, hh, back ? wallM : lowM); m.position.set(x + ww / 2, base + ht / 2, y + hh / 2); m.castShadow = true; m.receiveShadow = true; grp.add(m);
      if (!back) { const cap = box(ww + .02, .05, hh + .02, capM); cap.position.set(x + ww / 2, base + ht + .02, y + hh / 2); grp.add(cap); }
      // finestre sui muri di fondo
      if (back && Math.max(ww, hh) > 2.4) for (let k = 1.5; k < Math.max(ww, hh) - 1; k += 3.2) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), new THREE.MeshBasicMaterial({ color: '#8ab0d8', toneMapped: false })); win.position.set(ww > hh ? x + k : (onE ? x - .01 : x + ww + .01), base + 1.7, ww > hh ? (onS ? y - .01 : y + hh + .01) : y + k); win.rotation.y = ww > hh ? 0 : Math.PI / 2; grp.add(win);
      }
    });
    // scala
    if (L.stairs) {
      const s = L.stairs, stepM = std({ color: '#b8a888' }), n = 12, horiz = s.dir === 'E';
      if (f === 0) for (let k = 0; k < n; k++) {
        const t = k / n, h = (k + 1) * (3 / n), len = (horiz ? s.w : s.h) - 2, along = 2 + len * (1 - t) - len / n / 2;   // dal piede (lontano dalla cima) verso la cima
        const st0 = box(horiz ? len / n + .02 : s.w - .2, h, horiz ? s.h - .2 : len / n + .02, stepM);
        st0.position.set(horiz ? s.x + along - .0 : s.x + s.w / 2, base + h / 2, horiz ? s.y + s.h / 2 : s.y + along); st0.castShadow = true; grp.add(st0);
      }
      else { const hole = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? s.w - 2 : s.w, horiz ? s.h : s.h - 2), new THREE.MeshBasicMaterial({ color: '#100c14' })); hole.rotation.x = -Math.PI / 2; hole.position.set(horiz ? s.x + 2 + (s.w - 2) / 2 : s.x + s.w / 2, base + .02, horiz ? s.y + s.h / 2 : s.y + 2 + (s.h - 2) / 2); grp.add(hole); }
      // la cima: tappetino chiaro, è il passaggio
      const top = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ color: f === 0 ? '#ffd28a' : '#8ad2ff', transparent: true, opacity: .35, toneMapped: false })); top.rotation.x = -Math.PI / 2; top.position.set(s.top[0] + 1, base + (f === 0 ? 3.02 : .03), s.top[1] + 1); grp.add(top);
    }
    // soglia d'ingresso
    if (f === 0 && L.ent) { const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: .5, toneMapped: false })); mat.rotation.x = -Math.PI / 2; mat.position.set(L.ent.in[0], base + .03, L.ent.in[1]); grp.add(mat); }
    // mobili (si caricano al volo)
    if (window.Models) F.furn.forEach(o => Models.furniture(o.id).then(m => { if (!m || INDOOR.grp !== grp) return; m.position.set(o.x, base + (o.h || 0), o.y); m.rotation.y = o.ry; grp.add(m); }));
    // luce: una calda per stanza
    INDOOR.lights.forEach(l => scene.remove(l)); INDOOR.lights = [];
    F.rooms.slice(0, 6).forEach(q => { const l = new THREE.PointLight('#ffd8a8', .75, Math.max(q.w, q.h) * 1.5, 1.6); l.position.set(q.x + q.w / 2, base + 2.6, q.y + q.h / 2); scene.add(l); INDOOR.lights.push(l); });
    return grp;
  }
  function indoorPass(st) {
    const p = st.player, key = p.indoor ? p.indoor.b + ':' + p.indoor.f + ':' + INDOOR.quad : null;
    if (key !== INDOOR.key) {
      if (INDOOR.grp) { scene.remove(INDOOR.grp); INDOOR.grp = null; }
      if (!key && window.InterniArte) InterniArte.exit();
      INDOOR.lights.forEach(l => scene.remove(l)); INDOOR.lights = [];
      INDOOR.key = key;
      if (key) { INDOOR.grp = buildIndoor(G.BUILDINGS[p.indoor.b], p.indoor.f); scene.add(INDOOR.grp); }
      else scene.children.forEach(o => { if (o.userData.__hid) { o.visible = true; o.userData.__hid = false; } });
    }
    if (!key) return false;
    hemi.intensity *= .5; moon.intensity *= .35; fillAmb.intensity *= .6;
    if (window.InterniArte) InterniArte.light({ st, hemi, moon, fillAmb, dyn, scene, INDOOR });
    const pg = dyn.people.__player;
    scene.children.forEach(o => { if (o === INDOOR.grp || o === pg || o.isLight || INDOOR.lights.includes(o)) return; if (o.visible) { o.visible = false; o.userData.__hid = true; } });
    INDOOR.grp.visible = true; if (pg) pg.visible = true;
    return true;
  }

  // ---------------- CIELO ----------------
  function buildSky() {
    const geo = new THREE.SphereGeometry(160, 32, 16);
    const mat = new THREE.ShaderMaterial({
      uniforms: { night: { value: 1 }, dusk: { value: 0 }, sun: { value: new THREE.Vector3(-1, .1, -.3).normalize() }, time: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float night; uniform float dusk; uniform vec3 sun; uniform float time; varying vec3 vD;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          float y = vD.y;
          vec3 dayTop = vec3(.56,.60,.66), dayHor = vec3(.80,.81,.82);
          vec3 duTop = vec3(.22,.22,.30), duMid = vec3(.52,.44,.48), duHor = vec3(.78,.62,.50);
          vec3 niTop = vec3(.02,.03,.05), niHor = vec3(.10,.11,.14);
          vec3 day = mix(dayHor, dayTop, smoothstep(0.,.5,y));
          vec3 du = mix(mix(duHor, duMid, smoothstep(0.,.14,y)), duTop, smoothstep(.14,.6,y));
          vec3 ni = mix(niHor, niTop, smoothstep(0.,.45,y));
          vec3 c = mix(day, du, dusk);
          c = mix(c, ni, night*(1.-dusk*.55));
          // sole al tramonto, a bande come nei giochi a 16 bit
          float sd = dot(vD, sun);
          float disc = smoothstep(.9975,.9985,sd);
          float stripes = step(.5, fract((vD.y-sun.y)*55.)) + step(sun.y+.012, vD.y);
          // [inverno] il sole è un disco pallido dietro la nebbia, senza bande
          float pale = smoothstep(.9965,.9985,sd);
          c = mix(c, vec3(.97,.95,.90), pale*.75*(1.-night));
          c += vec3(.9,.86,.8)*pow(max(0.,sd),18.)*.22*(1.-night);
          // stelle
          vec2 g = floor(vec2(atan(vD.z,vD.x)*160., vD.y*160.));
          float st = step(.996, h(g)) * smoothstep(.08,.4,y) * night * (.6+.4*sin(time*2.+h(g)*40.));
          c += st*vec3(.9,.85,1.)*.25;
          if (y < 0.) c = mix(niHor, vec3(.02,.03,.08), clamp(-y*4.,0.,1.))*night + (1.-night)*mix(c, vec3(.1,.25,.35), clamp(-y*4.,0.,1.));
          gl_FragColor = vec4(c,1.);
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const s = new THREE.Mesh(geo, mat); s.renderOrder = -2; s.frustumCulled = false; scene.add(s); dyn.sky = s;
  }
  // colore del cielo all'orizzonte (per la nebbia)
  function horizonColor(night, dusk, out) {
    const day = new THREE.Color(.76, .77, .79), du = new THREE.Color(.56, .50, .52), ni = new THREE.Color(.09, .10, .13);
    out.copy(day).lerp(du, dusk).lerp(ni, night * (1 - dusk * .55)); return out;
  }

  // ---------------- ORIZZONTE: la costa di fronte, la collina dell'isola, i ponti ----------------
  function buildSkyline() {
    // costa lontana, con le luci della città sulla terraferma (cilindro che segue la camera)
    const c = mk(2048, 160), x = c.getContext('2d'), r = rng(5);
    const hill = (col, amp, base, seed) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 160); for (let i = 0; i <= 2048; i += 8) { const u = i / 2048; const land = Math.max(0, Math.sin(u * Math.PI * 2 * 1 + .4)) * .8 + .2; const h = base + land * (amp * (.6 + .4 * Math.sin(i * .011 + seed) * Math.sin(i * .004 + seed * 2))); x.lineTo(i, 160 - h); } x.lineTo(2048, 160); x.fill(); };
    hill('#1c1633', 46, 5, 1); hill('#151128', 30, 3, 3);
    // grattacieli della città di terraferma
    for (let k = 0; k < 60; k++) { const u = .05 + r() * .35, bw = 4 + Math.floor(r() * 8), bh = 10 + Math.floor(r() * 46); const bxp = Math.floor(u * 2048); x.fillStyle = '#18132c'; x.fillRect(bxp, 150 - bh, bw, bh + 10); for (let wy = 150 - bh + 2; wy < 152; wy += 3) for (let wx = bxp + 1; wx < bxp + bw - 1; wx += 2) if (r() < .45) { x.fillStyle = r() < .75 ? 'rgba(255,200,130,.95)' : pick(r, ['rgba(255,90,180,.95)', 'rgba(90,230,255,.95)']); x.fillRect(wx, wy, 1, 1); } }
    for (let i = 0; i < 1400; i++) { const u = r(); x.fillStyle = r() < .8 ? 'rgba(255,200,120,.9)' : 'rgba(160,190,255,.9)'; x.fillRect(Math.floor(u * 2048), 160 - Math.floor(3 + r() * 16), 1, 1); }
    const lx = 1500; x.fillStyle = '#2a2640'; x.fillRect(lx, 100, 5, 55); x.fillRect(lx - 1, 98, 7, 4);
    const t = canvasTex(c); t.wrapS = THREE.RepeatWrapping;
    const geo = new THREE.CylinderGeometry(150, 150, 40, 64, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    m.renderOrder = -1; m.frustumCulled = false; scene.add(m); dyn.skyline = m;
    const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff0c0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    beam.scale.set(6, 6, 1); scene.add(beam); dyn.lanterna = beam;
    buildBackdrop(); buildBridges();
  }
  // la collina dietro il bordo nord della mappa: case a gradoni, palme, il forte, l'antenna
  function buildBackdrop() {
    const r = rng(77), facades = [];
    const pal = ['#e8b87a', '#d97b6a', '#f0d890', '#c96a5a', '#e6c29a', '#f7b6c8', '#9ee6e0', '#c9b6f2', '#d8b98a', '#b8574a'];
    pal.forEach((col, k) => {
      const cv = mk(32, 48), x = cv.getContext('2d'), e = mk(32, 48), ex = e.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, 32, 48);
      x.fillStyle = col; x.fillRect(0, 0, 32, 48); x.fillStyle = shade(col, .75); x.fillRect(0, 0, 32, 2);
      for (let fy = 4; fy < 44; fy += 8) for (let fx = 3; fx < 30; fx += 7) { const lit = r() < .4; x.fillStyle = lit ? '#ffcf7a' : pick(r, ['#2f5a3e', '#23222e', '#3d6b4f']); x.fillRect(fx, fy, 4, 5); if (lit) { ex.fillStyle = r() < .85 ? '#ffc070' : '#ff5aa8'; ex.fillRect(fx, fy, 4, 5); } }
      facades.push(std({ map: canvasTex(cv), emissiveMap: canvasTex(e), emissive: '#ffffff', emissiveIntensity: 1 }));
    });
    dyn.backdropMats = facades;
    const roofM = sm('#8a4a3a'), slate = sm('#4a5270'), hillM = sm('#2c3a2a'), rockM = sm('#5a5058');
    // pendio
    const hg = new THREE.PlaneGeometry(240, 70, 24, 8); hg.rotateX(-Math.PI / 2);
    const hp = hg.attributes.position; for (let i = 0; i < hp.count; i++) { const z = hp.getZ(i) + 35; const d = 70 - z; hp.setY(i, 6 + Math.max(0, d) * .55 + Math.sin(hp.getX(i) * .05) * 3 * (d / 70) + (r() - .5) * 1.2); }
    hg.computeVertexNormals();
    const hill = new THREE.Mesh(hg, hillM); hill.position.set(G.WW / 2, 0, -35); hill.receiveShadow = true; scene.add(hill);
    // le mura sul bordo nord: sostengono la collina
    const wt = stoneTexture().clone(); wt.needsUpdate = true; wt.repeat.set(60, 2);
    const cw = box(G.WW - 6, 8, 1.2, std({ map: wt, roughness: .95 })); cw.position.set(G.WW / 2, 3, -.6); cw.receiveShadow = true; scene.add(cw);
    const cap = box(G.WW - 6, .3, 1.6, sm('#c9bba2')); cap.position.set(G.WW / 2, 7.1, -.6); addStatic(cap);
    // case a gradoni
    for (let i = 0; i < 170; i++) {
      const xx = 8 + r() * (G.WW - 16), zz = -3 - r() * 56, d = -zz;
      const gy = 6 + d * .55 + Math.sin(xx * .05) * 3 * (d / 70) - 1.5;
      const w = 4 + r() * 6, dd = 4 + r() * 5, h = 6 + Math.floor(r() * 4) * 3;
      const b = box(w, h, dd, pick(r, facades)); b.position.set(xx, gy + h / 2, zz); b.rotation.y = (r() - .5) * .25; addStatic(b);
      const rf = box(w + .4, .5, dd + .4, r() < .6 ? roofM : slate); rf.position.set(xx, gy + h + .2, zz); rf.rotation.y = b.rotation.y; addStatic(rf);
    }
    for (let i = 0; i < 40; i++) { const xx = 8 + r() * (G.WW - 16), zz = -6 - r() * 50, d = -zz, gy = 6 + d * .55; addStatic(palmTree(xx, gy - .5, zz, r)); }
    // il forte sulla cima e l'antenna con la luce rossa
    const fort = new THREE.Group(); const fb = box(26, 8, 12, sm('#b8a88a')); fb.position.y = 4; fort.add(fb);
    for (let k = 0; k < 9; k++) { const mer = box(1.4, 1.2, 1.4, sm('#b8a88a')); mer.position.set(-12 + k * 3, 8.6, 6); fort.add(mer); }
    const tw = cyl(3, 3.4, 12, 10, sm('#c2b294')); tw.position.set(11, 6, 0); fort.add(tw);
    fort.position.set(G.WW * .42, 6 + 60 * .55 - 1, -58); addStatic(fort);
    const ant = box(.4, 22, .4, sl('#2a2a32')); ant.position.set(G.WW * .7, 6 + 55 * .55 + 11, -55); addStatic(ant);
    const red = new THREE.Mesh(new THREE.SphereGeometry(.5, 6, 4), sb('#ff2a2a')); red.position.set(G.WW * .7, 6 + 55 * .55 + 22.2, -55); scene.add(red);
    dyn.antenna = glow(G.WW * .7, 6 + 55 * .55 + 22.2, -55, '#ff3030', 5, false);
    // la scogliera ai due lati dell'isola
    for (let k = 0; k < 60; k++) { const side = k % 2, xx = side ? G.WW - 8 + r() * 4 : 1 + r() * 5, zz = r() * 46; if (zz > 44 && zz < 54) continue; const s = 1 + r() * 2.2; const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); rk.position.set(xx, -.4 + s * .3, zz); rk.scale.set(1, .6 + r() * .4, 1); rk.rotation.set(r() * 3, r() * 3, 0); addStatic(rk); }
  }
  // i ponti della Via al Mare verso la terraferma
  function buildBridges() {
    const deck = std({ color: '#3a3640' }), side = sm('#d8d0c4'), pil = sm('#8a8292'), asph = std({ color: '#2a2730', roughness: .8 });
    [[-1, 0], [1, G.WW]].forEach(([dir, x0]) => {
      const L = 160, cx = x0 + dir * L / 2;
      const d = box(L, .7, 6.4, deck); d.position.set(cx, -.36, 49); addStatic(d);
      const a = box(L, .02, 6, asph); a.position.set(cx, .005, 49); addStatic(a, true);
      [45.9, 52.1].forEach(z => { const s = box(L, .9, .25, side); s.position.set(cx, .45, z); addStatic(s); });
      for (let k = 6; k < L; k += 14) {
        const p = box(1.6, 8, 5, pil); p.position.set(x0 + dir * k, -4.5, 49); addStatic(p);
        [45.8, 52.2].forEach(z => { const pole = box(.14, 5, .14, sl('#1e1a24')); pole.position.set(x0 + dir * k, 3, z); addStatic(pole); const hd = box(.5, .18, .3, sb('#ffd08a')); hd.position.set(x0 + dir * k, 5.4, z + (z < 49 ? .4 : -.4)); scene.add(hd); glow(x0 + dir * k, 5.3, z + (z < 49 ? .4 : -.4), '#ffb85c', 3); });
      }
      // la segnaletica «Terraferma»
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ map: signTexture(dir < 0 ? '← PONENTE' : 'LEVANTE →', '#6ad0ff', '#0e2a4a'), toneMapped: false, side: THREE.DoubleSide }));
      sg.position.set(x0 + dir * 10, 5.2, 46.2); sg.rotation.y = Math.PI / 2 * dir; scene.add(sg);
      const sp = box(.12, 5, .12, sl('#1e1a24')); sp.position.set(x0 + dir * 10, 2.5, 46); addStatic(sp);
    });
  }

  // ---------------- EDIFICI ----------------
  const STYLE = ['#d99a62', '#c4604e', '#7f98bc', '#5a5478', '#e2c08e', '#a8759a', '#86aa84', '#b06a4e', '#cdbba2', '#e2d6c0', '#c9d0d8', '#5a4a42',
    '#3a2a5a', '#e8d6b0', '#e6a5a0', '#9fd8d0', '#f4f0e6', '#7fd6e0', '#e8b87a', '#d97b6a', '#f0d890', '#c96a5a', '#e6c29a', '#f7b6c8', '#9ee6e0', '#f6e7b0', '#c9b6f2', '#f2c6a0', '#f4e8d0'];
  const SHUTTER = ['#2f6a44', '#3d7b55', '#5a3b2a', '#2f5a6a', '#346e4a'];
  const faceOf = b => !b.door ? 'S' : b.door[1] === b.y + b.h ? 'S' : b.door[0] === b.x + b.w ? 'E' : b.door[1] === b.y - 1 ? 'N' : 'W';

  // facciata dipinta: borgo, caruggi e Ponente (finte cornici alla genovese sulle case della collina)
  function facade(b, face, Wm, Hm, seed, plinth) {
    const r = rng(seed), cw = Math.round(Wm * PPM), ch = Math.round(Hm * PPM), pl = Math.round(plinth * PPM), gb = ch - pl;
    const c = mk(cw, ch), x = c.getContext('2d'), e = mk(cw, ch), ex = e.getContext('2d');
    const base = STYLE[b.style % STYLE.length], painted = b.zone === 'alta' || b.zone === 'ponente';
    ex.fillStyle = '#000'; ex.fillRect(0, 0, cw, ch);
    x.fillStyle = base; x.fillRect(0, 0, cw, ch);
    for (let i = 0; i < cw * ch / 18; i++) { x.fillStyle = r() < .5 ? shade(base, .9) : shade(base, 1.07); x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 1 + Math.floor(r() * 2), 1); }
    for (let i = 0; i < cw / 6; i++) { const sx = Math.floor(r() * cw), sy = Math.floor(r() * gb * .6), len = 6 + Math.floor(r() * 20); x.fillStyle = 'rgba(30,20,30,.12)'; x.fillRect(sx, sy, 1, len); }
    const g = x.createLinearGradient(0, gb * .55, 0, gb); g.addColorStop(0, 'rgba(20,15,30,0)'); g.addColorStop(1, 'rgba(20,15,30,.3)'); x.fillStyle = g; x.fillRect(0, 0, cw, gb);
    const FH = 3 * PPM, floors = Math.floor((Hm - plinth) / 3);
    // basamento in pietra sotto il piano terra (case sulla terrazza)
    if (pl > 0) { for (let yy = gb; yy < ch; yy += 4) for (let xx = ((yy / 4) % 2) * 4; xx < cw; xx += 8) { x.fillStyle = pick(r, ['#8a7866', '#9a8672', '#7c6a5a', '#a08c74']); x.fillRect(xx, yy, 7, 3); } }
    for (let f = 1; f < floors; f++) { const y = gb - f * FH; x.fillStyle = shade(base, 1.18); x.fillRect(0, y, cw, 1); x.fillStyle = shade(base, .72); x.fillRect(0, y + 1, cw, 1); }
    x.fillStyle = shade(base, 1.25); x.fillRect(0, 0, cw, 3); x.fillStyle = shade(base, .6); x.fillRect(0, 3, cw, 1);
    if (painted) { // lesene dipinte agli angoli e fascia sotto il tetto
      x.fillStyle = shade(base, 1.22); x.fillRect(0, 0, 4, gb); x.fillRect(cw - 4, 0, 4, gb);
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(4, 0, 1, gb); x.fillRect(cw - 5, 0, 1, gb);
      for (let k = 6; k < cw - 6; k += 6) { x.fillStyle = shade(base, .8); x.fillRect(k, 5, 3, 3); }
    }
    // piano terra: zoccolo in pietra
    x.fillStyle = b.church ? '#c9bba2' : '#2e2839'; x.fillRect(0, gb - FH, cw, FH);
    if (!b.church) for (let yy = gb - FH; yy < gb; yy += 4) for (let xx = ((yy / 4) % 2) * 3; xx < cw; xx += 6) { x.fillStyle = pick(r, painted ? ['#8a7a6a', '#7e6e60', '#968676'] : ['#3a3346', '#342e40', '#403850']); x.fillRect(xx, yy, 5, 3); }
    const doorOn = b.door && faceOf(b) === face;
    let doorX = -1;
    if (doorOn) { const lt = face === 'S' ? b.door[0] - b.x : face === 'N' ? b.x + b.w - 1 - b.door[0] : face === 'E' ? b.y + b.h - 1 - b.door[1] : b.door[1] - b.y; doorX = (lt * TS + TS / 2) * PPM; }
    if (!doorOn && !b.church && r() < .6 && cw > 24) doorX = -2; // portoncino secondario
    const shops = [], glass = [];
    if (doorX >= 0) {
      const dw = 10, dh = 19;
      x.fillStyle = shade(base, 1.3); x.fillRect(doorX - dw / 2 - 3, gb - dh - 3, dw + 6, dh + 3);
      x.fillStyle = '#1a1210'; x.fillRect(doorX - dw / 2 - 1, gb - dh - 1, dw + 2, dh + 1);
      x.fillStyle = b.shop || b.sign ? '#3a2a20' : '#5a3a26'; x.fillRect(doorX - dw / 2, gb - dh, dw, dh);
      x.fillStyle = '#271a14'; x.fillRect(doorX, gb - dh, 1, dh);
      if (b.sign || b.shop) { ex.fillStyle = '#ffc070'; ex.fillRect(doorX - dw / 2 + 1, gb - dh + 1, dw - 2, 7); x.fillStyle = '#e0a060'; x.fillRect(doorX - dw / 2 + 1, gb - dh + 1, dw - 2, 7); }
      if (b.sign || b.shop) shops.push(doorX + (doorX + 22 < cw ? 16 : -16));
      if (b.sign && cw > 40) shops.push(doorX + (doorX - 30 > 0 ? -30 : 30));
    }
    if (doorX === -2) { const dx = 8 + Math.floor(r() * (cw - 16)); x.fillStyle = '#1a1210'; x.fillRect(dx - 5, gb - 18, 10, 18); x.fillStyle = pick(r, ['#4a2e20', '#2f4a3a', '#3a2a4a']); x.fillRect(dx - 4, gb - 17, 8, 17); x.fillStyle = '#c8a040'; x.fillRect(dx + 2, gb - 9, 1, 1); }
    if (b.church && face === faceOf(b)) {
      const cx = cw / 2; x.fillStyle = '#9b8b74'; x.fillRect(cx - 12, gb - 30, 24, 30); x.fillStyle = '#2b1d16'; x.fillRect(cx - 9, gb - 26, 18, 26);
      x.fillStyle = '#9b8b74'; x.beginPath(); x.arc(cx, gb - 62, 11, 0, 7); x.fill();
      ex.fillStyle = '#ffb060'; ex.beginPath(); ex.arc(cx, gb - 62, 8, 0, 7); ex.fill();
      x.fillStyle = '#c4703c'; x.beginPath(); x.arc(cx, gb - 62, 8, 0, 7); x.fill();
      x.fillStyle = '#6a2d2d'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.fillRect(cx + Math.cos(a) * 4, gb - 62 + Math.sin(a) * 4, 2, 2); }
      [cx - 40, cx + 40].forEach(wx => { if (wx < 6 || wx > cw - 6) return; x.fillStyle = '#9b8b74'; x.fillRect(wx - 5, gb - 70, 10, 28); x.fillStyle = '#233040'; x.fillRect(wx - 3, gb - 67, 6, 24); ex.fillStyle = '#6a88ff'; ex.fillRect(wx - 3, gb - 67, 6, 24); });
      // fasce bianche e nere del gotico genovese
      for (let yy = 8; yy < gb - 76; yy += 6) { x.fillStyle = 'rgba(30,30,40,.35)'; x.fillRect(0, yy, cw, 3); }
      return { map: canvasTex(c), emissive: canvasTex(e) };
    }
    // vetrine con la merce e le luci accese
    shops.forEach(sx => {
      if (sx < 10 || sx > cw - 10) return;
      x.fillStyle = '#1a1410'; x.fillRect(sx - 9, gb - 18, 18, 14);
      x.fillStyle = '#d99a52'; x.fillRect(sx - 8, gb - 17, 16, 12); ex.fillStyle = '#ffb45c'; ex.fillRect(sx - 8, gb - 17, 16, 12); glass.push({ x: sx - 8, y: gb - 17, w: 16, h: 12, shop: true });
      x.fillStyle = 'rgba(60,30,20,.6)'; x.fillRect(sx - 8, gb - 10, 16, 1);
      for (let k = 0; k < 5; k++) { x.fillStyle = pick(r, ['#7a3b2a', '#3b6a3b', '#c9b04a', '#6a2a4a', '#2a4a8a', '#e8e0d0']); x.fillRect(sx - 7 + k * 3, gb - 9, 2, 3); x.fillRect(sx - 7 + k * 3, gb - 15, 2, 4); }
    });
    // manifesti, scritte e targhe
    if (!b.warehouse) for (let i = 0; i < 4; i++) { const px = Math.floor(r() * (cw - 8)); if (Math.abs(px - doorX) < 10) continue; const k = r(); if (k < .4) { x.fillStyle = pick(r, ['#e8ddc0', '#d95a4a', '#f0c060', '#6ac0e0', '#f080b0']); x.fillRect(px, gb - 18, 6, 8); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 1, gb - 16, 4, 1); x.fillRect(px + 1, gb - 14, 3, 1); x.fillRect(px + 1, gb - 12, 4, 2); } else if (k < .75) { x.fillStyle = pick(r, ['rgba(255,80,160,.6)', 'rgba(80,220,255,.5)', 'rgba(255,255,255,.4)', 'rgba(255,220,60,.5)']); for (let q = 0; q < 8; q++) x.fillRect(px + q, gb - 12 + Math.round(Math.sin(q * 1.3) * 2), 1, 2); } else { x.fillStyle = '#e8e4da'; x.fillRect(px, gb - FH + 4, 8, 3); x.fillStyle = '#2a4a8a'; x.fillRect(px + 1, gb - FH + 5, 6, 1); } }
    // finestre dei piani superiori
    const cols = Math.max(1, Math.floor(Wm / (painted ? 2.0 : 2.2)));
    for (let f = 1; f < floors; f++) for (let k = 0; k < cols; k++) {
      const wx = Math.round((k + .5) * cw / cols) - 4, wy = gb - f * FH - FH + 6;
      if (b.warehouse) { if (f === 1 && k % 2 === 0) { x.fillStyle = '#2a2f36'; x.fillRect(wx, wy + 4, 8, 4); } continue; }
      // cornice (in rilievo o dipinta)
      x.fillStyle = shade(base, painted ? 1.35 : 1.25); x.fillRect(wx - 2, wy - 3, 12, 17); x.fillRect(wx - 3, wy + 13, 14, 2);
      if (painted) { x.fillStyle = shade(base, 1.1); x.fillRect(wx - 3, wy - 5, 14, 2); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(wx + 10, wy - 3, 1, 17); }
      const state = r(), lit0 = r() < .4;
      x.fillStyle = '#1b1a26'; x.fillRect(wx, wy, 8, 12);
      if (state < .35) { x.fillStyle = pick(r, SHUTTER); x.fillRect(wx, wy, 8, 12); x.fillStyle = 'rgba(0,0,0,.35)'; for (let s = 1; s < 12; s += 2) x.fillRect(wx, wy + s, 8, 1); x.fillRect(wx + 4, wy, 1, 12); }
      else {
        const sc = pick(r, SHUTTER);
        x.fillStyle = sc; x.fillRect(wx - 4, wy, 3, 12); x.fillRect(wx + 9, wy, 3, 12); x.fillStyle = 'rgba(0,0,0,.3)'; for (let s = 1; s < 12; s += 2) { x.fillRect(wx - 4, wy + s, 3, 1); x.fillRect(wx + 9, wy + s, 3, 1); }
        if (lit0 || r() < .45) { const warm = r() < .78; const col = warm ? pick(r, ['#ffcf7a', '#ffb45c', '#ffd89a']) : pick(r, ['#86b4ff', '#ff7ac0', '#7affd8']); ex.fillStyle = col; ex.fillRect(wx, wy, 8, 12); x.fillStyle = shade(col, .55); x.fillRect(wx, wy, 8, 12); if (r() < .4) { x.fillStyle = '#20151a'; x.fillRect(wx + 1, wy + 5, 3, 7); ex.fillStyle = '#000'; ex.fillRect(wx + 1, wy + 5, 3, 7); } if (r() < .3) { x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(wx, wy, 8, 2); ex.fillStyle = '#ffffff'; ex.fillRect(wx, wy, 8, 1); } }
        else { x.fillStyle = '#23222e'; x.fillRect(wx, wy, 8, 12); x.fillStyle = 'rgba(160,170,210,.2)'; x.fillRect(wx + 1, wy + 1, 2, 4); }
        x.fillStyle = shade(base, .5); x.fillRect(wx + 3, wy, 1, 12); x.fillRect(wx, wy + 5, 8, 1);
        glass.push({ x: wx, y: wy, w: 8, h: 12 });
      }
      if (r() < .35) { x.fillStyle = '#7a3a2a'; x.fillRect(wx - 1, wy + 11, 10, 2); for (let q = 0; q < 4; q++) { x.fillStyle = pick(r, ['#e0405a', '#f0c040', '#e060d0', '#ff7040']); x.fillRect(wx + q * 2, wy + 9, 1, 2); } x.fillStyle = '#3a7a3a'; x.fillRect(wx + 1, wy + 10, 1, 1); x.fillRect(wx + 5, wy + 10, 1, 1); }
      if (r() < .08) { x.fillStyle = '#e8e8e8'; x.fillRect(wx + 2, wy - 2, 4, 1); } // condizionatore
    }
    return { map: canvasTex(c), emissive: canvasTex(e), glass };
  }

  // facciata art déco del Lungomare: pastello, fasce orizzontali, finestre a nastro e oblò
  function decoFacade(b, face, Wm, Hm, seed) {
    const r = rng(seed), cw = Math.round(Wm * PPM), ch = Math.round(Hm * PPM);
    const c = mk(cw, ch), x = c.getContext('2d'), e = mk(cw, ch), ex = e.getContext('2d');
    const base = STYLE[b.style % STYLE.length], neon = b.sign ? b.sign.c : '#35e6ff', front = face === faceOf(b);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, cw, ch);
    x.fillStyle = base; x.fillRect(0, 0, cw, ch);
    for (let i = 0; i < cw * ch / 30; i++) { x.fillStyle = r() < .5 ? shade(base, .95) : shade(base, 1.04); x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 1, 1); }
    const FH = 3 * PPM, floors = Math.round(Hm / 3), glass = [];
    x.fillStyle = shade(base, 1.12); x.fillRect(0, 0, cw, 5); x.fillStyle = shade(base, .8); x.fillRect(0, 5, cw, 1);
    // colonne verticali di finestre di vetrocemento al centro
    const cols = Math.max(2, Math.floor(Wm / 2.4));
    for (let f = 1; f < floors; f++) {
      const y = ch - f * FH - FH;
      x.fillStyle = '#f6f2ea'; x.fillRect(0, y + FH - 3, cw, 2);
      x.fillStyle = shade(base, .75); x.fillRect(0, y + FH - 1, cw, 1);
      for (let k = 0; k < cols; k++) {
        const wx = Math.round((k + .5) * cw / cols) - 6, wy = y + 7;
        const round = (k + f) % 5 === 0 && !front;
        if (round) { x.fillStyle = '#f6f2ea'; x.beginPath(); x.arc(wx + 6, wy + 5, 5, 0, 7); x.fill(); const lit = r() < .5; x.fillStyle = lit ? '#ffd89a' : '#2a4a5a'; x.beginPath(); x.arc(wx + 6, wy + 5, 3.5, 0, 7); x.fill(); if (lit) { ex.fillStyle = '#ffc070'; ex.beginPath(); ex.arc(wx + 6, wy + 5, 3.5, 0, 7); ex.fill(); } continue; }
        x.fillStyle = '#f6f2ea'; x.fillRect(wx - 1, wy - 1, 14, 11);
        const lit = r() < .42, col = lit ? pick(r, ['#ffd89a', '#ffc070', '#ffb0d8', '#9af0ff']) : pick(r, ['#2a4a5a', '#24424f', '#305868']);
        x.fillStyle = col; x.fillRect(wx, wy, 12, 9); if (lit) { ex.fillStyle = col; ex.fillRect(wx, wy, 12, 9); } glass.push({ x: wx, y: wy, w: 12, h: 9 });
        x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(wx, wy, 12, 1); x.fillStyle = '#f6f2ea'; x.fillRect(wx + 6, wy, 1, 9);
        if (!lit && r() < .4) { x.fillStyle = pick(r, ['#f080a0', '#80d0f0', '#f0e080']); x.fillRect(wx, wy, 12, 3); } // tenda veneziana
      }
    }
    // piano terra: vetrate, ingresso con pensilina
    const gy = ch - FH;
    x.fillStyle = shade(base, .85); x.fillRect(0, gy, cw, FH);
    for (let k = 4; k < cw - 4; k += 14) { x.fillStyle = '#1e2a34'; x.fillRect(k, gy + 5, 11, FH - 7); glass.push({ x: k + 1, y: gy + 6, w: 9, h: FH - 9, shop: true }); const lit = front || r() < .5; if (lit) { const col = pick(r, ['#ffd0a0', '#ffe0b8', '#ffc4e0']); x.fillStyle = col; x.fillRect(k + 1, gy + 6, 9, FH - 9); ex.fillStyle = col; ex.fillRect(k + 1, gy + 6, 9, FH - 9); x.fillStyle = 'rgba(80,40,60,.5)'; x.fillRect(k + 2, gy + FH - 9, 3, 6); x.fillRect(k + 6, gy + FH - 11, 2, 8); } }
    if (front && b.door) { const lt = face === 'S' ? b.door[0] - b.x : face === 'N' ? b.x + b.w - 1 - b.door[0] : face === 'E' ? b.y + b.h - 1 - b.door[1] : b.door[1] - b.y; const dx = (lt * TS + TS / 2) * PPM; x.fillStyle = '#f6f2ea'; x.fillRect(dx - 9, gy + 1, 18, FH - 1); x.fillStyle = '#ffe8c0'; x.fillRect(dx - 7, gy + 4, 14, FH - 4); ex.fillStyle = '#ffd8a0'; ex.fillRect(dx - 7, gy + 4, 14, FH - 4); x.fillStyle = '#c8a060'; x.fillRect(dx, gy + 4, 1, FH - 4); }
    // fasce verticali decorative ai lati
    x.fillStyle = shade(base, 1.15); x.fillRect(0, 0, 3, ch); x.fillRect(cw - 3, 0, 3, ch);
    x.fillStyle = neon; ex.fillStyle = neon; x.fillRect(0, gy - 2, cw, 1); ex.fillRect(0, gy - 2, cw, 1);
    return { map: canvasTex(c), emissive: canvasTex(e), glass };
  }

  function roofGeo(w, d, h) { // tetto a capanna lungo l'asse x
    const g = new THREE.BufferGeometry(), hw = w / 2, hd = d / 2;
    const v = [
      -hw, 0, -hd, hw, 0, -hd, hw, h, 0, -hw, 0, -hd, hw, h, 0, -hw, h, 0,
      -hw, 0, hd, -hw, h, 0, hw, h, 0, -hw, 0, hd, hw, h, 0, hw, 0, hd,
      -hw, 0, -hd, -hw, h, 0, -hw, 0, hd, hw, 0, -hd, hw, 0, hd, hw, h, 0,
    ];
    const uv = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, .5, 1, 1, 0, 0, 0, 1, 0, .5, 1];
    for (let t = 0; t < v.length / 9; t++) { for (let k = 0; k < 3; k++) { const a = t * 9 + 3 + k, b = t * 9 + 6 + k; [v[a], v[b]] = [v[b], v[a]]; } const a = t * 6 + 2, b = t * 6 + 4; [uv[a], uv[b]] = [uv[b], uv[a]];[uv[a + 1], uv[b + 1]] = [uv[b + 1], uv[a + 1]]; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  }
  let slateTex = null, tinTex = null, cotTex = null;
  function roofTextures() {
    // [inverno] ardesia sotto la neve: si vedono solo le file più scure dove la neve è scivolata
    const c = mk(64, 64), x = c.getContext('2d'), r = rng(9);
    if (NEVE) { x.fillStyle = '#d8dde4'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { if (r() < .7) continue; x.fillStyle = pick(r, ['#5a6070', '#6a7080', '#7a8090']); x.fillRect(k, y + 2, 5, 1); }
    for (let i = 0; i < 30; i++) { x.fillStyle = pick(r, ['#eef1f5', '#c8ced8']); x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); } }
    else { x.fillStyle = '#343a48'; x.fillRect(0, 0, 64, 64);   // [inverno19] ardesia bagnata
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { x.fillStyle = pick(r, ['#4e5666', '#48505e', '#56606e', '#424a58']); x.fillRect(k, y, 5, 3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(k, y, 5, 1); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(80,96,70,.3)'; x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); } }
    slateTex = canvasTex(c); slateTex.wrapS = slateTex.wrapT = THREE.RepeatWrapping;
    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = NEVE ? '#d0d4da' : '#5e5a56'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = NEVE ? (r() < .5 ? '#6a6560' : '#b8bcc4') : (r() < .5 ? '#4e4a46' : '#706a64'); x2.fillRect(k, 0, 1, 32); } for (let i = 0; i < 20; i++) { x2.fillStyle = 'rgba(140,70,30,.35)'; x2.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 2); }
    tinTex = canvasTex(c2); tinTex.wrapS = tinTex.wrapT = THREE.RepeatWrapping;
    // coppi in cotto
    const c3 = mk(32, 32), x3 = c3.getContext('2d');
    if (NEVE) { x3.fillStyle = '#e2e6ec'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { if (r() < .75) continue; x3.fillStyle = pick(r, ['#8a5a48', '#7a4a3a', '#9a6a56']); x3.fillRect(k, y + 3, 3, 1); }
    for (let i = 0; i < 24; i++) { x3.fillStyle = pick(r, ['#ffffff', '#c6ccd6']); x3.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1); } }
    else { x3.fillStyle = '#5a3428'; x3.fillRect(0, 0, 32, 32);   // [inverno19] coppi scuri e umidi
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { x3.fillStyle = pick(r, ['#8a4e3a', '#7e4634', '#94583e', '#74402e']); x3.fillRect(k, y, 3, 4); x3.fillStyle = 'rgba(255,220,180,.1)'; x3.fillRect(k, y, 1, 4); } }
    cotTex = canvasTex(c3); cotTex.wrapS = cotTex.wrapT = THREE.RepeatWrapping;
  }


  // ---------------- EDIFICI A MODULI (Kenney Building Kit) ----------------
  // Ogni edificio è montato coi moduli del kit sulla griglia di 2 m: un modulo di muro = un lato di casella.
  // Misure vere del kit: muro 2 × 2,4 m, porta 2,1 m, muretto 1,2 m. Piano terra 3,6 m (2,4 + fascia delle insegne),
  // piani sopra 2,4 m. Accanto a una persona di 1,8 m porte, finestre e cornici restano in proporzione.
  // Ordine: ogni edificio ha un solo tipo di finestra, ripetuto su tutti i piani e allineato in colonne.
  // Varietà: la tavolozza del kit si ridipinge edificio per edificio (muro, cornici, tetto, metalli), come le varianti Kenney.
  const MG = 3.6, MF = 2.4;
  const CELL = { wall: 5, wallTop: 7, column: 4, trim: 9, metal: 8 };
  const PALS = {
    // [inverno] intonaci sovietici scrostati: ocra, pistacchio, salmone, azzurro ghiaccio, cemento
    borgo: [['#b8a27c', '#d8d2c6'], ['#9aaa98', '#d4d0c8'], ['#b8907e', '#d8d0c4'], ['#a8a090', '#cfc8bc'], ['#8e9cac', '#d0ccc4'], ['#c4ae7c', '#e0d8c8'], ['#a08068', '#d2c8b6'], ['#8a968a', '#cac4b8'], ['#9c8aa0', '#d4ccd0'], ['#7e8c90', '#c8c6c0'], ['#5a9aa4', '#a8b4b0'], ['#a05c48', '#b8a890'], ['#6e8696', '#9aa4aa'], ['#c8b04c', '#d8d0b0'], ['#7a6a90', '#a8a0b0'], ['#5a8270', '#a8b4a4'], ['#d8d4ca', '#eeeae2'], ['#cfc9bd', '#e6e0d4'], ['#e0dcd2', '#c8c2b6']],   // [inverno24] qualche intonaco bianco
    farm: [['#6e5a48', '#a89478'], ['#7a6450', '#b8a07a'], ['#5e5044', '#9a8a70'], ['#84705a', '#c0b090']],
    port: [['#7f8a8c', '#c9c2b4'], ['#8a6a58', '#cfc6b6'], ['#6a7a6a', '#c8c0aa'], ['#9a8a70', '#d8d0c0']],
    mil: [['#6f7658', '#b8b49a'], ['#7a7a62', '#c2bea4']],
    civic: [['#d8d2c4', '#ffffff'], ['#c9d0d8', '#ffffff'], ['#e6dcc8', '#ffffff']],
  };
  const palTexCache = {};
  function palTex(wall, trim, roof, metal) {
    const key = [wall, trim, roof, metal].join(); if (palTexCache[key]) return palTexCache[key];
    const src = Kit.texOf('bkit/wall'); const img = src.image, c = mk(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const cw = img.width / 16, y0 = img.height * .75, ch = img.height / 4;
    const paint = (cell, col, top, bot) => { const g = x.createLinearGradient(0, y0, 0, y0 + ch); g.addColorStop(0, shade(col, top)); g.addColorStop(1, shade(col, bot)); x.fillStyle = g; x.fillRect(cell * cw, y0, cw, ch); };
    paint(CELL.wall, wall, 1.04, .86); paint(CELL.wallTop, roof, 1, .9); paint(CELL.column, trim, 1, .92); paint(CELL.trim, trim, 1.02, .9); paint(CELL.metal, metal, 1.1, .8);
    const t = new THREE.CanvasTexture(c); t.flipY = src.flipY; t.encoding = src.encoding; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    return (palTexCache[key] = t);
  }
  const palMatCache = {};
  function palMat(p) { const k = p.join(); return palMatCache[k] || (palMatCache[k] = std({ map: palTex(p[0], p[1], p[2], p[3]), roughness: .9 })); }
  // un modulo del kit col materiale dell'edificio. Nel kit il muro sta sul piano yz e guarda verso +x:
  // rot porta +x sulla normale del lato (S: -π/2, N: π/2, E: 0, W: π)
  // i vetri del kit sono mesh a parte (materiale "glass"): diventano il vetro dell'edificio, acceso o spento
  let darkGlass = null;
  function modPiece(grp, name, mat, x, y, z, rot, glass) {
    if (!darkGlass) darkGlass = std({ color: '#2c3850', roughness: .35, metalness: .1, emissive: '#0a0c14', emissiveMap: (litMat('#000'), litTex), emissiveIntensity: 1 });
    const o = Kit.get('bkit/' + name); o.traverse(m => { if (m.isMesh) m.material = m.material.name === 'glass' ? (glass || darkGlass) : mat; });
    o.position.set(x, y, z); o.rotation.y = rot; grp.add(o); return o;
  }
  // finestre accese: un pannello dietro al vetro, si accende di notte con gli altri emissivi
  let litTex = null;
  const litMat = c => { if (!litTex) { const cc = mk(2, 2), x = cc.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 2, 2); litTex = canvasTex(cc); } return std({ color: '#0b0a12', emissive: c, emissiveMap: litTex, emissiveIntensity: 1, roughness: 1 }); };
  const LIT = ['#ffb050', '#ffc470', '#fff0d8', '#ffa040', '#ffc880', '#e4e8ea', '#ffe27a', '#ff9040', '#f0d0a0', '#ffb860'];   // [inverno27] finestre di toni diversi   // [inverno24] finestre calde   // [inverno] fluorescenti malati, ogni tanto un sodio
  // vano luce di ogni modulo: larghezza, altezza, quota del centro (metri, misurati sul kit)
  const WIN = { 'wall-window-square': [.95, 1.35, 1.3], 'wall-window-square-detailed': [.95, 1.35, 1.3], 'wall-window-round': [.95, 1.45, 1.3], 'wall-window-round-detailed': [.95, 1.45, 1.3], 'wall-window-wide-square': [3.1, 1.3, 1.3], 'wall-window-wide-square-detailed': [3.1, 1.3, 1.3], 'wall-window-wide-round': [3.1, 1.4, 1.3], 'wall-window-wide-round-detailed': [3.1, 1.4, 1.3], 'wall-doorway-wide-round': [3.2, 2.1, 1.05], 'wall-doorway-wide-square': [3.2, 2.1, 1.05], 'wall-doorway-square': [1, 2.1, 1.05], 'wall-doorway-round': [1, 2.2, 1.1] };
  function litPanel(piece, name, mat) { const d = WIN[name]; if (!d) return; const p = new THREE.Mesh(new THREE.PlaneGeometry(d[0], d[1]), mat); p.position.set(-.16, d[2], 0); p.rotation.y = Math.PI / 2; piece.add(p); }
  // persiane aperte ai lati della finestra (Liguria)
  const SHUT = ['#2f6a44', '#3d7b55', '#2f5a6a', '#346e4a', '#5a3b2a', '#7a2f2a'];
  function shutters(piece, m) { [-1, 1].forEach(s => { const p = box(.05, 1.35, .42, m); p.position.set(.09, 1.3, s * .72); piece.add(p); }); }
  const xyz = (a, y) => [a[0], y, a[1]];
  function modKind(b) {
    if (b.military) return b.warehouse ? 'port' : 'mil';
    if (b.warehouse) return 'port';
    if (b.farm || b.id === 'masseria' || b.id === 'cantina' || b.id === 'ovile_b' || b.id === 'salinaio') return 'farm';
    if (b.id === 'commissariato' || b.id === 'biblioteca' || b.id === 'ambulatorio') return 'civic';
    return 'borgo';
  }
  // [inverno24] dove va il volto del Garante: un tratto di facciata (lato S o E, non quello della porta) che nasce cieco
  function propPlan(b, i, kind, fl, base, x0, z0, w, d) {
    if (fl < 2) return null;
    const dd = M.world && M.world.districtAt ? M.world.districtAt(x0 + w / 2) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return null;
    const r = rng(i * 733 + 101), civic = kind === 'civic' || kind === 'mil'; if (r() > (civic ? .8 : .34)) return null;
    const T = G.T, open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
    const face = faceOf(b), cand = [];
    if (face !== 'S' && b.w >= 3 && open(b.x + Math.floor(b.w / 2), b.y + b.h + 1)) cand.push({ f: 'S', n: b.w });
    if (face !== 'E' && b.h >= 3 && open(b.x + b.w + 1, b.y + Math.floor(b.h / 2))) cand.push({ f: 'E', n: b.h });
    if (!cand.length) return null;
    const sd = pick(r, cand), H = MG + (fl - 1) * MF, span = Math.max(2, Math.min(sd.n, Math.round((H - .8) * .7 / TS))), k0 = Math.floor((sd.n - span) / 2);
    const mid = (k0 + span / 2) * TS, pw = span * TS - .5, ph = Math.min(H - .8, pw / .7);
    const pos = sd.f === 'S' ? { x: x0 + mid, z: z0 + d, yaw: 0 } : { x: x0 + w, z: z0 + d - mid, yaw: Math.PI / 2 };
    return { f: sd.f, k0, k1: k0 + span, pw, ph, yc: base + .3 + H / 2, ...pos, defaced: r() < .22, top: base + H };
  }
  function buildModular(b, i, base, low, plinth) {
    const r = rng(i * 97 + 11), w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2;
    const kind = modKind(b), P = PALS[kind], pal = P[(i * 7 + (b.style || 0)) % P.length];
    // tetto: in città coppi, qualche ardesia e qualche terrazzo piano; magazzini in lamiera; caserme e palazzi civici piani
    const roofKind = kind === 'port' ? 'tin' : kind === 'mil' || kind === 'civic' ? 'flat' : kind === 'farm' ? 'cotto' : pick(r, ['flat', 'flat', 'flat', 'flat', 'slate', 'slate']);   // [inverno] tetti piatti quasi ovunque
    const mat = palMat([pal[0], pal[1], roofKind === 'flat' ? '#a8a29a' : '#5a5560', kind === 'port' ? '#7a7f88' : '#3a3a44']);
    const fl = Math.max(1, b.fl), hgt = MG + (fl - 1) * MF, top = base + hgt, grp = new THREE.Group();
    const upper = kind === 'port' ? 'wall-window-wide-square' : kind === 'civic' ? 'wall-window-round-detailed' : kind === 'mil' ? 'wall-window-square' : kind === 'farm' ? 'wall-window-square' : pick(r, ['wall-window-square-detailed', 'wall-window-square-detailed', 'wall-window-square', 'wall-window-round-detailed']);
    const lit = litMat(pick(r, LIT)), litShop = litMat('#ffd890'), dark = std({ color: '#100c16', roughness: 1 });
    const shutM = null; // [inverno] niente persiane liguri
    const face0 = faceOf(b);
    const PP = b.__prop !== undefined ? b.__prop : (b.__prop = propPlan(b, i, kind, fl, base, x0, z0, w, d)); b.__top = top; b.__gwall = {};   // [inverno24]
    const inMural = (sd, k, y) => PP && PP.f === sd.f && k >= PP.k0 && k < PP.k1;   // tutta l'altezza: piano terra compreso
    const sides = [
      { f: 'S', n: b.w, rot: -Math.PI / 2, at: k => [x0 + k * TS + 1, z0 + d], tile: k => [b.x + k, b.y + b.h] },
      { f: 'N', n: b.w, rot: Math.PI / 2, at: k => [x0 + w - k * TS - 1, z0], tile: k => [b.x + b.w - 1 - k, b.y - 1] },
      { f: 'E', n: b.h, rot: 0, at: k => [x0 + w, z0 + d - k * TS - 1], tile: k => [b.x + b.w, b.y + b.h - 1 - k] },
      { f: 'W', n: b.h, rot: Math.PI, at: k => [x0, z0 + k * TS + 1], tile: k => [b.x - 1, b.y + k] },
    ];
    const row = (name, sd, y) => { for (let k = 0; k < sd.n; k++) { if (inMural(sd, k, y)) continue; modPiece(grp, name, mat, ...xyz(sd.at(k), y), sd.rot); } };
    sides.forEach(sd => {
      let doorK = -1;
      if (b.door && face0 === sd.f) for (let k = 0; k < sd.n; k++) { const t = sd.tile(k); if (t[0] === b.door[0] && t[1] === b.door[1]) doorK = k; }
      const shop = (b.shop || b.sign) && doorK >= 0, front = sd.f === face0;
      // piano terra: porta (vetrina larga per negozi e magazzini), finestre sul davanti, muro pieno dietro
      const used = new Set(), ground = [];
      if (doorK >= 0) {
        if ((shop || b.warehouse) && sd.n >= 2) { const k2 = doorK + 1 < sd.n ? doorK : doorK - 1; ground.push([k2, b.warehouse ? 'wall-doorway-wide-square' : 'wall-doorway-wide-round', 2]); used.add(k2); used.add(k2 + 1); }
        else { ground.push([doorK, kind === 'civic' ? 'wall-doorway-round' : 'wall-doorway-square', 1]); used.add(doorK); }
      }
      for (let k = 0; k < sd.n; k++) if (!used.has(k)) ground.push([k, inMural(sd, k, base) ? 'wall' : (front || sd.f === 'S' || sd.f === 'E') && (k % 2 === (doorK + 1) % 2 || kind === 'civic') ? 'wall-window-square' : 'wall', 1]);
      // nota: sul piano terra le finestre si alternano col muro pieno, partendo dalla porta (ritmo regolare)
      ground.forEach(([k, name, span]) => {
        const isWin = name.includes('window'), gm = shop ? litShop : (r() < .3 ? lit : null); if (name === 'wall') for (let s2 = 0; s2 < span; s2++) if (!inMural(sd, k + s2, base)) (b.__gwall[sd.f] = b.__gwall[sd.f] || []).push(k + s2);
        const pc = modPiece(grp, name, mat, ...xyz(span === 2 ? sd.at(k + .5) : sd.at(k), base), sd.rot, isWin ? gm : null);
        if (name === 'wall-doorway-square' || name === 'wall-doorway-round') { const dr = Kit.get('bkit/door-rotate-square-a'); dr.traverse(m => { if (m.isMesh) m.material = mat; }); dr.position.set(-.06, 0, -.46); pc.add(dr); }
        if (name.includes('doorway')) litPanel(pc, name, shop || b.warehouse ? litShop : dark);
        { const N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[sd.f], q = span === 2 ? sd.at(k + .5) : sd.at(k);   // [inverno30] luce che esce
          if (name.includes('doorway') && shop) addSpill(q[0] + N[0] * .7, q[1] + N[1] * .7, N[0], N[1], '#ffc070', 2.2, 7);
          else if (isWin && gm) addSpill(q[0] + N[0] * .6, q[1] + N[1] * .6, N[0], N[1], gm === litShop ? '#ffc880' : '#ffb060', 1.1, 5); }
        if (shutM && name === 'wall-window-square') shutters(pc, shutM);
        for (let s = 0; s < span; s++) modPiece(grp, 'wall-low', mat, ...xyz(sd.at(k + s), base + MF), sd.rot);
      });
      row('border', sd, base + MG - .02);
      // piani superiori: lo stesso modulo su tutta la colonna
      const wide = upper.includes('wide');
      for (let f = 1; f < fl; f++) {
        const y = base + MG + (f - 1) * MF;
        if (wide) {
          let k = 0;
          if (sd.n % 2 === 1) { modPiece(grp, 'wall', mat, ...xyz(sd.at(0), y), sd.rot); k = 1; }
          for (; k + 1 < sd.n; k += 2) { if (inMural(sd, k, y) || inMural(sd, k + 1, y)) { modPiece(grp, 'wall', mat, ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', mat, ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, mat, ...xyz(sd.at(k + .5), y), sd.rot, r() < .35 ? lit : null); }
        } else for (let k = 0; k < sd.n; k++) {
          // sul retro (nord e ovest, visti solo quando la camera gira) una finestra semplice ogni due moduli
          const back = sd.f === 'N' || sd.f === 'W', nm = inMural(sd, k, y) ? 'wall' : back ? (k % 2 ? 'wall' : 'wall-window-square') : upper;
          const pc = modPiece(grp, nm, mat, ...xyz(sd.at(k), y), sd.rot, r() < .3 ? lit : null);
          if (nm !== 'wall' && shutM && !back) shutters(pc, shutM);
        }
        if (f < fl - 1) row('border', sd, y + MF - .02);
      }
    });
    // lesene agli spigoli, grondaia su uno spigolo, nucleo scuro dietro le finestre
    [[x0, z0], [x0 + w, z0], [x0, z0 + d], [x0 + w, z0 + d]].forEach(([px, pz], q) => {
      for (let y = 0; y < hgt - .01; y += MF) { const c = Kit.get('bkit/column-thin'); c.traverse(m => { if (m.isMesh) m.material = mat; }); c.position.set(px, base + y, pz); c.scale.y = Math.min(1, (hgt - y) / MF); grp.add(c); }
      if (q === 3 && roofKind !== 'flat') { const gt = Kit.get('bkit/gutter-vertical'); gt.traverse(m => { if (m.isMesh) m.material = mat; }); gt.position.set(px + .28, base, pz + .28); gt.scale.y = hgt / 2; grp.add(gt); }
    });
    const core = box(w - .5, hgt - .1, d - .5, dark); core.position.set(cx, base + hgt / 2, cz); grp.add(core);
    if (roofKind === 'flat') {
      const deck = box(w, .12, d, std({ map: (() => { const t = flatRoofTex().clone(); t.needsUpdate = true; t.repeat.set(w / 4, d / 4); return t; })(), roughness: .95, color: '#9c968e' })); deck.position.set(cx, top + .02, cz); grp.add(deck);
      sides.forEach(sd => row('border-high', sd, top));
      const tank = cyl(.7, .7, 1.4, 10, sm('#9a948a')); tank.position.set(cx + (r() - .5) * w * .4, top + .8, cz + (r() - .5) * d * .4); grp.add(tank);
      if (kind === 'borgo' && r() < .6) { // terrazzo: vasi e un filo di bucato
        for (let k = 0; k < 4; k++) { const pt = box(.35, .35, .35, sm('#9a5236')); pt.position.set(x0 + .6 + r() * (w - 1.2), top + .25, z0 + .6 + r() * (d - 1.2)); grp.add(pt); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 0), sl(pick(r, ['#3f6a3a', '#4f7a3a', '#c43c52', '#e0b030']))); pl.position.copy(pt.position); pl.position.y += .3; grp.add(pl); }
      }
    } else {
      const along = w >= d, rh = roofKind === 'tin' ? 1.4 : Math.min(2.8, (along ? d : w) * .26);
      const tex = roofKind === 'tin' ? tinTex : roofKind === 'slate' ? slateTex : cotTex;
      const rm = std({ map: tex.clone(), color: roofKind === 'tin' ? (kind === 'mil' ? '#7a8068' : '#8a8290') : '#ffffff', emissive: '#0c0e14' }); rm.map.needsUpdate = true; rm.map.repeat.set((along ? w : d) / 4, 2);
      const roof = new THREE.Mesh(roofGeo(along ? w + .5 : d + .5, along ? d + .5 : w + .5, rh), rm);
      if (!along) roof.rotation.y = Math.PI / 2; roof.position.set(cx, top, cz); roof.userData.keep = true; grp.add(roof);
      if (roofKind !== 'tin') {
        for (let k = 0; k < 1 + Math.floor(r() * 2); k++) { const chm = box(.6, 1.4, .6, sm('#7e6a60')); chm.position.set(cx + (r() - .5) * w * .6, top + rh * .6 + .4, cz + (r() - .5) * d * .4); const cap = box(.8, .15, .8, sm('#3a3038')); cap.position.copy(chm.position); cap.position.y += .75; grp.add(chm, cap); }
        if (r() < .6) { const ant = box(.06, 2.2, .06, sl('#1b1b22')); ant.position.set(cx + (r() - .5) * w * .5, top + rh + 1, cz); const bar = box(1.4, .05, .05, sl('#1b1b22')); bar.position.copy(ant.position); bar.position.y += .7; grp.add(ant, bar); }
      }
    }
    // balconi ai piani alti, sui lati che si vedono, allineati alle finestre
    if (kind === 'borgo') {
      const ok = (px, pz) => { const v = G.tileAt(Math.floor(px / TS), Math.floor(pz / TS)); return v !== G.T.BLD; };
      for (let f = 1; f < fl; f++) {
        if (r() < .55) { const k = Math.floor(r() * b.w), bx = x0 + k * TS + 1; if (ok(bx, z0 + d + 1)) addBalcony(grp, bx, base + MG + (f - 1) * MF - .06, z0 + d, 1.8, 'S', r); }
        if (r() < .4) { const k = Math.floor(r() * b.h), bz = z0 + k * TS + 1; if (ok(x0 + w + 1, bz)) addBalcony(grp, x0 + w, base + MG + (f - 1) * MF - .06, bz, 1.8, 'E', r); }
      }
    }
    if (plinth > 0) { const pl = box(w + .2, plinth + .1, d + .2, std({ map: stoneTexture() })); pl.position.set(cx, low + plinth / 2, cz); grp.add(pl); }
    shadowed(grp);
    const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);
    const rec = { b, flat: roofKind === 'flat', grp: merged, fade: 0, box3: new THREE.Box3(new THREE.Vector3(x0 + .3, low, z0 + .3), new THREE.Vector3(x0 + w - .3, top + 2.5, z0 + d - .3)), mats: [] };
    ownMats(merged, rec); dyn.buildings.push(rec);
    rec.geo = { x0, z0, w, d, y0: base, H: hgt }; DZ.bRec[i] = rec;
    if (b.sign) addSign(b, base, w, d, x0, z0, top, base + 3.0, base + 2.55);
  }

  let flatTex = null;
  function flatRoofTex() { // lastrico del tetto piano: mattonelle, catrame, scarichi
    if (flatTex) return flatTex;
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(21);
    x.fillStyle = NEVE ? '#c8ccd4' : '#3e3c42'; x.fillRect(0, 0, 32, 32);   // [inverno19] guaina e quadrotti di cemento, bagnati
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = NEVE ? pick(r, ['#dce0e6', '#d2d6de', '#e4e8ee', '#c0c4cc']) : pick(r, ['#58565c', '#504e54', '#5e5c60', '#4a484e']); x.fillRect(k, y, 7, 7); }
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(20,16,24,.45)'; x.fillRect(Math.floor(r() * 28), Math.floor(r() * 28), 3 + Math.floor(r() * 5), 2); }
    x.fillStyle = '#2a2430'; x.fillRect(14, 14, 3, 3);
    flatTex = canvasTex(c); flatTex.wrapS = flatTex.wrapT = THREE.RepeatWrapping; return flatTex;
  }
  function signTexture(text, color, bg) { color = nq(color);
    const c = mk(256, 64), x = c.getContext('2d');
    x.fillStyle = bg || '#0f0c16'; x.fillRect(0, 0, 256, 64);
    x.strokeStyle = color; x.lineWidth = 3; x.strokeRect(5, 5, 246, 54);
    let size = text.length > 10 ? 26 : 34;
    x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    while (size > 12 && x.measureText(text).width > 232) { size -= 2; x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; }
    x.shadowColor = color; x.shadowBlur = 14; x.fillStyle = color; x.fillText(text, 128, 34);
    x.shadowBlur = 0; x.fillStyle = '#fff'; x.globalAlpha = .55; x.fillText(text, 128, 34); x.globalAlpha = 1;
    return canvasTex(c);
  }
  // insegna verticale a bandiera (lettere una sotto l'altra), tipica degli hotel déco
  function bladeTexture(text, color) {
    const t = text.replace(/HOTEL /, ''), n = t.length, c = mk(48, 40 * n + 16), x = c.getContext('2d');
    x.fillStyle = '#12101c'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = color; x.lineWidth = 3; x.strokeRect(4, 4, 40, c.height - 8);
    x.font = 'bold 32px "Pixelify Sans", "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < n; i++) { x.shadowColor = color; x.shadowBlur = 10; x.fillStyle = color; x.fillText(t[i], 24, 28 + i * 40); x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText(t[i], 24, 28 + i * 40); }
    return canvasTex(c);
  }

  // luci: tante sorgenti registrate, poche PointLight vere assegnate alle più vicine alla camera
  const LSRC = [];
  function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(tone(color, x, z)), base: intensity, dist: distance, flick: flick || 0, phase: Math.random() * 10 }; LSRC.push(rec);
    if (zoneAt(x, z) === 'regime' && rec.flick < .25 && (Math.floor(x * 3 + z * 5) & 3) === 0) rec.flick = .6;   // [luci1] neon della caserma che sfarfalla
    return rec; }
  let glowTex = null;
  function glowTexture() {
    if (!glowTex) { const c = mk(32, 32), gx = c.getContext('2d'), gr = gx.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 32, 32); glowTex = new THREE.CanvasTexture(c); }
    return glowTex;
  }
  function glow(x, y, z, color, size, add) { color = tone(color, x, z); size *= .65;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8, fog: false }));
    s.position.set(x, y, z); s.scale.set(size, size, 1); scene.add(s); if (add !== false) dyn.flicker.push({ s, base: .8 }); return s;
  }
  // tubo al neon: scatola sottile che brilla, con alone
  function neonTube(x0, y0, z0, x1, y1, z1, color, parent) {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0); const m = box(.07, .07, len, sb(color)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.lookAt(x1, y1, z1); m.userData.keep = true; (parent || scene).add(m);
    for (let k = 0; k <= len; k += 4) { const t = len ? k / len : 0; const g = glow(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, color, 1.4); g.material.opacity = .5; dyn.flicker[dyn.flicker.length - 1].base = .45; }
    return m;
  }

  function buildBuildings() {
    roofTextures();
    G.BUILDINGS.forEach((b, i) => {
      const w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS, cx = x0 + w / 2, cz = z0 + d / 2;
      // quota: il pavimento è la quota più alta sotto l'edificio, il basamento scende fino al terreno più basso intorno
      let base = 0, low = 99;
      for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) base = Math.max(base, tileElev(tx, ty));
      for (let ty = b.y - 1; ty <= b.y + b.h; ty++) for (let tx = b.x - 1; tx <= b.x + b.w; tx++) { if (ty >= b.y && ty < b.y + b.h && tx >= b.x && tx < b.x + b.w) continue; const v = G.tileAt(tx, ty); if (v === G.T.BLD || v === G.T.WATER) continue; low = Math.min(low, groundH(tx * TS + 1, ty * TS + 1)); }
      if (low > 50) low = base; low = Math.min(low, base);
      const plinth = base - low, hgt = b.fl * 3;
      b.base = base;
      if (b.lighthouse) { buildLighthouse(b, cx, cz, base); return; }
      if (b.kiosk) { buildKiosk(b, i, cx, cz, base, w, d); return; }
      if (b.id === 'rocca') { buildFortress(b, cx, cz, base, low, w, d); return; }
      if (Kit.ready && !b.deco && !b.church && !b.lighthouse && !b.kiosk) { buildModular(b, i, base, low, plinth); return; }
      const grp = new THREE.Group();
      const fac = (f, W2) => b.deco ? decoFacade(b, f, W2, hgt, i * 7 + f.charCodeAt(0)) : facade(b, f, W2, hgt + plinth, i * 7 + f.charCodeAt(0), plinth);
      const fS = fac('S', w), fE = fac('E', d), fN = fac('N', w), fW = fac('W', d);
      const mat = f => std({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1, color: b.military ? '#a8b090' : '#ffffff' });
      let roofTopM;
      if (b.deco) { const rtx = flatRoofTex().clone(); rtx.needsUpdate = true; rtx.repeat.set(w / 4, d / 4); roofTopM = std({ map: rtx, roughness: .95, color: '#9c968e' }); }
      else roofTopM = std({ color: '#241f2e' });
      const mats = [mat(fE), mat(fW), roofTopM, roofTopM, mat(fS), mat(fN)];
      const bodyH = b.deco ? hgt : hgt + plinth;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, bodyH, d), mats); body.position.set(cx, (b.deco ? base : low) + bodyH / 2, cz); grp.add(body);
      if (b.deco && plinth > 0) { const pl = box(w, plinth + .1, d, std({ map: stoneTexture() })); pl.position.set(cx, low + plinth / 2, cz); grp.add(pl); }
      const top = base + hgt;
      const r = rng(i * 13 + 5);
      if (b.warehouse) {
        const tm = std({ map: tinTex.clone(), color: '#8a8290' }); tm.map.needsUpdate = true; tm.map.repeat.set(w / 4, d / 4);
        const roof = new THREE.Mesh(roofGeo(w + .6, d + .6, 1.4), tm); roof.position.set(cx, top, cz); grp.add(roof);
        // portellone e pluviali
        const face = faceOf(b), dz = face === 'S' ? z0 + d + .05 : z0 - .05;
        if (face === 'S' || face === 'N') { const door = box(Math.min(5, w - 2), 3.6, .1, sm('#6a7078')); door.position.set(cx, base + 1.8, dz); grp.add(door); for (let k = 0; k < 8; k++) { const l = box(Math.min(5, w - 2), .05, .12, sl('#4a5058')); l.position.set(cx, base + .3 + k * .45, dz); grp.add(l); } }
        [x0 + .2, x0 + w - .2].forEach(px => { const p = box(.14, hgt, .14, sl('#3a3a42')); p.position.set(px, base + hgt / 2, z0 + d + .1); grp.add(p); });
      } else if (b.deco) {
        // corpo déco: angoli tondi, fasce aggettanti, parapetto a gradoni, neon
        const col = STYLE[b.style % STYLE.length], wallM = sm(col), bandM = sm('#f6f2ea'), neon = b.sign ? b.sign.c : '#35e6ff';
        const face = faceOf(b), fs = face === 'S' ? 1 : face === 'N' ? -1 : 0, fe = face === 'E' ? 1 : face === 'W' ? -1 : 0;
        const fz = fs ? cz + fs * d / 2 : cz, fx = fe ? cx + fe * w / 2 : cx;
        const corners = fs ? [[x0 + .9, fz - fs * .9], [x0 + w - .9, fz - fs * .9]] : [[fx - fe * .9, z0 + .9], [fx - fe * .9, z0 + d - .9]];
        corners.forEach(([kx, kz]) => {
          const tw = cyl(1.3, 1.3, hgt + 1.2, 14, wallM); tw.position.set(kx, base + (hgt + 1.2) / 2, kz); grp.add(tw);
          for (let f = 1; f <= b.fl; f++) { const ring = cyl(1.42, 1.42, .14, 14, bandM); ring.position.set(kx, base + f * 3 - .1, kz); grp.add(ring); }
          neonTube(kx, base + 3, kz + (fs ? fs * 1.36 : 0), kx, base + hgt + 1.1, kz + (fs ? fs * 1.36 : 0), neon, grp);
        });
        // cornicioni sopra le finestre
        for (let f = 1; f < b.fl; f++) {
          const y = base + f * 3 + .9;
          if (fs) { const l = box(w - 1.6, .12, .55, bandM); l.position.set(cx, y, fz + fs * .27); grp.add(l); } else { const l = box(.55, .12, d - 1.6, bandM); l.position.set(fx + fe * .27, y, cz); grp.add(l); }
        }
        // parapetto e gradoni sul tetto
        [[cx, z0, w + .2, .35], [cx, z0 + d, w + .2, .35], [x0, cz, .35, d + .2], [x0 + w, cz, .35, d + .2]].forEach(([px, pz, pw, pd]) => { const e = box(pw, 1, pd, wallM); e.position.set(px, top + .5, pz); grp.add(e); });
        [[cx, z0 - .0, w + .4, .5], [cx, z0 + d, w + .4, .5], [x0, cz, .5, d + .4], [x0 + w, cz, .5, d + .4]].forEach(([px, pz, pw, pd]) => { const e = box(pw, .14, pd, bandM); e.position.set(px, top + 1.05, pz); grp.add(e); });
        const zig1 = box(fs ? w * .45 : 1.2, 1.4, fs ? 1.2 : d * .45, wallM); zig1.position.set(fs ? cx : fx - fe * .6, top + 1.7, fs ? fz - fs * .6 : cz); grp.add(zig1);
        const zig2 = box(fs ? w * .25 : 1, 1.2, fs ? 1 : d * .25, bandM); zig2.position.set(fs ? cx : fx - fe * .5, top + 2.9, fs ? fz - fs * .5 : cz); grp.add(zig2);
        if (fs) neonTube(x0 + .9, top + 1.12, fz + fs * .25, x0 + w - .9, top + 1.12, fz + fs * .25, neon, grp);
        else neonTube(fx + fe * .25, top + 1.12, z0 + .9, fx + fe * .25, top + 1.12, z0 + d - .9, neon, grp);
        // pensilina sull'ingresso
        if (b.door && b.fl > 1) {
          const dx = b.door[0] * TS + 1, dz = b.door[1] * TS + 1;
          const can = box(fs ? 4 : 1.6, .22, fs ? 1.6 : 4, bandM); can.position.set(fs ? dx : fx + fe * .8, base + 3.1, fs ? fz + fs * .8 : dz); grp.add(can);
          const ul = box(fs ? 3.6 : .08, .05, fs ? .08 : 3.6, sb(neon)); ul.position.set(fs ? dx : fx + fe * 1.58, base + 2.98, fs ? fz + fs * 1.58 : dz); ul.userData.keep = true; grp.add(ul);
          addLight(fs ? dx : fx + fe * 1.4, base + 2.6, fs ? fz + fs * 1.4 : dz, '#ffd8a8', 2.2, 8, 0);
        }
        // serbatoio dell'acqua e condizionatori sul tetto
        const tank = cyl(.8, .8, 1.6, 10, sm('#9a948a')); tank.position.set(cx + (r() - .5) * w * .4, top + 2.2, cz + (r() - .5) * d * .4); grp.add(tank);
        for (let k = 0; k < 2; k++) { const ac = box(1, .7, .8, sm('#c8c8c0')); ac.position.set(cx + (r() - .5) * w * .6, top + 1.4, cz + (r() - .5) * d * .6); grp.add(ac); }
      } else {
        const along = w >= d, rh = Math.min(3.2, (along ? d : w) * .28);
        const tex = b.zone === 'ponente' ? cotTex : slateTex;
        const rm = std({ map: tex.clone(), color: b.church ? '#c07a5e' : '#ffffff', emissive: '#141a30' }); rm.map.needsUpdate = true; rm.map.repeat.set((along ? w : d) / 4, 2);
        const roof = new THREE.Mesh(roofGeo(along ? w + .5 : d + .5, along ? d + .5 : w + .5, rh), rm);
        if (!along) roof.rotation.y = Math.PI / 2;
        roof.position.set(cx, top, cz); roof.userData.keep = true; grp.add(roof);
        for (let k = 0; k < 1 + Math.floor(r() * 3); k++) { const chm = box(.6, 1.4, .6, sm('#7e6a60')); chm.position.set(cx + (r() - .5) * w * .7, top + rh * .6 + .5, cz + (r() - .5) * d * .5); const cap = box(.8, .15, .8, sm('#3a3038')); cap.position.copy(chm.position); cap.position.y += .75; grp.add(chm, cap); }
        if (r() < .7) { const ant = box(.06, 2.2, .06, sl('#1b1b22')); ant.position.set(cx + (r() - .5) * w * .5, top + rh + 1, cz); const bar = box(1.4, .05, .05, sl('#1b1b22')); bar.position.copy(ant.position); bar.position.y += .7; grp.add(ant, bar); }
        if (r() < .35 && !b.church) { // altana: terrazzino sul tetto con i vasi
          const al = box(2.2, .12, 2.2, sm('#b8ae9e')); al.position.set(cx + (along ? w * .25 : 0), top + rh * .55, cz + (along ? 0 : d * .25)); grp.add(al);
          for (let k = 0; k < 3; k++) { const pot = box(.3, .3, .3, sm('#9a5236')); pot.position.set(al.position.x - .7 + k * .7, al.position.y + .2, al.position.z + .8); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), sl(pick(r, ['#3f6a3a', '#e0408a', '#4f7a3f']))); pl.position.copy(pot.position); pl.position.y += .3; grp.add(pot, pl); }
        }
      }
      if (b.church) {
        const tH = hgt + 7, bx = b.id === 'santuario' ? x0 + w - 1.5 : x0 + w - 1.5, bz = z0 + 1.5;
        const tw = box(3, tH, 3, sm(b.id === 'santuario' ? '#f0e4cc' : '#cbbd9f')); tw.position.set(bx, base + tH / 2, bz); grp.add(tw);
        const bell = box(3.1, 2, 3.1, sl('#1c1822')); bell.position.set(bx, base + hgt + 5, bz); grp.add(bell);
        for (let k = -1; k <= 1; k += 2) { const arch = box(1, 1.6, 3.15, sm('#f0e4cc')); arch.position.set(bx + k * 1.05, base + hgt + 5, bz); grp.add(arch); }
        const pyr = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3, 4), sm(b.id === 'santuario' ? '#3a7a8a' : '#7a4d3e')); pyr.rotation.y = Math.PI / 4; pyr.position.set(bx, base + hgt + 8.5, bz); grp.add(pyr);
        const cross = box(.15, 1.2, .15, sl('#d8c690')); cross.position.set(bx, base + hgt + 10.5, bz); grp.add(cross);
        const clock = new THREE.Mesh(new THREE.CircleGeometry(.6, 12), sb('#fff2c8')); clock.position.set(bx, base + hgt + 2.5, bz + 1.52); grp.add(clock);
        if (b.id === 'santuario') { const sg = new THREE.Mesh(new THREE.SphereGeometry(.2, 6, 4), sb('#ffe0a0')); sg.position.set(bx, base + hgt + 5, bz); grp.add(sg); addLight(bx, base + hgt + 5, bz, '#ffd090', 3, 16, 0).always = true; }
      }
      // balconi
      const rb = rng(i * 31 + 3);
      if (!b.warehouse && !b.church && !b.deco) {
        const ok = (px, pz) => { const tx = Math.floor(px / TS), ty = Math.floor(pz / TS), v = G.tileAt(tx, ty); return v !== G.T.BLD; };
        for (let f = 2; f < b.fl; f++) {
          if (rb() < .6) { const bw = 1.8 + rb() * 1.5, bx = cx + (rb() - .5) * (w - bw - .6); if (ok(bx, z0 + d + 1)) addBalcony(grp, bx, base + f * 3 - 2.25, z0 + d, bw, 'S', rb); }
          if (rb() < .45) { const bw = 1.6 + rb() * 1.2, bz = cz + (rb() - .5) * (d - bw - .6); if (ok(x0 + w + 1, bz)) addBalcony(grp, x0 + w, base + f * 3 - 2.25, bz, bw, 'E', rb); }
        }
      }
      if (b.deco && !b.warehouse) { // balconcini curvi déco sui lati
        for (let f = 2; f < b.fl; f += 2) { const face = faceOf(b); if (face === 'S') { const bl = cyl(1.2, 1.2, .14, 12, sm('#f6f2ea')); bl.scale.set(1.6, 1, .6); bl.position.set(cx, base + f * 3 - 2.9, z0 + d + .2); grp.add(bl); const rail = cyl(1.22, 1.22, .06, 12, sl('#e8e8e8')); rail.scale.set(1.6, 1, .6); rail.position.set(cx, base + f * 3 - 2.1, z0 + d + .2); grp.add(rail); } }
      }
      shadowed(grp);
      const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);
      const rec = { b, grp: merged, fade: 0, box3: new THREE.Box3(new THREE.Vector3(x0 + .3, low, z0 + .3), new THREE.Vector3(x0 + w - .3, top + (b.warehouse ? 1 : b.church ? 3.5 : 3.3), z0 + d - .3)), mats: [] };
      // ogni edificio ha i suoi materiali: quando diventa trasparente non deve trascinarsi dietro gli altri
      ownMats(merged, rec);
      dyn.buildings.push(rec);
      rec.faces = { S: fS, E: fE, N: fN, W: fW }; rec.geo = { x0, z0, w, d, y0: body.position.y - bodyH / 2, H: bodyH }; DZ.bRec[i] = rec;
      if (b.sign) addSign(b, base, w, d, x0, z0, top);
    });
  }
  // ogni edificio ha i suoi materiali: quando diventa trasparente non deve trascinarsi dietro gli altri
  function ownMats(merged, rec) {
    const cache = new Map();
    merged.traverse(o => { if (o.isMesh && !Array.isArray(o.material)) { if (!cache.has(o.material)) cache.set(o.material, o.material.clone()); o.material = cache.get(o.material); } });
    merged.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (!rec.mats.includes(m)) rec.mats.push(m); }); } });
  }
  function addSign(b, base, w, d, x0, z0, top, signY, awnY) {
    const face = faceOf(b);
    const dx = b.door[0] * TS + TS / 2, dz = b.door[1] * TS + TS / 2;
    if (b.deco && b.fl >= 4) { // insegna verticale a bandiera sull'angolo
      const tex = bladeTexture(b.sign.t, b.sign.c), n = b.sign.t.replace(/HOTEL /, '').length, hh = Math.min(b.fl * 3 - 4, n * 1.1);
      const sm2 = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
      const blade = new THREE.Mesh(new THREE.BoxGeometry(.25, hh, 1.2), [sm2, sm2, sb('#12101c'), sb('#12101c'), sb('#12101c'), sb('#12101c')]);
      const px = face === 'S' || face === 'N' ? dx + 2.6 : (face === 'E' ? x0 + w + .7 : x0 - .7), pz = face === 'S' ? z0 + d + .7 : face === 'N' ? z0 - .7 : dz + 2.6;
      blade.position.set(px, base + 4 + hh / 2, pz); blade.rotation.y = face === 'E' || face === 'W' ? Math.PI / 2 : 0;
      scene.add(blade);
      const lr = addLight(px, base + 4 + hh / 2, pz, b.sign.c, 3.6, 14, 0); lr.always = true;
      const gl = glow(px, base + 4 + hh / 2, pz, b.sign.c, hh * 1.2); gl.material.opacity = .35;
      dyn.signs.push({ m: sm2, gl, flick: b.id === 'video' });
    }
    const sm1 = new THREE.MeshBasicMaterial({ map: signTexture(b.sign.t, b.sign.c), toneMapped: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .85), sm1);
    let lx = dx, lz = dz;
    const sy = signY || base + 3.5;
    if (face === 'S') { sg.position.set(dx, sy, z0 + d + .06); lz = z0 + d + 1.2; }
    else if (face === 'E') { sg.position.set(x0 + w + .06, sy, dz); sg.rotation.y = Math.PI / 2; lx = x0 + w + 1.2; }
    else {
      sm1.side = THREE.DoubleSide; sg.scale.set(.8, 1.1, 1);
      if (face === 'N') { sg.position.set(dx + 1.5, sy + .2, z0 - .9); sg.rotation.y = Math.PI / 2; lz = z0 - 1.4; lx = dx + 1.5; }
      else { sg.position.set(x0 - .9, sy + .2, dz + 1.5); lx = x0 - 1.4; lz = dz + 1.5; }
      const arm = box(.06, .06, 1.8, sl('#1b1820')); arm.position.copy(sg.position); arm.position.y += .62; if (face === 'W') arm.rotation.y = Math.PI / 2; scene.add(arm);
    }
    if (b.deco && b.fl >= 4 && face === 'S') { sg.position.y = base + 3.35; sg.scale.set(1.2, 1, 1); }
    scene.add(sg);
    const lr = addLight(lx, sy - .3, lz, b.sign.c, 2.2, 8, b.id === 'flipper' || b.id === 'disco' ? .5 : .08); lr.always = true;
    const gl = glow(sg.position.x, sy, sg.position.z, b.sign.c, 5.5); gl.material.opacity = .45;
    dyn.signs.push({ m: sm1, gl, flick: b.id === 'flipper' || b.id === 'magazzino' || b.id === 'video' });
    if ((b.shop || b.id === 'osteria' || b.id === 'gabbiano') && (face === 'S' || face === 'E' || face === 'N')) addAwning(dx, dz, face, b, w, d, base, awnY);
  }
  function addBalcony(grp, x, y, z, bw, face, r) {
    const deep = .7, slab = box(face === 'S' ? bw : deep, .12, face === 'S' ? deep : bw, sm('#b8ae9e'));
    const railMat = sl('#1e1a24');
    const pots = () => { if (r() < .7) for (let k = 0; k < 1 + Math.floor(r() * 3); k++) { const pot = box(.28, .28, .28, sm('#9a5236')); const o = (r() - .5) * bw * .8; if (face === 'S') pot.position.set(x + o, y + .2, z + deep - .2); else pot.position.set(x + deep - .2, y + .2, z + o); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(.25, 0), sl(pick(r, ['#3f6a3a', '#4f7a3f', '#e0405a', '#f0c040', '#e060c0']))); pl.position.copy(pot.position); pl.position.y += .28; grp.add(pot, pl); } };
    if (face === 'S') { slab.position.set(x, y, z + deep / 2); const rail = box(bw, .05, .05, railMat); rail.position.set(x, y + .8, z + deep); grp.add(rail); for (let k = 0; k <= bw / .3; k++) { const p = box(.04, .8, .04, railMat); p.position.set(x - bw / 2 + k * .3, y + .4, z + deep); grp.add(p); } }
    else { slab.position.set(x + deep / 2, y, z); const rail = box(.05, .05, bw, railMat); rail.position.set(x + deep, y + .8, z); grp.add(rail); for (let k = 0; k <= bw / .3; k++) { const p = box(.04, .8, .04, railMat); p.position.set(x + deep, y + .4, z - bw / 2 + k * .3); grp.add(p); } }
    pots(); grp.add(slab);
    if (r() < .25) { const t = box(face === 'S' ? bw : .05, .5, face === 'S' ? .05 : bw, sl(pick(r, ['#e8e2d4', '#d05a5a', '#5a8ad0']))); if (face === 'S') t.position.set(x, y + .55, z + deep + .03); else t.position.set(x + deep + .03, y + .55, z); grp.add(t); }
  }
  // smorza un colore: meno saturo e più scuro (tende, merce, cartelli: roba vecchia, scolorita dal sale e dal gelo)
  function mute(hex, k) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); c.setHSL(h.h, h.s * k, h.l * .78); return '#' + c.getHexString(); }
  function stripeTex(a, b) { a = mute(a, .4); b = mute(b, .4); const c = mk(16, 8), x = c.getContext('2d'); for (let k = 0; k < 16; k += 4) { x.fillStyle = a; x.fillRect(k, 0, 2, 8); x.fillStyle = b; x.fillRect(k + 2, 0, 2, 8); } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 6, 16, 2); return canvasTex(c); }
  const stripeCache = {};
  const stripeMat = (a, b) => stripeCache[a + b] || (stripeCache[a + b] = std({ map: stripeTex(a, b) }));
  function addAwning(dx, dz, face, b, w, d, base, awnY) {
    const cols = { bar: ['#b0283c', '#e9e0cf'], wu: ['#c22a2a', '#e8c040'], osteria: ['#2f5a3e', '#e9e0cf'], sirena: ['#8a7a66', '#d8d0c2'], gelateria: ['#f07aa8', '#f8f0e0'], gabbiano: ['#3a6aa8', '#f4f0e6'], car_2: ['#c8502a', '#f0e0c0'] }[b.id] || ['#3a4a7a', '#e9e0cf'];
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, .1, 1.1), stripeMat(cols[0], cols[1]));
    const x0 = b.x * TS, z0 = b.y * TS, y = awnY || base + 3.0;
    if (face === 'S') { m.position.set(dx + 1.4, y, z0 + d + .5); m.rotation.x = .35; }
    else if (face === 'N') { m.position.set(dx + 1.4, y, z0 - .5); m.rotation.x = -.35; }
    else if (face === 'E') { m.rotation.y = Math.PI / 2; m.position.set(x0 + w + .5, y, dz); m.rotation.z = -.35; }
    const val = box(3.0, .25, .02, stripeMat(cols[1], cols[0])); val.position.set(0, -.12, .55); m.add(val);
    m.castShadow = true; addStatic(m);
  }


  // la Rocca della Tutela: mura a scarpa, torri d'angolo, mastio con l'insegna, fari che spazzano
  function buildFortress(b, cx, cz, base, low, w, d) {
    const g = new THREE.Group(), st = stoneTexture().clone(); st.needsUpdate = true; st.repeat.set(6, 2);
    const wallM = std({ map: st, color: '#b8b0a4' }), darkM = sm('#3a3440'), concM = sm('#8e8a84');
    const H = 9, y0 = low - base, th = 1.6;
    // mura perimetrali
    [[0, -d / 2 + th / 2, w, th], [0, d / 2 - th / 2, w, th], [-w / 2 + th / 2, 0, th, d], [w / 2 - th / 2, 0, th, d]].forEach(([x, z, ww, dd]) => {
      const m = box(ww, H - y0, dd, wallM); m.position.set(x, (H + y0) / 2, z); g.add(m);
      const n = Math.floor(Math.max(ww, dd) / 1.6);
      for (let k = 0; k < n; k += 2) { const t = (k + .5) / n - .5, mer = box(ww > dd ? .9 : dd > ww ? th : .9, .9, ww > dd ? th : .9, wallM); mer.position.set(x + (ww > dd ? t * ww : 0), H + .45, z + (ww > dd ? 0 : t * dd)); g.add(mer); }
    });
    const scarp = box(w + 1.2, 2, d + 1.2, wallM); scarp.position.y = y0 + 1; g.add(scarp);
    // torri d'angolo
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const t = cyl(2.4, 2.8, H + 3 - y0, 10, wallM); t.position.set(sx * w / 2, (H + 3 + y0) / 2, sz * d / 2); g.add(t);
      const cap = cyl(2.7, 2.4, .8, 10, wallM); cap.position.set(sx * w / 2, H + 3.4, sz * d / 2); g.add(cap);
      const sl = box(.3, 1.2, .3, darkM); sl.position.set(sx * w / 2 + sx * 2.5, H + 1, sz * d / 2); g.add(sl);
      const lamp = cyl(.35, .45, .6, 8, new THREE.MeshBasicMaterial({ color: '#fff6d8', toneMapped: false })); lamp.position.set(sx * w / 2, H + 4.2, sz * d / 2); lamp.userData.keep = true; g.add(lamp);
    });
    // cortile in cemento e mastio
    const yard = box(w - 2 * th, .2, d - 2 * th, concM); yard.position.y = .1; g.add(yard);
    const kw = w * .42, kd = d * .5, KH = 16;
    const keep = box(kw, KH, kd, std({ map: st, color: '#a8a096' })); keep.position.set(0, KH / 2, -d * .12); g.add(keep);
    for (let fl = 1; fl < 5; fl++) for (let k = -2; k <= 2; k++) { const wn = box(.5, 1.1, .1, new THREE.MeshBasicMaterial({ color: fl % 2 ? '#ffd890' : '#2a2430', toneMapped: false })); wn.position.set(k * kw / 5.5, fl * 3.2, -d * .12 + kd / 2 + .06); g.add(wn); }
    const kc = box(kw + .6, .6, kd + .6, wallM); kc.position.set(0, KH + .3, -d * .12); g.add(kc);
    const ant = cyl(.08, .12, 9, 6, sm('#4a4a50')); ant.position.set(kw * .3, KH + 4.5, -d * .12); g.add(ant);
    const red = new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff3030', toneMapped: false })); red.position.set(kw * .3, KH + 9, -d * .12); red.userData.keep = true; g.add(red);
    const pole = cyl(.06, .06, 6, 6, sm('#ccc')); pole.position.set(-kw * .3, KH + 3, -d * .12); g.add(pole);
    const flag = box(2.2, 1.3, .04, sm('#b8202a')); flag.position.set(-kw * .3 + 1.1, KH + 5.2, -d * .12); g.add(flag);
    // portone con insegna
    const gate = box(4, 4.5, .4, darkM); gate.position.set(0, 2.25 + y0 * 0, d / 2 + .05); g.add(gate);
    const arch = box(5.4, 1.2, th + .4, wallM); arch.position.set(0, 5.1, d / 2 - th / 2); g.add(arch);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.2), new THREE.MeshBasicMaterial({ map: signTexture('TUTELA', '#ff3b3b'), toneMapped: false }));
    sg.position.set(0, KH - 2.5, -d * .12 + kd / 2 + .08); sg.userData.keep = true; g.add(sg);
    g.position.set(cx, base, cz); shadowed(g); scene.add(g);
    glow(cx, base + KH - 2.5, cz - d * .12 + kd / 2 + 1, '#ff3b3b', 7);
    addLight(cx, base + KH - 2, cz - d * .12 + kd / 2 + 2, '#ff4040', 2.5, 22, 0).always = true;
    // fari di sorveglianza che spazzano il monte
    const bm = new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    [[-1, 1, .35], [1, 1, -.27]].forEach(([sx, sz, sp]) => {
      const p = new THREE.Group(); p.position.set(cx + sx * w / 2, base + H + 4.2, cz + sz * d / 2);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(3, 45, 10, 1, true), bm); cone.rotation.z = Math.PI / 2 + .25; cone.position.x = 22; cone.position.y = -5;
      const sub = new THREE.Group(); sub.add(cone); p.add(sub); scene.add(p); dyn.spin.push({ o: p, speed: sp });
    });
  }

  // il faro di Punta Scogli
  function buildLighthouse(b, cx, cz, base) {
    const c = mk(16, 64), x = c.getContext('2d'); for (let k = 0; k < 64; k += 16) { x.fillStyle = '#f2f0ea'; x.fillRect(0, k, 16, 8); x.fillStyle = '#c8303a'; x.fillRect(0, k + 8, 16, 8); } for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 64), 1, 2); }
    const tm = std({ map: canvasTex(c) });
    const g = new THREE.Group();
    const foot = cyl(2.2, 2.6, 1.2, 12, sm('#8a8078')); foot.position.y = .6; g.add(foot);
    const tower = cyl(1.1, 1.6, 15, 12, tm); tower.position.y = 8.6; g.add(tower);
    const gal = cyl(1.8, 1.8, .2, 12, sl('#2a2a30')); gal.position.y = 16.2; g.add(gal);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, p = box(.05, .8, .05, sl('#2a2a30')); p.position.set(Math.cos(a) * 1.75, 16.6, Math.sin(a) * 1.75); g.add(p); }
    const lamp = cyl(.9, .9, 1.4, 10, new THREE.MeshBasicMaterial({ color: '#fff4c0', toneMapped: false })); lamp.position.y = 17; lamp.userData.keep = true; g.add(lamp);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), sm('#2a3a4a')); dome.position.y = 17.7; g.add(dome);
    const house = box(3, 2.6, 2.4, sm('#f2f0ea')); house.position.set(2.4, 1.3, 1.4); g.add(house);
    const hr = new THREE.Mesh(roofGeo(3.3, 2.7, .8), sm('#c8303a')); hr.position.set(2.4, 2.6, 1.4); g.add(hr);
    g.position.set(cx, base, cz); shadowed(g); scene.add(g);
    glow(cx, base + 17, cz, '#fff0b0', 5);
    addLight(cx, base + 15, cz, '#fff0c0', 3, 20, 0).always = true;
    // il fascio che gira
    const bm = new THREE.MeshBasicMaterial({ color: '#fff4c8', transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const beams = new THREE.Group(); beams.position.set(cx, base + 17, cz);
    [0, Math.PI].forEach(a => { const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 60, 10, 1, true), bm); cone.rotation.z = Math.PI / 2; cone.position.x = 30; const p = new THREE.Group(); p.rotation.y = a; p.add(cone); beams.add(p); });
    scene.add(beams); dyn.spin.push({ o: beams, speed: .9 });
  }
  // chioschi: distributore di benzina e bar della spiaggia
  function buildKiosk(b, i, cx, cz, base, w, d) {
    const g = new THREE.Group(), x0 = b.x * TS, z0 = b.y * TS, neon = b.sign.c;
    if (b.id === 'benzina') {
      const k = box(w - .4, 3, d - .4, sm('#f4f0e6')); k.position.set(cx, 1.5, cz); g.add(k);
      const gl = box(w - .3, 1.6, .06, std({ color: '#ffe8b0', emissive: '#ffd080', emissiveIntensity: .8 })); gl.position.set(cx, 1.4, z0 + d - .18); g.add(gl);
      const band = box(w, .5, d, sm('#e8c030')); band.position.set(cx, 3.2, cz); g.add(band);
      // pensilina sopra le pompe
      const px0 = 16 * TS, px1 = 24 * TS, pz0 = 18 * TS + .4, pz1 = 21 * TS + 1.4;
      const can = box(px1 - px0, .6, pz1 - pz0, sm('#f4f0e6')); can.position.set((px0 + px1) / 2, 4.6, (pz0 + pz1) / 2); g.add(can);
      const edge = box(px1 - px0 + .1, .25, pz1 - pz0 + .1, sm('#d8282a')); edge.position.set((px0 + px1) / 2, 4.3, (pz0 + pz1) / 2); g.add(edge);
      [[px0 + 1.5, pz0 + 1.5], [px1 - 1.5, pz0 + 1.5], [px0 + 1.5, pz1 - 1.5], [px1 - 1.5, pz1 - 1.5]].forEach(([x, z]) => { const p = box(.35, 4.3, .35, sm('#d8d4cc')); p.position.set(x, 2.15, z); g.add(p); });
      neonTube(px0, 4.02, pz1 + .06, px1, 4.02, pz1 + .06, neon, g); neonTube(px0, 4.02, pz0 - .06, px1, 4.02, pz0 - .06, '#ff4a4a', g);
      for (let k = 0; k < 3; k++) addLight(px0 + 3 + k * 5, 3.8, (pz0 + pz1) / 2, '#f4f8ff', 2.4, 9, 0).always = true;
    } else {
      // bar della spiaggia: capanno di legno con tetto a strisce
      const k = box(w - .6, 2.6, d - .6, sm('#c89a6a')); k.position.set(cx, 1.3, cz); g.add(k);
      for (let q = 0; q < 6; q++) { const pl = box(w - .5, .06, .04, sl('#8a6440')); pl.position.set(cx, .3 + q * .42, z0 + d - .28); g.add(pl); }
      const cnt = box(w - .2, 1.1, .6, sm('#e8d8b8')); cnt.position.set(cx, .55, z0 + d + .1); g.add(cnt);
      const roof = new THREE.Mesh(roofGeo(w + 1.4, d + 2, 1.2), stripeMat('#ff8a3c', '#f4f0e6')); roof.position.set(cx, 2.6, cz + .3); roof.userData.keep = true; g.add(roof);
      for (let q = 0; q < 4; q++) { const st = cyl(.2, .16, .8, 6, sm('#d8d0c0')); st.position.set(x0 + 1 + q * 1.8, .4, z0 + d + .8); g.add(st); }
      neonTube(x0 + .3, 2.5, z0 + d + .75, x0 + w - .3, 2.5, z0 + d + .75, neon, g);
      addLight(cx, 2.2, z0 + d + 1.2, '#ffb070', 2.6, 9, .05).always = true;
    }
    shadowed(g); const merged = mergeGroup(g); shadowed(merged); scene.add(merged);
    const sm1 = new THREE.MeshBasicMaterial({ map: signTexture(b.sign.t, b.sign.c), toneMapped: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), sm1);
    if (b.id === 'benzina') { sg.position.set(20 * TS, 4.6, 21 * TS + 1.47); const tot = box(.4, 5, .4, sm('#d8d4cc')); tot.position.set(15.5 * TS, 2.5, 22 * TS); addStatic(tot); const tsg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ map: priceTexture(), toneMapped: false, side: THREE.DoubleSide })); tsg.position.set(15.5 * TS, 5.2, 22 * TS + .22); scene.add(tsg); }
    else sg.position.set(cx, 3.2, z0 + d + 1.3);
    scene.add(sg); glow(sg.position.x, sg.position.y, sg.position.z, b.sign.c, 5).material.opacity = .45;
    dyn.signs.push({ m: sm1, gl: null, flick: false });
    const rec = { b, grp: merged, fade: 0, box3: b.id === 'benzina' ? new THREE.Box3(new THREE.Vector3(32, 0, 36.4), new THREE.Vector3(56, 5, 43.4)) : new THREE.Box3(new THREE.Vector3(x0 + .3, 0, z0 + .3), new THREE.Vector3(x0 + w - .3, 3.2, z0 + d - .3)), mats: [] };
    ownMats(merged, rec); dyn.buildings.push(rec);
  }
  function priceTexture() {
    const c = mk(48, 64), x = c.getContext('2d'); x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, 48, 64); x.fillStyle = '#e8c030'; x.fillRect(0, 0, 48, 16);
    x.fillStyle = '#1a1a1a'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.fillText('BENZINA', 24, 12);
    x.fillStyle = '#2a2a2a'; x.font = 'bold 9px monospace'; x.textAlign = 'left'; x.fillText('SUPER', 3, 30); x.fillText('NORM.', 3, 44); x.fillText('GASOL', 3, 58);
    x.fillStyle = '#d8282a'; x.textAlign = 'right'; x.fillText('1310', 45, 30); x.fillText('1270', 45, 44); x.fillText('720', 45, 58);
    return canvasTex(c);
  }

  // ---------------- LIBRERIA DEGLI OGGETTI DI SCENA ----------------
  // Tutti in metri, costruiti attorno all'origine con la base a y = 0 e il fronte verso +z.
  // Le forme sono esagerate: sotto i 10 cm i dettagli spariscono nella pixel art.
  const PM = {
    wood: () => sm('#7a5236'), woodD: () => sm('#5a3a26'), woodL: () => sm('#a07448'), iron: () => sl('#26242c'), ironG: () => sm('#2f4a3a', { roughness: .6, metalness: .4 }),
    stone: () => sm('#b0a898'), marble: () => sm('#ece6dc', { roughness: .4 }), terra: () => sm('#b25a38'), leaf: () => sl('#2f6a35'), leaf2: () => sl('#3f7e3a'), leaf3: () => sl('#4f8e42'),
    white: () => sm('#f2eee6'), chrome: () => sm('#c8c8d0', { metalness: .7, roughness: .3 }),
  };
  function G0() { return new THREE.Group(); }
  function add(g, mesh, x, y, z, rx, ry, rz) { mesh.position.set(x || 0, y || 0, z || 0); if (rx || ry || rz) mesh.rotation.set(rx || 0, ry || 0, rz || 0); g.add(mesh); return mesh; }
  // piazza un oggetto sul terreno e lo manda alla geometria statica
  function place(o, x, z, rot, live) { o.position.set(x, groundH(x, z), z); o.rotation.y = rot || 0; if (live) { shadowed(o); scene.add(o); DZ.hint = null; } else { const tag = newTag(); curTag = tag; addStatic(o); curTag = null; regProp(o, tag); } return o; }

  // --- lampioni ---
  function streetLamp(x, z, kind, rot) {
    const g = G0(), iron = PM.iron(), y0 = groundH(x, z);
    let lx = 0, ly = 4.2, lz = 0, col = '#ffb35c', lcol = '#ffd08a';
    if (kind === 'deco') { // Lungomare: palo alto con il globo e l'anello al neon
      add(g, cyl(.09, .14, 5, 8, sm('#f2eee6')), 0, 2.5, 0); add(g, cyl(.22, .26, .5, 8, sm('#f2eee6')), 0, .25, 0);
      add(g, cyl(.35, .35, .08, 12, sm('#f2eee6')), 0, 5, 0);
      const globe = add(g, new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), sb('#ffe2b8')), 0, 5.35, 0); globe.userData.keep = true;
      ly = 5.35; col = '#ffb85c'; lcol = '#ffe2b8';   // [luci1] niente globi rosa/ciano
    } else if (kind === 'sodium') { // porto e ponti: palo di cemento, braccio, lampada al sodio
      add(g, box(.18, 6, .18, sm('#8a8680')), 0, 3, 0); add(g, box(1.4, .12, .12, sm('#8a8680')), .6, 6, 0);
      add(g, box(.6, .22, .34, sm('#4a4850')), 1.2, 5.9, 0); add(g, box(.5, .06, .28, sb('#ffc070')), 1.2, 5.78, 0);
      lx = 1.2; ly = 5.7; col = '#ffa84a'; lcol = '#ffc070';
    } else if (kind === 'wall') { // lanterna a muro con la mensola
      add(g, box(.08, .08, .7, iron), 0, 3.9, .35); add(g, box(.34, .1, .34, iron), 0, 4.3, .7); add(g, box(.3, .42, .3, sb(lcol)), 0, 4.0, .7); add(g, box(.36, .08, .36, iron), 0, 3.76, .7);
      lz = .7; ly = 4.0;
    } else { // lampione genovese in ghisa a pastorale
      add(g, cyl(.2, .26, .6, 8, iron), 0, .3, 0); add(g, cyl(.07, .1, 3.8, 8, iron), 0, 2.4, 0);
      add(g, box(.06, .06, .9, iron), 0, 4.25, .42); add(g, box(.06, .4, .06, iron), 0, 4.05, .86);
      const cage = add(g, box(.34, .5, .34, sb(lcol)), 0, 3.7, .86); cage.userData.keep = true;
      add(g, new THREE.Mesh(new THREE.ConeGeometry(.3, .28, 4), iron), 0, 4.08, .86, 0, Math.PI / 4, 0);
      [-1, 1].forEach(s => add(g, box(.03, .5, .03, iron), s * .17, 3.7, .86 + s * .17));
      lz = .86; ly = 3.7;
    }
    const hq = th(Math.round(x), Math.round(z), 71), lampOff = kind !== 'deco' && hq < .33;   // [inverno30] coprifuoco: elettricità razionata
    if (lampOff) g.traverse(o => { if (o.isMesh && o.material === sb(lcol)) o.material = sm('#2e2e34'); });
    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g, true); curTag = null;   // [luci1] niente ombra propria
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
    const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 2.4 : 2.0);
    const L = addLight(wx, y0 + ly - .3, wz, kind === 'deco' ? col : '#ffb35c', kind === 'sodium' ? 2.0 : 1.6, kind === 'sodium' ? 10 : 7.5, !lampOff && hq < .48 ? .75 : .03);
    if (lampOff) { L.off = true; L.base = 0; gl.visible = false; }
    if (tag) { const rec = regProp(g, tag, 'lamp'); if (rec) { rec.light = L; rec.lbase = L.base; rec.glowS = gl; rec.mass = 1.2; rec.fragile = false; } }
    return L;
  }

  // --- alberi ---
  function palmTree(x, y, z, r, hgt) { // [inverno] un abete con la neve sui palchi (le chiamate restano quelle delle palme)
    const g = G0(), h = (hgt || 6 + r() * 3) * .8, dark = sl(pick(r, ['#1e3426', '#24402c', '#1a2e22'])), snow = NEVE ? sl('#e6eaf0') : NOSNOW;
    add(g, cyl(.18, .26, 1.2, 6, sm('#4a3a2c')), 0, .6, 0);
    for (let k = 0; k < 3; k++) { const w = 2.2 * (1 - k * .26), hh = h * .34 * (1 - k * .12), yy = .9 + k * hh * .62; const c = add(g, new THREE.Mesh(new THREE.ConeGeometry(w, hh, 7), dark), 0, yy + hh / 2, 0); const sc = add(g, new THREE.Mesh(new THREE.ConeGeometry(w * .78, hh * .55, 7), snow), 0, yy + hh * .38 + hh * .27, 0); }
    g.position.set(x, y, z); return g;
  }

  function pineTree(x, z, r) { // pino domestico a ombrello
    const g = G0(), h = 7 + r() * 3, tm = sm('#6a4a3a'), lean = (r() - .5) * .3;
    const tr = add(g, cyl(.22, .34, h, 7, tm), Math.sin(lean) * h / 2, h / 2, 0); tr.rotation.z = -lean;
    const tx = Math.sin(lean) * h;
    const cm = [sl('#2a4a2a'), sl('#34583a'), sl('#243f26')];
    for (let k = 0; k < 6; k++) { const a = k * 1.1, rr = k ? 1.6 + r() * .8 : 0; const c = add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + r() * .6, 0), pick(r, cm)), tx + Math.cos(a) * rr, h + .2 + r() * .5, Math.sin(a) * rr); c.scale.set(1.3, .45, 1.3); }
    return place(g, x, z, r() * 6);
  }
  function leafyTree(x, z, r, big) { // [inverno] tiglio spoglio, rami coperti di neve
    const g = G0(), s = big ? 1.3 : 1, tm = sm('#4a3e36'), snow = NEVE ? sl('#e2e6ec') : NOSNOW;
    add(g, cyl(.2 * s, .3 * s, 3 * s, 7, tm), 0, 1.5 * s, 0);
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + r(), br = add(g, cyl(.05 * s, .1 * s, 2 * s, 5, tm), Math.cos(a) * .5 * s, 3.4 * s, Math.sin(a) * .5 * s); br.rotation.set(Math.sin(a) * .6, 0, -Math.cos(a) * .6); }
    add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s, 0), sl('#3a3430')), 0, 4.3 * s, 0).scale.set(1, .6, 1);
    add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), snow), 0, 4.75 * s, 0).scale.set(1, .35, 1);
    add(g, cyl(1.1, 1.1, .3, 10, PM.stone()), 0, .15, 0); add(g, cyl(.95, .95, .31, 10, snow), 0, .16, 0);
    return place(g, x, z, r() * 6);
  }

  function cypress(x, z, r) { DZ.hint = 'static'; const g = G0(); add(g, cyl(.15, .2, 1, 6, sm('#5a4a3a')), 0, .5, 0); const c = add(g, new THREE.Mesh(new THREE.ConeGeometry(.9, 7 + r() * 2, 7), sl('#1f4028')), 0, 4.5, 0); c.scale.set(1, 1, 1); return place(g, x, z); }
  function bush(x, z, r, flower) { DZ.hint = 'plant'; const g = G0(); for (let k = 0; k < 4; k++) add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.5 + r() * .3, 0), k === 3 && flower ? sl(flower) : pick(r, [PM.leaf(), PM.leaf2(), PM.leaf3()])), (r() - .5) * 1, .4 + r() * .4, (r() - .5) * 1); if (flower) for (let k = 0; k < 8; k++) add(g, box(.14, .14, .14, sl(flower)), (r() - .5) * 1.3, .5 + r() * .6, (r() - .5) * 1.3); return place(g, x, z); }
  function agave(x, z, r) { DZ.hint = 'plant'; const g = G0(); for (let k = 0; k < 9; k++) { const l = box(.14, 1.1, .05, sl('#6a9a7a')); l.position.set(0, .45, 0); l.rotation.set(.5 + r() * .3, k * .7, 0); l.translateY(.2); g.add(l); } return place(g, x, z); }

  // --- panchine ---
  function bench(x, z, rot, kind) {
    const g = G0(), slat = kind === 'marble' ? PM.marble() : kind === 'deco' ? sm('#f2eee6') : PM.woodL(), leg = kind === 'deco' ? sm('#f4a6c0') : PM.ironG();
    if (kind === 'marble') { add(g, box(2, .14, .6, slat), 0, .5, 0); [-.7, .7].forEach(o => add(g, box(.2, .45, .5, slat), o, .22, 0)); return place(g, x, z, rot); }
    for (let k = 0; k < 3; k++) add(g, box(2, .06, .16, slat), 0, .48, -.2 + k * .19);
    for (let k = 0; k < 2; k++) add(g, box(2, .14, .05, slat), 0, .72 + k * .2, -.32, -.15, 0, 0);
    [-.85, .85].forEach(o => { add(g, box(.08, .5, .5, leg), o, .25, 0); add(g, box(.08, .52, .06, leg), o, .7, -.3); add(g, box(.08, .06, .5, leg), o, .68, 0); });
    return place(g, x, z, rot);
  }

  // --- bancarelle del mercato ---
  function stall(x, z, rot, ca, cb, goods, r) {
    const g = G0(), wood = PM.wood(), iron = PM.iron();
    add(g, box(2.4, .1, 1.3, PM.woodL()), 0, .9, 0); add(g, box(2.4, .8, .1, wood), 0, .45, .6); add(g, box(2.3, .06, 1.2, wood), 0, .3, 0);
    [[-1.15, -.6], [1.15, -.6], [-1.15, .6], [1.15, .6]].forEach(([ox, oz]) => add(g, box(.07, 2.4, .07, iron), ox, 1.2, oz));
    const top = add(g, box(2.9, .07, 1.9, sm('#4a524e', { roughness: .65, metalness: .45 })), 0, 2.45, .1, .22, 0, 0);
    add(g, box(1.1, .075, 1.0, sm(mute(ca, .5), { roughness: 1 })), -.7, 2.47, .15, .22, 0, 0);   // toppa di telo
    add(g, box(2.9, .3, .03, sm('#26292a', { roughness: .9 })), 0, 2.2, 1.05); add(g, box(.7, .26, .02, sm('#7a1218', { roughness: .9 })), .9, 2.2, 1.07);   // tessera annonaria
    // cassette inclinate con la merce
    for (let k = 0; k < 4; k++) {
      const cx = -.9 + k * .6, crate = add(g, box(.52, .16, .5, PM.woodL()), cx, 1.02, .15, .25, 0, 0);
      const gc = mute(pick(r, goods), .5);
      for (let q = 0; q < 6; q++) add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), sl(gc)), cx - .16 + (q % 3) * .16, 1.16 + (q > 2 ? .04 : 0), .05 + (q > 2 ? .18 : 0));
    }
    // bilancia e cartellini dei prezzi
    add(g, box(.3, .12, .2, PM.white()), .95, 1.02, -.35); add(g, cyl(.14, .14, .03, 8, PM.chrome()), .95, 1.12, -.35);
    for (let k = 0; k < 3; k++) add(g, box(.14, .1, .01, PM.white()), -.8 + k * .7, 1.2, .43);
    // lampadina
    add(g, new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 4), sb('#d6f2ea')), 0, 2.2, 0);
    place(g, x, z, rot);
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    glow(x, groundH(x, z) + 2.2, z, '#8fe0d0', 1.6);
    return g;
  }

  // --- casse, barili, fusti ---
  function crate(x, z, rot, goods, y) {
    const g = G0(), wm = PM.woodL(), dm = PM.woodD();
    add(g, box(.9, .7, .9, wm), 0, .35, 0);
    for (let k = 0; k < 3; k++) [.46, -.46].forEach(s => { add(g, box(.92, .06, .03, dm), 0, .12 + k * .23, s); add(g, box(.03, .06, .92, dm), s, .12 + k * .23, 0); });
    [[.44, .44], [-.44, .44], [.44, -.44], [-.44, -.44]].forEach(([a, b]) => add(g, box(.08, .72, .08, dm), a, .36, b));
    if (goods === 'fish') { for (let k = 0; k < 6; k++) { const f = add(g, box(.12, .06, .45, sm('#9ab0c0', { roughness: .3, metalness: .5 })), -.3 + (k % 3) * .3, .72, -.15 + Math.floor(k / 3) * .3, 0, (k - 3) * .2, 0); } add(g, box(.8, .02, .8, sb('#e8f4ff')), 0, .7, 0); }
    else if (goods === 'bottles') { for (let k = 0; k < 9; k++) { add(g, cyl(.05, .05, .22, 6, sm(k % 2 ? '#3a6a2a' : '#6a3a1a', { roughness: .2 })), -.28 + (k % 3) * .28, .81, -.28 + Math.floor(k / 3) * .28); add(g, cyl(.02, .03, .1, 5, sm('#e8c040')), -.28 + (k % 3) * .28, .96, -.28 + Math.floor(k / 3) * .28); } }
    else if (goods) { for (let k = 0; k < 9; k++) add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 0), sl(goods)), -.28 + (k % 3) * .28, .78, -.28 + Math.floor(k / 3) * .28); }
    g.rotation.y = rot || 0; g.position.set(x, (y || 0) + groundH(x, z), z); const tag = newTag(); curTag = tag; addStatic(g); curTag = null; regProp(g, tag); return g;
  }
  function crateStack(x, z, n, r, goods) { for (let k = 0; k < n; k++) crate(x + (k % 2) * .95, z + (k > 2 ? .15 : 0), (r() - .5) * .3, k >= n - 2 ? goods : null, Math.floor(k / 2) * .72); }
  function barrel(x, z, r, lying) {
    const g = G0(), wm = sm('#6a4228'), hoop = sl('#2a2628');
    const body = add(g, cyl(.38, .38, 1, 12, wm), 0, .5, 0); add(g, cyl(.43, .38, .25, 12, wm), 0, .62, 0); add(g, cyl(.38, .43, .25, 12, wm), 0, .38, 0);
    [.1, .5, .9].forEach(y => add(g, cyl(.44, .44, .05, 12, hoop), 0, y, 0));
    add(g, cyl(.36, .36, .02, 12, sm('#4a2e1c')), 0, 1.0, 0);
    if (lying) { g.children.forEach(c => { c.position.set(c.position.y - .5, .44, 0); c.rotation.z = Math.PI / 2; }); }
    return place(g, x, z, r ? r() * 6 : 0);
  }
  function drum(x, z, color, r, lying) { // fusto metallico da 200 litri
    const g = G0(), m = sm(color, { roughness: .6, metalness: .35 }), rim = sm(shade(color, .7), { roughness: .5, metalness: .5 });
    add(g, cyl(.3, .3, .88, 12, m), 0, .44, 0);
    [.02, .3, .58, .86].forEach(y => add(g, cyl(.315, .315, .04, 12, rim), 0, y, 0));
    add(g, cyl(.05, .05, .03, 6, rim), .15, .89, 0); add(g, box(.3, .18, .01, PM.white()), 0, .5, .305);
    if (r && r() < .4) add(g, cyl(.305, .305, .2, 12, sm('#6a3a1a', { roughness: 1 })), 0, .2, 0); // ruggine
    if (lying) { g.children.forEach(c => { const y = c.position.y; c.position.set(y - .44, .3, c.position.z); c.rotation.z = Math.PI / 2; }); }
    return place(g, x, z, r ? r() * 6 : 0);
  }
  function drumGroup(x, z, r, cols) { const c = cols || ['#c8302a', '#2a5ab8', '#e8b820', '#2f6a3a', '#5a5a60']; drum(x, z, pick(r, c), r); drum(x + .66, z + .1, pick(r, c), r); drum(x + .3, z + .62, pick(r, c), r); if (r() < .6) drum(x + 1.3, z + .4, pick(r, c), r, true); }

  // --- tavolini e sedie ---
  function chair(x, z, rot, kind) {
    const g = G0();
    if (kind === 'plastic') { const m = sm('#f4f2ee', { roughness: .5 }); add(g, box(.46, .06, .44, m), 0, .44, 0); add(g, box(.46, .46, .05, m), 0, .7, -.22, -.12, 0, 0); [[-.2, .19], [.2, .19], [-.2, -.19], [.2, -.19]].forEach(([a, b]) => add(g, box(.05, .44, .05, m), a, .22, b)); [-.23, .23].forEach(a => add(g, box(.04, .05, .38, m), a, .6, 0)); }
    else if (kind === 'deco') { const m = sm('#7fe0e0'), c = sm('#f4a6c0'); add(g, cyl(.22, .22, .08, 10, c), 0, .46, 0); add(g, box(.42, .36, .05, m), 0, .72, -.2); [[-.16, .16], [.16, .16], [-.16, -.16], [.16, -.16]].forEach(([a, b]) => add(g, cyl(.02, .02, .45, 4, m), a, .22, b)); }
    else { const m = PM.iron(); add(g, box(.42, .05, .42, sm('#b8905a')), 0, .46, 0); for (let k = 0; k < 3; k++) add(g, box(.04, .42, .04, m), -.15 + k * .15, .7, -.2); add(g, box(.42, .05, .04, m), 0, .9, -.2); [[-.18, .18], [.18, .18], [-.18, -.18], [.18, -.18]].forEach(([a, b]) => add(g, box(.035, .46, .035, m), a, .23, b)); }
    return place(g, x, z, rot);
  }
  // cose sul tavolino: tazzine, birre, bicchieri di vino, posacenere, giornale, coppe di gelato
  function tableItems(g, y, items, r) {
    const cup = PM.white(), beerB = sm('#6a3a18', { roughness: .15, metalness: .1 }), beerG = sm('#2e6a2a', { roughness: .15 }), label = sm('#e8d8a8'), foam = PM.white(), gold = sm('#e8b030', { roughness: .2 });
    items.forEach((it, k) => {
      const a = k / items.length * Math.PI * 2 + r() * .5, rr = .2 + r() * .08, px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
      if (it === 'caffe') { add(g, cyl(.08, .08, .015, 10, cup), px, y + .01, pz); add(g, cyl(.045, .035, .07, 8, cup), px, y + .05, pz); add(g, cyl(.04, .04, .01, 8, sm('#3a1a0a')), px, y + .085, pz); add(g, box(.02, .03, .03, cup), px + .05, y + .05, pz); }
      else if (it === 'birra') { add(g, cyl(.045, .05, .2, 8, r() < .5 ? beerB : beerG), px, y + .1, pz); add(g, cyl(.02, .035, .08, 6, r() < .5 ? beerB : beerG), px, y + .24, pz); add(g, cyl(.052, .052, .07, 8, label), px, y + .09, pz); add(g, cyl(.022, .022, .015, 6, gold), px, y + .285, pz); }
      else if (it === 'boccale') { add(g, cyl(.06, .055, .16, 8, gold), px, y + .08, pz); add(g, cyl(.062, .062, .035, 8, foam), px, y + .175, pz); }
      else if (it === 'vino') { add(g, cyl(.04, .03, .07, 6, sm('#8a1a2a', { roughness: .2 })), px, y + .11, pz); add(g, cyl(.006, .006, .07, 4, PM.chrome()), px, y + .04, pz); add(g, cyl(.04, .04, .01, 6, PM.chrome()), px, y + .005, pz); }
      else if (it === 'fiasco') { add(g, new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), sm('#2a5a2a', { roughness: .2 })), px, y + .1, pz); add(g, cyl(.03, .03, .16, 6, sm('#2a5a2a')), px, y + .26, pz); add(g, cyl(.105, .09, .09, 8, sm('#c8a060')), px, y + .05, pz); }
      else if (it === 'posacenere') { add(g, cyl(.07, .06, .03, 8, sm('#c8c8c8', { metalness: .6 })), px, y + .015, pz); add(g, box(.06, .012, .012, sb('#ff6a2a')), px + .04, y + .035, pz); }
      else if (it === 'giornale') { add(g, box(.28, .012, .2, sm('#e8e2d0')), px, y + .006, pz, 0, r(), 0); add(g, box(.1, .013, .05, sm('#2a2a2a')), px, y + .007, pz, 0, r(), 0); }
      else if (it === 'gelato') { add(g, cyl(.06, .03, .06, 8, sm('#e8c8a0')), px, y + .03, pz); [['#f4a0c0', 0], ['#fff0c0', .04], ['#8a5a3a', -.04]].forEach(([c, o]) => add(g, new THREE.Mesh(new THREE.SphereGeometry(.045, 6, 4), sl(c)), px + o, y + .09, pz)); }
      else if (it === 'pane') { add(g, box(.24, .06, .16, sm('#c8904a')), px, y + .03, pz); }
      else if (it === 'fiori') { add(g, cyl(.035, .03, .12, 6, sm('#a8d8e8', { roughness: .1 })), px, y + .06, pz); for (let q = 0; q < 3; q++) add(g, box(.05, .05, .05, sl(pick(r, ['#e0405a', '#f0c040', '#ffffff']))), px + (q - 1) * .03, y + .15 + q * .01, pz); }
    });
  }
  function table(x, z, kind, items, r, seats) {
    const g = G0(), topM = kind === 'marble' ? PM.marble() : kind === 'plastic' ? sm('#f4f2ee', { roughness: .5 }) : kind === 'deco' ? sm('#f7c6d4') : kind === 'wood' ? PM.woodL() : sm('#dcd4c4');
    if (kind === 'wood') { add(g, box(1.3, .06, .8, topM), 0, .75, 0); [[-.55, -.3], [.55, -.3], [-.55, .3], [.55, .3]].forEach(([a, b]) => add(g, box(.06, .74, .06, PM.woodD()), a, .37, b)); add(g, box(1.32, .02, .82, stripeMat('#e8e2d4', '#c83a3a')), 0, .79, 0); }
    else { add(g, cyl(.42, .42, .05, 12, topM), 0, .75, 0); add(g, cyl(.04, .04, .72, 6, PM.iron()), 0, .38, 0); add(g, cyl(.25, .28, .04, 10, PM.iron()), 0, .02, 0); }
    tableItems(g, kind === 'wood' ? .8 : .78, items || [], r);
    place(g, x, z, r ? r() * 6 : 0);
    const n = seats === undefined ? 2 : seats, ck = kind === 'plastic' ? 'plastic' : kind === 'deco' ? 'deco' : 'bistro';
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + .4; chair(x + Math.cos(a) * .72, z + Math.sin(a) * .72, -a - Math.PI / 2, ck); }
    return g;
  }
  function parasol(x, z, ca, cb, h) { const g = G0(), hh = h || 2.3; add(g, cyl(.03, .03, hh, 5, PM.iron()), 0, hh / 2, 0); const t = add(g, new THREE.Mesh(new THREE.ConeGeometry(1.4, .5, 8), stripeMat(ca, cb)), 0, hh, 0); add(g, cyl(.15, .2, .1, 6, PM.iron()), 0, .05, 0); return place(g, x, z, Math.random() * 6); }
  function cafe(x, z, r, kind, n, pal) { for (let k = 0; k < n; k++) { const items = pick(r, [['caffe', 'caffe', 'posacenere'], ['birra', 'birra', 'boccale'], ['caffe', 'giornale'], ['boccale', 'boccale', 'posacenere'], ['vino', 'vino', 'fiasco', 'pane'], ['caffe', 'caffe', 'birra'], ['fiori', 'caffe']]); const px = x + k * 1.9, pz = z + (k % 2) * .3; table(px, pz, kind, kind === 'deco' ? pick(r, [['gelato', 'gelato'], ['birra', 'gelato'], ['caffe', 'gelato', 'giornale']]) : items, r, 2); if (pal) parasol(px, pz, pal[0], pal[1]); } }

  // --- vasi e fioriere ---
  function pot(x, z, r, kind) {
    const g = G0(), terra = PM.terra();
    if (kind === 'lemon') { add(g, cyl(.45, .32, .6, 8, terra), 0, .3, 0); add(g, cyl(.46, .46, .06, 8, sm('#9a4a2a')), 0, .6, 0); add(g, cyl(.05, .07, 1, 5, sm('#6a4a3a')), 0, 1, 0); add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.6, 0), PM.leaf2()), 0, 1.7, 0); for (let k = 0; k < 7; k++) add(g, new THREE.Mesh(new THREE.SphereGeometry(.07, 5, 4), sl('#f0d020')), Math.cos(k) * .5, 1.5 + (k % 3) * .2, Math.sin(k) * .5); }
    else if (kind === 'palm') { add(g, box(.7, .6, .7, sm('#f2eee6')), 0, .3, 0); for (let k = 0; k < 7; k++) { const l = box(.14, .05, 1, sl(pick(r, ['#3f8a3a', '#4f9a44']))); l.position.set(Math.cos(k) * .3, 1.1, Math.sin(k) * .3); l.rotation.set(-.6, k * .9, 0); g.add(l); } add(g, cyl(.06, .08, .7, 5, sm('#7a5a3a')), 0, .8, 0); }
    else if (kind === 'planter') { add(g, box(1.6, .5, .5, sm('#c8b8a0')), 0, .25, 0); for (let k = 0; k < 6; k++) { add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), PM.leaf()), -.6 + k * .24, .6, 0); add(g, box(.1, .1, .1, sl(pick(r, ['#e0303a', '#f05a8a', '#f0f0f0']))), -.6 + k * .24, .78, (r() - .5) * .2); } }
    else if (kind === 'bucket') { add(g, cyl(.22, .18, .4, 8, sm('#8a9aa8', { metalness: .5, roughness: .4 })), 0, .2, 0); const fc = pick(r, ['#e0303a', '#f0c030', '#f06aa0', '#ffffff', '#b060e0', '#ff8a30']); for (let k = 0; k < 7; k++) { add(g, cyl(.01, .01, .5, 3, PM.leaf()), (r() - .5) * .2, .55, (r() - .5) * .2); add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.07, 0), sl(fc)), (r() - .5) * .28, .82 + r() * .1, (r() - .5) * .28); } }
    else { // vaso di gerani
      add(g, cyl(.28, .2, .45, 8, terra), 0, .22, 0); add(g, cyl(.3, .3, .06, 8, sm('#9a4a2a')), 0, .45, 0);
      add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.34, 0), PM.leaf()), 0, .7, 0);
      const fc = pick(r, ['#e0303a', '#f05a8a', '#ff7a30', '#f0f0f0', '#c060e0']); for (let k = 0; k < 6; k++) add(g, box(.1, .1, .1, sl(fc)), Math.cos(k) * .25, .82 + (k % 2) * .1, Math.sin(k) * .25);
    }
    return place(g, x, z, r() * 6);
  }

  // --- cestini e cassonetti ---
  function bin(x, z, kind, rot) {
    const g = G0();
    if (kind === 'dumpster') { const m = sm('#3a6a3a', { roughness: .6 }); add(g, box(1.6, 1.1, .9, m), 0, .65, 0); add(g, box(1.7, .1, 1.0, sm('#2f5a2f')), 0, 1.25, 0, -.08, 0, 0); [-.6, .6].forEach(o => add(g, cyl(.1, .1, .08, 8, PM.iron()), o, .1, .35, 0, 0, Math.PI / 2)); add(g, box(.6, .25, .01, PM.white()), 0, .8, .455); add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), sl('#1a1a20')), .95, .25, .3); add(g, box(.4, .3, .3, sm('#b8905a')), -1, .15, .2); }
    else if (kind === 'glass') { const m = sm('#2f7a4a'); add(g, cyl(.55, .6, 1.3, 10, m), 0, .65, 0); add(g, new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m), 0, 1.3, 0); add(g, cyl(.12, .12, .05, 8, PM.iron()), 0, 1.3, .5, Math.PI / 2, 0, 0); }
    else if (kind === 'beach') { add(g, cyl(.3, .28, .8, 10, sm('#f4a6c0')), 0, .4, 0); add(g, cyl(.32, .32, .05, 10, PM.white()), 0, .82, 0); }
    else { add(g, cyl(.06, .06, 1, 6, PM.ironG()), 0, .5, 0); add(g, cyl(.22, .18, .55, 10, PM.ironG()), 0, .75, .15); add(g, cyl(.23, .23, .04, 10, sm('#1a3a2a')), 0, 1.03, .15); }
    return place(g, x, z, rot || 0);
  }

  // --- arredo urbano ---
  function phoneBooth(x, z, rot) { const g = G0(), m = sm('#a8b0b8', { metalness: .4, roughness: .4 }), y = sm('#f0c020'); add(g, box(1, 2.4, 1, m), 0, 1.2, 0); add(g, box(.8, 1.6, .05, std({ color: '#8ac0d0', emissive: '#304850', roughness: .1 })), 0, 1.3, .5); add(g, box(1.04, .35, 1.04, y), 0, 2.35, 0); const t = add(g, box(.7, .2, .02, sb('#f4f0e0')), 0, 2.35, .53); add(g, box(.3, .45, .2, sm('#3a3a40')), 0, 1.4, -.35); return place(g, x, z, rot); }
  function mailbox(x, z, rot) { const g = G0(), m = sm('#c8202a', { roughness: .5 }); add(g, cyl(.06, .06, 1, 6, PM.iron()), 0, .5, 0); add(g, box(.5, .6, .3, m), 0, 1.25, 0); add(g, cyl(.25, .25, .3, 10, m), 0, 1.55, 0, Math.PI / 2, 0, 0); add(g, box(.3, .04, .02, PM.iron()), 0, 1.4, .16); add(g, box(.3, .1, .01, PM.white()), 0, 1.15, .16); return place(g, x, z, rot); }
  function newsstand(x, z, rot, r) { // edicola: riviste, giornali, un barattolo di matite colorate
    const g = G0(), m = sm('#3a6a4a'), tex = magazineTexture();
    add(g, box(2.4, 2.4, 1.6, m), 0, 1.2, 0); add(g, box(2.8, .12, 2.1, sm('#2a4a3a')), 0, 2.46, .1);
    add(g, box(2.2, 1.6, .06, std({ map: tex, roughness: .6 })), 0, 1.3, .82);
    add(g, box(2.5, .08, .5, PM.woodL()), 0, .95, 1.05);
    for (let k = 0; k < 6; k++) add(g, box(.3, .04, .4, sl(pick(r, ['#e84a4a', '#f0e0c0', '#4a8ae8', '#f0c040', '#e8e8e0']))), -1 + k * .4, 1.0, 1.05, 0, (r() - .5) * .3, 0);
    // barattolo di matite colorate e bicchiere delle penne
    add(g, cyl(.08, .08, .16, 8, sm('#f0e8d8')), .9, 1.07, 1.1);
    ['#e02a2a', '#2a7ae0', '#f0c020', '#2aa04a', '#e060c0', '#ff8a20'].forEach((c, k) => add(g, box(.025, .26, .025, sl(c)), .86 + (k % 3) * .04, 1.2 + (k % 2) * .03, 1.07 + Math.floor(k / 3) * .05, (k - 3) * .08, 0, (k % 3 - 1) * .15));
    add(g, box(.5, .3, .02, sb('#f4e8c8')), 0, 2.2, .83);
    place(g, x, z, rot); glow(x, groundH(x, z) + 2.1, z, '#ffe0a0', 2);
    return g;
  }
  function magazineTexture() {
    const c = mk(64, 48), x = c.getContext('2d'), r = rng(12); x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, 64, 48);
    for (let y = 0; y < 48; y += 12) for (let k = 0; k < 64; k += 8) { const col = pick(r, ['#e84a4a', '#f0e0c0', '#4a8ae8', '#f0c040', '#e870b0', '#50c0a0', '#ffffff']); x.fillStyle = col; x.fillRect(k + 1, y + 1, 7, 10); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(k + 2, y + 2, 5, 2); x.fillStyle = pick(r, ['#f4d0b0', '#c89070', '#2a2a2a']); x.fillRect(k + 3, y + 5, 3, 4); }
    return canvasTex(c);
  }
  function busStop(x, z, rot) { const g = G0(), m = sm('#d8d4cc'); add(g, box(3, .1, 1.2, sm('#f0c020')), 0, 2.4, 0); [-1.4, 1.4].forEach(o => add(g, box(.08, 2.4, .08, m), o, 1.2, -.5)); add(g, box(2.9, 1.8, .04, std({ color: '#b8d8e8', transparent: true, opacity: .45 })), 0, 1.3, -.55); add(g, box(2, .08, .35, PM.woodL()), 0, .5, -.3); add(g, cyl(.04, .04, 2.6, 5, m), 1.7, 1.3, .3); add(g, cyl(.3, .3, .04, 12, sm('#f0c020')), 1.7, 2.5, .3, Math.PI / 2, 0, 0); return place(g, x, z, rot); }
  function bollard(x, z) { const g = G0(), m = sl('#2a2830'); add(g, cyl(.22, .28, .5, 8, m), 0, .25, 0); add(g, cyl(.3, .3, .1, 8, m), 0, .52, 0); return place(g, x, z); }
  function shrine(x, z, y, rotY) { // edicola votiva con le candele
    const g = G0(); add(g, box(.9, 1.2, .25, sm('#d8c8aa')), 0, 0, 0); add(g, box(.6, .8, .1, sl('#2a1c24')), 0, 0, .1); add(g, box(.35, .5, .02, std({ color: '#3a5aa8', emissive: '#223366' })), 0, 0, .16);
    const cand = box(.08, .15, .08, sb('#ffd070')); add(g, cand, -.15, -.28, .2); add(g, cand.clone(), .15, -.28, .2); add(g, box(1.1, .12, .4, sm('#8a5d4e')), 0, .66, 0);
    for (let k = 0; k < 3; k++) add(g, box(.12, .12, .12, sl(pick(rng(k), ['#e0405a', '#f0f0f0', '#f0c040']))), -.25 + k * .25, -.5, .22);
    g.position.set(x, y, z); g.rotation.y = rotY; addStatic(g);
    glow(x + Math.sin(rotY) * .3, y - .2, z + Math.cos(rotY) * .3, '#ffb040', 2.2);
    addLight(x + Math.sin(rotY) * .6, y - .2, z + Math.cos(rotY) * .6, '#ffa23a', 2.2, 7, .35);
  }
  function cat(x, z, r) { const g = G0(), c = pick(r, ['#2a2a2e', '#e8a060', '#f0f0f0', '#8a8a90']), m = sl(c); add(g, box(.18, .2, .38, m), 0, .14, 0); add(g, box(.16, .15, .15, m), 0, .3, .2); [-.05, .05].forEach(o => add(g, new THREE.Mesh(new THREE.ConeGeometry(.04, .08, 4), m), o, .41, .2)); add(g, box(.04, .04, .3, m), 0, .2, -.3, -.6, 0, 0); return place(g, x, z, r() * 6); }
  function scooterParts(x, z, r) { const g = G0(); for (let k = 0; k < 4; k++) add(g, new THREE.Mesh(new THREE.TorusGeometry(.26, .09, 5, 10), sl('#1a1a1e')), 0, .1 + k * .18, 0, Math.PI / 2, 0, 0); add(g, box(.6, .35, .35, sm('#c83a2a')), .8, .18, 0); add(g, box(.08, .12, .3, PM.chrome()), .8, .42, 0); return place(g, x, z, r() * 6); }
  function tireStack(x, z, n) { const g = G0(); for (let k = 0; k < n; k++) add(g, new THREE.Mesh(new THREE.TorusGeometry(.32, .12, 5, 10), sl('#18181c')), 0, .12 + k * .24, 0, Math.PI / 2, 0, 0); return place(g, x, z); }
  function pallet(x, z, r, load) { const g = G0(), w = PM.woodL(); for (let k = 0; k < 5; k++) add(g, box(1.2, .03, .16, w), 0, .14, -.4 + k * .2); [-.5, 0, .5].forEach(o => add(g, box(.12, .12, 1, PM.woodD()), o, .06, 0)); if (load) add(g, box(1.1, .9, .9, sm(pick(r, ['#c8b898', '#a8c0d0', '#d8d0c0']))), 0, .6, 0); return place(g, x, z, r() * .4); }
  function nets(x, z, r) { const g = G0(); add(g, box(2.2, .25, 1.4, sl('#2f4a3a')), 0, .12, 0); add(g, box(1.4, .3, 1, sl('#3a5a4a')), .2, .3, .1); for (let k = 0; k < 5; k++) add(g, box(.22, .22, .22, sl('#f06a2a')), -.8 + k * .4, .32, (r() - .5) * .8); add(g, new THREE.Mesh(new THREE.TorusGeometry(.3, .07, 5, 10), sl('#c8a868')), -.9, .08, .4, Math.PI / 2, 0, 0); return place(g, x, z, r() * 6); }
  function lifebuoy(x, z, y, rot) { const g = G0(); add(g, box(.08, 1.4, .08, sm('#d8d0c0')), 0, .7, 0); add(g, new THREE.Mesh(new THREE.TorusGeometry(.32, .09, 6, 12), stripeMat('#e8302a', '#f4f0e6')), 0, 1.2, .08); return place(g, x, z, rot); }

  // --- spiaggia ---
  function beachUmbrella(x, z, r, ca, cb) { const g = G0(); add(g, cyl(.03, .03, 2.4, 5, PM.white()), 0, 1.2, 0, (r() - .5) * .15, 0, (r() - .5) * .15); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.5, .55, 10), stripeMat(ca, cb)), 0, 2.35, 0); add(g, new THREE.Mesh(new THREE.SphereGeometry(.07, 5, 4), PM.white()), 0, 2.65, 0); return place(g, x, z, r() * 6); }
  function sunbed(x, z, rot, col, r) { const g = G0(); add(g, box(.62, .06, 1.3, sm(col)), 0, .32, .2); add(g, box(.62, .06, .7, sm(col)), 0, .52, -.62, .6, 0, 0); for (let k = 0; k < 6; k++) add(g, box(.64, .02, .06, PM.white()), 0, .36, -.35 + k * .2); [[-.26, .75], [.26, .75], [-.26, -.35], [.26, -.35]].forEach(([a, b]) => add(g, box(.04, .32, .04, PM.white()), a, .16, b)); if (r() < .4) add(g, box(.5, .02, 1.1, stripeMat(pick(r, ['#ff6aa0', '#40c0e0', '#f0c030']), '#f4f0e6')), 0, .36, .2); return place(g, x, z, rot); }
  function towel(x, z, r) { const g = G0(); add(g, box(.8, .015, 1.7, stripeMat(pick(r, ['#ff6aa0', '#40c0e0', '#f0c030', '#8a60e0']), pick(r, ['#f4f0e6', '#ffe060']))), 0, .01, 0); if (r() < .5) add(g, new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), stripeMat('#f04040', '#f4f0e6')), .7, .18, .6); return place(g, x, z, r() * .6 - .3); }
  function lifeguardTower(x, z) { // torretta del bagnino, pastello come a Miami
    const g = G0(), leg = PM.white(), cab = sm('#f7a6c0'), trim = sm('#7fe0e0');
    [[-.9, -.9], [.9, -.9], [-.9, .9], [.9, .9]].forEach(([a, b]) => add(g, box(.16, 2.2, .16, leg), a, 1.1, b));
    add(g, box(2.4, .14, 2.4, sm('#e8e0d0')), 0, 2.25, 0); add(g, box(2, 1.7, 1.8, cab), 0, 3.15, -.1); add(g, box(2.1, .12, 1.9, trim), 0, 2.45, -.1); add(g, box(2.1, .12, 1.9, trim), 0, 3.95, -.1);
    add(g, box(1.4, .8, .05, std({ color: '#2a4a5a', roughness: .1 })), 0, 3.3, .82);
    const rf = add(g, new THREE.Mesh(new THREE.ConeGeometry(1.8, .8, 4), sm('#f4f0e6')), 0, 4.4, -.1, 0, Math.PI / 4, 0);
    for (let k = 0; k < 6; k++) add(g, box(.9, .06, .16, PM.woodL()), 0, .2 + k * .36, 1.3 + k * .3, -.6, 0, 0);
    add(g, box(.06, 1.8, .06, PM.iron()), .9, 5, -.8); add(g, box(.7, .45, .02, sm('#e8302a')), 1.25, 5.6, -.8);
    add(g, new THREE.Mesh(new THREE.TorusGeometry(.32, .09, 6, 12), stripeMat('#e8302a', '#f4f0e6')), -1.05, 2.9, .9, 0, Math.PI / 2, 0);
    return place(g, x, z, 0);
  }
  function beachCabins(x, z, n, r) { for (let k = 0; k < n; k++) { const g = G0(), ca = pick(r, ['#f7a6c0', '#7fd6e0', '#f0d890', '#c9b6f2', '#9ee6b0']); add(g, box(1.6, 2.2, 1.6, stripeMat(ca, '#f4f0e6')), 0, 1.1, 0); add(g, new THREE.Mesh(roofGeo(1.9, 1.9, .5), sm(shade(ca, .8))), 0, 2.2, 0); add(g, box(.8, 1.6, .04, sm(shade(ca, .7))), 0, .8, .81); add(g, box(.2, .2, .02, sb('#ffe0a0')), 0, 1.9, .82); place(g, x + k * 1.9, z, 0); } }
  function shower(x, z) { const g = G0(); add(g, cyl(.05, .05, 2.5, 6, PM.chrome()), 0, 1.25, 0); add(g, box(.5, .05, .05, PM.chrome()), .25, 2.5, 0); add(g, cyl(.12, .06, .08, 8, PM.chrome()), .5, 2.45, 0); add(g, box(1, .06, 1, PM.woodL()), 0, .03, 0); return place(g, x, z); }
  function volleyNet(x, z) { const g = G0(); [-4, 4].forEach(o => add(g, cyl(.05, .05, 2.5, 5, PM.white()), o, 1.25, 0)); add(g, box(8, .8, .02, std({ color: '#f4f0e6', transparent: true, opacity: .5 })), 0, 2, 0); add(g, box(8, .06, .03, PM.white()), 0, 2.4, 0); return place(g, x, z, 0); }
  function pedalo(x, z, rot, col) { const g = G0(); [-.5, .5].forEach(o => add(g, box(.5, .4, 2.4, sm(col)), o, .2, 0)); add(g, box(1.4, .2, 1.4, PM.white()), 0, .5, -.1); add(g, box(1, .6, .1, PM.white()), 0, .8, -.6); add(g, new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .08, 10, 1, false, 0, Math.PI), sm('#f4f0e6')), 0, .6, .7, 0, 0, Math.PI / 2); return place(g, x, z, rot); }
  function rowboat(x, z, rot, col, y) { const g = G0(); add(g, box(1.2, .5, 3.4, sm(col)), 0, .25, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(.6, 1, 4), sm(col)), 0, .25, 2.1, Math.PI / 2, Math.PI / 4, 0); add(g, box(1.1, .1, 3.2, sm('#8a6440')), 0, .45, 0); add(g, box(1.2, .08, .3, PM.woodL()), 0, .5, .3); add(g, box(.06, .06, 2.6, PM.woodL()), .5, .55, 0, 0, .3, 0); g.position.set(x, (y === undefined ? groundH(x, z) : y), z); g.rotation.y = rot; addStatic(g); return g; }

  // --- porto e cantiere ---
  function container(x, z, rot, col, y) { const g = G0(), c = mk(32, 16), cx = c.getContext('2d'); cx.fillStyle = col; cx.fillRect(0, 0, 32, 16); for (let k = 0; k < 32; k += 2) { cx.fillStyle = shade(col, .78); cx.fillRect(k, 0, 1, 16); } cx.fillStyle = 'rgba(255,255,255,.7)'; cx.fillRect(3, 3, 8, 2); cx.fillStyle = 'rgba(120,60,30,.3)'; cx.fillRect(0, 13, 32, 3); const m = std({ map: canvasTex(c), roughness: .7 }); add(g, box(2.4, 2.6, 6, m), 0, 1.3, 0); add(g, box(2.44, .1, 6.04, sm(shade(col, .6))), 0, 2.58, 0); add(g, box(2.3, 2.4, .06, sm(shade(col, .85))), 0, 1.3, 3.01); [-.6, .6].forEach(o => add(g, box(.05, 2.3, .05, PM.iron()), o, 1.3, 3.05)); g.position.set(x, (y || 0) + groundH(x, z), z); g.rotation.y = rot; addStatic(g); return g; }
  function crane(x, z, rot, col) { const g = G0(), m = sl(col || '#d86a2a'); [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].forEach(([a, b]) => add(g, box(.3, 8, .3, m), a, 4, b)); for (let k = 1; k < 4; k++) { add(g, box(3.3, .15, .15, m), 0, k * 2, -1.5); add(g, box(3.3, .15, .15, m), 0, k * 2, 1.5); add(g, box(.15, .15, 3.3, m), -1.5, k * 2, 0); add(g, box(.15, .15, 3.3, m), 1.5, k * 2, 0); } add(g, box(3.6, 2, 3, sl('#e8a040')), 0, 9, 0); add(g, box(.5, .5, 14, m), 0, 10.5, 5); add(g, box(.5, .5, 5, m), 0, 10.5, -3.5); add(g, box(1.8, 1.8, 1.8, sm('#5a5a60')), 0, 10, -5.5); add(g, box(.05, 6, .05, PM.iron()), 0, 7.5, 11); add(g, box(.5, .4, .5, sm('#f0c020')), 0, 4.4, 11); add(g, box(1.2, 1.4, 1, std({ color: '#88c0d0', roughness: .1 })), 1.5, 9, 1.2); g.position.set(x, groundH(x, z), z); g.rotation.y = rot; addStatic(g); const top = new THREE.Vector3(x, 11.3, z); const rl = new THREE.Mesh(new THREE.SphereGeometry(.2, 5, 4), sb('#ff3030')); rl.position.copy(top); scene.add(rl); glow(top.x, top.y, top.z, '#ff4040', 2.5); }
  function forklift(x, z, rot) { const g = G0(), y = sm('#f0b020'); add(g, box(1.1, .8, 2, y), 0, .6, 0); add(g, box(1, 1.3, .08, PM.iron()), 0, 1.6, .3); [-.45, .45].forEach(o => { add(g, box(.08, 2.2, .08, PM.iron()), o, 1.3, -.4); add(g, box(.08, 2.2, .08, PM.iron()), o, 1.3, .6); }); add(g, box(1.1, .08, 1.1, PM.iron()), 0, 2.4, .1); add(g, box(.9, 2.2, .1, PM.iron()), 0, 1.2, 1.05); [-.3, .3].forEach(o => add(g, box(.12, .06, 1, PM.iron()), o, .2, 1.6)); [[-.55, .6], [.55, .6], [-.55, -.7], [.55, -.7]].forEach(([a, b]) => add(g, cyl(.28, .28, .22, 10, sl('#18181c')), a, .28, b, 0, 0, Math.PI / 2)); add(g, box(.6, .5, .6, sm('#3a3a40')), 0, 1.25, -.6); return place(g, x, z, rot); }
  function hullOnCradle(x, z, rot) { const g = G0(); const hm = sm('#b83a2a'), top = sm('#f2eee6'); add(g, box(3.2, 2, 11, hm), 0, 2.2, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 4), hm), 0, 2.2, 6.8, Math.PI / 2, Math.PI / 4, 0); add(g, box(3.3, .6, 11.1, top), 0, 3.4, 0); add(g, box(2.6, 1.8, 3, top), 0, 4.6, -1.5); for (let k = -4; k <= 4; k += 2) { add(g, box(4, .3, .5, PM.woodD()), 0, 1, k); [-1.6, 1.6].forEach(o => add(g, box(.3, 1.2, .3, PM.woodD()), o, .6, k)); } for (let k = -5; k <= 5; k += 2.5) [-2.2, 2.2].forEach(o => add(g, box(.08, 5, .08, sm('#9a9aa0')), o, 2.5, k)); [1.5, 3, 4.5].forEach(h => [-2.2, 2.2].forEach(o => add(g, box(.08, .08, 11, sm('#9a9aa0')), o, h, 0))); [-2.2, 2.2].forEach(o => add(g, box(.9, .04, 11, PM.woodL()), o * .9, 3, 0)); return place(g, x, z, rot); }
  function yacht(x, z, rot, col, r) { // motoscafo anni '80
    const g = G0(), hull = sm('#f4f2ee', { roughness: .3 }), stripe = sm(col);
    add(g, box(2.4, .9, 8, hull), 0, .2, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 4), hull), 0, .2, 5.2, Math.PI / 2, Math.PI / 4, 0);
    add(g, box(2.45, .2, 8.05, stripe), 0, .35, 0); add(g, box(2.2, .06, 7, PM.woodL()), 0, .66, -.3);
    add(g, box(1.8, .8, 2.4, hull), 0, 1.05, .6); add(g, box(1.85, .5, 1.2, std({ color: '#203040', roughness: .1, metalness: .4 })), 0, 1.2, 1.4, -.5, 0, 0);
    add(g, box(1.6, .1, 1.4, sm('#e8e2d4')), 0, 1.5, -.2); add(g, box(.05, .9, .05, PM.chrome()), 0, 1.9, -.6);
    for (let k = 0; k < 3; k++) add(g, box(.5, .15, .5, sm(pick(r, ['#f4a6c0', '#7fe0e0', '#f4f0e6']))), -.6 + k * .6, .85, -2.6);
    g.position.set(x, -.25, z); g.rotation.y = rot; shadowed(g); scene.add(g); dyn.boats.push({ g, ph: r() * 6, y: -.25 });
  }
  function sailboat(x, z, rot, r) { const g = G0(), hull = sm(pick(r, ['#f4f2ee', '#2a4a7a', '#c83a2a'])); add(g, box(2, .8, 6.5, hull), 0, .2, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(1, 2, 4), hull), 0, .2, 4.2, Math.PI / 2, Math.PI / 4, 0); add(g, box(1.3, .5, 2, PM.white()), 0, .85, -.5); add(g, cyl(.05, .06, 9, 5, PM.white()), 0, 5, .8); add(g, box(.06, .06, 3.5, PM.white()), 0, 1.4, -.9); const sail = add(g, box(.03, 6, 2.2, sm('#f4f0e6')), 0, 4.2, -.3); g.position.set(x, -.25, z); g.rotation.y = rot; shadowed(g); scene.add(g); dyn.boats.push({ g, ph: r() * 6, y: -.25 }); }
  function fishingBoat(x, z, colA, colB, rot, r) { const g = G0(); const hull = box(1.8, .8, 5, sm(colA)); hull.position.y = .1; const band = box(1.85, .2, 5.05, sm(colB)); band.position.y = .45; const bow = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.4, 4), sm(colA)); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, .1, -3.1); bow.scale.set(1, 1, .6); const cab = box(1.2, .9, 1.4, sm('#e8e2d4')); cab.position.set(0, .9, .8); const win = box(1.22, .3, .6, std({ color: '#203040', roughness: .1 })); win.position.set(0, 1.1, .6); const mast = box(.08, 3, .08, PM.iron()); mast.position.set(0, 2, -.5); const lamp = box(.15, .15, .15, sb('#ffe0a0')); lamp.position.set(0, 3.4, -.5); g.add(hull, band, bow, cab, win, mast, lamp); for (let k = 0; k < 3; k++) { const t = box(.4, .3, .4, sl('#f06a2a')); t.position.set(-.4 + k * .4, .65, -1.6); g.add(t); } g.rotation.y = rot; g.position.set(x, -.3, z); shadowed(g); scene.add(g); dyn.boats.push({ g, ph: r() * 6, y: -.3 }); }

  // --- distributore ---
  function fuelPump(x, z, rot, col) { const g = G0(), m = sm(col), w = PM.white(); add(g, box(1.2, .2, .7, sm('#a8a098')), 0, .1, 0); add(g, box(.8, 1.7, .5, m), 0, 1.05, 0); add(g, box(.84, .5, .54, w), 0, 1.6, 0); add(g, box(.6, .25, .02, sb('#8affb0')), 0, 1.65, .28); add(g, box(.4, .2, .02, sb('#ffe080')), 0, 1.35, .28); add(g, box(.12, .3, .15, PM.iron()), .45, 1.1, .1); add(g, cyl(.025, .025, 1, 4, PM.iron()), .5, .6, .2, .3, 0, 0); add(g, box(.84, .16, .54, m), 0, 1.95, 0); return place(g, x, z, rot); }
  function oilRack(x, z, rot, r) { const g = G0(); add(g, box(1.4, 1.2, .5, sm('#c8302a')), 0, .6, 0); for (let k = 0; k < 3; k++) for (let q = 0; q < 5; q++) add(g, box(.18, .26, .12, sm(pick(r, ['#e8c020', '#2a5ab8', '#e8e0d0', '#2a8a4a']))), -.5 + q * .25, .35 + k * .38, .3); add(g, box(1.5, .3, .02, sm('#f4f0e6')), 0, 1.35, .26); return place(g, x, z, rot); }

  // --- disco e cinema ---
  function searchlight(x, z, col, ph) { const g = G0(); add(g, box(.8, .5, .8, sm('#3a3a44')), 0, .25, 0); const head = add(g, cyl(.35, .35, .6, 10, sm('#5a5a64')), 0, .8, 0); place(g, x, z); const y0 = groundH(x, z); const bm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }); const cone = new THREE.Mesh(new THREE.CylinderGeometry(.3, 3.5, 80, 10, 1, true), bm); cone.position.y = 40; const piv = new THREE.Group(); piv.position.set(x, y0 + 1, z); piv.add(cone); scene.add(piv); dyn.beams.push({ piv, ph, mat: bm }); }
  function marquee(x0, y, z, w, r) { // pensilina del cinema con le lampadine che corrono
    const bulbs = [];
    for (let k = 0; k <= w * 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffe8a0', toneMapped: false })); b.position.set(x0 + k / 3, y, z); scene.add(b); bulbs.push(b); }
    dyn.chasers.push({ bulbs, t: 0 });
  }
  function posterBoard(x, z, rot, r) { const g = G0(), c = mk(24, 36), cx = c.getContext('2d'); cx.fillStyle = pick(r, ['#2a1a4a', '#4a1a2a', '#1a3a4a']); cx.fillRect(0, 0, 24, 36); cx.fillStyle = pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b']); cx.fillRect(2, 2, 20, 4); cx.fillStyle = pick(r, ['#f4d0b0', '#e8a080']); cx.fillRect(7, 10, 10, 12); cx.fillStyle = '#111'; cx.fillRect(7, 13, 10, 3); cx.fillStyle = '#fff'; cx.fillRect(3, 28, 18, 2); cx.fillRect(5, 31, 14, 1); add(g, box(1.2, 1.8, .08, sm('#c8a040')), 0, 1.6, 0); add(g, box(1, 1.6, .02, std({ map: canvasTex(c), emissive: '#ffffff', emissiveMap: canvasTex(c), emissiveIntensity: .35 })), 0, 1.6, .05); return place(g, x, z, rot); }
  function stanchions(x, z, n) { const g = G0(); for (let k = 0; k < n; k++) { add(g, cyl(.04, .04, 1, 6, sm('#e8c040', { metalness: .7, roughness: .3 })), k * 1.1, .5, 0); add(g, cyl(.15, .15, .05, 8, sm('#e8c040', { metalness: .7 })), k * 1.1, .02, 0); if (k) add(g, box(1.1, .06, .06, sm('#c8203a')), k * 1.1 - .55, .85, 0); } return place(g, x, z, 0); }
  function binoculars(x, z, rot) { const g = G0(), m = sm('#3a7a8a', { metalness: .4, roughness: .4 }); add(g, cyl(.08, .12, 1.1, 6, m), 0, .55, 0); add(g, box(.5, .3, .35, m), 0, 1.2, 0); [-.12, .12].forEach(o => add(g, cyl(.08, .08, .4, 8, m), o, 1.25, .25, Math.PI / 2, 0, 0)); return place(g, x, z, rot); }
  function drinkFountain(x, z) { const g = G0(), m = sm('#2f4a3a', { metalness: .4 }); add(g, cyl(.2, .25, 1.1, 8, m), 0, .55, 0); add(g, box(.08, .08, .3, m), 0, .95, .2); add(g, box(.5, .05, .5, sm('#8a8478')), 0, .02, .3); return place(g, x, z); }
  function picnicTable(x, z, rot, r) { const g = G0(), w = PM.woodL(); add(g, box(2, .08, .8, w), 0, .75, 0); [-.7, .7].forEach(o => add(g, box(2, .06, .3, w), 0, .45, o)); [-.8, .8].forEach(o => { add(g, box(.08, .75, .08, PM.woodD()), o, .37, 0); add(g, box(.08, .06, 1.7, PM.woodD()), o, .3, 0); }); tableItems(g, .79, ['birra', 'pane', 'birra'], r); return place(g, x, z, rot); }

  // ---------------- DISPOSIZIONE DEGLI OGGETTI NEI QUARTIERI ----------------
  function festoon(x0, y0, z0, x1, y1, z1, n, r) { // filo di lampadine colorate
    const cols = ['#f0c890'];   // [inverno16] filo di lampadine: tutte calde, non colorate
    const line = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, Math.hypot(x1 - x0, z1 - z0)), PM.iron()); line.position.set((x0 + x1) / 2, (y0 + y1) / 2 - .25, (z0 + z1) / 2); line.lookAt(x1, (y0 + y1) / 2 - .25, z1); scene.add(line);
    for (let k = 1; k < n; k++) { const t = k / n, sag = Math.sin(t * Math.PI) * .5; const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 5, 4), sb(cols[k % cols.length])); b.position.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - sag, z0 + (z1 - z0) * t); scene.add(b); if (k % 3 === 0) { const gg = glow(b.position.x, b.position.y, b.position.z, cols[k % cols.length], .8); gg.material.opacity = .5; } }
  }
  function laundry(x, z, y, len, alongX, r) {
    const cloth = ['#e8e2d4', '#d05a5a', '#5a8ad0', '#e0c050', '#f0f0f0', '#6ac08a', '#f7a6c0'];
    const line = box(alongX ? len : .02, .02, alongX ? .02 : len, PM.iron()); line.position.set(x, y, z); scene.add(line);
    for (let k = 0; k < Math.floor(len / 1.05); k++) { if (r() < .2) continue; const cw = .4 + r() * .4, chh = .5 + r() * .5; const cl = new THREE.Mesh(new THREE.PlaneGeometry(cw, chh), new THREE.MeshLambertMaterial({ color: pick(r, cloth), side: THREE.DoubleSide })); const o = -len / 2 + .5 + k * 1.05; cl.position.set(alongX ? x + o : x, y - chh / 2, alongX ? z : z + o); if (!alongX) cl.rotation.y = Math.PI / 2; scene.add(cl); dyn.laundry.push({ m: cl, ph: r() * 6, ax: alongX }); }
  }
  function buildArches() { // voltoni sopra i vicoli
    const r = rng(3);
    M.arches.forEach(a => {
      const x0 = a.x * TS, z0 = a.y * TS, w = a.w * TS, base = a.z, g = G0();
      const col = pick(r, ['#e2c08e', '#d99a62', '#c4604e', '#f0d890']);
      add(g, box(w, 3, TS, sm(col)), w / 2, base + 4.9, TS / 2);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w / 2, .22, 4, 10, Math.PI), sm('#e8e0d0')); ring.position.set(w / 2, base + 3.4, TS + .02); g.add(ring);
      const ring2 = ring.clone(); ring2.position.z = -.02; g.add(ring2);
      const under = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, TS, 10, 1, true, -Math.PI / 2, Math.PI), sm(shade(col, .7), { side: THREE.DoubleSide })); under.rotation.x = Math.PI / 2; under.rotation.z = Math.PI / 2; under.position.set(w / 2, base + 3.4, TS / 2); g.add(under);
      for (let k = 0; k < 2; k++) { const wn = box(.7, .9, .05, sm(pick(r, SHUTTER))); wn.position.set(w / 2 + (k - .5) * 1.4, base + 5, TS + .03); g.add(wn); }
      g.position.set(x0, 0, z0); addStatic(g);
      // lanterna appesa sotto l'arco
      const lx = x0 + w / 2, lz = z0 + TS / 2, ly = base + 2.9; const l = box(.3, .4, .3, sb('#ffd08a')); l.position.set(lx, ly, lz); scene.add(l); glow(lx, ly, lz, '#ffb85c', 2.6); addLight(lx, ly - .2, lz, '#ffb35c', 2.2, 8, .05);
    });
  }
  function buildFountain(fx, fz) {
    const g = G0(), st = sm('#c8bca8'), stD = sm('#a89c88'), water = std({ color: '#3a9aaa', emissive: '#1a5a6a', roughness: .1, metalness: .2 });
    add(g, cyl(3.6, 3.8, .5, 8, stD), 0, .25, 0); add(g, cyl(3.4, 3.4, .8, 8, st), 0, .55, 0); add(g, cyl(3.5, 3.5, .12, 8, sm('#e0d6c4')), 0, .98, 0);
    add(g, cyl(3.05, 3.05, .1, 8, water), 0, .8, 0);
    add(g, cyl(.5, .7, 2.2, 8, st), 0, 1.5, 0); add(g, cyl(1.5, .6, .45, 8, st), 0, 2.7, 0); add(g, cyl(1.3, 1.3, .06, 8, water), 0, 2.9, 0);
    add(g, cyl(.25, .35, .8, 8, st), 0, 3.3, 0); add(g, cyl(.8, .3, .3, 8, st), 0, 3.8, 0);
    const sm2 = sm('#7f9a92', { metalness: .3, roughness: .5 }); add(g, box(.5, 1.1, .4, sm2), 0, 4.5, 0); add(g, box(.3, .3, .3, sm2), 0, 5.2, 0); add(g, box(.9, .1, .12, sm2), 0, 4.7, 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(g, box(.16, .5, .16, sm('#dff4ff', { roughness: .1 })), Math.cos(a) * 1.2, 3.1, Math.sin(a) * 1.2); add(g, cyl(.12, .12, .5, 5, sm('#bfe8f0', { roughness: .1 })), Math.cos(a) * 2.2, 1.1, Math.sin(a) * 2.2, 0, 0, .5); }
    place(g, fx, fz);
    addLight(fx + 2, 1.2, fz + 2, '#6fd6ff', 1.8, 8, .05); glow(fx, 1, fz, '#6fd6ff', 5).material.opacity = .4;
  }

  function buildProps() {
    const r = rng(77), X = OX * TS; // X: spostamento in metri del borgo storico
    buildArches();
    // ===== BORGO STORICO =====
    buildFountain(X + 25 * TS, 11 * TS);
    [[21, 7], [28.5, 7], [21, 13.8], [28.8, 13.8]].forEach(([tx, ty]) => leafyTree(X + tx * TS, ty * TS, r, true));
    bench(X + 22 * TS, 12 * TS, 0); bench(X + 27.5 * TS, 9 * TS, Math.PI); bench(X + 25 * TS, 7.2 * TS, Math.PI, 'marble'); bench(X + 25 * TS, 14.6 * TS, 0, 'marble');
    stall(X + 22.5 * TS, 8 * TS, 0, '#2f6a4e', '#e9e0cf', ['#c84a2a', '#e0b030', '#4a8a3a', '#d06a2a', '#8a2a5a'], r);
    stall(X + 27.5 * TS, 13.5 * TS, Math.PI, '#b0283c', '#e9e0cf', ['#e0d0a0', '#f0e060', '#c83030', '#3a7a3a'], r);
    stall(X + 21 * TS, 9.5 * TS, Math.PI / 2, '#3a5aa8', '#e9e0cf', ['#9ab0c0', '#c0d0d8'], r); // il pesce
    newsstand(X + 28.8 * TS, 10.5 * TS, -Math.PI / 2, r);
    phoneBooth(X + 29.5 * TS, 12.6 * TS, -Math.PI / 2); mailbox(X + 20.4 * TS, 6.4 * TS, 0);
    crateStack(X + 23.6 * TS, 8.4 * TS, 3, r, '#e0b030'); crate(X + 26.2 * TS, 13.1 * TS, .3, '#c84a2a');
    // banco dei fiori di Rosa
    { const fx = X + 41.5 * TS, fz = 16.5 * TS; const g = G0(); add(g, box(2.6, .8, 1, PM.wood()), 0, .4, 0); add(g, box(2.4, .5, .4, PM.woodL()), 0, 1.0, -.25); place(g, fx, fz); for (let k = 0; k < 10; k++) pot(fx - 1.1 + (k % 5) * .55, fz - .2 + Math.floor(k / 5) * .5, r, 'bucket'); for (let k = 0; k < 4; k++) pot(fx - 1.8 + k * 1.2, fz + 1, r, 'bucket'); parasol(fx, fz, '#e8d8c0', '#f06a8a', 2.6); }
    // tavolini del Bar Gino (tazzine, birre, giornali)
    cafe(X + 1.3 * TS, 7.7 * TS, r, 'marble', 3, ['#b0283c', '#e9e0cf']);
    // tavolini dell'Osteria sulla Via al Mare
    [[21.5, 23.2], [23.5, 23.2], [27, 23.2]].forEach(([tx, ty]) => { table(X + tx * TS, ty * TS, 'wood', ['vino', 'vino', 'fiasco', 'pane'], r, 2); parasol(X + tx * TS, ty * TS, '#e0cdb0', '#2f5a3e'); });
    // Alimentari Wu: cassette di verdura e barili
    crate(X + 3.8 * TS, 8.4 * TS, .1, '#4a8a3a'); crate(X + 4.4 * TS, 8.3 * TS, -.2, '#e0b030'); crate(X + 7.9 * TS, 8.5 * TS, 0, '#c84a2a'); barrel(X + 8.9 * TS, 8.3 * TS, r);
    // officina di Beppe
    tireStack(X + 8.6 * TS, 19.5 * TS, 4); tireStack(X + 9.3 * TS, 19.1 * TS, 3); scooterParts(X + 8.8 * TS, 21 * TS, r); drum(X + 9.4 * TS, 21.9 * TS, '#c8302a', r);
    // vico dei Lanternini: lanterne rosse
    for (let k = 0; k < 9; k++) { const x = X + 1 + k * 3.2, z = 8 * TS - (k % 2 ? .6 : -.6); const l = new THREE.Mesh(new THREE.SphereGeometry(.32, 6, 4), sb('#ff3b2f')); l.scale.y = 1.25; l.position.set(x, 4.8, z); scene.add(l); const cap = box(.36, .08, .36, sl('#e0b040')); cap.position.set(x, 5.2, z); scene.add(cap); const tas = box(.05, .3, .05, sl('#e0b040')); tas.position.set(x, 4.3, z); scene.add(tas); dyn.flicker.push({ s: glow(x, 4.8, z, '#ff4a3a', 2.2, false), base: .6 }); }
    { const cable = box(.03, .03, 30, PM.iron()); cable.rotation.y = Math.PI / 2; cable.position.set(X + 15, 5.3, 8 * TS); scene.add(cable); }
    addLight(X + 6, 4.5, 8 * TS, '#ff3b2f', 2.4, 10, .1); addLight(X + 16, 4.5, 8 * TS, '#ff5a3a', 2.0, 9, .12); addLight(X + 26, 4.5, 8 * TS, '#ff3b2f', 2.0, 9, .1);
    // calata: bitte, casse di pesce, barili, fusti, reti, gru, pescherecci
    for (let x = X + 3; x < X + 72; x += 8) bollard(x, 29.7 * TS);
    crateStack(X + 4 * TS, 27 * TS, 4, r, 'fish'); crateStack(X + 17 * TS, 28 * TS, 3, r, 'fish'); crateStack(X + 30 * TS, 27.5 * TS, 5, r, 'bottles'); crateStack(X + 32.5 * TS, 29 * TS, 2, r);
    [[8, 28], [9, 28.4], [22.5, 28.8], [23.2, 28.5]].forEach(([tx, ty], k) => barrel(X + tx * TS, ty * TS, r, k === 3));
    drumGroup(X + 34.6 * TS, 26.5 * TS, r); drumGroup(X + 12.5 * TS, 26.4 * TS, r, ['#2a5ab8', '#c8302a']);
    nets(X + 14.5 * TS, 27.4 * TS, r); nets(X + 28.5 * TS, 28.2 * TS, r); pallet(X + 20 * TS, 26.6 * TS, r, true); pallet(X + 19 * TS, 27.2 * TS, r, false);
    forklift(X + 33.8 * TS, 28.4 * TS, -Math.PI / 2); crane(X + 7 * TS, 27.5 * TS, Math.PI, '#d86a2a');
    fishingBoat(X + 10 * TS, 32 * TS, '#2a5a8a', '#e8e2d4', 0, r); fishingBoat(X + 15.5 * TS, 33 * TS, '#e8e2d4', '#c23a2a', .1, r); fishingBoat(X + 24 * TS, 31.8 * TS, '#c23a2a', '#e8e2d4', -.08, r); fishingBoat(X + 30 * TS, 33 * TS, '#2f7a5a', '#e0c040', .05, r); fishingBoat(X + 37 * TS, 32.5 * TS, '#1a2a4a', '#e8e2d4', 1.4, r);
    [[10, 26.3], [24, 26.3], [36, 26.3]].forEach(([tx, ty]) => streetLamp(X + tx * TS, ty * TS, 'sodium', 0));
    // lampioni del borgo
    [[22, 14.35], [72, 14.35], [70, 30.35], [36.35, 24], [32, 46.35], [84, 46.35], [52, 46.35], [4, 30.35]].forEach(([x, z]) => streetLamp(X + x, z - .5, 'wall', Math.PI));
    [[20.5, 6.5], [29.5, 6.5], [20.5, 14.5], [29.5, 14.5]].forEach(([tx, ty]) => streetLamp(X + tx * TS, ty * TS, 'classic', 0));
    // edicole votive
    shrine(X + 16.13, 4, 3, Math.PI / 2); shrine(X + 21, 30.13, 3, 0); shrine(X + 36.13, 40, 3, Math.PI / 2);
    // bucato e cavi tra le case
    [[8.5, 3, 7], [18.5, 4, 8.5], [30.5, 12, 7.5], [38.5, 3, 8], [18.5, 20, 7], [8.5, 11, 6.5], [30.5, 20.5, 9]].forEach(([tx, ty, y]) => laundry(X + tx * TS + TS / 2, ty * TS, y, 4.4, true, r));
    for (let k = 0; k < 10; k++) { const tx = pick(r, [8.5, 18.5, 30.5, 38.5]), ty = 1 + r() * 20; const c = box(4.2, .03, .03, PM.iron()); c.position.set(X + tx * TS + TS / 2, 8 + r() * 5, ty * TS); c.rotation.y = (r() - .5) * .5; scene.add(c); }
    // cestini e cassonetti
    [[9, 12], [19, 16], [31, 3], [39, 12], [0.5, 16], [9, 20]].forEach(([tx, ty], k) => bin(X + tx * TS + .6, ty * TS, k % 3 === 1 ? 'dumpster' : 'pole', k % 2 ? Math.PI / 2 : 0));
    bin(X + 30.6 * TS, 16.4 * TS, 'glass'); cat(X + 2 * TS, 7.2 * TS, r); cat(X + 19.3 * TS, 3 * TS, r); cat(X + 34 * TS, 29 * TS, r);

    // ===== PONENTE =====
    // pineta sulla terrazza
    [[5, 1], [8, 2.5], [11, .8], [14, 2.2], [16.5, .6], [6, 4.2], [10, 4.6], [17, 3.4]].forEach(([tx, ty]) => pineTree(tx * TS, ty * TS, r));
    picnicTable(7 * TS, 3 * TS, .2, r); picnicTable(13 * TS, 1.6 * TS, -.3, r); bench(9 * TS, 5.3 * TS, 0); bench(15.5 * TS, 5.3 * TS, 0); drinkFountain(11 * TS + 1, 5.4 * TS); bin(4.6 * TS, 5.2 * TS, 'pole');
    for (let k = 0; k < 5; k++) agave((4.5 + k * 1.3) * TS, .4 * TS, r);
    // Discoteca Luna: fasci di luce nel cielo, cordoni, palme in vaso
    searchlight(21 * TS, 4.6 * TS, '#c05cff', 0); searchlight(28 * TS, 4.6 * TS, '#35e6ff', 2);
    stanchions(22.3 * TS, 5.3 * TS, 4); pot(22.8 * TS, 4.3 * TS, r, 'palm'); pot(25.6 * TS, 4.3 * TS, r, 'palm');
    streetLamp(19 * TS, 5.2 * TS, 'deco', 0); streetLamp(30 * TS, 3 * TS, 'deco', 0);
    // Cinema Astor: pensilina con le lampadine e manifesti
    { const g = G0(); add(g, box(15, .5, 2.2, sm('#e8c060')), 7.5, 3.3, 1.1); add(g, box(15.2, .15, 2.3, sm('#c83a3a')), 7.5, 3.6, 1.1); const tex = signTexture('ULTIMA PRIMA', '#ffd23b', '#2a0a1a'); const sg = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, .1), [sb('#2a0a1a'), sb('#2a0a1a'), sb('#2a0a1a'), sb('#2a0a1a'), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), sb('#2a0a1a')]); sg.position.set(7.5, 4.3, 2.2); sg.userData.keep = true; g.add(sg); g.position.set(4 * TS + .5, 0, 15 * TS - .1); shadowed(g); scene.add(g); marquee(4 * TS + .5, 3.05, 15 * TS + 2.2, 15, r); addLight(8 * TS, 3, 15 * TS + 2, '#ffd890', 3, 10, 0).always = true; }
    posterBoard(4.6 * TS, 15.3 * TS, 0, r); posterBoard(11.5 * TS, 15.3 * TS, 0, r);
    // pensione e isolato
    pot(23 * TS, 15.3 * TS, r, 'lemon'); pot(25.7 * TS, 15.3 * TS, r, 'lemon'); bench(17 * TS, 15.3 * TS, 0); bin(13 * TS, 15.2 * TS, 'pole'); mailbox(20 * TS, 15.2 * TS, 0);
    shrine(19 * TS + .13, 12 * TS, 3, Math.PI / 2); laundry(12 * TS + 2, 11 * TS, 7, 4, true, r); laundry(19 * TS + 2, 12 * TS, 8, 4, true, r); laundry(27 * TS + 2, 10 * TS, 7.5, 4, true, r);
    // giardini delle palme
    [[5, 18.5], [8, 20.6], [11, 18.6], [14, 20.4], [6.5, 21.4], [12.5, 21.6]].forEach(([tx, ty]) => addStatic(palmTree(tx * TS, groundH(tx * TS, ty * TS), ty * TS, r)));
    bush(9 * TS, 18.6 * TS, r, '#f06aa8'); bush(13.5 * TS, 19 * TS, r, '#ffffff'); bush(4.8 * TS, 20 * TS, r, '#f06aa8'); agave(10.4 * TS, 21.3 * TS, r);
    bench(7 * TS, 19.6 * TS, Math.PI / 2, 'deco'); bench(10.5 * TS, 19.8 * TS, -Math.PI / 2, 'deco'); drinkFountain(9 * TS, 21 * TS);
    streetLamp(7.8 * TS, 18.3 * TS, 'deco', 0); streetLamp(12 * TS, 21 * TS, 'deco', 0);
    // distributore: pompe, olio, gomme, fusti
    fuelPump(17 * TS + 1, 19.2 * TS, Math.PI / 2, '#d8282a'); fuelPump(17 * TS + 1, 20.8 * TS, Math.PI / 2, '#e8c030');
    oilRack(26 * TS, 21.3 * TS, 0, r); tireStack(28.6 * TS, 20.4 * TS, 5); drumGroup(22.4 * TS, 18.2 * TS, r, ['#c8302a', '#e8c030', '#2a5ab8']);
    // Bar Sirena: tavolini con le birre davanti all'ingresso
    cafe(29.6 * TS, 16.4 * TS, r, 'plastic', 3, ['#2ab8b0', '#f4f0e6']);
    // marciapiede: lampioni, fermata dell'autobus, cestini
    [5, 13, 21, 29].forEach(tx => streetLamp(tx * TS, 22.3 * TS, 'classic', 0));
    busStop(16 * TS, 22.2 * TS, 0); bin(24.5 * TS, 22.4 * TS, 'pole'); phoneBooth(32.8 * TS, 16.6 * TS, Math.PI);
    // cantiere navale: scafo in costruzione, container, gru, fusti, bancali
    hullOnCradle(10 * TS, 31.3 * TS, Math.PI / 2); crane(15 * TS, 27.8 * TS, Math.PI / 2, '#e8b020');
    [[19, 26.8, 0], [19, 26.8, 1], [22.5, 27, 0], [26, 26.8, 0], [26, 26.8, 1], [29.5, 27.2, 0]].forEach(([tx, ty, lv], k) => container(tx * TS, ty * TS + 1.4, Math.PI / 2, pick(r, ['#c8402a', '#2a6ab8', '#e8a020', '#2a8a5a', '#8a3a8a', '#d8d4cc']), lv * 2.6));
    drumGroup(12.5 * TS, 28.8 * TS, r); drumGroup(31.5 * TS, 26.4 * TS, r, ['#5a5a60', '#c8302a']); drum(13.2 * TS, 26.4 * TS, '#2a5ab8', r, true);
    pallet(24 * TS, 28.8 * TS, r, true); pallet(25.3 * TS, 28.6 * TS, r, true); crateStack(32 * TS, 28.4 * TS, 3, r); forklift(21 * TS, 28.9 * TS, 0);
    [[4, 26.3], [18, 29.4], [32, 29.4]].forEach(([tx, ty]) => streetLamp(tx * TS, ty * TS, 'sodium', 0));
    // marina: motoscafi e barche a vela
    yacht(40.6, 72.8, 0, '#ff4fa3', r); yacht(51.2, 73.2, .04, '#35c8e6', r); yacht(37.8, 63, Math.PI / 2, '#8a60e0', r); sailboat(58.5, 72.5, -.05, r); sailboat(64, 69.6, .1, r); sailboat(28, 72, .15, r);
    [[22.2, 30.2], [23.8, 32.9], [17.4, 33.5], [27.6, 33.5]].forEach(([tx, ty]) => bollard(tx * TS, ty * TS));
    lifebuoy(22 * TS + .5, 30.8 * TS, 0); streetLamp(23.8 * TS, 36.6 * TS, 'deco', Math.PI);
    // Punta Scogli: scogli, panchina, canne da pesca
    for (let k = 0; k < 16; k++) { const s = .6 + r() * 1.3, x = r() * 11, z = 52 + r() * 16; if (x > 1.5 && x < 7 && z > 55 && z < 61) continue; const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), sm(pick(r, ['#6a6064', '#5a5258', '#7a6e6a']))); rk.position.set(x, groundH(x, z) - s * .3, z); rk.scale.set(1, .7, 1); rk.rotation.set(r() * 3, r() * 3, 0); addStatic(rk); }
    bench(8.6, 53.6, Math.PI); { const g = G0(); add(g, cyl(.02, .03, 3.4, 4, PM.woodL()), 0, 1.4, .8, .7, 0, 0); add(g, box(.3, .25, .3, sm('#2a5ab8')), .3, .12, 0); place(g, 3, 64, Math.PI); }

    // ===== LEVANTE: il pianoro del Santuario =====
    const P6 = 6;
    [[163, 8.4], [178, 8.8], [196, 8.4], [216, 8.8]].forEach(([x, z]) => streetLamp(x, z, 'classic', 0));
    bench(172, 9.2, 0, 'marble'); bench(190, 9.2, 0, 'marble'); bench(203, 9.2, 0, 'marble'); binoculars(201, 9.4, 0); binoculars(222, 9.4, 0);
    [[165, 7.2], [186, 7], [205, 7.2], [225, 7]].forEach(([x, z]) => pot(x, z, r, 'lemon'));
    cypress(193, 7.3, r); cypress(226.5, 7.6, r); cat(199, 7.5, r);
    // ===== LEVANTE: i caruggi sulla terrazza =====
    table(182, 13.6, 'wood', ['vino', 'fiasco', 'pane', 'vino'], r, 2); table(186.5, 13.6, 'wood', ['vino', 'vino', 'pane'], r, 2); table(190.5, 13.4, 'wood', ['fiasco', 'vino', 'posacenere'], r, 2);
    festoon(168, 8.6, 13, 226, 8.6, 13, 60, r);
    [[170, 15.4], [174, 15.4], [180, 15.4], [194, 15.4], [199, 15.4], [207, 15.4], [213, 15.4], [224, 15.4]].forEach(([x, z]) => pot(x, z, r));
    [[176, 16], [196, 16], [216, 16]].forEach(([x, z]) => streetLamp(x, z, 'wall', Math.PI));
    shrine(215, 15.87, 3 + 3, Math.PI); cat(171, 13, r); cat(219, 12.4, r);
    [[176, 17], [176, 19.5], [192, 17.5], [206, 17], [206, 19.6], [220, 18]].forEach(([x, z], k) => laundry(x, z, 3 + 5.5 + (k % 2), 3.8, true, r));
    // ===== LEVANTE: la strada dietro gli hotel =====
    bin(158.6, 24.6, 'dumpster', Math.PI / 2); bin(206, 29.4, 'dumpster', 0); bin(197, 29.4, 'glass'); mailbox(158.6, 29, Math.PI / 2);
    [[164, 29.4], [184, 29.4], [204, 29.4], [224, 29.4]].forEach(([x, z]) => streetLamp(x, z, 'classic', Math.PI));
    // ===== LEVANTE: il Lungomare =====
    for (let x = 158; x < 228; x += 8) { if ([167, 183, 197, 211, 223].some(d => Math.abs(d - x) < 2.6)) continue; addStatic(palmTree(x, 0, 45.2, r, 7 + r() * 2.5)); }
    for (let x = 162; x < 228; x += 16) streetLamp(x, 44.6, 'deco', 0);
    [[83, 22], [91, 22], [105, 22]].forEach(([tx]) => { pot(tx * TS - 1.8, 44.6, r, 'palm'); pot(tx * TS + 3.8, 44.6, r, 'palm'); });
    phoneBooth(206.6, 44.8, 0); mailbox(186.6, 44.6, 0); bench(172, 44.8, Math.PI, 'deco'); bench(214, 44.8, Math.PI, 'deco');
    table(194.6, 44.8, 'deco', ['gelato', 'gelato', 'caffe'], r, 1); table(200.8, 44.8, 'deco', ['gelato', 'birra'], r, 1);
    // passeggiata a mare
    for (let x = 160; x < 228; x += 12) streetLamp(x, 52.5, 'deco', Math.PI);
    for (let x = 166; x < 228; x += 12) { bench(x, 53.2, 0, 'deco'); }
    [[157.5, 53], [192, 53], [226, 53]].forEach(([x, z]) => bin(x, z, 'beach'));
    lifebuoy(180, 53.6, 0); lifebuoy(218, 53.6, 0);
    // la spiaggia
    beachCabins(158, 55.4, 7, r);
    const UMB = [['#ff6aa0', '#f4f0e6'], ['#40c0e0', '#f4f0e6'], ['#f0c030', '#f4f0e6'], ['#8a60e0', '#f4f0e6'], ['#ff8a3c', '#f4f0e6']];
    for (let row = 0; row < 2; row++) for (let x = 174; x < 228; x += 4.6) {
      if (x > 181 && x < 200) continue; if (row === 1 && x > 206 && x < 222) continue;
      const z = 57.6 + row * 3.4, c = pick(r, UMB); beachUmbrella(x, z, r, c[0], c[1]);
      sunbed(x - .9, z + .4, 0, pick(r, ['#f4f0e6', '#7fd6e0', '#f7a6c0']), r); if (r() < .6) sunbed(x + .9, z + .4, 0, pick(r, ['#f4f0e6', '#7fd6e0', '#f7a6c0']), r);
    }
    for (let k = 0; k < 10; k++) towel(160 + r() * 64, 58 + r() * 4.5, r);
    lifeguardTower(197.5, 58.6); shower(172, 55.2); shower(215, 55.2); volleyNet(214, 61.8);
    pedalo(178, 65.4, .3, '#f4a6c0'); pedalo(182, 66.2, -.2, '#7fd6e0'); rowboat(206, 62.4, 1.2, '#2a5a8a'); rowboat(224, 63, -.9, '#c83a3a');
    table(184, 60.6, 'plastic', ['birra', 'birra', 'posacenere'], r, 3); table(189, 61, 'plastic', ['boccale', 'birra'], r, 2); parasol(184, 60.6, '#ff8a3c', '#f4f0e6'); parasol(189, 61, '#ff8a3c', '#f4f0e6');
    crate(193.4, 56.4, .2, 'bottles'); crate(193.4, 57.5, -.1, 'bottles', 0);
    // vasi davanti alle porte
    G.BUILDINGS.forEach((b, i) => {
      if (!b.door || b.warehouse || b.kiosk) return; const rr = rng(i * 5 + 1); const dx = b.door[0] * TS + TS / 2, dz = b.door[1] * TS + TS / 2;
      const fS = b.door[1] === b.y + b.h, fN = b.door[1] === b.y - 1;
      for (let k = 0; k < 2; k++) { if (rr() < .3) continue; const o = k ? 1.25 : -1.25; const x = dx + (fS || fN ? o : 0), z = dz + (fS || fN ? 0 : o) - (fS ? .6 : fN ? -.6 : 0); if (!G.walkM(x, z) || G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === G.T.VIA) continue; pot(x, z, rr, rr() < .3 ? 'lemon' : undefined); }
    });
    // gabbiani
    for (let k = 0; k < 12; k++) {
      const g = G0(), wm = sl('#f4f2ee'), tip = sl('#2a2a30');
      add(g, box(.16, .14, .5, wm), 0, 0, 0); add(g, box(.1, .1, .14, sl('#f0c040')), 0, 0, .3);
      const wl = G0(), wr = G0(); add(wl, box(.7, .03, .24, wm), -.35, 0, 0); add(wl, box(.2, .03, .2, tip), -.75, 0, 0); add(wr, box(.7, .03, .24, wm), .35, 0, 0); add(wr, box(.2, .03, .2, tip), .75, 0, 0); g.add(wl, wr);
      scene.add(g); dyn.gulls.push({ g, wl, wr, cx: pick(r, [X + 40, 190, 50, X + 20]), cz: 58 + r() * 14, rad: 8 + r() * 14, h: 9 + r() * 7, sp: .2 + r() * .25, ph: r() * 6 });
    }
  }

  // ---------------- ARMI ----------------
  // Modello nel sistema dell'arma: canna verso +z, sopra verso +y, origine nel punto in cui la mano impugna.
  const WM = {};
  const wmat = (k, f) => WM[k] || (WM[k] = f());
  function weaponModel(kind) {
    const g = G0(), M2 = {
      black: wmat('black', () => std({ color: '#1e1e24', roughness: .45, metalness: .55 })), slide: wmat('slide', () => std({ color: '#2c2c34', roughness: .35, metalness: .6 })),
      chrome: wmat('chrome', () => std({ color: '#c8c8d2', roughness: .2, metalness: .85 })), silver: wmat('silver', () => std({ color: '#9a9aa6', roughness: .3, metalness: .8 })),
      wood: wmat('wood', () => std({ color: '#7a4424', roughness: .6 })), woodD: wmat('woodD', () => std({ color: '#5a3018', roughness: .6 })), bake: wmat('bake', () => std({ color: '#5a3422', roughness: .5 })),
      slot: wmat('slot', () => lam('#08080c')), glass: wmat('glass', () => std({ color: '#3f8a4a', roughness: .1, metalness: .1, transparent: true, opacity: .85, emissive: '#0c2a10' })),
      fuel: wmat('fuel', () => std({ color: '#e0a030', emissive: '#6a3a08', roughness: .3 })), rag: wmat('rag', () => lam('#e8e0cc')), ragR: wmat('ragR', () => lam('#b83030')),
    };
    const a = (w, h, d, m, x, y, z, rx) => { const b = box(w, h, d, m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; b.userData.noGhost = true; g.add(b); return b; };
    const c = (r0, r1, h, m, x, y, z, seg) => { const b = cyl(r0, r1, h, seg || 8, m); b.rotation.x = Math.PI / 2; b.position.set(x, y, z); b.userData.noGhost = true; g.add(b); return b; };
    let S = 1, muzzle = .3;
    if (kind === 'pistola') { // Beretta 92: carrello aperto, canna cromata in vista, guancette in legno
      S = 1.35;
      a(.05, .06, .33, M2.slide, 0, .078, .1); a(.03, .014, .13, M2.slot, 0, .11, .18); a(.022, .016, .11, M2.chrome, 0, .104, .18);
      c(.015, .015, .04, M2.chrome, 0, .082, .28); a(.044, .032, .2, M2.black, 0, .036, .13);
      for (let k = 0; k < 3; k++) a(.052, .04, .006, M2.slot, 0, .08, -.04 + k * .016);
      a(.012, .012, .075, M2.black, 0, -.004, .065); a(.012, .042, .012, M2.black, 0, .012, .1); a(.01, .032, .01, M2.chrome, 0, .016, .05);
      a(.022, .032, .02, M2.black, 0, .104, -.068, -.3); a(.012, .014, .012, M2.black, 0, .116, .25); a(.03, .012, .012, M2.black, 0, .116, -.05);
      const grip = G0(); grip.rotation.x = .26; grip.position.set(0, .01, -.02); g.add(grip);
      const gb = box(.046, .15, .066, M2.black); gb.position.y = -.06; grip.add(gb);
      [-1, 1].forEach(s => { const p = box(.008, .12, .054, M2.wood); p.position.set(s * .027, -.06, 0); grip.add(p); const sc = box(.009, .01, .01, M2.chrome); sc.position.set(s * .028, -.03, 0); grip.add(sc); });
      const mag = box(.04, .02, .06, M2.chrome); mag.position.y = -.14; grip.add(mag);
      grip.traverse(o => o.userData.noGhost = true);
      muzzle = .3;
    } else if (kind === 'lupara') { // doppietta a canne mozze, cani esterni, calcio tagliato a impugnatura
      S = 1.25;
      [-1, 1].forEach(s => { c(.027, .027, .46, M2.black, s * .028, .065, .25, 10); c(.029, .029, .02, M2.chrome, s * .028, .065, .48, 10); const hole = cyl(.018, .018, .021, 8, M2.slot); hole.rotation.x = Math.PI / 2; hole.position.set(s * .028, .065, .49); g.add(hole); });
      a(.012, .012, .46, M2.black, 0, .094, .25); c(.006, .006, .01, M2.chrome, 0, .104, .47);
      a(.08, .08, .12, M2.silver, 0, .055, -.03); for (let k = 0; k < 3; k++) a(.082, .004, .08, M2.slot, 0, .03 + k * .02, -.03);
      [-1, 1].forEach(s => { a(.014, .04, .02, M2.black, s * .022, .11, -.075, -.35); a(.016, .01, .016, M2.chrome, s * .022, .13, -.085); });
      a(.064, .04, .2, M2.wood, 0, .016, .14); for (let k = 0; k < 4; k++) a(.066, .004, .004, M2.woodD, 0, .016, .08 + k * .03);
      a(.014, .014, .08, M2.black, 0, -.01, -.03); a(.01, .03, .01, M2.chrome, -.008, .005, -.03); a(.01, .03, .01, M2.chrome, .008, .005, -.05);
      const grip = G0(); grip.rotation.x = .5; grip.position.set(0, .02, -.1); g.add(grip);
      const gb = box(.052, .17, .08, M2.wood); gb.position.y = -.07; grip.add(gb); const cap = box(.054, .02, .082, M2.woodD); cap.position.y = -.16; grip.add(cap);
      grip.traverse(o => o.userData.noGhost = true);
      muzzle = .49;
    } else if (kind === 'mitra') { // Skorpion vz.61: caricatore curvo, calcio in filo ripiegato sopra
      S = 1.4;
      a(.048, .072, .27, std({ color: '#262a30', roughness: .4, metalness: .6 }), 0, .056, .085);
      c(.014, .014, .09, M2.black, 0, .066, .26); c(.02, .02, .025, M2.black, 0, .066, .3);
      [-1, 1].forEach(s => { a(.008, .02, .012, M2.black, s * .014, .1, .205); const kn = cyl(.009, .009, .02, 6, M2.chrome); kn.rotation.z = Math.PI / 2; kn.position.set(s * .034, .07, .01); g.add(kn); });
      a(.02, .018, .02, M2.black, 0, .1, -.02);
      [-1, 1].forEach(s => a(.008, .008, .25, M2.chrome, s * .02, .1, .03)); a(.05, .026, .012, M2.chrome, 0, .1, .155); a(.05, .02, .01, M2.chrome, 0, .1, -.09);
      for (let k = 0; k < 5; k++) a(.03, .048, .05, M2.black, 0, -.005 - k * .042, .14 + k * .014, -.12 * k);
      a(.012, .012, .06, M2.black, 0, -.002, .06); a(.012, .03, .012, M2.black, 0, .012, .09); a(.01, .028, .01, M2.chrome, 0, .015, .05);
      const grip = G0(); grip.rotation.x = .32; grip.position.set(0, .02, -.01); g.add(grip);
      const gb = box(.044, .13, .062, M2.bake); gb.position.y = -.055; grip.add(gb);
      grip.traverse(o => o.userData.noGhost = true);
      muzzle = .32;
    } else if (kind === 'molotov') { // bottiglia con lo straccio acceso
      S = 1.35;
      const body = cyl(.046, .046, .17, 10, M2.glass); body.position.y = 0; g.add(body);
      const liq = cyl(.04, .04, .11, 8, M2.fuel); liq.position.y = -.025; g.add(liq);
      const sh = cyl(.018, .046, .05, 10, M2.glass); sh.position.y = .11; g.add(sh);
      const nk = cyl(.018, .018, .06, 8, M2.glass); nk.position.y = .165; g.add(nk);
      const r1 = box(.05, .09, .012, M2.rag); r1.position.set(0, .21, .01); r1.rotation.x = -.2; g.add(r1);
      const r2 = box(.045, .06, .012, M2.ragR); r2.position.set(.012, .17, .03); r2.rotation.set(-.5, 0, .3); g.add(r2);
      const lab = cyl(.047, .047, .05, 10, M2.rag); lab.position.y = .02; g.add(lab);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff8a30', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fl.scale.set(.22, .32, 1); fl.position.y = .29; g.add(fl);
      g.userData.flame = fl;
      g.traverse(o => o.userData.noGhost = true);
      muzzle = .3;
    }
    const flame = g.userData.flame;
    const out = mergeGroup(g); out.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.noGhost = true; } });
    out.scale.setScalar(S); out.userData.muzzle = muzzle * S; out.userData.kind = kind; out.userData.flame = flame;
    return out;
  }
  // ---------------- PERSONAGGI ----------------
  function person(look, isPlayer) {
    const g = new THREE.Group(), s = look.build || 1, M = c => lam(c);
    const skin = M(look.skin), top = M(look.top), bot = M(look.bottom), hair = M(look.hair || '#222'), dark = M('#141218'), ex = (look.extra || '').split(',');
    const body = new THREE.Group(); g.add(body);
    const hipY = .72;
    const legL = new THREE.Group(), legR = new THREE.Group(); legL.position.set(-.13 * s, hipY, 0); legR.position.set(.13 * s, hipY, 0);
    const lg = () => { const l = box(.2 * s, .7, .22, bot); l.position.y = -.35; const shoe = box(.22 * s, .1, .3, dark); shoe.position.set(0, -.68, .04); const gg = new THREE.Group(); gg.add(l, shoe); return gg; };
    legL.add(lg()); legR.add(lg()); body.add(legL, legR);
    const torso = box(.5 * s, .62, .3 * Math.max(1, s * .9), top); torso.position.y = hipY + .31; body.add(torso);
    if (isPlayer) { const tee = box(.2, .5, .02, M('#ece6da')); tee.position.set(0, hipY + .3, .16); body.add(tee); const col = box(.52, .08, .32, M('#5a1c16')); col.position.y = hipY + .6; body.add(col); }
    if (ex.includes('apron')) { const ap = box(.44 * s, .6, .02, M('#f4f1ea')); ap.position.set(0, hipY + .15, .17); body.add(ap); }
    if (ex.includes('overalls')) { const st = box(.08, .3, .02, M('#2a3526')); st.position.set(-.12, hipY + .45, .16); const st2 = st.clone(); st2.position.x = .12; body.add(st, st2); }
    if (ex.includes('collar')) { const cl = box(.12, .06, .02, M('#f4f4f4')); cl.position.set(0, hipY + .58, .16); body.add(cl); }
    if (ex.includes('belt')) { const bl = box(.52 * s, .07, .32, M('#e8e8e8')); bl.position.y = hipY + .04; body.add(bl); }
    if (ex.includes('gold')) { const gd = box(.14, .04, .02, M('#e8c040')); gd.position.set(0, hipY + .5, .16); body.add(gd); }
    if (ex.includes('shawl')) { const sh = box(.56 * s, .22, .34, M('#8a6aa0')); sh.position.y = hipY + .52; body.add(sh); }
    const arm = (side) => { const a = new THREE.Group(); a.position.set(side * (.3 * s), hipY + .58, 0); const u = box(.15, .58, .16, top); u.position.y = -.28; const h = box(.14, .14, .14, skin); h.position.y = -.62; a.add(u, h); body.add(a); return a; };
    const armL = arm(-1), armR = arm(1);
    const headG = new THREE.Group(); headG.position.y = hipY + .62 + .24; body.add(headG);
    const head = box(.44, .44, .4, skin); headG.add(head);
    const eyeM = M('#141018'); [-.1, .1].forEach(x => { const e = box(.07, .08, .02, eyeM); e.position.set(x, .02, .205); headG.add(e); });
    const hairTop = box(.47, .12, .43, hair); hairTop.position.y = .23; headG.add(hairTop);
    const hairBack = box(.47, .34, .08, hair); hairBack.position.set(0, .06, -.2); headG.add(hairBack);
    const hc = M(look.hatCol || '#333');
    switch (look.hat) {
      case 'cap': { const c = box(.48, .14, .45, hc); c.position.y = .27; const br = box(.4, .04, .2, hc); br.position.set(0, .2, .3); headG.add(c, br); break; }
      case 'capback': { const c = box(.48, .14, .45, hc); c.position.y = .27; const br = box(.4, .04, .2, hc); br.position.set(0, .2, -.3); headG.add(c, br); break; }
      case 'beanie': { const c = box(.48, .2, .45, hc); c.position.y = .3; headG.add(c); break; }
      case 'flat': { const c = box(.5, .1, .5, hc); c.position.set(0, .27, .04); headG.add(c); break; }
      case 'fedora': { const c = box(.36, .2, .34, hc); c.position.y = .36; const br = box(.66, .04, .6, hc); br.position.y = .26; headG.add(c, br); break; }
      case 'police': { const c = box(.48, .16, .46, M('#1b2544')); c.position.y = .3; const band = box(.49, .05, .47, M('#e8e8e8')); band.position.y = .25; const br = box(.4, .03, .16, dark); br.position.set(0, .22, .3); headG.add(c, band, br); break; }
      case 'bun': { const bn = box(.2, .2, .2, hair); bn.position.set(0, .34, -.12); headG.add(bn); break; }
      case 'long': { const hl = box(.48, .55, .12, hair); hl.position.set(0, -.12, -.2); headG.add(hl); break; }
      case 'pony': { const p = box(.12, .3, .12, hair); p.position.set(0, .05, -.28); headG.add(p); break; }
      case 'slick': { hairTop.scale.y = .6; hairTop.position.y = .22; break; }
      case 'scarf': { const sc = box(.5, .2, .47, hc); sc.position.y = .24; const kn = box(.15, .15, .1, hc); kn.position.set(0, -.1, -.24); headG.add(sc, kn); break; }
    }
    if (isPlayer) { const q = box(.3, .14, .22, hair); q.position.set(0, .31, .1); headG.add(q); }
    if (ex.includes('moustache')) { const m = box(.2, .05, .02, hair.color ? M('#2a1a12') : dark); m.position.set(0, -.08, .21); headG.add(m); }
    if (ex.includes('glasses')) { const gl = box(.34, .06, .02, M('#1a1a1a')); gl.position.set(0, .03, .215); headG.add(gl); }
    if (ex.includes('shades')) { const gl = box(.38, .09, .02, M('#050508')); gl.position.set(0, .03, .215); headG.add(gl); }
    const shadowC = new THREE.Mesh(new THREE.CircleGeometry(.38, 8), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .35, depthWrite: false })); shadowC.rotation.x = -Math.PI / 2; shadowC.position.y = .02; g.add(shadowC);
    const carry = new THREE.Group(); carry.position.set(0, hipY + .35, .35); carry.visible = false; body.add(carry);
    const cbox = box(.45, .35, .35, lam('#8a6440')); carry.add(cbox);
    // le armi si creano solo quando servono (vedi gunFor in animPerson)
    const guns = {};
    const mats = []; g.traverse(o => { if (o.isMesh && !o.userData.noGhost && o.material && o.material.emissive && !mats.includes(o.material) && !Object.values(WM).includes(o.material)) mats.push(o.material); });
    g.traverse(o => { if (o.isMesh && o !== shadowC) { o.castShadow = true; } });
    g.userData = { body, legL, legR, armL, armR, headG, carry, cbox, s, guns, mats, shadowC };
    return g;
  }
  // arma vera nella mano destra: il braccio punta in basso (-y); l'involucro gira la canna lungo il braccio
  function gunFor(u, k) {
    if (u.guns[k]) return u.guns[k];
    const w = weaponModel(k), wrap = new THREE.Group(); wrap.position.set(0, -.63, .03);
    if (k !== 'molotov') wrap.rotation.x = Math.PI / 2; else wrap.position.set(0, -.66, .05);
    wrap.add(w); wrap.visible = false; wrap.userData.model = w; u.armR.add(wrap); u.guns[k] = wrap; return wrap;
  }
  function animPerson(g, o) {
    const u = g.userData; if (o.weapon) gunFor(u, o.weapon);
    const ph = o.anim || 0, moving = Math.abs(o.speed || 0) > .1;
    const amp = moving ? Math.min(.9, .35 + Math.abs(o.speed) * .12) : 0;
    u.legL.rotation.x = Math.sin(ph) * amp; u.legR.rotation.x = -Math.sin(ph) * amp;
    u.armL.rotation.x = -Math.sin(ph) * amp * .8; u.armR.rotation.x = Math.sin(ph) * amp * .8;
    u.body.position.y = moving ? Math.abs(Math.sin(ph)) * .06 : Math.sin(ph * .8) * .01;
    u.armL.rotation.z = 0; u.armR.rotation.z = 0;
    if (o.gesture > 0) { u.armR.rotation.x = -1.8 + Math.sin(ph * 4) * .4; u.armR.rotation.z = -.2; }
    if (o.punch > 0) { u.armR.rotation.x = -1.6; }
    if (o.carrying) { u.armL.rotation.x = u.armR.rotation.x = -1.2; u.carry.visible = true; } else u.carry.visible = false;
    if (o.seated) { u.legL.rotation.x = u.legR.rotation.x = -1.3; u.armL.rotation.x = u.armR.rotation.x = -1.0; u.body.position.y = -.25; }
    u.body.rotation.x = 0; u.body.position.z = 0;
    if (o.down) { u.body.rotation.x = -Math.PI / 2; u.body.position.y = .2; u.body.position.z = -.4; }
    u.headG.rotation.y = o.look || 0;
    for (const k in u.guns) u.guns[k].visible = o.weapon === k && !o.down;
    if (o.weapon && o.weapon !== 'molotov' && !o.down && !o.seatedCar) {
      u.armR.rotation.x = -Math.PI / 2 + (o.recoil || 0) * .6; u.armR.rotation.z = 0;
      if (o.weapon !== 'pistola') { u.armL.rotation.x = -1.35; u.armL.rotation.z = -.55; } else if (o.twoHand) { u.armL.rotation.x = -1.45; u.armL.rotation.z = -.35; }
    }
    if (o.weapon === 'molotov' && !o.down) { u.armR.rotation.x = o.punch > 0 ? -2.6 : -.4; }
    const hit = o.hit || 0; u.mats.forEach(m => m.emissive.setRGB(hit, hit * .9, hit * .8));
    if (o.handsUp) { u.armL.rotation.x = u.armR.rotation.x = -2.9; u.armL.rotation.z = -.2; u.armR.rotation.z = .2; }
  }

  // ---------------- VEICOLI ----------------
  // Le carrozzerie sono profili laterali estrusi sulla larghezza, con i passaruota ritagliati.
  // Misure in metri: lunghezza e larghezza coincidono con VK.len e VK.wid di game.js. Muso verso +z.
  function sideShape(top, wells, yb) {
    const s = new THREE.Shape(); s.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i < top.length; i++) s.lineTo(top[i][0], top[i][1]);
    const ws = (wells || []).slice().sort((a, b) => a[0] - b[0]);
    ws.forEach(([z, r]) => { s.lineTo(z - r, yb); s.absarc(z, yb, r, Math.PI, 0, true); });
    s.lineTo(top[0][0], yb); s.closePath(); return s;
  }
  function extrudeSide(shape, width, bevel) {
    const bt = bevel === undefined ? .07 : bevel;
    const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.01, width - bt * 2), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt * .8, bevelSegments: 2, curveSegments: 6 });
    geo.rotateY(-Math.PI / 2); geo.translate(width / 2 - bt, 0, 0);
    return geo;
  }
  // vetro disteso tra due punti del profilo (parabrezza e lunotto)
  function glassPanel(A, B, width, mat, out) {
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), m = box(width, .03, len, mat);
    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    m.position.set(0, (A[1] + B[1]) / 2 + (out || .02) * Math.cos(ang) * Math.sign(B[0] - A[0] || 1), (A[0] + B[0]) / 2 - (out || .02) * Math.sin(ang) * Math.sign(B[0] - A[0] || 1));
    m.rotation.x = -ang; return m;
  }
  function crackTexture() {
    const c = mk(32, 32), x = c.getContext('2d'); x.fillStyle = '#233040'; x.fillRect(0, 0, 32, 32);
    x.strokeStyle = 'rgba(230,240,255,.85)'; x.lineWidth = 1;
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; x.beginPath(); x.moveTo(12, 14); let px = 12, py = 14; for (let s = 0; s < 4; s++) { px += Math.cos(a + (Math.random() - .5)) * 5; py += Math.sin(a + (Math.random() - .5)) * 5; x.lineTo(px, py); } x.stroke(); }
    x.beginPath(); x.arc(12, 14, 4, 0, 7); x.stroke(); return canvasTex(c);
  }
  let CRACK = null;
  const WHM = {};
  function wheel(r, w, hubCol) { // due soli materiali: gomma scura e cerchio cromato (la croce scura rende visibile la rotazione)
    const dark = WHM.d || (WHM.d = sl('#141318')), hub = WHM[hubCol] || (WHM[hubCol] = std({ color: hubCol || '#c8c8d0', metalness: .7, roughness: .25 }));
    const g = G0(), tire = cyl(r, r, w, 14, dark); tire.rotation.z = Math.PI / 2; g.add(tire);
    const h = cyl(r * .58, r * .58, w + .03, 12, hub); h.rotation.z = Math.PI / 2; g.add(h);
    [0, Math.PI / 2].forEach(a => { const sp = box(w + .05, r * 1.0, .06, dark); sp.rotation.x = a; g.add(sp); });
    const cap = cyl(r * .2, r * .2, w + .06, 8, hub); cap.rotation.z = Math.PI / 2; g.add(cap);
    return mergeGroup(g);
  }
  function liveryTex(text, base, stripe) {
    const c = mk(256, 32), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 32);
    x.fillStyle = stripe; x.fillRect(0, 10, 256, 13);
    x.fillStyle = '#1a3a7a'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText(text, 128, 21);
    x.fillStyle = '#1a3a7a'; x.fillRect(0, 24, 256, 2);
    return canvasTex(c);
  }
  // dati dei modelli: profilo della scocca, profilo dell'abitacolo, finestrini laterali, passaruota
  const CARS = {
    cinquecento: { L: 3.0, W: 1.4, CW: 1.2, r: .27, yb: .27,
      body: [[1.5, .22], [1.53, .42], [1.46, .6], [1.25, .72], [.85, .78], [.55, .8], [-.95, .8], [-1.28, .74], [-1.47, .6], [-1.52, .4], [-1.5, .22]],
      cab: [[.6, .79], [.14, 1.3], [-.2, 1.34], [-.62, 1.32], [-1.05, .8]], win: [[.48, .84], [.14, 1.24], [-.6, 1.26], [-.94, .85]],
      ws: [[.52, .82], [.16, 1.26]], rw: [[-.64, 1.28], [-.98, .84]], wells: [[.95, .35], [-.98, .35]], lamps: 'round1', bumper: 'chrome', hub: '#d8d8e0' },
    ritmo: { L: 3.9, W: 1.65, CW: 1.46, r: .3, yb: .3,
      body: [[1.95, .24], [1.98, .56], [1.92, .72], [1.2, .83], [.78, .87], [-1.82, .92], [-1.95, .74], [-1.97, .32], [-1.95, .24]],
      cab: [[.82, .86], [.08, 1.37], [-1.32, 1.39], [-1.86, .93]], win: [[.7, .91], [.1, 1.31], [-1.28, 1.33], [-1.74, .95]],
      ws: [[.74, .88], [.1, 1.33]], rw: [[-1.36, 1.35], [-1.8, .95]], wells: [[1.25, .38], [-1.22, .38]], lamps: 'round2', bumper: 'plastic', hub: '#4a4a52' },
    giulia: { L: 4.1, W: 1.6, CW: 1.42, r: .3, yb: .3,
      body: [[2.05, .24], [2.08, .5], [2.03, .7], [1.9, .75], [1.2, .79], [.8, .82], [-1.28, .84], [-1.9, .83], [-2.04, .74], [-2.07, .32], [-2.04, .24]],
      cab: [[.85, .81], [.3, 1.35], [-.88, 1.37], [-1.34, .86]], win: [[.74, .86], [.3, 1.3], [-.85, 1.32], [-1.24, .88]],
      ws: [[.78, .84], [.32, 1.31]], rw: [[-.92, 1.33], [-1.3, .88]], wells: [[1.3, .37], [-1.27, .37]], lamps: 'quad', bumper: 'chrome', hub: '#c8c8d0', shield: true },
    polizia: { L: 4.3, W: 1.66, CW: 1.46, r: .31, yb: .31,
      body: [[2.15, .25], [2.18, .52], [2.12, .72], [1.05, .85], [.88, .87], [-1.28, .9], [-2.05, .9], [-2.15, .78], [-2.18, .32], [-2.14, .25]],
      cab: [[.93, .86], [.32, 1.38], [-.78, 1.4], [-1.38, .92]], win: [[.8, .91], [.33, 1.33], [-.76, 1.35], [-1.26, .94]],
      ws: [[.84, .89], [.35, 1.34]], rw: [[-.82, 1.36], [-1.33, .93]], wells: [[1.38, .38], [-1.38, .38]], lamps: 'quad', bumper: 'chrome', hub: '#c8c8d0', shield: true },
  };
  function carMesh(kind, color, police) {
    if (kind === 'ape') return apeMesh(color);
    const D = CARS[kind], g = G0(), paint = std({ color, roughness: .32, metalness: .35 }), chrome = std({ color: '#d0d0d8', metalness: .8, roughness: .2 }), dark = sl('#141218');
    const glass = std({ color: '#1e2a3a', roughness: .08, metalness: .5, emissive: '#0a1422' });
    const hl = new THREE.MeshBasicMaterial({ color: '#fff4d0', toneMapped: false }), tl = new THREE.MeshBasicMaterial({ color: '#b01818', toneMapped: false });
    const ud = { paint: [paint], glass, lamps: [], tails: [], tlMat: tl, wheels: [], front: [], dents: 0, parts: {} };
    const bodyGeo = extrudeSide(sideShape(D.body, D.wells, D.yb), D.W, .08); const body = new THREE.Mesh(bodyGeo, paint); g.add(body); ud.body = body;
    const cab = new THREE.Mesh(extrudeSide(sideShape(D.cab, [], D.cab[0][1]), D.CW, .07), paint); g.add(cab);
    const winGeo = extrudeSide(sideShape(D.win, [], D.win[0][1]), D.CW + .04, 0); const win = new THREE.Mesh(winGeo, glass); g.add(win);
    const pillar = box(D.CW + .06, .5, .07, paint); pillar.position.set(0, (D.win[0][1] + D.win[1][1]) / 2 + .02, (D.win[1][0] + D.win[2][0]) / 2 - .05); pillar.rotation.x = -.1; g.add(pillar);
    const ws = glassPanel(D.ws[0], D.ws[1], D.CW - .16, glass, .045); g.add(ws); ud.ws = ws;
    g.add(glassPanel(D.rw[0], D.rw[1], D.CW - .2, glass, .045));
    const L = D.L, Wd = D.W, fz = L / 2 + .065, rz = -L / 2 - .065;
    // interni scuri visti dai finestrini
    const inside = box(D.CW - .1, .3, Math.abs(D.win[0][0] - D.win[3][0]), dark); inside.position.set(0, D.win[0][1] + .05, (D.win[0][0] + D.win[3][0]) / 2); g.add(inside);
    // paraurti
    const bm = D.bumper === 'plastic' ? sm('#2a2a30', { roughness: .7 }) : chrome;
    const bf = box(Wd + .06, D.bumper === 'plastic' ? .2 : .1, .14, bm); bf.position.set(0, .36, fz + .02); g.add(bf); ud.parts.bumper = bf;
    const br = box(Wd + .06, D.bumper === 'plastic' ? .2 : .1, .14, bm); br.position.set(0, .36, rz - .02); g.add(br);
    // fari e fanali
    const lampAt = (x, y, rad) => { const l = cyl(rad, rad, .06, 10, hl); l.rotation.x = Math.PI / 2; l.position.set(x, y, fz + .01); g.add(l); const rim = cyl(rad + .025, rad + .025, .05, 10, chrome); rim.rotation.x = Math.PI / 2; rim.position.set(x, y, fz - .005); g.add(rim); ud.lamps.push([x, y, fz + .05]); ud.front.push(l); return l; };
    if (D.lamps === 'round1') { [-1, 1].forEach(s => lampAt(s * .5, .6, .09)); const mo = box(.5, .04, .04, chrome); mo.position.set(0, .52, fz + .03); g.add(mo); for (let k = 0; k < 6; k++) { const lv = box(.5, .025, .02, dark); lv.position.set(0, .45 + k * .05, rz - .02); g.add(lv); } }
    else if (D.lamps === 'round2') { [-1, 1].forEach(s => { lampAt(s * .6, .6, .1); lampAt(s * .36, .6, .08); }); const gr = box(.36, .12, .03, dark); gr.position.set(0, .6, fz + .02); g.add(gr); }
    else { [-1, 1].forEach(s => { lampAt(s * .62, .6, .085); lampAt(s * .4, .6, .075); }); const gr = box(1.44, .16, .03, dark); gr.position.set(0, .6, fz + .005); g.add(gr); for (let k = 0; k < 3; k++) { const gb = box(1.3, .015, .035, chrome); gb.position.set(0, .54 + k * .05, fz + .01); g.add(gb); } }
    if (D.shield) { const sh = new THREE.Mesh(new THREE.ConeGeometry(.1, .24, 3), chrome); sh.rotation.set(Math.PI / 2, 0, Math.PI); sh.scale.set(1, 1, .3); sh.position.set(0, .58, fz + .04); sh.rotation.z = 0; sh.rotation.x = -Math.PI / 2; g.add(sh); const sh2 = box(.14, .2, .02, dark); sh2.position.set(0, .56, fz + .035); g.add(sh2); }
    [-1, 1].forEach(s => { const t = box(kind === 'giulia' ? .12 : .3, kind === 'giulia' ? .22 : .14, .05, tl); t.position.set(s * (Wd / 2 - .22), .62, rz - .01); g.add(t); ud.tails.push(t); const ind = box(.12, .08, .05, sb('#ff9a20')); ind.position.set(s * (Wd / 2 - .08), .45, fz); g.add(ind); });
    const plate = box(.5, .12, .02, sm('#f0f0f0')); plate.position.set(0, .4, rz - .1); g.add(plate); const plf = plate.clone(); plf.position.z = fz + .1; plf.position.y = .32; g.add(plf);
    // maniglie, specchietti, modanatura cromata
    [-1, 1].forEach(s => { const mir = box(.12, .08, .1, chrome); mir.position.set(s * (D.CW / 2 + .1), D.win[0][1] + .05, D.win[0][0] - .1); g.add(mir); const h = box(.02, .03, .14, chrome); h.position.set(s * (Wd / 2 + .005), .74, -.1); g.add(h); const mold = box(.015, .03, L * .8, chrome); mold.position.set(s * (Wd / 2 + .005), .56, 0); g.add(mold); });
    if (kind === 'cinquecento') { const roofC = box(.7, .02, .8, sm('#2a2226')); roofC.position.set(0, 1.35, -.25); g.add(roofC); }
    // ruote
    D.wells.forEach(([z]) => [-1, 1].forEach(s => { const piv = G0(); piv.position.set(s * (Wd / 2 - .14), D.r, z); const wh = wheel(D.r, .2, D.hub); piv.add(wh); g.add(piv); ud.wheels.push({ wh, piv, front: z > 0, r: D.r }); }));
    // passaruota scuri
    D.wells.forEach(([z, rr]) => { const in1 = cyl(rr - .02, rr - .02, Wd - .1, 12, dark); in1.rotation.z = Math.PI / 2; in1.position.set(0, D.yb, z); in1.scale.set(1, 1, 1); g.add(in1); });
    if (police) {
      const lv = std({ map: liveryTex('POLIZIA', color, '#f4f4f4'), roughness: .35, metalness: .3 });
      [-1, 1].forEach(s => { const side = new THREE.Mesh(new THREE.PlaneGeometry(L * .78, .26), lv); side.rotation.y = s * Math.PI / 2; side.position.set(s * (Wd / 2 + .075), .6, -.05); g.add(side); });
      const roofN = new THREE.Mesh(new THREE.PlaneGeometry(.6, .3), new THREE.MeshBasicMaterial({ map: signTexture('113', '#1a3a7a', '#f4f4f4') })); roofN.rotation.x = -Math.PI / 2; roofN.position.set(0, 1.42, -.6); g.add(roofN);
      const barM = box(1.1, .1, .28, sm('#e8e8e8')); barM.position.set(0, 1.47, -.2); g.add(barM);
      const bl = new THREE.MeshBasicMaterial({ color: '#2a6aff', toneMapped: false }), bl2 = new THREE.MeshBasicMaterial({ color: '#2a6aff', toneMapped: false });
      const b1 = box(.3, .18, .24, bl); b1.position.set(-.36, 1.6, -.2); const b2 = box(.3, .18, .24, bl2); b2.position.set(.36, 1.6, -.2); g.add(b1, b2);
      const sirenS = box(.3, .12, .2, sm('#cfcfd8')); sirenS.position.set(0, 1.58, -.2); g.add(sirenS);
      ud.beacons = [bl, bl2];
    }
    ud.seat = [-.32, D.yb + .35, (D.win[0][0] + D.win[3][0]) / 2 + .15]; ud.seat2 = [.32, D.yb + .35, (D.win[0][0] + D.win[3][0]) / 2 + .15];
    ud.len = L;
    return finishVehicle(g, ud);
  }
  // fonde i pezzi fissi del mezzo: restano separati scocca (ammaccature), ruote, parabrezza, fari e paraurti
  function finishVehicle(g, ud) {
    if (ud.body) ud.body.userData.keep = true; if (ud.ws) ud.ws.userData.keep = true; if (ud.parts.bumper) ud.parts.bumper.userData.keep = true;
    ud.front.forEach(m => m.userData.keep = true); ud.wheels.forEach(w => w.piv.userData.keepTree = true);
    const out = mergeGroup(g); out.userData = ud; return out;
  }
  function apeMesh(color) {
    const g = G0(), paint = std({ color, roughness: .35, metalness: .3 }), dark = sl('#141218'), chrome = std({ color: '#d0d0d8', metalness: .8, roughness: .2 });
    const glass = std({ color: '#1e2a3a', roughness: .08, metalness: .5, emissive: '#0a1422' }), hl = new THREE.MeshBasicMaterial({ color: '#fff4d0', toneMapped: false }), tl = new THREE.MeshBasicMaterial({ color: '#b01818', toneMapped: false });
    const ud = { paint: [paint], glass, lamps: [], tails: [], tlMat: tl, wheels: [], front: [], dents: 0, parts: {} };
    // cabina tondeggiante
    const cabS = sideShape([[1.4, .32], [1.43, .7], [1.34, 1.15], [1.1, 1.55], [.7, 1.66], [.28, 1.64], [.2, 1.3], [.2, .32]], [], .32);
    const cab = new THREE.Mesh(extrudeSide(cabS, 1.2, .1), paint); g.add(cab); ud.body = cab;
    g.add(glassPanel([1.36, 1.12], [1.1, 1.52], 1.0, glass, .07));
    const sw = new THREE.Mesh(extrudeSide(sideShape([[1.02, 1.12], [.96, 1.46], [.7, 1.56], [.36, 1.55], [.36, 1.12]], [], 1.12), 1.24, 0), glass); g.add(sw);
    const inside = box(1, .4, .6, dark); inside.position.set(0, 1.2, .8); g.add(inside);
    // cassone con le sponde e il carico
    const bed = box(1.3, .12, 1.7, sm('#6a5a4a')); bed.position.set(0, .6, -.62); g.add(bed);
    [[.65, 0], [-.65, 0]].forEach(([x]) => { const sp = box(.06, .42, 1.7, paint); sp.position.set(x, .87, -.62); g.add(sp); });
    const back = box(1.3, .42, .06, paint); back.position.set(0, .87, -1.46); g.add(back);
    const frame = box(.9, .2, 2.4, dark); frame.position.set(0, .38, -.1); g.add(frame);
    const cr = box(.6, .5, .6, sm('#8a6440')); cr.position.set(.25, .92, -.95); g.add(cr);
    const cr2 = box(.5, .4, .5, sm('#7a5430')); cr2.position.set(-.3, .87, -.35); g.add(cr2);
    for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.1, 0), sl(pick(rng(k), ['#e0b030', '#c84a2a', '#4a8a3a']))); f.position.set(-.35 + (k % 3) * .12, 1.12, -.35 + Math.floor(k / 3) * .12); g.add(f); }
    const lamp = cyl(.1, .1, .06, 10, hl); lamp.rotation.x = Math.PI / 2; lamp.position.set(0, .85, 1.44); g.add(lamp); ud.front.push(lamp); ud.lamps.push([0, .85, 1.48]);
    const mud = box(.3, .06, .5, paint); mud.position.set(0, .56, 1.05); g.add(mud);
    [-1, 1].forEach(s => { const t = box(.14, .12, .05, tl); t.position.set(s * .55, .62, -1.5); g.add(t); ud.tails.push(t); });
    const fp = G0(); fp.position.set(0, .26, 1.05); const fw = wheel(.26, .16, '#c8c8d0'); fp.add(fw); g.add(fp); ud.wheels.push({ wh: fw, piv: fp, front: true, r: .26 });
    [-1, 1].forEach(s => { const p = G0(); p.position.set(s * .56, .26, -.95); const w = wheel(.26, .18, '#c8c8d0'); p.add(w); g.add(p); ud.wheels.push({ wh: w, piv: p, front: false, r: .26 }); });
    ud.seat = [0, .6, .75]; ud.len = 2.8;
    return finishVehicle(g, ud);
  }
  // Vespa: scudo, scocca posteriore bombata, sella, faro sul manubrio
  function vespaMesh(color) {
    const g = G0(), c = std({ color, roughness: .32, metalness: .3 }), dark = sl('#141218'), chrome = std({ color: '#d0d0d8', metalness: .8, roughness: .2 });
    const ud = { paint: [c], lamps: [[0, 1.26, .78]], tails: [], wheels: [], front: [], two: true, dents: 0, parts: {} };
    const rearS = sideShape([[.05, .42], [.08, .62], [-.05, .8], [-.35, .9], [-.7, .86], [-.9, .72], [-.97, .5], [-.95, .34]], [[-.6, .24]], .34);
    const rear = new THREE.Mesh(extrudeSide(rearS, .56, .12), c); g.add(rear); ud.body = rear;
    const floor = box(.42, .06, .62, sm('#2a2a30')); floor.position.set(0, .34, .32); g.add(floor);
    for (let k = 0; k < 4; k++) { const st = box(.4, .02, .02, sl('#6a6a70')); st.position.set(0, .38, .1 + k * .14); g.add(st); }
    const shield = new THREE.Mesh(extrudeSide(sideShape([[.72, .32], [.78, .7], [.74, 1.08], [.66, 1.1], [.64, .7], [.6, .34]], [], .32), .58, .06), c); g.add(shield);
    const fender = new THREE.Mesh(new THREE.SphereGeometry(.24, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c); fender.scale.set(.75, .8, 1.25); fender.position.set(0, .4, .86); g.add(fender);
    const fork = box(.06, .4, .06, dark); fork.position.set(.08, .38, .86); g.add(fork);
    const col = cyl(.05, .05, .3, 6, c); col.position.set(0, 1.18, .7); g.add(col);
    const bar = box(.74, .1, .12, c); bar.position.set(0, 1.3, .7); g.add(bar);
    [-1, 1].forEach(s => { const gr = cyl(.035, .035, .12, 6, dark); gr.rotation.z = Math.PI / 2; gr.position.set(s * .42, 1.3, .7); g.add(gr); const mir = cyl(.05, .05, .02, 8, chrome); mir.rotation.x = Math.PI / 2; mir.position.set(s * .32, 1.5, .68); g.add(mir); const ms = box(.015, .2, .015, chrome); ms.position.set(s * .32, 1.4, .69); g.add(ms); });
    const lampH = cyl(.1, .1, .08, 10, new THREE.MeshBasicMaterial({ color: '#fff4c8', toneMapped: false })); lampH.rotation.x = Math.PI / 2; lampH.position.set(0, 1.26, .78); g.add(lampH); ud.front.push(lampH);
    const lampR = cyl(.12, .12, .05, 10, chrome); lampR.rotation.x = Math.PI / 2; lampR.position.set(0, 1.26, .75); g.add(lampR);
    const seat = new THREE.Mesh(extrudeSide(sideShape([[.0, .88], [-.05, .98], [-.7, .98], [-.8, .9]], [], .86), .36, .06), sm('#3a2418', { roughness: .8 })); g.add(seat);
    const rack = box(.34, .03, .3, chrome); rack.position.set(0, .98, -.85); g.add(rack);
    const tail = box(.18, .08, .05, new THREE.MeshBasicMaterial({ color: '#b01818', toneMapped: false })); tail.position.set(0, .72, -.98); g.add(tail); ud.tails.push(tail); ud.tlMat = tail.material;
    const fp = G0(); fp.position.set(0, .22, .86); const fw = wheel(.22, .14, '#c8c8d0'); fp.add(fw); g.add(fp); ud.wheels.push({ wh: fw, piv: fp, front: true, r: .22 });
    const rp = G0(); rp.position.set(0, .22, -.6); const rw = wheel(.22, .15, '#c8c8d0'); rp.add(rw); g.add(rp); ud.wheels.push({ wh: rw, piv: rp, front: false, r: .22 });
    const exh = cyl(.06, .06, .5, 6, chrome); exh.rotation.x = Math.PI / 2; exh.position.set(.26, .28, -.55); g.add(exh);
    ud.len = 1.9; return finishVehicle(g, ud);
  }
  function driverMesh(look, cap) {
    const g = G0();
    const t = box(.46, .45, .28, lam(look.top)); t.position.y = .22; const h = box(.36, .36, .34, lam(look.skin)); h.position.y = .62;
    const hr = box(.38, .1, .36, lam(cap ? '#1b2544' : (look.hair || '#222'))); hr.position.y = .83;
    const arm = box(.12, .12, .4, lam(look.top)); arm.position.set(.2, .3, .25); g.add(t, h, hr, arm); return g;
  }
  // segni delle gomme: un nastro scuro a terra per ogni ruota posteriore che slitta (un solo buffer circolare)
  const SKID = { N: 2400, i: 0, geo: null, m: null };
  function buildSkids() {
    const pos = new Float32Array(SKID.N * 18), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.attributes.position.setUsage(THREE.DynamicDrawUsage);
    for (let i = 1; i < pos.length; i += 3) pos[i] = -99;
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#0c0808', transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.frustumCulled = false; m.renderOrder = 1; scene.add(m); SKID.geo = g; SKID.m = m;
  }
  function skidSeg(x0, z0, x1, z1, w) {
    if (!SKID.geo) buildSkids();
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
    const y0 = groundH(x0, z0) + .028, y1 = groundH(x1, z1) + .028, a = SKID.geo.attributes.position.array, o = SKID.i * 18;
    a.set([x0 + nx, y0, z0 + nz, x0 - nx, y0, z0 - nz, x1 - nx, y1, z1 - nz, x0 + nx, y0, z0 + nz, x1 - nx, y1, z1 - nz, x1 + nx, y1, z1 + nz], o);
    SKID.i = (SKID.i + 1) % SKID.N; SKID.geo.attributes.position.needsUpdate = true;
  }
  function skidTrack(v, u, g, dt) {
    const sp = v.vx !== undefined ? Math.hypot(v.vx, v.vy) : Math.abs(v.speed), on = !v.hidden && !v.wreck && (v.skid || 0) > .28 && sp > 1.5;
    if (!u.skidL) u.skidL = [];
    const rear = u.wheels.filter(w => !w.front), ca = Math.cos(v.ang), sa = Math.sin(v.ang);
    rear.forEach((w, i) => {
      if (!on) { u.skidL[i] = null; return; }
      const lx = w.piv.position.x, lz = w.piv.position.z, x = v.x + lz * ca + lx * sa, z = v.y + lz * sa - lx * ca;
      const L = u.skidL[i];
      if (L && Math.hypot(x - L[0], z - L[1]) > .22) { if (Math.hypot(x - L[0], z - L[1]) < 3) skidSeg(L[0], L[1], x, z, u.two ? .1 : .2); u.skidL[i] = [x, z]; }
      else if (!L) u.skidL[i] = [x, z];
      if (Math.random() < dt * 14 * v.skid) smoke(x, groundH(x, z) + .25, z, '#d8d2cc', .55 + v.skid * .6, .9 + Math.random() * .6, .5);
    });
  }
  let beamGeo = null, poolGeo = null;
  function vehicleMesh(v) {
    const K = G.VK[v.kind];
    const glb = K.glb && window.Models && Models.has(K.glb) ? Models.vehicle(K.glb, K, v.color) : null;
    const g = glb || (v.kind === 'vespa' ? vespaMesh(v.color) : carMesh(K.mesh || v.kind, v.color, v.police));
    if (K.scale && !glb) g.scale.set(K.scale[0], K.scale[1], K.scale[2]);
    g.userData.glbWait = !!K.glb && !glb;
    if (window.RisaccaUI && RisaccaUI.dressVehicle) { try { RisaccaUI.dressVehicle(g, v, THREE); } catch (e) { } } // corazze, rostri, insegne militari
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(K.wid + .5, K.len + .4), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: .42, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = .03; g.add(sh);
    g.traverse(o => { if (o.isMesh && o !== sh) o.castShadow = true; });
    const u = g.userData;
    if (u.seat) {
      u.drv = driverMesh(v.driverLook || { top: '#8c2f24', skin: '#dcae88', hair: '#17110e' }, v.police); u.drv.position.set(...u.seat); g.add(u.drv);
      if (v.police) { u.drv2 = driverMesh({ top: '#23355e', skin: '#c99a76' }, true); u.drv2.position.set(...u.seat2); g.add(u.drv2); }
    }
    // fari: alone, cono di luce e chiazza sull'asfalto
    if (!beamGeo) { beamGeo = new THREE.ConeGeometry(1.5, 8, 12, 1, true); beamGeo.translate(0, -4, 0); beamGeo.rotateX(-Math.PI / 2); poolGeo = new THREE.CircleGeometry(1, 16); poolGeo.rotateX(-Math.PI / 2); }
    const bmat = new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    u.glows = u.lamps.map(L => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff0c0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(.9, .9, 1); s.position.set(L[0], L[1], L[2] + .15); g.add(s); return s; });
    u.beams = u.lamps.slice(0, 2).map(L => { const b = new THREE.Mesh(beamGeo, bmat); b.position.set(L[0], L[1], L[2]); b.rotation.x = .08; g.add(b); return b; });
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({ color: '#fff0c0', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    pool.scale.set(v.kind === 'vespa' ? 1.3 : 2.2, 1, v.kind === 'vespa' ? 2 : 3.2); pool.position.set(0, .04, (u.len || 3) / 2 + 3.4); g.add(pool); u.pool = pool;
    u.tailGlows = u.tails.map(t => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff2020', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 })); s.scale.set(.8, .8, 1); s.position.copy(t.position); s.position.z -= .1; g.add(s); return s; });
    u.spin = 0; u.hpSeen = v.hp; u.steer = 0;
    g.rotation.order = 'YXZ';
    return g;
  }
  // ammaccatura: spinge verso l'interno i vertici della scocca vicino al punto colpito
  function dent(u, lx, ly, lz, depth) {
    const geo = u.body.geometry, p = geo.attributes.position, R = .55;
    for (let i = 0; i < p.count; i++) {
      const dx = p.getX(i) - lx, dy = p.getY(i) - ly, dz = p.getZ(i) - lz, d = Math.hypot(dx, dy, dz);
      if (d < R) { const k = (1 - d / R) * depth; p.setX(i, p.getX(i) - Math.sign(p.getX(i)) * k * .7 * (Math.abs(lx) > .3 ? 1 : .3)); p.setY(i, p.getY(i) - k * .35); p.setZ(i, p.getZ(i) - Math.sign(p.getZ(i)) * k * (Math.abs(lz) > .8 ? 1 : .2)); }
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  }
  function applyDamage(v, u, hitLocal) {
    const K = G.VK[v.kind], f = v.hp / K.hp;
    if (hitLocal && u.body) { dent(u, hitLocal[0], hitLocal[1], hitLocal[2], .09 + Math.random() * .06); u.dents++; }
    const tint = Math.max(.45, .6 + f * .4); u.paint.forEach(m => { if (!m.userData.base) m.userData.base = m.color.clone(); m.color.copy(m.userData.base).multiplyScalar(tint); });
    if (f < .6 && u.ws && !u.cracked) { u.cracked = true; if (!CRACK) CRACK = crackTexture(); const gm = u.glass.clone(); gm.map = CRACK; gm.color.set('#ffffff'); u.ws.material = gm; }
    if (f < .45 && u.front.length && !u.lampBroken) { u.lampBroken = true; u.front[0].visible = false; if (u.glows && u.glows[0]) u.glows[0].userData.broken = true; if (u.beams && u.beams[0]) u.beams[0].userData.broken = true; }
    if (f < .35 && u.parts.bumper && !u.bumperDown) { u.bumperDown = true; u.parts.bumper.rotation.z = .22; u.parts.bumper.position.y -= .1; }
  }

  // ---------------- PIOGGIA E PULVISCOLO ----------------
  function buildParticles() {
    const N = 2200, pos = new Float32Array(N * 6);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#f4f6fa', size: .16, transparent: true, opacity: .85, depthWrite: false }));
    rain.frustumCulled = false; scene.add(rain); dyn.rain = { m: rain, pos, N, seeds: Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random()]) };
    const M = 80, mp = new Float32Array(M * 3);
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#ffb35c', size: .12, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
    motes.frustumCulled = false; scene.add(motes); dyn.motes = { m: motes, p: mp, M, s: Array.from({ length: M }, () => [Math.random(), Math.random(), Math.random()]) };
  }

  // ---------------- EFFETTI ----------------
  let smokeTex = null;
  function smokeTexture() {
    if (!smokeTex) { const c = mk(32, 32), x = c.getContext('2d'); for (let i = 0; i < 7; i++) { x.fillStyle = `rgba(255,255,255,${.25 + i * .06})`; x.beginPath(); x.arc(16 + Math.sin(i * 2.1) * 4, 16 + Math.cos(i * 1.7) * 4, 11 - i, 0, 7); x.fill(); } smokeTex = canvasTex(c); }
    return smokeTex;
  }
  // vampate diverse per ogni arma: stella a quattro punte (Beretta), rosa di fuoco larga (lupara), lingua lunga (Skorpion)
  const FLASH = {};
  function flashTexture(kind) {
    if (FLASH[kind]) return FLASH[kind];
    const c = mk(32, 32), x = c.getContext('2d'), cx = 16, cy = 16;
    const ray = (a, len, w, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); x.lineTo(cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w); x.lineTo(cx - Math.cos(a) * 2, cy - Math.sin(a) * 2); x.lineTo(cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w); x.fill(); };
    if (kind === 'pistola') { for (let k = 0; k < 4; k++) ray(k * Math.PI / 2, 14, 3, '#ffc860'); for (let k = 0; k < 4; k++) ray(k * Math.PI / 2 + Math.PI / 4, 7, 2, '#ffe0a0'); }
    else if (kind === 'lupara') { for (let k = 0; k < 9; k++) ray(k / 9 * Math.PI * 2 + (k % 2) * .2, 10 + (k % 3) * 4, 4, k % 2 ? '#ff9a30' : '#ffd070'); }
    else { ray(0, 15, 4, '#ffb040'); ray(Math.PI, 15, 4, '#ffb040'); ray(Math.PI / 2, 9, 3, '#ffe0a0'); ray(-Math.PI / 2, 9, 3, '#ffe0a0'); }
    x.fillStyle = '#fffbe8'; x.beginPath(); x.arc(cx, cy, kind === 'lupara' ? 6 : 4, 0, 7); x.fill();
    return FLASH[kind] = canvasTex(c);
  }
  const FX = { tracers: [], muzzles: [], mlights: [], parts: null, shells: [], decals: [], smokes: [], flames: [], flights: [], bottles: [], pickups: {}, explos: [] };
  function buildFx() {
    const tg = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: '#ffe7a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.visible = false; scene.add(m); FX.tracers.push({ m, life: 0 }); }
    for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture('pistola'), color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; scene.add(s); const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffb050', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); h.visible = false; scene.add(h); FX.muzzles.push({ s, h, life: 0 }); }
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ffb050', 0, 10, 2); scene.add(l); FX.mlights.push({ l, life: 0, base: 0 }); }
    const mkPts = (N, additive, size) => {
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
      pts.frustumCulled = false; scene.add(pts);
      return { pts, pos, col, vel: new Float32Array(N * 3), life: new Float32Array(N), N, i: 0, grav: new Float32Array(N), floor: new Float32Array(N) };
    };
    FX.hot = mkPts(500, true, .16); FX.wet = mkPts(500, false, .14);
    const sg = new THREE.BoxGeometry(.05, .05, .12), smt = std({ color: '#d8b050', metalness: .8, roughness: .3 }), sgl = new THREE.BoxGeometry(.08, .08, .16), smr = std({ color: '#c83a2a', roughness: .5 });
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(i % 5 === 4 ? sgl : sg, i % 5 === 4 ? smr : smt); m.visible = false; scene.add(m); FX.shells.push({ m, life: 0, v: new THREE.Vector3(), floor: 0, big: i % 5 === 4 }); }
    const dg = new THREE.CircleGeometry(.5, 8); dg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 100; i++) { const m = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ color: '#4a0a0e', transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.visible = false; m.renderOrder = 1; scene.add(m); FX.decals.push({ m, t: 0 }); }
    FX.decalI = 0;
    for (let i = 0; i < 70; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture(), color: '#555', transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); FX.smokes.push({ s, life: 0, max: 1, v: new THREE.Vector3(), grow: 1 }); }
    for (let i = 0; i < 30; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7a20', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; scene.add(s); FX.flames.push({ s }); }
    for (let i = 0; i < 3; i++) { const l = new THREE.PointLight('#ff7a30', 0, 12, 2); scene.add(l); FX.flights.push(l); }
    for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffc070', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.visible = false; scene.add(s); const l = new THREE.PointLight('#ffa040', 0, 26, 2); scene.add(l); const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 24), new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring); FX.explos.push({ s, l, ring, life: 0 }); }
    for (let i = 0; i < 4; i++) { const b = weaponModel('molotov'); b.scale.multiplyScalar(1.6); b.visible = false; scene.add(b); FX.bottles.push(b); }
    FX.siren = new THREE.PointLight('#2a6aff', 0, 16, 2); scene.add(FX.siren);
  }
  function emitPts(P, x, y, z, vx, vy, vz, spread, n, color, life, grav) {
    const c = new THREE.Color(color), fl = groundH(x, z) + .03;
    for (let k = 0; k < n; k++) {
      const i = P.i = (P.i + 1) % P.N;
      P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
      P.vel[i * 3] = vx + (Math.random() - .5) * spread; P.vel[i * 3 + 1] = vy + (Math.random() - .2) * spread; P.vel[i * 3 + 2] = vz + (Math.random() - .5) * spread;
      const f = .75 + Math.random() * .25; P.col[i * 3] = c.r * f; P.col[i * 3 + 1] = c.g * f; P.col[i * 3 + 2] = c.b * f;
      P.life[i] = life * (.6 + Math.random() * .6); P.grav[i] = grav; P.floor[i] = fl;
    }
  }
  function tickPts(P, dt) {
    for (let i = 0; i < P.N; i++) {
      if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -99; continue; }
      P.life[i] -= dt;
      P.vel[i * 3 + 1] -= P.grav[i] * dt;
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      if (P.pos[i * 3 + 1] < P.floor[i]) { P.pos[i * 3 + 1] = P.floor[i]; P.vel[i * 3 + 1] *= -.3; P.vel[i * 3] *= .6; P.vel[i * 3 + 2] *= .6; }
    }
    P.pts.geometry.attributes.position.needsUpdate = true; P.pts.geometry.attributes.color.needsUpdate = true;
  }
  function decal(x, z, size, color, opacity) {
    const d = FX.decals[FX.decalI = (FX.decalI + 1) % FX.decals.length];
    d.m.visible = true; d.m.position.set(x, groundH(x, z) + .015 + (FX.decalI % 7) * .001, z); d.m.scale.set(size, 1, size * (.7 + Math.random() * .5)); d.m.rotation.y = Math.random() * 6;
    d.m.material.color.set(color); d.m.material.opacity = opacity; d.grow = 0;
    return d;
  }
  function smoke(x, y, z, color, size, life, vy) {
    const s = FX.smokes.find(k => k.life <= 0); if (!s) return;
    s.life = s.max = life; s.s.visible = true; s.s.position.set(x, y, z); s.s.material.color.set(color); s.base = size; s.v.set((Math.random() - .5) * .6, vy || 1, (Math.random() - .5) * .6);
  }
  const _mz = new THREE.Vector3();
  function carHit(st, e) {
    const h = groundH(e.x, e.y), k = clamp(e.v / 10, .3, 2.2), c = Math.cos(e.a), s = Math.sin(e.a);
    FX.lastMetal = { x: e.x, y: e.y, t: performance.now() };
    emitPts(FX.hot, e.x, h + .55, e.y, -c * 2, 2.2, -s * 2, 3 + k * 3, Math.round(6 + k * 16), '#fff0b0', .3 + k * .15, 10);
    if (e.v > 6) { for (let q = 0; q < Math.round(k * 10); q++) chip(e.x + (Math.random() - .5) * .6, h + .7 + Math.random() * .4, e.y + (Math.random() - .5) * .6, (Math.random() - .5) * 5 * k, 1 + Math.random() * 3, (Math.random() - .5) * 5 * k, .03 + Math.random() * .07, .015, .03 + Math.random() * .07, GLASS[q % GLASS.length]); }
    if (e.v > 9) for (let q = 0; q < Math.round(k * 4); q++) chip(e.x, h + .5, e.y, (Math.random() - .5) * 6, 1.5 + Math.random() * 3, (Math.random() - .5) * 6, .08 + Math.random() * .12, .03, .1 + Math.random() * .1, q % 2 ? '#2a2a30' : '#8a8a90');
    if (e.wall) smoke(e.x, h + .6, e.y, '#b8aa98', .8 + k * .4, 1, .4);
    (e.ids || []).forEach(id => { const g = dyn.vehicles[id]; if (!g) return; const u = g.userData; u.rv = (u.rv || 0) + (Math.random() - .5) * k * 3; u.pv = (u.pv || 0) - k * 1.2; u.hv = (u.hv || 0) + k * 1.4; });
  }
  function spawnFx(st, e) {
    const GHt = 1.25, gh = (x, z) => groundH(x, z) + GHt;
    switch (e.k) {
      case 'tracer': {
        const t = FX.tracers.find(k => k.life <= 0); if (!t) break;
        const len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0), y0 = gh(e.x0, e.y0), y1 = y0 + (groundH(e.x1, e.y1) - groundH(e.x0, e.y0)) * .15;
        t.life = e.w === 'lupara' ? .05 : e.w === 'mitra' ? .045 : .065; t.m.visible = true;
        t.m.position.set((e.x0 + e.x1) / 2, (y0 + y1) / 2, (e.y0 + e.y1) / 2); t.m.scale.set(e.w === 'lupara' ? .035 : .05, e.w === 'lupara' ? .035 : .05, len); t.m.lookAt(e.x1, y1, e.y1);
        t.m.material.color.set(e.npc ? '#ff9a70' : (G.WEAPONS[e.w].color || '#ffe7a0')); t.m.material.opacity = 1; bulletProps(e); break;
      }
      case 'muzzle': {
        let mx = e.x, my = gh(e.x, e.y), mz = e.y;
        // per il giocatore la vampata nasce dalla bocca dell'arma vera
        const pg = dyn.people.__player; if (!e.npc && pg && pg.userData.guns[e.w]) { const w = pg.userData.guns[e.w].userData.model; pg.updateMatrixWorld(true); _mz.set(0, .065, w.userData.muzzle / w.scale.x + .02); w.localToWorld(_mz); mx = _mz.x; my = _mz.y; mz = _mz.z; }
        const m = FX.muzzles.find(k => k.life <= 0);
        if (m) {
          const sz = e.w === 'lupara' ? 2.3 : e.w === 'mitra' ? 1.2 : 1.0;
          m.life = e.w === 'mitra' ? .035 : .055; m.s.visible = m.h.visible = true; m.s.material.map = flashTexture(e.w);
          m.s.position.set(mx + Math.cos(e.a) * .15, my, mz + Math.sin(e.a) * .15); m.h.position.copy(m.s.position);
          m.s.scale.set(sz * (.8 + Math.random() * .4), sz * (.8 + Math.random() * .4), 1); m.s.material.rotation = e.w === 'pistola' ? Math.random() * .6 : Math.random() * 6;
          m.h.scale.setScalar(sz * 2.2); m.h.material.color.set(e.w === 'lupara' ? '#ff9040' : '#ffb050');
        }
        const l = FX.mlights.reduce((a, b) => a.life < b.life ? a : b); l.life = .06; l.base = e.w === 'lupara' ? 11 : e.w === 'mitra' ? 5 : 6.5; l.l.position.set(mx, my + .3, mz);
        emitPts(FX.hot, mx, my, mz, Math.cos(e.a) * 5, .5, Math.sin(e.a) * 5, e.w === 'lupara' ? 4 : 2.5, e.w === 'lupara' ? 14 : 3, '#ffd080', .12, 0);
        smoke(mx + Math.cos(e.a) * .3, my, mz + Math.sin(e.a) * .3, '#8a8a92', e.w === 'lupara' ? .9 : .5, e.w === 'lupara' ? 1.1 : .7, .5);
        if (e.w === 'lupara') smoke(mx + Math.cos(e.a) * .8, my, mz + Math.sin(e.a) * .8, '#9a9aa2', .7, .9, .3);
        break;
      }
      case 'shell': { const s = FX.shells.find(k => k.life <= 0 && k.big === false) || FX.shells[0]; s.life = 3; s.m.visible = true; s.floor = groundH(e.x, e.y) + .03; s.m.position.set(e.x, s.floor + 1.17, e.y); const side = e.a + Math.PI / 2; s.v.set(Math.cos(side) * 2.2, 2.5, Math.sin(side) * 2.2); s.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); break; }
      case 'spark': bulletHole(e); emitPts(FX.hot, e.x - Math.cos(e.a) * .15, gh(e.x, e.y), e.y - Math.sin(e.a) * .15, -Math.cos(e.a) * 2, 1.5, -Math.sin(e.a) * 2, 3, 6, '#ffe0a0', .25, 9); smoke(e.x, gh(e.x, e.y), e.y, '#9a9088', .4, .6, .3); break;
      case 'metal': emitPts(FX.hot, e.x, gh(e.x, e.y) - .3, e.y, -Math.cos(e.a) * 2, 2, -Math.sin(e.a) * 2, 4, 8, '#fff0c0', .2, 9); FX.lastMetal = { x: e.x, y: e.y, t: performance.now() }; break;
      case 'blood': emitPts(FX.wet, e.x, gh(e.x, e.y) - .1, e.y, Math.cos(e.a) * 2.5, 1.2, Math.sin(e.a) * 2.5, 2.2, 10, '#8a1018', .5, 12); if (Math.random() < .6) decal(e.x + Math.cos(e.a) * .8, e.y + Math.sin(e.a) * .8, .35 + Math.random() * .3, '#5a0a10', .8); break;
      case 'bloodpool': { const d = decal(e.x, e.y, .3, '#4a0810', .9); d.grow = 1.4; d.t = 0; break; }
      case 'hitpuff': emitPts(FX.wet, e.x, gh(e.x, e.y) + .05, e.y, 0, 1, 0, 2, 5, '#d8d0c0', .25, 6); break;
      case 'explosion': {
        const h0 = groundH(e.x, e.y);
        const x = FX.explos.find(k => k.life <= 0) || FX.explos[0]; x.life = .9; x.x = e.x; x.y = e.y; x.h = h0; x.s.visible = true; x.ring.visible = true; x.s.position.set(e.x, h0 + 1.5, e.y); x.ring.position.set(e.x, h0 + .1, e.y);
        emitPts(FX.hot, e.x, h0 + 1, e.y, 0, 6, 0, 14, 70, '#ffb040', 1.0, 8); emitPts(FX.wet, e.x, h0 + 1, e.y, 0, 7, 0, 12, 40, '#2a2226', 1.4, 10);
        for (let i = 0; i < 12; i++) smoke(e.x + (Math.random() - .5) * 3, h0 + 1 + Math.random() * 2, e.y + (Math.random() - .5) * 3, '#2a2428', 2.4, 2.5 + Math.random() * 1.5, 1.5 + Math.random());
        for (let i = 0; i < 4; i++) { const s = FX.shells.find(k => k.big && k.life <= 0); if (!s) break; s.life = 5; s.m.visible = true; s.floor = h0 + .05; s.m.position.set(e.x, h0 + 1, e.y); const a = Math.random() * 6; s.v.set(Math.cos(a) * 5, 6 + Math.random() * 3, Math.sin(a) * 5); }
        decal(e.x, e.y, 3.2, '#0c0a0c', .85); blastProps(e.x, e.y, 11, 20); blastRooms(e.x, e.y, 7); break;
      }
      case 'carhit': carHit(st, e); break;
      case 'wallhit': wallHit(e); break;
      case 'wallbreak': wallBreak(e); break;
      case 'facadehit': facadeHit(e); break;
      case 'breach': roomBreach(e); break;
      case 'molotov': { const h0 = groundH(e.x, e.y); emitPts(FX.hot, e.x, h0 + .3, e.y, 0, 3, 0, 6, 40, '#ff8a30', .7, 6); emitPts(FX.wet, e.x, h0 + .3, e.y, 0, 2, 0, 5, 12, '#3a6a3a', .6, 12); decal(e.x, e.y, 2.4, '#140a08', .7); blastProps(e.x, e.y, 3, 5); break; }
      case 'hurt': st.__hurt = 1; break;
    }
  }
  function tickFx(st, dt, night) {
    FX.tracers.forEach(t => { if (t.life > 0) { t.life -= dt; t.m.material.opacity = Math.max(0, t.life * 15); if (t.life <= 0) t.m.visible = false; } });
    FX.muzzles.forEach(m => { if (m.life > 0) { m.life -= dt; m.h.material.opacity = Math.max(0, m.life * 12); if (m.life <= 0) { m.s.visible = false; m.h.visible = false; } } });
    FX.mlights.forEach(m => { if (m.life > 0) { m.life -= dt; m.l.intensity = m.base * Math.max(0, m.life / .06); } else m.l.intensity = 0; });
    tickPts(FX.hot, dt); tickPts(FX.wet, dt);
    FX.shells.forEach(s => { if (s.life <= 0) return; s.life -= dt; if (s.m.position.y > s.floor) { s.v.y -= 14 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 12; if (s.m.position.y <= s.floor) { s.m.position.y = s.floor; s.v.multiplyScalar(.3); s.v.y = Math.abs(s.v.y) > .5 ? -s.v.y * .4 : 0; } } if (s.life <= 0) s.m.visible = false; });
    FX.decals.forEach(d => { if (d.grow > 0 && d.m.visible) { d.t += dt; const k = Math.min(1, d.t / 3); d.m.scale.set(.3 + d.grow * k, 1, .3 + d.grow * k * .8); if (k >= 1) d.grow = 0; } });
    FX.smokes.forEach(s => { if (s.life <= 0) return; s.life -= dt; const k = 1 - s.life / s.max; s.s.position.addScaledVector(s.v, dt); const sz = s.base * (1 + k * 1.8); s.s.scale.set(sz, sz, 1); s.s.material.opacity = Math.sin(Math.min(1, k * 1.3) * Math.PI) * .55; if (s.life <= 0) s.s.visible = false; });
    FX.explos.forEach(x => { if (x.life <= 0) { x.l.intensity = 0; x.ring.visible = false; return; } x.life -= dt; const k = 1 - x.life / .9; const sz = 3 + k * 9; x.s.scale.set(sz, sz, 1); x.s.material.opacity = Math.max(0, 1 - k * 1.1); x.l.position.set(x.x, x.h + 2, x.y); x.l.intensity = 20 * (1 - k); x.ring.scale.setScalar(1 + k * 8); x.ring.material.opacity = Math.max(0, .7 - k); if (x.life <= 0) { x.s.visible = false; x.ring.visible = false; } });
    const sources = st.fires.map(f => ({ x: f.x, y: f.y, r: f.r, k: Math.min(1, (f.until - st.clock) / 2) })).concat(st.vehicles.filter(v => v.burning > 0 && !v.hidden).map(v => ({ x: v.x, y: v.y, r: 1, k: 1 })));
    let fi = 0;
    sources.forEach((s, si) => {
      const h0 = groundH(s.x, s.y);
      for (let j = 0; j < 4 && fi < FX.flames.length; j++, fi++) {
        const f = FX.flames[fi], a = j * 1.7 + si, rr = s.r * .45 * (j ? 1 : 0);
        f.s.visible = true; const h = .7 + Math.sin(st.clock * 13 + j * 3 + si) * .25;
        f.s.position.set(s.x + Math.cos(a) * rr, h0 + .5 + h * .4, s.y + Math.sin(a) * rr); f.s.scale.set(1.4 * s.k, 1.9 * h * s.k, 1);
        f.s.material.color.set(j % 2 ? '#ff5a18' : '#ffb040');
      }
      if (Math.random() < dt * 8) smoke(s.x + (Math.random() - .5) * s.r, h0 + 1.5, s.y + (Math.random() - .5) * s.r, '#1e1a1e', 1.2, 2.2, 1.6);
      if (Math.random() < dt * 20) emitPts(FX.hot, s.x + (Math.random() - .5) * s.r, h0 + .4, s.y + (Math.random() - .5) * s.r, 0, 2.5, 0, 1.2, 1, '#ffa040', .8, -1);
    });
    for (; fi < FX.flames.length; fi++) FX.flames[fi].s.visible = false;
    FX.flights.forEach((l, i) => { const s = sources[i]; if (s) { l.position.set(s.x, groundH(s.x, s.y) + 1.2, s.y); l.intensity = (5 + Math.sin(st.clock * 17 + i) * 1.5) * s.k; } else l.intensity = 0; });
    st.vehicles.forEach(v => { if (v.hidden) return; const K = G.VK[v.kind]; if ((v.hp < K.hp * .4 || v.wreck) && Math.random() < dt * (v.wreck ? 3 : 6)) smoke(v.x + Math.cos(v.ang) * (v.kind === 'vespa' ? 0 : 1.4), groundH(v.x, v.y) + 1.2, v.y + Math.sin(v.ang) * (v.kind === 'vespa' ? 0 : 1.4), v.wreck ? '#1a1618' : '#6a6a70', .9, 1.8, 1.2); });
    FX.bottles.forEach((b, i) => { const pr = st.proj[i]; b.visible = !!pr; if (pr) { b.position.set(pr.x, pr.z + groundH(pr.x, pr.y), pr.y); b.rotation.x += dt * 14; b.userData.flame.material.opacity = .7 + Math.random() * .3; } });
    const pc = st.vehicles.find(v => v.police && v.siren && !v.hidden && !v.wreck);
    if (pc) { const on = Math.sin(st.clock * 14) > 0; FX.siren.position.set(pc.x, groundH(pc.x, pc.y) + 2.2, pc.y); FX.siren.intensity = on ? 6 : 1.5; FX.siren.color.set(on ? '#2a6aff' : '#6a9aff'); } else FX.siren.intensity = 0;
  }

  // ---------------- OGGETTI DA RACCOGLIERE ----------------
  // piedistallo luminoso, il modello che gira e un'icona sopra, leggibile anche da lontano
  const ICONS = {};
  function iconTexture(kind, col) {
    if (ICONS[kind]) return ICONS[kind];
    const c = mk(24, 24), x = c.getContext('2d');
    x.fillStyle = 'rgba(10,8,20,.85)'; x.beginPath(); x.arc(12, 12, 11, 0, 7); x.fill(); x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.arc(12, 12, 10, 0, 7); x.stroke();
    x.fillStyle = col; const R = (a, b, w, h) => x.fillRect(a, b, w, h);
    if (kind === 'pistola') { R(6, 8, 12, 4); R(7, 12, 4, 6); R(12, 12, 2, 2); }
    else if (kind === 'lupara') { R(4, 9, 14, 2); R(4, 12, 14, 1); R(15, 11, 4, 3); R(17, 13, 3, 5); }
    else if (kind === 'mitra') { R(5, 8, 13, 4); R(8, 12, 3, 6); R(14, 12, 3, 5); R(3, 7, 6, 1); }
    else if (kind === 'molotov') { R(10, 10, 5, 9); R(11, 7, 3, 3); x.fillStyle = '#ffd040'; R(11, 4, 3, 3); }
    else if (kind === 'munizioni') { for (let k = 0; k < 3; k++) { R(6 + k * 4, 9, 3, 9); R(6 + k * 4 + .5, 7, 2, 2); } }
    else if (kind === 'salute') { R(10, 5, 4, 14); R(5, 10, 14, 4); }
    else if (kind === 'soldi') { x.font = 'bold 15px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('L', 12, 13); R(6, 10, 3, 1); }
    else if (kind === 'valigetta') { R(5, 9, 14, 9); R(9, 6, 6, 3); x.fillStyle = 'rgba(10,8,20,.85)'; R(10, 7, 4, 2); }
    return ICONS[kind] = canvasTex(c);
  }
  function pickupMesh(kind) {
    const g = new THREE.Group(), add2 = (m, x, y, z) => { m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; };
    if (G.WEAPONS[kind]) { const w = weaponModel(kind); w.scale.multiplyScalar(kind === 'molotov' ? 2 : 2.2); if (kind !== 'molotov') { w.rotation.z = Math.PI / 2 * .15; } g.add(w); }
    else if (kind === 'munizioni') { add2(box(.5, .3, .34, sm('#5a6a3a')), 0, 0, 0); add2(box(.52, .06, .36, sm('#3a4a2a')), 0, .17, 0); add2(box(.3, .12, .01, sm('#e8d8a0')), 0, .02, .175); for (let k = 0; k < 5; k++) { add2(cyl(.03, .03, .14, 6, sm('#d8a830', { metalness: .7, roughness: .3 })), -.16 + k * .08, .27, 0); add2(cyl(.02, .03, .05, 6, sm('#b87848', { metalness: .6 })), -.16 + k * .08, .36, 0); } }
    else if (kind === 'salute') { add2(box(.56, .38, .3, sm('#f2f2ee')), 0, 0, 0); add2(box(.32, .1, .31, sm('#d02020')), 0, 0, 0); add2(box(.1, .3, .31, sm('#d02020')), 0, 0, 0); add2(box(.2, .06, .08, sl('#3a3a3a')), 0, .22, 0); }
    else if (kind === 'soldi') { for (let k = 0; k < 3; k++) { add2(box(.42, .06, .2, sm(k % 2 ? '#7aa06a' : '#a88a5a')), (k - 1) * .05, k * .07, (k - 1) * .03); add2(box(.08, .065, .21, sm('#e8e0c0')), (k - 1) * .05, k * .07, (k - 1) * .03); } }
    else if (kind === 'valigetta') { add2(box(.72, .52, .2, sm('#6a4428', { roughness: .5 })), 0, 0, 0); add2(box(.74, .04, .22, sm('#4a2a18')), 0, .1, 0); add2(box(.22, .08, .06, sm('#d8b040', { metalness: .8, roughness: .2 })), 0, .31, 0); [-.25, .25].forEach(o => add2(box(.08, .06, .22, sm('#d8b040', { metalness: .8, roughness: .2 })), o, .2, 0)); }
    const col = { pistola: '#ffd24a', lupara: '#ffd24a', mitra: '#ffd24a', molotov: '#ff8a30', munizioni: '#ffd24a', salute: '#7ee0a0', soldi: '#7ee0a0', valigetta: '#ff4fa3' }[kind] || '#ffffff';
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .66, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(.5, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); disc.rotation.x = -Math.PI / 2;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.45, .55, 2.4, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); beam.position.y = 1.2;
    const glow2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })); glow2.scale.set(1.8, 1.8, 1);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(kind, col), transparent: true, depthTest: false, depthWrite: false })); icon.scale.set(.75, .75, 1); icon.renderOrder = 998;
    const root = new THREE.Group(); g.position.y = .7; ring.position.y = .04; disc.position.y = .035; glow2.position.y = .7; icon.position.y = 2.3; root.add(g, ring, disc, beam, glow2, icon); root.userData = { g, icon, beam };
    return root;
  }

  // ---------------- POST-PROCESSING ----------------
  function buildPost() {
    postScene = new THREE.Scene(); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMat = new THREE.ShaderMaterial({
      uniforms: { tC: { value: null }, tD: { value: null }, res: { value: new THREE.Vector2(1, 1) }, near: { value: 1 }, far: { value: 300 }, letter: { value: 0 }, pillar: { value: 0 }, fade: { value: 0 }, flash: { value: 0 }, hurt: { value: 0 }, sat: { value: 1 }, dusk: { value: 0 }, night: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `
        uniform sampler2D tC; uniform sampler2D tD; uniform vec2 res; uniform float near; uniform float far; uniform float letter; uniform float pillar; uniform float fade; uniform float flash; uniform float hurt; uniform float sat; uniform float dusk; uniform float night;
        varying vec2 vUv;
        float bayer(vec2 p){ int x=int(mod(p.x,4.)); int y=int(mod(p.y,4.)); int i=x+y*4;
          float m[16]; m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
          for(int k=0;k<16;k++){ if(k==i) return m[k]/16.; } return 0.; }
        float lin(float d){ float z = d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }
        void main(){
          vec2 px = 1./res;
          vec2 uv = (floor(vUv*res)+.5)/res;
          vec3 c = texture2D(tC, uv).rgb;
          float d = lin(texture2D(tD, uv).r);
          float dc = lin(texture2D(tD, vec2(.5)).r);   // [luci2] distanza del punto guardato
          { vec3 nb = texture2D(tC, uv+vec2(px.x,0.)).rgb + texture2D(tC, uv-vec2(px.x,0.)).rgb + texture2D(tC, uv+vec2(0.,px.y)).rgb + texture2D(tC, uv-vec2(0.,px.y)).rgb;
            c = max(c + (c - nb*.25) * .38 * (1. - smoothstep(dc*1.08, dc*1.5, d)), 0.); }   // [luci2] crisp: il primo piano è nitido
          float d1 = lin(texture2D(tD, uv+vec2(px.x,0.)).r), d2 = lin(texture2D(tD, uv-vec2(px.x,0.)).r), d3 = lin(texture2D(tD, uv+vec2(0.,px.y)).r), d4 = lin(texture2D(tD, uv-vec2(0.,px.y)).r);
          float edge = max(max(d1-d, d2-d), max(d3-d, d4-d));
          float ol = smoothstep(.45*(1.+d*.01), .9*(1.+d*.012), edge);
          c = mix(c, c*.55 + vec3(.02,.025,.04), ol*.42);
          { float ao = 0.; for (int k=0;k<8;k++){ float a = float(k)*.785 + .39; vec2 o = vec2(cos(a),sin(a))*px*(k<4?2.:4.); float dn = lin(texture2D(tD, uv+o).r); ao += smoothstep(.0, 1., (d-dn)/(d*.035+.35)); } c *= 1. - ao/8.*.42; }   // [inverno] occlusione ambientale
          // aloni: le zone molto luminose (neon, lampioni) si allargano un po'
          vec3 bl = vec3(0.);
          for (int k=0;k<8;k++){ float a = float(k)*.785 + .2; vec2 d0 = vec2(cos(a),sin(a));
            for (int j=0;j<3;j++){ float rr = j==0 ? 2. : (j==1 ? 5. : 9.); vec3 s = texture2D(tC, uv + d0*px*rr).rgb; float mx = max(max(s.r,s.g),s.b), ch = mx - min(min(s.r,s.g),s.b); bl += max(s-.5, 0.) * smoothstep(.1,.4,ch) * (j==0 ? .5 : (j==1 ? .35 : .22)); } }
          c += bl*(.05 + night*.06);
          { vec3 wb = vec3(0.); for (int k=0;k<10;k++){ float a = float(k)*.628 + .1; vec2 d0 = vec2(cos(a),sin(a));
              for (int j=0;j<2;j++){ float rr = j==0 ? 14. : 24.; vec3 s = texture2D(tC, uv + d0*px*rr).rgb; float mx = max(max(s.r,s.g),s.b); wb += max(s - .3, 0.) * smoothstep(.35, .75, mx) * (j==0 ? .6 : .4); } }
            c += wb * .085 * night; }   // [luci2] aloni nell'aria umida
          { float far01 = smoothstep(dc*1.02, dc*1.7, d); vec3 hz = mix(vec3(.50,.52,.54), vec3(.075,.085,.09), night);
            c = mix(c, hz + c*.35, far01 * (.42 + night*.1)); }   // [luci2] aria spessa lontano
          float l = dot(c, vec3(.299,.587,.114));
          // [inverno] ombre blu-grigie, mezzitoni spenti; la saturazione resta alle sorgenti di luce
          float chroma = max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b);
          float hot = smoothstep(.5,.9,chroma*max(max(c.r,c.g),c.b)*2.);
          float warmL = smoothstep(.06,.16, c.r-c.b) * smoothstep(.08,.28, max(max(c.r,c.g),c.b)) * smoothstep(.55,.95, night);   // [luci1] luce calda di notte
          c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9*(1.-warmL*.75));
          c *= mix(vec3(1.), vec3(1.02,1.,.96), smoothstep(.28,.8,l)*(1.-hot));   // [inverno24] alte luci appena calde, non azzurrine
          c = mix(vec3(l), c, mix(.66, 1.3, max(hot, warmL*.85))*sat);
          c += vec3(.012,.014,.02);
          c = (c-.5)*1.24+.5;
          { float AZZ = .12; float cy = smoothstep(.03,.16, min(c.g,c.b)-c.r) * smoothstep(.06,.22, max(max(c.r,c.g),c.b)-min(min(c.r,c.g),c.b));   // [inverno20] niente azzurri
            vec3 gr = vec3(dot(c, vec3(.3,.59,.11))) * vec3(1.,.99,.97); c = mix(c, mix(gr, c, AZZ), cy); }
          { float REG_SAT = .62, REG_BIANCO = .1;   // [inverno21] il regime: cemento, rosso, luce calda
            float lu = dot(c, vec3(.3,.59,.11));
            float rosso = smoothstep(.12,.3, c.r-c.g) * smoothstep(.06,.2, c.r-c.b);          // rossi e arancio delle lampade
            float keep = max(max(REG_SAT, warmL), max(rosso*1.05, hot*1.0));
            c = mix(vec3(lu) * vec3(.98,1.,.98), c, keep);                                     // grigio appena verdastro, da caserma
            c *= 1. - smoothstep(.62,.95, lu) * REG_BIANCO; }                                   // niente bianchi puliti
          vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;
          float vg = smoothstep(.18, .5, length(q*vec2(1.,1.2)));
          c = mix(c, vec3(.55,.02,.05), vg*hurt*.75);
          c = c*1.32/(1.+c*.5);
          { vec3 hi = max(c-.48, 0.); c = min(c, vec3(.48)) + hi/(1.+hi*3.6); }   // [inverno29] spalla più morbida   // [inverno] spalla: le alte luci si comprimono invece di bruciare
          c *= 1. - .05*mod(floor(vUv.y*res.y), 2.);   // [inverno] righe di schermo: tutto è visto attraverso i monitor del regime
          float bd = bayer(floor(vUv*res)) - .5;
          c = floor(c*40. + bd*.6 + .5)/40.;
          c += flash*vec3(.9,.2,.3);
          float lb = step(vUv.y, letter*.11) + step(1.-letter*.11, vUv.y);
          float asp = res.x/res.y; float bw = max(0., (1. - (4./3.)/asp)*.5) * pillar;
          lb += step(vUv.x, bw) + step(1.-bw, vUv.x);
          c = mix(c, vec3(0.), clamp(lb,0.,1.));
          c *= 1.-fade;
          gl_FragColor = vec4(c,1.);
        }`,
      depthWrite: false, depthTest: false,
    });
    postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat));
  }
  let TARGET = 540, lastSize = null;
  function lowQuality() { if (TARGET < 420) return; TARGET = 330; LOWQ.on = true; moon.castShadow = false; SPOOL.forEach(l => { l.castShadow = false; }); renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } }); if (lastSize) resize(...lastSize); }
  function resize(cw, ch, dpr) {
    lastSize = [cw, ch, dpr];
    PX = Math.max(2, Math.round(ch * dpr / TARGET));
    W = Math.max(64, Math.floor(cw * dpr / PX)); H = Math.max(64, Math.floor(ch * dpr / PX));
    renderer.setSize(cw, ch, false);
    if (rt) rt.dispose();
    rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.depthTexture = new THREE.DepthTexture(W, H); rt.depthTexture.type = THREE.UnsignedIntType;
    postMat.uniforms.res.value.set(W, H);
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  // ================= [inverno] PAESAGGIO: il Muro, la Base, il porto cargo, le stazioni, i beduini, i bivacchi, i fuochi =================
  // Tutto statico tranne i fuochi (fiamme che tremano), il radar, i riflettori delle torri e l'elicottero di notte.
  const WX = { fires: [], beams: [], radar: null, heli: null, blink: [] };
  function fireMat() { return WX.fm || (WX.fm = [new THREE.MeshBasicMaterial({ color: '#ffb040', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ff5a1a', toneMapped: false }), new THREE.MeshBasicMaterial({ color: '#ffe8a0', toneMapped: false })]); }
  // fiamma: tre coni che tremano, una luce calda vera e un alone
  function flame(x, y, z, s, lightK) {
    const g = G0(), fm = fireMat();
    [[0, .9, 1], [.12, .7, 0], [-.1, .6, 2]].forEach(([o, h, mi]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(.22 * s, h * s, 5), fm[mi]); c.position.set(o * s, h * s / 2, o * .7 * s); g.add(c); });
    g.position.set(x, y, z); scene.add(g); WX.fires.push({ g, ph: Math.random() * 9 });
    const L = addLight(x, y + .8 * s, z, '#ff8a3a', 2.4 * (lightK || 1), 11, .35); L.always = true;
    glow(x, y + .6 * s, z, '#ff9a40', 2.6 * s);
    return g;
  }
  // il barile col fuoco per scaldarsi: ruggine, qualche cassetta intorno
  function fireBarrel(x, z, r) {
    const g = G0(), rust = sm(pick(r, ['#5a3a2a', '#6a4430', '#4e3428']), { roughness: .9 });
    add(g, cyl(.32, .3, .9, 10, rust), 0, .45, 0); add(g, cyl(.34, .34, .05, 10, sl('#2a2422')), 0, .2, 0); add(g, cyl(.34, .34, .05, 10, sl('#2a2422')), 0, .7, 0);
    add(g, cyl(.29, .29, .04, 10, sb('#ff6a20')), 0, .86, 0);
    if (r() < .6) add(g, box(.5, .3, .35, PM.wood()), .65, .15, .2, 0, r() * 2, 0);
    place(g, x, z, r() * 6);
    flame(x, groundH(x, z) + .85, z, .9);
  }
  function camp(x, z, r) { // fuoco a terra: pietre in cerchio, legna
    const g = G0(), st = sm('#6a6660');
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.18, 0), st), Math.cos(a) * .5, .1, Math.sin(a) * .5); }
    add(g, box(.8, .1, .12, PM.woodD()), 0, .08, 0, 0, .6, 0); add(g, box(.8, .1, .12, PM.woodD()), 0, .1, 0, 0, -.6, 0);
    place(g, x, z, 0); flame(x, groundH(x, z) + .1, z, 1.1);
  }
  function tent(x, z, rot, col, s) { // tenda bassa: due falde
    const g = G0(), m = sm(col, { roughness: 1 }), w = 2.2 * s, d = 2.8 * s, h = 1.2 * s;
    const geo = new THREE.BufferGeometry(); const v = [-w / 2, 0, -d / 2, 0, h, -d / 2, w / 2, 0, -d / 2, -w / 2, 0, d / 2, 0, h, d / 2, w / 2, 0, d / 2];
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 0, 2, 1, 3, 4, 5]); geo.computeVertexNormals();
    const mm = m.clone(); mm.side = THREE.DoubleSide; add(g, new THREE.Mesh(geo, mm), 0, 0, 0);
    add(g, box(.04, h + .2, .04, PM.woodD()), 0, h / 2, d / 2 + .05);
    return place(g, x, z, rot);
  }
  function hut(x, z, rot, r) { // bivacco: capanna di tronchi col tetto a capanna sotto la neve
    const g = G0(), wd = sm('#4e3a2a'), snow = NEVE ? sm('#e2e6ec') : sm('#3a2c22');
    add(g, box(3, 1.8, 2.6, wd), 0, .9, 0);
    for (let k = 0; k < 6; k++) add(g, cyl(.09, .09, 3.1, 6, sm('#5e4632')), 0, .15 + k * .3, 1.32, 0, 0, Math.PI / 2);
    const rf = new THREE.Mesh(roofGeo(3.6, 3.2, 1.5), snow); rf.position.set(0, 1.8, 0); g.add(rf);
    add(g, box(.8, 1.4, .06, sm('#2a2018')), 0, .7, 1.34); add(g, box(.5, .4, .05, sb('#ffcf80')), .9, 1.1, 1.34);
    add(g, box(.4, 1, .4, sm('#5a5450')), 1, 2.6, -.5);
    place(g, x, z, rot); addLight(x + Math.sin(rot) * 2, groundH(x, z) + 1.2, z + Math.cos(rot) * 2, '#ffb060', 1.2, 6, .1).always = true;
  }
  function concrete(c) { return sm(c || '#8a8a88', { roughness: 1 }); }
  function buildWinter() {
    const W0 = M.world; if (!W0 || !W0.WALL) return;
    const P = G.PLACES, r = rng(1953), T = G.T;
    const free = (x, z) => { const v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return v !== T.BLD && v !== T.WATER && v !== T.VIA && v !== T.FOUNT && v !== T.TREE; };
    // ---- il Muro: lastre di cemento, filo spinato, scritte del regime e della Risacca, torri coi riflettori ----
    const WL = W0.WALL, slabM = [concrete('#7e7e7c'), concrete('#8a8a86'), concrete('#747472')], wire = sl('#2a2a2e');
    const posters = ['ОПЕКА', '보호', 'ПОРЯДОК', 'ТРУД', 'ГАРАНТ'];
    for (let y = WL.y0; y < WL.y1; y += 2) {
      if (y + 1 > WL.gate[0] && y + 1 < WL.gate[1]) continue;
      const x = WL.x + 1, g = G0();
      add(g, box(.5, 4.2, 2.02, pick(r, slabM)), 0, 2.1, 0); add(g, box(.7, .25, 2.02, concrete('#6a6a68')), 0, .12, 0);
      add(g, box(.04, .04, 2, wire), .1, 4.45, 0); add(g, box(.04, .04, 2, wire), -.1, 4.6, 0);
      for (let k = 0; k < 3; k++) add(g, new THREE.Mesh(new THREE.TorusGeometry(.18, .015, 3, 8), wire), 0, 4.55, -.7 + k * .7, 0, Math.PI / 2, 0);
      // da questa parte (la città) manifesti strappati e scritte
      if (r() < .18) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, posters), '#f2e8d8', '#9a1c1c') })); pm.position.set(-.27, 2.2, 0); pm.rotation.y = -Math.PI / 2; g.add(pm); }
      else if (r() < .14) { const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .7), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, ['RISACCA', 'НЕТ', '자유', 'RIDATECI MARCO']), pick(r, ['#ff4a8a', '#3ae0ff', '#ffe04a', '#7aff6a']), '#7e7e7c'), transparent: true, opacity: .9 })); pm.position.set(-.27, 1.4, 0); pm.rotation.y = -Math.PI / 2; g.add(pm); }
      place(g, x, y + 1, 0);
    }
    WL.towers.forEach(([x, y], k) => {
      const g = G0(), cm = concrete('#7a7a78');
      add(g, box(2.2, 8, 2.2, cm), 0, 4, 0); add(g, box(3.2, 2, 3.2, cm), 0, 9, 0);
      add(g, box(3, .8, 3, sb('#ffe6a0')), 0, 9.2, 0).material = new THREE.MeshBasicMaterial({ color: '#c8b88a', toneMapped: false });
      add(g, box(3.6, .25, 3.6, concrete('#5a5a58')), 0, 10.1, 0); add(g, box(3.4, .3, 3.4, sm('#e2e6ec')), 0, 10.35, 0);
      const flag = add(g, box(.05, 2.4, .05, wire), 1.4, 11.4, 1.4); add(g, box(.9, .55, .02, sb('#b81c1c')), 1.86, 12.2, 1.4);
      const red = add(g, new THREE.Mesh(new THREE.SphereGeometry(.14, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false })), -1.4, 10.8, -1.4); WX.blink.push({ m: red, ph: k });
      place(g, x + 1, y, 0);
      // il fascio del riflettore che spazza la neve
      const piv = new THREE.Group(), beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 18, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f0d0', transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = -9; piv.add(beam); piv.position.set(x + 1, groundH(x, y) + 9.4, y); piv.rotation.z = .9; scene.add(piv); WX.beams.push({ piv, ph: k * 1.7, side: -1 });
    });
    // il varco: sbarre, garitta, cavalli di Frisia
    { const y0 = WL.gate[0], y1 = WL.gate[1], gx = WL.x + 1, cy = (y0 + y1) / 2;
      const booth = G0(); add(booth, box(2, 2.4, 2, concrete('#6e7468')), 0, 1.2, 0); add(booth, box(1.6, .7, .06, sb('#ffd890')), 0, 1.6, 1.02); add(booth, box(2.3, .2, 2.3, sm('#e2e6ec')), 0, 2.5, 0);
      place(booth, gx + 4, y0 - 2, 0);
      [[cy - 3, 1], [cy + 3, -1]].forEach(([y, s]) => { const g = G0(); add(g, box(.3, 1.1, .3, sm('#d8d0c0')), 0, .55, 0); for (let k = 0; k < 4; k++) add(g, box(.12, .12, 1.4, sm(k % 2 ? '#c8201c' : '#f2eee6')), 0, 1.05, s * (.7 + k * 1.4) - s * .7 + s * .7); place(g, gx - 2, y, 0); });
      for (let k = 0; k < 3; k++) { const g = G0(); [0, 1.05, 2.1].forEach(a => add(g, box(.1, .1, 2, sl('#3a3a3e')), 0, .55, 0, a, 0, .6)); place(g, gx - 8, cy - 4 + k * 4, r()); }
      const L = addLight(gx, groundH(gx, cy) + 6, cy, '#f0f0ff', 3, 22, .02); L.always = true; glow(gx, groundH(gx, cy) + 6, cy, '#f0f0ff', 3);
      const pole = G0(); add(pole, box(.2, 6, .2, wire), 0, 3, 0); add(pole, box(.8, .4, .5, sl('#2a2a30')), 0, 6, 0); place(pole, gx, cy - 5.5, 0);
    }
    // ---- la Base: radar, antenna, pennoni, riflettori, eliporto ----
    if (P.rocca) {
      const R0 = P.rocca, rg = G0(); add(rg, box(1.6, 5, 1.6, concrete('#6a6e66')), 0, 2.5, 0);
      const dish = G0(); add(dish, new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 6, 0, Math.PI * 2, 0, .9), sm('#c8ccd0', { side: THREE.DoubleSide })), 0, 0, 0, Math.PI / 2 + .4, 0, 0); add(dish, box(.2, .2, 1.6, sl('#3a3a40')), 0, 0, .8); dish.position.y = 5.8; rg.add(dish);
      place(rg, R0.x + 22, R0.y - 22, 0); WX.radar = dish;
      const ant = G0(); add(ant, box(.5, 22, .5, sl('#b8201c')), 0, 11, 0); for (let k = 1; k < 7; k++) add(ant, box(1.6 - k * .15, .12, .12, sl('#e8e4dc')), 0, k * 3, 0);
      const top = add(ant, new THREE.Mesh(new THREE.SphereGeometry(.25, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false })), 0, 22.2, 0); WX.blink.push({ m: top, ph: 0, slow: true });
      place(ant, R0.x - 18, R0.y + 22, 0);
      [-6, 0, 6].forEach(o => { const g = G0(); add(g, box(.12, 9, .12, sl('#3a3a40')), 0, 4.5, 0); add(g, box(2.2, 1.3, .03, sb('#a81818')), 1.1, 8.2, 0); add(g, box(.5, .5, .035, sb('#f2d84a')), 1.1, 8.2, .02); place(g, R0.x + o, R0.y + 12, 0); });
      if (P.eliporto) { const e = P.eliporto, pad = G0(); add(pad, cyl(5, 5, .06, 24, sm('#5a5a5c')), 0, .03, 0); add(pad, box(.6, .02, 3.4, sb('#e8e4c0')), -1, .07, 0); add(pad, box(.6, .02, 3.4, sb('#e8e4c0')), 1, .07, 0); add(pad, box(2, .02, .6, sb('#e8e4c0')), 0, .07, 0); place(pad, e.x, e.y, 0); }
    }
    // l'elicottero: di giorno a terra sull'eliporto, di notte gira sopra la Base e la periferia est (non va oltre)
    { const h = G0(), body = sm('#4a5446', { roughness: .7 }), glass = sm('#1a2228', { roughness: .2 });
      add(h, new THREE.Mesh(new THREE.SphereGeometry(1.4, 10, 8), body), 0, 1.4, 0).scale.set(1, .8, 1.6);
      add(h, new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), glass), 0, 1.6, 1.3).scale.set(.9, .7, .8);
      add(h, box(.4, .4, 5, body), 0, 1.6, -3.6); add(h, box(.06, 1.2, .6, body), 0, 2.2, -6);
      add(h, box(.1, .1, 3.6, sl('#2a2a2e')), -.9, .2, 0); add(h, box(.1, .1, 3.6, sl('#2a2a2e')), .9, .2, 0);
      const rot = G0(); add(rot, box(9, .06, .3, sl('#1a1a1e')), 0, 0, 0); add(rot, box(.3, .06, 9, sl('#1a1a1e')), 0, 0, 0); rot.position.y = 2.6; h.add(rot);
      const nav = add(h, new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 4), new THREE.MeshBasicMaterial({ color: '#ff2a2a', toneMapped: false })), 0, .4, -1);
      const sp = new THREE.SpotLight('#f4f2e0', 0, 60, .32, .5, 1.2); sp.position.set(0, .5, 1.5); h.add(sp); const tgt = new THREE.Object3D(); scene.add(tgt); sp.target = tgt;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#f4f2e0', transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); scene.add(cone);
      h.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(h);
      WX.heli = { g: h, rot, nav, sp, tgt, cone, home: P.eliporto || P.rocca };
    }
    // ---- il porto cargo: gru, container, bitte ----
    if (P.molo_cargo) {
      const q = P.molo_cargo;
      [[-6, -22], [-6, 22], [8, 0]].forEach(([dx, dz], k) => crane(q.x + dx, q.y + dz, k === 2 ? Math.PI / 2 : 0, k ? '#c8642a' : '#d8b02a'));
      for (let k = 0; k < 26; k++) { const x = q.x - 22 + r() * 30, z = q.y - 30 + r() * 60; if (!free(x, z) || !free(x, z + 3) || !free(x, z - 3)) continue; container(x, z, r() < .7 ? 0 : Math.PI / 2, pick(r, ['#7a3a2a', '#3a5a6a', '#5a6a4a', '#8a6a3a', '#6a6a70']), r() < .3 ? 2.6 : 0); }
    }
    // ---- le stazioni di estrazione nella prateria: torre di trivella, nastro, cumuli di carbone, recinto, guardie ----
    ['miniera', 'stazione2'].forEach((id, k) => {
      const b = G.BUILDINGS && G.BUILDINGS.find(o => o.id === id); const q = b ? { x: (b.x + b.w / 2) * TS, y: (b.y + b.h / 2) * TS } : P[k ? 'stazione_s' : 'stazione_n']; if (!q) return;
      const ox = q.x + 12, oz = q.y + (k ? -6 : 6), g = G0(), steel = sl('#3a3a40'), rust = sm('#7a4a2a');
      for (let y = 0; y < 16; y += 2) { const s = 1.6 - y * .07; [[-s, -s], [s, -s], [-s, s], [s, s]].forEach(([a, c]) => add(g, box(.16, 2.05, .16, steel), a, y + 1, c)); add(g, box(s * 2, .1, .1, rust), 0, y + 2, -s); add(g, box(.1, .1, s * 2, rust), -s, y + 2, 0); }
      add(g, box(1.6, 1.4, 1.6, rust), 0, 16.5, 0); add(g, cyl(.6, .6, .3, 10, sl('#2a2a2e')), 0, 17.4, 0, Math.PI / 2, 0, 0);
      add(g, box(1, .4, 14, sm('#4a4a4e')), 6, 3, 0, .25, 0, 0);
      place(g, ox, oz, 0);
      for (let c = 0; c < 3; c++) { const hp = new THREE.Mesh(new THREE.ConeGeometry(2.2 + r(), 2 + r() * 1.5, 7), sm('#1c1a1c', { roughness: 1 })); const gx = ox + 8 + c * 3.4, gz = oz + (r() - .5) * 6; hp.position.set(gx, groundH(gx, gz) + 1, gz); addStatic(hp); }
      const fl = G0(); add(fl, cyl(.2, .25, 8, 8, sl('#3a3a40')), 0, 4, 0); place(fl, ox - 7, oz + 5, 0); flame(ox - 7, groundH(ox - 7, oz + 5) + 8, oz + 5, 1.6, 1.4);
      for (let a = 0; a < 6.28; a += .26) { const fx = ox + Math.cos(a) * 16, fz = oz + Math.sin(a) * 12; if (!free(fx, fz)) continue; const pg = G0(); add(pg, box(.1, 2, .1, steel), 0, 1, 0); add(pg, box(.03, .03, 4, wire), 0, 1.7, 0); add(pg, box(.03, .03, 4, wire), 0, 1.1, 0); place(pg, fx, fz, -a); }
      fireBarrel(ox - 3, oz - 8, r);
    });
    // ---- l'accampamento dei beduini: tende basse color erba secca, si vedono solo da vicino ----
    if (P.beduini) { const q = P.beduini; const cols = ['#7a6c52', '#6e624a', '#84765a', '#5e5444'];
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + r() * .3, d = 7 + r() * 4, x = q.x + Math.cos(a) * d, z = q.y + Math.sin(a) * d * .7; if (free(x, z)) tent(x, z, a + Math.PI / 2, pick(r, cols), 1 + r() * .3); }
      camp(q.x, q.y, r);
      for (let k = 0; k < 3; k++) { const g = G0(), x = q.x - 8 + k * 5, z = q.y - 12; add(g, box(.08, 1.6, .08, PM.woodD()), -1, .8, 0); add(g, box(.08, 1.6, .08, PM.woodD()), 1, .8, 0); add(g, box(2.1, .06, .06, PM.woodD()), 0, 1.5, 0); add(g, box(1.6, .9, .02, sm(pick(r, ['#8a3a2a', '#6a5a3a', '#3a4a5a']))), 0, 1.0, 0); if (free(x, z)) place(g, x, z, r()); }
    }
    // ---- dorsali: bivacchi, il monolite, gli spiazzi da campeggio ----
    Object.values(P).forEach(q => {
      if (q.camp === 'bivacco') { hut(q.x + 2, q.y - 2, r() * 6, r); camp(q.x - 2.5, q.y + 2, r); }
      else if (q.camp === 'tende') { for (let k = 0; k < 3; k++) { const x = q.x + (k - 1) * 3.4, z = q.y + (k % 2) * 2; if (free(x, z)) tent(x, z, r() * 6, pick(r, ['#6a2a2a', '#2a4a3a', '#5a5a2a']), .8); } camp(q.x, q.y - 3, r); }
      else if (q.camp === 'rudere') { const g = G0(), st2 = sm('#7a746c', { roughness: 1 }); [[0, 0, 6, .5], [3, 2.5, .5, 5], [-3, 1.5, .5, 3]].forEach(([dx, dz, w, d], k) => add(g, box(w, 1.2 + r() * 1.6, d, st2), dx, .8, dz)); add(g, box(2, .4, 2, sm('#c8ccd2')), 1, .2, 1.5); place(g, q.x + 2, q.y - 2, r() * 6); }
      else if (q.camp === 'carbonaia') { const g = G0(); add(g, new THREE.Mesh(new THREE.ConeGeometry(2.4, 2, 9), sm('#2a2622', { roughness: 1 })), 0, 1, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(1.4, .6, 9), sm('#bcc0c6')), 0, 1.75, 0); for (let k = 0; k < 6; k++) add(g, box(1.6, .3, .3, PM.woodD()), 3 + (k % 2) * .4, .15 + Math.floor(k / 2) * .3, -1 + (k % 3) * .4); place(g, q.x, q.y, 0); flame(q.x - 1.6, groundH(q.x, q.y) + .2, q.y + .4, .5, .6); }
      else if (q.camp === 'legna') { for (let k = 0; k < 3; k++) { const g = G0(); for (let j = 0; j < 7; j++) add(g, cyl(.16, .16, 1.4, 6, PM.woodD()), (j % 4) * .34 - .5, .16 + Math.floor(j / 4) * .3, 0, 0, 0, Math.PI / 2); add(g, box(1.6, .1, 1.6, sm('#c8ccd2')), 0, .62, 0); place(g, q.x + k * 2.2 - 2, q.y + (k % 2) * 2, r()); } const sb2 = G0(); add(sb2, cyl(.35, .4, .5, 8, PM.woodD()), 0, .25, 0); add(sb2, box(.06, .7, .2, sl('#8a8a90')), .1, .75, 0, 0, 0, .4); place(sb2, q.x + 3, q.y - 2, 0); }
      else if (q.camp === 'vedetta') { const g = G0(), wd = PM.woodD(); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, c]) => add(g, box(.18, 6, .18, wd), a, 3, c)); add(g, box(2.6, .15, 2.6, wd), 0, 6, 0); add(g, box(2.8, .2, 2.8, sm('#c8ccd2')), 0, 7.6, 0); add(g, box(.1, 1.5, .1, wd), 1.2, 6.8, 1.2); place(g, q.x, q.y, .3); }
      else if (q.camp === 'grotta') { const g = G0(), rk = sm('#5a5856', { roughness: 1, flatShading: true }); [[0, 0, 3.2], [2.6, .5, 2.4], [-2.4, .3, 2.6], [.5, 2, 2]].forEach(([dx, dy, s2]) => { const m = add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(s2, 0), rk), dx, dy + 1, -1.5); m.scale.y = .8; }); add(g, new THREE.Mesh(new THREE.CircleGeometry(1.3, 10), sb('#08080a')), 0, 1.2, .6); place(g, q.x, q.y - 2, r()); }
      else if (q.camp === 'sorgente') { const g = G0(); add(g, cyl(2.2, 2.4, .2, 12, sm('#a8c4d4', { roughness: .15 })), 0, .1, 0); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.4, 0), sm('#6a6866')), Math.cos(a) * 2.4, .2, Math.sin(a) * 2.4); } place(g, q.x, q.y, 0); }
      // [monte] i posti del Monte Scuro
      else if (q.camp === 'croce') {
        const g = G0(), iron = sm('#2a2a2e', { roughness: .6, metalness: .5 }), st2 = sm('#7a7670', { roughness: 1, flatShading: true });
        for (let k = 0; k < 14; k++) { const a = k * 2.4, d = .4 + (k % 4) * .35; add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.32 + (k % 3) * .08, 0), st2), Math.cos(a) * d, .2 + Math.floor(k / 5) * .3, Math.sin(a) * d); }
        add(g, box(.22, 5.4, .22, iron), 0, 3.4, 0); add(g, box(2.4, .2, .2, iron), 0, 4.6, 0); add(g, box(.5, .4, .3, sm('#7a1a1a')), 0, 1.6, .2);
        add(g, box(.04, .04, 1.6, sm('#c83a3a')), .6, 4.4, 0, .3, 0, 0); add(g, box(.04, .04, 1.4, sm('#3a6ac8')), -.6, 4.3, 0, -.2, 0, 0);
        place(g, q.x, q.y, .5); const L = addLight(q.x, groundH(q.x, q.y) + 1.8, q.y + .3, '#ff6a3a', .5, 4, .05); L.always = true;
      }
      else if (q.camp === 'neviera') {
        const g = G0(), st2 = sm('#6e6a64', { roughness: 1, flatShading: true });
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.28; add(g, box(1.1, .7 + (k % 3) * .25, .5, st2), Math.cos(a) * 2.6, .35, Math.sin(a) * 2.6, 0, -a, 0); }
        add(g, new THREE.Mesh(new THREE.CircleGeometry(2.2, 16), sb('#0a0a0c')), 0, .05, 0, -Math.PI / 2, 0, 0); add(g, new THREE.Mesh(new THREE.CircleGeometry(1.6, 12), sm('#e8ecf2')), .3, .08, .2, -Math.PI / 2, 0, 0);
        [[-1.6, .4], [1.6, -.2]].forEach(([x, z]) => add(g, box(.16, 2, .16, PM.woodD()), x, 1, z)); add(g, box(3.6, .14, .16, PM.woodD()), 0, 2, .1, 0, 0, .12);
        place(g, q.x, q.y, 0);
      }
      else if (q.camp === 'cascata') {
        // la cascata gelata: canne di ghiaccio che pendono dal ciglio fino al fondo della gola
        const g = G0(), ice = sm('#cfe4f0', { roughness: .15, metalness: .1, emissive: '#2a4a5a', emissiveIntensity: .25 }), ice2 = sm('#a8cce0', { roughness: .2 });
        const top = 9.5;
        for (let k = 0; k < 14; k++) { const x = (k - 7) * .42 + (k % 2) * .1, len = 3 + (k * 7 % 5) * 1.3, r2 = .18 + (k % 3) * .08; add(g, new THREE.Mesh(new THREE.ConeGeometry(r2, len, 6), k % 2 ? ice : ice2), x, top - len / 2, (k % 3) * .2, Math.PI, 0, 0); }
        for (let k = 0; k < 7; k++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 0), ice2), (k - 3) * .9, top + .1, -.3).scale.set(1, .5, .8); add(g, new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, .25, 14), ice2), 0, .12, 1.4);
        for (let k = 0; k < 6; k++) add(g, new THREE.Mesh(new THREE.ConeGeometry(.3, 1 + k % 3, 5), ice), -1.6 + k * .65, .6, 1.2 + (k % 2) * .5);
        place(g, q.x, q.y + 1.2, Math.PI);
      }
      else if (q.camp === 'fiumara') {
        // il ponte rotto sulla fiumara: due piloni e mezzo arco, la strada passa a guado
        const g = G0(), st2 = sm('#8a8276', { roughness: 1 }), st3 = sm('#7a7266', { roughness: 1 });
        add(g, box(2.2, 6.5, 3, st2), -8, 3.2, 0); add(g, box(2.2, 6.5, 3, st2), 8, 3.2, 0); add(g, box(5.5, 1.1, 3, st3), -5.2, 6.2, 0, 0, 0, -.12); add(g, box(3.5, 1.1, 3, st3), 6.4, 6.3, 0, 0, 0, .2);
        for (let k = 0; k < 6; k++) add(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.6 + (k % 3) * .3, 0), st3), -2 + k * .9, .3, (k % 2) - .5);
        add(g, box(2.4, .25, 3.2, sm('#e2e6ec')), -8, 6.55, 0); add(g, box(2.4, .25, 3.2, sm('#e2e6ec')), 8, 6.55, 0);
        place(g, q.x, q.y, .25);
        for (let k = 0; k < 9; k++) { const sx = q.x - 6 + k * 1.5, sz = q.y + 5 + Math.sin(k) * .6, s2 = new THREE.Mesh(new THREE.DodecahedronGeometry(.42, 0), st2); s2.position.set(sx, groundH(sx, sz) + .1, sz); s2.scale.y = .5; addStatic(s2); }
      }
      else if (q.camp === 'eremo') {
        // sulla cengia: la facciata dell'eremo scavata nella roccia, una campanella, una croce, un lume
        const g = G0(), st2 = sm('#a89e8e', { roughness: 1 }), wd = PM.woodD();
        add(g, box(3.6, 3.4, .5, st2), 0, 1.7, 0); add(g, box(4, .3, .8, sm('#e2e6ec')), 0, 3.5, .1);
        add(g, box(1.1, 2, .1, sb('#0a0806')), 0, 1, .26); add(g, box(.12, .7, .08, wd), 0, 2.85, .3); add(g, box(.45, .1, .08, wd), 0, 3, .3);
        add(g, box(.08, 1.2, .08, wd), 1.4, 3.9, 0); add(g, box(.08, 1.2, .08, wd), 2, 3.9, 0); add(g, box(.75, .08, .08, wd), 1.7, 4.5, 0); add(g, new THREE.Mesh(new THREE.ConeGeometry(.18, .3, 8, 1, true), sm('#8a6a2a', { metalness: .6 })), 1.7, 4.25, 0);
        place(g, q.x + 1.7, q.y - .6, -Math.PI / 2); const L = addLight(q.x + .8, groundH(q.x, q.y) + 1.4, q.y, '#ffb060', .7, 5, .05); L.always = true;
      }
      else if (q.camp === 'monolite') { const g = G0(); add(g, box(1.6, 6.5, .7, sm('#0e0e12', { roughness: .2, metalness: .3 })), 0, 3.2, 0, 0, 0, .04); add(g, box(2.4, .3, 1.4, sm('#e2e6ec')), 0, .15, 0); place(g, q.x, q.y - 3, .4); const L = addLight(q.x, groundH(q.x, q.y) + 1, q.y - 2, '#9ab0ff', .8, 6, .05); L.always = true; }
    });
    buildBridges();   // [monte]
    // ---- fuochi nei barili: dove la gente aspetta, lavora, si scalda ----
    const spots = ['piazza', 'calata', 'molo', 'marina', 'caruggio', 'vico', 'piazzetta', 'lungomare', 'giardini', 'passeggiata', 'discarica', 'cava', 'macchia', 'sangiacomo', 'villaggio', 'muro', 'varco', 'poligono', 'molo_cargo', 'covo', 'spiaggia'];
    spots.forEach(id => { const q = P[id]; if (!q) return; for (let t = 0; t < 12; t++) { const x = q.x + (r() - .5) * 8, z = q.y + (r() - .5) * 8; if (free(x, z) && free(x + .8, z) && free(x, z + .8)) { fireBarrel(x, z, r); break; } } });
    // e qualcuno nei cortili e lungo le costiere, nelle periferie
    let nb = 0; for (let t = 0; t < 900 && nb < 34; t++) { const x = 250 + r() * 300, z = 70 + r() * 150, tx = Math.floor(x / TS), tz = Math.floor(z / TS), v = G.tileAt(tx, tz); if ((v !== T.WALK && v !== T.COB) || !free(x + 1, z) || !free(x, z + 1)) continue; let near = false; for (const f of WX.fires) if (Math.hypot(f.g.position.x - x, f.g.position.z - z) < 16) near = true; if (near) continue; fireBarrel(x, z, r); nb++; }
    // ---- neon sgangherati: tubi rosa, ciano, giallo, azzurro freddo sulle facciate; alcuni rotti o che sfarfallano ----
    const NEON = ['#f0a048', '#d4d0c6', '#f0a048', '#d4d0c6', '#f0a048', '#b84a3c'];
    WX.neon = WX.neon || [];
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (!b.door || b.military || b.farm || b.wood) return;
      const d = W0.districtAt ? W0.districtAt(b.x * TS) : 'centro'; if (d === 'prateria' || d === 'foresta' || d === 'base' || d === 'porto') return;
      if (!(b.shop || b.sign || r() < .4)) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, dd = b.h * TS, [dx, dy] = b.door, base = groundH(x0 + w / 2, z0 + dd / 2);
      // la facciata della porta
      let ax, az, bx, bz, nx, nz;
      if (dy >= b.y + b.h) { ax = x0; bx = x0 + w; az = bz = z0 + dd + .12; nx = 0; nz = 1; }
      else if (dy < b.y) { ax = x0; bx = x0 + w; az = bz = z0 - .12; nx = 0; nz = -1; }
      else if (dx >= b.x + b.w) { ax = bx = x0 + w + .12; az = z0; bz = z0 + dd; nx = 1; nz = 0; }
      else { ax = bx = x0 - .12; az = z0; bz = z0 + dd; nx = -1; nz = 0; }
      const col = pick(r, NEON), mat = new THREE.MeshBasicMaterial({ color: col, toneMapped: false }), y = base + 3.3, L = Math.hypot(bx - ax, bz - az), broken = r() < .3;
      const segs = Math.max(2, Math.round(L / 1.2));
      for (let k = 0; k < segs; k++) {
        if (broken && r() < .25) continue;                                    // tubo rotto: un pezzo manca
        const t0 = k / segs + .02, t1 = (k + 1) / segs - .02, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2, len = L * (t1 - t0);
        const tube = new THREE.Mesh(new THREE.BoxGeometry(nz ? len : .07, .07, nz ? .07 : len), mat); tube.position.set(mx, y, mz); scene.add(tube);
      }
      // un tubo verticale sullo spigolo, e a volte una cornice attorno alla vetrina
      if (r() < .6) { const v = new THREE.Mesh(new THREE.BoxGeometry(.07, 3, .07), mat); v.position.set(ax + nz * 0, base + 1.8, az); scene.add(v); }
      const Lt = addLight(dx * TS + 1 + nx * 1.5, base + 2.6, dy * TS + 1 + nz * 1.5, col, 1.6, 9, broken ? .9 : .05); Lt.always = true;
      glow((ax + bx) / 2 + nx * .3, y, (az + bz) / 2 + nz * .3, col, 3.2);
      if (broken) WX.neon.push({ m: mat, col: new THREE.Color(col), ph: r() * 20, L: Lt });
    });
    // ---- manifesti del Garante lungo le costiere ----
    let nm = 0; (M.roads || []).filter(rd => rd.id === 'nord' || rd.id === 'litoranea' || rd.id === 'porto').forEach(rd => { for (let k = 10; k < rd.pts.length - 2; k += 24) { const [ax, az] = rd.pts[k], [bx, bz] = rd.pts[k + 1], L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L, x = ax + nx * (rd.w / 2 + 3), z = az + nz * (rd.w / 2 + 3); if (!free(x, z)) continue;
      const g = G0(); add(g, box(.15, 3, .15, sl('#2a2a30')), -1.6, 1.5, 0); add(g, box(.15, 3, .15, sl('#2a2a30')), 1.6, 1.5, 0);
      const bb = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), new THREE.MeshLambertMaterial({ map: signTexture(pick(r, ['ОПЕКА ТЕБЯ ВИДИТ', '보호는 사랑', 'ТРУД · ПОРЯДОК', 'IL GARANTE VEGLIA']), '#f2e8d8', pick(r, ['#8a1a1a', '#1a3a6a'])), side: THREE.DoubleSide })); bb.position.y = 3.6; g.add(bb); add(g, box(4.2, .15, .3, sm('#e2e6ec')), 0, 4.78, 0);
      place(g, x, z, Math.atan2(nx, nz)); nm++; } });
  }
  // ================= [inverno] VOLUMI E ARIA =================
  // Quello che sta tra il muro e la strada (zoccolo, gradini, neve ammucchiata, marciapiedi col cordolo)
  // e lo spessore dell'aria (coni di luce, aloni a terra, vapore, nebbia a strati che cresce con la distanza).
  const VX = { cones: [], decals: [], steam: [], fog: [] };
  // ================= [inverno] MARCIAPIEDI LISCI =================
  // Niente lastre quadrate: il marciapiede è una superficie continua che segue la strada e le case.
  // Si parte dalla mappa delle caselle di marciapiede, la si rifà a mezzo metro, la si sfuma (angoli arrotondati,
  // raggi di curva agli incroci) e la si alza di 14 cm con un cordolo morbido: il bordo è una rampa, non uno spigolo.
  function buildSidewalks() {
    const T = G.T, R = .5, K = Math.round(TS / R), NW = Math.ceil(G.GW * TS / R) + 1, NH = Math.ceil(G.GH * TS / R) + 1;
    let m = new Float32Array(NW * NH), any = 0;
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { if (G.tileAt(tx, ty) !== T.WALK) continue; any++; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) m[(ty * K + j) * NW + tx * K + i] = 1; }
    if (!any) return 0;
    const blur = (src, rad) => { const t = new Float32Array(src.length), o = new Float32Array(src.length), n = 2 * rad + 1;
      for (let j = 0; j < NH; j++) { let s = 0; for (let i = -rad; i <= rad; i++) s += src[j * NW + Math.max(0, i)]; for (let i = 0; i < NW; i++) { t[j * NW + i] = s / n; s += src[j * NW + Math.min(NW - 1, i + rad + 1)] - src[j * NW + Math.max(0, i - rad)]; } }
      for (let i = 0; i < NW; i++) { let s = 0; for (let j = -rad; j <= rad; j++) s += t[Math.max(0, j) * NW + i]; for (let j = 0; j < NH; j++) { o[j * NW + i] = s / n; s += t[Math.min(NH - 1, j + rad + 1) * NW + i] - t[Math.max(0, j - rad) * NW + i]; } }
      return o; };
    // scorrimento per curvatura: sfuma e riaffila più volte, così i gradini a 2 m delle strade fuori griglia diventano curve
    // e gli angoli si arrotondano senza assottigliare i marciapiedi stretti
    const sharp = (a, lo, hi) => { for (let k = 0; k < a.length; k++) { const t = Math.max(0, Math.min(1, (a[k] - lo) / (hi - lo))); a[k] = t * t * (3 - 2 * t); } return a; };
    const area0 = m.reduce((a, b) => a + b, 0);
    for (let it = 0; it < 10; it++) m = sharp(blur(m, 3), .26, .62);
    m = blur(blur(m, 2), 2);
    const area1 = m.reduce((a, b) => a + b, 0); if (window.__swDbg) console.log('marciapiedi area', (area1 / area0).toFixed(2));
    const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const H = new Float32Array(m.length); for (let k = 0; k < m.length; k++) H[k] = .15 * sstep(.36, .64, m[k]);
    const terr = (x, z) => { const fx = x / TS, fz = z / TS; if (fx < 0 || fz < 0 || fx >= G.GW || fz >= G.GH) return -2;
      const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, h00 = VH(i, j), h10 = VH(i + 1, j), h01 = VH(i, j + 1), h11 = VH(i + 1, j + 1);
      return u <= v ? h00 + (h11 - h01) * u + (h01 - h00) * v : h00 + (h10 - h00) * u + (h11 - h10) * v; };
    const idx = new Int32Array(m.length).fill(-1), pos = [], col = [], ind = [], c = new THREE.Color();
    const vert = (i, j) => { const k = j * NW + i; if (idx[k] >= 0) return idx[k]; const x = i * R, z = j * R, h = H[k], gx = (terr(x + .3, z) - terr(x - .3, z)) / .6, gz = (terr(x, z + .3) - terr(x, z - .3)) / .6, y = terr(x, z) + h * Math.sqrt(1 + gx * gx + gz * gz) - .01;
      // rumore continuo (non a blocchi): niente losanghe e pieghe a spigolo sul marciapiede
      const vn = (px, pz, cell, seed) => { const fx = px / cell, fz = pz / cell, i = Math.floor(fx), j = Math.floor(fz); let u = fx - i, w = fz - j; u = u * u * (3 - 2 * u); w = w * w * (3 - 2 * w);
        const a = vegHash(i, j, seed), b = vegHash(i + 1, j, seed), d = vegHash(i, j + 1, seed), e = vegHash(i + 1, j + 1, seed); return a + (b - a) * u + (d - a) * w + (a - b - d + e) * u * w; };
      const top = sstep(.05, .14, h), n1 = vn(x, z, 4, 8) - .5, n2 = vn(x, z, 1.3, 9) - .5, snow = sstep(.45, .85, vn(x, z, 6, 10));
      c.set('#5a5860').lerp(c.clone().set(NEVE ? '#b4bac2' : '#646268'), top);   // [inverno19] senza neve il marciapiede è cemento, non bianco c.multiplyScalar(1 + n1 * .12 + n2 * .05); if (NEVE) c.lerp(new THREE.Color('#c8ccd4'), snow * .4 * top);
      pos.push(x, y, z); col.push(c.r, c.g, c.b); return (idx[k] = pos.length / 3 - 1); };
    for (let j = 0; j < NH - 1; j++) for (let i = 0; i < NW - 1; i++) {
      const k = j * NW + i; if (H[k] < .004 && H[k + 1] < .004 && H[k + NW] < .004 && H[k + NW + 1] < .004) continue;
      const a = vert(i, j), b = vert(i + 1, j), d = vert(i, j + 1), e = vert(i + 1, j + 1); ind.push(a, d, b, b, d, e);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(ind); geo.computeVertexNormals();
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH));
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: NEVE ? '#34363c' : '#1a1a1e', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
    return ind.length / 3;
  }
  // ================= [inverno] CARATTERE DELLE FACCIATE =================
  // Ogni edificio ha qualcosa che lo distingue: scale antincendio a zig-zag, tubi, condizionatori appesi, insegne a bandiera
  // verticali al neon, serbatoi sul tetto con l'insegna luminosa, cavi tesi da un tetto all'altro con lampade.
  const FACT = {};
  function labelTex(text, col, vert, w, h) {
    col = nq(col); const key = text + col + vert; if (FACT[key]) return FACT[key];
    const c = mk(w, h), x = c.getContext('2d'); x.fillStyle = '#0c0a10'; x.fillRect(0, 0, w, h);
    x.strokeStyle = col; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (vert) { x.save(); x.translate(w / 2, h / 2); x.rotate(-Math.PI / 2); x.font = 'bold ' + Math.floor(w * .62) + 'px sans-serif'; x.fillText(text, 0, 2); x.restore(); }
    else { x.font = 'bold ' + Math.floor(h * .56) + 'px sans-serif'; x.fillText(text, w / 2, h / 2 + 2); x.fillText(text, w * 1.5, h / 2 + 2); }
    // lettere spente e tubo rotto
    x.fillStyle = 'rgba(12,10,16,.82)'; for (let i = 0; i < 2; i++) x.fillRect(Math.floor(vegHash(text.length, i, 4) * (w - 12)) + 4, Math.floor(vegHash(i, text.length, 5) * (h - 12)) + 4, vert ? w - 10 : 10, vert ? 8 : h - 10);
    const t = canvasTex(c); return FACT[key] = t;
  }
  const NEONS = ['#f0a048', '#d4d0c6', '#f0a048', '#b84a3c', '#d4d0c6'], WORDS = ['ПОМПА', 'РАБОТА', 'НОВОСТИ', 'ОТЕЛЬ', 'БАР', 'АПТЕКА', 'СКЛАД', '24 ЧАСА', '새 일자리', '약국', '酒', 'ЛОМБАРД', 'КИНО', 'ЧАЙ', '식당'];
  function buildFacades() {
    const T = G.T, st = sm('#3a3d44', { roughness: .7, metalness: .5 }), rust = sm('#6a4636', { roughness: 1 }), pipeM = sm('#4a4e54', { roughness: .6, metalness: .5 }), acM = sm('#8a8e94', { roughness: .6 });
    const cables = [], anchors = [];
    let nn = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.facDone) return;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1, top = bb.max.y - 2.5, fl = Math.max(1, b.fl || 1);
      const r = rng(bi * 977 + 13), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { n: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { n: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { n: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { n: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], 0, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      if (sides.length && fl >= 2) {
        // scala antincendio
        if (fl >= 3 && r() < .5) { const sd = sides[Math.floor(r() * sides.length)], u = Math.min(sd.len - 1.6, 1 + r() * (sd.len - 3)), a = mkA(sd, u + .8);
          for (let f = 1; f < fl; f++) { const y = base + MG + (f - 1) * MF - .05; ad(a, box(1.8, .07, .85, st), 0, y, .43); ad(a, box(1.8, .05, .04, st), 0, y + .9, .85); ad(a, box(.04, .9, .04, st), -.9, y + .45, .85); ad(a, box(.04, .9, .04, st), .9, y + .45, .85);
            if (f < fl - 1) { const s2 = f % 2 ? 1 : -1, stp = box(1.9, .06, .6, st); ad(a, stp, -s2 * .05, y + MF / 2, .45).rotation.z = s2 * Math.atan(MF / 1.9); } } }
        // tubi lungo il muro
        if (r() < .55) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, .5 + r() * (sd.len - 1)); ad(a, cyl(.07, .07, top - base, 6, pipeM), 0, base + (top - base) / 2, .1); for (let f = 1; f < fl; f++) ad(a, box(.2, .06, .2, pipeM), 0, base + MG + (f - 1) * MF, .1); }
        // condizionatori appesi alla facciata
        const nac = Math.floor(r() * 4); for (let k = 0; k < nac; k++) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, .8 + r() * (sd.len - 1.6)), f = 1 + Math.floor(r() * (fl - 1)); ad(a, box(.8, .5, .45, acM), 0, base + MG + (f - 1) * MF + .2, .25); ad(a, cyl(.17, .17, .03, 8, pipeM), 0, base + MG + (f - 1) * MF + .2, .5).rotation.x = Math.PI / 2; }
        // insegna a bandiera verticale al neon
        if (b.use && r() < .6) { const sd = sides[Math.floor(r() * sides.length)], a = mkA(sd, 1 + r() * Math.max(.1, sd.len - 2)), word = WORDS[Math.floor(r() * WORDS.length)], col = NEONS[Math.floor(r() * NEONS.length)];
          const m = new THREE.MeshBasicMaterial({ map: labelTex(word.slice(0, 5), col, true, 48, 160) }); const H = 2.2 + r() * .8, y = base + MG * .5 + H / 2 + 1;
          [-1, 1].forEach(s2 => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.8, H), m); pl.rotation.y = s2 * Math.PI / 2; ad(a, pl, s2 * .06, y, .55); }); ad(a, box(.1, .08, .7, st), 0, y + H / 2, .35); ad(a, box(.1, .08, .7, st), 0, y - H / 2, .35);
          const L = addLight(...(() => { const q = new THREE.Vector3(); q.set(0, y, 1.1); a.updateMatrixWorld(true); q.applyMatrix4(a.matrixWorld); return [q.x, q.y, q.z]; })(), col, 1.3, 7, .04); }
      }
      // serbatoio sul tetto con l'insegna luminosa
      if (fl >= 3 && w >= 6 && d >= 6 && r() < .32) {
        const tx = bb.min.x + 1.8 + r() * Math.max(.1, w - 4.4), tz = bb.min.z + 1.8 + r() * Math.max(.1, d - 4.4), R = 1.5 + r() * .5, H = 1.5, col = NEONS[Math.floor(r() * NEONS.length)], word = WORDS[Math.floor(r() * WORDS.length)];
        const t = labelTex(word, col, false, 256, 64).clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(1, 1);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 18, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); body.position.set(tx, top + 1.2 + H / 2, tz); body.rotation.y = r() * 6; g.add(body);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * .2, R * 1.04, .7, 18), sm('#2e3036', { roughness: .8 })); cap.position.set(tx, top + 1.2 + H + .35, tz); g.add(cap);
        const bot = cyl(R * 1.04, R * .9, .3, 18, sm('#2e3036', { roughness: .8 })); bot.position.set(tx, top + 1.2 + .1, tz); g.add(bot);
        for (let k = 0; k < 4; k++) { const a = k * 1.571 + .7, lg = cyl(.07, .07, 1.3, 5, st); lg.position.set(tx + Math.cos(a) * R * .8, top + .65, tz + Math.sin(a) * R * .8); g.add(lg); }
        const ring = cyl(R * 1.12, R * 1.12, .06, 18, st); ring.position.set(tx, top + 1.2 + H + .02, tz); g.add(ring);
        addLight(tx, top + 1.2 + H * .6, tz, col, 2.2, 14, .03);
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.facGrp = gm; nn++; }
      rec.facDone = true;
      // punti d'attacco dei cavi: gli spigoli del tetto
      anchors.push({ rec, cx: bb.min.x + w / 2 - .3, cz: bb.min.z + d / 2 - .3, hx: w / 2, hz: d / 2, y: top + .5 });
    });
    // cavi tesi da un tetto all'altro, con qualche lampada appesa
    const pts = []; const rc = rng(5151), lampM = ['#9fe8dc', '#d8f0e8', '#38e8ff'].map(c => new THREE.MeshBasicMaterial({ color: c })), lg = new THREE.Group();
    anchors.forEach((A, i) => { let links = 0; for (let j = i + 1; j < anchors.length && links < 2; j++) { const B = anchors[j], dx = B.cx - A.cx, dz = B.cz - A.cz, L = Math.hypot(dx, dz); if (L < 11 || L > 30 || rc() < .45) continue;
      const edge = (P, sx, sz) => { const k = Math.min(P.hx / (Math.abs(sx) || 1e-6), P.hz / (Math.abs(sz) || 1e-6)); return [P.cx + sx * k, P.cz + sz * k]; }, ux = dx / L, uz = dz / L, p0 = edge(A, ux, uz), p1 = edge(B, -ux, -uz), y0 = A.y, y1 = B.y, Ln = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (Ln < 4) continue;
      let prev = [p0[0], y0, p0[1]]; for (let k = 1; k <= 7; k++) { const t = k / 7, sag = Math.sin(t * Math.PI) * Ln * .04, cur = [p0[0] + (p1[0] - p0[0]) * t, y0 + (y1 - y0) * t - sag, p0[1] + (p1[1] - p0[1]) * t]; pts.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]); prev = cur; }
      links++; if (rc() < .3) { const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, my = (y0 + y1) / 2 - Ln * .04 - .3, m = new THREE.Mesh(new THREE.SphereGeometry(.16, 6, 5), lampM[Math.floor(rc() * 3)]); m.position.set(mx, my, mz); lg.add(m); if (rc() < .5) { const bn = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.3), eyeMat('banner')); bn.position.set(mx, my - 1.3, mz); bn.rotation.y = Math.atan2(ux, uz); lg.add(bn); } if (rc() < .6) addLight(mx, my, mz, '#8fd8d0', 1.4, 9, .05); } } });
    if (pts.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH)); const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#15151b' })); ln.frustumCulled = false; scene.add(ln); }
    // ---- il regime sui tetti: torri di altoparlanti, schermi del Garante, telecamere con il led rosso ----
    anchors.forEach(A => {
      const q = rc(), sx = rc() < .5 ? -1 : 1, sz = rc() < .5 ? -1 : 1, ex = A.cx + sx * A.hx * .7, ez = A.cz + sz * A.hz * .7, ry = A.y - .5, iron = sm('#23262a', { roughness: .8, metalness: .3 });
      if (q < .26) {
        const pole = cyl(.06, .08, 3.4, 6, iron); pole.position.set(ex, ry + 1.7, ez); lg.add(pole);
        for (let k = 0; k < 3; k++) { const h = new THREE.Group(); h.position.set(ex, ry + 2.5 + (k % 2) * .6, ez); h.rotation.y = k * 2.09 + rc() * 1.2; const horn = new THREE.Mesh(new THREE.ConeGeometry(.4, .75, 10, 1, true), sm('#8a8d90', { roughness: .6, metalness: .3, side: THREE.DoubleSide })); horn.rotation.z = Math.PI / 2; horn.position.x = .4; h.add(horn); lg.add(h); }
        const led = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), sb('#ff2a2a')); led.position.set(ex, ry + 3.5, ez); lg.add(led); glow(ex, ry + 3.5, ez, '#ff2a2a', 1.3);
      } else if (q < .44) {
        const m = eyeMat('screen'), sc = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.5), m); sc.position.set(ex, ry + 3.4, ez); sc.rotation.y = .5; sc.material.side = THREE.DoubleSide; lg.add(sc);
        const fr = box(4.6, 2.7, .12, iron); fr.position.copy(sc.position); fr.rotation.y = .5; fr.translateZ(-.09); lg.add(fr);
        [-1.6, 1.6].forEach(o => { const lgp = box(.1, 2.2, .1, iron); lgp.position.set(ex + Math.cos(.5) * o, ry + 1.1, ez - Math.sin(.5) * o); lg.add(lgp); });
        const gl2 = glow(sc.position.x, sc.position.y, sc.position.z, '#7ff0e0', 6); gl2.material.opacity = .35; dyn.signs.push({ m, gl: gl2, flick: rc() < .35 });
      } else if (q < .6) {
        const pole = cyl(.05, .05, 1.8, 6, iron); pole.position.set(ex, ry + .9, ez); lg.add(pole);
        const cam = box(.5, .22, .22, sm('#3a3e42', { roughness: .6 })); cam.position.set(ex, ry + 1.9, ez); cam.rotation.y = rc() * 6.28; lg.add(cam);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.05, 6, 5), sb('#ff2a2a')); led.position.set(ex, ry + 1.9, ez); lg.add(led); glow(ex, ry + 1.9, ez, '#ff2a2a', .9);
      }
    });
    scene.add(lg);
    return nn;
  }
  // occhio del Garante: striscione rosso e schermo verde-acqua
  const EYEC = {};
  function eyeMat(kind) {
    if (EYEC[kind]) return EYEC[kind];
    const ban = kind === 'banner', W = ban ? 48 : 128, H = ban ? 72 : 72, c = mk(W, H), x = c.getContext('2d');
    x.fillStyle = ban ? '#7e1118' : '#06161a'; x.fillRect(0, 0, W, H);
    const cx = W / 2, cy = ban ? 30 : 34, R = ban ? 15 : 22;
    x.fillStyle = ban ? '#150a0b' : '#0c2a30'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    x.fillStyle = ban ? '#e8e0d0' : '#9ff6ea'; x.beginPath(); x.moveTo(cx - R * .85, cy); x.quadraticCurveTo(cx, cy - R * .8, cx + R * .85, cy); x.quadraticCurveTo(cx, cy + R * .8, cx - R * .85, cy); x.fill();
    x.fillStyle = ban ? '#b4141c' : '#0a2024'; x.beginPath(); x.arc(cx, cy, R * .3, 0, 7); x.fill(); x.fillStyle = '#000'; x.fillRect(cx - 1, cy - R * .22, 2, R * .44);
    x.fillStyle = ban ? '#150a0b' : '#9ff6ea'; if (ban) { x.fillRect(5, 54, 38, 3); x.fillRect(9, 60, 30, 2); x.fillRect(0, 0, W, 3); } else { x.globalAlpha = .7; x.fillRect(8, 62, 70, 3); x.fillRect(8, 67, 44, 2); x.globalAlpha = 1; for (let k = 0; k < H; k += 3) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, k, W, 1); } }
    const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return EYEC[kind] = ban ? new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, emissive: '#3a0508', emissiveMap: t }) : new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  }
  // ================= [inverno] DETTAGLI: manifesti, volantini, caratteri dei locali, arredo di strada =================
  const POST = {};
  function posterTex(k) {
    if (POST[k]) return POST[k];
    const W = 24, H = 34, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(k, n, 21), px = (a, b, w, hh, col) => { x.fillStyle = col; x.fillRect(a, b, w, hh); };
    const kind = k % 8;
    if (kind === 0) { px(0, 0, W, H, '#a8221f'); px(7, 6, 10, 12, '#16100e'); px(9, 4, 6, 4, '#16100e'); px(3, 24, 18, 3, '#f0e6d0'); px(5, 29, 14, 2, '#f0e6d0'); px(0, 0, W, 2, '#16100e'); }          // il Garante
    else if (kind === 1) { px(0, 0, W, H, '#14101e'); px(0, 6, W, 4, '#ff3fa4'); px(0, 13, W, 4, '#38e8ff'); px(3, 22, 18, 3, '#ffb050'); px(6, 28, 12, 2, '#f0e6d0'); }                     // concerto
    else if (kind === 2) { px(0, 0, W, H, '#e8e2d0'); px(6, 5, 12, 12, '#28242a'); for (let i = 0; i < 4; i++) px(3, 20 + i * 3, 18 - Math.floor(h(i) * 8), 1, '#4a4650'); px(3, 2, 18, 2, '#a8221f'); }   // persona scomparsa
    else if (kind === 3) { px(0, 0, W, H, '#0c1620'); x.strokeStyle = '#38e8ff'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 14 + Math.sin(i * .6) * 4); x.stroke(); x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 21 + Math.sin(i * .6 + 1) * 3); x.stroke(); px(4, 28, 16, 2, '#38e8ff'); }   // l'onda della Risacca
    else if (kind === 4) { px(0, 0, W, H, '#f0d030'); px(3, 4, 18, 10, '#1a1618'); px(4, 18, 16, 2, '#1a1618'); px(4, 22, 12, 2, '#1a1618'); px(4, 26, 14, 2, '#a8221f'); }              // inserzione
    else if (kind === 5) { px(0, 0, W, H, '#2c5a3a'); px(0, 0, W, 5, '#e8e0c0'); px(4, 9, 16, 14, '#e8e0c0'); px(8, 12, 8, 8, '#2c5a3a'); px(3, 27, 18, 3, '#e8e0c0'); }                      // lavoro
    else if (kind === 6) { px(0, 0, W, H, '#d8d4c8'); for (let i = 0; i < 9; i++) px(2, 3 + i * 3, 20 - Math.floor(h(i + 3) * 10), 1, '#46424a'); px(0, 0, 5, 5, '#b8b4a8'); px(W - 6, H - 7, 6, 7, '#b8b4a8'); }   // volantino strappato
    else { x.clearRect(0, 0, W, H); x.strokeStyle = ['#ff3fa4', '#38e8ff', '#ffb050', '#38e8ff'][Math.floor(h(9) * 4)]; x.lineWidth = 2; x.beginPath(); for (let i = 0; i < 8; i++) x.lineTo(2 + h(i) * 20, 3 + h(i + 20) * 28); x.stroke(); }   // scritta a spray
    const t = canvasTex(c); return POST[k] = t;
  }
  // ================= [inverno22] PROPAGANDA: il volto del Garante e le scritte rosse =================
  // Ritratti enormi incollati o dipinti sui muri ciechi, teloni rossi appesi alle facciate, slogan rossi a pennello
  // sotto il cornicione. Il Garante è un volto inventato: berretto, occhiali tondi scuri, mascella quadrata, colletto alto.
  // Qualche ritratto è già stato sfregiato dalla Risacca (l'onda nera, gli occhi cancellati).
  const PROP_SLOGAN = ["L'ORDINE È UNA CAREZZA", 'IL GARANTE VEGLIA SU DI TE', 'OBBEDIRE È ESSERE LIBERI', 'LA TUTELA TI PROTEGGE', 'LAVORO · ORDINE · SILENZIO',
    'IL GARANTE TI ASCOLTA', 'DENUNCIA IL DISORDINE', 'UN POPOLO · UNA VOCE', 'CHI TACE AMA LA PATRIA', 'ПОРЯДОК · ТРУД · ТИШИНА', 'IL DUBBIO È UN NEMICO', 'GRAZIE, GARANTE'];
  const PROP = {};
  function garanteFace(x, W, H, ox, oy, s, ink, paper, accent, defaced) {
    // tutto in unità di una griglia 32x40, scalata di s: stampo a tre colori (carta, rosso, nero)
    const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(ox + Math.round(a * s), oy + Math.round(b * s), Math.ceil(w * s), Math.ceil(h * s)); };
    const P = (pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(ox + a * s, oy + b * s) : x.moveTo(ox + a * s, oy + b * s)); x.closePath(); x.fill(); };
    P([[2, 40], [6, 31], [12, 28], [20, 28], [26, 31], [30, 40]], ink);                         // cappotto e spalle
    P([[11, 28], [16, 33], [21, 28], [20, 26], [12, 26]], accent);                               // colletto alto
    R(13, 22, 6, 6, ink);                                                                        // collo in ombra
    P([[9, 12], [23, 12], [23, 20], [20, 25], [16, 26.5], [12, 25], [9, 20]], paper);              // volto
    P([[16, 12], [23, 12], [23, 20], [20, 25], [16, 26.5]], ink);                                // metà in ombra: stampo
    R(17, 21.5, 4, 1, paper); R(11, 21.5, 4, 1, ink);                                            // bocca stretta
    R(10, 24, 3, 1, ink);                                                                        // mascella
    P([[7, 12], [25, 12], [24, 9], [8, 9]], ink);                                                // visiera
    P([[8, 9], [24, 9], [26, 4], [21, 1.5], [11, 1.5], [6, 4]], ink);                            // berretto
    R(9, 7, 14, 2, accent);                                                                      // fascia del berretto
    R(14.5, 3.5, 3, 3, paper); R(15.5, 4.5, 1, 1, ink);                                          // stemma: un occhio
    if (!defaced) { x.fillStyle = ink; [[12.5, 15.5], [19.5, 15.5]].forEach(([a, b]) => { x.beginPath(); x.arc(ox + a * s, oy + b * s, 2.6 * s, 0, 6.3); x.fill(); }); R(14.5, 15, 3, 1, ink); R(11.5, 14.5, 1, 1, paper); }
    else { x.strokeStyle = '#121014'; x.lineWidth = 2.2 * s; x.beginPath(); x.moveTo(ox + 9 * s, oy + 13 * s); x.lineTo(ox + 23 * s, oy + 18 * s); x.moveTo(ox + 9 * s, oy + 18 * s); x.lineTo(ox + 23 * s, oy + 13 * s); x.stroke(); }
  }
  function propTex(kind, k) {
    const key = kind + k; if (PROP[key]) return PROP[key];
    const r = rng(k * 977 + 13), red = '#9e1f1a', ink = '#16110f', paper = '#d6ccb8';
    let W, H, c, x;
    if (kind === 'ritratto' || kind === 'telone') {
      W = 96; H = 136; c = mk(W, H); x = c.getContext('2d');
      const bg = kind === 'telone' ? red : paper, defaced = kind === 'ritratto' && r() < .22;
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      if (kind === 'ritratto') { x.fillStyle = red; for (let a = 0; a < 18; a++) { if (a % 2) continue; const a0 = a / 18 * 6.283, a1 = (a + 1) / 18 * 6.283; x.beginPath(); x.moveTo(48, 52); x.lineTo(48 + Math.cos(a0) * 120, 52 + Math.sin(a0) * 120); x.lineTo(48 + Math.cos(a1) * 120, 52 + Math.sin(a1) * 120); x.fill(); } }   // raggi rossi
      garanteFace(x, W, H, 8, 10, 2.5, ink, kind === 'telone' ? '#d8c8b0' : paper, kind === 'telone' ? '#16110f' : red, defaced);
      // didascalia
      const txt = pick(r, ['IL GARANTE', 'IL GARANTE VEGLIA', 'ГАРАНТ', 'ORDINE', 'TI ASCOLTA']);
      x.fillStyle = kind === 'telone' ? ink : red; x.fillRect(0, H - 26, W, 26);
      x.fillStyle = kind === 'telone' ? '#d8c8b0' : paper; x.textAlign = 'center'; x.textBaseline = 'middle';
      let fs = 15; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; while (x.measureText(txt).width > W - 8 && fs > 8) { fs--; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; } x.fillText(txt, W / 2, H - 13);
      if (defaced) { x.strokeStyle = '#121014'; x.lineWidth = 4; x.beginPath(); x.moveTo(6, 100); for (let q = 0; q <= 6; q++) x.quadraticCurveTo(10 + q * 13, 88 - (q % 2) * 16, 16 + q * 13, 100); x.stroke(); }   // l'onda della Risacca
      // tempo: macchie, colature, carta strappata
      for (let i = 0; i < 260; i++) { x.fillStyle = r() < .5 ? 'rgba(40,30,26,.12)' : 'rgba(230,220,200,.1)'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
      for (let i = 0; i < 7; i++) { x.fillStyle = 'rgba(30,24,20,.22)'; const cx = Math.floor(r() * W); x.fillRect(cx, Math.floor(r() * 20), 1, 20 + Math.floor(r() * 50)); }
      if (kind === 'ritratto') { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 16; i++) { const ex = r() < .5 ? (r() < .5 ? 0 : W) : r() * W, ey = r() < .5 ? r() * H : (r() < .5 ? 0 : H); x.beginPath(); x.ellipse(ex, ey, 3 + r() * 9, 2 + r() * 7, r() * 3, 0, 6.3); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    } else {   // slogan a pennello: rosso, consumato, con le colature
      const txt = PROP_SLOGAN[k % PROP_SLOGAN.length]; W = 512; H = 56; c = mk(W, H); x = c.getContext('2d');
      x.fillStyle = red; x.textAlign = 'center'; x.textBaseline = 'middle';
      let fs = 40; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; while (x.measureText(txt).width > W - 16 && fs > 14) { fs--; x.font = 'bold ' + fs + 'px Impact, "Arial Black", sans-serif'; }
      x.fillText(txt, W / 2, H / 2 - 2);
      const tw = x.measureText(txt).width; for (let i = 0; i < 18; i++) { const dx = W / 2 - tw / 2 + r() * tw; x.fillRect(Math.floor(dx), H / 2 + fs * .3, 2, 4 + Math.floor(r() * 12)); }   // colature
      x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + (.3 + r() * .7) + ')'; x.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + Math.floor(r() * 3), 1); } x.globalCompositeOperation = 'source-over';
    }
    const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return PROP[key] = new THREE.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .35, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: .34, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  const MURALS = [];
  function clearMurals() {   // [inverno25] niente compenetrazioni davanti ai murali
    if (!MURALS.length) return;
    const boxes = MURALS.map(P => { const hw = P.pw / 2 + .15, y0 = P.yc - P.ph / 2 - .1, y1 = P.yc + P.ph / 2 + .1;
      return P.yaw ? new THREE.Box3(new THREE.Vector3(P.x - .35, y0, P.z - hw), new THREE.Vector3(P.x + 1.6, y1, P.z + hw)) : new THREE.Box3(new THREE.Vector3(P.x - hw, y0, P.z - .35), new THREE.Vector3(P.x + hw, y1, P.z + 1.6)); });
    const keep = new Set(); dyn.buildings.forEach(rec => rec.grp && rec.grp.traverse(o => keep.add(o)));
    const bb = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3(), M4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0); let n = 0;
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || keep.has(o) || o.userData.mural || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const gb = o.geometry.boundingBox; if (!gb) return;
      if (o.isInstancedMesh) {
        let hit = false;
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M4); bb.copy(gb).applyMatrix4(M4).applyMatrix4(o.matrixWorld); bb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) > 4) continue; bb.getCenter(c); if (boxes.some(B => B.containsPoint(c))) { o.setMatrixAt(i, Z); hit = true; n++; } }
        if (hit) o.instanceMatrix.needsUpdate = true;
      } else {
        bb.copy(gb).applyMatrix4(o.matrixWorld); bb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) > 4) return; bb.getCenter(c);
        if (boxes.some(B => B.containsPoint(c))) { o.visible = false; n++; }
      }
    });
    window.__muralClear = n;
  }
  function buildPropaganda() {   // [inverno24] ritratti nei muri ciechi decisi alla costruzione, slogan a lettere sui tetti
    const T = G.T, WD = M.world && M.world.districtAt, g = new THREE.Group(); let nR = 0, nS = 0;
    const iron = sm('#1e1c20', { roughness: .7, metalness: .5 });
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b) return;
      const PP = b.__prop;
      if (PP) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));
        m.position.set(PP.x + Math.sin(PP.yaw) * .14, PP.yc, PP.z + Math.cos(PP.yaw) * .14); m.rotation.y = PP.yaw; m.userData.mural = 1; g.add(m); nR++; MURALS.push(PP);
        (window.__propPos = window.__propPos || []).push([Math.round(PP.x), Math.round(PP.z), 'ritratto']);
        if (bi % 3 === 0) addLight(PP.x + Math.sin(PP.yaw) * 2, PP.yc - PP.ph / 2 + .4, PP.z + Math.cos(PP.yaw) * 2, '#e0a050', 1.8, 10, .02);   // faretto da sotto
      }
      // slogan sul tetto: telaio di ferro sul bordo verso la strada, lettere rosse
      if (!b.__top || !rec.box3) return;
      const dd = WD ? WD(b.x * TS) : 'centro'; if (dd === 'prateria' || dd === 'foresta') return;
      const r = rng(bi * 557 + 31), kind = modKind(b), civic = kind === 'civic' || kind === 'mil';
      if (r() > (civic ? .75 : .2) || nS > 70 || (b.fl || 1) < 2) return;
      const f = (PP && PP.f === 'S') || b.w >= b.h ? 'S' : 'E', len = (f === 'S' ? b.w : b.h) * TS, sw = Math.min(len - 1.2, 11), sh = sw * (56 / 512) * 1.15;
      if (sw < 4) return;
      const x0 = b.x * TS, z0 = b.y * TS, inset = .9, yb = b.__top + .55;
      const cx = f === 'S' ? x0 + b.w * TS / 2 : x0 + b.w * TS - inset, cz = f === 'S' ? z0 + b.h * TS - inset : z0 + b.h * TS / 2, yaw = f === 'S' ? 0 : Math.PI / 2;
      const grp = new THREE.Group(); grp.position.set(cx, yb, cz); grp.rotation.y = yaw; g.add(grp);
      const L = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), propTex('slogan', Math.floor(r() * 997))); L.position.set(0, .35 + sh / 2, .05); grp.add(L);
      [-sw / 2 + .2, 0, sw / 2 - .2].forEach(px => { const post = new THREE.Mesh(new THREE.BoxGeometry(.07, .35 + sh, .07), iron); post.position.set(px, (.35 + sh) / 2 - .55, -.05); grp.add(post); });
      [.35, .35 + sh].forEach(py => { const rail = new THREE.Mesh(new THREE.BoxGeometry(sw, .05, .05), iron); rail.position.set(0, py, -.05); grp.add(rail); });
      nS++;
    });
    scene.add(g); window.__propaganda = { ritratti: nR, slogan: nS };
  }
  function buildDetails() {
    const T = G.T, mats = [], plane = (k) => mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ map: posterTex(k), transparent: k % 8 === 7, alphaTest: k % 8 === 7 ? .3 : 0, side: THREE.DoubleSide, emissive: '#2a2830' }));
    const metal = sm('#4a4e54', { roughness: .6, metalness: .5 }), dark = sm('#1c1c22', { roughness: 1 }), yel = sm('#c8a82a', { roughness: .8 }), red = sm('#a02a24', { roughness: .7 }), wood = sm('#6a5238', { roughness: 1 }), white = sm('#d8d4c8', { roughness: 1 });
    const glowM = c => new THREE.MeshBasicMaterial({ color: c }), bulb = glowM('#ffd890');
    const doors = new Set(); G.BUILDINGS.forEach(b => { if (b.door) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) doors.add((b.door[0] + dx) + ',' + (b.door[1] + dy)); });
    let np = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.detDone) return; rec.detDone = true;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1;
      const r = rng(bi * 311 + 29), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { f: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { f: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { f: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { f: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      // [inverno24] solo dove il piano terra è muro pieno: niente manifesti sui vetri
      const wallU = (sd, u) => { if (!b.__gwall) return u; const L = b.__gwall[sd.f] || []; if (!L.length) return null; const k = L[Math.floor((u * 7.3) % L.length)]; return k * TS + .3 + ((u * 13.7) % 1) * 1.4; };
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], base - .1, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      const lightAt = (a, x, y, z, col, I, D) => { const q = new THREE.Vector3(x, y, z); a.updateMatrixWorld(true); q.applyMatrix4(a.matrixWorld); addLight(q.x, q.y, q.z, col, I, D, .05); };
      // --- manifesti, volantini, scritte: sul piano terra, sui lati che danno sulla strada ---
      sides.forEach(sd => {
        const n = 2 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const u0 = .7 + r() * Math.max(.1, sd.len - 1.4), u = wallU(sd, u0); if (u === null || u > sd.len - .4) continue; const a = mkA(sd, u), kind = Math.floor(r() * 24) % 16, big = kind % 8 !== 6 && kind % 8 !== 7 && r() < .6, sz = big ? [.6, .85] : [.34, .46];
          const m = new THREE.Mesh(new THREE.PlaneGeometry(sz[0], sz[1]), plane(kind)); m.rotation.z = (r() - .5) * .1; ad(a, m, 0, .9 + r() * 1.3 + (kind % 8 === 7 ? .3 : 0), .07 + r() * .01);
          if (kind % 8 === 7) m.scale.set(2.2, 2.2, 1);
        }
        // piccoli oggetti attaccati al muro
        const extra = Math.floor(r() * 4);
        for (let k = 0; k < extra; k++) {
          const u1 = wallU(sd, .6 + r() * Math.max(.1, sd.len - 1.2)); if (u1 === null || u1 > sd.len - .4) continue; const a = mkA(sd, u1), t = r();
          if (t < .25) { ad(a, box(.3, .4, .14, metal), 0, 1.4, .1); ad(a, box(.24, .04, .02, dark), 0, 1.5, .18); }                          // contatore
          else if (t < .45) { ad(a, cyl(.14, .14, .08, 8, dark), 0, 2.3, .1).rotation.x = Math.PI / 2; ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), 0, 2.3, .18); if (r() < .3) lightAt(a, 0, 2.3, .5, '#ffb35c', 1.1, 6); }   // lampada a muro
          else if (t < .6) { ad(a, box(.04, 2.6, .04, yel), .3, 1.3, .08); ad(a, box(.6, .04, .04, yel), 0, 1.0, .08); }                       // tubo del gas
          else if (t < .75) { ad(a, box(.3, .38, .16, red), 0, 1.3, .1); ad(a, box(.2, .03, .02, dark), 0, 1.38, .19); }                       // cassetta delle lettere
          else if (t < .9) { ad(a, cyl(.22, .22, .06, 10, metal), 0, 2.0 + r() * .6, .08).rotation.x = Math.PI / 2; ad(a, box(.3, .03, .03, dark), 0, 2.0, .12); }   // griglia di sfiato
          else { ad(a, box(.16, .26, .06, white), 0, 1.3, .08); ad(a, box(.1, .04, .02, glowM('#38e8ff')), 0, 1.38, .12); }                      // citofono
        }
      });
      // --- il carattere del locale, davanti alla porta ---
      if (b.door) {
        const f = faceOf(b), sd = { S: 0, N: 1, E: 2, W: 3 }[f], S0 = [
          { at: u => [x0 + u, z0 + d], yaw: 0 }, { at: u => [x0 + w - u, z0], yaw: Math.PI }, { at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2 }, { at: u => [x0, z0 + u], yaw: -Math.PI / 2 }][sd];
        const lt = f === 'S' ? b.door[0] - b.x : f === 'N' ? b.x + b.w - 1 - b.door[0] : f === 'E' ? b.y + b.h - 1 - b.door[1] : b.door[1] - b.y, u0 = (lt * TS + TS / 2) + (f === 'S' || f === 'N' ? 0 : 0);
        const a = mkA(S0, u0 + .3), use = b.use || (b.warehouse ? 'magazzino' : b.church ? 'chiesa' : '');
        const table = (x, z) => { ad(a, cyl(.4, .4, .05, 8, wood), x, .78, z); ad(a, cyl(.05, .05, .75, 5, metal), x, .4, z); [[-.5, 0], [.5, 0]].forEach(([dx]) => { ad(a, cyl(.17, .17, .04, 6, red), x + dx, .48, z); ad(a, cyl(.03, .03, .46, 4, metal), x + dx, .24, z); }); };
        if (use === 'bar' || use === 'trattoria' || use === 'osteria') { table(-1.6, 1.8); table(1.8, 2.0); ad(a, box(.5, .8, .06, dark), 0, .4, 1.4); for (let k = 0; k < 6; k++) { const q = ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), -2.2 + k * .85, 2.6 - Math.sin(k / 5 * Math.PI) * .25, 2.4); } ad(a, box(4.4, .02, .02, dark), 0, 2.55, 2.4); lightAt(a, 0, 2.4, 2.2, '#ffb35c', 1.8, 9); }
        else if (use === 'panetteria' || use === 'forno') { [-1.1, 1.3].forEach(x => { ad(a, box(.7, .4, .5, wood), x, .2, 1.1); ad(a, box(.6, .12, .4, sm('#c8923c', { roughness: 1 })), x, .46, 1.1); }); ad(a, box(.5, .9, .05, dark), 1.9, .45, 1.6); }
        else if (use === 'pescheria') { for (let k = 0; k < 3; k++) { ad(a, box(.8, .35, .5, sm('#8ab0c4', { roughness: .8 })), -1.2 + k * 1.0, .18, 1.1); ad(a, box(.7, .08, .4, sm('#c8d8e0', { roughness: .5 })), -1.2 + k * 1.0, .38, 1.1); } }
        else if (use === 'ferramenta' || use === 'officina' || use === 'garage') { for (let k = 0; k < 3; k++) { ad(a, cyl(.3, .3, .4, 10, dark), -1.4 + k * .35, .2 + k * .0, 1.2 + (k % 2) * .4); } ad(a, cyl(.3, .3, .9, 10, rust0()), 1.6, .45, 1.2); ad(a, box(.1, 2.2, .1, metal), 2.4, 1.1, .5).rotation.z = .12; ad(a, box(.1, 2.2, .1, metal), 2.8, 1.1, .5).rotation.z = .12; }
        else if (use === 'farmacia' || use === 'ambulatorio') { const cr = glowM('#4dff9a'); ad(a, box(.14, 1.0, .9, dark), -1.2, 3.3, .45); ad(a, box(.18, .72, .24, cr), -1.2, 3.3, .45); ad(a, box(.18, .24, .72, cr), -1.2, 3.3, .45); lightAt(a, -1.2, 3.3, 1.1, '#4dff9a', 1.5, 8); }
        else if (use === 'barbiere') { ad(a, cyl(.1, .1, .8, 8, white), -1.1, 1.5, .25); ad(a, cyl(.105, .105, .2, 8, red), -1.1, 1.65, .25); ad(a, cyl(.105, .105, .2, 8, sm('#2a4a9a', { roughness: .7 })), -1.1, 1.35, .25); }
        else if (use === 'tabacchi') { ad(a, box(.14, .8, .6, sm('#1a3a8a', { roughness: .7 })), -1.2, 3.2, .35); ad(a, box(.16, .55, .1, white), -1.2, 3.2, .34); }
        else if (use === 'teatro' || use === 'cinema') { ad(a, box(4.2, .5, 1.1, dark), 0, 3.4, .6); for (let k = 0; k < 9; k++) ad(a, new THREE.Mesh(new THREE.SphereGeometry(.07, 6, 5), bulb), -1.9 + k * .48, 3.2, 1.18); ad(a, box(.9, 1.3, .06, red), -2.6, 1.4, .1); ad(a, box(.9, 1.3, .06, sm('#2a3a8a', { roughness: .8 })), 2.6, 1.4, .1); lightAt(a, 0, 3, 1.4, '#ffd890', 2, 10); }
        else if (use === 'magazzino') { for (let k = 0; k < 6; k++) ad(a, box(.9, .9, .9, wood), -1.6 + (k % 3) * 1.0, .45 + Math.floor(k / 3) * .9, 1.3).rotation.y = (k - 2) * .1; ad(a, box(1.6, .14, 1.2, wood), 2.4, .1, 1.4); }
        else if (use === 'casa' || use === 'cascina' || !use) { ad(a, cyl(.22, .18, .35, 8, sm('#7a4a34', { roughness: 1 })), -1.2, .18, .5); ad(a, new THREE.Mesh(new THREE.SphereGeometry(.2, 6, 5), sm('#3a5a34', { roughness: 1 })), -1.2, .5, .5); if (r() < .5) { ad(a, box(.05, .9, 1.7, metal), 1.5, .45, 1.1).rotation.y = Math.PI / 2; ad(a, cyl(.3, .3, .06, 10, dark), 1.5, .35, 1.1).rotation.z = Math.PI / 2; } }
        else if (use === 'chiesa') { [-1.5, 1.5].forEach(x => { ad(a, cyl(.14, .14, 1.4, 6, white), x, .7, .9); ad(a, new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), glowM('#ffb35c')), x, 1.5, .9); }); }
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.detGrp = gm; np++; }
    });
    // --- arredo di strada: colonnine, cabine, cassette, Ape parcheggiate ---
    const rs = rng(7007), kit = new THREE.Group(), apeCol = ['#c8b43a', '#3a6a8a', '#a04a3a', '#e8e4dc', '#4a7a52'], used = new Set(); let apes = 0, cols = 0;
    for (let ty = 28; ty < 104; ty++) for (let tx = 166; tx < 242; tx++) {
      if (G.tileAt(tx, ty) !== T.WALK || doors.has(tx + ',' + ty)) continue;
      let vx = 0, vz = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.tileAt(tx + dx, ty + dy) === T.VIA) { vx = dx; vz = dy; }
      if (!vx && !vz) continue; const q = rs(), X = tx * TS + 1 + vx * .75, Z = ty * TS + 1 + vz * .75, Y = groundH(X, Z);
      if (q < .05) { for (const o of [-.8, .8]) { const bl = cyl(.1, .12, .8, 7, dark); bl.position.set(X + (vz ? o : 0), Y + .4, Z + (vx ? o : 0)); kit.add(bl); const cap = cyl(.105, .105, .1, 7, yel); cap.position.set(X + (vz ? o : 0), Y + .72, Z + (vx ? o : 0)); kit.add(cap); } }
      else if (q < .066 && cols < 40) { cols++; const col = ['#38e8ff', '#ff3fa4', '#ffb050'][Math.floor(rs() * 3)], c2 = box(.5, 1.9, .5, sm('#2a2c34', { roughness: .6, metalness: .4 })); c2.position.set(X - vx * .3, Y + .95, Z - vz * .3); kit.add(c2); const sc = new THREE.Mesh(new THREE.PlaneGeometry(.34, .5), glowM(col)); sc.position.set(X - vx * .3 + vx * -.0, Y + 1.35, Z - vz * .3); if (vx) { sc.position.x += vx * -.26; sc.rotation.y = -vx * Math.PI / 2; } else { sc.position.z += vz * -.26; sc.rotation.y = vz > 0 ? Math.PI : 0; } kit.add(sc); }
      else if (q < .074) { const m = box(.4, .55, .4, sm('#a02a24', { roughness: .6 })); m.position.set(X, Y + .8, Z); kit.add(m); const l = box(.1, .8, .1, dark); l.position.set(X, Y + .4, Z); kit.add(l); }
      else if (q < .082 && apes < 14) { apes++; const ap = apeMesh(apeCol[Math.floor(rs() * apeCol.length)]); ap.position.set(X - vx * .3, Y, Z - vz * .3); ap.rotation.y = vx ? (rs() < .5 ? 0 : Math.PI) : (rs() < .5 ? Math.PI / 2 : -Math.PI / 2); shadowed(ap); kit.add(ap); }
    }
    scene.add(kit);
    return np;
  }
  const rust0 = () => sm('#7a4a34', { roughness: 1 });
  // ---- secondo giro: murales, stendardi, bucato tra le case, bovindi, arredo urbano ----
  const MURAL = {};
  function muralTex(k) {
    if (MURAL[k]) return MURAL[k];
    const W = 48, H = 32, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(k, n, 33), kind = k % 6;
    x.fillStyle = ['#14182a', '#1e1418', '#101c24', '#1c1c14', '#2a1420', '#141e18'][kind]; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(Math.floor(h(i) * W), Math.floor(h(i + 50) * H), 3, 1); }
    if (kind === 0) { x.strokeStyle = '#38e8ff'; x.lineWidth = 2; x.beginPath(); x.ellipse(24, 16, 15, 8, 0, 0, 6.3); x.stroke(); x.fillStyle = '#38e8ff'; x.beginPath(); x.arc(24, 16, 5, 0, 6.3); x.fill(); x.fillStyle = '#14182a'; x.fillRect(23, 14, 3, 4); }
    else if (kind === 1) { x.fillStyle = '#ff3fa4'; x.fillRect(12, 14, 22, 8); x.fillRect(32, 12, 7, 5); x.fillRect(8, 10, 5, 5); x.fillStyle = '#0a0a0e'; x.fillRect(20, 6, 8, 8); x.fillRect(34, 22, 8, 2); }
    else if (kind === 2) { x.strokeStyle = '#38a8ff'; x.lineWidth = 3; for (let r2 = 0; r2 < 3; r2++) { x.beginPath(); for (let i = 0; i <= W; i += 2) x.lineTo(i, 8 + r2 * 8 + Math.sin(i * .35 + r2) * 3); x.stroke(); } }
    else if (kind === 3) { x.fillStyle = '#d8281f'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = i * .6283 - 1.57, rr = i % 2 ? 5 : 12; x.lineTo(24 + Math.cos(a) * rr, 16 + Math.sin(a) * rr); } x.fill(); x.fillStyle = '#ffb050'; x.fillRect(22, 14, 4, 4); }
    else if (kind === 4) { x.fillStyle = '#ffb050'; x.fillRect(16, 4, 16, 18); x.fillStyle = '#2a1420'; x.fillRect(19, 9, 4, 3); x.fillRect(26, 9, 4, 3); x.fillRect(20, 16, 9, 2); x.strokeStyle = '#ff3fa4'; x.lineWidth = 2; x.beginPath(); x.moveTo(10, 28); x.lineTo(38, 6); x.stroke(); }
    else { ['#ff3fa4', '#38e8ff', '#ffb050', '#38e8ff'].forEach((col, i) => { x.fillStyle = col; x.font = 'bold 13px sans-serif'; x.fillText('РЕЗ'.charAt(i % 3) || 'Я', 4 + i * 11, 12 + (i % 2) * 11); }); }
    return MURAL[k] = canvasTex(c);
  }
  function buildDetails2() {
    const T = G.T, cloth = ['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a', '#7a9a6a', '#c86aa0'].map(c => sm(c, { roughness: 1 })), dark = sm('#1c1c22', { roughness: 1 }), metal = sm('#4a4e54', { roughness: .6, metalness: .5 });
    const glowM = c => new THREE.MeshBasicMaterial({ color: c }), WALLC = ['#8a8278', '#7a7e86', '#8e7a68', '#6e7a70'];
    const mats = {}, lam = (k, tex) => mats[k] || (mats[k] = new THREE.MeshLambertMaterial({ map: tex, emissive: '#26242c', side: THREE.DoubleSide }));
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!b || rec.det2) return; rec.det2 = true;
      const bb = rec.box3, x0 = bb.min.x - .3, z0 = bb.min.z - .3, w = bb.max.x - bb.min.x + .6, d = bb.max.z - bb.min.z + .6, base = bb.min.y + .1, fl = Math.max(1, b.fl || 1);
      const r = rng(bi * 523 + 71), g = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) }, { len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) }, { len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], base - .1, p[1]); a.rotation.y = sd.yaw; g.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      sides.forEach(sd => {
        if (sd.len > 5 && r() < .4) { const a = mkA(sd, 1.6 + r() * (sd.len - 3.2)), k = Math.floor(r() * 12), m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1), lam('m' + (k % 6), muralTex(k))); ad(a, m, 0, 1.5 + r() * .5, .09); }
        if (fl >= 3 && r() < .3) { const a = mkA(sd, 1 + r() * (sd.len - 2)), f = 1 + Math.floor(r() * (fl - 1)), y = base + MG + (f - 1) * MF + .3, k = [0, 3, 5][Math.floor(r() * 3)];
          const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, 2.4), lam('b' + k, posterTex(k))); ad(a, m, 0, y + 1.2, .5); ad(a, box(.05, .05, .9, metal), 0, y + 2.45, .45); m.rotation.y = r() < .5 ? 0 : 0; m.rotation.x = -.04; const m2 = m.clone(); m2.rotation.y = Math.PI; m2.position.z = .52; a.add(m2); }
        if (fl >= 3 && r() < .28) { const f = 2 + Math.floor(r() * (fl - 2)), a = mkA(sd, 1.2 + r() * (sd.len - 2.4)), y = base + MG + (f - 1) * MF; ad(a, box(1.7, 1.5, .8, sm(WALLC[Math.floor(r() * 4)], { roughness: 1 })), 0, y + .75, .4); ad(a, box(1.8, .1, .9, sm('#bcc0c6', { roughness: 1 })), 0, y + 1.55, .42); ad(a, new THREE.Mesh(new THREE.PlaneGeometry(1.3, .9), glowM(r() < .6 ? '#ffd890' : '#38e8ff')), 0, y + .8, .81); }
      });
      if (g.children.length) { const gm = shadowed(mergeGroup(g), false, false); ownMats(gm, rec); scene.add(gm); rec.det2Grp = gm; n++; }
    });
    // bucato steso tra le case, attraverso i vicoli
    const lg = new THREE.Group(), pts = [], rl = rng(8181), bs = dyn.buildings.filter(q => q.b && q.b.fl >= 2);
    for (let i = 0; i < bs.length; i++) { let links = 0; for (let j = i + 1; j < bs.length && links < 1; j++) {
      const A = bs[i].box3, B = bs[j].box3, ax = (A.min.x + A.max.x) / 2, az = (A.min.z + A.max.z) / 2, bx = (B.min.x + B.max.x) / 2, bz = (B.min.z + B.max.z) / 2, L = Math.hypot(bx - ax, bz - az);
      const gap = Math.max(B.min.x - A.max.x, A.min.x - B.max.x, B.min.z - A.max.z, A.min.z - B.max.z); if (gap < 3 || gap > 9 || L > 34 || rl() < .55) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.VIA && G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.WALK && G.tileAt(Math.floor(mx / TS), Math.floor(mz / TS)) !== T.COB) continue;
      const cl = (P, q) => { const dx = q[0] - (P.min.x + P.max.x) / 2, dz = q[1] - (P.min.z + P.max.z) / 2, hx = (P.max.x - P.min.x) / 2, hz = (P.max.z - P.min.z) / 2, k = Math.min(hx / (Math.abs(dx) || 1e-6), hz / (Math.abs(dz) || 1e-6)); return [(P.min.x + P.max.x) / 2 + dx * k, (P.min.z + P.max.z) / 2 + dz * k]; };
      const p0 = cl(A, [bx, bz]), p1 = cl(B, [ax, az]), y = A.min.y + MG + MF * (1 + Math.floor(rl() * 2)) + .5, Ln = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); if (Ln < 3) continue;
      let prev = [p0[0], y, p0[1]]; for (let k = 1; k <= 8; k++) { const t = k / 8, sag = Math.sin(t * Math.PI) * Ln * .05, cur = [p0[0] + (p1[0] - p0[0]) * t, y - sag, p0[1] + (p1[1] - p0[1]) * t]; pts.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2]); prev = cur; }
      for (let t = .15; t < .9; t += .12 + rl() * .08) { const sag = Math.sin(t * Math.PI) * Ln * .05, c = box(.32, .5 + rl() * .3, .03, cloth[Math.floor(rl() * cloth.length)]); c.position.set(p0[0] + (p1[0] - p0[0]) * t, y - sag - .28, p0[1] + (p1[1] - p0[1]) * t); c.rotation.y = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]) + Math.PI / 2; lg.add(c); }
      links++; } }
    if (pts.length) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH)); const ln = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#2a2a30' })); ln.frustumCulled = false; scene.add(ln); }
    scene.add(shadowed(mergeGroup(lg), false, false));
    // arredo urbano contro i muri: bidoni, sacchi, bancali, panchine, distributori, edicole
    const rs = rng(6006), kit = new THREE.Group(), binM = sm('#2e4a3a', { roughness: .8 }), bagM = sm('#16161a', { roughness: .9 }), snow = NEVE ? sm('#c4c8ce', { roughness: 1 }) : NOSNOW, palM = sm('#8a6a44', { roughness: 1 }), benchM = sm('#5a4636', { roughness: 1 });
    let cnt = 0;
    for (let ty = 28; ty < 104 && cnt < 260; ty++) for (let tx = 166; tx < 242 && cnt < 260; tx++) {
      if (G.tileAt(tx, ty) !== T.WALK) continue; let wx = 0, wz = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (G.tileAt(tx + dx, ty + dy) === T.BLD) { wx = dx; wz = dy; }
      if (!wx && !wz) continue; const q = rs(), X = tx * TS + 1 + wx * .6, Z = ty * TS + 1 + wz * .6, Y = groundH(X, Z), yaw = Math.atan2(-wx, -wz);
      const put = (o, x, y, z) => { o.position.set(X + x, Y + y, Z + z); kit.add(o); return o; };
      if (q < .1) { cnt++; put(cyl(.3, .27, .85, 9, binM), 0, .42, 0); put(cyl(.32, .32, .08, 9, snow), 0, .88, 0); if (rs() < .6) { put(new THREE.Mesh(new THREE.SphereGeometry(.28, 6, 5), bagM), wz ? .6 : 0, .25, wx ? .6 : 0); put(new THREE.Mesh(new THREE.SphereGeometry(.22, 6, 5), bagM), wz ? .9 : .3, .2, wx ? .9 : .3); } }
      else if (q < .15) { cnt++; for (let k = 0; k < 3; k++) put(box(1, .14, 1.2, palM), 0, .07 + k * .14, 0).rotation.y = yaw + (k - 1) * .08; put(box(.7, .5, .6, sm('#b88a5a', { roughness: 1 })), 0, .64, 0).rotation.y = yaw; }
      else if (q < .19) { cnt++; const bn = new THREE.Group(); bn.position.set(X, Y, Z); bn.rotation.y = yaw; kit.add(bn); const add2 = (o, x, y, z) => { o.position.set(x, y, z); bn.add(o); }; add2(box(1.6, .08, .45, benchM), 0, .5, .35); add2(box(1.6, .5, .06, benchM), 0, .78, .12); add2(box(.08, .5, .4, dark), -.7, .25, .35); add2(box(.08, .5, .4, dark), .7, .25, .35); }
      else if (q < .215) { cnt++; const col = ['#ff3fa4', '#38e8ff', '#ffb050', '#ffb050'][Math.floor(rs() * 4)], vm = new THREE.Group(); vm.position.set(X, Y, Z); vm.rotation.y = yaw; kit.add(vm); const b1 = box(.8, 1.9, .65, sm('#2a2c34', { roughness: .6, metalness: .4 })); b1.position.set(0, .95, .35); vm.add(b1); const fr = new THREE.Mesh(new THREE.PlaneGeometry(.6, 1.2), glowM(col)); fr.position.set(0, 1.2, .69); vm.add(fr); }
      else if (q < .225) { cnt++; const kk = new THREE.Group(); kk.position.set(X, Y, Z); kk.rotation.y = yaw; kit.add(kk); const a2 = (o, x, y, z) => { o.position.set(x, y, z); kk.add(o); return o; }; a2(box(1.8, 2.2, 1.2, sm('#4a5a4a', { roughness: .8 })), 0, 1.1, .8); a2(box(2.1, .1, 1.6, sm('#a02a24', { roughness: 1 })), 0, 2.3, .9); a2(new THREE.Mesh(new THREE.PlaneGeometry(1.4, .8), new THREE.MeshBasicMaterial({ map: posterTex(Math.floor(rs() * 16)) })), 0, 1.4, 1.42); }
    }
    scene.add(shadowed(mergeGroup(kit), true, false));
    return n;
  }
  // ================= [inverno] TETTI VISSUTI =================
  // I tetti piatti sono il posto dove la gente vive di più: condizionatori, parabole, antenne con la spia, tende cerate,
  // casse, abbaino d'accesso con la porta, bucato, un'insegna al neon rimasta mezza spenta. Tutto fa parte dell'edificio
  // (sfuma con lui quando copre il giocatore).
  function buildRoofs() {
    const rr = rng(9091);
    const snowM = NEVE ? sm('#c4c8ce', { roughness: 1 }) : NOSNOW, metal = sm('#5a5e66', { roughness: .6, metalness: .4 }), dark = sm('#1c1c22', { roughness: 1 }),
      wood = sm('#6a5238', { roughness: 1 }), rust = sm('#7a4a34', { roughness: 1 });
    const tarps = ['#3e6272', '#7a3c3c', '#4c6a4c', '#8a7438', '#5a4a6a'].map(c => sm(c, { roughness: 1 }));
    const neon = ['#b84a3c', '#e8d8bc', '#ffb050'].map(c => new THREE.MeshBasicMaterial({ color: c }));   // [luci3] niente rosa/ciano
    const cloth = ['#d8d0b8', '#b04a4a', '#4a6aa0', '#caa83a'].map(c => sm(c, { roughness: 1 }));
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b; if (!rec.flat || !b || rec.roofDone) return;
      const bb = rec.box3, top = bb.max.y - 2.5, x0 = bb.min.x, z0 = bb.min.z, w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z;
      if (w < 3.6 || d < 3.6) return;
      const r = rng(bi * 131 + 7), g = new THREE.Group(), put = (o, x, y, z, ry) => { o.position.set(x, top + y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      const px = () => x0 + 1 + r() * (w - 2), pz = () => z0 + 1 + r() * (d - 2);
      const slots = Math.min(13, 3 + Math.floor(w * d / 13));
      let access = false;
      for (let k = 0; k < slots; k++) {
        const t = r(), x = px(), z = pz();
        if (t < .17) { // condizionatore
          put(box(.9, .6, .7, metal), x, .3, z, r() * 3); const f = cyl(.22, .22, .04, 10, dark); put(f, x, .62, z);
          const sn = box(.95, .1, .75, snowM); put(sn, x, .64, z, 0).position.y = top + .66 - top + 0;
        } else if (t < .29) { // parabola su un palo
          put(cyl(.04, .04, 1.1, 5, metal), x, .55, z); const dish = cyl(.5, .06, .18, 12, sm('#c8ccd0', { roughness: .5 })); put(dish, x, 1.2, z).rotation.set(.9, r() * 6, 0);
        } else if (t < .4) { // antenna con la spia
          put(cyl(.03, .035, 3.4, 5, metal), x, 1.7, z); const ry0 = r() * 3; for (let q = 0; q < 5; q++) put(box(1.3 - q * .22, .035, .035, metal), x, 1.4 + q * .45, z, ry0);
          put(new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshBasicMaterial({ color: '#ff3030' })), x, 3.45, z);
        } else if (t < .55) { // telo cerato sopra qualcosa
          const tw = 1.6 + r() * 1.4, td = 1.2 + r() * 1.2; put(box(tw, .35, td, tarps[Math.floor(r() * tarps.length)]), x, .18, z, r() * 3);
          put(box(tw * .8, .08, td * .8, snowM), x, .4, z, 0).rotation.y = g.children[g.children.length - 2].rotation.y;
        } else if (t < .68) { // casse impilate
          put(box(.8, .6, .8, wood), x, .3, z, r() * 1.5); if (r() < .6) put(box(.6, .5, .6, wood), x + .1, .85, z, r());
        } else if (t < .78) { // bidone arrugginito + tubo
          put(cyl(.38, .38, .9, 10, rust), x, .45, z); put(cyl(.05, .05, 1.4, 6, dark), x + .5, .7, z);
        } else if (t < .9) { // filo del bucato
          const L = 2.4 + r() * 1.4, ry = r() < .5 ? 0 : Math.PI / 2;
          const a = new THREE.Group(); a.position.set(x, top, z); a.rotation.y = ry; g.add(a);
          [-L / 2, L / 2].forEach(o => { const p = cyl(.025, .025, 1.7, 5, metal); p.position.set(o, .85, 0); a.add(p); });
          const ln = box(L, .015, .015, dark); ln.position.set(0, 1.6, 0); a.add(ln);
          for (let q = -L / 2 + .3; q < L / 2 - .2; q += .5) { const c = box(.32, .5 + r() * .25, .03, cloth[Math.floor(r() * cloth.length)]); c.position.set(q, 1.33, 0); a.add(c); }
        } else { // mucchietto di neve contro il parapetto
          const s = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), snowM); s.scale.set(1 + r(), .3 + r() * .2, .8 + r() * .6); put(s, x, 0, z, r() * 3);
        }
      }
      // abbaino d'accesso: una scala interna, la porta guarda la camera
      if (w >= 5 && d >= 5 && r() < .75) {
        const hx = x0 + w * (.25 + r() * .5), hz = z0 + d * (.25 + r() * .5); put(box(1.7, 2.1, 1.9, sm('#8a8680', { roughness: 1 })), hx, 1.05, hz);
        put(box(1.9, .12, 2.1, snowM), hx, 2.14, hz); put(box(.7, 1.5, .06, dark), hx, .75, hz + .97);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(.22, .1, .1), new THREE.MeshBasicMaterial({ color: '#ffd890' })); put(lamp, hx, 1.75, hz + 1); rec.roofHatch = [hx, hz + 1.6];
      }
      // insegna al neon sul parapetto: spesso con una lettera spenta
      if (b.use && r() < .4) {
        const sx = x0 + w * (.2 + r() * .6), sz = z0 + d - .5, col = neon[Math.floor(r() * 3)], L = 2.4 + r() * 1.6;
        put(box(L, .7, .08, dark), sx, 1.4, sz); for (let q = 0; q < 4; q++) { if (r() < .22) continue; put(box(L / 4 - .15, .38, .05, col), sx - L / 2 + L / 8 + q * L / 4, 1.4, sz + .06); }
        [-L / 2 + .1, L / 2 - .1].forEach(o => put(box(.06, 1.1, .06, metal), sx + o, .55, sz));
      }
      if (!g.children.length) return;
      const gm = shadowed(mergeGroup(g)); ownMats(gm, rec); scene.add(gm); rec.roofDone = true; rec.roofGrp = gm; n++;
    });
    return n;
  }
  // ================= [inverno] CITTÀ: ogni edificio ha una personalità =================
  // Volumi sul tetto (torrette con finestre accese, rialzi, baracche), balconi a sbalzo con condizionatori e piante,
  // insegne verticali fitte al neon, schermi pubblicitari e del regime, parabole e antenne. Colori forti, non pastello.
  const CITY = {};
  const CGLY = ['電', '脳', '夜', '薬', '酒', '食', '銀', '館', 'РАБ', 'БАР', 'МИР', 'ЧАЙ', '약', '국', '24', 'HOTEL', 'OK', 'ЛОМ', '診', '愛'];
  const CCOL = ['#d4d0c6', '#f0a048'];
  function cityWin(pane) {
    const key = 'w' + pane; if (CITY[key]) return CITY[key];
    const c = mk(64, 24), x = c.getContext('2d'), e = mk(64, 24), ex = e.getContext('2d'), n = 4;
    x.fillStyle = '#1c2026'; x.fillRect(0, 0, 64, 24); ex.fillStyle = '#000'; ex.fillRect(0, 0, 64, 24);
    for (let k = 0; k < n; k++) { const px = 2 + k * 15.5, on = (k * 7 + pane.length) % 4 !== 0; x.fillStyle = on ? pane : '#2a3640'; x.fillRect(px, 4, 12, 16); if (on) { ex.fillStyle = pane; ex.fillRect(px, 4, 12, 16); ex.fillStyle = '#000'; ex.fillRect(px + 5, 4, 1, 16); } }
    return CITY[key] = std({ map: canvasTex(c), emissiveMap: canvasTex(e), emissive: '#ffffff', emissiveIntensity: 1, roughness: .85 });
  }
  function bladeMat(col, seed) {
    const key = 'b' + col + seed; if (CITY[key]) return CITY[key];
    const W = 32, H = 128, c = mk(W, H), x = c.getContext('2d'), h = n => vegHash(seed, n, 31);
    x.fillStyle = '#0a0b10'; x.fillRect(4, 0, 24, H); x.fillStyle = col; x.fillRect(4, 0, 2, H); x.fillRect(26, 0, 2, H);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = col;
    for (let k = 0; k < 5; k++) { const gl = CGLY[Math.floor(h(k) * CGLY.length)]; x.globalAlpha = h(k + 9) < .15 ? .25 : 1; x.font = 'bold ' + (gl.length > 2 ? 11 : 19) + 'px sans-serif'; x.fillText(gl, W / 2, 13 + k * 25); }
    x.globalAlpha = 1; const t = canvasTex(c); t.magFilter = THREE.NearestFilter;
    return CITY[key] = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false });
  }
  function adMat(k) {
    const key = 'a' + k; if (CITY[key]) return CITY[key];
    const c = mk(64, 36), x = c.getContext('2d'), col = CCOL[k % CCOL.length], col2 = CCOL[(k + 2) % CCOL.length];
    x.fillStyle = '#060a10'; x.fillRect(0, 0, 64, 36); x.fillStyle = col; x.fillRect(0, 0, 64, 3); x.fillRect(0, 33, 64, 3);
    x.fillStyle = col2; x.beginPath(); x.arc(20, 18, 10 + k % 3, 0, 7); x.fill(); x.fillStyle = '#060a10'; x.beginPath(); x.arc(24, 16, 8 + k % 3, 0, 7); x.fill();
    x.fillStyle = col; for (let q = 0; q < 4; q++) x.fillRect(36, 8 + q * 6, 18 - q * 3 + (k % 2) * 4, 3);
    for (let q = 0; q < 36; q += 3) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, q, 64, 1); }
    const t = canvasTex(c); return CITY[key] = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false });
  }
  function buildCity() {
    const T = G.T, WALLS = ['#3f6f78', '#8a5a44', '#6a7078', '#a89a64', '#4a5a52', '#7a4a58', '#58606a', '#a06a3c'];
    const dishG = new THREE.SphereGeometry(.55, 10, 4, 0, Math.PI * 2, 0, Math.PI * .4), dishM = sm('#c0c4c8', { roughness: .5, metalness: .3, side: THREE.DoubleSide });
    const iron = sm('#23262a', { roughness: .8, metalness: .3 }), conc = sm('#6c7074', { roughness: 1 }), tin = sm('#58605c', { roughness: .65, metalness: .45 }), acM = sm('#8a8e94', { roughness: .6 }), plant = sm('#2f5a34', { roughness: 1 });
    const PANE = ['#ffb050', '#ffc070', '#ffb050', '#8fe0d4'];
    let n = 0;
    dyn.buildings.forEach((rec, bi) => {
      const b = rec.b, g0 = rec.geo; if (!b || !g0 || rec.cityDone) return;
      const w = g0.w, d = g0.d, x0 = g0.x0, z0 = g0.z0, base = g0.y0, fl = Math.max(1, b.fl || 1), top = rec.box3.max.y - 2.5;
      if (w < 3.6 || d < 3.6) return;
      const r = rng(bi * 211 + 5), g = new THREE.Group(), gs = new THREE.Group();
      const open = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.VIA || v === T.WALK || v === T.PIAZZA || v === T.COB || v === T.QUAY; };
      const sides = [
        { n: 'S', len: w, at: u => [x0 + u, z0 + d], yaw: 0, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 + d + 1) / TS)) },
        { n: 'N', len: w, at: u => [x0 + w - u, z0], yaw: Math.PI, ok: open(Math.floor((x0 + w / 2) / TS), Math.floor((z0 - 1) / TS)) },
        { n: 'E', len: d, at: u => [x0 + w, z0 + d - u], yaw: Math.PI / 2, ok: open(Math.floor((x0 + w + 1) / TS), Math.floor((z0 + d / 2) / TS)) },
        { n: 'W', len: d, at: u => [x0, z0 + u], yaw: -Math.PI / 2, ok: open(Math.floor((x0 - 1) / TS), Math.floor((z0 + d / 2) / TS)) },
      ].filter(s2 => s2.ok);
      const mkA = (grp, sd, u) => { const a = new THREE.Group(), p = sd.at(u); a.position.set(p[0], 0, p[1]); a.rotation.y = sd.yaw; grp.add(a); return a; };
      const ad = (a, o, x, y, z) => { o.position.set(x, y, z); a.add(o); return o; };
      const put = (o, x, y, z, ry) => { o.position.set(x, y, z); if (ry) o.rotation.y = ry; g.add(o); return o; };
      // ---- volumi sul tetto ----
      const q = r(), wallC = pick(r, WALLS), wallM = sm(wallC, { roughness: .95 });
      if (rec.flat && fl >= 2 && w >= 6 && d >= 6) {
        const pw = Math.max(2.6, w * (.38 + r() * .2)), pd = Math.max(2.6, d * (.38 + r() * .2)), ox = (r() - .5) * (w - pw - .6), oz = (r() - .5) * (d - pd - .6), cx = x0 + w / 2 + ox, cz = z0 + d / 2 + oz;
        if (q < .34) { // torretta di avvistamento con la cintura di finestre accese e il tetto a sbalzo
          const H = 2.5 + r() * 1.2, wm = cityWin(pick(r, PANE));
          put(box(pw, H, pd, wallM), cx, H / 2, cz).position.y += top; g.children[g.children.length - 1].position.y = top + H / 2;
          const ring = [[0, pd / 2 + .02, 0, pw * .92], [0, -pd / 2 - .02, Math.PI, pw * .92], [pw / 2 + .02, 0, Math.PI / 2, pd * .92], [-pw / 2 - .02, 0, -Math.PI / 2, pd * .92]];
          ring.forEach(([dx, dz, ry, len]) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, H * .5), wm); pl.position.set(cx + dx, top + H * .58, cz + dz); pl.rotation.y = ry; g.add(pl); });
          put(box(pw + 1, .22, pd + 1, iron), cx, top + H + .12, cz);
          const k = Math.floor(r() * 3); for (let a = 0; a < 2 + k; a++) { const ax = cx + (r() - .5) * pw * .8, az = cz + (r() - .5) * pd * .8, hh = 1.6 + r() * 2.4; put(cyl(.03, .035, hh, 5, iron), ax, top + H + .2 + hh / 2, az); for (let c2 = 0; c2 < 4; c2++) put(box(1.2 - c2 * .22, .03, .03, iron), ax, top + H + .5 + c2 * .42, az, r() * 3); }
          const dsh = new THREE.Mesh(dishG, dishM); dsh.scale.setScalar(.8 + r() * .8); dsh.rotation.set(.9, r() * 6, 0); put(dsh, cx + (r() - .5) * pw, top + H + .6, cz + (r() - .5) * pd);
        } else if (q < .56) { // rialzo con un'altra tinta e il tetto in lamiera
          const H = 2.3 + r() * 1.4;
          put(box(pw, H, pd, wallM), cx, top + H / 2, cz); put(box(pw + .3, .14, pd + .3, tin), cx, top + H + .07, cz);
          const dm = box(.9, 1.9, .12, iron); put(dm, cx, top + 1, cz + pd / 2 + .06);
          [-1, 1].forEach(s2 => put(box(.7, .8, .06, cityWin(pick(r, PANE)).clone()), cx + s2 * pw * .28, top + H * .6, cz + pd / 2 + .04));
          for (let k = 0; k < 2; k++) put(box(.8, .55, .6, acM), cx + (r() - .5) * pw * .7, top + H + .36, cz + (r() - .5) * pd * .7, r() * 3);
        } else if (q < .7) { // baracche di lamiera addossate: città vissuta sui tetti
          for (let k = 0; k < 3; k++) { const sw = 1.6 + r() * 1.6, sd2 = 1.4 + r() * 1.2, sh = 1.7 + r() * .9, sx = x0 + 1.5 + r() * (w - 3), sz = z0 + 1.5 + r() * (d - 3); put(box(sw, sh, sd2, k % 2 ? tin : sm(pick(r, ['#5a6a5c', '#7a5a44', '#4a5a6a']), { roughness: .9 })), sx, top + sh / 2, sz, r() * 1.5); put(box(sw + .2, .08, sd2 + .2, iron), sx, top + sh + .04, sz, 0).rotation.y = g.children[g.children.length - 2].rotation.y; }
        }
      }
      // parabole e antenne su quasi tutto
      for (let k = 0, m = rec.flat ? 1 + Math.floor(r() * 3) : 0; k < m; k++) { const ax = x0 + 1 + r() * (w - 2), az = z0 + 1 + r() * (d - 2); if (r() < .5) { put(cyl(.04, .04, 1.1, 5, iron), ax, top + .55, az); const ds = new THREE.Mesh(dishG, dishM); ds.scale.setScalar(.6 + r() * .7); ds.rotation.set(.9, r() * 6, 0); put(ds, ax, top + 1.2, az); } else { const hh = 2 + r() * 3; put(cyl(.03, .035, hh, 5, iron), ax, top + hh / 2, az); const ry0 = r() * 3; for (let c2 = 0; c2 < 5; c2++) put(box(1.3 - c2 * .22, .03, .03, iron), ax, top + hh * .45 + c2 * hh * .12, az, ry0); } }
      // ---- balconi a sbalzo con condizionatori e piante sul lato di strada ----
      if (sides.length && fl >= 3 && r() < .4) {
        const sd = pick(r, sides), nb = 1 + Math.floor(r() * 3);
        for (let k = 0; k < nb; k++) {
          const bw = 1.8 + r() * 1.6, u = .8 + r() * Math.max(.1, sd.len - bw - 1.6), a = mkA(g, sd, u + bw / 2), f = 1 + Math.floor(r() * (fl - 1)), y = base + MG + (f - 1) * MF + .03;
          ad(a, box(bw, .12, .95, conc), 0, y, .5); ad(a, box(bw, .05, .05, iron), 0, y + .95, .97); [-1, 1].forEach(s2 => ad(a, box(.05, .95, .05, iron), s2 * bw / 2, y + .48, .97)); for (let c2 = 0; c2 <= 6; c2++) ad(a, box(.03, .9, .03, iron), -bw / 2 + c2 * bw / 6, y + .48, .97);
          if (r() < .6) ad(a, box(.8, .55, .5, acM), -bw / 2 + .6, y + .4, .55);
          for (let c2 = 0, np = Math.floor(r() * 3); c2 < np; c2++) ad(a, new THREE.Mesh(new THREE.IcosahedronGeometry(.26, 0), plant), bw / 2 - .4 - c2 * .45, y + .3, .7);
          if (r() < .4) { const cn = box(bw + .3, .06, 1.2, tin); ad(a, cn, 0, y + 1.9, .6).rotation.x = .2; }
        }
      }
      // ---- insegne verticali fitte, schermi ----
      if (sides.length) {
        const nbl = (b.shop || b.sign) && r() < .8 ? 1 : 0;
        for (let k = 0; k < nbl; k++) {
          const sd = pick(r, sides), u = r() < .5 ? .5 + r() * 1.2 : sd.len - .5 - r() * 1.2, a = mkA(gs, sd, Math.max(.4, Math.min(sd.len - .4, u))), col = pick(r, CCOL), H = 2.2 + r() * 3.4, y = Math.max(base + 2.7, top - 1.2 - r() * 2) - 0;
          const mt = bladeMat(col, bi * 5 + k), bl = new THREE.Mesh(new THREE.PlaneGeometry(.75, H), mt); bl.rotation.y = Math.PI / 2; ad(a, bl, 0, y - H / 2 + 1.4, .62);
          ad(a, box(.05, .05, .65, iron), 0, y + 1.3, .33); ad(a, box(.05, .05, .65, iron), 0, y + 1.3 - H + .2, .33);
          const gl = glow(a.position.x + Math.sin(sd.yaw) * .62, y - H / 2 + 1.4, a.position.z + Math.cos(sd.yaw) * .62, col, 3.2); gl.material.opacity = .4;
          dyn.signs.push({ m: mt, gl, flick: r() < .3 });
          if (k === 0 && r() < .5) addLight(a.position.x + Math.sin(sd.yaw) * 1.6, y - H / 2 + 1.4, a.position.z + Math.cos(sd.yaw) * 1.6, col, 2.4, 9, .08);
        }
        if (r() < .18) { const sd = pick(r, sides), u = 1.2 + r() * Math.max(.1, sd.len - 3.6), a = mkA(gs, sd, u + 1.6), reg = r() < .3, mt = reg ? eyeMat('screen') : adMat(bi), tall = r() < .5, sw = tall ? 1.8 : 3.2, sh = tall ? 3.2 : 1.8;
          const sc = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mt); ad(a, sc, 0, Math.max(base + 3, top - sh / 2 - 1.2), .1); ad(a, box(sw + .15, sh + .15, .08, iron), 0, sc.position.y, .04);
          const gl = glow(a.position.x + Math.sin(sd.yaw) * .4, sc.position.y, a.position.z + Math.cos(sd.yaw) * .4, reg ? '#7ff0e0' : pick(r, CCOL), 5.5); gl.material.opacity = .35; dyn.signs.push({ m: mt, gl, flick: r() < .3 }); }
      }
      if (g.children.length) { const gm = shadowed(mergeGroup(g), true, true); ownMats(gm, rec); scene.add(gm); rec.cityGrp = gm; n++; }
      if (gs.children.length) scene.add(gs);
      rec.cityDone = true;
    });
    return n;
  }
  // ================= [inverno] SOGLIE: tettoie, fermate, vicoli e luoghi di mezzo =================
  // Tra la casa e la strada c'è sempre qualcosa: lamiera e teli, portici, panche, fuochi in barile, fermate dell'autobus, un cavo con una lampadina in un vicolo.
  // Le luci qui sono piccole e basse: illuminano sotto le tettoie e nei vicoli, non la strada.
  function buildThresholds() {
    const T = G.T, r = rng(7717), g = new THREE.Group(), V3 = new THREE.Vector3();
    const iron = sm('#23262a', { roughness: .8, metalness: .3 }), tin = sm('#4e5652', { roughness: .65, metalness: .45 }), rustM = sm('#6a4a38', { roughness: 1 }), conc = sm('#6c7074', { roughness: 1 }), wood = sm('#5a4632', { roughness: 1 }), woodD = sm('#3a2e24', { roughness: 1 });
    const glassM = std({ color: '#7fc8d0', roughness: .2, transparent: true, opacity: .28, side: THREE.DoubleSide });
    const TARPS = ['#3a5a64', '#5a3a40', '#3e4a3a', '#4a4a58', '#5a5036'].map(c => sm(c, { roughness: 1, side: THREE.DoubleSide }));
    const litM = c => { const m = std({ color: '#161616', emissive: c, emissiveIntensity: .8, roughness: 1 }); (dyn.backdropMats = dyn.backdropMats || []).push(m); return m; };
    const L = { amber: litM('#ffb050'), cyan: litM('#38e8ff'), mag: litM('#ff3fa4'), cold: litM('#bfeee6') };
    const bulb = sb('#ffc070');
    const A = (px, pz, yaw) => { const gg = new THREE.Group(); gg.position.set(px, groundH(px, pz), pz); gg.rotation.y = yaw; g.add(gg); gg.updateMatrixWorld(true); return gg; };
    const bx = (gg, w, h, dd, mat, x, y, z, rx, ry, rz) => { const m = box(w, h, dd, mat); m.position.set(x, y, z); if (rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0); gg.add(m); return m; };
    const cy = (gg, rt, rb, h, mat, x, y, z, seg) => { const m = cyl(rt, rb, h, seg || 7, mat); m.position.set(x, y, z); gg.add(m); return m; };
    const lamp = (gg, x, y, z, col, i, dist, sz) => { const v = V3.set(x, y, z).applyMatrix4(gg.matrixWorld); addLight(v.x, v.y, v.z, col, i, dist, .05); const gl = glow(v.x, v.y, v.z, col, sz || 2.4); gl.material.opacity = .3; };
    const hang = (gg, x, y, z) => { cy(gg, .008, .008, .5, iron, x, y + .25, z, 3); const b = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), bulb); b.position.set(x, y, z); gg.add(b); };
    const stool = (gg, x, z) => { cy(gg, .16, .16, .04, wood, x, .45, z); cy(gg, .03, .03, .45, iron, x, .22, z, 4); };
    const table = (gg, x, z) => { bx(gg, .9, .05, .6, woodD, x, .78, z); [[-.4, -.25], [.4, -.25], [-.4, .25], [.4, .25]].forEach(([a, b]) => bx(gg, .04, .78, .04, iron, x + a, .39, z + b)); };
    const crates = (gg, x, z) => { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) bx(gg, .55, .4, .55, wood, x + (r() - .5) * .5, .2 + k * .4, z + (r() - .5) * .3, 0, r() * 1.2, 0); };
    const barrel = (gg, x, z, fire) => { cy(gg, .3, .3, .85, rustM, x, .43, z, 8); if (fire) { bx(gg, .4, .2, .4, L.amber, x, .92, z); lamp(gg, x, 1.1, z, '#ffa040', 2.2, 7, 2.6); } };
    const col = () => TARPS[Math.floor(r() * TARPS.length)];
    // ---- tettoie davanti alle porte ----
    const WLK = v => v === T.WALK || v === T.COB || v === T.PIAZZA || v === T.QUAY;
    let nc = 0;
    (G.BUILDINGS || []).forEach((b, bi) => {
      if (!b.door || b.military || b.farm || b.wood || b.church || b.lighthouse || b.kiosk) return;
      const dd = M.world && M.world.districtAt ? M.world.districtAt(b.x * TS) : 'centro'; if (dd === 'prateria' || dd === 'foresta' || dd === 'base') return;
      const [dx, dy] = b.door; if (!WLK(G.tileAt(dx, dy))) return;
      if (!(((b.shop || b.sign) && r() < .9) || r() < .5)) return;
      const f = faceOf(b), x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, cx = (dx + .5) * TS, cz = (dy + .5) * TS;
      const P = f === 'S' ? [cx, z0 + d, 0] : f === 'N' ? [cx, z0, Math.PI] : f === 'E' ? [x0 + w, cz, Math.PI / 2] : [x0, cz, -Math.PI / 2];
      const gg = A(P[0], P[1], P[2]), k = Math.floor(r() * 4), W = k === 1 ? 6 : 4.4, D = 2.0 + (k === 1 ? .2 : 0);
      if (k === 0) { // lamiera
        [-1, 1].forEach(s => bx(gg, .08, 2.9, .08, iron, s * W / 2, 1.45, D)); bx(gg, W + .5, .07, D + .6, tin, 0, 3.05, D / 2, .1);
        bx(gg, W - .6, .04, .12, L.amber, 0, 2.93, D - .25); hang(gg, -W * .22, 2.8, D * .6); crates(gg, W * .3, D * .7); barrel(gg, -W / 2 + .5, D * .75, r() < .35); lamp(gg, 0, 2.7, D * .55, '#ffb050', 2.4, 7);
      } else if (k === 1) { // portico a colonne
        for (let c = 0; c <= 3; c++) cy(gg, .17, .2, 3.2, conc, -W / 2 + c * W / 3, 1.6, D, 8); bx(gg, W + .4, .3, .45, conc, 0, 3.35, D); bx(gg, W + .4, .1, D, conc, 0, 3.25, D / 2);
        for (let c = 0; c < 3; c++) { bx(gg, W / 3 - .6, .04, .1, c === 1 ? L.cold : L.amber, -W / 3 + c * W / 3, 3.18, D * .5); } bx(gg, 2.2, .08, .45, wood, -W * .22, .5, D * .8); lamp(gg, 0, 3.0, D * .5, '#ffb050', 2.6, 8);
        if (r() < .5) bx(gg, .05, 1.1, .05, r() < .5 ? L.cyan : L.mag, W / 2 + .1, 2.2, D);
      } else if (k === 2) { // telo teso
        [-1, 1].forEach(s => { const p = bx(gg, .06, 2.7, .06, iron, s * W / 2, 1.35, D); p.rotation.x = -.04; }); bx(gg, W, .04, D + .5, col(), 0, 2.85, D / 2, .3);
        hang(gg, 0, 2.3, D * .55); table(gg, W * .22, D * .6); stool(gg, W * .22 - .5, D * .6); stool(gg, W * .22 + .5, D * .6); lamp(gg, 0, 2.2, D * .55, '#ffb050', 2.2, 6.5);
      } else { // gazebo di teli e pallet
        [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([sx, sz]) => bx(gg, .07, 2.6, .07, iron, sx * W / 2, 1.3, .2 + sz * (D - .2)));
        bx(gg, W + .3, .05, D + .2, col(), 0, 2.65, D / 2, 0, 0, (r() - .5) * .2); bx(gg, W * .5, .05, .09, r() < .5 ? L.cyan : L.mag, 0, 2.55, D);
        bx(gg, 1.2, .14, .9, wood, -W * .25, .08, D * .7); bx(gg, 1.2, .14, .9, wood, -W * .25, .22, D * .7, 0, .3, 0); crates(gg, W * .25, D * .6); lamp(gg, 0, 2.4, D * .5, '#ffb050', 2, 6.5);
      }
      nc++;
    });
    // ---- fermate dell'autobus ----
    const stops = []; let nb = 0;
    for (let ty = 2; ty < G.GH - 2 && nb < 14; ty += 2) for (let tx = 2; tx < G.GW - 2 && nb < 14; tx += 2) {
      if (G.tileAt(tx, ty) !== T.WALK) continue;
      const dirs = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]], dr = dirs.find(([ax, ay]) => G.tileAt(tx + ax, ty + ay) === T.VIA && G.tileAt(tx - ax, ty - ay) !== T.VIA);
      if (!dr) continue; const px = (tx + .5) * TS, pz = (ty + .5) * TS;
      if (r() > .05 || stops.some(s => Math.hypot(s[0] - px, s[1] - pz) < 55)) continue;
      const gg = A(px - dr[0] * .5, pz - dr[1] * .5, dr[2]); stops.push([px, pz]); nb++;
      bx(gg, 3, 2.1, .04, glassM, 0, 1.15, -.6); [-1, 1].forEach(s => bx(gg, .04, 2.1, 1.1, glassM, s * 1.5, 1.15, -.05)); bx(gg, 3.4, .09, 1.7, iron, 0, 2.3, 0); [-1, 1].forEach(s => bx(gg, .06, 2.3, .06, iron, s * 1.55, 1.15, .75));
      bx(gg, 2.4, .07, .4, wood, 0, .5, -.35); [-1, 1].forEach(s => bx(gg, .05, .5, .35, iron, s * 1.0, .25, -.35)); bx(gg, 2.6, .04, .16, L.cold, 0, 2.23, .1);
      const lb = bx(gg, .14, 1.9, 1.1, iron, 1.95, 1.1, .1), k = (tx * 3 + ty) % 2; [-1, 1].forEach(s => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.7), adMat(k)); pl.rotation.y = s * Math.PI / 2; pl.position.set(1.95 + s * .08, 1.1, .1); gg.add(pl); });
      cy(gg, .04, .04, 3, iron, -2.0, 1.5, .5, 5); const sg = new THREE.Mesh(new THREE.PlaneGeometry(.9, .26), new THREE.MeshBasicMaterial({ map: signTexture(pick(r, ['12', 'Н-7', '44К', '3', 'НОЧЬ']), '#ffb050'), toneMapped: false })); sg.position.set(-2.0, 3.05, .55); gg.add(sg);
      barrel(gg, 2.3, -.4, false); lamp(gg, 0, 2.1, .1, '#8fe0d4', 2.4, 8, 2.2);
    }
    // ---- stazioni: lunga pensilina su una spianata libera ----
    let ns = 0; const free = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.PIAZZA || v === T.COB || v === T.WALK; };
    for (let ty = 3; ty < G.GH - 4 && ns < 2; ty += 2) for (let tx = 3; tx < G.GW - 9 && ns < 2; tx += 2) {
      let ok = true; for (let j = 0; j < 3 && ok; j++) for (let i = 0; i < 7 && ok; i++) if (!free(tx + i, ty + j)) ok = false; if (!ok || r() > .35) continue;
      const px = (tx + 3.5) * TS, pz = (ty + 1.5) * TS, gg = A(px, pz, 0); ns++;
      for (let c = 0; c < 5; c++) { cy(gg, .09, .09, 3.2, iron, -6 + c * 3, 1.6, .6, 6); cy(gg, .09, .09, 3.2, iron, -6 + c * 3, 1.6, -1.6, 6); }
      bx(gg, 13, .12, 3.6, tin, 0, 3.25, -.5, .06); bx(gg, 12, .05, .14, L.cold, 0, 3.15, .6); bx(gg, 12, .05, .14, L.cold, 0, 3.15, -1.6);
      for (let c = 0; c < 4; c++) { bx(gg, 2.2, .07, .45, wood, -4.5 + c * 3, .5, -1.1); }
      bx(gg, 12.6, .03, .3, L.amber, 0, .02, 1.5); bx(gg, 2.6, 2.2, 1.6, iron, 5.2, 1.1, -1.9); bx(gg, 1.8, .9, .05, L.cyan, 5.2, 1.5, -1.07);
      const bd = bx(gg, 3.6, 1.1, .1, iron, -2, 2.5, -2.2); const bp = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .9), eyeMat('screen')); bp.position.set(-2, 2.5, -2.14); gg.add(bp);
      lamp(gg, -3, 3, -.5, '#8fe0d4', 3, 11, 3); lamp(gg, 3, 3, -.5, '#8fe0d4', 3, 11, 3);
    }
    // ---- vicoli: un cavo con una lampadina e un po' di roba ----
    const alleys = []; let na = 0;
    for (let ty = 2; ty < G.GH - 2 && na < 70; ty++) for (let tx = 2; tx < G.GW - 2 && na < 70; tx++) {
      const v = G.tileAt(tx, ty); if (!(v === T.COB || v === T.WALK || v === T.PIAZZA || v === T.DIRT)) continue;
      const B2 = (a, b) => G.tileAt(a, b) === T.BLD, ew = (B2(tx - 1, ty) || B2(tx - 2, ty)) && (B2(tx + 1, ty) || B2(tx + 2, ty)), ns2 = (B2(tx, ty - 1) || B2(tx, ty - 2)) && (B2(tx, ty + 1) || B2(tx, ty + 2));
      if (!ew && !ns2) continue; const px = (tx + .5) * TS, pz = (ty + .5) * TS;
      if (r() > .5 || alleys.some(s => Math.hypot(s[0] - px, s[1] - pz) < 7)) continue;
      alleys.push([px, pz]); na++;
      const gg = A(px, pz, ew ? 0 : Math.PI / 2); bx(gg, 2.1, .02, .02, iron, 0, 3.3, 0); hang(gg, 0, 2.95, 0); lamp(gg, 0, 2.9, 0, r() < .8 ? '#ffb050' : '#38e8ff', 1.7, 6, 2.1);
      if (r() < .6) barrel(gg, .7, .6, r() < .2); if (r() < .5) crates(gg, -.6, -.5); if (r() < .3) bx(gg, .05, 1, .05, r() < .5 ? L.cyan : L.mag, .85, 2.2, .1);
      if (r() < .4) { cy(gg, .06, .06, 2.4, iron, -.85, 1.2, .1, 5); bx(gg, .3, .3, .3, iron, -.85, 2.5, .1); }
    }
    // ---- luoghi comuni: fuoco in barile con panche, distributori, bacheca del regime ----
    let nk = 0;
    for (let ty = 3; ty < G.GH - 3 && nk < 16; ty += 2) for (let tx = 3; tx < G.GW - 3 && nk < 16; tx += 2) {
      if (G.tileAt(tx, ty) !== T.PIAZZA && G.tileAt(tx, ty) !== T.COB) continue;
      let open = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (free(tx + i, ty + j)) open++; if (open < 9 || r() > .02) continue;
      const px = (tx + .5) * TS, pz = (ty + .5) * TS, gg = A(px, pz, r() * 6.28), kk = nk % 3; nk++;
      if (kk === 0) { barrel(gg, 0, 0, true); [0, 2.1, 4.2].forEach(a => bx(gg, 1.4, .1, .35, wood, Math.cos(a) * 1.5, .42, Math.sin(a) * 1.5, 0, -a + 1.57, 0)); }
      else if (kk === 1) { for (let c = 0; c < 3; c++) { bx(gg, .85, 1.9, .7, iron, -1.1 + c * 1.1, .95, 0); bx(gg, .6, .9, .04, [L.cyan, L.mag, L.amber][c], -1.1 + c * 1.1, 1.3, .37); } lamp(gg, 0, 2.2, .8, '#38e8ff', 1.8, 6, 2); }
      else { bx(gg, 2.4, 1.7, .1, iron, 0, 1.3, 0); const bp = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), eyeMat('banner')); bp.position.set(0, 1.3, .06); gg.add(bp); [-1, 1].forEach(s => cy(gg, .04, .04, 2.2, iron, s * 1.1, 1.1, 0, 5)); for (let c = 0; c < 4; c++) cy(gg, .025, .025, 1.1, iron, -1.2 + c * .8, .55, 1.6, 4); bx(gg, 3, .03, .03, L.amber, 0, 1.05, 1.6); }
    }
    const gm = shadowed(mergeGroup(g), true, true); scene.add(gm);
    return nc + nb + ns + na + nk;
  }
  function buildVolumes() {
    const T = G.T, r = rng(4242), I4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color();
    const big = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH));
    // ---- zoccoli e gradini ----
    const plinthM = sm('#4a4642', { roughness: 1 }), stepM = sm('#6a6660', { roughness: 1 });
    const piles = [];
    dyn.buildings.forEach(rec => {
      const b = rec.b, g = rec.geo; if (!b || !g) return;
      const base = g.y0, low = Math.min(groundH(g.x0, g.z0), groundH(g.x0 + g.w, g.z0 + g.d), base);
      const zh = .55 + (base - low);
      const pl = box(g.w + .18, zh, g.d + .18, plinthM); pl.position.set(g.x0 + g.w / 2, low + zh / 2 - .02, g.z0 + g.d / 2); addStatic(pl);
      // gradini davanti alla porta
      if (b.door) {
        const [dx, dy] = b.door, cx = dx * TS + 1, cz = dy * TS + 1, side = dy >= b.y + b.h ? [0, 1] : dy < b.y ? [0, -1] : dx >= b.x + b.w ? [1, 0] : [-1, 0];
        const ex = side[0] ? (side[0] > 0 ? g.x0 + g.w : g.x0) : cx, ez = side[1] ? (side[1] > 0 ? g.z0 + g.d : g.z0) : cz;
        [[.5, .2], [1, .1]].forEach(([dep, hh], k) => { const st = box(side[0] ? dep : 1.7, hh + (base - low), side[1] ? dep : 1.7, stepM); st.position.set(ex + side[0] * dep / 2, low + (hh + base - low) / 2, ez + side[1] * dep / 2); addStatic(st); });
      }
      // neve ammucchiata contro i muri (non contro le porte né sul lato della strada principale tutta spalata)
      const sides = [[g.x0, g.z0 + g.d + .25, g.w, 0], [g.x0, g.z0 - .25, g.w, 0], [g.x0 + g.w + .25, g.z0, g.d, 1], [g.x0 - .25, g.z0, g.d, 1]];
      sides.forEach(([sx, sz, L, vert]) => {
        for (let u = .6; u < L - .4; u += 1.3 + r() * .6) {
          const px = vert ? sx : sx + u, pz = vert ? sz + u : sz, tx = Math.floor(px / TS), tz = Math.floor(pz / TS), v = G.tileAt(tx, tz);
          if (v === T.VIA || v === T.WATER || v === T.BLD || (b.door && tx === b.door[0] && tz === b.door[1])) continue;
          if (r() < .25) continue;
          piles.push([px, groundH(px, pz), pz, 1 + r() * .9, .3 + r() * .35, .55 + r() * .3, vert]);
        }
      });
    });
    if (NEVE && piles.length) {   // [inverno19]
      const geo = new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); geo.boundingSphere = big;
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), piles.length);
      piles.forEach(([x, y, z, l, h, d, vert], k) => { E.set(0, vert ? Math.PI / 2 : 0, 0); Q.setFromEuler(E); V.set(x, y - .05, z); S.set(l, h, d); I4.compose(V, Q, S); im.setMatrixAt(k, I4); im.setColorAt(k, C.set(pick(r, ['#b4b8be', '#aaaeb4', '#bcc0c6', '#9ea2a8']))); });
      im.receiveShadow = true; im.castShadow = false; scene.add(im);
    }
    // (i marciapiedi sono ora una superficie liscia: buildSidewalks)
    // ---- coni di luce sotto lampioni e riflettori, aloni colorati a terra (neve bagnata) ----
    const glowT = glowTexture(), coneG = new THREE.ConeGeometry(1, 1, 14, 1, true); coneG.translate(0, -.5, 0);
    LSRC.forEach(L => {
      const gy = groundH(L.x, L.z), hh = L.y - gy;
      if (false) {
        const m = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        m.position.set(L.x, L.y, L.z); m.scale.set(hh * .42, hh, hh * .42); scene.add(m); VX.cones.push(m);
      }
      if (VX.decals.length < 320) {
        const sz = L.always ? Math.min(9, (L.dist || 8) * .7) : Math.min(4.5, (L.dist || 8) * .36), d = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshBasicMaterial({ map: glowT, color: L.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        d.rotation.x = -Math.PI / 2; d.position.set(L.x, gy + .06, L.z); scene.add(d); VX.decals.push({ m: d, always: !!L.always });
      }
    });
    // ---- vapore: dai barili col fuoco e dai tombini del centro ----
    const vents = (typeof WX !== 'undefined' ? WX.fires : []).map(f => [f.g.position.x, f.g.position.y + .6, f.g.position.z, 1]);
    for (let k = 0; k < 600 && vents.length < 70; k++) { const x = 352 + r() * 110, z = 90 + r() * 80, v = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); if (v === T.VIA) vents.push([x, groundH(x, z) + .05, z, .7]); }
    const sMat = new THREE.SpriteMaterial({ map: glowT, color: '#d8dce4', transparent: true, opacity: 0, depthWrite: false });
    vents.forEach(([x, y, z, k]) => { for (let q = 0; q < 5; q++) { const sp = new THREE.Sprite(sMat.clone()); sp.position.set(x, y, z); scene.add(sp); VX.steam.push({ sp, x, y, z, k, ph: r() * 10 + q * 1.3 }); } });
    // ---- nebbia a strati: due veli che scorrono, radi vicino a te, fitti lontano ----
    [3, 7.5].forEach((hy, k) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, col: { value: new THREE.Color('#c0c4ca') }, ctr: { value: new THREE.Vector2() }, amt: { value: .3 }, k: { value: k } },
        vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }',
        fragmentShader: `uniform float time; uniform vec3 col; uniform vec2 ctr; uniform float amt; uniform float k; varying vec3 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
          void main(){ vec2 p = vP.xz*.035 + vec2(time*.012*(1.+k), time*.006);
            float f = n(p)*.6 + n(p*2.3+7.)*.3 + n(p*5.1+3.)*.1;
            float d = distance(vP.xz, ctr);
            float a = smoothstep(.38, .8, f) * smoothstep(18., 70., d) * amt;
            gl_FragColor = vec4(col, a); }`,
        transparent: true, depthWrite: false, fog: false,
      });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 1, 1), mat); pl.rotation.x = -Math.PI / 2; pl.position.y = hy; pl.renderOrder = 5; scene.add(pl); VX.fog.push(pl);
    });
  }
  function tickVolumes(time, night) {
    VEGU.time.value = time;
    VX.cones.forEach(m => { m.material.opacity = night * .045; m.visible = night > .05; });
    VX.decals.forEach(d => { d.m.material.opacity = (d.always ? night * .045 : night * .02); });
    VX.steam.forEach(s => { const t = ((time * .3 + s.ph) % 3) / 3, sz = (.7 + t * 3.0) * s.k; s.sp.position.set(s.x + Math.sin(time + s.ph) * .4 * t + t * t * 1.2, s.y + t * 3.8, s.z + t * .8); s.sp.scale.set(sz, sz, 1); s.sp.material.opacity = (1 - t) * Math.min(1, t * 5) * (.42 + night * .3); });   // [luci3] vapore più denso
    VX.fog.forEach((pl, k) => { const U = pl.material.uniforms; U.time.value = time; U.col.value.copy(scene.fog.color).lerp(new THREE.Color('#d0d4da'), .3 * (1 - night)); U.ctr.value.set(cam.x, cam.y); U.amt.value = .22 + night * .1 - k * .06; pl.position.x = cam.x; pl.position.z = cam.y; });
  }

  function tickWinter(time, night) {
    WX.fires.forEach(f => { const k = 1 + Math.sin(time * 11 + f.ph) * .12 + Math.sin(time * 23 + f.ph * 2) * .06; f.g.scale.set(1, k, 1); f.g.rotation.y = time * .7 + f.ph; });
    WX.beams.forEach(b => { b.piv.rotation.y = Math.sin(time * .35 + b.ph) * 1.1 - Math.PI / 2; b.piv.children[0].material.opacity = .03 + night * .13; });
    WX.blink.forEach(b => { b.m.visible = Math.sin(time * (b.slow ? 2 : 3.2) + b.ph) > 0; });
    (WX.neon || []).forEach(n => { const on = Math.sin(time * 13 + n.ph) > -.6 && Math.sin(time * 1.7 + n.ph) > -.85; n.m.color.copy(n.col).multiplyScalar(on ? 1 : .18); });
    if (WX.radar) WX.radar.rotation.y = time * .8;
    tickVolumes(time, night);
    const H = WX.heli; if (H && H.home) {
      if (night > .35) {
        // gira sopra la Base e il Muro, si spinge sulla periferia est ma non oltre
        const a = time * .12, cx = 560 + Math.sin(time * .05) * 28, cz = 140, rx = 52, rz = 46, x = cx + Math.cos(a) * rx, z = cz + Math.sin(a) * rz;
        H.g.position.set(x, 24 + Math.sin(time * .7) * 1.5, z); H.g.rotation.set(.12, -a, .08);
        H.rot.rotation.y = time * 40; H.sp.intensity = 2.2 * night; const tx = x + Math.sin(time * .9) * 6, tz = z + Math.cos(time * .7) * 6;
        H.tgt.position.set(tx, 0, tz); H.cone.visible = true; H.cone.position.set((x + tx) / 2, 12, (z + tz) / 2); H.cone.lookAt(x, 24, z); H.cone.rotateX(Math.PI / 2); H.cone.material.opacity = .03 + night * .04;
        H.nav.visible = Math.sin(time * 6) > 0;
      } else { H.g.position.set(H.home.x, groundH(H.home.x, H.home.y) + .3, H.home.y); H.g.rotation.set(0, .6, 0); H.rot.rotation.y = .3; H.sp.intensity = 0; H.cone.visible = false; H.nav.visible = false; }
    }
  }

  // ---------------- INIZIALIZZAZIONE ----------------
  const LPOOL = [], SPOOL = [], PPOOL = [];   // [inverno28]
  function init(canvas, st) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color('#0d0b1a');
    scene.fog = new THREE.Fog('#16122a', 85, 140);
    camera = new THREE.PerspectiveCamera(14, 1.6, 1, 400);
    hemi = new THREE.HemisphereLight('#5a64a8', '#1a1226', .55); scene.add(hemi);
    fillAmb = new THREE.AmbientLight('#2a2440', .35); scene.add(fillAmb);
    moon = new THREE.DirectionalLight('#8fa2ff', .5); moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
    const sc = moon.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 160; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -.0015;
    scene.add(moon); scene.add(moon.target);
    dyn.rim = new THREE.DirectionalLight('#b8c8e8', .4); scene.add(dyn.rim); scene.add(dyn.rim.target);
    dyn.fill = new THREE.DirectionalLight('#6f8fb0', .3); scene.add(dyn.fill); scene.add(dyn.fill.target);   // [inverno] riempimento sud: pareti in ombra leggibili   // [inverno] controluce: stacca i volumi dal fondo
    // poche luci vere, spostate ogni fotogramma sulle sorgenti più vicine
    // [inverno28] faretti con ombra (quanti ne regge la scheda video) + punti senza ombra per i fuochi
    { const maxT = (renderer.capabilities && renderer.capabilities.maxTextures) || 16, N = Math.max(4, Math.min(12, maxT - 7));
      const coneG = new THREE.ConeGeometry(1, 1, 18, 1, true); coneG.translate(0, -.5, 0);
      for (let i = 0; i < N; i++) { const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.2, .95, 1.25);   // [inverno29] caduta morbida, bordo sfumato
        l.castShadow = true; l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; l.shadow.mapSize.set(512, 512); l.shadow.bias = -.0012; l.shadow.normalBias = .035; l.shadow.camera.near = .2; l.shadow.camera.far = 14;
        const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); cone.visible = false; cone.renderOrder = 2;
        cone.material.onBeforeCompile = sh => {   // [luci2] cono d'aria: pieno vicino alla lampada, svanisce a terra e ai bordi
          sh.vertexShader = 'varying float vFr; varying float vH;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec3 nV = normalize(normalMatrix * normal); vec4 mvq = modelViewMatrix * vec4(position, 1.); vFr = abs(dot(nV, normalize(-mvq.xyz))); vH = uv.y;');
          sh.fragmentShader = 'varying float vFr; varying float vH;\n' + sh.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n diffuseColor.a *= pow(vFr, 1.6) * (.12 + .88 * vH * vH);'); };
        l.userData.cone = cone; scene.add(l); scene.add(l.target); scene.add(cone); SPOOL.push(l); LPOOL.push(l); }
      for (let i = 0; i < 8; i++) { const l = new THREE.PointLight('#ffa040', 0, 8, 2); scene.add(l); PPOOL.push(l); LPOOL.push(l); }
      window.__luci = { faretti: N, punti: 8, maxTextures: maxT }; }
    dyn.vehicles = {};
    const TT = (n, f) => { const t0 = performance.now(); f(); (window.__rt = window.__rt || {})[n] = Math.round(performance.now() - t0); };
    TT('sky', buildSky); TT('island', buildIsland); TT('water', buildWater); TT('buildings', buildBuildings); TT('props', buildPropsIsland); TT('layout', buildLayout); TT('inverno', buildWinter); TT('facciate', buildFacades); TT('dettagli', buildDetails); TT('propaganda', buildPropaganda); TT('dettagli2', buildDetails2); TT('volumi', buildVolumes); TT('marciapiedi', buildSidewalks); TT('tetti', buildRoofs); TT('citta', buildCity); TT('soglie', buildThresholds); TT('pulizia', clearMurals); TT('particles', buildParticles); TT('fx', buildFx); TT('debris', buildDebris); TT('post', buildPost);
    TT('flush', flushStatic);
    if (window.Models) try { Models.attach({ scene, G, groundH }); } catch (e) { console.warn(e); }
    const mk2 = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 14, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); beam.position.y = 7;
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.2, 16), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: .8, side: THREE.DoubleSide, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05;
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(.4, 0), new THREE.MeshBasicMaterial({ color: '#ffd24a', toneMapped: false })); dia.position.y = 3;
    mk2.add(beam, ring, dia); mk2.visible = false; scene.add(mk2); dyn.markers = { g: mk2, dia };
    const aimR = new THREE.Mesh(new THREE.RingGeometry(.28, .4, 12), new THREE.MeshBasicMaterial({ color: '#ffe0b0', transparent: true, opacity: .6, depthWrite: false, toneMapped: false }));
    aimR.rotation.x = -Math.PI / 2; aimR.position.y = .05; aimR.visible = false; scene.add(aimR); dyn.aim = aimR;
    const mk3 = new THREE.Mesh(new THREE.RingGeometry(.32, .46, 16), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: .9, depthWrite: false, toneMapped: false })); mk3.rotation.x = -Math.PI / 2; mk3.visible = false; scene.add(mk3); dyn.mark = mk3;
    const laser = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ff3a3a', transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); laser.visible = false; scene.add(laser); dyn.laser = laser;
    dyn.headlight = new THREE.SpotLight('#fff2c8', 0, 26, .55, .5, 1.5); scene.add(dyn.headlight); scene.add(dyn.headlight.target);
    cam.x = st.player.x; cam.y = st.player.y; cam.yaw = YAW; cam.dyaw = YAW; cam.drive = 0; cam.h = groundH(st.player.x, st.player.y);
    return { resize };
  }

  // ---------------- DISTRUZIONE ----------------
  // Gli oggetti piccoli sono fusi nella geometria statica: quando vengono colpiti i loro vertici si "spengono"
  // e al loro posto nasce un corpo vivo con una fisica semplice (gravità, rimbalzi, attrito, muri).
  // I muraglioni sfondati diventano macerie; le facciate si crepano, si bucano e prendono i colpi dei proiettili
  // disegnando direttamente sulla loro texture. Il render non cambia mai lo stato del gioco.
  const TAGS = new Map(); let curTag = null, tagN = 0;
  const DZ = { hits: [], props: [], hash: new Map(), bodies: [], debris: null, rubble: [], dirty: new Set(), faces: new Set(), bRec: [], sfx: [], touched: false, lastSt: null, hint: null, time: 0, sfxT: 0 };
  const newTag = () => 'p' + (++tagN);
  let curObj = null;
  function tagPart(b, n) { let t = TAGS.get(curTag); if (!t) { t = { parts: [], objs: [] }; TAGS.set(curTag, t); } t.parts.push({ b, gi: b.geos.length - 1, n, obj: curObj }); }
  function tagObj(tag, o) { let t = TAGS.get(tag); if (!t) { t = { parts: [], objs: [] }; TAGS.set(tag, t); } t.objs.push(o); }
  function hideTag(tag) {
    const t = TAGS.get(tag); if (!t || t.hidden) return; t.hidden = true; DZ.touched = true;
    t.parts.forEach(p => { if (!p.b.mesh) return; const a = p.b.mesh.geometry.attributes.position, s = p.b.offs[p.gi] * 3, e = s + p.n * 3; if (!p.bak) p.bak = a.array.slice(s, e); for (let k = s; k < e; k += 3) { a.array[k] = 0; a.array[k + 1] = -80; a.array[k + 2] = 0; } a.needsUpdate = true; });
  }
  function showTag(tag) {
    const t = TAGS.get(tag); if (!t || !t.hidden) return; t.hidden = false;
    t.parts.forEach(p => { if (!p.bak) return; const a = p.b.mesh.geometry.attributes.position; a.array.set(p.bak, p.b.offs[p.gi] * 3); a.needsUpdate = true; });
  }
  // griglia spaziale a celle di 4 m
  const hkey = (x, z) => (Math.floor(x / 4) + 50) * 1000 + Math.floor(z / 4) + 50;
  function hashPut(rec, x, z) { const k = hkey(x, z); if (rec.hk === k) return; if (rec.hk !== undefined) { const a = DZ.hash.get(rec.hk); if (a) { const i = a.indexOf(rec); if (i >= 0) a.splice(i, 1); } } rec.hk = k; let a = DZ.hash.get(k); if (!a) { a = []; DZ.hash.set(k, a); } a.push(rec); }
  function hashNear(x, z, r, fn) { const x0 = Math.floor((x - r) / 4), x1 = Math.floor((x + r) / 4), z0 = Math.floor((z - r) / 4), z1 = Math.floor((z + r) / 4); for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const a = DZ.hash.get((i + 50) * 1000 + j + 50); if (a) for (let k = a.length - 1; k >= 0; k--) fn(a[k]); } }
  const recPos = rec => rec.state === 1 ? rec.body.g.position : rec.c;

  // registra un oggetto di scena appena mandato alla geometria statica
  function regProp(o, tag, hint) {
    hint = hint || DZ.hint; DZ.hint = null;
    if (hint === 'static') return null;
    const bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    if (!isFinite(sz.x) || sz.y < .08) return null;
    const foot = Math.max(sz.x, sz.z);
    let cls = hint === 'lamp' ? 'topple' : hint === 'plant' ? 'plant' : 'loose';
    if (!hint) { if (foot > 3.4 || sz.y > 8) return null; if (sz.y > 2.3 && foot < 1.9) cls = 'topple'; }
    const mass = clamp(sz.x * sz.y * sz.z * .35, .03, 4);
    const rec = { tag, obj: o, c, c0: c.clone(), he: sz.clone().multiplyScalar(.5), mass, cls, state: 0, base: bb.min.y, hitT: -9, fragile: cls === 'plant' || mass < .45 };
    tagObj(tag, o); DZ.props.push(rec); hashPut(rec, c.x, c.z); return rec;
  }
  // un gruppo del mondo diventa un corpo vivo, con il perno nel centro del suo ingombro
  function liveBody(obj, c, he, mass, rec) {
    let src = obj; if (obj.isMesh) { src = new THREE.Group(); const m = obj.clone(); src.add(m); src.updateMatrixWorld(true); }
    const out = mergeGroup(src), piv = new THREE.Group(); piv.position.copy(c); out.position.sub(c); piv.add(out);
    out.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scene.add(piv);
    const b = { g: piv, v: new THREE.Vector3(), w: new THREE.Vector3(), he: he.clone(), mass, rest: 0, sleep: false, rec, age: 0, hitT: -9 };
    DZ.bodies.push(b); DZ.touched = true;
    if (DZ.bodies.length > 240) { const i = DZ.bodies.findIndex(k => k.sleep); if (i >= 0) killBody(DZ.bodies[i]); }
    return b;
  }
  function killBody(b) { scene.remove(b.g); const i = DZ.bodies.indexOf(b); if (i >= 0) DZ.bodies.splice(i, 1); if (b.rec) { b.rec.state = 2; b.rec.body = null; } }
  function makeLive(rec) {
    if (rec.state !== 0) return rec.body;
    hideTag(rec.tag); rec.state = 1;
    if (rec.light) { rec.light.base = 0; if (rec.glowS) rec.glowS.visible = false; }
    rec.body = liveBody(rec.obj, rec.c, rec.he, rec.mass, rec); return rec.body;
  }
  // colori di un oggetto, pesati sulla grandezza dei pezzi: servono per i frammenti
  function paletteOf(obj) {
    if (obj.userData.pal) return obj.userData.pal;
    const pal = []; obj.traverse(m => { if (!m.isMesh || Array.isArray(m.material) || !m.material.color) return; if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const s = m.geometry.boundingBox.getSize(V3d); const w = Math.max(.01, s.x * s.y + s.y * s.z + s.x * s.z); pal.push([m.material.color.getHexString(), w]); });
    if (!pal.length) pal.push(['8a7a6a', 1]); obj.userData.pal = pal; return pal;
  }
  const V3d = new THREE.Vector3();
  function pickPal(pal) { let t = 0; pal.forEach(p => t += p[1]); let r = Math.random() * t; for (const p of pal) { r -= p[1]; if (r <= 0) return '#' + p[0]; } return '#' + pal[0][0]; }
  // l'oggetto va in pezzi: frammenti del suo colore, e l'oggetto sparisce
  function shatter(rec, vx, vy, vz, power) {
    const pos = recPos(rec).clone(), pal = paletteOf(rec.obj), he = rec.he, n = Math.round(clamp(rec.mass * 40, 7, 26));
    for (let k = 0; k < n; k++) {
      const s = clamp(Math.min(he.x, he.y, he.z) * (.35 + Math.random() * .5), .05, .32);
      chip(pos.x + (Math.random() - .5) * he.x * 1.6, pos.y + (Math.random() - .5) * he.y * 1.6, pos.z + (Math.random() - .5) * he.z * 1.6,
        vx * (.4 + Math.random() * .8) + (Math.random() - .5) * power, vy * (.5 + Math.random() * .7) + Math.random() * power * .5, vz * (.4 + Math.random() * .8) + (Math.random() - .5) * power,
        s * (.7 + Math.random() * .8), s * (.4 + Math.random() * .6), s * (.7 + Math.random() * .8), pickPal(pal));
    }
    if (rec.state === 0) { hideTag(rec.tag); rec.state = 2; if (rec.light) { rec.light.base = 0; if (rec.glowS) rec.glowS.visible = false; } }
    else if (rec.body) killBody(rec.body);
    rec.state = 2; DZ.touched = true;
    sound(rec.cls === 'plant' ? 'foglie' : rec.mass < .12 ? 'vetri' : 'legno', pos.x, pos.z);
  }
  // colpo a un oggetto: velocità e rotazione in m/s e rad/s
  function knock(rec, vx, vy, vz, spin, sp, opts) {
    if (rec.state === 2 || DZ.time - rec.hitT < .2) return; rec.hitT = DZ.time;
    opts = opts || {};
    if (rec.cls === 'plant' && sp > 3) return shatter(rec, vx * .5, vy * .5, vz * .5, 2.5);
    if (rec.fragile && (sp > 3.5 || opts.blast > .3)) return shatter(rec, vx, vy, vz, 3 + sp * .2);
    if (rec.cls === 'loose' && rec.mass < 1.6 && (sp > 11 || opts.blast > .7)) return shatter(rec, vx * .8, vy, vz * .8, 2 + sp * .2); // casse, sedie, cestini: a tutta velocità vanno in pezzi
    if (rec.cls === 'topple' && (opts.car || opts.blast > .25)) return snapPole(rec, vx, vz, sp, opts);
    const was = rec.state;
    const b = makeLive(rec); if (!b) return;
    const f = clamp(1 / Math.sqrt(Math.max(.12, rec.mass)), .45, 1.7);
    b.v.x += vx * f; b.v.y += vy * Math.min(1.2, f); b.v.z += vz * f;
    if (rec.cls === 'topple' && !opts.blast) { const l = Math.hypot(vx, vz) || 1; b.w.x += vz / l * sp * .32; b.w.z -= vx / l * sp * .32; b.v.multiplyScalar(.25); b.v.y = Math.max(b.v.y, 1); }
    else b.w.add(V3d.set((Math.random() - .5), (Math.random() - .5), (Math.random() - .5)).multiplyScalar(spin * f));
    b.sleep = false; b.rest = 0;
    if (rec.fragile && sp > 6) for (let k = 0; k < 4; k++) chip(b.g.position.x, b.g.position.y, b.g.position.z, vx * .6 + (Math.random() - .5) * 3, vy * .6 + Math.random() * 2, vz * .6 + (Math.random() - .5) * 3, .08, .05, .1, pickPal(paletteOf(rec.obj)));
    if (was === 0) {
      // quello che ci stava sopra cade
      hashNear(rec.c.x, rec.c.z, 1.6, o => { if (o !== rec && o.state === 0 && o.base > rec.base + .2 && o.base < rec.c.y + rec.he.y + .15 && Math.abs(o.c.x - rec.c.x) < rec.he.x + o.he.x && Math.abs(o.c.z - rec.c.z) < rec.he.z + o.he.z) { const ob = makeLive(o); if (ob) { ob.v.set(vx * .3, .8, vz * .3); ob.w.set(Math.random() - .5, 0, Math.random() - .5); } } });
      sound(rec.mass > 1 ? 'botto' : rec.mass < .12 ? 'vetri' : 'legno', rec.c.x, rec.c.z);
    }
  }
  // lampioni e pali: si spezzano alla base al primo urto, la lanterna va in frantumi e il palo vola via
  function snapPole(rec, vx, vz, sp, opts) {
    const lit = rec.light && rec.light.base > 0, top = rec.c.y + rec.he.y - .3;
    const b = makeLive(rec); if (!b) return;
    const l = Math.hypot(vx, vz) || 1, k = opts.blast ? 1 : .6;
    b.v.set(vx * k, 1.2 + sp * .1, vz * k); b.w.set(vz / l * sp * .75, (Math.random() - .5) * 2.5, -vx / l * sp * .75);
    b.sleep = false; b.rest = 0;
    if (rec.light) {
      for (let q = 0; q < 16; q++) chip(rec.c.x + (Math.random() - .5) * .4, top, rec.c.z + (Math.random() - .5) * .4, vx * .3 + (Math.random() - .5) * 4, 1 + Math.random() * 3, vz * .3 + (Math.random() - .5) * 4, .04 + Math.random() * .07, .015, .04 + Math.random() * .07, GLASS[q % GLASS.length]);
      if (lit) { emitPts(FX.hot, rec.c.x, top, rec.c.z, vx * .2, 2, vz * .2, 5, 26, '#ffe8a0', .5, 10); emitPts(FX.hot, rec.c.x, rec.base + .2, rec.c.z, 0, 2.5, 0, 4, 14, '#fff4c8', .35, 10); }
      DZ.sfxT = -9; sound('vetri', rec.c.x, rec.c.z);
    }
    for (let q = 0; q < 8; q++) chip(rec.c.x, rec.base + .2, rec.c.z, vx * .2 + (Math.random() - .5) * 3, 1 + Math.random() * 2, vz * .2 + (Math.random() - .5) * 3, .06 + Math.random() * .08, .04, .08, '#6a6a6e');
    DZ.sfxT = -9; sound('palo', rec.c.x, rec.c.z);
  }
  // un proiettile spegne la lanterna di un lampione
  function shootLamp(rec) {
    if (!rec.light || rec.lampOut) return false; rec.lampOut = true;
    const top = rec.c.y + rec.he.y - .3, lit = rec.light.base > 0;
    rec.light.base = 0; if (rec.glowS) rec.glowS.visible = false;
    for (let q = 0; q < 12; q++) chip(rec.c.x + (Math.random() - .5) * .3, top, rec.c.z + (Math.random() - .5) * .3, (Math.random() - .5) * 3, Math.random() * 2, (Math.random() - .5) * 3, .03 + Math.random() * .06, .015, .03 + Math.random() * .06, GLASS[q % GLASS.length]);
    if (lit) emitPts(FX.hot, rec.c.x, top, rec.c.z, 0, 1, 0, 4, 18, '#ffe8a0', .4, 10);
    DZ.sfxT = -9; sound('vetri', rec.c.x, rec.c.z); DZ.touched = true;
    return true;
  }
  function sound(k, x, z) { if (DZ.time - DZ.sfxT < .06) return; DZ.sfxT = DZ.time; DZ.sfx.push({ k, x, y: z }); }

  // ----- frammenti: un InstancedMesh solo per tutti -----
  function buildDebris() {
    const N = 1400, m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: '#ffffff' }), N);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0), wc = new THREE.Color('#ffffff');
    for (let i = 0; i < N; i++) { m.setMatrixAt(i, zero); m.setColorAt(i, wc); }
    scene.add(m);
    DZ.debris = { m, N, i: 0, P: new Float32Array(N * 3), V: new Float32Array(N * 3), R: new Float32Array(N * 3), W: new Float32Array(N * 3), S: new Float32Array(N * 3), live: new Uint8Array(N), dirty: false };
  }
  const _col = new THREE.Color();
  function chip(x, y, z, vx, vy, vz, sx, sy, sz, color) {
    const D = DZ.debris; if (!D) return; const i = D.i = (D.i + 1) % D.N, j = i * 3;
    D.P[j] = x; D.P[j + 1] = y; D.P[j + 2] = z; D.V[j] = vx; D.V[j + 1] = vy; D.V[j + 2] = vz;
    D.R[j] = Math.random() * 6; D.R[j + 1] = Math.random() * 6; D.R[j + 2] = Math.random() * 6;
    const sp = Math.hypot(vx, vy, vz) * 1.4 + 2; D.W[j] = (Math.random() - .5) * sp; D.W[j + 1] = (Math.random() - .5) * sp; D.W[j + 2] = (Math.random() - .5) * sp;
    D.S[j] = sx; D.S[j + 1] = sy; D.S[j + 2] = sz; D.live[i] = 1;
    D.m.setColorAt(i, _col.set(color)); D.m.instanceColor.needsUpdate = true; D.dirty = true; DZ.touched = true;
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const solidAt = (x, z) => { const t = G.tileAt(Math.floor(x / TS), Math.floor(z / TS)); return t === G.T.BLD || t === G.T.FOUNT; };
  const waterAt = (x, z) => G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === G.T.WATER;
  function tickDebris(dt) {
    const D = DZ.debris; if (!D) return; let upd = D.dirty; D.dirty = false;
    for (let i = 0; i < D.N; i++) {
      if (D.live[i] !== 1) continue; const j = i * 3; upd = true;
      D.V[j + 1] -= 22 * dt;
      let nx = D.P[j] + D.V[j] * dt, nz = D.P[j + 2] + D.V[j + 2] * dt; const ny = D.P[j + 1] + D.V[j + 1] * dt;
      if (solidAt(nx, D.P[j + 2]) && ny < 30) { nx = D.P[j]; D.V[j] *= -.3; }
      if (solidAt(D.P[j], nz) && ny < 30) { nz = D.P[j + 2]; D.V[j + 2] *= -.3; }
      D.P[j] = nx; D.P[j + 1] = ny; D.P[j + 2] = nz;
      D.R[j] += D.W[j] * dt; D.R[j + 1] += D.W[j + 1] * dt; D.R[j + 2] += D.W[j + 2] * dt;
      const wet = waterAt(nx, nz), fl = wet ? -4 : groundH(nx, nz) + D.S[j + 1] * .5;
      if (D.P[j + 1] < fl) {
        if (wet) { D.live[i] = 0; D.S[j] = D.S[j + 1] = D.S[j + 2] = 0; }
        else {
          D.P[j + 1] = fl; D.V[j + 1] = Math.abs(D.V[j + 1]) > 1.5 ? -D.V[j + 1] * .28 : 0; D.V[j] *= .55; D.V[j + 2] *= .55; D.W[j] *= .5; D.W[j + 1] *= .5; D.W[j + 2] *= .5;
          if (Math.abs(D.V[j + 1]) < .1 && Math.abs(D.V[j]) + Math.abs(D.V[j + 2]) < .25) { D.live[i] = 2; D.R[j] = Math.round(D.R[j] / (Math.PI / 2)) * Math.PI / 2; D.R[j + 2] = Math.round(D.R[j + 2] / (Math.PI / 2)) * Math.PI / 2; }
        }
      }
      _p.set(D.P[j], D.P[j + 1], D.P[j + 2]); _q.setFromEuler(_e.set(D.R[j], D.R[j + 1], D.R[j + 2])); _s.set(D.S[j], D.S[j + 1], D.S[j + 2]);
      D.m.setMatrixAt(i, _m4.compose(_p, _q, _s));
    }
    if (upd) D.m.instanceMatrix.needsUpdate = true;
  }
  // un veicolo in corsa sparpaglia le macerie a terra
  function sweepDebris(x, z, c, s, hl, hw, vx, vz, sp) {
    const D = DZ.debris; if (!D) return;
    for (let i = 0; i < D.N; i++) {
      if (!D.live[i]) continue; const j = i * 3, dx = D.P[j] - x, dz = D.P[j + 2] - z;
      if (Math.abs(dx) > hl + 1 || Math.abs(dz) > hl + 1) continue;
      const lx = dx * c + dz * s, ly = -dx * s + dz * c; if (Math.abs(lx) > hl || Math.abs(ly) > hw) continue;
      const side = Math.sign(ly || 1); D.V[j] = vx * (.7 + Math.random() * .5) - s * side * sp * .3; D.V[j + 2] = vz * (.7 + Math.random() * .5) + c * side * sp * .3; D.V[j + 1] = 1 + Math.random() * sp * .25; D.live[i] = 1;
      D.W[j] = (Math.random() - .5) * 12; D.W[j + 2] = (Math.random() - .5) * 12;
    }
  }

  // ----- corpi vivi -----
  const _up = new THREE.Vector3(), _qi = new THREE.Quaternion(), _ax = new THREE.Vector3();
  function tickBodies(dt) {
    for (let bi = DZ.bodies.length - 1; bi >= 0; bi--) {
      const b = DZ.bodies[bi]; b.age += dt; if (b.sleep) continue;
      const p = b.g.position;
      b.v.y -= 22 * dt;
      let nx = p.x + b.v.x * dt, nz = p.z + b.v.z * dt;
      if (solidAt(nx, p.z) && p.y < 40) { nx = p.x; b.v.x *= -.35; b.w.multiplyScalar(.8); }
      if (solidAt(p.x, nz) && p.y < 40) { nz = p.z; b.v.z *= -.35; b.w.multiplyScalar(.8); }
      p.x = nx; p.z = nz; p.y += b.v.y * dt;
      const wl = b.w.length(); if (wl > .001) { _q.setFromAxisAngle(_ax.copy(b.w).divideScalar(wl), wl * dt); b.g.quaternion.premultiply(_q); }
      // quanto scende l'ingombro sotto il centro, con la rotazione attuale
      _qi.copy(b.g.quaternion).invert(); _up.set(0, 1, 0).applyQuaternion(_qi);
      const hb = Math.abs(_up.x) * b.he.x + Math.abs(_up.y) * b.he.y + Math.abs(_up.z) * b.he.z;
      const wet = waterAt(p.x, p.z), fl = wet ? -3 : groundH(p.x, p.z);
      if (p.y - hb < fl) {
        if (wet) { if (p.y < -2.5) { killBody(b); continue; } b.v.multiplyScalar(.9); b.v.y = Math.max(b.v.y, -1.5); }
        else {
          const imp = -b.v.y; p.y = fl + hb; b.v.y = imp > 2 ? imp * .25 : 0; b.v.x *= .72; b.v.z *= .72; b.w.multiplyScalar(.7);
          if (imp > 9 && b.rec && b.rec.fragile && Math.random() < .5) { shatter(b.rec, b.v.x, 2, b.v.z, 3); continue; }
          // si adagia sulla faccia più vicina
          if (b.v.lengthSq() < 1.5 && b.w.lengthSq() < 4) {
            const ax = Math.abs(_up.x), ay = Math.abs(_up.y), az = Math.abs(_up.z), m = Math.max(ax, ay, az);
            const tgt = m === ax ? V3d.set(Math.sign(_up.x), 0, 0) : m === ay ? V3d.set(0, Math.sign(_up.y), 0) : V3d.set(0, 0, Math.sign(_up.z));
            _q.setFromUnitVectors(tgt, _up); const q2 = b.g.quaternion.clone().multiply(_q); b.g.quaternion.slerp(q2, Math.min(1, dt * 6));
          }
        }
      }
      if (b.v.lengthSq() < .05 && b.w.lengthSq() < .05 && p.y - hb - fl < .05) { b.rest += dt; if (b.rest > .4) { b.sleep = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); if (b.rec) hashPut(b.rec, p.x, p.z); } } else b.rest = 0;
      if (p.y < -30) killBody(b);
    }
  }
  function wake(b) { b.sleep = false; b.rest = 0; }

  // ----- muraglioni -----
  let rubbleM = null;
  const STONE = ['#b8a890', '#9a8e7c', '#c9bba2', '#857868', '#d6c8ae'];
  function wallHit(e) {
    const c = Math.cos(e.a), s = Math.sin(e.a), bx = e.x - c * .5, bz = e.y - s * .5, h = groundH(bx, bz);
    const n = 10 + e.n * 8;
    for (let k = 0; k < n; k++) { const sz = .08 + Math.random() * .22; chip(e.x - c * .2 + (Math.random() - .5) * 1.4, h + .3 + Math.random() * 1.2, e.y - s * .2 + (Math.random() - .5) * 1.4, -c * (1.5 + Math.random() * 4) + (Math.random() - .5) * 4, 2 + Math.random() * 4, -s * (1.5 + Math.random() * 4) + (Math.random() - .5) * 4, sz, sz * .7, sz, STONE[k % STONE.length]); }
    for (let k = 0; k < 3 + e.n * 2; k++) smoke(bx + (Math.random() - .5) * 1.5, h + .4 + Math.random(), bz + (Math.random() - .5) * 1.5, '#a89a88', 1.2 + e.n * .4, 1.2 + Math.random(), .6);
    // il muro trema: la balaustra sopra perde qualche colonnina
    const i = e.ty * G.GW + e.tx, t = TAGS.get('w' + i);
    if (t && e.n < e.need) t.objs.forEach(o => { if (o.userData.bal && Math.random() < .25 * e.n && !o.userData.gone) { o.userData.gone = true; const bb = new THREE.Box3().setFromObject(o), cc = bb.getCenter(new THREE.Vector3()), he = bb.getSize(new THREE.Vector3()).multiplyScalar(.5); hideTagObj(t, o); const b = liveBody(o, cc, he, .08, null); b.v.set(-c * 2 + (Math.random() - .5) * 2, 3, -s * 2 + (Math.random() - .5) * 2); b.w.set(Math.random() * 8 - 4, 0, Math.random() * 8 - 4); } });
  }
  // nasconde un solo pezzo di un gruppo di tag (le colonnine cadono una per una)
  function hideTagObj(t, o) { const p = t.parts.find(p => p.obj === o); if (!p || p.gone || !p.b.mesh) return; p.gone = true; const a = p.b.mesh.geometry.attributes.position, st0 = p.b.offs[p.gi] * 3, e = st0 + p.n * 3; if (!p.bak) p.bak = a.array.slice(st0, e); for (let k = st0; k < e; k += 3) { a.array[k] = 0; a.array[k + 1] = -80; a.array[k + 2] = 0; } a.needsUpdate = true; DZ.touched = true; }
  function wallBreak(e) {
    const c = Math.cos(e.a), s = Math.sin(e.a);
    e.cells.forEach(([tx, ty]) => {
      const i = ty * G.GW + tx, t = TAGS.get('w' + i); if (!t) return;
      hideTag('w' + i);
      t.objs.forEach(o => {
        if (o.userData.gone) return;
        const bb = new THREE.Box3().setFromObject(o), cc = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
        if (o.userData.block) { // il muro vero: esplode in blocchi di pietra
          const n = Math.round(clamp(sz.y * 16, 18, 60));
          for (let k = 0; k < n; k++) { const q = .15 + Math.random() * .4, yy = bb.min.y + Math.random() * sz.y, low = (yy - bb.min.y) / Math.max(1, sz.y), f = 3 + Math.random() * 9;
            chip(cc.x + (Math.random() - .5) * sz.x, Math.max(yy, groundH(cc.x, cc.z) + .2), cc.z + (Math.random() - .5) * sz.z, c * f * (.4 + low) + (Math.random() - .5) * 4, 1.5 + Math.random() * 5, s * f * (.4 + low) + (Math.random() - .5) * 4, q, q * (.5 + Math.random() * .4), q * (.8 + Math.random() * .5), STONE[k % STONE.length]); }
        } else if (o.userData.flower) {
          for (let k = 0; k < 5; k++) chip(cc.x, cc.y, cc.z, c * 3 + (Math.random() - .5) * 4, 2 + Math.random() * 3, s * 3 + (Math.random() - .5) * 4, .12, .1, .12, '#' + o.material.color.getHexString());
        } else {
          const b = liveBody(o, cc, sz.multiplyScalar(.5), clamp(sz.x * sz.y * sz.z * 2, .05, 1.2), null);
          const f = 4 + Math.random() * 6; b.v.set(c * f + (Math.random() - .5) * 3, 3 + Math.random() * 4, s * f + (Math.random() - .5) * 3); b.w.set((Math.random() - .5) * 10, (Math.random() - .5) * 4, (Math.random() - .5) * 10);
        }
      });
      buildRubble(tx, ty);
      const x = tx * TS + 1, z = ty * TS + 1, h = groundH(x, z);
      for (let k = 0; k < 6; k++) smoke(x + (Math.random() - .5) * 2.5, h + .3 + Math.random() * 1.5, z + (Math.random() - .5) * 2.5, '#b0a290', 1.5, 1.6 + Math.random(), .8 + Math.random() * .6);
      emitPts(FX.wet, x, h + 1, z, c * 3, 3, s * 3, 6, 30, '#c8b8a0', 1.2, 10);
      // quello che stava vicino alla breccia rotola giù
      hashNear(x, z, 3.5, rec => { const pp = recPos(rec); if (rec.state === 2 || Math.hypot(pp.x - x, pp.z - z) > 3.5) return; knock(rec, c * 3 + (Math.random() - .5) * 2, 2, s * 3 + (Math.random() - .5) * 2, 4, 5); });
    });
  }
  // macerie: una superficie irregolare sulla rampa della casella, più qualche blocco a terra
  function buildRubble(tx, ty) {
    if (!rubbleM) { const tx0 = stoneTexture().clone(); tx0.needsUpdate = true; tx0.wrapS = tx0.wrapT = THREE.RepeatWrapping; rubbleM = std({ map: tx0, color: '#c8b8a0', roughness: 1 }); }
    const N = 5, x0 = tx * TS, z0 = ty * TS, pos = [], uv = [], H = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = x0 + i / N * TS, z = z0 + j / N * TS, edge = i === 0 || j === 0 || i === N || j === N; H.push(groundH(Math.min(x, x0 + TS - .01), Math.min(z, z0 + TS - .01)) + (edge ? 0 : .08 + Math.random() * .35)); }
    const P = (i, j) => [x0 + i / N * TS, H[j * (N + 1) + i], z0 + j / N * TS];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = P(i, j), b = P(i, j + 1), c2 = P(i + 1, j + 1), d = P(i + 1, j); [a, b, c2, a, c2, d].forEach(p => { pos.push(...p); uv.push(p[0] / 2, p[2] / 2); }); }
    // fianchi verso le caselle libere più basse
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
      const nx = tx + dx, ny = ty + dy, v = G.tileAt(nx, ny); if (v === G.T.BLD) return;
      for (let k = 0; k < N; k++) {
        const ij = dx ? [[dx > 0 ? N : 0, k], [dx > 0 ? N : 0, k + 1]] : [[k, dy > 0 ? N : 0], [k + 1, dy > 0 ? N : 0]];
        const a = P(...ij[0]), b = P(...ij[1]); [[a[0], a[1], a[2]], [a[0], -1.5, a[2]], [b[0], -1.5, b[2]], [a[0], a[1], a[2]], [b[0], -1.5, b[2]], [b[0], b[1], b[2]]].forEach(p => { pos.push(...p); uv.push((p[0] + p[2]) / 2, p[1] / 2); });
      }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, rubbleM); m.material.side = THREE.DoubleSide; m.receiveShadow = true; m.castShadow = true; scene.add(m); DZ.rubble.push(m);
    for (let k = 0; k < 18; k++) { const q = .2 + Math.random() * .45, x = x0 + .2 + Math.random() * 1.6, z = z0 + .2 + Math.random() * 1.6; chip(x, groundH(x, z) + q + Math.random() * .5, z, 0, 0, 0, q, q * .6, q * 1.1, STONE[k % STONE.length]); }
  }

  // ----- facciate -----
  const FACE_UV = {
    S: (G2, x, z) => (x - G2.x0) / G2.w, N: (G2, x, z) => (G2.x0 + G2.w - x) / G2.w,
    E: (G2, x, z) => (G2.z0 + G2.d - z) / G2.d, W: (G2, x, z) => (z - G2.z0) / G2.d,
  };
  function faceAt(rec, x, z, a) {
    const G2 = rec.geo, c = Math.cos(a), s = Math.sin(a), px = x - c * .5, pz = z - s * .5;
    if (px < G2.x0) return 'W'; if (px > G2.x0 + G2.w) return 'E'; if (pz < G2.z0) return 'N'; if (pz > G2.z0 + G2.d) return 'S';
    return Math.abs(c) > Math.abs(s) ? (c > 0 ? 'W' : 'E') : (s > 0 ? 'N' : 'S');
  }
  function faceCtx(rec, f) {
    const F = rec.faces[f]; if (!F) return null;
    if (!F.ctx) { F.cv = F.map.image; F.ctx = F.cv.getContext('2d'); F.ecv = F.emissive.image; F.ectx = F.ecv.getContext('2d'); }
    if (!F.bak) { F.bak = F.ctx.getImageData(0, 0, F.cv.width, F.cv.height); F.ebak = F.ectx.getImageData(0, 0, F.ecv.width, F.ecv.height); DZ.faces.add(F); }
    DZ.touched = true; return F;
  }
  // coordinate in pixel della texture di una facciata per un punto del mondo (x, z) alla quota y
  function facePx(rec, f, x, z, y) { const F = rec.faces[f], G2 = rec.geo, u = clamp(FACE_UV[f](G2, x, z), .01, .99); return [u * F.cv.width, (1 - (y - G2.y0) / G2.H) * F.cv.height]; }
  function crack(ctx, x0, y0, len, col) {
    let x = x0, y = y0, a = Math.random() * Math.PI * 2; ctx.fillStyle = col;
    for (let k = 0; k < len; k++) { a += (Math.random() - .5) * .9; x += Math.cos(a); y += Math.sin(a); ctx.fillRect(Math.round(x), Math.round(y), 1, 1); if (Math.random() < .12 && len - k > 4) crack(ctx, x, y, Math.floor((len - k) * .5), col); }
  }
  function bricks(ctx, x, y, w, h) { ctx.fillStyle = '#9a4a34'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#c8b8a0'; for (let j = 0; j < h; j += 2) { ctx.fillRect(x, y + j, w, 1); for (let i = (j / 2) % 2 ? 1 : 3; i < w; i += 4) ctx.fillRect(x + i, y + j, 1, 2); } }
  function facadeHit(e) {
    const rec = DZ.bRec[e.b]; const c = Math.cos(e.a), s = Math.sin(e.a), bx = e.x - c * .6, bz = e.y - s * .6, gh = groundH(bx, bz);
    let plaster = '#d8c8b0';
    if (rec && rec.faces) {
      const f = faceAt(rec, e.x, e.y, e.a), F = faceCtx(rec, f);
      if (F) {
        const big = e.blast ? 1.6 : 1, yc = gh + (e.blast ? 1.4 : .9), [px, py] = facePx(rec, f, e.x, e.y, yc), x = F.ctx;
        const d = x.getImageData(clamp(Math.round(px), 0, F.cv.width - 1), clamp(Math.round(py - 12), 0, F.cv.height - 1), 1, 1).data; plaster = '#' + _col.setRGB(d[0] / 255, d[1] / 255, d[2] / 255).getHexString();
        if (e.blast) { const gr = x.createRadialGradient(px, py, 2, px, py, 30); gr.addColorStop(0, 'rgba(12,8,10,.85)'); gr.addColorStop(1, 'rgba(12,8,10,0)'); x.fillStyle = gr; x.fillRect(px - 32, py - 32, 64, 64); }
        // vetri: quelli vicini all'urto saltano al primo colpo
        if (F.glass) { const rx = e.blast ? 34 : 20, ry = e.blast ? 40 : 26; F.glass.forEach(g => { const gx = g.x + g.w / 2, gyy = g.y + g.h / 2; if (Math.abs(gx - px) < rx + g.w / 2 && gyy > py - ry && gyy < py + 14) breakGlass(rec, f, F, g, c, s, e.blast ? 1.6 : clamp((e.speed || 6) / 8, .6, 1.8)); }); }
        const nn = Math.min(e.n, e.need);
        for (let k = 0; k < 5 + nn * 4; k++) crack(x, px + (Math.random() - .5) * 4, py + (Math.random() - .5) * 4, 8 + Math.random() * 10 * nn, 'rgba(26,20,32,.85)');
        for (let k = 0; k < 2 + nn * 2; k++) { const w = 2 + Math.floor(Math.random() * 5), h = 2 + Math.floor(Math.random() * 4); bricks(x, Math.round(px + (Math.random() - .5) * 14), Math.round(py + (Math.random() - .5) * 10), w, h); }
        F.map.needsUpdate = true;
      }
    }
    // pezzi d'intonaco e mattoni che schizzano fuori, polvere
    const n = e.blast ? 30 : 10 + e.n * 10;
    for (let k = 0; k < n; k++) { const q = .06 + Math.random() * (e.n >= e.need ? .3 : .16); chip(e.x - c * .3 + (Math.random() - .5) * 1.6, gh + .2 + Math.random() * 1.8, e.y - s * .3 + (Math.random() - .5) * 1.6, -c * (1 + Math.random() * 4) + (Math.random() - .5) * 3, 1.5 + Math.random() * 4, -s * (1 + Math.random() * 4) + (Math.random() - .5) * 3, q, q * .5, q, k % 3 ? plaster : '#9a4a34'); }
    for (let k = 0; k < 2 + e.n * 2; k++) smoke(bx + (Math.random() - .5) * 2, gh + .5 + Math.random() * 1.5, bz + (Math.random() - .5) * 2, '#b8aa98', 1.4 + e.n * .4, 1.4 + Math.random(), .5);
  }
  // punto del mondo per un pixel della texture di una facciata (inverso di facePx), un filo fuori dal muro
  const FACE_N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
  function faceWorld(rec, f, px, py) {
    const F = rec.faces[f], G2 = rec.geo, u = px / F.cv.width, y = G2.y0 + (1 - py / F.cv.height) * G2.H;
    const p = f === 'S' ? [G2.x0 + u * G2.w, G2.z0 + G2.d] : f === 'N' ? [G2.x0 + G2.w - u * G2.w, G2.z0] : f === 'E' ? [G2.x0 + G2.w, G2.z0 + G2.d - u * G2.d] : [G2.x0, G2.z0 + u * G2.d];
    return [p[0] + FACE_N[f][0] * .08, y, p[1] + FACE_N[f][1] * .08];
  }
  const GLASS = ['#d8f0f8', '#a8d4e8', '#ffffff', '#88b8d0', '#c0e4f0'];
  // un vetro va in frantumi: resta il buio dietro, qualche scheggia nel telaio, una pioggia di cocci
  function breakGlass(rec, f, F, g, c, s, power) {
    if (g.broken) return; g.broken = true;
    const x = F.ctx, ex = F.ectx;
    x.fillStyle = '#120c12'; x.fillRect(g.x, g.y, g.w, g.h);
    x.fillStyle = 'rgba(40,24,30,.9)'; x.fillRect(g.x + 1, g.y + g.h - 3, g.w - 2, 2); // la merce in fondo, in ombra
    // schegge rimaste nel telaio
    for (let k = 0; k < 3 + g.w / 3; k++) {
      const side = Math.floor(Math.random() * 4), t = Math.random(), L = 2 + Math.random() * Math.min(g.w, g.h) * .4;
      const [ax, ay, dx, dy] = side === 0 ? [g.x + t * g.w, g.y, 0, 1] : side === 1 ? [g.x + t * g.w, g.y + g.h, 0, -1] : side === 2 ? [g.x, g.y + t * g.h, 1, 0] : [g.x + g.w, g.y + t * g.h, -1, 0];
      const w = 1 + Math.random() * 3;
      x.fillStyle = Math.random() < .5 ? 'rgba(200,228,240,.85)' : 'rgba(150,190,210,.75)';
      x.beginPath(); x.moveTo(ax - dy * w, ay - dx * w); x.lineTo(ax + dy * w, ay + dx * w); x.lineTo(ax + dx * L + (Math.random() - .5) * 2, ay + dy * L + (Math.random() - .5) * 2); x.fill();
    }
    ex.fillStyle = 'rgba(0,0,0,.72)'; ex.fillRect(g.x, g.y, g.w, g.h);
    F.map.needsUpdate = true; F.emissive.needsUpdate = true; DZ.touched = true;
    const [wx, wy, wz] = faceWorld(rec, f, g.x + g.w / 2, g.y + g.h / 2), n = FACE_N[f], hw = g.w / PPM / 2, hh = g.h / PPM / 2;
    const tx = -n[1], tz = n[0], cnt = Math.round(clamp(g.w * g.h / 5, 10, 46) * (g.shop ? 1.3 : 1));
    for (let k = 0; k < cnt; k++) {
      const o = (Math.random() - .5) * 2 * hw, oy = (Math.random() - .5) * 2 * hh, out = Math.random() < .55 ? 1 : -.4, f2 = (1.5 + Math.random() * 4) * power;
      const q = .03 + Math.random() * .09;
      chip(wx + tx * o, wy + oy, wz + tz * o, n[0] * f2 * out + c * f2 * .3 + (Math.random() - .5) * 2, Math.random() * 2.5 * power, n[1] * f2 * out + s * f2 * .3 + (Math.random() - .5) * 2, q, .015, q * (.6 + Math.random() * .8), GLASS[k % GLASS.length]);
    }
    emitPts(FX.hot, wx, wy, wz, n[0] * 2, 1, n[1] * 2, 3 * power, 10, '#e8f8ff', .35, 9);
    DZ.sfxT = -9; sound(g.shop ? 'vetrina' : 'vetri', wx, wz);
  }
  // fori dei proiettili sulle facciate
  function bulletHole(e) {
    const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS), bi = G.bIndex[ty * G.GW + tx], rec = bi >= 0 ? DZ.bRec[bi] : null;
    if (!rec || !rec.faces) return;
    const f = faceAt(rec, e.x, e.y, e.a), F = faceCtx(rec, f); if (!F) return;
    const c = Math.cos(e.a), s = Math.sin(e.a), y = groundH(e.x - c * .5, e.y - s * .5) + 1.25 + (Math.random() - .5) * .25;
    const [px, py] = facePx(rec, f, e.x, e.y, y), X = Math.round(px), Y = Math.round(py);
    const gl = F.glass && F.glass.find(g => !g.broken && X >= g.x - 1 && X <= g.x + g.w && Y >= g.y - 1 && Y <= g.y + g.h);
    if (gl) return breakGlass(rec, f, F, gl, c, s, .5);
    F.ctx.fillStyle = 'rgba(40,30,36,.35)'; F.ctx.fillRect(X - 2, Y - 1, 5, 4); F.ctx.fillRect(X - 1, Y - 2, 3, 6);
    F.ctx.fillStyle = 'rgba(255,240,220,.55)'; F.ctx.fillRect(X - 1, Y - 1, 3, 3);
    F.ctx.fillStyle = '#0c0a0e'; F.ctx.fillRect(X, Y, 2, 2);
    if (Math.random() < .3) crack(F.ctx, X, Y, 3 + Math.random() * 4, 'rgba(26,20,32,.6)');
    DZ.dirty.add(F);
  }

  // ---------------- INTERNI ----------------
  // Quando una facciata viene sfondata il motore apre il piano terra (caselle percorribili).
  // Qui la texture della facciata si buca davvero (alfa ritagliato), e dietro nasce una stanza arredata
  // secondo il tipo di edificio, con le persone che ci vivono o lavorano. Gli arredi sono corpi fisici
  // (l'auto li travolge, le esplosioni li scagliano); le persone sono comparse solo grafiche.
  const ROOMS = []; DZ.roomRecs = []; DZ.alphaMats = [];
  const KIND_OF = { bar: 'bar', sirena: 'bar', osteria: 'trattoria', car_2: 'trattoria', wu: 'alimentari', gelateria: 'gelateria', video: 'videoteca', flipper: 'giochi', chiesa: 'chiesa', santuario: 'chiesa', ambulatorio: 'ambulatorio', biblioteca: 'biblioteca', commissariato: 'polizia', officina: 'officina', magazzino: 'magazzino', cantiere: 'magazzino', miramare: 'hotel', flamingo: 'hotel', paradiso: 'hotel', oceano: 'hotel', gabbiano: 'hotel', disco: 'disco', cinema: 'cinema' };
  const roomKind = b => KIND_OF[b.id] || 'casa';
  function hashDel(rec) { if (rec.hk === undefined) return; const a = DZ.hash.get(rec.hk); if (a) { const i = a.indexOf(rec); if (i >= 0) a.splice(i, 1); } rec.hk = undefined; }

  // --- texture delle pareti e dei pavimenti ---
  const ROOM_STYLE = {
    casa: { wall: ['#d8c4a0', '#c9a98a', '#b8c8a8', '#e0c8c8', '#c8d0e0'], pat: 'stripes', floor: 'parquet' },
    bar: { wall: ['#e8dcc0', '#d8e0c8'], pat: 'tiles', floor: 'check' }, trattoria: { wall: ['#e8d8b8', '#f0e0c8'], pat: 'dado', floor: 'cotto' },
    alimentari: { wall: ['#e8e4d8'], pat: 'tiles', floor: 'check' }, gelateria: { wall: ['#ffd8e8', '#d8f0ff'], pat: 'tiles', floor: 'check' },
    videoteca: { wall: ['#2a2040'], pat: 'posters', floor: 'carpetB' }, giochi: { wall: ['#1a1030'], pat: 'posters', floor: 'carpetB' },
    chiesa: { wall: ['#e8dcc4'], pat: 'dado', floor: 'marble' }, ambulatorio: { wall: ['#e8f0f0'], pat: 'tiles', floor: 'linoleum' },
    biblioteca: { wall: ['#c8b890'], pat: 'dado', floor: 'parquet' }, polizia: { wall: ['#c8ccc0'], pat: 'dado', floor: 'linoleum' },
    officina: { wall: ['#8a8a80'], pat: 'grease', floor: 'concrete' }, magazzino: { wall: ['#7a7470'], pat: 'grease', floor: 'concrete' },
    hotel: { wall: ['#f0d8e0', '#d8f0e8', '#f8e8c8'], pat: 'deco', floor: 'marble' }, disco: { wall: ['#140a24'], pat: 'mirror', floor: 'dance' }, cinema: { wall: ['#4a1020'], pat: 'curtain', floor: 'carpetR' },
  };
  function wallCanvas(style, wm, hm, r, back) {
    const cw = Math.max(4, Math.round(wm * PPM)), ch = Math.round(hm * PPM), c = mk(cw, ch), x = c.getContext('2d'), col = pick(r, style.wall);
    x.fillStyle = col; x.fillRect(0, 0, cw, ch);
    const pat = style.pat;
    if (pat === 'stripes') { x.fillStyle = shade(col, .88); for (let i = 0; i < cw; i += 4) x.fillRect(i, 0, 1, ch); x.fillStyle = shade(col, .6); x.fillRect(0, ch - 2, cw, 2); x.fillStyle = '#f4ecdc'; x.fillRect(0, 2, cw, 1); }
    if (pat === 'tiles') { x.fillStyle = '#f4f4f0'; x.fillRect(0, ch - 12, cw, 12); x.fillStyle = '#c8ccd0'; for (let i = 0; i < cw; i += 2) x.fillRect(i, ch - 12, 1, 12); for (let j = ch - 12; j < ch; j += 2) x.fillRect(0, j, cw, 1); }
    if (pat === 'dado') { x.fillStyle = shade(col, .75); x.fillRect(0, ch - 8, cw, 8); x.fillStyle = shade(col, .55); x.fillRect(0, ch - 9, cw, 1); }
    if (pat === 'grease') { for (let i = 0; i < cw * ch / 12; i++) { x.fillStyle = r() < .5 ? shade(col, .8) : shade(col, 1.1); x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 2, 1); } x.fillStyle = '#e0c040'; x.fillRect(0, ch - 3, cw, 1); }
    if (pat === 'deco') { x.fillStyle = shade(col, .82); x.fillRect(0, ch - 6, cw, 6); x.fillStyle = '#e8c060'; x.fillRect(0, ch - 7, cw, 1); x.fillRect(0, 4, cw, 1); for (let i = 3; i < cw; i += 10) { x.fillStyle = shade(col, .9); x.fillRect(i, 5, 3, ch - 12); } }
    if (pat === 'mirror') { for (let i = 0; i < cw; i += 3) for (let j = 0; j < ch - 4; j += 3) { x.fillStyle = r() < .15 ? pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b']) : '#2a1a44'; x.fillRect(i, j, 2, 2); } }
    if (pat === 'curtain') { for (let i = 0; i < cw; i += 3) { x.fillStyle = i % 6 ? '#6a1428' : '#3a0814'; x.fillRect(i, 0, 3, ch); } }
    if (pat === 'posters' || back) {
      const n = Math.floor(wm / 2.2);
      for (let k = 0; k < n; k++) {
        const px = Math.round((k + .5) * cw / n) - 4, py = Math.round(ch * .25);
        if (pat === 'posters') { x.fillStyle = pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b', '#c05cff', '#ff7a3b']); x.fillRect(px, py, 8, 11); x.fillStyle = '#10081a'; x.fillRect(px + 1, py + 2, 6, 5); x.fillStyle = '#fff'; x.fillRect(px + 1, py + 8, 6, 1); }
        else if (!['mirror', 'curtain', 'grease'].includes(pat)) { x.fillStyle = '#5a3a24'; x.fillRect(px, py, 9, 7); x.fillStyle = pick(r, ['#6a8ab0', '#b08a5a', '#8ab070', '#c07060', '#e0c890']); x.fillRect(px + 1, py + 1, 7, 5); x.fillStyle = shade(x.fillStyle, .7); x.fillRect(px + 1, py + 4, 7, 2); }
      }
    }
    return canvasTex(c);
  }
  function floorCanvas(kind, wm, dm, r) {
    const cw = Math.round(wm * PPM), ch = Math.round(dm * PPM), c = mk(cw, ch), x = c.getContext('2d');
    const f = ROOM_STYLE[kind].floor;
    const fill = (a) => { x.fillStyle = a; x.fillRect(0, 0, cw, ch); };
    if (f === 'parquet') { fill('#8a5a36'); for (let j = 0; j < ch; j += 2) for (let i = (j / 2 % 2) * 3; i < cw; i += 6) { x.fillStyle = r() < .5 ? '#7a4e2e' : '#9a6a40'; x.fillRect(i, j, 5, 1); } }
    else if (f === 'check') { for (let j = 0; j < ch; j += 4) for (let i = 0; i < cw; i += 4) { x.fillStyle = ((i + j) / 4) % 2 ? '#e8e4dc' : '#2a2a30'; x.fillRect(i, j, 4, 4); } }
    else if (f === 'cotto') { fill('#b8603a'); x.fillStyle = '#8a4428'; for (let i = 0; i < cw; i += 3) x.fillRect(i, 0, 1, ch); for (let j = 0; j < ch; j += 3) x.fillRect(0, j, cw, 1); }
    else if (f === 'marble') { fill('#e8e0d4'); for (let i = 0; i < cw * ch / 10; i++) { x.fillStyle = r() < .5 ? '#d0c8bc' : '#f4f0e8'; x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 2, 1); } x.fillStyle = '#c8b890'; for (let i = 0; i < cw; i += 8) x.fillRect(i, 0, 1, ch); }
    else if (f === 'linoleum') { fill('#9ab0a0'); for (let i = 0; i < cw * ch / 14; i++) { x.fillStyle = '#86a08e'; x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 1, 1); } }
    else if (f === 'concrete') { fill('#6a6660'); for (let i = 0; i < cw * ch / 8; i++) { x.fillStyle = r() < .5 ? '#5a5650' : '#7a7670'; x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 2, 1); } x.fillStyle = '#3a342c'; for (let k = 0; k < 3; k++) x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 4, 3); }
    else if (f === 'carpetB') { fill('#1a2050'); for (let i = 0; i < cw * ch / 10; i++) { x.fillStyle = pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b']); x.fillRect(Math.floor(r() * cw), Math.floor(r() * ch), 1, 1); } }
    else if (f === 'carpetR') { fill('#7a1024'); x.fillStyle = '#5a0a1a'; for (let j = 0; j < ch; j += 3) x.fillRect(0, j, cw, 1); }
    else if (f === 'dance') { for (let j = 0; j < ch; j += 4) for (let i = 0; i < cw; i += 4) { x.fillStyle = pick(r, ['#ff4fa3', '#35e6ff', '#ffd23b', '#c05cff', '#2a1a40', '#2a1a40']); x.fillRect(i, j, 4, 4); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i, j + 3, 4, 1); } }
    return canvasTex(c);
  }

  // --- arredi: gruppi con l'origine sul pavimento, fronte verso +z locale ---
  const FB = {
    box(g, w, h, d, col, x, y, z, emit) { const m = box(w, h, d, emit ? sb(col) : sm(col)); m.position.set(x || 0, (y || 0) + h / 2, z || 0); if (emit) m.userData.keep = true; g.add(m); return m; },
    sofa(col) { const g = G0(); FB.box(g, 2, .4, .9, col, 0, .1); FB.box(g, 2, .5, .25, col, 0, .45, -.33); [-1, 1].forEach(s => FB.box(g, .22, .6, .9, shade(col, .85), s * .95, .1)); [-.9, .9].forEach(s => FB.box(g, .08, .1, .08, '#2a1a10', s, 0, .35)); return g; },
    armchair(col) { const g = G0(); FB.box(g, .9, .4, .8, col, 0, .1); FB.box(g, .9, .5, .2, col, 0, .45, -.3); [-1, 1].forEach(s => FB.box(g, .16, .55, .8, shade(col, .85), s * .42, .1)); return g; },
    table(w, d, col, cloth) { const g = G0(); FB.box(g, w, .06, d, cloth || col, 0, .72); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => FB.box(g, .06, .72, .06, col, a * (w / 2 - .08), 0, b * (d / 2 - .08))); if (cloth) FB.box(g, w + .06, .25, d + .06, cloth, 0, .53); return g; },
    chair(col) { const g = G0(); FB.box(g, .45, .05, .45, col, 0, .45); FB.box(g, .45, .5, .05, col, 0, .5, -.2); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => FB.box(g, .04, .45, .04, shade(col, .7), a * .19, 0, b * .19)); return g; },
    stool() { const g = G0(); FB.box(g, .38, .08, .38, '#c8303a', 0, .72); FB.box(g, .06, .72, .06, '#c8c8d0'); FB.box(g, .3, .03, .3, '#c8c8d0', 0, .25); return g; },
    tv() { const g = G0(); FB.box(g, 1.1, .5, .45, '#5a3a24'); FB.box(g, .7, .55, .5, '#2a2a2e', 0, .5); FB.box(g, .55, .42, .02, '#8ab8e8', 0, .56, .26, true); return g; },
    sideboard(col) { const g = G0(); FB.box(g, 1.8, .85, .45, col || '#6a4228'); for (let k = 0; k < 4; k++) FB.box(g, .06, .06, .02, '#d8c070', -.6 + k * .4, .6, .23); FB.box(g, .2, .3, .2, '#3a6aa0', -.6, .85); FB.box(g, .12, .35, .12, '#e8e0d0', .5, .85); return g; },
    bookcase(w) { const g = G0(); w = w || 1.4; FB.box(g, w, 2, .35, '#5a3820'); for (let s = 0; s < 4; s++) for (let k = 0; k < Math.floor(w * 6); k++) FB.box(g, .12, .32, .25, pick(Math.random, ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#c8a040', '#6a2a6a', '#d8d0c0']), -w / 2 + .12 + k * .155, .15 + s * .47, .06); return g; },
    lamp(col) { const g = G0(); FB.box(g, .3, .04, .3, '#2a2a2e'); FB.box(g, .04, 1.4, .04, '#2a2a2e'); const sh = FB.box(g, .4, .3, .4, col || '#ffe0a0', 0, 1.35, 0, true); return g; },
    plant() { const g = G0(); FB.box(g, .4, .4, .4, '#9a5236'); const l = new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 0), sl('#3f7a3a')); l.position.y = .85; g.add(l); const l2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 0), sl('#4f8a44')); l2.position.set(.15, 1.25, 0); g.add(l2); return g; },
    rug(w, d, col) { const g = G0(); FB.box(g, w, .02, d, col); FB.box(g, w * .8, .025, d * .8, shade(col, .7)); return g; },
    bed() { const g = G0(); FB.box(g, 1.5, .4, 2, '#6a4228'); FB.box(g, 1.4, .18, 1.9, '#f0ece4', 0, .4); FB.box(g, 1.42, .08, 1.3, '#c84a6a', 0, .56, .3); FB.box(g, 1.5, .8, .1, '#6a4228', 0, 0, -.98); FB.box(g, .5, .12, .3, '#ffffff', -.35, .58, -.75); FB.box(g, .5, .12, .3, '#ffffff', .35, .58, -.75); return g; },
    fridge(glow) { const g = G0(); FB.box(g, .8, 1.8, .7, '#e8e8e4'); if (glow) FB.box(g, .6, 1.3, .02, glow, 0, .35, .36, true); else FB.box(g, .04, .5, .04, '#a0a0a8', .3, 1, .36); return g; },
    stove() { const g = G0(); FB.box(g, .7, .9, .6, '#e8e4dc'); FB.box(g, .6, .02, .5, '#1a1a1e', 0, .9); FB.box(g, .5, .35, .02, '#2a2a30', 0, .3, .31); FB.box(g, .2, .25, .2, '#a0a0b0', -.15, .92); return g; },
    counter(w, col, top) { const g = G0(); FB.box(g, w, 1.05, .7, col); FB.box(g, w + .1, .06, .8, top || '#d8d0c0', 0, 1.05); FB.box(g, w, .1, .05, shade(col, .6), 0, .1, .36); return g; },
    shelf(w, goods) { const g = G0(); FB.box(g, w, 1.9, .45, '#b8b0a0'); for (let s = 0; s < 4; s++) { FB.box(g, w, .04, .45, '#8a8478', 0, .2 + s * .45); for (let k = 0; k < Math.floor(w * 4); k++) FB.box(g, .18, .26, .3, pick(Math.random, goods), -w / 2 + .15 + k * .25, .24 + s * .45); } return g; },
    bottles(w) { const g = G0(); FB.box(g, w, 1.6, .3, '#4a2a1a', 0, .9); for (let s = 0; s < 3; s++) for (let k = 0; k < Math.floor(w * 5); k++) { const b = cyl(.04, .05, .28, 5, sm(pick(Math.random, ['#3a6a2a', '#6a3a1a', '#d8c070', '#c8e0e8', '#8a1a2a']), { roughness: .2 })); b.position.set(-w / 2 + .12 + k * .2, 1.1 + s * .45, .05); g.add(b); } FB.box(g, w, .3, .1, '#ffb35c', 0, 2.55, .1, true); return g; },
    espresso() { const g = G0(); FB.box(g, .7, .45, .45, '#c8c8d0'); FB.box(g, .6, .12, .4, '#8a1a1a', 0, .45); [-.2, .2].forEach(s => FB.box(g, .08, .1, .12, '#2a2a2e', s, .18, .26)); return g; },
    arcade() { const g = G0(); const c = pick(Math.random, ['#c02a8a', '#2a6ac0', '#e0a020', '#2aa060']); FB.box(g, .75, 1.8, .7, c); FB.box(g, .6, .5, .05, pick(Math.random, ['#35e6ff', '#ff4fa3', '#9aff6a']), 0, 1.15, .34, true); FB.box(g, .75, .15, .4, '#1a1a1e', 0, .85, .45); FB.box(g, .65, .2, .05, '#ffd23b', 0, 1.65, .36, true); return g; },
    pinball() { const g = G0(); FB.box(g, .7, .25, 1.4, '#2a2a6a', 0, .75); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => FB.box(g, .06, .75, .06, '#c8c8d0', a * .3, 0, b * .62)); FB.box(g, .7, .8, .1, '#ff4fa3', 0, 1, -.68, true); FB.box(g, .6, .02, 1.2, '#6ae0ff', 0, 1.01, 0, true); return g; },
    pew(w) { const g = G0(); FB.box(g, w, .08, .45, '#5a3820', 0, .45); FB.box(g, w, .5, .06, '#5a3820', 0, .5, -.2); FB.box(g, .06, .9, .5, '#4a2a18', -w / 2); FB.box(g, .06, .9, .5, '#4a2a18', w / 2); return g; },
    altar() { const g = G0(); FB.box(g, 1.8, 1, .8, '#e8e0d0'); FB.box(g, 1.9, .06, .9, '#d8c070', 0, 1); [-.6, .6].forEach(s => { FB.box(g, .06, .35, .06, '#e8e0c8', s, 1.06); FB.box(g, .08, .1, .08, '#ffd070', s, 1.41, 0, true); }); FB.box(g, .08, .7, .08, '#d8c070', 0, 1.06); FB.box(g, .4, .08, .08, '#d8c070', 0, 1.5); return g; },
    medbed() { const g = G0(); FB.box(g, .8, .7, 1.9, '#d8dcdc'); FB.box(g, .8, .1, 1.9, '#f4f8f8', 0, .7); FB.box(g, .6, .1, .35, '#ffffff', 0, .8, -.7); return g; },
    cabinet(col) { const g = G0(); FB.box(g, .9, 1.6, .45, col || '#e8ecec'); FB.box(g, .8, .7, .02, '#a8c8d8', 0, .8, .23); [0, 1, 2].forEach(k => FB.box(g, .12, .2, .12, pick(Math.random, ['#c83a3a', '#e8e8e8', '#3a8ac8']), -.25 + k * .25, 1.0)); return g; },
    desk(col) { const g = G0(); FB.box(g, 1.4, .75, .7, col || '#6a6a60'); FB.box(g, 1.5, .05, .75, '#4a4a44', 0, .75); FB.box(g, .45, .15, .35, '#3a3a40', -.3, .8); FB.box(g, .3, .02, .4, '#f0ece0', .35, .8); return g; },
    filing() { const g = G0(); FB.box(g, .5, 1.3, .6, '#7a8078'); for (let k = 0; k < 4; k++) FB.box(g, .3, .04, .02, '#c8c8c0', 0, .2 + k * .3, .31); return g; },
    bench(w) { const g = G0(); FB.box(g, w, .9, .7, '#5a4a3a'); FB.box(g, w + .1, .08, .8, '#3a2a1e', 0, .9); FB.box(g, .5, .15, .3, '#c8302a', -w / 3, .98); FB.box(g, .3, .1, .3, '#8a8a90', w / 4, .98); FB.box(g, w, 1, .05, '#4a4a44', 0, 1, -.35); for (let k = 0; k < 5; k++) FB.box(g, .05, .3, .05, '#c8c8d0', -w / 2 + .3 + k * w / 5, 1.3, -.3); return g; },
    tires() { const g = G0(); for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.3, .12, 5, 10), sl('#18181c')); t.rotation.x = Math.PI / 2; t.position.y = .12 + k * .24; g.add(t); } return g; },
    drum(col) { const g = G0(); const d = cyl(.3, .3, .9, 8, sm(col || '#2a5a8a')); d.position.y = .45; g.add(d); FB.box(g, .62, .04, .62, shade(col || '#2a5a8a', .7), 0, .6); return g; },
    crates() { const g = G0(); const n = 1 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) FB.box(g, .9, .8, .9, pick(Math.random, ['#b08a5a', '#9a7448', '#c8a068']), (Math.random() - .5) * .1, k * .8, (Math.random() - .5) * .1); return g; },
    reception() { const g = G0(); FB.box(g, 2.4, 1.1, .7, '#f0e8dc'); FB.box(g, 2.5, .06, .8, '#e8c060', 0, 1.1); FB.box(g, 2.4, .1, .05, '#e8c060', 0, .5, .36); FB.box(g, .25, .3, .2, '#e8c060', .8, 1.16); FB.box(g, .5, .02, .35, '#f8f4ec', -.5, 1.17); return g; },
    luggage() { const g = G0(); FB.box(g, .6, .7, .25, pick(Math.random, ['#8a3a2a', '#2a4a6a', '#c8a060'])); FB.box(g, .5, .5, .22, pick(Math.random, ['#6a2a4a', '#3a6a4a']), .15, 0, .3); return g; },
    speaker() { const g = G0(); FB.box(g, .8, 1.6, .7, '#1a1a1e'); FB.box(g, .5, .5, .02, '#3a3a44', 0, .95, .36); FB.box(g, .3, .3, .02, '#3a3a44', 0, .35, .36); return g; },
    seats(w) { const g = G0(); const n = Math.floor(w / .6); for (let k = 0; k < n; k++) { FB.box(g, .52, .45, .5, '#a01830', -w / 2 + .3 + k * .6, 0); FB.box(g, .52, .55, .1, '#a01830', -w / 2 + .3 + k * .6, .45, -.22); } return g; },
    screen(w) { const g = G0(); FB.box(g, w, 1.8, .06, '#e8f0ff', 0, .7, 0, true); FB.box(g, w + .3, .2, .1, '#3a0a14', 0, 2.5); return g; },
    freezer() { const g = G0(); FB.box(g, 2.2, .9, .8, '#e8f4f8'); FB.box(g, 2.1, .04, .7, '#c8e8f8', 0, .9, 0, true); for (let k = 0; k < 7; k++) FB.box(g, .24, .06, .3, pick(Math.random, ['#f4e8c8', '#ff9ab8', '#8a4a2a', '#9ae07a', '#fff4a0', '#f4f4f4']), -.9 + k * .3, .93); FB.box(g, 2.2, .5, .04, '#c8e8f8', 0, .95, .38); return g; },
    vhs(w) { const g = G0(); FB.box(g, w, 1.9, .4, '#1a1a24'); for (let s = 0; s < 5; s++) for (let k = 0; k < Math.floor(w * 7); k++) FB.box(g, .1, .3, .28, pick(Math.random, ['#e02a4a', '#2a8ae0', '#f0c020', '#1a1a1a', '#e0e0e0', '#8a2ae0']), -w / 2 + .1 + k * .14, .1 + s * .36, .06); return g; },
    mirrorball() { const g = G0(); const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.3, 1), sm('#d8d8e8', { metalness: .9, roughness: .15 })); s.position.y = 2.4; g.add(s); FB.box(g, .02, .4, .02, '#888', 0, 2.7); return g; },
    dining(col) { const g = G0(); g.add(FB.table(1.4, .9, col || '#6a4228', null)); [[-.45, .7, 0], [.45, .7, 0], [-.45, -.7, Math.PI], [.45, -.7, Math.PI]].forEach(([x, z, r]) => { const c = FB.chair(col || '#6a4228'); c.position.set(x, 0, z); c.rotation.y = r; g.add(c); }); return g; },
    cafeTable(cloth) { const g = G0(); g.add(FB.table(.8, .8, '#2a2a2e', cloth)); [[0, .6, 0], [0, -.6, Math.PI]].forEach(([x, z, r]) => { const c = FB.chair('#8a5a36'); c.position.set(x, 0, z); c.rotation.y = r; g.add(c); }); FB.box(g, .08, .25, .08, '#3a6a2a', .1, .78); FB.box(g, .1, .1, .1, '#f4f0e8', -.15, .78); return g; },
  };
  // disposizione per tipo: [pezzo, u (0..1 in larghezza), v (0..1 in profondità), rotazione]. v=0 è la facciata.
  const LAYOUT = {
    casa: r => [['sofa', .3, .78, 0, pick(r, ['#8a3a4a', '#3a5a8a', '#6a7a3a', '#c8a060'])], ['tv', .3, .2, Math.PI], ['rug', .3, .5, 0, 2.4, 1.6, '#8a4a3a'], ['armchair', .75, .7, -.6, '#6a4a3a'], ['sideboard', .7, .95, 0], ['lamp', .08, .9], ['plant', .92, .2], ['dining', .75, .35, 0]],
    bar: () => [['counter', .45, .72, 0, 3.2, '#6a3a24'], ['bottles', .45, .96, 0, 3], ['espresso', .25, .72, 0], ['stool', .2, .5], ['stool', .4, .5], ['stool', .6, .5], ['cafeTable', .85, .3, 0, '#f4f0e8'], ['fridge', .9, .9, 0, '#8ae0ff']],
    trattoria: () => [['cafeTable', .2, .3, 0, '#e84a4a'], ['cafeTable', .55, .3, 0, '#e84a4a'], ['cafeTable', .2, .75, 0, '#e84a4a'], ['cafeTable', .55, .75, 0, '#e84a4a'], ['counter', .88, .6, -Math.PI / 2, 2, '#6a4228'], ['bottles', .88, .96, 0, 1.4]],
    alimentari: () => [['shelf', .25, .92, 0, 2.2, ['#e84a3a', '#f0c020', '#3a8ae0', '#f4f0e8', '#6ac03a']], ['shelf', .75, .92, 0, 2.2, ['#c83a6a', '#f0e0a0', '#3aa0a0', '#e89a3a']], ['counter', .2, .45, 0, 1.6, '#c8b890'], ['crates', .6, .3], ['crates', .75, .35], ['fridge', .95, .5, -Math.PI / 2, '#aee8ff']],
    gelateria: () => [['freezer', .45, .6, 0], ['stool', .2, .3], ['stool', .4, .3], ['cafeTable', .85, .3, 0, '#ff9ab8'], ['fridge', .9, .9, 0, '#ffd0e8']],
    videoteca: () => [['vhs', .25, .94, 0, 2.2], ['vhs', .75, .94, 0, 2.2], ['vhs', .08, .5, Math.PI / 2, 1.6], ['counter', .7, .4, 0, 1.6, '#2a2a3a'], ['tv', .7, .45, 0]],
    giochi: () => [['arcade', .15, .9], ['arcade', .32, .9], ['arcade', .49, .9], ['arcade', .66, .9], ['pinball', .3, .45], ['pinball', .6, .45], ['arcade', .9, .6, -Math.PI / 2]],
    chiesa: () => [['altar', .5, .92], ['pew', .3, .6, 0, 1.8], ['pew', .7, .6, 0, 1.8], ['pew', .3, .35, 0, 1.8], ['pew', .7, .35, 0, 1.8], ['lamp', .1, .9, 0, '#ffc060']],
    ambulatorio: () => [['medbed', .25, .6, 0], ['cabinet', .6, .95], ['cabinet', .8, .95], ['desk', .75, .4, Math.PI], ['chair', .75, .25, Math.PI]],
    biblioteca: () => [['bookcase', .2, .95, 0, 1.8], ['bookcase', .5, .95, 0, 1.8], ['bookcase', .8, .95, 0, 1.8], ['dining', .45, .45, 0, '#5a3820'], ['lamp', .9, .4]],
    polizia: () => [['desk', .25, .5, Math.PI], ['desk', .7, .5, Math.PI], ['chair', .25, .7], ['chair', .7, .7], ['filing', .1, .93], ['filing', .25, .93], ['filing', .9, .93]],
    officina: () => [['bench', .4, .92, 0, 2.6], ['tires', .88, .85], ['tires', .88, .6], ['drum', .1, .9, 0, '#c83a2a'], ['drum', .1, .7, 0, '#2a5a8a'], ['vespa', .5, .45, .5]],
    magazzino: () => [['crates', .15, .85], ['crates', .35, .85], ['crates', .55, .88], ['drum', .8, .9, 0, '#2a6a3a'], ['drum', .9, .75, 0, '#c8a020'], ['crates', .75, .45], ['crates', .25, .4]],
    hotel: r => [['reception', .6, .85, 0], ['sofa', .2, .35, 0, pick(r, ['#e87aa0', '#7ad0c0', '#f0c060'])], ['rug', .25, .4, 0, 2.6, 1.8, '#c84a6a'], ['plant', .05, .9], ['plant', .95, .9], ['luggage', .85, .45], ['armchair', .45, .3, -.4, '#f0c060']],
    disco: () => [['speaker', .08, .9], ['speaker', .92, .9], ['counter', .5, .93, 0, 2.4, '#1a1a2a', '#ff4fa3'], ['mirrorball', .5, .5], ['stool', .3, .75], ['stool', .7, .75]],
    cinema: () => [['screen', .5, .97, 0, 3], ['seats', .5, .7, 0, 3.6], ['seats', .5, .45, 0, 3.6], ['seats', .5, .2, 0, 3.6]],
  };
  const RESIDENTS = { casa: 2, bar: 3, trattoria: 3, alimentari: 2, gelateria: 2, videoteca: 2, giochi: 4, chiesa: 2, ambulatorio: 2, biblioteca: 2, polizia: 2, officina: 1, magazzino: 1, hotel: 2, disco: 5, cinema: 3 };
  const SKINS = ['#e6c2a2', '#c99a76', '#dcb08c', '#b8845e', '#f0cfb2'], TOPS = ['#c84a6a', '#3a6aa0', '#e8c060', '#6a8a4a', '#8a4ac0', '#f0f0e8', '#2a2a30', '#e87a3a', '#35b0c0'];
  function randomLook(kind, r) {
    if (kind === 'polizia') return { skin: pick(r, SKINS), top: '#23355e', bottom: '#1b2440', hair: '#2a1a12', hat: 'police', build: 1.05, extra: 'belt' };
    if (kind === 'chiesa' && r() < .5) return { skin: pick(r, SKINS), top: '#15151c', bottom: '#15151c', hair: '#8a8580', hat: 'none', build: 1, extra: 'collar' };
    if (kind === 'ambulatorio' && r() < .5) return { skin: pick(r, SKINS), top: '#e9f1f0', bottom: '#e9f1f0', hair: pick(r, ['#2a1a12', '#7a3b1f']), hat: 'long', build: .95, extra: '' };
    if ((kind === 'bar' || kind === 'trattoria') && r() < .4) return { skin: pick(r, SKINS), top: '#f1ece2', bottom: '#2b2b38', hair: '#1f1a17', hat: 'none', build: 1.1, extra: 'moustache,apron' };
    return { skin: pick(r, SKINS), top: pick(r, TOPS), bottom: pick(r, ['#2a2a33', '#34425f', '#4a3a2a', '#5a2a3a']), hair: pick(r, ['#2a1d14', '#555', '#b58a58', '#111', '#cfcac4']), hat: pick(r, ['none', 'none', 'long', 'bun', 'pony', 'flat', 'cap']), hatCol: pick(r, ['#3a3a44', '#8a1f1f', '#1f6f5c']), build: .9 + r() * .3, extra: pick(r, ['', '', 'glasses', 'moustache', 'shades']) };
  }

  function roomBreach(e) {
    const rec = DZ.bRec[e.b]; if (!rec || !rec.faces) return;
    const mx = e.mx, my = e.my, f = my < 0 ? 'S' : my > 0 ? 'N' : mx > 0 ? 'W' : 'E';
    const lat = mx ? 1 : 0; // 1: la larghezza corre lungo z
    const outer = e.cells.filter(c => !c[2]); if (!outer.length) return;
    const lo = Math.min(...outer.map(c => c[lat])), hi = Math.max(...outer.map(c => c[lat])) + 1;
    const depth = Math.max(...e.cells.map(c => c[2])) + 1;
    const c0 = outer[0], facePos = mx ? (mx > 0 ? c0[0] * TS : (c0[0] + 1) * TS) : (my > 0 ? c0[1] * TS : (c0[1] + 1) * TS);
    const W = (hi - lo) * TS, D = depth * TS, H = 3;
    const floorY = Math.max(...outer.map(c => groundH(c[0] * TS + 1, c[1] * TS + 1)));
    const kind = roomKind(rec.b), style = ROOM_STYLE[kind], r = rng(e.b * 97 + lo * 13 + (mx + 2) * 7 + (my + 2));
    // punto del mondo da coordinate della stanza: u lungo la larghezza, v verso l'interno
    const nx = mx, nz = my, wx = (u, v) => mx ? facePos + nx * v : lo * TS + u, wz = (u, v) => mx ? lo * TS + u : facePos + nz * v;
    // --- buco nella facciata: bordo di mattoni, poi l'alfa ritagliato ---
    const F = faceCtx(rec, f);
    if (F) {
      const P = (u, y) => facePx(rec, f, wx(u, 0) - nx * .01, wz(u, 0) - nz * .01, y), pts = [];
      const topY = floorY + 2.5, N = 18;
      pts.push(P(.12, floorY - .05));
      for (let k = 0; k <= 4; k++) pts.push(P(.12 + (Math.random() - .3) * .25, floorY + k / 4 * 2.3));
      for (let k = 0; k <= N; k++) { const u = .2 + k / N * (W - .4); pts.push(P(u, topY - Math.random() * .6 + (k % 3 === 0 ? .35 : 0))); }
      for (let k = 4; k >= 0; k--) pts.push(P(W - .12 - (Math.random() - .3) * .25, floorY + k / 4 * 2.3));
      pts.push(P(W - .12, floorY - .05));
      const path = (ctx, grow) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts[0][1]; ctx.beginPath(); pts.forEach(([a, b], k) => { const ax = cx + (a - cx) * grow, by = cy + (b - cy) * grow; k ? ctx.lineTo(ax, by) : ctx.moveTo(ax, by); }); ctx.closePath(); };
      const x = F.ctx, bb = pts.reduce((a, p) => [Math.min(a[0], p[0]), Math.min(a[1], p[1]), Math.max(a[2], p[0]), Math.max(a[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
      path(x, 1.12); x.save(); x.clip(); bricks(x, Math.floor(bb[0] - 6), Math.floor(bb[1] - 6), Math.ceil(bb[2] - bb[0] + 12), Math.ceil(bb[3] - bb[1] + 8)); x.restore();
      for (let k = 0; k < 14; k++) crack(x, bb[0] + Math.random() * (bb[2] - bb[0]), bb[1] + Math.random() * 6, 8 + Math.random() * 14, 'rgba(26,20,32,.8)');
      x.save(); x.globalCompositeOperation = 'destination-out'; path(x, 1); x.fill(); x.restore();
      path(F.ectx, 1.12); F.ectx.fillStyle = '#000'; F.ectx.fill();
      F.map.needsUpdate = true; F.emissive.needsUpdate = true;
      rec.mats.forEach(m => { if (m.map === F.map && m.alphaTest !== .5) { DZ.alphaMats.push([m, m.alphaTest]); m.alphaTest = .5; m.needsUpdate = true; } });
    }
    // --- scatola della stanza, vista dall'interno ---
    const room = G0(); room.userData.kind = kind;
    const back = wallCanvas(style, W, H, r, true), side = wallCanvas(style, D, H, r, false), fl = floorCanvas(kind, mx ? D : W, mx ? W : D, r);
    const ceil = std({ color: kind === 'disco' || kind === 'giochi' ? '#10081a' : '#e8e4dc', side: THREE.BackSide });
    const wm = t => std({ map: t, side: THREE.BackSide, roughness: .9 }), backM = wm(back), sideM = wm(side), floorM = std({ map: fl, side: THREE.BackSide, roughness: .8 });
    const sx = mx ? D : W, sz = mx ? W : D;
    // ordine delle facce del box: +x, -x, +y, -y, +z, -z. La parete dal lato della facciata non si vede mai da fuori (BackSide).
    const faceMat = dir => { if (mx) return dir === 'x' ? backM : sideM; return dir === 'z' ? backM : sideM; };
    const mats = [faceMat('x'), faceMat('x'), ceil, floorM, faceMat('z'), faceMat('z')];
    const bx = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), mats); bx.receiveShadow = true;
    bx.position.set(wx(W / 2, D / 2), floorY + H / 2 - .02, wz(W / 2, D / 2)); room.add(bx);
    // plafoniera
    const lampM = box(.8, .06, .3, sb(kind === 'disco' ? '#ff4fa3' : kind === 'giochi' ? '#35e6ff' : '#fff0c8')); lampM.position.set(wx(W / 2, D * .55), floorY + H - .1, wz(W / 2, D * .55)); room.add(lampM);
    scene.add(room);
    const L = addLight(wx(W / 2, D * .5), floorY + 2.4, wz(W / 2, D * .5), kind === 'disco' ? '#ff5ab0' : kind === 'giochi' ? '#5ad8ff' : kind === 'cinema' ? '#a0b8ff' : '#ffd8a0', 2.6, 8, kind === 'disco' ? .5 : .02);
    L.always = true;
    const R0 = { room, light: L, people: [], recs: [], kind, f, W, D, floorY, wx, wz, t0: DZ.time };
    ROOMS.push(R0); DZ.touched = true;
    // --- arredi: corpi fisici addormentati ---
    const rot = mx ? (mx > 0 ? -Math.PI / 2 : Math.PI / 2) : (my > 0 ? 0 : Math.PI); // fronte degli arredi verso la facciata
    (LAYOUT[kind] || LAYOUT.casa)(r).forEach(([name, u, v, ry, a1, a2, a3]) => {
      let g;
      if (name === 'vespa') { g = vespaMesh(pick(r, ['#8ab4e8', '#e8e0c8', '#c83a3a'])); g.userData.noMerge = true; }
      else if (FB[name]) g = FB[name](a1, a2, a3); else return;
      const U = clamp(u * W, .5, W - .5), V = clamp(v * D, .5, D - .45);
      g.position.set(wx(U, V), floorY, wz(U, V)); g.rotation.y = rot + (ry || 0); g.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g), c = bb.getCenter(new THREE.Vector3()), he = bb.getSize(new THREE.Vector3()).multiplyScalar(.5);
      const mass = clamp(he.x * he.y * he.z * 8 * .3, .05, 3);
      const fr = { tag: null, obj: g, c, c0: c.clone(), he, mass, cls: 'loose', state: 1, base: bb.min.y, hitT: -9, fragile: mass < .6, room: R0 };
      const b = liveBody(g, c, he, mass, fr); b.sleep = true; fr.body = b;
      hashPut(fr, c.x, c.z); DZ.roomRecs.push(fr); R0.recs.push(fr);
    });
    // --- chi ci stava dentro ---
    const n = RESIDENTS[kind] || 2;
    for (let k = 0; k < n; k++) {
      const g = person(randomLook(kind, r), false), U = .6 + r() * (W - 1.2), V = .8 + r() * (D - 1.3);
      const pp = { g, x: wx(U, V), z: wz(U, V), face: Math.atan2(-nz, -nx) + (r() - .5), state: 'shock', t: .4 + r() * .8, anim: r() * 6, down: false, tx: 0, tz: 0, sp: 0 };
      g.position.set(pp.x, floorY, pp.z); scene.add(g); R0.people.push(pp);
    }
    // polvere dentro
    for (let k = 0; k < 6; k++) smoke(wx(W / 2 + (Math.random() - .5) * W, D * .3), floorY + 1 + Math.random(), wz(W / 2 + (Math.random() - .5) * W, D * .3), '#b8aa98', 1.6, 1.6 + Math.random(), .5);
  }
  // le persone dentro: spavento, fuga in fondo alla stanza, rannicchiate. Un'auto che entra le travolge.
  function tickRooms(st, dt) {
    const vs = st.vehicles.filter(v => !v.hidden && Math.abs(v.speed) > 2);
    ROOMS.forEach(R0 => R0.people.forEach(pp => {
      pp.t -= dt; pp.sp = 0;
      if (!pp.down) {
        for (const v of vs) { const K = G.VK[v.kind], c = Math.cos(v.ang), s = Math.sin(v.ang), dx = pp.x - v.x, dz = pp.z - v.y; if (Math.abs(dx * c + dz * s) < K.len / 2 + .35 && Math.abs(-dx * s + dz * c) < K.wid / 2 + .35) { pp.down = true; pp.face = v.ang + Math.PI; decal(pp.x + c, pp.z + s, .5, '#4a0810', .9); emitPts(FX.wet, pp.x, R0.floorY + 1, pp.z, c * 3, 2, s * 3, 2, 12, '#8a1018', .5, 12); sound('botto', pp.x, pp.z); } }
        if (pp.state === 'shock' && pp.t <= 0) { pp.state = 'flee'; const U = .5 + Math.random() * (R0.W - 1), V = R0.D - .55; pp.tx = R0.wx(U, V); pp.tz = R0.wz(U, V); }
        if (pp.state === 'flee') { const dx = pp.tx - pp.x, dz = pp.tz - pp.z, d = Math.hypot(dx, dz); if (d < .15) { pp.state = 'cower'; pp.face = Math.atan2(-dz, -dx); } else { const sp = Math.min(d / dt, 3.6); pp.x += dx / d * sp * dt; pp.z += dz / d * sp * dt; pp.face = Math.atan2(dz, dx); pp.sp = sp; } }
      }
      pp.anim += dt * (pp.sp ? pp.sp * 3.2 : 1);
      pp.g.position.set(pp.x, R0.floorY, pp.z); pp.g.rotation.y = Math.PI / 2 - pp.face;
      animPerson(pp.g, { anim: pp.anim, speed: pp.sp, down: pp.down, handsUp: !pp.down && pp.state !== 'flee', gesture: 0 });
      if (pp.g.userData.shadowC) pp.g.userData.shadowC.visible = !pp.down;
    }));
  }
  // un'esplosione vicina butta a terra chi è dentro
  function blastRooms(x, z, R) { ROOMS.forEach(R0 => R0.people.forEach(pp => { if (!pp.down && Math.hypot(pp.x - x, pp.z - z) < R) { pp.down = true; pp.face = Math.atan2(pp.z - z, pp.x - x) + Math.PI; } })); }
  function resetRooms() {
    ROOMS.forEach(R0 => { scene.remove(R0.room); R0.people.forEach(pp => scene.remove(pp.g)); const i = LSRC.indexOf(R0.light); if (i >= 0) LSRC.splice(i, 1); });
    ROOMS.length = 0; dyn.lsorted = null;
    DZ.roomRecs.forEach(hashDel); DZ.roomRecs.length = 0;
    DZ.alphaMats.forEach(([m, a]) => { m.alphaTest = a; m.needsUpdate = true; }); DZ.alphaMats.length = 0;
  }

  // ----- urti per fotogramma -----
  function tickDestruction(st, dt) {
    DZ.time += dt;
    if (DZ.lastSt !== st) { if (DZ.touched) resetDestruction(); DZ.lastSt = st; }
    const p = st.player;
    st.vehicles.forEach(v => {
      if (v.hidden) return; const vx = v.vx !== undefined ? v.vx : Math.cos(v.ang) * v.speed, vz = v.vy !== undefined ? v.vy : Math.sin(v.ang) * v.speed, sp = Math.hypot(vx, vz); if (sp < 1.2) return;
      const K = G.VK[v.kind], c = Math.cos(v.ang), s = Math.sin(v.ang), vh = groundH(v.x, v.y);
      hashNear(v.x, v.y, K.len / 2 + 2.5, rec => {
        if (rec.state === 2) return; const pp = recPos(rec);
        if (pp.y - rec.he.y > vh + 1.4 || pp.y + rec.he.y < vh - .3) return; // sopra un muro o sotto un ponte
        const dx = pp.x - v.x, dz = pp.z - v.y, lx = dx * c + dz * s, ly = -dx * s + dz * c, r = Math.min(rec.he.x, rec.he.z) * .8;
        if (Math.abs(lx) > K.len / 2 + r || Math.abs(ly) > K.wid / 2 + r) return;
        if (rec.state === 1 && rec.body && !rec.body.sleep && DZ.time - rec.body.hitT < .3) return;
        const side = Math.sign(ly || (Math.random() - .5)), k = 1.1 + Math.random() * .45, lat = sp * (.25 + Math.random() * .3);
        if (rec.state === 1 && rec.body) { wake(rec.body); rec.body.hitT = DZ.time; rec.hitT = -9; }
        if (rec.state === 0) DZ.hits.push({ v: v.id, m: rec.cls === 'topple' ? Math.max(rec.mass, 1.2) : rec.mass });
        knock(rec, vx * k - s * side * lat, 2 + sp * (.28 + Math.random() * .25), vz * k + c * side * lat, sp * .7, sp, { car: true });
      });
      // i corpi già in volo o fermi fuori dalla griglia
      if (sp > 2.5) sweepDebris(v.x, v.y, c, s, K.len / 2 + .2, K.wid / 2 + .2, vx, vz, sp);
    });
    // a piedi si calciano le cose leggere
    if (!p.vehicle && Math.abs(p.speed) > 1.5) {
      const c = Math.cos(p.face), s = Math.sin(p.face), ph = groundH(p.x, p.y);
      hashNear(p.x, p.y, 1.6, rec => { if (rec.state === 2 || rec.mass > .3) return; const pp = recPos(rec); if (pp.y - rec.he.y > ph + .6) return; const d = Math.hypot(pp.x - p.x, pp.z - p.y); if (d > Math.max(rec.he.x, rec.he.z) + .35) return; const sp = Math.abs(p.speed); if (rec.state === 1 && rec.body) { wake(rec.body); rec.hitT = -9; } knock(rec, c * sp * 1.1, 1.5 + sp * .15, s * sp * 1.1, 4, sp * .6); });
    }
    tickBodies(dt); tickDebris(dt); tickRooms(st, dt);
    DZ.dirty.forEach(F => F.map.needsUpdate = true); DZ.dirty.clear();
  }
  // i proiettili spostano e rompono gli oggetti che attraversano
  function bulletProps(e) {
    const dx = e.x1 - e.x0, dz = e.y1 - e.y0, L = Math.hypot(dx, dz); if (L < .1) return; const ux = dx / L, uz = dz / L, h0 = groundH(e.x0, e.y0) + 1.2;
    let best = null, bt = 1e9;
    for (let t = 0; t <= L + 2; t += 3) hashNear(e.x0 + ux * t, e.y0 + uz * t, 2.2, rec => {
      if (rec.state === 2) return; const pp = recPos(rec), qx = pp.x - e.x0, qz = pp.z - e.y0, along = qx * ux + qz * uz; if (along < .3 || along > L + .2) return;
      const off = Math.abs(qx * uz - qz * ux), r = Math.max(rec.he.x, rec.he.z) + .05; if (off > r) return;
      if (pp.y + rec.he.y < h0 - .9 || pp.y - rec.he.y > h0 + .5) return;
      if (along < bt) { bt = along; best = rec; }
    });
    if (!best) return;
    const f = e.w === 'lupara' ? 7 : e.w === 'mitra' ? 5 : 6;
    if (best.state === 0 && shootLamp(best)) return;
    if (best.state === 1 && best.body) { wake(best.body); best.hitT = -9; }
    if (best.fragile && Math.random() < (best.mass < .12 ? 1 : .6)) return shatter(best, ux * f, 2.5, uz * f, 3);
    knock(best, ux * f, 2 + Math.random() * 2, uz * f, 8, f);
  }
  function blastProps(x, z, R, power) {
    const h = groundH(x, z);
    hashNear(x, z, R, rec => {
      if (rec.state === 2) return; const pp = recPos(rec), dx = pp.x - x, dz = pp.z - z, d = Math.hypot(dx, dz); if (d > R || Math.abs(pp.y - h) > 6) return;
      const k = 1 - d / R, ux = dx / (d || 1), uz = dz / (d || 1), f = power * k;
      if (rec.state === 1 && rec.body) { wake(rec.body); rec.hitT = -9; }
      knock(rec, ux * f, 4 + f * .55, uz * f, f * .8, f, { blast: k });
    });
    DZ.bodies.forEach(b => { const dx = b.g.position.x - x, dz = b.g.position.z - z, d = Math.hypot(dx, dz); if (d > R) return; const k = 1 - d / R; wake(b); b.v.x += dx / (d || 1) * power * k; b.v.z += dz / (d || 1) * power * k; b.v.y += 3 + power * k * .5; b.w.set(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(power * k); });
    const D = DZ.debris; if (D) for (let i = 0; i < D.N; i++) { if (!D.live[i]) continue; const j = i * 3, dx = D.P[j] - x, dz = D.P[j + 2] - z, d = Math.hypot(dx, dz); if (d > R) continue; const k = 1 - d / R; D.V[j] += dx / (d || 1) * power * k; D.V[j + 2] += dz / (d || 1) * power * k; D.V[j + 1] += 3 + power * k * .5; D.live[i] = 1; }
  }
  function resetDestruction() {
    TAGS.forEach((t, k) => { showTag(k); t.parts.forEach(p => { if (p.gone && p.bak) { const a = p.b.mesh.geometry.attributes.position; a.array.set(p.bak, p.b.offs[p.gi] * 3); a.needsUpdate = true; p.gone = false; } }); t.objs.forEach(o => o.userData.gone = false); });
    DZ.bodies.slice().forEach(b => scene.remove(b.g)); DZ.bodies.length = 0;
    DZ.props.forEach(rec => { rec.state = 0; rec.body = null; rec.hitT = -9; rec.lampOut = false; hashPut(rec, rec.c0.x, rec.c0.z); if (rec.light) { rec.light.base = rec.lbase; if (rec.glowS) rec.glowS.visible = true; } });
    const D = DZ.debris; if (D) { D.live.fill(0); const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < D.N; i++) D.m.setMatrixAt(i, zero); D.m.instanceMatrix.needsUpdate = true; }
    DZ.rubble.forEach(m => { scene.remove(m); m.geometry.dispose(); }); DZ.rubble.length = 0;
    if (SKID.geo) { const a = SKID.geo.attributes.position.array; for (let i = 1; i < a.length; i += 3) a[i] = -99; SKID.geo.attributes.position.needsUpdate = true; }
    DZ.faces.forEach(F => { if (F.glass) F.glass.forEach(g => g.broken = false); F.ctx.putImageData(F.bak, 0, 0); F.ectx.putImageData(F.ebak, 0, 0); F.map.needsUpdate = true; F.emissive.needsUpdate = true; F.bak = null; }); DZ.faces.clear();
    resetRooms();
    DZ.touched = false;
  }

  // chi viene investito vola: parabola e capriola, poi atterra nella posa a terra
  function flight(g, o, st) {
    if (o.airT === undefined) return; const k = (st.clock - o.airT) / (o.airDur || 1); if (k < 0 || k >= 1) return;
    const u = g.userData, h = 4 * (o.airH || 1) * k * (1 - k), turns = Math.abs(o.airSpin || 1) > 1.5 ? 1 : 0;
    g.position.y += h + Math.sin(k * Math.PI) * .4;
    u.body.rotation.x = -k * (Math.PI / 2 + Math.PI * 2 * turns); u.body.rotation.z = (o.airSpin || 1) * Math.sin(k * Math.PI) * .6;
    u.body.position.y = .2 * k; u.body.position.z = -.4 * k;
    u.armL.rotation.x = -2.4 + Math.sin(k * 20) * .8; u.armR.rotation.x = -2.2 + Math.cos(k * 18) * .8; u.legL.rotation.x = Math.sin(k * 16) * .9; u.legR.rotation.x = -Math.sin(k * 16) * .9;
    if (u.shadowC) { u.shadowC.visible = true; u.shadowC.position.y = .02 - h - Math.sin(k * Math.PI) * .4; }
  }

  // ---------------- AGGIORNAMENTO PER FOTOGRAMMA ----------------
  function nightLevel(t) { const h = (t / 60) % 24; if (h >= 21 || h < 5) return 1; if (h >= 18) return (h - 18) / 3; if (h < 7.5) return (7.5 - h) / 2.5; return 0; }
  function duskLevel(t) { const h = (t / 60) % 24; return Math.max(0, 1 - Math.abs(h - 19.3) / 1.9) + Math.max(0, 1 - Math.abs(h - 6.3) / 1.2) * .7; }
  function isRaining(t) { const h = t / 60; return (h > 22.5 && h < 27) || (h > 44 && h < 47); }
  const tmpC = new THREE.Color(), V3 = new THREE.Vector3();
  const lerp = (a, b, k) => a + (b - a) * k;
  const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
  let frameN = 0, playerH = 0;
  const LFR = new THREE.Frustum(), LPM = new THREE.Matrix4(), LSPH = new THREE.Sphere();
  function updateLights(time, night, fx, fz) {   // [inverno28] studio luci
    frameN++;
    if (frameN % 4 === 1 || !dyn.lsp) {
      camera.updateMatrixWorld(); LPM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); LFR.setFromProjectionMatrix(LPM);
      const on = [];
      LSRC.forEach(L => { const dx = L.x - fx, dz = L.z - fz; L.d2 = dx * dx + dz * dz; if (L.d2 > 80 * 80) return; if (L.gy === undefined) L.gy = groundH(L.x, L.z);
        LSPH.center.set(L.x, (L.y + L.gy) / 2, L.z); LSPH.radius = Math.max(2, (L.dist || 8) * .6); if (LFR.intersectsSphere(LSPH)) on.push(L); });
      on.sort((a, b) => a.d2 - b.d2);
      const sp = [], pp = [];
      on.forEach(L => { const fire = L.flick >= .25 && L.y - L.gy < 2.2; if (!fire && sp.length < SPOOL.length) sp.push(L); else if (pp.length < PPOOL.length) pp.push(L); });
      dyn.lsp = sp; dyn.lpp = pp;
    }
    const kOf = L => { let k = L.always ? .06 + night * .94 : night * night;
      if (L.flick) k *= 1 - L.flick * .5 * (Math.sin(time * 13 + L.phase) * .5 + .5) * (Math.sin(time * 3.7 + L.phase * 2) > .3 ? 1 : .2);
      return k; };
    SPOOL.forEach((l, i) => {
      const L = dyn.lsp[i], cone = l.userData.cone;
      if (!L) { l.intensity = 0; cone.visible = false; return; }
      const k = kOf(L), hh = Math.max(1.2, L.y - L.gy);
      if (l.userData.src !== L) { l.userData.src = L; l.position.set(L.x, L.y, L.z); l.target.position.set(L.x, L.gy - 2, L.z); l.target.updateMatrixWorld(); l.color.copy(L.color);
        l.distance = (L.dist || 8) * 1.6 + hh; l.shadow.camera.far = l.distance; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate = true; }
      if (L.nb === undefined) { L.nb = 0; LSRC.forEach(o => { if (o !== L && Math.abs(o.x - L.x) < 7 && Math.abs(o.z - L.z) < 7) L.nb++; }); }   // [inverno29] vicine: si dividono la luce
      l.intensity = L.base * k * .55 / Math.sqrt(1 + L.nb * .6);   // [inverno30] la pozza a terra la fa la luce cotta
      const tall = hh > 2.8 && night > .25;
      cone.visible = tall && k > .05; if (cone.visible) { const rr = hh * .62; cone.position.set(L.x, L.y - .15, L.z); cone.scale.set(rr, hh - .1, rr); cone.material.color.copy(L.color); cone.material.opacity = .34 * Math.min(1, k); }   // [luci2] (la forma la dà lo shader)
    });
    for (let q = 0; q < 3; q++) { const l = SPOOL[(frameN * 3 + q) % SPOOL.length]; if (l && l.intensity > 0) l.shadow.needsUpdate = true; }
    PPOOL.forEach((l, i) => {
      const L = dyn.lpp[i]; if (!L) { l.intensity = 0; return; }
      l.position.set(L.x, L.y, L.z); l.color.copy(L.color); l.distance = L.dist; l.intensity = L.base * kOf(L) * .8;
    });
  }
  function frame(st, dt, ui) {
    const p = st.player, night = nightLevel(st.t), dusk = Math.min(1, duskLevel(st.t));
    updateChunks(cam.x, cam.y);
    horizonColor(night, dusk, tmpC);
    tmpC.lerp(FOGTEAL, .22 + night * .12); scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
    // [inverno] luce di neve: tanto cielo, poco sole
    hemi.intensity = .22 + (1 - night) * .3 - night * .03;   // [luci1] di notte meno cielo   // [inverno23] hemi.color.set(night > .5 ? '#4a5878' : dusk > .3 ? '#b8a8b0' : '#d4dae4'); hemi.groundColor.set(night > .5 ? '#2c3650' : '#7a8296');
    fillAmb.intensity = .12 + (1 - night) * .12; fillAmb.color.set(night > .5 ? '#2a3044' : '#6a6e78');
    moon.intensity = .25 + (1 - night) * .77;   // [luci1] di notte meno luna moon.color.set(night > .5 ? '#7e8eb8' : (dusk > .3 ? '#e0a888' : '#f2eee4'));
    moon.position.set(cam.x - 34 - dusk * 18, 22 - dusk * 8, cam.y - 30); moon.target.position.set(cam.x, 0, cam.y);
    if (dyn.fill) { dyn.fill.position.set(cam.x + 8, 14, cam.y + 40); dyn.fill.target.position.set(cam.x, 0, cam.y); dyn.fill.intensity = .12 + (1 - night) * .06; dyn.fill.color.set(night > .5 ? '#5f86b4' : '#a8bcd0'); }
    if (dyn.rim) { dyn.rim.position.set(cam.x + 30, 18, cam.y + 34); dyn.rim.target.position.set(cam.x, 0, cam.y); dyn.rim.intensity = .1 + (1 - night) * .1; dyn.rim.color.set(night > .5 ? '#6a8ac8' : '#b8c8e8'); }
    dyn.buildings.forEach(b => b.mats.forEach(m => { if (m.emissiveMap) m.emissiveIntensity = .04 + night * .85; }));
    if (dyn.backdropMats) dyn.backdropMats.forEach(m => m.emissiveIntensity = .1 + night * .9);
    const time = ui.time || st.clock;
    updateLights(time, night, cam.x, cam.y);
    ISO.chunks.forEach(ch => { if (ch.mat) ch.mat.emissiveIntensity = night * .95; });   // [inverno30]
    if (frameN % 2 === 0 || !dyn.reflList) { dyn.reflList = (dyn.lsp || []).concat(dyn.lpp || []).concat(SPILLS.filter(S => { const a = S.x - cam.x, b = S.z - cam.y; return a * a + b * b < 38 * 38; })); }
    updateRefl(night, dyn.reflList);
    tickAir(time, night);   // [luci2]
    tickAir2(time, night);   // [luci3]
    dyn.flicker.forEach(f => { f.s.material.opacity = f.base * (.2 + night * .8) * (.85 + Math.sin(time * 9 + f.base * 7) * .15); });
    dyn.signs.forEach(s => { if (s.flick) { const on = Math.sin(time * 17) > -.85 || Math.sin(time * 2.3) > .2; s.m.color.setScalar(on ? 1 : .35); if (s.gl) s.gl.material.opacity = on ? .45 : .1; } });
    if (dyn.water) { const U = dyn.water.uniforms; U.time.value = time; U.night.value = night; U.dusk.value = dusk; U.fogC.value.copy(tmpC); U.camP.value.copy(camera.position); U.fogN.value = scene.fog.near; U.fogF.value = scene.fog.far; }
    if (dyn.sky) { dyn.sky.position.copy(camera.position); const U = dyn.sky.material.uniforms; U.night.value = night; U.dusk.value = dusk; U.time.value = time; const sunA = ((st.t / 60) % 24 - 12) / 12 * Math.PI; U.sun.value.set(-Math.cos(sunA * .5) * .9 - .2, Math.max(-.2, .55 - Math.abs((st.t / 60) % 24 - 13) / 12), -.35).normalize(); }
    if (dyn.skyline) { dyn.skyline.position.set(camera.position.x, 8, camera.position.z); dyn.skyline.material.opacity = .5 + night * .5; }
    dyn.boats.forEach(b => { b.g.position.y = (b.y !== undefined ? b.y : -.3) + Math.sin(time * 1.3 + b.ph) * .08; b.g.rotation.z = Math.sin(time * 1.1 + b.ph) * .04; });
    dyn.laundry.forEach(l => { if (l.ax === false) l.m.rotation.z = Math.sin(time * 2 + l.ph) * .25; else l.m.rotation.x = Math.sin(time * 2 + l.ph) * .25; });
    if (window.Models) Models.tick(st, time, night);
    tickWinter(time, night);
    dyn.spin.forEach(s => { s.o.rotation.y = time * s.speed; s.o.children.forEach(c => c.children.forEach(m => m.material.opacity = .015 + night * .06)); });
    dyn.beams.forEach(b => { b.piv.rotation.z = Math.sin(time * .6 + b.ph) * .45; b.piv.rotation.x = Math.cos(time * .45 + b.ph) * .3; b.mat.opacity = .02 + night * .13; });
    dyn.chasers.forEach(c => { const n = c.bulbs.length; c.bulbs.forEach((b, i) => b.material.color.set(((i + Math.floor(time * 8)) % 3) === 0 ? '#fff4c0' : '#6a4a20')); });
    dyn.gulls.forEach(g => { const a = time * g.sp + g.ph; g.g.position.set(g.cx + Math.cos(a) * g.rad, g.h + Math.sin(a * 2.3) * .8, g.cz + Math.sin(a) * g.rad); g.g.rotation.y = -a; const f = Math.sin(time * 9 + g.ph) * .5; g.wl.rotation.z = f; g.wr.rotation.z = -f; });
    if (dyn.lanterna) { const a = time * .8; dyn.lanterna.position.set(camera.position.x - 130, 22, camera.position.z - 60); dyn.lanterna.material.opacity = (.35 + .65 * Math.max(0, Math.sin(a))) * (.3 + night * .7); }
    if (dyn.antenna) dyn.antenna.material.opacity = Math.sin(time * 3) > 0 ? .9 : .15;

    // persone
    const pveh = p.vehicle ? st.vehicles.find(v => v.id === p.vehicle) : null;
    st.npcs.forEach(n => {
      let g = dyn.people[n.id];
      // [popolo] il modello si crea solo per chi si vede; gli abitanti lontani (popolo.js) lo liberano
      if (n.inside || (n.pop && !n.pop.near)) { if (g) { g.visible = false; if (n.pop && !n.pop.near) { scene.remove(g); delete dyn.people[n.id]; } } return; }
      if (g && g.userData.voxelWait && window.Models && Models.charsReady()) { scene.remove(g); g = null; }
      if (!g) { const who = n.cop || n.military ? 'cop' : null; g = (window.Models && Models.charsReady() && Models.person(n.look, who)) || person(n.look, false); if (!g.userData.model) g.userData.voxelWait = !!window.Models; scene.add(g); dyn.people[n.id] = g; }
      g.visible = !n.inside;
      if (!g.visible) return;
      g.position.set(n.x, groundH(n.x, n.y), n.y); g.rotation.y = Math.PI / 2 - n.face;
      const armed = n.weapon && !n.dead && (n.action.name === 'combatte' || (n.cop && G.hostile(st, n)));
      if (g.userData.model) Models.animPerson(g, { speed: n.speedNow, down: n.stun > 0 || n.dead, weapon: armed ? n.weapon : null, held: n.hand || null, hit: Math.max(0, 1 - (st.clock - n.hitT) * 12), punch: n.gesture === 'punch' ? 1 : 0, handsUp: !n.dead && n.stun <= 0 && n.action.name === 'fugge' && n.panic <= 0 }, dt); else
      animPerson(g, { anim: n.anim, speed: n.speedNow, gesture: n.gesture, down: n.stun > 0 || n.dead, weapon: armed ? n.weapon : null, hit: Math.max(0, 1 - (st.clock - n.hitT) * 12), handsUp: !n.dead && n.stun <= 0 && n.action.name === 'fugge' && n.panic <= 0 && p.cur !== 'pugni' && Math.hypot(n.x - p.x, n.y - p.y) < 6, twoHand: n.cop });
      g.userData.shadowC.visible = !n.dead;
      flight(g, n, st);
    });
    let pg = dyn.people.__player;
    if (pg && pg.userData.voxelWait && window.Models && Models.charsReady()) { scene.remove(pg); pg = null; dyn.people.__player = null; }
    if (!pg) {
      const plook = { skin: '#dcae88', top: '#8c2f24', bottom: '#34425f', hair: '#17110e', hat: 'none', build: 1.05, extra: '' };
      pg = (window.Models && Models.charsReady() && Models.person(plook, 'player')) || person(plook, true); if (!pg.userData.model) pg.userData.voxelWait = !!window.Models; scene.add(pg); dyn.people.__player = pg;
      const xray = new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: .5, depthWrite: false, depthTest: false });
      const ghosts = []; pg.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && !o.userData.noGhost) ghosts.push(o); });
      dyn.ghosts = ghosts.map(o => { const gm = new THREE.Mesh(o.geometry, xray); gm.renderOrder = 999; gm.visible = false; o.add(gm); return gm; });
      const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 16), new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: .7, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; pg.add(ring);
    }
    const onVespa = pveh && pveh.kind === 'vespa';
    { const lh = typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; playerH = lh !== null ? lh : groundH(p.x, p.y); if (p.indoor && window.InterniArte && InterniArte.floorY() != null) playerH = InterniArte.floorY(); }   // [interni] al chiuso si cammina sul pavimento   // [monte]
    pg.visible = !pveh || onVespa;
    pg.position.set(p.x, playerH + (onVespa ? .35 : 0), p.y); pg.rotation.y = Math.PI / 2 - p.face;
    const recoil = st.kick ? Math.max(0, 1 - (st.clock - st.kick.t) * 10) * st.kick.amt * 3 : 0;
    if (pg.userData.model) Models.animPerson(pg, { speed: pveh ? 0 : p.speed, punch: p.punch, down: p.stun > 0, weapon: p.cur !== 'pugni' ? p.cur : null, held: p.hand || null, hit: Math.max(0, 1 - (st.clock - p.hurtT) * 10) * .6 }, dt); else
    animPerson(pg, { anim: p.anim, speed: pveh ? 0 : p.speed, carrying: p.carrying, punch: p.punch, seated: onVespa, down: p.stun > 0, weapon: p.cur !== 'pugni' ? p.cur : null, recoil, hit: Math.max(0, 1 - (st.clock - p.hurtT) * 10) * .6 });
    if (!pveh) flight(pg, p, st);
    for (const k in pg.userData.guns) { const fl = pg.userData.guns[k].userData.model.userData.flame; if (fl) { fl.material.opacity = .7 + Math.random() * .3; fl.scale.set(.2 + Math.random() * .06, .28 + Math.random() * .1, 1); } }
    // veicoli
    st.vehicles.forEach(v => {
      let g = dyn.vehicles[v.id]; if (g && ((g.userData.rev || 0) !== (v.rev || 0) || (g.userData.glbWait && Models.has(G.VK[v.kind].glb)))) { scene.remove(g); g = null; } if (!g) { g = vehicleMesh(v); g.userData.rev = v.rev || 0; scene.add(g); dyn.vehicles[v.id] = g; }
      g.visible = !v.hidden; if (!g.visible) return;
      const u = g.userData, K = G.VK[v.kind], ca = Math.cos(v.ang), sa = Math.sin(v.ang), hl = K.len / 2 - .3;
      const hF = groundH(v.x + ca * hl, v.y + sa * hl), hR = groundH(v.x - ca * hl, v.y - sa * hl);
      // sospensioni: una molla smorzata porta la scocca verso il carico (curva → rollio, gas e freno → beccheggio)
      const sd = Math.min(dt, 1 / 20), latA = v.latA || 0, longA = v.longA || 0;
      const rollT = u.two ? (v.rider ? clamp(latA * .045, -.5, .5) : 0) : clamp(-latA * .011, -.1, .1), pitchT = u.two ? 0 : clamp(-longA * .0055, -.06, .07);
      u.roll = u.roll || 0; u.pitch = u.pitch || 0; u.hop = u.hop || 0; u.rv = u.rv || 0; u.pv = u.pv || 0; u.hv = u.hv || 0;
      u.rv += ((rollT - u.roll) * (u.two ? 40 : 70) - u.rv * 8) * sd; u.roll += u.rv * sd;
      u.pv += ((pitchT - u.pitch) * 80 - u.pv * 9) * sd; u.pitch += u.pv * sd;
      u.hv += (-u.hop * 120 - u.hv * 10) * sd; u.hop += u.hv * sd;
      g.position.set(v.x, (hF + hR) / 2 + u.hop * .12, v.y); g.rotation.y = Math.PI / 2 - v.ang; g.rotation.x = -Math.atan2(hF - hR, hl * 2) + u.pitch;
      g.rotation.z = u.roll;
      v.lastAng = v.ang;
      // ruote che girano e sterzano
      u.spin += (v.speed || 0) * dt; u.steer += (clamp(-(v.steer || 0) * .55, -.55, .55) - u.steer) * Math.min(1, dt * 12);
      skidTrack(v, u, g, dt);
      u.wheels.forEach(w => { w.wh.rotation.x = u.spin / w.r; if (w.front) w.piv.rotation.y = u.steer; });
      // danni progressivi
      if (v.hp < u.hpSeen - .5 && !v.wreck) {
        let hit = null; const lm = FX.lastMetal;
        if (lm && performance.now() - lm.t < 200 && Math.hypot(lm.x - v.x, lm.y - v.y) < 3.5) { const dx = lm.x - v.x, dz = lm.y - v.y; hit = [dx * Math.cos(-(Math.PI / 2 - v.ang)) - dz * Math.sin(-(Math.PI / 2 - v.ang)), .6, dx * Math.sin(-(Math.PI / 2 - v.ang)) + dz * Math.cos(-(Math.PI / 2 - v.ang))]; }
        else hit = [(Math.random() - .5) * K.wid, .55, (Math.random() < .6 ? 1 : -1) * K.len * .42];
        applyDamage(v, u, hit);
      }
      u.hpSeen = v.hp;
      if (v.wreck && !u.burnt) { u.burnt = true; u.paint.forEach(m => { m.color.set('#141012'); m.roughness = 1; m.metalness = 0; }); if (u.drv) u.drv.visible = false; if (u.drv2) u.drv2.visible = false; if (u.glass) u.glass.color.set('#050505'); g.rotation.z = .05; u.wheels.forEach(w => w.wh.scale.setScalar(.85)); }
      if (u.drv) u.drv.visible = !v.wreck && (v.rider === 'player' || v.traffic || (v.police && v.rider === 'npc' && !v.arrived));
      if (u.drv2) u.drv2.visible = !v.wreck && v.police && v.rider === 'npc' && !v.arrived;
      const lampsOn = !v.wreck && (v.traffic || v.rider) && night > .3;
      u.glows.forEach(s => { s.visible = lampsOn && !s.userData.broken; s.material.opacity = .7; });
      u.beams.forEach(b => b.visible = lampsOn && !b.userData.broken); u.pool.visible = lampsOn;
      const braking = (v.lastSpeed !== undefined && Math.abs(v.speed) < Math.abs(v.lastSpeed) - 6 * dt && Math.abs(v.speed) > .5) || (v.skid > .5 && (v.rider || v.traffic)); v.lastSpeed = v.speed;
      u.tailGlows.forEach(s => { s.visible = !v.wreck && (lampsOn || braking); s.material.opacity = braking ? .9 : .4; s.scale.setScalar(braking ? 1.1 : .7); });
      if (u.tlMat) u.tlMat.color.set(braking ? '#ff3a3a' : lampsOn ? '#d02020' : '#8a1010');
      if (u.beacons) { const on = v.siren && Math.sin(st.clock * 14) > 0; u.beacons[0].color.set(on ? '#3a7aff' : '#10204a'); u.beacons[1].color.set(!on && v.siren ? '#3a7aff' : '#10204a'); }
    });
    for (const id in dyn.vehicles) if (!st.vehicles.find(v => v.id === id)) { scene.remove(dyn.vehicles[id]); delete dyn.vehicles[id]; }
    for (const id in dyn.people) if (id !== '__player' && !st.npcs.find(n => n.id === id)) { scene.remove(dyn.people[id]); delete dyn.people[id]; }
    if (pveh) { const h = groundH(pveh.x, pveh.y); dyn.headlight.intensity = 4 * (.2 + night) * (pveh.wreck ? 0 : 1); dyn.headlight.position.set(pveh.x + Math.cos(pveh.ang) * 1.6, h + 1.1, pveh.y + Math.sin(pveh.ang) * 1.6); dyn.headlight.target.position.set(pveh.x + Math.cos(pveh.ang) * 12, h, pveh.y + Math.sin(pveh.ang) * 12); } else dyn.headlight.intensity = 0;
    // oggetti da raccogliere
    st.pickups.forEach(k => {
      let m = FX.pickups[k.id]; if (!m) { m = pickupMesh(k.kind); scene.add(m); FX.pickups[k.id] = m; }
      m.visible = G.pickupVisible(st, k); m.position.set(k.x, groundH(k.x, k.y), k.y);
      m.userData.g.rotation.y = time * 1.8; m.userData.g.position.y = .7 + Math.sin(time * 3 + k.id) * .12;
      m.userData.icon.position.y = 2.2 + Math.sin(time * 2 + k.id) * .1; const dd = Math.hypot(k.x - p.x, k.y - p.y); m.userData.icon.material.opacity = Math.min(1, Math.max(.35, (dd - 1.5) / 3));
    });
    for (const id in FX.pickups) if (!st.pickups.find(k => String(k.id) === id)) { scene.remove(FX.pickups[id]); delete FX.pickups[id]; }
    // effetti
    st.__hurt = 0;
    if (DZ.lastSt !== st) tickDestruction(st, 0);
    st.fx.forEach(e => spawnFx(st, e)); st.fx.length = 0;
    tickFx(st, dt, night); tickDestruction(st, Math.min(dt, 1 / 20));

    if (dyn.mark) { const m = ui.mark; dyn.mark.visible = !!m && !ui.intro; if (m) { const k = (ui.time || 0) - m.t, s = (m.k === 'car' ? 2.6 : 1) * (1 + Math.max(0, .5 - k) * 1.5 + Math.sin(k * 6) * .06); dyn.mark.position.set(m.x, groundH(m.x, m.y) + .06, m.y); dyn.mark.scale.setScalar(s); } }
    if (dyn.aim) { dyn.aim.visible = !!ui.aimPoint && !ui.intro && !ui.dialogNpc && !pveh; if (ui.aimPoint) dyn.aim.position.set(ui.aimPoint.x, groundH(ui.aimPoint.x, ui.aimPoint.y) + .05, ui.aimPoint.y); }
    const armedP = !pveh && p.cur !== 'pugni' && p.cur !== 'molotov' && ui.aimPoint && !ui.intro && !ui.dialogNpc;
    dyn.laser.visible = !!armedP;
    if (armedP) { const a = p.face, L = Math.min(G.WEAPONS[p.cur].range, Math.hypot(ui.aimPoint.x - p.x, ui.aimPoint.y - p.y)); dyn.laser.position.set(p.x + Math.cos(a) * (.6 + L / 2), playerH + 1.25, p.y + Math.sin(a) * (.6 + L / 2)); dyn.laser.scale.set(.025, .025, L); dyn.laser.lookAt(p.x + Math.cos(a) * (L + .6), playerH + 1.25, p.y + Math.sin(a) * (L + .6)); }
    const jt = G.jobTarget(st);
    dyn.markers.g.visible = !!jt;
    if (jt) { dyn.markers.g.position.set(jt.x, groundH(jt.x, jt.y), jt.y); dyn.markers.dia.rotation.y = time * 2; dyn.markers.dia.position.y = 2.6 + Math.sin(time * 3) * .25; }

    // [inverno] neve: fiocchi che scendono piano e ondeggiano; durante la bufera il doppio, più veloci e storti
    const raining = isRaining(st.t);
    const R = dyn.rain; R.m.visible = NEVE && !p.indoor; const heavy = raining ? 1 : 0, nOn = raining ? Math.floor(R.N * .8) : Math.floor(R.N * .22), span = 70 + (ui.zoom || 1) * 20;
    for (let i = 0; i < R.N; i++) { const s = R.seeds[i]; if (i >= nOn) { R.pos.set([0, -50, 0, 0, -50, 0], i * 6); continue; } const sp = 1.4 + s[2] * .8 + heavy * 2.5, y = cam.h + 22 - ((time * sp + s[2] * 22) % 22); const sw = Math.sin(time * (.8 + s[0]) + i) * .8 + heavy * (22 - (y - cam.h)) * .6; const x = cam.x + (s[0] - .5) * span + sw, z = cam.y + (s[1] - .5) * span; R.pos.set([x, y, z, x, y, z], i * 6); }
    R.m.geometry.attributes.position.needsUpdate = true; R.m.material.size = .1 + heavy * .05; R.m.material.opacity = .55 + heavy * .25;
    const Mo = dyn.motes; for (let i = 0; i < Mo.M; i++) { const s = Mo.s[i]; Mo.p.set([cam.x + (s[0] - .5) * 40 + Math.sin(time * .3 + i) * 1.5, cam.h + ((time * .25 + s[2] * 6) % 6), cam.y + (s[1] - .5) * 40], i * 3); }
    Mo.m.geometry.attributes.position.needsUpdate = true; Mo.m.material.opacity = (.15 + night * .5) * .35;

    // ---------- camera cinematografica ----------
    const driving = !!pveh && !ui.intro && !ui.dialogNpc;
    cam.drive += ((driving ? 1 : 0) - cam.drive) * Math.min(1, dt * 1.6);
    const D = cam.drive, ease = D * D * (3 - 2 * D);
    let tx = p.x, ty = p.y, tz = ui.zoom || 1;
    if (!pveh && ui.aimPoint && !ui.intro && !ui.dialogNpc) { const la = p.cur !== 'pugni' ? .28 : .12; const dx = ui.aimPoint.x - p.x, dy = ui.aimPoint.y - p.y, l = Math.hypot(dx, dy), m = Math.min(l * la, p.cur !== 'pugni' ? 5 : 2.5); if (l > .1) { tx += dx / l * m; ty += dy / l * m; } tz *= p.cur !== 'pugni' ? 1.12 : 1; }
    if (pveh) {
      const vsp = pveh.vx !== undefined ? Math.hypot(pveh.vx, pveh.vy) : Math.abs(pveh.speed);
      const head = vsp > 3 && pveh.speed > -1 ? angLerp(pveh.ang, Math.atan2(pveh.vy, pveh.vx), .6) : pveh.ang;
      let lead = pveh.speed < -1 ? 3 : 5 + Math.max(0, vsp) * .75;
      for (let L = 0; L <= lead; L += .5) { const x = pveh.x + Math.cos(head) * L, z = pveh.y + Math.sin(head) * L; if (G.tileAt(Math.floor(x / G.TS), Math.floor(z / G.TS)) === G.T.BLD) { lead = Math.max(0, L - 1.2); break; } }
      tx = pveh.x + Math.cos(head) * lead; ty = pveh.y + Math.sin(head) * lead;
      const behind = Math.atan2(-Math.cos(head), -Math.sin(head));
      if (cam.drive < .05) cam.dyaw = cam.yaw;
      if (Math.abs(pveh.speed) > 1.2 || cam.drive < .9) cam.dyaw = angLerp(cam.dyaw, pveh.speed < -1 ? behind + Math.PI : behind, Math.min(1, dt * (1.6 + Math.abs(pveh.speed) * .08)));
    }
    if (ui.dialogNpc) { const n = G.byId(st, ui.dialogNpc); if (n) { tx = (p.x + n.x) / 2; ty = (p.y + n.y) / 2; } tz *= .6; }
    const mo = st.moments[0], focus = [[p.x, p.y]];
    if (mo && mo.npcs && !pveh) {
      const ns = mo.npcs.map(id => G.byId(st, id)).filter(n => n && !n.inside && Math.hypot(n.x - p.x, n.y - p.y) < 16);
      if (ns.length) { const w = ns[0]; tx = p.x * .55 + w.x * .45; ty = p.y * .55 + w.y * .45; tz *= .8; ns.forEach(n => focus.push([n.x, n.y])); }
    }
    if (ui.dialogNpc) { const n = G.byId(st, ui.dialogNpc); if (n) focus.push([n.x, n.y]); }
    if (p.indoor) tz *= .5;
    if (ui.intro) { tx = G.PLACES.piazza.x + Math.sin(time * .08) * 30; ty = G.PLACES.piazza.y - 6 + Math.cos(time * .06) * 8; tz = 1.25; }
    const kf = 1 - Math.pow(pveh ? .004 : .02, dt);
    cam.x += (tx - cam.x) * kf; cam.y += (ty - cam.y) * kf; cam.zoom += (tz - cam.zoom) * (1 - Math.pow(.05, dt));
    { const lh = !ui.intro && typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; cam.h += ((lh !== null ? lh : groundH(ui.intro ? tx : p.x, ui.intro ? ty : p.y)) - cam.h) * Math.min(1, dt * 4); }
    let kx = 0, ky = 0;
    if (st.kick) { const k = Math.max(0, 1 - (st.clock - st.kick.t) * 9); kx = -Math.cos(st.kick.a) * st.kick.amt * k * 1.2; ky = -Math.sin(st.kick.a) * st.kick.amt * k * 1.2; }
    const sh = st.shake || 0, sx = (Math.random() - .5) * sh * 1.4, sy = (Math.random() - .5) * sh * 1.4;
    // bordo dello schermo: la visuale gira (a piedi)
    cam.uy = cam.uy || 0; if (ui.edge && !pveh) cam.uy -= ui.edge * dt * 1.4;
    if (ui.rot && !pveh) cam.uy += ui.rot * dt * 1.7; if (ui.drag && !pveh) cam.uy += ui.drag;   // [monte] la visuale gira
    cam.yaw = YAW + cam.uy; // [inverno] la vista NON gira con l'auto: guida precisa, retro compresa
    let pitch = lerp(PITCH, onVespa ? .78 : .82, ease);
    // [monte] quando la montagna copre il giocatore la visuale sale sopra (e torna giù quando non serve); O: visuale dall'alto
    if (!pveh && !ui.intro) {
      const ph0 = (p.lv && typeof Livelli !== 'undefined' ? Livelli.heightOf(st, p) : null), py0 = (ph0 !== null ? ph0 : groundH(p.x, p.y)) + 1.5, ux = Math.sin(cam.yaw), uz = Math.cos(cam.yaw);
      let cover = false; if (!(p.lv && p.lv.k === 'ug')) for (let s2 = 2; s2 < 40 && !cover; s2 += 1.5) { const qx = p.x + ux * Math.cos(pitch) * s2, qz = p.y + uz * Math.cos(pitch) * s2, qy = py0 + Math.sin(pitch) * s2; if (groundH(qx, qz) > qy - .2) cover = true; }
      cam.lift = (cam.lift || 0) + (((cover || ui.top) ? 1 : 0) - (cam.lift || 0)) * Math.min(1, dt * (cover ? 1.2 : .8));
      pitch = lerp(pitch, 1.15, cam.lift);
    }
    const fov = lerp(30, onVespa ? 40 : 40, ease) * (1 + (pveh ? Math.hypot(pveh.vx || pveh.speed, pveh.vy || 0) : 0) / 18 * .16 * ease);
    const viewH = VIEW * cam.zoom;
    const walkDist = (viewH / 2) / Math.tan(30 * Math.PI / 360);
    let driveDist = ((onVespa ? 26 : 32) * (ui.zoom || 1)) + (pveh ? Math.min(14, Math.hypot(pveh.vx || pveh.speed, pveh.vy || 0) * .5) : 0);
    if (false) {
      const hx = Math.sin(cam.yaw), hz = Math.cos(cam.yaw), cp = Math.cos(onVespa ? .44 : .42);
      for (let s = 1.5; s < driveDist; s += .4) { const x = cam.x + hx * cp * s, z = cam.y + hz * cp * s; if (G.tileAt(Math.floor(x / G.TS), Math.floor(z / G.TS)) === G.T.BLD && !isWall(Math.floor(x / G.TS), Math.floor(z / G.TS))) { driveDist = Math.max(5, s - 1); break; } }
    }
    cam.cd = cam.cd === undefined ? driveDist : cam.cd + (driveDist - cam.cd) * Math.min(1, dt * (driveDist < cam.cd ? 14 : 2.5));
    const dist = lerp(walkDist, cam.cd, ease);
    camera.fov = fov; camera.near = lerp(8, 2, ease); camera.far = lerp(300, 300, ease); camera.updateProjectionMatrix();
    const ox = Math.sin(cam.yaw) * Math.cos(pitch) * dist, oy = Math.sin(pitch) * dist, oz = Math.cos(cam.yaw) * Math.cos(pitch) * dist;
    const cx = cam.x + kx + sx, cz = cam.y + ky + sy, cy = cam.h + lerp(0, 1, ease);
    camera.position.set(cx + ox, cy + oy, cz + oz); camera.lookAt(cx, cy, cz);
    { const lh = typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; NATU.pl.value.set(p.x, (lh !== null ? lh : groundH(p.x, p.y)) + .2, p.y); NATU.cm.value.copy(camera.position); }   // [monte] varco nelle chiome
    if (ease < .02) {
      const texel = viewH / H; camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const pos = camera.position.clone(), a = pos.dot(right), b = pos.dot(up);
      pos.addScaledVector(right, Math.round(a / texel) * texel - a).addScaledVector(up, Math.round(b / texel) * texel - b);
      camera.position.copy(pos);
    }
    camera.updateMatrixWorld();
    scene.fog.near = lerp(walkDist + 12, 40, ease); scene.fog.far = lerp(walkDist + 120, 160, ease);
    if (dyn.sky) dyn.sky.position.copy(camera.position);

    // edifici tra la camera e il giocatore: diventano trasparenti
    const hitv = new THREE.Vector3();
    const rays = focus.map(([fx, fz]) => { const o = new THREE.Vector3(fx, groundH(fx, fz) + .9, fz); return new THREE.Ray(o, V3.copy(camera.position).sub(o).normalize().clone()); });
    let covered = false;
    dyn.buildings.forEach(B => {
      const hit = rays.some(ry => ry.intersectBox(B.box3, hitv) !== null); if (hit && rays[0].intersectBox(B.box3, hitv) !== null) covered = true;
      const target = hit ? 1 : 0; B.fade += (target - B.fade) * Math.min(1, dt * 8);
      const op = 1 - B.fade * .9;
      B.mats.forEach(m => { const tr = op < .99; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = !tr; if (m.emissiveMap) m.emissiveIntensity *= op; });
    });
    if (dyn.ghosts) dyn.ghosts.forEach(g => g.visible = covered && !pveh);

    INDOOR.quad = Math.round(((cam.yaw % 6.2832) + 6.2832) % 6.2832 / (Math.PI / 2) - .5) & 3;
    const indoorNow = indoorPass(st); if (indoorNow) { scene.fog.near = 200; scene.fog.far = 400; }
    if (typeof Livelli !== 'undefined' && st.lv) { surfacePortals(st); if (!indoorNow && ugPass(st)) { scene.fog.near = dist - 2; scene.fog.far = dist + 22; scene.fog.color.set('#060505'); scene.background.set('#060505'); } }   // [monte]
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    const U = postMat.uniforms;
    U.tC.value = rt.texture; U.tD.value = rt.depthTexture; U.near.value = camera.near; U.far.value = camera.far;
    U.letter.value += ((ui.letterbox ? 1 : 0) - U.letter.value) * Math.min(1, dt * 5);
    U.pillar.value = ease; U.dusk.value = dusk; U.night.value = night;
    U.fade.value = ui.fade || 0; U.flash.value = ui.flash || 0; U.sat.value = ui.desat ? .45 : 1;
    const hurtK = Math.max(0, 1 - (st.clock - p.hurtT) * 1.5);
    U.hurt.value = Math.max(hurtK, p.hp < 35 ? (.35 + Math.sin(time * 5) * .1) * (1 - p.hp / 35) : 0);
    renderer.render(postScene, postCam);
  }

  const pv3 = new THREE.Vector3();
  // y è l'altezza sopra il terreno
  function project(x, y, z) { pv3.set(x, y + groundH(x, z), z).project(camera); return { x: (pv3.x + 1) / 2, y: (1 - pv3.y) / 2, behind: pv3.z > 1 }; }
  const ray3 = new THREE.Raycaster(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.1), hit3 = new THREE.Vector3();
  // il cursore punta all'altezza del busto (rispetto al terreno sotto il giocatore)
  function screenToGround(nx, ny) { ground.constant = -((window.InterniArte && InterniArte.floorY() != null ? 0 : 1.1) + playerH);   /* [interni] dentro si clicca sul pavimento */ ray3.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), camera); return ray3.ray.intersectPlane(ground, hit3) ? { x: hit3.x, y: hit3.z } : null; }
  function camBasis() { const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); return { fx: f.x, fz: f.z, rx: -f.z, rz: f.x }; }
  function snap(st) { cam.x = st.player.x; cam.y = st.player.y; cam.h = groundH(st.player.x, st.player.y); }
  return { dirtyAt, updateChunks, ISO, sfx: DZ.sfx, hits: DZ.hits, __dz: DZ, __models: { weaponModel, carMesh, vespaMesh, pickupMesh, applyDamage, get scene() { return scene; }, get renderer() { return renderer; } }, cam, getCamera: () => camera, screenToGround, camBasis, lowQuality, snap, init, frame, project, nightLevel, isRaining, groundH, resize: (cw, ch, dpr) => resize(cw, ch, dpr), YAW };
})();
