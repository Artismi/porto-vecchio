/* Porto Vecchio — [rifcostruito] LA RIFINITURA DEL COSTRUITO (stile E, «via di mezzo 55»: BIBBIA_STILE.md, terza versione e §11 punti 1, 2, 4, 5).
   Il committente: «tetto per tetto, ombrellone per ombrellone, superficie per superficie bisogna pensare come migliorare il look... si deve
   vedere la cura per i singoli elementi e ambienti oltre quella generale». Qui la parte dei modelli e dei materiali che il passo unico
   (render.js, un altro cantiere) non può fare: la separazione degli elementi nasce dal colore di partenza e dal disegno nella materia.
   - UNA TINTA PER TIPO DI ELEMENTO, dalla tavolozza, con un gradino di valore fisso fra vicini (tinta(), FASCE): muro chiaro (pesca, osso,
     ocra, carta), cornici e telai più chiari del muro, persiane a mezzo valore (persiana, oltremare), vetri scuri (notte), tetti a mezzo
     valore (cotto, lavagna), tende e ombrelloni a righe di due inchiostri con un gradino di valore pieno fra le due.
   - TRAME PIÙ SEMPLICI: l'intonaco senza grana, macchie, colature e mattoni a vista (resta la tinta della casa); le parti dell'atlante
     (persiane, telai, davanzali, lamiere, legni) a campitura calma con il loro disegno strutturale (lamelle, assi, righe) a due toni netti.
   - GIUNTI E SPIGOLI COME LINEE DISEGNATE: il bordo di ogni faccia delle parti dell'atlante (telai, cornici, persiane, davanzali, mensole)
     è una riga scura di 1 px antialiasata (fwidth) solo sulle facce piane e solo dove la faccia è larga abbastanza sullo schermo; i tetti
     (tetti_vissuti.js) hanno ogni fila di coppi, tegole e lastre disegnata.
   Tutto acceso SOLO con ?stile=E (o window.PV_STILE che comincia con E prima del caricamento) e spento da ?norifcostruito: senza, questo
   file non installa niente e gli altri moduli leggono RifCostruito.on === false (nessuna riga di shader, nessun materiale cambiato).
   Il modo: render.js non si tocca (lo tiene il passo unico). I materiali delle case e delle parti nascono là, ma si riconoscono: l'intonaco
   dei moduli del kit porta userData.plaster, le parti stanno nei due atlanti (FA 1024 × 2048, celle da 32; CA 256 × 1024, celle da 16).
   Con lo stile acceso THREE.Material.prototype.onBeforeCompile diventa una proprietà con getter e setter: la prima funzione data a uno di
   questi materiali (o quella vuota del prototipo, per l'atlante) viene avvolta una volta sola con il pezzo di shader di qui, che gira
   PRIMA dei pezzi della fusione ([leggero]: la tavolozza, la pila delle mappe), così la pila sostituisce anche le letture di qui
   (solo texture2D(map, …): niente textureLod, niente `map` scritta altrove, la prova a vuoto di arrOk1 passa).
   Costo: nessun disegno in più, nessuna tessitura in più; ~25 operazioni e 3-4 letture per pixel sulle parti dell'atlante, ~15 sull'intonaco
   (meno di oggi: la grana, le macchie e i mattoni a 3 rumori non si calcolano più).
   window.__rifc: lo stato (materiali avvolti per genere). */
