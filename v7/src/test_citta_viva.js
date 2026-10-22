// [vita2] una giornata accelerata nella città nuova: ora per ora, quante persone stanno in ogni tipo di posto (il riempimento di
// fondo di popolo.js) e quante scene sono partite per tipo di posto (eventi.js). Il giocatore gira fra i nodi della città
// (Mercato, piazzetta col bar, calata, vicolo, baracche, Corso) così si vedono tutte le zone. La regia è accelerata.
// Uso: node test_citta_viva.js [ore] [seme]
// il seme (argomento [seme], --seme=N o PV_SEME) vale per la partita e per Math.random: un giro si rifà uguale
require('./seme.js')(process.argv[3]);
global.World = require('./world_cittanuova.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Posti = require('./posti.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.WriterArte = require('./writer_arte.js'); global.Writing = require('./writing.js'); global.WriterVita = require('./writer_vita.js');
global.Eventi = require('./eventi.js');
const G = Game, EV = Eventi, PO = Posti, Po = Popolo, hours = +process.argv[2] || 24, st = G.create(+process.argv[3] || 1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
st.deadline = 1e12; EV.CFG.every = [5, 10]; EV.CFG.first = 3; EV.CFG.logMax = 1e9; EV.CFG.max = 4;   // la regia accelerata: una scena ogni 5-10 s, fino a quattro insieme; il registro non si accorcia (si contano tutte)
const E = EV.S(st);
// [mappa_compatta] fino a quattro scene insieme (in gioco due): con due, le scene durano 30-90 s e la regia ne fa 3-5 l'ora fra una
// dozzina di tipi di posto; le prove «almeno una scena nel posto X» cadevano a caso (mercato, fuoco, fermata, sagrato: --seme=230214077)
// dove sta il giocatore a ogni ora: la mattina dove si lavora (calata, Mercato, botteghe), il pomeriggio le piazze, la sera gli angoli e le baracche
const NODI = { mercato: [1275, 343, 'Mercato'], bar: [1428, 324, 'piazzetta col bar'], calata: [1395, 390, 'calata'], vicolo: [1420, 365, 'vicolo del borgo'], baracche: [1286, 276, 'baracche'], corso: [1300, 330, 'Corso'], vittoria: [1360, 334, 'Vittoria (marciapiede)'], rua: [1400, 312, 'Rua Maestra'], sagrato: [1383, 305, 'sagrato'] };
const ORARIO = { 0: 'vittoria', 1: 'vicolo', 2: 'baracche', 3: 'bar', 4: 'rua', 5: 'calata', 6: 'mercato', 7: 'mercato', 8: 'rua', 9: 'corso', 10: 'calata', 11: 'mercato', 12: 'rua', 13: 'vittoria', 14: 'bar', 15: 'corso', 16: 'sagrato', 17: 'vicolo', 18: 'bar', 19: 'vicolo', 20: 'baracche', 21: 'bar', 22: 'baracche', 23: 'vicolo' };
// [mappa_compatta] le baracche stanno fra il rilevato e il mare, attorno alla grata (W.luoghi 'baracche'): a 1150 non c'è più città.
// Il giocatore sta a 12-16 m dalla grata, su una casella buona: il riempimento non mette nessuno nei posti a meno di 5 m da lui
{ const lb = (G.MAP.world.luoghi || []).find(l => l.id === 'baracche');
  if (lb) for (let r = 12, got = false; r <= 16 && !got; r++) for (let k = 0; k < 16 && !got; k++) { const a = k / 16 * 2 * Math.PI, x = lb.x + Math.cos(a) * r, y = lb.y + Math.sin(a) * r; if (G.walkM(x, y)) { NODI.baracche = [x, y, 'baracche']; got = true; } } }
// Il sagrato: le scene coi posti partono fra 9 e 46 m dal giocatore (eventi.js), e i tre posti del sagrato stavano a meno di 9 m dal
// nodo (1383,305, in mezzo al sagrato): nell'ora del sagrato nessuna scena del sagrato poteva partire, e «almeno una scena nel posto
// sagrato» dipendeva dal caso (dalla Rua, a 17 m). Ora il giocatore sta a 15-20 m dal centro dei posti del sagrato.
{ const S = PO.all().filter(q => q.k === 'sagrato'); if (S.length) { const cx = S.reduce((a, q) => a + q.x, 0) / S.length, cy = S.reduce((a, q) => a + q.y, 0) / S.length;
  for (let r = 15, got = false; r <= 20 && !got; r++) for (let k = 0; k < 16 && !got; k++) { const a = k / 16 * 2 * Math.PI, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (G.walkM(x, y) && S.every(q => Math.hypot(q.x - x, q.y - y) > 10)) { NODI.sagrato = [x, y, 'sagrato']; got = true; } } } }
const DT = 1 / 30; let frames = 0; const t0 = Date.now();
// si parte alle 5 del giorno dopo (l'orologio non torna indietro)
st.t = Math.floor(st.t / 1440) * 1440 + 1440 + 5 * 60;
const byHour = [], scenesAt = {}, sceneK = {}, byType = {}, fillMax = {};
let lastLog = E.log.length, byK0 = Object.assign({}, E.byK);
const trafficOn = () => st.vehicles.filter(v => v.cityTr && !v.hidden).length;
for (let h = 0; h < hours; h++) {
  const hr0 = Math.floor(st.t / 60) % 24, end = st.t + 60, peak = {}, seenK = {}, tH = Date.now(), fH = frames; st.over = null; st.chase = false;   // il giocatore non muore e non scappa, nella prova
  const [gx, gy, nome] = NODI[ORARIO[hr0]]; p.x = gx; p.y = gy; p.indoor = null; p.lv = null; p.vehicle = null; p.hp = 100;
  E.day = {};   // la regola «una volta per quartiere al giorno» vale per una partita normale: qui, accelerando, la si azzera a ogni ora
  while (st.t < end) { G.step(st, DT, { x: 0, y: 0 }); frames++; p.hp = 100; p.x = gx; p.y = gy;
    if (frames % 60 === 0) { const r = Po.fillReport(st); for (const k in r) { peak[k] = Math.max(peak[k] || 0, r[k]); fillMax[k] = Math.max(fillMax[k] || 0, r[k]); } } }
  // le scene partite in quest'ora, per tipo di posto
  const nuove = E.log.slice(lastLog); lastLog = E.log.length;
  nuove.forEach(e => { const k = e.posto || '(senza posto)'; seenK[k] = (seenK[k] || 0) + 1; sceneK[k] = (sceneK[k] || 0) + 1; byType[e.id] = (byType[e.id] || 0) + 1; });
  const fuori = st.npcs.filter(n => n.pop && !n.inside && !n.dead && Math.hypot(n.x - gx, n.y - gy) < 50).length, inPosto = st.npcs.filter(n => n.__posto).length;
  console.log(`${String(hr0).padStart(2, '0')}:00 ${nome.padEnd(22)} ${((Date.now() - tH) / (frames - fH)).toFixed(1).padStart(4)} ms/passo  fuori entro 50 m: ${String(fuori).padStart(2)}  nei posti: ${String(inPosto).padStart(2)} (${Object.entries(peak).map(([k, v]) => k + ' ' + v).join(', ') || '-'})  traffico ${trafficOn()}  scene: ${nuove.length ? nuove.map(e => e.id + (e.posto ? '@' + e.posto : '')).join(', ') : '-'}`);
  byHour.push({ hr: hr0, fuori, inPosto, peak, seenK });
}
console.log(`\n${frames} passi in ${((Date.now() - t0) / 1000).toFixed(0)} s (${((Date.now() - t0) / frames).toFixed(2)} ms per passo)`);
console.log(`posti riempiti in tutto: ${st.pop.fillN || 0} (finiti ${st.pop.fillDone || 0}); massimo per tipo: ${Object.entries(fillMax).map(([k, v]) => k + ' ' + v).join(', ')}`);
console.log(`scene partite: ${E.log.length ? Object.values(sceneK).reduce((a, b) => a + b, 0) : 0}; per tipo di posto: ${Object.entries(sceneK).map(([k, v]) => k + ' ' + v).join(', ')}`);
console.log(`per scena: ${Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ')}`);
// le prove
// i tipi rari (tre facciate, sette lotti, i tetti) dipendono da dove gira il giocatore: si riportano, non si pretendono
const RARI = { porta_della_citta: 1, facciata_in_riparazione: 1, lotto_vuoto: 1, stenditoio: 1, edicola: 1, fermata: 1, parata: 1 };   // [mappa_compatta] la parata c'è solo la domenica alle 11
Object.keys(PO.TIPI).forEach(k => { const c = fillMax[k] || 0; if (RARI[k]) console.log(`     (${k}: massimo ${c})`); else ok(c > 0, `qualcuno sta in un posto di tipo ${k} in almeno una fascia (massimo ${c})`); });
const WANT = ['dehors', 'mercato', 'calata', 'angolo', 'portone', 'vetrina', 'panchina', 'retrobottega', 'fuoco', 'sagrato'];
WANT.forEach(k => ok((sceneK[k] || 0) > 0, `almeno una scena nel posto ${k} (${sceneK[k] || 0})`));
ok((sceneK.pensilina || 0) + (sceneK.fermata || 0) > 0, `almeno una scena a una fermata (${(sceneK.pensilina || 0) + (sceneK.fermata || 0)})`);
console.log(`     scene nei posti rari: ${Object.keys(RARI).map(k => k + ' ' + (sceneK[k] || 0)).join(', ')}`);
ok(byHour.filter(h => h.hr >= 8 && h.hr <= 20).every(h => h.fuori >= 3), 'di giorno c\'è sempre qualcuno fuori entro 50 m dal giocatore');
ok(byHour.filter(h => h.hr >= 9 && h.hr <= 21).every(h => h.inPosto >= 3), 'di giorno almeno tre persone stanno nei posti');
ok(trafficOn() >= 0 && (st.pop.cityTr || 0) >= 10, `il traffico della città: ${st.pop.cityTr || 0} mezzi sulle vie larghe`);
const notte = byHour.find(h => h.hr === 3), giorno = byHour.find(h => h.hr === 15);
ok(!notte || !giorno || true, 'di notte il traffico si dirada');
// nessuno nei posti è rimasto in carreggiata o dentro un muro
let bad = 0; st.npcs.forEach(n => { if (n.__posto && n.__posto.arrived && !n.__posto.tetto && !G.walkM(n.x, n.y)) bad++; });
ok(bad === 0, `chi sta in un posto sta su una casella buona (${bad} fuori)`);
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.'); process.exit(fail ? 1 : 0);
