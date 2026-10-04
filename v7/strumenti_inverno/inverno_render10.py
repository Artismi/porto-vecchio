import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:60],s.count(old)); s=s.replace(old,new)
# strade bagnate: rugosità dal colore (asfalto scuro = bagnato, neve = opaca) + cielo riflesso a incidenza radente + riflessi speculari dei neon
rep("    const tex = canvasTex(c);\n    const pos = new Float32Array((n + 1) * (m + 1) * 3)",
"""    const tex = canvasTex(c);
    let rtex = null;
    try { const W = c.width, H = c.height, id = x.getImageData(0, 0, W, H), d = id.data, rc = mk(W, H), rxx = rc.getContext('2d'), od = rxx.createImageData(W, H), o = od.data;
      for (let q = 0; q < W * H; q++) { const lum = d[q * 4] * .3 + d[q * 4 + 1] * .59 + d[q * 4 + 2] * .11, r = Math.max(.26, Math.min(1, .26 + (lum - 62) / 70 * .74)) * 255; o[q * 4] = o[q * 4 + 1] = o[q * 4 + 2] = r; o[q * 4 + 3] = 255; }
      rxx.putImageData(od, 0, 0); rtex = canvasTex(rc); rtex.magFilter = THREE.LinearFilter; rtex.minFilter = THREE.LinearFilter; rtex.generateMipmaps = false; } catch (e) { rtex = null; }
    const pos = new Float32Array((n + 1) * (m + 1) * 3)""")
rep("const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });\n    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;\n    const grp = new THREE.Group(); grp.add(mesh);\n    const veg",
    "const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .55 });\n    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true;\n    const grp = new THREE.Group(); grp.add(mesh);\n    const veg")
rep("  // ---- blocchi di terreno ----","""  // cielo cupo verde-acqua con una fascia di orizzonte: è ciò che le strade bagnate riflettono
  let WETENV = null;
  function wetEnv() {
    if (WETENV) return WETENV;
    const c = mk(128, 64), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, '#3a4a78'); g.addColorStop(.45, '#5a7c92'); g.addColorStop(.5, '#7fa6b0'); g.addColorStop(.56, '#2a3a44'); g.addColorStop(1, '#10141c');
    x.fillStyle = g; x.fillRect(0, 0, 128, 64);
    const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer); WETENV = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
    return WETENV;
  }
  // ---- blocchi di terreno ----""")
open(p,'w').write(s); print('ok')
