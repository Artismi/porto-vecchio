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
  return { load, get, has, texOf, get ready() { return ready; } };
})();
