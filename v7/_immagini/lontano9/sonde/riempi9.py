# [lontano9] le tabelle di ANALISI_LONTANO9.md dai banchi (sonda_lontano9.js): python3 riempi9.py → stampa il markdown
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def carica(f):
    p = os.path.join(D, f)
    return json.load(open(p)) if os.path.exists(p) else None
def x(a, b): return f"×{a / b:.1f}" if b else ''
def tabella(J, titolo, tetto):
    if not J: return ''
    righe = [f"**{titolo}** (`?{J['query']}`; un fotogramma intero, tutti i passaggi; ms: il processore, G.step + R.frame coi disegni di WebGL spenti, mediana di 16)\n",
             '| posto | disegni oggi | camera9 prima | camera9 dopo | dopo / oggi | triangoli M oggi / prima / dopo | ms oggi / prima / dopo | nascoste dalle case / piccole lontane |',
             '|---|---|---|---|---|---|---|---|']
    S = {'o': 0, 'p': 0, 'd': 0, 'n': 0, 'ok': 0, 'tetto': 0}
    for i in range(12):
        r = J.get(f'p{i}')
        if not r or 'oggi' not in r or 'c9' not in r or 'c9l' not in r: continue
        o, p, d = r['oggi'], r['c9'], r['c9l']
        q = d['disegni'] / max(1, o['disegni']); S['o'] += o['disegni']; S['p'] += p['disegni']; S['d'] += d['disegni']; S['n'] += 1; S['ok'] += q <= 1.3; S['tetto'] += d['disegni'] <= tetto
        l9 = d.get('l9') or {}
        righe.append(f"| {r['nome']} | {o['disegni']} | {p['disegni']} ({x(p['disegni'], o['disegni'])}) | **{d['disegni']}** | {'**' if q <= 1.3 else ''}{q:.2f}{'**' if q <= 1.3 else ''} | {o['triangoli'] / 1e6:.2f} / {p['triangoli'] / 1e6:.2f} / {d['triangoli'] / 1e6:.2f} | {o['msMed']:.0f} / {p['msMed']:.0f} / {d['msMed']:.0f} | {l9.get('occluse', '')} / {l9.get('piccole', '')} |")
    if S['n']: righe.append(f"| **tutti ({S['n']})** | {S['o']} | {S['p']} ({x(S['p'], S['o'])}) | **{S['d']}** | {S['d'] / S['o']:.2f} | | | entro 1,3×: {S['ok']}/{S['n']}; sotto {tetto}: {S['tetto']}/{S['n']} |")
    return '\n'.join(righe) + '\n'
def memoria(J):
    if not J: return ''
    righe = ['| modo | posa | disegni | scheda video (MB) | pagina (MB) | heap JS (MB) | geometrie | tessiture | programmi |', '|---|---|---|---|---|---|---|---|---|']
    for k, v in J.items():
        for s in v['passi']:
            if s['nome'] in ('partenza', 'sbocco', 'sbocco → ovest', 'piazza → sud'): righe.append(f"| {k} | {s['nome']} | {s['disegni']} | {s['gpuMB']} | {s['paginaMB']} | {s['heapMB']} | {s['geometrie']} | {s['tessiture']} | {s['programmi']} |")
    return '\n'.join(righe) + '\n'
out = []
out.append(tabella(carica('banco_computer.json'), 'Il computer (i tasselli)', 800))
out.append(tabella(carica('banco_leggera.json'), 'Il profilo leggero (?leggera: il telefono, l\'Iris Xe; i tasselli)', 400))
out.append(tabella(carica('banco_leggera_browser.json'), 'Il profilo leggero, la città costruita nel browser (?tasselli=0: come le misure di ANALISI_CAMERA9.md)', 400))
out.append(memoria(carica('memoria9.json')))
print('\n'.join(q for q in out if q))
