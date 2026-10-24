// [peso] IL BANCO DEL PESO: otto inquadrature fisse della città nuova (?cittanuova), sempre le stesse (seme 12345, stessa ora, stesso tempo),
// per misurare quanto costa disegnarle e per controllare che ogni alleggerimento non cambi l'immagine.
//   node strumenti/banco_peso.js <cartella> [--query=&nopesovetro] [--rif=<cartella di un giro precedente>] [--solo=borgo,notte]
//        [--nf=8] [--vw=480] [--vh=300] [--nothrottle] [--seme=12345] [--anelli=finisci|vivo]
// Per ogni inquadratura:
//   1. tempi: N fotogrammi veri (mediana dell'intervallo fra i fotogrammi, del tempo di R.frame e di G.step, i disegni e i triangoli della
//      scena con le sue ombre: render.js GPUT.info), poi gli stessi con il processore rallentato 4× (CDP Emulation.setCPUThrottlingRate);
//   2. la scena si ferma (G.step e R.frame a vuoto: niente si muove più) e si conta per categoria, nello stesso fotogramma: la scena si
//      disegna intera (ombra del sole e ombre dei faretti accesi ridisegnate) e poi con una categoria spenta; la differenza è il suo costo
//      (persone, mezzi, vetro, case, scorci, tetti vissuti, strade e terreno, luci e coni, il resto). Le ombre: la stessa scena senza
//      ridisegnare l'ombra del sole, poi senza quelle dei faretti;
//   3. le foto: il fotogramma vero (col post) a scena ferma, <nome>.png, e lo stesso senza chi si muove (persone, mezzi, particelle:
//      fra due caricamenti non sono gli stessi), <nome>_statica.png;
//   4. con --rif: lo scarto da quelle foto (media dello scarto assoluto 0-255, % di pixel oltre la soglia 8 su un canale, scarto massimo)
//      e l'immagine della differenza ×8, <nome>_diff.png.
// Esce banco.json (tutto) e banco.md (la tabella). Sotto SwiftShader i tempi valgono per i rapporti, non in assoluto; i disegni variano di
// ±150 fra due caricamenti (la gente, i mezzi, i blocchi): i costi per categoria si misurano spegnendo nello stesso fotogramma.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'reports', 'banco_peso');
const Q = '?cittanuova' + arg('query', ''), RIF = arg('rif', null), SOLO = arg('solo', null), NF = +arg('nf', 8), W = +arg('vw', 480), H = +arg('vh', 300), SEME = +arg('seme', 12345);
const SOGLIA = 8;
// le inquadrature (le otto di partenza, più adunata e suolo): x, y (metri), zoom, ora (minuti dalla mezzanotte), folla: il riempimento dei posti come in galleria.js
const SCATTI = [
  { nome: 'borgo', x: 1424, y: 322, zoom: .75, ora: 660 },
  { nome: 'marina', x: 1372, y: 388, zoom: .95, ora: 600 },
  { nome: 'vittoria', x: 1410, y: 343, zoom: .95, ora: 720 },
  { nome: 'recinto', x: 1520, y: 352, zoom: 1.2, ora: 900 },
  { nome: 'rocca', x: 1560, y: 344, zoom: 1.7, ora: 980 },
  { nome: 'citta', x: 1420, y: 340, zoom: 4, ora: 840 },
  { nome: 'notte', x: 1424, y: 322, zoom: .75, ora: 1320 },
  { nome: 'folla', x: 1278, y: 340, zoom: .85, ora: 600, folla: true },
  { nome: 'adunata', x: 1328, y: 343, zoom: .75, ora: 1050 },   // la piazza d'adunata col sole basso della sera: i dentini delle ombre lunghe
  { nome: 'suolo', x: 1424, y: 322, zoom: .5, ora: 660 },   // la piazza del borgo da vicino: quasi tutto lo schermo è pavimento (il costo per pixel del suolo)
  { nome: 'vicolo', x: 1420, y: 310, zoom: .75, ora: 660 },   // il Vico delle Monache (3 m): la camera in strada, le case tagliate cave
].filter(s => !SOLO || SOLO.split(',').includes(s.nome));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
fs.mkdirSync(OUT, { recursive: true });
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const pg = await b.newPage({ viewport: { width: W, height: H } }), errori = [];
  pg.on('pageerror', e => { errori.push(e.message); log('[errore]', e.message); });
  pg.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) log('[console]', m.text().slice(0, 300)); if (/\[peso\]/.test(m.text())) log('[pagina]', m.text().slice(0, 400)); });
  await pg.addInitScript(() => { window.__pulita = true;
    // i disegni a vuoto: fuori dalle foto la scheda video (SwiftShader, nel processore) non disegna niente, così il gioco gira alla velocità del
    // processore (un fotogramma vero qui dura 15 s) e i tempi misurano il lavoro di chi prepara i disegni, non la rasterizzazione finta
    window.__nodraw = true;
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
      for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (!f) continue; P[k] = function () { if (window.__nodraw) return; return f.apply(this, arguments); }; } } });
  // chi mette le cose in scena: le funzioni che hanno chiamato scene.add (per il conto del «resto»)
  await pg.addInitScript(() => { const tag = () => { if (!window.THREE) { setTimeout(tag, 5); return; } const a0 = THREE.Object3D.prototype.add; THREE.Object3D.prototype.add = function (...objs) { if (this.isScene) { const st = (new Error().stack || '').split('\n').slice(2, 6).map(l => (l.match(/at (?:new )?([\w$.]+) \(/) || [])[1]).filter(Boolean).join('<'); objs.forEach(o => { if (o && !o.__src) o.__src = st; }); } return a0.apply(this, objs); }; }; tag(); });
  await pg.addInitScript(seme => { let a = seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEME);   // come src/seme.js
  const cdp = await pg.context().newCDPSession(pg);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 1000 });
  const carico = Math.round((Date.now() - T0) / 1000); log('caricato', Q);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  // [anelli] le foto si confrontano con la città intera: i lavori del caricamento ad anelli si finiscono subito (--anelli=vivo: come capita)
  if (arg('anelli', 'finisci') === 'finisci') { const A = await pg.evaluate(() => { if (window.Anelli && Anelli.ON) { const t = performance.now(); Anelli.finisci(); return { ms: Math.round(performance.now() - t), stato: Anelli.stato() }; } return null; }); if (A) { log('anelli finiti', JSON.stringify(A)); await pg.waitForTimeout(1500); } }
  await pg.addStyleTag({ content: '#app > *:not(#cv) { visibility: hidden !important; } #bubbles, #hover, #moment, #xhair, #ring, #touch { display: none !important; }' });
  // la grafica non si adatta da sola durante il banco (qui i fotogrammi sono lenti: main.js scenderebbe di risoluzione e poi spegnerebbe le ombre)
  await pg.evaluate(() => { const R = window.__pv.R; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo) PesoSchermo.blocca(); });
  await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; pv.R.gpuTiming(true);
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50); });
  const OUTJ = { query: Q, seme: SEME, vw: W, vh: H, nf: NF, carico_s: carico, scatti: {}, errori };
  OUTJ.avvio = await pg.evaluate(() => ({ fusione: window.__fusione1 || null, luci: window.__luci || null, tempi: window.__rt || null, atlanti: window.__atlanti ? window.__atlanti() : null, vetro: window.PesoVetro ? PesoVetro.voci : null }));
  for (const s of SCATTI) {
    const ts = Date.now();
    const R0 = {};
    // 1) il posto, l'ora, il tempo, la camera (il giorno dopo quello di partenza: le pagine nuove partono dallo stesso orologio)
    await pg.evaluate(s => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.x = s.x; p.y = s.y; p.path = []; if (p.vx !== undefined) { p.vx = 0; p.vy = 0; }
      window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + s.ora; window.__meteo = 'sereno';
      ui.focus = { x: s.x, y: s.y }; ui.zoom = s.zoom; R.cam.x = R.cam.tx = s.x; R.cam.y = R.cam.ty = s.y; R.cam.zoom = R.cam.tz = s.zoom; R.cam.uy = 0; }, s);
    await pg.waitForTimeout(2500);
    if (s.folla) log(s.nome, 'riempiti', await pg.evaluate(() => { const st = window.__pv.st; if (typeof Popolo === 'undefined' || !Popolo.fillStep) return -1;
      const t0 = performance.now(); for (let k = 0; k < 30 && performance.now() - t0 < 4000; k++) { if (st.pop) st.pop.fillAt = 0; try { Popolo.fillStep(st, 0); } catch (e) { break; } }
      let n = 0; st.npcs.forEach(m => { const q = m.__posto; if (!q) return; n++; if (q.arrived || q.tetto) return; m.x = q.slot.x; m.y = q.slot.y; m.inside = false; m.path = []; m.speedNow = 0; m.face = q.slot.face; q.arrived = true; }); return n; }));
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 90000 && quiet < 2; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(4000);
    // il regime: le persone che il gioco fonderebbe in pochi secondi, fuse subito (qui un fotogramma dura mezzo secondo)
    R0.regime = await pg.evaluate(() => window.PesoGente && PesoGente.completa ? PesoGente.completa() : null);
    // 2) i tempi: N fotogrammi veri
    const campiona = n => pg.evaluate(n => new Promise(res => { const pv = window.__pv, R = pv.R, G = pv.G, f0 = R.frame, s0 = G.step, rd = R.__models.renderer, sm = rd.shadowMap, r0 = rd.render, sh0 = sm.render; let fr = 0, sp = 0, tot = 0, tt = 0, shc = 0, sht = 0, nmap = 0, cot = 0;
      R.frame = function () { const a = performance.now(); try { return f0.apply(this, arguments); } finally { fr += performance.now() - a; } };
      G.step = function () { const a = performance.now(); try { return s0.apply(this, arguments); } finally { sp += performance.now() - a; } };
      rd.render = function () { const r = r0.apply(this, arguments); tot += rd.info.render.calls; tt += rd.info.render.triangles; return r; };
      sm.render = function (lights) { if (sm.enabled && (sm.autoUpdate || sm.needsUpdate)) lights.forEach(l => { if (l.shadow && (l.shadow.autoUpdate || l.shadow.needsUpdate)) nmap++; });
        const c = rd.info.render.calls, t = rd.info.render.triangles, k0 = window.PesoOmbre ? PesoOmbre.conto().cotture : 0; const r = sh0.apply(this, arguments); shc += rd.info.render.calls - c; sht += rd.info.render.triangles - t; if (window.PesoOmbre) cot += PesoOmbre.conto().cotture - k0; return r; };
      const A = { cot: [], post: [], dt: [], fr: [], sp: [], main: [], mtri: [], tot: [], ttri: [], sh: [], shtri: [], nmap: [] }; let last = performance.now(), k = 0;
      const f = () => { const now = performance.now(); if (k > 0) { const i = R.gpuTimes.info || {}; A.cot.push(cot); A.post.push(tot - (i.calls || 0)); A.dt.push(now - last); A.fr.push(fr); A.sp.push(sp); A.main.push(i.calls || 0); A.mtri.push(i.tris || 0); A.tot.push(tot + shc); A.ttri.push(tt + sht); A.sh.push(shc); A.shtri.push(sht); A.nmap.push(nmap); }
        fr = 0; sp = 0; tot = 0; tt = 0; shc = 0; sht = 0; nmap = 0; cot = 0; last = now;
        if (++k <= n) requestAnimationFrame(f); else { R.frame = f0; G.step = s0; rd.render = r0; sm.render = sh0; const md = a => a.slice().sort((x, y) => x - y)[a.length >> 1], mean = a => a.reduce((x, y) => x + y, 0) / a.length;
          res({ intervallo_ms: +md(A.dt).toFixed(1), frame_ms: +md(A.fr).toFixed(1), logica_ms: +md(A.sp).toFixed(2), disegni: md(A.tot), principale: md(A.main), ombre: +mean(A.sh).toFixed(0), post: md(A.post),
            mappe_ombra: +mean(A.nmap).toFixed(2), cotture: A.cot.reduce((x, y) => x + y, 0), ombre_senza_cotture: (() => { const q = A.sh.filter((x, j) => !A.cot[j]); return q.length ? Math.round(mean(q)) : null; })(), triangoli_k: Math.round(md(A.ttri) / 1000), principale_tri_k: Math.round(md(A.mtri) / 1000), ombre_tri_k: Math.round(mean(A.shtri) / 1000) }); } };
      requestAnimationFrame(f); }), n);
    const R = Object.assign({ scatto: s }, R0);
    await pg.evaluate(() => { if (window.PesoOmbre) { PesoOmbre.azzera(); PesoOmbre.diag(true); } if (window.PesoLontano) PesoLontano.azzera(); });
    R.tempi = await campiona(NF);
    R.peso_ombre = await pg.evaluate(() => window.PesoOmbre ? Object.assign(PesoOmbre.conto(), PesoOmbre.diag(false)) : null);
    R.peso_gente = await pg.evaluate(() => window.PesoGente ? PesoGente.conto() : null);
    R.peso_lontano = await pg.evaluate(() => window.PesoLontano ? PesoLontano.conto() : null);
    if (!has('nothrottle')) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); R.tempi4x = await campiona(Math.max(4, NF >> 1)); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); }
    // 3) la scena ferma: niente logica, niente fotogrammi (il ciclo del gioco continua a vuoto); due fotogrammi a mano con dt = 0 per assestare
    await pg.evaluate(() => { const pv = window.__pv; window.__f0 = [pv.R.frame, pv.G.step]; pv.G.step = () => { }; });
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const pv = window.__pv; pv.R.frame = () => { }; });
    // le categorie e i conti (nello stesso fotogramma: si spegne una cosa alla volta e si ridisegna la scena)
    R.categorie = await pg.evaluate(() => { if (window.PesoOmbre) PesoOmbre.attivo = false;   // le ombre intere: quanto costerebbero ridisegnate
      const pv = window.__pv, Rr = pv.R, S = Rr.__models.scene, rd = Rr.__models.renderer, cam = Rr.getCamera(), sm = rd.shadowMap;
      const veh = new Set(Object.values(Rr.__vehicles || {}));
      const top = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q; };
      const skin = new Map(); const isPerson = q => { if (skin.has(q)) return skin.get(q); let k = false; q.traverse(o => { if (o.isSkinnedMesh) k = true; }); skin.set(q, k); return k; };
      const mats = o => Array.isArray(o.material) ? o.material : [o.material], mu = (o, k) => mats(o).some(m => m && m.userData && m.userData[k]);
      const cat = o => {
        if (!(o.isMesh || o.isSprite || o.isLine || o.isPoints)) return null; const q = top(o), n = q.name || '';
        if (isPerson(q)) return 'persone'; if (veh.has(q)) return 'mezzi';
        if (o.userData.pesoCat || q.userData.pesoCat) return o.userData.pesoCat || q.userData.pesoCat;
        if (mu(o, 'vetro')) return 'vetro';
        if (mu(o, 'scorci') || o.userData.scorci) return 'scorci';
        if (mu(o, 'vissuti') || mu(o, 'tv1')) return 'vissuti';
        if (o.userData.fusione1 || o.userData.ombra1) return 'case';
        if (q.userData.fgRec1) return 'case_sciolte';
        if (o.userData.leggero) return 'statiche_fuse';
        if (o.userData.posa1) return 'posa';
        if (/^(treno|ferrovia|carro_)/.test(n)) return 'treno';
        if (q.userData.ugKeep || /sottosuolo/.test(n)) return 'sottosuolo';
        if (o.isSprite || o.isPoints || o.isLine || (o.material && o.material.blending === THREE.AdditiveBlending)) return 'luci_fx';
        if (q.userData.iso || q.userData.chunk || /terr|chunk|isola|island|strad|road|mare|water|sea/i.test(n)) return 'terreno';
        const src = q.__src || '';   // chi l'ha messo in scena (le funzioni di render.js)
        for (const [re, c] of SRC) if (re.test(src)) return c;
        return 'resto'; };
      const SRC = [[/fronteBottega/, 'botteghe'], [/boatAt|boatVehicle/, 'barche'], [/buildWinter/, 'inverno'], [/buildChunkGen|updateChunks/, 'terreno'], [/laundry/, 'panni'], [/flushStatic/, 'statiche_sciolte'],
        [/buildCosta|buildRocks|buildIsoleDettagli/, 'costa'], [/buildLighthouse/, 'faro'], [/surfacePortals/, 'portali'], [/buildCity/, 'citta_gruppi']];
      const byCat = {}; S.traverse(o => { if (!o.visible) return; const c = cat(o); if (!c) return; (byCat[c] = byCat[c] || []).push(o); });
      const T = new THREE.WebGLRenderTarget(64, 40);
      const spots = []; S.traverse(o => { if (o.isSpotLight && o.castShadow && o.intensity > 0 && o.visible) spots.push(o); });
      const sun = []; S.traverse(o => { if (o.isDirectionalLight && o.castShadow) sun.push(o); });
      const others = []; S.traverse(o => { if (o.isLight && o.castShadow && o.shadow && !spots.includes(o) && !sun.includes(o)) others.push(o); });
      // un disegno della scena: l'ombra del sole e/o quelle dei faretti accesi ridisegnate, le altre no; conta a parte le ombre e il passaggio principale
      const draw = (sole, faretti) => { rd.setRenderTarget(T); const au = rd.shadowMap.autoUpdate, ar = rd.info.autoReset; rd.shadowMap.autoUpdate = false; rd.shadowMap.needsUpdate = true;
        const keep = []; sun.forEach(l => { keep.push([l, l.shadow.autoUpdate]); l.shadow.autoUpdate = false; l.shadow.needsUpdate = !!sole; }); spots.forEach(l => { l.shadow.needsUpdate = !!faretti; }); others.forEach(l => { l.shadow.needsUpdate = false; });
        let shc = 0, sht = 0; const sh0 = sm.render; sm.render = function () { const c = rd.info.render.calls, t = rd.info.render.triangles; const r = sh0.apply(this, arguments); shc += rd.info.render.calls - c; sht += rd.info.render.triangles - t; return r; };
        rd.info.autoReset = false; rd.info.reset(); rd.render(S, cam); const tot = rd.info.render.calls, tri = rd.info.render.triangles;
        sm.render = sh0; keep.forEach(([l, a]) => { l.shadow.autoUpdate = a; }); rd.info.autoReset = ar; rd.shadowMap.autoUpdate = au; rd.setRenderTarget(null);
        return { principale: tot - shc, ombre: shc, tri_k: Math.round((tri - sht) / 1000), ombre_tri_k: Math.round(sht / 1000) }; };
      draw(true, true);
      const tutto = draw(true, false), faretti = draw(false, true), out = { tutto, ombre_faretti_tutte: faretti.ombre, faretti_accesi: spots.length, programmi: rd.info.programs ? rd.info.programs.length : 0, tessiture: rd.info.memory.textures, geometrie: rd.info.memory.geometries, costo: {}, oggetti: {} };
      for (const c in byCat) { const L = byCat[c]; L.forEach(o => o.visible = false); const d = draw(true, false); L.forEach(o => o.visible = true);
        out.costo[c] = { principale: tutto.principale - d.principale, ombra_sole: tutto.ombre - d.ombre, tri_k: tutto.tri_k - d.tri_k + tutto.ombre_tri_k - d.ombre_tri_k }; out.oggetti[c] = L.length; }
      // il resto per ramo di primo livello (nome o tipo, il nome del primo figlio): dove cercare dopo
      const resto = {}; (byCat.resto || []).forEach(o => { const q = top(o), c0 = q.children && q.children[0], k = (q.name || q.type) + (q.userData && Object.keys(q.userData).length ? ' {' + Object.keys(q.userData).slice(0, 3).join(',') + '}' : '') + (!q.name && c0 ? ' > ' + (c0.name || c0.type) : '') + ' @' + (q.__src || '?'); resto[k] = (resto[k] || 0) + 1; });
      // le persone: quanti pezzi a testa (mesh accese), di cui con la mappa, scheletri, materiali diversi; quante dentro l'inquadratura
      { const fr = new THREE.Frustum(), M4 = new THREE.Matrix4(); M4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); fr.setFromProjectionMatrix(M4); const pp = [], v3 = new THREE.Vector3();
        S.children.forEach(q => { if (!q.visible || !isPerson(q)) return; q.getWorldPosition(v3); let n = 0, tx = 0, sk = 0; const ms = new Set(); q.traverseVisible(o => { if (!o.isMesh) return; n++; if (o.isSkinnedMesh) sk++; mats(o).forEach(m => { ms.add(m); if (m && m.map) tx++; }); }); pp.push({ n, tx, sk, mat: ms.size, vis: fr.containsPoint(v3) }); });
        const md = a => a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : 0, inq = pp.filter(p => p.vis);
        out.persone = { in_scena: pp.length, inquadrate: inq.length, pezzi_mediana: md(inq.map(p => p.n)), pezzi_max: Math.max(0, ...inq.map(p => p.n)), con_mappa_mediana: md(inq.map(p => p.tx)), scheletri_mediana: md(inq.map(p => p.sk)), materiali_mediana: md(inq.map(p => p.mat)) }; }
      out.resto_rami = Object.entries(resto).sort((a, b) => b[1] - a[1]).slice(0, 15);
      T.dispose(); if (window.PesoOmbre) PesoOmbre.attivo = true; return out; });
    // 4) le foto: il fotogramma vero a scena ferma (dt = 0), poi senza chi si muove
    const foto = (statica) => pg.evaluate(statica => { const pv = window.__pv, Rr = pv.R, S = Rr.__models.scene, f0 = window.__f0[0];
      const hid = []; if (statica) { const veh = new Set(Object.values(Rr.__vehicles || {}));
        S.children.forEach(q => { let mob = veh.has(q); if (!mob) q.traverse(o => { if (o.isSkinnedMesh) mob = true; }); if (mob) { hid.push([q, q.layers.mask]); q.traverse(o => { if (o !== q) hid.push([o, o.layers.mask]); o.layers.set(31); }); } });
        S.traverse(o => { if ((o.isSprite || o.isPoints || o.isLine) && o.layers.mask !== 1 << 31) { hid.push([o, o.layers.mask]); o.layers.set(31); } }); }
      const M = Rr.__mondo; if (M && M.V) { M.V.t.value = 10; M.V.g.value = .4; }
      window.__nodraw = false; S.traverse(o => { if (o.isLight && o.castShadow && o.shadow) o.shadow.needsUpdate = true; });   // le ombre dei faretti non sono mai state disegnate davvero
      f0.call(Rr, pv.st, 0, pv.ui); f0.call(Rr, pv.st, 0, pv.ui); if (M && M.V) { M.V.t.value = 10; M.V.g.value = .4; } f0.call(Rr, pv.st, 0, pv.ui);
      const url = document.getElementById('cv').toDataURL('image/png'); window.__nodraw = true; hid.forEach(([o, m]) => o.layers.mask = m); return url; }, statica);
    const png = { vivo: await foto(false), statica: await foto(true) };
    fs.writeFileSync(path.join(OUT, s.nome + '.png'), Buffer.from(png.vivo.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, s.nome + '_statica.png'), Buffer.from(png.statica.split(',')[1], 'base64'));
    const confronta = (a, bb) => pg.evaluate(async ([a, bb, SOGLIA]) => { const load = async u => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
      const A = await load(a), B = await load(bb); if (A.width !== B.width || A.height !== B.height) return { errore: 'misure diverse' };
      const c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const x = c.getContext('2d'), D = x.createImageData(A.width, A.height);
      let sum = 0, over = 0, max = 0; const N = A.width * A.height;
      for (let i = 0; i < A.data.length; i += 4) { let m = 0; for (let k = 0; k < 3; k++) { const d = Math.abs(A.data[i + k] - B.data[i + k]); sum += d; if (d > m) m = d; D.data[i + k] = Math.min(255, d * 8); } D.data[i + 3] = 255; if (m > SOGLIA) over++; if (m > max) max = m; }
      x.putImageData(D, 0, 0); return { media: +(sum / (N * 3)).toFixed(3), oltre_pct: +(over / N * 100).toFixed(3), max, diff: c.toDataURL('image/png') }; }, [a, bb, SOGLIA]);
    const salvaDiff = (d, nome) => { if (d.diff) { fs.writeFileSync(path.join(OUT, nome + '_diff.png'), Buffer.from(d.diff.split(',')[1], 'base64')); delete d.diff; } return d; };
    if (RIF) { R.scarto = {};
      for (const k of ['vivo', 'statica']) { const f = path.join(RIF, s.nome + (k === 'vivo' ? '' : '_statica') + '.png'); if (!fs.existsSync(f)) continue;
        R.scarto[k] = salvaDiff(await confronta(png[k], 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')), s.nome + (k === 'vivo' ? '' : '_statica')); } }
    // A/B nella stessa pagina, sulla stessa scena ferma: ogni alleggerimento che si può spegnere dal vivo (window.__pesoAB[nome](false)) si spegne,
    // si rifà la foto, si riaccende; lo scarto è tutto suo (fra due caricamenti la città non è identica: vedi la soglia di rumore in PESO.md)
    const AB = await pg.evaluate(() => Object.keys(window.__pesoAB || {}));
    if (AB.length) { R.ab = {};
      for (const k of AB) { await pg.evaluate(k => window.__pesoAB[k](false), k); const off = await foto(false); await pg.evaluate(k => window.__pesoAB[k](true), k);
        const on2 = await foto(false); R.ab[k] = salvaDiff(await confronta(on2, off), s.nome + '_ab_' + k); R.ab[k].stabile = salvaDiff(await confronta(on2, png.vivo), s.nome + '_ab_' + k + '_stabile'); } }
    await pg.evaluate(() => { const pv = window.__pv; [pv.R.frame, pv.G.step] = window.__f0; });
    R.sec = Math.round((Date.now() - ts) / 1000);
    OUTJ.scatti[s.nome] = R; log(s.nome, JSON.stringify({ peso_lontano: R.peso_lontano, peso_gente: R.peso_gente, peso_ombre: R.peso_ombre, tempi: R.tempi, tempi4x: R.tempi4x, tutto: R.categorie.tutto, faretti: R.categorie.ombre_faretti_tutte, costo: R.categorie.costo, persone: R.categorie.persone, scarto: R.scarto, ab: R.ab }));
    log('   resto', JSON.stringify(R.categorie.resto_rami));
    fs.writeFileSync(path.join(OUT, 'banco.json'), JSON.stringify(OUTJ, null, 1));
  }
  // la tabella
  const C = ['persone', 'vetro', 'case', 'case_sciolte', 'botteghe', 'statiche_fuse', 'statiche_sciolte', 'posa', 'scorci', 'vissuti', 'terreno', 'costa', 'barche', 'panni', 'inverno', 'treno', 'sottosuolo', 'luci_fx', 'mezzi', 'resto'];
  let md = `Disegni per fotogramma (mediana di ${NF} fotogrammi veri): tutto = principale + ombre + post. Costo delle categorie: disegni in meno spegnendole nello stesso fotogramma (principale + ombra del sole).\n\n`;
  md += `| scatto | disegni | principale | ombre | ombre senza cotture | post | mappe d'ombra | tri k | frame ms | 4× ms | logica ms | ${C.join(' | ')} | faretti (tutti) | scarto vivo | scarto statica |\n|${'---|'.repeat(14 + C.length + 1)}\n`;
  for (const [n, R] of Object.entries(OUTJ.scatti)) { const c = R.categorie, t = R.tempi, sc = k => R.scarto && R.scarto[k] ? `${R.scarto[k].media} / ${R.scarto[k].oltre_pct}%` : '';
    md += `| ${n} | ${t.disegni} | ${t.principale} | ${t.ombre} | ${t.ombre_senza_cotture === undefined ? '' : t.ombre_senza_cotture} | ${t.post} | ${t.mappe_ombra} | ${t.triangoli_k} | ${t.frame_ms} | ${R.tempi4x ? R.tempi4x.frame_ms : ''} | ${t.logica_ms} | ${C.map(k => c.costo[k] ? c.costo[k].principale + '+' + c.costo[k].ombra_sole : '').join(' | ')} | ${c.ombre_faretti_tutte} | ${sc('vivo')} | ${sc('statica')} |\n`; }
  fs.writeFileSync(path.join(OUT, 'banco.md'), md); console.log(md);
  await b.close(); srv.close(); process.exit(0);
});
