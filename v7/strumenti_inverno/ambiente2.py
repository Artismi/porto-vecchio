# [amb2] AMBIENTE 2: la macchina da presa. Immagine pulita e croccante, luce che respira.
# - scena in mezza precisione (HDR): lampade, neon e sole possono superare il bianco, la curva filmica li riporta giù
# - bloom vero (soglia morbida, due livelli di sfocatura) al posto degli aloni finti a campioni sparsi
# - curva filmica ACES con esposizione
# - raggi di sole: la nebbia bassa prende l'ombra vera del sole (shadow map) -> fasci tra gli alberi e fra i palazzi
# - profondità di campo da obiettivo basculante (tilt-shift, come l'HD-2D): nitido il giocatore, morbido il bordo
# - via le righe da monitor e il retino a 40 livelli; grana fine da pellicola, aberrazione cromatica appena ai bordi
# Manopole in window.__AMB (si cambiano a gioco aperto). Dopo ambiente1.py.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[amb2]' in s: print('già applicato'); sys.exit()
assert '[amb1]' in s, 'prima ambiente1.py'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)
def cut(a_txt, b_txt, new, keep_b=True):
    global s
    a = s.index(a_txt); b = s.index(b_txt, a); assert a < b
    s = s[:a] + new + (s[b:] if keep_b else s[b + len(b_txt):])

# ---------------------------------------------------------------- 1. PASSAGGI: BLOOM E SFOCATURA ----------------
PASSES = r'''
  // ================= [amb2] LA MACCHINA DA PRESA: bloom, sfocatura per la profondità di campo, raggi di sole =================
  const AMB = { expo: .96, bloom: 1, thrDay: 1.05, thrNight: .6, dof: .5, grain: .02, ca: .14, shafts: 1, sharp: .32, outline: .3, vig: .7 };
  if (typeof window !== 'undefined') window.__AMB = AMB;
  const APS = { scene: null, cam: null, quad: null, mat: null, rts: [] };
  function ambInit() {
    APS.scene = new THREE.Scene(); APS.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    APS.mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() }, thr: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
      fragmentShader: `uniform sampler2D t; uniform vec2 dir; uniform float thr; varying vec2 vUv;
        vec3 f(vec2 u){ vec3 c = texture2D(t, u).rgb; if (thr > 0.) { float l = max(max(c.r,c.g),c.b), k = max(l - thr, 0.); k = k*k/(k + .3); c *= k/max(l, 1e-4); } return c; }
        void main(){ vec3 a = f(vUv)*.2270;
          a += (f(vUv + dir*1.3846) + f(vUv - dir*1.3846))*.3162; a += (f(vUv + dir*3.2308) + f(vUv - dir*3.2308))*.0703;
          gl_FragColor = vec4(a, 1.); }`,
      depthTest: false, depthWrite: false });
    APS.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), APS.mat); APS.scene.add(APS.quad);
  }
  function ambResize(W, H) {
    if (!APS.scene) ambInit();
    APS.rts.forEach(r => r.dispose());
    const mk2 = (w, h) => new THREE.WebGLRenderTarget(Math.max(8, w), Math.max(8, h), { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: false });
    const h2 = [W >> 1, H >> 1], h4 = [W >> 2, H >> 2], h8 = [W >> 3, H >> 3];
    APS.rts = [mk2(...h2), mk2(...h2), mk2(...h4), mk2(...h4), mk2(...h8), mk2(...h8), mk2(...h4), mk2(...h4)];
  }
  function ambPass(src, dst, dx, dy, thr) {
    const U = APS.mat.uniforms; U.t.value = src; U.dir.value.set(dx / dst.width, dy / dst.height); U.thr.value = thr || 0;
    renderer.setRenderTarget(dst); renderer.render(APS.scene, APS.cam); }
  function ambPasses() {
    if (!APS.rts.length) return;
    const [a, b, c, d, e, f, g, h] = APS.rts;
    ambPass(rt.texture, a, 1, 0, AMB.thr || .8); ambPass(a.texture, b, 0, 1);         // mezza: soglia e prima sfocatura
    ambPass(b.texture, c, 1.2, 0); ambPass(c.texture, d, 0, 1.2);               // un quarto
    ambPass(d.texture, e, 1.4, 0); ambPass(e.texture, f, 0, 1.4);               // un ottavo: l'alone largo
    ambPass(rt.texture, g, 1, 0); ambPass(g.texture, h, 0, 1);                  // la scena sfocata, per la profondità di campo
    renderer.setRenderTarget(null); }
'''
rep("  // ---------------- POST-PROCESSING ----------------\n  function buildPost() {", PASSES + "  // ---------------- POST-PROCESSING ----------------\n  function buildPost() {")

