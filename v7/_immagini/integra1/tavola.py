# [integra1] la tavola: i 5 posti A | E dagli stessi tasselli cotti (sonde/cattura.js), e i fotogrammi HD singoli di E.
#   python3 tavola.py <prefisso delle catture, es. tas>
import os, sys, json, shutil
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, 'sonde', 'f'); PRE = sys.argv[1] if len(sys.argv) > 1 else 'tas'
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 30); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 36); BG = (24, 22, 26)
POSTI = [('vicolo', ['ore 11']), ('sbocco', ['sulla piazza', 'ore 16']), ('lungomare', ['la spiaggia', 'ore 11']), ('piazza', ['ore 13']), ('sera', ['piazza', 'ore 19:20'])]
CW, CH, LW = 960, 540, 230
righe = [(p, s) for p, s in POSTI if os.path.exists(os.path.join(F, f'{PRE}_{p}_A.png')) and os.path.exists(os.path.join(F, f'{PRE}_{p}_E.png'))]
T = Image.new('RGB', (LW + CW * 2, 120 + CH * len(righe)), BG); d = ImageDraw.Draw(T)
d.text((16, 14), 'Porto Vecchio - integra1: A | E dagli STESSI tasselli cotti (una cottura, lo stile scelto dal gioco)', font=FT, fill=(255, 240, 210))
for j, c in enumerate(['A (lo stile per difetto)', 'E «via di mezzo 55» (StileE.imposta)']): d.text((LW + j * CW + 14, 70), c, font=FB, fill=(255, 214, 120))
for i, (p, sub) in enumerate(righe):
    y = 120 + i * CH; d.text((16, y + 14), p, font=FB, fill=(240, 240, 240))
    for q, w in enumerate(sub): d.text((16, y + 58 + 28 * q), w, font=FS, fill=(200, 200, 200))
    for j, v in enumerate('AE'):
        T.paste(Image.open(os.path.join(F, f'{PRE}_{p}_{v}.png')).convert('RGB').resize((CW, CH), Image.LANCZOS), (LW + j * CW, y))
T.save(os.path.join(HERE, 'tavola_hd.jpg'), quality=90); print('tavola_hd.jpg', T.size, [r[0] for r in righe])
# i fotogrammi HD interi di E (1920x1080, come escono dal gioco)
for p, nome in (('vicolo', 'E_vicolo'), ('lungomare', 'E_lungomare_spiaggia'), ('sera', 'E_piazza_sera')):
    f = os.path.join(F, f'{PRE}_{p}_E.png')
    if os.path.exists(f): Image.open(f).convert('RGB').save(os.path.join(HERE, nome + '.jpg'), quality=93); print(nome + '.jpg', Image.open(f).size)
