# [telefono] riga di index.html -> file:riga dei sorgenti (ricostruisce la build come build.py). python3 strumenti/mappa_righe.py 25406 62770 (dalla cartella v7)
import re, sys
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
SOLO_STUDIO = {'studio.js'}; IN_PAUSA = {'skate.js'}
segs = []  # (start_line_in_out, nlines, name)
out_lines = 0
pos = 0
for m in re.finditer(r'/\*([a-z0-9_.]+\.js)\*/', h):
    pre = h[pos:m.start()]; out_lines += pre.count('\n')
    name = m.group(1)
    if name in SOLO_STUDIO or name in IN_PAUSA: body = ''
    else: body = open('src/' + name, encoding='utf-8', errors='ignore').read()
    n = body.count('\n')
    segs.append((out_lines + 1, n, name))
    out_lines += n; pos = m.end()
def where(line):
    for s, n, name in segs:
        if s <= line <= s + n: return f'{name}:{line - s + 1}'
    return 'index.src.html'
for a in sys.argv[1:]: print(a, '->', where(int(a)))
