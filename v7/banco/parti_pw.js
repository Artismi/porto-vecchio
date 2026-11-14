#!/usr/bin/env node
/* Porto Vecchio — banco/parti_pw.js: le foto delle COSE COSTRUITE CON LE PARTI (src/unico_parti.js, unico_parti_vivo.js, unico_costruire.js,
   dietro ?commedia). Serve v7/ con un server http locale, apre index.html?commedia&cantiere=<tipo>&pronto in Chromium (Playwright,
   SwiftShader), mette Nino all'aperto, apre il cantiere della tappa vicino a lui (il posto lo sceglie UP.sito: libero e piano), la fa
   USARE (la rampa: un'auto ci salta; la catapulta: tira) e scatta a metà del volo. Poi il controllo delle scatole: le parti fra loro
   (UP.valida: compenetrazioni e appoggi) e ogni parte posata contro le case (Ingombri), i mezzi, la roba di strada del disegno, le persone.
     node banco/parti_pw.js            le quattro foto (1280×720, deviceScaleFactor 2):
       _immagini/commedia/parti_1.jpg  la rampa con l'auto in volo
       _immagini/commedia/parti_2.jpg  la catapulta col copertone in aria
       _immagini/commedia/parti_3.jpg  il riparo (la baracca) col suo gruppo
       _immagini/commedia/parti_4.jpg  la barricata in una via
     e banco/parti_risultati.json (le misure, il posto, il controllo delle scatole, gli errori di pagina).
   Opzioni: --solo 1|2|3|4  --seme N (3)  --headed */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
let PW; try { PW = require('playwright'); } catch (e) { PW = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium } = PW;
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
  window.__disegna = false;   // il disegno a vuoto fra uno scatto e l'altro (SwiftShader costa secondi a fotogramma)
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) { if (!C) continue; const P = C.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) { const f = P[k]; if (f) P[k] = function () { if (window.__disegna) return f.apply(this, arguments); }; } }
}
const SCENE = { 1: { tipo: 'rampa', nome: 'la rampa con l\'auto in volo' }, 2: { tipo: 'catapulta', nome: 'la catapulta col copertone in aria' }, 3: { tipo: 'baracca', nome: 'il riparo col suo gruppo' }, 4: { tipo: 'barricata', nome: 'la barricata in una via' } };

// il controllo delle scatole, nella pagina: le parti fra loro, e ogni parte contro case, mezzi, roba di strada, persone
function verifica([id, salta]) {
  const pv = window.__pv, st = pv.st, G = pv.G, UP = window.UnicoParti, UC = window.UnicoCostruire, C = st.u.costruire.cantieri.find(x => x.id === id);
  const piano = C.pezzi.map(([i]) => C.piano[i]), V = UP.valida(piano), out = { parti: piano.length, sovrapposte: V.sovr.length, appese: V.appese.length, sottoterra: V.err.length, case: [], mezzi: [], arredo: [], persone: [], cantieri: [] };
  const rett = p => { const P = UP.pianta(p), w = UP.aMondo(C, P.cx, P.cy); return { cx: w.x, cz: w.y, a: C.a + Math.atan2(P.uy, P.ux), hu: P.hu, hv: P.hv, z0: P.z0, z1: P.z1, k: p[0] }; };
  for (const p of piano) {
    if (p[0] === 'striscione' || p[0] === 'corda') continue; const R = rett(p);
    const h = window.Ingombri && Ingombri.casa(G, R, 0); if (h) out.case.push(p[0] + ':' + (h.b.id || '?') + ':' + h.d.toFixed(2));
    for (const M of UP.mezzi(st, R.cx, R.cz, 10)) if (!(M.v && M.v.id === salta) && UP.sat2(R, M) > .005) out.mezzi.push(p[0] + ':' + (M.v ? M.v.kind : 'barca'));
    for (const b of UP.ostacoli(R.cx, R.cz, 4)) if (UP.sat2(R, { cx: b.x, cz: b.y, a: 0, hu: b.hx, hv: b.hy }) > .005) out.arredo.push(p[0] + ':' + b.tag);
    for (const n of st.npcs.concat([st.player])) { if (n.inside || n.indoor || n.dead) continue; if (R.z0 > 1.6 || R.z1 < .25) continue; if (UP.sat2(R, { cx: n.x, cz: n.y, a: 0, hu: .2, hv: .2 }) > .005) out.persone.push(p[0] + ':' + (n.id || 'Nino')); }
    for (const D of st.u.costruire.cantieri) if (D !== C && !D.chiuso && UP.sat2(R, UC.rettDi(D, 0)) > 0) out.cantieri.push(D.id);
  }
  out.pulito = !out.sovrapposte && !out.appese && !out.sottoterra && !out.case.length && !out.mezzi.length && !out.arredo.length && !out.persone.length && !out.cantieri.length;
  return out;
}

