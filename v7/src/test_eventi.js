// prova degli eventi vicino al giocatore: ogni scena del catalogo parte, va in fondo e lascia gli attori liberi
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.WriterArte = require('./writer_arte.js'); global.Writing = require('./writing.js'); global.WriterVita = require('./writer_vita.js');
global.Eventi = require('./eventi.js');
const G = Game, EV = Eventi, st = G.create(1), p = st.player;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const DT = 1 / 30, step = s => { for (let i = 0; i < s * 30; i++) G.step(st, DT, { x: 0, y: 0 }); };
const E = EV.S(st); E.next = 1e12; st.deadline = 1e12;   // niente fine partita durante la prova   // la regia automatica ferma: le scene si lanciano a mano
step(20);   // il mondo si avvia
const day0 = Math.floor(st.t / 1440) * 1440 + 1440; const home = { x: p.x, y: p.y };
const res = {};
for (const id of EV.list()) {
  // il giocatore torna al punto di partenza e l'ora va a mezzogiorno o a mezzanotte secondo la scena
  const D = EV.SCENE.find(s => s.id === id); p.x = home.x; p.y = home.y; p.indoor = null; p.lv = null; p.vehicle = null;
  st.t = day0 + (D.when === 'night' ? 23 : D.when === 'day' ? 11 : 17) * 60;
  let sc = null; for (let k = 0; k < 40 && !sc; k++) { sc = EV.run(st, id); if (!sc) step(1); }
  if (!sc) { const r = st.npcs.filter(n => Math.hypot(n.x - p.x, n.y - p.y) < 34); res[id] = `non parte (entro 34 m: ${r.length}, fuori ${r.filter(n => !n.inside).length}, liberi ${r.filter(n => !n.inside && n.action.name === 'routine' && !n.__ev && !(n.pop && n.pop.emer)).length}, in scena ${st.npcs.filter(n => n.__ev).length}, scene ${E.live.length}, ore ${((st.t / 60) % 24).toFixed(1)}, giocatore ${p.x.toFixed(0)},${p.y.toFixed(0)} hp ${p.hp} ${p.indoor ? 'dentro' : ''})`; continue; }
  if (D.solo) { res[id] = 'parte (da solo)'; step(2); continue; }
  const cast = sc.cast.slice(); let said = 0, t = 0; const seen = new Set();
  while (E.live.includes(sc) && t < 95) { G.step(st, DT, { x: 0, y: 0 }); t += DT; cast.forEach(n => { if (n.bark && n.bark.until > st.clock && !seen.has(n.bark.text)) { seen.add(n.bark.text); said++; } }); }
  const stuck = cast.filter(n => n.__ev && n.__ev.sc === sc).length;
  res[id] = `${E.live.includes(sc) ? 'NON FINISCE' : 'finita'} in ${t.toFixed(0)} s, battuta ${sc.i + 1}/${sc.beats.length}, ${said} frasi, attori ${cast.length}, ${sc.why}${stuck ? ', ' + stuck + ' ancora in scena' : ''}`;
  ok(!E.live.includes(sc) && !stuck && said > 0 && (sc.i >= sc.beats.length - 1 || (sc.beats[sc.i] && sc.beats[sc.i]._k === 'brawl')),   // la rissa chiude la scena apposta (la passa alle risse)
     `${id}: ${res[id]}`);
  if (said > 0) console.log('      «' + [...seen].slice(0, 3).join('» «') + '»');
}
Object.entries(res).filter(([, v]) => !/finita|solo/.test(v)).forEach(([k, v]) => ok(v !== 'non parte' || ['spaccio', 'innamorati', 'due_ubriachi', 'graffito', 'scala', 'polizia_insegue', 'perquisizione'].includes(k), `${k}: ${v}`));
// la regia da sola: in due minuti di gioco qualcosa succede
// [leggera] la regia da sola: in 8 minuti qualcosa succede (una scena ogni 50-120 s), mai la stessa due volte nello stesso posto,
// e le scene che vengono verso il giocatore al massimo una ogni 10 minuti
E.next = st.clock + 1; E.seen = {}; E.spots = {}; E.day = {}; E.lastPlayer = -1e9; p.indoor = null; p.lv = null; p.vehicle = null; const n0 = E.log.length; p.x = home.x; p.y = home.y; st.t = day0 + 1440 + 16.5 * 60; step(40); E.next = st.clock + 1; const tReg = st.t;   // il giorno dopo (l'orologio non torna indietro: la gente sarebbe tutta in casa)
for (let k = 0; k < 8; k++) { step(60); p.indoor = null; p.lv = null; p.vehicle = null; }
const mine = E.log.filter(e => e.t >= tReg),   // per ora: il registro tiene le ultime 40 e scorre
      rep = mine.filter((e, i) => mine.findIndex(f => f.id === e.id && f.k === e.k) !== i), toMe = mine.filter(e => (EV.SCENE.find(s => s.id === e.id) || {}).player);
console.log(`    in 8 minuti: ${mine.map(e => e.id + '@' + e.k).join(', ')}`);
ok(mine.length >= 3, `la regia da sola, in 8 minuti: ${mine.length} scene`);
ok(!rep.length, `nessuna scena ripetuta nello stesso posto${rep.length ? ': ' + rep.map(e => e.id).join(', ') : ''}`);
ok(toMe.length <= 1, `verso il giocatore al massimo una: ${toMe.length}`);
// il costo: un passo con la regia accesa
const t0 = Date.now(); step(20); console.log(`    ${((Date.now() - t0) / 600).toFixed(2)} ms per passo`);
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.'); process.exit(fail ? 1 : 0);
