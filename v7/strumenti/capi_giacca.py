# La giacca modellata in Blender dal busto della maglietta del kit (Casual_2), sullo stesso scheletro:
#   python3 strumenti/capi_giacca.py
# - maniche lunghe vere: la pelle dell'avambraccio diventa manica, gonfiata, con l'orlo al polso
# - la falda: l'orlo della maglietta scende fino a metà coscia, appena svasato
# - l'apertura a V: le facce dentro la V si staccano e rientrano (la camicia), con la cravatta in rilievo
# - i revers: la fascia attorno alla V raddoppiata, sollevata e chiusa sui lati (rilievo vero)
# - il collo dietro: l'orlo dello scollo sale e si apre
# Scrive in assets/mc/capi_Casual_2.json la voce capi.giacca (materiali Giacca, Camicia, Cravatta, Skin).
import bpy, bmesh, json, base64, os, math, shutil
import numpy as np
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, 'assets', 'mc'); NOME = 'Casual_2'; TMP = '/tmp/capi_blender'; os.makedirs(TMP, exist_ok=True)
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
sm = lambda t: (lambda x: x * x * (3 - 2 * x))(min(1, max(0, t)))

bpy.ops.wm.read_factory_settings(use_empty=True)
src = os.path.join(KIT, NOME + '.json'); g = os.path.join(TMP, NOME + '.gltf'); shutil.copy(src, g); d = json.load(open(src))
bpy.ops.import_scene.gltf(filepath=g)
o = bpy.data.objects['Casual2_Body']; me = o.data
W = o.matrix_world.copy(); Wi = W.inverted(); R3 = W.to_3x3(); R3i = R3.inverted()
for x in bpy.context.selected_objects: x.select_set(False)
bpy.context.view_layer.objects.active = o; o.select_set(True)
# saldare i triangoli staccati, ricomporre i quadrilateri
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.000005); bpy.ops.mesh.tris_convert_to_quads(face_threshold=math.radians(40), shape_threshold=math.radians(40))
bpy.ops.object.mode_set(mode='OBJECT')
# materiali: Giacca (il tessuto della maglietta), Skin, Camicia, Cravatta
names = [s.material.name for s in o.material_slots]; IG, IS = names.index('LightBrown'), names.index('Skin')
o.material_slots[IG].material.name = 'Giacca'
for n in ('Camicia', 'Cravatta', 'Revers'): me.materials.append(bpy.data.materials.new(n))
IC, IT, IR = len(me.materials) - 3, len(me.materials) - 2, len(me.materials) - 1

bm = bmesh.new(); bm.from_mesh(me)
for _ in range(2):   # più fitta davanti, dove passano i tagli (V, revers, cravatta): vengono dritti
    bm.faces.ensure_lookup_table()
    ed = set(e for f in bm.faces if f.material_index == IG and (W @ f.calc_center_median()).y < 0.0 and (W @ f.calc_center_median()).z > 1.1 and abs((W @ f.calc_center_median()).x) < 0.2 for e in f.edges)
    bmesh.ops.subdivide_edges(bm, edges=list(ed), cuts=1, use_grid_fill=True)
bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
wco = lambda v: W @ v.co
def setw(v, p): v.co = Wi @ p
def wnorm(v): n = (R3 @ v.normal); return n.normalized() if n.length > 0 else n
fc = lambda f: W @ f.calc_center_median()
# le misure (mondo: z in alto, il davanti è -y)
Z_NECK, Z_HEM = 1.512, 1.022; X_SLEEVE, X_CUFF = 0.27, 0.535; Y_FRONT = -0.03
Z_V0 = 1.13   # il primo bottone (in vita)
wV = lambda z: 0.075 * ((z - Z_V0) / (Z_NECK - Z_V0)) if z > Z_V0 else 0  # mezza larghezza della V (metri): dritta
wL = lambda z: 0.015 + 0.07 * sm((z - Z_V0) / 0.2)                        # larghezza del revers

