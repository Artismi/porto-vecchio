# [lucido1] Plastica lucida (Andrea: «lo shader lo rende ancora più piatto e grigio scuro; serve qualcosa che lo ravvivi, dia
# tridimensionalità e definisca con un outline alcuni oggetti… come se fosse plastica lucida semitrasparente, i colori prendono
# vita come se fossero bagnati, tutto sembra super definito, con outline puliti»).
# Cosa spegneva l'immagine, tutto nel post finale: la pennellata di Kuwahara (appiattisce), la tavolozza a 52 colori, il regime
# che in città toglieva quasi metà della saturazione, la foschia che scolora, i bianchi sporcati, gli azzurri spenti, il
# cemento verdastro, l'inchiostro prugna su ogni piega e mattone.
# Ora: quei filtri via o ridotti; dalla profondità si ricostruisce la normale di ogni superficie e ci si mette sopra
#  1) colori bagnati: più saturi e profondi nei medi, i neri non grigi;
#  2) traslucenza: nelle zone in ombra il materiale si accende un poco del suo colore (la luce lo attraversa);
#  3) lacca: riflesso del cielo a radente (Fresnel) e il punto di luce del sole sulle facce rivolte a lui;
#  4) contorno pulito: solo la sagoma di un oggetto staccato dal fondo, una riga della sua tinta scurita.
# Manopole in window.__AMB: luc (colori), spec (punto di luce), coat (lacca), trans (traslucenza), ol (contorno).
# Dopo unione11.py (e pulitore2.py). Guardia [lucido1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[lucido1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# manopole: via la pennellata, la tavolozza e l'inchiostro vecchio; le nuove
rep("paint: .35 /* [unione11] meno grana, l'identità delle texture resta */, pal: .5, sat: 1.25, ink: .5, rim: .5, cav: 1, clar: .3 };",
    "paint: 0, pal: 0, sat: 1.25, ink: 0, rim: .6, cav: .85, clar: .32, luc: 1, spec: .9, coat: .8, trans: 1, ol: .85 };   /* [lucido1] via pennellata, tavolozza e inchiostro prugna */")
rep("sharp: .06 /* [unione11] */, outline: .3,", "sharp: .1 /* [lucido1] */, outline: 0,")
rep("const AMB = { expo: .96,", "const AMB = { expo: 1.12 /* [lucido1] più luce */,")

# uniformi
rep("uniform vec4 pK; uniform vec2 pC;   // [amb3]", "uniform vec4 lK; uniform vec3 lSun; uniform vec3 lSunC; uniform float lOl;   // [lucido1]\n        uniform vec4 pK; uniform vec2 pC;   // [amb3]")
rep("uFoc9: { value: 30 }, tC: { value: null },", "uFoc9: { value: 30 }, lK: { value: new THREE.Vector4(1, .9, .8, 1) }, lSun: { value: new THREE.Vector3(.4, .8, .3) }, lSunC: { value: new THREE.Vector3(1, 1, 1) }, lOl: { value: .85 },   /* [lucido1] */ tC: { value: null },")

