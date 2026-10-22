# [visuale4] I fogli a confronto per il committente: per ogni inquadratura tre visuali affiancate sulla stessa inquadratura e alla stessa
# ora: il taglio di oggi, A (la camera che si adatta, il tetto che sbiadisce, la sagoma) e B (il muretto, la sagoma). L'ellisse il
# committente la conosce già: resta nel gioco (?visuale=ellisse) ma non nei fogli. Con la striscia del movimento
# (strumenti/striscia_visuale4.js) anche striscia_camera.png: tre fotogrammi (sulla via, in fondo al vicolo, appena fuori) con la pendenza.
# Uso: python3 strumenti/fogli_visuale4.py <uscita> <striscia | -> <cartella galleria> [<cartella galleria> ...]
#   ogni foto <variante>/<scorcio>.png si cerca nelle cartelle della galleria in ordine: vince l'ultima che ce l'ha
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

out, striscia, srcs = sys.argv[1], sys.argv[2], sys.argv[3:]
VAR = [('taglio', 'TAGLIO (oggi, [visuale3])'), ('camera', 'A · CAMERA che si adatta + tetto + sagoma'), ('muretto', 'B · MURETTO + sagoma')]
SCORCI = ['w1_vicolo', 'w2_tetti_p4', 'w3_arco']
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(24), font(17), font(14, False)
def trova(v, nome, ext):
    p = None
    for s in srcs:
        q = os.path.join(s, v, nome + ext)
        if os.path.exists(q): p = q
    return p
for nome in SCORCI:
    ims, rec = [], []
    for v, _ in VAR:
        p = trova(v, nome, '.png'); ims.append(Image.open(p).convert('RGB') if p else None)
        j = trova(v, nome, '.json'); rec.append(json.load(open(j)) if j else None)
    if not any(ims): continue
    ref = next(i for i in ims if i); W = 760; H = round(ref.height * W / ref.width); top, cap, pad = 74, 26, 10
    S = Image.new('RGB', (3 * W + 4 * pad, top + 24 + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
    tit = next((r['titolo'] for r in rec if r), nome)
    d.text((pad, 12), tit, font=F1, fill='#e8e2d4')
    d.text((pad, 44), 'stessa inquadratura e stessa ora; la camera segue il personaggio come in gioco', font=F3, fill='#a8b0b8')
    for k, ((v, lab), im, r) in enumerate(zip(VAR, ims, rec)):
        x = pad + k * (W + pad)
        d.text((x, top), lab, font=F2, fill='#f0c890' if v != 'taglio' else '#c8c0b0')
        if im: S.paste(im.resize((W, H)), (x, top + 24))
        if r: d.text((x, top + 24 + H + 4), f"lum {r['luminosita']}  contr {r['contrasto']}  dc {r['drawCall']}", font=F3, fill='#a8b0b8')
    f = os.path.join(out, nome + '.png'); S.save(f); print(f)
if striscia != '-' and os.path.exists(os.path.join(striscia, 'striscia.json')):
    J = json.load(open(os.path.join(striscia, 'striscia.json')))
    scelti = [0, 2, 3]   # sulla via, in fondo al vicolo, appena fuori (la camera che torna giù)
    nomi = {0: 'sulla Vittoria', 2: 'in fondo al vicolo', 3: 'appena fuori (0,35 s)'}
    ims = [(Image.open(os.path.join(striscia, f'f{i + 1}.png')).convert('RGB'), J['foto'][i], nomi[i]) for i in scelti if os.path.exists(os.path.join(striscia, f'f{i + 1}.png'))]
    if ims:
        W = 760; H = round(ims[0][0].height * W / ims[0][0].width); top, cap, pad = 74, 44, 10
        S = Image.new('RGB', (len(ims) * (W + pad) + pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
        d.text((pad, 12), 'A · la camera che si adatta: dalla Via della Vittoria dentro il Vico dei Bottai e fuori', font=F1, fill='#e8e2d4')
        d.text((pad, 44), f"cammino di {J['durata']:.1f} s a 1,4 m/s; la stretta cambia a {', '.join(str(c) + ' s' for c in J['cambi'])} (smorzamento 0,26 s, uscita dopo 0,8 s sotto soglia)", font=F3, fill='#a8b0b8')
        for k, (im, f, lab) in enumerate(ims):
            x = pad + k * (W + pad); S.paste(im.resize((W, H)), (x, top))
            d.text((x + 4, top + H + 4), f"{k + 1}. {lab}", font=F2, fill='#f0c890')
            d.text((x + 4, top + H + 24), f"pendenza {f['p']:.2f} rad · zoom {f['zoom']:.2f} · largo {f['larg']:.1f} m", font=F3, fill='#a8b0b8')
        f = os.path.join(out, 'striscia_camera.png'); S.save(f); print(f)
