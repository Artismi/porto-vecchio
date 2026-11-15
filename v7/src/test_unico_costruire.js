// [unico] prova di «costruire in città», fase 1 (unico_costruire.js, commedia/COSTRUIRE_IN_CITTA.md, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_costruire.js
// Controlla:
//  - SPENTO: UnicoCostruire = { ON: false } e nient'altro; senza il modulo la mente ha i suoi diciotto obiettivi;
//  - LA MENTE: il gruppo sceglie «rivendicare» (Mente.estendi), procura il materiale raccattando (il mucchio, le sorgenti) e mette i
//    pezzi coi verbi del catalogo (barrica, tira_su_baracca), ognuno col suo fatto puro e del suo attore;
//  - I FATTI COI SEGNI: rivendica, barricata (in via X), baracca (sul corso), con la bolla e la riga della Gazzetta;
//  - I VINCOLI: il varco libero, il tetto dei pezzi, un cantiere per zona, al più CFG.max aperti;
//  - IL LONTANO: senza nessuno vicino il cantiere va avanti dai dati (la stessa porta, strategia C);
//  - IL SALVATAGGIO: i pezzi sono dati in st.u.costruire, tornano uguali col caricamento (Salva.via / Salva.torna) e i pezzi nel mondo
//    (quelli che il disegno rifà) sono gli stessi. Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };

function carica(spento, query) {
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0])) && !/^\s+seme \d/.test(String(a[0]))) zitto(...a); };
  require(SRC + 'seme.js')(1);
  global.location = { search: spento ? '' : '?commedia' + (query || '') };
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
  global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
  try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
  delete global.document;
  const U = global.Unico = require(SRC + 'unico_porta.js');
  for (const m of COMMEDIA) { const [f, g] = m.split(':'); if (U.ON) U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
  if (U.ON) U._nomeProva = null;
  global.Attore = require(SRC + 'unico_attore.js'); global.Roba = Attore.Roba;
  global.UnicoCatalogo = require(SRC + 'unico_catalogo.js'); global.Lingua = require(SRC + 'unico_lingua.js');
  global.Verbo = require(SRC + 'unico_verbi.js'); global.Fatto = require(SRC + 'unico_memoria.js');
  global.UnicoSociali = require(SRC + 'unico_sociali.js'); global.Segni = require(SRC + 'unico_segni.js');
  global.Mente = require(SRC + 'unico_mente.js'); global.Salva = require(SRC + 'unico_salva.js');
  if (U.ON) U._nomeProva = 'unico_costruire';
  global.UnicoCostruire = require(SRC + 'unico_costruire.js');
  if (U.ON) { U._nomeProva = null; U.chiudi(); Mente.CFG.classe = 'xe'; }
  console.log = zitto;
  return U;
}

if (process.argv.includes('--senzatappa')) {   // ?commedia senza &cantiere: nessun cantiere forzato vicino al giocatore
  carica(false); const st = Game.create(1); for (let i = 0; i < 400; i++) Game.step(st, 1 / 20, { x: 0, y: 0 });
  process.stdout.write('@@' + JSON.stringify({ tappa: UnicoCostruire.TAPPA, n: st.u.costruire ? st.u.costruire.cantieri.length : 0 }) + '\n'); process.exit(0);
}
if (process.argv.includes('--spento')) {
  carica(true); process.stdout.write('@@' + JSON.stringify({ uc: Object.keys(UnicoCostruire), un: Object.keys(Unico) }) + '\n'); process.exit(0);
}
{
  const { execFileSync } = require('child_process');
  const o = execFileSync(process.execPath, [__filename, '--spento'], { encoding: 'utf8', maxBuffer: 1 << 26 }), J = JSON.parse(o.split('\n').find(l => l.startsWith('@@')).slice(2));
  ok(J.uc.join() === 'ON' && J.un.join() === 'ON', 'spento il flag: UnicoCostruire = { ON: false } e nient\'altro');
}

{
  const { execFileSync } = require('child_process');
  const o = execFileSync(process.execPath, [__filename, '--senzatappa'], { encoding: 'utf8', maxBuffer: 1 << 26 }), J = JSON.parse(o.split('\n').find(l => l.startsWith('@@')).slice(2));
  ok(J.tappa === null && J.n === 0, `senza &cantiere nessun cantiere forzato (${J.n} il primo giorno)`);
}
const U = carica(false, '&cantiere'), G = Game, UC = UnicoCostruire, F = Fatto;
ok(UC.ON && U._.FASI.some(f => f.nome === 'unico.costruire'), 'acceso: la fase unico.costruire');
ok(Mente.OBIETTIVI.rivendicare && Object.keys(Mente.OBIETTIVI).length === 19 && ['raccatta', 'barrica', 'tira_su_baracca', 'presidia'].every(v => Verbo.SCHEDE[v] && Verbo.SCHEDE[v].segno),
  'Mente.estendi: l\'obiettivo «rivendicare» in più (19), i quattro verbi nel catalogo, ognuno col suo segno');

