// [resistenza] Prova di resistenza: il gioco vero (index.html) in Chromium senza testa, per N minuti di gioco simulato, con
// un copione per scheda e un browser per scheda (la memoria di ognuna si misura per conto suo). Solo misura: non tocca il gioco,
// salvo tre comodità dichiarate qui sotto (niente scadenza dello Squalo, salute piena, auto «prestate» per non finire in cella).
//   node strumenti/resistenza.js                       (da v7/; serve il gioco da sé con python3 -m http.server)
//   node strumenti/resistenza.js --schede=3 --minuti=20 --uscita=/percorso/cartella --url=http://127.0.0.1:8000/index.html
//   node strumenti/resistenza.js --logica=20 [--seme=N]   la sola logica del gioco in node: 20 minuti di gioco a passo fisso, stesse sonde (vedi logica())
// Copioni: A = a piedi (cammina, corre, clic a terra, porte, dentro e fuori dagli edifici)
//          B = in auto (salire col clic, guidare, scendere, viaggi lunghi da un capo all'altro)
//          C = zoom ai limiti, menu e Tasche/zaino, giorno e notte accelerati, visuale
// Registra: errori ed eccezioni della console (raggruppati), avvisi ripetuti, richieste fallite, perdita del contesto WebGL,
// memoria (performance.memory, renderer.info, nodi e ascoltatori del DOM, RSS dei processi del browser), fotogrammi oltre 50 ms
// (intervallo tra fotogrammi e lavoro JS di passo+grafica) con fase e posto, stati assurdi a campione (seduti che scivolano,
// gente e auto nei muri o sotto terra, auto ferme per sempre, ingressi negli edifici senza clic sulla porta).
// Guardia della memoria: se la memoria disponibile della macchina scende sotto 1,5 GB si chiude la scheda C (si resta a 2;
// il copione C passa alla scheda B), sotto 0,7 GB anche la B. Esce con codice 1 se ha trovato errori, contesti persi o stati assurdi.
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process'), net = require('net');
const { chromium } = require(process.env.PW || '/opt/node-tools/node_modules/playwright-core');

const ARG = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const ROOT = path.resolve(__dirname, '..');
const NSCHEDE = Math.max(1, Math.min(3, +(ARG.schede || 3)));
const MINUTI = +(ARG.minuti || 20);
const VW = +(ARG.vw || 800), VH = +(ARG.vh || 500);
const OUT = path.resolve(ARG.uscita || path.join(ROOT, 'reports', 'resistenza'));
const SOGLIA_MB = +(ARG.soglia || 1500), SOGLIA2_MB = +(ARG.soglia2 || 700);
const CAMPIONE_S = 5, ASSURDI_S = 20;
fs.mkdirSync(OUT, { recursive: true });
const T0 = Date.now(), sec = () => +((Date.now() - T0) / 1000).toFixed(1);
const LOGF = fs.createWriteStream(path.join(OUT, 'diario.txt'));
const SCRIVI = console.log.bind(console);   // il nostro diario non passa dai filtri della console che --logica mette al gioco
const log = (...a) => { const s = `[${sec().toFixed(0).padStart(5)} s] ` + a.join(' '); SCRIVI(s); LOGF.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// la memoria che resta davvero: la minore tra quella della macchina (MemAvailable) e il margine del gruppo di controllo (cgroup) in cui
// gira la prova (limite - uso, senza la cache dei file che si può liberare): sulle macchine condivise è il gruppo a decidere l'OOM
function cgroupMargine() {
  try { const cg = fs.readFileSync('/proc/self/cgroup', 'utf8'); let m = /^\d+:memory:(.*)$/m.exec(cg);
    if (m) { const d = '/sys/fs/cgroup/memory' + m[1], lim = +fs.readFileSync(d + '/memory.limit_in_bytes', 'utf8'), use = +fs.readFileSync(d + '/memory.usage_in_bytes', 'utf8'), st = fs.readFileSync(d + '/memory.stat', 'utf8'), ina = +((/^total_inactive_file (\d+)/m.exec(st) || /^inactive_file (\d+)/m.exec(st) || [0, 0])[1]); if (lim < 1e18) return Math.round((lim - use + ina) / 1048576); }
    m = /^0::(.*)$/m.exec(cg); if (m) { const d = '/sys/fs/cgroup' + m[1], mx = fs.readFileSync(d + '/memory.max', 'utf8').trim(); if (mx !== 'max') { const st = fs.readFileSync(d + '/memory.stat', 'utf8'), ina = +((/^inactive_file (\d+)/m.exec(st) || [0, 0])[1]); return Math.round((+mx - +fs.readFileSync(d + '/memory.current', 'utf8') + ina) / 1048576); } } } catch (e) { }
  return Infinity;
}
const memDisp = () => { let a; try { const m = /MemAvailable:\s+(\d+)/.exec(fs.readFileSync('/proc/meminfo', 'utf8')); a = Math.round(+m[1] / 1024); } catch (e) { a = os.freemem() / 1048576 | 0; } return Math.min(a, cgroupMargine()); };
// RSS di tutto l'albero di processi di un browser (il renderer, la scheda video SwiftShader, il resto)
function rssAlbero(pid) {
  try {
    const kids = {}; for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const s = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), pp = +s.slice(s.lastIndexOf(')') + 2).split(' ')[1]; (kids[pp] = kids[pp] || []).push(+d); } catch (e) { } }
    let tot = 0, rend = 0, gpu = 0; const walk = p => { try { const st = fs.readFileSync(`/proc/${p}/status`, 'utf8'), r = +(/VmRSS:\s+(\d+)/.exec(st) || [0, 0])[1]; tot += r; const cl = fs.readFileSync(`/proc/${p}/cmdline`, 'utf8'); if (/type=renderer/.test(cl)) rend += r; if (/type=gpu-process/.test(cl)) gpu += r; } catch (e) { } (kids[p] || []).forEach(walk); };
    walk(pid); return { tot: Math.round(tot / 1024), renderer: Math.round(rend / 1024), gpu: Math.round(gpu / 1024) };
  } catch (e) { return null; }
}

const PRESI = new Set();
// dove comincia ogni modulo in index.html (come build.py e sonda_memoria.js): riga della pagina → [modulo, riga nel modulo]
const SPANS = (() => { try { const html = fs.readFileSync(path.join(ROOT, 'src/index.src.html'), 'utf8'), sp = []; let out = '', last = 0; const re = /\/\*([a-z_.0-9]+\.js)\*\//g; let m;
  while ((m = re.exec(html))) { out += html.slice(last, m.index); last = m.index + m[0].length; if (m[1] === 'studio.js') continue; let src = ''; try { src = fs.readFileSync(path.join(ROOT, 'src', m[1]), 'utf8'); } catch (e) { } const l0 = out.split('\n').length; out += src; sp.push([l0, out.split('\n').length, m[1]]); } return sp; } catch (e) { return []; } })();
const modulo = ln0 => { const ln = ln0 + 1, s = SPANS.find(q => ln >= q[0] && ln < q[1]); return s ? [s[2], ln - s[0] + 1] : ['index.html', ln]; };
function figliBrowser() { const o = []; for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const st = fs.readFileSync(`/proc/${d}/stat`, 'utf8'), pp = +st.slice(st.lastIndexOf(')') + 2).split(' ')[1]; if (pp !== process.pid) continue; const cl = fs.readFileSync(`/proc/${d}/cmdline`, 'utf8'); if (/chrom|headless_shell/.test(cl)) o.push(+d); } catch (e) { } } return o; }

