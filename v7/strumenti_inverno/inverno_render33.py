# [isola33] Il bosco vivo: le chiome del kit naturale prendono più luce (colore più chiaro e un filo di luce propria dalla loro texture),
# così il sottobosco e le chiome si leggono anche all'ombra e col cielo d'inverno. Dopo inverno_render32.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola33]' in s: print('già applicato'); sys.exit()
old = "    const m = new THREE.MeshLambertMaterial({ map, color: tint || '#ffffff', alphaTest: leafy ? .5 : 0, side: leafy ? THREE.DoubleSide : THREE.FrontSide });"
assert s.count(old) == 1
s = s.replace(old, old + "\n    if (leafy) { m.color.multiplyScalar(1.4); m.emissive = new THREE.Color('#2e4228'); m.emissiveMap = map; m.emissiveIntensity = .55; } else m.color.multiplyScalar(1.15);   // [isola33] il bosco vivo")
open(p, 'w', encoding='utf-8').write(s); print('ok')
