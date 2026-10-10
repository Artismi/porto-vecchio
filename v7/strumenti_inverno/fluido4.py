# [fluido4] Le case fuse dal pulitore: nel campo visivo 265 mesh, e 134 di queste sono materiali a tinta unita (nessuna texture)
# separati solo dal colore. Ora per questi il colore va nei vertici (attributo color) e il materiale comune è bianco con
# vertexColors: la scheda video moltiplica il colore del materiale per quello dei vertici, quindi l'aspetto è lo stesso.
# Esclusi: materiali con texture (le facciate dipinte: graffiti, writer e Studio ci dipingono sopra), che si illuminano
# (emissive), con l'intonaco speciale (plaster) o animati (mondo), o che hanno già colori nei vertici.
# Dopo fluido3.py. Guardia [fluido4].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[fluido4]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# chi può portare il colore nei vertici, e il materiale bianco comune
rep("  function fusione1() {",
"""  // [fluido4] tinta unita: il colore va nei vertici, il materiale bianco si condivide
  const VC1 = new Map();
  function vcOk1(m) { return (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial) && !m.map && !m.emissiveMap && !m.alphaMap && !m.lightMap && !m.aoMap && !m.vertexColors
    && !(m.emissive && m.emissive.getHex() !== 0) && !m.userData.plaster && !m.userData.mondo && !!m.color; }
  function vcMat1(m, sigK) { let t = VC1.get(sigK); if (t) return t; t = m.clone(); t.color.setRGB(1, 1, 1); t.vertexColors = true; VC1.set(sigK, t); return t; }
  function fusione1() {""")
# nel giro delle case: la firma senza il colore, il colore nei vertici
rep("""        const sig = matSig1(m); if (!sig) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);""",
"""        const sig0 = matSig1(m); if (!sig0) return;
        const vc = vcOk1(m), sig = vc ? sig0.replace(/\\|color:[0-9a-f]{6}/, '|color:*') + '|vc' : sig0;   // [fluido4]
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);""")
rep("""        let b = B.get(key); if (!b) B.set(key, b = { m, geos: [], cast: o.castShadow, rec: o.receiveShadow });""",
"""        let b = B.get(key); if (!b) B.set(key, b = { m, geos: [], cast: o.castShadow, rec: o.receiveShadow, vc, sigK: sig });   // [fluido4]
        if (vc) { const nv = g.attributes.position.count, ca = new Float32Array(nv * 3), cr = m.color.r, cg = m.color.g, cb = m.color.b; for (let q = 0; q < nv; q++) { ca[q * 3] = cr; ca[q * 3 + 1] = cg; ca[q * 3 + 2] = cb; } g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); }""")
# la fusione: anche il colore
rep("""      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), id = new Float32Array(n); let k = 0;
      b.geos.forEach(g => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, k * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); id.set(g.attributes.bId1.array, k); k += c; g.dispose(); });""",
"""      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), id = new Float32Array(n), col = b.vc ? new Float32Array(n * 3) : null; let k = 0;   // [fluido4] col
      b.geos.forEach(g => { const c = g.attributes.position.count; pos.set(g.attributes.position.array, k * 3); if (g.attributes.normal) nor.set(g.attributes.normal.array, k * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2); id.set(g.attributes.bId1.array, k); if (col) col.set(g.attributes.color.array, k * 3); k += c; g.dispose(); });""")
rep("""      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, fadeMat1(b.m)); mesh.castShadow = false;""",
"""      if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));   // [fluido4]
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, fadeMat1(b.vc ? vcMat1(b.m, b.sigK) : b.m)); mesh.castShadow = false;""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
