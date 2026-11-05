# [fumetto] il foglio dell'identità: partenza · nuova senza ?stile · differenza ×4, e la quota di pixel diversi oltre 2 livelli
import os, json, numpy as np
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(H, 'f'); OUT = os.path.join(H, '..'); R = {}; rows = []
for p in ('piazza', 'lungomare'):
    a = np.asarray(Image.open(os.path.join(F, f'idbase_{p}_X.png')).convert('RGB')).astype(np.int16); b = np.asarray(Image.open(os.path.join(F, f'idnuovo_{p}_X.png')).convert('RGB')).astype(np.int16)
    d = np.abs(a - b); R[p] = {'diversi_oltre_2': round(float((d.max(2) > 2).mean() * 100), 2), 'diff_media': round(float(d.mean()), 3)}
    rows.append(np.concatenate([a, b, np.clip(d * 4, 0, 255)], 1).astype(np.uint8))
Image.fromarray(np.concatenate(rows, 0)).save(os.path.join(OUT, 'identita_A.jpg'), quality=85)
json.dump(R, open(os.path.join(OUT, 'identita_A.json'), 'w'), indent=1); print(R)
