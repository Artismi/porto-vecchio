# [luci 3] Acqua a terra, nebbiolina, vapore dai tombini, fumo dai camini (frammento aria2.js).
#  - riflessi delle luci sull'asfalto bagnato: più numerosi, più lunghi, più accesi (anche vetrine e finestre);
#  - nebbiolina bassa (due veli a 0,5 e 1,5 m) che prende il colore delle sorgenti vicine;
#  - vapore dai tombini più denso, col chiusino in ghisa sotto, tinto dalla luce vicina;
#  - camini sulle case con il fumo che sale e piega col vento;
#  - i neon dei tetti non più rosa/ciano (erano i puntini rosa rimasti).
# Dopo luci_regia2.py.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci3]' in s: print('già applicato'); sys.exit()
assert '[luci2]' in s, 'prima luci_regia2.py'
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aria2.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

rep("  function buildChunk(ci, cj) {", frag + "  function buildChunk(ci, cj) {")
rep("    tickAir(time, night);   // [luci2]", "    tickAir(time, night);   // [luci2]\n    tickAir2(time, night);   // [luci3]")

# riflessi: più strisce, più lunghe e accese
rep("    for (let i = 0; i < 48; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: reflTex()",
    "    for (let i = 0; i < 96; i++) { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: reflTex()")
rep("len = Math.min(9, h * 1.7 + 1)", "len = Math.min(13, h * 2.3 + 1.5)")
rep("m.material.opacity = night * (L.spill ? .22 : .42) * Math.min(1, L.base / 2);",
    "m.material.opacity = night * (L.spill ? .4 : .72) * Math.min(1, L.base / 2); /* [luci3] acqua che riflette */")

# vapore dei tombini: più sbuffi, più pieni, più alti
rep("vents.forEach(([x, y, z, k]) => { for (let q = 0; q < 3; q++) {", "vents.forEach(([x, y, z, k]) => { for (let q = 0; q < 5; q++) {")
rep("VX.steam.forEach(s => { const t = ((time * .35 + s.ph) % 3) / 3, sz = (.6 + t * 2.2) * s.k; s.sp.position.set(s.x + Math.sin(time + s.ph) * .3 * t, s.y + t * 3.2, s.z + t * .8); s.sp.scale.set(sz, sz, 1); s.sp.material.opacity = (1 - t) * t * 1.1 * (.35 + night * .25); });",
    "VX.steam.forEach(s => { const t = ((time * .3 + s.ph) % 3) / 3, sz = (.7 + t * 3.0) * s.k; s.sp.position.set(s.x + Math.sin(time + s.ph) * .4 * t + t * t * 1.2, s.y + t * 3.8, s.z + t * .8); s.sp.scale.set(sz, sz, 1); s.sp.material.opacity = (1 - t) * Math.min(1, t * 5) * (.42 + night * .3); });   // [luci3] vapore più denso")

# neon dei tetti
rep("    const neon = ['#ff3fa4', '#38e8ff', '#ffb050'].map(c => new THREE.MeshBasicMaterial({ color: c }));",
    "    const neon = ['#b84a3c', '#e8d8bc', '#ffb050'].map(c => new THREE.MeshBasicMaterial({ color: c }));   // [luci3] niente rosa/ciano")
rep("new THREE.MeshBasicMaterial({ color: r() < .5 ? '#ff3030' : '#38e8ff' })), x, 3.45, z)", "new THREE.MeshBasicMaterial({ color: '#ff3030' })), x, 3.45, z)")   # spie delle antenne: solo rosse
open(p, 'w', encoding='utf-8').write(s); print('ok')
