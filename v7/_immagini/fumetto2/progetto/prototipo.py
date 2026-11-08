# [fumetto2] IL PROTOTIPO DEL PASSO UNICO dello stile E (BIBBIA_STILE.md), fuori dal gioco: legge le catture vere (colore della scena prima del
# passo, distanza, categoria; sonde/cattura.js) e applica la bibbia, un pezzo per sezione. Ogni pezzo usa solo quello che il passo unico ha già
# (il colore della scena, la profondità, la categoria nell'alfa, la camera, il personaggio sullo schermo): niente bersagli né passate nuove.
#   python3 prototipo.py <nome cattura> <momento> [uscita.png]
import sys, json, os
import numpy as np
from PIL import Image
from tavolozza import PAL, PALR, IDX, IDXR, MEMB, oklab, hexrgb

HERE = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(HERE, '..', 'sonde', 'g')

# ---------------------------------------------------------------- §5 I SEI MOMENTI (la stessa tavolozza, pesata diversamente)
# bias: si somma alla distanza² in Oklab (negativo = l'inchiostro vince più spesso; .004 ~ spostare il confine di ~.03 ΔE)
# sh/hi: il viraggio delle ombre e delle luci (moltiplica, prima della tavolozza); sat, con: saturazione e contrasto; bk: il fondale (vicino, lontano);
# fondo: quanto il piano di fondo va verso il fondale; cielo: le tre fasce del cielo (alto, mezzo, orizzonte) e le colline
MOMENTI = {
    'mattino':     dict(wb=(.98, 1., 1.03), bias={'lilla': .003, 'acqua': -.004, 'cielo': -.002, 'pesca': -.0015, 'mattone': .002, 'viola': .004, 'rosa': .003},
                        sh=(.88, 1., 1.03), hi=(1.04, 1., .95), sat=1.08, con=1.06, bk=('cielo', 'carta'), fondo=.6,
                        cielo=('oltremare', 'cielo', 'carta', 'acqua'), umore='fresco e acquoso: il paese si sveglia, ombre verde acqua'),
    'mezzogiorno': dict(wb=(.95, .98, 1.07), bias={'lilla': .003, 'carta': -.003, 'osso': -.002, 'oltremare': -.004, 'lavagna': .002, 'viola': .004, 'rosa': .002},
                        sh=(.86, .92, 1.2), hi=(1.03, 1.01, .95), sat=1.1, con=1.16, bk=('osso', 'carta'), fondo=.55,
                        cielo=('oltremare', 'cielo', 'carta', 'acqua'), umore='luce piena e dura: muri chiari, ombre blu oltremare taglienti'),
    'pomeriggio':  dict(wb=(.97, .99, 1.04), bias={'lilla': .003, 'ocra': -.004, 'cotto': -.003, 'oltremare': -.003, 'viola': .003},
                        sh=(.88, .9, 1.15), hi=(1.04, 1., .93), sat=1.1, con=1.12, bk=('pesca', 'carta'), fondo=.55,
                        cielo=('oltremare', 'cielo', 'pesca', 'acqua'), umore='caldo ocra, ombre lunghe e blu: il pomeriggio ligure'),
    'oro':         dict(wb=(1.02, .99, .95), bias={'ocra': -.006, 'cotto': -.004, 'rosa': .003, 'mattone': -.003, 'lilla': -.003, 'viola': -.001, 'cielo': .006, 'acqua': .004},
                        sh=(.96, .9, 1.08), hi=(1.1, 1., .84), sat=1.0, con=1.1, bk=('ocra', 'pesca'), fondo=.5,
                        cielo=('viola', 'rosa', 'ocra', 'mattone'), umore="l'ora d'oro: tutto arancio, ombre magenta (non realistico, voluto)"),
    'crepuscolo':  dict(wb=(1., .97, 1.02), bias={'lilla': -.004, 'viola': -.003, 'rosa': .002, 'notte': -.003, 'ocra': -.002, 'cielo': .008, 'osso': .004, 'acqua': .004},
                        sh=(.95, .84, 1.14), hi=(1.06, .98, .9), sat=1.0, con=1.1, bk=('viola', 'rosa'), fondo=.55,
                        cielo=('notte', 'viola', 'rosa', 'lavagna'), umore='magenta e viola, le finestre arancio: il fumetto di sera'),
    'notte':       dict(wb=(1., 1., 1.), bias={'notte': -.005, 'acqua': -.003, 'lavagna': -.003, 'ocra': -.003, 'cielo': .004, 'pesca': .003, 'osso': .004, 'rosa': .002},
                        sh=(.78, 1., 1.04), hi=(1.12, 1., .8), sat=1.25, con=1.06, bk=('notte', 'acqua'), fondo=.4,
                        cielo=('nero', 'notte', 'acqua', 'nero'), umore='notte verde acqua, finestre e lampioni caldi, il nero pieno'),
}

