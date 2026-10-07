
/* Caricamento dei modelli senza richieste "data:" né "blob:".
   I file in assets/ sono glTF con buffer e immagini incorporati in base64. Alcune pagine (gli artifact) non permettono
   di scaricare indirizzi data:/blob:, e il caricatore di three li scarica proprio così: i modelli non arrivano mai.
   Qui il JSON si legge con una sola richiesta normale, i buffer si decodificano a mano e si impacchettano in un GLB
   in memoria; le immagini diventano ImageBitmap senza passare da un indirizzo. */
(function () {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader || THREE.GLTFLoader.__pvPatched) return;
  const b64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const dataBytes = uri => { const c = uri.indexOf(','); return b64(uri.slice(c + 1)); };
  const isData = u => typeof u === 'string' && u.startsWith('data:');
  function toGLB(json) {
    // tutti i buffer incorporati diventano un buffer solo (il blocco BIN del GLB)
    const parts = [], offs = []; let total = 0;
    (json.buffers || []).forEach((bf, i) => { const bytes = isData(bf.uri) ? dataBytes(bf.uri) : new Uint8Array(bf.byteLength || 0); offs[i] = total; parts.push(bytes); total += bytes.length; const pad = (4 - total % 4) % 4; if (pad) { parts.push(new Uint8Array(pad)); total += pad; } });
    (json.bufferViews || []).forEach(v => { v.byteOffset = (v.byteOffset || 0) + (offs[v.buffer] || 0); v.buffer = 0; });
    json.buffers = total ? [{ byteLength: total }] : [];
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json)), jl = Math.ceil(jsonBytes.length / 4) * 4;
    const out = new Uint8Array(12 + 8 + jl + (total ? 8 + total : 0)), dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.length, true);
    dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true); out.set(jsonBytes, 20); for (let i = jsonBytes.length; i < jl; i++) out[20 + i] = 0x20;
    if (total) { const o = 20 + jl; dv.setUint32(o, total, true); dv.setUint32(o + 4, 0x004E4942, true); let p = o + 8; parts.forEach(x => { out.set(x, p); p += x.length; }); }
    return out.buffer;
  }
  const FILTERS = { 9728: THREE.NearestFilter, 9729: THREE.LinearFilter, 9984: THREE.NearestMipmapNearestFilter, 9985: THREE.LinearMipmapNearestFilter, 9986: THREE.NearestMipmapLinearFilter, 9987: THREE.LinearMipmapLinearFilter };
  const WRAPS = { 33071: THREE.ClampToEdgeWrapping, 33648: THREE.MirroredRepeatWrapping, 10497: THREE.RepeatWrapping };
  // immagini incorporate: decodificate a mano, senza indirizzi
  const imagePlugin = parser => ({
    name: 'PV_inline_images',
    loadTexture(ti) {
      const json = parser.json, td = json.textures[ti], src = td && json.images && json.images[td.source];
      if (!src || !(isData(src.uri) || src.bufferView !== undefined)) return null;
      parser.__pvTex = parser.__pvTex || {};
      if (!parser.__pvTex[td.source]) {
        const bm = (bytes, mime) => createImageBitmap(new Blob([bytes], { type: mime }), { imageOrientation: 'none', premultiplyAlpha: 'none' }).catch(() => null);
        parser.__pvTex[td.source] = isData(src.uri) ? bm(dataBytes(src.uri), src.uri.slice(5, src.uri.indexOf(';')) || 'image/png')
          : parser.getDependency('bufferView', src.bufferView).then(ab => bm(new Uint8Array(ab), src.mimeType || 'image/png'));
      }
      return parser.__pvTex[td.source].then(bmp => {
        if (!bmp) return null;
        const t = new THREE.Texture(bmp); t.flipY = false; t.needsUpdate = true; t.name = td.name || src.name || '';
        const s = (json.samplers || [])[td.sampler] || {};
        t.magFilter = FILTERS[s.magFilter] || THREE.LinearFilter; t.minFilter = FILTERS[s.minFilter] || THREE.LinearMipmapLinearFilter;
        t.wrapS = WRAPS[s.wrapS] || THREE.RepeatWrapping; t.wrapT = WRAPS[s.wrapT] || THREE.RepeatWrapping;
        parser.associations.set(t, { textures: ti }); return t;
      });
    },
  });
  const P = THREE.GLTFLoader.prototype, load0 = P.load, parse0 = P.parse;
  P.parse = function (data, path, onLoad, onError) {
    if (!this.__pvReg) { this.register(imagePlugin); this.__pvReg = true; }
    if (typeof data === 'string') { let j; try { j = JSON.parse(data); } catch (e) { return parse0.call(this, data, path, onLoad, onError); } data = toGLB(j); }
    return parse0.call(this, data, path, onLoad, onError);
  };
  P.load = function (url, onLoad, onProgress, onError) {
    const self = this;
    fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); })
      .then(txt => self.parse(txt, '', onLoad, e => { console.warn('GLTF', url, e); if (onError) onError(e); }))
      .catch(e => { console.warn('GLTF', url, e); if (onError) onError(e); });
  };
  THREE.GLTFLoader.__pvPatched = true;
})();

