/* Porto Vecchio — [tasselli] LA CITTÀ A TASSELLI (pilota: ?tasselli=1).
   La città ferma (case fuse, tetti, strade, marciapiedi, arredi, segni, costa) non si costruisce più nel browser: strumenti/tassella.js
   la costruisce una volta nella build, la taglia in settori di 48 m (gli stessi di anelli/fusione1) e la scrive in tasselli/. Qui:
   - all'avvio (prima di R.init) si legge tasselli/indice.json; se l'impronta non è quella della pagina (PV_IMPRONTA_TASS, build.py)
     si costruisce come prima, tutto;
   - render.js salta le fasi della città (faseViva: restano cielo, isola coi blocchi del terreno, acqua) e chiama monta(): le uniform
     di modulo che la città usa (FD1, la tavolozza), le luci e le pozze di luce (dati), la sagoma di tutta l'isola (il lontano);
   - i tasselli si scaricano per distanza dal punto guardato (prima l'anello vicino, poi verso fuori, quello davanti alla camera
     prima), in un lavoratore (gzip, meshopt, la posizione rifatta a 32 bit) e salgono alla scheda video a fette (un tetto di vertici e
     di millisecondi per fotogramma, più largo finché manca l'anello vicino); i vettori della pagina si liberano dopo l'invio;
   - oltre l'anello lontano il tassello si butta (geometrie via, la sagoma torna);
   - la gente, i mezzi, il bottino, gli interni, il terreno a blocchi e il verde restano del gioco, come prima.
   Il gioco (camminare, quote, porte, tetti, missioni) legge i dati del mondo, non le mesh (PESO.md §7.5).
   window.__tasselli: lo stato (tasselli in scena, in volo, byte, vertici, quando è arrivato l'anello vicino). */
