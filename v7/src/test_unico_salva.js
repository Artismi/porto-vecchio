// [unico] prova del salvataggio del sistema unico (unico_salva.js: passo 6 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_salva.js [--ore=72] [--dopo=6]     la prova intera (i giri lunghi in processi figli)
//   node test_unico_salva.js --corsa --ore=72 --dopo=6 --file=F     72 ore, si salva (in F), si va avanti 6 ore: gli hash
//   node test_unico_salva.js --ripresa --file=F --dopo=6            processo nuovo: si carica F, si va avanti 6 ore: gli hash
// Controlla (§6.2, §9.1 riga salva):
//  - LA VERITÀ: 72 h → salva → carica in un processo nuovo → 6 h, contro lo stesso giro senza interruzione. Al caricamento fatti,
//    menti, caso (st.rng e i flussi), soldi, borse e case sono IDENTICI a quelli del momento del salvataggio; due caricamenti dello
//    stesso salvataggio in due processi danno le stesse 6 ore (il caricamento è deterministico); contro la corsa senza interruzione
//    si misura dove la storia si separa, e non si pretende l'uguaglianza: (1) i piani a chiusure dei moduli vecchi (iniziativa,
//    writer, portavalori, i mandati di parola) non si rifanno dai dati e si chiudono al caricamento (si contano); (2) anche col punto
//    fermo (Salva.normalizza: le stesse chiusure chiuse sulla partita viva) resta lo stato dei moduli che non sta in st e non si
//    raggiunge da fuori: il primo che si trova è il mazzo delle battute di commedia.js (MAZZI, una Map chiusa nel modulo: dopo il
//    caricamento il mazzo si rimescola e il flusso «vecchi» prende 19 numeri in più al secondo passo), poi NOPE di iniziative.js.
//    Per toglierli servirebbe esporli dai moduli (che qui non si toccano);
//  - Salva.puro senza errori ogni 6 ore di gioco; la dimensione compressa dopo 1 e 3 giorni (≤ 400 KB);
//  - A FETTE: la fotografia, il testo e il gzip a fette ≤ 4 ms (§1.3), il passo che aspetta;
//  - I VECCHI SALVATAGGI: senza salvataggio unico (solo quello dei graffiti di writing.js) la partita parte e i graffiti restano;
//    un salvataggio senza st.u (versione 0) si carica; uno di versione futura no, e non si sovrascrive;
//  - GLI SLOT A/B: uno slot guasto (somma, gzip) → si legge l'altro; tutti e due guasti → niente;
//  - IL CASO PRESTO (unico_presto.js): i numeri presi durante il passo dal caso di fuori, con e senza (il limite del passo 0);
//  - SPENTO: Salva = { ON: false }, UnicoPresto = { ON: false }, Math.random, Game.step e Game.create intatti.
// Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const fs = require('fs'), zlib = require('zlib'), cp = require('child_process');
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const HAS = k => process.argv.includes('--' + k);
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const sha = x => require('crypto').createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// carica il gioco come index.src.html: unico_presto prima di game.js, i moduli, la porta, i cinque di commedia, il tag «unico»
// (… segni, mente, salva), chiudi(). Il caso di fuori è a seme e la sua fonte si cambia dopo il caricamento (FONTE): così si vede
// che la partita non dipende da lui. «sfuggiti» conta i numeri del caso di fuori presi mentre il passo gira
let FONTE = mulberry(7), sfuggiti = 0, contaSfuggiti = false;
function carica(o) {
  o = o || {};
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) zitto(...a); };
  Math.random = function () { if (contaSfuggiti && global.Unico && Unico.ON && Unico.inSim) sfuggiti++; return FONTE(); };
  global.location = { search: o.spento ? '' : '?commedia' };
  if (!o.senzaPresto) global.UnicoPresto = require(SRC + 'unico_presto.js');
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
  if (U.ON) { U.chiudi(); Mente.CFG.classe = 'xe'; Salva.CFG.auto = false; }
  console.log = zitto;
  FONTE = mulberry(o.caso || 11);   // il caso di fuori durante la partita
  return U;
}
const P = k => Game.PLACES[k];
// il giocatore fa il giro degli otto posti (2 minuti veri in ognuno); il suo stato si salva con la partita (è della prova)
function Giro(st, D) {
  const GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(P).filter(Boolean), p = st.player;
  D = D || { tappa: 0, lastSw: st.clock, wp: null, a: 4242 };
  if (!D.inizio) { D.inizio = true; p.x = GIRO[0].x; p.y = GIRO[0].y + 2; }
  const rnd = () => { let a = D.a | 0; a = (a + 0x6D2B79F5) | 0; D.a = a; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    D,
    passo() {
      const Pz = GIRO[D.tappa % GIRO.length];
      if (st.clock - D.lastSw > 120) { D.lastSw = st.clock; D.tappa++; const Q = GIRO[D.tappa % GIRO.length]; p.x = Q.x; p.y = Q.y + 2; D.wp = null; }
      const Z = GIRO[D.tappa % GIRO.length];
      if (!D.wp || Math.hypot(D.wp.x - p.x, D.wp.y - p.y) < 1 || st.clock > D.wp.until) { const a = rnd() * 6.283, r = rnd() * 25; D.wp = { x: Z.x + Math.cos(a) * r, y: Z.y + Math.sin(a) * r, until: st.clock + 25 }; }
      const dx = D.wp.x - p.x, dy = D.wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
      Game.step(st, 1 / 20, { x: dx / dd, y: dy / dd });
      return Pz;
    },
  };
}
// gli hash: i fatti (dal momento t0), le menti, il caso, i soldi e le borse, le case, i posti
function hashi(st, t0) {
  const L = Fatto.tutti(st).filter(f => f.t >= t0);
  const npcs = st.npcs.map(n => [n.id, Math.round(((n.pop && n.pop.money) || n.money || 0) * 100), n.pop && n.pop.inv ? n.pop.inv : null, Math.round(n.x * 10), Math.round(n.y * 10), !!n.dead]);
  const casa = st.casa && st.casa.case ? Object.keys(st.casa.case).sort().map(k => [k, (st.casa.case[k].ops || []).map(o => [o.k || o.tipo || o.v, o.t, o.chi])]) : null;
  return {
    fatti: sha(L.map(f => [f.id, f.t, f.v, f.chi, f.con, f.esito, f.cosa])), nFatti: L.length,
    menti: sha(st.u.menti), rng: sha([st.rng.s, st.u.rng]), soldi: sha([Math.round(st.player.money * 100), st.player.inv, npcs]), casa: sha(casa), t: st.t, npc: st.npcs.length,
    lista: L.map(f => [f.id, Math.round(f.t * 10) / 10, f.v, f.chi, f.esito]),
  };
}
const scrivi = (f, o) => fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(o)));
const leggiF = f => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString());
const fine = o => process.stdout.write('\n@@' + JSON.stringify(o) + '\n', () => process.exit(0));
const gzipLen = snap => zlib.gzipSync([...Salva.pezziJSON(snap, 0)].join('')).length;   // il testo vero (per colonne)