# 1) le maniche lunghe: la pelle del braccio fino al polso diventa manica, gonfiata (più larga al gomito, un po' meno al polso)
bm.normal_update()
sleeve_v = set()
for f in bm.faces:
    if f.material_index != IS: continue
    xs = [abs(wco(v).x) for v in f.verts]
    if min(xs) > X_SLEEVE - 0.02 and max(xs) < X_CUFF: f.material_index = IG; sleeve_v.update(f.verts)
for v in sleeve_v:
    p = wco(v); ax = abs(p.x)
    if ax > X_CUFF - 0.004: continue   # l'anello del polso resta sulla mano
    k = 0.016 * (1 - 0.35 * sm((ax - 0.36) / 0.17)) * sm((ax - X_SLEEVE + 0.02) / 0.03)
    c = Vector((p.x, -0.07, 1.432)); r = p - c; r.x = 0; r = r.normalized() if r.length else r
    setw(v, p + r * k)

# 2) la falda e la forma: le spalle imbottite e squadrate, il busto dritto (niente vita), sotto i fianchi si allunga fino a metà coscia
bm.normal_update()
Z_HIP = 1.075; DROP = 0.17
for v in bm.verts:
    p = wco(v); ax = abs(p.x)
    if ax > X_SLEEVE + 0.03: continue
    if p.z < Z_HIP:   # sotto i fianchi: si allunga, appena svasata e staccata dalle cosce
        t = (Z_HIP - p.z) / (Z_HIP - Z_HEM); r = Vector((p.x, p.y + 0.06, 0)); r = r.normalized() if r.length else r
        setw(v, Vector((p.x, p.y, Z_HIP - t * (Z_HIP - Z_HEM + DROP))) + r * (0.01 + 0.04 * t))
    elif p.z > 1.38 and 0.09 < ax < X_SLEEVE + 0.03:   # la spalla: imbottita, squadrata
        k = sm((ax - 0.09) / 0.12) * (1 - sm((ax - X_SLEEVE) / 0.03))
        setw(v, p + Vector((math.copysign(0.012 * k, p.x), 0, 0.012 * k * sm((p.z - 1.38) / 0.06))))
    elif 1.06 < p.z <= 1.38 and v.material_index if False else False: pass
for v in bm.verts:   # il busto dritto: dove la maglietta stringe in vita, la giacca resta larga quanto il petto
    p = wco(v)
    if abs(p.x) < X_SLEEVE - 0.04 and 1.08 < p.z < 1.3:
        r = Vector((p.x, p.y + 0.06, 0)); L = r.length
        if L > 0: setw(v, p + r.normalized() * 0.008 * sm((1.3 - p.z) / 0.12))

# 3) l'apertura a V: le facce del davanti dentro la V si staccano e rientrano (la camicia)
bm.normal_update()
inV = [f for f in bm.faces if f.material_index == IG and fc(f).y < Y_FRONT and fc(f).z > Z_V0 - 0.01 and abs(fc(f).x) < wV(fc(f).z) + 0.004]
bmesh.ops.split_edges(bm, edges=[e for e in bm.edges if sum(1 for f in e.link_faces if f in inV) == 1])
shirt_v = set(v for f in inV for v in f.verts)
# il bordo della V esattamente sulla linea (niente dente di sega): i vertici sul taglio, da tutte e due le parti
cut = set(v for e in bm.edges if e.is_boundary for v in e.verts if wco(v).y < Y_FRONT and wco(v).z > Z_V0 - 0.03 and abs(abs(wco(v).x) - wV(wco(v).z)) < 0.03)
for v in cut:
    p = wco(v); tx = math.copysign(wV(p.z), p.x) if p.z > Z_V0 else 0.0; setw(v, Vector((p.x + (tx - p.x) * 0.7, p.y, p.z)))
print('V', len(inV))
for f in inV: f.material_index = IC
bm.normal_update()
for v in shirt_v - cut: setw(v, wco(v) - wnorm(v) * 0.006)

