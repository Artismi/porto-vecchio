"""Porto Vecchio — Blender: utilità comuni per i vestiti modellati.
Si lancia con python3 (Blender come modulo, `pip install bpy`): import del personaggio del kit, foto di controllo, esportazione."""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

KIT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mc')

def nuova_scena():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def importa(nome):
    """Importa un personaggio del kit; ritorna (armatura, {parte: oggetto})."""
    bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, nome + '.glb'))
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    parti = {}
    for o in bpy.data.objects:
        if o.type == 'MESH':
            for k in ('Body', 'Legs', 'Feet', 'Head'):
                if k in o.name: parti[k] = o
    return arm, parti

def foto(percorso, angoli=(0, 45, 90, 180), alto=1.0, dist=3.2, fuoco=1.0, w=1600, h=900):
    """Un foglio di foto (Workbench, luce da studio): il personaggio da più lati, affiancati."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True; sh.cavity_type = 'BOTH'
    sh.show_object_outline = True; sh.object_outline_color = (0.05, 0.05, 0.06)
    sc.render.film_transparent = False
    if not sc.world: sc.world = bpy.data.worlds.new('W')
    sc.render.resolution_x = w // len(angoli); sc.render.resolution_y = h
    cam = bpy.data.objects.get('CamFoto')
    if not cam:
        cd = bpy.data.cameras.new('CamFoto'); cd.lens = 70; cam = bpy.data.objects.new('CamFoto', cd); sc.collection.objects.link(cam)
    sc.camera = cam
    import tempfile
    from PIL import Image
    ims = []
    for a in angoli:
        r = math.radians(a)
        cam.location = Vector((math.sin(r) * dist, -math.cos(r) * dist, alto))
        d = Vector((0, 0, fuoco)) - cam.location
        cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        f = tempfile.mktemp(suffix='.png'); sc.render.filepath = f
        bpy.ops.render.render(write_still=True); ims.append(Image.open(f).convert('RGB'))
    W = Image.new('RGB', (sum(i.width for i in ims), h)); x = 0
    for i in ims: W.paste(i, (x, 0)); x += i.width
    W.save(percorso)

def mondo(o):
    """I vertici dell'oggetto in coordinate del mondo (metri)."""
    M = o.matrix_world
    return [M @ v.co for v in o.data.vertices]
