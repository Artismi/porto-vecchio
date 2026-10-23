/* Porto Vecchio — [peso] i vetri delle case in un secchio solo per settore (v7).
   Nelle case fuse (render.js fusione1, [pulitore1]) i vetri delle finestre erano un secchio per materiale e per settore: il vetro scuro
   (darkGlass) e i pannelli accesi dietro al vetro (litMat, dieci toni caldi più quello delle botteghe) differiscono solo per il colore,
   l'emissivo, la ruvidità e il metallo, ma ognuno faceva una mesh fusa e un disegno per settore. Qui tutti i materiali col marchio
   userData.vetro (opachi, MeshStandardMaterial, senza mappa) che a meno di quei quattro valori sono lo stesso materiale vanno in un secchio
   solo; i quattro valori vanno in una tavolozza (una tessitura in virgola mobile, due texel per voce, letta al texel esatto) e ogni vertice
   porta il suo numero (vt1). Nel materiale comune il colore e l'emissivo sono bianchi: diffuse × tavolozza = il colore di prima; emissive
   (= bianco × intensità, la curva della notte di FD1.emis) × tavolozza = l'emissivo di prima; ruvidità e metallo dalla tavolozza.
   Stesso shader, stessi numeri: l'immagine è la stessa. ?nopesovetro lo spegne (come [leggero], solo dove lo shader ha le righe attese). */
var PesoVetro = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&](nopeso|nopesovetro|noleggero)\b/.test(Q);
  // [peso] non solo i vetri: ogni materiale standard opaco senza mappa delle case (tinte, ruvidità, metallo, luce propria diversi) va nella stessa
  // tavolozza: un secchio per settore invece di uno per tinta-ruvidità-luce. ?nopesotinte: solo i vetri
  const TUTTI = ON && !/[?&]nopeso(tinte)?\b/.test(Q);
  const V = { col: [], idx: new Map(), ok: new Map(), W: 256, u: { value: null }, s: { value: null }, tex: null };
  const R = {
    dif: 'vec4 diffuseColor = vec4( diffuse, opacity );',
    emi: 'vec3 totalEmissiveRadiance = emissive;',
    rou: 'float roughnessFactor = roughness;',
    met: 'float metalnessFactor = metalness;',
  };
  function firma(sig) { return 'VT1|' + sig.replace(/\|color:[0-9a-f]{6}/, '').replace(/\|emissive:[0-9a-f]{6}/, '').replace(/\|roughness:[^|]*/, '').replace(/\|metalness:[^|]*/, ''); }
  function inietta(sh) {
    sh.uniforms.uVt1 = V.u; sh.uniforms.uVt1S = V.s;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float vt1; varying float vVt1;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvVt1 = vt1;');
    const C = window.THREE.ShaderChunk;
    let f = sh.fragmentShader.replace('#include <roughnessmap_fragment>', C.roughnessmap_fragment).replace('#include <metalnessmap_fragment>', C.metalnessmap_fragment);
    f = f.replace('#include <common>', '#include <common>\nvarying float vVt1; uniform sampler2D uVt1; uniform vec2 uVt1S;\nvec4 vt1T(float k) { return texture2D(uVt1, vec2((mod(k, uVt1S.x) + .5) / uVt1S.x, (floor(k / uVt1S.x) + .5) / uVt1S.y)); }')
      .replace(R.dif, 'float vtI1 = floor(vVt1 + .5); vec4 vtA1 = vt1T(vtI1 * 2.); vec4 vtB1 = vt1T(vtI1 * 2. + 1.); vec4 diffuseColor = vec4( diffuse * vtA1.rgb, opacity );')
      .replace(R.emi, 'vec3 totalEmissiveRadiance = emissive * vtB1.rgb;').replace(R.rou, 'float roughnessFactor = vtA1.a;').replace(R.met, 'float metalnessFactor = vtB1.a;');
    sh.fragmentShader = f;
  }
  // il materiale va in tavolozza? Solo vetri marcati, opachi, standard, senza mappa del colore, e solo se lo shader ha le quattro righe una volta
  function ok(m, sig, renderer) {
    if (!ON || !m || !m.userData || !(m.userData.vetro || TUTTI) || m.type !== 'MeshStandardMaterial' || m.transparent || m.map || !sig || !renderer.capabilities.isWebGL2) return null;
    const k = firma(sig); if (V.ok.has(k)) return V.ok.get(k);
    let res = null; const T = window.THREE, L = T.ShaderLib.standard;
    try { const sh = { vertexShader: L.vertexShader, fragmentShader: L.fragmentShader, uniforms: T.UniformsUtils.clone(L.uniforms), defines: {} }; m.onBeforeCompile(sh, renderer);
      const C = T.ShaderChunk, f = sh.fragmentShader.replace('#include <roughnessmap_fragment>', C.roughnessmap_fragment).replace('#include <metalnessmap_fragment>', C.metalnessmap_fragment);
      const una = s => f.split(s).length === 2;
      if (una(R.dif) && una(R.emi) && una(R.rou) && una(R.met) && (f.match(/\bdiffuse\b/g) || []).length === 2 && (f.match(/\bemissive\b/g) || []).length === 2 && (f.match(/\broughness\b/g) || []).length === 2 && (f.match(/\bmetalness\b/g) || []).length === 2) res = k;
    } catch (e) { res = null; }
    V.ok.set(k, res); return res;
  }
  function idx(m) {
    const c = m.color, e = m.emissive, k = [c.r, c.g, c.b, e.r, e.g, e.b, m.roughness, m.metalness].join(',');
    let i = V.idx.get(k); if (i === undefined) { i = V.col.length; V.idx.set(k, i); V.col.push([c.r, c.g, c.b, m.roughness, e.r, e.g, e.b, m.metalness]); } return i;
  }
  function tessitura() {
    if (!V.col.length) return; const T = window.THREE, W = V.W, n = V.col.length * 2, H = Math.max(1, Math.ceil(n / W)), a = new Float32Array(W * H * 4);
    V.col.forEach((c, i) => a.set(c, i * 8));
    const t = new T.DataTexture(a, W, H, T.RGBAFormat, T.FloatType); t.minFilter = t.magFilter = T.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    if (V.u.value) V.u.value.dispose(); V.u.value = t; V.s.value = new T.Vector2(W, H);
  }
  function prepara(c) { c.color.setRGB(1, 1, 1); c.emissive.setRGB(1, 1, 1); }
  return { ON, ok, idx, tessitura, prepara, inietta, get voci() { return V.col.length; } };
})();
if (typeof window !== 'undefined') window.PesoVetro = PesoVetro;
