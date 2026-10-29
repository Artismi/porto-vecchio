// [tasselli] L'ESPORTATORE, LA PARTE NELLA PAGINA: strumenti/tassella.js la inietta nel gioco già costruito (Chromium senza testa,
// seme fisso, ?tutto) e chiama window.__tassella(opz). Cammina la scena finale e manda al server di tassella.js, con POST /__up/<nome>:
//   grezzi/t_<i>_<j>.bin  un tassello grezzo (testata JSON + vettori così come sono in memoria): lo comprime tassella.js
//   tex/<n>.raw           i pixel di una tessitura (letti dalla scheda video: quello che il gioco le ha caricato, capovolgimento compreso)
//   grezzi/sagoma.bin     le case come volumi (render.js massaGeo1), per il lontano
//   grezzi/tavole.json    materiali (con gli shader già trasformati da onBeforeCompile), tessiture (le loro impostazioni), luci, pozze
// Chi è città: gli oggetti in scena messi da una fase di R.init (render.js li marca __fase) che non sia viva (cielo, isola, acqua: restano
// al gioco), visibili, su un livello che qualche camera vede, fermi (la matrice non cambia in un secondo e mezzo), senza scheletro.
(function () {
  'use strict';
  const LIB = { MeshStandardMaterial: 'standard', MeshPhysicalMaterial: 'physical', MeshLambertMaterial: 'lambert', MeshBasicMaterial: 'basic', MeshPhongMaterial: 'phong', MeshToonMaterial: 'toon', MeshMatcapMaterial: 'matcap', MeshDepthMaterial: 'depth', MeshDistanceMaterial: 'distanceRGBA', MeshNormalMaterial: 'normal' };
  const TK = ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'envMap', 'specularMap', 'displacementMap'];
  const COL = ['color', 'emissive', 'specular', 'sheenColor', 'attenuationColor'];
  const NUM = ['roughness', 'metalness', 'emissiveIntensity', 'opacity', 'alphaTest', 'envMapIntensity', 'bumpScale', 'displacementScale', 'displacementBias', 'aoMapIntensity', 'lightMapIntensity', 'reflectivity', 'refractionRatio', 'shininess', 'polygonOffsetFactor', 'polygonOffsetUnits', 'linewidth', 'clearcoat', 'clearcoatRoughness', 'ior', 'sheen', 'transmission'];
  const BOO = ['transparent', 'depthTest', 'depthWrite', 'colorWrite', 'vertexColors', 'flatShading', 'fog', 'toneMapped', 'polygonOffset', 'wireframe', 'dithering', 'premultipliedAlpha', 'alphaToCoverage', 'visible', 'lights', 'clipping', 'stencilWrite'];
  const ENU = ['depthPacking', 'side', 'shadowSide', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha', 'blendEquationAlpha', 'combine', 'depthFunc'];
  const TXP = ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'encoding', 'format', 'type', 'generateMipmaps', 'premultiplyAlpha', 'unpackAlignment', 'rotation', 'matrixAutoUpdate', 'internalFormat'];
  const up = (nome, corpo) => fetch('/__up/' + nome, { method: 'POST', body: corpo }).then(r => { if (!r.ok) throw new Error('POST ' + nome + ' ' + r.status); });
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const isDefaultObc = f => !f || /^onBeforeCompile\s*\(\s*\)\s*\{\s*\}$/.test(f.toString()) || /^function\s*\(\s*\)\s*\{\s*\}$/.test(f.toString());

  window.__tassella = async function (opz) {
    opz = opz || {};
    const CELLA = opz.cella || 48, VIVE = new Set(opz.vive || (window.Tasselli && Tasselli.VIVE) || ['sky', 'island', 'water', 'scena', 'particles', 'fx', 'debris', 'post']);   // le fasi che restano al gioco (src/tasselli.js)
    const pv = window.__pv, R = pv.R, S = R.__models.scene, rd = R.__models.renderer, gl = rd.getContext(), TR = R.__tass || null;
    const T0 = performance.now(), info = { scartati: {}, mosse: 0 };
    const scarta = k => { info.scartati[k] = (info.scartati[k] || 0) + 1; };
    // [tasselli2] nessuna casa tagliata né col tetto sbiadito nella foto della build: la visuale si ferma e le case tornano intere
    try { const V4 = R.__vis4; if (V4) { V4.camera = false; V4.muretto = false; }   /* (anche il taglio mirato: IQ5.v è nullo senza la camera) */
      await pausa(2500); (TR.dyn.buildings || []).forEach(B => { R.casaVisibile(B, 'tetto', 0); R.casaVisibile(B, 'quota', null); }); if (TR.FD1 && TR.FD1.tex) TR.FD1.tex.needsUpdate = true; await pausa(500); } catch (e) { console.warn('[tassella] visuale', e); }
    S.updateMatrixWorld(true);
    // 0) [tasselli2] le cose vive della città: si muovono, cambiano colore o lampeggiano (render.js frame e tickStrade1). Non entrano
    // nella mesh ferma del tassello (sarebbero ferme come nella foto della build): vanno a parte, nei vivi (src/tasselli.js le rimette
    // nelle liste del gioco, che le anima come prima). Prima i gruppi che si muovono, poi le cose dentro.
    const dyn = TR.dyn, S1 = TR.S1 || { heads: [], blink: [] };
    const topF = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q.parent === S ? q.__fase : null; };
    const diCitta = o => { const f = topF(o); return !!f && !VIVE.has(f); };
    const VSET = new Set(), VR = [], VDI = new Map();   // VR: [tipo, oggetto, extra]; VDI: oggetto → il suo numero in VR
    const addV = (tipo, o, x) => { if (!o || !o.isObject3D || !diCitta(o)) return -1; if (VDI.has(o)) return VDI.get(o); if (VSET.has(o)) return -2; const i = VR.length; VR.push([tipo, o, x || {}]); VDI.set(o, i); o.traverse(q => VSET.add(q)); return i; };
    (dyn.spin || []).forEach(q => addV('spin', q.o, { speed: q.speed }));
    (dyn.boats || []).forEach(q => addV('boats', q.g, { ph: q.ph, y: q.y }));
    (dyn.laundry || []).forEach(q => addV('laundry', q.m, { ph: q.ph, ax: q.ax }));
    (S1.heads || []).forEach(h => { h.lens.forEach(m => addV('lens', m)); if (h.gl) addV('headgl', h.gl); });
    (dyn.signs || []).forEach(q => { if (q.flick && q.gl) addV('signgl', q.gl); });
    // gli aloni (sprite che sfarfallano: dyn.flicker; che lampeggiano: S1.blink) diventano strati istanziati (uno per materiale)
    const ALONI = [], ALI = new Map();
    const alone = (sp, k, base, ph, lm) => { if (!sp || !sp.isSprite || !diCitta(sp) || VSET.has(sp) || ALI.has(sp)) return; ALI.set(sp, ALONI.length); ALONI.push({ sp, k, base, ph, lm }); };
    (dyn.flicker || []).forEach(f => alone(f.s, 0, f.base, 0, f.lm || 0));
    (S1.blink || []).forEach(b => alone(b, 1, 0, (b.userData && b.userData.ph) || 0, 0));
    ALONI.forEach(a => VSET.add(a.sp));
    // gli oggetti fusi nelle statiche che si colpiscono (DZ.props: cadono, si rompono): il numero dell'oggetto su ogni suo vertice (pid),
    // così il gioco li nasconde con una maschera (hideTag) e li rimette come corpi vivi
    const PROPS = [], PRI = new Map(), DZ = TR.DZ, TAGS = TR.TAGS;
    if (DZ && TAGS) DZ.props.forEach(rec => {
      if (rec.state !== 0 || PROPS.length >= 65000) return; const t = TAGS.get(rec.tag); if (!t || t.hidden) return;
      const parts = t.parts.filter(p => p.b && p.b.mesh && p.b.offs && p.b.offs[p.gi] !== undefined && p.n > 0 && diCitta(p.b.mesh) && p.b.mesh.geometry.attributes.position && p.b.offs[p.gi] + p.n <= p.b.mesh.geometry.attributes.position.count);
      if (!parts.length) return;
      const k = PROPS.length; PRI.set(rec, k);
      parts.forEach(p => { const g = p.b.mesh.geometry; let a = g.attributes.pid; if (!a) { a = new THREE.BufferAttribute(new Uint16Array(g.attributes.position.count), 1); g.setAttribute('pid', a); } a.array.fill(k + 1, p.b.offs[p.gi], p.b.offs[p.gi] + p.n); });
      const pal = []; try { if (rec.obj) rec.obj.traverse(m => { if (!m.isMesh || Array.isArray(m.material) || !m.material || !m.material.color) return; const g = m.geometry; if (!g || !g.attributes || !g.attributes.position) return; if (!g.boundingBox) g.computeBoundingBox(); const z = g.boundingBox.getSize(new THREE.Vector3()); pal.push([m.material.color.getHexString(), +Math.max(.01, z.x * z.y + z.y * z.z + z.x * z.z).toFixed(3)]); }); } catch (e) { }
      PROPS.push({ tag: rec.tag, c: rec.c0.toArray().map(v => +v.toFixed(3)), he: rec.he.toArray().map(v => +v.toFixed(3)), mass: rec.mass, cls: rec.cls, base: +rec.base.toFixed(3), fragile: !!rec.fragile, pal: pal.length ? pal : [['8a7a6a', 1]],
        luce: rec.light ? TR.LSRC.indexOf(rec.light) : -1, lbase: rec.lbase, alone: rec.glowS && ALI.has(rec.glowS) ? ALI.get(rec.glowS) : -1 });
    });
    // 1) chi è città
    const cand = [];
    S.children.forEach(top => {
      const f = top.__fase; if (!f || VIVE.has(f)) { scarta('non città: ' + (f || 'dopo')); return; }
      let sk = false; top.traverse(x => { if (x.isSkinnedMesh) sk = true; }); if (sk) { scarta('scheletro'); return; }
      top.traverse(o => {
        if (VSET.has(o)) { if (o.isMesh || o.isSprite) scarta('vivo'); return; }
        if (!o.isMesh) { if (o.isSprite || o.isPoints || o.isLine) scarta(o.type); return; }
        for (let q = o; q; q = q.parent) if (!q.visible) { scarta('spento'); return; }
        if (!o.layers.mask) { scarta('livello 0'); return; }
        const g = o.geometry; if (!g || !g.attributes.position || (g.morphAttributes && Object.keys(g.morphAttributes).length)) { scarta('geometria'); return; }
        cand.push(o);
      });
    });
    // fermi: la matrice non cambia (il gioco gira intanto)
    const M0 = cand.map(o => o.matrixWorld.elements.slice());
    await pausa(opz.attesa || 1500); S.updateMatrixWorld(true);
    const città = cand.filter((o, i) => { const e = o.matrixWorld.elements; for (let k = 0; k < 16; k++) if (Math.abs(e[k] - M0[i][k]) > 1e-6) { info.mosse++; return false; } return true; });
    // 2) tessiture, uniform, materiali
    const TEX = new Map(), TEXL = [], MAT = new Map(), MATL = [], STR = new Map(), STRL = [];
    const LIVE = new Map(); if (TR) for (const k in TR.uni) LIVE.set(TR.uni[k], k);
    const NOTTE = new Map(); if (TR) { (TR.FD1.emis || []).forEach(m => NOTTE.set(m, 'fd1')); (TR.dyn.backdropMats || []).forEach(m => NOTTE.set(m, 'fondale')); }
    const str = s => { let i = STR.get(s); if (i === undefined) { i = STRL.length; STR.set(s, i); STRL.push(s); } return i; };
    const texId = t => { if (!t || !t.isTexture) return null; let i = TEX.get(t); if (i === undefined) { i = TEXL.length; TEX.set(t, i); TEXL.push(t); } return i; };
    const serV = v => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v;
      if (v.isColor) return { c: [v.r, v.g, v.b] };
      if (v.isVector2 || v.isVector3 || v.isVector4 || v.isQuaternion) return { v: v.toArray() };
      if (v.isMatrix3 || v.isMatrix4) return { m: Array.from(v.elements), n: v.isMatrix3 ? 3 : 4 };
      if (v.isTexture) return { t: texId(v) };
      if (Array.isArray(v)) return { a: v.map(serV) };
      if (ArrayBuffer.isView(v)) return { f: Array.from(v), k: v.constructor.name };
      if (typeof v === 'object') { const o = {}; for (const k in v) o[k] = serV(v[k]); return { o }; }
      return null;
    };
    const serU = u => { if (!u) return null; const n = LIVE.get(u); if (n) return { live: n, val: serV(u.value) }; return { val: serV(u.value) }; };
    function matId(m) {
      let i = MAT.get(m); if (i !== undefined) return i;
      const r = { type: m.type, name: m.name || '' };
      COL.forEach(k => { if (m[k] && m[k].isColor) r[k] = [m[k].r, m[k].g, m[k].b]; });
      NUM.forEach(k => { if (typeof m[k] === 'number') r[k] = m[k]; });
      BOO.forEach(k => { if (typeof m[k] === 'boolean') r[k] = m[k]; });
      ENU.forEach(k => { if (typeof m[k] === 'number') r[k] = m[k]; });
      if (m.normalScale) r.normalScale = m.normalScale.toArray();
      TK.forEach(k => { if (m[k]) r[k] = texId(m[k]); });
      if (m.clippingPlanes && m.clippingPlanes.length) r.clip = m.clippingPlanes.length;
      const ud = {}; for (const k in m.userData) { const v = m.userData[k]; if (v === null || ['number', 'boolean', 'string'].includes(typeof v)) ud[k] = v; } if (Object.keys(ud).length) r.ud = ud;
      if (m.isShaderMaterial) {
        r.vs = str(m.vertexShader); r.fs = str(m.fragmentShader); r.uni = {}; for (const k in m.uniforms) r.uni[k] = serU(m.uniforms[k]);
        r.defines = m.defines ? JSON.parse(JSON.stringify(m.defines)) : {}; r.extensions = Object.assign({}, m.extensions); r.lights = m.lights; r.fog = m.fog; r.glslVersion = m.glslVersion || null;
      }
      if (!isDefaultObc(m.onBeforeCompile)) {   // lo shader già trasformato, come lo vede three (gli #include li risolve lui)
        const L = m.isShaderMaterial ? null : THREE.ShaderLib[LIB[m.type]];
        const sh = m.isShaderMaterial ? { vertexShader: m.vertexShader, fragmentShader: m.fragmentShader, uniforms: Object.assign({}, m.uniforms), defines: Object.assign({}, m.defines || {}) }
          : L ? { vertexShader: L.vertexShader, fragmentShader: L.fragmentShader, uniforms: THREE.UniformsUtils.clone(L.uniforms), defines: {} } : null;
        if (!sh) { r.obcErr = 'senza ShaderLib'; }
        const base = new Set(Object.keys(sh ? sh.uniforms : {}));
        if (sh) try { m.onBeforeCompile(sh, rd); r.cvs = str(sh.vertexShader); r.cfs = str(sh.fragmentShader); r.cuni = {}; for (const k in sh.uniforms) if (!base.has(k)) r.cuni[k] = serU(sh.uniforms[k]);
          if (Object.keys(sh.defines || {}).length) r.cdef = sh.defines; } catch (e) { r.obcErr = String(e); }
        try { r.key = m.customProgramCacheKey(); } catch (e) { }
      }
      if (NOTTE.has(m)) r.notte = NOTTE.get(m);   // chi il gioco accende di notte (render.js frame: FD1.emis, dyn.backdropMats)
      i = MATL.length; MAT.set(m, i); MATL.push(r); return i;
    }
    // 3) i tasselli
    const T = new Map(), tk = (x, z) => Math.floor(x / CELLA) + '_' + Math.floor(z / CELLA);
    const tile = k => { let t = T.get(k); if (!t) T.set(k, t = { k, mesh: [], attr: new Map(), attrL: [], bb: new THREE.Box3() }); return t; };
    const bb = new THREE.Box3(), v3 = new THREE.Vector3(), m4 = new THREE.Matrix4();
    const plain = a => { if (!a.isInterleavedBufferAttribute) return a.array; const n = a.count, s = a.itemSize, A = new a.array.constructor(n * s); for (let i = 0; i < n; i++) for (let c = 0; c < s; c++) A[i * s + c] = a.getComponent ? a.getComponent(i, c) : [a.getX, a.getY, a.getZ, a.getW][c].call(a, i); return A; };
    const attrRef = (t, a, isIdx) => { let i = t.attr.get(a); if (i === undefined) { i = t.attrL.length; t.attr.set(a, i); t.attrL.push({ a, isIdx }); } return i; };
    const geoRec = (t, g) => { const at = {}; for (const k in g.attributes) at[k] = attrRef(t, g.attributes[k], false);
      return { at, ix: g.index ? attrRef(t, g.index, true) : null, gr: g.groups.length ? g.groups.map(q => [q.start, q.count, q.materialIndex || 0]) : null,
        dr: g.drawRange.start || g.drawRange.count !== Infinity ? [g.drawRange.start, g.drawRange.count] : null }; };
    const base = o => ({ m: Array.isArray(o.material) ? o.material.map(matId) : matId(o.material), cs: o.castShadow, rs: o.receiveShadow, ro: o.renderOrder, ly: o.layers.mask, fc: o.frustumCulled,
      nm: o.name || '', cdm: o.customDepthMaterial ? matId(o.customDepthMaterial) : null, cdi: o.customDistanceMaterial ? matId(o.customDistanceMaterial) : null,
      mx: (() => { const e = o.matrixWorld.elements; let id = true; for (let k = 0; k < 16; k++) if (Math.abs(e[k] - (k % 5 === 0 ? 1 : 0)) > 1e-9) { id = false; break; } return id ? null : Array.from(e); })() });
    let nInst = 0;
    for (const o of città) {
      const g = o.geometry;
      if (o.isInstancedMesh) {   // le istanze per tassello, dal punto di ciascuna
        const per = new Map(), im = o.instanceMatrix.array, ic = o.instanceColor ? o.instanceColor.array : null;
        for (let i = 0; i < o.count; i++) { m4.fromArray(im, i * 16).premultiply(o.matrixWorld); v3.setFromMatrixPosition(m4); const k = tk(v3.x, v3.z); let L = per.get(k); if (!L) per.set(k, L = []); L.push(i); }
        if (!g.boundingBox) g.computeBoundingBox();
        per.forEach((L, k) => { const t = tile(k), M = new Float32Array(L.length * 16), C = ic ? new Float32Array(L.length * 3) : null;
          L.forEach((i, j) => { M.set(im.subarray(i * 16, i * 16 + 16), j * 16); if (C) C.set(ic.subarray(i * 3, i * 3 + 3), j * 3); m4.fromArray(im, i * 16).premultiply(o.matrixWorld); bb.copy(g.boundingBox).applyMatrix4(m4); t.bb.union(bb); });
          const r = Object.assign(base(o), { g: geoRec(t, g), inst: { n: L.length, m: attrRef(t, { array: M, itemSize: 16, isRaw: true }, false), c: C ? attrRef(t, { array: C, itemSize: 3, isRaw: true }, false) : null } });
          t.mesh.push(r); nInst += L.length; });
        continue;
      }
      if (!g.boundingBox) g.computeBoundingBox();
      bb.copy(g.boundingBox).applyMatrix4(o.matrixWorld); bb.getCenter(v3);
      const t = tile(tk(v3.x, v3.z)); t.bb.union(bb);
      t.mesh.push(Object.assign(base(o), { g: geoRec(t, g), bs: g.boundingSphere ? [g.boundingSphere.center.x, g.boundingSphere.center.y, g.boundingSphere.center.z, g.boundingSphere.radius] : null,
        bb: [g.boundingBox.min.x, g.boundingBox.min.y, g.boundingBox.min.z, g.boundingBox.max.x, g.boundingBox.max.y, g.boundingBox.max.z] }));
    }
    // il grezzo: [u32 lunghezza della testata][testata JSON][allineamento a 8][vettori, ognuno allineato a 8]
    const pack = (testa, bufs) => { let off = 0; const L = bufs.map(b => { const u = new Uint8Array(b.buffer, b.byteOffset, b.byteLength); const r = { off, len: u.byteLength }; off += (u.byteLength + 7) & ~7; return [u, r]; });
      testa.bufs = L.map(x => x[1]); const tj = new TextEncoder().encode(JSON.stringify(testa)), h = (4 + tj.length + 7) & ~7, out = new Uint8Array(h + off);
      new DataView(out.buffer).setUint32(0, tj.length, true); out.set(tj, 4); L.forEach(([u, r]) => out.set(u, h + r.off)); return out; };
    const tiles = [], TM = { scelta: Math.round(performance.now() - T0) };
    let nb = 0;
    for (const t of T.values()) {
      const bufs = [], attrs = t.attrL.map(({ a, isIdx }, i) => { const arr = a.isRaw ? a.array : plain(a); bufs.push(arr);
        return { tipo: arr.constructor.name, n: a.isRaw ? arr.length / a.itemSize : (isIdx ? arr.length : a.count), s: isIdx ? 1 : a.itemSize, norm: !!a.normalized, idx: isIdx, b: i }; });
      const testa = { k: t.k, cella: CELLA, bb: [t.bb.min.x, t.bb.min.y, t.bb.min.z, t.bb.max.x, t.bb.max.y, t.bb.max.z], mesh: t.mesh, attr: attrs };
      const bin = pack(testa, bufs); nb += bin.byteLength; await up('grezzi/t_' + t.k + '.bin', bin);
      tiles.push({ k: t.k, mesh: t.mesh.length, byte: bin.byteLength, bb: testa.bb });
    }
    TM.tasselli = Math.round(performance.now() - T0);
    // 4) la sagoma
    let sagoma = null;
    if (TR && TR.sagoma) { const g = TR.sagoma(); if (g) { const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array;
      const bin = pack({ n: g.attributes.position.count, attr: [{ nome: 'position', s: 3, b: 0 }, { nome: 'normal', s: 3, b: 1 }, { nome: 'color', s: 3, b: 2 }] }, [P, N, C]); await up('grezzi/sagoma.bin', bin); sagoma = g.attributes.position.count; g.dispose(); } }
    // 4b) [tasselli2] i vivi: ogni radice col suo sottoalbero (le matrici locali: il gioco le muove come prima) dentro la matrice del
    // genitore nel mondo; le geometrie in grezzi/vivi.bin (lo stesso grezzo dei tasselli), il resto nelle tavole
    const GV = new Map(), VA = [], VB = [];
    const vattr = (a, isIdx) => { let i = GV.get(a); if (i !== undefined) return i; const arr = plain(a); i = VA.length; GV.set(a, i); VB.push(arr);
      VA.push({ tipo: arr.constructor.name, n: isIdx ? arr.length : a.count, s: isIdx ? 1 : a.itemSize, norm: !!a.normalized, idx: !!isIdx, b: i }); return i; };
    const GEOV = new Map(), GEOL = [];
    const vgeo = g => { let i = GEOV.get(g); if (i !== undefined) return i; const at = {}; for (const k in g.attributes) at[k] = vattr(g.attributes[k], false);
      if (!g.boundingSphere) g.computeBoundingSphere();
      i = GEOL.length; GEOV.set(g, i); GEOL.push({ at, ix: g.index ? vattr(g.index, true) : null, gr: g.groups.length ? g.groups.map(q => [q.start, q.count, q.materialIndex || 0]) : null,
        dr: g.drawRange.start || g.drawRange.count !== Infinity ? [g.drawRange.start, g.drawRange.count] : null, bs: g.boundingSphere ? [g.boundingSphere.center.x, g.boundingSphere.center.y, g.boundingSphere.center.z, g.boundingSphere.radius] : null }); return i; };
    const nodo = o => { if (o.matrixAutoUpdate) o.updateMatrix(); const r = { t: o.isSprite ? 'Sprite' : o.isMesh ? 'Mesh' : 'Group', mx: Array.from(o.matrix.elements), ly: o.layers.mask, vis: o.visible, nm: o.name || '', ro: o.renderOrder, fc: o.frustumCulled, cs: o.castShadow, rs: o.receiveShadow };
      if (o.isMesh || o.isSprite) { r.m = Array.isArray(o.material) ? o.material.map(matId) : matId(o.material); }
      if (o.isMesh) r.g = vgeo(o.geometry);
      if (o.isSprite) r.c = [o.center.x, o.center.y];
      const ud = {}; for (const k in o.userData) { const v = o.userData[k]; if (['number', 'boolean', 'string'].includes(typeof v)) ud[k] = v; } if (Object.keys(ud).length) r.ud = ud;
      const ch = o.children.filter(c => (c.isMesh || c.isSprite || c.type === 'Group' || c.type === 'Object3D') && !c.isSkinnedMesh && !c.isInstancedMesh); if (ch.length) r.ch = ch.map(nodo); return r; };
    const IDM = new THREE.Matrix4();
    const VIVI = VR.map(([tipo, o, x]) => { const P = o.parent && o.parent !== S ? o.parent.matrixWorld : IDM, w = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
      return { tipo, k: tk(w.x, w.z), pw: P === IDM ? null : Array.from(P.elements), n: nodo(o), x }; });
    const viI = o => VDI.has(o) ? VDI.get(o) : -1;
    // chi li anima: i semafori (S1.heads: le tre lenti, l'alone, l'oggetto colpibile del palo), le insegne che sfarfallano (il materiale
    // dell'insegna, che sta nel tassello: non si unisce a nessun altro), l'acqua delle fontane (S1.fwater: la tessitura che scorre)
    let VIVOK = 0; const unico = m => { if (m && m.isMaterial) MATL[matId(m)].vivo = ++VIVOK; };
    (S1.heads || []).forEach(h => { h.lens.forEach(o => unico(o.material)); if (h.gl) unico(h.gl.material); });
    (dyn.signs || []).forEach(q => { if (q.flick) { unico(q.m); if (q.gl && q.gl.material) unico(q.gl.material); } });
    const heads = (S1.heads || []).map(h => ({ lens: h.lens.map(viI), gl: h.gl ? viI(h.gl) : -1, gy: h.gy, ofs: h.ofs, phase: h.phase, prop: h.rec && PRI.has(h.rec) ? PRI.get(h.rec) : -1 })).filter(h => h.lens.every(i => i >= 0));
    const insegne = (dyn.signs || []).filter(q => q.flick && q.m && q.m.isMaterial).map(q => ({ m: matId(q.m), gl: q.gl ? viI(q.gl) : -1 }));
    const fwater = (S1.fwater || []).filter(t => t && t.isTexture).map(texId);
    const aloni = ALONI.map(a => { const sp = a.sp, w = new THREE.Vector3().setFromMatrixPosition(sp.matrixWorld), sc = new THREE.Vector3().setFromMatrixScale(sp.matrixWorld);
      return { k: tk(w.x, w.z), p: [w.x, w.y, w.z].map(v => +v.toFixed(3)), s: [+sc.x.toFixed(3), +sc.y.toFixed(3)], m: matId(sp.material), tipo: a.k, base: a.base, ph: a.ph, ly: sp.layers.mask || a.lm || 1, rot: sp.material.rotation || 0, c: [sp.center.x, sp.center.y], vis: (() => { for (let q = sp; q; q = q.parent) if (!q.visible) return false; return true; })() }; });
    if (VB.length) await up('grezzi/vivi.bin', pack({ attr: VA }, VB));
    // 4c) [tasselli2] i dati delle case che il gioco legge (il taglio, il tetto che sbiadisce, la sagoma del personaggio, le aperture dei
    // graffiti): i record di dyn.buildings (senza le mesh) e quello che le fasi della città hanno scritto sulle case del mondo (b.__*)
    const GB = (typeof Game !== 'undefined' && Game.BUILDINGS) || [];
    const sicuro = (v, seen, d) => { if (v === null || v === undefined) return v; const t = typeof v; if (t === 'number') return isFinite(v) ? v : null; if (t === 'string' || t === 'boolean') return v; if (t !== 'object') return undefined;
      if (v.isObject3D || v.isMaterial || v.isTexture || v.isBufferGeometry || v.isBufferAttribute) return true; if (v.isVector3 || v.isVector2) return v.toArray(); if (v.isColor) return '#' + v.getHexString(); if (v.isBox3) return [v.min.x, v.min.y, v.min.z, v.max.x, v.max.y, v.max.z];
      if (ArrayBuffer.isView(v)) return v.length > 4096 ? undefined : Array.from(v); if (seen.has(v) || d > 6) return undefined; seen.add(v);
      if (Array.isArray(v)) return v.map(x => { const q = sicuro(x, seen, d + 1); return q === undefined ? null : q; });
      if (v instanceof Map || v instanceof Set) return undefined; const o = {}; for (const k in v) { const q = sicuro(v[k], seen, d + 1); if (q !== undefined) o[k] = q; } return o; };
    const bmut = GB.map(b => { const o = {}; for (const k of Object.keys(b)) if (k.startsWith('__')) { const q = sicuro(b[k], new Set(), 0); if (q === undefined) continue; const js = JSON.stringify(q); if (js && js.length < 200000) o[k] = q; } return o; });
    const bIdx = new Map(); (DZ && DZ.bRec || []).forEach((r, i) => { if (r) bIdx.set(r, i); });
    const SALTA = new Set(['b', 'grp', 'mats', 'detGrp', 'mv1', 'mv3', 'box3', '__t4', '__pl3', '__cose3', '__own3']);
    const fdIdx = TR.FD1 && TR.FD1.idx;
    const casi = dyn.buildings.map(rec => { const o = { fd: fdIdx && fdIdx.has(rec) ? fdIdx.get(rec) : -1, bi: bIdx.has(rec) ? bIdx.get(rec) : GB.indexOf(rec.b), box3: rec.box3 ? sicuro(rec.box3) : null };
      o.rb = o.bi >= 0 && bIdx.has(rec);   // DZ.bRec[bi] è questa casa
      if (rec.b && (o.bi < 0 || GB[o.bi] !== rec.b)) { const bj = {}; for (const k in rec.b) { const v = rec.b[k]; if (v === null || ['number', 'boolean', 'string'].includes(typeof v)) bj[k] = v; } o.bj = bj; }
      for (const k in rec) { if (SALTA.has(k) || k in o) continue; const v = rec[k]; if (v === null || ['number', 'boolean', 'string'].includes(typeof v)) o[k] = v; else if (v && typeof v === 'object' && !v.isObject3D && !v.isMaterial) { const q = sicuro(v, new Set(), 0); if (q !== undefined && q !== true) { const js = JSON.stringify(q); if (js && js.length < 20000) o[k] = q; } } }
      return o; });
    const grandi = DZ && TAGS ? DZ.big.filter(q => { const t = TAGS.get(q.tag); return t && t.parts.some(p => p.b && p.b.mesh && diCitta(p.b.mesh)); }).map(q => ({ c: q.c.toArray(), he: q.he.toArray(), base: q.base })) : [];
    const dati = { case: casi, bmut, props: PROPS, grandi, vivi: VIVI, heads, insegne, fwater, aloni, geo: GEOL };
    // 5) le tessiture: i pixel dalla scheda video (o dai dati, per le DataTexture che li tengono)
    const fb = gl.createFramebuffer(), texInfo = [];
    const okF = !!gl.getExtension('EXT_color_buffer_float');
    for (let i = 0; i < TEXL.length; i++) {
      const t = TEXL[i], r = { i, k: t.isDataArrayTexture ? 'array' : t.isData3DTexture ? '3d' : t.isDataTexture ? 'data' : t.isCubeTexture ? 'cube' : t.isCompressedTexture ? 'compressa' : 'img' };
      TXP.forEach(k => { if (t[k] !== undefined && t[k] !== null) r[k] = t[k]; });
      r.offset = t.offset.toArray(); r.repeat = t.repeat.toArray(); r.center = t.center.toArray(); if (!t.matrixAutoUpdate) r.matrix = Array.from(t.matrix.elements); r.flipY = t.flipY;
      const ud = {}; for (const k in t.userData) { const v = t.userData[k]; if (['number', 'boolean', 'string'].includes(typeof v)) ud[k] = v; } if (Object.keys(ud).length) r.ud = ud;
      let im = null; try { im = t.image; } catch (e) { }
      if ((r.k === 'data' || r.k === 'array' || r.k === '3d') && im && im.data && im.data.length) {
        r.w = im.width; r.h = im.height; r.d = im.depth || 1; r.dati = im.data.constructor.name; r.da = 'cpu'; await up('tex/' + i + '.raw', im.data);
      } else if (r.k === 'img' && !t.premultiplyAlpha && t.type === THREE.UnsignedByteType && (t.format === THREE.RGBAFormat) && im && typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement && im.width && im.getContext('2d')) {
        // una tela 2D: i pixel dalla tela (gli stessi che il browser manda alla scheda video: non premoltiplicati), capovolti come li capovolge la scheda
        const W = im.width, H = im.height, src = im.getContext('2d').getImageData(0, 0, W, H).data, px = new Uint8Array(W * H * 4);
        if (t.flipY) for (let y = 0; y < H; y++) px.set(src.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); else px.set(src);
        let op = true; for (let q = 3; q < px.length; q += 4) if (px[q] !== 255) { op = false; break; }
        Object.assign(r, { w: W, h: H, d: 1, dati: 'Uint8Array', da: 'gpu', flipY: false, opaca: op }); await up('tex/' + i + '.raw', px);   // 'gpu': nell'ordine della scheda video
      } else if (r.k === 'img' || r.k === 'array' || r.k === 'data') {
        if (!rd.properties.get(t).__webglTexture) { try { rd.initTexture(t); } catch (e) { r.err = 'init ' + e; } }
        const wt = rd.properties.get(t).__webglTexture;
        const W = (im && im.width) || 0, H = (im && im.height) || 0, D = r.k === 'array' ? (im && im.depth) || 1 : 1;
        if (!wt || !W || !H) { r.err = (r.err || '') + ' senza pixel'; texInfo.push(r); continue; }
        const flt = t.type === THREE.FloatType || t.type === THREE.HalfFloatType, px = flt ? new Float32Array(W * H * 4 * D) : new Uint8Array(W * H * 4 * D);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        for (let l = 0; l < D; l++) {
          if (r.k === 'array') gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, wt, 0, l); else gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, wt, 0);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { r.err = 'framebuffer ' + gl.checkFramebufferStatus(gl.FRAMEBUFFER); break; }
          if (flt && !okF) { r.err = 'float'; break; }
          gl.readPixels(0, 0, W, H, gl.RGBA, flt ? gl.FLOAT : gl.UNSIGNED_BYTE, flt ? new Float32Array(px.buffer, l * W * H * 16, W * H * 4) : new Uint8Array(px.buffer, l * W * H * 4, W * H * 4));
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        rd.state && rd.state.reset && rd.resetState();
        if (r.err) { texInfo.push(r); continue; }
        r.w = W; r.h = H; r.d = D; r.dati = px.constructor.name; r.da = 'gpu'; r.flipY = false; r.format = THREE.RGBAFormat; if (!flt) r.type = THREE.UnsignedByteType;
        // tutta opaca? (la compressione e il premoltiplicato lo vogliono sapere)
        if (!flt) { let op = true; for (let q = 3; q < px.length; q += 4) if (px[q] !== 255) { op = false; break; } r.opaca = op; }
        await up('tex/' + i + '.raw', px);
      } else r.err = 'tipo ' + r.k;
      texInfo.push(r);
    }
    gl.deleteFramebuffer(fb);
    TM.tessiture = Math.round(performance.now() - T0);
    // 6) le tavole
    const luci = TR ? TR.LSRC.map(L => ({ x: L.x, y: L.y, z: L.z, c: [L.color.r, L.color.g, L.color.b], base: L.base, dist: L.dist, flick: L.flick, phase: L.phase, always: !!L.always, landmark: !!L.landmark })) : [];
    const pozze = TR ? TR.SPILLS.map(L => ({ x: L.x, z: L.z, y: L.y, gy: L.gy, nx: L.nx, nz: L.nz, c: [L.color.r, L.color.g, L.color.b], base: L.base, dist: L.dist })) : [];
    // le uniform di modulo che la città usa: il loro valore adesso (il FD1 dei tasselli: nessuna casa tagliata né sfumata)
    const uni = {}; if (TR) for (const k in TR.uni) uni[k] = serV(TR.uni[k].value);
    if (TR && TR.FD1 && TR.FD1.u.value) uni.__fd1W = TR.FD1.W;
    const tavole = { cella: CELLA, materiali: MATL, stringhe: STRL, tessiture: texInfo, luci, pozze, uni, tasselli: tiles, sagoma, dati, info: Object.assign(info, { candidati: cand.length, citta: città.length, istanze: nInst, materiali: MATL.length, tessiture: TEXL.length, byteGrezzi: nb, ms: Math.round(performance.now() - T0), tempi: TM,
      vivi: VIVI.length, aloni: aloni.length, oggetti: PROPS.length, case: casi.length, semafori: heads.length, insegne: insegne.length }) };
    await up('grezzi/tavole.json', JSON.stringify(tavole));
    return tavole.info;
  };
})();
