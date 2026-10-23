# [pavimenti] I fogli prima/dopo dei suoli: per ogni scorcio la foto intera di prima e di dopo (stesso posto, stessa ora) e sotto lo stesso
# ritaglio ingrandito (dove il suolo si vede meglio), col titolo; JPEG compressi, niente foto grezze nel deposito.
# Uso: python3 strumenti/fogli_pavimenti.py <cartella prima> <cartella dopo> <uscita> [ritagli.json]
#   ritagli.json: { "21_varco_rua": [x0, y0, x1, y1], ... } in pixel della foto (1280 × 800); senza, il centro.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont
prima, dopo, out = sys.argv[1:4]
rit = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else {}
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(20), font(14, False)
fatti = []
for f in sorted(os.listdir(dopo)):
    if not f.endswith('.png') or f == 'galleria.png' or not os.path.exists(os.path.join(prima, f)): continue
    nome = f[:-4]; a = Image.open(os.path.join(prima, f)).convert('RGB'); b = Image.open(os.path.join(dopo, f)).convert('RGB')
    W, H = 640, 400; box = rit.get(nome, [400, 250, 880, 550]); cw, ch = box[2] - box[0], box[3] - box[1]; zs = 640 / cw
    za, zb = a.crop(box).resize((640, int(ch * zs)), Image.LANCZOS), b.crop(box).resize((640, int(ch * zs)), Image.LANCZOS)
    o = Image.new('RGB', (W * 2 + 12, 34 + H + 8 + za.height + 24), '#16130f'); d = ImageDraw.Draw(o)
    d.text((8, 7), nome.replace('_', ' '), font=F1, fill='#f0e6d0'); d.text((W * 2 - 260, 11), 'prima (sinistra)  ·  dopo (destra)', font=F2, fill='#a89f8a')
    o.paste(a.resize((W, H), Image.LANCZOS), (0, 34)); o.paste(b.resize((W, H), Image.LANCZOS), (W + 12, 34))
    d.rectangle([box[0] / 2, 34 + box[1] / 2, box[2] / 2, 34 + box[3] / 2], outline='#ffb35c'); d.rectangle([W + 12 + box[0] / 2, 34 + box[1] / 2, W + 12 + box[2] / 2, 34 + box[3] / 2], outline='#ffb35c')
    y = 34 + H + 8; o.paste(za, (0, y)); o.paste(zb, (W + 12, y)); d.text((8, y + za.height + 4), 'ritaglio x%.1f' % zs, font=F2, fill='#a89f8a')
    p = os.path.join(out, nome + '.jpg'); o.save(p, quality=80, optimize=True); fatti.append(p); print('ok', p, os.path.getsize(p) // 1024, 'KB')
