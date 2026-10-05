# [luci 7] Il sole da sud-ovest. Prima veniva da nord-ovest e la camera guarda da sud-est: le facciate che vediamo (S ed E)
# erano sempre in controluce, scure, e manifesti, murales, intonaci non si leggevano. Ora le facciate a sud prendono luce
# radente, quelle a est restano in ombra (i volumi si separano), le ombre lunghe cadono verso nord-est.
# Dopo luci_regia6.py (e muri_vivi1.py). Commenti a fine riga solo /* */.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci7]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("moon.position.set(cam.x - 34 - dusk * 18, 22 - dusk * 8, cam.y - 30);", "moon.position.set(cam.x - 26 - dusk * 18, 22 - dusk * 8, cam.y + 30); /* [luci7] sole da sud-ovest */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
