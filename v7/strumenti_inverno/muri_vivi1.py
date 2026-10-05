# [muri 1] Muri vivi (Andrea: «meno schermi del regime, più stendardi, poster, bandiere e murales, vivi, fusi alle superfici,
# montati come di dovere, spiegazzati»). Frammento: manifesti.js.
#  - tre schermi del regime su quattro diventano manifesti stampati incollati sul pannello;
#  - i vecchi manifestini a pixel perdono il rosa e il ciano da insegna al neon;
#  - nuova passata buildWallsAlive (dopo 'pulizia'): murales sui tratti ciechi del piano terra, manifesti a strati
#    spiegazzati, stendardi appesi a un'asta con le staffe, bandiere su aste inclinate; la stoffa si muove col vento.
# Dopo luci_regia6.py. Commenti a fine riga solo /* */.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[muri1]' in s: print('già applicato'); sys.exit()
assert '[luci1]' in s, 'serve zoneAt() di luci_regia1'
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'manifesti.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

rep("  function buildChunk(ci, cj) {", frag + "  function buildChunk(ci, cj) {")
rep("TT('pulizia', clearMurals);", "TT('pulizia', clearMurals); TT('muri', buildWallsAlive);")
rep("    tickAir2(time, night);   // [luci3]", "    tickAir2(time, night);   // [luci3]\n    MV.t.value = time;   // [muri1] il vento nella stoffa")
# meno schermi: 3 su 4 diventano carta stampata
rep("  function eyeMat(kind) {\n    if (EYEC[kind]) return EYEC[kind];",
    "  function eyeMat(kind) {\n    if (kind === 'screen' && ((EYEC.__n = (EYEC.__n || 0) + 1) % 4)) return mvPaperMat(mvPoster(EYEC.__n % 2 ? 5 : 0));   /* [muri1] meno schermi */\n    if (EYEC[kind]) return EYEC[kind];")
# i vecchi manifestini senza neon rosa/ciano
i = s.index('  function posterTex(k) {'); j = s.index('\n  function ', i + 10)
body = s[i:j].replace("'#ff3fa4'", "'#8e2a22'").replace("'#38e8ff'", "'#c08a2e'").replace("'#f0d030'", "'#c8a84a'")
s = s[:i] + body + s[j:]
# un muro cieco su due (fuori dai luoghi del regime) non ha il Garante: la gente ci ha dipinto sopra un murale
rep("    return { f: sd.f, k0, k1: k0 + span, pw, ph, yc: base + .3 + H / 2, ...pos, defaced: r() < .22, top: base + H };",
    "    return { f: sd.f, k0, k1: k0 + span, pw, ph, yc: base + .3 + H / 2, ...pos, defaced: r() < .22, top: base + H, mural: !civic && r() < .5 };   /* [muri1] */")
rep("const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));",
    "const m = new THREE.Mesh(new THREE.PlaneGeometry(PP.pw, PP.ph), PP.mural ? mvMuralMat(bi % 8, true) : propTex('ritratto', (bi % 7) + (PP.defaced ? 100 : 0)));   /* [muri1] murale della gente */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
