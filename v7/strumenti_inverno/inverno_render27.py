# [inverno 27] Le luci non sono tutte dello stesso tono. Dopo inverno_render26.
# Ogni sorgente prende un tono dalla sua posizione (così la luce e il suo alone combaciano): bianco chiaro, caldo, freddo spento,
# giallo, ambra, arancio molto caldo; più caldi che freddi. Il rosso del regime resta rosso. Finestre accese di toni diversi.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno27]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("  function nq(hex) {", """  // [inverno27] toni delle luci: chiaro, caldo, freddo, giallo, ambra, molto caldo (pesati verso il caldo)
  const LTONES = ['#fff0d8', '#ffd49a', '#ffc070', '#e4e8ea', '#ffe27a', '#ffae48', '#ff9a40', '#ff8530', '#ffb860', '#f6f2ea'];
  function tone(hex, x, z) { const q = nq(hex); if (q === '#' + NQ[1].getHexString()) return q; const c = new THREE.Color(hex), h = {}; c.getHSL(h); if (h.s < .2 && h.l > .85) return hex;
    let k = Math.imul((Math.round(x * 2) * 73856093) ^ (Math.round(z * 2) * 19349663), 2654435761) >>> 0; return LTONES[k % LTONES.length]; }
  function nq(hex) {""")
rep("function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(nq(color)),",
    "function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(tone(color, x, z)),")
rep("function glow(x, y, z, color, size, add) { color = nq(color);", "function glow(x, y, z, color, size, add) { color = tone(color, x, z);")
rep("const LIT = ['#ffb050', '#ffc470', '#ffb050', '#ffa040', '#ffc880', '#f0d0a0'];",
    "const LIT = ['#ffb050', '#ffc470', '#fff0d8', '#ffa040', '#ffc880', '#e4e8ea', '#ffe27a', '#ff9040', '#f0d0a0', '#ffb860'];   // [inverno27] finestre di toni diversi")
open(p, 'w', encoding='utf-8').write(s); print('ok')
