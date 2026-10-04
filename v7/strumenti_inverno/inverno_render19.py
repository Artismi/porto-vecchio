# [inverno 19] Via la neve. Un interruttore solo: const NEVE (in cima a render.js). false = niente neve a terra, sui tetti,
# contro i muri, sugli alberi, sui bidoni e niente fiocchi che cadono. true = come prima. Resta l'inverno: terra fradicia, erba secca, freddo.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[inverno19]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)
rep("  const pick = (r, a) => a[Math.floor(r() * a.length)];",
    "  const pick = (r, a) => a[Math.floor(r() * a.length)];\n  const NEVE = false;   // [inverno19] la neve: true la rimette dappertutto\n  const NOSNOW = new THREE.MeshBasicMaterial({ visible: false });")
# terreno: niente velo di neve, niente bianco vergine, niente impronte e solchi nella neve
rep("      const c = hex(col); img.data[o] = c[0];", "      if (!NEVE) a = 0;   // [inverno19]\n      const c = hex(col); img.data[o] = c[0];")
rep("const virgin = natural && !nearRoad", "const virgin = NEVE && natural && !nearRoad")
rep("if (q.paved || r() < .4) for (let k = 0; k < (q.paved ? 4 : 2); k++)", "if (NEVE && (q.paved || r() < .4)) for (let k = 0; k < (q.paved ? 4 : 2); k++)")
rep("    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano", "    if (!NEVE) return;   // [inverno19] i solchi sono nella neve\n    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano")
# isola da lontano
rep(", k = v === T.WATER || v === T.BLD || dd === 'prateria' ? 0 :", ", k = !NEVE || v === T.WATER || v === T.BLD || dd === 'prateria' ? 0 :")
# vegetazione
rep("clamp(vSnow, 0., 1.) * .8);`);", "clamp(vSnow, 0., 1.) * ${NEVE ? '.8' : '0.'});`);")
rep("clamp(vSnow, 0., 1.) * .6);", "clamp(vSnow, 0., 1.) * ${NEVE ? '.6' : '0.'});")
rep("dark = sl(pick(r, ['#1e3426', '#24402c', '#1a2e22'])), snow = sl('#e6eaf0');", "dark = sl(pick(r, ['#1e3426', '#24402c', '#1a2e22'])), snow = NEVE ? sl('#e6eaf0') : NOSNOW;")
rep("tm = sm('#4a3e36'), snow = sl('#e2e6ec');", "tm = sm('#4a3e36'), snow = NEVE ? sl('#e2e6ec') : NOSNOW;")
# oggetti
rep("const g = G0(), wd = sm('#4e3a2a'), snow = sm('#e2e6ec');", "const g = G0(), wd = sm('#4e3a2a'), snow = NEVE ? sm('#e2e6ec') : sm('#3a2c22');")
rep("snow = sm('#dde2e8', { roughness: 1 });", "snow = NEVE ? sm('#dde2e8', { roughness: 1 }) : NOSNOW;")
rep("snow = sm('#c4c8ce', { roughness: 1 }), palM", "snow = NEVE ? sm('#c4c8ce', { roughness: 1 }) : NOSNOW, palM")
rep("const snowM = sm('#c4c8ce', { roughness: 1 }), metal", "const snowM = NEVE ? sm('#c4c8ce', { roughness: 1 }) : NOSNOW, metal")
rep("c.lerp(new THREE.Color('#c8ccd4'), snow * .4 * top);", "if (NEVE) c.lerp(new THREE.Color('#c8ccd4'), snow * .4 * top);")
rep("c.set('#5a5860').lerp(c.clone().set('#b4bac2'), top);", "c.set('#5a5860').lerp(c.clone().set(NEVE ? '#b4bac2' : '#646268'), top);   // [inverno19] senza neve il marciapiede è cemento, non bianco")
rep("new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#34363c', polygonOffset: true", "new THREE.MeshLambertMaterial({ vertexColors: true, emissive: NEVE ? '#34363c' : '#1a1a1e', polygonOffset: true")
rep("    if (piles.length) {", "    if (NEVE && piles.length) {   // [inverno19]")
# fiocchi
rep("const R = dyn.rain; R.m.visible = !p.indoor;", "const R = dyn.rain; R.m.visible = NEVE && !p.indoor;")
# tetti: tornano ardesia, lamiera, coppi e guaina scura, un po' spenti dal freddo
rep("""    x.fillStyle = '#d8dde4'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { if (r() < .7) continue; x.fillStyle = pick(r, ['#5a6070', '#6a7080', '#7a8090']); x.fillRect(k, y + 2, 5, 1); }
    for (let i = 0; i < 30; i++) { x.fillStyle = pick(r, ['#eef1f5', '#c8ced8']); x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); }""",
"""    if (NEVE) { x.fillStyle = '#d8dde4'; x.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { if (r() < .7) continue; x.fillStyle = pick(r, ['#5a6070', '#6a7080', '#7a8090']); x.fillRect(k, y + 2, 5, 1); }
    for (let i = 0; i < 30; i++) { x.fillStyle = pick(r, ['#eef1f5', '#c8ced8']); x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); } }
    else { x.fillStyle = '#343a48'; x.fillRect(0, 0, 64, 64);   // [inverno19] ardesia bagnata
    for (let y = 0; y < 64; y += 4) for (let k = (y / 4 % 2) * 3; k < 64; k += 6) { x.fillStyle = pick(r, ['#4e5666', '#48505e', '#56606e', '#424a58']); x.fillRect(k, y, 5, 3); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(k, y, 5, 1); }
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(80,96,70,.3)'; x.fillRect(Math.floor(r() * 62), Math.floor(r() * 62), 2, 1); } }""")
rep("""    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = '#d0d4da'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = r() < .5 ? '#6a6560' : '#b8bcc4'; x2.fillRect(k, 0, 1, 32); }""",
"""    const c2 = mk(32, 32), x2 = c2.getContext('2d'); x2.fillStyle = NEVE ? '#d0d4da' : '#5e5a56'; x2.fillRect(0, 0, 32, 32);
    for (let k = 0; k < 32; k += 3) { x2.fillStyle = NEVE ? (r() < .5 ? '#6a6560' : '#b8bcc4') : (r() < .5 ? '#4e4a46' : '#706a64'); x2.fillRect(k, 0, 1, 32); }""")
