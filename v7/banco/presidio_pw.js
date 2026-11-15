#!/usr/bin/env node
/* Porto Vecchio — banco/presidio_pw.js: le foto del PRESIDIO (src/unico_presidio.js sopra le parti di unico_parti.js, dietro ?commedia).
   Lo stesso banco di banco/parti_pw.js (server http locale, Chromium con SwiftShader, 1280×720 a deviceScaleFactor 2, la camera del
   gioco non si tocca: si mette Nino), in una via di città a colori (fuori dai luoghi del regime, disegnati spenti), su un tratto dritto lontano dagli incroci:
     node banco/presidio_pw.js            _immagini/commedia/presidio_1.jpg  appena nato: i tre fondatori, lo striscione, la via aperta
                                          _immagini/commedia/presidio_2.jpg  un giorno dopo: la gente che vive la strada, un'auto che passa piano
                                          _immagini/commedia/presidio_3.jpg  la strada chiusa: l'auto ferma davanti alla barricata (col solo varco a piedi),
                                          chi guida protesta; dietro lo striscione e il presidio
   --scena (scena_dopo_1/2): il tratto si sceglie misurando il colore sul posto (la maschera grigia del regime, zero in tutta la foto) e
   le case ai due lati (i balconi, i ganci nel muro), non escludendo quartieri interi; i posti migliori si provano sul posto (niente
   roba grande in mezzo alla carreggiata, niente reti dei lavori in corso; --evita x,y;x,y), il presidio a 4 m dagli incroci (--incrocio N).
   Poi il controllo delle scatole (le parti fra loro, contro case, mezzi compresa l'auto che passa, roba di strada, persone in piedi;
   chi siede sta nella scatola della sedia) e il passaggio misurato. banco/presidio_risultati.json. Opzioni: --solo 1|2|3  --seme N  --headed */
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
const EVITA = String(opt.evita || (opt.scena ? '1276,390' : '')).split(';').filter(Boolean).map(t => t.split(',').map(Number));
const SCENE0 = { 1: { tipo: 'presidio', nome: 'il presidio appena nato', ore: 0 }, 2: { tipo: 'presidio', nome: 'il presidio un giorno dopo', ore: 26, quanti: 13 }, 3: { tipo: 'presidio', nome: 'la strada chiusa (due giorni dopo, dopo la multa)', ore: 44, quanti: 15, chiusa: true } };
// --scena: le foto della messa in scena (unico_corpi.js, unico_striscione.js): scena_dopo_1 appena nato, scena_dopo_2 la sera vissuta (~12 persone)
const SCENE = opt.scena ? { 1: { tipo: 'presidio', nome: 'appena nato (la messa in scena)', ore: 0, f: 'scena_dopo_1' }, 2: { tipo: 'presidio', nome: 'la sera vissuta (la messa in scena)', ore: 30, quanti: 12, ora: 18.6, f: 'scena_dopo_2' } } : SCENE0;

