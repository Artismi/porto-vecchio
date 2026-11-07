// [lontano9] LA TAVOLA PRIMA | DOPO: negli stessi posti, lo stesso fotogramma (il mondo fermo: la stessa simulazione, lo stesso tempo),
// camera9 senza lontano9 e con lontano9, e la differenza ×4. Poi la striscia del retino: allontanandosi da un posto, ogni 2 m, con e senza.
//   node sonda_tavola9.js [query] [cartella foto]   → le foto in cartella; tavola9.json coi numeri della differenza
const path = require('path'), fs = require('fs');
const { avvia } = require('../../controlli8/sonde/lib.js'), { posa } = require('../../camera9/sonde/passo9.js');
const Q = process.argv[2] || 'leggera&tassellivecchi', DIR = process.argv[3] || '/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/lontano9/tavola';
const POSTI = [['sbocco sulla piazza (Vicolo dei Lanternini)', [1372.1, 296.5], [1373, 310.6]], ['vicolo stretto (Caruggio dei Pescatori)', [1343.49, 320.61], [1342.67, 324.79]], ['lungomare', [1415, 399], [1441, 399]], ['cima della Scala del Mercato', [1288.84, 342.9], [1288.84, 347.4]], ['piazza San Rocco', [1375, 304], [1393, 302]], ['Corte dei Pescatori (fessura 2,2 m)', [1388, 360], [1396, 360]]];
const scrivi = (url, f) => { fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const { pg, log, close } = await avvia({ query: Q, vp: { width: +(process.env.W9 || 1280), height: +(process.env.H9 || 720) } });
  const J = [];
  // lo stesso fotogramma, con e senza: il mondo non avanza (dt minuscolo, lo stesso tempo), due fotogrammi per modo (il secondo si tiene)
  const doppia = () => pg.evaluate(() => { const pv = window.__pv, Rr = pv.R, rd = Rr.__models.renderer, gl = rd.getContext(); if (gl.__vero) for (const k in gl.__vero) gl[k] = gl.__vero[k];
    const t = pv.ui.time, ui = { zoom: .5, time: t, stick: null, lead: null, tilt: 0, rot: 0, drag: 0, edge: 0, puntatore: false, reale: 1e-4, mira: null }, o = {};
    const cam = Rr.getCamera(), rb = rd.renderBufferDirect; let n = 0; rd.renderBufferDirect = function (c) { if (c === cam) n++; return rb.apply(this, arguments); };   // i disegni della vista
    for (const att of [false, true]) { Lontano9.attivo = att; for (let i = 0; i < 2; i++) { ui.time = t; Lontano9.azzera(); n = 0; Rr.frame(pv.st, 1e-4, ui); } o[att ? 'dopo' : 'prima'] = rd.domElement.toDataURL('image/png'); o['c' + (att ? 'Dopo' : 'Prima')] = cam.position.toArray(); o['n' + (att ? 'Dopo' : 'Prima')] = n; o['t' + (att ? 'Dopo' : 'Prima')] = 0; if (att) o.l9 = Lontano9.conto(); }
    rd.renderBufferDirect = rb;
    if (gl.__vero) for (const k in gl.__vero) gl[k] = function () { }; return o; });
  try {
    for (let i = 0; i < POSTI.length; i++) { const [nome, at, verso] = POSTI[i];
      await posa(pg, { at, verso, c9: true, assesta: 2.5, foto: false });
      // la camera deve essere la stessa nei due (le molle e le attese della camera contano il tempo vero: SwiftShader è lento): si ripete
      let o = null; for (let t = 0; t < 5; t++) { o = await doppia(); const d = Math.hypot(...o.cPrima.map((v, k) => v - o.cDopo[k])); if (d < .01) break; log('la camera si è mossa di', d.toFixed(3), 'm: si rifà'); }
      const fp = scrivi(o.prima, path.join(DIR, `t${i}_prima.png`)), fd = scrivi(o.dopo, path.join(DIR, `t${i}_dopo.png`));
      J.push({ i, nome, prima: fp, dopo: fd, disegni: [o.nPrima, o.nDopo], triangoli: [o.tPrima, o.tDopo], occluse: o.l9.occluse, piccole: o.l9.piccole, fascia: o.l9.fascia }); log(nome, o.nPrima, '→', o.nDopo);
    }
    // la striscia: indietro lungo il lungomare (le cose piccole passano la fascia), ogni 2 m, con e senza
    const S = []; for (let k = 0; k < 8; k++) { const x = 1430 - k * 2.5; await posa(pg, { at: [x, 399], verso: [x - 20, 399.5], c9: true, assesta: .6, foto: false }); let o = null; for (let t = 0; t < 5; t++) { o = await doppia(); if (Math.hypot(...o.cPrima.map((v, k) => v - o.cDopo[k])) < .01) break; }
      S.push({ k, x, prima: scrivi(o.prima, path.join(DIR, `s${k}_prima.png`)), dopo: scrivi(o.dopo, path.join(DIR, `s${k}_dopo.png`)), disegni: [o.nPrima, o.nDopo], fascia: o.l9.fascia }); log('striscia', k, o.nPrima, o.nDopo, o.l9.fascia); }
    fs.writeFileSync(path.join(DIR, 'tavola.json'), JSON.stringify({ query: Q, posti: J, striscia: S }, null, 1));
  } catch (e) { log('ERRORE', e.message, e.stack); }
  log('FINE'); await close();
})();
