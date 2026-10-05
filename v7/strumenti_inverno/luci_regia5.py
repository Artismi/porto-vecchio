# [luci 5] Il buio da cui le luci difendono. Ombre nette.
# Di notte fra le luci deve esserci buio vero, non un grigio-azzurro: via il cielo, la luna, le luci di riempimento,
# il sollevamento dei neri nel post, la nebbia grigia che velava tutto. Le luci restano com'erano: il contrasto lo fa il buio.
# Faretti con bordo più deciso e mappe d'ombra a 1024: ombre nette a terra e nella nebbia.
# Dopo luci_regia4.py. Commenti solo /* */ a fine riga (un // si mangerebbe il codice che segue).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci5]' in s: print('già applicato'); sys.exit()
assert '[luci4]' in s, 'prima luci_regia4.py'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

# --- luci d'ambiente di notte quasi a zero ---
rep("hemi.intensity = .22 + (1 - night) * .3 - night * .03;", "hemi.intensity = .22 + (1 - night) * .3 - night * .14; /* [luci5] buio */")
rep("moon.intensity = .25 + (1 - night) * .77;", "moon.intensity = .25 + (1 - night) * .77 - night * .11; /* [luci5] un filo di luna per le sagome */")
rep("fillAmb.intensity = .12 + (1 - night) * .12;", "fillAmb.intensity = .12 + (1 - night) * .12 - night * .1; /* [luci5] */")
rep("dyn.fill.intensity = .12 + (1 - night) * .06;", "dyn.fill.intensity = .12 + (1 - night) * .06 - night * .1; /* [luci5] */")
rep("dyn.rim.intensity = .1 + (1 - night) * .1;", "dyn.rim.intensity = .1 + (1 - night) * .1 - night * .07; /* [luci5] */")
# la nebbia verde-acqua di notte non schiarisce il fondo
rep("tmpC.lerp(FOGTEAL, .22 + night * .12);", "tmpC.lerp(FOGTEAL, .22 - night * .16).multiplyScalar(1 - night * .45); /* [luci5] il fondo di notte è nero */")
# veli di nebbia: di notte non stendono grigio sul buio
rep("U.amt.value = .22 + night * .1 - k * .06;", "U.amt.value = .22 - night * .15 - k * .06; /* [luci5] */")
rep("U.base.value.copy(scene.fog.color).multiplyScalar(.55 + (1 - night) * .6);", "U.base.value.copy(scene.fog.color).multiplyScalar(.55 + (1 - night) * .6 - night * .45); /* [luci5] */")

# --- post: neri veri di notte ---
rep("""          { float far01 = smoothstep(dc*1.02, dc*1.7, d); vec3 hz = mix(vec3(.50,.52,.54), vec3(.075,.085,.09), night);
            c = mix(c, hz + c*.35, far01 * (.42 + night*.1)); }""",
"""          { float far01 = smoothstep(dc*1.02, dc*1.7, d); vec3 hz = mix(vec3(.50,.52,.54), vec3(.02,.022,.026), night);
            c = mix(c, hz + c*.35, far01 * (.42 - night*.2)); }   /* [luci5] di notte la lontananza sprofonda nel buio, non si vela */""")
rep("          c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9*(1.-warmL*.75));",
    "          c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6*(1.-night*.9), (1.-smoothstep(.0,.62,l))*.9*(1.-warmL*.75));   /* [luci5] le ombre non si alzano verso il verde-acqua */")
rep("          c += vec3(.012,.014,.02);", "          c += vec3(.012,.014,.02)*(1.-night*.9);\n          c = max(c - .022*night*(1.-smoothstep(.0,.3,dot(c, vec3(.3,.59,.11)))), 0.);   /* [luci5] il buio: piede della curva schiacciato */")
# nebbia con le ombre: meno lattiginosa
rep("c += vol * vOn * .36; }", "c += vol * vOn * .24; }")

# --- ombre nette ---
rep("const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.2, .95, 1.25);", "const l = new THREE.SpotLight('#ffb35c', 0, 10, 1.2, .4, 1.25); /* [luci5] bordo deciso */")
rep("l.shadow.mapSize.set(512, 512);", "l.shadow.mapSize.set(1024, 1024); l.shadow.radius = 1; /* [luci5] ombre nette */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
