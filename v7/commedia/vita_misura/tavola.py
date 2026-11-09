from PIL import Image, ImageDraw, ImageFont
import textwrap, sys
W, H = 2000, 1300
C = dict(carta='#F2E7CF', osso='#D2C2A6', sasso='#A89C92', lilla='#A68FB6', piombo='#7C7186', lavagna='#3D3548', nero='#16121B',
         pesca='#F0BE8C', ocra='#DC9A34', cotto='#C25B36', mattone='#6F2B2E', cielo='#A3D4D8', acqua='#2A8A8A', oltremare='#2F60B5',
         notte='#202D5E', salvia='#93B27C', persiana='#3F8A50', rosa='#E04B8C', viola='#6B3D9B', vermiglio='#F04A23', limone='#FFE03A', allarme='#FF2E5E')
D = '/usr/share/fonts/truetype/dejavu/'
F = lambda s, b=False: ImageFont.truetype(D + ('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf'), s)
FC = lambda s: ImageFont.truetype(D + 'DejaVuSans-Bold.ttf', s)
im = Image.new('RGB', (W, H), C['carta']); d = ImageDraw.Draw(im)
def wrap(t, f, w):
    out = []
    for par in t.split('\n'):
        line = ''
        for wd in par.split(' '):
            tt = (line + ' ' + wd).strip()
            if d.textlength(tt, font=f) <= w: line = tt
            else: out.append(line); line = wd
        out.append(line)
    return out
def text(x, y, t, f, fill, w=None, lh=1.22):
    L = wrap(t, f, w) if w else t.split('\n')
    for i, l in enumerate(L): d.text((x, y + i * f.size * lh), l, font=f, fill=fill)
    return y + len(L) * f.size * lh
