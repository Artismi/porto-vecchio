// [graffitipool] prova di ?graffiti2 (src/graffiti2.js), senza browser, sulla città nuova coi graffiti cotti dei tasselli (se ci sono):
//   - spento (di serie) non cambia niente: la stessa storia dei muri, lavoro per lavoro (stile, seme, posto), con e senza graffiti2.js caricato;
//   - acceso: molti più lavori nel borgo; niente di nuovo su piazze, chiesa, regime, campagna; niente a meno di 1,2 m da una porta; niente
//     doppioni (porte, pali, fondali) sopra la cottura; i lavori nuovi freschi (età ≤ .3), nella fascia bassa (hRel ≤ 1,9), con le alternative;
//   - la stessa città a ogni partita (il seme è fisso).
//   node test_graffiti2.js [tasselli/graffiti.json]
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const POOL = path.join(__dirname, '..', 'strumenti', 'graffiti_pool.js');
const F = process.argv[2] || path.join(__dirname, '..', 'tasselli', 'graffiti.json'), TAS = fs.existsSync(F);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const run = (...a) => JSON.parse(execFileSync(process.execPath, [POOL, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop());
// spento: graffiti2.js caricato ma senza interruttore = com'era (il conto lavoro per lavoro: la firma)
{ global.PV_STRADA_DIPINTA = true; const rq = f => require('./' + f);
  global.World = rq('world_cittanuova.js'); global.Interior = rq('interiors.js'); global.Game = rq('game.js');
  const G2 = rq('graffiti2.js'); ok(!G2.on, 'senza ?graffiti2 spento'); }
const A = run('senza'), B = run('senza', '--g2');
ok(B.totale > A.totale * 1.15, `senza tasselli: ${A.totale} lavori di serie, ${B.totale} con graffiti2`);
if (TAS) { const C = run('tasselli', F), D = run('tasselli', F, '--g2');
  ok(D.totale > C.totale * 2, `coi tasselli (la città di serie): ${C.totale} lavori, ${D.totale} con graffiti2 (borgo ${C.borgo} → ${D.borgo})`);
  ok(D.g2 && D.g2.doppioni > 0 && D.livelli.porta <= C.adesivi.porte + 2, `niente doppioni sopra la cottura: ${D.g2.doppioni} tolti, porte ${D.livelli.porta}`);
  ok(D.g2.recupero > 100, `il recupero dei lavori che la cottura non ha piazzato: ${D.g2.recupero}`);
  for (const z of ['piazza', 'sacro', 'regime']) ok((D.zone[z] || 0) <= (C.zone[z] || 0) + (D.g2.recupero ? 40 : 0), `${z}: ${C.zone[z] || 0} → ${D.zone[z] || 0} (niente di nuovo, solo il recupero del piano)`); }
else console.log('(niente tasselli/graffiti.json: solo senza tasselli)');
// acceso, nel dettaglio: i lavori nuovi
{ const out = execFileSync(process.execPath, ['-e', `
  global.PV_STRADA_DIPINTA = true; global.PV_GRAFFITI2 = true; const rq = f => require(${JSON.stringify(__dirname)} + '/' + f);
  global.World = rq('world_cittanuova.js'); global.Interior = rq('interiors.js'); global.Game = rq('game.js'); global.Risacca = rq('risacca.js'); global.Popolo = rq('popolo.js'); global.Azioni = rq('azioni.js');
  global.Economia = rq('economia.js'); global.Fazioni = rq('fazioni.js'); global.Soldi = rq('soldi.js'); global.Oggetti = rq('oggetti.js'); global.Graffiti = rq('graffiti.js'); global.Livelli = rq('livelli.js');
  global.Sottosuolo = rq('sottosuolo.js'); global.Tetti = rq('tetti.js'); global.WriterArte = rq('writer_arte.js'); global.Writing = rq('writing.js'); global.Segnaletica = rq('segnaletica.js');
  global.StradaDipinta = rq('strada_dipinta.js'); global.Graffiti2 = rq('graffiti2.js'); global.WriterVita = rq('writer_vita.js');
  try { Segnaletica.piano(); } catch (e) { }
  const st = Game.create(1); for (let i = 0; i < 6; i++) Game.step(st, 1 / 30, { x: 0, y: 0 }); if (!WriterVita.V(st).hist) WriterVita.history(st);
  const N = Writing.S(st).works.filter(w => w.sdG2), TS = Game.TS, porte = Game.BUILDINGS.filter(b => b.door).map(b => [(b.door[0] + .5) * TS, (b.door[1] + .5) * TS]);
  const r = { n: N.length, pulite: N.filter(w => /^(piazza|sacro|regime|fuori)$/.test(w.sdZona)).length, porta: N.filter(w => porte.some(d => Math.hypot(d[0] - w.spot.x, d[1] - w.spot.y) < 1.2)).length,
    eta: Math.max(...N.map(w => w.sdEta)), alto: Math.max(...N.map(w => (w.sdGrandi && w.sdGrandi[0] && w.sdGrandi[0].hRel) || 0)), alt: N.filter(w => w.sdAlt && w.sdAlt.length).length,
    alti: N.filter(w => /^(verticale|rullo)$/.test(w.style)).length, arrivo: N.filter(w => w.sdLiv === 'arrivo').length,
    firma: require('crypto').createHash('sha1').update(N.map(w => w.style + w.seed + Math.round(w.spot.x) + ',' + Math.round(w.spot.y)).join('|')).digest('hex') };
  console.log(JSON.stringify(r));`], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop();
  const r = JSON.parse(out);
  ok(r.n > 300, `i lavori nuovi: ${r.n} (muri d'arrivo ${r.arrivo})`);
  ok(r.pulite === 0, 'niente di nuovo su piazze, chiesa, regime, campagna');
  ok(r.porta === 0, 'niente di nuovo a meno di 1,2 m da una porta');
  ok(r.eta <= .31, `freschi: età al più ${r.eta.toFixed(2)}`);
  ok(r.alto <= 1.9 && r.alti === 0, `nella fascia che la camera vede: centro al più a ${r.alto.toFixed(2)} m, nessun verticale o rullo nuovo`);
  ok(r.alt === r.n, 'tutti con le alternative se il primo posto non entra');
  ok(r.arrivo >= 15, `i muri d'arrivo: ${r.arrivo}`);
  const again = JSON.parse(execFileSync(process.execPath, [POOL, 'senza', '--g2'], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').pop());
  ok(again.totale === B.totale, 'la stessa città a ogni partita'); }
console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