# scena in HDR e filtrata (il post campiona sempre al centro del texel, quindi resta nitida)
rep("    rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });",
    "    rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType });   /* [amb2] HDR */\n    ambResize(W, H);")
rep("    renderer.setRenderTarget(rt); renderer.render(scene, camera);\n    renderer.setRenderTarget(null);",
    "    renderer.setRenderTarget(rt); renderer.render(scene, camera);\n    renderer.setRenderTarget(null); ambPasses();   /* [amb2] */")

# ---------------------------------------------------------------- 2. UNIFORM ----------------
rep("uReg: { value: .7 }, uWx: { value: new THREE.Vector4() }, uHz: { value: new THREE.Color() },   /* [amb1] */",
    "uReg: { value: .7 }, uWx: { value: new THREE.Vector4() }, uHz: { value: new THREE.Color() },   /* [amb1] */\n"
    "        tBloom: { value: null }, tBloom2: { value: null }, tBlur: { value: null }, aK: { value: new THREE.Vector4(1, .9, .75, .022) }, aK2: { value: new THREE.Vector4(.5, .3, .3, .75) }, aFoc: { value: new THREE.Vector2(.5, .5) }, aTime: { value: 0 },\n"
    "        sSM: { value: null }, sSMat: { value: new THREE.Matrix4() }, sCol: { value: new THREE.Vector3() }, sOn: { value: 0 },   /* [amb2] */")
rep("uniform float uReg; uniform vec4 uWx; uniform vec3 uHz;\n",
    "uniform float uReg; uniform vec4 uWx; uniform vec3 uHz;\n"
    "        uniform sampler2D tBloom; uniform sampler2D tBloom2; uniform sampler2D tBlur; uniform vec4 aK; uniform vec4 aK2; uniform vec2 aFoc; uniform float aTime;   // [amb2] aK: espos., bloom, dof, grana; aK2: aberr., nitidezza, contorni, vignetta\n"
    "        uniform sampler2D sSM; uniform mat4 sSMat; uniform vec3 sCol; uniform float sOn;\n")

# ---------------------------------------------------------------- 3. SHADER DEL POST ----------------
# aberrazione cromatica appena ai bordi
rep("          vec3 c = texture2D(tC, uv).rgb;\n",
    "          vec3 c = texture2D(tC, uv).rgb;\n"
    "          { vec2 cq = vUv - .5; vec2 off = cq * dot(cq, cq) * aK2.x * px * 22.; c.r = texture2D(tC, uv + off).r; c.b = texture2D(tC, uv - off).b; }   // [amb2] aberrazione ai bordi\n")
# nitidezza regolabile, poi la profondità di campo
rep("c = max(c + (c - nb*.25) * .38 * (1. - smoothstep(dc*1.08, dc*1.5, d)), 0.); }",
    "c = max(c + (c - nb*.25) * aK2.y * (1. - smoothstep(dc*1.08, dc*1.5, d)), 0.); }\n"
    "          float coc = 0.; { float ty = abs(vUv.y - aFoc.y) * 1.15 + abs(vUv.x - aFoc.x) * .35;   // [amb2] obiettivo basculante: nitido attorno al giocatore\n"
    "            coc = clamp(smoothstep(.26, .62, ty) + smoothstep(dc*1.1, dc*1.8, d) * .4, 0., 1.) * aK.z;\n"
    "            c = mix(c, texture2D(tBlur, vUv).rgb, coc); }")
rep("c = mix(c, c*.55 + vec3(.02,.025,.04), ol*.42);", "c = mix(c, c*.55 + vec3(.02,.025,.04), ol*aK2.z*(1.-coc));   // [amb2]")
rep("c *= 1. - ao/8.*.42; }", "c *= 1. - ao/8.*.42*(1.-coc*.7); }")
# via gli aloni a campioni sparsi (li fa il bloom)
cut("          // aloni: le zone molto luminose", "          if (vOn > .01) {", "")
# raggi di sole nella nebbia bassa: dopo le ombre nella nebbia delle lampade
rep("            c += vol * vOn * .24; }",
    "            c += vol * vOn * .24; }\n"
    "          if (sOn > .01) {   // [amb2] raggi di sole: l'aria bassa prende l'ombra vera del sole\n"
    "            float z1 = texture2D(tD, uv).r;\n"
    "            if (z1 < .9999) { vec4 wq = vInvVP * vec4(uv * 2. - 1., z1 * 2. - 1., 1.); wq.xyz /= wq.w;\n"
    "              vec3 rv = vCam - wq.xyz; float Lr = length(rv); rv /= Lr; float tmx = min(Lr, 16. / max(rv.y, .2)), stp = tmx / 18., jt = bayer(floor(vUv * res)), acc = 0., wsum = 0.;\n"
    "              for (int k = 0; k < 18; k++) { vec3 qq = wq.xyz + rv * (float(k) + jt) * stp; float hh = qq.y - wq.y, dn = exp(-hh * .16); acc += vSh(sSM, sSMat, qq) * dn; wsum += dn; }\n"
    "              float lit = acc / max(wsum, 1e-3);\n"
    "              c = c * mix(1., .86, sOn * (1. - lit)) + sCol * lit * sOn; } }")
