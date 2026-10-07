# [pulitore1] Il lag. Andrea: «oggetti che laggano». Misurato con SwiftShader: 8.000-11.500 chiamate di disegno per fotogramma,
# 15.000 mesh in scena e 10.300 materiali, di cui solo 1.570 davvero diversi. Le ombre del sole ridisegnano tutto un'altra volta
# (11.575 chiamate con le ombre, 3.333 senza).
# Il motivo: ogni casa ha i suoi materiali clonati (ownMats), per poterla rendere trasparente quando copre il personaggio;
# così niente si fonde fra una casa e l'altra, e ogni casa fa da 5 a 30 chiamate, ombre comprese.
# Ora, finita la costruzione, le parti delle case si fondono per materiale uguale (firma del materiale) e per settore di 80 m,
# in settori di 32 m; ogni vertice ricorda la sua casa (bId1). Quando una casa copre il personaggio sparisce dalla mesh fusa
# (una piccola texture dice quali case nascondere) e tornano visibili i suoi pezzi originali, con la trasparenza di sempre:
# l'aspetto non cambia.
# Restano come prima: le facciate con la texture propria (si crepano e si bucano), i vetri trasparenti, le insegne che
# lampeggiano e ogni oggetto che il codice muove o accende da solo (cercati in dyn, DZ, WX, AIR2, VX, MONDO, FX, S1).
# Anche la geometria statica (addStatic) si fonde per firma del materiale invece che per materiale identico.
# window.__fusione1 dice quante mesh c'erano e quante ne restano. Dopo unione10.py. Guardia [pulitore1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[pulitore1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# 1) ownMats ricorda quale gruppo appartiene a quale casa
rep("  function ownMats(merged, rec) {\n",
    "  function ownMats(merged, rec) {\n    merged.userData.fgRec1 = rec;   /* [pulitore1] */\n")

# 2) flushStatic: i secchi con materiali uguali (stessa firma, creati due volte) e nello stesso settore diventano uno
#    (i pezzi taggati per la distruzione seguono il loro secchio nuovo)
rep("  function flushStatic() {\n    STATIC.forEach(b => {",
    "  function flushStatic() {\n    coalesce1();   /* [pulitore1] */\n    STATIC.forEach(b => {")

