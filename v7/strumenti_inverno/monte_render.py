"""[monte] Il Monte Scuro nel render: alberi e rocce del kit Natura, pareti, ghiaia, terrazze, lago in quota,
posti nuovi (croce, neviera, cascata, ponte rotto, eremo), il Ponte del Diavolo, sotto terra, camera che gira e sale.
Si applica DOPO gli script inverno (inverno_render.py ... inverno_render7) a v7/src/render.js.
Uso: python3 monte_render.py v7/src/render.js"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read(); here = __file__.rsplit('/', 1)[0] if '/' in __file__ else '.'
if '[monte] IL BOSCO VERO' in s: print('monte_render: già applicato'); sys.exit(0)
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, 'manca o doppio (%d): %s' % (s.count(a), a[:100])
    s = s.replace(a, b)
frag = lambda f: open(here + '/' + f, encoding='utf-8').read()

# 1) i frammenti: bosco vero e sottosuolo, prima di buildVeg
rep("  const vM4 = new THREE.Matrix4(), vQ = new THREE.Quaternion(), vE = new THREE.Euler(), vV = new THREE.Vector3(), vS = new THREE.Vector3(), vC = new THREE.Color();\n  function buildVeg(",
    frag('natura_kit.js') + frag('sottosuolo_render.js') + "  const vM4 = new THREE.Matrix4(), vQ = new THREE.Quaternion(), vE = new THREE.Euler(), vV = new THREE.Vector3(), vS = new THREE.Vector3(), vC = new THREE.Color();\n  const LOWQ = { on: false };\n  function buildVeg(")

# 2) buildVeg: gli alberi semplici delle caselle TREE in un gruppo a parte (si vedono solo lontano)
rep("    const K = vegKit(), T = G.T, L = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] };",
    "    const K = vegKit(), T = G.T, L0 = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] }, LT = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [], fir: [], tuft: [] };\n    let L = L0;")
a = s.index("      if (v === T.TREE) tree(cx, cz, z === ZN.MACCHIA ?"); b = s.index("\n", a); line = s[a:b]
assert line.endswith(", r);"), line[-40:]
s = s[:a] + "      if (v === T.TREE) { L = LT; " + line[len("      if (v === T.TREE) "):] + " L = L0; }" + s[b:]
rep("if (z === ZN.CAMPAGNA && r() < .03) tree(cx, cz, r() < .5 ? 'betulla' : 'abete', r); else if", "if (false) { } else if")
rep("if (r() < .012) tree(cx, cz, 'secco', r); else {", "{")
rep("    const grp = new THREE.Group();\n    const mkI = (arr, geo, mat, colored, shadow) => {", "    let grp = new THREE.Group(); const grpMain = grp;\n    const mkI = (arr, geo, mat, colored, shadow) => {")
rep("""    mkI(L.rock, K.rockG, K.vegM, true, true); mkI(L.cactus, K.ball, K.cactusM, false, false); mkI(L.vine, K.box, K.leafM, true, false); mkI(L.bark, K.trunk, K.barkM, false, false);
    return grp;""", """    mkI(L.rock, K.rockG, K.vegM, true, true); mkI(L.cactus, K.ball, K.cactusM, false, false); mkI(L.vine, K.box, K.leafM, true, false); mkI(L.bark, K.trunk, K.barkM, false, false);
    // [monte] gli alberi semplici: si vedono quando il bosco vero (buildNat) non c'è
    grp = new THREE.Group(); grp.name = 'loTrees';
    mkI(LT.trunk, K.trunk, K.trunkM, true, true); mkI(LT.leaf, K.blob, K.vegM, true, true); mkI(LT.fir, K.fir, K.vegM, true, true); mkI(LT.bark, K.trunk, K.barkM, false, false);
    grpMain.add(grp); grp = grpMain;
    return grp;""")

# 2b) erbacce e cespugli semplici: solo da lontano (vicino c'è il sottobosco vero); in prateria restano sempre
rep("    const tuft = (x, z, cols, sc, r) => put(L.tuft, x,", "    const tuft = (x, z, cols, sc, r) => put((zoneT(Math.floor(x / TS), Math.floor(z / TS)) === ZN.DESERTO ? L0 : LT).tuft, x,")
rep("ss = .5 + r() * .6; put(L.leaf, x, groundH(x, zz) + ss * .3, zz,", "ss = .5 + r() * .6; put(LT.leaf, x, groundH(x, zz) + ss * .3, zz,")
rep("mkI(LT.trunk, K.trunk, K.trunkM, true, true); mkI(LT.leaf, K.blob, K.vegM, true, true); mkI(LT.fir, K.fir, K.vegM, true, true); mkI(LT.bark, K.trunk, K.barkM, false, false);",
    "mkI(LT.trunk, K.trunk, K.trunkM, true, true); mkI(LT.leaf, K.blob, K.vegM, true, true); mkI(LT.fir, K.fir, K.vegM, true, true); mkI(LT.bark, K.trunk, K.barkM, false, false); mkI(LT.tuft, K.tuft, K.vegM, true, false);")

# 3) blocchi: bosco vero vicino alla camera, alberi semplici lontano
rep("    const veg = buildVeg(tx0, ty0, n, m); grp.add(veg);", "    const veg = buildVeg(tx0, ty0, n, m); grp.add(veg);\n    const nat = buildNat(tx0, ty0, n, m); grp.add(nat); const lt = veg.getObjectByName('loTrees');")
rep("    return { grp, geo, mat, tex, veg, rev: ISO.rev };", "    return { grp, geo, mat, tex, veg, nat, lt, rev: ISO.rev };")
rep("    ch.veg.children.forEach(im => { im.geometry.dispose(); if (im.dispose) im.dispose(); });",
    "    ch.veg.traverse(im => { if (im.isMesh) { im.geometry.dispose(); if (im.dispose) im.dispose(); } });\n    if (ch.nat) ch.nat.children.forEach(im => { im.geometry.dispose(); if (im.dispose) im.dispose(); });")
rep("      if (d < 135) { if ((!ch || ch.rev !== ISO.rev) && d < bd) { bd = d; best = [ci, cj, key]; } }",
    "      if (ch && ch.nat) { const hi = ch.nat.children.length > 0 && d < (LOWQ.on ? 34 : 58); ch.nat.visible = hi; if (ch.lt) ch.lt.visible = !hi; }   // [monte] bosco vero vicino\n      if (d < 135) { if ((!ch || ch.rev !== ISO.rev) && d < bd) { bd = d; best = [ci, cj, key]; } }")
rep("  function lowQuality() { if (TARGET < 420) return; TARGET = 330;", "  function lowQuality() { if (TARGET < 420) return; TARGET = 330; LOWQ.on = true;")

# 4) pittura del terreno: pareti, ghiaia, calanchi
rep("      } else if (v === T.ROCK) {\n        x.fillStyle = '#7a7270';", """      } else if (v === T.CLIFF) {   // [monte] parete di roccia: strati, crepe
        x.fillStyle = '#4e4846'; x.fillRect(px, py, P, P); for (let k = 0; k < P; k += 3) { x.fillStyle = pick(r, ['#5e5854', '#46403e', '#686260', '#3a3634']); x.fillRect(px, py + k, P, 2); }
        dots(px, py, 18, ['#7a746e', '#2e2a28', '#6a7458'], r, 2); x.fillStyle = 'rgba(20,18,18,.5)'; x.fillRect(px + Math.floor(r() * P), py, 1, P);
      } else if (v === T.GRAVEL) {   // [monte] ghiaia bianca della fiumara e del fondo della gola
        x.fillStyle = '#b8b2a6'; x.fillRect(px, py, P, P); dots(px, py, 60, ['#e0dad0', '#c8c2b6', '#a49e94', '#d4cec2', '#8e887e', '#f0ece4'], r, 2);
        if (M.world && M.world.monte) { const wx2 = tx * TS + 1, wy2 = ty * TS + 1, k2 = Math.sin(wx2 * .7 + Math.sin(wy2 * .23) * 3); if (Math.abs(k2) < .25) { x.fillStyle = 'rgba(190,220,236,.75)'; x.fillRect(px, py + 5, P, 5); } }
      } else if (v === T.DIRT && M.world && M.world.feat && (M.world.feat[ii] & 2) && !(RW[ii] > 0)) {   // [monte] calanchi: argilla grigia a solchi
        x.fillStyle = '#8a8680'; x.fillRect(px, py, P, P); for (let k = 1; k < P; k += 3) { x.fillStyle = pick(r, ['#76726c', '#9a968e', '#6a6660']); x.fillRect(px + k, py, 1, P); } dots(px, py, 14, ['#a8a49c', '#5e5a54'], r);
      } else if (v === T.ROCK) {
        x.fillStyle = '#7a7270';""")
# neve: poca sulle pareti, a chiazze sulla ghiaia e sui calanchi
rep("      const paved = v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY || v === T.STAIRS || v === T.PIER, natural = !road && !paved && v !== T.BLD && v !== T.WATER && v !== T.FOUNT;",
    "      const cal = v === T.DIRT && M.world && M.world.feat && (M.world.feat[ty * G.GW + tx] & 2) && !road;\n      const paved = v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY || v === T.STAIRS || v === T.PIER, natural = !road && !paved && v !== T.BLD && v !== T.WATER && v !== T.FOUNT && v !== T.CLIFF && v !== T.GRAVEL && !cal;")
rep("      if (v === T.WATER || v === T.FOUNT) a = 0;", "      if (v === T.WATER || v === T.FOUNT) a = 0;\n      else if (v === T.CLIFF) { a = .2; col = '#c6cad0'; }\n      else if (v === T.GRAVEL) { a = .4; col = '#dde2e8'; }\n      else if (cal) { a = .34; col = '#c8ccd2'; }")

# 5) il lago in quota: la riva scende al fondo del lago, non al mare
rep("        if (!hard && ci2 < 4) { const land = Math.max(.4, h > -1 ? h : .4), k = Math.max(0, Math.min(1, (ci2 + 1.2) / 5.2)); h = -1.6 + (land + 1.6) * k * k * (3 - 2 * k); } }",
    "        const LK = M.world && M.world.LAKE, lk = LK && Math.hypot((tx * TS - LK.x) / LK.rx, (ty * TS - LK.y) / LK.ry) < 1.6, b0 = lk ? LK.h - 1.9 : -1.6;   // [monte] il lago è sull'altopiano\n        if (!hard && ci2 < 4) { const land = Math.max(lk ? LK.h + .25 : .4, h > b0 + .6 ? h : .4), k = Math.max(0, Math.min(1, (ci2 + 1.2) / 5.2)); h = b0 + (land - b0) * k * k * (3 - 2 * k); } }")

# 6) i posti nuovi e il Ponte del Diavolo
rep("      else if (q.camp === 'monolite') {", frag('monte_luoghi.js') + "      else if (q.camp === 'monolite') {")
rep("    // ---- fuochi nei barili: dove la gente aspetta, lavora, si scalda ----", "    buildBridges();   // [monte]\n    // ---- fuochi nei barili: dove la gente aspetta, lavora, si scalda ----")

# 7) niente alberi finti sui marciapiedi (ogni albero è una casella che si abbatte)
rep("if (free(px, pz)) addStatic(palmTree(px, groundH(px, pz), pz, r)); }", "}")

# 8) il giocatore sul ponte e sotto terra; la camera lo segue
rep("    playerH = groundH(p.x, p.y);", "    { const lh = typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; playerH = lh !== null ? lh : groundH(p.x, p.y); }   // [monte]")
rep("    cam.h += (groundH(ui.intro ? tx : p.x, ui.intro ? ty : p.y) - cam.h) * Math.min(1, dt * 4);",
    "    { const lh = !ui.intro && typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; cam.h += ((lh !== null ? lh : groundH(ui.intro ? tx : p.x, ui.intro ? ty : p.y)) - cam.h) * Math.min(1, dt * 4); }")
rep("    const indoorNow = indoorPass(st); if (indoorNow) { scene.fog.near = 200; scene.fog.far = 400; }",
    "    const indoorNow = indoorPass(st); if (indoorNow) { scene.fog.near = 200; scene.fog.far = 400; }\n    if (typeof Livelli !== 'undefined' && st.lv) { surfacePortals(st); if (!indoorNow && ugPass(st)) { scene.fog.near = dist - 2; scene.fog.far = dist + 22; scene.fog.color.set('#060505'); scene.background.set('#060505'); } }   // [monte]")

# 9) camera: gira coi tasti , e . (o tenendo premuta la rotella) e sale sopra la montagna quando ti copre
rep("    cam.uy = cam.uy || 0; if (ui.edge && !pveh) cam.uy -= ui.edge * dt * 1.4;",
    "    cam.uy = cam.uy || 0; if (ui.edge && !pveh) cam.uy -= ui.edge * dt * 1.4;\n    if (ui.rot && !pveh) cam.uy += ui.rot * dt * 1.7; if (ui.drag && !pveh) cam.uy += ui.drag;   // [monte] la visuale gira")
rep("    const pitch = lerp(PITCH, onVespa ? .78 : .82, ease);",
    """    let pitch = lerp(PITCH, onVespa ? .78 : .82, ease);
    // [monte] quando la montagna copre il giocatore la visuale sale sopra (e torna giù quando non serve); O: visuale dall'alto
    if (!pveh && !ui.intro) {
      const ph0 = (p.lv && typeof Livelli !== 'undefined' ? Livelli.heightOf(st, p) : null), py0 = (ph0 !== null ? ph0 : groundH(p.x, p.y)) + 1.5, ux = Math.sin(cam.yaw), uz = Math.cos(cam.yaw);
      let cover = false; if (!(p.lv && p.lv.k === 'ug')) for (let s2 = 2; s2 < 40 && !cover; s2 += 1.5) { const qx = p.x + ux * Math.cos(pitch) * s2, qz = p.y + uz * Math.cos(pitch) * s2, qy = py0 + Math.sin(pitch) * s2; if (groundH(qx, qz) > qy - .2) cover = true; }
      cam.lift = (cam.lift || 0) + (((cover || ui.top) ? 1 : 0) - (cam.lift || 0)) * Math.min(1, dt * (cover ? 1.2 : .8));
      pitch = lerp(pitch, 1.15, cam.lift);
    }""")
rep("    camera.position.set(cx + ox, cy + oy, cz + oz); camera.lookAt(cx, cy, cz);", "    camera.position.set(cx + ox, cy + oy, cz + oz); camera.lookAt(cx, cy, cz);\n    { const lh = typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : null; NATU.pl.value.set(p.x, (lh !== null ? lh : groundH(p.x, p.y)) + .2, p.y); NATU.cm.value.copy(camera.position); }   // [monte] varco nelle chiome")
open(p, 'w', encoding='utf-8').write(s); print('monte_render: ok')
