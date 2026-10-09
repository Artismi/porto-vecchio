/* Porto Vecchio — I vestiti che si vedono: ogni capo del Guardaroba diventa un guscio ricavato dal corpo del personaggio
   (i triangoli delle ossa che copre: busto, braccia, bacino, cosce…), un po' più largo a ogni strato, legato allo stesso scheletro.
   Così l'ordine si vede davvero: le mutande sopra i pantaloni stanno sopra, il cappotto lungo spunta sotto la giacca corta.
   Cappelli, caschi, sciarpe, paraspalle, ginocchiere e zaino sono pezzi agganciati alle ossa.
   Avvolge Models.person: Nino si veste con quello che ha addosso (anche in strada), gli abitanti secondo chi sono (Guardaroba.outfitOf). */
var Vesti3D = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st;
  // i nomi delle ossa arrivano senza punti (three toglie '.': Shoulder.L → ShoulderL)
  const PARTI = { torso: /^(Chest|Torso|Abdomen|Shoulder[LR])$/, braccia: /^UpperArm[LR]$/, avambracci: /^LowerArm[LR]$/, bacino: /^Hips$/, cosce: /^UpperLeg[LR]$/, polpacci: /^LowerLeg[LR]$/,
    piedi: /^(Foot[LR]|PT[LR])$/, mani: /^(Wrist[LR]|Index\d[LR]|Middle\d[LR]|Ring\d[LR]|Pinky\d[LR]|Thumb\d[LR])$/, collo: /^Neck$/ };
  const KEEP = /^(Skin.*|Eye.*|Eyebrows|Hair.*|Moustache)$/i;   // i materiali del corpo che restano (pelle, occhi, sopracciglia, capelli, baffi). [vestiti] Prima era /…|Brow/: prendeva anche LightBrown e Brown (camicie e pantaloni del kit), che restavano addosso
  const players = new Set();
  const AN = new Map();   // analisi della geometria, per uuid
  const GC = ['getX', 'getY', 'getZ', 'getW'], comp = (a, i, k) => a[GC[k]](i);   // three r149: niente getComponent

  // ---------------- ANALISI DI UNA MESH: per ogni vertice la parte del corpo, e la normale liscia ----------------
  function analyze(mesh) {
    const geo = mesh.userData.geo0 || mesh.geometry; if (AN.has(geo.uuid)) return AN.get(geo.uuid);   // [vestiti] sempre la geometria intera (quella in uso può avere la pelle coperta tolta)
    slim(mesh, geo);   // [vestiti] prima si sgonfia il corpo: i vestiti del modello non devono restare sotto la pelle
    const pos = geo.attributes.position, nor = geo.attributes.normal, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight; if (!pos || !si || !sw) return null;
    const n = pos.count, part = new Array(n), bones = mesh.skeleton.bones, legs = /Legs/i.test(mesh.name);
    const names = Object.keys(PARTI);
    for (let i = 0; i < n; i++) {
      let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = comp(sw, i, k); if (w > bw) { bw = w; best = comp(si, i, k); } }
      const bn = bones[best] ? bones[best].name : ''; let pt = names.find(p => PARTI[p].test(bn)) || null;
      if (bn === 'Body' || (legs && pt === 'torso')) pt = legs ? 'bacino' : 'torso';   // la vita: nella mesh delle gambe è bacino, nel busto è torso
      part[i] = pt;
    }
    // normali lisce: la media delle normali nello stesso punto (il modello è a facce piatte, sennò il guscio si apre)
    const key = i => `${Math.round(pos.getX(i) * 1e3)},${Math.round(pos.getY(i) * 1e3)},${Math.round(pos.getZ(i) * 1e3)}`, acc = new Map(), sm = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = key(i); let a = acc.get(k); if (!a) acc.set(k, a = [0, 0, 0]); if (nor) { a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); } }
    for (let i = 0; i < n; i++) { const a = acc.get(key(i)), l = Math.hypot(a[0], a[1], a[2]) || 1; sm[i * 3] = a[0] / l; sm[i * 3 + 1] = a[1] / l; sm[i * 3 + 2] = a[2] / l; }
    const idx = geo.index ? geo.index.array : Array.from({ length: n }, (_, i) => i);
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = comp(pos, i, k); if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const A = { part, sm, idx, pos, si, sw, lo, hi, ymin: lo[1], ymax: hi[1] }; AN.set(geo.uuid, A); return A;
  }

  // ---------------- IL CORPO SOTTO: SGONFIARE I VESTITI DEL MODELLO ----------------
  // I modelli del kit hanno già addosso felpa, camicia, pantaloni: dipinti color pelle sembravano una tuta rosa gonfia,
  // e ogni guscio sopra veniva spesso. Qui braccia, avambracci, busto, cosce e polpacci si stringono verso l'osso
  // fino a un raggio da corpo vero, in proporzione alla lunghezza dell'osso (si fa una volta per geometria: è condivisa).
  // L'asse di ogni pezzo si ricava dai vertici stessi (il centro dei vertici di un osso e la direzione verso il centro
  // dei vertici dell'osso dopo): nel kit le matrici delle ossa sono in un'altra unità rispetto ai vertici.
  // [osso dopo, raggio voluto / distanza tra i due centri, stretta massima]
  const SLIM = { UpperArm: ['LowerArm', .2, .55], LowerArm: ['UpperArm', .19, .6], UpperLeg: ['LowerLeg', .22, .65], LowerLeg: ['UpperLeg', .16, .65], Chest: ['Abdomen', .62, .84], Torso: ['Abdomen', .62, .84], Abdomen: ['Chest', .62, .86], Neck: ['Chest', .5, .5] };
  const TORSO_FIX = { Purple: .84, LightBrown: .92, Worker_Yellow: .9 };   // felpa del protagonista, camicia, tuta dell'operaio (primo materiale del corpo)
  function slim(mesh, geo) {
    if (geo.userData.slim || !mesh.skeleton || !geo.attributes.skinIndex) return; geo.userData.slim = true;
    const pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, bones = mesh.skeleton.bones, n = pos.count;
    const main = new Array(n), cen = {}, cnt = {}, v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = comp(sw, i, k); if (w > bw) { bw = w; best = comp(si, i, k); } }
      const nm = bones[best] ? bones[best].name : ''; main[i] = nm; if (bw < .55) continue;   // il centro solo coi vertici ben dentro l'osso
      v.fromBufferAttribute(pos, i); (cen[nm] = cen[nm] || new THREE.Vector3()).add(v); cnt[nm] = (cnt[nm] || 0) + 1;
    }
    for (const k in cen) cen[k].divideScalar(cnt[k]);
    // la linea di ogni osso: dal suo centro verso il centro dell'osso dopo
    const line = {};
    for (const k in cen) {
      const m = /^(UpperArm|LowerArm|UpperLeg|LowerLeg|Chest|Torso|Abdomen|Neck)([LR]?)$/.exec(k); if (!m) continue; const S = SLIM[m[1]], o = cen[S[0] + m[2]];
      if (!o || (cnt[k] || 0) < 12) continue; const d = o.clone().sub(cen[k]), len = d.length(); if (len < 1e-9) continue;
      const torso = !m[2]; line[k] = { c: torso ? cen[k] : cen[k], d: d.normalize(), len, S, rs: [] };
    }
    if (line.Chest && line.Abdomen) line.Torso = line.Torso || line.Chest;
    const off = new Float32Array(n * 3), has = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const L = line[main[i]]; if (!L) continue; v.fromBufferAttribute(pos, i).sub(L.c); v.addScaledVector(L.d, -v.dot(L.d)); off[i * 3] = v.x; off[i * 3 + 1] = v.y; off[i * 3 + 2] = v.z; has[i] = 1; L.rs.push(v.length()); }
    const fac = {};
    // f: stretta uniforme; cap: tetto ai punti che sporgono (cappucci, orli, risvolti dei vestiti del kit) poco sopra il 70° percentile
    const cap = {};
    for (const k in line) { const L = line[k]; if (!L.rs.length) continue; const rs = L.rs.sort((a, b) => a - b), med = rs[rs.length >> 1]; fac[k] = Math.max(L.S[2], Math.min(1, L.S[1] * L.len / (med || 1))); cap[k] = rs[Math.floor(rs.length * .7)] * 1.1 * fac[k]; }
    // il busto si misura col braccio dello stesso modello (raggio di un busto vero ≈ metà della distanza spalla-gomito/gomito-polso)
    // il busto: le misure non distinguono una felpa da un torace, quindi una stretta fissa per i modelli con la maglia nel corpo
    const mat0 = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) || {}, tf = TORSO_FIX[mat0.name];
    if (tf) ['Abdomen', 'Torso', 'Chest', 'Neck'].forEach(k => { const L = line[k]; if (!L || !L.rs.length) return; fac[k] = Math.min(fac[k] || 1, tf); cap[k] = L.rs[Math.floor(L.rs.length * .7)] * 1.06 * fac[k]; });
    for (let i = 0; i < n; i++) { if (!has[i]) continue; const f = fac[main[i]]; if (f === undefined) continue;
      const r = Math.hypot(off[i * 3], off[i * 3 + 1], off[i * 3 + 2]) || 1, r2 = Math.min(r * f, cap[main[i]]), k = r2 / r - 1; if (k > -.001) continue;
      pos.setXYZ(i, pos.getX(i) + off[i * 3] * k, pos.getY(i) + off[i * 3 + 1] * k, pos.getZ(i) + off[i * 3 + 2] * k); }
    pos.needsUpdate = true; geo.computeBoundingSphere();
    if (window.__vestiDbg) console.log('[vestiti] stretta', mesh.name, JSON.stringify(fac));
  }

  // ---------------- PIEDI E MANI: gusci ricavati dal corpo (scarpe, calzini, guanti) ----------------
  // Il resto (busto, maniche, gambe, gonne) lo taglia la Sartoria. Qui: ogni capo è un guscio dei triangoli che è il più esterno a coprire,
  // con uv in metri (dalla posizione a riposo), il tessuto vero e le ombre per vertice (suola scura, punta, contatto).
  const SHOE = { scarpe: ['pelle', '#1a1410'], scarpe_eleganti: ['pelle', '#0c0a0a'], scarpe_tela: ['tela', '#f0ece4'], stivali: ['gomma', '#101410'], ciabatte: ['gomma', null], sandali: ['pelle', '#2a1a10'],
    tacchi: ['pelle', '#1a1010'], scarpe_corsa: ['nylon', '#f4f2ee'], scarpe_skate: ['tela', '#ece6da'], scarpe_air: ['pelle', '#f6f4f0'], stivali_pelle: ['pelle', '#120c0a'], mocassini: ['pelle', '#2a1a10'], calzini: ['costine', null], guanti_lana: ['costine', null], guanti: ['pelle', null] };
  function shells(g, outfit, unit, B) {
    const meshes = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) meshes.push(o); });
    const out = [], rel = new THREE.Matrix4(), gi = new THREE.Matrix4(); g.updateMatrixWorld(true); gi.copy(g.matrixWorld).invert();
    const LL = outfit.filter(c => c.parti && c.parti.some(p => p === 'piedi' || p === 'mani') && !(window.Pittura && (SHOE[c.id] || c.id === 'calzini' || c.id === 'calze_sport' || /calze|calzamaglia/.test(c.id)) && c.parti.includes('piedi')));   // le scarpe vere le fa scarpe(); i calzini sono dipinti
    if (!LL.length) return out;
    meshes.forEach(src => {
      const A = analyze(src); if (!A) return;
      rel.multiplyMatrices(gi, src.matrixWorld); const v = new THREE.Vector3();
      const th = {}; const L = LL.map(c => { const set = new Set(c.parti.filter(p => p === 'piedi' || p === 'mani' || p === 'polpacci' && /stivali/.test(c.id) && !window.Pittura)); /* con la Pittura il gambale dello stivale è dipinto */ let base = 0; set.forEach(p => { base = Math.max(base, th[p] || 0); }); const shoe = SHOE[c.id] && SHOE[c.id][1] !== null && set.has('piedi'), t = base + (shoe ? .004 + c.sp * .2 : .002 + c.sp * .2); set.forEach(p => { th[p] = t; }); return { c, set, off: t / unit }; });   // scarpe grosse, come nei riferimenti
      const per = L.map(() => ({ P: [], N: [], U: [], CO: [], SI: [], SW: [] }));
      const cpos = new Float32Array(A.pos.count * 3); for (let i = 0; i < A.pos.count; i++) { v.fromBufferAttribute(A.pos, i).applyMatrix4(rel); v.toArray(cpos, i * 3); }
      for (let t = 0; t < A.idx.length; t += 3) {
        const a = A.idx[t], b = A.idx[t + 1], d = A.idx[t + 2];
        let k0 = -1; for (let k = L.length - 1; k >= 0; k--) { const S0 = L[k].set; if ((S0.has(A.part[a]) + S0.has(A.part[b]) + S0.has(A.part[d])) >= 2) { k0 = k; break; } }
        if (k0 < 0) continue; const G0 = L[k0], o = per[k0], sh = SHOE[G0.c.id];
        for (const w of [a, b, d]) {
          const k = G0.off * (G0.set.has(A.part[w]) ? 1 : .6);
          o.P.push(A.pos.getX(w) + A.sm[w * 3] * k, A.pos.getY(w) + A.sm[w * 3 + 1] * k, A.pos.getZ(w) + A.sm[w * 3 + 2] * k);
          o.N.push(A.sm[w * 3], A.sm[w * 3 + 1], A.sm[w * 3 + 2]);
          const cx = cpos[w * 3], cy = cpos[w * 3 + 1], cz = cpos[w * 3 + 2];
          // uv in metri: proiezione sul piano più di fronte alla normale
          const ax = Math.abs(A.sm[w * 3]), ay = Math.abs(A.sm[w * 3 + 1]), az = Math.abs(A.sm[w * 3 + 2]); o.U.push(ax > az ? cz : cx, ay > Math.max(ax, az) ? cz + cx : cy);
          let c = 1;
          if (A.part[w] === 'piedi' && sh && sh[1] !== null && !/calzini/.test(G0.c.id)) { if (cy < .022) c = .32; else if (cy < .03) c = .7; }   // la suola, il bordo della tomaia
          if (!G0.set.has(A.part[w])) c *= .78;   // l'orlo
          o.CO.push(c, c, c);
          for (let q = 0; q < 4; q++) { o.SI.push(comp(A.si, w, q)); o.SW.push(comp(A.sw, w, q)); }
        }
      }
      hideCovered(src, A, L);
      per.forEach((o, k) => {
        if (!o.P.length) return; const c = L[k].c, sh = SHOE[c.id] || ['cotone'];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(o.P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(o.N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(o.U, 2));
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(o.SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(o.SW, 4)); geo.setAttribute('color', new THREE.Float32BufferAttribute(o.CO, 3));
        const mat = window.Sartoria ? Sartoria.fabMat(c.pat === 'bande' && sh[0] === 'nylon' ? 'nylon' : sh[0], c.col, c.pat === 'bande' ? '#c83a3a' : c.col, c.col, { lucido: /eleganti|tacchi|stivali/.test(c.id) ? 1 : 0, flat: 1 }) : MAT();
        const m = new THREE.SkinnedMesh(geo, mat); m.userData.vesti = true; m.castShadow = true; m.frustumCulled = false;
        m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale);
        src.parent.add(m); m.bind(src.skeleton, src.bindMatrix); out.push(m);
      });
    });
    return out;
  }
  // toglie dal corpo i triangoli con tutti e tre i vertici sotto un capo (la geometria intera resta in userData.geo0)
  // extra: Uint8Array dei vertici coperti dalla Sartoria (per questa mesh)
  function hideCovered(src, A, L, extra) {
    const geo0 = src.userData.geo0 || (src.userData.geo0 = src.geometry), U = new Set(); (L || []).forEach(l => l.set.forEach(p => U.add(p)));
    const prev = src.userData.hid;   // quello che era già nascosto in questo giro (piedi/mani e sartoria si sommano)
    const cv = i => (extra && extra[i]) || U.has(A.part[i]) || (prev && prev[i]);
    const hid = new Uint8Array(A.part.length); for (let i = 0; i < hid.length; i++) hid[i] = cv(i) ? 1 : 0; src.userData.hid = hid;
    const cov = t => hid[A.idx[t]] && hid[A.idx[t + 1]] && hid[A.idx[t + 2]];
    const groups = geo0.groups && geo0.groups.length ? geo0.groups : [{ start: 0, count: A.idx.length, materialIndex: 0 }];
    const keep = [], ng = new THREE.BufferGeometry();
    for (const gr of groups) { const st0 = keep.length; for (let t = gr.start; t < gr.start + gr.count; t += 3) if (!cov(t)) keep.push(A.idx[t], A.idx[t + 1], A.idx[t + 2]); if (geo0.groups && geo0.groups.length) ng.addGroup(st0, keep.length - st0, gr.materialIndex); }
    for (const k in geo0.attributes) ng.setAttribute(k, geo0.attributes[k]);
    ng.setIndex(keep); ng.boundingBox = geo0.boundingBox; ng.boundingSphere = geo0.boundingSphere;
    src.geometry = ng;   // niente dispose: gli attributi sono condivisi con la geometria intera
  }
  let _mat = null; const MAT = () => _mat || (_mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#181614'), side: THREE.DoubleSide }));

  // ---------------- I PEZZI AGGANCIATI: misurati sulla testa e sul corpo veri ----------------
  // Tutto si costruisce nello spazio del personaggio a riposo (metri, y in alto, davanti +z) e si aggancia all'osso
  // con Sartoria.attach (indipendente dalla posa del momento).
  const sh = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const LM = {}; const lm = c => LM[c] || (LM[c] = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.25) }));
  const FM = (fab, c, c2, c3, lus) => window.Pittura ? Pittura.blockMat(fab, c, c2 || c, c3 || c, { vc: false }) : window.Sartoria ? Sartoria.fabMat(fab, c, c2 || c, c3 || c, { vc: false, lucido: lus || 0 }) : lm(c);   // a campiture, a facce
  // la maglia vera: punti a V (o costine, o pelo) in rilievo, tinta dal colore del materiale; e la peluria (mohair) che ne esce
  const LANA = new Map(), LTEX = {}, hs2 = (i, j) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function lanaTex(kind) {
    if (LTEX[kind]) return LTEX[kind]; const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'), id = x.createImageData(N, N), d = id.data;
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { let v;
      if (kind === 'maglia') { const cx = px % 8, cy = py % 8, u = (cx + .5) / 8 - .5, w = (cy + .5) / 8, leg = Math.abs(Math.abs(u) - (.1 + w * .28)); v = .5 + .5 * Math.max(0, 1 - leg / .16) - (Math.abs(u) < .05 ? .3 : 0) - (w > .88 ? .2 : 0); }   // le due gambe della maglia a V
      else if (kind === 'costine') { const u = (px % 6) / 6; v = .45 + .5 * Math.sin(u * Math.PI) - (py % 5 === 0 ? .08 : 0); }
      else { v = .45 + .5 * hs2(px >> 1, py >> 3) + .1 * Math.sin(py * .8 + (px >> 2)); }   // il pelo a ciocche
      v += (hs2(px, py) - .5) * .14; v = Math.max(0, Math.min(1, v)); const k = (py * N + px) * 4; d[k] = d[k + 1] = d[k + 2] = 255 * (.48 + .52 * v); d[k + 3] = 255; }
    x.putImageData(id, 0, 0); const T = new THREE.CanvasTexture(cv); T.wrapS = T.wrapT = THREE.RepeatWrapping; LTEX[kind] = T; return T;
  }
  function lana(col, kind, ru, rv) {
    kind = kind || 'maglia'; const key = [col, kind, ru || 1, rv || 1].join('|'); let m = LANA.get(key); if (m) return m;
    const T = lanaTex(kind).clone(); T.needsUpdate = true; T.repeat.set(ru || 1, rv || 1);
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(1.22), map: T, bumpMap: T, bumpScale: .0055, roughness: 1, metalness: 0, side: THREE.DoubleSide }); m.emissive = new THREE.Color(col).multiplyScalar(.14); LANA.set(key, m); return m;
  }
  const FUZZ = new Map(); let FUZT = null;
  function peluria(col, ru, rv) {
    const key = col + '|' + (ru || 1) + '|' + (rv || 1); if (FUZZ.has(key)) return FUZZ.get(key);
    if (!FUZT) { const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); x.strokeStyle = '#fff'; x.lineCap = 'round';
      for (let i = 0; i < 220; i++) { const px = hs2(i, 1) * N, py = hs2(i, 2) * N, a = hs2(i, 3) * Math.PI * 2, L = 2 + hs2(i, 4) * 5; x.lineWidth = .5 + hs2(i, 5) * .6; x.globalAlpha = .7 + hs2(i, 6) * .3; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a + .6) * L * .6, py + Math.sin(a + .6) * L * .6, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
      FUZT = new THREE.CanvasTexture(cv); FUZT.wrapS = FUZT.wrapT = THREE.RepeatWrapping; }
    const T = FUZT.clone(); T.needsUpdate = true; T.repeat.set((ru || 1) * .5, (rv || 1) * .5);
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).multiplyScalar(1.3), alphaMap: T, alphaTest: .55, transparent: false, roughness: 1, metalness: 0, side: THREE.DoubleSide, depthWrite: true }); m.emissive = new THREE.Color(col).multiplyScalar(.2); FUZZ.set(key, m); return m;
  }
  // una sacca morbida: rettangolo dagli angoli tondi, estruso col bordo smussato e la pancia gonfia (non una scatola, non una capsula)
  function sacca(w, h, d, rr, pancia) {
    const sh0 = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2, r = Math.min(rr, w / 2 - .002, h / 2 - .002);
    sh0.moveTo(x0 + r, y0); sh0.lineTo(x0 + w - r, y0); sh0.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); sh0.lineTo(x0 + w, y0 + h - r); sh0.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); sh0.lineTo(x0 + r, y0 + h); sh0.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); sh0.lineTo(x0, y0 + r); sh0.quadraticCurveTo(x0, y0, x0 + r, y0);
    const b = Math.min(d * .35, .012), g = new THREE.ExtrudeGeometry(sh0, { depth: Math.max(.002, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b * .8, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * b) / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2), z = p.getZ(i); if (z > 0) p.setZ(i, z + (pancia || 0) * Math.max(0, 1 - x * x) * Math.max(0, 1 - y * y)); }   // la pancia davanti
    g.computeVertexNormals(); return g;
  }
  const M_ = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Bx = (w, h, d, c, x, y, z) => M_(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? lm(c) : c, x, y, z);
  const Cy = (rt, rb, h, c, x, y, z, seg, open) => M_(new THREE.CylinderGeometry(rt, rb, h, seg || 16, 1, !!open), typeof c === 'string' ? lm(c) : c, x, y, z);
  const Sp = (r, c, x, y, z, half) => M_(new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), typeof c === 'string' ? lm(c) : c, x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // un profilo girato (cupole, corone, calotte): punti [raggio, altezza] dal bordo alla cima
  const lathe = (pts, mat, seg) => { const g = new THREE.LatheGeometry(pts.map(p => V2(Math.max(0, p[0]), p[1])), window.Pittura ? Math.min(seg || 24, 24) : seg || 24); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
  // una tesa: anello da r0 a r1, con l'altezza data da f(angolo, t) (0 = davanti +z)
  function brim(r0, r1, f, mat, seg) {
    const S = window.Pittura ? Math.min(seg || 32, 12) : seg || 32, R = window.Pittura ? 2 : 4, P = [], I = [], UV = [];
    for (let i = 0; i <= R; i++) for (let j = 0; j <= S; j++) { const t = i / R, a = j / S * Math.PI * 2, r = r0 + (r1 - r0) * t; P.push(Math.sin(a) * r, f(a, t), Math.cos(a) * r); UV.push(Math.sin(a) * r * 6, Math.cos(a) * r * 6); }
    for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) { const a = i * (S + 1) + j, b = a + 1, c = a + S + 1, d = c + 1; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); return m;
  }
  // la visiera: settore di anello davanti, curvo verso il basso ai lati
  function visor(r0, len, wA, drop, mat) { return brim(r0, r0 + len, (a, t) => { const aa = Math.atan2(Math.sin(a), Math.cos(a)); return -drop * Math.pow(Math.sin(Math.min(Math.abs(aa), wA) / wA * Math.PI / 2), 2) - t * .004; }, mat, 24); }
  function cutVisor(m, wA) { const g = m.geometry, p = g.attributes.position, I = []; const idx = g.index.array; for (let k = 0; k < idx.length; k += 3) { let ok = true; for (let q = 0; q < 3; q++) { const i = idx[k + q], a = Math.atan2(p.getX(i), p.getZ(i)); if (Math.abs(a) > wA + .01) ok = false; } if (ok) I.push(idx[k], idx[k + 1], idx[k + 2]); } g.setIndex(I); return m; }
  // cappelli e copricapi. T = misure della testa (r: raggio alla fronte con i capelli; h: dalla fronte alla cima dei capelli)
  // un pannello curvo attorno alla testa (paraorecchie, falde): settore di cilindro con spessore, il bordo in basso arrotondato di `round`
  function pannello(R, a0, al, yTop, yBot, th, mat, round) {
    const n = 8, m = 4, P = [], I = [], pt = (u, v, d) => { const a = a0 + u * al, y = lerp0(yTop, yBot, v) + (v > .5 ? round * (1 - Math.sin(u * Math.PI)) * (v - .5) * 2 : 0), rr = R - d + (v > .6 ? .006 * (v - .6) : 0); return [Math.sin(a) * rr, y, Math.cos(a) * rr]; };
    for (const d of [0, th]) for (let j = 0; j <= m; j++) for (let i = 0; i <= n; i++) P.push(...pt(i / n, j / m, d));
    const L = (n + 1) * (m + 1), id = (s, i, j) => s * L + j * (n + 1) + i;
    for (let s = 0; s < 2; s++) for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) { const a = id(s, i, j), b = id(s, i + 1, j), c = id(s, i, j + 1), d = id(s, i + 1, j + 1); if (s) I.push(a, b, c, b, d, c); else I.push(a, c, b, b, c, d); }
    for (let i = 0; i < n; i++) { const a = id(0, i, m), b = id(0, i + 1, m), c = id(1, i, m), d = id(1, i + 1, m); I.push(a, b, c, b, d, c); }   // lo spessore sul bordo in basso
    for (const i of [0, n]) for (let j = 0; j < m; j++) { const a = id(0, i, j), b = id(0, i, j + 1), c = id(1, i, j), d = id(1, i, j + 1); I.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push((P[i] + P[i + 2]) * 6, P[i + 1] * 6); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return new THREE.Mesh(g, mat);
  }

  // ---------------- I PASSAMONTAGNA A MAGLIA: un guscio aderente con fori veri, e i pezzi che si combinano ----------------
  // fori: fessura | occhi | mandorla | viso; bocca (1 o 'labbra'); bordi ricamati, a palline, a punte, a ruche; corna, orecchie, aculei, cresta, gorgiera, frange
  const PMS = {
    passamontagna: { fori: 'fessura' },
    pm_righe: { fori: 'fessura', righe: '#1a1a1e', bordo: '#1a1a1e' },
    pm_punte: { fori: 'occhi', bordo: '#1a1a1e', cresta: ['#e8e0d0', '#1a1a1e'] },
    pm_orecchie: { fori: 'occhi', bocca: 1, bordo: '#1a1a1e', orecchie: 'gatto', c2: '#f4b8c8' },
    pm_diavolo: { fori: 'occhi', bocca: 'labbra', stelleOcchi: '#d8283a', spesso: 1, corna: 'diavolo', cc: ['#d8283a'], collo: '#d8283a', borchie: 1, guancia: '#6a8ad0' },
    pm_clown: { fori: 'occhi', bocca: 1, viso: '#6ac8e0', zigzag: '#e8586a', bolle: '#f0e8d4', naso: '#e8586a', guance: '#e8586a', frange: '#f0e8d4', punta: 1 },
    pm_riccio: { fori: 'occhi', bordo: '#5a0a2a', riccio: 1, becco: 1 },
    pm_corna: { fori: 'occhi', borchieOcchi: '#d8d8e0', bordo2: ['#60e030', '#f040a8'], corna: 'lunghe', cc: ['#60e030', '#f040a8'], gorgiera: ['#ff8a1e'] },
    pm_coniglio: { fori: 'occhi', bocca: 1, orecchie: 'coniglio', c2: '#f4b8b0', gorgiera: ['#f4c8c0'] },
    pm_giullare: { fori: 'mandorla', bordo: '#1a4a5a', ricamo: 1, corna: 'giullare', cc: ['#8a6ad0', '#1a4a5a'], gorgiera: ['#d8e8d8', '#5a6a8a'] },
    pm_stelle: { fori: 'viso', ruche: '#f0e08a', corna: 'giullare', cc: [null], punteCol: '#f0e08a', stelle: '#f0e08a', gorgiera: ['#f0e08a', '#c8c0b0'] },
    pm_pallini: { fori: 'viso', bordo: '#3ab048', spesso: 1, corna: 'grosse', cc: ['#d8f040'], pallini: '#f0409a', gorgiera: ['#f0409a'], rete: 1 },
  };
  function balaclava(c, T, B) {
    const st = PMS[c.acc] || PMS.passamontagna, col = c.col || '#2a2a2e', sc = T.sc || 1, h = new THREE.Group(), V = (x, y, z) => new THREE.Vector3(x, y, z);
    const rb = T.rSkull + .008, Hb = T.skTop - T.brow + .004, ey = T.eyeY - T.brow, ez = T.eyeZ - T.cz, my = ey - .072 * sc, ex = .033 * sc;
    const y0 = Math.max(T.chin - T.brow - .055, (B ? Sartoria.neckY(B) : T.chin - .04) - T.brow + .012);   // giù fino alla base del collo, non sulle spalle
    // il profilo di riserva (dove la mesh della testa non c'è, es. sotto i capelli)
    const prof = [[y0, T.rSkull * .6], [T.chin - T.brow + .01, T.rSkull * .78], [ey - .045, rb * .95], [ey + .01, rb], [.03, rb * .995], [Hb * .45, rb * .95], [Hb * .72, rb * .82], [Hb * .9, rb * .58], [Hb + .006, 0]];
    if (st.punta) prof.splice(7, 2, [Hb * .9, rb * .66], [Hb + .05, rb * .38], [Hb + .14, 0]);
    const yTop = st.punta ? prof[prof.length - 1][0] : Hb * 1.5;
    const profR = y => { y = Math.max(y0, Math.min(yTop, y)); for (let i = 1; i < prof.length; i++) if (y <= prof[i][0] + 1e-9) { const [ya, ra] = prof[i - 1], [yb, rr] = prof[i], t = (y - ya) / Math.max(1e-6, yb - ya); return i === prof.length - 1 && !st.punta ? ra * Math.sqrt(Math.max(0, 1 - t * t)) : ra + (rr - ra) * t; } return 0; };
    // la testa vera, misurata: per ogni altezza e angolo il punto più sporgente della pelle (e del collo), riempito dove ci sono conche, + lo spessore della maglia
    const NA = 72, NR = 46, RG = Array.from({ length: NR + 1 }, () => new Float32Array(NA)), rowY = j => y0 + (yTop - y0) * j / NR;
    if (B) { const add = (x, y, z) => { const j = Math.round((y - T.brow - y0) / (yTop - y0) * NR); if (j < 0 || j > NR) return; const dx = x - T.cx, dz = z - T.cz, i = ((Math.round((Math.atan2(dx, dz) + Math.PI) / (Math.PI * 2) * NA) % NA) + NA) % NA, r = Math.hypot(dx, dz); if (r > RG[j][i]) RG[j][i] = r; };
      for (let k = 0; k < B.head.length; k += 3) add(B.head[k], B.head[k + 1], B.head[k + 2]);
      for (let k = 0; k < B.part.length; k++) if (B.part[k] === 'collo') add(B.P[k * 3], B.P[k * 3 + 1], B.P[k * 3 + 2]); }
    for (let j = 0; j <= NR; j++) { const R = RG[j], y = rowY(j), pr = profR(y), M = R.slice(); for (let i = 0; i < NA; i++) { const m = Math.max(M[i], M[(i + 1) % NA], M[(i + NA - 1) % NA]); R[i] = m > pr * .6 ? Math.max(m, y > Hb * .7 ? pr * .9 : 0) : pr; }
      for (let it = 0; it < 8; it++) for (let i = 0; i < NA; i++) R[i] = Math.max(R[i], (R[(i + 1) % NA] + R[(i + NA - 1) % NA]) / 2 * .9985); }   // le conche (occhi, sotto il naso) si riempiono: la maglia ci passa sopra tesa
    for (let it = 0; it < 3; it++) for (let j = 1; j < NR; j++) { if (rowY(j) > .01) break; for (let i = 0; i < NA; i++) RG[j][i] = Math.max(RG[j][i], (RG[j - 1][i] + RG[j + 1][i]) / 2); }   // sotto la fronte: la maglia tesa tra naso, labbra e mento
    for (let j = 0; j <= NR; j++) { const y = rowY(j); if (y < Hb * .35) continue; const pr = profR(y), k = Math.min(1, (y - Hb * .35) / (Hb * .3)); for (let i = 0; i < NA; i++) RG[j][i] = Math.min(RG[j][i], pr * (1.1 - .06 * k) + .002); }   // la calotta resta tonda (niente cilindro)
    // sezioni più tonde (la testa del modello è a cubo): verso un ovale smussato largo e profondo come la sezione
    for (let j = 0; j < NR; j++) { const R = RG[j]; let W = 0, Df = 0, Db = 0; for (let i = 0; i < NA; i++) { const a = -Math.PI + (i / NA) * Math.PI * 2 + Math.PI / NA * 0, x = Math.abs(Math.sin(a)) * R[i], z = Math.cos(a) * R[i]; W = Math.max(W, x); if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); }
      for (let i = 0; i < NA; i++) { const a = (i / NA) * Math.PI * 2 - Math.PI, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), D = Math.cos(a) >= 0 ? Df : Db, e = 2.3, rs = 1 / Math.pow(Math.pow(ca / Math.max(D, .02), e) + Math.pow(sa / Math.max(W, .02), e), 1 / e); R[i] = Math.max(R[i] * .985, rs * .9); } }
    // la calotta a cupola dalla fronte in su: copre tutta la testa (anche gli spigoli del cranio a cubo) ma tonda
    if (!st.punta) { let jb = 0; for (let j = 0; j <= NR; j++) if (rowY(j) <= 0) jb = j; const R0 = new Float32Array(NA), pe = 2.35; for (let j = jb; j < NR && rowY(j) < .025; j++) for (let i = 0; i < NA; i++) R0[i] = Math.max(R0[i], RG[j][i]);
      { let W = 0, Df = 0, Db = 0; for (let i = 0; i < NA; i++) { const a = i / NA * Math.PI * 2 - Math.PI; W = Math.max(W, Math.abs(Math.sin(a)) * R0[i]); const z = Math.cos(a) * R0[i]; if (z > 0) Df = Math.max(Df, z); else Db = Math.max(Db, -z); }
        for (let i = 0; i < NA; i++) { const a = i / NA * Math.PI * 2 - Math.PI, D = Math.cos(a) >= 0 ? Df : Db; R0[i] = Math.max(R0[i] * .95, .93 / Math.sqrt((Math.cos(a) / D) ** 2 + (Math.sin(a) / W) ** 2)); } }   // la base della cupola: quasi un ovale (la pelle sotto è nascosta: si può stare stretti)
      let Hd = Hb * .85; for (let j = jb + 1; j < NR; j++) { const y = rowY(j); for (let i = 0; i < NA; i++) { const q = Math.min(.97, RG[j][i] / Math.max(1e-4, R0[i])); if (RG[j][i] > 1e-4 && y > 0 && y < Hb + .01) Hd = Math.max(Hd, y / Math.pow(1 - Math.pow(q, pe), 1 / pe)); } }
      Hd = Math.min(Math.max(Hb * .98, Math.min(Hd, Hb * 1.04)), yTop - .002);   // alta quanto il cranio, non di più
      for (let j = jb + 1; j <= NR; j++) { const y = rowY(j), f = Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, y / Hd), pe)), 1 / pe); for (let i = 0; i < NA; i++) RG[j][i] = R0[i] * f; } }   // la calotta: cupola piena ma bassa, aderente al cranio
    for (let j = 0; j <= NR; j++) for (let i = 0; i < NA; i++) RG[j][i] = RG[j][i] > 1e-4 ? RG[j][i] + .0035 : 0;
    const rA = (a, y) => { const fj = Math.max(0, Math.min(NR, (y - y0) / (yTop - y0) * NR)), j0 = Math.floor(fj), j1 = Math.min(NR, j0 + 1), u = fj - j0, fi = (((a + Math.PI) / (Math.PI * 2) * NA) % NA + NA) % NA, i0 = Math.floor(fi), i1 = (i0 + 1) % NA, v = fi - i0;
      return (RG[j0][i0] * (1 - v) + RG[j0][i1] * v) * (1 - u) + (RG[j1][i0] * (1 - v) + RG[j1][i1] * v) * u; };
    const rAt = y => rA(0, y), zSh = y => st.punta ? -Math.max(0, y - Hb * .8) * .45 : 0;
    // le spalle: niente scende sotto la loro superficie (un filo sopra, per i vestiti)
    const HM = new Map(), cell = .015, hk = (x, z) => Math.round(x / cell) + ',' + Math.round(z / cell);
    if (B) for (let k = 0; k < B.part.length; k++) if (/torso|braccia/.test(B.part[k] || '')) { const x = B.P[k * 3] - T.cx, z = B.P[k * 3 + 2] - T.cz; if (Math.abs(x) > .4 || Math.abs(z) > .35) continue; const kk = hk(x, z), y = B.P[k * 3 + 1] - T.brow; if (!(HM.get(kk) >= y)) HM.set(kk, y); }
    const floorAt = (x, z) => { let m = -9; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const v = HM.get((Math.round(x / cell) + dx) + ',' + (Math.round(z / cell) + dz)); if (v !== undefined && v > m) m = v; } return m + .016; };
    const lift = p => { const f = floorAt(p.x, p.z); if (p.y < f) p.y = f; return p; };
    const P = (a, y, off) => { const r = rA(a, y) + (off || 0); return V(Math.sin(a) * r, y, Math.cos(a) * r + zSh(y)); };
    const N = (a, y) => P(a, y, .01).sub(P(a, y, 0)).normalize();
    const aOf = (X, y) => Math.asin(Math.max(-1, Math.min(1, X / Math.max(.02, rAt(y)))));   // dal davanti (X metri a destra/sinistra) all'angolo
    const knit = cc => lana(cc, 'maglia'), main = st.righe ? FM('righe', col, st.righe, st.righe) : knit(col);
    // i fori
    const faceY = ey - .03 * sc, inHole = (a, y) => { if (Math.cos(a) < .2) return false; const X = Math.sin(a) * rAt(y);
      if (st.fori === 'fessura') return Math.abs(y - ey) < .021 && Math.abs(X) < .064;
      if (st.fori === 'viso') return (X / (.072 * sc)) ** 2 + ((y - faceY) / (.09 * sc)) ** 2 < 1;
      for (const s of [-1, 1]) { const dx = X - s * ex, dy = y - ey; if (st.fori === 'mandorla' ? Math.abs(dx) / .023 + Math.abs(dy) / .021 < 1 : (dx / .02) ** 2 + (dy / .0135) ** 2 < 1) return true; }
      return !!st.bocca && (X / .025) ** 2 + ((y - my) / .012) ** 2 < 1; };
    // il guscio: griglia fitta solo qui (i fori devono essere tondi)
    const shell = (filt, off, mat) => { const na = 72, nr = 46, Pp = [], U = [], I = [];
      for (let j = 0; j <= nr; j++) { const y = y0 + (yTop - y0) * j / nr; for (let i = 0; i <= na; i++) { const a = -Math.PI + i / na * Math.PI * 2, p = lift(P(a, y, off)); Pp.push(p.x, p.y, p.z); U.push(a * rAt(.03) / .042, y / .04); } }
      for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const a = -Math.PI + (i + .5) / na * Math.PI * 2, y = y0 + (yTop - y0) * (j + .5) / nr; if (!filt(a, y)) continue; const q = j * (na + 1) + i, r2 = q + na + 1; I.push(q, r2, q + 1, q + 1, r2, r2 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
    h.add(shell((a, y) => !inHole(a, y), 0, main), shell((a, y) => !inHole(a, y), .0016, peluria(col, 3, 3)));   // un velo di peluria fine
    const faceOval = (a, y) => Math.cos(a) > 0 && (Math.sin(a) * rAt(y) / .085) ** 2 + ((y - (ey - .025)) / .1) ** 2 < 1;
    if (st.viso) h.add(shell((a, y) => faceOval(a, y) && !inHole(a, y), .0025, knit(st.viso)));
    // i bordi: curve chiuse sul guscio
    const loop = (fn, n) => { const pts = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2, [X, Y] = fn(t); pts.push(P(aOf(X, Y), Y, .003)); } return pts; };
    const tube = (pts, r, mat) => h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), pts.length * 2, r, 5, true), mat));
    const sp = (t, e) => Math.sign(t) * Math.pow(Math.abs(t), e);
    const eyeLoop = s => loop(t => st.fori === 'mandorla' ? [s * ex + .025 * sp(Math.cos(t), 1.7), ey + .023 * sp(Math.sin(t), 1.7)] : [s * ex + .022 * Math.cos(t), ey + .0155 * Math.sin(t)], 24);
    const loops = []; if (st.fori === 'fessura') loops.push(loop(t => [.067 * sp(Math.cos(t), .35), ey + .024 * sp(Math.sin(t), .35)], 28));
    else if (st.fori === 'viso') loops.push(loop(t => [.075 * sc * Math.cos(t), faceY + .093 * sc * Math.sin(t)], 32));
    else loops.push(eyeLoop(-1), eyeLoop(1));
    const mouth = st.bocca ? loop(t => [.028 * Math.cos(t), my + .0145 * Math.sin(t)], 22) : null;
    const rimR = st.spesso ? .0085 : .0055;
    loops.forEach((L, i) => { const cc = st.bordo2 ? st.bordo2[i % 2] : st.bordo; if (cc) tube(L, rimR, knit(cc)); });
    // stelle ricamate attorno agli occhi (diavolo): un cordone spesso a stella a cinque punte
    if (st.stelleOcchi) for (const sx of [-1, 1]) { const L = loop(t => { const k = Math.round(t / (Math.PI * 2) * 10), rr = (k % 2 ? .021 : .048) * sc, q = t + Math.PI / 2; return [sx * (ex + .003) + Math.cos(q) * rr, ey + .003 + Math.sin(q) * rr * .92]; }, 10); tube(L, .0055, knit(st.stelleOcchi)); }
    if (mouth) { if (st.bocca === 'labbra') { tube(mouth, .012, knit(st.cc ? st.cc[0] : '#d8283a')); } else if (st.bordo) tube(mouth, rimR, knit(st.bordo)); }
    if (st.bolle) [...loops, ...(mouth ? [mouth] : [])].forEach(L => L.forEach((p, k) => { if (k % 2) return; h.add(Sp(.0068, knit(st.bolle), p.x, p.y, p.z)); }));
    if (st.ruche) loops.forEach(L => L.forEach((p, k) => { const s2 = Sp(.012, knit(st.ruche), p.x, p.y, p.z + .002); s2.scale.set(1, 1, .7); h.add(s2); }));
    // le borchie attorno agli occhi (punte d'argento che escono dal bordo)
    if (st.borchieOcchi) loops.forEach((L, i) => L.forEach((p, k) => { if (k % 3) return; const c0 = i ? V(ex, ey, 0) : V(-ex, ey, 0), d = p.clone().sub(P(aOf(c0.x, ey), ey, .003)).normalize(), cn = new THREE.Mesh(new THREE.ConeGeometry(.0035, .016, 5), lm(st.borchieOcchi)); cn.position.copy(p).addScaledVector(d, .008); cn.quaternion.setFromUnitVectors(V(0, 1, 0), d); h.add(cn); }));
    // il ricamo a rametti sopra e sotto gli occhi (giullare)
    if (st.ricamo) for (const s of [-1, 1]) for (const dir of [1, -1]) { const x0 = s * ex, y1 = ey + dir * .023, pts = [P(aOf(x0, y1), y1, .003), P(aOf(x0 + s * .004, y1 + dir * .02), y1 + dir * .02, .003), P(aOf(x0 - s * .002, y1 + dir * .04), y1 + dir * .04, .003)];
      h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, .003, 4), knit(st.bordo))); for (const k of [.012, .026]) for (const sd of [-1, 1]) { const yy = y1 + dir * k, q0 = P(aOf(x0, yy), yy, .003), q1 = P(aOf(x0 + sd * .008, yy + dir * .006), yy + dir * .006, .003); h.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(q0, q1), 1, .0022, 4), knit(st.bordo))); } }
    // la cornice a zig-zag attorno al viso (clown), naso, guance
    const tri = (p0, p1, p2, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...p0.toArray(), ...p1.toArray(), ...p2.toArray()], 3)); g.computeVertexNormals(); h.add(new THREE.Mesh(g, mat)); };
    // la cornice a punte attorno al viso (pagliaccio): piramidine lavorate a maglia che escono dal bordo
    if (st.zigzag) for (let k = 0; k < 22; k++) { const t = k / 22 * Math.PI * 2, X = .088 * sc * Math.cos(t), Y = ey - .025 + .104 * sc * Math.sin(t); if (Math.abs(X) > .15) continue; const a = aOf(X, Y), p = P(a, Y, .003), n = N(a, Y), out = V(Math.cos(t), Math.sin(t), 0).projectOnPlane(n).normalize(), d = out.clone().multiplyScalar(.7).addScaledVector(n, .5).normalize();
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(.012, .026, 4), knit(st.zigzag)); pyr.position.copy(p).addScaledVector(d, .011); pyr.quaternion.setFromUnitVectors(V(0, 1, 0), d); h.add(pyr); const kn = Sp(.006, knit(st.zigzag), p.x, p.y, p.z); h.add(kn); }
    if (st.naso) { const p = P(0, ey - .036, .004), n = N(0, ey - .036), cn = new THREE.Mesh(new THREE.ConeGeometry(.016, .036, 8), knit(st.naso)); cn.position.copy(p).addScaledVector(n, .015); cn.quaternion.setFromUnitVectors(V(0, 1, 0), n.clone().add(V(0, -.3, 0)).normalize()); h.add(cn); }   // il naso a punta, lavorato
    if (st.guance || st.guancia) for (const s of st.guance ? [-1, 1] : [-1]) { const y = ey - .045, a = aOf(s * .058, y), p = P(a, y, .0035), d = Cy(st.guance ? .013 : .019, st.guance ? .013 : .019, .003, knit(st.guance || st.guancia), p.x, p.y, p.z, 12); d.quaternion.setFromUnitVectors(V(0, 1, 0), N(a, y)); h.add(d); }
    // la rete sul viso aperto
    if (st.rete) { const L = []; for (let k = -4; k <= 4; k++) { for (let q = 0; q < 10; q++) { const ya = faceY + (q / 10 - .5) * .17 * sc, yb = faceY + ((q + 1) / 10 - .5) * .17 * sc, X = k * .016 * sc; if (inHole(aOf(X, ya), ya) && inHole(aOf(X, yb), yb)) L.push(P(aOf(X, ya), ya, .004), P(aOf(X, yb), yb, .004)); }
        const Y = faceY + k * .018 * sc; for (let q = 0; q < 10; q++) { const xa = (q / 10 - .5) * .15 * sc, xb = ((q + 1) / 10 - .5) * .15 * sc; if (inHole(aOf(xa, Y), Y) && inHole(aOf(xb, Y), Y)) L.push(P(aOf(xa, Y), Y, .004), P(aOf(xb, Y), Y, .004)); } }
      const g = new THREE.BufferGeometry().setFromPoints(L); h.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#e8e8e4' }))); }
    // corna: un tubo che si assottiglia lungo una curva, a fasce di colore
    const corno = (pts, r0, bands, tipCol) => { const cu = new THREE.CatmullRomCurve3(pts), nb = bands.length;
      for (let b = 0; b < nb; b++) { const t0 = b / nb, t1 = (b + 1) / nb, n = 6, ring = 12, Pp = [], I = [], UV = [];
        for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, c0 = cu.getPointAt(t), tg = cu.getTangentAt(t), up = Math.abs(tg.y) > .9 ? V(1, 0, 0) : V(0, 1, 0), nn = V().crossVectors(tg, up).normalize(), bb = V().crossVectors(nn, tg).normalize(), r = r0 * Math.pow(1 - t, .8) + .003;
          for (let k = 0; k <= ring; k++) { const q = k / ring * Math.PI * 2, p = c0.clone().addScaledVector(nn, Math.cos(q) * r).addScaledVector(bb, Math.sin(q) * r); Pp.push(p.x, p.y, p.z); UV.push(k / ring * Math.PI * 2 * r0 / .042, t * cu.getLength() / .04); } }
        for (let i = 0; i < n; i++) for (let k = 0; k < ring; k++) { const q = i * (ring + 1) + k, r2 = q + ring + 1; I.push(q, q + 1, r2, q + 1, r2 + 1, r2); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setIndex(I); g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
        const cc = tipCol && b === nb - 1 ? tipCol : bands[b] || col; h.add(new THREE.Mesh(g, knit(cc))); }
      return cu; };
    if (st.corna) for (const s of [-1, 1]) { const out = V(s, 0, 0), up = V(0, 1, 0);
      if (st.corna === 'diavolo') { const b0 = P(s * 1.05, Hb * .62, -.004); corno([b0, b0.clone().addScaledVector(out, .03).addScaledVector(up, .035), b0.clone().addScaledVector(out, .045).addScaledVector(up, .08).add(V(0, 0, .01)), b0.clone().addScaledVector(out, .02).addScaledVector(up, .125).add(V(0, 0, .02))], .027, [st.cc[0]]); }
      if (st.corna === 'lunghe') { const b0 = P(s * 1.15, Hb * .58, -.004), d = V(s * .62, .78, .05).normalize(), cu = corno([b0, b0.clone().addScaledVector(d, .08), b0.clone().addScaledVector(d, .16), b0.clone().addScaledVector(d, .2).add(V(s * .02, .01, 0))], .032, [st.cc[0], st.cc[1], st.cc[1]]);
        for (let k = 0; k < 9; k++) { const q = k / 9 * Math.PI * 2, c0 = cu.getPointAt(.12), tg = cu.getTangentAt(.12), nn = V().crossVectors(tg, V(0, 0, 1)).normalize(), bb = V().crossVectors(nn, tg).normalize(), p = c0.clone().addScaledVector(nn, Math.cos(q) * .036).addScaledVector(bb, Math.sin(q) * .036); h.add(Sp(.011, knit(k % 2 ? st.cc[1] : st.cc[0]), p.x, p.y, p.z)); } }
      if (st.corna === 'giullare') { const b0 = P(s * 1.4, Hb * .55, -.006), cu = corno([b0, b0.clone().addScaledVector(out, .07).addScaledVector(up, .05), b0.clone().addScaledVector(out, .15).addScaledVector(up, .03), b0.clone().addScaledVector(out, .2).addScaledVector(up, -.06), b0.clone().addScaledVector(out, .21).addScaledVector(up, -.17).add(V(0, 0, .02))], .045, st.cc.length > 1 ? [st.cc[0], st.cc[1], st.cc[0], st.cc[1], st.cc[0]] : [null, null, null], st.punteCol);
        if (st.stelle) { const sh0 = new THREE.Shape(); for (let k = 0; k < 10; k++) { const q = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .014 : .032; k ? sh0.lineTo(Math.cos(q) * rr, Math.sin(q) * rr) : sh0.moveTo(Math.cos(q) * rr, Math.sin(q) * rr); } const sg = new THREE.ExtrudeGeometry(sh0, { depth: .014, bevelEnabled: false }); sg.translate(0, 0, -.007);
          const m = new THREE.Mesh(sg, knit(st.stelle)), tp = cu.getPointAt(1); m.position.copy(tp).add(V(0, -.025, 0)); m.rotation.y = s * .4; h.add(m); } }
      if (st.corna === 'grosse') { const b0 = P(s * 1.35, Hb * .42, -.006), cu = corno([b0, b0.clone().addScaledVector(out, .1).addScaledVector(up, .02), b0.clone().addScaledVector(out, .19).addScaledVector(up, .07), b0.clone().addScaledVector(out, .24).addScaledVector(up, .16)], .055, [st.cc[0]]);
        if (st.pallini) for (let k = 0; k < 14; k++) { const t = .08 + k / 14 * .8, c0 = cu.getPointAt(t), tg = cu.getTangentAt(t), nn = V().crossVectors(tg, V(0, 0, 1)).normalize(), bb = V().crossVectors(nn, tg).normalize(), q = k * 2.4, r = .055 * Math.pow(1 - t, .8) + .003, p = c0.clone().addScaledVector(nn, Math.cos(q) * r).addScaledVector(bb, Math.sin(q) * r); h.add(Sp(.011, knit(st.pallini), p.x, p.y, p.z)); } } }
    if (st.pallini) for (let k = 0; k < 7; k++) { const a = -.9 + k * .3, y = Hb * .78, p = P(a, y, .006); h.add(Sp(.011, knit(k % 2 ? st.pallini : '#f0e040'), p.x, p.y, p.z)); }
    // orecchie modellate: una foglia di maglia con lo spessore, incavata davanti, base stretta che entra nella testa, il dentro di un altro colore
    const orecchio = (len, wid, th, cup, bend, tri, cOut, cIn) => { const g0 = new THREE.Group(), nu = 10, nt = 12;
      const W = t => tri ? wid * (1 - t) * Math.min(1, t / .12 + .55) : wid * Math.pow(Math.sin(Math.PI * (.12 + .88 * t)), .6) * (.7 + .3 * t), Z = (u, t) => -bend * Math.pow(t * len, 2) * 3;
      const surf = (side, uMax, t0, t1, lift) => { const Pp = [], UV = [], I = []; for (let j = 0; j <= nt; j++) { const t = t0 + (t1 - t0) * j / nt, w = W(t); for (let i = 0; i <= nu; i++) { const u = (i / nu * 2 - 1) * uMax, bul = Math.sqrt(Math.max(0, 1 - u * u)), z = side * th / 2 * bul * (1 - .5 * t) - cup * (1 - u * u) * Math.sin(Math.PI * t) + Z(u, t) + (lift || 0); Pp.push(u * w, t * len, z); UV.push(u * w / .042, t * len / .04); } }
        for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) { const q = j * (nu + 1) + i, r2 = q + nu + 1; if (side > 0) I.push(q, q + 1, r2, q + 1, r2 + 1, r2); else I.push(q, r2, q + 1, q + 1, r2, r2 + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); return g; };
      g0.add(new THREE.Mesh(surf(1, 1, 0, 1), knit(cOut)), new THREE.Mesh(surf(-1, 1, 0, 1), knit(cOut)), new THREE.Mesh(surf(1, .62, .1, .86, .0018), knit(cIn))); return g0; };
    if (st.orecchie) for (const s of [-1, 1]) {
      const coni = st.orecchie === 'coniglio', a = s * (coni ? .42 : .72), y = Hb * (coni ? .9 : .8), p = P(a, y, -.006), e = coni ? orecchio(.16, .034, .016, .01, .35, false, col, st.c2) : orecchio(.065, .042, .014, .006, .1, true, col, st.c2);
      e.position.copy(p); e.rotation.set(coni ? -.22 : -.1, s * (coni ? .25 : .5), -s * (coni ? .16 : .38), 'YXZ'); h.add(e); }
    // cresta di punte (dalla fronte alla nuca) e aculei da riccio
    if (st.cresta) for (let i = 0; i < 7; i++) { const t = i / 6, ang = .55 + t * 2.2, y = Math.sin(ang) * Hb * .98, a = Math.cos(ang) > 0 ? 0 : Math.PI, p = P(a, y, 0), n = p.clone().sub(V(0, ey * .5, 0)).normalize(), L = .045 + .03 * Math.sin(t * Math.PI);
      corno([p.clone().addScaledVector(n, -.004), p.clone().addScaledVector(n, L * .55).add(V(0, 0, -L * .12)), p.clone().addScaledVector(n, L).add(V(0, 0, -L * .3))], L * .3, [st.cresta[i % 2]]); }
    if (st.riccio) { const nS = 44, c0 = V(0, ey - .01, 0); for (let i = 0; i < nS; i++) { const yy = 1 - (i + .5) / nS * 1.5, rr = Math.sqrt(Math.max(0, 1 - yy * yy)), th = i * 2.39996, dx = Math.cos(th) * rr, dz = Math.sin(th) * rr;
        if (yy < -.45 || (dz > .45 && yy < .45 && Math.abs(dx) < .75)) continue; const a = Math.atan2(dx, dz), y = yy > 0 ? ey + yy * (Hb - ey) : ey + yy * (ey - y0 - .03), p = P(a, y, 0), n = p.clone().sub(c0).normalize(), L = .055 + .035 * ((i * 37 % 11) / 11);
        const sd = V(-n.z, 0, n.x).multiplyScalar(.12 * ((i % 3) - 1)); corno([p.clone().addScaledVector(n, -.004), p.clone().addScaledVector(n, L * .5).add(sd.clone().multiplyScalar(L * .3)), p.clone().addScaledVector(n, L).add(sd.clone().multiplyScalar(L))], .017, [null]); }   // aculei di maglia, appena curvi
      const pn = P(0, ey - .03, .004), nb = Sp(.016, main, pn.x, pn.y, pn.z + .006); h.add(nb); }
    if (st.becco) { const p = P(0, ey - .05, -.004); corno([p, p.clone().add(V(0, -.035, .04)), p.clone().add(V(0, -.09, .05))], .028, [null]); }   // il becco di maglia che scende
    // al collo: bordo, borchie, gorgiera a ruche, frange coi pompon
    if (st.collo) { const L = []; for (let k = 0; k < 24; k++) L.push(lift(P(k / 24 * Math.PI * 2, y0 + .008, .004))); tube(L, .008, knit(st.collo)); }
    if (st.borchie) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + .3, p = lift(P(a, y0 + .025, .004)), n = V(Math.sin(a), -.15, Math.cos(a)).normalize(), cn = new THREE.Mesh(new THREE.ConeGeometry(.007, .055, 6), lm('#c8c8cc')); cn.position.copy(p).addScaledVector(n, .027); cn.quaternion.setFromUnitVectors(V(0, 1, 0), n); h.add(cn); }
    // la gorgiera a ruche: una striscia arricciata a fisarmonica (pieghe fitte che si aprono in fuori) col bordo arrotolato all'uncinetto
    if (st.gorgiera) st.gorgiera.forEach((gc, li) => { const na = 240, nr = 7, nf = 30 + li * 6, yc = y0 + .012 - li * .022, rin = rAt(y0) + .003 + li * .006, w = .04 + li * .022, Pp = [], I = [], uv = [], edge = [];
      for (let j = 0; j <= nr; j++) for (let i = 0; i <= na; i++) { const a = i / na * Math.PI * 2, t = j / nr, f = Math.sin(a * nf + li), amp = Math.pow(t, 1.3), r = rin + w * t + .012 * amp * f, yy = yc - .03 * t * t + .016 * amp * Math.cos(a * nf + li) * .4 - .005 * amp * Math.abs(f);
        const q = lift(V(Math.sin(a) * r, yy, Math.cos(a) * r + zSh(y0))); Pp.push(q.x, q.y, q.z); uv.push(i / na * Math.PI * 2 * rin / .03, t * w / .03); if (j === nr && i % 2 === 0) edge.push(q); }
      for (let j = 0; j < nr; j++) for (let i = 0; i < na; i++) { const q = j * (na + 1) + i, r2 = q + na + 1; I.push(q, r2, q + 1, q + 1, r2, r2 + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(I); g.computeVertexNormals(); h.add(new THREE.Mesh(g, knit(gc)));
      edge.pop(); tube(edge, .0045, knit(st.gorgieraBordo || sh(gc, .85))); });   // il bordo arrotolato
    if (st.frange) for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2, p = P(a, y0 + .004, .006); if (floorAt(p.x, p.z) > p.y - .065) continue; h.add(Cy(.004, .004, .05, knit(st.frange), p.x, p.y - .025, p.z, 5), Sp(.012, knit(st.frange), p.x, p.y - .055, p.z)); }
    return h;
  }
  function headAcc(kind, c, T, k) {
    const h = new THREE.Group(), r = T.r * (1 + k * .04) + .004, H = Math.max(.09, T.top - T.brow) + .012 + k * .006;
    switch (kind) {
      case 'beanie': {   // berretto di lana: calotta a costine, risvolto, a volte il pon pon
        const mt = lana(c, 'costine', 30, 3); h.add(lathe([[r + .004, -.02], [r + .006, .03], [r * .97, H * .62], [r * .72, H * .92], [r * .35, H + .015], [0, H + .02]], mt));
        h.add(lathe([[r + .012, -.025], [r + .016, -.005], [r + .016, .025], [r + .01, .03]], lana(sh(c, .9), 'costine', 34, 1)));
        if (k === 0 && (hsh(c) & 1)) { const pp = M_(new THREE.SphereGeometry(.035, 10, 8), FM('pelo', sh(c, 1.1)), 0, H + .04, 0); h.add(pp); }
        break; }
      case 'flat': {   // coppola: cupola bassa che scende in avanti, visierina corta cucita sotto
        const mt = FM('lana', c, sh(c, 1.3), sh(c, .6)), cr = lathe([[r + .006, -.005], [r + .012, .025], [r * 1.0, H * .55], [r * .7, H * .78], [0, H * .84]], mt);
        cr.geometry.scale(1, 1, 1.12); const p = cr.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0) p.setY(i, p.getY(i) - z * .32 * (p.getY(i) / H)); } p.needsUpdate = true; cr.geometry.computeVertexNormals();
        cr.position.z = .012; h.add(cr, cutVisor(visor(r * 1.0, .045, 1.05, .006, FM('lana', sh(c, .9), sh(c, 1.2), sh(c, .5))), 1.05));
        h.children[1].position.set(0, -.004, .01); h.add(Cy(.009, .009, .006, sh(c, .8), 0, H * .82, .015, 8));
        break; }
      case 'fedora': {   // cappello di feltro: corona con la piega in cima e le prese davanti, nastro, tesa che si alza dietro
        const mt = FM('feltro', c), cr = lathe([[r + .006, -.005], [r + .004, .05], [r * .93, H * .9], [r * .82, H + .03], [r * .45, H + .04], [r * .15, H + .02], [0, H + .01]], mt, 28);
        const p = cr.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > H * .55 && z > 0) { const q = (y - H * .55) / (H * .6); p.setX(i, x * (1 - .16 * q * Math.min(1, z / r * 1.5))); } if (y > H * .9) p.setY(i, y - .012 * Math.max(0, 1 - Math.abs(x) / (r * .3))); }
        p.needsUpdate = true; cr.geometry.computeVertexNormals(); cr.scale.set(1, 1, 1.08);
        const band = lathe([[r + .009, -.004], [r + .009, .024]], FM('raso', '#16121a'), 28); band.scale.set(1, 1, 1.08);
        const bm = brim(r + .004, r + .07, (a, t) => { const ca = Math.cos(a); return -.004 + t * (ca > 0 ? -.012 * ca : .018 * -ca) + t * t * .012 * Math.pow(Math.sin(a), 2); }, mt, 40); bm.scale.set(1, 1, 1.08);
        h.add(cr, band, bm); break; }
      case 'ushanka': {   // colbacco: cupola di pelle, fascia di pelo, paraorecchie veri (pannelli curvi di pelo che scendono ai lati, coi lacci), la falda davanti alzata
        const fm = lana(c, 'pelo', 14, 3), dome = lathe([[r + .018, -.01], [r + .02, .04], [r * .96, H * .8], [r * .6, H + .02], [0, H + .035]], FM('scamosciato', sh(c, .8)));
        const band = lathe([[r + .026, -.028], [r + .032, .0], [r + .03, .045], [r + .02, .05]], fm);
        const flapL = pannello(r + .03, Math.PI / 2 - .55, 1.1, .0, -.115, .014, fm, .045), flapR = pannello(r + .03, -Math.PI / 2 - .55, 1.1, .0, -.115, .014, fm, .045);
        const back = pannello(r + .03, Math.PI - .75, 1.5, .0, -.05, .012, fm, .02);   // dietro la nuca
        const front = pannello(r + .036, -.8, 1.6, .075, .02, .014, fm, 0); front.rotation.x = -.18;   // la falda davanti, alzata
        for (const sx of [-1, 1]) { const tie = Cy(.003, .003, .06, sh(c, .5), sx * (r + .036), -.14, .01, 4); h.add(tie); }
        h.add(dome, band, flapL, flapR, back, front); break; }
      case 'scarf': {   // fazzoletto da testa: aderente, copre i capelli, nodo sotto il mento, la punta dietro
        const rs = Math.min(r, T.rSkull + .03), mt = FM('paisley', c, sh(c, 1.5), '#e8d8a0'), H2 = Math.min(H, T.skTop - T.brow + .03), dome = lathe([[rs + .006, -.07], [rs + .01, -.01], [rs + .006, H2 * .5], [rs * .7, H2 * .9], [0, H2 + .006]], mt);
        dome.geometry.scale(1, 1, 1.08); const p = dome.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > r * .4 && p.getY(i) < .0) p.setZ(i, p.getZ(i) * .6); p.needsUpdate = true; dome.geometry.computeVertexNormals();
        const tail = new THREE.Mesh(new THREE.ConeGeometry(.06, .13, 3), mt); tail.position.set(0, -.1, -(r + .02)); tail.rotation.x = Math.PI + .25; tail.scale.z = .35;
        const knot = Sp(.022, mt, 0, T.chin - T.brow + .015, T.front - T.cz - .03); h.add(dome, tail, knot); break; }
      case 'casco': {   // casco jet anni '80: calotta lucida aperta davanti, riga, bordo imbottito, cinturino
        const R = r + .008, mt = FM('gomma', c, c, c, 1), top = M_(new THREE.SphereGeometry(R, 24, 14, 0, Math.PI * 2, 0, 1.15), mt);
        const side = M_(new THREE.SphereGeometry(R, 24, 8, Math.PI * .27, Math.PI * 1.46, 1.15, .95), mt); side.rotation.y = Math.PI;
        const stripe = M_(new THREE.SphereGeometry(R + .002, 4, 12, -.1, .2, 0, 1.6), lm('#ece8dc')); stripe.rotation.y = Math.PI / 2;
        const rim = M_(new THREE.TorusGeometry(R * .97, .012, 6, 28, Math.PI * 1.45), lm('#141416')); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI * .275 + Math.PI; rim.position.y = -R * .55;
        [top, side, stripe].forEach(o => { o.position.y = H * .3; o.scale.set(1, 1.02, 1.08); }); rim.position.y += H * .3; h.add(top, side, stripe); break; }
      case 'elmetto': {   // elmetto: calotta, bordo sporgente, telo, sottogola
        const mt = FM('ripstop', c, sh(c, .7), sh(c, 1.2)), R = r + .028, d = lathe([[R + .02, .0], [R + .02, .008], [R, .015], [R * .98, H * .5], [R * .78, H * .85], [R * .4, H + .025], [0, H + .03]], mt, 28);
        h.add(d); const st = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .006, 4, 20, Math.PI), lm('#2a2418')); st.rotation.y = Math.PI / 2; st.rotation.z = Math.PI; st.position.set(0, -.02, -.01); st.scale.set(1, 1.3, 1); h.add(st); break; }
      case 'bandana': {   // bandana tirata su: copre naso e bocca, annodata dietro, la punta che scende sul collo davanti
        const mt = FM('paisley', c, '#ece4d0', sh(c, .5)), sc = T.sc || 1, yN = T.eyeY - T.brow - .028 * sc, yC = T.chin - T.brow - .02, czL = (T.eyeZ - T.cz) - .1 * sc;
        const band = lathe([[.088 * sc, yC], [.094 * sc, (yC + yN) / 2], [.09 * sc, yN]], mt, 16); band.scale.set(1, 1, 1.18); band.position.z = czL; h.add(band);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(.075 * sc, .1, 3), mt); tip.rotation.x = Math.PI; tip.rotation.y = Math.PI; tip.scale.z = .25; tip.position.set(0, yC - .035, czL + .1 * sc); tip.rotation.x = Math.PI + .25; h.add(tip);
        const knot = Sp(.016, mt, 0, yN - .01, czL - .1 * sc); h.add(knot); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.018, .06, 3), mt); e.position.set(sx * .02, yN - .04, czL - .108 * sc); e.rotation.z = Math.PI + sx * .4; e.scale.z = .3; h.add(e); }
        break; }
      case 'antigas': {   // maschera antigas: facciale di gomma, due oculari, filtro a costole, cinghie
        const mt = FM('gomma', c), fz = T.front - T.cz, face = M_(new THREE.SphereGeometry(.105, 18, 12, -1.2, 2.4, .5, 2.0), mt); face.scale.set(1, 1.15, .7); face.position.set(0, T.eyeY - T.brow - .05, fz - .055);
        const lens = (x) => { const L = Cy(.028, .028, .012, '#1a2a2a', x, T.eyeY - T.brow + .005, fz + .015, 14); L.rotation.x = Math.PI / 2; const rr = M_(new THREE.TorusGeometry(.028, .006, 6, 16), lm('#3a3a36'), x, T.eyeY - T.brow + .005, fz + .02); return [L, rr]; };
        const fil = Cy(.035, .04, .06, '#4a4e40', 0, T.eyeY - T.brow - .11, fz + .03, 14); fil.rotation.x = Math.PI / 2 - .5; for (let i = 0; i < 4; i++) { const ri = M_(new THREE.TorusGeometry(.038, .004, 4, 14), lm('#2a2c26')); ri.position.copy(fil.position); ri.rotation.copy(fil.rotation); ri.rotation.x += Math.PI / 2; ri.translateZ(-.022 + i * .015); h.add(ri); }
        const strap = lathe([[r + .004, -.03], [r + .004, -.01]], lm('#1e1e1c')); h.add(face, ...lens(-.042), ...lens(.042), fil, strap); break; }
    }
    return h;
  }
  const hsh = s => { let h = 7; for (const ch of String(s)) h = h * 31 + ch.charCodeAt(0) | 0; return h >>> 0; };
  function headAcc2(kind, c, T, k) {   // gli altri copricapi
    const h = new THREE.Group(), r = T.r * (1 + k * .04) + .004, H = Math.max(.09, T.top - T.brow) + .012 + k * .006;
    if (kind === 'cap') {   // cappellino da baseball: sei spicchi, visiera curva, bottone, il retro con la regolazione
      const mt = FM('cotone', c), d = lathe([[r + .005, -.008], [r + .006, .03], [r * .95, H * .62], [r * .68, H * .9], [0, H + .012]], mt, 30);
      const sm = lathe([[r + .0065, .0], [r + .0065, .004]], lm(sh(c, .7)), 30);
      for (let i = 0; i < 6; i++) { const s0 = M_(new THREE.TorusGeometry(r * .82, .0018, 3, 16, Math.PI * .5), lm(sh(c, .65))); s0.rotation.y = i * Math.PI / 3; s0.rotation.z = Math.PI / 2; s0.position.y = H * .1; s0.scale.set(1.16, 1, 1); h.add(s0); }
      const v = cutVisor(visor(r * .98, .075, 1.2, .02, FM('cotone', sh(c, .92))), 1.2); v.position.set(0, -.002, .0);
      h.add(d, sm, v, Cy(.01, .012, .008, sh(c, .8), 0, H + .012, 0, 10)); return h; }
    if (kind === 'snapback') {   // cappellino a visiera piatta: corona alta e dritta davanti, visiera piatta col bollino, la chiusura dietro
      const mt = FM('cotone', c), d = lathe([[r + .005, -.008], [r + .008, .04], [r * .98, H * .7], [r * .74, H * .98], [0, H + .02]], mt, 30); d.scale.set(1, 1, 1.04);
      const v = cutVisor(visor(r * .98, .085, 1.25, .001, FM('cotone', sh(c, .85))), 1.25), stk = Cy(.012, .012, .001, '#d8c050', 0, .003, r + .045, 12);
      const back = Bx(.05, .015, .006, '#1a1a1c', 0, .01, -r - .006), btn = Cy(.01, .012, .008, sh(c, .8), 0, H + .02, 0, 10);
      const logo = Bx(.06, .03, .004, lm(/^#[0-3]/.test(c) ? '#e8e4dc' : '#1a1a1c'), 0, H * .45, r + .006); logo.rotation.x = -.18; h.add(d, v, stk, back, btn, logo); return h; }
    if (kind === 'docker') {   // berretto corto da pescatore: alto sopra le orecchie, risvolto largo a costine
      const mt = lana(c, 'costine', 30, 2), d = lathe([[r + .004, .03], [r + .005, .05], [r * .96, H * .64], [r * .7, H * .92], [r * .3, H + .012], [0, H + .016]], mt, 28), cuff = lathe([[r + .012, .026], [r + .015, .045], [r + .015, .068], [r + .009, .072]], lana(sh(c, .9), 'costine', 34, 1), 28);
      h.add(d, cuff, Bx(.03, .016, .004, '#e8e4dc', 0, .05, r + .016)); return h; }
    if (kind === 'basco') {   // basco: disco morbido inclinato, il picciolo
      const mt = FM('feltro', c), b = lathe([[r + .004, -.004], [r + .03, .025], [r + .035, .045], [r * .6, H * .9], [0, H * .92]], mt, 28); b.rotation.z = -.18; b.position.x = .015;
      h.add(b, Cy(.004, .006, .015, sh(c, .8), .01, H * .95, 0, 6)); return h; }
    if (kind === 'fascia') { const rs = T.rSkull + .01, y0 = T.eyeY - T.brow + .05; h.add(lathe([[rs, y0], [rs + .006, y0 + .015], [rs, y0 + .03]], FM('spugna', c), 28)); return h; }   // sul cranio, sopra la fronte (non sulla capigliatura)
    if (kind === 'police') {   // berretto della Guardia: corona rigida più larga in cima, fascia chiara, visiera nera lucida, fregio
      const mt = FM('panno', c), cr = lathe([[r + .006, -.002], [r + .008, .04], [r + .03, H * .85], [r + .02, H * .92], [0, H * .9]], mt, 28);
      const band = lathe([[r + .009, -.002], [r + .011, .03]], FM('nylon', '#d8d0b0'), 28), v = cutVisor(visor(r * 1.0, .06, 1.1, .015, lm('#0c0c0e')), 1.1);
      const badge = Cy(.014, .014, .004, '#c8a040', 0, .045, r + .012, 8); badge.rotation.x = Math.PI / 2; h.add(cr, band, v, badge); return h; }
    if (kind === 'paglia') {   // cappello di paglia: corona, nastro, tesa larga e morbida
      const mt = FM('tela', '#d8c08a', '#b89a5a', '#e8d8a8'), cr = lathe([[r + .006, -.004], [r + .004, .05], [r * .85, H * .95], [0, H + .01]], mt, 28);
      const band = lathe([[r + .009, -.002], [r + .009, .022]], lm(c), 28), bm = brim(r + .004, r + .17, (a, t) => -.006 - t * t * .04 * (1 + .4 * Math.sin(a * 3)), mt, 40); h.add(cr, band, bm); return h; }
    if (kind === 'cowboy') {   // cappello da cowboy: corona alta con la piega a goccia, tesa larga arricciata ai lati, nastro con la borchia
      const mt = FM('feltro', c), cr = lathe([[r + .006, -.004], [r + .006, .06], [r * .95, H + .02], [r * .75, H + .05], [r * .3, H + .035], [0, H + .03]], mt, 28);
      const p = cr.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y > H * .6) { const q = (y - H * .6) / (H * .5); p.setX(i, x * (1 - .18 * q * Math.max(0, z / r))); p.setY(i, y - .02 * Math.max(0, 1 - Math.abs(x) / (r * .25)) * q); } }
      p.needsUpdate = true; cr.geometry.computeVertexNormals(); cr.scale.set(1, 1, 1.12);
      const bm = brim(r + .004, r + .11, (a, t) => { const sd = Math.pow(Math.sin(a), 2); return -.006 + t * t * .06 * sd - t * .012 * Math.max(0, Math.cos(a)); }, mt, 40); bm.scale.set(1, 1, 1.12);
      const band = lathe([[r + .009, -.003], [r + .009, .02]], FM('pelle', '#3a2216'), 28); band.scale.set(1, 1, 1.12);
      const stud = Cy(.012, .012, .004, '#d8d0c0', r * .95, .008, 0, 10); stud.rotation.z = Math.PI / 2; h.add(cr, bm, band, stud); return h; }
    if (kind === 'hard') {   // casco da cantiere: calotta con la costola, tesa
      const mt = FM('gomma', '#e8b83a', '#e8b83a', '#e8b83a', 1), d = lathe([[r + .03, -.005], [r + .025, H * .5], [r * .7, H * .95], [0, H + .03]], mt, 28), bm = brim(r + .022, r + .05, (a, t) => -.005 - t * .01 * (Math.cos(a) > 0 ? 1 : .2), mt, 28);
      const rib = M_(new THREE.TorusGeometry(r * .78, .01, 5, 20, Math.PI), mt); rib.rotation.y = Math.PI / 2; rib.position.y = H * .18; rib.scale.set(1, 1.15, 1.1); h.add(d, bm, rib); return h; }
    return h;
  }
  // il nodo e i pezzi sul petto: si posano sulla superficie del tronco, allo spessore giusto
  function trunkAt(B, y, a, off) { const tb = Sartoria.tube(B, 'tronco'), s = tb.sAtY(y), fr = Sartoria.frameAt(tb, s); return { p: Sartoria.surf(tb, s, a, off), fr }; }
  // ---------------- I VOLUMI A FACCE (con i vestiti dipinti): cintura, risvolti dei polsi e delle caviglie ----------------
  // un anello a fascia attorno a un tubo della Sartoria: n facce, alto h, staccato `off` dal corpo, spesso `th`
  function ringBand(tb, s, h, off, th, n, mat) {
    const P = [], ring = (ds, o) => { const r = []; for (let k = 0; k < n; k++) r.push(Sartoria.surf(tb, s + ds, -Math.PI + k / n * Math.PI * 2, o)); return r; };
    const ob = ring(-h / 2, off), ot = ring(h / 2, off), ib = ring(-h / 2, off - th), it = ring(h / 2, off - th);
    const quad = (a, b, c, d) => P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    for (let k = 0; k < n; k++) { const j = (k + 1) % n; quad(ob[k], ob[j], ot[j], ot[k]); quad(ot[k], ot[j], it[j], it[k]); quad(ib[k], ib[j], ob[j], ob[k]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals();
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push((P[i] + P[i + 2]) * 1.0, P[i + 1]); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return new THREE.Mesh(geo, mat);
  }
  function volumi(g, outfit, B, AT) {
    const CUT = Sartoria.CUT_(), cut = c => CUT[c.id] || {}, RK = Pittura.rankOutfit(outfit.filter(c => c.parti && c.parti.length), CUT), after = (c, f) => RK.slice(RK.indexOf(c) + 1).some(f), LO = Pittura.legOrder(outfit);
    // la vita coperta da qualcosa messo dopo: maglioni, giacche, una maglia lasciata fuori, mutande sopra i pantaloni
    const coversTorso = c => after(c, o => (((o.parti || []).includes('torso') && !cut(o).corto && !cut(o).davanti && !(cut(o).cl <= 1 && after(o, p => cut(p).cl === 2 && (p.parti || []).includes('bacino')))) || (o.parti || []).includes('bacino') && !cut(o).gonna));
    outfit.forEach(c => {
      const C = cut(c);
      // la cintura vera, con la fibbia
      if (C.cl === 2 && C.cintura && !C.gonna && !coversTorso(c)) {
        const tb = Pittura.frame(B).tubes[0], s = tb.sAtY(B.waist + .012), leather = /cuoio|jeans/.test(C.cintura), col = leather ? (C.cintura === 'jeans' ? '#5a3a22' : '#3a2418') : c.col;
        const o = new THREE.Group(); o.add(Pittura.orlo(B, 0, s, C.cintura === 'cuoio_fine' ? .026 : .036, .006 + Pittura.spessore(C), .006, 16, Pittura.blockMat('pelle', col, col, col, { vc: false })));
        const fr = Sartoria.frameAt(tb, s), p = Pittura.surfI(B, 0, s, 0, .013 + Pittura.spessore(C)), n = p.clone().sub(fr.p).normalize(), bk = new THREE.Mesh(new THREE.BoxGeometry(.05, .046, .01), lm('#c8b070'));
        bk.position.copy(p); bk.lookAt(p.clone().add(n)); const hole = new THREE.Mesh(new THREE.BoxGeometry(.032, .028, .012), lm('#2a2016')); hole.position.copy(p).addScaledVector(n, .001); hole.lookAt(p.clone().add(n)); o.add(bk, hole); AT('Hips', o);
      }
      // il cinturino della gonna
      if (C.solo_gonna && !coversTorso(c)) { const tb = Pittura.frame(B).tubes[0], s = tb.sAtY(B.waist + .01), o = new THREE.Group();
        o.add(Pittura.orlo(B, 0, s, .032, Pittura.spessore(C) + .005, .006, 16, Pittura.blockMat(C.fab || 'lana', c.col, C.c2, C.c3, { vc: false }))); AT('Hips', o); }
      // la cintura del trench: fascia di stoffa sopra il cappotto, fibbia, il capo libero che pende
      if (C.cintura === 'trench') {
        const tb = Pittura.frame(B).tubes[0], s = tb.sAtY(B.waist + .02), off = Pittura.spessore(C) + .006, mt = Pittura.blockMat(C.fab || 'cotone', c.col, c.col, c.col, { vc: false }), o = new THREE.Group();
        o.add(Pittura.orlo(B, 0, s, .04, off, .007, 16, mt));
        const fr = Sartoria.frameAt(tb, s), p = Pittura.surfI(B, 0, s, -.2, off + .004), n = p.clone().sub(fr.p).normalize();
        const bk = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .008), lm(sh(c.col, .55))); bk.position.copy(p); bk.lookAt(p.clone().add(n)); const hole = new THREE.Mesh(new THREE.BoxGeometry(.034, .034, .01), mt); hole.position.copy(p).addScaledVector(n, .001); hole.lookAt(p.clone().add(n)); o.add(bk, hole);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(.04, .16, .007), mt); tail.position.copy(Pittura.surfI(B, 0, s - .09, -.35, off + .006)); tail.lookAt(tail.position.clone().add(n)); tail.rotation.z += .15; o.add(tail);
        AT('Hips', o);
      }
      // i polsini rimboccati delle camicie (se nessuno ci va sopra)
      if ((C.polsi || C.risvolto_maniche) && (c.parti || []).includes('avambracci') && !after(c, o => (o.parti || []).includes('avambracci') && cut(o).cl >= 0 && cut(o).cl >= 3)) for (const sd of ['L', 'R']) {
        const tb = Sartoria.tube(B, 'manica' + sd), Ls = Sartoria.lengths(B, tb, 'manica' + sd, C, c.parti); if (Ls.s1 < Ls.la) continue;
        const o = new THREE.Group(); o.add(Pittura.orlo(B, sd === 'L' ? 1 : 2, Ls.s1 - .022, .04, .008, .008, 10, Pittura.blockMat(C.fab || 'cotone', c.col, C.c2, C.c3, { vc: false }))); AT('LowerArm' + sd, o);
      }
      // il risvolto dei pantaloni
      if (C.cl === 2 && C.risvolto && !after(c, o => cut(o).gonna) && !LO.socksOver && !LO.bootsOver) for (const sd of ['L', 'R']) {
        const tb = Sartoria.tube(B, 'gamba' + sd), Ls = Sartoria.lengths(B, tb, 'gamba' + sd, C, c.parti);
        const o = new THREE.Group(); o.add(Pittura.orlo(B, sd === 'L' ? 3 : 4, Math.min(Ls.s1, tb.L - .03) - .025, .045, .01, .01, 12, Pittura.blockMat(C.fab || 'cotone', c.col, C.c2, C.c3, { vc: false }))); AT('LowerLeg' + sd, o);
      }
    });
  }
  // il cappuccio abbassato delle felpe: un rotolo di stoffa attorno al collo e la sacca che ricade sulla schiena
  function cappuccio(g, outfit, B, AT) {
    const CUT = Sartoria.CUT_(), c = outfit.find(o => (CUT[o.id] || {}).collo === 'cappuccio'); if (!c) return;
    Sartoria.neckY(B); const [nx, nz] = B.neckC, ny = B.neckY, rn = B.neckR + .03, mt = Pittura.blockMat('jersey', c.col, c.col, c.col, { vc: false }), o = new THREE.Group();
    const pts = []; for (let k = 0; k <= 12; k++) { const t = lerp0(.32, 1.68, k / 12) * Math.PI, back = Math.max(0, -Math.cos(t)); pts.push(new THREE.Vector3(nx + Math.sin(t) * (rn + .012), ny - .015 - back * .02, nz + Math.cos(t) * (rn + .012))); }
    const roll = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, .028, 6, false), mt); roll.scale.set(1, 1, 1); o.add(roll);
    const sac = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), mt); sac.scale.set(1.15, .95, .45); sac.position.set(nx, ny - .085, nz - rn - .035); sac.rotation.x = .25; o.add(sac);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 4), lm(sh(c.col, .45))); inner.scale.set(1.2, .5, .3); inner.position.set(nx, ny - .03, nz - rn - .03); o.add(inner);
    AT('Chest', o);
  }
  const lerp0 = (a, b, t) => a + (b - a) * t;
  // ---------------- LE SCARPE: modelli low-poly misurati sul piede (non più il piede del kit gonfiato) ----------------
  const SH_STYLE = {
    scarpe: { h: .1, sole: .016, toe: .032, lacci: 1 }, scarpe_eleganti: { h: .085, sole: .01, toe: .026, punta: 1 }, mocassini: { h: .075, sole: .01, toe: .028, mocassino: 1 },
    scarpe_tela: { h: .09, sole: .014, toe: .03, suola: '#f0ece4', lacci: 1 }, scarpe_corsa: { h: .095, sole: .018, toe: .032, suola: '#f4f2ee', striscia: 1, lacci: 1 },
    tacchi: { h: .045, sole: .008, toe: .022, tacco: .055, punta: 1 }, sandali: { h: 0, sole: .014, sandalo: 1 }, ciabatte: { h: 0, sole: .016, ciabatta: 1 },
    scarpe_skate: { h: .1, sole: .024, toe: .04, suola: '#ece6da', lacci: 1, largo: .012, lingua: 1, cucitura: 1 },   // da skate: piatte, larghe, suola spessa a vista, lingua imbottita
    scarpe_air: { h: .105, sole: .03, toe: .036, suola: '#f6f4f0', lacci: 1, largo: .006, bolla: 1, baffo: 1 },   // da ginnastica bianche: suola alta con la bolla d'aria, il baffo di lato
    stivali: { h: .12, sole: .018, toe: .036 }, stivali_pelle: { h: .12, sole: .012, toe: .03, punta: 1 }, stivali_cowboy: { h: .12, sole: .012, toe: .03, tacco: .025, punta: 1 } };
  function footBox(B, sd) {
    const sg = sd === 'L' ? 1 : -1, P = []; for (let i = 0; i < B.part.length; i++) if (B.side[i] === sg && (B.part[i] === 'piedi' || B.part[i] === 'polpacci' && B.P[i * 3 + 1] < .07)) P.push([B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]]);   // il tallone del modello sta nell'osso del polpaccio
    if (!P.length) return null; const q = (k, f) => { const a = P.map(p => p[k]).sort((x, y) => x - y); return a[Math.floor(f * (a.length - 1))]; };
    const zH = q(2, .02), zT = q(2, .98), toe = P.filter(p => p[2] > zT - .03), heel = P.filter(p => p[2] < zH + .03), avg = (L, k) => L.reduce((a, p) => a + p[k], 0) / L.length;
    const hx = avg(heel, 0), tx = avg(toe, 0), L = Math.hypot(tx - hx, zT - zH), yaw = Math.atan2(tx - hx, zT - zH);
    const w = Math.min(.1, Math.max(.07, (q(0, .97) - q(0, .03)) * Math.cos(yaw) * .82));
    return { cx: (hx + tx) / 2, cz: (zH + zT) / 2, L: Math.min(.29, L + .016), w: w + .004, yaw, top: q(1, .95) };
  }
  // la scarpa: profilo laterale vero (suola dritta, punta bassa, collo del piede, tallone), estruso e affusolato in pianta
  function shoeGeo(st, L, W) {
    const H = Math.max(st.h, .012), T = st.toe || .025, sh = new THREE.Shape(), z0 = -L / 2, z1 = L / 2;
    sh.moveTo(z0 + .012, 0); sh.lineTo(z1 - .02, 0); sh.quadraticCurveTo(z1, 0, z1, Math.min(T, H) * .55);
    sh.quadraticCurveTo(z1 - .004, Math.min(T, H), z1 - .035, Math.min(T, H));   // la punta, bassa
    sh.quadraticCurveTo(z0 + L * .5, T + (H - T) * .55, z0 + L * .32, H);   // il collo del piede che sale fino alla caviglia
    sh.lineTo(z0 + .01, H); sh.quadraticCurveTo(z0 - .004, H * .5, z0 + .012, 0);   // il tallone
    const g = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 4 });
    g.translate(0, 0, -W / 2); g.rotateY(Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), f = cl0((z - (z1 - L * .4)) / (L * .4)), hb = cl0(((z0 + .05) - z) / .05);
      p.setX(i, p.getX(i) * (1 - (st.punta ? .55 : .35) * f * f) * (1 - .18 * hb)); }   // punta e tallone stretti
    g.computeVertexNormals(); return g;
  }
  const cl0 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  // la forma del piede vista dall'alto: mezza larghezza (in frazione di W/2) lungo la lunghezza, u = 0 tallone … 1 punta
  const pianta = (u, punta) => { const heel = .72 + .28 * Math.sqrt(cl0(u / .25)), ball = 1 - .1 * Math.pow(cl0((u - .62) / .38), 2) - (punta ? .25 : .08) * Math.pow(cl0((u - .8) / .2), 2); return Math.max(.05, Math.min(heel, ball)); };
  // la suola: contorno arrotondato del piede, estruso verso l'alto
  function suolaGeo(L, W, h, punta) {
    const sh = new THREE.Shape(), n = 28, P = [];
    for (let i = 0; i <= n; i++) { const t = i / n, u = .5 - .5 * Math.cos(t * Math.PI), z = -L / 2 + u * L, r = W / 2 * pianta(u, punta) * (u > .93 ? Math.sqrt(cl0((1 - u) / .07)) : 1) * (u < .04 ? Math.sqrt(cl0(u / .04)) * .4 + .6 : 1); P.push([r, z]); }
    sh.moveTo(P[0][0], P[0][1]); P.forEach(p => sh.lineTo(p[0], p[1])); for (let i = P.length - 1; i >= 0; i--) sh.lineTo(-P[i][0], P[i][1]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: h * .25, bevelSize: .003, bevelSegments: 2, curveSegments: 6 });
    g.rotateX(Math.PI / 2); g.translate(0, h, 0); g.computeVertexNormals(); return g;
  }
  // la tomaia: mezza sfera deformata sul piede (bombata sulla punta, alta al tallone, collo del piede che sale)
  // la tomaia: guscio sul piede. Dietro sale fino alla caviglia (contrafforte), sul collo del piede scende in linea, la punta resta bassa e tonda
  function tomaiaGeo(L, W, H, T, punta) {
    const nu = 16, nv = 12, P = [], I = [];
    for (let i = 0; i <= nu; i++) { const u = i / nu, z = -L / 2 + u * L, w = W / 2 * pianta(u, punta) * 1.02;
      const hh = u < .3 ? H : u < .62 ? lerp0(H, T + .012, sm0((u - .3) / .32)) : lerp0(T + .012, T * .7, sm0((u - .62) / .38));   // profilo laterale
      for (let j = 0; j <= nv; j++) { const t = j / nv * Math.PI, x = -Math.cos(t) * w, y = Math.pow(Math.sin(t), .55) * hh, zz = z + (u < .04 ? (.04 - u) * L * .4 * Math.sin(t) : 0); P.push(x, y, zz); } }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; I.push(a, b, c, b, d, c); }
    // il tallone chiuso: una calotta che unisce l'ultimo anello
    const c0 = P.length / 3; P.push(0, H * .5, -L / 2 - .004); for (let j = 0; j < nv; j++) I.push(c0, j + 1, j);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < P.length; i += 3) uv.push(P[i] * 6, P[i + 2] * 6); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }
  const sm0 = t => { t = cl0(t); return t * t * (3 - 2 * t); };
  function scarpe(g, outfit, B, AT) {
    const c = outfit.find(o => SH_STYLE[o.id]); if (!c) return null; const st = SH_STYLE[c.id];
    const up = Pittura.blockMat(c.id === 'stivali' ? 'gomma' : 'pelle', c.col, c.col, c.col, { vc: false, liscio: 1 }), soleM = lm(st.suola || sh(c.col, .3)), dark = lm(sh(c.col, .5));
    for (const sd of ['L', 'R']) {
      const F = footBox(B, sd); if (!F) continue; const o = new THREE.Group(), inner = new THREE.Group(), so = st.sole, L = F.L + (st.largo ? .01 : 0), W = F.w + (st.largo || 0);
      inner.add(new THREE.Mesh(suolaGeo(L + .008, W + .008, so, st.punta), soleM));
      if (!st.sandalo && !st.ciabatta) { const top = new THREE.Mesh(tomaiaGeo(L, W, st.h, st.toe, st.punta), up); top.position.y = so * .9; inner.add(top);
        const coll = new THREE.Mesh(new THREE.TorusGeometry(W * .27, .005, 4, 14), dark); coll.rotation.x = Math.PI / 2; coll.scale.set(1, 1.5, 1); coll.position.set(0, so * .9 + st.h - .004, -L * .3); inner.add(coll); }   // il bordo dell'apertura, sopra il tallone
      if (st.ciabatta) { const band = new THREE.Mesh(tomaiaGeo(L * .45, W, .035, .03, 0), up); band.position.set(0, so, L * .2); inner.add(band); }
      if (st.sandalo) for (const zz of [.22, -.02]) { const b = new THREE.Mesh(new THREE.TorusGeometry(W * .5, .006, 4, 14, Math.PI), up); b.position.set(0, so, L * zz); inner.add(b); }
      if (st.lacci) for (let k = 0; k < 4; k++) { const u = .42 + k * .07, z = -L / 2 + u * L, y = so * .9 + lerp0(st.h, st.toe + .012, sm0((u - .3) / .32)) - .002; const lc = new THREE.Mesh(new THREE.BoxGeometry(W * .34, .004, .006), lm(st.suola ? '#f4f0e8' : sh(c.col, .35))); lc.position.set(0, y, z); inner.add(lc); }
      if (st.striscia) for (const sx of [-1, 1]) { const s0 = new THREE.Mesh(new THREE.BoxGeometry(.003, .012, L * .32), lm('#c83a3a')); s0.position.set(sx * W * .45, so + .022, 0); s0.rotation.x = .45; inner.add(s0); }
      if (st.lingua) { const tg = new THREE.Mesh(new THREE.BoxGeometry(W * .42, .045, .022), up); tg.position.set(0, so + st.h - .006, -L * .08); tg.rotation.x = -.35; inner.add(tg); }   // la lingua imbottita che sporge
      if (st.cucitura) { const sw = new THREE.Mesh(new THREE.TorusGeometry(W * .5, .0025, 3, 20, Math.PI), lm('#2a2a2e')); sw.rotation.x = -Math.PI / 2; sw.scale.set(1, 1.7, 1); sw.position.set(0, so + .012, L * .2); inner.add(sw); }   // la cucitura del puntale
      if (st.bolla) for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.004, so * .5, L * .2), lm('#9ac8e0')); b.position.set(sx * (W / 2 + .0045), so * .5, -L * .28); inner.add(b); }   // la bolla d'aria nel tallone
      if (st.baffo) for (const sx of [-1, 1]) { const P = [], n = 8; for (let i = 0; i <= n; i++) { const t = i / n; P.push(new THREE.Vector3(sx * (W / 2 + .002 + .004 * Math.sin(t * Math.PI)), so + .018 + .028 * Math.pow(t, 1.6), L * (.22 - .5 * t))); }
        inner.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 10, .0045, 3), lm(/^#[d-f]/i.test(c.col || '') ? '#c8302a' : '#f0ece4'))); }   // la virgola di lato (senza marchio)
      if (st.mocassino) { const ap = new THREE.Mesh(new THREE.TorusGeometry(W * .26, .003, 4, 14), dark); ap.rotation.x = Math.PI / 2; ap.scale.set(1, 1.5, 1); ap.position.set(0, so + st.toe + .004, L * .22); inner.add(ap); }
      if (st.tacco) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(.014, .011, .02, 8), soleM); hl.position.set(0, .01, -L * .38); inner.add(hl); }
      inner.rotation.y = F.yaw; o.add(inner); o.position.set(F.cx, 0, F.cz);
      AT('Foot' + sd, o);
      // il gambale degli stivali: un tubo vero sul polpaccio (sopra i pantaloni infilati; con i pantaloni fuori, nascosto sotto l'orlo)
      if (/^stivali/.test(c.id)) {
        const LO = Pittura.legOrder(outfit), ri = sd === 'L' ? 3 : 4, tb = Pittura.frame(B).tubes[ri], top = c.id === 'stivali' ? .34 : .3;
        const sAt = y => { let lo = 0, hi = tb.L; for (let k = 0; k < 20; k++) { const m = (lo + hi) / 2; if (Pittura.surfI(B, ri, m, 0, 0).y > y) lo = m; else hi = m; } return lo; };
        const s1 = sAt(top), s0 = Math.min(tb.L - .02, sAt(.1)), tuck = LO.bootsOver && LO.pants, off = (tuck ? Pittura.spessore({ cl: 2 }) + .004 : 0) + .006;
        const n = 14, rows = 6, P = [], I = [];
        for (let i = 0; i <= rows; i++) { const sv = lerp0(s1, s0, i / rows), flare = i === 0 && c.id !== 'stivali' ? .006 : 0; for (let k = 0; k <= n; k++) { const p = Pittura.surfI(B, ri, sv, -Math.PI + k / n * Math.PI * 2, (off + flare + (tuck ? .004 * (1 - i / rows) : 0)) * (1 - .45 * Math.pow(i / rows, 2))); P.push(p.x, p.y, p.z); } }
        for (let i = 0; i < rows; i++) for (let k = 0; k < n; k++) { const a = i * (n + 1) + k, b = a + 1, cc = a + n + 1, d = cc + 1; I.push(a, cc, b, b, cc, d); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gg.setIndex(I); gg.computeVertexNormals();
        const uv = []; for (let i = 0; i < P.length; i += 3) uv.push((P[i] + P[i + 2]) * 4, P[i + 1] * 4); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        const leg = new THREE.Group(); leg.add(new THREE.Mesh(gg, up));
        leg.add(Pittura.orlo(B, ri, s1 + .006, .014, off + .004, .008, n, c.id === 'stivali' ? dark : up));   // l'orlo del gambale
        if (!tuck && LO.pants) leg.visible = false;   // sotto i pantaloni non si vede
        AT('LowerLeg' + sd, leg);
      }
    }
    return st;
  }
  // sotto il cappello i capelli si schiacciano: dentro la calotta (misurata sul cranio), sotto la tesa restano come sono (code, caschetto)
  function schiacciaCapelli(g, T, kind) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), v = new THREE.Vector3();
    const pm = /^(passamontagna|pm_)/.test(kind), wide = /^(fedora|ushanka|casco|elmetto|paglia|cowboy|hard)$/.test(kind), rIn = pm ? T.rSkull + .004 : T.r - .006 + (wide ? .01 : 0), hIn = T.hHat - (pm ? .01 : .006) + (wide ? .008 : 0), y0 = pm ? T.chin - .03 : T.brow, zs = /^(cap|snapback)$/.test(kind) ? 1.04 : 1;
    g.traverse(o => {
      if (!o.isSkinnedMesh || o.userData.vesti || !/Head/i.test(o.name)) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
      if (pm && ms.some(m => m && /^Moustache/i.test(m.name || ''))) { o.visible = false; o.userData.pmHid = true; return; }   // sotto il passamontagna i baffi non ci sono
      if (pm && ms.some(m => m && /^Skin/i.test(m.name || ''))) {   // la pelle della testa sotto il passamontagna: resta solo la faccia (si vede dai fori), il resto via
        const M = new THREE.Matrix4().multiplyMatrices(gi, o.matrixWorld), g0 = o.geometry, ix = g0.index ? g0.index.array : null, Pp = g0.attributes.position, nt = (ix ? ix.length : Pp.count) / 3, keep = [], w = new THREE.Vector3();
        for (let t = 0; t < nt; t++) { let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { w.fromBufferAttribute(Pp, ix ? ix[t * 3 + k] : t * 3 + k).applyMatrix4(M); cx += w.x / 3; cy += w.y / 3; cz += w.z / 3; }
          const front = cz - T.cz > (T.eyeZ - T.cz) * .55 && Math.abs(cx - T.cx) < .075 && cy > T.chin - .01 && cy < T.brow + .012; if (front || cy < T.chin - .03) for (let k = 0; k < 3; k++) keep.push(ix ? ix[t * 3 + k] : t * 3 + k); }
        const g1 = new THREE.BufferGeometry(); for (const k in g0.attributes) g1.setAttribute(k, g0.attributes[k]); g1.setIndex(keep); g1.boundingSphere = g0.boundingSphere; o.userData.pmGeo = g0; o.geometry = g1; return; }
      if (ms.some(m => m && /^(Skin|Eye|Eyebrows|Moustache|Worker_Yellow)/i.test(m.name || ''))) return;   // solo le mesh dei capelli
      if (pm) { o.visible = false; o.userData.pmHid = true; return; }   // tutti dentro il passamontagna: non si vedono (niente ciocche che lo bucano)
      const geo = o.geometry; if (!geo.userData.pittura) return;   // (geometria propria della persona)
      const P = geo.attributes.position, M = new THREE.Matrix4().multiplyMatrices(gi, o.matrixWorld), Mi = M.clone().invert(); let ch = 0;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); if (v.y < y0 - .02) continue;
        const dx = v.x - T.cx, dz = (v.z - T.cz) / zs, d = Math.hypot(dx, dz), t = cl0((v.y - T.brow) / hIn), ra = (v.y < T.brow ? rIn + (pm ? 0 : .004) : rIn * Math.sqrt(Math.max(0, 1 - t * t * .85)));
        let nx = v.x, ny = Math.min(v.y, T.brow + hIn), nz = v.z; if (d > ra && d > 1e-5) { const k = ra / d; nx = T.cx + dx * k; nz = T.cz + dz * k * zs; }
        if (nx !== v.x || ny !== v.y || nz !== v.z) { v.set(nx, ny, nz).applyMatrix4(Mi); P.setXYZ(i, v.x, v.y, v.z); ch++; } }
      if (ch) { P.needsUpdate = true; geo.computeBoundingSphere(); } });
  }
  function accessories(g, outfit, held, D) {
    if (!window.Sartoria || !D || !D.B) return accessoriesOld(g, outfit, held);
    if (window.Pittura) try { scarpe(g, outfit, D.B, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); } catch (e) { console.error('[Vesti3D] scarpe', e); }
    if (window.Pittura) try { volumi(g, outfit, D.B, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); Pittura.bordi(g, D.B, outfit, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); cappuccio(g, outfit, D.B, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); } catch (e) { console.error('[Vesti3D] volumi', e); }
    const B = D.B, T = Sartoria.testa(g, PARTI), bn = B.bones, AT = (bone, obj) => Sartoria.attach(g, PARTI, bone, obj);
    const lay = D.lay || [], outer = lay.reduce((m, l) => Math.max(m, l.t || 0), 0) + .004, th = D.th || {};
    // spessore sotto la giacca: la cravatta sta sopra la camicia e sotto il revers
    const underJ = lay.filter(l => l.cl < 4 && l.parti.includes('torso')).reduce((m, l) => Math.max(m, l.t), 0) + .004;
    const torsoOut = (th.torso || 0) + .006;
    let kh = 0;
    { const hat = outfit.find(c => c.acc && /^(beanie|flat|fedora|ushanka|casco|elmetto|cap|snapback|docker|basco|police|paglia|hard|cowboy|scarf|passamontagna|pm_\w+)$/.test(c.acc)); if (hat && T) try { schiacciaCapelli(g, T, hat.acc); } catch (e) { console.error('[Vesti3D] capelli', e); } }
    outfit.forEach(c => {
      if (!c.acc) return;
      const isHat = /^(pm_\w+|beanie|flat|fedora|scarf|ushanka|casco|elmetto|passamontagna|bandana|antigas|cap|snapback|docker|basco|fascia|police|paglia|hard|cowboy)$/.test(c.acc);
      if (isHat && T) { const o = /^(passamontagna|pm_)/.test(c.acc) ? balaclava(c, T, B) : /^(cap|snapback|docker|basco|fascia|police|paglia|hard|cowboy)$/.test(c.acc) ? headAcc2(c.acc, c.col, T, kh) : headAcc(c.acc, c.col, T, kh); kh++; o.position.set(T.cx, T.brow, T.cz); AT('Head', o); return; }
      if (c.acc === 'occhiali' && T) {   // occhiali a goccia: lenti scure, montatura dorata, stanghette fino alle orecchie
        const o = new THREE.Group(), y = T.eyeY - T.brow, z = T.eyeZ - T.cz + .014, lens = sx => { const L = new THREE.Mesh(new THREE.CircleGeometry(.026, 16), new THREE.MeshLambertMaterial({ color: '#0e1012', emissive: '#1a1e24', side: THREE.DoubleSide })); L.scale.set(1.1, .95, 1); L.position.set(sx, y - .004, z); L.rotation.y = sx > 0 ? .12 : -.12; return L; };
        const fr = sx => { const f = new THREE.Mesh(new THREE.TorusGeometry(.027, .0025, 4, 18), lm('#c8a860')); f.scale.set(1.1, .95, 1); f.position.set(sx, y - .004, z + .001); f.rotation.y = sx > 0 ? .12 : -.12; return f; };
        o.add(lens(-.034), lens(.034), fr(-.034), fr(.034), Bx(.022, .003, .003, '#c8a860', 0, y + .012, z + .002));
        for (const sx of [-1, 1]) { const st = Bx(.003, .003, T.eyeZ - T.cz + .01, '#c8a860', sx * (T.rSkull + .004), y + .006, (T.eyeZ - T.cz) / 2 - .01); o.add(st); }
        o.position.set(T.cx, T.brow, T.cz); AT('Head', o); return; }
      if ((c.acc === 'sciarpa') && T) {   // sciarpa: due giri attorno al collo, i capi che scendono davanti, frange
        const o = new THREE.Group(), mt = FM(c.id === 'sciarpa_righe' ? 'righe' : 'costine', c.col, c.id === 'sciarpa_righe' ? '#ece8dc' : c.col), nb = bn.Neck, R = Math.max(.072, (th.collo || 0) + .07);
        const y0 = B.neck - .01; for (let i = 0; i < 2; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(R + i * .012, .026 - i * .004, 8, 24), mt); t.rotation.x = Math.PI / 2 + .12; t.position.set(nb.x, y0 + i * .03, nb.z - .005); t.scale.set(1.05, 1, .98); o.add(t); }
        const P1 = trunkAt(B, B.bones.Chest.y - .05, .35, outer + .01), P2 = trunkAt(B, B.waist + .05, .3, outer + .012);
        const end = (from, to, w) => { const cu = new THREE.CatmullRomCurve3([from, from.clone().lerp(to, .5).add(new THREE.Vector3(0, 0, .01)), to]), tg = new THREE.TubeGeometry(cu, 8, .022, 6); tg.scale(1, 1, 1); const m = new THREE.Mesh(tg, mt); m.scale.set(1, 1, .5); m.position.z = from.z * .5; return m; };
        o.add(end(new THREE.Vector3(nb.x + .04, y0 - .01, nb.z + R * .8), P1.p.clone().add(new THREE.Vector3(.0, 0, .008))));
        o.add(end(new THREE.Vector3(nb.x + .015, y0 - .01, nb.z + R * .9), P2.p.clone().add(new THREE.Vector3(-.02, 0, .01))));
        for (let i = 0; i < 6; i++) o.add(Bx(.003, .03, .003, c.col, P2.p.x - .03 + i * .01, P2.p.y - .025, P2.p.z * .5 + .012));
        AT('Chest', o); return; }
      if (c.acc === 'cravatta') {   // cravatta: nodo, pala che si allarga fino alla punta; sulla camicia, e si vede solo nello scollo di maglioni e giacche
        const P0 = window.Pittura, CUT = Sartoria.CUT_(), nY = Sartoria.neckY(B), sp = C0 => P0 ? P0.spessore(C0) : .004;
        const plans = outfit.filter(o => o.parti && o.parti.includes('torso')).map(o => Object.assign({ id: o.id }, CUT[o.id] || { cl: 1 }, (o.var && typeof o.var === 'object') ? o.var : {}));
        const shirt = plans.filter(p => p.cl <= 1).pop(), outer = plans.filter(p => p.cl >= 3 && !p.solo_gonna && !p.davanti).pop();
        const vDrop = outer ? ({ v: .11, revers: .2, revers_pelle: .2, camicia_aperta: .11 }[outer.collo] || 0) : .5;   // con un maglione girocollo o a collo alto la cravatta non si vede
        if (vDrop > .03) {
          const dis = c.dis || 'raso', C2 = { regimental: '#c8b070', pois: '#ece8dc', paisley: '#e8c070', liberty: '#e8d8b0', costine: c.col }[dis] || c.col, C3 = { paisley: '#2a3a6a', liberty: '#c83a4a', regimental: '#1a1a1e' }[dis] || C2;
          const mt = P0 ? P0.blockMat(dis, c.col, C2, C3, { vc: false }) : FM('raso', c.col), off = (shirt ? sp(shirt) : 0) + .003, o = new THREE.Group(), tb = Pittura.frame(B).tubes[0];
          const at = (y, a, d) => Pittura.surfI(B, 0, tb.sAtY(y), a, off + (d || 0));
          const yK = nY - .018, yEnd = Math.max(B.waist - .03, nY - vDrop + .01), tip = yEnd > B.waist ? 0 : .03;
          // il nodo: un trapezio rigonfio
          const k = at(yK, 0, .006), knot = new THREE.Mesh(new THREE.CylinderGeometry(.017, .009, .03, 4, 1), mt); knot.rotation.y = Math.PI / 4; knot.scale.set(1, 1, .55); knot.position.copy(k); o.add(knot);
          // la pala: nastro sulla superficie, da 1,4 a 3,8 cm, con la punta
          const n = 10, V = [], U = [], I = [];
          for (let i = 0; i <= n; i++) { const t = i / n, y = lerp0(yK - .015, yEnd, t), w = .007 + t * .012, c0 = at(y, 0, .001), cl = at(y, -w / .14, .001), cr = at(y, w / .14, .001); V.push(cl.x, cl.y, cl.z, cr.x, cr.y, cr.z); U.push(0, t * .5, .05, t * .5); }
          if (tip) { const tp = at(yEnd - tip, 0, .001); V.push(tp.x, tp.y, tp.z); U.push(.025, .55); }
          for (let i = 0; i < n; i++) I.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); if (tip) I.push(n * 2, n * 2 + 1, n * 2 + 2);
          const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(V, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); gg.setIndex(I); gg.computeVertexNormals();
          const blade = new THREE.Mesh(gg, mt); blade.material = mt; o.add(blade);
          AT('Chest', o);
        }
        return; }
      if (c.acc === 'papillon') { const o = new THREE.Group(), q = trunkAt(B, B.neck - .012, 0, underJ + .006), mt = FM('raso', c.col);
        [-1, 1].forEach(k => { const w = new THREE.Mesh(new THREE.ConeGeometry(.024, .05, 4), mt); w.rotation.z = k * Math.PI / 2; w.scale.set(1, 1, .45); w.position.copy(q.p).add(new THREE.Vector3(k * .026, 0, 0)); o.add(w); });
        o.add(Sp(.01, mt, q.p.x, q.p.y, q.p.z + .004)); AT('Chest', o); return; }
      if (c.acc === 'collana' || c.acc === 'perle') {   // catenone che scende sul petto con la medaglia / filo di perle
        const o = new THREE.Group(), pts = []; for (let i = 0; i <= 16; i++) { const a = -1.25 + i / 16 * 2.5, y = B.neck - .015 - Math.cos(a / 1.25 * Math.PI / 2) * (c.acc === 'perle' ? .05 : .09); pts.push(trunkAt(B, y, a, torsoOut + .003).p); }
        const back = trunkAt(B, B.neck + .005, Math.PI, torsoOut + .003).p, l1 = trunkAt(B, B.neck, 1.9, torsoOut + .003).p, l2 = trunkAt(B, B.neck, -1.9, torsoOut + .003).p;
        const all = [l2, ...pts, l1]; if (c.acc === 'perle') all.forEach((p, i) => { o.add(Sp(.0075, '#f4f0e6', p.x, p.y, p.z)); if (i < all.length - 1) { const m = p.clone().lerp(all[i + 1], .5); o.add(Sp(.0075, '#f4f0e6', m.x, m.y, m.z)); } });
        else { const cu = new THREE.CatmullRomCurve3(all), tg = new THREE.TubeGeometry(cu, 40, .0035, 5, false); o.add(new THREE.Mesh(tg, lm(c.col))); const md = Cy(.016, .016, .004, c.col, pts[8].x, pts[8].y - .02, pts[8].z + .004, 12); md.rotation.x = Math.PI / 2; o.add(md); }
        AT('Chest', o); return; }
      if (c.acc === 'foulard') { const o = new THREE.Group(), q = trunkAt(B, B.neck - .01, 0, torsoOut + .004), mt = FM('paisley', c.col, sh(c.col, 1.5), '#2a2a3a');
        const t = new THREE.Mesh(new THREE.TorusGeometry(.07, .014, 6, 18), mt); t.rotation.x = Math.PI / 2 + .2; t.position.set(bn.Neck.x, B.neck, bn.Neck.z); o.add(t);
        const tri = new THREE.Mesh(new THREE.ConeGeometry(.045, .09, 3), mt); tri.rotation.x = Math.PI; tri.scale.z = .3; tri.position.copy(q.p).add(new THREE.Vector3(.01, -.04, .006)); o.add(tri); AT('Chest', o); return; }
      if (c.acc === 'paraspalle') for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1, sp = bn['UpperArm' + s], o = new THREE.Group(), mt = FM('pelle', c.col);
        const d = lathe([[.085, 0], [.08, .025], [.05, .045], [0, .05]], mt, 18); d.scale.set(1, .8, 1.15); d.rotation.z = -sg * .5; d.position.set(sp.x + sg * .005, sp.y + .02 + (th.braccia || 0), sp.z); o.add(d);
        const strap = new THREE.Mesh(new THREE.TorusGeometry(.075 + (th.braccia || 0), .006, 4, 20), lm(sh(c.col, .6))); strap.position.set(sp.x + sg * .03, sp.y - .07, sp.z); strap.rotation.z = -sg * .35; strap.rotation.x = Math.PI / 2; o.add(strap); AT('UpperArm' + s, o); }
      if (c.acc === 'paraginocchia') for (const s of ['L', 'R']) { const tb = Sartoria.tube(B, 'gamba' + s), sk = tb.sNear(bn['LowerLeg' + s]), q = Sartoria.surf(tb, sk, 0, (th.cosce || th.polpacci || 0) + .006), fr = Sartoria.frameAt(tb, sk), o = new THREE.Group();
        const pad = lathe([[.05, 0], [.048, .015], [.03, .025], [0, .028]], FM('gomma', c.col), 16); pad.scale.set(1, 1, 1.25); pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.clone().sub(fr.p).normalize()); pad.position.copy(q); o.add(pad);
        const st = new THREE.Mesh(new THREE.TorusGeometry(.07, .007, 4, 18), lm('#1a1a1c')); st.position.copy(fr.p).addScaledVector(fr.t, -.04); st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fr.t); o.add(st); AT('LowerLeg' + s, o); }
      if (c.acc === 'zaino') {   // zaino militare: corpo morbido, patta con le cinghie, tasche laterali, spallacci
        const o = new THREE.Group(), mt = FM('tela', c.col, sh(c.col, .7)), q = trunkAt(B, bn.Chest.y - .06, Math.PI, outer), back = q.p, d = .16;
        const body = new THREE.Mesh(new THREE.BoxGeometry(.32, .38, d, 4, 4, 2), mt); const bp = body.geometry.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); bp.setZ(i, z * (1 - .25 * Math.pow(Math.abs(x) / .16, 3)) * (1 - .2 * Math.pow(Math.abs(y) / .19, 3))); } body.geometry.computeVertexNormals();
        body.position.set(back.x, back.y, back.z - d / 2 + .005); o.add(body);
        const flap = Bx(.3, .14, .03, FM('tela', sh(c.col, .9)), back.x, back.y + .13, back.z - d - .005); o.add(flap);
        for (const sx of [-1, 1]) { o.add(Bx(.025, .2, .006, '#2a2a22', back.x + sx * .08, back.y + .03, back.z - d - .02), Bx(.035, .022, .01, '#8a8a80', back.x + sx * .08, back.y - .06, back.z - d - .022));
          o.add(Bx(.05, .16, .09, mt, back.x + sx * .185, back.y - .07, back.z - d / 2)); }
        for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1, f1 = trunkAt(B, B.neck - .03, sg * 2.4, outer + .002).p, f2 = trunkAt(B, B.neck - .02, sg * 1.2, outer + .004).p, f3 = trunkAt(B, bn.Chest.y - .1, sg * .9, outer + .004).p, f4 = trunkAt(B, B.waist + .08, sg * 1.6, outer + .003).p;
          const cu = new THREE.CatmullRomCurve3([f1, f2, f3, f4]); const tg = new THREE.TubeGeometry(cu, 16, .012, 4); o.add(new THREE.Mesh(tg, lm('#2a2a22'))); }
        AT('Chest', o); }
      if (c.acc === 'marsupio') {   // marsupio: cintura che gira attorno, tasca con la zip davanti
        const o = new THREE.Group(), tb = Sartoria.tube(B, 'tronco'), y = B.waist - .02, s = tb.sAtY(y), P = []; for (let i = 0; i <= 32; i++) P.push(Sartoria.surf(tb, s, -Math.PI + i / 32 * Math.PI * 2, outer + .002));
        o.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P, true), 40, .008, 4, true), lm('#1e1e24')));
        const q = trunkAt(B, y - .01, .15, outer + .03).p, po = new THREE.Mesh(sacca(.2, .09, .05, .04, .012), FM('nylon', c.col, c.col, c.col, 1)); po.position.copy(q); o.add(po, Bx(.13, .004, .005, '#1a1a1a', q.x, q.y + .025, q.z + .025)); AT('Hips', o); }
      if (c.acc === 'borsello' || c.acc === 'tracolla') {   // borsello (sul fianco, davanti) e marsupio a tracolla (di traverso sul petto): tela tecnica, zip, cinghia sottile sulla spalla opposta
        const o = new THREE.Group(), chest = c.acc === 'tracolla', mt = FM('nylon', c.col, c.col, c.col, 1), sp = bn.ShoulderR || bn.UpperArmR;
        const at = chest ? trunkAt(B, bn.Chest.y - .03, -.25, outer + (chest ? .028 : .035)) : trunkAt(B, B.waist + .04, .7, outer + .035), q = at.p, nrm = q.clone().sub(at.fr.p).setY(0).normalize();
        const body = chest ? new THREE.Mesh(sacca(.2, .085, .045, .038, .012), mt) : new THREE.Mesh(sacca(.13, .17, .04, .02, .01), mt);
        if (chest) body.rotation.z = -.55;
        const pv = new THREE.Group(); pv.add(body); pv.position.copy(q); pv.lookAt(q.clone().add(nrm)); o.add(pv);
        // la zip e la toppa
        const zip = Bx(chest ? .15 : .11, .004, .004, '#141416', 0, chest ? .018 : .045, chest ? .026 : .024); if (chest) { zip.rotation.z = -.55; zip.position.set(0, 0, .026); } pv.add(zip);
        const tag = Bx(.03, .02, .003, lm(/^#[0-3]/.test(c.col) ? '#d8d4cc' : '#1a1a1c'), chest ? -.02 : 0, chest ? -.01 : -.02, chest ? .027 : .024); pv.add(tag);
        const top = new THREE.Vector3(sp.x - .01, sp.y + .055 + outer, sp.z), backP = trunkAt(B, bn.Chest.y - .02, Math.PI - .5, outer + .006).p, frontP = trunkAt(B, bn.Chest.y + .02, -.9, outer + .006).p, side = trunkAt(B, chest ? bn.Chest.y - .07 : B.waist + .06, chest ? 1.4 : 1.6, outer + .008).p;
        const cu = new THREE.CatmullRomCurve3([q.clone().add(new THREE.Vector3(-.05, .04, -.01)), frontP, top, backP, trunkAt(B, chest ? bn.Chest.y - .08 : B.waist + .05, Math.PI - 2, outer + .006).p, side, q.clone().add(new THREE.Vector3(.06, .03, -.01))]);
        o.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 48, .0045, 4), lm('#141416'))); AT('Chest', o); }
      if (c.acc === 'catenina') {   // catenina sottile d'argento, corta, col ciondolo
        const o = new THREE.Group(), pts = []; for (let i = 0; i <= 16; i++) { const a = -1.3 + i / 16 * 2.6, y = B.neck - .01 - Math.cos(a / 1.3 * Math.PI / 2) * .05; pts.push(trunkAt(B, y, a, torsoOut + .002).p); }
        const l1 = trunkAt(B, B.neck + .005, 2, torsoOut + .002).p, l2 = trunkAt(B, B.neck + .005, -2, torsoOut + .002).p, cu = new THREE.CatmullRomCurve3([l2, ...pts, l1]);
        o.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 40, .0018, 4), lm(c.col))); o.add(Sp(.006, c.col, pts[8].x, pts[8].y - .008, pts[8].z + .003)); AT('Chest', o); }
      if (c.acc === 'borsetta') {   // borsetta: corpo con la patta, chiusura dorata, tracolla alla spalla
        const o = new THREE.Group(), mt = FM('pelle', c.col, c.col, c.col, 1), sp = bn.ShoulderL, hip = trunkAt(B, bn.Hips.y + .02, 1.7, outer + .03).p;
        const bb = new THREE.Mesh(sacca(.2, .12, .05, .03, .008), mt); bb.rotation.y = Math.PI / 2 - .3; bb.position.copy(hip); o.add(bb);
        const fl = Bx(.16, .05, .012, mt, hip.x, hip.y + .03, hip.z); fl.rotation.y = Math.PI / 2 - .3; o.add(fl); o.add(Bx(.015, .012, .006, '#d8b860', hip.x + .02, hip.y + .01, hip.z + .03));
        const top = new THREE.Vector3(sp.x + .02, sp.y + .06 + outer, sp.z), cu = new THREE.CatmullRomCurve3([hip.clone().add(new THREE.Vector3(0, .04, -.03)), new THREE.Vector3(top.x + .04, (top.y + hip.y) / 2, top.z - .06), top, new THREE.Vector3(top.x - .06, top.y - .02, top.z + .09), hip.clone().add(new THREE.Vector3(-.01, .04, .04))]);
        o.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 24, .005, 4), lm('#2a1a14'))); AT('Chest', o); }
      if (c.acc === 'orologio') { const tb = Sartoria.tube(B, 'manicaL'), s = tb.sNear(bn.WristL) - .035, fr = Sartoria.frameAt(tb, s), o = new THREE.Group(); let best = 0, bx = -9; for (let a = -Math.PI; a < Math.PI; a += .2) { const p = Sartoria.surf(tb, s, a, 0); if (p.x > bx) { bx = p.x; best = a; } }
        const ring = []; for (let i = 0; i <= 16; i++) ring.push(Sartoria.surf(tb, s, -Math.PI + i / 16 * Math.PI * 2, (th.avambracci || 0) + .004)); o.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 20, .006, 4, true), lm('#2a2a2e')));
        const fp = Sartoria.surf(tb, s, best, (th.avambracci || 0) + .009), face = Cy(.016, .016, .008, c.col, fp.x, fp.y, fp.z, 14); face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fp.clone().sub(fr.p).normalize()); o.add(face);
        const dial = Cy(.012, .012, .009, '#f0ece0', fp.x, fp.y, fp.z, 14); dial.quaternion.copy(face.quaternion); o.add(dial); AT('WristL', o); }
      if (c.acc === 'anelli') for (const s of ['L', 'R']) { const w = bn['Wrist' + s], o = new THREE.Group(), sg = s === 'L' ? 1 : -1; const t = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), lm(c.col)); t.position.set(w.x + sg * .012, w.y - .085, w.z + .02); t.rotation.x = Math.PI / 2; o.add(t); AT('Wrist' + s, o); }
      if (c.acc === 'tacco' && !window.Pittura) for (const s of ['L', 'R']) { const f = bn['Foot' + s], o = new THREE.Group(); let mz = 9, mx = 0; for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'piedi' && B.side[i] === (s === 'L' ? 1 : -1) && B.P[i * 3 + 1] < .05) { if (B.P[i * 3 + 2] < mz) { mz = B.P[i * 3 + 2]; mx = B.P[i * 3]; } }
        if (mz < 9) { o.add(Cy(.012, .008, .055, c.col, mx, .028, mz + .02, 8)); AT('Foot' + s, o); } }
    });
    // nella sinistra
    if (held) { const wL = bn.WristL, o = new THREE.Group(), p = wL.clone().add(new THREE.Vector3(.01, -.08, .04)); const C0 = typeof Oggetti !== 'undefined' && Oggetti.CAT[held]; const big = C0 && C0.peso > 1;
      const om = window.Officina && Officina.held(held); let m = om || null;
      if (!m && window.Forme && Forme.held) m = Forme.held(held, C0);
      if (!m) { m = new THREE.Group(); if (/torcia/.test(held)) { const t = Cy(.025, .03, .2, '#2a2a2e'); t.rotation.x = Math.PI / 2; m.add(t); } else m.add(Bx(big ? .12 : .08, big ? .14 : .08, big ? .1 : .05, '#6a5a4a')); }
      m.position.copy(p); o.add(m); AT('WristL', o); }
  }
  // i pezzi come prima (senza Sartoria: per sicurezza)
  function accessoriesOld(g, outfit, held) { }

  // ---------------- VESTIRE UNA PERSONA ----------------
  function strip(g) { if (g.userData) g.userData.spessore = null;   // [animazioni]
    if (window.Pittura) Pittura.spoglia(g);
    g.traverse(o => { if (o.userData && o.userData.pmHid) { o.visible = true; o.userData.pmHid = false; } if (o.userData && o.userData.pmGeo) { o.geometry = o.userData.pmGeo; o.userData.pmGeo = null; } });   // i capelli tornano
    g.traverse(o => { if (o.isSkinnedMesh && o.userData.geo0) { o.geometry = o.userData.geo0; o.userData.hid = null; } });   // [vestiti] la pelle torna intera
    const rm = []; g.traverse(o => { if (o.userData && o.userData.vesti) rm.push(o); }); rm.forEach(o => { if (o.parent) o.parent.remove(o); if (o.geometry && o.isSkinnedMesh && !o.geometry.userData.sartoria) o.geometry.dispose(); }); }
  function bare(g, look) {
    // i vestiti del modello diventano pelle: da qui in su si veste coi gusci
    const skin = (look && look.skin) || '#dcae88';
    g.traverse(o => {
      if (!o.isSkinnedMesh || o.userData.vesti || o.userData.bared) return; o.userData.bared = true;
      const head = /Head/i.test(o.name);
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const nm = ms.map(x => { if (x.name === 'Worker_Yellow' && head) { const c = x.clone(); c.visible = false; return c; }   // [vestiti] il casco giallo del kit, nella testa
        if (KEEP.test(x.name) || (head && !/^(White|Grey|Black|Purple|LightBlue|Orange|Brown2|LimeGreen|Worker_Vest|Worker_Yellow|Red_Dark|LightBrown)$/.test(x.name))) return x; const c = x.clone(); c.color.set(skin); if (c.emissive) c.emissive.set(skin).multiplyScalar(.3); return c; });
      o.material = Array.isArray(o.material) ? nm : nm[0];
    });
  }
  // il corredo di models.js (cappelli, occhiali, borse a scatola) lascia il posto ai capi veri
  const LOOK_HAT = { cap: 'cappellino', capback: 'cappellino', flat: 'coppola', fedora: 'cappello', beanie: 'berretto', scarf: 'fazzoletto', police: 'berretto_guardia', sunhat: 'cappello_paglia', hard: 'casco_cantiere' };
  function fromLook(outfit, look, who) {
    const L = look || {}, has = z => outfit.some(c => c.zona === z || (c.acc && z === 'testa' && /^(beanie|flat|fedora|scarf|ushanka|casco|elmetto|passamontagna|antigas|cap|basco|fascia|police|paglia|hard)$/.test(c.acc)));
    const CAPO = Guardaroba.CAPO, add = (id, col) => { const C = CAPO[id] || EXTRA[id]; if (C && !outfit.some(c => c.id === id)) outfit.push(Object.assign({}, C, col ? { col } : {})); };
    if (who === 'cop' && !has('testa')) add('berretto_guardia');
    else if (L.hat && LOOK_HAT[L.hat] && !has('testa')) add(LOOK_HAT[L.hat], L.hatCol);
    const ex = (L.extra || '').split(',');
    if (ex.includes('shades')) add('occhiali_sole'); if (ex.includes('bag')) add('borsetta'); if (ex.includes('gold')) add('collana_oro'); if (ex.includes('shawl')) add('scialle');
    return outfit;
  }
  const EXTRA = {
    berretto_guardia: { id: 'berretto_guardia', zona: 'testa', parti: [], sp: 0, col: '#2a3040', acc: 'police' },
    cappello_paglia: { id: 'cappello_paglia', zona: 'testa', parti: [], sp: 0, col: '#8a2a2a', acc: 'paglia' },
    casco_cantiere: { id: 'casco_cantiere', zona: 'testa', parti: [], sp: 0, col: '#e8b83a', acc: 'hard' },
  };
  function dress(g, outfit, look, held, seed) {
    strip(g); bare(g, look);
    // gli abitanti: ogni capo nella sua variante (scollo a V, collo alto, righe, quadri…), sempre la stessa per persona
    if (seed !== undefined && window.Sartoria) outfit.forEach(c => { const V = Sartoria.VARIANTI[c.id]; if (V && !c.var) c.var = V[hsh(String(seed) + c.id) % V.length]; });
    // il corredo a scatole di models.js: via (resta solo quello che non è un vestito, come i baffi)
    g.traverse(o => { if (o.userData && o.userData.corredo && o.userData.corredo !== 'baffi') o.visible = false; });
    // unità: quanti metri vale un'unità della geometria (il personaggio è alto 1,8 m)
    let unit = g.userData.vUnit;
    if (!unit) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; g.traverse(o => { if (!o.isSkinnedMesh || o.userData.vesti) return; const A = analyze(o); if (A) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], A.lo[k]); hi[k] = Math.max(hi[k], A.hi[k]); } });
      const R = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); unit = g.userData.vUnit = R > 0 && R < 1e8 ? 1.75 / R : .01; }
    g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) analyze(o); });   // prima si sgonfiano i corpi
    let D = null;
    if (window.Sartoria) try {
      { const CUT = Sartoria.CUT_(), B0 = Sartoria.body(g, PARTI); outfit.forEach(c => { const Cc = CUT[c.id] || {}; if (!Cc.solo_gonna || !B0) return;   // la maglia fuori dalla gonna: la gonna comincia sotto il suo orlo
        const out = outfit.find(o => (CUT[o.id] || {}).cl <= 1 && (o.parti || []).includes('torso') && (o.when || 0) > (c.when || 0) && c.when > 0); if (out) c.faldaTop = B0.bones.Hips.y - .07; }); }
      D = Sartoria.dress(g, outfit, PARTI, seed === undefined ? 'player' : String(seed), { soloFalde: !!window.Pittura });
      if (D) {
        const srcs = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) srcs.push(o); });
        const ref = srcs.find(o => /Body/i.test(o.name)) || srcs[0];
        D.meshes.forEach(m => { m.position.copy(ref.position); m.quaternion.copy(ref.quaternion); m.scale.copy(ref.scale); ref.parent.add(m); m.bind(ref.skeleton, ref.bindMatrix); });
        // la pelle e i vestiti del kit coperti si tolgono
        const flag = Sartoria.covered(D.B, D.cover), per = new Map();
        for (let i = 0; i < flag.length; i++) if (flag[i]) { const s = D.B.srcOf[i]; let a = per.get(s); if (!a) per.set(s, a = []); a.push(D.B.idxOf[i]); }
        srcs.forEach((src, si) => { const A = analyze(src); if (!A) return; const ex = new Uint8Array(A.part.length); (per.get(si) || []).forEach(i => { ex[i] = 1; }); hideCovered(src, A, [], ex); });
        const S = g.userData.spessore = g.userData.spessore || {}; for (const k in D.th) S[k] = Math.max(S[k] || 0, D.th[k]);
      }
    } catch (e) { console.error('[Vesti3D] sartoria', e); D = null; }
    try { shells(g, outfit, unit, D && D.B); } catch (e) { console.error('[Vesti3D] gusci', e); }
    if (window.Pittura) try { Pittura.dipingi(g, outfit, look, PARTI); } catch (e) { console.error('[Vesti3D] pittura', e); }   // i vestiti dipinti sul corpo
    try { accessories(g, outfit, held, D); } catch (e) { console.error('[Vesti3D] pezzi', e); }
    if (window.Officina) try { Officina.onDress(g, outfit); } catch (e) { console.error('[Vesti3D] officina', e); }   // [studio]
  }
  const npcByLook = new WeakMap(); let npcSt = null;
  function npcOf(look) {
    const st = ST(); if (!st || !look) return null;
    if (npcSt !== st) { npcSt = st; st.npcs.forEach(n => { if (n.look) npcByLook.set(n.look, n); }); }
    let n = npcByLook.get(look); if (!n) { n = st.npcs.find(k => k.look === look); if (n) npcByLook.set(look, n); }
    return n;
  }
  const wsig = st => { const p = st.player, W = p.worn || {}; return JSON.stringify([Guardaroba.ZORD.map(z => W[z]), W.sx]); };
  function hook() {
    if (!window.Models || !Models.person || Models.person.__vesti || typeof Guardaroba === 'undefined') return false;
    const p0 = Models.person;
    Models.person = function (look, who) {
      const g = p0.apply(this, arguments); if (!g) return g;
      try {
        const st = ST(), fem = /^(Casual|Formal)$/.test(g.userData.model || '');
        if (who === 'player' && st) { Guardaroba.worn(st); dress(g, Guardaroba.outfitOfPlayer(st), look, st.player.worn && st.player.worn.sx); g.userData.wsig = wsig(st); players.add(g); }
        else { const n = npcOf(look) || { id: JSON.stringify(look || {}).length + (look && look.top || ''), look: look || {} }; if (who === 'cop' && !n.cop) n.cop = true; dress(g, fromLook(Guardaroba.outfitOf(n, fem), look, who), look, null, n.id); }
      } catch (e) { console.error('[Vesti3D]', e); }
      return g;
    };
    Models.person.__vesti = true;
    return true;
  }
  // quando Nino si cambia, si ricambia anche il modello (in strada e nei ritratti)
  function loop() {
    try {
      const st = ST();
      if (st && players.size) { const s = wsig(st); players.forEach(g => { if (!g.parent && !g.userData.keep) { players.delete(g); return; } if (g.userData.wsig !== s) { g.userData.wsig = s; dress(g, Guardaroba.outfitOfPlayer(st), null, st.player.worn && st.player.worn.sx); } }); }
    } catch (e) { }
    requestAnimationFrame(loop);
  }
  const iv = setInterval(() => { if (hook()) { clearInterval(iv); requestAnimationFrame(loop); } }, 50);
  return { dress, strip, players, analyze, PARTI, fromLook, EXTRA };
})();
