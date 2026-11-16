#!/usr/bin/env node
/* Porto Vecchio — banco/crescita_node.js: le prove del presidio che cresce (src/unico_crescita.js, dietro ?commedia).
   1. Due semi diversi danno presidi diversi: le cose decise (il tipo e quante) e la pianta (dove stanno) non sono le stesse.
   2. Le auto si fermano SE E SOLO SE quello che è stato costruito non lascia un passaggio largo abbastanza: un'auto del traffico messa
      sulla via del presidio passa (piano, nel varco) finché c'è posto; costruita una barricata da un muro all'altro, si ferma e torna
      indietro; tolta la barricata, ripassa.
   3. Le regole fisiche: nessuna compenetrazione (UP.valida), niente pezzi appesi.
   Uso: node banco/crescita_node.js   (internamente: --seme N --dump) */
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!argv.includes('--dump')) {
  let ok = 0, no = 0; const prova = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) ok++; else no++; };
  const run = (seme, extra) => JSON.parse(execFileSync(process.execPath, [__filename, '--dump', '--seme', String(seme)].concat(extra || []), { maxBuffer: 1 << 26, timeout: 600000 }).toString().split('\n').filter(l => l.startsWith('{"esito"')).pop());
  const A = run(1, ['--auto']), B = run(2);
  for (const R of [A, B]) console.log(`seme ${R.seme}: ${R.via}, ${R.el.length} cose: ${R.el.map(e => e[0]).join(', ')}; varco ${R.varco} m; errori ${R.errori}`);
  prova(A.errori === 0 && B.errori === 0, 'nessun errore nelle fasi');
  prova(A.el.length >= 4 && B.el.length >= 4, `il presidio cresce (${A.el.length} e ${B.el.length} cose)`);
  const firma = R => R.el.map(e => e[0]).sort().join(','), pianta = R => R.el.map(e => e[0] + '@' + Math.round(e[2]) + ',' + Math.round(e[3])).join(';');
  prova(firma(A) !== firma(B) || pianta(A) !== pianta(B), 'due semi: cose o piante diverse');
  prova(firma(A) !== firma(B), `due semi: le cose decise sono diverse (${firma(A)} | ${firma(B)})`);
  prova(A.valida && B.valida, 'nessuna compenetrazione, niente appeso (UP.valida sui pezzi messi)');
  prova(A.proposte > 0 && A.bocciate + A.approvate >= A.el.length - 1, `ne parlano: ${A.proposte} proposte, ${A.approvate} approvate, ${A.bocciate} bocciate`);
  prova(A.righe >= 10 && A.ripetute === 0 && B.ripetute === 0, `le battute variano: ${A.diverse} diverse su ${A.righe}, nessuna ripetuta a meno di 12 battute`);
  const T = A.auto;
  prova(T && T.aperta.passa === T.aperta.attraversa, `aperta (varco ${T.aperta.varco} m): ${T.aperta.passa ? 'c\'è posto e l\'auto passa' : 'non c\'è posto e l\'auto non passa'} (attraversa ${T.aperta.attraversa}, ferme ${T.aperta.ferme})`);
  prova(T && !T.chiusa.passa && !T.chiusa.attraversa && T.chiusa.indietro > 0, `barricata (varco ${T.chiusa.varco} m): l'auto si ferma e torna indietro (ferme ${T.chiusa.ferme}, indietro ${T.chiusa.indietro})`);
  prova(T && T.riaperta.passa && T.riaperta.attraversa, `tolta la barricata (varco ${T.riaperta.varco} m): l'auto ripassa`);
  prova(T && T.finale && T.finale.passa === T.finale.attraversa, `il presidio cresciuto (varco ${T.finale && T.finale.varco} m): passa ${T.finale && T.finale.passa}, attraversa ${T.finale && T.finale.attraversa}`);
  prova(T && T.strettoia && T.strettoia.passa === T.strettoia.attraversa, `strettoia (varco ${T.strettoia && T.strettoia.varco} m): passa ${T.strettoia && T.strettoia.passa}, attraversa ${T.strettoia && T.strettoia.attraversa}`);
  console.log(`\n${ok} ok, ${no} NO`); process.exit(no ? 1 : 0);
}
const SRC = path.resolve(__dirname, '../src') + '/'; process.chdir(SRC);
const SEME = +arg('seme', 1), AUTO = argv.includes('--auto');
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
// la vita dei giorni: qualche ora vera (la mente, i verbi), poi dai dati
passo(20 * 60 * 3);
UCr.avanza(st, C, 70, 0);
const pez = C.pezzi.map(([i]) => C.piano[i]), Vv = UP.valida(pez);
const F = Fatto.tutti(st).filter(f => f.x && f.x.cantiere === C.id);
const prop = F.filter(f => f.v === 'presidio_proposta').length, dec = F.filter(f => f.v === 'presidio_deciso');
const R = UCr.riassunto(C);
// le battute: tutte quelle scritte nelle proposte (si rifanno: la memoria delle frasi del presidio)
const righe = [].concat(...UCr.diario);
const out = { esito: 'ok', seme: SEME, via: C.via, el: R.el, varco: R.varco, valida: Vv.ok, sovr: Vv.sovr.length, appese: Vv.appese.length, proposte: prop, approvate: dec.filter(f => f.x.esito).length, bocciate: dec.filter(f => !f.x.esito).length, righe: righe.length, diverse: new Set(righe).size, ripetute: righe.filter((x, i) => righe.slice(Math.max(0, i - 12), i).includes(x)).length, rip: righe.filter((x, i) => righe.slice(Math.max(0, i - 12), i).includes(x)), errori: errori.length + (U.errTot || 0), err: errori.slice(0, 3), stats: UCr.stats, motivi: UCr.motivi };
if (AUTO) { const T = global.__T; T.finale = auto(1); out.auto = T; out.errori = errori.length + (U.errTot || 0); }
zitto(JSON.stringify(out));
