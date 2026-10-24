// Il kit del plastico: terreno da una riva disegnata, mare con le fasce, e i pezzi della costa (solo per la tavola, non per il gioco)
const K = {};
(function () {
  const T = THREE; T.ColorManagement.legacyMode = false;
  K.scene = new T.Scene();
  const S = K.scene;
  K.rnd = (() => { let s = 12345; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  const R = K.rnd;
  const matC = {};
  K.mat = (hex, o) => { const k = hex + JSON.stringify(o || {}); if (!matC[k]) matC[k] = new T.MeshStandardMaterial(Object.assign({ color: hex, roughness: .92, metalness: 0, flatShading: true }, o || {})); return matC[k]; };
  K.add = (g, m, x, y, z, ry, sx, sy, sz) => { const me = new T.Mesh(g, typeof m === 'string' || typeof m === 'number' ? K.mat(m) : m); me.position.set(x || 0, y || 0, z || 0); if (ry) me.rotation.y = ry; if (sx) me.scale.set(sx, sy || sx, sz || sx); me.castShadow = true; me.receiveShadow = true; S.add(me); return me; };
  K.box = (w, h, d, c, x, y, z, ry) => K.add(new T.BoxGeometry(w, h, d), c, x, y + h / 2, z, ry);
  K.cyl = (r0, r1, h, c, x, y, z, seg) => K.add(new T.CylinderGeometry(r0, r1, h, seg || 10), c, x, y + h / 2, z);
  K.sph = (r, c, x, y, z, sx, sy, sz, det) => { const m = K.add(new T.IcosahedronGeometry(r, det === undefined ? 1 : det), c, x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  // ---- le linee: punti campionati da una spline ----
  K.spline = (P, step) => { const c = new T.CatmullRomCurve3(P.map(([x, z]) => new T.Vector3(x, 0, z)), false, 'centripetal'); const L = c.getLength(), n = Math.max(2, Math.ceil(L / (step || .5))); const out = []; for (let i = 0; i <= n; i++) { const p = c.getPointAt(i / n), t = c.getTangentAt(i / n); out.push({ x: p.x, z: p.z, tx: t.x, tz: t.z, s: L * i / n }); } out.L = L; return out; };
  K.at = (Ln, s) => { if (s <= 0) return Ln[0]; for (let i = 1; i < Ln.length; i++) if (Ln[i].s >= s) { const a = Ln[i - 1], b = Ln[i], t = (s - a.s) / (b.s - a.s || 1); return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, tx: a.tx, tz: a.tz, s }; } return Ln[Ln.length - 1]; };
  // distanza con segno da una linea (positiva a sinistra della direzione, cioè verso terra se la riva va con la terra a sinistra)
  K.sdist = (Ln, x, z) => { let best = 1e9, sg = 1; for (let i = 0; i < Ln.length - 1; i++) { const a = Ln[i], b = Ln[i + 1], ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / L2)), qx = a.x + ex * t, qz = a.z + ez * t, d = Math.hypot(x - qx, z - qz); if (d < best) { best = d; sg = (ex * (z - a.z) - ez * (x - a.x)) < 0 ? 1 : -1; } } return best * sg; };
  K.near = (Ln, x, z) => { let best = 1e9, bs = 0; for (let i = 0; i < Ln.length - 1; i++) { const a = Ln[i], b = Ln[i + 1], ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1, t = Math.max(0, Math.min(1, ((x - a.x) * ex + (z - a.z) * ez) / L2)), d = Math.hypot(x - a.x - ex * t, z - a.z - ez * t); if (d < best) { best = d; bs = a.s + (b.s - a.s) * t; } } return { d: best, s: bs }; };
  // la strada: asfalto, la mezzeria, le linee di margine; quota dal profilo hs(s)
  K.strada = (Ln, w, hs) => { const hfun = null; const g = new THREE.BufferGeometry(), pos = [], idx = []; Ln.forEach((p, i) => { for (const sd of [-1, 1]) pos.push(p.x - p.tz * sd * w / 2, hs(p.s) + .06, p.z + p.tx * sd * w / 2); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, K.mat('#4a4c52', { side: THREE.DoubleSide })); m.receiveShadow = true; K.scene.add(m);
    const L = []; for (let s = 0; s < Ln.L; s += 6) { const p = K.at(Ln, s); L.push([p.x + p.tx * 1.5, hs(s) + .08, p.z + p.tz * 1.5, Math.atan2(p.tx, p.tz), 0, 0, 1, .12, .02, 3]); } K.inst(new THREE.BoxGeometry(1, 1, 1), '#f2efe6', L);
    for (const sd of [-1, 1]) { const M = []; for (let s = 0; s < Ln.L; s += .8) { const p = K.at(Ln, s); M.push([p.x - p.tz * sd * (w / 2 - .25), hs(s) + .08, p.z + p.tx * sd * (w / 2 - .25), Math.atan2(p.tx, p.tz), 0, 0, 1, .12, .02, .82]); } K.inst(new THREE.BoxGeometry(1, 1, 1), '#e8e4da', M); } };
  K.dist = (Ln, x, z) => Math.abs(K.sdist(Ln, x, z));
  // ---- il rumore ----
  const hs = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  K.noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = hs(xi, yi), b = hs(xi + 1, yi), c = hs(xi, yi + 1), d = hs(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  K.fbm = (x, y) => (K.noise(x, y) * .5 + K.noise(x * 2.1, y * 2.1) * .3 + K.noise(x * 4.3, y * 4.3) * .2);
  // ---- terreno: h(x,z) e colore(x,z,h) dati dalla scena ----
  K.terrain = (x0, x1, z0, z1, st, hf, cf) => {
    const nx = Math.ceil((x1 - x0) / st), nz = Math.ceil((z1 - z0) / st), g = new T.BufferGeometry(), pos = [], col = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * st, z = z0 + j * st, h = hf(x, z); pos.push(x, h, z); const c = new T.Color(cf(x, z, h)); col.push(c.r, c.g, c.b); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.receiveShadow = true; m.castShadow = true; S.add(m); K.hf = hf; return m;
  };
  // il mare: piano a -0,45 con le fasce di colore dalla profondità (sotto c'è il terreno; l'acqua è trasparente dove è bassa)
  K.sea = (x0, x1, z0, z1, depth) => {
    const st = .7, nx = Math.ceil((x1 - x0) / st), nz = Math.ceil((z1 - z0) / st), g = new T.BufferGeometry(), pos = [], col = [], idx = [];
    const deep = new T.Color('#1f3e50'), mid = new T.Color('#33606e'), shal = new T.Color('#6f9a98'), foam = new T.Color('#e4ece8');
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = x0 + i * st, z = z0 + j * st, d = depth(x, z); pos.push(x, -.45, z);
      let c; if (d < .12) c = foam.clone(); else if (d < 1.2) c = shal.clone().lerp(mid, (d - .12) / 1.1); else c = mid.clone().lerp(deep, Math.min(1, (d - 1.2) / 5));
      if (d > .12 && d < .45 && K.noise(x * .8, z * .8) > .45) c.lerp(foam, .55);
      col.push(c.r, c.g, c.b); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .35, metalness: .05, transparent: true, opacity: .93 })); m.receiveShadow = true; S.add(m);
  };
  // ---- un nastro lungo una linea (strada, passeggiata, muro) ----
  K.ribbon = (Ln, w, y, c, off, hfun) => {
    const g = new T.BufferGeometry(), pos = [], idx = [];
    Ln.forEach((p, i) => { const nx = -p.tz, nz = p.tx, o = off || 0; for (const s of [-1, 1]) { const x = p.x + nx * (o + s * w / 2), z = p.z + nz * (o + s * w / 2); pos.push(x, (hfun ? hfun(x, z) : 0) + y, z); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, K.mat(c, { side: T.DoubleSide })); m.receiveShadow = true; S.add(m); return m;
  };
  // un muro lungo una linea (da y0 a y1), spessore t
  K.wall = (Ln, off, t, y0, y1, c, s0, s1) => {
    const g = new T.BufferGeometry(), pos = [], idx = []; const P = Ln.filter(p => p.s >= (s0 || 0) && p.s <= (s1 === undefined ? 1e9 : s1));
    P.forEach((p, i) => { const nx = -p.tz, nz = p.tx; for (const [s, y] of [[-1, y0], [-1, y1], [1, y1], [1, y0]]) { const o = off + s * t / 2; pos.push(p.x + nx * o, typeof y === 'function' ? y(p) : y, p.z + nz * o); }
      if (i) { const a = (i - 1) * 4, b = i * 4; for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1); } });
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, K.mat(c, { side: T.DoubleSide })); m.castShadow = m.receiveShadow = true; S.add(m); return m;
  };
  // ---- le istanze ----
  K.inst = (geo, c, list) => { const m = new T.InstancedMesh(geo, typeof c === 'string' ? K.mat(c) : c, list.length), o = new T.Object3D();
    list.forEach((q, i) => { o.position.set(q[0], q[1], q[2]); o.rotation.set(q[4] || 0, q[3] || 0, q[5] || 0); const s = q[6] || 1; o.scale.set(s * (q[7] || 1), s * (q[8] || 1), s * (q[9] || 1)); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = m.receiveShadow = true; S.add(m); return m; };
  const H = (x, z) => K.hf ? K.hf(x, z) : 0; K.H = H;
  // ---- I PEZZI ----
  // balaustra: colonnine a vaso e corrimano lungo una linea
  K.balaustra = (Ln, off, y, s0, s1, c) => { const b = [], cop = Ln.filter(p => p.s >= s0 && p.s <= s1); for (let s = s0; s <= s1; s += .32) { const p = K.at(Ln, s); b.push([p.x - p.tz * off, y, p.z + p.tx * off]); }
    K.inst(new T.CylinderGeometry(.07, .05, .7, 6), c || '#efe6d4', b.map(q => [q[0], q[1] + .35, q[2]]));
    K.wall(cop.length ? cop : Ln, off, .26, y + .7, y + .84, c || '#efe6d4'); K.wall(cop.length ? cop : Ln, off, .3, y - .02, y + .1, c || '#efe6d4');
    for (let s = s0; s <= s1; s += 4.2) { const p = K.at(Ln, s); K.box(.34, .9, .34, c || '#efe6d4', p.x - p.tz * off, y, p.z + p.tx * off); } };
  K.panchina = (x, y, z, ry) => { const g = new T.Group(); const leg = K.mat('#3a3a38'), wood = K.mat('#9a5a34');
    const add = (geo, m, px, py, pz, rx) => { const me = new T.Mesh(geo, m); me.position.set(px, py, pz); if (rx) me.rotation.x = rx; me.castShadow = true; g.add(me); };
    add(new T.BoxGeometry(1.7, .06, .42), wood, 0, .45, 0); add(new T.BoxGeometry(1.7, .36, .05), wood, 0, .72, .2, -.15); for (const sx of [-.75, .75]) add(new T.BoxGeometry(.06, .45, .45), leg, sx, .22, 0);
    g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); return g; };
  K.lampione = (x, y, z, h) => { h = h || 3.8; K.cyl(.12, .16, .5, '#2d3a36', x, y, z, 8); K.cyl(.045, .07, h, '#2d3a36', x, y, z, 6); K.sph(.22, K.mat('#fff4d6', { emissive: '#ffdc9a', emissiveIntensity: .35 }), x, y + h + .18, z, 1, 1.15, 1); K.cyl(.12, .2, .12, '#2d3a36', x, y + h + .38, z, 8); };
  K.lampione2 = (x, y, z, ry) => { // a pastorale con due bracci
    K.cyl(.13, .17, .5, '#2d3a36', x, y, z, 8); K.cyl(.05, .07, 4.2, '#2d3a36', x, y, z, 6); for (const s of [-1, 1]) { const dx = Math.cos(ry || 0) * .55 * s, dz = -Math.sin(ry || 0) * .55 * s; K.box(.05, .05, 1.1, '#2d3a36', x, y + 4.1, z, (ry || 0) + Math.PI / 2); K.sph(.2, K.mat('#fff4d6', { emissive: '#ffdc9a', emissiveIntensity: .35 }), x + dx, y + 3.95, z + dz, 1, 1.2, 1); } };
  // palma: tronco curvo a segmenti, ciuffo di foglie a nastro
  K.palma = (x, y, z, h, lean) => { h = h || 7; const n = 7, dir = R() * 6.28, L = lean === undefined ? .6 + R() * .8 : lean; let px = x, pz = z, py = y; const tr = K.mat('#8a7254');
    for (let i = 0; i < n; i++) { const t = (i + 1) / n, nx = x + Math.cos(dir) * L * t * t, nz = z + Math.sin(dir) * L * t * t, ny = y + h * t; const m = new T.Mesh(new T.CylinderGeometry(.2 - .05 * t, .26 - .05 * t, Math.hypot(nx - px, ny - py, nz - pz) + .05, 7), tr); m.position.set((px + nx) / 2, (py + ny) / 2, (pz + nz) / 2); m.lookAt(nx, ny, nz); m.rotateX(Math.PI / 2); m.castShadow = true; S.add(m); px = nx; py = ny; pz = nz; }
    const lf = K.mat('#4f7a34', { side: T.DoubleSide }), lf2 = K.mat('#6a8c3a', { side: T.DoubleSide });
    for (let k = 0; k < 11; k++) { const a = k / 11 * 6.28 + R() * .3, g = new T.PlaneGeometry(.55, 3.4, 1, 4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = p.getY(i) + 1.7, w = 1 - v / 3.4; p.setX(i, p.getX(i) * (.3 + w * .9)); p.setZ(i, -v * v * .11); } g.computeVertexNormals();
      const m = new T.Mesh(g, k % 3 ? lf : lf2); m.position.set(px, py, pz); m.rotation.order = 'YXZ'; m.rotation.y = a; m.rotation.x = -1.05 - R() * .3; m.translateY(1.6); m.castShadow = true; S.add(m); }
    K.sph(.35, '#6a5a3a', px, py - .1, pz); };
  // pino marittimo (domestico): tronco alto inclinato, chioma a ombrello
  K.pino = (x, y, z, h, lean) => { h = h || 9; const dir = R() * 6.28, L = lean === undefined ? 1 + R() * 1.6 : lean, tx = x + Math.cos(dir) * L, tz = z + Math.sin(dir) * L; const tr = K.mat('#6e5440');
    const m = new T.Mesh(new T.CylinderGeometry(.18, .32, Math.hypot(L, h), 7), tr); m.position.set((x + tx) / 2, y + h / 2, (z + tz) / 2); m.lookAt(tx, y + h, tz); m.rotateX(Math.PI / 2); m.castShadow = true; S.add(m);
    const cc = ['#3d5e33', '#4a6b37', '#36552e']; for (let k = 0; k < 6; k++) { const a = R() * 6.28, r = R() * 2.2; K.sph(1.9 + R() * .8, cc[k % 3], tx + Math.cos(a) * r, y + h + .2 + R() * .5, tz + Math.sin(a) * r, 1.25, .42, 1.25); } K.sph(2.6, '#40623a', tx, y + h + .6, tz, 1.3, .38, 1.3); };
  K.cespuglio = (x, y, z, r, c) => K.sph(r || .8, c || '#557a3c', x, y + (r || .8) * .45, z, 1, .7, 1);
  K.oleandro = (x, y, z, r) => { r = r || 1.1; K.sph(r, '#4f7440', x, y + r * .6, z, 1, .9, 1); for (let k = 0; k < 14; k++) { const a = R() * 6.28, b = R() * 1.4; K.sph(.13, k % 3 ? '#e87aa0' : '#f6f0f2', x + Math.cos(a) * Math.cos(b) * r * .95, y + r * .6 + Math.sin(b) * r * .85, z + Math.sin(a) * Math.cos(b) * r * .95, 1, 1, 1, 0); } };
  K.aiuola = (x, y, z, rx, rz, ry) => { const m = K.add(new T.CylinderGeometry(1, 1, .3, 18), '#d8cdb6', x, y + .15, z); m.scale.set(rx + .15, 1, rz + .15); const e = K.add(new T.CylinderGeometry(1, 1, .34, 18), '#6a6a44', x, y + .17, z); e.scale.set(rx, 1, rz); const fc = ['#8a6a4a', '#a89060', '#6a7a48', '#c8a060']; for (let k = 0; k < rx * rz * 3; k++) { const a = R() * 6.28, r = Math.sqrt(R()) * .85; K.sph(.12, fc[k % 4], x + Math.cos(a) * r * rx, y + .38, z + Math.sin(a) * r * rz, 1, .6, 1, 0); } };
  K.ficodindia = (x, y, z, s) => { s = s || 1; const c = ['#6f8f45', '#7d9c4c', '#5f7f3c']; const pads = [[0, .45, 0, 0]]; for (let k = 0; k < 9; k++) { const b = pads[Math.floor(R() * pads.length)]; const a = R() * 6.28; pads.push([b[0] + Math.cos(a) * .3, b[1] + .4 + R() * .15, b[2] + Math.sin(a) * .3, a]); }
    pads.forEach((p, i) => { const m = K.sph(.32 * s, c[i % 3], x + p[0] * s, y + p[1] * s, z + p[2] * s, 1, 1.25, .28); m.rotation.y = p[3]; if (i % 3 === 0) K.sph(.05 * s, '#e8a03a', x + p[0] * s, y + (p[1] + .38) * s, z + p[2] * s, 1, 1, 1, 0); }); };
  K.agave = (x, y, z, s, fiore) => { s = s || 1; const g = new T.ConeGeometry(.12 * s, 1.2 * s, 4); for (let k = 0; k < 13; k++) { const a = k / 13 * 6.28, t = .5 + (k % 3) * .35; const m = new T.Mesh(g, K.mat(k % 2 ? '#8ea69a' : '#7d978b')); m.position.set(x + Math.cos(a) * .25 * s, y + .45 * s, z + Math.sin(a) * .25 * s); m.rotation.set(Math.sin(a) * t, 0, -Math.cos(a) * t); m.castShadow = true; S.add(m); }
    if (fiore) { K.cyl(.04, .07, 4.5 * s, '#8a7a50', x, y, z, 5); for (let k = 0; k < 5; k++) K.sph(.25 * s, '#c8a84a', x + (k % 2 ? .3 : -.3) * s, y + (2.8 + k * .35) * s, z, 1, .5, 1, 0); } };
  const ty0 = (x, z) => H(x, z);
  K.canne = (x, y, z, r, n) => { const g = new T.CylinderGeometry(.03, .05, 1, 3), L = [], P = []; for (let k = 0; k < (n || 30); k++) { const a = R() * 6.28, d = Math.sqrt(R()) * r, h = 2.2 + R() * 1.4, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, ty = H(px, pz); L.push([px, ty + h / 2, pz, 0, (R() - .5) * .25, (R() - .5) * .25, 1, 1, h, 1]); P.push([px, ty + h, pz, R() * 6, 0, 0, 1, .3, 1, .08]); } K.inst(g, '#a8a860', L); K.inst(new T.ConeGeometry(.2, .9, 4), '#d4c48a', P); K.sph(r * .7, '#7a9048', x, ty0(x, z) + .5, z, 1, .45, 1); };
  K.sparto = (x, z, n, r) => { const L = []; for (let k = 0; k < n; k++) { const a = R() * 6.28, d = Math.sqrt(R()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; L.push([px, H(px, pz) + .2, pz, R() * 6, 0, 0, .5 + R() * .5, 1, 1, 1]); } K.inst(new T.ConeGeometry(.28, .55, 5), '#a8a060', L); };
  K.roccia = (x, y, z, r, c) => { const m = K.add(new T.DodecahedronGeometry(r, 0), c || '#a69c8e', x, y, z); m.rotation.set(R() * 3, R() * 3, R() * 3); m.scale.set(1, .6 + R() * .4, 1 + R() * .4); return m; };
  K.cabina = (x, y, z, ry, c) => { const g = new T.Group(); const add = (geo, col, px, py, pz) => { const m = new T.Mesh(geo, K.mat(col)); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); };
    for (let k = 0; k < 6; k++) add(new T.BoxGeometry(.25, 2.1, 1.5), k % 2 ? '#f6f0e4' : c, -.625 + k * .25, 1.05, 0); add(new T.BoxGeometry(1.7, .1, 1.7), '#f6f0e4', 0, 2.15, 0); add(new T.ConeGeometry(1.15, .5, 4), c, 0, 2.45, 0); add(new T.BoxGeometry(.6, 1.6, .05), '#f6f0e4', 0, .95, .77);
    g.children[g.children.length - 2].rotation.y = Math.PI / 4; g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); };
  K.ombrellone = (x, y, z, c) => { K.cyl(.03, .03, 2.3, '#e8e0d0', x, y, z, 5); const m = K.add(new T.ConeGeometry(1.25, .5, 8), c, x, y + 2.3, z); const m2 = K.add(new T.ConeGeometry(1.26, .5, 8, 1, true, 0, Math.PI / 4), '#f6f2ea', x, y + 2.31, z); for (let k = 1; k < 4; k++) { const m3 = K.add(new T.ConeGeometry(1.26, .5, 8, 1, true, k * Math.PI / 2, Math.PI / 4), '#f6f2ea', x, y + 2.31, z); } };
  K.sdraio = (x, y, z, ry, c) => { const g = new T.Group(); const a = new T.Mesh(new T.BoxGeometry(.6, .05, 1.1), K.mat(c)); a.position.set(0, .3, 0); a.rotation.x = .2; const b = new T.Mesh(new T.BoxGeometry(.6, .05, .7), K.mat(c)); b.position.set(0, .55, -.65); b.rotation.x = -.9; g.add(a); g.add(b); g.position.set(x, y, z); g.rotation.y = ry || 0; a.castShadow = b.castShadow = true; S.add(g); };
  // barca: scafo a sezioni che si stringono (gozzo), colori
  K.barca = (x, y, z, ry, L, c, fascia, tilt) => { L = L || 5; const g = new T.Group(); const shape = []; const n = 10; const sec = i => { const t = i / n, w = Math.sin(Math.PI * Math.min(1, t * 1.1 + .05)) * .85 + .05; return w; };
    const geo = new T.BufferGeometry(), pos = [], idx = []; for (let i = 0; i <= n; i++) { const t = i / n, zz = (t - .5) * L, w = sec(i) * L * .17, up = Math.pow(Math.abs(t - .5) * 2, 3) * .35; pos.push(-w, .7 + up, zz, -w * .55, .05, zz, w * .55, .05, zz, w, .7 + up, zz); if (i) { const a = (i - 1) * 4, b = i * 4; for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1); } }
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); const hull = new T.Mesh(geo, K.mat(c, { side: T.DoubleSide })); hull.castShadow = true; g.add(hull);
    const inner = new T.Mesh(new T.BoxGeometry(L * .2, .05, L * .62), K.mat('#c9a878')); inner.position.y = .4; g.add(inner); for (const zz of [-.18, 0, .18]) { const b = new T.Mesh(new T.BoxGeometry(L * .26, .06, .18), K.mat('#a88a60')); b.position.set(0, .55, zz * L); g.add(b); }
    const fg = new T.BufferGeometry(), fp = []; for (let i = 0; i <= n; i++) { const t = i / n, zz = (t - .5) * L, w = sec(i) * L * .17 + .01, up = Math.pow(Math.abs(t - .5) * 2, 3) * .35; fp.push(-w, .58 + up, zz, -w, .72 + up, zz, w, .58 + up, zz, w, .72 + up, zz); } const fi = []; for (let i = 1; i <= n; i++) { const a = (i - 1) * 4, b = i * 4; fi.push(a, b, a + 1, a + 1, b, b + 1, a + 2, b + 2, a + 3, a + 3, b + 2, b + 3); } fg.setAttribute('position', new T.Float32BufferAttribute(fp, 3)); fg.setIndex(fi); fg.computeVertexNormals(); g.add(new T.Mesh(fg, K.mat(fascia || '#2b5a8a', { side: T.DoubleSide })));
    g.position.set(x, y, z); g.rotation.y = ry || 0; g.rotation.z = tilt || 0; S.add(g); return g; };
  K.pedalo = (x, y, z, ry, c) => { const g = new T.Group(); for (const s of [-.6, .6]) { const m = new T.Mesh(new T.CapsuleGeometry(.28, 2.2, 3, 8), K.mat('#f4f2ec')); m.rotation.x = Math.PI / 2; m.position.set(s, .25, 0); m.castShadow = true; g.add(m); }
    const seat = new T.Mesh(new T.BoxGeometry(1.4, .12, 1.2), K.mat(c)); seat.position.set(0, .55, .1); g.add(seat); const back = new T.Mesh(new T.BoxGeometry(1.4, .5, .1), K.mat(c)); back.position.set(0, .8, .65); g.add(back); const sl = new T.Mesh(new T.CylinderGeometry(.35, .35, .1, 10), K.mat(c)); sl.rotation.z = Math.PI / 2; sl.position.set(0, .5, -.6); g.add(sl);
    g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); };
  K.pontile = (x, z, ry, L, w) => { const g = new T.Group(); const wood = K.mat('#9a7a58'), pal = K.mat('#5a4636'); for (let s = 0; s < L; s += .32) { const m = new T.Mesh(new T.BoxGeometry(w, .08, .28), wood); m.position.set(0, .45, -s); m.castShadow = m.receiveShadow = true; g.add(m); }
    for (let s = 0; s <= L; s += 2.5) for (const sx of [-w / 2 + .1, w / 2 - .1]) { const m = new T.Mesh(new T.CylinderGeometry(.12, .12, 3), pal); m.position.set(sx, -1, -s); g.add(m); }
    for (let s = 0; s <= L; s += 2.5) for (const sx of [-w / 2 + .05, w / 2 - .05]) { const m = new T.Mesh(new T.BoxGeometry(.08, .9, .08), K.mat('#eeeae0')); m.position.set(sx, .95, -s); g.add(m); }
    for (const sx of [-w / 2 + .05, w / 2 - .05]) { const m = new T.Mesh(new T.BoxGeometry(.06, .06, L), K.mat('#eeeae0')); m.position.set(sx, 1.38, -L / 2); g.add(m); }
    g.position.set(x, 0, z); g.rotation.y = ry || 0; S.add(g); return g; };
  // il testo su una tela (cartelli, scritte sui muri)
  K.testo = (txt, w, h, fg, bg, font) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * h / w); const c = cv.getContext('2d'); if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); } c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    const L = txt.split('\n'); const fs = Math.min(cv.height / L.length * .72, cv.width / Math.max(...L.map(s => s.length)) * 1.55); c.font = (font || 'bold ') + fs + 'px "DejaVu Sans Condensed", "DejaVu Sans", sans-serif'; L.forEach((s, i) => c.fillText(s, cv.width / 2, cv.height * (i + .5) / L.length));
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return new T.MeshStandardMaterial({ map: t, transparent: !bg, roughness: .9 }); };
  K.scritta = (txt, w, h, fg, bg, x, y, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), K.testo(txt, w, h, fg, bg)); m.position.set(x, y, z); m.rotation.y = ry || 0; S.add(m); return m; };
  // la casa: scatola con tetto a padiglione o a falde, finestre, persiane
  K.casa = (x, y, z, w, d, h, c, ry, o) => { o = o || {}; const g = new T.Group(); const add = (geo, col, px, py, pz, rx, rz) => { const m = new T.Mesh(geo, typeof col === 'string' ? K.mat(col) : col); m.position.set(px, py, pz); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    add(new T.BoxGeometry(w, h, d), c, 0, h / 2, 0); if (o.zoccolo) add(new T.BoxGeometry(w + .06, .9, d + .06), o.zoccolo, 0, .45, 0);
    if (o.fascia) { add(new T.BoxGeometry(w + .08, .22, d + .08), o.fascia, 0, h - .1, 0); if (o.piani > 1) add(new T.BoxGeometry(w + .06, .16, d + .06), o.fascia, 0, h / o.piani, 0); }
    const tet = o.tetto || '#b8583a'; if (o.piatto) { add(new T.BoxGeometry(w + .1, .35, d + .1), o.fascia || '#efe6d4', 0, h + .17, 0); }
    else { const r = add(new T.ConeGeometry(Math.hypot(w, d) / 2 * 1.08, o.alto || 1.6, 4, 1), tet, 0, h + (o.alto || 1.6) / 2, 0); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414); }
    const fin = o.finestre || []; const pers = o.persiane || '#3f6e4a';
    const piani = o.piani || 1, ph = h / piani; for (let p = 0; p < piani; p++) { const yy = ph * p + ph * .55; for (const [side, len] of [[0, w], [1, d], [2, w], [3, d]]) { const nf = Math.max(1, Math.floor(len / 2.6)); for (let k = 0; k < nf; k++) { const u = (k + .5) / nf * len - len / 2; let px, pz, ry2 = 0; if (side === 0) { px = u; pz = d / 2 + .02; } else if (side === 2) { px = u; pz = -d / 2 - .02; ry2 = Math.PI; } else if (side === 1) { px = w / 2 + .02; pz = u; ry2 = Math.PI / 2; } else { px = -w / 2 - .02; pz = u; ry2 = -Math.PI / 2; }
      if (p === 0 && o.porta === side && k === Math.floor(nf / 2)) { const m = add(new T.PlaneGeometry(1.1, 2.2), '#5a3e2a', px, 1.1, pz); m.rotation.y = ry2; continue; }
      const m = add(new T.PlaneGeometry(.8, 1.2), '#2b3440', px, yy, pz); m.rotation.y = ry2; for (const s of [-1, 1]) { const q = add(new T.PlaneGeometry(.42, 1.25), pers, px + (side % 2 ? 0 : s * .62) * (side === 2 ? -1 : 1), yy, pz + (side % 2 ? s * .62 * (side === 3 ? -1 : 1) : 0)); q.rotation.y = ry2; q.position.add(new T.Vector3(Math.sin(ry2) * .01, 0, Math.cos(ry2) * .01)); }
      if (o.cornici) { const q = add(new T.PlaneGeometry(1.05, 1.45), o.cornici, px, yy, pz); q.rotation.y = ry2; q.position.add(new T.Vector3(-Math.sin(ry2) * .005, 0, -Math.cos(ry2) * .005)); } } } }
    g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); return g; };
  K.persona = (x, y, z, c, h, seduto) => { h = h || 1.7; const pel = ['#e0bc98', '#c89a74', '#a87a58'][Math.floor(R() * 3)]; c = c || K.cappotto(); if (seduto) { K.add(new T.CapsuleGeometry(.2, .35, 2, 6), c, x, y + .75, z); K.sph(.15, pel, x, y + 1.2, z, 1, 1, 1, 1); return; } K.add(new T.CapsuleGeometry(.11, h * .42, 2, 5), '#3a3a48', x, y + h * .27, z); K.add(new T.CapsuleGeometry(.2, h * .25, 2, 6), c, x, y + h * .6, z); K.sph(.14, pel, x, y + h * .88, z, 1, 1.1, 1, 1); };
  K.cappotto = () => ['#3a3a40', '#5a4a3a', '#6a2e2a', '#2f4a5a', '#7a6a50', '#4a5040', '#2a2a2e', '#8a7a60'][Math.floor(R() * 8)];
  K.fluo = () => ['#e8ff3a', '#ff4fa0', '#3affd8', '#ff8a1a'][Math.floor(R() * 4)];
  K.skater = (x, y, z, ry) => { K.persona(x, y + .12, z, K.fluo(), 1.65); const b = K.box(.25, .05, .85, '#2a2a2a', x, y + .06, z, ry || 0); };
  K.rete = (x, y, z, r, c) => K.sph(r || 1, c || '#5a6a5a', x, y + .1, z, 1.3, .28, 1, 1);
  K.cassette = (x, y, z, n, ry) => { for (let k = 0; k < (n || 4); k++) K.box(.6, .32, .45, k % 2 ? '#c8b080' : '#6a8aa0', x + (k % 2) * .62, y + Math.floor(k / 2) * .33, z, ry || 0); };
  K.bunker = (x, y, z, ry) => { const g = K.cyl(2.4, 2.8, 1.9, '#9a968c', x, y, z, 7); g.rotation.y = ry || 0; K.cyl(2.6, 2.6, .4, '#8a867c', x, y + 1.9, z, 7); K.box(1.6, .3, .1, '#1a1a1a', x + Math.sin(ry || 0) * 2.5, y + 1.3, z + Math.cos(ry || 0) * 2.5, ry || 0); };
  K.cartellone = (txt, x, y, z, ry, w, h, bg, fg) => { w = w || 6; h = h || 3; for (const a of [-w / 3, w / 3]) K.box(.15, 2.2, .15, '#4a4a48', x + Math.cos(ry || 0) * a, y, z - Math.sin(ry || 0) * a, ry || 0); K.box(w + .2, h + .2, .12, '#3a3a38', x, y + 2.2, z, ry || 0); K.scritta(txt, w, h, fg || '#f2ead8', bg || '#7a2a26', x + Math.sin(ry || 0) * .08, y + 2.3 + h / 2, z + Math.cos(ry || 0) * .08, ry || 0); };
  K.auto = (x, y, z, ry, c) => { const g = new T.Group(); const add = (geo, col, px, py, pz) => { const m = new T.Mesh(geo, K.mat(col)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    add(new T.BoxGeometry(1.4, .55, 3), c, 0, .55, 0); add(new T.BoxGeometry(1.25, .45, 1.5), c, 0, 1.03, -.1); add(new T.BoxGeometry(1.28, .32, 1.35), '#2a3a48', 0, 1.02, -.1); for (const sx of [-.62, .62]) for (const sz of [-.95, .95]) { const w = add(new T.CylinderGeometry(.28, .28, .2, 10), '#222', sx, .28, sz); w.rotation.z = Math.PI / 2; }
    g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); };
  K.guardrail = (Ln, off, s0, s1, hfun) => { const L = []; for (let s = s0; s <= s1; s += 2) { const p = K.at(Ln, s), x = p.x - p.tz * off, z = p.z + p.tx * off; L.push([x, (hfun || H)(x, z) + .4, z]); } K.inst(new T.BoxGeometry(.14, .85, .14), '#5e6264', L);
    const P = Ln.filter(p => p.s >= s0 && p.s <= s1); K.wall(P, off + .07, .05, 0, 0, '#c4c8c8'); const m = K.wall(P, off + .08, .04, 0, 0, '#c8ccce'); S.remove(m);
    const g = new T.BufferGeometry(), pos = [], idx = []; P.forEach((p, i) => { const x = p.x - p.tz * (off + .08), z = p.z + p.tx * (off + .08), h = (hfun || H)(x, z); pos.push(x, h + .45, z, x, h + .8, z); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const me = new T.Mesh(g, K.mat('#e4e8ea', { side: T.DoubleSide, metalness: .3, roughness: .45 })); me.castShadow = true; S.add(me); };
  K.muretto = (Ln, off, s0, s1, h, c, hfun) => { const P = Ln.filter(p => p.s >= s0 && p.s <= s1); const g = new T.BufferGeometry(), pos = [], idx = []; P.forEach((p, i) => { const nx = -p.tz, nz = p.tx; for (const [s, yy] of [[-1, 0], [-1, 1], [1, 1], [1, 0]]) { const o = off + s * .25, x = p.x + nx * o, z = p.z + nz * o; pos.push(x, (hfun || H)(x, z) + (yy ? h + (K.noise(p.s * 2, s) - .5) * .12 : -.3), z); } if (i) { const a = (i - 1) * 4, b = i * 4; for (let k = 0; k < 3; k++) idx.push(a + k, b + k, a + k + 1, a + k + 1, b + k, b + k + 1); } });
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new T.Mesh(g, K.mat(c || '#b4a68e', { side: T.DoubleSide })); m.castShadow = m.receiveShadow = true; S.add(m);
    const st = []; for (let s = s0; s <= s1; s += .45) { const p = K.at(Ln, s); for (const yy of [.25, .6]) { if (yy > h) continue; const x = p.x - p.tz * (off + .26), z = p.z + p.tx * (off + .26); st.push([x, (hfun || H)(x, z) + yy * h / .8, z, R() * 3, R(), R(), .22 + R() * .08]); const x2 = p.x - p.tz * (off - .26), z2 = p.z + p.tx * (off - .26); st.push([x2, (hfun || H)(x2, z2) + yy * h / .8, z2, R() * 3, R(), R(), .22 + R() * .08]); } } K.inst(new T.DodecahedronGeometry(1, 0), c ? c : '#a89a82', st); };
  K.edicola = (x, y, z, ry) => { const g = new T.Group(); const add = (geo, col, px, py, pz) => { const m = new T.Mesh(geo, K.mat(col)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m; };
    add(new T.BoxGeometry(.9, 1.6, .6), '#efe6d6', 0, .8, 0); add(new T.BoxGeometry(1.05, .14, .75), '#d8ccb8', 0, 1.65, 0); const r = add(new T.ConeGeometry(.7, .45, 4), '#b8583a', 0, 1.95, 0); r.rotation.y = Math.PI / 4; add(new T.PlaneGeometry(.5, .6), '#3a6aa0', 0, 1.0, .31); add(new T.PlaneGeometry(.22, .32), '#f4e6c8', 0, 1.0, .315);
    add(new T.BoxGeometry(.7, .08, .25), '#d8ccb8', 0, .55, .38); for (const sx of [-.2, 0, .2]) add(new T.SphereGeometry(.06, 6, 4), '#e04040', sx, .64, .42); add(new T.SphereGeometry(.09, 6, 4), '#f0d040', .28, .66, .4);
    g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); };
  K.cantoniera = (x, y, z, ry, km) => { const g = K.casa(x, y, z, 10, 8, 6.6, '#a8443a', ry, { piani: 2, fascia: '#efe6d6', zoccolo: '#8a3a32', tetto: '#b05a3c', alto: 1.8, persiane: '#5a3a28', cornici: '#efe6d6', porta: 0 });
    const s = new T.Mesh(new T.PlaneGeometry(6.4, .62), K.testo('CASA CANTONIERA', 6.4, .62, '#f4ecdc')); s.position.set(0, 3.55, 4.04); g.add(s); const s2 = new T.Mesh(new T.PlaneGeometry(2.6, .5), K.testo('A.N.A.S.', 2.6, .5, '#f4ecdc')); s2.position.set(0, 5.9, 4.04); g.add(s2);
    const s3 = new T.Mesh(new T.PlaneGeometry(5.4, .5), K.testo(km || 'S.S. 125  km 44', 5.4, .5, '#f4ecdc')); s3.position.set(5.03, 3.55, 0); s3.rotation.y = Math.PI / 2; g.add(s3); return g; };
  K.cippo = (x, y, z, ry, txt) => { const g = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(.4, .7, .18), K.mat('#f2efe6')); m.position.y = .35; g.add(m); const t = new T.Mesh(new T.BoxGeometry(.42, .2, .2), K.mat('#c8402e')); t.position.y = .7; g.add(t); const s = new T.Mesh(new T.PlaneGeometry(.36, .3), K.testo(txt || '44', .36, .3, '#222')); s.position.set(0, .4, .095); g.add(s); g.position.set(x, y, z); g.rotation.y = ry || 0; S.add(g); };
  K.cartello = (txt, x, y, z, ry, w, h, fg, bg) => { K.cyl(.04, .04, 2.2, '#9a9a9a', x, y, z, 5); K.scritta(txt, w || 1.4, h || .5, fg || '#fff', bg || '#2a5a9a', x, y + 2.0, z + .03, ry); };
  // ---- luce, cielo, camera, scatto ----
  K.finisci = (cx, cz, dist, opts) => { opts = opts || {}; const W = 1280, Hh = 800; const ren = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); ren.setSize(W, Hh); ren.setPixelRatio(1); ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap; ren.outputEncoding = T.sRGBEncoding; ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = opts.esp || .9; document.body.appendChild(ren.domElement);
    S.background = new T.Color(opts.cielo || '#c9cfcf'); S.fog = new T.Fog(opts.cielo || '#c9cfcf', dist * .95, dist * 1.9);
    const hemi = new T.HemisphereLight('#d4dce4', '#8a8070', .85); S.add(hemi); const sun = new T.DirectionalLight('#ffe2bc', 1.9); const az = opts.az !== undefined ? opts.az : -2.2, el = opts.el || .36; sun.position.set(cx + Math.cos(az) * Math.cos(el) * 120, Math.sin(el) * 120, cz + Math.sin(az) * Math.cos(el) * 120); sun.target.position.set(cx, 0, cz); S.add(sun); S.add(sun.target);
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); const sc = sun.shadow.camera, e = dist * .28; sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = 1; sc.far = 400; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04;
    const YAW = opts.yaw !== undefined ? opts.yaw : Math.PI / 4, P = opts.pitch || .78; const cam = new T.PerspectiveCamera(opts.fov || 14, W / Hh, 1, 900); cam.position.set(cx + Math.sin(YAW) * Math.cos(P) * dist, Math.sin(P) * dist, cz + Math.cos(YAW) * Math.cos(P) * dist); cam.lookAt(cx, opts.ly || 0, cz);
    ren.render(S, cam); window.__pronto = true; };
})();