# testata
d.rectangle([0, 0, W, 112], fill=C['nero'])
d.text((40, 18), 'LA VITA FRA LORO', font=F(54, True), fill=C['carta'])
d.text((40 + d.textlength('LA VITA FRA LORO', font=F(54, True)) + 30, 40), 'un filo sottile che cuce quello che c’è già  ·  vita.js dietro ?commedia  ·  prima il fatto, poi la parola', font=F(24), fill=C['ocra'])
d.text((40, 84), 'Mauro e Gino, quattro giorni: ogni battuta nasce da un fatto di un sistema che già gira, e ne lascia un altro', font=F(19), fill=C['osso'])
# linea del tempo
y0 = 150
d.text((40, y0), 'UNA COPPIA, QUATTRO GIORNI', font=F(26, True), fill=C['nero'])
PAN = [
  ('MAR 10:40', 'fontana', 'chiede un prestito', C['oltremare'],
   [('Mauro', 'Mi presti dieci? Venerdì te li rendo.'), ('Gino', 'Venerdì di quale anno?'), ('Mauro', 'Di questo. Forse.')],
   'perché: soldi > .6 (popolo, progetto «affitto»)', '−10.000 Gino → Mauro · P.debiti · promessa p31 «entro venerdì»'),
  ('MAR 10:42', 'fontana', 'l’appuntamento', C['persiana'],
   [('Gino', 'Allora stasera scopa. Alle otto, all’Osteria.'), ('Mauro', 'Coi tuoi dieci?'), ('Gino', 'Coi miei dieci.')],
   'perché: tutti e due «carte», liberi alle 20', 'Po.appoint 20:00 · due promesse (p32, p33) · nel Taccuino se lo senti'),
  ('MAR 20:00', 'Osteria del Porto', 'ci vanno davvero', C['ocra'],
   [('Gino', 'Otto e cinque. Paghi il primo giro.'), ('Mauro', 'Con che soldi? Ah, già. I tuoi.')],
   'perché: il blocco «appuntamento» nella giornata', 'p32 p33 fatte · Azioni gioca: −4.000 Mauro · simpatia +.06'),
  ('MAR 20:30', 'Osteria del Porto', 'il furto visto', C['allarme'],
   [('Mauro', 'Gino! Quello t’ha preso il portafoglio!'), ('Gino', 'Il mio? …Il MIO! Fermo, stronzo!'), ('Tore', 'Non mi avete visto!')],
   'perché: Tore borsaiolo fa il giro (popolo doGiro)', 'furto vero · Mauro testimone (visto) · Gino lo segue · Grigio a 18 m: denuncia'),
  ('VEN 18:10', 'calata', 'la promessa scade', C['viola'],
   [('Gino', 'Venerdì. Dieci. Ti ricordi?'), ('Mauro', 'Mi ricordo benissimo. È quello il problema.')],
   'perché: p31 scade; Mauro ha 3.000 (soldi veri)', 'p31 → contratta «lunedì» · opinione −.08 · la riga resta nel diario'),
  ('LUN 9:15', 'bar Sirena', 'resa in ritardo', C['acqua'],
   [('Mauro', 'Tieni. Dieci. Contali.'), ('Gino', 'Venerdì era tre giorni fa.'), ('Mauro', 'E sono venuto lo stesso. Rispetto.')],
   'perché: paga del lunedì (soldi.js), debito aperto', 'debito saldato faccia a faccia · nota «paga, ma tardi» · Gino gli presta ancora, meno'),
]
pw, gap, px = 300, 18, 40
ty = y0 + 52
d.line([px, ty + 14, W - 40, ty + 14], fill=C['nero'], width=4)
for i, (ora, dove, cosa, col, battute, perche, fatto) in enumerate(PAN):
    x = px + i * (pw + gap)
    d.ellipse([x + 10, ty + 4, x + 30, ty + 24], fill=col, outline=C['nero'], width=3)
    d.rectangle([x + 36, ty - 2, x + 40 + d.textlength(ora, font=F(22, True)) + 8, ty + 28], fill=C['carta'])
    d.text((x + 42, ty), ora, font=F(22, True), fill=C['nero'])
    by = ty + 40
    d.rectangle([x, by, x + pw, by + 520], fill=C['osso'], outline=C['nero'], width=3)
    d.rectangle([x, by, x + pw, by + 64], fill=col)
    d.text((x + 12, by + 6), cosa.upper(), font=FC(22), fill=C['carta'] if col not in (C['ocra'],) else C['nero'])
    d.text((x + 12, by + 36), dove, font=F(17), fill=C['carta'] if col not in (C['ocra'],) else C['nero'])
    yy = by + 80
    for k, (chi, t) in enumerate(battute):
        f = F(18); L = wrap(t, f, pw - 52)
        hgt = 26 + len(L) * 23
        bx = x + (14 if k % 2 == 0 else 34)
        d.rounded_rectangle([bx, yy, bx + pw - 48, yy + hgt], radius=12, fill=C['carta'], outline=C['nero'], width=2)
        tx = bx + 26 if k % 2 == 0 else bx + pw - 74
        d.polygon([(tx, yy + hgt - 1), (tx + 14, yy + hgt - 1), (tx + (-6 if k % 2 == 0 else 20), yy + hgt + 14)], fill=C['carta'], outline=C['nero'])
        d.line([tx + 1, yy + hgt - 1, tx + 13, yy + hgt - 1], fill=C['carta'], width=3)
        d.rectangle([bx + 10, yy - 11, bx + 10 + d.textlength(chi, font=F(14, True)) + 12, yy + 9], fill=C['nero'])
        d.text((bx + 16, yy - 10), chi, font=F(14, True), fill=C['carta'])
        for j, l in enumerate(L): d.text((bx + 12, yy + 14 + j * 23), l, font=f, fill=C['nero'])
        yy += hgt + 30
    # perché e fatto
    fy = max(by + 330, yy - 8)
    d.line([x + 12, fy, x + pw - 12, fy], fill=C['piombo'], width=2)
    yb = text(x + 12, fy + 10, perche, F(16), C['lavagna'], pw - 24)
    d.rectangle([x + 8, yb + 8, x + pw - 8, by + 512], fill=C['nero'])
    d.text((x + 16, yb + 14), 'COSA CAMBIA', font=F(14, True), fill=col if col != C['notte'] else C['cielo'])
    text(x + 16, yb + 36, fatto, F(16), C['carta'], pw - 32)
# frecce tra i pannelli
for i in range(len(PAN) - 1):
    x = px + (i + 1) * (pw + gap) - gap
    yy = ty + 40 + 260
    d.polygon([(x + 1, yy - 12), (x + gap - 1, yy), (x + 1, yy + 12)], fill=C['nero'])
