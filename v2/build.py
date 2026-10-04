# Ricompone index.html dai sorgenti in src/ (ogni /*nome.js*/ diventa il contenuto del file)
import re
h = open('src/index.src.html').read()
def sub(m):
    return open('src/' + m.group(1)).read()
out = re.sub(r'/\*([a-z_.]+\.js)\*/', sub, h)
open('index.html', 'w').write(out)
print('index.html', len(out))