const st = G.create(1); st.deadline = 1e12;
const passo = k => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
passo(20);
// il giocatore in una via di città, fuori
// (vicino a un tratto dove la barricata può stare: dritto, in piano, lontano dagli incroci; Via del Governo è in salita)
{ const V0 = UC.viaVicina(st.player.x, st.player.y, rd => rd.id !== 'corso' && rd.kind === 'citta'); const p = st.player; p.vehicle = null; p.indoor = null; p.x = V0.x + 4; p.y = V0.y + 2;
  const R0 = UnicoParti.sito(st, 'barricata', { x: p.x, y: p.y, seme: 'prova', altri: [], R: 90 }); if (R0) { p.x = R0.S.x - Math.sin(R0.S.a) * 7; p.y = R0.S.y + Math.cos(R0.S.a) * 7; } }
passo(60);
const s = st.u.costruire, C = s.cantieri.find(x => x.id === s.tappa);
ok(!!C && C.tipo === 'barricata' && C.gruppo.length >= 3 && !!C.mucchio, `la tappa: barricata in ${C && C.via} col gruppo di ${C && C.gruppo.length} (${C && C.motivo}) e il mucchio`);
const fR = C && F.di(st, C.fid);
ok(!!fR && fR.v === 'rivendica' && fR.x && fR.x.via === C.via && F.puro(fR) !== false, 'il fatto «rivendica» (il gruppo ha deciso), puro, con la via');
// la mente lavora: fino a 9000 passi (~9 min di gioco a 1,2 min/s… in passi da 1/20 s: 7,5 min veri)
const scelte = new Set();
let t0 = Date.now();
for (let k = 0; k < 9000 && C.fine === null; k++) {
  passo(1);
  if (k % 50 === 0) for (const id of C.gruppo) { const M = st.u.menti[id]; if (M && M.ob) scelte.add(id + ':' + M.ob.g); }
}
const sec = ((Date.now() - t0) / 1000).toFixed(0);
const chiR = [...scelte].filter(x => /:rivendicare$/.test(x)).length;
ok(chiR >= 2, `la mente: ${chiR} del gruppo hanno scelto «rivendicare»`);
const fatti = F.tutti(st), fP = fatti.filter(f => f.v === 'barrica' && f.esito === 'ok'), fRac = fatti.filter(f => f.v === 'raccatta' && f.esito === 'ok');
ok(C.pezzi.length >= 6, `i pezzi messi: ${C.pezzi.length}/${C.piano.length} in ${sec} s (fatti «barrica» ${fP.length}, «raccatta» ${fRac.length})`);
ok(fP.length > 0 && fP.every(f => C.gruppo.includes(f.chi)) && new Set(fP.map(f => f.chi)).size >= 2, `i pezzi li mettono quelli del gruppo, coi verbi (${new Set(fP.map(f => f.chi)).size} diversi)`);
ok(fRac.length > 0 && fRac.every(f => f.x && f.x.verbo === 'raccatta'), 'il materiale si procura raccattando (dal mucchio)');
ok(fP.every(f => !!f.segno && /B/.test(f.segno)), `ogni pezzo ha il suo segno (la bolla): ${[...new Set(fP.map(f => f.segno))].join(' ')}`);
// i vincoli
const varco = UC.varcoDi(C), PM = UC.pezziMondo(C);
const distSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(a.x + dx * u - p.x, a.y + dy * u - p.y); };
const MEZZA = { bancale: .6, lamiera: .65, porta: 1, copertone: .32, assi: .85, trave: .06, striscione: 0 }, x1 = C.w / 2 - UC.CFG.varco;
const fuori = C.piano.filter(p => p[1] * C.lato + (p[0] === 'striscione' ? p[6] / 2 : MEZZA[p[0]]) > x1 + .03);
ok(C.piano.length <= UC.CFG.maxPezzi && !fuori.length && Math.hypot(varco[1].x - varco[0].x, varco[1].y - varco[0].y) >= 1.6 && PM.every(p => distSeg({ x: p[1], y: p[2] }, varco[0], varco[1]) > .05), `il varco resta libero (${Math.hypot(varco[1].x - varco[0].x, varco[1].y - varco[0].y).toFixed(1)} m), al più ${UC.CFG.maxPezzi} pezzi`);
ok(UC.apri(st, { tipo: 'barricata', x: C.x + 3, y: C.y, gruppo: C.gruppo.slice(0, 3) }) === null, 'un cantiere per zona: un secondo lì accanto non si apre');
// finire: se manca qualcosa lo finisce il lontano
if (C.fine === null) { const p = st.player; p.x += 400; for (let k = 0; k < 40 && C.fine === null; k++) { st.t += UC.CFG.lontanoOgni + 1; passo(UC.CFG.ogni); } }
const fB = fatti.concat(F.tutti(st)).find(f => f.v === 'barricata');
ok(C.fine !== null && !!fB && fB.x.via === C.via, `finita: il fatto «barricata in ${C.via}»${UC.stats.lontano ? ` (${UC.stats.lontano} pezzi dal lontano)` : ''}`);
const riga = Segni.TIPI.barricata.r.map(r => r.replace('{via}', C.via)).join(' / ');
ok(Segni.TIPI.barricata.gz > .5 && /Barricata in /.test(riga), 'la Gazzetta ha la riga: ' + riga.slice(0, 90));
// la baracca sul corso, finita subito (la tappa &pronto, dalla stessa porta apri)
// (a metà del corso, o il punto più vicino a metà fuori dalla zona della barricata: un cantiere per zona)
const corso = (G.MAP.roads || []).find(r => r.id === 'corso'), mz = Math.floor(corso.pts.length / 2), pc = corso.pts.map((q, i) => [Math.abs(i - mz), q]).filter(([, q]) => Math.hypot(q[0] - C.x, q[1] - C.y) > UC.CFG.zona + 15).sort((a, b) => a[0] - b[0]).map(x => x[1])[0] || corso.pts[mz];
const liberi = st.npcs.filter(n => !n.inside && n.pop && Mente._.candidato(st, n) && !C.gruppo.includes(n.id)).slice(0, 3).map(n => n.id);
const B = UC.apri(st, { tipo: 'baracca', x: pc[0], y: pc[1], gruppo: liberi, pronto: true });
const fBa = B && F.tutti(st).find(f => f.v === 'baracca');
ok(!!B && B.via === corso.name && B.fine !== null && B.pezzi.length === B.piano.length && !!fBa, `la baracca sul ${B && B.via}: ${B && B.pezzi.length} pezzi, il fatto «baracca»`);
{ const nx = -Math.sin(B.a), ny = Math.cos(B.a), off = Math.abs((B.x - pc[0]) * nx + (B.y - pc[1]) * ny); ok(corso.w - (off + 1.2 + corso.w / 2) >= -.01 && corso.w / 2 + off - 1.2 >= 3, `la baracca lascia sul corso ${(corso.w / 2 + off - 1.2).toFixed(1)} m di passaggio`); }
// il lontano: un gruppo lontano dal giocatore costruisce dai dati, con la stessa porta (Verbo.applica, strategia C)
{
  const p = st.player, cand = st.npcs.filter(n => !n.inside && n.pop && Mente._.candidato(st, n) && !UC.cantiereDi(st, n.id));
  // (il primo gruppo con una via lì vicino dove la barricata sta: dritta, in piano, lontana dagli incroci)
  let D = null; for (const n of cand) { const g = cand.filter(k => k !== n && Math.hypot(k.x - n.x, k.y - n.y) < 60).slice(0, 2); const V0 = UC.viaVicina(n.x, n.y, rd => rd.id !== 'corso' && rd.w >= 5 && rd.w <= 8.5); if (g.length === 2 && V0 && st.u.costruire.cantieri.every(C2 => Math.hypot(C2.x - V0.x, C2.y - V0.y) > UC.CFG.zona)) { const L = [n].concat(g); D = UC.apri(st, { tipo: 'barricata', x: V0.x, y: V0.y, gruppo: L.map(k => k.id) }); if (D) break; } }
  if (D) { p.x = D.x + 600 > G.WW - 20 ? D.x - 600 : D.x + 600; passo(200); }
  for (let k = 0; D && k < 40 && D.fine === null; k++) { st.t += UC.CFG.lontanoOgni + 1; passo(UC.CFG.ogni); }
  const fl = D ? F.tutti(st).filter(f => f.v === 'barrica' && D.gruppo.includes(f.chi) && f.x && f.x.strat === 'C') : [];
  ok(!!D && D.pezzi.length >= 4 && fl.length >= 4, `il lontano: ${D ? D.pezzi.length + '/' + D.piano.length : 0} pezzi in ${D ? D.via : '?'} dai dati (${fl.length} fatti in strategia C)`);
}
// il salvataggio: i pezzi come dati, tornano uguali
const puro = (() => { try { Salva.puro(st.u.costruire, 'costruire'); return true; } catch (e) { return e.message; } })();
ok(puro === true, 'st.u.costruire è puro (Salva.puro): ' + puro);
const prima = JSON.stringify(st.u.costruire), pm0 = st.u.costruire.cantieri.map(UC.pezziMondo);
const snap = JSON.parse(JSON.stringify(Salva.via(st)));
st.u.costruire.cantieri.forEach(x => { x.pezzi = []; }); passo(20);   // la partita va avanti e perde i pezzi; poi si ricarica
const st2 = st; Salva.torna(snap, st2);
ok(JSON.stringify(st2.u.costruire) === prima && JSON.stringify(st2.u.costruire.cantieri.map(UC.pezziMondo)) === JSON.stringify(pm0), `il caricamento: ${st2.u.costruire.cantieri.length} cantieri, ${pm0.reduce((a, L) => a + L.length, 0)} pezzi nel mondo, uguali`);
console.log(`\n${nOk} ok, ${fail} NO`);
process.exit(fail ? 1 : 0);
