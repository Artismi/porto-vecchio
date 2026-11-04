# [stile] il foglio di confronto (5 inquadrature x 3 stili), i ritagli 1:1 e le misure. python3 fogli.py <prefisso> <uscita>
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
PRE, OUTD = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, 'f')
POSTI = [('vicolo', 'vicolo, ore 11'), ('sbocco', 'sbocco, sulla piazza, ore 16'), ('lungomare', 'lungomare, ore 11'), ('piazza', 'piazza, ore 13'), ('sera', 'sera, piazza, ore 19:20')]
VAR = [('A', 'A  oggi'), ('B', 'B  illustrato pulito'), ('C', 'C  pittorico caldo')]
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 34)
def lum(a): return a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
def misura(path, st):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255.; L = lum(a)
    mx, mn = a.max(2), a.min(2); sat = np.where(mx > .04, (mx - mn) / np.maximum(mx, 1e-4), 0)
    im = Image.fromarray((L * 255).astype(np.uint8)); bl = np.asarray(im.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255.
    hp = L - bl; H, W = L.shape; b = 16; s = hp[:H // b * b, :W // b * b].reshape(H // b, b, W // b, b).std(axis=(1, 3))
    lap = (L[1:-1, 1:-1] * 4 - L[:-2, 1:-1] - L[2:, 1:-1] - L[1:-1, :-2] - L[1:-1, 2:]) * 255
    r = {'L10': float(np.percentile(L, 10)), 'L50': float(np.percentile(L, 50)), 'L90': float(np.percentile(L, 90)), 'sat': float(sat.mean()),
         'rumore': float(np.median(s) * 255), 'nitidezza': float(lap.var())}
    if st and 'omX' in st:   # il personaggio: il rettangolo dalla testa ai piedi contro la corona attorno
        fx, fy, h = st['omX'] * W, st['omY'] * H, st['omH'] * H; x0, x1, y0, y1 = int(fx - h * .18), int(fx + h * .18), int(fy - h * .95), int(fy - h * .1)
        X0, X1, Y0, Y1 = int(fx - h * .7), int(fx + h * .7), int(fy - h * 1.3), int(fy + h * .3)
        if X0 > 0 and Y0 > 0 and X1 < W and Y1 < H:
            inn = L[y0:y1, x0:x1]; ring = L[Y0:Y1, X0:X1].copy(); m = np.ones_like(ring, bool); m[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = False
            a1, a2 = float(np.median(inn)), float(np.median(ring[m])); r['persona'] = (max(a1, a2) + .05) / (min(a1, a2) + .05)
    return r
def stato(posto):
    try: return {v: s for v, s in json.load(open(os.path.join(HERE, f'log_{PRE}_{posto}.json')))['stato']}
    except Exception: return {}
os.makedirs(OUTD, exist_ok=True); M = {}
CW, CH, LW, TH = 640, 360, 200, 50
S = Image.new('RGB', (LW + CW * 3, TH + 60 + CH * len(POSTI)), (24, 22, 26)); d = ImageDraw.Draw(S)
d.text((16, 10), 'Porto Vecchio - tre stili, stessa scena, stesso istante (camera7, profilo leggero)  ?stile=A | B | C', font=FT, fill=(255, 240, 210))
for j, (v, lab) in enumerate(VAR): d.text((LW + j * CW + 12, TH + 14), lab, font=FB, fill=(255, 214, 120))
for i, (p, plab) in enumerate(POSTI):
    y = TH + 60 + i * CH; ST = stato(p); words = plab.split(', ')
    d.text((14, y + 14), words[0], font=FB, fill=(240, 240, 240))
    for k, w in enumerate(words[1:]): d.text((14, y + 50 + 24 * k), w, font=FS, fill=(200, 200, 200))
    for j, (v, lab) in enumerate(VAR):
        f = os.path.join(F, f'{PRE}_{p}_{v}.png')
        if not os.path.exists(f): continue
        m = misura(f, ST.get(v)); m['ms'] = (ST.get(v) or {}).get('ms'); M.setdefault(p, {})[v] = m
        im = Image.open(f).convert('RGB').resize((CW, CH), Image.LANCZOS); S.paste(im, (LW + j * CW, y))
        d.rectangle((LW + j * CW, y, LW + j * CW + 68, y + 34), fill=(0, 0, 0)); d.text((LW + j * CW + 10, y + 2), v, font=FB, fill=(255, 214, 120))
S.save(os.path.join(OUTD, 'confronto_5x3.jpg'), quality=88)
json.dump(M, open(os.path.join(OUTD, 'misure.json'), 'w'), indent=1)
# i ritagli 1:1 (pixel veri dello schermo, niente ridimensionamento)
for p, box in [('vicolo', (560, 60, 960, 400)), ('piazza', (0, 0, 480, 340))]:
    ims = [(v, os.path.join(F, f'{PRE}_{p}_{v}.png')) for v, _ in VAR]
    ims = [(v, Image.open(f).convert('RGB').crop(box)) for v, f in ims if os.path.exists(f)]
    if not ims: continue
    w, h = box[2] - box[0], box[3] - box[1]; R = Image.new('RGB', (w * len(ims) + 8 * (len(ims) - 1), h + 44), (24, 22, 26)); dr = ImageDraw.Draw(R)
    for k, (v, im) in enumerate(ims): R.paste(im, (k * (w + 8), 44)); dr.text((k * (w + 8) + 6, 6), dict(VAR)[v] + '  (1:1)', font=FB, fill=(255, 214, 120))
    R.save(os.path.join(OUTD, f'ritaglio_1a1_{p}.jpg'), quality=92)
for p in M:
    print(p, ' | '.join(f"{v}: L {m['L10']:.2f}/{m['L50']:.2f}/{m['L90']:.2f} sat {m['sat']:.2f} rum {m['rumore']:.2f} nit {m['nitidezza']:.0f} pers {m.get('persona', 0):.2f} ms {m['ms']}" for v, m in M[p].items()))
