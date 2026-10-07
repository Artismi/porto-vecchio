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
    tacchi: ['pelle', '#1a1010'], scarpe_corsa: ['nylon', '#f4f2ee'], stivali_pelle: ['pelle', '#120c0a'], mocassini: ['pelle', '#2a1a10'], calzini: ['costine', null], guanti_lana: ['costine', null], guanti: ['pelle', null] };
  function shells(g, outfit, unit, B) {
    const meshes = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) meshes.push(o); });
    const out = [], rel = new THREE.Matrix4(), gi = new THREE.Matrix4(); g.updateMatrixWorld(true); gi.copy(g.matrixWorld).invert();
    const LL = outfit.filter(c => c.parti && c.parti.some(p => p === 'piedi' || p === 'mani'));
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
  const M_ = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Bx = (w, h, d, c, x, y, z) => M_(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? lm(c) : c, x, y, z);
  const Cy = (rt, rb, h, c, x, y, z, seg, open) => M_(new THREE.CylinderGeometry(rt, rb, h, seg || 16, 1, !!open), typeof c === 'string' ? lm(c) : c, x, y, z);
  const Sp = (r, c, x, y, z, half) => M_(new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), typeof c === 'string' ? lm(c) : c, x, y, z);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  // un profilo girato (cupole, corone, calotte): punti [raggio, altezza] dal bordo alla cima
  const lathe = (pts, mat, seg) => { const g = new THREE.LatheGeometry(pts.map(p => V2(Math.max(0, p[0]), p[1])), window.Pittura ? Math.min(seg || 24, 10) : seg || 24); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
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
  function headAcc(kind, c, T, k) {
    const h = new THREE.Group(), r = T.r * (1 + k * .04) + .004, H = Math.max(.09, T.top - T.brow) + .012 + k * .006;
    switch (kind) {
      case 'beanie': {   // berretto di lana: calotta a costine, risvolto, a volte il pon pon
        const mt = FM('costine', c); h.add(lathe([[r + .004, -.02], [r + .006, .03], [r * .97, H * .62], [r * .72, H * .92], [r * .35, H + .015], [0, H + .02]], mt));
        h.add(lathe([[r + .012, -.025], [r + .016, -.005], [r + .016, .025], [r + .01, .03]], FM('costine', sh(c, .9))));
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
        const bm = brim(r + .004, r + .1, (a, t) => { const ca = Math.cos(a); return -.004 + t * (ca > 0 ? -.012 * ca : .018 * -ca) + t * t * .012 * Math.pow(Math.sin(a), 2); }, mt, 40); bm.scale.set(1, 1, 1.08);
        h.add(cr, band, bm); break; }
      case 'ushanka': {   // colbacco: cupola di pelo, fascia, paraorecchie, la falda davanti alzata
        const fm = FM('pelo', c), dome = lathe([[r + .02, -.01], [r + .022, .04], [r * .96, H * .8], [r * .6, H + .02], [0, H + .035]], FM('scamosciato', sh(c, .8)));
        const band = lathe([[r + .03, -.03], [r + .036, .0], [r + .034, .045], [r + .022, .05]], fm);
        const eL = Sp(.07, fm, -(r + .02), -.07, -.01), eR = Sp(.07, fm, r + .02, -.07, -.01); eL.scale.set(.42, 1.35, 1); eR.scale.set(.42, 1.35, 1);
        const fr = Sp(.08, fm, 0, .045, r + .03); fr.scale.set(1.9, .75, .4); fr.rotation.x = -.35; h.add(dome, band, eL, eR, fr); break; }
      case 'scarf': {   // fazzoletto da testa: aderente, copre i capelli, nodo sotto il mento, la punta dietro
        const rs = Math.min(r, T.rSkull + .03), mt = FM('paisley', c, sh(c, 1.5), '#e8d8a0'), H2 = Math.min(H, T.skTop - T.brow + .03), dome = lathe([[rs + .006, -.07], [rs + .01, -.01], [rs + .006, H2 * .5], [rs * .7, H2 * .9], [0, H2 + .006]], mt);
        dome.geometry.scale(1, 1, 1.08); const p = dome.geometry.attributes.position; for (let i = 0; i < p.count; i++) if (p.getZ(i) > r * .4 && p.getY(i) < .0) p.setZ(i, p.getZ(i) * .6); p.needsUpdate = true; dome.geometry.computeVertexNormals();
        const tail = new THREE.Mesh(new THREE.ConeGeometry(.06, .13, 3), mt); tail.position.set(0, -.1, -(r + .02)); tail.rotation.x = Math.PI + .25; tail.scale.z = .35;
        const knot = Sp(.022, mt, 0, T.chin - T.brow + .015, T.front - T.cz - .03); h.add(dome, tail, knot); break; }
      case 'casco': {   // casco jet anni '80: calotta lucida aperta davanti, riga, bordo imbottito, cinturino
        const R = r + .03, mt = FM('gomma', c, c, c, 1), top = M_(new THREE.SphereGeometry(R, 24, 14, 0, Math.PI * 2, 0, 1.15), mt);
        const side = M_(new THREE.SphereGeometry(R, 24, 8, Math.PI * .27, Math.PI * 1.46, 1.15, .95), mt); side.rotation.y = Math.PI;
        const stripe = M_(new THREE.SphereGeometry(R + .002, 4, 12, -.1, .2, 0, 1.6), lm('#ece8dc')); stripe.rotation.y = Math.PI / 2;
        const rim = M_(new THREE.TorusGeometry(R * .97, .012, 6, 28, Math.PI * 1.45), lm('#141416')); rim.rotation.x = Math.PI / 2; rim.rotation.z = Math.PI * .275 + Math.PI; rim.position.y = -R * .55;
        [top, side, stripe].forEach(o => { o.position.y = H * .3; o.scale.set(1, 1.02, 1.08); }); rim.position.y += H * .3; h.add(top, side, stripe); break; }
      case 'elmetto': {   // elmetto: calotta, bordo sporgente, telo, sottogola
        const mt = FM('ripstop', c, sh(c, .7), sh(c, 1.2)), R = r + .028, d = lathe([[R + .02, .0], [R + .02, .008], [R, .015], [R * .98, H * .5], [R * .78, H * .85], [R * .4, H + .025], [0, H + .03]], mt, 28);
        h.add(d); const st = new THREE.Mesh(new THREE.TorusGeometry(r * .82, .006, 4, 20, Math.PI), lm('#2a2418')); st.rotation.y = Math.PI / 2; st.rotation.z = Math.PI; st.position.set(0, -.02, -.01); st.scale.set(1, 1.3, 1); h.add(st); break; }
      case 'passamontagna': {   // aderente, fino al collo, la fessura per gli occhi
        const mt = FM('costine', c), hd = lathe([[T.rSkull * .62, T.chin - T.brow - .05], [T.rSkull * .7, T.chin - T.brow + .02], [r + .006, -.05], [r + .008, .02], [r * .96, H * .55], [r * .65, H * .9], [0, H + .01]], mt);
        hd.scale.set(1, 1, 1.06); const slit = Bx(.12, .028, .02, '#141010', 0, T.eyeY - T.brow, T.eyeZ - T.cz + .004); h.add(hd, slit); break; }
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
    const CUT = Sartoria.CUT_(), cut = c => CUT[c.id] || {}, after = (c, f) => outfit.slice(outfit.indexOf(c) + 1).some(f);
    const coversTorso = c => outfit.some(o => o !== c && (cut(o).cl >= 3) && (o.parti || []).includes('torso') && !cut(o).corto && !cut(o).davanti);   // maglioni e giacche coprono la cintura
    outfit.forEach(c => {
      const C = cut(c);
      // la cintura vera, con la fibbia
      if (C.cl === 2 && C.cintura && !C.gonna && !coversTorso(c)) {
        const tb = Pittura.frame(B).tubes[0], s = tb.sAtY(B.waist + .012), leather = /cuoio|jeans/.test(C.cintura), col = leather ? (C.cintura === 'jeans' ? '#5a3a22' : '#3a2418') : c.col;
        const o = new THREE.Group(); o.add(Pittura.orlo(B, 0, s, C.cintura === 'cuoio_fine' ? .026 : .036, .006, .006, 16, Pittura.blockMat('pelle', col, col, col, { vc: false })));
        const fr = Sartoria.frameAt(tb, s), p = Pittura.surfI(B, 0, s, 0, .013), n = p.clone().sub(fr.p).normalize(), bk = new THREE.Mesh(new THREE.BoxGeometry(.05, .046, .01), lm('#c8b070'));
        bk.position.copy(p); bk.lookAt(p.clone().add(n)); const hole = new THREE.Mesh(new THREE.BoxGeometry(.032, .028, .012), lm('#2a2016')); hole.position.copy(p).addScaledVector(n, .001); hole.lookAt(p.clone().add(n)); o.add(bk, hole); AT('Hips', o);
      }
      // i polsini rimboccati delle camicie (se nessuno ci va sopra)
      if ((C.polsi || C.risvolto_maniche) && (c.parti || []).includes('avambracci') && !after(c, o => (o.parti || []).includes('avambracci') && cut(o).cl >= 3)) for (const sd of ['L', 'R']) {
        const tb = Sartoria.tube(B, 'manica' + sd), Ls = Sartoria.lengths(B, tb, 'manica' + sd, C, c.parti); if (Ls.s1 < Ls.la) continue;
        const o = new THREE.Group(); o.add(Pittura.orlo(B, sd === 'L' ? 1 : 2, Ls.s1 - .022, .04, .008, .008, 10, Pittura.blockMat(C.fab || 'cotone', c.col, C.c2, C.c3, { vc: false }))); AT('LowerArm' + sd, o);
      }
      // il risvolto dei pantaloni
      if (C.cl === 2 && C.risvolto && !after(c, o => cut(o).gonna)) for (const sd of ['L', 'R']) {
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
  function accessories(g, outfit, held, D) {
    if (!window.Sartoria || !D || !D.B) return accessoriesOld(g, outfit, held);
    if (window.Pittura) try { volumi(g, outfit, D.B, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); Pittura.bordi(g, D.B, outfit, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); cappuccio(g, outfit, D.B, (bone, obj) => Sartoria.attach(g, PARTI, bone, obj)); } catch (e) { console.error('[Vesti3D] volumi', e); }
    const B = D.B, T = Sartoria.testa(g, PARTI), bn = B.bones, AT = (bone, obj) => Sartoria.attach(g, PARTI, bone, obj);
    const lay = D.lay || [], outer = lay.reduce((m, l) => Math.max(m, l.t || 0), 0) + .004, th = D.th || {};
    // spessore sotto la giacca: la cravatta sta sopra la camicia e sotto il revers
    const underJ = lay.filter(l => l.cl < 4 && l.parti.includes('torso')).reduce((m, l) => Math.max(m, l.t), 0) + .004;
    const torsoOut = (th.torso || 0) + .006;
    let kh = 0;
    outfit.forEach(c => {
      if (!c.acc) return;
      const isHat = /^(beanie|flat|fedora|scarf|ushanka|casco|elmetto|passamontagna|antigas|cap|basco|fascia|police|paglia|hard|cowboy)$/.test(c.acc);
      if (isHat && T) { const o = /^(cap|basco|fascia|police|paglia|hard|cowboy)$/.test(c.acc) ? headAcc2(c.acc, c.col, T, kh) : headAcc(c.acc, c.col, T, kh); kh++; o.position.set(T.cx, T.brow, T.cz); AT('Head', o); return; }
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
      if (c.acc === 'cravatta') {   // cravatta: nodo a trapezio, pala che si allarga, sotto il revers
        const o = new THREE.Group(), mt = FM('raso', c.col), yN = B.neck - .015;
        const kn = trunkAt(B, yN, 0, underJ + .004); const knot = new THREE.Mesh(new THREE.CylinderGeometry(.016, .01, .028, 4), mt); knot.rotation.y = Math.PI / 4; knot.scale.set(1, 1, .5); knot.position.copy(kn.p); o.add(knot);
        const pts = []; for (let i = 0; i <= 8; i++) { const y = yN - .02 - i * .045; pts.push(trunkAt(B, y, 0, underJ + .002)); }
        const P = [], I = []; pts.forEach((q, i) => { const w = .012 + i / 8 * .025; P.push(q.p.x - w, q.p.y, q.p.z, q.p.x + w, q.p.y, q.p.z); }); const tip = trunkAt(B, yN - .02 - 8 * .045 - .03, 0, underJ + .002); P.push(tip.p.x, tip.p.y, tip.p.z);
        for (let i = 0; i < 8; i++) I.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3); I.push(16, 18, 17);
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(P.map((v, i) => v * 8).filter((v, i) => i % 3 !== 2), 2)); gg.setIndex(I); gg.computeVertexNormals();
        o.add(new THREE.Mesh(gg, mt)); AT('Chest', o); return; }
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
        const q = trunkAt(B, y - .01, .15, outer + .03).p, po = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .13, 4, 10), FM('nylon', c.col, c.col, c.col, 1)); po.rotation.z = Math.PI / 2; po.scale.set(1, 1, .7); po.position.copy(q); o.add(po, Bx(.13, .004, .005, '#1a1a1a', q.x, q.y + .025, q.z + .025)); AT('Hips', o); }
      if (c.acc === 'borsetta') {   // borsetta: corpo con la patta, chiusura dorata, tracolla alla spalla
        const o = new THREE.Group(), mt = FM('pelle', c.col, c.col, c.col, 1), sp = bn.ShoulderL, hip = trunkAt(B, bn.Hips.y + .02, 1.7, outer + .03).p;
        const bb = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .12, 4, 10), mt); bb.rotation.z = Math.PI / 2; bb.scale.set(1, 1, .5); bb.position.copy(hip); o.add(bb);
        const fl = Bx(.16, .05, .012, mt, hip.x, hip.y + .03, hip.z); fl.rotation.y = Math.PI / 2 - .3; o.add(fl); o.add(Bx(.015, .012, .006, '#d8b860', hip.x + .02, hip.y + .01, hip.z + .03));
        const top = new THREE.Vector3(sp.x + .02, sp.y + .06 + outer, sp.z), cu = new THREE.CatmullRomCurve3([hip.clone().add(new THREE.Vector3(0, .04, -.03)), new THREE.Vector3(top.x + .04, (top.y + hip.y) / 2, top.z - .06), top, new THREE.Vector3(top.x - .06, top.y - .02, top.z + .09), hip.clone().add(new THREE.Vector3(-.01, .04, .04))]);
        o.add(new THREE.Mesh(new THREE.TubeGeometry(cu, 24, .005, 4), lm('#2a1a14'))); AT('Chest', o); }
      if (c.acc === 'orologio') { const tb = Sartoria.tube(B, 'manicaL'), s = tb.sNear(bn.WristL) - .035, fr = Sartoria.frameAt(tb, s), o = new THREE.Group(); let best = 0, bx = -9; for (let a = -Math.PI; a < Math.PI; a += .2) { const p = Sartoria.surf(tb, s, a, 0); if (p.x > bx) { bx = p.x; best = a; } }
        const ring = []; for (let i = 0; i <= 16; i++) ring.push(Sartoria.surf(tb, s, -Math.PI + i / 16 * Math.PI * 2, (th.avambracci || 0) + .004)); o.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 20, .006, 4, true), lm('#2a2a2e')));
        const fp = Sartoria.surf(tb, s, best, (th.avambracci || 0) + .009), face = Cy(.016, .016, .008, c.col, fp.x, fp.y, fp.z, 14); face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fp.clone().sub(fr.p).normalize()); o.add(face);
        const dial = Cy(.012, .012, .009, '#f0ece0', fp.x, fp.y, fp.z, 14); dial.quaternion.copy(face.quaternion); o.add(dial); AT('WristL', o); }
      if (c.acc === 'anelli') for (const s of ['L', 'R']) { const w = bn['Wrist' + s], o = new THREE.Group(), sg = s === 'L' ? 1 : -1; const t = new THREE.Mesh(new THREE.TorusGeometry(.011, .003, 5, 10), lm(c.col)); t.position.set(w.x + sg * .012, w.y - .085, w.z + .02); t.rotation.x = Math.PI / 2; o.add(t); AT('Wrist' + s, o); }
      if (c.acc === 'tacco') for (const s of ['L', 'R']) { const f = bn['Foot' + s], o = new THREE.Group(); let mz = 9, mx = 0; for (let i = 0; i < B.part.length; i++) if (B.part[i] === 'piedi' && B.side[i] === (s === 'L' ? 1 : -1) && B.P[i * 3 + 1] < .05) { if (B.P[i * 3 + 2] < mz) { mz = B.P[i * 3 + 2]; mx = B.P[i * 3]; } }
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
    // il corredo a scatole di models.js: via (resta solo quello che non è un vestito, come i baffi)
    g.traverse(o => { if (o.userData && o.userData.corredo && o.userData.corredo !== 'baffi') o.visible = false; });
    // unità: quanti metri vale un'unità della geometria (il personaggio è alto 1,8 m)
    let unit = g.userData.vUnit;
    if (!unit) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; g.traverse(o => { if (!o.isSkinnedMesh || o.userData.vesti) return; const A = analyze(o); if (A) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], A.lo[k]); hi[k] = Math.max(hi[k], A.hi[k]); } });
      const R = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); unit = g.userData.vUnit = R > 0 && R < 1e8 ? 1.75 / R : .01; }
    g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) analyze(o); });   // prima si sgonfiano i corpi
    let D = null;
    if (window.Sartoria) try {
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
