// misura NPC<->NPC: un giorno di gioco, giocatore che gira in piazza (come test_commedia), ?commedia acceso
const SRC = '/home/user/porto-vecchio/v7/src/'; process.chdir(SRC);
require(SRC + 'seme.js')(process.argv[2] || 1);
global.location = { search: '?commedia' };
const _log = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) _log(...a); };
global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti'];
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { _log('(manca ' + f + ': ' + e.message.slice(0, 90) + ')'); } }
global.Commedia = require(SRC + 'commedia.js');
global.Parola = require(SRC + 'parola.js');
const G = Game, Po = Popolo;
const st = G.create(+process.argv[2] || 1), p = st.player, DT = 1 / 20;
st.deadline = 1e12;
const MIN = +(process.argv[3] || 1440);
const t0g = st.t;
// registro note fra NPC
const NOTES = [];
const hookDiary = n => { const P = n.pop; if (!P || !P.diary || P.diary.__h) return; P.diary.__h = 1; const D = P.diary; D.push = function (e) { if (e && e.who && e.who !== 'player') NOTES.push({ t: e.t, a: n.id, b: e.who, tag: e.tag || '', kind: e.kind, text: e.text }); return Array.prototype.push.call(this, e); }; };
let Pz = G.PLACES.piazza; p.x = Pz.x; p.y = Pz.y + 2;
const seen = new WeakSet(), L = []; let wp = null;
const nearPl = n => Math.hypot(n.x - p.x, n.y - p.y);
const s0 = JSON.parse(JSON.stringify(st.pop ? st.pop.stats : {}));
const t0 = Date.now(); let steps = 0;
const GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(k => G.PLACES[k]).filter(Boolean); let tappa = 0, lastSw = st.clock;
while (st.t < t0g + MIN) {
  if (steps % 200 === 0) st.npcs.forEach(hookDiary);
  if (st.clock - lastSw > 120) { lastSw = st.clock; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
  if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * 25; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
  const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
  G.step(st, DT, { x: dx / dd, y: dy / dd }); steps++;
  for (const n of st.npcs) {
    if (!n.bark || n.dead || seen.has(n.bark)) continue; seen.add(n.bark);
    const d = nearPl(n); if (d >= 26 || n.inside) continue;
    L.push({ c: st.clock, t: st.t, id: n.id, first: n.first, text: String(n.bark.text || ''), x: n.x, y: n.y, ev: !!n.__ev });
  }
}
const ms = (Date.now() - t0) / steps;
// coppie: B risponde entro 6 s reali a un A entro 5 m
const byId = id => st.npcs.find(n => n.id === id);
const firstNames = new Set(st.npcs.map(n => n.first).filter(Boolean));
let coppie = [], aNome = 0, conCons = 0;
for (let i = 0; i < L.length; i++) { const b = L[i]; for (let j = i - 1; j >= 0 && b.c - L[j].c < 6; j--) { const a = L[j]; if (a.id === b.id) continue; if (Math.hypot(a.x - b.x, a.y - b.y) < 5) { coppie.push([a, b]); break; } } }
const scene = coppie.filter(([a, b]) => a.ev || b.ev).length;
coppie.forEach(([a, b]) => {
  const A = byId(a.id), B = byId(b.id);
  if ((B && a.text.includes(B.first)) || (A && b.text.includes(A.first))) aNome++;
  if (NOTES.some(x => ((x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id)) && Math.abs(x.t - a.t) <= 3)) conCons++;
});
// battute singole che nominano un altro NPC presente (entro 5 m)
let nominaPresente = 0, nominaTerzo = 0;
L.forEach(l => { const ws = l.text.match(/[A-ZÀ-Ý][a-zà-ÿ]+/g) || []; const nm = ws.filter(w => firstNames.has(w) && w !== l.first && w !== (G.PLAYER_NAME || 'Nino')); if (!nm.length) return; const pres = st.npcs.some(k => k.id !== l.id && nm.includes(k.first) && Math.hypot(k.x - l.x, k.y - l.y) < 5); if (pres) nominaPresente++; else nominaTerzo++; });
const s1 = st.pop.stats, diff = {}; Object.keys(s1).forEach(k => { if (typeof s1[k] === 'number') diff[k] = +(s1[k] - (s0[k] || 0)).toFixed(1); });
const tagC = {}; NOTES.forEach(x => tagC[x.tag || '-'] = (tagC[x.tag || '-'] || 0) + 1);
const prest = NOTES.filter(x => /prestato/.test(x.text)).length;
const PR = Parola.ON && st.parola ? st.parola.promesse : [];
const R = {
  minutiGioco: MIN, msPasso: +ms.toFixed(2), passi: steps,
  battuteVicine: L.length, coppieScambio: coppie.length, coppieInScena: scene, coppieConNome: aNome, coppieConConseguenzaEntro3min: conCons,
  battuteCheNominanoUnPresente: nominaPresente, battuteCheNominanoUnTerzo: nominaTerzo,
  popStats: diff, scambi: st.scambi && st.scambi.stats, trame: st.trame && st.trame.stats, convivenza: typeof Convivenza !== 'undefined' ? Convivenza.report(st) : null,
  imprese: typeof Imprese !== 'undefined' && Imprese.report ? Imprese.report(st) : null,
  noteFraNpc: NOTES.length, notePerTag: tagC, prestitiDiario: prest,
  promesseParola: PR.length, promesseNpcNpc: PR.filter(q => q.chi !== 'player' && q.a !== 'player').length,
  debitiAperti: st.npcs.reduce((s, n) => s + (n.pop && n.pop.debiti ? Object.keys(n.pop.debiti).filter(k => k !== 'player').length : 0), 0),
  appuntamentiAperti: st.npcs.filter(n => n.pop && n.pop.appt && n.pop.appt.with !== 'player').length,
};
const fs = require('fs');
fs.writeFileSync(__dirname_out() + '/coppie' + MIN + '.txt', coppie.map(([a, b]) => `${a.t.toFixed(0)} ${a.first}: ${a.text}  ||  ${b.first}: ${b.text}${a.ev || b.ev ? '  [scena]' : ''}`).join('\n'));
fs.writeFileSync(__dirname_out() + '/note' + MIN + '.txt', NOTES.map(x => `${x.t.toFixed(0)} ${x.a}→${x.b} [${x.tag}/${x.kind}] ${x.text}`).join('\n'));
function __dirname_out() { return '/tmp/claude-0/-home-user-porto-vecchio/23aa701d-4d16-53de-9f69-266722affa01/scratchpad/vita'; }
_log(JSON.stringify(R, null, 1));
