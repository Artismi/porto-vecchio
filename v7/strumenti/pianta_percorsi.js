// [percorsi] LA PIANTA DEI PERCORSI: la città nuova dall'alto (le caselle, in grigio caldo) e sopra la rete di percorsi.js
// (W.percorsi): i tre dominanti, i secondari, le scorciatoie (con il guadagno) e i nascondigli, i circuiti sui tetti e il camminamento
// delle mura, le porte della città con la loro alternativa, i punti di richiamo di ogni tratto (la freccia dello sguardo).
//   node strumenti/pianta_percorsi.js uscita.png [x0 y0 x1 y1] [px per metro]
// Disegna in Chromium senza testa (per le scritte); i dati vengono dal motore in Node, come test_percorsi.js.
const path = require('path'), fs = require('fs'), src = path.join(__dirname, '..', 'src');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const G = Game, T = G.T, GW = G.GW, TS = G.TS, B = G.BUILDINGS, W = G.MAP.world, D = Percorsi.dati;
const [out = 'pianta_percorsi.png', a0, b0, a1, b1, s0] = process.argv.slice(2);
const X0 = +a0 || 1170, Y0 = +b0 || 252, X1 = +a1 || 1545, Y1 = +b1 || 424, S = +s0 || 4;
// il fondo: le caselle a 1 px per casella, i colori di pianta.js smorzati
const nx = Math.ceil((X1 - X0) / TS), ny = Math.ceil((Y1 - Y0) / TS), px = Buffer.alloc(nx * ny * 4);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const tx = Math.floor(X0 / TS) + i, ty = Math.floor(Y0 / TS) + j, v = G.tileAt(tx, ty), k = ty * GW + tx; let c;
  if (v === T.WATER) c = [176, 196, 208]; else if (v === T.BLD) { const b = B[W.bIndex[k]], f = b ? b.fl || 1 : 3; const l = Math.max(120, 214 - f * 14); c = [l, l * .97, l * .93]; }
  else if (v === T.GRASS || v === T.TREE || v === T.SHRUB) c = [206, 214, 190]; else if (W.roadW[k] > 0) c = [246, 242, 232]; else c = [234, 229, 218];
  const o = (j * nx + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
const dati = { X0, Y0, S, nx, ny, base: px.toString('base64'),
  percorsi: D.percorsi.map(p => ({ id: p.id, nome: p.nome, k: p.k, pts: p.pts, L: p.L })),
  tratti: D.tratti.map(t => ({ id: t.id, a: t.pts[0], z: t.pts[t.pts.length - 1], r: t.richiamo, borgo: t.borgo })),
  scorc: D.scorciatoie.map(s => ({ nome: s.nome, k: s.k, pts: s.pts, L: s.L, Ls: s.Lstrada, g: s.guadagno, cieco: s.cieco })),
  giri: D.circuiti.map(c => ({ nome: c.nome, k: c.k, pts: c.pts, L: c.L, crema: c.crema })),
  porte: D.porte.map(p => ({ nome: p.nome, x: p.x, y: p.y, alt: p.alternativa && { k: p.alternativa.k, nome: p.alternativa.nome, pts: p.alternativa.pts } })),
  scale: Tetti.LADDERS.filter(L => L.fx > X0 && L.fx < X1 && L.fy > Y0 && L.fy < Y1).map(L => [L.fx, L.fy, L.footB >= 0 ? 1 : 0]),
  landmark: D.landmark.filter(q => q.x > X0 && q.x < X1 && q.y > Y0 && q.y < Y1).map(q => ({ x: q.x, y: q.y, nome: q.nome })), conta: Percorsi.conteggio() };
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: Math.round((X1 - X0) * S), height: Math.round((Y1 - Y0) * S) + 170 } });
  await pg.setContent('<html><body style="margin:0;background:#f4f0e8"><canvas id="c"></canvas></body></html>');
  const png = await pg.evaluate(async d => {
    const c = document.getElementById('c'), Wd = Math.round((d.nx * 2) * d.S), Hd = Math.round((d.ny * 2) * d.S); c.width = Wd; c.height = Hd + 170; const x = c.getContext('2d');
    x.fillStyle = '#f4f0e8'; x.fillRect(0, 0, c.width, c.height);
    const raw = Uint8ClampedArray.from(atob(d.base), ch => ch.charCodeAt(0)), tc = document.createElement('canvas'); tc.width = d.nx; tc.height = d.ny; tc.getContext('2d').putImageData(new ImageData(raw, d.nx, d.ny), 0, 0);
    x.imageSmoothingEnabled = false; x.drawImage(tc, 0, 0, Wd, Hd); x.imageSmoothingEnabled = true;
    const P = (wx, wy) => [(wx - (Math.floor(d.X0 / 2) * 2)) * d.S, (wy - (Math.floor(d.Y0 / 2) * 2)) * d.S];
    const line = (pts, w, col, dash) => { x.beginPath(); pts.forEach((q, i) => { const [a, b] = P(q[0], q[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.lineWidth = w; x.strokeStyle = col; x.setLineDash(dash || []); x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); x.setLineDash([]); };
    const dot = (wx, wy, r, col, st) => { const [a, b] = P(wx, wy); x.beginPath(); x.arc(a, b, r, 0, 6.3); x.fillStyle = col; x.fill(); if (st) { x.lineWidth = 1.5; x.strokeStyle = st; x.stroke(); } };
    const txt = (s, wx, wy, col, sz, bold) => { const [a, b] = P(wx, wy); x.font = (bold ? 'bold ' : '') + (sz || 11) + 'px sans-serif'; x.lineWidth = 3; x.strokeStyle = 'rgba(244,240,232,.9)'; x.strokeText(s, a, b); x.fillStyle = col; x.fillText(s, a, b); };
    const COL = { dom: '#b03a1e', sec: '#d98a2b', sc: '#2a7a4a', na: '#5a4a6a', giro: '#c8462a', mura: '#7a5a3a', porta: '#1a1a1a', alt: '#2a5aa0', rich: '#3a6ea8' };
    d.scorc.forEach(s => line(s.pts, s.k === 'scorciatoia' ? 3 : 2.5, s.k === 'scorciatoia' ? COL.sc : COL.na, s.k === 'scorciatoia' ? null : [3, 3]));
    d.percorsi.filter(p => p.k === 'secondario').forEach(p => line(p.pts, 5, COL.sec));
    d.percorsi.filter(p => p.k === 'dominante').forEach(p => line(p.pts, 8, COL.dom));
    // i nodi fra i tratti
    d.tratti.forEach(t => { dot(t.a[0], t.a[1], 2.6, '#fff', '#555'); });
    // i richiami: dall'inizio del tratto una freccia sottile verso il punto che chiama
    d.tratti.forEach(t => { const r = t.r; if (!r) return; const [a, b] = P(t.a[0], t.a[1]), [e, f] = P(r.x, r.y), L = Math.hypot(e - a, f - b) || 1, ux = (e - a) / L, uy = (f - b) / L;
      x.beginPath(); x.moveTo(a, b); x.lineTo(e, f); x.lineWidth = 1; x.strokeStyle = 'rgba(58,110,168,.55)'; x.setLineDash([2, 3]); x.stroke(); x.setLineDash([]);
      x.beginPath(); x.moveTo(e, f); x.lineTo(e - ux * 7 - uy * 3.5, f - uy * 7 + ux * 3.5); x.lineTo(e - ux * 7 + uy * 3.5, f - uy * 7 - ux * 3.5); x.closePath(); x.fillStyle = COL.rich; x.fill();
      const sym = { landmark: '◆', luce: '✶', mare: '≈', porta: '▮', lanterna: '•' }[r.k] || '?'; txt(sym, r.x + .8, r.y - .8, COL.rich, 12, true); });
    // i circuiti sui tetti e le mura
    d.giri.forEach(g => { line(g.pts, 3.5, g.k === 'mura' ? COL.mura : COL.giro, [7, 4]); const m = g.pts[Math.floor(g.pts.length / 2)]; txt(g.nome.replace(/^Il /, '') + ' ' + Math.round(g.L) + ' m', m[0] + 1.5, m[1] - 2, g.k === 'mura' ? COL.mura : COL.giro, 11, true); });
    d.scale.forEach(([a, b, roof]) => dot(a, b, 2, roof ? '#e8a080' : '#b8462a'));
    // le porte e l'alternativa
    d.porte.forEach(p => { if (p.alt) line(p.alt.pts, 3, COL.alt, [2, 3]); const [a, b] = P(p.x, p.y); x.fillStyle = COL.porta; x.fillRect(a - 6, b - 6, 12, 12); x.fillStyle = '#f4f0e8'; x.fillRect(a - 3, b - 3, 6, 6);
      txt(p.nome.replace(/ \(.*\)/, '') + (p.alt ? ' → ' + p.alt.k : ''), p.x + 2.5, p.y + 4, COL.porta, 11, true); });
    d.landmark.forEach(q => { dot(q.x, q.y, 4, COL.rich); });
    d.percorsi.forEach(p => { const m = p.pts[Math.floor(p.pts.length * .3)]; txt(p.nome, m[0], m[1] - 2.2, p.k === 'dominante' ? COL.dom : '#9a5a10', p.k === 'dominante' ? 13 : 11, true); });
    d.scorc.filter(s => s.k === 'scorciatoia').forEach(s => { const m = s.pts[Math.floor(s.pts.length / 2)]; txt('−' + Math.round(s.g * 100) + '%', m[0] + 1, m[1], COL.sc, 10, true); });
    // la legenda
    const ly = Hd + 14; x.font = 'bold 14px sans-serif'; x.fillStyle = '#222'; x.fillText('I percorsi del level designer — Porto Vecchio, città nuova', 12, ly + 4);
    const C = d.conta, voci = [[COL.dom, 8, null, 'percorsi dominanti (Rua, Vittoria, Corso)'], [COL.sec, 5, null, `secondari (${C.secondari})`], [COL.sc, 3, null, `scorciatoie (${C.scorciatoie}, −${Math.round(C.guadagnoMedio * 100)}% in media)`], [COL.na, 2.5, [3, 3], `nascondigli (${C.nascondigli})`],
      [COL.giro, 3.5, [7, 4], 'circuiti sui tetti'], [COL.mura, 3.5, [7, 4], 'camminamento delle mura'], [COL.alt, 3, [2, 3], 'alternativa alla porta (tetti o tombino)'], [COL.rich, 1, [2, 3], `sguardo verso il richiamo (${C.tratti} tratti)`]];
    x.font = '12px sans-serif'; x.fillStyle = '#3a6ea8'; x.fillText('richiami: ◆ landmark  ✶ luce di piazza  ≈ mare  ▮ porta accesa  • lanterna', 880, ly + 28 + 3 * 24 + 4);
    voci.forEach(([col, w, dash, t], i) => { const X = 12 + (i % 3) * 420, Y = ly + 28 + Math.floor(i / 3) * 24; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + 34, Y); x.lineWidth = w; x.strokeStyle = col; x.setLineDash(dash || []); x.stroke(); x.setLineDash([]); x.font = '12px sans-serif'; x.fillStyle = '#222'; x.fillText(t, X + 42, Y + 4); });
    const Y4 = ly + 28 + 3 * 24; x.fillStyle = '#1a1a1a'; x.fillRect(22, Y4 - 6, 12, 12); x.fillStyle = '#f4f0e8'; x.fillRect(25, Y4 - 3, 6, 6); x.font = '12px sans-serif'; x.fillStyle = '#222'; x.fillText('porta della città', 54, Y4 + 4);
    x.beginPath(); x.arc(450, Y4, 3, 0, 6.3); x.fillStyle = '#b8462a'; x.fill(); x.fillStyle = '#222'; x.fillText('scala minio da terra (rosa: da un tetto più basso)', 474, Y4 + 4);
    return c.toDataURL('image/png').split(',')[1];
  }, dati);
  fs.writeFileSync(out, Buffer.from(png, 'base64')); log('pianta dei percorsi', out, JSON.stringify(dati.conta)); await b.close();
})();
