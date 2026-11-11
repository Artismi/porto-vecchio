# [graffitipool] le tavole di GRAFFITI_POOL.md dai numeri delle sonde:
#   python3 strumenti/fogli_graffiti_pool.py <cartella sonde> <cartella pool> <uscita>
# <cartella sonde>: oggi.json, g2.json e le foto oggi_NN.png, g2_NN.png (strumenti/graffiti_vista.js)
# <cartella pool>:  pool_tass.json, pool_senza.json, pool_vecchia.json, pool_tass_g2.json (strumenti/graffiti_pool.js)
# Esce: diagnosi.jpg (perché se ne vedono pochi), prima_dopo.jpg (gli stessi posti, oggi | ?graffiti2, coi costi), catalogo.jpg (il conto del pool
# e i fogli del catalogo in piccolo).
import sys, os, json, glob
# [graffiti_ny] la tavola NY (ny.jpg): sei posti alla camera del gioco, oggi | ?graffiti2 NY, e i lavori da vicino:
#   python3 strumenti/fogli_graffiti_pool.py ny <oggi.json> <ny.json> <pezzi.jpg> <pool_tass.json> <pool_tass_g2.json> <catalogo dir> <uscita.jpg>
if len(sys.argv) > 1 and sys.argv[1] == 'ny':
    from PIL import Image, ImageDraw, ImageFont
    OG, NY, PZ, PT, PG, CAT, OUTF = sys.argv[2:9]
    J = lambda q: json.load(open(q))
    og, ny, pt, pg = J(OG), J(NY), J(PT), J(PG)
    FN = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    f = lambda s, b=False: ImageFont.truetype(FB if b else FN, s)
    INK, MUTE, BG = '#1a1714', '#5c544c', '#f4efe6'
    Wd, TW, TH, PAD = 2400, 1170, 658, 20
    pn = {p['n']: p for p in ny['posti'] if not p.get('manca')}
    po = {p['n']: p for p in og['posti'] if not p.get('manca')}
    ns = [n for n in sorted(pn) if n in po]
    pz = Image.open(PZ).convert('RGB'); pz.thumbnail((Wd, 99999))
    H = 266 + len(ns) * (TH + 96) + 120 + pz.height + 760
    im = Image.new('RGB', (Wd, H), BG); d = ImageDraw.Draw(im)
    d.text((PAD, 18), 'Graffiti come a New York (?graffiti2, graffiti_ny): sei posti alla camera del gioco, oggi | NY', font=f(38, True), fill=INK)
    tot = lambda q: q['totale']
    d.text((PAD, 74), 'Stessa camera (camera7), stessi posti, ore 15, coi tasselli di serie (impronta invariata). A sinistra la città di oggi, a destra ?graffiti2: solo pezzi da writer, mai due uguali, agganciati al muro vero.', font=f(20), fill=MUTE)
    sti = pg['stili']; mix = ', '.join('%s %d' % (k, v) for k, v in sorted(sti.items(), key=lambda a: -a[1]))
    d.text((PAD, 106), 'Lavori nell\'isola: oggi %d (borgo %d) → NY %d (borgo %d). NY: %s.' % (tot(pt), pt['borgo'], tot(pg), pg['borgo'], mix), font=f(20), fill=INK)
    g = pg.get('g2') or {}; cv = g.get('convertiti', {}); un = g.get('unici', {})
    d.text((PAD, 134), 'Tolti (non da writer): murale, personaggio, stencil, scritta, manifesto, rifatti nello stesso posto: %s.' % ', '.join('%s %d' % kv for kv in cv.items()), font=f(18), fill=MUTE)
    d.text((PAD, 158), 'Doppioni (stile, nome, tavolozza o colore): 0 su %d lavori (node src/test_graffiti2.js). Cambiati per non ripetersi: %s.' % (un.get('lavori', 0), ', '.join('%s %d' % kv for kv in g.get('cambi', {}).items())), font=f(18), fill=MUTE)
    m = lambda L, k: sum(p[k] for p in L) / max(1, len(L))
    LO, LN = [po[n] for n in ns], [pn[n] for n in ns]
    d.text((PAD, 186), 'Per fotogramma (media dei %d posti): nel quadro %.1f → %.1f · visibili %.1f → %.1f · leggibili %.1f → %.1f · falliti (i raggi non trovano il muro) %.1f → %.1f' % (len(ns), m(LO, 'quadro'), m(LN, 'quadro'), m(LO, 'visibili'), m(LN, 'visibili'), m(LO, 'leggibili'), m(LN, 'leggibili'), m(LO, 'falliti'), m(LN, 'falliti')), font=f(22, True), fill=INK)
    co = lambda L, k: sum(p['costo'][k] or 0 for p in L) / max(1, len(L))
    d.text((PAD, 220), 'Costo (media): disegni %.0f → %.0f · pagine dell\'atlante %.0f → %.0f · grafiche di lavori %.0f → %.0f · veli vivi %.0f → %.0f · tessiture %.0f → %.0f · memoria JS %.0f → %.0f MB' % (co(LO, 'disegni'), co(LN, 'disegni'), co(LO, 'atlante'), co(LN, 'atlante'), co(LO, 'graficaLavori'), co(LN, 'graficaLavori'), co(LO, 'veliVivi'), co(LN, 'veliVivi'), co(LO, 'tessiture'), co(LN, 'tessiture'), co(LO, 'memMB'), co(LN, 'memMB')), font=f(18), fill=MUTE)
    y = 266
    def cap(p):
        ps = p.get('perStile', {}); vs = ', '.join('%s %d' % (k, v) for k, v in sorted(ps.items(), key=lambda a: -a[1]))
        return 'nel quadro %d · visibili %d · leggibili %d · falliti %d%s' % (p['quadro'], p['visibili'], p['leggibili'], p['falliti'], (' · ' + vs) if vs else '')
    for n in ns:
        a, b = po[n], pn[n]
        d.text((PAD, y), '%d. %s' % (n, a['nome']), font=f(26, True), fill=INK); y += 38
        for k, (p, dr, lab) in enumerate([(a, os.path.dirname(OG), 'oggi'), (b, os.path.dirname(NY), 'NY')]):
            x = PAD + k * (TW + 20); fp = os.path.join(dr, p['foto'])
            if os.path.exists(fp): im.paste(Image.open(fp).convert('RGB').resize((TW, TH)), (x, y))
            d.rectangle((x, y, x + 86, y + 34), fill=INK); d.text((x + 10, y + 4), lab, font=f(22, True), fill='#f4efe6')
            d.text((x, y + TH + 6), cap(p), font=f(17), fill=MUTE)
        y += TH + 58
    d.text((PAD, y + 10), 'Ventiquattro lavori a caso della città NY, da vicino (disegnati col codice del gioco: writer_arte.js + pennelli.js, stile E)', font=f(26, True), fill=INK); y += 56
    im.paste(pz, (0, y)); y += pz.height + 20
    d.text((PAD, y), 'Tolti: i muri interi di simboli (murale), le facce (personaggio), gli stencil (simboli, due uguali di fila); anche scritte a pennello e manifesti (non sono writer)', font=f(26, True), fill=INK); y += 46
    crops = [('catalogo_4.jpg', (26, 1114, 2163, 2509)), ('catalogo_7.jpg', (24, 130, 2334, 814)), ('catalogo_6.jpg', (26, 131, 2325, 773))]
    x = PAD; hh = 560
    for fn, bx in crops:
        q = os.path.join(CAT, fn)
        if not os.path.exists(q): continue
        t = Image.open(q).convert('RGB').crop(bx); t.thumbnail((760, hh)); tt = Image.new('RGB', t.size); im.paste(t, (x, y))
        dd = ImageDraw.Draw(im); dd.line((x, y, x + t.width, y + t.height), fill='#C25B36', width=8); dd.line((x, y + t.height, x + t.width, y), fill='#C25B36', width=8)
        x += t.width + 24
    y += hh + 30
    im = im.crop((0, 0, Wd, y)); im.save(OUTF, quality=85); print(OUTF, im.size); sys.exit(0)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont

