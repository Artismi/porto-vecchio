/* Porto Vecchio — [peso] le persone fuse (v7).
   Il banco del peso: una persona costa 20-35 disegni (e altrettanti nell'ombra): ogni pezzo del corpo, ogni capo, ogni accessorio è una
   mesh col suo materiale, e la maggior parte dei materiali è lo stesso materiale con un altro colore (le tinte di maglia, pantaloni,
   capelli, scarpe, cappello). Qui, quando una persona ha finito di vestirsi, i suoi pezzi diventano poche SkinnedMesh sullo stesso
   scheletro, una per materiale «a meno del colore»: il colore, l'emissivo (la luce propria dei personaggi), la ruvidità e il metallo
   passano nei vertici (attributi pc1, pe1, pr1) e lo shader li legge dove leggeva le uniformi. Gli accessori rigidi agganciati a un osso
   (cappelli, occhiali, borse, cinture) entrano come pelle con un osso solo, peso 1: stessa posizione, stesso movimento.
   Generico: lavora su quello che il costruttore della figura ha prodotto (models.js oggi, personaggi.js domani), senza sapere cosa sia.
   Niente di quello che il gioco accende o spegne: ogni pezzo fuso e i suoi antenati fino alla persona tengono d'occhio la loro
   visibilità; se il gioco la cambia (il casco della rivolta, un oggetto in mano), la persona torna come prima (e si rifonde dopo).
   Gli originali restano, nascosti alla camera con i livelli (layers.mask = 0), pronti per tornare. Il giocatore non si fonde.
   Stesso shader, stessi numeri: l'immagine è la stessa. ?nopesogente lo spegne. Window.__pesoAB.gente per il banco.             */
