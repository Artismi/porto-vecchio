# [unione7] Chiaro di luna. Dopo unione6.py. Guardia [unione7].
# Andrea, guardando gli scatti della build unita: «la notte non si vede niente». Fuori dai coni dei lampioni restava il nero
# (mare, banchine, vie senza luce). Resta notte, col coprifuoco e i lampioni che contano, ma la luna disegna tutto:
# luna e cielo più forti, la luna un po' più azzurra, esposizione notturna della macchina da presa di [amb2] più alta.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione7]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("moon.intensity = .25 + (1 - night) * .77 + night * .06;", "moon.intensity = .25 + (1 - night) * .77 + night * .2; /* [unione7] chiaro di luna */")
rep("hemi.intensity = .22 + (1 - night) * .3 - night * .06;", "hemi.intensity = .22 + (1 - night) * .3 + night * .02; /* [unione7] */")
rep("fillAmb.intensity = .12 + (1 - night) * .12 - night * .07;", "fillAmb.intensity = .12 + (1 - night) * .12 + night * .0; /* [unione7] */")
rep("moon.color.set(night > .5 ? '#7e8eb8'", "moon.color.set(night > .5 ? '#9aaed8' /* [unione7] */")
rep("A.expo * (.84 + night * .28)", "A.expo * (.84 + night * .5) /* [unione7] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
