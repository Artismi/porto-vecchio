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

  // ---------------- I GUSCI ----------------
  const tmpC = new THREE.Color();
  const th = t => { let h = (t * 2654435761) >>> 0; h ^= h >>> 13; return (h % 1000) / 1000; };
  const FIORI = ['#e8c040', '#e85a8a', '#f0ece2', '#3a8a5a'];
  const pat = (g, c, cx, cy, cz, out, t, part) => {   // motivi per triangolo: righe, quadri, maculato, fiori…
    tmpC.set(c); const q = th(t), limb = /braccia|avambracci|cosce|polpacci/.test(part || '');
    switch (g.pat) {
      case 'righe': if (Math.floor(cy * 14) % 2) tmpC.multiplyScalar(.62); break;
      case 'righe_v': if (Math.floor((cx + cz) * 40) % 2) tmpC.set('#ece8dc'); break;
      case 'bande': if (limb && Math.floor((cx + cz) * 60) % 3 === 0) tmpC.set('#ece8dc'); break;
      case 'maculato': if (q < .28) tmpC.set('#3a2414'); else if (q < .4) tmpC.multiplyScalar(.75); break;
      case 'pelo': tmpC.multiplyScalar(.8 + q * .4); break;
      case 'fiori': if (q < .3) tmpC.set(FIORI[Math.floor(q * 13) % 4]); break;
      case 'quadretti': if ((Math.floor(cy * 24) + Math.floor((cx + cz) * 30)) % 2) tmpC.multiplyScalar(.75); break;
    }
    if (g.id === 'maglietta_righe' && Math.floor(cy * 9) % 2) tmpC.set('#ece8dc');
    if (g.id === 'camicia_quadri' && (Math.floor(cy * 7) + Math.floor((cx + cz) * 7)) % 2) tmpC.multiplyScalar(.6);
    if (g.id === 'velluto' && Math.floor((cx + cz) * 24) % 2) tmpC.multiplyScalar(.85);
    out[0] = tmpC.r; out[1] = tmpC.g; out[2] = tmpC.b;
  };
  function shells(g, outfit, unit) {
    const meshes = []; g.traverse(o => { if (o.isSkinnedMesh && !o.userData.vesti) meshes.push(o); });
    const out = [];
    meshes.forEach(src => {
      const A = analyze(src); if (!A) return;
      const P = [], N = [], SI = [], SW = [], CO = [], th = {}, col = [0, 0, 0];
      // spessore di ogni capo: cresce con gli strati sotto, nelle parti che copre
      const L = outfit.filter(c => c.parti && c.parti.length).map(c => { const set = new Set(c.parti); let base = 0; c.parti.forEach(p => { base = Math.max(base, th[p] || 0); }); const t = base + .0016 + c.sp * .17; /* [vestiti] strati più sottili (prima .0025 + sp·.32: con 4-5 capi si arrivava a 5 cm) */ c.parti.forEach(p => { th[p] = t; }); return { c, set, off: t / unit }; });
      { const S = g.userData.spessore = g.userData.spessore || {}; for (const k in th) S[k] = Math.max(S[k] || 0, th[k]); }   // [animazioni] le pose allargano le braccia sui vestiti spessi
      // ogni triangolo prende solo il capo più esterno che lo copre: niente strati che bucano quelli sopra
      for (let t = 0; t < A.idx.length; t += 3) {
        const a = A.idx[t], b = A.idx[t + 1], d = A.idx[t + 2];
        let G0 = null; for (let k = L.length - 1; k >= 0; k--) { const S0 = L[k].set; if ((S0.has(A.part[a]) + S0.has(A.part[b]) + S0.has(A.part[d])) >= 2) { G0 = L[k]; break; } }
        if (!G0) continue; const c = G0.c;
        const cx = (A.pos.getX(a) + A.pos.getX(b) + A.pos.getX(d)) / 3, cy = ((A.pos.getY(a) + A.pos.getY(b) + A.pos.getY(d)) / 3 - A.ymin) / ((A.ymax - A.ymin) || 1), cz = (A.pos.getZ(a) + A.pos.getZ(b) + A.pos.getZ(d)) / 3;
        pat(c, c.col, cx * unit, cy, cz * unit, col, t / 3, A.part[a]);
        { const S0 = G0.set, nIn = S0.has(A.part[a]) + S0.has(A.part[b]) + S0.has(A.part[d]); const f = nIn < 3 ? .74 : 1 - Math.max(0, .5 - cy) * .12; col[0] *= f; col[1] *= f; col[2] *= f; }   // [vestiti] orli scuri e un filo d'ombra in basso
        const lift = c.id === 'gonna' ? 2.2 : c.id === 'cappotto' || c.id === 'impermeabile' ? 1.3 : 1;
        for (const v of [a, b, d]) {
          const k = (A.part[v] === 'cosce' || A.part[v] === 'bacino') ? G0.off * lift : G0.off;
          P.push(A.pos.getX(v) + A.sm[v * 3] * k, A.pos.getY(v) + A.sm[v * 3 + 1] * k, A.pos.getZ(v) + A.sm[v * 3 + 2] * k);
          N.push(A.sm[v * 3], A.sm[v * 3 + 1], A.sm[v * 3 + 2]);
          for (let q = 0; q < 4; q++) { SI.push(comp(A.si, v, q)); SW.push(comp(A.sw, v, q)); }
          CO.push(col[0], col[1], col[2]);
        }
      }
      // [vestiti] la pelle coperta da un vestito si toglie: niente ginocchia, spalle o dita che bucano la stoffa
      hideCovered(src, A, L);
      if (!P.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4)); geo.setAttribute('color', new THREE.Float32BufferAttribute(CO, 3));
      const m = new THREE.SkinnedMesh(geo, MAT()); m.userData.vesti = true; m.castShadow = true; m.frustumCulled = false;
      m.position.copy(src.position); m.quaternion.copy(src.quaternion); m.scale.copy(src.scale);
      src.parent.add(m); m.bind(src.skeleton, src.bindMatrix); out.push(m);
    });
    return out;
  }
  // toglie dal corpo i triangoli con tutti e tre i vertici sotto un capo (la geometria intera resta in userData.geo0)
  function hideCovered(src, A, L) {
    const geo0 = src.userData.geo0 || (src.userData.geo0 = src.geometry), U = new Set(); L.forEach(l => l.set.forEach(p => U.add(p)));
    const cov = t => U.has(A.part[A.idx[t]]) && U.has(A.part[A.idx[t + 1]]) && U.has(A.part[A.idx[t + 2]]);
    const groups = geo0.groups && geo0.groups.length ? geo0.groups : [{ start: 0, count: A.idx.length, materialIndex: 0 }];
    const keep = [], ng = new THREE.BufferGeometry();
    for (const gr of groups) { const st0 = keep.length; for (let t = gr.start; t < gr.start + gr.count; t += 3) if (!cov(t)) keep.push(A.idx[t], A.idx[t + 1], A.idx[t + 2]); if (geo0.groups && geo0.groups.length) ng.addGroup(st0, keep.length - st0, gr.materialIndex); }
    for (const k in geo0.attributes) ng.setAttribute(k, geo0.attributes[k]);
    ng.setIndex(keep); ng.boundingBox = geo0.boundingBox; ng.boundingSphere = geo0.boundingSphere;
    src.geometry = ng;   // niente dispose: gli attributi sono condivisi con la geometria intera
  }
  let _mat = null; const MAT = () => _mat || (_mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color('#181614'), side: THREE.DoubleSide }));

  // ---------------- I PEZZI AGGANCIATI ----------------
  const sh = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const LM = {}; const lm = c => LM[c] || (LM[c] = new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(.25) }));
  const Bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Cy = (rt, rb, h, c, x, y, z, seg) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const Sp = (r, c, x, y, z, half) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), lm(c)); m.position.set(x || 0, y || 0, z || 0); return m; };
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function pin(g, bone, obj, x, y, z) {
    g.updateMatrixWorld(true); bone.getWorldQuaternion(_q); bone.getWorldScale(_v); const sc = _v.x;
    const p = new THREE.Vector3(x, y, z); g.localToWorld(p); bone.worldToLocal(p); obj.position.copy(p);
    g.getWorldQuaternion(_q2); obj.quaternion.copy(_q.invert().multiply(_q2)); obj.scale.setScalar(1 / sc * (obj.userData.k || 1)); bone.add(obj);
    obj.userData.vesti = true; obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return obj;
  }
  const wpos = (g, b) => { g.updateMatrixWorld(true); const v = new THREE.Vector3(); b.getWorldPosition(v); return g.worldToLocal(v); };
  function headAcc(kind, c, k) {
    const h = new THREE.Group(), s = 1 + k * .09;
    switch (kind) {
      case 'beanie': h.add(Cy(.128, .14, .08, c, 0, -.01, -.01), Sp(.128, c, 0, .03, -.01, true), Cy(.142, .142, .03, sh(c, .8), 0, -.04, -.01)); break;
      case 'flat': h.add(Cy(.145, .14, .05, c, 0, 0, .01, 14), Bx(.17, .02, .08, c, 0, -.02, .13)); break;
      case 'fedora': h.add(Cy(.11, .125, .13, c, 0, .04, 0, 14), Cy(.23, .23, .015, c, 0, -.02, 0, 18), Cy(.127, .127, .028, '#1a1418', 0, 0, 0, 14)); break;
      case 'scarf': {   // [vestiti] fazzoletto aderente, annodato sotto il mento, la punta dietro
        const cap = Sp(.135, c, 0, -.03, -.01, true); cap.scale.set(1.02, 1.1, 1.08); const back = Sp(.13, c, 0, -.06, -.03); back.scale.set(1, .9, 1); h.add(cap, back);
        const knot = Sp(.03, sh(c, .85), 0, -.2, .07); const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .14, 4), lm(sh(c, .9))); tail.position.set(0, -.17, -.12); tail.rotation.x = Math.PI + .3; h.add(knot, tail); break; }
      case 'ushanka': {   // [vestiti] colbacco: cupola di pelo, paraorecchie morbidi, la falda davanti alzata
        const dome = Sp(.15, c, 0, .0, 0, true); dome.scale.set(1, .85, 1.02); const band = Cy(.155, .158, .07, sh(c, .85), 0, -.01, 0, 18);
        const eL = Sp(.07, sh(c, .85), -.14, -.09, 0), eR = Sp(.07, sh(c, .85), .14, -.09, 0); eL.scale.set(.6, 1.4, 1); eR.scale.set(.6, 1.4, 1);
        const fr = Sp(.08, sh(c, .85), 0, .03, .14); fr.scale.set(2, .7, .5); h.add(dome, band, eL, eR, fr); break; }
      case 'casco': {   // [vestiti] casco jet anni '80: calotta lucida aperta davanti, riga bianca, bordo nero
        const r = .168, top = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 8, 0, Math.PI * 2, 0, 1.05), lm(c));
        const side = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 6, Math.PI / 2 + .8, Math.PI * 2 - 1.6, 1.05, 1.0), lm(c));
        const stripe = new THREE.Mesh(new THREE.SphereGeometry(r + .003, 4, 12, -.08, .16, 0, 2.05), lm('#ece8dc')); stripe.rotation.y = Math.PI / 2;   // spicchio sottile da davanti a dietro
        [top, side, stripe].forEach(o => { o.position.y = -.03; o.scale.set(1, 1.04, 1.08); }); h.add(top, side, stripe); break; }
      case 'elmetto': h.add(Sp(.16, c, 0, -.02, 0, true), Cy(.2, .2, .02, c, 0, -.02, 0, 16)); break;
      case 'passamontagna': {   // [vestiti] aderente, fino al collo, una fessura per gli occhi
        const hd = Sp(.132, c, 0, -.07, 0); hd.scale.set(1, 1.3, 1.08); const nk = Cy(.09, .1, .1, c, 0, -.22, -.01, 14);
        const slit = Bx(.13, .03, .02, '#2a2020', 0, -.085, .138); h.add(hd, nk, slit); break; }
      case 'antigas': h.add(Bx(.2, .16, .08, c, 0, -.12, .12), Cy(.05, .06, .09, '#202420', 0, -.18, .2, 10), Cy(.035, .035, .02, '#8ab0b0', -.05, -.07, .165, 10), Cy(.035, .035, .02, '#8ab0b0', .05, -.07, .165, 10)); h.children[1].rotation.x = Math.PI / 2; h.children[2].rotation.x = Math.PI / 2; h.children[3].rotation.x = Math.PI / 2; break;
    }
    h.scale.setScalar(s); return h;
  }
  function accessories(g, outfit, held) {
    const m = g.children.find(o => o.userData && o.userData.body) || g; const root = g;
    const bone = n => { let b = null; root.traverse(o => { if (!b && o.isBone && o.name === n) b = o; }); return b; };
    const head = bone('Head'), neck = bone('Neck'), chest = bone('Chest'), shL = bone('UpperArmL'), shR = bone('UpperArmR'), knL = bone('LowerLegL'), knR = bone('LowerLegR'), wL = bone('WristL'), wR = bone('WristR'), hips = bone('Hips'), ftL = bone('FootL'), ftR = bone('FootR'), ulL = bone('UpperLegL'), ulR = bone('UpperLegR');
    let kh = 0;
    outfit.forEach(c => {
      if (!c.acc) return;
      if (/beanie|flat|fedora|scarf|ushanka|casco|elmetto|passamontagna|antigas/.test(c.acc) && head) { const hp = wpos(g, head); pin(g, head, headAcc(c.acc, c.col, kh++), hp.x, hp.y + .19, hp.z + .01); }
      if (c.acc === 'sciarpa' && (neck || chest)) { const b = neck || chest, p = wpos(g, b), s = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(.1, .045, 8, 14), lm(c.col)); t.rotation.x = Math.PI / 2; s.add(t, Bx(.08, .26, .03, c.col, .05, -.14, .1)); if (c.id === 'sciarpa_righe') [0, 1, 2].forEach(i => s.add(Bx(.085, .03, .035, '#ece8dc', .05, -.06 - i * .07, .1))); pin(g, b, s, p.x, p.y + (neck ? .02 : .22), p.z); }
      if (c.acc === 'paraspalle') [shL, shR].forEach((b, i) => { if (!b) return; const p = wpos(g, b), s = new THREE.Group(); const sp = Sp(.1, c.col, 0, 0, 0, true); sp.scale.set(1.1, .7, 1.1); s.add(sp); pin(g, b, s, p.x + (i ? -.03 : .03) * 0, p.y + .03, p.z); });
      if (c.acc === 'paraginocchia') [knL, knR].forEach(b => { if (!b) return; const p = wpos(g, b); pin(g, b, Bx(.11, .13, .05, c.col), p.x, p.y + .02, p.z + .08); });
      const at = (b, f) => { if (!b) return; const p = wpos(g, b), s = new THREE.Group(); f(s); return [p, s]; };
      const put = (b, dx, dy, dz, f) => { const r = at(b, f); if (r) pin(g, b, r[1], r[0].x + dx, r[0].y + dy, r[0].z + dz); };
      if (/^(cap|basco|fascia)$/.test(c.acc) && head) { const hp = wpos(g, head), s = new THREE.Group(); const k = 1 + kh++ * .09;
        if (c.acc === 'cap') { const dm = Sp(.132, c.col, 0, -.06, 0, true); dm.scale.set(1, .85, 1.05); const vis = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .012, 14, 1, false, -Math.PI / 2, Math.PI), lm(sh(c.col, .85))); vis.scale.set(1.05, 1, 1.1); vis.position.set(0, -.065, .1); vis.rotation.x = .12; s.add(dm, vis, Cy(.012, .012, .01, sh(c.col, .7), 0, .05, 0, 8)); }   // [vestiti] cupola bassa, visiera curva, il bottone in cima
        if (c.acc === 'basco') { const b0 = Cy(.15, .13, .04, c.col, .02, 0, 0, 14); b0.rotation.z = -.15; s.add(b0, Cy(.01, .01, .03, c.col, .02, .03, 0, 6)); }
        if (c.acc === 'fascia') s.add(Cy(.142, .142, .035, c.col, 0, -.07, 0, 14));
        s.scale.setScalar(k); pin(g, head, s, hp.x, hp.y + .19, hp.z + .01); }
      if (c.acc === 'occhiali' && head) { const hp = wpos(g, head); put(head, 0, .085, .125, s => { s.add(Bx(.08, .045, .012, c.col, -.045, 0, 0), Bx(.08, .045, .012, c.col, .045, 0, 0), Bx(.2, .01, .01, '#c8b060', 0, .02, 0)); }); }
      if (c.acc === 'cravatta') put(chest, 0, .14, .135, s => { s.add(Bx(.05, .04, .02, c.col, 0, .04, 0), Bx(.055, .26, .015, c.col, 0, -.11, 0)); });
      if (c.acc === 'papillon') put(chest, 0, .165, .135, s => { [-1, 1].forEach(k => { const w = new THREE.Mesh(new THREE.ConeGeometry(.032, .055, 4), lm(c.col)); w.rotation.z = k * Math.PI / 2; w.position.x = k * .03; s.add(w); }); s.add(Bx(.02, .022, .022, sh(c.col, .8))); });   // [vestiti] due ali e il nodo
      if (c.acc === 'collana') put(chest, 0, .16, .03, s => { const t = new THREE.Mesh(new THREE.TorusGeometry(.105, .006, 5, 28), lm(c.col)); t.rotation.x = -1.02; t.scale.set(1, 1.15, 1); s.add(t); const md = Cy(.014, .014, .005, c.col, 0, -.075, .1, 10); md.rotation.x = Math.PI / 2; s.add(md); });   // [vestiti] intorno al collo, scende sul petto, una medaglietta
      if (c.acc === 'perle') put(chest, 0, .13, .1, s => { for (let i = 0; i < 12; i++) { const a = Math.PI * (i / 11) + Math.PI; s.add(Sp(.014, c.col, Math.cos(a) * .1, Math.sin(a) * .07, .03)); } });
      if (c.acc === 'foulard') put(neck || chest, 0, neck ? -.02 : .2, .08, s => { const b0 = Bx(.13, .1, .02, c.col); b0.rotation.z = Math.PI / 4; s.add(b0); });
      if (c.acc === 'colletto') put(chest, 0, .21, .05, s => { s.add(Bx(.22, .04, .2, c.col)); });
      if (c.acc === 'risvolti') put(chest, 0, .08, .145, s => { const a = Bx(.05, .22, .01, sh(c.col, .8), -.05, 0, 0), b0 = Bx(.05, .22, .01, sh(c.col, .8), .05, 0, 0); a.rotation.z = .25; b0.rotation.z = -.25; s.add(a, b0, Bx(.04, .2, .012, '#ece8dc', 0, .02, -.004)); });
      if (c.acc === 'tasconi') [ulL, ulR].forEach((b, i) => put(b, 0, -.18, 0, s => { s.add(Bx(.04, .12, .11, c.col, i ? -.1 : .1, 0, 0)); }));
      if (c.acc === 'tacco') [ftL, ftR].forEach(b => put(b, 0, -.05, -.07, s => { s.add(Bx(.03, .07, .03, c.col)); }));
      if (c.acc === 'orologio') put(wL, 0, 0, 0, s => { s.add(Cy(.04, .04, .03, '#2a2a2e', 0, 0, 0, 10), Cy(.025, .025, .035, c.col, 0, 0, 0, 10)); });
      if (c.acc === 'anelli') [wL, wR].forEach(b => put(b, 0, -.07, .02, s => { s.add(Bx(.04, .02, .03, c.col)); }));
      if (c.acc === 'marsupio') put(hips, 0, .05, 0, s => { const belt = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .032, 22, 1, true), new THREE.MeshLambertMaterial({ color: '#1e1e24', side: THREE.DoubleSide })); belt.scale.set(1, 1, .82); const pouch = Bx(.2, .1, .07, c.col, 0, -.01, .155); const zip = Bx(.18, .008, .072, sh(c.col, .6), 0, .025, .156); s.add(belt, pouch, zip); });   // [vestiti] cintura che gira attorno, tasca davanti
      if (c.acc === 'borsetta') put(shL || chest, .1, -.35, 0, s => { s.add(Bx(.2, .14, .07, c.col), Bx(.01, .45, .01, '#2a1a14', 0, .28, 0)); });
      if (c.acc === 'zaino' && chest) { const p = wpos(g, chest), s = new THREE.Group(); s.add(Bx(.32, .4, .16, c.col), Bx(.26, .12, .05, '#2a2a22', 0, -.08, -.1), Bx(.3, .08, .17, '#3a3a2e', 0, .18, 0)); pin(g, chest, s, p.x, p.y - .05, p.z - .2); }
    });
    // nella sinistra
    if (held && wL) { const p = wpos(g, wL), s = new THREE.Group(); const C0 = typeof Oggetti !== 'undefined' && Oggetti.CAT[held]; const big = C0 && C0.peso > 1;
      const om = window.Officina && Officina.held(held); if (om) { s.add(om); pin(g, wL, s, p.x, p.y - .08, p.z + .05); return; }   // [studio] il modello dell'oggetto, dove c'è
      if (/torcia/.test(held)) { s.add(Cy(.025, .03, .2, '#2a2a2e')); s.add(Cy(.032, .032, .03, '#f0e8a0', 0, .1, 0)); s.children.forEach(o => { o.rotation.x = Math.PI / 2; }); }
      else if (C0 && /bevande/.test(C0.cat)) s.add(Cy(.03, .03, .2, '#3a6a3a'));
      else s.add(Bx(big ? .12 : .08, big ? .14 : .08, big ? .1 : .05, '#' + ((Math.abs([...held].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % 0xaaaaaa) + 0x333333).toString(16).slice(0, 6)));
      pin(g, wL, s, p.x, p.y - .08, p.z + .05); }
  }

  // ---------------- VESTIRE UNA PERSONA ----------------
  function strip(g) { if (g.userData) g.userData.spessore = null;   // [animazioni]
    g.traverse(o => { if (o.isSkinnedMesh && o.userData.geo0) o.geometry = o.userData.geo0; });   // [vestiti] la pelle torna intera
    const rm = []; g.traverse(o => { if (o.userData && o.userData.vesti) rm.push(o); }); rm.forEach(o => { if (o.parent) o.parent.remove(o); if (o.geometry && o.isSkinnedMesh) o.geometry.dispose(); }); }
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
  function dress(g, outfit, look, held) {
    strip(g); bare(g, look);
    // unità: quanti metri vale un'unità della geometria (il personaggio è alto 1,8 m)
    let unit = g.userData.vUnit;
    if (!unit) { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; g.traverse(o => { if (!o.isSkinnedMesh || o.userData.vesti) return; const A = analyze(o); if (A) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], A.lo[k]); hi[k] = Math.max(hi[k], A.hi[k]); } });
      const R = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); unit = g.userData.vUnit = R > 0 && R < 1e8 ? 1.75 / R : .01; }
    try { shells(g, outfit, unit); } catch (e) { console.error('[Vesti3D] gusci', e); }
    try { accessories(g, outfit, held); } catch (e) { console.error('[Vesti3D] pezzi', e); }
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
        else { const n = npcOf(look) || { id: JSON.stringify(look || {}).length + (look && look.top || ''), look: look || {} }; if (who === 'cop' && !n.cop) n.cop = true; dress(g, Guardaroba.outfitOf(n, fem), look); }
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
  return { dress, strip, players, analyze, PARTI };
})();
