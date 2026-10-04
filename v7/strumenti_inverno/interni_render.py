# [interni 4/10] aggancia interni_arte.js a render.js: buildIndoor passa la mano a InterniArte.build,
# indoorPass chiama InterniArte.light a ogni fotogramma al chiuso e InterniArte.exit quando si esce.
# Uso: python3 interni_render.py v7/src/render.js   (si può rilanciare: se il gancio c'è già non fa niente)
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[interni] InterniArte' in s:
    print('già agganciato'); sys.exit(0)
def rep(a, b):
    global s
    n = s.count(a)
    if n != 1: sys.exit('non trovo (o trovo %d volte): %s' % (n, a[:80]))
    s = s.replace(a, b)
rep("""  function buildIndoor(b, f) {
""", """  function buildIndoor(b, f) {
    if (window.InterniArte) { try { const g0 = InterniArte.build(b, f, { THREE, scene, cam, INDOOR, G, groundH }); if (g0) return g0; } catch (e) { console.error('[interni] InterniArte', e); } }
""")
rep("""      if (INDOOR.grp) { scene.remove(INDOOR.grp); INDOOR.grp = null; }""", """      if (INDOOR.grp) { scene.remove(INDOOR.grp); INDOOR.grp = null; }
      if (!key && window.InterniArte) InterniArte.exit();""")
rep("""    hemi.intensity *= .5; moon.intensity *= .35; fillAmb.intensity *= .6;""", """    hemi.intensity *= .5; moon.intensity *= .35; fillAmb.intensity *= .6;
    if (window.InterniArte) InterniArte.light({ st, hemi, moon, fillAmb, dyn, scene, INDOOR });""")
if "    playerH = groundH(p.x, p.y);" in s:
    rep("    playerH = groundH(p.x, p.y);", "    playerH = p.indoor && window.InterniArte && InterniArte.floorY() != null ? InterniArte.floorY() : groundH(p.x, p.y);   // [interni] al chiuso si cammina sul pavimento")
else:
    rep("playerH = lh !== null ? lh : groundH(p.x, p.y); }", "playerH = lh !== null ? lh : groundH(p.x, p.y); if (p.indoor && window.InterniArte && InterniArte.floorY() != null) playerH = InterniArte.floorY(); }   // [interni] al chiuso si cammina sul pavimento")
rep("function screenToGround(nx, ny) { ground.constant = -(1.1 + playerH);", "function screenToGround(nx, ny) { ground.constant = -((window.InterniArte && InterniArte.floorY() != null ? 0 : 1.1) + playerH);   /* [interni] dentro si clicca sul pavimento */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
