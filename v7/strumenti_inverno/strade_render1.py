# [strade1] Revisione delle strade (frammento strade_revisione.js): segnaletica orizzontale consumata, sampietrini e asfalto
# consumato, buche, caditoie e tombini, scivoli alle strisce, semafori, cartelli, paletti, frecce in curva, guardrail a doppia
# onda con le testate, ringhiere in città sul mare, cantieri con rete e barriere, new jersey ai posti di blocco.
# Si applica in fondo alla catena (dopo case_render1.py); ha la guardia «già applicato».
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[strade1]' in s: print('già applicato'); sys.exit()
assert 'function fB(' in s and 'const FA = ' in s, "serve l'officina delle forme: applicare prima case_render1.py"
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'strade_revisione.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# 1) il frammento, prima della sezione della città di [isola35]
rep("  // ================= [isola35] LA CITTÀ: SUOLO LEGGIBILE", frag + "\n  // ================= [isola35] LA CITTÀ: SUOLO LEGGIBILE")
# 2) pittura: sampietrini, toppe, caditoie, tombini prima delle linee; buche e scavi dopo le strisce
rep("smoothRoads(x, tx0, ty0, n, m); roadMarks(x, tx0, ty0, n, m); strisce35(x, tx0, ty0, n, m);",
    "smoothRoads(x, tx0, ty0, n, m); surf1(x, tx0, ty0, n, m); roadMarks(x, tx0, ty0, n, m); strisce35(x, tx0, ty0, n, m); holes1(x, tx0, ty0, n, m);")
rep("  function roadMarks(x, tx0, ty0, n, m) {\n", "  function roadMarks(x, tx0, ty0, n, m) {\n    return marks1(x, tx0, ty0, n, m);   // [strade1] la segnaletica nuova\n")
# 3) scivoli dei marciapiedi davanti alle strisce (quota e colore)
rep("    return (SWF35 = { R, NW, NH, H, m });", "    scivoli1(H, R, NW, NH);   // [strade1]\n    return (SWF35 = { R, NW, NH, H, m });")
rep("colMarc35(c, top, n1, n2);   // [isola35] lastre, cordolo chiaro, canaletta scura", "colMarc35(c, top, n1, n2); scivoloCol1(c, k);   // [isola35] lastre, cordolo chiaro, canaletta scura [strade1] scivoli")
# 4) guardrail: il codice di [isola31] consegna i tratti a GR1 (una riga), il modello lo costruisce buildGuardrail1
rep("          const g = new THREE.Group(), damaged = r() < .35, rustAll = r() < .4, parapet = run.some(q => q.wall);\n",
    "          const g = new THREE.Group(), damaged = r() < .35, rustAll = r() < .4, parapet = run.some(q => q.wall);\n          if (!parapet) { GR1.push(run.slice()); run = []; return; }   // [strade1] il guardrail lo costruisce buildGuardrail1\n")
# 5) gli oggetti, dopo pulizia e oggetti di [isola35] (così non vengono tolti); i semafori nel fotogramma
rep("TT('oggetti35', oggetti35);", "TT('oggetti35', oggetti35); TT('strade1', buildStrade1); TT('vita1', buildVita1);")
rep("    tickWinter(time, night);\n", "    tickWinter(time, night);\n    tickStrade1(time, night);   // [strade1] semafori e lampade dei cantieri\n")
# 6) cordolo netto come nei riferimenti: gradino più deciso, pietra chiara in cima, canaletta scura
rep("H[k] = .15 * sstep(.36, .64, m[k]);", "H[k] = .16 * sstep(.43, .57, m[k]);   /* [strade1] cordolo più netto */")
rep("c.lerp(_c35.set('#a49e92'), curb * .8);", "c.lerp(_c35.set('#c4beb0'), Math.min(1, curb * 1.1));   /* [strade1] pietra chiara */")
rep("if (top < .5) c.lerp(_d35.set('#3a3734'), (1 - top * 2) * .9);", "if (top < .5) c.lerp(_d35.set('#242220'), (1 - top * 2) * .95);")
# 7) sentieri e ciottolati fuori città senza gradini: la casella si dipinge come il terreno attorno, poi la forma continua
rep("      const px = i * P, py = j * P, z = zoneT(tx, ty), r = rng((tx * 7919 + ty * 104729) >>> 0);\n",
    "      const px = i * P, py = j * P, z = zoneT(tx, ty), r = rng((tx * 7919 + ty * 104729) >>> 0);\n      if (blobTile1(tx, ty)) v = natural1(tx, ty);   // [strade1] la forma la stende blobs1\n")
