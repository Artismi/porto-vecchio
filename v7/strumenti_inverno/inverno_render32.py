# [isola32] Il Tavolato con la parete liscia sulla curva vera (niente scalini), i palazzi del governo dai riferimenti di Andrea
# (colossi coi globi e torre dell'orologio, busto del Garante in facciata, piramidi di cemento, capsula rossa sul fusto, bunker a contrafforti),
# alberi di verdi più vivi. Frammento: isola_render2.js. Dopo inverno_render31.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola32]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render2.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
rep("      if (b.shack) { buildShack(b, i, base, low); return; }   // [isola31]",
    "      if (b.shack) { buildShack(b, i, base, low); return; }   // [isola31]\n      if (GOV32[b.id]) { GOV32[b.id](b, i, base, low); return; }   // [isola32]")
rep("TT('strade31', buildStrade31);", "TT('strade31', buildStrade31); TT('tavolato32', buildTavolato);")
rep("dyn.buildings.forEach((rec, bi) => { if (rec.shack) return;", "dyn.buildings.forEach((rec, bi) => { if (rec.shack || rec.special) return;", 6)
# verdi più vivi: abeti e pini meno neri, più varietà
rep("const FIRS = ['#27422f', '#2d4d3c', '#22392c', '#34", "const FIRS = ['#34583c', '#3e6448', '#2e4e38', '#466a44', '#38604e', '#4a6e3e', '#34", 1)
open(p, 'w', encoding='utf-8').write(s); print('ok')
