// [fluido] IL BANCO DELLA LOGICA, senza browser (v7/FLUIDO.md): i moduli della logica come sonda_vita.js, G.step a passi di 1/60 s,
// fermi in tre posti alle 11 (inizio, porto, piazza), e per ognuno i ms per passo (mediana, media, p95) e, con --prof, il profilo
// (node --cpu-prof). Serve a vedere la simulazione senza aspettare il browser; i ms sono di Node su questa macchina, valgono i rapporti.
//   node strumenti/banco_logica.js [--secondi=20] [--seme=1] [--posti=inizio,porto,piazza] [--json=out.json]
'use strict';
const path = require('path'), fs = require('fs');
const SRC = path.join(__dirname, '..', 'src') + '/';
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODS = ['World:world_cittanuova', 'Interior:interiors', 'Game:game', 'Posti:posti', 'Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni',
  'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Attivita:attivita', 'Cassaforti:cassaforti', 'Mestieri:mestieri', 'Scambi:scambi',
  'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Livelli:livelli',
  'Sottosuolo:sottosuolo', 'Ordine:ordine', 'Scontri:scontri', 'Animali:animali', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing',
  'WriterVita:writer_vita', 'Eventi:eventi', 'Matti:matti', 'Chiarezza:chiarezza', 'Vievive:vievive'];
{ let a = 12345; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }   // il caso fisso: due giri uguali danno la stessa firma
if (arg('query', null)) global.location = { search: '?' + arg('query').replace(/^[?&]/, ''), hostname: 'localhost', pathname: '/' };   // --query=nofluidogiri: gli interruttori del gioco
if (process.argv.includes('--anello')) globalThis.__anello = true;   // [fluido] l'anello del telefono anche qui
const manca = []; { const _l = console.log; console.log = () => { };
  for (const m of MODS) { const [g, f] = m.split(':'); if (global[g]) continue; try { global[g] = require(SRC + f + '.js'); } catch (e) { manca.push(f + ': ' + e.message.slice(0, 80)); } }
  console.log = _l; }
if (manca.length) console.log('moduli non caricati:', manca.join(' · '));
const G = global.Game, st = G.create(+arg('seme', 1)), W = G.MAP.world, p = st.player;
const set = k => { const s = (W.sets || []).find(s => s.k === k); return s ? [(s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2] : null; };
const XY = { inizio: [p.x, p.y], porto: [1290, 381], piazza: set('adunata') || [1410, 343] };
const SEC = +arg('secondi', 20), dt = 1 / 60, inp = { x: 0, y: 0 }, out = {}, LENTI = [];   // LENTI: i passi oltre 25 ms [inizio, fine] in µs (lo stesso orologio di --cpu-prof)
st.deadline = 1e12;
// --alloc=<file>: le allocazioni (anche quelle già raccolte) dei soli passi misurati, per funzione file:riga, KB per passo
const ALLOC = arg('alloc', null), insp = ALLOC ? new (require('inspector').Session)() : null, post = (m, p) => new Promise((ok, ko) => insp.post(m, p || {}, (e, r) => e ? ko(e) : ok(r)));
if (insp) insp.connect();
(async () => {
for (const nome of arg('posti', 'inizio,porto,piazza').split(',')) {
  const [x, y] = XY[nome]; p.vehicle = null; p.indoor = null; p.lv = null; p.path = []; p.x = x; p.y = y;
  st.t = Math.floor(st.t / 1440) * 1440 + 1440 + 660;
  for (let i = 0; i < 600; i++) { G.step(st, dt, inp); if (st.over) st.over = null; }   // 10 s per scaldare (la bolla, i lavori)
  const ms = [], cpu = []; let agg = 0;   // cpu: il tempo di processore del passo (process.cpuUsage), meno sensibile al carico della macchina
  if (insp) { await post('HeapProfiler.enable'); await post('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
  for (let i = 0; i < SEC / dt; i++) { const t = process.hrtime.bigint(), c0 = process.cpuUsage(); G.step(st, dt, inp); const t1 = process.hrtime.bigint(), q = Number(t1 - t) / 1e6, c1 = process.cpuUsage(c0); ms.push(q); cpu.push((c1.user + c1.system) / 1000); { let u = 0; for (const n of st.npcs) if (!n.dead && !n.__far) u++; agg += u; } if (q > 25) LENTI.push([Number(t / 1000n), Number(t1 / 1000n)]); if (st.over) st.over = null; }
  if (insp) { const { profile } = await post('HeapProfiler.stopSampling'); const A = {}; let T = 0; const nomeF = cf => `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
    const walk = (n, up) => { const cf = n.callFrame, k = nomeF(cf) + (!cf.url && up ? ' <= ' + nomeF(up.callFrame) : ''); if (n.selfSize) { A[k] = (A[k] || 0) + n.selfSize; T += n.selfSize; } (n.children || []).forEach(c => walk(c, n)); }; walk(profile.head, null);
    out['alloc_' + nome] = { KBperPasso: +(T / 1024 / ms.length).toFixed(1), perFunzione: Object.entries(A).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${(v / 1024 / ms.length).toFixed(2)} KB/passo ${k}`) }; }
  const a = ms.slice().sort((q, w) => q - w), med = a[a.length >> 1], avg = ms.reduce((s, v) => s + v, 0) / ms.length, p95 = a[Math.floor(a.length * .95)], mx = a[a.length - 1];
  const B = st.bubble || { x, y, r: 60 }, vic = st.npcs.filter(n => !n.dead && Math.abs(n.x - B.x) < B.r && Math.abs(n.y - B.y) < B.r).length;
  const ac = cpu.slice().sort((q, w) => q - w);
  out[nome] = { xy: [x, y], passi: ms.length, aggiornatiPerPasso: +(agg / ms.length).toFixed(1), cpuMedia: +(cpu.reduce((s, v) => s + v, 0) / cpu.length).toFixed(3), cpuMediana: +ac[ac.length >> 1].toFixed(3), mediana: +med.toFixed(3), media: +avg.toFixed(3), p95: +p95.toFixed(3), max: +mx.toFixed(2), npc: st.npcs.length, nellaBolla: vic, mezzi: st.vehicles.length };
  { let h = 0; const mix = v => { h = Math.imul(h ^ Math.round(v * 1000), 2654435761) >>> 0; }; for (const n of st.npcs) { mix(n.x); mix(n.y); } for (const v of st.vehicles) { mix(v.x); mix(v.y); } out[nome].firma = h.toString(16); }   // la firma: dove sono tutti alla fine
  console.log(nome, JSON.stringify(out[nome]));
}
if (ALLOC) fs.writeFileSync(ALLOC, JSON.stringify(Object.fromEntries(Object.entries(out).filter(([k]) => /^alloc_/.test(k))), null, 1));
if (arg('json', null)) fs.writeFileSync(arg('json'), JSON.stringify(out, null, 1));
if (arg('lenti', null)) fs.writeFileSync(arg('lenti'), JSON.stringify(LENTI));
})();
