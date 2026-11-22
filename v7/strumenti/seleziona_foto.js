// [graffiti] LA TAVOLA DELLO STRUMENTO DI SELEZIONE, NEL GAME BOY (come gameboy_foto.js: l'ingresso del Game Boy rosa e dentro il gioco di v7/
// in /gioco/, Chromium col profilo di un telefono, seme fisso). Quattro quadri: la cornice su un muro, su una saracinesca, su un'auto
// parcheggiata, e un pezzo finito sull'auto. I posti vengono dalla misura (strumenti/seleziona_misura.js <cartella> --nome=dopo):
// il primo muro, la prima saracinesca e la prima auto ferma che lo strumento sceglie per primi.
// Uso (da v7/): node strumenti/seleziona_foto.js <cartella> <misura_dopo.json> [uscita.jpg]
//   poi: python3 strumenti/seleziona_tavola.py <cartella> <uscita.jpg>
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const V7 = process.env.V7DIR || path.resolve(__dirname, '..'), ING = path.resolve(__dirname, '../../android/app/src/main/ingresso');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const MIS = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
// i posti: il personaggio davanti alla superficie (px, py, pf dalla misura)
const scegli = f => MIS.righe.filter(f).sort((a, b) => (a.d || 9) - (b.d || 9))[0];
const MURO = scegli(r => r.Dprimo && (r.Dk === 'facciata' || r.Dk === 'muro') && r.D === 'si' && r.d > 1 && r.d < 3) || scegli(r => r.D === 'si' && (r.Dk === 'facciata' || r.Dk === 'muro'));
const SAR = scegli(r => r.Dk === 'saracinesca' && r.Dprimo && r.D === 'si') || scegli(r => r.Dk === 'saracinesca' && r.Dprimo) || scegli(r => r.Dk === 'saracinesca');
const AUTO = (MIS.mezzi || []).find(r => r.D === 'si' && r.Dprimo && !r.mov && r.parked) || (MIS.mezzi || []).find(r => r.D === 'si' && !r.mov);
console.log('posti', JSON.stringify({ MURO, SAR, AUTO }));
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/gioco/api/') || u.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  const f = u.startsWith('/gioco/') ? path.join(V7, u.slice(7)) : path.join(ING, u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(0, async () => {
  const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message.slice(0, 200)));
  await pg.addInitScript(() => { let a = 4242; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await pg.goto(`http://localhost:${srv.address().port}/`, { timeout: 900000, waitUntil: 'commit' });
  const shot = async nome => { const f = path.join(OUT, nome + '.png'); try { await pg.screenshot({ path: f, timeout: 240000 }); log('foto', f); } catch (e) { log('foto mancata', nome, e.message); } };
  await pg.waitForTimeout(6000);
  const gioco = async () => { for (;;) { const f = pg.frames().find(q => /\/gioco\/index\.html/.test(q.url())); if (f) return f; await pg.waitForTimeout(2000); } };
  const G = await gioco(); log('frame del gioco', G.url());
  await G.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R, null, { timeout: 1500000, polling: 2000 });
  log('pronto'); await pg.waitForTimeout(8000);
  const tasto = (k, giu) => pg.evaluate(([k, giu]) => { const f = [...document.querySelectorAll('iframe')].find(q => /gioco/.test(q.src) || (q.contentWindow && /gioco/.test(q.contentWindow.location.href))); if (f) f.contentWindow.postMessage({ pvc: 'tasto', k, giu }, '*'); }, [k, giu]);
  for (let i = 0; i < 3; i++) { await tasto('a', true); await pg.waitForTimeout(300); await tasto('a', false); await pg.waitForTimeout(3000); if (await G.evaluate(() => !window.__pv.ui.intro)) break; }
  await G.evaluate(() => { const pv = window.__pv; if (pv.ui.intro) { try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } catch (e) { } } });
  await pg.waitForTimeout(6000);
  await G.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; window.__meteo = 'sereno'; st.t = Math.floor(st.t / 1440) * 1440 + 15 * 60; st.chase = false;
    setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 200);
    const inv = Oggetti.inv(st); inv.bomboletta = 12; });
  // il personaggio davanti al posto, la bomboletta in mano, la camera dietro di lui (lo yaw della camera7), la lettura dei piani subito
  const vai = (q, misura) => G.evaluate(([q, misura]) => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R; p.x = q.px; p.y = q.py; p.face = q.pf; p.vx = p.vy = 0; p.path = []; p.lv = null; p.vehicle = null; p.indoor = null; p.hand = 'bomboletta';
    Writing.setMode(st, 'tavoletta'); Writing.tavSize(0, misura); if (R.camReset) R.camReset(); if (R.__cam7) R.__cam7.yaw0 = Math.atan2(-Math.cos(q.pf), -Math.sin(q.pf)) + (q.veh ? .5 : .25); pv.ui.drag = 0; pv.ui.tilt = 0;   // la camera un filo di lato: il personaggio non copre la cornice
    for (let k = 0; k < 600; k++) { Seleziona._.coda(p.x, p.y); Seleziona._.lavora(40); if (!Seleziona.misura().inCoda) break; } Seleziona._.SEL.t = 0; Seleziona._.SEL.manual = false;
    if (q.veh) { const v = st.vehicles.find(x => x.id === q.veh); if (v) { v.speed = 0; v.vx = v.vy = 0; v.parkT = 1e9; } }
    return Seleziona.misura(); }, [q, misura]);
  // dopo il salto la città attorno arriva a fotogrammi (i settori, il dettaglio): si aspetta, poi i piani si rileggono da capo
  const rileggi = () => G.evaluate(() => { const p = window.__pv.st.player; Seleziona._.reset(); for (let k = 0; k < 800; k++) { Seleziona._.coda(p.x, p.y); Seleziona._.lavora(40); if (!Seleziona.misura().inCoda) break; } Seleziona._.SEL.t = 0; Seleziona._.SEL.manual = false; return Seleziona.misura(); });
  const quadro = async (nome, q, misura, attesa) => { if (!q) { log('manca il posto per', nome); return; } log(nome, JSON.stringify(await vai(q, misura))); await pg.waitForTimeout(30000); log(nome, 'riletti', JSON.stringify(await rileggi())); await pg.waitForTimeout(attesa || 20000);
    log(nome, 'scelto', JSON.stringify(await G.evaluate(() => { const C = Seleziona.scelto; return C ? { k: C.kind, veh: C.veh, W: +C.W.toFixed(2), H: +C.H.toFixed(2), n: Seleziona.candidati.length, lab: Seleziona._.CR.labTxt } : null; }))); await shot(nome); };
  await quadro('1_muro', MURO, 'throw');
  await quadro('2_saracinesca', SAR, 'throw');
  await quadro('3_auto', AUTO, 'tag');
  // il pezzo finito sull'auto: il bozzetto di Traccia (writer_arte.js, la mano del giocatore) salvato sul fianco scelto (tavSave2: le regole di sempre)
  if (AUTO) {
    const r = await G.evaluate(() => { const pv = window.__pv, st = pv.st, WR = Writing, H = WR._.TAV.hov; if (!H || !H.ok || !H.A.veh) return { no: 'niente cornice sull\'auto' };
      const Rc = WR._.tavFit2(H.Rc, H.A) || H.Rc, W = WR.S(st), seed = 90210, style = 'throw';
      const imp = WriterArte.conceive({ aka: W.aka || 'KAOS', crew: W.crew, style, dna: WR.playerDna(st), seed }) || {};
      const w = Object.assign({ by: 'player', aka: W.aka || 'KAOS', crew: W.crew, style, tool: 'bomboletta', seed, pal: 3, prog: 1, done: false, surf: 'muro' }, imp, { style, W: Rc.W, H: Rc.H, seed });
      const res = WR._.tavSave2(st, Rc, H.A, { strokes: [], traccia: { w, stage: 9, di: 9 } }); st.player.hand = null; return { res, veh: H.A.veh, W: Rc.W, H: Rc.H }; });
    log('pezzo', JSON.stringify(r));
    for (let k = 0; k < 8; k++) { await pg.waitForTimeout(15000); const s = await G.evaluate(() => { const W = Writing.S(window.__pv.st), w = W.works[W.works.length - 1], g = w && Writing.GFX.works[w.id]; return { flat: g ? !!g.flat : null, vatl: !!(g && g.tgt && g.tgt.vatl), decal: !!(g && g.tgt && g.tgt.decal), drawn: g ? g.drawn : null }; }); log('il pezzo', JSON.stringify(s)); if (s.flat === false && (s.vatl || s.decal)) break; }
    await pg.waitForTimeout(15000); await shot('4_auto_dipinta');
    log('atlante dei mezzi', JSON.stringify(await G.evaluate(() => { const V = Writing._.VATL; return { slot: [...V.slot.keys()], vertici: V.P ? V.P.MG[0].mesh.geometry.attributes.position ? V.P.MG[0].mesh.geometry.attributes.position.count : 0 : 0, visibile: !!(V.P && V.P.MG[0].mesh.visible) }; })));
  }
  await b.close(); srv.close(); log('fine');
});
