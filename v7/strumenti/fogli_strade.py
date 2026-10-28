# [pulizia] Le foto dei 12 peggiori del controllo delle strade (strumenti/strade_integre.js → reports/strade_integre.json).
#   python3 strumenti/fogli_strade.py scene <strade_integre.json> <scene.json>       le scene per strumenti/galleria.js (zoom 0,4)
#   node strumenti/galleria.js <cartella> <scene.json> 960 600
#   python3 strumenti/fogli_strade.py fogli <strade_integre.json> <cartella> <uscita>  ritaglia il centro di ogni foto, scrive cosa e dove,
#                                                                                    e fa il mosaico 4 × 3 (JPEG compressi)
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
modo, src = sys.argv[1], json.load(open(sys.argv[2]))
P = src['peggiori']
nome = lambda i, p: '%02d_%s' % (i + 1, p[0])
if modo == 'scene':
    json.dump({'pulita': True, 'scorci': [{'nome': nome(i, p), 'x': p[1], 'y': p[2], 'zoom': .4, 'ora': 630, 'meteo': 'sereno'} for i, p in enumerate(P)]}, open(sys.argv[3], 'w'), indent=1)
    sys.exit(0)
cart, out = sys.argv[3], sys.argv[4]; os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(17), font(13, False)
TIT = {'sotto_casa': 'la via passa sotto la casa', 'sotto_pezzo': 'la via passa dentro un pezzo grande', 'marciapiede': 'il marciapiede smette', 'capi_staccati': 'due vie che non si toccano',
       'buco': 'la via su una casella che non è strada', 'materiale': 'il materiale cambia di netto', 'capo_cieco': 'la via finisce nel nulla', 'strada': 'un ostacolo sulla strada'}
tess = []
for i, p in enumerate(P):
    f = os.path.join(cart, nome(i, p) + '.png')
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB'); W, H = im.size; c = im.crop((W // 2 - 320, H // 2 - 200, W // 2 + 320, H // 2 + 200))
    d = ImageDraw.Draw(c); d.rectangle((0, 0, 640, 46), fill='#16181c')
    d.text((8, 4), '%d. %s' % (i + 1, TIT.get(p[0], p[0])), font=F1, fill='#ffb35c')
    d.text((8, 26), '%s · x %s, y %s · %s' % (p[3], p[1], p[2], ' '.join(str(q) for q in p[5:])), font=F2, fill='#f0e6d0')
    d.ellipse((320 - 14, 200 - 14, 320 + 14, 200 + 14), outline='#ff4fa3', width=3)
    q = os.path.join(out, nome(i, p) + '.jpg'); c.save(q, quality=82, optimize=True); tess.append(c); print(q)
if tess:
    M = Image.new('RGB', (4 * 640 + 5 * 8, 3 * 400 + 4 * 8), '#16181c')
    for k, c in enumerate(tess[:12]): M.paste(c, (8 + (k % 4) * 648, 8 + (k // 4) * 408))
    M = M.resize((M.width // 2, M.height // 2), Image.LANCZOS); q = os.path.join(out, '00_mosaico.jpg'); M.save(q, quality=82, optimize=True); print(q)
