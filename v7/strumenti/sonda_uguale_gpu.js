// [ottimizza-gpu] LA PROVA «STESSA IMMAGINE» DEGLI ALLEGGERIMENTI DELLA SCHEDA VIDEO (ANALISI_OTTIMIZZAZIONE_GPU.md), nella stessa pagina.
// Il gioco vero (?cittanuova&leggera&tassellivecchi&lucispente: in software le luci spente vanno chieste) va in un posto a un'ora, aspetta
// che tasselli e blocchi siano arrivati, poi si ferma (niente logica, niente fotogrammi: tutto resta dov'è). Si disegna la sola scena in un
// bersaglio della misura della scena, con l'ombra ferma: com'è ora (A), poi col vecchio (B), poi di nuovo A (deve essere uguale a se stesso).
//   shader : B = il define SG_GPUVECCHIO in tutti i materiali (i pezzi di shader di prima: luci, rumori)
//   scatole: B = il frustum a sole sfere, la ferrovia intera, i detriti tutti (window.__gpuScatole = false)
// Per ognuno: pixel diversi (RGBA, anche l'alfa della categoria), scarto massimo, disegni e triangoli, e i frammenti che passano la prova di
// profondità (con early-Z ideale, nell'ordine in cui si disegna).
//   node strumenti/sonda_uguale_gpu.js [--prove=shader,scatole] [--punti=x,z,ora;...] [--vw=1414 --vh=640] [--attesa=60]
// Esce con 1 se un'immagine cambia (oltre --soglia, predefinita 0).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const PROVE = arg('prove', 'shader,scatole').split(','), SOGLIA = +arg('soglia', 0), VW = +arg('vw', 1414), VH = +arg('vh', 640);
const PUNTI = arg('punti', '1424,322,660;1424,322,1320;1274,343,660').split(';').map(s => s.split(',').map(Number));
const Q = '?cittanuova&leggera&tassellivecchi&lucispente&pavrush' + arg('query', '');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.gz': 'application/gzip' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 218 }, deviceScaleFactor: 1 });   // piccola mentre carica, VW×VH per disegnare
  let fail = 0; pg.on('pageerror', e => { fail++; console.log('[errore]', e.message); });
  pg.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { waitUntil: 'domcontentloaded', timeout: 0 });
  await pg.waitForFunction(() => window.__tl && window.__tl.gioco, null, { timeout: 1800000, polling: 1000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 300000, polling: 500 }).catch(() => log('ancora nella schermata iniziale'));
  log('gioco');
  for (const [x, z, ora] of PUNTI) {
    await pg.evaluate(([x, z, ora]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R; if (window.__f0) { [pv.R.frame, pv.G.step] = window.__f0; window.__f0 = null; }
      p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x; p.y = z; window.__t0 = window.__t0 || (Math.floor(st.t / 1440) + 1) * 1440; st.t = window.__t0 + ora; window.__meteo = 'sereno';
      pv.ui.zoom = 1; R.cam.x = R.cam.tx = x; R.cam.y = R.cam.ty = z; }, [x, z, ora]);
    await pg.setViewportSize({ width: 480, height: 218 }); await pg.waitForTimeout(+arg('attesa', 60) * 1000);
    await pg.waitForFunction(() => !window.__tasselli || !window.__tasselli.inVolo, null, { timeout: 60000, polling: 1000 }).catch(() => log('tasselli ancora in volo'));
    await pg.setViewportSize({ width: VW, height: VH }); await pg.waitForTimeout(15000);
    await pg.evaluate(() => { const pv = window.__pv; window.__f0 = [pv.R.frame, pv.G.step]; pv.R.frame = () => { }; pv.G.step = () => { }; });
    for (const prova of PROVE) {
      const r = await pg.evaluate(prova => {
        const R = window.__pv.R, rd = R.__models.renderer, S = R.__models.scene, c = R.getCamera(), T3 = window.THREE;
        const sz = rd.getSize(new T3.Vector2()), W = sz.x, H = sz.y;   // la tela: nel leggero è la misura della scena a scala 1
        const T = new T3.WebGLRenderTarget(W, H, { type: T3.UnsignedByteType }), sm = rd.shadowMap, au = sm.autoUpdate;
        const cnt = new T3.ShaderMaterial({ vertexShader: '#include <common>\n#include <skinning_pars_vertex>\nvoid main(){\n#include <skinbase_vertex>\n#include <begin_vertex>\n#include <skinning_vertex>\n#include <project_vertex>\n}', fragmentShader: 'void main(){ gl_FragColor = vec4(1./255.); }', blending: T3.CustomBlending, blendSrc: T3.OneFactor, blendDst: T3.OneFactor });
        const rbd = rd.renderBufferDirect;
        const disegna = () => { sm.autoUpdate = false; sm.needsUpdate = false; rd.setRenderTarget(T); rd.setClearColor(0, 0); rd.clear(); const gl = rd.getContext(), u0 = gl.useProgram; let up = 0; gl.useProgram = function () { up++; return u0.apply(this, arguments); }; rd.info.reset(); rd.render(S, c); gl.useProgram = u0;
          const calls = rd.info.render.calls, tris = rd.info.render.triangles, a = new Uint8Array(W * H * 4); rd.readRenderTargetPixels(T, 0, 0, W, H, a);
          // i frammenti opachi che passano la prova di profondità (il cielo e i trasparenti fuori)
          rd.renderBufferDirect = function (cam, s, g, m, o, grp) { const om = Array.isArray(o.material) ? o.material[grp ? grp.materialIndex : 0] : o.material; if (!om || om.transparent || o.isSprite || om.depthWrite === false) return; m.side = om.side; return rbd.call(this, cam, s, g, m, o, grp); };
          const bg = S.background; S.background = null; S.overrideMaterial = cnt; rd.clear(); rd.render(S, c); S.overrideMaterial = null; S.background = bg; rd.renderBufferDirect = rbd;
          const f = new Uint8Array(W * H * 4); rd.readRenderTargetPixels(T, 0, 0, W, H, f); let fr = 0, cop = 0; for (let i = 0; i < W * H; i++) { fr += f[i * 4]; if (f[i * 4]) cop++; }
          rd.setRenderTarget(null); return { a, calls, tris, fr, cop, up }; };
        const materiali = () => { const ms = new Set(); S.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => ms.add(x)); }); return ms; };
        const metti = vecchio => {
          if (prova === 'shader') materiali().forEach(m => { if (!m.isMeshStandardMaterial && !m.isMeshLambertMaterial && !m.isMeshPhongMaterial && !m.isMeshBasicMaterial) return; m.defines = Object.assign({}, m.defines || {}); if (vecchio) m.defines.SG_GPUVECCHIO = ''; else delete m.defines.SG_GPUVECCHIO; m.needsUpdate = true; });
          if (prova === 'scatole') { window.__gpuScatole = !vecchio; if (window.PesoScatole && PesoScatole.interruttore) PesoScatole.interruttore(S);
            const D = R.__dz && R.__dz.debris; if (D) { if (vecchio) { window.__dbSv = [D.m.count, D.m.visible]; D.m.count = D.N; D.m.visible = true; } else if (window.__dbSv) { [D.m.count, D.m.visible] = window.__dbSv; } } }
        };
        metti(false); const A = disegna(); const t0 = performance.now(); metti(true); const B = disegna(); const tB = performance.now() - t0; metti(false); const A2 = disegna();
        let diff = 0, max = 0, rip = 0; for (let i = 0; i < A.a.length; i++) { if (A.a[i] !== A2.a[i]) { rip++; continue; } const d = Math.abs(A.a[i] - B.a[i]); if (d) { diff++; if (d > max) max = d; } }   // solo dove A è uguale a se stessa (qualche shader legge l'orologio)
        T.dispose(); cnt.dispose(); sm.autoUpdate = au;
        return { prova, W, H, canali_diversi: diff, scarto_max: max, instabile: rip, ora: { disegni: A.calls, tri: A.tris, frammenti: A.fr, coperti: A.cop, programmi: A.up }, prima: { disegni: B.calls, tri: B.tris, frammenti: B.fr, coperti: B.cop, programmi: B.up }, msB: Math.round(tB) };
      }, prova);
      if (r.scarto_max > SOGLIA) fail++;
      log(`${x},${z} ore ${(ora / 60).toFixed(1)}`, r.scarto_max > SOGLIA ? 'DIVERSA' : 'UGUALE', JSON.stringify(r));
    }
  }
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
