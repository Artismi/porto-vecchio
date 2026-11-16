#!/usr/bin/env node
/* Porto Vecchio — banco/crescita_node.js: le prove del presidio che cresce (src/unico_crescita.js, dietro ?commedia).
   1. Due semi diversi danno presidi diversi: le cose decise (il tipo e quante) e la pianta (dove stanno) non sono le stesse.
   2. Le auto si fermano SE E SOLO SE quello che è stato costruito non lascia un passaggio largo abbastanza: un'auto del traffico messa
      sulla via del presidio passa (piano, nel varco) finché c'è posto; costruita una barricata da un muro all'altro, si ferma e torna
      indietro; tolta la barricata, ripassa.
   3. Le regole fisiche: nessuna compenetrazione (UP.valida), niente pezzi appesi.
   4. IL PASSAGGIO È UNA DECISIONE: su più semi la strada non si chiude mai senza che l'abbiano deciso (la riga della decisione, il voto),
      gli esiti sono misti (qualche presidio la chiude, qualcuno no); un gruppo di arditi la chiude già il primo giorno, un gruppo di
      prudenti non la chiude in tre giorni; chi ci tiene lo dice («così chiudiamo la strada») e cerca un posto che la lasci aperta.
   5. LA ROBA DI STRADA che compare dopo (il disegno la carica tardi): una cosa che ci sta sopra si sposta o si smonta.
   6. Il primo giorno: i fondatori portano roba di casa; la prima proposta arriva presto.
   Uso: node banco/crescita_node.js   (internamente: --seme N --dump [--auto] [--tratti radicale|moderato] [--arredo] [--giorni N]) */
