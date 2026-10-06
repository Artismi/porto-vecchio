/* Porto Vecchio — I modelli scaricati usati come pezzi (Survival Pack e Toon Shooter di Quaternius, Furniture Kit e altri di Kenney).
   Le librerie fatte a mano (pezzi.js, bottino.js, le postazioni di oggetti_ui.js) costruiscono i modelli in modo sincrono:
   qui i file si caricano all'avvio in una cache, e chi costruisce chiede `Scaricati.get(id)`. Se il file non c'è ancora
   (o non arriva) torna null e si usa il modello fatto a mano: niente si rompe. Quando arrivano i file cresce `ver`,
   così chi ha già costruito un modello sa che può rifarlo.
   Ogni voce: [file, misura da adattare ('l' lato lungo in pianta, 'h' altezza, 'x' larghezza, 'z' profondità), metri, rotazione y].
   La rotazione porta il davanti del modello verso +z (convenzione del gioco). La base va a terra, al centro. */
var Scaricati = (function () {
  'use strict';
  const CAT = {
    // Survival Pack (Quaternius)
    radio: ['mj/s_Radio', 'x', .42, 0],
    bombola: ['mj/s_PropaneTank', 'h', .62, 0],
    zaino: ['mj/s_Backpack', 'h', .55, 0],
    tronco: ['mj/s_WoodLog', 'l', .9, 0],
    falo: ['mj/s_Bonfire_Fire', 'l', 1.1, 0],
    // Toon Shooter (Quaternius)
    cassa: ['mj/t_Crate', 'h', .6, 0],
    pallet: ['mj/t_Pallet', 'l', 1.2, 0],
    sacchi: ['mj/t_SackTrench_Small', 'l', 1.6, 0],
    scatole: ['mj/t_CardboardBoxes_1', 'l', .7, 0],
    gas: ['mj/t_GasTank', 'h', .6, 0],
    fusto: ['mj/t_ExplodingBarrel', 'h', .88, 0],
    gomme: ['mj/t_Debris_Tires', 'l', 1.1, 0],
    tubi: ['mj/t_Pipes', 'l', 1.2, 0],
    cestinoT: ['mj/t_TrashContainer', 'l', 1.4, 0],
    // Furniture Kit (Kenney)
    tv: ['mf/televisionVintage', 'x', .55, 0],
    radioK: ['mf/radio', 'x', .45, 0],
    scatola: ['mf/cardboardBoxClosed', 'l', .45, 0],
    cestino: ['mf/trashcan', 'h', .65, 0],
    monitor: ['mf/computerScreen', 'x', .42, 0],
  };
  const LIB = {}, WAIT = {};
  let ver = 0, base = 'assets/', loader = null;
  function fit(id, root) {
    const c = CAT[id]; root.updateMatrixWorld(true);
    const drop = []; root.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent && o.parent.remove(o));
    const inner = new THREE.Group(); inner.add(root); inner.rotation.y = c[3] || 0; inner.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(inner), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const L = c[1] === 'h' ? sz.y : c[1] === 'x' ? sz.x : c[1] === 'z' ? sz.z : Math.max(sz.x, sz.z), k = c[2] / (L || 1);
    const g = new THREE.Group(), mid = new THREE.Group(); mid.add(inner); mid.position.set(-ctr.x, -bb.min.y, -ctr.z); g.add(mid); g.scale.setScalar(k);
    root.traverse(o => {
      if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) { m.map.magFilter = THREE.NearestFilter; m.map.needsUpdate = true; } if (m.metalness > .5) m.metalness = .3; });
    });
    const out = new THREE.Group(); out.add(g); out.userData.size = new THREE.Vector3(sz.x * k, sz.y * k, sz.z * k);
    return out;
  }
  function load(id) {
    if (id in LIB) return Promise.resolve(LIB[id]);
    if (WAIT[id]) return WAIT[id];
    const c = CAT[id]; if (!c || typeof THREE === 'undefined' || !THREE.GLTFLoader) return Promise.resolve(null);
    loader = loader || new THREE.GLTFLoader();
    return (WAIT[id] = new Promise(res => loader.load(base + c[0] + '.json',
      gl => { try { LIB[id] = fit(id, gl.scene); } catch (e) { console.warn('Scaricati:', id, e); LIB[id] = null; } ver++; res(LIB[id]); },
      undefined, () => { console.warn('Scaricati: non carico', id); LIB[id] = null; res(null); })));
  }
  const preload = ids => Promise.all((ids || Object.keys(CAT)).map(load));
  // una copia pronta, o null se il file non c'è (ancora)
  function get(id) { const M = LIB[id]; if (!M) return null; const o = M.clone(true); o.userData.size = M.userData.size; o.userData.scaricato = id; return o; }
  // mette la copia nel gruppo g, nella posizione data; restituisce la copia o null
  function put(g, id, x, y, z, ry, s) { const o = get(id); if (!o) return null; o.position.set(x || 0, y || 0, z || 0); o.rotation.y = ry || 0; if (s) o.scale.setScalar(s); g.add(o); return o; }
  const has = id => !!LIB[id];
  // nel gioco si caricano da soli appena c'è il caricatore
  if (typeof window !== 'undefined' && !window.__pvStudio) setTimeout(function go() { if (typeof THREE === 'undefined' || !THREE.GLTFLoader) return setTimeout(go, 200); preload(); }, 0);
  return { CAT, preload, load, get, put, has, get ver() { return ver; }, setBase: b => { base = b; } };
})();
