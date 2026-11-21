/* Porto Vecchio — [prato_fili] IL PRATO A FILI (di serie; ?noprato_fili lo spegne).
   Il committente, coi due riferimenti (un campo di lame geometriche colorate a macchie larghe; un prato dipinto alla Ghibli): «un prato
   bello pieno, più basso ma denso, che non faccia vedere quasi il pavimento». Qui:
   - UN DISEGNO SOLO per tutto il prato vicino: una griglia di lame (5 vertici, 3 triangoli) attorno al personaggio, ferma nel mondo:
     l'origine si sposta a passi di griglia, e ogni lama prende il suo caso (posizione, altezza, piega, colore) dal punto del mondo, nel
     vertex shader. Dove non c'è prato (la mappa: le caselle GRASS, ammorbidite) o oltre il raggio la lama si chiude in un punto;
   - la densità cala con la distanza fino a sparire; oltre, il suolo (prato9 in render.js) è dipinto con la STESSA tavolozza a macchie
     (pratoPal), così il passaggio non si vede;
   - il colore: macchie larghe nel mondo (verde chiaro, verde, verde scuro, l'ombra blu-verde), la base scura e la punta chiara, qualche
     fiore giallo o bianco in punta; i ciuffi alti alla Ghibli sono quelli che c'erano (kit ed erba alta del tappeto), radi (ERBA.d);
   - la normale in su (le lame prendono la luce come il suolo), l'ombra del sole letta alla base della lama (morbida, tutta la lama
     uguale), il vento leggero in punta;
   - il telefono (profilo leggero): raggio 11 m, una lama ogni 20 cm (12,1 k lame nella griglia, 36 k triangoli, ~45% disegnati),
     lame più larghe; il computer 18 m e una ogni 20 cm (32 k lame, 97 k triangoli).
   Una tessitura sola, piccola (la quota del suolo e la maschera del prato a 50 cm, attorno al personaggio), rifatta quando ci si sposta
   di 3 m. window.__PRATOFILI: lo stato e i costi. Il modulo sta fuori dall'impronta dei tasselli (non tocca la città). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof THREE === 'undefined' || typeof Render === 'undefined') return;
  const Q = location.search || '';
  if (/[?&](noprato_fili|vecchio)\b/.test(Q) || window.PV_STUDIO) return;
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  const P = TEL ? { R: 9, sp: .16, Rg: 22, res: .75, marg: 4, wk: 1.7 } : { R: 15, sp: .14, Rg: 34, res: .75, marg: 4, wk: 1.3 };   // R: le lame; Rg: lo strato di suolo scuro; wk: la larghezza delle lame (larghe e piegate: una lama copre di più)
  P.passo = P.sp * Math.max(1, Math.round(2 / P.sp));   // l'origine si sposta a multipli del passo della griglia: le lame restano dove sono
  const S = { on: false, lame: 0, tri: 0, msMappa: 0, rifatte: 0, err: null, mesh: null, P };
  window.__PRATOFILI = S;
  S.imposta = on => { S.spento = !on; if (Render.pratoFili) Render.pratoFili(on && S.mesh ? 1 : 0, MK && MK.t, MK && MK.w, MK && MK.h); if (window.__ERBA) window.__ERBA.d.value = on ? .25 : .45; if (S.mesh) S.mesh.visible = !!on; if (S.suolo) S.suolo.visible = !!on; return !S.spento; };   // dal vivo, per le tavole: il prato di prima (B) o quello a fili

  // la tavolozza a macchie nel mondo: la stessa del suolo (Render.pratoPal la mette anche in prato9)
  const PAL = Render.pratoPal || '';
  const U = { uOrig: { value: new THREE.Vector2() }, uPl: { value: new THREE.Vector2() }, uR: { value: P.R }, uSp: { value: P.sp }, uT: { value: 0 },
    uData: { value: null }, uMask: { value: null }, uMskSz: { value: new THREE.Vector2(1, 1) }, uDmin: { value: new THREE.Vector2() }, uDsz: { value: new THREE.Vector2(1, 1) }, uDn: { value: 1 }, uRes: { value: P.res }, uRg: { value: P.Rg }, uOrig2: { value: new THREE.Vector2() }, uH: { value: 1 }, uFiori: { value: .035 }, uVento: { value: 1 }, uWk: { value: P.wk } };

  const HG2 = `\nuniform highp sampler2D uData; uniform vec2 uDmin; uniform float uDn; uniform float uRes;\nfloat pfQ(highp vec2 w){ highp vec2 q = (w - uDmin) / uRes; highp vec2 i = floor(q); vec2 f = vec2(q - i);\n  float a = texture2D(uData, (i + .5) / uDn).r, b = texture2D(uData, (i + vec2(1.5, .5)) / uDn).r, c = texture2D(uData, (i + vec2(.5, 1.5)) / uDn).r, d = texture2D(uData, (i + 1.5) / uDn).r;\n  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }`;
  function geometria() {
    const n = Math.ceil(2 * P.R / P.sp), N = n * n, pos = new Float32Array(N * 5 * 3), base = new Float32Array(N * 5 * 2), idx = new Uint32Array(N * 9);
    const F = [[-.5, 0], [.5, 0], [-.34, .5], [.34, .5], [0, 1]];   // la lama: base larga, a metà più stretta, la punta
    let v = 0, k = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const bx = -P.R + (i + .5) * P.sp, bz = -P.R + (j + .5) * P.sp, v0 = v;
      for (const [x, t] of F) { pos[v * 3] = x; pos[v * 3 + 1] = t; pos[v * 3 + 2] = 0; base[v * 2] = bx; base[v * 2 + 1] = bz; v++; }
      idx.set([v0, v0 + 1, v0 + 3, v0, v0 + 3, v0 + 2, v0 + 2, v0 + 3, v0 + 4], k); k += 9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aBase', new THREE.BufferAttribute(base, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    S.lame = N; S.tri = N * 3; return g;
  }
  function materiale() {
    const m = new THREE.MeshLambertMaterial({ color: '#c8c8c8', side: THREE.DoubleSide });   // [arte] la luce attenuata: la normale in su prende il sole pieno, le lame si accendevano
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aBase; uniform vec2 uOrig; uniform vec2 uPl; uniform float uR; uniform float uSp; uniform float uT; uniform sampler2D uMask; uniform vec2 uMskSz;
uniform highp sampler2D uData; uniform vec2 uDmin; uniform float uDn; uniform float uRes;
float pfQ(highp vec2 w){ highp vec2 q = (w - uDmin) / uRes; highp vec2 i = floor(q); vec2 f = vec2(q - i);   // la quota del suolo, bilineare fra i quattro texel
  float a = texture2D(uData, (i + .5) / uDn).r, b = texture2D(uData, (i + vec2(1.5, .5)) / uDn).r, c = texture2D(uData, (i + vec2(.5, 1.5)) / uDn).r, d = texture2D(uData, (i + 1.5) / uDn).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
uniform float uH; uniform float uFiori; uniform float uVento; uniform float uWk; varying vec3 vPCol; varying vec3 vPBase;
${PAL}`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0., 1., 0. );   // [prato_fili] la normale in su')
        .replace('#include <begin_vertex>', `vec3 transformed;
{ highp vec2 wb = uOrig + aBase;
  float h1 = pfH(wb * 1.7), h2 = pfH(wb * 2.3 + 5.1), h3 = pfH(wb * 3.1 + 9.7), h4 = pfH(wb.yx * 1.3 + 2.2), h5 = pfH(wb * 4.7 + 1.3);
  wb += (vec2(h1, h2) - .5) * uSp * .95;   // il caso della posizione: niente file
  float gy = pfQ(wb);
  float keep = smoothstep(.35, .65, texture2D(uMask, wb / uMskSz).r) * (1. - smoothstep(uR * .45, uR, length(wb - uPl)));   // il prato c'è, e lontano si dirada fino a sparire
  float t = position.y, cl = pfN(wb * .35);
  float gh = smoothstep(.78, .92, pfN(wb * .23 + 17.)) * step(.55, h1);   // i ciuffi alti alla Ghibli, qua e là
  float cv = smoothstep(6.5, 10.5, distance(vec3(wb.x, gy, wb.y), cameraPosition));   // [arte] vicino alla camera (sotto 4-8 m) le lame si abbassano, si assottigliano e spariscono: niente «foglie grandi» in primo piano
  float H = (.26 + .34 * h3 * h3) * (.8 + .5 * smoothstep(.5, .85, cl)) * (1. + 1.1 * gh) * uH * cv;   // il doppio di prima, altezze diverse
  float W = (.07 + .06 * h4) * uWk * (1. - .35 * gh) * mix(.35, 1., cv), an = h4 * 6.2832; vec2 nr = vec2(-sin(an), cos(an));
  vec2 lean = vec2(cos(h2 * 6.2832), sin(h2 * 6.2832)) * (.35 + .35 * h5) * H * t * t;   // piegata: copre di più
  vec2 wind = vec2(sin(uT * 1.7 + wb.x * .35 + wb.y * .21) * .06 + sin(uT * 3.3 + wb.x * 1.1) * .015, cos(uT * 1.3 + wb.y * .3) * .03) * t * t * uVento;
  vec2 xz = wb + nr * position.x * W + lean + wind;
  transformed = vec3(xz.x, gy + t * H * (1. - .25 * t * (.35 + .35 * h5)), xz.y);
  if (h5 > keep || cv < .04) transformed = vec3(wb.x, -1000., wb.y);   // niente lama: tre triangoli in un punto
  vec3 bc = pratoPal(wb) * (.78 + .44 * h3);   // la macchia del posto, e ogni lama un tono suo
  bc = mix(vec3(dot(bc, vec3(.3, .59, .11))), bc, .72);   // [arte] meno saturo: il passo finale lo rialza, e al sole pieno era «verde plastica»
  float fl = pfH(wb * 6.1 + 3.);
  vec3 tip = fl < uFiori ? (fl < uFiori * .55 ? vec3(1., .86, .3) : vec3(.97, .95, .88)) : mix(bc * 1.28, vec3(.74, .8, .46), .3);   // punte chiare, verso il giallino (o un fiore)
  vPCol = t < .7 ? mix(bc * .55, bc * 1.05, t / .7) : mix(bc * 1.05, tip, (t - .7) / .3);   // la base come il suolo scuro   // la base scura, la punta chiara (o un fiore)
  vPBase = vec3(wb.x, gy + .15, wb.y); }`)
        .replace('#include <shadowmap_vertex>', `#include <shadowmap_vertex>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * vec4( vPBase, 1. );   // [prato_fili] l'ombra letta alla base: la lama tutta in ombra o tutta al sole
#endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vPCol;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = vPCol;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( vNormal );   // [prato_fili] le due facce uguali');
    };
    m.customProgramCacheKey = () => 'pratoFili';
    return m;
  }

  // [prato_fili] la maschera del prato su tutta la mappa: una casella GRASS = 255, una tessitura da un byte per casella, filtrata (bordi
  // morbidi di una casella); la usano le lame e il suolo (render.js, prato9), così finiscono negli stessi punti
  let MK = null;
  function maschera() {
    const G = window.Game || (window.__pv && window.__pv.G); if (!G || !G.tileAt || !G.GW) return null;
    const W = G.GW, H = G.GH, A = new Uint8Array(W * H), GR = G.T.GRASS; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) A[j * W + i] = G.tileAt(i, j) === GR ? 255 : 0;
    const t = new THREE.DataTexture(A, W, H, THREE.RedFormat, THREE.UnsignedByteType); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
    MK = { t, w: W * G.TS, h: H * G.TS }; U.uMask.value = t; U.uMskSz.value.set(MK.w, MK.h); return MK;
  }
  // la quota del suolo attorno al personaggio (75 cm, letta bilineare nel vertice), fin dove arriva lo strato di suolo scuro
  let DT = null, dC = null;
  function mappa(cx, cz) {
    const t0 = performance.now(); if (!Render.groundH) return false;
    const Rm = P.Rg + P.marg, n = Math.ceil(2 * Rm / P.res) + 2, x0 = Math.floor((cx - Rm) / P.res) * P.res, z0 = Math.floor((cz - Rm) / P.res) * P.res;
    if (!DT || DT.image.width !== n) { DT = new THREE.DataTexture(new Float32Array(n * n * 4), n, n, THREE.RGBAFormat, THREE.FloatType); DT.minFilter = DT.magFilter = THREE.NearestFilter; DT.generateMipmaps = false; }
    const A = DT.image.data, gh = Render.groundH;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const o = (j * n + i) * 4; A[o] = gh(x0 + i * P.res, z0 + j * P.res); A[o + 3] = 1; }
    DT.needsUpdate = true; dC = [cx, cz]; U.uData.value = DT; U.uDmin.value.set(x0, z0); U.uDn.value = n;
    S.msMappa = +(performance.now() - t0).toFixed(2); S.rifatte++; return true;
  }
  // [prato_fili] LO STRATO DI SUOLO SCURO: il suolo del prato non lo dipinge un materiale solo (quello del terreno non arriva dappertutto: sul
  // prato chiaro della città il menta restava), quindi il prato si porta il suo suolo: una griglia a maglie di 1 m attorno al personaggio
  // (Rg), 3 cm sopra il terreno, la base scura della tavolozza; dove la maschera dice prato, e verso il bordo resta solo nel cuore delle
  // chiazze (il confine segue il prato, non un cerchio). Un disegno, ~4 k triangoli sul telefono
  function suoloGeo() {
    const n = Math.ceil(2 * P.Rg), N1 = n + 1, pos = new Float32Array(N1 * N1 * 3), idx = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const o = (j * N1 + i) * 3; pos[o] = -P.Rg + i; pos[o + 1] = 0; pos[o + 2] = -P.Rg + j; }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * N1 + i, b = a + N1; idx.push(a, b, b + 1, a, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); S.triSuolo = idx.length / 3; return g;
  }
  function suoloMat() {
    const m = new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, transparent: true, depthWrite: false });   // [arte] trasparente al bordo: il passaggio sul terreno chiaro sfuma (era un bordo netto)
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec2 uOrig2; varying vec2 vSW;' + HG2 + PAL)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0., 1., 0. );')
        .replace('#include <begin_vertex>', 'vec3 transformed; { highp vec2 w = uOrig2 + position.xz; vSW = w; transformed = vec3(w.x, pfQ(w) + .03, w.y); }');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vSW; uniform sampler2D uMask; uniform vec2 uMskSz; uniform vec2 uPl; uniform float uRg;\n' + PAL)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  float pA = smoothstep(.2, .8, texture2D(uMask, vSW / uMskSz).r) * (1. - smoothstep(uRg * .6, uRg, length(vSW - uPl))); if (pA < .01) discard;   // dove c e prato, sfumato sul bordo delle chiazze e verso il raggio')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = pratoPal(vSW) * .55 * (.9 + .2 * pfN(vSW * 1.7)); diffuseColor.a = pA;   // la base scura del prato, trasparente al bordo')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( vNormal );');
      sh.uniforms.uOrig2 = U.uOrig2; };
    m.customProgramCacheKey = () => 'pratoSuolo';
    return m;
  }

  function tick(st) {
    const sc = Render.__models && Render.__models.scene; if (!sc || !st || !st.player) return;
    if (!S.mesh) { const rd = Render.__models.renderer; if (!rd || !rd.capabilities.isWebGL2) { S.err = 'serve WebGL2 (la tessitura in virgola mobile letta nel vertice)'; return; }
      try { if (!maschera()) { S.err = 'manca la mappa'; return; }
        S.mesh = new THREE.Mesh(geometria(), materiale()); S.mesh.name = 'pratoFili'; S.mesh.frustumCulled = false; S.mesh.castShadow = false; S.mesh.receiveShadow = true; S.mesh.matrixAutoUpdate = false; sc.add(S.mesh);
        S.suolo = new THREE.Mesh(suoloGeo(), suoloMat()); S.suolo.name = 'pratoSuolo'; S.suolo.frustumCulled = false; S.suolo.castShadow = false; S.suolo.receiveShadow = true; S.suolo.matrixAutoUpdate = false; S.suolo.renderOrder = -1; sc.add(S.suolo);
        S.on = true;
        if (window.__ERBA) window.__ERBA.d.value = Math.min(window.__ERBA.d.value, .25);   // i ciuffi alti di prima, radi: «qua e là», alla Ghibli
        if (Render.pratoFili) Render.pratoFili(1, MK.t, MK.w, MK.h);   // anche il terreno, dove è suo, prende la base scura
      } catch (e) { S.err = String(e); return; } }
    const p = st.player, ui = window.__pv && window.__pv.ui, via = !!(p.indoor || (p.lv && p.lv.k === 'ug') || (ui && ui.studio)), vis = !via && !S.spento;
    S.mesh.visible = vis; S.suolo.visible = vis; if (!vis) return;   // S.spento: spento dal vivo (le prove: window.__PRATOFILI.imposta(false))
    const px = p.x, pz = p.y;
    if (!dC || Math.abs(px - dC[0]) > P.marg - 1 || Math.abs(pz - dC[1]) > P.marg - 1) { if (!mappa(px, pz)) { S.mesh.visible = S.suolo.visible = false; return; } }
    U.uOrig.value.set(Math.round(px / P.passo) * P.passo, Math.round(pz / P.passo) * P.passo); U.uOrig2.value.set(Math.round(px), Math.round(pz)); U.uPl.value.set(px, pz); U.uT.value = performance.now() / 1000;
  }
  if (Render.frame && !Render.__pratoFili) { Render.__pratoFili = true; const f0 = Render.frame; Render.frame = function (st) { try { tick(st); } catch (e) { S.err = String(e); } return f0.apply(this, arguments); }; }
})();
