# [fumetto2] le prove di leggibilità della bibbia (§7) sui bersagli: il personaggio contro la corona attorno, i riservati altrove. python3 leggibilita.py
import os, sys, json, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo import carica
from tavolozza import PALR, IDXR
H0 = os.path.dirname(os.path.abspath(__file__)); R = {}
def Y(a): a = np.where(a <= .04045, a / 12.92, ((a + .055) / 1.055) ** 2.4); return a @ np.array([.2126, .7152, .0722])
for f in sorted(os.listdir(os.path.join(H0, 'bersagli'))):
    n = f[:-4]; im = np.asarray(Image.open(os.path.join(H0, 'bersagli', f)).convert('RGB')).astype(float) / 255.
    c, d, kc, sub, meta = carica(n); g = meta['m'].get('gioc')
    if g is None or not g.any(): continue
    ys, xs = np.nonzero(g); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max(); h, w = y1 - y0, x1 - x0
    Yi = Y(im); inn = np.median(Yi[g]); box = np.zeros_like(g); box[max(0, y0 - h // 3):y1 + h // 3, max(0, x0 - w):x1 + w] = True; ring = box & ~g
    out = np.median(Yi[ring]); ver = np.all(np.abs(im - PALR[IDXR['vermiglio']]) < .02, -1)
    R[n] = dict(personaggio_su_corona=round(float((max(inn, out) + .05) / (min(inn, out) + .05)), 2), vermiglio_fuori=int((ver & ~box).sum()),
                bordo=round(float((Y(np.array([.949, .906, .812])) + .05) / (Y(np.array([.086, .071, .106])) + .05)), 1))
    print(n, R[n])
json.dump(R, open(os.path.join(H0, 'leggibilita.json'), 'w'), indent=1)
