// [unico] prova dei segni del sistema unico (unico_segni.js e unico_sociali.js: passo 4 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_segni.js [--ore=6]
// Controlla:
//  - SPENTO: Segni = { ON: false }, UnicoSociali = { ON: false } e nient'altro;
//  - I VERBI NUOVI: rendi, chiacchiera, proponi_appuntamento, rinfaccia, lavora: riescono quando devono, rifiutano col perché, la
//    chiacchiera porta la causa (il fatto raccontato, la catena ×0,6) e passa solo fatti veri che chi parla sa;
//  - OGNI VERBO HA IL SUO SEGNO: per tutti i verbi del registro il fatto (riuscito o no) ha f.segno; i riusciti in scena hanno la
//    bolla (pittogramma e parole) e la posa dichiarata; i fatti di vita/casa/iniziative di qualche ora di gioco hanno tutti un segno;
//  - LA GAZZETTA: ogni riga viene da fatti veri (gli id ci sono, il tipo, l'ora, il nome di chi), nessun fatto esce due volte, nessuna
//    riga si ripete fra le ultime 30; le battute (la diceria è il fatto raccontato) non si ripetono fra le ultime 40;
//  - IL TELEFONO: al più 2 fumetti pieni contando quelli di commedia; la freccia al più una ogni 90 s;
//  - IL TACCUINO: le quattro schede si fanno dai fatti (Si dice, Conti aperti), lo stato è puro (Fatto.puro);
//  - IL COSTO della fase unico.segni (p95 ≤ 0,10 ms, max ≤ 4 ms). Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };

// carica il gioco come index.src.html: i moduli, la porta, i cinque di commedia, il tag «unico» (… memoria, sociali, segni), chiudi()
function carica(spento) {
  const F = mulberry(11); Math.random = () => F();
  global.location = { search: spento ? '' : '?commedia' };
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
  global.Verbo = require(SRC + 'unico_verbi.js'); global.Fatto = require(SRC + 'unico_memoria.js');
  global.UnicoSociali = require(SRC + 'unico_sociali.js'); global.Segni = require(SRC + 'unico_segni.js');
  if (U.ON) U.chiudi();
  console.log = zitto;
  return U;
}
if (process.argv.includes('--spento')) {
  carica(true);
  process.stdout.write('@@' + JSON.stringify({ segni: Object.keys(Segni), soc: Object.keys(UnicoSociali), unico: Object.keys(Unico) }) + '\n');
  process.exit(0);
}
{
  const { execFileSync } = require('child_process');
  const o = execFileSync(process.execPath, [__filename, '--spento'], { encoding: 'utf8', maxBuffer: 1 << 26 }), J = JSON.parse(o.split('\n').find(l => l.startsWith('@@')).slice(2));
  ok(J.segni.join() === 'ON' && J.soc.join() === 'ON' && J.unico.join() === 'ON', 'spento il flag: Segni = { ON: false }, UnicoSociali = { ON: false } e nient\'altro');
}

// ============================ acceso ============================
const U = carica(false), G = Game, V = Verbo, F = Fatto, SG = Segni, SO = UnicoSociali;
const st = G.create(1); st.deadline = 1e12;
for (let i = 0; i < 40; i++) G.step(st, 1 / 20, { x: 0, y: 0 });
Vita.CFG.capGiorno = 1e9;
const passo = (k) => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
const SOLO = n => !process.env.SOLO || process.env.SOLO.split(',').includes(String(n));
const NUOVI = ['rendi', 'chiacchiera', 'proponi_appuntamento', 'rinfaccia', 'lavora'];
ok(SG.ON && SO.ON && U._.FASI.some(f => f.nome === 'unico.segni') && NUOVI.every(v => V.SCHEDE[v] && V.SCHEDE[v].segno), `acceso: la fase unico.segni, ${Object.keys(V.SCHEDE).length} verbi nel registro (i 5 nuovi: ${NUOVI.join(', ')}), ${SG.PITTO.length} pittogrammi`);

