// Sonda della mappa: carica il gioco vero in Chromium senza testa e cerca gli oggetti di scena messi male.
//   node strumenti/sonda_mappa.js [uscita.json]        (da v7/, serve playwright: /opt/node22/lib/node_modules/playwright o PW=…)
// Controlla ogni oggetto registrato da render.js (DZ.props e DZ.big): dentro un edificio, sulla carreggiata, in acqua,
// sospeso (sotto lo spigolo più basso c'è vuoto, e non poggia su un'altra cosa) o sepolto (il piede è sotto anche lo
// spigolo più basso del terreno), sovrapposto a un altro (se non sta sopra di lui). Per ognuno dice quale funzione l'ha piazzato
// (file:riga del sorgente in src/), così si corregge alla fonte. Costruisce da sé una copia di index.html (_sonda.html)
// con la stessa sostituzione di build.py e la cancella alla fine.
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..'), outFile = process.argv[2] || path.join(root, 'sonda_mappa.json');

// la pagina, come build.py, ricordando dove comincia ogni modulo
let html = fs.readFileSync(path.join(root, 'src/index.src.html'), 'utf8'); const spans = [];
const WHO = "who: (new Error().stack.split('\\n').slice(2, 5).map(l => (l.match(/at (?:(\\S+) \\()?.*?:(\\d+):\\d+/) || []).slice(1).join('@')).join(' < ')), ";
let outHtml = '', last = 0; const re = /\/\*([a-z_.]+\.js)\*\//g; let m;
while ((m = re.exec(html))) {
  outHtml += html.slice(last, m.index); last = m.index + m[0].length;
  if (m[1] === 'studio.js') continue;
  let src = fs.readFileSync(path.join(root, 'src', m[1]), 'utf8');
  if (m[1] === 'render.js') {
    const a = 'const rec = { tag, obj: o, c, c0: c.clone(),', b = 'DZ.big.push({ c, he: sz.clone().multiplyScalar(.5), base: bb.min.y, tag });';
    if (!src.includes(a) || !src.includes(b)) throw new Error('render.js è cambiato: aggiorna i punti di aggancio della sonda (regProp)');
    src = src.replace(a, 'const rec = { ' + WHO + 'tag, obj: o, c, c0: c.clone(),').replace(b, 'DZ.big.push({ ' + WHO + 'c, he: sz.clone().multiplyScalar(.5), base: bb.min.y, tag });');
  }
  const l0 = outHtml.split('\n').length; outHtml += src; spans.push([l0, outHtml.split('\n').length, m[1]]);
}
outHtml += html.slice(last);
const tmp = path.join(root, '_sonda.html'); fs.writeFileSync(tmp, outHtml);
const where = w => String(w || '?').replace(/(\S*?)@(\d+)/g, (_, fn, ln) => { const s = spans.find(q => +ln >= q[0] && +ln < q[1]); return (fn ? fn + ' ' : '') + (s ? s[2] + ':' + (+ln - s[0] + 1) : 'riga ' + ln); });

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
const srv = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]); if (u.startsWith('/api/')) { res.writeHead(200); res.end('{"ok":false}'); return; } const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const t0 = Date.now(); let b;
  try {
    b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message + ' | ' + where(String(e.stack || '').split('\n').slice(1, 4).map(l => (l.match(/at (?:(\S+) \()?.*?:(\d+):\d+/) || []).slice(1).join('@')).join(' < ')))); pg.on('console', q => { if (q.type() === 'error') errs.push(q.text().slice(0, 200)); });
    await pg.goto(`http://localhost:${srv.address().port}/_sonda.html`);
    await pg.waitForFunction(() => window.__pv && window.__pv.R && window.__pv.R.__dz && window.__pv.R.__dz.props.length > 0, null, { timeout: 400000 });
    const tLoad = Date.now() - t0; await pg.waitForTimeout(5000);
    const r = await pg.evaluate(() => {
      const { G, R, st } = window.__pv, DZ = R.__dz, TS = G.TS, T = G.T, B = G.BUILDINGS;
      const out = { dentro_edificio: [], su_strada: [], in_acqua: [], sospesi: [], affondati: [], sovrapposti: [] };
      const bAt = new Map(); B.forEach((b, i) => { for (let x = b.x; x < b.x + b.w; x++) for (let y = b.y; y < b.y + b.h; y++) bAt.set(x + ',' + y, b.id || b.name || 'b' + i); });
      const all = DZ.props.map(p => ({ c: p.c0 || p.c, he: p.he, base: p.base, who: p.who, big: false })).concat(DZ.big.map(p => ({ c: p.c, he: p.he, base: p.base, who: p.who, big: true })));
      const row = (p, extra) => Object.assign({ chi: p.who, x: +p.c.x.toFixed(1), y: +p.c.z.toFixed(1), misura: [2 * p.he.x, 2 * p.he.y, 2 * p.he.z].map(v => +v.toFixed(1)), grande: p.big }, extra || {});
      all.forEach(p => {
        const t = G.tileAt(Math.floor(p.c.x / TS), Math.floor(p.c.z / TS));
        for (const [fx, fz] of [[0, 0], [-.7, -.7], [.7, .7], [-.7, .7], [.7, -.7]]) { const k = Math.floor((p.c.x + fx * p.he.x) / TS) + ',' + Math.floor((p.c.z + fz * p.he.z) / TS); if (bAt.has(k)) { out.dentro_edificio.push(row(p, { edificio: bAt.get(k) })); break; } }
        if (t === T.VIA) out.su_strada.push(row(p));
        if (T.WATER !== undefined && t === T.WATER) out.in_acqua.push(row(p));
        const hmin = Math.min(...[[0, 0], [-.8, -.8], [.8, .8], [-.8, .8], [.8, -.8]].map(([u, w]) => R.groundH(p.c.x + u * p.he.x, p.c.z + w * p.he.z))), d = p.base - hmin, held = d > .35 && all.some(q => q !== p && q.base + 2 * q.he.y > p.base - .15 && q.base < p.base && Math.abs(q.c.x - p.c.x) < q.he.x + p.he.x * .5 && Math.abs(q.c.z - p.c.z) < q.he.z + p.he.z * .5); if (d > .35 && !held) out.sospesi.push(row(p, { scarto: +d.toFixed(2) })); if (d < -.5) out.affondati.push(row(p, { scarto: +d.toFixed(2) }));   /* sotto anche lo spigolo più basso: sepolto */
      });
      const grid = new Map(); all.forEach((p, i) => { const k = Math.floor(p.c.x / 4) + ',' + Math.floor(p.c.z / 4); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
      all.forEach((a, i) => { const gx = Math.floor(a.c.x / 4), gz = Math.floor(a.c.z / 4); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) (grid.get((gx + dx) + ',' + (gz + dz)) || []).forEach(j => { if (j <= i) return; const b = all[j]; const ix = Math.min(a.c.x + a.he.x, b.c.x + b.he.x) - Math.max(a.c.x - a.he.x, b.c.x - b.he.x), iz = Math.min(a.c.z + a.he.z, b.c.z + b.he.z) - Math.max(a.c.z - a.he.z, b.c.z - b.he.z); if (ix <= 0 || iz <= 0) return; if (a.base >= b.base + 2 * b.he.y - .08 || b.base >= a.base + 2 * a.he.y - .08) return; /* una sopra l altra: impilate, non compenetrate */ const f = ix * iz / Math.max(.01, Math.min(4 * a.he.x * a.he.z, 4 * b.he.x * b.he.z)); if (f > .35) out.sovrapposti.push(row(a, { con: b.who, quota: +f.toFixed(2) })); }); });
      let info = { oggetti: DZ.props.length, grandi: DZ.big.length, persone: st.npcs.length, mezzi: (st.vehicles || []).length };
      try { info.heapMB = Math.round(performance.memory.usedJSHeapSize / 1e6); } catch (e) { }
      { const by = {}; st.npcs.forEach(n => { const k = n.pop ? (n.pop.cast ? 'cast:' + String(n.id).replace(/[0-9_]+$/, '') : 'popolo') : n.cop ? 'polizia' : n.military ? 'militari' : String(n.id).replace(/[0-9_]+$/, '').replace(/[0-9]+/g, '#'); by[k] = (by[k] || 0) + 1; }); info.persone_per_tipo = by; }
      return { info, out };
    });
    Object.values(r.out).forEach(L => L.forEach(q => { q.chi = where(q.chi); if (q.con) q.con = where(q.con); }));
    const rep = { quando: new Date().toISOString(), caricamento_ms: tLoad, info: r.info, conteggi: {}, per_fonte: {}, errori: errs.slice(0, 30), elenco: r.out };
    for (const [k, L] of Object.entries(r.out)) { rep.conteggi[k] = L.length; const by = {}; L.forEach(q => { const f = q.chi.split(' < ').slice(1).join(' < ') + (q.con ? '   +   ' + q.con.split(' < ').slice(1).join(' < ') : ''); by[f] = (by[f] || 0) + 1; }); rep.per_fonte[k] = Object.entries(by).sort((a, c) => c[1] - a[1]).slice(0, 12); }
    fs.writeFileSync(outFile, JSON.stringify(rep, null, 1));
    console.log('caricamento', tLoad, 'ms', JSON.stringify(r.info)); console.log(JSON.stringify(rep.conteggi));
    for (const [k, L] of Object.entries(rep.per_fonte)) { console.log('\n' + k); L.forEach(([f, n]) => console.log('  ' + n + '×  ' + f)); }
    console.log('\nelenco completo in', outFile);
  } finally { if (b) await b.close(); srv.close(); try { fs.unlinkSync(tmp); } catch (e) { } }
});
