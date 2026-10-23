// [vievive] le vie vive della città nuova: una giornata accelerata. Controlla che l'autobus della linea 1 arrivi a tutte le fermate,
// che nessuna auto in sosta stia in un vicolo o davanti a una porta, a una vetrina o a una scala, che le corsie e la segnaletica
// stiano nella larghezza vera della via (10 m: due corsie, non quattro), e conta ora per ora mezzi e persone ogni 100 m delle vie
// principali (il giocatore sta a metà della via di quell'ora: la gente vicina è simulata per intero).
// Uso: node test_vievive.js [ore] [seme]
global.World = require('./world_cittanuova.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Posti = require('./posti.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js');
global.Economia = require('./economia.js'); global.Fazioni = require('./fazioni.js'); global.Soldi = require('./soldi.js'); global.Oggetti = require('./oggetti.js');
global.Graffiti = require('./graffiti.js'); global.Livelli = require('./livelli.js'); global.Sottosuolo = require('./sottosuolo.js'); global.Tetti = require('./tetti.js');
global.WriterArte = require('./writer_arte.js'); global.Writing = require('./writing.js'); global.WriterVita = require('./writer_vita.js');
global.Ordine = require('./ordine.js'); global.Animali = require('./animali.js');
global.Eventi = require('./eventi.js'); global.Chiarezza = require('./chiarezza.js'); global.Vievive = require('./vievive.js');
const G = Game, VV = Vievive, CH = Chiarezza, W = G.MAP.world, T = G.T, TS = G.TS;
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) fail++; };
const hours = +process.argv[2] || 24, st = G.create(+process.argv[3] || 1), p = st.player, V = st.vv;
st.deadline = 1e12;

// ---------------- 1. LE CORSIE E LA SEGNALETICA ----------------
const R = W.roads.filter(rd => rd.pts && rd.pts.length > 1);
let corsieKo = [];
R.forEach(rd => { const P = VV.profilo(rd), S = VV.segnaletica(rd); if (P.rango === 'nessuno' || P.rango === 'vicolo') return;
  const need = P.corsie * (P.corsie > 1 ? VV.CFG.corsiaMin : 2) + P.sosta.length * VV.CFG.sosta;
  if (need > rd.w + .01) corsieKo.push(`${rd.id} ${rd.w} m: ${P.corsie} corsie e ${P.sosta.length} sosta non ci stanno`);
  if (rd.w <= 12 && P.corsie > 2) corsieKo.push(`${rd.id} ${rd.w} m con ${P.corsie} corsie`);
  if (S.mezzeria !== (P.corsie === 2)) corsieKo.push(`${rd.id}: mezzeria ${S.mezzeria} con ${P.corsie} corsie`);
  if (P.rango === 'asse' && P.sosta.length) corsieKo.push(`${rd.id}: sosta sull'asse`);
  if (P.rango === 'via_minore' && P.mezzi.includes('auto')) corsieKo.push(`${rd.id}: auto in una via minore`); });
ok(!corsieKo.length, `corsie e segnaletica nella larghezza vera (${corsieKo.slice(0, 4).join('; ') || 'tutte'})`);
// le corsie del traffico: la corsia di ognuno dei due versi sta nella carreggiata e non sopra la striscia di sosta
let laneKo = [];
G.LANES.forEach(L => { const rd = R.find(r => r.id === L.id); if (!rd) return; const P = VV.profilo(rd); if (P.rango !== 'via' && P.rango !== 'asse') return;
  if (Math.abs(L.w - P.larg) > .01) laneKo.push(`${L.id}: corsia larga ${L.w} invece di ${P.larg}`);
  const Ln = VV.rdLinea(rd);
  for (let s = 5; s < L.L - 5; s += 10) [1, -1].forEach(dir => { const q = G.lanePos(L, s, dir), n = VV.lNear(Ln, q.x, q.y), c = VV.lAt(Ln, n.s), nx = -Math.sin(c.ang), ny = Math.cos(c.ang), lat = (q.x - c.x) * nx + (q.y - c.y) * ny;
    const sdx = lat > 0 ? 1 : -1, bordo = rd.w / 2 - (P.sosta.includes(sdx) ? VV.CFG.sosta : 0); if (Math.abs(lat) + .8 > bordo + .15) laneKo.push(`${L.id} s ${s}: la corsia esce dalla carreggiata (${Math.abs(lat).toFixed(2)} + 0,8 > ${bordo.toFixed(2)})`); }); });
