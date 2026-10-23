# [pulizia] I fogli del prima e dopo della passata del rumore: per ogni inquadratura le due foto affiancate col titolo, e un foglio
# riassuntivo coi numeri del censimento (strumenti/rumore.js: il json acceso e quello spento) e coi modelli rifatti.
# Uso: python3 strumenti/fogli_pulizia.py <cartella prima> <cartella dopo> <uscita> [rumore.json] [scene.json]
# Le foto escono in JPEG compresso (larghe 1600 px), per stare leggere nel repo.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

prima, dopo, out = sys.argv[1:4]
rum = json.load(open(sys.argv[4])) if len(sys.argv) > 4 and os.path.exists(sys.argv[4]) else None
scene = json.load(open(sys.argv[5])) if len(sys.argv) > 5 and os.path.exists(sys.argv[5]) else None
titoli = {s['nome']: s.get('titolo', s['nome']) for s in (scene or {}).get('scorci', [])}
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(24), font(16, False), font(18)
BG, INK, MUT, ACC = '#16181c', '#f0e6d0', '#a89fbd', '#ffb35c'
nomi = sorted(f[:-4] for f in os.listdir(dopo) if f.endswith('.png') and f != 'galleria.png' and os.path.exists(os.path.join(prima, f)))
fatti = []
for nome in nomi:
    A, B = Image.open(os.path.join(prima, nome + '.png')).convert('RGB'), Image.open(os.path.join(dopo, nome + '.png')).convert('RGB')
    W = 790; H = round(A.height * W / A.width); A, B = A.resize((W, H), Image.LANCZOS), B.resize((W, H), Image.LANCZOS)
    top, pad = 50, 10
    S = Image.new('RGB', (2 * W + 3 * pad, top + H + pad), BG); d = ImageDraw.Draw(S)
    d.text((pad, 12), titoli.get(nome, nome), font=F1, fill=INK)
    S.paste(A, (pad, top)); S.paste(B, (2 * pad + W, top))
    for x, t, c in ((pad, 'PRIMA', MUT), (2 * pad + W, 'DOPO', ACC)):
        d.rectangle((x + 8, top + 8, x + 8 + d.textlength(t, font=F3) + 16, top + 38), fill=BG); d.text((x + 16, top + 12), t, font=F3, fill=c)
    p = os.path.join(out, nome + '.jpg'); S.save(p, quality=80, optimize=True); fatti.append(p)
# il foglio dei numeri
if rum:
    pr, dp, nu = rum['prima'], rum['dopo'], rum.get('numeri') or {}
    righe = [('IL RUMORE DELLA CITTÀ NUOVA: prima e dopo la passata (src/pulizia_rumore.js)', F1, INK), ('', F2, INK)]
    righe.append((f"voci censite {pr['voci']} → {dp['voci']}   ·   facciate {pr['facciate']}   ·   voci esterne fisse: " + ', '.join(f'{k} {v}' for k, v in (pr.get('esterni') or {}).items()), F2, MUT))
    righe.append(('', F2, INK))
    righe.append((f"{'rumore':<18}{'prima':>8}{'dopo':>8}", F3, ACC))
    for t in pr['per']: righe.append((f"{t:<18}{pr['per'][t]:>8}{dp['per'][t]:>8}", font(18, False), INK))
    righe.append((f"{'totale':<18}{pr['tot']:>8}{dp['tot']:>8}", F3, INK)); righe.append(('', F2, INK))
    righe.append((f"tolti {nu.get('tolti', 0)}   ·   ruotati {nu.get('ruotati', 0)}   ·   spostati {nu.get('spostati', 0)}   ·   posati a terra {nu.get('posati', 0)}   ·   lasciati (fissi, posti delle persone) {nu.get('tenuti', 0)}", F3, ACC))
    for k in ('tolti', 'ruotati', 'spostati'):
        v = (rum.get('azioni') or {}).get(k) or {}
        righe.append((f"  {k}: " + ', '.join(f'{a} {b}' for a, b in sorted(v.items(), key=lambda q: -q[1])), F2, MUT))
    dpr, ddp = pr.get('densita') or {}, dp.get('densita') or {}
    if dpr: righe.append((f"facciate oltre la densità leggibile {dpr['facciate']['piene']} → {ddp['facciate']['piene']}   ·   tratti di marciapiede pieni {dpr['tratti']['piene'] if 'piene' in dpr['tratti'] else dpr['tratti']['pieni']} → {ddp['tratti']['pieni']}", F2, MUT))
    c = rum.get('compenetrazioni') or {}
    if c: righe.append((f"compenetrazioni del regista dopo: {c['dopo']['tot']} (come prima della passata)   ·   sui tetti: {rum.get('tetti3')}", F2, MUT))
    at = pr.get('atlanti')
    if at: righe.append((f"atlante dei modelli: {at['FA']} celle su {at.get('FAmax', 512)} (prima 1287 chiavi su 256: dalla 256ª tutte sullo stesso colore)", F2, MUT))
    Wt, Ht = 1600, 40 + 30 * len(righe)
    S = Image.new('RGB', (Wt, Ht), BG); d = ImageDraw.Draw(S); y = 20
    mono = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
    for t, f, col in righe:
        if f in (F3,) or (t.startswith(('rumore', 'totale')) or (len(t) > 2 and t[:18].strip() in pr['per'])):
            f = ImageFont.truetype(mono, 18) if os.path.exists(mono) and (t[:18].strip() in pr['per'] or t.startswith(('rumore', 'totale'))) else f
        d.text((20, y), t, font=f, fill=col); y += 30
    p = os.path.join(out, '00_numeri.jpg'); S.save(p, quality=85, optimize=True); fatti.append(p)
print('\n'.join(fatti))
