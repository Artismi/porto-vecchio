# Applica a render.js le modifiche [inverno]. Uso: python3 inverno_render.py path/render.js
import sys
p = sys.argv[1]; s = open(p).read()
def R(a, b):
    global s
    assert a in s, 'NON TROVATO: ' + a[:90]
    s = s.replace(a, b, 1)
def scoped(start_marker, end_marker, a, b):
    global s
    i = s.index(start_marker); j = s.index(end_marker, i)
    seg = s[i:j]; assert a in seg, 'NON TROVATO (scoped): ' + a[:90]
    s = s[:i] + seg.replace(a, b, 1) + s[j:]
def scoped_line(start_marker, end_marker, line_start, new_line):
    global s
    i = s.index(start_marker); j = s.index(end_marker, i)
    seg = s[i:j]; k = seg.index(line_start); e = seg.index('\n', k)
    s = s[:i] + seg[:k] + new_line + seg[e:] + s[j:]

# 1. cielo
R("vec3 dayTop = vec3(.28,.52,.86), dayHor = vec3(.78,.88,.96);", "vec3 dayTop = vec3(.56,.60,.66), dayHor = vec3(.80,.81,.82);")
R("vec3 duTop = vec3(.16,.10,.36), duMid = vec3(.78,.28,.52), duHor = vec3(1.,.62,.32);", "vec3 duTop = vec3(.22,.22,.30), duMid = vec3(.52,.44,.48), duHor = vec3(.78,.62,.50);")
R("vec3 niTop = vec3(.02,.02,.08), niHor = vec3(.16,.07,.26);", "vec3 niTop = vec3(.02,.03,.05), niHor = vec3(.10,.11,.14);")
R("""          c = mix(c, mix(vec3(1.,.86,.42), vec3(1.,.4,.5), smoothstep(-.01,.03,sun.y-vD.y+.01)), disc*clamp(stripes,0.,1.)*(1.-night*.8)*max(dusk, 1.-night));
          c += vec3(1.,.5,.35)*pow(max(0.,sd),24.)*.5*dusk;""",
"""          // [inverno] il sole è un disco pallido dietro la nebbia, senza bande
          float pale = smoothstep(.9965,.9985,sd);
          c = mix(c, vec3(.97,.95,.90), pale*.75*(1.-night));
          c += vec3(.9,.86,.8)*pow(max(0.,sd),18.)*.22*(1.-night);""")
R("c += st*vec3(.9,.85,1.);", "c += st*vec3(.9,.85,1.)*.25;")
# 2. orizzonte
R("const day = new THREE.Color(.78, .88, .96), du = new THREE.Color(.86, .45, .45), ni = new THREE.Color(.14, .07, .24);", "const day = new THREE.Color(.76, .77, .79), du = new THREE.Color(.56, .50, .52), ni = new THREE.Color(.09, .10, .13);")
# 3. luci
R("""    hemi.intensity = .5 + (1 - night) * .6; hemi.color.set(night > .5 ? '#6a5ab8' : dusk > .3 ? '#d8a0c0' : '#b8c4e0'); hemi.groundColor.set(night > .5 ? '#2a1236' : '#4a3040');
    fillAmb.intensity = .32 + (1 - night) * .2; fillAmb.color.set(night > .5 ? '#3a2a58' : '#4a3a50');
    moon.intensity = .7 + (1 - night) * .45; moon.color.set(night > .5 ? '#8fa2ff' : (dusk > .3 ? '#ff8a6a' : '#fff0d8'));""",
"""    // [inverno] luce di neve: tanto cielo, poco sole
    hemi.intensity = .55 + (1 - night) * .75; hemi.color.set(night > .5 ? '#4a5878' : dusk > .3 ? '#b8a8b0' : '#d4dae4'); hemi.groundColor.set(night > .5 ? '#1a1e2a' : '#8a8e98');
    fillAmb.intensity = .3 + (1 - night) * .25; fillAmb.color.set(night > .5 ? '#2a3044' : '#6a6e78');
    moon.intensity = .35 + (1 - night) * .4; moon.color.set(night > .5 ? '#7e8eb8' : (dusk > .3 ? '#e0a888' : '#f2eee4'));""")
# 4. grading
R("""          // grading da Vice City: ombre viola e blu, luci calde rosa e arancio
          c = mix(c, c*.72 + vec3(.20,.08,.34)*.38, (1.-smoothstep(.0,.45,l))*.62);
          c += mix(vec3(.07,.03,-.02), vec3(.09,.02,.05), dusk)*smoothstep(.45,1.,l);
          c = mix(vec3(l), c, 1.24*sat);
          c = (c-.5)*1.1+.5;""",
"""          // [inverno] ombre blu-grigie, mezzitoni spenti; la saturazione resta alle sorgenti di luce
          float chroma = max(max(c.r,c.g),c.b) - min(min(c.r,c.g),c.b);
          float hot = smoothstep(.5,.9,chroma*max(max(c.r,c.g),c.b)*2.);
          c = mix(c, c*.78 + vec3(.06,.09,.14)*.4, (1.-smoothstep(.0,.5,l))*.7);
          c = mix(vec3(l), c, mix(.55, 1.15, hot)*sat);
          c += vec3(.012,.014,.02);
          c = (c-.5)*1.06+.5;""")