# 3) la fusione, il retino per casa, la firma dei materiali
rep("  function flushStatic() {", r"""  // ================= [pulitore1] FUSIONE: le case per materiale uguale, la trasparenza a retino =================
  const FD1 = { tex: null, data: null, W: 1, u: { value: null }, idx: new Map(), emis: [], canon: new Map(), dirty: true, sigs: new Map() };
  const MSKIP1 = new Set(['uuid', 'name', 'id', 'version', 'userData', 'onBeforeCompile', 'customProgramCacheKey', 'onBuild', 'onBeforeRender', '_listeners', 'type']);
  function matSig1(m) {   // la firma: tutto quello che cambia l'aspetto, non l'identità
    if (FD1.sigs.has(m)) return FD1.sigs.get(m);
    let out = null;
    const custom = m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile;
    if (!custom || m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) {
      const a = [m.type, custom ? 'K' + m.customProgramCacheKey() : ''];
      for (const k of Object.keys(m).sort()) { if (MSKIP1.has(k)) continue; const v = m[k];
        if (v === null || v === undefined) a.push(k + ':-');
        else if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') a.push(k + ':' + v);
        else if (v.isColor) a.push(k + ':' + v.getHexString());
        else if (v.isTexture) a.push(k + ':' + v.uuid);
        else if (v.isVector2 || v.isVector3) a.push(k + ':' + v.toArray().join(','));
        else if (typeof v === 'function') a.push(k + ':f' + String(v).length);
        else { try { a.push(k + ':' + JSON.stringify(v)); } catch (e) { a.push(k + ':' + m.uuid); } } }
      a.push('U' + JSON.stringify(m.userData || {}));
      out = a.join('|');
    }
    FD1.sigs.set(m, out); return out;
  }
  function coalesce1() {
    const live = liveSet1(), into = new Map(), moved = new Map();
    STATIC.forEach((b, key) => {
      const sig = live.mats.has(b.mat) ? null : matSig1(b.mat); if (!sig) return;
      const k2 = sig + key.slice(key.indexOf('|'));
      const t = into.get(k2); if (!t) { into.set(k2, b); return; }
      moved.set(b, { t, base: t.geos.length }); t.geos.push(...b.geos); STATIC.delete(key); });
    if (!moved.size) return;
    TAGS.forEach(t => t.parts.forEach(p => { const mv = moved.get(p.b); if (mv) { p.b = mv.t; p.gi += mv.base; } }));
    if (window.__dbg35) console.log('[dbg] coalesce1: secchi uniti', moved.size, 'restano', STATIC.size);
  }
  function liveSet1() {   // tutto quello che il codice tiene in mano per muoverlo, accenderlo o cambiarlo
    const objs = new Set(), mats = new Set(), seen = new Set();
    const walk = (v, d) => {
      if (!v || typeof v !== 'object' || seen.has(v) || d > 7) return; seen.add(v);
      if (v.isObject3D) { if (!v.userData.fgRec1) objs.add(v); return; }
      if (v.isMaterial) { mats.add(v); return; }
      if (v.isTexture || v.isBufferGeometry || v.isBufferAttribute || ArrayBuffer.isView(v) || v.isColor || v.isVector3 || v.isMatrix4 || typeof v.nodeType === 'number' || (typeof CanvasRenderingContext2D !== 'undefined' && v instanceof CanvasRenderingContext2D) || (typeof ImageData !== 'undefined' && v instanceof ImageData)) return;
      if (v instanceof Map) { v.forEach(x => walk(x, d + 1)); return; }
      if (v instanceof Set) { v.forEach(x => walk(x, d + 1)); return; }
      if (Array.isArray(v)) { for (const x of v) walk(x, d + 1); return; }
      for (const k in v) { if (k === 'mats' && v.b !== undefined) continue; walk(v[k], d + 1); } };
    [dyn, DZ.faces, DZ.bodies, DZ.rubble, WX, AIR, AIR2, VX, MONDO, FX, S1, REFL, SPILLS, MV, INDOOR, UGR, LSRC, MURALS, ISO, VEG, NAT, GR1].forEach(c => walk(c, 0));
    return { objs, mats };
  }
  function fadeMat1(m) {   // il materiale comune di un gruppo di case: lo stesso di prima, col retino per casa
    const key = matSig1(m); let c = FD1.canon.get(key); if (c) return c;
    c = m.clone(); if (m.userData.plaster) plasterize(c); else if (m.userData.mondo) animMat(c, m.userData.mondo);
    const prev = c.onBeforeCompile, pk = c.customProgramCacheKey;
    c.customProgramCacheKey = () => pk.call(c) + '|fd1';
    c.onBeforeCompile = function (sh, r) { prev.call(c, sh, r); sh.uniforms.uFd1 = FD1.u;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\nattribute float bId1; uniform sampler2D uFd1; varying float vFd1;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvFd1 = texture2D(uFd1, vec2((bId1 + .5) / ${FD1.W}., .5)).r;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying float vFd1;`)
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\nif (vFd1 > .5) discard;`); };
    c.transparent = false; c.opacity = 1; c.depthWrite = true; c.needsUpdate = true;
    if (c.emissiveMap) FD1.emis.push(c);
    FD1.canon.set(key, c); return c;
  }
  function fusione1() {
    const before = (() => { let n = 0; scene.traverse(o => { if (o.isMesh) n++; }); return n; })();
    const live = liveSet1(), isLive = o => { for (let q = o; q && q !== scene; q = q.parent) if (live.objs.has(q)) return true; return false; };
    dyn.buildings.forEach((rec, i) => FD1.idx.set(rec, i));
    FD1.W = 1; while (FD1.W < dyn.buildings.length + 1) FD1.W *= 2;
    FD1.data = new Uint8Array(FD1.W * 4); FD1.tex = new THREE.DataTexture(FD1.data, FD1.W, 1, THREE.RGBAFormat); FD1.tex.needsUpdate = true; FD1.u.value = FD1.tex;
    const B = new Map(), SH = new Map(), moved = [];
    const okGeo = g => { if (!g || !g.attributes.position) return false; for (const k in g.attributes) if (k !== 'position' && k !== 'normal' && k !== 'uv') return false; return !g.morphAttributes || !Object.keys(g.morphAttributes).length; };
    scene.children.slice().forEach(top => {
      const rec = top.userData.fgRec1; if (!rec || !FD1.idx.has(rec) || isLive(top)) return;
      const bi = FD1.idx.get(rec); top.updateMatrixWorld(true);
      top.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.visible || o.renderOrder || o.customDepthMaterial || o.userData.keep) return;
        const m = o.material; if (m.transparent || m.userData.keepTr || live.mats.has(m) || !okGeo(o.geometry) || isLive(o)) return;
        const sig = matSig1(m); if (!sig) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
        g.computeBoundingBox(); g.boundingBox.getCenter(_wp);   // il settore dal centro vero (i gruppi delle case stanno tutti in 0,0)
        const key = sig + '|' + Math.floor(_wp.x / 32) + ',' + Math.floor(_wp.z / 32) + '|' + o.castShadow + o.receiveShadow;
        let b = B.get(key); if (!b) B.set(key, b = { m, geos: [], cast: o.castShadow, rec: o.receiveShadow });
        const id = new Float32Array(g.attributes.position.count).fill(bi); g.setAttribute('bId1', new THREE.BufferAttribute(id, 1));
        b.geos.push(g); moved.push(o); (rec.mv1 || (rec.mv1 = [])).push(o);
      });
    });
    moved.forEach(o => { o.visible = false; });   // restano pronti per la trasparenza
    B.forEach(b => {
      let n = 0; b.geos.forEach(g => n += g.attributes.position.count);
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), id = new Float32Array(n); let k = 0;
      b.geos.forEach(g => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, k * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); id.set(g.attributes.bId1.array, k); k += c; g.dispose(); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('bId1', new THREE.BufferAttribute(id, 1));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, fadeMat1(b.m)); mesh.castShadow = false; mesh.receiveShadow = b.rec; mesh.userData.fusione1 = true; scene.add(mesh);
      if (b.cast) { const sk = Math.floor(geo.boundingBox.min.x / 48) + ',' + Math.floor(geo.boundingBox.min.z / 48) + '|' + b.m.side + '|' + b.m.shadowSide; let q = SH.get(sk); if (!q) SH.set(sk, q = { side: b.m.side, ss: b.m.shadowSide, pos: [] }); q.pos.push(pos); } });
    // l'ombra delle case: la texture non conta, quindi tutte le parti di un settore di 48 m fanno ombra con una mesh sola,
    // su un livello (layer 1) che vedono solo le camere delle ombre
    SH.forEach(q => { let n = 0; q.pos.forEach(a => n += a.length); const all = new Float32Array(n); let k = 0; q.pos.forEach(a => { all.set(a, k); k += a.length; });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(all, 3)); geo.computeBoundingSphere();
      const sm1 = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: q.side, shadowSide: q.ss, colorWrite: false })); sm1.castShadow = true; sm1.receiveShadow = false; sm1.layers.set(1); sm1.userData.ombra1 = true; scene.add(sm1); });
    moon.shadow.camera.layers.enable(1); SPOOL.forEach(l => l.shadow.camera.layers.enable(1));
    let after = 0; scene.traverse(o => { if (o.isMesh && o.visible) after++; });
    window.__fusione1 = { prima: before, dopo: after, secchi: B.size, spostate: moved.length, materiali: FD1.canon.size, ombre: SH.size };
    if (window.__dbg35) console.log('[dbg] fusione1', JSON.stringify(window.__fusione1));
  }
  function fadeTick1(rec) {   // la casa che si dissolve esce dalla mesh fusa e torna coi suoi pezzi trasparenti
    if (!rec.mv1 || !FD1.data) return; const i = FD1.idx.get(rec), on = rec.fade > .004;
    if (rec.out1 === on) return; rec.out1 = on; rec.mv1.forEach(o => { o.visible = on; });
    FD1.data[i * 4] = on ? 255 : 0; FD1.dirty = true; }
  function flushStatic() {""")