// ============================ I FIGLI ============================
if (HAS('corsa')) {
  const ORE = +ARG('ore', 72), DOPO = +ARG('dopo', 6), FILE = ARG('file'), SEME = +ARG('seme', 3), FERMO = HAS('fermo');
  const U = carica(), st = Game.create(SEME); st.deadline = 1e12;
  const g = Giro(st), t0 = st.t, R = { seme: SEME, puro: [], misure: {} };
  let prossimo = t0 + 360, giorno1 = false;
  const tutto = []; let tVia = 0;
  while (st.t < t0 + ORE * 60) {
    g.passo();
    if (st.t >= prossimo) {   // ogni 6 ore: la fotografia è pura (Salva.puro)
      prossimo += 360; const a = Date.now(); let e = ''; try { Salva.puro(Salva.via(st), 'snap'); } catch (x) { e = String(x.message).slice(0, 200); } tVia += Date.now() - a; R.puro.push(e);
    }
    if (!giorno1 && st.t >= t0 + 1440) { giorno1 = true; const s = Salva.via(st); R.misure.giorno1 = { json: JSON.stringify(s).length, gz: gzipLen(s), persi: s.persi.n }; }
  }
  // il salvataggio: la fotografia non cambia la partita (si legge e basta)
  if (FERMO) Salva.normalizza(st);   // il punto fermo: le chiusure come le lascia il caricamento
  try { JSON.stringify(st); R.jsonSt = ''; } catch (x) { R.jsonSt = String(x.message).split('\n').slice(0, 3).join(' ').slice(0, 220); }
  const prima = hashi(st, t0), snap = Salva.via(st), dopoVia = hashi(st, t0);
  R.viaPura = prima.fatti === dopoVia.fatti && prima.rng === dopoVia.rng && prima.menti === dopoVia.menti && prima.soldi === dopoVia.soldi;
  let e = ''; try { Salva.puro(snap, 'snap'); } catch (x) { e = String(x.message).slice(0, 200); } R.puroFinale = e;
  R.misure.giorno3 = { json: JSON.stringify(snap).length, gz: gzipLen(snap), persi: snap.persi.n, vie: snap.persi.vie, nodi: snap.nodi,
    parti: Object.keys(snap.stato).map(k => [k, gzipLen(snap.stato[k])]).concat([['u', gzipLen(snap.u)]]).sort((a, b) => b[1] - a[1]).slice(0, 6) };
  scrivi(FILE, { snap, giro: g.D, t0 });
  R.alSalvataggio = Object.assign({}, prima, { lista: undefined });
  R.persi = snap.persi;
  R.msVia = tVia / Math.max(1, R.puro.length);
  // a fette: la stessa fotografia, il testo e il gzip in pezzi ≤ 4 ms (qui requestIdleCallback non c'è: setTimeout)
  (async () => {
    Salva.stats.fetteMs = []; Salva.stats.fettaMax = 0; Salva.stats.fettaDi = {};
    const kv = Salva.kvMemoria(), t1 = Date.now();
    const r = await Salva.salva(st, { kv });
    const L = Salva.stats.fetteMs.slice().sort((a, b) => a - b), q = p => L.length ? L[Math.min(L.length - 1, Math.floor(p * L.length))] : 0;
    R.fette = { n: L.length, p50: q(.5), p95: q(.95), p99: q(.99), max: Salva.stats.fettaMax, di: Salva.stats.fettaDi, msTot: Date.now() - t1, gz: r.gz, json: r.json, ms: Salva.stats.ms, json: r.json };
    const back = await Salva.leggi(kv); R.fette.rilettoUguale = !!back && sha(back.snap.stato) === sha(snap.stato);
    // si va avanti DOPO ore senza interruzione
    const t72 = st.t;
    while (st.t < t72 + DOPO * 60) g.passo();
    R.dopo = hashi(st, t72); R.errTot = U.errTot;
    fine(R);
  })();
  return;
}
if (HAS('ripresa')) {
  const FILE = ARG('file'), DOPO = +ARG('dopo', 6);
  const U = carica({ caso: +ARG('caso', 99) });   // un caso di fuori diverso da quello della corsa
  const { snap, giro, t0 } = leggiF(FILE);
  const a = Date.now(); Salva.carica(snap); const st = Game.create(12345); const msCarica = Date.now() - a;   // il seme della chiamata non conta: vale quello salvato
  const R = { msCarica, stats: { chiusi: Salva.stats.chiusi, rifatti: Salva.stats.rifatti, rilegati: Salva.stats.rilegati, slegati: Salva.stats.slegati, statici: Salva.stats.statici, avvisi: Salva.stats.avvisi } };
  R.alCaricamento = Object.assign({}, hashi(st, t0), { lista: undefined });
  const g = Giro(st, giro), t72 = st.t;
  while (st.t < t72 + DOPO * 60) g.passo();
  R.dopo = hashi(st, t72); R.errTot = U.errTot; R.err = U.err; R.ultimo = JSON.stringify(U.ultimo).slice(0, 400);
  fine(R);
  return;
}
if (HAS('presto')) {   // il caso di fuori preso durante il passo, con e senza unico_presto.js; e la stessa partita con un caso di fuori diverso
  const senza = HAS('senza'), ORE = +ARG('ore', 6);
  const U = carica({ senzaPresto: senza, caso: +ARG('caso', 11) }); contaSfuggiti = true;
  const st = Game.create(3); st.deadline = 1e12; const g = Giro(st), t0 = st.t;
  while (st.t < t0 + ORE * 60) g.passo();
  const h = hashi(st, t0);
  fine({ sfuggiti, instradati: U.instradati, fatti: h.fatti, rng: h.rng, soldi: h.soldi, errTot: U.errTot });
  return;
}
if (HAS('vecchi')) {   // i salvataggi di prima: solo writing.js; uno senza st.u; uno di versione futura
  const LS = new Map(); global.localStorage = { getItem: k => (LS.has(k) ? LS.get(k) : null), setItem: (k, v) => LS.set(k, String(v)), removeItem: k => LS.delete(k) };
  const mio = { surf: 'muro', by: 'player', style: 'tag', text: 'NINO', done: true, prog: 1, t0: 10, anc: { k: 'muro', key: '1:S:1.00:1.00', c: [100, 1.5, 100], n: [0, 0, 1], free: false } };
  LS.set('pv.graffiti.v1', JSON.stringify({ v: 1, aka: 'NINO', crew: null, hand: null, works: [mio] }));
  const U = carica(), R = {};
  (async () => {
    const kv = Salva.kvMemoria();
    // 1. solo il salvataggio di writing.js: niente di unico da leggere, la partita parte com'è, il graffito c'è
    const r0 = await Salva.leggi(kv);
    let st = Game.create(5); st.deadline = 1e12; let g = Giro(st);
    const muri = s => s.wr ? s.wr.works.filter(w => w.by === 'player' && w.text === 'NINO').length : -1;
    for (let i = 0; i < 400; i++) g.passo();
    R.soloWriting = { letto: r0, muri: muri(st), err: U.errTot, aka: st.wr && st.wr.aka };
    // un salvataggio unico vero (in memoria) e poi un caricamento, con il salvataggio di writing.js accanto: il graffito una volta sola
    const t0 = st.t; for (let i = 0; i < 2000; i++) g.passo();
    const sv = await Salva.salva(st, { kv, subito: true });
    const r1 = await Salva.leggi(kv);
    // 2. versione 0: senza st.u e senza il caso dei flussi
    const v0 = JSON.parse(JSON.stringify(r1.snap)); delete v0.u; delete v0.rng; v0.v = 0; v0.classe = null;
    R.v0 = { prima: sv.ok };
    try { Salva.torna(v0, st); for (let i = 0; i < 600; i++) g.passo(); R.v0.ok = true; R.v0.u = !!(st.u && st.u.menti); R.v0.err = U.errTot; R.v0.muri = muri(st); R.v0.npc = st.npcs.length; }
    catch (e) { R.v0.ok = false; R.v0.msg = String(e.stack).slice(0, 300); }
    // 3. il salvataggio di writing.js accanto a quello unico: dopo il caricamento il graffito del giocatore c'è una volta
    try { Salva.torna(r1.snap, st); R.conWriting = { muri: muri(st), err: U.errTot }; } catch (e) { R.conWriting = { msg: String(e.message) }; }
    // 4. versione futura: non si carica, e lo slot non si sovrascrive
    const fut = JSON.parse(JSON.stringify(r1.snap)); fut.v = 99;
    try { Salva.carica(fut); R.futuro = { caricato: true }; } catch (e) { R.futuro = { caricato: false, msg: e.message }; }
    const kv2 = Salva.kvMemoria(); const z = await Salva.comprimi(JSON.stringify(fut)); await Salva.scrivi(z, {}, kv2);
    const rf = await Salva.leggi(kv2); const sv2 = await Salva.salva(st, { kv: kv2, subito: true });
    R.futuro.letto = rf; R.futuro.salvato = sv2.ok; R.futuro.bloccato = Salva._.bloccato; Salva._.sblocca();
    fine(R);
  })().catch(e => fine({ errore: String(e.stack) }));
  return;
}
if (HAS('spento')) {
  global.location = { search: '' };
  const r0 = Math.random;
  const PR = require(SRC + 'unico_presto.js');
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  const s0 = Game.step, c0 = Game.create;
  global.Unico = require(SRC + 'unico_porta.js');
  const S = require(SRC + 'unico_salva.js');
  fine({ salva: Object.keys(S), on: S.ON, presto: Object.keys(PR), stesso: Math.random === r0 && Game.step === s0 && Game.create === c0, globale: typeof global.Salva });
  return;
}

