/* Porto Vecchio — Le superfici: la "veste" dei modelli fatti a mano (pezzi.js, bottino.js, postazioni st_*, mobili pv_*).
   Prima erano scatole lisce a tinta unita. `Superfici.vesti(gruppo)` passa ogni mesh e le dà tre livelli di profondità:
   1. spigoli smussati: le scatole diventano scatole arrotondate (normali morbide sugli spigoli, che prendono la luce);
   2. texture per materiale, in metri veri (una texture = 50 cm), in scala di grigi moltiplicata per il colore che c'era:
      legno con le venature, metallo spazzolato e graffiato, vernice scrostata, ghisa, mattoni, tessuto, carta, gomma;
      la stessa immagine fa da rilievo (bumpMap);
   3. ombra di contatto: i vertici vicino a terra si scuriscono (colori per vertice), così il modello poggia.
   Il materiale si indovina dal colore e dalla metallicità (`tipo`), oppure si dice con material.userData.sup = 'legno'.
   Le mesh con una texture loro, quelle che si illuminano e quelle trasparenti cambiano solo forma (e non sempre). */
var Superfici = (function () {
  'use strict';
  const T = 0.5;                 // metri coperti da una texture
  const N = 64;                  // pixel della texture (128 px/m: fitto, ma sempre a pixel netti come il resto del gioco)
  const TEX = {}, MATS = new Map(), GEOS = new Map();
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------------- LE TEXTURE (grigio: 255 = il colore pieno, più scuro = segni) ----------------
  function canvas(name, draw) {
    if (TEX[name]) return TEX[name];
    const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); seed = name.length * 977 + 13;
    const px = (v, X, Y, w, h) => { x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`; x.fillRect(X, Y, w || 1, h || 1); };
    draw(x, px);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 2;
    return (TEX[name] = t);
  }
  const noise = (px, a, b, n) => { for (let i = 0; i < (n || N * N * .5); i++) px(a + rnd() * (b - a), rnd() * N | 0, rnd() * N | 0); };
  const TEXS = {
    // venature lungo u, più chiare e più scure, qualche nodo, le fughe tra le assi
    legno: () => canvas('legno', (x, px) => { px(232, 0, 0, N, N); for (let y = 0; y < N; y++) { const v = 214 + Math.sin(y * .9) * 12 + rnd() * 10; for (let X = 0; X < N; X += 1 + (rnd() * 3 | 0)) px(v + (rnd() - .5) * 14, X, y, 2 + (rnd() * 6 | 0), 1); }
      for (let k = 0; k < 16; k++) px(178 + rnd() * 20, rnd() * N | 0, rnd() * N | 0, 6 + (rnd() * 20 | 0), 1);
      for (let k = 0; k < 2; k++) { const X = rnd() * N | 0, Y = rnd() * N | 0; for (let r = 4; r > 0; r--) { x.fillStyle = `rgb(${150 + r * 18},${150 + r * 18},${150 + r * 18})`; x.beginPath(); x.ellipse(X, Y, r * 1.8, r * .7, 0, 0, 7); x.fill(); } }
      px(120, 0, 0, N, 1); px(150, 0, N / 2, N, 1); }),
    // spazzolato orizzontale, graffi, qualche ammaccatura scura
    metallo: () => canvas('metallo', (x, px) => { px(236, 0, 0, N, N); for (let y = 0; y < N; y++) for (let X = 0; X < N; X += 4) px(222 + rnd() * 30, X, y, 4 + (rnd() * 10 | 0), 1);
      for (let k = 0; k < 9; k++) { x.strokeStyle = `rgb(${190 + rnd() * 30 | 0},${190 + rnd() * 30 | 0},${190 + rnd() * 30 | 0})`; x.beginPath(); const X = rnd() * N, Y = rnd() * N; x.moveTo(X, Y); x.lineTo(X + (rnd() - .5) * 30, Y + (rnd() - .5) * 8); x.stroke(); }
      for (let k = 0; k < 5; k++) px(180, rnd() * N | 0, rnd() * N | 0, 2, 2); }),
    // vernice su lamiera: velature, schegge che scoprono il fondo scuro, colature di sporco dall'alto
    verniciato: () => canvas('verniciato', (x, px) => { px(242, 0, 0, N, N); noise(px, 234, 250, N * N * .35);
      for (let k = 0; k < 4; k++) { const X = rnd() * N | 0, Y = rnd() * N | 0, w = 1 + (rnd() * 2 | 0); px(170, X, Y, w, 1); px(205, X, Y - 1, w, 1); }
      for (let k = 0; k < 3; k++) { const X = rnd() * N | 0, l = 8 + rnd() * 20 | 0; for (let y = 0; y < l; y++) px(236 - (1 - y / l) * 8, X, y, 1, 1); } }),
    // ghisa e ferro scuro: grana grossa, butterature
    ghisa: () => canvas('ghisa', (x, px) => { px(232, 0, 0, N, N); noise(px, 210, 252, N * N * .7); for (let k = 0; k < 14; k++) px(185, rnd() * N | 0, rnd() * N | 0, 1 + (rnd() * 2 | 0), 1 + (rnd() * 2 | 0)); }),
    // mattoni 25×6 cm sfalsati, giunti di malta incassati, ogni mattone col suo tono
    mattone: () => canvas('mattone', (x, px) => { px(150, 0, 0, N, N); const bh = 8, bw = 32;
      for (let r = 0; r < N / bh; r++) for (let c = -1; c < N / bw + 1; c++) { const X = c * bw + (r % 2) * bw / 2, v = 205 + rnd() * 50; px(v, X + 1, r * bh + 1, bw - 2, bh - 2); for (let k = 0; k < 12; k++) px(v - 25 + rnd() * 30, X + 1 + rnd() * (bw - 3) | 0, r * bh + 1 + rnd() * (bh - 3) | 0); } }),
    // trama a tela
    tessuto: () => canvas('tessuto', (x, px) => { px(232, 0, 0, N, N); for (let y = 0; y < N; y++) for (let X = 0; X < N; X++) if ((X + y) % 2) px(206 + rnd() * 20, X, y); for (let y = 0; y < N; y += 4) px(214, 0, y, N, 1); }),
    // carta e cartone: fibre leggere
    carta: () => canvas('carta', (x, px) => { px(244, 0, 0, N, N); noise(px, 228, 252, N * N * .4); for (let k = 0; k < 30; k++) px(222, rnd() * N | 0, rnd() * N | 0, 3 + (rnd() * 6 | 0), 1); }),
    // gomma e plastica nera: opaca, appena granulosa
    gomma: () => canvas('gomma', (x, px) => { px(240, 0, 0, N, N); noise(px, 226, 252, N * N * .5); }),
    // pietra e cemento: macchie larghe e puntini
    pietra: () => canvas('pietra', (x, px) => { px(225, 0, 0, N, N); for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${170 + rnd() * 80 | 0},${170 + rnd() * 80 | 0},${170 + rnd() * 80 | 0},.5)`; x.beginPath(); x.arc(rnd() * N, rnd() * N, 2 + rnd() * 7, 0, 7); x.fill(); } noise(px, 160, 255, N * N * .3); }),
  };

  // ---------------- CHE MATERIALE È ----------------
  function tipo(m) {
    if (m.userData && m.userData.sup) return m.userData.sup;
    const nm = m.name || '';   // i modelli scaricati dicono di cosa sono fatti nel nome del materiale
    if (/wood|legno|plank|log|bark/i.test(nm)) return 'legno';
    if (/sack|cloth|fabric|canvas|tent|bag/i.test(nm)) return 'tessuto';
    if (/cardboard|paper|tape|carton/i.test(nm)) return 'carta';
    if (/rubber|tire|tyre/i.test(nm)) return 'gomma';
    if (/metal|steel|iron|chrome|alumin/i.test(nm)) return 'metallo';
    if (/stone|rock|brick|concrete/i.test(nm)) return 'pietra';
    const c = m.color, hsl = c.getHSL({}), met = m.metalness || 0;
    if (met >= .22) return hsl.l < .2 ? 'ghisa' : 'metallo';
    if (hsl.l < .13) return 'gomma';
    const h = hsl.h * 360, lucido = m.isMeshStandardMaterial && m.roughness < .45;
    if (!lucido && h >= 12 && h <= 48 && hsl.s > .2 && hsl.s < .6 && hsl.l > .16 && hsl.l < .66) return h < 20 && hsl.s > .4 && hsl.l < .45 ? 'mattone' : 'legno';
    if (hsl.s < .12 && hsl.l > .8) return 'carta';
    if (hsl.s < .14) return hsl.l < .35 ? 'ghisa' : 'pietra';
    return 'verniciato';
  }
  const ROUGH = { legno: .82, metallo: .45, verniciato: .62, ghisa: .78, mattone: .95, tessuto: 1, carta: .95, gomma: .92, pietra: .95 };
  const BUMP = { legno: .8, metallo: .2, verniciato: .2, ghisa: .45, mattone: 2.2, tessuto: .6, carta: .25, gomma: .25, pietra: 1.1 };
  // il materiale vestito: stessa tinta (un filo più chiara, la texture la scurisce in media), più la texture, il rilievo, i colori per vertice
  function vestito(m) {
    if (MATS.has(m)) return MATS.get(m);
    const k = tipo(m), tx = TEXS[k] ? TEXS[k]() : null;
    let n = m;
    if (tx && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) {
      n = new THREE.MeshStandardMaterial({ color: m.color.clone().multiplyScalar(1.08), map: tx, bumpMap: tx, bumpScale: BUMP[k] * .012, roughness: m.isMeshStandardMaterial ? Math.max(m.roughness, ROUGH[k] - .15) : ROUGH[k], metalness: m.isMeshStandardMaterial ? Math.min(.35, m.metalness) : 0, vertexColors: true, side: m.side });
      n.name = m.name; n.userData = Object.assign({}, m.userData, { sup: k, vestito: true });
    }
    MATS.set(m, n); return n;
  }

  // ---------------- LE FORME ----------------
  // scatola arrotondata (come RoundedBoxGeometry degli esempi di three): 3 segmenti per lato, i vertici esterni spinti sull'arco
  // uv in metri (faccia per faccia) oppure 0..1 per faccia se il materiale aveva già la sua texture
  // per faccia (px, nx, py, ny, pz, nz): asse di u, verso, asse di v, verso — come buildPlane di BoxGeometry
  const FACE = [[2, -1, 1, -1], [2, 1, 1, -1], [0, 1, 2, 1], [0, 1, 2, -1], [0, 1, 1, -1], [0, -1, 1, -1]];
  function scatola(w, h, d, r, faceUv) {
    const key = [w, h, d, r, faceUv ? 1 : 0].map(v => typeof v === 'number' ? v.toFixed(3) : v).join('|');
    if (GEOS.has(key)) return GEOS.get(key);
    const sg = r > 0 ? 3 : 1, geo = new THREE.BoxGeometry(1, 1, 1, sg, sg, sg), P = geo.attributes.position, Nn = geo.attributes.normal, UV = geo.attributes.uv;
    const half = [w / 2 - r, h / 2 - r, d / 2 - r], size = [w, h, d], v = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      const a = [P.getX(i), P.getY(i), P.getZ(i)];
      for (let j = 0; j < 3; j++) { const s = Math.sign(a[j]), m = Math.abs(a[j]); a[j] = m > .4 ? s * size[j] / 2 : a[j] * 6 * half[j]; }   // ±1/6 → filo dello spigolo, ±1/2 → faccia
      v.set(a[0], a[1], a[2]); q.set(Math.max(-half[0], Math.min(half[0], v.x)), Math.max(-half[1], Math.min(half[1], v.y)), Math.max(-half[2], Math.min(half[2], v.z)));
      n.copy(v).sub(q); if (n.lengthSq() < 1e-12) n.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); n.normalize();
      const f = q.clone().addScaledVector(n, r); P.setXYZ(i, f.x, f.y, f.z);
      // la faccia d'origine dice come stendere la texture, con gli stessi versi di BoxGeometry (le scritte restano dritte)
      const nx = Nn.getX(i), ny = Nn.getY(i), nz = Nn.getZ(i), F = Math.abs(nx) > .5 ? (nx > 0 ? 0 : 1) : Math.abs(ny) > .5 ? (ny > 0 ? 2 : 3) : (nz > 0 ? 4 : 5);
      const [au, du, av, dv] = FACE[F], pu = [f.x, f.y, f.z][au], pv = [f.x, f.y, f.z][av];
      Nn.setXYZ(i, n.x, n.y, n.z);
      if (faceUv) UV.setXY(i, pu * du / size[au] + .5, .5 - pv * dv / size[av]); else UV.setXY(i, pu * du / T + .5, .5 - pv * dv / T);
    }
    P.needsUpdate = Nn.needsUpdate = UV.needsUpdate = true; geo.computeBoundingSphere(); geo.computeBoundingBox();
    GEOS.set(key, geo); return geo;
  }
  // le altre forme: stesse uv di three, scalate perché una texture copra 50 cm
  function uvMetri(geo, sx, sy, sz) {
    const p = geo.parameters || {}, t = geo.type; let su = 0, sv = 0;
    const R = Math.max(sx, sz);
    if (t === 'CylinderGeometry') { su = Math.PI * (p.radiusTop + p.radiusBottom) * R; sv = p.height * sy; }
    else if (t === 'ConeGeometry') { su = Math.PI * p.radius * R; sv = p.height * sy; }
    else if (t === 'SphereGeometry') { su = 2 * Math.PI * p.radius * R; sv = Math.PI * p.radius * sy; }
    else if (t === 'TorusGeometry') { su = (p.arc || 2 * Math.PI) * p.radius * R; sv = 2 * Math.PI * p.tube * R; }
    else if (t === 'CapsuleGeometry') { su = 2 * Math.PI * p.radius * R; sv = (p.length + 2 * p.radius) * sy; }
    else if (t === 'LatheGeometry') { const mx = Math.max(...p.points.map(v => v.x)), ys = p.points.map(v => v.y); su = 2 * Math.PI * mx * R; sv = (Math.max(...ys) - Math.min(...ys)) * sy; }
    else if (t === 'TubeGeometry') { su = p.path.getLength() * R; sv = 2 * Math.PI * p.radius * R; }
    else if (t === 'DodecahedronGeometry' || t === 'IcosahedronGeometry') { su = sv = 2 * p.radius * R; }
    else if (t === 'ExtrudeGeometry') { su = sv = R; }   // le uv degli estrusi sono già in metri: basta la scala
    else return geo;
    const key = geo.uuid + '|' + su.toFixed(3) + '|' + sv.toFixed(3); if (GEOS.has(key)) return GEOS.get(key);
    const g2 = geo.clone(), UV = g2.attributes.uv; if (!UV) return geo;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, UV.getX(i) * Math.max(su, .02) / T, UV.getY(i) * Math.max(sv, .02) / T);
    UV.needsUpdate = true; GEOS.set(key, g2); return g2;
  }

  // uv per i modelli che non le hanno (Quaternius): ogni vertice prende la faccia della sua normale (sono modelli a facce piatte), in metri
  function proietta(geo, o, inv) {
    const g2 = geo.clone(), P = g2.attributes.position, Nn = g2.attributes.normal, uv = new Float32Array(P.count * 2), v = new THREE.Vector3(), n = new THREE.Vector3();
    o.updateMatrixWorld(true); const mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(mw);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(mw); if (Nn) n.fromBufferAttribute(Nn, i).applyMatrix3(nm); else n.set(0, 1, 0);
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      const [u, w] = ax >= ay && ax >= az ? [v.z, v.y] : ay >= az ? [v.x, v.z] : [v.x, v.y];
      uv[i * 2] = u / T; uv[i * 2 + 1] = w / T;
    }
    g2.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g2;
  }

  // ---------------- VESTIRE UN GRUPPO ----------------
  const salta = m => !m || m.transparent || m.isMeshBasicMaterial || (m.emissive && (m.emissiveIntensity || 0) * (m.emissive.r + m.emissive.g + m.emissive.b) > .15);
  function vesti(root, opt) {
    if (typeof THREE === 'undefined' || !root || root.userData.vestito) return root;
    opt = opt || {}; root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), tmp = new THREE.Vector3();
    const metti = [];
    root.traverse(o => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.noVeste || o.userData.vestito) return;   // già vestita: non si rifà
      metti.push(o);
    });
    // gli ingombri di tutti i pezzi nel sistema del gruppo: servono all'occlusione nei punti di contatto
    const boxes = metti.map(o => { const bb = new THREE.Box3().setFromObject(o); bb.applyMatrix4(inv); return bb; });
    for (let mi = 0; mi < metti.length; mi++) {
      const o = metti[mi];
      o.userData.vestito = true;
      const m0 = Array.isArray(o.material) ? null : o.material; if (!m0) continue;
      const proprio = !!m0.map, nudo = salta(m0);
      let geo = o.geometry;
      // 1. la forma: scatole smussate (la scala della mesh entra nelle misure, così aste e pannelli non si deformano)
      if (geo.type === 'BoxGeometry' && !opt.noSmusso) {
        const pp = geo.parameters, s = o.scale, w = pp.width * Math.abs(s.x), h = pp.height * Math.abs(s.y), d = pp.depth * Math.abs(s.z), mn = Math.min(w, h, d);
        if (mn > .004 && Math.abs(s.x) > 1e-4 && Math.abs(s.y) > 1e-4 && Math.abs(s.z) > 1e-4) { const r = mn >= .03 ? Math.min(.02, mn * .16) : 0; geo = scatola(w, h, d, r, proprio); o.scale.set(Math.sign(s.x) || 1, Math.sign(s.y) || 1, Math.sign(s.z) || 1); }   // sotto i 3 cm lo smusso non si vede: solo uv
      } else if (!proprio && !nudo) geo = uvMetri(geo, Math.abs(o.scale.x), Math.abs(o.scale.y), Math.abs(o.scale.z));
      if (nudo || proprio) { o.geometry = geo; continue; }
      if (!geo.attributes.uv) geo = proietta(geo, o, inv);
      // 2. il materiale; 3. l'ombra di contatto nei colori per vertice (quota di ogni vertice nel sistema del gruppo)
      const m = vestito(m0); if (m === m0) { o.geometry = geo; continue; }
      geo = geo.clone();   // i colori per vertice sono di questa mesh sola (le forme in cache restano pulite)
      const P = geo.attributes.position, col = new Float32Array(P.count * 3); o.updateMatrixWorld(true);
      const mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), own = boxes[mi], y0 = own.min.y, hh = Math.max(.05, own.max.y - own.min.y);
      const near = boxes.filter((bb, j) => j !== mi && bb.intersectsBox(own.clone().expandByScalar(.04))).map(bb => bb.clone().expandByScalar(.03));
      const tono = .94 + (((Math.abs(own.min.x * 73.1 + own.min.z * 37.7 + own.min.y * 19.3) * 1000) | 0) % 100) / 100 * .1;   // ogni pezzo il suo tono (fisso)
      for (let i = 0; i < P.count; i++) {
        tmp.fromBufferAttribute(P, i).applyMatrix4(mw);
        const y = Math.max(0, tmp.y);
        let k = .55 + .45 * Math.min(1, Math.pow(y / .35, .7));            // a terra il 55%, pieno da 35 cm in su
        k *= .84 + .16 * Math.min(1, Math.max(0, (tmp.y - y0) / hh));      // ogni pezzo più scuro in basso
        let c = 0; for (const bb of near) if (bb.containsPoint(tmp)) c++;   // dentro o a filo di un altro pezzo: in ombra
        k *= Math.pow(.8, Math.min(c, 3)) * tono;
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.min(1, k);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      o.geometry = geo; o.material = m;
    }
    root.userData.vestito = true;
    return root;
  }
  return { vesti, tipo, scatola, TEXS };
})();
