// [commedia] Prove di parola e azione (commedia/PAROLA_AZIONE.md §6), modo R (ripiego a parole chiave), mappa nuova.
// node test_parola.js [seme]  — esce con 1 se un caso fallisce. La regola per tutti: mai «sì» e poi ✗.
'use strict';
const S = __dirname + '/'; process.chdir(S);
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
  const m = fino(() => !p || p.stato !== 'in_corso', 220);
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

// ---------------- il registro ----------------
const M = Parola._.S(st);
_log('\n================ RISULTATI (modo R, seme ' + seed + ') ================');
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
