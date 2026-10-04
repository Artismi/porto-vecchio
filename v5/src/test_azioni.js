// Prova delle azioni e degli imprevisti, senza grafica. Uso (dalla cartella src): node test_azioni.js [giorni] [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
const G = Game, A = Azioni, days = +process.argv[2] || 3, seed = +process.argv[3] || 1;
const out = [], line = s => out.push(s), clk = t => `${['mar', 'mer', 'gio', 'ven', 'sab', 'dom', 'lun'][Math.floor(t / 1440) % 7]} ${G.clockStr(t)}`;
const st = G.create(seed);
const run = mins => { const end = st.t + mins; while (st.t < end) G.step(st, 1 / 30, {}); };
const diaryOf = (n, from, re) => n.pop.diary.filter(e => e.t >= from && (!re || re.test(e.text))).map(e => `    ${clk(e.t)} ${e.text}`);
const plansNow = () => st.npcs.filter(n => n.pop && n.pop.emer).map(n => `    ${n.name}: ${n.pop.emer.label} → ${n.pop.emer.steps[n.pop.emer.i] ? n.pop.emer.steps[n.pop.emer.i].label : '-'}`);

// 1. un omicidio lontano dal giocatore: un balordo ammazza qualcuno al mercato del mercoledì
run(1440 + 10 * 60 - st.t + 18 * 60 - 18 * 60);   // mercoledì 10:00 circa
const atPiazza = st.npcs.filter(n => n.pop && !n.dead && n.pop.at && n.pop.at.label && /Piazza San Rocco/.test(n.pop.at.label) && !n.pop.cast);
const killer = st.npcs.find(n => n.pop && !n.pop.cast && n.pop.giro && n.pop.giro !== 'orecchio' && !n.dead) || atPiazza[0];
const victim = atPiazza.find(n => n !== killer) || st.npcs.find(n => n.pop && !n.pop.cast && n !== killer);
killer.x = victim.x; killer.y = victim.y; killer.pop.at = victim.pop.at;
line(`1) ${clk(st.t)}: ${killer.name} (${killer.pop.giro || killer.role}) uccide ${victim.name} a ${victim.pop.at ? victim.pop.at.label : '?'}. In piazza ci sono ${atPiazza.length} persone.`);
const t1 = st.t;
A.kill(st, killer, victim, 'con un coltello');
run(2);
line('  Reazioni subito:'); plansNow().forEach(l => line(l));
run(6 * 60);
const c1 = st.npcs.find(c => c.corpse && c.corpse.of === victim.id);
line(`  Dopo 6 ore: il corpo è ${c1.corpse.gone ? 'stato portato via (' + c1.corpse.gone + ')' : c1.corpse.buried ? 'sepolto in ' + c1.corpse.buried.place : c1.corpse.carriedBy ? 'portato via da ' + G.nameOf(st, c1.corpse.carriedBy) : 'ancora lì'}. Chi l'ha visto: ${Object.keys(c1.corpse.seen).length}.`);
line(`  ${killer.name}: ${killer.jailedUntil > st.t ? 'in cella' : 'libero'}.`); diaryOf(killer, t1).forEach(l => line(l));
st.npcs.filter(n => n.pop && n !== killer && n.pop.diary.some(e => e.t >= t1 && /(ucciso|uccidere|corpo|cadavere|morto|morire)/.test(e.text))).slice(0, 8).forEach(n => { line(`  — ${n.name}`); diaryOf(n, t1, /(ucciso|uccidere|corpo|cadavere|morto|morire|telefon|Guardia|piange|scappa|Zia|tasche)/).slice(0, 3).forEach(l => line(l)); });
run(5 * 60);
line(`  ${victim.name} dopo: ${victim.dead ? 'ancora morto' : 'rinato'}; diario: ${victim.pop.diary.map(e => e.text).slice(0, 2).join(' | ')}`);

