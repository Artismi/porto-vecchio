# [fumetto2] le tavole della seconda versione (prototipo2.py): i 5 posti (oggi | E prima | E nuovo), i 6 momenti (oggi | E nuovo), i ritagli a
# 1:1 veri a 1080 (con la prova del muro vicino), due fotogrammi interi a 1080, le misure (alte frequenze contro A, la quota della luce più alta).
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo2 import stile2
from prototipo import MOMENTI
from tavolozza import PAL, INK, oklab
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(HERE, '..', 'sonde'); F, G = os.path.join(S, 'f'), os.path.join(S, 'g')
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28); BG = (24, 22, 26)
B2 = os.path.join(HERE, 'bersagli2'); os.makedirs(B2, exist_ok=True)
def u8(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def lum(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def misura(im):   # a 960×540 (come le misure di D): varianza del laplaciano (alte frequenze) e «rumore» (mediana su blocchi di 16 px del dettaglio sotto 1,2 px)
    a = np.asarray(im.convert('RGB').resize((960, 540), Image.LANCZOS)).astype(np.float64) / 255.; L = lum(a)
    lap = (L[1:-1, 1:-1] * 4 - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:]) * 255
    bl = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float64) / 255.; hp = L - bl
    s = hp[:528, :960].reshape(33, 16, 60, 16).std(axis=(1, 3))
    return dict(laplaciano=round(float(lap.var()), 1), rumore=round(float(np.median(s) * 255), 2))
def bersaglio(nome, mom=None, opts=None, out=None):
    o, info = stile2(nome, mom, opts=opts); im = u8(o); out = out or nome; im.save(os.path.join(B2, out + '.png')); im.save(os.path.join(B2, out + '.jpg'), quality=94)
    A = info['A']; L = oklab(PAL)[:, 0]; used = np.unique(A); top = used[np.argmax(L[used[used < len(PAL)]])] if (used < len(PAL)).any() else None
    return im, dict(carta=round(info['carta'] * 100, 1), luce_piu_alta=INK[top][0] if top is not None else None, quota_luce_piu_alta=round(float((A == top).mean() * 100), 1) if top is not None else None)
def tavola(righe, colonne, titolo, out, CW=640, CH=360, LW=210):
    T = Image.new('RGB', (LW + CW * len(colonne), 102 + CH * len(righe)), BG); d = ImageDraw.Draw(T); d.text((16, 12), titolo, font=FT, fill=(255, 240, 210))
    for j, c in enumerate(colonne): d.text((LW + j * CW + 12, 64), c, font=FB, fill=(255, 214, 120))
    for i, (lab, sub, ims) in enumerate(righe):
        y = 102 + i * CH; d.text((14, y + 12), lab, font=FB, fill=(240, 240, 240))
        for k, w in enumerate(sub): d.text((14, y + 48 + 22 * k), w, font=FS, fill=(200, 200, 200))
        for j, im in enumerate(ims): T.paste(im.convert('RGB').resize((CW, CH), Image.LANCZOS), (LW + j * CW, y))
    T.save(out, quality=90)
if __name__ == '__main__':
    POSTI = [('vicolo', ['ore 11']), ('sbocco', ['sulla piazza', 'ore 16']), ('lungomare', ['ore 11']), ('piazza', ['ore 13']), ('sera', ['piazza', 'ore 19:20'])]
    ORE = [('mattino', 'ore 8:10'), ('mezzogiorno', 'ore 12:30'), ('pomeriggio', 'ore 16'), ('oro', "ora d'oro 18:35"), ('crepuscolo', 'ore 19:55'), ('notte', 'ore 22:30')]
    MIS = {}; R = []
    for p, sub in POSTI:
        n = f'posto_{p}'; A = Image.open(os.path.join(F, n + '_A.png')); v1 = Image.open(os.path.join(HERE, 'bersagli', n + '.jpg')); v2, info = bersaglio(n)
        MIS[n] = dict(A=misura(A), E_prima=misura(v1), E_nuovo=misura(v2), **info); print(n, MIS[n]); R.append((p, sub, [A, v1, v2]))
    tavola(R, ['oggi (A)', 'E prima (respinto)', 'E nuovo'], 'Porto Vecchio - lo stile E, seconda versione: pulito, nitido, niente grana (stessa cattura, stesso istante)', os.path.join(HERE, 'tavola_posti.jpg'))
    R = []
    for k, sub in ORE:
        n = f'ora_{k}'; A = Image.open(os.path.join(F, n + '_A.png')); v2, info = bersaglio(n, k)
        MIS[n] = dict(A=misura(A), E_nuovo=misura(v2), **info); print(n, MIS[n]); u = MOMENTI[k]['umore']; R.append((k, [sub, u[:34], u[34:68]], [A, v2]))
    tavola(R, ['oggi (A)', 'E nuovo'], 'i sei momenti, stesso posto (piazza): la stessa tavolozza pesata per ora', os.path.join(HERE, 'tavola_ore.jpg'))
    if os.path.exists(os.path.join(G, 'muro_vicino_col.png')):
        bersaglio('muro_vicino', 16); bersaglio('muro_vicino', 16, dict(esp=.42), 'muro_vicino_ombra')   # lo stesso muro in ombra: il tratteggio a 1,3 m
    json.dump(MIS, open(os.path.join(HERE, 'misure2.json'), 'w'), indent=1)
    # i ritagli a 1:1 VERI (pixel del bersaglio a 1080, nessun ingrandimento)
    RIT = [('posto_piazza', (760, 300, 1240, 660), 'piazza 13h: personaggio, lastrico, ombra a tratteggio'), ('posto_sbocco', (560, 300, 1040, 660), 'sbocco 16h: ombre blu, persone'),
           ('posto_sera', (1120, 300, 1600, 660), 'sera: lastrico lilla e ocra, muro'), ('posto_vicolo', (760, 160, 1240, 520), 'vicolo 11h: tetti, vicolo'),
           ('muro_vicino', (720, 300, 1200, 660), 'muro a 1,3 m dalla camera, al sole'), ('muro_vicino_ombra', (720, 300, 1200, 660), 'lo stesso muro in ombra: tratteggio, niente pois')]
    tiles = [(lab, Image.open(os.path.join(B2, n + '.png')).convert('RGB').crop(box)) for n, box, lab in RIT if os.path.exists(os.path.join(B2, n + '.png'))]
    w, h = 480, 360; T = Image.new('RGB', (w * 3 + 16, (h + 34) * 2), BG); d = ImageDraw.Draw(T)
    for k, (lab, im) in enumerate(tiles):
        x, y = (k % 3) * (w + 8), (k // 3) * (h + 34); T.paste(im, (x, y + 30)); d.text((x + 4, y + 6), lab + '  (1:1 a 1080)', font=FS, fill=(255, 214, 120))
    T.save(os.path.join(HERE, 'ritagli_1a1.png'))   # png: a 1:1 niente artefatti del jpg nella prova
    for n in ('posto_piazza', 'posto_sera'): Image.open(os.path.join(B2, n + '.png')).save(os.path.join(HERE, f'intero_1080_{n[6:]}.png'))
