# [unione2] Ordine nella città (Andrea sulla piazza della build unita: «un'accozzaglia di roba incomprensibile», «le pavimentazioni
# che si mischiano sono brutte», «il lavoro sulle strade dov'è finito»). Guardia [unione2]. Dopo unione1.py.
# Confronto a immagini (piazza alle 14): il ramo delle strade da solo e l'unione prima di [isola38] erano puliti; dopo [isola38]
# ciuffi gialli sparsi su tutta la pavimentazione. Si tiene di [isola38] il marciapiede col cordolo, gli incroci e l'erba lungo
# cordoli e muri (erbaCrepe38, che è ordinata); si tolgono le densità alzate a caso:
#  - erbacce ai piedi dei muri e nei cortili tornano come in [isola35]; sui sampietrini aperti quasi niente (prima 50%);
#  - il suolo della città non mescola più l'erba e cambia a chiazze grandi, non ogni mezzo metro (via il rumore fine).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione2]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("if (r() > (v === T.WALK ? .55 : .85)) return;", "if (r() > (v === T.WALK ? .3 : .55)) return; /* [unione2] */")
rep("if (v === T.GRASS) { const k = 2 + Math.floor(r() * 4);", "if (v === T.GRASS) { const k = 1 + Math.floor(r() * 3); /* [unione2] */")
rep("else if (v === T.DIRT && r() < .75)", "else if (v === T.DIRT && r() < .4 /* [unione2] */)")
rep("else if (v === T.COB && r() < .5)", "else if (v === T.COB && !walls.length && r() < .17 /* [unione2] un ciuffo ogni sei caselle circa */)")
rep("(k1 > .3 ? 'cemento' : k1 > -.12 ? 'ciottoli' : k2 > .15 ? 'terra' : 'erba')", "(k1 > .3 ? 'cemento' : k1 > -.3 ? 'ciottoli' : 'terra') /* [unione2] niente erba nel selciato */")
rep("k1 = vnz(X / 11, Y / 11) + vnz(X / 3.2, Y / 3.2) * .45", "k1 = vnz(X / 14, Y / 14) + vnz(X / 3.2, Y / 3.2) * .08 /* [unione2] chiazze grandi */")
# notte: la luna disegna le sagome anche in piazza (Andrea: «è scurissimo»), il cielo un filo più presente
rep("moon.intensity = .25 + (1 - night) * .77 - night * .02;", "moon.intensity = .25 + (1 - night) * .77 + night * .06; /* [unione2] */")
rep("hemi.intensity = .22 + (1 - night) * .3 - night * .10;", "hemi.intensity = .22 + (1 - night) * .3 - night * .06; /* [unione2] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
