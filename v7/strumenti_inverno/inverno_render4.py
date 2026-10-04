# Quarta parte [inverno]: riva liscia, marciapiedi, zoccoli, ombre di contatto, neve contro i muri,
# luce chiave + controluce, coni di luce, aloni a terra, vapore, nebbia a strati. Uso: python3 inverno_render4.py render.js
import sys, os
p = sys.argv[1]; s = open(p).read(); here = os.path.dirname(os.path.abspath(sys.argv[0]))
def R(a, b):
    global s
    assert a in s, 'NON TROVATO: ' + a[:90]
    s = s.replace(a, b, 1)

# ---- 1. la riva: la terra scende sotto il pelo dell'acqua seguendo la linea di costa vera, non le caselle ----
R("""      let h = hv(tx, ty);
      // la spiaggia scende sotto il pelo dell'acqua
      if (h < .6) { let wet = false, sand = false; for (const [a, b] of [[tx - 1, ty - 1], [tx, ty - 1], [tx - 1, ty], [tx, ty]]) { const vv = gT(a, b); if (vv === T.WATER) wet = true; if (vv === T.SAND || vv === T.DESERT) sand = true; } if (wet && sand) h = -.7; }""",
"""      let h = hv(tx, ty);
      // [inverno] riva liscia: la quota segue la distanza vera dalla costa (curva), non le caselle; banchine e moli restano a filo
      { const ci2 = coastIn(tx * TS, ty * TS); let hard = false; for (const [a, b] of [[tx - 1, ty - 1], [tx, ty - 1], [tx - 1, ty], [tx, ty]]) { const vv = gT(a, b); if (vv === T.QUAY || vv === T.PIER) hard = true; }
        if (!hard && ci2 < 4) { const land = Math.max(.4, h > -1 ? h : .4), k = Math.max(0, Math.min(1, (ci2 + 1.2) / 5.2)); h = -1.6 + (land + 1.6) * k * k * (3 - 2 * k); } }""")
R("""      const v = gT(tx0 + i, ty0 + j); if (v === T.WATER || v === T.FOUNT) continue;
      const a = j * (n + 1) + i, b = (j + 1) * (n + 1) + i, cc = b + 1, d = a + 1;""",
"""      const v = gT(tx0 + i, ty0 + j); if (v === T.FOUNT) continue;
      if (v === T.WATER && coastIn((tx0 + i + .5) * TS, (ty0 + j + .5) * TS) < -3) continue;   // il fondale vicino alla riva c'è, il mare aperto no
      const a = j * (n + 1) + i, b = (j + 1) * (n + 1) + i, cc = b + 1, d = a + 1;""")
# distanza dalla costa (positiva a terra) dalle funzioni del mondo
R("  // ---- pittura del terreno, casella per casella ----",
"""  // [inverno] distanza dalla linea di costa vera (metri, positiva verso terra)
  function coastIn(x, y) { const W0 = M.world; if (!W0 || !W0.northY) return 9; const L = W0.LAKE; if (L) { const q = Math.hypot((x - L.x) / L.rx, (y - L.y) / L.ry); if (q < 1.6) return (q - .9) * Math.min(L.rx, L.ry); } return Math.min(y - W0.northY(x), W0.southY(x) - y, x - 6, 672 - x); }
  // ---- pittura del terreno, casella per casella ----""")
# il mare: la maschera della riva disegnata dal poligono della costa, non dalle caselle
R("for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty); if (v !== T.WATER && v !== T.PIER) mx.fillRect(tx * S, ty * S, S, S); }",
"""const W0c = M.world;
    if (W0c && W0c.northY) { const q = S / TS; mx.beginPath(); for (let X = 0; X <= G.WW; X += 2) mx.lineTo(X * q, W0c.northY(X) * q); for (let X = G.WW; X >= 0; X -= 2) mx.lineTo(X * q, W0c.southY(X) * q); mx.closePath(); mx.fill();
    }
    else for (let ty = 0; ty < G.GH; ty++) for (let tx = 0; tx < G.GW; tx++) { const v = gT(tx, ty); if (v !== T.WATER && v !== T.PIER) mx.fillRect(tx * S, ty * S, S, S); }""")
R("vec2 p = floor(vP.xz*4.)/4.;", "vec2 p = floor(vP.xz*6.)/6.;")

# ---- 2. ombra di contatto e neve contro i muri, dipinte sul terreno ----
R("    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano",
"""    // 4b) ai piedi dei muri: un'ombra morbida di contatto e un cordone di neve ammucchiata
    info.forEach(q => {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        if (gT(q.tx + dx, q.ty + dy) !== T.BLD || q.road) return;
        const gx0 = dx > 0 ? q.px + P : dx < 0 ? q.px : q.px, gy0 = dy > 0 ? q.py + P : dy < 0 ? q.py : q.py, gx1 = dx > 0 ? q.px + P * .35 : dx < 0 ? q.px + P * .65 : gx0, gy1 = dy > 0 ? q.py + P * .35 : dy < 0 ? q.py + P * .65 : gy0;
        const g = x.createLinearGradient(gx0, gy0, dx ? gx1 : gx0, dy ? gy1 : gy0); g.addColorStop(0, 'rgba(18,18,24,.55)'); g.addColorStop(1, 'rgba(18,18,24,0)');
        x.fillStyle = g; x.fillRect(q.px, q.py, P, P);
      });
    });
    // 5) i solchi delle gomme: lungo le strade, e agli incroci archi che girano""")

# ---- 3. luce: sole basso e radente (ombre lunghe) e una controluce fredda dal lato opposto ----
R("moon.position.set(cam.x - 30 * Math.cos(1 - night) - dusk * 20, 40 - dusk * 18, cam.y - 26); moon.target.position.set(cam.x, 0, cam.y);",
  "moon.position.set(cam.x - 34 - dusk * 18, 22 - dusk * 8, cam.y - 30); moon.target.position.set(cam.x, 0, cam.y);\n    if (dyn.rim) { dyn.rim.position.set(cam.x + 30, 18, cam.y + 34); dyn.rim.target.position.set(cam.x, 0, cam.y); dyn.rim.intensity = .25 + (1 - night) * .25; dyn.rim.color.set(night > .5 ? '#6a8ac8' : '#b8c8e8'); }")
R("scene.add(moon); scene.add(moon.target);", "scene.add(moon); scene.add(moon.target);\n    dyn.rim = new THREE.DirectionalLight('#b8c8e8', .4); scene.add(dyn.rim); scene.add(dyn.rim.target);   // [inverno] controluce: stacca i volumi dal fondo")
R("const sc = moon.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 120;", "const sc = moon.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 160; moon.shadow.mapSize.set(2048, 2048);")

# ---- 4. il frammento: zoccoli, gradini, neve contro i muri, marciapiedi rialzati, coni di luce, aloni, vapore, nebbia ----
R("  function tickWinter(time, night) {", open(os.path.join(here, 'inverno_volumi.js')).read() + "\n  function tickWinter(time, night) {")
R("TT('inverno', buildWinter);", "TT('inverno', buildWinter); TT('volumi', buildVolumes);")
R("    if (WX.radar) WX.radar.rotation.y = time * .8;", "    if (WX.radar) WX.radar.rotation.y = time * .8;\n    tickVolumes(time, night);")
open(p, 'w').write(s); print('inverno_render4: ok')