rep("        float hs11(vec2 p){", "        vec3 wpos9(vec2 u){ vec4 q = vInvVP * vec4(u * 2. - 1., texture2D(tD, u).r * 2. - 1., 1.); return q.xyz / q.w; }   // [lucido1]\n        float hs11(vec2 p){")
# il passaggio della plastica lucida, prima delle ombre nella nebbia
rep("          if (vOn > .01) {   // [luci4] ombre nella nebbia", """          if (lK.x > .01) {   // [lucido1] plastica lucida: colori bagnati, traslucenza, lacca, punto di luce, contorno pulito
            float z9 = texture2D(tD, uv).r;
            if (z9 < .9999) {
              vec3 w9 = wpos9(uv);
              // la normale dalla profondità a 2 texel (la profondità a gradini, a 1 texel, dava righe); per asse il lato senza salto
              vec2 o9x = vec2(px.x * 2., 0.), o9y = vec2(0., px.y * 2.);
              vec3 ax = wpos9(uv + o9x) - w9, bx = w9 - wpos9(uv - o9x), ay = wpos9(uv + o9y) - w9, by = w9 - wpos9(uv - o9y);
              vec3 tx9 = dot(ax, ax) < dot(bx, bx) ? ax : bx, ty9 = dot(ay, ay) < dot(by, by) ? ay : by;
              vec3 n9 = cross(tx9, ty9); float nl9 = length(n9); n9 = nl9 > 1e-7 ? n9 / nl9 : vec3(0., 1., 0.);
              vec3 V9 = normalize(vCam - w9); if (dot(n9, V9) < 0.) n9 = -n9;
              float jump9 = max(max(abs(d1 - d), abs(d2 - d)), max(abs(d3 - d), abs(d4 - d)));
              float ok9 = (1. - smoothstep(.12 * (1. + d * .01), .45 * (1. + d * .012), jump9)) * (1. - coc);   // sugli spigoli la normale è sporca
              vec3 L9 = normalize(lSun), H9 = normalize(L9 + V9);
              float ndv = clamp(dot(n9, V9), 0., 1.), ndl = dot(n9, L9), day9 = 1. - night;
              float lu9 = dot(c, vec3(.3,.59,.11));
              // 1) colori bagnati: più saturi, i medi più profondi, i neri restano colore
              vec3 sat9 = max(mix(vec3(lu9), c, 1.5), 0.);
              c = mix(c, sat9 * (1. - .1 * smoothstep(.5, .05, lu9)), lK.x);
              // 2) traslucenza: in ombra il materiale si accende del suo colore, come plastica che lascia passare la luce
              float sh9 = 1. - smoothstep(.05, .38, lu9); vec3 hue9 = max(c, 1e-4) / max(max(max(c.r, c.g), c.b), 1e-4);
              c += hue9 * sh9 * lK.w * (.035 + .05 * day9) * (1. - coc);
              // 3) lacca: il cielo riflesso a radente, il punto di luce del sole (stretto) col suo alone (largo)
              float fr9 = pow(1. - ndv, 4.) * .85 + .03;
              vec3 sky9 = mix(mix(uHz, vec3(.78,.88,1.), .55), vec3(.1,.14,.26), night);
              c += sky9 * fr9 * .42 * lK.z * ok9;
              float nh9 = max(dot(n9, H9), 0.), lit9 = smoothstep(-.05, .15, ndl);
              c += lSunC * (pow(nh9, 70.) * .9 + pow(nh9, 9.) * .12) * lit9 * lK.y * ok9;
              // 4) contorno pulito: la sagoma di un oggetto staccato dal fondo, della sua tinta scurita (niente su pieghe e mattoni)
              // e le pieghe: spigoli e cambi di piano dentro la sagoma (seconda derivata della profondità, in proporzione al texel), più leggere
              float far9 = max(max(d1 - d, d2 - d), max(d3 - d, d4 - d)), near9 = max(max(d - d1, d - d2), max(d - d3, d - d4));
              float tS9 = d * .536 / res.y * .55 + .004, s9 = max(abs(d1 + d2 - 2. * d), abs(d3 + d4 - 2. * d));
              float ol9 = smoothstep(.02 * d + .28, .035 * d + .5, far9);
              float cr9 = smoothstep(tS9 * 1.7, tS9 * 2.6, s9) * (1. - smoothstep(.02 * d + .28, .035 * d + .5, near9)) * .6;   // sul lato di fondo di una sagoma no: la linea c'è già
              float gr9 = step(c.r * .9, c.g) * step(c.b * 1.05, c.g) * smoothstep(.02, .08, c.g - min(c.r, c.b));   // nel fogliame la linea si alleggerisce
              float farK9 = 1. - smoothstep(dc * 1.3, dc * 2.2, d) * .6;
              float line9 = max(ol9, cr9) * (1. - gr9 * .7) * farK9 * lOl * (1. - coc);
              c = mix(c, c * .14 + vec3(.012,.016,.04), clamp(line9, 0., 1.)); }   // blu notte scurito della tinta dell'oggetto
          }
          if (vOn > .01) {   // [luci4] ombre nella nebbia""")

