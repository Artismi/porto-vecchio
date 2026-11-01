// [gpu] LA SONDA DELLA SCHEDA VIDEO: dove va il lavoro della scheda nel profilo leggero (ANALISI_OTTIMIZZAZIONE_GPU.md).
// Il gioco vero (?cittanuova&leggera&tassellivecchi) in Chromium senza testa (SwiftShader: i ms assoluti non valgono, valgono i conti).
// Tela 1414×640 a dpr 1, come il portatile Iris Xe del committente (F3: «canvas 1414×640»). In ogni punto, a gioco fermo alle 11:
//  1. un fotogramma vero, disegno per disegno (renderBufferDirect): passata (scena, ombra), famiglia, materiale, programma, triangoli, istanze;
//  2. la COPERTURA: la scena ridisegnata con un materiale che scrive il numero del disegno (solo gli opachi): pixel visibili per famiglia,
//     triangoli per pixel visibile (sotto 1 px a triangolo la scheda ombreggia quadrati 2×2 mezzi vuoti);
//  3. la SOVRAPPOSIZIONE: nello stesso ordine di three (gruppo, renderOrder, id del materiale, distanza) ogni frammento che passa la prova di
//     profondità conta 1 nel canale della sua famiglia: frammenti ombreggiati per famiglia contro pixel visibili (con early-Z perfetto);
//     poi lo stesso col suolo per ultimo (renderOrder) per vedere quanto suolo nascosto si risparmierebbe;
//  4. il peso relativo degli shader: lo stesso fotogramma coi materiali veri e con un materiale piatto (stessa geometria), con gl.finish.
//   node strumenti/sonda_gpu.js [--punti=x,z,zoom;...] [--query=&...] [--uscita=reports/sonda_gpu.json]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const Q = '?cittanuova&leggera&perf&tassellivecchi&pavrush' + arg('query', '');   // pavrush: i blocchi del terreno (col lastricato) si fanno interi anche in SwiftShader
const PUNTI = arg('punti', '1424,322,1;1400,312,1;1306,312,1').split(';').map(s => s.split(',').map(Number));
const OUT = path.resolve(root, arg('uscita', 'reports/sonda_gpu.json'));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 218 }, deviceScaleFactor: 1 });   // piccola mentre carica (i fotogrammi in software sono lenti: i tasselli e i blocchi salgono a fotogrammi), 1414×640 per misurare
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
  log('gioco');
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  const out = { query: Q, punti: {} };
  for (const P of PUNTI) {
    const [x0, y0, z] = P;
    await pg.evaluate(([x0, y0, z]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x0; p.y = y0; st.t = (Math.floor(st.t / 1440) + 1) * 1440 + 660; window.__meteo = 'sereno'; pv.ui.zoom = z; R.cam.x = R.cam.tx = x0; R.cam.y = R.cam.ty = y0; }, P);
    await pg.setViewportSize({ width: 480, height: 218 }); await pg.waitForTimeout(+arg('attesa', 90) * 1000);   // i tasselli e i blocchi vicini entrano
    await pg.waitForFunction(() => !window.__tasselli || !window.__tasselli.inVolo, null, { timeout: 60000, polling: 1000 }).catch(() => log('tasselli ancora in volo'));
    await pg.setViewportSize({ width: 1414, height: 640 }); await pg.waitForTimeout(20000);
    const r = await pg.evaluate(() => new Promise(done => {
      const pv = window.__pv, R = pv.R, rd = R.__models.renderer, scene = R.__models.scene, cam = R.getCamera(), gl = rd.getContext(), T3 = window.THREE;
      const PT = new Map();   // programma → il pezzo di shader che lo distingue (dal sorgente compilato: vale anche per i tasselli, che portano il testo già trasformato)
      const tagProg = m => { const pr = m && rd.properties.get(m).currentProgram; if (!pr) return ''; if (PT.has(pr)) return PT.get(pr);
        let fs = ''; try { const sh = gl.getAttachedShaders(pr.program); fs = sh.map(x => gl.getShaderSource(x) || '').join('\n'); } catch (e) { }
        const t = /pvDett\(/.test(fs) ? 'pav' : /uniform vec4 pzA/.test(fs) ? 'veste' : /uBand/.test(fs) ? 'verde' : /uTvCielo|uTvLuce/.test(fs) ? 'vissuti' : ''; PT.set(pr, t); return t; };
      const fam = (o, m) => {   // la famiglia di un disegno
        if (o.isSkinnedMesh) return 'persone';
        const src = m && m.onBeforeCompile ? String(m.onBeforeCompile) : '', ck = m && m.customProgramCacheKey ? String(m.customProgramCacheKey.call(m)) : '', tg = tagProg(m);
        if (tg === 'pav' || /pvDett|PV_LITE|vern1/.test(src + ck)) return m && m.isMeshStandardMaterial ? 'suolo-pavimento' : 'marciapiede-pavimento';
        if (tg) return tg + (o.isInstancedMesh ? '-istanze' : '');
        if (m && (m.isSpriteMaterial || o.isSprite)) return 'aloni-sprite';
        if (o.isInstancedMesh) { let a = o; while (a.parent && a.parent !== scene) a = a.parent; return 'istanze:' + (a.name || a.__fase || '?'); }
        if (m && m.transparent) return 'trasparenti';
        let a = o; while (a.parent && a.parent !== scene) a = a.parent;
        const nm = (a.__fase || a.name || a.type || '?');
        return (m ? m.type.replace('Mesh', '').replace('Material', '') : '?') + ':' + nm; };
      const tri = (g, o, grp) => { const idx = g.index, pos = g.attributes.position; let n = idx ? idx.count : pos ? pos.count : 0;
        if (grp) n = Math.min(n, grp.count); n = Math.min(n, g.drawRange.count); const ic = o.isInstancedMesh ? o.count : g.isInstancedBufferGeometry ? (g.instanceCount === Infinity ? 1 : g.instanceCount) : 1; return Math.floor(n / 3) * ic; };
      // 1. un fotogramma vero, disegno per disegno
      const D = [], rbd = rd.renderBufferDirect.bind(rd); let inSh = 0, pass = 'scena';
      const sm = rd.shadowMap, s0 = sm.render; sm.render = function () { inSh++; try { return s0.apply(this, arguments); } finally { inSh--; } };
      rd.renderBufferDirect = function (c, s, g, m, o, grp) { D.push({ p: inSh ? 'ombra' : (rd.getRenderTarget() && s === scene ? 'scena' : s === scene ? 'scena-schermo' : 'post'), f: fam(o, Array.isArray(o.material) ? o.material[grp ? grp.materialIndex : 0] : o.material), t: tri(g, o, grp), mid: m.id, mt: m.type, tr: !!m.transparent, nm: (o.name || '') }); return rbd(c, s, g, m, o, grp); };
      const F0 = R.frame; R.frame = function () { const a = performance.now(); const x = F0.apply(this, arguments); R.frame = F0; sm.render = s0; rd.renderBufferDirect = rbd; dopo(performance.now() - a); return x; };
      function dopo(msFrame) {
      const progs = (rd.info.programs || []).length;
      const agg = (filt) => { const m = new Map(); D.filter(filt).forEach(d => { const k = d.f; const e = m.get(k) || { disegni: 0, tri: 0, mat: new Set() }; e.disegni++; e.tri += d.t; e.mat.add(d.mid); m.set(k, e); }); return [...m].map(([k, e]) => [k, e.disegni, e.tri, e.mat.size]).sort((a, b) => b[2] - a[2]); };
      const passi = {}; D.forEach(d => { const e = passi[d.p] || (passi[d.p] = { disegni: 0, tri: 0, mat: new Set() }); e.disegni++; e.tri += d.t; e.mat.add(d.mid); }); for (const k in passi) passi[k].mat = passi[k].mat.size;
      // 2-4: la scena ridisegnata in un bersaglio della misura della scena
      const info = R.gpuTimes && R.gpuTimes.info || {}, px = String(info.px || '').split('×').map(Number), W = px[0] || 1414, H = px[1] || 640;
      const RT = new T3.WebGLRenderTarget(W, H, { minFilter: T3.NearestFilter, magFilter: T3.NearestFilter, type: T3.UnsignedByteType });
      const idM = new T3.ShaderMaterial({ uniforms: { id: { value: new T3.Vector3() } }, vertexShader: '#include <common>\n#include <skinning_pars_vertex>\nvoid main(){\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n}', fragmentShader: 'precision highp float; uniform vec3 id; void main(){ gl_FragColor = vec4(id, 1.); }' });
      const cnM = new T3.ShaderMaterial({ uniforms: { id: { value: new T3.Vector4() } }, vertexShader: idM.vertexShader, fragmentShader: 'precision highp float; uniform vec4 id; void main(){ gl_FragColor = id; }', blending: T3.CustomBlending, blendSrc: T3.OneFactor, blendDst: T3.OneFactor, blendEquation: T3.AddEquation, transparent: false });
      const famList = [], famIdx = new Map(), fi = k => { if (!famIdx.has(k)) { famIdx.set(k, famList.length); famList.push(k); } return famIdx.get(k); };
      const shAU = sm.autoUpdate, shNU = sm.needsUpdate; sm.autoUpdate = false; sm.needsUpdate = false;
      const bg = scene.background; scene.background = null; const fog = scene.fog;
      const drawIds = []; let mode = 'id', grpSel = 0, suoloUltimo = false;
      const ro = new Map();
      rd.renderBufferDirect = function (c, s, g, m, o, grp) {
        const om = Array.isArray(o.material) ? o.material[grp ? grp.materialIndex : 0] : o.material; if (!om || om.transparent || om.isSpriteMaterial || o.isSprite || om.visible === false) return;
        const f = fam(o, om), k = fi(f);
        if (mode === 'id') { const n = drawIds.length + 1; drawIds.push({ f, t: tri(g, o, grp) }); m.uniforms.id.value.set((n & 255) / 255, ((n >> 8) & 255) / 255, ((n >> 16) & 255) / 255); m.uniformsNeedUpdate = true; }
        else { const gk = gruppo(f), ch = gk % 4, gi = gk >> 2; const v = m.uniforms.id.value; v.set(0, 0, 0, 0); if (gi === grpSel) v.setComponent(ch, 1 / 255); m.uniformsNeedUpdate = true; }
        m.side = om.side; return rbd(c, s, g, m, o, grp); };
      const read = () => { const b = new Uint8Array(W * H * 4); rd.readRenderTargetPixels(RT, 0, 0, W, H, b); return b; };
      // copertura
      scene.overrideMaterial = idM; rd.setRenderTarget(RT); rd.setClearColor(0x000000, 0); rd.clear(); rd.render(scene, cam);
      const bi = read(), vis = new Float64Array(drawIds.length + 1); for (let i = 0; i < W * H; i++) { const n = bi[i * 4] | (bi[i * 4 + 1] << 8) | (bi[i * 4 + 2] << 16); vis[n]++; }
      const cop = new Map(); drawIds.forEach((d, i) => { const e = cop.get(d.f) || { px: 0, tri: 0, disegni: 0, triVis: 0 }; e.px += vis[i + 1]; e.tri += d.t; e.disegni++; if (vis[i + 1] > 0) e.triVis += d.t; cop.set(d.f, e); });
      const vuoto = vis[0];
      const top7 = [...cop].sort((a, b) => b[1].px - a[1].px).slice(0, 7).map(e => e[0]), gruppo = f => { const i = top7.indexOf(f); return i < 0 ? 7 : i; };
      // sovrapposizione (frammenti che passano la profondità, nell'ordine di three), due passate da 4 famiglie
      let gruppo0 = null; const nf = 8, overd = (ultimo) => { const fr = new Float64Array(nf), hist = new Float64Array(9);
        const sOR = new Map(); if (ultimo) scene.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && /pavimento/.test(fam(o, o.material))) { sOR.set(o, o.renderOrder); o.renderOrder = 1; } });
        const tot = new Float64Array(W * H);
        for (let gsel = 0; gsel < 2; gsel++) { grpSel = gsel; mode = 'cnt'; scene.overrideMaterial = cnM; rd.setRenderTarget(RT); rd.clear(); rd.render(scene, cam); const bb = read();
          for (let i = 0; i < W * H; i++) for (let ch = 0; ch < 4; ch++) { const k = gsel * 4 + ch; if (k < nf) { fr[k] += bb[i * 4 + ch]; tot[i] += bb[i * 4 + ch]; } } }
        for (let i = 0; i < W * H; i++) hist[Math.min(8, tot[i])]++;
        sOR.forEach((v, o) => { o.renderOrder = v; });
        return { fr, hist }; };
      const od1 = overd(false), od2 = overd(true);
      // 4. il peso relativo degli shader (SwiftShader: proporzionale alle istruzioni per frammento), gl.finish
      const px1 = new Uint8Array(4), sync = () => { rd.readRenderTargetPixels(RT, 0, 0, 1, 1, px1); };
      rd.renderBufferDirect = rbd; scene.overrideMaterial = null; scene.background = bg;
      const tempo = (fn, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); fn(); sync(); t.push(performance.now() - a); } t.sort((a, b) => a - b); return +t[n >> 1].toFixed(0); };
      const flat = new T3.MeshBasicMaterial({ color: 0x808080 });
      rd.setRenderTarget(RT); sync();
      const tVeri = tempo(() => { rd.setRenderTarget(RT); rd.render(scene, cam); }, 1);
      scene.overrideMaterial = flat; const tPiatti = tempo(() => { rd.setRenderTarget(RT); rd.render(scene, cam); }, 1); scene.overrideMaterial = null;
      // il suolo da solo (materiali veri): quanto pesa il pavimento
      const nas = []; scene.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible) { const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!/pavimento/.test(fam(o, m))) { nas.push(o); o.visible = false; } } });
      const tSuolo = tempo(() => { rd.setRenderTarget(RT); rd.render(scene, cam); }, 1); nas.forEach(o => { o.visible = true; });
      rd.setRenderTarget(null); sm.autoUpdate = shAU; sm.needsUpdate = shNU; RT.dispose(); idM.dispose(); cnM.dispose(); flat.dispose();
      // la camera e i metri per pixel al centro (la soglia del lastricato PV_LITE: 4-12 cm)
      const dC = cam.position.distanceTo(new T3.Vector3(R.cam.x, R.groundH ? R.groundH(R.cam.x, R.cam.y) : 0, R.cam.y));
      const mpp = 2 * dC * Math.tan(cam.fov * Math.PI / 360) / H;
      done({ W, H, res: R.res, camera: { fov: cam.fov, dist: +dC.toFixed(1), mpp_centro: +mpp.toFixed(3), pitch: +(Math.asin((cam.position.y - (R.groundH ? R.groundH(R.cam.x, R.cam.y) : 0)) / dC) * 180 / Math.PI).toFixed(1) },
        frame: { disegni: D.length, programmi: progs, passi, perFamiglia: agg(d => d.p === 'scena').slice(0, 30), ombra: agg(d => d.p === 'ombra').slice(0, 12), post: agg(d => d.p === 'post' || d.p === 'scena-schermo') },
        copertura: { pixel: W * H, vuoti: vuoto, famiglie: [...cop].map(([k, e]) => [k, e.disegni, +(e.px / (W * H) * 100).toFixed(1) + '%', e.tri, e.triVis, e.px ? +(e.triVis / e.px).toFixed(2) : null]).sort((a, b) => b[4] - a[4]) },
        sovrapposizione: { colonne: 'gruppo, frammenti, frammenti col suolo per ultimo, pixel visibili', gruppi: top7.concat(['resto']).map((k, i) => [k, od1.fr[i], od2.fr[i], k === 'resto' ? [...cop].filter(e => !top7.includes(e[0])).reduce((a, e) => a + e[1].px, 0) : cop.get(k).px]), istogramma: Array.from(od1.hist), istogrammaSuoloUltimo: Array.from(od2.hist) },
        tempiSwiftShader: { fotogramma: Math.round(msFrame), veri: tVeri, piatti: tPiatti, soloSuolo: tSuolo }, luci: window.__luci, tasselli: window.__tasselli ? { inScena: window.__tasselli.inScena, inVolo: window.__tasselli.inVolo, motivo: window.__tasselli.motivo } : null, gpu: R.gpuTimes });
      } }));
    out.punti[P.join(',')] = r; log('punto', P.join(','), JSON.stringify(r).slice(0, 4000));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  log('scritto', OUT); await b.close(); srv.close();
});
