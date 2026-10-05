# [unione5] Meno rumore a terra. Dopo unione4.py. Guardia [unione5].
#  - le carte che il vento porta in giro ([animazioni-mondo]) erano 44 attorno alla camera: con i 2.400 oggetti fermi di [vita1]
#    la strada sembrava coperta di coriandoli. Ne restano 12;
#  - i sampietrini a coda di pavone di [strade1] (Via del Porto, Via Alta) avevano pietre chiare e fughe nere: dall'alto un
#    rumore bianco e nero. Pietre e fughe più vicine di tono, nel grigio caldo della piazza.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione5]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("const N = 44, geo = new THREE.PlaneGeometry(.3, .4);", "const N = 12, geo = new THREE.PlaneGeometry(.3, .4);   /* [unione5] */")
rep("g = joint ? 30 + h * 10 : 70 + h * 34,", "g = joint ? 44 + h * 6 : 60 + h * 16,   /* [unione5] meno contrasto */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
