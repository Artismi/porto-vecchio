# [rifinitura suolo] Anteprima nello stile E (via di mezzo, k = .55) delle foto di rifinitura_suolo_foto.js (con PROF=1), e le tavole
# prima | dopo. Il passo E lo fa il prototipo del progetto (prototipo3.py, ramo fumetto2: _immagini/fumetto2/progetto/): qui gli si danno
# le nostre catture (il fotogramma, la distanza, la camera); la categoria si ricava dalla normale (suolo se guarda in su, se no muro).
#   python3 strumenti/rifinitura_suolo_anteprima.py <cartella foto> <cartella anteprime> <cartella del prototipo> [scena,scena... | tutte] [cartella tavole]
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
FOTO, OUT, PROTO = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, PROTO)
import prototipo3 as P3
from prototipo import geometria

def carica_nostra(nome):
    dp = np.asarray(Image.open(os.path.join(FOTO, nome + '_dep.png')).convert('RGB')).astype(np.float64)
    d = (dp[..., 0] * 256 + dp[..., 1]) / 100.; d = np.maximum(d, .05)
    meta = json.load(open(os.path.join(FOTO, nome + '.json'))); meta['m'] = {}
    _, N, _, _, _ = geometria(d, meta['cam'])
    kc = np.where(np.abs(N[..., 1]) > .7, 1., 2.)
    return None, d, kc, np.zeros_like(d), meta
P3.carica = carica_nostra

def font(s):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, s)
    return ImageFont.load_default()

def e55(nome, k):
    o, _ = P3.via(nome, .55, base=os.path.join(FOTO, f'{nome}_{k}.png'))
    return Image.fromarray((np.clip(o, 0, 1) * 255).astype(np.uint8))

def tavola(titolo, righe, out, W=800):
    """righe: [(etichetta, [(sottotitolo, immagine PIL)...])]"""
    H = None; cols = max(len(r[1]) for r in righe); f1, f2 = font(22), font(15)
    ims = [[im.resize((W, int(im.height * W / im.width)), Image.LANCZOS) for _, im in r[1]] for r in righe]
    H = ims[0][0].height; TOP = 46; LAB = 26
    S = Image.new('RGB', (cols * W + (cols + 1) * 8, TOP + len(righe) * (H + LAB + 8)), (22, 20, 26)); dr = ImageDraw.Draw(S)
    dr.text((10, 10), titolo, fill=(242, 231, 207), font=f1)
    for i, (lab, cs) in enumerate(righe):
        y = TOP + i * (H + LAB + 8)
        for j, (sub, _) in enumerate(cs):
            x = 8 + j * (W + 8); dr.text((x + 2, y + 3), (lab + ' — ' if j == 0 else '') + sub, fill=(220, 154, 52), font=f2); S.paste(ims[i][j], (x, y + LAB))
    S.save(out, quality=88)

TAVOLE = [   # una tavola per superficie, la spiaggia per prima: (file, titolo, [(scena, etichetta)])
    ('1_spiaggia', 'La spiaggia e la battigia: prima | dopo (?stile=E)', [('spiaggia', 'camera del gioco, ore 11'), ('spiaggia', 'ritaglio ×2 della stessa', (300, 60, 640, 251)), ('spiaggia_sera', 'ora d\'oro'), ('spiaggia_sera', 'ritaglio ×2', (240, 0, 580, 191)), ('spiaggia_vicino', 'vista alta')]),
    ('2_mare', 'Il mare e il porto: prima | dopo', [('mare_porto', 'il porto, ore 11'), ('mare_porto', 'ritaglio ×2', (300, 100, 640, 291)), ('asfalto_vicino', 'il mare lungo la strada, vista alta')]),
    ('3_lastrico', 'Il lastrico della piazza e i basoli del vicolo: prima | dopo', [('piazza', 'piazza, ore 13'), ('piazza', 'ritaglio ×2', (160, 150, 500, 341)), ('piazza_vicino', 'vista alta'), ('vicolo', 'vicolo, ore 11'), ('vicolo', 'ritaglio ×2', (150, 120, 490, 311))]),
    ('4_asfalto', 'L\'asfalto e le strisce: prima | dopo', [('asfalto', 'camera del gioco, ore 16'), ('asfalto', 'ritaglio ×2', (240, 120, 580, 311)), ('asfalto_vicino', 'vista alta')]),
    ('5_marciapiede', 'Il marciapiede e il cordolo: prima | dopo', [('marciapiede', 'vista alta, ore 11'), ('marciapiede', 'ritaglio ×2', (120, 60, 460, 251)), ('asfalto', 'camera del gioco')]),
    ('6_terra_prato', 'La terra, la ghiaia e il prato: prima | dopo', [('terra', 'lo sterrato, ore 11'), ('terra', 'ritaglio ×2', (150, 150, 490, 341)), ('prato', 'il prato, ore 11'), ('prato', 'ritaglio ×2', (150, 150, 490, 341))]),
]
def tavole(out):
    for f, tit, sc in TAVOLE:
        righe = []
        for q in sc:
            n, lab = q[0], q[1]; cr = (lambda im: im.crop(q[2]).resize((640, 360), Image.LANCZOS)) if len(q) > 2 else (lambda im: im)
            if not os.path.exists(os.path.join(OUT, f'{n}_E55_1.png')): continue
            righe.append((lab, [('prima (oggi)', cr(Image.open(os.path.join(FOTO, f'{n}_0.png')).convert('RGB'))), ('dopo (?stile=E, la rifinitura)', cr(Image.open(os.path.join(FOTO, f'{n}_1.png')).convert('RGB'))),
                                ('prima, col passo E 55 (prototipo3)', cr(Image.open(os.path.join(OUT, f'{n}_E55_0.png')))), ('dopo, col passo E 55 (prototipo3)', cr(Image.open(os.path.join(OUT, f'{n}_E55_1.png'))))]))
        if righe: tavola(tit, righe, os.path.join(out, f + '.jpg'), W=640); print('tavola', f)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    nomi = sys.argv[4].split(',') if len(sys.argv) > 4 and sys.argv[4] != 'tutte' else sorted({f[:-6] for f in os.listdir(FOTO) if f.endswith('_0.png')})
    for n in nomi:
        if not os.path.exists(os.path.join(FOTO, n + '_dep.png')): continue
        for k in (0, 1): e55(n, k).save(os.path.join(OUT, f'{n}_E55_{k}.png'))
        print(n)
    T = sys.argv[5] if len(sys.argv) > 5 else OUT; os.makedirs(T, exist_ok=True); tavole(T)
