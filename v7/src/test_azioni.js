// Prova dei verbi, dei modi e degli imprevisti, senza grafica. Uso (dalla cartella src): node test_azioni.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js');
const G = Game, A = Azioni, days = +process.argv[2] || 2, seed = +process.argv[3] || 1;
const out = [], line = s => out.push(s), clk = t => `${['mar', 'mer', 'gio', 'ven', 'sab', 'dom', 'lun'][Math.floor(t / 1440) % 7]} ${G.clockStr(t)}`;
const st = G.create(seed);
const run = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, {}); };
const pop = f => st.npcs.find(n => n.pop && !n.pop.cast && !n.dead && n.jailedUntil <= st.t && (!f || f(n)));
const diaryOf = (n, from, re) => n.pop.diary.filter(e => e.t >= from && (!re || re.test(e.text))).map(e => `    ${clk(e.t)} ${e.text}`);
const plansNow = () => st.npcs.filter(n => n.pop && n.pop.emer).map(n => `    ${n.name}: ${n.pop.emer.label} → ${n.pop.emer.steps[n.pop.emer.i] ? n.pop.emer.steps[n.pop.emer.i].label : '-'}`);
const fate = c => (c.corpse.gone ? `sparito (${c.corpse.gone})` : c.corpse.buried ? `sepolto in ${c.corpse.buried.place}` : c.corpse.vehicle ? 'in un bagagliaio' : c.corpse.leader ? `portato da ${G.nameOf(st, c.corpse.leader)}` : c.corpse.hidden ? 'nascosto' : `a terra a ${c.corpse.place}`);
// segue un piano passo per passo
function trace(n, mins, label) {
  let last = ''; const end = st.t + mins;
  while (st.t < end) { G.step(st, 1 / 30, {}); const E = n.pop.emer, s = E ? (E.steps[E.i] ? E.steps[E.i].label : '') + (E.phase === 'go' ? ' …' : '') : '(finito)'; if (s !== last) { last = s; line(`    ${clk(st.t)} ${label || n.first}: ${s}`); } if (!E && last === '(finito)') { line(`      (fine: ${n.pop.lastEnd} al passo «${n.pop.lastEndStep}»)`); break; } }
}
run(1440 + 10 * 60 - st.t);

// 1. omicidio al mercato
const atPiazza = st.npcs.filter(n => n.pop && !n.dead && n.pop.at && /Piazza San Rocco/.test(n.pop.at.label || '') && !n.pop.cast);
const killer = pop(n => n.pop.giro && n.pop.giro !== 'orecchio') || atPiazza[0], victim = atPiazza.find(n => n !== killer) || pop(n => n !== killer);
killer.x = victim.x; killer.y = victim.y; killer.pop.at = victim.pop.at;
line(`1) ${clk(st.t)}: ${killer.name} uccide ${victim.name} a ${victim.pop.at ? victim.pop.at.label : '?'} (ci sono ${atPiazza.length} persone).`);
const t1 = st.t; A.kill(st, killer, victim, 'con un coltello'); run(2);
line('  Reazioni:'); plansNow().slice(0, 12).forEach(l => line(l));
run(6 * 60);
line(`  Dopo 6 ore il corpo è ${fate(victim)}. ${killer.first}: ${killer.jailedUntil > st.t ? 'in cella' : 'libero'}.`);
const born = st.npcs.filter(n => n.pop && n.pop.diary.some(e => e.tag === 'arrivo'));
line(`  All'ambulatorio è arrivato qualcuno di nuovo: ${born.map(n => `${n.name}, ${n.pop.age} anni, ${n.role}`).join('; ') || 'non ancora'}.`);

