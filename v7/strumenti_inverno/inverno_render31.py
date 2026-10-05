# [isola31] L'isola nuova (world.js con testa di bosco, Tavolato, quartiere del governo, centro spostato di 612 m a est).
# Coordinate scritte a mano spostate, palazzi a gradoni, baracche di lamiera, banchi di fortuna, torri del governo,
# guardrail/parapetti/cartelli rovinati/lavori in corso/transenne/arredo, roccia tagliata e muri di sostegno a bordi morbidi,
# marciapiedi lisci lungo le strade storte, vegetazione con sottobosco e chiome piene, faro su traliccio, stazioni di mattoni.
# Frammento: isola_render.js. Dopo inverno_render30.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[isola31]' in s: print('già applicato'); sys.exit()
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'isola_render.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# il frammento e i vecchi faro e banco messi da parte
rep("  function buildLighthouse(b, cx, cz, base) {\n    const c = mk(16, 64)", "  function faroVecchio(b, cx, cz, base) {\n    const c = mk(16, 64)")
rep("  function banco(it, r) {\n    const G2 = GOODS[it.goods]", "  function bancoVecchio(it, r) {\n    const G2 = GOODS[it.goods]")
rep("  function buildBuildings() {\n", frag + "\n  function buildBuildings() {\n")

# coordinate scritte a mano: il centro, il porto e la Base stanno 612 m più a est
rep("return Math.min(y - W0.northY(x), W0.southY(x) - y, x - 6, 672 - x); }", "return W0.inland ? W0.inland(x, y) : Math.min(y - W0.northY(x), W0.southY(x) - y, x - 6, 672 - x); }")
rep("west = wx < 330;", "west = (M.world && M.world.xo ? (wx >= M.world.XF ? M.world.xo(wx) : 999) : wx) < 330;")
rep("x = 360 + r() * 92, z = W0.southY(406) + 4 + r() * 30", "x = (W0.DXC || 0) + 360 + r() * 92, z = W0.southY((W0.DXC || 0) + 406) + 4 + r() * 30")
rep("const tx = 175 + Math.floor(r() * 55) + (r() < .4 ? 135 : 0)", "const tx = 175 + Math.floor(r() * 55) + (r() < .4 ? 135 : 0) + ((M.world && M.world.DXC) || 0) / TS")
rep("const x = 352 + r() * 110, z = 90 + r() * 80", "const x = ((M.world && M.world.DXC) || 0) + 352 + r() * 110, z = 90 + r() * 80")
rep("cx = 560 + Math.sin(time * .05) * 28, cz = 140", "cx = (M.world && M.world.WALL ? M.world.WALL.x + 4 : 560) + Math.sin(time * .05) * 28, cz = 140")

# baracche e palazzi a gradoni
rep("      if (Kit.ready && !b.deco && !b.church && !b.lighthouse && !b.kiosk) { buildModular(b, i, base, low, plinth); return; }",
    "      if (b.shack) { buildShack(b, i, base, low); return; }   // [isola31]\n      if (Kit.ready && !b.deco && !b.church && !b.lighthouse && !b.kiosk) { buildModular(b, i, base, low, plinth); return; }")
rep("  function buildModular(b, i, base, low, plinth) {\n", """  function buildModular(b, i, base, low, plinth) {
    if (b.tiers && !b.__tierOf && !b.__tierBase) {   // [isola31] il corpo pieno fino al primo gradone, poi i volumi sopra (con il terrazzo davanti)
      const t0 = b.tiers[0], bb = Object.create(b); bb.fl = t0.f0; bb.__tierBase = true; buildModular(bb, i, base, low, plinth);
      let yTop = base + MG + (t0.f0 - 1) * MF;
      b.tiers.forEach((t, k) => { const tb = Object.create(b); Object.assign(tb, { x: t.x, y: t.y, w: t.w, h: t.h, fl: t.fl, door: null, sign: null, shop: false, __tierOf: b, __tierK: k, __prop: null });
        buildModular(tb, i, yTop, yTop, 0); if (!t.room) yTop = yTop + MG + (t.fl - 1) * MF; });
      return;
    }
""")
rep("const roofKind = kind === 'port' ? 'tin'", "const roofKind = b.__tierBase ? 'flat' : b.__tierOf ? pick(r, ['flat', 'flat', 'tin']) : kind === 'port' ? 'tin'")
rep("const kind = modKind(b), P = PALS[kind], pal = P[(i * 7 + (b.style || 0)) % P.length];", "const kind = modKind(b), P = PALS[kind], pal = P[(i * 7 + (b.style || 0) + (b.__tierOf ? 3 + b.__tierK * 5 : 0)) % P.length];")
rep("    rec.geo = { x0, z0, w, d, y0: base, H: hgt }; DZ.bRec[i] = rec;", "    rec.geo = { x0, z0, w, d, y0: base, H: hgt }; if (!b.__tierOf) DZ.bRec[i] = rec; rec.tier = !!b.__tierOf;")
rep("  function modKind(b) {\n", "  function modKind(b) {\n    if (b.gov) return 'civic';   // [isola31]\n")
rep("kind === 'civic' ? 'wall-window-round-detailed' : kind === 'mil'", "kind === 'civic' ? (b.gov ? 'wall-window-wide-square' : 'wall-window-round-detailed') : kind === 'mil'")
rep("""    if (plinth > 0) { const pl = box(w + .2, plinth + .1, d + .2, std({ map: stoneTexture() })); pl.position.set(cx, low + plinth / 2, cz); grp.add(pl); }
    shadowed(grp);
    const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);""",
"""    if (b.gov) govCrown(grp, b, base, top, x0, z0, w, d); else if (roofKind === 'flat' && fl >= 4 && !b.__tierBase && r() < .22) roofBillboard(grp, i, top + .1, x0, z0, w, d, r);   // [isola31]
    if (plinth > 0) { const pl = box(w + .2, plinth + .1, d + .2, std({ map: stoneTexture() })); pl.position.set(cx, low + plinth / 2, cz); grp.add(pl); }
    shadowed(grp);
    const merged = mergeGroup(grp); shadowed(merged); scene.add(merged);""")
