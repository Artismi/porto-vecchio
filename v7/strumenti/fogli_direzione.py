# [direzione] I fogli prima/dopo della direzione artistica: per ogni scorcio le foto affiancate (prima a sinistra) con le misure per
# categoria della galleria (<scena>_cat.json: luminanza e saturazione di suolo, muri, tetti, persone; luce/ombra del suolo) e un mosaico.
# Uso: python3 strumenti/fogli_direzione.py <uscita> <etichetta1>=<cartella1> <etichetta2>=<cartella2> [...]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

out = sys.argv[1]
cols = [a.split('=', 1) for a in sys.argv[2:]]
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(20), font(13, False)
def misura(d, nome):
    f = os.path.join(d, nome + '_cat.json')
    if not os.path.exists(f): return ''
    c = json.load(open(f)); parti = []
    for k in ('suolo', 'muri', 'tetti', 'persone'):
        if k in c: parti.append(f"{k} L{c[k]['L']:.2f} s{c[k]['sat']:.2f}")
    if 'suolo' in c and 'luceOmbra' in c['suolo']: parti.append(f"luce/ombra {c['suolo']['luceOmbra']:.1f}")
    return '  '.join(parti)
nomi = sorted(f[:-4] for f in os.listdir(cols[0][1]) if f.endswith('.png') and not f.endswith('_cat.png') and f != 'galleria.png' and not f.startswith('00_'))   # 00_avvio: lo scorcio di riscaldamento
fogli = []
for nome in nomi:
    ims = []
    for et, d in cols:
        p = os.path.join(d, nome + '.png')
        if not os.path.exists(p): break
        ims.append((et, d, Image.open(p).convert('RGB')))
    if len(ims) < len(cols): continue
    W = 960; H = round(ims[0][2].height * W / ims[0][2].width); top, cap, pad = 34, 24, 8
    S = Image.new('RGB', (len(ims) * W + (len(ims) + 1) * pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
    for i, (et, dd, im) in enumerate(ims):
        x = pad + i * (W + pad); S.paste(im.resize((W, H), Image.LANCZOS), (x, top))
        d.text((x, 7), f'{et} · {nome}', fill='#f2efe8', font=F1); d.text((x, top + H + 5), misura(dd, nome), fill='#b9b4aa', font=F2)
    f = os.path.join(out, nome + '.jpg'); S.save(f, quality=88); fogli.append(S); print('foglio', f)
if fogli:
    W = 1600; R = [s.resize((W, round(s.height * W / s.width)), Image.LANCZOS) for s in fogli]
    M = Image.new('RGB', (W, sum(r.height for r in R)), '#16181c'); y = 0
    for r in R: M.paste(r, (0, y)); y += r.height
    M.save(os.path.join(out, 'mosaico.jpg'), quality=85); print('mosaico', os.path.join(out, 'mosaico.jpg'))
