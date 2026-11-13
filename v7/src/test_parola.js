// [commedia] Prove di parola e azione (commedia/PAROLA_AZIONE.md §6), mappa nuova: modo R (ripiego a parole chiave) e modo F
// (IA finta da test_parola_ia.json, scritta apposta anche sbagliata: nessuna chiamata vera), la chat della banda, i mandati, la rapina.
// node test_parola.js [seme]  — esce con 1 se un caso fallisce. La regola per tutti: mai «sì» e poi ✗.
'use strict';
const S = __dirname + '/'; process.chdir(S);
// [apk_finale] il caso col seme della prova (come src/seme.js nel gioco): senza, Math.random cambiava gli esiti da un giro all'altro (1-6 casi
// «non passano» a caso: la paga accettata o no, chi è libero, i turni)
{ let a = (+(process.argv[2] || 1) * 2654435761) >>> 0 || 1; Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
global.PV_PAROLA = true;
const _log = console.log; console.log = (...a) => { if (!/^\[campagna\]/.test(String(a[0]))) _log(...a); };
global.World = require(S + 'world_cittanuova.js'); global.Interior = require(S + 'interiors.js');
global.Game = require(S + 'game.js'); global.Posti = require(S + 'posti.js'); global.Risacca = require(S + 'risacca.js'); global.Popolo = require(S + 'popolo.js'); global.Azioni = require(S + 'azioni.js'); global.Economia = require(S + 'economia.js');
['fazioni', 'soldi'].forEach(m => require(S + m + '.js')); global.Oggetti = require(S + 'oggetti.js'); ['protagonista', 'mestieri'].forEach(m => require(S + m + '.js'));
global.Scambi = require(S + 'scambi.js'); global.Convivenza = require(S + 'convivenza.js'); global.Imprese = require(S + 'imprese.js');
global.Commissioni = require(S + 'commissioni.js'); global.Trame = require(S + 'trame.js');
const Parola = require(S + 'parola.js');
const G = Game, RS = Risacca, PL = G.PLACES;
const seed = +(process.argv[2] || 1);
const T0 = Date.now();

// ---------------- preparazione (§6) ----------------
const st = G.create(seed);
for (let i = 0; i < 30 * 60 * 2; i++) G.step(st, 1 / 30, {});
st.player.money = 30; st.player.inv = { pane: 1 };
st.player.x = PL.molo.x; st.player.y = PL.molo.y;   // il giocatore sta al molo, lontano dalla piazza
// un punto calpestabile vicino a (x, y), a circa r metri
function vicino(x, y, r) { for (let k = 0; k < 200; k++) { const a = k * 2.4, rr = r + (k % 5); const qx = x + Math.cos(a) * rr, qy = y + Math.sin(a) * rr; if (G.walkM(qx, qy)) return { x: qx, y: qy }; } return { x, y }; }
function metti(n, x, y, r) { const q = vicino(x, y, r); n.x = q.x; n.y = q.y; n.path = []; n.inside = false; n.goal = null; }
const cono = G.byId(st, 'cono'), divisa = G.byId(st, 'divisa'), gino = G.byId(st, 'gino'), lucia = G.byId(st, 'lucia');
const teresa = st.npcs.find(n => n.pop && !n.pop.cast && !n.cop && !n.faction && /Teresa/.test(n.name)) || st.npcs.find(n => n.pop && !n.pop.cast && !n.cop && !n.faction);
[cono, divisa].forEach(n => { RS.initNpc(st, n); RS.join(st, n); n.ris.auto = false; });
RS.discover(st, 'sp_lanternini', 'prova'); const base = RS.occupySpace(st, 'sp_lanternini'); base.stock.gesso = 3; st.ris.cassa = 40;
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ore = t => G.clockStr(t);
function corri(mins, dt) { const t1 = st.t + mins; let k = 0; while (st.t < t1 && k++ < 2e6) G.step(st, dt || 1 / 15, {}); }
function fino(cond, maxMins, dt) { const t0 = st.t, t1 = st.t + maxMins; let k = 0; while (!cond() && st.t < t1 && k++ < 2e6) G.step(st, dt || 1 / 15, {}); return Math.round(st.t - t0); }
const righe = [], viol = [];
function parla(n, testo) {
  const r = Parola.rispondi(st, n, testo);
  const prom = Parola.promette(r.say), ko = r.outcomes.some(o => o.ok === false);
  if (r.esito !== 'accetta' && prom) viol.push(`${n.first}: «${testo}» → «${r.say}» (${r.esito})`);
  if (r.esito === 'accetta' && ko && r.outcomes[0] && r.outcomes[0].ok === false) viol.push(`${n.first}: «${testo}» → sì e poi ✗`);
  _log(`  > ${testo}\n    ${RS.battle(n) || n.first}: «${r.say}»  [${r.esito}${r.motivo ? ':' + r.motivo.tipo : ''}]${r.outcomes.length ? '  ' + r.outcomes.map(o => (o.ok ? '✓ ' : o.ok === false ? '✗ ' : '· ') + o.msg).join(' | ') : ''}`);
  return r;
}
const casi = [];
function caso(id, chi, frase, fn) {
  _log(`\n[${id}] ${chi} · ${frase} · ${G.dayName(st.t)} ${ore(st.t)}`);
  let res; try { res = fn(); } catch (e) { res = { ok: false, nota: 'ERRORE ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' / ') }; }
  casi.push(Object.assign({ id, chi, frase }, res));
  _log(`    ${res.ok ? '✔' : '✗'} ${res.nota || ''}`);
}
const promOf = r => r && r.promessa;

// ---------------- i casi ----------------
// 3 (si fissa adesso, si controlla dopo le 18:50)
let p3 = null, bond3 = 0;
caso('3a', 'Gino', '«vediamoci alle 18 in piazza»', () => {
  const r = parla(gino, 'vediamoci alle 18 in piazza');
  p3 = r.verifica && r.verifica.res && r.verifica.res.sua; bond3 = gino.ris.bond;
  return { ok: r.esito === 'accetta' && !!(gino.pop.appt && gino.pop.appt.with === 'player') && !!p3, nota: `appuntamento ${gino.pop.appt ? ore(gino.pop.appt.t) + ' a ' + gino.pop.appt.label : 'nessuno'}; promessa del giocatore ${p3 ? p3.stato : '-'}` };
});

caso(1, 'Cono', '«seguimi»', () => {
  metti(cono, st.player.x, st.player.y, 6);
  const r = parla(cono, 'seguimi'); const p = promOf(r);
  const m = fino(() => d(cono, st.player) < 3, 6);
  const ok = r.esito === 'accetta' && p && p.stato === 'in_corso' && d(cono, st.player) < 3;
  const nota = `promessa ${p ? p.stato : '-'}; dopo ${m} min Cono a ${d(cono, st.player).toFixed(1)} m`;
  parla(cono, 'lascia stare');
  return { ok: ok && p.stato === 'annullata', nota: nota + `; «lascia stare» → ${p ? p.stato : '-'}` };
});

caso(4, 'Cono', '«vai al porto» / «vai alla calata del porto»', () => {
  const r = parla(cono, 'vai al porto');
  const C = Parola.capisci(st, cono, 'vai alla calata del porto');
  return { ok: r.esito === 'chiede' && r.motivo.tipo === 'ambiguo' && !cono.ris.task && C.intento.args.luogo === 'calata',
    nota: `«vai al porto» → chiede (${(r.motivo.dati.nomi || []).join(' / ')}), nessun compito; «vai alla calata del porto» → luogo=${C.intento.args.luogo} (nome intero prima di «Osteria del Porto», §2.1)` };
});

caso(5, 'Cono', '«vai alla calata»', () => {
  const r = parla(cono, 'vai alla calata'); const p = promOf(r);
  const m = fino(() => d(cono, PL.calata) < 2, 150);
  const arr = p && p.passi.some(x => x.k === 'arrivo');
  const ok = r.esito === 'accetta' && r.intento.args.luogo === 'calata' && d(cono, PL.calata) < 2;
  const nota = `luogo=${r.intento.args.luogo}; arrivato in ${m} min (${d(cono, PL.calata).toFixed(1)} m); aggiornamento arrivo: ${arr ? '«' + p.passi.find(x => x.k === 'arrivo').testo + '»' : 'no'}`;
  parla(cono, 'lascia stare');
  return { ok, nota };
});

let p6 = null;
caso(6, 'Cono', '«dipingi un murale sulla calata»', () => {
  const r = parla(cono, 'dipingi un murale sulla calata');
  const noTask = !cono.ris.task;
  const rp = Parola.prometti(st, cono); _log(`    [Prometto] → «${rp.say}» ${rp.outcomes.map(o => o.msg).join(' ')}`);
  p6 = rp.promessa;
  return { ok: r.esito === 'chiede' && r.contro && r.contro.id === 'vernice' && r.contro.quanto === 2 && !Parola.promette(r.say) && noTask && p6 && p6.chi === 'player' && p6.stato === 'attesa',
    nota: `chiede ${r.contro ? r.contro.quanto + ' ' + r.contro.id : '-'}; nessun compito: ${noTask}; promessa del giocatore: ${p6 ? p6.stato + ' (' + p6.desc + ')' : '-'}` };
});

caso(7, 'Cono', 'come 6, dopo 2 vernice in base', () => {
  RS.putBase(st, base, 'vernice', 2); corri(1);
  const mie = p6 ? p6.stato : '-';
  const m0 = st.ris.murals.length;
  const r = parla(cono, 'dipingi un murale sulla calata'); const p = promOf(r);
  const m = fino(() => p && p.stato !== 'in_corso' && p.stato !== 'accettata', 150);
  const arr = p && p.passi.find(x => x.k === 'arrivo');
  return { ok: r.esito === 'accetta' && st.ris.murals.length === m0 + 1 && p.stato === 'fatta' && mie === 'fatta',
    nota: `promessa del giocatore (vernice) ${mie}; murales ${m0}→${st.ris.murals.length} in ${m} min; promessa ${p ? p.stato : '-'}; arrivo: ${arr ? '«' + arr.testo + '»' : 'già sul posto'}; rapporto: «${p && p.passi.length ? p.passi[p.passi.length - 1].testo : '-'}»` };
});

caso(16, 'Cono', '«ti do 50» (ne hai 30)', () => {
  const m0 = st.player.money; const r = parla(cono, 'ti do 50');
  return { ok: r.esito === 'rifiuta' && r.motivo.tipo === 'manca_player' && st.player.money === m0, nota: `soldi ${m0}→${st.player.money}` };
});
caso(17, 'Cono', '«monta la stamperia»', () => {
  const r = parla(cono, 'monta la stamperia');
  const n1 = r.outcomes.filter(o => o.msg).length;
  return { ok: r.esito === 'rifiuta' && r.motivo.tipo === 'impossibile' && n1 === 1 && !cono.ris.task, nota: `un solo esito (${n1}): ${r.outcomes.map(o => o.msg).join(' | ')}` };
});
caso(20, 'Cono', '«rubami una vespa» (R)', () => {
  const r = parla(cono, 'rubami una vespa');
  return { ok: r.esito === 'rifiuta' && r.motivo.tipo === 'non_so' && !cono.ris.task, nota: 'nessun compito' };
});

caso('18R', 'Garza (membro)', '«sabota la campagnola» (R e IA finta)', () => {
  RS.initNpc(st, lucia); RS.join(st, lucia); lucia.ris.auto = false;
  const r = parla(lucia, 'sabota la campagnola');
  const g0 = Parola._.S(st).stats.guardia;
  const out = RS.applyReply(st, lucia, 'sabota la campagnola', { risposta: 'Va bene, stanotte ci penso io.', azioni: [{ verbo: 'sabota', obiettivo: 'campagnola' }] }, null);
  const g1 = Parola._.S(st).stats.guardia;
  return { ok: r.esito === 'rifiuta' && r.motivo.tipo === 'never' && !Parola.promette(out.say) && g1 === g0 + 1, nota: `R: rifiuta{${r.motivo.tipo}}; IA finta «Va bene, stanotte ci penso io.» → «${out.say}», guardia +${g1 - g0}` };
});

caso(25, '— (parole da sole)', '«Offro io» a secco, «Tieni, è per te» senza niente, «chiamo la Guardia» senza telefonata', () => {
  const A = st.npcs.filter(n => n.pop && !n.dead && !n.cop && !(n.ris && n.ris.member) && n !== teresa && !n.pop.emer);
  const a = A[0], b = A[1];
  a.pop.near = true; a.inside = false; a.pop.money = 0; a.bark = null; a.pop.inv = {};
  Azioni.social(st, a, b, 'offri');
  const said1 = a.bark && a.bark.text;
  a.bark = null; Azioni.social(st, a, b, 'regala'); const said2 = a.bark && a.bark.text;
  // la telefonata impedita: c'è già un piano più urgente
  const c = A[2]; c.pop.near = true; c.inside = false; c.bark = null; const em0 = c.pop.emer; c.pop.emer = { kind: 'prova', label: 'prova', steps: [], i: 0, prio: 2.5 };
  G.say(st, c, 'Vado al telefono, chiamo la Guardia!'); const said3 = c.bark && c.bark.text; c.pop.emer = em0;
  // e la stessa frase quando si può: esce
  c.bark = null; G.say(st, c, 'Vado al telefono, chiamo la Guardia!'); const said4 = c.bark && c.bark.text;
  const offri = ['Offro io, dai.', 'Questa la pago io, zio.', 'Dai, ti offro una birra.', 'Ti offro qualcosa, dai.', 'Questo lo pago io.', 'Offro io. Coi soldi che mi devi.'];
  const ok = !offri.includes(said1) && !said2 && said3 !== 'Vado al telefono, chiamo la Guardia!' && said4 === 'Vado al telefono, chiamo la Guardia!';
  return { ok, nota: `offri a 0 lire → «${said1}»; regala senza roba → ${said2 ? '«' + said2 + '»' : 'zitto'}; chiama impedito → «${said3}»; chiama possibile → «${said4}»` };
});

// Teresa: dopo il lavoro
_log(`\n… si aspetta che ${teresa.first} finisca di lavorare`);
fino(() => !(teresa.pop.cur && teresa.pop.cur.act === 'lavoro') && st.t % 1440 > 16 * 60, 600, 1 / 10);
metti(teresa, st.player.x, st.player.y, 4);   // ce l'hai davanti

let p13 = null;
caso(13, teresa.first + ' (A)', '«unisciti a noi» (prima volta)', () => {
  const r = parla(teresa, 'unisciti a noi');
  return { ok: r.esito === 'contratta' && r.motivo.tipo === 'prova' && !teresa.ris.member, nota: `manca: ${(r.verifica.dati && r.verifica.dati.manca || []).join(', ')}; prova: ${r.contro && r.contro.prova ? r.contro.prova.label : '-'}; membro: ${teresa.ris.member}` };
});
caso('14a', teresa.first + ' (A)', '[Prometto] la prova, poi la mantieni', () => {
  const rp = Parola.prometti(st, teresa); p13 = rp.promessa;
  const pr = p13 && p13.condizione && p13.condizione.ids ? p13.condizione.ids[0] : 'legna';
  st.player.inv[pr] = (st.player.inv[pr] || 0) + 2;
  const nm = Oggetti.CAT[pr] ? Oggetti.CAT[pr].nome.split(' ')[0] : pr;
  const r = parla(teresa, `ti do ${pr === 'legna' ? 'la legna' : nm}`);
  return { ok: !!p13 && p13.stato === 'fatta', nota: `promessa del giocatore «${p13 ? p13.desc : '-'}» → ${p13 ? p13.stato : '-'} (${r.esito})` };
});


caso(9, teresa.first + ' (A)', '«dammi una sigaretta»', () => {
  const inv0 = JSON.stringify(st.player.inv), had = Scambi.has(teresa, 'sigarette');
  const r = parla(teresa, 'dammi una sigaretta');
  const inv1 = JSON.stringify(st.player.inv);
  const ok = had ? (r.esito === 'accetta' ? (st.player.inv.sigarette || 0) > 0 : inv0 === inv1) : (r.esito === 'rifiuta' && r.motivo.tipo === 'manca' && inv0 === inv1);
  return { ok, nota: `ne ha: ${had ? 'sì' : 'no'}; zaino ${inv0} → ${inv1}` };
});

caso(8, teresa.first + ' (A)', '«portami del pane»', () => {
  const pane0 = st.player.inv.pane || 0;
  const r = parla(teresa, 'portami del pane');
  let r2 = null, p = promOf(r);
  if (r.esito === 'contratta' && r.contro && r.contro.tipo === 'soldi') { r2 = parla(teresa, `ti do ${r.contro.quanto}`); p = promOf(r2); }
  const m = fino(() => !p || (p.stato !== 'in_corso' && p.stato !== 'accettata'), 90);
  const pane1 = st.player.inv.pane || 0;
  return { ok: (r.esito === 'contratta' || r.esito === 'accetta') && p && p.stato === 'fatta' && pane1 === pane0 + 1, nota: `${r.esito}${r.contro ? '{' + r.contro.tipo + ':' + r.contro.quanto + '}' : ''} → ${r2 ? r2.esito : '-'}; pane nello zaino ${pane0}→${pane1} dopo ${m} min; promessa ${p ? p.stato : '-'}` };
});

caso(2, teresa.first + ' (A)', '«vieni con me»', () => {
  const r = parla(teresa, 'vieni con me'); const p = promOf(r);
  corri(62);
  return { ok: r.esito === 'accetta' && !teresa.pop.with && p && p.stato === 'fatta', nota: `P.with ${teresa.pop.with ? 'ancora' : 'nullo'}; promessa ${p ? p.stato : '-'}` };
});

caso('19R', teresa.first + ' (A)', '«aspettami qui» (R e IA finta)', () => {
  const r = parla(teresa, 'aspettami qui'); const p = promOf(r);
  if (p) fino(() => p.stato !== 'in_corso', 45);
  const g0 = Parola._.S(st).stats.guardia;
  const out = RS.applyReply(st, teresa, 'aspettami qui', { risposta: 'Sì, ti aspetto qui.', azioni: [] }, null);
  const g1 = Parola._.S(st).stats.guardia;
  const coer = r.esito === 'accetta' ? (p && p.stato === 'fatta') : !p;
  return { ok: coer && !Parola.promette(out.say) && g1 === g0 + 1, nota: `R: ${r.esito}${p ? ', promessa ' + p.stato : ', nessuna promessa'}; IA finta «Sì, ti aspetto qui.» senza azioni → «${out.say}», guardia +${g1 - g0}` };
});


caso(10, 'Cono', '«tieni d\'occhio Gino»', () => {
  const r = parla(cono, 'tieni d\'occhio Gino'); const p = promOf(r);
  let checks = 0, inRange = 0, reached = false;
  const t1 = st.t + 200; let lastC = st.t;
  while (st.t < t1 && p && p.stato === 'in_corso') { G.step(st, 1 / 15, {}); if (st.t - lastC >= 2) { lastC = st.t; const dd = d(cono, gino); if (!reached && dd < 14) reached = true; if (reached) { checks++; if (dd >= 4 && dd <= 14) inRange++; } } }
  fino(() => p.stato !== 'in_corso', 20);
  const frac = checks ? inRange / checks : 0;
  return { ok: r.esito === 'accetta' && r.intento.verbo === 'pedina' && frac >= .8 && p.stato === 'fatta',
    nota: `verbo ${r.intento.verbo}; a 4-14 m da Gino in ${inRange}/${checks} controlli (${Math.round(frac * 100)}%); promessa ${p ? p.stato : '-'}; rapporto «${p && p.esito_msg}»` };
});

caso(11, 'Cono', '«tieni d\'occhio la caserma per 2 ore»', () => {
  const r = parla(cono, 'tieni d\'occhio la caserma per 2 ore'); const p = promOf(r);
  const m = fino(() => !p || p.stato !== 'in_corso', 480);
  return { ok: r.esito === 'accetta' && r.intento.verbo === 'sorveglia' && r.intento.args.luogo === 'commissariato' && r.intento.args.ore === 2 && p.stato === 'fatta', nota: `luogo ${r.intento.args.luogo}, ${r.intento.args.ore} ore; promessa ${p ? p.stato : '-'} dopo ${m} min` };
});

caso(21, 'Cono', '«scrivi l\'onda in piazza» (R)', () => {
  const o0 = st.ris.goals.onde; const r = parla(cono, 'scrivi l\'onda in piazza'); const p = promOf(r);
  const m = fino(() => st.ris.goals.onde > o0 && p.stato !== 'in_corso', 240);
  return { ok: r.esito === 'accetta' && st.ris.goals.onde === o0 + 1 && p.stato === 'fatta', nota: `onde ${o0}→${st.ris.goals.onde} in ${m} min; promessa ${p ? p.stato : '-'}` };
});

caso(12, 'Divisa', '«avvisami se arrivano i Grigi in piazza»', () => {
  metti(divisa, PL.piazza.x, PL.piazza.y, 4);   // già vicino alla piazza (la prova misura il palo, non il viaggio dalla pineta)
  const r = parla(divisa, 'avvisami se arrivano i Grigi in piazza'); const p = promOf(r);
  corri(3);
  const pre = p && p.stato;
  const cop = st.npcs.find(k => k.cop && !k.dead); cop.inside = false; cop.x = PL.piazza.x + 2; cop.y = PL.piazza.y - 2; cop.path = []; cop.wait = 10;
  const tA = st.t; const m = fino(() => p.stato !== 'in_corso', 6, 1 / 30);
  const msg = (st.ris.chats.divisa || []).slice().reverse().find(x => x.sys && /Grigi/.test(x.text));
  return { ok: r.esito === 'accetta' && pre === 'in_corso' && p.stato === 'fatta' && m <= 2 && !!msg, nota: `prima del Grigio: ${pre}; messaggio dopo ${Math.round(st.t - tA)} min: «${msg ? msg.text : '-'}»; promessa ${p ? p.stato : '-'}` };
});

// 15: un'impresa che cerca gente
let p15 = null, E15 = null;
caso('15a', 'chi organizza un\'impresa', '«vengo anch\'io»', () => {
  for (let i = 0; i < 400 && !Imprese.list(st).some(E => E.status === 'cerca' && E.t > st.t + 90 && G.byId(st, E.leader).pop); i++) Imprese.propose(st);
  E15 = Imprese.list(st).find(E => E.status === 'cerca' && E.t > st.t + 90 && G.byId(st, E.leader).pop);
  if (!E15) return { ok: false, nota: 'nessuna impresa nata' };
  const L = G.byId(st, E15.leader);
  const r = parla(L, 'vengo anch\'io'); p15 = r.verifica && r.verifica.res && r.verifica.res.sua;
  return { ok: r.esito === 'accetta' && E15.members.includes('player') && !!p15, nota: `${E15.label}, ${G.dayName(E15.t)} ${ore(E15.t)} a ${E15.tgt.label}; membri con te: ${E15.members.includes('player')}` };
});

// la sera: l'appuntamento con Gino è passato e il giocatore non c'era
caso('3b', 'Gino', 'l\'appuntamento delle 18, senza di te', () => {
  if (!p3) return { ok: false, nota: 'nessun appuntamento' };
  fino(() => p3.stato !== 'accettata' && p3.stato !== 'in_corso', 1440, 1 / 10);
  const pn = Parola.promesse(st).find(p => p.chi === 'gino' && p.link && p.link.tipo === 'appt');
  const db = gino.ris.bond - bond3;
  return { ok: p3.stato === 'rotta' && Math.abs(db + .08) < .031, nota: `alle ${ore(st.t)}: la tua promessa ${p3.stato}; quella di Gino ${pn ? pn.stato : '-'}; fiducia di Gino ${db >= 0 ? '+' : ''}${db.toFixed(2)}` };
});

caso(14, teresa.first + ' (A)', '«unisciti a noi», il giorno dopo, con la prova mantenuta', () => {
  fino(() => Math.floor(st.t / 1440) > Math.floor((p13 ? p13.fine || st.t : st.t) / 1440) && st.t % 1440 > 17 * 60, 2 * 1440, 1 / 10);
  metti(teresa, st.player.x, st.player.y, 4);
  const r = parla(teresa, 'unisciti a noi');
  const coer = r.esito === 'accetta' ? teresa.ris.member : !teresa.ris.member;
  return { ok: coer && r.esito !== 'niente', nota: `${r.esito}${r.motivo ? '{' + r.motivo.tipo + ': ' + r.motivo.testo + '}' : ''}; membro: ${teresa.ris.member}` };
});

caso('15b', 'chi organizza un\'impresa', 'all\'ora dell\'impresa, senza di te', () => {
  if (!p15) return { ok: false, nota: 'nessuna impresa' };
  fino(() => p15.stato !== 'accettata', 2 * 1440, 1 / 10);
  const L = G.byId(st, E15.leader);
  const noted = (L.pop.diary || []).some(e => /aveva detto che veniva/.test(e.text || ''));
  const ok = E15.status === 'annullata' ? p15.stato === 'annullata' : p15.stato === 'rotta';
  return { ok, nota: `impresa ${E15.status}; la tua promessa ${p15.stato}${E15.status !== 'annullata' ? `; nel diario «aveva detto che veniva»: ${noted}` : ' (saltata: niente colpa)'}` };
});


// ================= modo F: l'IA finta (test_parola_ia.json), anche sbagliata. Nessuna chiamata vera =================
const IA = JSON.parse(require('fs').readFileSync(S + 'test_parola_ia.json', 'utf8'));
function parlaIA(n, testo, key) {
  const req = Parola.richiestaDialogo(st, n, testo);
  const fake = JSON.parse(JSON.stringify(IA[key]));
  // la stessa strada del gioco: risacca_ui → RS.applyReply con la risposta della Mente (versione parola1) in raw
  const r = RS.applyReply(st, n, testo, { risposta: '', umore: '', azioni: [], memoria: '' }, JSON.stringify(Object.assign({ versione: 'parola1' }, fake)));
  const prom = Parola.promette(r.say);
  if (r.esito !== 'accetta' && prom) viol.push(`${n.first} (F): «${testo}» → «${r.say}» (${r.esito})`);
  _log(`  > ${testo}   [IA finta ${key}]\n    ${RS.battle(n) || n.first}: «${r.say}»  [${r.esito}${r.motivo ? ':' + r.motivo.tipo : ''}]${r.outcomes.length ? '  ' + r.outcomes.map(o => (o.ok ? '✓ ' : o.ok === false ? '✗ ' : '· ') + o.msg).join(' | ') : ''}`);
  return Object.assign(r, { req });
}
const G0 = () => Parola._.S(st).stats.guardia;
caso('18F', 'Garza', '«sabota la campagnola» (F: «Va bene, stanotte» nel rifiuto)', () => {
  const g0 = G0(); const r = parlaIA(lucia, 'sabota la campagnola', '18');
  const shape = r.req.versione === 'parola1' && Array.isArray(r.req.verbi) && r.req.verbi.some(v => v.verbo === 'porta_a') && r.req.volonta && r.req.fattibilita && Array.isArray(r.req.storia) && r.req.luoghi.split(';').length >= 40 && /=/.test(r.req.persone);
  return { ok: shape && r.esito === 'rifiuta' && r.motivo.tipo === 'never' && !Parola.promette(r.say) && G0() === g0 + 1, nota: `richiesta parola1: verbi ${r.req.verbi.length}, storia ${r.req.storia.length}, volontà ${Object.keys(r.req.volonta).length}; rifiuta{${r.motivo && r.motivo.tipo}}; guardia +${G0() - g0}` };
});
caso('19F', teresa.first, '«aspettami qui» (F: intento nullo, «Sì, ti aspetto qui.»)', () => {
  const g0 = G0(), n0 = Parola.promesse(st).length; const r = parlaIA(teresa, 'aspettami qui', '19');
  return { ok: r.esito === 'niente' && !Parola.promette(r.say) && G0() === g0 + 1 && Parola.promesse(st).length === n0, nota: `esito ${r.esito}; nessuna promessa; guardia +${G0() - g0}` };
});
caso('20F', 'Cono', '«rubami una vespa» (F: verbo inventato ruba_vespa)', () => {
  const r = parlaIA(cono, 'rubami una vespa', '20');
  return { ok: r.esito === 'rifiuta' && r.motivo.tipo === 'non_so' && !cono.ris.task && /Vespa la so solo spingere/.test(r.say), nota: `rifiuta{${r.motivo && r.motivo.tipo}} con la battuta dell'IA (non promette); nessun compito` };
});
caso('21F', 'Cono', '«scrivi l\'onda in piazza» (F corretta) e «vai ad Atlantide» (posto inventato)', () => {
  base.stock.gesso = (base.stock.gesso || 0) + 2;
  const o0 = st.ris.goals.onde; const r = parlaIA(cono, 'scrivi l\'onda in piazza', '21'); const p = promOf(r);
  const m = fino(() => st.ris.goals.onde > o0 && p && p.stato !== 'in_corso', 240, 1 / 8);
  const r2 = parlaIA(cono, 'vai ad Atlantide', '21b');
  return { ok: r.esito === 'accetta' && /Gesso in tasca/.test(r.say) && st.ris.goals.onde === o0 + 1 && p.stato === 'fatta' && r2.esito === 'chiede' && r2.motivo.tipo === 'luogo' && !Parola.promette(r2.say), nota: `accetta con la battuta dell'IA; onde ${o0}→${st.ris.goals.onde} in ${m} min; Atlantide → ${r2.esito}{${r2.motivo && r2.motivo.tipo}} «${r2.say}»` };
});

// ================= la chat della banda (§2.7) =================
const beppe = G.byId(st, 'beppe'), betamax = G.byId(st, 'betamax'), vinile = G.byId(st, 'vinile');
[beppe, betamax, vinile].forEach(n => { RS.initNpc(st, n); RS.join(st, n); n.ris.auto = false; });
RS.members(st).forEach(m => { m.ris.auto = false; m.ris.fatigue = Math.min(m.ris.fatigue, .3); m.ris.fame = 0; m.ris.sete = 0; });
st.player.money += 60;
const bch = () => Parola._.bandaChat(st);
function scriviB(testo, ia) {
  const k0 = bch().length; const r = Parola.banda(st, testo, ia ? { ia } : {});
  const nuove = bch().slice(k0);
  _log(`  > (banda) ${testo}${ia ? '   [IA finta]' : ''}\n` + nuove.filter(m => m.role !== 'user').map(m => `    ${m.da === 'sys' ? '⚙' : (RS.battle(G.byId(st, m.da)) || G.byId(st, m.da).first) + ':'} ${m.text}`).join('\n'));
  r.nuove = nuove;
  // mai sì-poi-✗, anche nella banda
  (r.risposte || []).forEach(x => { if (x.esito !== 'accetta' && x.say && Parola.promette(x.say)) viol.push(`banda ${x.chi}: «${x.say}» (${x.esito})`); });
  return r;
}
caso('22F', 'banda', '«Cono, l\'onda al caruggio. Divisa, sorveglia la caserma.» (F)', () => {
  const r = scriviB('Cono, l\'onda al caruggio. Divisa, sorveglia la caserma.', IA['22']);
  const ok = r.promesse.length === 2 && r.promesse.every(p => p.thread === 'banda') && r.risposte.length === 2 && r.risposte.every(x => x.esito === 'accetta') && !r.obiezioni.length && r.nuove.some(m => m.da === 'cono' && /caruggio/.test(m.text));
  const nota = `${r.promesse.length} promesse (${r.promesse.map(p => p.chi + ': ' + p.desc).join(' · ')}); obiezione inventata dall'IA (Garza accetterebbe) scartata: ${!r.obiezioni.length}`;
  [cono, divisa].forEach(n => Parola.rispondi(st, n, 'lascia stare'));
  return { ok, nota };
});
caso(22, 'banda', '«Cono, l\'onda al caruggio. Divisa, sorveglia la caserma.» (R)', () => {
  base.stock.gesso = (base.stock.gesso || 0) + 2;
  const r = scriviB('Cono, l\'onda al caruggio. Divisa, sorveglia la caserma.');
  const P = r.promesse;
  const m = fino(() => P.every(p => p.stato !== 'in_corso' && p.stato !== 'accettata'), 330, 1 / 6);
  const upd = bch().filter(x => x.k && (x.da === 'cono' || x.da === 'divisa'));
  return { ok: r.risposte.map(x => x.chi).join(',') === 'cono,divisa' && P.length === 2 && P.every(p => p.stato === 'fatta') && upd.some(x => x.da === 'cono') && upd.some(x => x.da === 'divisa') && !r.obiezioni.length,
    nota: `risposte nell'ordine: ${r.risposte.map(x => x.chi + ':' + x.esito).join(', ')}; dopo ${m} min: ${P.map(p => p.chi + ' ' + p.stato).join(', ')}; aggiornamenti nel thread: ${upd.map(x => x.da + ' «' + x.text + '»').slice(-3).join(' · ')}` };
});
let P23 = null, bond23 = {};
caso('23a', 'banda', '«tutti: stanotte l\'Emporio» (F), Garza ha paura', () => {
  base.stock.attrezzi = (base.stock.attrezzi || 0) + 1;
  lucia.tr.cor = .15; lucia.op.fear = .5;
  RS.members(st).forEach(m => { bond23[m.id] = m.ris.bond; });
  const r = scriviB('tutti: stanotte l\'Emporio', IA['23']); P23 = r.piano;
  const g = r.risposte.find(x => x.chi === 'lucia');
  const objOk = r.obiezioni.every(ob => ob.chi !== 'lucia');
  const ruoli = P23 ? P23.ruoli.filter(x => x.ok) : [];
  return { ok: !!P23 && ruoli.length >= 3 && g && g.esito === 'rifiuta' && !Parola.promette(g.say) && objOk && r.promesse.length === ruoli.length,
    nota: `volontà per lo scasso: ${['beppe', 'divisa', 'cono', 'lucia'].map(id => id + ' ' + RS.will(st, G.byId(st, id), 'scasso', {}).s).join(', ')}; piano ${P23 && P23.tgt.name} alle ${P23 && ore(P23.t)}: ${ruoli.map(x => x.chi + '=' + x.ruolo).join(', ')}; Garza: ${g ? g.esito + ' «' + g.say + '»' : '-'}; obiezioni: ${r.obiezioni.map(o => o.chi + ' «' + o.testo + '»').join(' | ') || 'nessuna'}` };
});
let p24 = null;
caso('24a', 'banda', '«Vinile, altre due ore di radio» (stanchezza .85)', () => {
  if (!base.modules.includes('radio')) base.modules.push('radio'); base.stock.radio = 2;
  vinile.ris.fatigue = .85;
  const r = scriviB('Vinile, altre due ore di radio');
  const x = r.risposte[0];
  const noTask = !vinile.ris.task;
  const r2 = scriviB('va bene domani');
  p24 = Parola.promesse(st).find(p => p.chi === 'vinile' && p.stato === 'attesa' && p.dopo);
  return { ok: x && x.chi === 'vinile' && x.esito === 'contratta' && x.motivo.tipo === 'stanco' && noTask && !!p24 && ore(p24.quando.at) === '08:00', nota: `${x ? x.esito + '{' + (x.motivo && x.motivo.tipo) + '}' : '-'}; nessun compito: ${noTask}; dopo «va bene domani»: promessa ${p24 ? p24.stato + ' alle ' + ore(p24.quando.at) + ' (' + p24.desc + ')' : '-'}` };
});
caso('23b', 'banda', 'il piano: ritrovo, sync, il palo vede i Grigi', () => {
  if (!P23) return { ok: false, nota: 'nessun piano' };
  fino(() => P23.partiti, 26 * 60, 1 / 6);
  const sync = bch().some(x => x.k === 'sync');
  const palo = P23.ruoli.find(x => x.ruolo === 'palo' && x.ok), pn = palo && G.byId(st, palo.chi);
  corri(2, 1 / 15);
  // un Grigio davanti al posto
  const cop = st.npcs.find(k => k.cop && !k.dead); cop.inside = false; const q = Parola._.puntoVicino(P23.tgt.x, P23.tgt.y, 6, 0); cop.x = q.x; cop.y = q.y; cop.path = []; cop.wait = 15;
  const m = fino(() => P23.allarme, 8, 1 / 30);
  fino(() => P23.stato === 'finito', 120, 1 / 10);
  const pr = Parola.promesse(st).filter(p => p.piano_id === P23.id);
  const altri = pr.filter(p => p.chi !== (palo && palo.chi));
  const nessunaPerdita = RS.members(st).every(k => !(k.id in bond23) || k.ris.bond >= bond23[k.id] - .001);
  const allarme = bch().find(x => x.k === 'pericolo' && x.da === (palo && palo.chi));
  return { ok: sync && !!P23.allarme && !!allarme && altri.length > 0 && altri.every(p => p.stato === 'fallita' && /Grigi/.test(p.esito_msg || '')) && nessunaPerdita,
    nota: `sync: ${sync} (alle ${ore(P23.partiti || 0)}); palo ${pn ? RS.battle(pn) : '-'}: «${allarme ? allarme.text : '-'}» dopo ${m} min; promesse: ${pr.map(p => p.chi + ' ' + p.stato).join(', ')}; nessuna perdita di fiducia: ${nessunaPerdita}; ${P23.riepilogo || ''}` };
});
caso('24b', 'banda', 'la promessa «domani» di Vinile parte da sola alle 08:00', () => {
  if (!p24) return { ok: false, nota: 'nessuna promessa' };
  vinile.ris.fatigue = .2;
  fino(() => p24.stato !== 'attesa', 30 * 60, 1 / 6);
  const t1 = p24.stato === 'attesa' ? null : p24.avviata || null;
  const okT = t1 !== null && (t1 % 1440) >= 8 * 60 && (t1 % 1440) <= 10 * 60;
  return { ok: okT && (p24.stato === 'in_corso' || p24.stato === 'fatta') && p24.link && p24.link.tipo === 'task', nota: `partita alle ${t1 !== null ? ore(t1) : '-'}${p24.rinvii ? ' (dopo ' + p24.rinvii + ' rinvii)' : ''}: ${p24.stato} (${p24.desc})${p24.esito_msg ? ' · ' + p24.esito_msg : ''}` };
});
caso('D3', 'banda', 'decisione 3: un Orecchio nella banda accetta e tradisce (una volta)', () => {
  // un membro che parla con gli Orecchi: si mette un giro «orecchio» su Teresa per la prova
  if (!teresa.ris.member) { RS.join(st, teresa); teresa.ris.auto = false; }
  const g0 = teresa.pop.giro; teresa.pop.giro = 'orecchio'; teresa.ris.fatigue = .1; teresa.ris.task = null;
  const r0 = st.ris.repr; const r = scriviB(`${teresa.first}, sorveglia la caserma`);
  const p = r.promesse[0];
  const t1 = !!(p && p.tradimento), d = st.ris.repr - r0;
  if (p) Parola.rispondi(st, teresa, 'lascia stare');
  const r2 = scriviB(`${teresa.first}, sorveglia la caserma`); const p2 = r2.promesse[0];
  if (p2) Parola.rispondi(st, teresa, 'lascia stare');
  teresa.pop.giro = g0;
  return { ok: !!p && t1 && d >= 5 && p2 && !p2.tradimento, nota: `accetta e tradisce: ${t1} (Repressione +${d}); la seconda volta: ${p2 && p2.tradimento ? 'tradisce ancora' : 'no'}` };
});

// ================= i mandati (§0) =================
const giornoFra = k => G.dayName((Math.floor(st.t / 1440) + k) * 1440 + 600);
let m31 = null;
caso(31, 'banda', '«soldi per la cassa e due compagni nuovi, entro …» (linea Prudenza)', () => {
  const lin0 = st.ris.linea; st.ris.linea = 'prudenza';
  RS.members(st).forEach(m => { m.ris.fatigue = .1; m.ris.task = null; });
  const r = scriviB(`Ragazzi, soldi per la cassa e due compagni nuovi, entro ${giornoFra(3)}`);
  const out = r.mandato; st.ris.linea = lin0;
  if (!out) return { ok: false, nota: 'nessun mandato' };
  const chi = new Set(out.sotto.map(x => x.chi));
  const sommaOk = out.mandati.every(P => P.sotto.map(id => Parola.mandati(st).find(x => x.id === id)).reduce((s, x) => s + x.obiettivo.quanto, 0) >= P.obiettivo.quanto);
  const rischiosi = out.sotto.filter(x => (Parola.MET[x.tipo].find(y => y.id === (x.provati[0] || x.metodo.id)) || {}).rischio >= .6);
  const objOk = out.obiezioni.length ? rischiosi.length > 0 : rischiosi.length === 0;
  const ok = out.mandati.length === 2 && chi.size >= 3 && sommaOk && !!out.referente && /Allora:/.test(out.riepilogo || '') && objOk;
  m31 = out;
  const nota = `${out.mandati.map(P => P.tipo + ' ' + P.obiettivo.quanto + ' → ' + P.sotto.map(id => { const x = Parola.mandati(st).find(y => y.id === id); return x.chi + ':' + x.metodo.id + ':' + x.obiettivo.quanto; }).join(', ')).join(' | ')}; obiezioni: ${out.obiezioni.map(o => o.chi + '→' + o.contro).join(', ') || 'nessuna'} (metodi a rischio ≥ .6: ${rischiosi.length}); referente ${out.referente}`;
  out.mandati.forEach(P => Parola.lasciaStare(st, P.id));
  return { ok, nota };
});
caso('27F', 'Garza', '«fai soldi, come vuoi» (F: l\'IA propone lo scasso)', () => {
  lucia.tr.cor = .5; lucia.op.fear = 0;
  const g0 = G0();
  const r = RS.applyReply(st, lucia, 'fai soldi, come vuoi', { risposta: '', azioni: [] }, JSON.stringify(Object.assign({ versione: 'parola1' }, IA['27'])));
  const m = r.mandato; _log(`    Garza: «${r.say}» [${r.esito}] ${m ? m.metodo.id : ''}`);
  const legal = m && !(Parola.MET.soldi.find(x => x.id === m.metodo.id) || {}).illegale;
  const ok = r.esito === 'accetta' && legal && G0() > g0 && !/scasso/i.test(r.say);
  if (m) Parola.lasciaStare(st, m.id);
  return { ok, nota: `metodo ${m ? m.metodo.id + ' (' + m.metodo.etichetta + ')' : '-'}; lo scasso dell'IA scartato (guardia +${G0() - g0}); la battuta dell'IA sullo scasso non passa` };
});
let m26 = null, m27 = null, m29 = null, m30 = null, m28 = null, ab28 = null;
caso(27, 'Garza', '«fai soldi, come vuoi» (R)', () => {
  const r = parla(lucia, 'fai soldi, come vuoi'); m27 = r.mandato;
  const L = Parola.metodi(st, lucia, 'soldi', {});
  const illeciti = L.filter(x => x.x.illegale && !x.no);
  return { ok: r.esito === 'accetta' && m27 && !Parola.MET.soldi.find(x => x.id === m27.metodo.id).illegale && !illeciti.length, nota: `metodo ${m27 ? m27.metodo.id : '-'}; metodi illegali possibili per lei: ${illeciti.map(x => x.id).join(',') || 'nessuno'} (never ruba, legge ${lucia.tr.legge})` };
});
caso(26, 'Candela', `«servono soldi per la cassa, un centinaio, entro ${giornoFra(3)}»`, () => {
  beppe.ris.task = null; beppe.ris.fatigue = .1;
  const r = parla(beppe, `servono soldi per la cassa, un centinaio, entro ${giornoFra(3)}`); m26 = r.mandato;
  return { ok: r.esito === 'accetta' && m26 && m26.tipo === 'soldi' && m26.metodo.id === 'turni' && m26.obiettivo.quanto === 100, nota: `metodo ${m26 ? m26.metodo.id + ' · ' + m26.metodo.perche.join(', ') : '-'}; piano «${m26 && m26.rapporti[0] ? m26.rapporti[0].testo : '-'}»` };
});
caso('29a', 'Betamax', '«la cassa piange» (carte) + 20.000', () => {
  betamax.pop.ints = (betamax.pop.ints || []).concat([{ k: 'carte', w: .9 }]); betamax.ris.task = null; betamax.ris.fatigue = .1;
  const r = parla(betamax, 'la cassa piange, servono soldi');
  const r2 = r.esito === 'contratta' && r.contro && r.contro.tipo === 'soldi' ? parla(betamax, `ti do ${r.contro.quanto}`) : null;
  m29 = Parola.mandati(st).find(m => m.chi === 'betamax' && m.stato === 'in_corso');
  return { ok: r.esito === 'contratta' && !!r.contro && r.contro.quanto === 20 && !!m29 && m29.metodo.id === 'bisca' && m29.posta === 20, nota: `${r.esito}{soldi:${r.contro && r.contro.quanto}} «${r.say}» → ${r2 ? r2.esito + ' «' + r2.say + '»' : '-'}; metodo ${m29 ? m29.metodo.id : '-'}` };
});
// il seme in cui perde: la sorte della bisca si forza da fuori (solo in questa prova)
{ const e0 = RS.EXT.earnFrom; RS.EXT.earnFrom = function (st2, n, T, amt, src) { const a = e0 ? e0.apply(this, arguments) : amt; return n && n.id === 'betamax' && T && T.verb === 'bisca' ? -Math.abs(a) - .05 : a; }; }
const orecchio1 = st.npcs.filter(k => k.pop && k.pop.ints && !k.dead && !k.cop && !(k.ris && k.ris.member) && !k.pop.cast && k !== teresa).sort((a, b) => Math.hypot(a.x - vinile.x, a.y - vinile.y) - Math.hypot(b.x - vinile.x, b.y - vinile.y))[0];
caso('30a', 'Vinile', '«trovami due compagni» con un Orecchio fra gli amici', () => {
  RS.initNpc(st, orecchio1); orecchio1.pop.giro = 'orecchio'; orecchio1.ris.ideo = .95;
  vinile.pop.friends = [orecchio1.id].concat((vinile.pop.friends || []).filter(x => x !== orecchio1.id)); vinile.ris.task = null; vinile.ris.fatigue = .1;
  const r = parla(vinile, 'trovami due compagni'); m30 = r.mandato;
  return { ok: r.esito === 'accetta' && m30 && m30.tipo === 'recluta' && m30.obiettivo.quanto === 2, nota: `metodo ${m30 ? m30.metodo.id : '-'}; il primo candidato: ${orecchio1.first} (giro orecchio)` };
});
const ladri = st.npcs.filter(k => k.pop && k.pop.ints && !k.dead && !k.cop && !(k.ris && k.ris.member) && !k.pop.cast && k.pop.giro === 'ladro' && Parola._.complici(st, k).length >= 2);
const ladro = ladri[0] || st.npcs.find(k => k.pop && k.pop.ints && !k.dead && !k.cop && !(k.ris && k.ris.member) && !k.pop.cast && Parola._.complici(st, k).length >= 2);
caso('28a', ladro ? ladro.first + ' (giro ' + (ladro.pop.giro || '-') + ')' : '-', '«mi servono soldi, ma pulito»', () => {
  if (!ladro) return { ok: false, nota: 'nessun abitante col giro e due complici' };
  ladro.pop.giro = 'ladro'; ladro.tr.legge = Math.min(ladro.tr.legge, .3); ladro.tr.cor = Math.max(ladro.tr.cor, .6); ladro.pop.debiti = Object.assign({}, ladro.pop.debiti, { player: 1 });
  const r = parla(ladro, 'mi servono soldi, ma pulito'); const m = r.mandato;
  const ok = m && m.metodo.id !== 'scasso' && !Parola.MET.soldi.find(x => x.id === m.metodo.id).illegale;
  if (m) Parola.lasciaStare(st, m.id);
  return { ok: !!ok || (r.esito !== 'accetta' && !(r.mandato)), nota: `${r.esito}; metodo ${m ? m.metodo.id : '-'} (con «pulito» niente scasso)` };
});
caso('28b', ladro ? ladro.first : '-', '«mi servono soldi» (ti deve un favore)', () => {
  if (!ladro) return { ok: false, nota: '-' };
  const r = parla(ladro, 'mi servono soldi'); m28 = r.mandato;
  return { ok: r.esito === 'accetta' && m28 && m28.metodo.id === 'scasso', nota: `metodo ${m28 ? m28.metodo.id + ' · ' + m28.metodo.perche.join(', ') : '-'}; complici: ${Parola._.complici(st, ladro).slice(0, 3).map(k => k.first).join(', ')}` };
});
// tre giorni di gioco: i mandati vanno avanti da soli
_log(`\n… tre giorni di mandati (da ${G.dayName(st.t)} ${ore(st.t)})`);
let lasciato30 = false, k0repr = st.ris.repr, trama28 = null;
{ const t1 = st.t + 3 * 1440 + 60; let k = 0;
  while (st.t < t1 && k++ < 3e6) {
    G.step(st, 1 / 6, {});
    if (m30 && !lasciato30 && m30.reclutati.includes(orecchio1.id)) { lasciato30 = st.t; }
    if (m28 && !trama28 && st.trame) trama28 = st.trame.list.find(T => T.mandato === m28.id) || null;
    if ([m26, m27, m29, m28].every(m => !m || m.stato !== 'in_corso') && (!m30 || lasciato30)) break;
  } }
const rapp = (m, k) => m ? m.rapporti.filter(r => r.k === k) : [];
caso('26b', 'Candela', 'dopo tre giorni: la cassa, i parziali, il finale', () => {
  if (!m26) return { ok: false, nota: '-' };
  const f = Parola.misura(st, m26), sum = m26.fasi.reduce((s, x) => s + (x.reso || 0), 0), fin = m26.finale || '';
  const par = rapp(m26, 'parziale');
  const numOk = !fin || fin.includes(`${f >= 0 ? '+' : ''}${f}.000`) || fin.includes(`${f}.000`) || fin.includes(String(f));
  const vespa = m26.fasi.some(x => x.cosa === 'vendi_mezzo' && x.stato === 'fatta');
  return { ok: f > 0 && f === sum && par.length >= 2 && m26.stato !== 'in_corso' && numOk && m26.metodo && !Parola.MET.soldi.find(x => x.id === m26.metodo.id).illegale,
    nota: `${m26.stato}: ${f}/${m26.obiettivo.quanto} (= somma delle fasi ${sum}); fasi ${m26.fasi.map(x => x.cosa + (x.reso ? ':' + x.reso : '') + '/' + x.stato + (x.stato === 'fallita' ? '(' + (x.msg || '') + ')' : '')).join(' ')}; parziali ${par.length} (es. «${par[0] ? par[0].testo : '-'}»); finale «${fin}»${vespa ? '; ha venduto la Vespa' : ''}` };
});
caso('27b', 'Garza', 'dopo tre giorni: mai un metodo illegale', () => {
  if (!m27) return { ok: false, nota: '-' };
  const ill = m27.fasi.filter(x => { const V = RS.VERBS[x.cosa]; return V && V.illegal; });
  return { ok: !ill.length && m27.provati.every(id => !Parola.MET.soldi.find(x => x.id === id).illegale), nota: `${m27.stato}: ${Parola.misura(st, m27)}/${m27.obiettivo.quanto}; metodi provati ${m27.provati.join(', ')}; fasi ${m27.fasi.map(x => x.cosa).join(' ')}` };
});
caso('28c', ladro ? ladro.first : '-', 'la trama dello scasso, con lui capo', () => {
  if (!m28) return { ok: false, nota: '-' };
  const T = trama28 || (st.trame && st.trame.list.find(x => x.mandato === m28.id));
  return { ok: !!T && T.leader === ladro.id && T.kind === 'scasso', nota: `trama ${T ? T.id + ' ' + T.kind + ' a ' + T.tgt.label + ', capo ' + G.nameOf(st, T.leader) + ', membri ' + T.members.length + ', ' + T.status : 'nessuna'}; mandato ${m28.stato} ${Parola.misura(st, m28)}/${m28.obiettivo.quanto}` };
});
caso('29b', 'Betamax', 'la bisca va male: progresso negativo, mandato fallito, nel Taccuino', () => {
  if (!m29) return { ok: false, nota: '-' };
  const f = Parola.misura(st, m29), html = Parola.mandatiHtml(st);
  return { ok: f < 0 && m29.stato === 'fallito' && m29.conseguenze.some(c => /perso/.test(c.testo)) && /bisca/.test(html) && /perso/.test(html), nota: `${m29.stato}: ${f}; fasi ${m29.fasi.map(x => x.cosa + '/' + x.stato + (x.reso ? ':' + x.reso : '') + (x.stato === 'fallita' ? '(' + (x.msg || '') + ')' : '')).join(' ')}; conseguenze: ${m29.conseguenze.map(c => c.testo).join('; ')}; rapporti: ${m29.rapporti.map(r => '«' + r.testo + '»').join(' ')}` };
});
caso('30b', 'Vinile', 'senza prudenza l\'Orecchio entra, e la Repressione sale', () => {
  if (!m30) return { ok: false, nota: '-' };
  const ent = !!(orecchio1.ris && orecchio1.ris.member), cons = m30.conseguenze.find(c => c.k === 'orecchio');
  const res = { ok: ent && !!cons && st.ris.repr >= 0 && m30.reclutati.includes(orecchio1.id), nota: `fasi ${m30.fasi.map(x => x.cosa + ':' + G.nameOf(st, x.cand) + '/' + x.stato + (x.msg ? '(' + x.msg + ')' : '')).join(' ')}; ${orecchio1.first} membro: ${ent}; conseguenza (nascosta al giocatore): «${cons ? cons.testo : '-'}»; mandato ${m30.stato} ${Parola.misura(st, m30)}/2${lasciato30 ? ', entrato alle ' + ore(lasciato30) : ''}` };
  if (m30.stato === 'in_corso') Parola.lasciaStare(st, m30.id);
  return res;
});
const orecchio2 = st.npcs.filter(k => k.pop && k.pop.ints && !k.dead && !k.cop && !(k.ris && k.ris.member) && !k.pop.cast && k !== orecchio1 && k !== teresa && k !== ladro).sort((a, b) => Math.hypot(a.x - vinile.x, a.y - vinile.y) - Math.hypot(b.x - vinile.x, b.y - vinile.y))[0];
let m30c = null;
caso('30c', 'Vinile', '«trovami un compagno, ma stai attenta»: prima un giorno di pedina', () => {
  RS.initNpc(st, orecchio2); orecchio2.pop.giro = 'orecchio'; orecchio2.ris.ideo = .97; vinile.pop.friends = [orecchio2.id].concat(vinile.pop.friends.filter(x => x !== orecchio2.id && x !== orecchio1.id));
  vinile.ris.task = null; vinile.ris.fatigue = .1; vinile.jailedUntil = 0;
  const r = parla(vinile, 'trovami un compagno, ma stai attenta'); m30c = r.mandato;
  if (!m30c) return { ok: false, nota: r.esito + ' ' + r.say };
  fino(() => m30c.esclusi.includes(orecchio2.id) || m30c.stato !== 'in_corso', 1500, 1 / 6);
  const ped = m30c.fasi.find(f => f.cosa === 'pedina' && f.cand === orecchio2.id);
  const res = { ok: m30c.vincoli.prudenza && !!ped && m30c.esclusi.includes(orecchio2.id) && !(orecchio2.ris && orecchio2.ris.member), nota: `pedina ${orecchio2.first}: ${ped ? ped.stato : '-'}; escluso: ${m30c.esclusi.includes(orecchio2.id)}; membro: ${!!(orecchio2.ris && orecchio2.ris.member)}; «${(m30c.rapporti.find(x => /Lascia stare/.test(x.testo)) || {}).testo || '-'}»` };
  Parola.lasciaStare(st, m30c.id);
  return res;
});

// ================= la rapina (§0.10) =================
const tr0 = Object.assign({}, cono.tr);
caso('R1', 'Cono (coraggio .9, avidità .8, legge .2)', 'la rapina fra i metodi: sì con «fai come vuoi», no con pulito / niente armi / niente rapine; mai per Garza', () => {
  Object.assign(cono.tr, { cor: .9, avid: .8, legge: .2 });
  const V = t => Parola.metodi(st, cono, 'soldi', Object.assign({ pulito: false, niente: [], budget: null, prudenza: false, armi: 'tutte', rapine: true }, t)).find(x => x.id === 'rapina');
  const si = V({}), pul = V({ pulito: true }), arm = V({ armi: 'no' }), nr = V({ rapine: false });
  const g = Parola.metodi(st, lucia, 'soldi', {}).find(x => x.id === 'rapina');
  return { ok: si && !si.no && pul.no && arm.no && nr.no && g.no, nota: `«fai come vuoi»: ${si.no || 'ammessa (peso ' + Parola.rapina.peso(st, cono) + ')'}; pulito: ${pul.no}; niente armi: ${arm.no}; niente rapine: ${nr.no}; Garza: ${g.no}` };
});
let R2 = null, R4 = null;
caso('R2a', 'Cono', 'la propone in chat: senza il sì non parte', () => {
  [cono, divisa, vinile, beppe].forEach(n => { if (!n.dead && !n.ris.member) { RS.join(st, n); n.ris.auto = false; } n.jailedUntil = Math.min(n.jailedUntil || 0, st.t); n.inside = false; });
  RS.members(st).forEach(m => { m.ris.fatigue = .1; m.jailedUntil = Math.min(m.jailedUntil, st.t); });
  R2 = Parola.rapina.proponi(st, cono, {});
  if (!R2) return { ok: false, nota: 'nessuna proposta' };
  corri(120, 1 / 6);
  const fermo = R2.stato === 'proposta' && !R2.esito;
  const r = scriviB('Dimmi.'); const r2 = scriviB('va bene');
  return { ok: fermo && R2.stato === 'preparazione' && bch().some(x => /Non ti piacerà/.test(x.text)), nota: `dopo due ore senza risposta: ${fermo ? 'ferma' : R2.stato}; dopo «va bene»: ${R2.stato}; ${R2.tgt.name} alle ${ore(R2.t)}, ${R2.arma.nome}, crew ${R2.crew.map(x => x.chi + '=' + x.ruolo).join(', ')}` };
});
caso('R4a', 'Divisa', '«va bene, ma niente armi vere»', () => {
  Object.assign(divisa.tr, { cor: .9, avid: .7, legge: .2 });
  R4 = Parola.rapina.proponi(st, divisa, {});
  if (!R4) return { ok: false, nota: 'nessuna proposta' };
  scriviB('va bene, ma niente armi vere');
  return { ok: R4.stato === 'preparazione' && R4.arma.tipo === 'finta' && R4.vincoli.armi === 'finte', nota: `${R4.stato}; arma: ${R4.arma.nome} (${R4.arma.tipo})` };
});
const capoR3 = st.npcs.filter(k => k.pop && k.pop.ints && !k.dead && !k.cop && !(k.ris && k.ris.member) && !k.pop.cast && k !== ladro && Parola._.complici(st, k).length >= 1).sort((a, b) => Parola._.complici(st, b).length - Parola._.complici(st, a).length)[0];
let R3 = null;
caso('R3a', capoR3 ? capoR3.first : '-', 'una crew di abitanti, da sola: debito con lo Squalo, arma finta; una sola a settimana', () => {
  if (!capoR3) return { ok: false, nota: 'nessun abitante con complici' };
  Object.assign(capoR3.tr, { cor: .9, legge: .2, avid: .7 }); capoR3.pop.giro = 'borsaiolo'; capoR3.pop.debt = { to: 'sandro', amount: 120 }; capoR3.pop.money = 3;
  R3 = Parola.rapina.autonoma(st, { forza: true, capo: capoR3 });
  const altra = Parola.rapina.autonoma(st);
  return { ok: !!R3 && R3.arma.tipo === 'finta' && !R3.banda && R3.stato === 'preparazione' && altra === null, nota: R3 ? `${R3.tgt.name} alle ${ore(R3.t)}, ${R3.arma.nome}, crew ${R3.crew.map(x => G.nameOf(st, x.chi) + '=' + x.ruolo).join(', ')}; una seconda nella stessa settimana: ${altra ? 'sì' : 'no'}` : 'nessuna' };
});
_log(`\n… fino ai colpi (${R2 && ore(R2.t)}, ${R4 && ore(R4.t)}, ${R3 && ore(R3.t)})`);
const repr0 = st.ris.repr, cassa0 = st.ris.cassa, radio = [];
{ const f0 = G.feed; G.feed = function (st2, text) { if (/Radio Porto|Garante/.test(String(text))) radio.push(String(text)); return f0.apply(this, arguments); }; }
fino(() => [R2, R3, R4].every(R0 => !R0 || ['fatta', 'fallita', 'annullata'].includes(R0.stato)), 40 * 60, 1 / 6);
corri(30, 1 / 6);
caso('R2b', 'Cono', 'il colpo: aggiornamenti in chat, Repressione, Radio Porto, la cassa vera', () => {
  if (!R2) return { ok: false, nota: '-' };
  const ag = R2.aggiornamenti.map(x => x.k), sentita = /Radio Porto: rapina/i.test(R2.radio || '') || radio.some(x => /Radio Porto: rapina/i.test(x));
  const okSoldi = R2.esito === 'riuscita' || R2.esito === 'a_meta' ? R2.perCassa > 0 && R2.bottino > 0 : (R2.perCassa || 0) === 0;
  const okFam = R2.arma.da === 'famiglia' && (R2.esito === 'riuscita' || R2.esito === 'a_meta') ? R2.quotaFam > 0 : R2.quotaFam === 0;
  return { ok: R2.stato === 'fatta' && ag.includes('dentro') && ag.includes('sopralluogo') && R2.conseguenze.some(c => c.k === 'repr') && sentita && okSoldi && okFam,
    nota: `esito ${R2.esito}; bottino ${R2.bottino}, nella cassa ${R2.perCassa || 0}; Famiglia ${R2.quotaFam}; radio: «${R2.radio || '-'}»; aggiornamenti: ${R2.aggiornamenti.slice(3).map(x => '«' + x.testo + '»').join(' ')}; conseguenze: ${R2.conseguenze.map(c => c.testo).join('; ')}` };
});
caso('R3b', capoR3 ? capoR3.first : '-', 'la crew di abitanti: com\'è andata (con l\'arma finta niente spari)', () => {
  if (!R3) return { ok: false, nota: '-' };
  const spari = st.events.some(e => e.type === 'spari' && e.t >= R3.t - 1 && e.t <= R3.t + 30 && R3.crew.some(x => x.chi === e.actor));
  const coerente = R3.esito === 'scoperta' || R3.esito === 'eroe' || R3.esito === 'fallita' ? true : R3.bottino > 0;
  return { ok: R3.stato === 'fatta' && !spari && coerente && R3.quotaFam === 0, nota: `esito ${R3.esito}${R3.presi ? ', presi ' + R3.presi.map(id => G.nameOf(st, id)).join(', ') : ''}${R3.eroe ? ', eroe ' + G.nameOf(st, R3.eroe) : ''}; bottino ${R3.bottino}; spari: ${spari}` };
});
caso('R4b', 'Divisa', 'con le armi finte la Famiglia non c\'entra', () => {
  if (!R4) return { ok: false, nota: '-' };
  return { ok: ['fatta', 'annullata'].includes(R4.stato) && R4.arma.tipo === 'finta' && !R4.quotaFam, nota: `esito ${R4.esito}; arma ${R4.arma.nome}; quota della Famiglia ${R4.quotaFam}; bottino ${R4.bottino}` };
});
Object.assign(cono.tr, tr0);
_log(`Repressione ${Math.round(repr0)}→${Math.round(st.ris.repr)} · cassa ${Math.round(cassa0)}→${Math.round(st.ris.cassa)} · Taccuino «Mandati»: ${Parola.mandatiHtml(st).length} caratteri`);

// ---------------- il registro ----------------
const M = Parola._.S(st);
_log('\n================ RISULTATI (modi R e F, seme ' + seed + ') ================');
casi.forEach(c => _log(`${c.ok ? '✔' : '✗'} ${String(c.id).padEnd(4)} ${c.chi.padEnd(24)} ${c.frase}\n       ${c.nota || ''}`));
_log(`\nmai sì-poi-✗: ${viol.length ? 'VIOLATA ' + viol.length + ' volte\n  ' + viol.join('\n  ') : 'rispettata in tutte le ' + M.stats.risposte + ' risposte'}`);
_log(`cane da guardia (strada IA finta): ${M.stats.guardia} · promesse ${M.stats.promesse} (fatte ${M.stats.fatte}, fallite ${M.stats.fallite}, rotte ${M.stats.rotte}) · annunci corretti ${JSON.stringify(M.stats.annunci)}`);
// le banche: nessuna riga fuori da «accetta» promette, e tutte stanno in 70 caratteri
const B = Parola.BANCHE, lunghe = [], bugie = [];
Object.entries(B).forEach(([es, X]) => { const L = Array.isArray(X) ? [['', X]] : Object.entries(X); L.forEach(([k, arr]) => arr.forEach(s => { if (s.replace(/\{[^}]+\}/g, '').length > 70) lunghe.push(s); if (['rifiuta', 'contratta', 'chiede', 'niente'].includes(es) && Parola.promette(s.replace(/\{[^}]+\}/g, 'x'))) bugie.push(`${es}.${k}: ${s}`); })); });
_log(`banche: ${Object.values(B).reduce((s, X) => s + (Array.isArray(X) ? X.length : Object.values(X).reduce((a, v) => a + v.length, 0)), 0)} righe; oltre 70 caratteri: ${lunghe.length}${lunghe.length ? ' → ' + lunghe.join(' | ') : ''}; righe di rifiuto/contratta/chiede che promettono: ${bugie.length}${bugie.length ? ' → ' + bugie.join(' | ') : ''}`);
_log(`Taccuino «Parola data»: ${Parola.taccuinoHtml(st).length} caratteri di HTML`);
_log(`tempo: ${Math.round((Date.now() - T0) / 1000)} s`);
const fail = casi.filter(c => !c.ok).length + (viol.length ? 1 : 0) + (lunghe.length ? 1 : 0) + (bugie.length ? 1 : 0);
_log(fail ? `\n${fail} prove non passano.` : '\nTutte le prove passano.');
process.exit(fail ? 1 : 0);
