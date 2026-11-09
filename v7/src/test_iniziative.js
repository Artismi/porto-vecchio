// [commedia] prova delle iniziative libere (iniziative.js, dietro ?commedia): estri scritti e composti, i muri che prendono
// iniziativa, i bisogni (legna, cibo, la capanna nel bosco), la catena dei fatti (l'effetto farfalla).
// Uso (dalla cartella src): node test_iniziative.js [seme] [--giorni=2] [--dt=0.1] [--ia]
require('./seme.js')(process.argv[2]);
const ARG = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; };
const GIORNI = +(ARG('giorni') || 2), DT = +(ARG('dt') || .1), IA = process.argv.includes('--ia') || true;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

// 0) spento: niente agganci, solo { ON: false }
{
  const out = require('child_process').execFileSync(process.execPath, ['-e', `global.World=require('./world.js');global.Interior=require('./interiors.js');global.Game=require('./game.js');const s=Game.HOOKS.step;const I=require('./iniziative.js');console.log(JSON.stringify({k:Object.keys(I),on:I.ON,same:Game.HOOKS.step===s}))`], { cwd: __dirname }).toString().trim().split('\n').pop();
  const o = JSON.parse(out); ok(o.on === false && o.same && o.k.length === 1 && o.k[0] === 'ON', `spento: esporta solo {ON:false}, nessun aggancio (${out})`);
}

global.location = { search: '?commedia' };
global.World = require('./world.js'); global.Interior = require('./interiors.js'); global.Game = require('./game.js');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro'];
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require('./' + f + '.js'); } catch (e) { console.log('(manca ' + f + ': ' + e.message.slice(0, 90) + ')'); } }
// il cantiere è un modulo della pagina: due finte (come test_cantiere.js); window resta (Cantiere legge window.__pv), document no
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require('./cantiere.js'); } catch (e) { console.log('(manca cantiere: ' + e.message.slice(0, 90) + ')'); }
delete global.document;
global.Commedia = require('./commedia.js'); global.Parola = require('./parola.js'); global.Vita = require('./vita.js');
const I0 = require('./iniziative.js'); global.Iniziative = I0;
const G = Game, IN = Iniziative;
ok(IN.ON === true && typeof IN.S === 'function', 'acceso con ?commedia');

