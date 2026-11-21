// [logica] LA SONDA DEL GIOCO DI SERIE: la logica caricata come index.src.html (mappa nuova, commedia e parola accese di serie, i moduli
// unico_*, Unico.chiudi), a seme fisso, con quattro scene. Misura solo conteggi (niente millisecondi: la macchina può essere carica),
// così il prima e il dopo di una modifica si confrontano riga per riga (v7/squadra/logica/ANALISI.md, RICERCA.md R7).
//   giorno   il giocatore fermo in piazza dalle 16 alle 19: le righe del registro, i «Stanotte» scritti di giorno, le crew vuote nel
//            feed, i morti e la causa scritta nel registro
//   scippo   uno scippo in mezzo alla gente: chi lo sa subito e dopo 4 minuti, quanti agenti, l'arresto (dopo quanto, quante ore
//            saltate, quante penalità), le «La voce corre» nel feed, i soldi della vittima
//   squalo   Sandro ucciso dal giocatore nella premessa della Risacca: la partita finisce? Le righe d'avvio del registro
//   opinioni una spinta a n.op dall'esterno (come fanno unico_verbi, oggetti, convivenza): c'è ancora dopo 2 s?
// Uso (da v7/):  node strumenti/sonda_serie.js [scena|tutte] [seme = 7] [uscita.json]     ogni scena in un processo suo
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const SRC = path.join(__dirname, '..', 'src') + '/';
const SCENE = ['giorno', 'scippo', 'squalo', 'opinioni'];

