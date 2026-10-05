# [verde] Il prato vario e la vegetazione media per specie (frammento verde.js). Si applica per ultimo, dopo case_render1.py.
# - suolo: prato dipinto a mezzo metro con campi lisci (umidità, erba secca, erba morta, trifoglio e muschio, terra nuda, bordo strada,
#   foglie al margine del bosco), fili d'erba, talpe, sassi, fiori a colonie; campi coltivati ad appezzamenti con i solchi orientati.
# - vegetazione media: 20 specie fatte a triangoli coi colori veri, a colonie e dove crescerebbero; visibile entro ~62 m dalla camera
#   (come il bosco del kit); lontano restano i ciuffi semplici.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[verde]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verde.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")
# il prato e i campi si dipingono prima del bosco
rep("      if (bosco36(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [isola36]\n",
    "      if (prato38(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [verde]\n      if (bosco36(x, px, py, P, tx, ty, r, v, z, ii)) continue;   // [isola36]\n")
# la terra fradicia di snowPass non copre il prato dipinto
rep("    info.forEach(q => { if (!q.natural || zoneT(q.tx, q.ty) === ZN.CITTA || ",
    "    info.forEach(q => { if (!q.natural || VD.PRD[q.ty * G.GW + q.tx] || zoneT(q.tx, q.ty) === ZN.CITTA || ")
# i campi conosciuti per casella si azzerano a ogni blocco (gli alberi si tagliano)
rep("    paintTiles(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);",
    "    VD.EDG.fill(-1); VD.RDN.fill(-1);   // [verde]\n    paintTiles(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m);")
# la vegetazione media nel blocco, accesa vicino alla camera
rep("    const nat = buildNat(tx0, ty0, n, m); grp.add(nat); const lt = veg.getObjectByName('loTrees');",
    "    const nat = buildNat(tx0, ty0, n, m); grp.add(nat); const lt = veg.getObjectByName('loTrees');\n    const vd = verde38(tx0, ty0, n, m); vd.visible = false; grp.add(vd);   // [verde]")
rep("    return { grp, geo, mat, tex, btex, veg, nat, lt, rev: ISO.rev };", "    return { grp, geo, mat, tex, btex, veg, nat, lt, vd, rev: ISO.rev };")
rep("    if (ch.nat) ch.nat.children.forEach(", "    if (ch.vd) ch.vd.traverse(im => { if (im.isMesh) { im.geometry.dispose(); if (im.dispose) im.dispose(); } });   // [verde]\n    if (ch.nat) ch.nat.children.forEach(")
rep("      if (ch && ch.nat) { const hi", "      if (ch && ch.vd) { ch.vd.visible = d < (LOWQ.on ? 36 : 62); if (ch.vd.userData.tap) ch.vd.userData.tap.visible = d < (LOWQ.on ? 26 : 44); }   // [verde]\n      if (ch && ch.nat) { const hi")
# vicino alla camera il prato e i suoi margini sono del pass [verde]: il kit non ci mette più felci e cespugli a caso
rep("      } else if (v === T.SHRUB || v === T.GRASS) {", "      } else if ((v === T.SHRUB || v === T.GRASS) && !VD.on) {   // [verde]")
# i ciuffi del Tavolato restano solo da lontano (vicino ci sono i cespi veri)
rep("const tuft = (x, z, cols, sc, r) => put((zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.DESERTO ? L0 : LT).tuft,", "const tuft = (x, z, cols, sc, r) => put(LT.tuft,   /* [verde] */")
# niente paletti a griglia nei campi: l'orto ha i suoi cavoli a file
rep("else if (v === T.FIELD) { if (tx % 2 === 0 && ty % 3 === 0 && r() < .5)", "else if (v === T.FIELD) { if (false)   /* [verde] */")
# da lontano: niente fiorellini e palle d'autunno sparse a caso nel prato
rep("      if (r() < .1) blob(x0 + r() * 2, z0 + r() * 2, .35 + r() * .35, pick(r, VG31.GRN));\n      if (r() < .06) for (let q = 0; q < 4; q++)",
    "      if (r() < .1) blob(x0 + r() * 2, z0 + r() * 2, .35 + r() * .35, pick(r, VG31.GRN));\n      if (false) for (let q = 0; q < 4; q++)   /* [verde] */")
# l'abete rosso del riferimento: una parte dei pini del kit, a macchie (abetaie)
rep("    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/' + name)) return (NAT.models[name] = null);",
    "    if (/^(Abete|Betulla|Quercia)_/.test(name)) return (NAT.models[name] = abeteModel(name));   // [verde]\n    if (typeof Kit === 'undefined' || !Kit.has || !Kit.has('natura/' + name)) return (NAT.models[name] = null);")
rep("const [name, s] = natTree(tx, ty, r), big = ", "const [name, s, lean] = eco38(tx, ty, r), big = ")
rep("{ rx: (r() - .5) * .06, rz: (r() - .5) * .06, col: treeCol36(name, cx, cz, r) });", "{ rx: (r() - .5) * .06, rz: (r() - .5) * .06 + (lean || 0), col: treeCol36(name, cx, cz, r) });")
rep("const tree = /Tree|Pine/.test(name);", "const tree = /Tree|Pine|Abete|Betulla|Quercia/.test(name);")
# il suolo del bosco: muschio verde a macchie larghe, aghi e foglie solo dove è più asciutto
rep("col = k2 > -.05 ? `rgb(${44 + g},${36 + g},${26 + g / 2})` : `rgb(${36 + g / 2},${48 + g},${28})`;",
    "col = k2 > .12 ? `rgb(${50 + g},${44 + g},${28 + g / 2})` : `rgb(${36 + g / 2},${62 + g},${30})`;   /* [verde] */")
# le strade bianche dipinte da [verde]: bordi sfumati nell'erba, solchi, erba in mezzo
rep("    pass(dirt, rd => rd.w + 1.2, () => 'rgba(110,84,58,.55)');\n    pass(dirt, rd => rd.w, () => '#8a6a4a');\n    pass(dirt, rd => 1.1, () => 'rgba(150,120,86,.6)');\n",
    "    vdSterrate(x, X0, Y0, X1, Y1);   // [verde]\n")
# le querce e i faggi nuovi: ogni chioma una tinta sua, a macchie (gialla, scura e fredda, chiara, piena)
rep("    if (/Twisted/.test(name)) return pick(r, ['#d8e0c0', '#c8d4b0']);",
    "    if (/Quercia/.test(name)) { const q = vnz(x / 18 + 5, z / 18 + 9) + (r() - .5) * .5; return q > .25 ? pick(r, ['#fff4c0', '#f8f0a8']) : q < -.25 ? pick(r, ['#a8c0b8', '#b8ccc0']) : q > 0 ? pick(r, ['#ffffff', '#f0f8e0']) : pick(r, ['#d8e8c8', '#c8dcc0']); }   // [verde]\n    if (/Twisted/.test(name)) return pick(r, ['#d8e0c0', '#c8d4b0']);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
