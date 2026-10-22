# [visuale3] I fogli a confronto: per ogni scorcio della galleria (GALLERIA_VARIANTI=strumenti/visuale3_varianti.json) le tre varianti
# affiancate sulla stessa scena e nello stesso istante (prima: l'ellisse e la luce di prima; sezione: ?visuale=sezione con la luce nuova;
# taglio: il modo nuovo), col titolo e le misure (luminosità, contrasto, % di quasi neri, draw call).
# Con la variante «pendenza» anche <nome>_pendenza.png: il taglio con la visuale di difetto (0,78) e con ?pendenza=0.62, affiancati.
# Uso: python3 strumenti/fogli_visuale3.py <cartella della galleria> <uscita>
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1:3]
VAR = [('prima', 'PRIMA: ellisse, luce di prima'), ('sezione', 'SEZIONE (?visuale=sezione), luce nuova'), ('taglio', 'TAGLIO [visuale3], luce nuova')]
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(22), font(16), font(14, False)
nomi = sorted(f[:-4] for f in os.listdir(os.path.join(src, 'taglio')) if f.endswith('.png') and f != 'galleria.png')
for nome in nomi:
    ims, rec = [], []
    for v, _ in VAR:
        p = os.path.join(src, v, nome + '.png')
        ims.append(Image.open(p).convert('RGB') if os.path.exists(p) else None)
        j = os.path.join(src, v, nome + '.json'); rec.append(json.load(open(j)) if os.path.exists(j) else None)
    if not any(ims): continue
    ref = next(i for i in ims if i); W = 760; H = round(ref.height * W / ref.width); top, cap, pad = 70, 28, 10
    S = Image.new('RGB', (3 * W + 4 * pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
    tit = next((r['titolo'] for r in rec if r), nome)
    d.text((pad, 10), tit, font=F1, fill='#e8e2d4')
    for k, ((v, lab), im, r) in enumerate(zip(VAR, ims, rec)):
        x = pad + k * (W + pad)
        d.text((x, 42), lab, font=F2, fill='#f0c890' if v == 'taglio' else '#c8c0b0')
        if im: S.paste(im.resize((W, H)), (x, top))
        if r: d.text((x, top + H + 6), f"lum {r['luminosita']}  contr {r['contrasto']}  neri {r['quasiNeri']}%  dc {r['drawCall']}", font=F3, fill='#a8b0b8')
    S.save(os.path.join(out, nome + '.png'))
    print(os.path.join(out, nome + '.png'))

# la prova facoltativa della pendenza
for nome in nomi:
    a, b = os.path.join(src, 'taglio', nome + '.png'), os.path.join(src, 'pendenza', nome + '.png')
    if not (os.path.exists(a) and os.path.exists(b)): continue
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB'); W = 1000; H = round(A.height * W / A.width); top, pad = 70, 10
    S = Image.new('RGB', (2 * W + 3 * pad, top + H + pad), '#16181c'); d = ImageDraw.Draw(S)
    d.text((pad, 10), json.load(open(os.path.join(src, 'taglio', nome + '.json')))['titolo'] + ': la pendenza della visuale a piedi (prova, non attiva)', font=F1, fill='#e8e2d4')
    for k, (im, lab) in enumerate([(A, 'pendenza 0,78 (di difetto)'), (B, '?pendenza=0.62')]):
        d.text((pad + k * (W + pad), 42), lab, font=F2, fill='#c8c0b0'); S.paste(im.resize((W, H)), (pad + k * (W + pad), top))
    S.save(os.path.join(out, nome + '_pendenza.png')); print(os.path.join(out, nome + '_pendenza.png'))
