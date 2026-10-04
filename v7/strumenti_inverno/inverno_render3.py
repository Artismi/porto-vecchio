# Terza parte [inverno]: paesaggio (Muro, Base, porto cargo, stazioni, beduini, bivacchi, fuochi) e leggibilità
# (meno grana, valori più bassi sul terreno, luce chiave più forte per dare volume). Uso: python3 inverno_render3.py render.js
import sys, os
p = sys.argv[1]; s = open(p).read(); here = os.path.dirname(os.path.abspath(sys.argv[0]))
def R(a, b):
    global s
    assert a in s, 'NON TROVATO: ' + a[:90]
    s = s.replace(a, b, 1)
R("  // ---------------- INIZIALIZZAZIONE ----------------", open(os.path.join(here, 'inverno_paesaggio.js')).read() + "\n  // ---------------- INIZIALIZZAZIONE ----------------")
R("TT('layout', buildLayout);", "TT('layout', buildLayout); TT('inverno', buildWinter);")
R("    if (window.Models) Models.tick(st, time, night);", "    if (window.Models) Models.tick(st, time, night);\n    tickWinter(time, night);")
# insegne lunghe (cirillico): il testo si stringe finché ci sta
R("""    const size = text.length > 10 ? 26 : 34;
    x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';""",
"""    let size = text.length > 10 ? 26 : 34;
    x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    while (size > 12 && x.measureText(text).width > 232) { size -= 2; x.font = `bold ${size}px "Pixelify Sans", "Trebuchet MS", sans-serif`; }""")
# leggibilità: luce chiave più forte (volume e ombre), cielo più debole, ambiente basso
R("hemi.intensity = .4 + (1 - night) * .42;", "hemi.intensity = .3 + (1 - night) * .3;")
R("fillAmb.intensity = .26 + (1 - night) * .14;", "fillAmb.intensity = .2 + (1 - night) * .06;")
R("moon.intensity = .35 + (1 - night) * .4;", "moon.intensity = .45 + (1 - night) * .85;")
# meno grana: dithering più fine, meno puntini nella neve, fiocchi più radi e più piccoli
R("c = floor(c*22. + bd + .5)/22.;", "c = floor(c*40. + bd*.6 + .5)/40.;")
R("c = mix(c, c*.3 + vec3(.04,.01,.07), ol*.85);", "c = mix(c, c*.55 + vec3(.02,.025,.04), ol*.42);")   # contorno più leggero: i modelli tengono la loro dignità
R("let TARGET = 420, lastSize = null;", "let TARGET = 540, lastSize = null;")   # pixel un po' più fini
R("vec2 q = vUv-.5; c *= 1. - dot(q,q)*.85;", "vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;")
# i bianchi non bruciano: compressione morbida delle luci alte (la neve resta leggibile, i neon restano accesi)
R("          float bd = bayer(floor(vUv*res)) - .5;", "          c = c*1.32/(1.+c*.5);\n          float bd = bayer(floor(vUv*res)) - .5;")
R("nOn = raining ? R.N : Math.floor(R.N * .45)", "nOn = raining ? Math.floor(R.N * .8) : Math.floor(R.N * .22)")
R("R.m.material.size = .14 + heavy * .06;", "R.m.material.size = .1 + heavy * .05; R.m.material.opacity = .55 + heavy * .25;")
open(p, 'w').write(s); print('inverno_render3: ok')

