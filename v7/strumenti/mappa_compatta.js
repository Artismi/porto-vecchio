// La mappa compatta (fase 1, il progetto): disegna la pianta di progetto e il confronto con la pianta di oggi.
// Uso: node strumenti/mappa_compatta.js [cartella]   (predefinita: _immagini/mappa_compatta)
// Esce: progetto.png (la mappa come la riceverebbe il giocatore) e confronto.png (stessa cornice sopra la pianta di oggi).
// La costa e la ferrovia vengono dal generatore della città nuova (world_cittanuova.js); il resto è il progetto di
// src/progetto_citta/MAPPA_COMPATTA.md, scritto qui come dato in metri finali (x verso est, y verso sud).
const path = require('path'), fs = require('fs'), cp = require('child_process');
process.env.PV_CITTANUOVA = '1';
const SRC = path.join(__dirname, '..', 'src'), OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', '_immagini', 'mappa_compatta'));
fs.mkdirSync(OUT, { recursive: true });
global.World = require(path.join(SRC, 'world_cittanuova.js'));
const W = World, T = W.T, TS = W.TS, GW = W.GW;
const F = { x0: 1222, y0: 238, x1: 1622, y1: 452, s: 4 };   // la cornice (metri) e i pixel per metro

// ---------- il terreno: acqua, terra, banchine (per casella da 2 m) ----------
const terra = [];
for (let y = F.y0; y < F.y1; y += TS) { const row = []; for (let x = F.x0; x < F.x1; x += TS) { const v = W.grid[Math.floor(y / TS) * GW + Math.floor(x / TS)]; row.push(v === T.WATER ? 0 : v === T.QUAY || v === T.PIER ? 2 : 1); } terra.push(row); }
const rail = (W.railCity || []).filter(p => p[0] > F.x0 - 10 && p[0] < 1490).map(p => [+p[0].toFixed(1), +p[1].toFixed(1)]);

