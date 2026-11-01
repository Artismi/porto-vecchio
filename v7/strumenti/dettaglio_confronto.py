# [dettaglio] il prima e il dopo affiancati, con un ritaglio ingrandito: python3 strumenti/dettaglio_confronto.py prima.png dopo.png uscita.png [x0 y0 x1 y1]
import sys
from PIL import Image, ImageDraw
a, b, out = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB'), sys.argv[3]
box = tuple(int(v) for v in sys.argv[4:8]) if len(sys.argv) >= 8 else None
if box:
    k = max(1, min(4, 900 // (box[2] - box[0])))
    a = a.crop(box).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.LANCZOS)
    b = b.crop(box).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.LANCZOS)
W, H = a.size
o = Image.new('RGB', (W * 2 + 8, H + 22), (24, 24, 24)); o.paste(a, (0, 22)); o.paste(b, (W + 8, 22))
d = ImageDraw.Draw(o); d.text((6, 5), 'prima', fill=(240, 240, 240)); d.text((W + 14, 5), 'dopo', fill=(240, 240, 240))
o.save(out); print(out, o.size)
