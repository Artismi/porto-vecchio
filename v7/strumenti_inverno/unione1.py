# [unione1] Rifiniture dopo l'unione di tutti i rami (Andrea: «il mare non riflette», «i lampioni non sembrano proiettare ombre»,
# «è scurissimo»). Guardia [unione1]. Si applica per ULTIMO, dopo tutti gli altri script (case, strade, verde, ambiente, muri, isola38).
#  - lampioni: il palo torna a fare ombra col sole, con la luna e con gli altri lampioni; la sua lampada lo ignora
#    (era l'«ottagono scuro» ai piedi per cui [luci1] gli aveva tolto ogni ombra): profondità d'ombra propria che scarta i
#    frammenti entro 1,5 m dalla camera d'ombra prospettica, cioè dal faretto che sta nella testa del lampione;
#  - mare: riflette il cielo vero (stessa formula del cielo, Fresnel con la normale delle onde), scintillio del sole e della luna,
#    le luci di riva si allungano sull'acqua verso chi guarda, spezzate dalle onde; via i puntini rosa «neon» sparsi di notte;
#  - notte: resta buia (regia luci) ma si leggono sagome, strade e mare: un filo in più di luna e di cielo, neri meno schiacciati.
# Commenti a fine riga solo /* */.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# ---------- lampioni ----------
rep("  function addStatic(obj, noShadow) {", """  let LD1 = null;   /* [unione1] il palo del lampione fa ombra, ma non alla propria lampada */
  function lampDepth1() {
    if (LD1) return LD1;
    LD1 = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    LD1.onBeforeCompile = sh => {
      sh.vertexShader = 'varying vec3 vW1; varying vec3 vC1; varying float vP1;\\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\\n vW1 = (modelMatrix * vec4(transformed, 1.)).xyz; vec3 t1 = viewMatrix[3].xyz; vC1 = -vec3(dot(viewMatrix[0].xyz, t1), dot(viewMatrix[1].xyz, t1), dot(viewMatrix[2].xyz, t1)); vP1 = projectionMatrix[2][3] < -.5 ? 1. : 0.;');
      sh.fragmentShader = 'varying vec3 vW1; varying vec3 vC1; varying float vP1;\\n' + sh.fragmentShader.replace('void main() {', 'void main() {\\n if (vP1 > .5 && length(vW1.xz - vC1.xz) < 1.5 && vW1.y < vC1.y + 1.) discard;');
    };
    return LD1;
  }
  function addStatic(obj, noShadow) {""")
rep("(noShadow ? '|n' : '')", "(noShadow ? (noShadow === 'lamp' ? '|l' : '|n') : '')")
rep("m.castShadow = !b.noShadow;", "m.castShadow = !b.noShadow || b.noShadow === 'lamp'; if (b.noShadow === 'lamp') m.customDepthMaterial = lampDepth1();   /* [unione1] */")
rep("addStatic(g, true); curTag = null;   // [luci1] niente ombra propria", "addStatic(g, 'lamp'); curTag = null;   // [luci1] niente ombra propria /* [unione1] ma col sole, la luna e gli altri lampioni sì */")

# ---------- mare ----------
rep("fogF: { value: 160 }, wx: { value: new THREE.Vector4() } },   /* [amb1] */",
    "fogF: { value: 160 }, wx: { value: new THREE.Vector4() }, sun: { value: new THREE.Vector3(-1, .3, -.3).normalize() }, moonD: { value: new THREE.Vector3(0, 1, 0) }, lp: { value: Array.from({ length: 16 }, () => new THREE.Vector4()) }, lc: { value: Array.from({ length: 16 }, () => new THREE.Color()) } },   /* [amb1] */ /* [unione1] */")
rep("uniform float fogF; uniform vec4 wx; varying vec3 vP;\n        void main(){",
    """uniform float fogF; uniform vec4 wx; uniform vec3 sun; uniform vec3 moonD; uniform vec4 lp[16]; uniform vec3 lc[16]; varying vec3 vP;
        float hgt1(vec2 q){ return sin(q.x*1.3 + time*1.2 + sin(q.y*2.1+time)*1.5) * sin(q.y*3.1 - time*.8) * .5 + sin(q.x*.37 - q.y*.52 + time*.6) * .35 + sin(q.x*2.9 + q.y*2.3 - time*2.1) * .15; }   /* [unione1] */
        vec3 sky1(vec3 d){   /* [unione1] lo stesso cielo di buildSky, visto riflesso */
          float y = max(d.y, 0.);
          vec3 dayTop = mix(vec3(.46,.60,.76), vec3(.58,.60,.63), wx.x), dayHor = mix(vec3(.80,.84,.86), vec3(.74,.75,.76), wx.x);
          vec3 day = mix(dayHor, dayTop, smoothstep(0.,.5,y));
          vec3 du = mix(mix(vec3(.78,.62,.50), vec3(.52,.44,.48), smoothstep(0.,.14,y)), vec3(.22,.22,.30), smoothstep(.14,.6,y));
          vec3 ni = mix(vec3(.10,.11,.14), vec3(.02,.03,.05), smoothstep(0.,.45,y));
          vec3 c = mix(mix(day, du, dusk), ni, night*(1.-dusk*.55));
          return c + vec3(.9,.86,.8)*pow(max(0.,dot(d, sun)),18.)*.22*(1.-night); }
        void main(){""")
