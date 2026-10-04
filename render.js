/* Porto Vecchio — resa 3D in stile pixel art (Three.js r149).
   Scena renderizzata a bassa risoluzione, poi ingrandita con contorni e color grading.
   Solo grafica: la logica (game.js) non dipende da nulla di questo file. */
var Render = (function () {
  'use strict';
  const G = Game, TS = G.TS, M = G.MAP, OX = G.OX;
  let renderer, scene, camera, rt, postScene, postCam, postMat;
  let hemi, moon, fillAmb;
  const dyn = { people: {}, vespas: {}, lights: [], flicker: [], signs: [], buildings: [], water: null, rain: null, motes: null, laundry: [], markers: null, boats: [], gulls: [], beams: [], chasers: [], spin: [], sky: null };
  let PX = 3, W = 0, H = 0, VIEW = 18;
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tz: 1, shake: 0, h: 0 };
  const YAW = Math.PI / 4, PITCH = 0.72;

  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
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
  const sb = c => MC['B' + c] || (MC['B' + c] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));

  // ---------------- QUOTE DEL TERRENO (solo visive) ----------------
  function rampH(R, x, z) { const k = R.axis === 'x' ? (x / TS - R.x) / R.w : (z / TS - R.y) / R.h; return R.h0 + (R.h1 - R.h0) * clamp(k, 0, 1); }
  function tileElev(tx, ty) { if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0; return M.elev[ty * G.GW + tx]; }
  function groundH(x, z) {
    const tx = Math.floor(x / TS), ty = Math.floor(z / TS);
    if (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) return 0;
    const i = ty * G.GW + tx, r = M.rampOf[i];
    if (r >= 0) { const R = M.ramps[r]; if (R.stairs) { const h = rampH(R, x, z), st = .3; return Math.round(h / st) * st; } return rampH(R, x, z); }
    const fx = x / TS - tx, fz = z / TS - ty, HW = M.HW, a = M.hc[ty * HW + tx], b = M.hc[ty * HW + tx + 1], c = M.hc[(ty + 1) * HW + tx], d = M.hc[(ty + 1) * HW + tx + 1];
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }
  // quota di uno spigolo della casella valutata dentro la casella stessa
  function cornerH(tx, ty, cx, cz) { const i = ty * G.GW + tx, r = M.rampOf[i]; if (r >= 0) return rampH(M.ramps[r], (tx + cx) * TS, (ty + cz) * TS); return M.hc[(ty + cz) * M.HW + tx + cx]; }
  const isWall = (tx, ty) => tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH && M.wallAt[ty * G.GW + tx] === 1;
  // zona di una casella per la pittura: C borgo, W Ponente/porto/campagna, H collina, E Lungomare e spiaggia
  const zoneOf = (tx, ty) => { const z = M.zone[ty * G.GW + tx]; return z === M.Z.BORGO ? 'C' : z === M.Z.COLLE ? 'H' : z === M.Z.LUNGO || z === M.Z.SPIAGGIA ? 'E' : 'W'; };

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
    const tile = (tx, ty) => G.tileAt(tx, ty), T = G.T;
    const nearWater = (tx, ty) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([a, b]) => { const v = tile(tx + a, ty + b); return v === T.WATER && tx + a >= 0 && tx + a < G.GW && ty + b < G.GH; });
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      const v = tile(tx, ty), px = tx * TP, py = ty * TP, z = zoneOf(tx, ty), el = tileElev(tx, ty);
      if (v === T.COB || v === T.STAIRS) {
        if (z === 'C') { // selciato del borgo
          x.fillStyle = '#2a2433'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 4) { const off = ((ty * 4 + sy / 4) % 2) * 2; for (let sx = -off; sx < TP; sx += 5) { const w = 4 - (r() < .25 ? 1 : 0); x.fillStyle = pick(r, ['#5a5068', '#524862', '#63586f', '#4a425a', '#665a6c']); x.fillRect(px + Math.max(0, sx), py + sy, Math.min(w, TP - Math.max(0, sx)), 3); if (r() < .5) { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + Math.max(0, sx), py + sy, 1, 1); } } }
        } else if (z === 'W') { // mattonato a spina di pesce
          x.fillStyle = '#4a3430'; x.fillRect(px, py, TP, TP);
          for (let sy = 0; sy < TP; sy += 2) for (let sx = 0; sx < TP; sx += 4) { const o = ((sx / 4 + sy / 2) % 2); x.fillStyle = pick(r, ['#a0675a', '#94604f', '#ad735f', '#8a5848', '#b07a64']); if (o) x.fillRect(px + sx, py + sy, 3, 1); else x.fillRect(px + sx + 1, py + sy, 1, 2); }
          x.fillStyle = 'rgba(40,20,30,.18)'; x.fillRect(px, py, TP, 1);
        } else if (z === 'H') { // risseu: acciottolato ligure bianco e nero
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
      } else if (v === T.PIAZZA || v === T.FOUNT) {
        for (let sy = 0; sy < TP; sy += 8) for (let sx = 0; sx < TP; sx += 8) {
          x.fillStyle = '#3a3440'; x.fillRect(px + sx, py + sy, 8, 8);
          x.fillStyle = pick(r, ['#8d7f86', '#85787f', '#958890', '#7e7179', '#9a8c8e']); x.fillRect(px + sx, py + sy, 7, 7);
          x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + sx, py + sy, 7, 1);
          if (r() < .12) { x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + sx + 2, py + sy + 3, 3, 1); }
        }
        // rosa dei venti al centro della piazza
        const cx0 = (M.OX + 25) * TP, cy0 = (M.OY + 10) * TP + TP;
        if (Math.abs(px + 8 - cx0) < 60 && Math.abs(py + 8 - cy0) < 60) { const dd = Math.hypot(px + 8 - cx0, py + 8 - cy0); if (dd > 40 && dd < 50) { x.fillStyle = '#c8b28a'; x.fillRect(px + 6, py + 6, 4, 4); } }
      } else if (v === T.VIA) {
        x.fillStyle = '#2a2730'; x.fillRect(px, py, TP, TP);
        for (let i = 0; i < 16; i++) { x.fillStyle = pick(r, ['#302d37', '#25222b', '#34303a']); x.fillRect(px + Math.floor(r() * TP), py + Math.floor(r() * TP), 1, 1); }
      } else if (v === T.QUAY) {
        x.fillStyle = '#56535c'; x.fillRect(px, py, TP, TP);
        x.fillStyle = '#48454f'; x.fillRect(px, py, TP, 1); x.fillRect(px, py, 1, TP);
        for (let i = 0; i < 6; i++) { x.fillStyle = pick(r, ['rgba(120,70,40,.2)', 'rgba(0,0,0,.2)', 'rgba(255,255,255,.05)']); x.fillRect(px + Math.floor(r() * 14), py + Math.floor(r() * 14), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2)); }
        if (tile(tx, ty + 1) === T.WATER) for (let k = 0; k < TP; k += 4) { x.fillStyle = (k / 4 + tx) % 2 ? '#e0b83a' : '#1b1b1f'; x.fillRect(px + k, py + TP - 3, 4, 3); }
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
      } else if (v === T.GRASS) {
        const pine = (tx >= 8 && tx < 26 && ty >= 22 && ty < 38) || (z === 'H' && ((tx * 7 + ty * 13) % 11) < 3);
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
    // strade: curve lisce disegnate sopra le caselle (cordolo, linee di bordo, asfalto, mezzeria, strisce pedonali, tombini)
    const MP = PPM;
    const strokeRoad = (R, ctx, col, dw) => {
      ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const n = R.pts.length, segs = R.closed ? n : n - 1;
      for (let k = 0; k < segs; k++) { const a = R.pts[k], b = R.pts[(k + 1) % n], w = (R.ws[k] + R.ws[(k + 1) % n]) / 2 + dw; ctx.lineWidth = w * MP; ctx.beginPath(); ctx.moveTo(a[0] * MP, a[1] * MP); ctx.lineTo(b[0] * MP, b[1] * MP); ctx.stroke(); }
    };
    M.roads.forEach(R => strokeRoad(R, x, R.bridge ? '#8a8490' : '#cfc8c0', .6));
    M.roads.forEach(R => strokeRoad(R, x, '#e4ded0', -.4));
    M.roads.forEach(R => { strokeRoad(R, x, '#2a2730', -.9); strokeRoad(R, rx, '#b4b4b4', 0); });
    M.roads.forEach(R => { // grana dell'asfalto
      for (let k = 0; k < R.pts.length; k++) for (let q = 0; q < 5; q++) { const hw = R.ws[k] / 2 - .6, ox = (r() - .5) * 2 * hw, oz = (r() - .5) * 2 * hw; x.fillStyle = pick(r, ['#322e38', '#24212a', '#36323d', '#1f1c24']); x.fillRect(Math.round((R.pts[k][0] + ox) * MP), Math.round((R.pts[k][1] + oz) * MP), 1 + (r() < .3 ? 1 : 0), 1); }
    });
    M.roads.forEach(R => { if (R.id === 'rotonda') return; x.setLineDash([3 * MP, 3 * MP]); x.strokeStyle = R.id === 'litoranea' ? 'rgba(240,200,90,.85)' : 'rgba(232,226,208,.85)'; x.lineWidth = 1; x.beginPath(); R.pts.forEach((p, k) => k ? x.lineTo(p[0] * MP, p[1] * MP) : x.moveTo(p[0] * MP, p[1] * MP)); if (R.closed) x.closePath(); x.stroke(); x.setLineDash([]); });
    // strisce pedonali: davanti ai vicoli del borgo, alle uscite della rotonda, sul Lungomare e sul viale
    const zebra = (R, s) => { const q = G.roadAt(R, s), hw = (R.w) / 2 - .5; x.save(); x.translate(q.x * MP, q.y * MP); x.rotate(q.ang); x.fillStyle = 'rgba(236,230,214,.8)'; for (let o = -hw; o < hw; o += 1) x.fillRect(-1.2 * MP, o * MP, 2.4 * MP, .5 * MP); x.restore(); };
    { const L = M.roads.find(q => q.id === 'litoranea'); [8.5, 18.5, 30.5, 38.5].forEach(t => zebra(L, G.nearestOnRoad(L, (M.OX + t) * TS + 1, (M.OY + 24.5) * TS).s));
      [[240, 76], [240, 96], [236, 110]].forEach(([px, pz]) => zebra(L, G.nearestOnRoad(L, px, pz).s));
      ['viale', 'raccordo', 'tornanti', 'pini'].forEach(id => { const R = M.roads.find(q => q.id === id); zebra(R, id === 'viale' ? R.total * .5 : 5); }); }
    M.roads.forEach(R => { for (let s = 9; s < R.total; s += 23) { const q = G.roadAt(R, s), o = R.w / 2 - 1.2, cx = (q.x - Math.sin(q.ang) * o) * MP, cy = (q.y + Math.cos(q.ang) * o) * MP; x.fillStyle = '#1b1920'; x.fillRect(cx - 3, cy - 2, 6, 5); x.fillStyle = '#3a3642'; x.fillRect(cx - 2, cy - 1, 4, 1); x.fillRect(cx - 2, cy + 1, 4, 1); } });
    // pozzanghere (lucide: riflettono i neon)
    for (let i = 0; i < 150; i++) {
      const tx = Math.floor(r() * G.GW), ty = Math.floor(r() * G.GH), v = tile(tx, ty);
      if (v !== T.COB && v !== T.PIAZZA && v !== T.VIA && v !== T.QUAY) continue;
      const cx = tx * TP + r() * TP, cy = ty * TP + r() * TP, rw = 3 + r() * 9, rh = 2 + r() * 4;
      x.fillStyle = 'rgba(20,26,48,.5)'; x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(160,180,240,.14)'; x.fillRect(cx - rw / 2, cy - 1, rw * .5, 1);
      rx.fillStyle = '#141414'; rx.beginPath(); rx.ellipse(cx, cy, rw, rh, 0, 0, 7); rx.fill();
    }
  }

  function buildGround() {
    const cw = G.WW * PPM, ch = G.WH * PPM, c = mk(cw, ch), x = c.getContext('2d');
    const rc = mk(cw, ch), rx = rc.getContext('2d');
    const r = rng(42);
    x.fillStyle = '#1a1622'; x.fillRect(0, 0, cw, ch);
    rx.fillStyle = '#e0e0e0'; rx.fillRect(0, 0, cw, ch);
    paintGround(x, rx, r);
    const tex = canvasTex(c), rtex = canvasTex(rc);
    const T = G.T;
    // una casella = un quadrilatero alla sua quota (rampe inclinate); gradini a parte
    const pos = [], uv = [], nor = [], sp = [], suv = [], snor = [];
    const quad = (a, b, c2, d, ua, ub, uc, ud, P, U, N) => { [a, b, c2, a, c2, d].forEach(p => P.push(p[0], p[1], p[2])); [ua, ub, uc, ua, uc, ud].forEach(q => U.push(q[0], q[1])); const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]]; let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n) || 1; n = n.map(v => v / l); for (let k = 0; k < 6; k++) N.push(...n); };
    const U = (px, pz) => [px / G.WW, 1 - pz / G.WH];
    const skip = (tx, ty) => { const v = G.tileAt(tx, ty); return v === T.WATER || v === T.STAIRS || isWall(tx, ty); }; // sotto gli edifici il pavimento serve: quando diventano trasparenti
    const edgeH = (tx, ty, side) => { // quote dei due spigoli di un lato: side 0=N,1=E,2=S,3=W
      const c = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0]][side];
      return [cornerH(tx, ty, c[0], c[1]), cornerH(tx, ty, c[2], c[3])];
    };
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) {
      if (skip(tx, ty)) continue;
      const v = G.tileAt(tx, ty), inB = v === T.BLD;
      const x0 = tx * TS, z0 = ty * TS, x1 = x0 + TS, z1 = z0 + TS;
      let h00 = cornerH(tx, ty, 0, 0), h10 = cornerH(tx, ty, 1, 0), h11 = cornerH(tx, ty, 1, 1), h01 = cornerH(tx, ty, 0, 1);
      if (v === T.SAND) { // la sabbia scende sotto il pelo dell'acqua
        const wd = (cx, cz) => [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]].some(([a, b]) => G.tileAt(a, b) === T.WATER && b < G.GH && a >= 0 && a < G.GW);
        if (wd(tx, ty)) h00 = -.6; if (wd(tx + 1, ty)) h10 = -.6; if (wd(tx + 1, ty + 1)) h11 = -.6; if (wd(tx, ty + 1)) h01 = -.6;
      }
      quad([x0, h00, z0], [x0, h01, z1], [x1, h11, z1], [x1, h10, z0], U(x0, z0), U(x0, z1), U(x1, z1), U(x1, z0), pos, uv, nor);
      // pareti verticali: verso l'acqua (banchine, ponti) e verso le caselle più basse
      const NB = [[0, -1, 0], [1, 0, 1], [0, 1, 2], [-1, 0, 3]];
      if (!inB) NB.forEach(([dx, dy, side]) => {
        const nx = tx + dx, ny = ty + dy, nv = G.tileAt(nx, ny);
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
        const nx = tx + dx, ny = ty + dy; if (G.tileAt(nx, ny) === G.T.BLD) return;
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
    for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = G.tileAt(tx, ty); if (v !== T.WATER && v !== T.PIER && !M.bridgeAt[ty * G.GW + tx]) mx.fillRect(tx * S, ty * S, S, S); }
    const bc = mk(mc.width, mc.height), bx = bc.getContext('2d'); bx.filter = 'blur(5px)'; bx.drawImage(mc, 0, 0); bx.filter = 'none';
    const btx = new THREE.CanvasTexture(bc); btx.minFilter = btx.magFilter = THREE.LinearFilter;
    const geo = new THREE.PlaneGeometry(1100, 1100); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, night: { value: 1 }, dusk: { value: 0 }, mask: { value: btx }, wsize: { value: new THREE.Vector2(G.WW, G.WH) }, fogC: { value: new THREE.Color() }, camP: { value: new THREE.Vector3() }, fogN: { value: 60 }, fogF: { value: 160 } },
      vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix*vec4(position,1.); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: `uniform float time; uniform float night; uniform float dusk; uniform sampler2D mask; uniform vec2 wsize; uniform vec3 fogC; uniform vec3 camP; uniform float fogN; uniform float fogF; varying vec3 vP;
        void main(){
          vec2 p = floor(vP.xz*4.)/4.;
          vec2 muv = p/wsize; float m = texture2D(mask, vec2(muv.x, 1.-muv.y)).r;
          if (muv.x<0.||muv.x>1.||muv.y>1.||muv.y<0.) m = 0.;
          float w = sin(p.x*1.3 + time*1.2 + sin(p.y*2.1+time)*1.5) * sin(p.y*3.1 - time*.8);
          float band = step(.82, w);
          vec3 deep = mix(vec3(.05,.32,.42), vec3(.03,.06,.14), night);
          vec3 shal = mix(vec3(.18,.72,.70), vec3(.05,.20,.26), night);
          vec3 c = mix(deep, shal, smoothstep(.04,.55,m));
          c = mix(c, c*vec3(1.2,.75,.95)+vec3(.12,.02,.08), dusk*.6);
          c += band*mix(vec3(.25,.38,.42), vec3(.14,.14,.32), night);
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
          vec3 dayTop = vec3(.28,.52,.86), dayHor = vec3(.78,.88,.96);
          vec3 duTop = vec3(.16,.10,.36), duMid = vec3(.78,.28,.52), duHor = vec3(1.,.62,.32);
          vec3 niTop = vec3(.02,.02,.08), niHor = vec3(.16,.07,.26);
          vec3 day = mix(dayHor, dayTop, smoothstep(0.,.5,y));
          vec3 du = mix(mix(duHor, duMid, smoothstep(0.,.14,y)), duTop, smoothstep(.14,.6,y));
          vec3 ni = mix(niHor, niTop, smoothstep(0.,.45,y));
          vec3 c = mix(day, du, dusk);
          c = mix(c, ni, night*(1.-dusk*.55));
          // sole al tramonto, a bande come nei giochi a 16 bit
          float sd = dot(vD, sun);
          float disc = smoothstep(.9975,.9985,sd);
          float stripes = step(.5, fract((vD.y-sun.y)*55.)) + step(sun.y+.012, vD.y);
          c = mix(c, mix(vec3(1.,.86,.42), vec3(1.,.4,.5), smoothstep(-.01,.03,sun.y-vD.y+.01)), disc*clamp(stripes,0.,1.)*(1.-night*.8)*max(dusk, 1.-night));
          c += vec3(1.,.5,.35)*pow(max(0.,sd),24.)*.5*dusk;
          // stelle
          vec2 g = floor(vec2(atan(vD.z,vD.x)*160., vD.y*160.));
          float st = step(.996, h(g)) * smoothstep(.08,.4,y) * night * (.6+.4*sin(time*2.+h(g)*40.));
          c += st*vec3(.9,.85,1.);
          if (y < 0.) c = mix(niHor, vec3(.02,.03,.08), clamp(-y*4.,0.,1.))*night + (1.-night)*mix(c, vec3(.1,.25,.35), clamp(-y*4.,0.,1.));
          gl_FragColor = vec4(c,1.);
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    const s = new THREE.Mesh(geo, mat); s.renderOrder = -2; s.frustumCulled = false; scene.add(s); dyn.sky = s;
  }
  // colore del cielo all'orizzonte (per la nebbia)
  function horizonColor(night, dusk, out) {
    const day = new THREE.Color(.78, .88, .96), du = new THREE.Color(.86, .45, .45), ni = new THREE.Color(.14, .07, .24);
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
    buildBridges();
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
  // il ponte verso la terraferma: piloni sotto il tratto sull'isola, poi il viadotto che prosegue oltre il bordo
  function buildBridges() {
    const deck = std({ color: '#3a3640' }), side = sm('#d8d0c4'), pil = sm('#8a8292'), asph = std({ color: '#2a2730', roughness: .8 });
    const R = M.roads.find(q => q.id === 'ponte'); if (!R) return;
    const end = R.pts[R.pts.length - 1], prev = R.pts[R.pts.length - 6], a = Math.atan2(end[1] - prev[1], end[0] - prev[0]), c = Math.cos(a), s = Math.sin(a), h = 1;
    // piloni sotto le caselle di ponte dentro la mappa
    for (let k = 0; k < R.pts.length; k += 10) { const [x, z] = R.pts[k]; if (!M.bridgeAt[Math.floor(z / TS) * G.GW + Math.floor(x / TS)]) continue; const p = box(1.6, 8, R.w - 1, pil); p.position.set(x, h - 4.6, z); p.rotation.y = -a; addStatic(p); }
    // viadotto oltre il bordo, 200 m
    const L = 200, cx = end[0] + c * L / 2, cz = end[1] + s * L / 2;
    const d = box(L, .7, R.w + .4, deck); d.position.set(cx, h - .36, cz); d.rotation.y = -a; addStatic(d);
    const as = box(L, .02, R.w, asph); as.position.set(cx, h + .005, cz); as.rotation.y = -a; addStatic(as, true);
    [-1, 1].forEach(sd => { const sb2 = box(L, .9, .25, side); sb2.position.set(cx - s * sd * (R.w / 2 + .1), h + .45, cz + c * sd * (R.w / 2 + .1)); sb2.rotation.y = -a; addStatic(sb2); });
    for (let k = 6; k < L; k += 14) {
      const x = end[0] + c * k, z = end[1] + s * k;
      const p = box(1.6, 8, R.w - 1, pil); p.position.set(x, h - 4.6, z); p.rotation.y = -a; addStatic(p);
      [-1, 1].forEach(sd => { const px = x - s * sd * (R.w / 2 + .2), pz = z + c * sd * (R.w / 2 + .2); const pole = box(.14, 5, .14, sl('#1e1a24')); pole.position.set(px, h + 2.5, pz); addStatic(pole); const hx = px + s * sd * .5, hz = pz - c * sd * .5; const hd = box(.5, .18, .3, sb('#ffd08a')); hd.position.set(hx, h + 4.9, hz); scene.add(hd); glow(hx, h + 4.8, hz, '#ffb85c', 3); });
    }
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ map: signTexture('TERRAFERMA →', '#6ad0ff', '#0e2a4a'), toneMapped: false, side: THREE.DoubleSide }));
    const sx = end[0] - c * 30 - s * (R.w / 2 + .6), sz = end[1] - s * 30 + c * (R.w / 2 + .6); sg.position.set(sx, h + 4.2, sz); sg.rotation.y = -a - Math.PI / 2; scene.add(sg);
    const sp = box(.12, 4.2, .12, sl('#1e1a24')); sp.position.set(sx, h + 2.1, sz); addStatic(sp);
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
    const c = mk(64, 64), x = c.getContext('2d'), r = rng(9);
    x.fillStyle = '#343c58'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { x.fillStyle = pick(r, ['#5a6688', '#525d7e', '#617096', '#4b5676', '#6a7699']); x.fillRect(k, y, 5, 3); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(k, y, 5, 1); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(90,120,70,.35)'; x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); }
    slateTex = canvasTex(c); slateTex.wrapS = slateTex.wrapT = THREE.RepeatWrapping;
    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = '#6a6560'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = '#7a736c'; x2.fillRect(k, 0, 1, 32); } for (let i = 0; i < 30; i++) { x2.fillStyle = 'rgba(160,80,30,.35)'; x2.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 2); }
    tinTex = canvasTex(c2); tinTex.wrapS = tinTex.wrapT = THREE.RepeatWrapping;
    // coppi in cotto
    const c3 = mk(32, 32), x3 = c3.getContext('2d'); x3.fillStyle = '#7a3a28'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { x3.fillStyle = pick(r, ['#b8583a', '#c46a44', '#a84e34', '#cc7650']); x3.fillRect(k, y, 3, 4); x3.fillStyle = 'rgba(255,220,180,.2)'; x3.fillRect(k, y, 1, 4); }
    cotTex = canvasTex(c3); cotTex.wrapS = cotTex.wrapT = THREE.RepeatWrapping;
  }

  let flatTex = null;
  function flatRoofTex() { // lastrico del tetto piano: mattonelle, catrame, scarichi
    if (flatTex) return flatTex;
    const c = mk(32, 32), x = c.getContext('2d'), r = rng(21);
    x.fillStyle = '#4a4048'; x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = pick(r, ['#6a5a5e', '#625458', '#72626a', '#5a4e54']); x.fillRect(k, y, 7, 7); }
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(20,16,24,.45)'; x.fillRect(Math.floor(r() * 28), Math.floor(r() * 28), 3 + Math.floor(r() * 5), 2); }
    x.fillStyle = '#2a2430'; x.fillRect(14, 14, 3, 3);
    flatTex = canvasTex(c); flatTex.wrapS = flatTex.wrapT = THREE.RepeatWrapping; return flatTex;
  }
  function signTexture(text, color, bg) {
    const c = mk(256, 64), x = c.getContext('2d');
    x.fillStyle = bg || '#0f0c16'; x.fillRect(0, 0, 256, 64);
    x.strokeStyle = color; x.lineWidth = 3; x.strokeRect(5, 5, 246, 54);
    const size = text.length > 10 ? 26 : 34;
    x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
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
  function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(color), base: intensity, dist: distance, flick: flick || 0, phase: Math.random() * 10 }; LSRC.push(rec); return rec; }
  let glowTex = null;
  function glowTexture() {
    if (!glowTex) { const c = mk(32, 32), gx = c.getContext('2d'), gr = gx.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 32, 32); glowTex = new THREE.CanvasTexture(c); }
    return glowTex;
  }
  function glow(x, y, z, color, size, add) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8 }));
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
      const grp = new THREE.Group();
      const fac = (f, W2) => b.deco ? decoFacade(b, f, W2, hgt, i * 7 + f.charCodeAt(0)) : facade(b, f, W2, hgt + plinth, i * 7 + f.charCodeAt(0), plinth);
      const fS = fac('S', w), fE = fac('E', d), fN = fac('N', w), fW = fac('W', d);
      const mat = f => std({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1 });
      let roofTopM;
      if (b.deco) { const rtx = flatRoofTex().clone(); rtx.needsUpdate = true; rtx.repeat.set(w / 4, d / 4); roofTopM = std({ map: rtx, roughness: .95 }); }
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
        const par = box(w + .2, 1, d + .2, wallM); par.position.set(cx, top + .5, cz); grp.add(par);
        const parTop = box(w + .4, .14, d + .4, bandM); parTop.position.set(cx, top + 1.05, cz); grp.add(parTop);
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
  function addSign(b, base, w, d, x0, z0, top) {
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
    const sy = base + 3.5;
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
    const lr = addLight(lx, sy - .3, lz, b.sign.c, 3.2, 11, b.id === 'flipper' || b.id === 'disco' ? .5 : .08); lr.always = true;
    const gl = glow(sg.position.x, sy, sg.position.z, b.sign.c, 5.5); gl.material.opacity = .45;
    dyn.signs.push({ m: sm1, gl, flick: b.id === 'flipper' || b.id === 'magazzino' || b.id === 'video' });
    if ((b.shop || b.id === 'osteria' || b.id === 'gabbiano') && (face === 'S' || face === 'E' || face === 'N')) addAwning(dx, dz, face, b, w, d, base);
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
  function stripeTex(a, b) { const c = mk(16, 8), x = c.getContext('2d'); for (let k = 0; k < 16; k += 4) { x.fillStyle = a; x.fillRect(k, 0, 2, 8); x.fillStyle = b; x.fillRect(k + 2, 0, 2, 8); } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 6, 16, 2); return canvasTex(c); }
  const stripeCache = {};
  const stripeMat = (a, b) => stripeCache[a + b] || (stripeCache[a + b] = std({ map: stripeTex(a, b) }));
  function addAwning(dx, dz, face, b, w, d, base) {
    const cols = { bar: ['#b0283c', '#e9e0cf'], wu: ['#c22a2a', '#e8c040'], osteria: ['#2f5a3e', '#e9e0cf'], sirena: ['#2ab8b0', '#f4f0e6'], gelateria: ['#f07aa8', '#f8f0e0'], gabbiano: ['#3a6aa8', '#f4f0e6'], car_2: ['#c8502a', '#f0e0c0'] }[b.id] || ['#3a4a7a', '#e9e0cf'];
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, .1, 1.1), stripeMat(cols[0], cols[1]));
    const x0 = b.x * TS, z0 = b.y * TS, y = base + 3.0;
    if (face === 'S') { m.position.set(dx + 1.4, y, z0 + d + .5); m.rotation.x = .35; }
    else if (face === 'N') { m.position.set(dx + 1.4, y, z0 - .5); m.rotation.x = -.35; }
    else if (face === 'E') { m.rotation.y = Math.PI / 2; m.position.set(x0 + w + .5, y, dz); m.rotation.z = -.35; }
    const val = box(3.0, .25, .02, stripeMat(cols[1], cols[0])); val.position.set(0, -.12, .55); m.add(val);
    m.castShadow = true; addStatic(m);
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
      const px0 = x0 - 9, px1 = x0 - .4, pz0 = z0 - .6, pz1 = z0 + d + .6;
      const can = box(px1 - px0, .6, pz1 - pz0, sm('#f4f0e6')); can.position.set((px0 + px1) / 2, 4.6, (pz0 + pz1) / 2); g.add(can);
      const edge = box(px1 - px0 + .1, .25, pz1 - pz0 + .1, sm('#d8282a')); edge.position.set((px0 + px1) / 2, 4.3, (pz0 + pz1) / 2); g.add(edge);
      [[px0 + 1.5, pz0 + 1.5], [px1 - 1.5, pz0 + 1.5], [px0 + 1.5, pz1 - 1.5], [px1 - 1.5, pz1 - 1.5]].forEach(([x, z]) => { const p = box(.35, 4.3, .35, sm('#d8d4cc')); p.position.set(x, 2.15, z); g.add(p); });
      neonTube(px0, 4.02, pz1 + .06, px1, 4.02, pz1 + .06, neon, g); neonTube(px0, 4.02, pz0 - .06, px1, 4.02, pz0 - .06, '#ff4a4a', g);
      for (let k = 0; k < 2; k++) addLight(px0 + 2 + k * 5, base + 3.8, (pz0 + pz1) / 2, '#f4f8ff', 2.4, 9, 0).always = true;
    } else {
      // bar della spiaggia: capanno di legno con tetto a strisce
      const k = box(w - .6, 2.6, d - .6, sm('#c89a6a')); k.position.set(cx, 1.3, cz); g.add(k);
      for (let q = 0; q < 6; q++) { const pl = box(w - .5, .06, .04, sl('#8a6440')); pl.position.set(cx, .3 + q * .42, z0 + d - .28); g.add(pl); }
      const cnt = box(w - .2, 1.1, .6, sm('#e8d8b8')); cnt.position.set(cx, .55, z0 + d + .1); g.add(cnt);
      const roof = new THREE.Mesh(roofGeo(w + 1.4, d + 2, 1.2), stripeMat('#ff8a3c', '#f4f0e6')); roof.position.set(cx, 2.6, cz + .3); roof.userData.keep = true; g.add(roof);
      for (let q = 0; q < 4; q++) { const st = cyl(.2, .16, .8, 6, sm('#d8d0c0')); st.position.set(x0 + 1 + q * 1.8, .4, z0 + d + .8); g.add(st); }
      neonTube(x0 + .3, 2.5, z0 + d + .75, x0 + w - .3, 2.5, z0 + d + .75, neon, g);
      addLight(cx, base + 2.2, z0 + d + 1.2, '#ffb070', 2.6, 9, .05).always = true;
    }
    g.position.y = base; shadowed(g); const merged = mergeGroup(g); shadowed(merged); scene.add(merged);
    const sm1 = new THREE.MeshBasicMaterial({ map: signTexture(b.sign.t, b.sign.c), toneMapped: false });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3, .75), sm1);
    if (b.id === 'benzina') { sg.position.set(x0 - 4.7, base + 4.6, z0 + d + .67); const tot = box(.4, 5, .4, sm('#d8d4cc')); tot.position.set(x0 + w + 1.5, base + 2.5, z0 + d + 1); addStatic(tot); const tsg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshBasicMaterial({ map: priceTexture(), toneMapped: false, side: THREE.DoubleSide })); tsg.position.set(x0 + w + 1.5, base + 5.2, z0 + d + 1.22); scene.add(tsg); fuelPump(x0 - 6, z0 + .8, 0, '#d8282a'); fuelPump(x0 - 3, z0 + .8, 0, '#e8c030'); oilRack(x0 + w / 2, z0 - .8, Math.PI, rng(5)); tireStack(x0 + w + 1, z0 + .5, 4); }
    else sg.position.set(cx, base + 3.2, z0 + d + 1.3);
    scene.add(sg); glow(sg.position.x, sg.position.y, sg.position.z, b.sign.c, 5).material.opacity = .45;
    dyn.signs.push({ m: sm1, gl: null, flick: false });
    const rec = { b, grp: merged, fade: 0, box3: b.id === 'benzina' ? new THREE.Box3(new THREE.Vector3(x0 - 9, base, z0 - .6), new THREE.Vector3(x0 + w, base + 5, z0 + d + .6)) : new THREE.Box3(new THREE.Vector3(x0 + .3, base, z0 + .3), new THREE.Vector3(x0 + w - .3, base + 3.2, z0 + d - .3)), mats: [] };
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
      const globe = add(g, new THREE.Mesh(new THREE.SphereGeometry(.36, 10, 8), sb('#ffe0f0')), 0, 5.35, 0); globe.userData.keep = true;
      ly = 5.35; col = pick(rng(Math.floor(x * 7 + z)), ['#ff7ac0', '#6ae8ff', '#ffb0e0']); lcol = '#ffe0f0';
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
    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g); curTag = null;
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0), wx = x + lx * c + lz * s, wz = z - lx * s + lz * c;
    const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 3.6 : 3.2);
    const L = addLight(wx, y0 + ly - .3, wz, kind === 'deco' ? col : '#ffb35c', kind === 'sodium' ? 3.6 : 3.0, kind === 'sodium' ? 14 : 10, .03);
    if (tag) { const rec = regProp(g, tag, 'lamp'); if (rec) { rec.light = L; rec.lbase = L.base; rec.glowS = gl; rec.mass = 1.2; rec.fragile = false; } }
    return L;
  }

  // --- alberi ---
  function palmTree(x, y, z, r, hgt) {
    const g = G0(), h = hgt || 6 + r() * 3, seg = 9, lean = (r() - .5) * .5, trunkM = sm('#8a6a4a'), ringM = sm('#6a4e36');
    let px = 0, pz = 0;
    for (let k = 0; k < seg; k++) { const t = k / seg, rad = .24 - t * .08; px = Math.sin(lean) * t * t * h * .3; const s = add(g, cyl(rad, rad + .03, h / seg + .02, 7, k % 2 ? trunkM : ringM), px, (k + .5) * h / seg, pz); s.rotation.z = -lean * t * .5; }
    const top = new THREE.Vector3(px, h, pz);
    add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.32, 0), sm('#5a4a2a')), top.x, top.y, top.z);
    const fr = [sl('#3f8a3a'), sl('#4f9a44'), sl('#2f7a35')];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + r() * .3, droop = .35 + r() * .5, len = 2.4 + r() * .8;
      const leaf = G0(); leaf.position.copy(top); leaf.rotation.y = a;
      const l1 = box(.5, .05, len * .55, pick(r, fr)); l1.position.set(0, .1, len * .27); l1.rotation.x = -droop * .4; leaf.add(l1);
      const l2 = box(.38, .05, len * .5, pick(r, fr)); l2.position.set(0, -.35 * droop, len * .72); l2.rotation.x = droop * .9; leaf.add(l2);
      g.add(leaf);
    }
    for (let k = 0; k < 3; k++) add(g, new THREE.Mesh(new THREE.SphereGeometry(.13, 5, 4), sm('#5a3a1a')), top.x + Math.cos(k * 2.1) * .25, top.y - .25, top.z + Math.sin(k * 2.1) * .25);
    g.position.set(x, y, z); g.rotation.y = r() * 6; return g;
  }
  function pineTree(x, z, r) { // pino domestico a ombrello
    const g = G0(), h = 7 + r() * 3, tm = sm('#6a4a3a'), lean = (r() - .5) * .3;
    const tr = add(g, cyl(.22, .34, h, 7, tm), Math.sin(lean) * h / 2, h / 2, 0); tr.rotation.z = -lean;
    const tx = Math.sin(lean) * h;
    const cm = [sl('#2a4a2a'), sl('#34583a'), sl('#243f26')];
    for (let k = 0; k < 6; k++) { const a = k * 1.1, rr = k ? 1.6 + r() * .8 : 0; const c = add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + r() * .6, 0), pick(r, cm)), tx + Math.cos(a) * rr, h + .2 + r() * .5, Math.sin(a) * rr); c.scale.set(1.3, .45, 1.3); }
    return place(g, x, z, r() * 6);
  }
  function leafyTree(x, z, r, big) { // platano o leccio
    const g = G0(), s = big ? 1.3 : 1, tm = sm('#7a6a5a');
    add(g, cyl(.2 * s, .3 * s, 3 * s, 7, tm), 0, 1.5 * s, 0);
    [[0, 3.6, 0, 1.9], [.9, 4.4, -.4, 1.3], [-.8, 4.2, .5, 1.4], [.2, 5.1, .3, 1.1]].forEach(([a, b, c, rad], k) => add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(rad * s, 0), k % 2 ? PM.leaf() : PM.leaf2()), a * s, b * s, c * s));
    // aiuola in pietra
    add(g, cyl(1.1, 1.1, .3, 10, PM.stone()), 0, .15, 0); add(g, cyl(.95, .95, .31, 10, sm('#4a3a2a')), 0, .16, 0);
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
    const top = add(g, new THREE.Mesh(new THREE.BoxGeometry(2.9, .08, 1.9), stripeMat(ca, cb)), 0, 2.45, .1, .22, 0, 0);
    add(g, box(2.9, .3, .03, stripeMat(cb, ca)), 0, 2.2, 1.05);
    // cassette inclinate con la merce
    for (let k = 0; k < 4; k++) {
      const cx = -.9 + k * .6, crate = add(g, box(.52, .16, .5, PM.woodL()), cx, 1.02, .15, .25, 0, 0);
      const gc = pick(r, goods);
      for (let q = 0; q < 6; q++) add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 0), sl(gc)), cx - .16 + (q % 3) * .16, 1.16 + (q > 2 ? .04 : 0), .05 + (q > 2 ? .18 : 0));
    }
    // bilancia e cartellini dei prezzi
    add(g, box(.3, .12, .2, PM.white()), .95, 1.02, -.35); add(g, cyl(.14, .14, .03, 8, PM.chrome()), .95, 1.12, -.35);
    for (let k = 0; k < 3; k++) add(g, box(.14, .1, .01, PM.white()), -.8 + k * .7, 1.2, .43);
    // lampadina
    add(g, new THREE.Mesh(new THREE.SphereGeometry(.08, 6, 4), sb('#ffe0a0')), 0, 2.2, 0);
    place(g, x, z, rot);
    const c = Math.cos(rot || 0), s = Math.sin(rot || 0);
    glow(x, groundH(x, z) + 2.2, z, '#ffd090', 1.6);
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
    const cols = ['#ff5a8a', '#ffd24a', '#5ae8ff', '#8aff7a', '#ff9a3a'];
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

  // guardrail: paletti e lama d'acciaio, a pezzi da 4 m (ognuno si può far volare)
  function guardrail(x0, z0, x1, z1) {
    const g = G0(), L = Math.hypot(x1 - x0, z1 - z0), m = sm('#b8bcc4', { metalness: .6, roughness: .45 }), post = sl('#5a5a62');
    add(g, box(L, .32, .08, m), 0, .62, 0); add(g, box(L, .06, .1, sl('#e8e8e8')), 0, .82, 0);
    [-L / 2 + .2, L / 2 - .2].forEach(o => add(g, box(.12, .8, .12, post), o, .4, -.06));
    for (let o = -L / 2 + 1; o < L / 2 - .5; o += 2) add(g, box(.18, .1, .02, sb('#ff6a3a')), o, .62, .05);
    const ang = Math.atan2(z1 - z0, x1 - x0);
    return place(g, (x0 + x1) / 2, (z0 + z1) / 2, -ang);
  }
  const roadDist = (x, z) => { let best = 1e9, br = null; for (const R of M.roads) for (let k = 0; k < R.pts.length; k += 2) { const d = Math.hypot(R.pts[k][0] - x, R.pts[k][1] - z) - R.w / 2; if (d < best) { best = d; br = R; } } return best; };
  const freeAt = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS), v = G.tileAt(tx, ty); return v !== G.T.BLD && v !== G.T.WATER && v !== G.T.VIA && v !== G.T.FOUNT && v !== G.T.PIER; };
  const zoneAt = (x, z) => { const tx = Math.floor(x / TS), ty = Math.floor(z / TS); return tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH ? -1 : M.zone[ty * G.GW + tx]; };

  function buildProps() {
    const r = rng(77), X = M.OX * TS, Z = M.OY * TS; // X, Z: dove sta il borgo storico (in metri)
    const cr = row => row >= 26 ? 27 + (row - 26) * .75 : row; // la calata è più stretta: la Via al Mare ha preso una fila
    buildArches();
    // ===== BORGO STORICO (com'era) =====
    buildFountain(X + 25 * TS, Z + 11 * TS);
    [[21, 7], [28.5, 7], [21, 13.8], [28.8, 13.8]].forEach(([tx, ty]) => leafyTree(X + tx * TS, Z + ty * TS, r, true));
    bench(X + 22 * TS, Z + 12 * TS, 0); bench(X + 27.5 * TS, Z + 9 * TS, Math.PI); bench(X + 25 * TS, Z + 7.2 * TS, Math.PI, 'marble'); bench(X + 25 * TS, Z + 14.6 * TS, 0, 'marble');
    stall(X + 22.5 * TS, Z + 8 * TS, 0, '#2f6a4e', '#e9e0cf', ['#c84a2a', '#e0b030', '#4a8a3a', '#d06a2a', '#8a2a5a'], r);
    stall(X + 27.5 * TS, Z + 13.5 * TS, Math.PI, '#b0283c', '#e9e0cf', ['#e0d0a0', '#f0e060', '#c83030', '#3a7a3a'], r);
    stall(X + 21 * TS, Z + 9.5 * TS, Math.PI / 2, '#3a5aa8', '#e9e0cf', ['#9ab0c0', '#c0d0d8'], r);
    newsstand(X + 28.8 * TS, Z + 10.5 * TS, -Math.PI / 2, r);
    phoneBooth(X + 29.5 * TS, Z + 12.6 * TS, -Math.PI / 2); mailbox(X + 20.4 * TS, Z + 6.4 * TS, 0);
    crateStack(X + 23.6 * TS, Z + 8.4 * TS, 3, r, '#e0b030'); crate(X + 26.2 * TS, Z + 13.1 * TS, .3, '#c84a2a');
    { const fx = X + 41.5 * TS, fz = Z + 16.5 * TS; const g = G0(); add(g, box(2.6, .8, 1, PM.wood()), 0, .4, 0); add(g, box(2.4, .5, .4, PM.woodL()), 0, 1.0, -.25); place(g, fx, fz); for (let k = 0; k < 10; k++) pot(fx - 1.1 + (k % 5) * .55, fz - .2 + Math.floor(k / 5) * .5, r, 'bucket'); for (let k = 0; k < 4; k++) pot(fx - 1.8 + k * 1.2, fz + 1, r, 'bucket'); parasol(fx, fz, '#e8d8c0', '#f06a8a', 2.6); }
    cafe(X + 1.3 * TS, Z + 7.7 * TS, r, 'marble', 3, ['#b0283c', '#e9e0cf']);
    [[21.5, 23.2], [23.5, 23.2], [27, 23.2]].forEach(([tx, ty]) => { table(X + tx * TS, Z + ty * TS, 'wood', ['vino', 'vino', 'fiasco', 'pane'], r, 2); parasol(X + tx * TS, Z + ty * TS, '#e0cdb0', '#2f5a3e'); });
    crate(X + 3.8 * TS, Z + 8.4 * TS, .1, '#4a8a3a'); crate(X + 4.4 * TS, Z + 8.3 * TS, -.2, '#e0b030'); crate(X + 7.9 * TS, Z + 8.5 * TS, 0, '#c84a2a'); barrel(X + 8.9 * TS, Z + 8.3 * TS, r);
    tireStack(X + 8.6 * TS, Z + 19.5 * TS, 4); tireStack(X + 9.3 * TS, Z + 19.1 * TS, 3); scooterParts(X + 8.8 * TS, Z + 21 * TS, r); drum(X + 9.4 * TS, Z + 21.9 * TS, '#c8302a', r);
    for (let k = 0; k < 9; k++) { const x = X + 1 + k * 3.2, z = Z + 8 * TS - (k % 2 ? .6 : -.6); const l = new THREE.Mesh(new THREE.SphereGeometry(.32, 6, 4), sb('#ff3b2f')); l.scale.y = 1.25; l.position.set(x, 4.8, z); scene.add(l); const cap = box(.36, .08, .36, sl('#e0b040')); cap.position.set(x, 5.2, z); scene.add(cap); const tas = box(.05, .3, .05, sl('#e0b040')); tas.position.set(x, 4.3, z); scene.add(tas); dyn.flicker.push({ s: glow(x, 4.8, z, '#ff4a3a', 2.2, false), base: .6 }); }
    { const cable = box(.03, .03, 30, PM.iron()); cable.rotation.y = Math.PI / 2; cable.position.set(X + 15, 5.3, Z + 8 * TS); scene.add(cable); }
    addLight(X + 6, 4.5, Z + 8 * TS, '#ff3b2f', 2.4, 10, .1); addLight(X + 16, 4.5, Z + 8 * TS, '#ff5a3a', 2.0, 9, .12); addLight(X + 26, 4.5, Z + 8 * TS, '#ff3b2f', 2.0, 9, .1);
    // calata: bitte, casse di pesce, barili, fusti, reti, gru, pescherecci
    for (let x = X + 3; x < X + 72; x += 8) bollard(x, Z + 29.7 * TS);
    crateStack(X + 4 * TS, Z + cr(27) * TS, 4, r, 'fish'); crateStack(X + 17 * TS, Z + cr(28) * TS, 3, r, 'fish'); crateStack(X + 30 * TS, Z + cr(27.5) * TS, 5, r, 'bottles'); crateStack(X + 32.5 * TS, Z + cr(29) * TS, 2, r);
    [[8, 28], [9, 28.4], [22.5, 28.8], [23.2, 28.5]].forEach(([tx, ty], k) => barrel(X + tx * TS, Z + cr(ty) * TS, r, k === 3));
    drumGroup(X + 34.6 * TS, Z + cr(26.5) * TS, r); drumGroup(X + 12.5 * TS, Z + cr(26.4) * TS, r, ['#2a5ab8', '#c8302a']);
    nets(X + 14.5 * TS, Z + cr(27.4) * TS, r); nets(X + 28.5 * TS, Z + cr(28.2) * TS, r); pallet(X + 20 * TS, Z + cr(26.6) * TS, r, true); pallet(X + 19 * TS, Z + cr(27.2) * TS, r, false);
    forklift(X + 33.8 * TS, Z + cr(28.4) * TS, -Math.PI / 2); crane(X + 7 * TS, Z + cr(27.5) * TS, Math.PI, '#d86a2a');
    fishingBoat(X + 10 * TS, Z + 32 * TS, '#2a5a8a', '#e8e2d4', 0, r); fishingBoat(X + 15.5 * TS, Z + 33 * TS, '#e8e2d4', '#c23a2a', .1, r); fishingBoat(X + 24 * TS, Z + 31.8 * TS, '#c23a2a', '#e8e2d4', -.08, r); fishingBoat(X + 30 * TS, Z + 33 * TS, '#2f7a5a', '#e0c040', .05, r); fishingBoat(X + 37 * TS, Z + 32.5 * TS, '#1a2a4a', '#e8e2d4', 1.4, r);
    [[10, 26.3], [24, 26.3], [36, 26.3]].forEach(([tx, ty]) => streetLamp(X + tx * TS, Z + cr(ty + .7) * TS, 'sodium', 0));
    [[22, 14.35], [72, 14.35], [70, 30.35], [32, 46.35], [84, 46.35], [52, 46.35], [4, 30.35]].forEach(([x, z]) => streetLamp(X + x, Z + z - .5, 'wall', Math.PI));
    [[20.5, 6.5], [29.5, 6.5], [20.5, 14.5], [29.5, 14.5]].forEach(([tx, ty]) => streetLamp(X + tx * TS, Z + ty * TS, 'classic', 0));
    shrine(X + 16.13, Z + 4, 3, Math.PI / 2); shrine(X + 21, Z + 30.13, 3, 0); shrine(X + 36.13, Z + 40, 3, Math.PI / 2);
    [[8.5, 3, 7], [18.5, 4, 8.5], [30.5, 12, 7.5], [38.5, 3, 8], [18.5, 20, 7], [8.5, 11, 6.5], [30.5, 20.5, 9]].forEach(([tx, ty, y]) => laundry(X + tx * TS + TS / 2, Z + ty * TS, y, 4.4, true, r));
    for (let k = 0; k < 10; k++) { const tx = pick(r, [8.5, 18.5, 30.5, 38.5]), ty = 1 + r() * 20; const c = box(4.2, .03, .03, PM.iron()); c.position.set(X + tx * TS + TS / 2, 8 + r() * 5, Z + ty * TS); c.rotation.y = (r() - .5) * .5; scene.add(c); }
    [[9, 12], [19, 16], [31, 3], [39, 12], [0.5, 16], [9, 20]].forEach(([tx, ty], k) => bin(X + tx * TS + .6, Z + ty * TS, k % 3 === 1 ? 'dumpster' : 'pole', k % 2 ? Math.PI / 2 : 0));
    bin(X + 30.6 * TS, Z + 16.4 * TS, 'glass'); cat(X + 2 * TS, Z + 7.2 * TS, r); cat(X + 19.3 * TS, Z + 3 * TS, r); cat(X + 34 * TS, Z + cr(29) * TS, r);

    const B = id => G.BUILDINGS.find(b => b.id === id);
    // ===== PONENTE =====
    // pineta attorno alla discoteca, sul rilievo
    for (let k = 0; k < 26; k++) { const x = (9 + r() * 17) * TS, z = (23 + r() * 14) * TS; if (!freeAt(x, z) || roadDist(x, z) < 3) continue; const d = B('disco'); if (x > d.x * TS - 3 && x < (d.x + d.w) * TS + 3 && z > d.y * TS - 3 && z < (d.y + d.h) * TS + 5) continue; pineTree(x, z, r); }
    { const d = B('disco'), dx = d.x * TS, dz = (d.y + d.h) * TS; searchlight(dx + 2, dz + 1.5, '#c05cff', 0); searchlight(dx + d.w * TS - 2, dz + 1.5, '#35e6ff', 2); stanchions(dx + d.w * TS / 2 - 3, dz + 2.2, 4); pot(dx + d.w * TS / 2 - 4, dz + 1, r, 'palm'); pot(dx + d.w * TS / 2 + 4, dz + 1, r, 'palm'); picnicTable(dx - 4, dz + 6, .2, r); picnicTable(dx + d.w * TS + 4, dz + 8, -.3, r); }
    // Cinema Astor: pensilina con le lampadine e manifesti
    { const c = B('cinema'), x0 = c.x * TS, z1 = (c.y + c.h) * TS, w = c.w * TS; const g = G0(); add(g, box(w - 1, .5, 2.2, sm('#e8c060')), w / 2, 3.3, 1.1); add(g, box(w - .8, .15, 2.3, sm('#c83a3a')), w / 2, 3.6, 1.1); const tex = signTexture('ULTIMA PRIMA', '#ffd23b', '#2a0a1a'); const sg = new THREE.Mesh(new THREE.BoxGeometry(8, 1.1, .1), [sb('#2a0a1a'), sb('#2a0a1a'), sb('#2a0a1a'), sb('#2a0a1a'), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), sb('#2a0a1a')]); sg.position.set(w / 2, 4.3, 2.2); sg.userData.keep = true; g.add(sg); g.position.set(x0 + .5, groundH(x0 + w / 2, z1 + 1), z1 - .1); shadowed(g); scene.add(g); marquee(x0 + 1, groundH(x0 + w / 2, z1 + 1) + 3.05, z1 + 2.2, w - 2, r); addLight(x0 + w / 2, 3, z1 + 2, '#ffd890', 3, 10, 0).always = true; posterBoard(x0 + 1.2, z1 + .3, 0, r); posterBoard(x0 + w - 1.2, z1 + .3, 0, r); }
    // Bar Sirena: tavolini davanti all'ingresso
    { const b = B('sirena'); cafe((b.door[0] + .5) * TS, (b.door[1] - .3) * TS, r, 'plastic', 3, ['#2ab8b0', '#f4f0e6']); phoneBooth((b.x - .6) * TS, (b.y + 1) * TS, Math.PI / 2); }
    // giardini delle palme
    for (let k = 0; k < 9; k++) { const x = (11 + r() * 12) * TS, z = (61 + r() * 8) * TS; if (freeAt(x, z) && roadDist(x, z) > 2) addStatic(palmTree(x, groundH(x, z), z, r)); }
    for (let k = 0; k < 6; k++) { const x = (11 + r() * 12) * TS, z = (61 + r() * 8) * TS; if (freeAt(x, z) && roadDist(x, z) > 1.5) (k % 3 ? bush(x, z, r, pick(r, ['#f06aa8', '#ffffff', '#f0e060'])) : agave(x, z, r)); }
    { const P = G.PLACES.giardini; bench(P.x - 3, P.y, Math.PI / 2, 'deco'); bench(P.x + 3, P.y, -Math.PI / 2, 'deco'); drinkFountain(P.x, P.y + 3); streetLamp(P.x, P.y - 4, 'deco', 0); }
    // la rotonda: palme e fiori sull'aiuola
    { const R = M.rb; addStatic(palmTree(R.x, groundH(R.x, R.y), R.y, r, 8)); addStatic(palmTree(R.x - 2.2, groundH(R.x - 2.2, R.y + 1), R.y + 1, r, 6.5)); addStatic(palmTree(R.x + 2, groundH(R.x + 2, R.y - 1.4), R.y - 1.4, r, 7)); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; bush(R.x + Math.cos(a) * 4.2, R.y + Math.sin(a) * 4.2, r, pick(r, ['#f06aa8', '#ffd24a', '#ffffff'])); } }
    // fermata dell'autobus sul viale
    { const R = M.roads.find(q => q.id === 'viale'), p = R.pts[Math.floor(R.pts.length / 2)]; busStop(p[0], p[1] - R.w / 2 - 1.6, 0); bin(p[0] + 3, p[1] - R.w / 2 - 1.2, 'pole'); }
    // cantiere navale e marina
    { const c = B('cantiere'), x0 = c.x * TS, z0 = c.y * TS; hullOnCradle(x0 + c.w * TS + 7, z0 + 4, Math.PI / 2); crane(x0 + c.w * TS + 14, z0 - 2, Math.PI / 2, '#e8b020');
      [[0, 0], [0, 1], [5, 0], [10, 0], [10, 1]].forEach(([o, lv]) => container(x0 - 1 + o, z0 - 9, 0, pick(r, ['#c8402a', '#2a6ab8', '#e8a020', '#2a8a5a', '#8a3a8a', '#d8d4cc']), lv * 2.6));
      drumGroup(x0 + 2, z0 + c.h * TS + 3, r); pallet(x0 + 8, z0 + c.h * TS + 3, r, true); forklift(x0 + 12, z0 + c.h * TS + 4, 0); streetLamp(x0 + c.w * TS + 2, z0 + c.h * TS + 1, 'sodium', 0); }
    { const P = G.PLACES.marina; yacht(P.x - 6, P.y + 8, 0, '#ff4fa3', r); yacht(P.x + 6, P.y + 12, .04, '#35c8e6', r); sailboat(P.x - 8, P.y + 18, -.05, r); sailboat(P.x + 8, P.y + 20, .1, r); yacht(P.x + 12, P.y + 6, Math.PI / 2, '#8a60e0', r); lifebuoy(P.x + 1.6, P.y + 2, 0); bollard(P.x - 1.6, P.y + 4); bollard(P.x + 1.6, P.y + 10); streetLamp(P.x + 1.8, P.y, 'deco', Math.PI); }
    { const P = G.PLACES.punta; bench(P.x + 2, P.y - 1, Math.PI); const g = G0(); add(g, cyl(.02, .03, 3.4, 4, PM.woodL()), 0, 1.4, .8, .7, 0, 0); add(g, box(.3, .25, .3, sm('#2a5ab8')), .3, .12, 0); place(g, P.x - 2, P.y + 2, Math.PI); }

    // ===== COLLINA: il Santuario e il belvedere =====
    { const s = B('santuario'), cx = (s.x + s.w / 2) * TS, z = (s.y + s.h) * TS + 3;
      [-10, -4, 4, 10].forEach(o => streetLamp(cx + o, z + 2, 'classic', 0)); bench(cx - 7, z + 4, 0, 'marble'); bench(cx + 7, z + 4, 0, 'marble');
      const P = G.PLACES.belvedere; binoculars(P.x, P.y + 1, 0); binoculars(P.x + 3, P.y + 1, 0); bench(P.x - 3, P.y, 0, 'marble'); [-8, 8].forEach(o => cypress(cx + o * 1.6, z - 1, r)); pot(cx - 3, z - 1, r, 'lemon'); pot(cx + 3, z - 1, r, 'lemon'); cat(cx + 5, z + 1, r); }
    // trattoria e caruggio lungo il primo tornante: tavoli, festone, vasi, bucato
    { const t = B('car_2'), dz = (t.y + t.h) * TS + 1.2; table(t.x * TS + 2, dz, 'wood', ['vino', 'fiasco', 'pane', 'vino'], r, 2); table(t.x * TS + 6.5, dz, 'wood', ['vino', 'vino', 'pane'], r, 2); table(t.x * TS + 10.5, dz, 'wood', ['fiasco', 'vino', 'posacenere'], r, 2);
      const a = B('car_1'), b = B('car_5'); festoon(a.x * TS + 1, groundH(a.x * TS + 1, dz) + 4.6, dz + .4, (b.x + b.w) * TS - 1, groundH((b.x + b.w) * TS - 1, dz) + 4.6, dz + .4, 60, r);
      ['car_1', 'car_3', 'car_4', 'car_5'].forEach(id => { const h = B(id); pot((h.x + 1) * TS, (h.y + h.h) * TS + .7, r); pot((h.x + h.w - 1) * TS, (h.y + h.h) * TS + .7, r); laundry((h.x + h.w / 2) * TS, (h.y + h.h) * TS + 1.4, groundH((h.x + h.w / 2) * TS, (h.y + h.h) * TS) + 7, 3.8, true, r); });
      shrine((B('car_3').x) * TS - .13, (B('car_3').y + 1.5) * TS, groundH(B('car_3').x * TS, (B('car_3').y + 1.5) * TS) + 3, -Math.PI / 2); }
    // alberi sparsi sulla collina e in campagna: pini, lecci, cipressi
    for (let k = 0; k < 220; k++) {
      const x = 8 + r() * (G.WW - 16), z = 6 + r() * (G.WH - 12), zz = zoneAt(x, z);
      if ((zz !== M.Z.COLLE && zz !== M.Z.NAT) || !freeAt(x, z) || roadDist(x, z) < 3.5) continue;
      const tx = Math.floor(x / TS), ty = Math.floor(z / TS); if (G.tileAt(tx, ty) !== G.T.GRASS) continue;
      let nb = false; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (G.tileAt(tx + i, ty + j) === G.T.BLD && !M.wallAt[(ty + j) * G.GW + tx + i]) nb = true; if (nb) continue;
      const q = r(); if (q < .45) pineTree(x, z, r); else if (q < .75) leafyTree(x, z, r, false); else if (q < .9) cypress(x, z, r); else bush(x, z, r);
    }
    // ===== LUNGOMARE =====
    { const R = M.roads.find(q => q.id === 'litoranea'); const lp = R.pts.filter(([x, z]) => x > 230 && z > 64 && z < 112);
      lp.forEach(([x, z], k) => { if (k % 8 === 4) addStatic(palmTree(x + R.w / 2 + 2.2, groundH(x + R.w / 2 + 2.2, z), z, r, 7 + r() * 2.5)); if (k % 16 === 0) { streetLamp(x + R.w / 2 + 1.2, z, 'deco', Math.PI / 2); streetLamp(x - R.w / 2 - 1.2, z + 8, 'deco', -Math.PI / 2); } if (k % 24 === 12) bench(x + R.w / 2 + 3.4, z, -Math.PI / 2, 'deco'); });
      ['flamingo', 'paradiso', 'oceano'].forEach(id => { const b = B(id); pot((b.x + b.w) * TS + .8, (b.door[1] - 1) * TS, r, 'palm'); pot((b.x + b.w) * TS + .8, (b.door[1] + 2) * TS, r, 'palm'); });
      const gl = B('gelateria'); table((gl.x + gl.w) * TS + 1.2, (gl.door[1] - .8) * TS, 'deco', ['gelato', 'gelato', 'caffe'], r, 1); table((gl.x + gl.w) * TS + 1.2, (gl.door[1] + 1.4) * TS, 'deco', ['gelato', 'birra'], r, 1);
      const v = B('video'); phoneBooth((v.x + v.w) * TS + 1, (v.y) * TS + .5, -Math.PI / 2); mailbox((v.x + v.w) * TS + 1, (v.y + v.h) * TS - .5, -Math.PI / 2); }
    // la spiaggia: cabine, ombrelloni, lettini, torretta, pedalò
    { const UMB = [['#ff6aa0', '#f4f0e6'], ['#40c0e0', '#f4f0e6'], ['#f0c030', '#f4f0e6'], ['#8a60e0', '#f4f0e6'], ['#ff8a3c', '#f4f0e6']];
      const sand = (x, z) => G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === G.T.SAND;
      for (let z = 62; z < 146; z += 9) { const x0 = 250; if (sand(x0, z)) { const g = G0(); beachCabins(x0 - 6, z, 1, r); } }
      for (let row = 0; row < 3; row++) for (let z = 60; z < 148; z += 4.6) {
        const x = 256 + row * 4.2, c = pick(r, UMB); if (!sand(x, z) || !sand(x + 3, z) || (z > 86 && z < 98)) continue;
        beachUmbrella(x, z, r, c[0], c[1]); sunbed(x + .4, z - .9, Math.PI / 2, pick(r, ['#f4f0e6', '#7fd6e0', '#f7a6c0']), r); if (r() < .6) sunbed(x + .4, z + .9, Math.PI / 2, pick(r, ['#f4f0e6', '#7fd6e0', '#f7a6c0']), r);
      }
      for (let k = 0; k < 12; k++) { const x = 254 + r() * 18, z = 62 + r() * 80; if (sand(x, z)) towel(x, z, r); }
      lifeguardTower(270, 92); shower(252, 76); shower(252, 120); volleyNet(262, 132);
      pedalo(284, 84, .3 + Math.PI / 2, '#f4a6c0'); pedalo(286, 96, -.2 + Math.PI / 2, '#7fd6e0'); rowboat(284, 112, 1.2, '#2a5a8a'); rowboat(283, 128, -.9, '#c83a3a');
      const ch = B('chiosco'), cx = (ch.x + ch.w / 2) * TS, cz = (ch.y + ch.h) * TS + 3; table(cx - 2.5, cz + 1.5, 'plastic', ['birra', 'birra', 'posacenere'], r, 3); table(cx + 2.5, cz + 2, 'plastic', ['boccale', 'birra'], r, 2); parasol(cx - 2.5, cz + 1.5, '#ff8a3c', '#f4f0e6'); parasol(cx + 2.5, cz + 2, '#ff8a3c', '#f4f0e6'); crate(cx + 4, cz - 1, .2, 'bottles'); crate(cx + 4, cz, -.1, 'bottles'); }

    // ===== LUNGO LE STRADE: lampioni, guardrail sui tornanti e sulla scogliera, cestini =====
    { const lamps = [];
      M.roads.forEach(R => {
        if (R.id === 'rotonda') return;
        for (let k = 6; k < R.pts.length - 2; k += 22) {
          const [x, z] = R.pts[k], [x2, z2] = R.pts[Math.min(R.pts.length - 1, k + 2)], a = Math.atan2(z2 - z, x2 - x), side = (k / 22) % 2 < 1 ? 1 : -1;
          const lx = x - Math.sin(a) * side * (R.w / 2 + 1.3), lz = z + Math.cos(a) * side * (R.w / 2 + 1.3);
          if (!freeAt(lx, lz) || lamps.some(([px, pz]) => Math.hypot(px - lx, pz - lz) < 9) || zoneAt(lx, lz) === M.Z.BORGO) continue;
          const zz = zoneAt(lx, lz), kind = R.bridge || zz === M.Z.PORTO ? 'sodium' : zz === M.Z.LUNGO || zz === M.Z.SPIAGGIA ? 'deco' : 'classic';
          lamps.push([lx, lz]); streetLamp(lx, lz, kind, side > 0 ? Math.PI - a : -a);
        }
      });
      // guardrail dove la strada ha il vuoto accanto (tornanti, scogliera)
      M.roads.forEach(R => {
        if (R.id !== 'tornanti' && R.id !== 'litoranea' && R.id !== 'pini') return;
        for (let k = 0; k < R.pts.length - 4; k += 4) {
          const [x, z] = R.pts[k], [x2, z2] = R.pts[k + 4], a = Math.atan2(z2 - z, x2 - x), h = R.h[k];
          [1, -1].forEach(side => {
            const o = R.w / 2 + .6, ex = x - Math.sin(a) * side * o, ez = z + Math.cos(a) * side * o, ex2 = x2 - Math.sin(a) * side * o, ez2 = z2 + Math.cos(a) * side * o;
            const fx = x - Math.sin(a) * side * (o + 3), fz = z + Math.cos(a) * side * (o + 3);
            const drop = h - groundH(fx, fz), sea = G.tileAt(Math.floor(fx / TS), Math.floor(fz / TS)) === G.T.WATER;
            if ((drop > 1.6 || (sea && h > 2)) && freeAt(ex, ez) && zoneAt(ex, ez) !== M.Z.BORGO) guardrail(ex, ez, ex2, ez2);
          });
        }
      });
      // cestini e panchine sui marciapiedi delle zone abitate
      for (let k = 0; k < 40; k++) { const x = 8 + r() * (G.WW - 16), z = 6 + r() * (G.WH - 12), tx = Math.floor(x / TS), ty = Math.floor(z / TS); if (G.tileAt(tx, ty) !== G.T.WALK) continue; if (r() < .6) bin(x, z, 'pole', r() * 6); else bench(x, z, Math.round(r() * 4) * Math.PI / 2); }
    }
    // vasi davanti alle porte
    G.BUILDINGS.forEach((b, i) => {
      if (!b.door || b.warehouse || b.kiosk) return; const rr = rng(i * 5 + 1); const dx = b.door[0] * TS + TS / 2, dz = b.door[1] * TS + TS / 2;
      const fS = b.door[1] === b.y + b.h, fN = b.door[1] === b.y - 1;
      for (let k = 0; k < 2; k++) { if (rr() < .3) continue; const o = k ? 1.25 : -1.25; const x = dx + (fS || fN ? o : 0), z = dz + (fS || fN ? 0 : o) - (fS ? .6 : fN ? -.6 : 0); if (!G.walkM(x, z) || G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === G.T.VIA) continue; pot(x, z, rr, rr() < .3 ? 'lemon' : undefined); }
    });
    // scogli lungo la costa selvaggia
    for (let k = 0; k < 90; k++) {
      const tx = Math.floor(r() * G.GW), ty = Math.floor(r() * G.GH); if (G.tileAt(tx, ty) !== G.T.ROCK) continue;
      const x = tx * TS + r() * TS, z = ty * TS + r() * TS, s = .6 + r() * 1.6; const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), sm(pick(r, ['#6a6064', '#5a5258', '#7a6e6a']))); rk.position.set(x, groundH(x, z) - s * .3, z); rk.scale.set(1, .6 + r() * .4, 1); rk.rotation.set(r() * 3, r() * 3, 0); addStatic(rk);
    }
    // gabbiani sul porto e sulla spiaggia
    for (let k = 0; k < 14; k++) {
      const g = G0(), wm = sl('#f4f2ee'), tip = sl('#2a2a30');
      add(g, box(.16, .14, .5, wm), 0, 0, 0); add(g, box(.1, .1, .14, sl('#f0c040')), 0, 0, .3);
      const wl = G0(), wr = G0(); add(wl, box(.7, .03, .24, wm), -.35, 0, 0); add(wl, box(.2, .03, .2, tip), -.75, 0, 0); add(wr, box(.7, .03, .24, wm), .35, 0, 0); add(wr, box(.2, .03, .2, tip), .75, 0, 0); g.add(wl, wr);
      scene.add(g); dyn.gulls.push({ g, wl, wr, cx: pick(r, [X + 40, X + 60, 270, 60]), cz: pick(r, [Z + 70, 110, 180]), rad: 8 + r() * 14, h: 9 + r() * 7, sp: .2 + r() * .25, ph: r() * 6 });
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
    const g = v.kind === 'vespa' ? vespaMesh(v.color) : carMesh(v.kind, v.color, v.police);
    const K = G.VK[v.kind];
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
    const N = 900, pos = new Float32Array(N * 6);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#8ea0d8', transparent: true, opacity: .45 }));
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
          float d1 = lin(texture2D(tD, uv+vec2(px.x,0.)).r), d2 = lin(texture2D(tD, uv-vec2(px.x,0.)).r), d3 = lin(texture2D(tD, uv+vec2(0.,px.y)).r), d4 = lin(texture2D(tD, uv-vec2(0.,px.y)).r);
          float edge = max(max(d1-d, d2-d), max(d3-d, d4-d));
          float ol = smoothstep(.45*(1.+d*.01), .9*(1.+d*.012), edge);
          c = mix(c, c*.3 + vec3(.04,.01,.07), ol*.85);
          // aloni: le zone molto luminose (neon, lampioni) si allargano un po'
          vec3 bl = vec3(0.);
          for (int k=0;k<8;k++){ float a = float(k)*.785; vec2 o = vec2(cos(a),sin(a))*px*2.5; vec3 s = texture2D(tC, uv+o).rgb; bl += max(s-.72, 0.); }
          c += bl*.22;
          float l = dot(c, vec3(.299,.587,.114));
          // grading da Vice City: ombre viola e blu, luci calde rosa e arancio
          c = mix(c, c*.72 + vec3(.20,.08,.34)*.38, (1.-smoothstep(.0,.45,l))*.62);
          c += mix(vec3(.07,.03,-.02), vec3(.09,.02,.05), dusk)*smoothstep(.45,1.,l);
          c = mix(vec3(l), c, 1.24*sat);
          c = (c-.5)*1.1+.5;
          vec2 q = vUv-.5; c *= 1. - dot(q,q)*.85;
          float vg = smoothstep(.18, .5, length(q*vec2(1.,1.2)));
          c = mix(c, vec3(.55,.02,.05), vg*hurt*.75);
          float bd = bayer(floor(vUv*res)) - .5;
          c = floor(c*22. + bd + .5)/22.;
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
  let TARGET = 330, lastSize = null;
  function lowQuality() { if (TARGET < 330) return; TARGET = 270; moon.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } }); if (lastSize) resize(...lastSize); }
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

  // ---------------- INIZIALIZZAZIONE ----------------
  const LPOOL = [];
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
    const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120; moon.shadow.bias = -.0015;
    scene.add(moon); scene.add(moon.target);
    // poche luci vere, spostate ogni fotogramma sulle sorgenti più vicine
    for (let i = 0; i < 14; i++) { const l = new THREE.PointLight('#ffb35c', 0, 10, 2); scene.add(l); LPOOL.push(l); }
    dyn.vehicles = {};
    buildSky(); buildGround(); buildWater(); buildBuildings(); buildProps(); buildParticles(); buildSkyline(); buildFx(); buildDebris(); buildPost();
    flushStatic();
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
  function updateLights(time, night, fx, fz) {
    frameN++;
    if (frameN % 4 === 1 || !dyn.lsorted) { LSRC.forEach(L => { const dx = L.x - fx, dz = L.z - fz; L.d2 = dx * dx + dz * dz; }); dyn.lsorted = LSRC.filter(L => L.d2 < 55 * 55).sort((a, b) => a.d2 - b.d2).slice(0, LPOOL.length); }
    LPOOL.forEach((l, i) => {
      const L = dyn.lsorted[i]; if (!L) { l.intensity = 0; return; }
      let k = L.always ? .55 + night * .45 : night; if (L.flick) k *= 1 - L.flick * .5 * (Math.sin(time * 13 + L.phase) * .5 + .5) * (Math.sin(time * 3.7 + L.phase * 2) > .3 ? 1 : .2);
      const fadeD = Math.max(0, 1 - Math.max(0, Math.sqrt(L.d2) - 40) / 15);
      l.position.set(L.x, L.y, L.z); l.color.copy(L.color); l.distance = L.dist; l.intensity = L.base * k * fadeD;
    });
  }
  function frame(st, dt, ui) {
    const p = st.player, night = nightLevel(st.t), dusk = Math.min(1, duskLevel(st.t));
    horizonColor(night, dusk, tmpC);
    scene.background.copy(tmpC); scene.fog.color.copy(tmpC);
    hemi.intensity = .5 + (1 - night) * .6; hemi.color.set(night > .5 ? '#6a5ab8' : dusk > .3 ? '#d8a0c0' : '#b8c4e0'); hemi.groundColor.set(night > .5 ? '#2a1236' : '#4a3040');
    fillAmb.intensity = .32 + (1 - night) * .2; fillAmb.color.set(night > .5 ? '#3a2a58' : '#4a3a50');
    moon.intensity = .7 + (1 - night) * .45; moon.color.set(night > .5 ? '#8fa2ff' : (dusk > .3 ? '#ff8a6a' : '#fff0d8'));
    moon.position.set(cam.x - 30 * Math.cos(1 - night) - dusk * 20, 40 - dusk * 18, cam.y - 26); moon.target.position.set(cam.x, 0, cam.y);
    dyn.buildings.forEach(b => b.mats.forEach(m => { if (m.emissiveMap) m.emissiveIntensity = .15 + night * 1.0; }));
    if (dyn.backdropMats) dyn.backdropMats.forEach(m => m.emissiveIntensity = .1 + night * .9);
    const time = ui.time || st.clock;
    updateLights(time, night, cam.x, cam.y);
    dyn.flicker.forEach(f => { f.s.material.opacity = f.base * (.2 + night * .8) * (.85 + Math.sin(time * 9 + f.base * 7) * .15); });
    dyn.signs.forEach(s => { if (s.flick) { const on = Math.sin(time * 17) > -.85 || Math.sin(time * 2.3) > .2; s.m.color.setScalar(on ? 1 : .35); if (s.gl) s.gl.material.opacity = on ? .45 : .1; } });
    if (dyn.water) { const U = dyn.water.uniforms; U.time.value = time; U.night.value = night; U.dusk.value = dusk; U.fogC.value.copy(tmpC); U.camP.value.copy(camera.position); U.fogN.value = scene.fog.near; U.fogF.value = scene.fog.far; }
    if (dyn.sky) { dyn.sky.position.copy(camera.position); const U = dyn.sky.material.uniforms; U.night.value = night; U.dusk.value = dusk; U.time.value = time; const sunA = ((st.t / 60) % 24 - 12) / 12 * Math.PI; U.sun.value.set(-Math.cos(sunA * .5) * .9 - .2, Math.max(-.2, .55 - Math.abs((st.t / 60) % 24 - 13) / 12), -.35).normalize(); }
    if (dyn.skyline) { dyn.skyline.position.set(camera.position.x, 8, camera.position.z); dyn.skyline.material.opacity = .5 + night * .5; }
    dyn.boats.forEach(b => { b.g.position.y = (b.y !== undefined ? b.y : -.3) + Math.sin(time * 1.3 + b.ph) * .08; b.g.rotation.z = Math.sin(time * 1.1 + b.ph) * .04; });
    dyn.laundry.forEach(l => { if (l.ax === false) l.m.rotation.z = Math.sin(time * 2 + l.ph) * .25; else l.m.rotation.x = Math.sin(time * 2 + l.ph) * .25; });
    dyn.spin.forEach(s => { s.o.rotation.y = time * s.speed; s.o.children.forEach(c => c.children.forEach(m => m.material.opacity = .015 + night * .06)); });
    dyn.beams.forEach(b => { b.piv.rotation.z = Math.sin(time * .6 + b.ph) * .45; b.piv.rotation.x = Math.cos(time * .45 + b.ph) * .3; b.mat.opacity = .02 + night * .13; });
    dyn.chasers.forEach(c => { const n = c.bulbs.length; c.bulbs.forEach((b, i) => b.material.color.set(((i + Math.floor(time * 8)) % 3) === 0 ? '#fff4c0' : '#6a4a20')); });
    dyn.gulls.forEach(g => { const a = time * g.sp + g.ph; g.g.position.set(g.cx + Math.cos(a) * g.rad, g.h + Math.sin(a * 2.3) * .8, g.cz + Math.sin(a) * g.rad); g.g.rotation.y = -a; const f = Math.sin(time * 9 + g.ph) * .5; g.wl.rotation.z = f; g.wr.rotation.z = -f; });
    if (dyn.lanterna) { const a = time * .8; dyn.lanterna.position.set(camera.position.x - 130, 22, camera.position.z - 60); dyn.lanterna.material.opacity = (.35 + .65 * Math.max(0, Math.sin(a))) * (.3 + night * .7); }
    if (dyn.antenna) dyn.antenna.material.opacity = Math.sin(time * 3) > 0 ? .9 : .15;

    // persone
    const pveh = p.vehicle ? st.vehicles.find(v => v.id === p.vehicle) : null;
    st.npcs.forEach(n => {
      let g = dyn.people[n.id]; if (!g) { g = person(n.look, false); scene.add(g); dyn.people[n.id] = g; }
      g.visible = !n.inside;
      if (!g.visible) return;
      g.position.set(n.x, groundH(n.x, n.y), n.y); g.rotation.y = Math.PI / 2 - n.face;
      const armed = n.weapon && !n.dead && (n.action.name === 'combatte' || (n.cop && G.hostile(st, n)));
      animPerson(g, { anim: n.anim, speed: n.speedNow, gesture: n.gesture, down: n.stun > 0 || n.dead, weapon: armed ? n.weapon : null, hit: Math.max(0, 1 - (st.clock - n.hitT) * 12), handsUp: !n.dead && n.stun <= 0 && n.action.name === 'fugge' && n.panic <= 0 && p.cur !== 'pugni' && Math.hypot(n.x - p.x, n.y - p.y) < 6, twoHand: n.cop });
      g.userData.shadowC.visible = !n.dead;
      flight(g, n, st);
    });
    let pg = dyn.people.__player; if (!pg) {
      pg = person({ skin: '#dcae88', top: '#8c2f24', bottom: '#34425f', hair: '#17110e', hat: 'none', build: 1.05, extra: '' }, true); scene.add(pg); dyn.people.__player = pg;
      const xray = new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: .5, depthWrite: false, depthTest: false });
      const ghosts = []; pg.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && !o.userData.noGhost) ghosts.push(o); });
      dyn.ghosts = ghosts.map(o => { const gm = new THREE.Mesh(o.geometry, xray); gm.renderOrder = 999; gm.visible = false; o.add(gm); return gm; });
      const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 16), new THREE.MeshBasicMaterial({ color: '#ffb35c', transparent: true, opacity: .7, depthWrite: false, toneMapped: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .04; pg.add(ring);
    }
    const onVespa = pveh && pveh.kind === 'vespa';
    playerH = groundH(p.x, p.y);
    pg.visible = !pveh || onVespa;
    pg.position.set(p.x, playerH + (onVespa ? .35 : 0), p.y); pg.rotation.y = Math.PI / 2 - p.face;
    const recoil = st.kick ? Math.max(0, 1 - (st.clock - st.kick.t) * 10) * st.kick.amt * 3 : 0;
    animPerson(pg, { anim: p.anim, speed: pveh ? 0 : p.speed, carrying: p.carrying, punch: p.punch, seated: onVespa, down: p.stun > 0, weapon: p.cur !== 'pugni' ? p.cur : null, recoil, hit: Math.max(0, 1 - (st.clock - p.hurtT) * 10) * .6 });
    if (!pveh) flight(pg, p, st);
    for (const k in pg.userData.guns) { const fl = pg.userData.guns[k].userData.model.userData.flame; if (fl) { fl.material.opacity = .7 + Math.random() * .3; fl.scale.set(.2 + Math.random() * .06, .28 + Math.random() * .1, 1); } }
    // veicoli
    st.vehicles.forEach(v => {
      let g = dyn.vehicles[v.id]; if (!g) { g = vehicleMesh(v); scene.add(g); dyn.vehicles[v.id] = g; }
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

    const raining = isRaining(st.t);
    const R = dyn.rain; R.m.visible = raining;
    if (raining) { for (let i = 0; i < R.N; i++) { const s = R.seeds[i]; const y = cam.h + 18 - ((time * 22 + s[2] * 18) % 18); const x = cam.x + (s[0] - .5) * 60, z = cam.y + (s[1] - .5) * 60; R.pos.set([x, y, z, x - .08, y - .7, z + .05], i * 6); } R.m.geometry.attributes.position.needsUpdate = true; }
    const Mo = dyn.motes; for (let i = 0; i < Mo.M; i++) { const s = Mo.s[i]; Mo.p.set([cam.x + (s[0] - .5) * 40 + Math.sin(time * .3 + i) * 1.5, cam.h + ((time * .25 + s[2] * 6) % 6), cam.y + (s[1] - .5) * 40], i * 3); }
    Mo.m.geometry.attributes.position.needsUpdate = true; Mo.m.material.opacity = .15 + night * .5;

    // ---------- camera cinematografica ----------
    const driving = !!pveh && !ui.intro && !ui.dialogNpc;
    cam.drive += ((driving ? 1 : 0) - cam.drive) * Math.min(1, dt * 1.6);
    const D = cam.drive, ease = D * D * (3 - 2 * D);
    let tx = p.x, ty = p.y, tz = 1;
    if (!pveh && ui.aimPoint && !ui.intro && !ui.dialogNpc) { const la = p.cur !== 'pugni' ? .28 : .12; const dx = ui.aimPoint.x - p.x, dy = ui.aimPoint.y - p.y, l = Math.hypot(dx, dy), m = Math.min(l * la, p.cur !== 'pugni' ? 5 : 2.5); if (l > .1) { tx += dx / l * m; ty += dy / l * m; } tz = p.cur !== 'pugni' ? 1.12 : 1; }
    if (pveh) {
      const vsp = pveh.vx !== undefined ? Math.hypot(pveh.vx, pveh.vy) : Math.abs(pveh.speed);
      const head = vsp > 3 && pveh.speed > -1 ? angLerp(pveh.ang, Math.atan2(pveh.vy, pveh.vx), .6) : pveh.ang;
      let lead = 2.5 + Math.max(0, pveh.speed > -1 ? vsp : 0) * .35;
      for (let L = 0; L <= lead; L += .5) { const x = pveh.x + Math.cos(head) * L, z = pveh.y + Math.sin(head) * L; if (G.tileAt(Math.floor(x / G.TS), Math.floor(z / G.TS)) === G.T.BLD) { lead = Math.max(0, L - 1.2); break; } }
      tx = pveh.x + Math.cos(head) * lead; ty = pveh.y + Math.sin(head) * lead;
      const behind = Math.atan2(-Math.cos(head), -Math.sin(head));
      if (cam.drive < .05) cam.dyaw = cam.yaw;
      if (Math.abs(pveh.speed) > 1.2 || cam.drive < .9) cam.dyaw = angLerp(cam.dyaw, pveh.speed < -1 ? behind + Math.PI : behind, Math.min(1, dt * (1.6 + Math.abs(pveh.speed) * .08)));
    }
    if (ui.dialogNpc) { const n = G.byId(st, ui.dialogNpc); if (n) { tx = (p.x + n.x) / 2; ty = (p.y + n.y) / 2; } tz = .6; }
    const mo = st.moments[0], focus = [[p.x, p.y]];
    if (mo && mo.npcs && !pveh) {
      const ns = mo.npcs.map(id => G.byId(st, id)).filter(n => n && !n.inside && Math.hypot(n.x - p.x, n.y - p.y) < 16);
      if (ns.length) { const w = ns[0]; tx = p.x * .55 + w.x * .45; ty = p.y * .55 + w.y * .45; tz = .8; ns.forEach(n => focus.push([n.x, n.y])); }
    }
    if (ui.dialogNpc) { const n = G.byId(st, ui.dialogNpc); if (n) focus.push([n.x, n.y]); }
    if (ui.intro) { tx = (M.OX + 22) * TS + Math.sin(time * .08) * 30; ty = (M.OY + 22) * TS + Math.cos(time * .06) * 8; tz = 1.25; }
    const kf = 1 - Math.pow(pveh ? .004 : .02, dt);
    cam.x += (tx - cam.x) * kf; cam.y += (ty - cam.y) * kf; cam.zoom += (tz - cam.zoom) * (1 - Math.pow(.05, dt));
    cam.h += (groundH(ui.intro ? tx : p.x, ui.intro ? ty : p.y) - cam.h) * Math.min(1, dt * 4);
    let kx = 0, ky = 0;
    if (st.kick) { const k = Math.max(0, 1 - (st.clock - st.kick.t) * 9); kx = -Math.cos(st.kick.a) * st.kick.amt * k * 1.2; ky = -Math.sin(st.kick.a) * st.kick.amt * k * 1.2; }
    const sh = st.shake || 0, sx = (Math.random() - .5) * sh * 1.4, sy = (Math.random() - .5) * sh * 1.4;
    cam.yaw = angLerp(YAW, cam.dyaw, ease);
    const pitch = lerp(PITCH, (onVespa ? .44 : .42) + Math.max(0, 1 - (cam.cd || 13) / 13) * .35, ease);
    const fov = lerp(14, onVespa ? 44 : 42, ease) * (1 + (pveh ? Math.hypot(pveh.vx || pveh.speed, pveh.vy || 0) : 0) / 18 * .16 * ease);
    const viewH = VIEW * cam.zoom;
    const walkDist = (viewH / 2) / Math.tan(14 * Math.PI / 360);
    let driveDist = onVespa ? 10.5 : 13.5;
    if (ease > .01) {
      const hx = Math.sin(cam.yaw), hz = Math.cos(cam.yaw), cp = Math.cos(onVespa ? .44 : .42);
      for (let s = 1.5; s < driveDist; s += .4) { const x = cam.x + hx * cp * s, z = cam.y + hz * cp * s; if (G.tileAt(Math.floor(x / G.TS), Math.floor(z / G.TS)) === G.T.BLD && !isWall(Math.floor(x / G.TS), Math.floor(z / G.TS))) { driveDist = Math.max(5, s - 1); break; } }
    }
    cam.cd = cam.cd === undefined ? driveDist : cam.cd + (driveDist - cam.cd) * Math.min(1, dt * (driveDist < cam.cd ? 14 : 2.5));
    const dist = lerp(walkDist, cam.cd, ease);
    camera.fov = fov; camera.near = lerp(20, .5, ease); camera.far = lerp(260, 180, ease); camera.updateProjectionMatrix();
    const ox = Math.sin(cam.yaw) * Math.cos(pitch) * dist, oy = Math.sin(pitch) * dist, oz = Math.cos(cam.yaw) * Math.cos(pitch) * dist;
    const cx = cam.x + kx + sx, cz = cam.y + ky + sy, cy = cam.h + lerp(0, 1, ease);
    camera.position.set(cx + ox, cy + oy, cz + oz); camera.lookAt(cx, cy, cz);
    if (ease < .02) {
      const texel = viewH / H; camera.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const pos = camera.position.clone(), a = pos.dot(right), b = pos.dot(up);
      pos.addScaledVector(right, Math.round(a / texel) * texel - a).addScaledVector(up, Math.round(b / texel) * texel - b);
      camera.position.copy(pos);
    }
    camera.updateMatrixWorld();
    scene.fog.near = lerp(walkDist + 14, 30, ease); scene.fog.far = lerp(walkDist + 80, 110, ease);
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
  function screenToGround(nx, ny) { ground.constant = -(1.1 + playerH); ray3.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), camera); return ray3.ray.intersectPlane(ground, hit3) ? { x: hit3.x, y: hit3.z } : null; }
  function camBasis() { const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); return { fx: f.x, fz: f.z, rx: -f.z, rz: f.x }; }
  function snap(st) { cam.x = st.player.x; cam.y = st.player.y; cam.h = groundH(st.player.x, st.player.y); }
  return { sfx: DZ.sfx, hits: DZ.hits, __dz: DZ, __models: { weaponModel, carMesh, vespaMesh, pickupMesh, applyDamage, get scene() { return scene; }, get renderer() { return renderer; } }, cam, getCamera: () => camera, screenToGround, camBasis, lowQuality, snap, init, frame, project, nightLevel, isRaining, groundH, resize: (cw, ch, dpr) => resize(cw, ch, dpr), YAW };
})();