SON, POOL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
J = lambda p: json.load(open(p))
oggi, g2 = J(os.path.join(SON, 'oggi.json')), J(os.path.join(SON, 'g2.json'))
P = {k: J(os.path.join(POOL, 'pool_%s.json' % k)) for k in ('tass', 'senza', 'vecchia', 'tass_g2')}
FN = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f = lambda s, b=False: ImageFont.truetype(FB if b else FN, s)
INK, MUTE, BG = '#1a1714', '#5c544c', '#f4efe6'
C = {'leggibili': '#2F60B5', 'piccoli': '#DC9A34', 'taglio': '#C25B36', 'nonvisti': '#6B3D9B', 'coperti': '#A89C92'}
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 13, 'axes.edgecolor': '#b9b0a4', 'axes.labelcolor': INK, 'xtick.color': MUTE, 'ytick.color': MUTE, 'axes.spines.top': False, 'axes.spines.right': False})
posti = [p for p in oggi['posti'] if not p.get('manca')]
pg2 = {p['n']: p for p in g2['posti'] if not p.get('manca')}
media = lambda L, k: sum(p[k] for p in L) / max(1, len(L))

# ---------------- DIAGNOSI ----------------
fig = plt.figure(figsize=(24, 15), dpi=100, facecolor=BG)
fig.suptitle('Perché se ne vedono pochi: i graffiti dalla camera del gioco, giro a piedi nel borgo (città di serie: stile E coi tasselli)', fontsize=22, fontweight='bold', color=INK, x=.02, ha='left', y=.985)
# 1. il tubo: quanti lavori arrivano in città
ax = fig.add_axes([.20, .56, .26, .36], facecolor=BG)
T = P['tass']; tub = [('pianificati dalla strada dipinta', P['senza']['totale']), ('piazzati dalla cottura dei tasselli', T['cottiIn']), ('tenuti dopo il secondo diradamento', T['sd']['cotti']['dopo']), ('nella città di serie (con porte, pali, fondali rifatti)', T['totale']), ('la storia di prima (senza stile E)', P['vecchia']['totale'])]
ys = list(range(len(tub)))[::-1]
ax.barh(ys, [v for _, v in tub], color=['#A89C92', '#A89C92', '#A89C92', C['taglio'], '#d8cfc2'], height=.62)
for y, (k, v) in zip(ys, tub): ax.text(v + 15, y, f'{v}', va='center', fontsize=15, fontweight='bold', color=INK); fig.text(.195, .56 + .36 * (y + .5) / len(tub), k, va='center', ha='right', fontsize=13, color=INK)
ax.set_yticks([]); ax.set_ylim(-.5, len(tub) - .5); ax.set_xlim(0, 1750); ax.set_title('1. Il tubo: dove si perdono i lavori (tutta l\'isola)', loc='left', fontsize=16, color=INK, fontweight='bold')
fig.text(.02, .515, 'La cottura dei tasselli è già lo stile E: rimodella la dirada una seconda volta per zona (TIENI). I grandi: %d pianificati, %d in città.' % (P['senza']['grandi'], T['grandi']), fontsize=13, color=MUTE)
# 2. per posto: cosa c'è nel quadro
ax = fig.add_axes([.50, .56, .48, .36], facecolor=BG)
lab = [str(p['n']) for p in posti]; x = range(len(posti))
parts = [('leggibili', lambda p: p['leggibili'], C['leggibili']), ('troppo piccoli', lambda p: p['piccoli'], C['piccoli']), ('di taglio', lambda p: p['taglio'], C['taglio']), ('non disegnati / falliti / in attesa', lambda p: p['nonDisegnati'] + p['piatti'] + p['falliti'] + p['attesa'], C['nonvisti']), ('coperti (dietro case, tende, mezzi)', lambda p: p['coperti'], C['coperti'])]
bot = [0] * len(posti)
for nm, fn, col in parts:
    v = [fn(p) for p in posti]; ax.bar(x, v, bottom=bot, color=col, width=.7, label=nm, edgecolor=BG, linewidth=2); bot = [a + b for a, b in zip(bot, v)]
