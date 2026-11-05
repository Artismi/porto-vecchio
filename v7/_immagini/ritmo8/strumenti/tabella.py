#!/usr/bin/env python3
# [ritmo8] la tabella del percorso (prima, con gli interruttori di ieri spenti, dopo) per ANALISI_RITMO8.md e _immagini/ritmo8/TABELLE.md
import json, re, sys
runs = sys.argv[1:] or ['base_b', 'kill_b', 'dopo_c']
NOMI = {'base_b': 'main', 'kill_b': 'main, ieri spento', 'dopo_b': 'ritmo8 (1ª)', 'dopo_c': 'ritmo8'}
D = {r: json.load(open(f'out/{r}/risultati.json')) for r in runs}
def incl(T, rx):
    for k, v in T.get('prof', {}).get('incl', []):
        if re.search(rx, k): return v
    return 0.0
def num(v, d=1): return ('%.' + str(d) + 'f') % v if isinstance(v, (int, float)) else str(v)
righe = []
TR = [('0_fermo', 'fermi alla nascita'), ('1_vicolo', 'vicolo'), ('2_piazza', 'piazza'), ('3_lungomare', 'lungomare'), ('4_auto', 'in auto'), ('6_dopo', 'fermi in piazza')]
righe.append('| Tratto | Corsa | JS per giro media / p95 / p99 (ms) | braccio camera7 % del giro | graffiti sul filo (ms/giro) | allocazioni (kB/giro) | GC (ms/giro) | disegni |')
righe.append('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |')
for t, nome in TR:
    for r in runs:
        T = D[r]['tratti'].get(t)
        if not T or 'prof' not in T: continue
        loop = incl(T, r'^loop0@'); c7 = incl(T, r'^cast7@render:'); arte = incl(T, r'^art@writer_arte')
        righe.append(f"| {nome} | {NOMI.get(r, r)} | {num(T['jsMs']['media'], 0)} / {num(T['jsMs']['p95'], 0)} / {num(T['jsMs']['p99'], 0)} | {num(100 * c7 / loop if loop else 0, 0)}% | {num(arte)} | {num(T.get('alloc', {}).get('kbGiro', 0), 0)} | {num(T['prof'].get('gcMsGiro', 0))} | {T['disegni']['media']} |")
print('\n'.join(righe))
# i colpevoli dei long task (le prime 4 pile di chiamate di ogni long task, ms sommati)
print()
print('| Long task: chi c\'era dentro (ms sommati sul percorso) | ' + ' | '.join(NOMI.get(r, r) for r in runs) + ' |')
print('| --- |' + ' ---: |' * len(runs))
KEYS = [('graffiti disegnati sul filo (writer_arte)', r'writer_arte|pennelli'), ('braccio di camera7 (cast7)', r'cast7'), ('griglia dei raggi al primo raggio', r'grigliaFinita|griglia@'), ('pila dei tasselli (texSubImage3D)', r'texSubImage3D|pila@'),
        ('compilazioni (getProgramParameter)', r'getProgramParameter'), ('foto della tavoletta (readPixels)', r'readPixels')]
agg = {r: {} for r in runs}
for r in runs:
    for T in D[r]['tratti'].values():
        for lt in T.get('longtask', []):
            if not isinstance(lt, dict): continue
            for chi, ms in lt.get('chi', []):
                for nome, rx in KEYS:
                    if re.search(rx, chi): agg[r][nome] = agg[r].get(nome, 0) + ms
for nome, rx in KEYS: print(f'| {nome} | ' + ' | '.join(str(round(agg[r].get(nome, 0))) for r in runs) + ' |')
print()
for r in runs:
    T = D[r]['tratti']; last = [v for v in T.values() if v.get('r8')]
    if last: print(f"{NOMI.get(r, r)}: ritmo8 alla fine {json.dumps(last[-1]['r8'])}")
    g = {}
    for v in T.values():
        for x in v.get('gl', []): g[x['k']] = max(g.get(x['k'], 0), x['max'])
    print(f"{NOMI.get(r, r)}: la chiamata più lunga per tipo (ms) " + json.dumps({k: g[k] for k in ['texSubImage3D', 'texSubImage2D', 'getProgramParameter', 'readPixels'] if k in g}))
