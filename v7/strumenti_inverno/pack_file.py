# Per aprire il gioco col doppio clic (file://): accanto a ogni assets/**/*.json scrive un gemello .json.js
# che il browser può caricare con <script>. Va rilanciato se cambiano i modelli. Non tocca i .json.
import os, json, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
n = 0
for d, _, fs in os.walk(os.path.join(root, 'assets')):
    for f in fs:
        if not f.endswith('.json'): continue
        p = os.path.join(d, f); k = os.path.relpath(p, root).replace(os.sep, '/')
        t = open(p, encoding='utf-8').read()
        open(p + '.js', 'w', encoding='utf-8').write('(window.PVA=window.PVA||{})[' + json.dumps(k) + ']=' + json.dumps(t) + ';\n'); n += 1
print('gemelli scritti:', n)