rep("    TT('flush', flushStatic);\n", "    TT('flush', flushStatic);\n    TT('fusione1', fusione1);   /* [pulitore1] */\n")

# 4) la dissolvenza scrive nella texture
rep("      const target = hit ? 1 : 0; B.fade += (target - B.fade) * Math.min(1, dt * 8);\n",
    "      const target = hit ? 1 : 0; B.fade += (target - B.fade) * Math.min(1, dt * 8); fadeTick1(B);   /* [pulitore1] */\n")
rep("    if (dyn.ghosts) dyn.ghosts.forEach(g => g.visible = covered && !pveh);\n",
    "    if (dyn.ghosts) dyn.ghosts.forEach(g => g.visible = covered && !pveh);\n    if (FD1.dirty && FD1.tex) { FD1.tex.needsUpdate = true; FD1.dirty = false; }   /* [pulitore1] */\n")
rep("    dyn.buildings.forEach(b => b.mats.forEach(m => { if (m.emissiveMap) m.emissiveIntensity = .04 + night * .85; }));\n",
    "    dyn.buildings.forEach(b => b.mats.forEach(m => { if (m.emissiveMap) m.emissiveIntensity = .04 + night * .85; }));\n    FD1.emis.forEach(m => { m.emissiveIntensity = .04 + night * .85; });   /* [pulitore1] */\n")
open(p, 'w', encoding='utf-8').write(s); print('ok')
