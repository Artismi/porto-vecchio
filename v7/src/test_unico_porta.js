// [unico] prova della porta del sistema unico (unico_porta.js, passo 0 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_porta.js [--ore=N]        la prova (figli per i confronti con e senza porta)
//   node test_unico_porta.js --figlio --modo=senza|porta|spento [--partita=1] [--caso=7] [--ore=1] [--instrada]   una misura (JSON)
// Controlla: l'ordine delle fasi è quello degli avvolgimenti di oggi (e lo stesso giro dà gli stessi fatti con e senza porta);
// gli errori si contano e si dicono (non si tacciono); st.rng è lo xorshift di game.js, salvabile, e lo stesso seme dà la stessa
// partita anche con un Math.random diverso; Math.random è instradato solo dentro il passo; la guardia di rientro; spento non cambia
// niente. Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const FIGLIO = process.argv.includes('--figlio');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];

const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// carica il gioco come index.src.html: i moduli del gioco, poi (se c'è) la porta, poi i cinque di commedia, poi Unico.chiudi()
// Math.random è a seme (come seme.js) e la sua fonte si può cambiare dopo il caricamento (Unico.ricaso), per vedere che la partita
// non dipende dal caso di fuori: il caso dei caricamenti resta lo stesso, cambia solo quello chiamato durante la partita
let FONTE = null;
function carica(modo, caso) {
  FONTE = mulberry(caso >>> 0 || 1); Math.random = () => FONTE();
  global.location = { search: /^spento/.test(modo) ? '' : '?commedia' };
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) zitto(...a); };
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
  global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
  try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
  delete global.document;   // come test_casa.js: window resta {} (cantiere.js lo legge)
  const U = modo === 'senza' || modo === 'spento0' ? null : require(SRC + 'unico_porta.js'); if (U) global.Unico = U;
  for (const m of COMMEDIA) { const [f, g] = m.split(':'); if (U && U.ON) U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
  if (U && U.ON) { U._nomeProva = null; U.chiudi(); }
  console.log = zitto;
  return U;
}
// un caso a seme per il giro del giocatore (fuori dal passo: non deve toccare la partita)
const fnv = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
// il giro: il giocatore va di posto in posto (2 minuti reali in ognuno); i «fatti» sono i fumetti detti (chi, cosa, quando),
// i soldi e i posti di tutti ogni 10 minuti di gioco
function giro(G, st, ore, rnd) {
  const p = st.player, DT = 1 / 20, t0 = st.t, GIRO = ['piazza', 'calata', 'molo', 'bar', 'chiesa', 'mercato', 'fontana', 'osteria'].map(k => G.PLACES[k]).filter(Boolean);
  let Pz = GIRO[0], tappa = 0, lastSw = st.clock, wp = null, h = 0x811c9dc5, nb = 0, passi = 0, snap = st.t; const visti = new WeakSet();
  p.x = Pz.x; p.y = Pz.y + 2;
  while (st.t < t0 + ore * 60) {
    if (st.clock - lastSw > 120) { lastSw = st.clock; Pz = GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; }
    if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = rnd() * 6.283, r = rnd() * 25; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 25 }; }
    const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
    G.step(st, DT, { x: dx / dd, y: dy / dd }); passi++;
    for (const n of st.npcs) { const b = n.bark; if (!b || visti.has(b)) continue; visti.add(b); nb++; h = fnv(h, n.id + '|' + String(b.text || '') + '|' + Math.round(st.clock * 20)); }
    if (st.t - snap >= 10) { snap = st.t; h = fnv(h, st.npcs.map(n => n.id + ':' + Math.round(n.x * 10) + ',' + Math.round(n.y * 10) + ':' + Math.round(n.money || 0)).join(';')); }
  }
  h = fnv(h, 'soldi:' + Math.round(p.money) + ' npc:' + st.npcs.length);
  return { hash: h.toString(16), bark: nb, passi };
}

