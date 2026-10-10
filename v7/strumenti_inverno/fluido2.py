# [fluido2] Meno chiamate di disegno, stessa immagine. Misura del passaggio principale (periferia ovest): 1.581 chiamate, di cui
#  - 245 per l'isola a bassa risoluzione (un pezzo per blocco, 12 mila triangoli in tutto: quasi solo costo di chiamata);
#  - 296 per le case già fuse dal pulitore (settori di 32 m per materiale);
#  - 213 per l'arredo statico fuso (celle di 80 m per materiale).
# Ora: l'isola lontana è una mesh sola (l'indice si ricompone quando cambiano i blocchi caricati).
# Dopo fluido1.py. Guardia [fluido2].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[fluido2]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# 1) l'isola lontana: una mesh, l'indice fatto dei pezzi dei blocchi non ancora caricati
rep("""    Object.keys(PIECE).forEach(key => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', P32); geo.setAttribute('uv', UV2); geo.setIndex(PIECE[key]); geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; grp.add(mesh); ISO.basePieces[key] = mesh; });""",
"""    {   // [fluido2] una mesh sola invece di un pezzo per blocco (245 chiamate per 12 mila triangoli); i pezzi restano come indici
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', P32); geo.setAttribute('uv', UV2);
      const all = []; Object.keys(PIECE).forEach(key => { for (const v of PIECE[key]) all.push(v); });
      geo.setIndex(all); geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; grp.add(mesh); ISO.baseMesh = mesh; ISO.basePiece = PIECE; ISO.baseSig = ''; }""")
rep("""    if (ISO.basePieces) for (const key in ISO.basePieces) ISO.basePieces[key].visible = !ISO.chunks.has(key);   // [inverno17]""",
"""    if (ISO.baseMesh) {   // [inverno17] l'isola lontana si nasconde dove il blocco vero è caricato; [fluido2] ricomponendo l'indice della mesh sola
      const P = ISO.basePiece, keys = Object.keys(P).filter(k => !ISO.chunks.has(k)), sig = keys.join(';');
      if (sig !== ISO.baseSig) { ISO.baseSig = sig; let n = 0; keys.forEach(k => n += P[k].length); const ix = new Uint32Array(n); let o = 0; keys.forEach(k => { ix.set(P[k], o); o += P[k].length; });
        const g = ISO.baseMesh.geometry; g.setIndex(new THREE.BufferAttribute(ix, 1)); ISO.baseMesh.visible = n > 0; } }""")

# (provato: settori di 96 m per le case e celle di 160 m per l'arredo non tolgono chiamate, perché quasi ogni casa ha materiali
#  suoi, le facciate dipinte; aumentano solo i triangoli disegnati fuori campo. Restano 32 e 80.)
open(p, 'w', encoding='utf-8').write(s); print('ok')
