/* Porto Vecchio — Il tono di strada: un filo d'inchiostro sulle sagome vicine, segni leggeri dove il colore salta,
   un retino appena nelle ombre, colore più pieno. Vive nel passaggio finale di render.js (devPass): nessun bersaglio nuovo,
   5 letture di profondità in più per pixel. render.js ci mette tre ganci: uniformi, il pezzo di GLSL, passo() a ogni fotogramma.
   Lo shader è sempre lo stesso (uniformi fisse): accenderlo o spegnerlo non ricompila niente.
   ?nostile lo spegne (anche ?nostrada, il nome di prima); sul telefono e con la qualità bassa è spento (il passaggio finale
   gira alla risoluzione vera dello schermo); ?stile_tel lo accende anche lì, per le prove.
   Le manopole: window.__STRADA (galleria.js, strumenti/manopole_strada.json per il prima e dopo). */
var PostStile = (function () {
  const Q = (typeof location !== 'undefined' && location.search) || '';
  const STRADA = { on: !/[?&](nostile|nostrada)\b/.test(Q), telefono: /[?&]stile_tel\b/.test(Q), contorno: .55, segni: .3, pieno: .35 };
  if (typeof window !== 'undefined') window.__STRADA = STRADA;

  const testa = `
        uniform sampler2D tD; uniform vec2 nf; uniform vec4 sK;   // [personaggi] sK: contorno, segni, colore pieno, (libero)
        float linD(vec2 q){ float z = texture2D(tD, q).r * 2. - 1.; return 2. * nf.x * nf.y / (nf.y + nf.x - z * (nf.y - nf.x)); }`;
  // usa c, n, s, w, r (il pixel e i quattro vicini già letti), e (un texel) e scrive su o
  const corpo = `
          if (sK.x + sK.y + sK.z > 0.) {
            vec3 LW = vec3(.299, .587, .114); float l = dot(o, LW);
            vec3 ink = o * vec3(.2, .16, .26);   // inchiostro: lo stesso colore, molto più scuro e un po' viola (niente nero piatto)
            if (sK.x > 0.) { float d = linD(vUv), dn = max(max(linD(vUv - vec2(0., e.y)), linD(vUv + vec2(0., e.y))), max(linD(vUv - vec2(e.x, 0.)), linD(vUv + vec2(e.x, 0.))));
              float sil = smoothstep(.03, .07, (dn - d) / d) * (1. - smoothstep(60., 180., d));   // solo il lato davanti del salto: la linea sta sull'oggetto, sottile, e svanisce lontano
              o = mix(o, ink, sil * sK.x); }
            if (sK.y > 0.) { float gl = max(abs(dot(n - s, LW)), abs(dot(w - r, LW)));
              o = mix(o, ink, smoothstep(.1, .28, gl) * sK.y * (1. - smoothstep(.75, .95, l)) * smoothstep(.04, .14, l));   // i salti di colore netti (orli, scritte, finestre) prendono un segno
              vec2 hp = gl_FragCoord.xy * .7071; hp = vec2(hp.x + hp.y, hp.y - hp.x) * .45;   // retino a 45° nelle ombre, appena
              float dot0 = length(fract(hp) - .5), rr = smoothstep(.03, .1, l) * (1. - smoothstep(.12, .32, l)) * .42;   // nei neri veri niente (di sera scuriva tutto)
              o *= 1. - (1. - smoothstep(rr - .08, rr + .08, dot0)) * sK.y * .35; }
            if (sK.z > 0.) { float l2 = dot(o, LW); vec3 sat = mix(vec3(l2), o, 1. + sK.z * .6);   // colore pieno e luci in gradini morbidi
              float q = floor(l2 * 4. + .5) / 4., lq = mix(l2, q, .35); o = max(sat * (lq / max(l2, 1e-3)), 0.) * sK.z + o * (1. - sK.z); }
          }`;

  const uniformi = () => ({ tD: { value: null }, nf: { value: new THREE.Vector2(1, 400) }, sK: { value: new THREE.Vector4(0, 0, 0, 0) } });
  function passo(U, o) {
    const on = STRADA.on && !o.lowq && (!o.phone || STRADA.telefono) && o.rt && o.rt.depthTexture;
    U.tD.value = on ? o.rt.depthTexture : null; U.nf.value.set(o.camera.near, o.camera.far);
    U.sK.value.set(on ? STRADA.contorno : 0, on ? STRADA.segni : 0, on ? STRADA.pieno : 0, 0);
  }
  return { STRADA, testa, corpo, uniformi, passo };
})();
if (typeof window !== 'undefined') window.PostStile = PostStile;
