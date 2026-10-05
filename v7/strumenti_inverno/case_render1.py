# [case] Case col carattere: intonaci caldi e diversi per piano, persiane, fioriere, tende, bovindi a sbalzo, tettoie in coppi,
# lanterne, intonaco scrostato coi mattoni, umidità, colature, edera, giardini pensili, bucato. Frammento: case_carattere.js.
# Si applica per ultimo, dopo tutta la catena inverno_render*, monte_render, interni_render e luci_regia* (guardia «già applicato»).
import sys, os, re
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[case]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'case_carattere.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# intonaci: tinte calde e scolorite (ocra, cotto, sangue di bue, senape, rosa antico, salvia, verderame), qualche bianco
m = re.search(r"\n    borgo: \[\[.*\n", s); assert m, 'PALS.borgo'
s = s[:m.start()] + """
    borgo: [['#c29a5c', '#e0d4b8'], ['#b26a4c', '#dccbb0'], ['#8e4636', '#d0bca0'], ['#c4a24a', '#e2d6b4'], ['#c49282', '#e4d8cc'], ['#a8764e', '#dccab0'], ['#8e9a76', '#d8d4c0'], ['#6e8a80', '#d0ccbe'],
      ['#9a8a6a', '#d8ccb4'], ['#b88a6a', '#e0d2bc'], ['#7e8890', '#d4d0c8'], ['#a85a48', '#d8c4a8'], ['#d2c4a2', '#ece4d0'], ['#d8d2c4', '#efeae0'], ['#8a7a96', '#d4ccd0'], ['#b49a7a', '#ddd0bc']],   // [case] intonaci caldi e scoloriti
""" + s[m.end():]
# buildModular: tinta per piano (basamento, ultimo piano rifatto) e registro delle finestre per le persiane
rep("    const mat = palMat([pal[0], pal[1], roofKind === 'flat' ? '#a8a29a' : '#5a5560', kind === 'port' ? '#7a7f88' : '#3a3a44']);",
    "    const PA = [pal[0], pal[1], roofKind === 'flat' ? '#a8a29a' : '#5a5560', kind === 'port' ? '#7a7f88' : '#3a3a44'], mat = palMat(PA);\n"
    "    const CS = caseScheme(b, i, kind, PA, Math.max(1, b.fl)), matG = CS.g || mat, matF = f => CS.split && f >= CS.split ? CS.u : mat; let LW = null; b.__win = [];   // [case]")
rep("        const pc = modPiece(grp, name, mat, ...xyz(span === 2 ? sd.at(k + .5) : sd.at(k), base), sd.rot, isWin ? gm : null);",
    "        const pc = modPiece(grp, name, matG, ...xyz(span === 2 ? sd.at(k + .5) : sd.at(k), base), sd.rot, isWin ? gm : null);\n"
    "        b.__win.push({ f: sd.f, k, u: (span === 2 ? k + .5 : k) * TS + 1, y: base, name, g: true, lit: !!(isWin && gm), shop });   // [case]")
rep("        for (let s = 0; s < span; s++) modPiece(grp, 'wall-low', mat, ...xyz(sd.at(k + s), base + MF), sd.rot);",
    "        for (let s = 0; s < span; s++) modPiece(grp, 'wall-low', matG, ...xyz(sd.at(k + s), base + MF), sd.rot);")
rep("          if (sd.n % 2 === 1) { modPiece(grp, 'wall', mat, ...xyz(sd.at(0), y), sd.rot); k = 1; }",
    "          if (sd.n % 2 === 1) { modPiece(grp, 'wall', matF(f), ...xyz(sd.at(0), y), sd.rot); k = 1; }")
rep("{ modPiece(grp, 'wall', mat, ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', mat, ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, mat, ...xyz(sd.at(k + .5), y), sd.rot, r() < .35 ? lit : null); }",
    "{ modPiece(grp, 'wall', matF(f), ...xyz(sd.at(k), y), sd.rot); modPiece(grp, 'wall', matF(f), ...xyz(sd.at(k + 1), y), sd.rot); continue; } modPiece(grp, upper, matF(f), ...xyz(sd.at(k + .5), y), sd.rot, LW = r() < .35 ? lit : null); b.__win.push({ f: sd.f, k, u: (k + .5) * TS + 1, y, name: upper, lit: !!LW }); }")
rep("          const pc = modPiece(grp, nm, mat, ...xyz(sd.at(k), y), sd.rot, r() < .3 ? lit : null);",
    "          const pc = modPiece(grp, nm, matF(f), ...xyz(sd.at(k), y), sd.rot, LW = r() < .3 ? lit : null); b.__win.push({ f: sd.f, k, u: k * TS + 1, y, name: nm, lit: !!LW });   // [case]")
# il pass nuovo, dopo la città (che ha già messo torrette, balconi e insegne)
rep("  function buildCity() {", frag + "  function buildCity() {")
rep("TT('citta', buildCity);", "TT('citta', buildCity); TT('case', buildCase);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
