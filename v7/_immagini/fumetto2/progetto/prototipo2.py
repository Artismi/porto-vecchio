# [fumetto2] IL PROTOTIPO DEL PASSO UNICO dello stile E, seconda versione (BIBBIA_STILE.md). La prima (prototipo.py) «si brucia, si sgrana,
# si sgretola»: qui la qualità prima di tutto. Niente rumore sotto i 3 px, campiture calme scelte da un colore lisciato sulla stessa superficie,
# confini fra due inchiostri antialiasati (o una sfumatura corta), tratteggio solo in ombra con righe antialiasate di almeno 2 px, inchiostro
# da un campo di distanza (liscio, spessore costante), margine nelle luci (la carta solo per le luci vere).
# Le catture sono a 960×540: il prototipo lavora a 540 righe dove serve la geometria e disegna a 1080 (×2) quello che si vede (confini,
# righe, inchiostro), come farà il passo a piena risoluzione.   python3 prototipo2.py <cattura> [ora|momento] [uscita.png]
import sys, os
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prototipo import carica, geometria, momento, MOMENTI, ss, lum, hsh, vnoise, shift
from tavolozza import PAL, PALR, IDX, IDXR, MEMB, oklab

def up(a, S):   # bilineare ×S (per canale), come la lettura filtrata della tessitura nel passo
    if a.ndim == 3: return np.stack([up(a[..., k], S) for k in range(a.shape[2])], -1)
    H, W = a.shape; return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((W * S, H * S), Image.BILINEAR)).astype(np.float64)
def upn(a, S): return np.repeat(np.repeat(a, S, 0), S, 1)

