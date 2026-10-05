# [amb1] AMBIENTE 1: meteo, peso del regime, colore unico, sole vero, cielo che segue il tempo, pioggia al posto della neve.
# Direzione (Andrea, 5 ottobre): niente neve; la città resta del regime (cemento, rosso, luce calda delle lampade),
# la natura e la luce prendono colore ma con misura (ombre colorate e non grigie, salto di valore, lontananza chiara).
# Il tempo cambia: sereno, velato, coperto, pioggia, nebbia, burrasca.
#
# Si applica PER ULTIMO, dopo tutta la catena (inverno_render*, monte, interni, luci_regia*, case_render1, isola3x).
# Uso: python3 strumenti_inverno/ambiente1.py src/render.js
# Il blocco del colore nel post è sostituito per intero fra due ancore stabili (il calcolo della luminanza e la vignetta):
# quello che gli script precedenti ci hanno messo dentro viene rimpiazzato, non sommato.
# Commenti solo /* */ a fine riga nel codice JS (un // si mangerebbe il codice che segue).
import sys, re
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[amb1]' in s: print('già applicato'); sys.exit()
for g in ('[luci5]', '[isola37]'): assert g in s, 'manca ' + g + ': applica prima la catena'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# ---------------------------------------------------------------- 1. METEO E PESO DEL REGIME (JS) ----------------
METEO_JS = r'''
  // ================= [amb1] METEO E PESO DEL REGIME =================
  // Il tempo è deciso dall'ora di gioco (stesso tempo per tutti, ripetibile): un tempo ogni 4 ore, con 50 minuti per cambiare.
  // Ogni tempo è quattro numeri: nuvole (0 sole pieno, 1 coperto), bagnato, nebbia, tempesta. Le piogge della storia restano.
  // window.__meteo = 'pioggia' (o sereno, velato, coperto, nebbia, burrasca) forza un tempo per le prove; null lo libera.
  const WXS = { sereno: [.04, 0, 0, 0], velato: [.45, 0, .2, 0], coperto: [.85, .25, .25, 0], pioggia: [1, 1, .4, 0], nebbia: [.6, .45, 1, 0], burrasca: [1, 1, .3, 1] };
  const WXORD = [['sereno', .34], ['velato', .24], ['coperto', .17], ['pioggia', .12], ['nebbia', .07], ['burrasca', .06]];
  const METEO = { k: 'sereno', w: [0, 0, 0, 0], rain: 0, reg: 0 }, WXT = new THREE.Color();
  function wxSlot(slot) {
    const h = ((Math.imul(slot + 7, 2654435761) >>> 0) % 10000) / 10000, hr = (slot * 4) % 24;
    let a = 0, k = 'sereno'; for (const [n, p] of WXORD) { a += p; if (h < a) { k = n; break; } }
    if (k === 'nebbia' && !(hr < 10 || hr >= 18)) k = 'velato';   /* la nebbia viene la mattina presto e la sera */
    if (isStoryRain(slot * 240 + 120)) k = 'pioggia';
    return k; }
  function isStoryRain(t) { const h = t / 60; return (h > 22.5 && h < 27) || (h > 44 && h < 47); }
  function meteoAt(t, out) {
    out = out || { w: [0, 0, 0, 0] };
    const force = typeof window !== 'undefined' && window.__meteo && WXS[window.__meteo] ? window.__meteo : null;
    if (force) { out.k = force; WXS[force].forEach((v, i) => out.w[i] = v); }
    else { const slot = Math.floor(t / 240), f = (t - slot * 240) / 240, a = wxSlot(slot), b = wxSlot(slot + 1), m = Math.max(0, (f - .79) / .21), e = m * m * (3 - 2 * m);
      out.k = e < .5 ? a : b; for (let i = 0; i < 4; i++) out.w[i] = WXS[a][i] * (1 - e) + WXS[b][i] * e;
      if (isStoryRain(t)) { out.k = 'pioggia'; for (let i = 0; i < 4; i++) out.w[i] = Math.max(out.w[i], WXS.pioggia[i]); } }
    out.rain = out.k === 'pioggia' || out.k === 'burrasca' ? out.w[1] : 0;
    return out; }
  // peso del regime: 0 nella natura, 1 alla Base e nei luoghi del potere; le periferie stanno in mezzo
  const REGD = { prateria: 0, foresta: 0, perif_o: .45, centro: .8, perif_e: .6, base: 1, porto: .85 };
  function regimeAt(x, z) {
    const D = M.world && M.world.districtAt; if (!D) return .7;
    let a = 0; for (let k = -2; k <= 2; k++) a += REGD[D(x + k * 18)] ?? .6; a /= 5;
    if (zoneAt(x, z) === 'regime') a = Math.max(a, 1);
    return a; }
'''
rep("  function nightLevel(t) {", METEO_JS + "  function nightLevel(t) {")
rep("  function isRaining(t) { const h = t / 60; return (h > 22.5 && h < 27) || (h > 44 && h < 47); }",
    "  function isRaining(t) { return meteoAt(t).rain > .5; }   /* [amb1] la pioggia la decide il meteo (anche per l'audio) */")

