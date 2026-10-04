import sys
p=sys.argv[1]; s=open(p).read()
def rep(old,new,n=1):
    global s
    assert s.count(old)==n,(old[:70],s.count(old)); s=s.replace(old,new)
# ---- palette disciplinata: ciano, magenta, ambra. Il resto è verde-acqua spento. L'arcobaleno di neon era l'albero di Natale ----
rep("  const pick = (r, a) => a[Math.floor(r() * a.length)];","""  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const NQ = ['#38e8ff', '#ff3fa4', '#ffb050'].map(h => new THREE.Color(h));
  function nq(hex) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); const hu = h.h * 360; if (h.s < .25 || hu < 12 || hu > 348) return hex; let best = 0, bd = 999; [185, 330, 32].forEach((t, i) => { let d = Math.abs(hu - t); d = Math.min(d, 360 - d); if (d < bd) { bd = d; best = i; } }); return '#' + NQ[best].getHexString(); }""")
rep("function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(color),","function addLight(x, y, z, color, intensity, distance, flick) { const rec = { x, y, z, color: new THREE.Color(nq(color)),")
rep("function glow(x, y, z, color, size, add) {","function glow(x, y, z, color, size, add) { color = nq(color);")
rep("function signTexture(text, color, bg) {","function signTexture(text, color, bg) { color = nq(color);")
rep("function labelTex(text, col, vert, w, h) {\n    const key = text + col + vert;","function labelTex(text, col, vert, w, h) {\n    col = nq(col); const key = text + col + vert;")
rep("const NEON = ['#ff4fa3', '#35e6ff', '#ffd23b', '#a8d8ff', '#ff6a3b', '#c05cff'];","const NEON = ['#ff3fa4', '#38e8ff', '#38e8ff', '#ffb050', '#ff3fa4', '#38e8ff'];")
rep("NEONS = ['#ffe03a', '#ff3fa4', '#38e8ff', '#ff7a2a', '#7dff6a']","NEONS = ['#38e8ff', '#ff3fa4', '#38e8ff', '#ffb050', '#ff3fa4']")
rep("const CCOL = ['#38e8ff', '#ff3fa4', '#e8ff3a', '#7dff6a', '#ff7a2a', '#b07aff'];","const CCOL = ['#38e8ff', '#ff3fa4'];")
for a,b in [('#ffe03a','#ffb050'),('#7dff6a','#38e8ff'),('#ff7a2a','#ffb050'),('#e8ff3a','#ffb050')]: s=s.replace(a,b)
rep("const LIT = ['#ffb050', '#ffc470', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];","const LIT = ['#ffb050', '#ffc470', '#ffb050', '#8fe0d4', '#ffb050', '#6fb8d8'];")
rep("const PANE = ['#ffb050', '#ffc470', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];","const PANE = ['#ffb050', '#ffc470', '#ffb050', '#8fe0d4'];") if "const PANE = ['#ffb050', '#ffc070', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];" not in s else rep("const PANE = ['#ffb050', '#ffc070', '#ffb050', '#9fe8dc', '#ff6fb0', '#8fc8f0'];","const PANE = ['#ffb050', '#ffc070', '#ffb050', '#8fe0d4'];")
# meno cose, ma messe dove hanno senso: insegne solo sui locali, pochi balconi, pochi schermi
rep("fl >= 3 && r() < .75) {\n        const sd = pick(r, sides), nb","fl >= 3 && r() < .4) {\n        const sd = pick(r, sides), nb")
rep("const nbl = r() < .9 ? 2 + Math.floor(r() * 3) : 0;","const nbl = (b.shop || b.sign) && r() < .8 ? 1 : 0;")
rep("if (r() < .45) { const sd = pick(r, sides), u = 1.2","if (r() < .18) { const sd = pick(r, sides), u = 1.2")
# ---- aura: alone largo solo dalle sorgenti colorate (neon, finestre, lampioni): la neve bianca non c'entra ----
rep("""          for (int k=0;k<8;k++){ float a = float(k)*.785; vec2 o = vec2(cos(a),sin(a))*px*2.5; vec3 s = texture2D(tC, uv+o).rgb; bl += max(s-.92, 0.); }
          c += bl*.11;""","""          for (int k=0;k<8;k++){ float a = float(k)*.785 + .2; vec2 d0 = vec2(cos(a),sin(a));
            for (int j=0;j<3;j++){ float rr = j==0 ? 3. : (j==1 ? 8. : 17.); vec3 s = texture2D(tC, uv + d0*px*rr).rgb; float mx = max(max(s.r,s.g),s.b), ch = mx - min(min(s.r,s.g),s.b); bl += max(s-.5, 0.) * smoothstep(.1,.4,ch) * (j==0 ? .5 : (j==1 ? .35 : .22)); } }
          c += bl*(.1 + night*.14);""")
# ---- luce che agisce sull'ambiente: pozze a terra, coni, luci puntuali più forti sulle insegne ----
rep("m.material.opacity = night * .07; m.visible = night > .05;","m.material.opacity = night * .045; m.visible = night > .05;")
rep("(d.always ? .2 + night * .35 : night * .4)","(d.always ? .25 + night * .3 : night * .42)")
rep("addLight(lx, sy - .3, lz, b.sign.c, 3.2, 11,","addLight(lx, sy - .3, lz, b.sign.c, 5, 14,")
open(p,'w').write(s); print('ok')