ORE = [('notte', 0.), ('notte', 5.), ('mattino', 8.2), ('mezzogiorno', 12.5), ('pomeriggio', 16.), ('oro', 18.6), ('crepuscolo', 19.9), ('notte', 22.5), ('notte', 24.)]
def momento(h):
    """il momento all'ora h (piani alle ore di ORE, fra due la fusione morbida): numeri e colori (RGB) mescolati, la tavolozza resta quella"""
    if isinstance(h, str): h = {'mattino': 8.2, 'mezzogiorno': 12.5, 'pomeriggio': 16., 'oro': 18.6, 'crepuscolo': 19.9, 'notte': 23.}[h]
    h = h % 24
    for (a, ha), (b, hb) in zip(ORE, ORE[1:]):
        if ha <= h <= hb: break
    t = (h - ha) / (hb - ha); t = t * t * (3 - 2 * t); A, B = MOMENTI[a], MOMENTI[b]; m = lambda x, y: x + (y - x) * t
    col = lambda k: PAL[IDX[k]]
    r = dict(wb=m(np.array(A['wb']), np.array(B['wb'])), sat=m(A['sat'], B['sat']), con=m(A['con'], B['con']), fondo=m(A['fondo'], B['fondo']), sh=m(np.array(A['sh']), np.array(B['sh'])), hi=m(np.array(A['hi']), np.array(B['hi'])),
             bk=[m(col(A['bk'][i]), col(B['bk'][i])) for i in (0, 1)], cielo=[m(col(A['cielo'][i]), col(B['cielo'][i])) for i in range(4)], nome=a if t < .5 else b)
    bias = np.zeros(len(PAL))
    for k, v in A['bias'].items(): bias[IDX[k]] += v * (1 - t)
    for k, v in B['bias'].items(): bias[IDX[k]] += v * t
    r['bias'] = bias; return r

def ss(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def lum(c): return c[..., 0] * .299 + c[..., 1] * .587 + c[..., 2] * .114
def hsh(*a):   # l'hash del passo (fract(sin(dot)) come nello shader), su coordinate di cella intere
    x = sum(v * k for v, k in zip(a, (12.9898, 78.233, 37.719))); return np.mod(np.sin(x) * 43758.5453, 1.)
def vnoise(u, v):   # il rumore di valore (4 hash, bilineare): le macchie dello spray
    iu, iv = np.floor(u), np.floor(v); fu, fv = u - iu, v - iv; fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv)
    a, b, c, d = hsh(iu, iv), hsh(iu + 1, iv), hsh(iu, iv + 1), hsh(iu + 1, iv + 1)
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv
def shift(a, dy, dx, fill=None):
    r = np.roll(np.roll(a, dy, 0), dx, 1)
    if fill is not None:
        if dy > 0: r[:dy] = fill
        if dy < 0: r[dy:] = fill
        if dx > 0: r[:, :dx] = fill
        if dx < 0: r[:, dx:] = fill
    return r

def carica(nome):
    col = np.asarray(Image.open(os.path.join(G, nome + '_col.png')).convert('RGB')).astype(np.float64) / 255.
    dp = np.asarray(Image.open(os.path.join(G, nome + '_dep.png')).convert('RGB')).astype(np.float64)
    meta = json.load(open(os.path.join(G, nome + '.json')))
    d = (dp[..., 0] * 256 + dp[..., 1]) / 100.; ka = np.round(dp[..., 2] / 255. * 35); kc = np.floor(ka / 6 + .001)
    meta['m'] = {}
    for k in ('pers', 'gioc', 'mezzi', 'obb'):   # dove la scena senza quel gruppo è più lontana, c'era il gruppo (nel passo vero: la categoria nell'alfa)
        f = os.path.join(G, f'{nome}_m_{k}.png')
        if os.path.exists(f): m = np.asarray(Image.open(f).convert('RGB')).astype(np.float64); dm = (m[..., 0] * 256 + m[..., 1]) / 100.; meta['m'][k] = dm > d + .04
    return col, d, kc, ka - kc * 6, meta