# ---------------------------------------------------------------- 2. LUCE E CIELO NEL FOTOGRAMMA ----------------
rep("    const p = st.player, night = nightLevel(st.t), dusk = Math.min(1, duskLevel(st.t));",
    "    const p = st.player, night = nightLevel(st.t), dusk = Math.min(1, duskLevel(st.t));\n"
    "    meteoAt(st.t, METEO); { const rg = regimeAt(cam.x, cam.y); METEO.reg += (rg - METEO.reg) * Math.min(1, (dt || .016) * 1.5); } dyn.meteo = METEO;   /* [amb1] */\n"
    "    const WXc = METEO.w[0], WXwet = METEO.w[1], WXfog = METEO.w[2], WXst = METEO.w[3], SUNK = (1 - night) * (1 - WXc * .82);   /* [amb1] quanto sole arriva */")
# lontananza: il colore del cielo col tempo; il verde-acqua di FOGTEAL solo in città
rep("tmpC.lerp(FOGTEAL, .22 - night * .16).multiplyScalar(1 - night * .45);",
    "tmpC.lerp(FOGTEAL, (.22 - night * .16) * METEO.reg).multiplyScalar(1 - night * .45 * (1 - WXfog * .4)); /* [amb1] */")
# le luci del giorno: un sole vero (forte col sereno, sparisce col coperto), il cielo riempie quando è coperto.
# La riga [isola37] dei minimi di giorno è sostituita: il contrasto ora viene dalla luce, non dalla curva.
rep("    { const dayK = 1 - night; hemi.intensity = Math.max(hemi.intensity, .4 * dayK); moon.intensity = Math.max(moon.intensity, .65 * dayK); fillAmb.intensity = Math.max(fillAmb.intensity, .2 * dayK); }",
    "    { const dayK = 1 - night;   /* [amb1] sole e cielo secondo il tempo; la notte resta della regia luci */\n"
    "      hemi.intensity = Math.max(hemi.intensity, (.34 + WXc * .3) * dayK);\n"
    "      moon.intensity = Math.max(moon.intensity * (1 - WXc * .7 * dayK), (1.05 - WXc * .82) * dayK * (1 - dusk * .3));\n"
    "      fillAmb.intensity = Math.max(fillAmb.intensity, (.12 + WXc * .14) * dayK);\n"
    "      if (dayK > .5) { moon.color.set(dusk > .3 ? '#f0b088' : '#fff1d6').lerp(WXT.set('#e8ecf0'), WXc); hemi.color.set('#cfd8e4').lerp(WXT.set('#d6d8da'), WXc); hemi.groundColor.set('#6e6a58').lerp(WXT.set('#6a6c70'), WXc); }\n"
    "      else { hemi.color.set('#4a5878'); hemi.groundColor.set('#2c3650'); }\n"
    "      if (dyn.fill) dyn.fill.intensity *= 1 - WXc * .5; if (dyn.rim) dyn.rim.intensity *= 1 - WXc * .6; }")
# il sole gira davvero: da est la mattina a ovest la sera (prima era fisso rispetto alla camera)
rep("    moon.position.set(cam.x - 34 - dusk * 18, 22 - dusk * 8, cam.y - 30); moon.target.position.set(cam.x, 0, cam.y);",
    "    { const hh = (st.t / 60) % 24, sa = (hh - 13) / 12 * Math.PI, el = night > .5 ? 26 : Math.max(9, 34 - Math.abs(hh - 13) * 3.4);   /* [amb1] il sole gira, basso al mattino e alla sera */\n"
    "      moon.position.set(cam.x - Math.sin(sa) * 38 - 8, el, cam.y - 26 - Math.cos(sa) * 8); moon.target.position.set(cam.x, 0, cam.y); }")