# 5. neve che cade
R("""    const rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#8ea0d8', transparent: true, opacity: .45 }));""",
"""    const rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#f4f6fa', size: .16, transparent: true, opacity: .85, depthWrite: false }));""")
R("""    const raining = isRaining(st.t);
    const R = dyn.rain; R.m.visible = raining;
    if (raining) { for (let i = 0; i < R.N; i++) { const s = R.seeds[i]; const y = cam.h + 18 - ((time * 22 + s[2] * 18) % 18); const x = cam.x + (s[0] - .5) * 60, z = cam.y + (s[1] - .5) * 60; R.pos.set([x, y, z, x - .08, y - .7, z + .05], i * 6); } R.m.geometry.attributes.position.needsUpdate = true; }""",
"""    // [inverno] neve: fiocchi che scendono piano e ondeggiano; durante la bufera il doppio, più veloci e storti
    const raining = isRaining(st.t);
    const R = dyn.rain; R.m.visible = !p.indoor; const heavy = raining ? 1 : 0, nOn = raining ? R.N : Math.floor(R.N * .45), span = 70 + (ui.zoom || 1) * 20;
    for (let i = 0; i < R.N; i++) { const s = R.seeds[i]; if (i >= nOn) { R.pos.set([0, -50, 0, 0, -50, 0], i * 6); continue; } const sp = 1.4 + s[2] * .8 + heavy * 2.5, y = cam.h + 22 - ((time * sp + s[2] * 22) % 22); const sw = Math.sin(time * (.8 + s[0]) + i) * .8 + heavy * (22 - (y - cam.h)) * .6; const x = cam.x + (s[0] - .5) * span + sw, z = cam.y + (s[1] - .5) * span; R.pos.set([x, y, z, x, y, z], i * 6); }
    R.m.geometry.attributes.position.needsUpdate = true; R.m.material.size = .14 + heavy * .06;""")
R("const N = 900, pos = new Float32Array(N * 6);", "const N = 2200, pos = new Float32Array(N * 6);")
R("Mo.m.geometry.attributes.position.needsUpdate = true; Mo.m.material.opacity = .15 + night * .5;", "Mo.m.geometry.attributes.position.needsUpdate = true; Mo.m.material.opacity = (.15 + night * .5) * .35;")
# 6. nebbia
R("scene.fog.near = lerp(walkDist + 30, 70, ease); scene.fog.far = lerp(walkDist + 140, 200, ease);", "scene.fog.near = lerp(walkDist + 12, 40, ease); scene.fog.far = lerp(walkDist + 120, 160, ease);")
# 7. blocchi caricati più lontano + neve sul terreno
R("if (d < 95) { if ((!ch || ch.rev !== ISO.rev) && d < bd) { bd = d; best = [ci, cj, key]; } }\n      else if (ch && d > 150) { dropChunk(ch); ISO.chunks.delete(key); }",
  "if (d < 135) { if ((!ch || ch.rev !== ISO.rev) && d < bd) { bd = d; best = [ci, cj, key]; } }\n      else if (ch && d > 190) { dropChunk(ch); ISO.chunks.delete(key); }")
R("paintTiles(x, tx0, ty0, n, m); smoothRoads(x, tx0, ty0, n, m); roadMarks(x, tx0, ty0, n, m);", "paintTiles(x, tx0, ty0, n, m); smoothRoads(x, tx0, ty0, n, m); roadMarks(x, tx0, ty0, n, m); snowPass(x, tx0, ty0, n, m);")
anchor = "  // segnaletica orizzontale: linee e tratteggi lungo le strade asfaltate"
R(anchor, open(sys.argv[0].replace('inverno_render.py', 'snowpass.js')).read() + anchor)
# 8. isola a bassa risoluzione: innevata
R("for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty), o = (ty * G.GW + tx) * 4, cc = COL[v] || [40, 60, 80]; img.data[o] = cc[0]; img.data[o + 1] = cc[1]; img.data[o + 2] = cc[2]; img.data[o + 3] = 255; }",
  "for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty), o = (ty * G.GW + tx) * 4, c0 = COL[v] || [40, 60, 80], dd = M.world && M.world.districtAt ? M.world.districtAt(tx * TS) : '', urb = v === T.VIA || v === T.COB || v === T.WALK || v === T.PIAZZA || v === T.QUAY, k = v === T.WATER || v === T.BLD || dd === 'prateria' ? 0 : v === T.VIA ? .3 : urb ? .5 : .8, sn = urb ? [160, 164, 170] : [214, 218, 224], cc = (dd === 'prateria' && !urb ? [128, 114, 80] : c0).map((q, i) => q + (sn[i] - q) * k); img.data[o] = cc[0]; img.data[o + 1] = cc[1]; img.data[o + 2] = cc[2]; img.data[o + 3] = 255; }  // [inverno] neve")