dir_ = [((p.get('diradati') or {}).get('leggibili') or 0) for p in posti]
xs_ = [i for i, v in zip(x, dir_) if v]; ax.plot(xs_, [v for v in dir_ if v], 'o', color=INK, markersize=9, label='tolti dal 2° diradamento che da qui si leggerebbero')
ax.set_xticks(list(x)); ax.set_xticklabels(lab); ax.set_xlabel('posto del giro (elenco sotto)'); ax.set_ylabel('lavori col centro nel quadro')
ax.legend(loc='upper right', frameon=False, fontsize=11); ax.set_title('2. Per posto: i lavori nel quadro della camera e perché non si leggono', loc='left', fontsize=16, color=INK, fontweight='bold')
# 3. la camera
ax = fig.add_axes([.04, .08, .30, .38], facecolor=BG)
hc = media(posti, 'camera') if False else sum(p['camera']['alto'] for p in posti) / len(posti); br = sum(p['camera']['braccio'] for p in posti) / len(posti)
import math
for d in range(0, 61, 1): pass
ds = [i for i in range(0, 61)]; top = [hc - (d) * math.tan(math.radians(11)) for d in ds]
ax.fill_between(ds, [0] * len(ds), [max(0, t) for t in top], color='#cfe0f0'); ax.plot(ds, [max(0, t) for t in top], color=C['leggibili'], lw=2)
ax.axhspan(.3, 2.0, color=C['piccoli'], alpha=.18); ax.text(41, 1.0, 'fascia degli occhi\n0,3-2 m', fontsize=11, color=INK)
ax.axvline(br + 35, color=C['taglio'], lw=2, ls='--'); ax.text(br + 35.5, 6.2, 'fondale a 35 m\ndal personaggio', fontsize=11, color=C['taglio'])
ax.set_xlim(0, 60); ax.set_ylim(0, 8); ax.set_xlabel('distanza dalla camera (m)'); ax.set_ylabel('quota sul muro (m)')
ax.set_title('3. Cosa vede la camera7 dei muri davanti', loc='left', fontsize=16, color=INK, fontweight='bold')
fig.text(.04, .015, 'Camera a %.1f m dal suolo (media del giro), braccio %.1f m, bordo alto 11° sotto l\'orizzonte:\nin azzurro la parte di muro dentro il quadro. A 35 m solo la base: i fondali e i verticali stanno fuori.' % (hc, br), fontsize=11, color=MUTE)
# 4. i numeri del giro
ax = fig.add_axes([.38, .08, .60, .38]); ax.axis('off')
riga = lambda p: f"{p['n']:>2}. {p['nome'][:44]:<44}  nel quadro {p['quadro']:>3}   visibili {p['visibili']:>3}   leggibili {p['leggibili']:>2}"
txt = '\n'.join(riga(p) for p in posti)
tot = lambda k: sum(p[k] for p in posti)
txt += f"\n\nMedia per fotogramma: {media(posti, 'visibili'):.1f} visibili, {media(posti, 'leggibili'):.1f} leggibili (alti e larghi ≥ 24 px a 540 righe, non di taglio)."
txt += f"\nNel quadro e non leggibili: troppo piccoli {tot('piccoli')}, di taglio {tot('taglio')}, coperti {tot('coperti')}, non disegnati {tot('nonDisegnati') + tot('piatti')}, falliti {tot('falliti')}, in attesa {tot('attesa')}."
dl = sum(((p.get('diradati') or {}).get('visibili') or 0) for p in posti); dg = sum(((p.get('diradati') or {}).get('leggibili') or 0) for p in posti)
txt += f"\nTolti dal secondo diradamento: {dl} si vedrebbero da questi posti, {dg} si leggerebbero."
ax.text(0, 1, txt, va='top', family='DejaVu Sans Mono', fontsize=12.5, color=INK)
fig.savefig(os.path.join(OUT, 'diagnosi.png'), facecolor=BG); plt.close(fig)
Image.open(os.path.join(OUT, 'diagnosi.png')).convert('RGB').save(os.path.join(OUT, 'diagnosi.jpg'), quality=88); os.remove(os.path.join(OUT, 'diagnosi.png'))