// 2. davanti al giocatore: ogni modo di far sparire un corpo (forzato, per vederli tutti)
['seppellire', 'mare', 'bruciare', 'cassonetto', 'cantina'].forEach((modo, i) => {
  const where = G.PLACES[['sentiero', 'molo', 'discarica', 'calata', 'vico'][i]];
  st.player.x = where.x + 4; st.player.y = where.y + 3;
  const k = pop(n => n.tr.legge < .5 && n.pop.age < 55 && n !== killer), v = pop(n => n !== k && n.pop.hh !== k.pop.hh);
  [k, v].forEach((n, j) => { n.x = where.x + j * .8; n.y = where.y; n.inside = false; n.pop.near = true; n.pop.lod = 'vicino'; n.pop.at = null; });
  k.tr.cor = .9; k.pop.money = 60;
  A.kill(st, k, v, 'a coltellate'); run(.5);
  A.endPlan(st, k); st.npcs.forEach(n => { if (n.pop && n.pop.emer && n !== k) A.endPlan(st, n); });
  const r = A.intend(st, k, 'sbarazzati', { cosa: v, modo }, 3);
  line(`\n2${'abcde'[i]}) ${clk(st.t)} a ${where.name}: ${k.name} deve far sparire ${v.name} — modo ${modo}: ${r.ok ? r.plan.steps.map(s => s.label).join(' → ') : 'impossibile (' + r.why + ')'}`);
  if (r.ok) { trace(k, 10 * 60); line(`    → il corpo è ${fate(v)}; tempo di scena: l'orologio è andato a ${st.timeK.toFixed(2)}×`); }
});

// 3. un trasporto in macchina, e uno in tre
{
  const k = pop(n => n.tr.legge < .5 && n.pop.age < 50), v = pop(n => n !== k), car = st.vehicles.find(x => !x.traffic && !x.military && !x.police && x.kind !== 'vespa' && !x.hidden);
  car.owner = k.id; k.x = car.x + 3; k.y = car.y; v.x = car.x + 6; v.y = car.y + 2; [k, v].forEach(n => { n.inside = false; n.pop.near = false; });
  A.kill(st, k, v, 'a coltellate'); run(.5); A.endPlan(st, k);
  const tm = A.transportModes(st, k, v, Popolo._.target('macchia') || Popolo._.target('discarica'));
  line(`\n3a) ${k.name} ha la ${car.kind} lì vicino: i modi di trasporto possibili sono ${tm.map(m => m.mode).join(', ')}.`);
  const r = A.intend(st, k, 'sbarazzati', { cosa: v, modo: 'seppellire' }, 3);
  line(`    piano: ${r.ok ? r.plan.steps.map(s => s.label).join(' → ') : r.why}`); if (r.ok) trace(k, 10 * 60);
  line(`    → il corpo è ${fate(v)}`);
  const w = pop(n => n.pop.age > 66 && n.pop.friends.length), v2 = pop(n => n !== w);
  if (w) {
    w.pop.friends.forEach(id => { const f = G.byId(st, id); if (f && f.pop) { f.tr.legge = .3; Azioni.moveRel(st, f, w, .6); } });
    w.x = v2.x + 1; w.y = v2.y; w.tr.legge = .2; A.kill(st, w, v2, 'col bastone'); run(.5); A.endPlan(st, w);
    const r2 = A.intend(st, w, 'trasporta', { cosa: v2, dove: 'macchia', modo: 'insieme' }, 3);
    line(`3b) ${w.name}, ${w.pop.age} anni (forza ${A.strength(w).toFixed(2)}), deve spostare ${v2.name} (${v2.corpse.weight} kg): ${r2.ok ? r2.plan.steps.map(s => s.label).join(' → ') : r2.why}`);
    if (r2.ok) trace(w, 8 * 60);
    line(`    → il corpo è ${fate(v2)}`);
  }
}