rep("""          float sp = step(.9, sin(p.x*3.7+time*2.)*sin(p.y*5.3-time*1.3));
          c += sp*mix(vec3(.5,.45,.3), vec3(1.,.35,.6), max(dusk, night*.7))*.35;""",
    """          float sp = step(.9, sin(p.x*3.7+time*2.)*sin(p.y*5.3-time*1.3));
          c += sp*mix(vec3(.5,.45,.3), vec3(.95,.6,.38), dusk)*.35*(1.-night);   /* [unione1] niente puntini rosa di notte */
          {   /* [unione1] il riflesso: cielo, sole, luna, luci di riva */
            float amp = .12 + wx.w*.25 + wx.y*.06, e = .25;
            vec2 dh = vec2(hgt1(p+vec2(e,0.)) - hgt1(p-vec2(e,0.)), hgt1(p+vec2(0.,e)) - hgt1(p-vec2(0.,e))) / (2.*e);
            vec3 N = normalize(vec3(-dh.x*amp, 1., -dh.y*amp)), V = normalize(camP - vP), R = reflect(-V, N); R.y = abs(R.y);
            float fr = clamp((.04 + .96*pow(1. - max(dot(N, V), 0.), 5.)) * 1.7 + .07, 0., .55);
            c = mix(c, sky1(R), fr);
            float sunK = (1. - night) * (1. - wx.x*.85), g = max(dot(R, normalize(sun)), 0.);
            c += mix(vec3(1.,.95,.85), vec3(1.,.62,.36), dusk) * (step(.9965, g)*1.6 + pow(g, 40.)*.35) * sunK;
            float mg = max(dot(R, normalize(moonD)), 0.);
            c += vec3(.62,.70,.88) * (step(.994, mg)*.7 + pow(mg, 30.)*.12) * night * (1. - wx.x*.8);
            vec3 acc = vec3(0.);
            for (int i = 0; i < 16; i++) { vec4 L = lp[i]; if (L.w <= 0.) continue;
              vec2 d = normalize(camP.xz - L.xz + vec2(1e-4)), q = vP.xz - L.xz; float t = dot(q, d), sd = q.x*d.y - q.y*d.x;
              float len = 2.5 + L.y*2.4, wid = .16 + max(t, 0.)*.06 + amp*.9, wob = hgt1(p*1.7 + L.xz) * (.18 + .05*max(t, 0.));
              float k = (1. - smoothstep(wid*.35, wid, abs(sd + wob))) * smoothstep(-.8, .3, t) * exp(-max(t, 0.)/len);
              acc += lc[i] * L.w * k * (.4 + .6*step(0., sin(t*6.5 - time*2.4 + hgt1(p*2.3)*3.))); }
            c += acc * night * (1. - smoothstep(.8, .97, m)); }""")
rep("    if (dyn.skyline) { dyn.skyline.position.set(camera.position.x, 8, camera.position.z);",
    """    if (dyn.water && dyn.water.uniforms.lp) {   /* [unione1] sole, luna e luci di riva per il riflesso del mare */
      const U = dyn.water.uniforms; if (dyn.sky) U.sun.value.copy(dyn.sky.material.uniforms.sun.value); U.moonD.value.copy(moon.position).sub(moon.target.position).normalize();
      if (frameN % 6 === 0 || !dyn.wl1) { const cx = cam.x, cz = cam.y; dyn.wl1 = LSRC.filter(L => { if (L.off || !(L.base > 0) || Math.abs(L.x - cx) > 70 || Math.abs(L.z - cz) > 70) return false; if (L.cw1 === undefined) L.cw1 = coastIn(L.x, L.z); return L.cw1 < 7; }).sort((a, b) => ((a.x - cx) ** 2 + (a.z - cz) ** 2) - ((b.x - cx) ** 2 + (b.z - cz) ** 2)).slice(0, 16); }
      for (let i = 0; i < 16; i++) { const L = dyn.wl1[i]; if (L && !L.off) { U.lp.value[i].set(L.x, L.y + .45, L.z, Math.min(1.6, L.base * .5)); U.lc.value[i].copy(L.color); } else U.lp.value[i].w = 0; } }
    if (dyn.skyline) { dyn.skyline.position.set(camera.position.x, 8, camera.position.z);""")

# ---------- notte leggibile ----------
rep("hemi.intensity = .22 + (1 - night) * .3 - night * .14;", "hemi.intensity = .22 + (1 - night) * .3 - night * .10; /* [unione1] */")
rep("fillAmb.intensity = .12 + (1 - night) * .12 - night * .1;", "fillAmb.intensity = .12 + (1 - night) * .12 - night * .07; /* [unione1] */")
rep("moon.intensity = .25 + (1 - night) * .77 - night * .11;", "moon.intensity = .25 + (1 - night) * .77 - night * .02; /* [unione1] la luna disegna le sagome */")
rep("c = max(c - .022*night*(1.-smoothstep(.0,.3,lu)), 0.);", "c = max(c - .012*night*(1.-smoothstep(.0,.3,lu)), 0.);   /* [unione1] neri meno schiacciati */")
open(p, 'w', encoding='utf-8').write(s); print('ok')
