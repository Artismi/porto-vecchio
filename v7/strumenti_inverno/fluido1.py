# [fluido1] Il gioco gira pianissimo (Andrea, con il doppio degli abitanti). Misure (periferia ovest, giorno): fino a 13.500 chiamate
# di disegno e 23 milioni di triangoli per fotogramma; senza ombre 4.100 e 7 milioni. Le ombre facevano il 70% del lavoro:
#  - 12 faretti con ombra (ogni materiale legge 12 mappe d'ombra per pixel), fino a tre rifatti a ogni fotogramma anche di
#    giorno per le luci sempre accese, e tutti insieme entrando in una zona nuova;
#  - il sole rifà la sua mappa 2048 (92 x 92 m, ~600 oggetti, 1,7 milioni di triangoli) a ogni fotogramma.
# Ora:
#  1) faretti con ombra: i 4 più vicini (gli altri illuminano senza ombra), di sera, uno rifatto per fotogramma;
#  2) sole: la mappa si rifà un fotogramma sì e uno no, o subito se la camera si sposta in fretta o il sole gira;
#  3) risoluzione adattiva: R.scale(s) abbassa la risoluzione interna fino al 55% (main.js la regola sui fotogrammi al secondo).
# Dopo zoom1.py e l'alleggerimento. Guardia [fluido1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[fluido1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# 1) solo i primi 4 faretti (i più vicini: dyn.lsp è in ordine di distanza) portano l'ombra; fisso dall'inizio, così gli shader non si ricompilano
rep("l.userData.cone = cone; scene.add(l); scene.add(l.target); scene.add(cone); SPOOL.push(l); LPOOL.push(l); }",
    "l.userData.cone = cone; scene.add(l); scene.add(l.target); scene.add(cone); SPOOL.push(l); LPOOL.push(l); }\n      SPOOL.forEach((l, i) => { if (i >= 4) l.castShadow = false; });   /* [fluido1] ombra solo ai 4 faretti più vicini */")
rep("for (let q = 0; q < 3; q++) { const l = SPOOL[(frameN * 3 + q) % SPOOL.length]; if (l && l.intensity > 0) l.shadow.needsUpdate = true; }",
    "if (night > .3) { const l = SPOOL[frameN % 4]; if (l && l.castShadow && l.intensity > 0) l.shadow.needsUpdate = true; }   /* [fluido1] di sera, uno per fotogramma */")
# un faretto che cambia lampada rifà l'ombra solo se la porta
rep("l.distance = (L.dist || 8) * 1.6 + hh; l.shadow.camera.far = l.distance; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate = true; }",
    "l.distance = (L.dist || 8) * 1.6 + hh; l.shadow.camera.far = l.distance; l.shadow.camera.updateProjectionMatrix(); l.shadow.needsUpdate = l.castShadow; }   /* [fluido1] */")

# 2) il sole: mappa a fotogrammi alterni, subito se la camera corre o il sole gira
rep("scene.add(moon); scene.add(moon.target);", "scene.add(moon); scene.add(moon.target); moon.shadow.autoUpdate = false; moon.shadow.needsUpdate = true;   /* [fluido1] */")
rep("    renderer.setRenderTarget(rt); warmShaders(); renderer.render(scene, camera);",
    """    { const F = FLU1, cp = camera.position, mv = Math.hypot(cp.x - F.x, cp.z - F.z) + Math.abs(cp.y - F.y);   /* [fluido1] l'ombra del sole a fotogrammi alterni */
      const sx = moon.position.x - moon.target.position.x, sy = moon.position.y - moon.target.position.y, sz = moon.position.z - moon.target.position.z, sl = Math.hypot(sx, sy, sz) || 1;
      const turn = 1 - (sx * F.dx + sy * F.dy + sz * F.dz) / sl;
      if (frameN % 2 === 0 || mv > .5 || turn > .0004) { moon.shadow.needsUpdate = true; F.x = cp.x; F.y = cp.y; F.z = cp.z; F.dx = sx / sl; F.dy = sy / sl; F.dz = sz / sl; } }
    renderer.setRenderTarget(rt); warmShaders(); renderer.render(scene, camera);""")
rep("  let frameN = 0, playerH = 0;", "  let frameN = 0, playerH = 0;\n  const FLU1 = { x: 1e9, y: 0, z: 0, dx: 0, dy: 1, dz: 0 };   /* [fluido1] */")

# 3) risoluzione adattiva
rep("PX = LOWQ.on ? Math.max(2, Math.round(dpr) * 2) : Math.max(1, ch * dpr / 720);",
    "PX = LOWQ.on ? Math.max(2, Math.round(dpr) * 2) : Math.max(1, ch * dpr / (720 * RSC1));   /* [fluido1] RSC1: risoluzione adattiva */")
rep("  let TARGET = 540, lastSize = null;", "  let TARGET = 540, lastSize = null, RSC1 = 1;   /* [fluido1] */")
rep("  return { get __buildings() { return dyn.buildings; },",
    "  return { scale: s => { if (s !== undefined) { s = Math.max(.55, Math.min(1, s)); if (Math.abs(s - RSC1) > .01) { RSC1 = s; if (lastSize) resize(...lastSize); } } return RSC1; },   /* [fluido1] */\n    get __buildings() { return dyn.buildings; },")
open(p, 'w', encoding='utf-8').write(s); print('ok')
