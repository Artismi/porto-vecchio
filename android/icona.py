# Le icone PNG per Android 7 (API 24-25, senza icone adattive): lo stesso disegno di app/src/main/res/drawable/ic_primo_piano.xml
# su fondo notte, ritagliato tondo. python3 icona.py (scrive app/src/main/res/mipmap-*/ic_launcher.png)
import os
from PIL import Image, ImageDraw

H = lambda h, a=255: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (a,)
FORME = [
    ('#DC9A34', 140, [(54, 36), (84, 28), (84, 44)]), ('#DC9A34', 140, [(54, 36), (24, 28), (24, 44)]),
    ('#F2E7CF', 255, [(47, 42), (61, 42), (64, 76), (44, 76)]),
    ('#C25B36', 255, [(46.3, 50), (61.7, 50), (62.3, 57), (45.7, 57)]), ('#C25B36', 255, [(45.2, 64), (62.8, 64), (63.4, 71), (44.6, 71)]),
    ('#DC9A34', 255, [(48, 31), (60, 31), (60, 42), (48, 42)]), ('#16121B', 255, [(45, 31), (54, 24), (63, 31)]),
    ('#2A8A8A', 255, [(18, 76), (90, 76), (90, 90), (18, 90)]),
    ('#A3D4D8', 255, [(30, 80), (46, 80), (46, 82), (30, 82)]), ('#A3D4D8', 255, [(58, 84), (78, 84), (78, 86), (58, 86)]),
]
DENS = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
QUI = os.path.dirname(os.path.abspath(__file__))
for d, px in DENS.items():
    S = px * 4; f = lambda v: ((v - 54) * 1.3 + 54) * S / 108   # il disegno ingrandito attorno al centro, come nella zona sicura dell'icona adattiva
    im = Image.new('RGBA', (S, S), H('#202D5E'))
    for col, a, pts in FORME:
        lay = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(lay).polygon([(f(x), f(y)) for x, y in pts], fill=H(col, a))
        im = Image.alpha_composite(im, lay)
    m = Image.new('L', (S, S), 0); ImageDraw.Draw(m).ellipse((0, 0, S - 1, S - 1), fill=255)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0)); out.paste(im, (0, 0), m)
    p = os.path.join(QUI, 'app/src/main/res/mipmap-' + d); os.makedirs(p, exist_ok=True)
    out.resize((px, px), Image.LANCZOS).save(os.path.join(p, 'ic_launcher.png'), optimize=True)
    print(d, px)
