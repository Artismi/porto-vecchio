#!/usr/bin/env node
/* Porto Vecchio — banco/strada_node.js: le prove del registro di strada (src/unico_strada.js, dietro ?commedia, &strada=0|1|2).
   Carica tutti i moduli unico nell'ordine di index.src.html (come banco/presidio_sim.js, più cose, rissa, regista, desideri...) e
   lascia andare 24 ore di gioco con un presidio vicino al giocatore; il giocatore ogni mezz'ora cambia posto (piazza, calata, bar,
   molo...) per sentire gente diversa. Ogni tanto si apre una lite vicino a lui (UnicoRissa) e si fa una proposta al presidio.
   Le prove:
     1. chi ha il registro: circa il 30% delle persone a &strada=1, circa il 45% a &strada=2, nessuno a &strada=0 (il modulo è spento);
        lo stesso seme dà la stessa gente;
     2. le battute del registro in 3 giorni: abbastanza, distinte almeno al 90%, almeno il 60% costruite da dati veri del mondo (le fonti),
        nessuna uguale entro 30 righe; le espressioni dell'idioletto nascono, passano, mutano e muoiono (con qualche genealogia);
        le parole coniate (porcassi, cozzume, incozzarsi) nascono, si dicono, si pronunciano, passano, mutano e muoiono;
        ci sono sia sostituzioni sia etichette; la lite, il presidio e chi guida ci passano;
     4. nessun errore nelle fasi.
   Uso: node banco/strada_node.js            (internamente: --dump --seme N --strada D [--ore H] [--campione]) */
