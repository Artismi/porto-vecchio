# Capi rifiniti in Blender: i pezzi del kit (busto, gambe, piedi) suddivisi e lisci, con le coordinate di texture in metri.
#   pip install bpy==5.2.2 ; python3 strumenti/capi_blender.py
# Per ogni personaggio del kit (assets/mc/<nome>.json) scrive assets/mc/capi_<nome>.json: per ogni pezzo e materiale
# posizioni (nello spazio del pezzo originale, come nel glTF), normali, uv (1 = un metro di stoffa), ossa e pesi
# (indici nell'ordine delle ossa della pelle originale). Nel gioco la geometria sostituisce quella del pezzo del kit,
# che tiene il suo scheletro: niente differenze di ossa tra il kit e i capi.
import bpy, bmesh, json, base64, os, sys, math, shutil
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, 'assets', 'mc')
FILES = sys.argv[1:] or ['Casual_2', 'Casual_Hoodie', 'Worker', 'Casual', 'Formal']
LIVELLI = {'Body': 1, 'Legs': 1, 'Feet': 1, 'Head': 1}   # quante suddivisioni (1 = quattro volte i poligoni)
TMP = '/tmp/capi_blender'; os.makedirs(TMP, exist_ok=True)
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()

def processa(nome):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = os.path.join(KIT, nome + '.json'); g = os.path.join(TMP, nome + '.gltf'); shutil.copy(src, g)
    d = json.load(open(src))
    bpy.ops.import_scene.gltf(filepath=g)
    # l'ordine delle ossa di ogni pelle del glTF originale (per mesh)
    nodes = d['nodes']; skin_of = {n['name']: n.get('skin') for n in nodes if 'mesh' in n}
    out = {'kit': nome, 'pezzi': {}}
    for o in list(bpy.data.objects):
        if o.type != 'MESH' or not any(k in o.name for k in LIVELLI): continue
        parte = next(k for k in LIVELLI if k in o.name)
        joints = [nodes[j]['name'] for j in d['skins'][skin_of[o.name]]['joints']]
        for x in bpy.context.selected_objects: x.select_set(False)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        # i triangoli del kit sono staccati (per lo shading a faccette): si saldano, poi si ricompongono i quadrilateri
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.remove_doubles(threshold=0.000005)   # mezzo millimetro (un'unità del pezzo = 100 m)
        bpy.ops.mesh.tris_convert_to_quads(face_threshold=math.radians(40), shape_threshold=math.radians(40))
        bpy.ops.object.mode_set(mode='OBJECT')
        # liscio: suddivisione Catmull-Clark (i pesi delle ossa si interpolano), ombreggiatura morbida
        for p in o.data.polygons: p.use_smooth = True
        sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = LIVELLI[parte]; sub.render_levels = LIVELLI[parte]; sub.quality = 3
        while o.modifiers.find('sub') > 0: bpy.ops.object.modifier_move_up(modifier='sub')
        bpy.ops.object.modifier_apply(modifier='sub')
        # le coordinate di texture: isole (smart project), poi in scala vera (1 = un metro)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT')
        me = o.data; me.calc_loop_triangles()
        uvl = me.uv_layers.active.data
        a3, auv = 0.0, 0.0
        K = 100.0   # il kit: un'unità del pezzo vale un centimetro (il nodo è scalato 100)
        for t in me.loop_triangles:
            P = [me.vertices[v].co for v in t.vertices]; U = [uvl[l].uv for l in t.loops]
            a3 += ((P[1] - P[0]).cross(P[2] - P[0])).length / 2 * K * K
            auv += abs((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[2][0] - U[0][0]) * (U[1][1] - U[0][1])) / 2
        sc = math.sqrt(a3 / auv) if auv > 0 else 1.0
        # i dati, per materiale (triangoli), vertici per angolo (le uv e le normali morbide sono per angolo)
        gi = {vg.index: vg.name for vg in o.vertex_groups}
        per = {}
        for t in me.loop_triangles: per.setdefault(t.material_index, []).append(t)
        prims = []
        for mi, tris in per.items():
            mat = o.material_slots[mi].material.name if mi < len(o.material_slots) and o.material_slots[mi].material else ''
            P, N, UV, J, W = [], [], [], [], []
            for t in tris:
                for k in range(3):
                    v = me.vertices[t.vertices[k]]; l = me.loops[t.loops[k]]
                    x, y, z = v.co; P += [x, z, -y]   # da Blender (z in alto) al glTF (y in alto)
                    nx, ny, nz = me.corner_normals[t.loops[k]].vector; N += [nx, nz, -ny]
                    u, w = uvl[t.loops[k]].uv; UV += [u * sc, w * sc]
                    gs = sorted(((g.weight, gi[g.group]) for g in v.groups if g.weight > 1e-4 and gi[g.group] in joints), reverse=True)[:4]
                    s = sum(w0 for w0, _ in gs) or 1.0
                    jj = [joints.index(n) for _, n in gs] + [0] * (4 - len(gs)); ww = [w0 / s for w0, _ in gs] + [0.0] * (4 - len(gs))
                    J += jj; W += ww
            # i vertici uguali (stessa posizione, normale e uv) diventano uno: indici
            A = np.hstack([np.array(P, np.float32).reshape(-1, 3), np.array(N, np.float32).reshape(-1, 3), np.array(UV, np.float32).reshape(-1, 2), np.array(J, np.float32).reshape(-1, 4), np.array(W, np.float32).reshape(-1, 4)])
            key = np.round(A[:, :8], 5); _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True); V = A[first]
            prims.append({'mat': mat, 'n': len(V), 'pos': b64(V[:, 0:3].astype(np.float32)), 'nor': b64((V[:, 3:6] * 127).round().astype(np.int8)), 'uv': b64(V[:, 6:8].astype(np.float32)),
                          'j': b64(V[:, 8:12].astype(np.uint8)), 'w': b64((V[:, 12:16] * 255).round().astype(np.uint8)), 'idx': b64(inv.reshape(-1).astype(np.uint16 if len(V) < 65536 else np.uint32)), 'i32': len(V) >= 65536})
        out['pezzi'][o.name] = prims
        print(nome, o.name, [(p['mat'], p['n'] // 3) for p in prims], 'scala uv', round(sc, 3))
    dst = os.path.join(KIT, 'capi_' + nome + '.json'); json.dump(out, open(dst, 'w')); print('->', dst, os.path.getsize(dst) // 1024, 'KB')

for f in FILES: processa(f)
