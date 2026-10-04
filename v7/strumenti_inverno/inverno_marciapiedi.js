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
      c.set('#5a5860').lerp(c.clone().set('#b4bac2'), top); c.multiplyScalar(1 + n1 * .12 + n2 * .05); c.lerp(new THREE.Color('#c8ccd4'), snow * .4 * top);
      pos.push(x, y, z); col.push(c.r, c.g, c.b); return (idx[k] = pos.length / 3 - 1); };
    for (let j = 0; j < NH - 1; j++) for (let i = 0; i < NW - 1; i++) {
      const k = j * NW + i; if (H[k] < .004 && H[k + 1] < .004 && H[k + NW] < .004 && H[k + NW + 1] < .004) continue;
      const a = vert(i, j), b = vert(i + 1, j), d = vert(i, j + 1), e = vert(i + 1, j + 1); ind.push(a, d, b, b, d, e);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(ind); geo.computeVertexNormals();
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.WW / 2, 0, G.WH / 2), Math.hypot(G.WW, G.WH));
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#34363c', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); mesh.receiveShadow = true; mesh.frustumCulled = false; scene.add(mesh);
    return ind.length / 3;
  }