// ------------------------------------------------------------------ dentro la pagina
function initQA() {
  const Q = window.__qa = { t0: performance.now(), fase: 'carico', posto: '', n: 0, lunghi: [], perFase: {}, lost: [], restored: [], ingressi: [], uscite: 0, pos: {}, nWork: 0 };
  const now = () => +((performance.now() - Q.t0) / 1000).toFixed(1);
  const gc0 = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    const c = gc0.apply(this, arguments);
    if (c && /webgl/.test(String(type)) && !this.__qaL) { this.__qaL = 1; const cv = this;
      cv.addEventListener('webglcontextlost', () => Q.lost.push({ t: now(), fase: Q.fase, posto: Q.posto, w: cv.width, h: cv.height, id: cv.id || '' }));
      cv.addEventListener('webglcontextrestored', () => Q.restored.push({ t: now(), fase: Q.fase })); }
    return c;
  };
  const F = { last: 0, work: 0 };
  const stat = f => Q.perFase[f] || (Q.perFase[f] = { n: 0, o50: 0, o100: 0, o250: 0, o1000: 0, w50: 0, w100: 0, w250: 0, max: 0, wmax: 0, somma: 0, wsomma: 0, gaps: [] });
  const tick = () => {
    const t = performance.now();
    if (F.last && Q.fase !== 'carico') {
      const g = t - F.last, w = F.work, S = stat(Q.fase); S.n++; S.somma += g; S.wsomma += w; Q.n++;
      if (g > 50) S.o50++; if (g > 100) S.o100++; if (g > 250) S.o250++; if (g > 1000) S.o1000++;
      if (w > 50) S.w50++; if (w > 100) S.w100++; if (w > 250) S.w250++;
      if (g > S.max) S.max = g; if (w > S.wmax) S.wmax = w; if (S.gaps.length < 4000) S.gaps.push(Math.round(g));
      if (w > 50 || g > 250) { let p = null; try { const st = window.__pv.st, pl = st.player; p = { x: Math.round(pl.x), y: Math.round(pl.y), in: pl.indoor ? pl.indoor.b : null, auto: pl.vehicle || null, zoom: +(window.__pv.ui.zoom || 0).toFixed(2), ora: window.__pv.G.clockStr ? window.__pv.G.clockStr(st.t) : '' }; } catch (e) { }
        Q.lunghi.push({ t: now(), gap: Math.round(g), lavoro: Math.round(w), passo: Math.round(F.step || 0), programmi_nuovi: F.prog || 0, fase: Q.fase, posto: Q.posto, p });
        if (Q.lunghi.length > 1500) { Q.lunghi.sort((a, b) => b.lavoro - a.lavoro); Q.lunghi.length = 800; } }
    }
    F.last = t; F.work = 0; F.step = 0; F.prog = 0; requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const hook = () => {
    const pv = window.__pv; if (!pv || !pv.G || !pv.R || !pv.R.frame || !pv.st) { setTimeout(hook, 300); return; }
    const G = pv.G, R = pv.R, s0 = G.step, f0 = R.frame;
    G.step = function (st, dt, inp) {
      const p = st.player, prima = p.indoor ? p.indoor.b : null, c = pv.click && pv.click.t, kind = c ? c.kind : null, tasti = Object.keys(pv.keys || {}).filter(k => pv.keys[k]).join('+');
      const t = performance.now(); let r; try { r = s0.apply(this, arguments); } finally { const d = performance.now() - t; F.work += d; F.step = (F.step || 0) + d; }
      const dopo = p.indoor ? p.indoor.b : null;
      if (prima === null && dopo !== null) Q.ingressi.push({ t: now(), fase: Q.fase, posto: Q.posto, b: dopo, clic: kind, cliccata: c && c.kind === 'door' ? c.bi : null, tasti, noDoor: inp && inp.noDoor, x: Math.round(p.x), y: Math.round(p.y), atteso: Q.atteso || null });
      if (prima !== null && dopo === null) Q.uscite++;
      return r;
    };
    const rdq = () => { try { return R.__models.renderer.info.programs.length; } catch (e) { return 0; } };
    R.frame = function () { const t = performance.now(), p0 = rdq(); try { return f0.apply(this, arguments); } finally { F.work += performance.now() - t; F.prog = rdq() - p0; } };
    Q.agganciato = now();
  };
  hook();
  // le misure di adesso (memoria, scena, DOM)
  Q.campione = () => {
    const pv = window.__pv, R = pv && pv.R, rd = R && R.__models && R.__models.renderer, st = pv && pv.st, o = { t: now(), fase: Q.fase, posto: Q.posto, frames: Q.n };
    if (performance.memory) { o.heap = Math.round(performance.memory.usedJSHeapSize / 1048576); o.heapTot = Math.round(performance.memory.totalJSHeapSize / 1048576); }
    if (rd) { const I = rd.info; o.geo = I.memory.geometries; o.tex = I.memory.textures; o.prog = I.programs ? I.programs.length : 0; o.calls = I.render.calls; o.tris = I.render.triangles;
      try { o.perso = rd.getContext().isContextLost(); } catch (e) { o.perso = 'errore'; } }
    try { o.scena = R.__models.scene.children.length; } catch (e) { }
    o.dom = document.getElementsByTagName('*').length;
    if (st) { const p = st.player; o.p = { x: Math.round(p.x), y: Math.round(p.y), in: p.indoor ? p.indoor.b : null, auto: p.vehicle, hp: Math.round(p.hp), lv: p.lv ? p.lv.k : null, swim: !!p.swim }; o.ora = pv.G.clockStr(st.t); o.notte = +(R.nightLevel ? R.nightLevel() : 0).toFixed(2); o.npc = st.npcs.length; o.veicoli = st.vehicles.length; o.zoom = +(pv.ui.zoom || 0).toFixed(2); o.res = R.res; o.over = !!st.over; }
    return o;
  };
  // stati assurdi a campione
  Q.assurdi = () => {
    const pv = window.__pv, st = pv.st, G = pv.G, R = pv.R, TS = G.TS, T = G.T, TN = {}; for (const k in T) TN[T[k]] = k;
    const tile = (x, y) => TN[G.tileAt(Math.floor(x / TS), Math.floor(y / TS))];
    const SOLIDI = { BLD: 1, CLIFF: 1, FOUNT: 1, TREE: 1 }, SEDUTI = { siede: 1, siede_terra: 1, dorme: 1, tavola: 1, carte: 1, bancone: 0 };
    const p = st.player, out = { t: now(), fase: Q.fase, posto: Q.posto, seduti_in_moto: [], gente_nei_muri: [], gente_sottoterra: [], gente_fuori_mondo: [], auto_nei_muri: [], auto_sottoterra: [], auto_in_mare: [], giocatore: [], vicini: 0 };
    const t1 = performance.now();
    for (const n of st.npcs) {
      if (n.dead) continue;
      if (!isFinite(n.x) || !isFinite(n.y) || n.x < 0 || n.y < 0 || n.x > G.WW || n.y > G.WH) { out.gente_fuori_mondo.push({ id: n.id, x: n.x, y: n.y }); continue; }
      if (n.inside || n.inVeh || n.room) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y); if (d > 120) continue; out.vicini++;
      const tl = tile(n.x, n.y);
      if (SOLIDI[tl] && !n.wrH && !(n.lv)) out.gente_nei_muri.push({ id: n.id, pas: !!n.passante, x: +n.x.toFixed(1), y: +n.y.toFixed(1), casella: tl, azione: n.action && n.action.name, d: Math.round(d) });
      let act = null; try { act = window.Anim ? (Anim.npcState(st, n) || {}).act : null; } catch (e) { }
      const pr = Q.pos[n.id]; Q.pos[n.id] = { x: n.x, y: n.y, act, t: performance.now() };
      if (pr && act && SEDUTI[act] && pr.act && SEDUTI[pr.act] && performance.now() - pr.t < 4000) { const m = Math.hypot(n.x - pr.x, n.y - pr.y); if (m > .3) out.seduti_in_moto.push({ id: n.id, pas: !!n.passante, act, spostato_m: +m.toFixed(2), in_s: +((performance.now() - pr.t) / 1000).toFixed(1), speedNow: +(n.speedNow || 0).toFixed(2), azione: n.action && n.action.name, x: Math.round(n.x), y: Math.round(n.y) }); }
      else if (act && SEDUTI[act] && Math.abs(n.speedNow || 0) > .3) out.seduti_in_moto.push({ id: n.id, act, speedNow: +n.speedNow.toFixed(2), x: Math.round(n.x), y: Math.round(n.y) });
    }
    // figure in scena sotto il terreno
    try { const S = R.__models.scene; S.children.forEach(g => { if (!g.visible || !g.userData || !('who' in g.userData) || g.userData.inRoom) return; const x = g.position.x, z = g.position.z; if (Math.hypot(x - p.x, z - p.y) > 120) return; const h = R.groundH(x, z); if (g.position.y < h - .3) out.gente_sottoterra.push({ x: Math.round(x), z: Math.round(z), y: +g.position.y.toFixed(2), suolo: +h.toFixed(2) }); }); } catch (e) { out.errore_figure = String(e).slice(0, 120); }
    const VM = R.__vehicles || {};
    for (const v of st.vehicles) {
      if (v.hidden || v.wreck) continue; const d = Math.hypot(v.x - p.x, v.y - p.y);
      const tl = tile(v.x, v.y), K = G.VK[v.kind] || {};
      if (SOLIDI[tl]) out.auto_nei_muri.push({ id: v.id, kind: v.kind, traffico: !!v.traffic, x: +v.x.toFixed(1), y: +v.y.toFixed(1), casella: tl, d: Math.round(d), vel: +(v.speed || 0).toFixed(1) });
      if (tl === 'WATER' && !K.boat && !(G.seaM && !G.seaM(v.x, v.y))) out.auto_in_mare.push({ id: v.id, kind: v.kind, x: Math.round(v.x), y: Math.round(v.y), d: Math.round(d) });
      const m = VM[v.id]; if (m && m.visible && m.position && d < 120) { const h = R.groundH(v.x, v.y); if (m.position.y < h - .4) out.auto_sottoterra.push({ id: v.id, kind: v.kind, y: +m.position.y.toFixed(2), suolo: +h.toFixed(2), x: Math.round(v.x), z: Math.round(v.y) }); }
    }
    if (!p.indoor && !p.vehicle && !p.lv && !p.swim && !G.walkM(p.x, p.y)) out.giocatore.push({ cosa: 'giocatore in casella non calpestabile', casella: tile(p.x, p.y), x: +p.x.toFixed(1), y: +p.y.toFixed(1) });
    try { const pg0 = R.__models.scene.children.find(g => g.userData && g === (R.__anim2 && null)); } catch (e) { }
    // il traffico: posizioni per riconoscere chi è fermo da sempre (lo fa il copione, qui solo i dati)
    out.traffico = st.vehicles.filter(v => v.traffic && !v.hidden && !v.wreck).map(v => [v.id, +v.x.toFixed(1), +v.y.toFixed(1), +(v.speed || 0).toFixed(2), Math.round(Math.hypot(v.x - p.x, v.y - p.y)), v.stuck ? +(+v.stuck).toFixed(1) : 0, v.kind]);
    out.ms = +(performance.now() - t1).toFixed(1);
    return out;
  };
}

// ------------------------------------------------------------------ il server
function libera() { return new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); }); }
async function server() {
  if (ARG.url) return { url: ARG.url, stop() { } };
  const port = await libera(), py = cp.spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { await sleep(200); const ok = await new Promise(r => { const c = net.connect(port, '127.0.0.1', () => { c.end(); r(true); }); c.on('error', () => r(false)); }); if (ok) break; }
  return { url: `http://127.0.0.1:${port}/index.html${ARG.query || ''}`, stop() { try { py.kill(); } catch (e) { } } };
}

