# [direzione] Un ritaglio ingrandito della stessa zona da più foto, affiancate (il dettaglio: le dosi, le linee su una facciata).
# Uso: python3 strumenti/ritagli_direzione.py <uscita.jpg> <x0,y0,x1,y1> <scala> <etichetta1>=<foto1> <etichetta2>=<foto2> [...]
import os, sys
from PIL import Image, ImageDraw, ImageFont

out, box, k = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(',')), float(sys.argv[3])
cols = [a.split('=', 1) for a in sys.argv[4:]]
f = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
F = ImageFont.truetype(f, 20) if os.path.exists(f) else ImageFont.load_default()
W, H = round((box[2] - box[0]) * k), round((box[3] - box[1]) * k); pad, top = 8, 34
S = Image.new('RGB', (len(cols) * W + (len(cols) + 1) * pad, top + H + pad), '#16181c'); d = ImageDraw.Draw(S)
for i, (et, p) in enumerate(cols):
    x = pad + i * (W + pad); S.paste(Image.open(p).convert('RGB').crop(box).resize((W, H), Image.LANCZOS), (x, top)); d.text((x, 7), et, fill='#f2efe8', font=F)
os.makedirs(os.path.dirname(out) or '.', exist_ok=True); S.save(out, quality=90); print('ritaglio', out)