// i corpi della prova
const cand = st.npcs.filter(k => k.pop && !k.pop.cast && !k.dead && !(k.ris && k.ris.member) && k.pop.homeT && k.pop.homeT.k === 'b' && k.pop.homeT.bi !== st.me.home.bi && !k.cop && !k.faction && !k.shop);
const [n1, n2, n3] = cand, A1 = Attore.di(st, n1), A2 = Attore.di(st, n2), A3 = Attore.di(st, n3), N = Attore.di(st, 'player');
const P = k => G.PLACES[k];
function fermo(A, x, y) {
  if (A === N) { st.player.indoor = null; st.player.vehicle = null; st.player.lv = null; st.player.x = x; st.player.y = y; return; }
  const n = A.o; if (n.pop.emer) Azioni.endPlan(st, n, 'prova'); n.inside = false; if (n.__u) n.__u.dove = null; n.inVeh = null; n.x = x; n.y = y; n.jailedUntil = 0; n.dead = false; n.stun = 0; n.bark = null;
}
const svuota = A => { for (const k of Array.from(A.borsa.keys())) A.borsa.delete(k); };
const ultimo = () => F._.M(st).n;
// in piazza: Nino a 8 m, i tre abitanti vicini fra loro (in scena, bolla piena)
const PZ = P('piazza');
const scena = () => { fermo(N, PZ.x - 8, PZ.y); fermo(A1, PZ.x, PZ.y); fermo(A2, PZ.x + 1.2, PZ.y); fermo(A3, PZ.x, PZ.y + 1.4); for (const n of [n1, n2, n3]) n.pop.near = true; };
const Sx = () => SG._.S(st);

