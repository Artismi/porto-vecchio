# [camera9] le distribuzioni dai registri di misura9.js: python3 analizza9.py [oggi c9] → ../distribuzioni.json e la tabella in Markdown
import json, sys, os, statistics as stt
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D)
modi = sys.argv[1:] or ['oggi', 'c9']
def q(a, p):
    a = sorted(a)
    return a[min(len(a) - 1, max(0, int(round(p * (len(a) - 1)))))] if a else None
R = {}
for m in modi:
    f = os.path.join(OUT, f'misura_{m}.json')
    if not os.path.exists(f): continue
    M = json.load(open(f))
    for nome, d in M.items():
        L = [s for s in d['log'] if s.get('c7')]
        if not L: continue
        pit = [s['pitch'] for s in L]; vis = [s['vista'] for s in L]; arm = [s['arm'] for s in L]
        S = [s for s in L if 'sfondo' in s]
        # i salti: la pendenza della vista fra due fotogrammi (a 30 fps) e la quota della camera
        dv = [abs(L[i]['vista'] - L[i - 1]['vista']) for i in range(1, len(L))]
        dy = [abs(L[i]['camY'] + L[i]['gh'] - L[i - 1]['camY'] - L[i - 1]['gh']) for i in range(1, len(L))]
        R.setdefault(nome, {})[m] = {
            'n': len(L), 'arrivato': d.get('arrivato'),
            'braccioPend': [q(pit, .1), q(pit, .5), q(pit, .9), max(pit)],
            'vista': [q(vis, .1), q(vis, .5), q(vis, .9), max(vis)],
            'braccio': [q(arm, .1), q(arm, .5), q(arm, .9), min(arm)],
            'campo': [min(s['fov'] for s in L), max(s['fov'] for s in L)],
            'camY': stt.median(s['camY'] for s in L),
            'salita%': round(100 * sum(1 for s in L if (s.get('lift') or 0) > .5) / len(L)),
            'corto%': round(100 * sum(1 for s in L if (s.get('close') or 0) > .05) / len(L)),
            'vistaOltre40%': round(100 * sum(1 for v in vis if v > 40) / len(L)),
            'orizzonteNelQuadro%': round(100 * sum(1 for s in L if s['oriz'] > 0) / len(L)),
            'orizzonte': q([s['oriz'] for s in L], .5),
            'sfondo': q([s['sfondo'] for s in S], .5) if S else None, 'sfondoAlto': q([s['sfondoAlto'] for s in S], .5) if S else None,
            'cielo': q([s['cielo'] for s in S], .5) if S else None,
            'personaggioY': [q([s['sy'] for s in L], .1), q([s['sy'] for s in L], .5), q([s['sy'] for s in L], .9)],
            'personaggioH': q([s['sh'] for s in L], .5),
            'spalla%': round(100 * sum(1 for s in L if abs(s.get('side') or 0) > .2) / len(L)) if any('side' in s for s in L) else None,
            'saltoVistaMax': round(max(dv), 2) if dv else 0, 'saltoQuotaMax': round(max(dy), 3) if dy else 0,
        }
json.dump(R, open(os.path.join(OUT, 'distribuzioni.json'), 'w'), indent=1)
# tutto insieme: la distribuzione della pendenza della vista su tutti i percorsi
tot = {}
for m in modi:
    f = os.path.join(OUT, f'misura_{m}.json')
    if not os.path.exists(f): continue
    M = json.load(open(f)); com = [n for n in M if all(n in json.load(open(os.path.join(OUT, f'misura_{q}.json'))) for q in modi if os.path.exists(os.path.join(OUT, f'misura_{q}.json')))]   # solo i percorsi fatti con tutte le camere
    V = [s['vista'] for n in com for s in M[n]['log'] if s.get('c7')]; P = [s['pitch'] for n in com for s in M[n]['log'] if s.get('c7')]
    bins = [0, 10, 15, 20, 25, 30, 34.5, 40, 45, 50, 90]
    tot[m] = {'percorsi': com, 'n': len(V), 'vista': [q(V, .1), q(V, .5), q(V, .9)], 'braccioPend': [q(P, .1), q(P, .5), q(P, .9)],
              'istogrammaVista': {f'{bins[i]}-{bins[i+1]}': round(100 * sum(1 for v in V if bins[i] <= v < bins[i + 1]) / len(V), 1) for i in range(len(bins) - 1)}}
json.dump(tot, open(os.path.join(OUT, 'distribuzioni_tutto.json'), 'w'), indent=1)
print('| percorso | camera | vista p10/p50/p90/max | braccio (m) p10/p50/min | salita % | corto % | orizzonte nel quadro % | sfondo p50 (alto) | personaggio Y p50 | salto vista max °/fot |')
print('|---|---|---|---|---|---|---|---|---|---|')
for nome, mm in R.items():
    for m, r in mm.items():
        v = r['vista']; a = r['braccio']
        print(f"| {nome} | {m} | {v[0]:.0f} / {v[1]:.0f} / {v[2]:.0f} / {v[3]:.0f} | {a[0]:.1f} / {a[1]:.1f} / {a[3]:.1f} | {r['salita%']} | {r['corto%']} | {r['orizzonteNelQuadro%']} | {r['sfondo']} ({r['sfondoAlto']}) | {r['personaggioY'][1]} | {r['saltoVistaMax']} |")
print(json.dumps(tot, indent=1))
