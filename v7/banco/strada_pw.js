#!/usr/bin/env node
/* Porto Vecchio — banco/strada_pw.js: le foto del REGISTRO DI STRADA (src/unico_strada.js, dietro ?commedia).
   Lo stesso banco di banco/corpi_pw.js (server http locale, Chromium con SwiftShader, 1280×720 a deviceScaleFactor 2, la camera del
   gioco non si tocca: si mette Nino). Un posto della città riempito come fa popolo.js (n.__posto), prima chi ha il registro; poi tre
   di loro parlano col registro (UnicoStrada.riga detta con UnicoStrada.dice: G.say, la regia, il fumetto normale) e la foto.
     node banco/strada_pw.js     _immagini/commedia/registro_strada_1.jpg  la chiacchiera (fondo: vanti, nonna, lamenti)
                                 _immagini/commedia/registro_strada_2.jpg  la lite (insulto, minaccia, chi guarda)
   Opzioni: --solo 1|2  --seme N  --strada 1|2 (default 2: più gente col registro, per trovarne tre vicini) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const argv = process.argv.slice(2), opt = {};
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v == null || v.startsWith('--')) opt[k] = true; else { opt[k] = v; i++; } } }
const ROOT = path.resolve(__dirname, '..'), FOTOD = path.join(ROOT, '_immagini', 'commedia'), SEME = +(opt.seme || 3), DIAL = String(opt.strada || 2);
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
// le scene: i tipi di posto, quanti, l'ora, chi dice che cosa (l'intento per i primi tre col registro)
const SCENE = { 1: { tipi: [['sagrato', 5], ['angolo', 5], ['lotto_vuoto', 5], ['dehors', 5], ['cypher', 5]], ora: 10.4, dire: ['fondo', 'fondo', 'fondo'], pref: ['co', 'no', 'sb', 'ma', 'pr'] },
  2: { tipi: [['sagrato', 5], ['angolo', 5], ['lotto_vuoto', 5], ['dehors', 5]], ora: 17.6, dire: ['rissa2', 'rissa4', 'rissa1'], pref: ['co', 'ma', 'sb', 'no'] } };

async function foto(browser, port, n) {
  const sc = SCENE[n], ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }), page = await ctx.newPage(), errori = [];
  page.on('pageerror', e => { errori.push(e.message); log('[errore pagina]', e.message); });
  await page.addInitScript(initPage, { seme: SEME + n });
  const url = `http://127.0.0.1:${port}/index.html?commedia&strada=${DIAL}`; log('apro', url);
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.Unico && Unico.passo && window.Posti && window.UnicoStrada && UnicoStrada.ON, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); await page.waitForTimeout(2500); }
  const r = await page.evaluate(([sc, seme]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, p = st.player, PO = window.Posti, PL = G.PLACES || {}, US = window.UnicoStrada; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; st.over = null; st.chase = false; p.hp = 100; }; setInterval(window.__guardia, 50);
    st.t = Math.floor(st.t / 1440) * 1440 + sc.ora * 60;
    const REG = ['commissariato', 'caserma_p', 'rocca', 'varco', 'muro', 'cultura', 'governo', 'ministero', 'piazza_gov', 'archivio'].filter(k => PL[k]), grigio = (x, y) => REG.some(k => Math.hypot(PL[k].x - x, PL[k].y - y) < 40);
    const tutti = PO.near(p.x, p.y, 1e5).filter(q => !q.tetto && !grigio(q.x, q.y)); let q0 = null, cap0 = 0;
    for (const [k, c] of sc.tipi) { const L = tutti.filter(q => q.k === k).sort((a, b) => (Math.sin(a.x * 12.9 + a.y * 78.2 + seme) % 1) - (Math.sin(b.x * 12.9 + b.y * 78.2 + seme) % 1)); if (L.length) { q0 = L[0]; cap0 = Math.min(c, q0.cap || c); break; } }
    if (!q0) return { no: 'nessun posto' };
    p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = q0.x - 6; p.y = q0.y + 4; p.vx = p.vy = 0;
    for (let i = 0; i < 30; i++) G.step(st, .05, { x: 0, y: 0 });
    window.__step0 = G.step; G.step = function () { };
    // chi ci va: prima chi ha il registro (nell'ordine dei tipi preferiti), poi gli altri vicini
    const rk = n => { const t = US.registro(st, n.id); const i = sc.pref.indexOf(t); return t ? i < 0 ? 5 : i : 9; };
    const cand = st.npcs.filter(n => n.pop && !n.cop && !n.grigio && !n.military && !n.dead && !n.faction && (n.pop.age || 30) >= 16 && !n.rotelle && !n.pop.matto)
      .sort((a, b) => rk(a) - rk(b) || Math.hypot(a.x - q0.x, a.y - q0.y) - Math.hypot(b.x - q0.x, b.y - q0.y));
    // tipi diversi fra i primi tre
    const presi = [], visti = new Set(); for (const n of cand) { const t = US.registro(st, n.id); if (t && !visti.has(t) && presi.length < 3) { presi.push(n); visti.add(t); } }
    for (const n of cand) { if (presi.length >= 3) break; if (US.registro(st, n.id) && !presi.includes(n)) presi.push(n); }
    const resto = cand.filter(n => !presi.includes(n)), L = presi.concat(resto).slice(0, cap0);
    const D = PO.TIPI[q0.k] || {}, S = PO.slots(q0, cap0);
    S.forEach((s0, i) => { const n = L[i]; if (!n) return; n.inside = false; n.room = null; n.inVeh = false; n.x = s0.x; n.y = s0.y; n.face = s0.face; n.vx = n.vy = 0; n.path = []; n.speedNow = 0; n.pop.near = true; n.pop.lod = 'vicino'; n.pop.emer = null; n.pop.goalSet = true; n.wait = 1e6;
      n.__posto = { id: q0.id, p: q0, slot: s0, sed: null, until: st.t + 600, pose: D.pose || null, hand: null, hand0: n.hand || null, arrived: true, comparsa: false, tetto: false, t0: st.clock }; n.action = { name: 'routine', scores: [], why: 'per la foto', since: st.clock }; });
    window.__usati = L.map(n => n.id);
    window.__metti = () => { for (const n of st.npcs) { const P = n.__posto; if (!P || !window.__usati.includes(n.id)) continue; n.x = P.slot.x; n.y = P.slot.y; n.vx = n.vy = 0; n.path = []; n.speedNow = 0; n.inside = false; } };
    window.__parlano = presi.map(n => n.id);
    return { q0: { k: q0.k, x: q0.x, y: q0.y }, chi: presi.map(n => [n.id, n.first, US.registro(st, n.id), n.pop.job ? n.pop.job.title : n.pop.status]), cx: q0.x, cy: q0.y };
  }, [sc, SEME]);
  log('scena', JSON.stringify(r).slice(0, 600)); if (r.no) { await ctx.close(); return { n, errore: r.no }; }
  const mettiti = (k, lat) => page.evaluate(([tx, ty, k, lat]) => {
    const pv = window.__pv, st = pv.st, p = st.player, G = pv.G, cam = pv.R.getCamera(), d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, fx = d.x / L, fy = d.z / L;
    const libero = (x, y) => (!G.walkM || G.walkM(x, y)) && !st.npcs.some(n => !n.inside && Math.hypot(n.x - x, n.y - y) < 1.2);
    let bx = tx - fx * k + fy * lat, by = ty - fy * k - fx * lat;
    trova: for (const dk of [0, -1.5, 1.5, -3, 3]) for (const dl of [0, 2, -2, 4, -4]) { const x = tx - fx * (k + dk) + fy * (lat + dl), y = ty - fy * (k + dk) - fx * (lat + dl); if (libero(x, y)) { bx = x; by = y; break trova; } }
    p.x = bx; p.y = by; p.vx = p.vy = 0; p.face = Math.atan2(ty - p.y, tx - p.x); if (pv.R.snap) pv.R.snap(st); window.__metti(); return [fx, fy];
  }, [r.cx, r.cy, k, lat]);
  let c0 = null; for (let k = 0; k < 4; k++) { const c = await mettiti(5, 0); await page.waitForTimeout(2200); if (c0 && Math.abs(c[0] - c0[0]) < .03 && Math.abs(c[1] - c0[1]) < .03) break; c0 = c; }
  // la scena un po' sopra Nino (la camera tiene lui al centro): come in banco/corpi_pw.js, e Nino mai in mezzo alla gente
  for (let it = 0; it < 5; it++) {
    const e = await page.evaluate(([b]) => {
      const pv = window.__pv, st = pv.st, p = st.player, cam = pv.R.getCamera(), z = (pv.R.groundH ? pv.R.groundH(b.x, b.y) : 0) + 1;
      const pr = (x, y) => { const v = new THREE.Vector3(x, z, y).project(cam); return [(v.x + 1) * 640, (1 - v.y) * 360]; };
      const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, F = [d.x / L, d.z / L], R = [-F[1], F[0]];
      const c = pr(b.x, b.y), cr = pr(b.x + R[0], b.y + R[1]), cf = pr(b.x + F[0], b.y + F[1]), du = c[0] - 640, dv = c[1] - 300;
      if (Math.abs(du) < 25 && Math.abs(dv) < 25) return { ok: 1 };
      const mx = Math.max(-5, Math.min(5, du / ((cr[0] - c[0]) || 1))), my = Math.max(-5, Math.min(5, dv / ((cf[1] - c[1]) || -1)));
      p.x += R[0] * mx + F[0] * my; p.y += R[1] * mx + F[1] * my;
      const G = pv.G, vuoto = (x, y) => !st.npcs.some(n => !n.inside && Math.hypot(n.x - x, n.y - y) < 1.4) && (!G.walkM || G.walkM(x, y));
      if (!vuoto(p.x, p.y)) for (const d of [1.5, -1.5, 3, -3, 4.5, -4.5]) if (vuoto(p.x + R[0] * d, p.y + R[1] * d)) { p.x += R[0] * d; p.y += R[1] * d; break; }
      if (pv.R.snap) pv.R.snap(st); window.__metti(); return { ok: 0 };
    }, [{ x: r.cx, y: r.cy }]);
    if (e.ok) break; await page.waitForTimeout(2200);
  }
  // parlano: la battuta del registro per l'intento della scena, per la strada normale (G.say → la regia → il setter avvolto)
  const dette = await page.evaluate(([dire]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, US = window.UnicoStrada, out = [];
    window.__parlano.forEach((id, i) => {
      const n = G.byId(st, id); if (!n) return; const tipo = US.registro(st, id), X = US.ctxDi(st, n, tipo, null); X.g2 = 'm';
      let t = null; for (let k = 0; k < 6 && (!t || t.length > 92); k++) t = US.riga(st, dire[i % dire.length], X);
      US.dice(st, n, t, dire[i % dire.length], tipo, 'p');   // la strada del modulo: G.say, la regia, senza rietichettare la propria riga
      if (n.bark) n.bark.until = st.clock + 60; out.push([n.first, tipo, n.bark && n.bark.text]);
    });
    return out;
  }, [sc.dire]);
  log('dette', JSON.stringify(dette));
  await page.evaluate(() => { const st = window.__pv.st; for (let i = 0; i < 20; i++) { window.__guardia(); st.clock += .05; } window.__metti(); });
  const f = path.join(FOTOD, `registro_strada_${n}.jpg`);
  await page.evaluate(() => { window.__disegna = true; });
  for (let k = 0; k < 6; k++) await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 900000 });
  const bolle = await page.evaluate(() => [...document.querySelectorAll('#bubbles .bub')].filter(b => b.offsetParent && getComputedStyle(b).display !== 'none').map(b => b.textContent.trim()).slice(0, 8));
  await ctx.close();
  log('foto', path.relative(ROOT, f), 'bolle', JSON.stringify(bolle), 'errori', errori.length);
  return { n, f: path.relative(ROOT, f), dette, bolle, errori };
}
(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await PW.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const out = []; for (const n of opt.solo ? String(opt.solo).split(',').map(Number) : [1, 2]) out.push(await foto(browser, port, n));
  console.log(JSON.stringify(out.map(o => ({ n: o.n, f: o.f, bolle: o.bolle, errori: o.errori && o.errori.length, errore: o.errore })), null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