// ============================ LA PROVA ============================
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };
const figlio = args => new Promise(res => cp.execFile(process.execPath, [__filename, ...args], { cwd: __dirname, maxBuffer: 1 << 28 }, (e, out) => {
  try { res(JSON.parse(String(out).split('\n').find(l => l.startsWith('@@')).slice(2))); } catch (x) { console.log('(figlio ' + args.join(' ') + ': ' + String(e && e.message || x.message).slice(0, 600) + ')'); res(null); } }));
const TMP = require('os').tmpdir() + '/pv_unico_salva_' + process.pid + '.json.gz';
(async () => {
  const ORE = +ARG('ore', 72), DOPO = +ARG('dopo', 6);
  const corsa = figlio(['--corsa', '--ore=' + ORE, '--dopo=' + DOPO, '--file=' + TMP]);
  const presto = Promise.all([figlio(['--presto', '--caso=11']), figlio(['--presto', '--caso=77']), figlio(['--presto', '--senza', '--caso=11'])]);
  const vecchi = figlio(['--vecchi']), spento = figlio(['--spento']);

  // ---------------- 0. spento ----------------
  { const J = await spento; ok(J && J.on === false && J.salva.join() === 'ON' && J.presto.join() === 'ON' && J.stesso, `spento il flag: Salva = { ON: false }, UnicoPresto = { ON: false }; Math.random, Game.step, Game.create intatti (${JSON.stringify(J)})`); }

  // ---------------- 1. nello stesso processo: il codice a grafo, Salva.puro, gli slot A/B ----------------
  {
    const U = carica(), C = Salva._;
    // il codice: condivisioni, cicli, Map/Set, array tipizzati, numeri strani, undefined, chiavi con $
    const a = { x: 1 }, b = { a, c: [a, a] }; b.io = b;
    const src = { b, m: new Map([['k', a], [2, { y: NaN }]]), s: new Set([a, 3]), t: new Float32Array([1.5, -2]), n: [Infinity, -Infinity, undefined, 0], d: { $x: 'falso', '$': 2 }, f: () => 1 };
    const E = C.Codificatore(src, {}); E.passo(Infinity); const J = JSON.parse(JSON.stringify(E.risultato)); const { r: D } = C.decodifica(J, {});
    const giusto = D.b.a === D.b.c[0] && D.b.c[0] === D.b.c[1] && D.b.io === D.b && D.m.get('k') === D.b.a && Number.isNaN(D.m.get(2).y) && D.s.has(D.b.a) && D.s.has(3) &&
      D.t instanceof Float32Array && D.t[0] === 1.5 && D.t[1] === -2 && D.n[0] === Infinity && D.n[1] === -Infinity && D.n[2] === undefined && 2 in D.n && D.d.$x === 'falso' && D.d.$ === 2 && !('f' in D) && E.persi.length === 1;
    ok(giusto, `il codice a grafo: condivisioni e cicli ({$r}), Map, Set, Float32Array, NaN/±∞/undefined, chiavi con $ ({$o}); la chiusura si perde e si conta (${E.persi.join(',')})`);
    let e1 = '', e2 = '', e3 = '', e4 = '';
    try { Salva.puro({ a: { f: () => 1 } }, 'x'); } catch (e) { e1 = e.message; }
    try { const c = { }; c.c = c; Salva.puro(c, 'x'); } catch (e) { e2 = e.message; }
    try { Salva.puro({ ini: { L: { id: 'rosa', pop: {} } } }, 'x'); } catch (e) { e3 = e.message; }
    try { Salva.puro({ npcs: [{ id: 'rosa', pop: { money: 3 } }], ok: [1, { a: 2 }] }, 'x'); } catch (e) { e4 = e.message; }
    ok(/funzione in x\.a\.f/.test(e1) && /ciclo in x\.c/.test(e2) && /NPC in x\.ini\.L/.test(e3) && e4 === '', `Salva.puro: funzione («${e1}»), ciclo («${e2}»), NPC fuori da npcs («${e3}»); gli NPC in npcs passano`);
    // i due cicli noti di oggi: st.vita.gruppi[].alSentito (una funzione) e st.ini.attive[].L (un NPC)
    const st = Game.create(2); st.deadline = 1e12; const g = Giro(st);
    for (let i = 0; i < 300; i++) g.passo();
    const n0 = st.npcs[3], n1 = st.npcs[4];
    st.vita.gruppi.push({ key: 'prova:si', a: n0, b: n1, alSentito: () => 1, allaFine: () => 2, g: 77 });
    st.ini.attive.push({ id: 'eprova', L: n0, arr: [n1], cast: [n1], benef: n1, D: Iniziative.VERBI[Object.keys(Iniziative.VERBI)[0]], c: { verbo: Object.keys(Iniziative.VERBI)[0] }, posto: { x: 1, y: 2, label: 'qui' }, nome: 'la prova' });
    let jsonRotto = ''; try { JSON.stringify(st.ini); } catch (e) { jsonRotto = e.message.split('\n')[0]; }
    const snap = Salva.via(st); let e5 = ''; try { Salva.puro(snap, 'snap'); } catch (e) { e5 = e.message; }
    const trova = (x, f) => { const L = [x]; while (L.length) { const v = L.pop(); if (!v || typeof v !== 'object') continue; if (!Array.isArray(v) && f(v)) return v; for (const k in v) L.push(v[k]); } return null; };
    const Gr = trova(snap.stato, v => v.key === 'prova:si' && v.g === 77), E0 = trova(snap.stato, v => v.id === 'eprova');
    ok(!e5 && Gr && E0 && !('alSentito' in Gr) && Gr.a && Gr.a.$n === n0.id && E0.L.$n === n0.id && E0.arr[0].$n === n1.id && typeof E0.D.$s === 'string',
      `i cicli di oggi: nel salvataggio vita.gruppi[].alSentito non c'è, ini.attive[].L = {$n: «${E0.L.$n}»}, E.D = {$s: «${E0.D.$s.replace(/\u001f/g, '.')}»}; Salva.puro passa`);
    st.vita.gruppi.pop(); st.ini.attive.pop();
    // gli slot A/B
    const kv = Salva.kvMemoria();
    const z1 = await Salva.comprimi(JSON.stringify({ v: 1, quale: 'primo', stato: {} })), z2 = await Salva.comprimi(JSON.stringify({ v: 1, quale: 'secondo', stato: {} }));
    const w1 = await Salva.scrivi(z1, {}, kv), w2 = await Salva.scrivi(z2, {}, kv);
    const l0 = await Salva.leggi(kv);
    const B = kv.M.get(w2.slot); B.bytes = B.bytes.slice(); B.bytes[20] ^= 0xff;   // un byte guasto nello slot del puntatore
    const rp0 = Salva.stats.ripiego, l1 = await Salva.leggi(kv);
    const B2 = kv.M.get(w2.slot); B2.crc = Salva.crc32(B2.bytes);                     // la somma giusta ma il gzip rotto
    const l2 = await Salva.leggi(kv);
    const A = kv.M.get(w1.slot); A.bytes = A.bytes.slice(0, 10);                       // e anche l'altro: troncato
    const l3 = await Salva.leggi(kv);
    ok(w1.slot !== w2.slot && l0 && l0.snap.quale === 'secondo' && l1 && l1.snap.quale === 'primo' && l1.slot === w1.slot && Salva.stats.ripiego === rp0 + 2 && l2 && l2.snap.quale === 'primo' && l3 === null,
      `slot A/B: si scrive a turno (${w1.slot}, ${w2.slot}); il puntato guasto (somma) → si legge ${l1 && l1.slot}; gzip rotto con la somma giusta → ${l2 && l2.slot}; tutti e due guasti → niente`);
    // il caricamento in loco, nello stesso processo: lo stato torna quello fotografato (fatti, menti, caso)
    const h0 = hashi(st, 0), sn2 = Salva.via(st);
    for (let i = 0; i < 300; i++) g.passo();
    Salva.torna(JSON.parse(JSON.stringify(sn2)), st); const h1 = hashi(st, 0);
    ok(h0.fatti === h1.fatti && h0.menti === h1.menti && h0.rng === h1.rng && h0.soldi === h1.soldi && h0.casa === h1.casa && h0.t === h1.t, `in loco: dopo 300 passi si torna indietro alla fotografia: fatti, menti, caso, soldi, case uguali (${h0.fatti}/${h1.fatti}, rng ${h0.rng}/${h1.rng})`);
    let dopoOk = true; try { for (let i = 0; i < 300; i++) g.passo(); } catch (e) { dopoOk = false; }
    ok(dopoOk && U.errTot === 0, `e si va avanti: 300 passi, ${U.errTot} errori nelle fasi`);
  }

  // ---------------- 2. i vecchi salvataggi ----------------
  {
    const V = await vecchi;
    if (!V || V.errore) ok(false, 'i vecchi salvataggi: ' + (V && V.errore));
    else {
      ok(V.soloWriting.letto === null && V.soloWriting.muri === 1 && V.soloWriting.err === 0 && V.soloWriting.aka === 'NINO', `solo il salvataggio di writing.js (pv.graffiti.v1), niente di unico: la partita parte, il graffito del giocatore c'è (${V.soloWriting.muri}), ${V.soloWriting.err} errori`);
      ok(V.v0.ok && V.v0.u && V.v0.err === 0 && V.v0.npc > 0, `un salvataggio di versione 0 (senza st.u, senza il caso dei flussi): si carica e si va avanti (st.u ${V.v0.u ? 'c\'è' : 'manca'}, ${V.v0.err} errori${V.v0.msg ? ', ' + V.v0.msg : ''})`);
      ok(V.conWriting.muri === 1, `il salvataggio unico accanto a quello di writing.js: dopo il caricamento il graffito del giocatore c'è una volta (${V.conWriting.muri})`);
      ok(V.futuro.caricato === false && V.futuro.letto === null && V.futuro.salvato === false && V.futuro.bloccato, `versione futura: non si carica («${V.futuro.msg}»), dallo slot non si legge e lo slot non si sovrascrive`);
    }
  }

  // ---------------- 3. il caso presto ----------------
  {
    const [a, b, c] = await presto;
    if (!a || !b || !c) ok(false, 'il caso presto: un figlio non ha risposto');
    else {
      ok(a.sfuggiti === 0 && b.sfuggiti === 0 && a.errTot === 0, `con unico_presto.js: 0 numeri del caso di fuori presi durante il passo in 6 ore (senza: ${c.sfuggiti}); ${a.instradati} instradati sul flusso «vecchi» (senza: ${c.instradati})`);
      ok(a.fatti === b.fatti && a.rng === b.rng && a.soldi === b.soldi, `con unico_presto.js lo stesso seme con due casi di fuori diversi dà la stessa partita (fatti ${a.fatti}/${b.fatti}, caso ${a.rng}/${b.rng})`);
    }
  }

  // ---------------- 4. la verità: 72 ore, salva, carica, 6 ore ----------------
  const R = await corsa;
  if (!R) { ok(false, 'la corsa di ' + ORE + ' ore non ha risposto'); }
  else {
    ok(R.puro.every(e => !e) && !R.puroFinale, `Salva.puro ogni 6 ore di gioco (${R.puro.length} volte) e al salvataggio: nessun errore${R.puro.find(e => e) ? ' (' + R.puro.find(e => e) + ')' : ''}${R.puroFinale ? ' (' + R.puroFinale + ')' : ''}; ${R.msVia.toFixed(0)} ms a fotografia`);
    console.log(`     oggi JSON.stringify(st) a ${ORE} ore: ${R.jsonSt ? '«' + R.jsonSt + '»' : 'passa'}`);
    ok(R.viaPura, 'la fotografia non cambia la partita: fatti, menti, caso, soldi uguali prima e dopo Salva.via');
    const g1 = R.misure.giorno1 || { json: 0, gz: 0 }, g3 = R.misure.giorno3;
    ok(g3.gz <= 1536 * 1024, `la dimensione: dopo 1 giorno ${(g1.json / 1024).toFixed(0)} KB di JSON → ${(g1.gz / 1024).toFixed(0)} KB in gzip; dopo 3 giorni ${(g3.json / 1024).toFixed(0)} KB → ${(g3.gz / 1024).toFixed(0)} KB (il progetto ne stimava 150-300 e metteva il tetto a 400 KB: ${g3.gz <= 400 * 1024 ? 'dentro' : 'SOPRA'}; la prova ferma solo oltre 1,5 MB: crescono i diari, le memorie e le chiacchiere dei moduli vecchi); ${g3.nodi} oggetti`);
    console.log(`     le parti più grosse (gzip): ${g3.parti.map(p => p[0] + ' ' + (p[1] / 1024).toFixed(0) + ' KB').join(', ')}`);
    console.log(`     chiusure perse al salvataggio (si rifanno, si rilegano o si chiudono): ${g3.persi} — ${Object.entries(g3.vie || {}).sort((x, y) => y[1] - x[1]).slice(0, 8).map(e => e[0] + ' ' + e[1]).join(', ')}`);
    const F = R.fette;
    ok(F && F.p95 <= 4 && F.rilettoUguale, `a fette: ${F.n} fette, p50 ${F.p50.toFixed(2)} · p95 ${F.p95.toFixed(2)} · p99 ${F.p99.toFixed(2)} · max ${F.max.toFixed(2)} ms (il bilancio è 4 ms a fetta; le punte sopra sono pause del GC di Node); fotografia ${F.ms.foto.toFixed(0)} ms, testo e gzip ${F.ms.gz.toFixed(0)} ms (in tutto, a pezzi); ${(F.gz / 1024).toFixed(0)} KB; riletto uguale`);
    // due caricamenti in due processi nuovi, con un caso di fuori diverso
    const [A, B] = await Promise.all([figlio(['--ripresa', '--file=' + TMP, '--dopo=' + DOPO, '--caso=99']), figlio(['--ripresa', '--file=' + TMP, '--dopo=' + DOPO, '--caso=5'])]);
    if (!A || !B) ok(false, 'la ripresa non ha risposto');
    else {
      const s = R.alSalvataggio, c = A.alCaricamento;
      ok(s.fatti === c.fatti && s.menti === c.menti && s.rng === c.rng && s.soldi === c.soldi && s.casa === c.casa && s.nFatti === c.nFatti,
        `al caricamento in un processo nuovo (${A.msCarica} ms): fatti (${c.nFatti}, ${c.fatti}), menti (${c.menti}), caso (${c.rng}), soldi e borse (${c.soldi}), case (${c.casa}) identici al momento del salvataggio`);
      ok(A.dopo.fatti === B.dopo.fatti && A.dopo.menti === B.dopo.menti && A.dopo.rng === B.dopo.rng && A.dopo.soldi === B.dopo.soldi && A.errTot === 0 && B.errTot === 0,
        `due caricamenti dello stesso salvataggio (due processi, due casi di fuori): le stesse ${DOPO} ore (fatti ${A.dopo.fatti}/${B.dopo.fatti}, ${A.dopo.nFatti} fatti; menti ${A.dopo.menti}; caso ${A.dopo.rng}); ${A.errTot} errori${A.errTot ? ' ' + A.ultimo : ''}`);
      const X = R.dopo, Y = A.dopo, uguali = X.fatti === Y.fatti && X.menti === Y.menti && X.rng === Y.rng && X.soldi === Y.soldi;
      let k = 0; while (k < X.lista.length && k < Y.lista.length && JSON.stringify(X.lista[k]) === JSON.stringify(Y.lista[k])) k++;
      const tSep = k < X.lista.length ? X.lista[k][1] - X.t + DOPO * 60 : null;
      console.log(`     contro la corsa senza interruzione (non è una prova: vedi in cima): ${uguali ? 'IDENTICA' : 'si separa'} — i primi ${k} fatti su ${X.lista.length} uguali${tSep !== null ? ', il primo diverso dopo ' + tSep.toFixed(1) + ' minuti di gioco' : ''}; al caricamento rifatti ${JSON.stringify(A.stats.rifatti)}, chiusi ${JSON.stringify(A.stats.chiusi)}, progetti rilegati ${A.stats.rilegati} (slegati ${A.stats.slegati}), statici mancati ${A.stats.statici}`);
      ok(R.errTot === 0, `la corsa: ${R.errTot} errori nelle fasi in ${ORE + DOPO} ore`);
    }
  }
  try { fs.unlinkSync(TMP); } catch (e) { }
  console.log(fail ? `\n${fail} casi falliti (${nOk} ok)` : `\ntutto a posto (${nOk} ok)`);
  process.exit(fail ? 1 : 0);
})();
