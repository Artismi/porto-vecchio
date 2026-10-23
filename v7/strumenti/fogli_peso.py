# [peso] I fogli del prima e dopo del banco del peso (strumenti/banco_peso.js), per PESO.md:
#   python3 strumenti/fogli_peso.py <cartella prima> <cartella dopo> <cartella fogli> [nome del foglio]
# Un foglio JPEG per gruppo di inquadrature: per ognuna prima | dopo | differenza ×8 (la statica: senza chi si muove, fra due caricamenti),
# più le differenze A/B nella stessa pagina (<scatto>_ab_<nome>_diff.png) se ci sono, in piccolo. Poche immagini compresse, niente cartelle grezze.
import sys, os
from PIL import Image, ImageDraw
import numpy as np
A, B, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
NOME = sys.argv[4] if len(sys.argv) > 4 else 'peso'
os.makedirs(OUT, exist_ok=True)
SC = ['borgo', 'marina', 'vittoria', 'recinto', 'rocca', 'citta', 'notte', 'folla', 'adunata', 'suolo']
righe = []
for s in SC:
    fa, fb = os.path.join(A, s + '.png'), os.path.join(B, s + '.png')
    if not (os.path.exists(fa) and os.path.exists(fb)): continue
    a = Image.open(fa).convert('RGB'); b = Image.open(fb).convert('RGB')
    sa, sb = os.path.join(A, s + '_statica.png'), os.path.join(B, s + '_statica.png')
    if os.path.exists(sa) and os.path.exists(sb):
        d = np.abs(np.asarray(Image.open(sa).convert('RGB')).astype(np.int16) - np.asarray(Image.open(sb).convert('RGB')).astype(np.int16))
    else:
        d = np.abs(np.asarray(a).astype(np.int16) - np.asarray(b).astype(np.int16))
    dimg = Image.fromarray(np.clip(d * 8, 0, 255).astype(np.uint8))
    ab = sorted(f for f in os.listdir(B) if f.startswith(s + '_ab_') and f.endswith('_diff.png') and '_stabile' not in f)
    righe.append((s, [a, b, dimg] + [Image.open(os.path.join(B, f)).convert('RGB') for f in ab], ['prima', 'dopo', 'differenza ×8'] + [f[len(s) + 4:-9] + ' A/B ×8' for f in ab]))
if not righe: sys.exit('niente da confrontare')
W, H = righe[0][1][0].size; n = max(len(r[1]) for r in righe); T = 16
foglio = Image.new('RGB', (W * n, (H + T) * len(righe)), (20, 20, 24)); dr = ImageDraw.Draw(foglio)
for i, (s, ims, tit) in enumerate(righe):
    for j, im in enumerate(ims):
        foglio.paste(im.resize((W, H)), (j * W, i * (H + T) + T)); dr.text((j * W + 4, i * (H + T) + 2), s + ' · ' + tit[j], fill=(230, 230, 220))
foglio.save(os.path.join(OUT, NOME + '.jpg'), quality=72)
print('foglio', os.path.join(OUT, NOME + '.jpg'), foglio.size)
