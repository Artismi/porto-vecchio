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
    S.updateMatrixWorld(true);
    // 1) chi è città
    const cand = [];
    S.children.forEach(top => {
      const f = top.__fase; if (!f || VIVE.has(f)) { scarta('non città: ' + (f || 'dopo')); return; }
      let sk = false; top.traverse(x => { if (x.isSkinnedMesh) sk = true; }); if (sk) { scarta('scheletro'); return; }
      top.traverse(o => {
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
    const tavole = { cella: CELLA, materiali: MATL, stringhe: STRL, tessiture: texInfo, luci, pozze, uni, tasselli: tiles, sagoma, info: Object.assign(info, { candidati: cand.length, citta: città.length, istanze: nInst, materiali: MATL.length, tessiture: TEXL.length, byteGrezzi: nb, ms: Math.round(performance.now() - T0), tempi: TM }) };
    await up('grezzi/tavole.json', JSON.stringify(tavole));
    return tavole.info;
  };
})();