// ============================ 1. I VERBI NUOVI ============================
if (SOLO(1)) {
  scena();
  // rendi: n2 dà il martello a n1 (un fatto «dai»), n1 lo rende
  svuota(A1); svuota(A2); A2.borsa.set('martello', 1);
  const w0 = V.puo(st, n1, 'rendi', { chi: n2.id, cosa: 'martello' });
  const rd = V.fai(st, n2, 'dai', { chi: n1.id, cosa: 'martello', q: 1 }, { subito: true });
  const r1 = V.fai(st, n1, 'rendi', { chi: n2.id, cosa: 'martello', q: 1 }, { subito: true });
  const w1 = V.puo(st, n1, 'rendi', { chi: n2.id, cosa: 'martello' });
  const fr = F.di(st, r1.fid);
  ok(!!w0 && rd.ok && r1.ok && A2.borsa.get('martello') === 1 && A1.borsa.get('martello') === 0 && fr && fr.v === 'restituito' && fr.chi === n1.id && fr.con[0] === n2.id && !!w1,
    `rendi: prima «${w0}»; dopo «dai» ${n1.first} rende il martello a ${n2.first} (fatto «restituito»); di nuovo: «${w1}»`);

  // presta → rinfaccia → salda
  A1.soldi = 60; A2.soldi = 5;
  const rp = V.fai(st, n1, 'presta', { chi: n2.id, soldi: 8 }, { subito: true });
  const rr = V.fai(st, n1, 'rinfaccia', { chi: n2.id }, { subito: true }), frr = F.di(st, rr.fid);
  const wr = V.puo(st, n1, 'rinfaccia', { chi: n3.id });
  ok(rp.ok && rr.ok && frr && frr.v === 'rinfacciato' && Math.abs(frr.soldi) === 8 && /non ti deve niente/.test(wr), `rinfaccia: ${n1.first} presta 8, poi «rinfacciato» (${frr && frr.soldi}.000 lire); a ${n3.first} no: «${wr}»`);

  // proponi_appuntamento (Popolo.appoint: ci vanno davvero)
  n1.pop.appt = null; n3.pop.appt = null;
  const ra = V.fai(st, n1, 'proponi_appuntamento', { chi: n3.id }, { subito: true }), fa = F.di(st, ra.fid);
  const wa = V.puo(st, n1, 'proponi_appuntamento', { chi: n3.id });
  ok(ra.ok && fa && fa.v === 'appuntamento' && typeof fa.x.ora === 'number' && fa.x.ora > st.t && n1.pop.appt && n1.pop.appt.with === n3.id && /già un appuntamento/.test(wa),
    `proponi_appuntamento: «appuntamento» ${SO.oraW(st, fa.x.ora)} a ${G.PLACES[fa.x.posto] ? G.PLACES[fa.x.posto].name : fa.x.posto} (Popolo.appoint: ${n1.first}.appt con ${n3.first}); di nuovo: «${wa}»`);

  // chiacchiera: n1 sa del prestito (l'ha fatto), n3 no → n1 lo racconta a n3; la causa è il fatto raccontato
  // un fatto che n3 non ha visto (era lontano): n1 presta ancora a n2
  fermo(A3, PZ.x + 80, PZ.y); A1.soldi = 60; V.fai(st, n1, 'presta', { chi: n2.id, soldi: 2 }, { subito: true }); fermo(A3, PZ.x, PZ.y + 1.4);
  const fd = SO.diceria(st, n1.id, n3.id);
  const rc = V.fai(st, n1, 'chiacchiera', { chi: n3.id }, { subito: true }), fc = F.di(st, rc.fid), di = fc && fc.x && fc.x.di !== undefined ? F.di(st, +fc.x.di) : null;
  const sa3 = di && SO.sa(st, n3.id, di), rc2 = V.puo(st, n1, 'chiacchiera', { chi: n3.id, di: di && di.id });
  ok(rc.ok && fc && fc.v === 'chiacchiera' && di && fd && di.id === fd.id && fc.causa === di.id && fc.hop === di.hop + 1 && Math.abs(fc.peso - di.peso * .6) < 1e-9 && sa3 && SO.sa(st, n1.id, di) && !!rc2,
    `chiacchiera: ${n1.first} racconta a ${n3.first} il fatto ${di && di.id} («${di && di.v}», scelto: ${fd && fd.id}); causa ${fc && fc.causa}, hop ${fc && fc.hop}, peso ×0,6; ora ${n3.first} lo sa, e la stessa di nuovo: «${rc2}»`);
  // non passa quello che non sa: un fatto lontano, senza testimoni, di altri
  const fx = F._.registra(st, { t: st.t, v: 'lite', chi: [n2.id, 'p_x_nessuno'], causa: null, peso: 1, hop: 0 }, { x: PZ.x + 900, y: PZ.y + 900 }, 'unico');
  const wx = V.puo(st, n3, 'chiacchiera', { chi: n1.id, di: fx.id });
  ok(!SO.sa(st, n3.id, fx) && !!wx, `chiacchiera: ${n3.first} non sa della lite lontana (${fx.id}), e non la può raccontare: «${wx}»`);

  // lavora: al posto di lavoro, nell'orario
  const lav = cand.find(k => k.pop.job && k.pop.job.t && !k.pop.job.night && k !== n1 && k !== n2 && k !== n3) || null;
  if (lav) {
    const AL = Attore.di(st, lav), J = lav.pop.job, t0 = st.t; fermo(AL, J.t.x, J.t.y);
    st.t = Math.floor(st.t / 1440) * 1440 + (J.start + 1) * 60; const s0 = AL.soldi;
    const rl = V.fai(st, lav, 'lavora', { ore: 2 }, { subito: true }), fl = F.di(st, rl.fid);
    fermo(AL, J.t.x + 200, J.t.y); const wl = V.puo(st, lav, 'lavora', { ore: 1 });
    st.t = Math.max(t0, st.t);
    ok(rl.ok && fl && fl.v === 'lavora' && Math.abs(AL.soldi - s0 - J.pay * 2) < .01 && /Non sei al lavoro/.test(wl), `lavora: ${lav.first} (${J.title}) fa 2 ore, +${J.pay * 2}.000 lire; lontano: «${wl}»`);
  } else ok(false, 'lavora: nessun abitante con un lavoro di giorno');
  fermo(N, PZ.x - 8, PZ.y);
}

