# [visuale4] I fogli a confronto per il committente: per ogni inquadratura della galleria (GALLERIA_VARIANTI=strumenti/visuale4_varianti.json)
# le quattro visuali affiancate sulla stessa scena e nello stesso istante: il taglio di oggi, l'ellisse, A (la camera che si adatta) e
# B (il muretto), col titolo e le misure (luminosità, contrasto, draw call). Con la striscia del movimento (strumenti/striscia_visuale4.js)
# anche striscia_camera.png: i cinque fotogrammi dalla via nel vicolo e fuori, con la pendenza di ognuno.
# Uso: python3 strumenti/fogli_visuale4.py <cartella della galleria> <uscita> [cartella della striscia]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1:3]
striscia = sys.argv[3] if len(sys.argv) > 3 else None
VAR = [('taglio', 'TAGLIO (oggi, [visuale3])'), ('ellisse', 'ELLISSE ([varco2])'), ('camera', 'A · CAMERA che si adatta + tetto + sagoma'), ('muretto', 'B · MURETTO + sagoma')]
os.makedirs(out, exist_ok=True)
def font(sz, bold=True):
    f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
F1, F2, F3 = font(24), font(17), font(14, False)
fatti = []
if os.path.isdir(os.path.join(src, 'camera')):
    nomi = sorted(f[:-4] for f in os.listdir(os.path.join(src, 'camera')) if f.endswith('.png') and f != 'galleria.png')
    for nome in nomi:
        ims, rec = [], []
        for v, _ in VAR:
            p = os.path.join(src, v, nome + '.png')
            ims.append(Image.open(p).convert('RGB') if os.path.exists(p) else None)
            j = os.path.join(src, v, nome + '.json'); rec.append(json.load(open(j)) if os.path.exists(j) else None)
        if not any(ims): continue
        ref = next(i for i in ims if i); W = 800; H = round(ref.height * W / ref.width); top, cap, pad = 74, 26, 10
        # due righe per due: si confrontano a coppie (oggi sopra, i prototipi sotto)
        S = Image.new('RGB', (2 * W + 3 * pad, top + 2 * (H + cap + 30) + pad), '#16181c'); d = ImageDraw.Draw(S)
        tit = next((r['titolo'] for r in rec if r), nome)
        d.text((pad, 12), tit, font=F1, fill='#e8e2d4')
        d.text((pad, 44), 'sopra: le visuali di oggi · sotto: i due prototipi', font=F3, fill='#a8b0b8')
        for k, ((v, lab), im, r) in enumerate(zip(VAR, ims, rec)):
            x = pad + (k % 2) * (W + pad); y = top + (k // 2) * (H + cap + 30)
            d.text((x, y), lab, font=F2, fill='#f0c890' if v in ('camera', 'muretto') else '#c8c0b0')
            if im: S.paste(im.resize((W, H)), (x, y + 24))
            if r: d.text((x, y + 24 + H + 4), f"lum {r['luminosita']}  contr {r['contrasto']}  neri {r['quasiNeri']}%  dc {r['drawCall']}", font=F3, fill='#a8b0b8')
        f = os.path.join(out, nome + '.png'); S.save(f); fatti.append(f); print(f)
if striscia and os.path.exists(os.path.join(striscia, 'striscia.json')):
    J = json.load(open(os.path.join(striscia, 'striscia.json')))
    ims = [Image.open(os.path.join(striscia, f'f{i + 1}.png')).convert('RGB') for i in range(len(J['foto'])) if os.path.exists(os.path.join(striscia, f'f{i + 1}.png'))]
    if ims:
        W = 620; H = round(ims[0].height * W / ims[0].width); top, cap, pad = 74, 44, 8
        S = Image.new('RGB', (len(ims) * (W + pad) + pad, top + H + cap + pad), '#16181c'); d = ImageDraw.Draw(S)
        d.text((pad, 12), 'A · la camera che si adatta: dalla Via della Vittoria dentro il Vico dei Bottai e fuori', font=F1, fill='#e8e2d4')
        d.text((pad, 44), f"cammino di {J['durata']:.1f} s a 1,4 m/s; la stretta cambia a {', '.join(str(c) + ' s' for c in J['cambi'])} (smorzamento 0,26 s, uscita dopo 0,8 s sotto soglia)", font=F3, fill='#a8b0b8')
        for k, (im, f) in enumerate(zip(ims, J['foto'])):
            x = pad + k * (W + pad); S.paste(im.resize((W, H)), (x, top))
            d.text((x + 4, top + H + 4), f"{k + 1}. {f['nome']}", font=F2, fill='#f0c890')
            d.text((x + 4, top + H + 24), f"pendenza {f['p']:.2f} rad · zoom {f['zoom']:.2f} · largo {f['larg']:.1f} m", font=F3, fill='#a8b0b8')
        f = os.path.join(out, 'striscia_camera.png'); S.save(f); print(f)
