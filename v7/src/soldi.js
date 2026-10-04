/* Porto Vecchio — I soldi (solo logica, nessuna grafica). Caricato dopo fazioni.js.
   Ogni lira sta da qualche parte: nel portafoglio di qualcuno, sotto un materasso, nella cassa di una bottega, nel caveau
   o in un bancomat, nel furgone portavalori, nella cassa comune della Risacca, nelle tasche della Famiglia, sulla nave.
   I CONTI sono quello che il Banco deve a ciascuno: si muovono con i bonifici, i contanti no.
   - Tutti i pagamenti ufficiali passano dal conto: lo stipendio lo versa il padrone, l'affitto e le bollette li addebita
     l'Ente Case del Garante, la decima l'Ufficio Tributi, il pizzo arriva come fattura della «Vigilanza Tirrena».
     Se il conto è scoperto resta un insoluto; per le cifre grosse vengono a prendersi i contanti (in bottega o a casa).
   - I contanti si prendono al bancomat (o allo sportello) e si spendono: bar, botteghe, osterie, macchinette.
     Le botteghe li versano la mattina; il PORTAVALORI la sera passa a ritirare gli incassi grossi e la mattina riempie i bancomat.
   - Chi non ha un conto (la malavita, chi non ha lavoro, chi non si fida) tiene i soldi sotto il materasso.
   - La TUTELA può congelare i conti di chi è sospetto: per questo la Risacca tiene i suoi soldi in contanti, in una base.
   - AZZARDO: macchinette (della Famiglia) nei bar, al tabacchi e in sala giochi; sette e mezzo alla bisca; il Lotto del Garante il sabato.
   - Il giocatore: portafoglio (st.player.money), un conto se lo apre, la cassa comune (st.ris.cassa), e tutto quello che si può
     rapinare: sportello, caveau, bancomat, portavalori.
   Si appoggia a Popolo._.MONEY (paga, affitto, spese), Economia.HOOK (consegne, nave), Risacca.EXT (casse delle botteghe). */
