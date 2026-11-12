// [stradadipinta] prova della strada dipinta (strada_dipinta.js, ?stile=E), senza browser, sulla città nuova:
//   - spenta senza lo stile (attiva() falso: la storia dei muri resta quella di writer_vita.js);
//   - accesa: la distribuzione a regole (densità per zona: le zone calde molto più fitte delle piazze, della chiesa e del regime; il ritmo
//     alterna tratti calmi e punti fitti), la gerarchia (pochi grandi, tanti piccoli), i fondali delle viste lunghe, gli adesivi sui pali e
//     accanto alle porte, i manifesti a strati, la stessa città a ogni partita (seme fisso);
//   - la tavolozza: nessun colore della strada finisce vicino al vermiglio, al limone o all'allarme (writer_arte.js tavMap su tutto il cubo sRGB).
//   node test_strada_dipinta.js
global.PV_STRADA_DIPINTA = true;
global.World = require('./world_cittanuova.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.WriterArte = require('./writer_arte.js'); global.Writing = require('./writing.js'); global.Segnaletica = require('./segnaletica.js');
global.StradaDipinta = require('./strada_dipinta.js'); global.WriterVita = require('./writer_vita.js');
const G = Game, WR = Writing, WV = WriterVita, SD = StradaDipinta, WA = WriterArte;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };

const FIRMA = process.argv.includes('--firma'), sig = A => require('crypto').createHash('sha1').update(A.filter(w => !/^[0-9]/.test(String(w.by))).map(w => w.style + Math.round(w.spot.x) + ',' + Math.round(w.spot.y)).join('|')).digest('hex');
// spenta / accesa
global.PV_STRADA_DIPINTA = false; ok(!SD.attiva(), 'senza lo stile E la strada dipinta è spenta'); global.PV_STRADA_DIPINTA = true; ok(SD.attiva(), 'con lo stile E è accesa');

// la storia dei muri
try { Segnaletica.piano(); } catch (e) { }   // come render.js all'avvio: i pali dei cartelli
const st = G.create(1); for (let i = 0; i < 6; i++) G.step(st, 1 / 30, { x: 0, y: 0 }); if (!WV.V(st).hist) WV.history(st);
const W = WR.S(st), L = W.works.filter(w => w.old && w.sdPal), M = SD.misura();
if (FIRMA) { console.log('FIRMA ' + sig(L)); process.exit(0); }
ok(L.length > 500 && L.length < 2000, `i lavori della strada dipinta: ${L.length}`);
ok(L.every(w => w.sdZona && w.sdLiv && w.sdEta != null), 'ognuno sa la sua zona, il suo livello e la sua età');
const per10 = z => { const len = WV.SITES.filter(s => s.kind !== 'heaven' && s.kind !== 'facciata' && SD.zonaSito(s) === z).reduce((a, s) => a + (s.len || 0), 0); const n = L.filter(w => w.sdZona === z && /^(strada|hall|ferrovia|muro|ponte)$/.test(w.spot.kind || '')).length; return len ? 10 * n / len : 0; };
const caldo = Math.max(per10('sottopasso'), per10('porto'), per10('ritrovo')), bello = Math.max(per10('piazza'), per10('sacro'), per10('regime'));
ok(caldo > 6 * Math.max(.2, bello), `le zone calde molto più fitte di piazze, chiesa e regime: ${caldo.toFixed(1)} contro ${bello.toFixed(2)} lavori ogni 10 m`);
ok(!L.some(w => /^(sacro|piazza|regime)$/.test(w.sdZona) && /^(pezzo|burner|murale|rullo|throw|verticale)$/.test(w.style)), 'sulla chiesa, sulle piazze belle e sul regime niente pezzi né throw-up');
const big = L.filter(w => /^(pezzo|burner|murale|rullo|calli)$/.test(w.style)).length, small = L.filter(w => /^(tag|mtag|adesivi|manifesto)$/.test(w.style)).length;
ok(small > 5 * big && big >= 15, `la gerarchia: ${big} lavori grandi, ${small} piccoli`);
ok(M.fondali.length >= 4, `i fondali delle viste lunghe: ${M.fondali.map(f => (f.via || 'corridoio') + ' ' + f.vista + ' m').join(', ')}`);
ok(L.filter(w => w.sdLiv === 'fondale').every(w => w.sdEta < .2), 'i pezzi dei fondali sono nuovi (si leggono)');
ok(M.pali > 5 && L.filter(w => w.sdAnc && w.sdAnc.k !== 'garante').every(w => w.style === 'adesivi'), `gli adesivi sui pali e dietro i cartelli: ${M.pali}`);
ok(M.porte > 20, `gli adesivi e le tag accanto alle porte: ${M.porte}`);
ok(L.filter(w => w.sdManifesti).some(w => w.sdManifesti.length >= 2), 'i manifesti a strati sullo stesso punto');
ok(L.some(w => w.style === 'buff') || L.some(w => w.sdToppa), 'le toppe grigie di chi ripulisce');
// niente lo stesso pezzo nella stessa vista
const doppi = []; L.filter(w => /^(pezzo|burner|murale|throw)$/.test(w.style)).forEach((a, i, A) => A.slice(i + 1).forEach(b => { if (a.aka === b.aka && a.style === b.style && Math.hypot(a.spot.x - b.spot.x, a.spot.y - b.spot.y) < 25) doppi.push(a.aka); }));
ok(!doppi.length, `lo stesso writer non ripete lo stesso pezzo nella stessa vista${doppi.length ? ': ' + doppi.join(', ') : ''}`);
// il ritmo: lungo una via la densità alterna
const R = []; for (let x = 1300; x <= 1460; x += 4) R.push(SD.ritmo(x, 370)); const mx = Math.max(...R), mn = Math.min(...R);
ok(mx / mn > 2.5, `il ritmo lungo la Via di Mezzo: da ${mn.toFixed(2)} a ${mx.toFixed(2)}`);
// la stessa città a ogni partita (un processo nuovo: Game.create una volta sola per processo)
{ const out = require('child_process').execFileSync(process.execPath, [__filename, '--firma'], { encoding: 'utf8', maxBuffer: 1 << 26 }); const m = /FIRMA ([0-9a-f]+)/.exec(out);
  ok(m && m[1] === sig(L), 'la stessa distribuzione a ogni partita (il seme è fisso)'); }
