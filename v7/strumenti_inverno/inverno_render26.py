# [inverno 26] La luce non passa più attraverso le cose. Dopo inverno_render25.
# Le luci di lampioni e insegne non avevano ombre: illuminavano anche dietro i muri e sotto gli oggetti.
# Ora le 2 luci più vicine alla camera proiettano ombre vere (mappa piccola, 256 px: costa poco); gli aloni dipinti a terra,
# che ignoravano muri e oggetti, quasi spariti: la pozza di luce la fa la luce vera, con le sue ombre.
# In modalità leggera (lowQuality) le ombre si spengono come prima.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno26]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("    for (let i = 0; i < 14; i++) { const l = new THREE.PointLight('#ffb35c', 0, 10, 2); scene.add(l); LPOOL.push(l); }",
    """    for (let i = 0; i < 14; i++) { const l = new THREE.PointLight('#ffb35c', 0, 10, 2);
      if (i < 2) { l.castShadow = true; l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; l.shadow.mapSize.set(256, 256); l.shadow.bias = -.002; l.shadow.normalBias = .06; l.shadow.camera.near = .25; l.shadow.camera.far = 12; }   // [inverno26] le 2 più vicine fanno ombra (aggiornata a turno, non ogni fotogramma)
      scene.add(l); LPOOL.push(l); }""")
rep("l.position.set(L.x, L.y, L.z); l.color.copy(L.color); l.distance = L.dist; l.intensity = L.base * k * fadeD * .8;",
    "l.position.set(L.x, L.y, L.z); l.color.copy(L.color); l.distance = L.dist; l.intensity = L.base * k * fadeD * .8;\n      if (l.castShadow) { if (Math.abs(l.shadow.camera.far - L.dist) > .5) { l.shadow.camera.far = Math.max(4, L.dist); l.shadow.camera.updateProjectionMatrix(); }
        if (l.userData.src !== L) { l.userData.src = L; l.shadow.needsUpdate = true; } else if (frameN % 6 === i * 3) l.shadow.needsUpdate = true; }")
rep("(d.always ? .02 + night * .12 : night * .08)", "(d.always ? night * .045 : night * .02)")
rep("function lowQuality() { if (TARGET < 420) return; TARGET = 330; LOWQ.on = true; moon.castShadow = false;",
    "function lowQuality() { if (TARGET < 420) return; TARGET = 330; LOWQ.on = true; moon.castShadow = false; LPOOL.forEach(l => l.castShadow = false);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
