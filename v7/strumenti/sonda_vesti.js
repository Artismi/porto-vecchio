// [leggera] La prova delle persone unite (node strumenti/sonda_vesti.js): le stesse persone del gioco vestite con i pezzi degli
// accessori uniti per materiale (sartoria.js fondi, vestiario.js pelle) e i capi in tinta unita nella tavolozza (vestiario.js tavolozza), e senza; ognuna disegnata da sola con la stessa luce e la
// stessa camera, confronto dei pixel e dei pezzi. Prima si veste due volte con l'unione accesa: deve venire identico (vestire è ripetibile).
// N=12 persone. Esce con 1 se una persona cambia più di SOGLIA canali (predefinita 0).
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.end('{}'); return; } const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 320, height: 200 } }); pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/index.html?cittanuova`);
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.Models && Models.charsReady && Models.charsReady() && window.Sartoria && Sartoria.FONDI, null, { timeout: 900000 });
  const r = await pg.evaluate(N => {
    const rd = window.__pv.R.__models.renderer, st = window.__pv.st, F = Sartoria.FONDI;
    const S = new THREE.Scene(); S.background = new THREE.Color('#808080'); S.add(new THREE.HemisphereLight('#ffffff', '#404040', .8)); const L = new THREE.DirectionalLight('#ffffff', .9); L.position.set(2, 4, 3); S.add(L);
    const cam = new THREE.PerspectiveCamera(30, 1, .1, 20); cam.position.set(0, 1.1, 4.2); cam.lookAt(0, .95, 0);
    const W = 160, H = 160, T = new THREE.WebGLRenderTarget(W, H);
    const shot = g => { S.add(g); g.position.set(0, 0, 0); g.rotation.set(0, .5, 0); g.updateMatrixWorld(true); const a = new Uint8Array(W * H * 4); rd.setRenderTarget(T); rd.render(S, cam); rd.readRenderTargetPixels(T, 0, 0, W, H, a); rd.setRenderTarget(null); S.remove(g); return a; };
    const pezzi = g => { let n = 0; g.traverseVisible(o => { if (o.isMesh) n += Array.isArray(o.material) ? o.material.length : 1; }); return n; };
    const P = Vesti3D.PAL, dress = (look, on) => { F.on = on; P.on = on; Models.__aRate = false; const g = Models.person(look, null); F.on = true; P.on = true; return g; };
    const diff = (a, b) => { let d = 0, m = 0; for (let i = 0; i < a.length; i++) { const x = Math.abs(a[i] - b[i]); if (x) { d++; if (x > m) m = x; } } return [d, m]; };
    const looks = st.npcs.filter(n => n.look).slice(0, N).map(n => n.look), out = [];
    for (const look of looks) {
      const a1 = dress(look, true), a2 = dress(look, true), b1 = dress(look, false); if (!a1 || !a2 || !b1) { out.push({ errore: 'non vestito' }); continue; }
      const ia = shot(a1), ia2 = shot(a2), ib = shot(b1); const [dr] = diff(ia, ia2), [d, m] = diff(ia, ib);
      out.push({ pezzi_uniti: pezzi(a1), pezzi_prima: pezzi(b1), ripetibile: dr === 0, canali_diversi: d, scarto_max: m });
    }
    return out; }, +(process.env.N || 12));
  let fail = 0; const soglia = +(process.env.SOGLIA || 0);
  r.forEach((x, i) => { const ok = !x.errore && (x.ripetibile ? x.canali_diversi <= soglia : true); if (!ok) fail++; console.log(`persona ${i}`, ok ? (x.ripetibile ? 'UGUALE' : 'non ripetibile: confronto non valido') : 'DIVERSA', JSON.stringify(x)); });
  const P = r.filter(x => !x.errore), s1 = P.reduce((a, x) => a + x.pezzi_prima, 0), s2 = P.reduce((a, x) => a + x.pezzi_uniti, 0);
  console.log(`pezzi in tutto: da ${s1} a ${s2}`);
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
