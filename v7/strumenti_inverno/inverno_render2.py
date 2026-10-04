# Seconda parte delle modifiche [inverno] a render.js: edifici, acqua, alberi d'arredo, porto. Uso: python3 inverno_render2.py path/render.js
import sys
p = sys.argv[1]; s = open(p).read()
def R(a, b):
    global s
    assert a in s, 'NON TROVATO: ' + a[:90]
    s = s.replace(a, b, 1)
# esposizione: meno cielo sul bianco della neve
R("hemi.intensity = .55 + (1 - night) * .75;", "hemi.intensity = .4 + (1 - night) * .42;")
R("hemi.groundColor.set(night > .5 ? '#1a1e2a' : '#8a8e98');", "hemi.groundColor.set(night > .5 ? '#14161e' : '#4a4e58');")
R("fillAmb.intensity = .3 + (1 - night) * .25;", "fillAmb.intensity = .26 + (1 - night) * .14;")
# acqua: mare d'acciaio, d'inverno
R("vec3 deep = mix(vec3(.05,.32,.42), vec3(.03,.06,.14), night);", "vec3 deep = mix(vec3(.11,.15,.18), vec3(.03,.04,.07), night);")
R("vec3 shal = mix(vec3(.18,.72,.70), vec3(.05,.20,.26), night);", "vec3 shal = mix(vec3(.24,.31,.33), vec3(.06,.10,.13), night);")
R("c = mix(c, c*vec3(1.2,.75,.95)+vec3(.12,.02,.08), dusk*.6);", "c = mix(c, c*vec3(1.08,.95,.95)+vec3(.04,.02,.03), dusk*.4);")
R("c += band*mix(vec3(.25,.38,.42), vec3(.14,.14,.32), night);", "c += band*mix(vec3(.16,.20,.22), vec3(.06,.07,.12), night);")
# facciate: colori sovietici sbiaditi, ancora vivi ma spenti dal freddo
R("""    borgo: [['#e3b170', '#f3ead6'], ['#d98a66', '#f2e6d0'], ['#efd38c', '#fbf3df'], ['#c76a56', '#eedfc8'], ['#d9c3a2', '#fbf6ec'], ['#e3a29a', '#f6eee0'], ['#b9c49a', '#f2ead8'], ['#e8c9a0', '#ffffff'], ['#d4a35e', '#f3e7cf'], ['#a8c4c8', '#f4f0e6']],
    farm: [['#efe6d2', '#c9b89a'], ['#e8d8b8', '#b8a07a'], ['#f2ece0', '#a89478'], ['#dcc8a4', '#f2ead8']],""",
"""    // [inverno] intonaci sovietici scrostati: ocra, pistacchio, salmone, azzurro ghiaccio, cemento
    borgo: [['#b8a27c', '#d8d2c6'], ['#9aaa98', '#d4d0c8'], ['#b8907e', '#d8d0c4'], ['#a8a090', '#cfc8bc'], ['#8e9cac', '#d0ccc4'], ['#c4ae7c', '#e0d8c8'], ['#a08068', '#d2c8b6'], ['#8a968a', '#cac4b8'], ['#9c8aa0', '#d4ccd0'], ['#7e8c90', '#c8c6c0']],
    farm: [['#6e5a48', '#a89478'], ['#7a6450', '#b8a07a'], ['#5e5044', '#9a8a70'], ['#84705a', '#c0b090']],""")
R("const shutM = (kind === 'borgo' || kind === 'farm') && r() < .8 ? sl(pick(r, SHUT)) : null;", "const shutM = null; // [inverno] niente persiane liguri")
# tetti sotto la neve
R("""    const c = mk(64, 64), x = c.getContext('2d'), r = rng(9);
    x.fillStyle = '#343c58'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { x.fillStyle = pick(r, ['#5a6688', '#525d7e', '#617096', '#4b5676', '#6a7699']); x.fillRect(k, y, 5, 3); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(k, y, 5, 1); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(90,120,70,.35)'; x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); }""",
"""    // [inverno] ardesia sotto la neve: si vedono solo le file più scure dove la neve è scivolata
    const c = mk(64, 64), x = c.getContext('2d'), r = rng(9);
    x.fillStyle = '#d8dde4'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { if (r() < .7) continue; x.fillStyle = pick(r, ['#5a6070', '#6a7080', '#7a8090']); x.fillRect(k, y + 2, 5, 1); }
    for (let i = 0; i < 30; i++) { x.fillStyle = pick(r, ['#eef1f5', '#c8ced8']); x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); }""")
