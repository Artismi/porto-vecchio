# [bagliore1] Il rettangolo nero (si vedeva nel vicolo, con o senza lucido1).
# Un solo pixel della scena non valido (NaN o infinito, oltre il limite dei buffer a mezza precisione) entrava nel bagliore e
# nella scena sfocata: le sfocature lo allargavano a blocchi grandi quanto i loro pixel (1/2, 1/4, 1/8 dello schermo) e nel
# post finale ogni conto che li toccava diventava nero. Ora il passaggio che legge la scena scarta i valori non validi e tiene
# la luce sotto un tetto. Dopo prato1.py. Guardia [bagliore1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[bagliore1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

rep("vec3 f(vec2 u){ vec3 c = texture2D(t, u).rgb; if (thr > 0.)",
    "vec3 f(vec2 u){ vec3 c = texture2D(t, u).rgb; if (!(c.r + c.g + c.b < 1e4) || !(c.r >= 0. && c.g >= 0. && c.b >= 0.)) c = vec3(0.); c = min(c, vec3(64.));   /* [bagliore1] niente NaN né infiniti */ if (thr > 0.)")
open(p, 'w', encoding='utf-8').write(s); print('ok')
