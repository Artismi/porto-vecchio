// [segni] prova del regista delle pagine (scena.js) e della rete elettrica (rete.js) sulla città nuova: conteggi e regole
// node src/test_segni.js   (dalla cartella v7)
const path = require('path'), src = __dirname;
global.World = require(path.join(src, 'world_cittanuova.js')); global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
const Scena = require(path.join(src, 'scena.js')), Rete = require(path.join(src, 'rete.js')), G = Game;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const t0 = Date.now(); Scena.init(G); Scena.piano(); const t1 = Date.now(); Rete.init(G, Scena); const t2 = Date.now(); const A = Scena.contaArredo();
const C = Scena.conteggio(), R = Rete.conteggio();
console.log(`scena ${t1 - t0} ms, rete ${t2 - t1} ms`);
console.log('pagine', JSON.stringify(C.tipi), 'quiete', C.quietePct + '%', 'fondali', JSON.stringify(C.fondali));
console.log('impaginazioni', JSON.stringify(C.imp));
console.log('voci chieste', JSON.stringify(C.perVoce), 'presi', C.presi, 'negati', C.negati);
console.log('rete', JSON.stringify(R));
console.log('arredo', JSON.stringify(A));
// --- le regole delle pagine ---
ok(C.pagine > 300, `ci sono pagine (${C.pagine})`);
ok(C.quietePct >= 28 && C.quietePct <= 48, `il 30-40% delle pareti è solo materiale e un accento (${C.quietePct}%)`);
ok(C.sforano === 0, 'nessuna pagina sfora (1 dominante, ≤ 3 secondari, ≤ 2 accenti)');
const P = Scena.pagine(), par = P.filter(p => p.tipo === 'parete');
ok(par.every(p => p.f === 'S' || p.f === 'E'), 'le pareti sono solo le facce che la camera vede (S, E)');
let vicineUguali = 0; par.forEach(p => { if (p.imp.quiete) return; par.forEach(q => { if (q !== p && q.via === p.via && q.nome === p.nome && Math.hypot(p.x - q.x, p.z - q.z) < 7) vicineUguali++; }); });
ok(vicineUguali <= par.length * .08, `quasi mai la stessa impaginazione su due pareti attaccate della stessa via (${vicineUguali / 2} coppie)`);
let domVicini = 0; const dom = P.filter(p => p.dom); dom.forEach(p => dom.forEach(q => { if (q !== p && Scena.FAMIGLIA[p.dom] === Scena.FAMIGLIA[q.dom] && Math.hypot(p.x - q.x, p.z - q.z) < Scena.RAGGIO[Scena.FAMIGLIA[p.dom]]) domVicini++; }));
ok(domVicini / 2 <= dom.length * .06, `due dominanti della stessa famiglia troppo vicini (raggio per famiglia): ${domVicini / 2} coppie su ${dom.length} dominanti`);
ok(P.filter(p => p.nome === 'testata_del_regime').every(p => p.cieca >= 4 && p.fl >= 2), 'i ritratti solo su testate cieche ≥ 4 m');
ok(P.filter(p => p.nome === 'cantiere').length <= 3, 'al massimo tre cantieri in città');
// chiedi: la seconda richiesta della stessa voce è negata; una voce fuori pagina è negata
const bot = P.find(p => p.nome === 'bottega_del_borgo'); if (bot) { const q = bot.at(1), a = Scena.chiedi(q[0], q[1], 'insegna'), b = Scena.chiedi(q[0], q[1], 'insegna'), c = Scena.chiedi(q[0], q[1], 'ritratto');
  ok(a && a.cls === 'dom' && Math.abs(a.u - bot.porta) < .01 && !b && !c, 'chiedi: l\'insegna sta sull\'asse del portone, una sola, e il ritratto non c\'è in quella pagina'); }