// con i tasselli: i lavori cotti si tengono dove la città dipinge, si diradano sulle piazze, sulla chiesa e sul regime
{ const C = []; WV.SITES.forEach((s, i) => { if (!s.out || s.kind === 'heaven') return; for (let k = 0; k < 3; k++) C.push({ style: k ? 'tag' : 'pezzo', spot: { x: s.x, y: s.y, kind: s.kind }, r: { c: [s.x - s.out[0] * .6, 1.5, s.y - s.out[1] * .6], n: [s.out[0], 0, s.out[1]] }, z0: SD.zonaSito(s) }); });
  const K = SD.rimodella(st, C.map(o => Object.assign({}, o))), frac = z => { const a = C.filter(o => o.z0 === z).length, b = K.filter(o => o.z0 === z).length; return a ? b / a : 0; };
  ok(frac('sottopasso') > .8 && frac('piazza') < .2 && frac('regime') < .2 && K.every(o => o.sdPal && o.sdZona), `la storia cotta rimodellata: tenuti ${Math.round(frac('sottopasso') * 100)}% nei sottopassi, ${Math.round(frac('piazza') * 100)}% sulle piazze, ${Math.round(frac('regime') * 100)}% sul regime`); }
// la tavolozza: i tre colori del gioco non escono mai dalla strada
const lab = h => WA.okLab(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
const VIE = ['#F04A23', '#FFE03A', '#FF2E5E'].map(lab); let vicino = 1, peggio = null;
for (let r = 0; r < 256; r += 8) for (let g = 0; g < 256; g += 8) for (let b = 0; b < 256; b += 8) { const c = WA.okLab(r, g, b), o = WA.tavMap(c[0], c[1], c[2]), q = WA.okLab(o[0], o[1], o[2]); VIE.forEach(v => { const d = Math.hypot(q[0] - v[0], q[1] - v[1], q[2] - v[2]); if (d < vicino) { vicino = d; peggio = [r, g, b, o]; } }); }
ok(vicino > .05, `nessun colore della strada vicino a vermiglio, limone, allarme (il più vicino a ${vicino.toFixed(3)} in Oklab)`);
ok(WA.tavMap(...lab('#16121B')).every(v => v < 40), 'il nero resta nero');
console.log(fail ? `\n${fail} prove NON passate` : '\ntutte le prove passate');
process.exit(fail ? 1 : 0);