// ---------- il progetto ----------
const EPOCA = {
  E0: { nome: 'E0 Borgo medievale', col: '#e6c58c' }, E2: { nome: 'E2 Marina', col: '#86bfb0' }, E3: { nome: 'E3 Ottocento e Mercato', col: '#d7856a' },
  E4: { nome: 'E4 Regime: la Vittoria', col: '#efe7d2' }, E6: { nome: 'E6 Boom (un angolo, niente torri)', col: '#a5adb8' }, E7: { nome: 'E7 Baracche', col: '#8c6a50' },
  E1s: { nome: 'E1 Spianata (palco vuoto)', col: '#e9dfc6' }, E1: { nome: 'E1 Rocca', col: '#b88f57' }, V: { nome: 'Giardini di Ponente e orti', col: '#b7cf98' },
};
const D = {
  cornice: [1250, 262, 1606, 446],
  distretti: [
    ['V', [[1222, 290], [1250, 288], [1250, 392], [1222, 394]]],
    ['E7', [[1222, 258], [1342, 258], [1342, 279], [1318, 281], [1250, 284], [1222, 284]]],
    ['E3', [[1250, 286], [1300, 286], [1320, 288], [1312, 322], [1310, 343], [1313, 364], [1314, 386], [1292, 386], [1292, 362], [1250, 362]]],
    ['E6', [[1250, 362], [1292, 362], [1292, 400], [1250, 400]]],
    ['E0', [[1318, 290], [1332, 276], [1400, 266], [1462, 262], [1466, 337], [1314, 337], [1312, 322]]],
    ['E0', [[1312, 349], [1466, 349], [1466, 368], [1420, 375], [1314, 378]]],
    ['E2', [[1292, 386], [1314, 384], [1314, 378], [1420, 375], [1466, 368], [1490, 384], [1490, 426], [1292, 426]]],
    ['E4', [[1290, 337.5], [1508, 337.5], [1508, 348.5], [1290, 348.5]]],
    ['E4', [[1311, 326], [1340, 326], [1340, 362], [1311, 362]]],
    ['E1s', [[1466, 252], [1508, 252], [1508, 426], [1466, 426]]],
    ['E1', [[1508, 296], [1556, 286], [1608, 318], [1608, 368], [1556, 398], [1508, 392]]],
  ],
  // le strade: [livello, larghezza m, nome, punti]. livello: asse | via | vicolo
  strade: [
    ['asse', 10, 'Via della Vittoria (asse di parata, 10 m)', [[1290, 343], [1508, 343]]],
    ['via', 7, 'Corso Garibaldi (7 m)', [[1296, 299], [1302, 312], [1302, 328], [1299, 343], [1301, 358], [1306, 374], [1311, 388]]],
    ['via', 5, 'Rua Maestra (5 m)', [[1318, 303], [1334, 302], [1352, 305], [1368, 310], [1383, 312], [1398, 309], [1414, 312], [1426, 317], [1446, 313], [1468, 313]]],
    ['via', 5, 'Via della Marina (5 m)', [[1290, 392], [1312, 390], [1332, 388], [1360, 386], [1385, 387], [1400, 393], [1420, 400], [1446, 404], [1478, 406]]],
    ['vicolo', 3, 'Via di Mezzo', [[1340, 372], [1356, 370], [1372, 369], [1390, 372], [1412, 374], [1432, 380], [1458, 388]]],
    ['vicolo', 3, 'Galleria del Mercato (coperta)', [[1272, 306], [1272, 328]]],
    ['vicolo', 3, 'Vico Cavour (sottopasso)', [[1290, 300], [1290, 278]]],
    ['vicolo', 3, 'Vico delle Carceri', [[1272, 358], [1272, 386], [1290, 392]]],
    ['vicolo', 3, 'Vico dei Giardini', [[1250, 330], [1258, 333]]],
  ],
  // i vicoli a pettine del borgo (Molfetta): [x sulla Rua, da y, a y]
  pettine: [[1336, 302, 280], [1349, 304, 277], [1362, 307, 276], [1404, 309, 272], [1418, 312, 270], [1440, 314, 268], [1456, 313, 268],
    [1346, 305, 337], [1376, 311, 337], [1398, 309, 337], [1432, 318, 337], [1452, 313, 337],
    [1350, 349, 370], [1364, 349, 369], [1384, 349, 372], [1398, 349, 372], [1416, 349, 375], [1438, 349, 381], [1458, 349, 388],
    [1336, 349, 386], [1416, 375, 398], [1372, 369, 386]],
  traverse: [[[1336, 290], [1349, 289]], [[1404, 290], [1418, 291]], [[1376, 325], [1398, 323]], [[1384, 360], [1398, 361]], [[1416, 362], [1438, 364]]],
  mura: [[1324, 286], [1340, 279], [1370, 274], [1400, 270], [1430, 267], [1462, 265]],
  muro: [[1488, 256], [1488, 337], null, [1488, 349], [1488, 420]],
  fossato: [[1508, 300], [1516, 299], [1516, 390], [1508, 391]],
  piazze: [
    ['otto', 'Mercato', 1274, 343, 16], ['rect', 'Piazzale della Stazione', 1252, 296, 1294, 306], ['rect', "Piazza d'adunata", 1313, 328, 1338, 358],
    ['rect', 'Sagrato', 1368, 296, 1396, 307], ['tondo', 'Pozzo', 1428, 324, 6], ['tondo', 'Forno', 1356, 370, 5], ['rect', 'Piazza della Marina', 1386, 375, 1410, 387],
    ['tondo', 'Lotto del fuoco', 1286, 271, 5], ['rect', 'Scalo', 1292, 393, 1316, 410], ['rect', "Piazza d'armi", 1524, 326, 1584, 360],
  ],
  // i volumi che contano (rettangoli scuri)
  volumi: [
    ['Stazione', 1254, 287, 1290, 295, '#5b4a3e'], ['Chiesa Madre', 1370, 285, 1389, 296, '#7a5a3a'], ['Magazzini a volta', 1318, 377, 1366, 384, '#6a5a48'],
    ['Radio Luna', 1298, 268, 1316, 280, '#4a3a5a'], ['Autosalone', 1254, 382, 1278, 392, '#7fa3c0'], ['Ministero', 1311, 319, 1330, 327, '#8a8270'],
    ['Caserma della Guardia', 1316, 360, 1338, 368, '#6b6b5b'],
  ],
  stecca: [1270, 371, 34, 8, -.2],
  corti: [[1255, 311, 1266, 321], [1279, 311, 1291, 321], [1338, 286, 1346, 294], [1402, 284, 1412, 292], [1360, 322, 1368, 330], [1440, 355, 1448, 362], [1372, 352, 1380, 359]],   // l'unica stecca del boom: centro, lungo, largo, rotazione (3 piani)
  // i landmark: [nome, x, y, altezza m, colore di notte, viste: [[x, y], ...]]
  landmark: [
    ['Campanile (30 m)', 1392, 291, 30, '#f2c14e', [[1288, 334], [1428, 324], [1470, 318], [1400, 380]]],
    ['Torre littoria (34 m)', 1335, 323, 34, '#ffffff', [[1272, 301], [1460, 343], [1360, 386], [1288, 272]]],
    ["Orologio della stazione (14 m)", 1270, 289, 14, '#ffd27a', [[1272, 330], [1303, 368], [1288, 272]]],
    ['Torre dell\'acqua e antenna (18 m)', 1310, 272, 18, '#9ff0ff', [[1282, 332], [1323, 302], [1386, 272]]],
    ['Gru del porto (22 m)', 1372, 414, 22, '#ff9a3c', [[1398, 380], [1356, 370], [1304, 398], [1398, 352]]],
    ['Torrione e riflettore (16 m)', 1596, 326, 16, '#ff3b30', [[1320, 343], [1440, 318], [1402, 398], [1480, 300]]],
  ],
  // i 12 luoghi-missione: [n, nome breve, x, y, ruoli, icona, dx, dy (etichetta)]
  luoghi: [
    [1, 'Bar Da Gino', 1428, 324, ['hub'], 'tazza', 12, -14],
    [2, 'Forno di Lella', 1356, 370, ['hub', 'premio'], 'pane', -14, 18],
    [3, 'San Rocco e la cripta', 1381, 300, ['segreto'], 'croce', -4, -16],
    [4, 'Pescheria e calata', 1398, 381, ['hub', 'premio'], 'pesce', 14, 16],
    [5, 'Officina dello Scalo', 1304, 401, ['premio'], 'chiave', 10, 16],
    [6, 'Covo nel bunker delle mura', 1438, 280, ['segreto'], 'foglia', 10, -12],
    [7, 'Radio Luna', 1307, 274, ['segreto', 'premio'], 'antenna', 10, -14],
    [8, 'Mercato', 1274, 343, ['hub', 'pericolo'], 'otto', -16, 22],
    [9, 'Stazione e scalo merci', 1270, 301, ['pericolo', 'premio'], 'orologio', -18, -16],
    [10, 'Baracche e grata del vapore', 1284, 270, ['hub', 'segreto'], 'fiamma', -26, -14],
    [11, 'Posto di blocco', 1478, 343, ['pericolo'], 'sbarra', 6, -16],
    [12, 'La Rocca', 1556, 343, ['pericolo'], 'torre', 4, -18],
  ],
  // le vie fra i luoghi: [tipo, nome, punti]. tipo: principale | scorciatoia | tetti | sotto | acqua
  vie: [
    ['principale', 'Mercato → Bar (Porta di Terra, Rua)', [[1288, 336], [1310, 312], [1322, 303], [1352, 305], [1383, 312], [1414, 312], [1427, 319]]],
    ['scorciatoia', 'Mercato → Bar (la Vittoria, sorvegliata)', [[1292, 344], [1424, 344], [1428, 330]]],
    ['tetti', 'Porta di Terra → campanile → Bar (sui tetti)', [[1328, 296], [1350, 292], [1372, 290], [1400, 296], [1416, 310], [1425, 318]]],
    ['principale', 'Bar → Forno (sottoportico dei Bottai)', [[1427, 324], [1414, 314], [1398, 312], [1398, 343], [1394, 362], [1372, 368], [1358, 370]]],
    ['sotto', 'Pozzo → cisterna → cantina del Forno', [[1428, 326], [1400, 356], [1360, 368]]],
    ['principale', 'Forno → Marina (scala dei pescatori)', [[1358, 371], [1390, 373], [1412, 375], [1416, 390], [1402, 383]]],
    ['scorciatoia', 'Forno → Marina (scalinata del Forno)', [[1356, 372], [1350, 382], [1362, 386], [1396, 384]]],
    ['principale', 'Marina → Scalo (Via della Marina)', [[1396, 386], [1360, 387], [1332, 389], [1306, 397]]],
    ['scorciatoia', 'Marina → Scalo (dentro i magazzini a volta)', [[1384, 383], [1352, 381], [1322, 381], [1308, 393]]],
    ['acqua', 'Darsena → Scalo (in gozzo)', [[1372, 410], [1340, 414], [1310, 412]]],
    ['principale', 'Scalo → Stazione (Corso)', [[1307, 395], [1305, 372], [1300, 343], [1301, 318], [1294, 302], [1280, 301]]],
    ['scorciatoia', 'Scalo → Stazione (Carceri, Mercato, Galleria)', [[1292, 392], [1272, 380], [1272, 360], [1274, 343], [1272, 322], [1272, 305]]],
    ['principale', 'Stazione → Baracche (passaggio a livello)', [[1262, 299], [1252, 292], [1254, 283], [1270, 276], [1283, 272]]],
    ['scorciatoia', 'Stazione → Baracche (sottopasso Cavour)', [[1289, 299], [1290, 278], [1286, 273]]],
    ['tetti', 'Baracche → Covo (camminamento delle mura)', [[1300, 279], [1326, 285], [1340, 279], [1370, 274], [1400, 270], [1434, 276]]],
    ['sotto', 'Cripta → rifugio sotto l\'adunata → bunker (cunicolo)', [[1384, 298], [1356, 318], [1326, 344], [1360, 330], [1410, 296], [1436, 282]]],
    ['principale', 'Bar → spianata (fine della Rua)', [[1430, 318], [1446, 313], [1470, 313]]],
    ['tetti', 'Bar → spianata (le case mozzate)', [[1432, 320], [1450, 330], [1464, 326]]],
    ['principale', 'Spianata → Rocca (ponte e Porta, sorvegliato)', [[1476, 343], [1512, 343], [1545, 343]]],
    ['acqua', 'Molo Vecchio → fossato allagato → arco della Rocca', [[1402, 398], [1430, 432], [1500, 436], [1512, 400], [1512, 365]]],
  ],
  // le rivelazioni: [n, x, y, verso dove si guarda (rad), cosa]
  rivela: [
    [1, 1246, 288, -.1, 'orologio e torre littoria'], [2, 1272, 324, .2, 'la tettoia verde si apre'], [3, 1322, 300, 0, 'dalla Porta: il campanile in fondo'],
    [4, 1366, 312, -.6, 'il sagrato, il campanile sopra'], [5, 1416, 313, .1, 'il Pozzo e, in fondo, il torrione'], [6, 1418, 376, 1.6, 'la scala apre sul mare e la gru'],
    [7, 1398, 345, 0, 'la Vittoria: il cannocchiale sulla Porta'], [8, 1446, 266, -2.6, 'dalle mura: il mare, il vapore, il treno'],
  ],
};

