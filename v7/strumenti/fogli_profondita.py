#!/usr/bin/env python3
# [profondita2] I fogli della profondità: le foto della sonda (sonda_profondita.js) affiancate con la didascalia.
#   python3 strumenti/fogli_profondita.py <uscita.jpg> [--crop=x,y,w,h] [--zoom=4] [--larga=900] [--schermo=1920x1080] [--colonne=2] etichetta=foto.png ...
# --crop: il riquadro nelle coordinate della foto (la tela interna), ingrandito di --zoom a pixel netti (il pixel vero, niente interpolazione).
# --schermo: prima del riquadro la foto si stende alla misura dello schermo vero (come fa il browser, bilineare), così il riquadro è quello che
# l'occhio vede sul portatile o sul telefono; il crop allora è in pixel dello schermo.
import sys
from PIL import Image, ImageDraw, ImageFont
arg = {}; items = []
for a in sys.argv[2:]:
    if a.startswith('--'):
        k, _, v = a[2:].partition('='); arg[k] = v
    else:
        k, _, v = a.rpartition('='); items.append((k, v))
out = sys.argv[1]
zoom = float(arg.get('zoom', '1')); larga = int(arg.get('larga', '0') or 0); cols = int(arg.get('colonne', '2'))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: font = ImageFont.load_default()
tiles = []
for lab, f in items:
    im = Image.open(f).convert('RGB')
    if 'schermo' in arg:
        W, H = map(int, arg['schermo'].split('x')); im = im.resize((W, H), Image.BILINEAR)
    if 'crop' in arg:
        x, y, w, h = map(int, arg['crop'].split(',')); im = im.crop((x, y, x + w, y + h))
    if zoom != 1: im = im.resize((int(im.width * zoom), int(im.height * zoom)), Image.NEAREST)
    if larga and im.width > larga: im = im.resize((larga, int(im.height * larga / im.width)), Image.LANCZOS)
    tiles.append((lab, im))
tw = max(t.width for _, t in tiles); th = max(t.height for _, t in tiles); cap = 30; pad = 6
rows = (len(tiles) + cols - 1) // cols
S = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + cap + pad) + pad), (18, 18, 20)); d = ImageDraw.Draw(S)
for i, (lab, t) in enumerate(tiles):
    X = pad + (i % cols) * (tw + pad); Y = pad + (i // cols) * (th + cap + pad)
    d.text((X + 4, Y + 5), lab, fill=(240, 232, 210), font=font); S.paste(t, (X, Y + cap))
S.save(out, quality=88)
print(out, S.size)
