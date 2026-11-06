# [camera9] riempie le tabelle di v7/ANALISI_CAMERA9.md dai json delle sonde (i segnaposto %%...%% o i blocchi già riempiti fra
# <!-- nome --> e <!-- /nome -->): python3 riempi9.py
import json, os, re
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(D); DOC = os.path.join(OUT, '..', '..', 'ANALISI_CAMERA9.md')
J = lambda f: json.load(open(os.path.join(OUT, f))) if os.path.exists(os.path.join(OUT, f)) else None
dist = J('distribuzioni.json') or {}; tutto = J('distribuzioni_tutto.json') or {}
NOMI = {'vicolo_pescatori': 'Caruggio dei Pescatori (1,7 m)', 'vico_lungo': 'Vico Lungo (scalini al mare)', 'sbocco_lanternini': 'Vicolo dei Lanternini → piazza', 'piazza': 'piazza San Rocco',
        'lungomare': 'lungomare', 'scala_mercato_giu': 'Scala del Mercato, giù', 'scala_mercato_su': 'Scala del Mercato, su', 'vicolo_gatti': 'Salita dei Gatti', 'scala_forno': 'Scala del Forno'}
def riga(nome, m, r):
    v, a = r['vista'], r['braccio']
    return f"| {NOMI.get(nome, nome)} | {'oggi' if m == 'oggi' else 'camera9'} | {v[1]:.0f}° / {v[2]:.0f}° / {v[3]:.0f}° | {a[1]:.1f} / {a[0]:.1f} / {a[3]:.1f} | {r['salita%']}% | {r['corto%']}% | {r['vistaOltre40%']}% | {r['orizzonteNelQuadro%']}% | {r['sfondo'] * 100:.0f}% ({r['sfondoAlto'] * 100:.0f}%) | {r['personaggioY'][1]:.2f} | {r['saltoVistaMax']:.1f}° |"
H = "| percorso | camera | vista p50 / p90 / max | braccio m p50 / p10 / min | salita | corto | vista > 40° | orizzonte nel quadro | sfondo (terzo alto) | piedi sullo schermo (dall'alto) | salto della vista max (per fotogramma da 0,1 s) |\n|---|---|---|---|---|---|---|---|---|---|---|"
oggi = H + '\n' + '\n'.join(riga(n, 'oggi', mm['oggi']) for n, mm in dist.items() if 'oggi' in mm)
tab = H + '\n' + '\n'.join(riga(n, m, mm[m]) for n, mm in dist.items() for m in ('oggi', 'c9') if m in mm)
ist = ''
if tutto:
    k = list(next(iter(tutto.values()))['istogrammaVista'].keys())
    ist = '**La pendenza della vista su tutti i fotogrammi dei percorsi misurati** (% dei fotogrammi per fascia di gradi):\n\n| | ' + ' | '.join(k) + ' | fotogrammi |\n|---|' + '---|' * (len(k) + 1) + '\n'
    for m, r in tutto.items(): ist += f"| {'oggi' if m == 'oggi' else 'camera9'} | " + ' | '.join(f"{r['istogrammaVista'][q]:.0f}" for q in k) + f" | {r['n']} |\n"
tav = J('tavola9.json') or []
T = "| posto | oggi: vista, braccio | camera9: vista, braccio, spalla | orizzonte (camera9, dall'alto) | sfondo nel terzo alto oggi → camera9 | busto coperto oggi / camera9 |\n|---|---|---|---|---|---|\n"
for r in tav:
    o, c = r['oggi'], r['c9']
    T += f"| {r['nome']} ({r['at'][0]:.0f}, {r['at'][1]:.0f}) | {o['vista']}°, {o['arm']} m | {c['vista']}°, {c['arm']} m, {c['side'] or 0} m | {c['oriz'] * 100:.0f}% | {o['sfondoAlto'] * 100:.0f}% → {c['sfondoAlto'] * 100:.0f}% | {'sì' if o['coperto'] else 'no'} / {'sì' if c['coperto'] else 'no'} |\n"
