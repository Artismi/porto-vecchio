#!/usr/bin/env python3
# [ritmo8] confronto fra corse: per tratto, i ms per giro (inclusivi) delle funzioni chiave, cercate per nome (le righe cambiano fra build)
import json, sys, re
runs = sys.argv[1:]
KEY = [('giro main', r'^loop0@'), ('R.frame', r'^frame@render:'), ('camera7 cast7', r'^cast7@render:'), ('three render', r'^rd\.render@peso_lontano'),
       ('ombre', r'^sm\.render@peso_ombre'), ('matrici umw', r'^umw@render'), ('graffiti frame', r'^frame@writing'), ('arte sul filo', r'^art@writer_arte'),
       ('tasselli rayTas', r'^rayTas@'), ('logica G.step', r'^step@game:'), ('GC', r'^\(garbage collector\)'), ('griglie a fette', r'^griglieTick@'), ('pile', r'^pila@')]
def val(T, rx):
    if 'prof' not in T: return None
    for k, v in T['prof']['incl']:
        if re.search(rx, k): return v
    return 0.0
D = {r: json.load(open(f'out/{r}/risultati.json')) for r in runs}
tratti = [t for t in D[runs[0]]['tratti'] if 'prof' in D[runs[0]]['tratti'][t]]
for t in tratti:
    print(f'\n== {t}')
    print('%-18s' % '' + ''.join('%14s' % r for r in runs))
    for nome, rx in KEY:
        print('%-18s' % nome + ''.join('%14s' % (('%.1f' % val(D[r]['tratti'][t], rx)) if t in D[r]['tratti'] and val(D[r]['tratti'][t], rx) is not None else '-') for r in runs))
    for lab, f in [('JS/giro media', lambda T: T['jsMs']['media']), ('JS p95', lambda T: T['jsMs']['p95']), ('JS p99', lambda T: T['jsMs']['p99']), ('interv. p99', lambda T: T['intervallo']['p99']),
                   ('alloc kB/giro', lambda T: T.get('alloc', {}).get('kbGiro')), ('long task', lambda T: len(T['longtask'])), ('disegni', lambda T: T['disegni']['media'])]:
        print('%-18s' % lab + ''.join('%14s' % (f(D[r]['tratti'][t]) if t in D[r]['tratti'] else '-') for r in runs))
    # quota di cast7 sul giro (robusta alla contesa)
    print('%-18s' % 'cast7/giro %' + ''.join('%14s' % (('%.1f' % (100 * val(D[r]['tratti'][t], r'^cast7@render:') / max(.001, val(D[r]['tratti'][t], r'^loop0@')))) if t in D[r]['tratti'] and val(D[r]['tratti'][t], r'^loop0@') else '-') for r in runs))
    print('%-18s' % 'cast7/three %' + ''.join('%14s' % (('%.0f' % (100 * val(D[r]['tratti'][t], r'^cast7@render:') / max(.001, val(D[r]['tratti'][t], r'^rd\.render@')))) if t in D[r]['tratti'] and val(D[r]['tratti'][t], r'^rd\.render@') else '-') for r in runs))