# 4) la cravatta: le facce della camicia al centro, raddoppiate e sollevate, chiuse sui lati
def rilievo(faces, h, mat):
    ret = bmesh.ops.duplicate(bm, geom=faces); nf = [x for x in ret['geom'] if isinstance(x, bmesh.types.BMFace)]
    for f in nf: f.material_index = mat
    bm.normal_update(); nvs = set(v for f in nf for v in f.verts)
    base = {v: wco(v) for v in nvs}; nrm = {v: wnorm(v) for v in nvs}
    for v in nvs: setw(v, base[v] + nrm[v] * h)
    edges = [e for e in bm.edges if e.is_boundary and all(v in nvs for v in e.verts)]
    r2 = bmesh.ops.extrude_edge_only(bm, edges=edges)
    for v in [x for x in r2['geom'] if isinstance(x, bmesh.types.BMVert)]: setw(v, wco(v) - (nrm.get(v) or wnorm(v)) * h * 0.95)
    for f in [x for x in r2['geom'] if isinstance(x, bmesh.types.BMFace)]: f.material_index = mat
    return nf
tie = [f for f in bm.faces if f.material_index == IC and abs(fc(f).x) < (0.022 if fc(f).z > 1.47 else 0.016 + 0.02 * sm((1.47 - fc(f).z) / 0.25))]
print('cravatta', len(tie))
if tie: rilievo(tie, 0.004, IT)

# 5) i revers: la fascia di giacca attorno alla V, raddoppiata e sollevata
bm.normal_update()
lap = [f for f in bm.faces if f.material_index == IG and fc(f).y < Y_FRONT and fc(f).z > Z_V0 - 0.005 and wV(fc(f).z) <= abs(fc(f).x) < wV(fc(f).z) + wL(fc(f).z) and fc(f).z < Z_NECK + 0.03]
print('revers', len(lap))
if lap:
    for f in lap: f.material_index = IR
    bm.normal_update(); lv = set(v for f in lap for v in f.verts); nn = {v: wnorm(v) for v in lv}
    for v in lv: setw(v, wco(v) + nn[v] * 0.009)   # sollevati, senza pareti (niente frange)
    nf = lap
    outer = set(v for f in bm.faces if f.material_index == IR for v in f.verts)
    for v in outer:   # l'orlo di fuori del revers dritto (e il dentro sulla V)
        p = wco(v); w0, w1 = wV(p.z), wV(p.z) + wL(p.z); ax = abs(p.x)
        if abs(ax - w1) < 0.012: setw(v, Vector((math.copysign(w1, p.x), p.y, p.z)))
        elif abs(ax - w0) < 0.012: setw(v, Vector((math.copysign(w0, p.x), p.y, p.z)))

# 6) il collo dietro: l'orlo dello scollo sale di 2 cm e si apre un poco
bm.normal_update()
neck = [e for e in bm.edges if e.is_boundary and all(f.material_index == IG for f in e.link_faces) and all(wco(v).z > Z_NECK - 0.04 and wco(v).y > Y_FRONT for v in e.verts)]
print('collo', len(neck))
if neck:
    ret = bmesh.ops.extrude_edge_only(bm, edges=neck)
    for v in [x for x in ret['geom'] if isinstance(x, bmesh.types.BMVert)]:
        p = wco(v); r = Vector((p.x, p.y + 0.043, 0)); r = r.normalized() if r.length else r
        setw(v, p + Vector((0, 0, 0.02)) + r * 0.006)

bm.to_mesh(me); bm.free(); me.update()
# la falda segue anche le cosce (sennò la gamba che avanza la buca)
vgs = {g.name: g for g in o.vertex_groups}
for v in me.vertices:
    p = W @ v.co
    if p.z < Z_HIP and abs(p.x) < X_SLEEVE:
        t = sm((Z_HIP - p.z) / (Z_HIP - Z_HEM + DROP)) * 0.7; leg = vgs.get('UpperLeg.L' if p.x > 0 else 'UpperLeg.R')
        if not leg: continue
        for gg in v.groups: gg.weight *= (1 - t)
        leg.add([v.index], t, 'ADD')