// ---------- il disegno (gira nella pagina) ----------
function disegna(cv, D, F, terra, rail, EPOCA, modo, sfondo) {
  const S = F.s, X = x => (x - F.x0) * S, Y = y => (y - F.y0) * S, ctx = cv.getContext('2d');
  const W0 = (F.x1 - F.x0) * S, H0 = (F.y1 - F.y0) * S, OY = 64;   // la testata in alto
  ctx.save(); ctx.translate(0, OY);
  const poly = (P, c) => { c.beginPath(); P.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.closePath(); };
  const line = (P, c) => { c.beginPath(); let nuovo = true; P.forEach(q => { if (!q) { nuovo = true; return; } if (nuovo) { c.moveTo(X(q[0]), Y(q[1])); nuovo = false; } else c.lineTo(X(q[0]), Y(q[1])); }); };
  const halo = (t, x, y, f, col, al) => { ctx.font = f; ctx.textAlign = al || 'left'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,252,244,.92)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y); };
  // il mare
  ctx.fillStyle = modo === 'progetto' ? '#a9c9d8' : '#46789f'; ctx.fillRect(0, 0, W0, H0);
  if (modo === 'progetto') { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; for (let y = 6; y < H0; y += 12) { ctx.beginPath(); for (let x = 0; x < W0; x += 24) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 6, y - 3, x + 12, y); } ctx.stroke(); } }
  // la terra (maschera)
  const mask = document.createElement('canvas'); mask.width = W0; mask.height = H0; const m = mask.getContext('2d');
  terra.forEach((row, j) => row.forEach((v, i) => { if (v) { m.fillStyle = v === 2 ? '#c9c4b8' : '#f3eee2'; m.fillRect(i * 2 * S, j * 2 * S, 2 * S + .5, 2 * S + .5); } }));
  if (modo === 'progetto') ctx.drawImage(mask, 0, 0);
  else ctx.drawImage(sfondo, 0, 0, W0, H0);
  // i distretti per epoca, solo sulla terra
  const lay = document.createElement('canvas'); lay.width = W0; lay.height = H0; const l = lay.getContext('2d');
  D.distretti.forEach(([e, P]) => { poly(P, l); l.fillStyle = EPOCA[e].col; l.fill(); });
  if (modo === 'progetto') {
    // i volumi del costruito: il distretto è pieno, le strade lo scavano
    l.globalCompositeOperation = 'source-atop';
    l.fillStyle = 'rgba(70,40,20,.10)'; for (let i = 0; i < 4000; i++) { const x = (i * 7919) % W0, y = (i * 104729) % H0; l.fillRect(x, y, 2, 2); }
    l.globalCompositeOperation = 'destination-in'; l.drawImage(mask, 0, 0); l.globalCompositeOperation = 'source-over';
    ctx.drawImage(lay, 0, 0);
    // fuori città: tratteggio
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, X(1222) + 1, H0); ctx.clip(); ctx.restore();
  } else {
    // nel confronto: solo i bordi dei distretti
    ctx.lineWidth = 3; D.distretti.forEach(([e, P]) => { poly(P, ctx); ctx.strokeStyle = EPOCA[e].col; ctx.setLineDash([8, 5]); ctx.stroke(); }); ctx.setLineDash([]);
  }
  // il fossato allagato
  poly(D.fossato, ctx); ctx.fillStyle = modo === 'progetto' ? '#8fb8cc' : 'rgba(120,180,210,.5)'; ctx.fill();
  // le strade (bordo scuro, poi la carreggiata chiara)
  const STY = { asse: ['#5d5446', '#f8f3e4'], via: ['#7b6a55', '#fbf7ec'], vicolo: ['#8b7a62', '#fbf5e6'] };
  const strada = (k, w, P) => { const [b, f] = STY[k]; line(P, ctx); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (modo === 'progetto') { ctx.strokeStyle = b; ctx.lineWidth = w * S + 3; ctx.stroke(); ctx.strokeStyle = f; ctx.lineWidth = w * S; ctx.stroke(); }
    else { ctx.strokeStyle = k === 'asse' ? '#fff3b0' : k === 'via' ? '#ffd9a0' : '#ffe9c8'; ctx.lineWidth = Math.max(2, w * S * .45); ctx.stroke(); } };
  D.pettine.forEach(([x, a, b]) => { const L = .16; strada('vicolo', 3, [[x, a], [x + L * (a - b) * .5 + 1, (a + b) / 2], [x + L * (a - b), b]]); });
  D.traverse.forEach(P => strada('vicolo', 2.5, P));
  D.strade.filter(s => s[0] === 'vicolo').forEach(s => strada(s[0], s[1], s[3]));
  D.strade.filter(s => s[0] === 'via').forEach(s => strada(s[0], s[1], s[3]));
  D.strade.filter(s => s[0] === 'asse').forEach(s => { strada(s[0], s[1], s[3]); if (modo === 'progetto') { ctx.fillStyle = '#5d5446'; for (let x = 1346; x < 1462; x += 9) { ctx.fillRect(X(x), Y(337.6), 3, 3); ctx.fillRect(X(x), Y(348.2), 3, 3); } } });
  // le piazze
  D.piazze.forEach(q => { ctx.beginPath();
    if (q[0] === 'otto') { for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4, x = q[2] + Math.cos(a) * q[4], y = q[3] + Math.sin(a) * q[4]; k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); } ctx.closePath(); }
    else if (q[0] === 'tondo') ctx.arc(X(q[2]), Y(q[3]), q[4] * S, 0, 7);
    else ctx.rect(X(q[2]), Y(q[3]), (q[4] - q[2]) * S, (q[5] - q[3]) * S);
    if (modo === 'progetto') { ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.strokeStyle = '#7b6a55'; ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 2.5; ctx.stroke(); } });
  if (modo === 'progetto') { // la tettoia verde del Mercato
    ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4, x = 1274 + Math.cos(a) * 9, y = 343 + Math.sin(a) * 9; k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); } ctx.closePath(); ctx.fillStyle = '#5f9a6a'; ctx.fill();
    // i volumi che contano
    D.corti.forEach(([x0, y0, x1, y1]) => { ctx.fillStyle = '#f7eedc'; ctx.fillRect(X(x0), Y(y0), (x1 - x0) * S, (y1 - y0) * S); ctx.strokeStyle = 'rgba(90,60,30,.5)'; ctx.lineWidth = 1; ctx.strokeRect(X(x0), Y(y0), (x1 - x0) * S, (y1 - y0) * S); });
    D.volumi.forEach(([n, x0, y0, x1, y1, c]) => { ctx.fillStyle = c; ctx.fillRect(X(x0), Y(y0), (x1 - x0) * S, (y1 - y0) * S); });
    const [sx, sy, sl, sw, sr] = D.stecca; ctx.save(); ctx.translate(X(sx), Y(sy)); ctx.rotate(sr); ctx.fillStyle = '#7d8794'; ctx.fillRect(-sl * S / 2, -sw * S / 2, sl * S, sw * S); ctx.restore();
    // la Rocca: cortina e bastioni
    poly([[1518, 304], [1556, 296], [1598, 322], [1598, 364], [1556, 388], [1518, 382]], ctx); ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = '#6e5230'; [[1518, 304], [1518, 382]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(X(x - 8), Y(y)); ctx.lineTo(X(x), Y(y - 9)); ctx.lineTo(X(x + 8), Y(y)); ctx.lineTo(X(x), Y(y + 9)); ctx.fill(); });
  }
  // la ferrovia
  if (rail.length) { line(rail, ctx); ctx.strokeStyle = modo === 'progetto' ? '#3b3b3b' : '#ff5a4a'; ctx.lineWidth = 4; ctx.stroke(); if (modo === 'progetto') { ctx.strokeStyle = '#f3eee2'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]); } }
  // le mura di tramontana e il Muro del Garante
  line(D.mura, ctx); ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#f3eee2'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([]);
  line(D.muro, ctx); ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 5; ctx.setLineDash([10, 4]); ctx.stroke(); ctx.setLineDash([]);
  // i landmark e le loro visuali
  if (modo === 'progetto') {
    D.landmark.forEach(([n, x, y, h, c, V]) => { V.forEach(([vx, vy]) => { ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(vx), Y(vy)); ctx.strokeStyle = 'rgba(60,40,90,.30)'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.ellipse(X(vx), Y(vy), 5, 3, 0, 0, 7); ctx.fillStyle = 'rgba(60,40,90,.55)'; ctx.fill(); }); });
    // le vie fra i luoghi
    const VST = { principale: ['#9b2d20', [], 4], scorciatoia: ['#d9731a', [10, 6], 3.5], tetti: ['#c8551e', [2, 5], 3.5], sotto: ['#5a3d8a', [2, 5], 3.5], acqua: ['#1d6f94', [8, 4, 2, 4], 3] };
    D.vie.forEach(([k, n, P]) => { const [c, d, w] = VST[k]; line(P, ctx); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = w + 3; ctx.setLineDash(d); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke(); ctx.setLineDash([]);
      const a = P[P.length - 2], b = P[P.length - 1], ang = Math.atan2(Y(b[1]) - Y(a[1]), X(b[0]) - X(a[0])); ctx.save(); ctx.translate(X(b[0]), Y(b[1])); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-9, -5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.restore(); });
    // i landmark
    D.landmark.forEach(([n, x, y, h, c]) => { const r = 6 + h / 4; ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; ctx.lineTo(X(x) + Math.cos(a) * rr, Y(y) + Math.sin(a) * rr); } ctx.closePath();
      ctx.fillStyle = '#2c2238'; ctx.fill(); ctx.strokeStyle = c === '#ffffff' ? '#bbb' : c; ctx.lineWidth = 2.5; ctx.stroke(); });
    // le rivelazioni
    D.rivela.forEach(([n, x, y, a]) => { ctx.save(); ctx.translate(X(x), Y(y)); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 26, -.38, .38); ctx.closePath(); ctx.fillStyle = 'rgba(255,214,90,.55)'; ctx.fill(); ctx.restore();
      ctx.fillStyle = '#1e1e1e'; ctx.fillRect(X(x) - 9, Y(y) - 9, 18, 18); halo('', 0, 0, '10px Inter'); ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd65a'; ctx.fillText('V' + n, X(x), Y(y) + 4); });
    // i luoghi-missione
    const RC = { hub: '#d39a00', segreto: '#6a4c93', pericolo: '#c0392b', premio: '#2e8b57' };
    const icona = (k, x, y) => { ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
      if (k === 'tazza') { ctx.rect(x - 6, y - 4, 9, 9); ctx.moveTo(x + 3, y - 2); ctx.arc(x + 4, y + 1, 3, -1.4, 1.4); ctx.stroke(); }
      else if (k === 'pane') { ctx.ellipse(x, y, 8, 4.5, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#a06a00'; ctx.beginPath(); [-3, 0, 3].forEach(d => { ctx.moveTo(x + d - 1, y - 3); ctx.lineTo(x + d + 2, y + 3); }); ctx.stroke(); }
      else if (k === 'croce') { ctx.fillRect(x - 1.5, y - 8, 3, 16); ctx.fillRect(x - 6, y - 4, 12, 3); }
      else if (k === 'pesce') { ctx.ellipse(x - 1, y, 6, 3.5, 0, 0, 7); ctx.moveTo(x + 4, y); ctx.lineTo(x + 9, y - 4); ctx.lineTo(x + 9, y + 4); ctx.fill(); }
      else if (k === 'chiave') { ctx.arc(x, y, 5, 0, 7); ctx.stroke(); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); ctx.lineTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8); } ctx.stroke(); }
      else if (k === 'foglia') { ctx.moveTo(x - 6, y + 6); ctx.quadraticCurveTo(x - 6, y - 7, x + 7, y - 7); ctx.quadraticCurveTo(x + 7, y + 6, x - 6, y + 6); ctx.fill(); }
      else if (k === 'antenna') { ctx.moveTo(x, y + 8); ctx.lineTo(x, y - 7); ctx.moveTo(x - 5, y + 8); ctx.lineTo(x, y - 2); ctx.lineTo(x + 5, y + 8); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y - 7, 4, -2.4, -.7); ctx.stroke(); }
      else if (k === 'otto') { for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } ctx.closePath(); ctx.stroke(); }
      else if (k === 'orologio') { ctx.arc(x, y, 7, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.moveTo(x, y); ctx.lineTo(x + 4, y); ctx.stroke(); }
      else if (k === 'fiamma') { ctx.moveTo(x, y - 8); ctx.quadraticCurveTo(x + 8, y, x + 3, y + 7); ctx.lineTo(x - 3, y + 7); ctx.quadraticCurveTo(x - 8, y, x, y - 8); ctx.fill(); }
      else if (k === 'sbarra') { ctx.fillRect(x - 8, y - 2, 16, 4); ctx.fillStyle = '#c0392b'; [-5, 1].forEach(d => ctx.fillRect(x + d, y - 2, 3, 4)); }
      else if (k === 'torre') { ctx.fillRect(x - 5, y - 4, 10, 11); [-5, -1, 3].forEach(d => ctx.fillRect(x + d, y - 8, 2.5, 4)); } };
    D.luoghi.forEach(([n, nome, x, y, ruoli, ic, dx, dy]) => { const px = X(x), py = Y(y), r = 15;
      ruoli.forEach((ro, i) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, r, -Math.PI / 2 + i * 2 * Math.PI / ruoli.length, -Math.PI / 2 + (i + 1) * 2 * Math.PI / ruoli.length); ctx.closePath(); ctx.fillStyle = RC[ro]; ctx.fill(); });
      ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 2; ctx.stroke(); icona(ic, px, py);
      ctx.beginPath(); ctx.arc(px + r * .8, py - r * .8, 7.5, 0, 7); ctx.fillStyle = '#1e1e1e'; ctx.fill(); ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(String(n), px + r * .8, py - r * .8 + 3.5);
      halo(nome, px + dx + (dx < 0 ? -6 : 6), py + dy, 'bold 13px Inter', '#1e1e1e', dx < 0 ? 'right' : 'left'); });
    // i nomi dei quartieri
    [['IL BORGO', 1392, 333], ['IL BORGO', 1394, 360], ['LA MARINA', 1440, 394], ["L'OTTOCENTO", 1262, 318], ['LA SPIANATA', 1468, 396], ['LA ROCCA', 1560, 310], ['BOOM', 1256, 368], ['GIARDINI', 1226, 352],
      ['VIA DELLA VITTORIA', 1440, 346], ['RUA MAESTRA', 1350, 300], ['CORSO', 1288, 366]].forEach(([t, x, y]) => halo(t, X(x), Y(y), (t.length > 12 ? '600 11px' : '800 13px') + ' Inter', '#4a3a2a'));
    // le cose che non hanno un numero ma si nominano
    [['Porta di Terra', 1323, 297], ['Molo Vecchio', 1392, 432], ['Darsena', 1358, 425], ['Muro del Garante', 1490, 432], ['fossato allagato', 1512, 404], ['mura di tramontana', 1370, 266]].forEach(([t, x, y]) => halo(t, X(x), Y(y), 'italic 11px Inter', '#3a3a3a', 'center'));
  } else {
    // il confronto: le note su cosa cambia
    const nota = (t, x, y, tx, ty) => { ctx.beginPath(); ctx.moveTo(X(x), Y(y)); ctx.lineTo(X(tx), Y(ty)); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.font = 'bold 12px Inter'; const w = ctx.measureText(t).width + 10; ctx.fillStyle = 'rgba(20,20,20,.82)'; ctx.fillRect(X(tx) - 4, Y(ty) - 13, w, 18); ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'left'; ctx.fillText(t, X(tx) + 1, Y(ty)); };
    nota('Vittoria 12 → 10 m, portici 5 → 3 piani', 1420, 343, 1392, 326.5);
    nota('Corso 10 → 7 m, un filare', 1304, 360, 1236, 372);
    nota('Raccordo del Muro 8 m → pista di terra', 1481, 300, 1500, 278);
    nota('Viale della Tutela nella Rocca → piazza d\'armi lastricata', 1540, 343, 1520, 412);
    nota('Via della Stazione e lungomare: via (finiscono alle porte)', 1240, 300, 1226, 246);
    nota('Ottocento: da 128 m a 68 m, stazione da x 1194 a 1270', 1270, 330, 1226, 438);
    nota('case 4 piani → 3 (case-torre 4, sei in tutto)', 1400, 300, 1360, 252);
    D.strade.forEach(s => { line(s[3], ctx); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); });
  }
  // la cornice della città compatta
  const [cx0, cy0, cx1, cy1] = D.cornice; ctx.strokeStyle = modo === 'progetto' ? '#2c2238' : '#ffe14d'; ctx.lineWidth = 2.5; ctx.setLineDash([14, 6]); ctx.strokeRect(X(cx0), Y(cy0), (cx1 - cx0) * S, (cy1 - cy0) * S); ctx.setLineDash([]);
  halo('città costruita ' + (cx1 - cx0) + ' × ' + (cy1 - cy0) + ' m', X(cx1) - 4, Y(cy1) - 8, 'bold 12px Inter', '#2c2238', 'right');
  // la scala e il nord
  ctx.fillStyle = '#1e1e1e'; ctx.fillRect(16, H0 - 26, 50 * S, 6); ctx.fillStyle = '#fff'; ctx.fillRect(16 + 25 * S, H0 - 25, 25 * S, 4); halo('0', 14, H0 - 32, '11px Inter', '#1e1e1e'); halo('50 m', 16 + 50 * S, H0 - 32, '11px Inter', '#1e1e1e', 'center');
  halo('N ↑', W0 - 40, 24, 'bold 14px Inter', '#1e1e1e');
  ctx.restore();
  // la testata
  ctx.fillStyle = '#2c2238'; ctx.fillRect(0, 0, cv.width, OY); ctx.fillStyle = '#f6efe0'; ctx.textAlign = 'left';
  ctx.font = '700 26px Inter'; ctx.fillText(modo === 'progetto' ? 'Porto Vecchio — la mappa compatta (progetto, fase 1)' : 'Porto Vecchio — la stessa cornice sopra la pianta di oggi', 18, 32);
  ctx.font = '400 14px Inter'; ctx.fillText(modo === 'progetto' ? 'Città costruita x 1250–1606, y 262–446 (356 × 184 m). Case 1–3 piani; si alzano solo i landmark. Un asse, tre vie, i vicoli, le piazzette come nodi.' : 'Sotto: la pianta di oggi (strumenti/pianta.js). Tratteggio: i quartieri e le strade del progetto. In giallo: la cornice della città compatta.', 18, 54);
}

