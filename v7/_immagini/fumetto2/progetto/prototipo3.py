# [fumetto2] IL PROTOTIPO DEL PASSO, terza versione: «la via di mezzo» (BIBBIA_STILE.md). La seconda (prototipo2.py) appiattiva: «si mischia
# tutto e non si distinguono bene gli elementi». Qui la base è l'immagine di OGGI (A: la sua luce, le sue sfumature, l'ombra di contatto, la
# profondità) e sopra, con UNA manopola k (0 = A, 1 = il carattere della prima versione), quattro cose:
#   1. la tavolozza: la tinta e il croma tirati verso l'inchiostro più vicino della famiglia, il VALORE di A intatto (niente posterizzazione);
#   2. il tratteggio della prima versione, pulito: righe ancorate al mondo, antialiasate, solo nei medi e nelle ombre, mai sulle persone;
#   3. l'inchiostro sui bordi delle cose (salto di profondità, cambio di categoria), liscio, del peso della prima versione;
#   4. LA SEPARAZIONE: dove due cose vicine hanno lo stesso valore, la cosa dietro si scurisce in una fascia di pochi px lungo il bordo
#      (l'ombra portata del disegnatore), così ogni cosa si stacca dalla vicina.
# Nessuna diffusione, nessun liscio del colore della scena.   python3 prototipo3.py <cattura> <k> [uscita.png]
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo import carica, geometria, ss, vnoise, shift
from tavolozza import PAL, MEMB, oklab
HERE = os.path.dirname(os.path.abspath(__file__)); F = os.path.join(HERE, '..', 'sonde', 'f')
M1i = np.linalg.inv(np.array([[.4122214708, .5363325363, .0514459929], [.2119034982, .6806995451, .1073969566], [.0883024619, .2817188376, .6299787005]]))
M2i = np.linalg.inv(np.array([[.2104542553, .7936177850, -.0040720468], [1.9779984951, -2.4285922050, .4505937099], [.0259040371, .7827717662, -.8086757660]]))
def da_oklab(lab):
    l = (lab @ M2i.T) ** 3; lin = np.clip(l @ M1i.T, 0, 1); return np.where(lin <= .0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - .055)
def L(c): return c[..., 0] * .2126 + c[..., 1] * .7152 + c[..., 2] * .0722

