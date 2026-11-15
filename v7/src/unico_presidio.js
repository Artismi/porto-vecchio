/* [unico] unico_presidio.js: IL PRESIDIO, LA VIA NOSTRA VISSUTA (dietro ?commedia). Spento il flag: UnicoPresidio = { ON: false }.
   Sopra unico_parti.js (la ricetta «presidio»: due pali nei copertoni ai bordi, la scritta alta sopra la via, la roba bassa solo ai lati,
   in mezzo almeno 3 m liberi, misurati: M.passa), unico_costruire.js (i fondatori la tirano su coi verbi di sempre) e unico_parti_vivo.js
   (i corpi, il disegno). Qui la VITA: il presidio non è un muro con uno di guardia dietro, è una strada normale vissuta in un altro modo.
   - CHI VIENE. Ogni CFG.ogni passi, per ogni presidio finito: quanti ci stanno adesso (l'obiettivo) cresce con le ore dalla nascita
     (3 → CFG.max), si ammoscia di notte, cala dopo che passano i Grigi, sale con la pressione delle idee nel quartiere e con la
     solidarietà dopo che ha resistito. Se mancano persone arrivano (al più 2 per volta): prima i fondatori, poi i VICINI (chi abita
     a meno di CFG.vicino m), dopo le prime ore anche i SIMPATIZZANTI (l'affetto per un fondatore nella mente, lo stesso gruppo,
     l'idea contro i Grigi); mai chi è al lavoro, in prigione, i Grigi. Se ce ne sono troppi, se ne va chi ha finito il turno.
     Lo stato: C.vive = { id: [attività, t0, fino, 'f'|'v'|'s', pezzo o sedia] }, solo dati (si salva con st.u.costruire).
   - CHE COSA FANNO (la mente li porta lì: la fonte «rivendica» di unico_costruire.js dà 1 a chi è di turno, il metodo li manda al posto
     dell'attività col suo verbo): «porta» (una sedia, il tavolo, un vaso: il pezzo della comunità si aggiunge al presidio), «siede»
     (sulla sedia), «carte» (al tavolo), «chiacchiera», «gioca» (i più giovani, due tiri ai bordi), «cucina» (al fusto o alla cassa),
     «dipinge» (la strada: segni di colore sull'asfalto in mezzo). Chi è lontano dal giocatore: gli stessi verbi, dai dati.
   - LE AUTO passano: rallentano (2,4 m/s, il traffico col gancio corsa), si mettono in mezzo; ogni tanto chi guida dice la sua
     (un fumetto normale, rado: sbuffa o fa il tifo); nessuna inversione.
   - LA STRADA CHIUSA (a tappe): all'inizio la carreggiata è aperta; quando il presidio è cresciuto (CFG.chiude: tante persone e più di
     un giorno) o dopo la multa dei Grigi, la gente chiude la via con la barricata (la ricetta di sempre, larga quanto la via, col solo
     varco a piedi, a un capo del presidio), pezzo per pezzo; finita, le auto si fermano (chi guida protesta, a volte)
     e tornano indietro.
   - I GRIGI (graduati, una visita ogni 3 ore al più: un grigio vicino, o la ronda dai dati): guardano → multa → ordine di togliere →
     sgombero (C.chiuso), oppure, se in strada sono in tanti, il presidio RESISTE (e la solidarietà lo fa crescere).
   - I FATTI coi loro segni (bolla, Gazzetta, Si dice): presidio (nato, da unico_costruire.js), presidio_cresce (N persone),
     presidio_festa, presidio_grigi, multa, presidio_ordine, presidio_chiude, strada_chiusa, sgombero, presidio_resiste. */
