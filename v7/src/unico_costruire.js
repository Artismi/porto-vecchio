/* [unico] unico_costruire.js: COSTRUIRE IN CITTÀ (progetto: commedia/COSTRUIRE_IN_CITTA.md, commedia/MONDO_PIENO.md §8).
   Dietro ?commedia. Spento il flag: UnicoCostruire = { ON: false } e nient'altro (nessuna fase, nessun verbo, nessuna mesh).

   L'IDEA. Un gruppo (amici, gente messa insieme dal caso, o chi ha un rancore) decide di costruire qualcosa, con un motivo: una
   BARRICATA che chiude una via (lasciando sempre il varco), una BARACCA (il riparo), una RAMPA per saltare col mezzo, una CATAPULTA, un
   CARRETTO, una TORRE o un PALCO, un PONTE su un fosso, una ZATTERA. Si costruisce con le PARTI ELEMENTARI di unico_parti.js (asse,
   bancale, lamiera, trave, tubo, ruota, corda, molla, cassa, pneumatico, porta, telo, fusto): la ricetta del tipo le monta per arrivare
   alle misure chieste (con variazione), le REGOLE le tengono pulite (niente compenetrazioni, ogni parte poggia), il POSTO si sceglie
   libero e piano (fuori dalle case, dai mezzi, dalle porte, dalla roba di strada, col passaggio lasciato) e la FUNZIONE si misura dalla
   forma (la rampa ha la sua pendenza, il riparo la sua copertura, la catapulta la sua gittata): se la forma non la fa, il fatto lo dice.
   I pezzi si mettono uno per volta, dal basso, coi verbi del catalogo uguali per tutti: «raccatta» (il materiale, dal mucchio o da
   cantieri, cassonetti, porto), «barrica», «tira_su_baracca» e «monta» (il pezzo, con la posa del martello e l'onomatopea), «presidia»
   (finita: il gruppo ci sta e la USA: la rampa fa saltare un'auto, la catapulta tira, il carretto si spinge, la torre si sale).
   Il materiale si cerca con la procura della mente (Mente.estendi). Nessuna fase sceglie al posto della mente.
   I FATTI, ognuno col suo segno (bolla, Gazzetta, Si dice): «rivendica», «barrica»/«tira_su»/«monta» (un pezzo), «barricata», «baracca»,
   «rampa», «catapulta», ... (finita, con la misura), «presidia»; quelli dell'uso li scrive unico_parti_vivo.js (salto, schianto, lancio,
   crollo, affonda).
   LO STATO è puro, in st.u.costruire: { n, giorno, prese, cantieri: [{ id, tipo, via, rd, x, y, a, z0, w, lato, varco, F (l'impronta
   locale), piano: [[k, cx, cy, cz, yaw, pitch, roll, exL, exD]], misure, funziona, gruppo, motivo, t0, fid, pezzi: [[i, chi, t]], ass,
   fine, mucchio, stato (dell'uso: crollo, carico, ...) }] }: i pezzi sono DATI; le mesh e i corpi si rifanno dai dati (unico_parti_vivo.js).
   VINCOLI: al più CFG.max cantieri aperti, uno per zona (CFG.zona m), al più 40 parti l'uno.
   LA TAPPA: &cantiere[=barricata|baracca|rampa|catapulta|carretto|torre|palco|ponte|zattera] mette subito un cantiere vicino al giocatore,
   col gruppo dei quattro più vicini e un mucchio di materiale lì accanto; &pronto lo fa trovare finito. */
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
  let UP = typeof UnicoParti !== 'undefined' ? UnicoParti : null;
  if (!UP && typeof require === 'function') { try { UP = require('./unico_parti.js'); if (typeof global !== 'undefined') global.UnicoParti = UP; } catch (e) { UP = null; } }
  if (!G || !Un() || !MU() || !VB() || !FT() || !MU().estendi || !UP || !UP.ON) { UC.ON = false; return UC; }
  UC.UP = UP;
  const PARTI = UP.PARTI;
  const mt = /[?&]cantiere(?:=(\w+))?/.exec(Q);
  const tipoDi = t => { t = UP.ALIAS[t] || t; return UP.TIPI[t] ? t : null; };
  UC.TAPPA = mt ? tipoDi(mt[1]) || 'barricata' : null;
  UC.pronto = /[?&]pronto\b/.test(Q);
  const hyp = Math.hypot, r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const hashS = UP.hashS;
  const CFG = UC.CFG = { max: 3, zona: 45, maxPezzi: 40, varco: 1.8, ogni: 240, da: 8, a: 20, giorno: 1, prob: .45, raggioGruppo: 30, sorgenti: 220,
    min: { barrica: 6, tira_su_baracca: 8, monta: 7 }, lontanoOgni: 30, assegna: 90, presidio: 1440, base: 1.3, usoOgni: 90 };
  // la roba che serve per ogni parte (le cose del catalogo di oggetti.js)
  const robDi = k => (PARTI[k] ? PARTI[k].rob : 'assi');
  UC.MAT = Object.fromEntries(Object.keys(PARTI).map(k => [k, PARTI[k].rob]));
  const ROBE = new Set(Object.values(UC.MAT));
  // le sorgenti di recupero (G.PLACES), con quanto se ne trova in un giorno
  const SORGENTI = [['cantiere', { assi: 6, travi: 4, lamiera: 5, tubi: 3, casse: 2 }], ['calata', { assi: 4, lamiera: 2, pneumatico: 3, telo: 1, casse: 4, corda: 3, tanica_vuota: 3 }],
    ['discarica', { assi: 4, lamiera: 4, pneumatico: 4, telo: 1, travi: 2, tubi: 2, ricambi: 3, mobile_rotto: 3, tanica_vuota: 2 }],
    ['magazzino', { assi: 3, travi: 2, telo: 1, casse: 3, corda: 2 }], ['vico', { assi: 2, pneumatico: 1, mobile_rotto: 1, casse: 1 }], ['caruggio', { assi: 2, telo: 1, mobile_rotto: 1 }],
    ['molo', { assi: 2, pneumatico: 2, corda: 3, tanica_vuota: 2, casse: 2 }], ['officina', { pneumatico: 3, ricambi: 4, tubi: 2 }]];
  UC.SORGENTI = SORGENTI;
  const S = st => (st.u ? (st.u.costruire = st.u.costruire || { n: 0, giorno: -1, prese: {}, cantieri: [] }) : null);
  const giorno = st => Math.floor(st.t / 1440);
  const npc = (st, id) => (G.byId ? G.byId(st, id) : st.npcs.find(n => n.id === id));
  const stats = UC.stats = { cantieri: 0, pezzi: 0, lontano: 0, raccatta: 0, finiti: 0, senzaPosto: 0, usi: 0 };
  // il verbo del pezzo, la parola del tipo
  const VERBO = t => (t === 'barricata' ? 'barrica' : t === 'baracca' ? 'tira_su_baracca' : 'monta');
  const NOME = UC.NOME = { barricata: ['una barricata', 'barricata'], baracca: ['una baracca', 'baracca'], rampa: ['una rampa', 'rampa'], catapulta: ['una catapulta', 'catapulta'], carretto: ['un carretto', 'carretto'],
    torre: ['una torre', 'torre'], palco: ['un palco', 'palco'], ponte: ['un ponte', 'ponte'], zattera: ['una zattera', 'zattera'], presidio: ['un presidio', 'presidio'] };
  // [presidio] i pezzi dei fondatori (gli altri del piano li porta la comunità, unico_presidio.js); la vita del presidio: UC.vita
  const nBase = C => (C.meta && C.meta.base) || C.piano.length;
  UC.nBase = nBase; UC.vita = null;

  // ======================= IL CANTIERE NEL MONDO =======================
  const mondo = (C, lx, ly) => UP.aMondo(C, lx, ly);
  const locale = (C, x, y) => UP.daMondo(C, x, y);
  UC.mondo = mondo; UC.locale = locale;
  // il rettangolo del cantiere nel mondo (con un margine), per i corpi e per chi cerca posto
  const rettDi = (C, m) => UP.rettMondo(C, C.F, m || 0);
  UC.rettDi = rettDi;
  // un punto libero dove stare: fuori dall'impronta, sulle caselle a piedi, mai su un mezzo né dentro un altro cantiere
  function puntoLibero(st, C, x, y) {
    if (G.walkM && !G.walkM(x, y)) return false;
    const pt = { cx: x, cz: y, a: 0, hu: .2, hv: .2 };
    for (const D of S(st).cantieri) { if (D.chiuso || !D.F) continue;
      if (D.tipo !== 'presidio') { if (UP.sat2(rettDi(D, .35), pt)) return false; continue; }
      // il presidio non chiude: si sta fra le sue cose (fuori dalle parti, con 30 cm d'aria), non dentro
      if (!UP.sat2(rettDi(D, .35), pt)) continue;
      for (const [i] of D.pezzi) { const p = D.piano[i]; if (PARTI[p[0]].decoro) continue; const P = UP.pianta(p), w = mondo(D, P.cx, P.cy); if (UP.sat2({ cx: w.x, cz: w.y, a: D.a + Math.atan2(P.uy, P.ux), hu: P.hu + .3, hv: P.hv + .3 }, pt)) return false; } }
    for (const M of UP.mezzi(st, x, y, 6)) if (UP.sat2(M, { cx: x, cz: y, a: 0, hu: .45, hv: .45 })) return false;
    return true;
  }
  // dove sta chi mette il pezzo i: fuori dall'impronta, sul lato più vicino al pezzo (a 0,7 m), il primo libero
  function postoDi(C, i, st) {
    const p = C.piano[i], F = C.F, lx = p[1], ly = p[2], m = .75, cl = (v, a, b) => Math.max(a, Math.min(b, v));
    const L = [[F[0] - m, cl(ly, F[1] + .2, F[3] - .2), lx - F[0]], [F[2] + m, cl(ly, F[1] + .2, F[3] - .2), F[2] - lx], [cl(lx, F[0] + .2, F[2] - .2), F[1] - m, ly - F[1]], [cl(lx, F[0] + .2, F[2] - .2), F[3] + m, F[3] - ly]];
    if (C.tipo === 'barricata') L[2][2] -= 1.5;   // la barricata si monta dal davanti
    L.sort((a, b) => a[2] - b[2]);
    st = st || (Un() && Un().st);
    for (const q of L) { const w = mondo(C, q[0], q[1]); if (!st || puntoLibero(st, C, w.x, w.y)) return { x: r2(w.x), y: r2(w.y) }; }
    for (let k = 1; k <= 3; k++) for (const q of L) { const w = mondo(C, q[0] + Math.sign(q[0]) * k * .6, q[1] + Math.sign(q[1]) * k * .6); if (!st || puntoLibero(st, C, w.x, w.y)) return { x: r2(w.x), y: r2(w.y) }; }
    const w = mondo(C, L[0][0], L[0][1]); return { x: r2(w.x), y: r2(w.y) };
  }
  // i pezzi nel mondo (per le prove e per chi guarda): [k, x, y, yaw nel mondo, quota del centro, exL]
  function pezziMondo(C) { return C.pezzi.map(([i]) => { const p = C.piano[i], q = mondo(C, p[1], p[2]); return [p[0], r2(q.x), r2(q.y), r2(C.a + p[4]), r2((C.z0 || 0) + p[3]), p[7]]; }); }
  UC.pezziMondo = pezziMondo; UC.postoDi = postoDi;
  // il varco della barricata: il segmento di via libero (nessun pezzo ci entra)
  function varcoDi(C) { if (C.tipo !== 'barricata' || !C.varco) return null; const [a, b] = C.varco, s = Math.sign(b - a) || 1; return [mondo(C, a + .02 * s, 0), mondo(C, b - .1 * s, 0)]; }
  UC.varcoDi = varcoDi;

  // ======================= LE VIE =======================
  const vie = () => ((G.MAP && G.MAP.roads) || []).filter(r => r && r.pts && r.pts.length > 1 && (r.kind === 'citta' || r.kind === 'vicolo'));
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
  const libera = (st, x, y, salta) => !S(st).cantieri.some(C => C !== salta && !C.chiuso && hyp(C.x - x, C.y - y) < CFG.zona);

  // ======================= IL GRUPPO E IL PROGETTO =======================
  const MENTE = (st, id) => (st.u && st.u.menti ? st.u.menti[id] : null);
  const candidato = (st, n) => !!(n && !n.inside && !n.dead && MU()._.candidato(st, n) && !(n.jailedUntil > st.t) && !occupato(st, n.id));
  const occupato = (st, id) => S(st).cantieri.some(C => !C.chiuso && C.gruppo.includes(id));
  function motivoDi(st, ids) {
    let ranc = 0, aff = 0, k = 0;
    for (const a of ids) { const M = MENTE(st, a); if (!M) continue; for (const b in M.rel) { const r = M.rel[b]; if (!r) continue; if (ids.includes(b)) { aff += r[1] || 0; k++; } if ((r[3] || 0) > ranc) ranc = r[3] || 0; } }
    return ranc > .45 ? 'rancore' : k && aff / k > .15 ? 'amici' : 'caso';
  }
  function gruppoDi(st, capo, quanti, raggio) {
    const M = MENTE(st, capo.id), L = [];
    for (const n of st.npcs) { if (n === capo || !candidato(st, n)) continue; const d = hyp(n.x - capo.x, n.y - capo.y); if (d > raggio) continue; const r = M && M.rel[n.id]; L.push([d - (r ? (r[1] || 0) * 40 : 0) + hashS(n.id + capo.id) * 3, n.id]); }
    L.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1));
    return [capo.id].concat(L.slice(0, quanti - 1).map(x => x[1]));
  }
  // chi è un po' matto sbaglia la forma (la rampa troppo ripida, la leva corta, la zattera di lamiera): i fallimenti sono veri
  function folleDi(st, ids) { let f = 0; for (const id of ids) { const n = npc(st, id), tr = n && n.tr; if (tr && typeof tr.follia === 'number') f = Math.max(f, tr.follia); } return f; }
  // le misure da tenere nel cantiere (dati piccoli)
  function misureCorte(M) {
    const o = { altezza: M.altezza, passa: M.passa, piano: M.piano, copre: M.copre, luce: M.luce, galleggia: M.galleggia, kg: M.kg, portata: M.portata, chiude: M.chiude, stabile: { ok: M.stabile.ok, margine: M.stabile.margine } };
    if (M.rampa) { const R = Object.assign({}, M.rampa); delete R.parti; o.rampa = R; }
    if (M.rotola && M.rotola.ruote) o.rotola = M.rotola;
    if (M.lancio) o.lancio = M.lancio;
    return JSON.parse(JSON.stringify(o));
  }
  UC.misureCorte = misureCorte;
  // il progetto: tipo, posto, piano. o: { tipo, x, y, gruppo, motivo, mucchio, pronto, altezza, mezzo, folle }
  function apri(st, o) {
    const s = S(st); if (!s || s.cantieri.filter(C => !C.chiuso).length >= CFG.max) return null;
    const tipo = tipoDi(o.tipo) || 'barricata', id = 'c' + (s.n + 1);
    if (!libera(st, o.x, o.y)) return null;   // uno per zona: dove ce n'è già uno non se ne apre un altro
    const altri = s.cantieri.filter(C => !C.chiuso && C.F).map(C => rettDi(C, 1.5));
    const folle = o.folle !== undefined ? !!o.folle : hashS(id + st.u.seme + 'f') < folleDi(st, o.gruppo || []) * .35;
    const base = { x: o.x, y: o.y, seme: st.u.seme + '|' + id, altri, folle, altezza: o.altezza, mezzo: o.mezzo || (tipo === 'rampa' ? 'auto' : null), lato: hashS(id + st.u.seme) < .5 ? 1 : -1, R: o.R || 90, vieta: Sx => (libera(st, Sx.x, Sx.y) ? '' : 'zona'), verso: o.verso || null };
    let R = null;
    if (tipo === 'baracca' && o.corso !== false) R = UP.sito(st, tipo, Object.assign({}, base, { corso: true })) || UP.sito(st, tipo, base);
    else R = UP.sito(st, tipo, base);
    if (R && !libera(st, R.S.x, R.S.y)) R = null;
    if (!R) { stats.senzaPosto++; UC.ultimoNo = UP.ultimoNo; return null; }
    s.n++;
    const Sx = R.S, P = R.prog, F = UP.impronta(P.parti).map(r2);
    const C = { id, tipo, via: Sx.via, rd: Sx.rd, x: Sx.x, y: Sx.y, a: Sx.a, z0: Sx.z0, w: Sx.w || 0, lato: Sx.lato || 1, varco: Sx.varco || null, F,
      piano: P.parti.slice(0, CFG.maxPezzi), meta: JSON.parse(JSON.stringify(P.meta || {})), misure: misureCorte(P.misure), funziona: { ok: P.funziona.ok, perche: P.funziona.perche }, folle: !!folle };
    Object.assign(C, { gruppo: (o.gruppo || []).slice(0, 5), motivo: o.motivo || motivoDi(st, o.gruppo || []), t0: r1(st.t), fid: null, pezzi: [], ass: {}, fine: null, chiuso: false, mucchio: null, stato: {} });
    if (o.mucchio) {
      const sc = {}; for (const p of C.piano.slice(0, nBase(C))) { const g = robDi(p[0]); sc[g] = (sc[g] || 0) + 1; } for (const g in o.mucchio) sc[g] = Math.max(sc[g] || 0, o.mucchio[g]);
      for (const g in sc) sc[g] += 1;
      const q = luogoMucchio(st, C); C.mucchio = { x: r2(q.x), y: r2(q.y), scorta: sc };
    }
    s.cantieri.push(C); stats.cantieri++;
    C.fid = scrivi(st, 'rivendica', C, { motivo: C.motivo, cosa: NOME[tipo][0] });
    for (const m of C.gruppo) { const Mn = MU()._.menteDi(st, npc(st, m), true); if (Mn) { Mn.prossima = Math.min(Mn.prossima, st.t + 1); if (Mn.ob && Mn.ob.g !== 'rivendicare') { Mn.ob = null; Mn.piano = null; } } }
    if (o.pronto) { for (let i = 0; i < nBase(C); i++) C.pezzi.push([i, C.gruppo[i % Math.max(1, C.gruppo.length)] || null, r1(st.t)]); finisci(st, C); }
    return C;
  }
  // il mucchio: accanto, fuori dall'impronta, sul lato libero (di fianco alla barricata, verso il davanti per gli altri)
  function luogoMucchio(st, C) {
    const F = C.F, L = C.tipo === 'presidio' ? [[F[0] + .9, F[1] - 1.8], [F[2] - .9, F[1] - 1.8], [F[0] + .9, F[3] + 1.8], [F[2] - .9, F[3] + 1.8]] : C.tipo === 'barricata' ? [[(F[0] + F[2]) / 2 - C.lato * 1, F[1] - 3.2], [F[0] - 2, F[1] - 1.5], [F[2] + 2, F[1] - 1.5]] : [[F[0] - 2.2, (F[1] + F[3]) / 2], [F[2] + 2.2, (F[1] + F[3]) / 2], [(F[0] + F[2]) / 2, F[1] - 2.2], [(F[0] + F[2]) / 2, F[3] + 2.2]];
    for (const q of L) { const w = mondo(C, q[0], q[1]); if (puntoLibero(st, C, w.x, w.y) && puntoLibero(st, C, w.x + .8, w.y + .8) && puntoLibero(st, C, w.x - .8, w.y - .8)) return w; }
    return mondo(C, L[0][0], L[0][1]);
  }
  function scrivi(st, tipo, C, extra) {
    const F = FT(); const dati = Object.assign({ via: C.via, tipo: C.tipo, cantiere: C.id, x: C.x, y: C.y }, extra || {});
    let r = null; try { r = F.scrivi(tipo, C.gruppo.slice(), dati, C.fid || null, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) return r.id;
    const f = F._ && F._.registra ? F._.registra(st, { t: st.t, v: tipo, chi: C.gruppo.slice(), causa: C.fid || null, peso: 1, hop: 0 }, dati, 'unico') : null;
    return f ? f.id : null;
  }
  UC.scrivi = scrivi;
  // finita: il fatto col nome del tipo e la misura (è una rampa: 18°; copre 4 m²; tira a 7 m) o il perché non funziona
  function finisci(st, C) {
    if (C.fine !== null) return; C.fine = r1(st.t); C.ass = {}; stats.finiti++;
    const M = C.misure, mis = C.tipo === 'rampa' && M.rampa ? Math.round(M.rampa.ang) + '°, alta ' + r1(M.rampa.h) + ' m' : C.tipo === 'baracca' ? 'copre ' + r1(M.copre) + ' m²' : C.tipo === 'catapulta' && M.lancio ? 'tira a ' + Math.round(Math.abs(M.lancio.gittata)) + ' m' : C.tipo === 'torre' || C.tipo === 'palco' ? 'alta ' + r1(M.piano) + ' m' : C.tipo === 'zattera' ? 'porta ' + Math.round(M.galleggia) + ' kg' : C.tipo === 'ponte' ? 'luce ' + r1(M.luce) + ' m' : C.tipo === 'presidio' ? 'in mezzo passano ' + r1(M.passa) + ' m' : '';
    C.fidFine = scrivi(st, C.tipo, C, { pezzi: C.pezzi.length, misura: mis, funziona: C.funziona.ok ? 1 : 0, perche: C.funziona.perche || '' });
    if (UC.alFine) try { UC.alFine(st, C); } catch (e) { }
  }
  UC.apri = apri;
  // [idee] LA STRUTTURA CHIESTA PER EFFETTO: UC.richiedi(st, { effetto, altezza, x, y, gruppo: [id], motivo }) → cantiere | null.
  // Ogni effetto ha il suo tipo (UC.STRUTTURE[effetto]); il cantiere porta req.effetto in C.effetto (UC.perEffetto lo ritrova).
  UC.STRUTTURE = UC.STRUTTURE || {};
  const EFF_TIPO = UC.EFF_TIPO = { rampa: 'rampa', stare_in_aria: 'rampa', sbarramento: 'barricata', barricata: 'barricata', torre: 'torre', essere_in_alto: 'torre', riparo: 'baracca', baracca: 'baracca',
    palco: 'palco', presidio: 'presidio', via_nostra: 'presidio', catapulta: 'catapulta', lancio: 'catapulta', carretto: 'carretto', trasporto: 'carretto', ponte: 'ponte', attraversare: 'ponte', zattera: 'zattera', galleggiare: 'zattera' };
  for (const e in EFF_TIPO) if (!UC.STRUTTURE[e]) UC.STRUTTURE[e] = (st, req) => apri(st, { tipo: EFF_TIPO[e], x: req.x, y: req.y, gruppo: req.gruppo, motivo: req.motivo || e, altezza: req.altezza, R: 120 });
  UC.richiedi = (st, req) => {
    if (!req || !req.gruppo || !req.gruppo.length) return null;
    const f = UC.STRUTTURE[req.effetto]; let C = null;
    if (f) { try { C = f(st, req); } catch (e) { C = null; } }
    if (C) { C.effetto = req.effetto; if (req.altezza) C.altezza = req.altezza; }
    return C;
  };
  UC.perEffetto = (st, id, eff) => { const s = st.u && st.u.costruire; if (!s) return null; for (const C of s.cantieri) if (!C.chiuso && C.effetto === eff && C.gruppo.includes(id)) return C; return null; };

  // ======================= LA MENTE: la fonte, l'obiettivo, il metodo, il modo di procurare =======================
  const cantiereDi = (st, id) => { const s = st.u && st.u.costruire; if (!s) return null; for (const C of s.cantieri) if (!C.chiuso && C.gruppo.includes(id)) return C; return null; };
  const lontanoC = c => c.lod === 'lontano' || c.lod === 'dormiente';
  // il prossimo pezzo libero (non messo, non assegnato a un altro): in ordine di piano (prima la base: il piano è già ordinato dal basso),
  // e solo se quello che lo regge è già messo (un pezzo non si posa in aria)
  function prossimo(st, C, id) {
    const messi = new Set(C.pezzi.map(p => p[0]));
    for (const k in C.ass) if (C.ass[k][1] <= st.t || messi.has(+k)) delete C.ass[k];
    for (const k in C.ass) if (C.ass[k][0] === id) return +k;
    for (let i = 0; i < nBase(C); i++) if (!messi.has(i) && !C.ass[i] && sorretto(C, i, messi)) return i;
    return -1;
  }
  // regge: a terra, o tocca un pezzo già messo che parte più in basso (lo striscione: un pezzo qualunque già messo)
  function sorretto(C, i, messi) {
    const O = UP.obb(C.piano[i]), z = UP.zMin(O); if (z <= .015) return true;
    for (const j of messi) { const B = UP.obb(C.piano[j]); if ((UP.zMin(B) <= z + .05 || PARTI[O.k].decoro) && UP.pen3(O, B, .0125) > 0) return true; }
    return false;
  }
  UC.sorretto = sorretto;
  const FONTE = c => { const C = cantiereDi(c.st, c.n.id); if (UC.vita && (!C || (C.tipo === 'presidio' && C.fine !== null))) return UC.vita.fonte(c, C); if (!C) return 0; if (C.fine === null) return 1; return c.st.t - C.fine < CFG.presidio ? .55 : 0; };
  // dove si sta di guardia: attorno all'impronta, fuori, sparsi per hash
  function postoPresidio(st, C, id) {
    if (C.tipo === 'presidio' && UC.vita) return UC.vita.posto(st, C, id);
    const F = C.F, h = hashS(id + C.id), lato = Math.floor(h * 4), u = hashS(id + 'u'), m = 1.1 + hashS(id + 'm') * .8;
    const L = [[F[0] + (F[2] - F[0]) * u, F[1] - m], [F[2] + m, F[1] + (F[3] - F[1]) * u], [F[0] + (F[2] - F[0]) * u, F[3] + m], [F[0] - m, F[1] + (F[3] - F[1]) * u]];
    if (C.tipo === 'barricata') { L.unshift([F[0] + (F[2] - F[0]) * u * .6, F[3] + m]); }
    for (let k = 0; k < L.length; k++) { const q = L[(lato + k) % L.length], w = mondo(C, q[0], q[1]); if (puntoLibero(st, C, w.x, w.y)) return w; }
    return mondo(C, L[0][0], L[0][1]);
  }
  UC.postoPresidio = postoPresidio;
  function metodo(c) {
    const st = c.st, C = cantiereDi(st, c.n.id);
    if (UC.vita && (!C || (C.tipo === 'presidio' && C.fine !== null))) return UC.vita.metodo(c, C);
    if (!C || lontanoC(c)) return null;
    if (C.fine !== null) {   // finita: ci si sta (e la si usa)
      const q = postoPresidio(st, C, c.n.id);
      return { passi: [['vai', { x: r1(q.x), y: r1(q.y) }], ['presidia', { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .3, perche: C.fidFine || C.fid };
    }
    const i = prossimo(st, C, c.n.id); if (i < 0) return null;
    C.ass[i] = [c.n.id, r1(st.t + CFG.assegna)];
    const p = C.piano[i], q = postoDi(C, i, st), v = VERBO(C.tipo);
    return { passi: [['@procura', { cosa: robDi(p[0]), q: 1 }], ['vai', { x: r1(q.x), y: r1(q.y) }], [v, { c: C.id, i, rec: C.id + '#' + i, x: r1(q.x), y: r1(q.y) }]], costo: .2, perche: C.fid };
  }
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
    if (!ROBE.has(g)) return null;
    const C = cantiereDi(c.st, c.n.id); if (!C || C.fine !== null) return null;
    const k = sorgente(c.st, c.A, C, g, q); if (!k) return null; const P = posDi(c.st, k);
    const d = {}; calcRec(c.st, c.A, { da: k }, d);
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
    c_libero: (c, k, i) => { const C = Cdi(c, k), n = +val(i, c); if (!C || !C.piano[n]) return 'Questo pezzo non c\'è.'; if (C.fine !== null) return 'È già finita.'; if (C.pezzi.some(p => p[0] === n)) return 'Questo pezzo l\'ha già messo qualcuno.'; return sorretto(C, n, new Set(C.pezzi.map(p => p[0]))) ? '' : 'Prima va messo quello sotto.'; },
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
      if (UC.allaPosa) try { UC.allaPosa(st, C, n, c.A.id); } catch (e) { }
      if (C.pezzi.length >= nBase(C)) finisci(st, C);
    },
    // l'uso: chi presidia una cosa finita la usa (la rampa: un salto; la catapulta: un tiro; la torre: ci sale; il carretto: lo spinge)
    c_usa: (c, k) => { const st = c.st, C = Cdi(c, k); if (!C || C.fine === null || C.chiuso) return; if (st.t - (C.stato.uso || -1e9) < CFG.usoOgni) return; C.stato.uso = r1(st.t); stats.usi++; if (UC.usa) try { UC.usa(st, C, c.A.id, c.a.lontano); } catch (e) { } },
  });
  const calcPezzo = (st, A, a, d) => { const s = st.u && st.u.costruire, C = s && s.cantieri.find(x => x.id === a.c), p = C && C.piano[+a.i]; d.mat = p ? robDi(p[0]) : 'assi'; d.cosa = d.mat; d.parte = p ? p[0] : 'asse'; d.min = CFG.min[C ? VERBO(C.tipo) : 'barrica']; if (p) { const q = postoDi(C, +a.i, st); d.x = r1(q.x); d.y = r1(q.y); d.via = C.via; d.cosaC = NOME[C.tipo][1]; } };
  const calcRec = (st, A, a, d) => {   // dove si sta per prendere: dal mucchio, sul lato verso il cantiere; da una sorgente, attorno
    const P = posDi(st, a.da); if (!P) return;
    if (/^mucchio:/.test(a.da)) { const C = S(st).cantieri.find(x => x.id === a.da.slice(8)), L = C ? hyp(C.x - P.x, C.y - P.y) || 1 : 1, u = (hashS(A.id) - .5) * .8; if (C) { d.x = r1(P.x + (C.x - P.x) / L * 1.1 - (C.y - P.y) / L * u); d.y = r1(P.y + (C.y - P.y) / L * 1.1 + (C.x - P.x) / L * u); return; } }
    const ang = hashS(A.id + a.da) * Math.PI * 2; d.x = r1(P.x + Math.cos(ang) * 3); d.y = r1(P.y + Math.sin(ang) * 3);
  };
  const PEZZO = (bolla, parole, fatto) => ({ fam: 'manipola', args: { c: 'cantiere', i: 'n', x: 'n', y: 'n' },
    pre: [['vivo'], ['c_aperto', '$c'], ['c_membro', '$c'], ['c_libero', '$c', '$i'], ['ha', '$mat', 1], ['c_vicino', '$c', '$i']],
    eff: [['-borsa', '$mat', 1], ['c_posa', '$c', '$i']], costo: { min: '$min', fatica: .07 }, dove: ['posto', '$x', '$y'], prenota: [['cpezzo:$c:$i', 1, 1]],
    posa: 'martella', oggetto: '$mat', segno: { bolla: [bolla, parole], cambia: 'cantiere' }, fatto, menu: false });
  V.registra('raccatta', { fam: 'manipola', args: { cosa: 'roba', q: 'n?', da: 'sorgente' }, pre: [['vivo'], ['recupero', '$da', '$cosa', '$q'], ['rec_vicino', '$da'], ['porta', '$cosa', '$q']],
    eff: [['+borsa', '$cosa', '$q'], ['-recupero', '$da', '$cosa', '$q']], costo: { min: 4, fatica: .02 }, dove: ['posto', '$x', '$y'], prenota: [['recupero:$da:$cosa', '$q', '$scorta']],
    posa: 'raccoglie', oggetto: '$cosa', segno: { bolla: ['mano', '$cosa'] }, fatto: 'raccatta', menu: false }, null, (st, A, a, d) => { calcRec(st, A, a, d); d.scorta = scorta(st, a.da, a.cosa); d.base = 1; });   // d.base: il pezzo si porta in braccio, non nella borsa (una trave pesa 20 kg)
  V.registra('barrica', PEZZO('barricata', 'via nostra', 'barrica'), null, calcPezzo);
  V.registra('tira_su_baracca', PEZZO('baracca', 'casa nostra', 'tira_su'), null, calcPezzo);
  V.registra('monta', PEZZO('costruisce', '$cosaC', 'monta'), null, calcPezzo);
  V.registra('presidia', { fam: 'sociale', args: { c: 'cantiere', x: 'n', y: 'n' }, pre: [['vivo'], ['c_aperto', '$c'], ['c_membro', '$c'], ['c_finita', '$c']], eff: [['c_usa', '$c']], costo: { min: 40 },
    dove: ['posto', '$x', '$y'], posa: 'discute', segno: { bolla: ['casetta', 'è nostra'] }, fatto: 'presidia', menu: false }, null, (st, A, a, d) => { const s = st.u && st.u.costruire, C = s && s.cantieri.find(x => x.id === a.c); if (C) d.via = C.via; });

  // ======================= I SEGNI (i tipi dei fatti, per la bolla, la Gazzetta, la Cronaca, il Si dice) =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    raccatta: { p: 'mano', w: '$cosa', posa: 'raccoglie', gz: 0, n: ['cosa raccattata', 'cose raccattate'] },
    rivendica: { p: 'esclamativo', w: 'è nostra', posa: 'discute', gz: .5, n: ['posto rivendicato', 'posti rivendicati'],
      r: ['{A}[, {B}] e gli altri hanno deciso: in {via} tirano su {cosa}.', 'In {via} {A}[ e {B}] si sono messi in testa di costruire {cosa}.', '«Qui ci facciamo {cosa}»: {A}[, {B}] e compagnia, in {via}.'] },
    barrica: { p: 'barricata', w: 'via nostra', posa: 'martella', gz: .15, n: ['pezzo di barricata', 'pezzi di barricata'], r: ['{A} ha messo {cosaI} sulla barricata[ in {via}].'] },
    tira_su: { p: 'baracca', w: 'casa nostra', posa: 'martella', gz: .15, n: ['pezzo di baracca', 'pezzi di baracca'], r: ['{A} ha inchiodato {cosaI} alla baracca[ in {via}].'] },
    monta: { p: 'costruisce', w: 'si monta', posa: 'martella', gz: .1, n: ['pezzo montato', 'pezzi montati'], r: ['{A} ha montato {cosaI}[ in {via}].'] },
    barricata: { p: 'barricata', w: 'via nostra', posa: 'discute', gz: .95, n: ['barricata', 'barricate'],
      r: ['Barricata in {via}: l\'hanno tirata su {A}[, {B}] e gli altri.', '{via} chiusa con bancali, porte e lamiere (resta un varco): è opera di {A}[ e {B}].', 'In {via} si passa a fatica: {A}[, {B}] e compagnia hanno fatto la barricata.'] },
    baracca: { p: 'baracca', w: 'casa nostra', posa: 'discute', gz: .95, n: ['baracca', 'baracche'],
      r: ['Una baracca in {via} ({misura}): ci stanno {A}[, {B}] e gli altri.', 'In {via} è spuntata una baracca di lamiera: è di {A}[ e {B}].', 'Lamiera, travi e una porta vecchia: {A}[ e {B}] si sono fatti casa in {via}.'] },
    rampa: { p: 'costruisce', w: 'si vola', posa: 'discute', gz: .85, n: ['rampa', 'rampe'], r: ['Una rampa in {via} ({misura}): l\'hanno fatta {A}[, {B}] e gli altri, per saltarci col mezzo.', 'In {via} {A}[ e {B}] hanno messo su una rampa di porte vecchie: {misura}.'] },
    catapulta: { p: 'costruisce', w: 'si tira', posa: 'discute', gz: .85, n: ['catapulta', 'catapulte'], r: ['Una catapulta in {via}: {A}[, {B}] e compagnia giurano che {misura}.', 'In {via} c\'è una catapulta di travi e camere d\'aria ({misura}): opera di {A}[ e {B}].'] },
    carretto: { p: 'costruisce', w: 'si spinge', posa: 'discute', gz: .5, n: ['carretto', 'carretti'], r: ['{A}[ e {B}] si sono fatti un carretto con un bancale e quattro ruote, in {via}.'] },
    torre: { p: 'costruisce', w: 'si sale', posa: 'discute', gz: .8, n: ['torre', 'torri'], r: ['Una torre di pali e bancali in {via} ({misura}): l\'hanno tirata su {A}[, {B}] e gli altri.'] },
    palco: { p: 'costruisce', w: 'si sale', posa: 'discute', gz: .6, n: ['palco', 'palchi'], r: ['Un palco di bancali in {via}: {A}[ e {B}] dicono che ci si suona.'] },
    ponte: { p: 'costruisce', w: 'si passa', posa: 'discute', gz: .7, n: ['ponte', 'ponti'], r: ['Un ponte di fortuna a {via} ({misura}): l\'hanno fatto {A}[, {B}] e gli altri.'] },
    zattera: { p: 'costruisce', w: 'si galleggia', posa: 'discute', gz: .7, n: ['zattera', 'zattere'], r: ['Una zattera di fusti a {via} ({misura}): è di {A}[ e {B}].'] },
    presidia: { p: 'casetta', w: 'è nostra', posa: 'discute', gz: 0, n: ['turno di guardia', 'turni di guardia'], bolla: false },
  });
  const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { rivendica: .55, barricata: .8, baracca: .75, barrica: .3, tira_su: .3, monta: .25, rampa: .6, catapulta: .6, torre: .55, carretto: .35, palco: .4, ponte: .5, zattera: .5 });

  // ======================= LA FASE: il gruppo che decide, il lontano, la tappa =======================
  const TIPI_NATURALI = ['baracca', 'barricata', 'presidio', 'baracca', 'presidio', 'rampa', 'catapulta', 'torre', 'carretto', 'palco'];
  function nuovoCantiere(st) {
    const s = S(st), d = giorno(st), h = (st.t % 1440) / 60;
    if (s.giorno === d || d < CFG.giorno || h < CFG.da || h >= CFG.a || s.cantieri.filter(C => !C.chiuso).length >= CFG.max) return null;
    s.giorno = d;
    if (hashS(st.u.seme + '|giorno|' + d) > CFG.prob) return null;
    const L = st.npcs.filter(n => candidato(st, n) && n.pop).map(n => [hashS(st.u.seme + '|' + d + '|' + n.id), n]).sort((a, b) => a[0] - b[0]);
    for (const [, capo] of L.slice(0, 12)) {
      const gr = gruppoDi(st, capo, 3 + Math.floor(hashS(capo.id + d) * 2), CFG.raggioGruppo); if (gr.length < 3) continue;
      const tipo = TIPI_NATURALI[Math.floor(hashS(capo.id + '|tipo|' + d) * TIPI_NATURALI.length)];
      const C = apri(st, { tipo, x: capo.x, y: capo.y, gruppo: gr }); if (C) return C;
    }
    return null;
  }
  // chi è lontano costruisce lo stesso, dai dati (strategia C, la stessa porta): un pezzo ogni CFG.lontanoOgni minuti
  function lontano(st) {
    for (const C of S(st).cantieri) {
      if (C.chiuso || C.fine !== null) continue;
      const vic = C.gruppo.some(id => { const n = npc(st, id); return n && n.pop && n.pop.near; }); if (vic) continue;
      if (st.t - (C.tl || C.t0) < CFG.lontanoOgni) continue; C.tl = r1(st.t);
      const id = C.gruppo[C.pezzi.length % C.gruppo.length], n = npc(st, id); if (!n || n.dead) continue;
      const i = prossimo(st, C, id); if (i < 0) continue; const g = robDi(C.piano[i][0]);
      const A = typeof Attore !== 'undefined' ? Attore.di(st, n) : null; if (!A) continue;
      if (A.borsa.get(g) < 1) { const k = sorgente(st, A, C, g, 1) || SORGENTI.map(x => x[0]).find(k2 => scorta(st, k2, g) >= 1); if (!k) continue; V.applica(st, n, 'raccatta', { cosa: g, q: 1, da: k, lontano: 1 }, { lod: 'lontano' }); }
      const r = V.applica(st, n, VERBO(C.tipo), { c: C.id, i, lontano: 1 }, { lod: 'lontano' });
      if (r && r.ok) stats.lontano++;
    }
  }
  // la tappa (&cantiere): vicino al giocatore, coi quattro più vicini portati lì e il mucchio accanto
  function tappa(st, o) {
    const p = st.player; if (!p || p.indoor) return null; o = o || {};
    const L = st.npcs.filter(n => candidato(st, n) && n.pop).map(n => [hyp(n.x - p.x, n.y - p.y) + hashS(n.id) * 2, n]).sort((a, b) => a[0] - b[0]).slice(0, 4).map(x => x[1]);
    if (L.length < 3) return null;
    const C = apri(st, Object.assign({ tipo: UC.TAPPA, x: p.x, y: p.y, gruppo: L.map(n => n.id), mucchio: { assi: 2, lamiera: 2, travi: 1, pneumatico: 1, telo: 1 }, pronto: UC.pronto }, o));
    if (!C) return null;
    L.forEach((n, i) => { const q = C.fine !== null ? postoPresidio(st, C, n.id) : postoDi(C, Math.min(C.piano.length - 1, i * 2), st);
      n.x = q.x + (i % 2 ? .3 : -.3); n.y = q.y; if (n.pop) { n.pop.path = []; } n.vx = n.vy = 0; n.face = Math.atan2(C.y - n.y, C.x - n.x); });
    return C;
  }
  function fase(st) {
    if (!st.u || !st.npcs) return;
    const s = S(st), P = Un().passi;
    if (UC.TAPPA && !s.tappa && P > 40) { const C = tappa(st); if (C) s.tappa = C.id; else if (P > 4000) s.tappa = 'no'; }
    if (P % CFG.ogni === 0) { if (!UC.TAPPA) nuovoCantiere(st); lontano(st); }
  }
  Un().fase('unico.costruire', { dopo: 'unico.mente', budget: { p95: .02 } }, fase);
  Object.assign(UC, { S, apri, fase, tappa, lontano, nuovoCantiere, scorta, sorgente, prossimo, viaVicina, cantiereDi, FONTE, robDi, finisci, tipoDi, puntoLibero });
  Un().Costruire = UC;
  return UC;
})();
if (typeof window !== 'undefined') window.UnicoCostruire = UnicoCostruire;
