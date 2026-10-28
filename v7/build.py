# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file; i nomi possono avere cifre: oggetti3d.js, veicoli3d.js, arredo3d.js)
# e editor.html, lo Studio: lo stesso gioco con window.PV_STUDIO acceso (mappa, interni, hangar dei modelli; vedi src/studio.js)
# [cotto] e il mondo cotto (mondo_cotto.js, strumenti/cuoci.js in Node): si rifà quando cambia l'impronta dei sorgenti che lo producono
# (src/cotto.js, FONTI). python3 build.py --senza-cotto: non cuoce (il gioco, se l'impronta non torna, calcola come prima).
import re, sys, os, hashlib, subprocess
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
def sub(m):
    return open('src/' + m.group(1), encoding='utf-8', errors='ignore').read()
# [cotto] l'impronta: sha1 dei sorgenti di Cotto.FONTI, nell'ordine (nome, zero, contenuto, zero); la stessa di strumenti/cuoci.js
FONTI = [q.strip().strip("'") for q in re.search(r"const FONTI = \[([^\]]*)\]", open('src/cotto.js', encoding='utf-8').read()).group(1).split(',') if q.strip()]
_h = hashlib.sha1()
for f in FONTI:
    _h.update(f.encode()); _h.update(b'\0'); _h.update(open('src/' + f, 'rb').read()); _h.update(b'\0')
IMPRONTA = _h.hexdigest()[:16]
# pezzi_citta.js (la libreria dei pezzi urbani grandi) entra dopo oggetti3d.js: dipende solo da THREE
# lo Studio sta fuori dal gioco: studio.js solo in editor.html (nel gioco l'editor non si apre, applica solo i ritocchi)
SOLO_STUDIO = {'studio.js'}
# [pausa] moduli messi da parte per ora (il codice resta in src/, con le sue prove): fuori sia dal gioco sia dallo Studio.
# Per rimetterlo basta togliere il nome da qui.
IN_PAUSA = {'skate.js'}
h = h.replace('__IMPRONTA_MONDO__', IMPRONTA)
# [avvio] l'impronta di ogni file di assets/ (window.PV_VER, letta da avvio.js PV_V): i modelli si chiedono come ...glb?v=<impronta>,
# così vercel.json li tiene in cache un anno (immutable) e un file cambiato ha un indirizzo nuovo
import hashlib, json, os
VER = {}
for d, _, fs in os.walk('assets'):
    for f in sorted(fs):
        if f.rsplit('.', 1)[-1].lower() in ('glb', 'json', 'png', 'jpg', 'webp', 'gz'):   # [compressi] anche i .glb.gz
            q = os.path.join(d, f).replace(os.sep, '/')
            VER[q] = hashlib.sha1(open(q, 'rb').read()).hexdigest()[:10]
VER_JS = '<script>window.PV_VER = ' + json.dumps(dict(sorted(VER.items())), separators=(',', ':')) + ';</script>\n'
h = h.replace('<script', VER_JS + '<script', 1)
# [tasselli] l'impronta della città a tasselli: tutti i moduli del gioco (la città nasce da tutti), i modelli, il mondo cotto e
# l'esportatore; non il caricatore dei tasselli (cambiarlo non cambia la città). tasselli/indice.json deve avere la stessa
TASS_FUORI = {'tasselli.js', 'tasselli_lavoratore.js', 'meshopt_decoder.js'}
_t = hashlib.sha1()
for f in re.findall(r'/\*([a-z0-9_.]+\.js)\*/', h):
    if f in TASS_FUORI or f in SOLO_STUDIO or f in IN_PAUSA: continue
    _t.update(f.encode()); _t.update(b'\0'); _t.update(open('src/' + f, 'rb').read()); _t.update(b'\0')
for f in ('strumenti/tassella.js', 'strumenti/tassella_pagina.js'):
    _t.update(open(f, 'rb').read())
_t.update(VER_JS.encode()); _t.update(IMPRONTA.encode())
IMPRONTA_TASS = _t.hexdigest()[:16]
h = h.replace('__IMPRONTA_TASS__', IMPRONTA_TASS)
out = re.sub(r'/\*([a-z0-9_.]+\.js)\*/', lambda m: '' if m.group(1) in SOLO_STUDIO or m.group(1) in IN_PAUSA else sub(m), h)
studio = re.sub(r'/\*([a-z0-9_.]+\.js)\*/', lambda m: '' if m.group(1) in IN_PAUSA else sub(m), h)
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html', len(out))
st = studio.replace('<title>Porto Vecchio — Isola</title>', '<title>Porto Vecchio — Studio</title>', 1)
i = st.index('<script')
st = st[:i] + '<script>window.PV_STUDIO = true;</script>\n' + st[i:]
open('editor.html', 'w', encoding='utf-8').write(st)
print('editor.html', len(st))
# [cotto] il mondo cotto: solo se manca o è di un'altra impronta (ci vogliono ~30 s di Node)
if '--senza-cotto' not in sys.argv:
    fatto = None
    if os.path.exists('mondo_cotto.js'):
        with open('mondo_cotto.js', encoding='utf-8', errors='ignore') as f:
            m = re.search(r'Impronta ([0-9a-f]+)', f.read(400))
            fatto = m.group(1) if m else None
    if fatto == IMPRONTA:
        print('mondo_cotto.js', IMPRONTA, '(già cotto)')
    else:
        r = subprocess.run(['node', 'strumenti/cuoci.js', '--impronta=' + IMPRONTA])
        if r.returncode != 0:
            print('mondo_cotto.js NON cotto (il gioco calcolerà il mondo): node strumenti/cuoci.js per vedere perché')
# [tasselli] la città a tasselli (strumenti/tassella.js: la città costruita in Chromium senza testa, poi tagliata e compressa, 15-20 min
# su questa macchina): solo se manca o è di un'altra impronta, e solo con --tasselli (o PV_TASSELLI=1), perché la cottura è lunga e ogni
# sorgente del gioco cambia l'impronta. Per il sito non serve: i tasselli non stanno in git, li cuoce il workflow di GitHub
# (.github/workflows/tasselli.yml) e li scarica il build di Vercel (strumenti/prendi_tasselli.sh). Finché mancano o sono di un'altra
# impronta il gioco costruisce la città nel browser come prima
if '--tasselli' in sys.argv or os.environ.get('PV_TASSELLI') == '1':
    fatto = None
    try:
        with open('tasselli/indice.json', encoding='utf-8') as f:
            m = re.search(r'"impronta":"([0-9a-z]+)"', f.read(400))
            fatto = m.group(1) if m else None
    except OSError:
        pass
    if fatto == IMPRONTA_TASS:
        print('tasselli', IMPRONTA_TASS, '(già cotti)')
    else:
        r = subprocess.run(['node', 'strumenti/tassella.js', '--impronta=' + IMPRONTA_TASS])
        if r.returncode != 0:
            print('tasselli NON cotti (il gioco costruirà la città come prima): node strumenti/tassella.js per vedere perché')
else:
    print('tasselli: impronta', IMPRONTA_TASS, '(python3 build.py --tasselli per cuocerli)')
