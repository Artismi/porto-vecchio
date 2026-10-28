// [tavoletta] LA SONDA DELLA TAVOLETTA: nel gioco vero (Chromium senza testa, SwiftShader) apre la tavoletta su muri e pavimenti
// davanti alla camera, guarda la foto di sfondo (vuota? cielo? nera?), disegna un tratto, controlla che si veda e che «Salva sul
// muro» metta il lavoro sul muro.
//   node strumenti/tavoletta_sonda.js [cartella] [--scorcio=ottagono] [--n=6] [--query=&altro]
// Esce con 0 se tutte le prove passano.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}, POS = [];
for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)=(.*)$/.exec(a); if (m) ARG[m[1]] = m[2]; else POS.push(a); }
const root = path.resolve(__dirname, '..'), outDir = path.resolve(POS[0] || path.join(require('os').tmpdir(), 'tavoletta'));
const Q = `?scorcio=${ARG.scorcio || 'ottagono'}${ARG.query || ''}`, N = +(ARG.n || 6);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
  try {
    const pg = await b.newPage({ viewport: { width: 960, height: 600 } });
    const errori = []; pg.on('pageerror', e => { errori.push(e.message); console.log('[errore]', e.message, (e.stack || '').split('\n').slice(0, 3).join(' | ')); });
    pg.on('console', m => { if (/\[Writing\]|\[graffiti\]|tavoletta/i.test(m.text())) console.log('[console]', m.text().slice(0, 240)); });
    await pg.goto(`http://localhost:${srv.address().port}/index.html${Q}`);
    await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000, polling: 500 });
    console.log('pronto in', sec());
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60;
      setInterval(() => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.book = false; u.menu = false; u.intro = false; st.over = null; st.chase = false; st.player.hp = 100; }, 50);
      const inv = Oggetti.inv(st); inv.bomboletta = 6; inv.pennarello = 2; st.player.hand = 'bomboletta'; Writing.setMode(st, 'tavoletta'); });
    const fot = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
    for (let j = 0; j < 4; j++) await fot();
    // i bersagli: una griglia sullo schermo, il primo colpo entro 14 m dal personaggio; muri (normale orizzontale) e pavimenti
    const T = await pg.evaluate(N => {
      const THREE = window.THREE, pv = window.__pv, R = pv.R, st = pv.st, p = st.player, cam = R.getCamera(), rc = new THREE.Raycaster(), list = R.__bmb.bmbCands(p.x, p.y).filter(o => !o.userData.velo && !o.userData.wr);
      const out = { muro: [], terra: [] };
      for (let j = 1; j < 10; j++) for (let i = 1; i < 12; i++) { const nx = i / 12, ny = j / 10; rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), cam);
        const h = rc.intersectObjects(list, false).find(h => h.face); if (!h || Math.hypot(h.point.x - p.x, h.point.z - p.y) > 12) continue;
        const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); (Math.abs(n.y) < .5 ? out.muro : out.terra).push({ nx, ny, d: +h.distance.toFixed(1), o: h.object.name || h.object.type }); }
      const pick = L => L.filter((q, k) => k % Math.max(1, Math.floor(L.length / Math.ceil(N / 2))) === 0).slice(0, Math.ceil(N / 2));
      return pick(out.muro).map(q => Object.assign(q, { k: 'muro' })).concat(pick(out.terra).map(q => Object.assign(q, { k: 'terra' })));
    }, N);
    console.log('bersagli', T.length, JSON.stringify(T));
    for (let k = 0; k < T.length; k++) {
      const t = T[k];
      // apri: tick (il primo colpo), trascina di qualche punto, lascia
      const a = await pg.evaluate(t => { const st = window.__pv.st; const r1 = Writing.tick(st, t.nx, t.ny, .016, '#c42a22', 0, 'bomboletta'); const r2 = Writing.tick(st, t.nx + .08, t.ny + .06, .016, '#c42a22', 0, 'bomboletta'); Writing.release(st); return { r1, r2, pad: !!Writing._.TAV.pad }; }, t);
      if (!a.pad) { ok(false, `${t.k} ${k}: la tavoletta non si apre (${JSON.stringify(a)})`); continue; }
      // la foto di sfondo: quanto è piatta, quanta parte è il colore di pulizia o il cielo
      const s = await pg.evaluate(() => { const box = Writing._.TAV.pad, cs = box.querySelectorAll('canvas'), bg = cs[0], x = bg.getContext('2d'), pn = cs[1].parentElement.style, f = v => parseFloat(v || '0') / 100, X0 = Math.round(f(pn.left) * bg.width), Y0 = Math.round(f(pn.top) * bg.height), W = Math.max(1, Math.round((f(pn.width) || 1) * bg.width)), H = Math.max(1, Math.round((f(pn.height) || 1) * bg.height)), d = x.getImageData(X0, Y0, W, H).data;   // solo il riquadro (fuori è il contesto scurito)
        let n = 0, sum = 0, sum2 = 0, zero = 0, sky = 0; const R0 = window.__pv.R; let fc = null; try { const sc = R0.__models.scene; fc = sc.fog && sc.fog.color || sc.background; } catch (e) { }
        for (let i = 0; i < d.length; i += 4 * 37) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; n++; sum += l; sum2 += l * l; if (d[i + 3] < 8 || l < 3) zero++; }
        const m = sum / n; return { W, H, media: +m.toFixed(1), dev: +Math.sqrt(Math.max(0, sum2 / n - m * m)).toFixed(1), vuoti: +(zero / n).toFixed(2), url: bg.toDataURL('image/jpeg', .8), ui: box.getBoundingClientRect().height }; });
      fs.writeFileSync(path.join(outDir, `tav_${k}_${t.k}.jpg`), Buffer.from(s.url.split(',')[1], 'base64'));
      ok(s.dev > 1 && s.vuoti < .3, `${t.k} ${k}: la foto di sfondo ha il muro (${s.W}×${s.H}, media ${s.media}, scarto ${s.dev}, vuoti ${s.vuoti})`);
      // un tratto col mouse vero sul pannello
      const bx = await pg.evaluate(() => { const c = Writing._.TAV.pad.querySelectorAll('canvas')[2].getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; });
      await pg.mouse.move(bx.x + bx.w * .2, bx.y + bx.h * .5); await pg.mouse.down();
      for (let i = 1; i <= 12; i++) await pg.mouse.move(bx.x + bx.w * (.2 + .6 * i / 12), bx.y + bx.h * (.5 + .2 * Math.sin(i)));
      await pg.mouse.up();
      const ink = await pg.evaluate(() => { const c = Writing._.TAV.pad.querySelectorAll('canvas')[1], d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let on = 0, n = 0; for (let i = 3; i < d.length; i += 4 * 11) { n++; if (d[i] > 40) on++; } return { frac: on / n, wDisp: c.getBoundingClientRect().width, W: c.width }; });
      ok(ink.frac > .002, `${t.k} ${k}: il tratto si vede (${(ink.frac * 100).toFixed(2)}% della tela, mostrata a ${Math.round(ink.wDisp)} px su ${ink.W})`);
      const nw0 = await pg.evaluate(() => Writing.S(window.__pv.st).works.length);
      await pg.evaluate(() => { const bs = [...Writing._.TAV.pad.querySelectorAll('button')], s = bs.find(b => /salva/i.test(b.textContent)); s && s.click(); });
      await pg.waitForTimeout(300);
      const sv = await pg.evaluate(n0 => { const W = Writing.S(window.__pv.st), w = W.works[W.works.length - 1], pad = Writing._.TAV.pad; return { aperto: !!pad, info: pad ? [...pad.querySelectorAll('span')].map(s => s.textContent).join(' | ') : '', nuovi: W.works.length - n0, gfx: !!(w && Writing.GFX.works[w.id]), style: w && w.style }; }, nw0);
      ok(!sv.aperto && sv.nuovi === 1 && sv.gfx, `${t.k} ${k}: «Salva sul muro» pubblica (${JSON.stringify(sv)})`);
      if (sv.aperto) await pg.evaluate(() => { const bs = [...Writing._.TAV.pad.querySelectorAll('button')], s = bs.find(b => /esci/i.test(b.textContent)); s && s.click(); });
      await fot();
    }
    if (errori.length) { console.log('ERRORI DI PAGINA:', errori.length); fail++; }
  } catch (e) { console.error(e); fail++; }
  console.log(fail ? `NO: ${fail} prove fallite` : 'tutto ok', 'in', sec());
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
});
