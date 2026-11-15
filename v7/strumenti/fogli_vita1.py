# [vita1] la tavola: prima e dopo degli autisti (e di chi siede accanto) a 10, 45 e 80 m, coi numeri della sonda F0 prima e dopo.
# Uso: python3 strumenti/fogli_vita1.py <foto prima> <foto dopo> <sonda prima.json> <sonda dopo.json> <uscita.jpg>
#      [<sonda prima provoca.json> <sonda dopo provoca.json>]
# Le cartelle delle foto sono quelle di strumenti/autisti_foto.js (autisti.json + a_<i>_<d>.png). Al massimo 8000 px per lato.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
A, B, SA, SB, OUT = sys.argv[1:6]
PA = sys.argv[6] if len(sys.argv) > 6 else None; PB = sys.argv[7] if len(sys.argv) > 7 else None
F = '/usr/share/fonts/truetype/dejavu/'
f1, f2, f3 = ImageFont.truetype(F + 'DejaVuSans-Bold.ttf', 34), ImageFont.truetype(F + 'DejaVuSans.ttf', 20), ImageFont.truetype(F + 'DejaVuSansMono.ttf', 18)
JA, JB = json.load(open(os.path.join(A, 'autisti.json'))), json.load(open(os.path.join(B, 'autisti.json')))
S0, S1 = json.load(open(SA)), json.load(open(SB))
P0 = json.load(open(PA)) if PA and os.path.exists(PA) else None; P1 = json.load(open(PB)) if PB and os.path.exists(PB) else None
TW, TH = 480, 270
D = [10, 45, 80]
rows = sorted(set(s['i'] for s in JB['shots']))
W = 300 + TW * 6 + 20
def riga_num(t, k, f=lambda x: str(x)):
    return f(t.get(k, '-'))
pct = lambda x: f'{x * 100:.1f}%' if isinstance(x, (int, float)) else str(x)
NUM = [('in un mezzo ma «fuori» (inVeh && !inside)', 'inVehFuori', str), ('equipaggio «fuori» nella scocca (car && !inside)', 'carFuori', str),
       ('n.dove che non torna col mezzo', 'doveKo', str), ('autisti col pupazzo a scatole (campioni)', 'pupazzi', str), ('mezzi di un abitante senza autista (campioni)', 'senzaAutista', str),
       ('coppie ferme a < 0,4 m (campioni)', 'coppieFerme', str), ('autobus: un angolo fuori da T.VIA', 'busQuotaFuori', pct), ('autobus: un angolo su acqua o edificio', 'busQuotaDuro', pct),
       ('traffico: deriva laterale > 8°', 'trafQuota8', pct), ('traffico: inversioni sul posto', 'inversioni', str), ('cani fuori dalle assi', 'caniQuota', pct)]
hdr = 190 + 34 * (len(NUM) + 2)
H = hdr + 60 + len(rows) * (TH + 34) + 30
img = Image.new('RGB', (W, H), '#f5f0e8'); dr = ImageDraw.Draw(img)
dr.text((20, 16), 'VITA1 · chi guida e chi siede accanto, prima e dopo (F0-F3)', font=f1, fill='#1a1a1a')
dr.text((20, 62), f"Sonda F0 senza browser: {S0['secondi']} s di gioco a ore {', '.join(str(o['ora']) for o in S0['ore'])} (una partita per ora, seme {S0['seme']}, due guide forzate ogni 15 s). "
        f"Foto: {len(rows)} mezzi, camera dal lato del guidatore a 10/45/80 m, 960×540 ridotte, deviceScaleFactor 1.", font=f2, fill='#333')
