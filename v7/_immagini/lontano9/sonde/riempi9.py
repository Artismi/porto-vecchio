# [lontano9] le tabelle di ANALISI_LONTANO9.md dai banchi (sonda_lontano9.js): python3 riempi9.py → stampa il markdown
import json, os, sys
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def carica(f):
    p = os.path.join(D, f)
    return json.load(open(p)) if os.path.exists(p) else None
def x(a, b): return f"×{a / b:.1f}" if b else ''
def tabella(J, titolo, tetto):
    if not J: return ''
    righe = [f"**{titolo}** (`?{J['query']}`). «Vista»: i disegni del passaggio principale (quello che lontano9 tocca); «tutti»: tutti i passaggi, ombre comprese, media di due fotogrammi; ms: il processore, mediana di 16 fotogrammi.\n",
             '| posto | vista oggi | vista camera9 prima | vista camera9 dopo | dopo / oggi | tutti oggi / prima / dopo | triangoli M oggi / prima / dopo | ms oggi / prima / dopo | nascoste / piccole |',
             '|---|---|---|---|---|---|---|---|---|']
    S = {'o': 0, 'p': 0, 'd': 0, 'to': 0, 'tp': 0, 'td': 0, 'n': 0, 'ok': 0, 'tetto': 0, 'tettoO': 0, 'mo': 0, 'mp': 0, 'md': 0}
    for i in range(12):
        r = J.get(f'p{i}')
        if not r or 'oggi' not in r or 'c9' not in r or 'c9l' not in r: continue
        o, p, d = r['oggi'], r['c9'], r['c9l']
        q = d['vista'] / max(1, o['vista']); S['o'] += o['vista']; S['p'] += p['vista']; S['d'] += d['vista']; S['to'] += o['disegni']; S['tp'] += p['disegni']; S['td'] += d['disegni']
        S['n'] += 1; S['ok'] += q <= 1.3; S['tetto'] += d['disegni'] <= tetto; S['tettoO'] += o['disegni'] <= tetto; S['mo'] += o['msMed']; S['mp'] += p['msMed']; S['md'] += d['msMed']
        l9 = d.get('l9') or {}
        righe.append(f"| {r['nome']} | {o['vista']} | {p['vista']} ({x(p['vista'], o['vista'])}) | **{d['vista']}** | {'**' if q <= 1.3 else ''}{q:.2f}{'**' if q <= 1.3 else ''} | {o['disegni']} / {p['disegni']} / {d['disegni']} | {o['triangoli'] / 1e6:.2f} / {p['triangoli'] / 1e6:.2f} / {d['triangoli'] / 1e6:.2f} | {o['msMed']:.0f} / {p['msMed']:.0f} / {d['msMed']:.0f} | {l9.get('occluse', '')} / {l9.get('piccole', '')} |")
    if S['n']: righe.append(f"| **tutti i {S['n']} posti** | {S['o']} | {S['p']} ({x(S['p'], S['o'])}) | **{S['d']}** | **{S['d'] / S['o']:.2f}** | {S['to']} / {S['tp']} / {S['td']} | | {S['mo'] / S['n']:.0f} / {S['mp'] / S['n']:.0f} / {S['md'] / S['n']:.0f} (media) | |")
    righe.append(f"\nEntro 1,3× la vista di oggi: **{S['ok']}/{S['n']}** posti. Sotto il tetto di {tetto} disegni (tutti i passaggi): camera9 dopo {S['tetto']}/{S['n']}, oggi {S['tettoO']}/{S['n']}.")
    return '\n'.join(righe) + '\n'
def memoria(J):
    if not J: return ''
    righe = ['| modo | posa | scheda video (MB, il processo di SwiftShader) | pagina (MB) | geometrie sulla scheda | tessiture | programmi |', '|---|---|---|---|---|---|---|']
    for k, v in J.items():
        for s in v['passi']:
            if s['nome'] in ('partenza', 'sbocco', 'sbocco → ovest', 'piazza → sud'): righe.append(f"| {k} | {s['nome']} | {s['gpuMB']} | {s['paginaMB']} | {s['geometrie']} | {s['tessiture']} | {s['programmi']} |")
    return '\n'.join(righe) + '\n'
def tavola():
    p = os.path.join(D, 'tavola9.json')
    if not os.path.exists(p): return ''
    T = json.load(open(p)); r = ['| posto | disegni senza → con lontano9 | differenza media (0-255) | pixel che cambiano più di 24 |', '|---|---|---|---|']
    for q in T['posti']: r.append(f"| {q['nome']} | {q['disegni'][0]} → {q['disegni'][1]} | {q['diff']['media']} | {q['diff']['px>24']}% |")
    if T.get('striscia'): r.append(f"| striscia del lungomare (8 passi) | | {max(s['diff']['media'] for s in T['striscia'])} (il passo peggiore) | {max(s['diff']['px>24'] for s in T['striscia'])}% |")
    return '\n'.join(r) + '\n'
out = []
out.append(tabella(carica('banco_computer.json'), 'Il computer (i tasselli)', 800))
out.append(tabella(carica('banco_leggera.json'), 'Il profilo leggero (?leggera: il telefono, l\'Iris Xe; i tasselli)', 400))
out.append(tabella(carica('banco_leggera_browser.json'), 'Il profilo leggero, la città costruita nel browser (?tasselli=0: come le misure di ANALISI_CAMERA9.md)', 400))
out.append(memoria(carica('memoria9.json')))
tab = '\n'.join(q for q in out[:3] if q)
md = os.path.join(D, '..', '..', 'ANALISI_LONTANO9.md'); M = open(md).read()
def metti(M, k, v):
    a, b = f'<!-- {k} -->', f'<!-- /{k} -->'; i, j = M.index(a) + len(a), M.index(b); return M[:i] + '\n' + v + M[j:]
M = metti(M, 'TABELLE', tab); M = metti(M, 'MEMORIA', out[3] or ''); M = metti(M, 'TAVOLA', tavola())
open(md, 'w').write(M); print(tab); print(out[3]); print(tavola())
