/* Porto Vecchio — [tratteggio] IL TRATTEGGIO A MANO (di serie la mano d3, computer e telefono; ?tratteggio=oggi com'era, a|b|c|d1|d2 le altre; v7/TRATTEGGIO.md).
   L'utente: «le campiture sono su tutto, anche su alberi e ringhiere; nell'ombra vanno bene, ma sono omogenee, regolari, piene, tutte uguali:
   non sembra disegnato da un artista, sembra un retino applicato, il tratteggio di sezione di un disegno tecnico. E i contorni sugli oggetti
   fini (alberi, ringhiere) sono troppi».
   Qui, tutto nel passo unico (nessun passo nuovo, nessun pixel in più): il tratteggio dello stile E (punto 3: righe continue a passo fisso,
   accese dal valore del pixel) e quello di luce3 nei materiali (le mappe dei toni) si spengono, e al loro posto:
   - IL TONO DALLA LUCE, non dal colore: la normale del pixel (dalla profondità) contro il sole, l'ombra portata letta nella mappa d'ombra del
     sole (1 lettura) e, nell'ombra, quanto è vicina la luce (4 letture a ~0,5-1 m, 2 sul telefono). In luce niente; sul terminatore e nella
     penombra tratti radi e singoli; nell'ombra più fitti; l'incrocio solo nel fondo (variante b);
   - IL SEGNO DOVE SUCCEDE QUALCOSA: al bordo dell'ombra portata, al piede dei muri, sotto gronde e balconi; verso il centro delle ombre larghe
     il tratto si dirada (le ombre larghe le fa il colore);
   - IL TRATTO VIVO: righe a celle con un caso per cella (non una sinusoide): ogni tratto ha la sua lunghezza, il suo spessore, la sua
     inclinazione, un filo di tremolio, l'attacco pieno e la coda sottile, i vuoti fra un tratto e l'altro; fermo nel mondo, le ottave per stare
     a 4-7 px sullo schermo;
   - LA DIREZIONE DALLA FORMA: il suolo in orizzontale (sullo schermo), i muri in diagonale (a), quasi verticali (b) o lungo i corsi (c), i
     tetti giù per la falda, ogni faccia la sua mano (angolo e caso diversi);
   - NIENTE SEGNO SULLE COSE FINI: dove la profondità salta dentro 2 px (ringhiere, rami, pali, cavi) e sulle chiome (la famiglia verde della
     tavolozza) il tratteggio quasi sparisce;
   - LA GERARCHIA DELLE LINEE: il filo (la sagoma dalla profondità, le pieghe, l'anello di D2) pieno davanti e sulle cose grosse, più sottile e
     raro sulle cose fini, sulle chiome e lontano. Il contorno delle persone resta com'è.
   Tre mani: a «matita leggera» (rada, grafite, quasi solo ai bordi dell'ombra portata), b «inchiostro fumetto» (piena, dal tono, incrocio e
   neri pieni nel fondo), c «manga/street» (tratti lunghi lungo i corsi, sporchi, e il retino a punti solo sul suolo in ombra).
   Dal vivo: window.__TRATTEGGIO.imposta('a'|'b'|'c'|0) (0: com'è oggi; solo uniform, niente ricompilazione).
   PERCHÉ UN MODULO A PARTE: come luce3, è solo shader (il testo del passo si ritocca alla compilazione): render.js non cambia e il modulo sta
   fuori dall'impronta dei tasselli (build.py TASS_FUORI). Con ?tratteggio=oggi (o ?vecchio) non fa niente. */
