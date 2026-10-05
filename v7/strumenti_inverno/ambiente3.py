# [amb3] AMBIENTE 3: LA PITTURA. Uno strato di pittura sopra il 3D, che dà definizione, profondità e completezza.
# Andrea: «uno shader che trasformi le leggere imperfezioni e semplificazioni dei modelli aggiungendo uno strato di pittura 3D,
# che dia a tutto profondità, definizione e completezza, un po' arcade retro, con colori più saturi ma in palette».
# 1) pennellata: filtro di Kuwahara a 4 settori sulla scena (prima del post) -> il rumore fine diventa macchie di colore, i bordi restano netti
# 2) inchiostro colorato sui contorni di colore + luce sui profili alti (il bordo di un oggetto contro ciò che sta dietro, verso l'alto)
# 3) palette: ~50 colori a rampe (cemento, mattone del regime, ocra e lampade, verdi, mare, blu-viola delle ombre, neon, pelle, sabbia),
#    ogni pixel va al colore più vicino nello spazio OKLab, sfumando col secondo più vicino quando sono quasi pari (niente scalini duri)
# 4) cavità dalla profondità (spigoli convessi accesi, pieghe scure) e chiarezza (contrasto locale a media scala): i modelli si completano.
# Niente retino (Andrea: «via il dithering, confonde»).
# Manopole in window.__AMB: paint (pennellata), pal (quanto attira la palette), sat (spinta del colore), ink, rim, cav, clar.
# Dopo ambiente2.py.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[amb3]' in s: print('già applicato'); sys.exit()
assert '[amb2]' in s, 'prima ambiente2.py'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

PAL = [  # rampe, dal buio alla luce
  '#0c0b12', '#1a1922', '#2a2832', '#3c3a43', '#53515a', '#6d6a6e', '#8a8684', '#aaa398', '#cbc2b2', '#eae1cd',   # cemento e intonaco
  '#2e1216', '#5a1a1e', '#8e2326', '#c23a30', '#e8664a', '#f4a080',                                              # mattone, rosso del potere
  '#3a2614', '#664420', '#9a6a2c', '#cc9640', '#f0c35a', '#ffe596',                                              # ocra, legno, lampade
  '#10201a', '#1a3524', '#284f2c', '#3e6e34', '#62913e', '#93b452', '#c4d47a',                                    # verdi del bosco e dei prati
  '#0c2230', '#173e4c', '#265e68', '#3f8586', '#74b0a4',                                                         # mare
  '#121630', '#1f2850', '#323f74', '#4c5c96', '#7e8cb8',                                                         # blu delle ombre e della notte
  '#2c1a3a', '#4a2c56', '#6e4476', '#9a6a94',                                                                    # viola delle ombre
  '#ff4a98', '#ffd23e', '#56e0d8', '#ff7a2a',                                                                    # neon e fuoco
  '#e2a884', '#b47456', '#7a4a3a',                                                                               # pelle
  '#dcc690', '#b89c62',                                                                                          # sabbia
]
def hex2(c): return tuple(int(c[i:i+2], 16) / 255 for i in (1, 3, 5))
PAL_GLSL = ','.join('vec3(%.4f,%.4f,%.4f)' % hex2(c) for c in PAL)
NP = len(PAL)
def oklab(c):
    r, g, b = (x ** 2.2 for x in hex2(c))
    l = .4122214708*r + .5363325363*g + .0514459929*b; m = .2119034982*r + .6806995451*g + .1073969566*b; s_ = .0883024619*r + .2817188376*g + .6299787005*b
    l, m, s_ = l ** (1/3), m ** (1/3), s_ ** (1/3)
    return (.2104542553*l + .7936177850*m - .0040720468*s_, 1.9779984951*l - 2.4285922050*m + .4505937099*s_, .0259040371*l + .7827717662*m - .8086757660*s_)
PAL_JS = '[' + ','.join('[%.4f,%.4f,%.4f]' % hex2(c) for c in PAL) + ']'
PALO_JS = '[' + ','.join('[%.4f,%.4f,%.4f]' % oklab(c) for c in PAL) + ']'

