# [nebbia_zoom1] L'aria non brucia più l'immagine allargando la vista (Andrea: «si brucia tutto con la luce, e peggiora con lo
# zoom, la nebbia o non so cosa è di troppo»).
# Cosa succedeva: la nebbia della scena cominciava a «distanza della camera + 12 m» e chiudeva a «+ 120 m», margini fissi.
# Lo zoom (zoom1.py, fino a 4.2) moltiplica la distanza: a zoom 4 la camera sta a ~330 m dal giocatore e il bordo alto dello
# schermo a ~460 m, cioè tutto dentro la nebbia anche col sereno; col tempo nebbioso (−30/−85 m) il velo arrivava al giocatore.
# I banchi che scorrono (VX.fog) avevano distanze fisse (18–70 m) e forza fissa (.22) con qualsiasi tempo: da lontano coprivano
# quasi tutta la vista a chiazze lattee. La prospettiva aerea del post schiariva ancora il lontano, di più con la nebbia.
# Ora: la nebbia cresce con la distanza della camera (la stessa proporzione a ogni zoom), il tempo nebbioso la accorcia in
# proporzione, i banchi scalano con lo zoom e seguono il tempo (quasi spenti col sereno), il post schiarisce meno.
# Dopo zoom1.py. Guardia [nebbia_zoom1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[nebbia_zoom1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# 1) la nebbia della scena in proporzione alla distanza della camera
rep("scene.fog.near = lerp(walkDist + 12, 40, ease) - WXfog * 30; scene.fog.far = lerp(walkDist + 120, 160, ease) - WXfog * 85;   /* [amb1] */",
    "scene.fog.near = lerp(walkDist * 1.05 + 10 - WXfog * (walkDist * .25 + 12), 40 - WXfog * 30, ease); scene.fog.far = lerp(walkDist * 1.9 + 110 - WXfog * (walkDist * .45 + 50), 160 - WXfog * 85, ease);   /* [nebbia_zoom1] la stessa aria a ogni zoom */")

# 2) i banchi che scorrono: le distanze scalano con lo zoom, la forza segue il tempo
rep("uniforms: { time: { value: 0 }, col: { value: new THREE.Color('#c0c4ca') }, ctr: { value: new THREE.Vector2() }, amt: { value: .3 }, k: { value: k } },",
    "uniforms: { time: { value: 0 }, col: { value: new THREE.Color('#c0c4ca') }, ctr: { value: new THREE.Vector2() }, amt: { value: .3 }, k: { value: k }, zs: { value: 1 } },   /* [nebbia_zoom1] */")
rep("fragmentShader: `uniform float time; uniform vec3 col; uniform vec2 ctr; uniform float amt; uniform float k; varying vec3 vP;",
    "fragmentShader: `uniform float time; uniform vec3 col; uniform vec2 ctr; uniform float amt; uniform float k; uniform float zs; varying vec3 vP;")
rep("float d = distance(vP.xz, ctr);", "float d = distance(vP.xz, ctr) / zs;")
rep("float a = smoothstep(.38, .8, f) * smoothstep(18., 70., d) * amt;",
    "float a = smoothstep(.38, .8, f) * smoothstep(18., 70., d) * (1. - smoothstep(150., 205., d)) * amt;   // [nebbia_zoom1] il bordo del piano non si vede")
rep("U.amt.value = .22 - night * .15 - k * .06; /* [luci5] */ pl.position.x = cam.x; pl.position.z = cam.y; });",
    "const wf = dyn.meteo ? dyn.meteo.w[2] : 0, zs = Math.max(1, cam.zoom || 1); U.zs.value = zs; pl.scale.set(zs, zs, 1); U.amt.value = Math.max(0, (.07 + wf * .2) * (1 - night * .6) - k * .03); /* [nebbia_zoom1] col sereno quasi niente */ pl.position.x = cam.x; pl.position.z = cam.y; });")

# 3) la prospettiva aerea del post: meno latte sul lontano
rep("c = mix(c, mix(cd, hz, .5 + uWx.z*.3), far01 * (.18 + uWx.x*.08 + uWx.z*.3 - night*.08)); }",
    "c = mix(c, mix(cd, hz, .45 + uWx.z*.2), far01 * (.12 + uWx.x*.05 + uWx.z*.16 - night*.06)); }   /* [nebbia_zoom1] */")

# 4) i contorni a inchiostro sfumano con la nebbia: prima restavano netti sul lontano già sbiancato (la città «a matita»)
rep("uniforms: { uFoc9: { value: 30 },", "uniforms: { uFoc9: { value: 30 }, uFogNF: { value: new THREE.Vector2(100, 300) },   /* [nebbia_zoom1] */")
rep("uniform float uFoc9; uniform sampler2D tC;", "uniform float uFoc9; uniform vec2 uFogNF; uniform sampler2D tC;")
rep("* (1.-coc) * (1. - busyK) * (1. - smoothstep(dc*1.15, dc*1.9, d) * .55);",
    "* (1.-coc) * (1. - busyK) * (1. - smoothstep(dc*1.15, dc*1.9, d) * .55) * (1. - smoothstep(uFogNF.x, uFogNF.y, d) * .95);   /* [nebbia_zoom1] */")
rep("float line9 = max(ol9, cr9) * (1. - gr9 * .7) * farK9 * lOl * (1. - coc);",
    "float line9 = max(ol9, cr9) * (1. - gr9 * .7) * farK9 * lOl * (1. - coc) * (1. - smoothstep(uFogNF.x, uFogNF.y, d) * .95);   /* [nebbia_zoom1] */")
rep("U.uHz.value.copy(scene.fog.color);   /* [amb1] */", "U.uHz.value.copy(scene.fog.color); U.uFogNF.value.set(scene.fog.near, scene.fog.far);   /* [amb1] [nebbia_zoom1] */")

open(p, 'w', encoding='utf-8').write(s); print('ok')
