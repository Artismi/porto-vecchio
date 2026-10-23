/* Porto Vecchio — [peso] gli aloni in un disegno solo (v7).
   Gli aloni dei lampioni, delle insegne e dei neon sono sprite additivi (render.js glow, lampade accese): uno sprite, un materiale, un
   disegno. Di notte nel borgo sono un centinaio, sulla città dall'alto più di trecento. Sommati con la miscela additiva (che non dipende
   dall'ordine) e senza scrivere la profondità, si possono disegnare tutti insieme: qui gli sprite additivi con la stessa tessitura vanno in
   un'istanza sola (posizione, misura, colore, opacità per istanza, letti a ogni fotogramma dagli sprite veri, che il gioco continua ad
   accendere, spegnere e far tremolare come prima). Gli sprite veri restano in scena col materiale spento (material.visible = false).
   Lo shader è quello degli sprite di three (stessa misura col punto di vista, stessa mappa, stesso tono): l'immagine è la stessa.
   ?nopesobagliori lo spegne. window.__pesoAB.bagliori per il banco.                                                                     */
var PesoBagliori = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopeso(bagliori)?\b/.test(Q);
  const P = { passo: 2500, max: 4096 };
  const ST = { sprite: 0, lotti: 0, piane: 0, mosse: 0 };
  let K = null, T3 = null, frame = 0, attivo = true;
  const LOTTI = new Map();   // chiave (mappa, fog, toneMapped, depthTest) → { mesh, list }
  function adatto(o) {
    const m = o.material; if (!m || !m.isSpriteMaterial || m.blending !== T3.AdditiveBlending || m.depthWrite || !m.transparent) return false;
    if (m.rotation || !m.sizeAttenuation || (o.center && (o.center.x !== .5 || o.center.y !== .5)) || o.renderOrder || m.alphaMap || m.alphaTest) return false;
    return true;
  }
  function chiave(m) { return (m.map ? m.map.uuid : '-') + '|' + m.fog + '|' + m.toneMapped + '|' + m.depthTest; }
  function lotto(m) {
    const k = chiave(m); let L = LOTTI.get(k); if (L) return L;
    const g = new T3.InstancedBufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0], 3)); g.setAttribute('uv', new T3.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 1, 2, 0, 2, 3]);
    const c = new T3.InstancedBufferAttribute(new Float32Array(P.max * 3), 3), s = new T3.InstancedBufferAttribute(new Float32Array(P.max * 2), 2), col = new T3.InstancedBufferAttribute(new Float32Array(P.max * 4), 4);
    c.setUsage(T3.DynamicDrawUsage); s.setUsage(T3.DynamicDrawUsage); col.setUsage(T3.DynamicDrawUsage);
    g.setAttribute('iC', c); g.setAttribute('iS', s); g.setAttribute('iCol', col); g.instanceCount = 0;
    const L0 = T3.ShaderLib.sprite;
    const mat = new T3.ShaderMaterial({ uniforms: T3.UniformsUtils.merge([L0.uniforms]), vertexShader: L0.vertexShader, fragmentShader: L0.fragmentShader, transparent: true, depthWrite: false, depthTest: m.depthTest, blending: T3.AdditiveBlending, fog: m.fog, toneMapped: m.toneMapped });
    mat.uniforms.map.value = m.map; mat.map = m.map; mat.sizeAttenuation = true; mat.defines = { USE_SIZEATTENUATION: '' };   // come gli sprite col punto di vista   // la mappa come negli sprite (USE_MAP, la stessa trasformazione)
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'attribute vec3 iC; attribute vec2 iS; attribute vec4 iCol; varying vec4 vCol1;\nvoid main() {\nvCol1 = iCol;')
        .replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );', 'vec4 mvPosition = viewMatrix * vec4( iC, 1.0 );')
        .replace(/scale\.x = length\( vec3\( modelMatrix\[ 0 \]\.x, modelMatrix\[ 0 \]\.y, modelMatrix\[ 0 \]\.z \) \);/, 'scale.x = iS.x;').replace(/scale\.y = length\( vec3\( modelMatrix\[ 1 \]\.x, modelMatrix\[ 1 \]\.y, modelMatrix\[ 1 \]\.z \) \);/, 'scale.y = iS.y;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec4 vCol1;\nvoid main() {').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vCol1.rgb, opacity * vCol1.a );');
      if (sh.vertexShader.indexOf('scale.x = iS.x') < 0 || sh.fragmentShader.indexOf('vCol1.rgb') < 0) console.warn('[peso] bagliori: lo shader degli sprite non è quello atteso'); };
    mat.customProgramCacheKey = () => 'pesoBagliori1';
    mat.uniforms.diffuse.value.setRGB(1, 1, 1); mat.uniforms.opacity.value = 1;
    const mesh = new T3.Mesh(g, mat); mesh.frustumCulled = false; mesh.name = 'pesoBagliori'; mesh.userData.pesoCat = 'luci_fx';
    if (mat.uniforms.uvTransform && m.map) { m.map.updateMatrix(); mat.uniforms.uvTransform.value.copy(m.map.matrix); }
    K.scene.add(mesh); L = { mesh, list: [], c, s, col }; LOTTI.set(k, L); return L;
  }
  // [peso] e le superfici additive ferme (le pozze di luce a terra dei lampioni, VX.decals, gli aloni piatti): una mesh sola per gruppo di
  // materiali uguali a meno di colore e opacità, che vanno nei vertici (colore con l'alfa: diffuse = 1, l'opacità del vertice); le
  // posizioni nel mondo fissate alla raccolta (chi si muove esce dal lotto)
  const PIANE = new Map();
  function adattaPiana(o) {
    const m = o.material; if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || Array.isArray(m) || !m || !m.isMeshBasicMaterial || m.blending !== T3.AdditiveBlending || m.depthWrite || !m.transparent || m.vertexColors || o.renderOrder || m.alphaMap || m.onBeforeCompile !== T3.Material.prototype.onBeforeCompile) return false;
    const g = o.geometry; if (!g || !g.attributes.position || g.morphAttributes && Object.keys(g.morphAttributes).length || g.attributes.position.count > 400 || g.attributes.color) return false; return true;
  }
  function chiavePiana(m) { return [m.map ? m.map.uuid : '-', m.side, m.fog, m.toneMapped, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.alphaTest, m.wireframe].join('|'); }
  function costruisciPiane(tutte) {
    PIANE.forEach(L => { L.list.forEach(([o]) => { o.material.visible = true; o.__pbp = false; }); if (L.mesh.parent) L.mesh.parent.remove(L.mesh); L.mesh.geometry.dispose(); }); PIANE.clear();
    const grp = new Map();
    tutte.forEach(o => { if (!o.parent || !adattaPiana(o)) return; const k = chiavePiana(o.material); let L = grp.get(k); if (!L) grp.set(k, L = []); L.push(o); });
    grp.forEach((list, k) => { if (list.length < 2) return; let n = 0; list.forEach(o => { const g = o.geometry; n += g.index ? g.index.count : g.attributes.position.count; });
      const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 4), v = new T3.Vector3(); let w = 0; const items = [];
      list.forEach(o => { const g = o.geometry, P = g.attributes.position, U = g.attributes.uv, ix = g.index ? g.index.array : null, c = ix ? ix.length : P.count, s0 = w;
        for (let q = 0; q < c; q++, w++) { const s = ix ? ix[q] : q; v.fromBufferAttribute(P, s).applyMatrix4(o.matrixWorld); pos[w * 3] = v.x; pos[w * 3 + 1] = v.y; pos[w * 3 + 2] = v.z; if (U) { uv[w * 2] = U.getX(s); uv[w * 2 + 1] = U.getY(s); } }
        items.push([o, s0, c, o.matrixWorld.elements.slice(), -1, -1, -1, -1]); });
      const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T3.BufferAttribute(uv, 2));
      const ca = new T3.BufferAttribute(col, 4); ca.setUsage(T3.DynamicDrawUsage); geo.setAttribute('color', ca); geo.computeBoundingSphere();
      const m0 = list[0].material, mat = m0.clone(); mat.color.setRGB(1, 1, 1); mat.opacity = 1; mat.vertexColors = true; mat.visible = true;
      const mesh = new T3.Mesh(geo, mat); mesh.name = 'pesoPiane'; mesh.userData.pesoCat = 'luci_fx'; mesh.frustumCulled = false; K.scene.add(mesh);
      list.forEach(o => { o.material.visible = false; o.__pbp = true; }); PIANE.set(k, { mesh, list: items, ca }); });
    let n = 0; PIANE.forEach(L => n += L.list.length); ST.piane = n;
  }
  function aggiornaPiane(cl) {
    PIANE.forEach(L => { const a = L.ca.array; let ch = false;
      for (const it of L.list) { const [o, s0, c] = it; const m = o.material; let r = m.color.r, g = m.color.g, b = m.color.b, al = m.opacity;
        if (!o.parent || !vis(o, cl)) al = 0; else { const e = o.matrixWorld.elements, e0 = it[3]; if (e[12] !== e0[12] || e[13] !== e0[13] || e[14] !== e0[14] || e[0] !== e0[0] || e[5] !== e0[5] || e[10] !== e0[10]) { ST.mosse++; al = 0; m.visible = true; it[8] = 1; } else if (it[8]) { m.visible = false; it[8] = 0; } }
        if (it[8]) al = 0;
        if (r !== it[4] || g !== it[5] || b !== it[6] || al !== it[7]) { it[4] = r; it[5] = g; it[6] = b; it[7] = al; for (let q = s0; q < s0 + c; q++) { a[q * 4] = r; a[q * 4 + 1] = g; a[q * 4 + 2] = b; a[q * 4 + 3] = al; } ch = true; } }
      if (ch) L.ca.needsUpdate = true; });
  }
  // il giro della scena a rate (P.passo nodi per fotogramma, come render.js sliceWalk): niente fotogramma lungo; a giro finito le liste nuove
  const GIRO = { stack: null, sp: [], pi: [], firma: '' };
  function giro() {
    if (!GIRO.stack) { GIRO.stack = [K.scene]; GIRO.sp = []; GIRO.pi = []; }
    const S = GIRO.stack; let n = P.passo;
    while (n-- > 0 && S.length) { const o = S.pop(), c = o.children; for (let i = c.length - 1; i >= 0; i--) S.push(c[i]);
      if (o.isSprite) { if (o.material && (adatto(o) || (o.material.visible === false && o.__pb))) GIRO.sp.push(o); } else if (o.isMesh && o.material && (o.__pbp || adattaPiana(o))) GIRO.pi.push(o); }
    if (S.length) return; GIRO.stack = null;
    // gli sprite: i lotti nuovi
    LOTTI.forEach(L => { L.list.forEach(o => { if (o.material) o.material.visible = true; o.__pb = false; }); L.list.length = 0; });
    GIRO.sp.forEach(o => { if (!adatto(o)) return; const L = lotto(o.material); if (L.list.length < P.max) { L.list.push(o); o.material.visible = false; o.__pb = true; } });
    let n2 = 0; LOTTI.forEach(L => n2 += L.list.length); ST.sprite = n2; ST.lotti = LOTTI.size;
    // le superfici: si rifanno solo se l'insieme è cambiato
    const f = GIRO.pi.length + ':' + GIRO.pi.reduce((a, o) => a + o.id, 0); if (f !== GIRO.firma) { GIRO.firma = f; costruisciPiane(GIRO.pi); }
  }
  const vis = (o, cl) => { if (!o.layers.test(cl)) return false; for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  function prima(kit) {
    if (!ON) return; K = kit; if (!T3) T3 = window.THREE; frame++;
    if (!attivo) return;
    giro();
    const cl = K.camera().layers;
    aggiornaPiane(cl);
    LOTTI.forEach(L => { let n = 0; const c = L.c.array, s = L.s.array, col = L.col.array;
      for (const o of L.list) { if (!o.parent || !vis(o, cl)) continue; const m = o.material; if (!(m.opacity > 0)) continue;
        const e = o.matrixWorld.elements; c[n * 3] = e[12]; c[n * 3 + 1] = e[13]; c[n * 3 + 2] = e[14];
        s[n * 2] = Math.hypot(e[0], e[1], e[2]); s[n * 2 + 1] = Math.hypot(e[4], e[5], e[6]);
        col[n * 4] = m.color.r; col[n * 4 + 1] = m.color.g; col[n * 4 + 2] = m.color.b; col[n * 4 + 3] = m.opacity; n++; }
      L.mesh.geometry.instanceCount = n; L.mesh.visible = n > 0; L.c.needsUpdate = L.s.needsUpdate = L.col.needsUpdate = true; });
  }
  function spegni() { LOTTI.forEach(L => { L.list.forEach(o => { if (o.material) o.material.visible = true; }); L.list.length = 0; L.mesh.visible = false; });
    PIANE.forEach(L => { L.list.forEach(([o]) => { o.material.visible = true; o.__pbp = false; }); if (L.mesh.parent) L.mesh.parent.remove(L.mesh); L.mesh.geometry.dispose(); }); PIANE.clear(); GIRO.stack = null; GIRO.firma = ''; }
  return { ON, P, prima, conto: () => Object.assign({ on: ON }, ST), get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) spegni(); } };
})();
if (typeof window !== 'undefined') { window.PesoBagliori = PesoBagliori; (window.__pesoAB = window.__pesoAB || {}).bagliori = v => { PesoBagliori.attivo = v; }; }
