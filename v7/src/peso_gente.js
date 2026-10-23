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
  const ON = !/[?&]nopesogente\b/.test(Q);
  const P = { attesa: 20, perFotogramma: 2, ms: 3, riprova: 120 };
  const ST = { fuse: 0, sciolte: 0, pezzi: 0, disegni: 0, ms: 0, scartate: 0 };
  let T3 = null, attivo = true, frame = 0;
  const CANON = new Map(), LIVE = new Set();
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
  function firma(m) {
    if (FIRME.has(m)) return FIRME.get(m);
    let out = null;
    if (m && OKT[m.type] && !m.transparent && !m.vertexColors && m.visible !== false && m.onBeforeCompile === T3.Material.prototype.onBeforeCompile && m.customProgramCacheKey === T3.Material.prototype.customProgramCacheKey) {
      const a = [m.type];
      for (const k of Object.keys(m).sort()) { if (SKIP.has(k)) continue; const v = m[k];
        if (v === null || v === undefined) a.push(k + ':-'); else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') a.push(k + ':' + v);
        else if (v.isColor) a.push(k + ':' + v.getHexString()); else if (v.isTexture) a.push(k + ':' + v.uuid); else if (v.isVector2 || v.isVector3) a.push(k + ':' + v.toArray().join(','));
        else if (typeof v === 'function') { out = null; FIRME.set(m, null); return null; } else { try { a.push(k + ':' + JSON.stringify(v)); } catch (e) { FIRME.set(m, null); return null; } } }
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
    c.customProgramCacheKey = () => 'pesoGente1|' + k;
    CANON.set(k, c); return c;
  }
  // la persona: i pezzi accesi e fondibili, lo scheletro di riferimento
  function fondi(g) {
    const t0 = performance.now(); g.updateMatrixWorld(true);
    let ref = null; g.traverseVisible(o => { if (!ref && o.isSkinnedMesh && o.skeleton && o.bindMode === 'attached' && !o.userData.pesoGente) ref = o; });
    if (!ref) return false;
    const bones = ref.skeleton.bones, bi = new Map(); bones.forEach((b, i) => bi.set(b, i));
    const sameSk = o => { const s = o.skeleton; if (!s || s.bones.length !== bones.length || o.bindMode !== 'attached') return false; for (let i = 0; i < bones.length; i++) if (s.bones[i] !== bones[i]) return false;
      for (let i = 0; i < 16; i++) if (Math.abs(o.bindMatrix.elements[i] - ref.bindMatrix.elements[i]) > 1e-9) return false;
      for (let i = 0; i < s.boneInverses.length; i++) { const a = s.boneInverses[i].elements, b = ref.skeleton.boneInverses[i].elements; for (let k = 0; k < 16; k++) if (Math.abs(a[k] - b[k]) > 1e-9) return false; } return true; };
    // solo valori semplici: oggetti 3D, liste, oggetti letterali (non il mixer, non le azioni: puntano alla radice del modello)
    const live = new Set(); const walkU = (v, d) => { if (!v || typeof v !== 'object' || d > 3) return; if (v.isObject3D) { if (v !== g) live.add(v); return; } if (Array.isArray(v)) { v.forEach(x => walkU(x, d + 1)); return; }
      const pr = Object.getPrototypeOf(v); if (pr !== Object.prototype && pr !== null) return; for (const k in v) walkU(v[k], d + 1); };
    for (const k in g.userData) if (k !== 'body') walkU(g.userData[k], 0);   // quello che il gioco tiene in mano (oggetti, armi, cappelli da cambiare, l'ombra a macchia)
    const isLive = o => { for (let q = o; q && q !== g; q = q.parent) if (live.has(q)) return true; return false; };
    const groups = new Map(), sources = [];
    const binv = new T3.Matrix4().copy(ref.bindMatrix).invert(), M = new T3.Matrix4(), N3 = new T3.Matrix3(), v = new T3.Vector3();
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
    // conviene solo se si risparmia qualcosa
    let before = 0; groups.forEach(e => before += e.list.length); if (before - groups.size < 2) return false;
    const made = [];
    groups.forEach(e => {
      let n = 0; const its = e.list.map(it => { const geo = it.o.geometry, gi = geo.index; const cnt = gi ? gi.count : geo.attributes.position.count, st = Math.max(0, it.p.start), c = Math.min(cnt - st, it.p.count); n += Math.max(0, c); return [it, st, Math.max(0, c)]; });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), pc = new Float32Array(n * 3), pe = new Float32Array(n * 3), pr = new Float32Array(n * 2);
      let w = 0;
      its.forEach(([it, st, c]) => { const geo = it.o.geometry, A = geo.attributes, ix = geo.index ? geo.index.array : null, m = it.m, mt = it.mat; if (mt) N3.getNormalMatrix(mt);
        const col = m.color, em = m.emissive || col, ei = 1, ro = m.roughness !== undefined ? m.roughness : 1, me = m.metalness !== undefined ? m.metalness : 0;
        for (let q = 0; q < c; q++, w++) { const s = ix ? ix[st + q] : st + q;
          v.fromBufferAttribute(A.position, s); if (mt) v.applyMatrix4(mt); pos[w * 3] = v.x; pos[w * 3 + 1] = v.y; pos[w * 3 + 2] = v.z;
          if (A.normal) { v.fromBufferAttribute(A.normal, s); if (mt) v.applyMatrix3(N3).normalize(); nor[w * 3] = v.x; nor[w * 3 + 1] = v.y; nor[w * 3 + 2] = v.z; }
          if (A.uv) { uv[w * 2] = A.uv.getX(s); uv[w * 2 + 1] = A.uv.getY(s); }
          if (mt) { si[w * 4] = it.bone; sw[w * 4] = 1; } else { for (let k = 0; k < 4; k++) { si[w * 4 + k] = A.skinIndex.getComponent(s, k); sw[w * 4 + k] = A.skinWeight.getComponent(s, k); } }
          pc[w * 3] = col.r; pc[w * 3 + 1] = col.g; pc[w * 3 + 2] = col.b; pe[w * 3] = em === col ? 0 : em.r * ei; pe[w * 3 + 1] = em === col ? 0 : em.g * ei; pe[w * 3 + 2] = em === col ? 0 : em.b * ei; pr[w * 2] = ro; pr[w * 2 + 1] = me; } });
      const geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T3.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T3.BufferAttribute(uv, 2));
      geo.setAttribute('skinIndex', new T3.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T3.BufferAttribute(sw, 4));
      geo.setAttribute('pc1', new T3.BufferAttribute(pc, 3)); geo.setAttribute('pe1', new T3.BufferAttribute(pe, 3)); geo.setAttribute('pr1', new T3.BufferAttribute(pr, 2));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const sm = new T3.SkinnedMesh(geo, canon(e.m, e.k)); sm.name = 'pesoGente'; sm.userData.pesoGente = true; sm.userData.thin2 = 1;
      sm.castShadow = e.cast; sm.receiveShadow = e.rec; sm.frustumCulled = e.fc; if (e.icR) sm.__icR = e.icR;
      sm.position.copy(ref.position); sm.quaternion.copy(ref.quaternion); sm.scale.copy(ref.scale); ref.parent.add(sm); sm.bind(ref.skeleton, ref.bindMatrix);
      made.push(sm); });
    // gli originali: nascosti alla camera (e alle ombre, che in three r149 guardano i livelli della camera di gioco), la visibilità sorvegliata
    const watch = new Set(); sources.forEach(o => { for (let q = o; q && q !== g; q = q.parent) watch.add(q); });
    const rec = { made, sources: sources.map(o => [o, o.layers.mask]), watch: [], g };
    watch.forEach(o => { let val = o.visible; Object.defineProperty(o, 'visible', { configurable: true, enumerable: true, get() { return val; }, set(x) { if (x !== val) { val = x; rec.rotta = true; } } }); rec.watch.push(o); });
    sources.forEach(o => { o.layers.mask = 0; });
    g.__pg = rec; LIVE.add(g); ST.fuse++; ST.pezzi += sources.length; ST.disegni += made.length; ST.ms += performance.now() - t0;
    return true;
  }
  function sciogli(g) {
    const rec = g.__pg; if (!rec) return; g.__pg = null; LIVE.delete(g);
    rec.watch.forEach(o => { const val = o.visible; delete o.visible; o.visible = val; });
    rec.sources.forEach(([o, m]) => { o.layers.mask = m; });
    rec.made.forEach(sm => { if (sm.parent) sm.parent.remove(sm); sm.geometry.dispose(); });
    g.__pgT = frame; ST.sciolte++;
  }
  // a ogni fotogramma, prima del disegno: chi è tornato com'era (qualcosa cambiato), chi è pronto per fondersi (a budget)
  function passo(people) {
    if (!ON) return; if (!T3) T3 = window.THREE; frame++;
    LIVE.forEach(g => { if (g.__pg && (g.__pg.rotta || !attivo)) sciogli(g); });
    if (!attivo) return;
    const t0 = performance.now(); let n = 0;
    for (const id in people) {
      if (id === '__player') continue; const g = people[id]; if (!g || g.__pg || !g.parent || !g.visible) continue;
      const u = g.userData; if (!u || !u.model || u.dressing || u.voxelWait) { g.__pgS = frame; continue; }
      if (g.__pgS === undefined) g.__pgS = frame; if (frame - g.__pgS < P.attesa) continue;   // vestito e fermo da un po'
      if (g.__pgT !== undefined && frame - g.__pgT < P.riprova) continue;
      if (g.__pgNo === frame) continue;
      try { if (!fondi(g)) { g.__pgT = frame; ST.scartate++; } } catch (e) { console.warn('[peso] gente', e); g.__pgT = frame; }
      if (++n >= P.perFotogramma || performance.now() - t0 > P.ms) break;
    }
  }
  function conto() { return Object.assign({ on: ON, attive: LIVE.size, materiali: CANON.size }, ST); }
  return { ON, P, passo, conto, sciogli, get attivo() { return attivo; }, set attivo(v) { attivo = !!v; if (!attivo) [...LIVE].forEach(sciogli); } };
})();
if (typeof window !== 'undefined') { window.PesoGente = PesoGente; (window.__pesoAB = window.__pesoAB || {}).gente = v => { PesoGente.attivo = v; }; }
