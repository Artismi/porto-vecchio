# [graffiti] LA TAVOLA DELLO STRUMENTO DI SELEZIONE: i quattro quadri del Game Boy (strumenti/seleziona_foto.js) affiancati, col nome.
# Uso: python3 strumenti/seleziona_tavola.py <cartella> <uscita.jpg>
import os, sys
from PIL import Image, ImageDraw, ImageFont
cart, out = sys.argv[1:3]
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(22), font(15, False)
Q = [('1_muro', 'la cornice su un muro', 'tieni la bomboletta: ◄ ► un altro posto, ▲ ▼ la misura; A dipinge'),
     ('2_saracinesca', 'su una saracinesca abbassata', 'prima la saracinesca rifiutata: il riquadro passava sul muro dietro'),
     ('3_auto', 'su un\'auto parcheggiata', 'il fianco, la fascia delle portiere; ferma sì, in corsa no'),
     ('4_auto_dipinta', 'il pezzo finito sull\'auto', 'sulla carrozzeria, segue l\'auto; tutte le auto dipinte: un disegno')]
Q = [q for q in Q if os.path.exists(os.path.join(cart, q[0] + '.png'))]
if not Q: sys.exit('nessun quadro')
W0 = 360; im0 = Image.open(os.path.join(cart, Q[0][0] + '.png')); H0 = int(im0.height * W0 / im0.width)
pad, testa = 16, 70
tav = Image.new('RGB', (pad + len(Q) * (W0 + pad), testa + H0 + pad + 26), '#14101c')
d = ImageDraw.Draw(tav)
d.text((pad, 8), 'Graffiti · lo strumento di selezione (Game Boy, verticale)', font=font(18), fill='#ffe14a')
for i, (f, t1, t2) in enumerate(Q):
    x = pad + i * (W0 + pad)
    d.text((x, 34), t1, font=F1, fill='#f2ede4')
    im = Image.open(os.path.join(cart, f + '.png')).convert('RGB'); im = im.resize((W0, int(im.height * W0 / im.width)))
    tav.paste(im, (x, testa))
    d.text((x, testa + H0 + 6), t2, font=F2, fill='#a8a49c')
os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
tav.save(out, quality=88)
print(out, tav.size)