// --- la rete ---
ok(R.errori.length === 0, 'ogni segmento ha due nodi veri e nessun filo supera i 30 m' + (R.errori.length ? ': ' + R.errori.slice(0, 3).join('; ') : ''));
ok(R.caviTraversoPer100mVicolo <= 6, `cavi di traverso nei vicoli per 100 m: ${R.caviTraversoPer100mVicolo} (≤ 6)`);
ok(R.per.dorsale > 50 && R.mensole > 60, `la dorsale c'è (${R.per.dorsale} tratti, ${R.mensole} mensole)`);
ok(R.cabine >= 2, `cabine ENEL di quartiere: ${R.cabine}`);
ok(R.per.allaccio > 30 && R.contatori === R.per.allaccio, `un contatore per casa allacciata (${R.contatori})`);
const g = Rete.grafo(), N = g.nodi, S = g.segmenti, B = G.BUILDINGS, era = n => n.bi !== null && n.bi >= 0 ? (B[n.bi].shack ? 'E7' : B[n.bi].era) : null;
const abEra = {}; S.filter(s => s.k === 'abusivo').forEach(s => { const e = era(N[s.b]); abEra[e] = (abEra[e] || 0) + 1; });
console.log('abusivi per epoca', JSON.stringify(abEra));
// [mappa_compatta] nella città compatta le baracche sono due file sole fra i binari e il mare: si confronta la frequenza per casa, non il totale
const nEra = {}; B.forEach(b => { const e = b.shack ? 'E7' : b.era; if (e) nEra[e] = (nEra[e] || 0) + 1; }), rate = e => (abEra[e] || 0) / Math.max(1, nEra[e] || 0);
ok(rate('E7') > rate('E0') * 2 && !abEra.E4, `gli abusivi stanno soprattutto fra le baracche e mai sulla Vittoria (${JSON.stringify(abEra)}; per casa E7 ${rate('E7').toFixed(2)}, E0 ${rate('E0').toFixed(2)})`);
ok(S.filter(s => s.k === 'moncone').length > 0, 'sulla Vittoria restano i monconi tagliati dal regime');
ok(!S.some(s => (s.rd === 'vittoria' || s.rd === 'corso') && (s.k === 'dorsale' || s.k === 'traversata')), 'niente fili in aria sulla Vittoria e sul Corso (interrata)');
ok(R.pozzetti > 5, `pozzetti dove la rete è interrata: ${R.pozzetti}`);
ok(S.every(s => s.k !== 'traversata' || Math.hypot(N[s.a].x - N[s.b].x, N[s.a].z - N[s.b].z) < 16), 'le traversate sono corte (una via, non un isolato)');
ok(g.lampioni.length > 20 && g.lampioni.filter(l => l.modello === 'braccio').length > 10, `lampioni per epoca: ${JSON.stringify(g.lampioni.reduce((o, l) => (o[l.modello] = (o[l.modello] || 0) + 1, o), {}))}`);
const br = g.lampioni.filter(l => l.modello === 'braccio'); ok(br.every(l => S.some(s => s.k === 'lampione' && s.b === l.id)), 'ogni lampione a braccio del borgo è alimentato da una mensola della dorsale');
ok(R.antenne > 40 && S.filter(s => s.k === 'antenna' && s.facciata).length > 10, `antenne TV sui tetti (${R.antenne}) e cavi che scendono in facciata`);
// --- l'arredo ---
const PA = Scena.piano();
ok(A.bidoniPer100mVicolo <= 4 && A.bidoni >= 10, `bidoni solo nei vicoli, ${A.bidoniPer100mVicolo} per 100 m (≤ 4; erano 446 in tutta la città)`);
ok(A.coppiePer100mVia <= 2 && A.cassonetti % 2 === 0 && A.cassonetti >= 6, `cassonetti a coppie (${A.cassonetti / 2} coppie, ${A.coppiePer100mVia} per 100 m di via)`);
ok(PA.bucato.every(q => q.len <= 7 && q.y >= 4 && q.y <= 5 && q.capi >= 3 && q.capi <= 6) && A.bucato >= 8, `bucato solo nei vicoli ≤ 5 m, a 4-5 m, 3-6 capi (${A.bucato})`);
ok(A.bucatoPer100mVicolo + R.caviTraversoPer100mVicolo <= 8, `fili sopra i vicoli (bucato + cavi) per 100 m: ${(A.bucatoPer100mVicolo + R.caviTraversoPer100mVicolo).toFixed(1)}`);
const TS = G.TS, carr = (x, z) => G.tileAt(Math.floor(x / TS), Math.floor(z / TS)) === G.T.VIA;
ok(A.dehors >= 1 && PA.dehors.every(d => d.tavoli.every(t => !carr(t.x, t.z))), `dehors (${A.dehors}, ${A.tavolini} tavolini) mai in carreggiata`);
ok(PA.dehors.every(d => d.tavoli.every(t => { const b = B[d.bi], wx = d.f === 'S' ? (b.y + b.h) * TS : (b.x + b.w) * TS; return Math.abs((d.f === 'S' ? t.z : t.x) - wx) <= 2; })), 'i tavolini a ≤ 2 m dal muro');
ok(A.targhe > 20 && A.civici > 40, `targhe delle vie agli angoli (${A.targhe}) e civici accanto ai portoni (${A.civici})`);
// [facciate2] i segni di vita delle facciate: al massimo 3 per parete, il 40% delle pareti quiete, il condizionatore solo nel boom
const V = Scena.contaVita(); console.log('vita', JSON.stringify(V));
ok(V.max <= 3 && V.quietePct >= 35 && V.quietePct <= 48, `segni di vita: ≤ 3 per facciata (max ${V.max}), ${V.quietePct}% delle pareti quiete`);
ok(par.every(p => (p.vita || []).indexOf('condizionatore') < 0 || p.era === 'E6'), 'il condizionatore solo sulle case del boom');
ok(par.every(p => (p.vita || []).indexOf('bucato') < 0 || p.fl >= 2), 'il bucato solo dove c\'è un piano sopra');
const C2 = Scena.conteggio(); ok(C2.sforano === 0, `dopo l'arredo e la rete nessuna pagina sfora (voci prese ${C2.presi}, negate ${C2.negati})`);
console.log(fail ? `\n${fail} prove fallite` : '\ntutte le prove passano');
process.exit(fail ? 1 : 0);