var UnicoPresidio = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q);
  const UPr = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UPr;
  if (!ON) return UPr;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const UC = typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null;
  const V = typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null;
  const FT = typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null;
  const MU = () => (typeof MenteUnica !== 'undefined' && MenteUnica.ON ? MenteUnica : typeof Mente !== 'undefined' && Mente.ON ? Mente : null);
  if (!G || !Un() || !UC || !V || !FT || !MU()) { UPr.ON = false; return UPr; }
  const UP = UC.UP, PARTI = UP.PARTI, hyp = Math.hypot, PI = Math.PI, hashS = UP.hashS, r1 = x => Math.round(x * 10) / 10, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const CFG = UPr.CFG = { ogni: 240, max: 16, turno: [70, 200], vicino: 70, simpatia: 3, lento: 2.4, grigiR: 20, grigiOgni: 180, ronda: .02, festa: 10, soglie: [6, 10, 15], dipinto: 8, varcoPiedi: .9, chiude: [10, 30, 6] };
  const stats = UPr.stats = { battiti: 0, entrati: 0, usciti: 0, pezzi: 0, max: 0, grigi: 0, multe: 0, ordini: 0, sgomberi: 0, resiste: 0, feste: 0, auto: 0, battute: 0, ferme: 0, indietro: 0 };
  const npc = (st, id) => (G.byId ? G.byId(st, id) : st.npcs.find(n => n.id === id));
  const presidi = st => ((st.u && st.u.costruire && st.u.costruire.cantieri) || []).filter(C => C.tipo === 'presidio' && !C.chiuso && C.fine !== null);
  const presidioDi = (st, id) => { for (const C of presidi(st)) if (C.vive && C.vive[id]) return C; return null; };
  const ora = st => (st.t % 1440) / 60;
  const xiDi = C => (C.varco ? Math.abs(C.varco[1]) : 1.7);

  // ======================= LE ATTIVITÀ (un verbo ognuna, la stessa porta per tutti) =======================
  const ATT = UPr.ATT = {
    porta: ['porta_in_strada', 'porge', 20, 'mano', 'ecco qua'], siede: ['siede_in_strada', 'siede', 50, 'zeta', 'si sta bene'],
    carte: ['carte_in_strada', 'carte', 45, 'fumetto', 'scopa!'], chiacchiera: ['chiacchiera_in_strada', 'discute', 30, 'fumetto', 'hai sentito?'],
    gioca: ['gioca_in_strada', 'balla', 30, 'esclamativo', 'passa!'], cucina: ['cucina_in_strada', 'scalda', 60, 'forchetta', 'chi ne vuole?'],
    dipinge: ['dipinge_la_strada', 'gesso', 40, 'pennello', 'colore!'],
  };
  const messi = C => new Set(C.pezzi.map(p => p[0]));
  const sedie = C => C.pezzi.map(p => p[0]).filter(i => C.piano[i][0] === 'sedia');
  const pezzoDi = (C, k) => C.pezzi.map(p => p[0]).find(i => C.piano[i][0] === k);
  // la sedia vicina al tavolo (si gioca a carte) o no
  const alTavolo = (C, i) => { const t = pezzoDi(C, 'tavolo'); if (t === undefined) return false; const a = C.piano[i], b = C.piano[t]; return hyp(a[1] - b[1], a[2] - b[2]) < 1; };
  // la prossima attività per chi arriva: prima portare i pezzi che mancano, poi le sedie libere, il resto a seconda di chi è
  function attivita(st, C, id) {
    const L = Object.values(C.vive), ms = messi(C), presi = new Set(L.map(e => e[4]).filter(x => x !== undefined && x !== null));
    for (let i = UC.nBase(C); i < C.piano.length; i++) if (!ms.has(i) && !presi.has(i) && UC.sorretto(C, i, ms)) return ['porta', i];
    const n = npc(st, id), h = UP.rngDi(id + C.id + Math.floor(st.t / 240))(), conta = a => L.filter(e => e[0] === a).length;
    if (n && n.pop && n.pop.age < 28 && conta('gioca') < 3 && h < .6) return ['gioca', null];
    if (!conta('cucina') && h < .3) return ['cucina', null];
    if (conta('dipinge') < 1 && ((C.stato && C.stato.dipinto) || 0) < CFG.dipinto && h > .82) return ['dipinge', null];
    const lib = sedie(C).filter(i => !presi.has(i));
    const t = lib.find(i => alTavolo(C, i)); if (t !== undefined && h < .75) return ['carte', t];
    if (lib.length) return ['siede', lib[0]];
    return ['chiacchiera', null];
  }
  // il posto dell'attività: sulla sedia (si siede dentro la sua scatola: il corpo della sedia non spinge le persone), accanto al fusto,
  // ai bordi fuori dalle cose; mai in mezzo alla carreggiata (le auto passano)
  function posto(st, C, id) {
    const e = (C.vive && C.vive[id]) || ['chiacchiera'], F = (C.meta && C.meta.F0) || C.F, xi = xiDi(C), W = C.meta && C.meta.w ? C.meta.w / 2 : xi + 1.2, h = hashS(id + C.id), s = h < .5 ? -1 : 1;
    if ((e[0] === 'siede' || e[0] === 'carte') && e[4] !== undefined && e[4] !== null && C.piano[e[4]]) { const p = C.piano[e[4]], w = UC.mondo(C, p[1], p[2]); w.face = C.a + p[4] + PI / 2; return w; }
    const L = [];
    if (e[0] === 'cucina') { const k = pezzoDi(C, 'fusto') !== undefined ? pezzoDi(C, 'fusto') : pezzoDi(C, 'cassa'); if (k !== undefined) { const p = C.piano[k]; for (const d of [.62, -.62]) L.push([p[1], p[2] + d], [p[1] + Math.sign(p[1]) * .6, p[2] + d]); } }
    if (e[0] === 'porta' && e[4] !== undefined && C.piano[e[4]]) { const p = C.piano[e[4]]; L.push([p[1], p[2] - .7], [p[1], p[2] + .7]); }
    const yo = e[0] === 'gioca' ? 1.6 + h * 2.4 : e[0] === 'dipinge' ? .5 : .5 + h * 1.4, xo = xi + .25 + ((h * 7) % 1) * Math.max(.1, W - xi - .6);
    for (const sy of [s, -s]) for (const sx of [s, -s]) L.push([sx * xo, sy > 0 ? F[3] + yo : F[1] - yo]);
    for (let k = 1; k <= 4; k++) L.push([s * xo, (s > 0 ? F[3] : F[1]) + s * (yo + k * .7)]);
    for (const q of L) { const w = UC.mondo(C, q[0], q[1]); if (UC.puntoLibero(st, C, w.x, w.y)) { w.face = Math.atan2(C.y - w.y, C.x - w.x); return w; } }
    const w = UC.mondo(C, L[0][0], L[0][1]); w.face = Math.atan2(C.y - w.y, C.x - w.x); return w;
  }
  UPr.posto = posto;
  // il posto tenuto finché non cambia l'attività (la mente e la posa guardano lo stesso)
  const U = st => st.__upr || (st.__upr = { pass: {}, ferme: {}, auto: null, posti: {}, chi: new Map() });
  const postoC = (st, C, id) => { const u = U(st), e = C.vive[id], k = C.id + e[0] + e[4]; let q = u.posti[id]; if (!q || q.k !== k) { q = posto(st, C, id); q.k = k; u.posti[id] = q; } return q; };
  const rifaiChi = st => { const m = U(st).chi; m.clear(); for (const C of presidi(st)) for (const id in C.vive || {}) m.set(id, C); };

  // ======================= LA MENTE: la fonte e il metodo (da unico_costruire.js, UC.vita) =======================
  UC.vita = {
    fonte: (c, C0) => { const C = presidioDi(c.st, c.n.id); return C && C.vive[c.n.id][2] > c.st.t ? 1 : 0; },
    metodo: (c) => {
      const st = c.st, C = presidioDi(st, c.n.id); if (!C || c.lod === 'dormiente') return null; const e = C.vive[c.n.id]; if (!(e[2] > st.t)) return null;
      const q = postoC(st, C, c.n.id), A = ATT[e[0]];
      return { passi: [['vai', { x: r1(q.x), y: r1(q.y) }], [A[0], { c: C.id, x: r1(q.x), y: r1(q.y) }]], costo: .2, perche: C.fidFine || C.fid };
    },
    posto,
  };
  const val = V._.val;
  const Cdi = (c, k) => { const s = c.st.u && c.st.u.costruire, id = val(k, c); return s ? s.cantieri.find(x => x.id === id) || null : null; };
  Object.assign(V.COND, { pv_qui: (c, k) => { const C = Cdi(c, k); return C && !C.chiuso && C.vive && C.vive[c.A.id] ? '' : 'Qui non c\'è niente da fare.'; } });
  Object.assign(V.EFF, {
    pv_fa: (c, k) => {
      const st = c.st, C = Cdi(c, k), e = C && C.vive && C.vive[c.A.id]; if (!e) return;
      if (e[0] === 'porta' && e[4] !== null && e[4] !== undefined && !messi(C).has(e[4]) && UC.sorretto(C, e[4], messi(C))) {
        C.pezzi.push([e[4], c.A.id, r1(st.t)]); stats.pezzi++; if (UC.allaPosa) try { UC.allaPosa(st, C, e[4], c.A.id); } catch (x) { }
        const nx = attivita(st, C, c.A.id); e[0] = nx[0]; e[4] = nx[1];
      }
      if (e[0] === 'dipinge') C.stato.dipinto = Math.min(CFG.dipinto, (C.stato.dipinto || 0) + 1);
      e[5] = r1(st.t);
    },
  });
  for (const a in ATT) { const [v, posa, min, pitto, w] = ATT[a];
    V.registra(v, { fam: 'sociale', args: { c: 'cantiere', x: 'n', y: 'n' }, pre: [['vivo'], ['pv_qui', '$c']], eff: [['pv_fa', '$c']], costo: { min },
      dove: ['posto', '$x', '$y'], posa, segno: { bolla: [pitto, w] }, fatto: v, menu: false }, null, (st, A, a2, d) => { const s = st.u && st.u.costruire, C = s && s.cantieri.find(x => x.id === a2.c); if (C) d.via = C.via; }); }

  // ======================= I FATTI =======================
  function scrivi(st, tipo, chi, C, d) {
    const dati = Object.assign({ via: C.via, tipo: 'presidio', cantiere: C.id, x: C.x, y: C.y }, d || {});
    const ch = chi.filter(Boolean).slice(0, 6), causa = C.fidFine || C.fid || null; let r = null;
    try { r = FT.scrivi(tipo, ch, dati, causa, { st }); } catch (e) { r = null; }
    if (r && r.id !== null && r.id !== undefined) return r.id;
    const f = FT._ && FT._.registra ? FT._.registra(st, { t: st.t, v: tipo, chi: ch, causa, peso: 1, hop: 0 }, dati, 'unico') : null; return f ? f.id : null;
  }
  const Sg = typeof Segni !== 'undefined' && Segni.ON ? Segni : null;
  if (Sg && Sg.TIPI) {
    Object.assign(Sg.TIPI, {
      presidio: { p: 'casetta', w: 'via nostra', posa: 'discute', gz: .95, n: ['presidio', 'presidi'],
        r: ['In {via} è nato un presidio: lo striscione «VIA NOSTRA» in alto, le sedie in strada, le macchine passano piano. L\'hanno messo su {A}[, {B}] e gli altri.', '{via} è «via nostra»: {A}[ e {B}] hanno appeso lo striscione e portato fuori le sedie.'] },
      presidio_cresce: { p: 'esclamativo', w: 'siamo di più', posa: 'discute', gz: .6, n: ['presidio che cresce', 'presidi che crescono'] },
      presidio_festa: { p: 'cuore', w: 'si fa festa', posa: 'balla', gz: .8, n: ['festa in strada', 'feste in strada'] },
      presidio_grigi: { p: 'esclamativo', w: 'i Grigi', posa: 'osserva', gz: .3, n: ['passaggio dei Grigi', 'passaggi dei Grigi'] },
      presidio_ordine: { p: 'esclamativo', w: 'via entro domani', posa: 'discute', gz: .6, n: ['ordine di sgombero', 'ordini di sgombero'] },
      presidio_chiude: { p: 'esclamativo', w: 'si chiude', posa: 'discute', gz: .6, n: ['presidio che chiude', 'presidi che chiudono'] },
      strada_chiusa: { p: 'barricata', w: 'strada chiusa', posa: 'discute', gz: .95, n: ['strada chiusa', 'strade chiuse'] },
      presidio_resiste: { p: 'esclamativo', w: 'non ce ne andiamo', posa: 'discute', gz: .85, n: ['presidio che resiste', 'presidi che resistono'] },
    });
    for (const a in ATT) Sg.TIPI[ATT[a][0]] = { p: ATT[a][3], w: ATT[a][4], posa: ATT[a][1], gz: 0, n: ['momento in strada', 'momenti in strada'], bolla: false };
    if (!Sg.TIPI.sgombero) Sg.TIPI.sgombero = { p: 'piede', gz: .85, n: ['sgombero', 'sgomberi'] };
  }
  if (FT.GRAV) Object.assign(FT.GRAV, { presidio: .75, presidio_cresce: .45, presidio_festa: .5, presidio_grigi: .35, presidio_ordine: .55, presidio_resiste: .7, presidio_chiude: .5, strada_chiusa: .8 });

  // ======================= CHI VIENE, CHI SE NE VA =======================
  const alLavoro = (n, h) => { const j = n.pop && n.pop.job; if (!j || typeof j.start !== 'number') return false; return j.start <= j.end ? h >= j.start && h < j.end : h >= j.start || h < j.end; };
  const libero = (st, n) => !!(n && MU()._.candidato(st, n) && !n.grigio && !(n.jailedUntil > st.t) && !UC.cantiereDi(st, n.id) && !presidioDi(st, n.id));
  // la pressione delle idee nel quartiere (accese: contro i Grigi conta di più)
  function pressione(st, C) {
    const I = typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null; if (!I) return 0;
    const P = I.pressione(st, I.quart(C.x, C.y)); let k = 0; for (const s in P) if (P[s] && P[s][1]) k += s === 'grigi' ? .25 : .1; return Math.min(.5, k);
  }
  // quanti ci stanno adesso
  function obiettivo(st, C) {
    const P = C.pv, h = ora(st), eta = (st.t - C.fine) / 60;
    const cresce = 3 + (CFG.max - 3) * (1 - Math.exp(-eta / 9));
    const k = h < 6.5 ? .15 : h < 9 ? .45 : h < 12.5 ? .75 : h < 15 ? .65 : h < 19 ? .9 : h < 23 ? 1 : .35;
    const sost = cl(.8 + pressione(st, C) + (P.sol || 0), .5, 1.4), gk = 1 - .55 * Math.exp(-(st.t - P.gt) / 150);
    let n = Math.round(cresce * k * sost * gk); if (k >= .6 && eta < 30) n = Math.max(n, Math.min(3, C.gruppo.length));
    return Math.min(CFG.max, n);
  }
  UPr.obiettivo = obiettivo;
  // i candidati: i fondatori, poi i vicini di casa, poi (dopo 3 ore) chi simpatizza
  function candidati(st, C, h) {
    const out = [], eta = (st.t - C.fine) / 60, rel = (a, b) => { const M = st.u.menti && st.u.menti[a]; const r = M && M.rel && M.rel[b]; return r ? r[1] || 0 : 0; };
    const gr = st.u.gruppi && st.u.gruppi.L ? st.u.gruppi.L.filter(g => g.membri.some(m => C.gruppo.includes(m))) : [];
    const I = typeof UnicoIdee !== 'undefined' && UnicoIdee.ON ? UnicoIdee : null;
    for (const id of C.gruppo) { const n = npc(st, id); if (n && !C.vive[id] && MU()._.candidato(st, n) && !(n.jailedUntil > st.t) && !alLavoro(n, h)) out.push([10 + hashS(id + st.t), n, 'f']); }
    for (const n of st.npcs) {
      if (C.vive[n.id] || C.gruppo.includes(n.id) || !n.pop || !libero(st, n) || alLavoro(n, h)) continue;
      const ca = n.pop.homeT || n, dc = hyp(ca.x - C.x, ca.y - C.y), j = hashS(n.id + C.id + Math.floor(st.t / 60)) * .4;
      if (dc < CFG.vicino) { out.push([3 - dc / CFG.vicino + j, n, 'v']); continue; }
      if (eta < 3) continue;
      let s = 0; for (const f of C.gruppo) s = Math.max(s, rel(n.id, f) * 2);
      if (gr.some(g => g.membri.includes(n.id))) s += .6;
      if (I) for (const e of I.di(st, n.id)) if (/^grigi\|/.test(e[0]) && e[1] < 0) s += e[2] * .8;
      if (s > .15) out.push([s * 1.5 - hyp(n.x - C.x, n.y - C.y) / 600 + j, n, 's']);
    }
    return out.sort((a, b) => b[0] - a[0]);
  }
  function entra(st, C, n, k) {
    const a = attivita(st, C, n.id), dur = CFG.turno[0] + hashS(n.id + st.t) * (CFG.turno[1] - CFG.turno[0]);
    C.vive[n.id] = [a[0], r1(st.t), r1(st.t + dur), k, a[1], null]; stats.entrati++;
    const M = MU()._.menteDi && MU()._.menteDi(st, n, true); if (M) { M.prossima = Math.min(M.prossima, st.t + 1); if (M.ob && M.ob.g !== 'rivendicare') { M.ob = null; M.piano = null; } }
  }
  // un battito per presidio
  function vita(st, C) {
    C.vive = C.vive || {}; const P = C.pv = C.pv || { max: 0, soglia: 0, festa: -1, gt: -1e9, gliv: 0, sol: 0 }, h = ora(st), t = st.t; stats.battiti++;
    for (const id in C.vive) { const n = npc(st, id), e = C.vive[id]; if (!n || n.dead || n.jailedUntil > t || e[2] <= t) { delete C.vive[id]; stats.usciti++; } }
    const tgt = obiettivo(st, C); let ids = Object.keys(C.vive);
    if (ids.length > tgt) { ids.sort((a, b) => (C.vive[a][3] === 'f') - (C.vive[b][3] === 'f') || C.vive[a][2] - C.vive[b][2]); for (const id of ids.slice(0, Math.min(3, ids.length - tgt))) { delete C.vive[id]; stats.usciti++; } }
    else if (ids.length < tgt) for (const [, n, k] of candidati(st, C, h).slice(0, Math.min(tgt - ids.length, 2))) entra(st, C, n, k);
    // chi è lontano dal giocatore porta il suo pezzo dai dati (la stessa porta, strategia C)
    for (const id in C.vive) { const e = C.vive[id], n = npc(st, id); if (e[0] === 'porta' && t - e[1] > 30 && n && !(n.pop && n.pop.near)) V.applica(st, n, ATT.porta[0], { c: C.id, x: C.x, y: C.y }, { lod: 'lontano' }); }
    const N = Object.keys(C.vive).length; P.max = Math.max(P.max, N); stats.max = Math.max(stats.max, N);
    const chi = Object.keys(C.vive).slice(0, 4);
    if (P.soglia < CFG.soglie.length && N >= CFG.soglie[P.soglia]) { P.soglia++; scrivi(st, 'presidio_cresce', chi, C, { n: N, d: `In ${C.via} il presidio cresce: ${N} persone in strada, ${sedie(C).length} sedie, e le macchine passano piano` }); }
    const g = Math.floor(t / 1440);
    if (N >= CFG.festa && h >= 18 && P.festa !== g) { P.festa = g; stats.feste++; scrivi(st, 'presidio_festa', chi, C, { n: N, d: `Festa in ${C.via}: ${N} persone sotto lo striscione, le carte sul tavolo e la pentola sul fusto` }); }
    controllaChiusura(st, C, N);
    grigi(st, C, N);
  }
  // ======================= LA STRADA CHIUSA: il presidio cresciuto (o minacciato) chiude la via con la barricata =======================
  // La ricetta della barricata (GEN.sbarramento, la stessa) larga quanto la via, col solo varco a piedi (CFG.varcoPiedi), a un capo del
  // presidio (oltre le sue cose, il davanti verso fuori); niente pali né striscione (c'è già la scritta). I pezzi entrano nel piano dopo
  // quelli della comunità e li porta la gente (l'attività «porta», dal basso); il posto si controlla come ogni posto (case, mezzi, roba
  // di strada, altri cantieri) e il tutto con UP.valida (nessuna compenetrazione). Finita: il fatto «strada_chiusa», le auto si fermano.
  function chiudi(st, C, pref) {
    const w = (C.meta && C.meta.w) || 7, altri = st.u.costruire.cantieri.filter(D => D !== C && !D.chiuso && D.F).map(D => UC.rettDi(D, 1));
    for (const [k, verso] of [[0, 1], [1, -1], [2, 1], [3, -1]].sort((a, b) => (b[1] === pref) - (a[1] === pref))) {
      const P = UP.progetta('barricata', C.id + '|chiude|' + k, { w, varco: CFG.varcoPiedi, lato: k < 2 ? 1 : -1 }); if (!P) continue;
      const pali = P.parti.filter(p => p[0] === 'trave'), L = P.parti.filter(p => p[0] !== 'striscione' && p[0] !== 'trave' && !(p[0] === 'pneumatico' && pali.some(q => Math.abs(q[1] - p[1]) < .05 && Math.abs(q[2] - p[2]) < .05)));
      // verso +1: oltre il capo +y, il davanti (−y della ricetta) verso il presidio girato: mezzo giro; verso −1: oltre il capo −y, così com'è
      const B = L.map(p => { const q = p.slice(); if (verso > 0) { q[1] = -q[1]; q[2] = -q[2]; q[4] = +(q[4] + PI).toFixed(3); } return q; });
      const Fg = UP.impronta(B), off = verso > 0 ? C.F[3] + .9 - Fg[1] : C.F[1] - .9 - Fg[3];
      B.forEach(q => { q[2] = +(q[2] + off).toFixed(3); });
      const tutto = C.piano.concat(B); if (tutto.length > UC.CFG.maxPezzi + 8 || !UP.valida(tutto).ok) continue;
      if (UP.controlla(st, { x: C.x, y: C.y, a: C.a }, UP.impronta(B), { suolo: 'via', altri })) continue;
      const i0 = C.piano.length; C.meta.F0 = C.F; C.piano = tutto; C.F = UP.impronta(tutto).map(x => Math.round(x * 100) / 100);
      C.meta.chiusa = { da: i0, y: +((UP.impronta(B)[1] + UP.impronta(B)[3]) / 2).toFixed(2), t: r1(st.t), fatta: false };
      U(st).posti = {}; return true;
    }
    return false;
  }
  UPr.chiudi = chiudi;
  const chiusa = C => !!(C.meta && C.meta.chiusa && C.meta.chiusa.fatta);
  function controllaChiusura(st, C, N) {
    const P = C.pv, eta = (st.t - C.fine) / 60, K = C.meta.chiusa;
    if (!K) { if (((N >= CFG.chiude[0] && eta >= CFG.chiude[1]) || (P.gliv >= 2 && N >= CFG.chiude[2])) && chiudi(st, C)) scrivi(st, 'presidio_chiude', Object.keys(C.vive).slice(0, 4), C, { n: N, d: P.gliv >= 2 ? `In ${C.via}, dopo la multa dei Grigi, il presidio ha deciso: si chiude la strada` : `In ${C.via} il presidio ha deciso: da domani la strada si chiude` }); return; }
    if (!K.fatta) { const ms = messi(C); let tutti = true; for (let i = K.da; i < C.piano.length; i++) if (!ms.has(i)) { tutti = false; break; }
      if (tutti) { K.fatta = true; C.misure.passa = CFG.varcoPiedi; scrivi(st, 'strada_chiusa', Object.keys(C.vive).slice(0, 4), C, { n: N, d: `${C.via} è chiusa: bancali, porte e copertoni da un marciapiede all'altro, si passa solo a piedi. Le macchine tornano indietro` }); } }
  }
  // ======================= I GRIGI: guardano, multano, ordinano, sgomberano (o il presidio resiste) =======================
  function grigi(st, C, N) {
    const P = C.pv, t = st.t, h = ora(st); if (t - P.gt < CFG.grigiOgni) return;
    if (t - P.gt > 2880 && P.gliv > 0) P.gliv--;   // due giorni tranquilli: si dimenticano un gradino
    let cop = st.npcs.find(n => n.grigio && !n.dead && !n.inside && hyp(n.x - C.x, n.y - C.y) < CFG.grigiR);
    if (!cop) { if (h < 8 || h > 22 || UP.rngDi(C.id + '|ronda|' + Math.floor(t / 15))() > CFG.ronda * (1 + N / 6)) return; cop = st.npcs.find(n => n.grigio && !n.dead) || null; }
    P.gt = Math.round(t); P.gliv = Math.min(4, P.gliv + 1); stats.grigi++;
    const io = cop ? cop.id : null, capo = C.gruppo[0];
    if (P.gliv === 1) scrivi(st, 'presidio_grigi', [io, capo], C, { d: `I Grigi sono passati dal presidio di ${C.via}: hanno guardato a lungo e preso appunti` });
    else if (P.gliv === 2) { stats.multe++; scrivi(st, 'multa', [capo, io], C, { d: `Multa al presidio di ${C.via}: occupazione di suolo pubblico` }); }
    else if (P.gliv === 3) { stats.ordini++; scrivi(st, 'presidio_ordine', [io, capo], C, { d: `I Grigi hanno ordinato di togliere il presidio di ${C.via} entro domani` }); }
    else if (N >= 8) { stats.resiste++; P.gliv = 2; P.sol = Math.min(.4, (P.sol || 0) + .15); scrivi(st, 'presidio_resiste', Object.keys(C.vive).slice(0, 4), C, { n: N, d: `Il presidio di ${C.via} resiste: i Grigi sono tornati per sgomberare, ma in strada erano in ${N}` }); }
    else { stats.sgomberi++; C.chiuso = true; scrivi(st, 'sgombero', [io].concat(C.gruppo.slice(0, 3)), C, { d: `I Grigi hanno sgomberato il presidio di ${C.via}: sedie e striscione sul furgone`, part: Object.keys(C.vive).slice(0, 6) }); C.vive = {}; }
  }
  UPr.grigi = grigi;

  // ======================= LE AUTO: piano, in mezzo, chi guida dice la sua =======================
  // Chi guida non suona (niente onomatopee: quelle restano agli urti e ai crolli): ogni tanto dice una battuta nel fumetto normale
  // (UV.dice). Rade: non ogni auto (CFG.parla: la probabilità), al più una ogni CFG.parlaOgni secondi per presidio, mai la stessa due volte
  // di fila. Il carattere di chi guida viene dall'auto (hashS(v.id)): i più sbuffano, uno su quattro è dalla parte del presidio.
  const BATTUTE = UPr.BATTUTE = {
    passa: { sbuffa: ['Ma levatevi!', 'Devo passare, ho il pesce in macchina!', 'Bravi, bravi… ora spostatevi.', 'Ma è una strada o un salotto?', 'Permesso! Lavoro, io!', 'Ogni giorno una novità…', 'E le sedie in mezzo alla strada?', 'Vado piano, vado piano…'],
      tifa: ['Forza ragazzi!', 'Bella questa via!', 'Tenete duro!', 'Al ritorno mi fermo!', 'Fate bene!'] },
    ferma: { sbuffa: ['E adesso da dove passo?', 'Ma siete matti? Aprite!', 'Ho il pesce in macchina, io!', 'Chiamo i Grigi, eh!', 'Va bene, giro… ma me lo segno!', 'Ma chi ve l\'ha detto?'],
      tifa: ['Avete ragione voi. Giro.', 'Forza ragazzi!', 'Tranquilli, faccio il giro.'] },
  };
  CFG.parla = { passa: .35, ferma: .7 }; CFG.parlaOgni = 9;
  function parla(st, u, C, v, quando) {
    if (!UV || !UV.dice) return; const ck = st.clock || 0, r = UP.rngDi(v.id + '|' + quando + '|' + Math.floor(ck * 10))();
    u.parlaT = u.parlaT || {}; if (ck - (u.parlaT[C.id] === undefined ? -1e9 : u.parlaT[C.id]) < CFG.parlaOgni || r > CFG.parla[quando]) return;
    const B = BATTUTE[quando], tifa = hashS(v.id + '|tifa') < .25, L = B[tifa ? 'tifa' : 'sbuffa'].filter(t => t !== u.ultima);
    const t = L[Math.floor(UP.rngDi(v.id + C.id + Math.floor(ck))() * L.length) % L.length];
    u.parlaT[C.id] = ck; u.ultima = t; stats.battute++; UV.dice(st, v, t, 3.2);
  }
  UPr.parla = parla;
  // la zona lenta: dove sta un'auto rispetto al presidio (x di traverso, y lungo la via); null se è lontana
  function zona(C, v) {
    if (Math.abs(v.x - C.x) > 16 || Math.abs(v.y - C.y) > 16) return null; const l = UC.locale(C, v.x, v.y), K = (G.VK || {})[v.kind] || {}, yF = Math.max(-C.F[1], C.F[3]);
    return Math.abs(l.y) < yF + (K.len || 4) / 2 + 5 && Math.abs(l.x) < (C.meta && C.meta.w ? C.meta.w / 2 : 3.5) + 1 ? { l, K, yF } : null;
  }
  const UV = typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.ON ? UnicoPartiVivo : null;
  function corsia(st, dt, L) {
    const u = U(st), pl = st.player;
    for (const C of L) {
      if (C.tipo !== 'presidio' || C.fine === null) continue;
      for (const v of st.vehicles) {
        if (v.hidden || v.wreck || (pl && v.id === pl.vehicle) || ((G.VK || {})[v.kind] || {}).boat) continue;
        const z = zona(C, v); if (!z) { if (u.pass[v.id] === C.id) delete u.pass[v.id]; continue; }
        const lim = Math.max(0, xiDi(C) - (z.K.wid || 1.8) / 2 - .15), l = z.l;
        if (Math.abs(l.x) > lim) { const k = Math.abs(l.y) < z.yF + (z.K.len || 4) / 2 + .5 ? 1 : Math.min(1, dt * 4); l.x += (Math.sign(l.x) * lim - l.x) * k; const w = UC.mondo(C, l.x, l.y); v.x = w.x; v.y = w.y; }
        if (chiusa(C)) { ferma(st, u, C, v, z); continue; }
        const sp = hyp(v.vx || 0, v.vy || 0); if (sp > CFG.lento) { const f = CFG.lento / sp; v.vx *= f; v.vy *= f; v.speed = (v.speed || 0) * f; if (v._spd !== undefined) v._spd = v.speed; }
        if (u.pass[v.id] !== C.id && sp > .3) { u.pass[v.id] = C.id; stats.auto++; parla(st, u, C, v, 'passa'); }
      }
    }
    // l'auto della foto: passa piano in mezzo, da un capo all'altro
    const A = u.auto; if (A) { const C = L.find(x => x.id === A.c), v = st.vehicles.find(x => x.id === A.vid); if (!C || !v) u.auto = null; else { const dir = A.dir || 1; A.s += dir * A.vel * dt; const w = UC.mondo(C, A.dx * dir, A.s); v.x = w.x; v.y = w.y; v.ang = C.a + dir * PI / 2; v.vx = Math.cos(v.ang) * A.vel; v.vy = Math.sin(v.ang) * A.vel; v.speed = A.vel; if (dir * A.s > dir * A.fino) u.auto = null; } }
  }
  if (UV) UV.primaDeiCorpi = corsia;
  // la strada chiusa: chi va verso la barricata si ferma a 2,5 m, a volte protesta, e dopo 3 secondi torna indietro (il traffico gira la corsia)
  function ferma(st, u, C, v, z) {
    const yb = C.meta.chiusa.y, hy = Math.cos(v.ang - C.a - PI / 2), d = yb - z.l.y;
    if (Math.sign(d) !== Math.sign(hy) || Math.abs(hy) < .5 || Math.abs(d) > (z.K.len || 4) / 2 + 3 + 6) { delete u.ferme[v.id]; return; }
    if (Math.abs(d) > (z.K.len || 4) / 2 + 2.5) { const sp = hyp(v.vx || 0, v.vy || 0); if (sp > CFG.lento) { const f = CFG.lento / sp; v.vx *= f; v.vy *= f; v.speed = (v.speed || 0) * f; } return; }
    v.vx = v.vy = 0; v.speed = 0; if (v._spd !== undefined) v._spd = 0;
    const t0 = u.ferme[v.id]; if (t0 === undefined) { u.ferme[v.id] = st.clock || 0; stats.ferme++; parla(st, u, C, v, 'ferma'); return; }
    if ((st.clock || 0) - t0 > 3 && v.traffic && v.lane) { v.lane.dir *= -1; v.pass = null; delete u.ferme[v.id]; stats.indietro++; }
  }
  // il traffico rallenta da sé (il gancio della velocità per rango di strada)
  if (G.HOOKS) { const c0 = G.HOOKS.corsa; G.HOOKS.corsa = (st, v, w) => { w = c0 ? c0(st, v, w) : w; for (const C of presidi(st)) if (zona(C, v)) return Math.min(w, CFG.lento); return w; }; }
  // un'auto (del traffico, se c'è, se no una ferma) passa in mezzo al presidio: per la tappa e per le foto
  UPr.passa = (st, C, s0, dir, vel, filtro) => {   // filtro(K, v): quali mezzi (per la foto: un'auto, non un motorino)
    let best = null, bd = Infinity; for (const v of st.vehicles) { const K = (G.VK || {})[v.kind] || {}; if (v.hidden || v.wreck || K.boat || K.pocket || v.police || (st.player && v.id === st.player.vehicle) || (K.len || 4) > 5 || (filtro && !filtro(K, v))) continue; const d = hyp(v.x - C.x, v.y - C.y) + (v.traffic ? 0 : 500); if (d < bd) { bd = d; best = v; } }
    if (!best) return null; U(st).auto = { vid: best.id, c: C.id, s: s0 === undefined ? C.F[1] - 6 : s0, dx: -.35, vel: vel === undefined ? 2 : vel, dir: dir || 1, fino: (dir || 1) > 0 ? C.F[3] + 8 : C.F[1] - 8 }; corsia(st, 0, [C]); return best;
  };

  // ======================= LA FASE e la tappa delle foto =======================
  function fase(st) { if (!st.u || !st.u.costruire) return; if (Un().passi % CFG.ogni !== 7) return; for (const C of presidi(st)) vita(st, C); rifaiChi(st); }
  Un().fase('unico.presidio', { dopo: 'unico.costruire', budget: { p95: .02 } }, fase);
  // avanti di «ore»: il presidio come sarebbe dopo (i pezzi della comunità portati, la gente di turno, la strada dipinta); per le foto
  UPr.avanza = (st, C, ore, quanti) => {
    C.fine = r1(st.t - ore * 60); C.vive = C.vive || {}; C.pv = C.pv || { max: 0, soglia: 0, festa: -1, gt: -1e9, gliv: 0, sol: 0 };
    for (let i = UC.nBase(C); i < C.piano.length; i++) if (!messi(C).has(i)) C.pezzi.push([i, C.gruppo[i % C.gruppo.length], r1(st.t)]);
    C.stato.dipinto = Math.min(CFG.dipinto, Math.round(ore / 4)); const h = ora(st), N = quanti || obiettivo(st, C);
    for (const [, n, k] of candidati(st, C, -1)) { if (Object.keys(C.vive).length >= N) break; entra(st, C, n, k); }
    rifaiChi(st); return Object.keys(C.vive).length;
  };
  // chiusa del tutto (per le foto): la barricata decisa e portata
  UPr.chiudiOra = (st, C, pref) => { if (!C.meta.chiusa && !chiudi(st, C, pref)) return false; for (let i = C.meta.chiusa.da; i < C.piano.length; i++) if (!messi(C).has(i)) C.pezzi.push([i, C.gruppo[i % C.gruppo.length], r1(st.t)]); controllaChiusura(st, C, Object.keys(C.vive || {}).length); return true; };
  UPr.vita = vita; UPr.fase = fase; UPr.postoC = postoC; UPr.rifaiChi = rifaiChi; UPr.presidioDi = presidioDi; UPr.corsia = corsia;

  // ======================= IL DISEGNO: la strada dipinta (segni di gesso e vernice sull'asfalto, in mezzo) =======================
  if (UV && typeof window !== 'undefined') UV.extra = (C, out, T3) => {
    const n = C.tipo === 'presidio' ? (C.stato && C.stato.dipinto) || 0 : 0; if (!n) return;
    const COLS = ['#DC9A34', '#E04B8C', '#2F60B5', '#93B27C', '#F2E7CF', '#C25B36'], xi = xiDi(C) - .3, mats = UPr._mats || (UPr._mats = {});
    const mt = c => mats[c] || (mats[c] = new T3.MeshStandardMaterial({ color: c, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2 }));
    const geo = UPr._geo || (UPr._geo = [new T3.CircleGeometry(.42, 18), new T3.PlaneGeometry(.5, .5), new T3.RingGeometry(.3, .44, 18), new T3.PlaneGeometry(1.2, .12)]);
    for (let i = 0; i < n; i++) {
      const h = hashS(C.id + '|dip|' + i), x = (h * 2 - 1) * xi, y = (hashS(C.id + i) * 2 - 1) * 3.2, g = geo[i % geo.length];
      const M = new T3.Matrix4().makeRotationX(-PI / 2).premultiply(new T3.Matrix4().makeRotationY(h * PI)).premultiply(new T3.Matrix4().makeTranslation(x, .008 + i * .001, y));
      out.push([g, mt(COLS[i % COLS.length]), M]);
      if (i % 3 === 0) out.push([geo[3], mt(COLS[(i + 2) % COLS.length]), new T3.Matrix4().makeRotationX(-PI / 2).premultiply(new T3.Matrix4().makeRotationY(h * 2)).premultiply(new T3.Matrix4().makeTranslation(x * .6, .009 + i * .001, y + .6))]);
    }
  };
  // la posa: chi è di turno e sta fermo al suo posto fa la sua attività (seduto sulla sedia, le carte, la pentola, il gesso), anche
  // quando il verbo è finito e aspetta il prossimo (Segni la mette solo durante il verbo)
  const AN = typeof Anim !== 'undefined' && Anim.npcPost && Anim.POSES ? Anim : null;
  if (AN) AN.npcPost((st, n, s) => {
    if (!st.__upr || n.dead || n.inside || n.inVeh || Math.abs(n.speedNow || 0) > .3) return; const C = st.__upr.chi.get(n.id); if (!C || C.chiuso || !C.vive[n.id]) return;
    const q = postoC(st, C, n.id); if (hyp(n.x - q.x, n.y - q.y) > .9) return; const a = ATT[C.vive[n.id][0]][1]; if (!AN.POSES[a]) return;
    s.act = a; if (a === 'siede' || a === 'carte') { n.face = q.face; n.x = q.x; n.y = q.y; }
  });
  Un().Presidio = UPr;
  return UPr;
})();
if (typeof window !== 'undefined') window.UnicoPresidio = UnicoPresidio;
