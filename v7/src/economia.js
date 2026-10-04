/* Porto Vecchio — L'economia (solo logica, nessuna grafica).
   Le cose si producono, si consegnano, si vendono e finiscono. Ogni bottega ha le sue scorte e i suoi prezzi.
   - Chi lavora produce nel suo posto di lavoro (il fornaio il pane, il macellaio la carne dalle bestie dell'allevatore,
     il cuoco i pasti dagli ingredienti che l'osteria compra, il fabbro gli attrezzi dal ferro del saldatore, il falegname
     mobili e casse dal legno del boscaiolo…); le cascine portano verdura e latte al mercato del mercoledì e del sabato.
   - Le consegne portano la roba dove si vende. Quello che l'isola non fa lo vende l'EMPORIO IMPERIALE, rifornito dalla nave
     dell'Impero: caro, coi ritratti del Garante, e la nave il regime può tenerla vuota.
   - Comprare toglie dalle scorte: se una cosa finisce, il prezzo sale, la gente se ne lamenta, va altrove, ruba o si arrangia.
   - Il lavoro clandestino: l'artista stampa di nascosto manifesti e libretti, li attacca e li passa a chi si fida.
   Si appoggia a Popolo._ (mestieri, oggetti, progetti) e ad Azioni (verbi, oggetti in mano). */
