// [disegni] CHI DISEGNA: il gioco vero sul profilo telefono (390×844, DPR 3, ?cittanuova&leggera, come banco_audit.js), fermo in un punto
// del borgo, e per ogni disegno di un fotogramma (passaggio principale e ombre) chi l'ha chiesto: la mesh, il suo ramo (il figlio diretto
// della scena), gli userData, il materiale. In più: quanti oggetti fanno ombra e di che tipo, quante prove di frustum (intersectsObject e
// intersectsSprite) per fotogramma, quanti oggetti attraversa scene.updateMatrixWorld e il loro tempo (performance.now attorno alle due
// chiamate di three, mediana su NF fotogrammi, passo fisso, disegni a vuoto).
//   node strumenti/sonda_disegni.js [uscita.json] [--query=&...] [--punto=1424,322] [--nf=120] [--computer] [--indice=<altro index.html>]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const OUT = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(root, 'reports', 'sonda_disegni.json');
const TEL = !has('computer'), NF = +arg('nf', 120);
const Q = '?cittanuova' + (TEL ? '&leggera' : '') + arg('query', '');
const PUNTI = arg('punto', '1424,322;1372,388').split(';').map(s => s.split(',').map(Number));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };

function initPage() {
  window.__pulita = true;
  { let a = 12345; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawRangeElements', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = P[k]; if (f) P[k] = function () { if (window.__D) window.__D.gl++; }; } }
}

const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = u === '/index.html' && arg('indice', null) ? path.resolve(arg('indice')) : path.join(root, u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc'] });
  const ctx = await b.newContext(TEL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const pg = await ctx.newPage();
  pg.on('crash', () => { log('[pagina morta]'); process.exit(2); });
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(initPage);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1500000, polling: 1000 });
  log('caricato', Q);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); });
  await pg.evaluate(() => { const pv = window.__pv, R = pv.R, st = pv.st; if (R.setRes) R.setRes(1); R.setRes = null; R.lowQuality = () => { }; if (window.PesoSchermo && PesoSchermo.blocca) PesoSchermo.blocca(); st.deadline = 1e12;
    setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.desat = false; u.letterbox = false; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; st.player.stun = 0; }, 50); });
  const OUTJ = { query: Q, punti: {} };
  for (const P of PUNTI) {
    await pg.evaluate(([x0, y0]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, ui = pv.ui;
      p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x0; p.y = y0; st.t = (Math.floor(st.t / 1440) + 1) * 1440 + 660; window.__meteo = 'sereno';
      ui.zoom = 1; R.cam.x = R.cam.tx = x0; R.cam.y = R.cam.ty = y0; }, P);
    for (let k = 0, quiet = 0, tb = Date.now(); Date.now() - tb < 180000 && quiet < 3; k++) { await pg.waitForTimeout(1000); quiet = (await pg.evaluate(() => !(window.__pv.R.ISO && window.__pv.R.ISO.job))) ? quiet + 1 : 0; }
    await pg.waitForTimeout(12000);   // i rami fermi si congelano dopo 10 s
    const r = await pg.evaluate(async (NF) => {
      const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, T3 = window.THREE;
      const top = o => { let q = o; while (q.parent && q.parent !== S) q = q.parent; return q; };
      const udk = o => o && o.userData ? Object.keys(o.userData).filter(k => !/^(lazy1|__)/.test(k)).slice(0, 3).join(',') : '';
      const chi = o => { const t = top(o); const m = Array.isArray(o.material) ? o.material[0] : o.material;
        return `${o.isInstancedMesh ? 'Ist' : o.isSkinnedMesh ? 'Skin' : o.type} top=${t === o ? '·' : (t.name || t.type) + '[' + udk(t) + ']'} ud=[${udk(o)}] nome=${(o.name || '').slice(0, 24)} mat=${m ? m.type : '?'}`; };
      const D = window.__D = { gl: 0, main: {}, ombra: {}, altro: {}, nMain: 0, nOmbra: 0, nAltro: 0, prove: 0, umwN: 0, umw: [], cull: [] };
      const rbd = rd.renderBufferDirect; let rec = false;
      const RAW = [], TOPU = {}, PRV = { main: 0, ombra: 0 }; let inU = false, inSh = 0;
      rd.renderBufferDirect = function (camera, scene, geo, mat, obj, grp) { if (rec) { const k = scene === S ? 'main' : scene === null ? 'ombra' : 'altro'; const c = chi(obj); D[k][c] = (D[k][c] || 0) + 1; D['n' + k[0].toUpperCase() + k.slice(1)]++;
          if (k === 'main' && RAW.length < 4000) { const e = obj.matrixWorld.elements, gs = geo.boundingSphere; let x = e[12], z = e[14]; if (gs) { const c0 = gs.center; x = e[0] * c0.x + e[4] * c0.y + e[8] * c0.z + e[12]; z = e[2] * c0.x + e[6] * c0.y + e[10] * c0.z + e[14]; }
            const pr = rd.properties.get(mat); RAW.push({ c, m: mat.id, mt: mat.type, tr: !!mat.transparent, p: pr && pr.currentProgram ? pr.currentProgram.id : -1, n: geo.index ? geo.index.count : geo.attributes.position ? geo.attributes.position.count : 0, ist: obj.isInstancedMesh ? obj.count : 0, x: Math.round(x), z: Math.round(z), r: gs ? +gs.radius.toFixed(1) : -1, id: obj.id, top: top(obj).id, g: grp ? 1 : 0 }); } }
        return rbd.apply(this, arguments); };
      const smr = rd.shadowMap.render; rd.shadowMap.render = function () { inSh++; try { return smr.apply(this, arguments); } finally { inSh--; } };
      const io = T3.Frustum.prototype.intersectsObject, isp = T3.Frustum.prototype.intersectsSprite;
      T3.Frustum.prototype.intersectsObject = function () { D.prove++; if (rec) PRV[inSh ? 'ombra' : 'main']++; return io.apply(this, arguments); };
      T3.Frustum.prototype.intersectsSprite = function () { D.prove++; return isp.apply(this, arguments); };
      // il tempo di scene.updateMatrixWorld (quello che three chiama in render) e di tutto render() (culling compreso, disegni a vuoto)
      const umw0 = S.updateMatrixWorld; let tU = 0; const FORZ = {}; S.updateMatrixWorld = function (force) { const t = performance.now(); inU = true; if (cnt) { const k = (force ? 'forzata ' : 'normale ') + (new Error().stack || '').split('\n').slice(2, 5).map(l => l.trim().replace(/^at /, '').replace(/\(?http[^)]*index\.html:/, '@').replace(/\)$/, '')).join(' < '); FORZ[k] = (FORZ[k] || 0) + 1; } try { return umw0.apply(this, arguments); } finally { inU = false; tU += performance.now() - t; } };
      const ume = T3.Object3D.prototype.updateMatrixWorld; let cnt = false; T3.Object3D.prototype.updateMatrixWorld = function () { if (cnt) { D.umwN++; if (inU) { const t = top(this), k = t === this ? 'radice:' + (this.name || this.type) + '[' + udk(this) + ']' : (t.name || t.type) + '[' + udk(t) + ']'; TOPU[k] = (TOPU[k] || 0) + 1; } } return ume.apply(this, arguments); };
      const r0 = rd.render; let tR = 0; rd.render = function (sc) { const t = performance.now(); try { return r0.apply(this, arguments); } finally { if (sc === S) tR += performance.now() - t; } };
      // due fotogrammi registrati (le ombre sul telefono vanno a fotogrammi alterni): i conti sono per fotogramma, le liste per due
      await new Promise(res => requestAnimationFrame(res)); rd.shadowMap.needsUpdate = true; window.__pv.R.__dz;
      const fr0 = window.__pv.R.frame; let n = 0, umwArr = [], rArr = [], prove = [];
      await new Promise(res => { window.__pv.R.frame = function () { if (n < 2) { rec = true; cnt = true; } tU = 0; tR = 0; const p0 = D.prove; try { return fr0.apply(this, arguments); } finally { rec = false; cnt = false; umwArr.push(tU); rArr.push(tR); prove.push(D.prove - p0); if (++n >= NF) { window.__pv.R.frame = fr0; res(); } } }; });
      rd.renderBufferDirect = rbd; T3.Frustum.prototype.intersectsObject = io; T3.Frustum.prototype.intersectsSprite = isp; S.updateMatrixWorld = umw0; T3.Object3D.prototype.updateMatrixWorld = ume; rd.render = r0; rd.shadowMap.render = smr;
      const med = a => { const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2); };
      // inventario: chi fa ombra, quanti oggetti, quanti figli diretti, quanti congelati
      let oggetti = 0, ombra = 0, auto = 0; const ombraPer = {};
      S.traverse(o => { oggetti++; if (o.matrixAutoUpdate) auto++; if ((o.isMesh || o.isPoints) && o.castShadow && o.visible) { ombra++; const c = chi(o); ombraPer[c] = (ombraPer[c] || 0) + 1; } });
      const F = R.__frz, frz = F ? F.list.filter(o => o.__frz && o.__frz.frozen).length : 0;
      const ord = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${v} ${k}`);
      return { disegni: (D.nMain + D.nOmbra) / 2, principale: D.nMain / 2, ombre: D.nOmbra / 2, altri: D.nAltro / 2, umwChiamate2: D.umwN, proveFrustum: med(prove), umw_ms: med(umwArr), render_ms: med(rArr),
        oggetti, autoMatrice: auto, figliScena: S.children.length, rami: F ? F.list.length : 0, ramiCongelati: frz, fannoOmbra: ombra,
        perMain: ord(D.main), perOmbra: ord(D.ombra), perOmbraOggetti: ord(ombraPer), umwPerRamo: ord(TOPU), umwChi: ord(FORZ), scena: { mwnu: S.matrixWorldNeedsUpdate, pos: S.position.toArray(), rot: S.rotation.toArray().slice(0, 3), sc: S.scale.toArray(), auto: S.matrixAutoUpdate }, proveMainOmbra2: PRV, raw: RAW, info: { calls: rd.info.render.calls, tri: rd.info.render.triangles } };
    }, NF);
    OUTJ.punti[P.join(',')] = r;
    log('punto', P.join(','), JSON.stringify({ ...r, perMain: undefined, perOmbra: undefined, perOmbraOggetti: undefined, umwPerRamo: undefined, raw: undefined }));
    console.log('  matrici (scene.updateMatrixWorld, due fotogrammi):\n    ' + r.umwPerRamo.slice(0, 15).join('\n    ')); console.log('  chi chiama scene.updateMatrixWorld:\n    ' + r.umwChi.slice(0, 10).join('\n    ')); console.log('  scena', JSON.stringify(r.scena));
    console.log('  main:\n    ' + r.perMain.slice(0, 25).join('\n    '));
    console.log('  ombra:\n    ' + r.perOmbra.slice(0, 15).join('\n    '));
    console.log('  fanno ombra:\n    ' + r.perOmbraOggetti.slice(0, 15).join('\n    '));
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(OUTJ, null, 1));
  }
  log('fatto', OUT);
  await b.close(); srv.close(); process.exit(0);
});