# cielo: uniform del tempo
rep("U.night.value = night; U.dusk.value = dusk; U.time.value = time; const sunA",
    "U.night.value = night; U.dusk.value = dusk; U.time.value = time; if (U.wx) U.wx.value.set(WXc, WXwet, WXfog, METEO.reg); const sunA")
# acqua: il tempo arriva anche al mare
rep("U.fogN.value = scene.fog.near; U.fogF.value = scene.fog.far; }",
    "U.fogN.value = scene.fog.near; U.fogF.value = scene.fog.far; if (U.wx) U.wx.value.set(WXc, WXwet, WXfog, WXst); }")
# la nebbia del tempo accorcia la vista
rep("    scene.fog.near = lerp(walkDist + 12, 40, ease); scene.fog.far = lerp(walkDist + 120, 160, ease);",
    "    scene.fog.near = lerp(walkDist + 12, 40, ease) - WXfog * 30; scene.fog.far = lerp(walkDist + 120, 160, ease) - WXfog * 85;   /* [amb1] */")

# ---------------------------------------------------------------- 3. PIOGGIA AL POSTO DELLA NEVE ----------------
RAIN_OLD = s[s.index("    const R = dyn.rain; R.m.visible = NEVE && !p.indoor;"):s.index("    const Mo = dyn.motes;")]
assert 'R.m.material.opacity' in RAIN_OLD, 'blocco dei fiocchi cambiato'
RAIN_NEW = r'''    { const R = dyn.rain;   /* [amb1] pioggia: righe che cadono storte col vento; la neve resta spenta */
      if (!R.lines) { const lm = new THREE.LineBasicMaterial({ color: '#c4ccd6', transparent: true, opacity: 0, depthWrite: false, fog: false }); R.lines = new THREE.LineSegments(R.m.geometry, lm); R.lines.frustumCulled = false; R.lines.renderOrder = 5; scene.add(R.lines); }
      R.m.visible = false; const rk = METEO.rain, on = rk > .02 && !p.indoor; R.lines.visible = on;
      if (on) { const nOn = Math.floor(R.N * Math.min(1, rk) * (.55 + WXst * .45)), span = 60 + (ui.zoom || 1) * 18, wind = 3 + WXst * 9, fall = 26 + WXst * 6;
        for (let i = 0; i < R.N; i++) { const s = R.seeds[i]; if (i >= nOn) { R.pos.set([0, -50, 0, 0, -50, 0], i * 6); continue; }
          const y = cam.h + 20 - ((time * fall * (.8 + s[2] * .4) + s[2] * 20) % 20), x = cam.x + (s[0] - .5) * span + (20 - (y - cam.h)) * wind / fall * 4, z = cam.y + (s[1] - .5) * span, L = .55 + s[2] * .35;
          R.pos.set([x, y, z, x - wind / fall * L, y + L, z], i * 6); }
        R.m.geometry.attributes.position.needsUpdate = true; R.lines.material.opacity = (.22 + rk * .2) * (1 - night * .35); }
    }
'''
s = s.replace(RAIN_OLD, RAIN_NEW)

# fiato: solo quando fa freddo (notte, pioggia, nebbia)
rep("sp.material.opacity = Math.sin(u * Math.PI) * (.16 + night * .1); sp.visible = true;",
    "sp.material.opacity = Math.sin(u * Math.PI) * (.16 + night * .1) * Math.min(1, night * .8 + (dyn.meteo ? dyn.meteo.w[1] * .6 + dyn.meteo.w[2] * .5 : 0)); sp.visible = sp.material.opacity > .01;   /* [amb1] */")
# riflessi sull'asfalto: forti solo sul bagnato
rep("m.material.opacity = night * (L.spill ? .4 : .72) * Math.min(1, L.base / 2);",
    "m.material.opacity = night * (L.spill ? .4 : .72) * Math.min(1, L.base / 2) * (.3 + .7 * (dyn.meteo ? dyn.meteo.w[1] : 1)); /* [amb1] solo il bagnato specchia */")