// 2. davanti al giocatore: un omicidio di notte, il complice fa sparire il corpo
const pz = G.PLACES.sentiero || G.PLACES.macchia || G.PLACES.vico;
st.player.x = pz.x + 3; st.player.y = pz.y + 2;
const k2 = st.npcs.find(n => n.pop && !n.pop.cast && n.tr.legge < .4 && n.tr.cor > .55 && !n.dead && n !== killer && n.jailedUntil <= st.t) || st.npcs.find(n => n.pop && !n.dead && n !== killer);
const v2 = st.npcs.find(n => n.pop && !n.pop.cast && !n.dead && n !== k2 && n !== killer && n !== victim && n.pop.hh !== k2.pop.hh && !(k2.pop.friends || []).includes(n.id));
k2.tr.legge = .1; k2.tr.cor = .9; k2.pop.need.paura = 0;
[k2, v2].forEach((n, i) => { n.x = pz.x + i * .8; n.y = pz.y; n.inside = false; n.pop.at = Popolo._.target('sentiero') || null; n.pop.near = true; n.pop.lod = 'vicino'; });
const t2 = st.t;
line(`\n2) ${clk(st.t)}: davanti al giocatore, ${k2.name} uccide ${v2.name} a ${pz.name}.`);
A.kill(st, k2, v2, 'a coltellate');
run(1);
line('  Reazioni:'); plansNow().forEach(l => line(l));
const c2pre = st.npcs.find(c => c.corpse && c.corpse.of === v2.id);
if (!k2.pop.emer || k2.pop.emer.kind !== 'nasconde') { A.planHide(st, k2, c2pre); line(`  (per la prova: ${k2.first} decide comunque di far sparire il corpo)`); }
const c2 = st.npcs.find(c => c.corpse && c.corpse.of === v2.id);
let carriedSeen = false, steps = 0;
let lastStep = '';
while (st.t < t2 + 8 * 60) { G.step(st, 1 / 30, {}); steps++; const E = k2.pop.emer, sl = E ? E.steps[E.i] && E.steps[E.i].label + (E.phase === 'go' ? ' (in cammino)' : '') : 'nessun piano'; if (sl !== lastStep) { lastStep = sl; line(`    ${clk(st.t)} ${k2.first}: ${sl}`); } if (c2.corpse.carriedBy && !carriedSeen) { carriedSeen = true; line(`  ${clk(st.t)} ${G.nameOf(st, c2.corpse.carriedBy)} solleva il corpo (si sposta con lui: ${c2.x.toFixed(0)},${c2.y.toFixed(0)}).`); } }
line(`  Dopo 8 ore: il corpo è ${c2.corpse.gone ? 'stato portato via (' + c2.corpse.gone + ')' : c2.corpse.buried ? 'sepolto in ' + c2.corpse.buried.place + ' da ' + G.nameOf(st, c2.corpse.buried.by) : 'ancora lì'}.`);
diaryOf(k2, t2).forEach(l => line(l));

// 3. un incidente: il giocatore tampona un'auto del traffico
const car = st.vehicles.find(v => v.traffic);
const mine = st.vehicles.find(v => !v.traffic && !v.military && v.kind !== 'camion' && !v.rider);
let tries = 0, spawned = null;
while (!spawned && tries < 6) {
  tries++;
  mine.x = car.x - Math.cos(car.ang) * 3; mine.y = car.y - Math.sin(car.ang) * 3; mine.ang = car.ang; mine.rider = 'player'; st.player.vehicle = mine.id; st.player.x = mine.x; st.player.y = mine.y;
  car.traffic = true; car.looseUntil = st.clock + 2; car._crashSeen = 0; car._crashT = -99; car.hp = 40;
  G.step(st, 1 / 30, {});
  spawned = st.npcs.find(n => n.driverOf === car.id);
  if (!spawned) { line(`\n3) tentativo ${tries}: il guidatore ha tirato dritto (poco coraggio).`); }
}
if (spawned) {
  line(`\n3) ${clk(st.t)}: il giocatore tampona ${car.kind}. Scende ${spawned.name} (coraggio ${spawned.tr.cor.toFixed(2)}, rabbia ${spawned.pop.need.rabbia.toFixed(2)}): ${spawned.pop.emer ? spawned.pop.emer.label : 'niente'}.`);
  st.player.vehicle = null; mine.rider = null;
  const hp0 = st.player.hp; for (let i = 0; i < 30 * 20; i++) G.step(st, 1 / 30, {});
  line(`  Dopo 20 secondi: vita del giocatore ${Math.round(hp0)} → ${Math.round(st.player.hp)}; ${spawned.name}: ${spawned.pop.emer ? spawned.pop.emer.label : 'piano finito'}.`);
}

// 4. qualche giorno di vita normale
const S0 = Object.assign({}, st.pop.stats);
run(days * 1440);
const S = st.pop.stats, d = k => (S[k] || 0) - (S0[k] || 0);
line(`\n4) ${days} giorni di vita: liti ${d('liti')}, risse ${d('risse')}, omicidi ${d('omicidi')}, morti ${d('morti')}, rinati ${d('rinati')}, sepolti ${d('sepolti')}, chiamate alla Guardia ${d('chiamate')}, telefonate ${d('telefonate')}, incidenti ${d('incidenti')}, reazioni ${d('reazioni')}.`);
const lit = []; st.npcs.forEach(n => n.pop && n.pop.diary.forEach(e => { if (/litigato|botte|ucciso|seppellito|regolare|lezione/.test(e.text) && e.t > st.t - days * 1440) lit.push(`${clk(e.t)} ${n.first}: ${e.text}`); }));
lit.sort().slice(0, 25).forEach(l => line('    ' + l));
console.log(out.join('\n'));
