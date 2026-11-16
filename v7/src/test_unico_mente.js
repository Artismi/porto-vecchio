// [unico] prova della mente del sistema unico (unico_mente.js: passo 5 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_mente.js            la prova intera (i giri in processi figli, in parallelo)
//                           node test_unico_mente.js --giro=SEME --giorni=G [--ore=H]   un giro solo (JSON, per i figli)
// Controlla:
//  - SPENTO: Mente = { ON: false } e nient'altro; nessuna fase unico.mente;
//  - I BUDGET a conteggio (§1.3): ≤ 4 scelte d'obiettivo e ≤ CFG.piani[classe] piani HTN per passo, ≤ CFG.lavori cose che costano;
//    il tempo della fase (p50/p95/p99/max) si misura e si stampa, col tempo dei verbi (Verbo.fai) a parte;
//  - IL DETERMINISMO: due processi con lo stesso seme danno gli stessi fatti della mente e le stesse menti (hash);
//  - LE QUATTRO DI VITA (test_vita_npc.js) col sistema unico acceso, dal comportamento della mente: il giocatore fa il giro degli otto
//    posti (2 minuti reali in ognuno) e, se sa di un appuntamento (l'ha visto proporre, o gliel'hanno raccontato), all'ora giusta ci va.
//    Appuntamenti presi e sentiti, incontri visti all'ora giusta, regali o prestiti, conti detti in faccia: ≥ 1 al giorno ciascuno, visti
//    o sentiti dal giocatore (vis ≥ 1), sui semi 1 (1 giorno), 2 (2 giorni), 3 (1 giorno);
//  - LA VARIETÀ: per NPC e per giorno, le sequenze di obiettivi e di verbi: quante diverse, quante ripetute fra due NPC, quante uguali
//    da un giorno all'altro; il carattere sposta gli obiettivi (il generoso regala di più, il chiacchierone racconta di più);
//  - LA LEGGIBILITÀ dei fatti della mente: ≥ 95% di quelli visti o sentiti ha un segno subito (B/P/O/D/F);
//  - LA PAGA DOPPIA: lavora non paga chi ha il lavoro di popolo (la paga matura in P.owed); il fatto la porta in x.maturata;
//  - GLI SPEGNIMENTI: Risacca.autonomy per i membri con la mente, i conti e gli appuntamenti di vita coperti dalla mente;
//  - L'HTN: procura (comprare quello che manca), il piano parziale (il composto in coda resta da espandere), il nope, i macroverbi,
//    i livelli (scena, vicino, lontano, dormiente) e la classe del dispositivo salvata in st.u.classe; lo stato è puro (Fatto.puro).
// Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };
const hash = x => require('crypto').createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);

// carica il gioco come index.src.html: i moduli, la porta, i cinque di commedia, il tag «unico» (… segni, mente), chiudi()
function carica(spento, seme) {
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0])) && !/^\s+seme \d/.test(String(a[0]))) zitto(...a); };
  require(SRC + 'seme.js')(seme || 1);
  global.location = { search: spento ? '' : '?commedia' };
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
  global.Mente = require(SRC + 'unico_mente.js');
  if (U.ON) { U.chiudi(); Mente.CFG.classe = 'xe'; Mente.CFG.registro = true; }
  console.log = zitto;
  return U;
}
const P = k => Game.PLACES[k];
// i fatti della mente: i verbi fatti dagli NPC con la mente (x.verbo; l'id ha una mente) e gli esiti che scrive lei (x.mente)
const dellaMente = (st, f) => !!(f && f.x && (f.x.mente || (f.x.verbo && st.u.menti[f.chi])));

