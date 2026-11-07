# [fumetto2] il contorno del personaggio a 1:1 nel gioco vero SENZA leggera (HD: 1920×1080, devicePixelRatio 1 e 1,5): in piedi e in cammino, A | E.
#   python3 contorno_hd.py   (le catture: sonde/contorno.js ctH1 e, con DPR=1.5, ctH15)
import os, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, '..', 'sonde', 'f')
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20); BG = (24, 22, 26)
righe = []
for pre, dpr in (('ctH1', 1), ('ctH15', 1.5)):
    for nome in ('fermo', 'cammina'):
        cel = []
        for v in ('A', 'E'):
            f = os.path.join(F, f'{pre}_{nome}_{v}.png')
            if not os.path.exists(f): continue
            im = Image.open(f).convert('RGB'); s = json.load(open(f.replace('.png', '.json'))); W, H = im.size
            hp = s['omH'] * H; cx, cy = s['omX'] * W, s['omY'] * H; w, h = int(hp * .95 + 60 * dpr), int(hp * 1.25 + 60 * dpr)
            cel.append((f'{nome} {v} · DPR {dpr} · 1:1', im.crop((int(cx - w / 2), int(cy - h * .62), int(cx + w / 2), int(cy + h * .38)))))
        if cel: righe.append(cel)
CW = max(c[1].width for r in righe for c in r); CH = max(c[1].height for r in righe for c in r)
T = Image.new('RGB', (CW * 2 + 10, sum(max(c[1].height for c in r) + 34 for r in righe)), BG); d = ImageDraw.Draw(T); y = 0
for r in righe:
    for j, (lab, im) in enumerate(r): d.text((j * (CW + 10) + 8, y + 6), lab, font=FB, fill=(255, 214, 120)); T.paste(im, (j * (CW + 10), y + 34))
    y += max(c[1].height for c in r) + 34
T.save(os.path.join(HERE, 'contorno_1a1_hd.png')); print(T.size)
