#!/usr/bin/env python3
# [profondita2] Le misure dei fogli della profondità (foto della sonda, alla risoluzione della tela):
#   python3 strumenti/misura_profondita.py prima.png dopo.png [--crop=x,y,w,h]
# rumore: l'energia ad alta frequenza (media |laplaciano| della luminanza, 0-255) nel riquadro, il grano e le corruzioni;
# aria: luminanza, contrasto (dev. std) e saturazione della fascia alta del quadro (il lontano) contro la fascia bassa (il vicino);
# contrasto globale e separazione dei bordi (la quota dei pixel con un salto di luminanza > 24 fra vicini a 2 px).
import sys
import numpy as np
from PIL import Image
arg = {}; files = []
for a in sys.argv[1:]:
    if a.startswith('--'): k, _, v = a[2:].partition('='); arg[k] = v
    else: files.append(a)
def lum(a): return .2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]
def sat(a):
    mx = a.max(-1); mn = a.min(-1); return np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
for f in files:
    a = np.asarray(Image.open(f).convert('RGB')).astype(float)
    L = lum(a); H = L.shape[0]
    out = {}
    if 'crop' in arg:
        x, y, w, h = map(int, arg['crop'].split(',')); c = L[y:y + h, x:x + w]
        lap = np.abs(4 * c[1:-1, 1:-1] - c[:-2, 1:-1] - c[2:, 1:-1] - c[1:-1, :-2] - c[1:-1, 2:])
        out['rumore'] = round(float(lap.mean()), 2)
    top, bot = slice(0, H // 5), slice(H - H // 5, H)
    S = sat(a / 255.)
    out['alto_L'] = round(float(L[top].mean() / 255), 3); out['basso_L'] = round(float(L[bot].mean() / 255), 3)
    out['alto_contr'] = round(float(L[top].std() / 255), 3); out['basso_contr'] = round(float(L[bot].std() / 255), 3)
    out['alto_sat'] = round(float(S[top].mean()), 3); out['basso_sat'] = round(float(S[bot].mean()), 3)
    out['contrasto'] = round(float(L.std() / 255), 3)
    out['bordi'] = round(float((np.abs(L[:, 2:] - L[:, :-2]) > 24).mean() * 100), 2)
    print(f, out)
