# [inquadratura] I fogli del prima e dopo: per ogni punto peggiore una riga con la foto del gioco di ogni variante (strumenti/foto_inquadratura.js)
# e sotto il quadro a classi della misura (strumenti/inquadratura.js: tetto rosso, facciata sabbia, strada azzurra, copertina bruna,
# personaggio giallo), coi numeri. In fondo la pianta dei punti misurati (dal verde al rosso: quanto sono solo tetti).
#   python3 strumenti/fogli_inquadratura.py <misura.json> <foto vere> <foto a classi> <uscita> [pc|tel]
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
mis, vere, classi, out = sys.argv[1:5]
fmt = sys.argv[5] if len(sys.argv) > 5 else 'pc'
M = json.load(open(mis))
P = M['peggioriPC' if fmt == 'pc' else 'peggioriTel']
VAR = M['varianti']
NOMI = {'oggi': 'oggi (?vecchiacamera)', 'verticale': 'più verticale', 'asse': 'lungo la via', 'taglio': 'taglio mirato', 'asse_taglio': 'via + taglio'}
os.makedirs(out, exist_ok=True)
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15); f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception:
    F = f = ImageFont.load_default()
tw = 360 if fmt == 'pc' else 200
fatti = []
for n, p in enumerate(P, 1):
    tiles = []
    for v in VAR:
        fv = os.path.join(vere, '%s_%02d_%s.png' % (fmt, n, v)); fc = os.path.join(classi, '%s_%02d_%s.png' % (fmt, n, v))
        if not os.path.exists(fv) and not os.path.exists(fc): continue
        im = Image.open(fv).convert('RGB') if os.path.exists(fv) else None
        ic = Image.open(fc).convert('RGB') if os.path.exists(fc) else None
        tiles.append((v, im, ic))
    if not tiles: continue
    ref = tiles[0][1] or tiles[0][2]; th = round(tw * ref.height / ref.width); ch = round(tw * .5 * ref.height / ref.width) if fmt == 'pc' else round(tw * .5 * ref.height / ref.width)
    W = len(tiles) * (tw + 8) + 8; H = 34 + th + 6 + ch + 54
    S = Image.new('RGB', (W, H), (22, 24, 28)); d = ImageDraw.Draw(S)
    d.text((10, 8), '%d. %s  (%d, %d)' % (n, p['perc'], p['x'], p['z']), font=F, fill=(232, 226, 212))
    for i, (v, im, ic) in enumerate(tiles):
        X = 8 + i * (tw + 8)
        if im: S.paste(im.resize((tw, th), Image.LANCZOS), (X, 34))
        if ic: S.paste(ic.resize((tw // 2, ch), Image.NEAREST), (X, 34 + th + 6))
        q = p['varianti'][v]
        d.text((X + tw // 2 + 6, 34 + th + 8), NOMI.get(v, v), font=F, fill=(232, 226, 212))
        bene = q['strada'] >= .25 and q['intorno'] >= .6
        d.text((X + tw // 2 + 6, 34 + th + 28), 'tetti %d%%  strada %d%%' % (q['tetto'] * 100, q['strada'] * 100), font=f, fill=(150, 220, 160) if bene else (255, 160, 130))
        d.text((X + tw // 2 + 6, 34 + th + 46), 'via attorno %d%%' % (q['intorno'] * 100), font=f, fill=(190, 196, 204))
        d.text((X + tw // 2 + 6, 34 + th + 64), 'corpo %d%%  tagli %d' % (q['corpo'] * 100, len(q.get('tagli') or [])), font=f, fill=(190, 196, 204))
    nome = os.path.join(out, '%s_%02d.jpg' % (fmt, n)); S.save(nome, quality=82, optimize=True); fatti.append(nome)
# il foglio riassunto: le righe una sotto l'altra, ridotte
if fatti:
    ims = [Image.open(x) for x in fatti]; w = max(i.width for i in ims); s = 1400 / w
    ims = [i.resize((round(i.width * s), round(i.height * s)), Image.LANCZOS) for i in ims]
    T = Image.new('RGB', (max(i.width for i in ims), sum(i.height for i in ims)), (22, 24, 28)); y = 0
    for i in ims: T.paste(i, (0, y)); y += i.height
    T.save(os.path.join(out, '%s_foglio.jpg' % fmt), quality=78, optimize=True)
pi = os.path.join(classi, 'pianta.png')
if os.path.exists(pi) and fmt == 'pc': Image.open(pi).convert('RGB').save(os.path.join(out, 'pianta_punti.jpg'), quality=85, optimize=True)
print('\n'.join(fatti))
