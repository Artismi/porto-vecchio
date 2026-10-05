# [isola37] La luce che si legge: la notte d'inverno è di luna (si vede la strada, il bosco ha forma), il giorno non slava
# il suolo piatto in un grigio da neve sporca, le ombre non sono più schiacciate e azzurrate (il bosco non è nero).
# Tocca solo il frame (hemi, fill, moon) e il post (ombre, saturazione, contrasto). Dopo inverno_render36.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola37]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# il frame: più luna di notte, meno cielo bianco di giorno, il sole appena caldo
rep("hemi.intensity = .22 + (1 - night) * .3 + night * .08;", "hemi.intensity = .26 + (1 - night) * .16 + night * .3;   /* [isola37] notte di luna, giorno meno slavato */")
rep("fillAmb.intensity = .12 + (1 - night) * .12; fillAmb.color.set(night > .5 ? '#2a3044' : '#6a6e78');", "fillAmb.intensity = .16 + (1 - night) * .1 + night * .14; fillAmb.color.set(night > .5 ? '#3a4460' : '#6e6a64');   /* [isola37] */")
rep("moon.intensity = .34 + (1 - night) * .68; moon.color.set(night > .5 ? '#7e8eb8' : (dusk > .3 ? '#e0a888' : '#f2eee4'));", "moon.intensity = .55 + (1 - night) * .55; moon.color.set(night > .5 ? '#9aaad0' : (dusk > .3 ? '#e8b088' : '#f4e8d2'));   /* [isola37] */")
# il post: le ombre non si schiacciano (il bosco ha forma), meno grigio di caserma sul suolo al sole, contrasto più morbido
rep("c = mix(c, c*.7*vec3(.78,1.,1.04) + vec3(.01,.075,.085)*.6, (1.-smoothstep(.0,.62,l))*.9);", "c = mix(c, c*.86*vec3(.9,1.,1.02) + vec3(.012,.03,.035)*.6, (1.-smoothstep(.0,.62,l))*.55);   // [isola37] ombre meno schiacciate e meno azzurre")
rep("c = (c-.5)*1.24+.5;", "c = (c-.5)*1.12+.5;   // [isola37]")
rep("float REG_SAT = .62, REG_BIANCO = .1;", "float REG_SAT = .8, REG_BIANCO = .16;   // [isola37] colori che si leggono, niente suolo bianco")
open(p, 'w', encoding='utf-8').write(s); print('ok')