// ============================ 2. OGNI VERBO HA IL SUO SEGNO ============================
if (SOLO(2)) {
  scena(); passo(1);
  const da0 = ultimo(), REG = V.SCHEDE, out = [], senza = [];
  // i riusciti in scena (con le preparazioni corte), gli altri provati senza argomenti: il fatto c'è lo stesso (esito 'no')
  svuota(A1); A1.soldi = 80; A1.borsa.set('pane', 8); A1.bisogni.fame = .7; A1.borsa.set(Object.keys(Oggetti.CAT).find(k => Oggetti.CAT[k].cat === 'bevande' && Oggetti.CAT[k].eat) || 'acqua', 1);
  const prova = {
    mangia: { cosa: 'pane' }, regala: { chi: n3.id, cosa: 'pane', q: 1 }, dai: { chi: n3.id, cosa: 'pane', q: 1 }, presta: { chi: n2.id, soldi: 3 },
    chiacchiera: { chi: n2.id }, proponi_appuntamento: { chi: n2.id }, rinfaccia: { chi: n3.id }, salda: { chi: n2.id, soldi: 4 },
  };
  // perché riescano: un fatto che n2 non ha visto (da raccontargli), e un debito di n1 con n2 (da saldare)
  fermo(A2, PZ.x + 80, PZ.y); V.fai(st, n1, 'regala', { chi: n3.id, cosa: 'pane', q: 1 }, { subito: true }); fermo(A2, PZ.x + 1.2, PZ.y);
  A2.soldi = 100; V.fai(st, n2, 'presta', { chi: n1.id, soldi: 40 }, { subito: true }); A3.soldi = 5; V.fai(st, n1, 'presta', { chi: n3.id, soldi: 5 }, { subito: true });
  const riusciti = {};
  for (const v of Object.keys(REG)) {
    const a = prova[v] || {}; n2.pop.appt = null; n1.pop.appt = null;
    const r = V.fai(st, n1, v, a, { subito: true, lod: 'scena' });
    let fid = r.fid; if (fid === null || fid === undefined) { const c = V.compi(st, n1, v, a, { lod: 'scena' }); fid = c.fid; }
    riusciti[v] = { ok: r.ok, fid, msg: r.msg };
  }
  passo(1);
  for (const v of Object.keys(REG)) {
    const f = F.di(st, riusciti[v].fid), T = SG._.tipoDi(f ? f.v : v);
    if (!f || !f.segno) { senza.push(v); continue; }
    out.push(`${v}${riusciti[v].ok ? '' : '(no)'}:${f.segno}`);
  }
  ok(senza.length === 0, `ogni verbo del registro (${Object.keys(REG).length}) lascia un fatto con il suo segno: ${out.join(' · ')}${senza.length ? ' · SENZA: ' + senza.join(',') : ''}`);
  // i riusciti in scena: la bolla (pittogramma, parole) e la posa
  const att = SG._.ATT, bolle = [];
  let tutti = true;
  for (const v of Object.keys(prova)) {
    const R0 = riusciti[v]; if (!R0.ok) { tutti = false; bolle.push(v + ': non riuscito (' + R0.msg + ')'); continue; }
    const f = F.di(st, R0.fid), haB = /B/.test(f.segno), haP = !SG._.posaDi(f, SG._.tipoDi(f.v)) || /P/.test(f.segno);
    if (!haB || !haP) tutti = false;
    bolle.push(`${v} [${SG._.pittoDi(f, SG._.tipoDi(f.v))} «${SG._.paroleDi(st, f, SG._.tipoDi(f.v))}» · ${SG._.posaDi(f, SG._.tipoDi(f.v)) || '—'}]`);
  }
  const e1 = att.get(n1.id);
  ok(tutti && e1 && e1.p && e1.fino > st.clock, `in scena, i riusciti hanno bolla e posa: ${bolle.join(' · ')}; la bolla viva di ${n1.first}: ${e1 && e1.p} «${e1 && e1.w}»`);
  // le parole dicono la cosa giusta (Lingua): compra il pane → «il pane»
  const SH = Object.values(Economia.eco(st).shops).find(S => S.sells.pane && S.t && S.t.k === 'b' && !S.market && !S.black);
  SH.stock.pane = 50; fermo(A1, SH.t.x, SH.t.y); A1.soldi = 50;
  const rcp = V.fai(st, n1, 'compra', { cosa: 'pane', q: 1, dove: SH.k }, { subito: true, lod: 'scena' }); fermo(N, SH.t.x - 6, SH.t.y); passo(1);
  const fcp = F.di(st, rcp.fid), wcp = fcp && SG._.paroleDi(st, fcp, SG._.tipoDi(fcp.v));
  ok(rcp.ok && /B/.test(fcp.segno) && wcp === 'il pane' && SG._.pittoDi(fcp, SG._.tipoDi(fcp.v)) === 'moneta', `compra: bolla «moneta · ${wcp}», segno ${fcp && fcp.segno}`);
  // il piano a passi: la bolla dura tutto il verbo (anche mentre va al banco)
  fermo(A1, SH.t.x + 5, SH.t.y + 3); fermo(N, SH.t.x + 12, SH.t.y); n1.pop.near = true;
  const rpi = V.fai(st, n1, 'compra', { cosa: 'pane', q: 1, dove: SH.k }, { modo: 'piano' }); att.delete(n1.id);
  let vista = 0, k = 0; const c0 = V.stats.compiuti;
  while (V.stats.compiuti === c0 && k++ < 4000) { passo(1); if (att.get(n1.id) && att.get(n1.id).piano) vista++; }
  ok(rpi.ok && vista > 0 && V.stats.compiuti > c0, `compra in un piano a passi: la bolla del verbo accesa per ${vista} passi su ${k} (dal «va al banco» al compimento)`);
  fermo(N, PZ.x - 8, PZ.y);
}

