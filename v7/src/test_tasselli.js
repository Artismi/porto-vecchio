// [tasselli] prova della città a tasselli, senza browser:
//   1. l'impronta: quella che build.py scrive nella pagina (index.html, PV_IMPRONTA_TASS) è quella dei sorgenti di adesso (rifatta qui come
//      build.py: i moduli del gioco tranne il caricatore, l'esportatore, i modelli, il mondo cotto); il caricatore e il suo lavoratore non la
//      cambiano; se ci sono tasselli in v7/tasselli/ si dice se sono di questa impronta (non è un errore: in git non ci sono, li cuoce il
//      workflow e li scarica il build di Vercel);
//   2. il caricatore (src/tasselli.js) in un browser finto: di difetto chiede i tasselli; con ?tasselli=0, nello Studio, nel laboratorio
//      degli scorci no; se l'indice manca, è di un'altra impronta, non ha i dati del gioco o dati.json manca, pronto dà false (la città
//      si costruisce come prima, nessun errore); con indice e dati giusti dà true e attivo() è vero;
//   3. il deploy: v7/tasselli/ è fuori da git (.gitignore), vercel.json chiama strumenti/prendi_tasselli.sh, il workflow c'è.
// cd v7/src && node test_tasselli.js [--seme=12345]   (il seme non serve: niente caso)
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const V7 = path.join(__dirname, '..'), SRC = __dirname, ROOT = path.join(V7, '..');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// ---------- 1. l'impronta ----------
function impronta() {
  const bp = fs.readFileSync(path.join(V7, 'build.py'), 'utf8'), set = re => new Set((bp.match(re) || [, ''])[1].split(',').map(q => q.trim().replace(/^'|'$/g, '')).filter(Boolean));
  const FUORI = set(/TASS_FUORI = \{([^}]*)\}/), STUDIO = set(/SOLO_STUDIO = \{([^}]*)\}/), PAUSA = set(/IN_PAUSA = \{([^}]*)\}/);
  // il mondo cotto (Cotto.FONTI)
  const FONTI = /const FONTI = \[([^\]]*)\]/.exec(fs.readFileSync(path.join(SRC, 'cotto.js'), 'utf8'))[1].split(',').map(q => q.trim().replace(/^'|'$/g, '')).filter(Boolean);
  const hc = crypto.createHash('sha1'); FONTI.forEach(f => { hc.update(f); hc.update('\0'); hc.update(fs.readFileSync(path.join(SRC, f))); hc.update('\0'); });
  const IMPRONTA = hc.digest('hex').slice(0, 16);
  // i modelli (PV_VER)
  const VER = {}; const walk = d => fs.readdirSync(path.join(V7, d), { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1).forEach(e => { const q = d + '/' + e.name; if (e.isDirectory()) walk(q); else if (['glb', 'json', 'png', 'jpg', 'webp'].includes(e.name.split('.').pop().toLowerCase())) VER[q] = crypto.createHash('sha1').update(fs.readFileSync(path.join(V7, q))).digest('hex').slice(0, 10); });
  walk('assets');
  const VS = {}; Object.keys(VER).sort().forEach(k => VS[k] = VER[k]);
  const VER_JS = '<script>window.PV_VER = ' + JSON.stringify(VS).replace(/":/g, '":').replace(/,"/g, ',"') + ';</script>\n';
  const h = fs.readFileSync(path.join(SRC, 'index.src.html'), 'utf8'), t = crypto.createHash('sha1');
  for (const m of h.matchAll(/\/\*([a-z0-9_.]+\.js)\*\//g)) { const f = m[1]; if (FUORI.has(f) || STUDIO.has(f) || PAUSA.has(f)) continue; t.update(f); t.update('\0'); t.update(fs.readFileSync(path.join(SRC, f))); t.update('\0'); }
  for (const f of ['strumenti/tassella.js', 'strumenti/tassella_pagina.js']) t.update(fs.readFileSync(path.join(V7, f)));
  t.update(VER_JS); t.update(IMPRONTA);
  return { tass: t.digest('hex').slice(0, 16), FUORI };
}
const I = impronta(), pagina = /PV_IMPRONTA_TASS = '([0-9a-f]{16})'/.exec(fs.readFileSync(path.join(V7, 'index.html'), 'utf8'));
ok(pagina && pagina[1] === I.tass, `l'impronta della pagina (${pagina && pagina[1]}) è quella dei sorgenti (${I.tass}): build.py è stato rifatto`);
ok(['tasselli.js', 'tasselli_lavoratore.js', 'meshopt_decoder.js'].every(f => I.FUORI.has(f)), 'il caricatore e il lavoratore non cambiano l\'impronta (TASS_FUORI)');
{ const f = path.join(V7, 'tasselli', 'indice.json');
  if (fs.existsSync(f)) { const m = /"impronta":"([0-9a-z]+)"/.exec(fs.readFileSync(f, 'utf8').slice(0, 400)); console.log(`info v7/tasselli: impronta ${m && m[1]} (${m && m[1] === I.tass ? 'di questa build' : 'di un\'altra build: il gioco costruirà la città'})`); }
  else console.log('info v7/tasselli: nessun tassello in locale (python3 build.py --tasselli per cuocerli)'); }

// ---------- 2. il caricatore in un browser finto ----------
global.THREE = require(path.join(SRC, 'three.min.js'));
const CODICE = fs.readFileSync(path.join(SRC, 'tasselli.js'), 'utf8');
async function carica(search, risposte, opz) {
  opz = opz || {}; const chieste = [];
  const fetch = u => { const p = new URL(u).pathname.replace(/^\//, ''); chieste.push(p); const r = risposte[p]; return Promise.resolve(r === undefined ? { ok: false, status: 404, json: () => Promise.reject(new Error('404')) } : { ok: true, status: 200, json: () => Promise.resolve(JSON.parse(JSON.stringify(r))) }); };
  const window = { PV_IMPRONTA_TASS: opz.imp === undefined ? 'abcdef0123456789' : opz.imp, PV_STUDIO: !!opz.studio };
  const ctx = vm.createContext({ window, location: { search, href: 'http://prova/index.html' + search }, fetch, Worker: function () { }, DecompressionStream: function () { }, THREE, URL, console: { log() { }, warn() { } }, performance, requestAnimationFrame: () => 0, setTimeout, Blob: function () { }, navigator: {} });
  vm.runInContext(CODICE, ctx);
  const T = ctx.Tasselli, v = await T.pronto;
  return { v, T, chieste, st: T.stato() };
}
const IMP = 'abcdef0123456789', IND = { versione: 1, impronta: IMP, cella: 48, tasselli: [], materiali: [], tessiture: [], luci: [], pozze: [], uni: {}, dati: { file: 'dati.json' }, programmi: [] };
const DATI = { versione: 1, impronta: IMP, case: [], bmut: [], props: [], vivi: [], heads: [], insegne: [], fwater: [], aloni: [], geo: [] };
(async () => {
  let r = await carica('', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI });
  ok(r.T.chiesto && r.v === true && r.T.attivo(), 'di difetto: indice e dati giusti, i tasselli si usano');
  ok(r.chieste.every(q => q.startsWith('tasselli/')), 'si chiede solo sotto tasselli/');
  r = await carica('?tasselli=0', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI });
  ok(!r.T.chiesto && r.v === false && !r.T.attivo() && r.chieste.length === 0, '?tasselli=0: la città nel browser, nessuna richiesta');
  r = await carica('?tasselli=1', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI });
  ok(r.v === true, '?tasselli=1 (il vecchio interruttore del pilota) va ancora');
  r = await carica('', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI }, { studio: true });
  ok(r.v === false && r.chieste.length === 0, 'nello Studio no');
  r = await carica('?scorcio=vittoria', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI });
  ok(r.v === false && r.chieste.length === 0, 'nel laboratorio degli scorci no');
  r = await carica('', {});
  ok(r.v === false && !r.T.attivo() && /indice mancante/.test(r.st.motivo), 'indice mancante: la città nel browser (' + r.st.motivo + ')');
  r = await carica('', { 'tasselli/indice.json': Object.assign({}, IND, { impronta: '0000000000000000' }), 'tasselli/dati.json': DATI });
  ok(r.v === false && /impronta/.test(r.st.motivo) && !r.chieste.includes('tasselli/dati.json'), 'tasselli di un\'altra impronta: la città nel browser, i dati non si scaricano');
  r = await carica('', { 'tasselli/indice.json': IND, 'tasselli/dati.json': DATI }, { imp: null });
  ok(r.v === false, 'pagina senza impronta: la città nel browser');
  r = await carica('', { 'tasselli/indice.json': Object.assign({}, IND, { dati: null }) });
  ok(r.v === false && /dati/.test(r.st.motivo), 'cottura vecchia senza i dati del gioco: la città nel browser');
  r = await carica('', { 'tasselli/indice.json': IND });
  ok(r.v === false && /dati/.test(r.st.motivo), 'dati.json mancante: la città nel browser');
  r = await carica('', { 'tasselli/indice.json': IND, 'tasselli/dati.json': Object.assign({}, DATI, { impronta: '1111111111111111' }) });
  ok(r.v === false, 'dati.json di un\'altra impronta: la città nel browser');
  r = await carica('', { 'tasselli/indice.json': Object.assign({}, IND, { versione: 2 }), 'tasselli/dati.json': DATI });
  ok(r.v === false, 'un indice di un\'altra versione: la città nel browser');
  ok(r.T.faseViva('sky') && r.T.faseViva('island') && !r.T.faseViva('buildings') && !r.T.faseViva('fusione1'), 'le fasi della città saltano, cielo e isola restano');

  // ---------- 3. il deploy ----------
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  ok(/^v7\/tasselli\/$/m.test(gi), 'v7/tasselli/ fuori da git (.gitignore)');
  for (const f of ['vercel.json', 'v7/vercel.json']) { const j = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); ok(/prendi_tasselli\.sh/.test(j.buildCommand || '') && j.outputDirectory === '.', f + ': il build scarica i tasselli (prendi_tasselli.sh), la pagina resta quella di sempre'); }
  const wf = path.join(ROOT, '.github', 'workflows', 'tasselli.yml');
  ok(fs.existsSync(wf) && /tassella\.js --impronta=/.test(fs.readFileSync(wf, 'utf8')) && /gh release create/.test(fs.readFileSync(wf, 'utf8')), 'il workflow cuoce e pubblica in una release');
  const sh = fs.readFileSync(path.join(V7, 'strumenti', 'prendi_tasselli.sh'), 'utf8');
  ok(/PV_IMPRONTA_TASS/.test(sh) && /exit 0\s*$/.test(sh), 'prendi_tasselli.sh legge l\'impronta della pagina e non fa mai fallire il build');
  console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
