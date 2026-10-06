# python3 -I glb2json_tex.py modello.glb cartella_texture uscita.json : glb -> glTF JSON con buffer e immagini incorporati; le texture esterne si cercano per nome (senza maiuscole ne' estensione)
import sys, json, struct, base64, os, re
src, texdir, out = sys.argv[1:4]
b = open(src, 'rb').read(); assert b[:4] == b'glTF'
off = 12; J = None; BIN = b''
while off < len(b):
    ln, ty = struct.unpack('<II', b[off:off+8]); chunk = b[off+8:off+8+ln]
    if ty == 0x4E4F534A: J = json.loads(chunk.decode('utf-8', 'replace'))   # nomi in latin-1 nei vecchi 3DS
    elif ty == 0x004E4942: BIN = chunk
    off += 8 + ln
files = {}
for r, _, fs in os.walk(texdir):
    for f in fs:
        if re.search(r'\.(jpe?g|png)$', f, re.I): files.setdefault(os.path.splitext(f)[0].lower(), os.path.join(r, f))
J['buffers'] = [{'byteLength': len(BIN), 'uri': 'data:application/octet-stream;base64,' + base64.b64encode(BIN).decode()}]
drop = set()
for i, im in enumerate(J.get('images', [])):
    if 'bufferView' in im: continue
    u = im.get('uri', '')
    if u.startswith('data:'): continue
    stem = os.path.splitext(os.path.basename(u.replace('\\', '/')))[0].lower()
    p = files.get(stem) or next((v for k, v in sorted(files.items()) if k.replace(' ', '').startswith(stem.replace(' ', ''))), None)   # nomi 8.3 dei 3DS: TD-6V-LA = TD-6V-large
    if p:
        mime = 'image/png' if p.lower().endswith('.png') else 'image/jpeg'
        im['uri'] = 'data:%s;base64,' % mime + base64.b64encode(open(p, 'rb').read()).decode(); im.pop('mimeType', None); print('  texture', u, '->', os.path.basename(p))
    else: drop.add(i); im['uri'] = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='; im.pop('mimeType', None); print('  manca', u, '(bianca)')
if drop:
    bad = {ti for ti, t in enumerate(J.get('textures', [])) if t.get('source') in drop}
    def clean(o):
        if isinstance(o, dict):
            for k in list(o):
                v = o[k]
                if isinstance(v, dict) and 'index' in v and k.lower().endswith('texture') and v['index'] in bad: del o[k]
                else: clean(v)
        elif isinstance(o, list):
            for v in o: clean(v)
    clean(J.get('materials', []))
# assimp coi 3DS: materiali opachi con alpha 0 (invisibili). Opachi tutti tranne i vetri.
for m in J.get('materials', []):
    pb = m.setdefault('pbrMetallicRoughness', {}); bc = pb.get('baseColorFactor')
    vetro = re.search(r'glass|vetro|clear|window|cristal', m.get('name', ''), re.I)
    if bc and bc[3] < .2 and not vetro: bc[3] = 1; m.pop('alphaMode', None)
    elif bc and vetro: bc[3] = max(bc[3], .3); m['alphaMode'] = 'BLEND'
tri = 0
for m in J['meshes']:
    for p in m['primitives']:
        a = J['accessors'][p.get('indices', p['attributes']['POSITION'])]; tri += a['count'] // 3
json.dump(J, open(out, 'w')); print(os.path.basename(out), 'mesh', len(J['meshes']), 'tri', tri, 'mat', len(J.get('materials', [])), os.path.getsize(out) // 1024, 'KB')
# immagini incorporate piu' grandi di MAXPX (env) rimpicciolite
import io as _io
MAXPX = int(os.environ.get('MAXPX', '0'))
if MAXPX:
    from PIL import Image
    J = json.load(open(out))
    for im in J.get('images', []):
        u = im.get('uri', '')
        if 'bufferView' in im:
            bv = J['bufferViews'][im['bufferView']]; raw = BIN[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        elif u.startswith('data:'): raw = base64.b64decode(u.split(',', 1)[1])
        else: continue
        img = Image.open(_io.BytesIO(raw))
        if max(img.size) <= MAXPX and 'bufferView' not in im: continue
        img.thumbnail((MAXPX, MAXPX)); bio = _io.BytesIO(); alpha = img.mode in ('RGBA', 'LA', 'P')
        (img.save(bio, 'PNG') if alpha else img.convert('RGB').save(bio, 'JPEG', quality=85))
        im.pop('bufferView', None); im.pop('mimeType', None); im['uri'] = 'data:image/%s;base64,' % ('png' if alpha else 'jpeg') + base64.b64encode(bio.getvalue()).decode()
    json.dump(J, open(out, 'w')); print('  immagini <=', MAXPX, 'px:', os.path.getsize(out) // 1024, 'KB')