C = "**Nei dodici posti della tavola** (profilo leggero, 640×360; un fotogramma intero, mediana di 6):\n\n| posto | disegni oggi → camera9 | triangoli oggi → camera9 | ms (SwiftShader) oggi → camera9 |\n|---|---|---|---|\n"
for r in tav:
    po, pc = r['oggi']['perf'], r['c9']['perf']
    C += f"| {r['nome']} | {po['disegni']} → {pc['disegni']} (×{pc['disegni'] / po['disegni']:.1f}) | {po['triangoli'] / 1e6:.2f} M → {pc['triangoli'] / 1e6:.2f} M (×{pc['triangoli'] / po['triangoli']:.1f}) | {po['ms']:.0f} → {pc['ms']:.0f} |\n"
dis = J('disegni9_nebbia.json')
if dis:
    C += "\n**Il profilo del computer** (`?tassellivecchi`, piano lontano 300 m; i disegni della vista principale per distanza dalla camera, il bordo della sfera dell'oggetto):\n\n| posto | camera | disegni (vista) | tutti i passaggi | triangoli | piano lontano | 0-30 m | 30-80 m | 80-150 m | oltre 150 m |\n|---|---|---|---|---|---|---|---|---|---|\n"
    for k, r in dis.items():
        B = r.get('perDistanza', {}); cam = k.split('_', 1)[1].replace('c9', 'camera9').replace('_senzaTetto', ', piano lontano 300 m').replace('_nebbia', ', nebbia ×')
        C += f"| {k.split('_')[0]} | {cam} | {r['principali']} | {r['tutti']} | {r['triangoli'] / 1e6:.2f} M | {r['far']} m | {B.get('0-30', 0)} | {B.get('30-80', 0)} | {B.get('80-150', 0)} | {B.get('150+', 0)} |\n"
cpu = J('cpu9.json')
if cpu:
    C += "\n**Il processore** (20 fotogrammi a passi, i disegni spenti: G.step + R.frame; ms per fotogramma mediana / massimo, e il totale dei raggi del braccio `cast7` sui 20):\n\n| posto | camera | ms mediana / max | raggi del braccio (ms su 20 fotogrammi) |\n|---|---|---|---|\n"
    for k, r in cpu.items(): C += f"| {k.split('_')[0]} | {'camera9' if k.endswith('c9') else 'oggi'} | {r['ms']['med']} / {r['ms']['max']} | {r['totale'].get('cast7', 0)} |\n"
st = J('posti_stretti.json') or []
S = "| # | vicolo | punto (x, y) → verso | braccio | vista | sfondo nel terzo alto | busto coperto | voto |\n|---|---|---|---|---|---|---|---|\n"
for i, s in enumerate(st): S += f"| {i + 1} | {s['id']} {s.get('nome') or ''} (largo {s['w']} m) | ({s['at'][0]:.1f}, {s['at'][1]:.1f}) → ({s['verso'][0]:.1f}, {s['verso'][1]:.1f}) | {s['arm']} m | {s['vista']}° | {s['sfondoAlto'] * 100:.0f}% | {'sì' if s['coperto'] else 'no'} | {s['voto']} |\n"
doc = open(DOC).read()
for nome, testo in [('TABELLA_OGGI', oggi), ('TABELLA_TUTTO', tab), ('ISTOGRAMMA', ist), ('TAVOLA', T), ('COSTO', C), ('STRETTI', S)]:
    blocco = f'<!-- {nome} -->\n{testo.strip()}\n<!-- /{nome} -->'
    if f'%%{nome}%%' in doc: doc = doc.replace(f'%%{nome}%%', blocco)
    else: doc = re.sub(f'<!-- {nome} -->.*?<!-- /{nome} -->', lambda m: blocco, doc, flags=re.S)
open(DOC, 'w').write(doc); print('ok')