var Economia = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const Az = typeof Azioni !== 'undefined' ? Azioni : require('./azioni.js');
  const I = Po._, PLACES = G.PLACES;
  const { note, feel, target, tkey, clamp, dist, o, pick } = I;
  const rnd = Math.random;
  const HOOK = {};   // [soldi] agganci per i soldi: wholesale (consegne), ship (la nave si fa pagare), paid (i pasti li incassa soldi.js)

  // ================= LE MERCI =================
  // prezzo base (migliaia di lire), di che genere sono, e quanto ne tiene di solito una bottega
  const MERCI = {
    pane: ['pane', 1, 'cibo', 30], verdura: ['verdura', 1.5, 'cibo', 30], frutta: ['frutta', 1.5, 'cibo', 25], olio: ['olio', 4, 'cibo', 10], latte: ['latte', 1, 'cibo', 20],
    formaggio: ['formaggio', 3, 'cibo', 10], carne: ['carne', 5, 'cibo', 15], pesce: ['pesce', 4, 'cibo', 15], scatolame: ['scatolame', 2, 'cibo', 30], pasta: ['pasta', 1.5, 'cibo', 30],
    caffe: ['caffè', 3, 'cibo', 15], zucchero: ['zucchero', 2, 'cibo', 15], farina: ['farina', 1, 'materia', 40], vino: ['vino', 2, 'cibo', 20], pasto: ['pasto caldo', 4, 'servito', 12], sale: ['sale', 1, 'cibo', 15],
    capi: ['capi di bestiame', 30, 'materia', 4], ferro: ['ferro', 2, 'materia', 10], legno: ['legno', 2, 'materia', 15], stoffa: ['stoffa', 3, 'materia', 10],
    coltello: ['coltello', 4, 'attrezzo', 4], pala: ['pala', 6, 'attrezzo', 3], piede: ['piede di porco', 4, 'attrezzo', 3], carriola: ['carriola', 15, 'attrezzo', 2], chiodi: ['chiodi', 1, 'casa', 20],
    mobili: ['mobili', 12, 'casa', 3], casse: ['casse', 3, 'casa', 8], vestiti: ['vestiti', 8, 'casa', 6],
    corda: ['corda', 2, 'casa', 10], sacchi: ['sacchi', 1, 'casa', 20], spugne: ['spugne', 1, 'casa', 15], sapone: ['sapone', 1, 'casa', 15], colla: ['colla', 2, 'casa', 10], nastro: ['nastro', 1, 'casa', 10],
    pile: ['pile', 2, 'casa', 15], lampadine: ['lampadine', 2, 'casa', 10], carta: ['carta', 1, 'casa', 20], inchiostro: ['inchiostro', 3, 'casa', 8], medicine: ['medicine', 6, 'casa', 10],
    bomboletta: ['bomboletta', 3, 'attrezzo', 8], pennello: ['pennello e vernice', 5, 'attrezzo', 5], gesso: ['gesso', 1, 'attrezzo', 15], benzina: ['benzina', 4, 'attrezzo', 25],
    telefono: ['cellulare', 30, 'attrezzo', 2], fotocamera: ['macchina fotografica', 25, 'attrezzo', 2], carte: ['mazzo di carte', 2, 'casa', 6], sigarette: ['sigarette', 2, 'vizio', 30],
    poster: ['manifesto clandestino', 0, 'clandestino', 0], libretto: ['libretto clandestino', 0, 'clandestino', 0],
  };
  const M = id => MERCI[id] || [id, 2, 'casa', 5];
  const IMPORT = ['ferro', 'legno', 'farina', 'pasta', 'caffe', 'zucchero', 'scatolame', 'corda', 'sacchi', 'spugne', 'sapone', 'colla', 'nastro', 'pile', 'lampadine', 'carta', 'inchiostro', 'stoffa', 'sigarette', 'bomboletta', 'pennello', 'benzina', 'telefono', 'fotocamera', 'medicine', 'coltello', 'pala', 'chiodi', 'carte'];

  // ================= I POSTI NUOVI (sugli edifici che ci sono) =================
  // i mestieri che mancavano: un edificio di città diventa macelleria, fruttivendolo, fabbro, falegnameria; il più grande diventa l'Emporio
  const NEW_SHOPS = [
    ['emporio', 'Emporio Imperiale', 'EMPORIO', '#ff3b3b', true], ['macelleria', 'Macelleria Gavino', 'MACELLERIA', '#ff6a6a'], ['fruttivendolo', 'Frutta e verdura Tina', 'FRUTTA E VERDURA', '#8aff6a'],
    ['fabbro', 'Fabbro Nello', 'FABBRO', '#ffb35c'], ['falegnameria', 'Falegnameria Efisio', 'FALEGNAME', '#d8a060'],
  ];
  const JOBS_NEW = {
    emporio: [['commesso dell\'Emporio', 3, 5, 8, 20], ['guardiano dell\'Emporio', 1, 5, 8, 20], ['direttore dell\'Emporio', 1, 10, 8, 18]],
    macelleria: [['macellaio', 1, 6, 6, 14], ['garzone di macelleria', 1, 4, 6, 14]],
    fruttivendolo: [['fruttivendolo', 1, 5, 6, 14]],
    fabbro: [['fabbro', 1, 7, 7, 17], ['apprendista fabbro', 1, 4, 7, 17]],
    falegnameria: [['falegname', 1, 7, 7, 17], ['apprendista falegname', 1, 4, 7, 17]],
  };
  (function assignTrades() {
    const B = G.BUILDINGS, pz = PLACES.piazza || { x: 0, y: 0 };
    const free = B.filter(b => b.door && b.use === 'casa' && !b.home && !b.farm && !b.trade).map(b => ({ b, d: Math.hypot(b.door[0] * G.TS - pz.x, b.door[1] * G.TS - pz.y), a: b.w * b.h * (b.fl || 1) }));
    NEW_SHOPS.forEach(([use, name, sign, col, big]) => {
      const list = free.filter(x => !x.b.trade).sort((p, q) => (big ? q.a - p.a + (p.d - q.d) * .05 : p.d - q.d));
      const x = list[0]; if (!x) return;
      const b = x.b; b.trade = use; b.use = use; b.name = name; b.label = name; b.sign = { t: sign, c: col }; b.shop = true;
    });
    Object.assign(I.JOBS_BY, JOBS_NEW);
    I.ESSENTIAL.push(/^pescator/, /^allevator/, /^macellai/, /^saldator/, /^fabbro$/, /^falegname$/, /^fornai/, /^boscaiol/, /^cuoc|^oste$/, /^fruttivendol/, /^commesso dell'Emporio/, /^bracciante$/);
    I.OUTDOOR.push(['ovile', 'allevatore', 3, 5, 5, 15], ['sugheri', 'boscaiolo', 3, 5, 6, 15], ['pineta', 'boscaiolo', 2, 5, 6, 15]);
    I.GENDER.push(['macellaio', 'macellaia'], ['fruttivendolo', 'fruttivendola'], ['allevatore', 'allevatrice'], ['boscaiolo', 'boscaiola'], ['garzone', 'garzona'], ['direttore', 'direttrice'], ['guardiano', 'guardiana']);
  })();
  const bOf = b => G.BUILDINGS.findIndex(x => x === b);

  // ================= LE BOTTEGHE =================
  // dove si vende cosa. ref: id di un luogo/edificio o 'use:<uso>' (tutti gli edifici con quell'uso)
  const SELL = [
    ['use:emporio', IMPORT.concat(['pane', 'latte', 'vino', 'olio', 'formaggio'])],
    ['wu', ['pane', 'verdura', 'frutta', 'latte', 'formaggio', 'scatolame', 'pasta', 'caffe', 'zucchero', 'olio', 'vino', 'sigarette', 'gesso', 'carte', 'sale']],
    ['use:panetteria', ['pane']], ['use:pescheria', ['pesce', 'scatolame']], ['use:macelleria', ['carne']], ['use:fruttivendolo', ['verdura', 'frutta', 'olio']],
    ['use:ferramenta', ['coltello', 'pala', 'piede', 'carriola', 'bomboletta', 'pennello', 'chiodi', 'corda', 'colla', 'sacchi', 'nastro', 'lampadine', 'pile']],
    ['use:tabacchi', ['sigarette', 'carte', 'gesso', 'carta', 'inchiostro']], ['officina', ['piede', 'bomboletta']], ['benzina', ['benzina']], ['video', ['telefono', 'fotocamera', 'pile']],
    ['use:farmacia', ['medicine', 'spugne', 'sapone']], ['use:fabbro', ['coltello', 'pala', 'piede', 'chiodi']], ['use:falegnameria', ['mobili', 'casse', 'carriola']], ['use:sartoria', ['vestiti', 'stoffa']],
    ['osteria', ['pasto', 'vino']], ['osteria_sg', ['pasto', 'vino']], ['car_2', ['pasto', 'vino']], ['bar', ['pane', 'vino']], ['sirena', ['pane', 'vino']], ['gelateria', ['pane', 'latte']], ['chiosco', ['pane']],
    ['piazza', ['verdura', 'frutta', 'pesce', 'formaggio', 'olio', 'carne']],   // il mercato del mercoledì e del sabato
    ['magazzino', ['benzina', 'sigarette', 'scatolame', 'telefono', 'fotocamera', 'bomboletta', 'corda', 'sacchi', 'carne', 'pesce']],   // lo Squalo: mercato nero
  ];
  // chi produce cosa, per ogni ora di lavoro (out), consumando (in) dalle scorte del posto di lavoro
  const PROD = [
    [/oliveto/, { olio: 1, frutta: 1 }], [/vigne|vignaiol/, { vino: 3 }], [/^bracciant/, { verdura: 4, frutta: 2 }], [/^fornai/, { pane: 8 }, { farina: .5 }],
    [/allevator/, { latte: 3, formaggio: .4, capi: .15 }], [/^macellai|garzone di macelleria/, { carne: 4 }, { capi: .1 }], [/^pescator/, { pesce: 3 }], [/^cuoc|^oste/, { pasto: 6 }, { _ing: 1 }],
    [/^operai/, { scatolame: 5 }, { pesce: 1 }, /Conservificio/], [/saldator/, { ferro: 2 }], [/^fabbr|apprendista fabbro/, { _tool: 1 }, { ferro: 1 }], [/falegnam/, { _wood: 1 }, { legno: 1 }],
    [/boscaiol/, { legno: 4 }], [/salinar/, { sale: 5 }], [/^sart/, { vestiti: .5 }, { stoffa: .5 }], [/carpentiere/, { legno: 1 }],
  ];
  // stato
  function eco(st) {
    if (st.eco) return st.eco;
    const E = st.eco = { shops: {}, work: {}, stats: { prodotto: 0, venduto: 0, mancato: 0, consegne: 0, navi: 0, sequestri: 0 }, missing: {}, hour: -1, blocked: false };
    SELL.forEach(([ref, goods]) => {
      const ts = ref.startsWith('use:') ? G.BUILDINGS.map((b, bi) => [b, bi]).filter(([b]) => b.use === ref.slice(4) && b.door).map(([, bi]) => I.tB(bi)) : [target(ref)];
      ts.forEach(t => { if (!t) return; const k = tkey(t); const S = E.shops[k] = E.shops[k] || { k, t, label: t.label, sells: {}, stock: {}, cash: 50, black: ref === 'magazzino', market: ref === 'piazza', emporio: ref === 'use:emporio' }; goods.forEach(g => { S.sells[g] = true; S.stock[g] = S.market ? 0 : Math.round(M(g)[3] * (.6 + rnd() * .5)); }); });
    });
    // le materie prime di partenza nei laboratori
    [['panetteria', 'farina', 30], ['fabbro', 'ferro', 8], ['falegnameria', 'legno', 10], ['macelleria', 'capi', 2], ['sartoria', 'stoffa', 6]].forEach(([use, g, q]) => G.BUILDINGS.forEach((b, bi) => { if (b.use !== use || !b.door) return; const t = I.tB(bi), k = tkey(t); const X = E.shops[k] || (E.work[k] = E.work[k] || { k, t, label: t.label, stock: {} }); X.stock[g] = (X.stock[g] || 0) + q; }));
    Object.values(E.shops).filter(S => S.sells.pasto).forEach(S => { ['carne', 'pesce', 'verdura', 'pasta'].forEach(g => { S.stock[g] = (S.stock[g] || 0) + 5; }); });
    return E;
  }
  const shopAt = (st, t) => (t ? eco(st).shops[tkey(t)] : null);
  function price(st, S, g) {
    const base = M(g)[1], tgt = M(g)[3] || 5, s = S.stock[g] || 0;
    let p = base * clamp(1 + (tgt - s) / (tgt * 1.5), .8, 3);
    if (S.emporio) p *= 1.5; if (S.black) p *= 2;
    return Math.round(p * 10) / 10;
  }
  // comprare: toglie dalle scorte e dà i soldi alla bottega. null se non c'è (e chi cercava se lo ricorda)
  function buy(st, n, t, g, q) {
    const S = shopAt(st, t); if (!S || !S.sells[g]) return null;
    q = q || 1;
    if (S.market && ![2, 5].includes(Po.weekday(st.t))) return null;
    if ((S.stock[g] || 0) < q) { missed(st, n, S, g); return null; }
    const p = price(st, S, g) * q; if (n && n.pop && n.pop.money < p) return null;
    S.stock[g] -= q; S.cash += p; if (n && n.pop) n.pop.money -= p;
    eco(st).stats.venduto += q;
    if (S.emporio && n && n.ris) n.ris.ideo = clamp(n.ris.ideo - .004, 0, 1);   // sotto i ritratti del Garante
    return p;
  }
  function missed(st, n, S, g) {
    const E = eco(st); E.stats.mancato++; E.missing[g] = (E.missing[g] || 0) + 1;
    if (n && n.pop && (!n.pop._miss || st.t - n.pop._miss > 120)) { n.pop._miss = st.t; note(st, n, `a ${S.label} è finit${/a$/.test(M(g)[0]) ? 'a' : 'o'} ${M(g)[0]}`, 'bad', { w: .3, tag: 'scarsita', place: S.label }); feel(n, 'rabbia', .03); }
  }
  const has = (st, t, g) => { const S = shopAt(st, t); return !!(S && S.sells[g] && (S.stock[g] || 0) > 0 && !(S.market && ![2, 5].includes(Po.weekday(st.t)))); };

  // ================= GLI OGGETTI DELLA VITA USANO LE SCORTE =================
  // la spesa in bottega compra due cose da mangiare; il pasto all'osteria ne consuma uno; il panino al bar il pane
  const FOOD = ['pane', 'verdura', 'frutta', 'pasta', 'scatolame', 'latte', 'formaggio', 'carne', 'pesce', 'olio'];
  I.USE.push((st, n, o, t) => {
    if (!n.pop || !t) return true;
    if (o.id === 'bottega' || o.id === 'bancarelle') {
      const S = shopAt(st, t); if (!S) return true;
      if (!FOOD.some(g => S.sells[g])) return true;   // dal tabaccaio: solo due chiacchiere e le sigarette
      const cands = FOOD.filter(g => S.sells[g] && (S.stock[g] || 0) > 0);
      if (!cands.length) { missed(st, n, S, FOOD.find(g => S.sells[g]) || 'pane'); return false; }
      let got = 0; for (let i = 0; i < 2 && cands.length; i++) { const g = cands[Math.floor(rnd() * cands.length)]; if (buy(st, n, t, g)) got++; }
      return got > 0;
    }
    if (o.id === 'tavola') { const S = shopAt(st, t); if (!S) return true; if (!(S.stock.pasto > 0)) { missed(st, n, S, 'pasto'); return false; } S.stock.pasto--; if (!HOOK.paid) S.cash += 4; eco(st).stats.venduto++; return true; }   // [soldi] il conto lo paga chi mangia
    if (o.id === 'panino') { const S = shopAt(st, t); if (!S) return true; if (!(S.stock.pane > 0)) { missed(st, n, S, 'pane'); return false; } S.stock.pane--; if (!HOOK.paid) S.cash += 2; eco(st).stats.venduto++; return true; }
    return true;
  });
  // nel programma si evitano le botteghe vuote (se uno lo sa: le scorte le vede chi ci passa, ma per semplicità le vedono tutti)
  I.AVAIL.push((st, n, o, t) => {
    if (o.id === 'tavola') return has(st, t, 'pasto');
    if (o.id === 'panino') return has(st, t, 'pane');
    if (o.id === 'bottega' || o.id === 'bancarelle') { const S = shopAt(st, t); return !S || FOOD.some(g => S.sells[g] && (S.stock[g] || 0) > 0 && !(S.market && ![2, 5].includes(Po.weekday(st.t)))); }
    return true;
  });

  // ================= LAVORO E PRODUZIONE =================
  const workplaceT = n => n.pop && n.pop.job && n.pop.job.t;
  function produceHour(st) {
    const E = eco(st);
    st.npcs.forEach(n => {
      const P = n.pop; if (!P || n.dead || !P.job || !P.cur || P.cur.act !== 'lavoro' || n.jailedUntil > st.t) return;
      const title = P.job.base || P.job.title || '', wt = workplaceT(n); if (!wt) return;
      const rule = PROD.find(([re, , , lre]) => re.test(title) && (!lre || lre.test(wt.label || ''))); if (!rule) return;
      const k = tkey(wt), W = E.work[k] = E.work[k] || { k, t: wt, label: wt.label, stock: {} };
      const S = shopAt(st, wt), store = S || W;   // chi produce in una bottega mette direttamente sugli scaffali
      const [, out, inp] = rule;
      // magazzino pieno: si lavora piano (si sistema, si pulisce, si chiacchiera)
      if (Object.keys(out).every(g => g[0] === '_' ? false : (store.stock[g] || 0) >= (M(g)[3] || 5) * 2.5)) return;
      if (out._tool && ['coltello', 'pala', 'piede'].every(g => (store.stock[g] || 0) >= M(g)[3] * 2)) return;
      if (out._wood && ['casse', 'mobili', 'carriola'].every(g => (store.stock[g] || 0) >= M(g)[3] * 2)) return;
      // gli ingredienti: dal posto di lavoro
      if (inp) {
        for (const [g, q] of Object.entries(inp)) {
          if (g === '_ing') { const ing = ['carne', 'pesce', 'verdura', 'pasta'].find(x => (store.stock[x] || 0) >= 1); if (!ing) { if (rnd() < .3) note(st, n, `in cucina a ${wt.label} non c'è niente da cucinare`, 'bad', { w: .2, tag: 'scarsita' }); return; } store.stock[ing] -= 1; continue; }
          if ((store.stock[g] || 0) < q) { if (rnd() < .2) note(st, n, `a ${wt.label} manca ${M(g)[0]}: si lavora a vuoto`, 'bad', { w: .2, tag: 'scarsita' }); return; }
          store.stock[g] -= q;
        }
      }
      for (const [g, q] of Object.entries(out)) {
        if (g === '_tool') { const tools = ['coltello', 'pala', 'piede', 'chiodi']; const pickT = tools.sort((a, b) => (store.stock[a] || 0) / M(a)[3] - (store.stock[b] || 0) / M(b)[3])[0]; store.stock[pickT] = (store.stock[pickT] || 0) + (pickT === 'chiodi' ? 5 : 1); E.stats.prodotto++; continue; }
        if (g === '_wood') { const items = ['casse', 'mobili', 'carriola']; const pickW = items.sort((a, b) => (store.stock[a] || 0) / M(a)[3] - (store.stock[b] || 0) / M(b)[3])[0]; store.stock[pickW] = (store.stock[pickW] || 0) + (pickW === 'casse' ? 2 : .5); E.stats.prodotto++; continue; }
        store.stock[g] = (store.stock[g] || 0) + q; E.stats.prodotto += q;
      }
    });
    // le cascine: orto e bestie, ogni mattina
    if (Math.floor(st.t / 60) % 24 === 6) G.BUILDINGS.forEach((b, bi) => { if (b.use !== 'cascina' || !b.door) return; const t = I.tB(bi), k = tkey(t), W = E.work[k] = E.work[k] || { k, t, label: t.label, stock: {}, farm: true }; W.stock.verdura = (W.stock.verdura || 0) + 4; W.stock.latte = (W.stock.latte || 0) + 2; W.stock.formaggio = (W.stock.formaggio || 0) + .3; W.stock.capi = (W.stock.capi || 0) + .15; });
  }
  // le consegne: dai posti di lavoro alle botteghe che vendono quella cosa (la più sguarnita prima); le osterie comprano gli ingredienti
  function deliver(st) {
    const E = eco(st), shops = Object.values(E.shops), wd = Po.weekday(st.t), h = Math.floor(st.t / 60) % 24;
    Object.values(E.work).forEach(W => {
      for (const g of Object.keys(W.stock)) {
        let q = Math.floor(W.stock[g]); if (q < 1) continue;
        // al mercato ci vanno le cascine, il mercoledì e il sabato all'alba
        const dest = shops.filter(S => S.sells[g] && !S.black && (!S.market || (W.farm && [2, 5].includes(wd) && h >= 6 && h < 8)) && (!W.farm || S.market || !S.emporio)).sort((a, b) => (a.stock[g] || 0) / (M(g)[3] || 5) - (b.stock[g] || 0) / (M(g)[3] || 5));
        const S = dest[0]; if (!S) continue;
        const room = Math.max(0, (M(g)[3] || 5) * 1.5 - (S.stock[g] || 0)); q = Math.min(q, Math.ceil(room)); if (q < 1) continue;
        W.stock[g] -= q; S.stock[g] = (S.stock[g] || 0) + q; E.stats.consegne++;
        if (HOOK.wholesale) HOOK.wholesale(st, W, S, g, q);   // [soldi] la bottega paga chi produce
      }
    });
    // le materie prime ai laboratori che le usano (dal deposito dell'Emporio o da chi le produce)
    const needs = [['use:fabbro', 'ferro'], ['use:falegnameria', 'legno'], ['use:macelleria', 'capi'], ['use:panetteria', 'farina'], ['use:sartoria', 'stoffa'], ['fabbrica', 'pesce']];
    needs.forEach(([ref, g]) => {
      const ws = Object.values(E.work).filter(W => (ref.startsWith('use:') ? (W.t.k === 'b' && G.BUILDINGS[W.t.bi] && G.BUILDINGS[W.t.bi].use === ref.slice(4)) : /Conservificio/.test(W.label)));
      shops.filter(S => S.t.k === 'b' && ref.startsWith('use:') && G.BUILDINGS[S.t.bi] && G.BUILDINGS[S.t.bi].use === ref.slice(4)).forEach(S => { if (!ws.includes(S)) ws.push(S); });
      ws.forEach(W => {
        if ((W.stock[g] || 0) >= 3) return;
        const src = Object.values(E.work).find(X => X !== W && (X.stock[g] || 0) >= 1) || shops.find(S => S !== W && S.sells[g] && (S.stock[g] || 0) >= 3 && !S.black);
        if (src) { const q = Math.min(4, Math.max(1, Math.floor(src.stock[g] / 2))); src.stock[g] -= q; W.stock[g] = (W.stock[g] || 0) + q; if (src.cash !== undefined && W.cash !== undefined) { W.cash -= q * M(g)[1]; src.cash += q * M(g)[1]; } E.stats.consegne++; }
      });
    });
    // le osterie e i bar comprano dalle botteghe
    shops.filter(S => S.sells.pasto || (S.sells.pane && !S.sells.verdura && /Bar|Sirena|Gelateria|Chiosco/.test(S.label))).forEach(S => {
      const want = S.sells.pasto ? ['carne', 'pesce', 'verdura', 'pasta'] : ['pane'];
      want.forEach(g => { if ((S.stock[g] || 0) >= 4) return; const src = shops.find(X => X !== S && X.sells[g] && !X.market && !X.black && (X.stock[g] || 0) > 6); if (src) { const q = Math.min(4, src.stock[g] - 6); src.stock[g] -= q; S.stock[g] = (S.stock[g] || 0) + q; src.cash += q * M(g)[1]; S.cash -= q * M(g)[1]; E.stats.consegne++; } });
    });
    // il mercato si smonta all'una: quello che resta torna a casa
    if (h === 13) shops.filter(S => S.market).forEach(S => { Object.keys(S.stock).forEach(g => { S.stock[g] = 0; }); });
  }
  // la nave dell'Impero: lunedì e giovedì all'alba, se la Tutela la lascia sbarcare. Porta tutto quello che l'isola non fa.
  function ship(st) {
    const E = eco(st), R = st.ris, rl = R ? Math.min(5, Math.floor(R.repr / 20)) : 1;
    E.stats.navi++;
    let share = 1;
    if (E.blocked) share = 0; else if (rl >= 3 && rnd() < .5) { share = .4; E.stats.sequestri++; }
    if (!share) { G.addLog(st, `${G.clockStr(st.t)} · La nave dell'Impero resta al largo: niente sbarco.`, 'bad'); return; }
    const bought = {};   // [soldi] quanto vale quello che ogni bottega compra dalla nave
    Object.values(E.shops).forEach(S => {
      if (S.market) return;
      IMPORT.forEach(g => { if (!S.sells[g]) return; const tgt = M(g)[3]; const q = Math.round(Math.max(0, tgt * (S.emporio ? 1.6 : 1) - (S.stock[g] || 0)) * share); S.stock[g] = (S.stock[g] || 0) + q; bought[S.k] = (bought[S.k] || 0) + q * M(g)[1]; });
    });
    if (HOOK.ship) HOOK.ship(st, bought, share);
    Object.values(E.work).concat(Object.values(E.shops)).forEach(W => { if (/Panetteria|Forno/.test(W.label)) W.stock.farina = (W.stock.farina || 0) + Math.round(20 * share); if (/Sartoria/.test(W.label)) W.stock.stoffa = (W.stock.stoffa || 0) + Math.round(6 * share); });
    G.addLog(st, `${G.clockStr(st.t)} · È sbarcata la nave dell'Impero${share < 1 ? ': la Tutela ne ha trattenuto più di metà' : ''}. All'Emporio gli scaffali sono pieni.`, 'info');
  }

  // ================= OGGETTI IN MANO: si comprano dove ci sono =================
  // Azioni chiede qui se una bottega ha l'oggetto e lo toglie dalle scorte
  Az.setEconomy && Az.setEconomy({
    has: (st, t, item) => { const S = shopAt(st, t); return !S || !S.sells[item] ? true : (S.stock[item] || 0) > 0; },
    buy: (st, n, t, item) => { const S = shopAt(st, t); if (!S || !S.sells[item]) return true; return buy(st, n, t, item) !== null; },
    price: (st, t, item, fallback) => { const S = shopAt(st, t); return S && S.sells[item] ? price(st, S, item) : fallback; },
  });

  // ================= IL LAVORO CLANDESTINO =================
  // l'artista (o chiunque abbia arte e rabbia) stampa di nascosto manifesti e libretti, li attacca di notte e li passa a chi si fida
  I.PROJ.clandestino = { id: 'clandestino', label: () => 'stampare di nascosto manifesti e libretti',
    need: true, when: (st, n, P) => !!(P.intW && ((P.intW.arte || 0) > .4 || ((P.intW.politica || 0) > .6 && P.job && /tipograf/.test(P.job.title || ''))) && n.ris && n.ris.ideo > .55 && n.tr.cor > .4 && P.money > 8 && !I.recent(st, P, 'fermato', 10) && rnd() < .2),
    steps: (st, n, P) => {
      const pr = (P.job && /tipograf/.test(P.job.title || '')) ? P.job.t : P.homeT;
      return [
        { k: 'go', ref: shopFor(st, 'carta') || 'wu', h: 10, label: 'compra carta e inchiostro, senza dare nell\'occhio', fx: (st, n, P) => { const t = shopFor(st, 'carta'); const ok = t && buy(st, n, t, 'carta', 2); const t2 = shopFor(st, 'inchiostro'); const ok2 = t2 && buy(st, n, t2, 'inchiostro'); const t3 = shopFor(st, 'colla'); if (t3) buy(st, n, t3, 'colla'); return ok && ok2 ? 'next' : 'again'; } },
        { k: 'go', ref: pr, h: 23, act: 'progetto', label: pr === P.homeT ? 'stampa di nascosto in cantina' : 'stampa di notte in tipografia, a luci spente', fx: (st, n, P) => { Az.give(n, 'poster', 8); Az.give(n, 'libretto', 4); note(st, n, 'stampato di nascosto otto manifesti e quattro libretti', 'shady', { w: .7, tag: 'segreto' }); eco(st).stats.clandestino = (eco(st).stats.clandestino || 0) + 1; spied(st, n, pr); return 'next'; } },
        { k: 'go', ref: pick(rnd, ['vico', 'caruggio', 'piazzetta', 'calata', 'piazza'].filter(id => PLACES[id])), h: 2, act: 'graffito', label: 'attacca i manifesti di notte', fx: (st, n, P, pj, b) => { I.paintWall(st, n, b, posterSketch(st, n)); P.inv.poster = Math.max(0, (P.inv.poster || 0) - 8); return 'next'; } },
        { k: 'go', ref: 'osteria', h: 20, label: 'passa i libretti a chi si fida', fx: (st, n, P) => { passBooklets(st, n); return 'done'; } },
      ];
    } };
  const POSTERS = ['IL GARANTE MENTE', 'LA RISACCA SALE', 'RIDATECI I NOSTRI FIGLI', 'IL PANE COSTA IL DOPPIO, LA PAURA È GRATIS', 'L\'ISOLA NON È IN VENDITA', 'NON DIMENTICHIAMO'];
  function posterSketch(st, n) { const lost = I.recent(st, n.pop, 'arresto', 6); const t = lost && lost.who ? `RIDATECI ${G.nameOf(st, lost.who).toUpperCase()}` : pick(rnd, POSTERS); return { kind: 'scritta', text: `un manifesto stampato a mano: «${t}»`, style: I.artStyle(n) }; }
  function shopFor(st, g) { const S = Object.values(eco(st).shops).find(S => S.sells[g] && (S.stock[g] || 0) > 0 && !S.black); return S ? S.t : null; }
  // qualcuno ha sentito il ciclostile di notte?
  function spied(st, n, where) {
    const ears = st.npcs.filter(k => !k.dead && k.pop && k !== n && k.pop.giro === 'orecchio' && k.pop.homeT && where && dist(k.pop.homeT.x, k.pop.homeT.y, where.x, where.y) < 25);
    if (ears.length && rnd() < .5) { const e = ears[0]; note(st, e, `sentito qualcuno stampare di notte da ${n.first}`, 'shady', { w: .6, who: n.id }); if (rnd() < .5) raid(st, n, e.first); }
  }
  function passBooklets(st, n) {
    const P = n.pop, fr = (P.friends || []).map(id => G.byId(st, id)).filter(k => k && !k.dead && k.pop && k.ris && k.ris.ideo > .35);
    // se gli amici non bastano, a chi c'è e sembra pensarla allo stesso modo (un rischio: tra loro può esserci un Orecchio)
    const here = st.npcs.filter(k => k !== n && !k.dead && k.pop && k.ris && !fr.includes(k) && k.ris.ideo > .45 && dist(k.x, k.y, n.x, n.y) < 12);
    const list = fr.concat(here.sort(() => rnd() - .5)).slice(0, P.inv.libretto || 0);
    list.forEach(k => {
      P.inv.libretto--; k.ris.ideo = clamp(k.ris.ideo + .08, 0, 1); note(st, k, `${n.first} gli ha passato un libretto clandestino. L'ha letto due volte`, 'shady', { w: .6, who: n.id, tag: 'libretto' });
      if (k.pop.giro === 'orecchio' && rnd() < .7) { note(st, k, `ha portato alla Zia il libretto di ${n.first}`, 'shady', { w: .6 }); raid(st, n, k.first); }
    });
    if (st.ris) st.ris.morale = clamp(st.ris.morale + list.length, 0, 100);
  }
  function raid(st, n, by) {
    note(st, n, 'i Grigi sono venuti a perquisire casa: hanno trovato la carta e l\'inchiostro', 'bad', { w: 1, tag: 'fermato' });
    if (n.pop.inv) { n.pop.inv.poster = 0; n.pop.inv.libretto = 0; }
    I.arrestFar(st, n, 'stampa clandestina'); n.jailedUntil = st.t + 2 * 1440;
    G.addLog(st, `${G.clockStr(st.t)} · I Grigi hanno perquisito la casa di ${n.name}: stampa clandestina${by ? ` (una soffiata di ${by})` : ''}.`, 'bad');
    if (st.ris) st.ris.repr = clamp(st.ris.repr + 4, 0, 100);
  }

  // ================= RIFLESSIONI E VERBI =================
  I.REFLECT.push((st, n, thoughts) => {
    const P = n.pop, miss = P.diary.filter(e => e.tag === 'scarsita' && st.t - e.t < 2 * 1440).length;
    if (miss >= 2) { thoughts.push([pick(rnd, ['non si trova più niente, e all\'Emporio costa il doppio', 'le botteghe sono vuote e la nave non arriva', 'la Tutela ci affama']), .5]); if (n.ris) n.ris.ideo = clamp(n.ris.ideo + .01, 0, 1); }
  });
  // vendere quello che si produce da sé (orto, pesca) al mercato
  Az.VERBS.vendi_merce = { desc: 'vendere al mercato quello che si è prodotto (verdura dell\'orto, pesce)', args: 'cosa',
    plan: (st, n, a) => { const P = n.pop; if ((P.pantry || 0) < 3) return null; return [{ label: 'porta la roba al mercato', at: () => target('piazza'), dur: 60, outside: true, act: (st, n) => { const S = shopAt(st, target('piazza')); const q = Math.floor(P.pantry - 2); if (S && [2, 5].includes(Po.weekday(st.t))) { const g = a && a.cosa || (P.intW && P.intW.pesca ? 'pesce' : 'verdura'); S.stock[g] = (S.stock[g] || 0) + q; P.pantry -= q; P.money += q * M(g)[1] * .8; note(st, n, `venduto al mercato ${q} cassette di ${M(g)[0]}`, 'good', { w: .3 }); } return 'next'; } }]; } };
  Az.VERBS.stampa = { desc: 'stampare di nascosto manifesti e libretti (servono carta e inchiostro)', plan: (st, n) => [{ label: 'stampa di nascosto', at: () => n.pop.homeT, dur: 60, act: (st, n) => { Az.give(n, 'poster', 6); Az.give(n, 'libretto', 3); spied(st, n, n.pop.homeT); return 'next'; } }] };

  // ================= AGGANCI =================
  function report(st) {
    const E = eco(st), low = [];
    Object.values(E.shops).forEach(S => Object.keys(S.sells).forEach(g => { if (!S.market && (S.stock[g] || 0) < 1) low.push(`${M(g)[0]} a ${S.label}`); }));
    return { stats: E.stats, mancanze: E.missing, vuoti: low };
  }
  function install() {
    const H = G.HOOKS; if (H.__economia) return; H.__economia = true;
    const s0 = H.step;
    H.step = (st, dt) => {
      if (s0) s0(st, dt);
      if (!st.pop) return;
      const E = eco(st), hm = Math.floor(st.t / 60);
      if (E.hour !== hm) {
        E.hour = hm; const h = hm % 24, wd = Po.weekday(st.t);
        produceHour(st); deliver(st);
        if ((wd === 0 || wd === 3) && h === 6) ship(st);
      }
    };
  }
  install();
  return { HOOK, posterSketch, MERCI, IMPORT, SELL, PROD, eco, shopAt, price, buy, has, report, ship, raid };
})();
if (typeof module !== 'undefined') module.exports = Economia;
