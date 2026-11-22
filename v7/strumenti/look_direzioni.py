# [look] LA TAVOLA DELLE DIREZIONI: righe = scene, colonne = oggi, A, B, C (le foto di strumenti/look_direzioni.js, N_scena_d.png).
# Uso: python3 strumenti/look_direzioni.py <cartella> <uscita.jpg> [colonne, es. 0,a,b,c]
import os, re, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
cart, out = sys.argv[1:3]
COL = (sys.argv[3] if len(sys.argv) > 3 else '0,a,b,c').split(',')
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(30), font(19, False), font(22)
NOMI = {'0': ('OGGI' if '0' in COL and 'd' not in COL else 'PRIMA (?look=0)', 'lo stile unico di serie' if 'd' not in COL else 'lo stile di prima'), 'a': ('A · INCHIOSTRO E RETINO', 'contorni spessi, 2 fasce, retino nell\'ombra, bianchi carta'),
        'b': ('B · POSTER DI STRADA', 'muri pastello, accenti pieni, ombre viola/verdeacqua, bordo di luce'),
        'c': ('C · COPERTINA', 'A + B: inchiostro spesso, colore a blocchi, retino viola'),
        'd': ('D · DI SERIE (dopo)', 'B + l\'inchiostro spesso di A, retino leggero'),
        'a2': ('A', ''), 'b2': ('B', ''), 'c2': ('C', '')}
SCENE = {'partenza_giorno': 'la partenza, mattina', 'marina_tramonto': 'la marina al tramonto', 'vittoria_notte': 'la Vittoria, notte, pioggia, gente'}
F = {}
for f in sorted(os.listdir(cart)):
    m = re.match(r'^(\d+)_(.+)_([0-9a-z]+)\.png$', f)
    if m: F.setdefault((int(m.group(1)), m.group(2)), {})[m.group(3)] = os.path.join(cart, f)
righe = sorted(F)
im0 = Image.open(next(iter(F[righe[0]].values()))); W0 = 400; H0 = int(im0.height * W0 / im0.width)
pad, testa, lato = 16, 120, 46
tav = Image.new('RGB', (lato + pad + len(COL) * (W0 + pad), testa + len(righe) * (H0 + pad) + pad), '#14101c')
d = ImageDraw.Draw(tav)
for j, c in enumerate(COL):
    x = lato + pad + j * (W0 + pad); t, s = NOMI.get(c, (c, ''))
    d.text((x, 22), t, font=F3 if len(t) > 18 else F1, fill='#f2e7cf' if c == '0' else '#ff6fae')
    for k, riga in enumerate(textwrap.wrap(s, 38)[:2]): d.text((x, 62 + 24 * k), riga, font=F2, fill='#b8b0c4')
for i, k in enumerate(righe):
    y = testa + i * (H0 + pad)
    lab = Image.new('RGB', (H0, lato), '#14101c'); ImageDraw.Draw(lab).text((10, 8), SCENE.get(k[1], k[1]), font=F3, fill='#f2e7cf')
    tav.paste(lab.rotate(90, expand=True), (0, y))
    for j, c in enumerate(COL):
        if c not in F[k]: continue
        im = Image.open(F[k][c]).convert('RGB').resize((W0, H0), Image.LANCZOS)
        tav.paste(im, (lato + pad + j * (W0 + pad), y))
tav.save(out, quality=90)
print(out, tav.size)
