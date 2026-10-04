# [inverno 17] Suoli senza blocchetti. Si applica dopo inverno_render16.
# 1) l'isola a bassa risoluzione (buildBase) stava 8 cm sotto i blocchi veri: dove il terreno vero è livellato o incavato
#    spuntava fuori a rombi scuri col bordo netto. Ora è fatta a pezzi grandi come un blocco e si spegne dove il blocco vero c'è;
#    la sua texture è sfumata, non a quadretti.
# 2) asfalto: niente più chiazze quadrate da 8 m (tinta per gruppi di 4 caselle): la tinta segue un rumore morbido.
# 3) piazza: niente scacchiera né fughe sul bordo di ogni casella; lastre irregolari che proseguono da una casella all'altra.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno17]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
# 1) base a pezzi
rep("const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter;\n    const pos = [], uv = [], idx = [];",
    "const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;   // [inverno17] sfumata\n    const pos = [], uv = [], idx = [];")
rep("""      if (!land) continue; const a = j * (nx + 1) + i, b = (j + 1) * (nx + 1) + i; idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 });
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; scene.add(mesh); ISO.base = mesh;""",
"""      if (!land) continue; const a = j * (nx + 1) + i, b = (j + 1) * (nx + 1) + i;
      const key = Math.floor(i * S / ISO.CH) + ',' + Math.floor(j * S / ISO.CH); (PIECE[key] = PIECE[key] || []).push(a, b, b + 1, a, b + 1, a + 1);
    }
    // [inverno17] un pezzo per blocco: si nasconde dove il blocco vero è caricato (prima spuntava a rombi scuri)
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, polygonOffset: true, polygonOffsetFactor: 3, polygonOffsetUnits: 3 });
    const P32 = new THREE.Float32BufferAttribute(pos, 3), UV2 = new THREE.Float32BufferAttribute(uv, 2), grp = new THREE.Group(); ISO.basePieces = {};
    Object.keys(PIECE).forEach(key => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', P32); geo.setAttribute('uv', UV2); geo.setIndex(PIECE[key]); geo.computeVertexNormals(); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; grp.add(mesh); ISO.basePieces[key] = mesh; });
    scene.add(grp); ISO.base = grp;""")
rep("    const pos = [], uv = [], idx = [];\n    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const tx = Math.min(G.GW, i * S)",
    "    const pos = [], uv = [], idx = [], PIECE = {};\n    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const tx = Math.min(G.GW, i * S)")
rep("    if (best) { const old = ISO.chunks.get(best[2]); if (old) dropChunk(old); ISO.chunks.set(best[2], buildChunk(best[0], best[1])); }\n  }",
    """    if (best) { const old = ISO.chunks.get(best[2]); if (old) dropChunk(old); ISO.chunks.set(best[2], buildChunk(best[0], best[1])); }
    if (ISO.basePieces) for (const key in ISO.basePieces) ISO.basePieces[key].visible = !ISO.chunks.has(key);   // [inverno17]
  }""")
# 2) asfalto senza quadrati da 8 m
rep("const base = 96 + Math.floor(th(tx >> 2, ty >> 2, 9) * 14);", "const base = 96 + Math.floor((vnz(tx / 7, ty / 7) + .5) * 9);   // [inverno17] tinta morbida, non a quadrati")
# 3) piazza a lastre
rep("""        x.fillStyle = '#b8ac98'; x.fillRect(px, py, P, P); x.fillStyle = '#9a8e7c'; x.fillRect(px, py + P - 1, P, 1); x.fillRect(px + P - 1, py, 1, P);
        if ((tx + ty) % 2) { x.fillStyle = 'rgba(80,60,70,.18)'; x.fillRect(px + 2, py + 2, P - 4, P - 4); } dots(px, py, 10, ['#c8bca8', '#a89c88'], r);""",
"""        x.fillStyle = '#b8ac98'; x.fillRect(px, py, P, P);   // [inverno17] lastre a correre: righe di 7 px, giunti sfalsati per riga, misure variabili; continuano fra le caselle
        for (let yy = 0; yy < P; yy++) { const gy = ty * P + yy, row = Math.floor(gy / 7); if (gy % 7 === 0) { x.fillStyle = 'rgba(120,110,98,.55)'; x.fillRect(px, py + yy, P, 1); continue; }
          for (let xx = 0; xx < P; xx++) { const gx = tx * P + xx, off = th(row, 0, 51) * 23, cell = Math.floor((gx + off) / (9 + th(row, 1, 52) * 6)); if (Math.floor((gx + 1 + off) / (9 + th(row, 1, 52) * 6)) !== cell) { x.fillStyle = 'rgba(120,110,98,.5)'; x.fillRect(px + xx, py + yy, 1, 1); } else if (th(cell, row, 53) < .3) { x.fillStyle = 'rgba(150,138,122,.12)'; x.fillRect(px + xx, py + yy, 1, 1); } } }
        dots(px, py, 10, ['#c8bca8', '#a89c88'], r);""")
s = s.replace("function buildBase() {", "function buildBase() {   // [inverno17]", 1)
open(p, 'w', encoding='utf-8').write(s); print('ok')