ok(!laneKo.length, `le auto in corsa restano nella carreggiata, fuori dalla sosta (${laneKo.slice(0, 3).join('; ') || 'tutte'})`);
console.log('     profili: ' + R.map(rd => [rd, VV.profilo(rd)]).filter(([, P]) => P.rango === 'via' || P.rango === 'asse' || P.rango === 'via_minore').map(([rd, P]) => `${rd.id} ${rd.w} m ${P.rango} ${P.corsie}c${P.sosta.length ? ' sosta ' + P.sosta.length : ''}`).join(' · '));

// ---------------- 2. LA SOSTA ----------------
const F = CH.fronti(G.BUILDINGS, TS, (tx, ty) => G.tileAt(tx, ty), T, G.GW, G.GH, W.pezzi);
const vicoli = R.filter(rd => { const r = VV.rango(rd); return r === 'vicolo' || r === 'via_minore'; });
let sostaKo = [];
V.sosta.forEach(id => { const v = st.vehicles.find(z => z.id === id); if (!v) return; const K = G.VK[v.kind], ux = Math.cos(v.ang), uy = Math.sin(v.ang);
  vicoli.forEach(rd => { if (VV.lNear(VV.rdLinea(rd), v.x, v.y).d < rd.w / 2 + .3) sostaKo.push(`${v.id} nel vicolo ${rd.id}`); });
  // il fianco dell'auto verso il marciapiede (dal centro della via verso fuori) e le due teste: nessun fronte (porta, vetrina, scala) dietro
  // [mappa_compatta] lo stallo di piazza (piazzale della Stazione, Mercato, Scalo) ha il suo cordolo: il muro della piazza alle spalle
  // (q.nx, q.ny); sta sulle caselle di piazza o di via. Gli stalli lungo le vie restano come prima (dal centro della via verso fuori).
  const qs = VV.stalli().find(q => q.v === v.id); let ox, oy;
  if (qs && qs.piazza) { ox = qs.nx; oy = qs.ny; }
  else { const rdv = R.filter(rd => VV.rango(rd) === 'via').map(rd => [rd, VV.lNear(VV.rdLinea(rd), v.x, v.y)]).sort((a, b) => a[1].d - b[1].d)[0], c = VV.lAt(VV.rdLinea(rdv[0]), rdv[1].s);
    ox = v.x - c.x; oy = v.y - c.y; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol; }
  [-1, 0, 1].forEach(a => { const x = v.x + ux * a * K.len / 2 + ox * (K.wid / 2 + 1.2), y = v.y + uy * a * K.len / 2 + oy * (K.wid / 2 + 1.2), q = CH.davanti(F, x, y, 0); if (q) sostaKo.push(`${v.id} davanti a ${q.tipo}`); });
  const tv = G.tileAt(Math.floor(v.x / TS), Math.floor(v.y / TS)); if (tv !== T.VIA && !(qs && qs.piazza && tv === T.PIAZZA)) sostaKo.push(`${v.id} fuori dalla carreggiata`); });
// [mappa_compatta] almeno 4 (prima 8): il Corso da 7 m porta un solo lato di sosta e ha porte e vetrine su quasi tutto il cordolo, le
// altre vie sono da 5 m (senza auto) e alla tettoia del Mercato non c'è posto; la sosta sta lungo i muri del piazzale della Stazione
ok(V.sosta.length >= 4, `auto in sosta sugli stalli: ${V.sosta.length} (${JSON.stringify(VV.stalli().filter(q => q.v).reduce((o, q) => (o[q.dove] = (o[q.dove] || 0) + 1, o), {}))})`);
ok(!sostaKo.length, `nessuna auto in sosta in un vicolo, davanti a una porta, a una vetrina o a una scala (${[...new Set(sostaKo)].slice(0, 4).join('; ') || 'nessuna'})`);