# ---------------------------------------------------------------- 4. CIELO E ORIZZONTE ----------------
rep("uniforms: { night: { value: 1 }, dusk: { value: 0 }, sun: { value: new THREE.Vector3(-1, .1, -.3).normalize() }, time: { value: 0 } },",
    "uniforms: { night: { value: 1 }, dusk: { value: 0 }, sun: { value: new THREE.Vector3(-1, .1, -.3).normalize() }, time: { value: 0 }, wx: { value: new THREE.Vector4() } },   /* [amb1] */")
rep("      fragmentShader: `uniform float night; uniform float dusk; uniform vec3 sun; uniform float time; varying vec3 vD;",
    "      fragmentShader: `uniform float night; uniform float dusk; uniform vec3 sun; uniform float time; uniform vec4 wx; varying vec3 vD;")
rep("          vec3 dayTop = vec3(.56,.60,.66), dayHor = vec3(.80,.81,.82);",
    "          vec3 dayTop = mix(vec3(.46,.60,.76), vec3(.58,.60,.63), wx.x), dayHor = mix(vec3(.80,.84,.86), vec3(.74,.75,.76), wx.x);   /* [amb1] sereno azzurro pallido, coperto grigio */")
rep("  function horizonColor(night, dusk, out) {\n    const day = new THREE.Color(.76, .77, .79),",
    "  function horizonColor(night, dusk, out) {   /* [amb1] col sereno la lontananza è chiara e appena azzurra, col coperto grigia, con la nebbia lattea */\n"
    "    const w = METEO.w, day = new THREE.Color(.74, .80, .84).lerp(new THREE.Color(.70, .71, .72), w[0]).lerp(new THREE.Color(.80, .81, .80), w[2] * .7),")

# ---------------------------------------------------------------- 5. MARE ----------------
rep("fogC: { value: new THREE.Color() }, camP: { value: new THREE.Vector3() }, fogN: { value: 60 }, fogF: { value: 160 } },",
    "fogC: { value: new THREE.Color() }, camP: { value: new THREE.Vector3() }, fogN: { value: 60 }, fogF: { value: 160 }, wx: { value: new THREE.Vector4() } },   /* [amb1] */")
rep("uniform float fogN; uniform float fogF; varying vec3 vP;\n        void main(){\n          vec2 p = floor(vP.xz*6.)/6.;",
    "uniform float fogN; uniform float fogF; uniform vec4 wx; varying vec3 vP;\n        void main(){\n          vec2 p = floor(vP.xz*6.)/6.;")
rep("          vec3 deep = mix(vec3(.11,.15,.18), vec3(.03,.04,.07), night);\n          vec3 shal = mix(vec3(.24,.31,.33), vec3(.06,.10,.13), night);",
    "          vec3 deep = mix(mix(vec3(.08,.17,.24), vec3(.12,.15,.17), wx.x), vec3(.03,.04,.07), night);   /* [amb1] col sereno il mare è blu, col coperto piombo */\n"
    "          vec3 shal = mix(mix(vec3(.20,.36,.38), vec3(.24,.30,.31), wx.x), vec3(.06,.10,.13), night);")
rep("          float band = step(.82, w);", "          float band = step(.9 - wx.w*.26 - wx.y*.05, w);   /* [amb1] mare calmo col sereno, creste col vento */")

# ---------------------------------------------------------------- 6. POST: COLORE UNICO ----------------
rep("hurt: { value: 0 }, sat: { value: 1 }, dusk: { value: 0 }, night: { value: 1 },",
    "hurt: { value: 0 }, sat: { value: 1 }, dusk: { value: 0 }, night: { value: 1 }, uReg: { value: .7 }, uWx: { value: new THREE.Vector4() }, uHz: { value: new THREE.Color() },   /* [amb1] */")
rep("uniform float hurt; uniform float sat; uniform float dusk; uniform float night;\n",
    "uniform float hurt; uniform float sat; uniform float dusk; uniform float night; uniform float uReg; uniform vec4 uWx; uniform vec3 uHz;\n")
rep("    U.pillar.value = ease; U.dusk.value = dusk; U.night.value = night;",
    "    U.pillar.value = ease; U.dusk.value = dusk; U.night.value = night; U.uReg.value = METEO.reg; U.uWx.value.set(WXc, WXwet, WXfog, WXst); U.uHz.value.copy(scene.fog.color);   /* [amb1] */")