# ---------------- PRIMA / DOPO ----------------
scelti = sorted(posti, key=lambda p: -(10 * (pg2.get(p['n'], {}).get('leggibili', 0) - p['leggibili']) + pg2.get(p['n'], {}).get('visibili', 0) - p['visibili']))[:8]
scelti.sort(key=lambda p: p['n'])
TW, TH = 960, 540; pad = 18; hh = 70
Wd = pad + 2 * (TW + pad); Hd = 150 + len(scelti) * (TH + hh + pad) + 260
im = Image.new('RGB', (Wd, Hd), BG); dr = ImageDraw.Draw(im)
dr.text((pad, 18), 'Prima | dopo: stessi posti, stessa camera del gioco (camera7), ore 15 serene. Sinistra: di serie · destra: ?graffiti2', font=f(30, True), fill=INK)
dr.text((pad, 62), 'Il gioco vero in Chromium senza testa (SwiftShader, 960 × 540), i graffiti piazzati e disegnati dal gioco stesso; la foto è la tela della pagina (col passo dello stile E).', font=f(20), fill=MUTE)
dr.text((pad, 92), 'Sotto ogni foto: lavori visibili / leggibili nel quadro, i disegni del fotogramma, le pagine dell\'atlante, i lavori in memoria.', font=f(20), fill=MUTE)
y = 150
for p in scelti:
    q = pg2.get(p['n'])
    for k, (r, nm) in enumerate(((p, 'oggi'), (q, '?graffiti2'))):
        x0 = pad + k * (TW + pad)
        if r:
            fp = os.path.join(SON, r['foto'])
            if os.path.exists(fp): im.paste(Image.open(fp).convert('RGB').resize((TW, TH)), (x0, y))
            c = r['costo']
            dr.text((x0, y + TH + 6), f"{p['n']}. {p['nome']} — {nm}", font=f(21, True), fill=INK)
            dr.text((x0, y + TH + 36), f"visibili {r['visibili']} · leggibili {r['leggibili']} · disegni {c['disegni']} · atlante {c['atlante']} pag. · lavori in memoria {r['lavori']} · memoria JS {c['memMB']} MB", font=f(18), fill=MUTE)
    y += TH + hh + pad
