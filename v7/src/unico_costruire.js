/* [unico] unico_costruire.js: COSTRUIRE IN CITTÀ, fase 1 (progetto: commedia/COSTRUIRE_IN_CITTA.md, versione economica).
   Dietro ?commedia. Spento il flag: UnicoCostruire = { ON: false } e nient'altro (nessuna fase, nessun verbo, nessuna mesh).

   L'IDEA. Un gruppo (amici, gente messa insieme dal caso, o chi ha un rancore) sceglie l'obiettivo «rivendicare un posto» e ci
   costruisce sopra: una BARRICATA che chiude una via (lasciando sempre un varco per il giocatore) o una BARACCA in mezzo al corso.
   I pezzi sono modulari (bancali, assi, lamiera, porta di recupero, copertoni, travi, uno striscione), messi uno per volta coi verbi
   del catalogo, uguali per tutti: «raccatta» (il materiale, da cantiere, cassonetti, porto), «barrica» e «tira_su_baracca» (il pezzo),
   «presidia» (finita, il gruppo ci sta). Il materiale si cerca con la procura della mente (Mente.estendi: un modo in più di
   procurare, raccattare in giro, solo per chi ha un cantiere aperto). Nessuna fase sceglie al posto della mente: la fase qui forma il
   gruppo e il progetto (i dati), poi decide la Mente.
   I FATTI, ognuno col suo segno (bolla col pittogramma, Gazzetta, Si dice): «rivendica» (il gruppo ha deciso), «barrica»/«tira_su»
   (un pezzo), «barricata» (barricata in via X, finita), «baracca» (baracca sul corso, finita), «presidia».
   LO STATO è puro, in st.u.costruire: { n, giorno, prese: { 'sorgente:roba': [giorno, quanti] }, cantieri: [{ id, tipo, via, rd,
   x, y, a, w, lato, gruppo, motivo, t0, fid, piano: [[k, lx, ly, rot, z, mat]], pezzi: [[i, chi, t]], ass: { i: [chi, scade] },
   fine, mucchio }] }: i pezzi sono DATI (indice nel piano e chi l'ha messo), le mesh si rifanno dai dati (anche al caricamento).
   IL DISEGNO (solo nel browser): un gruppo di three.js per cantiere, la geometria UNITA per materiale (4-6 chiamate), il bancale di
   Arredo3D (lo stesso del porto) e i materiali di Arredo3D.mat; si rifà quando cambia il numero dei pezzi.
   VINCOLI: al più CFG.max cantieri aperti, uno per zona (CFG.zona m), al più CFG.maxPezzi pezzi l'uno; la barricata lascia sempre il
   varco (CFG.varco m, da un lato); la baracca lascia sul corso almeno 3 m.
   LA TAPPA: &cantiere[=barricata|baracca] nell'indirizzo mette subito un cantiere vicino al giocatore (la via più vicina, o il corso
   per la baracca), col gruppo dei quattro più vicini e un mucchio di materiale lì accanto; &pronto lo fa trovare finito.
   Non ancora (fasi dopo): lo sgombero dei grigi, le liti, la zona autonoma, i lanci, le arrampicate, gli automobilisti, le collisioni. */
