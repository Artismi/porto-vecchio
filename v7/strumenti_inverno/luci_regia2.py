# [luci 2] L'aria: densità, palpabilità, il «crisp» del freddo.
#  - brina sospesa che scintilla solo dentro i coni di luce (colorata dalla luce), il fiato delle persone vicine (frammento aria.js);
#  - coni di luce che pesano vicino alla lampada e svaniscono verso terra, più fitti al centro che ai bordi;
#  - aloni larghi e morbidi attorno alle sorgenti di notte (l'aria umida che trattiene la luce);
#  - crisp: nitidezza sul primo piano, e la foschia che cresce con la distanza (aria spessa fra te e il fondo).
# Dopo luci_regia1.py.
import sys, os
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci2]' in s: print('già applicato'); sys.exit()
assert '[luci1]' in s, 'prima luci_regia1.py'
frag = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aria.js'), encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

rep("  function buildChunk(ci, cj) {", frag + "  function buildChunk(ci, cj) {")
rep("    updateRefl(night, dyn.reflList);", "    updateRefl(night, dyn.reflList);\n    tickAir(time, night);   // [luci2]")

# coni di luce: densi in alto, svaniscono verso terra, morbidi ai bordi (niente cono solido)
rep("        const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); cone.visible = false; cone.renderOrder = 2;",
    """        const cone = new THREE.Mesh(coneG, new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); cone.visible = false; cone.renderOrder = 2;
        cone.material.onBeforeCompile = sh => {   // [luci2] cono d'aria: pieno vicino alla lampada, svanisce a terra e ai bordi
          sh.vertexShader = 'varying float vFr; varying float vH;\\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\\n vec3 nV = normalize(normalMatrix * normal); vec4 mvq = modelViewMatrix * vec4(position, 1.); vFr = abs(dot(nV, normalize(-mvq.xyz))); vH = uv.y;');
          sh.fragmentShader = 'varying float vFr; varying float vH;\\n' + sh.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\\n diffuseColor.a *= pow(vFr, 1.6) * (.12 + .88 * vH * vH);'); };""")
rep("cone.material.opacity = .03 * Math.min(1, k); }", "cone.material.opacity = .34 * Math.min(1, k); }   // [luci2] (la forma la dà lo shader)")

# post-processing
rep("""          vec3 c = texture2D(tC, uv).rgb;
          float d = lin(texture2D(tD, uv).r);""",
"""          vec3 c = texture2D(tC, uv).rgb;
          float d = lin(texture2D(tD, uv).r);
          float dc = lin(texture2D(tD, vec2(.5)).r);   // [luci2] distanza del punto guardato
          { vec3 nb = texture2D(tC, uv+vec2(px.x,0.)).rgb + texture2D(tC, uv-vec2(px.x,0.)).rgb + texture2D(tC, uv+vec2(0.,px.y)).rgb + texture2D(tC, uv-vec2(0.,px.y)).rgb;
            c = max(c + (c - nb*.25) * .38 * (1. - smoothstep(dc*1.08, dc*1.5, d)), 0.); }   // [luci2] crisp: il primo piano è nitido""")
# aloni larghi di notte: l'aria trattiene la luce
rep("          c += bl*(.05 + night*.06);",
    """          c += bl*(.05 + night*.06);
          { vec3 wb = vec3(0.); for (int k=0;k<10;k++){ float a = float(k)*.628 + .1; vec2 d0 = vec2(cos(a),sin(a));
              for (int j=0;j<2;j++){ float rr = j==0 ? 14. : 24.; vec3 s = texture2D(tC, uv + d0*px*rr).rgb; float mx = max(max(s.r,s.g),s.b); wb += max(s - .3, 0.) * smoothstep(.35, .75, mx) * (j==0 ? .6 : .4); } }
            c += wb * .085 * night; }   // [luci2] aloni nell'aria umida""")
# foschia con la distanza: aria spessa fra te e il fondo (prima del grading, così prende il tono della notte)
rep("          float l = dot(c, vec3(.299,.587,.114));\n          // [inverno] ombre blu-grigie",
    """          { float far01 = smoothstep(dc*1.02, dc*1.7, d); vec3 hz = mix(vec3(.50,.52,.54), vec3(.075,.085,.09), night);
            c = mix(c, hz + c*.35, far01 * (.42 + night*.1)); }   // [luci2] aria spessa lontano
          float l = dot(c, vec3(.299,.587,.114));
          // [inverno] ombre blu-grigie""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