mo, mg = media(posti, 'leggibili'), media(list(pg2.values()), 'leggibili')
vo, vg = media(posti, 'visibili'), media(list(pg2.values()), 'visibili')
co = lambda L, k: sum(p['costo'][k] or 0 for p in L) / max(1, len(L))
dr.text((pad, y + 10), f"Media del giro ({len(posti)} posti): visibili {vo:.1f} → {vg:.1f}, leggibili {mo:.1f} → {mg:.1f} per fotogramma.", font=f(26, True), fill=INK)
dr.text((pad, y + 52), f"Costo medio: disegni {co(posti, 'disegni'):.0f} → {co(list(pg2.values()), 'disegni'):.0f}; pagine d'atlante {co(posti, 'atlante'):.1f} → {co(list(pg2.values()), 'atlante'):.1f}; grafiche di lavori {co(posti, 'graficaLavori'):.0f} → {co(list(pg2.values()), 'graficaLavori'):.0f}; tessiture {co(posti, 'tessiture'):.0f} → {co(list(pg2.values()), 'tessiture'):.0f}; memoria JS {co(posti, 'memMB'):.0f} → {co(list(pg2.values()), 'memMB'):.0f} MB.", font=f(22), fill=INK)
dr.text((pad, y + 90), f"Lavori in memoria in tutta l'isola: {posti[0]['lavori']} → {list(pg2.values())[0]['lavori']} (la storia di prima, senza stile E: {P['vecchia']['totale']}).", font=f(22), fill=INK)
dr.text((pad, y + 128), 'I millisecondi per fotogramma sotto SwiftShader non dicono niente della scheda vera: il banco va rifatto sull\'Iris Xe con e senza ?graffiti2, stesso giro.', font=f(20), fill=MUTE)
im = im.crop((0, 0, Wd, y + 180)); im.save(os.path.join(OUT, 'prima_dopo.jpg'), quality=86)

