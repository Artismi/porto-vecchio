# [lontano9] la tavola prima | dopo | differenza ×4 dai PNG di sonda_tavola9.js, e la striscia della fascia; i numeri della differenza
#   python3 tavola9.py <cartella delle foto> <cartella di uscita>
import json, sys, os
from PIL import Image, ImageDraw, ImageChops, ImageStat
D, OUT = sys.argv[1], sys.argv[2]
T = json.load(open(os.path.join(D, 'tavola.json')))
W, H = 640, 360
def diff(a, b):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB'); d = ImageChops.difference(A, B)
    g = d.convert('L'); px = list(g.getdata()); n = len(px)
    st = { 'media': round(sum(px) / n, 3), 'px>8': round(sum(1 for v in px if v > 8) / n * 100, 3), 'px>24': round(sum(1 for v in px if v > 24) / n * 100, 3) }
    return A, B, d.point(lambda v: min(255, v * 4)), st
def etichetta(im, t):
    dr = ImageDraw.Draw(im); dr.rectangle((0, 0, 7 * len(t) + 6, 14), fill=(0, 0, 0)); dr.text((3, 1), t, fill=(255, 230, 120)); return im
righe = []; R = []
for p in T['posti']:
    A, B, Dd, st = diff(p['prima'], p['dopo']); p['diff'] = st; R.append(p)
    righe.append([etichetta(A.resize((W, H)), f"PRIMA (camera9) - {p['nome']} - {p['disegni'][0]} disegni"), etichetta(B.resize((W, H)), f"DOPO (lontano9) - {p['disegni'][1]} disegni, {p['triangoli'][1] / 1e6:.2f} M tri"),
                  etichetta(Dd.resize((W, H)), f"differenza x4: media {st['media']}, {st['px>24']}% px > 24")])
def foglio(rr, nome, titolo):
    S = Image.new('RGB', (3 * W, len(rr) * H + 24), (18, 18, 18)); dr = ImageDraw.Draw(S); dr.text((6, 6), titolo, fill=(255, 255, 255))
    for j, r in enumerate(rr):
        for i, im in enumerate(r): S.paste(im, (i * W, 24 + j * H))
    S.save(os.path.join(OUT, nome), quality=84)
foglio(righe[:4], 'tavola_prima_dopo.jpg', '[lontano9] camera9 nello stesso fotogramma: a sinistra senza lontano9, al centro con lontano9, a destra la differenza x4')
if len(righe) > 4: foglio(righe[4:], 'tavola_prima_dopo_2.jpg', '[lontano9] camera9 nello stesso fotogramma (2): senza | con lontano9 | differenza x4')
# la striscia: con lontano9, passo dopo passo, e la differenza col senza
S = T.get('striscia') or []
if S:
    w, h = 400, 225; im = Image.new('RGB', (len(S) * w, 3 * h + 24), (18, 18, 18)); dr = ImageDraw.Draw(im); dr.text((6, 6), '[lontano9] la fascia sul lungomare, ogni 2,5 m: sopra senza lontano9, in mezzo con, sotto la differenza x4 (le cose fra 60 e 75 m si stringono, nessuna salta)', fill=(255, 255, 255))
    for k, s in enumerate(S):
        A, B, Dd, st = diff(s['prima'], s['dopo']); s['diff'] = st
        for j, x in enumerate([A, B, Dd]): im.paste(etichetta(x.resize((w, h)), [f"{s['disegni'][0]} disegni", f"{s['disegni'][1]} disegni, {s['fascia']} in fascia", f"diff media {st['media']}"][j]), (k * w, 24 + j * h))
    im.save(os.path.join(OUT, 'striscia_fascia.jpg'), quality=82)
json.dump({ 'query': T['query'], 'posti': [{k: v for k, v in p.items() if k not in ('prima', 'dopo')} for p in R], 'striscia': [{k: v for k, v in s.items() if k not in ('prima', 'dopo')} for s in S] }, open(os.path.join(OUT, 'tavola9.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps([[p['nome'], p['disegni'], p['diff']] for p in R], ensure_ascii=False))
print(json.dumps([[s['k'], s['disegni'], s['diff']] for s in S]))