# liscio e uv in metri (come capi_blender.py)
for p in me.polygons: p.use_smooth = True
sub = o.modifiers.new('sub', 'SUBSURF'); sub.levels = 1; sub.quality = 3
while o.modifiers.find('sub') > 0: bpy.ops.object.modifier_move_up(modifier='sub')
bpy.ops.object.modifier_apply(modifier='sub')
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.004, area_weight=0.0, scale_to_bounds=False)
bpy.ops.object.mode_set(mode='OBJECT')
me = o.data; me.calc_loop_triangles(); uvl = me.uv_layers.active.data
a3 = auv = 0.0
for t in me.loop_triangles:
    P = [me.vertices[v].co for v in t.vertices]; U = [uvl[l].uv for l in t.loops]
    a3 += ((P[1] - P[0]).cross(P[2] - P[0])).length / 2 * 1e4
    auv += abs((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[2][0] - U[0][0]) * (U[1][1] - U[0][1])) / 2
sc = math.sqrt(a3 / auv)
nodes = d['nodes']; skin = next(n.get('skin') for n in nodes if n.get('name') == 'Casual2_Body'); joints = [nodes[j]['name'] for j in d['skins'][skin]['joints']]
gi = {vg.index: vg.name for vg in o.vertex_groups}; per = {}
for t in me.loop_triangles: per.setdefault(t.material_index, []).append(t)
prims = []
for mi, tris in per.items():
    mat = me.materials[mi].name
    P, N, UV, J, Wt = [], [], [], [], []
    for t in tris:
        for k in range(3):
            v = me.vertices[t.vertices[k]]; x, y, z = v.co; P += [x, z, -y]
            nx, ny, nz = me.corner_normals[t.loops[k]].vector; N += [nx, nz, -ny]
            u, w = uvl[t.loops[k]].uv; UV += [u * sc, w * sc]
            gs = sorted(((gg.weight, gi[gg.group]) for gg in v.groups if gg.weight > 1e-4 and gi[gg.group] in joints), reverse=True)[:4]
            s = sum(w0 for w0, _ in gs) or 1.0
            J += [joints.index(n) for _, n in gs] + [0] * (4 - len(gs)); Wt += [w0 / s for w0, _ in gs] + [0.0] * (4 - len(gs))
    A = np.hstack([np.array(P, np.float32).reshape(-1, 3), np.array(N, np.float32).reshape(-1, 3), np.array(UV, np.float32).reshape(-1, 2), np.array(J, np.float32).reshape(-1, 4), np.array(Wt, np.float32).reshape(-1, 4)])
    _, first, inv = np.unique(np.round(A[:, :8], 5), axis=0, return_index=True, return_inverse=True); V = A[first]
    prims.append({'mat': mat, 'n': len(V), 'pos': b64(V[:, 0:3].astype(np.float32)), 'nor': b64((V[:, 3:6] * 127).round().astype(np.int8)), 'uv': b64(V[:, 6:8].astype(np.float32)),
                  'j': b64(V[:, 8:12].astype(np.uint8)), 'w': b64((V[:, 12:16] * 255).round().astype(np.uint8)), 'idx': b64(inv.reshape(-1).astype(np.uint16 if len(V) < 65536 else np.uint32)), 'i32': len(V) >= 65536})
    print('giacca', mat, len(inv) // 3, 'triangoli')
dst = os.path.join(KIT, 'capi_' + NOME + '.json'); C = json.load(open(dst)); C.setdefault('capi', {})['giacca'] = {'mesh': 'Casual2_Body', 'prims': prims}
json.dump(C, open(dst, 'w')); print('->', dst, os.path.getsize(dst) // 1024, 'KB')
