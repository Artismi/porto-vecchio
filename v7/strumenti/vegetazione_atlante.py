# [vegetazione] L'atlante «vero»: le carte delle chiome e dei ciuffi composte con foglie, rametti e fili d'erba fotografati, e le trame del
# suolo, del muro a secco e della corteccia. Le fonti sono di Poly Haven (polyhaven.com), licenza CC0 (pubblico dominio): si scaricano
# da sole nella cartella cache (fuori dal repository); nel repository restano solo le uscite in assets/vegetazione/ (vedi CREDITI.txt).
#   python3 strumenti/vegetazione_atlante.py [cache]
# Uscite: atlante_foto.png (2048 × 1280, le celle di Vegetazione.KIT.CELLE che hanno una ricetta qui; le altre restano trasparenti e le
# dipinge il gioco), suolo_*.jpg, muro_pietra.jpg, corteccia_*.jpg (1024 o 512 px).
import json, math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'vegetazione')
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), '.cache', 'pv_polyhaven')
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
R = random.Random(20261023)

def scarica(asset, chiave=None, res='1k'):
    """scarica (una volta) la mappa di un asset Poly Haven; chiave None = Diffuse delle trame"""
    meta = os.path.join(CACHE, asset + '.json')
    if not os.path.exists(meta): subprocess.run(['curl', '-sS', '-m', '60', '-o', meta, 'https://api.polyhaven.com/files/' + asset], check=True)
    d = json.load(open(meta)); k = chiave or 'Diffuse'; f = d[k][res]; ext = 'jpg' if 'jpg' in f else 'png'; url = f[ext]['url']
    fn = os.path.join(CACHE, f'{asset}__{k}_{res}.{ext}')
    if not os.path.exists(fn): subprocess.run(['curl', '-sS', '-m', '120', '-o', fn, url], check=True)
    return fn

def ritagli(asset, diff, alpha, minA=900):
    """i pezzi staccati (foglie, rametti, ciuffi) di una mappa con l'alfa: lista di immagini RGBA"""
    from scipy import ndimage
    D = np.array(Image.open(scarica(asset, diff)).convert('RGB')); A = np.array(Image.open(scarica(asset, alpha)).convert('L'))
    lab, n = ndimage.label(A > 100); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w < minA or h < 20 or w < 8 or (h > 1000 and w > 1000): continue
        m = lab[sl] == i + 1; al = np.where(m, A[sl], 0).astype(np.uint8)
        out.append(Image.fromarray(np.dstack([D[sl], al]), 'RGBA'))
    return out

# ---------------- i pezzi ----------------
P = {}
P['pino'] = ritagli('pine_tree_01', 'twig_diff', 'twig_alpha')            # rametti di pino con gli aghi
P['aghi'] = ritagli('wild_rooibos_bush', 'Diffuse', 'Alpha')             # mazzetti d'aghi (e rametti secchi)
P['ovali'] = ritagli('searsia_lucida', 'Diffuse', 'Alpha')                # foglie ovali grigio-verdi (e rametti)
P['lucide'] = ritagli('island_tree_02', 'leaves_diff', 'leaves_alpha')   # foglie ovali lucide scure
P['strette'] = ritagli('shrub_02', 'Diffuse', 'Alpha')                    # foglie strette, lanceolate
P['cuore'] = ritagli('shrub_03', 'Diffuse', 'Alpha')                      # foglie larghe
P['erba'] = ritagli('grass_medium_01', 'Diffuse', 'Alpha'); P['erbaS'] = ritagli('grass_medium_01', 'dry_diff', 'Alpha')
P['lame'] = ritagli('grass_medium_02', 'Diffuse', 'Alpha'); P['lameS'] = ritagli('grass_medium_02', 'dry_diff', 'Alpha')
P['felce'] = ritagli('fern_02', 'Diffuse', 'Alpha')
# divido foglie e rametti: un rametto è lungo e sottile e poco pieno
def pieno(im): a = np.array(im)[:, :, 3] > 100; return a.mean()
def lungo(im): return max(im.size) / max(1, min(im.size))
rametti = [im for k in ('ovali', 'aghi') for im in P[k] if pieno(im) < .18 and lungo(im) > 2.5 and max(im.size) < 700]
fogOvali = [im for im in P['ovali'] if pieno(im) > .45]
fogLucide = [im for im in P['lucide'] if pieno(im) > .45]
fogStrette = [im for im in P['strette'] if pieno(im) > .3 and lungo(im) > 2.2 and max(im.size) < 700]
fogLarghe = [im for im in P['cuore'] if pieno(im) > .45 and max(im.size) < 500]
aghi = [im for im in P['aghi'] if .18 <= pieno(im) < .6 and lungo(im) < 2.6]
pini = [im for im in P['pino'] if max(im.size) > 150 and .2 < pieno(im) < .6 and lungo(im) < 3]
ciuffi = [im for im in P['erba'] if im.size[0] > 150 and im.size[1] > 120 and .12 < pieno(im) < .6]
ciuffiS = [im for im in P['erbaS'] if im.size[0] > 150 and im.size[1] > 120 and .12 < pieno(im) < .6]
spighe = [im for im in P['erba'] if lungo(im) > 3 and max(im.size) > 250 and pieno(im) < .4]
lame = [im for im in P['lame'] if max(im.size) > 300 and pieno(im) < .5]; lameS = [im for im in P['lameS'] if max(im.size) > 300 and pieno(im) < .5]
felci = P['felce']
print({k: len(v) for k, v in dict(rametti=rametti, fogOvali=fogOvali, fogLucide=fogLucide, fogStrette=fogStrette, fogLarghe=fogLarghe, aghi=aghi, pini=pini, ciuffi=ciuffi, ciuffiS=ciuffiS, spighe=spighe, lame=lame, felci=felci).items()})

