# [strade1] Revisione delle strade (frammento strade_revisione.js): segnaletica orizzontale consumata, sampietrini e asfalto
# consumato, buche, caditoie e tombini, scivoli alle strisce, semafori, cartelli, paletti, frecce in curva, guardrail a doppia
# onda con le testate, ringhiere in città sul mare, cantieri con rete e barriere, new jersey ai posti di blocco.
# Si applica in fondo alla catena (dopo case_render1.py); ha la guardia «già applicato».
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[strade1]' in s: print('già applicato'); sys.exit()
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
# 4) guardrail di [isola31]: lama a doppia onda (due costole) e testate che scendono a terra
rep("bar.rotation.set(bent ? .35 : 0, Math.atan2(-(q2.z - q.z), q2.x - q.x), Math.atan2(y2 - y, L)); g.add(bar); }",
    "bar.rotation.set(bent ? .35 : 0, Math.atan2(-(q2.z - q.z), q2.x - q.x), Math.atan2(y2 - y, L)); g.add(bar);\n"
    "              [.1, -.1].forEach(dy => { const rb = box(L + .06, .08, .05, bm); rb.position.copy(bar.position); rb.position.x -= nx * .045; rb.position.z -= nz * .045; rb.position.y += dy; rb.rotation.copy(bar.rotation); g.add(rb); });   // [strade1] doppia onda\n"
    "              const sp = box(.14, .16, .14, post); sp.position.set(q.x - nx * .05, y + .62, q.z - nz * .05); g.add(sp); }")
rep("          addStatic(g); n++; run = [];\n",
    "          if (!parapet) [[0, 1], [run.length - 1, run.length - 2]].forEach(([a, b]) => { const qa = run[a], qb = run[b], dx = qa.x - qb.x, dz = qa.z - qb.z, L0 = Math.hypot(dx, dz) || 1, ex = qa.x + dx / L0 * 1.6, ez = qa.z + dz / L0 * 1.6, ya = groundH(qa.x, qa.z) + .62, ye = groundH(ex, ez) + .12, L = Math.hypot(ex - qa.x, ez - qa.z);\n"
    "            const tb = box(L, .3, .06, rail); tb.position.set((qa.x + ex) / 2, (ya + ye) / 2, (qa.z + ez) / 2); tb.rotation.set(0, Math.atan2(-(ez - qa.z), ex - qa.x), Math.atan2(ye - ya, L)); g.add(tb); });   // [strade1] testate interrate\n"
    "          addStatic(g); n++; run = [];\n")
# 5) gli oggetti, dopo pulizia e oggetti di [isola35] (così non vengono tolti); i semafori nel fotogramma
rep("TT('oggetti35', oggetti35);", "TT('oggetti35', oggetti35); TT('strade1', buildStrade1); TT('vita1', buildVita1);")
rep("    tickWinter(time, night);\n", "    tickWinter(time, night);\n    tickStrade1(time, night);   // [strade1] semafori e lampade dei cantieri\n")
# 6) cordolo netto come nei riferimenti: gradino più deciso, pietra chiara in cima, canaletta scura
rep("H[k] = .15 * sstep(.36, .64, m[k]);", "H[k] = .16 * sstep(.43, .57, m[k]);   /* [strade1] cordolo più netto */")
rep("c.lerp(_c35.set('#a49e92'), curb * .8);", "c.lerp(_c35.set('#c4beb0'), Math.min(1, curb * 1.1));   /* [strade1] pietra chiara */")
rep("if (top < .5) c.lerp(_d35.set('#3a3734'), (1 - top * 2) * .9);", "if (top < .5) c.lerp(_d35.set('#242220'), (1 - top * 2) * .95);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
