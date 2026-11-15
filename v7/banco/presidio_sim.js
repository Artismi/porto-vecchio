#!/usr/bin/env node
/* Porto Vecchio — banco/presidio_sim.js: 24 ore (o --ore N) di gioco senza disegno col presidio (src/unico_presidio.js, dietro ?commedia).
   Carica i moduli come src/test_unico_costruire.js (più unico_parti_vivo, unico_idee, unico_gruppi, unico_presidio), apre un presidio
   finito vicino al giocatore in una via di città e lascia andare il mondo: ogni ora quante persone ci stanno (C.vive), quanti pezzi ha
   portato la comunità, le auto passate, i fatti del presidio. Esce con 1 se una fase ha dato errori o se il presidio non cresce.
   Uso: node banco/presidio_sim.js [--ore 24] [--seme 1] [--lontano]   (--lontano: il giocatore a 600 m, tutto dai dati) */
'use strict';
const SRC = require('path').resolve(__dirname, '../src') + '/'; process.chdir(SRC);
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const ORE = +arg('ore', 24), SEME = +arg('seme', 1), LONTANO = argv.includes('--lontano');
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0])) && !/^\s+seme \d/.test(String(a[0]))) zitto(...a); };
const errori = []; console.warn = console.error = (...a) => { errori.push(a.map(x => String(x && x.stack || x)).join(' ').slice(0, 300)); };
require(SRC + 'seme.js')(SEME);
global.location = { search: '?commedia' };
global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
delete global.document;
const U = global.Unico = require(SRC + 'unico_porta.js');
for (const m of COMMEDIA) { const [f, g] = m.split(':'); U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
U._nomeProva = null;
global.Attore = require(SRC + 'unico_attore.js'); global.Roba = Attore.Roba;
global.UnicoCatalogo = require(SRC + 'unico_catalogo.js'); global.Lingua = require(SRC + 'unico_lingua.js');
global.Verbo = require(SRC + 'unico_verbi.js'); global.Fatto = require(SRC + 'unico_memoria.js');
global.UnicoSociali = require(SRC + 'unico_sociali.js'); global.Segni = require(SRC + 'unico_segni.js');
global.Mente = require(SRC + 'unico_mente.js'); global.Salva = require(SRC + 'unico_salva.js');
for (const [g, f] of [['UnicoParti', 'unico_parti'], ['UnicoCostruire', 'unico_costruire'], ['UnicoPartiVivo', 'unico_parti_vivo'], ['UnicoPresidio', 'unico_presidio'], ['UnicoIdee', 'unico_idee'], ['UnicoGruppi', 'unico_gruppi'], ['UnicoCorpi', 'unico_corpi']]) {
  U._nomeProva = f; try { global[g] = require(SRC + f + '.js'); } catch (e) { errori.push(f + ': ' + e.message); } }
U._nomeProva = null; U.chiudi(); Mente.CFG.classe = 'xe';
console.log = zitto;
const G = Game, UC = UnicoCostruire, UPr = UnicoPresidio;
const ok = UC.ON && UPr.ON; console.log(`moduli: costruire ${UC.ON}, parti_vivo ${UnicoPartiVivo.ON}, presidio ${UPr.ON}, corpi ${UnicoCorpi.ON}, idee ${UnicoIdee.ON}, gruppi ${UnicoGruppi.ON}`);
if (!ok) process.exit(1);
const st = G.create(SEME); st.deadline = 1e12;
const passo = k => { for (let i = 0; i < (k || 1); i++) G.step(st, 1 / 20, { x: 0, y: 0 }); };
passo(40);
const p = st.player, V0 = UC.viaVicina(p.x, p.y, rd => rd.id !== 'corso' && rd.kind === 'citta' && rd.w >= 5.6); p.vehicle = null; p.indoor = null; p.x = V0.x + 3; p.y = V0.y + 2;
passo(20);
// il gruppo dei fondatori: i tre candidati più vicini
const L = st.npcs.filter(n => n.pop && !n.inside && Mente._.candidato(st, n)).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3);
const C = UC.apri(st, { tipo: 'presidio', x: p.x, y: p.y, gruppo: L.map(n => n.id), pronto: true, R: 150 });
if (!C) { console.log('nessun posto per il presidio', JSON.stringify(UC.ultimoNo)); process.exit(1); }
console.log(`presidio ${C.id} in ${C.via} (via larga ${C.w} m), ${C.pezzi.length}/${C.piano.length} pezzi dei fondatori, in mezzo passano ${C.misure.passa} m; ora ${(st.t % 1440 / 60).toFixed(1)}`);
if (LONTANO) { p.x = C.x + 600 > G.WW - 20 ? C.x - 600 : C.x + 600; }
// un'auto del traffico messa sulla corsia della via del presidio, 25 m prima: deve passare in mezzo, piano, senza fermarsi né girarsi
const prova = { fatta: false, esito: null };
function auto() {
  const li = G.MAP.lanes.findIndex(l => l.id === C.rd); if (li < 0) return { no: 'la via non ha corsie' };
  const P = G.MAP.lanes[li].pts; let cum = 0, best = [Infinity, 0]; for (let i = 1; i < P.length; i++) { cum += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); const d = Math.hypot(P[i][0] - C.x, P[i][1] - C.y); if (d < best[0]) best = [d, cum]; }
  const v = st.vehicles.find(x => x.traffic && !x.hidden && x.kind !== 'bus' && (G.VK[x.kind] || {}).len <= 5); if (!v) return { no: 'nessuna auto del traffico' };
  v.lane = { i: li, s: best[1] - 25, dir: 1 }; v.speed = 6; cum = 0; for (let i = 1; i < P.length; i++) { cum += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (cum >= best[1] - 25) { v.x = P[i][0]; v.y = P[i][1]; v.ang = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]); break; } }
  for (let i = 0; i < 3; i++) passo(1);
  const urti0 = UnicoPartiVivo.stats.urti, l0 = UC.locale(C, v.x, v.y); let yMin = Infinity, yMax = -Infinity, vmax = 0, dentro = 0;
  for (let i = 0; i < 20 * 40; i++) { passo(1); const l = UC.locale(C, v.x, v.y), sp = Math.hypot(v.vx || 0, v.vy || 0); if (Math.abs(l.y) < 6) { yMin = Math.min(yMin, l.y); yMax = Math.max(yMax, l.y); if (Math.abs(l.y) < 3) { vmax = Math.max(vmax, sp); dentro = Math.max(dentro, Math.abs(l.x)); } } }
  return { auto: v.id, partenza: +l0.y.toFixed(1), attraversa: yMin < -4 && yMax > 4 || yMax < -4 && yMin > 4 || (yMin < -3 && yMax > 3), da: +yMin.toFixed(1), a: +yMax.toFixed(1), velMax: +vmax.toFixed(1), scostoMax: +dentro.toFixed(2), urti: UnicoPartiVivo.stats.urti - urti0, traffico: v.traffic, stuck: v.stuck, ferme: UPr.stats.ferme, indietro: UPr.stats.indietro };
}
const righe = [], t0 = st.t, T0 = Date.now(); let pros = t0, vicini = 0;
while (st.t - t0 < ORE * 60) {
  passo(20);
  if (st.t >= pros) {
    pros += 60; const N = C.vive ? Object.keys(C.vive).length : 0, at = {}; for (const id in C.vive || {}) at[C.vive[id][0]] = (at[C.vive[id][0]] || 0) + 1;
    const qui = st.npcs.filter(n => !n.inside && Math.hypot(n.x - C.x, n.y - C.y) < 9).length; vicini = Math.max(vicini, qui);
    righe.push([((st.t % 1440) / 60).toFixed(0).padStart(2) + ':00', N, qui, C.pezzi.length + '/' + C.piano.length, JSON.stringify(at), C.chiuso ? 'CHIUSO' : '']);
    if (C.chiuso && righe.filter(r => r[5]).length > 2) break;
    if (!prova.chiusa && C.meta.chiusa && C.meta.chiusa.fatta) { prova.chiusa = auto(); console.log('strada chiusa, auto:', JSON.stringify(prova.chiusa)); }
    if (!prova.fatta && st.t - t0 > 150) { prova.fatta = true; prova.esito = auto(); console.log('auto in mezzo:', JSON.stringify(prova.esito), JSON.stringify(UPr.stats)); }
  }
}
for (const r of righe) console.log(`${r[0]}  in strada ${String(r[1]).padStart(2)} (a 9 m: ${String(r[2]).padStart(2)})  pezzi ${r[3]}  ${r[4]} ${r[5]}`);
const fatti = Fatto.tutti(st).filter(f => f.x && f.x.cantiere === C.id && /^(presidio|multa|sgombero|strada_chiusa)/.test(f.v));
console.log('\nfatti:'); for (const f of fatti) console.log(`  ${(f.t / 60 % 24).toFixed(1).padStart(4)}h ${f.v}${f.segno ? ' [' + f.segno + ']' : ''}: ${f.d || f.x.d || ''}`);
const att = Fatto.tutti(st).filter(f => /_in_strada$|^dipinge_la_strada$/.test(f.v)); const pa = {}; att.forEach(f => { pa[f.v + ':' + f.esito] = (pa[f.v + ':' + f.esito] || 0) + 1; });
console.log('\nverbi in strada:', JSON.stringify(pa));
console.log('stats:', JSON.stringify(UPr.stats), 'corpi:', JSON.stringify(UnicoCorpi.stats));
const e0 = U.errTot || 0;
console.log(`errori: ${errori.length} (Unico.errTot ${e0})${errori.length ? ' — ' + [...new Set(errori)].slice(0, 4).join(' | ') : ''}; ${((Date.now() - T0) / 1000).toFixed(0)} s`);
const maxN = Math.max(...righe.map(r => r[1]));
if (C.meta.chiusa) { const V2 = UnicoParti.valida(C.pezzi.map(([i]) => C.piano[i])); console.log(`chiusura: decisa a ${(C.meta.chiusa.t / 60 % 24).toFixed(1)}h, fatta ${C.meta.chiusa.fatta}, ${C.piano.length - C.meta.chiusa.da} pezzi di barricata, tutto pulito ${V2.ok} (${V2.sovr.length} compenetrazioni), varco a piedi ${C.misure.passa} m`); }
process.exit(errori.length || e0 || maxN < 8 ? 1 : 0);