// ---------------- 3. LA LINEA, LE EDICOLE, LE PLANCE, IL SUOLO ----------------
const Lb = VV.linea();
ok(Lb.ok && Lb.fermate.length >= 4, `la linea 1: ${Lb.nomi.join(' – ')}, giro di ${Lb.giro.L.toFixed(0)} m, ${Lb.fermate.length} fermate`);
ok(['Stazione', 'Mercato', 'Marina'].every(n => Lb.fermate.some(f => f.nome === n)) && Lb.fermate.some(f => f.rd && VV.profilo(R.find(r => r.id === f.rd)).rango === 'asse'), 'le fermate della Stazione, dell\'asse, del Mercato e della Marina');
let fermKo = Lb.fermate.filter(f => CH.davanti(F, f.x, f.y, 0) || G.tileAt(Math.floor(f.x / TS), Math.floor(f.y / TS)) === T.VIA);
ok(!fermKo.length, `le fermate stanno sul marciapiede e non davanti a una porta (${fermKo.map(f => f.id).join(', ') || 'tutte'})`);
const Pf = Posti.all().filter(q => q.vvf);
ok(Pf.length === Lb.fermate.length, `ogni fermata è un posto di posti.js (${Pf.length}: ${Pf.map(q => q.k).join(', ')})`);
const ED = VV.edicole(); ok(ED.length >= 2 && Posti.ofType('edicola').length === ED.length, `le edicole: ${ED.map(e => e.nome).join(', ')}`);
const Su = VV.suolo(); console.log(`     plance ${VV.plance().length}; suolo: ${Object.entries(Su).map(([k, v]) => k + ' ' + v.length).join(', ')}`);
// l'erba segue l'epoca: sull'asse quasi niente, nel borgo tanta (per 100 m di strada)
const erbaDi = era => { const rs = R.filter(rd => rd.era === era && VV.rango(rd) !== 'nessuno' && VV.rango(rd) !== 'extra'), L = rs.reduce((s, rd) => s + VV.rdLinea(rd).L, 0); const n = Su.erba.filter(e => e.era === era).length; return L ? n / L * 100 : 0; };
const eB = erbaDi('E0'), eA = erbaDi('E4'); ok(eB > 4 * Math.max(.5, eA), `l'erba nei giunti: borgo ${eB.toFixed(1)}, asse ${eA.toFixed(1)} ciuffi ogni 100 m`);
// le cose basse a terra non stanno sulla soglia (la fascia della porta, 1,6 m dal muro) né sulle scale; le auto e le fermate, sopra, su tutta la profondità
const sog = [...Su.erba, ...Su.volantini, ...Su.foglie].filter(e => VV.soglia(e.x, e.y));
ok(!sog.length, `niente erba, foglie e carte sulle soglie delle porte e sulle scale (${sog.length})`);

