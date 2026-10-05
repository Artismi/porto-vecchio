/* Porto Vecchio — La Regia: chi decide cosa succede per strada.
   Due strati, come vuole Andrea:
   1. Il mondo è sempre vivo da solo (motore, senza IA): la gente va al lavoro, fa la spesa, ha i suoi progetti (popolo.js),
      reagisce agli imprevisti (azioni.js). Qui si aggiunge che le auto sono di qualcuno e che chi ha l'auto e deve andare
      lontano la prende: se prendi la macchina è per andare da qualche parte.
   2. Vicino al giocatore, l'IA fa da regista invisibile: ogni tanto guarda la scena (chi c'è, cosa fa, bisogni, progetti,
      rapporti, posti vicini) e fa succedere da 1 a 3 cose piccole e vere — un cambio di strada, due che si fermano a parlare,
      un'offerta, una lite per un vecchio conto, uno che si mette a lavorare a un suo progetto, un gesto, una battuta.
      Il motore le esegue con i suoi piani (strade vere, oggetti, effetti sui rapporti e sui ricordi).
   La chat col giocatore passa sempre davanti (mente.js): mentre chatti la regia non parte e decide il motore.
   Si carica dopo mente.js. Non tocca game.js, popolo.js, azioni.js: usa solo quello che espongono. */