# sul terrazzo del gradone non si costruisce altro (c'è il volume sopra); sulle baracche niente scale antincendio e insegne da palazzo
rep("      if (rec.flat && fl >= 2 && w >= 6 && d >= 6) {", "      if (rec.flat && fl >= 2 && w >= 6 && d >= 6 && !b.__tierBase) {")
rep("m = rec.flat ? 1 + Math.floor(r() * 3) : 0", "m = rec.flat && !b.__tierBase ? 1 + Math.floor(r() * 3) : 0")
rep("const b = rec.b; if (!rec.flat || !b || rec.roofDone) return;", "const b = rec.b; if (!rec.flat || !b || rec.roofDone || b.__tierBase) return;")
rep("dyn.buildings.forEach((rec, bi) => {", "dyn.buildings.forEach((rec, bi) => { if (rec.shack) return;", 6)

# strade: arredo e opere, pittura dei tagli e dei muri, buche
rep("TT('props', buildPropsIsland);", "TT('props', buildPropsIsland); TT('strade31', buildStrade31);")
rep("    paintTiles(x, tx0, ty0, n, m); smoothRoads(x, tx0, ty0, n, m);", "    paintTiles(x, tx0, ty0, n, m); paintOpere(x, tx0, ty0, n, m); smoothRoads(x, tx0, ty0, n, m);")
rep("if (th(tx, ty, 77) < .025) {", "if (th(tx, ty, 77) < .055) {")
rep("    pass(asph, rd => rd.w + 1.2, () => 'rgba(150,140,124,.9)');",
    "    pass(rd => asph(rd) && (rd.kind === 'citta' || rd.kind === 'litoranea'), rd => rd.w + 6.4, () => '#58565c');   // [isola31] la fascia del marciapiede segue la curva: niente scalini\n    pass(asph, rd => rd.w + 1.2, () => 'rgba(150,140,124,.9)');")
# marciapiedi rialzati: lungo le strade storte la maschera è la striscia vera (distanza dalla mezzeria), non le caselle
rep("""    if (!any) return 0;
""", """    if (!any) return 0;
    { const DM = new Float32Array(NW * NH).fill(1e9), HW = new Float32Array(NW * NH);   // [isola31]
      (M.roads || []).forEach(rd => { if (rd.rect || !rd.pts || !(rd.kind === 'citta' || rd.kind === 'litoranea')) return; const h2 = rd.w / 2 + 3.4;
        for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, az] = rd.pts[k], [bx, bz] = rd.pts[k + 1], L2 = (bx - ax) * (bx - ax) + (bz - az) * (bz - az) || 1;
          for (let j = Math.max(0, Math.floor((Math.min(az, bz) - h2) / R)); j <= Math.min(NH - 1, Math.ceil((Math.max(az, bz) + h2) / R)); j++) for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - h2) / R)); i <= Math.min(NW - 1, Math.ceil((Math.max(ax, bx) + h2) / R)); i++) {
            const x = i * R, z = j * R, t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L2)), d = Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t), kk = j * NW + i;
            if (d < DM[kk]) { DM[kk] = d; HW[kk] = rd.w / 2; } } } });
      for (let kk = 0; kk < DM.length; kk++) { if (DM[kk] > 1e8) continue; const x = (kk % NW) * R, z = Math.floor(kk / NW) * R, tx = Math.floor(x / TS), tz = Math.floor(z / TS);
        if (zoneT(tx, tz) !== ZN.CITTA) continue; const d = DM[kk], h0 = HW[kk]; m[kk] = d > h0 + .05 && d < h0 + 2 ? 1 : d < h0 + 3.4 ? 0 : m[kk]; } }
""")
# vegetazione: sottobosco e chiome; il bosco ha anche i faggi
rep("""      else if (v === T.ROCK) { if (r() < .14) put(L.rock, cx, groundH(cx, cz) - .2, cz, .6 + r() * 1.4, .4 + r() * 1, .6 + r() * 1.2, r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a'])); }""",
"""      else if (v === T.ROCK) { if (r() < .14) put(L.rock, cx, groundH(cx, cz) - .2, cz, .6 + r() * 1.4, .4 + r() * 1, .6 + r() * 1.2, r() * 6, pick(r, ['#7e8088', '#8a8c94', '#70727a'])); }
      veg31(v, z, tx, ty, r, put, L0, LT);   // [isola31]""")
rep("q < .62 ? 'abete' : q < .86 ? 'betulla' : q < .95 ? 'pino' : 'secco'", "q < .44 ? 'abete' : q < .58 ? 'betulla' : q < .7 ? 'pino' : q < .93 ? 'faggio' : 'secco'")
# stazioni di estrazione: il corpo di mattoni con le ciminiere accanto alla torre di trivella
rep("      fireBarrel(ox - 3, oz - 8, r);\n    });", "      fireBarrel(ox - 3, oz - 8, r);\n      stazione31(q, k, r);   // [isola31]\n    });")
open(p, 'w', encoding='utf-8').write(s); print('ok')