var Tratteggio = (function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : {};
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  // [d3] DI SERIE (computer e telefono): senza interruttore la mano d3; ?tratteggio=oggi (o ?vecchio) com'era prima, il modulo non fa niente
  const M = Q.match(/[?&]tratteggio=([abc]|d[123]|oggi)\b/), OGGI = (M && M[1] === 'oggi') || /[?&]vecchio\b/.test(Q);
  const CAPACE = !OGGI && typeof THREE !== 'undefined';
  // le mani. A: densità, quanto resta dentro le ombre larghe (0 solo ai bordi), da che tono l'incrocio (>1 mai), spessore
  //           B: quanto nero (0 grafite: il colore della cosa scurito), opacità, sporco (tratti spezzati), retino a punti sul suolo
  //           C: angolo dei muri (rad: 0 lungo i corsi, 1,57 verticale), angolo del suolo (rad, in più), passo (px a 540 righe), neri pieni da (>1 mai)
  //           E: la carta fra i tratti (quanto l'ombra tratteggiata si apre)
  //           D: [d] la mano che segue la forma (1), puntini nel fondo, tratti d'accento, quanto pesa il fuoco (più inchiostro vicino al giocatore)
  //           L: il filo lontano (quanto resta), sulle cose fini, sulle chiome (quanto si toglie), davanti (quanto si rinforza)
  const V = {
    a: { A: [.95, .06, 2, .72], B: [.35, .8, .12, 0], C: [1.02, -.2, 6.5, 9], L: [.4, .3, .8, 1.1], E: [.3] },
    b: { A: [1.15, .3, .6, 1], B: [.85, .92, .06, 0], C: [1.38, -.12, 5.6, .86], L: [.55, .4, .7, 1.25], E: [.45] },
    c: { A: [1, .25, 2, .9], B: [.95, .9, .5, 1], C: [.1, .25, 5.2, .9], L: [.5, .35, .75, 1.2], E: [.4] },
    // [d] C (il tratto lungo lungo i corsi, sporco) con il tono e il peso di B (incrocio, neri pieni), e la forma: d1 più pulita, d2 più sporca
    d1: { A: [1.2, .3, .62, 1], B: [.9, .92, .16, 0], C: [0, .1, 5.4, .88], L: [.5, .35, .75, 1.25], E: [.42], D: [1, .12, .05, 1] },
    d2: { A: [1.25, .3, .58, 1.05], B: [.95, .95, .5, 1], C: [0, .1, 5.2, .84], L: [.5, .32, .78, 1.25], E: [.4], D: [1, .55, .11, 1] },
    // [d3] (di serie) fra d1 e d2, verso d2: lo sporco, i puntini e il retino solo nell'ombra fonda e vicino al giocatore (E[1]: quanto si spengono lontano)
    d3: { A: [1.23, .3, .59, 1.04], B: [.94, .94, .45, 1], C: [0, .1, 5.25, .85], L: [.5, .33, .78, 1.25], E: [.4, 1], D: [1, .5, .1, 1] },
  };
  const S = { v: OGGI ? 0 : M ? M[1] : 'd3', passo: 0, avvisi: [] };
  const TH = { value: { x: 0, y: 1, z: 1, w: 0 } }, TA = { value: { x: 0, y: 0, z: 0, w: 0 } }, TB = { value: { x: 0, y: 0, z: 0, w: 0 } }, TC = { value: { x: 0, y: 0, z: 0, w: 0 } }, TL = { value: { x: 1, y: 1, z: 0, w: 1 } };
  const TD = { value: { x: 0, y: 0, z: 0, w: 0 } }, TP = { value: { x: 0, y: 0, z: 0, w: 0 } }, TE = { value: { x: 0, y: 0, z: 0, w: 0 } }, TS = { value: { x: 0, y: 1, z: 0, w: .01 } }, TG = { value: { x: 1, y: 0, z: 0, w: 0 } };
  const TM = { value: CAPACE ? new THREE.Matrix4() : null }, TSM = { value: null };
  function avvisa(s) { S.avvisi.push(s); console.warn('[tratteggio]', s); }

  const TESTA = `
uniform vec4 trH; uniform vec4 trDm; uniform highp vec4 trPl; uniform vec4 trE; uniform vec4 trA; uniform vec4 trB; uniform vec4 trC; uniform vec4 trL; uniform highp vec4 trS; uniform vec4 trG; uniform highp mat4 trM; uniform highp sampler2D trSM;   /* [tratteggio] acceso, forza, giorno, mappa d'ombra · le mani · il sole (verso la luce, raggio in uv) · il suolo */
highp float tHa(highp vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float tVn(highp vec2 p){ highp vec2 i = floor(p); vec2 f = vec2(p - i); f = f * f * (3. - 2. * f);   /* il rumore largo: le chiazze dove la mano insiste o lascia */
  return mix(mix(float(tHa(i)), float(tHa(i + vec2(1., 0.))), f.x), mix(float(tHa(i + vec2(0., 1.))), float(tHa(i + vec2(1., 1.))), f.x), f.y); }
highp float tUnp(highp vec4 v){ return dot(v, vec4(1. / 16777216., 1. / 65536., 1. / 256., 1.) * (255. / 256.)); }   /* la profondità impacchettata di three (packing) */
/* UN TRATTO A CELLE: q in file (x lungo il tratto, y attraverso), g = un pixel in file. Ogni fila ha la sua lunghezza di tratto, ogni cella il suo
   caso: c'è o no (dens), dove comincia e finisce (i vuoti), quanto pende, quanto trema, quanto è spesso; l'attacco pieno, la coda sottile */
float tStr(highp vec2 q, float g, float dens, float wpx, float sd, float grit, float lk, float acc){
  highp float row = floor(q.y); float hr = float(tHa(vec2(row, sd)));
  highp float sx = q.x / ((4.5 + 8. * hr) * lk) + hr * 13.; highp float cell = floor(sx); float t = float(sx - cell);
  float h1 = float(tHa(vec2(cell, row * 1.37 + sd))), h2 = float(tHa(vec2(cell * 1.71 + 3.1, row - sd * .7)));
  if (h1 >= dens) return 0.;
  float a = .02 + .16 * h2, b = .98 - .16 * fract(h2 * 7.31), tt = (t - a) / (b - a);
  if (tt <= 0. || tt >= 1.) return 0.;
  float off = .5 + (fract(h1 * 5.17) - .5) * .3 + (tt - .5) * (h2 - .5) * .4 + sin(tt * 4. + h1 * 31.) * .07 * (.5 + h2);
  float d = abs(float(fract(q.y)) - off) / g;
  float w = wpx * pow(sin(3.1416 * tt), .55) * (1.2 - .45 * tt) * (.65 + .7 * fract(h1 * 11.7)) * (1. + 1.3 * step(1. - acc, fract(h2 * 3.77)));   /* [d] ogni tanto il tratto d'accento, pieno */
  float cv = 1. - smoothstep(w - .5, w + .5, d);
  if (grit > 0.) cv *= 1. - grit * step(.5, float(tHa(floor(q * vec2(5., 2.5)) + sd + 9.1)));   /* lo sporco: il pennello secco salta */
  return cv; }
/* una famiglia di tratti nel piano (p in metri, dx dy le sue derivate): le ottave tengono il passo fra S e S/1,4 px, la seconda entra sfumando */
float tLay(highp vec2 p, vec2 dx, vec2 dy, vec2 dir, float S, float dens, float wpx, float sd, float grit, float lk, float acc){
  vec2 nr = vec2(-dir.y, dir.x); float gm = max(abs(dot(dx, nr)) + abs(dot(dy, nr)), 1e-5);
  float lo = log2(S * gm / .05), o = clamp(floor(lo), -4., 7.), fr = clamp(lo - o, 0., 1.), sp = .05 * exp2(o);
  highp vec2 q = vec2(dot(p, dir), dot(p, nr)) / sp; float g = gm / sp, w2 = smoothstep(.45, 1., fr), r = 0.;
  if (w2 < .99) r = tStr(q, g, dens, wpx, sd + o * 7.3, grit, lk, acc) * (1. - w2);
  if (w2 > .01) r = max(r, tStr(q * .5, g * .5, dens, wpx, sd + (o + 1.) * 7.3, grit, lk, acc) * w2);
  return r; }
/* il retino a punti (c, solo sul suolo in ombra): la griglia a 45° ferma nel mondo, il punto cresce col tono */
float tDot(highp vec2 p, vec2 dx, vec2 dy, float S, float tone){
  float gm = max(length(abs(dx) + abs(dy)) * .7071, 1e-5), lo = log2(S * .8 * gm / .05), o = clamp(floor(lo), -4., 7.), fr = clamp(lo - o, 0., 1.);
  highp vec2 pr = vec2(p.x + p.y, p.y - p.x) * .7071; float r0 = .5 * sqrt(clamp(tone, 0., 1.)), res = 0.;
  for (int k = 0; k < 2; k++) { float sp = .05 * exp2(o + float(k)); highp vec2 q = pr / sp; float g = gm / sp;
    float d = length(vec2(fract(q) - .5)), dv = 1. - smoothstep(r0 - g * .7, r0 + g * .7, d);
    res += dv * (k == 0 ? 1. - fr : fr); }
  return res; }
/* la gerarchia del filo: pieno davanti e sulle cose grosse, leggero sulle cose fini, sulle chiome, lontano */
float tGer(highp float dd, float th, vec3 col){
  float veg = smoothstep(.025, .08, col.g - max(col.r, col.b));
  float k = mix(1., trL.x, smoothstep(5., 26., dd)) * mix(trL.y, 1., clamp(th, 0., 1.)) * (1. - trL.z * veg);
  k *= mix(trL.w, 1., smoothstep(1., 7., dd));
  return mix(1., clamp(k, 0., 1.4), step(.5, trH.x)); }
`;
  const CORPO = `
            {   /* [tratteggio] IL TRATTEGGIO A MANO (tratteggio.js): il tono dalla luce, il segno ai bordi, il tratto vivo, la direzione dalla forma */
              highp vec3 tq = fp0 - eO; highp vec3 tdx = dFdx(fp0), tdy = dFdy(fp0); vec3 tn = normalize(cross(tdx, tdy));
              tn *= sign(dot(tn, vec3(fXr.w, fYr.w, fZr.w) - fp0) + 1e-6); vec3 tan0 = abs(tn);
              float tFine = smoothstep(.025, .1, float(fwidth(fd0) / fd0));   /* la profondità salta dentro il quadrato di 2 px: una cosa fine o un bordo */
              if (trH.x > .5 && vivo * k > .01) {
                float tY = dot(c, vec3(.2126, .7152, .0722)), tNdl = dot(tn, trS.xyz), tLit = 1., tEd = 0.;
                if (trH.w > .5 && tNdl > 0. && trH.z > .02) {
                  highp vec4 sc = trM * vec4(fp0 + tn * .2, 1.);
                  if (sc.x > .002 && sc.x < .998 && sc.y > .002 && sc.y < .998 && sc.z < 1.) {
                    highp float z = sc.z - .0015; tLit = step(z, tUnp(texture2D(trSM, sc.xy)));
                    if (tLit < .5) { vec2 r = vec2(trS.w);
#ifdef SG_TEL
                      tEd = .5 * (step(z, tUnp(texture2D(trSM, sc.xy + vec2(r.x, r.x * .35)))) + step(z, tUnp(texture2D(trSM, sc.xy - vec2(r.x * .35, r.x)))));
#else
                      tEd = .25 * (step(z, tUnp(texture2D(trSM, sc.xy + vec2(r.x, 0.)))) + step(z, tUnp(texture2D(trSM, sc.xy - vec2(r.x, 0.))))
                                 + step(z, tUnp(texture2D(trSM, sc.xy + vec2(0., r.x) * .55))) + step(z, tUnp(texture2D(trSM, sc.xy - vec2(0., r.x) * .55))));
#endif
                    } } }
                float tSh = 1. - tLit * smoothstep(-.02, .16, tNdl);   /* 1 nell'ombra (propria o portata), sfuma sul terminatore */
                float tToneD = tSh * (.42 + .58 * smoothstep(.8, .18, tY));
                if (trH.w < .5) tToneD = max(tToneD * .8, smoothstep(.42, .14, tY));
                float tone = mix(smoothstep(.5, .12, tY), tToneD, trH.z);
                float tWall = 1. - smoothstep(.45, .8, tan0.y), tUnder = smoothstep(-.3, -.72, tn.y);
                float tFoot = tWall * (1. - smoothstep(.15, 1.8, float(fp0.y - fC.w)));
                float tTerm = tLit * smoothstep(-.02, .05, tNdl) * (1. - smoothstep(.07, .2, tNdl));
                float conc = clamp(max(max(tEd * 1.7, tUnder), max(tFoot * tSh, tTerm * .8)), 0., 1.);
                float veg = max(fam > 7.5 && fam < 8.5 ? smoothstep(.035, .08, Cc) : 0., smoothstep(.02, .07, c.g - max(c.r, c.b)));
                float tK = vivo * k * (1. - tFine) * (1. - .9 * veg) * (1. - .5 * smoothstep(4., 13., float(fd0 - fA.w)));
                float tN1 = tVn(tq.xz * .45 + tq.y * .3), tN2 = tVn(tq.zx * .21 - tq.y * .17 + 7.3), tN3 = tVn(tq.xz * .13 + tq.y * .11 + 3.1);   /* il rumore largo: ogni zona la sua mano */
                float tFoc = 1., tInt = trA.y * (.35 + 1.3 * tN1);
                if (trDm.x > .5) {   /* [d] LA MANO CHE SEGUE LA FORMA E SI CONCENTRA */
                  float side = smoothstep(.03, -.04, tNdl) * (1. - smoothstep(-.06, -.5, tNdl)) * tWall;   /* il lato in ombra dei volumi, subito oltre il terminatore */
                  conc = max(conc, side * .9);
                  if (tone > .15) {   /* gli angoli e i contatti: la piega dalla profondità a ~35 cm (2 letture sul telefono, 4 al computer) */
                    float rp = clamp(.35 * src.y / (2. * fN.w * float(fd0)), 2., 28.); highp float i0 = 1. / fd0;
                    highp float da = fD(vUv + vec2(e.x * rp, 0.)), db = fD(vUv - vec2(e.x * rp, 0.));
                    float cv = smoothstep(.015, .1, float((.5 * (1. / da + 1. / db) - i0) * fd0)) * (1. - smoothstep(.6, 1.5, float(max(abs(da - fd0), abs(db - fd0)))));
#ifndef SG_TEL
                    da = fD(vUv + vec2(0., e.y * rp)); db = fD(vUv - vec2(0., e.y * rp));
                    cv = max(cv, smoothstep(.015, .1, float((.5 * (1. / da + 1. / db) - i0) * fd0)) * (1. - smoothstep(.6, 1.5, float(max(abs(da - fd0), abs(db - fd0))))));
#endif
                    conc = max(conc, cv); }
                  tInt = trA.y * 1.7 * smoothstep(.4, .8, tN1);   /* le ombre larghe: vuoti veri, a chiazze */
                  tFoc = mix(1. - .5 * trDm.w, 1. + .25 * trDm.w, 1. - smoothstep(3., 16., float(length(fp0.xz - trPl.xz)))); }   /* più inchiostro vicino al giocatore */
                tK *= tFoc;
                float dens = clamp(tone * mix(tInt, 1., conc) * trA.x, 0., .95);
                if (dens > .02 && tK > .01) {
                  /* il piano e la direzione: suolo (in orizzontale sullo schermo), muri (dalla mano), tetti giù per la falda, sotto come il suolo */
                  highp vec2 tp; vec2 tpx, tpy, dir; float sd;
                  if (tan0.y > max(tan0.x, tan0.z)) { tp = tq.xz; tpx = tdx.xz; tpy = tdy.xz;
                    vec2 sl = tn.xz; dir = (kc > 2.5 && kc < 3.5 && length(sl) > .2) ? normalize(sl) : trG.xy;
                    sd = floor(float(tq.y) * 1.3) + (tn.y < 0. ? 5. : 1.); }
                  else { bool ax = tan0.x > tan0.z; tp = ax ? tq.zy : tq.xy; tpx = ax ? tdx.zy : tdx.xy; tpy = ax ? tdy.zy : tdy.xy;
                    sd = (ax ? 2. : 3.) + floor(float(ax ? tq.x : tq.z) * 1.3) * 3.; float an = trC.x + (float(tHa(vec2(sd, 1.7))) - .5) * .32; dir = vec2(cos(an), sin(an)); }
                  if (tUnder > .5) dir = trG.xy;
                  float lk = 1., acc = trDm.z;
                  if (trDm.x > .5) {   /* [d] i muri lungo i corsi (sui tronchi e sulle colonne anelli che girano), il suolo in orizzontale: la pendenza cambia per zone (continua), non per faccia */
                    float ja = (tN2 - .5) * (tan0.y > max(tan0.x, tan0.z) ? .8 : .3); dir = vec2(dir.x * cos(ja) - dir.y * sin(ja), dir.x * sin(ja) + dir.y * cos(ja)); lk = .65 + .9 * tN3; }
                  else { float ja = (float(tHa(vec2(sd, 4.2))) - .5) * .22; dir = vec2(dir.x * cos(ja) - dir.y * sin(ja), dir.x * sin(ja) + dir.y * cos(ja)); }
                  float s5t = src.y / 540., Sx = trC.z * s5t * mix(1.12, .82, tone), wpx = max(.5, (.38 + .82 * tone) * trA.w * s5t);
                  if (trDm.x > .5) { Sx *= .8 + .45 * tN3; wpx *= (.7 + .6 * tN2) * mix(.85, 1.2, conc); }
                  float grnd = step(.5, trB.w) * step(kc, 1.5) * step(.5, kc);
                  /* [d3] lo sporco solo vicino (al giocatore e alla camera) e nel fondo: lontano mai grana */
                  float tNear = 1. - trE.y * max(smoothstep(5., 16., float(length(fp0.xz - trPl.xz))), smoothstep(4., 14., float(fd0 - fA.w)));
                  float tDeep = mix(1., smoothstep(.5, .85, tone * mix(.8, 1., conc)), trE.y);
                  float cov = tLay(tp, tpx, tpy, dir, Sx, dens * mix(1., .25, grnd), wpx, sd, trB.z * tNear * mix(.35, 1., tDeep), lk, acc);
                  float cr = smoothstep(trA.z, trA.z + .15, tone * mix(.72, 1., conc));
                  if (cr > .02) { vec2 d2 = vec2(dir.x * .3 - dir.y * .954, dir.x * .954 + dir.y * .3);
                    cov = max(cov, tLay(tp, tpx, tpy, d2, Sx * 1.1, cr * .8, wpx * .85, sd + 31., trB.z, lk, 0.)); }
                  float blk = smoothstep(trC.w, trC.w + .07, tone * (.62 + .38 * max(tUnder, tFoot)) + (float(tHa(floor(tp * 2.3) + sd)) - .5) * .1);
                  cov = max(cov, blk);
                  if (trDm.y > 0.) {   /* [d] i puntini e lo sporco nel fondo (street): celle ferme nel mondo, un punto ogni tanto, più fitti dove la mano insiste */
                    float gq = max(length(abs(tpx) + abs(tpy)) * .7071, 1e-5), so = .05 * exp2(clamp(floor(log2(Sx * .7 * gq / .05)), -4., 7.));
                    highp vec2 sq = tp / so; float hs = float(tHa(floor(sq) + sd * .13 + 2.7));
                    float pk = step(1. - trDm.y * .5 * smoothstep(.5, .95, tone) * (.35 + .65 * conc) * tNear * tDeep, hs);
                    vec2 sf = vec2(fract(sq)) - .5 - (vec2(hs, fract(hs * 7.1)) - .5) * .5; float rr = .09 + .1 * fract(hs * 13.3);
                    cov = max(cov, pk * (1. - smoothstep(rr - gq / so, rr + gq / so, length(sf)))); }
                  /* la carta fra i tratti: dove la mano tratteggia l'ombra si apre un poco (il valore lo porta l'inchiostro, non la pappa scura) */
                  c = mix(c, c * 1.32 + vec3(.035, .03, .025), clamp(tone * (.35 + .65 * min(1., dens * 1.6)), 0., 1.) * trE.x * tK * trH.y);
                  vec3 tInk = mix(c * .5, vec3(.085, .075, .07), trB.x);
                  c = mix(c, min(tInk, c), cov * trB.y * tK * trH.y);
                  if (grnd > .5) c *= 1. - .5 * tDot(tp, tpx, tpy, Sx, tone * mix(.55, 1., conc)) * tK * trH.y * mix(1., tNear * tDeep, trE.y);   /* [c] il retino del suolo in ombra */
                } }
            }
`;
  function passo(sh) {
    let f = sh.fragmentShader; if (typeof f !== 'string' || f.indexOf('eRig(') < 0 || f.indexOf('[tratteggio]') >= 0) return;
    const RM = /void main\(\)\{\s*vec2 vUv = vUv0;/;
    if (!RM.test(f)) { avvisa('passo: main non trovato'); return; }
    const rep = (da, a, nome) => { if (f.indexOf(da) >= 0) { f = f.replace(da, a); return true; } avvisa('passo: ' + nome + ' non trovato'); return false; };
    f = f.replace(RM, m => TESTA + '        ' + m);
    // il tratteggio di E (punto 3) spento sotto il nuovo
    rep('c *= 1. - (r1 * smoothstep(sopra, sopra - .2, Yv)', 'if (trH.x < .5) c *= 1. - (r1 * smoothstep(sopra, sopra - .2, Yv)', 'il tratteggio di E');
    // il nuovo, prima della separazione (punto 4)
    rep('            // (4) la separazione:', CORPO + '            // (4) la separazione:', 'la separazione di E');
    // la gerarchia del filo
    rep('            lin *= 1. - eZ; lnP *= 1. - eZ;', '            lin *= 1. - eZ; lnP *= 1. - eZ;\n            { float tg = tGer(fd0 - fA.w, th, c); lin = min(1., lin * tg); lnP *= tg; }   /* [tratteggio] la gerarchia del filo */', 'il filo');
    rep('              float ln = clamp(eV * w, 0., 1.);', '              float ln = clamp(eV * w, 0., 1.);\n#if defined(SG_PFD) && defined(SG_STILE)\n              ln *= min(1., tGer(fd0 - fA.w, 1., c));   /* [tratteggio] */\n#endif', 'la linea per categoria');
    sh.fragmentShader = f; Object.assign(sh.uniforms, { trH: TH, trDm: TD, trPl: TP, trE: TE, trA: TA, trB: TB, trC: TC, trL: TL, trS: TS, trG: TG, trM: TM, trSM: TSM }); S.passo++;
  }
  function aggancio() {
    const P = THREE.ShaderMaterial && THREE.ShaderMaterial.prototype; if (!P || P.__tr) return; P.__tr = true;
    const d0 = Object.getOwnPropertyDescriptor(P, 'onBeforeCompile'); let prima = null;
    if (d0 && d0.get) { try { prima = d0.get.call({}); } catch (e) { prima = null; } }   // luce3 (se c'è): il suo passo, poi questo
    const nome = (prima ? String(prima) : 'base') + '|tratteggio';
    const fn = function (sh, rd) { try { if (prima) prima.call(this, sh, rd); } catch (e) { } try { passo(sh); } catch (e) { avvisa('passo: ' + e.message); } };
    fn.toString = () => nome;
    Object.defineProperty(P, 'onBeforeCompile', { configurable: true, get() { return this.__l3Obc || fn; }, set(g) { this.__l3Obc = g; } });
  }

  // ------------------------------------------------------------ a ogni fotogramma ------------------------------------------------------------
  let SOLE = null, L3T = null, gAng = null;
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function tick(st) {
    const v = V[S.v], on = !!v, h = TH.value;
    // luce3: il suo tratteggio nei materiali spento quando c'è questo (tutto con una uniform: niente ricompilazione)
    try { const L = W.__LUCE3; if (L && L.V) { if (!L3T) L3T = { a: L.V.a.tratto, b: L.V.b.tratto }; L.V.a.tratto = on ? 0 : L3T.a; L.V.b.tratto = on ? 0 : L3T.b; } } catch (e) { }
    h.x = on ? 1 : 0; if (!on) return;
    const put = (U, a) => { U.value.x = a[0]; U.value.y = a[1]; U.value.z = a[2]; U.value.w = a[3]; };
    put(TA, v.A); put(TB, v.B); put(TD, v.D || [0, 0, 0, 0]); TE.value.x = v.E[0]; TE.value.y = v.E[1] || 0;
    try { const pl = st && st.player; if (pl) { TP.value.x = pl.x; TP.value.z = pl.y; } } catch (e) { } put(TC, v.C); put(TL, v.L);
    const hh = st && st.t !== undefined ? ((st.t / 60) % 24 + 24) % 24 : 12; h.z = ss(5.6, 7.4, hh) * (1 - ss(18.8, 20.2, hh));
    try {
      if (!SOLE || !SOLE.parent) { SOLE = null; Render.__models.scene.traverse(o => { if (!SOLE && o.isDirectionalLight && o.castShadow) SOLE = o; }); }
      if (SOLE) { const p = SOLE.position, t = SOLE.target.position; let x = p.x - t.x, y = p.y - t.y, z = p.z - t.z; const l = Math.hypot(x, y, z) || 1; TS.value.x = x / l; TS.value.y = y / l; TS.value.z = z / l;
        const sm = SOLE.shadow, c = sm.camera, wd = Math.max(1, c.right - c.left) / (c.zoom || 1);
        TS.value.w = 1.3 / wd;   // ~1,3 m nella mappa d'ombra
        if (sm.map && sm.map.texture && y > 0) { TSM.value = sm.map.texture; TM.value.copy(sm.matrix); h.w = 1; } else h.w = 0; }
      else h.w = 0;
      // il suolo: in orizzontale sullo schermo (il destro della camera nel piano), fermo finché la camera non gira di più di 25°
      const cam = Render.getCamera(), m = cam.matrixWorld.elements, a = Math.atan2(m[2], m[0]) + v.C[1];
      if (gAng === null || Math.abs(Math.atan2(Math.sin(a - gAng), Math.cos(a - gAng))) > .44) gAng = a;
      TG.value.x = Math.cos(gAng); TG.value.y = Math.sin(gAng);
    } catch (e) { h.w = 0; }
  }
  function installa() {
    if (!CAPACE) return;
    aggancio();
    if (typeof Render !== 'undefined' && Render.frame && !Render.__tratteggio) {
      Render.__tratteggio = true; const f0 = Render.frame;
      Render.frame = function (st) { try { tick(st); } catch (e) { } return f0.apply(this, arguments); };
    }
  }
  installa();
  const API = {
    capace: CAPACE, V, TH, TA, TB, TC, TL, TS, TG, TM, TSM, stato: () => ({ variante: S.v, passo: S.passo, avvisi: S.avvisi.slice() }),
    get variante() { return S.v; },
    // dal vivo (la tavola): 'a' | 'b' | 'c' una mano, 0 com'è oggi (anche il tratteggio di luce3 torna)
    imposta(x) { if (!CAPACE) return false; S.v = V[x] ? x : 0; return S.v; },
  };
  W.__TRATTEGGIO = API;
  return API;
})();
if (typeof module !== 'undefined') module.exports = Tratteggio;
