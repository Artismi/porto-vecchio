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

# le categorie della scheda video si rifanno da perK con le regole di adesso (scritte nel JSON dal banco, o queste)
import re
REGOLE = None
CAT = [(r"^ombra:", "mappe d'ombra"), (r"^peso_ombre:", "mappe d'ombra"), (r"^tela$", 'tela (schermo)'), (r"^post:|^bersaglio:", 'bersagli del post'),
  (r"^pavimenti:", 'pavimenti'), (r"^riva:", 'riva'), (r"^vegetazione:", 'vegetazione'), (r"^personaggi:|^models:|^guardaroba:|^peso_gente:|^animazioni:|^anim_", 'persone'),
  (r"^roba3d:|^arredo3d:|^oggetti3d:|^pezzi_citta:|^modella:|^officina:|^veicoli3d:", 'modelli (roba3d, arredo3d, pezzi)'), (r"^kit:|^scaricati:|^superfici:", 'modelli glTF/GLB (kit)'),
  (r"^regia:|^interiors:|^interni_arte:", 'interni (regia)'), (r"^scorci|^tetti_vissuti:|^tetti:", 'scorci, tetti'), (r"^segnaletica:|^ordine_arte:|^vievive_arte:|^scontri_arte:", 'segnaletica, arredo vie'),
  (r"^peso_vetro:|^peso_bagliori:|^peso_lontano:|^peso_pronti:|^peso_schermo:", 'peso_* (tavolozze, aloni)'), (r"^leggera_", 'leggera_*'),
  (r"^render:(atlas|FA|CA|fAt|atl|pal|stack|lay|pila|arrTex|palTex|vdAtlas|canvasTex<faAtlas)", 'atlanti, tavolozze e pile (render)'),
  (r"^render:(anonima<fusione1|make|lazyGeo1)", 'case fuse (render)'), (r"^render:(mergeGeos<flushStatic|anonima<addStatic|mergeGeos<posaPezzi1|fGeo|fB|anonima<fGeo|cyl|box|rod)", 'statiche fuse e cose di strada (render)'),
  (r"^render:mergeGeos<mergeGroup", 'case: pezzi fuori fusione (render)'), (r"^render:(buildChunkGen|canvasTex<buildChunkGen|anonima<tileSplit4|buildBase|anonima<buildNat|buildGround)", 'terreno a blocchi (render)'),
  (r"^render:buildWater", 'acqua (render)'), (r"^render:(frame|ambPass|occPass|wetEnv|buildPost)", 'bersagli del post'), (r"^render:canvasTex<(signTexture|insegnaTex)", 'insegne (render)'),
  (r"^render:", 'città, il resto (render.js)'), (r"^world", 'dati del mondo'), (r"^paesaggio:|^sottosuolo:|^livelli:", 'paesaggio, sottosuolo'),
  (r"^graffiti:|^writer|^writing:|^creativita:", 'graffiti'), (r"^menu_ui:|^main:|^audio:", 'menu, audio'), (r".", 'altro')]   # come CAT in banco_memoria.js
def ricategorizza(m):
    if not REGOLE or 'perK' not in m: return
    per = {}
    for k, v in m['perK'].items():
        chi = k.rsplit(' [', 1)[0]
        c = next((c for r, c in REGOLE if re.search(r, chi)), 'altro')
        per[c] = per.get(c, 0) + v['b']
    m['per'] = per

def main():
    global REGOLE
    a, b = carica(sys.argv[1]), carica(sys.argv[2]); t = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    REGOLE = [(r, c) for r, c in (b.get('cat') or a.get('cat') or [])]
    if not REGOLE: REGOLE = CAT   # i giri senza le regole nel JSON
    ma, mb_ = a['misure'][t], b['misure'][t]
    ricategorizza(ma); ricategorizza(mb_)
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
        if 'cpuF' in m:   # rifatte con le regole di adesso: «geo su|geo mai|tele|dati» + chi
            for k, v in m['cpuF'].items():
                tipo, chi = (k.split(' ', 2)[0] + ' ' + k.split(' ', 2)[1], k.split(' ', 2)[2]) if k.startswith('geo ') else (k.split(' ', 1)[0], k.split(' ', 1)[1])
                c = next((c for r, c in REGOLE if re.search(r, chi)), 'altro')
                kk = ('geometrie ' if tipo.startswith('geo') else tipo + ' ') + c
                g[kk] = g.get(kk, 0) + v
            return g
        for k, v in m['cpuPer'].items():
            kk = k.replace('geometrie caricate ', 'geometrie ').replace('geometrie mai caricate ', 'geometrie ')
            g[kk] = g.get(kk, 0) + v
        return g
    ga, gb = grp(ma), grp(mb_)
    for k in sorted(set(ga) | set(gb), key=lambda k: -ga.get(k, 0)):
        x, y = mb(ga.get(k, 0)), mb(gb.get(k, 0))
        if x > 2 or y > 2: print(f"| {k} | {x:.1f} | {y:.1f} |")

main()