def geometria(d, cam):
    H, W = d.shape; M = np.array(cam['mw']).reshape(4, 4).T; ty = np.tan(np.radians(cam['fov']) / 2); tx = ty * cam['aspect']
    j, i = np.meshgrid(np.arange(W), np.arange(H)); nx = (j + .5) / W * 2 - 1; ny = 1 - (i + .5) / H * 2
    V = np.stack([nx * tx * d, ny * ty * d, -d], -1); P = V @ M[:3, :3].T + M[:3, 3]
    # (per le normali la distanza al cm della cattura va lisciata: media 5×5 dove non c'è un bordo; il passo vero ha la profondità piena)
    def box(a):
        k = np.zeros_like(a); 
        for dy in range(-2, 3):
            for dx in range(-2, 3): k += shift(a, dy, dx)
        return k / 25
    mx = d.copy(); mn = d.copy()
    for dy in range(-2, 3):
        for dx in range(-2, 3): sd = shift(d, dy, dx); mx = np.maximum(mx, sd); mn = np.minimum(mn, sd)
    ds = np.where(mx / np.maximum(mn, 1e-3) < 1.03, box(d), d)
    Vs = np.stack([nx * tx * ds, ny * ty * ds, -ds], -1); Ps = Vs @ M[:3, :3].T + M[:3, 3]
    # (la cattura ha la distanza al cm: vicino alla camera le normali a 1 px sarebbero a gradini; il passo vero ha la profondità piena, qui passo 2 px)
    dx1, dx0 = (shift(Ps, 0, -2) - Ps) / 2, (Ps - shift(Ps, 0, 2)) / 2; dy1, dy0 = (shift(Ps, -2, 0) - Ps) / 2, (Ps - shift(Ps, 2, 0)) / 2
    dX = np.where((np.linalg.norm(dx1, axis=-1) < np.linalg.norm(dx0, axis=-1))[..., None], dx1, dx0)
    dY = np.where((np.linalg.norm(dy1, axis=-1) < np.linalg.norm(dy0, axis=-1))[..., None], dy1, dy0)
    N = np.cross(dX, dY); N /= np.linalg.norm(N, axis=-1, keepdims=True) + 1e-9
    cpos = M[:3, 3]; vd = cpos - P; N = np.where((np.sum(N * vd, -1) < 0)[..., None], -N, N)
    ray = P - cpos; ray /= np.linalg.norm(ray, axis=-1, keepdims=True) + 1e-9
    pw = d * 2 * ty / H   # metri per pixel a quella distanza
    return P, N, pw, M, ray

