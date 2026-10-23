// [vita2] prova dei posti per le situazioni: dalla città nuova (PV_CITTANUOVA=0 per la mappa vecchia) si contano i posti per tipo
// e si controlla che stiano su caselle percorribili, non in carreggiata, non dentro le case (gli stenditoi: sui tetti),
// che la disposizione delle persone sia su caselle buone, e che ogni tipo abbia almeno un posto. Uso: node test_posti.js
const CN = process.env.PV_CITTANUOVA !== '0';
global.World = require(CN ? './world_cittanuova.js' : './world.js'); global.Interior = require('./interiors.js'); global.Game = require('./game.js');
global.Tetti = require('./tetti.js'); global.Posti = require('./posti.js');
const G = Game, P = Posti, T = G.T;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const t0 = Date.now(), all = P.all(); console.log(`${all.length} posti in ${Date.now() - t0} ms (${CN ? 'città nuova' : 'mappa vecchia'})`);
const cnt = P.count(); console.log('  per tipo: ' + Object.entries(cnt).map(([k, v]) => `${k} ${v}`).join(', '));
const zone = {}; all.forEach(p => zone[p.zona] = (zone[p.zona] || 0) + 1); console.log('  per zona: ' + Object.entries(zone).map(([k, v]) => `${k} ${v}`).join(', '));
// ogni tipo c'è
const need = CN ? Object.keys(P.TIPI) : ['dehors', 'panchina', 'mercato', 'portone', 'vetrina'];
need.forEach(k => ok((cnt[k] || 0) > 0, `${k}: ${cnt[k] || 0}`));
if (CN) { ok(cnt.facciata_in_riparazione >= 2 && cnt.facciata_in_riparazione <= 3, 'facciate in riparazione: 2-3'); ok(cnt.fuoco >= 3, 'fuochi fra le baracche: almeno 3'); ok(cnt.mercato === 8, 'otto banchi al Mercato'); ok(cnt.porta_della_citta >= 3, 'porte della città: almeno 3'); }
// dove stanno
const bad = { via: [], muro: [], acqua: [], tetto: [] };
all.forEach(p => {
  const tx = Math.floor(p.x / G.TS), ty = Math.floor(p.y / G.TS), v = G.tileAt(tx, ty);
  if (p.tetto) { if (v !== T.BLD) bad.tetto.push(p.id); return; }
  if (v === T.VIA) bad.via.push(p.id); if (v === T.BLD) bad.muro.push(p.id); if (v === T.WATER) bad.acqua.push(p.id);
  if (!G.walkM(p.x, p.y)) bad.muro.push(p.id + '!');
});
ok(!bad.via.length, `nessun posto in carreggiata${bad.via.length ? ': ' + bad.via.slice(0, 6).join(' ') : ''}`);
ok(!bad.muro.length, `nessun posto dentro una casa${bad.muro.length ? ': ' + bad.muro.slice(0, 6).join(' ') : ''}`);
ok(!bad.acqua.length, `nessun posto in acqua${bad.acqua.length ? ': ' + bad.acqua.slice(0, 6).join(' ') : ''}`);
ok(!bad.tetto.length, `gli stenditoi stanno sui tetti${bad.tetto.length ? ': ' + bad.tetto.slice(0, 6).join(' ') : ''}`);
// le direzioni sono numeri, le ore hanno senso
ok(all.every(p => Number.isFinite(p.dir)), 'ogni posto guarda da qualche parte');
ok(all.every(p => Array.isArray(p.h) && p.h.every(r => r[0] < r[1])), 'ogni posto ha le sue ore');
// la disposizione: tutte le persone su caselle dove si può stare, mai due nello stesso punto, mai in fila lungo la visuale
let slotsBad = 0, same = 0, inLine = 0; const cd = P.camDir();
all.filter(p => !p.tetto).forEach(p => {
  const S = P.slots(p, Math.min(4, p.cap)); S.forEach(s => { if (!P.standM(s.x, s.y)) slotsBad++; });
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) { const dx = S[j].x - S[i].x, dy = S[j].y - S[i].y, d = Math.hypot(dx, dy); if (d < .5) same++; else if (Math.abs(dx * cd.x + dy * cd.y) / d > .96 && d < 1.2) inLine++; }
});
ok(slotsBad === 0, `le persone disposte stanno su caselle buone (${slotsBad} fuori)`);
ok(same <= all.length * .02, `quasi mai due persone nello stesso punto (${same})`);
ok(inLine <= all.length * .05, `quasi mai due persone in fila lungo la visuale a meno di 1,2 m (${inLine})`);
// le ore: il mercato solo nei giorni di mercato, i fuochi la sera, i dehors non all'alba
const MIN = (d, h) => d * 1440 + h * 60;
ok(P.ofType('mercato').every(p => P.openAt(p, MIN(1, 9)) && !P.openAt(p, MIN(5, 9)) && !P.openAt(p, MIN(1, 15))), 'il mercato coperto: vivo alle 9 nei giorni feriali, non la domenica né il pomeriggio');
ok(P.ofType('fuoco').every(p => P.openAt(p, MIN(0, 21)) && P.openAt(p, MIN(0, 1)) && !P.openAt(p, MIN(0, 10))), 'i fuochi: la sera e la notte, non la mattina');
ok(P.ofType('dehors').every(p => !P.openAt(p, MIN(0, 5))), 'i dehors chiusi alle 5');
// la ricerca attorno a un punto
if (CN) { const q = P.near(1428, 324, 30, 'dehors'); ok(q.length > 0, `dehors attorno alla piazzetta col bar: ${q.length} (il più vicino a ${q[0] ? q[0].__d.toFixed(1) : '-'} m)`);
  const MK = (World.sets || []).find(s => s.k === 'mercato') || { x: 1275, y: 343 }, m = P.near(MK.x, MK.y, 20, 'mercato'); ok(m.length === 8, `banchi al Mercato (${Math.round(MK.x)},${Math.round(MK.y)}): ${m.length}`);   // [pianta] il mercato è sceso sulla spianata
  const c = P.near(1395, 390, 40, 'calata'); ok(c.length >= 3, `posti sulla calata: ${c.length}`); }
// un esempio per tipo
Object.keys(cnt).forEach(k => { const p = P.ofType(k)[0]; console.log(`  ${k.padEnd(24)} ${p.x.toFixed(0)},${p.y.toFixed(0)} dir ${p.dir.toFixed(2)} cap ${p.cap} ore ${JSON.stringify(p.h)} zona ${p.zona}${p.nome ? ' «' + p.nome + '»' : ''}${p.uso ? ' (' + p.uso + ')' : ''}`); });
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.'); process.exit(fail ? 1 : 0);
