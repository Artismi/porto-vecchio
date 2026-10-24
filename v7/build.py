# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file; i nomi possono avere cifre: oggetti3d.js, veicoli3d.js, arredo3d.js)
# e editor.html, lo Studio: lo stesso gioco con window.PV_STUDIO acceso (mappa, interni, hangar dei modelli; vedi src/studio.js)
import re
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
def sub(m):
    return open('src/' + m.group(1), encoding='utf-8', errors='ignore').read()
# pezzi_citta.js (la libreria dei pezzi urbani grandi) entra dopo oggetti3d.js: dipende solo da THREE
# lo Studio sta fuori dal gioco: studio.js solo in editor.html (nel gioco l'editor non si apre, applica solo i ritocchi)
SOLO_STUDIO = {'studio.js'}
# [pausa] moduli messi da parte per ora (il codice resta in src/, con le sue prove): fuori sia dal gioco sia dallo Studio.
# Per rimetterlo basta togliere il nome da qui.
IN_PAUSA = {'skate.js'}
# [avvio] l'impronta di ogni file di assets/ (window.PV_VER, letta da avvio.js PV_V): i modelli si chiedono come ...glb?v=<impronta>,
# così vercel.json li tiene in cache un anno (immutable) e un file cambiato ha un indirizzo nuovo
import hashlib, json, os
VER = {}
for d, _, fs in os.walk('assets'):
    for f in sorted(fs):
        if f.rsplit('.', 1)[-1].lower() in ('glb', 'json', 'png', 'jpg', 'webp'):
            q = os.path.join(d, f).replace(os.sep, '/')
            VER[q] = hashlib.sha1(open(q, 'rb').read()).hexdigest()[:10]
VER_JS = '<script>window.PV_VER = ' + json.dumps(dict(sorted(VER.items())), separators=(',', ':')) + ';</script>\n'
h = h.replace('<script', VER_JS + '<script', 1)
out = re.sub(r'/\*([a-z0-9_.]+\.js)\*/', lambda m: '' if m.group(1) in SOLO_STUDIO or m.group(1) in IN_PAUSA else sub(m), h)
studio = re.sub(r'/\*([a-z0-9_.]+\.js)\*/', lambda m: '' if m.group(1) in IN_PAUSA else sub(m), h)
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html', len(out))
st = studio.replace('<title>Porto Vecchio — Isola</title>', '<title>Porto Vecchio — Studio</title>', 1)
i = st.index('<script')
st = st[:i] + '<script>window.PV_STUDIO = true;</script>\n' + st[i:]
open('editor.html', 'w', encoding='utf-8').write(st)
print('editor.html', len(st))