async function foto(browser, port, n) {
  const sc = SCENE[n], tipo = sc.tipo;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(), errori = [];
  page.on('pageerror', e => { errori.push(e.message); log('[errore pagina]', e.message); });
  await page.addInitScript(initPage, { seme: SEME });
  const url = `http://127.0.0.1:${port}/index.html?commedia&cantiere=${tipo}&pronto`;
  log('apro', url);
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.Unico && Unico.passo && window.UnicoCostruire && window.UnicoPartiVivo, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); await page.waitForTimeout(2500); }
  // Nino fuori, al mattino col sole; il cantiere della tappa si apre vicino a lui, finito
  const C = await page.evaluate((tipo) => {
    const pv = window.__pv, st = pv.st, G = pv.G, UC = window.UnicoCostruire, p = st.player; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; st.over = null; st.chase = false; p.hp = 100; };
    setInterval(window.__guardia, 50);
    const s = UC.S(st); s.cantieri = []; s.tappa = 'foto';
    const corso = G.MAP.roads.find(r => r.id === 'corso'), q = corso.pts[Math.floor(corso.pts.length * (tipo === 'rampa' ? .4 : .55))];
    let V0 = tipo === 'barricata' ? UC.viaVicina(p.x, p.y, r => r.id !== 'corso' && r.kind === 'citta' && r.w >= 6 && r.w <= 8.5) : UC.viaVicina(q[0], q[1], r => r.id === 'corso');
    p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = V0.x; p.y = V0.y + (tipo === 'barricata' ? 0 : 6); p.vx = p.vy = 0;
    if (tipo === 'baracca' && G.PLACES.piazza_gov) { p.x = G.PLACES.piazza_gov.x; p.y = G.PLACES.piazza_gov.y; }   // la baracca in piazza: c'è spazio attorno
    for (let i = 0; i < 20; i++) G.step(st, .05, { x: 0, y: 0 });
    const cam = pv.R.getCamera && pv.R.getCamera(), d = new THREE.Vector3(); if (cam) cam.getWorldDirection(d); const Ld = Math.hypot(d.x, d.z) || 1;
    const C = UC.tappa(st, { verso: [d.x / Ld, d.z / Ld], R: tipo === 'rampa' ? 70 : 90, corso: tipo === 'baracca' ? false : undefined }); if (!C) return { no: UC.ultimoNo };   // il davanti verso la camera
    // il mondo fermo fra uno scatto e l'altro: il passo del gioco a vuoto, quello della foto (__step0) a mano
    window.__step0 = G.step; window.__ferma = true; G.step = function (a, b, c) { if (window.__ferma) return; return window.__step0(a, b, c); };
    return { id: C.id, tipo: C.tipo, via: C.via, x: C.x, y: C.y, a: C.a, gruppo: C.gruppo, n: C.piano.length, funziona: C.funziona, misure: C.misure, meta: C.meta, parti: [...new Set(C.piano.map(p => p[0]))] };
  }, tipo);
  log('cantiere', JSON.stringify(C).slice(0, 600));
  if (!C || !C.id) { await ctx.close(); return { n, errore: 'nessun cantiere', C, errori }; }
  // i tasselli attorno (la roba di strada si registra quando arriva): Nino lì vicino, qualche secondo, poi il controllo
  const camera = (tx, ty, k, lat) => page.evaluate(([tx, ty, k, lat]) => {
    const pv = window.__pv, st = pv.st, p = st.player, cam = pv.R.getCamera && pv.R.getCamera(); if (!cam) return null; const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, fx = d.x / L, fy = d.z / L;
    // un posto all'aperto per Nino: a piedi, lontano dalle case (2,5 m), fuori dai cantieri; se no si prova più in là o di lato
    const G = pv.G, libero = (x, y) => (!G.walkM || G.walkM(x, y)) && !(window.Ingombri && Ingombri.casa(G, { cx: x, cz: y, a: 0, hu: 2.5, hv: 2.5 }, 0)) && !st.u.costruire.cantieri.some(C => !C.chiuso && window.UnicoParti.sat2(window.UnicoCostruire.rettDi(C, .8), { cx: x, cz: y, a: 0, hu: .3, hv: .3 }))
      && [4, 7, 10, 13, 16].every(d => !(window.Ingombri && Ingombri.casa(G, { cx: x - fx * d, cz: y - fy * d, a: 0, hu: 1.2, hv: 1.2 }, 0)));   // e dietro, verso la camera, niente case (la camera non si stringe)
    let bx = tx - fx * k + fy * lat, by = ty - fy * k - fx * lat;
    trova: for (const dk of [0, -1.5, 1.5, -3, 3, -5]) for (const dl of [0, 2, -2, 4, -4, 6, -6]) { const x = tx - fx * (k + dk) + fy * (lat + dl), y = ty - fy * (k + dk) - fx * (lat + dl); if (libero(x, y)) { bx = x; by = y; break trova; } }
    p.x = bx; p.y = by; p.vx = p.vy = 0; p.face = Math.atan2(ty - p.y, tx - p.x); if (pv.R.snap) pv.R.snap(st); return { fx: +fx.toFixed(2), fy: +fy.toFixed(2) };
  }, [tx, ty, k, lat]);
  await camera(C.x, C.y, 7, 0); await page.waitForTimeout(5000);
  // la camera gira con le vie: lì vicino il suo verso può essere un altro; se il davanti non le sta di fronte, il cantiere si riapre col verso nuovo
  for (let k = 0; k < 2; k++) {
    const r = await page.evaluate(([id, tipo]) => {
      const pv = window.__pv, st = pv.st, UC = window.UnicoCostruire, s = UC.S(st), C0 = s.cantieri.find(x => x.id === id), cam = pv.R.getCamera(), d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, f = [d.x / L, d.z / L];
      const fronte = tipo === 'rampa' || tipo === 'catapulta' ? Math.abs(Math.cos(C0.a) * f[0] + Math.sin(C0.a) * f[1]) - .5 : (Math.sin(C0.a) * f[0] - Math.cos(C0.a) * f[1]) * (C0.meta && C0.meta.gira ? -1 : 1);   // la barricata girata ha il davanti a +y
      if (fronte < -.3) return { ok: 1, fronte: +fronte.toFixed(2) };
      const p = st.player; p.x = C0.x - f[0] * 9; p.y = C0.y - f[1] * 9; s.cantieri = []; const C = UC.tappa(st, { verso: f, R: 60, corso: tipo === 'baracca' ? false : undefined }); if (!C) return { no: UC.ultimoNo };
      return { id: C.id, tipo: C.tipo, via: C.via, x: C.x, y: C.y, a: C.a, gruppo: C.gruppo, n: C.piano.length, funziona: C.funziona, misure: C.misure, meta: C.meta, parti: [...new Set(C.piano.map(p => p[0]))], fronte: +fronte.toFixed(2) };
    }, [C.id, tipo]);
    log('verso', JSON.stringify(r).slice(0, 200)); if (r.ok || !r.id) break; Object.assign(C, r); await camera(C.x, C.y, 7, 0); await page.waitForTimeout(4000);
  }
  // la scena: il gruppo di guardia attorno; la rampa: un'auto salta; la catapulta: tira
  const stato = await page.evaluate(([id, tipo]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, UC = window.UnicoCostruire, UV = window.UnicoPartiVivo, C = st.u.costruire.cantieri.find(x => x.id === id);
    C.gruppo.forEach(m => { const n = G.byId(st, m); if (!n) return; const q = UC.postoPresidio(st, C, m); n.x = q.x; n.y = q.y; n.vx = n.vy = 0; if (n.pop) n.pop.path = []; n.face = Math.atan2(C.y - n.y, C.x - n.x); });
    const step = k => { for (let i = 0; i < k; i++) { window.__guardia(); window.__step0(st, .05, { x: 0, y: 0 }); } };
    step(10);
    if (tipo === 'rampa') {
      const S = UV.salta(st, C, { prendi: true }); if (!S) return { no: 'nessuna auto' };
      for (let i = 0; i < 2000; i++) { step(1); if (S.fase === 'vola' && S.z >= C.misure.rampa.h + .8) break; }   // appena staccata dal bordo: l'auto e la rampa nella stessa foto
      return { fase: S.fase, z: +S.z.toFixed(2), vid: S.vid, kind: st.vehicles.find(v => v.id === S.vid).kind, rampa: C.misure.rampa };
    }
    if (tipo === 'catapulta') {
      UV.lancia(st, C, C.gruppo[0]); const P = UV.T(st).proj[0]; if (!P) return { no: 'niente in volo' };
      for (let i = 0; i < 600; i++) { step(1); if (P.z >= P.z0 + 2.4 || P.vz <= .6) break; }   // in salita, ancora vicino alla catapulta
      return { z: +P.z.toFixed(2), lancio: C.misure.lancio, x: P.x, y: P.y };
    }
    return { ok: 1 };
  }, [C.id, tipo]);
  log('scena', JSON.stringify(stato).slice(0, 400));
  // la camera non si tocca: Nino si mette in modo che la scena gli stia davanti nel verso in cui la camera guarda
  const bersaglio = await page.evaluate(([id, tipo]) => {
    const st = window.__pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), UV = window.UnicoPartiVivo;
    if (tipo === 'rampa') { const S = UV.T(st).salti[0], v = S && st.vehicles.find(k => k.id === S.vid); return v ? { x: v.x * .5 + C.x * .5, y: v.y * .5 + C.y * .5, z: 1.2, k: 4, lat: 0, v: 215 } : { x: C.x, y: C.y, k: 8, lat: 0 }; }
    if (tipo === 'catapulta') { const P = UV.T(st).proj[0]; return P ? { x: P.x * .35 + C.x * .65, y: P.y * .35 + C.y * .65, z: 1.2, k: 3.6, lat: 1, v: 230 } : { x: C.x, y: C.y, k: 4, lat: 0 }; }
    return { x: C.x, y: C.y, z: tipo === 'baracca' ? 1.2 : .7, k: tipo === 'baracca' ? 6.2 : 5.2, lat: 1.2, v: 235 };
  }, [C.id, tipo]);
  // la camera si stringe se dietro Nino c'è un muro: si misura la distanza camera-Nino e si prova un altro posto di lato
  const dCam = () => page.evaluate(() => { const pv = window.__pv, c = pv.R.getCamera(), p = pv.st.player; return Math.hypot(c.position.x - p.x, c.position.z - p.y); });
  let cam = null, dc = 0;
  let best = null;   // la camera libera sta a ~8 m da Nino; stretta, a 1-2 m: si tiene il posto dove sta più lontana
  // la camera gira con la via: si rimette Nino finché il verso della camera non sta fermo
  const mettiti = async dl => { let c0 = null; for (let k = 0; k < 4; k++) { const c = await camera(bersaglio.x, bersaglio.y, bersaglio.k, bersaglio.lat + dl); await page.waitForTimeout(2200); if (c0 && Math.abs(c.fx - c0.fx) < .03 && Math.abs(c.fy - c0.fy) < .03) return c; c0 = c; } return c0; };
  for (const dl of [0, 3, -3, 6, -6, 9]) { cam = await mettiti(dl); dc = await dCam(); log('camera', JSON.stringify(cam), 'distanza', dc.toFixed(1)); if (!best || dc > best[1] + .3) best = [dl, dc]; if (dc > 7.5) break; }
  if (dc < best[1] - .3) { cam = await mettiti(best[0]); dc = await dCam(); log('camera (la migliore)', best[0], dc.toFixed(1)); }
  // centrare: si misura dove cade il bersaglio sullo schermo e si sposta Nino (la camera lo segue) finché sta al centro
  for (let it = 0; it < 4; it++) {
    const e = await page.evaluate(([b]) => {
      const pv = window.__pv, st = pv.st, p = st.player, cam = pv.R.getCamera(), gz = pv.R.groundH ? pv.R.groundH(b.x, b.y) : 0, z = gz + (b.z || .8);
      const pr = (x, y) => { const v = new THREE.Vector3(x, z, y).project(cam); return [(v.x + 1) * 640, (1 - v.y) * 360]; };
      const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, F = [d.x / L, d.z / L], R = [-F[1], F[0]];
      const c = pr(b.x, b.y), cr = pr(b.x + R[0], b.y + R[1]), cf = pr(b.x + F[0], b.y + F[1]);
      const pxR = cr[0] - c[0] || 1, pxF = cf[1] - c[1] || -1, du = c[0] - 640, dv = c[1] - (b.v || 380);
      if (Math.abs(du) < 25 && Math.abs(dv) < 25) return { ok: 1, c: c.map(Math.round) };
      const mx = Math.max(-6, Math.min(6, du / pxR)), my = Math.max(-6, Math.min(6, dv / pxF));
      p.x += R[0] * mx + F[0] * my; p.y += R[1] * mx + F[1] * my; p.vx = p.vy = 0; if (pv.R.snap) pv.R.snap(st);
      return { ok: 0, c: c.map(Math.round), m: [+mx.toFixed(2), +my.toFixed(2)] };
    }, [bersaglio]);
    log('centra', JSON.stringify(e)); if (e.ok) break; await page.waitForTimeout(2200);
  }
  dc = await dCam(); log('distanza camera', dc.toFixed(1));
  await page.waitForTimeout(5000);
  // ultimo controllo del verso, con la camera di adesso: il davanti (la porta, i copertoni) verso chi guarda; se no il cantiere gira di
  // mezzo giro sul posto, se il posto girato è ancora libero (lo stesso controllo della scelta del posto)
  const giro = await page.evaluate(([id, tipo]) => {
    const pv = window.__pv, st = pv.st, UC = window.UnicoCostruire, UP = window.UnicoParti, G = pv.G, C = st.u.costruire.cantieri.find(x => x.id === id), cam = pv.R.getCamera(), d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, f = [d.x / L, d.z / L];
    const fr = Math.sin(C.a) * f[0] - Math.cos(C.a) * f[1], pr = (lx, ly) => { const w = UP.aMondo(C, lx, ly), v = new THREE.Vector3(w.x, (C.z0 || 0) + 1, w.y).project(cam); return [Math.round((v.x + 1) * 640), Math.round((1 - v.y) * 360)]; };
    const o = { a: C.a, cam: f.map(v => +v.toFixed(2)), fronte: +fr.toFixed(2), davanti: pr(0, C.meta && C.meta.gira ? C.F[3] : C.F[1]), dietro: pr(0, C.meta && C.meta.gira ? C.F[1] : C.F[3]) };
    if ((tipo === 'baracca' || tipo === 'barricata') && o.davanti[1] < o.dietro[1] + 30) {
      // i quattro versi (la baracca è quasi quadrata): quello col davanti più in basso sullo schermo (verso la camera), se il posto girato è libero
      const sgn = C.meta && C.meta.gira ? -1 : 1, a0 = C.a; let best = [o.davanti[1] - o.dietro[1], a0];
      for (const da of tipo === 'baracca' ? [Math.PI / 2, Math.PI, -Math.PI / 2] : [Math.PI]) {
        const S = { x: C.x, y: C.y, a: a0 + da }, m = UP.controlla(st, S, C.F, { suolo: 'strada', altri: [] }); if (m && m !== 'giocatore') continue;
        C.a = a0 + da; const dv = pr(0, sgn > 0 ? C.F[1] : C.F[3])[1] - pr(0, sgn > 0 ? C.F[3] : C.F[1])[1]; C.a = a0; if (dv > best[0]) best = [dv, a0 + da];
      }
      o.prova = best; if (best[1] !== a0) { C.a = +best[1].toFixed(3); o.girato = 1; C.gruppo.forEach(id2 => { const n = G.byId(st, id2); if (!n) return; const q = UC.postoPresidio(st, C, id2); n.x = q.x; n.y = q.y; n.face = Math.atan2(C.y - n.y, C.x - n.x); }); }
    }
    // chi fa la guardia non si mette fra la camera e la cosa (per la foto: dall'altra parte, se lì è libero)
    C.gruppo.forEach(id2 => { const n = G.byId(st, id2); if (!n) return; const rf = (n.x - C.x) * f[0] + (n.y - C.y) * f[1]; if (rf >= 0) return; const x = n.x - 2 * rf * f[0], y = n.y - 2 * rf * f[1]; if (UC.puntoLibero(st, C, x, y)) { n.x = x; n.y = y; n.face = Math.atan2(C.y - y, C.x - x); } });
    return o;
  }, [C.id, tipo]);
  log('verso finale', JSON.stringify(giro)); if (giro.girato) await page.waitForTimeout(4000);
  const schermo = await page.evaluate(([id]) => { const pv = window.__pv, st = pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), cam = pv.R.getCamera(), UV = window.UnicoPartiVivo, g = (x, y) => (pv.R.groundH ? pv.R.groundH(x, y) : 0);
    const pr = (x, y, z) => { const v = new THREE.Vector3(x, z, y).project(cam); return [+((v.x + 1) * 640).toFixed(0), +((1 - v.y) * 360).toFixed(0)]; };
    const o = { cantiere: pr(C.x, C.y, g(C.x, C.y) + .5) }; const S = UV.T(st).salti[0], v = S && st.vehicles.find(k => k.id === S.vid); if (v) o.auto = pr(v.x, v.y, g(v.x, v.y) + (v.jz || 0) + .7); const P = UV.T(st).proj[0]; if (P) o.copertone = pr(P.x, P.y, P.z); return o; }, [C.id]);
  log('sullo schermo (1280×720)', JSON.stringify(schermo));
  const ver = await page.evaluate(verifica, [C.id, stato && stato.vid]).catch(e => ({ errore: e.message }));
  // (verifica riceve un array: lo si spacchetta)
  const f = path.join(FOTOD, `parti_${n}.jpg`);
  await page.evaluate(() => { window.__fermo = true; window.__disegna = true; });
  for (let k = 0; k < 4; k++) await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 900000 });
  await page.evaluate(() => { window.__disegna = false; });
  const fatti = await page.evaluate(() => { const st = window.__pv.st; return Fatto.tutti(st).filter(x => ['rivendica', 'barricata', 'baracca', 'rampa', 'catapulta', 'salto', 'schianto', 'lancio', 'colpito', 'crollo'].includes(x.v)).slice(-6).map(x => x.v + (x.x && x.x.misura ? ' (' + x.x.misura + ')' : '') + (x.x && x.x.m ? ' ' + x.x.m + ' m' : '')); });
  await ctx.close();
  log('foto', path.relative(ROOT, f), 'controllo', JSON.stringify(ver), 'fatti', JSON.stringify(fatti), 'errori', errori.length);
  return { n, scena: sc.nome, f: path.relative(ROOT, f), cantiere: C, uso: stato, controllo: ver, fatti, errori };
}

(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await chromium.launch({ headless: !opt.headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const out = [];
  for (const n of opt.solo ? String(opt.solo).split(',').map(Number) : [1, 2, 3, 4]) out.push(await foto(browser, port, n));
  const fr = path.join(__dirname, 'parti_risultati.json');
  let prima = []; try { prima = JSON.parse(fs.readFileSync(fr, 'utf8')); } catch (e) { }
  const tutti = prima.filter(x => !out.some(y => y.n === x.n)).concat(out).sort((a, b) => a.n - b.n);
  fs.writeFileSync(fr, JSON.stringify(tutti, null, 1));
  console.log(JSON.stringify(out.map(o => ({ n: o.n, f: o.f, pulito: o.controllo && o.controllo.pulito, errori: o.errori.length })), null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
