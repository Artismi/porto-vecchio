/* Porto Vecchio — L'Ordine e gli animali: la grafica (legge st.ord e st.ani, non cambia mai lo stato del gioco).
   - Animali: ogni specie è fatta di pezzi (corpo, testa, coda, zampe) fusi in una geometria con i colori nei vertici;
     ogni pezzo è un InstancedMesh (una chiamata di disegno per pezzo e per specie, qualunque sia il numero di animali).
     Le zampe camminano a passo diagonale, la testa si abbassa a pascolare o annusare, la coda scodinzola, chi dorme
     si accuccia, chi è morto resta di fianco. Si disegnano solo quelli vicini all'inquadratura.
   - La nave: scafo con la prua a punta, ponte di comando con le finestre, fumaiolo, alberi di carico, container sul ponte
     (spariscono man mano che si scarica), luci di via di notte. Due livree: la nave dell'Impero e la Marina della Tutela.
   - Le casse sulla banchina, il posto di blocco (cavalletti, coni, sbarra, cartello, lampeggiante), gli arredi della
     questura (bandiera, lampada blu, garitta, sbarra, sacchetti di sabbia, bacheca), del supermercato (tenda, carrelli,
     cassette di frutta, lavagna, paletti della fila) e dei posti di guardia della Base (garitte, sacchetti, cuccia).
   - Gli striscioni dei cortei, tenuti da due manifestanti.
   Tutto statico è fuso per sito (poche chiamate di disegno). Si aggancia a render.js con attach() e tick(). */
