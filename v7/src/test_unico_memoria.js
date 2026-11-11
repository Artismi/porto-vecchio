// [unico] prova della memoria del sistema unico (unico_memoria.js, passo 2 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_memoria.js [--ore=6] [--lunga=72] [--partita=1]
//   node test_unico_memoria.js --figlio --modo=senza|memoria|spento|sintetico [--partita=1] [--ore=6]   una misura (JSON)
// Controlla: la catena ×0,6 è quella di oggi (lo stesso giro a seme con e senza la memoria dà gli stessi fatti di vita, e ogni fatto di
// vita è nella memoria con lo stesso peso, hop e catena di Vita.catena); l'anello ha il suo tetto e chi esce resta fra i notevoli se lo
// merita; gli indici per attore, tipo e luogo sono quelli che si trovano a mano; rancore e debito derivati dai fatti; la memoria si
// serializza (JSON.stringify e Fatto.puro) dopo 72 ore di gioco; il costo per fatto. Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const FIGLIO = process.argv.includes('--figlio');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };

// carica il gioco come index.src.html: i moduli, la porta, i cinque di commedia, il tag «unico» (con o senza unico_memoria.js), chiudi()
function carica(modo) {
  const F = mulberry(7); Math.random = () => F();
  global.location = { search: modo === 'spento' ? '' : '?commedia' };
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) zitto(...a); };
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
  global.Fatto = modo === 'senza' ? { ON: false } : require(SRC + 'unico_memoria.js');
  if (U.ON) U.chiudi();
  console.log = zitto;
  return U;
}
const numV = id => +String(id).slice(1) || 0;