// ============================ 3. ORE DI GIOCO: TUTTI I FATTI HANNO UN SEGNO ============================
if (SOLO(3)) {
  const ORE = +ARG('ore', 6), da = ultimo(), t0 = st.t;
  fermo(N, P('mercato') ? P('mercato').x : PZ.x, P('mercato') ? P('mercato').y : PZ.y);
  // il giocatore gira fra i posti pieni (come nella prova di vita), un posto ogni 40 minuti
  const giro = ['mercato', 'piazza', 'molo', 'calata', 'fontana'].filter(k => P(k)); let gi = 0, tg = st.t;
  while (st.t < t0 + ORE * 60) { if (st.t - tg > 40) { tg = st.t; gi++; const q = P(giro[gi % giro.length]); fermo(N, q.x, q.y); } passo(1); }
  passo(1);
  const L = F.tutti(st).filter(f => f.id > da), senza = L.filter(f => !f.segno), vis = L.filter(f => f.vis >= 1), subito = vis.filter(f => /[BPODF]/.test(f.segno));
  const nostri = vis.filter(f => f.x && f.x.verbo), nostriS = nostri.filter(f => /[BPODF]/.test(f.segno));
  const tipi = {}; for (const f of L) tipi[f.v] = (tipi[f.v] || 0) + 1;
  ok(L.length > 0 && senza.length === 0, `${ORE} ore di gioco: ${L.length} fatti, tutti con un segno (senza: ${senza.length}); per tipo ${JSON.stringify(tipi).slice(0, 300)}`);
  console.log(`info fatti visti o sentiti (vis ≥ 1): ${vis.length}, con un segno subito (B/P/O/D/F) ${subito.length} (${vis.length ? (subito.length / vis.length * 100).toFixed(0) : 0}%); dei verbi del registro ${nostriS.length}/${nostri.length}; gli altri hanno la Cronaca di oggi (T)`);
}

