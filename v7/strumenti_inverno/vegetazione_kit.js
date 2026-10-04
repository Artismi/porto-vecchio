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
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86, .89, .94), clamp(vSnow, 0., 1.) * .8);`);
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