var PesoGente = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopeso(gente)?\b/.test(Q);
  const P = { attesa: 20, ms: 2, riprova: 120, lontanoPx: 28 };
  const LONTANO = !/[?&]nopeso(lontane)?\b/.test(Q);
  const ST = { fuse: 0, sciolte: 0, pezzi: 0, disegni: 0, ms: 0, scartate: 0, lontane: 0 };
  let T3 = null, attivo = true, frame = 0;
  const CANON = new Map(), LIVE = new Set();
  const MOTIVI = new Map();   // perché una persona torna com'era (chi ha cambiato visibilità)
  const R = {
    dif: 'vec4 diffuseColor = vec4( diffuse, opacity );',
    emi: 'vec3 totalEmissiveRadiance = emissive;',
    rou: 'float roughnessFactor = roughness;',
    met: 'float metalnessFactor = metalness;',
  };
  const OKT = { MeshStandardMaterial: 'standard', MeshLambertMaterial: 'lambert', MeshPhongMaterial: 'phong' };
  const SKIP = new Set(['uuid', 'name', 'id', 'version', 'userData', 'color', 'emissive', 'roughness', 'metalness', '_listeners', 'type', 'onBuild', 'onBeforeRender', 'onBeforeCompile', 'customProgramCacheKey']);
  // la firma di un materiale a meno di colore, emissivo, ruvidità e metallo (null: non si fonde)
  const FIRME = new WeakMap();
  const DEF = {}, KEYS = ['map', 'emissiveMap', 'normalMap', 'normalMapType', 'normalScale', 'bumpMap', 'bumpScale', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'aoMapIntensity', 'lightMap', 'lightMapIntensity', 'envMap', 'envMapIntensity',
    'displacementMap', 'specularMap', 'side', 'shadowSide', 'flatShading', 'wireframe', 'fog', 'transparent', 'opacity', 'alphaTest', 'alphaToCoverage', 'depthTest', 'depthWrite', 'depthFunc', 'colorWrite', 'blending', 'toneMapped',
    'vertexColors', 'emissiveIntensity', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'dithering', 'premultipliedAlpha', 'visible', 'shininess', 'specular', 'reflectivity', 'refractionRatio', 'combine', 'precision'];
  function firma(m) {
    if (FIRME.has(m)) return FIRME.get(m);
    let out = null;
    if (m && OKT[m.type] && !m.transparent && !m.vertexColors && m.visible !== false && m.onBeforeCompile === T3.Material.prototype.onBeforeCompile && m.customProgramCacheKey === T3.Material.prototype.customProgramCacheKey) {
      // solo quello che cambia il programma o le uniformi (a meno dei quattro valori), con i valori di partenza della classe dove mancano
      const D = DEF[m.type] || (DEF[m.type] = new T3[m.type]()), a = [m.type];
      for (const k of KEYS) { let v = m[k]; if (v === undefined) v = D[k];
        if (v === null || v === undefined) a.push(k + ':-'); else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') a.push(k + ':' + v);
        else if (v.isColor) a.push(k + ':' + v.getHexString()); else if (v.isTexture) a.push(k + ':' + v.uuid); else if (v.isVector2 || v.isVector3) a.push(k + ':' + v.toArray().join(','));
        else { FIRME.set(m, null); return null; } }
      if (m.clippingPlanes && m.clippingPlanes.length) { FIRME.set(m, null); return null; }
      if (m.defines && Object.keys(m.defines).some(k => k !== 'STANDARD')) { FIRME.set(m, null); return null; }
      out = a.join('|');
      const L = T3.ShaderLib[OKT[m.type]], C = T3.ShaderChunk, f = L.fragmentShader.replace('#include <roughnessmap_fragment>', C.roughnessmap_fragment).replace('#include <metalnessmap_fragment>', C.metalnessmap_fragment);
      const una = s => f.split(s).length === 2; if (!una(R.dif) || !una(R.emi) || (m.type === 'MeshStandardMaterial' && (!una(R.rou) || !una(R.met)))) out = null;
    }
    FIRME.set(m, out); return out;
  }
  function canon(m, k) {
    let c = CANON.get(k); if (c) return c;
    c = m.clone(); c.color.setRGB(1, 1, 1); if (c.emissive) c.emissive.setRGB(1, 1, 1); c.userData = Object.assign({}, m.userData, { pesoGente: true });
    const std = m.type === 'MeshStandardMaterial';
    c.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 pc1; attribute vec3 pe1; attribute vec2 pr1; varying vec3 vPc1; varying vec3 vPe1; varying vec2 vPr1;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPc1 = pc1; vPe1 = pe1; vPr1 = pr1;');
      const C = T3.ShaderChunk;
      let f = sh.fragmentShader.replace('#include <roughnessmap_fragment>', C.roughnessmap_fragment).replace('#include <metalnessmap_fragment>', C.metalnessmap_fragment);
      f = f.replace('#include <common>', '#include <common>\nvarying vec3 vPc1; varying vec3 vPe1; varying vec2 vPr1;').replace(R.dif, 'vec4 diffuseColor = vec4( diffuse * vPc1, opacity );').replace(R.emi, 'vec3 totalEmissiveRadiance = emissive * vPe1;');
      if (std) f = f.replace(R.rou, 'float roughnessFactor = vPr1.x;').replace(R.met, 'float metalnessFactor = vPr1.y;');
      sh.fragmentShader = f; };
    c.customProgramCacheKey = () => 'pesoGente1';   // lo stesso innesto per tutti: il resto della chiave del programma lo fa three dai parametri (mappa sì o no…), così i programmi sono pochi
    CANON.set(k, c); return c;
  }
  // 1) il piano: i pezzi accesi e fondibili della persona, a gruppi per materiale (veloce: niente vertici)
  function piano(g) {
    if (!T3) T3 = window.THREE; g.updateMatrixWorld(true);
    let ref = null; g.traverseVisible(o => { if (!ref && o.isSkinnedMesh && o.skeleton && o.bindMode === 'attached' && !o.userData.pesoGente) ref = o; });
    if (!ref) return null;
    const bones = ref.skeleton.bones, bi = new Map(); bones.forEach((b, i) => bi.set(b, i));
    const sameSk = o => { const s = o.skeleton; if (!s || s.bones.length !== bones.length || o.bindMode !== 'attached') return false; if (s === ref.skeleton) return true; for (let i = 0; i < bones.length; i++) if (s.bones[i] !== bones[i]) return false;
      for (let i = 0; i < 16; i++) if (Math.abs(o.bindMatrix.elements[i] - ref.bindMatrix.elements[i]) > 1e-9) return false;
      if (s.boneInverses === ref.skeleton.boneInverses) return true;
      for (let i = 0; i < s.boneInverses.length; i++) { const a = s.boneInverses[i].elements, b = ref.skeleton.boneInverses[i].elements; for (let k = 0; k < 16; k++) if (Math.abs(a[k] - b[k]) > 1e-9) return false; } return true; };
    // quello che il gioco tiene in mano (oggetti, armi, cappelli da cambiare, l'ombra a macchia) resta fuori: solo valori semplici (oggetti 3D,
    // liste, oggetti letterali; non il mixer e le azioni, non le ossa né le radici del modello, che tiene l'animazione)
    const haSkin = o => { let k = false; o.traverse(q => { if (q.isSkinnedMesh) k = true; }); return k; };
    const live = new Set(); const walkU = (v, d) => { if (!v || typeof v !== 'object' || d > 3) return;
      if (v.isObject3D) { if (v !== g && !v.isBone && !haSkin(v)) live.add(v); return; }
      if (Array.isArray(v)) { v.forEach(x => walkU(x, d + 1)); return; }
      const pr = Object.getPrototypeOf(v); if (pr !== Object.prototype && pr !== null) return; for (const k in v) walkU(v[k], d + 1); };
    for (const k in g.userData) if (k !== 'body') walkU(g.userData[k], 0);
    const isLive = o => { for (let q = o; q && q !== g; q = q.parent) if (live.has(q)) return true; return false; };
    const groups = new Map(), sources = [];
    const binv = new T3.Matrix4().copy(ref.bindMatrix).invert(), M = new T3.Matrix4();
    g.traverseVisible(o => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.pesoGente || o.userData.noCast1 || o.renderOrder || o.customDepthMaterial || isLive(o)) return;
      const geo = o.geometry; if (!geo || !geo.attributes.position || (geo.morphAttributes && Object.keys(geo.morphAttributes).length)) return;
      for (const k in geo.attributes) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(k)) return;
      let bone = -1;
      if (o.isSkinnedMesh) { if (!sameSk(o)) return; } else { for (let q = o.parent; q && q !== g; q = q.parent) if (bi.has(q)) { bone = bi.get(q); break; } if (bone < 0) return; }
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      const parts = Array.isArray(o.material) ? (geo.groups.length ? geo.groups : null) : [{ start: 0, count: Infinity, materialIndex: 0 }]; if (!parts) return;
      const ks = parts.map(p => { const m = ms[p.materialIndex]; const f = m ? firma(m) : null; return f ? f + '|' + o.castShadow + o.receiveShadow + o.frustumCulled : null; }); if (ks.some(k => !k)) return;
      let mat = null; if (!o.isSkinnedMesh) { const bn = bones[bone]; M.copy(bn.matrixWorld).invert().multiply(o.matrixWorld); mat = new T3.Matrix4().copy(binv).multiply(new T3.Matrix4().copy(ref.skeleton.boneInverses[bone]).invert()).multiply(M); }
      parts.forEach((p, j) => { const k = ks[j], m = ms[p.materialIndex]; let e = groups.get(k); if (!e) groups.set(k, e = { m, k, list: [], cast: o.castShadow, rec: o.receiveShadow, fc: o.frustumCulled, icR: o.__icR }); e.list.push({ o, p, mat, bone, m }); });
      sources.push(o);
    });
    let before = 0; groups.forEach(e => before += e.list.length); if (before - groups.size < 2) return null;   // conviene solo se si risparmia qualcosa
    // da fondere solo i gruppi con più di un pezzo; gli altri restano com'erano
    const gl = [...groups.values()].filter(e => e.list.length > 1), used = new Set(); gl.forEach(e => e.list.forEach(it => used.add(it.o)));
    // un pezzo con più materiali va fuso tutto o niente
    const src = sources.filter(o => used.has(o) && (!Array.isArray(o.material) || gl.reduce((n, e) => n + e.list.filter(it => it.o === o).length, 0) === o.geometry.groups.length));
    const ok = new Set(src); const gl2 = gl.map(e => Object.assign({}, e, { list: e.list.filter(it => ok.has(it.o)) })).filter(e => e.list.length > 1);
    const ok2 = new Set(); gl2.forEach(e => e.list.forEach(it => ok2.add(it.o)));
    if (!gl2.length) return null;
    return { g, ref, groups: gl2, sources: sources.filter(o => ok2.has(o)), made: [], gi: 0, vis: null, tutti: [...groups.values()], fonti: sources };
  }
  // 2) la costruzione, un gruppo alla volta (a budget, fra un fotogramma e l'altro): i vertici letti dagli array, senza oggetti di passaggio
  const N3 = { e: new Float32Array(9) };
  // [peso] la persona lontana (sotto P.lontanoPx pixel d'altezza): tutti i pezzi in una o due SkinnedMesh senza mappe, il colore di ogni pezzo
  // moltiplicato per la media della sua mappa (a quella misura la scheda video legge comunque l'ultimo livello delle mipmap, cioè la media)
  const MEDIE = new WeakMap(), PIATTI = new WeakMap();
  function media(t) {
    if (!t) return [1, 1, 1]; if (MEDIE.has(t)) return MEDIE.get(t); let out = null;
    try { const im = t.image;
      if (im && im.data && im.width && im.height) { const d = im.data, n = im.width * im.height, k = d.length / n; let r = 0, g = 0, b = 0; const sc = d instanceof Uint8Array || d instanceof Uint8ClampedArray ? 255 : 1; for (let i = 0; i < d.length; i += k) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } out = [r / n / sc, g / n / sc, b / n / sc]; }
      else if (im && im.width > 1 && im.height > 1) { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const x = c.getContext('2d'); x.drawImage(im, 0, 0, 8, 8); const d = x.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0, a = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; } if (a > 0) out = [r / 64 / 255, g / 64 / 255, b / 64 / 255]; }
    } catch (e) { out = null; }
    MEDIE.set(t, out); return out;
  }
  function piatto(m) { let c = PIATTI.get(m); if (c) return c; c = m.clone(); ['map', 'emissiveMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap', 'aoMap', 'lightMap', 'specularMap', 'displacementMap'].forEach(k => { if (k in c) c[k] = null; }); PIATTI.set(m, c); return c; }
  function gruppo(P0, e, lontano) {
    let n = 0; const its = e.list.map(it => { const geo = it.o.geometry, gi = geo.index; const cnt = gi ? gi.count : geo.attributes.position.count, st = Math.max(0, it.p.start), c = Math.max(0, Math.min(cnt - st, it.p.count)); n += c; return [it, st, c]; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), pc = new Float32Array(n * 3), pe = new Float32Array(n * 3), pr = new Float32Array(n * 2);
    const nm = new T3.Matrix3(); let w = 0;
    const rd = (A, s, k) => A.isInterleavedBufferAttribute ? [A.getX, A.getY, A.getZ, A.getW][k].call(A, s) : (A.normalized ? [A.getX, A.getY, A.getZ, A.getW][k].call(A, s) : A.array[s * A.itemSize + k]);
    its.forEach(([it, st, c]) => { const geo = it.o.geometry, A = geo.attributes, ix = geo.index ? geo.index.array : null, m = it.m, mt = it.mat ? it.mat.elements : null;
      const P = A.position, Nn = A.normal, U = A.uv, I = A.skinIndex, W = A.skinWeight, fast = a => a && !a.isInterleavedBufferAttribute && !a.normalized;
      const pa = fast(P) ? P.array : null, na = fast(Nn) ? Nn.array : null, ua = fast(U) ? U.array : null;
      if (mt) nm.getNormalMatrix(it.mat); const ne = nm.elements;
      let col = m.color, em = m.emissive; const ro = m.roughness !== undefined ? m.roughness : 1, me = m.metalness !== undefined ? m.metalness : 0;
      if (lontano) { const a = media(m.map), b = m.emissiveMap ? media(m.emissiveMap) : [1, 1, 1]; col = { r: col.r * a[0], g: col.g * a[1], b: col.b * a[2] }; if (em) em = { r: em.r * b[0], g: em.g * b[1], b: em.b * b[2] }; }
      for (let q = 0; q < c; q++, w++) { const s = ix ? ix[st + q] : st + q;
        let x = pa ? pa[s * 3] : rd(P, s, 0), y = pa ? pa[s * 3 + 1] : rd(P, s, 1), z = pa ? pa[s * 3 + 2] : rd(P, s, 2);
        if (mt) { const X = mt[0] * x + mt[4] * y + mt[8] * z + mt[12], Y = mt[1] * x + mt[5] * y + mt[9] * z + mt[13], Z = mt[2] * x + mt[6] * y + mt[10] * z + mt[14], H = mt[3] * x + mt[7] * y + mt[11] * z + mt[15]; x = X / H; y = Y / H; z = Z / H; }
        pos[w * 3] = x; pos[w * 3 + 1] = y; pos[w * 3 + 2] = z;
        if (Nn) { let a = na ? na[s * 3] : rd(Nn, s, 0), b = na ? na[s * 3 + 1] : rd(Nn, s, 1), d = na ? na[s * 3 + 2] : rd(Nn, s, 2);
          if (mt) { const X = ne[0] * a + ne[3] * b + ne[6] * d, Y = ne[1] * a + ne[4] * b + ne[7] * d, Z = ne[2] * a + ne[5] * b + ne[8] * d, L = Math.sqrt(X * X + Y * Y + Z * Z) || 1; a = X / L; b = Y / L; d = Z / L; }
          nor[w * 3] = a; nor[w * 3 + 1] = b; nor[w * 3 + 2] = d; }
        if (U) { uv[w * 2] = ua ? ua[s * 2] : rd(U, s, 0); uv[w * 2 + 1] = ua ? ua[s * 2 + 1] : rd(U, s, 1); }
        if (mt) { si[w * 4] = it.bone; sw[w * 4] = 1; } else { for (let k = 0; k < 4; k++) { si[w * 4 + k] = rd(I, s, k); sw[w * 4 + k] = rd(W, s, k); } }
        pc[w * 3] = col.r; pc[w * 3 + 1] = col.g; pc[w * 3 + 2] = col.b; pe[w * 3] = em ? em.r : 0; pe[w * 3 + 1] = em ? em.g : 0; pe[w * 3 + 2] = em ? em.b : 0; pr[w * 2] = ro; pr[w * 2 + 1] = me; } });
    const geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T3.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T3.BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new T3.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T3.BufferAttribute(sw, 4));
    geo.setAttribute('pc1', new T3.BufferAttribute(pc, 3)); geo.setAttribute('pe1', new T3.BufferAttribute(pe, 3)); geo.setAttribute('pr1', new T3.BufferAttribute(pr, 2));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const ref = P0.ref, sm = new T3.SkinnedMesh(geo, canon(e.m, e.k)); sm.name = 'pesoGente'; sm.userData.pesoGente = true; sm.userData.thin2 = 1;
    sm.castShadow = e.cast; sm.receiveShadow = e.rec; sm.frustumCulled = e.fc; if (e.icR) sm.__icR = e.icR;
    sm.position.copy(ref.position); sm.quaternion.copy(ref.quaternion); sm.scale.copy(ref.scale); sm.bind(ref.skeleton, ref.bindMatrix);
    return sm;
  }
  // la versione lontana di una persona fusa (si fa la prima volta che serve); null se una mappa non si può leggere
  function lontana(rec) {
    const P0 = rec.piano, fg = new Map();
    for (const e of P0.tutti) for (const it of e.list) { if ((it.m.map && !media(it.m.map)) || (it.m.emissiveMap && !media(it.m.emissiveMap))) return null;
      const fm = piatto(it.m), f = firma(fm); if (!f) return null; const k = f + '|' + e.cast + e.rec + e.fc; let q = fg.get(k); if (!q) fg.set(k, q = { m: fm, k, list: [], cast: e.cast, rec: e.rec, fc: e.fc, icR: e.icR }); q.list.push(it); }
    const out = []; fg.forEach(q => out.push(gruppo(P0, q, true))); return out;
  }
  function livello(rec, lontano) {   // i livelli della camera: vicino (i pezzi fusi più i rimasti soli) o lontano (le mesh piatte)
    if (rec.tier === lontano) return; rec.tier = lontano;
    rec.made.forEach(sm => { sm.layers.mask = lontano ? 0 : 1; });
    rec.soli.forEach(([o, m]) => { o.layers.mask = lontano ? 0 : m; });
    (rec.far || []).forEach(sm => { sm.layers.mask = lontano ? 1 : 0; });
  }
  // 3) al traguardo: i pezzi nuovi al posto dei vecchi, se nel frattempo nessuno ha acceso o spento qualcosa
  function applica(P0) {
    const g = P0.g, ref = P0.ref;
    for (const o of P0.sources) { for (let q = o; q && q !== g; q = q.parent) if (!q.visible) return false; if (!o.parent) return false; }
    if (!ref.parent) return false;
    P0.made.forEach(sm => ref.parent.add(sm));
    const watch = new Set(); P0.fonti.forEach(o => { for (let q = o; q && q !== g; q = q.parent) watch.add(q); });
    const near = new Set(P0.sources);
    const rec = { made: P0.made, sources: P0.sources.map(o => [o, o.layers.mask]), soli: P0.fonti.filter(o => !near.has(o)).map(o => [o, o.layers.mask]), watch: [], g, piano: P0, far: null, farNo: false, tier: false };
    watch.forEach(o => { let val = o.visible; Object.defineProperty(o, 'visible', { configurable: true, enumerable: true, get() { return val; }, set(x) { if (x !== val) { val = x; if (!rec.rotta) { rec.rotta = true; const k = (o.name || o.type) + '<' + ((o.parent && (o.parent.name || o.parent.type)) || '-') + (x ? ' acceso' : ' spento') + ' @' + (new Error().stack || '').split('\n').slice(2, 5).map(l => (l.match(/at (?:Object\.)?([\w$.]+)/) || [])[1]).filter(Boolean).join('<'); MOTIVI.set(k, (MOTIVI.get(k) || 0) + 1); } } } }); rec.watch.push(o); });
    P0.sources.forEach(o => { o.layers.mask = 0; });
    g.__pg = rec; LIVE.add(g); ST.fuse++; ST.pezzi += P0.sources.length; ST.disegni += P0.made.length;
    return true;
  }
  function fondi(g) { const P0 = piano(g); if (!P0) return false; P0.groups.forEach(e => P0.made.push(gruppo(P0, e))); if (!applica(P0)) { P0.made.forEach(sm => sm.geometry.dispose()); return false; } return true; }
  function sciogli(g) {
    const rec = g.__pg; if (!rec) return; g.__pg = null; LIVE.delete(g);
    rec.watch.forEach(o => { const val = o.visible; delete o.visible; o.visible = val; });
    rec.sources.forEach(([o, m]) => { o.layers.mask = m; });
    rec.made.forEach(sm => { if (sm.parent) sm.parent.remove(sm); sm.geometry.dispose(); });
    rec.soli.forEach(([o, m]) => { o.layers.mask = m; }); (rec.far || []).forEach(sm => { if (sm.parent) sm.parent.remove(sm); sm.geometry.dispose(); }); rec.piano = null;
    g.__pgT = frame; ST.sciolte++;
  }
  // a ogni fotogramma, prima del disegno: chi è tornato com'era (qualcosa cambiato), chi è pronto per fondersi (a budget, un gruppo alla volta)
  let JOB = null, KIT = null, PSC = undefined;
  // i programmi della scheda video dei pezzi nuovi si preparano prima dello scambio (in parallelo, KHR_parallel_shader_compile): niente scatto
  function precompila(J) {
    const rd = KIT && KIT.renderer, S = KIT && KIT.scene; if (!rd || !S) return;
    if (PSC === undefined) { try { PSC = rd.getContext().getExtension('KHR_parallel_shader_compile'); } catch (e) { PSC = null; } }
    const luci = []; S.traverseVisible(o => { if (o.isLight) luci.push(o); });
    const tmp = new T3.Group(); J.made.forEach(sm => tmp.children.push(sm));
    const ch = S.children; S.children = luci.concat([tmp]); try { rd.compile(S, KIT.camera()); } catch (e) { } finally { S.children = ch; }
  }
  function pronti(J) {
    if (!PSC || !KIT) return true; const rd = KIT.renderer, gl = rd.getContext();
    for (const sm of J.made) { const p = rd.properties.get(sm.material).currentProgram; if (p && p.program && !gl.getProgramParameter(p.program, PSC.COMPLETION_STATUS_KHR)) return false; }
    return true;
  }
  // [peso] la grafica scaldata prima: appena i modelli delle persone ci sono, una persona per modello (e una guardia), vestita e fusa, si
  // prepara fuori scena (renderer.compile con le luci della scena): i programmi delle persone e dei pezzi fusi sono pronti prima che
  // la prima persona compaia in strada (prima: lo scatto del primo incontro). Poi si butta via.
  // a tappe, un passo per fotogramma (una persona, poi i programmi, poi i pezzi fusi): niente fotogramma lungo nel menu
  let caldo = false; const CALDO = { tappa: 0, gs: [], tmp: null, t: 0 };
  function scalda() {
    if (caldo || !KIT || !window.Models || !Models.charsReady || !Models.charsReady()) return; if (!T3) T3 = window.THREE;
    const C = CALDO, rd = KIT.renderer, S = KIT.scene, t0 = performance.now(), MOD = ['Casual', 'Casual_2', 'Casual_Hoodie', 'Worker', 'Formal', 'cop'];
    const look = { top: '#8a3a2a', bottom: '#2a3a5a', hair: '#1a1410', skin: '#d8a888', hat: 'cap', extra: 'bag,shades,backpack' };
    const comp = () => { const luci = []; S.traverseVisible(o => { if (o.isLight) luci.push(o); }); const ch = S.children; S.children = luci.concat([C.tmp]); try { rd.compile(S, KIT.camera()); } finally { S.children = ch; } };
    try {
      if (!C.tmp) { C.tmp = new T3.Group(); }
      if (C.tappa < MOD.length) { const md = MOD[C.tappa++]; try { const g = md === 'cop' ? Models.person(Object.assign({}, look), 'cop') : Models.person(Object.assign({ model: md }, look), null);
          if (g) { if (g.userData.dressing) { let k = 0; while (!g.userData.dressing.next().done && k++ < 999); g.userData.dressing = null; } C.tmp.children.push(g); g.parent = C.tmp; C.gs.push(g); } } catch (e) { } }
      else if (C.tappa === MOD.length) { C.tappa++; C.tmp.updateMatrixWorld(true); comp(); }
      else { const fatti = []; C.gs.forEach(g => { const P0 = piano(g); if (P0) P0.groups.forEach(e => { const sm = gruppo(P0, e); fatti.push(sm); C.tmp.children.push(sm); sm.parent = C.tmp; }); });
        if (fatti.length) { C.tmp.updateMatrixWorld(true); comp(); } fatti.forEach(sm => sm.geometry.dispose()); caldo = true; C.gs = []; C.tmp = null; }
    } catch (e) { console.warn('[peso] gente, scaldare', e); caldo = true; }
    C.t += performance.now() - t0; ST.caldo_ms = Math.round(C.t);
  }
  let LASTP = null;
  function passo(people, kit) {
    KIT = kit || KIT; LASTP = people || LASTP; people = LASTP; if (!people) return; if (!caldo && ON) scalda();
    if (!ON) return; if (!T3) T3 = window.THREE; frame++;
    LIVE.forEach(g => { if (g.__pg && (g.__pg.rotta || !attivo)) sciogli(g); });
    if (!attivo) { JOB = null; return; }
    const t0 = performance.now();
    // vicino o lontano: l'altezza della persona sullo schermo (pixel della risoluzione interna), con un margine per non fare avanti e indietro
    if (KIT && LONTANO) { const cam = KIT.camera(), kpx = (KIT.H / 2) / Math.tan(cam.fov * Math.PI / 360), ce = cam.matrixWorld.elements; let costruita = false;
      LIVE.forEach(g => { const rec = g.__pg; if (!rec) return; const e = g.matrixWorld.elements, d = Math.hypot(e[12] - ce[12], e[13] - ce[13], e[14] - ce[14]) || 1, h = 1.8 * kpx / d;
        const want = rec.tier ? h < P.lontanoPx * 1.2 : h < P.lontanoPx;
        if (want && !rec.far) { if (rec.farNo || costruita) return; costruita = true; const f = lontana(rec); if (!f) { rec.farNo = true; return; } f.forEach(sm => { sm.layers.mask = 0; rec.piano.ref.parent.add(sm); }); rec.far = f; ST.lontane++; }
        if (rec.far) livello(rec, want); }); }
    while (performance.now() - t0 < P.ms) {
      if (!JOB) {
        let pick = null;
        for (const id in people) {
          if (id === '__player') continue; const g = people[id]; if (!g || g.__pg || !g.parent || !g.visible) continue;
          const u = g.userData; if (!u || !u.model || u.dressing || u.voxelWait) { g.__pgS = frame; continue; }
          if (g.__pgS === undefined) g.__pgS = frame; if (frame - g.__pgS < P.attesa) continue;   // vestito e fermo da un po'
          if (g.__pgT !== undefined && frame - g.__pgT < P.riprova) continue;
          pick = g; break; }
        if (!pick) break;
        try { JOB = piano(pick); } catch (e) { console.warn('[peso] gente', e); JOB = null; }
        if (!JOB) { pick.__pgT = frame; ST.scartate++; continue; }
      }
      const J = JOB;
      if (!J.g.parent || J.g.__pg) { J.made.forEach(sm => sm.geometry.dispose()); JOB = null; continue; }
      try {
        if (J.gi < J.groups.length) { J.made.push(gruppo(J, J.groups[J.gi++])); }
        else if (!J.comp) { J.comp = frame; precompila(J); }
        else if (!pronti(J) && frame - J.comp < 30) break;
        else { const ok = applica(J); if (!ok) { J.made.forEach(sm => sm.geometry.dispose()); J.g.__pgT = frame; ST.scartate++; } JOB = null; }
      } catch (e) { console.warn('[peso] gente', e); J.made.forEach(sm => sm.geometry.dispose()); J.g.__pgT = frame; JOB = null; }
    }
    ST.ms += performance.now() - t0;
  }
  // per il banco: tutto quello che il ritmo normale farebbe in qualche secondo, subito (le persone fuse, le versioni lontane)
  function completa() {
    const ms = P.ms; P.ms = 1e9; let k = 0;
    try { for (let i = 0; i < 400; i++) { passo(null, KIT); if (!JOB) { k++; if (k > 3) break; } else k = 0; } } finally { P.ms = ms; }
    return conto(); }
  function conto() { return Object.assign({ on: ON, attive: LIVE.size, materiali: CANON.size, motivi: [...MOTIVI.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8) }, ST); }
  return { ON, P, passo, conto, sciogli, fondi, completa, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) [...LIVE].forEach(sciogli); } };
})();
if (typeof window !== 'undefined') { window.PesoGente = PesoGente; (window.__pesoAB = window.__pesoAB || {}).gente = v => { PesoGente.attivo = v; }; }