'use strict';
const path = require('path'), { execFile } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!argv.includes('--dump')) (async () => {
  let ok = 0, no = 0; const prova = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) ok++; else no++; };
  const run = (seme, extra) => new Promise((res, rej) => execFile(process.execPath, [__filename, '--dump', '--seme', String(seme)].concat(extra || []), { maxBuffer: 1 << 26, timeout: 900000 }, (e, out) => { if (e && !out) return rej(e); const l = String(out).split('\n').filter(l => l.startsWith('{"esito"')).pop(); res(l ? JSON.parse(l) : { esito: 'niente', seme, err: String(e) }); }));
  const SEMI = [3, 4, 5, 6, 7, 8];
  const [A, B, Rad, Mod, Arr, ...Vs] = await Promise.all([run(1, ['--auto']), run(2), run(5, ['--tratti', 'radicale', '--giorni', '1']), run(5, ['--tratti', 'moderato', '--giorni', '3']), run(2, ['--arredo'])].concat(SEMI.map(s => run(s))));
  for (const R of [A, B]) console.log(`seme ${R.seme}: ${R.via}, ${R.el.length} cose: ${R.el.map(e => e[0]).join(', ')}; varco ${R.varco} m; errori ${R.errori}`);
  prova([A, B, Rad, Mod, Arr].concat(Vs).every(R => R.errori === 0), 'nessun errore nelle fasi (tutti i semi e le prove)');
  prova(A.el.length >= 4 && B.el.length >= 4, `il presidio cresce (${A.el.length} e ${B.el.length} cose)`);
  const firma = R => R.el.map(e => e[0]).sort().join(','), pianta = R => R.el.map(e => e[0] + '@' + Math.round(e[2]) + ',' + Math.round(e[3])).join(';');
  prova(firma(A) !== firma(B) || pianta(A) !== pianta(B), 'due semi: cose o piante diverse');
  prova(firma(A) !== firma(B), `due semi: le cose decise sono diverse (${firma(A)} | ${firma(B)})`);
  prova([A, B].concat(Vs).every(R => R.valida), 'nessuna compenetrazione, niente appeso (UP.valida sui pezzi messi, tutti i semi)'); for (const R of [A, B].concat(Vs)) if (!R.valida) console.log('     seme ' + R.seme + ': ' + JSON.stringify(R.sovrD) + ' appese ' + R.appese);
  prova(A.proposte > 0 && A.bocciate + A.approvate >= A.el.length - 1 - A.roba, `ne parlano: ${A.proposte} proposte, ${A.approvate} approvate, ${A.bocciate} bocciate`);
  prova(A.righe >= 10 && A.ripetute === 0 && B.ripetute === 0, `le battute variano: ${A.diverse} diverse su ${A.righe}, nessuna ripetuta a meno di 12 battute`);
  prova([A, B].concat(Vs).every(R => R.lati[0] > 0 && R.lati[1] > 0), `le cose stanno sui due lati della via (${[A, B].concat(Vs).map(R => R.lati.join('|')).join(' ')})`);
  const T = A.auto;
  prova(T && T.aperta.passa === T.aperta.attraversa, `aperta (varco ${T.aperta.varco} m): ${T.aperta.passa ? 'c\'è posto e l\'auto passa' : 'non c\'è posto e l\'auto non passa'} (attraversa ${T.aperta.attraversa}, ferme ${T.aperta.ferme})`);
  prova(T && !T.chiusa.passa && !T.chiusa.attraversa && T.chiusa.indietro > 0, `barricata (varco ${T.chiusa.varco} m): l'auto si ferma e torna indietro (ferme ${T.chiusa.ferme}, indietro ${T.chiusa.indietro})`);
  prova(T && T.riaperta.passa && T.riaperta.attraversa, `tolta la barricata (varco ${T.riaperta.varco} m): l'auto ripassa`);
  prova(T && T.finale && T.finale.passa === T.finale.attraversa, `il presidio cresciuto (varco ${T.finale && T.finale.varco} m): passa ${T.finale && T.finale.passa}, attraversa ${T.finale && T.finale.attraversa}`);
  prova(T && T.strettoia && T.strettoia.passa === T.strettoia.attraversa, `strettoia (varco ${T.strettoia && T.strettoia.varco} m): passa ${T.strettoia && T.strettoia.passa}, attraversa ${T.strettoia && T.strettoia.attraversa}`);
  // 4. il passaggio
  console.log('\nil passaggio, seme per seme (le decisioni):');
  for (const R of [B].concat(Vs)) { console.log(`  seme ${R.seme} (${R.via}): ${R.maiChiusa ? 'mai chiusa' : 'chiusa (decisa)'}; alla fine ${R.piano} m; «così chiudiamo» ${R.stats.varcoNo + R.stats.varcoAlt} volte (${R.stats.varcoAlt} con un altro posto)`); for (const d of R.dec) console.log('      ' + d); }
  const tutti = [B].concat(Vs);
  prova(tutti.every(R => R.stats.chiuseSenza === 0 && R.senzaDecisione === 0), `la strada non si chiude mai senza una decisione (chiuse senza decidere: ${tutti.map(R => R.stats.chiuseSenza + R.senzaDecisione).join(',')})`);
  prova(tutti.some(R => R.maiChiusa) && tutti.some(R => !R.maiChiusa), `esiti misti: ${tutti.filter(R => R.maiChiusa).length} presidi su ${tutti.length} non l'hanno mai chiusa, ${tutti.filter(R => !R.maiChiusa).length} l'hanno chiusa decidendolo`);
  prova(tutti.reduce((a, R) => a + R.stats.varcoNo + R.stats.varcoAlt, 0) > 0 && tutti.reduce((a, R) => a + R.stats.varcoAlt, 0) > 0, `chi tiene al passaggio lo dice e propone un altro posto (${tutti.reduce((a, R) => a + R.stats.varcoNo, 0)} no, ${tutti.reduce((a, R) => a + R.stats.varcoAlt, 0)} altri posti)`);
  prova(tutti.some(R => R.frasiVarco.length), `le parole del passaggio: «${[].concat(...tutti.map(R => R.frasiVarco)).slice(0, 3).join('» «')}»`);
  prova(!Rad.maiChiusa && Rad.primaChiusura !== null && Rad.primaChiusura < 24 && Rad.dec.some(d => /CHIUDERE/.test(d)), `gli arditi la chiudono il primo giorno (dopo ${Rad.primaChiusura} ore): ${Rad.dec.filter(d => /CHIUDERE/.test(d))[0] || '-'}`);
  prova(Mod.maiChiusa && Mod.stats.chiuseSenza === 0, `i prudenti non la chiudono in tre giorni (alla fine ${Mod.piano} m; ${Mod.stats.varcoNo + Mod.stats.varcoAlt} volte «così chiudiamo»)`);
  // 5. la roba di strada
  prova(Arr.arredo && Arr.arredo.prima && !Arr.arredo.dopo && (Arr.arredo.spostate + Arr.arredo.tolte) >= 1 && Arr.arredo.valida, `la roba di strada comparsa dopo: «${Arr.arredo && Arr.arredo.cosa}» ci stava sopra (${Arr.arredo && Arr.arredo.prima}); ${Arr.arredo && Arr.arredo.spostate} spostate, ${Arr.arredo && Arr.arredo.tolte} smontate; dopo, sopra niente; pulito ${Arr.arredo && Arr.arredo.valida}`);
  prova(Arr.arredo && Arr.arredo.fatto, `il fatto: ${Arr.arredo && Arr.arredo.fatto}`);
  prova(Arr.arredo && Arr.arredo.piano && !Arr.arredo.pianoDopo, `anche una cosa decisa e non ancora fatta si sposta (${Arr.arredo && Arr.arredo.piano})`);
  // 6. il primo giorno
  prova([A, B].concat(Vs).every(R => R.roba >= 1) && [A, B].concat(Vs).every(R => R.primaProposta !== null && R.primaProposta <= 60), `il primo giorno: roba di casa ${[A, B].concat(Vs).map(R => R.roba).join(',')} pezzi; la prima proposta dopo ${[A, B].concat(Vs).map(R => R.primaProposta).join(',')} minuti`);
  console.log(`\n${ok} ok, ${no} NO`); process.exit(no ? 1 : 0);
})();
else {
const SRC = path.resolve(__dirname, '../src') + '/'; process.chdir(SRC);
const SEME = +arg('seme', 1), AUTO = argv.includes('--auto'), TRATTI = arg('tratti', null), GIORNI = +arg('giorni', 3), ARREDO = argv.includes('--arredo');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const zitto = console.log; console.log = () => {};
const errori = []; console.warn = console.error = (...a) => { errori.push(a.map(x => String(x && x.stack || x)).join(' ').slice(0, 300)); };
require(SRC + 'seme.js')(SEME);
global.location = { search: '?commedia' };
global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
delete global.document;
const U = global.Unico = require(SRC + 'unico_porta.js');
for (const m of COMMEDIA) { const [f, g] = m.split(':'); U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
U._nomeProva = null;
global.Attore = require(SRC + 'unico_attore.js'); global.Roba = Attore.Roba;
global.UnicoCatalogo = require(SRC + 'unico_catalogo.js'); global.Lingua = require(SRC + 'unico_lingua.js');
global.Verbo = require(SRC + 'unico_verbi.js'); global.Fatto = require(SRC + 'unico_memoria.js');
global.UnicoSociali = require(SRC + 'unico_sociali.js'); global.Segni = require(SRC + 'unico_segni.js');
global.Mente = require(SRC + 'unico_mente.js'); global.Salva = require(SRC + 'unico_salva.js');
for (const [g, f] of [['UnicoParti', 'unico_parti'], ['UnicoCostruire', 'unico_costruire'], ['UnicoPartiVivo', 'unico_parti_vivo'], ['UnicoPresidio', 'unico_presidio'], ['UnicoIdee', 'unico_idee'], ['UnicoGruppi', 'unico_gruppi'], ['UnicoCultura', 'unico_cultura'], ['UnicoCorpi', 'unico_corpi'], ['UnicoCrescita', 'unico_crescita']]) {
  U._nomeProva = f; try { global[g] = require(SRC + f + '.js'); } catch (e) { errori.push(f + ': ' + e.message); } }
U._nomeProva = null; U.chiudi(); Mente.CFG.classe = 'xe';
const G = Game, UC = UnicoCostruire, UPr = UnicoPresidio, UCr = UnicoCrescita, UP = UnicoParti;
// --tratti: tutta la città fatta di arditi (folli, coraggiosi, bastian contrari) o di prudenti (vili, quieti)
if (TRATTI) { const t0 = UnicoIdee.tratti, h = s => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return (x % 1000) / 1000; };
  UnicoIdee.tratti = (st, id) => { const b = t0(st, id) || {}, j = h(id) * .15; return TRATTI === 'radicale' ? Object.assign({}, b, { follia: .8 + j, vilta: .1 + j, contrario: .7 + j, carisma: .5 + j, testardo: .5 }) : Object.assign({}, b, { follia: j * .3, vilta: .75 + j, contrario: j * .2, testardo: .2 }); }; }
const st = G.create(SEME); st.deadline = 1e12;
const passo = k => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
passo(40);
const p = st.player, V0 = UC.viaVicina(p.x, p.y, rd => rd.id !== 'corso' && rd.kind === 'citta' && rd.w >= 5.6); p.vehicle = null; p.indoor = null; p.x = V0.x + 3; p.y = V0.y + 2;
passo(20);
const L = st.npcs.filter(n => n.pop && !n.inside && Mente._.candidato(st, n)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3);
const C = UC.apri(st, { tipo: 'presidio', x: p.x, y: p.y, gruppo: L.map(n => n.id), pronto: true, R: 150 });
if (!C) { zitto(JSON.stringify({ esito: 'nessun posto', seme: SEME })); process.exit(1); }
let auto = null; if (AUTO) {
  // un'auto del traffico sulla corsia della via del presidio, 25 m prima: attraversa? (la stessa prova di banco/presidio_sim.js)
  auto = dir => {
    const li = G.MAP.lanes.findIndex(l => l.id === C.rd); if (li < 0) return { no: 'la via non ha corsie' };
    const P = G.MAP.lanes[li].pts; let cum = 0, best = [Infinity, 0]; for (let i = 1; i < P.length; i++) { cum += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); const d = Math.hypot(P[i][0] - C.x, P[i][1] - C.y); if (d < best[0]) best = [d, cum]; }
    const v = st.vehicles.find(x => x.traffic && !x.hidden && x.kind !== 'bus' && (G.VK[x.kind] || {}).len <= 5); if (!v) return { no: 'nessuna auto' };
    const s0 = best[1] - 25 * dir; v.lane = { i: li, s: s0, dir }; v.speed = 6; cum = 0;
    for (let i = 1; i < P.length; i++) { cum += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (cum >= s0) { v.x = P[i][0]; v.y = P[i][1]; v.ang = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]) + (dir < 0 ? Math.PI : 0); break; } }
    const f0 = UCr.stats.ferme, i0 = UCr.stats.indietro, g = UCr.varchi(C), wid = (G.VK[v.kind] || {}).wid || 1.8;
    let yMin = Infinity, yMax = -Infinity, dentro = false; const ya = g.ya, yb = g.yb;
    for (let i = 0; i < 20 * 70; i++) { passo(1); const l = UC.locale(C, v.x, v.y); yMin = Math.min(yMin, l.y); yMax = Math.max(yMax, l.y); if (l.y > ya + .5 && l.y < yb - .5) dentro = true; }
    return { varco: g.largo, wid, passa: g.largo >= wid + UCr.CFG.margine, attraversa: yMin < ya - 1 && yMax > yb + 1, dentro, ferme: UCr.stats.ferme - f0, indietro: UCr.stats.indietro - i0 };
  };
  const T = {}; T.aperta = auto(1);
  // la barricata da un muro all'altro, decisa e messa (tutti i pezzi)
  const r = UP.rngDi('prova|' + SEME), Lb = UCr.sbarra(r, { W: C.meta.w, seme: 'prova' }, false), pos = Lb && UCr.cerca(st, C, 'sbarramento', Lb, C.gruppo[0], r);
  if (pos) { const e = UCr.aggiungi(st, C, 'sbarramento', pos.L, C.gruppo[0], pos, []); for (let i = e[1]; i < e[1] + e[2]; i++) C.pezzi.push([i, C.gruppo[0], st.t]); UCr.battito(st, C); T.chiusa = auto(1);
    UCr.togli(st, C, e); UCr.battito(st, C); T.riaperta = auto(-1); }
  else T.chiusa = { no: 'la barricata non ci sta' };
  const Ls = UCr.sbarra(r, { W: C.meta.w, seme: 'prova2' }, true), ps = Ls && UCr.cerca(st, C, 'strettoia', Ls, C.gruppo[0], r);
  if (ps) { const e = UCr.aggiungi(st, C, 'strettoia', ps.L, C.gruppo[0], ps, []); for (let i = e[1]; i < e[1] + e[2]; i++) C.pezzi.push([i, C.gruppo[0], st.t]); UCr.battito(st, C); T.strettoia = auto(1); }
  global.__T = T;
}
// la vita dei giorni: qualche ora vera (la mente, i verbi), poi dai dati, un'ora alla volta (si guarda il passaggio)
const t0 = st.t, AUTOm = UCr.AUTO; let maiChiusa = true, senzaDecisione = 0, primaChiusura = null;
const guarda = () => { const g = UCr.largoPiano(C); if (g < AUTOm) { if (maiChiusa) primaChiusura = +((st.t - t0) / 60).toFixed(1); maiChiusa = false; if (!(UCr.CR(C).varco && UCr.CR(C).varco.k === 'chiudere')) senzaDecisione++; } };
for (let k = 0; k < 3; k++) { passo(20 * 60); guarda(); }
const ORE = TRATTI ? GIORNI * 24 - (st.t - t0) / 60 : 70;
for (let h = 0; h < ORE; h++) { UCr.avanza(st, C, 1, 0); guarda(); }
let arredo = null;
if (ARREDO) {
  // una cosa fatta: la roba di strada (un paletto) compare sotto un suo pezzo; poi una cosa decisa e non ancora fatta
  const cr = UCr.CR(C), sopra = () => cr.el.filter(e => UCr.sopraArredo(st, C, C.piano.slice(e[1], e[1] + e[2]))).map(e => e[0]);
  const s0 = Object.assign({}, UCr.stats), OB = [];
  UP.ostacoli = (x, y, r) => OB.filter(b => Math.abs(b.x - x) < r + b.hx && Math.abs(b.y - y) < r + b.hy);
  const e = cr.el.find(e => e[8] && !UCr.EL[e[0]].traverso && !UCr.EL[e[0]].roba && C.piano.slice(e[1], e[1] + e[2]).some(q => !UP.PARTI[q[0]].decoro));
  if (e) {
    const q = C.piano.slice(e[1], e[1] + e[2]).find(q => !UP.PARTI[q[0]].decoro), w = UP.aMondo(C, q[1], q[2]); OB.push({ x: w.x, y: w.y, hx: .12, hy: .12, z0: 0, z1: .9, tag: 'paletto' });
    const prima = sopra().join(','); UCr.battito(st, C); const dopo = sopra().join(',');
    const pz = C.pezzi.map(([i]) => C.piano[i]), F = Fatto.tutti(st).filter(f => f.v === 'presidio_spostata').pop();
    arredo = { cosa: e[0], prima, dopo, spostate: UCr.stats.spostate - s0.spostate, tolte: UCr.stats.tolte - s0.tolte, valida: UP.valida(pz).ok, fatto: F ? (F.d || (F.x && F.x.d)) : null };
    // decisa e non fatta: il paletto sotto il primo pezzo della cosa nuova
    const n0 = cr.el.length; for (let k = 0; k < 12 && cr.el.length === n0; k++) { if (C.cr) C.cr.prop = null; const ids = Object.keys(C.vive || {}); UCr.proponi(st, C, { forza: true, subito: true, chi: ids[k % Math.max(1, ids.length)] }); }
    const e2 = cr.el.length > n0 ? cr.el[cr.el.length - 1] : null;
    if (e2 && !e2[8]) { const q2 = C.piano.slice(e2[1], e2[1] + e2[2]).find(q => !UP.PARTI[q[0]].decoro); if (q2) { const w2 = UP.aMondo(C, q2[1], q2[2]); OB.push({ x: w2.x, y: w2.y, hx: .12, hy: .12, z0: 0, z1: .9, tag: 'fioriera' }); arredo.piano = sopra().join(','); UCr.battito(st, C); arredo.pianoDopo = sopra().join(','); } }
  }
  UP.ostacoli = null;
}
const pez = C.pezzi.map(([i]) => C.piano[i]), Vv = UP.valida(pez);
const F = Fatto.tutti(st).filter(f => f.x && f.x.cantiere === C.id);
const prop = F.filter(f => f.v === 'presidio_proposta').length, dec = F.filter(f => f.v === 'presidio_deciso');
const R = UCr.riassunto(C);
// le battute: tutte quelle scritte nelle proposte (si rifanno: la memoria delle frasi del presidio)
const righe = [].concat(...UCr.diario);
const fp = F.find(f => f.v === 'presidio_proposta'), roba = UCr.CR(C).el.filter(e => e[0] === 'roba').length, lati = [R.el.filter(e => e[0] !== 'roba' && e[2] > .3).length, R.el.filter(e => e[0] !== 'roba' && e[2] < -.3).length];
const frasiVarco = [...new Set(righe.filter(x => /chiudiamo la strada|furgone del pane|mio furgone|le macchine (non )?passano|la strada resta aperta|non chiudiamo|chiudiamola|qui non ci passa più/i.test(x)))].slice(0, 4);
const sovrD = Vv.sovr.slice(0, 3).map(([a, b, q]) => [pez[a], pez[b], q]);
const out = { esito: 'ok', seme: SEME, via: C.via, el: R.el, sovrD, roba, lati, primaProposta: UCr.CR(C).prima != null ? Math.round(UCr.CR(C).prima - UCr.CR(C).nato) : null, maiChiusa, senzaDecisione, primaChiusura, piano: UCr.largoPiano(C), dec: UCr.decisioni.slice(), frasiVarco, arredo, varco: R.varco, valida: Vv.ok, sovr: Vv.sovr.length, appese: Vv.appese.length, proposte: prop, approvate: dec.filter(f => f.x.esito).length, bocciate: dec.filter(f => !f.x.esito).length, righe: righe.length, diverse: new Set(righe).size, ripetute: righe.filter((x, i) => righe.slice(Math.max(0, i - 12), i).includes(x)).length, rip: righe.filter((x, i) => righe.slice(Math.max(0, i - 12), i).includes(x)), errori: errori.length + (U.errTot || 0), err: errori.slice(0, 3), stats: UCr.stats, motivi: UCr.motivi };
if (AUTO) { const T = global.__T; T.finale = auto(1); out.auto = T; out.errori = errori.length + (U.errTot || 0); }
zitto(JSON.stringify(out));
}
