# [fumetto2] le tavole del progetto: i 5 posti (oggi | D2 | E bersaglio), i 6 momenti (oggi | E), i ritagli 1:1. python3 tavole.py
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo import stile, momento, MOMENTI
from tavolozza import INK, RISERVATI, hexrgb
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(HERE, '..', 'sonde'); F, G = os.path.join(S, 'f'), os.path.join(S, 'g')
FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24); FS = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
FT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 28)
BG = (24, 22, 26)
def u8(a): return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
def bersaglio(nome, mom=None):
    out = os.path.join(HERE, 'bersagli', f'{nome}.png'); os.makedirs(os.path.dirname(out), exist_ok=True)
    im = u8(stile(nome, mom)); im.save(out); im.save(out[:-4] + '.jpg', quality=93); return im   # il png per i ritagli (non nel repo), il jpg nel repo
def etichetta(d, x, y, t): d.rectangle((x, y, x + 12 + 14 * len(t), y + 32), fill=(0, 0, 0)); d.text((x + 8, y + 2), t, font=FB, fill=(255, 214, 120))
def tavola(righe, colonne, titolo, out, CW=640, CH=360, LW=210):
    T = Image.new('RGB', (LW + CW * len(colonne), 56 + 46 + CH * len(righe)), BG); d = ImageDraw.Draw(T)
    d.text((16, 12), titolo, font=FT, fill=(255, 240, 210))
    for j, c in enumerate(colonne): d.text((LW + j * CW + 12, 64), c, font=FB, fill=(255, 214, 120))
    for i, (lab, sub, ims) in enumerate(righe):
        y = 102 + i * CH; d.text((14, y + 12), lab, font=FB, fill=(240, 240, 240))
        for k, w in enumerate(sub): d.text((14, y + 48 + 22 * k), w, font=FS, fill=(200, 200, 200))
        for j, im in enumerate(ims):
            if im is None: continue
            T.paste(im.convert('RGB').resize((CW, CH), Image.LANCZOS), (LW + j * CW, y))
    T.save(out, quality=90); return T
def tavolozza_img(out):
    W, H = 1600, 300; T = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(T); n = len(INK) + len(RISERVATI); w = W // n
    d.text((12, 8), 'la tavolozza unica: 18 inchiostri del mondo + 3 riservati al gioco (vermiglio, limone, allarme)', font=FS, fill=(255, 240, 210))
    for i, x in enumerate(INK + RISERVATI):
        c = tuple(int(v * 255) for v in hexrgb(x[1])); d.rectangle((i * w + 4, 40, i * w + w - 4, 220), fill=c)
        if i >= len(INK): d.rectangle((i * w + 4, 40, i * w + w - 4, 220), outline=(255, 255, 255), width=3)
        d.text((i * w + 6, 228), x[0], font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13), fill=(230, 230, 230))
        d.text((i * w + 6, 248), x[1], font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12), fill=(170, 170, 170))
    T.save(out, quality=92)
if __name__ == '__main__':
    COSA = sys.argv[1] if len(sys.argv) > 1 else 'tutto'
    POSTI = [('vicolo', ['ore 11']), ('sbocco', ['sulla piazza', 'ore 16']), ('lungomare', ['ore 11']), ('piazza', ['ore 13']), ('sera', ['piazza', 'ore 19:20'])]
    ORE = [('mattino', 'ore 8:10'), ('mezzogiorno', 'ore 12:30'), ('pomeriggio', 'ore 16'), ('oro', "ora d'oro 18:35"), ('crepuscolo', 'ore 19:55'), ('notte', 'ore 22:30')]
    tavolozza_img(os.path.join(HERE, 'tavolozza.jpg'))
    if COSA in ('tutto', 'posti'):
        R = []
        for p, sub in POSTI:
            n = f'posto_{p}'
            if not os.path.exists(os.path.join(G, n + '_col.png')): continue
            R.append((p, sub, [Image.open(os.path.join(F, n + '_A.png')), Image.open(os.path.join(F, n + '_D2.png')), bersaglio(n)]))
        tavola(R, ['oggi (A)', 'D2 (il fumetto di prima)', 'E bersaglio (BIBBIA_STILE)'], 'Porto Vecchio - lo stile E: il bersaglio, stessa scena e stesso istante (cattura vera, prototipo del passo)', os.path.join(HERE, 'tavola_posti.jpg'))
    if COSA in ('tutto', 'ore'):
        R = []
        for k, sub in ORE:
            n = f'ora_{k}'
            if not os.path.exists(os.path.join(G, n + '_col.png')): continue
            R.append((k, [sub, MOMENTI[k]['umore'][:34], MOMENTI[k]['umore'][34:68]], [Image.open(os.path.join(F, n + '_A.png')), bersaglio(n, k)]))
        tavola(R, ['oggi (A)', 'E bersaglio'], 'i sei momenti, stesso posto (piazza, verso ovest): la stessa tavolozza pesata per ora', os.path.join(HERE, 'tavola_ore.jpg'))
    if COSA in ('tutto', 'ritagli'):
        # i ritagli: pixel veri della cattura (960×540, cioè ~metà di 1080: a schermo pieno ogni trama è il doppio), e lo stesso a ×2 senza filtro
        RIT = [('posto_vicolo', (380, 130, 700, 370), 'vicolo: spray sui muri, tratteggio del suolo, bollino'), ('posto_sbocco', (300, 160, 620, 400), 'sbocco: ombre blu, persone piatte'),
               ('posto_piazza', (420, 120, 740, 360), 'piazza: il personaggio (vermiglio, bollino), lastrico a tratteggio'), ('posto_sera', (560, 150, 880, 390), 'sera: lilla e ocra, muro a spray')]
        tiles = []
        for n, box, lab in RIT:
            f = os.path.join(HERE, 'bersagli', n + '.png')
            if not os.path.exists(f): continue
            im = Image.open(f).convert('RGB').crop(box); tiles.append((lab, im))
        if tiles:
            w, h = 640, 480; T = Image.new('RGB', (w * len(tiles) + 8 * (len(tiles) - 1), h + 44), BG); d = ImageDraw.Draw(T)
            for k, (lab, im) in enumerate(tiles):
                T.paste(im.resize((w, h), Image.NEAREST), (k * (w + 8), 44)); d.text((k * (w + 8) + 6, 10), lab + '  (×2, senza filtro)', font=FS, fill=(255, 214, 120))
            T.save(os.path.join(HERE, 'ritagli_1a1.jpg'), quality=94)
