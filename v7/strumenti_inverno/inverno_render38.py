# [isola38] Il marciapiede vero (isola_render6.js): in città non si sfuma più, è la fascia 0-2,1 m dal bordo strada ritagliata con
# una curva di livello liscia, alta 15 cm, col cordolo dritto; via la fascia grigio chiara sotto. Il verde nelle crepe lungo
# cordoli e muri, più alberi e cespugli in città, gli incroci con paletti, tombini e caditoie. Dopo inverno_render37.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola38]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render6.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
# swField: in città il campo di distanza (S38: dentro > 0) invece della maschera sfocata
a = s.index("  function swField() {"); b = s.index("  // altezza del marciapiede sopra il terreno in (x, z)", a); F = s[a:b]
def frep(old, new):
    global F
    assert F.count(old) == 1, old[:80]; F = F.replace(old, new)
frep("let m = new Float32Array(NW * NH), any = 0;", "let m = new Float32Array(NW * NH), any = 0; const S38 = new Float32Array(NW * NH).fill(-9), D38 = new Float32Array(NW * NH).fill(9), C38 = new Uint8Array(NW * NH);   // [isola38]")
frep("    if (!any) return null;\n", "")
frep("if (zoneT(tx, tz) !== ZN.CITTA) continue; if (DM[kk] > 1e8) { m[kk] = 0; continue; } const d = DM[kk], h0 = HW[kk]; m[kk] = d > h0 + .05 && d < h0 + 2.1 ? 1 : 0; }",
     "if (zoneT(tx, tz) !== ZN.CITTA) continue; C38[kk] = 1; m[kk] = 0; if (DM[kk] > 1e8) continue; const d = DM[kk], h0 = HW[kk]; D38[kk] = d - h0; S38[kk] = Math.min(d - h0 - .02, h0 + 2.1 - d); }")
H0 = next((h for h in ("for (let k = 0; k < m.length; k++) H[k] = .15 * sstep(.36, .64, m[k]);",
                       "for (let k = 0; k < m.length; k++) H[k] = .16 * sstep(.43, .57, m[k]);") if F.count(h) == 1), None)   # la seconda: dopo [strade1] (cordolo più netto fuori città)
assert H0, 'altezza del marciapiede in swField'
frep(H0, H0 + " const Hn = H.slice(); for (let k = 0; k < m.length; k++) if (C38[k]) H[k] = .15 * Math.max(0, Math.min(1, S38[k] / .2 + .5));")
frep("const area0 = m.reduce((a, b) => a + b, 0);", "const area0 = m.reduce((a, b) => a + b, 0) || 1;")
frep("return (SWF35 = { R, NW, NH, H, m });", "return (SWF35 = { R, NW, NH, H, m, Hn, S38, D38, C38 });")
s = s[:a] + F + s[b:]
rep("    const F35 = swField(); if (!F35) return 0; const { R, NW, NH, H, m } = F35;   // [isola35]",
    "    const F35 = swField(); if (!F35) return 0; const { R, NW, NH, m } = F35, H = F35.Hn; const n38 = marciapiedi38(F35);   // [isola35] [isola38] in città il marciapiede vero")
# la fascia grigia sotto il marciapiede: stretta e scura (era la «terra grigio bianca»)
rep("pass(rd => strd(rd) && urb(rd), rd => rd.w + 6.4, () => '#5e5a54');", "pass(rd => strd(rd) && urb(rd), rd => rd.w + 4.8, () => '#3a3632');   // [isola38]")
# il verde: crepe, più alberi, più cespugli, il ciottolato che si riempie d'erba
rep("    if (ZN.CITTA !== undefined) verdeCitta35(add, tx0, ty0, n, m);   // [isola35]", "    if (ZN.CITTA !== undefined) { verdeCitta35(add, tx0, ty0, n, m); erbaCrepe38(add, tx0, ty0, n, m); }   // [isola35] [isola38]")
rep("if (th(Math.round(x), Math.round(z), 353) < .3) return;", "if (th(Math.round(x), Math.round(z), 353) < .12) return;")
rep("acc = 0; next = 9 + th(ri, k, 352) * 7;", "acc = 0; next = 6 + th(ri, k, 352) * 6;")
rep("if (th(tx, ty, 355) > (v === T.PIAZZA ? .04 : .022)) continue;", "if (th(tx, ty, 355) > (v === T.PIAZZA ? .05 : .07)) continue;")
rep("TREES35.some(t => Math.hypot(t.x - x, t.z - z) < 7)", "TREES35.some(t => Math.hypot(t.x - x, t.z - z) < 4.5)")
rep("TREES35.push({ x, z, kind: 'viale', s: .3 + th(Math.round(x), Math.round(z), 354) * .08 }); });", "TREES35.push({ x, z, kind: 'viale', s: .36 + th(Math.round(x), Math.round(z), 354) * .14 }); });")
rep("TREES35.push({ x, z, kind: v === T.PIAZZA ? 'piazza' : 'cortile', s: .34 + th(tx, ty, 356) * .1 });", "TREES35.push({ x, z, kind: v === T.PIAZZA ? 'piazza' : 'cortile', s: .42 + th(tx, ty, 356) * .2 });")
rep("if (r() > (v === T.WALK ? .3 : .55)) return;", "if (r() > (v === T.WALK ? .55 : .85)) return;")
rep("if (v === T.GRASS) { const k = 1 + Math.floor(r() * 3);", "if (v === T.GRASS) { const k = 2 + Math.floor(r() * 4);")
rep("else if (v === T.DIRT && r() < .4)", "else if (v === T.DIRT && r() < .75)")
rep("else if (v === T.COB && !walls.length && r() < .18)", "else if (v === T.COB && r() < .5)")
rep("(k1 > .22 ? 'cemento' : k1 > -.25 ? 'ciottoli' : 'terra')", "(k1 > .3 ? 'cemento' : k1 > -.12 ? 'ciottoli' : k2 > .15 ? 'terra' : 'erba')")
rep("TT('oggetti35', oggetti35);", "TT('oggetti35', oggetti35); TT('incroci38', incroci38);")
# il riflesso del cielo sul suolo: era fortissimo e schiariva l'asfalto scuro in un grigio azzurro («la terra grigio bianca»)
rep("envMap: wetEnv(), envMapIntensity: .55,", "envMap: wetEnv(), envMapIntensity: .12,   /* [isola38] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