# il regime spegneva la città: resta un'ombra di grigio, i colori vivono
rep("float sN = mix(.94, 1.12, sunK) * (1. - uWx.z*.18), sR = .58 + sunK*.06;", "float sN = mix(1., 1.14, sunK) * (1. - uWx.z*.18), sR = .9 + sunK*.06;   /* [lucido1] il regime non spegne più i colori */")
rep("c = mix(c, vec3(dot(c, vec3(.3,.59,.11)))*vec3(.98,1.,.98), uReg*.12*(1.-keep));", "c = mix(c, vec3(dot(c, vec3(.3,.59,.11)))*vec3(.98,1.,.98), uReg*.03*(1.-keep));   /* [lucido1] */")
rep("c = mix(c, mix(vec3(dot(c, vec3(.3,.59,.11))), c, .3), cy*uReg*.85); }", "c = mix(c, mix(vec3(dot(c, vec3(.3,.59,.11))), c, .3), cy*uReg*.2); }   /* [lucido1] gli azzurri tornano */")
rep("c *= 1. - smoothstep(.62,.95,lu)*.08*uReg*(1.-keep); }", "}   /* [lucido1] i bianchi restano puliti */")
# la foschia scolorava anche a mezza distanza
rep("vec3 hz = mix(uHz*.92, vec3(.02,.022,.026), night), cd = mix(c, vec3(lc0), .55 + uWx.z*.3);",
    "vec3 hz = mix(uHz*.92, vec3(.02,.022,.026), night), cd = mix(c, vec3(lc0), .25 + uWx.z*.3);   /* [lucido1] */")
rep("c = mix(c, mix(cd, hz, .5 + uWx.z*.3), far01 * (.34 + uWx.x*.08 + uWx.z*.3 - night*.14)); }",
    "c = mix(c, mix(cd, hz, .5 + uWx.z*.3), far01 * (.18 + uWx.x*.08 + uWx.z*.3 - night*.08)); }   /* [lucido1] */")
# le ombre: fredde ma non grigie, un filo più chiare (la plastica non diventa mai nera)
rep("float k = mix(1.12, 1.42, sunK), lo = .36;", "float k = mix(1.1, 1.32, sunK), lo = .34;   /* [lucido1] */")
# ombre verde-blu come nel riferimento (la stanza in pixel art), mai grigie
rep("vec3 shT = mix(vec3(.94,.9,1.08), vec3(.96,.91,1.08), uReg);   /* [unione11] ombre violette */", "vec3 shT = vec3(.86,.98,1.14);   /* [lucido1] ombre verde-blu */")

# ogni fotogramma: direzione e colore del sole, manopole
rep("U.pK.value.set(A.pal, A.sat, A.ink, A.rim); U.pC.value.set(A.cav, A.clar);   /* [amb3] */",
    """U.pK.value.set(A.pal, A.sat, A.ink, A.rim); U.pC.value.set(A.cav, A.clar);   /* [amb3] */
      { U.lK.value.set(A.luc, A.spec * (indoorNow || p.indoor ? .5 : 1), A.coat, A.trans); U.lOl.value = A.ol;   /* [lucido1] il sole per la lacca */
        U.lSun.value.subVectors(moon.position, moon.target.position).normalize(); const sk = (.55 * dk + .12 * night) * Math.min(1.4, moon.intensity);
        U.lSunC.value.set(moon.color.r * sk, moon.color.g * sk, moon.color.b * sk); }""")
open(p, 'w', encoding='utf-8').write(s); print('ok')
