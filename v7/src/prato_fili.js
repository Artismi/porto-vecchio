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
  const P = TEL ? { R: 11, sp: .2, res: .5, marg: 4, wk: 1.35 } : { R: 18, sp: .2, res: .5, marg: 4, wk: 1 };   // wk: la larghezza delle lame (sul telefono, a 1 px per px CSS, più larghe: niente fili da un pixel che friggono)
  P.passo = P.sp * Math.max(1, Math.round(2 / P.sp));   // l'origine si sposta a multipli del passo della griglia: le lame restano dove sono
  const S = { on: false, lame: 0, tri: 0, msMappa: 0, rifatte: 0, err: null, mesh: null, P };
  window.__PRATOFILI = S;
  S.imposta = on => { S.spento = !on; if (Render.pratoFili) Render.pratoFili(on && S.mesh ? 1 : 0, MK && MK.t, MK && MK.w, MK && MK.h); if (window.__ERBA) window.__ERBA.d.value = on ? .25 : .45; if (S.mesh) S.mesh.visible = !!on; return !S.spento; };   // dal vivo, per le tavole: il prato di prima (B) o quello a fili

  // la tavolozza a macchie nel mondo: la stessa del suolo (Render.pratoPal la mette anche in prato9)
  const PAL = Render.pratoPal || '';
  const U = { uOrig: { value: new THREE.Vector2() }, uPl: { value: new THREE.Vector2() }, uR: { value: P.R }, uSp: { value: P.sp }, uT: { value: 0 },
    uData: { value: null }, uMask: { value: null }, uMskSz: { value: new THREE.Vector2(1, 1) }, uDmin: { value: new THREE.Vector2() }, uDsz: { value: new THREE.Vector2(1, 1) }, uH: { value: 1 }, uFiori: { value: .018 }, uVento: { value: 1 }, uWk: { value: P.wk } };

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
    const m = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aBase; uniform vec2 uOrig; uniform vec2 uPl; uniform float uR; uniform float uSp; uniform float uT; uniform highp sampler2D uData; uniform sampler2D uMask; uniform vec2 uMskSz; uniform vec2 uDmin; uniform vec2 uDsz;
