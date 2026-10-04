# [inverno 30] La città col coprifuoco: luce cotta con le ombre degli edifici, lampioni razionati, vetrine che escono fuori,
# riflessi sull'asfalto bagnato, nebbia che non brucia le luci. Frammento: luce_cotta.js. Dopo inverno_render29.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno30]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'luce_cotta.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("  function buildChunk(ci, cj) {", frag + "  function buildChunk(ci, cj) {")
# terreno: la luce cotta come emissiva, accesa di notte
rep("    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .55 });",
    "    const btex = bakeLight(tx0, ty0, n, m);   // [inverno30]\n    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .55, emissive: '#ffffff', emissiveMap: btex, emissiveIntensity: 0 });")
rep("    return { grp, geo, mat, tex, veg, nat, lt, rev: ISO.rev };", "    return { grp, geo, mat, tex, btex, veg, nat, lt, rev: ISO.rev };")
rep("scene.remove(ch.grp); ch.geo.dispose(); ch.mat.dispose(); ch.tex.dispose();", "scene.remove(ch.grp); ch.geo.dispose(); ch.mat.dispose(); ch.tex.dispose(); if (ch.btex) ch.btex.dispose();")
# coprifuoco: un lampione su tre spento, qualcuno sfarfalla (deciso dalla posizione)
rep("    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g); curTag = null;",
    """    const hq = th(Math.round(x), Math.round(z), 71), lampOff = kind !== 'deco' && hq < .33;   // [inverno30] coprifuoco: elettricità razionata
    if (lampOff) g.traverse(o => { if (o.isMesh && o.material === sb(lcol)) o.material = sm('#2e2e34'); });
    g.position.set(x, y0, z); g.rotation.y = rot || 0; const tag = kind === 'wall' ? null : newTag(); curTag = tag; addStatic(g); curTag = null;""")
rep("    const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 2.4 : 2.0);\n    const L = addLight(wx, y0 + ly - .3, wz, kind === 'deco' ? col : '#ffb35c', kind === 'sodium' ? 2.0 : 1.6, kind === 'sodium' ? 10 : 7.5, .03);",
    "    const gl = glow(wx, y0 + ly, wz, col, kind === 'deco' ? 2.4 : 2.0);\n    const L = addLight(wx, y0 + ly - .3, wz, kind === 'deco' ? col : '#ffb35c', kind === 'sodium' ? 2.0 : 1.6, kind === 'sodium' ? 10 : 7.5, !lampOff && hq < .48 ? .75 : .03);\n    if (lampOff) { L.off = true; L.base = 0; gl.visible = false; }")
# vetrine e finestre del piano terra: luce che esce sul marciapiede
rep("        if (name.includes('doorway')) litPanel(pc, name, shop || b.warehouse ? litShop : dark);",
    """        if (name.includes('doorway')) litPanel(pc, name, shop || b.warehouse ? litShop : dark);
        { const N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] }[sd.f], q = span === 2 ? sd.at(k + .5) : sd.at(k);   // [inverno30] luce che esce
          if (name.includes('doorway') && shop) addSpill(q[0] + N[0] * .7, q[1] + N[1] * .7, N[0], N[1], '#ffc070', 2.2, 7);
          else if (isWin && gm) addSpill(q[0] + N[0] * .6, q[1] + N[1] * .6, N[0], N[1], gm === litShop ? '#ffc880' : '#ffb060', 1.1, 5); }""")
# di notte la luce cotta si accende; i faretti in tempo reale restano per i volumi e le ombre di chi si muove
rep("    updateLights(time, night, cam.x, cam.y);", """    updateLights(time, night, cam.x, cam.y);
    ISO.chunks.forEach(ch => { if (ch.mat) ch.mat.emissiveIntensity = night * .95; });   // [inverno30]
    if (frameN % 2 === 0 || !dyn.reflList) { dyn.reflList = (dyn.lsp || []).concat(dyn.lpp || []).concat(SPILLS.filter(S => { const a = S.x - cam.x, b = S.z - cam.y; return a * a + b * b < 38 * 38; })); }
    updateRefl(night, dyn.reflList);""")
rep("      l.intensity = L.base * k * .9 / Math.sqrt(1 + L.nb * .6);", "      l.intensity = L.base * k * .55 / Math.sqrt(1 + L.nb * .6);   // [inverno30] la pozza a terra la fa la luce cotta")
# la nebbia non brucia le luci: aloni, lampadine e insegne fuori dalla nebbia
rep("const sb = c => MC['B' + c] || (MC['B' + c] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));",
    "const sb = c => MC['B' + c] || (MC['B' + c] = new THREE.MeshBasicMaterial({ color: c, toneMapped: false, fog: false }));   // [inverno30] la nebbia non brucia le luci")
rep("    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8 }));",
    "    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .8, fog: false }));")
open(p, 'w', encoding='utf-8').write(s); print('ok')