var UnicoCostruire = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q);
  const UC = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UC;
  if (!ON) return UC;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const MU = () => (typeof MenteUnica !== 'undefined' && MenteUnica.ON ? MenteUnica : typeof Mente !== 'undefined' && Mente.ON && Mente.OBIETTIVI ? Mente : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  if (!G || !Un() || !MU() || !VB() || !FT() || !MU().estendi) { UC.ON = false; return UC; }
  const mt = /[?&]cantiere(?:=(\w+))?/.exec(Q);
  UC.TAPPA = mt ? (mt[1] === 'baracca' ? 'baracca' : 'barricata') : null;
  UC.pronto = /[?&]pronto\b/.test(Q);
  const hyp = Math.hypot, r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const hashS = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
  const CFG = UC.CFG = { max: 3, zona: 45, maxPezzi: 18, varco: 1.8, ogni: 240, da: 8, a: 20, giorno: 1, prob: .45, raggioGruppo: 30, sorgenti: 220,
    min: { barrica: 6, tira_su_baracca: 8 }, lontanoOgni: 30, assegna: 90, presidio: 1440, base: 1.3 };
  // il materiale di ogni pezzo (le cose del catalogo di oggetti.js)
  const MAT = { bancale: 'assi', copertone: 'pneumatico', porta: 'assi', lamiera: 'lamiera', assi: 'assi', trave: 'travi', tetto: 'lamiera', striscione: 'telo', panca: 'assi' };
  UC.MAT = MAT;
  // le sorgenti di recupero (G.PLACES), con quanto se ne trova in un giorno
  const SORGENTI = [['cantiere', { assi: 6, travi: 4, lamiera: 5 }], ['calata', { assi: 4, lamiera: 2, pneumatico: 3, telo: 1 }], ['discarica', { assi: 4, lamiera: 4, pneumatico: 4, telo: 1, travi: 2 }],
    ['magazzino', { assi: 3, travi: 2, telo: 1 }], ['vico', { assi: 2, pneumatico: 1 }], ['caruggio', { assi: 2, telo: 1 }], ['molo', { assi: 2, pneumatico: 2 }]];
  UC.SORGENTI = SORGENTI;
  const S = st => (st.u ? (st.u.costruire = st.u.costruire || { n: 0, giorno: -1, prese: {}, cantieri: [] }) : null);
  const giorno = st => Math.floor(st.t / 1440);
  const npc = (st, id) => (G.byId ? G.byId(st, id) : st.npcs.find(n => n.id === id));
  const stats = UC.stats = { cantieri: 0, pezzi: 0, lontano: 0, raccatta: 0, finiti: 0 };

  // ======================= IL PIANO DEI PEZZI (dati: dal tipo e dalla larghezza della via) =======================
  // [k, lx, ly, rot, z, mat]: nel sistema del cantiere (lx lungo a, ly di traverso), rot attorno alla verticale, z la quota del piede
  function pianoBarricata(w, lato, h) {
    const out = [], x0 = -w / 2 + .3, x1 = w / 2 - CFG.varco;   // il varco sta dal lato +lx; lato lo gira
    const span = x1 - x0, n = Math.max(2, Math.min(5, Math.floor(span / 1.25))), passo = span / n, cx = i => (x0 + passo * (i + .5)) * lato;
    for (let i = 0; i < n; i++) out.push(['bancale', cx(i), 0, 0, 0]);
    for (let i = 0; i < n;) { if (i + 1 < n && hashS(h + 'p' + i) < .55) { out.push(['porta', (cx(i) + cx(i + 1)) / 2, .02, 0, .8]); i += 2; } else { out.push(['lamiera', cx(i), .03, 0, .8]); i++; } }
    out.push(['copertone', cx(0), -.75, 0, 0]); if (n > 2) out.push(['copertone', cx(n - 1), -.75, 0, 0]);
    out.push(['assi', cx(0) * .5 + cx(Math.min(1, n - 1)) * .5, -.12, .55 * lato, .2]);
    const xa = (x0 - .05) * lato, xb = (x1 - .06) * lato;
    out.push(['trave', xa, -.1, 0, 0, 2.4], ['trave', xb, -.1, 0, 0, 2.4]);
    out.push(['striscione', (xa + xb) / 2, -.16, 0, 1.8, Math.abs(xb - xa)]);
    return out.slice(0, CFG.maxPezzi).map(p => [p[0], r2(p[1]), r2(p[2]), r2(p[3]), r2(p[4]), MAT[p[0]], p[5] !== undefined ? r2(p[5]) : 0]);
  }
  function pianoBaracca() {
    const L = 1.5, D = 1.2, out = [];
    for (const [x, y] of [[-L, -D], [L, -D], [-L, D], [L, D]]) out.push(['trave', x * .97, y * .96, 0, 0, y > 0 ? 2.6 : 2.3]);
    out.push(['lamiera', -.74, -D, 0, 0, 2], ['lamiera', .74, -D, 0, 0, 2]);
    out.push(['porta', -.82, D, 0, 0], ['bancale', .58, D, 0, 0], ['bancale', .58, D, 0, .8]);
    out.push(['lamiera', -L, -.6, Math.PI / 2, 0, 2], ['lamiera', -L, .6, Math.PI / 2, 0, 2], ['lamiera', L, -.6, Math.PI / 2, 0, 2], ['lamiera', L, .6, Math.PI / 2, 0, 2]);
    out.push(['tetto', -.78, 0, 0, 2.15], ['tetto', .78, 0, 0, 2.15]);
    out.push(['striscione', 0, D + .07, 0, 2.08, 2.6], ['panca', .3, D + .75, 0, 0]);
    return out.slice(0, CFG.maxPezzi).map(p => [p[0], r2(p[1]), r2(p[2]), r2(p[3]), r2(p[4]), MAT[p[0]], p[5] !== undefined ? r2(p[5]) : 0]);
  }
  // un punto del cantiere nel mondo
  const mondo = (C, lx, ly) => ({ x: C.x + Math.cos(C.a) * lx - Math.sin(C.a) * ly, y: C.y + Math.sin(C.a) * lx + Math.cos(C.a) * ly });
  // dove sta chi mette il pezzo i: davanti (dal lato del mucchio, ly negativo), a 1 m
  function postoDi(C, i) { const p = C.piano[i]; const ly = C.tipo === 'barricata' ? -1.15 : (p[2] >= 0 ? p[2] + .9 : p[2] - .9); return mondo(C, p[1], ly); }
  // i pezzi nel mondo (per il disegno e per le prove): [k, x, y, rot, z, extra]
  function pezziMondo(C) { return C.pezzi.map(([i]) => { const p = C.piano[i], q = mondo(C, p[1], p[2]); return [p[0], r2(q.x), r2(q.y), r2(C.a + p[3]), p[4], p[6]]; }); }
  UC.pezziMondo = pezziMondo; UC.postoDi = postoDi; UC.mondo = mondo;
  // il varco: il segmento di via libero (per le prove: nessun pezzo ci entra)
  function varcoDi(C) { if (C.tipo !== 'barricata') return null; const x1 = C.w / 2 - CFG.varco; return [mondo(C, (x1 + .02) * C.lato, 0), mondo(C, (C.w / 2 - .1) * C.lato, 0)]; }
  UC.varcoDi = varcoDi;

  // ======================= LE VIE =======================
  const vie = () => ((G.MAP && G.MAP.roads) || []).filter(r => r && r.pts && r.pts.length > 1 && (r.kind === 'citta' || r.kind === 'vicolo'));
  // il punto della via più vicino a (x, y): { rd, x, y, th (la direzione della via), d }
  function viaVicina(x, y, filtro) {
    let best = null;
    for (const rd of vie()) {
      if (filtro && !filtro(rd)) continue;
      const P = rd.pts;
      for (let i = 0; i + 1 < P.length; i++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy; if (!L2) continue;
        const u = Math.max(.15, Math.min(.85, ((x - ax) * dx + (y - ay) * dy) / L2)), px = ax + dx * u, py = ay + dy * u, d = hyp(px - x, py - y);
        if (!best || d < best.d) best = { rd, x: px, y: py, th: Math.atan2(dy, dx), d };
      }
    }
    return best;
  }
  const libera = (st, x, y, salta) => !S(st).cantieri.some(C => C !== salta && hyp(C.x - x, C.y - y) < CFG.zona);

  // ======================= IL GRUPPO E IL PROGETTO =======================
  const MENTE = (st, id) => (st.u && st.u.menti ? st.u.menti[id] : null);
  const candidato = (st, n) => !!(n && !n.inside && !n.dead && MU()._.candidato(st, n) && !(n.jailedUntil > st.t) && !occupato(st, n.id));
  const occupato = (st, id) => S(st).cantieri.some(C => !C.chiuso && C.gruppo.includes(id));
  function motivoDi(st, ids) {
    let ranc = 0, aff = 0, k = 0;
    for (const a of ids) { const M = MENTE(st, a); if (!M) continue; for (const b in M.rel) { const r = M.rel[b]; if (!r) continue; if (ids.includes(b)) { aff += r[1] || 0; k++; } if ((r[3] || 0) > ranc) ranc = r[3] || 0; } }
    return ranc > .45 ? 'rancore' : k && aff / k > .15 ? 'amici' : 'caso';
  }
  // forma un gruppo attorno a un capo: prima gli amici (la mente: rel), poi chi c'è vicino (il caso)
  function gruppoDi(st, capo, quanti, raggio) {
    const M = MENTE(st, capo.id), L = [];
    for (const n of st.npcs) { if (n === capo || !candidato(st, n)) continue; const d = hyp(n.x - capo.x, n.y - capo.y); if (d > raggio) continue; const r = M && M.rel[n.id]; L.push([d - (r ? (r[1] || 0) * 40 : 0) + hashS(n.id + capo.id) * 3, n.id]); }
    L.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
    return [capo.id].concat(L.slice(0, quanti - 1).map(x => x[1]));
  }
  // il progetto: tipo, posto, piano. o: { tipo, x, y, gruppo, motivo, mucchio, pronto }
  function apri(st, o) {
    const s = S(st); if (!s || s.cantieri.filter(C => !C.chiuso).length >= CFG.max) return null;
    const tipo = o.tipo === 'baracca' ? 'baracca' : 'barricata';
    const V0 = tipo === 'baracca' ? viaVicina(o.x, o.y, rd => rd.id === 'corso') || viaVicina(o.x, o.y) : viaVicina(o.x, o.y, rd => rd.id !== 'corso' && (rd.w || 6) >= 5 && (rd.w || 6) <= 8.5);
    if (!V0 || !libera(st, V0.x, V0.y)) return null;
    const w = V0.rd.w || 6, id = 'c' + (++s.n), lato = hashS(id + st.u.seme) < .5 ? 1 : -1;
    let C;
    if (tipo === 'barricata') C = { id, tipo, via: V0.rd.name || 'la via', rd: V0.rd.id, x: r2(V0.x), y: r2(V0.y), a: r2(V0.th + Math.PI / 2), w, lato };
    else { const off = Math.max(0, w / 2 - 1.2 - .3) * lato, nx = -Math.sin(V0.th), ny = Math.cos(V0.th); C = { id, tipo, via: V0.rd.name || 'il corso', rd: V0.rd.id, x: r2(V0.x + nx * off), y: r2(V0.y + ny * off), a: r2(V0.th), w, lato }; }
    C.piano = tipo === 'barricata' ? pianoBarricata(w, lato, id) : pianoBaracca();
    Object.assign(C, { gruppo: o.gruppo.slice(0, 5), motivo: o.motivo || motivoDi(st, o.gruppo), t0: r1(st.t), fid: null, pezzi: [], ass: {}, fine: null, chiuso: false, mucchio: null });
    if (o.mucchio) { const q = tipo === 'barricata' ? mondo(C, -lato * 1.2, -5) : mondo(C, -3.7, -.3 * lato); C.mucchio = { x: r2(q.x), y: r2(q.y), scorta: Object.assign({}, o.mucchio) }; }
    s.cantieri.push(C); stats.cantieri++;
    C.fid = scrivi(st, 'rivendica', C, { motivo: C.motivo });
    for (const m of C.gruppo) { const Mn = MU()._.menteDi(st, npc(st, m), true); if (Mn) { Mn.prossima = Math.min(Mn.prossima, st.t + 1); if (Mn.ob && Mn.ob.g !== 'rivendicare') { Mn.ob = null; Mn.piano = null; } } }
    if (o.pronto) { for (let i = 0; i < C.piano.length; i++) C.pezzi.push([i, C.gruppo[i % C.gruppo.length], r1(st.t)]); finisci(st, C); }
    return C;
  }
  function scrivi(st, tipo, C, extra) {
    const F = FT(); const dati = Object.assign({ via: C.via, tipo: C.tipo, cantiere: C.id, x: C.x, y: C.y }, extra || {});
    let r = null; try { r = F.scrivi(tipo, C.gruppo.slice(), dati, C.fid || null, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) return r.id;
    const f = F._ && F._.registra ? F._.registra(st, { t: st.t, v: tipo, chi: C.gruppo.slice(), causa: C.fid || null, peso: 1, hop: 0 }, dati, 'unico') : null;
    return f ? f.id : null;
  }
  function finisci(st, C) {
    if (C.fine !== null) return; C.fine = r1(st.t); C.ass = {}; stats.finiti++;
    C.fidFine = scrivi(st, C.tipo, C, { pezzi: C.pezzi.length });
  }
  UC.apri = apri;
  // [idee] LA STRUTTURA CHIESTA PER EFFETTO: chi vuole un effetto (salire in aria, avere un riparo, chiudere una via) chiede una
  // struttura con UC.richiedi(st, { effetto: 'rampa'|'riparo'|'sbarramento'|..., altezza, x, y, gruppo: [id], motivo }). Le strutture
  // procedurali (rampa, torre, rifugio, ponte composti da primitivi) le registrerà un modulo dopo, in UC.STRUTTURE[effetto] =
  // (st, req) → cantiere | null. Per ora: la rampa e lo sbarramento sono un mucchio di pezzi che ci sono (la barricata), il riparo è la
  // baracca. Il cantiere porta req.effetto in C.effetto, così chi l'ha chiesto lo ritrova (UC.perEffetto).
  UC.STRUTTURE = UC.STRUTTURE || {};
  const RIPIEGO = { rampa: 'barricata', sbarramento: 'barricata', torre: 'barricata', riparo: 'baracca', palco: 'baracca' };
  UC.richiedi = (st, req) => {
    if (!req || !req.gruppo || !req.gruppo.length) return null;
    const f = UC.STRUTTURE[req.effetto]; let C = null;
    if (f) { try { C = f(st, req); } catch (e) { C = null; } }
    else if (RIPIEGO[req.effetto]) C = apri(st, { tipo: RIPIEGO[req.effetto], x: req.x, y: req.y, gruppo: req.gruppo, motivo: req.motivo || req.effetto });
    if (C) { C.effetto = req.effetto; if (req.altezza) C.altezza = req.altezza; }
    return C;
  };
  UC.perEffetto = (st, id, eff) => { const s = st.u && st.u.costruire; if (!s) return null; for (const C of s.cantieri) if (!C.chiuso && C.effetto === eff && C.gruppo.includes(id)) return C; return null; };

  // ======================= LA MENTE: la fonte, l'obiettivo, il metodo, il modo di procurare =======================
  const cantiereDi = (st, id) => { const s = st.u && st.u.costruire; if (!s) return null; for (const C of s.cantieri) if (!C.chiuso && C.gruppo.includes(id)) return C; return null; };
  const lontanoC = c => c.lod === 'lontano' || c.lod === 'dormiente';
  // il prossimo pezzo libero (non messo, non assegnato a un altro): in ordine di piano (prima la base)
  function prossimo(st, C, id) {
    const messi = new Set(C.pezzi.map(p => p[0]));
    for (const k in C.ass) if (C.ass[k][1] <= st.t || messi.has(+k)) delete C.ass[k];
    for (const k in C.ass) if (C.ass[k][0] === id) return +k;
    for (let i = 0; i < C.piano.length; i++) if (!messi.has(i) && !C.ass[i]) return i;
    return -1;
  }
  const FONTE = c => { const C = cantiereDi(c.st, c.n.id); if (!C) return 0; if (C.fine === null) return 1; return c.st.t - C.fine < CFG.presidio ? .55 : 0; };
  function metodo(c) {
    const st = c.st, C = cantiereDi(st, c.n.id); if (!C || lontanoC(c)) return null;
    if (C.fine !== null) {   // finita: ci si sta, il gruppo presidia
      const a = hashS(c.n.id + C.id) * Math.PI * 2, q = C.tipo === 'barricata' ? mondo(C, (hashS(c.n.id) - .7) * 2, -2.2 - hashS(c.n.id + 'r') * 1.5) : mondo(C, Math.cos(a) * 2.6, C.lato > 0 ? -2.4 - hashS(c.n.id) : 2.4 + hashS(c.n.id));
      return { passi: [['vai', { x: r1(q.x), y: r1(q.y) }], ['presidia', { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .3, perche: C.fidFine || C.fid };
    }
    const i = prossimo(st, C, c.n.id); if (i < 0) return null;
    C.ass[i] = [c.n.id, r1(st.t + CFG.assegna)];
    const p = C.piano[i], q = postoDi(C, i), v = C.tipo === 'barricata' ? 'barrica' : 'tira_su_baracca';
    return { passi: [['@procura', { cosa: p[5], q: 1 }], ['vai', { x: r1(q.x), y: r1(q.y) }], [v, { c: C.id, i, rec: C.id + '#' + i, x: r1(q.x), y: r1(q.y) }]], costo: .2, perche: C.fid };
  }
  // procurare raccattando: solo per chi ha un cantiere aperto; il mucchio del cantiere prima, poi la sorgente più vicina con roba
  function scorta(st, k, g) {
    if (/^mucchio:/.test(k)) { const C = S(st).cantieri.find(x => x.id === k.slice(8)); return C && C.mucchio ? C.mucchio.scorta[g] || 0 : 0; }
    const So = SORGENTI.find(x => x[0] === k); if (!So || !G.PLACES[k]) return 0;
    const pr = S(st).prese[k + ':' + g], d = giorno(st), preso = pr && pr[0] === d ? pr[1] : 0;
    return Math.max(0, (So[1][g] || 0) - preso);
  }
  function posDi(st, k) { if (/^mucchio:/.test(k)) { const C = S(st).cantieri.find(x => x.id === k.slice(8)); return C && C.mucchio ? C.mucchio : null; } return G.PLACES[k] || null; }
  function sorgente(st, A, C, g, q) {
    if (C.mucchio && (C.mucchio.scorta[g] || 0) >= q) return 'mucchio:' + C.id;
    let best = null, bd = CFG.sorgenti;
    for (const [k] of SORGENTI) { if (scorta(st, k, g) < q) continue; const P = G.PLACES[k]; const d = hyp(P.x - A.x, P.y - A.y); if (d < bd) { bd = d; best = k; } }
    return best;
  }
  function procura(c, g, q) {
    if (!Object.values(MAT).includes(g)) return null;
    const C = cantiereDi(c.st, c.n.id); if (!C || C.fine !== null) return null;
    const k = sorgente(c.st, c.A, C, g, q); if (!k) return null; const P = posDi(c.st, k);
    const d = {}; calcRec(c.st, c.A, { da: k }, d);   // il «vai» prima: le condizioni del verbo si guardano alla partenza
    return { c: .15 + hyp(P.x - c.A.x, P.y - c.A.y) / 300, p: [['vai', { x: d.x, y: d.y }], ['raccatta', { cosa: g, q, da: k }]] };
  }
  MU().estendi({
    fonti: { rivendica: FONTE },
    obiettivi: { rivendicare: { base: UC.TAPPA ? 12 : CFG.base, considera: [['tutto', 'rivendica', 1]], car: ['!pigro', 'teatrale'], metodi: ['rivendica'] } },
    metodi: { rivendica: metodo }, costo: { rivendica: () => .2 }, procura,
  });

  // ======================= I VERBI (schede di dati, la porta di tutti) =======================
  const V = VB(), val = V._.val;
  const Cdi = (c, k) => { const s = c.st.u && c.st.u.costruire, id = val(k, c); return s ? s.cantieri.find(x => x.id === id) || null : null; };
  Object.assign(V.COND, {
    c_aperto: (c, k) => { const C = Cdi(c, k); return C && !C.chiuso ? '' : 'Qui non si costruisce niente.'; },
    c_libero: (c, k, i) => { const C = Cdi(c, k), n = +val(i, c); if (!C || !C.piano[n]) return 'Questo pezzo non c\'è.'; if (C.fine !== null) return 'È già finita.'; return C.pezzi.some(p => p[0] === n) ? 'Questo pezzo l\'ha già messo qualcuno.' : ''; },
    c_vicino: (c, k, i) => { if (c.a.lontano) return ''; const C = Cdi(c, k), n = +val(i, c); if (!C || !C.piano[n]) return 'Sei troppo lontano.'; const q = mondo(C, C.piano[n][1], C.piano[n][2]); return hyp(c.A.x - q.x, c.A.y - q.y) <= 6 ? '' : 'Sei troppo lontano.'; },
    c_membro: (c, k) => { const C = Cdi(c, k); return C && C.gruppo.includes(c.A.id) ? '' : 'Non è roba tua.'; },
    recupero: (c, k, g, q) => (scorta(c.st, val(k, c), val(g, c)) >= (+val(q, c) || 1) ? '' : 'Qui non se ne trova più.'),
    rec_vicino: (c, k) => { if (c.a.lontano) return ''; const P = posDi(c.st, val(k, c)); return P && hyp(c.A.x - P.x, c.A.y - P.y) <= (/^mucchio/.test(val(k, c)) ? 6 : 16) ? '' : 'Sei troppo lontano.'; },
    c_finita: (c, k) => { const C = Cdi(c, k); return C && C.fine !== null ? '' : 'Non è ancora finita.'; },
  });
  Object.assign(V.EFF, {
    '-recupero': (c, k, g, q) => {
      const st = c.st, key = val(k, c), cosa = val(g, c), n = +val(q, c) || 1;
      if (/^mucchio:/.test(key)) { const C = S(st).cantieri.find(x => x.id === key.slice(8)); if (C && C.mucchio) C.mucchio.scorta[cosa] = Math.max(0, (C.mucchio.scorta[cosa] || 0) - n); }
      else { const kk = key + ':' + cosa, d = giorno(st), pr = S(st).prese[kk]; S(st).prese[kk] = [d, (pr && pr[0] === d ? pr[1] : 0) + n]; }
      stats.raccatta++;
    },
    c_posa: (c, k, i) => {
      const st = c.st, C = Cdi(c, k), n = +val(i, c); if (!C || C.pezzi.some(p => p[0] === n)) return;
      C.pezzi.push([n, c.A.id, r1(st.t)]); delete C.ass[n]; stats.pezzi++;
      if (C.pezzi.length >= C.piano.length) finisci(st, C);
    },
  });
  const calcPezzo = (st, A, a, d) => { const s = st.u && st.u.costruire, C = s && s.cantieri.find(x => x.id === a.c), p = C && C.piano[+a.i]; d.mat = p ? p[5] : 'assi'; d.cosa = d.mat; d.min = CFG.min[C && C.tipo === 'baracca' ? 'tira_su_baracca' : 'barrica']; if (p) { const q = postoDi(C, +a.i); d.x = r1(q.x); d.y = r1(q.y); d.via = C.via; } };
  const calcRec = (st, A, a, d) => {   // dove si sta per prendere: dal mucchio, sul lato verso il cantiere; da una sorgente, attorno
    const P = posDi(st, a.da); if (!P) return;
    if (/^mucchio:/.test(a.da)) { const C = S(st).cantieri.find(x => x.id === a.da.slice(8)), L = C ? hyp(C.x - P.x, C.y - P.y) || 1 : 1, u = (hashS(A.id) - .5) * .8; if (C) { d.x = r1(P.x + (C.x - P.x) / L * 1.1 - (C.y - P.y) / L * u); d.y = r1(P.y + (C.y - P.y) / L * 1.1 + (C.x - P.x) / L * u); return; } }
    const ang = hashS(A.id + a.da) * Math.PI * 2; d.x = r1(P.x + Math.cos(ang) * 3); d.y = r1(P.y + Math.sin(ang) * 3);
  };
  const PEZZO = (bolla, parole, fatto) => ({ fam: 'manipola', args: { c: 'cantiere', i: 'n', x: 'n', y: 'n' },
    pre: [['vivo'], ['c_aperto', '$c'], ['c_membro', '$c'], ['c_libero', '$c', '$i'], ['ha', '$mat', 1], ['c_vicino', '$c', '$i']],
    eff: [['-borsa', '$mat', 1], ['c_posa', '$c', '$i']], costo: { min: '$min', fatica: .07 }, dove: ['posto', '$x', '$y'], prenota: [['cpezzo:$c:$i', 1, 1]],
    posa: 'martella', oggetto: 'assi', segno: { bolla: [bolla, parole], cambia: 'cantiere' }, fatto, menu: false });
  V.registra('raccatta', { fam: 'manipola', args: { cosa: 'roba', q: 'n?', da: 'sorgente' }, pre: [['vivo'], ['recupero', '$da', '$cosa', '$q'], ['rec_vicino', '$da'], ['porta', '$cosa', '$q']],
    eff: [['+borsa', '$cosa', '$q'], ['-recupero', '$da', '$cosa', '$q']], costo: { min: 4, fatica: .02 }, dove: ['posto', '$x', '$y'], prenota: [['recupero:$da:$cosa', '$q', '$scorta']],
    posa: 'raccoglie', oggetto: '$cosa', segno: { bolla: ['mano', '$cosa'] }, fatto: 'raccatta', menu: false }, null, (st, A, a, d) => { calcRec(st, A, a, d); d.scorta = scorta(st, a.da, a.cosa); });
  V.registra('barrica', PEZZO('barricata', 'via nostra', 'barrica'), null, calcPezzo);
  V.registra('tira_su_baracca', PEZZO('baracca', 'casa nostra', 'tira_su'), null, calcPezzo);
  V.registra('presidia', { fam: 'sociale', args: { c: 'cantiere', x: 'n', y: 'n' }, pre: [['vivo'], ['c_aperto', '$c'], ['c_membro', '$c'], ['c_finita', '$c']], eff: [], costo: { min: 40 },
    dove: ['posto', '$x', '$y'], posa: 'discute', segno: { bolla: ['casetta', 'è nostra'] }, fatto: 'presidia', menu: false }, null, (st, A, a, d) => { const s = st.u && st.u.costruire, C = s && s.cantieri.find(x => x.id === a.c); if (C) d.via = C.via; });

  // ======================= I SEGNI (i tipi dei fatti, per la bolla, la Gazzetta, la Cronaca, il Si dice) =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    raccatta: { p: 'mano', w: '$cosa', posa: 'raccoglie', gz: 0, n: ['cosa raccattata', 'cose raccattate'] },
    rivendica: { p: 'esclamativo', w: 'è nostra', posa: 'discute', gz: .5, n: ['posto rivendicato', 'posti rivendicati'],
      r: ['{A}[, {B}] e gli altri hanno deciso: {via} è loro.', 'In {via} {A}[ e {B}] si sono messi in testa di costruire.', '«Questo posto ce lo prendiamo noi»: {A}[, {B}] e compagnia, in {via}.'] },
    barrica: { p: 'barricata', w: 'via nostra', posa: 'martella', gz: .15, n: ['pezzo di barricata', 'pezzi di barricata'], r: ['{A} ha messo {cosaI} sulla barricata[ in {via}].'] },
    tira_su: { p: 'baracca', w: 'casa nostra', posa: 'martella', gz: .15, n: ['pezzo di baracca', 'pezzi di baracca'], r: ['{A} ha inchiodato {cosaI} alla baracca[ in {via}].'] },
    barricata: { p: 'barricata', w: 'via nostra', posa: 'discute', gz: .95, n: ['barricata', 'barricate'],
      r: ['Barricata in {via}: l\'hanno tirata su {A}[, {B}] e gli altri.', '{via} chiusa con bancali e lamiere (resta un varco): è opera di {A}[ e {B}].', 'In {via} si passa a fatica: {A}[, {B}] e compagnia hanno fatto la barricata.'] },
    baracca: { p: 'baracca', w: 'casa nostra', posa: 'discute', gz: .95, n: ['baracca', 'baracche'],
      r: ['Una baracca in mezzo al {via}: ci stanno {A}[, {B}] e gli altri.', 'Sul {via} è spuntata una baracca di lamiera: è di {A}[ e {B}].', 'Lamiera, bancali e una porta vecchia: {A}[ e {B}] si sono fatti casa sul {via}.'] },
    presidia: { p: 'casetta', w: 'è nostra', posa: 'discute', gz: 0, n: ['turno di guardia', 'turni di guardia'], bolla: false },
  });
  const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { rivendica: .55, barricata: .8, baracca: .75, barrica: .3, tira_su: .3 });

  // ======================= LA FASE: il gruppo che decide, il lontano, la tappa =======================
  function nuovoCantiere(st) {
    const s = S(st), d = giorno(st), h = (st.t % 1440) / 60;
    if (s.giorno === d || d < CFG.giorno || h < CFG.da || h >= CFG.a || s.cantieri.filter(C => !C.chiuso).length >= CFG.max) return null;
    s.giorno = d;
    if (hashS(st.u.seme + '|giorno|' + d) > CFG.prob) return null;
    // il capo: fra chi è fuori, l'hash del giorno sceglie; il gruppo attorno a lui
    const L = st.npcs.filter(n => candidato(st, n) && n.pop).map(n => [hashS(st.u.seme + '|' + d + '|' + n.id), n]).sort((a, b) => a[0] - b[0]);
    for (const [, capo] of L.slice(0, 12)) {
      const gr = gruppoDi(st, capo, 3 + Math.floor(hashS(capo.id + d) * 2), CFG.raggioGruppo); if (gr.length < 3) continue;
      const tipo = hashS(capo.id + '|tipo|' + d) < .5 ? 'baracca' : 'barricata';
      const C = apri(st, { tipo, x: capo.x, y: capo.y, gruppo: gr }); if (C) return C;
    }
    return null;
  }
  // chi è lontano costruisce lo stesso, dai dati (strategia C, la stessa porta): un pezzo ogni CFG.lontanoOgni minuti
  function lontano(st) {
    const MN = MU();
    for (const C of S(st).cantieri) {
      if (C.chiuso || C.fine !== null) continue;
      const vic = C.gruppo.some(id => { const n = npc(st, id); return n && n.pop && n.pop.near; }); if (vic) continue;
      if (st.t - (C.tl || C.t0) < CFG.lontanoOgni) continue; C.tl = r1(st.t);
      const id = C.gruppo[C.pezzi.length % C.gruppo.length], n = npc(st, id); if (!n || n.dead) continue;
      const i = prossimo(st, C, id); if (i < 0) continue; const g = C.piano[i][5];
      const A = typeof Attore !== 'undefined' ? Attore.di(st, n) : null; if (!A) continue;
      if (A.borsa.get(g) < 1) { const k = sorgente(st, A, C, g, 1) || SORGENTI.map(x => x[0]).find(k2 => scorta(st, k2, g) >= 1); if (!k) continue; V.applica(st, n, 'raccatta', { cosa: g, q: 1, da: k, lontano: 1 }, { lod: 'lontano' }); }
      const r = V.applica(st, n, C.tipo === 'barricata' ? 'barrica' : 'tira_su_baracca', { c: C.id, i, lontano: 1 }, { lod: 'lontano' });
      if (r && r.ok) stats.lontano++;
    }
  }
  // la tappa (&cantiere): vicino al giocatore, coi quattro più vicini portati lì e il mucchio accanto
  function tappa(st) {
    const p = st.player; if (!p || p.indoor) return null;
    const L = st.npcs.filter(n => candidato(st, n) && n.pop).map(n => [hyp(n.x - p.x, n.y - p.y) + hashS(n.id) * 2, n]).sort((a, b) => a[0] - b[0]).slice(0, 4).map(x => x[1]);
    if (L.length < 3) return null;
    const C = apri(st, { tipo: UC.TAPPA, x: p.x, y: p.y, gruppo: L.map(n => n.id), mucchio: { assi: 12, lamiera: 10, travi: 5, pneumatico: 3, telo: 2 }, pronto: UC.pronto });
    if (!C) return null;
    L.forEach((n, i) => { const q = C.fine !== null ? (C.tipo === 'barricata' ? mondo(C, (i - 1.5) * 1.3, -2.2 - (i % 2) * .8) : mondo(C, (i - 1.5) * 1.4, -C.lato * (2.3 + (i % 2) * .6))) : mondo(C, (i - 1.5) * 1.6, C.tipo === 'barricata' ? -3.5 : -C.lato * 3.4);
      n.x = q.x; n.y = q.y; if (n.pop) { n.pop.path = []; } n.vx = n.vy = 0; n.face = Math.atan2(C.y - n.y, C.x - n.x); });
    return C;
  }
  function fase(st) {
    if (!st.u || !st.npcs) return;
    const s = S(st), P = Un().passi;
    if (UC.TAPPA && !s.tappa && P > 40) { const C = tappa(st); if (C) s.tappa = C.id; else if (P > 4000) s.tappa = 'no'; }
    if (P % CFG.ogni === 0) { if (!UC.TAPPA) nuovoCantiere(st); lontano(st); }
  }
  Un().fase('unico.costruire', { dopo: 'unico.mente', budget: { p95: .02 } }, fase);
  Object.assign(UC, { S, apri, fase, tappa, lontano, nuovoCantiere, scorta, sorgente, prossimo, viaVicina, pianoBarricata, pianoBaracca, cantiereDi, FONTE });
  Un().Costruire = UC;

  // ======================= IL DISEGNO (solo nel browser) =======================
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined' || typeof THREE === 'undefined') return UC;
  const T3 = THREE, AR = () => (typeof Arredo3D !== 'undefined' ? Arredo3D : null);
  const MC = {};
  function mat(col, kind, doppio) {
    const k = col + kind + (doppio ? 2 : 1); if (MC[k]) return MC[k];
    let m = AR() && AR().mat ? AR().mat(col, kind) : new T3.MeshStandardMaterial({ color: col, roughness: .8 });
    if (doppio) { m = m.clone(); m.side = T3.DoubleSide; }
    return (MC[k] = m);
  }
  const TINTE = { legno: ['#b8986a', 'legno'], legnoS: ['#7a5634', 'legno'], lamiera: ['#8a8e8a', 'zinco'], ruggine: ['#9a5a3a', 'vernice'], porta: ['#2f5a3e', 'vernice'], portaO: ['#DC9A34', 'vernice'], gomma: ['#1e1c1e', 'gomma'], trave: ['#6a4a2c', 'legno'] };
  const MT = k => (k === 'lamiera' || k === 'ruggine' ? mat(TINTE[k][0], TINTE[k][1], true) : mat(TINTE[k][0], TINTE[k][1]));
  // la lamiera ondulata: un piano con le onde (8 per metro), un lato solo di geometria, i due lati di materiale
  const GEO = {};
  function onda(w, h) { const k = 'o' + w + 'x' + h; if (GEO[k]) return GEO[k]; const g = new T3.PlaneGeometry(w, h, Math.max(4, Math.round(w * 8)), 1); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getX(i) * 8 * Math.PI) * .018); g.computeVertexNormals(); return (GEO[k] = g); }
  const box = (w, h, d) => { const k = 'b' + [w, h, d].join(); return GEO[k] || (GEO[k] = new T3.BoxGeometry(w, h, d)); };
  const cil = (r, h) => { const k = 'c' + r + h; return GEO[k] || (GEO[k] = new T3.CylinderGeometry(r, r, h, 10, 1, false)); };
  let BANC = null;   // il bancale di Arredo3D, unito una volta per materiale: [[geometria, materiale]]
  function bancale() {
    if (BANC) return BANC; BANC = [];
    const g0 = AR() && AR().make ? AR().make('bancale', {}) : null;
    if (!g0) { BANC.push([box(1.2, .144, .8), MT('legno'), new T3.Matrix4().makeTranslation(0, .072, 0)]); return BANC; }
    g0.updateMatrixWorld(true); g0.traverse(o => { if (o.isMesh) BANC.push([o.geometry, o.material, o.matrixWorld.clone()]); });
    return BANC;
  }
  // la tela dello striscione: carta, la scritta in cotto con l'inchiostro attorno (lo stile fumetto), una volta per testo
  const TELE = {};
  function tela(testo) {
    if (TELE[testo]) return TELE[testo];
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
    x.fillStyle = '#F2E7CF'; x.fillRect(0, 0, 512, 96); x.strokeStyle = '#16121B'; x.lineWidth = 6; x.strokeRect(3, 3, 506, 90);
    x.font = 'bold 58px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = 10; x.strokeStyle = '#16121B'; x.strokeText(testo, 256, 52); x.fillStyle = '#C25B36'; x.fillText(testo, 256, 52);
    const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
    return (TELE[testo] = new T3.MeshStandardMaterial({ map: t, roughness: .9, side: T3.DoubleSide }));
  }
  // i pezzi come [geometria, materiale, matrice] nel sistema del cantiere
  const M4 = () => new T3.Matrix4(), E3 = (x, y, z) => new T3.Euler(x, y, z), V3 = (x, y, z) => new T3.Vector3(x, y, z);
  const comp = (px, py, pz, rx, ry, rz) => M4().compose(V3(px, py, pz), new T3.Quaternion().setFromEuler(E3(rx || 0, ry || 0, rz || 0)), V3(1, 1, 1));
  function pezzo(C, p, out, i) {
    const [k, lx, ly, rot, z, , ex] = p, base = comp(lx, z, ly, 0, -rot, 0), h = hashS(C.id + i), add = (g, m, M) => out.push([g, m, base.clone().multiply(M)]);
    switch (k) {
      case 'bancale': { const M = comp(0, .4, 0, -Math.PI / 2, 0, (h - .5) * .04); for (const [g, m, W] of bancale()) add(g, m, M.clone().multiply(W)); break; }
      case 'panca': { for (const [g, m, W] of bancale()) { add(g, m, W); add(g, m, comp(0, .144, 0, 0, .1, 0).multiply(W)); } break; }
      case 'copertone': for (let j = 0; j < 2; j++) add(cil(.32, .2), MT('gomma'), comp((h - .5) * .08 * j, .1 + j * .21, 0)); break;
      case 'porta': { const C0 = h < .5 ? 'porta' : 'portaO'; if (C.tipo === 'barricata') { add(box(2, .82, .045), MT(C0), comp(0, .41, 0, -.06, 0, (h - .5) * .05)); add(box(.5, .3, .05), MT('legnoS'), comp(.5, .42, -.01)); }
        else { add(box(.85, 2, .045), MT(C0), comp(0, 1, 0)); add(box(.06, .06, .04), MT('ruggine'), comp(.32, 1, .03)); } break; }
      case 'lamiera': { const hh = ex || .95, ww = C.tipo === 'barricata' ? 1.3 : 1.55; add(onda(ww, hh), MT(h < .4 ? 'ruggine' : 'lamiera'), comp(0, hh / 2, 0, -.03 * (h - .5), 0, (h - .5) * .06)); break; }
      case 'assi': add(box(1.7, .16, .03), MT('legnoS'), comp(0, .5, -.02, 0, 0, rot ? .5 : -.5)); add(box(1.5, .14, .03), MT('legno'), comp(.05, .55, -.05, 0, 0, rot ? -.45 : .45)); break;
      case 'trave': add(box(.12, ex || 2.2, .12), MT('trave'), comp(0, (ex || 2.2) / 2, 0, 0, 0, (h - .5) * .05)); break;
      case 'tetto': add(onda(1.62, 2.9), MT(h < .5 ? 'ruggine' : 'lamiera'), comp(0, .08, 0, -Math.PI / 2 + .12 * (lx < 0 ? 1 : 1), 0, 0)); break;
      case 'striscione': { const w = ex || 2.4; add(new T3.PlaneGeometry(w, .5), tela(C.tipo === 'barricata' ? 'VIA NOSTRA' : 'QUI CI STIAMO NOI'), comp(0, .25, 0, 0, 0, (h - .5) * .04)); break; }
    }
  }
  function mucchio(C, out) {   // il mucchio della tappa: due bancali, tre lamiere appoggiate, i copertoni (si assottiglia quando si prende)
    const m = C.mucchio; if (!m) return; const s = m.scorta;
    const lx = (m.x - C.x) * Math.cos(C.a) + (m.y - C.y) * Math.sin(C.a), ly = -(m.x - C.x) * Math.sin(C.a) + (m.y - C.y) * Math.cos(C.a);
    const base = comp(lx, 0, ly, 0, .4, 0);
    const nb = Math.min(4, Math.ceil((s.assi || 0) / 3)); for (let j = 0; j < nb; j++) for (const [g, mm, W] of bancale()) out.push([g, mm, base.clone().multiply(comp(0, j * .145, 0, 0, j * .3, 0)).multiply(W)]);
    for (let j = 0; j < Math.min(3, Math.ceil((s.lamiera || 0) / 3)); j++) out.push([onda(1.6, .9), MT(j % 2 ? 'ruggine' : 'lamiera'), base.clone().multiply(comp(-1, .44, -.4 + j * .12, -.35, 0, 0))]);
    for (let j = 0; j < Math.min(2, s.pneumatico || 0); j++) out.push([cil(.32, .2), MT('gomma'), base.clone().multiply(comp(1.1, .1 + j * .21, .2))]);
  }
  // unire: per materiale, una geometria sola (posizioni, normali, uv), senza indici
  function unisci(L) {
    const per = new Map();
    for (const [g, m, M] of L) { let a = per.get(m); if (!a) per.set(m, (a = [])); a.push([g, M]); }
    const out = [];
    for (const [m, A] of per) {
      let n = 0; const G0 = A.map(([g, M]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(M); n += q.attributes.position.count; return q; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UV = new Float32Array(n * 2); let o = 0;
      for (const q of G0) { const c = q.attributes.position.count; P.set(q.attributes.position.array, o * 3); if (q.attributes.normal) N.set(q.attributes.normal.array, o * 3); if (q.attributes.uv) UV.set(q.attributes.uv.array, o * 2); o += c; q.dispose(); }
      const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.BufferAttribute(P, 3)); g.setAttribute('normal', new T3.BufferAttribute(N, 3)); g.setAttribute('uv', new T3.BufferAttribute(UV, 2)); g.computeBoundingSphere();
      const me = new T3.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; out.push(me);
    }
    return out;
  }
  const VIS = UC.VIS = { grp: null, scene: null, st: null, per: {}, rifatti: 0 };
  function rifai(C, R) {
    const L = []; C.pezzi.forEach(([i]) => pezzo(C, C.piano[i], L, i)); if (C.fine === null) mucchio(C, L);
    const g = new T3.Group(); g.name = 'cantiere:' + C.id; for (const m of unisci(L)) g.add(m);
    g.position.set(C.x, R.groundH ? R.groundH(C.x, C.y) : 0, C.y); g.rotation.y = -C.a; g.userData.chiave = chiave(C); VIS.rifatti++;
    return g;
  }
  const chiave = C => C.pezzi.length + '|' + (C.mucchio ? Object.values(C.mucchio.scorta).join(',') : '') + '|' + (C.fine !== null ? 1 : 0);
  function sync() {
    const pv = window.__pv, R = pv && pv.R, st = pv && pv.st, scene = R && R.__models && R.__models.scene; if (!scene || !st || !st.u) return;
    if (VIS.scene !== scene) { VIS.scene = scene; VIS.grp = new T3.Group(); VIS.grp.name = 'costruire'; scene.add(VIS.grp); VIS.per = {}; }
    const via = id => { const g = VIS.per[id]; VIS.grp.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); delete VIS.per[id]; };
    if (VIS.st !== st) { for (const id in VIS.per) via(id); VIS.st = st; }   // la partita nuova (o caricata): si rifà tutto dai dati
    VIS.grp.visible = !(st.player && st.player.indoor);
    const s = st.u.costruire, vivi = new Set();
    for (const C of (s && s.cantieri) || []) {
      if (C.chiuso) continue; vivi.add(C.id);
      const g = VIS.per[C.id]; if (g && g.userData.chiave === chiave(C)) continue;
      if (g) via(C.id); VIS.grp.add(VIS.per[C.id] = rifai(C, R));
    }
    for (const id in VIS.per) if (!vivi.has(id)) via(id);
  }
  setInterval(() => { try { sync(); } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.costruire', e); } }, 400);
  UC.sync = sync;
  return UC;
})();
if (typeof window !== 'undefined') window.UnicoCostruire = UnicoCostruire;
