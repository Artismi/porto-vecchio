# [leggera] Le tabelle della memoria da due giri di strumenti/banco_memoria.js (--out=file.json): prima e dopo, per proprietario.
#   python3 strumenti/fogli_memoria.py prima.json dopo.json [tappa]      (tappa: 0 = dopo il caricamento, -1 = l'ultima del giro)
import json, sys

def carica(p):
    return json.load(open(p))

def mb(b):
    return b / 1048576

def riga(m):
    tele = m['cpu']['tele'] if 'cpu' in m else 0
    return {'heap JS (con gli array buffer)': m['heap'], 'di cui oggetti JS': m['heap'] - m['ab'], 'array buffer': m['ab'],
            'scheda video': mb(m['gpu']), 'tele 2D': mb(tele), 'totale heap + scheda': m['heap'] + mb(m['gpu']), 'totale con le tele': m['heap'] + mb(m['gpu']) + mb(tele)}

def main():
    a, b = carica(sys.argv[1]), carica(sys.argv[2]); t = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    ma, mb_ = a['misure'][t], b['misure'][t]
    print(f"| {ma['nome']} | prima | dopo | |\n|---|---:|---:|---:|")
    ra, rb = riga(ma), riga(mb_)
    for k in ra:
        print(f"| {k} | {ra[k]:.0f} | {rb[k]:.0f} | {(rb[k] - ra[k]) / max(ra[k], 1) * 100:+.0f}% |")
    print()
    print("| scheda video per proprietario (MB) | prima | dopo |\n|---|---:|---:|")
    ks = sorted(set(ma['per']) | set(mb_['per']), key=lambda k: -ma['per'].get(k, 0))
    for k in ks:
        x, y = mb(ma['per'].get(k, 0)), mb(mb_['per'].get(k, 0))
        if x > .5 or y > .5: print(f"| {k} | {x:.1f} | {y:.1f} |")
    print()
    print("| copie nel processore per proprietario (MB) | prima | dopo |\n|---|---:|---:|")
    def grp(m):
        g = {}
        for k, v in m['cpuPer'].items():
            kk = k.replace('geometrie caricate ', 'geometrie ').replace('geometrie mai caricate ', 'geometrie ')
            g[kk] = g.get(kk, 0) + v
        return g
    ga, gb = grp(ma), grp(mb_)
    for k in sorted(set(ga) | set(gb), key=lambda k: -ga.get(k, 0)):
        x, y = mb(ga.get(k, 0)), mb(gb.get(k, 0))
        if x > 2 or y > 2: print(f"| {k} | {x:.1f} | {y:.1f} |")

main()
