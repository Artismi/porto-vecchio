/* Porto Vecchio — [luce3] LA LUCE IN VOLUME E IL TRATTEGGIO DA ILLUSTRATORE (proposta al direttore, solo con ?luce3; v7/LUCE_VOLUME.md,
   tavola v7/_immagini/luce_volume/proposta.jpg). Il direttore su luce_globale.jpg: «ombre e luci sono estremi, quindi appiattiscono e i muri
   sembrano arancione scuro o giallo chiaro, e poi ha tutto la stessa campitura a righe che è bella ma risulta uniforme e piatta, un po'
   semplificata, non segue bene la superficie».
   Le cause (misurate, LUCE_VOLUME.md §1):
   (1) LA LUCE A BANDE. Nei materiali (render.js sguProPezzi, lights_physical_pars_fragment) il coseno del sole va in tre gradini, 80% a bande
       (SGU.pro.celle .8): 0, .38, 1. Un muro al sole è «pieno» da un coseno di .4 in su, un muro di sbieco cade a .38: due valori, niente forma
       che gira. L'ombra portata è indurita due volte (smoothstep .05-.95 e .2-.8) e riempita da un cielo uguale in alto e al piede: nessuna
       occlusione, nessun rimbalzo dal suolo caldo.
   (2) IL TRATTEGGIO UNICO. Nel passo finale (stile E, punto 3): righe di 12 cm nel piano dell'asse dominante della normale (dalla profondità),
       con un angolo fisso per categoria (suolo 30°, muri 68°, tetti -40°), accese dal VALORE del pixel finito (< .7/.55), stesso peso e passo
       ovunque. Non sa cos'è la luce (un muro scuro al sole si tratteggia, un intonaco chiaro in ombra quasi no), non sa la materia né la
       pendenza (la falda prende le righe del piano orizzontale).
   Qui (tutto dietro ?luce3, una uniform per spegnerlo dal vivo: le tre colonne della tavola nella stessa sessione):
   - la forma: il coseno continuo con una spalla (1 - (1 - x)^1.6) e solo un'eco delle bande (12%): il muro di sbieco è un medio, quello di
     fronte al sole pieno, la falda gira;
   - l'ombra: niente indurimento doppio; il bordo resta netto vicino a chi la fa e si apre (il filtro di three, ~1,5 texel) quando chi la fa è
     lontano (una lettura in più della mappa, solo nella penombra);
   - il cielo che si vede: sui muri meno cielo al piede della via (.6) e più in alto (1.06), meno sotto gronde e balconi (le facce girate in
     basso); il rimbalzo caldo del suolo al sole sui primi metri dei muri (di giorno);
   - l'occlusione nel passo: le pieghe (piede dei muri, angoli, sotto le gronde) dalla profondità, 4 coppie di letture a ~0,9 m nel mondo,
     verso il lilla della tavolozza (non grigio);
   - IL TRATTEGGIO NEI MATERIALI (non più nel passo): acceso dal TONO DELLA LUCE (sole × ombra × cielo che si vede), non dal colore: niente in
     luce, sottile e rado nei medi (le facce di sbieco), pieno nell'ombra, incrociato solo nell'ombra fonda (il piede dei muri in ombra, sotto le
     gronde). La direzione segue la superficie: muri verticali (variante a) o lungo i corsi (b), tetti giù per la falda (le file dei coppi),
     suolo lungo la luce (la direzione delle ombre portate), cilindri ad anelli che girano attorno (pali, colonne, vasi). Il peso segue la
     materia: metalli e lucidi quasi niente, foglie, vetri, acqua, persone e mezzi niente. Righe ancorate al mondo con le ottave (passo sullo
     schermo 6-12 px a 540 righe, le righe di mezzo entrano sfumando), antialiasate, spente sotto il passo minimo e oltre ~40 m: niente moiré.
   Due varianti: ?luce3 = ?luce3=a «matita» (righe leggere, muri verticali); ?luce3=b «china» (righe più piene, muri lungo i corsi, incrocio
   più presto, occlusione più forte). Dal vivo: window.__LUCE3.imposta('a'|'b'|0).
   [luce4] (DECISIONI.md, Luce; LUCE_VOLUME.md §7): ?luce3 = la mano «matita» rifinita: lo spigolo fra le facce per gradi (il cielo che gira
   attorno allo spigolo, caldo accanto al sole; l'ombra meno fonda; il rimbalzo più forte sul lato in ombra), la croma della tavolozza di E
   dentro lo schermo (la «lastra accesa» dei muri arancio), il colore pieno al sole un poco spento, il tratteggio più leggero nell'ombra chiusa
   e aperto a chiazze a metà dei muri grandi, il telefono come il computer.
   PERCHÉ UN MODULO A PARTE: è solo shader. I pezzi dei materiali entrano nei pezzi di three (THREE.ShaderChunk, risolti alla compilazione,
   quindi anche nei tasselli cotti, che portano il testo con gli #include), il passo si ritocca nel testo alla compilazione: render.js non
   cambia e luce3.js sta fuori dall'impronta dei tasselli (build.py TASS_FUORI). Senza ?luce3 il modulo non fa niente. */