var Tasselli = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const STUDIO = typeof window !== 'undefined' && !!window.PV_STUDIO;
  const CHIESTO = !STUDIO && /[?&]tasselli=1\b/.test(Q) && typeof Worker !== 'undefined' && typeof DecompressionStream !== 'undefined';
  const IMP = typeof window !== 'undefined' ? window.PV_IMPRONTA_TASS : null;
  const BASE = 'tasselli/', V = '?v=' + (IMP || '0');
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
  };
  let IND = null, ON = false, CTX = null;
  const ST = { on: false, motivo: '', tasselli: 0, inScena: 0, inVolo: 0, inApertura: 0, buttati: 0, smontati: 0, byte: 0, byteVicino: 0, vertici: 0, mesh: 0, t0: 0, vicinoT: null, vicinoN: 0, decodMs: 0, scaricoMs: 0, creaMs: 0, picco: 0 };
  // l'indice, prima di R.init (main.js aspetta questa promessa con i kit)
  const pronto = !CHIESTO ? Promise.resolve(false) : fetch(BASE + 'indice.json' + V).then(r => r.ok ? r.json() : null).then(j => {
    if (!j) { ST.motivo = 'indice mancante'; return false; }
    if (j.versione !== 1 || !IMP || j.impronta !== IMP) { ST.motivo = 'impronta ' + j.impronta + ' ≠ ' + IMP; console.warn('[tasselli] i tasselli sono di un\'altra build: la città si costruisce come prima'); return false; }
    IND = j; ON = true; ST.on = true; ST.tasselli = j.tasselli.length; return true;
  }).catch(e => { ST.motivo = String(e); console.warn('[tasselli]', e); return false; });

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
  const url = f => new URL(BASE + f + V, location.href).href;

  // ---------------- valori, tessiture, materiali ----------------
  const TEX = new Map(), TEXP = new Map(), MAT = new Map(); let TEXI = null;
  const COL = ['color', 'emissive', 'specular', 'sheenColor', 'attenuationColor'];
  const TXP = ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'encoding', 'format', 'type', 'generateMipmaps', 'unpackAlignment', 'rotation', 'matrixAutoUpdate', 'internalFormat'];
  const MK = ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'envMap', 'specularMap', 'displacementMap'];
  const TA = { Float32Array, Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Uint8ClampedArray, Float64Array };
  function tessitura(i) {   // la tessitura subito (vuota), i pixel quando arrivano: tessituraPronta(i) è la promessa
    let t = TEX.get(i); if (t) return t;
    if (!TEXI) TEXI = new Map(IND.tessiture.map(q => [q.i, q]));   // le tessiture per numero (le uguali sono già unite: i buchi restano)
    const r = TEXI.get(i); if (!r) { console.warn('[tasselli] tessitura mancante', i); const v = new THREE.Texture(); TEX.set(i, v); TEXP.set(i, Promise.resolve()); return v; }
    if (r.k === 'array') t = new THREE.DataArrayTexture(null, 1, 1, 1);
    else if (r.k === 'data' && /\.bin$/.test(r.file || '')) t = new THREE.DataTexture(null, 1, 1);
    else t = new THREE.Texture();
    TXP.forEach(k => { if (r[k] !== undefined) t[k] = r[k]; });
    t.offset.fromArray(r.offset); t.repeat.fromArray(r.repeat); t.center.fromArray(r.center); if (r.matrix) t.matrix.fromArray(r.matrix);
    t.flipY = r.da === 'gpu' ? false : !!r.flipY; t.premultiplyAlpha = false; t.userData = Object.assign({}, r.ud, { tassello: true });
    TEX.set(i, t);
    const tel = TEL && r.tel, file = tel ? r.tel.file : r.file;
    let p;
    if (!file) p = Promise.resolve();
    else if (r.k === 'array' && /\.webp$/.test(file)) p = chiedi({ op: 'img', url: url('tex/' + file), griglia: r.griglia || [1, 1], w: tel ? r.tel.w : r.w, h: tel ? r.tel.h : r.h, d: r.d }).then(m => {
      t.image = { data: m.px, width: tel ? r.tel.w : r.w, height: tel ? r.tel.h : r.h, depth: r.d }; t.onUpdate = () => { t.image.data = null; }; t.needsUpdate = true; });
    else if (/\.bin$/.test(file)) p = chiedi({ op: 'bin', url: url('tex/' + file) }).then(m => {
      const T = TA[r.dati] || Uint8Array, a = new T(m.buf); t.image = { data: a, width: r.w, height: r.h, depth: r.d || 1 }; t.needsUpdate = true; });
    else p = immagine(url('tex/' + file), r.da !== 'gpu' && !!r.flipY).then(m => {
      t.image = m.bmp; t.onUpdate = () => { const b = t.image; if (b && b.close) { t.image = { width: b.width, height: b.height }; b.close(); } }; t.needsUpdate = true; });
    TEXP.set(i, p.catch(e => console.warn('[tasselli] tessitura', i, e)));
    return t;
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
  function materiale(i) {
    let m = MAT.get(i); if (m) return m;
    const r = IND.materiali[i], S = IND.stringhe;
    if (r.type === 'ShaderMaterial' || r.type === 'RawShaderMaterial') {
      const uni = {}; for (const k in r.uni) uni[k] = uniform(r.uni[k]);
      m = new THREE[r.type]({ vertexShader: S[r.vs], fragmentShader: S[r.fs], uniforms: uni, defines: r.defines || {} });
      if (r.extensions) Object.assign(m.extensions, r.extensions); if (r.lights !== undefined) m.lights = r.lights; if (r.fog !== undefined) m.fog = r.fog;
    } else m = new (THREE[r.type] || THREE.MeshStandardMaterial)();
    COL.forEach(k => { if (r[k] && m[k]) m[k].setRGB(r[k][0], r[k][1], r[k][2]); });
    for (const k in r) { if (COL.includes(k) || MK.includes(k) || ['type', 'name', 'ud', 'vs', 'fs', 'uni', 'defines', 'extensions', 'lights', 'fog', 'cvs', 'cfs', 'cuni', 'cdef', 'key', 'clip', 'normalScale', 'obcErr', 'glslVersion'].includes(k)) continue;
      if (typeof r[k] === 'number' || typeof r[k] === 'boolean') m[k] = r[k]; }
    if (r.fog !== undefined && !m.isShaderMaterial) m.fog = r.fog;
    if (r.normalScale && m.normalScale) m.normalScale.fromArray(r.normalScale);
    MK.forEach(k => { if (r[k] !== undefined && r[k] !== null) m[k] = tessitura(r[k]); });
    m.name = r.name || ''; m.userData = Object.assign({}, r.ud, { tassello: true });
    if (r.cvs !== undefined) {   // lo shader già trasformato nella build (onBeforeCompile del gioco): lo stesso testo, le stesse uniform
      const VS = S[r.cvs], FS = S[r.cfs], CU = {}; for (const k in r.cuni) CU[k] = uniform(r.cuni[k]); const key = 'tas|' + r.cvs + '|' + r.cfs + '|' + (r.key || '');
      m.onBeforeCompile = sh => { sh.vertexShader = VS; sh.fragmentShader = FS; Object.assign(sh.uniforms, CU); if (r.cdef) sh.defines = Object.assign(sh.defines || {}, r.cdef); };
      m.customProgramCacheKey = () => key;
    }
    // chi il gioco accende di notte (render.js frame): le finestre delle case fuse, i fondali
    if (r.notte === 'fd1' && CTX.R.FD1) CTX.R.FD1.emis.push(m);
    else if (r.notte === 'fondale' && CTX.R.dyn) (CTX.R.dyn.backdropMats = CTX.R.dyn.backdropMats || []).push(m);
    m.needsUpdate = true; MAT.set(i, m); return m;
  }
  const texPronte = ids => Promise.all([...ids].map(i => { tessitura(i); return TEXP.get(i); }));

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
    const S = STATO[ti]; S.st = 3; ST.inApertura++;
    try {
      const buf = S.zip.slice(0), m = await chiedi({ op: 'tassello', buf }, [buf]); ST.decodMs += m.ms[1];
      const ids = new Set(); m.testa.mesh.forEach(r => { (Array.isArray(r.m) ? r.m : [r.m]).concat(r.cdm !== null && r.cdm !== undefined ? [r.cdm] : []).forEach(i => texDelMateriale(IND.materiali[i]).forEach(q => ids.add(q))); });
      await texPronte(ids);
      if (S.st !== 3) return;   // uscito dalla vista nel frattempo
      S.dati = m; S.st = 4; S.k = 0; PRONTI.push(ti);
    } catch (e) { console.warn('[tasselli] apertura', IND.tasselli[ti].file, e); S.st = S.zip ? 2 : 0; S.errori = (S.errori || 0) + 1; }
    finally { ST.inApertura--; }
  }
  // monta un pezzo del tassello (mesh dopo mesh) dentro i tetti: torna true quando ha finito
  function monta1(ti, tetto, quota) {
    const S = STATO[ti], m = S.dati, T = m.testa, sc = CTX.scene;
    if (!S.attr) S.attr = new Map();
    const attr = i => { let a = S.attr.get(i); if (a) return a; const d = T.attr[i], v = m.vettori[i];
      a = d.idx ? new THREE.BufferAttribute(v, 1) : (d.nome === 'instanceMatrix' || d.nome === 'instanceColor') ? new THREE.InstancedBufferAttribute(v, d.s) : new THREE.BufferAttribute(v, d.s, d.norm);
      a.onUpload(libera); S.attr.set(i, a); return a; };
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
      const mat = Array.isArray(r.m) ? r.m.map(materiale) : materiale(r.m);
      let o;
      if (r.inst) { o = new THREE.InstancedMesh(g, mat, r.inst.n); o.instanceMatrix = attr(r.inst.m); if (r.inst.c !== null) o.instanceColor = attr(r.inst.c); }
      else o = new THREE.Mesh(g, mat);
      if (r.mx) { o.matrix.fromArray(r.mx); o.matrix.decompose(o.position, o.quaternion, o.scale); }
      o.matrixAutoUpdate = false; o.updateMatrixWorld(true);
      o.castShadow = r.cs; o.receiveShadow = r.rs; o.renderOrder = r.ro; o.layers.mask = r.ly; o.frustumCulled = r.fc; o.name = r.nm;
      if (r.cdm !== null && r.cdm !== undefined) o.customDepthMaterial = materiale(r.cdm);
      if (r.cdi !== null && r.cdi !== undefined) o.customDistanceMaterial = materiale(r.cdi);
      o.raycast = noRay; o.userData.tassello = ti; o.userData.thin2 = 1;
      sc.add(o); (S.mesh = S.mesh || []).push(o);
      const nv = g.attributes.position.count; vf += nv; ST.vertici += nv; ST.mesh++;
    }
    S.attr = null; S.dati = null; S.st = 5; ST.inScena++;
    ombre();
    if (typeof Anelli !== 'undefined' && Anelli.sfuma) Anelli.sfuma(k => sagomaK(ti, k), .7); else sagomaK(ti, 1);
    return true;
  }
  // [peso] le ombre in cache (peso_ombre.js) si ricuociono quando cambia chi fa ombra sul livello della camera: le sagome d'ombra delle
  // case fuse stanno sul livello 1 e non le vede. Un tassello che arriva o se ne va la fa ricuocere (spegnere e riaccendere: firma rifatta)
  function ombre() { if (typeof PesoOmbre !== 'undefined' && PesoOmbre.attivo) { PesoOmbre.attivo = false; PesoOmbre.attivo = true; } }
  // via dalla scheda video (resta il compresso, se c'è)
  function smonta(ti) {
    const S = STATO[ti]; if (S.st === 5) ST.inScena--;
    if (S.mesh) S.mesh.forEach(o => { CTX.scene.remove(o); o.geometry.dispose(); ST.vertici -= o.geometry.attributes.position.count; ST.mesh--; });
    S.mesh = null; S.dati = null; S.attr = null; S.st = S.zip ? 2 : 0; ST.smontati++; sagomaK(ti, 0);
    ombre();
    const i = PRONTI.indexOf(ti); if (i >= 0) PRONTI.splice(i, 1);
  }
  function butta(ti) { const S = STATO[ti]; if (S.st >= 3) smonta(ti); S.zip = null; S.st = 0; ST.buttati++; }
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
      if (v && typeof v === 'object' && 't' in v) { if (v.t !== null) u.value = tessitura(v.t); }
      else if (u.value === null || u.value === undefined || (u.value && u.value.isVector2 && k === 'PAL1.s')) u.value = valore(v); }
    if (IND.uni.__fd1W && R.FD1) R.FD1.W = IND.uni.__fd1W;
    if (R.ombre1) R.ombre1();   // le sagome d'ombra delle case fuse stanno sul livello 1: le camere delle ombre lo vedono (come fus1Gen)
    // le luci e le pozze di luce (le lampade dei lampioni, delle vetrine: la regia delle luci del gioco le accende di notte)
    IND.luci.forEach(L => R.LSRC.push({ x: L.x, y: L.y, z: L.z, color: new THREE.Color(L.c[0], L.c[1], L.c[2]), base: L.base, dist: L.dist, flick: L.flick, phase: L.phase, always: L.always || undefined, landmark: L.landmark || undefined }));
    IND.pozze.forEach(L => R.SPILLS.push({ x: L.x, z: L.z, y: L.y, gy: L.gy, nx: L.nx, nz: L.nz, color: new THREE.Color(L.c[0], L.c[1], L.c[2]), base: L.base, dist: L.dist, spill: true }));
    sagoma().catch(e => console.warn('[tasselli] sagoma', e));
    requestAnimationFrame(tick);
    log('montati:', IND.tasselli.length, 'tasselli,', IND.materiali.length, 'materiali,', IND.tessiture.length, 'tessiture');
  }
  const stato = () => Object.assign({}, ST, { byteMB: +(ST.byte / 1048576).toFixed(2), byteVicinoMB: +(ST.byteVicino / 1048576).toFixed(2), materiali: MAT.size, tessiture: TEX.size, pronti: PRONTI.length });
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
  return { _dbg: () => ({ attese: [...ATTESE.keys()].length, stati: STATO.reduce((a, s) => { a[s.st] = (a[s.st] || 0) + 1; return a; }, {}) }), attivo: () => ON, faseViva: n => VIVE.has(n), VIVE: [...VIVE], monta, pronto, CFG, stato, finisci };
})();
if (typeof window !== 'undefined') window.Tasselli = Tasselli;
