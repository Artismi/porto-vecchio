// [arrivo] QUANDO ARRIVANO I PAVIMENTI E LE PIANTE, rispetto alla città. Il gioco vero (index.html) in Chromium senza testa (SwiftShader:
// contano i rapporti, non i secondi). Misura, dall'apertura della pagina:
//   - città: l'anello vicino dei tasselli in scena (__tl.tasselliVicino) e il gioco che parte (__tl.gioco);
//   - pavimenti: tutti i blocchi del terreno vicini alla camera (entro --vicino m, di difetto 70: quelli che render.js chiama «vicini»)
//     in scena con le loro mappe dei pavimenti (Pavimenti.blocchi);
//   - piante: gli stessi blocchi col loro verde (buildVeg, bosco, verde) e il verde nuovo (vegetazione.js) in scena, coi programmi pronti;
//   - poi un salto di --salto m (di difetto 140) verso est: quanto ci mettono i blocchi vicini del posto nuovo (il cammino, in grande);
//   - la cronaca dei blocchi (render.js ISO.arrivo: ms di lavoro, fotogrammi, attese del lavoratore, tempo per fase) e i programmi della
//     scheda video nati dopo il caricamento (chi nasce tardi aspetta la compilazione: PesoPronti.vivo).
// I tempi anche in fotogrammi (in SwiftShader un fotogramma dura secondi: i fotogrammi dicono di più; sull'Iris Xe uno è ~80 ms).
//   node strumenti/sonda_arrivo.js [--query=&leggera] [--nome=x] [--vicino=70] [--salto=140] [--max=300 s dopo il gioco] [--vista=640x360] [--forza]
// --forza: usa i tasselli di v7/tasselli anche se l'impronta è di un'altra build (per misurare senza ricuocere: la città è quasi la stessa).
// Scrive <tmp>/arrivo_<nome>.json.
'use strict';
const path = require('path'), http = require('http'), fs = require('fs');
const { chromium } = require(process.env.PW || 'playwright');
const ARG = {}; for (const a of process.argv.slice(2)) { const m = /^--([a-z]+)(?:=(.*))?$/.exec(a); if (m) ARG[m[1]] = m[2] === undefined ? true : m[2]; }
const root = path.join(__dirname, '..'), NOME = ARG.nome || 'arrivo', VIC = +(ARG.vicino || 70), MAX = +(ARG.max || 300) * 1000, SALTO = +(ARG.salto === undefined ? 140 : ARG.salto), VISTA = (ARG.vista || '640x360').split('x').map(Number);
const QUERY = 'cittanuova' + (ARG.query === undefined ? '&leggera' : ARG.query);
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream' };
let IMP = null; try { IMP = JSON.parse(fs.readFileSync(path.join(root, 'tasselli/indice.json'), 'utf8').slice(0, 4e6)).impronta; } catch (e) { }
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  if (u.startsWith('/api/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":false}'); return; }
  const p = path.join(root, u); fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});