// ------------------------------------------------------------------ una scheda
class Scheda {
  constructor(nome, copione) { this.nome = nome; this.copioni = [copione]; this.err = new Map(); this.richieste = new Map(); this.campioni = []; this.assurdi = []; this.azioni = []; this.traffico = new Map(); this.chiusa = false; this.note = []; this.rss = []; }
  L(...a) { log(`[${this.nome}]`, ...a); }
  async apri(url) {
    this.b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'] });
    this.pid = figliBrowser().find(q => !PRESI.has(q)) || null; if (this.pid) PRESI.add(this.pid);   // il processo principale di questo browser (figlio di node)
    this.ctx = await this.b.newContext({ viewport: { width: VW, height: VH } });
    this.pg = await this.ctx.newPage(); const pg = this.pg;
    this.cdp = await this.ctx.newCDPSession(pg); await this.cdp.send('Performance.enable').catch(() => { });
    const nota = (tipo, testo, extra) => { const k = tipo + ' ' + testo.replace(/\d+(\.\d+)?/g, '#').slice(0, 220); const e = this.err.get(k); if (e) { e.n++; e.ultimo = sec(); } else this.err.set(k, { tipo, testo: testo.slice(0, 600), n: 1, primo: sec(), ultimo: sec(), fase: this.faseOra || 'carico', extra }); };
    pg.on('pageerror', e => nota('eccezione', e.message, (e.stack || '').split('\n').slice(0, 6).join(' | ')));
    pg.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'assert') { const l = m.location(); nota(t === 'warning' ? 'avviso' : 'errore', m.text(), l && l.url ? `${l.url.split('/').pop()}:${l.lineNumber}` : ''); } });
    pg.on('response', r => { if (r.status() >= 400) { const u = r.url().replace(/^https?:\/\/[^/]+/, ''); this.richieste.set(u, (this.richieste.get(u) || 0) + 1); } });
    pg.on('requestfailed', r => { const u = 'FALLITA ' + r.url().replace(/^https?:\/\/[^/]+/, '') + ' ' + (r.failure() || {}).errorText; this.richieste.set(u, (this.richieste.get(u) || 0) + 1); });
    pg.on('crash', () => { this.crash = sec(); this.L('LA PAGINA È MORTA (crash del renderer)'); nota('crash', 'crash del renderer'); });
    await pg.addInitScript(initQA);
    this.L('apro', url); const t = Date.now();
    await pg.goto(url, { timeout: 600000, waitUntil: 'domcontentloaded' });
    const morta = new Promise((_, j) => pg.once('crash', () => j(new Error('il renderer è morto durante il caricamento (OOM?) a ' + sec() + ' s'))));
    await Promise.race([pg.waitForFunction(() => window.__pv && window.__pv.st && window.__pv.R && window.__pv.R.__models && window.__pv.R.__models.renderer, null, { timeout: 1200000, polling: 2000 }), morta]);
    this.L('motore pronto in', ((Date.now() - t) / 1000).toFixed(0), 's');
    for (let i = 0; i < 240; i++) { if (this.crash) throw new Error('il renderer è morto prima di entrare in gioco'); const s = await this.ev(() => ({ intro: window.__pv.ui.intro, t: window.__pv.ui.time }), null, 30000).catch(() => null); if (s && !s.intro) break; if (i % 6 === 5) await this.pg.keyboard.press('Enter').catch(() => { }); await sleep(5000); }
    this.caricamento_s = Math.round((Date.now() - t) / 1000);
    this.L('in gioco dopo', this.caricamento_s, 's');
    await this.ev(() => { const st = window.__pv.st; st.deadline = 1e9; setInterval(() => { try { const s = window.__pv.st; s.deadline = 1e9; if (s.player.hp < 60) s.player.hp = 100; } catch (e) { } }, 2000); });
    this.box = await pg.evaluate(() => { const r = document.getElementById('cv').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  }
  ev(fn, arg, ms = 90000) { return Promise.race([this.pg.evaluate(fn, arg), new Promise((_, j) => setTimeout(() => j(new Error('evaluate oltre ' + ms / 1000 + ' s')), ms))]); }
  async fase(f, posto) { this.faseOra = f; await this.ev(([f, p]) => { window.__qa.fase = f; if (p !== undefined) window.__qa.posto = p; }, [f, posto]).catch(() => { }); }
  azione(cosa, esito) { this.azioni.push({ t: sec(), fase: this.faseOra, cosa, esito }); this.L(cosa, esito === undefined ? '' : JSON.stringify(esito).slice(0, 220)); }
  // il profilo del processore a pezzi di 2 minuti: il tempo proprio per funzione e per modulo (src/*.js), sommato su tutta la prova
  async profilo() {
    if (this.chiusa || !this.cdp || this.__prof) return; this.__prof = 1;
    try {
      if (this.profOn) { const { profile } = await this.cdp.send('Profiler.stop'); this.profOn = false; const byId = new Map(profile.nodes.map(n => [n.id, n])), dts = profile.timeDeltas, P = this.prof || (this.prof = { fn: {}, mod: {}, tot: 0 });
        profile.samples.forEach((id, i) => { const n = byId.get(id), cf = n.callFrame, d = (dts[i] || 0) / 1000; let mod = cf.url ? cf.url.split('/').pop().split('?')[0] : '(' + (cf.functionName || 'interno') + ')', ln = cf.lineNumber + 1;
          if (/index\.html$/.test(mod)) { const m = modulo(cf.lineNumber); mod = m[0]; ln = m[1]; } const k = (cf.functionName || '(anonima)') + ' ' + mod + ':' + ln; P.fn[k] = (P.fn[k] || 0) + d; P.mod[mod] = (P.mod[mod] || 0) + d; P.tot += d; }); }
      await this.cdp.send('Profiler.enable'); await this.cdp.send('Profiler.setSamplingInterval', { interval: 4000 }); await this.cdp.send('Profiler.start'); this.profOn = true;
    } catch (e) { this.note.push({ t: sec(), profilo: String(e.message).slice(0, 120) }); } finally { this.__prof = 0; }
  }
  async campiona() {
    if (this.chiusa) return; const o = await this.ev(() => window.__qa.campione(), null, 60000).catch(e => ({ errore: String(e.message).slice(0, 100) }));
    o.s = sec(); const m = await this.cdp.send('Performance.getMetrics').catch(() => null); if (m) { const g = k => (m.metrics.find(q => q.name === k) || {}).value; o.nodi = g('Nodes'); o.ascoltatori = g('JSEventListeners'); o.heapCdp = Math.round((g('JSHeapUsedSize') || 0) / 1048576); }
    o.rss = this.pid ? rssAlbero(this.pid) : null; o.memLibera = memDisp(); o.carico = +os.loadavg()[0].toFixed(1);
    this.campioni.push(o);
  }
  async controllaAssurdi() {
    if (this.chiusa) return;
    const a = await this.ev(() => window.__qa.assurdi(), null, 60000).catch(e => ({ errore: String(e.message).slice(0, 160) }));
    await sleep(1200);
    const b = await this.ev(() => window.__qa.assurdi(), null, 60000).catch(e => ({ errore: String(e.message).slice(0, 160) }));
    for (const x of [a, b]) {
      if (x.errore) { this.note.push({ t: sec(), errore_sonda: x.errore }); continue; }
      const nowS = sec();
      for (const [id, vx, vy, spd, d, stuck, kind] of x.traffico || []) {
        const T = this.traffico.get(id); if (!T || Math.hypot(T.x - vx, T.y - vy) > 1) this.traffico.set(id, { x: vx, y: vy, da: nowS, d, kind, stuck }); else { T.d = d; T.stuck = stuck; T.ultimo = nowS; }
      }
      delete x.traffico; const tot = ['seduti_in_moto', 'gente_nei_muri', 'gente_sottoterra', 'gente_fuori_mondo', 'auto_nei_muri', 'auto_sottoterra', 'auto_in_mare', 'giocatore'].reduce((s, k) => s + (x[k] || []).length, 0);
      x.s = nowS; if (tot) this.assurdi.push(x);
    }
  }
  // --------- strumenti del copione
  async stato() { return this.ev(() => { const pv = window.__pv, st = pv.st, p = st.player; return { x: p.x, y: p.y, in: p.indoor ? p.indoor.b : null, f: p.indoor ? p.indoor.f : null, auto: p.vehicle, lv: p.lv ? p.lv.k : null, clic: pv.click.t ? pv.click.t.kind : null, zoom: pv.ui.zoom, menu: !!pv.ui.menu, book: !!pv.ui.book, dialog: !!pv.ui.dialog, t: st.t, time: pv.ui.time, over: !!st.over }; }); }
  async schermo(x, h, y) { const q = await this.ev(([x, h, y]) => { const pr = window.__pv.R.project(x, h, y); return pr.behind ? null : pr; }, [x, h, y]); if (!q || q.x < .02 || q.x > .98 || q.y < .04 || q.y > .96) return null; return { x: this.box.x + q.x * this.box.w, y: this.box.y + q.y * this.box.h }; }
  async clic(px, py, doppio) { await this.pg.mouse.move(px, py); if (doppio) await this.pg.mouse.dblclick(px, py); else await this.pg.mouse.click(px, py); }
  async pulito() { await this.ev(() => { const pv = window.__pv; if (pv.ui.dialog) { const b = document.querySelector('#dialog .opt:last-child'); if (b) b.click(); } if (pv.ui.book) pv.book(false); }).catch(() => { }); const s = await this.stato().catch(() => null); if (s && (s.menu || s.dialog)) { await this.pg.keyboard.press('Escape'); await sleep(400); } }
  async tieni(tasti, ms) { for (const k of tasti) await this.pg.keyboard.down(k); await sleep(ms); for (const k of tasti.slice().reverse()) await this.pg.keyboard.up(k); }
  // salto (come le altre prove): il giocatore e la camera vanno lì, a piedi, all'ora che c'è
  async salta(x, y, nome) { await this.ev(([x, y]) => { const pv = window.__pv, st = pv.st, p = st.player; if (p.vehicle) pv.act('veicolo'); p.x = x; p.y = y; p.indoor = null; p.vehicle = null; p.lv = null; pv.click.t = null; if (pv.R.cam) { pv.R.cam.x = x; pv.R.cam.y = y; } }, [x, y]); await this.fase(this.faseOra, nome); }
  async posti() { return this.ev(() => { const P = window.__pv.G.PLACES; return Object.entries(P).map(([k, v]) => [k, Math.round(v.x), Math.round(v.y)]); }); }
  // punta il mouse verso un punto del mondo (per W) da 6-10 m davanti, dentro lo schermo
  async punta(x, y, dist = 8) { const s = await this.stato(); const a = Math.atan2(y - s.y, x - s.x); for (const d of [dist, dist * .6, 4, 2.5]) { const q = await this.schermo(s.x + Math.cos(a) * d, 0, s.y + Math.sin(a) * d); if (q) { await this.pg.mouse.move(q.x, q.y); return true; } } return false; }
  async attendi(cond, ms, passo = 1000) { const t = Date.now(); while (Date.now() - t < ms) { const s = await this.stato().catch(() => null); if (s && cond(s)) return s; await sleep(passo); } return null; }
}

