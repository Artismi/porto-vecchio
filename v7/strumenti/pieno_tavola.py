# [pieno] la tavola prima/dopo delle viste di strada nel Game Boy (strumenti/pieno_tavola.js): una colonna per vista, sopra PRIMA
# (lo strato del pieno spento), sotto DOPO, coi disegni per fotogramma.
#   python3 strumenti/pieno_tavola.py <cartella> <uscita.jpg> [alto px da tenere della foto, 0 = tutta] [nota]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
D, OUT = sys.argv[1:3]
CROP = int(sys.argv[3]) if len(sys.argv) > 3 else 0
NOTA = sys.argv[4] if len(sys.argv) > 4 else ''
M = json.load(open(os.path.join(D, 'misure.json')))['mis']
NOMI = {'mezzo': 'Via di Mezzo', 'rua': 'Rua Maestra', 'vicolo': 'un vicolo del borgo', 'scalo': 'verso lo Scalo', 'vittoria': 'Via della Vittoria', 'marina': 'Via della Marina', 'piazza': 'una piazzetta', 'calata': 'la calata', 'corso': 'Corso Garibaldi'}
def font(s):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, s)
    return ImageFont.load_default()
F1, F2 = font(26), font(15)
viste = [k for k in M if os.path.exists(os.path.join(D, k + '_prima.png'))]
im0 = Image.open(os.path.join(D, viste[0] + '_prima.png')); W, H = im0.size
if CROP: H = min(H, CROP)
PAD, TOP, LAB = 10, 52, 24
T = Image.new('RGB', (PAD + len(viste) * (W + PAD), TOP + 2 * (H + LAB + PAD) + (28 if NOTA else 0)), (24, 22, 28)); d = ImageDraw.Draw(T)
d.text((PAD, 12), 'Lo strato del pieno: PRIMA (sopra) e DOPO (sotto), nel Game Boy', fill=(240, 230, 210), font=F1)
for c, k in enumerate(viste):
    x = PAD + c * (W + PAD); m = M[k]
    for r, (suf, lab) in enumerate((('_prima', 'PRIMA'), ('_dopo', 'DOPO'))):
        y = TOP + r * (H + LAB + PAD); img = Image.open(os.path.join(D, k + suf + '.png')).convert('RGB').crop((0, 0, W, H)); T.paste(img, (x, y + LAB))
        q = m.get('prima' if r == 0 else 'dopo', {}) or {}
        d.text((x + 2, y + 3), '%s  %s · %s disegni' % (lab, NOMI.get(k, k), q.get('calls', '?')), fill=(250, 220, 120) if r else (200, 200, 210), font=F2)
if NOTA: d.text((PAD, T.size[1] - 26), NOTA, fill=(190, 190, 200), font=F2)
T.save(OUT, quality=88); print(OUT, T.size)