// ============================ 4. LA GAZZETTA: SOLO FATTI VERI ============================
const tutteRighe = [];
if (SOLO(4)) {
  const giorni = +ARG('giorni', 3);
  let tracce = true, doppi = 0, nomi = true, finestra = true, nE = 0, html = true; const cattive = [], usciti = new Set();
  // un'edizione si controlla quando esce (i fatti vecchi poi lasciano l'anello della memoria)
  const controlla = e => {
    nE++;
    for (const r of e.righe) {
      tutteRighe.push(r.testo);
      if (!r.f.length) { tracce = false; cattive.push('vuota: ' + r.testo); continue; }
      const nomiF = [];
      for (const id of r.f) {
        const f = F.di(st, id); if (!f) { tracce = false; cattive.push('manca ' + id); continue; }
        if (f.esito === 'no' || !(SG._.tipoDi(f.v).gz > 0) || f.t >= e.t || f.t < e.t - 1440 || f.gz !== e.g) { tracce = false; cattive.push(`${id}:${f.v}`); }
        if (usciti.has(id)) doppi++; usciti.add(id);
        for (const a of [f.chi].concat(f.con || [])) { const n = a === 'nino' || a === 'player' ? { first: 'Nino' } : G.byId(st, a); if (n && n.first) nomiF.push(n.first); }
      }
      if (nomiF.length && !nomiF.some(x => r.testo.includes(x)) && !/^Qualcuno|ai danni/.test(r.testo)) { nomi = false; cattive.push('senza nome: ' + r.testo); }
    }
    const h = SG.html.gazzetta(st), m = h.split('us-gz vecchia')[0], ids = (m.match(/data-f="([\d,]+)"/g) || []).map(x => x.slice(8, -1).split(',').map(Number)).flat();
    if (!ids.length || !ids.every(id => !!F.di(st, id))) html = false;
  };
  for (let gday = 0; gday < giorni; gday++) {
    // ogni giorno le stesse cose (per provare che le righe non si ripetono): prestiti, regali, rinfacci, appuntamenti
    scena(); A1.soldi = 90; A2.soldi = 40; svuota(A1); A1.borsa.set('pane', 4);
    V.fai(st, n1, 'presta', { chi: n2.id, soldi: 4 }, { subito: true }); V.fai(st, n1, 'regala', { chi: n3.id, cosa: 'pane', q: 1 }, { subito: true });
    V.fai(st, n1, 'rinfaccia', { chi: n2.id }, { subito: true }); n1.pop.appt = null; n2.pop.appt = null; V.fai(st, n1, 'proponi_appuntamento', { chi: n2.id }, { subito: true });
    // poi il tempo passa fino alle 7:05 del giorno dopo (il mondo gira)
    const fino = (Math.floor(st.t / 1440) + 1) * 1440 + 7 * 60 + 5, e0 = SG._.C(st).edizioni[0];
    while (st.t < fino) passo(1);
    passo(2);
    const e1 = SG._.C(st).edizioni[0]; if (e1 && e1 !== e0) controlla(e1);
  }
  for (let i = 0; i < tutteRighe.length; i++) for (let j = Math.max(0, i - 30); j < i; j++) if (tutteRighe[i] === tutteRighe[j]) finestra = false;
  const E = SG._.C(st).edizioni;
  ok(nE >= giorni && tutteRighe.length > 0 && tracce && doppi === 0 && nomi, `la Gazzetta: ${nE} edizioni, ${tutteRighe.length} righe; ogni riga ha i suoi fatti (veri, del giorno prima, del tipo giusto, col nome di chi c'entra); nessun fatto due volte ${cattive.slice(0, 4).join(' · ')}`);
  ok(finestra, `nessuna riga della Gazzetta si ripete fra le ultime 30 (${tutteRighe.length} righe in ${nE} giorni)`);
  console.log('info la Gazzetta di ' + (E[0] && E[0].giorno) + ':\n       ' + (E[0] ? E[0].righe.map(r => `[${r.sez}] ${r.testo}  (f${r.f.join(',f')})`).join('\n       ') : ''));
  ok(html, `la scheda «Gazzetta» del Taccuino: gli id dei fatti di ogni edizione nuova sono tutti nella memoria`);
}

