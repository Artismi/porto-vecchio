// [personaggi] LA SONDA DEI CAPPELLI: ogni cappello del guardaroba su ogni testa del kit e su ogni capigliatura, nello studio delle pose
// (studio_anim.html, Chromium senza testa). Per ogni combinazione misura, nello spazio della figura a riposo:
//   buca  — quanti vertici di pelle o capelli escono dalla superficie del cappello (a pari quota e angolo attorno alla testa) e di quanto al massimo (mm);
//   largo — di quanto il bordo basso del cappello sta più in fuori della testa sotto (mm, media attorno): oltre ~20 mm il cappello è grande o galleggia.
//   node strumenti/sonda_cappelli.js [uscita.json]   CAPPELLI=coppola,basco  CAPELLI=corti,lunghi
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(__dirname, '..');
global.World = require(root + '/src/world.js'); global.Interior = require(root + '/src/interiors.js'); global.Game = require(root + '/src/game.js');
global.Guardaroba = require(root + '/src/guardaroba.js'); const P = require(root + '/src/personaggi.js');
const CAPO = Guardaroba.CAPO, cappelli = (process.env.CAPPELLI ? process.env.CAPPELLI.split(',') : Object.keys(CAPO).filter(k => CAPO[k].zona === 'testa' && !/^(occhiali|passamontagna|maschera|cappuccio_stelle)/.test(k)));
const capelli = (process.env.CAPELLI || 'corti,ricci,riga,indietro,lunghi,caschetto,coda,raccolti,calvo').split(','), facce = ['Casual', 'Formal', 'Casual_2', 'Casual_Hoodie', 'Worker'];
const casi = [];
cappelli.forEach(h => capelli.forEach((c, j) => { const k = facce[(j + cappelli.indexOf(h)) % facce.length], f = /^(Casual|Formal)$/.test(k);
  const D = { seme: h + c, sesso: f ? 'f' : 'm', eta: 28, pelle: '#d8a888', testa: { kit: k }, capelli: { tipo: c, col: '#2a1a12' }, corpo: { robusto: 1 } };
  P.daGuardaroba([{ id: 'maglietta' }, { id: h }], D); casi.push({ h, c, k, D }); }));
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json' };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); }).listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }), pg = await b.newPage();
  pg.on('pageerror', e => console.log('[errore]', e.message));
  await pg.goto(`http://localhost:${srv.address().port}/studio_anim.html${process.env.Q || ''}`); await pg.waitForFunction(() => window.studioReady, null, { timeout: 120000 });
  const out = await pg.evaluate(casi => { Personaggi.set('stile', 'k'); return casi.map(cs => {
    window.__capDbg = { r: [] }; try { Personaggi.figura(cs.D, null); } catch (e) { return Object.assign(cs, { D: null, err: e.message }); }
    const G = window.__capDbg; if (!G.P) return Object.assign(cs, { D: null, err: 'nessun cappello' });
    const pts = k => { const L = []; G.r.filter(r => r[0] === k).forEach(([, a, z]) => { for (let i = a; i < z; i++) L.push([G.P[i * 3], G.P[i * 3 + 1], G.P[i * 3 + 2]]); }); return L; };
    const hat = pts('cappello'), head = pts('pelle').concat(pts('capelli')); if (!hat.length) return Object.assign(cs, { D: null, err: 'vuoto' });
    const NT = 24, DY = .01, y0 = Math.min(...hat.map(p => p[1])), y1 = Math.max(...hat.map(p => p[1])), cx = G.base[0];
    const hz = head.filter(p => p[1] > y0 && p[1] < y0 + .05).map(p => p[2]), cz = hz.length ? (Math.min(...hz) + Math.max(...hz)) / 2 : hat.reduce((s, p) => s + p[2], 0) / hat.length;   // il centro della testa, non del cappello (code e nodi lo spostavano)
    const bin = p => { const a = Math.atan2(p[0] - cx, p[2] - cz); return [Math.floor((p[1] - y0) / DY), Math.floor((a + Math.PI) / (2 * Math.PI) * NT) % NT]; }, rad = p => Math.hypot(p[0] - cx, p[2] - cz);
    const R = {}; hat.forEach(p => { const [i, j] = bin(p), k = i + ':' + j; R[k] = Math.max(R[k] || 0, rad(p)); });
    let buca = 0, max = 0; head.forEach(p => { if (p[1] < y0 + .004 || p[1] > y1) return; const [i, j] = bin(p), r = R[i + ':' + j]; if (r === undefined || r < .05) return;   /* le code, i nodi, i bottoni: non coprono */ const ex = rad(p) - r; if (ex > .003) { buca++; max = Math.max(max, ex); } });
    const gl = []; for (let j = 0; j < NT; j++) { const aa = (j + .5) / NT * 2 * Math.PI - Math.PI; if (Math.abs(aa) < Math.PI / 2) continue; const rh = Math.max(R['0:' + j] || 0, R['1:' + j] || 0); if (!rh) continue;   /* dietro: davanti c'è la visiera */ let rH = 0; head.forEach(p => { if (Math.abs(p[1] - (y0 + DY / 2)) > DY) return; const [, jj] = bin(p); if (jj === j) rH = Math.max(rH, rad(p)); }); if (rH > 0) gl.push(rh - rH); } gl.sort((p, q) => p - q);
    return { h: cs.h, c: cs.c, k: cs.k, buca, max: Math.round(max * 1000), largo: gl.length ? Math.round(gl[gl.length >> 1] * 1000) : null };
  }); }, casi);
  const ok = out.filter(o => !o.err), cattivi = ok.filter(o => o.buca > 3 || (o.largo !== null && o.largo > 20)).sort((a, b) => (b.max + Math.max(0, (b.largo || 0) - 20)) - (a.max + Math.max(0, (a.largo || 0) - 20)));
  const per = {}; ok.forEach(o => { const q = per[o.h] = per[o.h] || { n: 0, buchi: 0, maxBuca: 0, largo: [] }; q.n++; if (o.buca > 3) q.buchi++; q.maxBuca = Math.max(q.maxBuca, o.max); if (o.largo !== null) q.largo.push(o.largo); });
  Object.entries(per).forEach(([h, q]) => console.log(h.padEnd(24), 'bucati', String(q.buchi).padStart(2) + '/' + q.n, 'max', String(q.maxBuca).padStart(3) + 'mm', 'largo', q.largo.length ? Math.min(...q.largo) + '…' + Math.max(...q.largo) + 'mm' : '-'));
  console.log('\ncombinazioni da guardare:', cattivi.length, '/', ok.length); cattivi.slice(0, 25).forEach(o => console.log(' ', o.h, o.c, o.k, 'buca', o.buca, o.max + 'mm', 'largo', o.largo + 'mm'));
  out.filter(o => o.err).forEach(o => console.log('  [salto]', o.h, o.c, o.err));
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out.map(o => Object.assign({}, o, { D: undefined })), null, 1));
  await b.close(); srv.close();
});