// dentro la pagina: lo stato dei blocchi vicini e del verde
function stato(VIC) {
  const pv = window.__pv, R = pv && pv.R, tl = Object.assign({}, window.__tl || {}); if (!R || !R.ISO) return { t: Math.round(performance.now()), fr: window.__frN || 0, tl };
  const ISO = R.ISO, P = window.Pavimenti, TS = 2, W = ISO.CH * TS, cx = R.cam.x, cz = R.cam.y, rd = R.__models.renderer, scene = R.__models.scene;
  let n = 0, fatti = 0, pav = 0, veg = 0; const manca = [];
  const i0 = Math.floor((cx - VIC) / W), i1 = Math.floor((cx + VIC) / W), j0 = Math.floor((cz - VIC) / W), j1 = Math.floor((cz + VIC) / W);
  for (let cj = Math.max(0, j0); cj <= j1; cj++) for (let ci = Math.max(0, i0); ci <= i1; ci++) {
    const mx = Math.max(ci * W, Math.min(cx, (ci + 1) * W)), mz = Math.max(cj * W, Math.min(cz, (cj + 1) * W)); if (Math.hypot(mx - cx, mz - cz) >= VIC) continue;
    n++; const ch = ISO.chunks.get(ci + ',' + cj); if (!ch) { manca.push(ci + ',' + cj); continue; } fatti++;
    // le mappe ci sono (o il blocco non ne ha bisogno: Pavimenti spento); il verde del blocco è nel blocco (nasce con lui)
    if (!P || !P.attivo() || ch.mat.userData.pavB) pav++;
    const vok = !!ch.veg;
    if (vok) veg++;
  }
  // il verde nuovo: il gruppo «vegetazione», le sue istanze accese e disegnate
  let vg = scene.getObjectByName('vegetazione'), vn = 0, vpronte = 0;
  if (vg) vg.traverse(o => { if (o.isInstancedMesh && o.count > 0) { vn++; const cp = (rd.properties.get(o.material) || {}).currentProgram; if (cp) vpronte++; } });
  const PP = window.PesoPronti && PesoPronti.conto ? PesoPronti.conto().vivo : null;
  return { t: Math.round(performance.now()), fr: window.__frN || 0, tl, cam: [Math.round(cx), Math.round(cz)], n, fatti, pav, veg, manca, verde: vg ? [vn, vpronte] : null, job: ISO.job ? ISO.job.key : null, prog: rd.info.programs ? rd.info.programs.length : 0, vivoAttesa: PP ? PP.attesa : null };
}