# 9. vegetazione d'inverno (solo dentro buildVeg)
BV0, BV1 = "  function buildVeg(tx0, ty0, n, m) {", "  // ---- blocchi di terreno ----"
i = s.index("    const tree = (x, z, kind, r) => {", s.index(BV0)); j = s.index("    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {", i)
s = s[:i] + open(sys.argv[0].replace('inverno_render.py', 'alberi.js')).read() + s[j:]
scoped(BV0, BV1, "const K = vegKit(), T = G.T, L = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [] };", "const K = vegKit(), T = G.T, L = { trunk: [], leaf: [], cone: [], rock: [], cactus: [], vine: [], bark: [] };")
scoped(BV0, BV1, "if (v === T.TREE) tree(cx, cz, z === ZN.MACCHIA ? (q => q < .5 ? 'leccio' : q < .82 ? 'corbezzolo' : q < .93 ? 'quercia' : 'pino')(r()) : z === ZN.MONTE ? (r() < .7 ? 'pino' : 'leccio') : z === ZN.CITTA ? 'quercia' : (r() < .5 ? 'quercia' : 'olivo'), r);",
  "if (v === T.TREE) tree(cx, cz, z === ZN.MACCHIA ? (q => q < .62 ? 'abete' : q < .86 ? 'betulla' : q < .95 ? 'pino' : 'secco')(r()) : z === ZN.MONTE ? (q => q < .55 ? 'pino' : q < .85 ? 'abete' : 'betulla')(r()) : z === ZN.CITTA ? (r() < .6 ? 'tiglio' : 'betulla') : (r() < .5 ? 'betulla' : 'secco'), r);")
scoped_line(BV0, BV1, "      else if (v === T.SHRUB) {", "      else if (v === T.SHRUB) { const k = r() < .5 ? 1 : 0; for (let q = 0; q < k; q++) { const x = tx * TS + r() * 2, zz = ty * TS + r() * 2, ss = .5 + r() * .6; put(L.leaf, x, groundH(x, zz) + ss * .3, zz, ss * 1.1, ss * .7, ss * 1.1, r() * 6, pick(r, ['#3a4434', '#2e3a2c', '#4a4a3e'])); if (z !== ZN.DESERTO) put(L.leaf, x, groundH(x, zz) + ss * .62, zz, ss, ss * .38, ss, r() * 6, SNOW); } }")
# il blocco FIELD occupa 5 righe: lo sostituisco fino all'inizio della riga GRASS
i = s.index(BV0); fi = s.index("      else if (v === T.FIELD) {", i); gi = s.index("      else if (v === T.GRASS)", fi)
s = s[:fi] + "      else if (v === T.FIELD) { if (tx % 2 === 0 && ty % 3 === 0 && r() < .5) put(L.vine, cx, groundH(cx, cz), cz, .08, .9, .08, 0, '#6a5a48'); }   // paletti degli orti sotto la neve\n" + s[gi:]
scoped_line(BV0, BV1, "      else if (v === T.GRASS) {", "      else if (v === T.GRASS) { if (z === ZN.CAMPAGNA && r() < .03) tree(cx, cz, r() < .5 ? 'betulla' : 'abete', r); else if (z === ZN.DESERTO) { if (r() < .012) tree(cx, cz, 'secco', r); else if (r() < .08) put(L.leaf, cx, groundH(cx, cz) + .15, cz, .5, .3, .5, r() * 6, pick(r, ['#8a7a50', '#7a6a44', '#9a8a5a'])); } }")
scoped_line(BV0, BV1, "      else if (v === T.DESERT) {", "      else if (v === T.DESERT) { if (r() < .03) put(L.rock, cx, groundH(cx, cz), cz, .5 + r(), .4 + r() * .6, .5 + r(), r() * 6, null); }")
scoped(BV0, BV1, "else if (v === T.SAND && z === ZN.SPIAGGIA && r() < .006) tree(cx, cz, 'palma', r);", "")
scoped(BV0, BV1, "mkI(L.rock, K.rock, K.rockM, false, true); mkI(L.cactus, K.ball, K.cactusM, false, false); mkI(L.vine, K.box, K.leafM, true, false);", "mkI(L.rock, K.rock, K.rockM, false, true); mkI(L.cactus, K.ball, K.cactusM, false, false); mkI(L.vine, K.box, K.leafM, true, false); mkI(L.bark, K.trunk, K.leafM, true, false);")
R("VEG.rockM = new THREE.MeshStandardMaterial({ color: '#8a8078', roughness: 1, flatShading: true });", "VEG.rockM = new THREE.MeshStandardMaterial({ color: '#9a9ca4', roughness: 1, flatShading: true });")
open(p, 'w').write(s); print('inverno_render: ok')
