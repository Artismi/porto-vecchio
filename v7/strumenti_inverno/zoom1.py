# [zoom1] Più zoom (Andrea: «aumenta quanto si può zoomare»). main.js: da .4–3.2 a .12–4.2. Qui la camera regge gli estremi:
# da vicino il piano di taglio vicino scende con la distanza (prima a 8 m: a zoom .12 la camera è a 10 m e tagliava i muri),
# da lontano il piano lontano si allunga con la distanza (prima 300 m: oltre zoom 3.6 sparivano i campi lontani).
# Dopo lucido1.py. Guardia [zoom1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[zoom1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("camera.fov = fov; camera.near = lerp(8, 2, ease); camera.far = lerp(300, 300, ease); camera.updateProjectionMatrix();",
    "camera.fov = fov; camera.near = lerp(Math.min(8, Math.max(.6, dist * .35)), 2, ease); camera.far = Math.max(300, dist + 160); camera.updateProjectionMatrix();   /* [zoom1] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
