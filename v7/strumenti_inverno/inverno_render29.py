# [inverno 29] Bilanciamento: niente punti bruciati, niente buchi neri. Dopo inverno_render28.
# - i faretti calano dolcemente (decadimento 1.25 invece di 2, bordo del cono sfumato), meno forti vicino alla sorgente;
# - dove più sorgenti sono vicine, ognuna si abbassa (si dividono la scena invece di sommarsi fino al bianco);
# - le alte luci si comprimono prima (spalla più morbida): il bianco pieno resta solo alle lampadine;
# - di notte un filo di luce lunare fredda tiene leggibili le forme in ombra.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno29]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.12, .55, 2);", "const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.2, .95, 1.25);   // [inverno29] caduta morbida, bordo sfumato")
rep("l.distance = (L.dist || 8) * 1.25 + hh;", "l.distance = (L.dist || 8) * 1.6 + hh;")
rep("      l.intensity = L.base * k * .95;", """      if (L.nb === undefined) { L.nb = 0; LSRC.forEach(o => { if (o !== L && Math.abs(o.x - L.x) < 7 && Math.abs(o.z - L.z) < 7) L.nb++; }); }   // [inverno29] vicine: si dividono la luce
      l.intensity = L.base * k * .9 / Math.sqrt(1 + L.nb * .6);""")
rep("{ vec3 hi = max(c-.6, 0.); c = min(c, vec3(.6)) + hi/(1.+hi*2.8); }", "{ vec3 hi = max(c-.48, 0.); c = min(c, vec3(.48)) + hi/(1.+hi*3.6); }   // [inverno29] spalla più morbida")
rep("hemi.intensity = .22 + (1 - night) * .3;", "hemi.intensity = .22 + (1 - night) * .3 + night * .08;")
rep("moon.intensity = .3 + (1 - night) * .72;", "moon.intensity = .34 + (1 - night) * .68;")
open(p, 'w', encoding='utf-8').write(s); print('ok')