rep("paintTiles(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);", "paintTiles(x, tx0, ty0, n, m); blobs1(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);")
# 8) bosco: radure come campo continuo; tagli e muri dipinti come forma continua
rep("const open = v === T.GRASS || (v === T.SHRUB && k2 > .05);", "const open = open1(X, Y, k1);   /* [strade1] niente rombi per casella */")
a = s.index("    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {\n      const tx = tx0 + i, ty = ty0 + j, f = F[ty * G.GW + tx]; if (!(f & (1024 | 16384))) continue;")
b = s.index("\n    }\n", a) + len("\n    }\n")
assert 'x.ellipse(i * P + P / 2' in s[a:b]
s = s[:a] + "    opere1(x, tx0, ty0, n, m, F, cut, wall);   // [strade1] forma continua, non un disco per casella\n" + s[b:]
# 9) continuità: terreno naturale a mezzo metro fuori dal bosco, sterrate consumate, usura dell'asfalto, vicoli lucidati al centro
rep("      if (bosco36(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [isola36]\n", "      if (bosco36(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [isola36]\n      if (natSub1(x, px, py, P, tx, ty, r, v, z)) continue;   // [strade1] niente quadrati di colore\n")
rep("    pass(dirt, rd => rd.w + 1.2, () => 'rgba(110,84,58,.55)');\n    pass(dirt, rd => rd.w, () => '#8a6a4a');\n    pass(dirt, rd => 1.1, () => 'rgba(150,120,86,.6)');\n", "    sterrato1(x, tx0, ty0, n, m);   // [strade1] sterrate e sentieri consumati dal passaggio\n")
rep("    pass(vic, rd => .3, () => 'rgba(22,20,20,.5)');\n", "    pass(vic, rd => .3, () => 'rgba(22,20,20,.5)');\n    pass(vic, rd => rd.w * .45, () => 'rgba(150,140,128,.1)');   // [strade1] il centro lucidato dai passi\n")
rep("smoothRoads(x, tx0, ty0, n, m); surf1(x, tx0, ty0, n, m);", "smoothRoads(x, tx0, ty0, n, m); usura1(x, tx0, ty0, n, m); surf1(x, tx0, ty0, n, m);")
# 10) raccordi, cunette, olio (pittura) e segnavia, ometti, cippi (oggetti)
rep("strisce35(x, tx0, ty0, n, m); holes1(x, tx0, ty0, n, m);", "strisce35(x, tx0, ty0, n, m); raccordi1(x, tx0, ty0, n, m); holes1(x, tx0, ty0, n, m);")
rep("TT('vita1', buildVita1);", "TT('vita1', buildVita1); TT('segnavia1', buildSegnavia1);")
# 11) svolte raccordate, scalinate, impalcature, telecamere, paletti, orti
rep("smoothRoads(x, tx0, ty0, n, m); usura1(x, tx0, ty0, n, m);", "smoothRoads(x, tx0, ty0, n, m); svolte1(x, tx0, ty0, n, m); usura1(x, tx0, ty0, n, m);")
rep("TT('segnavia1', buildSegnavia1);", "TT('segnavia1', buildSegnavia1); TT('urbano1', buildUrbano1);")
rep("    tickStrade1(time, night);   // [strade1] semafori e lampade dei cantieri\n", "    tickStrade1(time, night);   // [strade1] semafori e lampade dei cantieri\n    tickUrbano1(time, night);\n")
# 12) materiali premium: motivi da 32 m allineati al mondo per asfalto, piazza, banchina, sabbia, roccia; strato d'insieme sopra tutto il suolo
rep("    const c = patCanvas35(kind), p = x.createPattern(c, 'repeat'), sc = 16 * PPM / c.width;\n    try { p.setTransform(new DOMMatrix([sc, 0, 0, sc, -((X0 * PPM) % (16 * PPM)), -((Y0 * PPM) % (16 * PPM))])); } catch (e) {}",
    "    if (kind === 'asfalto') return wpat1(x, 'asfalto', X0, Y0);   // [strade1] asfalto premium da 32 m\n    const c = patCanvas35(kind), p = x.createPattern(c, 'repeat'), sc = 16 * PPM / c.width;\n    try { p.setTransform(new DOMMatrix([sc, 0, 0, sc, -((X0 * PPM) % (16 * PPM)), -((Y0 * PPM) % (16 * PPM))])); } catch (e) {}")
rep("      if (natSub1(x, px, py, P, tx, ty, r, v, z)) continue;   // [strade1] niente quadrati di colore\n", "      if (natSub1(x, px, py, P, tx, ty, r, v, z)) continue;   // [strade1] niente quadrati di colore\n      if (texTile1(x, px, py, P, tx, ty, v, z, tx0, ty0)) continue;   // [strade1] piazza, banchina, sabbia, roccia a motivo continuo\n")
rep("sporco35(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);", "sporco35(x, tx0, ty0, n, m); macro1(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);")
# 13) sabbia e piazze come forme continue
rep("      if (blobTile1(tx, ty)) v = natural1(tx, ty);   // [strade1] la forma la stende blobs1\n", "      if (blobTile1(tx, ty)) v = natural1(tx, ty);   // [strade1] la forma la stende blobs1\n      if (BTX1(v)) v = btxUnder1(tx, ty, z);   // [strade1] sabbia e piazza le stende blobTex1\n")
rep("blobs1(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);", "blobs1(x, tx0, ty0, n, m); blobTex1(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);")
# 14) fontana della piazza curata; guardrail nuovo
rep("if (c) buildFountain(fx / c, fz / c);", "if (c) buildFountain1(fx / c, fz / c);   /* [strade1] */")
rep("TT('urbano1', buildUrbano1);", "TT('urbano1', buildUrbano1); TT('guardrail1', buildGuardrail1);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
