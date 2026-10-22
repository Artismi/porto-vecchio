# Incorpora i font dei graffiti (assets/fonts_graffiti/*.woff2) in src/fonts_graffiti.js: var GraffitiFonts = { D: { nome: base64 } }
import base64, glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = ['/* Porto Vecchio — i font dei graffiti (generato da strumenti_inverno/fonts_graffiti.py: non modificare a mano).',
       '   Font liberi (OFL 1.1, Apache 2.0) da Google Fonts, ridotti alle lettere latine: licenze in assets/fonts_graffiti/licenze. */',
       'var GraffitiFonts = { D: {']
for f in sorted(glob.glob(os.path.join(root, 'assets/fonts_graffiti/*.woff2'))):
    n = os.path.basename(f)[:-6].split('-')[0]
    out.append("  %s: '%s'," % (n, base64.b64encode(open(f, 'rb').read()).decode()))
out.append('} };')
out.append("if (typeof module !== 'undefined') module.exports = GraffitiFonts;")
open(os.path.join(root, 'src/fonts_graffiti.js'), 'w').write('\n'.join(out) + '\n')
print('fonts_graffiti.js', sum(len(l) for l in out))
