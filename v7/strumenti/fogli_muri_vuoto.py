#!/usr/bin/env python3
# [muri_vuoto] le tavole: diagnosi.jpg (i casi peggiori nel gioco, cerchiati, con la causa) e dopo.jpg (prima e dopo, gli stessi posti).
# Le foto e le misure le fa una sonda nel gioco (Chromium senza testa: il personaggio davanti al caso, la camera del gioco, la foto della
# tela, la proiezione del pezzo di muro oltre lo spigolo e un raggio orizzontale contro il filo della facciata); qui si compongono.
#   python3 strumenti/fogli_muri_vuoto.py <cartella prima> <cartella dopo|-> <casi.json> <uscita>
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

prima, dopo, casiF, out = sys.argv[1:5]
os.makedirs(out, exist_ok=True)
CASI = json.load(open(casiF))
def font(n, bold=False):
    for f in (('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),):
        try: return ImageFont.truetype(f, n)
        except OSError: pass
    return ImageFont.load_default()
F1, F2, F3 = font(15, True), font(13), font(28, True)
PW, PH = 480, 270

def rep(d):
    try: return {r['file']: r for r in json.load(open(os.path.join(d, 'rep.json'))) if 'file' in r}
    except OSError: return {}

def pannello(d, R, c, etich, colore):
    f = c['file'] + '.png'; p = os.path.join(d, f)
    im = Image.open(p).convert('RGB').resize((PW, PH), Image.LANCZOS) if os.path.exists(p) else Image.new('RGB', (PW, PH), (40, 40, 40))
    dr = ImageDraw.Draw(im)
    r = R.get(f)
    if r and r.get('segni'):
        pts = [(u * PW, v * PH) for (u, v, ok) in r['segni'] if ok]
        if pts:
            x, y = pts[0]
            if len(pts) > 1:
                x2, y2 = pts[1]; x, y = (x + x2) / 2, (y + y2) / 2
                rr = max(30, min(62, abs(y2 - pts[0][1]) * .55))
            else: rr = 42
            x = min(PW - 6, max(6, x)); y = min(PH - 6, max(6, y))
            for k in range(3): dr.ellipse((x - rr - k, y - rr - k, x + rr + k, y + rr + k), outline=colore)
    info = c.get('info') or {}
    tit = etich + '  ' + c['nome'] + ('  ' + info.get('nome', '') if info.get('nome') else '')
    dr.rectangle((0, PH - 40, PW, PH), fill=(0, 0, 0))
    dr.text((6, PH - 38), tit[:62], fill=(255, 255, 255), font=F1)
    if info:
        cau = 'lato %s: %.2f m = %.2f moduli → %.2f m di muro oltre lo spigolo' % (info['lato'], info['lw'] if info['lato'] in 'NS' else info['ld'], (info['lw'] if info['lato'] in 'NS' else info['ld']) / 2, info['sfora'])
    else:
        cau = 'il posto del direttore (camera del gioco): casa_473 N, 1,60 m oltre lo spigolo'
    dr.text((6, PH - 19), cau[:76], fill=(230, 230, 160), font=F2)
    return im

RP, RD = rep(prima), (rep(dopo) if dopo != '-' else {})
# diagnosi: i casi nel gioco di oggi, cerchiati
n = len(CASI); col = 4; righe = (n + col - 1) // col
tav = Image.new('RGB', (PW * col, PH * righe + 70), (20, 20, 20)); d = ImageDraw.Draw(tav)
d.text((12, 8), 'MURI A VUOTO — i casi peggiori nel gioco (main, città a tasselli, 15:00)', fill=(255, 255, 255), font=F3)
d.text((12, 44), 'Causa unica: render.js buildModular posa i moduli da 2 m casella per casella anche sui lati dei lotti di [pianta] che non sono multipli di 2 m: l\'ultimo modulo esce dallo spigolo (fino a 1,95 m).', fill=(220, 220, 220), font=F2)
for i, c in enumerate(CASI):
    tav.paste(pannello(prima, RP, c, ('#%d' % i if i else 'AD'), (255, 40, 40)), ((i % col) * PW, 70 + (i // col) * PH))
tav.save(os.path.join(out, 'diagnosi.jpg'), quality=88)
if RD:
    col = 4; righe = (n + 1) // 2
    tav = Image.new('RGB', (PW * col, PH * righe + 70), (20, 20, 20)); d = ImageDraw.Draw(tav)
    d.text((12, 8), 'MURI A VUOTO — prima (main, tasselli) e dopo (ramo muri_vuoto, città costruita dal vivo)', fill=(255, 255, 255), font=F3)
    d.text((12, 44), 'Dopo: sui lati frazionari i moduli interi restano dove erano e l\'avanzo è muro pieno stretto fino allo spigolo; nessun modulo fuori dalla casa.', fill=(220, 220, 220), font=F2)
    for i, c in enumerate(CASI):
        x0 = (i % 2) * 2 * PW; y0 = 70 + (i // 2) * PH
        tav.paste(pannello(prima, RP, c, 'PRIMA #%d' % i, (255, 40, 40)), (x0, y0))
        tav.paste(pannello(dopo, RD, c, 'DOPO #%d' % i, (60, 220, 90)), (x0 + PW, y0))
    tav.save(os.path.join(out, 'dopo.jpg'), quality=86)
print('fatto', out)
