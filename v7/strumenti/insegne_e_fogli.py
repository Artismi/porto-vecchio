# [insegne_e] I FOGLI DELLA DIAGNOSI E DEL MONTAGGIO dalle foto del gioco (la camera puntata su ogni cosa piatta, strumenti: vedi INSEGNE_E.md)
#   python3 strumenti/insegne_e_fogli.py <cartella foto> <uscita> diagnosi|montaggio <conti.json>
# diagnosi: le foto *_prima.png in una griglia, ogni cosa cerchiata col colore della sua classe (colore, piatto, compenetra, staccata), i conti
# montaggio: per ogni cosa prima | dopo (le correzioni del montaggio), lo stesso punto cerchiato
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
D, OUT, MODO = sys.argv[1], sys.argv[2], sys.argv[3]
CONTI = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else {}
SALTA = set(os.environ.get('SALTA', '').split(','))   # le foto che non mostrano niente (la camera dentro una casa, la cosa sepolta del tutto)
import textwrap
wrap = lambda L, n=190: [r for ln in L for r in textwrap.wrap(ln, n)]
F = lambda s, b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if b else ''), s)
COL = {'colore': (232, 90, 60), 'piatto': (230, 180, 40), 'compenetra': (200, 60, 200), 'staccata': (40, 170, 230)}
NOMI = {'colore': 'COLORE STRIDENTE', 'piatto': 'DISEGNO PIATTO', 'compenetra': 'COMPENETRA IL MURO', 'staccata': 'STACCATA / NEL VUOTO'}
meta = {}
for f in ('meta_prima.json', 'meta_dopo.json'):
    p = os.path.join(D, f)
    if os.path.exists(p): meta[f[5:-5]] = json.load(open(p))
def tile(nome, quale, W, cl, tit, r=60):
    p = os.path.join(D, '%s_%s.png' % (nome, quale))
    im = Image.open(p).convert('RGB'); k = W / im.width; im = im.resize((W, int(im.height * k)), Image.LANCZOS)
    m = meta.get(quale, {}).get(nome)
    d = ImageDraw.Draw(im)
    if m and m.get('px'):
        x, y = m['px'][0] * k, m['px'][1] * k; rr = r
        for w in range(5): d.ellipse([x - rr - w, y - rr - w, x + rr + w, y + rr + w], outline=COL[cl])
    d.rectangle([0, 0, W, 34], fill=(20, 18, 24)); d.text((10, 6), tit, font=F(19, True), fill=COL[cl])
    return im
if MODO == 'diagnosi':
    L = json.load(open(os.path.join(D, '..', 'lista_diag_risolta.json')))
    W, cols = 600, 4; ims = [tile(s['nome'], 'prima', W, s['cl'], s['tit']) for s in L if s['nome'] not in SALTA and os.path.exists(os.path.join(D, s['nome'] + '_prima.png'))]
    h = ims[0].height; rows = (len(ims) + cols - 1) // cols; HEAD = 130 + 25 * len(wrap(CONTI.get('righe', [])))
    S = Image.new('RGB', (cols * W + (cols + 1) * 12, HEAD + rows * (h + 12) + 12), (43, 39, 36)); d = ImageDraw.Draw(S)
    d.text((16, 12), 'INSEGNE_E — DIAGNOSI: insegne, cartelli, targhe, manifesti nel gioco di oggi (città nuova, mezzogiorno)', font=F(30, True), fill=(240, 232, 214))
    y = 56
    for ln in wrap(CONTI.get('righe', [])):
        d.text((16, y), ln, font=F(18), fill=(214, 204, 186)); y += 25
    x = 16
    for k in ('colore', 'piatto', 'compenetra', 'staccata'):
        d.ellipse([x, HEAD - 40, x + 22, HEAD - 18], outline=COL[k], width=4); d.text((x + 30, HEAD - 42), NOMI[k] + ('  ' + str(CONTI['n'][k]) if 'n' in CONTI and k in CONTI['n'] else ''), font=F(19, True), fill=COL[k]); x += 560
    for i, im in enumerate(ims):
        S.paste(im, (12 + (i % cols) * (W + 12), HEAD + (i // cols) * (h + 12)))
    S.save(OUT, quality=88); print(OUT, S.size)
else:
    L = [s for s in json.load(open(os.path.join(D, '..', 'lista_diag_risolta.json'))) if s['cl'] in ('compenetra', 'staccata')]
    L = [s for s in L if s['nome'] not in SALTA and os.path.exists(os.path.join(D, s['nome'] + '_dopo.png'))]
    W = 560; HEAD = 100 + 25 * len(wrap(CONTI.get('righe_m', []))); ims = [(tile(s['nome'], 'prima', W, s['cl'], 'PRIMA · ' + s['tit']), tile(s['nome'], 'dopo', W, s['cl'], 'DOPO')) for s in L]
    h = ims[0][0].height; cols = 2; rows = (len(ims) + cols - 1) // cols
    S = Image.new('RGB', (cols * (2 * W + 12) + (cols + 1) * 24, HEAD + rows * (h + 14) + 12), (43, 39, 36)); d = ImageDraw.Draw(S)
    d.text((16, 12), 'INSEGNE_E — IL MONTAGGIO: prima | dopo (correzioni nel gioco di serie, ?nomontaggio = prima)', font=F(30, True), fill=(240, 232, 214))
    y = 56
    for ln in wrap(CONTI.get('righe_m', [])):
        d.text((16, y), ln, font=F(18), fill=(214, 204, 186)); y += 25
    for i, (a, b) in enumerate(ims):
        x0 = 24 + (i % cols) * (2 * W + 12 + 24); y0 = HEAD + (i // cols) * (h + 14)
        S.paste(a, (x0, y0)); S.paste(b, (x0 + W + 12, y0))
    S.save(OUT, quality=88); print(OUT, S.size)