def stile(nome, mom, opts=None):
    O = dict(registro=1, trama=1, inchiostro=1, fondale=1, chiave=1); O.update(opts or {})
    c0, d, kc, sub, meta = carica(nome); H, W = d.shape; k1080 = H / 1080.
    cam = meta['cam']; P, N, pw, M, ray = geometria(d, cam); MO = momento(meta['ora'] if mom is None else mom)
    sky = d >= min(cam['far'] * .97, 600)
    Minv = np.linalg.inv(M); pl = meta['player']; pwld = np.array(pl['w']) + [0, 1, 0]; dpl = max(2., -(Minv @ np.append(pwld, 1))[2])
    rel = d - dpl                                                   # metri oltre il personaggio (negativo: davanti)
    sx, sy = pl['piedi'][0], (pl['piedi'][1] + pl['testa'][1]) / 2; hh = abs(pl['piedi'][1] - pl['testa'][1])
    j, i = np.meshgrid(np.arange(W), np.arange(H)); u0, v0 = (j + .5) / W, (i + .5) / H
    rr = np.hypot((u0 - sx) * W / H, v0 - sy)
    MM = meta['m']; zero = np.zeros((H, W), bool)
    gioc = MM.get('gioc', (np.abs(d - dpl) < .8) & (rr < hh * .6))     # il personaggio
    pers = MM.get('pers', zero) | (kc == 4) | gioc; mezzi = MM.get('mezzi', zero); obb = MM.get('obb', zero); io = gioc

    # ------------------------------------------------ §2 GERARCHIA + §5 MOMENTO: viraggio, contrasto, saturazione, la luce sul soggetto
    c = c0 * MO['wb']; Y = lum(c)
    l0 = oklab(c); kN = (1 - ss(.04, .12, np.hypot(l0[..., 1], l0[..., 2])))[..., None]   # il viraggio pieno sui grigi, appena sulle cose colorate (la tinta resta)
    t = ss(.3, .78, Y)[..., None]; tint = np.array(MO['sh']) * (1 - t) + np.array(MO['hi']) * t; c = c * (1 + (tint - 1) * (.25 + .75 * kN))
    Y = lum(c); c = Y[..., None] + (c - Y[..., None]) * MO['sat']; c = (c - .5) * MO['con'] + .5
    foc = 1 + .07 * (1 - ss(.08, .4, rr)) - .12 * ss(.5, 1.05, rr)   # il soggetto un gradino sopra, i bordi del quadro più quieti
    c = c * foc[..., None]
    c = np.where(io[..., None], (c - .45) * 1.15 + .5, c)           # il personaggio: più contrasto e un filo più chiaro
    # ------------------------------------------------ §6 IL PIANO DI FONDO E IL FONDALE
    if O['fondale']:
        bk1, bk2 = MO['bk']
        q = 1 - np.exp(-np.maximum(rel - 4, 0) / 10.)               # 0 fino a 7 m oltre il personaggio, poi sale
        band = np.floor(q * 3) / 3 + ss(.42, .58, np.mod(q * 3, 1)) / 3   # tre fasce piatte (bordo morbido di un px nello shader: fwidth)
        hz = ((band * (2 - band)) * MO['fondo'])[..., None] * (1 - pers[..., None])   # le fasce pesano .56, .89, 1
        bk = bk1 * (1 - band[..., None]) + bk2 * band[..., None]
        Yc = lum(c)[..., None]; flat = bk + ((Yc - lum(bk)[..., None]) * .45 + (c - Yc) * .5)   # il fondo: valore al 55%, colore al 35%, sul fondale
        c = c * (1 - hz) + flat * hz
        # il cielo e quello che sta oltre 140 m: il fondale disegnato (fasce piatte per elevazione, colline per azimut)
        far = sky | (d > 140)
        if far.any():
            el = np.degrees(np.arcsin(np.clip(ray[..., 1], -1, 1))); az = np.arctan2(ray[..., 0], ray[..., 2])
            hill = 1.2 + 1.6 * np.sin(az * 3 + .7) * np.sin(az * 5 + 2.1) + .8 * np.sin(az * 11)
            s3 = MO['cielo']
            skyc = np.where((el > 14)[..., None], s3[0], np.where((el > 5)[..., None], s3[1], s3[2]))
            skyc = np.where((el < hill)[..., None], s3[3], skyc)
            c = np.where(far[..., None], skyc, c)
    c = np.clip(c, 0, 1)

    # ------------------------------------------------ §1 LA TAVOLOZZA: l'inchiostro più vicino e il secondo (Oklab), pesati dal momento
    lab = oklab(c); PL = oklab(PAL); bias = MO['bias']
    WL = np.array([2., 1., 1.])                                      # il valore pesa il doppio: i gradini di valore restano, la tinta sceglie la famiglia
    D = np.sum(WL * (lab[..., None, :] - PL) ** 2, -1) + bias
    # i riservati: il vermiglio solo dentro il personaggio, il limone solo sull'obiettivo (qui: il giallo acceso e pieno che solo la guida ha)
    LR = oklab(PALR); Cc = np.hypot(lab[..., 1], lab[..., 2]); hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    dV = np.sum(WL * (lab - LR[IDXR['vermiglio']]) ** 2, -1) - .02; dV = np.where(io, dV, 9)
    dL = np.where(obb, np.sum(WL * (lab - LR[IDXR['limone']]) ** 2, -1) - .03, 9)
    # la famiglia: i grigi (croma < .03) fra i neutri, gli altri nel settore della loro tinta; fra .03 e .055 la cucitura a trama (sotto)
    fam = np.select([(hue >= 15) & (hue < 100), (hue >= 100) & (hue < 172), (hue >= 172) & (hue < 285)], [1, 3, 2], 4)   # gli indici di FAM = 'NCFVM'
    c0f = np.select([fam == 1, fam == 2], [.062, .05], .03) - .025 * ss(6, 12, rel);   # (il fondo tiene la tinta del fondale: soglia più bassa)
    wc = np.clip((Cc - c0f) / .025, 0, 1); wc = wc * wc * (3 - 2 * wc)   # i caldi diventano «colore» da .05-.075 (il lastrico beige resta pietra), gli altri da .03-.055
    BIG = 9.
    memb = MEMB.astype(float)                                         # famiglia × inchiostro
    Dn = D + (1 - memb[0]) * BIG
    Dc = D + (1 - memb[fam].reshape(H, W, -1)) * BIG
    rv = np.concatenate([dV[..., None], dL[..., None]], -1); PALX = np.concatenate([PAL, PALR[[IDXR['vermiglio'], IDXR['limone']]]])
    Dn = np.concatenate([Dn, rv], -1); Dc = np.concatenate([Dc, rv], -1)
    def due(Dx):
        o = np.argsort(Dx, -1)[..., :2]; A, B = o[..., 0], o[..., 1]
        dA = np.sqrt(np.maximum(np.take_along_axis(Dx, A[..., None], -1)[..., 0] - min(0, bias.min()), 1e-8))
        dB = np.sqrt(np.maximum(np.take_along_axis(Dx, B[..., None], -1)[..., 0] - min(0, bias.min()), 1e-8))
        return A, B, dA, dB
    An, Bn, dAn, dBn = due(Dn); Ac, Bc, dAc, dBc = due(Dc)
    useC = wc > .5
    A = np.where(useC, Ac, An); B = np.where(useC, Bc, Bn); dA = np.where(useC, dAc, dAn); dB = np.where(useC, dBc, dBn)
    Aalt = np.where(useC, An, Ac)                                     # l'altra famiglia, per la cucitura grigio-colore
    walt = .5 - np.abs(wc - .5)                                       # 0 lontano dal confine, .5 sul confine
    r = dA / (dA + dB)                                               # 0: proprio l'inchiostro A; .5: a metà fra A e B

    # ------------------------------------------------ §3 LE TRAME (non puntini): la soglia T dice dove passa B; per materiale e per valore
    Yg = lum(c)
    horiz = np.abs(N[..., 1]) > .7
    tg = np.stack([-N[..., 2], N[..., 0]], -1); tg /= np.linalg.norm(tg, axis=-1, keepdims=True) + 1e-9
    U = np.where(horiz, P[..., 0], P[..., 0] * tg[..., 0] + P[..., 2] * tg[..., 1]); Vv = np.where(horiz, P[..., 2], P[..., 1])   # il piano della faccia (m)
    def tratteggio(ang, passo, mosso=.28, maxpx=14 * k1080 * 2):
        # le righe nel piano della faccia; troppo larghe sullo schermo (vicino alla camera) → il passo si dimezza (ottave: le righe vecchie restano, se ne
        # aggiungono in mezzo), così la riga sta fra maxpx/2 e maxpx
        a = np.radians(ang); w = vnoise(U / .45 + 3.1, Vv / .45 + 7.7) - .5   # le righe mosse a mano (onda di ~45 cm)
        px = passo / pw; ot = np.clip(np.floor(np.log2(np.maximum(px, 1e-3) / maxpx)) + 1, 0, 3); pe = passo / 2 ** ot
        x = (U * np.cos(a) + Vv * np.sin(a)) / pe + w * mosso * 2 ** ot
        return np.abs(x - np.round(x)) * 2, pe / pw                   # 0 al centro della riga; la riga in px
    gr = hsh(j, i)                                                    # la grana di 1 px (riso), ferma sullo schermo col retino che segue il mondo
    sp = np.where(.03 / pw > 5 * k1080 * 2, .015, .03)                 # lo spray: puntini di 3 cm (1,5 cm da molto vicino) a macchie di 20 cm
    spray = .6 * hsh(np.floor(U / sp), np.floor(Vv / sp)) + .4 * vnoise(U / .2, Vv / .2)
    th_s, px_s = tratteggio(30, .12); th_m, px_m = tratteggio(68, .1); th_t, px_t = tratteggio(-40, .14)
    sc45 = np.abs(np.mod((j + i) * .7071 / (6 * k1080 * 2), 1) - .5) * 2   # le cose senza piano: righe a 45° sullo schermo, 6 px a 1080
    T = sc45.copy(); gain = np.ones_like(Yg); base = np.zeros_like(Yg)
    suolo, muri, tetti = kc == 1, kc == 2, kc == 3
    T = np.where(suolo & (px_s > 3), th_s, T); base = np.where(suolo, 0., base); gain = np.where(suolo, .5, gain)
    T = np.where(muri & (sp / pw > .9), spray, T); base = np.where(muri, .03 + .04 * ss(.75, .45, Yg), base)
    T = np.where(tetti & (px_t > 3), th_t, T); base = np.where(tetti, .02, base)
    gain = np.where(pers | mezzi | obb, 0, gain); base = np.where(pers | mezzi | obb, 0, base)   # persone, mezzi, obiettivo: tinte piatte
    lonta = ss(6, 12, rel); gain = gain * (1 - lonta); base = base * (1 - lonta) * O['trama']   # il fondo: piatto, nessuna trama
    gain = np.where(sky | (d > 140), .4, gain)
    band_r = ss(.3, .5, r) * .5                                      # la trama solo nella fascia di passaggio fra due inchiostri: campiture piene, cuciture a trama
    reff = np.clip(band_r * gain + base, 0, .5) if O['trama'] else np.zeros_like(r)
    # il personaggio: la giacca sempre vermiglio (alla luce) o cotto (in ombra), qualunque sia la luce della scena: il soggetto si legge per primo
    warm = io & (((Cc > .05) & ((hue < 60) | (hue > 340))) | (c0[..., 0] > c0[..., 1] * 1.25))   # (la giacca: rossa nella scena, a ogni ora)
    nV = len(PAL); A = np.where(warm, np.where(Yg > .1, nV, IDX['cotto']), A); B = np.where(warm, A, B)
    ob2 = MM.get('obb', zero) & ~pers & (Yg > .3); A = np.where(ob2, nV + 1, A); B = np.where(ob2, A, B)   # l'obiettivo: limone pieno
    useB = T < reff
    col = np.where(useB[..., None], PALX[B], PALX[A])
    seam = (T < (walt - .3) * 2.5 * gain * (1 - lonta)) & (walt > .3)                # la cucitura fra il grigio e la sua tinta: la stessa trama
    col = np.where(seam[..., None], PALX[Aalt], col)

    # ------------------------------------------------ §4 IL NERO: pieno nelle ombre fonde, tratteggio incrociato nella fascia sopra
    K = PAL[IDX['nero']]
    kt = ss(.2, .1, Yg) * (1 - pers) * (1 - lonta * .8)               # fra .20 e .10 di valore il tratteggio, sotto .10 il nero pieno
    h1, _ = tratteggio(30 if True else 0, .05, .2); h2, _ = tratteggio(-50, .05, .2)
    hs = np.where(muri, np.minimum(tratteggio(68, .05, .2)[0], tratteggio(158, .05, .2)[0] + .35), np.minimum(h1, h2 + .35))
    sc = np.abs(np.mod(((j + i) * .7071) / (4.5 * k1080 * 2), 1) - .5) * 2   # gli oggetti senza piano: righe a 45° sullo schermo
    hs = np.where(suolo | muri | tetti, hs, sc)
    key = (hs < kt * .45) | (Yg < .1) & ~pers
    key = key | (pers & (Yg < .1))
    if not O['chiave']: key = np.zeros_like(key)

    # ------------------------------------------------ §4 L'INCHIOSTRO DELLE SAGOME: spesso vicino, sottile lontano, a mano (fermo nel mondo)
    ink = np.zeros((H, W))
    if O['inchiostro']:
        jmax = np.zeros((H, W))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): jmax = np.maximum(jmax, (shift(d, dy, dx) - d) / d)
        edge = (jmax > .032) & ~sky
        wob = np.sin(P[..., 0] * 3.1 + P[..., 1] * 2.3 - P[..., 2] * 2.7) * np.sin(-P[..., 0] * 2.2 + P[..., 1] * 3.7 + P[..., 2] * 2.9 + 1.3)
        R = (1.6 + 1.8 * (1 - ss(6, 30, rel)) + 1.3 * ss(.1, .4, jmax)) * (1 + .38 * wob) * k1080 * 2.   # px alla risoluzione della cattura (×2 = a 1080 righe ~3,4 px vicino)
        R = np.where(edge, np.maximum(R, 1), 0)
        for dy in range(-3, 4):
            for dx in range(-3, 4):
                dd = np.hypot(dy, dx)
                if dd > 3.2: continue
                Rs = shift(R, dy, dx, 0); ds = shift(d, dy, dx, 1e9)
                ink = np.maximum(ink, ((Rs >= max(dd, .5) + .01) & (d <= ds * 1.03)).astype(float))
        ink = np.where(edge, 1., ink)
        ink *= np.where((wob < -.82) & (rel > -3) & (rel < 12) & ~pers, .2, 1)    # la pennellata che scarica: piccoli vuoti
        # le pieghe (faccia contro faccia, superficie continua): 1 px, più leggere
        nd = np.minimum(np.sum(N * shift(N, 0, -1), -1), np.sum(N * shift(N, -1, 0), -1))
        cont = (np.abs(shift(d, 0, -1) - d) / d < .02) & (np.abs(shift(d, -1, 0) - d) / d < .02)
        hz2 = (np.abs(N[..., 1]) > .7) & (np.abs(shift(N, 0, -1)[..., 1]) > .7) & (np.abs(shift(N, -1, 0)[..., 1]) > .7)   # (fra due facce orizzontali niente piega: col cm della cattura sarebbe rumore)
        ink = np.maximum(ink, ((nd < .72) & cont & ~hz2 & (rel < 25) & (d > 4) & ~sky & ~pers).astype(float) * .7)
        # le persone: il bordo della categoria, sempre pieno
        pe = np.zeros((H, W), bool)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1), (0, 2), (2, 0), (0, -2), (-2, 0)):
            pe |= pers & ~shift(pers, dy, dx, False)
            if abs(dy) + abs(dx) <= 2 and max(abs(dy), abs(dx)) == 1: pe |= (mezzi & ~shift(mezzi, dy, dx, False)) | (obb & ~shift(obb, dy, dx, False))
        ink = np.maximum(ink, pe.astype(float))
        ink *= 1 - (sky | (d > 140))
    aer = ss(12, 45, rel)[..., None]                                # l'inchiostro d'aria: lontano prende il fondale, più scuro
    inkc = K * (1 - aer) + (MO['bk'][0] * .45) * aer

    # ------------------------------------------------ COMPOSIZIONE: la lastra del colore fuori registro, poi il nero sopra, poi la carta
    lastra = col.copy()
    if O['registro']: lastra = shift(lastra, 1, 1)                   # 1 px a 540 righe (2 px a 1080), in basso a destra, costante
    out = np.where(key[..., None], K, lastra)
    out = out * (1 - ink[..., None]) + inkc * ink[..., None]
    g2 = hsh(np.floor(j / 1.), np.floor(i / 1.) + 911.)
    out = out * (1 + (g2 - .5) * .06)[..., None]                      # la fibra della carta
    drop = (g2 > .996) & ~key & (ink < .5) & (A != IDX['carta']) & (lum(PALX[A]) > .4) & ~pers
    out = np.where(drop[..., None], PAL[IDX['carta']] * .97, out)     # l'inchiostro che non prende
    # il bollino: attorno al personaggio un filo di carta di 2 px (come un adesivo sul muro), fuori dal suo contorno nero
    gd = io.copy()
    for k in range(3):
        gd = gd | shift(gd, 0, 1, False) | shift(gd, 0, -1, False) | shift(gd, 1, 0, False) | shift(gd, -1, 0, False)
    ring = gd & ~pers
    out = np.where(ring[..., None], PAL[IDX['carta']], out)
    out = np.clip(out, 0, 1)
    return out

if __name__ == '__main__':
    nome, mom = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None); mom = float(mom) if mom and mom[0].isdigit() else mom; o = stile(nome, mom)
    Image.fromarray((o * 255).astype(np.uint8)).save(sys.argv[3] if len(sys.argv) > 3 else f'/tmp/{nome}_{mom}.png')