// la legenda del progetto (colonna a destra)
function legenda(cv, D, F, EPOCA) {
  const ctx = cv.getContext('2d'), x0 = (F.x1 - F.x0) * F.s + 14, OY = 64; let y = OY + 22;
  ctx.fillStyle = '#f6f1e6'; ctx.fillRect(x0 - 14, OY, cv.width - x0 + 14, cv.height - OY);
  const tit = t => { ctx.font = '800 13px Inter'; ctx.fillStyle = '#2c2238'; ctx.textAlign = 'left'; ctx.fillText(t.toUpperCase(), x0, y); y += 18; };
  const txt = (t, dx, f) => { ctx.font = f || '12px Inter'; ctx.fillStyle = '#2a2a2a'; ctx.textAlign = 'left'; ctx.fillText(t, x0 + (dx || 0), y); };
  tit('Epoche');
  Object.values(EPOCA).forEach(e => { ctx.fillStyle = e.col; ctx.fillRect(x0, y - 10, 22, 13); ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(x0, y - 10, 22, 13); txt(e.nome, 30); y += 17; });
  y += 6; tit('Strade (solo quattro livelli)');
  [['asse', 10, 'Asse di parata: la Vittoria, 10 m'], ['via', 7, 'Vie: Corso 7 m, Rua e Marina 5 m'], ['vicolo', 3, 'Vicoli 2–3 m (scorciatoie o nascondigli)']].forEach(([k, w, t]) => {
    ctx.strokeStyle = '#6b5b47'; ctx.lineWidth = w * 1.6 + 3; ctx.beginPath(); ctx.moveTo(x0, y - 4); ctx.lineTo(x0 + 34, y - 4); ctx.stroke(); ctx.strokeStyle = '#fbf7ec'; ctx.lineWidth = w * 1.6; ctx.stroke(); txt(t, 44); y += 20; });
  ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#7b6a55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x0 + 10, y - 5, 8, 0, 7); ctx.fill(); ctx.stroke(); txt('Piazzette e piazze: i nodi (mai due a meno di 40 m)', 30); y += 22;
  y += 4; tit('Luoghi-missione: ruolo');
  const RC = [['hub', '#d39a00', 'ritrovo (hub)'], ['segreto', '#6a4c93', 'segreto'], ['pericolo', '#c0392b', 'pericolo'], ['premio', '#2e8b57', 'premio']];
  RC.forEach(([k, c, t], i) => { const xx = x0 + (i % 2) * 180, yy = y + Math.floor(i / 2) * 20; ctx.beginPath(); ctx.arc(xx + 8, yy - 4, 8, 0, 7); ctx.fillStyle = c; ctx.fill(); ctx.font = '12px Inter'; ctx.fillStyle = '#2a2a2a'; ctx.fillText(t, xx + 22, yy); });
  y += 44;
  D.luoghi.forEach(([n, nome, x, yy, ruoli]) => { txt(n + '. ' + nome, 0, '600 12px Inter'); ctx.font = '11px Inter'; ctx.fillStyle = '#666'; ctx.textAlign = 'right'; ctx.fillText(ruoli.join(' · '), cv.width - 16, y); y += 16; });
  y += 6; tit('Vie fra i luoghi');
  [['#9b2d20', [], 'principale'], ['#d9731a', [10, 6], 'scorciatoia'], ['#c8551e', [2, 5], 'sui tetti e sulle mura'], ['#5a3d8a', [2, 5], 'sotto terra (cripta, cisterna, rifugio)'], ['#1d6f94', [8, 4, 2, 4], 'per mare (gozzo, fossato)']].forEach(([c, d, t]) => {
    ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.setLineDash(d); ctx.beginPath(); ctx.moveTo(x0, y - 4); ctx.lineTo(x0 + 34, y - 4); ctx.stroke(); ctx.setLineDash([]); txt(t, 44); y += 18; });
  y += 6; tit('Landmark (visuali tratteggiate)');
  D.landmark.forEach(([n, , , , c]) => { ctx.beginPath(); ctx.arc(x0 + 8, y - 4, 6, 0, 7); ctx.fillStyle = '#2c2238'; ctx.fill(); ctx.strokeStyle = c === '#ffffff' ? '#bbb' : c; ctx.lineWidth = 2.5; ctx.stroke(); txt(n, 22); y += 17; });
  y += 6; tit('Rivelazioni (il primo giro)');
  D.rivela.forEach(([n, , , , t]) => { ctx.fillStyle = '#1e1e1e'; ctx.fillRect(x0, y - 12, 18, 15); ctx.font = 'bold 10px Inter'; ctx.fillStyle = '#ffd65a'; ctx.textAlign = 'center'; ctx.fillText('V' + n, x0 + 9, y - 1); txt(t, 26); y += 17; });
}