var Luce3 = (function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : {};
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const M = Q.match(/[?&]luce3(?:=([ab]))?\b/);
  const CAPACE = !!M;   // il codice entra negli shader solo con ?luce3
  const TEL = /[?&](leggera|bassa)\b/.test(Q) || (!/[?&]alta\b/.test(Q) && typeof matchMedia !== 'undefined' && (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })());
  // le varianti (le manopole): forza del tratteggio, muri lungo i corsi, da che tono l'incrocio, occlusione, rimbalzo, eco delle bande
  const V = {
    // [luce4] (DECISIONI.md, Luce: «lo spigolo fra le facce», mano «matita», muri meno saturi al sole): alza = il cielo che gira attorno allo
    // spigolo e l'ombra meno fonda, desat = quanto si spegne il colore pieno al sole, centro = quanto il tratteggio si apre a metà dei muri
    // grandi, chiuso = il peso della riga nell'ombra chiusa (1 = come luce3)
    // [luce5] (il direttore su luce4: «colori un po' ingrigiti, trame poco visibili, bordi a scaletta, tutto un po' scuro, mancano le campiture
    // a linee»): desat quasi tolta, la croma torna (spinta, tetti più alti) ma dentro lo schermo (gamut), tinta = quanto la tavolozza di E tira
    // la tinta verso l'inchiostro (.85 oggi), nitido = il dettaglio fine (la trama) rinforzato nel passo, luce = i medi e le ombre più chiari,
    // il tratteggio pieno a linee d'inchiostro nell'ombra (chiuso 1, centro quasi niente), il filo dei contorni pesato dalla copertura
    a: { tratto: .85, corsi: 0, incrocio: .06, ao: .34, aoR: .9, rimb: .3, bande: 0, alza: 1.8, desat: .12, centro: .25, chiuso: 1, spinta: .38, tettoC: .16, tettoM: .2, tinta: .55, nitido: .9, luce: .28, scala: 2.1, croce: 1, macchie: .5, l7: 1 },
    b: { tratto: .56, corsi: 1, incrocio: .085, ao: .62, aoR: 1.0, rimb: .18, bande: 0, alza: 0, desat: 0, centro: 0, chiuso: 1, spinta: .45, tettoC: 9, tettoM: 9, tinta: .85, nitido: 0, luce: 0, scala: 2.4, croce: 1, macchie: 1 },
  };
  const S = { on: CAPACE, v: (M && M[1]) || 'a', debug: false, chunk: false, passo: 0, programmi: 0, avvisi: [] };
  // le uniform: oggetti semplici (non Vector4): UniformsUtils.clone li passa per riferimento, così ogni materiale vede lo stesso valore
  const U6 = { x: 0, y: 0, z: 0, w: 1 }, U7 = { x: 1 / 3, y: 0, z: 1, w: .85 };   // sgL7 [luce6]: 1/lato della mappa dei toni (m), -, incrocio, neri pieni   // sgL6 [luce4]: alza, desat, centro, chiuso
  const U3 = { x: 0, y: 0, z: 1, w: 1 }, U4 = { x: 0, y: 159, z: 0, w: 0 }, U5 = { x: 0, y: 0, z: 0, w: 0 };   // sgL3: acceso (-1 la prova), forza, scala px (righe/540), giorno · sgL4: corsi, profondità della mappa d'ombra (m), origine x, z · sgL5: rimbalzo rgb, origine y
  const P3 = { value: { x: 0, y: 0, z: 1, w: 0 } };   // l3P nel passo: acceso, occlusione, raggio (m), la prova (il bersaglio della scena così com'è)
  const Q3 = { value: { x: .45, y: 9, z: 9, w: .85 } }, R3 = { value: { x: 0, y: 0, z: 0, w: 0 } };   // [luce5] l3Q.w la tinta della tavolozza; l3R: nitido, luce   // l3Q nel passo [luce4]: la croma in più della tavolozza di E (.45 oggi), il tetto della croma nei chiari e nei medi (Oklab; 9 = nessuno)

  // ------------------------------------------------------------ [luce6] le mappe dei toni ------------------------------------------------------------
  // LE MAPPE DEI TONI (Praun et al., «tonal art maps»): disegnate una volta al caricamento su una tela, a mano libera simulata. sgL3A: quattro
  // livelli di tratteggio in una direzione, uno per canale, ANNIDATI (il livello k contiene i tratti dei precedenti più i suoi: la miscela fra
  // due livelli non fa mai sparire un tratto, lo fa solo crescere). sgL3B: R e G due livelli dell'incrocio, B un rumore largo che spezza le
  // estremità verso la luce. Ogni tratto: pieno all'attacco e sottile in coda (pieno-fine), estremità sollevate, appena mosso, lunghezze e
  // spazi irregolari, file non dritte, le code che si sovrappongono. Il profilo è morbido (sfocato di 1 px): lo shader sceglie lo spessore con
  // la soglia (più spesso nel buio). Mipmap: da lontano il tratto sfuma invece di sfarfallare.
  let TAMC = null;
  function TAM() {
    if (TAMC) return TAMC;
    const N = 512; let sd = 7919; const rnd = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    const tela = () => { const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.fillRect(0, 0, N, N); x.fillStyle = '#fff'; x.filter = 'blur(0.9px)'; return x; };
    const tratto = (x, x0, y0, L, w, ang) => {   // un tratto pieno-fine lungo L px, spessore massimo w, mosso, con l'attacco più pieno
      const n = 14, fa = rnd() * 6.28, fq = .6 + rnd() * .9, am = .6 + rnd() * 1.4, up = [], dn = [], ca = Math.cos(ang), sa = Math.sin(ang);
      for (let k = 0; k <= n; k++) { const t = k / n, px = t * L, py = Math.sin(t * 6.28 * fq + fa) * am, ww = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15 + .02)), .55) * (1.2 - .5 * t) * .5;
        up.push([px, py - ww]); dn.push([px, py + ww]); }
      const pts = up.concat(dn.reverse());
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { x.beginPath(); pts.forEach(([px, py], i) => { const X = x0 + ox + px * ca - py * sa, Y = y0 + oy + px * sa + py * ca; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); }); x.closePath(); x.fill(); } };
    const fila = (tele, y, liv, wMax) => {   // una fila: tratti di lunghezza e spazio irregolari, le code sovrapposte
      let x0 = -rnd() * 120; const ang0 = (rnd() - .5) * .05;
      while (x0 < N) { const L = 60 + rnd() * 150, w = wMax * (.7 + rnd() * .45); const yy = y + (rnd() - .5) * 5;
        for (let k = liv; k < 4; k++) tratto(tele[k], x0, yy, L, w, ang0 + (rnd() - .5) * .04);
        x0 += L - 6 + (rnd() < .35 ? -14 * rnd() : 4 + rnd() * 34); } };
    // A: 32 file a passo irregolare; il livello di ogni fila: 1 ogni 8, 2 ogni 8 (sfalsato), 3 ogni 4, 4 il resto (4, 8, 16, 32 file)
    const A = [tela(), tela(), tela(), tela()], ys = []; let y = rnd() * 8;
    for (let j = 0; j < 32; j++) { ys.push(y); y += N / 32 * (.7 + rnd() * .6); }
    const sc = N / y; ys.forEach((yy, j) => { const liv = j % 8 === 0 ? 0 : j % 4 === 0 ? 1 : j % 2 === 0 ? 2 : 3; fila(A, yy * sc, liv, [6.5, 5.6, 4.6, 3.8][liv]); });
    for (let k = 0; k < 70; k++) tratto(A[3], rnd() * N, rnd() * N, 40 + rnd() * 90, 3.2, (rnd() - .5) * .08);   // il livello più fondo: tratti brevi in più fra le file
    // B: l'incrocio (8 e 16 file) e il rumore largo
    const B = [tela(), tela(), tela(), tela()]; y = rnd() * 10; const yb = [];
    for (let j = 0; j < 24; j++) { yb.push(y); y += N / 24 * (.7 + rnd() * .6); }
    const sb = N / y; yb.forEach((yy, j) => fila(B, yy * sb, j % 2 === 0 ? 2 : 3, j % 2 === 0 ? 5.5 : 4.5));
    const dati = (tele, rumore) => { const d = new Uint8Array(N * N * 4), im = tele.map(t => t.getImageData(0, 0, N, N).data);
      const G = 8, g = []; for (let i = 0; i < G * G; i++) g.push(rnd());
      const sm = t => t * t * (3 - 2 * t), q = (p, r) => g[(r % G) * G + (p % G)];
      for (let i = 0; i < N * N; i++) {
        if (!rumore) { d[i * 4] = im[0][i * 4]; d[i * 4 + 1] = im[1][i * 4]; d[i * 4 + 2] = im[2][i * 4]; d[i * 4 + 3] = im[3][i * 4]; continue; }
        const u = (i % N) / N * G, v = Math.floor(i / N) / N * G, a = Math.floor(u), b = Math.floor(v), fu = sm(u - a), fv = sm(v - b);
        const n = (q(a, b) * (1 - fu) + q(a + 1, b) * fu) * (1 - fv) + (q(a, b + 1) * (1 - fu) + q(a + 1, b + 1) * fu) * fv;
        d[i * 4] = im[2][i * 4]; d[i * 4 + 1] = im[3][i * 4]; d[i * 4 + 2] = Math.round(n * 255); d[i * 4 + 3] = 255; }
      const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t; };
    TAMC = { a: dati(A, false), b: dati(B, true) }; return TAMC;
  }

  // ------------------------------------------------------------ i pezzi dei materiali ------------------------------------------------------------
  const GL_COMMON = `
#ifdef STANDARD
uniform vec4 sgL3; uniform vec4 sgL4; uniform vec4 sgL5; uniform vec4 sgL6; uniform vec4 sgL7; uniform sampler2D sgL3A; uniform sampler2D sgL3B;   // [luce3] (luce3.js) [luce6] sgL7: 1/lato della mappa (m), -, incrocio, neri · le mappe dei toni
float sgL3Sun = 0., sgL3T = 1., sgL3Ink = 0.;
vec3 l3E0( vec3 f, vec3 d ) { return normalize( cross( f, d ) ); }   // [luce7]
float sgL3Forma( float d, float b ) {   // [luce3] la forma che gira: il coseno continuo con la spalla, un'eco delle bande
  float x = 1. - pow( 1. - d, 1.4 ), band = .38 * smoothstep( .0, .08, d ) + .62 * smoothstep( .3, .4, d );
  return mix( x, band, ${'${BANDE}'} * b ); }
float sgL3Rig( highp float x, float T0, float w ) {   // [luce3] una famiglia di righe agli interi di x (ferma nel mondo): ottave per stare fra T0 e 2·T0 px, le righe di mezzo entrano sfumando; mezza larghezza w px, bordo di 1 px
  highp float g = max( fwidth( x ), 1e-6 ); float f = log2( 1. / ( g * T0 ) ), o = clamp( floor( f ), 0., 5. ), t = f > 0. ? fract( f ) : 0.;
  highp float s = exp2( o ), xx = x * s; float gg = float( g * s );
  float a = 1. - smoothstep( w - .5, w + .5, abs( fract( xx + .5 ) - .5 ) / gg );
  float b = 1. - smoothstep( w - .5, w + .5, abs( fract( xx ) - .5 ) / gg );
  return max( a, b * smoothstep( .25, 1., t ) * step( 0., f ) ) * smoothstep( .6 * T0, T0, 1. / float( g ) ); }
#endif
`;
  // il tratteggio: chiamato a luci finite (lights_fragment_end), con la normale e il punto nel mondo
  const GL_TRATTO = `
#if defined( STANDARD ) && !defined( USE_SKINNING ) && !defined( SG_ACQUA ) && !defined( SG_FOGLIA ) && !defined( SG_VETRO ) && !defined( SG_BUCO ) && !defined( SG_CATP ) && !defined( SG_L3NO )
  if ( sgL3.x > 0. && sgL3.y > 0. ) {   // [luce6] IL TRATTEGGIO A INCHIOSTRO: le mappe dei toni disegnate a mano (sgL3A, sgL3B), ferme nel mondo
    highp vec3 l3P = vSgW;   // il punto nel mondo così com'è (nessuna origine che si sposta: le righe non saltano mai)
#ifdef FLAT_SHADED
    vec3 l3F = normalize( cross( dFdx( vSgW ), dFdy( vSgW ) ) ); l3F *= sign( dot( l3F, cameraPosition - vSgW ) + 1e-6 );
#else
    vec3 l3F = inverseTransformDirection( normalize( vNormal ) * faceDirection, viewMatrix );   // la normale dei vertici, liscia (non la micro-normale)
#endif
    vec3 l3U = vec3( 0., 1., 0. );
    float l3Wall = 1. - smoothstep( .45, .8, abs( l3F.y ) ), l3Under = smoothstep( -.35, -.75, l3F.y );
    float l3Roof = smoothstep( .42, .55, l3F.y ) * ( 1. - smoothstep( .95, .985, l3F.y ) ) * smoothstep( 1.8, 2.8, l3H );
    // la direzione del tratto, come la sceglie un incisore: muri in diagonale a 60° nel piano del muro, falde giù per la pendenza, suolo lungo la luce
    // [luce7] ogni faccia la sua mano: dal piano della faccia (normale e distanza, arrotondate) un caso fermo nel mondo che cambia l'angolo,
    // il passo e la densità fra facce vicine
    highp float l3Id = dot( floor( l3F * 3. + .5 ), vec3( 7., 13., 3. ) ) + floor( dot( l3F, l3P ) * 1.3 );
    float l3R1 = fract( sin( l3Id * 12.9898 ) * 43758.55 ), l3R2 = fract( sin( l3Id * 78.233 + 1.7 ) * 24634.63 );
    float l3Va = sgL7.y * ( l3R1 - .5 );
    vec3 l3D;
    if ( l3Roof > .5 ) l3D = normalize( l3U - l3F * l3F.y );
    else if ( l3Wall > .5 ) { vec3 tH = normalize( cross( l3U, l3F ) ); float an = mix( mix( 1.047, 1.571, sgL4.x ), .35 + l3R1 * 1.2, sgL7.y ); l3D = normalize( tH * cos( an ) + l3U * sin( an ) ); }
    else { vec3 lw0 = vec3( .5, 0., .866 );
#if NUM_DIR_LIGHTS > 0
      { vec3 lw = inverseTransformDirection( directionalLights[ 0 ].direction, viewMatrix ); vec2 lh = lw.xz; lw0 = normalize( mix( lw0, vec3( lh.x, 0., lh.y ) / max( length( lh ), 1e-3 ), smoothstep( .12, .3, length( lh ) ) ) ); }
#endif
      l3D = normalize( lw0 - l3F * dot( lw0, l3F ) ); l3D = normalize( l3D + l3E0( l3F, l3D ) * l3Va * .9 ); }
    vec3 l3E = normalize( cross( l3F, l3D ) );
    highp vec2 l3Q = vec2( dot( l3P, l3D ), dot( l3P, l3E ) ) * sgL7.x * ( 1. + sgL7.y * ( l3R2 - .5 ) * .5 );
    float l3Mat = metalnessFactor > .5 ? .25 : ( roughnessFactor < .35 ? .5 : 1. );
    // il tono: in piena luce niente; più fondo verso il bordo dell'ombra, al piede dei muri, sotto gronde e balconi, appena oltre il terminatore
    float l3Dk = 1. - smoothstep( .1, .46, sgL3T );
    float l3Ct = l3Wall * ( 1. - smoothstep( .0, 1.5, l3H ) ) + l3Under;
    float l3Core = ( 1. - smoothstep( -.04, .12, l3Ds ) ) * sgL3.w;
    float l3Ed = 0.;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    if ( l3Dk > .05 && sgOmbra < .6 && l3Ds > .05 ) {   // nell'ombra portata: quanto è vicina la luce (4 letture della mappa a ~0,5 m): le righe si addensano verso il bordo
      vec4 sc = vDirectionalShadowCoord[ 0 ]; vec3 p = sc.xyz / sc.w; p.z += directionalLightShadows[ 0 ].shadowBias; vec2 r = 14. / directionalLightShadows[ 0 ].shadowMapSize;
      l3Ed = .125 * ( step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy + vec2( r.x, 0. ) ) ) ) + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy - vec2( r.x, 0. ) ) ) )
                   + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy + vec2( 0., r.y ) ) ) ) + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy - vec2( 0., r.y ) ) ) )
                    + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy + r * .5 ) ) ) + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy - r * .5 ) ) )
                    + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy + vec2( r.x, -r.y ) * .5 ) ) ) + step( p.z, unpackRGBAToDepth( texture2D( directionalShadowMap[ 0 ], p.xy + vec2( -r.x, r.y ) * .5 ) ) ) ); }
#endif
    float h = clamp( l3Dk * ( .64 + .3 * l3Ed + .35 * l3Ct + .25 * l3Core * smoothstep( -.7, -.05, l3Ds ) ), 0., 1. );
    // [luce7] IL SEGNO SOLO DOVE SUCCEDE QUALCOSA: su una faccia piana a tono costante niente. Nasce al bordo dell'ombra portata, al piede del
    // muro, sotto gronde e balconi, sul terminatore delle forme curve (le colonne, i vasi: dove la normale gira) e sfuma a zero dentro la
    // faccia. Le ombre larghe le risolve il colore
    float l3Tm = l3Core * smoothstep( -.4, -.02, l3Ds ) * smoothstep( .004, .03, length( fwidth( l3F ) ) );
    float l3Ev = max( max( .95 * sqrt( l3Ed ), .8 * l3Wall * ( 1. - smoothstep( .0, 1.1, l3H ) ) ), max( .55 * l3Under, .8 * l3Tm ) );
    h = mix( h, l3Dk * l3Ev, sgL7.y );
    if ( h > .02 ) {
      vec4 tA = texture2D( sgL3A, l3Q ), tN = texture2D( sgL3B, l3Q * .21 + .37 );
      // [luce7] la densità non scende a file rade (la «pioggia»): resta fitta e il segno sfuma assottigliandosi e spezzandosi
      float lv = mix( min( h * 4.3, 4. ), clamp( 1.6 + h * 2.4 + ( l3R2 - .5 ) * 1.2, 0., 4. ), sgL7.y ), v = dot( tA, clamp( 1. - abs( lv - vec4( 1., 2., 3., 4. ) ), 0., 1. ) );
      // la riga più spessa nel buio, più sottile e spezzata verso la luce (la soglia sul profilo morbido del tratto)
      float th = mix( mix( .64, .3, h ), mix( .92, .34, h ), sgL7.y ) + ( tN.b - .5 ) * .4 * ( 1. - h ), aa = clamp( fwidth( v ) * .8, .03, .3 );
      float cov = smoothstep( th - aa, th + aa, v );
      // [luce7] i vuoti: file interrotte a chiazze larghe (ferme nel mondo)
      cov *= mix( 1., smoothstep( .28, .5, texture2D( sgL3B, l3Q * .07 + l3R1 ).b ) * smoothstep( .03, .2, h ), sgL7.y );
      // l'incrocio solo nell'ombra propria e nei sotto
      float cr = clamp( ( l3Core * .9 + l3Under ) * smoothstep( .35, .8, h ), 0., 1. ) * 2. * sgL7.z;
      if ( cr > .02 ) { vec3 d2 = normalize( l3D * .34 + l3E * .94 ); highp vec2 q2 = vec2( dot( l3P, d2 ), dot( l3P, cross( l3F, d2 ) ) ) * sgL7.x * 1.13;
        vec4 tC = texture2D( sgL3B, q2 ); float v2 = dot( tC.rg, clamp( 1. - abs( min( cr, 2. ) - vec2( 1., 2. ) ), 0., 1. ) );
        cov = max( cov, smoothstep( th - aa, th + aa, v2 ) ); }
      // il nero pieno nelle tasche più fonde (il piede del muro nell'ombra chiusa, il sotto delle gronde), col bordo a pennello
      cov = max( cov, smoothstep( .84, .94, h * ( .72 + .28 * l3Ct ) + ( tN.b - .5 ) * .22 ) * sgL7.w );
      sgL3Ink = cov * sgL3.y * l3Mat * ( 1. - smoothstep( 30., 45., length( vViewPosition ) ) ) * mix( .45, 1., sgL3.w );
      reflectedLight.indirectDiffuse *= 1. + .22 * h * sgL3.y * l3Mat; }   // la carta fra i tratti un filo più chiara: il valore medio lo porta l'inchiostro
  }
#endif`;
  const GL_FINE = `
#if defined( STANDARD ) && !defined( USE_SKINNING ) && !defined( SG_ACQUA )
{ vec3 l3N = inverseTransformDirection( geometry.normal, viewMatrix ); float l3H = vSgW.y - sgP2.w;
  float l3Sun = 0., l3Ds = -1.;
#if NUM_DIR_LIGHTS > 0
  l3Ds = dot( geometry.normal, directionalLights[ 0 ].direction );
  l3Sun = smoothstep( .0, .45, l3Ds );
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  l3Sun *= sgOmbra;
#endif
#endif
  sgL3Sun = l3Sun;
  if ( sgL3.x != 0. ) {
    float l3Muro = 1. - smoothstep( .45, .8, abs( l3N.y ) );
#ifndef SG_FOGLIA
    // il cielo che si vede: meno al piede della via, più in alto; meno sotto gronde e balconi
    float l3Cielo = mix( 1., mix( .86, 1.12, smoothstep( -.5, 9., l3H ) ), l3Muro ) * ( 1. - .25 * smoothstep( -.25, -.85, l3N.y ) );
    reflectedLight.indirectDiffuse *= l3Cielo;
    // [luce4] LO SPIGOLO FRA LE FACCE: le facce vicine al terminatore (quella di sbieco al sole e quella appena girata) vedono il cielo
    // chiaro dalla parte del sole, quella girata del tutto il cielo opposto: il valore scende per gradi da faccia a faccia, non in due salti.
    // E l'ombra (propria e portata) un filo meno fonda. Il bordo dell'ombra portata non cambia (è nel sole, non qui)
    if ( sgL6.x > 0. ) { float l3Lato = smoothstep( -.85, .12, l3Ds ) * ( 1. - smoothstep( .12, .7, l3Ds ) );
      vec3 l3Sc = sgP3.rgb;   // il cielo accanto al sole è caldo: la faccia vicina al terminatore non diventa lilla
#if NUM_DIR_LIGHTS > 0
      { vec3 sc = directionalLights[ 0 ].color; const vec3 lw = vec3( .3, .59, .11 ); l3Sc = mix( sgP3.rgb, sc * dot( sgP3.rgb, lw ) / max( dot( sc, lw ), 1e-3 ), .6 * smoothstep( -.3, .25, l3Ds ) ); }
#endif
      reflectedLight.indirectDiffuse += diffuseColor.rgb * sgP2.x * sgL6.x * ( l3Sc * .55 * l3Lato + sgP3.rgb * .22 * ( 1. - l3Sun ) ); }
    reflectedLight.directDiffuse *= mix( 1., mix( mix( .74, .76, sgL6.x ), mix( 1.05, .92, sgL6.x ), smoothstep( .0, 10., l3H ) ), l3Muro );   // il sole sul muro più pieno in alto, più spento verso la via ([luce4] e un poco meno forte: il muro al sole resta sotto la spalla, la trama si legge)
#if NUM_DIR_LIGHTS > 0 && !defined( SG_L3NO )
    if ( sgL6.y > 0. ) {   // [luce4] il colore pieno al sole si spegne (l'arancio e il giallo dei muri non diventano lastre accese): verso un muro grigio sotto lo stesso sole, a pari luminanza, solo dove il colore è molto saturo
      vec3 a = diffuseColor.rgb; float c = max( a.r, max( a.g, a.b ) ) - min( a.r, min( a.g, a.b ) ), k = sgL6.y * smoothstep( .15, .6, c );
      vec3 sc = directionalLights[ 0 ].color / max( max( directionalLights[ 0 ].color.r, max( directionalLights[ 0 ].color.g, directionalLights[ 0 ].color.b ) ), 1e-3 ); const vec3 lw = vec3( .2126, .7152, .0722 );
      vec3 dd = reflectedLight.directDiffuse; reflectedLight.directDiffuse = mix( dd, sc * dot( dd, lw ) / max( dot( sc, lw ), 1e-3 ), k ); }
#endif
    // il rimbalzo del suolo al sole (caldo) sui primi metri dei muri ([luce4] più alto e più forte sulle facce in ombra: il piede del lato in ombra si apre)
    reflectedLight.indirectDiffuse += diffuseColor.rgb * sgL5.rgb * l3Muro * ( 1. - smoothstep( .3, mix( 6., 8., sgL6.x ), l3H ) ) * saturate( .55 - l3N.y ) * ( 1. + 1.3 * sgL6.x * ( 1. - l3Sun ) );
#else
    float l3Cielo = 1.;
#endif
    // il tono della luce (1 sole pieno): l'ombra fonda è il piede dei muri in ombra e il sotto delle cose
    sgL3T = l3Sun * .8 + .2 * l3Cielo * ( 1. - .6 * l3Muro * ( 1. - smoothstep( .0, 3.5, l3H ) ) );
${'${TRATTO}'}
  } }
#endif`;
  // l'ombra: il bordo netto vicino a chi la fa, aperto lontano (una lettura in più, solo nella penombra)
  const GL_OMBRA = `
#if defined( STANDARD ) && defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
float sgL3Ombra( float s, sampler2D sm, vec4 sc, float bias, vec2 msz ) {   // [luce3]
  if ( s <= .002 || s >= .998 ) return s;
  vec3 p = sc.xyz / sc.w; p.z += bias; vec2 tx = 1. / msz;
  float d = min( min( unpackRGBAToDepth( texture2D( sm, p.xy + vec2( tx.x, 0. ) ) ), unpackRGBAToDepth( texture2D( sm, p.xy - vec2( tx.x, 0. ) ) ) ),
                 min( unpackRGBAToDepth( texture2D( sm, p.xy + vec2( 0., tx.y ) ) ), unpackRGBAToDepth( texture2D( sm, p.xy - vec2( 0., tx.y ) ) ) ) );
  float k = smoothstep( .5, 6., max( p.z - d, 0. ) * sgL4.y );   // i metri fino a chi fa l'ombra: 0 a contatto, 1 lontano
  return mix( smoothstep( .3, .7, s ), s, k ); }
#endif
`;
  const SPALLA = `
#if defined( STANDARD )
if ( sgL3.x > 0. ) { float l3m = max( outgoingLight.r, max( outgoingLight.g, outgoingLight.b ) );   // [luce3] la spalla larga: sotto .78 niente; sopra, i chiari si stringono piano (da 1 a 3 restano distinti invece di finire tutti sul tetto)
  if ( l3m > .78 ) outgoingLight *= ( .78 + .32 * ( 1. - exp( -( l3m - .78 ) / .8 ) ) ) / l3m;
  outgoingLight = mix( outgoingLight, vec3( .108, .1, .09 ), sgL3Ink ); }   // [luce6] l'inchiostro della tavolozza (#1A1A1A appena caldo), non un grigio
#endif
`;
  const DEBUG = `
#if defined( STANDARD )
if ( sgL3.x < -.5 ) gl_FragColor.rgb = vec3( sgL3Sun, sgL3T, 1. );   // [luce3] la prova: il sole e il tono della luce (le misure delle tavole)
#endif`;

  function avvisa(s) { S.avvisi.push(s); console.warn('[luce3]', s); }
  function rimpiazza(C, k, da, a) { if (C[k].indexOf(da) < 0) { avvisa('pezzo non trovato in ' + k + ': ' + da.slice(0, 60)); return false; } C[k] = C[k].replace(da, a); return true; }
  function pezzi() {
    if (S.chunk || typeof THREE === 'undefined') return; const C = THREE.ShaderChunk;
    if (C.common.indexOf('sgP10') < 0) { avvisa('i pezzi del look (render.js sguProPezzi) non ci sono: niente luce3 nei materiali'); return; }
    S.chunk = true; const v = V.a;
    ['standard', 'physical'].forEach(k => Object.assign(THREE.ShaderLib[k].uniforms, { sgL3: { value: U3 }, sgL4: { value: U4 }, sgL5: { value: U5 }, sgL6: { value: U6 }, sgL7: { value: U7 }, sgL3A: { value: TAM().a }, sgL3B: { value: TAM().b } }));
    C.bsdfs += GL_COMMON.replace('${BANDE}', v.bande.toFixed(3));   // bsdfs: solo nel frammento (common sta anche nel vertice)
    C.shadowmap_pars_fragment += GL_OMBRA;
    // (1) la forma
    rimpiazza(C, 'lights_physical_pars_fragment', 'else dotNL = mix( dotNL, .38 * smoothstep(', 'else if ( sgL3.x > 0. ) dotNL = sgL3Forma( dotNL, sgP4.x ); else dotNL = mix( dotNL, .38 * smoothstep(');
    // (2) l'ombra
    rimpiazza(C, 'lights_fragment_begin', 'sgS = mix( sgS, smoothstep( .05, .95, sgS ), sgP2.x ); sgS = mix( sgS, smoothstep( .2, .8, sgS ), sgP4.x * .6 );',
      'if ( sgL3.x > 0. ) sgS = sgL3Ombra( sgS, directionalShadowMap[ i ], vDirectionalShadowCoord[ i ], directionalLightShadow.shadowBias, directionalLightShadow.shadowMapSize ); else { sgS = mix( sgS, smoothstep( .05, .95, sgS ), sgP2.x ); sgS = mix( sgS, smoothstep( .2, .8, sgS ), sgP4.x * .6 ); }');
    // (3) il cielo, il rimbalzo, il tono e il tratteggio (dopo le luci di render.js)
    C.lights_fragment_end += GL_FINE.replace('${TRATTO}', GL_TRATTO.replace(/sgL3INC/g, '( sgL4.x > .5 ? ' + V.b.incrocio.toFixed(3) + ' : ' + V.a.incrocio.toFixed(3) + ' )'));
    C.dithering_fragment += DEBUG;
    C.output_fragment = SPALLA + C.output_fragment;
  }

  // ------------------------------------------------------------ il passo finale ------------------------------------------------------------
  // il testo del passo si ritocca alla compilazione: ShaderMaterial.prototype.onBeforeCompile (solo per chi non ne ha uno suo)
  // [luce5] la copertura del filo dalla scaletta: F il pixel davanti, T un pixel lungo il bordo, O un pixel verso il fondo; torna s (0-1)
  const L3RUN = `#ifdef SG_PFD
float l3Run(vec2 F, vec2 T, vec2 O, float th) {
  highp float d0 = fD(F); float a = 0., b = 0., ea = 0., eb = 0., ga = 1., gb = 1.;
  for (int k = 1; k <= 4; k++) { float fk = float(k);
    if (ga > .5) { vec2 X = F + T * fk; highp float dx = fD(X); if (fD(X + O) / dx - 1. > th) a += 1.; else { ga = 0.; ea = step(dx / d0 - 1., th); } }
    if (gb > .5) { vec2 X = F - T * fk; highp float dx = fD(X); if (fD(X + O) / dx - 1. > th) b += 1.; else { gb = 0.; eb = step(dx / d0 - 1., th); } } }
  float L = a + b + 1.;
  return ea * (1. - eb) * (b + .5) / L + eb * (1. - ea) * (a + .5) / L; }
#endif
`;
  function passo(sh) {
    let f = sh.fragmentShader; if (typeof f !== 'string' || f.indexOf('eRig(') < 0 || f.indexOf('[luce3]') >= 0) return;
    const RM = /void main\(\)\{\s*vec2 vUv = vUv0;/;
    if (!RM.test(f)) { avvisa('passo: main non trovato'); return; }
    f = f.replace(RM, m => 'uniform vec4 l3P;   /* [luce3] acceso, occlusione, raggio (m), la prova */\n        ' + m + '\n          if (l3P.w > .5) { vec4 dq = texture2D(t, vUv0); gl_FragColor = vec4(dq.r, dq.g, dq.a, 1.); return; }   /* [luce3] la prova: il bersaglio della scena così com\'è (sole, tono, categoria) */');
    // il tratteggio del passo spento con luce3 (il tratteggio sta nei materiali)
    const A1 = 'highp vec3 pw = fp0 - eO;', A2 = '* vivo * k * sE.w;';
    if (f.indexOf(A1) >= 0 && f.indexOf(A2) >= 0) f = f.replace(A1, 'if (l3P.x < .5) { ' + A1).replace(A2, A2 + ' }   /* [luce3] */');
    else avvisa('passo: il tratteggio di E non trovato');
    // l'occlusione nelle pieghe, prima della tavolozza di E
    const B1 = '#if defined(SG_STILE) && defined(SG_PFD)\n          if (sE.x > 0.) {';
    const AO = `#ifdef SG_PFD
          if (l3P.x > .5 && l3P.y > 0. && fSky < .5) {   /* [luce3] L'OCCLUSIONE: coppie di letture opposte a ~l3P.z metri nel mondo; il punto più lontano della media della coppia
               (con l'inverso della distanza: sul piano la coppia si annulla) sta in una piega: il piede del muro, l'angolo, sotto la gronda e il balcone.
               I salti grandi (una sagoma davanti) non contano. Verso il lilla della tavolozza, non grigio */
            float rp = clamp(l3P.z * src.y / (2. * fN.w * fd0), 3., 70. * src.y / 1080.), i0 = 1. / fd0, oc = 0.;
            for (int k = 0; k < 4; k++) { float a = .3 + float(k) * .7854; vec2 o = vec2(cos(a), sin(a)) * e * rp * (mod(float(k), 2.) > .5 ? .55 : 1.);
              highp float da = fD(vUv + o), db = fD(vUv - o); float cr = (.5 * (1. / da + 1. / db) - i0) * fd0 * fd0, ok = 1. - smoothstep(l3P.z * .9, l3P.z * 1.8, max(abs(da - fd0), abs(db - fd0)));
              oc += smoothstep(.02, .22, cr / l3P.z) * ok; }
            oc = min(1., oc * .4) * (1. - smoothstep(30., 45., fd0));
#ifdef SG_STILE
            oc *= 1. - eP0;
#endif
            c *= mix(vec3(1.), vec3(.64, .61, .76), oc * l3P.y); }
#endif
`;
    if (f.indexOf(B1) >= 0) f = f.replace(B1, AO + B1); else avvisa('passo: il punto dell\'occlusione non trovato');
    // [luce4] LA CROMA: la tavolozza di E spinge la croma ×1,45 e un muro arancio esce dallo schermo: il rosso a 1, il blu a 0, tutti i pixel
    // uguali (la «lastra accesa», la trama sparita). Con luce4 la spinta è minore e la croma passa per una spalla morbida (più bassa nei
    // chiari): l'arancio resta arancio, dentro lo schermo, e la trama torna a leggersi
    const C1 = 'ab *= 1. + .45 * k * smoothstep(.05, .09, Cc);';
    if (f.indexOf(C1) >= 0) f = f.replace(C1, 'ab *= 1. + mix(l3Q.x, .45, step(.5, eP0)) * k * smoothstep(.05, .09, Cc);   /* [luce4] le persone come oggi */\n            if (l3P.x > .5 && eP0 < .5) { float l3C = length(ab), l3K = mix(l3Q.z, l3Q.y, smoothstep(.5, .78, lab.x)); if (l3C > l3K) ab *= (l3K + .06 * (1. - exp(-(l3C - l3K) / .06))) / l3C; }   /* [luce4] */');
    else avvisa('passo: la croma di E non trovata');
    const rep = (da, a, nome) => { if (f.indexOf(da) >= 0) f = f.replace(da, a); else avvisa('passo: ' + nome + ' non trovato'); };
    // [luce5] la tinta: la tavolozza tira la tinta verso l'inchiostro meno (la variazione di colore della trama resta)
    rep('vec2 ab = mix(lab.yz, tab / max(length(tab), 1e-4) * mix(Cc, length(tab), .35), .85 * k * smoothstep(.03, .07, Cc));',
      'vec2 ab = mix(lab.yz, tab / max(length(tab), 1e-4) * mix(Cc, length(tab), .35), (l3P.x > .5 ? l3Q.w : .85) * k * smoothstep(.03, .07, Cc));', 'la tinta di E');
    // [luce5] LA TRAMA: il dettaglio fine del valore (il pixel meno la media dei 4 vicini in diagonale, dalla scena così com'è) rinforzato, ma
    // limitato a ±.045: le trame (intonaco, basoli, coppi) si leggono, i bordi grandi no (niente aloni, niente scaletta in più). 5 letture
    rep('vec3 lc = pow(max(c, 0.), vec3(2.2));', `if (l3P.x > .5 && l3R.x > 0.) { vec3 l3n = texture2D(t, vUv + e).rgb + texture2D(t, vUv - e).rgb + texture2D(t, vUv + vec2(e.x, -e.y)).rgb + texture2D(t, vUv + vec2(-e.x, e.y)).rgb;
              float l3d = dot(texture2D(t, vUv).rgb - l3n * .25, vec3(.3, .59, .11)); c += clamp(l3d, -.045, .045) * l3R.x * vivo; }   /* [luce5] */
            vec3 lc = pow(max(c, 0.), vec3(2.2));`, 'la trama');
    // [luce5] PIÙ LUCE: i medi e le ombre su (una curva che lascia i bianchi e i neri dove sono)
    rep('Lc = Lc > .85 ? .85 + (Lc - .85) * .55 : Lc;', 'Lc = Lc > .85 ? .85 + (Lc - .85) * .55 : Lc; if (l3P.x > .5) Lc = mix(Lc, 1. - (1. - Lc) * (1. - Lc), l3R.y * (1. - eP0));', 'la luce di E');
    // [luce5] IL COLORE DENTRO LO SCHERMO: se un canale esce (sotto 0 o sopra 1) la croma scende verso il grigio di pari luminanza fino al bordo
    // dello schermo, non si taglia il canale: la luminanza resta, e con lei la trama (invece della lastra piatta 255, 87, 0)
    rep('c = pow(max(vec3(dot(m3, vec3(4.0767417, -3.3077116, .2309699)), dot(m3, vec3(-1.2684380, 2.6097574, -.3413194)), dot(m3, vec3(-.0041961, -.7034186, 1.7076147))), 0.), vec3(1. / 2.2));',
      `vec3 l3g = vec3(dot(m3, vec3(4.0767417, -3.3077116, .2309699)), dot(m3, vec3(-1.2684380, 2.6097574, -.3413194)), dot(m3, vec3(-.0041961, -.7034186, 1.7076147)));
            if (l3P.x > .5) { float Y = clamp(Lc * Lc * Lc, .001, .999); vec3 d = l3g - Y;
              vec3 tl = mix(vec3(9.), Y / max(-d, 1e-3), step(l3g, vec3(0.))), th = mix(vec3(9.), (1. - Y) / max(d, 1e-3), step(vec3(1.), l3g));
              l3g = Y + d * min(1., min(min(min(tl.x, tl.y), tl.z), min(min(th.x, th.y), th.z))) * .995; }   /* [luce5] */
            c = pow(max(l3g, 0.), vec3(1. / 2.2));`, 'il colore di E');
    // [luce5] I CONTORNI SENZA SCALETTA: il filo pesato dalla copertura (il colore del pixel di bordo col MSAA dice quanta parte è della cosa
    // davanti), come fa già il profilo leggero con MSAA (SG_HDAA), ora anche al computer: il filo scivola col bordo invece di fare i gradini
    rep('#ifdef SG_HDAA\n            /* [hd] IL FILO CON IL PESO DI COPERTURA', '#if 1\n            float l3s = 0.;\n            if (l3P.x > .5 || L3HD > .5) {   /* [luce5] */\n            /* [hd] IL FILO CON IL PESO DI COPERTURA', 'il filo HDAA');
    rep('c = mix(c, mix(vec3(.29, .306, .345), min(c * vec3(.52, .45, .38) + vec3(.02, .012, 0.), c), rv), lb); } }\n#endif', 'c = mix(c, mix(vec3(.29, .306, .345), min(c * vec3(.52, .45, .38) + vec3(.02, .012, 0.), c), rv), lb); } } }   /* [luce5] */\n#endif', 'la fine del filo HDAA');
    // senza MSAA (o col MSAA che non arriva) la copertura dal colore non c'è: viene dalla scaletta stessa (come SMAA, in piccolo). Dal pixel
    // davanti si cerca lungo il bordo fin dove arriva il suo gradino (4 px per parte) e da che parte il gradino successivo si sposta: lì il
    // bordo vero è già nel pixel di fondo, e il filo passa per una frazione (s) al pixel di fondo e per 1 - s a quello davanti. Il gradino
    // diventa una rampa. Fino a 16 letture, solo sui pixel di bordo (pochi)
    rep('if (lin > 0.) { vec3 fgI = texture2D(t, vUv - od * e).rgb, dI0 = fgI - bg; lin *= clamp(dot(c - bg, dI0) / max(dot(dI0, dI0), 1e-4), 0., 1.) * .5 + .5; }',
      'if (lin > 0.) { if (L3HD < .5) { l3s = l3Run(vUv, vec2(-od.y, od.x) * e, od * e, fB.y); } else { vec3 fgI = texture2D(t, vUv - od * e).rgb, dI0 = fgI - bg; lin *= clamp(dot(c - bg, dI0) / max(dot(dI0, dI0), 1e-4), 0., 1.) * .5 + .5; } }', 'il peso del filo');
    rep('float cv = clamp(dot(c - bgB, dN0) / max(dot(dN0, dN0), 1e-4), 0., 1.);',
      'float cv = clamp(dot(c - bgB, dN0) / max(dot(dN0, dN0), 1e-4), 0., 1.); if (L3HD < .5) cv = l3Run(vUv + on2 * e, vec2(-on2.y, on2.x) * e, -on2 * e, fB.y);', 'il filo dalla parte del fondo');
    // il peso si applica dove il filo si disegna (dopo l'anello di D2 e le altre aggiunte, che altrimenti lo riportano a 1)
    rep('c = mix(c, mix(vec3(.29, .306, .345), ink, rv), lin);   /* nel regime il grigio tecnico */', 'c = mix(c, mix(vec3(.29, .306, .345), ink, rv), lin * (1. - l3s));   /* nel regime il grigio tecnico */   /* [luce5] */', 'il filo');
    f = f.replace('uniform vec4 l3P;', 'uniform vec4 l3P; uniform vec4 l3Q; uniform vec4 l3R;\n#ifdef SG_HDAA\n#define L3HD 1.\n#else\n#define L3HD 0.\n#endif\n' + L3RUN);
    sh.fragmentShader = f; sh.uniforms.l3P = P3; sh.uniforms.l3Q = Q3; sh.uniforms.l3R = R3; S.passo++;
  }
  function aggancioPasso() {
    const P = THREE.ShaderMaterial && THREE.ShaderMaterial.prototype; if (!P || P.__l3) return; P.__l3 = true;
    const fn = function (sh) { try { passo(sh); } catch (e) { avvisa('passo: ' + e.message); } };
    fn.toString = () => 'luce3|passo';
    Object.defineProperty(P, 'onBeforeCompile', { configurable: true, get() { return this.__l3Obc || fn; }, set(f) { this.__l3Obc = f; } });
  }

  // ------------------------------------------------------------ a ogni fotogramma ------------------------------------------------------------
  let SOLE = null, NTAG = 0;
  // le persone e i mezzi senza tratteggio (tinte piatte, BIBBIA §2): un define sui loro materiali (chi arriva dopo: ogni 30 fotogrammi)
  function tagga() {
    const fa = g => { if (g) g.traverse(o => { if (!o.isMesh) return; [].concat(o.material).forEach(m => { if (!m || !m.isMeshStandardMaterial || (m.defines && 'SG_L3NO' in m.defines)) return; m.defines = Object.assign({}, m.defines, { SG_L3NO: '' }); m.needsUpdate = true; }); }); };
    try { const d = Render.__dyn; for (const k in d.people) fa(d.people[k]); for (const k in (d.vehicles || {})) fa(d.vehicles[k]); } catch (e) { }
  }
  function tick(st) {
    const on = S.on, v = V[S.v] || V.a;
    if (on && (NTAG++ % 30) === 0) tagga();
    U3.x = S.debug ? -1 : on ? 1 : 0; U3.y = on ? v.tratto : 0;
    let H = 540; try { const rt = Render.__rt; H = rt && rt.height ? rt.height : (Render.__models.renderer.domElement.height || 540); } catch (e) { }
    U3.z = Math.max(.5, H / 540);
    const hh = st && st.t !== undefined ? ((st.t / 60) % 24 + 24) % 24 : 12, ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const day = ss(5.5, 7.5, hh) * (1 - ss(19.2, 20.6, hh)); U3.w = day;
    U7.x = 1 / Math.max(.3, v.scala * 720 / Math.max(200, H)); U7.y = v.l7 || 0; U7.z = v.croce; U7.w = v.macchie;   // [luce7] U7.y: la grammatica di luce7 (0 luce6)   // [luce6] il lato della mappa in metri, a pari pixel su ogni schermo (fisso per schermo: niente che scorre)
    U4.x = v.corsi; U6.x = on ? v.alza : 0; U6.y = on ? v.desat : 0; U6.z = on ? v.centro : 0; U6.w = v.chiuso;
    try {
      if (!SOLE || !SOLE.parent) { SOLE = null; Render.__models.scene.traverse(o => { if (!SOLE && o.isDirectionalLight && o.castShadow) SOLE = o; }); }
      if (SOLE) { const c = SOLE.shadow.camera; U4.y = c.far - c.near; const k = on ? v.rimb * SOLE.intensity * day : 0; U5.x = SOLE.color.r * .62 * k; U5.y = SOLE.color.g * .52 * k; U5.z = SOLE.color.b * .4 * k; }
      const cam = Render.getCamera(), q = 61.44; U4.z = Math.round(cam.position.x / q) * q; U4.w = Math.round(cam.position.z / q) * q; U5.w = Math.round(cam.position.y / q) * q;
    } catch (e) { }
    const q = Q3.value; q.x = on ? v.spinta : .45; q.y = v.tettoC; q.z = v.tettoM; q.w = v.tinta; R3.value.x = on ? v.nitido : 0; R3.value.y = on ? v.luce : 0;
    const p = P3.value; p.x = on ? 1 : 0; p.y = on ? v.ao : 0; p.z = v.aoR; p.w = S.debug ? 1 : 0;
  }

  function installa() {
    if (!CAPACE || typeof THREE === 'undefined') return;
    aggancioPasso();
    if (typeof Render !== 'undefined' && Render.init && !Render.__luce3) {
      Render.__luce3 = true; const i0 = Render.init, f0 = Render.frame;
      Render.init = function () { const r = i0.apply(this, arguments); try { pezzi(); } catch (e) { avvisa('pezzi: ' + e.message); } return r; };
      if (f0) Render.frame = function (st) { try { tick(st); } catch (e) { } return f0.apply(this, arguments); };
    }
  }
  installa();
  const API = {
    capace: CAPACE, V, U3, U4, U5, U6, U7, P3, Q3, R3, TAM: () => TAM(), stato: () => ({ on: S.on, variante: S.v, debug: S.debug, pezzi: S.chunk, passo: S.passo, avvisi: S.avvisi.slice() }),
    get on() { return S.on; }, get variante() { return S.v; },
    // dal vivo (le sonde): 'a' | 'b' accende (e accende LUCE2, su cui poggia), 0 spegne (LUCE2 resta com'è)
    imposta(x) { if (!CAPACE) return false; if (x === 'a' || x === 'b') { S.on = true; S.v = x; try { if (W.__LUCE2) W.__LUCE2.imposta(true); } catch (e) { } } else S.on = false; return S.on; },
    prova(b) { S.debug = !!b; return S.debug; },
  };
  W.__LUCE3 = API;
  return API;
})();
if (typeof module !== 'undefined') module.exports = Luce3;