# ---------------- CATALOGO (indice) ----------------
NOME = {'tag': 'tag', 'mtag': 'tag a pennarello', 'throw': 'throw-up', 'pezzo': 'pezzo', 'burner': 'burner', 'gotico': 'gotico', 'mostro': 'personaggio', 'wholecar': 'whole car', 'rullo': 'rullo', 'verticale': 'verticale', 'estintore': 'tag a estintore', 'stencil': 'stencil', 'scritta': 'scritta', 'manifesto': 'manifesto', 'adesivi': 'adesivi', 'murale': 'murale', 'calli': 'calligraffiti', 'buff': 'toppa grigia'}
fogli = sorted(glob.glob(os.path.join(OUT, 'catalogo_*.jpg')), key=lambda s: int(s.rsplit('_', 1)[1].split('.')[0]))
Wc = 2400; im = Image.new('RGB', (Wc, 4000), BG); dr = ImageDraw.Draw(im)
dr.text((30, 24), 'IL POOL DEI GRAFFITI: quanti di ogni stile ci sono nella città', font=f(40, True), fill=INK)
dr.text((30, 80), 'Colonne: la città di serie (stile E coi tasselli: quello che si gioca) · di cui nel borgo · senza tasselli · con ?graffiti2 (la proposta) · la storia di prima (senza stile E)', font=f(22), fill=MUTE)
cols = [('città di serie', 'tass'), ('nel borgo', 'tassB'), ('senza tasselli', 'senza'), ('?graffiti2', 'tass_g2'), ('storia di prima', 'vecchia')]
y = 130; xs = [30, 520, 840, 1120, 1420, 1720]
dr.text((xs[0], y), 'stile', font=f(24, True), fill=INK)
for i, (n, _) in enumerate(cols): dr.text((xs[i + 1], y), n, font=f(24, True), fill=INK)
y += 40
get = lambda k, s: (P['tass']['stiliBorgo'] if k == 'tassB' else P[k]['stili']).get(s, 0)
for s in NOME:
    dr.text((xs[0], y), NOME[s], font=f(24), fill=INK)
    for i, (_, k) in enumerate(cols): dr.text((xs[i + 1], y), str(get(k, s)), font=f(24, k == 'tass'), fill=INK)
    y += 34
dr.line((30, y + 4, 2000, y + 4), fill='#b9b0a4', width=2); y += 14
dr.text((xs[0], y), 'TOTALE', font=f(26, True), fill=INK)
for i, (_, k) in enumerate(cols): dr.text((xs[i + 1], y), str(P['tass']['borgo'] if k == 'tassB' else P[k]['totale']), font=f(26, True), fill=INK)
y += 60
cr = P['tass']['crew']
dr.text((30, y), 'Crew nella città di serie: ' + ', '.join(f'{k} {v}' for k, v in cr.items()), font=f(22), fill=INK); y += 36
ad = P['tass']['adesivi']; dr.text((30, y), f"Adesivi: {ad['muro']} grappoli sui muri, {ad['porte']} accanto alle porte, {ad['pali']} sui pali, {ad['retro']} dietro i cartelli · manifesti: {P['tass']['stili'].get('manifesto', 0)} punti, {P['tass']['fogliManifesti']} fogli · toppe grigie {P['tass']['toppe']}", font=f(22), fill=INK); y += 60
dr.text((30, y), 'I fogli del catalogo (in grande: catalogo_1.jpg … catalogo_%d.jpg)' % len(fogli), font=f(28, True), fill=INK); y += 46
tw = (Wc - 60 - 2 * 20) // 3; x = 30; rowh = 0
for i, fp in enumerate(fogli):
    t = Image.open(fp).convert('RGB'); t.thumbnail((tw, 900)); im.paste(t, (x, y)); rowh = max(rowh, t.height)
    x += tw + 20
    if (i + 1) % 3 == 0: x = 30; y += rowh + 20; rowh = 0
y += rowh + 30
im.crop((0, 0, Wc, y)).save(os.path.join(OUT, 'catalogo.jpg'), quality=86)
print('ok', OUT)
