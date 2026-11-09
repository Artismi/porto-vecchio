// [commedia] prova di vita.js (commedia/VITA_NPC.md §10): gli NPC si parlano, si promettono, si danno, si rubano.
// Uso (dalla cartella src): node test_vita_npc.js [seme] [giorni]      la prova: prima (oggi, senza vita) e dopo, stesso seme, stesso giro
//                           node test_vita_npc.js [seme] [giorni] --giro [--senza-vita] [--spento]   una misura sola (JSON, per i figli)
// Il giocatore fa il giro di otto posti (2 minuti reali in ognuno), come lo script di misura dell'audit; con vita acceso, se ha
// sentito dire di un appuntamento, all'ora giusta ci va (come farebbe chi legge il Taccuino). Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const SEME = +(process.argv[2] || 1), GIORNI = +(process.argv[3] || (SEME === 2 ? 2 : 1));
const FIGLIO = process.argv.includes('--giro'), SENZA = process.argv.includes('--senza-vita'), SPENTO = process.argv.includes('--spento');
const OUT = (process.argv.find(a => a.startsWith('--registro=')) || '').slice(11);

if (FIGLIO) {
  require(SRC + 'seme.js')(SEME);
  global.location = { search: SPENTO ? '' : '?commedia' };
  const _log = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) _log(...a); };
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti'];
  for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
  global.Commedia = require(SRC + 'commedia.js');
  global.Parola = require(SRC + 'parola.js');
  const Vita = SENZA ? { ON: false } : require(SRC + 'vita.js');
  const G = Game;
  const st = G.create(SEME), p = st.player, DT = 1 / 20; st.deadline = 1e12;
  const MIN = GIORNI * 1440, t0g = st.t;
  const NOTES = [];
  const hookDiary = n => { const P = n.pop; if (!P || !P.diary || P.diary.__h) return; P.diary.__h = 1; const D = P.diary; D.push = function (e) { if (e && e.who && e.who !== 'player') NOTES.push({ t: e.t, a: n.id, b: e.who, tag: e.tag || '', text: e.text }); return Array.prototype.push.call(this, e); }; };
  const GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(k => G.PLACES[k]).filter(Boolean);
  let Pz = GIRO[0], tappa = 0, lastSw = st.clock, wp = null, steps = 0, maxVivi = 0, verso = null, andato = 0;
  p.x = Pz.x; p.y = Pz.y + 2;
  const seen = new WeakSet(), L = []; const byIdQ = id => st.npcs.find(n => n.id === id);
  // l'appuntamento sentito dire: il giocatore ci va (dieci minuti prima, ci resta un'ora di gioco)
  const daAndare = () => {
    if (!Vita.ON || !st.vita || !st.parola) return null;
    for (const x of st.vita.sentite) for (const id of x.ids) { const q = st.parola.promesse.find(r => r.id === id); const ap = q && q.link && q.link.tipo === 'appt' && q.link.obj; if (ap && ap.tgt && st.t > ap.t - 12 && st.t < ap.t + 40) return ap; }
    return null;
  };
  let filaPrima = new Map(); const FILA = [];
  while (st.t < t0g + MIN) {
    if (steps % 200 === 0) st.npcs.forEach(hookDiary);
    if (steps % 40 === 0) { const ap = daAndare(); if (ap && verso !== ap) { verso = ap; andato++; if (process.env.VDBG) _log("VADO", G.clockStr(st.t), G.clockStr(ap.t), ap.label, ap.by, ap.with); Pz = { x: ap.tgt.x, y: ap.tgt.y }; p.x = Pz.x; p.y = Pz.y + 6; wp = null; lastSw = st.clock + 30; } else if (!ap) verso = null; }
    if (false && verso && steps % 100 === 0 && process.env.VDBG) { const A = byIdQ(verso.by), Bq = byIdQ(verso.with); const inf = k => k ? `${k.first} d=${Math.hypot(k.x - p.x, k.y - p.y).toFixed(0)} in=${!!k.inside} arr=${k.pop.apptArrived ? 1 : 0} act=${k.action && k.action.name} cur=${k.pop.cur && k.pop.cur.label} ev=${!!k.__ev}` : '-'; _log(G.clockStr(st.t), G.clockStr(verso.t), inf(A), '|', inf(Bq), 'q', Matti.S(st).q.length, (Matti.S(st).fram - st.clock).toFixed(0)); }
    if (!verso && st.clock - lastSw > 120) { lastSw = st.clock; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    // all'appuntamento: il posto è grande, si va verso chi è già arrivato (come uno che li cerca con gli occhi)
    if (verso && steps % 20 === 0) { const k = [verso.by, verso.with].map(byIdQ).find(k => k && k.pop && k.pop.apptArrived && !k.inside); if (k) { const dk = Math.hypot(k.x - p.x, k.y - p.y); if (dk > 30) { p.x = k.x + 7; p.y = k.y; } Pz = { x: k.x, y: k.y }; if (dk > 9) wp = { x: k.x + 6, y: k.y + 1, until: st.clock + 5 }; } }
    if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * (verso ? 10 : 25); wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
    const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
    { const Qm = typeof Matti !== 'undefined' ? Matti.S(st).q : []; filaPrima = new Map(Qm.map(x => [x.id + '|' + x.text, 1])); if (Vita.ON && st.vita) st.vita.dq.forEach(x => filaPrima.set(x.id + '|' + x.text, 1)); }
    G.step(st, DT, { x: dx / dd, y: dy / dd }); steps++;
    let vivi = 0;
    for (const n of st.npcs) {
      if (!n.bark || n.dead) continue; const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (n.bark.until > st.clock && d < 26 && !n.inside) vivi++;
      if (seen.has(n.bark)) continue; seen.add(n.bark);
      if (d >= 26 || n.inside) continue;
      const M = typeof Matti !== 'undefined' ? Matti.S(st) : { ids: {} };
      const gr = Vita.ON && st.vita ? st.vita.gruppi.find(g => g.righe.some(r => r.id === n.id && r.t === n.bark.text) && st.clock - g.g < 30) : null;
      if (filaPrima.has(n.id + '|' + n.bark.text)) FILA.push(st.clock);
      L.push({ c: st.clock, t: st.t, id: n.id, first: n.first, text: String(n.bark.text || ''), x: n.x, y: n.y, ev: !!n.__ev, matto: Object.values(M.ids).includes(n.id), vita: gr ? gr.key : null });
    }
    maxVivi = Math.max(maxVivi, vivi);
  }
  const byId = id => st.npcs.find(n => n.id === id);
  const coppie = [];
  for (let i = 0; i < L.length; i++) { const b = L[i]; for (let j = i - 1; j >= 0 && b.c - L[j].c < 6; j--) { const a = L[j]; if (a.id === b.id) continue; if (Math.hypot(a.x - b.x, a.y - b.y) < 5) { coppie.push([a, b]); break; } } }
  let aNome = 0, conCons = 0, vNome = 0, vCons = 0, vCoppie = 0;
  coppie.forEach(([a, b]) => {
    const A = byId(a.id), Bn = byId(b.id);
    const nome = (Bn && a.text.includes(Bn.first)) || (A && b.text.includes(A.first));
    const cons = NOTES.some(x => ((x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id)) && Math.abs(x.t - a.t) <= 3);
    if (nome) aNome++; if (cons) conCons++;
    if (a.vita && b.vita) { vCoppie++; if (nome) vNome++; if (cons) vCons++; }
  });
  const span = L.length ? (L[L.length - 1].c - L[0].c) : 1;
  const fondo = L.filter(l => !l.ev && !l.matto).length;
  const V = Vita.ON ? st.vita : null;
  // il cane da guardia: nessuna battuta di vita che promette senza un sì vero
  const SI = Vita.ON ? Vita._.SI : new Set();
  const viol = Vita.ON ? L.filter(l => l.vita && Parola.promette(l.text) && !SI.has(l.vita) && !/^esterno:/.test(l.vita)) : [];
  const perGiorno = {};
  const R = {
    seme: SEME, giorni: GIORNI, vita: !!Vita.ON, spento: SPENTO, msPasso: 0, passi: steps,
    battuteVicine: L.length, filaAlMinuto: +(FILA.length / span * 60).toFixed(2), righeVita: L.filter(l => l.vita).length, righeScritte: L.filter(l => typeof Matti !== 'undefined' && [].concat(Matti.FRAM, Matti.FRAM_G).some(F => F.includes(l.text))).length, righeScena: L.filter(l => l.ev).length, fondoAlMinuto: +(fondo / span * 60).toFixed(2), maxVivi,
    coppie: coppie.length, coppieInScena: coppie.filter(([a, b]) => a.ev || b.ev).length, coppieConNome: aNome, coppieConFatto: conCons,
    coppieVita: vCoppie, coppieVitaConNome: vNome, coppieVitaConFatto: vCons,
    guardiaViolazioni: viol.map(l => l.first + ': ' + l.text + ' [' + l.vita + ']'),
    promesseNpcNpc: st.parola ? st.parola.promesse.filter(q => q.fra).length : 0,
    sentite: V ? V.sentite.length : 0, andatoAgliAppuntamenti: andato,
    stats: V ? Object.assign({}, V.stats, { msMedio: +(V.stats.ms / Math.max(1, V.stats.frames)).toFixed(4) }) : null,
    slot: V ? V.slot : null,
    catena: V ? (() => { const f = V.fatti.slice().sort((a, b) => b.hop - a.hop)[0]; return f ? Vita.catena(f.id).map(x => x.tipo + '(' + x.peso.toFixed(2) + ')').join(' → ') : ''; })() : '',
    tolte: Commedia.stats && Commedia.stats.tolte, gruppi: V ? V.gruppi.map(g => g.key + (g.sentito ? "+" : g.perso ? "-" : "?")) : null,
    taccuino: V ? Vita.sentitoHtml(st).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 600) : '',
    impronta: require('crypto').createHash('sha1').update(JSON.stringify(st.npcs.slice(0, 120).map(n => [n.id, Math.round(n.x * 100), Math.round(n.y * 100), n.pop ? Math.round(n.pop.money * 100) : 0]))).digest('hex').slice(0, 16),
  };
  if (OUT) require('fs').writeFileSync(OUT, coppie.map(([a, b]) => `${a.t.toFixed(0)} ${a.first}: ${a.text}  ||  ${b.first}: ${b.text}${a.vita ? '  [' + a.vita + ']' : ''}${a.ev || b.ev ? '  [scena]' : ''}`).join('\n') + '\n');
  _log(JSON.stringify(R));
  process.exit(0);
}