PAINT_JS = r'''
  // ================= [amb3] LA PITTURA: pennellata di Kuwahara sulla scena, prima del post =================
  const PAINT = { rt: null, mat: null };
  function paintInit() {
    const R = 1;   /* raggio del settore: 1 -> settori 2x2 (fine, i dettagli restano); 2 -> macchie di 3x3 texel */
    PAINT.mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: null }, d: { value: null }, px: { value: new THREE.Vector2() }, k: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `uniform sampler2D t; uniform sampler2D d; uniform vec2 px; uniform float k; varying vec2 vUv;
        void main(){
          vec2 uv = (floor(vUv / px) + .5) * px; vec3 c0 = texture2D(t, uv).rgb;
          vec3 m0 = vec3(0.), m1 = vec3(0.), m2 = vec3(0.), m3 = vec3(0.), s0 = vec3(0.), s1 = vec3(0.), s2 = vec3(0.), s3 = vec3(0.);
          for (int j = 0; j <= ${R}; j++) for (int i = 0; i <= ${R}; i++) {
            vec3 a = texture2D(t, uv + vec2(-float(i), -float(j)) * px).rgb; m0 += a; s0 += a * a;
            vec3 b = texture2D(t, uv + vec2( float(i), -float(j)) * px).rgb; m1 += b; s1 += b * b;
            vec3 e = texture2D(t, uv + vec2(-float(i),  float(j)) * px).rgb; m2 += e; s2 += e * e;
            vec3 f = texture2D(t, uv + vec2( float(i),  float(j)) * px).rgb; m3 += f; s3 += f * f; }
          float n = float((${R} + 1) * (${R} + 1));
          m0 /= n; m1 /= n; m2 /= n; m3 /= n;
          vec3 v0 = abs(s0 / n - m0 * m0), v1 = abs(s1 / n - m1 * m1), v2 = abs(s2 / n - m2 * m2), v3 = abs(s3 / n - m3 * m3);
          float q0 = v0.r + v0.g + v0.b, q1 = v1.r + v1.g + v1.b, q2 = v2.r + v2.g + v2.b, q3 = v3.r + v3.g + v3.b;
          // Kuwahara morbido: ogni settore pesa per quanto è uniforme (il più liscio vince, ma senza scatti)
          float w0 = 1. / (1. + pow(q0 * 60., 2.)), w1 = 1. / (1. + pow(q1 * 60., 2.)), w2 = 1. / (1. + pow(q2 * 60., 2.)), w3 = 1. / (1. + pow(q3 * 60., 2.));
          vec3 c = (m0 * w0 + m1 * w1 + m2 * w2 + m3 * w3) / (w0 + w1 + w2 + w3);
          gl_FragColor = vec4(mix(c0, c, k), 1.); }`,
      depthTest: false, depthWrite: false });
  }
  function paintResize(W, H) {
    if (!PAINT.mat) paintInit();
    if (PAINT.rt) PAINT.rt.dispose();
    PAINT.rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType, depthBuffer: false });
    PAINT.mat.uniforms.px.value.set(1 / W, 1 / H);
  }
  function paintPass() {
    if (!PAINT.rt || !(AMB.paint > .01)) return rt.texture;
    PAINT.mat.uniforms.t.value = rt.texture; PAINT.mat.uniforms.k.value = Math.min(1, AMB.paint);
    APS.quad.material = PAINT.mat; renderer.setRenderTarget(PAINT.rt); renderer.render(APS.scene, APS.cam); APS.quad.material = APS.mat; renderer.setRenderTarget(null);
    return PAINT.rt.texture;
  }
'''
rep("  // ---------------- POST-PROCESSING ----------------\n  function buildPost() {", PAINT_JS + "  // ---------------- POST-PROCESSING ----------------\n  function buildPost() {")
rep("const AMB = { expo: .96, bloom: 1, thrDay: 1.05, thrNight: .6, dof: .5, grain: .02, ca: .14, shafts: 1, sharp: .32, outline: .3, vig: .7 };",
    "const AMB = { expo: .96, bloom: 1, thrDay: 1.05, thrNight: .6, dof: 0, grain: 0, ca: 0, shafts: 1, sharp: .2, outline: .3, vig: .7, paint: 0, pal: .5, sat: 1.25, ink: .5, rim: .5, cav: 1, clar: .3 };   /* [amb3] paint, pal, sat, ink, rim, cav, clar */")