var Regia = (function () {
  'use strict';
  const CFG = {
    every: 40000,      // ms di orologio vero tra una regia e l'altra
    radius: 34,        // metri intorno al giocatore
    maxPeople: 6,
    maxActs: 3,
    rest: 3 * 60,      // minuti di gioco prima che la regia riprenda la stessa persona
    driveMin: 130,     // metri oltre i quali chi ha l'auto vicina la prende
    carNear: 60,       // metri: l'auto deve essere a portata
  };
  const S = { next: 0, busy: false, log: [], owners: false, drives: 0, last: null };
  const G = () => window.Game, P = () => window.Popolo, A = () => window.Azioni, M = () => window.Mente;
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const SOCIAL = ['chiacchiera', 'sfotti', 'apprezza', 'offri', 'gioca', 'litiga'];
  const VERBI = ['vai', 'fai', 'mangia', 'gesto'].concat(SOCIAL);

  // ---------------- 1. LA VITA DI BASE: le auto sono di qualcuno, e servono per andare lontano ----------------
  const freeCar = v => v && !v.traffic && !v.police && !v.military && !v.wreck && !v.hidden && !v.rider && v.kind !== 'heli';
  function assignOwners(st) {
    if (S.owners) return; S.owners = true;
    const adults = st.npcs.filter(n => n.pop && !n.dead && n.pop.homeT && !n.cop && (n.pop.age || 30) >= 20);
    st.vehicles.forEach(v => {
      if (!freeCar(v) || v.owner) return;
      let best = null, bd = 45;
      adults.forEach(n => { if (n.pop.car) return; const d = dist(v.x, v.y, n.pop.homeT.x, n.pop.homeT.y); if (d < bd) { bd = d; best = n; } });
      if (best) { v.owner = best.id; best.pop.car = v.id; }
    });
  }
  function carOf(st, n) { const id = n.pop && n.pop.car; if (!id) return null; const v = st.vehicles.find(v => v.id === id); return v && freeCar(v) ? v : null; }
  function driveIfFar(st, n) {
    const Pn = n.pop, Po = P(), Az = A(); if (!Po || !Az || Pn.emer || n.dead || n.cop || Po.isPassive(st, n)) return;
    const b = Po.blockNow(st, n); if (!b || !b.tgt || b === Pn.__regBlk) return; Pn.__regBlk = b;
    if (b.act === 'sonno' || dist(n.x, n.y, b.tgt.x, b.tgt.y) < CFG.driveMin) return;
    const v = carOf(st, n); if (!v || dist(n.x, n.y, v.x, v.y) > CFG.carNear) return;
    const name = G().vehicleName ? G().vehicleName(st, v) : 'la macchina', label = `prende ${name} per andare ${b.label.replace(/^(va |andare )/, '')}`;
    const step = { label, drive: { veh: () => v, to: () => ({ x: b.tgt.x, y: b.tgt.y }) }, dur: 1 };
    const park = { label: `parcheggia e va ${b.label}`, at: () => b.tgt, dur: 1, outside: true };
    if (Az.startPlan(st, n, 'guida', label, [step, park], 1)) { S.drives++; note(`${n.name}: ${label}`); }
  }

  // ---------------- 2. LA REGIA DELL'IA vicino al giocatore ----------------
  const TRATTI = { loq: ['chiacchierone', 'di poche parole'], cor: ['coraggioso', 'pauroso'], legge: ['ligio', 'insofferente alle regole'], avid: ['avido', 'generoso'] };
  function character(n) { const t = n.tr || {}, out = []; Object.keys(TRATTI).forEach(k => { if (t[k] === undefined) return; if (t[k] > .68) out.push(TRATTI[k][0]); else if (t[k] < .32) out.push(TRATTI[k][1]); }); return out.slice(0, 3).join(', '); }
  function mood(Pn) { const N = Pn.need || {}; return Object.keys(N).filter(k => N[k] > .6).sort((a, b) => N[b] - N[a]).slice(0, 3); }
  function candidates(st) {
    const p = st.player, Po = P();
    return st.npcs.filter(n => n.pop && !n.dead && !n.cop && !n.inside && n.pop.near && !n.pop.emer && !(n.jailedUntil > st.t) && !Po.isPassive(st, n)
      && dist(n.x, n.y, p.x, p.y) < CFG.radius && !(n.pop.regiaT && st.t - n.pop.regiaT < CFG.rest))
      .sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y)).slice(0, CFG.maxPeople);
  }
  function placesNear(st, x, y) {
    const PL = G().PLACES || {}; return Object.keys(PL).map(id => ({ id, nome: PL[id].name, d: dist(PL[id].x, PL[id].y, x, y) })).filter(q => q.d < 120).sort((a, b) => a.d - b.d).slice(0, 8).map(q => ({ id: q.id, nome: q.nome, metri: Math.round(q.d) }));
  }
  function scene(st, people) {
    const Po = P(), Az = A(), g = G(), p = st.player;
    const persone = people.map(n => { const Pn = n.pop, b = Po.blockNow(st, n), pj = Pn.projects && Pn.projects[0];
      return { id: n.id, nome: n.name, eta: Pn.age, mestiere: Pn.job ? Pn.job.title : (Pn.status || n.role), carattere: character(n), umore: mood(Pn), sta_facendo: b ? b.label : 'gironzola',
        progetto: pj ? pj.label : undefined, pensiero: Pn.thoughts && Pn.thoughts.length ? Pn.thoughts[Pn.thoughts.length - 1].text : undefined,
        ricordo: Pn.diary && Pn.diary.length ? Pn.diary[Pn.diary.length - 1].text : undefined, soldi: Math.round(Pn.money || 0) }; });
    const rapporti = [];
    for (let i = 0; i < people.length; i++) for (let j = 0; j < people.length; j++) { if (i === j) continue; const R = Az.rel(st, people[i], people[j]); if (Math.abs(R.a) > .2) rapporti.push(`${people[i].id} → ${people[j].id}: ${R.a > .5 ? 'molto amici' : R.a > .2 ? 'si stimano' : R.a < -.5 ? 'si odiano' : 'non si sopportano'}`); }
    return { ora: g.clockStr(st.t), giorno: g.dayName ? g.dayName(st.t) : '', luogo: g.nearestPlace ? g.nearestPlace(p.x, p.y).name : '', repressione: st.ris ? Math.round(st.ris.repr) : 0,
      persone, rapporti, posti: placesNear(st, p.x, p.y), verbi: VERBI };
  }
  function act(st, people, places, a) {
    const g = G(), Po = P(), Az = A();
    const n = people.find(k => k.id === a.chi); if (!n || !VERBI.includes(a.verbo)) return false;
    const say = a.battuta ? String(a.battuta).slice(0, 80) : '';
    const why = a.perche ? String(a.perche).slice(0, 80) : '';
    let ok = false;
    if (SOCIAL.includes(a.verbo)) {
      const o = people.find(k => k.id === a.con && k !== n); if (!o) return false;
      const r = Az.intend(st, n, a.verbo, { chi: o }, 2, why ? `${a.verbo} con ${o.first} (${why})` : null); ok = r && r.ok;
    } else if (a.verbo === 'vai') {
      if (!places.some(q => q.id === a.dove)) return false;
      const r = Az.intend(st, n, 'vai', { dove: a.dove }, 2, why ? `va a ${g.PLACES[a.dove].name}: ${why}` : null); ok = r && r.ok;
    } else if (a.verbo === 'fai') {   // un'attività inventata dall'IA (un progetto personale, un lavoretto): il motore la porta in un posto vero
      if (!places.some(q => q.id === a.dove) || !a.cosa) return false;
      const t = Po.target(a.dove); if (!t) return false; const cosa = String(a.cosa).slice(0, 60), min = Math.max(5, Math.min(60, Number(a.minuti) || 15));
      ok = !!Az.startPlan(st, n, 'fai', cosa, [{ label: `va a ${t.label}`, at: () => t, dur: 0, outside: true }, { label: cosa, dur: min }], 2);
    } else if (a.verbo === 'mangia') { const r = Az.intend(st, n, 'mangia', { modo: 'fuori' }, 2); ok = r && r.ok; }
    else if (a.verbo === 'gesto') ok = true;
    if (!ok) return false;
    n.pop.regiaT = st.t;
    if (say) g.say(st, n, say, 3.6);
    if (why && Po.note) Po.note(st, n, why, 'pensiero', { w: .25 });
    note(`${n.name} · ${a.verbo}${a.con ? ' ' + a.con : ''}${a.dove ? ' → ' + a.dove : ''}${a.cosa ? ' (' + a.cosa + ')' : ''}${say ? ' «' + say + '»' : ''}`);
    return true;
  }
  async function direct(st) {
    const m = M(); if (!m || !m.state || !m.state.active || m.chatting() || st.player.indoor || st.player.vehicle) return;
    const people = candidates(st); if (people.length < 2) return;
    const sc = scene(st, people); S.busy = true; S.last = { t: Date.now(), scena: sc };
    try {
      const r = await m.call({ kind: 'regia', scena: sc });
      if (!r || !Array.isArray(r.azioni)) return;
      let done = 0; r.azioni.slice(0, CFG.maxActs).forEach(a => { try { if (act(st, people, sc.posti, a)) done++; } catch (e) { console.warn('[Regia]', e); } });
      S.last.fatte = done; S.last.risposta = r;
    } finally { S.busy = false; }
  }

  // ---------------- il battito ----------------
  let tAcc = 0;
  function step(st, dt) {
    if (!st || !st.npcs || !P() || !A()) return;
    assignOwners(st);
    tAcc += dt; if (tAcc > 1.2) { tAcc = 0; st.npcs.forEach(n => { if (n.pop && n.pop.near && !n.dead) try { driveIfFar(st, n); } catch (e) { } }); }
    const now = Date.now();
    if (!S.busy && now > S.next) { S.next = now + CFG.every; direct(st).catch(e => console.warn('[Regia]', e)); }
  }
  function note(s) { S.log.push(s); if (S.log.length > 40) S.log.shift(); }
  function hook() {
    const g = G(); if (!g || !g.HOOKS) return;
    const prev = g.HOOKS.step; g.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { console.warn('[Regia]', e); } };
  }
  hook();
  return { CFG, S, scene, candidates, direct, act, assignOwners };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Regia;
