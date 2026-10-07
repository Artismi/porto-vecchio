# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file)
# e editor.html, lo Studio: lo stesso gioco con window.PV_STUDIO acceso (mappa, interni, hangar dei modelli; vedi src/studio.js)
import re
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
def sub(m):
    return open('src/' + m.group(1), encoding='utf-8', errors='ignore').read()
# lo Studio sta fuori dal gioco: studio.js solo in editor.html (nel gioco l'editor non si apre, applica solo i ritocchi)
SOLO_STUDIO = {'studio.js'}
out = re.sub(r'/\*([a-z_.]+\.js)\*/', lambda m: '' if m.group(1) in SOLO_STUDIO else sub(m), h)
studio = re.sub(r'/\*([a-z_.]+\.js)\*/', sub, h)
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html', len(out))
st = studio.replace('<title>Porto Vecchio — Isola</title>', '<title>Porto Vecchio — Studio</title>', 1)
i = st.index('<script')
st = st[:i] + '<script>window.PV_STUDIO = true;</script>\n' + st[i:]
open('editor.html', 'w', encoding='utf-8').write(st)
print('editor.html', len(st))
