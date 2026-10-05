# [unione4] Il sole vero. Dopo unione3.py. Guardia [unione4].
# Il sole di [amb1] girava da est a ovest ma sempre a NORD (z negativo), e la camera guarda da sud-est: le facciate che si vedono
# (sud ed est) erano in controluce quasi tutto il giorno, e murali, manifesti, insegne e intonaci restavano scuri (la sessione
# [muri1] l'aveva notato). A queste latitudini a mezzogiorno il sole è a SUD: mattina a est, mezzogiorno a sud, sera a ovest,
# basso al mattino e alla sera come in [amb1]. Il disco nel cielo e lo scintillio sul mare seguono la stessa luce (prima il cielo
# aveva un sole suo, sempre a ovest).
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione4]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("moon.position.set(cam.x - Math.sin(sa) * 38 - 8, el, cam.y - 26 - Math.cos(sa) * 8);",
    "moon.position.set(cam.x - Math.sin(sa) * 38 - 8, el, night > .5 ? cam.y - 26 - Math.cos(sa) * 8 : cam.y + 22 + Math.cos(sa) * 10);   /* [unione4] di giorno il sole è a sud */")
i = s.index("U.sun.value.set(-Math.cos(sunA * .5) * .9 - .2"); j = s.index(".normalize();", i) + len(".normalize();")
s = s[:i] + "U.sun.value.copy(moon.position).sub(moon.target.position).normalize();   /* [unione4] lo stesso sole della luce */" + s[j:]
open(p, 'w', encoding='utf-8').write(s); print('ok')
