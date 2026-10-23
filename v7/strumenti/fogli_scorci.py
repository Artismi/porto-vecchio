# [scorci] I fogli degli scorci: per ogni scorcio la foto di prima e quella di dopo (stesso posto, stessa ora, zoom del gioco), più, se c'è,
# la foto con la camera che si adatta; il titolo, il costo (chiamate di disegno e triangoli) e un mosaico di tutti.
# Uso: python3 strumenti/fogli_scorci.py <cartella prima> <cartella dopo> <uscita> [scheda.json] [costi.json] [cartella adattiva] [cartella da vicino]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

prima, dopo, out = sys.argv[1:4]
scheda = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else {}
costi = json.load(open(sys.argv[5])) if len(sys.argv) > 5 and os.path.exists(sys.argv[5]) else {}
adatt = sys.argv[6] if len(sys.argv) > 6 else None
vicino = sys.argv[7] if len(sys.argv) > 7 else None
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2 = font(22), font(15, False)
titoli = {s['nome']: s.get('titolo', s['nome']) for s in scheda.get('scorci', [])}
pic = []
for f in sorted(os.listdir(dopo)):
    if not f.endswith('.png') or f == 'galleria.png': continue
    nome = f[:-4]; a, b = os.path.join(prima, f), os.path.join(dopo, f)
    c = os.path.join(adatt, f) if adatt else None; v = os.path.join(vicino, f) if vicino else None
    fotos = [('PRIMA (zoom 0,45)', a), ('DOPO · camera di gioco (zoom 0,45)', b)] + ([('DOPO · camera che si adatta', c)] if c and os.path.exists(c) else []) + ([('DOPO · da vicino (zoom 1,1)', v)] if v and os.path.exists(v) else [])
    fotos = [(t, p) for t, p in fotos if os.path.exists(p)]
    if len(fotos) < 2: continue
    W = 900 if len(fotos) < 4 else 700; ims = [Image.open(p).convert('RGB') for _, p in fotos]; H = round(ims[0].height * W / ims[0].width); ims = [i.resize((W, H)) for i in ims]
    top, cap, pad = 70, 34, 10
    S = Image.new('RGB', (len(ims) * W + (len(ims) + 1) * pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
    d.text((pad, 8), titoli.get(nome, nome), fill='#f0e6d0', font=F1)
    for k, ((t, _), im) in enumerate(zip(fotos, ims)): x = pad + k * (W + pad); S.paste(im, (x, top)); d.text((x, 40), t, fill='#e8e2d4' if k else '#a8b0b8', font=F2)
    q = costi.get(nome)
    d.text((pad, top + H + 8), f"{nome}" + (f"   ·   {q['draws']} chiamate di disegno, {q['tri']} triangoli (tutti gli stati, fusi per materiale)" if q else ''), fill='#f0c890', font=F2)
    S.save(os.path.join(out, nome + '.jpg'), quality=88); pic.append(os.path.join(out, nome + '.jpg')); print('foglio', nome)
if pic:   # il mosaico: le foto di dopo, quattro per riga
    th = [Image.open(os.path.join(dopo, os.path.basename(p)[:-4] + '.png')).convert('RGB') for p in pic]; w = 480; h = round(th[0].height * w / th[0].width); n = 4; r = (len(th) + n - 1) // n
    M = Image.new('RGB', (n * w + (n + 1) * 6, r * (h + 26) + 6), '#16181c'); d = ImageDraw.Draw(M)
    for i, (im, p) in enumerate(zip(th, pic)): x, y = 6 + (i % n) * (w + 6), 6 + (i // n) * (h + 26); M.paste(im.resize((w, h)), (x, y + 20)); d.text((x, y + 2), titoli.get(os.path.basename(p)[:-4], ''), fill='#e8e2d4', font=F2)
    M.save(os.path.join(out, 'mosaico.jpg'), quality=86); print('mosaico')