R("""    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = '#6a6560'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = '#7a736c'; x2.fillRect(k, 0, 1, 32); } for (let i = 0; i < 30; i++) { x2.fillStyle = 'rgba(160,80,30,.35)'; x2.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 2); }""",
"""    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = '#d0d4da'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = r() < .5 ? '#6a6560' : '#b8bcc4'; x2.fillRect(k, 0, 1, 32); } for (let i = 0; i < 20; i++) { x2.fillStyle = 'rgba(140,70,30,.35)'; x2.fillRect(Math.floor(r() * 32), Math.floor(r() * 32), 2, 2); }""")
R("""    const c3 = mk(32, 32), x3 = c3.getContext('2d'); x3.fillStyle = '#7a3a28'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { x3.fillStyle = pick(r, ['#b8583a', '#c46a44', '#a84e34', '#cc7650']); x3.fillRect(k, y, 3, 4); x3.fillStyle = 'rgba(255,220,180,.2)'; x3.fillRect(k, y, 1, 4); }""",
"""    const c3 = mk(32, 32), x3 = c3.getContext('2d'); x3.fillStyle = '#e2e6ec'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { if (r() < .75) continue; x3.fillStyle = pick(r, ['#8a5a48', '#7a4a3a', '#9a6a56']); x3.fillRect(k, y + 3, 3, 1); }
    for (let i = 0; i < 24; i++) { x3.fillStyle = pick(r, ['#ffffff', '#c6ccd6']); x3.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1); }""")
R("""    x.fillStyle = '#4a4048'; x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = pick(r, ['#6a5a5e', '#625458', '#72626a', '#5a4e54']); x.fillRect(k, y, 7, 7); }""",
"""    x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = pick(r, ['#dce0e6', '#d2d6de', '#e4e8ee', '#c0c4cc']); x.fillRect(k, y, 7, 7); }""")
R("emissive: '#141a30' }); rm.map.needsUpdate = true;", "emissive: '#0c0e14' }); rm.map.needsUpdate = true;")
# alberi d'arredo: al posto delle palme, abeti; al posto dei platani, alberi spogli
i = s.index("  function palmTree(x, y, z, r, hgt) {"); j = s.index("\n  }\n", i) + 4
s = s[:i] + """  function palmTree(x, y, z, r, hgt) { // [inverno] un abete con la neve sui palchi (le chiamate restano quelle delle palme)
    const g = G0(), h = (hgt || 6 + r() * 3) * .8, dark = sl(pick(r, ['#1e3426', '#24402c', '#1a2e22'])), snow = sl('#e6eaf0');
    add(g, cyl(.18, .26, 1.2, 6, sm('#4a3a2c')), 0, .6, 0);
    for (let k = 0; k < 3; k++) { const w = 2.2 * (1 - k * .26), hh = h * .34 * (1 - k * .12), yy = .9 + k * hh * .62; const c = add(g, new THREE.Mesh(new THREE.ConeGeometry(w, hh, 7), dark), 0, yy + hh / 2, 0); const sc = add(g, new THREE.Mesh(new THREE.ConeGeometry(w * .78, hh * .55, 7), snow), 0, yy + hh * .38 + hh * .27, 0); }
    g.position.set(x, y, z); return g;
  }
""" + s[j:]
i = s.index("  function leafyTree(x, z, r, big) {"); j = s.index("\n  }\n", i) + 4
s = s[:i] + """  function leafyTree(x, z, r, big) { // [inverno] tiglio spoglio, rami coperti di neve
    const g = G0(), s = big ? 1.3 : 1, tm = sm('#4a3e36'), snow = sl('#e2e6ec');
    add(g, cyl(.2 * s, .3 * s, 3 * s, 7, tm), 0, 1.5 * s, 0);
    for (let k = 0; k < 5; k++) { const a = k * 1.26 + r(), br = add(g, cyl(.05 * s, .1 * s, 2 * s, 5, tm), Math.cos(a) * .5 * s, 3.4 * s, Math.sin(a) * .5 * s); br.rotation.set(Math.sin(a) * .6, 0, -Math.cos(a) * .6); }
    add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.3 * s, 0), sl('#3a3430')), 0, 4.3 * s, 0).scale.set(1, .6, 1);
    add(g, new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * s, 0), snow), 0, 4.75 * s, 0).scale.set(1, .35, 1);
    add(g, cyl(1.1, 1.1, .3, 10, PM.stone()), 0, .15, 0); add(g, cyl(.95, .95, .31, 10, snow), 0, .16, 0);
    return place(g, x, z, r() * 6);
  }
""" + s[j:]
# porto: barche e casse dove sta il porto vecchio adesso
R("const x = 330 + r() * 140, z = 668 + r() * 70, tx = Math.floor(x / TS)", "const W0 = M.world, x = 360 + r() * 92, z = W0.southY(406) + 4 + r() * 30, tx = Math.floor(x / TS)")
R("for (let k = 0; k < 160; k++) { const tx = 150 + Math.floor(r() * 100), ty = 325 + Math.floor(r() * 40)", "for (let k = 0; k < 260; k++) { const tx = 175 + Math.floor(r() * 55) + (r() < .4 ? 135 : 0), ty = (r() < .5 ? 55 : 80) + Math.floor(r() * 30)")
R("kind === 'farm' ? 'cotto' : pick(r, ['cotto', 'cotto', 'cotto', 'slate', 'flat']);", "kind === 'farm' ? 'cotto' : pick(r, ['flat', 'flat', 'flat', 'flat', 'slate', 'cotto']);   // [inverno] tetti piatti quasi ovunque")
open(p, 'w').write(s); print('inverno_render2: ok')