// ============================ IL GIRO (un processo figlio) ============================
if (process.argv.some(a => a.startsWith('--spento'))) {
  carica(true, 1);
  process.stdout.write('@@' + JSON.stringify({ mente: Object.keys(Mente), unico: Object.keys(Unico) }) + '\n', () => process.exit(0));
  return;
}
if (ARG('giro')) {
  const SEME = +ARG('giro'), GIORNI = +ARG('giorni', 1), ORE = +ARG('ore', GIORNI * 24);
  const U = carica(false, SEME), G = Game, st = G.create(SEME), p = st.player, DT = 1 / 20; st.deadline = 1e12;
  const t0 = st.t, GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(P).filter(Boolean);
  let Pz = GIRO[0], tappa = 0, lastSw = st.clock, wp = null, verso = null, andato = 0, k = 0;
  p.x = Pz.x; p.y = Pz.y + 2;
  // i passi: le quote per passo (dai contatori della mente) e il tempo della fase, quello dei verbi a parte
  const B = Mente._.BUD, FASE = Unico._.FASI.find(f => f.nome === 'unico.mente'), f0 = FASE.fn, TM = [], TV = []; let inM = false, tv = 0;
  const vf = Verbo.fai, va = Verbo.applica;
  Verbo.fai = function () { if (!inM) return vf.apply(this, arguments); const a = performance.now(); try { return vf.apply(this, arguments); } finally { tv += performance.now() - a; } };
  Verbo.applica = function () { if (!inM) return va.apply(this, arguments); const a = performance.now(); try { return va.apply(this, arguments); } finally { tv += performance.now() - a; } };
  const Q = { scelte: 0, piani: 0, lavori: 0, pieni: 0 };
  FASE.fn = (s, dt) => { tv = 0; inM = true; const a = performance.now(); try { f0(s, dt); } finally { inM = false; const d = performance.now() - a; if (U.passi > 400) { TM.push(d); TV.push(d - tv); } for (const x in Q) if (B[x] > Q[x]) Q[x] = B[x]; } };
  // gli appuntamenti che il giocatore sa: proposti davanti a lui (vis ≥ 1) o raccontati a lui (Sociali.sa)
  const So = UnicoSociali, noti = () => { const out = []; for (const f of Fatto.per(st, { tipo: 'appuntamento' })) { if (f.esito === 'no' || !f.x || typeof f.x.ora !== 'number') continue; if (f.vis >= 1 || So.sa(st, 'nino', f)) out.push(f); } return out; };
  let ultimoCheck = -1, app = null;
  while (st.t < t0 + ORE * 60) {
    if (k % 40 === 0) {
      app = null; for (const f of noti()) if (st.t > f.x.ora - 12 && st.t < f.x.ora + 40 && P(f.x.posto)) { app = f; break; }
      if (app && verso !== app.id) { verso = app.id; andato++; const q = P(app.x.posto); Pz = { x: q.x, y: q.y }; p.x = q.x; p.y = q.y + 6; wp = null; lastSw = st.clock + 30; }
      else if (!app) verso = null;
    }
    if (!verso && st.clock - lastSw > 120) { lastSw = st.clock; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    // all'appuntamento: si va verso chi è già arrivato (come uno che li cerca con gli occhi)
    if (verso && app && k % 20 === 0) { const ids = [app.chi].concat(app.con || []); const n = st.npcs.find(x => ids.includes(x.id) && !x.inside && x.pop && x.pop.apptArrived); if (n) { const dk = Math.hypot(n.x - p.x, n.y - p.y); if (dk > 30) { p.x = n.x + 7; p.y = n.y; } Pz = { x: n.x, y: n.y }; } }
    if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * (verso ? 10 : 25); wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
    const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
    G.step(st, DT, { x: dx / dd, y: dy / dd }); k++;
  }
  G.step(st, DT, { x: 0, y: 0 });
  // i conti
  const L = Fatto.tutti(st).filter(f => f.t >= t0), MF = L.filter(f => dellaMente(st, f)), vis = f => f.vis >= 1;
  const conta = (v, sol) => MF.filter(f => f.v === v && f.esito !== 'no' && (!sol || vis(f))).length;
  const R = { seme: SEME, giorni: GIORNI, passi: k, andato };
  R.casi = { appuntamenti: conta('appuntamento', true), incontri: conta('incontro', true), regali: conta('regalo', true), prestiti: conta('prestito', true), rinfacci: conta('rinfacciato', true),
    tutti: { appuntamenti: conta('appuntamento'), incontri: conta('incontro'), buche: MF.filter(f => f.v === 'buca').length, regali: conta('regalo'), prestiti: conta('prestito'), rinfacci: conta('rinfacciato'), saldati: conta('saldato') } };
  // vita: i suoi contatori (i conti coperti dalla mente tacciono)
  // gli appuntamenti che il giocatore sapeva: com'è andata (l'incontro, la buca, quanto era lontano)
  R.app = noti().map(f => { const ids = [f.chi].concat(f.con || []), g = Fatto.per(st, { chi: f.chi }).find(x => (x.v === 'incontro' || x.v === 'buca') && x.t > f.t && ids.every(i => [x.chi].concat(x.con || []).includes(i)));
    return [Math.round(f.x.ora), f.x.posto, g ? [g.v, Math.round(g.t), g.vis] : null]; });
  R.vita = st.vita ? { appPresi: st.vita.stats.appPresi, incontriVisti: st.vita.stats.incontriVisti, regali: st.vita.stats.regali, prestiti: st.vita.stats.prestiti, rinfacci: st.vita.stats.rinfacci } : null;
  // la leggibilità dei fatti della mente
  const MV = MF.filter(vis), subito = MV.filter(f => /[BPODF]/.test(f.segno || ''));
  R.leggi = { vis: MV.length, subito: subito.length, senza: {} }; for (const f of MV) if (!/[BPODF]/.test(f.segno || '')) { const q = f.v + ':' + f.esito; R.leggi.senza[q] = (R.leggi.senza[q] || 0) + 1; }
  // la varietà: per NPC e per giorno le sequenze di obiettivi (dal registro della mente) e di verbi (dai fatti)
  const giornoDi = t => Math.floor(t / 1440), seq = {};
  for (const [t, id, g] of Mente.log) { if (t < t0) continue; const k2 = id + '|' + giornoDi(t); (seq[k2] = seq[k2] || { g: [], v: [] }).g.push(g); }
  for (const f of MF) { if (!f.x || !f.x.verbo || f.esito === 'no') continue; const k2 = f.chi + '|' + giornoDi(f.t); (seq[k2] = seq[k2] || { g: [], v: [] }).v.push(f.x.verbo); }
  R.seq = seq;
  // il carattere e gli obiettivi: per ogni mente la quota di ogni obiettivo
  const per = {}; for (const [t, id, g] of Mente.log) { if (t < t0) continue; const q = per[id] = per[id] || {}; q[g] = (q[g] || 0) + 1; }
  R.car = Object.keys(per).map(id => { const M = st.u.menti[id]; return [id, M.carattere, per[id]]; });
  R.mente = { stats: Object.assign({}, Mente.stats, { perche: Object.entries(Mente.stats.perche).sort((a, b) => b[1] - a[1]).slice(0, 12) }), menti: Object.keys(st.u.menti).length, macro: Object.keys(st.u.mente.macro), lod: {} };
  for (const id in st.u.menti) { const l = st.u.menti[id].lod || 'mai'; R.mente.lod[l] = (R.mente.lod[l] || 0) + 1; }
  R.quote = Q; R.classe = st.u.classe;
  const pc = (A, q) => { const S = A.slice().sort((a, b) => a - b); return S.length ? S[Math.min(S.length - 1, Math.floor(q * S.length))] : 0; };
  R.tempo = { n: TM.length, p50: pc(TM, .5), p95: pc(TM, .95), p99: pc(TM, .99), max: pc(TM, 1), media: TM.reduce((s, x) => s + x, 0) / Math.max(1, TM.length), propria: { p50: pc(TV, .5), p95: pc(TV, .95), p99: pc(TV, .99), media: TV.reduce((s, x) => s + x, 0) / Math.max(1, TV.length) } };
  R.err = { tot: Unico.errTot, ultimo: JSON.stringify(Unico.ultimo).slice(0, 300) };
  // il determinismo: i fatti della mente e le menti (senza i campi derivati)
  R.hash = { fatti: hash(MF.map(f => [f.id, f.t, f.v, f.chi, f.con, f.esito, f.cosa])), menti: hash(st.u.menti), n: MF.length };
  let puro = ''; try { Fatto.puro(st.u.menti, 'menti'); Fatto.puro(st.u.mente, 'mente'); } catch (e) { puro = e.message; } R.puro = puro;
  // la catena più lunga fatta dalla mente (prestito → rinfaccio → saldo …)
  const MV2 = MF.filter(f => f.hop >= 2 && f.x && Verbo.SCHEDE[f.x.verbo]);
  R.catene = { hop2: MV2.length, esempi: [...new Set(MV2.sort((a, b) => b.hop - a.hop || a.id - b.id).map(f => Fatto.catena(st, f.id).map(x => x.v).join(' → ')))].slice(0, 4) };
  process.stdout.write('@@' + JSON.stringify(R) + '\n', () => process.exit(0));   // si esce quando è uscito tutto (oltre 64 KB il tubo si spezza)
  return;
}

// ============================ LA PROVA ============================
const cp = require('child_process');
const figlio = args => new Promise(res => cp.execFile(process.execPath, [__filename, ...args], { cwd: __dirname, maxBuffer: 1 << 28 }, (e, out) => { try { res(JSON.parse(String(out).split('\n').find(l => l.startsWith('@@')).slice(2))); } catch (x) { console.log('(figlio ' + args.join(' ') + ': ' + String(e && e.message || x.message).slice(0, 400) + ')'); res(null); } }));
(async () => {
  // i giri lunghi in parallelo, mentre il processo principale fa le prove corte
  const GIRI = [['--giro=1', '--giorni=1'], ['--giro=2', '--giorni=2'], ['--giro=3', '--giorni=1'], ['--giro=4', '--giorni=1', '--ore=8'], ['--giro=4', '--giorni=1', '--ore=8']];
  const lunghi = Promise.all(GIRI.map(figlio));
  const spento = figlio(['--spento']);

  // ---------------- 0. spento ----------------
  { const J = await spento; ok(J && J.mente.join() === 'ON' && J.unico.join() === 'ON', 'spento il flag: Mente = { ON: false } e nient\'altro (nessuna fase, nessun aggancio)'); }

  // ---------------- le prove corte, in questo processo ----------------
  const U = carica(false, 7), G = Game, V = Verbo, F = Fatto, MN = Mente;
  const st = G.create(7); st.deadline = 1e12;
  const passo = k => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
  passo(40);
  ok(st.u.classe === 'xe' && MN.ON && U._.FASI.some(f => f.nome === 'unico.mente'), `acceso: la fase unico.mente c'è, la classe del dispositivo è in st.u.classe («${st.u.classe}», si salva con la partita)`);
  ok(Object.keys(MN.OBIETTIVI).length === 18 && Object.values(MN.OBIETTIVI).every(D => D.considera.length && D.metodi.length && D.metodi.every(m => MN.METODI.includes(m))), `18 obiettivi come dati, ognuno con le sue considerazioni a curva e i suoi metodi: ${Object.keys(MN.OBIETTIVI).join(', ')}`);
  ok(MN.curva('alto', 0) === 0 && MN.curva('alto', 1) === 1 && MN.curva('alto', .6) > MN.curva('alto', .45) && MN.curva('basso', .9) < MN.curva('basso', .1), `le curve tabulate: alto(0,45/0,6/1) = ${MN.curva('alto', .45).toFixed(2)}/${MN.curva('alto', .6).toFixed(2)}/1, basso(0,1/0,9) = ${MN.curva('basso', .1).toFixed(2)}/${MN.curva('basso', .9).toFixed(2)}`);
  passo(1200);
  const menti = Object.values(st.u.menti);
  { const car = menti.map(M => M.carattere), dist = new Set(car.map(c => [c.pigro, c.orgoglio, c.teatrale, c.generoso, c.rancore].join())).size;
    ok(menti.length > 100 && dist === menti.length, `${menti.length} menti, tutte con un carattere diverso (pigro, orgoglio, teatrale, generoso, rancore derivati a seme da n.tr e dall'id): ${dist} diversi`); }
  // la paga doppia: lavora non paga chi ha il lavoro di popolo
  { const A0 = st.npcs.find(n => n.pop && n.pop.job && n.pop.job.t && !n.pop.cast && !n.dead && n.pop.job.start < n.pop.job.end);
    const Aa = Attore.di(st, A0), t = A0.pop.job.t, h = Math.floor((A0.pop.job.start + A0.pop.job.end) / 2);
    const tS = st.t; st.t = Math.floor(st.t / 1440) * 1440 + h * 60 + 5; A0.x = t.x; A0.y = t.y; A0.inside = false; if (A0.__u) A0.__u.dove = null;
    const s0 = Aa.soldi, own0 = A0.pop.owed || 0, r = V.fai(st, A0, 'lavora', { ore: 1 }, { subito: true }), f = r.fid ? F.di(st, r.fid) : null; st.t = tS;
    ok(r.ok && Math.abs(Aa.soldi - s0) < .1 && f && f.x && f.x.maturata > 0 && !(f.soldi > 0) && (A0.pop.owed || 0) === own0, `lavora non paga due volte: ${A0.first} (${A0.pop.job.title}) fa un'ora, i soldi restano ${s0} (la paga la matura popolo, P.owed); il fatto porta maturata ${f && f.x && f.x.maturata}.000 lire ${r.msg}`); }
  // l'HTN: procura, il piano parziale, il nope
  { const n = st.npcs.find(k => st.u.menti[k.id] && k.pop && !k.pop.near && !k.dead && (k.pop.money || 0) > 20 && !k.pop.emer), M = st.u.menti[n.id], A = Attore.di(st, n);
    const Sh = Economia.eco(st).shops, k2 = Object.keys(Sh).find(k => Sh[k].sells.pane && (Sh[k].stock.pane || 0) >= 1 && Sh[k].t && !Sh[k].market);
    A.borsa.delete('pane'); A.soldi = 50; M.piano = null; M.ob = null; M.nope = {}; M.cand = null;
    const tS = st.t; st.t = Math.floor(st.t / 1440) * 1440 + 10 * 60;
    const c = MN._.contesto(st, n, M), exp = MN._.procura(c, 'pane', 1, 0);
    const vaiCompra = exp && exp.some(x => x[0] === 'compra' && x[1].cosa === 'pane');
    // il piano parziale: [@procura, @casa, arreda]: si espande solo la testa
    M.piano = { passi: [['@procura', { cosa: 'pane', q: 1 }], ['@casa', {}], ['mangia', { cosa: 'pane' }]], i: 0, t0: st.t, metodo: 'prova', att: null, fatti: [], ultimo: null, verbi: [] }; M.ob = { g: 'mangiare', a: {}, u: 1, perche: null, t0: st.t };
    MN._.prosegui(st, n, M, c);
    const Pi = M.piano, testa = Pi && Pi.passi.slice(0, 2).map(x => x[0]).join(','), resto = Pi && Pi.passi.some(x => x[0] === '@casa');
    ok(vaiCompra && Pi && Pi.att && resto, `procura(pane): ${exp ? exp.map(x => x[0]).join(' → ') : 'niente'}; il piano parziale espande solo la testa (${testa}…), «@casa» resta da espandere; il primo passo è in corso (${Pi && Pi.att ? Pi.att.v + ', ' + Pi.att.modo : '-'})`);
    // il nope: un piano che fallisce mette nope[verbo:cosa] per 4 ore
    M.piano = { passi: [['regala', { chi: 'nessuno', cosa: 'pane', q: 1 }]], i: 0, t0: st.t, metodo: 'prova2', att: null, fatti: [], ultimo: null, verbi: [] }; M.ob = { g: 'regalare', a: {}, u: 1, perche: null, t0: st.t };
    MN._.prosegui(st, n, M, c);
    ok(!M.piano && M.nope['regala:nessuno'] >= st.t + 239 && M.nope['g:regalare'] > st.t, `un piano che fallisce mette il nope: regala:nessuno fino a +${(M.nope['regala:nessuno'] - st.t).toFixed(0)} min, l'obiettivo per un'ora`);
    st.t = tS; M.nope = {}; M.piano = null; M.ob = null; A.borsa.delete('pane'); }
  // gli spegnimenti: vita e risacca
  { const Vi = Vita, z = Vi._.CONTI.filter(f => f.__mente).length;
    // un membro della banda con la mente: Risacca.autonomy non decide più per lui
    const n = st.npcs.find(k => k.pop && st.u.menti[k.id] && k.ris && !k.dead && !k.pop.cast);
    if (n) { n.ris.member = true; n.ris.auto = true; n.ris.autoAt = 0; n.ris.task = null; }
    passo(1); if (n) n.ris.task = null;   // il passo in cui entra nella banda (risacca gira prima della mente): poi più niente
    passo(240);
    const spento = n && n.ris.autoAt > st.t + 1e5 && st.u.mente.autoOff[n.id] === 1 && !(n.ris.task && /autonom/.test(n.ris.task.src || ''));
    ok(z === 2 && Vi.CFG.appGiorno === 0 && st.vita.regali.__mente === true && spento, `spenti: i conti di vita coperti (contoDebito, contoBuca: ${z}), l'appuntamento di vita (appGiorno = ${Vi.CFG.appGiorno}), il regalo di vita (st.vita.regali), Risacca.autonomy per il membro ${n ? n.first : '-'} con la mente (autoAt +${n ? Math.round(n.ris.autoAt - st.t) : '-'})`);
    if (n) { n.ris.member = false; n.ris.auto = false; } }
  // i livelli
  passo(600);
  { const L = {}; for (const M of Object.values(st.u.menti)) L[M.lod] = (L[M.lod] || 0) + 1;
    ok(L.scena > 0 && L.vicino > 0 && L.lontano > 0, `i livelli di dettaglio delle menti: ${JSON.stringify(L)} (scena entro 45 m e fra i primi 24, vicino, lontano, dormiente)`); }

  // ---------------- i giri lunghi ----------------
  const R = await lunghi; const [r1, r2, r3, d1, d2] = R;
  if (!r1 || !r2 || !r3 || !d1 || !d2) { ok(false, 'i giri non sono riusciti'); console.log(`\n${nOk} ok, ${fail} NO`); process.exit(1); }
  // il determinismo
  ok(d1.hash.fatti === d2.hash.fatti && d1.hash.menti === d2.hash.menti && d1.hash.n > 50, `determinismo: lo stesso seme (4, 8 ore) in due processi dà gli stessi ${d1.hash.n} fatti della mente (${d1.hash.fatti}) e le stesse menti (${d1.hash.menti} / ${d2.hash.menti})`);
  // le quattro di vita
  for (const r of [r1, r2, r3]) {
    const c = r.casi, g = r.giorni;
    console.log(`  seme ${r.seme}, ${g} giorn${g > 1 ? 'i' : 'o'}: visti o sentiti dal giocatore ${JSON.stringify({ appuntamenti: c.appuntamenti, incontri: c.incontri, regali: c.regali, prestiti: c.prestiti, rinfacci: c.rinfacci })}; in tutta la città ${JSON.stringify(c.tutti)}; il giocatore è andato a ${r.andato} appuntamenti; i contatori di vita: ${JSON.stringify(r.vita)}`);
    ok(c.appuntamenti >= g, `seme ${r.seme}: appuntamenti presi e sentiti dalla mente: ${c.appuntamenti} (≥ 1 al giorno)`);
    ok(c.incontri >= g, `seme ${r.seme}: incontri visti all'ora giusta: ${c.incontri} (≥ 1 al giorno)`);
    ok(c.regali + c.prestiti >= g, `seme ${r.seme}: regali o prestiti: ${c.regali} + ${c.prestiti} (≥ 1 al giorno)`);
    ok(c.rinfacci >= g, `seme ${r.seme}: conti aperti detti in faccia (rinfaccia): ${c.rinfacci} (≥ 1 al giorno)`);
  }
  // i budget, il tempo, gli errori
  const B0 = Mente.CFG, Q = R.reduce((q, r) => { for (const k in r.quote) q[k] = Math.max(q[k] || 0, r.quote[k]); return q; }, {});
  ok(Q.scelte <= B0.scelte && Q.piani <= B0.piani.xe && Q.lavori <= B0.lavori.xe, `i budget a conteggio, per passo (classe xe): scelte ≤ ${Q.scelte} (tetto ${B0.scelte}), piani HTN ≤ ${Q.piani} (tetto ${B0.piani.xe}), cose che costano ≤ ${Q.lavori} (tetto ${B0.lavori.xe})`);
  const T = r1.tempo; console.log(`info il tempo della fase unico.mente (seme 1, ${T.n} passi): p50 ${T.p50.toFixed(3)} · p95 ${T.p95.toFixed(3)} · p99 ${T.p99.toFixed(3)} · max ${T.max.toFixed(2)} ms, media ${T.media.toFixed(3)}; senza i verbi (Verbo.fai): p50 ${T.propria.p50.toFixed(3)} · p95 ${T.propria.p95.toFixed(3)} · media ${T.propria.media.toFixed(3)} ms`);
  ok(T.p95 <= 0.5 && T.media <= 0.25, `il tempo in Node: p95 ${T.p95.toFixed(3)} ms ≤ 0,5 e media ${T.media.toFixed(3)} ≤ 0,25 (il tetto di §1.3 per Iris Xe è 0,25 al p95: da misurare nel gioco vero, §9.3)`);
  ok(R.every(r => r.err.tot === 0), `nessun errore nelle fasi: Σ Unico.err = ${R.map(r => r.err.tot).join('/')} ${R.map(r => r.err.tot ? r.err.ultimo : '').join(' ')}`);
  ok(R.every(r => !r.puro), `lo stato della mente è puro (st.u.menti, st.u.mente: solo numeri, stringhe, array) ${R.map(r => r.puro).join(' ')}`);
  // la leggibilità
  { const vis = R.reduce((s, r) => s + r.leggi.vis, 0), sub = R.reduce((s, r) => s + r.leggi.subito, 0), senza = {}; for (const r of R) for (const k in r.leggi.senza) senza[k] = (senza[k] || 0) + r.leggi.senza[k];
    ok(vis > 0 && sub / vis >= .95, `leggibilità: dei fatti della mente visti o sentiti (${vis}) ${sub} hanno un segno subito (B/P/O/D/F): ${(sub / vis * 100).toFixed(1)}% (≥ 95%); senza: ${JSON.stringify(senza)}`); }
  // la varietà
  { const giorni = [];
    for (const r of [r1, r2, r3]) for (const [k, s] of Object.entries(r.seq)) giorni.push({ id: r.seme + ':' + k.split('|')[0], d: +k.split('|')[1], g: s.g, v: s.v });
    const pieni = giorni.filter(x => x.v.length >= 3);   // le giornate «piene»: almeno tre cose fatte
    const sv = new Map(); for (const x of pieni) { const k = x.v.join('>'); sv.set(k, (sv.get(k) || 0) + 1); }
    const sg = new Map(); for (const x of pieni) { const k = x.g.join('>'); sg.set(k, (sg.get(k) || 0) + 1); }
    const unici = [...sv.values()].filter(c => c === 1).length, dupl = pieni.filter(x => sv.get(x.v.join('>')) > 1).length;
    const media = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
    const dObi = media(pieni.map(x => new Set(x.g).size)), dVer = media(pieni.map(x => new Set(x.v).size)), lung = media(pieni.map(x => x.v.length));
    // da un giorno all'altro (seme 2): la stessa persona rifà la stessa giornata?
    const d2g = {}; for (const [k, s] of Object.entries(r2.seq)) { const [id, d] = k.split('|'); (d2g[id] = d2g[id] || {})[d] = s.v.join('>'); }
    const coppie = Object.values(d2g).filter(o => Object.keys(o).length >= 2), uguali = coppie.filter(o => { const v = Object.values(o); return v[0] === v[1] && v[0].length; }).length;
    // la ripetizione dentro la giornata: quante volte di fila lo stesso verbo
    const rip = media(pieni.map(x => { let c = 0; for (let i = 1; i < x.v.length; i++) if (x.v[i] === x.v[i - 1]) c++; return x.v.length > 1 ? c / (x.v.length - 1) : 0; }));
    console.log(`info varietà: ${pieni.length} giornate di NPC (≥ 3 verbi fatti; ${giorni.length} in tutto); sequenze di verbi diverse ${sv.size} (${(sv.size / pieni.length * 100).toFixed(0)}%), uniche ${unici}; giornate con la stessa sequenza di un altro ${dupl} (${(dupl / pieni.length * 100).toFixed(0)}%); sequenze di obiettivi diverse ${sg.size}; per giornata in media ${dObi.toFixed(1)} obiettivi diversi, ${dVer.toFixed(1)} verbi diversi su ${lung.toFixed(1)}; lo stesso verbo di fila ${(rip * 100).toFixed(0)}%; seme 2, la stessa giornata due giorni di fila: ${uguali} su ${coppie.length}`);
    ok(pieni.length > 100 && sv.size / pieni.length >= .8 && dupl / pieni.length <= .2 && uguali / Math.max(1, coppie.length) <= .1, `varietà: ${(sv.size / pieni.length * 100).toFixed(0)}% delle giornate ha una sequenza di verbi sua (≥ 80%), ${(dupl / pieni.length * 100).toFixed(0)}% uguale a quella di un altro (≤ 20%), ${uguali}/${coppie.length} NPC rifanno la stessa giornata il giorno dopo (≤ 10%)`);
    // il carattere sposta gli obiettivi: il generoso regala e presta più dell'avaro, il chiacchierone socializza di più
    const C = [r1, r2, r3].flatMap(r => r.car), quota = (q, gs) => { const t = Object.values(q).reduce((s, x) => s + x, 0) || 1; return gs.reduce((s, g) => s + (q[g] || 0), 0) / t; };
    const parte = (L, f) => { const S = L.slice().sort((a, b) => f(a) - f(b)), m = Math.floor(S.length / 3); return [S.slice(0, m), S.slice(-m)]; };
    const [avari, generosi] = parte(C, x => x[1].generoso), [muti, loquaci] = parte(C, x => x[1].loq);
    const qG = [media(avari.map(x => quota(x[2], ['regalare', 'prestare']))), media(generosi.map(x => quota(x[2], ['regalare', 'prestare'])))], qL = [media(muti.map(x => quota(x[2], ['socializzare']))), media(loquaci.map(x => quota(x[2], ['socializzare'])))];
    ok(qG[1] > qG[0] && qL[1] > qL[0], `il carattere conta: regalare+prestare è ${(qG[0] * 100).toFixed(1)}% degli obiettivi per il terzo meno generoso, ${(qG[1] * 100).toFixed(1)}% per il più generoso; socializzare ${(qL[0] * 100).toFixed(1)}% per i meno loquaci, ${(qL[1] * 100).toFixed(1)}% per i più loquaci`);
  }
  // i macroverbi, le catene, gli obiettivi usati
  { const mac = new Set(R.flatMap(r => r.mente.macro)), per = {}; for (const r of [r1, r2, r3]) for (const g in r.mente.stats.per) per[g] = (per[g] || 0) + r.mente.stats.per[g];
    const usati = Object.keys(per).length, m = r1.mente.stats;
    ok(mac.size >= 3 && R.some(r => r.mente.stats.macroFatti > 0), `i macroverbi: ${mac.size} catene diventate macroverbi (${[...mac].slice(0, 6).join(', ')}), ${R.map(r => r.mente.stats.macroFatti).join('/')} passi fatti per macro dai lontani`);
    ok(usati >= 14, `gli obiettivi scelti e avviati: ${usati} dei 18 (${JSON.stringify(per)})`);
    console.log(`info seme 1: ${m.scelte} scelte, ${m.piani} piani, ${m.avvii} avviati, ${m.riusciti} riusciti, ${m.falliti} falliti, ${m.cambi} cambi di livello a metà, ${m.espansi} composti espansi; i verbi: ${JSON.stringify(m.perVerbo)}; i perché dei fallimenti: ${JSON.stringify(m.perche)}`);
    console.log(`info le catene della mente: ${R.map(r => r.catene.hop2).join('/')} verbi con hop ≥ 2; per esempio ${r1.catene.esempi.concat(r2.catene.esempi).slice(0, 4).join(' · ')}`);
    console.log(`info i livelli a fine giro: ${JSON.stringify(r1.mente.lod)}; ${r1.mente.menti} menti`); }
  console.log(`\n${nOk} ok, ${fail} NO`);
  process.exit(fail ? 1 : 0);
})();
