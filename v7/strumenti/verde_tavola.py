# [verde] la tavola prima/dopo delle quattro viste (strumenti/verde_tavola.js): due colonne, quattro righe, coi disegni per fotogramma.
#   python3 strumenti/verde_tavola.py <cartella prima> <cartella dopo> <uscita.jpg> [nota a piè di tavola]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
A, B, OUT = sys.argv[1:4]
VISTE = [('via', 'Una via (muri fioriti)'), ('piazza', "Piazza dell'Ottagono"), ('lungomare', 'Il lungomare del Lido'), ('villa', 'La Villa a mare')]
def mis(d):
    try: return json.load(open(os.path.join(d, 'misure.json')))['mis']
    except Exception: return {}
MA, MB = mis(A), mis(B)
W, H, PAD, TOP, LAB = 640, 360, 10, 58, 26
def font(s):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, s)
    return ImageFont.load_default()
F1, F2 = font(24), font(15)
NOTA = sys.argv[4] if len(sys.argv) > 4 else ''
T = Image.new('RGB', (PAD * 3 + W * 2, TOP + len(VISTE) * (H + LAB + PAD) + PAD + (30 if NOTA else 0)), (24, 22, 28)); d = ImageDraw.Draw(T)
d.text((PAD, 14), 'Il verde di città: PRIMA (sinistra) e DOPO (destra)', fill=(240, 230, 210), font=F1)
for r, (k, nome) in enumerate(VISTE):
    y = TOP + r * (H + LAB + PAD)
    for c, (D, M) in enumerate(((A, MA), (B, MB))):
        x = PAD + c * (W + PAD); p = os.path.join(D, k + '.png')
        if os.path.exists(p): T.paste(Image.open(p).convert('RGB').resize((W, H)), (x, y + LAB))
        m = M.get(k, {}); dc = (' · %s disegni' % m['calls']) if 'calls' in m else ''
        d.text((x + 4, y + 4), ('PRIMA  ' if c == 0 else 'DOPO  ') + nome + dc, fill=(250, 220, 120) if c else (200, 200, 210), font=F2)
if NOTA: d.text((PAD, T.size[1] - 30), NOTA, fill=(190, 190, 200), font=F2)
T.save(OUT, quality=88); print(OUT)