/* Porto Vecchio — kit modulari (Kenney Building Kit, Retro Urban Kit) per costruire gli edifici.
   Un GLB per kit in assets/mk, un nodo per modulo. Si carica PRIMA della scena: gli edifici nascono già montati.
   Le misure del Building Kit sono metri veri (muro 2 × 2,4 m) e combaciano con la casella di 2 m del gioco. */
var Kit = (function () {
  'use strict';
  const LIB = {};
  let ready = false;
  // attributi quantizzati -> float32 (la fusione della geometria statica li vuole così)
  function dequant(geo) {
    for (const k of ['position', 'normal', 'uv']) {
      const a = geo.attributes[k]; if (!a || (a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute)) continue;
      const n = a.count, s = a.itemSize, f = new Float32Array(n * s);
      for (let i = 0; i < n; i++) { f[i * s] = a.getX(i); if (s > 1) f[i * s + 1] = a.getY(i); if (s > 2) f[i * s + 2] = a.getZ(i); }
      geo.setAttribute(k, new THREE.BufferAttribute(f, s));
    }
    for (const k in geo.attributes) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2).fill(.5), 2));
    const a = geo.attributes.normal; if (a) for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), l = Math.hypot(x, y, z) || 1; a.setXYZ(i, x / l, y / l, z / l); }
    return geo;
  }
  const MATS = new Map();
  function fixMat(m) {
    if (MATS.has(m)) return MATS.get(m);
    const map = m.map || null; if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.needsUpdate = true; }
    const n = new THREE.MeshStandardMaterial({ map, color: m.color ? m.color.clone() : new THREE.Color('#fff'), roughness: .9, metalness: 0, transparent: m.transparent && m.opacity < 1, opacity: m.opacity, side: m.side });
    n.name = m.name; MATS.set(m, n); return n;
  }
  async function load(base, kits) {
    if (ready) return true;
    if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return false;
    const L = new THREE.GLTFLoader();
    await Promise.all(kits.map(async k => {
      const buf = await (await fetch(base + 'kit_' + k + '.json')).text();
      const g = await new Promise((res, rej) => L.parse(buf, '', res, rej));
      g.scene.updateMatrixWorld(true);
      for (const c of [...g.scene.children]) { c.traverse(o => { if (o.isMesh) { dequant(o.geometry); o.material = fixMat(o.material); } }); LIB[k + '/' + c.name] = c; }
    }));
    ready = true; return true;
  }
  function get(name) {
    const src = LIB[name]; if (!src) return new THREE.Group();
    const o = src.clone(true), g = new THREE.Group(); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); g.add(o); return g;
  }
  const has = name => !!LIB[name];
  function texOf(name) { let t = null; const o = LIB[name]; if (o) o.traverse(m => { if (!t && m.isMesh && m.material && m.material.map) t = m.material.map; }); return t; }
  return { load, get, has, texOf, names: () => Object.keys(LIB), get ready() { return ready; } };   // [studio] names
})();
