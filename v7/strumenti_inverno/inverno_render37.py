# [isola37] La luce che si legge (con l'ok di Andrea): la notte d'inverno è di luna, non nera; di giorno il suolo piatto non
# si slava in grigio da neve sporca; le ombre non si schiacciano (il bosco ha forma); i caldi medi (intonaci) si leggono.
# Solo AGGIUNTE: non cambia nessuna riga esistente (la regia luci, luci_regia*, si ancora a quelle). Va dopo inverno_render36.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola37]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# il frame: dopo la regia delle luci, un minimo di luna e di cielo, così di notte la strada e il bosco si leggono
rep("    updateLights(time, night, cam.x, cam.y);\n",
    "    updateLights(time, night, cam.x, cam.y);\n    { const dayK = 1 - night; hemi.intensity = Math.max(hemi.intensity, .4 * dayK); moon.intensity = Math.max(moon.intensity, .65 * dayK); fillAmb.intensity = Math.max(fillAmb.intensity, .2 * dayK); }   // [isola37] minimi solo di giorno: la notte è della regia luci\n")
# il post: prima della vignetta, le ombre si alzano, i caldi medi tornano, il suolo chiaro al sole si spegne un poco
rep("          vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;",
    """          { float l2 = dot(c, vec3(.3,.59,.11));   // [isola37]
            c = mix(c, pow(max(c, vec3(0.)), vec3(.72)) + vec3(.004,.008,.004), (1.-smoothstep(.0,.4,l2))*.85*(1.-night));   // ombre meno schiacciate: il bosco ha forma
            { float gr = smoothstep(.0,.05, c.g - max(c.r,c.b)); float lg = dot(c, vec3(.3,.59,.11)); c = mix(vec3(lg), c, 1. + gr*.6); }   // il verde del bosco torna verde
            float warm = smoothstep(.015,.1, c.r-c.b) * (1.-smoothstep(.55,.85,l2));
            c = mix(vec3(l2), c, 1. + warm*.4);                                               // ocra, cotto, senape, sangue di bue si leggono
            c *= 1. - smoothstep(.45,.85,l2)*.2*(1.-warm); }                                  // il suolo piatto al sole non sbianca
          vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
