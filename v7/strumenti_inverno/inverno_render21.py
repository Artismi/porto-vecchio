# [inverno 21] Colori del regime. Dopo inverno_render20.
# Nel passaggio finale: tutto scivola verso il cemento (saturazione bassa, bianchi spenti, un velo grigio-verde da caserma).
# Restano vivi solo il rosso del regime e la luce calda delle lampade e dei fuochi.
# Manopole: REG_SAT (saturazione generale, 1 = come prima), REG_BIANCO (quanto si spengono i bianchi).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno21]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("            vec3 gr = vec3(dot(c, vec3(.3,.59,.11))) * vec3(1.,.99,.97); c = mix(c, mix(gr, c, AZZ), cy); }\n",
"""            vec3 gr = vec3(dot(c, vec3(.3,.59,.11))) * vec3(1.,.99,.97); c = mix(c, mix(gr, c, AZZ), cy); }
          { float REG_SAT = .38, REG_BIANCO = .16;   // [inverno21] il regime: cemento, rosso, luce calda
            float lu = dot(c, vec3(.3,.59,.11));
            float rosso = smoothstep(.12,.3, c.r-c.g) * smoothstep(.06,.2, c.r-c.b);          // rossi e arancio delle lampade
            float keep = max(REG_SAT, max(rosso*.95, hot*.85));
            c = mix(vec3(lu) * vec3(.98,1.,.98), c, keep);                                     // grigio appena verdastro, da caserma
            c *= 1. - smoothstep(.62,.95, lu) * REG_BIANCO; }                                   // niente bianchi puliti
""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