def via(nome, k, base=None):
    c0, d, kc, sub, meta = carica(nome); H, W = d.shape
    A = np.asarray(Image.open(base or os.path.join(F, nome + '_A.png')).convert('RGB')).astype(np.float64) / 255.
    cam = meta['cam']; P, N, pw, M, ray = geometria(d, cam); sky = d >= min(cam['far'] * .97, 600)
    MM = meta['m']; zero = np.zeros((H, W), bool); pers = MM.get('pers', zero) | (kc == 4) | MM.get('gioc', zero); mezzi = MM.get('mezzi', zero)
    Minv = np.linalg.inv(M); dpl = max(2., -(Minv @ np.append(np.array(meta['player']['w']) + [0, 1, 0], 1))[2]) if meta['player']['piedi'][0] >= 0 else 6.; rel = d - dpl
    lab = oklab(A); Lv, a, b = lab[..., 0], lab[..., 1], lab[..., 2]; C = np.hypot(a, b); h = np.degrees(np.arctan2(b, a)) % 360

    # ---- 1. LA TAVOLOZZA, solo tinta e croma: l'inchiostro della famiglia più vicino in (a, b) a parità di valore; il valore resta quello di A
    fam = np.select([C < .03, (h >= 15) & (h < 100), (h >= 100) & (h < 172), (h >= 172) & (h < 285)], [0, 1, 3, 2], 4)
    PL = oklab(PAL); memb = MEMB.astype(float)
    D = .3 * (Lv[..., None] - PL[:, 0]) ** 2 + (a[..., None] - PL[:, 1]) ** 2 + (b[..., None] - PL[:, 2]) ** 2 + (1 - memb[fam].reshape(H, W, -1)) * 9
    i0 = np.argmin(D, -1); ta, tb = PL[i0, 1], PL[i0, 2]
    w = .85 * k * ss(.015, .05, C)                                       # i grigi veri restano grigi di valore; prendono la tinta del momento (sotto)
    a2 = a + (ta - a) * w; b2 = b + (tb - b) * w
    # i grigi (ardesia, pietra, asfalto) virano verso il lilla/piombo della tavolozza: la «carta» del fumetto, non il grigio del 3D
    gN = (1 - ss(.02, .06, C)) * k; a2 += (oklab(PAL[[3]])[0, 1] * 1.6 - a2) * gN * .7; b2 += (oklab(PAL[[3]])[0, 2] * 1.6 - b2) * gN * .7
    sat = 1 + .45 * k * ss(.05, .09, C)[..., None][..., 0]; a2 *= sat; b2 *= sat   # (solo le cose già colorate: i giunti bruni del lastrico non diventano righe rosse)                               # il colore spray, mai sul valore
    Lc = .5 + (Lv - .5) * (1 + .22 * k)                                   # un filo più di contrasto (il valore di A, solo più deciso)
    c = da_oklab(np.stack([Lc, a2, b2], -1))

    # ---- 2. IL TRATTEGGIO, ancorato al piano della faccia (asse dominante della normale, coordinate locali), righe antialiasate, solo medi e ombre
    an = np.abs(N); P0 = P - np.floor(P.reshape(-1, 3).mean(0) / 64) * 64
    xz = an[..., 1] > np.maximum(an[..., 0], an[..., 2]); zy = ~xz & (an[..., 0] > an[..., 2])
    U = np.where(xz, P0[..., 0], np.where(zy, P0[..., 2], P0[..., 0])); V = np.where(xz, P0[..., 2], P0[..., 1])
    ang = np.radians(np.where(kc == 1, 30, np.where(kc == 2, 68, np.where(kc == 3, -40, 45))))
    def righe(da, passo, largh):   # passo a schermo da 6 a 12 px (a 540), ottave annidate, sotto 5 px svanisce; riga larga largh px, bordo di 1 px
        x0 = (U * np.cos(ang + da) + V * np.sin(ang + da)) / passo + (vnoise(U / .6 + 3.1, V / .6 + 7.7) - .5) * .12
        gy, gx = np.gradient(x0); g0 = np.hypot(gx, gy); st = np.stack([shift(g0, dy, dx) for dy in (-3, 0, 3) for dx in (-3, 0, 3)]); g0 = np.maximum(np.median(st, 0), 1e-5)
        ot = np.clip(np.floor(np.log2(1 / g0 / 12)) + 1, 0, 4); x = x0 * 2 ** ot; g = g0 * 2 ** ot
        return (1 - ss(largh / 2 - .5, largh / 2 + .5, np.abs(x - np.round(x)) / g)) * ss(5, 7, 1 / g)
    Yv = L(c); vivo = ~pers & ~mezzi & ~sky & (rel < 14)
    sopra = np.where((kc == 3) | (kc == 1), .7, .55)                     # tetti e lastrico: il tratteggio anche nei medi chiari (il carattere della prima versione)
    t1 = righe(0, .12, 1.4) * ss(sopra, sopra - .2, Yv); t2 = righe(np.pi / 2, .12, 1.4) * ss(.32, .18, Yv)
    hk = (t1 * (.22 + .3 * ss(.5, .3, Yv)) + t2 * .3) * vivo * k          # nei medi la riga scurisce del 8-17%, in ombra del 18-39% (k .35-.75)
    c = c * (1 - hk[..., None])

    # ---- 3. I BORDI DELLE COSE: salto di profondità (verso la cosa davanti) e cambio di categoria (muro/tetto/suolo/persona)
    jmax = np.zeros((H, W)); cat = np.where(pers, 4, kc)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): jmax = np.maximum(jmax, (shift(d, dy, dx) - d) / d)
    sil = (jmax > .03) & ~sky
    catb = np.zeros((H, W), bool)
    for dy, dx in ((0, 1), (1, 0)): catb |= (shift(cat, dy, dx, -1) != cat) & (shift(cat, dy, dx, -1) >= 0) & (np.abs(shift(d, dy, dx, 1e9) / d - 1) < .03)
    # (il retino della camera7 e i trattini corti: niente)
    alt = sum((np.abs(shift(d, dy, dx, 0) / d - 1) > .1).astype(float) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))) >= 2
    dm = sum(shift(alt, dy, dx, False).astype(float) for dy in range(-2, 3) for dx in range(-2, 3)) / 25 > .22
    sil &= ~dm; catb &= ~dm
    R = np.where(sil, (.7 + 1.6 * k) * (1 + .6 * (1 - ss(6, 30, rel))) * np.where(mezzi, 1.25, 1), np.where(catb, .7 + .5 * k, -9.))
    R = np.where(sil & pers, np.minimum(R, .6 + .5 * k), R)               # le persone sono piccole (30-60 px): il filo sottile, se no l'inchiostro le riempie
    Fd = np.full((H, W), 99.)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            r0 = np.hypot(dy, dx)
            if r0 > 3.5: continue
            Rs = shift(R, dy, dx, -9.); ok = d <= shift(d, dy, dx, 1e9) * 1.03
            Fd = np.minimum(Fd, np.where((Rs > 0) & ok, r0 - Rs, 99.))
    ink = (1 - ss(-.5, .5, Fd)) * (1 - ss(20, 60, rel) * .6)
    inkc = np.array([.086, .071, .106])

    # ---- 4. LA SEPARAZIONE: a 3 px dall'altra parte di ogni sagoma (la cosa dietro) il valore della cosa davanti; se sono vicini (< .12),
    # la cosa dietro si scurisce in una fascia di ~4 px (più vicini, più scura): l'ombra portata del disegnatore
    sep = np.zeros((H, W)); Yc = L(c)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        for r in (1, 2, 3, 4):
            front = shift(sil, -dy * r, -dx * r, False)                    # c'è una sagoma a r px in quella direzione, e io sto dietro di lei
            dfr = shift(d, -dy * r, -dx * r, 0); dietro = front & (d > dfr * 1.03)
            Yf = shift(Yc, -dy * (r + 2), -dx * (r + 2)); simile = .45 + .55 * (1 - ss(.05, .16, np.abs(Yf - Yc)))   # sempre un po', di più se simili
            sep = np.maximum(sep, dietro * simile * (1 - (r - 1) / 5))
    sep *= ~pers
    c = c * (1 - (.42 * k + .06) * sep[..., None])
    # il bordo di luce dentro la cosa davanti (1-2 px, dalla parte del bordo): la sagoma si stacca anche dove il fondo è più chiaro
    rim = np.zeros((H, W))
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        for r in (1, 2):
            dietro_v = (shift(d, -dy * (r + 1), -dx * (r + 1), 0) > d * 1.06)
            rim = np.maximum(rim, dietro_v * (1 - (r - 1) / 2))
    rim *= ~pers & ~sky & (rel < 20)
    c = c + (1 - c) * (.18 * k * rim)[..., None]
    # i piani per categoria (la gerarchia di CAT, più decisa): i tetti un gradino sotto, i muri un gradino sopra il suolo
    kv = np.select([kc == 3, kc == 2], [1 - .1 * k, 1 + .06 * k], 1.)
    c = c * kv[..., None]
    c = c * (1 - ink[..., None]) + inkc * ink[..., None]
    # le persone: il bollino di carta (la prima versione), fino a 1,5 px fuori dal contorno, più largo per il personaggio
    gi = MM.get('gioc', zero); bol = np.zeros((H, W))
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            r0 = np.hypot(dy, dx)
            if r0 > 3.2: continue
            bol = np.maximum(bol, shift(gi, dy, dx, False) * (1 - ss(2.6 * k + 1.3, 2.6 * k + 2.1, r0)) + shift(pers & ~gi, dy, dx, False) * (1 - ss(.8 * k + .4, .8 * k + 1.2, r0)) * .0)
    bol *= ~pers & (ink < .5)
    c = c * (1 - bol[..., None]) + np.array([.949, .906, .812]) * bol[..., None]
    return np.clip(c, 0, 1), dict(sil=sil, catb=catb, pers=pers)