# ---------------- la composizione delle carte ----------------
CELLE = ['ramoFoglioline', 'ramoOvali', 'ramoAghi', 'ramoAghi2', 'ramoLanceolate', 'ramoLunghe', 'ramoLarghe', 'ramoSquame',
         'erbaDab', 'erbaDab2', 'erbaAlta', 'felce', 'edera', 'pieno', 'corteccia', 'bianco',
         'palma', 'washingtonia', 'agave', 'pala', 'canna', 'vite', 'bouganville', 'oleandroFiori',
         'ginestra', 'mandorloFiore', 'agrumeFrutti', 'erbaSecca', 'finocchietto', 'papavero', 'cardo', 'asfodelo',
         'trifoglio', 'avena', 'cappero', 'fioriBianchi', 'prato', 'lettieraAghi', 'tamericeRamo', 'lettieraFoglie']
CS = 256
ATL = Image.new('RGBA', (CS * 8, CS * 5), (0, 0, 0, 0))

def ruota(im, gradi, lato):
    s = lato / max(im.size); im = im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.LANCZOS)
    return im.rotate(gradi, resample=Image.BICUBIC, expand=True)

def tono(im, k, cal=0):
    """scurisce (k < 1) o schiarisce; cal > 0 scalda, < 0 raffredda"""
    a = np.array(im).astype(np.float32); a[:, :, :3] *= k
    if cal: a[:, :, 0] *= 1 + cal * .08; a[:, :, 2] *= 1 - cal * .08
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def grappolo(nome, foglie, n, lato, raggio=96, rami=6, orient=90, scuroFondo=.62, schiaccia=.9, pende=0):
    """foglie attaccate a rametti che partono dal centro: le foglie di fondo più scure, quelle sopra più chiare, il bordo frastagliato"""
    c = Image.new('RGBA', (CS, CS), (0, 0, 0, 0)); cx, cy = CS / 2, CS / 2
    for k in range(rami):   # i rametti veri, sotto le foglie
        if not rametti: break
        a = k / rami * 360 + R.uniform(-20, 20); im = ruota(R.choice(rametti), -a + 90, raggio * 1.05)
        im = tono(im, .7); ax, ay = math.cos(math.radians(a)) * raggio * .5, math.sin(math.radians(a)) * raggio * .5 * schiaccia
        c.alpha_composite(im, (int(cx + ax - im.size[0] / 2), int(cy + ay - im.size[1] / 2)))
    pos = []
    for k in range(n):
        a = R.uniform(0, 360); d = raggio * math.sqrt(R.random()) * .9; x, y = cx + math.cos(math.radians(a)) * d, cy + math.sin(math.radians(a)) * d * schiaccia
        pos.append((y, x, a))
    for y, x, a in sorted(pos):   # dall'alto in basso nella cella: quelle in basso (davanti) per ultime
        t = (y - (cy - raggio)) / (2 * raggio)   # 0 in alto … 1 in basso
        rot = -(a + R.uniform(-35, 35)) + orient if not pende else -90 + R.uniform(-30, 30) + 90
        im = ruota(R.choice(foglie), rot, lato * R.uniform(.75, 1.2))
        im = tono(im, (1.12 - t * (1.12 - scuroFondo)) * R.uniform(.9, 1.08), cal=(.5 - t))
        c.alpha_composite(im, (int(x - im.size[0] / 2), int(y - im.size[1] / 2)))
    metti(nome, c)

def ciuffo(nome, pezzi, n, alt, larg=200):
    c = Image.new('RGBA', (CS, CS), (0, 0, 0, 0))
    for k in range(n):
        im = R.choice(pezzi); s = alt * R.uniform(.7, 1.05) / im.size[1]; im = im.resize((max(1, int(im.size[0] * s)), max(1, int(im.size[1] * s))), Image.LANCZOS)
        if im.size[0] > larg: im = im.resize((larg, int(im.size[1] * larg / im.size[0])), Image.LANCZOS)
        im = tono(im, R.uniform(.82, 1.1)); x = int(CS / 2 + R.uniform(-60, 60) - im.size[0] / 2); c.alpha_composite(im, (x, CS - im.size[1] - 2))
    metti(nome, c)

