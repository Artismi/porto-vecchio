#!/usr/bin/env node
/* Porto Vecchio — banco/corpi_pw.js: le foto della REGIA DEI CORPI (src/unico_corpi.js, dietro ?commedia), prima e dopo.
   Lo stesso banco di banco/presidio_pw.js (server http locale, Chromium con SwiftShader, 1280×720 a deviceScaleFactor 2, la camera del
   gioco non si tocca: si mette Nino). Si sceglie un posto della città (posti.js) e lo si riempie come fa popolo.js (n.__posto, arrivati),
   poi la foto; con --prima la stessa scena con &corpi=0 (il modulo spento):
     node banco/corpi_pw.js            _immagini/commedia/corpi_1.jpg  la chiacchiera in strada (sagrato, angolo, lotto vuoto) e la fila
                                       _immagini/commedia/corpi_2.jpg  il lavoro al porto (la calata, il carico)
     node banco/corpi_pw.js --prima    corpi_1_prima.jpg, corpi_2_prima.jpg
   Opzioni: --solo 1|2  --seme N */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; } } }
const ROOT = path.resolve(__dirname, '..'), FOTOD = path.join(ROOT, '_immagini', 'commedia'), SEME = +(opt.seme || 3);
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0)} s]`, ...a);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
function server() {
  return new Promise(ok => {
    const s = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
      if (u.startsWith('/api/')) { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":false}'); return; }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
    });
    s.listen(0, '127.0.0.1', () => ok(s));
  });
}
function initPage(o) {
  let a = o.seme >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__disegna = false;
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__disegna) return f.apply(this, arguments); }; } }
}
// le scene: i tipi di posto (in ordine di preferenza) e quanti per tipo; l'ora
const SCENE = { 1: { tipi: [['sagrato', 4], ['lotto_vuoto', 4], ['angolo', 4], ['cypher', 5], ['dehors', 4]], vicini: [['fila', 5], ['pensilina', 4], ['fermata', 3], ['edicola', 2], ['portone', 2]], ora: 10.2 },
  2: { tipi: [['calata', 3], ['carico', 4], ['banco_pesce', 4]], vicini: [['carico', 4], ['retrobottega', 3], ['calata', 3], ['banco_pesce', 3]], ora: 9.4 } };

async function foto(browser, port, n) {
  const sc = SCENE[n], ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }), page = await ctx.newPage(), errori = [];
  page.on('pageerror', e => { errori.push(e.message); log('[errore pagina]', e.message); });
  await page.addInitScript(initPage, { seme: SEME });
  const url = `http://127.0.0.1:${port}/index.html?commedia${opt.prima ? '&corpi=0' : ''}`; log('apro', url);
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.Unico && Unico.passo && window.Posti && window.Popolo, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); await page.waitForTimeout(2500); }
  // il posto: il primo tipo che c'è (a colori, lontano dal regime), con un altro posto del secondo elenco entro 14 m se c'è; la scena riempita
  const r = await page.evaluate(([sc, seme]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, p = st.player, PO = window.Posti, PL = G.PLACES || {}; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; st.over = null; st.chase = false; p.hp = 100; }; setInterval(window.__guardia, 50);
    st.t = Math.floor(st.t / 1440) * 1440 + sc.ora * 60;
    const REG = ['commissariato', 'caserma_p', 'rocca', 'varco', 'muro', 'cultura', 'governo', 'ministero', 'piazza_gov', 'archivio'].filter(k => PL[k]), grigio = (x, y) => REG.some(k => Math.hypot(PL[k].x - x, PL[k].y - y) < 40);
    const tutti = PO.near(p.x, p.y, 1e5).filter(q => !q.tetto && !grigio(q.x, q.y)); let q0 = null, cap0 = 0;
    for (const [k, c] of sc.tipi) { const L = tutti.filter(q => q.k === k).sort((a, b) => (Math.sin(a.x * 12.9 + a.y * 78.2 + seme) % 1) - (Math.sin(b.x * 12.9 + b.y * 78.2 + seme) % 1)); if (L.length) { q0 = L[0]; cap0 = Math.min(c, q0.cap || c); break; } }
    if (!q0) return { no: 'nessun posto' };
    const q1 = tutti.filter(q => q !== q0 && Math.hypot(q.x - q0.x, q.y - q0.y) < 14 && Math.hypot(q.x - q0.x, q.y - q0.y) > 3.5 && sc.vicini.some(v => v[0] === q.k)).sort((a, b) => Math.hypot(a.x - q0.x, a.y - q0.y) - Math.hypot(b.x - q0.x, b.y - q0.y))[0] || null;
    p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = q0.x - 6; p.y = q0.y + 4; p.vx = p.vy = 0;
    for (let i = 0; i < 30; i++) G.step(st, .05, { x: 0, y: 0 });
    window.__step0 = G.step; window.__ferma = true; G.step = function (a, b, c) { if (window.__ferma) return; return window.__step0(a, b, c); };
    const usati = new Set(), riempi = (q, cap) => {
      if (!q) return []; const D = PO.TIPI[q.k] || {}, S = PO.slots(q, cap), out = [];
      const cand = st.npcs.filter(n => n.pop && !n.cop && !n.military && !n.dead && !n.faction && !usati.has(n.id) && (n.pop.age || 30) >= 16 && !n.rotelle).sort((a, b) => Math.hypot(a.x - q.x, a.y - q.y) - Math.hypot(b.x - q.x, b.y - q.y));
      S.forEach((s0, i) => { const n = cand[i]; if (!n) return; usati.add(n.id); n.inside = false; n.room = null; n.inVeh = false; n.x = s0.x; n.y = s0.y; n.face = s0.face; n.vx = n.vy = 0; n.path = []; n.speedNow = 0; n.pop.near = true; n.pop.lod = 'vicino'; n.pop.emer = null; n.pop.goalSet = true; n.wait = 1e6;
        const pose = D.pose || null; n.__posto = { id: q.id, p: q, slot: s0, sed: null, until: st.t + 600, pose: s0.banco ? 'merce' : pose, hand: null, hand0: n.hand || null, arrived: true, comparsa: false, tetto: false, t0: st.clock }; n.action = { name: 'routine', scores: [], why: 'per la foto', since: st.clock }; out.push(n.id); });
      return out;
    };
    const A = riempi(q0, cap0), B = riempi(q1, q1 ? Math.min(q1.cap || 3, (sc.vicini.find(v => v[0] === q1.k) || [0, 3])[1]) : 0);
    window.__metti = () => { for (const n of st.npcs) { const P = n.__posto; if (!P || !usati.has(n.id)) continue; n.x = P.slot.x; n.y = P.slot.y; n.vx = n.vy = 0; n.path = []; n.speedNow = 0; n.inside = false; } };
    const cx = q1 ? (q0.x * 2 + q1.x) / 3 : q0.x, cy = q1 ? (q0.y * 2 + q1.y) / 3 : q0.y;
    return { q0: { k: q0.k, x: q0.x, y: q0.y, id: q0.id }, q1: q1 && { k: q1.k, x: q1.x, y: q1.y }, A, B, cx, cy };
  }, [sc, SEME]);
  log('scena', JSON.stringify(r).slice(0, 500)); if (r.no) { await ctx.close(); return { n, errore: r.no }; }
  // Nino davanti alla scena nel verso della camera (come in presidio_pw.js), poi centrare
  const mettiti = (k, lat) => page.evaluate(([tx, ty, k, lat]) => {
    const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, cam = pv.R.getCamera(), d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, fx = d.x / L, fy = d.z / L;
    const libero = (x, y) => (!G.walkM || G.walkM(x, y)) && !st.npcs.some(n => !n.inside && Math.hypot(n.x - x, n.y - y) < 1.2) && [4, 7, 10].every(dd => !(window.Ingombri && Ingombri.casa(G, { cx: x - fx * dd, cz: y - fy * dd, a: 0, hu: 1.2, hv: 1.2 }, 0)));
    let bx = tx - fx * k + fy * lat, by = ty - fy * k - fx * lat;
    trova: for (const dk of [0, -1.5, 1.5, -3, 3]) for (const dl of [0, 2, -2, 4, -4]) { const x = tx - fx * (k + dk) + fy * (lat + dl), y = ty - fy * (k + dk) - fx * (lat + dl); if (libero(x, y)) { bx = x; by = y; break trova; } }
    p.x = bx; p.y = by; p.vx = p.vy = 0; p.face = Math.atan2(ty - p.y, tx - p.x); if (pv.R.snap) pv.R.snap(st); window.__metti(); return [fx, fy];
  }, [r.cx, r.cy, k, lat]);
  let c0 = null; for (let k = 0; k < 4; k++) { const c = await mettiti(6, 0); await page.waitForTimeout(2200); if (c0 && Math.abs(c[0] - c0[0]) < .03 && Math.abs(c[1] - c0[1]) < .03) break; c0 = c; }
  for (let it = 0; it < 4; it++) {
    const e = await page.evaluate(([b]) => {
      const pv = window.__pv, st = pv.st, p = st.player, cam = pv.R.getCamera(), z = (pv.R.groundH ? pv.R.groundH(b.x, b.y) : 0) + 1;
      const pr = (x, y) => { const v = new THREE.Vector3(x, z, y).project(cam); return [(v.x + 1) * 640, (1 - v.y) * 360]; };
      const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, F = [d.x / L, d.z / L], R = [-F[1], F[0]];
      const c = pr(b.x, b.y), cr = pr(b.x + R[0], b.y + R[1]), cf = pr(b.x + F[0], b.y + F[1]), du = c[0] - 640, dv = c[1] - 250;   // la scena sopra Nino (la camera tiene lui al centro)
      if (Math.abs(du) < 25 && Math.abs(dv) < 25) return { ok: 1 };
      const mx = Math.max(-5, Math.min(5, du / ((cr[0] - c[0]) || 1))), my = Math.max(-5, Math.min(5, dv / ((cf[1] - c[1]) || -1)));
      p.x += R[0] * mx + F[0] * my; p.y += R[1] * mx + F[1] * my;
      // Nino mai in mezzo alla gente della scena: di lato finché è libero
      const G = pv.G, vuoto = (x, y) => !st.npcs.some(n => !n.inside && Math.hypot(n.x - x, n.y - y) < 1.4) && (!G.walkM || G.walkM(x, y));
      if (!vuoto(p.x, p.y)) for (const d of [1.5, -1.5, 3, -3, 4.5, -4.5]) if (vuoto(p.x + R[0] * d, p.y + R[1] * d)) { p.x += R[0] * d; p.y += R[1] * d; break; }
      if (pv.R.snap) pv.R.snap(st); window.__metti(); return { ok: 0, m: [mx, my] };
    }, [{ x: r.cx, y: r.cy }]);
    if (e.ok || it === 3) break; await page.waitForTimeout(2200);
  }
  // un po' di vita (le pose si accendono), il mondo fermo, la foto
  await page.evaluate(() => { const st = window.__pv.st; for (let i = 0; i < 40; i++) { window.__guardia(); st.clock += .05; } window.__metti(); });
  const f = path.join(FOTOD, `corpi_${n}${opt.prima ? '_prima' : ''}.jpg`);
  await page.evaluate(() => { window.__disegna = true; });
  for (let k = 0; k < 6; k++) await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 900000 });
  const pose = await page.evaluate(() => { const st = window.__pv.st; return st.npcs.filter(n => n.__posto && n.__posto.arrived && Math.hypot(n.x - st.player.x, n.y - st.player.y) < 20).map(n => { const s = Anim.npcState(st, n); return n.__posto.p.k + ':' + (s.act || '-') + '/' + (s.upper || '-') + (s.talk ? '/parla' : ''); }); });
  await ctx.close();
  log('foto', path.relative(ROOT, f), 'pose', JSON.stringify(pose), 'errori', errori.length);
  return { n, f: path.relative(ROOT, f), scena: r, pose, errori };
}
(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await PW.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const out = []; for (const n of opt.solo ? String(opt.solo).split(',').map(Number) : [1, 2]) out.push(await foto(browser, port, n));
  console.log(JSON.stringify(out.map(o => ({ n: o.n, f: o.f, errori: o.errori && o.errori.length, errore: o.errore })), null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