if (FIGLIO) {
  const modo = ARG('modo', 'porta'), seme = +ARG('partita', 1), caso = +ARG('caso', 7), ore = +ARG('ore', 1);
  const U = carica(modo, 7), G = Game;
  // caricamento uguale per tutti, poi il caso di fuori scelto; si contano i numeri presi dal caso di fuori mentre il passo gira
  // (i moduli caricati prima della porta che hanno tenuto da parte Math.random: const rnd = Math.random)
  let sfuggiti = 0; { const F = mulberry(caso); FONTE = () => { if (U && U.ON && U.inSim) sfuggiti++; return F(); }; }
  if (U && U.ON) { U.CFG.instrada = process.argv.includes('--instrada'); if (process.argv.includes('--traccia')) U.CFG.traccia = true; }
  const st = G.create(seme); st.deadline = 1e12;
  // la sequenza di st.rng subito dopo la nascita (si legge da una copia dello stato, senza toccare la partita, se si può)
  let rngH = null;
  if (process.argv.includes('--rng')) { let h = 0x811c9dc5; for (let i = 0; i < 1000; i++) h = fnv(h, String(st.rng())); rngH = h.toString(16); }
  const r = ore > 0 ? giro(G, st, ore, mulberry(seme * 7919)) : { hash: null, bark: 0, passi: 0 };
  const out = Object.assign(r, { rngH, unico: !!(U && U.ON) });
  out.sfuggiti = sfuggiti; out.rngFine = st.rng.s !== undefined ? st.rng.s : null; out.uFine = st.u ? fnv(0x811c9dc5, JSON.stringify(st.u.rng)).toString(16) : null;
  if (U && U.ON) Object.assign(out, { ordine: U.ordine('step'), ordineCreate: U.ordine('create'), err: U.err, errTot: U.errTot, rientri: U.rientri, instradati: U.instradati, salvabile: !!st.rng.unico, traccia: U.traccia.slice(0, 40) });
  process.stdout.write('\n@@' + JSON.stringify(out) + '\n');
  process.exit(0);
}

// ============================ la prova ============================
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const { execFileSync } = require('child_process');
const figlio = (...a) => { const o = execFileSync(process.execPath, [__filename, '--figlio', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }); const L = o.split('\n').filter(l => l.startsWith('@@')).pop(); return JSON.parse(L.slice(2)); };
const ORE = +ARG('ore', 6);   // §9.1: sei ore di gioco

// 0) spento: Unico = { ON: false }, nessuna trappola, niente cambiato
{
  const out = execFileSync(process.execPath, ['-e', `
    global.World=require('./world.js');global.Interior=require('./interiors.js');global.Game=require('./game.js');
    const H=Game.HOOKS, d0=Object.getOwnPropertyDescriptor(H,'step'), c0=Object.getOwnPropertyDescriptor(H,'create'), r0=Math.random, s0=Game.step, k0=Game.create;
    const U=require('./unico_porta.js');
    const d1=Object.getOwnPropertyDescriptor(H,'step'), c1=Object.getOwnPropertyDescriptor(H,'create');
    const same=JSON.stringify(d0)===JSON.stringify(d1)&&JSON.stringify(c0)===JSON.stringify(c1)&&(!d0||d0.value===d1.value)&&Math.random===r0&&Game.step===s0&&Game.create===k0;
    const st=Game.create(5); console.log(JSON.stringify({k:Object.keys(U),on:U.ON,same,u:'u' in st,rng:!!st.rng.unico}));`], { encoding: 'utf8' }).trim().split('\n').pop();
  const o = JSON.parse(out);
  ok(o.on === false && o.k.length === 1 && o.k[0] === 'ON' && o.same && !o.u && !o.rng, `spento: esporta solo {ON:false}; HOOKS.step/create, Math.random, Game.step/create intatti; niente st.u (${out})`);
  // a flag spento lo stesso giro, con e senza unico_porta.js caricato, dà la stessa partita del gioco di serie
  const a = figlio('--modo=spento', '--partita=2', '--ore=' + ORE), b = figlio('--modo=spento0', '--partita=2', '--ore=' + ORE);
  ok(a.unico === false && a.hash === b.hash && a.bark === b.bark, `spento, con e senza unico_porta.js: la stessa partita (${a.hash}/${b.hash}, ${a.bark} fumetti)`);
}