srv.listen(0, async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const out = { nome: NOME, query: QUERY, vicino: VIC, forza: !!ARG.forza, impronta: IMP };
  try {
    const ctx = await b.newContext({ viewport: { width: VISTA[0], height: VISTA[1] } });
    const pg = await ctx.newPage(), errori = [], avvisi = [];
    pg.on('pageerror', e => errori.push(e.message));
    pg.on('console', m => { const t = m.text(); if (m.type() === 'error') errori.push(t.slice(0, 300)); else if (m.type() === 'warning' && /shader|program|pavimenti|arrivo|tasselli/i.test(t)) avvisi.push(t.slice(0, 200)); });
    if (ARG.forza && IMP) await pg.addInitScript(imp => { Object.defineProperty(window, 'PV_IMPRONTA_TASS', { configurable: true, get: () => imp, set() { } }); }, IMP);
    await pg.addInitScript(() => { window.__frN = 0; const f = () => { window.__frN++; requestAnimationFrame(f); }; requestAnimationFrame(f); });   // i fotogrammi
    // i programmi nati dopo il caricamento: nome e quando
    await pg.addInitScript(() => { window.__progTardi = []; const hook = () => { const pv = window.__pv, rd = pv && pv.R && pv.R.__models && pv.R.__models.renderer; if (!rd || !rd.info.programs || !window.__tl || !window.__tl.compilato) { setTimeout(hook, 100); return; }
      const L = rd.info.programs, p0 = L.push; L.push = function () { for (const p of arguments) window.__progTardi.push([Math.round(performance.now()), p.name, String(p.cacheKey).slice(-40)]); return p0.apply(this, arguments); }; }; hook(); });
    await pg.goto(`http://localhost:${srv.address().port}/index.html?${QUERY}`, { waitUntil: 'domcontentloaded', timeout: 0 });
    const S = [], tappe = {}, FR = {}; let fine = 0;
    for (let k = 0; k < 2400; k++) {
      const s = await pg.evaluate(stato, VIC).catch(() => null);
      if (s) { S.push(s); const tl = s.tl || {};
        if (tl.tasselliVicino && !tappe.citta) { tappe.citta = tl.tasselliVicino; FR.citta = s.fr; }
        if (tl.gioco && !tappe.gioco) { tappe.gioco = tl.gioco; FR.gioco = s.fr; }
        if (s.n && s.pav === s.n && !tappe.pavimenti) { tappe.pavimenti = s.t; FR.pavimenti = s.fr; }
        if (s.n && s.veg === s.n && s.fatti === s.n && s.verde && s.verde[0] > 0 && s.verde[1] === s.verde[0] && !tappe.piante) { tappe.piante = s.t; FR.piante = s.fr; }
        if (tappe.gioco && tappe.pavimenti && tappe.piante && (tappe.citta || s.t - tappe.gioco > 20000)) { if (!fine) fine = s.t; if (s.t - fine > 3000) break; }
        if (tappe.gioco && s.t - tappe.gioco > MAX) { out.oltre = true; break; } }
      await new Promise(r => setTimeout(r, 250));
    }
    out.tappe = tappe;
    const g = tappe.gioco || 0, rel = v => v ? +((v - g) / 1000).toFixed(1) : null;
    out.dopoGioco_s = { citta: rel(tappe.citta), pavimenti: rel(tappe.pavimenti), piante: rel(tappe.piante) };
    out.fotogrammi = FR;   // il numero del fotogramma a ogni tappa (dall'apertura)
    // il salto: il giocatore (e la camera) spostati di SALTO m; quanto (secondi, fotogrammi) finché i blocchi vicini del posto nuovo hanno i pavimenti
    if (SALTO > 0) {
      const p0 = await pg.evaluate(SALTO => { const p = window.__pv.st.player; p.x += SALTO; return [Math.round(p.x), Math.round(p.y)]; }, SALTO);
      const s0 = await pg.evaluate(stato, VIC); let s1 = null, sl = null; const t0 = Date.now();
      while (Date.now() - t0 < MAX) { const s = await pg.evaluate(stato, VIC).catch(() => null); if (s) sl = s; if (s && s.n && s.pav === s.n && Math.abs(s.cam[0] - p0[0]) < 30) { s1 = s; break; } await new Promise(r => setTimeout(r, 250)); }
      out.salto = { a: p0, s: s1 ? +((s1.t - s0.t) / 1000).toFixed(1) : null, fotogrammi: s1 ? s1.fr - s0.fr : null, blocchi: s1 ? s1.n : null, fine: sl && !s1 ? { cam: sl.cam, n: sl.n, pav: sl.pav, fotogrammi: sl.fr - s0.fr } : undefined };
    }
    out.blocchi = await pg.evaluate(() => { const A = window.__pv.R.ISO.arrivo; return A ? { fasi: Object.fromEntries(Object.entries(A.fasi).map(([k, v]) => [k, Math.round(v)])), lista: A.blocchi.slice(0, 60) } : null; });
    if (out.blocchi) { const L = out.blocchi.lista, V = L.filter(x => x.vicino); const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
      out.blocchiSintesi = { n: L.length, vicini: V.length, msMediana: med(L.map(x => x.ms)), frMediana: med(L.map(x => x.fr)), attMediana: med(L.map(x => x.att)), durataMediana_ms: med(L.map(x => x.t1 - x.t0)) }; }
    out.progTardi = await pg.evaluate(() => window.__progTardi.slice(0, 80));
    out.calcolo = await pg.evaluate(() => window.__calcolo || null);
    out.pompa = await pg.evaluate(() => { const P = window.__pv.R.ISO.pompa; return P ? { giri: P.giri, scaduti: P.scaduti, passi: P.passi, ms: Math.round(P.ms) } : null; });
    out.prepara_ms = await pg.evaluate(() => window.__pv.R.ISO.arrivo.prepara);
    out.tasselli = await pg.evaluate(() => window.__tasselli ? { on: window.__tasselli.on, motivo: window.__tasselli.motivo, inScena: window.__tasselli.inScena } : null);
    out.campioni = S.filter((s, i) => i % 4 === 0).map(s => [s.t, s.fr, s.n, s.fatti, s.pav, s.veg, s.verde, s.job, s.prog]);
    out.errori = errori.slice(0, 12); out.avvisi = avvisi.slice(0, 12);
  } catch (e) { out.errore = String(e && e.stack || e); }
  const f = path.join(require('os').tmpdir(), `arrivo_${NOME}.json`); fs.writeFileSync(f, JSON.stringify(out, null, 1));
  const { campioni, progTardi, ...corto } = out; console.log(JSON.stringify(corto, null, 1).slice(0, 7000)); console.log('programmi tardi:', (out.progTardi || []).length, 'scritto', f);
  await b.close(); srv.close(); process.exit(0);
});