def separazione(img, nome):
    """contrasto medio di valore ATTRAVERSO i bordi delle cose (coppie di pixel a ±2 px da un bordo di profondità o di categoria) contro DENTRO
    le cose (coppie alla stessa distanza, senza bordo in mezzo). Più alto il rapporto, più ogni cosa si stacca dalla vicina"""
    c0, d, kc, sub, meta = carica(nome); H, W = d.shape
    im = np.asarray(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float64) / 255. if img.shape[0] != H else img
    Y = L(im); MM = meta['m']; pers = MM.get('pers', np.zeros((H, W), bool)) | (kc == 4); cat = np.where(pers, 4, kc)
    acr, ins = [], []
    for dy, dx in ((0, 3), (3, 0)):
        Ya, Yb = shift(Y, dy, dx), shift(Y, -dy, -dx); da_, db_ = shift(d, dy, dx, 1), shift(d, -dy, -dx, 1); ca, cb = shift(cat, dy, dx, -1), shift(cat, -dy, -dx, -1)
        bordo = (np.abs(da_ / db_ - 1) > .06) | (ca != cb)
        dentro = (np.abs(da_ / db_ - 1) < .01) & (ca == cb)
        m = np.ones((H, W), bool); m[:6] = m[-6:] = False; m[:, :6] = m[:, -6:] = False
        acr.append(np.abs(Ya - Yb)[bordo & m]); ins.append(np.abs(Ya - Yb)[dentro & m])
    a_, i_ = np.concatenate(acr).mean(), np.concatenate(ins).mean()
    return dict(attraverso=round(float(a_), 4), dentro=round(float(i_), 4), rapporto=round(float(a_ / max(i_, 1e-4)), 2))
def separazione2(img, nome):
    # la stessa misura sull'immagine sfocata 5×5: conta le masse (quanto una cosa si stacca dalla vicina), non la trama dentro le cose
    k = np.zeros_like(img)
    for dy in range(-2, 3):
        for dx in range(-2, 3): k += shift(img, dy, dx)
    return separazione(k / 25, nome)

if __name__ == '__main__':
    o, _ = via(sys.argv[1], float(sys.argv[2])); Image.fromarray((o * 255).astype(np.uint8)).save(sys.argv[3] if len(sys.argv) > 3 else '/tmp/v.png')