uniform float uH; uniform float uFiori; uniform float uVento; uniform float uWk; varying vec3 vPCol; varying vec3 vPBase;
${PAL}`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0., 1., 0. );   // [prato_fili] la normale in su')
        .replace('#include <begin_vertex>', `vec3 transformed;
{ highp vec2 wb = uOrig + aBase;
  float h1 = pfH(wb * 1.7), h2 = pfH(wb * 2.3 + 5.1), h3 = pfH(wb * 3.1 + 9.7), h4 = pfH(wb.yx * 1.3 + 2.2), h5 = pfH(wb * 4.7 + 1.3);
  wb += (vec2(h1, h2) - .5) * uSp * .95;   // il caso della posizione: niente file
  vec4 D = texture2D(uData, (wb - uDmin) / uDsz);
  float keep = smoothstep(.35, .65, texture2D(uMask, wb / uMskSz).r) * (1. - smoothstep(uR * .45, uR, length(wb - uPl)));   // il prato c'è, e lontano si dirada fino a sparire
  float t = position.y, cl = pfN(wb * .35);
  float H = (.13 + .17 * h3) * (.75 + .55 * smoothstep(.5, .85, cl)) * uH;   // basso, a ciuffi un poco più alti
  float W = (.045 + .03 * h4) * uWk, an = h4 * 6.2832; vec2 nr = vec2(-sin(an), cos(an));
  vec2 lean = vec2(cos(h2 * 6.2832), sin(h2 * 6.2832)) * .3 * H * t * t;
  vec2 wind = vec2(sin(uT * 1.7 + wb.x * .35 + wb.y * .21) * .06 + sin(uT * 3.3 + wb.x * 1.1) * .015, cos(uT * 1.3 + wb.y * .3) * .03) * t * t * uVento;
  vec2 xz = wb + nr * position.x * W + lean + wind;
  transformed = vec3(xz.x, D.r + t * H, xz.y);
  if (h5 > keep) transformed = vec3(wb.x, -1000., wb.y);   // niente lama: tre triangoli in un punto
  vec3 bc = pratoPal(wb);
  float fl = pfH(wb * 6.1 + 3.);
  vec3 tip = fl < uFiori ? (fl < uFiori * .6 ? vec3(1., .85, .29) : vec3(.96, .94, .86)) : bc * 1.18 + vec3(.05, .07, -.01);
  vPCol = t < .7 ? mix(bc * .5, bc * 1.06, t / .7) : mix(bc * 1.06, tip, (t - .7) / .3);   // la base scura, la punta chiara (o un fiore)
  vPBase = vec3(wb.x, D.r + .12, wb.y); }`)
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
  // la quota del suolo e la maschera del prato attorno al personaggio (50 cm), ammorbidita sul bordo delle caselle
  let DT = null, dMin = null;
  function mappa(cx, cz) {
    const t0 = performance.now(), G = window.Game || (window.__pv && window.__pv.G); if (!G || !G.tileAt) return false;
    const Rm = P.R + P.marg, n = Math.ceil(2 * Rm / P.res) + 1, x0 = Math.floor((cx - Rm) / P.res) * P.res, z0 = Math.floor((cz - Rm) / P.res) * P.res;
    if (!DT || DT.image.width !== n) { DT = new THREE.DataTexture(new Float32Array(n * n * 4), n, n, THREE.RGBAFormat, THREE.FloatType); DT.minFilter = DT.magFilter = THREE.NearestFilter; DT.generateMipmaps = false; }
    const A = DT.image.data, TS = G.TS, GR = G.T.GRASS, gh = Render.groundH;
    const erba = (x, z) => G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === GR ? 1 : 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = x0 + i * P.res, z = z0 + j * P.res, o = (j * n + i) * 4;
      const m = erba(x, z) * .4 + (erba(x + .8, z) + erba(x - .8, z) + erba(x, z + .8) + erba(x, z - .8)) * .15;
      A[o] = gh(x, z); A[o + 1] = Math.min(1, Math.max(0, (m - .3) / .55)); A[o + 2] = 0; A[o + 3] = 1;
    }
    DT.needsUpdate = true; dMin = [x0, z0]; U.uData.value = DT; U.uDmin.value.set(x0 - P.res / 2, z0 - P.res / 2); U.uDsz.value.set(n * P.res, n * P.res);
    S.msMappa = +(performance.now() - t0).toFixed(2); S.rifatte++; return true;
  }

  function tick(st) {
    const sc = Render.__models && Render.__models.scene; if (!sc || !st || !st.player) return;
    if (!S.mesh) { const rd = Render.__models.renderer; if (!rd || !rd.capabilities.isWebGL2) { S.err = 'serve WebGL2 (la tessitura in virgola mobile letta nel vertice)'; return; }
      try { S.mesh = new THREE.Mesh(geometria(), materiale()); S.mesh.name = 'pratoFili'; S.mesh.frustumCulled = false; S.mesh.castShadow = false; S.mesh.receiveShadow = true; S.mesh.matrixAutoUpdate = false; sc.add(S.mesh); S.on = true;
        if (window.__ERBA) window.__ERBA.d.value = Math.min(window.__ERBA.d.value, .25);
        if (!maschera()) { S.err = 'manca la mappa'; }
        if (Render.pratoFili && MK) Render.pratoFili(1, MK.t, MK.w, MK.h);   // il suolo sotto e oltre le lame coi loro colori, dove la mappa dice prato   // i ciuffi alti di prima, radi: «qua e là», alla Ghibli
      } catch (e) { S.err = String(e); return; } }
    const p = st.player, ui = window.__pv && window.__pv.ui, via = !!(p.indoor || (p.lv && p.lv.k === 'ug') || (ui && ui.studio));
    S.mesh.visible = !via && !S.spento; if (via || S.spento) return;   // S.spento: spento dal vivo (le prove: window.__PRATOFILI.imposta(false))
    const px = p.x, pz = p.y;
    if (!dMin || Math.abs(px - (dMin[0] + P.R + P.marg)) > P.marg - 1 || Math.abs(pz - (dMin[1] + P.R + P.marg)) > P.marg - 1) { if (!mappa(px, pz)) { S.mesh.visible = false; return; } }
    U.uOrig.value.set(Math.round(px / P.passo) * P.passo, Math.round(pz / P.passo) * P.passo); U.uPl.value.set(px, pz); U.uT.value = performance.now() / 1000;
  }
  if (Render.frame && !Render.__pratoFili) { Render.__pratoFili = true; const f0 = Render.frame; Render.frame = function (st) { try { tick(st); } catch (e) { S.err = String(e); } return f0.apply(this, arguments); }; }
})();
