# [texture] la tavola prima/dopo del suolo nel Game Boy (strumenti/texture_tavola.js): una colonna per vista, sopra PRIMA (il suolo di
# oggi, manopola a 0), sotto DOPO (il suolo con grinta e le erbacce), e sotto ancora un ritaglio ingrandito ×2 del suolo, prima | dopo.
#   python3 strumenti/texture_tavola.py <cartella> <uscita.jpg> [nota]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
D, OUT = sys.argv[1:3]
NOTA = sys.argv[3] if len(sys.argv) > 3 else ''
M = json.load(open(os.path.join(D, 'misure.json')))['mis']
NOMI = {'partenza': 'la partenza (piazza, porfido)', 'vicolo': 'un vicolo di basoli', 'vittoria': 'Via della Vittoria: asfalto, lastre, cordolo', 'lungomare': 'il lungomare', 'ghiaia': 'la ghiaia del piazzale', 'sterrata': 'la sterrata di cresta', 'piazza': 'Piazza Grande'}
def font(s):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, s)
    return ImageFont.load_default()
F1, F2 = font(26), font(14)
viste = [k for k in M if not k.startswith('_') and os.path.exists(os.path.join(D, k + '_prima.png')) and os.path.exists(os.path.join(D, k + '_dopo.png'))]
X0, Y0, X1, Y1 = 14, 14, 376, 706   # lo schermo del Game Boy nella foto 390×844
W, H = X1 - X0, Y1 - Y0
# il ritaglio: la metà bassa dello schermo (il suolo vicino e medio), ingrandito ×2 a metà larghezza per lato
CW, CH = W // 2, 150
PAD, TOP, LAB = 10, 52, 22
rows_h = 2 * (H + LAB + PAD) + (CH * 2 + LAB + PAD)
T = Image.new('RGB', (PAD + len(viste) * (W + PAD), TOP + rows_h + (26 if NOTA else 0)), (24, 22, 28)); d = ImageDraw.Draw(T)
d.text((PAD, 12), 'Il suolo: PRIMA (sopra) e DOPO (sotto), nel Game Boy; in fondo il suolo ingrandito ×2, prima | dopo', fill=(240, 230, 210), font=F1)
for c, k in enumerate(viste):
    x = PAD + c * (W + PAD); m = M[k]
    ims = {}
    for r, (suf, lab) in enumerate((('_prima', 'PRIMA'), ('_dopo', 'DOPO'))):
        y = TOP + r * (H + LAB + PAD); img = Image.open(os.path.join(D, k + suf + '.png')).convert('RGB').crop((X0, Y0, X1, Y1)); ims[suf] = img; T.paste(img, (x, y + LAB))
        q = m.get('prima' if r == 0 else 'dopo', {}) or {}
        d.text((x + 2, y + 3), '%s  %s · %s disegni' % (lab, NOMI.get(k, k), q.get('calls', '?')), fill=(250, 220, 120) if r else (200, 200, 210), font=F2)
    y = TOP + 2 * (H + LAB + PAD); cy = int(H * float(os.environ.get('RIT_Y', '.62')))
    for i, suf in enumerate(('_prima', '_dopo')):
        cx = W // 2 + int(W * float(os.environ.get('RIT_X', '0')))
        cr = ims[suf].crop((cx - CW // 4, cy, cx + CW // 4, cy + CH)).resize((CW, CH * 2), Image.NEAREST)
        T.paste(cr, (x + i * CW, y + LAB))
    d.text((x + 2, y + 3), 'ingrandito ×2: prima | dopo', fill=(200, 200, 210), font=F2)
if NOTA: d.text((PAD, T.size[1] - 24), NOTA, fill=(190, 190, 200), font=F2)
T.save(OUT, quality=88); print(OUT, T.size)
