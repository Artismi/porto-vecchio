# [fluido3] Il sistema sovrapposto: con lucido1 l'inchiostro di unione11 e quello di amb3 sono a peso zero (AMB.outline = 0,
# AMB.ink = 0), ma il loro codice girava lo stesso in ogni pixel: due giri di 8 letture di profondità (ognuna a 4 campioni),
# le letture del colore dei muri, i mattoni, il fogliame… circa 80 letture di texture per pixel moltiplicate per zero.
# Ora si saltano quando il peso è zero; resta l'oscuramento di profondità (fb11), che sta nello stesso blocco e cambia l'immagine.
# Immagine identica, molto meno lavoro per pixel (conta soprattutto sulle schede integrate). Dopo fluido2.py. Guardia [fluido3].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[fluido3]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("            for (int k = 0; k < 8; k++) { float a = float(k) * .7854; vec2 o = vec2(cos(a), sin(a)) * px * (k - k/2*2 == 0 ? 2. : 1.7);",
    "            if (aK2.z > .001) {   // [fluido3] l'inchiostro di unione11 solo se pesa qualcosa\n            for (int k = 0; k < 8; k++) { float a = float(k) * .7854; vec2 o = vec2(cos(a), sin(a)) * px * (k - k/2*2 == 0 ? 2. : 1.7);")
rep("            c = mix(c, inkC, clamp(ink * clamp(aK2.z * 3., 0., 1.), 0., 1.)); }",
    "            c = mix(c, inkC, clamp(ink * clamp(aK2.z * 3., 0., 1.), 0., 1.)); } }   /* [fluido3] */")
rep("            float la = dot(texture2D(tC, uv + vec2(px.x, 0.)).rgb, vec3(.3,.59,.11)), lb = dot(texture2D(tC, uv - vec2(px.x, 0.)).rgb, vec3(.3,.59,.11));",
    "            if (pK.z > .001) {   // [fluido3] l'inchiostro di amb3 solo se pesa qualcosa\n            float la = dot(texture2D(tC, uv + vec2(px.x, 0.)).rgb, vec3(.3,.59,.11)), lb = dot(texture2D(tC, uv - vec2(px.x, 0.)).rgb, vec3(.3,.59,.11));")
rep("            c = mix(c, c * vec3(.42,.4,.56), ge * pK.z * (1. - coc));",
    "            c = mix(c, c * vec3(.42,.4,.56), ge * pK.z * (1. - coc)); }   /* [fluido3] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
