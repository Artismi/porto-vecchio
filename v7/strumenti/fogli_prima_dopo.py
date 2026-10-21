# [percorsi2] I fogli prima/dopo: per ogni scorcio della galleria le due foto affiancate, il titolo e le misure (il contrasto del
# percorso, Weber centro/fianchi, e quanti campioni). Uso: python3 strumenti/fogli_prima_dopo.py <cartella prima> <cartella dopo> <uscita> [etichetta]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

prima, dopo, out = sys.argv[1:4]
etichetta = sys.argv[4] if len(sys.argv) > 4 else 'DOPO'
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
F1, F2 = font(22), font(15, False)
def misura(r):
    p = (r or {}).get('percorso') or {}
    t = p.get('tutto')
    s = f"contrasto del percorso {t['weber']:+.3f} su {t['campioni']} campioni" if t else 'contrasto del percorso: nessun campione in vista'
    if p.get('tetti'): s += f"  (tetti {p['tetti']['weber']:+.3f} su {p['tetti']['campioni']})"
    return s + f"   ·   luminosità {r['luminosita']}  contrasto {r['contrasto']}" if r else s
righe = []
for f in sorted(os.listdir(dopo)):
    if not f.endswith('.json') or f == 'galleria.json': continue
    nome = f[:-5]; a, b = os.path.join(prima, nome + '.png'), os.path.join(dopo, nome + '.png')
    if not (os.path.exists(a) and os.path.exists(b)): continue
    ra = json.load(open(os.path.join(prima, f))) if os.path.exists(os.path.join(prima, f)) else None
    rb = json.load(open(os.path.join(dopo, f)))
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    W = 1000; H = round(A.height * W / A.width); A, B = A.resize((W, H)), B.resize((W, H))
    top, cap, pad = 44, 30, 10
    S = Image.new('RGB', (2 * W + 3 * pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
    S.paste(A, (pad, top)); S.paste(B, (2 * pad + W, top))
    d.text((pad, 10), f"PRIMA  {rb.get('titolo', nome)}", fill='#e8e2d4', font=F1); d.text((2 * pad + W, 10), f"{etichetta}", fill='#e8e2d4', font=F1)
    d.text((pad, top + H + 6), misura(ra), fill='#a8b0b8', font=F2); d.text((2 * pad + W, top + H + 6), misura(rb), fill='#f0c890', font=F2)
    S.save(os.path.join(out, nome + '.png'))
    pa = ((ra or {}).get('percorso') or {}).get('tutto'); pb = (rb.get('percorso') or {}).get('tutto')
    righe.append({'scorcio': nome, 'titolo': rb.get('titolo'), 'prima': pa, 'dopo': pb})
    print(nome, 'prima', pa, 'dopo', pb)
json.dump(righe, open(os.path.join(out, 'misure.json'), 'w'), indent=1, ensure_ascii=False)