var RifCostruito = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const W = typeof window !== 'undefined' ? window : {};
  // [integra1] CAP: la rifinitura entra (nella cottura dei tasselli, o con E): l'aggancio negli shader col ramo dietro la manopola rcK (StileE),
  // le tinte calcolate per le varianti dei materiali. on: lo stile E acceso adesso (dal vivo). ?norifcostruito spegne tutto, come prima
  const KILL = /[?&]norifcostruito\b/.test(Q), SE = typeof StileE !== 'undefined' ? StileE : null;
  const STILE_E = SE ? SE.capace : (/[?&]stile=e\d?\b/i.test(Q) || /^E/i.test(String(W.PV_STILE || '')));
  const ON = STILE_E && !KILL;
  const RCK = SE ? SE.u('rcK') : { value: 1 }, preK = () => SE ? SE.pre('rcK') : '\nuniform float rcK;\n';
  // ---------------- la tavolozza (BIBBIA_STILE.md §1): hex, valore Oklab ----------------
  const INK = {
    carta: '#F2E7CF', osso: '#D2C2A6', sasso: '#A89C92', lilla: '#A68FB6', piombo: '#7C7186', lavagna: '#3D3548', nero: '#16121B',
    pesca: '#F0BE8C', ocra: '#DC9A34', cotto: '#C25B36', mattone: '#6F2B2E', cielo: '#A3D4D8', acqua: '#2A8A8A', oltremare: '#2F60B5',
    notte: '#202D5E', salvia: '#93B27C', persiana: '#3F8A50', bosco: '#34532F', rosa: '#E04B8C', viola: '#6B3D9B'
  };
  // ---------------- Oklab (per le tinte calcolate in JS: arredi, ombrelloni, tende) ----------------
  const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4), gam = c => c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055;
  function hex2rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  function rgb2hex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join(''); }
  function oklab(hex) {
    const [R, G, B] = hex2rgb(hex).map(lin);
    const l = Math.cbrt(.4122214708 * R + .5363325363 * G + .0514459929 * B), m = Math.cbrt(.2119034982 * R + .6806995451 * G + .1073969566 * B), s = Math.cbrt(.0883024619 * R + .2817188376 * G + .6299787005 * B);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }
  function deOklab(L) {
    const l = Math.pow(L[0] + .3963377774 * L[1] + .2158037573 * L[2], 3), m = Math.pow(L[0] - .1055613458 * L[1] - .0638541728 * L[2], 3), s = Math.pow(L[0] - .0894841775 * L[1] - 1.291485548 * L[2], 3);
    return rgb2hex([4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s].map(gam));
  }
  const LAB = {}; for (const k in INK) LAB[k] = oklab(INK[k]);
  // rosa e viola sono gli accenti (graffiti, la sera): li prende solo chi è già rosa o viola, non il rosso delle tele e delle vernici
  const ACCENTI = { rosa: .35, viola: .3 };
  const COLORATI = ['pesca', 'ocra', 'cotto', 'mattone', 'cielo', 'acqua', 'oltremare', 'notte', 'salvia', 'persiana', 'bosco', 'rosa', 'viola', 'lilla'];
  // le coppie delle tele a righe (tende, ombrelloni, bancarelle): l'inchiostro pieno a mezzo valore e la carta; un gradino di valore di .3 e più
  const RIGHE = [['cotto', 'carta'], ['oltremare', 'carta'], ['persiana', 'carta'], ['ocra', 'carta'], ['rosa', 'carta'], ['acqua', 'carta']];
  function righe(hex) {   // la coppia per una tinta data (la più vicina per tinta, i grigi e i beige al cotto e all'acqua)
    const A = oklab(hex), cr = Math.hypot(A[1], A[2]); if (cr < .03) return RIGHE[A[0] > .7 ? 5 : 0];
    const h = Math.atan2(A[2], A[1]); let best = 1e9, out = RIGHE[0];
    for (const R of RIGHE) { const B = LAB[R[0]], d = Math.abs(Math.atan2(Math.sin(Math.atan2(B[2], B[1]) - h), Math.cos(Math.atan2(B[2], B[1]) - h))) + (ACCENTI[R[0]] || 0); if (d < best) { best = d; out = R; } }
    return out;
  }
  // tinta(hex, inchiostro, peso, [lo, hi]): la tinta e il croma vanno verso l'inchiostro (peso), il valore resta quello del colore di partenza,
  // dentro la fascia [lo, hi] del tipo di elemento (il gradino fra vicini). Senza inchiostro: il più vicino per tinta.
  function tinta(hex, ink, w, fascia) {
    if (!ON || typeof hex !== 'string' || hex[0] !== '#') return hex;
    const A = oklab(hex); let K = ink && LAB[ink];
    w = w === undefined ? .8 : w;
    if (!K) {
      const cr = Math.hypot(A[1], A[2]);
      if (cr < .035) { K = LAB.piombo; w *= .55; }   // i grigi veri verso il piombo, appena (come il passo: ×.7·k)
      else { const h = Math.atan2(A[2], A[1]); let best = 1e9;   // la tinta più vicina fra gli inchiostri colorati (l'angolo, non la distanza: il valore resta)
        for (const k of COLORATI) { const B = LAB[k], d = Math.abs(Math.atan2(Math.sin(Math.atan2(B[2], B[1]) - h), Math.cos(Math.atan2(B[2], B[1]) - h))) + .6 * Math.abs(A[0] - B[0]) + (ACCENTI[k] || 0); if (d < best) { best = d; K = B; } }
        w *= Math.min(1, cr / .06); }
    }
    let L = A[0];
    if (fascia) L = Math.max(fascia[0], Math.min(fascia[1], L));
    if (ink) return deOklab([L, A[1] + (K[1] - A[1]) * w, A[2] + (K[2] - A[2]) * w]);
    // senza inchiostro dato: la tinta ruota verso quella dell'inchiostro (peso w), il croma si muove appena (×.35 w): il colore resta suo
    const cr = Math.hypot(A[1], A[2]), ck = Math.hypot(K[1], K[2]), c2 = cr + (ck - cr) * w * .35;
    const a = A[1] + (K[1] - A[1]) * w, b = A[2] + (K[2] - A[2]) * w, cn = Math.hypot(a, b) || 1;
    return deOklab([L, a / cn * c2, b / cn * c2]);
  }
  // l'inchiostro pieno al suo valore (o a un valore dato)
  function ink(nome, L) { const K = LAB[nome]; return L === undefined ? INK[nome] : deOklab([L, K[1], K[2]]); }
  // le fasce di valore (Oklab L) per tipo di elemento: il gradino fra vicini (muro ↔ persiana ≥ .2, muro ↔ saracinesca ≥ .12, vetro il più scuro)
  const FASCE = { muro: [.74, .9], cornice: [.84, .95], persiana: [.44, .58], saracinesca: [.5, .62], vetro: [.26, .36], tetto: [.5, .64], tenda: [.5, .66], telo: [.82, .93], ferro: [.28, .4], legno: [.42, .58], pietra: [.64, .8] };

  // ---------------- GLSL comune ----------------
  const v3 = h => { const c = hex2rgb(h); return `vec3(${c.map(v => v.toFixed(4)).join(', ')})`; };
  // rcPorta(c, ink, w): la tinta di c verso l'inchiostro tenendo la luminanza (spazio della scena, come le tele); rcLum
  const GL = `
float rcLum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
vec3 rcPorta(vec3 c, vec3 k, float w) { float l = rcLum(c); return mix(c, k * (l / max(rcLum(k), .02)), w); }
float rcH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

  // ---------------- le parti dell'atlante (FA e CA): campitura calma, struttura a due toni, spigoli disegnati ----------------
  // C: celle per lato (u, v); P: texel per cella; il bordo della faccia sta a 1/P e (P-1)/P (fUV, caUV); slat/legno/carta riconosciuti
  // leggendo due texel fissi della cella (le righe del disegno di fCell), il vetro dalla riga 0 scura.
  // la riga r della cella nella tela (dall'alto, come fCell la disegna) → la v nella cella (dal basso)
  function glAtlante(Cu, Cv, P) {
    const f = v => v.toFixed(5), riga = r => f(P - r - .5);
    return `