// ---------------- 4. LA GIORNATA ----------------
// [mappa_compatta] le vie principali sono quelle lunghe almeno 60 m: nella città compatta la Via della Stazione (30 m) e la Via del Porto
// (36 m) sono i monconi delle costiere che finiscono sul piazzale e sullo scalo; contati ogni 100 m, un'auto della costiera che li
// attraversa vale 3 mezzi, e la prova misurerebbe l'ingresso in città, non la via. Restano la Vittoria e il Corso.
const VIE = R.filter(rd => { const r = VV.rango(rd); return (r === 'asse' || r === 'via') && VV.rdLinea(rd).L >= 60; }).sort((a, b) => VV.rdLinea(b).L - VV.rdLinea(a).L);
const asse = VIE.find(rd => VV.rango(rd) === 'asse'), MAIN = [asse].concat(VIE.filter(rd => rd !== asse).slice(0, 3)).filter(Boolean);
st.t = Math.floor(st.t / 1440) * 1440 + 1440 + 5 * 60; V.stats.fermate = {}; Eventi.CFG.every = [8, 14]; Eventi.CFG.first = 3;
const DT = 1 / 20, byHour = [], t0 = Date.now(); let frames = 0;
for (let h = 0; h < hours; h++) {
  const hr = Math.floor(st.t / 60) % 24, rd = MAIN[h % MAIN.length], Ln = VV.rdLinea(rd), mid = VV.lAt(Ln, Ln.L / 2), nx = -Math.sin(mid.ang), ny = Math.cos(mid.ang);
  const gx = mid.x + nx * (rd.w / 2 + 1), gy = mid.y + ny * (rd.w / 2 + 1), end = st.t + 60; let n = 0; const acc = { giro: 0, sosta: 0, gente: 0, pattuglie: 0 };
  st.over = null; st.chase = false;
  while (st.t < end) { p.x = gx; p.y = gy; p.indoor = null; p.lv = null; p.vehicle = null; p.hp = 100; G.step(st, DT, { x: 0, y: 0 }); frames++;
    if (frames % 100 === 0) { const c = VV.conta(st, rd); acc.giro += c.giro; acc.sosta += c.sosta; acc.gente += c.gente; acc.pattuglie += c.pattuglie; n++; } }
  const m = { hr, rd: rd.id, giro: acc.giro / n, sosta: acc.sosta / n, gente: acc.gente / n, pattuglie: acc.pattuglie / n, bus: V.bus.map(id => st.vehicles.find(v => v.id === id)).filter(v => v && !v.hidden).length };
  byHour.push(m); console.log(`${String(hr).padStart(2, '0')}:00 ${rd.id.padEnd(14)} in giro ${m.giro.toFixed(1).padStart(4)}  in sosta ${m.sosta.toFixed(1).padStart(4)}  persone ${m.gente.toFixed(1).padStart(4)}  (pattuglie ${m.pattuglie.toFixed(1)})  ogni 100 m · autobus in linea ${m.bus} · ${VV.FASCIA(hr)}`);
}
console.log(`${frames} passi in ${((Date.now() - t0) / 1000).toFixed(0)} s (${((Date.now() - t0) / frames).toFixed(2)} ms per passo)`);
const served = Lb.fermate.map(f => [f, V.stats.fermate[f.id] || 0]);
console.log('     arrivi per fermata: ' + served.map(([f, k]) => `${f.nome} (${f.id.replace('vv_fermata_', '#')}) ${k}`).join(', ') + `; corse ${V.stats.corse}, saliti ${V.stats.saliti}, scesi ${V.stats.scesi}`);
if (hours >= 20) ok(served.every(([, k]) => k >= 2), 'in una giornata l\'autobus arriva a tutte le fermate (almeno due volte)');
const fascia = (a, b) => byHour.filter(m => m.hr >= a && m.hr < b);
const avg = (L, k) => L.length ? L.reduce((s, m) => s + m[k], 0) / L.length : 0;
const punta = fascia(7, 10), pranzo = fascia(13, 15), passeg = fascia(18, 21), notte = fascia(1, 5), giorno = fascia(8, 20);
if (punta.length && notte.length) {
  ok(avg(punta, 'giro') >= 1.2, `all'ora di punta almeno 1,2 mezzi in giro ogni 100 m di via principale (${avg(punta, 'giro').toFixed(2)})`);
  ok(avg(passeg, 'giro') >= 1, `alla passeggiata almeno 1 mezzo in giro ogni 100 m (${avg(passeg, 'giro').toFixed(2)})`);
  // [mappa_compatta] con due sole vie misurate (la Vittoria e il Corso, a ore alterne) le ore di una fascia cadono più su una via che
  // sull'altra: il confronto si fa via per via, poi la media delle vie (ogni via pesa uguale)
  const perVia = (L, k) => { const by = {}; L.forEach(m => (by[m.rd] = by[m.rd] || []).push(m)); const v = Object.values(by).map(M => avg(M, k)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  ok(perVia(pranzo, 'giro') < perVia(punta, 'giro'), `a pranzo meno traffico che all'ora di punta (${perVia(pranzo, 'giro').toFixed(2)} < ${perVia(punta, 'giro').toFixed(2)}, media delle vie)`);
  const civ = L => avg(L, 'giro') - avg(L, 'pattuglie');
  ok(civ(notte) <= .6, `di notte le vie vuote: ${civ(notte).toFixed(2)} mezzi civili in giro ogni 100 m, più le pattuglie (${avg(notte, 'pattuglie').toFixed(2)})`);
  ok(avg(giorno, 'gente') >= 2, `di giorno almeno 2 persone ogni 100 m di via principale (${avg(giorno, 'gente').toFixed(2)})`);
  // sulle vie almeno 2,5 fra mezzi e persone ogni 100 m; sull'asse 1,5 (pulito per ordine, poca gente che si ferma, ma mai morto)
  const tot = m => m.giro + m.sosta + m.gente, sAsse = giorno.filter(m => m.rd === (asse && asse.id)), sVie = giorno.filter(m => m.rd !== (asse && asse.id));
  ok(sVie.every(m => tot(m) >= 2.5), `ogni ora del giorno, su ogni via, almeno 2,5 fra mezzi e persone ogni 100 m (minimo ${Math.min(...sVie.map(tot)).toFixed(2)})`);
  ok(sAsse.every(m => tot(m) >= 1.5 && m.giro > 0), `ogni ora del giorno, sull'asse, mezzi in giro e almeno 1,5 fra mezzi e persone ogni 100 m (minimo ${sAsse.length ? Math.min(...sAsse.map(tot)).toFixed(2) : '-'})`);
  ok(notte.every(m => m.bus === 0), 'di notte niente autobus');
}
// le scene delle vie, lanciate a mano dove serve (come fanno le altre prove): la fila all'edicola la mattina, l'attacchino e chi raschia sull'asse
const prova = (id, x, y, ora, secs, check) => { st.t = Math.floor(st.t / 1440) * 1440 + 1440 + ora * 60; st.over = null; st.chase = false; for (let k = 0; k < 30 * 20; k++) { p.x = x; p.y = y; G.step(st, DT, { x: 0, y: 0 }); }
  let sc = null; for (let k = 0; k < 8 && !sc; k++) { sc = Eventi.run(st, id); if (!sc) for (let j = 0; j < 100; j++) { p.x = x; p.y = y; G.step(st, DT, { x: 0, y: 0 }); } }
  if (!sc) return { ok: false, why: 'non parte' }; for (let k = 0; k < secs * 20; k++) { p.x = x; p.y = y; G.step(st, DT, { x: 0, y: 0 }); } return { ok: check(sc), why: sc.why || ('battuta ' + sc.i) }; };
const e0 = VV.edicole()[0]; if (e0) { const r = prova('vv_fila_edicola', e0.x + 4, e0.y + 4, 8, 40, sc => sc.i >= 3); ok(r.ok, `la fila all'edicola ${e0.nome} (${r.why})`); }
{ const f0 = Lb.fermate.find(f => VV.profilo(R.find(r => r.id === f.rd)).rango === 'asse') || Lb.fermate[0], n0 = V.affissi.length;
  // [cucitura] la fermata della Vittoria sta sulla Piazza Grande: l'attacchino va al muro più vicino (entro 4 m da dove si mette)
  const muro4 = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { for (let d = .5; d < 4; d += .5) if (G.tileAt(Math.floor((x + a * d) / TS), Math.floor((y + c * d) / TS)) === T.BLD) return true; return false; });
  let ax = f0.x, ay = f0.y - 3; if (!muro4(ax, ay)) { let bd = 1e9; for (let dx = -16; dx <= 16; dx += 1) for (let dy = -20; dy <= 20; dy += 1) { const x = f0.x + dx, y = f0.y + dy, d = Math.hypot(dx, dy); if (d < bd && G.walkM(x, y) && G.tileAt(Math.floor(x / TS), Math.floor(y / TS)) !== T.VIA && muro4(x, y)) { bd = d; ax = x; ay = y; } } }
  const r = prova('vv_attacchino', ax, ay, 20, 25, sc => V.affissi.length > n0); ok(r.ok, `l'attacchino del Disgelo sulla Vittoria lascia il suo foglio (${r.why}; affissi ${V.affissi.length})`);
  if (V.affissi.length) { const a0 = V.affissi[V.affissi.length - 1], r2 = prova('vv_raschia', a0.x + a0.nx * 3, a0.y + a0.ny * 3, 21, 40, sc => !!a0.raschiato); ok(r2.ok, `e qualcuno lo raschia via (${r2.why})`); } }
const lv = Eventi.S(st).log.filter(e => /^vv_/.test(e.id)); console.log(`     scene delle vie: ${Object.entries(lv.reduce((o, e) => (o[e.id] = (o[e.id] || 0) + 1, o), {})).map(([k, v]) => k + ' ' + v).join(', ') || 'nessuna'}`);
ok(Eventi.SCENE.some(s => s.id === 'vv_fila_edicola') && Eventi.SCENE.some(s => s.id === 'vv_attacchino'), 'le scene delle vie sono nel catalogo di eventi.js');
const vg = G.byId(st, V.vigile); ok(!!vg, `il vigile all'incrocio grande (${vg ? vg.vigile.x.toFixed(0) + ',' + vg.vigile.y.toFixed(0) : '-'})`);
console.log(fail ? `\n${fail} prove fallite.` : '\nTutto bene.'); process.exit(fail ? 1 : 0);
