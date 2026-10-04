# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file)
import re
h = open('src/index.src.html', encoding='utf-8', errors='ignore').read()
def sub(m):
    return open('src/' + m.group(1), encoding='utf-8', errors='ignore').read()
out = re.sub(r'/\*([a-z_.]+\.js)\*/', sub, h)
open('index.html', 'w', encoding='utf-8').write(out)
print('index.html', len(out))
