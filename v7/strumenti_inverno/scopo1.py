# [scopo] Dentro gli edifici si vede chi c'è: quando il giocatore entra, gli abitanti che sono lì (a casa, al lavoro,
# clienti) hanno il loro posto nella stanza (n.room, deciso da popolo.js: nel letto, a tavola, al bancone, sulla panca).
# Qui la grafica li disegna sul pavimento dell'interno e non li nasconde insieme al mondo di fuori.
# Dopo unione10.py. Guardia [scopo].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[scopo]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("""      if (n.inside || (n.pop && !n.pop.near)) { if (g) { g.visible = false; if (n.pop && !n.pop.near) { scene.remove(g); delete dyn.people[n.id]; } } return; }""",
"""      const inRoom = !!(n.room && p.indoor && !n.dead);   // [scopo] dentro l'edificio del giocatore: si vede chi c'è
      if ((n.inside && !inRoom) || (n.pop && !n.pop.near)) { if (g) { g.visible = false; g.userData.inRoom = false; if (n.pop && !n.pop.near) { scene.remove(g); delete dyn.people[n.id]; } } return; }""")
rep("""      g.visible = !n.inside;
      if (!g.visible) return;
      g.position.set(n.x, groundH(n.x, n.y), n.y); g.rotation.y = Math.PI / 2 - n.face;""",
"""      g.visible = !n.inside || inRoom; g.userData.inRoom = inRoom;
      if (!g.visible) return;
      g.position.set(n.x, inRoom && window.InterniArte && InterniArte.floorY() != null ? InterniArte.floorY() : groundH(n.x, n.y), n.y); g.rotation.y = Math.PI / 2 - n.face;""")
rep("""    scene.children.forEach(o => { if (o === INDOOR.grp || o === pg || o.isLight || INDOOR.lights.includes(o)) return; if (o.visible) { o.visible = false; o.userData.__hid = true; } });""",
"""    scene.children.forEach(o => { if (o === INDOOR.grp || o === pg || o.isLight || INDOOR.lights.includes(o) || o.userData.inRoom) return; if (o.visible) { o.visible = false; o.userData.__hid = true; } });   // [scopo] chi è nella stanza resta""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