rep("    ambResize(W, H);", "    ambResize(W, H); paintResize(W, H);   /* [amb3] */")
rep("    U.tC.value = rt.texture; U.tD.value = rt.depthTexture;", "    U.tC.value = paintPass(); U.tD.value = rt.depthTexture;   /* [amb3] la scena dipinta */")

# ---------------------------------------------------------------- SHADER DEL POST ----------------
rep("uniform sampler2D sSM; uniform mat4 sSMat; uniform vec3 sCol; uniform float sOn;\n",
    "uniform sampler2D sSM; uniform mat4 sSMat; uniform vec3 sCol; uniform float sOn;\n"
    "        uniform vec4 pK; uniform vec2 pC;   // [amb3] pC: cavità, chiarezza palette, saturazione, inchiostro, luce sui profili\n"
    "        const int NP = " + str(NP) + ";\n"
    "        uniform vec3 palC[" + str(NP) + "]; uniform vec3 palO[" + str(NP) + "];\n"
    "        vec3 toLin(vec3 c){ return pow(max(c, 0.), vec3(2.2)); }\n"
    "        vec3 okl(vec3 c){ c = toLin(c); float l = .4122214708*c.r + .5363325363*c.g + .0514459929*c.b, m = .2119034982*c.r + .6806995451*c.g + .1073969566*c.b, s = .0883024619*c.r + .2817188376*c.g + .6299787005*c.b;\n"
    "          l = pow(l, 1./3.); m = pow(m, 1./3.); s = pow(s, 1./3.);\n"
    "          return vec3(.2104542553*l + .7936177850*m - .0040720468*s, 1.9779984951*l - 2.4285922050*m + .4505937099*s, .0259040371*l + .7827717662*m - .8086757660*s); }\n")
rep("hurt: { value: 0 }, sat: { value: 1 },", "hurt: { value: 0 }, sat: { value: 1 }, pK: { value: new THREE.Vector4(.5, 1.25, .5, .5) }, pC: { value: new THREE.Vector2(1, .45) }, palC: { value: " + PAL_JS + ".map(a => new THREE.Vector3(...a)) }, palO: { value: " + PALO_JS + ".map(a => new THREE.Vector3(...a)) },   /* [amb3] */")
# inchiostro colorato sui contorni di colore e luce calda sui profili alti: subito dopo l'occlusione
rep("c *= 1. - ao/8.*.42*(1.-coc*.7); }",
    "c *= 1. - ao/8.*.42*(1.-coc*.7); }\n"
    "          {   // [amb3] inchiostro e profili: il volume si stacca dal fondo\n"
    "            float la = dot(texture2D(tC, uv + vec2(px.x, 0.)).rgb, vec3(.3,.59,.11)), lb = dot(texture2D(tC, uv - vec2(px.x, 0.)).rgb, vec3(.3,.59,.11));\n"
    "            float lc2 = dot(texture2D(tC, uv + vec2(0., px.y)).rgb, vec3(.3,.59,.11)), ld = dot(texture2D(tC, uv - vec2(0., px.y)).rgb, vec3(.3,.59,.11)), l0 = dot(c, vec3(.3,.59,.11));\n"
    "            float ge = clamp((max(max(la, lb), max(lc2, ld)) - l0) * 3.2 - .12, 0., 1.);   // solo il lato scuro del bordo prende l'inchiostro\n"
    "            c = mix(c, c * vec3(.42,.4,.56), ge * pK.z * (1. - coc));\n"
    "            float du = lin(texture2D(tD, uv + vec2(0., px.y)).r), du2 = lin(texture2D(tD, uv + vec2(0., px.y * 2.)).r);\n"
    "            float rim = smoothstep(.5*(1.+d*.01), 1.6*(1.+d*.012), max(du, du2) - d) * (1. - coc);   // il profilo alto di un oggetto: dietro c'è qualcosa di lontano\n"
    "            c += (c * .55 + vec3(.05,.04,.02)) * mix(vec3(1.08,1.,.86), vec3(.8,.9,1.15), night) * rim * pK.w;\n"
    "            // cavità: dalla profondità, gli spigoli convessi prendono luce, le pieghe e gli incavi si scuriscono (il modello sembra rifinito a mano)\n"
    "            float cv = (d1 + d2 + d3 + d4 - 4. * d) / (d * .012 + .08);\n"
    "            float ridge = smoothstep(.12, .7, cv) * (1. - smoothstep(2., 4., cv)), valley = smoothstep(.12, .7, -cv) * (1. - smoothstep(2., 4., -cv));\n"
    "            c *= 1. - valley * .38 * pC.x * (1. - coc);\n"
    "            c += (c * .5 + vec3(.025,.022,.016)) * ridge * .55 * pC.x * (1. - coc) * (1. - night * .5);\n"
    "            // chiarezza: contrasto locale a media scala, i volumi e le texture si leggono\n"
    "            vec3 bl4 = texture2D(tBlur, vUv).rgb; c = max(c + (c - bl4) * pC.y * (.35 + uReg * .65) * (1. - coc) * (1. - smoothstep(dc*1.1, dc*1.6, d) * .6), 0.); }")
