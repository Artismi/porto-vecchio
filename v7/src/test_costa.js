// [costa] barche, nuoto e porto: node test_costa.js
global.World = require('./world.js'); global.Interior = require('./interiors.js');
const G = require('./game.js'), W = World;
const st = G.create(7), p = st.player, S = W.SEA;
let ok = true; const check = (c, msg) => { console.log((c ? 'ok   ' : 'NO   ') + msg); if (!c) ok = false; };
const boats = st.vehicles.filter(v => G.VK[v.kind].boat);
check(boats.length >= 10, `barche guidabili: ${boats.length} (${[...new Set(boats.map(b => b.kind))].join(', ')})`);
check(boats.every(b => G.boatM(b.x, b.y)), 'tutte le barche stanno in acqua fonda');
// sale sul gozzo dal Pontile dei gozzi
const g0 = boats.find(b => b.moored === 'pontile_ovest'); const s0 = S.structs.find(q => q.id === 'pontile_ovest');
p.x = s0.pts[0][0] + (g0.x > s0.pts[0][0] ? .6 : -.6); p.y = g0.y; p.vehicle = null;
let r = G.act(st, 'veicolo'); check(p.vehicle === g0.id, `dal pontile si sale sul gozzo: ${r.msg || ''}`);
const run = (n, d) => { for (let i = 0; i < n; i++) G.step(st, 1 / 30, { x: 0, y: 0, drive: d }); };
const a0 = [g0.x, g0.y]; run(30, { thr: 1 }); check(Math.hypot(g0.x - a0[0], g0.y - a0[1]) > .5, `esce dal posto barca di prua (${Math.hypot(g0.x - a0[0], g0.y - a0[1]).toFixed(1)} m)`);
// fuori dal porto: al centro del bacino, poi all'imboccatura, poi al largo (sterzo verso il punto, come col puntatore)
const ad = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const goTo = (x, y, n) => { for (let i = 0; i < n && Math.hypot(g0.x - x, g0.y - y) > 4; i++) run(1, { thr: 1, steer: Math.max(-1, Math.min(1, ad(Math.atan2(y - g0.y, x - g0.x), g0.ang) * 2)) }); return Math.hypot(g0.x - x, g0.y - y); };
const legs = [[g0.x - 4, 207], [978, 226], [1030, 230], [1053, 233], [1066, 262]].map(([x, y]) => goTo(x, y, 900));
check(legs.every(d => d <= 4) && g0.y > 250, `il gozzo esce dal porto dall'imboccatura (${g0.x.toFixed(0)}, ${g0.y.toFixed(0)}; scarti ${legs.map(d => d.toFixed(1)).join(' ')})`);
// dritto verso terra: si ferma contro la riva, non sale
g0.x = 1010; g0.y = 228; g0.ang = -Math.PI / 2; g0.vx = g0.vy = 0; g0.speed = 0; run(200, { thr: 1 });
check(G.boatM(g0.x, g0.y) && g0.y > 192, `contro la Calata si ferma in acqua (y ${g0.y.toFixed(1)})`);
// il motoscafo è più veloce
const mo = boats.find(b => b.kind === 'motoscafo'); if (mo) { p.vehicle = null; g0.rider = null; mo.x = 1060; mo.y = 300; mo.ang = Math.PI / 2; mo.rider = 'player'; p.vehicle = mo.id; mo.vx = mo.vy = 0; mo.speed = 0; run(90, { thr: 1 }); check(mo.speed > 10, `motoscafo al largo: ${mo.speed.toFixed(1)} m/s`); }
// scende in mare aperto: nuota
r = G.act(st, 'veicolo'); G.step(st, 1 / 30, { x: 0, y: 0 }); check(!p.vehicle && p.swim, 'sceso al largo: nuota');
const y0 = p.y; for (let i = 0; i < 60; i++) G.step(st, 1 / 30, { x: 0, y: -1 }); check(p.swim && y0 - p.y > 2 && y0 - p.y < 4.5, `a nuoto va piano (${(y0 - p.y).toFixed(1)} m in 2 s)`);
check(G.fire(st, 0, { x: p.x + 5, y: p.y }, true) === false, 'a nuoto non si spara');
// dalla spiaggia del Lido: entra in acqua e torna
p.x = 1112; p.y = W.southY(1112) - 4; p.swim = false; for (let i = 0; i < 120; i++) G.step(st, 1 / 30, { x: 0, y: 1 }); check(p.swim, `dalla spiaggia si entra in mare (y ${p.y.toFixed(1)})`);
for (let i = 0; i < 200; i++) G.step(st, 1 / 30, { x: 0, y: -1 }); check(!p.swim, 'e si torna a riva');
// i png non entrano in acqua
check(!G.walkM(1010, 228), 'per chi cammina il mare resta chiuso');
// posti barca: nessuna barca dentro un'altra o sulla terra
const ms = S.moorings.filter(m => m.kind !== 'secca' && m.kind !== 'nave'); let bad = 0;
ms.forEach(m => { if (!G.boatM(m.x, m.y)) bad++; }); check(!bad, `posti barca in acqua: ${ms.length - bad}/${ms.length}`);
['molo', 'pontile', 'lanterna', 'marina', 'molo_levante', 'scogli_1', 'bagno_0'].forEach(id => { const q = W.PLACES[id]; check(q && W.reach[q.ty * W.GW + q.tx], `${id} raggiungibile a piedi (${q && q.name})`); });
console.log(ok ? 'TUTTO BENE' : 'QUALCOSA NON VA'); process.exit(ok ? 0 : 1);
