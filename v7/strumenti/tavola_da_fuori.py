# [cinema] LA TAVOLA DI DA_FUORI.md: le foto del Game Boy (prima: la 1.6.1, dopo: con la regia) affiancate a coppie, col nome del momento.
# Uso: python3 strumenti/tavola_da_fuori.py <cartella prima> <cartella dopo> <uscita.jpg>
# Le cartelle hanno le foto di occhio2.js (NN_nome.png): si accoppiano per nome (pronto, in_gioco, cammina_0, azione, guida…).
import os, re, sys
from PIL import Image, ImageDraw, ImageFont
prima, dopo, out = sys.argv[1:4]
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(26), font(18, False)
nome = lambda f: re.sub(r'^\d+_', '', os.path.splitext(f)[0])
A = {nome(f): os.path.join(prima, f) for f in sorted(os.listdir(prima)) if f.endswith('.png')}
B = {nome(f): os.path.join(dopo, f) for f in sorted(os.listdir(dopo)) if f.endswith('.png')}
DICI = {'pronto': 'appena caricato', 'in_gioco': 'si entra', 'cammina_0': 'la passeggiata (pace)', 'cammina_1': 'la passeggiata, più avanti',
        'azione': 'si spara, la polizia insegue (azione)', 'guida': 'appena saliti su un mezzo'}
chiavi = [k for k in DICI if k in A and k in B] + [k for k in A if k in B and k not in DICI and k != 'ingresso']
if not chiavi: sys.exit('nessuna coppia di foto')
W0 = 380; im0 = Image.open(A[chiavi[0]]); H0 = int(im0.height * W0 / im0.width)
pad, testa = 18, 54
tav = Image.new('RGB', (pad + len(chiavi) * (2 * W0 + pad * 2), testa + 40 + H0 + pad), '#14101c')
d = ImageDraw.Draw(tav)
for i, k in enumerate(chiavi):
    x = pad + i * (2 * W0 + pad * 2)
    d.text((x, 14), DICI.get(k, k), font=F1, fill='#f2ede4')
    for j, (f, et) in enumerate(((A[k], '1.6.1'), (B[k], 'con la regia'))):
        im = Image.open(f).convert('RGB'); im = im.resize((W0, int(im.height * W0 / im.width)))
        tav.paste(im, (x + j * (W0 + 8), testa + 40))
        d.text((x + j * (W0 + 8), testa + 10), et, font=F2, fill='#e8a8bf' if j else '#a8a49c')
tav.save(out, quality=88)
print(out, tav.size)