rep("""    const c3 = mk(32, 32), x3 = c3.getContext('2d'); x3.fillStyle = '#e2e6ec'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { if (r() < .75) continue; x3.fillStyle = pick(r, ['#8a5a48', '#7a4a3a', '#9a6a56']); x3.fillRect(k, y + 3, 3, 1); }
    for (let i = 0; i < 24; i++) { x3.fillStyle = pick(r, ['#ffffff', '#c6ccd6']); x3.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1); }""",
"""    const c3 = mk(32, 32), x3 = c3.getContext('2d');
    if (NEVE) { x3.fillStyle = '#e2e6ec'; x3.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { if (r() < .75) continue; x3.fillStyle = pick(r, ['#8a5a48', '#7a4a3a', '#9a6a56']); x3.fillRect(k, y + 3, 3, 1); }
    for (let i = 0; i < 24; i++) { x3.fillStyle = pick(r, ['#ffffff', '#c6ccd6']); x3.fillRect(Math.floor(r() * 30), Math.floor(r() * 30), 2, 1); } }
    else { x3.fillStyle = '#5a3428'; x3.fillRect(0, 0, 32, 32);   // [inverno19] coppi scuri e umidi
    for (let y = 0; y < 32; y += 4) for (let k = (y / 4 % 2) * 2; k < 32; k += 4) { x3.fillStyle = pick(r, ['#8a4e3a', '#7e4634', '#94583e', '#74402e']); x3.fillRect(k, y, 3, 4); x3.fillStyle = 'rgba(255,220,180,.1)'; x3.fillRect(k, y, 1, 4); } }""")
rep("""    x.fillStyle = '#c8ccd4'; x.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = pick(r, ['#dce0e6', '#d2d6de', '#e4e8ee', '#c0c4cc']); x.fillRect(k, y, 7, 7); }""",
"""    x.fillStyle = NEVE ? '#c8ccd4' : '#3e3c42'; x.fillRect(0, 0, 32, 32);   // [inverno19] guaina e quadrotti di cemento, bagnati
    for (let y = 0; y < 32; y += 8) for (let k = 0; k < 32; k += 8) { x.fillStyle = NEVE ? pick(r, ['#dce0e6', '#d2d6de', '#e4e8ee', '#c0c4cc']) : pick(r, ['#58565c', '#504e54', '#5e5c60', '#4a484e']); x.fillRect(k, y, 7, 7); }""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