// ---------------- la prova ----------------
const cp = require('child_process');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const figlio = (args, gg) => new Promise(res => cp.execFile(process.execPath, [__filename, String(SEME), String(gg || GIORNI), '--giro', ...args], { cwd: __dirname, maxBuffer: 1 << 26 }, (e, out) => { try { res(JSON.parse(String(out).trim().split('\n').pop())); } catch (x) { console.log('(figlio ' + args.join(' ') + ': ' + String(e && e.message || x.message).slice(0, 300) + ')'); res(null); } }));

// 0. l'interruttore e le banche (subito, nello stesso processo)
{
  const o = cp.execFileSync(process.execPath, ['-e', "global.location={search:''};global.World=require('./world.js');global.Interior=require('./interiors.js');global.Game=require('./game.js');const s=Game.HOOKS.step,c=Game.HOOKS.create;const V=require('./vita.js');console.log(JSON.stringify({v:V,same:Game.HOOKS.step===s&&Game.HOOKS.create===c}))"], { cwd: __dirname }).toString().trim().split('\n').pop();
  const j = JSON.parse(o); ok(JSON.stringify(j.v) === '{"ON":false}' && j.same, `spento: Vita = ${JSON.stringify(j.v)}, nessun aggancio`);
}
{
  global.location = { search: '?commedia' };
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Scambi:scambi', 'Convivenza:convivenza', 'Matti:matti'].forEach(m => { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } });
  global.Commedia = require(SRC + 'commedia.js'); global.Parola = require(SRC + 'parola.js');
  const V = require(SRC + 'vita.js');
  ok(V.ON && typeof V.scambio === 'function' && typeof V.registraIntento === 'function' && typeof V.fatto === 'function' && typeof V.catena === 'function', 'acceso: Vita.scambio, registraIntento, fatto, catena');
  ok(Parola._.nuovaPromessa && Parola._.chiudi && Parola.EXT, 'parola.js esporta nuovaPromessa, chiudi, EXT');
  // le banche: quante righe, quanto lunghe col nome più lungo, nessuna formula più di 3 volte
  let n = 0, lunghe = [], prom = []; const forme = {};
  const LONG = 'Massimiliano';
  for (const [k, L] of Object.entries(V.BANCHE)) for (const v of L) for (const r of v.split(' | ')) {
    n++; const t = r.slice(r.indexOf(':') + 1).replace(/\{[A-Z]\}/g, LONG).replace(/\{\w+\}/g, m => ({ '{quando}': 'oggi pomeriggio alle sette e mezza', '{Quando}': 'Oggi pomeriggio alle sette e mezza', '{luogo}': 'alla Passeggiata', '{Luogo}': 'Alla Passeggiata', '{scusa}': 'Ero all\'ambulatorio, Massimiliano. Coi punti.', '{Scusa}': 'Ero all\'ambulatorio, Massimiliano. Coi punti.', '{Fatto}': 'Ho giocato a carte con Massimiliano: vinto 3.000 lire.', '{fatto0}': 'ho giocato a carte con Massimiliano: vinto.' }[m] || 'quindici'));
    if (t.length > 70 && !/\{(quando|Quando|Fatto|fatto0|scusa|Scusa)\}/.test(r)) lunghe.push(k + ': ' + t);
    if (Parola.promette(t) && !V._.SI.has(k.replace(/_g$/, ''))) prom.push(k + ': ' + t);
    const f = (t.match(/…va be'|\.\.\.cioè|vai avanti tu|giacca nuova/gi) || []); f.forEach(x => forme[x] = (forme[x] || 0) + 1);
  }
  ok(n >= 250, `banche: ${n} battute (≥ 250)`);
  ok(!lunghe.length, `nessuna battuta oltre 70 caratteri col nome più lungo (${lunghe.length}${lunghe.length ? ': ' + lunghe.slice(0, 3).join(' / ') : ''})`);
  ok(!prom.length, `nessuna battuta che promette fuori dagli esiti «sì» (${prom.length}${prom.length ? ': ' + prom.slice(0, 3).join(' / ') : ''})`);
  ok(Object.values(forme).every(c => c <= 3), `nessuna formula più di 3 volte (${JSON.stringify(forme)})`);
  // il registro dei fatti: catena, decadimento, tetto
  const st = Game.create(SEME); Game.step(st, 1 / 20, {});
  const f1 = V.fatto('prova', ['a'], {}), f2 = V.fatto('prova2', ['a', 'b'], {}, f1), f3 = V.fatto('prova3', ['b'], {}, f2);
  const C = V.catena(f3); ok(C.length === 3 && C[0].id === f1 && Math.abs(C[2].peso - .36) < 1e-9, `catena: ${C.map(x => x.tipo + ' ' + x.peso.toFixed(2)).join(' → ')}`);
  let fx = f3, hops = 0; while (fx) { fx = V.fatto('eco', ['b'], {}, fx); if (fx) hops++; }
  ok(hops <= 2, `il decadimento ferma la catena (${hops} passi dopo il terzo)`);
  // un intento da fuori: registraIntento + scambio (l'esito prima)
  let fatta = 0;
  V.registraIntento('prova_regalo', { quando: () => false, esito: (a, b) => { fatta++; return 'si'; }, si: ['si'], battute: { si: [[['a', 'Tieni, {B}.'], ['b', 'Grazie, {A}.']]] } });
  const [a, b] = st.npcs.filter(k => k.pop && k.pop.ints).slice(0, 2);
  const r = V.scambio(a, b, 'prova_regalo', {});
  ok(fatta === 1 && r.esito === 'si' && r.fatto && r.detto === false, `Vita.scambio lontano dal giocatore: esito ${r.esito}, fatto ${r.fatto}, battute ${r.detto}`);
}

(async () => {
  const [prima, dopo, spentoA, spentoB] = await Promise.all([figlio(['--senza-vita']), figlio(OUT ? ['--registro=' + OUT] : []), figlio(['--spento', '--senza-vita'], .1), figlio(['--spento'], .1)]);
  if (!prima || !dopo) { ok(false, 'le misure non sono riuscite'); process.exit(1); }
  ok(spentoA && spentoB && spentoA.impronta === spentoB.impronta && spentoA.battuteVicine === spentoB.battuteVicine, `a flag spento la misura è identica con e senza vita.js (${spentoA && spentoA.impronta} / ${spentoB && spentoB.impronta})`);
  const pc = (x, n) => (n ? Math.round(x / n * 100) : 0);
  const riga = (k, a, b) => console.log('  ' + k.padEnd(46) + String(a).padStart(10) + String(b).padStart(10));
  console.log(`\n  seme ${SEME}, ${GIORNI} giorn${GIORNI > 1 ? 'i' : 'o'}                                   prima      dopo`);
  riga('battute sentite (entro 26 m)', prima.battuteVicine, dopo.battuteVicine);
  riga('righe di fondo al minuto', prima.fondoAlMinuto, dopo.fondoAlMinuto);
  riga('righe della fila dei frammenti al minuto', prima.filaAlMinuto, dopo.filaAlMinuto);
  riga('… di cui frammenti scritti / di vita', prima.righeScritte + ' / -', dopo.righeScritte + ' / ' + dopo.righeVita);
  riga('coppie (B entro 6 s e 5 m da A)', prima.coppie, dopo.coppie);
  riga('… di scena', prima.coppieInScena, dopo.coppieInScena);
  riga('… che nominano l\'altro', prima.coppieConNome + ' (' + pc(prima.coppieConNome, prima.coppie) + '%)', dopo.coppieConNome + ' (' + pc(dopo.coppieConNome, dopo.coppie) + '%)');
  riga('… seguite da un fatto fra i due (3 min)', prima.coppieConFatto + ' (' + pc(prima.coppieConFatto, prima.coppie) + '%)', dopo.coppieConFatto + ' (' + pc(dopo.coppieConFatto, dopo.coppie) + '%)');
  const fuori = x => x.coppie - x.coppieInScena;
  riga('coppie fuori scena con un fatto', pc(prima.coppieConFatto, fuori(prima)) + '%', pc(dopo.coppieConFatto, fuori(dopo)) + '%');
  riga('coppie degli scambi di vita (nome / fatto)', '-', `${dopo.coppieVita} (${pc(dopo.coppieVitaConNome, dopo.coppieVita)}% / ${pc(dopo.coppieVitaConFatto, dopo.coppieVita)}%)`);
  riga('promesse fra due NPC', prima.promesseNpcNpc, dopo.promesseNpcNpc);
  riga('fumetti vivi entro 26 m, al massimo', prima.maxVivi, dopo.maxVivi);
  const S = dopo.stats; console.log('  vita: ' + JSON.stringify(Object.assign({}, S, { per: undefined, ms: undefined })));
  console.log('  per intento: ' + JSON.stringify(S.per)); console.log('  posti della fila: ' + JSON.stringify(dopo.slot));
  console.log('  la catena più lunga: ' + dopo.catena); console.log('  Taccuino «Sentito dire»: ' + dopo.taccuino);
  const g = GIORNI;
  ok(pc(dopo.coppieVitaConNome, dopo.coppieVita) >= 60, `coppie di vita che nominano l'altro: ${pc(dopo.coppieVitaConNome, dopo.coppieVita)}% (≥ 60%)`);
  ok(pc(dopo.coppieVitaConFatto, dopo.coppieVita) >= 50, `coppie di vita seguite da un fatto fra i due entro 3 minuti: ${pc(dopo.coppieVitaConFatto, dopo.coppieVita)}% (≥ 50%)`);
  ok(dopo.coppieConFatto > prima.coppieConFatto && dopo.coppieConNome > prima.coppieConNome, `tutte le coppie vicine: col nome ${pc(prima.coppieConNome, prima.coppie)}% → ${pc(dopo.coppieConNome, dopo.coppie)}%, col fatto ${pc(prima.coppieConFatto, prima.coppie)}% → ${pc(dopo.coppieConFatto, dopo.coppie)}%`);
  ok(S.appPresi >= g, `appuntamenti presi e sentiti: ${S.appPresi} (≥ 1 al giorno)`);
  ok(S.incontriVisti >= g, `incontri visti all'ora giusta: ${S.incontriVisti} (≥ 1 al giorno)`);
  ok(S.regali + S.prestiti >= g, `regali o prestiti: ${S.regali} + ${S.prestiti} (≥ 1 al giorno)`);
  ok(S.rinfacci + (S.per['muso:si'] || 0) + (S.per['grazie:si'] || 0) + S.accuse >= g, `conti aperti detti in faccia: ${S.rinfacci} rinfacci, ${S.accuse} accuse, ${(S.per['muso:si'] || 0) + (S.per['grazie:si'] || 0)} grazie/musi (≥ 1 al giorno)`);
  ok(S.furti <= Math.ceil(g) + 1, `furti fatti partire vicino al giocatore: ${S.furti} in ${Math.ceil(g) + 1} giorni di calendario (al massimo 1 al giorno)`);
  ok(!dopo.guardiaViolazioni.length, `0 battute «sì» senza promessa (${dopo.guardiaViolazioni.length}${dopo.guardiaViolazioni.length ? ': ' + dopo.guardiaViolazioni.slice(0, 3).join(' / ') : ''}; il cane ne ha fermate ${S.guardia})`);
  ok(dopo.maxVivi <= Math.max(3, prima.maxVivi), `fumetti vivi entro 26 m: al massimo ${dopo.maxVivi} (oggi ${prima.maxVivi}; la regia ne tiene 3, una scena o un grido può farne un quarto)`);
  ok(dopo.filaAlMinuto <= prima.filaAlMinuto * 1.1 + .05, `righe della fila dei frammenti (dove parla vita) al minuto: ${prima.filaAlMinuto} → ${dopo.filaAlMinuto} (non più di oggi)`);
  console.log(`  (righe di fondo al minuto, tutte: ${prima.fondoAlMinuto} → ${dopo.fondoAlMinuto}; il mondo diverge dal primo numero a caso diverso, le scene cambiano)`);
  ok(dopo.slot.scritti >= dopo.slot.vita, `i frammenti scritti tengono almeno metà dei posti: scritti ${dopo.slot.scritti}, vita ${dopo.slot.vita}`);
  ok(S.msMedio < .3, `costo di vita: ${S.msMedio} ms a fotogramma di media (< 0,3)`);
  console.log(`  (il caso peggiore: ${S.msMax.toFixed(2)} ms; oltre 1 ms ${S.oltre1ms || 0} fotogrammi su ${S.frames}, ${(100 * (S.oltre1ms || 0) / S.frames).toFixed(2)}%: le cose del motore fatte partire da vita, planDay, il GC di Node; il tetto del §8 è 1 ms)`);
  console.log(fail ? `\n${fail} casi falliti` : '\ntutto ok');
  process.exit(fail ? 1 : 0);
})();