// ------------------------------------------------------------------ i copioni
const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const COPIONI = {
  // A: a piedi
  A: [
    async S => { // camminare e correre coi tasti, verso il puntatore
      await S.fase('A:cammina'); const s = await S.stato(); if (s.auto) { await S.pg.keyboard.press('f'); await sleep(1500); }
      const a = rnd(0, 6.28); await S.punta(s.x + Math.cos(a) * 30, s.y + Math.sin(a) * 30);
      const corsa = Math.random() < .5; await S.tieni(corsa ? ['Shift', 'w'] : ['w'], rnd(3000, 7000)); await S.tieni([pick(['a', 'd'])], rnd(800, 2000));
      const e = await S.stato(); S.azione(corsa ? 'corre coi tasti' : 'cammina coi tasti', { m: +Math.hypot(e.x - s.x, e.y - s.y).toFixed(1), dentro: e.in });
    },
    async S => { // clic per terra (singolo e doppio), si aspetta l'arrivo
      await S.fase('A:clic-terra'); const s0 = await S.stato(); if (s0.auto) return;
      const px = S.box.x + S.box.w * rnd(.2, .8), py = S.box.y + S.box.h * rnd(.25, .8), dbl = Math.random() < .4;
      const g = await S.ev(([nx, ny]) => window.__pv.pickAt(nx, ny), [(px - S.box.x) / S.box.w, (py - S.box.y) / S.box.h]).catch(() => null);
      await S.clic(px, py, dbl); await S.ev(() => { window.__qa.atteso = 'clic-terra'; });
      const e = await S.attendi(s => !s.clic, 25000); await S.ev(() => { window.__qa.atteso = null; });
      const f = await S.stato(); S.azione(dbl ? 'doppio clic a terra' : 'clic a terra', { colpito: g && g.kind, arrivo: g && g.x !== undefined ? +Math.hypot(f.x - g.x, f.y - g.y).toFixed(1) : null, fermo_entro_25s: !!e, entrato: f.in !== s0.in ? f.in : undefined });
    },
    async S => { // clic sulla porta più vicina inquadrata: deve entrare; poi giro dentro e si esce camminando verso la porta
      await S.fase('A:porta'); const s = await S.stato(); if (s.auto || s.in !== null) return;
      const porte = await S.ev(([px, py]) => { const G = window.__pv.G, TS = G.TS, o = []; G.BUILDINGS.forEach((b, i) => { if (!b.door) return; const x = (b.door[0] + .5) * TS, y = (b.door[1] + .5) * TS, d = Math.hypot(x - px, y - py); if (d < 30 && d > 2) o.push({ i, x, y, d, b }); }); o.sort((a, b) => a.d - b.d); return o.slice(0, 8).map(q => { const b = q.b, dx = b.door[0], dy = b.door[1]; let fx, fy; if (dy === b.y + b.h) { fx = (dx + .5) * TS; fy = dy * TS; } else if (dy === b.y - 1) { fx = (dx + .5) * TS; fy = (dy + 1) * TS; } else if (dx === b.x + b.w) { fx = dx * TS; fy = (dy + .5) * TS; } else { fx = (dx + 1) * TS; fy = (dy + .5) * TS; } return { i: q.i, x: q.x, y: q.y, fx, fy, d: Math.round(q.d), nome: b.name || b.use || '' }; }); }, [s.x, s.y]);
      for (const D of porte) {
        const q = await S.schermo(D.fx, 1.2, D.fy); if (!q) continue;
        const h = await S.ev(([nx, ny]) => { const r = window.__pv.pickAt(nx, ny); return r && { kind: r.kind, bi: r.bi }; }, [(q.x - S.box.x) / S.box.w, (q.y - S.box.y) / S.box.h]);
        if (!h || h.kind !== 'door') { S.note.push({ t: sec(), cosa: 'porta inquadrata ma il clic al centro non la prende', porta: D, preso: h }); continue; }
        await S.ev(i => { window.__qa.atteso = 'porta ' + i; }, D.i); await S.clic(q.x, q.y, Math.random() < .3);
        const e = await S.attendi(s => s.in !== null || !s.clic, 40000); const f = await S.stato(); await S.ev(() => { window.__qa.atteso = null; });
        S.azione('clic sulla porta', { porta: D.i, nome: D.nome, d: D.d, entrato: f.in, giusta: f.in === D.i, attesa_finita: !!e });
        if (f.in === null) { S.note.push({ t: sec(), cosa: 'clic sulla porta senza entrare', porta: D, stato: f }); return; }
        await S.fase('A:dentro', 'edificio ' + f.in);
        for (let k = 0; k < 3; k++) { const px = S.box.x + S.box.w * rnd(.3, .7), py = S.box.y + S.box.h * rnd(.3, .7); await S.clic(px, py); await S.attendi(s => !s.clic, 8000); }
        // fuori: verso l'uscita (la casella fuori dalla porta), tenendo W; se non basta, ci si clicca sopra
        const L = await S.ev(() => { const pv = window.__pv, st = pv.st, p = st.player, L = pv.G.INT.layout(pv.G.BUILDINGS[p.indoor.b]); if (p.indoor.f) return { su: p.indoor.f, ent: L.ent }; return { ent: L.ent }; });
        if (L.su) S.note.push({ t: sec(), cosa: 'dopo i clic dentro casa il giocatore è al piano ' + L.su });
        const t0 = Date.now(); let fuori = null;
        while (Date.now() - t0 < 45000) { if (!L.ent) break; const s1 = await S.stato(); if (s1.in === null) { fuori = s1; break; } await S.punta(L.ent.out[0], L.ent.out[1], 3); await S.tieni(['w'], 2500); const q2 = await S.schermo(L.ent.in[0], 0, L.ent.in[1]); if (q2 && Date.now() - t0 > 20000) { await S.clic(q2.x, q2.y); await sleep(3000); } }
        if (!fuori) { const s2 = await S.stato(); S.note.push({ t: sec(), cosa: 'non riesce a uscire in 45 s camminando verso la porta', edificio: s2.in, piano: s2.f, x: +s2.x.toFixed(1), y: +s2.y.toFixed(1) }); await S.ev(() => window.__pv.G.exitBuilding(window.__pv.st)); }
        S.azione('uscito', { a_piedi: !!fuori, s: ((Date.now() - t0) / 1000).toFixed(0) });
        await S.fase('A:porta', ''); return;
      }
      S.azione('nessuna porta cliccabile qui', { porte: porte.length });
    },
    async S => { // clic per terra accanto a una porta (non sulla porta): NON deve entrare
      await S.fase('A:accanto-porta'); const s = await S.stato(); if (s.auto || s.in !== null) return;
      const D = await S.ev(([px, py]) => { const G = window.__pv.G, TS = G.TS; let best = null, bd = 30; G.BUILDINGS.forEach((b, i) => { if (!b.door) return; const x = (b.door[0] + .5) * TS, y = (b.door[1] + .5) * TS, d = Math.hypot(x - px, y - py); if (d < bd && d > 3) { bd = d; best = { i, x, y, side: b.door[1] === b.y + b.h || b.door[1] === b.y - 1 ? 'ns' : 'ew' }; } }); return best; }, [s.x, s.y]);
      if (!D) return; const off = (Math.random() < .5 ? -1 : 1) * rnd(1.6, 2.6), tx = D.side === 'ns' ? D.x + off : D.x, ty = D.side === 'ns' ? D.y : D.y + off;
      const q = await S.schermo(tx, 0, ty); if (!q) return;
      const h = await S.ev(([nx, ny]) => { const r = window.__pv.pickAt(nx, ny); return r && r.kind; }, [(q.x - S.box.x) / S.box.w, (q.y - S.box.y) / S.box.h]);
      if (h === 'door') { S.note.push({ t: sec(), cosa: 'clic per terra a ' + Math.abs(off).toFixed(1) + ' m dalla porta letto come clic sulla porta', porta: D.i }); return; }
      await S.ev(() => { window.__qa.atteso = 'accanto-porta'; }); await S.clic(q.x, q.y, Math.random() < .5); await S.attendi(s => !s.clic, 20000); const f = await S.stato(); await S.ev(() => { window.__qa.atteso = null; });
      S.azione('clic a terra accanto alla porta', { porta: D.i, scarto_m: +off.toFixed(1), colpito: h, entrato: f.in });
      if (f.in !== null) await S.ev(() => window.__pv.G.exitBuilding(window.__pv.st));
    },
    async S => { // ogni tanto cambia quartiere (la città si ricostruisce attorno)
      if (Math.random() < .6) return; await S.fase('A:salto'); const P = await S.posti(); const q = pick(P); await S.salta(q[1] + rnd(-4, 4), q[2] + rnd(-4, 4), q[0]); await sleep(4000); S.azione('salto a', q[0]);
    },
  ],
  // B: in auto
  B: [
    async S => { // salire su un'auto ferma col clic, guidare verso un posto lontano, scendere
      await S.fase('B:sali'); let s = await S.stato();
      if (s.in !== null) { await S.ev(() => window.__pv.G.exitBuilding(window.__pv.st)); s = await S.stato(); }
      if (!s.auto) {
        let V = await S.ev(([px, py]) => { const st = window.__pv.st, G = window.__pv.G; let best = null, bd = 35; st.vehicles.forEach(v => { if (v.hidden || v.wreck || v.traffic || v.rider || v.kind === 'bmx' || (G.VK[v.kind] || {}).boat || (G.VK[v.kind] || {}).pocket) return; const d = Math.hypot(v.x - px, v.y - py); if (d < bd) { bd = d; best = { id: v.id, x: v.x, y: v.y, kind: v.kind, d }; } }); if (best) { const v = st.vehicles.find(q => q.id === best.id); v.lent = true; } return best; }, [s.x, s.y]);
        if (!V) { // si va vicino a un'auto parcheggiata
          V = await S.ev(() => { const st = window.__pv.st, G = window.__pv.G, c = st.vehicles.filter(v => !v.hidden && !v.wreck && !v.traffic && !v.rider && v.kind !== 'bmx' && !(G.VK[v.kind] || {}).boat && !(G.VK[v.kind] || {}).pocket); const v = c[Math.floor(Math.random() * c.length)]; if (!v) return null; v.lent = true; return { id: v.id, x: v.x, y: v.y, kind: v.kind }; });
          if (!V) { S.azione('nessuna auto da prendere'); return; }
          const sp = await S.ev(([x, y]) => { const G = window.__pv.G; for (let r = 3; r < 12; r += 1) for (let a = 0; a < 6.28; a += .5) { const qx = x + Math.cos(a) * r, qy = y + Math.sin(a) * r; if (G.walkM(qx, qy)) return { x: qx, y: qy }; } return { x, y: y + 4 }; }, [V.x, V.y]);
          await S.salta(sp.x, sp.y, 'auto ' + V.id); await sleep(5000);
        }
        const q = await S.schermo(V.x, .6, V.y);
        if (q) { await S.clic(q.x, q.y); const e = await S.attendi(s => !!s.auto || !s.clic, 45000); s = await S.stato(); S.azione('clic sull\'auto', { id: V.id, kind: V.kind, salito: s.auto, attesa_finita: !!e }); if (!s.auto) S.note.push({ t: sec(), cosa: 'clic su un\'auto senza salire in 45 s', auto: V, stato: s }); }
        if (!s.auto) { await S.pg.keyboard.press('f'); await sleep(2000); s = await S.stato(); if (!s.auto) { S.azione('F non fa salire', V); return; } }
      }
      // guida: verso il posto più lontano, puntatore davanti, W; ogni tanto spinta, sterzo a mano, freno a mano
      await S.fase('B:guida'); const P = await S.posti(); const s0 = await S.stato(); const meta = P.slice().sort((a, b) => Math.hypot(b[1] - s0.x, b[2] - s0.y) - Math.hypot(a[1] - s0.x, a[2] - s0.y))[Math.floor(rnd(0, 3))];
      await S.fase('B:guida', 'verso ' + meta[0]); const tG = Date.now(), dur = rnd(70000, 110000); let best = Math.hypot(meta[1] - s0.x, meta[2] - s0.y), bestT = Date.now(), incastri = 0, retro = 0;
      while (Date.now() - tG < dur) {
        const s1 = await S.stato(); if (!s1.auto) { S.note.push({ t: sec(), cosa: 'sceso dall\'auto senza volerlo durante la guida', stato: s1 }); break; }
        const d = Math.hypot(meta[1] - s1.x, meta[2] - s1.y); if (d < best - 3) { best = d; bestT = Date.now(); }
        if (d < 25) break;
        await S.punta(meta[1], meta[2], 14);
        const r = Math.random(); await S.tieni(r < .2 ? ['Shift', 'w'] : r < .3 ? ['w', pick(['a', 'd'])] : r < .35 ? ['w', ' '] : ['w'], 2500);
        if (Date.now() - bestT > 20000) { incastri++; await S.tieni(['s'], 2500); await S.tieni(['w', pick(['a', 'd'])], 2000); bestT = Date.now(); retro++; }
      }
      const s2 = await S.stato(); S.azione('guidato', { meta: meta[0], partenza_m: Math.round(Math.hypot(meta[1] - s0.x, meta[2] - s0.y)), resta_m: Math.round(Math.hypot(meta[1] - s2.x, meta[2] - s2.y)), s: Math.round((Date.now() - tG) / 1000), incastri });
      await S.fase('B:scendi'); await S.pg.keyboard.press('f'); await sleep(2500); const s3 = await S.stato(); S.azione('F per scendere', { sceso: !s3.auto, dentro: s3.in });
      if (s3.auto) { const v = await S.ev(() => { const st = window.__pv.st, v = st.vehicles.find(q => q.id === st.player.vehicle); return v && { x: v.x, y: v.y }; }); const q = v && await S.schermo(v.x, .6, v.y); if (q) { await S.clic(q.x, q.y); await sleep(2500); } const s4 = await S.stato(); if (s4.auto) S.note.push({ t: sec(), cosa: 'non riesce a scendere né con F né col clic sull\'auto', stato: s4 }); }
      // rimonta subito con F
      await sleep(1500); await S.pg.keyboard.press('f'); await sleep(2500); const s5 = await S.stato(); S.azione('F per risalire', { salito: !!s5.auto }); if (s5.auto) { await S.tieni(['w'], 3000); await S.pg.keyboard.press('f'); await sleep(2000); }
    },
    async S => { // viaggio lungo: da un capo all'altro della mappa, salti agli estremi e poi a piedi col clic lontano (zoom indietro)
      await S.fase('B:viaggio'); const P = await S.posti();
      let a = null, b = null, bd = 0; for (const p of P) for (const q of P) { const d = Math.hypot(p[1] - q[1], p[2] - q[2]); if (d > bd) { bd = d; a = p; b = q; } }
      for (const q of [a, b, pick(P), a]) { await S.salta(q[1], q[2], q[0]); await sleep(6000); await S.campiona(); }
      S.azione('salti agli estremi', { da: a[0], a: b[0], m: Math.round(bd) });
      await S.fase('B:clic-lontano'); for (let i = 0; i < 6; i++) await S.pg.mouse.wheel(0, 300).then(() => sleep(250));
      const s0 = await S.stato(); const px = S.box.x + S.box.w * pick([.08, .92]), py = S.box.y + S.box.h * pick([.12, .88]);
      const t0 = Date.now(); await S.clic(px, py, true); const c = await S.ev(() => { const c = window.__pv.click.t; return c && { kind: c.kind, x: c.x, y: c.y, path: c.path ? c.path.length : 0 }; });
      for (let i = 0; i < 6; i++) await S.pg.mouse.wheel(0, -300).then(() => sleep(250));
      const e = await S.attendi(s => !s.clic, 60000); const f = await S.stato();
      S.azione('clic lontano a piedi (zoom indietro)', { meta: c, percorso_ms: Date.now() - t0, m_fatti: Math.round(Math.hypot(f.x - s0.x, f.y - s0.y)), resta_m: c ? Math.round(Math.hypot(c.x - f.x, c.y - f.y)) : null, finito: !!e });
    },
  ],
  // C: zoom, menu, borsa, giorno e notte
  C: [
    async S => { // zoom fino ai limiti, avanti e indietro, anche a scatti veloci
      await S.fase('C:zoom'); await S.pg.mouse.move(S.box.x + S.box.w / 2, S.box.y + S.box.h / 2);
      for (let i = 0; i < 25; i++) { await S.pg.mouse.wheel(0, -240); await sleep(120); } const z1 = (await S.stato()).zoom; await S.fase('C:zoom-vicino'); await sleep(6000); await S.campiona();
      await S.fase('C:zoom'); for (let i = 0; i < 45; i++) { await S.pg.mouse.wheel(0, 240); await sleep(120); } const z2 = (await S.stato()).zoom; await S.fase('C:zoom-lontano'); await sleep(10000); await S.campiona();
      await S.fase('C:zoom-scatti'); for (let i = 0; i < 40; i++) { await S.pg.mouse.wheel(0, i % 2 ? 900 : -900); await sleep(60); }
      for (let i = 0; i < 12; i++) { await S.pg.mouse.wheel(0, -240); await sleep(100); }
      S.azione('zoom ai limiti', { minimo: z2, massimo: z1, ora: (await S.stato()).zoom });
    },
    async S => { // menu, taccuino, zaino/Tasche: aperti e chiusi, a raffica
      await S.fase('C:menu'); const k = [];
      for (const [tasto, nome] of [['Tab', 'taccuino'], ['i', 'tasche/zaino'], ['z', 'zaino'], ['k', 'lavora'], ['Escape', 'pausa']]) {
        await S.pg.keyboard.press(tasto); await sleep(1500); const a = await S.ev(() => ({ menu: !!window.__pv.ui.menu, book: !!window.__pv.ui.book, mu: !!(document.getElementById('mu') || {}).classList && document.getElementById('mu').classList.contains('on'), og: !!(document.getElementById('og') || {}).classList && document.getElementById('og').classList.contains('on') }));
        if (a.menu && tasto !== 'Tab') for (const n of ['1', '2', '3', '4', '5', '6', '7']) { await S.pg.keyboard.press(n); await sleep(500); }
        await S.pg.keyboard.press(tasto === 'Tab' ? 'Tab' : 'Escape'); await sleep(1200); const b = await S.ev(() => ({ menu: !!window.__pv.ui.menu, book: !!window.__pv.ui.book }));
        if (b.menu || b.book) { S.note.push({ t: sec(), cosa: `dopo ${tasto} e chiusura resta aperto`, nome, stato: b }); await S.pg.keyboard.press('Escape'); await sleep(800); await S.ev(() => { const pv = window.__pv; if (pv.ui.book) pv.book(false); }); }
        k.push({ nome, aperto: a.menu || a.book, chiuso: !(b.menu || b.book) });
      }
      const btn = await S.pg.$('#muBtn'); if (btn) { for (let i = 0; i < 6; i++) { await btn.click({ timeout: 5000 }).catch(() => { }); await sleep(500); await S.pg.keyboard.press('Escape'); await sleep(500); } }
      for (let i = 0; i < 20; i++) { await S.pg.keyboard.press(pick(['i', 'Tab', 'z'])); await sleep(150); } await sleep(800); await S.pulito(); await S.pulito();
      const f = await S.stato(); if (f.menu || f.book) S.note.push({ t: sec(), cosa: 'dopo 20 tasti di menu a raffica e due Esc resta un pannello aperto', stato: f });
      S.azione('menu e borsa', k);
    },
    async S => { // giorno e notte: l'orologio avanza a salti di 20 minuti, due ore per volta
      await S.fase('C:tempo'); const s0 = await S.stato();
      for (let i = 0; i < 6; i++) { await S.ev(() => { window.__pv.st.t += 20; }); await sleep(1500); }
      const s1 = await S.ev(() => ({ ora: window.__pv.G.clockStr(window.__pv.st.t), notte: window.__pv.R.nightLevel(), t: window.__pv.st.t })); await S.fase('C:tempo', 'ore ' + s1.ora); await S.campiona();
      S.azione('tempo avanti di 2 ore', { da_min: Math.round(s0.t), ora: s1.ora, notte: +s1.notte.toFixed(2) });
    },
    async S => { // visuale: girare e dall'alto, a piedi in giro
      await S.fase('C:visuale'); await S.tieni(['.'], 2500); await S.tieni([','], 2500); await S.pg.keyboard.press('o'); await sleep(3000); await S.pg.keyboard.press('o'); await sleep(1000);
      const s = await S.stato(); const a = rnd(0, 6.28); await S.punta(s.x + Math.cos(a) * 20, s.y + Math.sin(a) * 20); await S.tieni(['Shift', 'w'], 4000); S.azione('visuale e corsa');
    },
  ],
};

