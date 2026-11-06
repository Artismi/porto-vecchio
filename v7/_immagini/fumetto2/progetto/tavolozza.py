# [fumetto2] LA TAVOLOZZA UNICA di Porto Vecchio (BIBBIA_STILE.md §1): 16 inchiostri del mondo + 3 riservati al gioco. Fonte unica: il prototipo
# (prototipo.py) e l'implementazione leggono di qui.
import numpy as np
INK = [  # nome, hex, ruolo, famiglie (N neutri, C caldi, F freddi, V verdi, M rosa-viola): un pixel sceglie solo fra gli inchiostri della sua famiglia
    ('carta',      '#F2E7CF', 'carta: luci, intonaco chiaro al sole, fasce chiare del cielo', 'NCFVM'),
    ('osso',       '#D2C2A6', 'pietra e lastrico al sole, intonaco neutro', 'NC'),
    ('sasso',      '#A89C92', 'pietra a mezza luce, lastrico in ombra chiara', 'N'),
    ('piombo',     '#7C7186', 'pietra in ombra, asfalto, ardesia', 'N'),
    ('lavagna',    '#3D3548', 'ombra fonda prima del nero', 'NM'),
    ('nero',       '#16121B', 'inchiostro: contorni, ombre piene', 'NCFVM'),
    ('pesca',      '#F0BE8C', 'intonaco caldo al sole, pelle chiara', 'C'),
    ('ocra',       '#DC9A34', 'muri ocra, luce dorata', 'C'),
    ('cotto',      '#C25B36', 'tetti, mattoni, muri rossi', 'C'),
    ('mattone',    '#6F2B2E', 'cotto in ombra, ombra calda', 'CM'),
    ('cielo',      '#A3D4D8', 'cielo, acqua chiara, fondale di giorno', 'F'),
    ('acqua',      '#2A8A8A', 'mare vicino, rame, la notte verde acqua', 'FV'),
    ('oltremare',  '#2F60B5', 'mare, persiane blu, ombra fredda', 'F'),
    ('notte',      '#202D5E', 'notte, ombra fredda fonda', 'FVM'),
    ('salvia',     '#93B27C', 'chiome al sole, insegne chiare', 'V'),
    ('persiana',   '#3F8A50', 'persiane, chiome, insegne verdi', 'V'),
    ('bosco',      '#34532F', 'chiome in ombra, verde scuro, vegetazione', 'V'),
    ('lilla',      '#A68FB6', 'il lastrico e le ombre della sera, l\'ombra chiara', 'NM'),
    ('rosa',       '#E04B8C', 'graffiti, accento del crepuscolo', 'M'),
    ('viola',      '#6B3D9B', 'graffiti, ombra del crepuscolo', 'M'),
]
RISERVATI = [
    ('vermiglio',  '#F04A23', 'SOLO il personaggio (giacca) e i suoi segni', ''),
    ('limone',     '#FFE03A', 'SOLO obiettivo, guida, oggetti da prendere', ''),
    ('allarme',    '#FF2E5E', 'SOLO pericolo: polizia ostile, armi, danno', ''),
]
FAM = 'NCFVM'; FAMHUE = {'C': (15, 100), 'V': (100, 172), 'F': (172, 285), 'M': (285, 375)}   # i settori della tinta Oklab (gradi)
def hexrgb(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) / 255. for i in (0, 2, 4)])
def srgb2lin(c): c = np.asarray(c, float); return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def lin2srgb(c): c = np.clip(c, 0, 1); return np.where(c <= .0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - .055)
M1 = np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]])
M2 = np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]])
def oklab(rgb):   # rgb sRGB 0..1, (..., 3)
    l = srgb2lin(rgb) @ M1.T; return np.cbrt(np.maximum(l, 0)) @ M2.T
PAL = np.array([hexrgb(x[1]) for x in INK]); PALR = np.array([hexrgb(x[1]) for x in RISERVATI])
MEMB = np.array([[f in x[3] for x in INK] for f in FAM])   # famiglia × inchiostro
IDX = {x[0]: i for i, x in enumerate(INK)}; IDXR = {x[0]: i for i, x in enumerate(RISERVATI)}
if __name__ == '__main__':
    for (n, h, r, f), lab in zip(INK + RISERVATI, oklab(np.concatenate([PAL, PALR]))):
        C = np.hypot(lab[1], lab[2]); hue = np.degrees(np.arctan2(lab[2], lab[1])) % 360
        print(f'{n:10s} {h}  L {lab[0]:.2f}  C {C:.3f}  h {hue:5.1f}  {f}')
