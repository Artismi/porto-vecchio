// [graffitipool] IL CONTO DEL POOL DEI GRAFFITI: quanti lavori di ogni stile, crew, writer, zona, livello, manifesto, adesivo ha la città di
// partenza (la storia dei muri), con la strada dipinta (stile E, di serie) e senza. Senza browser, sulla città nuova.
//   node strumenti/graffiti_pool.js senza [--g2]                  la storia dei muri senza tasselli (StradaDipinta.storia intera)
//   node strumenti/graffiti_pool.js tasselli <graffiti.json> [--g2] coi tasselli: i lavori cotti diradati (rimodella) + fondali, porte, pali
//   node strumenti/graffiti_pool.js vecchia                        la storia di prima (senza stile E: writer_vita.js history)
// --g2: con ?graffiti2 (src/graffiti2.js). Scrive JSON su stdout (l'ultima riga). GRAFFITI_POOL.md, _immagini/graffiti_pool/.
'use strict';
const path = require('path'), fs = require('fs'), SRC = path.join(__dirname, '..', 'src');
const MODO = process.argv[2] || 'senza', FILE = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null, G2 = process.argv.includes('--g2');
if (MODO !== 'vecchia') global.PV_STRADA_DIPINTA = true;
if (G2) global.PV_GRAFFITI2 = true;
const rq = f => require(path.join(SRC, f));
global.World = rq('world_cittanuova.js'); global.Interior = rq('interiors.js');
global.Game = rq('game.js'); global.Risacca = rq('risacca.js'); global.Popolo = rq('popolo.js'); global.Azioni = rq('azioni.js');
global.Economia = rq('economia.js'); global.Fazioni = rq('fazioni.js'); global.Soldi = rq('soldi.js'); global.Oggetti = rq('oggetti.js');
global.Graffiti = rq('graffiti.js'); global.Livelli = rq('livelli.js'); global.Sottosuolo = rq('sottosuolo.js'); global.Tetti = rq('tetti.js');
global.WriterArte = rq('writer_arte.js'); global.Writing = rq('writing.js'); global.Segnaletica = rq('segnaletica.js');
global.StradaDipinta = rq('strada_dipinta.js');
if (G2) global.Graffiti2 = rq('graffiti2.js');
global.WriterVita = rq('writer_vita.js');
const G = Game, WR = Writing, WV = WriterVita, SD = StradaDipinta;
let cottiIn = 0;
if (MODO === 'tasselli') {
  const L = JSON.parse(fs.readFileSync(FILE, 'utf8')).lavori; cottiIn = L.length;
  global.Tasselli = { chiesto: true, deciso: true, attivo: () => true, graffiti: L };
  // writing.js cotti vuole THREE (i vettori del riquadro): qui basta il lavoro col suo centro
  WR._.cotti = (st, K) => { const W = WR.S(st); K.forEach(o => { const w = Object.assign({}, o); w.id = W.nextId++; w.cotto = true; w.pos = { x: o.r.c[0], y: o.r.c[1], z: o.r.c[2] }; w.rr = o.r; delete w.r; W.works.push(w); }); return K.length; };
}
try { Segnaletica.piano(); } catch (e) { }   // come render.js all'avvio: i pali dei cartelli
const st = G.create(1); for (let i = 0; i < 6; i++) G.step(st, 1 / 30, { x: 0, y: 0 }); if (!WV.V(st).hist) WV.history(st);
const W = WR.S(st), L = W.works.filter(w => w.old && (w.spot || w.pos));
const BORGO = [1100, 240, 1620, 470];
const xy = w => w.pos ? [w.pos.x, w.pos.z] : [w.spot.x, w.spot.y];
const inB = w => { const [x, y] = xy(w); return x > BORGO[0] && x < BORGO[2] && y > BORGO[1] && y < BORGO[3]; };
const zona = w => w.sdZona || (w.spot ? SD.zonaPunto(w.spot.x, w.spot.y, -Math.cos(w.spot.face || 0), -Math.sin(w.spot.face || 0), w.spot.kind) : '?');
const cnt = (A, f) => { const o = {}; A.forEach(w => { const k = f(w); if (k == null) return; o[k] = (o[k] || 0) + 1; }); return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); };
const GR = /^(pezzo|burner|murale|rullo|calli|verticale|wholecar|mostro)$/;
const out = {
  modo: MODO + (G2 ? '+graffiti2' : ''), cottiIn, totale: L.length, borgo: L.filter(inB).length,
  grandi: L.filter(w => GR.test(w.style)).length, grandiBorgo: L.filter(w => GR.test(w.style) && inB(w)).length,
  stili: cnt(L, w => w.style), stiliBorgo: cnt(L.filter(inB), w => w.style),
  zone: cnt(L, zona), livelli: cnt(L, w => w.sdLiv || (w.cotto ? 'cotto' : 'storia')),
  crew: cnt(L, w => w.crew || '—'), writer: cnt(L, w => w.style === 'manifesto' || w.style === 'buff' ? null : (w.aka || '?') + (w.crew ? ' (' + w.crew + ')' : '')),
  manifesti: cnt(L.filter(w => w.sdManifesti), w => w.sdManifesti[w.sdManifesti.length - 1].t.replace('\n', ' ')),
  fogliManifesti: L.reduce((a, w) => a + (w.sdManifesti ? w.sdManifesti.length : w.style === 'manifesto' ? 1 : 0), 0),
  adesivi: { muro: L.filter(w => w.style === 'adesivi' && !w.sdAnc && (!w.spot || w.spot.kind !== 'porta')).length, porte: L.filter(w => w.spot && w.spot.kind === 'porta').length, pali: L.filter(w => w.sdAnc && w.sdAnc.k === 'palo').length, retro: L.filter(w => w.sdAnc && w.sdAnc.k === 'retro').length },
  toppe: L.filter(w => w.sdToppa).length + L.filter(w => w.style === 'buff').length,
  stileZona: (() => { const o = {}; L.forEach(w => { const z = zona(w); (o[z] = o[z] || {})[w.style] = (o[z][w.style] || 0) + 1; }); return o; })(),
  sd: SD.misura(), g2: G2 && global.Graffiti2 && Graffiti2.misura ? Graffiti2.misura() : null,
};
console.log(JSON.stringify(out));