// ============================ 5. LE BATTUTE: dal fatto vero, mai la stessa fra le ultime 40 ============================
if (SOLO(5)) {
  scena(); const dette = [], sS = Sx();
  let vere = true;
  for (let i = 0; i < 60; i++) {
    passo(200); scena(); sS.direT = -1e9; for (const n of [n1, n2, n3]) n.bark = null;
    const [a, b] = i % 2 ? [n1, n3] : [n3, n1], Aa = Attore.di(st, a), Ab = Attore.di(st, b);
    // un fatto nuovo da raccontare ogni volta: un regalo a n2, mentre b è lontano; poi b torna e a glielo racconta (o n1 rinfaccia a n2 un prestito)
    const bx = Ab.x, by = Ab.y; fermo(Ab, PZ.x + 90, PZ.y);
    svuota(Aa); Aa.borsa.set('pane', 1); V.fai(st, a, 'regala', { chi: n2.id, cosa: 'pane', q: 1 }, { subito: true });
    const rinf = i % 3 === 2; if (rinf) { A1.soldi = 50; V.fai(st, n1, 'presta', { chi: n2.id, soldi: 1 }, { subito: true }); }
    fermo(Ab, bx, by); SG._.fase(st); sS.direT = -1e9; for (const n of [n1, n2, n3]) n.bark = null;
    const parla = rinf ? n1 : a, r = V.fai(st, parla, rinf ? 'rinfaccia' : 'chiacchiera', rinf ? { chi: n2.id } : { chi: b.id }, { subito: true });
    SG._.fase(st);
    const f = r.fid !== null && r.fid !== undefined ? F.di(st, r.fid) : null;
    if (f && /D/.test(f.segno) && parla.bark) {
      dette.push(parla.bark.text);
      if (f.v === 'chiacchiera') { const g = F.di(st, +f.x.di), chi = g && G.byId(st, g.chi); if (!chi || !parla.bark.text.includes(chi.first)) vere = false; }
    }
  }
  let ripetute = 0; for (let i = 0; i < dette.length; i++) for (let j = Math.max(0, i - 40); j < i; j++) if (dette[i] === dette[j]) ripetute++;
  ok(dette.length >= 5 && ripetute === 0 && vere, `le battute: ${dette.length} dette (chiacchiere e rinfacci), nessuna ripetuta fra le ultime 40, le dicerie dicono il fatto raccontato (es. «${dette[0]}» · «${dette[dette.length - 1]}»); provate ${SG.stats.dette}, tacitate dalla regia di commedia ${SG.stats.tacitate}, senza variante nuova ${SG.stats.saltate}`);
}

// ============================ 6. IL TELEFONO E LA FRECCIA ============================
if (SOLO(6)) {
  const C0 = Array.from({ length: 6 }, (_, i) => ({ id: 'n' + i, d: 5 + i, modo: i < 5 ? 'piena' : 'picto', pr: .5 }));
  const piene = (L) => L.filter(x => x.modo === 'piena').length;
  const t0 = SG.scegli(C0, { tel: true, parlate: 0 }), t1 = SG.scegli(C0, { tel: true, parlate: 1 }), t2 = SG.scegli(C0, { tel: true, parlate: 2 }), d0 = SG.scegli(C0, { tel: false });
  // [molo] al telefono solo pittogrammi (al più 2): le parole stanno nel menu della banda (scheda «Città»)
  ok(piene(t0) === 0 && t0.length <= 2 && piene(t1) === 0 && piene(t2) === 0 && t2.length <= 2 && piene(d0) === 4 && d0.length <= 8,
    `il telefono: con 0/1/2 fumetti di commedia, ${piene(t0)}/${piene(t1)}/${piene(t2)} bolle piene (nessuna: solo pittogrammi, al più 2); sul fisso ${piene(d0)} piene + ${d0.length - piene(d0)}`);
  // la freccia: un fatto pubblico a 40 m, poi un altro subito dopo (niente), poi dopo 90 s (sì)
  const sS = Sx(); sS.frecciaT = -1e9; fermo(N, PZ.x - 40, PZ.y);
  const mk = () => { const f = F._.registra(st, { t: st.t, v: 'lite', chi: [n1.id, n2.id], causa: null, peso: 1, hop: 0 }, { x: PZ.x, y: PZ.y }, 'unico'); f.pub = .7; return f; };
  const fa = mk(); passo(1); const fb = mk(); passo(1);
  const c0 = st.clock; while (st.clock - c0 < 91) passo(20); const fc = mk(); passo(1);
  ok(/F/.test(fa.segno) && !/F/.test(fb.segno) && /F/.test(fc.segno) && sS.freccia && sS.freccia.fid === fc.id, `la freccia a bordo schermo: una lite pubblica a 40 m → freccia (${fa.segno}); la seconda subito dopo no (${fb.segno}); dopo 90 s sì (${fc.segno})`);
  fermo(N, PZ.x - 8, PZ.y);
}