# lontananza: prende il colore del cielo e perde colore (prospettiva aerea); di notte resta il buio di luci5
a = s.index("          { float far01 = smoothstep(dc*1.02, dc*1.7, d);"); b = s.index("\n", s.index("c = mix(c, hz + c*.35", a))
s = s[:a] + """          { float far01 = smoothstep(dc*1.02, dc*1.7, d), lc0 = dot(c, vec3(.3,.59,.11));   /* [amb1] prospettiva aerea: lontano più chiaro, meno colore, il colore del cielo */
            vec3 hz = mix(uHz*.92, vec3(.02,.022,.026), night), cd = mix(c, vec3(lc0), .55 + uWx.z*.3);
            c = mix(c, mix(cd, hz, .5 + uWx.z*.3), far01 * (.34 + uWx.x*.08 + uWx.z*.3 - night*.14)); }""" + s[b:]
# il blocco del colore: dalla luminanza alla vignetta, tutto sostituito
a = s.index("          float l = dot(c, vec3(.299,.587,.114));"); b = s.index("          vec2 q = vUv-.5; c *= 1. - dot(q,q)*1.25;")
assert a < b
s = s[:a] + """          // ===== [amb1] COLORE UNICO: ora (night, dusk), peso del regime (uReg), tempo (uWx: nuvole, bagnato, nebbia, tempesta) =====
          { float l = dot(c, vec3(.299,.587,.114));
            float sunK = (1.-night)*(1.-uWx.x*.82);                               // quanto sole c'è
            float mxc = max(max(c.r,c.g),c.b), chroma = mxc - min(min(c.r,c.g),c.b);
            float hot = smoothstep(.5,.9,chroma*mxc*2.);                             // neon, fuoco, insegne
            float warmL = smoothstep(.06,.16,c.r-c.b)*smoothstep(.08,.28,mxc)*smoothstep(.55,.95,night);   // luce calda di notte
            float rosso = smoothstep(.12,.3,c.r-c.g)*smoothstep(.06,.2,c.r-c.b);    // il rosso del potere e delle lampade
            // 1) valore: salto deciso fra luce e ombra col sole, più morbido col coperto; la tinta non cambia
            float k = mix(1.12, 1.42, sunK), lo = .36;
            float l2 = max((l - lo)*k + lo, l*.25);
            l2 = l2 / (1. + max(l2 - .7, 0.)*1.2);
            c *= l2 / max(l, 1e-4);
            // 2) ombre colorate, non grigie: fredde e appena viola in città, verde-blu nella natura; luci calde dove c'è sole
            float shd = 1. - smoothstep(.04, .46, l2), hil = smoothstep(.32, .82, l2);
            vec3 shT = mix(vec3(.90,1.,1.07), vec3(.94,.96,1.08), uReg);
            vec3 hiT = mix(vec3(1.), mix(vec3(1.07,1.035,.93), vec3(1.035,1.015,.97), uReg), sunK);
            c *= mix(vec3(1.), shT, shd*(1.-warmL*.85)*(1.-night*.6));
            c *= mix(vec3(1.), hiT, hil*(1.-hot));
            // 3) saturazione: natura piena ma sobria; il regime spegne tutto tranne rossi, lampade e neon
            float lu = dot(c, vec3(.3,.59,.11));
            float keep = max(max(rosso*1.05, hot), warmL*.9);
            float sN = mix(.94, 1.12, sunK) * (1. - uWx.z*.18), sR = .58 + sunK*.06;
            float sv = max(mix(sN, sR, uReg), keep*mix(1.15, 1.05, uReg));
            c = mix(vec3(lu), c, sv*sat);
            c = mix(c, vec3(dot(c, vec3(.3,.59,.11)))*vec3(.98,1.,.98), uReg*.12*(1.-keep));   // cemento appena verdastro, da caserma
            { float cy = smoothstep(.03,.16, min(c.g,c.b)-c.r) * smoothstep(.06,.22, max(max(c.r,c.g),c.b)-min(min(c.r,c.g),c.b));
              c = mix(c, mix(vec3(dot(c, vec3(.3,.59,.11))), c, .3), cy*uReg*.85); }   // in città niente azzurri accesi (fontane, vetri)
            // 4) neri: un filo d'aria di giorno, buio vero di notte (luci5)
            c += vec3(.010,.012,.016)*(1.-night*.9);
            c = max(c - .022*night*(1.-smoothstep(.0,.3,lu)), 0.);
            c *= 1. - smoothstep(.62,.95,lu)*.08*uReg*(1.-keep); }                  // in città niente bianchi puliti
""" + s[b:]
# righe da monitor: solo dove comanda il regime
rep("          c *= 1. - .05*mod(floor(vUv.y*res.y), 2.);", "          c *= 1. - .05*uReg*mod(floor(vUv.y*res.y), 2.);   /* [amb1] i monitor del regime: in città sì, nel bosco no */")