#ifdef USE_MAP
{ vec2 rcG = vUv * vec2(${f(Cu)}, ${f(Cv)}), rcCe = floor(rcG), rcQ = fract(rcG);
  vec2 rcT = vec2(1. / ${f(Cu * P)}, 1. / ${f(Cv * P)});
  vec2 rcO = rcCe / vec2(${f(Cu)}, ${f(Cv)});
  vec3 rcTx = texture2D(map, vUv).rgb, rcK = diffuseColor.rgb / max(rcTx, vec3(.02));
  vec3 rcA = .5 * (texture2D(map, rcO + rcT * vec2(${f(P * .3)}, ${f(P * .5)})).rgb + texture2D(map, rcO + rcT * vec2(${f(P * .7)}, ${f(P * .45)})).rgb);
  float rcLa = max(rcLum(rcA), .02);
  float rcR0 = rcLum(texture2D(map, rcO + rcT * vec2(${f(P * .5)}, ${riga(0)})).rgb) / rcLa;
  float rcR2 = rcLum(texture2D(map, rcO + rcT * vec2(${f(P * .5)}, ${riga(2)})).rgb) / rcLa;
  float rcR4 = rcLum(texture2D(map, rcO + rcT * vec2(${f(P * .5)}, ${riga(4)})).rgb) / rcLa;
  float rcR7 = rcLum(texture2D(map, rcO + rcT * vec2(${f(P * .5)}, ${riga(P === 32 ? 7 : 3)})).rgb) / rcLa;
  float rcLam = step(1.5, rcR2 / max(rcR4, .02));
  float rcStr = max(rcLam, step(rcR7, ${P === 32 ? '.66' : '.8'}) * step(.85, rcR4));
  float rcD = rcLum(rcTx) / rcLa;
  float rcDk = (1. - smoothstep(.72, .84, rcD)) * rcStr;
  vec3 rcC = rcA * (1. - .34 * rcDk);
  if (rcLam > .5) { float rcV = rcLum(rcA); vec3 rcI = rcA.g >= rcA.r * .96 ? ${v3(INK.persiana)} : rcA.b > rcA.r ? ${v3(INK.oltremare)} : ${v3(INK.mattone)};
    vec3 rcB0 = rcPorta(rcA, rcI, .6) * clamp(.5 / max(rcV, .05), .8, 1.35);
    float rcR = (1. - rcQ.y) * ${f(P)}, rcFr = max(fwidth(rcR), 1e-4), rcSl = fract((rcR - ${P === 32 ? '2.' : '1.'}) / ${P === 32 ? '4.' : '3.'});
    float rcSd = (abs(rcSl - ${P === 32 ? '.75' : '.1667'}) - ${P === 32 ? '.25' : '.1667'}) * ${P === 32 ? '4.' : '3.'} / rcFr;
    float rcIn = step(${P === 32 ? '2.' : '1.'}, rcR) * step(rcR, ${P === 32 ? '30.' : '14.'}) * step(${P === 32 ? '2.' : '1.'}, rcQ.x * ${f(P)}) * step(rcQ.x * ${f(P)}, ${P === 32 ? '30.' : '15.'});
    float rcPer = ${P === 32 ? '4.' : '3.'} / rcFr, rcLn = (1. - smoothstep(-.5, .5, rcSd)) * smoothstep(2.5, 4.5, rcPer) * rcIn;
    rcC = mix(rcB0 * (1. - .12 * rcIn * (1. - smoothstep(2.5, 4.5, rcPer))), rcB0 * .6, rcLn); }
${P === 32 ? `  if (rcR0 < .45) { float rcB = rcQ.x + rcQ.y, rcBw = fwidth(rcB) + 1e-4;
    rcC = rcPorta(rcA, ${v3(INK.notte)}, .45) * .82 + ${v3(INK.cielo)} * .3 * (smoothstep(.62 - rcBw, .62 + rcBw, rcB) - smoothstep(.86 - rcBw, .86 + rcBw, rcB)); }
` : ''}  vec3 rcNw = normalize(vRcN); float rcPiana = 1. - smoothstep(.02, .08, length(fwidth(rcNw)));
  vec2 rcFw = max(fwidth(rcQ), vec2(1e-5)), rcE = min(rcQ - 1. / ${f(P)}, ${f((P - 1) / P)} - rcQ) / rcFw;
  vec2 rcFace = ${f((P - 2) / P)} / rcFw;
  float rcEu = (1. - smoothstep(.55, 1.45, rcE.x)) * smoothstep(5., 9., rcFace.x), rcEv = (1. - smoothstep(.55, 1.45, rcE.y)) * smoothstep(5., 9., rcFace.y);
  float rcInk = max(rcEu, rcEv) * rcPiana;
  rcC = mix(rcC, rcC * vec3(.3, .27, .32), rcInk * .62);
  diffuseColor.rgb = rcK * rcC; }
