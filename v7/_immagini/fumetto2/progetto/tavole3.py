# [fumetto2] le tavole della terza versione (prototipo3.py, «la via di mezzo»): 5 posti × [A | 35 | 55 | 75 | E prima], i ritagli 1:1 a 55,
# i sei momenti a 55, la misura della separazione (A, E prima, E seconda, 35/55/75).   python3 tavole3.py
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo3 import via, separazione, separazione2
from prototipo import MOMENTI
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, '..', 'sonde', 'f'); B3 = os.path.join(HERE, 'bersagli3'); os.makedirs(B3, exist_ok=True)
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); BG = (24, 22, 26)
def rd(f): return np.asarray(Image.open(f).convert('RGB')).astype(np.float64) / 255.
def im8(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def tavola(righe, colonne, titolo, out, CW=480, CH=270, LW=170):
    T = Image.new('RGB', (LW + CW * len(colonne), 96 + CH * len(righe)), BG); d = ImageDraw.Draw(T); d.text((14, 10), titolo, font=FT, fill=(255, 240, 210))
    for j, c in enumerate(colonne): d.text((LW + j * CW + 10, 58), c, font=FB, fill=(255, 214, 120))
    for i, (lab, sub, ims) in enumerate(righe):
        y = 96 + i * CH; d.text((12, y + 10), lab, font=FB, fill=(240, 240, 240))
        for q, w in enumerate(sub): d.text((12, y + 42 + 20 * q), w, font=FS, fill=(200, 200, 200))
        for j, a in enumerate(ims): T.paste(im8(a).resize((CW, CH), Image.LANCZOS), (LW + j * CW, y))
    T.save(out, quality=90)
POSTI = [('vicolo', ['ore 11']), ('sbocco', ['sulla piazza', 'ore 16']), ('lungomare', ['ore 11']), ('piazza', ['ore 13']), ('sera', ['piazza', 'ore 19:20'])]
ORE = [('mattino', 'ore 8:10'), ('mezzogiorno', 'ore 12:30'), ('pomeriggio', 'ore 16'), ('oro', "ora d'oro 18:35"), ('crepuscolo', 'ore 19:55'), ('notte', 'ore 22:30')]
KS = (.35, .55, .75); MIS = {}; R = []
for p, sub in POSTI:
    n = 'posto_' + p; A = rd(os.path.join(F, n + '_A.png')); E1 = rd(os.path.join(HERE, 'bersagli', n + '.png')); E2 = rd(os.path.join(HERE, 'bersagli2', n + '.png'))
    V = [via(n, k)[0] for k in KS]
    for k, v in zip(KS, V): im8(v).save(os.path.join(B3, f'{n}_{int(k * 100)}.png'))
    MIS[n] = {lab: dict(netto=separazione(x, n), masse=separazione2(x if x.shape[0] == 540 else np.asarray(im8(x).resize((960, 540), Image.LANCZOS)) / 255., n))
              for lab, x in [('A', A), ('E_prima', E1), ('E_seconda', E2)] + [(f'via_{int(k * 100)}', v) for k, v in zip(KS, V)]}
    print(n, {k: (v['netto']['rapporto'], v['masse']['rapporto']) for k, v in MIS[n].items()}, flush=True)
    R.append((p, sub, [A] + V + [E1]))
tavola(R, ['oggi (A)', 'via di mezzo 35', 'via di mezzo 55', 'via di mezzo 75', 'E prima'], 'Porto Vecchio - lo stile E, la via di mezzo: la luce e la forma di A, il carattere della prima versione (una manopola)', os.path.join(HERE, 'tavola_via_di_mezzo.jpg'))
R = []
for k, sub in ORE:
    n = 'ora_' + k; A = rd(os.path.join(F, n + '_A.png')); v = via(n, .55)[0]; im8(v).save(os.path.join(B3, f'{n}_55.png'))
    MIS[n] = {lab: dict(netto=separazione(x, n), masse=separazione2(x, n)) for lab, x in [('A', A), ('via_55', v)]}
    u = MOMENTI[k]['umore']; R.append((k, [sub, u[:30], u[30:60]], [A, v]))
tavola(R, ['oggi (A)', 'via di mezzo 55'], 'i sei momenti, stesso posto (piazza), via di mezzo 55', os.path.join(HERE, 'tavola_ore_via_di_mezzo.jpg'), CW=640, CH=360)
json.dump(MIS, open(os.path.join(HERE, 'separazione.json'), 'w'), indent=1)
# i ritagli 1:1 (pixel veri della cattura, 960×540) a 55, accanto ad A e alla prima versione
for n, box in (('posto_vicolo', (300, 60, 780, 400)), ('posto_piazza', (240, 100, 720, 440))):
    ims = [('A oggi', rd(os.path.join(F, n + '_A.png'))), ('via di mezzo 55', rd(os.path.join(B3, n + '_55.png'))), ('E prima', rd(os.path.join(HERE, 'bersagli', n + '.png')))]
    w, h = box[2] - box[0], box[3] - box[1]; T = Image.new('RGB', (w * 3 + 16, h + 36), BG); d = ImageDraw.Draw(T)
    for q, (lab, a) in enumerate(ims): T.paste(im8(a).crop(box), (q * (w + 8), 36)); d.text((q * (w + 8) + 6, 8), lab + '  (1:1)', font=FS, fill=(255, 214, 120))
    T.save(os.path.join(HERE, f'ritaglio_1a1_55_{n[6:]}.png'))
