# [segnaletica] I fogli di confronto della segnaletica: dalle foto di strumenti/segnaletica_foto.js (<nome>_prima.png, <nome>_dopo.png,
# misure.json) pochi fogli JPEG compressi in _immagini/segnaletica/ (niente cartelle di foto grezze).
#   python3 strumenti/fogli_segnaletica.py <uscita.jpg> <titolo> <cartella:nome[:solo]> [<cartella:nome[:solo]> ...]
#   ":solo" mette solo la foto dopo (per i dettagli e la notte); senza, prima e dopo affiancate.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

def font(sz, bold=False):
    for f in (['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'] if bold else []) + ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()

def main():
    out, titolo, voci = sys.argv[1], sys.argv[2], sys.argv[3:]
    W = 900   # la larghezza di una foto nel foglio
    righe = []
    for v in voci:
        parti = v.split(':'); cart, nome, solo = parti[0], parti[1], len(parti) > 2
        mis = {}
        mj = os.path.join(cart, 'misure.json')
        if os.path.exists(mj): mis = json.load(open(mj)).get(nome, {})
        foto = [('dopo', os.path.join(cart, nome + '_dopo.png'))] if solo else [('prima', os.path.join(cart, nome + '_prima.png')), ('dopo', os.path.join(cart, nome + '_dopo.png'))]
        imgs = []
        for et, f in foto:
            im = Image.open(f).convert('RGB'); im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS); imgs.append((et, im))
        c = mis.get('campo') or {}
        nota = (mis.get('titolo') or nome) + ('' if not c else f"  ·  mesh della segnaletica in campo: {c.get('inCampo')} (di {c.get('totale')})")
        if mis.get('prima') and mis.get('dopo'): nota += f"  ·  chiamate della scena {mis['prima']['calls']} → {mis['dopo']['calls']}"
        righe.append((nota, imgs))
    cols = max(len(r[1]) for r in righe); H0 = 70
    hh = sum(r[1][0][1].height + 46 for r in righe)
    foglio = Image.new('RGB', (cols * W + (cols + 1) * 12, H0 + hh + 12), (24, 24, 28)); d = ImageDraw.Draw(foglio)
    d.text((14, 18), titolo, fill=(240, 236, 226), font=font(30, True))
    y = H0
    for nota, imgs in righe:
        d.text((14, y + 8), nota, fill=(214, 206, 190), font=font(19))
        for i, (et, im) in enumerate(imgs):
            x = 12 + i * (W + 12); foglio.paste(im, (x, y + 38))
            if len(imgs) > 1: d.rectangle([x + 8, y + 46, x + 120, y + 78], fill=(20, 20, 24)); d.text((x + 16, y + 49), et.upper(), fill=(255, 210, 90) if et == 'dopo' else (200, 200, 200), font=font(22, True))
        y += imgs[0][1].height + 46
    foglio.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
    print(out, foglio.size, os.path.getsize(out) // 1024, 'KB')

main()