'use strict';
const path = require('path'), { execFileSync } = require('child_process');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!argv.includes('--dump')) {
  let ok = 0, no = 0; const prova = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) ok++; else no++; };
  const run = (extra) => JSON.parse(execFileSync(process.execPath, [__filename, '--dump'].concat(extra), { maxBuffer: 1 << 27, timeout: 900000 }).toString().split('\n').filter(l => l.startsWith('{"esito"')).pop());
  const RL = [3].map(sm => run(['--seme', String(sm), '--strada', '1', '--ore', '84', '--scala', '8']));
  const A = run(['--seme', '1', '--strada', '1', '--ore', arg('ore', '168')]), A2 = run(['--seme', '1', '--strada', '1', '--ore', '1']), B = run(['--seme', '1', '--strada', '2', '--ore', '6']), Z = run(['--seme', '1', '--strada', '0', '--ore', '1']), C3 = run(['--seme', '2', '--strada', '1', '--ore', '1']);
  console.log(`seme 1, &strada=1: ${A.reg.n}/${A.reg.tot} col registro (${(A.reg.quota * 100).toFixed(1)}%) ${JSON.stringify(A.reg.tipi)}; &strada=2: ${(B.reg.quota * 100).toFixed(1)}%; &strada=0: ON ${Z.on}`);
  console.log(`battute in ${A.ore} ore: ${A.righe} (${A.diverse} diverse), ${JSON.stringify(A.stats)}`);
  prova(A.errori === 0 && B.errori === 0 && Z.errori === 0, `nessun errore nelle fasi (${A.errori}, ${B.errori}, ${Z.errori})${A.err1 ? ' — ' + A.err1 : ''}`);
  prova(A.quota0 >= .25 && A.quota0 <= .35, `&strada=1: circa il 30% ha il registro alla nascita (${(A.quota0 * 100).toFixed(1)}%; dopo ${A.ore} ore, col contagio, ${(A.reg.quota * 100).toFixed(1)}%)`);
  prova(B.quota0 >= .38 && B.quota0 <= .55, `&strada=2: circa il 45% (${(B.quota0 * 100).toFixed(1)}%)`);
  prova(Z.on === false && Z.righe === 0 && Z.reg.n === 0, '&strada=0: spento, nessuna battuta, nessun registro');
  prova(A.firma0 === A2.firma0 && A.firma0 !== C3.firma0, `lo stesso seme, la stessa gente; un altro seme, altra gente (${A.firma0} ${A2.firma0} ${C3.firma0})`);
  prova(['sb', 'co', 'ma'].every(k => A.reg.tipi[k] > 0), `le gradazioni ci sono: ${JSON.stringify(A.reg.tipi)}`);
  prova(A.righe >= 120, `battute del registro in ${A.ore} ore: ${A.righe}`);
  prova(A.diverse / Math.max(1, A.righe) >= .9, `distinte: ${A.diverse}/${A.righe} (${(A.diverse / Math.max(1, A.righe) * 100).toFixed(0)}%)`);
  prova(A.mondo / Math.max(1, A.righe) >= .6, `costruite dal mondo (il mestiere, un fatto vero, il debito, il rancore, il gruppo, la cultura, il posto, i bisogni, le espressioni): ${A.mondo}/${A.righe} (${(A.mondo / Math.max(1, A.righe) * 100).toFixed(0)}%)`);
  prova(A.stats.esp_nasce > 0 && A.stats.esp_passa > 0 && A.stats.esp_muta > 0 && A.stats.esp_muore > 0, `le espressioni nascono ${A.stats.esp_nasce}, passano ${A.stats.esp_passa}, mutano ${A.stats.esp_muta}, si consumano ${A.stats.esp_consumata || 0}, muoiono ${A.stats.esp_muore}`);
  for (const g of A.genealogie || []) console.log('       ' + g);
  // le parole coniate: nascono, si dicono, passano, mutano, muoiono, e si pronunciano (il filtro rifatto qui, da sé)
  const PR = w => /^[a-z]{5,16}$/.test(w) && /[aeiou]$/.test(w) && !/(.)\1\1|[^aeiou]{4}|([aeiou])\2/.test(w);
  const brutte = (A.coniate || []).filter(w => !PR(w));
  prova(A.stats.par_nasce > 10 && A.stats.dettePar > 10, `parole coniate: ${A.stats.par_nasce} nate, dette ${A.stats.dettePar} volte in battuta`);
  prova(A.coniate.length > 10 && !brutte.length, `si pronunciano: ${A.coniate.length - brutte.length}/${A.coniate.length}${brutte.length ? ' — ' + brutte.slice(0, 5).join(', ') : ''}`);
  prova(A.stats.par_passa > 0 && A.stats.par_muta > 0 && A.stats.par_muore > 0, `passano ${A.stats.par_passa}, mutano ${A.stats.par_muta}, muoiono ${A.stats.par_muore}, entrano nel gergo di un gruppo ${A.stats.par_gergo || 0}`);
  for (const g of A.parGen || []) console.log('       ' + g);
  // il comico delle parole: il punteggio fa da filtro, niente parole che esistono già, le radici variano, i ritorni
  const VERE = ['porcata', 'cazzata', 'caffetta', 'merdaccia', 'cazzaro', 'cazzone', 'scazzottare', 'porcheria', 'stronzata', 'vinata', 'birreria', 'secchione', 'figuraccia', 'cazzotto'];
  const rad = A.stats.radici || {}, nr = Object.values(rad).reduce((a, b) => a + b, 0), mr = Object.entries(rad).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  prova(A.stats.scartateRidere > 0 && A.stats.rideMin >= A.soglia, `il punteggio comico filtra: ${A.stats.scartateRidere} conii scartati sotto la soglia ${A.soglia}, il più debole nato vale ${A.stats.rideMin}`);
  prova(A.stats.reali > 0 && !A.coniate.some(w => VERE.includes(w)), `niente parole che esistono già (${A.stats.reali} scartate dal filtro)`);
  prova(nr > 10 && mr[1] / nr <= .2, `le radici variano: ${Object.keys(rad).length} radici su ${nr} parole, la più usata «${mr[0]}» ${mr[1]} volte`);
  // il paese: lo strato di popolo dal giorno zero, i fatti grossi che diventano ricorrenze, i titoli per chiamarsi, le feste, la varietà
  prova(A.folk0 >= 20 && ['sopr', 'santo', 'storia', 'ordine', 'reliquia'].every(k => A.stats['folk_' + k] > 0), `il paese dal giorno zero: ${A.folk0} cose di popolo (${['sopr', 'santo', 'storia', 'ordine', 'reliquia'].map(k => k + ' ' + A.stats['folk_' + k]).join(', ')}), ${A.stats.titoli || 0} titoli`);
  prova(A.stats.folkEventi > 0, `i fatti grossi diventano ricorrenze: ${A.stats.folkEventi} (feste ${A.stats.feste || 0}, brindisi ${A.stats.brindisi || 0}, appropriate dal Garante ${A.stats.appropriate || 0}, dimenticate ${A.stats.oblii || 0})`);
  prova(A.stats.titoliDetti > 0, `i titoli per chiamarsi: ${A.stats.titoliDetti} volte («${(A.folkEs || []).find(t => /Cavalier|Commendat|Gran |Barone|Priore|Decan|Ammiragl|Venerabil|Conte|Marches|Dama|Contessa|Badessa|Duca|Duchessa|Console|Abate|Arcidu|Patriarc|Matriarc|Custode|Accademic|Marescial|Podestà|Plenipot|Luogoten|Protonot|Ispett|Prefett/.test(t)) || '-'}»)`);
  prova(A.folkRighe >= 20 && A.folkDiverse / Math.max(1, A.folkRighe) >= .9 && A.folkNomiDoppi === 0, `in una settimana: ${A.folkDiverse}/${A.folkRighe} battute di popolo diverse, ${A.folkNomi} nomi senza doppioni; si chiede e si impara ${A.stats.domande || 0}/${A.stats.imparate || 0}`);
  for (const e of (A.folkEs || []).slice(0, 8)) console.log('       ' + e);
  // i ruoli: l'etichetta che si attacca, chi la abbraccia (coi desideri), gli atti col discorso, i seguaci, il posto (avanti veloce: --scala 8)
  const tutti = [A].concat(RL), sm = k => tutti.reduce((x, R) => x + (R.stats[k] || 0), 0);
  prova(sm('etichette') > 0 && sm('attaccate') > 0, `le etichette: ${sm('etichette')} soprannomi di scherno, ${sm('attaccate')} attaccati (abbraccia ${sm('ruolo_abbraccia')}, resiste ${sm('ruolo_resiste')}, ironia ${sm('ruolo_ironia')}, cede ${sm('ruolo_cede')})`);
  prova(sm('ruoli') > 0 && sm('desideriRuolo') > 0, `i ruoli: ${sm('ruoli')}, coi desideri del ruolo ${sm('desideriRuolo')}`);
  prova(sm('discorsi') > 0 && sm('attiFatti') > 0, `gli atti: ${sm('attiFatti')} fatti, ${sm('discorsi')} discorsi generati (${sm('discorsiDetti')} detti), pubblico ${sm('pubblico')}, seguaci ${sm('seguaci')}, rettificati ${sm('ruoliRettificati')}, multati ${sm('ruoliMultati')}`);
  prova(RL.some(R => R.stats.postiRuolo > 0), `il posto del ruolo, avanti veloce: ${RL.map(R => 'seme ' + R.seme + ': ' + (R.stats.postiRuolo || 0)).join(', ')} (edicole ${sm('edicole')}, vendette ${sm('vendette')}, fughe ${sm('fughe')})`);
  // gli assi: dominio × autorità × registro × emblema; tanti ruoli diversi, fra i semi e dal compositore
  const tipi = new Set(), labs = new Set(); for (const R of tutti) { (R.tipi || []).forEach(t => tipi.add(t)); (R.etiLab || []).forEach(t => labs.add(t)); }
  prova(tipi.size >= 6 && labs.size >= 40 && A.componi >= 400, `gli assi: ${tipi.size} ruoli diversi (dominio×autorità×registro) nei semi, ${labs.size} etichette diverse, il compositore ne fa ${A.componi} (articoli sbagliati ${A.componiNo})`);
  prova(A.componiNo === 0, `gli articoli delle etichette concordano (${A.componiNo} sbagliati su ${A.componi}, es. «${(A.componiEs || []).join('», «')}»)`);
  // l'aspetto: l'accessorio nato dalla storia, che si prende per imitazione e si smette; i segni sul posto costruito
  prova(sm('aspetti') > 0 && sm('vestiti') > sm('aspetti') && RL.some(R => R.stats.segni > 0), `l'aspetto: ${sm('aspetti')} ruoli con un accessorio, ${sm('vestiti')} persone che lo portano (${sm('imitati')} per imitazione, ${sm('smessi')} l'hanno smesso), segni sui posti ${sm('segni')} (${tutti.map(R => (R.look && R.look.ruoli || []).join(' ')).join(' ')})`);
  // i modi del comico: per chi parla e per il momento
  const modi = {}; for (const R of tutti) for (const k in (R.stats.modi || {})) modi[k] = (modi[k] || 0) + R.stats.modi[k];
  prova(Object.keys(modi).filter(k => k !== 'base').length >= 8, `i modi comici: ${Object.entries(modi).map(([k, v]) => k + ' ' + v).join(', ')}`);
  // l'equilibrio: i ruoli di comando sono pochi, i più sono di quartiere e di relazione
  { const q = sm('ruoliQuot'), pt = sm('ruoliPotere'), eq = sm('etiQuot'), ep = sm('etiPotere'), rel = {}; for (const R of tutti) for (const k in (R.stats.rel || {})) rel[k] = (rel[k] || 0) + R.stats.rel[k];
    prova(q > 0 && pt / Math.max(1, q + pt) <= .25 && ep / Math.max(1, eq + ep) <= .35, `l'equilibrio: ruoli di quartiere ${q}, di comando ${pt} (${Math.round(100 * pt / Math.max(1, q + pt))}%); etichette ${eq} contro ${ep}; le relazioni: ${Object.entries(rel).map(([k, v]) => k + ' ' + v).join(', ')}; riti contro la iella ${sm('riti')}`);
    for (const R of tutti) for (const l of (R.ruoliEs || []).slice(0, 6)) console.log('       ruolo: ' + l); }
  for (const R of RL) for (const l of (R.ruoliLog || []).slice(0, 10)) console.log('       ' + l);
  for (const R of RL) for (const l of (R.sermoni || []).slice(0, 3)) console.log('       discorso: ' + l);
  for (const R of RL) if (R.sermone) console.log('       sermone: ' + R.sermone.join(' / '));
  prova(A.stats.ritorniDetti > 0, `i ritorni (chi l'ha inventata, l'ho inventata io, si dice così): ${A.stats.ritorni} pensati, ${A.stats.ritorniDetti} detti`);
  prova(A.vicine === 0, `nessuna battuta uguale entro 30 righe (${A.vicine})`);
  prova(A.parolaMax[1] <= 6, `nessuna parola d'insulto più di 6 volte (la più usata: «${A.parolaMax[0]}» ${A.parolaMax[1]} volte su ${A.parole} insulti)`);
  prova(A.stats.sostituite > 0 && A.stats.etichette > 0, `sostituite ${A.stats.sostituite}, con l'etichetta ${A.stats.etichette}, dette da sé ${A.stats.proprie}`);
  prova(A.stats.rissa > 0 || (A.perIntento.rissa2 || 0) > 0, `la lite parla (${A.stats.rissa} da sé, ${A.perIntento.rissa2 || 0} insulti, pace ${['scusati', 'ridi', 'paga', 'scappa', 'arrenditi', 'separa'].map(k => A.perIntento[k] || 0).join('/')})`);
  prova(A.stats.presidio > 0, `il presidio ne parla (${A.stats.presidio} righe riconosciute, ${['proponi', 'si', 'no', 'contro', 'deciso', 'bocciato'].map(k => k + ' ' + (A.perIntento[k] || 0)).join(', ')})`);
  prova(A.stats.auto > 0, `chi guida (${A.stats.auto})`);
  console.log('\nesempi:'); for (const r of A.esempi) console.log(`  [${r[2]} ${r[3]} ${r[4]}] ${r[5]}`);
  console.log(`\n${ok} ok, ${no} NO`); process.exit(no ? 1 : 0);
}
const SRC = path.resolve(__dirname, '../src') + '/'; process.chdir(SRC);
const SEME = +arg('seme', 1), DIAL = arg('strada', '1'), ORE = +arg('ore', 24), CAMPIONE = argv.includes('--campione');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista', 'Eventi:eventi', 'Matti:matti'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const zitto = console.log; console.log = () => {};
const errori = []; console.warn = console.error = (...a) => { errori.push(a.map(x => String(x && x.stack || x)).join(' ').slice(0, 300)); };
require(SRC + 'seme.js')(SEME);
global.location = { search: '?commedia' + (DIAL !== '1' ? '&strada=' + DIAL : '') };
global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
delete global.document;
const U = global.Unico = require(SRC + 'unico_porta.js');
for (const m of COMMEDIA) { const [f, g] = m.split(':'); U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
U._nomeProva = null;
// i moduli unico, nell'ordine della pagina (src/index.src.html)
const html = require('fs').readFileSync(SRC + 'index.src.html', 'utf8'), blocco = html.slice(html.indexOf('<script data-m="unico">'), html.indexOf('Unico.chiudi()'));
for (const f of (blocco.match(/unico_[a-z_]+\.js/g) || [])) {
  if (f === 'unico_schermo.js') continue;
  const src = require('fs').readFileSync(SRC + f, 'utf8'), vars = (src.match(/^var ([A-Za-z]+)/gm) || []).map(x => x.slice(4));
  U._nomeProva = f.replace(/\.js$/, '');
  try { const M = require(SRC + f); const nome = vars[vars.length - 1]; if (nome) global[nome] = M; if (f === 'unico_attore.js') { global.Attore = M; global.Roba = M.Roba; } if (f === 'unico_mente.js') global.Mente = M; } catch (e) { errori.push(f + ': ' + e.message); }
}
U._nomeProva = null; U.chiudi(); if (global.Mente && Mente.CFG) Mente.CFG.classe = 'xe';
const G = Game, US = global.UnicoStrada, UC = global.UnicoCostruire;
if (US && US.ON && arg('scala')) US.CFG.scala = +arg('scala');
const out = { esito: 'ok', seme: SEME, dial: DIAL, ore: ORE, on: !!(US && US.ON) };
const st = G.create(SEME); st.deadline = 1e12;
const passo = k => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
passo(40);
const p = st.player; p.vehicle = null; p.indoor = null;
let C = null;
if (UC && UC.ON) {
  const V0 = UC.viaVicina(p.x, p.y, rd => rd.id !== 'corso' && rd.kind === 'citta' && rd.w >= 5.6); p.x = V0.x + 3; p.y = V0.y + 2; passo(20);
  const L = st.npcs.filter(n => n.pop && !n.inside && Mente._.candidato(st, n)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 12).sort((a, b) => (US && US.ON && US.registro(st, b.id) ? 1 : 0) - (US && US.ON && US.registro(st, a.id) ? 1 : 0)).slice(0, 4);
  C = UC.apri(st, { tipo: 'presidio', x: p.x, y: p.y, gruppo: L.map(n => n.id), pronto: true, R: 150 });
}
// la firma dei registri decisi all'inizio (prima del contagio): lo stesso seme, la stessa gente
passo(60); out.folk0 = US && US.ON && st.u.strada && st.u.strada.folk ? Object.keys(st.u.strada.folk.it).length : 0; out.quota0 = US && US.ON ? (() => { const g = st.npcs.filter(n => n.pop && (n.pop.age || 30) >= 15); return g.filter(n => US.registro(st, n.id)).length / g.length; })() : 0; out.firma0 = US && US.ON ? require('crypto').createHash('md5').update(st.npcs.filter(n => n.pop).map(n => n.id + ':' + US.registro(st, n.id)).join(',')).digest('hex').slice(0, 12) : '-';
const POSTI = ['piazza', 'calata', 'bar', 'molo', 'osteria', 'mercato', 'chiesa', 'porto', 'flamingo', 'stazione'].filter(k => G.PLACES && G.PLACES[k]);
const giro = i => { const k = POSTI[i % POSTI.length]; if (!k || (C && i % 3 === 0)) { if (C) { p.x = C.x + 2; p.y = C.y + 1; } return; } const P = G.PLACES[k]; p.x = P.x + 2; p.y = P.y + 2; };
// le scene di prova, una volta all'ora vicino al giocatore (il mondo da solo apre poche liti e le proposte le fanno in pochi):
//   la lite: i gradini 1-5 per uno col registro contro un vicino (Verbo.EFF.gradino, la stessa porta di unico_rissa.js), poi la pace;
//   il presidio: una proposta di uno col registro e le sue righe dette (UnicoCrescita.proponi, parlaOra);
//   chi guida: tre battute delle BATTUTE del presidio, da tre auto (UnicoPartiVivo.dice).
const DBG = {};
function lite() {
  if (!global.UnicoRissa || !UnicoRissa.ON) return;
  const L = st.npcs.filter(n => n.pop && !n.dead && !n.inside && !n.cop && !n.grigio && !n.faction && Math.hypot(n.x - p.x, n.y - p.y) < 80).sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y));
  const a = L.find(n => US.registro(st, n.id)), b = a && L.find(x => x !== a); if (!a || !b) { DBG.nolite = (DBG.nolite || 0) + 1; return; }
  a.x = p.x + 3; a.y = p.y + 1; b.x = a.x + 1.2; b.y = a.y; const c = { st, A: Attore.di(st, a) };
  for (const g of [1, 2, 3, 4, 5]) { try { Verbo.EFF.gradino(c, g, b.id); (DBG.bk = DBG.bk || []).push([g, a.bark && a.bark.text, Math.round(Math.hypot(a.x - p.x, a.y - p.y))]); } catch (e) { DBG.eg = e.message; } passo(70); a.x = p.x + 3; a.y = p.y + 1; b.x = a.x + 1.2; b.y = a.y; }
  try { Verbo.EFF.pace({ st, A: Attore.di(st, b) }, ['scusati', 'ridi', 'paga', 'scappa', 'arrenditi', 'separa'][k % 6], a.id); } catch (e) { DBG.ep = e.message; }
}
function presidio() {
  if (!C || !global.UnicoCrescita || !UnicoCrescita.ON || (C.cr && C.cr.prop)) return;
  const vive = Object.keys(C.vive || {}), chi = vive.find(id => US.registro(st, id)) || vive[0]; if (!chi) return;
  p.x = C.x + 2; p.y = C.y + 1;
  try { const r = UnicoCrescita.proponi(st, C, { forza: true, chi }); if (r) { passo(5); UnicoCrescita.parlaOra(st, C, 6); } } catch (e) { DBG.pe = e.message; }
}
function guida() {
  const UV = global.UnicoPartiVivo, B = global.UnicoPresidio && UnicoPresidio.BATTUTE; if (!UV || !UV.dice || !B) return;
  const V = st.vehicles.filter(v => !v.hidden && !v.wreck), ks = Object.keys(B);
  for (let i = 0; i < 3 && V.length; i++) { const v = V[(k * 7 + i * 13) % V.length], q = B[ks[(k + i) % ks.length]], L = q[(k + i) % 4 ? 'sbuffa' : 'tifa']; UV.dice(st, v, L[(k * 3 + i) % L.length], 3); }
}
function guasto() {   // un verbo fallito di uno col registro vicino al giocatore: il guasto (UnicoCose.guasto, come lo chiama unico_rissa.js)
  const CO = global.UnicoCose; if (!CO || !CO.ON || !CO.guasto) return;
  const a = st.npcs.filter(n => n.pop && !n.dead && !n.inside && US.registro(st, n.id)).sort((x, y) => Math.hypot(x.x - p.x, x.y - p.y) - Math.hypot(y.x - p.x, y.y - p.y))[0]; if (!a) return;
  a.x = p.x + 2.5; a.y = p.y - 1;
  try { CO.guasto(st, { id: 0, t: st.t, v: ['vai', 'compra', 'pesca', 'costruisce'][k % 4], chi: a.id, esito: 'no', x: { verbo: ['vai', 'compra', 'pesca', 'costruisce'][k % 4] }, test: [] }, true); } catch (e) { DBG.eu = e.message; }
}
const T0 = st.t; let k = 0, prossima = T0;
if (out.on) while (st.t - T0 < ORE * 60) {
  passo(20);
  if (US.feste && US.feste.length && k % 3 === 2) { const E = US.feste[US.feste.length - 1]; if (Math.hypot(p.x - E.x, p.y - E.y) > 20) { p.x = E.x + 3; p.y = E.y + 2; } }   // la festa di quartiere: il giocatore ci passa
  if (st.t >= prossima) { prossima += 30; giro(k++); if (k % 2 === 0) { lite(); guida(); } if (k % 4 === 1) presidio(); if (k % 4 === 3) guasto(); }
}
else passo(20 * 60);
// i registri
const S0 = st.u.strada || { reg: {} }, gente = st.npcs.filter(n => n.pop && (n.pop.age || 30) >= 15), tipi = {};
let nreg = 0, firma = ''; for (const n of gente) { const t = US && US.ON ? US.registro(st, n.id) : 0; if (t) { nreg++; tipi[t] = (tipi[t] || 0) + 1; firma += n.id + ':' + t + ','; } }
out.reg = { n: nreg, tot: gente.length, quota: nreg / Math.max(1, gente.length), tipi };
out.firma = require('crypto').createHash('md5').update(firma).digest('hex').slice(0, 12);
const LOG = US && US.ON ? US.log : [];
out.righe = LOG.length; out.diverse = new Set(LOG.map(r => r[5])).size;
let vicine = 0; for (let i = 0; i < LOG.length; i++) for (let j = Math.max(0, i - 30); j < i; j++) if (LOG[j][5] === LOG[i][5]) { vicine++; break; }
out.vicine = vicine;
{ const C = new Set(), no = []; if (US && US.componi) for (const f of US.FAMIGLIE) for (const a of US.AUTORITA) for (const e of ['cozza', 'triglia', 'scopa', 'tazzina', 'canotto', 'ombrello', 'zappa', 'chiodo', 'pesce', 'ancora']) for (let v = 0; v < 3; v++) for (const fe of [0, 1]) {
  const l = US.componi(f.k, a.k, e, fe, v, (e.length + v) % 5); C.add(l); if (/\bdel (Cozz|Trigli|Scop|Tazzin|Zapp)e\b|\bdella (Chiod|Pesc|Canott|Ombrell)i\b|\bdei (Cozz|Trigli|Scop|Tazzin|Zapp)e\b/.test(l)) no.push(l); }
  out.componi = C.size; out.componiNo = no.length; out.componiEs = [...C].filter((x, i) => i % 97 === 0).slice(0, 6); } { const RR = st.u.strada && st.u.strada.ruoli; if (RR) { const ids = new Set((RR.log || []).filter(r => r[2] === 'posto').map(r => r[1])); const keep = ids.size ? (RR.log || []).filter(r => ids.has(r[1])) : (RR.log || []).filter(r => r[2] !== 'scherno').slice(0, 12); out.ruoliLog = keep.map(r => `giorno ${(r[0] / 1440).toFixed(1)} [${r[2]}] ${r[3]}`); out.sermone = RR.ultimo || null; out.postiNo = RR.no || null; out.ruoliEs = Object.values(RR.R).map(R => `${R.lab} [${R.fam}/${R.reg}]: ${Object.keys(R.fatti || {}).join(', ') || '-'}${R.C ? ' · posto ' + R.Cnome : ''}${R.amato ? ' · ama ' + R.amato : ''}${R.kg ? ' · pesce ' + R.kg + ' kg' : ''}${R.coll ? ' · collezione ' + R.coll : ''}`); out.tipi = Object.keys(RR.tipi || {}); out.ruoliLab = Object.values(RR.R).map(R => R.lab); out.etiLab = Object.values(RR.eti).map(E => E.lab);
  const Lk = st.u.strada.look || { R: {}, chi: {} }; out.look = { ruoli: Object.values(Lk.R).map(A => A.acc + '/' + A.perche), portano: Object.keys(Lk.chi).length };
  out.sermoni = Object.values(RR.R).filter(R => R.detti.length).map(R => R.lab + ': ' + R.detti[R.detti.length - 1]).slice(0, 6); } } { const Fo = st.u.strada && st.u.strada.folk, R = LOG.filter(r => (r[8] || []).some(f => /^folk:/.test(f))); out.folkRighe = R.length; out.folkDiverse = new Set(R.map(r => r[5])).size; out.folkEs = R.filter((r, i) => i % Math.max(1, Math.floor(R.length / 10)) === 0).map(r => r[5]).slice(0, 10);
  const nomi = Fo ? Object.values(Fo.it).map(x => x.nome) : []; out.folkNomi = nomi.length; out.folkNomiDoppi = nomi.length - new Set(nomi).size; out.folkTutti = Fo ? Object.values(Fo.it).map(x => `[${x.k}] ${x.nome}${x.ex && x.ex.pat ? ', protett' + (/^Santa/.test(x.nome) ? 'rice ' : 'ore ') + x.ex.pat : ''}${x.uff ? ' (Garante: ' + x.uff + ')' : ''}`).slice(0, 60) : []; } out.soglia = US && US.CFG ? US.CFG.ride : 0; { const G1 = (st.u.strada && st.u.strada.gen) || []; out.coniate = [...new Set(G1.filter(r => r[6] === 'par').map(r => r[4]))];
  out.parNate = G1.filter(r => r[6] === 'par' && r[1] === 'nasce').slice(0, 40).map(r => `«${r[4]}» (${r[5]})`);
  out.parGen = G1.filter(r => r[6] === 'par' && (r[1] === 'nasce' || r[1] === 'muta')).slice(-6).map(r => `${r[1]}: «${r[4]}» (${r[5]})`); } out.mondo = LOG.filter(r => r[8] && r[8].length).length;
{ const G0 = (st.u.strada && st.u.strada.gen) || [], muta = G0.filter(r => r[1] === 'muta').slice(-3);
  out.genealogie = muta.map(m => { const L = G0.filter(r => r[2] === m[2]); return `${m[4]}  ←  ${m[5]} (${L.map(r => r[1] + '@' + Math.floor(r[0] / 1440) + 'g' + Math.round(r[0] % 1440 / 60) + 'h').join(', ')})`; }); }