// 1) l'ordine delle fasi: quello degli avvolgimenti di oggi
const S1 = figlio('--modo=porta', '--partita=1', '--ore=0.02', '--traccia');
ok(JSON.stringify(S1.ordine) === JSON.stringify(['commedia', 'parola', 'vita', 'iniziative', 'casa']), `fasi del passo nell'ordine di caricamento: ${S1.ordine.join(' ⊂ ')}`);
ok(JSON.stringify(S1.ordineCreate) === JSON.stringify(['commedia', 'vita']), `fasi della nascita: ${S1.ordineCreate.join(' ⊂ ')}`);
{
  const T = S1.traccia, i0 = T.indexOf('>casa'), giro1 = T.slice(i0, i0 + 12).join(' ');
  const atteso = '>casa >iniziative >vita >parola >commedia >base <base <commedia <parola <vita <iniziative <casa';
  ok(giro1 === atteso, `un passo: casa ⊃ iniziative ⊃ vita ⊃ parola ⊃ commedia ⊃ BASE (${giro1})`);
  ok(T.indexOf('>create.vita') < T.indexOf('>create.commedia') && T.indexOf('>create.commedia') < T.indexOf('>create.base'), 'la nascita: vita ⊃ commedia ⊃ BASE');
  ok(S1.salvabile, 'con la porta st.rng è quello salvabile (Unico.xs32)');
}
// lo stesso giro con e senza porta (caso instradato spento, per confrontare): stessi fumetti, stessi soldi, stessi posti
for (const seme of [1, 3]) {
  const a = figlio('--modo=senza', '--partita=' + seme, '--ore=' + ORE), b = figlio('--modo=porta', '--partita=' + seme, '--ore=' + ORE);
  ok(a.hash === b.hash && a.bark === b.bark && b.errTot === 0, `seme ${seme}, ${ORE} ore: con e senza porta la stessa partita (${a.hash}/${b.hash}, ${a.bark}/${b.bark} fumetti, ${b.errTot} errori)`);
}

// 2) il caso a seme
{
  const a = figlio('--modo=senza', '--partita=4', '--ore=0', '--rng'), b = figlio('--modo=porta', '--partita=4', '--ore=0', '--rng');
  ok(a.rngH === b.rngH, `st.rng dopo la nascita: la stessa sequenza con e senza porta (${a.rngH}/${b.rngH})`);
  // lo stesso seme due volte (in due processi): la stessa partita, lo stesso stato finale di st.rng e dei flussi
  const c = figlio('--modo=porta', '--partita=3', '--caso=11', '--ore=' + ORE, '--instrada'), c2 = figlio('--modo=porta', '--partita=3', '--caso=11', '--ore=' + ORE, '--instrada');
  ok(c.hash === c2.hash && c.rngFine === c2.rngFine && c.uFine === c2.uFine && c.instradati > 0 && c.instradati === c2.instradati && c.errTot === 0,
    `stesso seme, due giri: la stessa partita (${c.hash}/${c2.hash}), st.rng finale ${c.rngFine}, flussi ${c.uFine}; ${c.instradati} numeri dal flusso «vecchi»`);
  // Math.random di fuori diverso: quello che resta legato al caso di fuori sono i moduli caricati PRIMA della porta che si sono
  // tenuti Math.random in una costante (azioni, economia, eventi, …): non si possono instradare senza toccarli (passi dopo)
  const d = figlio('--modo=porta', '--partita=3', '--caso=99991', '--ore=' + ORE, '--instrada');
  console.log(`     nota: con un Math.random di fuori diverso ${d.hash === c.hash ? 'la stessa partita' : 'la partita cambia'} (${c.hash}/${d.hash}): ${c.sfuggiti} numeri presi durante il passo da chi ha tenuto da parte Math.random prima della porta, contro ${c.instradati} instradati`);
}

