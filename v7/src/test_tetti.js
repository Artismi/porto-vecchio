// prova dei tetti: le scale, salire e scendere, camminare sopra, il bordo, il salto fra due tetti, la caduta
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
const G = Game, T = Tetti, LV = Livelli, st = G.create(1), p = st.player, TS = G.TS, B = G.BUILDINGS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, run = (s, inp) => { for (let i = 0; i < s * 30; i++) G.step(st, DT, Object.assign({ x: 0, y: 0 }, typeof inp === 'function' ? inp(i) : inp)); };
const clear = () => st.npcs.forEach(n => { if (Math.hypot(n.x - p.x, n.y - p.y) < 30) { n.x = p.x + 80; n.y = p.y; n.path = []; } });
const calm = () => { p.hp = 100; p.stun = 0; p.kbx = p.kby = 0; st.police = []; st.heat = 0; };

const withL = new Set(T.LADDERS.map(L => L.bi)), all = B.filter(b => !b.lighthouse).length;
console.log(`scale: ${T.LADDERS.length} su ${withL.size} edifici (di ${all})`);
ok(withL.size / all > .9, `quasi ogni edificio ha la sua scala (${withL.size}/${all})`);
ok(T.LADDERS.every(L => L.footB >= 0 || G.walkT(Math.floor(L.fx / TS), Math.floor(L.fy / TS))), 'i piedi delle scale da terra stanno su caselle percorribili');
ok(T.LADDERS.every(L => { const b = B[L.bi]; if (!b.door) return true; return Math.hypot(L.fx - (b.door[0] + .5) * TS, L.fy - (b.door[1] + .5) * TS) > 2.5; }), 'nessuna scala davanti a una porta');

// una casa di due o tre piani con la scala da terra e un vicino oltre un vicolo stretto
const L = T.LADDERS.find(L => L.footB < 0 && B[L.bi].fl >= 2 && B[L.bi].w >= 3 && B[L.bi].h >= 3);
const b = B[L.bi]; console.log(`casa: ${b.id} (${b.fl} piani) scala sul lato ${L.f}`);
p.x = L.fx; p.y = L.fy; p.lv = null; p.indoor = null; calm(); clear();
const ctx = G.context(st).find(c => c.key === 'V'); ok(ctx && /Sali/.test(ctx.label), `il suggerimento: «V: ${ctx && ctx.label}»`);
const m = LV.key(st, 'v'); ok(p.lv && p.lv.k === 'scala', `V ai piedi della scala: ${m}`);
run(1, {}); const hMid = LV.heightOf(st, p); ok(hMid > 0.5 && p.lv.k === 'scala', `a metà scala, a ${hMid.toFixed(1)} m`);
run(8, {}); ok(p.lv && p.lv.k === 'tetto' && p.lv.b === L.bi, 'in cima: sul tetto');
const top = T.roofRule(b); ok(Math.abs(LV.heightOf(st, p) - top) < .01, `i piedi alla quota del tetto (${top.toFixed(1)} m)`);
ok(p.onRoof === true, 'p.onRoof per la roba sui tetti');

// camminare sul tetto fino al bordo opposto: il bordo ferma
const cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS, dx = cx - p.x, dy = cy - p.y, dl = Math.hypot(dx, dy);
run(6, { x: dx / dl, y: dy / dl });
const inside = x => x.x >= b.x * TS - .01 && x.x <= (b.x + b.w) * TS + .01 && x.y >= b.y * TS - .01 && x.y <= (b.y + b.h) * TS + .01;
ok(p.lv && p.lv.k === 'tetto' && inside(p), `si cammina sul tetto e il bordo ferma (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
ok(!(p.jz > 0) && p.hp === 100, 'nessuna caduta camminando');

// tornare alla scala e scendere
p.x = L.tx; p.y = L.ty; const ctx2 = G.context(st).find(c => c.key === 'V'); ok(ctx2 && /Scendi/.test(ctx2.label), `in cima alla scala: «V: ${ctx2 && ctx2.label}»`);
LV.key(st, 'v'); run(8, {}); ok(!p.lv && Math.hypot(p.x - L.fx, p.y - L.fy) < .1, 'scesi: di nuovo in strada ai piedi della scala');

// due tetti alla stessa quota separati da un vicolo di una casella: si salta
let pair = null;
for (const a of B) { if (pair) break; if (a.lighthouse || a.kiosk) continue;
  for (const c of B) { if (c === a || c.lighthouse || c.kiosk) continue; if (Math.abs(T.roofRule(a) - T.roofRule(c)) > .3) continue;
    if (c.x === a.x + a.w + 1 && c.y < a.y + a.h - 1 && c.y + c.h > a.y + 1) { const y0 = Math.max(a.y, c.y) + 1, y1 = Math.min(a.y + a.h, c.y + c.h) - 1; if (y1 > y0) { pair = { a, c, y: (y0 + y1) / 2 * TS }; break; } } } }
ok(!!pair, pair ? `due tetti oltre un vicolo: ${pair.a.id} → ${pair.c.id}` : 'due tetti oltre un vicolo');
if (pair) {
  const { a, c } = pair, ai = B.indexOf(a), h = T.roofRule(a);
  p.lv = { k: 'tetto', b: ai, h }; p.x = (a.x + a.w) * TS - 1.2; p.y = pair.y; calm(); p.jz = 0; p.jvz = 0;
  run(1.5, { x: 1, y: 0 }); ok(p.lv && p.lv.b === ai && p.x < (a.x + a.w) * TS, 'camminando ci si ferma sul bordo del vicolo');
  G.jumpHold(st, true); run(.7, {}); G.jumpHold(st, false); run(1.4, i => ({ x: 1, y: 0, sprint: true }));
  ok(p.lv && p.lv.k === 'tetto' && p.lv.b === B.indexOf(c), `di corsa, con Spazio, si salta sull'altro tetto (x ${p.x.toFixed(1)}, vicolo ${(a.x + a.w) * TS}–${c.x * TS}, ${p.lv ? p.lv.k + ' ' + p.lv.b : 'a terra'})`);
  ok(p.hp === 100, 'atterraggio pulito');
}

// buttarsi giù da un tetto alto: ci si fa male
const tall = B.find(b => b.fl >= 3 && T.LADDERS.some(L => L.bi === B.indexOf(b) && L.footB < 0));
if (tall) {
  const L2 = T.LADDERS.find(L => L.bi === B.indexOf(tall) && L.footB < 0), h = T.roofRule(tall);
  p.lv = { k: 'tetto', b: L2.bi, h }; p.x = L2.tx; p.y = L2.ty; calm(); clear();
  const ox = L2.ox, oy = L2.oy; G.jumpHold(st, true); run(.3, {}); G.jumpHold(st, false); run(3, { x: ox, y: oy });
  ok(!p.lv, 'saltando oltre il bordo si cade in strada');
  ok(p.hp < 100 || h - T.roofRule({ base: 0 }) < 4.5, `una caduta da ${Math.round(h)} m fa male (vita ${p.hp})`);
}

console.log(fail ? `\n${fail} prove fallite` : '\ntutto bene');
process.exit(fail ? 1 : 0);