// ---------- la pagina ----------
(async () => {
  const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
  const tmp = path.join(require('os').tmpdir(), 'pv_pianta_' + process.pid + '.png'), tmpTutta = tmp.replace('.png', '_tutta.png');
  const pianta = (out, a, b, c, d, s) => cp.execFileSync(process.execPath, [path.join(__dirname, 'pianta.js'), out, a, b, c, d, String(s)], { env: process.env, stdio: 'ignore' });
  pianta(tmp, F.x0, F.y0, F.x1, F.y1, F.s * TS); pianta(tmpTutta, 1040, 200, 1660, 500, 3);
  const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const W0 = (F.x1 - F.x0) * F.s, H0 = (F.y1 - F.y0) * F.s + 64;
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 2000, height: 1600 } });
  const html = `<html><body style="margin:0;background:#fff"><canvas id="a"></canvas><canvas id="b"></canvas><script>
    ${disegna.toString()}\n${legenda.toString()}
    const D=${JSON.stringify(D)},F=${JSON.stringify(F)},TE=${JSON.stringify(terra)},R=${JSON.stringify(rail)},E=${JSON.stringify(EPOCA)};
    const load=s=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=s;});
    (async()=>{ await document.fonts.load('700 26px Inter');
      const a=document.getElementById('a'); a.width=${W0}+400; a.height=${H0}+150; const c=a.getContext('2d'); c.fillStyle='#f6f1e6'; c.fillRect(0,0,a.width,a.height);
      disegna(a,D,F,TE,R,E,'progetto'); legenda(a,D,F,E);
      const s1=await load('${b64(tmp)}'), s2=await load('${b64(tmpTutta)}');
      const b=document.getElementById('b'); b.width=${W0}+400; b.height=${H0}+500; const d=b.getContext('2d'); d.fillStyle='#f6f1e6'; d.fillRect(0,0,b.width,b.height);
      disegna(b,D,F,TE,R,E,'confronto',s1);
      // in basso: la città di oggi intera (1040-1660 × 200-500) con la cornice compatta
      const y0=${H0}+20, k=1.5; d.drawImage(s2,16,y0,620*k,300*k); d.strokeStyle='#ffe14d'; d.lineWidth=3; d.setLineDash([12,5]); d.strokeRect(16+(1250-1040)*k,y0+(262-200)*k,(1606-1250)*k,(446-262)*k); d.setLineDash([]);
      d.fillStyle='rgba(20,20,20,.8)'; d.fillRect(16,y0,430,24); d.fillStyle='#ffe9a8'; d.font='bold 13px Inter'; d.fillText('Oggi: la città intera 620 × 300 m (x 1040–1660). In giallo: la città compatta.',22,y0+17);
      d.fillStyle='rgba(192,57,43,.25)'; d.fillRect(16+(1100-1040)*k,y0+(250-200)*k,(1250-1100)*k,(420-250)*k); d.fillStyle='#fff'; d.font='bold 12px Inter'; d.fillText('tagliato: viale, alberghi, griglia ovest',16+(1104-1040)*k,y0+(432-200)*k);
      { let ly=90; const lx=${W0}+16; d.fillStyle='#2c2238'; d.font='800 13px Inter'; d.fillText('LA PIANTA DI OGGI',lx,ly); ly+=20; d.font='12px Inter';
        [['#46464f','asfalto (strade e anelli 8-16 m)'],['#f0be78','vicoli e basoli del borgo'],['#d7c8aa','piazze e lastricati'],['#8c6e66','case (più scure = più alte)'],['#c9c4b8','banchine e moli'],['#ff5a4a','ferrovia']].forEach(([c,t])=>{d.fillStyle=c;d.fillRect(lx,ly-10,22,13);d.fillStyle='#222';d.fillText(t,lx+30,ly);ly+=18;});
        ly+=10; d.fillStyle='#2c2238'; d.font='800 13px Inter'; d.fillText('IL PROGETTO SOPRA',lx,ly); ly+=20; d.font='12px Inter';
        [['#ffe14d','cornice della città compatta'],['#fff3b0','asse di parata (Vittoria 10 m)'],['#ffd9a0','vie (Corso 7, Rua e Marina 5 m)'],['#ffffff','tracciati nuovi (tratteggio)']].forEach(([c,t])=>{d.fillStyle=c;d.fillRect(lx,ly-10,22,13);d.strokeStyle='#555';d.strokeRect(lx,ly-10,22,13);d.fillStyle='#222';d.fillText(t,lx+30,ly);ly+=18;});
        d.fillText('bordi tratteggiati colorati: i quartieri per epoca',lx,ly+6); }
      const tx=16+620*k+30; let ty=y0+20; d.fillStyle='#2c2238'; d.font='800 15px Inter'; d.fillText('OGGI → PROGETTO',tx,ty); ty+=26; d.font='13px Inter'; d.fillStyle='#222';
      ${JSON.stringify([
        'Città costruita: 620 × 300 m → 356 × 184 m',
        'Case: 592 → circa 420 (nessuna sopra i 3 piani tranne 6 case-torre)',
        'Piani: 1:96 · 2:306 · 3:154 · 4:36 → 1:~100 · 2:~230 · 3:~85 · 4:6',
        'Strade larghe 12–16 m: 4 → 0 (asse 10 m, Corso 7 m)',
        'Anelli: raccordo del Muro e lungomare → nessuno',
        'Abitanti in città: ~145 → ~220 (da ~2 a ~4,8 per 1000 m²)',
        'Luoghi-missione leggibili sulla mappa: 0 → 12',
        'Landmark: 6, ognuno visto da 3–4 quartieri',
      ])}.forEach(t=>{d.fillText('• '+t,tx,ty);ty+=22;});
      window.fatto=true; })();
  </script></body></html>`;
  await pg.setContent(html); await pg.waitForFunction(() => window.fatto === true, null, { timeout: 60000 });
  await (await pg.$('#a')).screenshot({ path: path.join(OUT, 'progetto.png') });
  await (await pg.$('#b')).screenshot({ path: path.join(OUT, 'confronto.png') });
  await br.close(); [tmp, tmpTutta].forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
  console.log('mappa compatta:', path.join(OUT, 'progetto.png'), path.join(OUT, 'confronto.png'));
})().catch(e => { console.error(e); process.exit(1); });