const P = {}; let np = 0; for (const r of LOG) for (const w of r[6]) { P[w] = (P[w] || 0) + 1; np++; }
out.parole = np; out.parolaMax = Object.entries(P).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
out.stats = US && US.ON ? Object.assign({}, US.stats, { perIntento: undefined, perTipo: undefined }) : {}; out.perIntento = US && US.ON ? US.stats.perIntento : {};
out.esempi = LOG.filter((r, i) => i % Math.max(1, Math.floor(LOG.length / 25)) === 0).slice(0, 25);
// il generatore da solo
if (US && US.ON) {
  const d = f => { const L = []; for (let i = 0; i < 200; i++) L.push(f()); return new Set(L).size / L.length; };
  out.gen = { ins: d(() => US.insulto(st, 'm')), min: d(() => US.minaccia(st, 'co', 'm')), mal: d(() => US.maledizione(st, 'sb')) };
  if (argv.includes('--gen')) { if (argv.includes('--mr')) U.flusso = () => Math.random(); const L = []; for (let i = 0; i < 200; i++) L.push(US.maledizione(st, 'sb')); const c = {}; for (const x of L) c[x] = (c[x] || 0) + 1; out.dup = Object.entries(c).filter(x => x[1] > 1).sort((a, b) => b[1] - a[1]).slice(0, 15); }
} else out.gen = { ins: 0, min: 0, mal: 0 };
out.errori = errori.length + (U.errTot || 0); out.err1 = errori[0] || (U.errTot && U.ultimo ? JSON.stringify(U.ultimo).slice(0, 300) : '');
if (CAMPIONE) out.log = LOG;
// il campione per la direzione artistica (--md): le battute vere della giornata, per situazione e per tipo, più quelle che la
// giornata non ha avuto occasione di dire, chieste al sistema per una persona vera di ogni tipo
if (argv.includes('--md') && US && US.ON) {
  const TN = { sb: 'sboccato', co: 'coatto', ma: 'malavitoso', no: 'nonna sboccata', pr: 'prete/sagrestano', auto: 'automobilista' };
  const chi = t => st.npcs.find(n => n.pop && US.registro(st, n.id) === t), nomeDi = n => (n && (n.first || n.name)) || '';
  const mestiere = n => (n && n.pop && n.pop.job ? n.pop.job.title : n && n.pop && n.pop.status) || '';
  const righe = [], visti = new Set();
  const add = (sez, t, tipo, testo, base) => { if (!testo || visti.has(testo)) return; visti.add(testo); righe.push([sez, tipo, testo, base]); };
  const dalLog = (sez, f, max) => { let k = 0; for (const r of LOG) if (f(r) && k < max) { const n = r[1] && G.byId(st, r[1]); add(sez, r[0], r[2] + (n ? ` · ${nomeDi(n)}, ${mestiere(n)}` : ''), r[5], r[4] === 'e' ? r[7] : null); k++; } };
  const gen = (sez, intento, tipi, quante) => { for (const t of tipi) { const n = chi(t); if (!n) continue; for (let i = 0; i < quante; i++) { const X = US.ctxDi(st, n, t, null); X.g2 = 'm'; let s = null; try { s = US.riga(st, intento, X); } catch (e) { } add(sez, 0, t + ` · ${nomeDi(n)}, ${mestiere(n)}`, s, null); } } };
  dalLog('1. Chiacchiere di fondo (battuta del registro al posto della solita)', r => r[3] === 'fondo' && r[4] === 's', 12);
  dalLog('2. La battuta di sempre con l\'etichetta (prima → dopo)', r => r[4] === 'e' && r[7] && /^(fondo|te|saluto|deciso|proponi)$/.test(r[3]), 9);
  gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'saluto', ['co', 'ma', 'no'], 1); gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'urtato', ['sb', 'co', 'no'], 1);
  gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'derubato', ['sb', 'ma'], 1); gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'colpito', ['co', 'sb'], 1);
  gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'paura', ['co', 'sb', 'pr'], 1); gen('3. A Nino: saluto, urto, furto, botte, paura, grazie', 'aiutato', ['ma', 'no'], 1);
  dalLog('4. La lite (unico_rissa: borbotta, insulta, spinge, minaccia, mena, fa pace)', r => /^rissa\d$|^(scusati|ridi|paga|scappa|arrenditi|separa)$/.test(r[3]), 13);
  gen('4. La lite (unico_rissa: borbotta, insulta, spinge, minaccia, mena, fa pace)', 'scappa', ['co'], 1); gen('4. La lite (unico_rissa: borbotta, insulta, spinge, minaccia, mena, fa pace)', 'paga', ['co'], 1);
  dalLog('5. I guasti (unico_cose: cade, si rompe, si sporca...)', r => r[4] === 'p' && !/^rissa/.test(r[3]), 4);
  gen('5. I guasti (unico_cose: cade, si rompe, si sporca...)', 'si_rompe', ['sb', 'no'], 1); gen('5. I guasti (unico_cose: cade, si rompe, si sporca...)', 'si_bagna', ['co'], 1);
  dalLog('6. Il presidio ne discute (unico_crescita)', r => /^(proponi|deciso|contro)$/.test(r[3]), 3);
  gen('6. Il presidio ne discute (unico_crescita)', 'si', ['sb', 'ma'], 1); gen('6. Il presidio ne discute (unico_crescita)', 'no', ['sb', 'no'], 1); gen('6. Il presidio ne discute (unico_crescita)', 'bocciato', ['co'], 1);
  dalLog('7. Chi guida, al presidio', r => r[2] === 'auto', 5);
  dalLog('8. Le voci che girano (Si dice)', r => r[3] === 'voce', 4);
  const L = ['# Il registro di strada: un campione', '', `Generato dal sistema (src/unico_strada.js) con \`node banco/strada_node.js --dump --md --campione --seme ${SEME}\`: una giornata di 24 ore`,
    `col seme ${SEME}; ${out.reg.n} persone su ${out.reg.tot} hanno il registro (${(out.reg.quota * 100).toFixed(0)}%: ${Object.entries(out.reg.tipi).map(([k, v]) => v + ' ' + TN[k]).join(', ')}).`,
    `Nella giornata ${LOG.length} battute del registro, ${new Set(LOG.map(r => r[5])).size} diverse. Le sezioni 3, 5 e 6 hanno anche righe chieste al sistema per una persona vera`,
    'di quel tipo (situazioni che in un giorno di prova non capitano abbastanza vicino al giocatore). Fra parentesi quadre: il tipo, chi è, che mestiere fa.', ''];
  let sez = null; for (const r of righe.sort((a, b) => a[0].localeCompare(b[0]))) { if (r[0] !== sez) { sez = r[0]; L.push('', '## ' + sez, ''); } L.push(`- [${r[1]}] ${r[3] ? `«${r[3]}» → ` : ''}**«${r[2]}»**`); }
  out.md = L.join('\n') + '\n';
}
out.dbg = Object.assign(DBG, { ff: (() => { const o = {}; for (const f of Fatto.tutti(st)) if (/chiacchiera|guasto|insulto|nome_scelto/.test(f.v)) o[f.v] = (o[f.v] || 0) + 1; const c = Fatto.tutti(st).find(f => f.v === 'chiacchiera'); o.es = c && JSON.stringify({ chi: c.chi, con: c.con, t: c.t }); o.gruppi = global.UnicoGruppi && st.u.gruppi ? JSON.stringify(Object.keys(st.u.gruppi)) : '-'; o.com = st.u.cultura ? Object.values(st.u.cultura.com).map(c => c.k + ':' + c.nome).join(',') : '-'; return o; })(),  tolte: Commedia.stats.tolte,  C: !!C, rissa: global.UnicoRissa && UnicoRissa.stats, cr: global.UnicoCrescita && UnicoCrescita.stats, upr: global.UnicoPresidio && UnicoPresidio.stats });
zitto(JSON.stringify(out));
process.exit(0);
