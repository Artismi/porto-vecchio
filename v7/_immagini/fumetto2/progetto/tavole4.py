# [fumetto2] la tavola dell'implementazione: i 5 posti × [A in gioco | E in gioco | il prototipo 55], il tremolio (mezzo pixel) A contro E.
#   python3 tavole4.py <prefisso delle catture in gioco, es. g3>
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import ImageFilter
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); BG = (24, 22, 26)
def rd(f): return np.asarray(Image.open(f).convert('RGB')).astype(np.float64) / 255.
def im8(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def tavola(righe, colonne, titolo, out, CW=480, CH=270, LW=170):
    T = Image.new('RGB', (LW + CW * len(colonne), 96 + CH * len(righe)), BG); d = ImageDraw.Draw(T); d.text((14, 10), titolo, font=FT, fill=(255, 240, 210))
    for j, c in enumerate(colonne): d.text((LW + j * CW + 10, 58), c, font=FB, fill=(255, 214, 120))
    for i, (lab, sub, ims) in enumerate(righe):
        y = 96 + i * CH; d.text((12, y + 10), lab, font=FB, fill=(240, 240, 240))
        for q, w in enumerate(sub): d.text((12, y + 42 + 20 * q), w, font=FS, fill=(200, 200, 200))
        for j, a in enumerate(ims): T.paste(im8(a).resize((CW, CH), Image.LANCZOS), (LW + j * CW, y))
    T.save(out, quality=90)
POSTI = [('vicolo', ['ore 11']), ('sbocco', ['sulla piazza', 'ore 16']), ('lungomare', ['ore 11']), ('piazza', ['ore 13']), ('sera', ['piazza', 'ore 19:20'])]
def lum(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def tremolio(f1, f2):   # come _immagini/fumetto/sonde/fogli.py: grezzo e interno (fuori i bordi forti)
    a = np.asarray(Image.open(f1).convert('RGB')).astype(np.float32); b = np.asarray(Image.open(f2).convert('RGB')).astype(np.float32)
    d = np.abs(a - b); g = [float(d.mean()), float((d.max(2) > 24).mean() * 100)]
    L = lum(a / 255.); gx = np.abs(np.roll(L, 1, 1) - np.roll(L, -1, 1)); gy = np.abs(np.roll(L, 1, 0) - np.roll(L, -1, 0))
    m = (np.maximum(gx, gy) > .22).astype(np.uint8); m = np.asarray(Image.fromarray(m * 255).filter(ImageFilter.MaxFilter(5))) > 0
    di = d.max(2)[~m]; return {'grezzo': [round(x, 2) for x in g], 'interno': [round(float(d.mean(2)[~m].mean()), 2), round(float((di > 24).mean() * 100), 2)]}
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, '..', 'sonde', 'f'); PRE = sys.argv[1] if len(sys.argv) > 1 else 'g3'
R, T = [], {}
for p, sub in POSTI:
    a, e = os.path.join(F, f'{PRE}_{p}_A.png'), os.path.join(F, f'{PRE}_{p}_E.png')
    if not (os.path.exists(a) and os.path.exists(e)): continue
    R.append((p, sub, [rd(a), rd(e), rd(os.path.join(HERE, 'bersagli3', f'posto_{p}_55.png'))]))
    for v, f in (('A', a), ('E', e)):
        m = f.replace('.png', '_mezzopx.png')
        if os.path.exists(m): T.setdefault(p, {})[v] = tremolio(f, m)
LAB = sys.argv[2] if len(sys.argv) > 2 else ''
tavola(R, ['A in gioco', 'E in gioco (?stile=E, k .55)', 'prototipo 55 (altra cattura)'], 'Porto Vecchio - lo stile E nel gioco vero: A | E | il prototipo approvato' + (' - ' + LAB if LAB else ''), os.path.join(HERE, 'tavola_in_gioco.jpg'), CW=640, CH=360)
json.dump(T, open(os.path.join(HERE, 'tremolio_in_gioco.json'), 'w'), indent=1); print(json.dumps(T))
