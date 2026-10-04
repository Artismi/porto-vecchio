# [inverno 20] Via gli azzurri dalla palette. Dopo inverno_render19.
# 1) nel passaggio finale dell'immagine ogni ciano/azzurro saturo (facciate, onde dipinte, insegne, vetri) si spegne verso il grigio.
#    I colori caldi, i rossi e i verdi non si toccano. Un solo numero regola quanto: AZZ (0 = azzurri tolti, 1 = come prima).
# 2) alla fonte: il tubo «freddo» delle insegne diventa bianco neutro, il Bar Sirena non è più verde acqua.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno20]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("          c = (c-.5)*1.24+.5;\n", """          c = (c-.5)*1.24+.5;
          { float AZZ = .12; float cy = smoothstep(.03,.16, min(c.g,c.b)-c.r) * smoothstep(.06,.22, max(max(c.r,c.g),c.b)-min(min(c.r,c.g),c.b));   // [inverno20] niente azzurri
            vec3 gr = vec3(dot(c, vec3(.3,.59,.11))) * vec3(1.,.99,.97); c = mix(c, mix(gr, c, AZZ), cy); }
""")
rep("const NQ = ['#9cc8c0', '#b84a3c', '#d8904a']", "const NQ = ['#d4d0c6', '#b84a3c', '#d8904a']")
s = s.replace("'#9cc8c0'", "'#d4d0c6'")
rep("sirena: ['#2ab8b0', '#f4f0e6']", "sirena: ['#8a7a66', '#d8d0c2']")
open(p, 'w', encoding='utf-8').write(s); print('ok')
