# [peso] Lo scarto fra due giri del banco del peso (strumenti/banco_peso.js), fuori dal browser:
#   python3 strumenti/banco_diff.py <cartella A> <cartella B> [<cartella delle differenze>]
# Per ogni foto che c'è in tutte e due: media dello scarto assoluto (0-255, sui tre canali), % di pixel con uno scarto oltre 8 su almeno un
# canale, scarto massimo; con la terza cartella anche l'immagine della differenza (×8).
import sys, os
from PIL import Image
import numpy as np
A, B = sys.argv[1], sys.argv[2]
D = sys.argv[3] if len(sys.argv) > 3 else None
if D: os.makedirs(D, exist_ok=True)
SOGLIA = 8
print('| foto | media | oltre 8 | max |\n|---|---|---|---|')
for f in sorted(os.listdir(A)):
    if not f.endswith('.png') or f.endswith('_diff.png') or not os.path.exists(os.path.join(B, f)): continue
    a = np.asarray(Image.open(os.path.join(A, f)).convert('RGB')).astype(np.int16)
    b = np.asarray(Image.open(os.path.join(B, f)).convert('RGB')).astype(np.int16)
    if a.shape != b.shape: print(f'| {f} | misure diverse | | |'); continue
    d = np.abs(a - b); m = d.max(axis=2)
    print(f'| {f[:-4]} | {d.mean():.3f} | {(m > SOGLIA).mean() * 100:.2f}% | {m.max()} |')
    if D: Image.fromarray(np.clip(d * 8, 0, 255).astype(np.uint8)).save(os.path.join(D, f[:-4] + '_diff.png'))
