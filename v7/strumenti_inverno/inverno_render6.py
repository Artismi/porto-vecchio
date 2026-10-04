#!/usr/bin/env python3
"""inverno_render6: vegetazione nuova (abeti a piani, chiome grumose, ciuffi d'erba, tronchi, rocce con neve, vento). Uso: python3 inverno_render6.py v7/src/render.js"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read(); here = __file__.rsplit('/', 1)[0]
def rep(a, b):
    global s
    assert a in s, 'manca: ' + a[:80]
    s = s.replace(a, b, 1)
kit = open(here + '/vegetazione_kit.js', encoding='utf-8').read()
rep("  function vegKit() {", kit + "  function vegKit() {")
rep("    VEG.cactusM = new THREE.MeshLambertMaterial({ color: '#5a8a4a', flatShading: true });\n", "    VEG.cactusM = new THREE.MeshLambertMaterial({ color: '#5a8a4a', flatShading: true });\n    vegInit(VEG);\n")
rep("L = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [] };", "L = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] };")
# alberi nuovi
a = s.index("    // [inverno] abeti e pini con la neve sui palchi, betulle spoglie, arbusti sepolti\n")
b = s.index("    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {\n      const tx = tx0 + i, ty = ty0 + j, v = gT(tx, ty), z = zoneT(tx, ty), r = rng(")
tree = '''    // [inverno] alberi: abeti a piani con la neve sui rami, pini con la chioma in cima, betulle e tigli spogli coi rami, secchi
    const SNOW = '#e6eaf0', SNOW2 = '#d6dce6';
    const FIRS = ['#27422f', '#2d4d3c', '#22392c', '#34503a', '#2a4a44'], PINES = ['#2e4636', '#35503c', '#2a4030'], BARK = ['#4a3c32', '#52443a', '#3e342e', '#5a4a3c'];
    const branch = (x, y, z, len, th, a, tilt) => put(L.trunk, x, y, z, th, len, th, a, null, tilt);
    const tree = (x, z, kind, r) => {
      const y = groundH(x, z) - .1, s = .75 + r() * .6;
      if (kind === 'abete') { const h = (4.6 + r() * 2.2) * s, w = (1.15 + r() * .35) * s; put(L.trunk, x, y, z, 1.2, h * .3, 1.2, r() * 6, null); put(L.fir, x, y + .2, z, w, h, w, r() * 6, pick(r, FIRS)); }
      else if (kind === 'pino') { const h = (4.2 + r() * 1.6) * s; put(L.trunk, x, y, z, .95, h, .95, r() * 6, null, (r() - .5) * .12);
        for (let k = 0; k < 3; k++) { const a = r() * 6.3, d = k ? .7 * s : 0, cw = (1.35 - k * .22) * s; put(L.leaf, x + Math.cos(a) * d, y + h - .2 + k * .55 * s, z + Math.sin(a) * d, cw * 1.25, cw * .6, cw * 1.25, r() * 6, pick(r, PINES)); } }
      else if (kind === 'betulla') { const h = (4.2 + r() * 2) * s; put(L.trunk, x, y, z, .5, h, .5, r() * 6, null, (r() - .5) * .1); put(L.bark, x, y + .15, z, .46, h - .3, .46, 0, '#ffffff');
        for (let k = 0; k < 6; k++) branch(x, y + h * (.55 + r() * .4), z, (1.2 + r() * 1.4) * s, .13, r() * 6.3, .55 + r() * .5); }
      else if (kind === 'secco') { const h = (2 + r() * 1.6) * s; put(L.trunk, x, y, z, .85, h, .85, r() * 6, null, (r() - .5) * .3); for (let k = 0; k < 4; k++) branch(x, y + h * (.5 + r() * .45), z, (.9 + r() * 1.2) * s, .2, r() * 6.3, .6 + r() * .6); }
      else { const h = (1.8 + r() * 1.2) * s; put(L.trunk, x, y, z, .8, h, .8, r() * 6, null, (r() - .5) * .2); for (let k = 0; k < 7; k++) branch(x, y + h * (.7 + r() * .3), z, (1.3 + r() * 1.3) * s, .16, r() * 6.3, .5 + r() * .5); put(L.leaf, x, y + h + .9 * s, z, .9 * s, .45 * s, .9 * s, r() * 6, '#4a463e'); }
    };
    const tuft = (x, z, cols, sc, r) => put(L.tuft, x, groundH(x, z) - .02, z, sc * (.7 + r() * .6), sc * (.7 + r() * .7), sc * (.7 + r() * .6), r() * 6, pick(r, cols));
    const STRAW = ['#a69668', '#8e7e52', '#b4a474', '#7c7048'], DEAD = ['#5a5240', '#6a5e48', '#4a4a3c'], GRN = ['#4a5a40', '#56664a', '#40503c'];
'''
s = s[:a] + tree + s[b:]
# vecchi arbusti e erba: cespugli grumosi + ciuffi
rep("if (v === T.TREE) tree(cx, cz,", "if (v === T.TREE && r() < .45) tuft(tx * TS + r() * 2, ty * TS + r() * 2, DEAD, .9, r);\n      if (v === T.TREE) tree(cx, cz,")
rep("else if (v === T.SHRUB) { const k = r() < .5 ? 1 : 0;", "else if (v === T.SHRUB) { for (let q = 0; q < 3; q++) tuft(tx * TS + r() * 2, ty * TS + r() * 2, r() < .5 ? DEAD : STRAW, 1, r); const k = r() < .6 ? 1 : 0;")
rep("else if (z === ZN.DESERTO) { if (r() < .012) tree(cx, cz, 'secco', r); else if (r() < .08) put(L.leaf, cx, groundH(cx, cz) + .15, cz, .5, .3, .5, r() * 6, pick(r, ['#8a7a50', '#7a6a44', '#9a8a5a'])); } }",
    "else if (z === ZN.DESERTO) { if (r() < .012) tree(cx, cz, 'secco', r); else { for (let q = 0; q < 4; q++) tuft(tx * TS + r() * 2, ty * TS + r() * 2, STRAW, 1.1, r); if (r() < .05) put(L.leaf, cx, groundH(cx, cz) + .2, cz, .55, .35, .55, r() * 6, pick(r, DEAD)); } } else if (r() < .5) tuft(cx, cz, r() < .5 ? GRN : DEAD, .9, r); }")
rep("put(L.rock, cx, groundH(cx, cz), cz, .5 + r(), .4 + r() * .6, .5 + r(), r() * 6, null)", "put(L.rock, cx, groundH(cx, cz), cz, .5 + r(), .4 + r() * .6, .5 + r(), r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a']))")
rep("put(L.rock, cx, groundH(cx, cz) - .2, cz, .6 + r() * 1.4, .4 + r() * 1, .6 + r() * 1.2, r() * 6, null)", "put(L.rock, cx, groundH(cx, cz) - .2, cz, .6 + r() * 1.4, .4 + r() * 1, .6 + r() * 1.2, r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a']))")
rep("z === ZN.MONTE ? (q => q < .55 ? 'pino' : q < .85 ? 'abete' : 'betulla')(r())", "z === ZN.MONTE ? (q => q < .3 ? 'pino' : q < .88 ? 'abete' : 'betulla')(r())")
rep(" if (z !== ZN.DESERTO) put(L.leaf, x, groundH(x, zz) + ss * .62, zz, ss, ss * .38, ss, r() * 6, SNOW);", "")
# rotazione: prima inclina, poi gira (i rami vanno in tutte le direzioni)
rep("vE.set(o.rx, o.ry, 0); vQ.setFromEuler(vE); vV.set(o.x, o.y, o.z); vS.set(o.sx, o.sy, o.sz);", "vE.set(o.rx, o.ry, 0, 'YXZ'); vQ.setFromEuler(vE); vV.set(o.x, o.y, o.z); vS.set(o.sx, o.sy, o.sz);")
rep("mkI(L.trunk, K.trunk, K.trunkM, false, true); mkI(L.leaf, K.ball, K.leafM, true, true); mkI(L.cone, K.cone, K.leafM, true, true);\n    mkI(L.rock, K.rock, K.rockM, false, true);",
    "mkI(L.trunk, K.trunk, K.trunkM, true, true); mkI(L.leaf, K.blob, K.vegM, true, true); mkI(L.fir, K.fir, K.vegM, true, true); mkI(L.tuft, K.tuft, K.vegM, true, false);\n    mkI(L.rock, K.rockG, K.vegM, true, true);")
rep("mkI(L.bark, K.trunk, K.leafM, true, false);", "mkI(L.bark, K.trunk, K.barkM, false, false);")
rep("  function tickVolumes(time, night) {", "  function tickVolumes(time, night) {\n    VEGU.time.value = time;")
open(p, 'w', encoding='utf-8').write(s); print('ok')