y = 110
cols = [20, 720, 960, 1200, 1440]
dr.text((cols[0], y), 'conto (somma delle quattro ore)', font=f2, fill='#1a1a1a'); dr.text((cols[1], y), 'prima', font=f2, fill='#1a1a1a'); dr.text((cols[2], y), 'dopo', font=f2, fill='#1a1a1a')
if P0 and P1: dr.text((cols[3], y), 'prima, provocata', font=f2, fill='#1a1a1a'); dr.text((cols[4] + 60, y), 'dopo, provocata', font=f2, fill='#1a1a1a')
y += 34
for lab, k, fm in NUM:
    a, b = S0['totale'].get(k, '-'), S1['totale'].get(k, '-')
    dr.text((cols[0], y), lab, font=f2, fill='#333'); dr.text((cols[1], y), fm(a) if a != '-' else '-', font=f3, fill='#8a1010' if a not in (0, '-') else '#1a1a1a'); dr.text((cols[2], y), fm(b) if b != '-' else '-', font=f3, fill='#1a6a2a' if b == 0 else '#1a1a1a')
    if P0 and P1: pa, pb = P0['totale'].get(k, '-'), P1['totale'].get(k, '-'); dr.text((cols[3], y), fm(pa) if pa != '-' else '-', font=f3, fill='#333'); dr.text((cols[4] + 60, y), fm(pb) if pb != '-' else '-', font=f3, fill='#333')
    y += 30
ra, rb = JA.get('riassunto', {}), JB.get('riassunto', {})
dr.text((cols[0], y + 6), f"cima della figura sopra il tetto (porta.yw + 5 cm, o il tetto vero): prima {ra.get('sopraIlTetto')} foto su {ra.get('conMisura')} misurate (+{ra.get('nessuno', 0)} senza nessuno al volante, rider npc:<id>), margine minimo {ra.get('margineMin')} m · dopo {rb.get('sopraIlTetto')} su {rb.get('conMisura')} (+{rb.get('nessuno', 0)} senza autista), margine minimo {rb.get('margineMin')} m", font=f2, fill='#1a1a1a')
y = hdr + 10
for j, (lab, d) in enumerate([('PRIMA', x) for x in D] + [('DOPO', x) for x in D]):
    dr.text((300 + j * TW + 10, y), f'{lab} · {d} m', font=f2, fill='#8a1010' if lab == 'PRIMA' else '#1a6a2a')
y += 40
byA = {(s['i'], s['d']): s for s in JA['shots']}; byB = {(s['i'], s['d']): s for s in JB['shots']}
def lab_fig(s):
    if not s or not s.get('guida'): return 'niente'
    g = s['guida']; t = f"{g.get('chi')}"
    if g.get('margine') is not None: t += f" {g['margine'] * 100:+.0f} cm"
    a = s.get('accanto')
    if a and a.get('chi') not in (None, 'nessuno'): t += f" · acc. {a['chi']}" + (f" {a['margine'] * 100:+.0f}" if a.get('margine') is not None else '')
    return t
for i in rows:
    s0 = byB.get((i, 10)) or byA.get((i, 10)) or {}
    dr.text((20, y + 20), f"{i + 1}. {s0.get('kind', '?')}", font=f1 if len(s0.get('kind', '')) < 9 else f2, fill='#1a1a1a')
    dr.text((20, y + 70), f"{s0.get('ruolo', '')}", font=f2, fill='#333'); dr.text((20, y + 98), f"{s0.get('modello', '')}", font=f2, fill='#555')
    if s0.get('chi'): dr.text((20, y + 126), f"rider npc:{s0['chi']}", font=f3, fill='#555')
    for j, (src, J, by) in enumerate([(A, JA, byA)] * 3 + [(B, JB, byB)] * 3):
        d = D[j % 3]; s = by.get((i, d)); x = 300 + j * TW
        if s and os.path.exists(os.path.join(src, s['file'])):
            im = Image.open(os.path.join(src, s['file'])).convert('RGB').resize((TW - 6, TH - 6), Image.LANCZOS); img.paste(im, (x, y))
        t = lab_fig(s); bad = s and s.get('guida') and s['guida'].get('margine') is not None and s['guida']['margine'] < 0
        dr.text((x + 4, y + TH - 2), t, font=f3, fill='#8a1010' if bad else '#1a1a1a')
    y += TH + 34
assert W <= 8000 and H <= 8000, (W, H)
img.save(OUT, quality=88); print(OUT, W, H)
