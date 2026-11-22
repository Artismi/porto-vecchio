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
const MURO = scegli(r => r.Dprimo && r.Dk === 'facciata' && r.D === 'si' && r.DW >= 3 && r.d > 2 && /rua|vittoria|marina|mezzo/.test(r.id)) || scegli(r => r.Dprimo && (r.Dk === 'facciata' || r.Dk === 'muro') && r.D === 'si' && r.d > 1 && r.d < 3) || scegli(r => r.D === 'si' && (r.Dk === 'facciata' || r.Dk === 'muro'));
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
  // il posto della foto: fra i candidati quello del tipo voluto (come se il giocatore premesse ◄ ►: la scelta a mano resta finché non ti sposti),
  // e la camera che lo guarda di tre quarti (il personaggio non lo copre)
  const scegliTipo = (tipi) => G.evaluate(tipi => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, SE = Seleziona; SE.cerca(st, Writing.tavMisura, 'muro'); const L = SE.candidati;
    let C = null; for (const t of tipi) { C = L.filter(c => c.kind === t).sort((a, b) => b.W * b.H - a.W * a.H)[0]; if (C) break; } if (!C) return { no: L.map(c => c.kind) };
    const S = SE._.SEL; S.i = L.indexOf(C); S.k = C.k; S.manual = true; S.px = p.x; S.py = p.y; S.hk = ''; S.t = performance.now();
    const dx = C.cx - p.x, dz = C.cz - p.y; if (R.camReset) R.camReset(); if (R.__cam7) R.__cam7.yaw0 = Math.atan2(-dx, -dz) + .42; pv.ui.drag = 0; p.face = Math.atan2(dz, dx);
    return { k: C.kind, W: +C.W.toFixed(2), H: +C.H.toFixed(2), d: +C.d.toFixed(2), n: L.length }; }, tipi);
  const quadro = async (nome, q, misura, attesa, tipi) => { if (!q) { log('manca il posto per', nome); return; } log(nome, JSON.stringify(await vai(q, misura))); await pg.waitForTimeout(30000); log(nome, 'riletti', JSON.stringify(await rileggi())); if (tipi) log(nome, 'tipo', JSON.stringify(await scegliTipo(tipi))); await pg.waitForTimeout(attesa || 20000);
    log(nome, 'scelto', JSON.stringify(await G.evaluate(() => { const C = Seleziona.scelto; return C ? { k: C.kind, veh: C.veh, W: +C.W.toFixed(2), H: +C.H.toFixed(2), n: Seleziona.candidati.length, lab: Seleziona._.CR.labTxt } : null; }))); await shot(nome); };
  // il posto buono per ogni quadro: fra i punti della misura, il primo dove (col personaggio assestato dal gioco: le scale, i gradini, i livelli)
  // lo strumento offre una superficie del tipo voluto, grande abbastanza e vicina
  const trova = async (righe, misura, tipi, minA, nome) => { for (const q of righe.slice(0, 14)) {
    const r = await G.evaluate(([q, misura, tipi, minA]) => { const pv = window.__pv, st = pv.st, p = st.player, GG = window.Game || pv.G; p.x = q.px; p.y = q.py; p.face = q.pf; p.vx = p.vy = 0; p.path = []; p.lv = null; p.vehicle = null; p.indoor = null;
      for (let k = 0; k < 6; k++) { try { GG.step(st, 1 / 30, { x: 0, y: 0 }); } catch (e) { } if (st.over) st.over = null; } p.face = q.pf;
      if (q.veh) { const v = st.vehicles.find(x => x.id === q.veh); if (!v || Math.abs(v.speed || 0) > .3) return null; let o = pv.R.__vehicles[v.id]; while (o) { o.visible = true; o = o.parent; } }
      Seleziona._.reset(); for (let k = 0; k < 800; k++) { Seleziona._.coda(p.x, p.y); Seleziona._.lavora(40); if (!Seleziona.misura().inCoda) break; }
      Writing.tavSize(0, misura); Seleziona.cerca(st, misura, 'muro'); const C = Seleziona.candidati.filter(c => tipi.includes(c.kind) && c.W * c.H >= minA && c.d < 3.6 && (!q.veh || c.veh === q.veh)).sort((a, b) => b.W * b.H - a.W * a.H)[0];
      return C ? { px: p.x, py: p.y, pf: q.pf, veh: q.veh || null, k: C.kind, W: +C.W.toFixed(2), H: +C.H.toFixed(2), d: +C.d.toFixed(2) } : null; }, [q, misura, tipi, minA]);
    if (r) { log(nome, 'posto', JSON.stringify(r)); return r; } } log(nome, 'nessun posto buono'); return null; };
  const R1 = MIS.righe.filter(r => r.D === 'si' && (r.Dk === 'facciata' || r.Dk === 'muro') && r.DW >= 3).sort((a, b) => (/rua|vittoria|marina|mezzo/.test(b.id) ? 1 : 0) - (/rua|vittoria|marina|mezzo/.test(a.id) ? 1 : 0));
  const R2 = MIS.righe.filter(r => r.Dk === 'saracinesca').sort((a, b) => (b.DW || 0) - (a.DW || 0));
  const SED = { cinquecento: 3, ritmo: 4, giulia: 4, polizia: 2, furgone: 3, ape: 1 }, R3 = (MIS.mezzi || []).filter(r => r.D === 'si' && !r.mov).sort((a, b) => (SED[b.kind] || 0) - (SED[a.kind] || 0));
  await quadro('1_muro', await trova(R1, 'throw', ['facciata', 'muro'], 2.5, '1_muro'), 'throw', 0, ['facciata', 'muro']);
  await quadro('2_saracinesca', await trova(R2, 'throw', ['saracinesca'], 1, '2_saracinesca'), 'throw', 0, ['saracinesca']);
  const AUTO2 = await trova(R3, 'tag', ['auto'], .4, '3_auto');
  await quadro('3_auto', AUTO2, 'tag', 0, ['auto']);
  // il pezzo finito sull'auto: il bozzetto di Traccia (writer_arte.js, la mano del giocatore) salvato sul fianco scelto (tavSave2: le regole di sempre)
  if (AUTO2) {
    const r = await G.evaluate(() => { const pv = window.__pv, st = pv.st, WR = Writing, H = WR._.TAV.hov; if (!H || !H.ok || !H.A.veh) return { no: 'niente cornice sull\'auto' };
      const Rc = WR._.tavFit2(H.Rc, H.A) || H.Rc, W = WR.S(st), seed = 90210, style = 'throw';
      const imp = WriterArte.conceive({ aka: W.aka || 'KAOS', crew: W.crew, style, dna: WR.playerDna(st), seed }) || {};
      const w = Object.assign({ by: 'player', aka: W.aka || 'KAOS', crew: W.crew, style, tool: 'bomboletta', seed, pal: 3, prog: 1, done: false, surf: 'muro' }, imp, { style, W: Rc.W, H: Rc.H, seed });
      const res = WR._.tavSave2(st, Rc, H.A, { strokes: [], traccia: { w, stage: 9, di: 9 } }); st.player.hand = null; return { res, veh: H.A.veh, W: Rc.W, H: Rc.H }; });
    log('pezzo', JSON.stringify(r));
    for (let k = 0; k < 8; k++) { await pg.waitForTimeout(15000); const s = await G.evaluate(() => { const W = Writing.S(window.__pv.st), w = W.works[W.works.length - 1], g = w && Writing.GFX.works[w.id]; return { flat: g ? !!g.flat : null, vatl: !!(g && g.tgt && g.tgt.vatl), decal: !!(g && g.tgt && g.tgt.decal), drawn: g ? g.drawn : null }; }); log('il pezzo', JSON.stringify(s)); if (s.flat === false && (s.vatl || s.decal)) break; }
    await G.evaluate(() => { const pv = window.__pv, st = pv.st, p = st.player, R = pv.R, W = Writing.S(st), w = W.works[W.works.length - 1], v = st.vehicles.find(x => x.id === w.veh); if (!v) return;
      const sd = w.side || 1, nx = -Math.sin(v.ang) * sd, nz = Math.cos(v.ang) * sd, fx = Math.cos(v.ang), fz = Math.sin(v.ang), GG = window.Game || pv.G;
      for (const [a, b] of [[2.6, 1.6], [2.6, -1.6], [2.2, 2.2], [2.2, -2.2], [1.9, 1.2], [1.9, -1.2]]) { const x = v.x + nx * a + fx * b, y = v.y + nz * a + fz * b; if (GG.walkM(x, y)) { p.x = x; p.y = y; break; } }   // un passo indietro, di lato, sulla terra
      p.vx = p.vy = 0; const tx = w.pos ? w.pos.x : v.x, tz = w.pos ? w.pos.z : v.y, dx = tx - p.x, dz = tz - p.y; p.face = Math.atan2(dz, dx); if (R.camReset) R.camReset(); if (R.__cam7) R.__cam7.yaw0 = Math.atan2(-dx, -dz) - .5; pv.ui.drag = 0; });
    await pg.waitForTimeout(25000); await shot('4_auto_dipinta');
    log('atlante dei mezzi', JSON.stringify(await G.evaluate(() => { const V = Writing._.VATL; return { slot: [...V.slot.keys()], vertici: V.P ? V.P.MG[0].mesh.geometry.attributes.position ? V.P.MG[0].mesh.geometry.attributes.position.count : 0 : 0, visibile: !!(V.P && V.P.MG[0].mesh.visible) }; })));
  }
  await b.close(); srv.close(); log('fine');
});
