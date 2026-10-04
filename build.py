# Uso: npm i three@0.149.0 && python3 build.py  -> porto-vecchio.html (file unico) e showroom.html (vetrina dei modelli)
import os
three = open('node_modules/three/build/three.min.js').read()
game, render = open('game.js').read(), open('render.js').read()
def make(src_name, out_name):
    src = open(src_name).read()
    out = src.replace('/*GAME*/', game).replace('/*RENDER*/', render).replace('/*THREE*/', three)
    open(out_name, 'w').write(out)
    print(out_name, len(out), 'byte')
make('index.src.html', 'porto-vecchio.html')
if os.path.exists('showroom.src.html'): make('showroom.src.html', 'showroom.html')