def stile2(nome, mom=None, S=2, opts=None):
    O = dict(trama=1, inchiostro=1, fondale=1); O.update(opts or {})
    c0, d, kc, sub, meta = carica(nome); H, W = d.shape
    # (la distanza della cattura è al cm: per il piano delle trame va lisciata sulla stessa superficie, 6 passi; il passo vero ha la profondità piena)
    dsm = d.copy()
    for _ in range(6):
        acc = dsm.copy(); n = np.ones_like(d)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ok = np.abs(shift(d, dy, dx, 1e9) / d - 1) < .02; acc += shift(dsm, dy, dx) * ok; n += ok
        dsm = acc / n
    cam = meta['cam']; P, N, pw, M, ray = geometria(dsm, cam); MO = momento(meta['ora'] if mom is None else mom)
    sky = d >= min(cam['far'] * .97, 600)
    Minv = np.linalg.inv(M); pl = meta['player']; dpl = max(2., -(Minv @ np.append(np.array(pl['w']) + [0, 1, 0], 1))[2]); rel = d - dpl
    sx, sy = pl['piedi'][0], (pl['piedi'][1] + pl['testa'][1]) / 2; hh = abs(pl['piedi'][1] - pl['testa'][1])
    j, i = np.meshgrid(np.arange(W), np.arange(H)); rr = np.hypot(((j + .5) / W - sx) * W / H, (i + .5) / H - sy)
    MM = meta['m']; zero = np.zeros((H, W), bool)
    gioc = MM.get('gioc', (np.abs(d - dpl) < .8) & (rr < hh * .6)); pers = MM.get('pers', zero) | (kc == 4) | gioc
    mezzi = MM.get('mezzi', zero); obb = MM.get('obb', zero)

    # ------------------------------------------------ §5 il momento, §2 la gerarchia (a 540: è colore, non disegno)
    c = c0 * MO['wb'] * O.get('esp', 1.); Y = lum(c)   # (esp: la prova del muro in ombra, la stessa cattura più scura)
    l0 = oklab(c); kN = (1 - ss(.04, .12, np.hypot(l0[..., 1], l0[..., 2])))[..., None]
    t = ss(.3, .78, Y)[..., None]; tint = np.array(MO['sh']) * (1 - t) + np.array(MO['hi']) * t; c = c * (1 + (tint - 1) * (.25 + .75 * kN))
    Y = lum(c); c = Y[..., None] + (c - Y[..., None]) * MO['sat']; c = (c - .5) * MO['con'] + .5
    c = c * (1 - .12 * ss(.5, 1.05, rr))[..., None]                   # i bordi del quadro più quieti (niente luce aggiunta al centro: bruciava)
    # IL MARGINE NELLE LUCI: sopra .62 di valore la scala si comprime (×.55): le luci tengono 2-3 gradini (osso, pesca, carta), non un piano bianco
    Y = np.maximum(lum(c), 1e-4); Yk = np.where(Y > .7, .7 + (Y - .7) * .7, Y); c = Yk[..., None] + (c - Y[..., None]) * np.minimum(1, Yk / Y)[..., None]   # (si comprime il valore, non la tinta: il beige resta beige, non diventa ocra)
    c = np.where(gioc[..., None], (c - .45) * 1.15 + .48, c)
    if O['fondale']:
        bk1, bk2 = MO['bk']; q = 1 - np.exp(-np.maximum(rel - 4, 0) / 10.)
        band = np.floor(q * 3) / 3 + ss(.45, .55, np.mod(q * 3, 1)) / 3
        hz = ((band * (2 - band)) * MO['fondo'])[..., None] * (1 - pers[..., None])
        bk = bk1 * (1 - band[..., None]) + bk2 * band[..., None]; Yc = lum(c)[..., None]
        c = c * (1 - hz) + (bk + (Yc - lum(bk)[..., None]) * .45 + (c - Yc) * .5) * hz
        far = sky | (d > 140)
        if far.any():
            el = np.degrees(np.arcsin(np.clip(ray[..., 1], -1, 1))); az = np.arctan2(ray[..., 0], ray[..., 2])
            hill = 1.2 + 1.6 * np.sin(az * 3 + .7) * np.sin(az * 5 + 2.1) + .8 * np.sin(az * 11); s3 = MO['cielo']
            skyc = np.where((el > 14)[..., None], s3[0], np.where((el > 5)[..., None], s3[1], s3[2])); c = np.where(far[..., None], np.where((el < hill)[..., None], s3[3], skyc), c)
    c = np.clip(c, 0, 1)

    # ------------------------------------------------ §1.1 IL COLORE CHE SCEGLIE: lisciato sulla stessa superficie (niente mimetica)
    # quattro letture filtrate a ±1,5 px (in orizzontale e in verticale: coprono 4×4 px), ognuna scartata se la profondità a 2 px (le letture
    # dell'anello di D2, già fatte) dice che è un'altra cosa (salto > 3%) o un'altra categoria. Dove il pixel stacca forte dalla media (una
    # lettera, un'insegna, un filo: |Δvalore| > .12) vale il pixel: il dettaglio vero resta, il rumore della trama sotto no.
    # IL RETINO DELLA CAMERA7 (le chiome e le cose che si aprono davanti al personaggio, Bayer 4×4): in E va sostituito da una dissolvenza vera
    # (§9, codice della camera). Qui lo si imita: dove la profondità salta a scacchi (più di un quarto dei pixel 5×5), il colore è la media 5×5
    # senza guardare la profondità (la chioma diventa un velo), niente inchiostro né nero
    alt = sum((np.abs(shift(d, dy, dx, 0) / d - 1) > .1).astype(float) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))) >= 2
    dmask = sum(shift(alt, dy, dx, False).astype(float) for dy in range(-2, 3) for dx in range(-2, 3)) / 25 > .22
    dmask = sum(shift(dmask, dy, dx, False).astype(float) for dy in range(-2, 3) for dx in range(-2, 3)) > 0
    box5 = sum(shift(c, dy, dx) for dy in range(-3, 4) for dx in range(-3, 4)) / 49
    c = np.where(dmask[..., None], box5, c)
    globals()['_DMASK'] = dmask
    acc = c.copy(); n = np.ones((H, W))
    for dy, dx in ((0, 2), (0, -2), (2, 0), (-2, 0), (0, 4), (0, -4), (4, 0), (-4, 0), (2, 2), (-2, -2), (2, -2), (-2, 2)):   # 12 letture filtrate a 2 e 4 px (a 540 righe)
        ok = (np.abs(shift(d, dy, dx, 1e9) / d - 1) < .03) & (shift(pers, dy, dx, False) == pers)
        acc += shift(c, dy, dx) * ok[..., None]; n += ok
    blur = acc / n[..., None]
    dm = np.abs(lum(c) - lum(blur)) > .22                             # il dettaglio vero: stacca forte E è largo almeno 2 px (a 540) in tutte e due le direzioni
    # (e largo almeno 3×3 a 540, cioè 6 px a 1080: una lettera sì, i rivetti di una saracinesca no: diventerebbero pois)
    keep = dm.copy()
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)): keep &= shift(dm, dy, dx, False)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)): keep |= shift(keep, dy, dx, False) & dm
    cS = np.where(keep[..., None], c, blur)
    # LA SUPERFICIE CALMA (nel gioco: nei materiali, §8 — niente velature, la tela delle facciate e del lastrico con la mipmap spostata di +1,5,
    # il cel a tre toni di D): qui la si imita sulla cattura con una diffusione che resta sulla stessa superficie (profondità continua, salto di
    # valore < .07): le macchie larghe della tela si spianano, i giunti, le lettere e i bordi restano. Senza questo, qualunque scelta di inchiostro
    # su un muro «a cavallo» fra due inchiostri fa la mimetica
    for st in (2, 4, 8, 16, 32, 16, 8, 4, 2, 4, 8, 16, 8, 4, 2):   # (a più scale, per spianare anche le macchie larghe; lo stesso piano: la normale)
        acc = cS.copy(); n = np.ones((H, W))
        for dy, dx in ((0, st), (0, -st), (st, 0), (-st, 0)):
            sh = shift(cS, dy, dx); ok = (np.sum(shift(N, dy, dx) * N, -1) > .97) & (np.abs(shift(d, dy, dx, 1e9) / d - 1) < .03 * st) & (np.linalg.norm(oklab(np.clip(sh, 0, 1)) - oklab(np.clip(cS, 0, 1)), axis=-1) < .035) & (shift(pers, dy, dx, False) == pers) & (shift(kc, dy, dx, -1) == kc)
            acc += sh * ok[..., None]; n += ok
        cS = acc / n[..., None]

    # (i bordi fra le zone spianate restano larghi un pixel a 540: un passaggio 3×3 sulla stessa cosa li porta a 2-3 px, così la soglia a 1080
    #  passa liscia fra due pixel invece di fare gradini da 2 px; nel passo vero il colore letto è già filtrato e continuo)
    for _ in range(2):
        acc = cS.copy(); n = np.ones((H, W))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            ok = (np.abs(shift(d, dy, dx, 1e9) / d - 1) < .03) & (shift(pers, dy, dx, False) == pers); acc += shift(cS, dy, dx) * ok[..., None]; n += ok
        cS = acc / n[..., None]
    # ------------------------------------------------ tutto quello che si vede, a 1080: la scelta dell'inchiostro sul colore lisciato e ingrandito
    H2, W2 = H * S, W * S; k1 = H2 / 1080.
    cU = up(cS, S); lab = oklab(np.clip(cU, 0, 1)); PL = oklab(PAL); bias = MO['bias'].copy()
    bias[IDX['carta']] += .006                                         # la carta solo per le luci vere (il margine: §2)
    bias[IDX['ocra']] = max(bias[IDX['ocra']], -.0015)                 # l'ocra per i muri ocra veri, non per ogni intonaco caldo al sole
    bias[IDX['rosa']] += .005                                          # il rosa solo per i rosa veri (writing, insegne): mai macchie sul lastrico
    WL = np.array([2., .4, .4]); D = np.sum(WL * (lab[..., None, :] - PL) ** 2, -1) + bias
    Cc = np.hypot(lab[..., 1], lab[..., 2]); hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    D[..., IDX['rosa']] += 9 * (Cc < .11); D[..., IDX['oltremare']] += 9 * (Cc < .07)   # gli inchiostri accesi solo per le cose accese: mai un lastrico rosa
    fam = np.select([(hue >= 15) & (hue < 100), (hue >= 100) & (hue < 172), (hue >= 172) & (hue < 285)], [1, 3, 2], 4)
    relU = up(rel, S); persU = up(pers.astype(float), S) > .5; giocU = up(gioc.astype(float), S); obbU = up(obb.astype(float), S) > .5; mezU = up(mezzi.astype(float), S) > .5
    c0f = np.select([fam == 1, fam == 2], [.075, .05], .03) - .025 * ss(6, 12, relU); wc = ss(0, 1, (Cc - c0f) / .025)
    memb = MEMB.astype(float); BIG = 9.
    def due(Dx):
        o = np.argsort(Dx, -1)[..., :2]; A, B = o[..., 0], o[..., 1]
        dA = np.sqrt(np.maximum(np.take_along_axis(Dx, A[..., None], -1)[..., 0] - min(0, bias.min()), 1e-8))
        dB = np.sqrt(np.maximum(np.take_along_axis(Dx, B[..., None], -1)[..., 0] - min(0, bias.min()), 1e-8))
        return A, B, dA / (dA + dB)
    An, Bn, rn = due(D + (1 - memb[0]) * BIG); Ac, Bc, rc = due(D + (1 - memb[fam].reshape(H2, W2, -1)) * BIG)
    def tinta(A, B, r):
        # il confine fra A e B: netto e antialiasato su ~1 px. r va a .5 sul confine da tutte e due le parti (A e B si scambiano): la distanza dal
        # confine in px è (.5 − r)/|∇r| (nel passo: fwidth(r)); il peso di B sale a .5 nell'ultimo px. Niente sfumature larghe, niente puntini
        gy, gx = np.gradient(r); g = np.maximum(np.hypot(gx, gy), 1e-4); dpx = (.5 - r) / g
        w = (.5 * (1 - ss(0., 1.2, dpx)))[..., None]; return PAL[A] * (1 - w) + PAL[B] * w
    colN, colC = tinta(An, Bn, rn), tinta(Ac, Bc, rc)
    gy, gx = np.gradient(wc); dws = (wc - .5) / np.maximum(np.hypot(gx, gy), 1e-4); wcs = ss(-.6, .6, dws)[..., None]; col = colN * (1 - wcs) + colC * wcs   # grigio/colore: lo stesso bordo morbido
    A = np.where(wc > .5, Ac, An); B = np.where(wc > .5, Bc, Bn)
    YU = lum(cU)
    # i riservati: la giacca del personaggio sempre vermiglio (cotto sotto .10), l'obiettivo limone pieno
    c0U = up(c0, S); warm = ((Cc > .05) & ((hue < 60) | (hue > 340))) | (c0U[..., 0] > c0U[..., 1] * 1.25)
    vk = (giocU * warm)[..., None]; col = col * (1 - vk) + np.where((YU > .1)[..., None], PALR[IDXR['vermiglio']], PAL[IDX['cotto']]) * vk
    col = np.where((obbU & (YU > .3))[..., None], PALR[IDXR['limone']], col)

    # ------------------------------------------------ §3 LE TRAME, solo dove servono, solo grandi e antialiasate
    # il piano delle trame dalla normale lisciata (9×9 sulla stessa superficie): le lamiere ondulate, i coppi, le cornici non fanno girare le righe
    Nb = N.copy()
    for _ in range(4):
        acc = Nb.copy(); n = np.ones((H, W))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ok = (np.abs(shift(d, dy, dx, 1e9) / d - 1) < .03); acc += shift(Nb, dy, dx) * ok[..., None]; n += ok
        Nb = acc / n[..., None]
    PU = up(P, S); NU = up(Nb, S); NU /= np.linalg.norm(NU, axis=-1, keepdims=True) + 1e-9; pwU = up(pw, S) / S   # metri per pixel a 1080
    # il piano della faccia come in D (sgHp): l'asse dominante della normale sceglie (x,z), (z,y) o (x,y), in coordinate locali (il punto meno
    # l'origine del blocco di città, così niente numeri grandi): stabile, nessuna rotazione col rumore della normale
    an = np.abs(NU); P0 = PU - np.floor(PU.reshape(-1, 3).mean(0) / 64) * 64
    xz = an[..., 1] > np.maximum(an[..., 0], an[..., 2]); zy = ~xz & (an[..., 0] > an[..., 2])
    U = np.where(xz, P0[..., 0], np.where(zy, P0[..., 2], P0[..., 0])); V = np.where(xz, P0[..., 2], P0[..., 1])
    kcU = upn(kc, S); suolo, muri, tetti = kcU == 1, kcU == 2, kcU == 3
    lonta = ss(6, 12, relU); vivo = (~persU) & (~mezU) & (~obbU) & (lonta < 1)
    def righe(ang, passo, largh):
        # righe nel piano della faccia. Il passo a schermo si misura con le derivate (nel passo: fwidth), non con la distanza: sui piani di
        # sbieco le righe si stringono in un verso solo. Ottave annidate (si aggiungono righe in mezzo) per tenere il passo fra 12 e 24 px vicino
        # alla camera; sotto 12 px (lontano, di sbieco) le righe svaniscono: mai moiré. La riga: distanza in px dal centro, bordo antialiasato
        a = np.radians(ang); w = vnoise(U / .6 + 3.1, V / .6 + 7.7) - .5
        x0 = (U * np.cos(a) + V * np.sin(a)) / passo + w * .12
        gy, gx = np.gradient(x0); g0 = np.hypot(gx, gy)   # righe per pixel
        # (la profondità della cattura è al cm: vicino alla camera la derivata frigge; la mediana 9×9 la rimette in riga. Nel passo: fwidth sul punto vero)
        st = np.stack([shift(g0, dy, dx) for dy in (-4, 0, 4) for dx in (-4, 0, 4)]); g0 = np.maximum(np.median(st, 0), 1e-5)
        ot = np.clip(np.floor(np.log2(np.maximum(1 / g0, 1e-3) / (32 * k1))) + 1, 0, 4); x = x0 * 2 ** ot; g = g0 * 2 ** ot
        dpx = np.abs(x - np.round(x)) / g
        return (1 - ss(largh / 2 - .5, largh / 2 + .5, dpx)) * ss(12 * k1, 16 * k1, 1 / g), 1 / g
    out = col.copy()
    if O['trama']:
        # IL TRATTEGGIO IN OMBRA: da valore .42 in giù una mano di righe nell'inchiostro più scuro della famiglia, larghe da 2 px (a .42) a metà passo
        # (a .20); sotto .20 l'incrocio; sotto .10 il nero pieno (sotto). Mai sulle luci, mai sulle persone, sui mezzi, sul fondo
        vivo = vivo & ~upn(_DMASK, S).astype(bool); ombra = ss(.42, .30, YU) * vivo; prof = ss(.24, .14, YU) * vivo
        ang1 = np.where(suolo, 30, np.where(muri, 68, np.where(tetti, -40, 45))); ang2 = ang1 + 90
        cov = .07 + .13 * ss(.42, .2, YU)
        hs1 = np.zeros_like(YU); hs2 = np.zeros_like(YU)
        for a in np.unique(ang1):
            m = ang1 == a
            if not m.any(): continue
            r1w, _ = righe(a, .1, np.maximum(2 * k1, cov * 24 * k1)); hs1 = np.where(m, r1w, hs1)
            r2, _ = righe(a + 90, .1, 2 * k1); hs2 = np.where(m, r2, hs2)
        # la riga è il nero stampato sopra l'inchiostro (sovrastampa al 55%): l'ombra resta del suo colore, più fonda sulla riga
        h = np.clip(hs1 * ombra + hs2 * prof, 0, 1)[..., None]; out = out * (1 - h * .5) + PAL[IDX['nero']] * h * .5
    # IL NERO PIENO: valore < .10 (dal colore lisciato: un bordo calmo), antialiasato su 1 px
    kk = ss(.115, .085, YU) * (1 - persU) * (1 - lonta * .8) * (1 - upn(_DMASK, S)); out = out * (1 - kk[..., None]) + PAL[IDX['nero']] * kk[..., None]

    # ------------------------------------------------ §4 L'INCHIOSTRO: un campo di distanza (calcolato a 540, ingrandito, soglia antialiasata)
    if O['inchiostro']:
        jmax = np.zeros((H, W))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): jmax = np.maximum(jmax, (shift(d, dy, dx) - d) / d)
        j2 = np.zeros((H, W))
        for dy, dx in ((0, 2), (0, -2), (2, 0), (-2, 0)): j2 = np.maximum(j2, (shift(d, dy, dx) - d) / d)
        edge = ((jmax > .032) | (j2 > .06)) & ~sky & ~(d > 140)   # anche a 2 px (le letture dell'anello): il bordo a gradini resta una riga continua
        # IL RETINO DELLA CAMERA (le chiome aperte a buchi di 1-2 px): come in D, un pixel col fondo da due parti opposte è un buco, non una sagoma;
        # e dove i bordi sono fitti (più di un terzo dei pixel 5×5) è un retino: niente inchiostro (nel passo: il conteggio delle 8 letture dell'anello)
        far = lambda dy, dx, k: (shift(d, dy, dx, 0) - d) / d > .032
        op = (far(0, 1, 1) & far(0, -1, 1)) | (far(1, 0, 1) & far(-1, 0, 1)) | (far(0, 2, 1) & far(0, -2, 1)) | (far(2, 0, 1) & far(-2, 0, 1))
        edge &= ~op
        e1 = jmax > .032; dens = sum(shift(e1, dy, dx, False).astype(float) for dy in range(-2, 3) for dx in range(-2, 3)) / 25
        edge &= (dens < .5) & ~_DMASK
        # (la distanza al cm della cattura lascia buchi nel bordo lontano: si chiudono, 1 px; nel passo vero il bordo è continuo)
        dil = edge.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)): dil |= shift(edge, dy, dx, False)
        ero = dil.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)): ero &= shift(dil, dy, dx, True)
        edge = (edge | ero) & ~sky & ~(d > 140)
        nb = sum(shift(edge, dy, dx, False).astype(int) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)))
        edge &= nb >= 1                                                 # (i punti isolati della cattura: fuori)
        n5 = sum(shift(edge, dy, dx, False).astype(int) for dy in range(-3, 4) for dx in range(-3, 4))
        edge &= n5 >= 5                                                 # (e i trattini corti: una riga vera ha almeno 5 px in un 7×7)
        onda = np.sin(P[..., 0] * 1.3 + P[..., 1] * .9 - P[..., 2] * 1.1) * np.sin(-P[..., 0] * .8 + P[..., 1] * 1.5 + P[..., 2] * 1.2 + 1.3)   # un'assottigliatura lenta (~3 m), mai un vuoto
        R = (1.8 + 2.2 * (1 - ss(6, 30, rel)) + 1.2 * ss(.1, .4, jmax)) * (1 + .15 * onda) * k1   # semispessore in px a 1080
        Rp = np.where(edge, R, -9.)
        pe = np.zeros((H, W), bool)                                    # le persone, i mezzi, l'obiettivo: il bordo della maschera
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): pe |= (pers & ~shift(pers, dy, dx, False)) | (mezzi & ~shift(mezzi, dy, dx, False)) | (obb & ~shift(obb, dy, dx, False))
        Rp = np.where(pe, np.maximum(Rp, np.where(pers, 3.2, 2.2) * k1), Rp)
        nd = np.minimum(np.sum(N * shift(N, 0, -1), -1), np.sum(N * shift(N, -1, 0), -1))
        cont = (np.abs(shift(d, 0, -1) - d) / d < .02) & (np.abs(shift(d, -1, 0) - d) / d < .02)
        hz2 = (np.abs(N[..., 1]) > .7) & (np.abs(shift(N, 0, -1)[..., 1]) > .7) & (np.abs(shift(N, -1, 0)[..., 1]) > .7)
        piega = (nd < .72) & cont & ~hz2 & (rel < 25) & (d > 4) & ~sky & ~pers & ~edge
        Rq = np.where(piega & False, 1.1 * k1, -9.)   # le pieghe: fuori (con la distanza al cm della cattura erano tratteggi a puntini; nel passo vero da provare)
        # il campo di distanza valutato a 1080: per ogni pixel la distanza vera (in px a 1080) dal centro di ogni pixel di bordo vicino meno il suo
        # semispessore; la soglia antialiasata (±.6 px). Il contorno è l'unione di dischi a passo 2 px: liscio, niente gradini. Nel passo vero lo
        # stesso, con la posizione del bordo a sotto-pixel dal peso di copertura MSAA di [hd]
        I2, J2 = np.meshgrid(np.arange(H2), np.arange(W2), indexing='ij'); ci, cj = I2 // S, J2 // S
        F = np.full((H2, W2), 99.)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                if np.hypot(dy, dx) > 4.5: continue
                Rs = upn(shift(Rp, -dy, -dx, -9.), S); ok = upn(d <= shift(d, -dy, -dx, 1e9) * 1.03, S)
                dist = np.hypot(I2 + .5 - (ci + dy + .5) * S, J2 + .5 - (cj + dx + .5) * S)
                F = np.minimum(F, np.where((Rs > 0) & ok, dist - Rs, 99.))
        ink = 1 - ss(-.6, .6, F)
        aer = ss(12, 45, relU)[..., None]; inkc = PAL[IDX['nero']] * (1 - aer) + MO['bk'][0] * .45 * aer
        out = out * (1 - ink[..., None]) + inkc * ink[..., None]
        # il bollino: 5 px di carta attorno al personaggio, fuori dal suo contorno, antialiasato
        Fg = np.full((H2, W2), 99.)
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                if np.hypot(dy, dx) > 4.5: continue
                g = upn(shift(gioc, -dy, -dx, False), S); dist = np.hypot(I2 + .5 - (ci + dy + .5) * S, J2 + .5 - (cj + dx + .5) * S)
                Fg = np.minimum(Fg, np.where(g, dist, 99.))
        ring = (1 - ss(5 * k1 + 1 - .6, 5 * k1 + 1 + .6, Fg)) * (1 - persU)
        out = out * (1 - ring[..., None]) + PAL[IDX['carta']] * ring[..., None]
    return np.clip(out, 0, 1), dict(A=A, carta=float((A == IDX['carta']).mean()), Y=YU)

if __name__ == '__main__':
    nome = sys.argv[1]; mom = sys.argv[2] if len(sys.argv) > 2 else None; mom = float(mom) if mom and mom[0].isdigit() else mom
    o, info = stile2(nome, mom); Image.fromarray((o * 255).astype(np.uint8)).save(sys.argv[3] if len(sys.argv) > 3 else f'/tmp/{nome}.png'); print('carta', round(info['carta'], 3))
