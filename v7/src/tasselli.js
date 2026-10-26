/* Porto Vecchio — [tasselli] LA CITTÀ A TASSELLI (il modo normale di partire; ?tasselli=0: la città costruita nel browser come prima).
   La città ferma (case fuse, tetti, strade, marciapiedi, arredi, segni, costa) non si costruisce più nel browser: strumenti/tassella.js
   la costruisce una volta nella build, la taglia in settori di 48 m (gli stessi di anelli/fusione1) e la scrive in tasselli/ (in git no:
   la cuoce il workflow .github/workflows/tasselli.yml, la scarica il build di Vercel; PESO.md §8). Qui:
   - all'avvio (prima di R.init) si legge tasselli/indice.json e tasselli/dati.json; se mancano, o l'impronta non è quella della pagina
     (PV_IMPRONTA_TASS, build.py), si costruisce come prima, tutto;
   - render.js salta le fasi della città (faseViva: restano cielo, isola coi blocchi del terreno, acqua) e chiama monta(): le uniform
     di modulo che la città usa (FD1, la tavolozza), le luci e le pozze di luce (dati), la sagoma di tutta l'isola (il lontano);
   - [tasselli2] il gioco che leggeva le mesh della città ha i suoi dati (dati.json): le case (dyn.buildings senza mesh: il taglio, il
     tetto che sbiadisce, la sagoma del personaggio; FD1 vivo), quello che le fasi scrivono sulle case del mondo (b.__win per le aperture
     dei graffiti, b.__top...), gli oggetti che si colpiscono (DZ.props: una maschera li nasconde nella mesh del tassello, tornano come
     corpi vivi), le cose che si muovono o cambiano (bucato, barche, faro, semafori, insegne che sfarfallano, acqua delle fontane:
     oggetti a parte, nelle liste del gioco che li anima come prima; gli aloni: strati istanziati con lo sfarfallio nello shader);
     i muri si colpiscono coi raggi (i graffiti): le mesh opache tengono le posizioni e una griglia per i raggi;
   - i programmi dei tasselli si compilano nel caricamento (una mesh fuori vista per programma, nella compilazione di main.js);
   - i tasselli si scaricano per distanza dal punto guardato (prima l'anello vicino, poi verso fuori, quello davanti alla camera
     prima), in un lavoratore (gzip, meshopt, la posizione rifatta a 32 bit) e salgono alla scheda video a fette (un tetto di vertici e
     di millisecondi per fotogramma, più largo finché manca l'anello vicino); i vettori della pagina si liberano dopo l'invio;
   - oltre l'anello lontano il tassello si butta (geometrie via, la sagoma torna); [tasselli3] quando esce dalla vista lascia davvero la
     scheda video: geometrie e matrici delle istanze (dispose), e i materiali e le tessiture contati per tassello, liberati quando l'ultimo
     tassello che li usa se ne va (si riscaricano se torna): la memoria resta piatta dopo tanti giri (misura_tasselli.js --giri);
   - la gente, i mezzi, il bottino, gli interni, il terreno a blocchi e il verde restano del gioco, come prima.
   window.__tasselli: lo stato (tasselli in scena, in volo, byte, vertici, quando è arrivato l'anello vicino). */
