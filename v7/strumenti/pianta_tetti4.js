// [tetti4] LA PIANTA DEI TETTI: il borgo, la marina e l'Ottocento dall'alto, ogni tetto colorato per la sua classe (Tetti.copertura4):
// sul circuito, raggiungibile dalla rete, isola (ci si sale ma non si arriva ai giri), irraggiungibile; il tratteggio sui tetti muti
// (niente sopra, la forma più comune del quartiere). Sopra: i circuiti coi rami e le vie di salita, le scale, le passerelle, i salti,
// i premi (belvedere, terrazza, tesoro, discesa in corte) e le corti a terra con il loro scopo. La legenda dice i conti per quartiere.
//   node strumenti/pianta_tetti4.js uscita.png [x0 y0 x1 y1] [px per metro]
// Disegna in Chromium senza testa (per le scritte); i dati vengono dal motore in Node, come test_tetti4.js.
const path = require('path'), fs = require('fs'), src = path.join(__dirname, '..', 'src');
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const log = console.log, warn = console.warn; console.log = () => {}; console.warn = () => {};
global.World = require(path.join(src, 'world_cittanuova.js')); global.Percorsi = require(path.join(src, 'percorsi.js'));
global.Interior = require(path.join(src, 'interiors.js')); global.Game = require(path.join(src, 'game.js'));
global.Livelli = require(path.join(src, 'livelli.js')); global.Sottosuolo = require(path.join(src, 'sottosuolo.js')); global.Tetti = require(path.join(src, 'tetti.js'));
console.log = log; console.warn = warn;
const G = Game, T = G.T, GW = G.GW, TS = G.TS, B = G.BUILDINGS, W = G.MAP.world, D = Percorsi.dati, TT = Tetti;
const [out = 'pianta_tetti4.png', a0, b0, a1, b1, s0, titolo0] = process.argv.slice(2);
const X0 = +a0 || 1240, Y0 = +b0 || 246, X1 = +a1 || 1476, Y1 = +b1 || 450, S = +s0 || 5;
const C4 = TT.copertura4(), CL = { giro: [200, 70, 42], rete: [92, 160, 96], isola: [232, 190, 64], muro: [128, 118, 132] };
const nx = Math.ceil((X1 - X0) / TS), ny = Math.ceil((Y1 - Y0) / TS), px = Buffer.alloc(nx * ny * 4), muti = [];
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const tx = Math.floor(X0 / TS) + i, ty = Math.floor(Y0 / TS) + j, v = G.tileAt(tx, ty), k = ty * GW + tx; let c;
  if (v === T.WATER) c = [176, 196, 208]; else if (v === T.BLD) { const bi = W.bIndex[k], b = B[bi], q = bi >= 0 ? C4.classe[bi] : null;
    if (q) { c = CL[q.k].slice(); const f = b.fl || 1; c = c.map(u => Math.round(u * (1.08 - f * .07))); if (q.muto) muti.push([tx, ty]); }
    else { const f = b ? b.fl || 1 : 3, l = Math.max(150, 222 - f * 12); c = [l, l * .98, l * .95]; } }
  else if (v === T.GRASS || v === T.TREE || v === T.SHRUB) c = [206, 214, 190]; else if (W.roadW[k] > 0) c = [246, 242, 232]; else c = [234, 229, 218];
  const o = (j * nx + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
// i bordi delle case (per leggere i tetti uno a uno)
const bordi = []; B.forEach((b, i) => { if (!C4.classe[i]) return; const x = b.x * TS, y = b.y * TS; if (x + b.w * TS < X0 || x > X1 || y + b.h * TS < Y0 || y > Y1) return; bordi.push([x, y, b.w * TS, b.h * TS]); });
const giri = D.circuiti.map(c => ({ id: c.id, nome: c.nome, k: c.k, tema: c.tema || '', premio: c.premio || '', pts: c.pts, L: c.L,
  rami: (c.rami || []).map(r => ({ pts: r.pts, premio: r.premio, nome: r.nome })), vie: (c.vie || []).map(v => ({ pts: v.pts, verso: v.verso })) }));
const dati = { X0, Y0, S, nx, ny, base: px.toString('base64'), muti, bordi, giri, zone: C4.zone, titolo: titolo0 || '',
  scale: TT.LADDERS.filter(L => L.fx > X0 && L.fx < X1 && L.fy > Y0 && L.fy < Y1 && !L.camm).map(L => [L.fx, L.fy, L.footB >= 0 ? 1 : 0, L.tipo4 || '']),
  assi: TT.PLANKS.map(P => [P.wa, P.wb, P.arco ? 1 : 0]), salti: TT.JUMPS.map(J => { const k = Math.floor((J.k0 + J.k1) / 2), [wx, wy] = J.sd.wall(k); return [wx + J.ox * TS / 2, wy + J.oy * TS / 2]; }),
  premi: (TT.PREMI || []).map(q => ({ x: q.x, y: q.y, k: q.k, nome: q.nome })), corti: (TT.CORTI || []).map(q => ({ x: q.x, y: q.y, k: q.k, nome: q.nome, celle: q.celle })),
  belv: TT.BELV.filter(v => v.x > X0 && v.x < X1 && v.y > Y0 && v.y < Y1).map(v => [v.x, v.y]) };
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: Math.round((X1 - X0) * S), height: Math.round((Y1 - Y0) * S) + 230 } });
  await pg.setContent('<html><body style="margin:0;background:#f4f0e8"><canvas id="c"></canvas></body></html>');
  const png = await pg.evaluate(async d => {
    const c = document.getElementById('c'), Wd = Math.round(d.nx * 2 * d.S), Hd = Math.round(d.ny * 2 * d.S); c.width = Wd; c.height = Hd + 230; const x = c.getContext('2d');
    x.fillStyle = '#f4f0e8'; x.fillRect(0, 0, c.width, c.height);
    const raw = Uint8ClampedArray.from(atob(d.base), ch => ch.charCodeAt(0)), tc = document.createElement('canvas'); tc.width = d.nx; tc.height = d.ny; tc.getContext('2d').putImageData(new ImageData(raw, d.nx, d.ny), 0, 0);
    x.imageSmoothingEnabled = false; x.drawImage(tc, 0, 0, Wd, Hd); x.imageSmoothingEnabled = true;
    const OX = Math.floor(d.X0 / 2) * 2, OY = Math.floor(d.Y0 / 2) * 2, P = (wx, wy) => [(wx - OX) * d.S, (wy - OY) * d.S];
    // il tratteggio dei tetti muti
    x.strokeStyle = 'rgba(40,30,30,.45)'; x.lineWidth = 1;
    d.muti.forEach(([tx, ty]) => { const [a, b2] = P(tx * 2, ty * 2), s = 2 * d.S; x.save(); x.beginPath(); x.rect(a, b2, s, s); x.clip(); for (let u = -s; u < s; u += 4) { x.beginPath(); x.moveTo(a + u, b2 + s); x.lineTo(a + u + s, b2); x.stroke(); } x.restore(); });
    x.strokeStyle = 'rgba(30,24,20,.55)'; x.lineWidth = 1; d.bordi.forEach(([bx, by, bw, bh]) => { const [a, b2] = P(bx, by); x.strokeRect(a + .5, b2 + .5, bw * d.S - 1, bh * d.S - 1); });
    const line = (pts, w, col, dash) => { x.beginPath(); pts.forEach((q, i) => { const [a, b2] = P(q[0], q[1]); i ? x.lineTo(a, b2) : x.moveTo(a, b2); }); x.lineWidth = w; x.strokeStyle = col; x.setLineDash(dash || []); x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); x.setLineDash([]); };
    const dot = (wx, wy, r, col, st) => { const [a, b2] = P(wx, wy); x.beginPath(); x.arc(a, b2, r, 0, 6.3); x.fillStyle = col; x.fill(); if (st) { x.lineWidth = 1.5; x.strokeStyle = st; x.stroke(); } };
    const txt = (s, wx, wy, col, sz, bold) => { const [a, b2] = P(wx, wy); x.font = (bold ? 'bold ' : '') + (sz || 11) + 'px sans-serif'; x.lineWidth = 3; x.strokeStyle = 'rgba(244,240,232,.92)'; x.strokeText(s, a, b2); x.fillStyle = col; x.fillText(s, a, b2); };
    // le corti a terra: il contorno e lo scopo
    const CK = { pozzo: '#3a7ab8', orto: '#4a8a3a', bottega: '#8a5a2a', passaggio: '#6a4a8a' };
    d.corti.forEach(q => { x.fillStyle = (CK[q.k] || '#444') + '55'; (q.celle || []).forEach(([tx, ty]) => { const [a, b2] = P(tx * 2, ty * 2); x.fillRect(a, b2, 2 * d.S, 2 * d.S); }); txt('◻ ' + q.nome, q.x - 3, q.y + 1, CK[q.k] || '#444', 10, true); });
    d.assi.forEach(([a, z, arco]) => line([a, z], 4, arco ? '#8a7a6a' : '#efe6cc'));
    d.salti.forEach(([a, b2]) => dot(a, b2, 2.5, '#efe6cc', '#6a5a4a'));
    d.giri.forEach(g => { const col = g.k === 'mura' ? '#7a5a3a' : '#c8462a';
      g.vie.forEach(v => line(v.pts, 2, v.verso === 'giu' ? 'rgba(42,90,160,.8)' : 'rgba(200,70,42,.8)', [2, 3]));
      g.rami.forEach(r => line(r.pts, 2.5, '#7a2a6a', [5, 3]));
      line(g.pts, 3.5, col, [7, 4]); });
    d.scale.forEach(([a, b2, roof, t]) => dot(a, b2, roof ? 2 : 2.6, roof ? (t ? '#ff9a60' : '#e8a080') : '#b8462a', roof ? null : '#fff'));
    const PS = { belvedere: '◆', terrazza: '❀', tesoro: '★', corte: '▼' };
    d.premi.forEach(q => { dot(q.x, q.y, 5, '#7a2a6a', '#fff'); txt(PS[q.k] || '?', q.x - 1.2, q.y + 1.2, '#fff', 10, true); });
    d.belv.forEach(([a, b2]) => dot(a, b2, 3, '#2a5aa0', '#fff'));
    d.giri.forEach(g => { const m = g.pts[Math.floor(g.pts.length / 2)]; txt(g.nome.replace(/^Il /, '') + (g.tema ? ' · ' + g.tema : ''), m[0] + 1.5, m[1] - 2, g.k === 'mura' ? '#7a5a3a' : '#9a2a10', 11, true); });
    // la legenda
    const ly = Hd + 18; x.font = 'bold 15px sans-serif'; x.fillStyle = '#222'; x.fillText('I tetti come secondo livello — ' + (d.titolo || 'Porto Vecchio, città nuova'), 12, ly);
    const voci = [['#c8462a', 'sul circuito'], ['#5ca060', 'raggiungibile dalla rete'], ['#e8be40', 'isola (ci si sale, ma non porta ai giri)'], ['#80768a', 'irraggiungibile']];
    voci.forEach(([col, t], i) => { const X = 12 + i * 260, Y = ly + 22; x.fillStyle = col; x.fillRect(X, Y - 9, 22, 13); x.font = '12px sans-serif'; x.fillStyle = '#222'; x.fillText(t, X + 30, Y + 2); });
    { const X = 12 + 4 * 260 - 40, Y = ly + 22; x.strokeStyle = 'rgba(40,30,30,.6)'; x.strokeRect(X, Y - 9, 22, 13); for (let u = 0; u < 22; u += 4) { x.beginPath(); x.moveTo(X + u, Y + 4); x.lineTo(X + u + 8, Y - 9); x.stroke(); } x.fillStyle = '#222'; x.fillText('muto (vuoto e di serie)', X + 30, Y + 2); }
    const Y2 = ly + 46; x.font = '12px sans-serif'; x.fillStyle = '#222';
    x.fillText('linea tratteggiata rossa: circuito · viola: ramo verso il premio (◆ belvedere ❀ terrazza ★ tesoro ▼ discesa in corte) · puntini: altre vie su (rosso) e giù (blu) · ● scala da terra, ● piccola: da tetto a tetto · crema: passerella, grigio: arco · ◻ corti a terra', 12, Y2);
    let Y3 = Y2 + 26; x.font = 'bold 13px sans-serif';
    Object.entries(d.zone).forEach(([z, s]) => { x.fillStyle = '#222'; x.fillText(`${z}: ${s.tetti} tetti — sul circuito ${s.giro} (${Math.round(100 * s.attraversati)}%), raggiungibili dalla rete ${s.giro + s.rete} (${Math.round(100 * s.raggiungibili)}%), isole ${s.isola}, irraggiungibili ${s.muro}, muti ${s.muti} (${Math.round(100 * s.quotaMuti)}%) · forme: ${Object.entries(s.forme).map(([f, n]) => f + ' ' + n).join(', ')}`, 12, Y3); Y3 += 22; });
    x.font = '12px sans-serif'; x.fillText(`circuiti sui tetti: ${d.giri.filter(g => g.k === 'tetti').length} — ` + d.giri.filter(g => g.k === 'tetti').map(g => g.nome.replace(/^Il giro (del|della|dei|delle|dell')\s?/, '') + (g.premio ? ' (' + g.premio + ')' : '')).join(' · '), 12, Y3 + 4);
    return c.toDataURL('image/png').split(',')[1];
  }, dati);
  fs.writeFileSync(out, Buffer.from(png, 'base64')); log('pianta dei tetti', out, JSON.stringify(Object.fromEntries(Object.entries(C4.zone).map(([z, s]) => [z, { tetti: s.tetti, giro: s.giro, rete: s.rete, isola: s.isola, muro: s.muro, muti: s.muti }])))); await b.close();
})();
