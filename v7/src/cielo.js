/* Porto Vecchio — [apk_finale] IL CIELO (di serie; ?nocielo o ?vecchio come prima: il fondo è il colore piatto della nebbia).
   In lontananza si vedeva un grigio piatto: il fondo della scena è un colore solo (render.js: scene.background = la nebbia).
   Qui una cupola attorno alla camera, un programma solo e leggero: in basso esattamente il colore della nebbia (le case lontane ci si
   fondono senza stacco), verso l'alto il cielo della tavolozza (BIBBIA_STILE: cielo, oltremare, notte; all'alba e al tramonto pesca e
   viola, l'orizzonte caldo), e qualche nuvola dipinta: due ottave di rumore in bande morbide, colore carta di giorno, pesca al tramonto,
   lavagna di notte, che scorrono piano. Segue l'ora (Render.nightLevel). Non tocca la città né i tasselli (fuori dall'impronta). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof THREE === 'undefined') return;
  const Q = location.search || '';
  if (/[?&](nocielo|vecchio)\b/.test(Q) || window.PV_STUDIO) return;
  const C = h => new THREE.Color(h);
  const P = { cielo: C('#A3D4D8'), oltremare: C('#2F60B5'), notte: C('#202D5E'), nero: C('#16121B'), pesca: C('#F0BE8C'), viola: C('#6B3D9B'), carta: C('#F2E7CF'), lavagna: C('#3D3548'), lilla: C('#A68FB6') };
  const U = { uOriz: { value: new THREE.Color() }, uZen: { value: new THREE.Color() }, uNuv: { value: new THREE.Color() }, uNuvA: { value: .8 }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false, transparent: false,
    vertexShader: `varying vec3 vD; void main() { vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uOriz, uZen, uNuv; uniform float uNuvA, uT; varying vec3 vD;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
      void main() {
        float y = clamp(vD.y, 0., 1.);
        vec3 c = mix(uOriz, uZen, smoothstep(.0, .55, y));
        // le nuvole: sul piano del cielo, piatte verso l'orizzonte, a bande (dipinte, non vapore)
        vec2 q = vD.xz / max(y + .18, .18) * 1.6 + vec2(uT * .012, uT * .004);
        float v = n(q) * .65 + n(q * 2.3 + 7.1) * .35;
        float k = smoothstep(.56, .6, v) * .55 + smoothstep(.66, .7, v) * .45;
        k *= smoothstep(.02, .18, y) * uNuvA;
        gl_FragColor = vec4(mix(c, uNuv, k), 1.);
        #include <encodings_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
  dome.frustumCulled = false; dome.renderOrder = -1000; dome.name = 'cielo'; dome.matrixAutoUpdate = false;
  const ST = window.__cielo = { on: false };
  const t1 = new THREE.Color(), t2 = new THREE.Color();
  function aggiorna(st) {
    const R = window.Render, M = R && R.__models; if (!M || !M.scene || !R.getCamera) return; const sc = M.scene, cam = R.getCamera(); if (!cam || !sc.fog) return;
    if (dome.parent !== sc) { sc.add(dome); ST.on = true; }
    const r = (cam.far || 400) * .92; dome.position.copy(cam.position); dome.scale.setScalar(r); dome.updateMatrix(); dome.updateMatrixWorld(true);
    const night = Math.max(0, Math.min(1, R.nightLevel ? R.nightLevel(st.t) : 0)), hh = ((st.t / 60) % 24 + 24) % 24;
    const dusk = Math.max(0, 1 - Math.abs(hh - 19.6) / 1.6) + Math.max(0, 1 - Math.abs(hh - 6.4) / 1.3);
    U.uOriz.value.copy(sc.fog.color);
    // lo zenit: di giorno l'oltremare schiarito col cielo, al tramonto viola, di notte notte
    t1.copy(P.oltremare).lerp(P.cielo, .38); t1.lerp(P.viola, Math.min(1, dusk) * .55); t1.lerp(P.notte, night); t1.lerp(P.nero, night * .35);
    U.uZen.value.copy(t1);
    t2.copy(P.carta).lerp(P.pesca, Math.min(1, dusk)); t2.lerp(P.lavagna, night * .9);
    U.uNuv.value.copy(t2); U.uNuvA.value = .75 - night * .45; U.uT.value = st.t || 0;
  }
  // dopo render.js (che riscrive nebbia e fondo a ogni fotogramma): Render.frame avvolto
  function installa() {
    const R = window.Render; if (!R || !R.frame || R.__cielo) return !!(R && R.__cielo); R.__cielo = true;
    const f0 = R.frame; R.frame = function (st) { const r = f0.apply(this, arguments); try { if (st) aggiorna(st); } catch (e) { } return r; };
    return true;
  }
  if (!installa()) { const t = setInterval(() => { if (installa()) clearInterval(t); }, 200); }
})();
