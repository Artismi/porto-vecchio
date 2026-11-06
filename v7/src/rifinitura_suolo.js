/* Porto Vecchio — [rifinitura suolo] LA RIFINITURA DEL SUOLO PER LO STILE E (v7/RIFINITURA_SUOLO.md; BIBBIA_STILE.md, «via di mezzo 55», §11).
   Il committente: «la spiaggia risulta molto piatta, priva di dettaglio … superficie per superficie bisogna pensare come migliorare il look …
   si deve vedere la cura per i singoli elementi e ambienti oltre quella generale».
   Superficie per superficie (sabbia e battigia, mare e porto, lastrico, asfalto e strisce, marciapiede e cordolo, terra): il disegno fatto
   di LINEE NETTE ancorate al mondo (increspature, giunti, crepe, la linea dell'alta marea, la cresta dell'onda), una tinta per tipo di
   suolo presa dagli inchiostri della tavolozza con un gradino di valore fra vicini, e via la grana: niente puntini, niente rumore fine.
   Ogni riga ha lo spessore misurato in pixel (fwidth) e svanisce prima di stringersi sotto i 5-7 px: da lontano resta la tinta.
   Solo con lo stile E: ?stile=E nell'indirizzo, o window.PV_STILE che comincia per E (lo scrive render.js). ?norifsuolo la spegne.
   Senza: il codice non entra negli shader (rsK è la costante 0: gli shader compilano come oggi). Con: rsK è una uniform dal vivo
   (window.__RIFS.k.value = 0 rifà A nello stesso fotogramma: le sonde, strumenti/rifinitura_suolo_foto.js).
   Chi lo usa: pavimenti.js (il suolo dei blocchi e i marciapiedi, la vernice delle strisce), riva.js (la riva fine), e qui il mare
   (lo shader dell'acqua di render.js, ritoccato nel testo dopo R.init, prima che si compili). Nessuna mesh, nessuna tessitura in più. */