// ============================ 7. IL TACCUINO E LO STATO ============================
if (SOLO(7)) {
  scena(); fermo(N, A1.x + 1, A1.y);
  // un abitante racconta a Nino: la diceria arriva in «Si dice»
  const rc = V.fai(st, n1, 'chiacchiera', { chi: 'nino' }, { subito: true }); passo(1);
  const L = SG.sentite(st), h = SG.html;
  const html = [h.gazzetta(st), h.cronaca(st), h.sentito(st), h.conti(st)];
  const cron = SG.cronacaOggi(st), ids = new Set(cron.flatMap(P0 => Array.from(P0.tipi.values()).flatMap(q => q.f)));
  const t0 = SG._.C(st).ultima * 1440 + 7 * 60, dopo = F.tutti(st).filter(f => f.t >= t0);
  ok(rc.ok && L.length > 0 && L[0].id === rc.fid && /Si dice|voci/.test(html[2]) && html.every(x => typeof x === 'string' && x.length > 40), `il Taccuino: «Si dice» ha la diceria raccontata a Nino («${L[0] && L[0].testo}»); le quattro schede si fanno (${html.map(x => x.length).join('/')} caratteri)`);
  ok(dopo.length > 0 && dopo.every(f => ids.has(f.id)), `la «Cronaca di oggi» ha tutti i ${dopo.length} fatti dalle sette (per posto e per tipo: ${cron.length} posti)`);
  const C1 = SG.conti(st);
  console.log('info Conti aperti: ' + C1.slice(0, 6).map(x => x.testo).join(' · '));
  let puro = true, perche = ''; try { F.puro(st.u.segni, 'segni'); F.puro(st.u.cronaca, 'cronaca'); F.puro(st.u.taccuino, 'taccuino'); F.puro(st.u.fatti, 'fatti'); } catch (e) { puro = false; perche = e.message; }
  ok(puro, `lo stato dei segni è puro (st.u.segni, st.u.cronaca, st.u.taccuino, i fatti con f.segno): solo numeri, stringhe e array ${perche}`);
}

// ============================ 8. IL COSTO DELLA FASE ============================
{
  const M = U.misure()['unico.segni'];
  console.log(`info la fase unico.segni: ${M.n} passi, p50 ${M.p50.toFixed(4)} · p95 ${M.p95.toFixed(4)} · p99 ${M.p99.toFixed(4)} · max ${M.max.toFixed(3)} ms; ${SG.stats.fatti} fatti segnati, ${SG.stats.edizioni} edizioni`);
  // la Gazzetta di un giorno pieno: quanto costa un'edizione da sola
  const t0 = process.hrtime.bigint(); for (let i = 0; i < 20; i++) SG.edizione(st, Math.floor(st.t / 1440) + 50 + i); const ed = Number(process.hrtime.bigint() - t0) / 1e6 / 20;
  ok(M.p95 <= .10 && M.max <= 4, `il costo: p95 ${M.p95.toFixed(4)} ms ≤ 0,10; max ${M.max.toFixed(3)} ms ≤ 4 (un'edizione della Gazzetta: ${ed.toFixed(3)} ms)`);
  ok(U.errTot === 0, `nessun errore nelle fasi: Σ Unico.err = ${U.errTot} ${U.errTot ? JSON.stringify(U.ultimo).slice(0, 400) : ''}`);
}
console.log(`\n${nOk} ok, ${fail} NO`);
process.exit(fail ? 1 : 0);
