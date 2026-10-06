# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file)
# e editor.html, lo Studio: lo stesso gioco con window.PV_STUDIO acceso (mappa, interni, hangar dei modelli; vedi src/studio.js)
import re
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
def sub(m):
    return open('src/' + m.group(1), encoding='utf-8', errors='ignore').read()
out = re.sub(r'/\*([a-z_.]+\.js)\*/', sub, h)
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html', len(out))
st = out.replace('<title>Porto Vecchio — Isola</title>', '<title>Porto Vecchio — Studio</title>', 1)
i = st.index('<script')
st = st[:i] + '<script>window.PV_STUDIO = true;</script>\n' + st[i:]
open('editor.html', 'w', encoding='utf-8').write(st)
print('editor.html', len(st))