// ------------------------------------------------------------------ via
// ------------------------------------------------------------------ --logica: il motore del gioco in node, senza grafica
// Nel browser senza scheda video (SwiftShader) e su una macchina carica un fotogramma può durare decine di secondi: i copioni
// in tempo reale fanno pochi passi di gioco. Qui la stessa logica (game.js e i moduli della città) gira a passo fisso di 1/30 s
// per --logica=N minuti di gioco, con lo stesso copione (a piedi, porte, accanto alle porte, auto, giorno e notte, salti) e le
// stesse sonde degli stati assurdi (seduti che scivolano, gente e auto nei muri o in acqua, fuori dal mondo, auto ferme per
// sempre, ingressi senza porta), più le eccezioni del motore e i passi di logica oltre 50 ms.
async function logica(minuti) {
  const vm = require('vm'), SRC = path.join(ROOT, 'src') + '/', r = m => require(SRC + m);
  const seme = +(ARG.seme || 1); r('seme.js')(seme);
  global.THREE = r('three.min.js');
  const avvisi = new Map(), cw = console.warn, ce = console.error, cl = console.log; let faseOra = 'carico';
  const nota = (k, a) => { const t = a.map(String).join(' ').slice(0, 300), key = k + ' ' + t.replace(/\d+(\.\d+)?/g, '#'); const e = avvisi.get(key); if (e) e.n++; else avvisi.set(key, { tipo: k, testo: t, n: 1, fase: faseOra }); };
  console.warn = (...a) => nota('avviso', a); console.error = (...a) => nota('errore', a);
  console.log = (...a) => { const t = a.join(' '); if (/^\[|THREE\./.test(t)) nota('log', a); else cl(...a); };
  global.World = r('world_cittanuova.js'); global.Interior = r('interiors.js');
  global.Game = r('game.js'); global.Posti = r('posti.js'); global.Risacca = r('risacca.js'); global.Popolo = r('popolo.js'); global.Azioni = r('azioni.js');
  global.Economia = r('economia.js'); global.Fazioni = r('fazioni.js'); global.Soldi = r('soldi.js'); global.Oggetti = r('oggetti.js');
  global.Graffiti = r('graffiti.js'); global.Livelli = r('livelli.js'); global.Sottosuolo = r('sottosuolo.js'); global.Tetti = r('tetti.js');
  global.WriterArte = r('writer_arte.js'); global.Writing = r('writing.js'); global.WriterVita = r('writer_vita.js'); global.Eventi = r('eventi.js');
  for (const [g, f] of [['Chiarezza', 'chiarezza.js'], ['Vievive', 'vievive.js'], ['Ordine', 'ordine.js'], ['Scambi', 'scambi.js'], ['Matti', 'matti.js'], ['Imprese', 'imprese.js'], ['Convivenza', 'convivenza.js'], ['Animali', 'animali.js'], ['Protagonista', 'protagonista.js']]) { try { global[g] = r(f); } catch (e) { nota('modulo', [f, e.message]); } }
  let anim = false; try { global.window = global; vm.runInThisContext(fs.readFileSync(SRC + 'animazioni.js', 'utf8'), { filename: 'animazioni.js' }); vm.runInThisContext(fs.readFileSync(SRC + 'anim_vita.js', 'utf8'), { filename: 'anim_vita.js' }); anim = typeof Anim !== 'undefined'; } catch (e) { nota('modulo', ['animazioni', e.message]); }
  const G = Game, st = G.create(seme), p = st.player, TS = G.TS, TN = {}; for (const k in G.T) TN[G.T[k]] = k; st.deadline = 1e12;
  const tile = (x, y) => TN[G.tileAt(Math.floor(x / TS), Math.floor(y / TS))], SOLIDI = { BLD: 1, CLIFF: 1, FOUNT: 1, TREE: 1 }, SEDUTI = { siede: 1, siede_terra: 1, dorme: 1, tavola: 1, carte: 1 };
  const DT = 1 / 30, FINE = minuti * 60; let sim = 0; const eccezioni = new Map(), lenti = [], out = { seme, npc: st.npcs.length, veicoli: st.vehicles.length, anim, fasi: [], ingressi_senza_porta: [], porte: [], auto: [], assurdi: {}, memoria: [] };
  const A = (k, o) => { const L = out.assurdi[k] || (out.assurdi[k] = { n: 0, chi: {}, esempi: [] }); L.n++; const id = o.id || 'giocatore'; L.chi[id] = (L.chi[id] || 0) + 1; if (L.esempi.length < 30) L.esempi.push(Object.assign({ sim_s: Math.round(sim), ora: G.clockStr(st.t), fase: faseOra }, o)); };
  const prev = new Map(), traff = new Map();
  function sonde() {
    for (const n of st.npcs) {
      if (n.dead) continue;
      if (!isFinite(n.x) || !isFinite(n.y) || n.x < 0 || n.y < 0 || n.x > G.WW || n.y > G.WH) { A('gente_fuori_mondo', { id: n.id, x: n.x, y: n.y }); continue; }
      if (n.inside || n.inVeh || n.room) { prev.delete(n.id); continue; }
      const d = Math.hypot(n.x - p.x, n.y - p.y), tl = tile(n.x, n.y);
      if (SOLIDI[tl] && !n.wrH && !n.lv && d < 150) A('gente_nei_muri', { id: n.id, pas: !!n.passante, x: +n.x.toFixed(1), y: +n.y.toFixed(1), casella: tl, azione: n.action && n.action.name, d: Math.round(d) });
      if (!anim || d > 80) continue;
      let act = null; try { act = (Anim.npcState(st, n) || {}).act; } catch (e) { }
      const q = prev.get(n.id); prev.set(n.id, { x: n.x, y: n.y, act, s: sim });
      if (q && SEDUTI[act] && SEDUTI[q.act] && sim - q.s < 1.5) { const m = Math.hypot(n.x - q.x, n.y - q.y); if (m > .25) A('seduti_che_scivolano', { id: n.id, pas: !!n.passante, act, m_in_1s: +m.toFixed(2), speedNow: +(n.speedNow || 0).toFixed(2), azione: n.action && n.action.name, blocco: n.pop && n.pop.cur ? (n.pop.cur.obj || n.pop.cur.act || n.pop.cur.label) : null, x: Math.round(n.x), y: Math.round(n.y) }); }
    }
    for (const v of st.vehicles) {
      if (v.hidden || v.wreck) continue; const tl = tile(v.x, v.y), K = G.VK[v.kind] || {}, d = Math.hypot(v.x - p.x, v.y - p.y);
      if (!isFinite(v.x) || !isFinite(v.y)) { A('auto_fuori_mondo', { id: v.id, x: v.x, y: v.y }); continue; }
      if (SOLIDI[tl]) A('auto_nei_muri', { id: v.id, kind: v.kind, traffico: !!v.traffic, mia: v.id === p.vehicle, x: +v.x.toFixed(1), y: +v.y.toFixed(1), casella: tl, d: Math.round(d) });
      if (tl === 'WATER' && !K.boat) A('auto_in_acqua', { id: v.id, kind: v.kind, traffico: !!v.traffic, x: Math.round(v.x), y: Math.round(v.y), d: Math.round(d) });
      if (v.traffic && !v.rider) { const T = traff.get(v.id); if (!T || Math.hypot(T.x - v.x, T.y - v.y) > 1) traff.set(v.id, { x: v.x, y: v.y, da: sim, kind: v.kind, d }); else { T.fino = sim; T.d = Math.min(T.d, d); T.stuck = v.stuck; } }
    }
    if (!p.indoor && !p.vehicle && !p.lv && !p.swim && !G.walkM(p.x, p.y)) A('giocatore_nel_muro', { x: +p.x.toFixed(1), y: +p.y.toFixed(1), casella: tile(p.x, p.y) });
  }
  let ultimaSonda = 0;
  const passo = inp => {
    const was = p.indoor ? p.indoor.b : null, t = process.hrtime.bigint();
    try { G.step(st, DT, inp || { x: 0, y: 0 }); } catch (e) { const k = String(e && e.message).slice(0, 160); const E = eccezioni.get(k); if (E) E.n++; else eccezioni.set(k, { n: 1, fase: faseOra, sim_s: Math.round(sim), stack: String(e && e.stack).split('\n').slice(0, 5).join(' | ') }); }
    const ms = Number(process.hrtime.bigint() - t) / 1e6; if (ms > 50) lenti.push({ sim_s: +sim.toFixed(1), ms: Math.round(ms), fase: faseOra, ora: G.clockStr(st.t), x: Math.round(p.x), y: Math.round(p.y) });
    if (was === null && p.indoor && inp && inp.door == null) out.ingressi_senza_porta.push({ sim_s: Math.round(sim), fase: faseOra, edificio: p.indoor.b, x: +p.x.toFixed(1), y: +p.y.toFixed(1) });
    sim += DT; st.over = null; if (p.hp < 50) p.hp = 100;
    if (sim - ultimaSonda >= 1) { ultimaSonda = sim; sonde(); }
  };
  const verso = (x, y, extra) => { const a = Math.atan2(y - p.y, x - p.x); return Object.assign({ x: Math.cos(a), y: Math.sin(a), aim: a }, extra || {}); };
  // segue un percorso come il clic (main.js clickInput): noDoor salvo che si vada a una porta
  const segui = (gx, gy, maxS, extra) => { let path = G.findPath(p.x, p.y, gx, gy, 1.4, false) || []; if (!path.length) return 'senza percorso'; const t0 = sim; let best = 1e9, bestT = sim;
    while (sim - t0 < maxS) { while (path.length > 1 && Math.hypot(path[0].x - p.x, path[0].y - p.y) < .4) path.shift(); const left = Math.hypot(gx - p.x, gy - p.y); if (left < .35) return 'arrivato'; if (left < best - .2) { best = left; bestT = sim; } else if (sim - bestT > 1.5) return 'bloccato a ' + left.toFixed(1) + ' m';
      const w = path[0] || { x: gx, y: gy }; passo(verso(w.x, w.y, extra)); if (p.indoor && extra && extra.noDoor) return 'entrato'; }
    return 'tempo scaduto'; };
  const porteVicine = R => { const o = []; G.BUILDINGS.forEach((b, i) => { if (!b.door) return; const x = (b.door[0] + .5) * TS, y = (b.door[1] + .5) * TS, d = Math.hypot(x - p.x, y - p.y); if (d < R && d > 2) o.push({ i, b, x, y, d }); }); return o.sort((a, c) => a.d - c.d); };
  const posti = Object.entries(G.PLACES).map(([k, v]) => [k, v.x, v.y]);
  const salta = (x, y) => { if (p.vehicle) G.act(st, 'veicolo'); p.vehicle = null; p.indoor = null; p.lv = null; p.x = x; p.y = y; };
  const COP = [
    function cammina() { const a = Math.random() * 6.28, d = 10 + Math.random() * 30, gx = p.x + Math.cos(a) * d, gy = p.y + Math.sin(a) * d; if (!G.walkM(gx, gy)) return; const esito = segui(gx, gy, 40, { noDoor: true, sprint: Math.random() < .5 }); out.fasi.push({ sim_s: Math.round(sim), cosa: 'cammina', esito }); },
    function accantoPorta() { const D = porteVicine(40)[0]; if (!D) return; for (const off of [-2.2, -1.6, 1.6, 2.2]) { const ns = D.b.door[1] === D.b.y + D.b.h || D.b.door[1] === D.b.y - 1, gx = ns ? D.x + off : D.x, gy = ns ? D.y : D.y + off; if (!G.walkM(gx, gy)) continue; const esito = segui(gx, gy, 30, { noDoor: true }); if (esito === 'entrato') G.exitBuilding(st); out.fasi.push({ sim_s: Math.round(sim), cosa: 'accanto alla porta ' + D.i, off, esito }); } },
    // [porte] come main.js: la porta cliccata (door) e la spinta verso la facciata dietro la porta
    function porta() { const D = porteVicine(40)[0]; if (!D) return; const esito = segui(D.x, D.y, 40, { door: D.i }); const cx = Math.max(D.b.x * TS, Math.min((D.b.x + D.b.w) * TS, D.x)), cy = Math.max(D.b.y * TS, Math.min((D.b.y + D.b.h) * TS, D.y)); let k = 0; while (!p.indoor && k++ < 60) passo(verso(cx, cy, { door: D.i })); const R = { sim_s: Math.round(sim), porta: D.i, verso_porta: esito, entrato: p.indoor ? p.indoor.b : null, giusto: p.indoor ? p.indoor.b === D.i : null };
      if (p.indoor) { const L = G.INT.layout(G.BUILDINGS[p.indoor.b]); for (let j = 0; j < 90; j++) passo(verso(p.x + Math.cos(j) * 3, p.y + Math.sin(j) * 3)); const e = L.ent; let u = 0; if (e) { while (p.indoor && u++ < 300) { const pth = !p.indoor.f && G.INT.findPath ? G.INT.findPath(L, p.indoor.f, p.x, p.y, e.in[0], e.in[1]) : null; const w = pth && pth.length > 1 ? pth[0] : { x: e.out[0], y: e.out[1] }; passo(verso(w.x, w.y)); } } R.uscito = !p.indoor; R.uscita_s = +(u * DT).toFixed(1); if (p.indoor) { R.piano = p.indoor.f; G.exitBuilding(st); } }
      out.porte.push(R); },
    function auto() { const c = st.vehicles.filter(v => !v.hidden && !v.wreck && !v.traffic && !v.rider && v.kind !== 'bmx' && !(G.VK[v.kind] || {}).boat && !(G.VK[v.kind] || {}).pocket && Math.hypot(v.x - p.x, v.y - p.y) < 200); const v = c[Math.floor(Math.random() * c.length)]; if (!v) return; v.lent = true;
      const K = G.VK[v.kind]; let ok = false; for (let a = 0; a < 6.28 && !ok; a += .4) for (const rr of [K.wid / 2 + .8, K.len / 2 + .8]) { const x = v.x + Math.cos(a) * rr, y = v.y + Math.sin(a) * rr; if (G.walkM(x, y)) { salta(x, y); ok = true; break; } }
      const r0 = G.act(st, 'veicolo'); const R = { sim_s: Math.round(sim), id: v.id, kind: v.kind, salito: !!p.vehicle, msg: r0 && r0.msg }; if (!p.vehicle) { out.auto.push(R); return; }
      const meta = posti.slice().sort((a, b) => Math.hypot(b[1] - p.x, b[2] - p.y) - Math.hypot(a[1] - p.x, a[2] - p.y))[Math.floor(Math.random() * 3)]; R.meta = meta[0]; R.da_m = Math.round(Math.hypot(meta[1] - p.x, meta[2] - p.y));
      let path = G.findPath(p.x, p.y, meta[1], meta[2], .6, true) || []; R.percorso = path.length; const t0 = sim; let best = 1e9, bestT = sim, incastri = 0;
      while (sim - t0 < 90) { const V = st.vehicles.find(q => q.id === p.vehicle); if (!V) { R.perso = p.vehicle ? 'auto sparita dalla lista con il giocatore dentro' : 'sceso senza volerlo: ' + st.feed.slice(0, 3).map(f => f.text).join(' / '); break; } while (path.length > 1 && Math.hypot(path[0].x - V.x, path[0].y - V.y) < 3) path.shift(); const w = path[0] || { x: meta[1], y: meta[2] }, dd = Math.hypot(meta[1] - V.x, meta[2] - V.y); if (dd < 20) break; if (dd < best - 2) { best = dd; bestT = sim; }
        let d = Math.atan2(w.y - V.y, w.x - V.x) - V.ang; d = Math.atan2(Math.sin(d), Math.cos(d)); const steer = Math.max(-1, Math.min(1, d * 1.6));
        if (sim - bestT > 8) { incastri++; for (let k = 0; k < 45; k++) passo({ x: 0, y: 0, drive: { thr: -1, steer: -steer, hb: false, boost: false } }); bestT = sim; path = G.findPath(V.x, V.y, meta[1], meta[2], .6, true) || path; }
        passo({ x: 0, y: 0, drive: { thr: 1, steer, hb: false, boost: Math.random() < .2, assist: true } }); }
      const V = st.vehicles.find(q => q.id === p.vehicle); R.resta_m = V ? Math.round(Math.hypot(meta[1] - V.x, meta[2] - V.y)) : null; R.s = Math.round(sim - t0); R.incastri = incastri;
      for (let k = 0; k < 60; k++) passo({ x: 0, y: 0, drive: { thr: 0, steer: 0, hb: true } }); G.act(st, 'veicolo'); R.sceso = !p.vehicle; if (p.vehicle) { R.non_scende = true; p.vehicle = null; } out.auto.push(R); },
    function tempo() { st.t += 110 + Math.random() * 40; for (let k = 0; k < 150; k++) passo(); },
    function salto() { const q = posti[Math.floor(Math.random() * posti.length)]; salta(q[1], q[2]); for (let k = 0; k < 90; k++) passo(); },
  ];
  const T0r = Date.now(); let i = 0, lastLog = 0;
  for (let k = 0; k < 150; k++) passo();
  while (sim < FINE) {
    const f = COP[i++ % COP.length]; faseOra = f.name; try { f(); } catch (e) { const k = 'copione ' + f.name + ': ' + String(e.message).slice(0, 140); const E = eccezioni.get(k); if (E) E.n++; else eccezioni.set(k, { n: 1, fase: faseOra, sim_s: Math.round(sim), stack: String(e.stack).split('\n').slice(0, 4).join(' | ') }); }
    if (sim - lastLog > 60) { lastLog = sim; const m = process.memoryUsage(); out.memoria.push({ sim_s: Math.round(sim), heap_MB: Math.round(m.heapUsed / 1048576), rss_MB: Math.round(m.rss / 1048576), ora: G.clockStr(st.t), npc: st.npcs.length, veicoli: st.vehicles.length }); cl(`[logica] ${Math.round(sim)} s di gioco · ${G.clockStr(st.t)} · heap ${Math.round(m.heapUsed / 1048576)} MB · ${((Date.now() - T0r) / 1000).toFixed(0)} s veri`); }
  }
  out.sim_s = Math.round(sim); out.veri_s = Math.round((Date.now() - T0r) / 1000); out.eccezioni = [...eccezioni.entries()].map(([k, v]) => Object.assign({ msg: k }, v));
  out.passi_lenti = { n: lenti.length, peggiori: lenti.sort((a, b) => b.ms - a.ms).slice(0, 25) };
  out.auto_ferme = [...traff.entries()].map(([id, T]) => ({ id, kind: T.kind, x: Math.round(T.x), y: Math.round(T.y), ferma_s: Math.round((T.fino || T.da) - T.da), d_min: Math.round(T.d), stuck: T.stuck })).filter(q => q.ferma_s >= 180).sort((a, b) => b.ferma_s - a.ferma_s);
  out.avvisi = [...avvisi.values()].sort((a, b) => b.n - a.n);
  console.warn = cw; console.error = ce; console.log = cl;
  fs.writeFileSync(path.join(OUT, 'logica.json'), JSON.stringify(out, null, 1));
  const n = k => (out.assurdi[k] || { n: 0 }).n;
  log(`[logica] ${out.sim_s} s di gioco in ${out.veri_s} s · eccezioni ${out.eccezioni.length} · ingressi senza porta ${out.ingressi_senza_porta.length} · seduti che scivolano ${n('seduti_che_scivolano')} · gente nei muri ${n('gente_nei_muri')} · auto nei muri ${n('auto_nei_muri')} · auto in acqua ${n('auto_in_acqua')} · auto ferme ${out.auto_ferme.length} · passi lenti ${lenti.length}`);
  log('scritto', path.join(OUT, 'logica.json'));
  return out.eccezioni.length + out.ingressi_senza_porta.length + Object.keys(out.assurdi).length;
}

(async () => {
  if (ARG.logica) { const g = await logica(ARG.logica === true ? 20 : +ARG.logica); LOGF.end(); setTimeout(() => process.exit(g ? 1 : 0), 300); return; }
  const SRV = await server(); let tC = 0; log('gioco su', SRV.url, '· memoria disponibile', memDisp(), 'MB · carico', os.loadavg()[0].toFixed(1), '· CPU', os.cpus().length);
  let n = NSCHEDE; const decisioni = [];
  if (n === 3 && memDisp() < SOGLIA_MB) { n = 2; decisioni.push({ s: sec(), cosa: `memoria disponibile ${memDisp()} MB < ${SOGLIA_MB}: si parte con 2 schede` }); }
  const nomi = ['A', 'B', 'C'].slice(0, n); const SCHEDE = nomi.map(k => new Scheda(k, k));
  if (n === 2 && NSCHEDE === 3) SCHEDE[1].copioni.push('C'); if (n === 1) SCHEDE[0].copioni.push('B', 'C');
  const giri = [];
  const vive = () => SCHEDE.filter(S => !S.chiusa);
  // la guardia della memoria
  const guardia = setInterval(async () => {
    const m = memDisp(), v = vive();
    if (m < SOGLIA_MB && v.length >= 3) { const C = v[v.length - 1]; decisioni.push({ s: sec(), cosa: `memoria disponibile ${m} MB < ${SOGLIA_MB}: chiudo la scheda ${C.nome}, si resta a 2 (il copione ${C.copioni.join('+')} passa a ${v[1].nome})` }); log('GUARDIA', decisioni[decisioni.length - 1].cosa); C.chiusa = true; C.chiusaA = sec(); v[1].copioni.push(...C.copioni); if (C.b) await C.b.close().catch(() => { }); }
    else if (m < SOGLIA2_MB && v.length >= 2) { const C = v[v.length - 1]; decisioni.push({ s: sec(), cosa: `memoria disponibile ${m} MB < ${SOGLIA2_MB}: chiudo anche la scheda ${C.nome}` }); log('GUARDIA', decisioni[decisioni.length - 1].cosa); C.chiusa = true; C.chiusaA = sec(); v[0].copioni.push(...C.copioni); if (C.b) await C.b.close().catch(() => { }); }
  }, 5000);
  const gioca = async S => {
    if (S.chiusa) return; S.inizio = sec(); const fine = Date.now() + MINUTI * 60000; let i = 0, tC = 0, tA = 0;
    while (Date.now() < fine && !S.chiusa && !S.crash) {
      if (Date.now() - tA > ASSURDI_S * 1000) { tA = Date.now(); await S.controllaAssurdi(); }
      if (!ARG.senzaprofilo && Date.now() - (S.tP || 0) > 120000) { S.tP = Date.now(); await S.profilo(); }
      const cop = S.copioni[i % S.copioni.length], L = COPIONI[cop], step = L[Math.floor(i / S.copioni.length) % L.length]; i++;
      try { await Promise.race([step(S), sleep(240000).then(() => { throw new Error('passo del copione oltre 4 minuti'); })]); }
      catch (e) { if (S.chiusa) break; S.note.push({ t: sec(), fase: S.faseOra, errore_copione: String(e.message).slice(0, 300) }); S.L('passo fallito:', e.message.slice(0, 200)); await S.pulito().catch(() => { }); await sleep(3000); }
      await S.pulito().catch(() => { });
    }
    S.fineGioco = sec(); await S.campiona(); await S.controllaAssurdi(); if (S.profOn) { S.tP = 0; await S.profilo(); await S.cdp.send('Profiler.stop').catch(() => { }); }
  };
  // campionamento anche durante i passi lunghi
  const campi = setInterval(() => { vive().forEach(S => { if (S.inizio && !S.fineGioco && !S.__c) { S.__c = 1; S.campiona().finally(() => { S.__c = 0; }); } }); }, CAMPIONE_S * 1000);
  // si aprono una dopo l'altra (il caricamento è la parte più pesante); ognuna gioca appena è pronta
  const SERVE_MB = +(ARG.serve || 2600), ATTESA_MIN = +(ARG.attesa || 45);   // quanto chiede un browser col gioco (renderer ~2 GB + scheda video) e quanto si aspetta che si liberi
  for (const S of SCHEDE) {
    if (S.chiusa) continue;   // la guardia l'ha già tolta
    if (memDisp() < SERVE_MB) { const t = Date.now(), lim = (S === SCHEDE[0] ? ATTESA_MIN : 10) * 60000; log(`[${S.nome}] memoria disponibile ${memDisp()} MB < ${SERVE_MB}: aspetto fino a ${lim / 60000} min`); while (memDisp() < SERVE_MB && Date.now() - t < lim) await sleep(10000); decisioni.push({ s: sec(), cosa: `prima di aprire ${S.nome} aspettati ${Math.round((Date.now() - t) / 1000)} s di memoria; ora ${memDisp()} MB` }); }
    if (S !== SCHEDE[0] && memDisp() < SOGLIA_MB && SCHEDE.filter(q => q.b && !q.chiusa).length >= 2) { decisioni.push({ s: sec(), cosa: `memoria ${memDisp()} MB < ${SOGLIA_MB}: la scheda ${S.nome} non si apre, il suo copione passa a ${SCHEDE[1].nome}` }); log('GUARDIA', decisioni[decisioni.length - 1].cosa); S.chiusa = true; S.chiusaA = sec(); SCHEDE[1].copioni.push(...S.copioni); continue; }
    try { await S.apri(SRV.url); giri.push(gioca(S)); } catch (e) { S.L('apertura fallita', e.message); S.apertura = String(e.message).slice(0, 300); S.chiusa = true; } }
  await Promise.all(giri);
  clearInterval(guardia); clearInterval(campi);
  // ------------------------------------------------------------ il resoconto
  const tutto = { quando: new Date().toISOString(), url: SRV.url, minuti: MINUTI, schede_chieste: NSCHEDE, decisioni, viewport: [VW, VH], cpu: os.cpus().length, schede: {} };
  let guai = 0;
  for (const S of SCHEDE) {
    let qa = null; if (S.pg && !S.crash && !S.chiusaA) qa = await S.ev(() => { const Q = window.__qa; const pf = {}; for (const k in Q.perFase) { const s = Q.perFase[k], g = s.gaps.slice().sort((a, b) => a - b); pf[k] = { n: s.n, oltre50: s.o50, oltre100: s.o100, oltre250: s.o250, oltre1000: s.o1000, lavoro_oltre50: s.w50, lavoro_oltre100: s.w100, lavoro_oltre250: s.w250, max_ms: Math.round(s.max), lavoro_max_ms: Math.round(s.wmax), media_ms: Math.round(s.somma / Math.max(1, s.n)), lavoro_medio_ms: +(s.wsomma / Math.max(1, s.n)).toFixed(1), p50: g[g.length >> 1], p95: g[Math.floor(g.length * .95)] }; } return { perFase: pf, lunghi: Q.lunghi.sort((a, b) => b.lavoro - a.lavoro).slice(0, 60), lost: Q.lost, restored: Q.restored, ingressi: Q.ingressi, uscite: Q.uscite, n: Q.n }; }, null, 120000).catch(e => ({ errore: e.message }));
    const fermi = [...S.traffico.entries()].map(([id, T]) => ({ id, kind: T.kind, x: T.x, y: T.y, fermo_s: Math.round((T.ultimo || T.da) - T.da), d_giocatore: T.d, stuck: T.stuck })).filter(q => q.fermo_s >= 120).sort((a, b) => b.fermo_s - a.fermo_s);
    const ingressiSospetti = qa && qa.ingressi ? qa.ingressi.filter(e => e.clic !== 'door' && !(e.tasti && /[wasd]|arrow/.test(e.tasti))) : [];
    const c = S.campioni.filter(q => q.heap), m0 = c[Math.min(3, c.length - 1)], m1 = c[c.length - 1];
    const R = { copioni: S.copioni, caricamento_s: S.caricamento_s, apertura: S.apertura, crash: S.crash || null, chiusa_dalla_guardia: S.chiusaA || null, inizio_s: S.inizio, fine_s: S.fineGioco,
      memoria: m0 && m1 ? { heap_MB: [m0.heap, m1.heap], heap_max_MB: Math.max(...c.map(q => q.heap)), geometrie: [m0.geo, m1.geo], texture: [m0.tex, m1.tex], programmi: [m0.prog, m1.prog], nodi_dom: [m0.nodi, m1.nodi], ascoltatori: [m0.ascoltatori, m1.ascoltatori], rss_MB: [m0.rss && m0.rss.tot, m1.rss && m1.rss.tot], rss_max_MB: Math.max(...c.map(q => q.rss ? q.rss.tot : 0)), gpu_MB: [m0.rss && m0.rss.gpu, m1.rss && m1.rss.gpu] } : null,
      errori: [...S.err.values()].sort((a, b) => b.n - a.n), richieste_fallite: [...S.richieste.entries()].map(([u, n]) => ({ u, n })), fotogrammi: qa, auto_ferme_per_sempre: fermi, ingressi_sospetti: ingressiSospetti,
      profilo: S.prof ? { campionato_s: Math.round(S.prof.tot / 1000), moduli: Object.entries(S.prof.mod).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [k, +(v / S.prof.tot * 100).toFixed(1)]), funzioni: Object.entries(S.prof.fn).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => [k, +(v / S.prof.tot * 100).toFixed(1)]) } : null,
      assurdi: S.assurdi, note: S.note, azioni: S.azioni, campioni: S.campioni };
    guai += R.errori.filter(e => e.tipo !== 'avviso').length + (qa && qa.lost ? qa.lost.length : 0) + S.assurdi.length + ingressiSospetti.length + (S.crash ? 1 : 0);
    tutto.schede[S.nome] = R;
    fs.writeFileSync(path.join(OUT, `campioni_${S.nome}.csv`), 's,fase,posto,heap,geo,tex,prog,calls,nodi,ascoltatori,rss,gpu,memLibera,carico,frames,zoom,ora,x,y,dentro,auto\n' + S.campioni.map(q => [q.s, q.fase, JSON.stringify(q.posto || ''), q.heap, q.geo, q.tex, q.prog, q.calls, q.nodi, q.ascoltatori, q.rss && q.rss.tot, q.rss && q.rss.gpu, q.memLibera, q.carico, q.frames, q.zoom, q.ora, q.p && q.p.x, q.p && q.p.y, q.p && q.p.in, q.p && q.p.auto].join(',')).join('\n'));
    log(`[${S.nome}] errori ${R.errori.length} gruppi · contesti persi ${qa && qa.lost ? qa.lost.length : '?'} · assurdi ${S.assurdi.length} campioni · auto ferme ${fermi.length} · ingressi sospetti ${ingressiSospetti.length} · heap ${R.memoria ? R.memoria.heap_MB.join('→') : '?'} MB · rss ${R.memoria ? R.memoria.rss_MB.join('→') : '?'} MB`);
  }
  fs.writeFileSync(path.join(OUT, 'resistenza.json'), JSON.stringify(tutto, null, 1));
  log('scritto', path.join(OUT, 'resistenza.json'));
  for (const S of SCHEDE) if (S.b) await S.b.close().catch(() => { });
  SRV.stop(); LOGF.end(); process.exit(guai ? 1 : 0);
})().catch(e => { log('ERRORE della prova', e.stack); process.exit(2); });