#endif
`;
  }
  // l'intonaco dei moduli del kit (la cella del muro): la tinta della casa senza grana né macchie, verso un inchiostro di muro per casa;
  // le altre celle del kit (cornici, colonne, il coronamento, i metalli) verso i loro inchiostri, col gradino di valore
  const GL_INTONACO = `
#ifdef USE_MAP
{ vec3 rcTx = texture2D(map, vUv).rgb; float rcU = vUv.x * 16., rcCl = floor(rcU);
  if (vUv.y > .75) {
    if (rcCl == 5.) { vec3 rcW = rcTx; float t = vRcT;
      vec3 rcI = t < .3 ? ${v3(INK.osso)} : t < .55 ? ${v3(INK.pesca)} : t < .75 ? ${v3(INK.carta)} : t < .9 ? ${v3(INK.ocra)} : ${v3(INK.sasso)};
      float rcL0 = rcLum(rcW); rcW = rcPorta(rcW * (.97 + .06 * fract(t * 5.3)), rcI, .42 + .3 * smoothstep(.06, .2, length(rcW - vec3(rcL0))));
      diffuseColor.rgb = rcW * clamp(.86 / max(rcLum(rcW), .3), .92, 1.12); }
    else if (rcCl == 4. || rcCl == 9.) { diffuseColor.rgb = rcPorta(rcTx, ${v3(INK.osso)}, .35) * 1.04; }
    else if (rcCl == 7.) { diffuseColor.rgb = rcPorta(rcTx, ${v3(INK.cotto)}, .25); }
    else if (rcCl == 8.) { vec3 rcM = rcPorta(rcTx, ${v3(INK.lavagna)}, .5); diffuseColor.rgb = rcM * clamp(.36 / max(rcLum(rcM), .05), .55, 1.); }
  } }