# bloom, esposizione, curva filmica, grana: al posto della vecchia curva, delle righe e del retino
cut("          c = c*1.32/(1.+c*.5);", "          c += flash*vec3(.9,.2,.3);",
    "          // ===== [amb2] bloom, esposizione, curva filmica ACES, grana =====\n"
    "          c += (texture2D(tBloom, vUv).rgb * .55 + texture2D(tBloom2, vUv).rgb * .75) * aK.y;\n"
    "          c *= aK.x;\n"
    "          c = clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.);\n"
    "          { float gn = fract(sin(dot(floor(vUv * res) + fract(aTime * 7.13) * 91.7, vec2(12.9898, 78.233))) * 43758.5453) - .5; float lg = dot(c, vec3(.3,.59,.11));\n"
    "            c += gn * aK.w * (1. - lg * .6); }\n")
# vignetta più morbida, da obiettivo
rep("vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;", "vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25*aK2.w;   // [amb2]")

# ---------------------------------------------------------------- 4. UNIFORM DAL FOTOGRAMMA ----------------
rep("    renderer.render(postScene, postCam);\n  }",
    "    {   // [amb2] la macchina da presa\n"
    "      const A = AMB, dk = 1 - night; U.tBloom.value = APS.rts[3] ? APS.rts[3].texture : null; U.tBloom2.value = APS.rts[5] ? APS.rts[5].texture : null; U.tBlur.value = APS.rts[7] ? APS.rts[7].texture : null;\n"
    "      A.thr = A.thrDay + (A.thrNight - A.thrDay) * night; U.aK.value.set(A.expo * (.84 + night * .28), A.bloom * (.22 + night * .78), A.dof * (pveh ? .45 : 1) * (p.indoor ? 0 : 1), A.grain); U.aK2.value.set(A.ca, A.sharp, A.outline, A.vig); U.aTime.value = time;\n"
    "      { const fp = project(p.x, 1, p.y); U.aFoc.value.set(Math.min(.9, Math.max(.1, fp.x)), Math.min(.9, Math.max(.1, 1 - fp.y))); }\n"
    "      const sOK = !LOWQ.on && !p.indoor && !indoorNow && moon.castShadow && moon.shadow.map && dk > .05;\n"
    "      U.sOn.value = sOK ? A.shafts * dk * (1 - dyn.meteo.w[0] * .85) : 0;\n"
    "      if (sOK) { U.sSM.value = moon.shadow.map.texture; U.sSMat.value.copy(moon.shadow.matrix);\n"
    "        const k = (.07 + dyn.meteo.w[2] * .12 + dusk * .06) * moon.intensity; U.sCol.value.set(moon.color.r * k, moon.color.g * k * .97, moon.color.b * k * .9); }\n"
    "      if (!sOK) U.sSM.value = null;\n"
    "    }\n"
    "    renderer.render(postScene, postCam);\n  }")

# ---------------------------------------------------------------- 5. VAPORE: POCHI TOMBINI, NON UNA NUVOLA DI PALLINE ----------------
# Erano 70 sfiati da 5 sprite, tinti dalle lampade: di notte la città sembrava piena di palline sfocate. Ora fuma un tombino su quattro,
# i barili col fuoco sì, e il vapore è più trasparente; col bagnato e con la nebbia torna di più.
rep("s.sp.material.opacity = (1 - t) * Math.min(1, t * 5) * (.42 + night * .3) * (dyn.meteo ?",
    "s.sp.material.opacity = (s.k < .9 && (Math.floor(s.x * 3 + s.z * 7) & 3) !== 0 && !(dyn.meteo && dyn.meteo.w[2] > .6) ? 0 : .55) * (1 - t) * Math.min(1, t * 5) * (.42 + night * .3) * (dyn.meteo ?")

open(p, 'w', encoding='utf-8').write(s); print('ok [amb2]')