function carica(seme) {
  require(SRC + 'seme.js')(seme);
  global.location = { search: '?strade2&insegne4&graffiti2&facce3&luce3&progetto&commedia&parola' };
  const zitto = console.log, w0 = console.warn, e0 = console.error, avvisi = [];
  console.log = () => {}; console.warn = (...a) => avvisi.push(a.map(String).join(' ').slice(0, 200)); console.error = console.warn;
  const req = (g, f) => { try { const m = require(SRC + f + '.js'); if (g) global[g] = m; return m; } catch (e) { avvisi.push('manca ' + f + ': ' + e.message); return null; } };
  req('World', 'world_cittanuova'); req('Interior', 'interiors'); req('UnicoPresto', 'unico_presto'); req('Game', 'game');
  for (const m of ['Posti:posti', 'Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti',
    'Guardaroba:guardaroba', 'Protagonista:protagonista', 'Attivita:attivita', 'Cassaforti:cassaforti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza',
    'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Paesaggio:paesaggio', 'Livelli:livelli', 'Sottosuolo:sottosuolo',
    'Ordine:ordine', 'Scontri:scontri', 'Animali:animali', 'Skate:skate', 'Tetti:tetti', 'TettiVissuti:tetti_vissuti', 'WriterArte:writer_arte', 'Writing:writing',
    'WriterVita:writer_vita', 'Eventi:eventi', 'Matti:matti', 'Chiarezza:chiarezza', 'Ingombri:ingombri', 'Vievive:vievive', 'Palco:palco', 'Scena:scena', 'Scorci:scorci',
    'Coro:coro', 'Mente:mente']) { const [g, f] = m.split(':'); req(g, f); }
  global.addEventListener = () => {}; global.window = global.window || {}; global.document = { readyState: 'loading', addEventListener() {} };
  req('Cantiere', 'cantiere'); delete global.document;
  const U = req('Unico', 'unico_porta');
  for (const m of ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa']) { const [f, g] = m.split(':'); if (U && U.ON) U._nomeProva = f; req(g, f); }
  if (U && U.ON) U._nomeProva = 'unico';
  for (const [g, f] of [['Attore', 'unico_attore'], ['UnicoCatalogo', 'unico_catalogo'], ['Lingua', 'unico_lingua'], ['Verbo', 'unico_verbi'], ['Fatto', 'unico_memoria'],
    ['UnicoSociali', 'unico_sociali'], ['Segni', 'unico_segni'], ['MenteUnica', 'unico_mente'], ['UnicoMolo', 'unico_molo'], ['UnicoParti', 'unico_parti'],
    ['UnicoCostruire', 'unico_costruire'], ['UnicoPartiVivo', 'unico_parti_vivo'], ['UnicoPresidio', 'unico_presidio'], ['UnicoStorie', 'unico_storie'],
    ['UnicoMotore', 'unico_motore'], ['Regista', 'unico_regista'], ['UnicoIdee', 'unico_idee'], ['UnicoGruppi', 'unico_gruppi'], ['UnicoCose', 'unico_cose'],
    ['UnicoRissa', 'unico_rissa'], ['UnicoDesideri', 'unico_desideri'], ['UnicoVocabolario', 'unico_vocabolario'], ['UnicoCultura', 'unico_cultura'],
    ['UnicoStrada', 'unico_strada'], ['UnicoStriscione', 'unico_striscione'], ['UnicoCorpi', 'unico_corpi'], ['UnicoCrescita', 'unico_crescita'],
    ['UnicoToppe', 'unico_toppe'], ['Salva', 'unico_salva'], ['UnicoSchermo', 'unico_schermo']]) { const m = req(g, f); if (g === 'Attore' && m) global.Roba = m.Roba; }
  if (U && U.ON && U.chiudi) U.chiudi();
  const G = global.Game, st = G.create(seme);
  console.log = zitto;
  return { G, st, U, avvisi };
}

const DT = 1 / 30;
function passi(G, st, secondi, ogni) { for (let i = 0, N = Math.round(secondi / DT); i < N; i++) { G.step(st, DT, { x: 0, y: 0 }); if (ogni) ogni(i); if (st.over && !st.__tieni) st.over = null; } }
// il registro come lo legge il giocatore, senza l'ora davanti
const testo = l => String(l.text).replace(/^\d\d:\d\d · /, '');
function osservaFeed(st, out) { const visti = new Set(); return () => { for (const f of st.feed) if (!visti.has(f)) { visti.add(f); out.push(f.text); } }; }

const FARE = {
  giorno(G, st) {
    const p = st.player; st.deadline = 1e12;
    st.t = Math.floor(st.t / 1440) * 1440 + 16 * 60; const t0 = st.t, P = G.PLACES.piazza || G.PLACES.calata; p.x = P.x; p.y = P.y + 2;
    const log0 = new Set(st.log), feed = [], vedi = osservaFeed(st, feed), morti = [];
    passi(G, st, 3 * 60 / G.MIN_PER_SEC, i => { vedi(); p.hp = 100; if (i % 30 === 0) for (const n of st.npcs) if (n.dead && !n.__contato) { n.__contato = 1; morti.push(n.name + (n.vigile ? ' (vigile)' : '') + ' ' + G.clockStr(st.t)); } });
    const nuove = st.log.filter(l => !log0.has(l)).map(l => ({ t: l.t, s: testo(l) }));
    const ora = t => Math.floor(t / 60) % 24;
    return { righeRegistro: nuove.length, stanotteDiGiorno: nuove.filter(l => /^Stanotte/.test(l.s) && ora(l.t) >= 7 && ora(l.t) < 21).length,
      graffitiNelRegistro: nuove.filter(l => /dipinto sul muro|scritto sul muro/.test(l.s)).length, crewVuote: feed.filter(f => / dei  /.test(f)).length,
      feed: feed.length, morti: morti.length, chi: morti, morteSparatoria: nuove.filter(l => /morto nella sparatoria/.test(l.s)).length, morteInvestito: nuove.filter(l => /investit/.test(l.s)).length,
      ore: [G.clockStr(t0), G.clockStr(st.t)] };
  },
  scippo(G, st) {
    const p = st.player; st.deadline = 1e12;
    passi(G, st, 60);
    let best = null; for (const n of st.npcs) { if (n.dead || n.inside || !n.pop || n.cop || n.faction || n.__ev) continue; const c = st.npcs.filter(k => !k.dead && !k.inside && Math.hypot(k.x - n.x, k.y - n.y) < 15).length; if (!best || c > best.c) best = { n, c }; }
    const V = best.n; p.x = V.x + .8; p.y = V.y; p.face = Math.PI; p.indoor = null; p.vehicle = null;
    const soldiV0 = V.pop.money, soldiP0 = p.money, t0 = st.t, ck0 = st.clock, arr0 = p.arrests + (p.fermi || 0), fermi0 = p.fermi || 0;
    const r = G.act(st, 'scippo'), ev = st.events[0], soldiVsubito = V.pop.money, gSubito = p.money - soldiP0;
    const sanno = () => st.npcs.filter(n => n.mem.some(m => m.eventId === ev.id && m.actor === 'player')).length;
    const agenti = () => st.npcs.filter(n => n.cop && n.mem.some(m => m.eventId === ev.id && m.actor === 'player')).length;
    const subito = { sanno: sanno(), agenti: agenti(), visto: st.npcs.filter(n => n.mem.some(m => m.eventId === ev.id && m.source === 'visto')).length };
    const feed = [], vedi = osservaFeed(st, feed); let arresto = null; const logA = st.log.length;
    passi(G, st, 240, () => { vedi(); if (p.arrests + (p.fermi || 0) > arr0 && !arresto) arresto = { dopoS: +(st.clock - ck0).toFixed(1), tipo: (p.fermi || 0) > fermi0 ? 'fermo' : 'arresto', contaFraITre: p.arrests }; });
    const nuove = st.log.slice(0, st.log.length - logA).map(testo);
    if (arresto) arresto.penalita = feed.filter(f => /Multa|sequestrat/.test(f)).length;
    const salto = nuove.some(s => /^(Arrestato|Fermato)/.test(s)) ? Math.round((st.t - t0 - 240 * G.MIN_PER_SEC) / 60 * 10) / 10 : 0;
    return { preso: r && r.ok, guadagno: p.money - soldiP0 + (arresto ? 0 : 0), soldiVittima: [Math.round(soldiV0 * 10) / 10, Math.round(soldiVsubito * 10) / 10], guadagnoSubito: gSubito, subito, dopo4min: { sanno: sanno(), agenti: agenti() },
      arresto, oreSaltate: salto, vociNelFeed: feed.filter(f => /^La voce corre/.test(f)).length, vociDaAgenti: feed.filter(f => /^La voce corre: (Guardia|Appuntato|Agente|Brigadiere|Ispettore)/.test(f)).length,
      denunceDopoArresto: arresto ? nuove.filter(s => /ti ha denunciato/.test(s)).length : null };
  },
  squalo(G, st) {
    const avvio = st.log.map(testo).filter(s => /Squalo|Risacca|Tutela/.test(s)).length, squaloAvvio = st.log.map(testo).filter(s => /Squalo rivuole/.test(s)).length;
    passi(G, st, 5); const s = G.byId(st, 'sandro'); st.__tieni = true; G.kill(st, s, 'player', 0); passi(G, st, 10);
    return { righeAvvio: avvio, debitoDelloSqualo: squaloAvvio, fine: st.over ? st.over.reason.slice(0, 60) : null, vinto: !!(st.over && st.over.win) };
  },
  opinioni(G, st) {
    const p = st.player; passi(G, st, 20);
    const n = st.npcs.filter(n => !n.dead && !n.inside && n.pop && n.pop.near && !n.cop).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const prima = Object.assign({}, n.op);
    if (G.opSpingi) G.opSpingi(st, n, { trust: .3, grudge: .2 }); else { n.op.trust = (n.op.trust || 0) + .3; n.op.grudge = (n.op.grudge || 0) + .2; }
    passi(G, st, 2); const dopo2s = { trust: +n.op.trust.toFixed(2), grudge: +n.op.grudge.toFixed(2) };
    passi(G, st, 60); const dopo1min = { trust: +n.op.trust.toFixed(2), grudge: +n.op.grudge.toFixed(2) };
    return { npc: n.id, prima: { trust: +prima.trust.toFixed(2), grudge: +prima.grudge.toFixed(2) }, dopo2s, dopo1min };
  },
};

const arg = process.argv.find(a => a.startsWith('--una='));
if (arg) {
  const [scena, seme, file] = arg.slice(6).split(',');
  const { G, st, U, avvisi } = carica(+seme);
  const o = FARE[scena](G, st); o.erroriUnico = U && U.errTot; o.avvisi = avvisi.filter(a => !/campagna/.test(a)).length;
  fs.writeFileSync(file, JSON.stringify(o)); process.exit(0);
} else {
  const quali = (process.argv[2] && process.argv[2] !== 'tutte') ? process.argv[2].split(',') : SCENE, seme = +process.argv[3] || 7, out = process.argv[4];
  const R = { seme };
  for (const s of quali) {
    const tmp = path.join(require('os').tmpdir(), `sonda_serie_${process.pid}_${s}.json`);
    const r = cp.spawnSync(process.execPath, [__filename, `--una=${s},${seme},${tmp}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
    try { R[s] = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp); } catch (e) { R[s] = { rotta: (r.stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 400) }; }
    console.log(s.padEnd(9), JSON.stringify(R[s]));
  }
  if (out) fs.writeFileSync(out, JSON.stringify(R, null, 1));
}
