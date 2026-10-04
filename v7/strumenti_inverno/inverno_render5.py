#!/usr/bin/env python3
"""inverno_render5: contrasto e colore (3 ottobre sera). Uso: python3 inverno_render5.py v7/src/render.js"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert a in s, 'manca: ' + a[:70]
    s = s.replace(a, b, 1)
rep("PITCH = 0.95;", "PITCH = 0.78;")
rep("vec3(.06,.09,.14)*.4", "vec3(.04,.1,.11)*.4")
rep("c = (c-.5)*1.06+.5;", "c = (c-.5)*1.24+.5;")
rep("c = mix(vec3(l), c, mix(.55, 1.15, hot)*sat);", "c = mix(vec3(l), c, mix(.82, 1.25, hot)*sat);")
rep("pick(r, ['flat', 'flat', 'flat', 'flat', 'slate', 'cotto'])", "pick(r, ['flat', 'flat', 'flat', 'flat', 'slate', 'slate'])")

rep("x.fillStyle = '#8a8490'; x.fillRect(px, py, P, P); x.fillStyle = '#6a6470'; for (let k = 0; k < P; k += 8) { x.fillRect(px + k, py, 1, P); x.fillRect(px, py + k, P, 1); } dots(px, py, 8, ['#9a94a0', '#7a7480'], r);", "x.fillStyle = '#54525a'; x.fillRect(px, py, P, P); dots(px, py, 6, ['#48464e', '#62606a'], r);")
# --- tetti vissuti ---
frag = open(__file__.rsplit('/',1)[0] + '/inverno_tetti.js', encoding='utf-8').read()
fac = open(__file__.rsplit('/',1)[0] + '/inverno_marciapiedi.js', encoding='utf-8').read() + open(__file__.rsplit('/',1)[0] + '/inverno_facciate.js', encoding='utf-8').read() + open(__file__.rsplit('/',1)[0] + '/inverno_dettagli.js', encoding='utf-8').read()
rep("  function buildVolumes() {", fac + frag + "  function buildVolumes() {")
rep("TT('inverno', buildWinter); TT('volumi', buildVolumes);", "TT('inverno', buildWinter); TT('facciate', buildFacades); TT('dettagli', buildDetails); TT('dettagli2', buildDetails2); TT('volumi', buildVolumes); TT('marciapiedi', buildSidewalks); TT('tetti', buildRoofs);")
# gli edifici a moduli dicono se il tetto è piatto
i = s.index("const rec = { b, grp: merged, fade: 0, box3: new THREE.Box3(")
s = s[:i] + "const rec = { b, flat: roofKind === 'flat', grp: merged, fade: 0, box3: new THREE.Box3(" + s[i+len("const rec = { b, grp: merged, fade: 0, box3: new THREE.Box3("):]
open(p, 'w', encoding='utf-8').write(s); print('ok')
