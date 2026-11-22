// [graffiti] LA PROVA DEI PIANI COTTI: il gioco a tasselli (v7/tasselli, la cottura di build.py --tasselli) col profilo del telefono (Pixel 7,
// tocco), come l'APK. Su un campione dei punti della misura (strumenti/seleziona_misura.js, la città costruita nella pagina) e dei mezzi fermi:
// il personaggio lì, si aspetta che i tasselli attorno siano in scena, poi
//   - l'entrata nella zona: i piani dei tasselli vicini decodificati a fette di 0,4 ms (come nel gioco sul telefono): quante fette, la più
//     lunga, il totale; e i triangoli letti a fette (solo le mesh fuori dai tasselli);
//   - la scelta: il tempo di cerca(), e se trova la stessa superficie (muro, saracinesca, mezzo) della misura senza tasselli;
//   - il fotogramma peggiore dello strumento (Seleziona._.TAS.tickMax: lettura, decodifica e scelta nel giro di writing.js).
//   node strumenti/seleziona_tasselli.js <misura_dopo.json> [uscita.json] [--n=24]
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium, devices } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');
const ARG = {}, POS = []; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)=(.*)$/.exec(a); if (m) ARG[m[1]] = m[2]; else POS.push(a); }
const root = process.env.V7DIR || path.resolve(__dirname, '..'), MIS = JSON.parse(fs.readFileSync(POS[0], 'utf8')), OUT = POS[1] || null, N = +(ARG.n || 24);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2' };
// il campione: punti consecutivi di tre percorsi (i tasselli si riusano), metà dove la misura trovava una saracinesca o un muro pieno
const sup = MIS.righe.filter(r => r.k !== 'aperto' && r.px != null);
const per = id => sup.filter(r => r.id === id);
const camp = [].concat(per('rua').slice(0, Math.ceil(N / 3)), per('mezzo').slice(0, Math.ceil(N / 3)), per('stazione').concat(per('marina')).slice(0, Math.ceil(N / 3))).slice(0, N);
const mez = (MIS.mezzi || []).filter(r => !r.mov && r.D === 'si').slice(0, 8);
const t0 = Date.now(), sec = () => ((Date.now() - t0) / 1000).toFixed(0) + ' s';
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { res.writeHead(200); res.end('{}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let codice = 0;
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: devices['Pixel 7'].userAgent });
    const pg = await ctx.newPage(); pg.on('pageerror', e => console.log('[errore]', e.message.slice(0, 200)));
    await pg.goto(`http://localhost:${srv.address().port}/index.html`, { timeout: 0, waitUntil: 'commit' });
    await pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.Tasselli && Tasselli.deciso, null, { timeout: 1500000, polling: 1000 });
    const T = await pg.evaluate(() => ({ attivo: Tasselli.attivo(), motivo: (window.__tasselli || {}).motivo, piani: Tasselli.piani ? Tasselli.piani.byteLength : Tasselli.piani, phone: !!window.__pv.R.phone }));
    console.log('pronto in', sec(), JSON.stringify(T)); if (!T.attivo) throw new Error('i tasselli non sono attivi: ' + T.motivo);
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(3000);
    await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; const inv = Oggetti.inv(st); inv.bomboletta = 9; st.player.hand = 'bomboletta'; Writing.setMode(st, 'tavoletta');
      setInterval(() => { const u = pv.ui; u.dialog = null; u.book = false; u.menu = false; st.over = null; st.chase = false; st.player.hp = 100; }, 300); });
    await pg.waitForFunction(() => Seleziona._.tasOk() !== null, null, { timeout: 600000, polling: 1000 });
    console.log('piani cotti:', await pg.evaluate(() => Seleziona._.tasOk()));
    const righe = [];
    const prova = async (q, mezzo) => {
      await pg.evaluate(q => { const pv = window.__pv, st = pv.st, p = st.player; p.x = q.px; p.y = q.py; p.face = q.pf; p.vx = p.vy = 0; p.path = []; p.lv = null; p.vehicle = null; p.indoor = null; }, q);
      // i tasselli attorno in scena (il gioco li scarica e li monta a fotogrammi)
      const att = await pg.waitForFunction(() => { const p = window.__pv.st.player, c = 48; for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) { const i = Math.floor((p.x + dx) / c), j = Math.floor((p.y + dz) / c); if (Seleziona._.TAS.tab.has((i + 32768) * 65536 + (j + 32768)) && !Tasselli.inScena(i, j)) return false; } return true; }, null, { timeout: 120000, polling: 1500 }).then(() => true, () => false);
      const r = await pg.evaluate(([q, mezzo]) => { const pv = window.__pv, st = pv.st, p = st.player, SE = Seleziona, TAS = SE._.TAS;
        p.x = q.px; p.y = q.py; p.face = q.pf; if (mezzo) { let o = pv.R.__vehicles[q.veh]; while (o) { o.visible = true; o = o.parent; } }
        // l'entrata nella zona: le fette di 0,4 ms dei piani cotti (come carica nel gioco), la lettura a fette delle mesh piccole fuori dai tasselli
        const n0 = TAS.n, tri0 = SE.misura().triangoli; let fette = 0, mx = 0, tot = 0;
        for (let k = 0; k < 4000; k++) { const t = performance.now(); SE._.carica(p.x, p.y, .4); const d = performance.now() - t; if (!TAS.it && d < .05) break; fette++; tot += d; if (d > mx) mx = d; }
        let lf = 0, lmx = 0; for (let k = 0; k < 2000; k++) { SE._.coda(p.x, p.y); const t = performance.now(); SE._.lavora(.3); const d = performance.now() - t; if (!SE.misura().inCoda || d < .01) break; lf++; if (d > lmx) lmx = d; }
        const tq = []; let L = null; for (let k = 0; k < 5; k++) { const t = performance.now(); SE.cerca(st, mezzo ? 'tag' : 'throw', 'muro'); tq.push(performance.now() - t); } L = SE.candidati; tq.sort((a, b) => a - b);
        const n0x = q.px, on = C => mezzo ? C.veh === q.veh : !C.flat && Math.abs(C.nx * Math.cos(q.pf + Math.PI) + C.nz * Math.sin(q.pf + Math.PI)) > .9 && Math.hypot(C.cx - (q.px + Math.cos(q.pf) * 1.1), C.cz - (q.py + Math.sin(q.pf) * 1.1)) < 3.6;
        const C = L.find(on);
        return { piani: TAS.n - n0, fette, fettaMax: +mx.toFixed(3), decod: +tot.toFixed(2), letture: lf, letturaMax: +lmx.toFixed(3), triangoli: SE.misura().triangoli - tri0, cerca: +tq[2].toFixed(3), n: L.length, D: C ? (C.giu || C.W < C.W0 - .05 ? 'piccolo' : 'si') : L.length ? 'altrove' : 'niente', Dk: C ? C.kind : null, primo: !!C && L[0] === C, tickMax: +TAS.tickMax.toFixed(2) }; }, [q, mezzo]);
      r.attesa = att; r.prima = q.D; r.primaK = q.Dk || (mezzo ? 'auto' : null); r.id = q.id || q.veh; righe.push(Object.assign({ mezzo: !!mezzo }, r)); console.log(sec(), mezzo ? 'mezzo' : 'muro', JSON.stringify(r));
    };
    for (const q of camp) await prova(q, false);
    for (const q of mez) await prova(q, true);
    // il riassunto
    const W = righe.filter(r => !r.mezzo), Mz = righe.filter(r => r.mezzo), ok = r => r.D === 'si' || r.D === 'piccolo', q = (L, f) => { const s = L.slice().sort((a, b) => a - b); return s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(3) : null; };
    const R = { punti: W.length, trova: W.filter(ok).length, trovaPrima: W.filter(r => r.prima === 'si' || r.prima === 'piccolo').length, uguali: W.filter(r => ok(r) === (r.prima === 'si' || r.prima === 'piccolo')).length,
      saracinesche: { prima: W.filter(r => r.primaK === 'saracinesca').length, ora: W.filter(r => r.primaK === 'saracinesca' && r.Dk === 'saracinesca').length },
      mezzi: { n: Mz.length, trovati: Mz.filter(ok).length }, cerca: { mediana: q(righe.map(r => r.cerca), .5), p95: q(righe.map(r => r.cerca), .95) },
      entrata: { fettaMax: Math.max(...righe.map(r => r.fettaMax)), fetteMediana: q(righe.map(r => r.fette), .5), fetteMax: Math.max(...righe.map(r => r.fette)), decodMax: Math.max(...righe.map(r => r.decod)), letturaMax: Math.max(...righe.map(r => r.letturaMax)), triangoliMax: Math.max(...righe.map(r => r.triangoli)) },
      fotogrammaMax: Math.max(...righe.map(r => r.tickMax)), sel: await pg.evaluate(() => Seleziona.misura()) };
    console.log(JSON.stringify(R, null, 1)); if (OUT) fs.writeFileSync(OUT, JSON.stringify({ R, righe }));
  } catch (e) { console.error(e); codice = 1; }
  console.log('fine in', sec()); await b.close(); srv.close(); process.exit(codice);
});
