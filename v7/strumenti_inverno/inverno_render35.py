# [isola35] La città leggibile: suolo (asfalto scuro, marciapiedi di lastre col cordolo, vicoli di basoli, cortili di terra ed erba),
# strisce pedonali solo agli incroci delle vie larghe, tutto a terra sulla quota vera del marciapiede, via gli arredi che
# compenetrano, il verde in città e le cose trovate per caso (isola_render4.js). Dopo inverno_render34.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola35]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render4.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
# 1) il campo dei marciapiedi diventa una funzione a sé (serve alla quota di tutto quello che sta a terra)
a = s.index("    const T = G.T, R = .5, K = Math.round(TS / R)"); b0 = "for (let k = 0; k < m.length; k++) H[k] = .15 * sstep(.36, .64, m[k]);\n"; b = s.index(b0, a) + len(b0)
block = s[a:b]; assert block.count("if (!any) return 0;") == 1
blk = block.replace("if (!any) return 0;", "if (!any) return null;")
o1 = "for (let kk = 0; kk < DM.length; kk++) { if (DM[kk] > 1e8) continue; const x = (kk % NW) * R, z = Math.floor(kk / NW) * R, tx = Math.floor(x / TS), tz = Math.floor(z / TS);\n        if (zoneT(tx, tz) !== ZN.CITTA) continue; const d = DM[kk], h0 = HW[kk]; m[kk] = d > h0 + .05 && d < h0 + 2 ? 1 : d < h0 + 3.4 ? 0 : m[kk]; } }"
assert blk.count(o1) == 1, 'maschera'
# in città il marciapiede è solo la fascia lungo le vie larghe (2 m), non le macchie delle vecchie caselle
blk = blk.replace(o1, "for (let kk = 0; kk < DM.length; kk++) { const x = (kk % NW) * R, z = Math.floor(kk / NW) * R, tx = Math.floor(x / TS), tz = Math.floor(z / TS);\n        if (zoneT(tx, tz) !== ZN.CITTA) continue; if (DM[kk] > 1e8) { m[kk] = 0; continue; } const d = DM[kk], h0 = HW[kk]; m[kk] = d > h0 + .05 && d < h0 + 2.1 ? 1 : 0; } }   // [isola35] in città solo la fascia lungo le vie")
frag = frag.replace("//@@SWBLOCK@@\n", blk)
s = s[:a] + "    const F35 = swField(); if (!F35) return 0; const { R, NW, NH, H, m } = F35;   // [isola35]\n    const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };\n" + s[b:]
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
# 2) la quota del terreno comprende il marciapiede: persone, veicoli, arredi poggiano sopra, non dentro
rep("    return VH(i, j) * (1 - u) * (1 - v) + VH(i + 1, j) * u * (1 - v) + VH(i, j + 1) * (1 - u) * v + VH(i + 1, j + 1) * u * v;\n  }",
    "    return VH(i, j) * (1 - u) * (1 - v) + VH(i + 1, j) * u * (1 - v) + VH(i, j + 1) * (1 - u) * v + VH(i + 1, j + 1) * u * v + swH(x, z);   // [isola35] sopra il marciapiede\n  }")
# 3) marciapiede: lastre, cordolo di granito, canaletta
rep("const idx = new Int32Array(m.length).fill(-1), pos = [], col = [], ind = [], c = new THREE.Color();", "const idx = new Int32Array(m.length).fill(-1), pos = [], col = [], ind = [], c = new THREE.Color(), uv35 = [];")
i = s.index("      c.set('#5a5860').lerp(c.clone().set(NEVE ? '#b4bac2' : '#646268'), top);"); j = s.index("\n", i)
s = s[:i] + "      colMarc35(c, top, n1, n2);   // [isola35] lastre, cordolo chiaro, canaletta scura" + s[j:]
rep("      pos.push(x, y, z); col.push(c.r, c.g, c.b); return (idx[k] = pos.length / 3 - 1); };", "      pos.push(x, y, z); col.push(c.r, c.g, c.b); uv35.push(x / 2, z / 2); return (idx[k] = pos.length / 3 - 1); };")
rep("geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(ind); geo.computeVertexNormals();\n    geo.boundingSphere",
    "geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv35, 2)); geo.setIndex(ind); geo.computeVertexNormals();\n    geo.boundingSphere")
rep("new THREE.MeshLambertMaterial({ vertexColors: true, emissive: NEVE ? '#34363c' : '#1a1a1e', polygonOffset",
    "new THREE.MeshLambertMaterial({ map: lastre35(), vertexColors: true, emissive: NEVE ? '#34363c' : '#121214', polygonOffset")
