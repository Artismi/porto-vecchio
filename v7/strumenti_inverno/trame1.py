# [trame] I sassi lanciati dagli abitanti (st.proj con kind 'sasso', game.js npcThrow) volano come le molotov ma senza
# fiamma, più piccoli. Dopo muri_gente2.py. Guardia [trame1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[trame1]' in s: print('già applicato'); sys.exit()
old = "FX.bottles.forEach((b, i) => { const pr = st.proj[i]; b.visible = !!pr; if (pr) { b.position.set(pr.x, pr.z + groundH(pr.x, pr.y), pr.y); b.rotation.x += dt * 14;"
assert s.count(old) == 1
s = s.replace(old, old + " b.scale.setScalar(pr.kind === 'sasso' ? .4 : 1); b.userData.flame.visible = pr.kind !== 'sasso';   /* [trame1] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