// 4. una sparatoria davanti al giocatore
{
  const k = pop(n => n.pop.age < 50), v = pop(n => n !== k), pz = G.PLACES.piazzetta || G.PLACES.piazza;
  st.player.x = pz.x + 5; st.player.y = pz.y + 4;
  [k, v].forEach((n, i) => { n.x = pz.x + i * 9; n.y = pz.y; n.inside = false; n.pop.near = true; n.pop.lod = 'vicino'; n.pop.at = null; });
  A.give(st.npcs.find(x => x === k), 'pistola'); k.pop.ammo.pistola = 15; k.tr.legge = .1; k.tr.cor = .9;
  const r = A.intend(st, k, 'uccidi', { chi: v, modo: 'spara' }, 3);
  line(`\n4) ${clk(st.t)}: ${k.name} ha una pistola in tasca e vuole uccidere ${v.name}: ${r.ok ? r.plan.steps.map(s => s.label).join(' → ') : r.why}`);
  if (r.ok) trace(k, 30);
  line(`    → ${v.name} è ${v.dead ? 'morto' : 'vivo (' + Math.round(v.hp) + ' di vita)'}; colpi rimasti ${k.pop.ammo.pistola}; chi ha sentito gli spari: ${st.npcs.filter(n => n.pop && n.pop.diary.some(e => e.tag === 'spari' && e.t >= st.t - 40)).length}`);
}

// 5. il catalogo e i verbi tra persone
{
  line(`\n5) ${Object.keys(A.VERBS).length} verbi: ${Object.keys(A.VERBS).join(', ')}.`);
  const a = pop(n => n.tr.legge < .5), r1 = A.intend(st, a, 'ruba', { modo: 'scasso' });
  line(`  ${a.name}, scasso: ${r1.ok ? r1.plan.steps.map(s => s.label).join(' → ') : r1.why}`);
  const b = pop(n => n !== a), r2 = A.intend(st, b, 'scrivi_muro', {});
  line(`  ${b.name}, scrivere su un muro: ${r2.ok ? r2.plan.steps.map(s => s.label).join(' → ') : r2.why}`);
  const c = pop(n => n.pop.money < 3), r3 = c ? A.intend(st, c, 'mangia', {}) : null;
  if (c) line(`  ${c.name} (${Math.round(c.pop.money)}.000 lire, dispensa ${Math.round(c.pop.pantry)}), mangiare: ${r3.ok ? r3.plan.steps.map(s => s.label).join(' → ') : r3.why}`);
  const d = pop(n => n !== a && n !== b), r4 = A.intend(st, d, 'scava', { dove: 'piazza' });
  line(`  ${d.name}, scavare in piazza: ${r4.ok ? 'ok' : 'no: ' + r4.why}`);
}

// 6. qualche giorno di vita normale
const S0 = Object.assign({}, st.pop.stats);
run(days * 1440);
const S = st.pop.stats, dd = k => (S[k] || 0) - (S0[k] || 0);
line(`\n6) ${days} giorni di vita: incontri ${dd('incontri')}, liti ${dd('liti')}, risse ${dd('risse')}, omicidi ${dd('omicidi')}, morti ${dd('morti')}, arrivati ${dd('arrivati')}, corpi spariti ${dd('spariti') + dd('sepolti')}, chiamate alla Guardia ${dd('chiamate')}, incidenti ${dd('incidenti')}, piani ${dd('piani')}.`);
const kinds = {}; st.npcs.forEach(n => n.pop && n.pop.diary.forEach(e => { if (e.t > st.t - days * 1440) { const k = (e.text.match(/^(giocato a \w+|litigato|preso in giro|.*l'ha pres. in giro|.*complimento|.*offerto da bere|.*regalato|fatto a botte|prese un sacco|comprato la roba|rubato da mangiare|scippat|alleggerito|svaligiato|beccat)/) || [])[1]; if (k) kinds[k.replace(/^.*(l'ha pres. in giro)/, 'X l\'ha preso in giro').replace(/^.*(complimento)/, 'complimento').replace(/^.*(offerto da bere)/, 'offerto da bere').replace(/^.*(regalato)/, 'regalo')] = (kinds[k] || 0) + 1; } }));
line('  Nel diario della città: ' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(out.join('\n'));