var Soldi = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Az = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const Ec = typeof Economia !== 'undefined' ? Economia : require('./economia.js');
  const RS = typeof Risacca !== 'undefined' ? Risacca : require('./risacca.js');
  const I = Po._, PLACES = G.PLACES;
  const { note, feel, target, tkey, clamp, dist } = I;
  const rnd = Math.random;
  const r1 = x => Math.round(x * 10) / 10;
  const L = x => `${Math.round(x).toLocaleString('it-IT')}.000 lire`;

  const CFG = {
    atmCap: 1500, atmStart: 900, tillFloat: 30, tillDeposit: 120, wallLow: 15, wallHigh: 180, riserva: 20, propensione: .3,
    decima: .10, decimaDura: .15, bollette: 3, lottoAggio: .08, prestito: 200, prestitoTasso: .03, vanStops: 9, vanCrew: 'guardia giurata',
    statoRiserva: 2500, tributo: .3, ingrosso: .45, nave: .7,
  };

  // ================= IL BANCO (su una casa libera vicino alla piazza) =================
  (function assignBank() {
    const B = G.BUILDINGS, pz = PLACES.piazza || { x: 0, y: 0 };
    const free = B.filter(b => b.door && b.use === 'casa' && !b.home && !b.farm && !b.trade).map(b => ({ b, d: Math.hypot(b.door[0] * G.TS - pz.x, b.door[1] * G.TS - pz.y), a: b.w * b.h }));
    const x = free.filter(q => q.a >= 12).sort((p, q) => p.d - q.d)[0] || free.sort((p, q) => p.d - q.d)[0]; if (!x) return;
    const b = x.b; b.trade = 'banca'; b.use = 'banca'; b.name = 'Banco di Porto Vecchio'; b.label = b.name; b.sign = { t: 'BANCA', c: '#e8d040' }; b.shop = true;
    I.JOBS_BY.banca = [['direttore della banca', 1, 10, 8, 17], ['cassiere', 2, 7, 8, 16], ['guardia giurata', 3, 6, 6, 20]];
    I.ESSENTIAL.push(/^cassier/, /^guardia giurata/, /^direttore della banca/);
    I.GENDER.push(['cassiere', 'cassiera']);
  })();
  G.VK.portavalori = Object.assign({}, G.VK.furgone, { label: 'Portavalori', hp: 340, m: 2600, max: 12 });
  const bankBi = () => G.BUILDINGS.findIndex(b => b.use === 'banca');
  const bankT = () => { const bi = bankBi(); return bi >= 0 ? I.tB(bi) : target('piazza'); };

  // i posti dell'azzardo e dei bancomat
  const PUBLIC = /^(rocca|caserma_p|commissariato|miramare|biblioteca|ambulatorio|hangar1|hangar2|poligono|eliporto|faro|deposito_s|deposito_n|cultura|stazione_n|stazione_s|miniera|stazione2|muro|varco)$/;
  const CURIA = /^(chiesa|santuario|chiesa_sg)$/;
  const ATM_AT = [['banca', 'del Banco'], ['piazza', 'di piazza San Rocco'], ['calata', 'della Calata'], ['use:emporio', 'dell\'Emporio'], ['sangiacomo', 'di San Giacomo'], ['passeggiata', 'della Passeggiata']];
  const SLOT_AT = [['flipper', 4], ['bar', 1], ['sirena', 1], ['use:tabacchi', 1]];
  const BISCA = ['magazzino', 'flipper'];
  const refTargets = ref => ref === 'banca' ? [bankT()] : ref.startsWith('use:') ? G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.use === ref.slice(4) && b.door).map(([, bi]) => I.tB(bi)) : [target(ref)].filter(Boolean);

  // ================= LO STATO =================
  function S(st) {
    if (st.soldi) return st.soldi;
    const E = Ec.eco(st);
    const M = st.soldi = { conti: {}, ditte: {}, atms: [], slots: [], banca: null, van: { vid: 'portavalori', cargo: 0, runs: 0, last: '', crew: null }, lotto: { tickets: [], last: null, hist: [] },
      player: { conto: false, loan: null, mov: [], arrests: st.player.arrests || 0 }, bisca: null, hour: -1, fuori: 0, leak: 0, cash0: 0, days: [], news: [],
      stats: { stipendi: 0, nonPagati: 0, consumi: 0, prelievi: 0, versamenti: 0, bancomatVuoti: 0, affitti: 0, insoluti: 0, visite: 0, decima: 0, sequestri: 0, pizzo: 0, esattori: 0,
        slotGiocato: 0, slotPagato: 0, lottoIncasso: 0, lottoVincite: 0, giri: 0, giriSaltati: 0, rapine: 0, refurtiva: 0, ingrosso: 0, import: 0, export: 0, tributo: 0, forniture: 0, congelati: 0, utili: 0 } };
    const bt = bankT();
    M.banca = { t: bt, vault: 0, mutui: 0, equity: 600, debitoImpero: 0, robbedAt: -1e9 };
    acct(st, 'stato', { kind: 'stato', label: 'Tesoro del Garante', fido: 1e9 }).bal = 3000;
    acct(st, 'fam', { kind: 'fam', label: 'Vigilanza Tirrena s.r.l.' }).bal = 60;
    // chi ha un conto e chi tiene i soldi sotto il materasso
    st.npcs.forEach(n => initPerson(st, n));
    // le ditte: ogni posto di lavoro, ogni bottega
    st.npcs.forEach(n => { const P = n.pop; if (!P || !P.job || !P.job.t) return; const D = ditta(st, P.job.t); if (P.job.cast || P.cast) { D.owner = D.owner || n.id; return; } D.week += P.job.pay * Math.max(4, ((P.job.end || 17) - (P.job.start || 9))) * 5; D.staff++; });
    Object.values(E.shops).forEach(Sh => ditta(st, Sh.t));
    Object.values(E.work).forEach(W => { if (W.cash === undefined) W.cash = 20; ditta(st, W.t); });
    Object.values(M.ditte).forEach(D => { if (D.pub || D.bank) return; acct(st, D.conto).bal = Math.round(60 + D.week * 1.5); acct(st, D.conto).fido = Math.round(D.week * 1.5 + 60); });
    // i bancomat
    ATM_AT.forEach(([ref, nm], i) => refTargets(ref).slice(0, 1).forEach(t => { const q = spot(t.x, t.y, 1.6); M.atms.push({ id: 'atm' + i, label: `Bancomat ${nm}`, x: q.x, y: q.y, cash: CFG.atmStart, broken: 0 }); }));
    // le macchinette (le mette la Famiglia: l'incasso è suo, il bar prende una parte)
    SLOT_AT.forEach(([ref, k]) => refTargets(ref).forEach(t => M.slots.push({ id: 'slot' + M.slots.length, k: tkey(t), t, label: t.label, x: t.x, y: t.y, n: k, box: 30 * k })));
    // il caffè al bar
    Object.values(E.shops).forEach(Sh => { if (/^Bar|Sirena|Gelateria/.test(Sh.label)) { Sh.sells.caffe = true; Sh.stock.caffe = 12; } });
    // il caveau: abbastanza per i bancomat e per qualche settimana di prelievi
    const dep = Object.values(M.conti).reduce((s, A) => s + Math.max(0, A.bal), 0);
    const B = M.banca; B.vault = Math.round(dep * .3 + 1500);
    B.mutui = Math.round(dep + B.equity - B.vault - M.atms.reduce((s, a) => s + a.cash, 0));
    // il furgone, davanti al Banco
    const q = spot(bt.x, bt.y, 3);
    if (!st.vehicles.find(v => v.id === M.van.vid)) st.vehicles.push(G.makeVehicle(st, { id: M.van.vid, kind: 'portavalori', x: q.x, y: q.y, ang: 0, color: '#8a9098', owner: null, armored: true }));
    M.cash0 = cashTotal(st);
    return M;
  }
  function spot(x, y, r) { for (let i = 0; i < 16; i++) { const a = i * 2.4, d = r * (1 + (i >> 2) * .5), p = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }; if (!G.walkM || G.walkM(p.x, p.y)) return p; } return { x, y }; }
  function initPerson(st, n) {
    const P = n.pop; if (!P || P.contoInit) return; P.contoInit = true;
    const cashOnly = !!(P.giro && ['borsaiolo', 'ladro', 'spacciatore', 'trafficante', 'ricettatore'].includes(P.giro)) || !!P.lost || (!P.job && !P.cast && rnd() < .5) || !!n.fam;
    if (!cashOnly) { P.conto = 'p:' + n.id; acct(st, P.conto, { kind: 'persona', owner: n.id, label: n.name }).bal = Math.round(20 + Math.max(0, P.money) * 1.2 + (P.job ? P.job.pay * 15 : 0) + rnd() * 40); }
    else P.conto = null;
    P.mat = cashOnly ? Math.round(10 + rnd() * 50) : (rnd() < .3 ? Math.round(rnd() * 40) : 0);
    P.arrAff = 0;
  }

  // ================= CONTI =================
  function acct(st, id, o) { const M = st.soldi; let A = M.conti[id]; if (!A) A = M.conti[id] = Object.assign({ id, kind: 'persona', bal: 0, frozen: false, fido: 0, mov: [] }, o || {}); return A; }
  function mov(st, A, amt, why) { if (!A || !amt) return; A.mov.push([st.t, r1(amt), why]); if (A.mov.length > 30) A.mov.shift(); }
  // un bonifico: da conto a conto. partial: quanto si può. Restituisce quanto è passato.
  function xfer(st, from, to, amt, why, partial) {
    const A = acct(st, from), B = acct(st, to); if (!(amt > 0)) return 0;
    if (A.frozen) return 0;
    const can = A.bal + A.fido; const x = partial ? Math.min(amt, Math.max(0, can)) : (can >= amt ? amt : 0); if (x <= 0) return 0;
    A.bal -= x; B.bal += x; mov(st, A, -x, why); mov(st, B, x, why); return x;
  }
  // contanti che entrano in banca (versamento) e che escono (prelievo); src: il caveau o un bancomat
  function versa(st, id, amt, why) { if (!(amt > 0)) return 0; const A = acct(st, id); A.bal += amt; st.soldi.banca.vault += amt; mov(st, A, amt, why || 'versamento'); return amt; }
  function preleva(st, id, amt, src, why) {
    const A = acct(st, id), B = st.soldi.banca; if (A.frozen || !(amt > 0)) return 0;
    const has = src ? src.cash : B.vault;
    const x = Math.max(0, Math.min(amt, A.bal + A.fido, has)); if (x <= 0) return 0;
    A.bal -= x; if (src) src.cash -= x; else B.vault -= x; mov(st, A, -x, why || 'prelievo'); return x;
  }

  // ================= DITTE (chi incassa e chi paga) =================
  const isPublicT = t => { if (!t) return false; if (t.k === 'p' && PUBLIC.test(t.pid || '')) return true; const b = t.k === 'b' ? G.BUILDINGS[t.bi] : null; return !!(b && (b.use === 'scuola' || PUBLIC.test(b.id || ''))); };
  function ditta(st, t) {
    const M = st.soldi, k = tkey(t); if (!k) return null;
    let D = M.ditte[k]; if (D) return D;
    const b = t.k === 'b' ? G.BUILDINGS[t.bi] : null, pid = t.pid || (b && b.id) || '';
    D = M.ditte[k] = { k, t, label: t.label, pub: isPublicT(t), bank: !!(b && b.use === 'banca'), curia: CURIA.test(pid), fam: pid === 'magazzino', conto: 'd:' + k, cash: 0, week: 0, staff: 0, rev: 0, revW: 0, owner: null, arrDec: 0, arrPizzo: 0 };
    if (D.pub) D.conto = 'stato';
    else acct(st, D.conto, { kind: 'ditta', label: t.label, owner: k });
    return D;
  }
  // la cassa (contanti) di una ditta: quella della bottega se è una bottega, del laboratorio se è un laboratorio
  function till(st, D) { const E = Ec.eco(st); return E.shops[D.k] || E.work[D.k] || D; }
  function tillAdd(st, D, x) { if (!D) return; const T = till(st, D); T.cash = (T.cash || 0) + x; if (x > 0) D.rev += x; }
  function dittaAt(st, ref) { if (!ref) return null; if (typeof ref === 'object') return ditta(st, ref); const ts = refTargets(ref); return ts.length ? ditta(st, ts[0]) : null; }
  // i consumi: chi spende (bar, botteghe, servizi) lo fa più o meno dove si lavora: in proporzione a quanto paga ogni ditta
  function shopsW(st) {
    const M = st.soldi; if (M._w && M._wT > st.t - 1440) return M._w;
    const list = Object.values(M.ditte).filter(D => !D.pub && !D.bank && !D.fam).map(D => [D, D.week + (Ec.shopAt(st, D.t) ? 60 : 0) + 10]);
    let tot = 0; list.forEach(x => { tot += x[1]; x[2] = tot; });
    M._w = { list, tot }; M._wT = st.t; return M._w;
  }
  function pickDitta(st) { const W = shopsW(st), r = rnd() * W.tot; return (W.list.find(x => x[2] >= r) || W.list[0])[0]; }
  // per cibo: un'osteria, un bar o una bottega di alimentari, tra le più vicine
  function pickFood(st, n) {
    const E = Ec.eco(st), at = n.pop && n.pop.at;
    const l = Object.values(E.shops).filter(Sh => !Sh.black && !Sh.market && (Sh.sells.pasto || Sh.sells.pane));
    if (!l.length) return pickDitta(st);
    const Sh = at ? l.sort((a, b) => dist(a.t.x, a.t.y, at.x, at.y) - dist(b.t.x, b.t.y, at.x, at.y))[Math.floor(rnd() * Math.min(3, l.length))] : l[Math.floor(rnd() * l.length)];
    return ditta(st, Sh.t);
  }

  // ================= AGGANCI DELLA VITA (popolo.js) =================
  const MONEY = I.MONEY;
  // la paga: la versa il padrone dal conto della ditta (o la mette in busta dalla cassa). Il resto resta un arretrato.
  function payOwed(st, n, why) {
    const P = n.pop, M = S(st), B = M.banca, amt = P.owed; if (!(amt > 0) || !P.job || !P.job.t) { P.owed = 0; return 0; }
    const D = ditta(st, P.job.t);
    if (D.owner === n.id) { P.owed = 0; return 0; }   // il padrone non si paga lo stipendio: si prende l'incasso
    let fromC = 0, fromT = 0; const C = D.bank ? null : acct(st, D.conto);
    if (D.bank) { fromC = amt; B.equity -= amt; }
    else {
      fromC = C.frozen ? 0 : Math.max(0, Math.min(amt, C.bal + C.fido)); C.bal -= fromC; mov(st, C, -fromC, `stipendio a ${n.name}`);
      if (fromC < amt) { const T = till(st, D); fromT = Math.max(0, Math.min(amt - fromC, (T.cash || 0) - 5)); T.cash -= fromT; }
    }
    // arriva sul conto (bonifico; la busta la si versa) o in tasca a chi non ce l'ha
    if (P.conto) { const A = acct(st, P.conto); A.bal += fromC; mov(st, A, fromC, `stipendio (${D.label})`); if (fromT) versa(st, P.conto, fromT, 'busta paga versata'); }
    else {
      const c = Math.min(fromC, B.vault); B.vault -= c;
      if (c < fromC) { if (D.bank) B.equity += fromC - c; else C.bal += fromC - c; fromC = c; }   // il Banco non ha contanti: la paga resta indietro
      P.money += c + fromT;
    }
    const paid = fromC + fromT; P.owed = Math.max(0, amt - paid); M.stats.stipendi += paid;
    if (P.owed > .5) {
      M.stats.nonPagati += P.owed;
      note(st, n, paid > 1 ? `${D.label}: pagato solo ${Math.round(paid)}.000 lire su ${Math.round(amt)}. Il resto «la settimana prossima»` : `${D.label} non ha pagato lo stipendio`, 'bad', { w: .6, tag: 'paga' });
      feel(n, 'rabbia', .12); feel(n, 'paura', .05); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .015, 0, 1);
    } else note(st, n, why || (P.conto ? `arrivato lo stipendio sul conto: ${Math.round(paid)}.000 lire` : `ritirato la paga in busta: ${Math.round(paid)}.000 lire`), 'good', { w: .2 });
    return paid;
  }
  MONEY.payday = (st, n) => payOwed(st, n);
  MONEY.advance = (st, n) => payOwed(st, n, 'il padrone gli ha dato un anticipo');
  // il cast (Wu, Gino, Rosaria…): la sera si prende quello che c'è in cassa oltre il fondo, fino al suo guadagno
  MONEY.castIncome = (st, n) => {
    const P = n.pop; S(st); const D = ditta(st, P.job.t); if (!D || D.pub) return;
    if (!D.owner) D.owner = n.id;
    const T = till(st, D), want = P.job.pay * 4, x = Math.max(0, Math.min(want, (T.cash || 0) - CFG.tillFloat));
    T.cash -= x; P.money += x; st.soldi.stats.utili += x;
  };
  // affitto e bollette: addebito sul conto il lunedì. Senza conto si paga all'Ufficio Case, in contanti. Se non passa: insoluto.
  MONEY.rent = (st, n) => {
    const P = n.pop, M = S(st), due = P.rent + CFG.bollette, tot = due + (P.arrAff || 0); let x = 0;
    if (P.conto && !acct(st, P.conto).frozen) x = xfer(st, P.conto, 'stato', tot, 'affitto e bollette (Ente Case del Garante)', true);
    else if (!P.conto) { const w = Math.min(tot, Math.max(0, P.money) + (P.mat || 0)); if (w >= due) { const fw = Math.min(w, Math.max(0, P.money)); P.money -= fw; P.mat -= (w - fw); versa(st, 'stato', w, 'affitti in contanti'); x = w; } }
    M.stats.affitti += x; P.arrAff = Math.max(0, tot - x);
    if (P.arrAff > .5) {
      M.stats.insoluti++;
      note(st, n, P.conto ? 'l\'affitto non è passato: il conto è scoperto' : 'non ce la fa a pagare l\'affitto', 'bad', { w: .5, tag: 'affitto' });
      feel(n, 'paura', .08);
      if (P.arrAff >= due * 3) visit(st, n);   // tre settimane di arretrati: l'ufficiale giudiziario
    }
  };
  // per le cifre grosse vengono a casa: l'ufficiale giudiziario con due Grigi, e si prendono i contanti
  function visit(st, n) {
    const P = n.pop, M = st.soldi, cash = Math.max(0, P.money) + (P.mat || 0), x = Math.min(P.arrAff, cash);
    const fw = Math.min(x, Math.max(0, P.money)); P.money -= fw; P.mat -= (x - fw); versa(st, 'stato', x, 'pignoramento');
    P.arrAff -= x; M.stats.visite++;
    note(st, n, `è venuto l'ufficiale giudiziario con due Grigi: si sono presi ${Math.round(x)}.000 lire${P.arrAff > 1 ? ', e ne vogliono ancora' : ''}`, 'bad', { w: .9, tag: 'affitto' });
    feel(n, 'paura', .3); feel(n, 'rabbia', .25); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .04, 0, 1);
    if (P.arrAff > 1) note(st, n, 'se non paga, a fine mese lo sfrattano', 'bad', { w: .7, tag: 'affitto' });
  }
  // spese di tutti i giorni e il cibo: in una cassa vera
  MONEY.spend = (st, n, x, why) => { S(st); if (!(x > 0)) return; const D = why === 'cibo' ? pickFood(st, n) : pickDitta(st); tillAdd(st, D, x); st.soldi.stats.consumi += x; };
  // gli oggetti della vita che costano (il bancone, il cinema, il barbiere, il cero…): li incassa il posto
  MONEY.paid = (st, n, o, c, t) => { S(st); const D = t ? ditta(st, t) : pickDitta(st); if (!D) return; if (D.pub) versa(st, 'stato', c, o.label); else tillAdd(st, D, c); st.soldi.stats.consumi += c; };
  // lo Squalo (la Famiglia) incassa i debiti
  MONEY.toFam = (st, x) => { if (st.fam) st.fam.cash += x; };
  // il vizio del gioco: le macchinette della sala giochi
  MONEY.gamble = (st, n, t) => { S(st); const sl = st.soldi.slots.find(s => s.k === tkey(t)) || st.soldi.slots[0]; if (sl) npcSlot(st, n, sl); };

  // ================= ECONOMIA: ingrosso e nave =================
  Ec.HOOK.paid = true;
  // chi vende paga chi produce (all'ingrosso), dalla cassa
  Ec.HOOK.wholesale = (st, W, Sh, g, q) => { const M = S(st); const v = q * Ec.MERCI[g][1] * CFG.ingrosso; if (!(v > 0)) return; Sh.cash -= v; W.cash = (W.cash || 0) + v; const D = ditta(st, W.t); if (D) D.rev += v; M.stats.ingrosso += v; };
  // la nave si fa pagare quello che scarica: dal conto della bottega, e i contanti partono per il continente
  Ec.HOOK.ship = (st, bought) => {
    const M = S(st), B = M.banca;
    Object.entries(bought).forEach(([k, v]) => {
      const D = M.ditte[k]; if (!D || !(v > 0) || D.pub) return; const due = v * CFG.nave;
      const C = acct(st, D.conto); const paid = C.frozen ? 0 : Math.max(0, Math.min(due, C.bal + C.fido)); C.bal -= paid; mov(st, C, -paid, 'merce della nave dell\'Impero');
      const T = till(st, D); const fromT = Math.max(0, Math.min(due - paid, (T.cash || 0) - 10)); T.cash -= fromT;
      // l'Impero vuole contanti: escono dal caveau (quello che manca resta un debito del Banco con l'Impero)
      const out = Math.min(paid, Math.max(0, B.vault - 800)); B.vault -= out; B.debitoImpero += paid - out; M.fuori += out + fromT; M.stats.import += paid + fromT;
    });
  };
  // quello che l'isola vende alla nave: lo scatolame del conservificio, il sale, il vino e l'olio in più
  function exportsDay(st) {
    const M = st.soldi, E = Ec.eco(st), B = M.banca; let tot = 0;
    Object.values(E.work).concat(Object.values(E.shops)).forEach(W => {
      if (W.black || W.market) return;
      [['scatolame', 40], ['sale', 20], ['vino', 30], ['olio', 15], ['formaggio', 10]].forEach(([g, keep]) => {
        const q = Math.floor((W.stock[g] || 0) - keep); if (q < 4) return;
        const D = ditta(st, W.t); if (!D) return;
        const v = q * Ec.MERCI[g][1] * .6; W.stock[g] -= q;
        if (D.pub) versa(st, 'stato', v, 'esportazioni'); else { const C = acct(st, D.conto); C.bal += v; B.vault += v; mov(st, C, v, `${Ec.MERCI[g][0]} venduto alla nave`); D.rev += v; }
        M.fuori -= v; tot += v;
      });
    });
    M.stats.export += tot;
    if (B.debitoImpero > 0 && B.vault > 1500) { const x = Math.min(B.debitoImpero, B.vault - 1500); B.vault -= x; B.debitoImpero -= x; M.fuori += x; }
  }

  // ================= RISACCA: le casse delle botteghe =================
  RS.EXT.spendAt = (st, ref, amt) => { S(st); const D = dittaAt(st, ref); if (!D) return; if (D.pub) versa(st, 'stato', amt, 'pagamento'); else tillAdd(st, D, amt); };
  // svaligiare una bottega: c'è quello che c'è in cassa (force: chi compra paga anche se la cassa non basta)
  RS.EXT.takeTill = (st, ref, want, force) => { S(st); const D = dittaAt(st, ref); if (!D || D.pub) return want; const T = till(st, D); const x = force ? want : Math.max(0, Math.min(want, T.cash || 0)); T.cash -= x; return x; };

  // i lavori della Risacca guadagnano da qualcuno: dai clienti (tasche della gente), dalla colletta (chi la pensa come noi),
  // dalla ditta dove si lavora, dalla pescheria che compra il pesce, dal continente (il contrabbando: soldi che entrano nell'isola)
  function fromWallets(st, n, want, colletta) {
    let got = 0; const at = n || st.player, all = st.npcs, N = all.length;
    for (let i = 0; i < 40 && got < want - 1e-6; i++) {
      const k = all[Math.floor(rnd() * N)]; if (!k || !k.pop || k.dead || k === n || k.pop.money <= 3 || (k.ris && k.ris.member)) continue;
      if (dist(k.x, k.y, at.x, at.y) > 400 && i < 30) continue;
      if (colletta && (!k.ris || k.ris.ideo < .25)) continue;
      const share = colletta ? .06 + k.ris.ideo * .2 : .15, x = Math.min(want - got, k.pop.money * share); k.pop.money -= x; got += x;
    }
    return got;
  }
  RS.EXT.earnFrom = (st, n, T, amt, src) => {
    const M = S(st); T._acc = (T._acc || 0) + amt; if (Math.abs(T._acc) < 3) return 0;
    const want = T._acc; T._acc = 0; let got = 0;
    if (want < 0) {   // la bisca è andata male: i soldi li vince qualcun altro
      const k = st.npcs.filter(k => k.pop && !k.dead && k !== n)[Math.floor(rnd() * st.npcs.length * .9)] || st.npcs.find(k => k.pop && !k.dead); if (k) k.pop.money += -want; return want;
    }
    if (src === 'fuori') { M.fuori -= want; got = want; }
    else if (src.startsWith('ditta:')) { const D = dittaAt(st, src.slice(6)); if (D && !D.pub) { const T0 = till(st, D), a = Math.max(0, Math.min(want, (T0.cash || 0) - 5)); T0.cash -= a; got = a + preleva(st, D.conto, want - a, null, `paga a ${n ? n.name : 'qualcuno'}`); } else if (D && D.pub) { got = preleva(st, 'stato', want, null, 'paga'); } else got = fromWallets(st, n, want); }
    else if (src === 'pesce') { const D = dittaAt(st, 'use:pescheria') || dittaAt(st, 'osteria'); const T0 = D && till(st, D); if (T0) { T0.cash = (T0.cash || 0) - want; got = want; if (T0.stock) T0.stock.pesce = (T0.stock.pesce || 0) + want / 4; } }
    else got = fromWallets(st, n, want, src === 'colletta');
    M.stats.risacca = (M.stats.risacca || 0) + got;
    return got;
  };

  // soldi che passano di mano fuori da qui (la Famiglia: riciclaggio, mazzette, sequestri, la roba comprata sul continente)
  function flow(st, to, amt, why) {
    if (!(amt > 0) || !st.pop) return; const M = S(st);
    if (to === 'stato') { versa(st, 'stato', amt, why); return; }
    if (to === 'fuori') { M.fuori += amt; return; }
    if (to && to.pop) { to.pop.money += amt; return; }
    const D = dittaAt(st, to); if (!D) { M.fuori += amt; return; } if (D.pub) versa(st, 'stato', amt, why); else tillAdd(st, D, amt);
  }

  // ================= OGNI ORA =================
  const hash = s => { let h = 0; s = String(s); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  function bankOpen(st) { const wd = Po.weekday(st.t), m = Math.floor(st.t) % 1440; return wd < 5 && ((m >= 510 && m < 810) || (m >= 870 && m < 960)); }
  function atmFor(st, n, want) {
    const M = st.soldi, at = (n.pop && n.pop.at) || n;
    const ok = M.atms.filter(a => !(a.broken > st.t) && a.cash >= Math.min(want, 20));
    return ok.sort((a, b) => dist(a.x, a.y, at.x, at.y) - dist(b.x, b.y, at.x, at.y))[0] || null;
  }
  function npcCash(st, h) {
    const M = st.soldi, open = bankOpen(st);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || n.jailedUntil > st.t) return;
      if ((hash(n.id) + h) % 3) return;
      if (P.conto) {
        const A = acct(st, P.conto);
        if (P.money < CFG.wallLow && A.bal > 5) {
          if (A.frozen) { if (!P._frz || st.t - P._frz > 1440) { P._frz = st.t; note(st, n, 'al bancomat la tessera non va: la Tutela gli ha bloccato il conto', 'bad', { w: .6 }); feel(n, 'rabbia', .1); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .02, 0, 1); } return; }
          const want = Math.min(A.bal, 40 + (P.job ? P.job.pay * 6 : 15));
          const atm = atmFor(st, n, want);
          let x = atm ? preleva(st, P.conto, want, atm, `prelievo (${atm.label})`) : 0;
          if (!x && open) x = preleva(st, P.conto, want, null, 'prelievo allo sportello');
          if (x) { P.money += x; M.stats.prelievi += x; }
          else if (!P._atm || st.t - P._atm > 1440) { P._atm = st.t; M.stats.bancomatVuoti++; note(st, n, 'i bancomat sono vuoti: niente contanti', 'bad', { w: .3, tag: 'scarsita' }); feel(n, 'rabbia', .03); }
        } else if (P.money > CFG.wallHigh && open && rnd() < .5) { const x = P.money - 70; P.money -= x; versa(st, P.conto, x, 'versamento allo sportello'); M.stats.versamenti += x; }
      } else {
        if (P.money < 8 && P.mat > 0) { const x = Math.min(P.mat, 30); P.mat -= x; P.money += x; }
        else if (P.money > 110) { const x = P.money - 60; P.money -= x; P.mat = (P.mat || 0) + x; }
      }
    });
  }
  // la sera si spende quello che si ha in tasca oltre la riserva: bar, botteghe, servizi
  function consumi(st) {
    const M = st.soldi;
    st.npcs.forEach(n => { const P = n.pop; if (!P || n.dead || n.jailedUntil > st.t) return; const x = clamp((P.money - CFG.riserva) * CFG.propensione, 0, 60); if (x < 1) return; P.money -= x; tillAdd(st, pickDitta(st), x); M.stats.consumi += x; });
  }
  // casse in rosso: il padrone porta i contanti dal Banco. Casse troppo piene: la mattina si versa.
  function tills(st, h) {
    const M = st.soldi, open = bankOpen(st);
    Object.values(M.ditte).forEach(D => {
      if (D.pub) return; const T = till(st, D);
      if (T.cash === undefined) T.cash = 0;
      if (T.cash < 0 && !D.bank) { const x = preleva(st, D.conto, -T.cash, null, 'contanti per la cassa'); T.cash += x; }
      if (h === 9 && open && T.cash > CFG.tillDeposit && !D.fam && !D.bank) { const x = T.cash - 60; T.cash -= x; versa(st, D.conto, x, 'versamento dell\'incasso'); M.stats.versamenti += x; }
    });
  }
  // il caffè dei bar viene da Wu e dall'Emporio
  function barRestock(st) {
    const E = Ec.eco(st), shops = Object.values(E.shops), bar = Sh => /^Bar|Sirena|Gelateria/.test(Sh.label);
    shops.filter(Sh => Sh.sells.caffe && bar(Sh)).forEach(Sh => {
      if ((Sh.stock.caffe || 0) >= 5) return; const src = shops.find(X => X !== Sh && X.sells.caffe && !bar(X) && !X.black && (X.stock.caffe || 0) > 6);
      if (!src) return; const q = Math.min(6, src.stock.caffe - 6); src.stock.caffe -= q; Sh.stock.caffe = (Sh.stock.caffe || 0) + q * 4; const v = q * Ec.MERCI.caffe[1]; src.cash += v; Sh.cash -= v;
    });
  }

  // ================= LA SETTIMANA: decima, pizzo, banca, Stato =================
  function decima(st) {
    const M = st.soldi, rate = st.ris && RS.reprLevel(st) >= 3 ? CFG.decimaDura : CFG.decima;
    Object.values(M.ditte).forEach(D => {
      if (D.pub || D.bank || D.curia || D.fam) return; const due = D.revW * rate + D.arrDec; if (due < 1) return;
      const x = xfer(st, D.conto, 'stato', due, 'decima del Garante', true); M.stats.decima += x; D.arrDec = due - x;
      if (D.arrDec > 60) {   // i Grigi in bottega: si prendono l'incasso
        const T = till(st, D), y = Math.max(0, Math.min(D.arrDec, T.cash || 0)); T.cash -= y; versa(st, 'stato', y, 'sequestro della decima'); D.arrDec -= y; M.stats.sequestri++;
        const o = D.owner && G.byId(st, D.owner); if (o && o.pop) { note(st, o, `i Grigi in bottega: si sono presi ${Math.round(y)}.000 lire di decima arretrata`, 'bad', { w: .8 }); feel(o, 'rabbia', .2); if (o.ris) o.ris.ideo = clamp(o.ris.ideo + .04, 0, 1); }
        news(st, `I Grigi hanno sequestrato l'incasso di ${D.label}: decima non pagata.`);
      }
    });
  }
  function pizzo(st) {
    const M = st.soldi, F = st.fam; if (!F) return;
    const pz = PLACES.piazza;
    Object.values(M.ditte).forEach(D => {
      const Sh = Ec.shopAt(st, D.t);
      if (D.pub || D.bank || D.curia || D.fam || !Sh || Sh.emporio || Sh.market) return;
      if (pz && dist(D.t.x, D.t.y, pz.x, pz.y) > 260) return;
      const due = Math.round(4 + Math.min(12, D.revW / 40)) + D.arrPizzo;
      const x = xfer(st, D.conto, 'fam', due, 'fattura Vigilanza Tirrena s.r.l.', true); M.stats.pizzo += x; D.arrPizzo = due - x;
      if (D.arrPizzo > 30) {   // gli esattori: per le cifre grosse vengono di persona
        const T = till(st, D), y = Math.max(0, Math.min(D.arrPizzo, T.cash || 0)); T.cash -= y; F.cash += y; D.arrPizzo -= y; M.stats.esattori++;
        const o = D.owner && G.byId(st, D.owner); if (o && o.pop) { note(st, o, `sono passati due della Famiglia: si sono presi ${Math.round(y)}.000 lire dalla cassa`, 'bad', { w: .8, tag: 'squalo' }); feel(o, 'paura', .3); }
      }
    });
  }
  function bankWeek(st) {
    const M = st.soldi, B = M.banca;
    // spese di tenuta conto e interessi sugli scoperti
    Object.values(M.conti).forEach(A => { if (A.kind === 'stato') return; if (A.kind === 'persona' && A.bal > 1) { A.bal -= .3; B.equity += .3; } if (A.bal < 0) { const i = -A.bal * .01; A.bal -= i; B.equity += i; } });
    // il prestito del giocatore: interessi e rata
    const Lo = M.player.loan;
    if (Lo) {
      const int = Lo.amt * CFG.prestitoTasso; Lo.amt += int; B.mutui += int; B.equity += int;
      const A = acct(st, 'player'), rata = Math.min(Lo.amt, Lo.rata), x = A.frozen ? 0 : Math.max(0, Math.min(rata, A.bal));
      A.bal -= x; Lo.amt -= x; B.mutui -= x; mov(st, A, -x, 'rata del prestito');
      if (x < rata - .5) { Lo.missed = (Lo.missed || 0) + 1; G.feed(st, `La rata del prestito non è passata (${Lo.missed}ª volta). Il Banco ti ha segnalato.`, 'bad'); }
      if (Lo.amt < 1) { B.mutui -= Lo.amt; B.equity -= Lo.amt; M.player.loan = null; G.feed(st, 'Prestito restituito.', 'good'); }
    }
    // lo Stato: le forniture della Tutela (una parte torna all'isola) e il tributo al continente
    const So = acct(st, 'stato');
    if (So.bal > CFG.statoRiserva) {
      const ex = So.bal - CFG.statoRiserva, trib = ex * CFG.tributo, forn = ex * .5;
      const out = Math.min(trib, Math.max(0, B.vault - 1500)); So.bal -= out; B.vault -= out; M.fuori += out; M.stats.tributo += out;
      for (let i = 0; i < 6; i++) { const D = pickDitta(st); const x = forn / 6; So.bal -= x; const C = acct(st, D.conto); C.bal += x; mov(st, C, x, 'forniture per la Tutela'); D.rev += x; }
      M.stats.forniture += forn;
      if (out > 1) news(st, `La nave porta al continente il tributo del Garante: ${L(out)}.`);
    }
    // la Famiglia ritira dalla Vigilanza Tirrena: soldi puliti
    const Fa = acct(st, 'fam'); if (st.fam && Fa.bal > 20) { const x = preleva(st, 'fam', Fa.bal - 20, null, 'prelievo della Vigilanza'); st.fam.clean = (st.fam.clean || 0) + x; }
    // gli incassi della settimana (per decima e pizzo)
    Object.values(M.ditte).forEach(D => { D.revW = D.rev; D.rev = 0; });
  }

  // ================= IL PORTAVALORI =================
  const van = st => st.vehicles.find(v => v.id === st.soldi.van.vid);
  function crew(st) { return st.npcs.find(n => n.pop && !n.dead && n.jailedUntil <= st.t && n.pop.job && n.pop.job.base === CFG.vanCrew && !(n.pop.emer && n.pop.emer.prio >= 3)); }
  function vanRun(st, kind) {
    const M = st.soldi, B = M.banca, V = M.van, v = van(st), bt = bankT();
    if (V.cargo > 0 && v && !v.wreck && !V.crew) { B.vault += V.cargo; V.cargo = 0; }   // quello che era rimasto nel furgone torna al caveau
    const stops = [];
    if (kind === 'mattina') {
      const need = M.atms.filter(a => !(a.broken > st.t)).reduce((s, a) => s + Math.max(0, CFG.atmCap - a.cash), 0);
      const load = Math.max(0, Math.min(need, B.vault - 300)); if (load < 50) return;
      B.vault -= load; V.cargo += load;
      M.atms.forEach(a => { if (a.broken > st.t) return; stops.push({ x: a.x, y: a.y, label: a.label, act: () => { const x = Math.min(V.cargo, CFG.atmCap - a.cash); if (x > 0) { a.cash += x; V.cargo -= x; } } }); });
    } else {
      const ds = Object.values(M.ditte).filter(D => !D.pub && !D.bank && !D.fam && (till(st, D).cash || 0) > 80).sort((a, b) => till(st, b).cash - till(st, a).cash).slice(0, CFG.vanStops);
      if (!ds.length) return;
      ds.forEach(D => stops.push({ x: D.t.x, y: D.t.y, label: D.label, act: () => { const T = till(st, D), x = Math.max(0, (T.cash || 0) - CFG.tillFloat); if (x > 0) { T.cash -= x; V.cargo += x; const C = acct(st, D.conto); C.bal += x; mov(st, C, x, 'incasso ritirato dal portavalori'); M.stats.versamenti += x; } } }));
    }
    // il giro più corto: dal Banco, sempre alla tappa più vicina
    const order = []; let cur = bt; while (stops.length) { stops.sort((a, b) => dist(a.x, a.y, cur.x, cur.y) - dist(b.x, b.y, cur.x, cur.y)); cur = stops.shift(); order.push(cur); }
    const unload = () => { if (V.cargo > 0) { B.vault += V.cargo; V.cargo = 0; } };
    const n = crew(st);
    M.stats.giri++; V.runs++; V.last = kind;
    if (!n || !v || v.wreck || v.hidden || (v.rider && v.rider !== 'npc:' + n.id)) {   // niente furgone o niente guardie: il giro lo fanno a mano, in fretta
      M.stats.giriSaltati++;
      order.forEach(s => s.act()); unload(); return;
    }
    if (!n.weapon) n.weapon = 'pistola';
    const back = { x: bt.x, y: bt.y, label: 'Banco di Porto Vecchio' };
    const steps = order.map(s => ({ label: `portavalori: ${s.label}`, drive: { veh: () => van(st), to: () => s }, dur: 4, act: () => { s.act(); return 'next'; } }))
      .concat([{ label: 'portavalori: rientra al Banco', drive: { veh: () => van(st), to: () => back }, dur: 3, act: () => { unload(); return 'next'; } }]);
    V.crew = n.id;
    const pl = Az.startPlan(st, n, 'portavalori', kind === 'mattina' ? 'il giro dei bancomat' : 'il giro degli incassi', steps, 3, {
      onEnd: (st, n, why) => { V.crew = null; if (why !== 'fatto' && V.cargo > 0) news(st, `Il portavalori si è fermato a metà giro. Dentro ci sono ancora ${L(V.cargo)}.`); } });
    if (!pl) { V.crew = null; order.forEach(s => s.act()); unload(); }
  }
  // il furgone distrutto: le banconote per strada
  function vanTick(st) {
    const M = st.soldi, V = M.van; if (!(V.cargo > 0)) return;
    const v = van(st); if (!v || !v.wreck) return;
    const k = 4 + Math.floor(rnd() * 3), each = Math.floor(V.cargo / k), rest = V.cargo - each * k;
    for (let i = 0; i < k; i++) st.pickups.push({ id: st.nextId++, kind: 'soldi', x: v.x + (rnd() - .5) * 3, y: v.y + (rnd() - .5) * 3, amount: each + (i === 0 ? rest : 0), drop: true });
    M.banca.equity -= V.cargo; V.cargo = 0;
    news(st, 'Il portavalori è saltato in aria: banconote per tutta la strada.');
  }

  // ================= L'AZZARDO =================
  const SYM = ['CILIEGIA', 'LIMONE', 'CAMPANA', 'BAR', 'SETTE'], SW = [30, 25, 20, 15, 10];
  const PAY3 = { CILIEGIA: 5, LIMONE: 8, CAMPANA: 15, BAR: 30, SETTE: 100 };
  function reel() { let r = rnd() * 100; for (let i = 0; i < SYM.length; i++) { r -= SW[i]; if (r < 0) return SYM[i]; } return SYM[0]; }
  function spinOnce() { const R = [reel(), reel(), reel()]; let m = 0; if (R[0] === R[1] && R[1] === R[2]) m = PAY3[R[0]]; else if (R.filter(x => x === 'CILIEGIA').length === 2) m = 1.5; return { reels: R, mult: m }; }
  function npcSlot(st, n, sl) {
    const P = n.pop, M = st.soldi; const k = Math.floor(Math.min(3 + rnd() * 10, Math.max(0, P.money))); if (k < 1) return;
    let win = 0; for (let i = 0; i < k; i++) win += spinOnce().mult;
    sl.box += k; win = Math.min(win, sl.box); sl.box -= win; P.money += win - k; M.stats.slotGiocato += k; M.stats.slotPagato += win;
    if (Math.abs(win - k) >= 4) note(st, n, win > k ? `vinto ${Math.round(win - k)}.000 lire alle macchinette di ${sl.label}` : `perso ${Math.round(k - win)}.000 lire alle macchinette di ${sl.label}`, win > k ? 'good' : 'bad', { w: .25 });
  }
  // chi ha il vizio passa dal bar e infila qualche moneta
  function npcGamble(st, h) {
    if (h < 15 || h > 23) return; const M = st.soldi;
    st.npcs.forEach(n => { const P = n.pop; if (!P || n.dead || P.vice !== 'gioco' || !P.at || rnd() > .35) return; const sl = M.slots.find(s => s.k === tkey(P.at)); if (sl) npcSlot(st, n, sl); });
  }
  // la domenica notte la Famiglia svuota le macchinette: due terzi a lei, un terzo al bar
  function slotRound(st) {
    const M = st.soldi; let tot = 0;
    M.slots.forEach(sl => { const x = Math.max(0, sl.box - 30 * sl.n); if (x < 1) return; sl.box -= x; const D = ditta(st, sl.t), fam = st.fam ? x * (D && D.fam ? 1 : .67) : 0; if (st.fam) st.fam.cash += fam; tillAdd(st, D, x - fam); tot += x; });
    if (tot > 0 && st.fam && st.fam.stats && st.fam.stats.entrate) st.fam.stats.entrate.macchinette = (st.fam.stats.entrate.macchinette || 0) + tot * .67;
  }
  // Lotto del Garante: estrazione il sabato alle 19 sulla ruota di Porto Vecchio
  function lottoNpc(st) {
    const M = st.soldi, tab = refTargets('use:tabacchi');
    st.npcs.forEach(n => { const P = n.pop; if (!P || n.dead || n.jailedUntil > st.t) return; const p = P.vice === 'gioco' ? .5 : P.money < 15 ? .1 : P.faith > .6 ? .08 : .04; if (rnd() > p || P.money < 2) return;
      const stake = 1, nums = draw(2); P.money -= stake; sellTicket(st, tab[Math.floor(rnd() * tab.length)], stake); M.lotto.tickets.push({ who: n.id, nums, stake }); });
  }
  function sellTicket(st, t, stake) { const M = st.soldi; const D = t ? ditta(st, t) : null; const ag = D ? stake * CFG.lottoAggio : 0; if (D) tillAdd(st, D, ag); versa(st, 'stato', stake - ag, 'Lotto del Garante'); M.stats.lottoIncasso += stake; }
  function draw(k) { const s = new Set(); while (s.size < k) s.add(1 + Math.floor(rnd() * 90)); return [...s]; }
  function lottoPrize(t, ex) { const h = t.nums.filter(x => ex.includes(x)).length; if (t.nums.length === 2) return h === 2 ? t.stake * 250 : 0; if (t.nums.length === 3) return h === 3 ? t.stake * 4250 : h === 2 ? t.stake * 83 : 0; return 0; }
  function lottoDraw(st) {
    const M = st.soldi, ex = draw(5), wins = [];
    M.lotto.tickets.forEach(t => {
      const p = lottoPrize(t, ex); if (!p) return; M.stats.lottoVincite += p;
      if (t.who === 'player') {
        const x = Math.min(p, M.banca.vault); acct(st, 'stato').bal -= x; M.banca.vault -= x; st.player.money += x; pmov(st, x, 'vincita al Lotto');
        if (p > x) { M.player.conto = true; xfer(st, 'stato', 'player', p - x, 'vincita al Lotto (vaglia)'); }
        wins.push(`tu (${L(p)})`); G.feed(st, `Lotto del Garante: hai vinto ${L(p)}!`, 'money'); st.sfx.push({ k: 'cash' }); return;
      }
      const n = G.byId(st, t.who); if (!n || !n.pop) return;
      if (n.pop.conto) xfer(st, 'stato', n.pop.conto, p, 'vincita al Lotto'); else { const x = Math.min(p, M.banca.vault); acct(st, 'stato').bal -= x; M.banca.vault -= x; n.pop.money += x; }
      note(st, n, `vinto al Lotto del Garante: ${Math.round(p)}.000 lire!`, 'good', { w: .9 }); feel(n, 'svago', -.4); wins.push(`${n.name} (${L(p)})`);
    });
    M.lotto.last = { t: st.t, nums: ex, wins }; M.lotto.hist.unshift(M.lotto.last); M.lotto.hist = M.lotto.hist.slice(0, 6); M.lotto.tickets = [];
    G.addLog(st, `${G.clockStr(st.t)} · Lotto del Garante, ruota di Porto Vecchio: ${ex.join(' · ')}.${wins.length ? ' Vincono: ' + wins.join(', ') + '.' : ' Nessun vincitore.'}`, 'info');
  }

  // ================= CHE NE È DELLA CASSA COMUNE =================
  function cassaWatch(st) {
    const R = st.ris, M = st.soldi, p = st.player; if (!R) return;
    if (R.cassa === undefined) R.cassa = 0;
    if (R.cassaAt) { const b = R.bases.find(k => k.id === R.cassaAt); if (!b || !b.alive) { const x = Math.round(R.cassa * .7); R.cassa -= x; versa(st, 'stato', x, 'sequestro: cassa della Risacca'); R.cassaAt = null; G.feed(st, `I Grigi hanno trovato la cassa nella base: sequestrati ${L(x)}. Il resto l'hanno salvato i nostri.`, 'bad'); news(st, `Sequestrati ${L(x)} alla Risacca.`); } }
    if (p.arrests !== M.player.arrests) { M.player.arrests = p.arrests; if (!R.cassaAt && R.cassa > 0) { const x = Math.round(R.cassa * .5); R.cassa -= x; versa(st, 'stato', x, 'sequestro: cassa della Risacca'); G.feed(st, `Ti hanno preso con la cassa addosso: ${L(x)} sequestrati.`, 'bad'); } }
    // la Tutela congela i conti dei sospetti
    const A = M.conti.player; if (A && !A.frozen && RS.reprLevel(st) >= 3 && (p.arrests > 0 || (G.wantedLevel && G.wantedLevel(st) >= 2))) { A.frozen = true; M.stats.congelati++; G.feed(st, 'La Tutela ha congelato il tuo conto al Banco. Quei soldi, per ora, non esistono.', 'bad'); }
    st.npcs.forEach(n => { if (n.ris && n.ris.member && n.jailedUntil > st.t && n.pop && n.pop.conto) { const B = acct(st, n.pop.conto); if (!B.frozen) { B.frozen = true; M.stats.congelati++; note(st, n, 'la Tutela gli ha congelato il conto', 'bad', { w: .7 }); } } });
  }
  function news(st, s) { const M = st.soldi; M.news.unshift({ t: st.t, s }); M.news = M.news.slice(0, 20); G.addLog(st, `${G.clockStr(st.t)} · ${s}`, 'info'); }
  function pmov(st, amt, why) { const M = st.soldi; M.player.mov.unshift([st.t, r1(amt), why]); M.player.mov = M.player.mov.slice(0, 24); }

  // ================= IL LIBRO MASTRO =================
  function cashTotal(st) {
    const M = st.soldi, E = Ec.eco(st), F = st.fam, R = st.ris; let c = 0;
    st.npcs.forEach(n => { if (n.pop) c += (n.pop.money || 0) + (n.pop.mat || 0); });
    c += st.player.money || 0;
    Object.values(E.shops).forEach(Sh => { c += Sh.cash || 0; }); Object.values(E.work).forEach(W => { c += W.cash || 0; });
    Object.values(M.ditte).forEach(D => { if (!E.shops[D.k] && !E.work[D.k]) c += D.cash || 0; });
    c += M.banca.vault + M.atms.reduce((s, a) => s + a.cash, 0) + M.van.cargo;
    if (R) c += R.cassa || 0;
    if (F) c += (F.cash || 0) + (F.dirty || 0) + (F.clean || 0) + (F.treasure || 0);
    c += M.slots.reduce((s, x) => s + x.box, 0);
    st.pickups.forEach(k => { if (k.kind === 'soldi' && !k.takenAt) c += k.amount || 0; });
    return c;
  }
  function deposits(st) { return Object.values(st.soldi.conti).reduce((s, A) => s + A.bal, 0); }
  // il bilancio del Banco: caveau + bancomat + furgone + prestiti = conti + patrimonio + debito con l'Impero
  function bankCheck(st) { const M = st.soldi, B = M.banca; return r1(B.vault + M.atms.reduce((s, a) => s + a.cash, 0) + M.van.cargo + B.mutui - deposits(st) - B.equity - B.debitoImpero); }
  function hourly(st, h, wd) {
    const M = st.soldi, c0 = M._c === undefined ? cashTotal(st) : M._c, f0 = M.fuori;
    tills(st, h);
    npcCash(st, h);
    npcGamble(st, h);
    if (h === 21) consumi(st);
    if (wd < 6 && h === 7) vanRun(st, 'mattina');
    if (wd < 6 && h === 18) vanRun(st, 'sera');
    if (h === 8) barRestock(st);
    if (wd === 0 && h === 8) bankWeek(st);
    if (wd === 0 && h === 11) decima(st);
    if (wd === 5 && h === 11) pizzo(st);
    if (wd === 6 && h === 23) slotRound(st);
    if (wd >= 2 && wd <= 5 && h === 11) lottoNpc(st);
    if (wd === 5 && h === 19) lottoDraw(st);
    if ((wd === 0 || wd === 3) && h === 7) exportsDay(st);
    cassaWatch(st);
    // quanto denaro è comparso o sparito senza passare di mano (i vecchi giri della malavita, le multe, i premi…)
    const c1 = cashTotal(st); M.leak += (c1 - c0) + (M.fuori - f0); M._c = c1;
    if (h === 0) { M.days.push({ t: st.t, cash: Math.round(c1), dep: Math.round(deposits(st)), vault: Math.round(M.banca.vault), atm: Math.round(M.atms.reduce((s, a) => s + a.cash, 0)), fuori: Math.round(M.fuori), leak: Math.round(M.leak), bank: bankCheck(st) }); if (M.days.length > 60) M.days.shift(); }
  }
  function install() {
    const H = G.HOOKS; if (H.__soldi) return; H.__soldi = true;
    const s0 = H.step;
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const M = S(st), hm = Math.floor(st.t / 60);
      if (M.hour !== hm) { if (M.hour < 0) M._c = cashTotal(st); M.hour = hm; hourly(st, hm % 24, Po.weekday(st.t)); }
      vanTick(st);
    };
  }
  install();

  // ================= IL GIOCATORE =================
  const p_ = st => st.player;
  const armed = st => { const p = st.player; return (p.cur && p.cur !== 'pugni' && G.WEAPONS[p.cur] && !p.hand) || p.hand === 'coltello' || p.hand === 'piede'; };
  const gunned = st => { const p = st.player; return !!(p.cur && p.cur !== 'pugni' && G.WEAPONS[p.cur] && !G.WEAPONS[p.cur].melee && !p.hand); };
  const night = st => { const h = G.hour(st); return h >= 22 || h < 5; };
  const attrezzi = st => st.player.hand === 'piede' || !!(st.player.inv && st.player.inv.piede > 0) || !!(st.ris && RS.totalRes(st, 'attrezzi') > 0);
  function nearAtm(st, r) { const p = p_(st); return S(st).atms.filter(a => dist(a.x, a.y, p.x, p.y) < (r || 2.6)).sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0] || null; }
  function nearShop(st) { const p = p_(st), E = Ec.eco(st); return Object.values(E.shops).filter(Sh => dist(Sh.t.x, Sh.t.y, p.x, p.y) < 3.4).sort((a, b) => dist(a.t.x, a.t.y, p.x, p.y) - dist(b.t.x, b.t.y, p.x, p.y))[0] || null; }
  function nearSlot(st) { const p = p_(st); return S(st).slots.find(s => dist(s.x, s.y, p.x, p.y) < 4.5) || null; }
  function nearBase(st) { const R = st.ris; if (!R) return null; const p = p_(st); return R.bases.find(b => b.alive && dist(b.x, b.y, p.x, p.y) < 3.2) || null; }
  function cassaReach(st) { const R = st.ris; if (!R) return false; if (!R.cassaAt) return true; const b = nearBase(st); return !!(b && b.id === R.cassaAt); }
  function cassaWhere(st) { const R = st.ris; if (!R) return ''; if (!R.cassaAt) return 'con te'; const b = R.bases.find(k => k.id === R.cassaAt); return b ? b.name : 'sparita'; }
  // le azioni sul posto (per il HUD della Risacca e per le Tasche)
  function here(st) {
    const p = p_(st), out = [], M = S(st); if (st.over || p.vehicle) return out;
    const add = (id, label, arg, bad, panel) => out.push({ id: 'sd_' + id, label, arg: arg === undefined ? null : arg, bad: !!bad, panel });
    const atm = nearAtm(st);
    if (atm) { add('atm', atm.broken > st.t ? `${atm.label}: fuori servizio` : atm.label, atm.id, false, 'atm'); if (night(st) && atm.cash > 0 && !(atm.broken > st.t) && attrezzi(st)) add('atm_scasso', 'Forza il bancomat (piede di porco, 15 minuti)', atm.id, true); }
    const bt = M.banca.t;
    if (bt && dist(bt.x, bt.y, p.x, p.y) < 3.6) {
      add('banca', bankOpen(st) ? 'Banco di Porto Vecchio: sportello' : 'Banco di Porto Vecchio (chiuso)', null, false, 'banca');
      if (bankOpen(st) && gunned(st)) add('rapina', 'Rapina allo sportello', null, true);
      if (!bankOpen(st) && night(st) && attrezzi(st)) add('caveau', 'Entra nel caveau di notte (2 ore, attrezzi)', null, true);
    }
    const v = van(st);
    if (v && !v.wreck && M.van.cargo > 0 && dist(v.x, v.y, p.x, p.y) < 4.5) {
      if (v.rider && String(v.rider).startsWith('npc:') && armed(st) && Math.abs(v.speed || 0) < 1) add('assalto', `Assalta il portavalori (${L(M.van.cargo)} a bordo)`, null, true);
      else if (!v.rider) add('vano', 'Forza il vano blindato del portavalori', null, true);
    }
    const sl = nearSlot(st); if (sl) add('slot', `Macchinette (${sl.label})`, sl.id, false, 'slot');
    const h = G.hour(st);
    if ((h >= 22 || h < 4) && BISCA.some(id => PLACES[id] && dist(PLACES[id].x, PLACES[id].y, p.x, p.y) < 5)) add('bisca', 'Sette e mezzo alla bisca', null, false, 'bisca');
    const sh = nearShop(st);
    if (sh && h >= 7 && h < 22 && !(sh.market && ![2, 5].includes(Po.weekday(st.t)))) {
      add('banco', `Al banco: ${sh.label}`, sh.k, false, 'banco');
      if (/Tabacchi/.test(sh.label) && h < 20) add('lotto', 'Lotto del Garante (schedina)', sh.k, false, 'lotto');
    }
    if (st.ris && (cassaReach(st) && st.ris.cassaAt || nearBase(st))) add('cassa', `Cassa comune (${L(st.ris.cassa)})`, null, false, 'cassa');
    return out;
  }
  const R_ = (ok, msg, x) => Object.assign({ ok, msg: msg || '' }, x || {});
  function take(st, x, why) { const p = p_(st); p.money += x; pmov(st, x, why); }
  function pay(st, x, why) { const p = p_(st); if (p.money < x - 1e-6) return false; p.money -= x; pmov(st, -x, why); return true; }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  // tutte le operazioni del giocatore. Restituisce { ok, msg, ... }
  function act(st, id, arg, ex) {
    const M = S(st), p = p_(st), B = M.banca, R = st.ris; ex = ex || {};
    id = String(id).replace(/^sd_/, '');
    if (id === 'compra' && typeof Oggetti !== 'undefined') return Oggetti.act(st, 'compra', arg, ex);   // [oggetti] il bancone vende oggetti veri
    switch (id) {
      // ---- bancomat ----
      case 'atm_preleva': {
        const a = M.atms.find(k => k.id === arg); if (!a || a.broken > st.t) return R_(false, 'Fuori servizio.');
        if (!M.player.conto) return R_(false, 'Serve la tessera del Banco: apri un conto allo sportello.');
        const A = acct(st, 'player'); if (A.frozen) return R_(false, 'Tessera trattenuta. «Rivolgersi allo sportello.»');
        const x = preleva(st, 'player', Math.min(ex.q || 10, A.bal), a, `prelievo (${a.label})`); if (!x) return R_(false, a.cash < 1 ? 'Il bancomat è vuoto.' : 'Saldo insufficiente.');
        take(st, x, 'prelievo al bancomat'); st.sfx.push({ k: 'cash' }); return R_(true, `Prelevati ${L(x)}.`);
      }
      case 'atm_scasso': {
        const a = M.atms.find(k => k.id === arg); if (!a || a.broken > st.t || a.cash < 1) return R_(false, 'Non c\'è niente da prendere.');
        if (!attrezzi(st)) return R_(false, 'Serve un piede di porco.');
        st.t += 15; const x = Math.round(Math.min(a.cash, 120 + rnd() * 230)); a.cash -= x; a.broken = st.t + 1440; B.equity -= x;   /* si sfonda una cassetta sola */ take(st, x, 'bancomat forzato'); M.stats.rapine++; M.stats.refurtiva += x;
        G.emit(st, 'rapina', { shop: a.label }); if (R) R.repr = clamp(R.repr + 3, 0, 100); news(st, `Qualcuno ha sventrato il ${a.label}.`); st.sfx.push({ k: 'cash' });
        return R_(true, `Un quarto d'ora di leva e lamiera: ${L(x)}. L'allarme suona già.`);
      }
      // ---- sportello ----
      case 'apri_conto': { if (!bankOpen(st)) return R_(false, 'Chiuso.'); if (M.player.conto) return R_(false, 'Il conto ce l\'hai già.'); M.player.conto = true; acct(st, 'player', { kind: 'player', label: G.PLAYER_NAME || 'tu', owner: 'player' }); return R_(true, 'Conto aperto, tessera del bancomat in mano. Il cassiere copia i tuoi documenti in un registro con lo stemma del Garante.'); }
      case 'versa': {
        if (!bankOpen(st)) return R_(false, 'Chiuso.'); if (!M.player.conto) return R_(false, 'Prima apri un conto.');
        const q = Math.min(ex.q || 0, Math.floor(p.money)); if (q < 1) return R_(false, 'Niente da versare.'); if (acct(st, 'player').frozen) return R_(false, 'Il conto è congelato: non accettano versamenti.');
        pay(st, q, 'versamento'); versa(st, 'player', q, 'versamento allo sportello'); return R_(true, `Versati ${L(q)}.`);
      }
      case 'preleva': {
        if (!bankOpen(st)) return R_(false, 'Chiuso.'); if (!M.player.conto) return R_(false, 'Non hai un conto.');
        const x = preleva(st, 'player', ex.q || 0, null, 'prelievo allo sportello'); if (!x) return R_(false, acct(st, 'player').frozen ? 'Conto congelato dalla Tutela.' : 'Saldo insufficiente.');
        take(st, x, 'prelievo allo sportello'); st.sfx.push({ k: 'cash' }); return R_(true, `Prelevati ${L(x)}.`);
      }
      case 'prestito': {
        if (!bankOpen(st)) return R_(false, 'Chiuso.'); if (!M.player.conto) return R_(false, 'Senza conto niente prestiti.'); if (M.player.loan) return R_(false, 'Hai già un prestito da restituire.');
        const A = acct(st, 'player'); if (A.frozen) return R_(false, 'Il direttore non ti riceve.'); if (p.arrests > 1) return R_(false, '«Con i suoi precedenti? Non scherziamo.»');
        const q = clamp(ex.q || CFG.prestito, 50, CFG.prestito); A.bal += q; B.mutui += q; mov(st, A, q, 'prestito del Banco'); M.player.loan = { amt: q, rata: Math.ceil(q * .15), t: st.t };
        return R_(true, `Il direttore firma: ${L(q)} sul conto. Interessi del ${Math.round(CFG.prestitoTasso * 100)}% a settimana, rata di ${L(Math.ceil(q * .15))} ogni lunedì.`);
      }
      case 'rimborsa': {
        const Lo = M.player.loan; if (!Lo) return R_(false, 'Non hai debiti col Banco.'); const A = acct(st, 'player'); if (A.frozen) return R_(false, 'Conto congelato.');
        const x = Math.min(Lo.amt, Math.max(0, A.bal)); if (x < 1) return R_(false, 'Sul conto non c\'è niente.'); A.bal -= x; Lo.amt -= x; B.mutui -= x; mov(st, A, -x, 'rimborso del prestito');
        if (Lo.amt < 1) { B.mutui -= Lo.amt; B.equity -= Lo.amt; M.player.loan = null; } return R_(true, M.player.loan ? `Restituiti ${L(x)}. Ne mancano ${L(Lo.amt)}.` : 'Prestito chiuso.');
      }
      case 'rapina': {
        if (!bankOpen(st)) return R_(false, 'È chiuso.'); if (!gunned(st)) return R_(false, 'Senza un\'arma da fuoco in mano non ti prende sul serio nessuno.');
        if (st.t - B.robbedAt < 1440) return R_(false, 'Dopo l\'ultima rapina hanno le casse vuote e i Grigi alla porta.');
        const x = Math.round(Math.min(B.vault, 150 + rnd() * 350)); B.vault -= x; B.equity -= x; B.robbedAt = st.t; take(st, x, 'rapina al Banco'); M.stats.rapine++; M.stats.refurtiva += x;
        G.emit(st, 'rapina', { shop: 'Banco di Porto Vecchio', shopId: 'banca' }); if (R) R.repr = clamp(R.repr + 8, 0, 100); news(st, `Rapina al Banco di Porto Vecchio: portati via ${L(x)}.`); st.sfx.push({ k: 'cash' });
        return R_(true, `«Tutti a terra!» Il cassiere svuota i cassetti nel sacco: ${L(x)}. Hai pochi minuti.`);
      }
      case 'caveau': {
        if (bankOpen(st) || !night(st)) return R_(false, 'Di giorno? C\'è gente.'); if (!attrezzi(st)) return R_(false, 'Servono attrezzi: almeno un piede di porco.');
        st.t += 120; const kit = !!(R && RS.totalRes(st, 'kit') > 0 && RS.takeRes(st, 'kit', 1)); const alarm = rnd() < (kit ? .3 : .55);
        let x = Math.round(Math.min(B.vault * .6, 2500)); if (alarm && rnd() < .5) x = Math.round(x * .3);
        B.vault -= x; B.equity -= x; take(st, x, 'il caveau del Banco'); M.stats.rapine++; M.stats.refurtiva += x;
        if (alarm) G.emit(st, 'rapina', { shop: 'Banco di Porto Vecchio', shopId: 'banca' }); if (R) R.repr = clamp(R.repr + (alarm ? 12 : 5), 0, 100);
        news(st, `Svaligiato il caveau del Banco di Porto Vecchio: ${L(x)}.`); st.sfx.push({ k: 'cash' });
        return R_(true, alarm ? `L'allarme parte a metà lavoro. Scappi con quello che riesci a portare: ${L(x)}.` : `Due ore di trapano e silenzio. Il caveau si apre: ${L(x)}.`);
      }
      // ---- portavalori ----
      case 'assalto': case 'vano': {
        const v = van(st); if (!v || M.van.cargo < 1) return R_(false, 'Il furgone è vuoto.');
        if (id === 'assalto' && !armed(st)) return R_(false, 'Disarmato contro due guardie giurate? No.');
        if (id === 'vano') { if (!attrezzi(st)) return R_(false, 'Il vano blindato non si apre a mani nude.'); st.t += 20; }
        const x = M.van.cargo; M.van.cargo = 0; B.equity -= x; take(st, x, 'il portavalori'); M.stats.rapine++; M.stats.refurtiva += x;
        const g = M.van.crew && G.byId(st, M.van.crew); if (g && g.pop) { note(st, g, 'rapinato il portavalori, sotto la minaccia di un\'arma', 'bad', { w: 1 }); feel(g, 'paura', .5); if (g.pop.emer) Az.endPlan(st, g, 'rapinato'); }
        G.emit(st, 'rapina', { target: g ? g.id : null, shop: 'il portavalori' }); if (R) R.repr = clamp(R.repr + 10, 0, 100);
        news(st, `Assalto al portavalori del Banco: ${L(x)} spariti.`); st.sfx.push({ k: 'cash' });
        return R_(true, id === 'assalto' ? `Le guardie alzano le mani. I sacchi delle banconote passano a te: ${L(x)}.` : `La lamiera cede. Dentro ci sono i sacchi: ${L(x)}.`);
      }
      // ---- cassa comune ----
      case 'cassa_metti': { if (!R) return R_(false); if (!cassaReach(st)) return R_(false, `La cassa è in ${cassaWhere(st)}: devi andarci.`); const q = Math.min(ex.q || 0, Math.floor(p.money)); if (q < 1) return R_(false, 'Niente in tasca.'); pay(st, q, 'nella cassa comune'); R.cassa += q; return R_(true, `Messi ${L(q)} nella cassa comune.`); }
      case 'cassa_prendi': { if (!R) return R_(false); if (!cassaReach(st)) return R_(false, `La cassa è in ${cassaWhere(st)}: devi andarci.`); const q = Math.min(ex.q || 0, Math.floor(R.cassa)); if (q < 1) return R_(false, 'La cassa è vuota.'); R.cassa -= q; take(st, q, 'dalla cassa comune'); return R_(true, `Presi ${L(q)} dalla cassa comune.`); }
      case 'cassa_qui': { if (!R) return R_(false); const b = nearBase(st); if (!b) return R_(false, 'Non sei in una base.'); if (R.cassaAt && R.cassaAt !== b.id) return R_(false, `Prima vai a prenderla in ${cassaWhere(st)}.`); R.cassaAt = b.id; return R_(true, `La cassa comune ora sta in ${b.name}. Se la base cade, la trovano i Grigi.`); }
      case 'cassa_con_te': { if (!R) return R_(false); if (!cassaReach(st)) return R_(false, 'Devi essere dove sta la cassa.'); R.cassaAt = null; return R_(true, 'La cassa la porti con te. Se ti arrestano, la trovano.'); }
      // ---- al banco: comprare le cose una per una ----
      case 'compra': {
        const E = Ec.eco(st), Sh = E.shops[arg]; if (!Sh) return R_(false, 'Qui non vendono niente.');
        const g = ex.g, q = Math.max(1, Math.floor(ex.q || 1)), mode = ex.mode || 'tasche'; if (!Sh.sells[g] || !Ec.MERCI[g]) return R_(false, 'Non ce l\'hanno.');
        if (Sh.market && ![2, 5].includes(Po.weekday(st.t))) return R_(false, 'Oggi non c\'è mercato.');
        if ((Sh.stock[g] || 0) < q) return R_(false, `${cap(Ec.MERCI[g][0])}: finito.`);
        const pr = Ec.price(st, Sh, g) * q; if (p.money < pr) return R_(false, `Costa ${L(pr)}: non ce li hai.`);
        if (mode === 'banda' && (!RESMAP[g] || !R)) return R_(false, 'Alla banda questo non serve.');
        if (mode === 'tasche' && !Az.ITEMS[g]) return R_(false, 'Non sapresti dove metterlo.');
        if (mode === 'consuma' && !EAT[g]) return R_(false, 'Non si mangia.');
        const x = Ec.buy(st, null, Sh.t, g, q); if (x === null) return R_(false, 'È appena finito.'); pay(st, x, `${Ec.MERCI[g][0]} (${Sh.label})`); ditta(st, Sh.t).rev += x; st.sfx.push({ k: 'cash' });
        if (Sh.emporio && R) R.morale = clamp(R.morale - .2, 0, 100);
        if (mode === 'consuma') { p.hp = Math.min(100, p.hp + EAT[g] * q); return R_(true, `${cap(Ec.MERCI[g][0])}${q > 1 ? ' ×' + q : ''}: ${L(x)}. ${EATMSG[g] || 'Va meglio.'}`); }
        if (mode === 'banda') { const [res, k] = RESMAP[g], n = Math.max(1, Math.round(q * k)); R.inv[res] = (R.inv[res] || 0) + n; return R_(true, `${cap(Ec.MERCI[g][0])} ×${q} per la banda (${n} ${RS.RES[res] ? RS.RES[res].name : res}): ${L(x)}. Portalo in una base.`); }
        const It = Az.ITEMS[g]; if (It.weapon && G.WEAPONS[It.weapon]) { p.arms[It.weapon] = p.arms[It.weapon] || (G.WEAPONS[It.weapon].melee ? {} : { mag: G.WEAPONS[It.weapon].mag, res: G.WEAPONS[It.weapon].mag * 2 }); } else { p.inv = p.inv || {}; p.inv[g] = (p.inv[g] || 0) + q; }
        return R_(true, `${cap(Ec.MERCI[g][0])}${q > 1 ? ' ×' + q : ''} in tasca: ${L(x)}.`);
      }
      // ---- macchinette ----
      case 'slot_gioca': {
        const sl = M.slots.find(s => s.id === arg); if (!sl) return R_(false); const bet = clamp(Math.floor(ex.bet || 1), 1, 5);
        if (!pay(st, bet, `macchinette (${sl.label})`)) return R_(false, 'Non hai monete.'); sl.box += bet; M.stats.slotGiocato += bet;
        const s = spinOnce(); let win = s.mult * bet; const short = win > sl.box; win = Math.min(win, sl.box); sl.box -= win; M.stats.slotPagato += win; if (win) { take(st, win, 'vincita alle macchinette'); st.sfx.push({ k: 'cash' }); }
        return R_(true, win ? (short ? `Vinci, ma la macchinetta ha solo ${L(win)}. «Il resto passa a prenderlo domani.»` : `Vinci ${L(win)}!`) : 'Niente.', { reels: s.reels, win, bet });
      }
      // ---- sette e mezzo ----
      case 'bisca_puntata': {
        const bet = Math.floor(ex.bet || 0), banco = biscaBank(st); if (bet < 1) return R_(false); if (bet > banco / 3) return R_(false, `Il banco non accetta più di ${L(Math.floor(banco / 3))}.`);
        if (M.bisca && !M.bisca.over) return R_(false, 'C\'è già una mano in corso.');
        if (!pay(st, bet, 'puntata a sette e mezzo')) return R_(false, 'Non hai i soldi della puntata.');
        const deck = []; ['denari', 'coppe', 'spade', 'bastoni'].forEach(s => { for (let v = 1; v <= 10; v++) deck.push({ v, s }); }); for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
        M.bisca = { bet, deck, me: [deck.pop()], bank: [], over: false, res: '' };
        return R_(true, '', { hand: biscaView(M.bisca) });
      }
      case 'bisca_carta': {
        const H = M.bisca; if (!H || H.over) return R_(false); H.me.push(H.deck.pop());
        if (pts(H.me) > 7.5) { H.over = true; H.res = 'sballato'; biscaPay(st, -H.bet); return R_(true, `Sballato: ${fmtP(pts(H.me))}. Il banco incassa.`, { hand: biscaView(H) }); }
        return R_(true, '', { hand: biscaView(H) });
      }
      case 'bisca_sto': {
        const H = M.bisca; if (!H || H.over) return R_(false); const me = pts(H.me);
        H.bank.push(H.deck.pop()); while (pts(H.bank) < me && pts(H.bank) < 7.5) H.bank.push(H.deck.pop());
        const bk = pts(H.bank); H.over = true; const reale = me === 7.5 && H.me.length === 2;
        if (bk > 7.5 || bk < me) { const w = H.bet * (reale ? 2 : 1); H.res = reale ? 'reale' : 'vinto'; biscaPay(st, w); take(st, H.bet + w, 'vincita a sette e mezzo'); st.sfx.push({ k: 'cash' }); return R_(true, `${reale ? 'Sette e mezzo reale! ' : ''}Il banco fa ${fmtP(bk)}${bk > 7.5 ? ' e sballa' : ''}: vinci ${L(w)}.`, { hand: biscaView(H) }); }
        H.res = 'perso'; biscaPay(st, -H.bet); return R_(true, `Il banco fa ${fmtP(bk)}: ${bk === me ? 'pari, e col pari vince il banco' : 'perdi'}.`, { hand: biscaView(H) });
      }
      // ---- Lotto ----
      case 'lotto_gioca': {
        const u = [...new Set((ex.nums || []).map(Number).filter(x => x >= 1 && x <= 90 && x === Math.floor(x)))]; if (u.length < 2 || u.length > 3) return R_(false, 'Scegli due numeri (ambo) o tre (terno), da 1 a 90.');
        const stake = clamp(Math.floor(ex.stake || 1), 1, 20); if (Po.weekday(st.t) === 5 && G.hour(st) >= 19) return R_(false, 'Le giocate per questa settimana sono chiuse.');
        if (!pay(st, stake, 'schedina del Lotto')) return R_(false, 'Non hai i soldi della giocata.');
        sellTicket(st, (Ec.eco(st).shops[arg] || {}).t, stake); M.lotto.tickets.push({ who: 'player', nums: u, stake });
        return R_(true, `Schedina giocata: ${u.join(' · ')} (${u.length === 2 ? 'ambo' : 'terno'}, ${L(stake)}). Estrazione sabato alle 19.`);
      }
    }
    return R_(false);
  }
  const pts = h => h.reduce((s, c) => s + (c.v <= 7 ? c.v : .5), 0);
  const fmtP = x => (x % 1 ? `${Math.floor(x)} e mezzo` : `${x}`);
  const CARD = c => `${c.v <= 7 ? (c.v === 1 ? 'Asso' : c.v) : ['Fante', 'Cavallo', 'Re'][c.v - 8]} di ${c.s}`;
  function biscaView(H) { return { me: H.me.map(CARD), bank: H.bank.map(CARD), meC: H.me, bankC: H.bank, meP: pts(H.me), bankP: pts(H.bank), over: H.over, res: H.res, bet: H.bet }; }
  function biscaBank(st) { if (st.fam) return Math.max(0, st.fam.cash); const D = dittaAt(st, 'flipper'); return D ? Math.max(0, till(st, D).cash || 0) : 0; }
  // il banco della bisca è la Famiglia: x > 0 il banco paga, x < 0 incassa
  function biscaPay(st, x) { if (st.fam) st.fam.cash -= x; else { const D = dittaAt(st, 'flipper'); if (D) till(st, D).cash -= x; } }
  // cosa si mangia al banco e quanto fa bene; cosa serve alla banda (risorsa della Risacca, quante unità per pezzo)
  const EAT = { pane: 10, verdura: 6, frutta: 8, latte: 6, formaggio: 10, carne: 18, pesce: 16, scatolame: 12, pasta: 10, caffe: 6, vino: 8, pasto: 35 };
  const EATMSG = { caffe: 'Ristretto, bollente. Si riparte.', vino: 'Rosso della casa. Scalda.', pasto: 'Un piatto caldo, finalmente. Va molto meglio.', pane: 'Pane e basta, ma riempie.' };
  const RESMAP = { pane: ['viveri', .5], verdura: ['viveri', .5], frutta: ['viveri', .5], pasta: ['viveri', 1], scatolame: ['viveri', 1], carne: ['viveri', 1], pesce: ['viveri', 1], formaggio: ['viveri', 1], latte: ['viveri', .5],
    carta: ['carta', 1], inchiostro: ['inchiostro', 1], gesso: ['gesso', 1], medicine: ['medicine', 1], benzina: ['benzina', 1], zucchero: ['zucchero', 1], mobili: ['mobili', 1], casse: ['materiali', 1], legno: ['materiali', 1], ferro: ['materiali', 1], chiodi: ['materiali', .5],
    pennello: ['vernice', 1], bomboletta: ['vernice', 1], fotocamera: ['fotocamera', 1], telefono: ['telefono', 1], piede: ['attrezzi', 1], pala: ['attrezzi', 1], pile: ['radio', .5], lampadine: ['materiali', .5], sigarette: ['merce', .2] };
  function modes(g) { const m = []; if (EAT[g]) m.push('consuma'); if (Az.ITEMS[g]) m.push('tasche'); if (RESMAP[g]) m.push('banda'); return m; }
  function counter(st, k) {
    if (typeof Oggetti !== 'undefined') return Oggetti.counter(st, k);   // [oggetti]
    const E = Ec.eco(st), Sh = E.shops[k]; if (!Sh) return null;
    return { k, label: Sh.label, emporio: !!Sh.emporio, black: !!Sh.black, goods: Object.keys(Sh.sells).filter(g => Ec.MERCI[g] && Ec.MERCI[g][2] !== 'clandestino').map(g => ({ g, name: Ec.MERCI[g][0], kind: Ec.MERCI[g][2], price: Ec.price(st, Sh, g), base: Ec.MERCI[g][1], stock: Math.floor(Sh.stock[g] || 0), modes: modes(g) })) };
  }
  // per il pannello: tutto quello che il giocatore ha
  function playerView(st) {
    const M = S(st), R = st.ris, A = M.conti.player;
    return { wallet: st.player.money, conto: M.player.conto && A ? { bal: A.bal, frozen: A.frozen, mov: A.mov.slice(-10).reverse() } : null, loan: M.player.loan, cassa: R ? R.cassa : 0, cassaWhere: cassaWhere(st), cassaReach: cassaReach(st), base: nearBase(st), mov: M.player.mov.slice(0, 12), bankOpen: bankOpen(st), lotto: M.lotto, tickets: M.lotto.tickets.filter(t => t.who === 'player'), bisca: M.bisca ? biscaView(M.bisca) : null, biscaBank: biscaBank(st) };
  }
  // ================= COLLEGAMENTI CON LE INTERFACCE =================
  // il HUD della Risacca e le Tasche mostrano le azioni dei soldi; i pannelli li apre soldi_ui.js
  const openUI = (panel, arg) => { if (typeof SoldiUI !== 'undefined') SoldiUI.open(panel, arg); };
  (function hookUI() {
    const h0 = RS.here, a0 = RS.playerAct;
    RS.here = st => { const o = h0(st) || []; try { return o.concat(here(st).map(a => ({ id: a.id, label: a.label, arg: a.arg, bad: a.bad }))); } catch (e) { return o; } };
    RS.playerAct = (st, id, arg, extra) => {
      if (!String(id).startsWith('sd_')) return a0(st, id, arg, extra);
      const l = here(st), a = l.find(x => x.id === id && x.arg === arg) || l.find(x => x.id === id);
      if (a && a.panel) { openUI(a.panel, arg); return { ok: true, msg: '' }; }
      return act(st, id, arg, extra);
    };
    const pa0 = Az.playerActions;
    Az.playerActions = function (st) {
      const o = pa0.apply(this, arguments) || [];
      try { here(st).forEach(a => o.push({ id: a.id, label: a.label, off: '', run: () => { if (a.panel) { openUI(a.panel, a.arg); return ''; } return act(st, a.id, a.arg).msg; } })); } catch (e) { }
      return o;
    };
  })();

  // ================= RESOCONTO =================
  function report(st) {
    const M = S(st), B = M.banca, pp = st.npcs.filter(n => n.pop && !n.dead);
    const sum = f => pp.reduce((s, n) => s + f(n), 0);
    const ds = Object.values(M.ditte).filter(D => !D.pub && !D.bank);
    return {
      contanti: Math.round(cashTotal(st)), depositi: Math.round(deposits(st)), fuori: Math.round(M.fuori), leak: Math.round(M.leak),
      banca: { caveau: Math.round(B.vault), bancomat: M.atms.map(a => `${a.label.replace('Bancomat ', '')} ${Math.round(a.cash)}`), mutui: Math.round(B.mutui), patrimonio: Math.round(B.equity), debitoImpero: Math.round(B.debitoImpero), quadra: bankCheck(st) },
      gente: { portafogli: Math.round(sum(n => n.pop.money)), materassi: Math.round(sum(n => n.pop.mat || 0)), conti: Math.round(sum(n => n.pop.conto ? acct(st, n.pop.conto).bal : 0)), conConto: pp.filter(n => n.pop.conto).length, senzaConto: pp.filter(n => !n.pop.conto).length,
        alVerde: pp.filter(n => n.pop.money < 1 && !(n.pop.conto && acct(st, n.pop.conto).bal > 5)).length, arretratiAffitto: pp.filter(n => n.pop.arrAff > 1).length, stipendiArretrati: Math.round(sum(n => (n.pop.job && n.pop.owed > 0 && Po.weekday(st.t) !== 4 ? 0 : 0))) },
      ditte: { casse: Math.round(ds.reduce((s, D) => s + (till(st, D).cash || 0), 0)), conti: Math.round(ds.reduce((s, D) => s + acct(st, D.conto).bal, 0)), inRosso: ds.filter(D => acct(st, D.conto).bal < 0).sort((a, b) => acct(st, a.conto).bal - acct(st, b.conto).bal).map(D => `${D.label} ${Math.round(acct(st, D.conto).bal)}`) },
      stato: Math.round(acct(st, 'stato').bal), famiglia: st.fam ? { cash: Math.round(st.fam.cash), clean: Math.round(st.fam.clean || 0), conto: Math.round(acct(st, 'fam').bal) } : null, risacca: st.ris ? Math.round(st.ris.cassa) : 0,
      macchinette: Math.round(M.slots.reduce((s, x) => s + x.box, 0)), portavalori: { carico: Math.round(M.van.cargo), giri: M.van.runs }, stats: Object.fromEntries(Object.entries(M.stats).map(([k, v]) => [k, Math.round(v)])), giorni: M.days.slice(-10), notizie: M.news.slice(0, 6).map(x => x.s),
    };
  }
  return { CFG, S, flow, acct, xfer, versa, preleva, ditta, till, bankOpen, bankT, here, act, playerView, counter, cashTotal, deposits, bankCheck, report, spinOnce, SYM, PAY3, lottoPrize, cassaWhere, cassaReach, van, vanRun, lottoDraw, payOwed, L };
})();
if (typeof module !== 'undefined') module.exports = Soldi;
