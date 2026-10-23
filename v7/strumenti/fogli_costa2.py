# [costa2] I fogli della costa per il committente:
#   pianta_prima_dopo.png: la pianta dell'isola intera prima e dopo, con la riva colorata per tipo e i nomi dei capi e dei golfi
#   (le piante le fa strumenti/costa2_pianta.js, con accanto il .json dei metri per tipo);
#   foto_costa.png: quattro inquadrature del gioco (marina, spiaggia delle dune, scogli, strada sul mare col guardrail).
# Uso: python3 strumenti/fogli_costa2.py <uscita> <pianta_prima.png> <pianta_dopo.png> <cartella foto>
# Le foto grezze restano fuori dal repo: nel repo vanno solo i fogli.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

out, prima, dopo, foto = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3, F4 = font(30), font(19), font(15, False), font(13)
NOMI = {'duna': 'spiaggia con le dune', 'spiaggia': 'spiaggia', 'foce': 'foce col canneto', 'cala': 'cala (spiaggetta fra gli scogli)', 'scogli': 'scogli bassi',
        'falesia': 'falesia (roccia alta)', 'frangiflutti': 'frangiflutti (massi e tetrapodi)', 'porto': 'banchine e moli', 'reef': 'scogliera delle isole'}

# ---------- la pianta prima e dopo ----------
A, B = Image.open(prima).convert('RGB'), Image.open(dopo).convert('RGB')
JA, JB = json.load(open(prima.replace('.png', '.json'))), json.load(open(dopo.replace('.png', '.json')))
W, pad, top, cap = A.width, 18, 96, 40
S = Image.new('RGB', (W + 2 * pad + 330, top + 2 * (A.height + cap) + 3 * pad + 70), '#f6f1e6'); d = ImageDraw.Draw(S)
d.rectangle([0, 0, S.width, 78], fill='#2c2238')
d.text((pad, 12), 'Porto Vecchio — la costa vera: la forma dell\'isola e la riva per tipo', font=F1, fill='#f6efe0')
d.text((pad, 50), 'Stessa cornice (x 330–1650, y 200–660 m, 1 px = 1 m). La riva colorata per tipo; in rosso la costiera col mare accanto (guardrail o muretto); l\'acqua più chiara dove è bassa.', font=F3, fill='#d8d0c0')
def tipi(J):
    m = J['metri']; tot = sum(m.values()) or 1
    return '   '.join(f"{NOMI.get(k, k).split(' (')[0]} {v} m" for k, v in sorted(m.items(), key=lambda q: -q[1]))
y = top
for im, J, tit in ((A, JA, 'PRIMA: un cerchio e due rette, la riva quasi uguale da tutte le parti'), (B, JB, 'DOPO: capi e golfi a più scale; tramontana alta e di roccia, mezzogiorno basso e di sabbia')):
    d.text((pad, y), tit, font=F2, fill='#2c2238'); d.text((pad, y + 22), tipi(J), font=F4, fill='#555')
    S.paste(im, (pad, y + cap)); y += im.height + cap + pad + 70
# i nomi sulla pianta dopo
y0 = top + A.height + cap + pad + 70 + cap; X0, Y0, sc = JB['cornice'][0], JB['cornice'][1], JB['scala'] / 2
PRESE = []
for n in JB.get('tratti', []):
    if not n.get('nome') or n['x'] < X0: continue
    px = pad + (n['x'] - X0) * sc; cy = y0 + (n.get('y', Y0) - Y0) * sc
    t = n['nome'].split(' (')[0]; w = d.textlength(t, font=F4); sd = -1 if n['lato'] == 'N' else 1
    for row in range(6):   # le etichette fuori dalla riva, verso il mare, a righe se si toccano
        py = cy + sd * (14 + row * 17) - (16 if sd < 0 else 0); R = (px - w / 2 - 3, py - 1, px + w / 2 + 3, py + 15)
        if not any(R[0] < q[2] and q[0] < R[2] and R[1] < q[3] and q[1] < R[3] for q in PRESE): break
    PRESE.append(R); d.line([px, cy, px, py + (15 if sd < 0 else 0)], fill='#2c2238', width=1)
    d.rectangle(R, fill=(255, 252, 244))
    d.text((px - w / 2, py), t, font=F4, fill='#2c2238' if n.get('capo') else '#1d6f94')
# la legenda
lx, ly = W + 2 * pad, top
d.text((lx, ly), 'LA RIVA PER TIPO', font=F2, fill='#2c2238'); ly += 30
for k in ('duna', 'spiaggia', 'foce', 'cala', 'scogli', 'falesia', 'frangiflutti', 'porto'):
    c = JB['colori'].get(k); d.rectangle([lx, ly, lx + 26, ly + 16], fill=tuple(c), outline='#555'); d.text((lx + 34, ly), NOMI[k], font=F3, fill='#222'); ly += 24
ly += 10; d.line([lx, ly + 8, lx + 26, ly + 8], fill=(214, 40, 40), width=4); d.text((lx + 34, ly), 'strada sul mare', font=F3, fill='#222'); ly += 34
d.text((lx, ly), 'I SEGNI NUOVI', font=F2, fill='#2c2238'); ly += 28
for t in ['Golfo delle Dune: 300 m di sabbia,', '  il cordone di dune, le passerelle', 'Punta di Ponente: il braccio ovest', '  che ripara il porto', 'Punta degli scogli coi faraglioni', 'Foce della Fiumara col canneto',
          'Calette a tramontana (18 tratti)', 'Capi: Maestrale, Bosco, Tramontana,', '  Corvo, Capo Rosso, San Giacomo,', '  Capre, Salina, Pino, Fiumara', 'Scogli sotto le mura della città', 'Lo scoglio sotto la Rocca',
          'Acqua bassa chiara davanti', '  alla sabbia (94% < 2 m a 8 m)']:
    d.text((lx, ly), t, font=F3, fill='#222'); ly += 21
f = os.path.join(out, 'pianta_prima_dopo.png'); S.save(f); print(f)

# ---------- le foto ----------
SC = [('marina', 'La marina: il porto riparato, il Molo Vecchio coi tetrapodi verso il largo'), ('duna', 'Il Golfo delle Dune: spiaggia, sabbia bagnata, cordone con lo sparto, ginepri e gigli, le passerelle'),
      ('scogli', 'Tramontana: falesia e scogli, lastre e pozze, la costiera col muretto e la piazzola'), ('strada_mare', 'Mezzogiorno: la strada sul mare col guardrail zincato e la scaletta verso la caletta')]
ims = [(Image.open(os.path.join(foto, n + '.png')).convert('RGB') if os.path.exists(os.path.join(foto, n + '.png')) else None, t) for n, t in SC]
w, h = 900, 562; S = Image.new('RGB', (2 * w + 3 * pad, 90 + 2 * (h + 34) + pad), '#16181c'); d = ImageDraw.Draw(S)
d.text((pad, 14), 'Porto Vecchio — la costa vera nel gioco', font=F1, fill='#e8e2d4'); d.text((pad, 54), 'quattro tratti, mezzogiorno di sole; la città compatta (?cittanuova)', font=F3, fill='#a8b0b8')
for k, (im, t) in enumerate(ims):
    x, y = pad + (k % 2) * (w + pad), 90 + (k // 2) * (h + 34)
    if im: S.paste(im.resize((w, h)), (x, y))
    d.text((x, y + h + 6), t, font=F3, fill='#f0c890')
f = os.path.join(out, 'foto_costa.png'); S.save(f); print(f)
