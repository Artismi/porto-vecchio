/* Porto Vecchio — [texture] LE ERBACCE (di serie; ?noerbacce le spegne; window.__TEX.imposta(0) dal vivo con il resto del suolo con grinta).
   Il committente: «i fili d'erba che escono … ci manca vero dettaglio e grinta». I ciuffi fusi nella città (render.js buildVita1, tuft) sono
   pochi e a macchie; qui i fili che escono dove nessuno pulisce: AL PIEDE DEI MURI (la riga dove il muro tocca terra), AL PIEDE DEL CORDOLO E
   DEI GRADINI (dalla parte bassa: fra il cordolo e l'asfalto; il gradino si trova dalla quota della superficie, Render.groundH, quindi segue la
   geometria vera dei marciapiedi e delle scale), NELLE FUGHE del selciato e del porfido (radi), sulla TERRA e sulla GHIAIA (a ciuffi).
   Come prato_fili.js: UN DISEGNO SOLO, una griglia di posti attorno al personaggio ferma nel mondo (l'origine si sposta a passi di griglia),
   ogni posto prende il suo caso dal punto del mondo nel vertex shader; una mappa piccola attorno al personaggio (50 cm: la quota della
   superficie dove il ciuffo va, quanto ci cresce, e lo spostamento che lo porta sulla riga del muro o del gradino) rifatta a pezzi (≤ 2 ms a
   fotogramma) quando ci si sposta di 2,5 m. Dove non ci cresce niente il ciuffo si chiude in un punto (niente triangoli disegnati).
   Il ciuffo: 5 fili sottili (un triangolo l'uno, 1-2 cm alla base, 7-30 cm) stretti in 3-4 cm, base scura e punta chiara, verde o paglia a
   macchie, qualche punta fiorita; la normale in su (prende la luce come il suolo), l'ombra letta alla base, il vento appena. Lontano si
   abbassano e spariscono prima del raggio; oltre ci sono le erbacce dipinte nel suolo (pavimenti.js, txG). Nessuna ombra proiettata.
   Il costo: 1 disegno; telefono raggio 9 m, un posto ogni 40 cm (2.025 posti, 30 k vertici, ≤ 10 k triangoli, di solito qualche centinaio
   di ciuffi vivi); computer 14 m e 36 cm. La mappa 54² texel (47 KB). Fuori dall'impronta dei tasselli (non tocca la città).
   window.__ERBACCE: lo stato. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof THREE === 'undefined' || typeof Render === 'undefined') return;
  const Q = location.search || '';
  if (/[?&](noerbacce|vecchio)\b/.test(Q) || window.PV_STUDIO) return;
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  const P = TEL ? { R: 9, sp: .4, res: .5, marg: 4, nf: 5 } : { R: 14, sp: .36, res: .5, marg: 4, nf: 5 };   // nf: i fili per ciuffo
  P.passo = P.sp * Math.max(1, Math.round(2 / P.sp));   // l'origine si sposta a multipli del passo: i ciuffi restano dove sono
  const S = { on: false, ciuffi: 0, tri: 0, vivi: 0, msMappa: 0, rifatte: 0, err: null, mesh: null, P, spento: /[?&]notexture\b/.test(Q) };
  window.__ERBACCE = S;
  S.imposta = on => { S.spento = !on; if (S.mesh) S.mesh.visible = !!on; return !S.spento; };

  const U = { uOrig: { value: new THREE.Vector2() }, uPl: { value: new THREE.Vector2() }, uR: { value: P.R }, uSp: { value: P.sp }, uT: { value: 0 },
    uData: { value: null }, uDmin: { value: new THREE.Vector2() }, uDn: { value: 1 }, uRes: { value: P.res } };

  // la geometria: per posto nf fili sottili (un triangolo l'uno: due vertici alla base, uno in punta), stretti in un ciuffo
  function geometria() {
    const n = Math.ceil(2 * P.R / P.sp), N = n * n, V = N * P.nf * 3, pos = new Float32Array(V * 3), base = new Float32Array(V * 2);
    let v = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const bx = -P.R + (i + .5) * P.sp, bz = -P.R + (j + .5) * P.sp;
      for (let f = 0; f < P.nf; f++) for (const [x, t] of [[-.5, 0], [.5, 0], [0, 1]]) { pos[v * 3] = x; pos[v * 3 + 1] = t; pos[v * 3 + 2] = f; base[v * 2] = bx; base[v * 2 + 1] = bz; v++; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aBase', new THREE.BufferAttribute(base, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    S.ciuffi = N; S.tri = N * P.nf; S.vertici = V; return g;
  }
  function materiale() {
    const m = new THREE.MeshLambertMaterial({ color: '#c8c8c8', side: THREE.DoubleSide });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec2 aBase; uniform vec2 uOrig; uniform vec2 uPl; uniform float uR; uniform float uSp; uniform float uT;
uniform highp sampler2D uData; uniform vec2 uDmin; uniform float uDn; uniform float uRes; varying vec3 vECol; varying vec3 vEBase;
highp float ebH(highp vec2 p){ p = mod(p, 4096.); highp vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0., 1., 0. );   // [texture] la normale in su: il ciuffo prende la luce del suolo')
        .replace('#include <begin_vertex>', `vec3 transformed;
{ highp vec2 wb = uOrig + aBase;
  float h1 = ebH(wb * 1.7), h2 = ebH(wb * 2.3 + 5.1), h3 = ebH(wb * 3.1 + 9.7), h4 = ebH(wb.yx * 1.3 + 2.2);
  wb += (vec2(h1, h2) - .5) * uSp * .9;   // il caso della posizione: niente file
  highp vec2 q = (wb - uDmin) / uRes; highp vec2 ti = clamp(floor(q), vec2(0.), vec2(uDn - 1.));
  vec4 D = texture2D(uData, (ti + .5) / uDn);   // x la quota della superficie sulla riga, y quanto ci cresce, zw lo spostamento verso la riga (dal centro del texel)
  highp vec2 tc = uDmin + (ti + .5) * uRes, L = tc + D.zw; float ol = length(D.zw);
  if (ol > .01) { vec2 nr = D.zw / ol; wb -= nr * dot(wb - L, nr) * .85; }   // sulla riga del muro o del cordolo (resta un filo di caso)
  float dd = length(wb - uPl), fade = 1. - smoothstep(uR * .55, uR * .95, dd);
  float keep = step(h4, D.y) * fade;
  float fi = position.z, t = position.y, hf = ebH(wb * 5.3 + fi * 1.7), hg = ebH(wb * 7.1 + fi * 2.9), a = (h3 + fi * .618) * 6.2832;
  float H = (.07 + .15 * h3 * h3 + .07 * hf) * (.6 + .4 * D.y) * (.4 + .6 * fade), W = .012 + .01 * hg;   // fili sottili, alti 7-30 cm
  vec2 dir = vec2(cos(a), sin(a)), fa = vec2(cos(hg * 6.2832), sin(hg * 6.2832)), lean = dir * (.12 + .4 * hf) * H * t * t;   // diritti, la punta che piega appena
  vec2 wind = vec2(sin(uT * 1.9 + wb.x * .5 + fi), cos(uT * 1.4 + wb.y * .4)) * .02 * t * t;
  vec2 xz = wb + dir * .035 * hg + fa * position.x * W * (1. - t) + lean + wind;   // stretti in un ciuffo di 3-4 cm
  transformed = vec3(xz.x, D.x + t * H, xz.y);
  if (keep < .5 || D.y < .01) transformed = vec3(wb.x, -1000., wb.y);   // niente ciuffo: i triangoli in un punto
  float sec = step(.64, ebH(wb * .21 + 3.3) * .6 + h2 * .4);   // a macchie: paglia secca o verde
  vec3 bc = mix(vec3(.2, .36, .08), vec3(.5, .45, .18), sec) * (.8 + .4 * h1);
  float fl = ebH(wb * 6.1 + 3.) + fi * .0; vec3 tip = (fl < .06 && fi < .5) ? vec3(1., .84, .22) : (fl > .95 && fi < .5) ? vec3(.97, .95, .9) : bc * 1.3 + vec3(.04, .06, 0.);   // qualche fiore giallo o bianco
  vECol = mix(bc * .42, tip, t);
  vEBase = vec3(wb.x, D.x + .08, wb.y); }`)
        .replace('#include <shadowmap_vertex>', `#include <shadowmap_vertex>
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * vec4( vEBase, 1. );   // l'ombra letta alla base: tutto il ciuffo in ombra o al sole
#endif`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vECol;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = vECol;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  normal = normalize( vNormal );');
    };
    m.customProgramCacheKey = () => 'erbacce1';
    return m;
  }

  // ---------------- la mappa attorno al personaggio (a pezzi, ≤ 2 ms a fotogramma) ----------------
  // per texel di 50 cm: dove cresce (il piede dei muri, il cordolo, le fughe, la terra), la riga su cui stare, la quota lì
  const vn = (x, z) => { const h = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const i = Math.floor(x), j = Math.floor(z), u = x - i, v = z - j, s = t => t * t * (3 - 2 * t), a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
    return a + (b - a) * s(u) + (c - a) * s(v) + (a - b - c + d) * s(u) * s(v); };
  let DT = null, dC = null, JOB = null;
  function* lavoro(cx, cz) {
    const G = window.Game || (window.__pv && window.__pv.G), T = G.T, TS = G.TS || 2, gh = Render.groundH;
    const Rm = P.R + P.marg, n = Math.ceil(2 * Rm / P.res) + 2, x0 = Math.floor((cx - Rm) / P.res) * P.res, z0 = Math.floor((cz - Rm) / P.res) * P.res, A = new Float32Array(n * n * 4);
    const gT = (tx, ty) => tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH ? -1 : G.tileAt(tx, ty);
    let t0 = performance.now();
    for (let j = 0; j < n; j++) {
      if (performance.now() - t0 > 2) { yield; t0 = performance.now(); }
      for (let i = 0; i < n; i++) {
        const px = x0 + (i + .5) * P.res, pz = z0 + (j + .5) * P.res, tx = Math.floor(px / TS), ty = Math.floor(pz / TS), v = gT(tx, ty), o = (j * n + i) * 4;
        if (v < 0 || v === T.BLD || v === T.WATER || v === T.GRASS || v === T.PIER) continue;
        // il muro più vicino (le caselle BLD attorno, il bordo della casella)
        let dw = 9, wx = 0, wz = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { if ((a || b) && gT(tx + a, ty + b) !== T.BLD) continue; if (!a && !b) continue;
          const bx0 = (tx + a) * TS, bz0 = (ty + b) * TS, ddx = Math.max(bx0 - px, 0, px - bx0 - TS), ddz = Math.max(bz0 - pz, 0, pz - bz0 - TS), d = Math.hypot(ddx, ddz);
          if (d < dw) { dw = d; const sx = px < bx0 ? -1 : px > bx0 + TS ? 1 : 0, sz = pz < bz0 ? -1 : pz > bz0 + TS ? 1 : 0; const l = Math.hypot(sx * ddx, sz * ddz) || 1; wx = sx * ddx / l; wz = sz * ddz / l; } }
        const patch = vn(px / 5.5 + 13.1, pz / 5.5 - 4.7) * .7 + vn(px / 1.7, pz / 1.7) * .3;   // a macchie: dove nessuno pulisce
        let dens = 0, ox = 0, oz = 0;
        if (dw < .45) { dens = .25 + .75 * Math.max(0, Math.min(1, (patch - .38) * 3)); const foot = .07 + .05 * vn(px * 3, pz * 3); ox = -wx * (dw - foot); oz = -wz * (dw - foot); }   // il piede del muro
        else { const h0 = gh(px, pz); let gx = 0, gz = 0, dmax = 0;
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const d = gh(px + a * .3, pz + b * .3) - h0; if (d > dmax) { dmax = d; gx = a; gz = b; } }
          if (dmax > .07) {   // il cordolo (o un gradino): il ciuffo al suo piede, dalla parte bassa (fra il cordolo e l'asfalto, fra il gradino e il selciato)
            let lo = 0, hi = .3; for (let k = 0; k < 4; k++) { const m = (lo + hi) / 2; if (gh(px + gx * m, pz + gz * m) - h0 > dmax * .5) hi = m; else lo = m; }
            const st = Math.max(0, lo - .04); dens = .2 + .7 * Math.max(0, Math.min(1, (patch - .42) * 3)); ox = gx * st; oz = gz * st; }
          else if (v === T.VIA) dens = 0;   // in carreggiata niente
          else if (v === T.DIRT || v === T.GRAVEL || v === T.FIELD || v === T.SHRUB) dens = .1 + .4 * Math.max(0, Math.min(1, (patch - .45) * 2.5));
          else if (v === T.ROCK || v === T.CLIFF) dens = .12 * Math.max(0, (patch - .4) * 2);
          else if (v === T.COB || v === T.PIAZZA || v === T.WALK || v === T.QUAY || v === T.STAIRS) dens = .05 * Math.max(0, Math.min(1, (patch - .55) * 4));   // le fughe, radi
          else if (v === T.SAND) dens = .02 * Math.max(0, (patch - .6) * 3); }
        if (dens <= .005) continue;
        const sx = px + ox, sz = pz + oz, h = gh(sx, sz);   // la quota al piede (dalla parte bassa del gradino)
        A[o] = h; A[o + 1] = Math.min(1, dens); A[o + 2] = ox; A[o + 3] = oz;
      }
    }
    return { A, n, x0, z0, cx, cz };
  }
  function monta(r) {
    if (!DT || DT.image.width !== r.n) { if (DT) DT.dispose(); DT = new THREE.DataTexture(r.A, r.n, r.n, THREE.RGBAFormat, THREE.FloatType); DT.minFilter = DT.magFilter = THREE.NearestFilter; DT.generateMipmaps = false; }
    else DT.image.data = r.A;
    DT.needsUpdate = true; dC = [r.cx, r.cz]; U.uData.value = DT; U.uDmin.value.set(r.x0, r.z0); U.uDn.value = r.n; S.rifatte++;
    let vivi = 0; for (let i = 1; i < r.A.length; i += 4) if (r.A[i] > 0) vivi++; S.vivi = vivi;
  }

  function tick(st) {
    const sc = Render.__models && Render.__models.scene; if (!sc || !st || !st.player) return;
    if (!S.mesh) { const rd = Render.__models.renderer; if (!rd || !rd.capabilities.isWebGL2) { S.err = 'serve WebGL2 (la tessitura in virgola mobile letta nel vertice)'; return; }
      const G = window.Game || (window.__pv && window.__pv.G); if (!G || !G.tileAt || !Render.groundH) return;
      try { S.mesh = new THREE.Mesh(geometria(), materiale()); S.mesh.name = 'erbacce'; S.mesh.frustumCulled = false; S.mesh.castShadow = false; S.mesh.receiveShadow = true; S.mesh.matrixAutoUpdate = false; S.mesh.visible = false; sc.add(S.mesh); S.on = true; }
      catch (e) { S.err = String(e); return; } }
    const p = st.player, ui = window.__pv && window.__pv.ui, via = !!(p.indoor || (p.lv && p.lv.k === 'ug') || (ui && ui.studio));
    const px = p.x, pz = p.y;
    if (!JOB && (!dC || Math.abs(px - dC[0]) > P.marg - 1.5 || Math.abs(pz - dC[1]) > P.marg - 1.5)) { JOB = lavoro(px, pz); S.t0 = performance.now(); }
    if (JOB) { const t = performance.now(); const r = JOB.next(); S.msMappa = Math.max(S.msMappa * .9, performance.now() - t); if (r.done) { JOB = null; monta(r.value); } }
    const vis = !via && !S.spento && !!dC; S.mesh.visible = vis; if (!vis) return;
    if (dC && (Math.abs(px - dC[0]) > P.marg || Math.abs(pz - dC[1]) > P.marg)) { S.mesh.visible = false; return; }   // la mappa non copre ancora: meglio niente che fuori posto
    U.uOrig.value.set(Math.round(px / P.passo) * P.passo, Math.round(pz / P.passo) * P.passo); U.uPl.value.set(px, pz); U.uT.value = performance.now() / 1000;
  }
  // il ritardo di una mappa pronta (le prove): finisce subito il lavoro in corso
  S.subito = st => { const p = st.player; JOB = lavoro(p.x, p.y); let r; do r = JOB.next(); while (!r.done); JOB = null; monta(r.value); return S.vivi; };
  if (Render.frame && !Render.__erbacce) { Render.__erbacce = true; const f0 = Render.frame; Render.frame = function (st) { try { tick(st); } catch (e) { S.err = String(e); } return f0.apply(this, arguments); }; }
})();