// il giro del giocatore (quello di test_unico_porta.js): di posto in posto, 2 minuti reali in ognuno. ogni(st) ogni 30 minuti di gioco
function giro(G, st, ore, rnd, ogni) {
  const p = st.player, DT = 1 / 20, t0 = st.t, GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(k => G.PLACES[k]).filter(Boolean);
  let Pz = GIRO[0], tappa = 0, lastSw = st.clock, wp = null, h = 0x811c9dc5, hb = 0x811c9dc5, nv = 0, ultimo = 0, snap = st.t, passi = 0; const visti = new WeakSet();
  p.x = Pz.x; p.y = Pz.y + 2;
  while (st.t < t0 + ore * 60) {
    if (st.clock - lastSw > 120) { lastSw = st.clock; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = rnd() * 6.283, r = rnd() * 25; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
    const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
    G.step(st, DT, { x: dx / dd, y: dy / dd }); passi++;
    // il flusso dei fatti di vita, tutti (anche quelli che escono dalla sua vista di 300): id, t, tipo, chi, causa, peso, hop
    const L = st.vita && st.vita.fatti;
    if (L && L.length && numV(L[L.length - 1].id) > ultimo) {
      let i = L.length - 1; while (i > 0 && numV(L[i - 1].id) > ultimo) i--;
      for (; i < L.length; i++) { const f = L[i]; if (numV(f.id) <= ultimo) continue; ultimo = numV(f.id); nv++; h = fnv(h, [f.id, f.t, f.tipo, f.chi.join(','), f.causa, f.peso, f.hop].join('|')); }
    }
    for (const n of st.npcs) { const b = n.bark; if (!b || visti.has(b)) continue; visti.add(b); hb = fnv(hb, n.id + '|' + String(b.text || '') + '|' + Math.round(st.clock * 20)); }
    if (st.t - snap >= 30) { snap = st.t; if (ogni) ogni(st); hb = fnv(hb, st.npcs.map(n => n.id + ':' + Math.round(n.x * 10) + ',' + Math.round(n.y * 10) + ':' + Math.round(n.money || 0)).join(';')); }
  }
  return { hashV: h.toString(16), hashB: hb.toString(16), nv, passi };
}

// ============================ i figli ============================
if (FIGLIO) {
  const modo = ARG('modo', 'memoria'), seme = +ARG('partita', 1), ore = +ARG('ore', 6);
  if (modo === 'spento') {
    const U = carica('spento');
    process.stdout.write('\n@@' + JSON.stringify({ fatto: Object.keys(Fatto), unico: Object.keys(U), vitaFatto: typeof (global.Vita && Vita.fatto) }) + '\n'); process.exit(0);
  }
  const U = carica(modo === 'senza' ? 'senza' : 'memoria'), G = Game, out = { modo };
  if (modo === 'sintetico') { Object.assign(out, sintetico()); process.stdout.write('\n@@' + JSON.stringify(out) + '\n'); process.exit(0); }
  const t0 = Date.now(), st = G.create(seme); st.deadline = 1e12;
  // la parità della catena, controllata ogni 30 minuti di gioco su tutti i fatti della vista di vita. «scontri»: Vita.catena segue una
  // causa che vita non aveva trovato (hop 0) e che porta lo stesso nome di un altro fatto di vita, nato dopo (gli id 'f' di iniziative.js e
  // quelli di vita si scontrano: iniziative passa a Vita.fatto il suo id quando il padre non ha vid). Peso e hop sono quelli giusti;
  // la memoria non segue le cause non trovate (le tiene in cx): la sua catena è quella di Vita.catena tagliata all'ultimo fatto con hop 0.
  const par = { visti: 0, uguali: 0, troncate: 0, scontri: 0, diverse: 0, mancanti: 0, es: [], esS: [] }, giaVisti = new Set();
  const ogni = modo !== 'memoria' ? null : s => {
    for (const g of s.vita.fatti) {
      if (giaVisti.has(g.id)) continue; giaVisti.add(g.id); par.visti++;
      const f = Fatto.daVita(s, g.id);
      if (!f || f.t !== Math.round(g.t * 100) / 100 || f.v !== g.tipo || f.peso !== g.peso || f.hop !== g.hop || [f.chi].concat(f.con).join() !== g.chi.map(String).join()) { par.mancanti++; if (par.es.length < 4) par.es.push(['manca', g.id, g.tipo, f && f.vid]); continue; }
      const cv = Vita.catena(g.id).map(x => x.id + ':' + x.peso + ':' + x.hop).join(' > ');
      const cf = Fatto.catena(s, f.id).map(x => x.vid + ':' + x.peso + ':' + x.hop).join(' > ');
      if (cv === cf) par.uguali++;
      else if (cf.endsWith(cv) && cv.length) par.troncate++;   // la vista di vita (300) ha perso gli antenati, la memoria no
      else { const C = Vita.catena(g.id); let j = 0; for (let i = 0; i < C.length; i++) if (C[i].hop === 0) j = i;
        if (j > 0 && cf === C.slice(j).map(x => x.id + ':' + x.peso + ':' + x.hop).join(' > ')) { par.scontri++; if (par.esS.length < 2) par.esS.push(cv); continue; }   // vedi sopra
        par.diverse++; if (par.es.length < 4) par.es.push([cv, cf]); }
    }
  };
  Object.assign(out, giro(G, st, ore, mulberry(seme * 7919), ogni));
  out.secondi = (Date.now() - t0) / 1000; out.fattiVita = st.vita ? st.vita.nextF - 1 : 0; out.statsVita = st.vita ? { fatti: st.vita.stats.fatti, catenaMax: st.vita.stats.catenaMax } : null;
  if (modo === 'memoria') {
    ogni(st);
    const F = st.u.fatti, T = Fatto.tutti(st), I = Fatto._.idx(st);
    out.par = par; out.stats = Object.assign({}, Fatto.stats);
    out.mem = { n: F.n, anello: F.anello.length, notevoli: F.notevoli.length, tutti: T.length, conti: Object.keys(F.conti).length, fonti: T.reduce((o, f) => (o[f.fo] = (o[f.fo] || 0) + 1, o), {}) };
    // la regola, ricontata da capo sulla memoria: ogni figlio pesa .6 del padre, hop = hop del padre + 1, niente sotto .15
    let reg = 0, regNo = 0, lunga = null; for (const f of T) { if (f.causa === null) continue; const p = Fatto.di(st, f.causa); if (!p) continue; reg++; if (Math.abs(p.peso * .6 - f.peso) > 1e-12 || p.hop + 1 !== f.hop || f.peso < .15) regNo++; const c = Fatto.catena(st, f.id); if (!lunga || c.length > lunga.length) lunga = c; }
    out.regola = { figli: reg, no: regNo, lunga: lunga ? lunga.map(x => x.v + '(' + x.peso.toFixed(2) + ')').join(' → ') : '' };
    // gli indici contro la ricerca a mano
    const mano = (k, val) => T.filter(f => k === 'chi' ? [f.chi].concat(f.con).includes(val) : k === 'tipo' ? f.v === val : f.dove[2] === val).map(f => f.id).join();
    let chiavi = 0, idxNo = 0; const esNo = [];
    for (const [k, m] of [['chi', I.chi], ['tipo', I.tipo], ['luogo', I.luogo]]) for (const val of m.keys()) { chiavi++; const a = Fatto.per(st, { [k]: val }).map(f => f.id).join(); if (a !== mano(k, val)) { idxNo++; if (esNo.length < 3) esNo.push(k + '=' + val); } }
    // e le chiavi che ci sono nei fatti ci sono negli indici; una richiesta composta
    for (const f of T) { if (!I.tipo.has(f.v) || !I.luogo.has(f.dove[2]) || [f.chi].concat(f.con).some(a => a !== null && !I.chi.has(a))) { idxNo++; if (esNo.length < 3) esNo.push('#' + f.id + ':' + f.v + '@' + f.dove[2]); } }
    const f0 = T.find(f => f.con.length) || T[0], comp = f0 ? Fatto.per(st, { chi: f0.chi, tipo: f0.v, luogo: f0.dove[2] }).map(f => f.id).join() : '', compM = f0 ? T.filter(f => [f.chi].concat(f.con).includes(f0.chi) && f.v === f0.v && f.dove[2] === f0.dove[2]).map(f => f.id).join() : '';
    out.indici = { chiavi, no: idxNo, es: esNo, composta: comp === compM && comp.length > 0, id: I.id.size === T.length && T.every(f => Fatto.di(st, f.id) === f) };
    // i derivati sulla partita: i prestiti di vita, il debito derivato contro n.pop.debiti (la vista di vita) quando è lo stesso prestito
    let pre = 0, preOk = 0, rnc = 0; for (const f of T.filter(x => x.v === 'prestito')) { const b = G.byId(st, f.con[0]), D = b && b.pop.debiti && b.pop.debiti[f.chi]; if (!D || D.causa !== f.vid) continue; pre++; if (Fatto.debito(st, f.chi, f.con[0]) >= Math.min(D.v, f.soldi) - 1e-9) preOk++; }
    for (const f of T) { const o = Fatto.OFFESE[f.v]; if (!o || !f.con.length) continue; const A = [f.chi].concat(f.con), vit = o[0] === 'sim' ? A[0] : A[o[1]], off = o[0] === 'sim' ? A[1] : A[o[0]]; if (Fatto.rancore(st, vit, off) > 0) rnc++; }
    out.derivati = { prestiti: pre, prestitiOk: preOk, offese: T.filter(f => Fatto.OFFESE[f.v] && f.con.length).length, conRancore: rnc };
    { const coppie = []; for (const f of T) if (f.con.length) coppie.push([f.chi, f.con[0]]); const t1 = process.hrtime.bigint(); for (const [a, b] of coppie) Fatto.rel(st, a, b); out.derivati.usRel = coppie.length ? Number(process.hrtime.bigint() - t1) / 1000 / coppie.length : 0; }
    // serializzabile: puro (niente funzioni, NPC, cicli), JSON andata e ritorno identico
    let js = null, puro = null; try { puro = Fatto.puro(st.u.fatti, 'st.u.fatti') && Fatto.puro(st.u, 'st.u'); } catch (e) { puro = String(e.message); }
    try { js = JSON.stringify(st.u.fatti); } catch (e) { js = null; out.jsonErr = String(e.message); }
    out.json = { ok: !!js && JSON.stringify(JSON.parse(js)) === js, kb: js ? Math.round(js.length / 1024) : 0, puro, u: (() => { try { return Math.round(JSON.stringify(st.u).length / 1024); } catch (e) { return String(e.message); } })() };
    // il salvataggio di oggi (JSON.stringify(st) intero) e dove sono i cicli (informativo: li toglie il passo 6)
    try { JSON.stringify(st); out.stIntero = 'ok'; } catch (e) { out.stIntero = String(e.message).split('\n')[0].slice(0, 120); }
    out.cicli = {}; for (const k of ['vita', 'ini', 'casa', 'parola', 'u']) { if (!st[k]) continue; try { Fatto.puro(st[k], 'st.' + k); out.cicli[k] = 'puro'; } catch (e) { out.cicli[k] = String(e.message).slice(0, 90); } }
    // il costo a caldo (la scrittura di un fatto, ripetuta: dopo tutti i controlli, perché scrive nella memoria)
    { const f = T[T.length - 1], N = 300, t1 = process.hrtime.bigint(); for (let j = 0; j < N; j++) Fatto._.registra(st, { t: st.t, v: f.v, chi: [f.chi].concat(f.con), causa: null, peso: 1, hop: 0 }, f.x || {}, 'prova'); out.usCaldo = Number(process.hrtime.bigint() - t1) / 1000 / N; }
    out.misure = U.misure()['unico.memoria'] || null; out.err = U.err; out.errTot = U.errTot;
  }
  process.stdout.write('\n@@' + JSON.stringify(out) + '\n');
  process.exit(0);
}

// le prove a dati finti: l'anello e i notevoli, la regola senza vita, il tetto al giorno, rancore e debito, puro
function sintetico() {
  const o = {}, C = Fatto.CFG, finto = t => ({ t: t || 0, npcs: [], player: { x: -1e6, y: -1e6 }, u: {} });
  const s = (st, tipo, chi, dati, causa) => Fatto.scrivi(tipo, chi, dati, causa, { st, proprio: true }).id;
  // 1. l'anello: tetto 50, notevoli 10; 20 fatti gravi (furto e rissa in case diverse: novità piena) fra 180 chiacchiere
  { const A0 = C.anello, N0 = C.notevoli; C.anello = 50; C.notevoli = 10; const st = finto(); const scritti = [];
    for (let i = 0; i < 200; i++) { st.t = i; const grave = i % 10 === 3; const id = s(st, grave ? (i % 20 === 3 ? 'furto' : 'rissa') : 'social', ['a' + (i % 7), 'b' + (i % 5)], grave ? { bi: 100 + i } : { kind: 'chiacchiera', bi: 1 }, null); scritti.push(Fatto.di(st, id)); }
    const F = st.u.fatti, anello = Fatto._.inOrdine(F).map(f => f.id), usciti = scritti.filter(f => f.id <= 150), cand = usciti.filter(f => f.ril >= C.soglia), tenuti = new Set(F.notevoli.map(f => f.id));
    const minT = Math.min(...F.notevoli.map(f => f.ril)), maxScart = Math.max(0, ...cand.filter(f => !tenuti.has(f.id)).map(f => f.ril));
    o.anello = { len: F.anello.length, ultimi50: anello.join() === scritti.slice(150).map(f => f.id).join(), notevoli: F.notevoli.length, cand: cand.length, soloGravi: F.notevoli.every(f => f.v !== 'social' && f.ril >= C.soglia),
      ordine: minT >= maxScart, chiacchiereVia: usciti.filter(f => f.v === 'social').every(f => Fatto.di(st, f.id) === null), notevoliLeggibili: F.notevoli.every(f => Fatto.di(st, f.id) === f),
      perTipo: Fatto.per(st, { tipo: 'social' }).length === scritti.slice(150).filter(f => f.v === 'social').length, perGravi: Fatto.per(st, { tipo: 'furto' }).length + Fatto.per(st, { tipo: 'rissa' }).length === F.notevoli.length + scritti.slice(150).filter(f => f.v !== 'social').length,
      tutti: Fatto.tutti(st).length === 60 && Fatto.tutti(st).every((f, i, L) => !i || L[i - 1].id < f.id) };
    C.anello = A0; C.notevoli = N0; }
  // 2. la regola senza vita: ×.6 per salto, si ferma sotto .15 (il quinto anello della catena non nasce)
  { const st = finto(10); const ids = []; let c = null; for (let i = 0; i < 5; i++) { c = s(st, 'passo' + i, ['x'], {}, c); ids.push(c); }
    o.regola = { pesi: ids.slice(0, 4).map(id => Fatto.di(st, id).peso), hop: ids.slice(0, 4).map(id => Fatto.di(st, id).hop), quinto: ids[4], catena: Fatto.catena(st, ids[3]).map(f => f.v).join(' → ') }; }
  // 3. il tetto al giorno (quello di vita: 400)
  { const st = finto(1440 * 3); let k = 0; for (let i = 0; i < 420; i++) if (s(st, 'social', ['a', 'b'], {}, null) !== null) k++; st.t += 1440; o.tetto = { giorno: k, dopo: s(st, 'social', ['a', 'b'], {}, null) !== null }; }
  // 4. rancore e debito: a presta 20 a b (scade fra un giorno), regala, b rende 5; poi b deruba a; c e a litigano
  { const st = finto(0); const t0 = 1000; st.t = t0;
    const pr = Fatto._.registra(st, { t: t0, v: 'prestito', chi: ['a', 'b'], causa: null, peso: 1, hop: 0, scad: t0 + 1440 }, { v: 20 }, 'prova');
    st.t = t0 + 10; s(st, 'regalo', ['a', 'b'], { id: 'pane' }, null);
    st.t = t0 + 20; s(st, 'saldato', ['b', 'a'], { v: 5 }, null);
    const d1 = [Fatto.debito(st, 'a', 'b'), Fatto.debito(st, 'b', 'a')], r0 = Fatto.rancore(st, 'a', 'b');
    st.t = t0 + 1440 + 60; const r1 = Fatto.rancore(st, 'a', 'b');
    s(st, 'furto', ['b', 'a'], { ev: 7 }, null); const r2 = Fatto.rancore(st, 'a', 'b'), rb = Fatto.rancore(st, 'b', 'a');
    s(st, 'lite', ['c', 'a'], {}, null); const l = [Fatto.rancore(st, 'a', 'c'), Fatto.rancore(st, 'c', 'a')];
    st.t += 7 * 1440; const r3 = Fatto.rancore(st, 'a', 'b');
    s(st, 'saldato', ['b', 'a'], { v: 17 }, null); const d2 = Fatto.debito(st, 'a', 'b'), r4 = Fatto.rancore(st, 'a', 'b');
    const att3 = .3 * Math.pow(.9, (st.t - (t0 + 1440)) / 1440) + .5 * Math.pow(.9, 7);
    const att4 = .5 * Math.pow(.9, 7);
    o.derivati = { d1, r0, r1, r2, rb, l, r3, att3, d2, r4, att4, rel: Fatto.rel(st, 'a', 'b'), prestito: pr.scad === t0 + 1440 }; }
  // 5. puro: lancia su un ciclo, una funzione, un NPC; passa su un fatto
  { const c = { a: 1 }; c.me = c; const prova = x => { try { Fatto.puro(x); return 'ok'; } catch (e) { return e.message; } };
    o.puro = { ciclo: prova({ c }), fn: prova({ f: () => 1 }), npc: prova({ n: { id: 'p1', pop: {} } }), fatto: prova({ L: [{ id: 1, chi: 'a', con: ['b'], dove: [1, 2, 'molo'] }], same: [1, 2] }) }; }
  // 6. Vita.fatto passa dalla memoria, con la stessa firma e lo stesso ritorno
  o.devia = { memoria: !!Vita.fatto.__memoria, lingua: !!Vita.fatto.__lingua, vecchio: typeof Fatto._.vecchio() === 'function', fase: Unico._.FASI.map(f => f.nome) };
  return o;
}

// ============================ la prova ============================
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };
const { execFileSync } = require('child_process');
const figlio = (...a) => { const o = execFileSync(process.execPath, [__filename, '--figlio', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }); const L = o.split('\n').filter(l => l.startsWith('@@')).pop(); return JSON.parse(L.slice(2)); };
const ORE = +ARG('ore', 6), LUNGA = +ARG('lunga', 72), SEME = +ARG('partita', 1);

