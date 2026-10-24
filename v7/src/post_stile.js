/* Porto Vecchio — Il tono di strada: un filo d'inchiostro sulle sagome vicine, segni leggeri dove il colore salta,
   un retino appena nelle ombre, colore più pieno. Vive nel passaggio finale di render.js (devPass): nessun bersaglio nuovo,
   5 letture di profondità in più per pixel. render.js ci mette tre ganci: uniformi, il pezzo di GLSL, passo() a ogni fotogramma.
   Lo shader è sempre lo stesso (uniformi fisse): accenderlo o spegnerlo non ricompila niente.
   ?nostile lo spegne (anche ?nostrada, il nome di prima); sul telefono e con la qualità bassa è spento (il passaggio finale
   gira alla risoluzione vera dello schermo); ?stile_tel lo accende anche lì, per le prove.
   Le manopole: window.__STRADA (galleria.js, strumenti/manopole_strada.json per il prima e dopo). */
var PostStile = (function () {
  const Q = (typeof location !== 'undefined' && location.search) || '';
  const STRADA = { on: !/[?&](nostile|nostrada)\b/.test(Q), telefono: /[?&]stile_tel\b/.test(Q), contorno: .55, segni: .24, pieno: .45, tavolozza: 1 };
  if (typeof window !== 'undefined') window.__STRADA = STRADA;

  const testa = `
        uniform sampler2D tD; uniform vec2 nf; uniform vec4 sK;   // [personaggi] sK: contorno (e alone), segni, colore pieno, tavolozza pulita
        float linD(vec2 q){ float z = texture2D(tD, q).r * 2. - 1.; return 2. * nf.x * nf.y / (nf.y + nf.x - z * (nf.y - nf.x)); }`;
  // usa c, n, s, w, r (il pixel e i quattro vicini già letti), e (un texel) e scrive su o
  const corpo = `
          if (sK.x + sK.y + sK.z + sK.w > 0.) {
            vec3 LW = vec3(.299, .587, .114); float l = dot(o, LW);
            vec3 ink = o * vec3(.2, .16, .26);   // inchiostro: lo stesso colore, molto più scuro e un po' viola (niente nero piatto)
            if (sK.x > 0.) { float d = linD(vUv), d1 = linD(vUv - vec2(0., e.y)), d2 = linD(vUv + vec2(0., e.y)), d3 = linD(vUv - vec2(e.x, 0.)), d4 = linD(vUv + vec2(e.x, 0.));
              float dn = max(max(d1, d2), max(d3, d4)), dm = min(min(d1, d2), min(d3, d4)), lon = 1. - smoothstep(60., 180., d);
              float sil = smoothstep(.03, .07, (dn - d) / d) * lon;   // solo il lato davanti del salto: la linea sta sull'oggetto, sottile, e svanisce lontano
              float alo = smoothstep(.03, .08, (d - dm) / d) * lon;   // il lato dietro: il fondo accanto a una sagoma si schiarisce appena (persone, oggetti, case si staccano)
              o = mix(o, ink, sil * sK.x); o = mix(o, o * 1.12 + .035, alo * sK.x * .6); }
            if (sK.y > 0.) { float gl = max(abs(dot(n - s, LW)), abs(dot(w - r, LW)));
              o = mix(o, ink, smoothstep(.16, .34, gl) * sK.y * .8 * (1. - smoothstep(.75, .95, l)) * smoothstep(.04, .14, l));   // i salti di colore netti (orli, scritte, finestre) prendono un segno; sulle trame fini (tegole) niente velo scuro
              vec2 hp = gl_FragCoord.xy * .7071; hp = vec2(hp.x + hp.y, hp.y - hp.x) * .45;   // retino a 45° nelle ombre, appena
              float dot0 = length(fract(hp) - .5), rr = smoothstep(.03, .1, l) * (1. - smoothstep(.12, .32, l)) * .42;   // nei neri veri niente (di sera scuriva tutto)
              o *= 1. - (1. - smoothstep(rr - .08, rr + .08, dot0)) * sK.y * .22; }
            if (sK.z > 0.) { vec3 av = (n + s + w + r) * .25, dt = c - av; float dl = dot(dt, LW);   // il dettaglio: tegole, mattoni, assi, scritte (i gradini di luce di prima appiattivano le trame di giorno)
              o += vec3(clamp(dl, -.08, .08)) * sK.z * 1.1 * (1. - smoothstep(.85, 1., l));   // solo la luce: il colore delle trame non si sporca, e niente aloni sui salti grandi (clamp)
              float l2 = dot(o, LW), mx2 = max(o.r, max(o.g, o.b)), sa = (mx2 - min(o.r, min(o.g, o.b))) / max(mx2, 1e-3);   // colore pop: spinge di più i colori spenti, poco quelli già accesi (niente fluo)
              o = max(mix(vec3(l2), o, 1. + sK.z * (.75 - .5 * sa)), 0.); }
            if (sK.w > 0.) {   // la tavolozza pulita: via l'ocra e l'oliva impastati, ombre fredde e chiare invece che marroni
              vec4 K4 = vec4(0., -1. / 3., 2. / 3., -1.); vec4 pp = mix(vec4(o.bg, K4.wz), vec4(o.gb, K4.xy), step(o.b, o.g)); vec4 qq = mix(vec4(pp.xyw, o.r), vec4(o.r, pp.yzx), step(pp.x, o.r));
              float dd = qq.x - min(qq.w, qq.y); vec3 hsv = vec3(abs(qq.z + (qq.w - qq.y) / (6. * dd + 1e-5)), dd / (qq.x + 1e-5), qq.x); float hd = hsv.x * 360.;
              float ocra = smoothstep(26., 38., hd) * (1. - smoothstep(72., 90., hd)) * smoothstep(.08, .22, hsv.y);   // gialli sporchi, ocra, oliva
              hsv.x += (hd < 52. ? -1. : 1.) * ocra * sK.w * 14. / 360.;   // l'ocra verso il pesca e il cotto, l'oliva verso il verde fresco
              hsv.y = min(1., hsv.y * (1. + ocra * sK.w * .3)); hsv.z = min(1., hsv.z * (1. + ocra * sK.w * .06));
              vec3 rr3 = clamp(abs(fract(hsv.xxx + vec3(1., 2. / 3., 1. / 3.)) * 6. - 3.) - 1., 0., 1.); o = hsv.z * mix(vec3(1.), rr3, hsv.y);
              float l3 = dot(o, LW), sh = 1. - smoothstep(.06, .32, l3);
              o = mix(o, o * vec3(.92, .96, 1.14) + vec3(.014, .016, .034), sh * sK.w); }   // le ombre: un velo blu viola, alzate appena
          }`;

  const uniformi = () => ({ tD: { value: null }, nf: { value: new THREE.Vector2(1, 400) }, sK: { value: new THREE.Vector4(0, 0, 0, 0) } });
  function passo(U, o) {
    const on = STRADA.on && !o.lowq && (!o.phone || STRADA.telefono) && o.rt && o.rt.depthTexture;
    U.tD.value = on ? o.rt.depthTexture : null; U.nf.value.set(o.camera.near, o.camera.far);
    U.sK.value.set(on ? STRADA.contorno : 0, on ? STRADA.segni : 0, on ? STRADA.pieno : 0, on ? STRADA.tavolozza : 0);
  }
  return { STRADA, testa, corpo, uniformi, passo };
})();
if (typeof window !== 'undefined') window.PostStile = PostStile;