# mappa dei fili
my = ty + 40 + 520 + 28
d.text((40, my), 'MAPPA DEI FILI', font=F(26, True), fill=C['nero'])
d.text((265, my + 6), 'niente simulazione nuova: vita.js legge lo stato che c’è e collega un sistema all’altro', font=F(18), fill=C['lavagna'])
cx, cy = 668, my + 245
BOX = [
  ('popolo', 'appuntamenti, prestiti, diario', 'l’incontro si parla; il prestito pesa', -1, -165, C['persiana']),
  ('azioni', 'social(): offri, gioca, litiga', 'l’intento scelto diventa 2-6 battute', -1, -55, C['ocra']),
  ('scambi', 'debiti, patti, sulla parola', 'patto = promessa; saldo di persona', -1, 55, C['oltremare']),
  ('convivenza', '«stasera vedo Gino»', 'detto a Gino, non al vento', -1, 165, C['acqua']),
  ('trame', 'rancori, infamie, agguati', 'rancore → accusa → non ti vendo', 1, -165, C['mattone']),
  ('ordine', 'Grigi, denunce lontane', 'furto visto → «Agente, è lui!»', 1, -55, C['piombo']),
  ('matti + commedia', 'la fila a due voci', 'lo scambio passa da quella fila', 1, 55, C['viola']),
  ('parola', 'promesse col giocatore', 'chi/a anche fra due NPC', 1, 165, C['vermiglio']),
]
BW, BH = 400, 92
for (nm, c1, filo, side, dy, col) in BOX:
    bx0 = 20 if side < 0 else W - 680 - BW + 20
    byy = cy + dy - BH // 2
    ex = bx0 + BW if side < 0 else bx0
    d.line([cx + side * 120, cy + dy * .3, ex, cy + dy], fill=col, width=4)
    d.rectangle([bx0, byy, bx0 + BW, byy + BH], fill=C['carta'], outline=col, width=5)
    d.text((bx0 + 12, byy + 6), nm, font=F(20, True), fill=col)
    d.text((bx0 + 12 + d.textlength(nm, font=F(20, True)) + 10, byy + 10), 'c’è: ' + c1, font=F(15), fill=C['lavagna'])
    d.rectangle([bx0 + 8, byy + 40, bx0 + BW - 8, byy + BH - 8], fill=C['nero'])
    d.text((bx0 + 16, byy + 50), '+ ' + filo, font=F(17, True), fill=C['limone'])
d.ellipse([cx - 125, cy - 72, cx + 125, cy + 72], fill=C['limone'], outline=C['nero'], width=4)
d.text((cx - d.textlength('vita.js', font=F(30, True)) / 2, cy - 48), 'vita.js', font=F(30, True), fill=C['nero'])
for i, l in enumerate(['il filo, non un motore', '~400 righe · < 0,3 ms']):
    f = F(17); d.text((cx - d.textlength(l, font=f) / 2, cy - 6 + i * 24), l, font=f, fill=C['nero'])
# regole e numeri
rx = 1360; ry = my
d.rectangle([rx, ry, W - 40, H - 30], fill=C['nero'])
yy = ry + 18
d.text((rx + 22, yy), 'OGGI (misura headless, 2 giorni)', font=F(20, True), fill=C['ocra']); yy += 38
NUM = sys.argv[1].split('|') if len(sys.argv) > 1 else []
for t in NUM:
    yy = text(rx + 22, yy, '· ' + t, F(17), C['carta'], W - 40 - rx - 44) + 4
yy += 12
d.text((rx + 22, yy), 'LE REGOLE', font=F(20, True), fill=C['ocra']); yy += 36
for t in ['prima il fatto, poi la parola: l’esito lo decide il motore',
          'ogni sì è una promessa di parola.js, anche fra due NPC',
          'a voce solo entro 26 m, uno scambio ogni 40-60 s; lontano solo i conti',
          'la volta dopo la battuta lo sa: «Mi devi ancora i dieci»',
          'il giocatore: lo sente passando, il Taccuino («Sentito dire») lo tiene, poi lo vede succedere',
          'si toglie un ?commedia e il gioco torna com’è oggi']:
    yy = text(rx + 22, yy, '· ' + t, F(17), C['carta'], W - 40 - rx - 44) + 4
im.save('/home/user/porto-vecchio/v7/_immagini/commedia/vita_npc_tavola.jpg', quality=90)
print('ok', yy)
