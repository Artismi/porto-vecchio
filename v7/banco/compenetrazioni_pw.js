#!/usr/bin/env node
/* Porto Vecchio — banco/compenetrazioni_pw.js: le foto al telefono (Pixel 7) della mattina sul molo e una scansione delle scatole
   (barche, moli e pontili, mezzi, NPC) nel gioco vero. Scrive _immagini/commedia/molo_tel_*.jpg e banco/compenetrazioni.json.
     node banco/compenetrazioni_pw.js [--spento] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium, devices } = PW;
const ROOT = path.resolve(__dirname, '..'), ON = !process.argv.includes('--spento');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary', '.gz': 'application/gzip' };
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; if (u.startsWith('/api/')) { r.writeHead(200); r.end('{"ok":false}'); return; }
  const f = path.join(ROOT, u); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(Object.assign({}, devices['Pixel 7'])), pg = await ctx.newPage();
  pg.on('pageerror', e => log('[errore]', e.message));
  await pg.addInitScript(() => { window.__disegna = false; for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype; for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__disegna) return f.apply(this, arguments); }; } } });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?${ON ? 'commedia&molo' : ''}`, { timeout: 900000 });
  await pg.waitForFunction(() => window.__pv && window.__pv.st, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6 && await pg.evaluate(() => !!window.__pv.ui.intro); k++) { await pg.touchscreen.tap(200, 400).catch(() => { }); await pg.keyboard.press('Enter').catch(() => { }); await pg.waitForTimeout(2500); }
  // fino alle 7:20 del giorno dopo, a passi veri
  for (let g = 0; g < 400; g++) { const t = await pg.evaluate(() => { const pv = window.__pv, st = pv.st; st.deadline = 1e12; for (let i = 0; i < 300 && st.t < 1880; i++) { st.player.hp = 100; st.over = null; pv.G.step(st, .1, { x: 0, y: 0 }); } return st.t; }); if (t >= 1880) break; }
  const P = await pg.evaluate(() => { const pv = window.__pv, st = pv.st, Q = pv.G.PLACES.marina, p = st.player; p.vehicle = null; p.indoor = null; p.x = Q.x; p.y = Q.y + 1.5; if (pv.R.snap) pv.R.snap(st); return [p.x, p.y]; });
  await pg.waitForTimeout(40000);
  // la scansione delle scatole (coordinate del gioco, m)
  const scan = await pg.evaluate(() => {
    const pv = window.__pv, st = pv.st, G = pv.G, VK = G.VK || {}, SEA = (window.World && World.SEA) || {}, out = { npcSuMezzo: [], barcheSuMolo: [], mezziSovrapposti: [], barcheSuBarche: [] };
    const box = (x, y, ang, L, W) => ({ x, y, ang: ang || 0, L, W });
    const dentro = (B, x, y, m) => { const dx = x - B.x, dy = y - B.y, c = Math.cos(B.ang), s = Math.sin(B.ang), a = dx * c + dy * s, b = -dx * s + dy * c; return Math.abs(a) < B.L / 2 + (m || 0) && Math.abs(b) < B.W / 2 + (m || 0); };
    const angoli = B => { const c = Math.cos(B.ang), s = Math.sin(B.ang), P = []; for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 0]]) P.push([B.x + c * u * B.L / 2 - s * v * B.W / 2, B.y + s * u * B.L / 2 + c * v * B.W / 2]); return P; };
    const mezzi = (st.vehicles || []).filter(v => !v.dead).map(v => Object.assign(box(v.x, v.y, v.ang, (VK[v.kind] || {}).len || 4, (VK[v.kind] || {}).wid || 1.8), { id: v.id, kind: v.kind, barca: !!(VK[v.kind] || {}).boat, moored: v.moored }));
    const ormeggi = (SEA.moorings || []).map((m, i) => Object.assign(box(m.x, m.y, m.ang, m.len || 5, (m.len || 5) * .38), { id: 'ormeggio' + i, kind: m.kind, at: m.at, drive: !!m.drive }));
    for (const n of st.npcs) { if (n.dead || n.inside || n.inVeh) continue; for (const B of mezzi.concat(ormeggi)) if (dentro(B, n.x, n.y, .1)) { out.npcSuMezzo.push({ npc: n.id, nome: n.first, x: +n.x.toFixed(1), y: +n.y.toFixed(1), su: B.id + ' ' + B.kind, mente: !!(st.u && st.u.menti && st.u.menti[n.id]), azione: n.action && n.action.name, piano: n.pop && n.pop.emer && n.pop.emer.label }); break; } }
    // le barche e i moli: un vertice della barca dentro il piano di un molo/pontile (la polilinea con la sua larghezza)
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
    for (const B of ormeggi.concat(mezzi.filter(m => m.barca))) for (const S of SEA.structs || []) { if (!S.pts || !S.w) continue; let peggio = 0; for (const [x, y] of angoli(B)) for (let i = 1; i < S.pts.length; i++) { const d = S.w / 2 - segDist(x, y, S.pts[i - 1], S.pts[i]); if (d > peggio) peggio = d; } if (peggio > .25) out.barcheSuMolo.push({ barca: B.id + ' ' + B.kind, ormeggio: B.at || B.moored || null, x: +B.x.toFixed(1), y: +B.y.toFixed(1), struttura: S.id + ' (' + S.type + ')', dentro_m: +peggio.toFixed(2) }); }
    const tutti = mezzi.concat(ormeggi.filter(o => !o.drive));
    for (let i = 0; i < tutti.length; i++) for (let j = i + 1; j < tutti.length; j++) { const A = tutti[i], B = tutti[j]; if (Math.hypot(A.x - B.x, A.y - B.y) > (A.L + B.L) / 2) continue; if (angoli(A).some(([x, y]) => dentro(B, x, y, -.15)) || angoli(B).some(([x, y]) => dentro(A, x, y, -.15))) (A.barca || B.barca || /ormeggio/.test(A.id + B.id) ? out.barcheSuBarche : out.mezziSovrapposti).push({ a: A.id + ' ' + A.kind, b: B.id + ' ' + B.kind, x: +A.x.toFixed(1), y: +A.y.toFixed(1) }); }
    return out;
  });
  fs.writeFileSync(path.join(__dirname, 'compenetrazioni.json'), JSON.stringify(scan, null, 1));
  log('scansione', JSON.stringify({ npcSuMezzo: scan.npcSuMezzo.length, barcheSuMolo: scan.barcheSuMolo.length, mezziSovrapposti: scan.mezziSovrapposti.length, barcheSuBarche: scan.barcheSuBarche.length }));
  const foto = async (nome, prima) => { if (prima) await pg.evaluate(prima); await pg.waitForTimeout(800); await pg.evaluate(() => { window.__disegna = true; }); await pg.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)))); await pg.screenshot({ path: path.join(ROOT, '_immagini', 'commedia', `molo_tel_${nome}${ON ? '' : '_spento'}.jpg`), type: 'jpeg', quality: 82, timeout: 300000 }); await pg.evaluate(() => { window.__disegna = false; }); log('foto', nome); };
  await foto('gioco');
  if (ON) await foto('menu_citta', () => { if (window.Segni && Segni.apriScheda) Segni.apriScheda('u_gazzetta'); });
  await b.close(); srv.close(); process.exit(0);
});