def metti(nome, im):
    i = CELLE.index(nome); ATL.alpha_composite(im, ((i % 8) * CS, (i // 8) * CS))

grappolo('ramoFoglioline', [tono(f, .62, -.3) for f in fogOvali + fogLucide], 150, 34, raggio=104, rami=0)          # leccio, lentisco, mirto: foglioline scure
grappolo('ramoOvali', fogLucide + fogOvali[:2], 70, 52, raggio=100, rami=0)                                        # carrubo, agrumi: ovali lucide
grappolo('ramoAghi', [tono(p, .9) for p in pini], 16, 170, raggio=70, rami=0, orient=90)                # pino domestico: rametti d'aghi a raggiera
grappolo('ramoAghi2', aghi + pini, 18, 130, raggio=80, rami=0, orient=90)                               # pino marittimo e d'Aleppo
grappolo('ramoLanceolate', [tono(f, 1.05, -.4) for f in fogStrette + fogOvali[:3]], 110, 52, raggio=104, rami=0)    # ulivo, oleandro, mandorlo: strette, argento
grappolo('ramoLunghe', fogStrette, 50, 84, rami=0, pende=1, raggio=96)                                  # eucalipto: lunghe e pendenti
grappolo('ramoLarghe', fogLarghe, 22, 100, raggio=96, rami=0)                                                       # fico: foglie larghe
grappolo('ramoSquame', [tono(p, .6, -.2) for p in pini + aghi], 40, 90, raggio=96, rami=0)             # cipresso: fitto e scuro
grappolo('edera', [tono(f, .55, -.3) for f in fogLarghe], 40, 58, raggio=104, rami=0)
ciuffo('erbaDab', ciuffi + lame, 9, 210); ciuffo('erbaDab2', ciuffi + ciuffiS[:2] + lame, 8, 240); ciuffo('prato', ciuffi, 12, 150, 240)
ciuffo('erbaSecca', ciuffiS + lameS, 10, 230); ciuffo('erbaAlta', spighe + lame, 10, 250)
ciuffo('felce', felci, 6, 250)
# la corteccia: la trama vera in grigio (la tinge il legno della specie), contrasto riportato in mezzo
cor = Image.open(scarica('knotted_pine_bark')).convert('L').resize((CS, CS), Image.LANCZOS); a = np.array(cor).astype(np.float32); a = (a - a.mean()) / (a.std() + 1e-3) * 38 + 150
metti('corteccia', Image.fromarray(np.dstack([np.clip(a, 0, 255)] * 3 + [np.full_like(a, 255)]).astype(np.uint8), 'RGBA'))
ATL.save(os.path.join(OUT, 'atlante_foto.png'), optimize=True)

# ---------------- le trame ----------------
def trama(asset, nome, lato=1024, k=1.0, cal=0, chiave=None):
    im = Image.open(scarica(asset, chiave)).convert('RGBA').resize((lato, lato), Image.LANCZOS); im = tono(im, k, cal).convert('RGB'); im.save(os.path.join(OUT, nome), quality=84); return im
trama('grass_path_2', 'suolo_prato.jpg'); trama('forrest_ground_01', 'suolo_radura.jpg'); trama('forest_floor', 'suolo_lecceta.jpg', k=.85)
trama('dry_ground_rocks', 'suolo_terra.jpg'); trama('old_stone_wall', 'muro_pietra.jpg'); trama('bark_brown_02', 'corteccia_leccio.jpg', 512, .8)
trama('knotted_pine_bark', 'corteccia_pino.jpg', 512, 1.05, .4)
# la lettiera della pineta: il suolo secco con i rametti d'aghi caduti, rossicci, sparsi in ogni direzione
base = Image.open(scarica('forrest_ground_01')).convert('RGBA').resize((1024, 1024), Image.LANCZOS); base = tono(base, .78, .6)
for k in range(3200):
    im = ruota(R.choice(pini + aghi), R.uniform(0, 360), R.uniform(26, 60)); a = np.array(im).astype(np.float32)
    g = a[:, :, :3].mean(axis=2, keepdims=True); a[:, :, :3] = g * np.array([1.2, .86, .6]) * R.uniform(.85, 1.2); a[:, :, 3] *= .85   # l'ago secco: ruggine
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA'); x, y = R.randrange(-80, 1024), R.randrange(-80, 1024)
    for dx in (0, -1024):
        for dy in (0, -1024): base.alpha_composite(im, (x + dx, y + dy)) if 0 <= x + dx < 1024 and 0 <= y + dy < 1024 else None
base.convert('RGB').save(os.path.join(OUT, 'suolo_pineta.jpg'), quality=84)
open(os.path.join(OUT, 'CREDITI.txt'), 'w').write(
    "Le fonti di queste immagini sono di Poly Haven (https://polyhaven.com), licenza CC0 1.0 (pubblico dominio):\n"
    "pine_tree_01, wild_rooibos_bush, searsia_lucida, island_tree_02, shrub_02, shrub_03, grass_medium_01, grass_medium_02, fern_02 (modelli);\n"
    "grass_path_2, forrest_ground_01, forest_floor, dry_ground_rocks, old_stone_wall, bark_brown_02, knotted_pine_bark (trame).\n"
    "Composte e ridotte da strumenti/vegetazione_atlante.py.\n")
print('fatto', OUT)
