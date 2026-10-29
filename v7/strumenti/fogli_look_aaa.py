# [look-aaa] Il foglio di confronto delle tre varianti del look: una riga per look (prima, v1, v2, v3), giorno e tramonto affiancati,
# il titolo e il costo stimato di ognuna. Le foto vengono da strumenti/look_aaa_foto.js.
# Uso: python3 strumenti/fogli_look_aaa.py <cartella delle foto> [uscita.png]
import os, sys
from PIL import Image, ImageDraw, ImageFont

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, 'confronto.png')
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(26), font(17, False), font(19)
RIGHE = [
    ('prima', 'PRIMA · il look di oggi', 'curva di oggi, nessun passo in più'),
    ('var1', 'V1 · GOLDEN HOUR CINEMATOGRAFICA', 'sole basso caldo, ombre lunghe blu-viola, ACES, ombra di contatto, foschia d\'ambra, bagliore caldo · PC +0,6-0,9 ms, telefono +0,05 ms'),
    ('var2', 'V2 · STREET POP SATURO', 'sole alto bianco, ombre ciano nette e colorate, colori pieni, neri profondi, tetti e muri vissuti · PC +0,5-0,8 ms, telefono +0,05 ms'),
    ('var3', 'V3 · MINIATURA MORBIDA', 'luce avvolgente, ombre lilla morbide, AgX, tilt-shift per profondità forte, foschia lattea · PC +0,7-1,0 ms, telefono +0,05 ms'),
]
COL = [('giorno', 'GIORNO (15:30)'), ('tramonto', 'TRAMONTO (19:06)')]
righe = [r for r in RIGHE if any(os.path.exists(os.path.join(src, f'{r[0]}_{c}.png')) for c, _ in COL)]
if not righe: sys.exit('nessuna foto in ' + src)
W = 900; ref = Image.open(next(os.path.join(src, f'{r[0]}_{c}.png') for r in righe for c, _ in COL if os.path.exists(os.path.join(src, f'{r[0]}_{c}.png'))))
H = round(ref.height * W / ref.width); pad, top, cap = 14, 64, 58
S = Image.new('RGB', (2 * W + 3 * pad, top + len(righe) * (H + cap + pad)), '#14161a'); d = ImageDraw.Draw(S)
d.text((pad, 14), 'Porto Vecchio v7 · scorcio dell\'Ottagono · tre varianti del look (?look=v1|v2|v3)', fill='#f0e6d0', font=F1)
for k, (_, t) in enumerate(COL): d.text((pad + k * (W + pad), 44), t, fill='#a8b0b8', font=F2)
for i, (nome, tit, sotto) in enumerate(righe):
    y = top + i * (H + cap + pad)
    d.text((pad, y + 4), tit, fill='#ffd08a' if i else '#e8e2d4', font=F3); d.text((pad, y + 30), sotto, fill='#c8c2b4', font=F2)
    for k, (c, _) in enumerate(COL):
        p = os.path.join(src, f'{nome}_{c}.png')
        if os.path.exists(p): S.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (pad + k * (W + pad), y + cap))
S.save(out); print('foglio', out, S.size)