# 4) suolo della città
rep("        else { x.fillStyle = '#3a3640'; x.fillRect(px, py, P, P);", "        else if (z === ZN.CITTA) suolo35(x, px, py, P, tx, ty, r, v);   // [isola35]\n        else { x.fillStyle = '#3a3640'; x.fillRect(px, py, P, P);")
rep("        asphalt(x, px, py, P, tx, ty, r);\n      } else if (v === T.WALK) {", "        asphalt(x, px, py, P, tx, ty, r);\n      } else if ((v === T.GRASS || v === T.DIRT) && z === ZN.CITTA && !(RW[ii] > 0)) { suolo35(x, px, py, P, tx, ty, r, v);   // [isola35]\n      } else if (v === T.WALK) {")
rep("x.fillStyle = '#b8ac98'; x.fillRect(px, py, P, P);   // [inverno17]", "x.fillStyle = '#7a7064'; x.fillRect(px, py, P, P);   // [isola35] pietra scura, non chiara [inverno17]")
rep("if (gy % 7 === 0) { x.fillStyle = 'rgba(120,110,98,.55)';", "if (gy % 7 === 0) { x.fillStyle = 'rgba(44,38,34,.6)';")
rep("x.fillStyle = 'rgba(120,110,98,.5)'; x.fillRect(px + xx, py + yy, 1, 1); } else if (th(cell, row, 53) < .3) { x.fillStyle = 'rgba(150,138,122,.12)';", "x.fillStyle = 'rgba(44,38,34,.55)'; x.fillRect(px + xx, py + yy, 1, 1); } else if (th(cell, row, 53) < .3) { x.fillStyle = 'rgba(150,138,122,.1)';")
rep("        dots(px, py, 10, ['#c8bca8', '#a89c88'], r);", "        dots(px, py, 10, ['#8a8072', '#6a6054', '#4a5a36'], r);")
rep("    info.forEach(q => { if (!q.natural) return; const r = rng((q.tx * 4561", "    info.forEach(q => { if (!q.natural || zoneT(q.tx, q.ty) === ZN.CITTA) return; const r = rng((q.tx * 4561")   # [isola35] in città il suolo lo dipinge suolo35
# 5) strade: asfalto scuro col pattern, cunetta, vicoli di basoli con la canaletta
rep("""    pass(rd => asph(rd) && (rd.kind === 'citta' || rd.kind === 'litoranea'), rd => rd.w + 6.4, () => '#58565c');   // [isola31] la fascia del marciapiede segue la curva: niente scalini
    pass(asph, rd => rd.w + 1.2, () => 'rgba(150,140,124,.9)');
    pass(asph, rd => rd.w, () => '#626064');""", """    const vic = rd => rd.kind === 'vicolo', strd = rd => asph(rd) && !vic(rd), urb = rd => rd.kind === 'citta' || rd.kind === 'litoranea';   // [isola35]
    pass(rd => strd(rd) && urb(rd), rd => rd.w + 6.4, () => '#5e5a54');   // [isola31] la fascia del marciapiede segue la curva: niente scalini
    pass(vic, rd => rd.w + .9, () => 'rgba(30,27,25,.85)');
    pass(vic, rd => rd.w, () => pat35(x, 'basolato', X0, Y0));
    pass(vic, rd => .3, () => 'rgba(22,20,20,.5)');
    pass(strd, rd => rd.w + 1.2, rd => urb(rd) ? '#2e2c2a' : 'rgba(98,90,78,.92)');
    pass(strd, rd => rd.w, () => pat35(x, 'asfalto', X0, Y0));""")
rep("roadMarks(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);", "roadMarks(x, tx0, ty0, n, m); strisce35(x, tx0, ty0, n, m); sporco35(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);")
# 5b) il suolo non è uno specchio: la ruvidità non scende più con il colore scuro (l'asfalto scuro rifletteva il cielo e sembrava neve sporca)
rep("r = Math.max(.26, Math.min(1, .26 + (lum - 62) / 70 * .74)) * 255", "r = Math.max(.72, Math.min(1, .72 + (lum - 40) / 120 * .28)) * 255   /* [isola35] */")
# 6) il verde in città
rep("    for (const [name, arr] of B) {", "    if (ZN.CITTA !== undefined) verdeCitta35(add, tx0, ty0, n, m);   // [isola35]\n    for (const [name, arr] of B) {")
# 7) pulizia e oggetti, dopo tutti gli altri arredi
rep("TT('pulizia', clearMurals);", "TT('pulizia', clearMurals); TT('pulizia35', pulizia35); TT('oggetti35', oggetti35);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