// il controllo delle scatole, nella pagina: le parti fra loro, e ogni parte contro case, mezzi, roba di strada, persone
function verifica([id, salta]) {
  const pv = window.__pv, st = pv.st, G = pv.G, UP = window.UnicoParti, UC = window.UnicoCostruire, C = st.u.costruire.cantieri.find(x => x.id === id);
  const piano = C.pezzi.map(([i]) => C.piano[i]), V = UP.valida(piano), out = { parti: piano.length, sovrapposte: V.sovr.length, appese: V.appese.length, sottoterra: V.err.length, case: [], mezzi: [], arredo: [], persone: [], cantieri: [] };
  const rett = p => { const P = UP.pianta(p), w = UP.aMondo(C, P.cx, P.cy); return { cx: w.x, cz: w.y, a: C.a + Math.atan2(P.uy, P.ux), hu: P.hu, hv: P.hv, z0: P.z0, z1: P.z1, k: p[0] }; };
  for (const p of piano) {
    if (p[0] === 'striscione' || p[0] === 'corda') continue; const R = rett(p);
    const h = window.Ingombri && Ingombri.casa(G, R, 0); if (h) out.case.push(p[0] + ':' + (h.b.id || '?') + ':' + h.d.toFixed(2));
    if (R.z0 < 1.8) for (const M of UP.mezzi(st, R.cx, R.cz, 10)) if (!(M.v && M.v.id === salta) && UP.sat2(R, M) > .005) out.mezzi.push(p[0] + ':' + (M.v ? M.v.kind : 'barca'));
    for (const b of UP.ostacoli(R.cx, R.cz, 4)) if (UP.sat2(R, { cx: b.x, cz: b.y, a: 0, hu: b.hx, hv: b.hy }) > .005) out.arredo.push(p[0] + ':' + b.tag);
    for (const n of st.npcs.concat([st.player])) { if (n.inside || n.indoor || n.dead) continue; if (R.z0 > 1.6 || R.z1 < .25 || p[0] === 'sedia') continue; if (UP.sat2(R, { cx: n.x, cz: n.y, a: 0, hu: .2, hv: .2 }) > .005) out.persone.push(p[0] + ':' + (n.id || 'Nino')); }
    for (const D of st.u.costruire.cantieri) if (D !== C && !D.chiuso && UP.sat2(R, UC.rettDi(D, 0)) > 0) out.cantieri.push(D.id);
  }
  const xi = C.varco ? Math.abs(C.varco[1]) : 0; out.passa = C.misure.passa; out.varco = +(2 * xi).toFixed(2);
  const da = C.meta.chiusa ? C.meta.chiusa.da : Infinity; out.barricata = C.meta.chiusa ? C.piano.length - da : 0;
  out.inMezzo = C.pezzi.filter(([i]) => i < da).map(([i]) => C.piano[i]).filter(p => { if (UP.PARTI[p[0]].decoro) return false; const P = UP.pianta(p); return Math.abs(P.cx) - P.hu < xi - .01 && Math.abs(P.cx) + P.hu > -xi + .01 && UP.zMin(UP.obb(p)) < 2; }).map(p => p[0]);
  out.inStrada = C.vive ? Object.keys(C.vive).length : 0; out.attivita = {}; for (const id in C.vive || {}) out.attivita[C.vive[id][0]] = (out.attivita[C.vive[id][0]] || 0) + 1;
  out.posti = Object.keys(C.vive || {}).map(id => { const n = G.byId(st, id), q = window.UnicoPresidio.postoC(st, C, id); return n ? [id, +Math.hypot(n.x - q.x, n.y - q.y).toFixed(1), n.inside ? 'in' : '', n.pop && n.pop.lod].join(':') : id; });
  out.pulito = !out.inMezzo.length && !out.sovrapposte && !out.appese && !out.sottoterra && !out.case.length && !out.mezzi.length && !out.arredo.length && !out.persone.length && !out.cantieri.length;
  return out;
}

