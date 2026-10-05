# [luci 6] Via il tono retro da centro commerciale di cartone animato (Andrea: «non quel tono retro da Coconut Mall di Mario Kart»).
#  - niente righe di schermo (l'effetto «monitor»);
#  - colori a 64 livelli invece di 40 (meno scalini da console);
#  - saturazione a compressione morbida: i colori molto saturi (caramella) si calmano, quelli spenti restano vivi;
#  - le alte luci si comprimono senza cambiare tinta: il sodio resta arancio e sbianca verso il bianco caldo,
#    non diventa giallo limone.
# Dopo luci_regia5.py. Commenti a fine riga solo /* */.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci6]' in s: print('già applicato'); sys.exit()
assert '[luci5]' in s, 'prima luci_regia5.py'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

rep("            c *= 1. - smoothstep(.62,.95, lu) * REG_BIANCO; }",
    """            c *= 1. - smoothstep(.62,.95, lu) * REG_BIANCO; }
          { float mx = max(max(c.r,c.g),c.b), mn = min(min(c.r,c.g),c.b), s0 = (mx - mn) / (mx + 1e-4);   /* [luci6] niente caramella */
            float s1 = s0 / (1. + s0 * .9) * 1.45, lu6 = dot(c, vec3(.3,.59,.11));
            c = mix(vec3(lu6), c, clamp(s1 / (s0 + 1e-4), 0., 1.15)); }""")
rep("          { vec3 hi = max(c-.48, 0.); c = min(c, vec3(.48)) + hi/(1.+hi*3.6); }",
    "          c = max(c, 0.); { float L0 = max(max(c.r,c.g),c.b), L1 = L0 < .48 ? L0 : .48 + (L0 - .48) / (1. + (L0 - .48) * 3.6); c *= L1 / max(L0, 1e-4); c = mix(c, vec3(L1) * vec3(1., .96, .9), smoothstep(.5, .72, L1) * .4); }   /* [luci6] spalla che non cambia tinta */")
rep("          c *= 1. - .05*mod(floor(vUv.y*res.y), 2.);", "          /* [luci6] niente righe di schermo */")
rep("          c = floor(c*40. + bd*.6 + .5)/40.;", "          c = floor(c*64. + bd*.6 + .5)/64.;   /* [luci6] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
