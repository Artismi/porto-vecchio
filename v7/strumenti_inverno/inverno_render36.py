# [isola36] Il suolo del bosco e del Tavolato senza caselle (isola_render5.js): ghiaione a fascia continua, sottobosco di aghi e
# muschio, radure d'erba secca, pianoro di roccia bagnata. Sassi del ghiaione scuri, non bianchi. In città niente ciuffi verdi a
# caso sul ciottolato e strisce pedonali solo agli incroci veri (tre bracci o più). Dopo inverno_render35.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola36]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render5.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
rep("      const px = i * P, py = j * P, z = zoneT(tx, ty), r = rng((tx * 7919 + ty * 104729) >>> 0);\n",
    "      const px = i * P, py = j * P, z = zoneT(tx, ty), r = rng((tx * 7919 + ty * 104729) >>> 0);\n      if (bosco36(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [isola36]\n")
rep("    info.forEach(q => { if (!q.natural || zoneT(q.tx, q.ty) === ZN.CITTA) return;", "    info.forEach(q => { if (!q.natural || zoneT(q.tx, q.ty) === ZN.CITTA || (M.world && M.world.XF && q.tx * TS < M.world.XF)) return;   /* [isola36] */")
rep("x, groundH(x, z) - .02, z, 1.6 + r() * 2, r() * 6.28, { col: pick(r, ['#f0ece4', '#e4e0d8', '#d8d4cc']) }", "x, groundH(x, z) - .02, z, 1.6 + r() * 2, r() * 6.28, { col: (f & 8192) ? pick(r, ['#8a8478', '#7a746a', '#968e82']) : pick(r, ['#f0ece4', '#e4e0d8', '#d8d4cc']) }")
rep("if (r() < .08) { const s = .5 + r() * .6; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .3 * s, cz, s, r() * 6.28, { col: '#d0ccc4' }); }", "if (r() < .08) { const s = .5 + r() * .6; add('Rock_Medium_' + (1 + Math.floor(r() * 3)), cx, groundH(cx, cz) - .3 * s, cz, s, r() * 6.28, { col: (f & 8192) ? '#8e8a82' : '#d0ccc4' }); }")
# città: il ciottolato non ha ciuffi d'erba dipinti a caso (il verde sta nei cortili)
rep("(k1 > .22 ? 'cemento' : k1 > -.18 ? 'ciottoli' : k2 > .1 ? 'terra' : 'erba')", "(k1 > .22 ? 'cemento' : k1 > -.25 ? 'ciottoli' : 'terra')")
rep("      if (R.filter(rd => nearRoad(rd, jx, jy)).length < 2) return;   // due vie larghe che si incontrano davvero\n      armsAt(jx, jy, jr).forEach(",
    "      if (R.filter(rd => nearRoad(rd, jx, jy)).length < 2) return;   // due vie larghe che si incontrano davvero\n      const AR = armsAt(jx, jy, jr); if (AR.length < 3) return;   // [isola36] un incrocio vero, non una strada che ne continua un'altra\n      AR.forEach(")
# il bosco vario e pieno: colori a macchie per specie, più sottobosco sotto gli alberi
rep("add(name, cx, groundH(cx, cz) - .15, cz, s * big * (.9 + r() * .2), r() * 6.28, { rx: (r() - .5) * .06, rz: (r() - .5) * .06, col: pick(r, LEAF) });", "add(name, cx, groundH(cx, cz) - .15, cz, s * big * (.9 + r() * .2), r() * 6.28, { rx: (r() - .5) * .06, rz: (r() - .5) * .06, col: treeCol36(name, cx, cz, r) });   // [isola36]")
rep("const k = (th > .5 ? 2 : 1) + (nt < 5 ? 1 : 0); for (let q = 0; q < k; q++) if (r() < .55)", "const k = (th > .5 ? 3 : 2) + (nt < 5 ? 1 : 0); for (let q = 0; q < k; q++) if (r() < .72)")
rep("if (leafy) { m.color.multiplyScalar(1.4); m.emissive = new THREE.Color('#2e4228'); m.emissiveMap = map; m.emissiveIntensity = .55; }", "if (leafy) { m.color.multiplyScalar(1.55); m.emissive = new THREE.Color('#34482c'); m.emissiveMap = map; m.emissiveIntensity = .7; }")
# il ciglio del Tavolato col colore del pianoro (roccia scura e muschio), non un anello chiaro
rep("x.fillStyle = '#5a6248'; x.fillRect(0, 0, 32, 32); for (let k = 0; k < 120; k++) { x.fillStyle = pick(r, ['#6a7252', '#4e5640', '#7a7a66', '#666a5a', '#585c4a']);", "x.fillStyle = '#3c4030'; x.fillRect(0, 0, 32, 32); for (let k = 0; k < 120; k++) { x.fillStyle = pick(r, ['#4a4e38', '#36402c', '#525446', '#444836', '#3a3e30']);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
