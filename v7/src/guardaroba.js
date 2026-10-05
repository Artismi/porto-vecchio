/* Porto Vecchio — Il Guardaroba: i vestiti si indossano a strati, e quello che hai addosso è quello che si vede.
   Ogni zona del corpo ha una pila: il primo capo è il più vicino alla pelle, l'ultimo quello che si vede sopra.
   L'ordine lo decidi tu (anche le mutande sopra i pantaloni, il giubbotto antiproiettile sotto o sopra la giacca).
   Paraspalle, paraginocchia e zaino hanno un posto loro. Le due mani tengono un oggetto ciascuna.
   Ogni abitante si veste secondo chi è: mestiere, età, parte, quanto ha in tasca. Il disegno sta in vesti3d.js.
   Legge e scrive attraverso Oggetti; si prova anche in Node. */
var Guardaroba = (function () {
  'use strict';
  const O = typeof Oggetti !== 'undefined' ? Oggetti : require('./oggetti.js');
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const CAT = O.CAT;
  const r1 = x => Math.round(x * 100) / 100;
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------------- LE ZONE ----------------
  // parti del corpo (per il disegno): torso, braccia, avambracci, bacino, cosce, polpacci, piedi, mani, collo
  const ZONE = {
    testa: { nome: 'Testa', pila: true }, collo: { nome: 'Collo', pila: true }, busto: { nome: 'Busto', pila: true },
    spalle: { nome: 'Spalle', pila: false }, mani: { nome: 'Mani', pila: true }, gambe: { nome: 'Gambe', pila: true },
    ginocchia: { nome: 'Ginocchia', pila: false }, piedi: { nome: 'Piedi', pila: true }, schiena: { nome: 'Schiena', pila: false },
  };
  const ZORD = ['testa', 'collo', 'busto', 'spalle', 'mani', 'gambe', 'ginocchia', 'piedi', 'schiena'];

  // ---------------- I CAPI ----------------
  // [id, nome, corto, zona, parti, spessore (m), colore, prezzo, peso, calore, extra]
  // extra: arm (protezione 0-1), ill (roba che scotta), acc (accessorio disegnato a parte: forma), ombra (copre il volto)
  const T = 'torso', B = 'braccia', A = 'avambracci', H = 'bacino', C = 'cosce', P = 'polpacci', F = 'piedi', M = 'mani', N = 'collo';
  const CAPI = [
    // sotto
    ['canotta', 'canottiera di cotone', 'Canotta', 'busto', [T], .006, '#e8e2d4', 1, .1, .05],
    ['maglietta', 'maglietta a maniche corte', 'Maglietta', 'busto', [T, B], .008, '#d8d0c0', 2, .15, .05],
    ['maglietta_righe', 'maglietta a righe da marinaio', 'Marinara', 'busto', [T, B], .008, '#2a3a6a', 3, .15, .05],
    ['camicia', 'camicia bianca', 'Camicia', 'busto', [T, B, A], .01, '#f0ece2', 4, .25, .08],
    ['camicia_quadri', 'camicia di flanella a quadri', 'Flanella', 'busto', [T, B, A], .012, '#8a2a24', 5, .35, .12],
    ['dolcevita', 'dolcevita nero', 'Dolcevita', 'busto', [T, B, A, N], .012, '#1e1c22', 6, .35, .15],
    ['maglione', 'maglione di lana', 'Maglione', 'busto', [T, B, A], .018, '#7a3a2a', 8, .8, .3],
    ['felpa', 'felpa col cappuccio', 'Felpa', 'busto', [T, B, A], .018, '#5a5e66', 6, .6, .2],
    ['gilet', 'gilet di lana', 'Gilet', 'busto', [T], .016, '#5a4a3a', 5, .3, .12],
    ['grembiule', 'grembiule da bottega', 'Grembiule', 'busto', [T, H, C], .012, '#ece8dc', 2, .3, 0],
    ['vestiti', 'vestito da casa', 'Vestito', 'busto', [T, B, H, C], .012, '#5a6a7a', 8, 1.5, .2],
    ['tuta', 'tuta da lavoro', 'Tuta', 'busto', [T, B, A, H, C, P], .016, '#3a5a7a', 8, 1, .15],
    // sopra
    ['giacca', 'giacca di panno', 'Giacca', 'busto', [T, B, A, H], .024, '#8c2f24', 12, 1.2, .25],
    ['giacca_pelle', 'giacca di pelle', 'Chiodo', 'busto', [T, B, A], .026, '#241a16', 20, 2, .35],
    ['giubbotto_jeans', 'giubbotto di jeans', 'Jeans (giubb.)', 'busto', [T, B, A], .024, '#4a6a9a', 10, 1.2, .2],
    ['piumino', 'piumino imbottito', 'Piumino', 'busto', [T, B, A], .045, '#2e5a4a', 22, 1.5, .55],
    ['cappotto', 'cappotto lungo', 'Cappotto', 'busto', [T, B, A, H, C], .03, '#3a3e4a', 20, 2.5, .5],
    ['impermeabile', 'impermeabile', 'Impermeabile', 'busto', [T, B, A, H, C], .028, '#8a7a4a', 14, 1, .2],
    ['montone', 'giaccone di montone', 'Montone', 'busto', [T, B, A, H], .045, '#7a5a3a', 30, 3, .6],
    ['divisa', 'divisa dei Grigi', 'Divisa', 'busto', [T, B, A, H], .022, '#4a5060', 0, 2, .3, { ill: 1 }],
    ['giubbotto', 'giubbotto antiproiettile', 'Antiproiettile', 'busto', [T], .04, '#3e4a32', 80, 6, .1, { arm: .45, ill: 1 }],
    ['scialle', 'scialle di lana', 'Scialle', 'busto', [T, B], .03, '#6a4a6a', 6, .5, .2],
    // gambe
    ['mutande', 'mutande', 'Mutande', 'gambe', [H], .006, '#e8e2d4', 1, .05, 0],
    ['calze_nylon', 'calze di nylon', 'Calze', 'gambe', [H, C, P], .003, '#2a2024', 2, .05, .02],
    ['calzamaglia', 'calzamaglia di lana', 'Calzamaglia', 'gambe', [H, C, P], .006, '#3a2a2a', 3, .2, .15],
    ['pantaloni', 'pantaloni di panno', 'Pantaloni', 'gambe', [H, C, P], .014, '#3a3a40', 8, .8, .15],
    ['jeans', 'jeans', 'Jeans', 'gambe', [H, C, P], .014, '#2e4a7a', 10, .8, .12],
    ['velluto', 'pantaloni di velluto', 'Velluto', 'gambe', [H, C, P], .016, '#6a4a2a', 9, .9, .18],
    ['pantaloni_lavoro', 'pantaloni da lavoro', 'Da lavoro', 'gambe', [H, C, P], .016, '#4a4a3a', 7, 1, .15],
    ['pantaloni_grigi', 'pantaloni della divisa', 'Grigi', 'gambe', [H, C, P], .014, '#3a404c', 0, .8, .15, { ill: 1 }],
    ['gonna', 'gonna di lana', 'Gonna', 'gambe', [H, C], .03, '#5a2a3a', 8, .6, .12],
    ['pantaloncini', 'pantaloncini', 'Calzoncini', 'gambe', [H, C], .012, '#c8b88a', 3, .3, 0],
    // piedi
    ['calzini', 'calzini di lana', 'Calzini', 'piedi', [F], .005, '#6a6a70', 1, .05, .05],
    ['scarpe', 'scarponi', 'Scarponi', 'piedi', [F], .02, '#3a2a1e', 12, 1.5, .1],
    ['scarpe_eleganti', 'scarpe di cuoio', 'Scarpe buone', 'piedi', [F], .014, '#1a1414', 15, .8, .05],
    ['scarpe_tela', 'scarpe di tela', 'Tela', 'piedi', [F], .012, '#d8d4c8', 4, .5, .02],
    ['stivali', 'stivali di gomma', 'Stivali', 'piedi', [F, P], .02, '#1e2a22', 10, 2, .1],
    ['ciabatte', 'ciabatte', 'Ciabatte', 'piedi', [F], .01, '#6a4a6a', 1, .3, 0],
    // mani e collo
    ['guanti_lana', 'guanti di lana', 'Guanti lana', 'mani', [M], .006, '#5a2a2a', 2, .1, .1],
    ['guanti', 'guanti di pelle', 'Guanti', 'mani', [M], .006, '#2a1e18', 6, .2, .08],
    ['sciarpa', 'sciarpa', 'Sciarpa', 'collo', [], .03, '#a83a3a', 3, .2, .1, { acc: 'sciarpa' }],
    // testa
    ['berretto', 'berretto di lana', 'Berretto', 'testa', [], 0, '#3a3a44', 2, .1, .15, { acc: 'beanie' }],
    ['coppola', 'coppola', 'Coppola', 'testa', [], 0, '#5a4a3a', 3, .1, .05, { acc: 'flat' }],
    ['cappello', 'cappello di feltro', 'Cappello', 'testa', [], 0, '#2a2420', 8, .2, .05, { acc: 'fedora' }],
    ['colbacco', 'colbacco di pelo', 'Colbacco', 'testa', [], 0, '#4a3a2e', 10, .3, .25, { acc: 'ushanka' }],
    ['fazzoletto', 'fazzoletto da testa', 'Foulard', 'testa', [], 0, '#8a3a5a', 2, .05, .05, { acc: 'scarf' }],
    ['casco', 'casco da moto', 'Casco', 'testa', [], 0, '#c83a2a', 15, 1, .05, { acc: 'casco', arm: .08 }],
    ['elmetto', 'elmetto', 'Elmetto', 'testa', [], 0, '#3e4a32', 6, 1.2, 0, { acc: 'elmetto', arm: .1, ill: 1 }],
    ['passamontagna', 'passamontagna', 'Passamont.', 'testa', [], 0, '#1a1a1e', 2, .1, .1, { acc: 'passamontagna', ombra: 1 }],
    ['maschera_gas', 'maschera antigas', 'Antigas', 'testa', [], 0, '#3a3e36', 10, 1, 0, { acc: 'antigas', ombra: 1 }],
    // posti a parte
    ['paraspalle', 'paraspalle di cuoio', 'Paraspalle', 'spalle', [], 0, '#4a3a2a', 8, 1, 0, { acc: 'paraspalle', arm: .05 }],
    ['paraginocchia', 'paraginocchia', 'Ginocchiere', 'ginocchia', [], 0, '#2a2a2e', 5, .6, 0, { acc: 'paraginocchia', arm: .03 }],
    ['zaino', 'zaino militare', 'Zaino', 'schiena', [], 0, '#4a5a3a', 8, 1, 0, { acc: 'zaino' }],
  ];
  const CAPO = {};
  CAPI.forEach(([id, nome, corto, zona, parti, sp, col, prezzo, peso, calore, ex]) => {
    CAPO[id] = Object.assign({ id, nome, corto, zona, parti, sp, col, calore }, ex || {});
    const c = CAT[id];
    if (c) Object.assign(c, { calore, corto, capo: 1 }, ex && ex.ill ? { ill: 1 } : {});   // gli id che c'erano restano, con i dati nuovi
    else CAT[id] = Object.assign({ id, nome, cat: 'vestiti', prezzo, peso, q: 4, calore, corto, capo: 1 }, ex && ex.ill ? { ill: 1 } : {});
  });
  // nei negozi e nei mobili
  const sell = (ref, ids) => { const row = O.SHOPLIST.find(r => r[0] === ref); if (row) ids.forEach(id => { if (!row[1].includes(id)) row[1].push(id); }); };
  sell('use:sartoria', ['canotta', 'maglietta', 'camicia', 'camicia_quadri', 'dolcevita', 'felpa', 'gilet', 'giacca', 'impermeabile', 'mutande', 'pantaloni', 'velluto', 'gonna', 'calzamaglia', 'calzini', 'scialle', 'coppola', 'cappello', 'fazzoletto', 'sciarpa', 'guanti_lana']);
  sell('use:emporio', ['canotta', 'mutande', 'calzini', 'maglietta', 'pantaloni_lavoro', 'scarpe_tela', 'ciabatte', 'berretto', 'grembiule', 'tuta']);
  sell('villaggio', ['colbacco', 'montone', 'calzamaglia']);
  O.SHOPLIST.filter(r => /mercato|magazzino|porto/.test(r[0])).forEach(r => ['jeans', 'giubbotto_jeans', 'giacca_pelle', 'piumino', 'scarpe_eleganti', 'maglietta_righe', 'casco', 'paraginocchia', 'paraspalle'].forEach(id => { if (!r[1].includes(id)) r[1].push(id); }));
  if (O.LOOT) { const add = (k, l) => { O.LOOT[k] = (O.LOOT[k] || []).concat(l); };
    add('bookcaseClosedWide', [['canotta', .3, 1, 2], ['mutande', .3, 1, 2], ['calzini', .3, 1, 3], ['camicia', .2, 1, 1], ['pantaloni', .15, 1, 1], ['dolcevita', .08, 1, 1], ['gonna', .1, 1, 1], ['camicia_quadri', .1, 1, 1]]);
    add('coatRackStanding', [['coppola', .2, 1, 1], ['cappello', .15, 1, 1], ['giacca', .15, 1, 1], ['montone', .05, 1, 1]]); }

  // ---------------- ADDOSSO ----------------
  // st.ogg.worn = { busto: [dentro → fuori], …, dx/sx: le mani (la destra è quella del motore: arma o attrezzo) }
  const START = { gambe: ['mutande', 'jeans'], busto: ['canotta', 'maglietta', 'giacca'], piedi: ['calzini', 'scarpe'] };
  function worn(st) {
    const M = O.S(st); if (!M.worn || !M.worn.v2) { const old = M.worn || {}; M.worn = { v2: 1 }; ZORD.forEach(z => { M.worn[z] = (START[z] || []).slice(); }); Object.entries(old).forEach(([k, id]) => { if (CAPO[id] && !M.worn[CAPO[id].zona].includes(id)) M.worn[CAPO[id].zona].push(id); }); if (old.sx) M.worn.sx = old.sx; }
    return M.worn;
  }
  const R_ = (ok, msg) => ({ ok, msg });
  const nm = id => (CAT[id] ? CAT[id].nome : id);
  const bag = st => O.inv(st);
  const take = (st, id) => { const b = bag(st); if (!(b[id] >= 1)) return false; b[id] = r1(b[id] - 1); if (b[id] <= 0) delete b[id]; return true; };
  const give = (st, id) => { const b = bag(st); b[id] = r1((b[id] || 0) + 1); };
  // indossa sopra (o al posto `at` della pila)
  function wear(st, id, at) {
    const C = CAPO[id]; if (!C) return R_(false, 'Non si indossa.');
    if (!take(st, id)) return R_(false, 'Non ce l\'hai.');
    const W = worn(st), L = W[C.zona]; let out = '';
    if (!ZONE[C.zona].pila && L.length) { const old = L.pop(); give(st, old); out = ` al posto di ${nm(old)}`; }
    let pos; if (at === undefined || at >= L.length) { L.push(id); pos = L.length - 1; } else { pos = Math.max(0, at); L.splice(pos, 0, id); }
    upd(st); const sotto = L[pos + 1];
    return R_(true, `Indossi ${nm(id)}${out}${sotto ? ` sotto ${nm(sotto)}` : L.length > 1 && pos > 0 ? ` sopra ${nm(L[pos - 1])}` : ''}.`);
  }
  function unwear(st, zona, i) {
    const W = worn(st);
    if (zona === 'sx' || zona === 'dx') { const id = W[zona]; if (!id) return R_(false, 'La mano è vuota.'); delete W[zona]; give(st, id); upd(st); return R_(true, `Metti via ${nm(id)}.`); }
    const L = W[zona]; if (!L || !L.length) return R_(false, 'Lì non hai niente.');
    const k = i === undefined ? L.length - 1 : i, id = L[k]; if (!id) return R_(false, 'Lì non hai niente.');
    L.splice(k, 1); give(st, id); upd(st); return R_(true, `Ti togli ${nm(id)}.`);
  }
  // sposta un capo nella pila (da i a j): sopra o sotto
  function move(st, zona, i, j) {
    const L = worn(st)[zona]; if (!L || !L[i] || i === j) return R_(false, '');
    const [id] = L.splice(i, 1); L.splice(Math.max(0, Math.min(L.length, j)), 0, id); upd(st);
    return R_(true, `${cap(nm(id))}: ${j > i ? 'sopra' : 'sotto'}.`);
  }
  function strip(st, all) {
    const W = worn(st); let n = 0;
    ZORD.forEach(z => { const L = W[z], keep = []; L.forEach(id => { if (!all && ['mutande', 'canotta'].includes(id) && !keep.includes(id)) keep.push(id); else { give(st, id); n++; } }); W[z] = keep; });
    upd(st); return R_(!!n, n ? (all ? 'Ti spogli del tutto. Fa freddo.' : 'Ti spogli: resti in mutande e canottiera.') : 'Non hai niente da togliere.');
  }
  // le mani: la destra è quella del motore (arma o attrezzo); la sinistra tiene un oggetto qualunque fino a 3 kg
  const canHold = id => !!CAT[id] && !CAPO[id] && CAT[id].peso <= 3 && !CAT[id].st;
  function hold(st, id) {
    if (!canHold(id)) return R_(false, 'In mano non ci sta, o va indossato.');
    if (!take(st, id)) return R_(false, 'Non ce l\'hai.');
    const W = worn(st), old = W.sx; if (old) give(st, old); W.sx = id; upd(st); return R_(true, `Nella sinistra: ${nm(id)}.`);
  }
  // scambia le mani: quello che hai nella sinistra passa alla destra (se si impugna), e viceversa
  function swap(st) {
    const W = worn(st), p = st.player, AZ = typeof Azioni !== 'undefined' ? Azioni : null; const dx = p.hand || (p.cur && p.cur !== 'pugni' ? p.cur : null), sx = W.sx || null;
    if (!dx && !sx) return R_(false, 'Hai le mani vuote.');
    if (sx) { give(st, sx); delete W.sx; }
    if (AZ && AZ.playerEquip) { if (sx && !AZ.playerEquip(st, sx)) { take(st, sx); W.sx = sx; return R_(false, `${cap(nm(sx))} non si impugna con la destra.`); } if (!sx) AZ.playerEquip(st, null); }
    if (dx && canHold(dx) && bag(st)[dx] >= 1) { take(st, dx); W.sx = dx; }
    upd(st); return R_(true, 'Cambi mano.');
  }
  // usare quello che hai nella sinistra: si mangia, si beve, si accende
  function useLeft(st) {
    const W = worn(st), id = W.sx; if (!id) return R_(false, 'Nella sinistra non hai niente.');
    if (CAT[id].eat) { give(st, id); delete W.sx; const r = O.act(st, 'usa', id); if (bag(st)[id] >= 1) { take(st, id); W.sx = id; } return r; }
    return R_(false, `${cap(nm(id))}: tenuta pronta nella sinistra.`);
  }
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  function list(st) { const W = worn(st), out = []; ZORD.forEach(z => W[z].forEach(id => out.push(id))); return out; }
  const warmth = st => r1(list(st).reduce((s, id) => s + (CAPO[id].calore || 0), 0));
  const armor = st => Math.min(.6, r1(list(st).reduce((s, id) => s + (CAPO[id].arm || 0), 0)));
  function upd(st) { const p = st.player; p.armor = armor(st); p.worn = worn(st); p.wornV = (p.wornV || 0) + 1; }
  function view(st) {
    const W = worn(st), p = st.player;
    return { zone: ZORD.map(z => ({ zona: z, nome: ZONE[z].nome, pila: ZONE[z].pila, capi: W[z].map((id, i) => ({ id, i, nome: nm(id), corto: CAPO[id].corto })) })),
      dx: p.hand || (p.cur && p.cur !== 'pugni' ? p.cur : null), sx: W.sx || null, calore: warmth(st), arm: armor(st), nudo: !W.busto.length && !W.gambe.length };
  }
  // quello che si vede, per il disegno: [{ id, col, parti, sp, acc }] dal dentro al fuori, zona per zona
  function outfitOfPlayer(st) { const W = worn(st), out = []; ZORD.forEach(z => W[z].forEach(id => out.push(Object.assign({}, CAPO[id])))); return out; }

  // ---------------- GLI ABITANTI SI VESTONO ----------------
  // secondo chi sono: mestiere, parte, età, donna o uomo, soldi. Il colore di fuori resta quello del loro aspetto (look.top/bottom),
  // così chi li ricorda «con la giacca rossa» li riconosce.
  const PAL = ['#3a3e4a', '#5a4a3a', '#2a3a2e', '#6a3a2a', '#4a4a52', '#7a6a4a', '#2e3a4e', '#5a2a2a', '#8a7a5a', '#3a2e2a', '#6a6a60', '#2a2a2e'];
  function outfitOf(n, fem) {
    const L = n.look || {}, h = hash((n.id || '') + (L.top || '') + (L.skin || '')), r = (k, m) => ((h >>> k) % m), pk = (a, k) => a[r(k, a.length)];
    const job = String((n.pop && n.pop.job && (n.pop.job.base || n.pop.job.title)) || n.role || '').toLowerCase(), age = (n.pop && n.pop.age) || 35, rich = n.pop && n.pop.money > 60;
    const o = [], put = (id, col) => { if (CAPO[id]) o.push(Object.assign({}, CAPO[id], col ? { col } : {})); };
    const mute = c => { if (!c || c[0] !== '#' || c.length < 7) return c; const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), m = (v[0] + v[1] + v[2]) / 3; return '#' + v.map(x => Math.round((x * .45 + m * .55) * .78).toString(16).padStart(2, '0')).join(''); };   // l'inverno spegne i colori
    const top = mute(L.top), bot = mute(L.bottom);
    put('mutande'); if (fem && r(1, 3)) put(age > 45 ? 'calzamaglia' : 'calze_nylon', fem && age > 45 ? '#3a2a2a' : null);
    if (n.cop || n.military || /guardia|grigi|tutela|soldat|sentinella/.test(job)) {
      put('canotta'); put('camicia', '#8a8e96'); put('pantaloni_grigi', bot); put('divisa', top || '#4a5060'); if (r(3, 3) === 0) put('giubbotto');
      put('calzini'); put('stivali', '#141416'); put(r(5, 2) ? 'elmetto' : 'coppola', '#3a404c'); if (r(7, 4) === 0) put('paraspalle', '#2a2e36'); return o;
    }
    if (/beduin|pastore|nomade/.test(job) || (n.faction === 'beduini')) { put('canotta'); put('vestiti', '#8a7a5a'); put('scialle', top || '#6a5a3a'); put('pantaloni', bot || '#5a4a3a'); put('scarpe'); put('fazzoletto', pk(['#8a6a3a', '#5a3a2a', '#c8b88a'], 9)); return o; }
    // sotto
    put(r(2, 4) ? 'canotta' : 'maglietta');
    // gambe
    if (fem && (age > 40 || r(4, 2))) put('gonna', bot); else put(/pesc|scaric|operai|mecc|minat|carbon|bosc|bracc|edil|murat/.test(job) ? 'pantaloni_lavoro' : age < 30 && r(6, 2) ? 'jeans' : r(6, 3) ? 'pantaloni' : 'velluto', bot);
    put('calzini');
    // busto e piedi secondo il mestiere
    if (/pesc|marinai|scaricat|porto/.test(job)) { put('maglietta_righe'); put('maglione', pk(PAL, 8)); put('impermeabile', top || '#c8a83a'); put('stivali'); put(r(9, 2) ? 'berretto' : 'coppola', pk(PAL, 10)); }
    else if (/operai|mecc|minat|carbon|fabbr|saldat|edil|murat|scaric/.test(job)) { put('camicia_quadri', pk(['#8a2a24', '#2a4a6a', '#3a5a3a'], 8)); put('tuta', top || '#3a5a7a'); put('scarpe'); put(r(9, 3) ? 'coppola' : 'berretto', pk(PAL, 10)); if (/minat|saldat/.test(job)) put('paraginocchia'); }
    else if (/bosc|taglialegna|pastor|bracc|contad|vign|ortol/.test(job)) { put('camicia_quadri', pk(['#8a2a24', '#5a3a2a', '#3a5a3a'], 8)); put('gilet', pk(PAL, 11)); put('montone', top || '#7a5a3a'); put('stivali'); put(r(9, 2) ? 'colbacco' : 'coppola'); }
    else if (/forn|panett|macell|cuoc|bar|camerier|oste|bottega|commess|aliment|droghier/.test(job)) { put('camicia'); put('maglione', top || pk(PAL, 8)); put('grembiule'); put(fem ? 'scarpe_tela' : 'scarpe'); if (fem) put('fazzoletto', pk(['#8a3a5a', '#3a5a8a', '#c8b88a'], 9)); }
    else if (/impieg|banc|notai|avvoc|medic|maestr|profess|prete|sacrest|biblio|ragion/.test(job) || rich) { put('camicia'); put(r(8, 2) ? 'gilet' : 'dolcevita', pk(PAL, 8)); put('giacca', pk(PAL, 11)); put('cappotto', top || '#3a3e4a'); put('scarpe_eleganti'); if (r(9, 2)) put('cappello'); put('sciarpa', pk(['#a83a3a', '#2a2a2e', '#c8b88a', '#3a5a8a'], 12)); if (fem) put('guanti'); }
    else if (age < 26) { put(r(8, 2) ? 'felpa' : 'maglione', pk(PAL, 8)); put(r(9, 3) ? 'giubbotto_jeans' : r(9, 2) ? 'giacca_pelle' : 'piumino', top); put(r(10, 2) ? 'scarpe_tela' : 'scarpe'); if (r(11, 3) === 0) put('berretto', pk(PAL, 12)); }
    else if (fem) { put('camicia', pk(['#f0ece2', '#e8d8d0', '#d8e0e8'], 8)); put(r(8, 2) ? 'maglione' : 'scialle', pk(PAL, 9)); put('cappotto', top); put(age > 50 ? 'scarpe_eleganti' : 'scarpe_tela', '#2a2020'); if (age > 50 || r(10, 2)) put('fazzoletto', pk(['#8a3a5a', '#3a5a8a', '#6a4a2a', '#2a2a2e'], 11)); }
    else { put(r(8, 2) ? 'camicia' : 'camicia_quadri', pk(['#f0ece2', '#8a2a24', '#2a4a6a'], 7)); put('maglione', pk(PAL, 9)); put(r(10, 2) ? 'giacca' : 'cappotto', top); put('scarpe'); if (r(11, 3) === 0) put(pk(['coppola', 'berretto', 'cappello'], 12)); if (r(12, 3) === 0) put('sciarpa', pk(['#a83a3a', '#2a2a2e', '#3a5a8a'], 13)); }
    if (n.faction && /famiglia|marsiglia|squalo/.test(n.faction)) { o.forEach(x => { if (x.id === 'cappotto' || x.id === 'giacca') x.col = '#1a1a1e'; }); put('guanti'); }
    if ((L.extra || '').includes('backpack')) put('zaino', pk(['#2f5a6a', '#8a3a2a', '#3a4a2a', '#c8862a'], 14));
    return o;
  }

  // ---------------- IL MENU CHIAMA QUESTE ----------------
  (function hook() {
    const a0 = O.act;
    O.act = function (st, id, arg, ex) {
      const k = String(id).replace(/^og_/, '');
      switch (k) {
        case 'indossa': return wear(st, arg, ex && ex.at);
        case 'togli': { const [z, i] = String(arg).split(':'); return unwear(st, z, i === undefined ? undefined : +i); }
        case 'sposta': return move(st, arg, ex.i, ex.j);
        case 'spogliati': return strip(st, !!(ex && ex.tutto));
        case 'tieni': return hold(st, arg);
        case 'scambia_mani': return swap(st);
        case 'usa_sinistra': return useLeft(st);
      }
      return a0.apply(this, arguments);
    };
    O.SLOT_OF = Object.fromEntries(Object.values(CAPO).map(c => [c.id, c.zona]));
    O.canHold = canHold; O.warmth = warmth;
  })();
  // si ricalcola protezione e calore a ogni partita
  if (G.HOOKS) { const c0 = G.HOOKS.create; G.HOOKS.create = st => { if (c0) c0(st); try { upd(st); } catch (e) { } }; }

  return { ZONE, ZORD, CAPO, worn, wear, unwear, move, strip, hold, swap, useLeft, canHold, warmth, armor, view, outfitOf, outfitOfPlayer, list, upd };
})();
if (typeof module !== 'undefined') module.exports = Guardaroba;