# palette: dopo la curva filmica; la grana sparisce quando la palette comanda
rep("            c += gn * aK.w * (1. - lg * .6); }\n",
    "            c += gn * aK.w * (1. - lg * .6) * (1. - pK.x); }\n"
    "          if (pK.x > .01) {   // [amb3] colori saturi, ma in palette\n"
    "            vec3 o = okl(c); float L = o.x; vec2 ab = o.yz * pK.y;   // spinta del colore\n"
    "            vec3 q = vec3(L, ab); float d1 = 1e9, d2 = 1e9; vec3 p1 = c, p2 = c, o1 = q, o2 = q;\n"
    "            for (int i = 0; i < NP; i++) { vec3 pc = palC[i], po = palO[i]; vec3 dv = q - po; float dd = dv.x*dv.x*1.6 + dot(dv.yz, dv.yz);\n"
    "              if (dd < d1) { d2 = d1; p2 = p1; o2 = o1; d1 = dd; p1 = pc; o1 = po; } else if (dd < d2) { d2 = dd; p2 = pc; o2 = po; } }\n"
    "            float w = sqrt(d1) / (sqrt(d1) + sqrt(d2) + 1e-5);   // 0 = proprio quel colore, .5 = a metà fra due\n"
    "            vec3 pal = mix(p1, p2, smoothstep(.2, .5, w) * .5);   // fra due colori quasi pari: a metà, senza retino né scalini\n"
    "            c = mix(c, pal, pK.x); }\n")
rep("A.dof * (pveh ? .45 : 1) * (p.indoor ? 0 : 1)", "A.dof * (pveh ? .45 : 1) * (p.indoor ? 0 : 1) * (1 - A.pal * .55)")   # la sfocatura impasta i pixel: con la palette è più leggera
rep("U.aTime.value = time;", "U.aTime.value = time; U.pK.value.set(A.pal, A.sat, A.ink, A.rim); U.pC.value.set(A.cav, A.clar);   /* [amb3] */")

# ---------------------------------------------------------------- RISOLUZIONE PIENA ----------------
# Andrea: «è tutto sfocato e sgranato». Il gioco disegnava a metà risoluzione (PX minimo 2) e ingrandiva a pixel grossi.
# Ora un pixel del gioco per ogni pixel logico dello schermo; in bassa qualità si torna a 2.
rep("    PX = Math.max(2, Math.round(ch * dpr / TARGET));", "    PX = LOWQ.on ? Math.max(2, Math.round(dpr) * 2) : Math.max(1, Math.round(dpr));   /* [amb3] risoluzione piena */")

open(p, 'w', encoding='utf-8').write(s); print('ok [amb3]', NP, 'colori')