# ---------------------------------------------------------------- 7. STAGIONE: INIZIO AUTUNNO ----------------
# Niente neve, prati verdi, qualche macchia gialla e rossiccia nel bosco (quelle di treeCol36 restano: sono l'autunno).
# Gli alberi spogli restano solo dove il vento li ha uccisi (cresta alta, prateria), non a metà del bosco.
rep("    if (e > 24) return q < .55 ? [pick(r, NM.bare), .34 + r() * .1] : ['Pine_5', .7 + r() * .2];",
    "    if (e > 24) return q < .2 ? [pick(r, NM.bare), .34 + r() * .1] : q < .55 ? [pick(r, NM.oak), .5 + r() * .15] : ['Pine_5', .7 + r() * .2];   /* [amb1] */")
rep("    if (e < 15) return q < .38 ? [pick(r, NM.oak), .66 + r() * .22] : q < .72 ? [pick(r, NM.bare), .4 + r() * .14] : [pick(r, NM.pine), .85 + r() * .3];",
    "    if (e < 15) return q < .64 ? [pick(r, NM.oak), .66 + r() * .22] : q < .7 ? [pick(r, NM.bare), .4 + r() * .14] : [pick(r, NM.pine), .85 + r() * .3];   /* [amb1] */")
rep("    return q < .55 ? [pick(r, NM.pine), .85 + r() * .35] : q < .85 ? [pick(r, NM.bare), .42 + r() * .12] : [pick(r, NM.oak), .7 + r() * .2];",
    "    return q < .55 ? [pick(r, NM.pine), .85 + r() * .35] : q < .6 ? [pick(r, NM.bare), .42 + r() * .12] : [pick(r, NM.oak), .7 + r() * .2];   /* [amb1] */")
rep("const STRAW = ['#a69668', '#8e7e52', '#b4a474', '#7c7048'], DEAD = ['#5a5240', '#6a5e48', '#4a4a3c'],",
    "const STRAW = ['#7e8a52', '#8e8a58', '#6a7a48', '#a09868'], DEAD = ['#4e5a3c', '#5a6444', '#4a4a3c'], /* [amb1] erba d'inizio autunno */")
rep("col = k2 > .12 ? `rgb(${86 + g},${80 + g},${48 + g / 2})` : `rgb(${62 + g},${72 + g},${40 + g / 2})`;",
    "col = k2 > .12 ? `rgb(${76 + g},${84 + g},${46 + g / 2})` : `rgb(${54 + g},${74 + g},${38 + g / 2})`;   /* [amb1] radure verdi */")
rep("pick(r, ['#9a8a58', '#7a7a48', '#5a6234', '#a89868'])", "pick(r, ['#8a8a54', '#6a7a44', '#5a6a34', '#9a9060'])")

# ---------------------------------------------------------------- 8. VAPORE E FUMO: SOLO COL FREDDO ----------------
# D'inverno ogni barile e ogni tombino fumava; ora il vapore si vede la notte, col bagnato e con la nebbia.
# I camini fumano poco di giorno (si cucina), il fumo si piega col vento della burrasca.
rep("s.sp.material.opacity = (1 - t) * Math.min(1, t * 5) * (.42 + night * .3); });",
    "s.sp.material.opacity = (1 - t) * Math.min(1, t * 5) * (.42 + night * .3) * (dyn.meteo ? .15 + .85 * Math.min(1, night * .35 + dyn.meteo.w[1] * .5 + dyn.meteo.w[2] * .7) : 1); });   /* [amb1] */")
rep("sp.material.opacity = Math.pow(1 - t, 1.3) * Math.min(1, t * 6) * (.62 - night * .2);",
    "sp.material.opacity = Math.pow(1 - t, 1.3) * Math.min(1, t * 6) * (.62 - night * .2) * (dyn.meteo ? (.3 + .3 * dyn.meteo.w[1]) * (1 - night * .6) : 1); if (dyn.meteo) sp.position.x += t * t * dyn.meteo.w[3] * 6;   /* [amb1] */")

open(p, 'w', encoding='utf-8').write(s); print('ok [amb1]')
