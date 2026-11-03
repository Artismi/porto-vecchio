// [suolo2] LA PASSEGGIATA SULLA PIAZZA DELL'OTTAGONO: il giocatore vero (game.js findPath e tryMove a ogni fotogramma) dalla via sotto
// il Gradone del Mercato su per la scala, sul pianerottolo, oltre la copertina e il camminamento, attraverso la piazza alta fino al lato
// di ponente. A ogni passo (10 al secondo) scrive la quota dei piedi (la figura del giocatore in scena), la quota del gioco (groundH) e il
// piano visibile sotto i piedi (un raggio sulle mesh vere, la stessa regola di strumenti/sonda_suolo.js). Poi le foto alla camera del gioco
// sulla scala e sul ciglio della piazza in _immagini/suolo/<nome>_<suf>.png.
//   node strumenti/sonda_suolo_cammina.js [suffisso: dopo]     QUERY='?nofixsuolo2' (com'era)
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright');
const root = path.resolve(__dirname, '..'), SUF = process.argv[2] || 'dopo', QUERY = process.env.QUERY || '', OUTD = path.join(root, '_immagini', 'suolo');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
const PERCORSO = [[1290.4, 349.4], [1262, 349]];   // dalla via a levante del gradone (sotto, al piede della scala) al lato di ponente della piazza alta (sopra)
const FOTO = [{ nome: 'scala_levante', p: [1289.1, 345.2] }, { nome: 'ciglio_levante', p: [1286.6, 343.6] }, { nome: 'scala_mezzogiorno', p: [1271.6, 357.8] }];
function sonda() {   // nella pagina: il piano visibile sotto (x, z) vicino alla quota g
  const pv = window.__pv, R = pv.R, sc = R.__ed.scene, rc = new THREE.Raycaster(), dn = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3(), n = new THREE.Vector3();
  const scarta = m => { const mt = m.material; if (!mt || Array.isArray(mt)) return false; return mt.isShaderMaterial || mt.isMeshBasicMaterial || (mt.transparent && mt.opacity < .5) || /acqua|water|vetro/i.test(mt.name || ''); };
  let M = null, MK = '';
  const facce = (x, z, y0, y1) => { o.set(x, y1, z); rc.set(o, dn); rc.far = y1 - y0; const out = []; for (const h of rc.intersectObjects(M, false)) { if (!h.face) continue; n.copy(h.face.normal).transformDirection(h.object.matrixWorld); if (n.y > .7) out.push(h.point.y); } return out; };
  const D8 = [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k * Math.PI / 4) * .45, Math.sin(k * Math.PI / 4) * .45]);
  return function (x, z, g) {
    const k = Math.floor(x / 16) + ',' + Math.floor(z / 16);
    if (k !== MK) { MK = k; M = []; const sph = new THREE.Sphere(); sc.traverseVisible(m => { if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || scarta(m) || !m.geometry || !m.geometry.boundingSphere) return; sph.copy(m.geometry.boundingSphere).applyMatrix4(m.matrixWorld); if (sph.radius < 5000 && Math.hypot(sph.center.x - x, sph.center.z - z) < sph.radius + 20) M.push(m); }); }
    for (const y of facce(x, z, g - 1.5, g + 1.3)) { let ok = true; for (const [a, b] of D8) if (!facce(x + a, z + b, y - .37, y + .37).length) { ok = false; break; } if (ok) return y; }
    return null;
  };
}
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const port = srv.address().port, T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0;
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
    pg.on('pageerror', e => log('[errore]', e.message));
    const q = (QUERY ? QUERY + '&' : '?') + 'tasselli=0&pavrush';
    await pg.goto(`http://localhost:${port}/index.html${q}`, { timeout: 900000, waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__ed, null, { timeout: 1200000, polling: 500 });
    log('pronto', q); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; st.t = Math.floor(st.t / 1440) * 1440 + 11 * 60; setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; st.t = Math.floor(st.t / 1440) * 1440 + 11 * 60; }, 50); });
    await pg.evaluate(`window.__sonda2 = (${sonda.toString()})(); window.__fig2 = () => { const sc = window.__pv.R.__ed.scene, p = window.__pv.st.player, v = new THREE.Vector3(); let best = null, bd = 1e9; sc.children.forEach(o => { if (!o.userData || !(o.userData.rig || o.userData.model || o.userData.mixer)) return; o.getWorldPosition(v); const d = Math.hypot(v.x - p.x, v.z - p.y); if (d < bd) { bd = d; best = v.y; } }); return bd < .5 ? { position: { y: best } } : null; }; 0`);
    const vai = (x, y) => pg.evaluate(([x, y]) => { const pv = window.__pv, p = pv.st.player; p.x = x; p.y = y; p.indoor = null; p.vehicle = null; p.lv = null; p.path = []; pv.click.t = null; pv.R.cam.x = x; pv.R.cam.y = y; }, [x, y]);
    // la passeggiata
    const A0 = PERCORSO[0];   // la partenza: sulla via di sotto, accanto al piede della Scala del Mercato di levante (W.passaggi scala_13)
    await vai(...A0); await pg.waitForTimeout(4000);
    // il passo: game.js findPath (passa per la scala) e game.js tryMove (gli ingombri, le barriere), 14 cm alla volta fra un campione e l'altro
    // (il clic per andare si fermava al piede della scala, contro la gente ferma lì: qui conta il suolo, non chi c'è)
    const n = await pg.evaluate(([x, y]) => { const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, P0 = G.findPath(p.x, p.y, x, y, 1.4, false), iL = P0.findIndex(q => q.x < 1289.5 && q.y < 343), P = iL < 0 ? P0 : P0.slice(0, iL + 1).concat([{ x: 1285.6, y: P0[iL].y }], G.findPath(1285.6, P0[iL].y, x, y, 1.4, false)); let k = 0;   // dal pianerottolo dritto oltre il varco della ringhiera (largo 1,4 m), poi verso ponente
      window.__giro2 = { va: P.length > 0, passo(s0) { if (k >= P.length) { this.va = false; return; } let s = s0;   // s0 metri: un passo di game.js tryMove verso il prossimo punto del percorso
        while (s > 1e-4 && k < P.length) { const w = P[k], dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy); if (d < .3) { k++; continue; } const m = Math.min(d, s, .07); G.tryMove(p, dx / d * m, dy / d * m, .35, false); p.face = Math.atan2(dy, dx); s -= m; }
        if (k >= P.length) this.va = false; } };
      return P.length; }, PERCORSO[1]);
    log('partenza', A0.map(v => v.toFixed(1)).join(','), 'percorso', n, 'punti');
    const righe = [];
    for (let t = 0; t < 600; t++) {
      await pg.evaluate(() => window.__giro2.passo(.14)); await pg.waitForTimeout(250);   // 14 cm a passo (1,4 m/s a 10 passi al secondo), poi qualche fotogramma del gioco
      const r = await pg.evaluate(() => { const pv = window.__pv, p = pv.st.player, g = pv.R.groundH(p.x, p.y), f = window.__fig2(), y = f ? f.position.y : null; return { x: +p.x.toFixed(2), z: +p.y.toFixed(2), piedi: y === null ? null : +y.toFixed(3), gioco: +g.toFixed(3), visto: (v => v === null ? null : +v.toFixed(3))(window.__sonda2(p.x, p.y, g)), va: !!(window.__giro2 && window.__giro2.va) }; });
      righe.push(r); if (!r.va || (t > 40 && righe.slice(-30).every(q => Math.hypot(q.x - r.x, q.z - r.z) < .05))) break;
    }
    const dd = righe.filter(r => r.piedi !== null && r.visto !== null).map(r => r.piedi - r.visto), mx = Math.max(...dd.map(Math.abs)), sotto = dd.filter(d => d < -.05).length, sopra = dd.filter(d => d > .05).length;
    righe.forEach(r => console.log(`  x ${r.x.toFixed(2)} z ${r.z.toFixed(2)}  piedi ${r.piedi === null ? '-' : r.piedi.toFixed(3)}  gioco ${r.gioco.toFixed(3)}  visto ${r.visto === null ? '-' : r.visto.toFixed(3)}  piedi-visto ${r.piedi === null || r.visto === null ? '-' : ((r.piedi - r.visto) * 100).toFixed(1) + ' cm'}`));
    console.log(`passi ${righe.length}, fine a ${righe[righe.length - 1].x},${righe[righe.length - 1].z} · piedi - piano visibile: max ${(mx * 100).toFixed(1)} cm, sotto il piano (>5 cm) ${sotto}, sopra (>5 cm) ${sopra}`);
    fs.mkdirSync(OUTD, { recursive: true }); fs.writeFileSync(path.join(OUTD, 'passeggiata_' + SUF + '.json'), JSON.stringify(righe));
    // le foto alla camera del gioco
    for (const F of process.env.FOTO === '0' ? [] : FOTO) for (const [zoom, k] of [[1, ''], [.4, '_vicino']]) {   // FOTO=0: solo la passeggiata   // la camera del gioco com'è, e avvicinata (la rotella: ui.zoom)
      await pg.evaluate(z => { window.__pv.ui.zoom = z; }, zoom); await vai(...F.p); await pg.waitForTimeout(6000);
      const url = await pg.evaluate(() => new Promise(res => requestAnimationFrame(() => res(document.getElementById('cv').toDataURL('image/png')))));
      const file = path.join(OUTD, F.nome + k + '_' + SUF + '.png'); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); log('foto', file);
    }
  } catch (e) { console.log('ERRORE', e); codice = 2; }
  await b.close(); srv.close(); process.exit(codice);
});
