# [isola34] Città bassa e organica: le case coi pezzi veri del kit Retro Urban (isola_render3.js), niente megastrutture in città
# (restano solo alla Base: hangar e depositi a bunker), niente coronamento delle torri del governo. Dopo inverno_render33.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola34]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render3.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
rep("      if (GOV32[b.id]) { GOV32[b.id](b, i, base, low); return; }   // [isola32]",
    "      if (GOV32[b.id]) { GOV32[b.id](b, i, base, low); return; }   // [isola32]\n      if (usaKit34(b)) { casaKit(b, i, base, low, plinth); return; }   // [isola34]")
rep("const GOV32 = { governo: palazzoGoverno, garante: ufficiGarante, ministero, pietra: pietraOnda, archivio: bunker, hangar1: bunker, hangar2: bunker };",
    "const GOV32 = { hangar1: bunker, hangar2: bunker, deposito_n: bunker, deposito_s: bunker };   // [isola34] le megastrutture solo alla Base")
rep("    if (b.gov) govCrown(grp, b, base, top, x0, z0, w, d); else if (roofKind === 'flat' && fl >= 4 && !b.__tierBase && r() < .22) roofBillboard(grp, i, top + .1, x0, z0, w, d, r);   // [isola31]",
    "    if (roofKind === 'flat' && fl >= 3 && !b.__tierBase && r() < .12) roofBillboard(grp, i, top + .1, x0, z0, w, d, r);   // [isola31] [isola34] niente coronamenti in città")
open(p, 'w', encoding='utf-8').write(s); print('ok')
