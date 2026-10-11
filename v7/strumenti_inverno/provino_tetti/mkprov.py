# Provino dei tetti [ordine1]: estrae da render.js gli helper (rng, sm, fB, oAC, oAntenna...) e la sezione [ordine1],
# li mette in una pagina con una scena di case di prova (scena1.js) e la fotografa in ~5 s (il gioco intero ne vuole ~10 min).
# Uso, dalla cartella provino_tetti:  python3 mkprov.py && node shotprov.js prov foto.png "dist=150&tx=-4&tz=-6"
#   (dist, tx, tz, fov: inquadratura come nel gioco, yaw π/4 e pitch .78; px: grandezza del pixel)
import re, sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
RS = open(os.path.join(HERE, '..', '..', 'src', 'render.js'), encoding='utf-8').read()
R = RS.split('\n')
def lines(a, b): return '\n'.join(R[a-1:b])
def find(pat, start=0):
    for i, l in enumerate(R[start:], start):
        if re.search(pat, l): return i + 1
    raise Exception('non trovo ' + pat)
parts = []
parts.append(lines(16, 17))
parts.append(lines(find(r'^  const clamp ='), find(r'^  const sb = c =>')))
parts.append(R[find(r'^  const th = \(tx, ty, s\)') - 1])
a = find(r'^  const FA = \{ n: 0'); b = find(r'^  function oTree')
parts.append(lines(a, b - 1))
a0 = RS.index('  // ================= [ordine1] I TETTI VERI'); b0 = RS.index('\n', RS.index('  window.__rp1 = ', a0))
mod = RS[a0:b0] + '\n' + open(os.path.join(HERE, sys.argv[1] if len(sys.argv) > 1 else 'scena1.js')).read()
html = open(os.path.join(HERE, 'prov_tpl.html')).read().replace('/*HELPERS*/', '\n'.join(parts)).replace('/*MODULE*/', mod)
os.makedirs(os.path.join(HERE, 'prov'), exist_ok=True); import shutil; shutil.copy(os.path.join(HERE, '..', '..', 'src', 'three.min.js'), os.path.join(HERE, 'prov', 'three.min.js'))
open(os.path.join(HERE, 'prov', 'index.html'), 'w').write(html)
print('ok', len(html))