var OrdineArte = (function () {
  'use strict';
  let scene = null, G = null, groundH = null, ready = false, built = false;
  const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const M4 = (x, y, z, rx, ry, rz, sx, sy, sz) => { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(x || 0, y || 0, z || 0); _s.set(sx === undefined ? 1 : sx, sy === undefined ? (sx === undefined ? 1 : sx) : sy, sz === undefined ? (sx === undefined ? 1 : sx) : sz); return new THREE.Matrix4().compose(_p, _q, _s); };
  const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = {}, SPH = {}, CONE = {};
  const cylG = (seg) => CYL[seg] || (CYL[seg] = new THREE.CylinderGeometry(1, 1, 1, seg));
  const taperG = (rt, seg) => CYL['t' + rt + '_' + seg] || (CYL['t' + rt + '_' + seg] = new THREE.CylinderGeometry(rt, 1, 1, seg));
  const sphG = (seg) => SPH[seg] || (SPH[seg] = new THREE.SphereGeometry(1, seg, Math.max(4, seg * .6 | 0)));
  const coneG = (seg) => CONE[seg] || (CONE[seg] = new THREE.ConeGeometry(1, 1, seg));

  // ---------------- COSTRUTTORE DI GEOMETRIE FUSE ----------------
  function P0() { return { pos: [], nor: [], col: [] }; }
  function put(P, geo, col, m) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()); g.applyMatrix4(m);
    const pa = g.attributes.position.array, na = g.attributes.normal.array; _c.set(col);
    for (let i = 0; i < pa.length; i++) { P.pos.push(pa[i]); P.nor.push(na[i]); }
    for (let i = 0, n = pa.length / 3; i < n; i++) P.col.push(_c.r, _c.g, _c.b);
    g.dispose();
  }
  const bx = (P, w, h, d, col, x, y, z, rx, ry, rz) => put(P, BOX, col, M4(x, y, z, rx, ry, rz, w, h, d));
  const cy = (P, r, h, col, x, y, z, rx, ry, rz, seg, rt) => put(P, rt !== undefined ? taperG(rt, seg || 10) : cylG(seg || 10), col, M4(x, y, z, rx, ry, rz, r, h, r));
  const sp = (P, rx_, ry_, rz_, col, x, y, z, seg, ax, ay, az) => put(P, sphG(seg || 10), col, M4(x, y, z, ax, ay, az, rx_, ry_, rz_));
  const cn = (P, r, h, col, x, y, z, rx, ry, rz, seg) => put(P, coneG(seg || 8), col, M4(x, y, z, rx, ry, rz, r, h, r));
  // un'asta tra due punti
  function rod(P, r, col, a, b, seg) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || .001;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
    const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(r, L, r));
    put(P, cylG(seg || 6), col, m);
  }
  function geoOf(P) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(P.nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(P.col, 3));
    g.computeBoundingSphere(); return g;
  }
  let MAT = null, MATB = null, MATG = null;
  const mats = () => { if (!MAT) { MAT = new THREE.MeshLambertMaterial({ vertexColors: true }); MATB = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); MATG = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: .5, depthWrite: false }); } };
  function meshOf(P, opt) { mats(); const m = new THREE.Mesh(geoOf(P), (opt && opt.basic) ? MATB : (opt && opt.glass) ? MATG : MAT); m.castShadow = !(opt && opt.noShadow); m.receiveShadow = true; return m; }
  // una scritta su un pannello
  function textTex(lines, w, h, bg, fg, o) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, w, h); if (o && o.border) { x.strokeStyle = o.border; x.lineWidth = Math.max(2, h * .05); x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth); }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
    const L = Array.isArray(lines) ? lines : [lines], lh = h / (L.length + .4);
    L.forEach((t, i) => { let fs = Math.floor(lh * .78); x.font = `bold ${fs}px sans-serif`; while (x.measureText(t).width > w * .92 && fs > 8) { fs -= 1; x.font = `bold ${fs}px sans-serif`; } x.fillText(t, w / 2, lh * (i + .7)); });
    const t = new THREE.CanvasTexture(c); t.anisotropy = 2; return t;
  }
  function panel(tex, w, h, opt) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), (opt && opt.basic) ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: opt.side || THREE.FrontSide }) : new THREE.MeshLambertMaterial({ map: tex, side: (opt && opt.side) || THREE.FrontSide })); return m; }

  // ---------------- IL SITO DI UN EDIFICIO: origine alla porta, +z verso fuori ----------------
  function frameOf(b) {
    const TS = G.TS, d = b.door, cx = (b.x + b.w / 2), cy = (b.y + b.h / 2);
    let ox = 0, oy = 0; if (d[0] < b.x) ox = -1; else if (d[0] >= b.x + b.w) ox = 1; else if (d[1] < b.y) oy = -1; else oy = 1;
    if (!ox && !oy) { const dx = d[0] + .5 - cx, dy = d[1] + .5 - cy; if (Math.abs(dx) > Math.abs(dy)) ox = Math.sign(dx); else oy = Math.sign(dy); }
    // la faccia della casa: la porta sta sulla casella fuori dall'edificio
    const fx = ox > 0 ? (b.x + b.w) * TS : ox < 0 ? b.x * TS : (d[0] + .5) * TS, fz = oy > 0 ? (b.y + b.h) * TS : oy < 0 ? b.y * TS : (d[1] + .5) * TS;
    const ang = Math.atan2(oy, ox);   // direzione "fuori" nel gioco
    return { x: fx, z: fz, ry: Math.PI / 2 - ang, out: [ox, oy], side: [-oy, ox], halfW: (ox ? b.h : b.w) * TS / 2 };
  }
  function siteGroup(F) { const g = new THREE.Group(); g.position.set(F.x, groundH(F.x + F.out[0] * 1.5, F.z + F.out[1] * 1.5), F.z); g.rotation.y = F.ry; scene.add(g); return g; }

  // ---------------- LA QUESTURA ----------------
  const FLAG = {};
  function flagTex() { if (FLAG.t) return FLAG.t; const c = document.createElement('canvas'); c.width = 96; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#8a1e1e'; x.fillRect(0, 0, 96, 64); x.fillStyle = '#1a1414'; x.fillRect(0, 44, 96, 20); x.fillStyle = '#f0e8d8'; x.beginPath(); x.arc(30, 26, 15, 0, 7); x.fill(); x.strokeStyle = '#1a1414'; x.lineWidth = 4; x.beginPath(); x.moveTo(18, 30); x.quadraticCurveTo(24, 18, 30, 28); x.quadraticCurveTo(36, 38, 42, 24); x.stroke(); FLAG.t = new THREE.CanvasTexture(c); FLAG.t.magFilter = THREE.NearestFilter; return FLAG.t; }
  const FLAGS = [];
  function flag(g, x, y, z, w, h) {
    const geo = new THREE.PlaneGeometry(w, h, 8, 1); geo.translate(w / 2, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide })); m.position.set(x, y, z); m.castShadow = true; g.add(m);
    FLAGS.push({ m, base: geo.attributes.position.array.slice(), ph: Math.random() * 6 }); return m;
  }
  function garitta(P, x, z, ry, col) {   // la garitta a righe
    const c = col || '#e8e2d4', s = '#2a3040';
    const m = M4(x, 0, z, 0, ry, 0);
    const parts = P0();
    bx(parts, 1.2, .1, 1.2, '#6a6a68', 0, .05, 0);
    for (let i = 0; i < 6; i++) bx(parts, 1.12, .36, .08, i % 2 ? s : c, 0, .3 + i * .36, -.52), bx(parts, .08, .36, 1.12, i % 2 ? s : c, -.52, .3 + i * .36, 0), bx(parts, .08, .36, 1.12, i % 2 ? s : c, .52, .3 + i * .36, 0);
    bx(parts, .3, 2.16, .08, c, -.41, 1.2, .52); bx(parts, .3, 2.16, .08, c, .41, 1.2, .52); bx(parts, 1.12, .3, .08, s, 0, 2.15, .52);
    cn(parts, .95, .55, '#3a3a40', 0, 2.62, 0, 0, Math.PI / 4, 0, 4);
    const geo = geoOf(parts); geo.applyMatrix4(m); P.pos.push(...geo.attributes.position.array); P.nor.push(...geo.attributes.normal.array); P.col.push(...geo.attributes.color.array);
  }
  function sandbags(P, x, z, ry, n, rows) {
    for (let r = 0; r < (rows || 2); r++) for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * .62 + (r % 2) * .31, c = Math.cos(ry), s = Math.sin(ry); sp(P, .32, .14, .2, ['#b8a878', '#a89868', '#c0b080'][(i + r) % 3], x + c * o, .14 + r * .24, z - s * o, 6, 0, ry, 0); }
  }
  function barrierArm(P, x, z, ry, L) {
    const c = Math.cos(ry), s = Math.sin(ry);
    bx(P, .3, 1, .3, '#3a3a40', x, .5, z); bx(P, .4, .3, .4, '#2a3040', x, 1, z);
    for (let i = 0; i < 6; i++) { const o = .3 + (i + .5) * L / 6; bx(P, L / 6, .1, .1, i % 2 ? '#f0f0f0' : '#c81818', x + c * o, 1.02, z - s * o, 0, ry, 0); }
    bx(P, .14, .8, .14, '#3a3a40', x + c * (L + .3), .4, z - s * (L + .3));
  }
  function buildQuestura() {
    const b = G.BUILDINGS.find(k => k.id === 'commissariato'); if (!b || !b.door) return;
    const F = frameOf(b), g = siteGroup(F), P = P0(), w = Math.min(F.halfW, 8);
    // l'asta della bandiera e la bandiera
    cy(P, .07, 7.5, '#9a9a9a', -w + 1.2, 3.75, 1.2, 0, 0, 0, 8); sp(P, .13, .13, .13, '#d8c060', -w + 1.2, 7.55, 1.2, 8);
    bx(P, .7, .3, .7, '#6a6a68', -w + 1.2, .15, 1.2);
    flag(g, -w + 1.27, 6.7, 1.2, 1.9, 1.25);
    // garitta, sbarra del cortile, sacchetti
    garitta(P, w - .6, 1.6, 0);
    barrierArm(P, w + .6, 3.2, 0, 4.5);
    sandbags(P, -1.8, 1.3, 0, 3, 2); sandbags(P, 1.8, 1.3, 0, 3, 2);
    // la bacheca con gli avvisi e i ricercati
    bx(P, 1.6, 1.1, .08, '#4a3a2a', -3.4, 1.5, .1); cy(P, .05, 1, '#3a3a3a', -4.1, .5, .12, 0, 0, 0, 6); cy(P, .05, 1, '#3a3a3a', -2.7, .5, .12, 0, 0, 0, 6);
    const mesh = meshOf(P); g.add(mesh);
    const bach = panel(textTex(['AVVISI', 'RICERCATI', 'COPRIFUOCO 23:00'], 128, 96, '#e8e2cc', '#2a1a1a', { border: '#8a1e1e' }), 1.45, 1); bach.position.set(-3.4, 1.5, .15); g.add(bach);
    // la lampada blu della Guardia sopra la porta
    const lamp = panel(textTex('ГВАРДИЯ · GUARDIA', 192, 40, '#1a3a8a', '#e8f0ff'), 1.9, .4, { basic: true }); lamp.position.set(0, 3.1, .18); g.add(lamp);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(2, .5, .26), new THREE.MeshLambertMaterial({ color: '#1a2030' })); lb.position.set(0, 3.1, .05); g.add(lb);
    LAMPS.push({ m: lamp.material, on: '#ffffff', off: '#5a6a8a' });
    // le strisce dei parcheggi delle volanti
    const S = P0(); for (let i = 0; i < 4; i++) bx(S, .1, .02, 4.5, '#e8e8e0', w + 1.5 + i * 5 - 2.5, .03, 6); g.add(meshOf(S, { noShadow: true }));
  }
  const LAMPS = [];

  // ---------------- IL SUPERMERCATO ----------------
  function cart(P, x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), at = (dx, dz) => [x + c * dx + s * dz, z - s * dx + c * dz];
    const m = '#b8bcc4';
    const [a1, a2] = at(0, 0); bx(P, .55, .4, .85, m, a1, .75, a2, 0, ry, 0);
    const [b1, b2] = at(0, 0); bx(P, .5, .32, .8, '#3a3e48', b1, .78, b2, 0, ry, 0);
    for (const [dx, dz] of [[-.22, -.35], [.22, -.35], [-.22, .35], [.22, .35]]) { const [p1, p2] = at(dx, dz); cy(P, .06, .03, '#1a1a1a', p1, .06, p2, 0, ry, Math.PI / 2, 8); rod(P, .015, m, [p1, .1, p2], [p1, .55, p2]); }
    const [h1, h2] = at(0, -.5); bx(P, .55, .05, .05, '#c81818', h1, 1.05, h2, 0, ry, 0);
  }
  function crateFruit(P, x, z, col) { bx(P, .6, .3, .4, '#a07848', x, .15, z); for (let i = 0; i < 6; i++) sp(P, .07, .07, .07, col, x - .18 + (i % 3) * .18, .33, z - .08 + Math.floor(i / 3) * .16, 6); }
  function buildSuper() {
    const O = typeof Ordine !== 'undefined' ? Ordine.SUPER : null; if (!O || !O.b.door) return;
    const F = frameOf(O.b), g = siteGroup(F), P = P0(), w = Math.min(F.halfW, 6);
    // la tenda a righe sopra l'ingresso
    for (let i = 0; i < 10; i++) bx(P, w * 2 / 10, .06, 1.5, i % 2 ? '#e8d040' : '#2a6a3a', -w + (i + .5) * w * 2 / 10, 2.75, .75, -.25, 0, 0);
    bx(P, w * 2, .25, .06, '#2a6a3a', 0, 2.55, 1.45);
    // i carrelli, le cassette di frutta e verdura, la lavagna
    for (let i = 0; i < 5; i++) cart(P, w - .8, .9 + i * .38, Math.PI / 2);
    crateFruit(P, -w + .8, .6, '#e88a2a'); crateFruit(P, -w + 1.5, .6, '#c8c040'); crateFruit(P, -w + .8, 1.1, '#5a8a3a'); crateFruit(P, -w + 1.5, 1.1, '#c84a3a');
    bx(P, .7, .9, .05, '#1a2a1a', -1.6, .65, 1.2, -.18, .3, 0); bx(P, .7, .9, .05, '#4a3a2a', -1.6, .65, 1.38, .18, .3, 0);
    // i paletti della fila con la corda, lungo il marciapiede
    const L = 7; for (let i = 0; i <= 5; i++) { const xx = 1.6 + i * L / 5; cy(P, .04, .95, '#c8a030', xx, .48, 2.1, 0, 0, 0, 6); cy(P, .14, .04, '#2a2a2a', xx, .02, 2.1, 0, 0, 0, 8); if (i < 5) rod(P, .02, '#8a1e1e', [xx, .9, 2.1], [xx + L / 5, .9, 2.1]); }
    g.add(meshOf(P));
    const lav = panel(textTex(['OGGI', 'PANE · LATTE', 'PASTA · OLIO', 'SOLO CON TESSERA'], 64, 96, '#1a2a1a', '#e8e8d8'), .62, .82); lav.position.set(-1.6, .66, 1.23); lav.rotation.set(-.18, .3, 0); g.add(lav);
    const man = panel(textTex(['LA TESSERA', 'È IL TUO DOVERE'], 128, 64, '#c81818', '#fff4d0'), 1.4, .7); man.position.set(w - 1.4, 1.7, .08); g.add(man);
  }

  // ---------------- LA BASE: garitte, sacchetti, la cuccia ----------------
  function buildBase(st) {
    const P = P0(), posts = [];
    st.npcs.forEach(n => { if (n.ord && n.ord.post && !n.ord.post.route && n.ord.post.x !== undefined) posts.push(n.ord.post); });
    const seen = new Set();
    posts.forEach(q => { const k = Math.round(q.x) + ',' + Math.round(q.y); if (seen.has(k)) return; seen.add(k); const gx = q.x - Math.cos(q.face) * 1.6, gz = q.y - Math.sin(q.face) * 1.6; const P1 = P0(); garitta(P1, 0, 0, Math.PI / 2 - q.face, '#c8c8b0'); const m = meshOf(P1); m.position.set(gx + Math.sin(q.face) * 1.5, groundH(gx, gz), gz - Math.cos(q.face) * 1.5); scene.add(m); if (q.gate) { const S = P0(); sandbags(S, 0, 0, Math.PI / 2 - q.face, 4, 3); const ms = meshOf(S); ms.position.set(q.x + Math.cos(q.face) * 1.6, groundH(q.x, q.y), q.y + Math.sin(q.face) * 1.6); scene.add(ms); } });
    const cp = G.PLACES.caserma_p; if (cp) { const K = P0(); bx(K, 1.2, .8, 1, '#6a5038', 0, .4, 0); cn(K, .95, .5, '#3a2a20', 0, 1.05, 0, 0, Math.PI / 4, 0, 4); bx(K, .5, .5, .05, '#1a1410', 0, .35, .51); const m = meshOf(K); m.position.set(cp.x + 6, groundH(cp.x + 6, cp.y + 5), cp.y + 5); scene.add(m); }
  }

  // ---------------- IL PORTO: bitte e casse ----------------
  let CRATES = null;
  function buildPort() {
    const O = typeof Ordine !== 'undefined' ? Ordine : null; if (!O) return;
    const P = P0(), Q = O.QUAY, B = O.BERTH;
    for (let x = B.x - 16; x <= B.x - 2; x += 4) { const z = B.y - 5.2; cy(P, .22, .5, '#2a2a2a', x, .25, z, 0, 0, 0, 10); sp(P, .27, .14, .27, '#2a2a2a', x, .5, z, 8); }
    const m = meshOf(P); m.position.y = groundH(B.x - 10, B.y - 6) - .05; scene.add(m);
    const geo = new THREE.BoxGeometry(1.15, 1.0, 1.15); const pos = geo.attributes.position, cols = []; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); _c.set(y > .45 ? '#8a6a40' : '#6a5030'); cols.push(_c.r, _c.g, _c.b); } geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    mats(); CRATES = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }), 24); CRATES.count = 0; CRATES.castShadow = true; CRATES.receiveShadow = true; CRATES.frustumCulled = false; scene.add(CRATES);
    const tint = ['#c8b090', '#7a8a6a', '#9a8a7a', '#b8a080']; for (let i = 0; i < 24; i++) CRATES.setColorAt(i, _c.set(tint[i % 4]));
    const h = groundH(Q.x, Q.y);
    for (let i = 0; i < 24; i++) { const col = i % 4, row = Math.floor(i / 4) % 3, lay = Math.floor(i / 12); CRATES.setMatrixAt(i, M4(Q.x - 1.8 + col * 1.25, h + .5 + lay * 1.02, Q.y - 2 + row * 1.25, 0, (i * .37) % .2, 0)); }
    CRATES.instanceMatrix.needsUpdate = true;
  }

  // ---------------- LA NAVE ----------------
  const SHIP = {};
  function shipModel(kind) {
    const mil = kind === 'militare', P = P0(), W = P0(), Lt = P0();
    const hullC = mil ? '#5a626a' : '#1e1e24', band = mil ? '#e8e8e8' : '#b82020', sup = mil ? '#7a828a' : '#ece8e0', deck = mil ? '#4a5056' : '#6a5a48';
    // lo scafo: corpo, prua a punta, poppa tonda; sotto la linea di galleggiamento il rosso
    bx(P, 7.6, 3.6, 26, hullC, 0, -.2, -2);
    for (let i = 0; i < 8; i++) { const t = i / 8, w0 = 7.6 * (1 - t * t * .92), z = 11 + i * 1; bx(P, w0, 3.6 - t * .3, 1.02, hullC, 0, -.2 + t * .25, z); }
    cy(P, 3.8, 3.6, hullC, 0, -.2, -15, 0, 0, 0, 16);
    bx(P, 7.4, 1.3, 25.6, '#8a2a22', 0, -1.6, -2); cy(P, 3.65, 1.3, '#8a2a22', 0, -1.6, -15, 0, 0, 0, 16);
    bx(P, 7.7, .25, 26.1, band, 0, 1.45, -2);
    // il ponte e le murate
    bx(P, 7.3, .2, 32, deck, 0, 1.62, -1.5);
    bx(P, .15, .6, 30, hullC, -3.75, 1.95, -1.5); bx(P, .15, .6, 30, hullC, 3.75, 1.95, -1.5);
    for (let z = -14; z < 15; z += 2.5) { cy(P, .04, .8, '#c8c8c8', -3.65, 2.1, z, 0, 0, 0, 4); cy(P, .04, .8, '#c8c8c8', 3.65, 2.1, z, 0, 0, 0, 4); }
    // il castello di poppa: due piani, le finestre del ponte di comando, le alette
    bx(P, 6.6, 2.6, 6.5, sup, 0, 3, -11.5); bx(P, 5.4, 2.2, 4.8, sup, 0, 5.4, -12); bx(P, 8.6, .2, 2, sup, 0, 6.5, -10.2);
    for (let i = 0; i < 6; i++) { bx(W, .7, .7, .05, '#ffe8a0', -2.25 + i * .9, 5.6, -9.58); bx(P, .72, .72, .04, '#1a2028', -2.25 + i * .9, 5.6, -9.57); }
    for (let i = 0; i < 4; i++) { bx(W, .55, .5, .05, '#ffe8a0', -3.32, 3.2, -13.5 + i * 1.3, 0, Math.PI / 2, 0); bx(W, .55, .5, .05, '#ffe8a0', 3.32, 3.2, -13.5 + i * 1.3, 0, Math.PI / 2, 0); }
    // il fumaiolo con la fascia
    cy(P, 1.05, 3.4, mil ? '#5a626a' : '#b82020', 0, 7.6, -13.8, -.12, 0, 0, 12); cy(P, 1.08, .5, '#141414', 0, 9.35, -14, -.12, 0, 0, 12);
    if (!mil) cy(P, 1.08, .5, '#f0e8d8', 0, 7.8, -13.8, -.12, 0, 0, 12);
    // l'albero radar
    cy(P, .12, 3.2, '#c8c8c8', 0, 8.1, -11.5, 0, 0, 0, 6); bx(P, 2.2, .12, .3, '#2a2a2a', 0, 9.5, -11.5);
    // gli alberi di carico coi bighi
    for (const z of [1, 9]) { cy(P, .22, 9, '#c8a030', 0, 6, z, 0, 0, 0, 8); bx(P, 4.2, .25, .25, '#c8a030', 0, 8.8, z); rod(P, .12, '#c8a030', [0, 2.4, z], [-2.4, 7.2, z - 3.8]); rod(P, .12, '#c8a030', [0, 2.4, z], [2.4, 7.2, z + 3.8]); rod(P, .025, '#2a2a2a', [0, 10.4, z], [-2.4, 7.2, z - 3.8]); rod(P, .025, '#2a2a2a', [0, 10.4, z], [2.4, 7.2, z + 3.8]); }
    cy(P, .1, 6, '#c8c8c8', 0, 4.6, 15.5, 0, 0, 0, 6);
    // le stive (boccaporti)
    bx(P, 5, .5, 5.5, mil ? '#3a4046' : '#2a5a3a', 0, 1.95, -3.2); bx(P, 5, .5, 5.5, mil ? '#3a4046' : '#2a5a3a', 0, 1.95, 5.2);
    if (mil) { cy(P, 1.1, .8, '#5a626a', 0, 2.1, 12.5, 0, 0, 0, 12); bx(P, 1.2, .8, 1.6, '#5a626a', 0, 2.8, 12.5); cy(P, .14, 3.2, '#3a4046', 0, 2.9, 14.4, Math.PI / 2 - .08, 0, 0, 8); }
    // luci di via: rossa a sinistra, verde a dritta, bianche sugli alberi
    bx(Lt, .3, .3, .3, '#ff2020', -4.35, 6.5, -10.2); bx(Lt, .3, .3, .3, '#20ff40', 4.35, 6.5, -10.2); sp(Lt, .2, .2, .2, '#fff8e0', 0, 10.6, 1, 6); sp(Lt, .2, .2, .2, '#fff8e0', 0, 7.7, 15.5, 6);
    const g = new THREE.Group(); g.add(meshOf(P));
    const win = meshOf(W, { basic: true, noShadow: true }); g.add(win); const lights = meshOf(Lt, { basic: true, noShadow: true }); g.add(lights);
    // i container sul ponte
    const conts = [], cc = mil ? ['#4a5a3a', '#5a6a4a', '#3a4a3a', '#6a6a5a', '#4a5a3a', '#5a5a4a'] : ['#a83a2a', '#2a5a9a', '#3a7a4a', '#c8a030', '#8a8a8a', '#a83a2a'];
    const CPOS = [[-1.3, 3.45, -3.2], [1.3, 3.45, -3.2], [-1.3, 3.45, 5.2], [1.3, 3.45, 5.2], [-1.3, 5.97, -3.2], [1.3, 5.97, 5.2]];
    for (let i = 0; i < 6; i++) { const C = P0(), rib = '#' + _c.set(cc[i]).multiplyScalar(.72).getHexString(); bx(C, 2.4, 2.5, 5.8, cc[i], 0, 0, 0); for (let k = 0; k < 8; k++) bx(C, 2.44, 2.3, .07, rib, 0, 0, -2.62 + k * .75); bx(C, 2.46, .12, 5.86, rib, 0, 1.25, 0); bx(C, 2.3, 2.2, .04, rib, 0, 0, 2.92); const m = meshOf(C); m.position.set(...CPOS[i]); g.add(m); conts.push(m); }
    // il nome sulla fiancata
    const name = panel(textTex(mil ? 'T-27 · MARINA DELLA TUTELA' : 'STELLA DELL\'IMPERO', 256, 32, mil ? '#5a626a' : '#1e1e24', '#f0f0e8'), 6, .75, { side: THREE.DoubleSide }); name.position.set(3.83, .8, 8); name.rotation.y = Math.PI / 2; g.add(name);
    const name2 = name.clone(); name2.position.x = -3.83; name2.rotation.y = -Math.PI / 2; g.add(name2);
    // la bandiera a poppa
    flag(g, 0, 6.2, -17.2, 1.5, 1);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.6, 6), new THREE.MeshLambertMaterial({ color: '#c8c8c8' })); pole.position.set(0, 5.6, -17.2); g.add(pole);
    g.visible = false; scene.add(g);
    return { g, conts, win, lights };
  }

  // ---------------- IL POSTO DI BLOCCO ----------------
  let BLOCCO = null;
  function bloccoModel() {
    const P = P0(), L = P0();
    // i cavalletti a righe ai due lati della carreggiata
    for (const sx of [-3.4, 3.4]) {
      for (const dz of [-.5, .5]) { rod(P, .04, '#3a3a3a', [sx - .9, 0, dz], [sx - .6, 1, dz * .2]); rod(P, .04, '#3a3a3a', [sx + .9, 0, dz], [sx + .6, 1, dz * .2]); }
      for (let i = 0; i < 6; i++) bx(P, .34, .28, .06, i % 2 ? '#f4f4f4' : '#d81818', sx - .85 + i * .34, .95, 0);
      bx(L, .18, .18, .18, '#ffb020', sx + .7, 1.2, 0);
    }
    // i coni a zig zag sulla linea di mezzo
    for (let i = 0; i < 5; i++) { const x = (i % 2 ? .6 : -.6), z = -6 + i * 3; cn(P, .2, .65, '#ff6a10', x, .33, z, 0, 0, 0, 10); cy(P, .22, .05, '#ff6a10', x, .02, z, 0, 0, 0, 4); cy(P, .14, .1, '#f4f4f4', x, .38, z, 0, 0, 0, 10, .7); }
    // la sbarra mobile e il cartello ALT
    bx(P, .5, .2, .5, '#3a3a40', 2.6, .1, 3.5); cy(P, .06, 1.2, '#3a3a40', 2.6, .7, 3.5, 0, 0, 0, 6);
    for (let i = 0; i < 6; i++) bx(P, .52, .09, .09, i % 2 ? '#f4f4f4' : '#d81818', 2.35 - i * .52, 1.15, 3.5);
    cy(P, .04, 1.6, '#3a3a3a', -2.4, .8, -2.6, 0, 0, 0, 6);
    const g = new THREE.Group(); g.add(meshOf(P)); const lamps = meshOf(L, { basic: true, noShadow: true }); g.add(lamps);
    const sign = panel(textTex(['ALT', 'ПОСТ · CONTROLLO'], 128, 96, '#d81818', '#ffffff', { border: '#ffffff' }), .9, .68, { side: THREE.DoubleSide }); sign.position.set(-2.4, 1.75, -2.6); g.add(sign);
    g.visible = false; scene.add(g);
    return { g, lamps };
  }

  // ---------------- GLI STRISCIONI DEI CORTEI ----------------
  const BANNERS = [];
  const BTXT = { pane: ['PANE PER TUTTI', 'ABBIAMO FAME'], arresto: ['LIBERATELI SUBITO', 'BASTA FERMI'], rabbia: ['VIA I GRIGI DALL\'ISOLA', 'NON ABBIAMO PAURA'], risacca: ['LA RISACCA NON SI FERMA', 'LIBERTÀ PER L\'ISOLA'] };
  function bannerMesh() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 48; const t = new THREE.CanvasTexture(c);
    const g = new THREE.Group(); const cloth = new THREE.Mesh(new THREE.PlaneGeometry(4, .75, 8, 1), new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide })); cloth.position.y = 1.85; g.add(cloth);
    const pm = new THREE.MeshLambertMaterial({ color: '#7a5a3a' });
    for (const x of [-2, 2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 2.4, 5), pm); p.position.set(x, 1.2, 0); g.add(p); }
    g.visible = false; scene.add(g);
    return { g, cloth, c, t, txt: '' };
  }
  function bannerText(B, txt) { if (B.txt === txt) return; B.txt = txt; const x = B.c.getContext('2d'); x.fillStyle = '#f2ecdc'; x.fillRect(0, 0, 256, 48); x.fillStyle = '#a81818'; let fs = 30; x.font = `bold ${fs}px sans-serif`; while (x.measureText(txt).width > 244 && fs > 10) { fs--; x.font = `bold ${fs}px sans-serif`; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 128, 26); B.t.needsUpdate = true; }

  // ================= GLI ANIMALI =================
  // ogni specie: pezzi in coordinate dell'animale (metri, muso verso +z), perni di collo, coda e zampe
  function dogParts(o) {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff', dark = '#1a1410', base = o.base || wh, saddle = o.saddle || base;
    cy(B, .13, .5, base, 0, .44, 0, Math.PI / 2, 0, 0, 10); sp(B, .16, .16, .17, base, 0, .45, .2, 10); sp(B, .14, .14, .15, base, 0, .44, -.22, 10);
    if (o.saddle) sp(B, .135, .07, .3, saddle, 0, .56, -.02, 8);
    cy(B, .085, .22, base, 0, .56, .28, -.7, 0, 0, 8);
    bx(H, .2, .17, .2, base, 0, .04, .07); bx(H, .11, .09, .16, base, 0, -.005, .22); bx(H, .055, .045, .04, dark, 0, .03, .3); bx(H, .03, .03, .02, dark, -.06, .08, .17); bx(H, .03, .03, .02, dark, .06, .08, .17);
    if (o.prick) { cn(H, .045, .13, saddle, -.065, .19, .03, 0, 0, -.15, 4); cn(H, .045, .13, saddle, .065, .19, .03, 0, 0, .15, 4); }
    else { bx(H, .04, .11, .07, saddle, -.11, .07, .04, 0, 0, .5); bx(H, .04, .11, .07, saddle, .11, .07, .04, 0, 0, -.5); }
    cy(T, .03, .32, base, 0, .14, -.06, -.5, 0, 0, 6, .4);
    cy(L, .035, .4, base, 0, -.2, 0, 0, 0, 0, 6); bx(L, .07, .04, .09, base, 0, -.39, .02);
    return { B, H, T, L, neck: [0, .62, .34], tail: [0, .5, -.34], hips: [[-.08, .4, .2], [.08, .4, .2], [-.08, .4, -.2], [.08, .4, -.2]], legH: .4, swing: .55, freq: 9 };
  }
  function catParts() {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff', dark = '#141010';
    cy(B, .07, .28, wh, 0, .2, 0, Math.PI / 2, 0, 0, 8); sp(B, .08, .08, .09, wh, 0, .2, .13, 8); sp(B, .075, .075, .085, wh, 0, .2, -.14, 8);
    sp(H, .07, .065, .07, wh, 0, .02, .03, 8); cn(H, .028, .06, wh, -.04, .08, .02, 0, 0, -.2, 4); cn(H, .028, .06, wh, .04, .08, .02, 0, 0, .2, 4); bx(H, .02, .015, .01, '#e8a0a0', 0, .0, .1); bx(H, .016, .016, .01, '#8ac040', -.025, .03, .09); bx(H, .016, .016, .01, '#8ac040', .025, .03, .09);
    cy(T, .014, .3, wh, 0, .14, -.04, -.35, 0, 0, 5, .7);
    cy(L, .018, .2, wh, 0, -.1, 0, 0, 0, 0, 5);
    return { B, H, T, L, neck: [0, .27, .2], tail: [0, .23, -.2], hips: [[-.04, .2, .12], [.04, .2, .12], [-.04, .2, -.13], [.04, .2, -.13]], legH: .2, swing: .6, freq: 13 };
  }
  function sheepParts(goat) {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff', face = goat ? '#ffffff' : '#3a3430', hoof = '#2a2420';
    if (!goat) { sp(B, .3, .27, .45, wh, 0, .58, 0, 10); for (let i = 0; i < 9; i++) sp(B, .14, .12, .14, wh, (i % 3 - 1) * .2, .72 + (i % 2) * .05, -.32 + Math.floor(i / 3) * .32, 6); }
    else { cy(B, .17, .62, wh, 0, .52, 0, Math.PI / 2, 0, 0, 10); sp(B, .18, .18, .2, wh, 0, .53, .28, 8); sp(B, .17, .17, .18, wh, 0, .52, -.3, 8); cy(B, .07, .25, wh, 0, .66, .36, -.6, 0, 0, 8); }
    bx(H, .13, .15, .22, face, 0, .0, .08); bx(H, .1, .09, .1, face, 0, -.04, .2); bx(H, .1, .04, .05, goat ? '#e8c8b0' : '#2a2420', 0, -.08, .25);
    bx(H, .14, .035, .07, face, -.1, .04, .02, 0, 0, .3); bx(H, .14, .035, .07, face, .1, .04, .02, 0, 0, -.3);
    if (goat) { rod(H, .025, '#8a7a5a', [-.05, .07, .02], [-.12, .22, -.12]); rod(H, .025, '#8a7a5a', [.05, .07, .02], [.12, .22, -.12]); bx(H, .04, .12, .04, '#f0e8d8', 0, -.12, .17); }
    cy(T, goat ? .03 : .06, goat ? .12 : .14, wh, 0, -.05, 0, goat ? -.9 : .2, 0, 0, 5);
    cy(L, .035, .42, goat ? wh : face, 0, -.21, 0, 0, 0, 0, 6); bx(L, .07, .05, .08, hoof, 0, -.42, .01);
    return { B, H, T, L, neck: goat ? [0, .78, .45] : [0, .72, .42], tail: goat ? [0, .62, -.42] : [0, .62, -.45], hips: [[-.12, .44, .25], [.12, .44, .25], [-.12, .44, -.27], [.12, .44, -.27]], legH: .44, swing: .4, freq: 7, graze: 1.1 };
  }
  function cowParts() {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff', dark = '#2a2420', patch = '#3a2a22';
    bx(B, .62, .62, 1.5, wh, 0, 1.05, 0); sp(B, .33, .33, .3, wh, 0, 1.05, .7, 8); sp(B, .32, .32, .3, wh, 0, 1.06, -.72, 8);
    [[-.315, 1.12, .2, .5], [.315, .95, -.35, .45], [-.315, .92, -.45, .35], [.315, 1.15, .4, .3], [0, 1.37, -.1, .5]].forEach(([x, y, z, s], i) => bx(B, i === 4 ? .5 : .02, i === 4 ? .02 : s * .8, s, patch, x, y, z));
    sp(B, .16, .1, .2, '#e8a8a0', 0, .72, -.35, 6);
    bx(H, .3, .32, .4, wh, 0, .0, .12); bx(H, .26, .2, .14, '#d8a8a0', 0, -.1, .34); bx(H, .2, .06, .02, dark, 0, -.08, .41);
    rod(H, .03, '#e8e0c8', [-.12, .15, .05], [-.3, .25, .02]); rod(H, .03, '#e8e0c8', [.12, .15, .05], [.3, .25, .02]); bx(H, .14, .06, .1, wh, -.2, .08, .02); bx(H, .14, .06, .1, wh, .2, .08, .02);
    cy(T, .025, .75, wh, 0, -.37, 0, .15, 0, 0, 5); sp(T, .05, .1, .05, dark, 0, -.76, .06, 5);
    cy(L, .07, .78, wh, 0, -.39, 0, 0, 0, 0, 8); bx(L, .14, .08, .15, dark, 0, -.78, .02);
    return { B, H, T, L, neck: [0, 1.25, .82], tail: [0, 1.3, -.88], hips: [[-.2, .78, .55], [.2, .78, .55], [-.2, .78, -.55], [.2, .78, -.55]], legH: .78, swing: .3, freq: 5, graze: 1.0 };
  }
  function donkeyParts() {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff', dark = '#2a2420';
    cy(B, .25, .85, wh, 0, .88, 0, Math.PI / 2, 0, 0, 10); sp(B, .27, .27, .25, wh, 0, .88, .42, 8); sp(B, .26, .26, .25, wh, 0, .9, -.42, 8);
    rod(B, .13, wh, [0, .95, .5], [0, 1.25, .78]); bx(B, .04, .25, .4, dark, 0, 1.25, .62, -.9, 0, 0);
    bx(H, .2, .22, .5, wh, 0, -.05, .18); bx(H, .19, .16, .14, '#d8d0c8', 0, -.1, .42); bx(H, .02, .04, .02, dark, -.06, -.1, .5); bx(H, .02, .04, .02, dark, .06, -.1, .5);
    bx(H, .06, .32, .06, wh, -.08, .22, -.02, 0, 0, -.15); bx(H, .06, .32, .06, wh, .08, .22, -.02, 0, 0, .15);
    cy(T, .02, .5, wh, 0, -.25, 0, .2, 0, 0, 5); sp(T, .045, .08, .045, dark, 0, -.52, .05, 5);
    cy(L, .045, .62, wh, 0, -.31, 0, 0, 0, 0, 7); bx(L, .09, .06, .1, dark, 0, -.62, .01);
    return { B, H, T, L, neck: [0, 1.3, .82], tail: [0, 1.0, -.66], hips: [[-.13, .62, .38], [.13, .62, .38], [-.13, .62, -.38], [.13, .62, -.38]], legH: .62, swing: .35, freq: 6, graze: 1.0 };
  }
  function henParts() {
    const B = P0(), H = P0(), T = P0(), L = P0(), wh = '#ffffff';
    sp(B, .12, .12, .15, wh, 0, .22, 0, 8); bx(B, .12, .14, .08, wh, 0, .3, -.15, -.5, 0, 0);
    sp(H, .055, .06, .055, wh, 0, .03, .02, 6); bx(H, .02, .05, .06, '#d82020', 0, .09, .02); bx(H, .03, .02, .05, '#e8b030', 0, .02, .07); bx(H, .02, .03, .02, '#d82020', 0, -.02, .05);
    bx(T, .01, .01, .01, wh, 0, 0, 0);
    cy(L, .01, .14, '#e8b030', 0, -.07, 0, 0, 0, 0, 4); bx(L, .05, .01, .05, '#e8b030', 0, -.14, .01);
    return { B, H, T, L, neck: [0, .32, .1], tail: [0, .3, -.15], hips: [[-.04, .14, 0], [.04, .14, 0]], legH: .14, swing: .6, freq: 16, graze: 1.2 };
  }
  const SPEC = {};
  function buildSpecies(sp0, parts, max) {
    mats();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mk = (P, n) => { const m = new THREE.InstancedMesh(geoOf(P), mat, n); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    const nl = parts.hips.length;
    SPEC[sp0] = { p: parts, body: mk(parts.B, max), head: mk(parts.H, max), tail: mk(parts.T, max), leg: mk(parts.L, max * nl), nl, max };
    SPEC[sp0].leg.castShadow = false; SPEC[sp0].tail.castShadow = false;
  }
  function buildAnimals(st) {
    const cnt = {}; st.ani.list.forEach(a => { cnt[a.sp] = (cnt[a.sp] || 0) + 1; });
    const has = k => cnt[k] > 0;
    if (has('cane')) buildSpecies('cane', dogParts({}), cnt.cane);
    if (has('cane_base')) buildSpecies('cane_base', dogParts({ prick: true, base: '#ffffff', saddle: '#2a2018' }), cnt.cane_base);
    if (has('gatto')) buildSpecies('gatto', catParts(), cnt.gatto);
    if (has('pecora')) buildSpecies('pecora', sheepParts(false), cnt.pecora);
    if (has('capra')) buildSpecies('capra', sheepParts(true), cnt.capra);
    if (has('mucca')) buildSpecies('mucca', cowParts(), cnt.mucca);
    if (has('asino')) buildSpecies('asino', donkeyParts(), cnt.asino);
    if (has('gallina')) buildSpecies('gallina', henParts(), cnt.gallina);
  }
  const mB = new THREE.Matrix4(), mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mS = new THREE.Matrix4();
  const at = (m, x, y, z) => m.makeTranslation(x, y, z);
  function tickAnimals(st, time, dt, cx, cz) {
    const A = st.ani; if (!A) return;
    for (const k in SPEC) { SPEC[k].n = 0; }
    for (const a of A.list) {
      const S = SPEC[a.sp]; if (!S || a.hidden) continue;
      if (Math.abs(a.x - cx) > 75 || Math.abs(a.y - cz) > 75) continue;
      const i = S.n++, p = S.p, sz = a.size * (a.sp === 'cane_base' ? 1.15 : 1);
      // il passo
      a.gph = (a.gph || 0) + (a.v || 0) * dt * p.freq / Math.max(.3, sz);
      const walk = Math.min(1, (a.v || 0) / .4), lying = a.lying || a.dead;
      const bob = Math.abs(Math.sin(a.gph)) * .03 * walk * sz;
      const ry = Math.PI / 2 - a.face;
      mB.makeRotationY(ry); mB.setPosition(a.x, groundH(a.x, a.y) + bob, a.y); mS.makeScale(sz, sz, sz); mB.multiply(mS);
      if (a.dead) { mR.makeRotationZ(Math.PI / 2); at(mT, p.legH * .2, -p.legH * .55, 0); mB.multiply(mT).multiply(mR); }
      else if (lying) { at(mT, 0, -p.legH * .78, 0); mB.multiply(mT); }
      S.body.setMatrixAt(i, mB); S.body.setColorAt(i, _c.set(SPEC_COL(a)));
      // la testa: giù a pascolare o annusare, su ad abbaiare
      let pitch = 0, yaw = 0;
      if (a.mode === 'pascola' || (a.mode === 'fermo' && p.graze)) pitch = (p.graze || .8) * (.75 + Math.sin(time * 1.3 + a.ph) * .25);
      else if (a.mode === 'annusa') pitch = .7 + Math.sin(time * 7 + a.ph) * .1;
      else if (a.sp === 'gallina' && a.mode === 'fermo') pitch = Math.max(0, Math.sin(time * 6 + a.ph)) * 1.1;
      if (a.bark > 0) pitch = -.25 + Math.sin(time * 22) * .15;
      if (lying && !a.dead) pitch = .25;
      if (!walk && !lying && a.mode !== 'pascola') yaw = Math.sin(time * .7 + a.ph) * .5;
      _e.set(pitch, yaw, 0, 'YXZ'); mR.makeRotationFromEuler(_e); at(mT, p.neck[0], p.neck[1], p.neck[2]); mS.copy(mB).multiply(mT).multiply(mR);
      S.head.setMatrixAt(i, mS); S.head.setColorAt(i, _c);
      // la coda
      const happy = a.friend || a.sp === 'cane' && a.act > 0;
      const wag = (a.sp === 'cane' || a.sp === 'cane_base') ? Math.sin(time * (happy ? 18 : 5) + a.ph) * (happy ? .7 : .25) : a.sp === 'gatto' ? Math.sin(time * 1.5 + a.ph) * .4 : Math.sin(time * 3 + a.ph) * .15;
      const tp = a.sp === 'gatto' ? (walk ? -.2 : .5) : a.mode === 'fugge' && a.sp === 'cane' ? 1.2 : 0;
      _e.set(tp, wag, 0, 'YXZ'); mR.makeRotationFromEuler(_e); at(mT, p.tail[0], p.tail[1], p.tail[2]); mS.copy(mB).multiply(mT).multiply(mR);
      S.tail.setMatrixAt(i, mS); S.tail.setColorAt(i, _c);
      // le zampe: passo diagonale (anteriore sinistra con posteriore destra)
      for (let l = 0; l < S.nl; l++) {
        const h = p.hips[l], diag = S.nl === 2 ? (l ? Math.PI : 0) : ((l === 0 || l === 3) ? 0 : Math.PI);
        let sw = Math.sin(a.gph + diag) * p.swing * walk;
        if (lying && !a.dead) sw = (l < 2 ? -1.35 : 1.35);
        mR.makeRotationX(sw); at(mT, h[0], h[1], h[2]); mS.copy(mB).multiply(mT).multiply(mR);
        S.leg.setMatrixAt(i * S.nl + l, mS); S.leg.setColorAt(i * S.nl + l, _c);
      }
    }
    for (const k in SPEC) {
      const S = SPEC[k], n = S.n;
      S.body.count = S.head.count = S.tail.count = n; S.leg.count = n * S.nl;
      for (const m of [S.body, S.head, S.tail, S.leg]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.visible = n > 0; }
    }
  }
  const SPEC_COL = a => { const S = typeof Animali !== 'undefined' ? Animali.SP[a.sp] : null; return S ? S.cols[a.col % S.cols.length] : '#888888'; };

  // ================= ATTACCO E FOTOGRAMMA =================
  function attach(api) {
    scene = api.scene; G = api.G; groundH = api.groundH; ready = !!(scene && G && groundH);
  }
  function buildAll(st) {
    built = true;
    try { buildQuestura(); } catch (e) { console.warn('[ordine_arte] questura', e); }
    try { buildSuper(); } catch (e) { console.warn('[ordine_arte] supermercato', e); }
    try { buildPort(); } catch (e) { console.warn('[ordine_arte] porto', e); }
    try { if (st.ord) buildBase(st); } catch (e) { console.warn('[ordine_arte] base', e); }
    try { SHIP.impero = shipModel('impero'); SHIP.militare = shipModel('militare'); } catch (e) { console.warn('[ordine_arte] nave', e); }
    try { BLOCCO = bloccoModel(); } catch (e) { console.warn('[ordine_arte] blocco', e); }
    try { for (let i = 0; i < 2; i++) BANNERS.push(bannerMesh()); } catch (e) { console.warn('[ordine_arte] striscioni', e); }
    try { if (st.ani) buildAnimals(st); } catch (e) { console.warn('[ordine_arte] animali', e); }
  }
  let lastSt = null;
  function tick(st, time, night, dt, camPos) {
    if (!ready) return;
    if (!built || lastSt !== st) { if (built && lastSt !== st) { /* nuova partita: gli animali si rifanno */ for (const k in SPEC) { const S = SPEC[k]; [S.body, S.head, S.tail, S.leg].forEach(m => scene.remove(m)); delete SPEC[k]; } if (st.ani) buildAnimals(st); } if (!built) buildAll(st); lastSt = st; }
    const cx = camPos ? camPos.x : st.player.x, cz = camPos ? camPos.y : st.player.y;
    dt = Math.min(.1, dt || .016);
    // le bandiere al vento
    for (const F of FLAGS) { const a = F.m.geometry.attributes.position, b = F.base; for (let i = 0; i < a.count; i++) { const x = b[i * 3]; a.array[i * 3 + 2] = b[i * 3 + 2] + Math.sin(time * 3.2 + x * 2.6 + F.ph) * .12 * x; } a.needsUpdate = true; }
    LAMPS.forEach(L => L.m.color.set(night > .3 ? L.on : L.off));
    const O = st.ord;
    // la nave
    if (O && O.nave) {
      const N = O.nave, on = N.phase !== 'lontana';
      for (const k in SHIP) { const S = SHIP[k]; const vis = on && k === N.kind; S.g.visible = vis; if (!vis) continue;
        S.g.position.set(N.x, -.25 + Math.sin(time * .9) * .12, N.y); S.g.rotation.set(Math.sin(time * .7) * .015, Math.PI / 2 - N.ang, Math.sin(time * .55) * .02);
        const gone = Math.min(6, Math.floor((N.crates || 0) / 4)), order = [4, 5, 0, 1, 2, 3]; S.conts.forEach((c, i) => { c.visible = order.indexOf(i) >= gone; });
        S.win.visible = night > .25; S.lights.visible = night > .2 || N.phase !== 'ormeggiata'; }
      if (CRATES) { const n = N.phase === 'ormeggiata' || N.phase === 'partenza' ? Math.min(24, N.crates || 0) : 0; CRATES.count = n; CRATES.visible = n > 0; }
    }
    // il posto di blocco
    if (BLOCCO) { const B = O && O.blocco; BLOCCO.g.visible = !!B; if (B) { BLOCCO.g.position.set(B.x, groundH(B.x, B.y), B.y); BLOCCO.g.rotation.y = Math.PI / 2 - B.ang; BLOCCO.lamps.visible = Math.sin(time * 6) > 0; } }
    // gli striscioni: tenuti dai due manifestanti dopo il capo
    BANNERS.forEach(b => { b.g.visible = false; });
    if (O && O.proteste) O.proteste.forEach((Pr, k) => {
      const B = BANNERS[k]; if (!B || Pr.phase === 'carica' || Pr.people.length < 3) return;
      const a = G.byId(st, Pr.people[1]), c = G.byId(st, Pr.people[2]); if (!a || !c || a.inside || c.inside) return;
      const d = Math.hypot(c.x - a.x, c.y - a.y); if (d > 6 || d < .5) return;
      const mx = (a.x + c.x) / 2, mz = (a.y + c.y) / 2; B.g.visible = true; B.g.position.set(mx, groundH(mx, mz), mz); B.g.rotation.y = -Math.atan2(c.y - a.y, c.x - a.x); B.g.scale.x = Math.max(.6, d / 4);
      bannerText(B, (BTXT[Pr.motivo] || BTXT.rabbia)[Pr.id % 2]);
      B.cloth.rotation.x = Math.sin(time * 2.2) * .08;
    });
    // gli animali
    tickAnimals(st, time, dt, cx, cz);
  }
  return { attach, tick, SPEC, SHIP };
})();
