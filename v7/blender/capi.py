"""Porto Vecchio — Blender: i capi modellati sul corpo del kit, nella posa di riposo (a T), legati allo stesso scheletro.
Metodo (come un modellatore): si parte dal corpo, si rifà la superficie pulita (rimesh a voxel), si taglia dove il capo finisce,
si dà il volume (agio) e si liscia via la muscolatura, si dà lo spessore vero agli orli, si aggiungono i pezzi (collo, polsini, fascia),
i pesi si copiano dal corpo. Le coordinate di stoffa (uv) sono in metri attorno al corpo: righe e bande restano dritte."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
from comune import *

def osso(arm, nome, coda=False):
    b = arm.data.bones[nome]; return arm.matrix_world @ (b.tail_local if coda else b.head_local)

def copia_parte(o, nome):
    me = o.data.copy(); n = bpy.data.objects.new(nome, me); n.matrix_world = o.matrix_world.copy(); bpy.context.scene.collection.objects.link(n)
    return n

def applica(o, mod):
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.view_layer.objects: x.select_set(False)
    o.select_set(True); bpy.ops.object.modifier_apply(modifier=mod.name)

def dominante(o):
    names = {g.index: g.name for g in o.vertex_groups}; out = []
    for v in o.data.vertices:
        out.append(names[max(v.groups, key=lambda g: g.weight).group] if v.groups else '')
    return out

def tronco_maniche(arm, B, ease=.012, smooth=6, voxel=.006, togli=r'^(Wrist|Index|Middle|Ring|Pinky|Thumb)', liscia_mani=True):
    """Il busto con le maniche, chiuso e liscio, nella posa di riposo, in coordinate di mondo (l'oggetto ha matrice identità)."""
    import re
    G = copia_parte(B, 'capo'); G.data.materials.clear()
    # in mondo
    G.data.transform(G.matrix_world); G.matrix_world = Matrix()
    dom = dominante(G); bm = bmesh.new(); bm.from_mesh(G.data); bm.verts.ensure_lookup_table()
    via = [bm.verts[i] for i, d in enumerate(dom) if re.match(togli, d)]
    bmesh.ops.delete(bm, geom=via, context='VERTS'); bm.to_mesh(G.data); bm.free()
    G.vertex_groups.clear()
    m = G.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.use_smooth_shade = True; applica(G, m)
    # l'agio: fuori lungo la normale, poi via i muscoli (lisciatura che conserva il volume)
    m = G.modifiers.new('dis', 'DISPLACE'); m.strength = ease; m.mid_level = 0; applica(G, m)
    m = G.modifiers.new('sm', 'CORRECTIVE_SMOOTH'); m.iterations = smooth * 4; m.factor = .7; m.use_only_smooth = True; m.rest_source = 'ORCO'; applica(G, m)
    return G

def taglia(G, punto, normale):
    """Toglie tutto quello che sta dalla parte della normale del piano (e chiude niente: l'orlo resta aperto)."""
    bm = bmesh.new(); bm.from_mesh(G.data)
    r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=punto, plane_no=normale, clear_outer=True)
    bm.to_mesh(G.data); bm.free()

def pesi(G, src):
    """I pesi dello scheletro copiati dal corpo (la faccia più vicina, interpolata)."""
    for vg in src.vertex_groups:
        if vg.name not in G.vertex_groups: G.vertex_groups.new(name=vg.name)
    m = G.modifiers.new('dt', 'DATA_TRANSFER'); m.object = src; m.use_vert_data = True; m.data_types_verts = {'VGROUP_WEIGHTS'}
    m.vert_mapping = 'POLYINTERP_NEAREST'; m.layers_vgroup_select_src = 'ALL'; m.layers_vgroup_select_dst = 'NAME'
    bpy.context.view_layer.objects.active = G; G.select_set(True); applica(G, m)