{ // spento
  const J = figlio('--modo=spento');
  ok(J.fatto.join() === 'ON' && J.unico.join() === 'ON', `spento il flag: Fatto = { ON: false } e nient'altro (${JSON.stringify(J)})`);
}
{ // a dati finti
  const J = figlio('--modo=sintetico'), A = J.anello, R = J.regola, D = J.derivati, P = J.puro, V = J.devia;
  ok(V.memoria && V.lingua && V.vecchio && V.fase.includes('unico.memoria'), `Vita.fatto passa da Fatto.scrivi (lingua resta sotto); fase «unico.memoria» (${V.fase.join(', ')})`);
  ok(A.len === 50 && A.ultimi50 && A.tutti, `l'anello: tetto 50 (di prova; 2.000 in gioco), dentro gli ultimi 50 in ordine; tutti = notevoli + anello = 60`);
  ok(A.notevoli === 10 && A.cand > 10 && A.soloGravi && A.ordine, `chi esce resta fra i notevoli se lo merita: ${A.notevoli}/10 tenuti su ${A.cand} gravi usciti, nessuna chiacchiera, i tenuti hanno il rilievo più alto`);
  ok(A.chiacchiereVia && A.notevoliLeggibili && A.perTipo && A.perGravi, `gli indici seguono l'uscita: le chiacchiere uscite non si trovano più, i notevoli sì (Fatto.di, Fatto.per)`);
  ok(R.pesi.join() === [1, .6, .36, .6 * .6 * .6].join() && R.hop.join() === '0,1,2,3' && R.quinto === null && R.catena === 'passo0 → passo1 → passo2 → passo3', `la regola senza vita: pesi ${R.pesi.map(x => x.toFixed(3)).join(', ')}, il quinto (${(.6 ** 4).toFixed(3)} < .15) non nasce; catena ${R.catena}`);
  ok(J.tetto.giorno === 400 && J.tetto.dopo, `il tetto: ${J.tetto.giorno} fatti al giorno, il giorno dopo si riparte`);
  ok(D.d1[0] === 17 && D.d1[1] === -17 && D.prestito, `debito: prestito 20 + regalo 2 − reso 5 = ${D.d1[0]} (e dall'altra parte ${D.d1[1]})`);
  ok(D.r0 === 0 && Math.abs(D.r1 - .3 * Math.pow(.9, 60 / 1440)) < 1e-9 && Math.abs(D.r2 - (D.r1 + .5)) < 1e-9 && D.rb === 0, `rancore: 0 prima della scadenza, ${D.r1.toFixed(3)} col debito scaduto, ${D.r2.toFixed(3)} col furto; b verso a ${D.rb}`);
  ok(D.l[0] === .25 && D.l[1] === .25, `la lite pesa da tutte e due le parti (${D.l.join(', ')})`);
  ok(Math.abs(D.r3 - D.att3) < 1e-9 && D.d2 === 0 && Math.abs(D.r4 - D.att4) < 1e-9, `il rancore cala del 10% al giorno (${D.r3.toFixed(4)} = ${D.att3.toFixed(4)} dopo 7 giorni); saldato il debito resta solo il furto (${D.r4.toFixed(4)})`);
  ok(/ciclo/.test(P.ciclo) && /funzione/.test(P.fn) && /NPC/.test(P.npc) && P.fatto === 'ok', `Fatto.puro: ${P.ciclo} · ${P.fn} · ${P.npc} · un fatto passa`);
}
{ // la partita a seme: con e senza memoria
  const A = figlio('--modo=senza', '--partita=' + SEME, '--ore=' + ORE), B = figlio('--modo=memoria', '--partita=' + SEME, '--ore=' + ORE);
  ok(A.nv > 50 && A.hashV === B.hashV && A.nv === B.nv, `la catena di oggi: ${ORE} h, seme ${SEME}, ${A.nv} fatti di vita identici (id, t, tipo, chi, causa, peso, hop) con e senza memoria (${A.hashV} / ${B.hashV})`);
  ok(A.hashB === B.hashB, `e lo stesso giro: fumetti, posti e soldi uguali (${A.hashB} / ${B.hashB})`);
  const P = B.par;
  ok(P.visti === B.nv && P.mancanti === 0 && P.diverse === 0 && P.uguali + P.troncate + P.scontri === P.visti, `ogni fatto di vita è nella memoria con lo stesso peso e hop, e Fatto.catena = Vita.catena: ${P.uguali} uguali, ${P.troncate} dove vita ha perso gli antenati (la memoria li tiene), ${P.scontri} scontri d'id di vita, ${P.diverse} diverse, ${P.mancanti} mancanti ${P.es.length ? JSON.stringify(P.es) : ''}`);
  ok(B.stats.discordi === 0 && B.stats.persi === 0 && B.regola.no === 0 && B.regola.figli > 0, `la regola ×0,6 ricontata sulla memoria: ${B.regola.figli} figli, ${B.regola.no} fuori regola; discordi ${B.stats.discordi}, persi ${B.stats.persi}; la più lunga: ${B.regola.lunga}`);
  ok(B.mem.n === B.nv && B.mem.tutti === B.nv, `tutti i ${B.mem.n} fatti nella memoria (anello ${B.mem.anello}, notevoli ${B.mem.notevoli}); fonti ${JSON.stringify(B.mem.fonti)}`);
  ok(B.indici.no === 0 && B.indici.composta && B.indici.id, `gli indici per attore, tipo e luogo = la ricerca a mano su ${B.indici.chiavi} chiavi (${B.indici.no} diverse ${B.indici.es.join(' ')}), anche composta`);
  ok(B.derivati.prestitiOk === B.derivati.prestiti && B.derivati.conRancore === B.derivati.offese, `derivati sulla partita: ${B.derivati.prestitiOk}/${B.derivati.prestiti} prestiti col debito di n.pop.debiti, ${B.derivati.conRancore}/${B.derivati.offese} offese col rancore; Fatto.rel ${B.derivati.usRel.toFixed(1)} µs`);
  const usF = B.stats.adottati ? B.stats.ms * 1000 / B.stats.adottati : 0, M = B.misure;
  ok(usF < 150 && B.usCaldo < 30 && B.stats.msMax < 8 && M && M.p95 <= .05, `il costo per fatto: ${usF.toFixed(1)} µs in partita, a freddo (≤ 150), ${B.usCaldo.toFixed(1)} µs a caldo (≤ 30); adozione max ${B.stats.msMax.toFixed(2)} ms (≤ 8, il picco è del GC); fase unico.memoria p95 ${M ? M.p95.toFixed(4) : '?'} ms (budget .05), max ${M ? M.max.toFixed(2) : '?'} ms`);
  ok(B.errTot === 0, `nessun errore nelle fasi (${JSON.stringify(B.err)})`);
}
if (LUNGA > 0) { // 72 ore: la memoria si salva
  const B = figlio('--modo=memoria', '--partita=3', '--ore=' + LUNGA);
  ok(B.json.ok && B.json.puro === true, `dopo ${LUNGA} h (seme 3, ${B.nv} fatti, ${B.secondi.toFixed(0)} s): JSON.stringify(st.u.fatti) va e torna identico (${B.json.kb} KB, st.u ${B.json.u} KB), Fatto.puro(st.u) senza errori`);
  ok(B.mem.anello <= 2000 && B.mem.notevoli <= 600 && B.mem.tutti === B.mem.anello + B.mem.notevoli, `i tetti: anello ${B.mem.anello}/2000, notevoli ${B.mem.notevoli}/600 su ${B.mem.n} scritti`);
  ok(B.par.mancanti === 0 && B.par.diverse === 0 && B.stats.discordi === 0 && B.indici.no === 0 && B.errTot === 0, `e a 72 h la catena resta quella di vita: ${B.par.uguali} uguali + ${B.par.troncate} troncate in vita + ${B.par.scontri} scontri d'id / ${B.par.visti}, ${B.par.diverse} diverse ${B.par.es.length ? JSON.stringify(B.par.es) : ''}, ${B.par.mancanti} mancanti, discordi ${B.stats.discordi}; indici ${B.indici.no} diversi su ${B.indici.chiavi} chiavi ${B.indici.es.join(' ')}; errori ${B.errTot}`);
  if (B.par.scontri) console.log(`      scontri d'id (vita, preesistente: Vita.catena segue una causa non trovata che ha il nome di un fatto più giovane), es. ${B.par.esS[0]}`);
  console.log(`      il salvataggio di oggi, JSON.stringify(st): ${B.stIntero}`);
  console.log(`      dove sono i cicli (li toglie il passo 6): ${Object.entries(B.cicli).map(([k, v]) => k + ': ' + v).join(' · ')}`);
}
console.log(`\n${nOk} ok, ${fail} no`);
process.exit(fail ? 1 : 0);
