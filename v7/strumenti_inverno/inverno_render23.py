# [inverno 23] Luci e atmosfera. Dopo inverno_render22.
# Le luci artificiali bruciavano l'ambiente: accese al 55% anche di giorno, aloni additivi a terra che sbiancavano i pavimenti,
# quattro luci di riempimento che appiattivano tutto e cancellavano le ombre.
# Ora: di giorno cielo coperto con un sole basso che disegna ombre nette; di notte buio vero e pozze di luce calda raccolte.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno23]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
# luci dei lampioni e delle insegne: spente di giorno, più deboli e raccolte di notte
rep("let k = L.always ? .55 + night * .45 : night;", "let k = L.always ? .06 + night * .94 : night * night;   // [inverno23] di giorno quasi spente")
rep("l.intensity = L.base * k * fadeD;", "l.intensity = L.base * k * fadeD * .62;")
# aloni a terra: non sbiancano più il pavimento
rep("(d.always ? .25 + night * .3 : night * .2)", "(d.always ? .02 + night * .12 : night * .08)")
# riempimento: meno luce che arriva da tutte le parti, così le ombre restano
rep("hemi.intensity = .26 + (1 - night) * .16;", "hemi.intensity = .22 + (1 - night) * .3;   // [inverno23]")
rep("fillAmb.intensity = .2 + (1 - night) * .06;", "fillAmb.intensity = .12 + (1 - night) * .12;")
rep("moon.intensity = .42 + (1 - night) * .5;", "moon.intensity = .3 + (1 - night) * .72;")
rep("dyn.fill.intensity = .38 + (1 - night) * .12;", "dyn.fill.intensity = .12 + (1 - night) * .06;")
rep("dyn.rim.intensity = .25 + (1 - night) * .25;", "dyn.rim.intensity = .1 + (1 - night) * .1;")
# finestre e insegne non brillano a mezzogiorno
rep("if (m.emissiveMap) m.emissiveIntensity = .15 + night * 1.0;", "if (m.emissiveMap) m.emissiveIntensity = .04 + night * .85;")
open(p, 'w', encoding='utf-8').write(s); print('ok')
