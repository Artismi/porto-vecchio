# [unione9] Schermo bianco (Andrea: «è tutto bianco», di giorno col sereno; prima, di notte, «non si vede niente»).
# La prospettiva aerea di [amb1] e l'aria di [luci2] prendono come distanza di riferimento la profondità del pixel al centro
# dello schermo (dc). Se al centro c'è qualcosa vicinissimo alla camera (la tettoia o il pergolato sopra il personaggio, un tetto,
# una chioma) dc diventa piccolissima e tutta la scena viene sbiancata nel colore del cielo: bianco di giorno, nero di notte.
# Ora dc non scende mai sotto la distanza fra la camera e il personaggio. Dopo unione8.py. Guardia [unione9].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione9]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("uniforms: { tC: { value: null }, tD: { value: null },", "uniforms: { uFoc9: { value: 30 }, tC: { value: null }, tD: { value: null },   /* [unione9] */")
rep("uniform sampler2D tC; uniform sampler2D tD;", "uniform float uFoc9; uniform sampler2D tC; uniform sampler2D tD;")
rep("float dc = lin(texture2D(tD, vec2(.5)).r);", "float dc = max(lin(texture2D(tD, vec2(.5)).r), uFoc9 * .92);   /* [unione9] mai più vicino del personaggio */")
rep("U.uHz.value.copy(scene.fog.color);   /* [amb1] */", "U.uHz.value.copy(scene.fog.color);   /* [amb1] */ U.uFoc9.value = camera.position.distanceTo(V3.set(cam.x, groundH(cam.x, cam.y), cam.y));   /* [unione9] */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