var Tasselli = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const STUDIO = typeof window !== 'undefined' && !!window.PV_STUDIO;
  // di difetto sì: no nello Studio, con ?tasselli=0, nel laboratorio degli scorci (?scorcio=: la città tagliata attorno a un punto)
  const CHIESTO = !STUDIO && !/[?&]tasselli=0\b/.test(Q) && !/[?&]scorcio=/.test(Q) && typeof Worker !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof fetch !== 'undefined';
  const IMP = typeof window !== 'undefined' ? window.PV_IMPRONTA_TASS : null;
  const BASE = (typeof window !== 'undefined' && window.PV_TASSELLI_BASE) || 'tasselli/', V = '?v=' + (IMP || '0');
  const TEL = typeof Anelli !== 'undefined' ? Anelli.TEL : false;
  const LOG = /[?&]tassellilog\b/.test(Q);
  const log = (...a) => { if (LOG) console.log('[tasselli]', ...a); };
  // le fasi di R.init che restano al gioco: il cielo, l'isola (la base e i blocchi del terreno), l'acqua
  // e quelle che non sono città: scena (i dati dei segni e della rete), particles, fx, debris (pioggia, colpi, macerie), post (il passaggio finale)
  const VIVE = new Set(['sky', 'island', 'water', 'scena', 'particles', 'fx', 'debris', 'post']);
  // l'anello vicino è quello che la camera vede: l'impronta a terra del suo campo (fino alla nebbia, oltre c'è solo il colore della nebbia)
  // più un margine; poi si scarica fino a «carica» dal punto guardato, si butta oltre «butta». ?tasselliraggio=k scala i raggi (le prove)
  const KR = +((Q.match(/[?&]tasselliraggio=([\d.]+)/) || [])[1] || 1);
  const CFG = {
    margine: TEL ? 24 : 40,        // attorno all'impronta della camera: l'anello vicino (copre il riquadro dell'ombra del sole)
    carica: (TEL ? 130 : 220) * KR, // fin dove si scarica, dal punto guardato (più lo sguardo davanti)
    butta: (TEL ? 200 : 320) * KR,  // oltre questo il tassello si butta
    volo: TEL ? 3 : 5,             // quanti tasselli in volo (scarico + decodifica) insieme
    vertici: TEL ? 90000 : 250000, // quanti vertici nuovi per fotogramma alla scheda video
    ms: TEL ? 4 : 6,               // il tetto di tempo per fotogramma per creare le mesh
    sguardo: 60,
    raggi: !/[?&]tasselliraggi=0\b/.test(Q),   // [tasselli2] le mesh opache tengono le posizioni per i raggi (graffiti, spruzzi)
  };
  let IND = null, DATI = null, VIVB = null, ON = false, CTX = null;
  const ST = { on: false, motivo: CHIESTO ? '' : 'spento', tasselli: 0, inScena: 0, inVolo: 0, inApertura: 0, buttati: 0, smontati: 0, byte: 0, byteVicino: 0, vertici: 0, mesh: 0, t0: 0, vicinoT: null, vicinoN: 0, decodMs: 0, scaricoMs: 0, creaMs: 0, picco: 0,
    case: 0, oggetti: 0, vivi: 0, aloni: 0, programmi: 0, raggiV: 0, texLiberate: 0, matLiberati: 0 };
  const url = f => new URL(BASE + f + V, location.href).href;
  // l'indice e i dati, prima di R.init (main.js aspetta questa promessa con i kit). Qualunque cosa vada storta: la città come prima
  const pronto = !CHIESTO ? Promise.resolve(false) : fetch(url('indice.json')).then(r => r.ok ? r.json() : null).then(async j => {
    if (!j) { ST.motivo = 'indice mancante'; return false; }
    if (j.versione !== 1 || !IMP || j.impronta !== IMP) { ST.motivo = 'impronta ' + j.impronta + ' ≠ ' + IMP; console.warn('[tasselli] i tasselli sono di un\'altra build: la città si costruisce come prima'); return false; }
    if (!j.dati) { ST.motivo = 'senza dati del gioco'; console.warn('[tasselli] tasselli senza i dati del gioco (cottura vecchia): la città si costruisce come prima'); return false; }
    const d = await fetch(url(j.dati.file)).then(r => r.ok ? r.json() : null);
    if (!d || d.impronta !== IMP) { ST.motivo = 'dati mancanti'; console.warn('[tasselli] dati.json mancante o di un\'altra build: la città si costruisce come prima'); return false; }
    IND = j; DATI = d;
    if (d.viviBin) VIVB = chiedi({ op: 'tassello', url: url(d.viviBin.file) });   // le geometrie dei vivi: servono in monta()
    if (VIVB) await VIVB.then(m => { VIVB = m; });
    try { bmut(); } catch (e) { }   // prima di R.init: chi legge b.__* durante il caricamento lo trova (e di nuovo in monta)
    ON = true; ST.on = true; ST.tasselli = j.tasselli.length; return true;
  }).catch(e => { ST.motivo = String(e); console.warn('[tasselli]', e); IND = DATI = null; ON = false; ST.on = false; return false; });

  // ---------------- il lavoratore ----------------
  // più lavoratori (2 sul telefono, 3 sul computer): ogni richiesta va a quello con meno lavori in coda
  let LAV = null, NID = 0; const ATTESE = new Map();
  function lavoratori() {
    if (LAV) return LAV;
    const el = document.getElementById('tasselli-lavoratore'), src = el ? el.textContent : '', u = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const n = Math.max(1, Math.min(TEL ? 2 : 3, (navigator.hardwareConcurrency || 2) - 1));
    LAV = []; for (let i = 0; i < n; i++) { const w = new Worker(u); w.coda = 0;
      w.onmessage = e => { const m = e.data, p = ATTESE.get(m.id); w.coda--; if (!p) return; ATTESE.delete(m.id); if (m.err) p[1](new Error(m.err)); else p[0](m); };
      w.onerror = e => console.warn('[tasselli] lavoratore:', e.message || e); LAV.push(w); }
    return LAV;
  }
  const chiedi = (msg, tr) => new Promise((ok, ko) => { const id = ++NID; ATTESE.set(id, [ok, ko]); const w = lavoratori().reduce((a, b) => b.coda < a.coda ? b : a); w.coda++; w.postMessage(Object.assign({ id }, msg), tr || []); });
  // le immagini 2D si aprono qui (createImageBitmap decodifica fuori dal filo della pagina): i lavoratori restano ai tasselli
  const immagine = (u, capovolgi) => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.blob(); })
    .then(bl => createImageBitmap(bl, { premultiplyAlpha: 'none', colorSpaceConversion: 'none', imageOrientation: capovolgi ? 'flipY' : 'from-image' })).then(bmp => ({ bmp }));

  // ---------------- valori, tessiture, materiali ----------------
  const TEX = new Map(), TEXP = new Map(), MAT = new Map(); let TEXI = null;
  const COL = ['color', 'emissive', 'specular', 'sheenColor', 'attenuationColor'];
  const TXP = ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'encoding', 'format', 'type', 'generateMipmaps', 'unpackAlignment', 'rotation', 'matrixAutoUpdate', 'internalFormat'];
  const MK = ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'envMap', 'specularMap', 'displacementMap'];
  const TA = { Float32Array, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Uint8ClampedArray, Float64Array };
  // [tasselli2] la tessitura subito (vuota: il programma la conosce già), i pixel solo quando un tassello che la usa si apre (carica(i)):
  // la compilazione del caricamento crea tutti i materiali senza scaricare tutte le tessiture
  const texRec = i => { if (!TEXI) TEXI = new Map(IND.tessiture.map(q => [q.i, q])); return TEXI.get(i); };   // le tessiture per numero (le uguali sono già unite: i buchi restano)
  function tessitura(i) {
    let t = TEX.get(i); if (t) return t;
    const r = texRec(i); if (!r) { console.warn('[tasselli] tessitura mancante', i); const v = new THREE.Texture(); TEX.set(i, v); TEXP.set(i, Promise.resolve()); return v; }
    if (r.k === 'array') t = new THREE.DataArrayTexture(null, 1, 1, 1);
    else if (r.k === 'data' && /\.bin$/.test(r.file || '')) t = new THREE.DataTexture(null, 1, 1);
    else t = new THREE.Texture();
    TXP.forEach(k => { if (r[k] !== undefined) t[k] = r[k]; });
    t.offset.fromArray(r.offset); t.repeat.fromArray(r.repeat); t.center.fromArray(r.center); if (r.matrix) t.matrix.fromArray(r.matrix);
    t.flipY = r.da === 'gpu' ? false : !!r.flipY; t.premultiplyAlpha = false; t.userData = Object.assign({}, r.ud, { tassello: true });
    TEX.set(i, t); return t;
  }
  // [tasselli3] TEXG: il giro di ogni tessitura (si scarica di nuovo dopo essere stata liberata: i pixel di un giro vecchio si buttano)
  const TEXG = new Map();
  function carica(i) {
    let p = TEXP.get(i); if (p) return p;
    const t = tessitura(i), r = texRec(i); if (!r) return Promise.resolve();
    const tel = TEL && r.tel, file = tel ? r.tel.file : r.file, g = (TEXG.get(i) || 0) + 1; TEXG.set(i, g);
    const vivo = x => { if (TEXG.get(i) === g && TEXP.has(i)) return true; if (x && x.close) x.close(); return false; };   // liberata nel frattempo
    if (!file) p = Promise.resolve();
    else if (r.k === 'array' && /\.webp$/.test(file)) p = chiedi({ op: 'img', url: url('tex/' + file), griglia: r.griglia || [1, 1], w: tel ? r.tel.w : r.w, h: tel ? r.tel.h : r.h, d: r.d }).then(m => { if (!vivo()) return;
      t.image = { data: m.px, width: tel ? r.tel.w : r.w, height: tel ? r.tel.h : r.h, depth: r.d }; t.onUpdate = () => { t.image.data = null; }; t.needsUpdate = true; });
    else if (/\.bin$/.test(file)) p = chiedi({ op: 'bin', url: url('tex/' + file) }).then(m => { if (!vivo()) return;
      const T = TA[r.dati] || Uint8Array, a = new T(m.buf); t.image = { data: a, width: r.w, height: r.h, depth: r.d || 1 }; t.needsUpdate = true; });
    else p = immagine(url('tex/' + file), r.da !== 'gpu' && !!r.flipY).then(m => { if (!vivo(m.bmp)) return;
      t.image = m.bmp; t.onUpdate = () => { const b = t.image; if (b && b.close) { t.image = { width: b.width, height: b.height }; b.close(); } }; t.needsUpdate = true; });
    p = p.catch(e => console.warn('[tasselli] tessitura', i, e)); TEXP.set(i, p); return p;
  }
  // [tasselli3] LO SCARICO VERO: le tessiture e i materiali si contano per tassello (in scena o in apertura); quando l'ultimo tassello che
  // li usa se ne va, via dalla scheda video (dispose) e dalla pagina (i pixel), e si riscaricano se tornano. FISSE: quelle che non sono dei
  // tasselli (le uniform di modulo come FD1 e la tavolozza, gli aloni, l'acqua delle fontane): restano sempre.
  const TEXU = new Map(), FISSE = new Set(), MATU = new Map();
  const fissa = i => { FISSE.add(i); return carica(i); };
  function texPrendi(ids) { ids.forEach(i => TEXU.set(i, (TEXU.get(i) || 0) + 1)); }
  function texLascia(ids) {
    ids.forEach(i => { const n = (TEXU.get(i) || 0) - 1; if (n > 0) { TEXU.set(i, n); return; } TEXU.delete(i);
      if (FISSE.has(i) || !TEXP.has(i)) return; const t = TEX.get(i); TEXP.delete(i); ST.texLiberate++;
      if (t) { t.dispose(); const b = t.image; if (b && b.close) b.close(); if (b && (b.data || b.close)) t.image = { width: b.width, height: b.height, depth: b.depth }; } });
  }
  function matPrendi(S, m) { if (!m || S.mats.has(m)) return; S.mats.add(m); MATU.set(m, (MATU.get(m) || 0) + 1); }
  function matLascia(S) {
    if (!S.mats) return; S.mats.forEach(m => { const n = (MATU.get(m) || 0) - 1; if (n > 0) { MATU.set(m, n); return; } MATU.delete(m); m.dispose(); ST.matLiberati++; }); S.mats = null;
  }
  function valore(v) {
    if (v === null || v === undefined || typeof v !== 'object') return v;
    if (v.c) return new THREE.Color(v.c[0], v.c[1], v.c[2]);
    if (v.v) return v.v.length === 2 ? new THREE.Vector2().fromArray(v.v) : v.v.length === 3 ? new THREE.Vector3().fromArray(v.v) : new THREE.Vector4().fromArray(v.v);
    if (v.m) return (v.n === 3 ? new THREE.Matrix3() : new THREE.Matrix4()).fromArray(v.m);
    if ('t' in v) return v.t === null ? null : tessitura(v.t);
    if (v.a) return v.a.map(valore);
    if (v.f) return new (TA[v.k] || Float32Array)(v.f);
    if (v.o) { const o = {}; for (const k in v.o) o[k] = valore(v.o[k]); return o; }
    return null;
  }
  const uniform = u => { if (!u) return { value: null }; if (u.live && CTX.R.uni[u.live]) return CTX.R.uni[u.live]; return { value: valore(u.val) }; };
  function texDi(v, out) { if (!v || typeof v !== 'object') return; if ('t' in v && v.t !== null) out.add(v.t); if (v.a) v.a.forEach(x => texDi(x, out)); if (v.o) for (const k in v.o) texDi(v.o[k], out); }
  function texDelMateriale(r) { const s = new Set(); MK.forEach(k => { if (r[k] !== undefined && r[k] !== null) s.add(r[k]); }); ['uni', 'cuni'].forEach(q => { if (r[q]) for (const k in r[q]) { const u = r[q][k]; if (u && !u.live) texDi(u.val, s); } }); return s; }
  // [tasselli2] la maschera degli oggetti colpibili: un texel per oggetto (255 = nascosto); il vertice col numero dell'oggetto (pid) esce
  // dal campo (davanti al piano vicino) quando l'oggetto è stato colpito e vive come corpo, o è andato in pezzi
  const PIDM = { W: 256, H: 1, data: null, tex: null, u: { value: null } };
  function pidMaschera(n) { PIDM.H = Math.max(1, Math.ceil((n + 1) / PIDM.W)); PIDM.data = new Uint8Array(PIDM.W * PIDM.H * 4); PIDM.tex = new THREE.DataTexture(PIDM.data, PIDM.W, PIDM.H); PIDM.tex.needsUpdate = true; PIDM.u.value = PIDM.tex; }
  const PIDVS = () => `\n{ float pidI = floor(pid + .5); if (pidI > .5) { vec4 pm = texture2D(uPidM, vec2((mod(pidI, ${PIDM.W}.) + .5) / ${PIDM.W}., (floor(pidI / ${PIDM.W}.) + .5) / ${PIDM.H}.)); if (pm.r > .5) gl_Position = vec4(0., 0., -2., 1.); } }`;
  function iniettaPid(sh) {
    sh.uniforms.uPidM = PIDM.u;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float pid; uniform sampler2D uPidM;');
    if (sh.vertexShader.indexOf('#include <project_vertex>') >= 0) sh.vertexShader = sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + PIDVS());
    else sh.vertexShader = sh.vertexShader.replace(/}\s*$/, PIDVS() + '\n}');
  }
  function materiale(i, pid) {
    const ck = pid ? 'p' + i : i; let m = MAT.get(ck); if (m) return m;
    const r = IND.materiali[i], S = IND.stringhe;
    if (r.type === 'ShaderMaterial' || r.type === 'RawShaderMaterial') {
      const uni = {}; for (const k in r.uni) uni[k] = uniform(r.uni[k]);
      m = new THREE[r.type]({ vertexShader: S[r.vs], fragmentShader: S[r.fs], uniforms: uni, defines: r.defines || {} });
      if (r.extensions) Object.assign(m.extensions, r.extensions); if (r.lights !== undefined) m.lights = r.lights; if (r.fog !== undefined) m.fog = r.fog;
    } else m = new (THREE[r.type] || THREE.MeshStandardMaterial)();
    COL.forEach(k => { if (r[k] && m[k]) m[k].setRGB(r[k][0], r[k][1], r[k][2]); });
    for (const k in r) { if (COL.includes(k) || MK.includes(k) || ['type', 'name', 'ud', 'vs', 'fs', 'uni', 'defines', 'extensions', 'lights', 'fog', 'cvs', 'cfs', 'cuni', 'cdef', 'key', 'clip', 'normalScale', 'obcErr', 'glslVersion', 'notte', 'vivo'].includes(k)) continue;
      if (typeof r[k] === 'number' || typeof r[k] === 'boolean') m[k] = r[k]; }
    if (r.fog !== undefined && !m.isShaderMaterial) m.fog = r.fog;
    if (r.normalScale && m.normalScale) m.normalScale.fromArray(r.normalScale);
    MK.forEach(k => { if (r[k] !== undefined && r[k] !== null) m[k] = tessitura(r[k]); });
    m.name = r.name || ''; m.userData = Object.assign({}, r.ud, { tassello: true });
    if (r.cvs !== undefined) {   // lo shader già trasformato nella build (onBeforeCompile del gioco): lo stesso testo, le stesse uniform
      const VS = S[r.cvs], FS = S[r.cfs], CU = {}; for (const k in r.cuni) CU[k] = uniform(r.cuni[k]); const key = 'tas|' + r.cvs + '|' + r.cfs + '|' + (r.key || '') + (pid ? '|pid' : '');
      m.onBeforeCompile = sh => { sh.vertexShader = VS; sh.fragmentShader = FS; Object.assign(sh.uniforms, CU); if (r.cdef) sh.defines = Object.assign(sh.defines || {}, r.cdef); if (pid) iniettaPid(sh); };
      m.customProgramCacheKey = () => key;
    } else if (pid) { m.onBeforeCompile = iniettaPid; m.customProgramCacheKey = () => 'tasPid'; }
    // chi il gioco accende di notte (render.js frame): le finestre delle case fuse, i fondali
    if (r.notte === 'fd1' && CTX.R.FD1) CTX.R.FD1.emis.push(m);
    else if (r.notte === 'fondale' && CTX.R.dyn) (CTX.R.dyn.backdropMats = CTX.R.dyn.backdropMats || []).push(m);
    m.needsUpdate = true; MAT.set(ck, m); return m;
  }
  // l'ombra di un oggetto colpibile nascosto: la profondità con la stessa maschera (il materiale di profondità di three, più il pid)
  function profonditaPid(base) {
    const ck = 'dp' + (base.map ? base.map.id : '') + '|' + (base.alphaTest || 0); let m = MAT.get(ck); if (m) return m;
    m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); if (base.map && base.alphaTest > 0) { m.map = base.map; m.alphaTest = base.alphaTest; } m.side = base.shadowSide !== null && base.shadowSide !== undefined ? base.shadowSide : base.side;
    m.onBeforeCompile = iniettaPid; m.customProgramCacheKey = () => 'tasPidD'; MAT.set(ck, m); return m;
  }
  const texPronte = ids => Promise.all([...ids].map(carica));

  // ---------------- la sagoma ----------------
  let SAG = null;   // { mesh, mask (DataTexture: 255 = il tassello c'è), data }
  async function sagoma() {
    if (!IND.sagoma) return;
    const m = await chiedi({ op: 'tassello', url: url(IND.sagoma.file) }), A = {}; m.testa.attr.forEach((a, i) => A[a.nome] = [m.vettori[i], a]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(A.position[0], 3)); g.setAttribute('normal', new THREE.BufferAttribute(A.normal[0], 3, A.normal[1].norm));
    g.setAttribute('color', new THREE.BufferAttribute(A.color[0], 3, A.color[1].norm)); g.setAttribute('tas', new THREE.BufferAttribute(A.tas[0], 1)); g.computeBoundingSphere();
    const W = Math.max(1, 1 << Math.ceil(Math.log2(IND.tasselli.length + 1))), data = new Uint8Array(W * 4), mask = new THREE.DataTexture(data, W, 1); mask.needsUpdate = true;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true }), U = { value: mask };
    mat.onBeforeCompile = sh => { sh.uniforms.uTas = U;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float tas; uniform sampler2D uTas; varying float vTas;').replace('#include <begin_vertex>', `#include <begin_vertex>\nvTas = tas > 65000. ? 0. : texture2D(uTas, vec2((tas + .5) / ${W}., .5)).r;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTas;\n' + (typeof Anelli !== 'undefined' ? Anelli.RETINO : 'float an1D() { return .5; }')).replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vTas > an1D()) discard;'); };
    mat.customProgramCacheKey = () => 'tasSagoma|' + W;
    const mesh = new THREE.Mesh(g, mat); mesh.name = 'tasselli_sagoma'; mesh.matrixAutoUpdate = false; mesh.userData.keep = true; mesh.userData.thin2 = 1; mesh.raycast = () => { };
    CTX.scene.add(mesh); SAG = { mesh, mask, data };
    [g.attributes.position, g.attributes.normal, g.attributes.color, g.attributes.tas].forEach(a => a.onUpload(libera));
  }
  // la sagoma sfuma via dal tassello arrivato (e torna dove il tassello si butta): lo stesso retino degli anelli
  function sagomaK(ti, k) { if (!SAG) return; SAG.data[ti * 4] = Math.round(255 * k); SAG.mask.needsUpdate = true; }

  // ---------------- [tasselli2] i raggi sulle mesh dei tasselli ----------------
  // Le mesh opache tengono le posizioni (e l'indice) dopo l'invio alla scheda video: i graffiti cercano il muro coi raggi (writing.js
  // rayWall, render.js bmbCands). Una mesh di tassello è grande (tutto un materiale di 48 m): la prima volta che un raggio la tocca si fa
  // una griglia in pianta (celle di 2 m) dei suoi triangoli, e il raggio prova solo quelli delle celle che attraversa.
  const RG = { cella: 2, ray: new THREE.Ray(), inv: new THREE.Matrix4(), sph: new THREE.Sphere(), box: new THREE.Box3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Vector3(), n: new THREE.Vector3(), t0: new THREE.Vector3(), t1: new THREE.Vector3(), timbro: 0 };
  function griglia(g) {
    const P = g.attributes.position.array, I = g.index ? g.index.array : null, nt = (I ? I.length : P.length / 3) / 3 | 0, c = RG.cella, bb = g.boundingBox || (g.computeBoundingBox(), g.boundingBox);
    const x0 = Math.floor(bb.min.x / c), z0 = Math.floor(bb.min.z / c), nx = Math.floor(bb.max.x / c) - x0 + 1, nz = Math.floor(bb.max.z / c) - z0 + 1;
    const cnt = new Uint32Array(nx * nz + 1), v = k => I ? I[k] : k;
    const span = (t, f) => { let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity; for (let q = 0; q < 3; q++) { const i = v(t * 3 + q) * 3, x = P[i], z = P[i + 2]; if (x < ax) ax = x; if (x > bx) bx = x; if (z < az) az = z; if (z > bz) bz = z; }
      const i0 = Math.max(0, Math.floor(ax / c) - x0), i1 = Math.min(nx - 1, Math.floor(bx / c) - x0), j0 = Math.max(0, Math.floor(az / c) - z0), j1 = Math.min(nz - 1, Math.floor(bz / c) - z0);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * nx + i); };
    for (let t = 0; t < nt; t++) span(t, k => { cnt[k + 1]++; });
    for (let k = 0; k < nx * nz; k++) cnt[k + 1] += cnt[k];
    const pos = cnt.slice(0, nx * nz), L = new Uint32Array(cnt[nx * nz]);
    for (let t = 0; t < nt; t++) span(t, k => { L[pos[k]++] = t; });
    ST.raggiV++;
    return { x0, z0, nx, nz, cnt, L, nt, timbri: new Uint32Array(nt), I, P };
  }
  function rayTas(rc, out) {
    const g = this.geometry, P = g.attributes.position; if (!P || !P.array || P.array.length < 9) return;
    const mats = this.material; if (!g.boundingSphere) g.computeBoundingSphere();
    RG.sph.copy(g.boundingSphere).applyMatrix4(this.matrixWorld); if (!rc.ray.intersectsSphere(RG.sph)) return;
    RG.inv.copy(this.matrixWorld).invert(); const ray = RG.ray.copy(rc.ray).applyMatrix4(RG.inv);
    const G = g.__griglia || (g.__griglia = griglia(g)), c = RG.cella, bb = g.boundingBox;   // (griglia() fa la scatola se manca)
    // il tratto del raggio dentro la scatola della mesh (e dentro near-far: le matrici dei tasselli non scalano, le distanze sono quelle del mondo)
    let ta = Math.max(rc.near, 0), tb = rc.far;
    for (const ax of ['x', 'y', 'z']) { const o = ray.origin[ax], d = ray.direction[ax], mn = bb.min[ax] - .01, mx = bb.max[ax] + .01;
      if (Math.abs(d) < 1e-12) { if (o < mn || o > mx) return; continue; }
      let a = (mn - o) / d, b = (mx - o) / d; if (a > b) { const q = a; a = b; b = q; } if (a > ta) ta = a; if (b < tb) tb = b; if (ta > tb) return; }
    const ox = ray.origin.x, oz = ray.origin.z, dx = ray.direction.x, dz = ray.direction.z;
    const xa = ox + dx * ta, xb = ox + dx * tb, za = oz + dz * ta, zb = oz + dz * tb;
    const i0 = Math.max(0, Math.floor(Math.min(xa, xb) / c) - G.x0), i1 = Math.min(G.nx - 1, Math.floor(Math.max(xa, xb) / c) - G.x0), j0 = Math.max(0, Math.floor(Math.min(za, zb) / c) - G.z0), j1 = Math.min(G.nz - 1, Math.floor(Math.max(za, zb) / c) - G.z0);
    const tim = ++RG.timbro, I = G.I, A = P.array, v = k => I ? I[k] : k, gr = g.groups;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      // la cella deve stare vicino alla retta (il riquadro del tratto è largo per un raggio in diagonale)
      const k = j * G.nx + i, cx = (G.x0 + i + .5) * c, cz = (G.z0 + j + .5) * c, l2 = dx * dx + dz * dz;
      if (l2 > 1e-9) { const s = ((cx - ox) * dx + (cz - oz) * dz) / l2, ex = ox + dx * s - cx, ez = oz + dz * s - cz; if (ex * ex + ez * ez > c * c * .5 + 1e-6) continue; }
      for (let q = G.cnt[k]; q < G.cnt[k + 1]; q++) {
        const t = G.L[q]; if (G.timbri[t] === tim) continue; G.timbri[t] = tim;
        const a = v(t * 3), b = v(t * 3 + 1), cc = v(t * 3 + 2);
        let mi = 0, mat = mats; if (Array.isArray(mats)) { for (const gg of gr) if (t * 3 >= gg.start && t * 3 < gg.start + gg.count) { mi = gg.materialIndex; break; } mat = mats[mi]; if (!mat) continue; }
        RG.a.fromArray(A, a * 3); RG.b.fromArray(A, b * 3); RG.c.fromArray(A, cc * 3);
        const hit = ray.intersectTriangle(RG.a, RG.b, RG.c, mat.side === THREE.FrontSide, RG.p); if (!hit) continue;
        const pw = RG.p.clone().applyMatrix4(this.matrixWorld), d = rc.ray.origin.distanceTo(pw); if (d < rc.near || d > rc.far) continue;
        const n = new THREE.Vector3(); THREE.Triangle.getNormal(RG.a, RG.b, RG.c, n);
        out.push({ distance: d, point: pw, object: this, face: { a, b, c: cc, normal: n, materialIndex: mi }, faceIndex: t });
      }
    }
  }

  // ---------------- i tasselli ----------------
  // Due anelli. Il tassello compresso (in gzip, ~100-300 KB) si scarica fino a «carica» dal punto guardato e resta nella pagina finché
  // non va oltre «butta»; si apre (lavoratore) e sale alla scheda video solo quando entra nell'impronta della camera (più il margine:
  // l'anello vicino), e lascia la scheda video quando ne esce del doppio del margine. Così la memoria della scheda video segue quello che
  // si vede, la rete quello che sta intorno.
  function libera() { this.array = new this.array.constructor(0); }   // [memoria] dopo l'invio alla scheda video la copia della pagina non serve
  const noRay = () => { };
  // per tassello: st 0 niente, 1 si scarica, 2 scaricato (zip), 3 si apre, 4 aperto (da montare), 5 in scena
  const STATO = [];
  const PRONTI = [], TIENI = new Set();   // TIENI: gli strumenti (finisci) li vogliono in scena
  function centro(t) { return [(t.i + .5) * IND.cella, (t.j + .5) * IND.cella]; }
  function dist(t, x, z) { const c = IND.cella, dx = Math.max(t.i * c - x, 0, x - (t.i + 1) * c), dz = Math.max(t.j * c - z, 0, z - (t.j + 1) * c); return Math.hypot(dx, dz); }
  async function scarica(ti) {
    const t = IND.tasselli[ti], S = STATO[ti]; S.st = 1; ST.inVolo++;
    try {
      const r = await fetch(url(t.file)); if (!r.ok) throw new Error(t.file + ' ' + r.status);
      const ab = await r.arrayBuffer(); ST.byte += ab.byteLength; if (S.vicino) ST.byteVicino += ab.byteLength;
      if (S.st !== 1) return; S.zip = ab; S.st = 2;
    } catch (e) { console.warn('[tasselli] tassello', t.file, e); S.st = 0; S.errori = (S.errori || 0) + 1; }
    finally { ST.inVolo--; }
  }
  async function apri(ti) {
    const S = STATO[ti], gen = S.gen = (S.gen || 0) + 1; S.st = 3; ST.inApertura++;
    try {
      const buf = S.zip.slice(0), m = await chiedi({ op: 'tassello', buf }, [buf]); ST.decodMs += m.ms[1];
      if (S.st !== 3 || S.gen !== gen) return;   // uscito dalla vista nel frattempo
      const ids = new Set(); m.testa.mesh.forEach(r => { (Array.isArray(r.m) ? r.m : [r.m]).concat(r.cdm !== null && r.cdm !== undefined ? [r.cdm] : []).concat(r.cdi !== null && r.cdi !== undefined ? [r.cdi] : []).forEach(i => texDelMateriale(IND.materiali[i]).forEach(q => ids.add(q))); });
      (VIVT.get(IND.tasselli[ti].k) || []).forEach(o => o.__tex.forEach(q => ids.add(q)));
      texPrendi(ids); S.tex = ids;   // [tasselli3] contate subito: nessuno le libera mentre arrivano
      await texPronte(ids);
      if (S.st !== 3 || S.gen !== gen) return;   // uscito dalla vista nel frattempo (smonta le ha già lasciate)
      S.dati = m; S.st = 4; S.k = 0; PRONTI.push(ti);
    } catch (e) { console.warn('[tasselli] apertura', IND.tasselli[ti].file, e); if (S.gen !== gen || S.st !== 3) return; if (S.tex) { texLascia(S.tex); S.tex = null; } S.st = S.zip ? 2 : 0; S.errori = (S.errori || 0) + 1; }
    finally { ST.inApertura--; }
  }
  const opaco = m => m && !m.transparent && !m.isSpriteMaterial && !m.isMeshDepthMaterial && !m.isMeshDistanceMaterial && m.visible !== false;
  // monta un pezzo del tassello (mesh dopo mesh) dentro i tetti: torna true quando ha finito
  function monta1(ti, tetto, quota) {
    const S = STATO[ti], m = S.dati, T = m.testa, sc = CTX.scene;
    if (!S.attr) {
      S.attr = new Map(); S.tieni = new Set();
      // [tasselli2] le posizioni (e gli indici) delle mesh che i raggi colpiscono restano nella pagina
      if (CFG.raggi) T.mesh.forEach(r => { if (r.inst || !(r.ly & 1)) return; const ms = (Array.isArray(r.m) ? r.m : [r.m]).map(i => IND.materiali[i]); if (!ms.some(q => q && !q.transparent && q.type !== 'MeshDepthMaterial' && q.type !== 'SpriteMaterial' && q.visible !== false)) return;
        S.tieni.add(r.g.at.position); if (r.g.ix !== null) S.tieni.add(r.g.ix); });
    }
    const attr = i => { let a = S.attr.get(i); if (a) return a; const d = T.attr[i], v = m.vettori[i];
      a = d.idx ? new THREE.BufferAttribute(v, 1) : (d.nome === 'instanceMatrix' || d.nome === 'instanceColor') ? new THREE.InstancedBufferAttribute(v, d.s) : new THREE.BufferAttribute(v, d.s, d.norm);
      if (!S.tieni.has(i)) a.onUpload(libera); S.attr.set(i, a); return a; };
    let vf = 0;
    while (S.k < T.mesh.length) {
      if (performance.now() > tetto || vf > quota) return false;
      const r = T.mesh[S.k++], g = new THREE.BufferGeometry();
      for (const k in r.g.at) g.setAttribute(k, attr(r.g.at[k]));
      if (r.g.ix !== null) g.setIndex(attr(r.g.ix));
      if (r.g.gr) r.g.gr.forEach(q => g.addGroup(q[0], q[1], q[2]));
      if (r.g.dr) g.setDrawRange(r.g.dr[0], r.g.dr[1]);
      if (r.bb) g.boundingBox = new THREE.Box3(new THREE.Vector3(r.bb[0], r.bb[1], r.bb[2]), new THREE.Vector3(r.bb[3], r.bb[4], r.bb[5]));
      if (r.bs) g.boundingSphere = new THREE.Sphere(new THREE.Vector3(r.bs[0], r.bs[1], r.bs[2]), r.bs[3]); else g.computeBoundingSphere();
      const pid = r.g.at.pid !== undefined, mat = Array.isArray(r.m) ? r.m.map(i => materiale(i, pid)) : materiale(r.m, pid);
      let o;
      if (r.inst) { o = new THREE.InstancedMesh(g, mat, r.inst.n); o.instanceMatrix = attr(r.inst.m); if (r.inst.c !== null) o.instanceColor = attr(r.inst.c); }
      else o = new THREE.Mesh(g, mat);
      if (r.mx) { o.matrix.fromArray(r.mx); o.matrix.decompose(o.position, o.quaternion, o.scale); }
      o.matrixAutoUpdate = false; o.updateMatrixWorld(true);
      o.castShadow = r.cs; o.receiveShadow = r.rs; o.renderOrder = r.ro; o.layers.mask = r.ly; o.frustumCulled = r.fc; o.name = r.nm;
      if (r.cdm !== null && r.cdm !== undefined) o.customDepthMaterial = materiale(r.cdm);
      else if (pid && r.cs && !Array.isArray(mat)) o.customDepthMaterial = profonditaPid(mat);
      if (r.cdi !== null && r.cdi !== undefined) o.customDistanceMaterial = materiale(r.cdi);
      o.raycast = !r.inst && S.tieni.has(r.g.at.position) && (Array.isArray(mat) ? mat.some(opaco) : opaco(mat)) ? rayTas : noRay;
      o.userData.tassello = ti; o.userData.thin2 = 1;
      if (!S.mats) S.mats = new Set();   // [tasselli3] i materiali del tassello, contati (matLascia in smonta)
      (Array.isArray(mat) ? mat : [mat]).forEach(q => matPrendi(S, q)); matPrendi(S, o.customDepthMaterial); matPrendi(S, o.customDistanceMaterial);
      sc.add(o); (S.mesh = S.mesh || []).push(o);
      const nv = g.attributes.position.count; vf += nv; ST.vertici += nv; ST.mesh++;
    }
    S.attr = null; S.dati = null; S.tieni = null; S.st = 5; ST.inScena++;
    viviDentro(IND.tasselli[ti].k, true);
    ombre();
    if (typeof Anelli !== 'undefined' && Anelli.sfuma) Anelli.sfuma(k => sagomaK(ti, k), .7); else sagomaK(ti, 1);
    return true;
  }
  // [peso] le ombre in cache (peso_ombre.js) si ricuociono quando cambia chi fa ombra sul livello della camera: le sagome d'ombra delle
  // case fuse stanno sul livello 1 e non le vede. Un tassello che arriva o se ne va la fa ricuocere (spegnere e riaccendere: firma rifatta)
  function ombre() { if (typeof PesoOmbre !== 'undefined' && PesoOmbre.attivo) { PesoOmbre.attivo = false; PesoOmbre.attivo = true; } }
  // via dalla scheda video (resta il compresso, se c'è)
  function smonta(ti) {
    const S = STATO[ti]; if (S.st === 5) { ST.inScena--; viviDentro(IND.tasselli[ti].k, false); }
    // [tasselli3] via davvero: le geometrie (e le matrici delle istanze: InstancedMesh.dispose), i materiali e le tessiture che nessun altro
    // tassello usa; le griglie dei raggi e i vettori tenuti per i raggi se ne vanno con le geometrie
    if (S.mesh) S.mesh.forEach(o => { CTX.scene.remove(o); o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); ST.vertici -= o.geometry.attributes.position.count; ST.mesh--; o.geometry.__griglia = null; });
    matLascia(S); if (S.tex) { texLascia(S.tex); S.tex = null; }
    S.mesh = null; S.dati = null; S.attr = null; S.tieni = null; S.st = S.zip ? 2 : 0; ST.smontati++; sagomaK(ti, 0);
    ombre();
    const i = PRONTI.indexOf(ti); if (i >= 0) PRONTI.splice(i, 1);
  }
  function butta(ti) { const S = STATO[ti]; if (S.st >= 3) smonta(ti); S.zip = null; S.st = 0; ST.buttati++; }

  // ---------------- [tasselli2] i dati del gioco ----------------
  // le case: i record di dyn.buildings senza mesh (B.tas: render.js casaVisibile e il tetto sbiadito sanno che la casa è nel tassello);
  // FD1 è la tessitura viva (il gioco la riscrive: il taglio); quello che le fasi della città scrivono sulle case del mondo
  function bmut() { const GB = (typeof Game !== 'undefined' && Game.BUILDINGS) || []; DATI.bmut.forEach((o, bi) => { const b = GB[bi]; if (!b) return; for (const k in o) if (b[k] === undefined) b[k] = o[k]; }); }
  function caseDati() {
    const R = CTX.R, dyn = R.dyn, GB = (typeof Game !== 'undefined' && Game.BUILDINGS) || [], DZ = R.DZ;
    bmut();
    const recs = DATI.case.map(c => {
      const b = c.bj ? Object.assign({}, c.bj) : GB[c.bi] || null;
      const rec = Object.assign({}, c, { b, mats: [], tas: true, box3: c.box3 ? new THREE.Box3(new THREE.Vector3(c.box3[0], c.box3[1], c.box3[2]), new THREE.Vector3(c.box3[3], c.box3[4], c.box3[5])) : null });
      delete rec.bj; delete rec.rb; delete rec.fd; delete rec.bi;
      if (c.rb && DZ && DZ.bRec) DZ.bRec[c.bi] = rec;
      return rec; });
    // le case che il gioco ha già (nessuna, di solito: le fasi della città non girano) restano davanti
    const n0 = dyn.buildings.length; recs.forEach(r => dyn.buildings.push(r));
    if (R.FD1) { if (!R.FD1.idx) R.FD1.idx = new Map(); DATI.case.forEach((c, i) => { if (c.fd >= 0) R.FD1.idx.set(recs[i], c.fd); }); }
    ST.case = recs.length; return n0;
  }
  // gli oggetti colpibili: DZ.props come quelli di regProp (render.js), col corpo di riserva (una scatola del loro colore) per quando
  // diventano vivi, la maschera al posto dei vertici spenti (TAGS.tas)
  const BOXG = new THREE.BoxGeometry(1, 1, 1), BOXM = new Map();
  function oggettiDati(luci, aloni) {
    const R = CTX.R, DZ = R.DZ, TAGS = R.TAGS; if (!DZ || !TAGS) return [];
    pidMaschera(DATI.props.length);
    const out = DATI.props.map((p, k) => {
      const c = new THREE.Vector3().fromArray(p.c), he = new THREE.Vector3().fromArray(p.he), tag = 'tas' + k;
      let obj = null; const corpo = () => { if (obj) return obj; obj = new THREE.Group(); const hex = p.pal[0][0]; let m = BOXM.get(hex); if (!m) BOXM.set(hex, m = new THREE.MeshStandardMaterial({ color: '#' + hex, roughness: .8 }));
        const ms = new THREE.Mesh(BOXG, m); ms.position.copy(c); ms.scale.set(Math.max(.04, he.x * 2), Math.max(.04, he.y * 2), Math.max(.04, he.z * 2)); obj.add(ms); obj.userData.pal = p.pal; obj.updateMatrixWorld(true); return obj; };
      const rec = { tag, get obj() { return corpo(); }, set obj(v) { obj = v; }, c, c0: c.clone(), he, mass: p.mass, cls: p.cls, state: 0, base: p.base, hitT: -9, fragile: p.fragile, tas: k };
      if (p.luce >= 0 && luci[p.luce]) { rec.light = luci[p.luce]; rec.lbase = p.lbase; }
      if (p.alone >= 0 && aloni[p.alone]) rec.glowS = aloni[p.alone];
      TAGS.set(tag, { parts: [], objs: [], tas: h => { PIDM.data[(k + 1) * 4] = h ? 255 : 0; PIDM.tex.needsUpdate = true; } });
      DZ.props.push(rec); if (R.hashPut) R.hashPut(rec, c.x, c.z);
      return rec; });
    (DATI.grandi || []).forEach(q => DZ.big.push({ c: new THREE.Vector3().fromArray(q.c), he: new THREE.Vector3().fromArray(q.he), base: q.base, tag: null }));
    ST.oggetti = out.length; return out;
  }
  // i vivi: gli oggetti (col loro sottoalbero) nelle liste del gioco subito; in scena quando il loro tassello è in scena
  const VIVT = new Map();   // chiave del tassello → [radici]
  function geoVivo(i) {
    const G = DATI.geo[i], A = VIVB.testa.attr, Vt = VIVB.vettori; if (G.__g) return G.__g;
    const g = new THREE.BufferGeometry(), at = j => { const d = A[j]; return d.idx ? new THREE.BufferAttribute(Vt[j], 1) : new THREE.BufferAttribute(Vt[j], d.s, d.norm); };
    for (const k in G.at) { const nm = k; g.setAttribute(nm, at(G.at[k])); } if (G.ix !== null) g.setIndex(at(G.ix));
    if (G.gr) G.gr.forEach(q => g.addGroup(q[0], q[1], q[2])); if (G.dr) g.setDrawRange(G.dr[0], G.dr[1]);
    if (G.bs) g.boundingSphere = new THREE.Sphere(new THREE.Vector3(G.bs[0], G.bs[1], G.bs[2]), G.bs[3]);
    return (G.__g = g);
  }
  function nodoVivo(n, tex) {
    let o; const mat = n.m === undefined ? null : Array.isArray(n.m) ? n.m.map(i => materiale(i)) : materiale(n.m);
    if (n.m !== undefined) (Array.isArray(n.m) ? n.m : [n.m]).forEach(i => texDelMateriale(IND.materiali[i]).forEach(q => tex.add(q)));
    if (n.t === 'Sprite') { o = new THREE.Sprite(mat); if (n.c) o.center.set(n.c[0], n.c[1]); }
    else if (n.t === 'Mesh' && n.g !== undefined && VIVB) o = new THREE.Mesh(geoVivo(n.g), mat);
    else o = new THREE.Group();
    o.matrix.fromArray(n.mx); o.matrix.decompose(o.position, o.quaternion, o.scale);
    o.layers.mask = n.ly; o.visible = n.vis; o.name = n.nm; o.renderOrder = n.ro || 0; o.frustumCulled = n.fc !== false; o.castShadow = !!n.cs; o.receiveShadow = !!n.rs;
    if (n.ud) Object.assign(o.userData, n.ud); o.userData.tassello = true;
    if (n.ch) n.ch.forEach(c => o.add(nodoVivo(c, tex)));
    return o;
  }
  function viviDati(oggetti) {
    const R = CTX.R, dyn = R.dyn, S1 = R.S1, roots = DATI.vivi.map(v => {
      const tex = new Set(), o = nodoVivo(v.n, tex); let top = o;
      if (v.pw) { top = new THREE.Group(); top.matrix.fromArray(v.pw); top.matrixAutoUpdate = false; top.add(o); }
      top.__tex = tex; top.userData.tassello = true; (VIVT.get(v.k) || VIVT.set(v.k, []).get(v.k)).push(top);
      const x = v.x || {};
      if (v.tipo === 'spin') dyn.spin.push({ o, speed: x.speed });
      else if (v.tipo === 'boats') dyn.boats.push({ g: o, ph: x.ph, y: x.y });
      else if (v.tipo === 'laundry') dyn.laundry.push({ m: o, ph: x.ph, ax: x.ax });
      return o; });
    if (S1) { DATI.heads.forEach(h => S1.heads.push({ lens: h.lens.map(i => roots[i]), gl: h.gl >= 0 ? roots[h.gl] : { material: { color: new THREE.Color(), opacity: 0 }, position: new THREE.Vector3() }, gy: h.gy, ofs: h.ofs, phase: h.phase, rec: h.prop >= 0 ? oggetti[h.prop] || null : null }));
      if (DATI.fwater.length) S1.fwater = (S1.fwater || []).concat(DATI.fwater.map(i => { fissa(i); return tessitura(i); })); }
    DATI.insegne.forEach(q => dyn.signs.push({ m: materiale(q.m), gl: q.gl >= 0 ? roots[q.gl] : null, flick: true }));
    ST.vivi = roots.length;
  }
  // (fuori scena: le loro geometrie lasciano la scheda video; i vettori restano nella pagina, piccoli, e risalgono se il tassello torna)
  function viviDentro(k, on) { (VIVT.get(k) || []).forEach(o => { if (on) { if (!o.parent) { CTX.scene.add(o); o.updateMatrixWorld(true); } } else if (o.parent) { o.parent.remove(o); o.traverse(q => { if (q.geometry && q.isMesh) q.geometry.dispose(); }); } }); }
  // gli aloni: per materiale (a meno del colore) uno strato istanziato di quadrati rivolti alla camera (lo sprite di three con le istanze),
  // il colore e lo sfarfallio per istanza nello shader: sfarfallio dyn.flicker (base · notte · (0,85 + 0,15 sin(9t + 7 base))), lampeggio
  // S1.blink (sin(5t + fase) > 0,2: 0,55 + 0,4 notte, se no 0,04). Di giorno lo strato che sfarfalla non si disegna (come il livello 0 di frame)
  const ALO = { strati: [], t: { value: 0 }, n: { value: 0 } };
  function aloniDati() {
    const per = new Map(), vis = [];
    DATI.aloni.forEach((a, i) => { const r = IND.materiali[a.m]; if (!r) return; const sig = JSON.stringify(Object.assign({}, r, { color: 0, opacity: 0 })) + '|' + a.tipo + '|' + a.ly; let L = per.get(sig); if (!L) per.set(sig, L = { m: a.m, tipo: a.tipo, ly: a.ly, voci: [] }); L.voci.push(i); });
    const quad = new THREE.PlaneGeometry(1, 1), m4 = new THREE.Matrix4(), out = [];
    per.forEach(L => {
      const base = materiale(L.m), mat = base.clone(); mat.color.setRGB(1, 1, 1); mat.opacity = 1; carica0(L.m);
      mat.onBeforeCompile = sh => { sh.uniforms.uAlT = ALO.t; sh.uniforms.uAlN = ALO.n;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 hc; attribute vec3 hp; uniform float uAlT; uniform float uAlN; varying vec4 vHc;')
          .replace('vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );', 'vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );')
          .replace('scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );', 'scale.x = length( vec3( instanceMatrix[ 0 ].x, instanceMatrix[ 0 ].y, instanceMatrix[ 0 ].z ) );')
          .replace('scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );', 'scale.y = length( vec3( instanceMatrix[ 1 ].x, instanceMatrix[ 1 ].y, instanceMatrix[ 1 ].z ) );')
          .replace('#include <uv_vertex>', '#include <uv_vertex>\n vHc.rgb = hc.rgb; vHc.a = hp.y < .5 ? hc.a * uAlN * (.85 + sin(uAlT * 9. + hc.a * 7.) * .15) : (sin(uAlT * 5. + hp.x) > .2 ? .55 + uAlN * .4 : .04); vHc.a *= hp.z;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vHc;').replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'if (vHc.a <= 0.) discard;\n vec4 diffuseColor = vec4( diffuse * vHc.rgb, opacity * vHc.a );'); };
      mat.customProgramCacheKey = () => 'tasAloni';
      const n = L.voci.length, o = new THREE.InstancedMesh(quad, mat, n), hc = new Float32Array(n * 4), hp = new Float32Array(n * 3);
      L.voci.forEach((i, j) => { const a = DATI.aloni[i], r = IND.materiali[a.m], c = r.color || [1, 1, 1];
        m4.makeScale(a.s[0], a.s[1], 1).setPosition(a.p[0], a.p[1], a.p[2]); o.setMatrixAt(j, m4);
        hc.set([c[0], c[1], c[2], a.base], j * 4); hp.set([a.ph, a.tipo, a.vis ? 1 : 0], j * 3);
        // l'alone di un lampione che si rompe (rec.glowS.visible = false)
        const hpA = () => o.geometry.attributes.hp;
        vis[i] = { get visible() { return hpA().array[j * 3 + 2] > .5; }, set visible(v) { hpA().array[j * 3 + 2] = v ? 1 : 0; hpA().needsUpdate = true; }, isObject3D: false }; });
      o.geometry = quad.clone(); o.geometry.setAttribute('hc', new THREE.InstancedBufferAttribute(hc, 4)); o.geometry.setAttribute('hp', new THREE.InstancedBufferAttribute(hp, 3));
      o.frustumCulled = false; o.layers.mask = L.ly; o.renderOrder = 2; o.castShadow = o.receiveShadow = false; o.name = 'tasselli_aloni'; o.raycast = noRay; o.matrixAutoUpdate = false; o.userData.keep = true; o.userData.tipo = L.tipo;
      CTX.scene.add(o); out.push(o); });
    ALO.strati = out; ST.aloni = DATI.aloni.length;
    return vis;
  }
  const carica0 = i => Promise.all([...texDelMateriale(IND.materiali[i])].map(fissa));
  function aloniTick() {
    if (!ALO.strati.length) return; const st = CTX.st, R = CTX.R;
    const night = R.nightLevel ? R.nightLevel(st.t) : 0; ALO.t.value = st.clock || 0; ALO.n.value = night;
    ALO.strati.forEach(o => { o.visible = o.userData.tipo === 1 || night > 0; });
  }
  // [tasselli2] i programmi dei tasselli nel caricamento: una mesh fuori vista (un triangolo a -500 m) per ogni programma che un tassello
  // chiederà (materiale, istanze, colore delle istanze, colore a 4, il pid), più i materiali dei vivi; main.js compila la scena subito
  // dopo R.init (anche loro, KHR_parallel_shader_compile) e al primo fotogramma del caricatore vanno via
  let COMP = null;
  function compila() {
    const g0 = new THREE.BufferGeometry(); g0.setAttribute('position', new THREE.Float32BufferAttribute([0, -500, 0, .01, -500, 0, 0, -500, .01], 3)); g0.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g0.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
    const g4 = g0.clone(); g4.setAttribute('color', new THREE.Float32BufferAttribute(new Array(12).fill(1), 4));
    const grp = new THREE.Group(); grp.name = 'tasselli_compila';
    (IND.programmi || []).forEach(([mi, inst, ic, c4, rs, pid]) => { if (!IND.materiali[mi]) return; const mat = materiale(mi, !!pid), g = c4 ? g4 : g0;
      let o; if (inst) { o = new THREE.InstancedMesh(g, mat, 1); o.setMatrixAt(0, new THREE.Matrix4()); if (ic) o.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3).fill(1), 3); } else o = new THREE.Mesh(g, mat);
      o.frustumCulled = false; o.castShadow = false; o.receiveShadow = !!rs; o.raycast = noRay; grp.add(o); });
    VIVT.forEach(L => L.forEach(top => top.traverse(o => { if (!o.material) return; const q = o.isSprite ? new THREE.Sprite(o.material) : o.isMesh ? new THREE.Mesh(g0, o.material) : null; if (!q) return; q.position.y = -500; q.frustumCulled = false; q.raycast = noRay; grp.add(q); })));
    CTX.scene.add(grp); COMP = grp; ST.programmi = grp.children.length;
  }

  // ---------------- a ogni fotogramma ----------------
  let lastX = null, lastZ = null, fx = 0, fz = 0;
  // l'impronta della camera a terra: i raggi degli angoli e del centro dello schermo fino al suolo (o fino alla nebbia, se guardano
  // sopra l'orizzonte), più la camera stessa; la scatola, allargata del margine
  const IMV = new THREE.Vector3(), IMF = { x0: 0, z0: 0, x1: 0, z1: 0 }, IMF2 = { x0: 0, z0: 0, x1: 0, z1: 0 };
  function impronta() {
    const cam = CTX.camera, P = cam.position, ff = CTX.scene.fog ? CTX.scene.fog.far : 300, gy = CTX.cam.h || 0;
    cam.updateMatrixWorld(); let x0 = P.x, x1 = P.x, z0 = P.z, z1 = P.z;
    for (const [nx, ny] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0], [0, 1], [0, -1], [-1, 0], [1, 0]]) {
      IMV.set(nx, ny, .5).unproject(cam).sub(P).normalize(); let t = IMV.y < -1e-3 ? (gy - P.y) / IMV.y : ff; t = Math.max(0, Math.min(t, ff));
      const px = P.x + IMV.x * t, pz = P.z + IMV.z * t; if (px < x0) x0 = px; if (px > x1) x1 = px; if (pz < z0) z0 = pz; if (pz > z1) z1 = pz; }
    const m = CFG.margine; IMF.x0 = x0 - m; IMF.x1 = x1 + m; IMF.z0 = z0 - m; IMF.z1 = z1 + m;
    IMF2.x0 = x0 - 2 * m - 8; IMF2.x1 = x1 + 2 * m + 8; IMF2.z0 = z0 - 2 * m - 8; IMF2.z1 = z1 + 2 * m + 8; return IMF;
  }
  const inImpronta = (t, F) => { const c = IND.cella; return (t.i + 1) * c > F.x0 && t.i * c < F.x1 && (t.j + 1) * c > F.z0 && t.j * c < F.z1; };
  function tick() {
    requestAnimationFrame(tick);
    if (!CTX) return;
    if (COMP) { CTX.scene.remove(COMP); COMP = null; }   // compilati (main.js, subito dopo R.init)
    try { aloniTick(); } catch (e) { }
    const t0 = performance.now(), c = CTX.cam, x = c.x, z = c.y;
    { const P = CTX.camera.position; if (Math.hypot(P.x - x, P.z - z) > 600) return; }   // la camera non è ancora andata al suo posto (il primo fotogramma)
    if (KR === 0) { if (ST.vicinoT === null) { ST.vicinoT = Math.round(performance.now()); (window.__tl = window.__tl || {}).tasselliVicino = ST.vicinoT; } return; }   // ?tasselliraggio=0: nessun tassello, solo la sagoma (la misura di tutto il resto)
    if (lastX !== null) { const dx = x - lastX, dz = z - lastZ, L = Math.hypot(dx, dz); if (L > .05 && L < 30) { fx += (dx / L - fx) * .1; fz += (dz / L - fz) * .1; } }
    lastX = x; lastZ = z;
    const vicinoFatto = ST.vicinoT !== null, F = impronta();
    // la vista: si apre quello che entra nell'impronta, si smonta quello che esce dall'impronta larga; la rete: per distanza (il bordo del
    // settore) meno un premio per quello davanti a dove si va, prima quello della vista
    const L = [];
    IND.tasselli.forEach((t, ti) => { const S = STATO[ti], d = dist(t, x, z), vede = inImpronta(t, F);
      if (S.st >= 3 && !inImpronta(t, IMF2) && !TIENI.has(ti)) smonta(ti);
      if (d > CFG.butta && !vede && S.st && !TIENI.has(ti)) { butta(ti); return; }
      if (vede && S.st === 2 && ST.inApertura < CFG.volo) apri(ti);
      if (S.st || (d > CFG.carica && !vede) || (S.errori || 0) > 3) return;
      const [cx, cz] = centro(t), ax = cx - x, az = cz - z, l = Math.hypot(ax, az) || 1, dot = (ax * fx + az * fz) / l;
      L.push([(vede ? -1e4 : 0) + d - CFG.sguardo * Math.max(0, dot), ti, vede]); });
    L.sort((a, b) => a[0] - b[0]);
    for (const [, ti, vede] of L) { if (ST.inVolo >= CFG.volo) break; STATO[ti].vicino = !vicinoFatto && vede; scarica(ti); }
    // montare: il più vicino prima, dentro i tetti (larghi finché manca l'anello vicino)
    if (PRONTI.length) {
      PRONTI.sort((a, b) => dist(IND.tasselli[a], x, z) - dist(IND.tasselli[b], x, z));
      const tetto = t0 + (vicinoFatto ? CFG.ms : 40), quota = vicinoFatto ? CFG.vertici : 4e6;
      while (PRONTI.length && performance.now() < tetto) { const ti = PRONTI[0]; if (monta1(ti, tetto, quota)) PRONTI.shift(); else break; }
    }
    if (!vicinoFatto) {   // l'anello vicino è arrivato quando tutti i tasselli dell'impronta sono in scena
      let tutti = true, n = 0; IND.tasselli.forEach((t, ti) => { if (inImpronta(t, F)) { n++; if (STATO[ti].st !== 5) tutti = false; } });
      if (tutti) { ST.vicinoT = Math.round(performance.now()); ST.vicinoN = n; (window.__tl = window.__tl || {}).tasselliVicino = ST.vicinoT; log('anello vicino in scena:', n, 'tasselli', (ST.byteVicino / 1048576).toFixed(2), 'MB', ST.vicinoT, 'ms'); }
    }
    const ms = performance.now() - t0; ST.creaMs += ms; if (ms > ST.picco) ST.picco = +ms.toFixed(1);
  }
  function monta(ctx) {
    CTX = ctx; ST.t0 = Math.round(performance.now());
    IND.tasselli.forEach(() => STATO.push({ st: 0 }));
    const R = ctx.R;
    // le uniform di modulo: i valori della build (FD1: le case, nessuna tagliata; la tavolozza)
    for (const k in IND.uni) { if (k.startsWith('__')) continue; const u = R.uni[k], v = IND.uni[k]; if (!u) continue;
      if (v && typeof v === 'object' && 't' in v) { if (v.t === null) continue; const t = tessitura(v.t); fissa(v.t);
        if (k === 'FD1.u' && R.FD1) { R.FD1.tex = t; TEXP.get(v.t).then(() => { if (t.image && t.image.data) { R.FD1.data = t.image.data; R.FD1.dirty = true; } }); }   // [tasselli2] FD1 vivo: il taglio lo riscrive
        u.value = t; }
      else if (u.value === null || u.value === undefined || (u.value && u.value.isVector2 && k === 'PAL1.s')) u.value = valore(v); }
    if (IND.uni.__fd1W && R.FD1) R.FD1.W = IND.uni.__fd1W;
    if (R.ombre1) R.ombre1();   // le sagome d'ombra delle case fuse stanno sul livello 1: le camere delle ombre lo vedono (come fus1Gen)
    // le luci e le pozze di luce (le lampade dei lampioni, delle vetrine: la regia delle luci del gioco le accende di notte)
    const luci = IND.luci.map(L => { const o = { x: L.x, y: L.y, z: L.z, color: new THREE.Color(L.c[0], L.c[1], L.c[2]), base: L.base, dist: L.dist, flick: L.flick, phase: L.phase, always: L.always || undefined, landmark: L.landmark || undefined }; R.LSRC.push(o); return o; });
    IND.pozze.forEach(L => R.SPILLS.push({ x: L.x, z: L.z, y: L.y, gy: L.gy, nx: L.nx, nz: L.nz, color: new THREE.Color(L.c[0], L.c[1], L.c[2]), base: L.base, dist: L.dist, spill: true }));
    // [tasselli2] i dati del gioco: case, aloni, oggetti colpibili, vivi; poi i programmi
    const passi = [['case', caseDati], ['aloni', () => { ALOV = aloniDati(); }], ['oggetti', () => { OGG = oggettiDati(luci, ALOV || []); }], ['vivi', () => viviDati(OGG || [])], ['compila', compila]];
    let ALOV = null, OGG = null;
    passi.forEach(([n, f]) => { try { f(); } catch (e) { console.warn('[tasselli] ' + n, e); } });
    sagoma().catch(e => console.warn('[tasselli] sagoma', e));
    requestAnimationFrame(tick);
    log('montati:', IND.tasselli.length, 'tasselli,', IND.materiali.length, 'materiali,', IND.tessiture.length, 'tessiture;', ST.case, 'case,', ST.oggetti, 'oggetti,', ST.vivi, 'vivi,', ST.aloni, 'aloni,', ST.programmi, 'programmi');
  }
  const stato = () => Object.assign({}, ST, { byteMB: +(ST.byte / 1048576).toFixed(2), byteVicinoMB: +(ST.byteVicino / 1048576).toFixed(2), materiali: MAT.size, tessiture: TEX.size, tessitureScaricate: TEXP.size, tessitureInUso: TEXU.size, materialiInUso: MATU.size, pronti: PRONTI.length });
  if (typeof window !== 'undefined') Object.defineProperty(window, '__tasselli', { configurable: true, get: stato });
  // per gli strumenti: tutto quello che c'è entro r metri, subito
  // (r: anche tutto quello entro r metri dal punto guardato, e lo si tiene in scena finché non si richiama finisci)
  async function finisci(r) {
    const x = CTX.cam.x, z = CTX.cam.y, F = impronta(), dentro = [];
    TIENI.clear(); IND.tasselli.forEach((t, ti) => { if (inImpronta(t, F) || (r && dist(t, x, z) <= r)) { dentro.push(ti); if (r) TIENI.add(ti); } });
    for (;;) {
      dentro.forEach(ti => { const S = STATO[ti]; if (!S.st) scarica(ti); else if (S.st === 2) apri(ti); });
      while (PRONTI.length) monta1(PRONTI.shift(), Infinity, Infinity);
      if (dentro.every(ti => STATO[ti].st === 5 || (STATO[ti].errori || 0) > 3)) break;
      await new Promise(ok => setTimeout(ok, 100));
    }
  }
  return { _dbg: () => ({ attese: [...ATTESE.keys()].length, stati: STATO.reduce((a, s) => { a[s.st] = (a[s.st] || 0) + 1; return a; }, {}) }), attivo: () => ON, chiesto: CHIESTO, faseViva: n => VIVE.has(n), VIVE: [...VIVE], monta, pronto, CFG, stato, finisci, PIDM };
})();
if (typeof window !== 'undefined') window.Tasselli = Tasselli;
