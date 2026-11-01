// [compenetra] I pezzi rifatti delle case fuse stanno nella loro casa? (node strumenti/sonda_compenetra.js)
// Carica il gioco vero in Chromium senza testa, finisce i lavori ad anelli, poi per ogni casa (window.__pv.R.__buildings) rifà i
// pezzi originali dalla mesh fusa (o.userData.lazy1(), render.js lazyGeo1: sul telefono via lmDec di leggera_memoria.js compatta) e
// li porta nel mondo (matrixWorld). Conta i vertici oltre 2 m dalla pianta della casa (rec.geo: x0, w, z0, d): fili e panni stesi
// legittimi sono pochi; migliaia vuol dire che la fetta [start, start+count) della fusa non è più quella del pezzo.
// Prima di leggere, due raggi su ogni mesh fusa (render.js [fluido] RAGGI VELOCI): l'indice spaziale si costruisce come nel gioco
// (un colpo dei graffiti, della camera, delle passerelle), così la prova vede anche quello che il raggio fa alla fusa. RAGGI=0 li toglie.
//   PV_QUERY='?cittanuova&leggera&tasselli=0' node strumenti/sonda_compenetra.js      (predefinito ?cittanuova&tasselli=0)
//   MARGINE=2 (m)  MOSTRA=12 (le case peggiori)  ESIGI=n: esce con 1 se i vertici lontani sono più di n
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const Q = process.env.PV_QUERY || '?cittanuova&tasselli=0', MARGINE = +(process.env.MARGINE || 2), MOSTRA = +(process.env.MOSTRA || 12), RAGGI = process.env.RAGGI !== '0';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: process.env.PW_CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 300 } });
  pg.on('pageerror', e => console.log('[errore]', e.message));
  pg.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) console.log('[console]', m.text().slice(0, 300)); });
  await pg.addInitScript(() => { window.__pulita = true; });
  log('carico', Q);
  await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`, { timeout: 600000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models.renderer, null, { timeout: 900000, polling: 1000 });
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  await pg.waitForFunction(() => !window.__pv.ui.intro, null, { timeout: 120000 }).catch(() => log('ancora nella schermata iniziale'));
  await pg.evaluate(() => { if (window.Anelli && Anelli.ON) Anelli.finisci(); });
  await pg.waitForTimeout(3000);
  log('caricato', JSON.stringify(await pg.evaluate(() => ({ fusione1: window.__fusione1 || null, leggera: !!(window.LeggeraMem && LeggeraMem.on('compatta')), compatte: window.LeggeraMem ? LeggeraMem.conto2() : null }))));
  const R = await pg.evaluate(([MARGINE, RAGGI]) => {
    const pv = window.__pv, S = pv.R.__models.scene, recs = pv.R.__buildings || [], V = new THREE.Vector3();
    let raggi = 0, indici = 0;
    if (RAGGI) {   // l'indice spaziale delle mesh fuse, come lo costruisce il gioco al secondo raggio (le grandi al primo)
      const rc = new THREE.Raycaster(), fuse = []; S.traverse(o => { if (o.isMesh && o.userData.fusione1) fuse.push(o); });
      for (const m of fuse) { const g = m.geometry; if (!g.boundingSphere) continue; const c = g.boundingSphere.center.clone().applyMatrix4(m.matrixWorld);
        for (let k = 0; k < 2; k++) { rc.set(new THREE.Vector3(c.x + .3 * k, c.y + 200, c.z), new THREE.Vector3(0, -1, 0)); rc.far = 1000; m.raycast(rc, []); raggi++; }
        if (g.boundsTree) indici++; }
    }
    let pezzi = 0, vertici = 0, lontani = 0; const perCasa = [];
    for (const rec of recs) {
      const G = rec.geo, grp = rec.grp; if (!G || !grp) continue;
      const x0 = G.x0, x1 = G.x0 + G.w, z0 = G.z0, z1 = G.z0 + G.d; let nL = 0, nV = 0, np = 0; const bb = new THREE.Box3();
      grp.updateMatrixWorld(true);
      grp.traverse(o => { if (!o.isMesh || typeof o.userData.lazy1 !== 'function') return; const g = o.userData.lazy1(); const P = g && g.attributes.position; if (!P) return; np++;
        for (let i = 0; i < P.count; i++) { V.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); bb.expandByPoint(V); nV++;
          if (V.x < x0 - MARGINE || V.x > x1 + MARGINE || V.z < z0 - MARGINE || V.z > z1 + MARGINE) nL++; } });
      pezzi += np; vertici += nV; lontani += nL;
      if (nL) perCasa.push({ id: rec.b && (rec.b.id || rec.b.nome) || rec.id || '?', lontani: nL, vertici: nV, pianta: [x0, x1, z0, z1].map(v => +v.toFixed(1)), pezzi: bb.isEmpty() ? null : [bb.min.x, bb.max.x, bb.min.z, bb.max.z].map(v => +v.toFixed(1)) });
    }
    perCasa.sort((a, b) => b.lontani - a.lontani);
    return { case: recs.length, pezzi, vertici, lontani, caseLontane: perCasa.length, raggi, indici, peggiori: perCasa };
  }, [MARGINE, RAGGI]);
  log(`case ${R.case} · pezzi rifatti ${R.pezzi} · vertici ${R.vertici}` + (RAGGI ? ` · raggi ${R.raggi} (mesh fuse con l'indice spaziale ${R.indici})` : ''));
  console.log(`vertici lontani dalla loro casa (oltre ${MARGINE} m): ${R.lontani} in ${R.caseLontane} case`);
  R.peggiori.slice(0, MOSTRA).forEach(q => console.log(`  ${String(q.id).padEnd(16)} ${String(q.lontani).padStart(8)} / ${String(q.vertici).padStart(8)}  pianta x ${q.pianta[0]}-${q.pianta[1]} z ${q.pianta[2]}-${q.pianta[3]}  pezzi x ${q.pezzi[0]}-${q.pezzi[1]} z ${q.pezzi[2]}-${q.pezzi[3]}`));
  if (process.env.ESIGI !== undefined && R.lontani > +process.env.ESIGI) process.exitCode = 1;
  await b.close(); srv.close();
});
