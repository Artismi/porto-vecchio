# [inverno 25] Davanti al volto del Garante non resta niente: dopo che tutto è costruito, ogni oggetto piccolo
# (condizionatori, manifesti, lampade, tubi, balconi) che finisce nel volume davanti a un murale viene tolto. Dopo inverno_render24.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno25]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("        m.position.set(PP.x + Math.sin(PP.yaw) * .14, PP.yc, PP.z + Math.cos(PP.yaw) * .14); m.rotation.y = PP.yaw; g.add(m); nR++;",
    "        m.position.set(PP.x + Math.sin(PP.yaw) * .14, PP.yc, PP.z + Math.cos(PP.yaw) * .14); m.rotation.y = PP.yaw; m.userData.mural = 1; g.add(m); nR++; MURALS.push(PP);")
rep("  function buildPropaganda() {   // [inverno24]", """  const MURALS = [];
  function clearMurals() {   // [inverno25] niente compenetrazioni davanti ai murali
    if (!MURALS.length) return;
    const boxes = MURALS.map(P => { const hw = P.pw / 2 + .15, y0 = P.yc - P.ph / 2 - .1, y1 = P.yc + P.ph / 2 + .1;
      return P.yaw ? new THREE.Box3(new THREE.Vector3(P.x - .35, y0, P.z - hw), new THREE.Vector3(P.x + 1.6, y1, P.z + hw)) : new THREE.Box3(new THREE.Vector3(P.x - hw, y0, P.z - .35), new THREE.Vector3(P.x + hw, y1, P.z + 1.6)); });
    const keep = new Set(); dyn.buildings.forEach(rec => rec.grp && rec.grp.traverse(o => keep.add(o)));
    const bb = new THREE.Box3(), c = new THREE.Vector3(), sz = new THREE.Vector3(), M4 = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0); let n = 0;
    scene.updateMatrixWorld(true);
    scene.traverse(o => {
      if (!o.isMesh || keep.has(o) || o.userData.mural || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const gb = o.geometry.boundingBox; if (!gb) return;
      if (o.isInstancedMesh) {
        let hit = false;
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M4); bb.copy(gb).applyMatrix4(M4).applyMatrix4(o.matrixWorld); bb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) > 4) continue; bb.getCenter(c); if (boxes.some(B => B.containsPoint(c))) { o.setMatrixAt(i, Z); hit = true; n++; } }
        if (hit) o.instanceMatrix.needsUpdate = true;
      } else {
        bb.copy(gb).applyMatrix4(o.matrixWorld); bb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) > 4) return; bb.getCenter(c);
        if (boxes.some(B => B.containsPoint(c))) { o.visible = false; n++; }
      }
    });
    window.__muralClear = n;
  }
  function buildPropaganda() {   // [inverno24]""")
rep("TT('soglie', buildThresholds);", "TT('soglie', buildThresholds); TT('pulizia', clearMurals);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