// 1) le battute: tutte sotto i 70 caratteri (con gli spazi dei nomi lunghi che si riempiono dopo: lì decide dire())
{
  const all = []; const walk = o => { if (typeof o === 'string') all.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  IN.ESTRI.forEach(X => ['chiede', 'si', 'no', 'via', 'fine', 'dopo', 'vuota', 'grigio'].forEach(k => walk(X[k]))); walk(IN.LV); walk(IN.BANCHE);
  const lunghe = all.filter(s => s.replace(/\{\w+\}/g, 'xxxxxx').length > 70);
  ok(IN.ESTRI.length >= 25 && all.length > 250, `${IN.ESTRI.length} estri scritti, ${all.length} battute nelle banche`);
  ok(!lunghe.length, `nessuna battuta oltre i 70 caratteri${lunghe.length ? ': ' + lunghe.slice(0, 3).join(' | ') : ''}`);
}

// 2) la partita: due giorni, il giocatore gira per i posti della città
IN.CFG.fatti = 20000; if (IA) IN.CFG.ia = 'finta';
const st = G.create(+process.argv[2] || 1), p = st.player; st.deadline = 1e12;
const E0 = typeof Eventi !== 'undefined' ? Eventi.S(st) : null;
const GIRO = ['piazza', 'fontana', 'calata', 'molo', 'osteria', 'giardini', 'pineta', 'lungomare', 'piazzetta', 'vico', 'bar', 'spiaggia'].map(k => G.PLACES[k]).filter(Boolean);
let tappa = 0, Pz = GIRO[0], wp = null; p.x = Pz.x; p.y = Pz.y + 2;
const memiVisti = {}, scritteKeys = new Set();
const t0 = Date.now(), passi = Math.round(GIORNI * 1440 / G.MIN_PER_SEC / DT);
for (let k = 0; k < passi; k++) {
  // il giocatore curioso: se vicino c'è un'iniziativa viva ci va; se no passa al posto dopo
  if (k % Math.round(150 / DT) === 0 && k) { const viva = st.ini && st.ini.attive.find(E => E.near && !E.chiusa); Pz = viva && Math.random() < .6 ? { x: viva.posto.x, y: viva.posto.y } : GIRO[++tappa % GIRO.length]; p.x = Pz.x; p.y = Pz.y + 2; wp = null; p.indoor = null; }
  if (!wp || Math.hypot(wp.x - p.x, wp.y - p.y) < 1 || st.clock > wp.until) { const a = Math.random() * 6.283, r = Math.random() * 25; wp = { x: Pz.x + Math.cos(a) * r, y: Pz.y + Math.sin(a) * r, until: st.clock + 20 }; }
  const dx = wp.x - p.x, dy = wp.y - p.y, dd = Math.hypot(dx, dy) || 1;
  G.step(st, DT, { x: dx / dd, y: dy / dd });
  if (k % 200 === 0 && st.ini) for (const key in st.ini.memi) { const M = st.ini.memi[key]; memiVisti[key] = { nome: M.nome, origine: M.origine, gen: M.gen, count: M.count, ok: M.ok, padre: M.padre, ricorrente: !!M.ricorrente, bandito: M.bandito, strano: M.strano, fusa: M.fusa }; }
}
const I = st.ini, S = I.stats, secs = (Date.now() - t0) / 1000;
console.log(`      ${GIORNI} giorni di gioco in ${secs.toFixed(0)} s (${passi} passi), ${st.npcs.length} abitanti`);

// 3) gli estri
console.log(`      proposte ${S.proposte}, valide ${S.valide}, scartate a secco ${S.scartate}, partite ${S.partite}, eseguite ${S.eseguite}, sciolte dai Grigi ${S.sciolte}, deserte ${S.deserte}, interrotte ${S.interrotte}`);
console.log(`      origini: scritte ${S.scritte}, composte ${S.composte}, copie ${S.copie}, IA (finta) ${S.ia}; seguiti a catena ${S.seguiti} (non validi ${S.seguitiNo}, persi ${S.seguitiPersi || 0}); fusioni ${S.fusioni}, sfide ${S.sfide}, ricorrenti ${S.ricorrenti}, bandite ${S.bandite}, di nascosto ${S.sotto}, svanite ${S.svanite}`);
console.log(`      inviti ${S.invitati}: sì ${S.si}, no ${S.no}; arrivati davvero ${S.arrivati}`);
ok(S.partite >= 10, `iniziative partite: ${S.partite}`);
const finite = (I.storia || []).length;
ok(S.eseguite / Math.max(1, finite) >= .9, `eseguite dopo la prova a secco: ${S.eseguite}/${finite} chiuse (${Math.round(S.eseguite / Math.max(1, finite) * 100)}%)`);
ok(S.si >= 5 && S.arrivati >= 5, `gente reclutata: ${S.si} sì, ${S.arrivati} arrivati`);
// le nuove: i tipi mai scritti
const scrittiK = new Set(IN.ESTRI.map(X => IN._ ? null : null));
const kinds = Object.entries(memiVisti), nuove = kinds.filter(([k, M]) => M.origine !== 'scritta' && !IN.ESTRI.some(X => X.nome === M.nome));
const depth = Math.max(0, ...kinds.map(([, M]) => M.gen));
ok(nuove.length >= 8, `iniziative di tipi mai scritti: ${nuove.length} (su ${kinds.length} ricordate)`);
console.log('      le più curiose: ' + nuove.sort((a, b) => (b[1].gen - a[1].gen) || (b[1].strano - a[1].strano) || (b[1].count - a[1].count)).slice(0, 10).map(([k, M]) => `«${M.nome}» (${M.origine}, gen ${M.gen}, ${M.count}×${M.ricorrente ? ', fissa' : ''}${M.bandito ? ', vietata' : ''}${M.strano ? ', posto strano' : ''})`).join('; '));
ok(depth >= 1, `discendenza (copie di copie): profondità massima ${depth}`);

// 4) la catena
const F = I.fatti, byId = {}; F.forEach(f => byId[f.id] = f);
const down = F.filter(f => f.causa).length, len = f => { let n = 1, g = f; while (g.causa && byId[g.causa] && n < 60) { g = byId[g.causa]; n++; } return n; };
const lens = F.map(len), dist = {}; lens.forEach(l => dist[l] = (dist[l] || 0) + 1);
const best = F.reduce((a, f) => (len(f) > len(a) ? f : a), F[0]);
ok(down >= 30, `fatti a valle (con una causa): ${down} su ${F.length}`);
console.log('      lunghezze delle catene: ' + Object.entries(dist).map(([k, v]) => `${k}:${v}`).join(' '));
// la catena più lunga fra iniziative (i salti fra iniziative diverse, non i passi della stessa)
const salti = f => { let n = 0, g = f; while (g && g.causa && byId[g.causa]) { const c = byId[g.causa]; if (g.tipo === 'iniziativa') n++; g = c; } return n; };
const bestS = F.reduce((a, f) => (salti(f) > salti(a) ? f : a), F[0]);
console.log(`      la catena più lunga (${len(best)} fatti): ${IN.catenaTesto(st, best.id).slice(0, 600)}`);
console.log(`      la cascata più lunga fra iniziative (${salti(bestS)} salti): ${IN.catenaTesto(st, bestS.id).slice(0, 700)}`);
ok(salti(bestS) >= 1, `una cascata attraversa più iniziative: ${salti(bestS)} salti`);
console.log('      sentito dire: ' + IN.sentito(st, 3).map(s => s.slice(0, 160)).join(' ‖ '));

// 5) i muri
console.log(`      muri: dipinti ${S.dipinti}, crossati ${S.crossati}, ripuliti dai Grigi ${S.ripuliti}, risposte ${S.risposte}, omaggi ${S.omaggi}, toy che copiano ${S.toy}; graffiti degli abitanti (popolo) ${st.pop.stats.graffiti || 0}+${st.pop.stats.scritte || 0} scritte`);
ok(S.crossati + S.ripuliti + S.risposte + S.omaggi + S.toy >= 3, `i muri prendono iniziativa: ${S.crossati + S.ripuliti + S.risposte + S.omaggi + S.toy} fatti`);

// 6) la roba e le costruzioni
console.log(`      roba: fatta a mano ${S.fatti_a_mano}, raccolta ${S.raccolti}, comprata ${S.comprati}, prestiti ${S.prestiti}; costruzioni ${S.costruiti} (${I.basi.map(b => b.nome + ' ' + (b.posto || '')).join(', ')})`);
ok(S.fatti_a_mano + S.raccolti >= 2, `le ricette vere usate dagli abitanti: ${S.fatti_a_mano + S.raccolti}`);
const objN = (st.covo ? st.covo.obj : []).filter(o => o.npc);
ok(objN.filter(o => !o.wip).length === I.basi.length, `le costruzioni stanno nel cantiere vero, segnate come degli abitanti: ${objN.length} (${objN.map(o => o.id).join(', ')})`);

// 7) prima il fatto, poi la parola
const senza = I.righe.filter(r => !byId[r.fatto] || byId[r.fatto].t > r.t);
ok(I.righe.length >= 10 && !senza.length, `battute in coda ${I.righe.length} (dette ${S.viste}, tacute dalla regia ${S.taciute}, tolte prima ${S.righeTolte}, lontane ${S.lontane || 0}, cane da guardia ${S.guardia}): senza fatto ${senza.length}`);
const lungheD = I.righe.filter(r => r.text.length > 70 || /\{\w+\}/.test(r.text));
ok(!lungheD.length, `dette: tutte ≤ 70 caratteri e senza buchi${lungheD.length ? ': ' + lungheD[0].text : ''}`);
const PR = typeof Parola !== 'undefined' && Parola.promette;
if (PR) { const siF = I.righe.filter(r => PR(r.text) && /invito_no|saltata|annullata|_vuot/.test((byId[r.fatto] || {}).tipo || '')); ok(!siF.length, `nessun «sì» senza un sì vero: ${siF.length}${siF.length ? ' (' + siF[0].text + ' / ' + (byId[siF[0].fatto] || {}).tipo + ')' : ''}`); }
console.log("      coda: " + I.q.length + " ombre in matti: " + (Matti.S(st).q.filter(x => x.at > 1e11).length) + " righe: " + JSON.stringify(I.righe.slice(0,6).map(r=>[r.c.toFixed(0), r.text])) + " clock " + st.clock.toFixed(0));
console.log('      perché tacciono: ' + JSON.stringify(S.perche || {}));
console.log('      sentite: ' + I.viste.slice(-12).map(r => `«${r.text}»`).join(' '));

// 8) i tetti e il costo
const ms = S.ms / Math.max(1, S.passi);
ok(ms < .2, `costo medio ${ms.toFixed(3)} ms a passo (massimo ${S.msMax.toFixed(2)} ms; i pezzi, al massimo: ${JSON.stringify(Object.fromEntries(Object.entries(S.pezzi || {}).map(([k, v]) => [k, +v.toFixed(2)])))})`);
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.');
if (process.argv.includes("--storia")) { (I.storia || []).forEach(h => console.log("   · " + JSON.stringify(h))); I.attive.forEach(E => console.log("   ~ viva: " + E.nome + " " + E.c.verbo + " via=" + !!E.via + " arr=" + E.arr.length + "/" + E.cast.length + " passo=" + (E.L.pop.emer ? E.L.pop.emer.steps[E.L.pop.emer.i] && E.L.pop.emer.steps[E.L.pop.emer.i].label : "nessun piano"))); }
process.exit(fail ? 1 : 0);
