# [prato1] Il prato vero (Andrea: «il suolo del prato non ci sta, rendilo un prato vero»).
# Il terreno è dipinto a 8 px per metro: da vicino ogni filo d'erba era un pixel chiaro che, stirato sullo schermo, diventava
# una macchia tonda (il prato «a macchie di leopardo»), e il filtro del dettaglio lo marcava ancora di più.
# Ora, nel materiale del terreno, dove il suolo è verde:
#  1) la base si legge molto sfocata (quattro livelli di mipmap più su): i granelli chiari, dipinti color paglia, spariscono
#     nel verde e il prato si riconosce intero;
#  2) sopra, in coordinate di mondo, l'erba vera: fili stretti e lunghi su due strati incrociati, i fili chiari con la punta
#     calda, le fughe fra i fili scure e fredde; ciuffi a mezzo metro e zolle a qualche metro, più scuri o più chiari;
#     chiazze secche color paglia. Il colore resta quello dipinto (stagione, zona, neve), cambia solo la luce del filo.
#  3) da lontano i fili, più piccoli di un paio di pixel, sfumano nel loro tono medio: niente sfarfallio.
# Manopola in window.__AMB: prato (0 spento, 1 pieno). Dopo lucido1.py. Guardia [prato1].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[prato1]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# la manopola
rep("luc: 1, spec: .9, coat: .8, trans: 1, ol: .85 };", "luc: 1, spec: .9, coat: .8, trans: 1, ol: .85, prato: 1 /* [prato1] */ };")

# il materiale del terreno: l'erba si innesta nello shader standard
rep("  function buildChunk(ci, cj) {", r"""  // [prato1] il prato vero nel materiale del terreno (vedi strumenti_inverno/prato1.py)
  const PRATO9 = { k: { value: 1 } };
  function prato9(mat) {
    mat.customProgramCacheKey = () => 'suolo-prato9';
    mat.onBeforeCompile = sh => {
      sh.uniforms.uPrato9 = PRATO9.k;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGw9;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGw9 = (modelMatrix * vec4(transformed, 1.)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vGw9; uniform float uPrato9;
        float ph9(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float pn9(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(ph9(i), ph9(i + vec2(1., 0.)), f.x), mix(ph9(i + vec2(0., 1.)), ph9(i + 1.), f.x), f.y); }
        vec3 prato9(vec3 base, vec2 p){
          vec2 fw = fwidth(p); float mpp = max(fw.x, fw.y);                    // metri per pixel sullo schermo
          float aa = 1. - smoothstep(.025, .07, mpp), aa2 = 1. - smoothstep(.04, .12, mpp);
          float cl = pn9(p * 1.9) * .6 + pn9(p * 4.6 + 3.) * .4, zo = pn9(p * .21 + 11.), dryN = pn9(p * .55 + 31.);
          vec2 a = mat2(.96, .28, -.28, .96) * p, b = mat2(.93, -.37, .37, .93) * p;
          float s1 = pn9(a * vec2(19., 4.2)), s2 = pn9(b * vec2(29., 6.) + 5.), s3 = pn9(p * vec2(9., 2.4) + 17.);
          float bl = smoothstep(.55, .9, max(s1, s2 * .97)), gap = smoothstep(.32, .06, min(s1, s2));
          float tuft = smoothstep(.6, .85, s3) * smoothstep(.45, .7, cl);
          float k = .86 + (cl - .5) * .42 + (zo - .5) * .3;
          vec3 c = base * (k + (bl * .5 - gap * .38) * aa + tuft * .22 * aa2);
          c = mix(c, c * vec3(1.1, 1.07, .78), clamp(bl * aa * .55 + tuft * aa2 * .3, 0., 1.));   // la punta del filo, calda
          c = mix(c, c * vec3(.8, .94, 1.12), gap * aa * .6);                                    // le fughe, fredde
          float dry = smoothstep(.66, .84, dryN) * (1. - tuft);
          c = mix(c, vec3(dot(c, vec3(.3, .59, .11))) * vec3(1.32, 1.12, .66), dry * .4);       // chiazze secche
          return c; }`)
        .replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_MAP
        if (uPrato9 > .01) {   // [prato1] dove il suolo è verde
          vec3 sm9 = texture2D(map, vUv, 4.).rgb;   // molto sfocata: i granelli chiari spariscono nel verde e il prato si riconosce intero
          float gm9 = smoothstep(1.06, 1.3, sm9.g / max(max(sm9.r, sm9.b), .003)) * smoothstep(.008, .025, sm9.g) * uPrato9;
          if (gm9 > .001) diffuseColor.rgb = mix(diffuseColor.rgb, prato9(diffuse * sm9, vGw9.xz), gm9);
        }
        #endif`);
    };
    return mat;
  }
  function buildChunk(ci, cj) {""")
rep("    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .12,   /* [isola38] */ emissive: '#ffffff', emissiveMap: btex, emissiveIntensity: 0 });",
    "    const mat = prato9(new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0, roughnessMap: rtex, envMap: wetEnv(), envMapIntensity: .12,   /* [isola38] */ emissive: '#ffffff', emissiveMap: btex, emissiveIntensity: 0 }));   /* [prato1] */")
# la manopola arriva allo shader a ogni fotogramma
rep("{ U.lK.value.set(A.luc,", "PRATO9.k.value = A.prato === undefined ? 1 : A.prato;   /* [prato1] */\n      { U.lK.value.set(A.luc,")
open(p, 'w', encoding='utf-8').write(s); print('ok')