var RifSuolo = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const KILL = /[?&]norifsuolo\b/.test(Q), URL_E = /[?&]stile=E/i.test(Q);
  const on = () => !KILL && (URL_E || (typeof window !== 'undefined' && /^E/i.test(String(window.PV_STILE || ''))));
  const K = { value: 1 };   // la manopola dal vivo (0 = com'era, 1 = la rifinitura)
  const STAT = { acqua: false, pav: 0, riva: 0 };
  // il preambolo degli shader: con lo stile la uniform, senza la costante (il compilatore toglie tutto il resto)
  const pre = () => on() ? 'uniform float rsK;\n' : '#define rsK 0.\n';
  // i pezzi comuni: hash e rumore propri (non dipendono da chi li include), la riga antialiasata, la sabbia disegnata
  const GLSL = `
    float rsH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float rsN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(rsH(i), rsH(i + vec2(1., 0.)), f.x), mix(rsH(i + vec2(0., 1.)), rsH(i + 1.), f.x), f.y); }
    // una riga larga wpx pixel (bordo di un pixel) a distanza dpx pixel dal suo centro
    float rsRiga(float dpx, float wpx){ return 1. - smoothstep(wpx * .5 - .5, wpx * .5 + .5, dpx); }
    // la riga sull'isolinea x = 0 di un campo: in pixel col suo fwidth
    float rsIso(float x, float wpx){ return rsRiga(abs(x) / max(fwidth(x), 1e-5), wpx); }
    // LA SABBIA DISEGNATA (spiaggia della città e riva fine). col: la sabbia di A; wet: il bagnato (0-1); dmar: un campo che cresce
    // allontanandosi dal mare (per la linea dell'alta marea, l'isolinea dove la sabbia smette di essere bagnata); mpp: metri a pixel.
    // Rende il colore; rsInk: quanto inchiostro (le righe, da stendere dopo le correzioni di tono), rsSab: 1 sulla sabbia
    float rsInk; float rsLuce;
    vec3 rsSabbia(vec3 col, vec2 p, float mpp, float wet, float dmar){
      rsInk = 0.; rsLuce = 0.;
      float L0 = dot(col, vec3(.3, .59, .11)), var = clamp(L0 / .62, .8, 1.2);   // la variazione larga di A (chiazze, cordoni) resta
      // la tinta: asciutta osso caldo (un gradino sotto la carta: la schiuma e il lungomare si staccano), bagnata un sasso caldo, due gradini sotto
      vec3 dry = vec3(.6, .5, .35) * mix(1., var, .5), wetc = vec3(.34, .28, .21) * mix(1., var, .3);
      float fw = max(fwidth(wet), 1e-4), wb = smoothstep(.36 - fw, .36 + fw, wet);   // il bordo del bagnato: netto, una riga e non una sfumatura
      vec3 c = mix(dry, mix(wetc * 1.18, wetc * .9, smoothstep(.4, 1., wet)), wb);   // dentro il bagnato: più scuro verso l'acqua
      // le increspature del vento: creste lunghe e curve (passo 55 cm), a tratti, solo sull'asciutto; la riga d'ombra della cresta e la
      // luce sottovento accanto. Sotto i 7 px di passo svaniscono (da lontano la tinta)
      vec2 wd = vec2(.8, .6), wp = vec2(-.6, .8);
      float ph = dot(p, wd) / .7 + rsN(p * .13) * 1.3 + rsN(p * .045 + 7.) * 2.6, fph = max(fwidth(ph), 1e-5), sp = 1. / fph;
      float fr = fract(ph), dpx = min(fr, 1. - fr) / fph, cid = floor(ph + .5);
      float ph2 = ph * .5, fr2 = fract(ph2), dpx2 = min(fr2, 1. - fr2) / (fph * .5);   // l'ottava larga (una cresta su due): resta quando le altre si stringono
      float seg = smoothstep(.26, .4, rsN(vec2(cid * 3.7, dot(p, wp) * .6 + cid * 1.3)));
      float v1 = smoothstep(6., 10., sp), v2 = smoothstep(6., 10., sp * 2.) * (1. - v1), dry1 = (1. - wb) * seg;
      float cr = max(rsRiga(dpx, 1.3) * v1, rsRiga(dpx2, 1.3) * v2) * dry1, lee = (1. - smoothstep(1., 2.6, fr / fph)) * step(.8, fr / fph) * v1 * dry1;
      rsInk += cr * .4; rsLuce += lee * .08;
      // la linea dell'alta marea: dove la sabbia smette di essere bagnata (poco oltre il bordo), la posidonia secca a trattini
      float wl = rsIso(dmar + (rsN(p * 2.1) - .5) * .12, 2.2 + 1.6 * rsN(p * 3.3 + 5.)) * smoothstep(.38, .5, rsN(p * .9 + 3.)) * smoothstep(4., 7., .3 / mpp);
      c = mix(c, vec3(.17, .13, .09), wl * .85);
      // le linee lasciate dall'onda sul bagnato: righe chiare sottili (le isolinee del bagnato), rotte
      float sw = rsIso(fract(wet * 3.2 + .5) - .5, 1.1) * wb * smoothstep(.45, .6, rsN(p * .7 + 11.)) * smoothstep(.15, .5, wet) * (1. - smoothstep(.85, .95, wet));
      c = mix(c, c * 1.35 + .03, sw * .6);
      // ciottoli e conchiglie: radi (uno ogni ~3 m²), ovali col contorno, più fitti sulla linea dell'alta marea; sotto i 2 px niente
      vec2 gc = floor(p / 1.7), lp = p - (gc + .2 + .6 * vec2(rsH(gc + 3.1), rsH(gc + 7.7))) * 1.7; float hc = rsH(gc);
      if (hc < .2 + .2 * (1. - smoothstep(0., .8, abs(dmar)))) { float an = rsH(gc + 1.9) * 6.283, rr = .025 + .03 * rsH(gc + 5.3); vec2 q = vec2(cos(an) * lp.x + sin(an) * lp.y, -sin(an) * lp.x + cos(an) * lp.y) / vec2(rr, rr * .62);
        float e = length(q), epx = (e - 1.) * rr * .62 / mpp, sz = smoothstep(1.6, 3., rr * .62 / mpp);
        vec3 sc = hc < .07 ? vec3(.78, .72, .62) : mix(vec3(.38, .36, .34), vec3(.55, .5, .44), rsH(gc + 9.));   // la conchiglia chiara, il ciottolo grigio
        c = mix(c, sc * (1. - .18 * smoothstep(-.2, .9, q.y)), (1. - smoothstep(-.5, .5, epx)) * sz); rsInk = max(rsInk, rsRiga(abs(epx), 1.) * sz * .55); }
      // le orme: una pista dritta per cella di 9 m (non tutte), passi di 33 cm alternati; solo da vicino (l'orma sopra i 3 px)
      vec2 tc = floor(p / 9.); float th = rsH(tc + 21.);
      if (th < .45 && wb < .5) { float ta = rsH(tc + 4.4) * 6.283; vec2 td = vec2(cos(ta), sin(ta)), lo = p - (tc + .5) * 9.; float u = dot(lo, td), v = dot(lo, vec2(-td.y, td.x)) + (rsH(tc + 8.) - .5) * 3.;
        float k = floor(u / .33), sd = mod(k, 2.) * 2. - 1.; vec2 f = vec2(u - (k + .5) * .33, v - sd * .09) / vec2(.12, .05);
        float e = length(f), vz = smoothstep(2., 3.5, .05 / mpp) * (1. - smoothstep(3.6, 4.4, abs(u))) * (1. - smoothstep(.5, 1.2, abs(v)));
        c *= 1. - (1. - smoothstep(.75, 1.05, e)) * .13 * vz; rsInk = max(rsInk, rsRiga(abs(e - 1.) * .05 / mpp, 1.) * step(0., f.x) * .25 * vz); }
      return c;
    }`;
  // ---------------- IL MARE: lo shader dell'acqua di render.js, ritoccato nel testo ----------------
  // Le fasce di profondità (bassa, media, fonda) con la tinta della tavolozza e il bordo netto, la riga chiara sul confine delle fasce;
  // le creste dell'onda disegnate (tratti bianchi netti sulle creste, a pezzi), la schiuma della battigia come un nastro netto col suo
  // filo; meno caustiche e meno grana fine sulla superficie (il rumore che frigge). La luce di A (cielo, sole, luna, luci della riva) resta.
  const ACQ_FN = `
    float rsH(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float rsN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(rsH(i), rsH(i + vec2(1., 0.)), f.x), mix(rsH(i + vec2(0., 1.)), rsH(i + 1.), f.x), f.y); }
    float rsRiga(float dpx, float wpx){ return 1. - smoothstep(wpx * .5 - .5, wpx * .5 + .5, dpx); }
    void main(){`;
  function acqua(mat, rifai) {
    if (!mat || !mat.fragmentShader || (mat.userData.rifSuolo && !rifai) || !on()) return false;
    if (!mat.userData.rsOrig) mat.userData.rsOrig = mat.fragmentShader;
    let f = mat.userData.rsOrig; const n0 = f.length, rep = (a, b) => { if (f.indexOf(a) < 0) { console.warn('[rifinitura suolo] acqua: manca', a.slice(0, 60)); return; } f = f.replace(a, b); };
    rep('void main(){', 'uniform float rsK;\n' + ACQ_FN);
    // la grana fine della superficie e le caustiche: a un terzo
    rep('vec3 N = normalize(vec3(-(w.y*amp + fg.x*.025), 1., -(w.z*amp + fg.y*.025)));', 'fg *= 1. - .7 * rsK; vec3 N = normalize(vec3(-(w.y*amp + fg.x*.025), 1., -(w.z*amp + fg.y*.025)));');
    rep('bed += vec3(1.,.96,.86) * caust(bq*.8)', 'bed += (1. - .75 * rsK) * vec3(1.,.96,.86) * caust(bq*.8)');
    // le fasce di profondità: dopo il colore dell'acqua (prima del riflesso). Tinte (lineari) dalla tavolozza: cielo/acqua sul basso,
    // acqua al medio, oltremare/notte al fondo; il valore resta vicino ad A (la tinta pesa il 55%), la notte le spegne con dayK
    rep('c = mix(c, c*vec3(1.08,.95,.92) + vec3(.04,.02,.03), dusk*.4);', `c = mix(c, c*vec3(1.08,.95,.92) + vec3(.04,.02,.03), dusk*.4);
          vec2 rsFw = fwidth(q); float rsMpp = max(rsFw.x, rsFw.y);
          if (rsK > 0.) {
            float dW = dep + (rsN(q * .045) - .5) * .9, fd = max(fwidth(dW), 1e-4);
            float b1 = smoothstep(1.1 - fd, 1.1 + fd, dW), b2 = smoothstep(3.4 - fd, 3.4 + fd, dW), b3 = smoothstep(7.5 - fd, 7.5 + fd, dW);
            vec3 tB = mix(vec3(.30, .62, .62), vec3(.05, .30, .30), b1); tB = mix(tB, vec3(.035, .16, .33), b2); tB = mix(tB, vec3(.02, .09, .22), b3);
            tB = mix(tB, tB * vec3(.85, .8, .75) + vec3(.03, .025, .015), mudK * .7);   /* il porto torbido */
            float Lc = dot(c, vec3(.3, .59, .11)), Lt = dot(tB, vec3(.3, .59, .11));
            vec3 cB = mix(c, tB * (mix(Lt, Lc, .6) / max(Lt, 1e-3)), .55 * (1. - night * .6));
            float bl = max(max(rsRiga(abs(dW - 1.1) / fd, 1.2), rsRiga(abs(dW - 3.4) / fd, 1.2) * .7), rsRiga(abs(dW - 7.5) / fd, 1.2) * .45) * smoothstep(6., 10., 2. / fd) * dayK;   /* la riga chiara sul confine delle fasce */
            cB = mix(cB, cB * 1.25 + vec3(.05, .07, .07), bl * .6 * (1. - smoothstep(.3, .9, land)));
            c = mix(c, cB, rsK); }`);
    // le creste dell'onda: dove l'onda lunga (w.x) passa la soglia, un tratto bianco netto (larghezza misurata in pixel), a pezzi; col vento di più
    rep('foam += smoothstep(.62, .95, w.x*.55 + fn*.35) * wind * wind * .55 * smoothstep(2., 6., dep);', `foam += (1. - rsK) * smoothstep(.62, .95, w.x*.55 + fn*.35) * wind * wind * .55 * smoothstep(2., 6., dep);
          if (rsK > 0.) {   // le creste disegnate: due treni dell'onda (4,3 m e 8 m), la riga sulla cresta piegata appena, a tratti, misurata in pixel
            for (int t = 0; t < 2; t++) { vec2 dd = t == 0 ? normalize(vec2(.96, -.28)) : normalize(vec2(-.35, .94)); float ff = t == 0 ? 1.45 : .77, ss = t == 0 ? 1.9 : 1.35;
              float x = (dot(dd, q) * ff + time * ss - 1.5708) / 6.2832 + (rsN(q * .12 + float(t) * 9.) - .5) * .35, fx = max(fwidth(x), 1e-5), dx = abs(fract(x + .5) - .5) / fx;
              float ci = floor(x + .5), al = dot(q, vec2(-dd.y, dd.x)) * (t == 0 ? 1.5 : 1.) + ci * 7.3, cel = floor(al / 1.6), fa = fract(al / 1.6), hs = rsH(vec2(cel, ci + float(t) * 31.));
              float tr = smoothstep(.0, .25, fa) * (1. - smoothstep(.55, .8, fa)) * step(hs, .5);   /* il tratto: lungo mezzo passo, rastremato ai capi, uno su due */
              foam += rsRiga(dx, .6 + 1.4 * tr) * tr * smoothstep(8., 14., 1. / fx) * smoothstep(1.2, 3., dep) * (.25 + .75 * wind) * (1. - mudK * .7) * (t == 0 ? .75 : .55) * rsK; } }
          `);
    // la battigia: il pizzo dell'onda come un nastro netto (bordo di un pixel) e, sulla sabbia, il filo scuro del bagnato appena lasciato
    rep('float pizzo = (1. - smoothstep(0., .035, abs(dep - lim9)))', 'float rsFd = max(fwidth(dep), 1e-4), rsPz = rsRiga(abs(dep - lim9) / rsFd, 3.2) * smoothstep(.4, .55, n2(q * 1.7 + time * .15) * .6 + n2(q * 4.3) * .4);\n            float pizzo = (1. - rsK) * (1. - smoothstep(0., .035, abs(dep - lim9)))');
    rep('alA = mix(.1, 1., smoothstep(.0, .75, dep));', `alA = mix(.1, 1., smoothstep(.0, .75, dep));
            if (rsK > 0.) { pizzo += rsK * rsPz; resto *= 1. - rsK;
              float filo = rsRiga(abs(dep - lim9 - .012) / rsFd, 1.2) * smoothstep(.4, .55, n2(q * 1.7 + time * .15) * .6 + n2(q * 4.3) * .4);   /* il filo d'ombra sotto il nastro */
              c = mix(c, c * .55, filo * rsK); alA = max(alA, filo * rsK * .55); }`);
    if (f.length === n0) return false;
    mat.fragmentShader = API.hot(f); mat.uniforms.rsK = K; mat.userData.rifSuolo = true; mat.needsUpdate = true; STAT.acqua = true; return true;
  }
  // dopo R.init (l'acqua c'è, i programmi non sono ancora compilati: main.js li prepara dopo): il mare, i laghi e la pozza (lo stesso materiale)
  function dopoInit() {
    if (!on() || typeof Render === 'undefined' || !Render.__models) return; const sc = Render.__models.scene; if (!sc) return; const visti = new Set();
    sc.traverse(o => { const m = o.material; if (!m || visti.has(m) || !m.isShaderMaterial || !m.uniforms || !m.uniforms.RIVA9 || !m.uniforms.sea) return; visti.add(m); try { acqua(m); } catch (e) { console.warn('[rifinitura suolo] acqua', e); } });
  }
  if (typeof Render !== 'undefined' && Render.init && !Render.__rifSuolo) {
    const i0 = Render.init; Render.__rifSuolo = true;
    Render.init = function () { const r = i0.apply(this, arguments); try { dopoInit(); } catch (e) { console.warn('[rifinitura suolo]', e); } return r; };
    // la manopola è una uniform di modulo anche per i tasselli cotti (il marciapiede): tasselli.js la ritrova per nome
    try { if (Render.__tass && Render.__tass.uni) Render.__tass.uni['RIFS.k'] = K; } catch (e) { }
  }
  // per la messa a punto dal vivo (le sonde): HOT, coppie [da, a] applicate al testo finale degli shader del suolo; ricompila() li rifà
  const API = { get on() { return on(); }, k: K, pre, GLSL, acqua, STAT, ver: 0, HOT: [],
    hot(src) { let f = src; API.HOT.forEach(([a, b]) => { f = f.split(a).join(b); }); return f; },
    ricompila() { API.ver++; const sc = typeof Render !== 'undefined' && Render.__models && Render.__models.scene; let n = 0;
      if (sc) sc.traverse(o => { const m = o.material; if (m && m.customProgramCacheKey && /\|rs/.test(String(m.customProgramCacheKey()))) { m.needsUpdate = true; n++; } }); return n; } };
  if (typeof window !== 'undefined') window.__RIFS = API;
  return API;
})();
if (typeof module !== 'undefined') module.exports = RifSuolo;
