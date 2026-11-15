# [fluido] la tavola di FLUIDO.md: per ogni posto (inizio, porto, piazza) la foto prima e dopo dal banco del telefono
# (strumenti/banco_fluido.js --foto=), con sotto i numeri dei due giri; in fondo la tabella riassuntiva. Al più 8000 px per lato.
#   python3 strumenti/fogli_fluido.py <prima.json> <foto_prima/> <dopo.json> <foto_dopo/> <uscita.jpg>
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
pj, pf, dj, df, out = sys.argv[1:6]
P, D = json.load(open(pj)), json.load(open(dj))
POSTI = [k for k in ['inizio', 'porto', 'piazza'] if k in P['posti'] and k in D['posti']]
NOMI = {'inizio': "l'inizio", 'porto': 'il porto (Molo Vecchio)', 'piazza': 'la Piazza Grande'}
def font(n):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, n)
    return ImageFont.load_default()
F1, F2, F3 = font(44), font(30), font(26)
W1 = 1600   # larghezza di una foto nella tavola
def foto(d, k):
    p = os.path.join(d, k + '.png')
    if not os.path.exists(p): im = Image.new('RGB', (W1, int(W1 * 365 / 616)), '#222'); ImageDraw.Draw(im).text((40, 40), 'foto mancante', fill='#ccc', font=F2); return im
    im = Image.open(p).convert('RGB'); return im.resize((W1, int(im.height * W1 / im.width)), Image.LANCZOS)
def righe(R):
    j, g = R['js_ms'], R['gl']; inv = R.get('inventario', {})
    return [f"JS {j['totale']:.0f} ms/fot (simulazione {j['simulazione']:.0f} · grafica {j['grafica']:.0f} · altro {j['altro']:.0f})",
            f"disegni {g['disegni']:.0f} (scena {g['disegniScena']:.0f} · ombra {g['disegniOmbra']:.0f} · passi {g['disegniPassi']:.0f}) · triangoli {g['triangoli_k']:.0f}k",
            f"passi a tutta tela {g['passiTuttaTela']:.0f} ({g['MpxPassi']:.2f} Mpx) · programmi {g['programmiUsati']:.0f} · cambi {g['cambiProgramma']:.0f}",
            f"scena {inv.get('hd', '').split('·')[2].strip() if inv.get('hd') else '?'} · GC {R['gc']['msPerFotogramma']} ms/fot · {R['allocatoKBperFotogramma']} KB/fot"]
blocchi = []
for k in POSTI:
    a, b = foto(pf, k), foto(df, k); h = max(a.height, b.height)
    B = Image.new('RGB', (W1 * 2 + 60, h + 330), '#111'); d = ImageDraw.Draw(B)
    B.paste(a, (20, 90)); B.paste(b, (W1 + 40, 90))
    d.text((20, 20), NOMI.get(k, k), fill='#fff', font=F1)
    d.text((20, h + 100), 'PRIMA', fill='#f08080', font=F2); d.text((W1 + 40, h + 100), 'DOPO', fill='#80f080', font=F2)
    for i, r in enumerate(righe(P['posti'][k])): d.text((20, h + 145 + i * 40), r, fill='#ddd', font=F3)
    for i, r in enumerate(righe(D['posti'][k])): d.text((W1 + 40, h + 145 + i * 40), r, fill='#ddd', font=F3)
    blocchi.append(B)
Wt = max(b.width for b in blocchi); tit = 150
T = Image.new('RGB', (Wt, tit + sum(b.height for b in blocchi) + 40), '#111'); d = ImageDraw.Draw(T)
d.text((20, 30), f"Porto Vecchio sul telefono (Game Boy di traverso, 873×393 CSS, DPR 2,75) · processore ×{P.get('cpu', 4)} · prima e dopo [fluido]", fill='#fff', font=F1)
y = tit
for b in blocchi: T.paste(b, (0, y)); y += b.height
s = min(1, 8000 / T.width, 8000 / T.height)
if s < 1: T = T.resize((int(T.width * s), int(T.height * s)), Image.LANCZOS)
os.makedirs(os.path.dirname(out), exist_ok=True); T.save(out, quality=88); print(out, T.size)