#endif
`;

  // ---------------- l'aggancio: onBeforeCompile con getter e setter (solo con lo stile acceso) ----------------
  const ST = { intonaco: 0, fa: 0, ca: 0, falde: 0 };
  function genere(m) {
    if (!m || !m.isMeshStandardMaterial) return null;
    const u = m.userData || {};
    if (u.tassello) return null;   // [integra1] i materiali dei tasselli hanno già l'aggancio nel testo cotto
    if (u.rcGen) return u.rcGen;
    if (u.plaster) return 'intonaco';
    const im = m.map && m.map.image;
    if (im && typeof HTMLCanvasElement !== 'undefined' && im instanceof HTMLCanvasElement) {
      if (im.width === 1024 && im.height === 2048) return (u.rcGen = 'fa');
      if (im.width === 256 && im.height === 1024 && Math.abs(m.roughness - .92) < 1e-3) return (u.rcGen = 'ca');
    }
    return null;
  }
  function avvolgi(m, gen, f) {
    const fn = function (sh, r) {
      if (f) f.call(this, sh, r);
      if (!/#include <color_fragment>/.test(sh.fragmentShader)) return;
      const nor = gen !== 'intonaco';
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + (nor ? 'varying vec3 vRcN;' : 'varying float vRcT;'))
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (nor ? 'vRcN = normalize(mat3(modelMatrix) * objectNormal);' : (/fd1/.test(String(this.customProgramCacheKey && this.customProgramCacheKey.call(this))) ? 'vRcT = fract(sin(bId1 * 7.13 + 1.7) * 43758.5453);' : 'vRcT = .5;')));
      sh.uniforms.rcK = RCK;   // [integra1] la manopola: con A (costante 0) il ramo sparisce, con E è una uniform di modulo (anche nei tasselli)
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + (nor ? 'varying vec3 vRcN;' : 'varying float vRcT;') + preK() + GL)
        .replace('#include <color_fragment>', 'if (rcK > .5) {\n' + (gen === 'intonaco' ? GL_INTONACO : gen === 'fa' ? glAtlante(32, 64, 32) : glAtlante(16, 64, 16)) + '\n}\n#include <color_fragment>');
      if (SE) { sh.fragmentShader = SE.adatta(sh.fragmentShader); }
    };
    fn.toString = () => 'rc|' + gen + (SE ? SE.chiave() : '') + '|' + (f ? f.toString() : '');
    ST[gen]++; return fn;
  }
  function installa() {
    const P = THREE.Material.prototype; if (P.__rcAggancio) return; P.__rcAggancio = true;
    const NOOP = P.onBeforeCompile;
    Object.defineProperty(P, 'onBeforeCompile', {
      configurable: true,
      get() { const g = this.__rcFatto ? null : genere(this); if (g) { this.__rcFatto = true; this.__rcObc = avvolgi(this, g, this.__rcObc || null); } return this.__rcObc || NOOP; },
      set(f) { if (!this.__rcFatto) { const g = genere(this); if (g) { this.__rcFatto = true; this.__rcObc = avvolgi(this, g, f); return; } } this.__rcObc = f; }
    });
  }
  if (ON && typeof THREE !== 'undefined' && THREE.Material) installa();
  if (typeof window !== 'undefined') window.__rifc = { capace: ON, get on() { return ON && (!SE || SE.on); }, stato: ST };
  return { get on() { return ON && (!SE || SE.on); }, capace: ON, k: RCK, INK, LAB, FASCE, RIGHE, righe, tinta, ink, oklab, deOklab, GL, v3, stato: ST };
})();
if (typeof module !== 'undefined') module.exports = RifCostruito;
