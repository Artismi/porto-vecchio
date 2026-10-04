# [inverno 22] Propaganda del regime sui muri: ritratti del Garante, teloni rossi, slogan rossi. Frammento: inverno_propaganda.js. Dopo inverno_render21.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno22]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inverno_propaganda.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("  function buildDetails() {", frag + "  function buildDetails() {")
rep("TT('dettagli', buildDetails);", "TT('dettagli', buildDetails); TT('propaganda', buildPropaganda);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