// ============== nello stesso processo: errori, salvataggio del caso, instradamento, rientro ==============
const U = carica('porta', 5), G = Game;
ok(U.ON === true && typeof U.passo === 'function' && G.HOOKS.step === U.passo, 'acceso con ?commedia: HOOKS.step è Unico.passo dopo Unico.chiudi()');
const st = G.create(5); st.deadline = 1e12;
{
  // makeRng di game.js:11, letto dal sorgente: 10⁶ numeri identici a Unico.xs32
  const src = require('fs').readFileSync(SRC + 'game.js', 'utf8').match(/function makeRng\(seed\) \{[^\n]*\}/)[0];
  const makeRng = new Function(src + '; return makeRng;')();
  let same = true; for (const seed of [1, 1986, 0, 4294967295]) { const r0 = makeRng(seed), r1 = U.xs32(seed); for (let i = 0; i < 250000; i++) if (r0() !== r1()) { same = false; break; } }
  ok(same, 'Unico.xs32 = makeRng di game.js: 10⁶ numeri identici (4 semi)');
  let inv = true; for (let i = 0; i < 2000; i++) { const r = U.xs32(i * 2654435761 + 1), s0 = r.s; r(); if (U._.indietro(r.s) !== s0) inv = false; }
  ok(inv, "l'xorshift si inverte: lo stato si ricava dall'ultimo numero (2.000 stati)");
  // la partita nata prima della porta (main.js:6): al primo passo st.rng si adotta nel punto in cui è, la sequenza non salta
  { const a = makeRng(77), b = makeRng(77); for (let i = 0; i < 10; i++) { a(); b(); } const s2 = { rng: a }; U._.tardi(s2);
    let eq = true; for (let i = 0; i < 1000; i++) if (s2.rng() !== b()) eq = false;
    ok(eq && s2.rng.unico && s2.u && s2.u.tardi, 'partita nata prima della porta: st.rng adottato a metà sequenza, gli stessi 1.000 numeri dopo'); }
  // salva → avanti → carica → avanti: la stessa sequenza, per st.rng e per i flussi
  for (let i = 0; i < 50; i++) { st.rng(); U.flusso('mente'); }
  const sv = JSON.parse(JSON.stringify(U.salvaCaso(st)));
  const giu = () => { const o = []; for (let i = 0; i < 200; i++) o.push(st.rng(), U.flusso('mente'), U.flusso('vecchi')); return o.join(','); };
  const A = giu(); U.caricaCaso(st, sv); const B = giu();
  ok(A === B && typeof sv.st === 'number' && Array.isArray(sv.unico.mente), `st.rng e i flussi si salvano e si ricaricano: la stessa sequenza (stato ${sv.st})`);
  const u2 = U._.nuovoU(5), u3 = U._.nuovoU(5), u4 = U._.nuovoU(6);
  ok(JSON.stringify(u2.rng) === JSON.stringify(u3.rng) && JSON.stringify(u2.rng) !== JSON.stringify(u4.rng) && new Set(Object.values(u2.rng).map(String)).size === 4, 'i flussi: stesso seme stesso stato, seme diverso stato diverso, un flusso per sottosistema');
}
{
  // Math.random: fuori dal passo è quello vero, dentro viene dal flusso «vecchi»
  // si guarda lo stato del flusso: se Math.random lo muove, il numero viene da lì
  U.CFG.instrada = true;
  const sV = () => String(st.u.rng.vecchi);
  const v0 = sV(); for (let i = 0; i < 10; i++) Math.random(); const fuoriTocca = sV() !== v0;
  let dentroTocca = false, dentroIn = false;
  U.fase('prova.caso', () => { const a = sV(); for (let i = 0; i < 5; i++) Math.random(); dentroTocca = sV() !== a; dentroIn = U.inSim; });
  G.step(st, 1 / 20, {});
  ok(!fuoriTocca && dentroTocca && dentroIn && !U.inSim, `Math.random instradato solo dentro il passo (fuori: flusso ${fuoriTocca ? 'toccato' : 'intatto'}; dentro: ${dentroTocca ? 'dal flusso' : 'vero'})`);
  U._.FASI.splice(U._.FASI.findIndex(f => f.nome === 'prova.caso'), 1);
}
{
  // gli errori: si contano, si dicono (console.error), il passo va avanti (le fasi fuori girano lo stesso)
  const E = []; const ce = console.error; console.error = (...a) => E.push(a.map(String).join(' '));
  let volte = 0, dopo = 0;
  U.fase('prova.rotta', () => { volte++; throw new Error('rotto apposta ' + volte); });
  U.fase('prova.dopo', () => { dopo++; });
  const m0 = (U.misure().casa || { n: 0 }).n;
  G.step(st, 1 / 20, {}); G.step(st, 1 / 20, {});
  ok(U.err['prova.rotta'] === 2 && /rotto apposta 2/.test(U.ultimo['prova.rotta'].stack) && dopo === 2 && U.misure().casa.n === m0 + 2, `un errore in una fase: contato 2 volte su 2 (non si tace dopo il primo), l'ultimo stack tenuto, le altre fasi girano`);
  ok(E.length >= 1 && /\[Unico\] errore nella fase «prova\.rotta»/.test(E[0]), `e si dice: console.error («${(E[0] || '').slice(0, 60)}…»)`);
  U._.FASI.splice(U._.FASI.findIndex(f => f.nome === 'prova.rotta'), 1);
  // l'errore che vita prende da sé (Vita.err, console.warn('[Vita]', e)): letto dalla porta e contato nella fase vita
  const tot0 = U.errTot, ev0 = U.err.vita || 0, cw = console.warn; const W = []; console.warn = (...a) => W.push(a);
  const V0 = st.vita; let rotto = 1;
  Object.defineProperty(st, 'vita', { configurable: true, enumerable: true, get() { if (rotto) throw new Error('vita rotta apposta'); return V0; }, set(v) { } });
  G.step(st, 1 / 20, {}); G.step(st, 1 / 20, {});
  rotto = 0; delete st.vita; st.vita = V0; console.warn = cw;
  ok((U.err.vita || 0) - ev0 >= 2 && U.errTot - tot0 >= 2 && !W.some(a => a[0] === '[Vita]'), `l'errore preso dentro vita: ${(U.err.vita || 0) - ev0} su 2 passi contati in Unico.err.vita (Vita.err rimesso a zero, così il secondo non si tace)`);
  const pre = U.errTot; G.step(st, 1 / 20, {});
  ok(U.errTot === pre && U.err.vita - ev0 >= 2, 'aggiustato il guasto, il passo dopo non conta errori nuovi');
  console.error = ce; U._.FASI.splice(U._.FASI.findIndex(f => f.nome === 'prova.dopo'), 1);
}
{
  // la guardia di rientro: Game.step chiamato da dentro il passo (Oggetti.passTime) non rientra, e si conta
  let c0 = null, c1 = null; const r0 = U.rientri;
  U.fase('prova.rientro', (s) => { c0 = s.clock; for (let i = 0; i < 3; i++) G.step(s, 1, {}); c1 = s.clock; });
  G.step(st, 1 / 20, {});
  ok(U.rientri - r0 === 3 && c0 === c1, `guardia di rientro: 3 Game.step dentro il passo fermati e contati (${U.rientri - r0}), l'orologio non va avanti di nascosto`);
  U._.FASI.splice(U._.FASI.findIndex(f => f.nome === 'prova.rientro'), 1);
  const cl = st.clock; G.step(st, 1 / 20, {}); ok(st.clock > cl && !U.inSim, 'fuori dal passo Game.step torna a girare');
}
{
  const M = U.misure(), k = ['base', 'commedia', 'parola', 'vita', 'iniziative', 'casa'];
  ok(k.every(f => M[f] && M[f].n > 0 && M[f].p95 >= 0 && M[f].max >= M[f].p50), `misure per fase (p50/p95/p99/max): ${k.map(f => f + ' ' + M[f].p95.toFixed(2)).join(' · ')} ms p95 su ${M.base.n} passi`);
  ok(/unico · passi \d+/.test(U.rapporto()), 'il riquadro di ?perf ha le righe per fase');
}
console.log(fail ? `\n${fail} casi falliti` : '\ntutto a posto');
process.exit(fail ? 1 : 0);