async function foto(browser, port, n) {
  const sc = SCENE[n], tipo = sc.tipo;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage(), errori = [];
  page.on('pageerror', e => { errori.push(e.message); log('[errore pagina]', e.message); });
  await page.addInitScript(initPage, { seme: SEME });
  const url = `http://127.0.0.1:${port}/index.html?commedia&cantiere=presidio&pronto`;
  log('apro', url);
  await page.goto(url, { timeout: 900000 });
  await page.waitForFunction(() => window.__pv && window.__pv.st && window.Unico && Unico.passo && window.UnicoCostruire && window.UnicoPartiVivo, null, { timeout: 900000, polling: 1000 });
  for (let k = 0; k < 6; k++) { const intro = await page.evaluate(() => !!window.__pv.ui.intro); if (!intro) break; await page.keyboard.press('Enter').catch(() => { }); await page.waitForTimeout(2500); }
  // Nino fuori, al mattino col sole; il cantiere della tappa si apre vicino a lui, finito
  // --scena: i posti migliori (case ai lati, a colori) si provano sul posto: Nino lì, i tasselli attorno arrivano, e se in mezzo alla
  // carreggiata c'è roba grande (le reti arancio di un cantiere, un blocco) o la via passa sotto qualcosa, il prossimo
  const apri = ([tipo, via, incr, scelta]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, UC = window.UnicoCostruire, p = st.player; st.deadline = 1e12; window.__meteo = 'sereno';
    window.__guardia = () => { const u = pv.ui; u.flash = 0; u.fade = 0; u.dialog = null; u.menu = false; st.over = null; st.chase = false; p.hp = 100; };
    setInterval(window.__guardia, 50);
    const s = UC.S(st); s.cantieri = []; s.tappa = 'foto';
    // a colori: fuori dai luoghi del regime (render.js zoneAt 'regime': la maschera grigia, coi suoi raggi sfumati), su un tratto dritto di
    // una via di città dove il presidio sta davvero (UP.sito: lontano dagli incroci e dalle zebre); Nino 7 m più in là lungo la via
    const UP = window.UnicoParti, PL = G.PLACES || {}, REG = [['commissariato', 14], ['caserma_p', 14], ['rocca', 14], ['varco', 14], ['muro', 14], ['cultura', 14], ['hangar1', 14], ['hangar2', 14], ['deposito_n', 14], ['deposito_s', 14], ['eliporto', 14], ['poligono', 14], ['governo', 14], ['garante', 14], ['ministero', 14], ['pietra', 14], ['archivio', 14], ['piazza_gov', 22]].filter(([k]) => PL[k]);
    // il colore si misura sul posto, non per quartieri: la maschera grigia del passo finale (render.js regimeMaschera) è piena fino a
    // .75 del raggio ×1,15 e sfuma a zero a ×1,15; qui il grigio di un punto, e il posto va bene se è zero in tutto il riquadro della
    // foto (un cerchio di m metri attorno). Così Via della Vittoria e Via della Marina valgono dove sono a colori.
    const maschera = (x, y) => { let g = 0; for (const [k, r] of REG) { const d = Math.hypot(PL[k].x - x, PL[k].y - y), R1 = r * 1.15; g = Math.max(g, d < R1 * .75 ? 1 : d < R1 ? 1 - (d - R1 * .75) / (R1 * .25) : 0); } return g; };
    const grigio = (x, y, m) => { if (maschera(x, y) > 0) return true; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; for (const d of [m * .5, m]) if (maschera(x + Math.cos(a) * d, y + Math.sin(a) * d) > .02) return true; } return false; };
    window.__maschera = maschera;
    // le case ai due lati: a ogni passo del tratto, di qua e di là, il muro più vicino entro 6 m dal bordo (e quanti piani ha)
    const lati = S => { const ax = -Math.sin(S.a), ay = Math.cos(S.a), cx = Math.cos(S.a), cy = Math.sin(S.a), w2 = (G.MAP.roads.find(r => r.id === S.rd) || { w: 7 }).w / 2, o = { s: [0, 0], fl: [0, 0] };
      [-1, 1].forEach((sd, k) => { for (const t of [-5, -2.5, 0, 2.5, 5]) for (let d = w2 + .5; d <= w2 + 6; d += .5) { const x = S.x + ax * t + cx * sd * d, y = S.y + ay * t + cy * sd * d, h = window.Ingombri && Ingombri.casa(G, { cx: x, cz: y, a: S.a, hu: .1, hv: .1 }, 0); if (h) { o.s[k]++; o.fl[k] = Math.max(o.fl[k], h.b.fl || 1); break; } } });
      return o; };
    const cand = UP.puntiVia(p.x, p.y, 1e5, r => r.id !== 'corso' && r.kind === 'citta' && r.w >= 6 && r.w <= 8.5, 2).filter(v => !grigio(v.x, v.y, 6));
    // prima le vie fra le case (il lungomare ha i pannelli e gli alberi che stringono la camera), poi il resto
    cand.sort((a, b) => (/Lungomare/.test(a.rd.name || '') ? 1 : 0) - (/Lungomare/.test(b.rd.name || '') ? 1 : 0));
    if (via) cand.sort((a, b) => (new RegExp(via).test(b.rd.name || '') ? 1 : 0) - (new RegExp(via).test(a.rd.name || '') ? 1 : 0));   // --via: una via scelta per nome
    // il tratto migliore: a colori in tutta la foto (14 m attorno), case di due piani o più ai due lati (i balconi, i ganci nel muro)
    // le vie fra le case della città sono corte fra un incrocio e l'altro: per la foto (--scena, o --incrocio N) il presidio può stare a
    // N m da un incrocio invece di 8 e fin sulla bocca di un vicolo (UP.CFG_INCROCIO, UP.CFG_BOCCA; la regola del gioco resta quella)
    if (incr) { UP.CFG_INCROCIO = incr; UP.CFG_BOCCA = Math.min(UP.CFG_BOCCA, -1); }
    let V0 = null, best = -1, provati = 0, vie = {}; const siti = [];
    if (scelta !== null && window.__siti && window.__siti[scelta]) { V0 = window.__siti[scelta]; cand.length = 0; }   // il posto scelto dopo la prova sul posto
    for (const v of cand) {
      if (provati >= 400) break;
      // le auto parcheggiate in mezzo alla via lì (come più sotto per la foto): via per la prova, rimesse se il posto non va
      const nx = -Math.sin(v.th), ny = Math.cos(v.th), tolte = st.vehicles.filter(q => !q.hidden && !q.traffic && q.id !== p.vehicle && Math.hypot(q.x - v.x, q.y - v.y) < 12 && Math.abs((q.x - v.x) * nx + (q.y - v.y) * ny) < v.rd.w / 2 - .3); tolte.forEach(q => { q.hidden = true; });
      const R = UP.sito(st, 'presidio', { x: v.x, y: v.y, seme: 'foto', altri: [], R: 6, max: 40, vieta: S => Math.hypot(S.x - v.x, S.y - v.y) > 3 ? 'altrove' : '' }); provati++;   // proprio lì (3 m), non il primo posto buono a 150 m
      if (!R || grigio(R.S.x, R.S.y, 10)) tolte.forEach(q => { q.hidden = false; });
      if (!R) for (const m in UP.ultimoNo || {}) if (m !== 'altrove') vie['-' + m + ':' + v.rd.name] = (vie['-' + m + ':' + v.rd.name] || 0) + 1;
      if (!R) { vie['-sito'] = (vie['-sito'] || 0) + 1; continue; } if (Math.hypot(R.S.x - v.x, R.S.y - v.y) >= 16) { vie['-lontano'] = (vie['-lontano'] || 0) + 1; continue; } if (grigio(R.S.x, R.S.y, 10)) { vie['-grigio:' + (R.S.via || v.rd.name)] = (vie['-grigio:' + (R.S.via || v.rd.name)] || 0) + 1; continue; }
      // niente sopra la via lì attorno (un palazzo a ponte, un portico): la camera non ci passa
      { const ax = -Math.sin(R.S.a), ay = Math.cos(R.S.a); let sopra = false; for (let t = -12; t <= 12 && !sopra; t += 1.5) if (window.Ingombri && Ingombri.casa(G, { cx: R.S.x + ax * t, cz: R.S.y + ay * t, a: R.S.a, hu: .3, hv: .3 }, 0)) sopra = true;
        if (sopra) { vie['-sopra:' + (R.S.via || v.rd.name)] = (vie['-sopra:' + (R.S.via || v.rd.name)] || 0) + 1; tolte.forEach(q => { q.hidden = false; }); continue; } }
      const Lt = lati(R.S), pv0 = Math.min(Lt.s[0], Lt.s[1]) * 2 + Lt.s[0] + Lt.s[1] + (Lt.fl[0] >= 2 ? 2 : 0) + (Lt.fl[1] >= 2 ? 2 : 0), nm = R.S.via || v.rd.name; vie[nm] = Math.max(vie[nm] || 0, pv0);
      siti.push(Object.assign({ punti: pv0 }, { x: R.S.x - Math.sin(R.S.a) * 7, y: R.S.y + Math.cos(R.S.a) * 7, th: R.S.a - Math.PI / 2, rd: G.MAP.roads.find(r => r.id === R.S.rd) || { w: 7 }, via: R.S.via, lati: Lt, S: R.S }));
      if (pv0 > best) { best = pv0; V0 = { x: R.S.x - Math.sin(R.S.a) * 7, y: R.S.y + Math.cos(R.S.a) * 7, th: R.S.a - Math.PI / 2, rd: G.MAP.roads.find(r => r.id === R.S.rd) || { w: 7 }, via: R.S.via, lati: Lt, punti: pv0 }; }
    }
    if (scelta === null || !window.__siti) { siti.sort((a, b) => b.punti - a.punti); const vis = []; window.__siti = siti.filter(q => { if (vis.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 10)) return false; vis.push(q); return true; }).slice(0, 8); }
    if (scelta === -1) return { siti: window.__siti.map(q => ({ x: q.S.x, y: q.S.y, a: q.S.a, w: q.rd.w, via: q.via, punti: q.punti })) };
    window.__vie = vie; vie.li = {}; for (const v of cand) { const k = v.rd.name; vie.li[k] = Math.max(vie.li[k] || 0, +UP.lontanoIncrocio(v.x, v.y).toFixed(1)); }
    if (!V0) return { no: 'nessun tratto a colori', cand: cand.length, provati, vie, nomi: [...new Set(cand.map(v => v.rd.name))] };
    p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = V0.x; p.y = V0.y; p.vx = p.vy = 0;
    // i mezzi fermi in mezzo alla carreggiata lì attorno (l'Ape di Nino) si tolgono: il posto del presidio è lo stesso in tutte e due le foto
    for (const v of st.vehicles) { if (v.hidden || v.traffic || Math.hypot(v.x - V0.x, v.y - V0.y) > 40) continue; const nx = -Math.sin(V0.th), ny = Math.cos(V0.th); if (Math.abs((v.x - V0.x) * nx + (v.y - V0.y) * ny) < V0.rd.w / 2 - .3) v.hidden = true; }
    for (let i = 0; i < 20; i++) G.step(st, .05, { x: 0, y: 0 });
    const cam = pv.R.getCamera && pv.R.getCamera(), d = new THREE.Vector3(); if (cam) cam.getWorldDirection(d); const Ld = Math.hypot(d.x, d.z) || 1;
    const C = UC.tappa(st, { verso: [d.x / Ld, d.z / Ld], R: 20 }); if (!C) return { no: UC.ultimoNo }; C.gruppo = C.gruppo.slice(0, 3);   // tre fondatori
    // il mondo fermo fra uno scatto e l'altro: il passo del gioco a vuoto, quello della foto (__step0) a mano
    window.__step0 = G.step; window.__ferma = true; G.step = function (a, b, c) { if (window.__ferma) return; return window.__step0(a, b, c); };
    return { id: C.id, tipo: C.tipo, via: C.via, nome: C.nome, x: C.x, y: C.y, a: C.a, gruppo: C.gruppo, n: C.piano.length, funziona: C.funziona, misure: C.misure, meta: C.meta, parti: [...new Set(C.piano.map(p => p[0]))], lati: V0.lati, punti: V0.punti, vie: window.__vie };
  }, incr = opt.incrocio ? +opt.incrocio : (opt.scena ? 4 : 0);
  let scelta = null;
  if (opt.scena) {
    const L = await page.evaluate(apri, [tipo, opt.via || null, incr, -1]); log('posti', JSON.stringify(L).slice(0, 900));
    for (let i = 0; L && L.siti && i < L.siti.length; i++) {
      const q = L.siti[i]; await page.evaluate(([q]) => { const st = window.__pv.st, p = st.player; p.x = q.x - Math.sin(q.a) * 7; p.y = q.y + Math.cos(q.a) * 7; p.vx = p.vy = 0; if (window.__pv.R.snap) window.__pv.R.snap(st); }, [q]);
      await page.waitForTimeout(5000);
      const r = await page.evaluate(([q]) => { const UP = window.UnicoParti, G = window.__pv.G, ax = -Math.sin(q.a), ay = Math.cos(q.a), nx = Math.cos(q.a), ny = Math.sin(q.a), roba = [];
        for (const b of UP.ostacoli(q.x, q.y, 16)) { const l = (b.x - q.x) * nx + (b.y - q.y) * ny, t = (b.x - q.x) * ax + (b.y - q.y) * ay; if (Math.abs(l) < q.w / 2 - .6 && Math.abs(t) < 13 && Math.max(b.hx, b.hy) > .5 && b.z1 < 3) roba.push(b.tag + ' ' + l.toFixed(1) + ',' + t.toFixed(1) + ' ' + b.hx.toFixed(1) + 'x' + b.hy.toFixed(1) + ' h' + b.z1.toFixed(1)); }
        // le reti arancio dei lavori in corso (render.js netFence1: un piano alto 1 m con la trama 32×32): non stanno in UP.ostacoli
        const sc = window.__pv.R.__models && window.__pv.R.__models.scene, v = new THREE.Vector3(), reti = new Map();
        const rete = im => { if (reti.has(im)) return reti.get(im); let ok = false; try { if (im && im.width === 32 && im.height === 32 && im.getContext) { const d = im.getContext('2d').getImageData(0, 0, 32, 2).data; ok = d[0] > 200 && d[1] > 80 && d[1] < 130 && d[2] < 60; } } catch (e) { } reti.set(im, ok); return ok; };
        if (sc) sc.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; const ms = [].concat(o.material || []); if (!ms.some(m => m && m.map && rete(m.map.image))) return;
          const P = o.geometry.attributes.position; o.updateWorldMatrix(true, false); for (let k = 0; k < P.count; k += 4) { v.fromBufferAttribute(P, k).applyMatrix4(o.matrixWorld); if (Math.hypot(v.x - q.x, v.z - q.y) < 15) { roba.push('rete ' + v.x.toFixed(0) + ',' + v.z.toFixed(0)); break; } } });
        return { roba }; }, [q]);
      // --evita x,y;x,y: posti da saltare (i lavori in corso di render.js, works1: le reti arancio sono fuse nella geometria statica e
      // non si trovano dalla pagina; per --scena il cantiere stradale di Via del Porto, che taglia la foto e chiude la carreggiata)
      for (const e of EVITA) if (Math.hypot(e[0] - q.x, e[1] - q.y) < 22) r.roba.push('evita ' + e.join(','));
      log('prova posto', i, q.via, q.punti, JSON.stringify(r)); if (!r.roba.length) { scelta = i; break; }
    }
    if (scelta === null) scelta = 0;
  }
  const C = await page.evaluate(apri, [tipo, opt.via || null, incr, scelta]);
  log('cantiere', JSON.stringify(C).slice(0, 600)); log('vie provate', JSON.stringify(C.vie || {}), 'lati', JSON.stringify(C.lati || {}));
  if (!C || !C.id) { await ctx.close(); return { n, errore: 'nessun cantiere', C, errori }; }
  // i tasselli attorno (la roba di strada si registra quando arriva): Nino lì vicino, qualche secondo, poi il controllo
  const camera = (tx, ty, k, lat) => page.evaluate(([tx, ty, k, lat]) => {
    const pv = window.__pv, st = pv.st, p = st.player, cam = pv.R.getCamera && pv.R.getCamera(); if (!cam) return null; const d = new THREE.Vector3(); cam.getWorldDirection(d); const L = Math.hypot(d.x, d.z) || 1, fx = d.x / L, fy = d.z / L;
    // un posto all'aperto per Nino: a piedi, lontano dalle case (2,5 m), fuori dai cantieri; se no si prova più in là o di lato
    const G = pv.G, libero = (x, y) => (!G.walkM || G.walkM(x, y)) && !st.vehicles.some(v => !v.hidden && Math.hypot(v.x - x, v.y - y) < 3.2) && !(window.Ingombri && Ingombri.casa(G, { cx: x, cz: y, a: 0, hu: 2.5, hv: 2.5 }, 0)) && !st.u.costruire.cantieri.some(C => !C.chiuso && window.UnicoParti.sat2(window.UnicoCostruire.rettDi(C, .8), { cx: x, cz: y, a: 0, hu: .3, hv: .3 }))
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
      const fronte = -Math.abs(Math.sin(C0.a) * f[0] - Math.cos(C0.a) * f[1]);   // la camera guarda lungo la via: lo striscione di traverso
      if (fronte < -.3) return { ok: 1, fronte: +fronte.toFixed(2) };
      // il presidio si riapre col verso nuovo: è lo stesso presidio, col nome già scelto (niente seconda cerimonia: i fumetti della prima
      // dicono quel nome); la comunità passa al cantiere nuovo
      const p = st.player; p.x = C0.x - f[0] * 9; p.y = C0.y - f[1] * 9; s.cantieri = []; const UCu = window.UnicoCultura, K = UCu && UCu.ON && st.u.cultura;
      if (K) UCu.CFG.nomeAllaNascita = false; const C = UC.tappa(st, { verso: f, R: 20 }); if (K) UCu.CFG.nomeAllaNascita = true; if (!C) return { no: UC.ultimoNo }; C.gruppo = C.gruppo.slice(0, 3);
      if (K && K.com['c:' + C0.id]) { const c = K.com['c:' + C0.id]; delete K.com['c:' + C0.id]; c.k = 'c:' + C.id; K.com[c.k] = c; } if (C0.nome) C.nome = C0.nome;
      return { id: C.id, tipo: C.tipo, via: C.via, x: C.x, y: C.y, a: C.a, gruppo: C.gruppo, n: C.piano.length, funziona: C.funziona, misure: C.misure, meta: C.meta, parti: [...new Set(C.piano.map(p => p[0]))], fronte: +fronte.toFixed(2) };
    }, [C.id, tipo]);
    log('verso', JSON.stringify(r).slice(0, 200)); if (r.ok || !r.id) break; Object.assign(C, r); await camera(C.x, C.y, 7, 0); await page.waitForTimeout(4000);
  }
  // la scena: il gruppo di guardia attorno; la rampa: un'auto salta; la catapulta: tira
  const stato = await page.evaluate(([id, sc]) => {
    const pv = window.__pv, st = pv.st, G = pv.G, UC = window.UnicoCostruire, UPr = window.UnicoPresidio, C = st.u.costruire.cantieri.find(x => x.id === id);
    const step = k => { for (let i = 0; i < k; i++) { window.__guardia(); window.__step0(st, .05, { x: 0, y: 0 }); } };
    let auto = null;
    // la via davanti e dietro libera dai mezzi fermi in mezzo alla carreggiata (l'Ape di Nino era parcheggiata lì): per la foto si tolgono
    const xi = Math.abs(C.varco[1]); for (const v of st.vehicles) { if (v.hidden || v.traffic) continue; const l = UC.locale(C, v.x, v.y); if (Math.abs(l.x) < xi + 1 && Math.abs(l.y) < 16) v.hidden = true; }
    // la barricata al capo lontano dalla camera, l'auto ferma oltre (la foto inquadra lì: sotto lo striscione, non dietro)
    if (sc.ora) st.t = Math.floor(st.t / 1440) * 1440 + 1440 + sc.ora * 60;
    if (sc.ore) { UPr.avanza(st, C, sc.ore, sc.quanti); const cam = pv.R.getCamera(), dv = new THREE.Vector3(); cam.getWorldDirection(dv);
      if (sc.chiusa && !UPr.chiudiOra(st, C, Math.sign(-Math.sin(C.a) * dv.x + Math.cos(C.a) * dv.z) || 1)) return { no: 'la barricata non ci sta' }; }
    else { C.vive = {}; C.gruppo.forEach((m, i) => { C.vive[m] = [i === 2 ? 'cucina' : 'chiacchiera', st.t, st.t + 120, 'f', null, null]; }); UPr.rifaiChi(st); }
    const metti = () => Object.keys(C.vive).forEach(m => { const n = G.byId(st, m); if (!n) return; n.inside = false; n.room = null; if (n.pop) { n.pop.near = true; n.pop.lod = 'vicino'; } const q = UPr.postoC(st, C, m); n.x = q.x; n.y = q.y; n.vx = n.vy = 0; if (n.pop) { n.pop.path = []; n.pop.emer = null; } n.path = []; n.face = q.face; });
    window.__metti = metti; metti(); step(6); metti(); step(2); metti();
    return { inStrada: Object.keys(C.vive).length, attivita: Object.values(C.vive).map(e => e[0]), auto: auto && auto.id, kind: auto && auto.kind, pezzi: C.pezzi.length + '/' + C.piano.length, dipinto: C.stato.dipinto || 0 };
  }, [C.id, sc]);
  log('scena', JSON.stringify(stato).slice(0, 400));
  // la camera non si tocca: Nino si mette in modo che la scena gli stia davanti nel verso in cui la camera guarda
  const bersaglio = await page.evaluate(([id, tipo]) => {
    const st = window.__pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), UV = window.UnicoPartiVivo;
    // la strada chiusa: al centro la barricata e, oltre, l'auto ferma (lo striscione resta davanti, in basso: non la copre)
    const K = C.meta.chiusa; if (K) { const w = window.UnicoParti.aMondo(C, 0, K.y + Math.sign(K.y) * 1.2); return { x: w.x, y: w.y, z: .8, k: 6.4, lat: 0, v: 300 }; }
    return { x: C.x, y: C.y, z: 1.2, k: 6.4, lat: 0, v: 330 };
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
  // l'auto che passa piano in mezzo (foto 2): fra Nino e lo striscione o oltre, mai addosso a Nino
  if (sc.ore) log('auto', JSON.stringify(await page.evaluate(([id]) => { const st = window.__pv.st, UC = window.UnicoCostruire, C = st.u.costruire.cantieri.find(x => x.id === id), l = UC.locale(C, st.player.x, st.player.y), K = C.meta.chiusa;
    // chiusa: un'auto arriva da fuori verso la barricata e si ferma (chi guida protesta); aperta: passa piano in mezzo, mai addosso a Nino.
    // Per la foto chi guida parla di sicuro (nel gioco le battute sono rade: UnicoPresidio.CFG.parla, parlaOgni)
    const UPr = window.UnicoPresidio; UPr.CFG.parla = { passa: 1, ferma: 1 }; UPr.CFG.parlaOgni = 0;
    const sg = K ? Math.sign(K.y) : 0, s0 = K ? K.y + sg * 4.6 : Math.max(C.F[1] - 2, Math.min(C.F[3] + 2, l.y - Math.sign(l.y || 1) * 4.2)), v = window.UnicoPresidio.passa(st, C, s0, K ? -sg : 1, K ? .6 : 2, Kv => (Kv.len || 4) >= 3.2); for (let i = 0; i < 4; i++) { window.__guardia(); window.__step0(st, .05, { x: 0, y: 0 }); }
    // chiusa: l'auto davanti alla barricata, a 2,4 m dal suo centro più mezza auto (dove si ferma da sé), poi un passo: si ferma e parla
    if (K && v && st.__upr && st.__upr.auto) { const Lv = ((pv => pv.G.VK || {})(window.__pv)[v.kind] || {}).len || 4; st.__upr.auto.s = K.y + sg * (Lv / 2 + 2.4); for (let i = 0; i < 2; i++) { window.__guardia(); window.__step0(st, .05, { x: 0, y: 0 }); } }
    window.__metti(); const D = window.UnicoPartiVivo.T(st).dette.slice(-1)[0]; return v ? { id: v.id, kind: v.kind, s0: +s0.toFixed(1), nino: +l.y.toFixed(1), dice: D && D.vid === v.id ? D.testo : null } : null; }, [C.id])));
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
    if (tipo !== 'presidio') C.gruppo.forEach(id2 => { const n = G.byId(st, id2); if (!n) return; const rf = (n.x - C.x) * f[0] + (n.y - C.y) * f[1]; if (rf >= 0) return; const x = n.x - 2 * rf * f[0], y = n.y - 2 * rf * f[1]; if (UC.puntoLibero(st, C, x, y)) { n.x = x; n.y = y; n.face = Math.atan2(C.y - y, C.x - x); } });
    return o;
  }, [C.id, tipo]);
  log('verso finale', JSON.stringify(giro)); if (giro.girato) await page.waitForTimeout(4000);
  const schermo = await page.evaluate(([id]) => { const pv = window.__pv, st = pv.st, C = st.u.costruire.cantieri.find(x => x.id === id), cam = pv.R.getCamera(), UV = window.UnicoPartiVivo, g = (x, y) => (pv.R.groundH ? pv.R.groundH(x, y) : 0);
    const pr = (x, y, z) => { const v = new THREE.Vector3(x, z, y).project(cam); return [+((v.x + 1) * 640).toFixed(0), +((1 - v.y) * 360).toFixed(0)]; };
    const o = { cantiere: pr(C.x, C.y, g(C.x, C.y) + .5), nome: C.nome };
    // il grigio misurato sullo schermo: dai punti di una griglia 9×5 al suolo (il raggio dalla camera al piano della via), la maschera del regime
    if (window.__maschera) { const rc = new THREE.Raycaster(), pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -g(C.x, C.y)), hit = new THREE.Vector3(); let mx = 0;
      for (let i = 0; i < 9; i++) for (let j = 0; j < 5; j++) { rc.setFromCamera(new THREE.Vector2(-.9 + i * .225, -.9 + j * .45), cam); if (rc.ray.intersectPlane(pl, hit)) mx = Math.max(mx, window.__maschera(hit.x, hit.z)); }
      o.grigioMax = +mx.toFixed(2); } const S = UV.T(st).salti[0], v = S && st.vehicles.find(k => k.id === S.vid); if (v) o.auto = pr(v.x, v.y, g(v.x, v.y) + (v.jz || 0) + .7); const P = UV.T(st).proj[0]; if (P) o.copertone = pr(P.x, P.y, P.z); return o; }, [C.id]);
  log('sullo schermo (1280×720)', JSON.stringify(schermo));
  const ver = await page.evaluate(verifica, [C.id, null]).catch(e => ({ errore: e.message }));
  // (verifica riceve un array: lo si spacchetta)
  const f = path.join(FOTOD, sc.f ? sc.f + '.jpg' : `presidio_${n}.jpg`);
  await page.evaluate(() => { window.__fermo = true; window.__disegna = true; });
  for (let k = 0; k < 4; k++) await page.evaluate(() => new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(ok)))));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: f, type: 'jpeg', quality: 86, timeout: 900000 });
  await page.evaluate(() => { window.__disegna = false; });
  const fatti = await page.evaluate(() => { const st = window.__pv.st; return Fatto.tutti(st).filter(x => /^(rivendica|presidio|multa|sgombero)/.test(x.v)).slice(-6).map(x => x.v + (x.x && x.x.misura ? ' (' + x.x.misura + ')' : '') + (x.x && x.x.m ? ' ' + x.x.m + ' m' : '')); });
  await ctx.close();
  log('foto', path.relative(ROOT, f), 'controllo', JSON.stringify(ver), 'fatti', JSON.stringify(fatti), 'errori', errori.length);
  return { n, scena: sc.nome, f: path.relative(ROOT, f), cantiere: C, uso: stato, controllo: ver, fatti, errori };
}

(async () => {
  const srv = await server(), port = srv.address().port;
  const browser = await chromium.launch({ headless: !opt.headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const out = [];
  for (const n of opt.solo ? String(opt.solo).split(',').map(Number) : Object.keys(SCENE).map(Number)) out.push(await foto(browser, port, n));
  const fr = path.join(__dirname, opt.scena ? 'scena_risultati.json' : 'presidio_risultati.json');
  let prima = []; try { prima = JSON.parse(fs.readFileSync(fr, 'utf8')); } catch (e) { }
  const tutti = prima.filter(x => !out.some(y => y.n === x.n)).concat(out).sort((a, b) => a.n - b.n);
  fs.writeFileSync(fr, JSON.stringify(tutti, null, 1));
  console.log(JSON.stringify(out.map(o => ({ n: o.n, f: o.f, pulito: o.controllo && o.controllo.pulito, errori: o.errori.length })), null, 1));
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
