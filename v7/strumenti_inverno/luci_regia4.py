# [luci 4] Ombre nella nebbia: nebbia volumetrica nei coni dei faretti.
# Per ogni pixel il raggio della vista attraversa i coni delle 4 luci con ombra più vicine; a ogni passo si guarda la
# mappa d'ombra del faretto: dove un palo, una persona, un banco, una tettoia copre la luce, l'aria resta buia.
# Sono le strisce d'ombra nella foschia che mettono la nebbia in rilievo. Dopo luci_regia3.py.
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[luci4]' in s: print('già applicato'); sys.exit()
assert '[luci3]' in s, 'prima luci_regia3.py'
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:80], s.count(old)); s = s.replace(old, new)

# uniform del post
rep("hurt: { value: 0 }, sat: { value: 1 }, dusk: { value: 0 }, night: { value: 1 } },",
    "hurt: { value: 0 }, sat: { value: 1 }, dusk: { value: 0 }, night: { value: 1 },\n        vInvVP: { value: new THREE.Matrix4() }, vCam: { value: new THREE.Vector3() }, vOn: { value: 0 }, vSM0: { value: null }, vSM1: { value: null }, vSM2: { value: null }, vSM3: { value: null },\n        vSMat: { value: [0, 1, 2, 3].map(() => new THREE.Matrix4()) }, vLP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, vLC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, vLD: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) } },   // [luci4]")

VOL = r"""
        #include <packing>
        uniform mat4 vInvVP; uniform vec3 vCam; uniform float vOn; uniform sampler2D vSM0; uniform sampler2D vSM1; uniform sampler2D vSM2; uniform sampler2D vSM3;
        uniform mat4 vSMat[4]; uniform vec4 vLP[4]; uniform vec3 vLC[4]; uniform vec4 vLD[4];
        float vSh(sampler2D sm, mat4 M, vec3 p){ vec4 q = M * vec4(p, 1.); q.xyz /= q.w; if (q.x < 0. || q.x > 1. || q.y < 0. || q.y > 1. || q.z > 1.) return 1.;
          return step(q.z - .0015, unpackRGBAToDepth(texture2D(sm, q.xy))); }
        vec3 vScat(sampler2D sm, mat4 M, vec4 LP, vec3 LC, vec4 LD, vec3 ro, vec3 rd, float tmax, float jit){
          if (dot(LC, LC) < 1e-5) return vec3(0.);
          vec3 oc = ro - LP.xyz; float b = dot(oc, rd), cc = dot(oc, oc) - LP.w * LP.w, h = b * b - cc; if (h <= 0.) return vec3(0.); h = sqrt(h);
          float t0 = max(-b - h, 0.), t1 = min(-b + h, tmax); if (t1 <= t0) return vec3(0.);
          float dt = (t1 - t0) / 14.; float acc = 0.;
          for (int k = 0; k < 14; k++) { vec3 q = ro + rd * (t0 + (float(k) + jit) * dt), v = q - LP.xyz; float dl = max(length(v), .3);
            float cone = smoothstep(LD.w, LD.w + .14, dot(v / dl, LD.xyz)), att = pow(max(0., 1. - dl / LP.w), 1.6) / (1. + dl * dl * .12);
            float w = cone * att; if (w < .003) continue; acc += w * vSh(sm, M, q); }
          return LC * acc * dt; }
        float lin(float d){"""
rep("\n        float lin(float d){", VOL)

# il raggio: dopo gli aloni larghi di luci2, prima del grading
rep("            c += wb * .085 * night; }   // [luci2] aloni nell'aria umida",
    """            c += wb * .05 * night; }   // [luci2] aloni nell'aria umida   [luci4] più deboli: la luce nell'aria ora la fa la nebbia con le ombre
          if (vOn > .01) {   // [luci4] ombre nella nebbia
            float z0 = texture2D(tD, uv).r; vec4 wp = vInvVP * vec4(uv * 2. - 1., z0 * 2. - 1., 1.); wp.xyz /= wp.w;
            vec3 rd = wp.xyz - vCam; float tm = length(rd); rd /= tm; float jit = bayer(floor(vUv * res));
            vec3 vol = vScat(vSM0, vSMat[0], vLP[0], vLC[0], vLD[0], vCam, rd, tm, jit) + vScat(vSM1, vSMat[1], vLP[1], vLC[1], vLD[1], vCam, rd, tm, jit)
                     + vScat(vSM2, vSMat[2], vLP[2], vLC[2], vLD[2], vCam, rd, tm, jit) + vScat(vSM3, vSMat[3], vLP[3], vLC[3], vLD[3], vCam, rd, tm, jit);
            c += vol * vOn * .36; }   // manopola: densità della nebbia con le ombre""")

# ogni fotogramma: le 4 luci con ombra più vicine al centro dell'inquadratura
rep("""    U.hurt.value = Math.max(hurtK, p.hp < 35 ? (.35 + Math.sin(time * 5) * .1) * (1 - p.hp / 35) : 0);
    renderer.render(postScene, postCam);""",
"""    U.hurt.value = Math.max(hurtK, p.hp < 35 ? (.35 + Math.sin(time * 5) * .1) * (1 - p.hp / 35) : 0);
    {   // [luci4] ombre nella nebbia: le 4 luci con ombra accese più vicine
      U.vInvVP.value.multiplyMatrices(camera.matrixWorld, camera.projectionMatrixInverse); U.vCam.value.copy(camera.position);
      U.vOn.value = (LOWQ.on || p.indoor || indoorNow) ? 0 : night;
      let j = 0;
      for (const l of SPOOL) { if (j >= 4) break; if (!(l.intensity > .02) || !l.castShadow || !l.shadow.map) continue;
        U['vSM' + j].value = l.shadow.map.texture; U.vSMat.value[j].copy(l.shadow.matrix);
        U.vLP.value[j].set(l.position.x, l.position.y, l.position.z, Math.min(l.distance || 10, 14));
        U.vLC.value[j].set(l.color.r, l.color.g, l.color.b).multiplyScalar(l.intensity);
        const tx = l.target.position.x - l.position.x, ty = l.target.position.y - l.position.y, tz = l.target.position.z - l.position.z, tl = Math.hypot(tx, ty, tz) || 1;
        U.vLD.value[j].set(tx / tl, ty / tl, tz / tl, Math.cos(l.angle)); j++; }
      for (; j < 4; j++) { U['vSM' + j].value = null; U.vLC.value[j].set(0, 0, 0); }
    }
    renderer.render(postScene, postCam);""")
# la luce senz'ombra (coni pieni, nebbiolina) cede il posto a quella con l'ombra, sennò riempie le strisce buie
rep("cone.material.opacity = .34 * Math.min(1, k); }", "cone.material.opacity = .1 * Math.min(1, k); }")
rep("const kk = night * Math.min(1.4, L.base * .35) * (L.spill ? .7 : 1);", "const kk = night * Math.min(1.4, L.base * .35) * (L.spill ? .7 : .35);")
open(p, 'w', encoding='utf-8').write(s); print('ok')
