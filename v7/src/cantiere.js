/* Porto Vecchio — Il Cantiere del covo (come il laboratorio di Fallout 4).
   Y: entri nel cantiere del covo dove sei (la tua casa, una base della Risacca, o un posto che reclami). La visuale sale, in basso la barra:
   TERRENO (disbosca, cava, spiana), SOTTOTERRA (botola, cunicolo, discesa, stanza, bunker), STRUTTURE (muri, recinti, sacchi, tettoie, capanni, baracche, pavimenti, porte),
   ARREDI (letti, tavoli, sedie, scaffali, stufe, lampade, tappeti, bandiere), POSTAZIONI (banco delle armi, cucina, focolare, laboratorio tessile, stamperia, radio,
   forgia, banco da lavoro, falegname, infermeria, camera oscura, alambicco).
   Clic: piazzi (la sagoma è verde se si può, rossa se no). Rotella o R: giri. Tasto destro: lasci perdere. Clic su una cosa già messa: Sposta, Gira, Togli (ti torna la roba).
   Le cose si pagano in materiali (dalle tasche e dalle scorte delle basi), oppure se ce l'hai in tasca la piazzi direttamente (una sedia, un fornello, la macchina da cucire).
   Le postazioni sono oggetti veri: si animano (il fuoco, la radio che lampeggia, il rullo della stamperia, l'ago che va), e cliccandole fuori dal cantiere
   ci vai e si apre il loro banco. Il banco delle armi monta anche le modifiche alle armi (canna, mirino, caricatore, silenziatore, calcio).
   Stato: st.covo = { covi, obj, mods }. Le strutture rendono solide le caselle (e le restituiscono quando le togli). */
var Cantiere = (function () {
  'use strict';
  const PV = () => window.__pv, ST = () => PV() && PV().st, Gm = () => (PV() && PV().G) || Game, R = () => PV() && PV().R;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const O = () => Oggetti, TS = () => Gm().TS, T = () => Gm().T;
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';

  // =====================================================================================================================
  // CATALOGO
  // =====================================================================================================================
  // fp: ingombro in caselle [larghe, profonde] (si aggancia alla griglia); senza fp si piazza libero (passo di 25 cm)
  // solid: 'pieno' (tutte le caselle), 'bordo' (il perimetro tranne la porta); st: postazione di oggetti.js; anim; menu: banco dedicato
  const CATS = [['terreno', 'Terreno'], ['sotto', 'Sottoterra'], ['strutture', 'Strutture'], ['arredi', 'Arredi'], ['postazioni', 'Postazioni'], ['difese', 'Difese']];
  const B = [
    // terreno: si fa sulla casella sotto il puntatore
    { id: 'disbosca', cat: 'terreno', nome: 'Disbosca', desc: 'Abbatte alberi e cespugli. Ti dà legna.', tool: 'ascia|sega', op: 'disbosca' },
    { id: 'cava', cat: 'terreno', nome: 'Cava', desc: 'Spacca roccia e pareti. Ti dà pietre.', tool: 'piccone', op: 'cava' },
    { id: 'spiana', cat: 'terreno', nome: 'Spiana', desc: 'Livella il terreno attorno (3×3).', tool: 'pala', op: 'spiana' },
    { id: 'sterra', cat: 'terreno', nome: 'Sterra', desc: 'Toglie l\'erba: terra battuta.', tool: 'pala|zappa', op: 'sterra' },
    // sottoterra: si scava dove sei (e verso dove guardi)
    { id: 'botola', cat: 'sotto', nome: 'Botola', desc: 'Apre un pozzo dove sei. Da fuori resta una botola.', tool: 'pala|piccone', op: 'botola' },
    { id: 'cunicolo', cat: 'sotto', nome: 'Cunicolo', desc: 'Sotto terra: scava avanti, in piano.', tool: 'pala|piccone', op: 'cunicolo' },
    { id: 'discesa', cat: 'sotto', nome: 'Discesa', desc: 'Sotto terra: scava avanti, scendendo.', tool: 'pala|piccone', op: 'discesa' },
    { id: 'stanza', cat: 'sotto', nome: 'Stanza', desc: 'Sotto terra: allarga a una stanza 3×3.', tool: 'pala|piccone', op: 'stanza' },
    { id: 'bunker', cat: 'sotto', nome: 'Bunker', desc: 'Sotto terra: una sala 5×5 puntellata.', tool: 'pala|piccone', op: 'bunker', cost: { travi: 4, assi: 6 } },
    { id: 'uscita', cat: 'sotto', nome: 'Uscita', desc: 'Sotto terra: apre una botola sopra di te.', tool: 'pala|piccone', op: 'uscita' },
    // strutture
    { id: 'muro_assi', cat: 'strutture', nome: 'Muro di assi', fp: [1, 1], solid: 'pieno', cost: { assi: 4, chiodi: 1 }, mk: 'muro', col: '#7a5634' },
    { id: 'muro_lamiera', cat: 'strutture', nome: 'Muro di lamiera', fp: [1, 1], solid: 'pieno', cost: { lamiera: 2, chiodi: 1 }, mk: 'muro', col: '#7a8088' },
    { id: 'muro_mattoni', cat: 'strutture', nome: 'Muro di mattoni', fp: [1, 1], solid: 'pieno', cost: { mattoni: 6, malta: 1 }, mk: 'muro', col: '#9a5a44' },
    { id: 'porta', cat: 'strutture', nome: 'Porta', fp: [1, 1], cost: { assi: 3, cerniere: 1 }, mk: 'porta', col: '#6a4a2c' },
    { id: 'recinto', cat: 'strutture', nome: 'Recinto', fp: [1, 1], solid: 'pieno', cost: { assi: 2, chiodi: 1 }, mk: 'recinto', col: '#8a6a44' },
    { id: 'pavimento', cat: 'strutture', nome: 'Pavimento', fp: [1, 1], cost: { assi: 3 }, mk: 'pavimento', col: '#8a6238' },
    { id: 'tettoia', cat: 'strutture', nome: 'Tettoia', fp: [2, 2], cost: { assi: 6, travi: 4, lamiera: 2 }, mk: 'tettoia', col: '#6a5a4a' },
    { id: 'capanno', cat: 'strutture', nome: 'Capanno', fp: [3, 3], solid: 'bordo', cost: { assi: 16, travi: 6, chiodi: 3, lamiera: 3 }, mk: 'capanno', col: '#7a5634' },
    { id: 'baracca', cat: 'strutture', nome: 'Baracca di lamiera', fp: [3, 2], solid: 'bordo', cost: { lamiera: 8, travi: 4, chiodi: 2 }, mk: 'capanno', col: '#7a8088' },
    { id: 'lampione', cat: 'strutture', nome: 'Lampione a batteria', cost: { tubi: 1, lampadine: 1, batteria_auto: 1 }, mk: 'lampione', anim: 'luce' },
    { id: 'bandiera', cat: 'strutture', nome: 'Bandiera della Risacca', cost: { stoffa: 2, tubi: 1 }, mk: 'bandiera', anim: 'bandiera' },
    // arredi (si piazzano liberi; se ce l'hai in tasca non costano niente)
    { id: 'branda', cat: 'arredi', nome: 'Branda', item: 'branda', cost: { assi: 2, stoffa: 2 }, kit: 'bedSingle', sleep: 1 },
    { id: 'letto', cat: 'arredi', nome: 'Letto', item: 'materasso', cost: { assi: 4, stoffa: 3, materasso: 1 }, kit: 'bedDouble', sleep: 1 },
    { id: 'tavolo', cat: 'arredi', nome: 'Tavolo', item: 'tavolo', cost: { assi: 4, chiodi: 1 }, kit: 'desk' },
    { id: 'sedia', cat: 'arredi', nome: 'Sedia', item: 'sedia', cost: { assi: 2, chiodi: 1 }, kit: 'chair' },
    { id: 'panca', cat: 'arredi', nome: 'Panca', cost: { assi: 3, chiodi: 1 }, kit: 'bench' },
    { id: 'scaffale', cat: 'arredi', nome: 'Scaffale', item: 'scaffale', cost: { assi: 5, chiodi: 2 }, kit: 'bookcaseOpen' },
    { id: 'armadio', cat: 'arredi', nome: 'Armadio', cost: { assi: 6, cerniere: 1 }, kit: 'bookcaseClosedWide' },
    { id: 'appendiabiti', cat: 'arredi', nome: 'Attaccapanni', cost: { assi: 1 }, kit: 'coatRackStanding' },
    { id: 'tappeto', cat: 'arredi', nome: 'Tappeto', cost: { stoffa: 3 }, mk: 'tappeto', col: '#7a2e2a' },
    { id: 'lampada', cat: 'arredi', nome: 'Lampada a petrolio', item: 'lampada_petrolio', cost: { latta: 1, petrolio: 1 }, mk: 'lampada', anim: 'luce' },
    { id: 'stufa', cat: 'arredi', nome: 'Stufa a legna', item: 'stufa', cost: { lamiera: 3, tubo_stufa: 1 }, st: 'stufa', stm: 'st_stufa', anim: 'fuoco' },
    { id: 'barile_fuoco', cat: 'arredi', nome: 'Barile col fuoco', cost: { latta: 2, legna: 2 }, mk: 'barile', anim: 'fuoco' },
    { id: 'cassa', cat: 'arredi', nome: 'Cassa', item: 'casse', cost: { assi: 3 }, kit: 'cardboardBoxClosed' },
    { id: 'castello', cat: 'arredi', nome: 'Letto a castello', cost: { tubi: 4, materasso: 2, coperta: 2 }, pz: 'castello', sleep: 1 },
    { id: 'armadietti', cat: 'arredi', nome: 'Armadietti', cost: { lamiera: 6, cerniere: 3, lucchetto: 1 }, pz: 'armadietti' },
    { id: 'scaffale_met', cat: 'arredi', nome: 'Scaffale di ferro', cost: { tubi: 4, lamiera: 3, viti: 1 }, pz: 'scaffaleMet' },
    { id: 'cassettiera', cat: 'arredi', nome: 'Cassettiera', cost: { assi: 4, chiodi: 1 }, pz: 'cassettiera' },
    { id: 'sgabello', cat: 'arredi', nome: 'Sgabello', cost: { assi: 1, tubi: 1 }, pz: 'sgabello' },
    { id: 'televisore', cat: 'arredi', nome: 'Televisore', item: 'tv_rotta', cost: { tv_rotta: 1 }, pz: 'tv', anim: 'schermo' },
    { id: 'lume', cat: 'arredi', nome: 'Lume a olio', cost: { latta: 1, olio: 1 }, pz: 'lumeOlio', anim: 'luce' },
    { id: 'mappa', cat: 'arredi', nome: 'Mappa al muro', item: 'mappa', cost: { mappa: 1 }, pzw: 'mappa' },
    { id: 'casse_mil', cat: 'arredi', nome: 'Casse militari', cost: { lamiera: 2, assi: 2 }, pzc: 'mil' },
    { id: 'cartoni', cat: 'arredi', nome: 'Scatoloni', item: 'cartone', cost: { cartone: 2 }, pzc: 'cartoni' },
    { id: 'generatore', cat: 'arredi', nome: 'Generatore', cost: { motore_el: 1, lamiera: 2, benzina: 1 }, pz: 'generatore', anim: 'ventola' },
    { id: 'fari', cat: 'arredi', nome: 'Fari da cantiere', cost: { tubi: 2, lampadine: 2, cavo: 1 }, pz: 'fari', anim: 'luce' },
    { id: 'taniche', cat: 'arredi', nome: 'Taniche', item: 'tanica_vuota', cost: { tanica_vuota: 1 }, pz: 'tanica' },
    { id: 'estintore', cat: 'arredi', nome: 'Estintore', cost: { bombola: 1 }, pz: 'estintore' },
    { id: 'bobina', cat: 'arredi', nome: 'Bobina di cavo', cost: { cavo: 3 }, pz: 'bobina' },
    { id: 'baule', cat: 'arredi', nome: 'Baule', desc: 'Uno per covo. Ci metti quello che vuoi, quanto vuoi.', mk: 'baule', baule: 1 },
    { id: 'poster', cat: 'arredi', nome: 'Manifesto', item: 'poster', cost: { poster: 1 }, mk: 'poster' },
    // postazioni: ognuna col suo banco
    { id: 'banco_armi', cat: 'postazioni', nome: 'Banco delle armi', st: 'banco_lavoro', pz: 'bancoArmi', anim: 'morsa', menu: 'armi', cost: { assi: 6, ferro: 2, chiodi: 2, morsa: 1 } },
    { id: 'cucina', cat: 'postazioni', nome: 'Cucina', item: 'fornello', st: 'cucina', pz: 'cucina', anim: 'fornello', cost: { lamiera: 2, bombola: 1, tubi: 1 } },
    { id: 'focolare', cat: 'postazioni', nome: 'Focolare', st: 'cucina', st2: 'stufa', pz: 'focolare', anim: 'fuoco', cost: { pietre: 8, legna: 3 } },
    { id: 'tessile', cat: 'postazioni', nome: 'Laboratorio tessile', item: 'macchina_cucire', st: 'macchina_cucire', pz: 'tessile', pzm: 'st_macchina_cucire', anim: 'ago', cost: { assi: 3, macchina_cucire: 1 } },
    { id: 'stamperia', cat: 'postazioni', nome: 'Stamperia', item: 'ciclostile', st: 'ciclostile', pz: 'stamperia', pzm: 'st_ciclostile', anim: 'rullo', cost: { ciclostile: 1 } },
    { id: 'radio', cat: 'postazioni', nome: 'Banco radio', item: 'banco_radio', st: 'banco_radio', pz: 'bancoRadio', anim: 'radio', cost: { valvole: 3, cavo: 2, altoparlante: 1, assi: 2 } },
    { id: 'forgia', cat: 'postazioni', nome: 'Forgia', st: 'forgia', stm: 'st_forgia', pz: 'forgiaExtra', anim: 'brace', cost: { mattoni: 10, ferro: 3, carbone: 4 } },
    { id: 'banco_lavoro', cat: 'postazioni', nome: 'Banco da lavoro', item: 'banco', st: 'banco_lavoro', pz: 'bancoLavoro', anim: 'lampadina', cost: { assi: 6, chiodi: 2, travi: 2 } },
    { id: 'falegname', cat: 'postazioni', nome: 'Banco del falegname', st: 'banco_falegname', stm: 'st_banco_falegname', anim: 'segatura', cost: { assi: 8, chiodi: 2, sega: 1 } },
    { id: 'infermeria', cat: 'postazioni', nome: 'Infermeria', st: 'tavolo_medico', pz: 'infermeria', anim: 'lampadina', cost: { assi: 4, lenzuola: 2, garze: 2 } },
    { id: 'camera_oscura', cat: 'postazioni', nome: 'Camera oscura', st: 'camera_oscura', stm: 'st_camera_oscura', anim: 'rossa', cost: { assi: 4, vetro: 2, lampadine: 1 } },
    { id: 'alambicco', cat: 'postazioni', nome: 'Alambicco', st: 'alambicco', stm: 'st_alambicco', anim: 'fuoco', cost: { rame: 4, tubi: 2 } },
    // difese
    { id: 'sacchi', cat: 'difese', nome: 'Sacchi di sabbia', fp: [1, 1], solid: 'pieno', cost: { sacco_sabbia: 4 }, mk: 'sacchi', col: '#a89870' },
    { id: 'filo_spinato', cat: 'difese', nome: 'Filo spinato', fp: [1, 1], solid: 'pieno', cost: { filo_spinato: 2, tubi: 1 }, mk: 'filo', col: '#6a6e74' },
    { id: 'barricata', cat: 'difese', nome: 'Barricata', fp: [1, 1], solid: 'pieno', cost: { assi: 4, mobile_rotto: 1 }, mk: 'barricata', col: '#6a4a2c' },
    { id: 'torretta', cat: 'difese', nome: 'Torretta di guardia', fp: [2, 2], cost: { travi: 8, assi: 8, chiodi: 3 }, mk: 'torretta', col: '#6a4a2c' },
  ];
  const BY = Object.fromEntries(B.map(b => [b.id, b]));

  // le modifiche alle armi (banco delle armi)
  const MODS = {
    pistola: [['canna', 'Canna lunga', { range: 8, spread: -.01 }, { tubi: 1, ferro: 1 }], ['mirino', 'Mirino regolato', { spread: -.012 }, { ferro: 1, vetro: 1 }], ['caricatore', 'Caricatore lungo', { mag: 7 }, { lamiera: 1, molle: 1 }], ['silenziatore', 'Silenziatore', { noise: -22, dmg: -4 }, { tubi: 1, stoffa: 1 }]],
    lupara: [['canne', 'Canne rinforzate', { dmg: 8, range: 3 }, { tubi: 2, ferro: 1 }], ['calcio', 'Calcio imbottito', { kick: -.08, shake: -.05 }, { pelle: 1, assi: 1 }], ['pallettoni', 'Pallettoni', { pellets: 2, spread: .02 }, { piombo: 2 }]],
    mitra: [['calcio', 'Calcio ripiegabile', { kick: -.04, bloom: -.012 }, { tubi: 1, ferro: 1 }], ['caricatore', 'Caricatore doppio', { mag: 10 }, { lamiera: 1, molle: 1 }], ['canna', 'Canna lunga', { range: 6, spread: -.008 }, { tubi: 1, ferro: 1 }]],
    coltello: [['lama', 'Lama affilata', { dmg: 10 }, { carta_vetrata: 1 }], ['impugnatura', 'Impugnatura di cuoio', { rate: -.08 }, { pelle: 1 }]],
  };

  // =====================================================================================================================
  // STATO
  // =====================================================================================================================
  function S(st) { if (!st.covo) st.covo = { covi: [], obj: [], mods: {}, next: 1, busy: {} }; return st.covo; }
  function covi(st) {
    const C = S(st), out = C.covi.slice(), p = st.player;
    if (st.me && st.me.home) out.push({ id: 'casa', name: 'Casa tua', x: st.me.home.x, y: st.me.home.y, r: 14, home: true });
    (st.ris && st.ris.bases || []).filter(b => b.alive).forEach(b => out.push({ id: 'b' + b.id, name: b.name, x: b.cx || b.x, y: b.cy || b.y, r: 16 }));
    return out;
  }
  const covoAt = (st, x, y) => covi(st).find(c => Math.hypot(c.x - x, c.y - y) <= c.r) || null;
  function claim(st) {
    const p = st.player; if (covoAt(st, p.x, p.y)) return 'Qui sei già in un covo.';
    const C = S(st), n = C.covi.length + 1, pl = Gm().nearestPlace ? Gm().nearestPlace(p.x, p.y) : null;
    C.covi.push({ id: 'c' + n, name: `Covo ${pl ? 'vicino a ' + pl.name : n}`, x: p.x, y: p.y, r: 18 });
    return 'Questo posto adesso è tuo. Qui puoi costruire.';
  }
  const lvOf = st => { const p = st.player; return p.indoor ? `in:${p.indoor.b}:${p.indoor.f}` : p.lv && p.lv.k === 'ug' ? 'ug' : null; };   // fuori, sotto terra, o dentro casa (edificio:piano)

  // materiali: dalle tasche e dalle scorte delle basi (Risacca.EXT), oppure l'oggetto stesso se ce l'hai
  const EXT = () => (typeof Risacca !== 'undefined' && Risacca.EXT) || null;
  const have = (st, id) => Math.floor((O().inv(st)[id]) || 0);
  function missing(st, b) {
    if (b.item && have(st, b.item) >= 1) return [];
    const c = b.cost || {}; if (!Object.keys(c).length) return [];
    const X = EXT(); if (X && X.buildMiss) return X.buildMiss(st, c);
    return Object.entries(c).filter(([k, q]) => have(st, k) < q).map(([k, q]) => `${O().nm(k)} ×${q}`);
  }
  function pay(st, b) {
    if (b.item && have(st, b.item) >= 1) { const bag = O().inv(st); bag[b.item] -= 1; if (bag[b.item] <= 0) delete bag[b.item]; return { item: b.item }; }
    const c = b.cost || {}, X = EXT(); if (X && X.buildTake) X.buildTake(st, c); else { const bag = O().inv(st); Object.entries(c).forEach(([k, q]) => { bag[k] -= q; if (bag[k] <= 0) delete bag[k]; }); }
    return { cost: c };
  }
  function refund(st, o) { const bag = O().inv(st); if (o.paid && o.paid.item) bag[o.paid.item] = (bag[o.paid.item] || 0) + 1; else if (o.paid && o.paid.cost) Object.entries(o.paid.cost).forEach(([k, q]) => { const r = Math.floor(q * .75); if (r > 0) bag[k] = (bag[k] || 0) + r; }); }
  const hasTool = (st, t) => !t || t.split('|').some(k => have(st, k) >= 1 || st.player.hand === k);

  // =====================================================================================================================
  // TERRENO E SOTTOTERRA
  // =====================================================================================================================
  const tileOf = (x, y) => [Math.floor(x / TS()), Math.floor(y / TS())];
  const dirty = (tx, ty) => { const r = R(); if (r && r.dirtyAt) r.dirtyAt(tx * TS() + 1, ty * TS() + 1); };
  function terrain(st, b, tx, ty) {
    const G = Gm(), t = T(), v = G.tileAt(tx, ty), bag = O().inv(st);
    if (!hasTool(st, b.tool)) return { ok: false, msg: `Ti serve: ${b.tool.split('|').map(k => O().nm(k)).join(' o ')}.` };
    if (b.op === 'disbosca') { if (v !== t.TREE && v !== t.SHRUB) return { ok: false, msg: 'Qui non c\'è niente da tagliare.' }; G.setTile(tx, ty, t.GRASS); const q = v === t.TREE ? 3 : 1; bag.legna = (bag.legna || 0) + q; dirty(tx, ty); return { ok: true, msg: v === t.TREE ? 'L\'albero cade. Tre ciocchi di legna.' : 'Via il cespuglio.' }; }
    if (b.op === 'cava') { if (v !== t.ROCK && v !== t.CLIFF) return { ok: false, msg: 'Qui non c\'è roccia.' }; G.setTile(tx, ty, t.GRAVEL); bag.pietre = (bag.pietre || 0) + 3; dirty(tx, ty); return { ok: true, msg: 'La roccia si spacca. Tre pietre.' }; }
    if (b.op === 'sterra') { if (![t.GRASS, t.SHRUB, t.FIELD, t.DESERT, t.SAND].includes(v)) return { ok: false, msg: 'Qui è già terra, o non si può.' }; G.setTile(tx, ty, t.DIRT); dirty(tx, ty); return { ok: true, msg: 'Terra battuta.' }; }
    if (b.op === 'spiana') {
      const M = G.MAP, VW = M.VW, vh = M.vh, el = M.elev; if (!vh) return { ok: false, msg: 'Qui non si spiana.' };
      let s = 0, n = 0; for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const k = (ty + j) * VW + tx + i; if (vh[k] !== undefined) { s += vh[k]; n++; } }
      const h = s / (n || 1); for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const k = (ty + j) * VW + tx + i; if (vh[k] !== undefined) vh[k] = h; }
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = tx + i, y = ty + j; if (x < 0 || y < 0 || x >= G.GW || y >= G.GH) continue; if (el) el[y * G.GW + x] = h; dirty(x, y); }
      return { ok: true, msg: 'Il terreno è in piano.' };
    }
    return { ok: false, msg: 'Non si può.' };
  }
  function under(st, b) {
    const L = typeof Livelli !== 'undefined' ? Livelli : null; if (!L) return { ok: false, msg: 'Sotto terra non si scava, qui.' };
    const p = st.player; let r = null;
    if (b.cost) { const m = missing(st, b); if (m.length) return { ok: false, msg: `Mancano: ${m.join(', ')}.` }; }
    try {
      if (b.op === 'botola') r = L.digWall(st) || L.digHatch(st);
      else if (b.op === 'cunicolo') r = L.digAhead(st, 0);
      else if (b.op === 'discesa') r = L.digAhead(st, -1);
      else if (b.op === 'stanza') r = L.digRoom(st);
      else if (b.op === 'uscita') r = L.digUp(st);
      else if (b.op === 'bunker') {
        if (!p.lv || p.lv.k !== 'ug') return { ok: false, msg: 'Prima scendi sotto terra.' };
        const x0 = p.x, y0 = p.y, t0 = TS(); r = L.digRoom(st);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => { p.x = x0 + i * t0; p.y = y0 + j * t0; try { L.digRoom(st); } catch (e) { } });
        p.x = x0; p.y = y0; pay(st, b); S(st).bunkers = (S(st).bunkers || 0) + 1; r = 'Una sala grande, puntellata con travi e assi. Un bunker.';
      }
    } catch (e) { r = 'Qui non si riesce.'; }
    const ok = r && !/non puoi|non si|Prima|già|troppo|Ti serve|serve/i.test(r);
    return { ok, msg: r || 'Non si può.' };
  }

  // =====================================================================================================================
  // I MODELLI
  // =====================================================================================================================
  const KIT = {};   // mobili del kit caricati (Models.furniture è asincrono: si caricano all'inizio)
  function preload() { if (!window.Models || !Models.furniture) return; B.filter(b => b.kit && !KIT[b.kit]).forEach(b => { KIT[b.kit] = 'wait'; Models.furniture(b.kit).then(g => { KIT[b.kit] = g || null; }).catch(() => { KIT[b.kit] = null; }); }); }
  const LMt = {}; const lm = (c, e) => { const k = c + (e || ''); return LMt[k] || (LMt[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, e ? { emissive: new THREE.Color(e), emissiveIntensity: 1 } : {}))); };
  const box = (g, w, h, d, c, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lm(c)); m.position.set(x || 0, y || 0, z || 0); if (ry) m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const cyl = (g, r0, r1, h, c, x, y, z, e) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 12), lm(c, e)); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; g.add(m); return m; };
  const tag = (m, n) => { m.name = n; m.material = m.material.clone(); return m; };
  function model(b) {
    const g = new THREE.Group(), S0 = TS(), c = b.col || '#7a5634';
    const P = typeof Pezzi !== 'undefined' ? Pezzi : null;
    if (P && b.pz && P[b.pz]) { const extra = b.pzm && typeof OggettiUI !== 'undefined' && OggettiUI.stModel ? OggettiUI.stModel(b.pzm) : null; if (b.stm && typeof OggettiUI !== 'undefined') { const m0 = OggettiUI.stModel(b.stm); if (m0) g.add(m0); } if (/^(bancoArmi|bancoLavoro|cucina|focolare|tessile|stamperia|bancoRadio|infermeria|forgiaExtra)$/.test(b.pz)) P[b.pz](g, extra); else P[b.pz](g, 0, 0, 0, 0); }
    else if (P && b.pzw) P[b.pzw](g, 1.2, .8, 0, 1.5, 0);
    else if (P && b.pzc === 'mil') { P.cassaMil(g, 1, .5, .55, '#4a5a3a', 0, 0, 0); P.cassaMil(g, .8, .4, .5, '#3a4a32', .05, .5, 0, .1); P.cassaMil(g, .6, .3, .4, '#5a5a4a', .8, 0, .1, -.3); }
    else if (P && b.pzc === 'cartoni') { P.cartone(g, 0, 0, 0, .2, 1.2); P.cartone(g, .5, 0, .1, -.3, 1); P.cartone(g, .2, .38, 0, .5, .8); }
    else if (b.kit) { const K = KIT[b.kit]; if (K && K !== 'wait') g.add(K.clone(true)); else box(g, .9, .5, .6, '#7a5634', 0, .25, 0); }
    else if (b.stm && typeof OggettiUI !== 'undefined' && OggettiUI.stModel) { const m = OggettiUI.stModel(b.stm); if (m) g.add(m); }
    switch (b.mk) {
      case 'muro': box(g, S0, 2.3, .22, c, 0, 1.15, 0); for (let i = 0; i < 4; i++) box(g, S0 + .02, .04, .24, '#2a2420', 0, .3 + i * .55, 0); break;
      case 'porta': box(g, .14, 2.3, .22, c, -S0 / 2 + .07, 1.15, 0); box(g, .14, 2.3, .22, c, S0 / 2 - .07, 1.15, 0); box(g, S0, .2, .22, c, 0, 2.2, 0); tag(box(g, .9, 2, .06, '#5a3a20', -.1, 1, 0), 'anta'); break;
      case 'recinto': for (const x of [-.9, 0, .9]) box(g, .1, 1.1, .1, c, x, .55, 0); box(g, S0, .08, .05, c, 0, .8, 0); box(g, S0, .08, .05, c, 0, .4, 0); break;
      case 'pavimento': box(g, S0, .06, S0, c, 0, .03, 0); for (let i = -2; i <= 2; i++) box(g, S0, .065, .02, '#5a4028', 0, .03, i * .4); break;
      case 'tettoia': { const w = S0 * 2; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .14, 2.5, .14, '#5a4028', x * (w / 2 - .1), 1.25, z * (w / 2 - .1)); const r0 = box(g, w + .4, .08, w + .4, c, 0, 2.6, 0); r0.rotation.x = .08; break; }
      case 'capanno': { const w = (b.fp[0]) * S0, d = (b.fp[1]) * S0, h = 2.4;
        box(g, w, h, .12, c, 0, h / 2, -d / 2 + .06); box(g, .12, h, d, c, -w / 2 + .06, h / 2, 0); box(g, .12, h, d, c, w / 2 - .06, h / 2, 0);
        const side = (w - 1.1) / 2; box(g, side, h, .12, c, -w / 2 + side / 2, h / 2, d / 2 - .06); box(g, side, h, .12, c, w / 2 - side / 2, h / 2, d / 2 - .06); box(g, 1.1, .4, .12, c, 0, h - .2, d / 2 - .06);
        const rf = box(g, w + .5, .1, d + .6, b.id === 'baracca' ? '#6a7078' : '#5a5048', 0, h + .15, 0); rf.rotation.x = .1; for (let i = 0; i < 5; i++) box(g, w + .02, .04, .14, '#2a2420', 0, .4 + i * .45, -d / 2 + .05); break; }
      case 'lampione': cyl(g, .06, .08, 3, '#3a3a40', 0, 1.5, 0); box(g, .5, .06, .1, '#3a3a40', .22, 2.95, 0); tag(cyl(g, .1, .14, .16, '#f0e0a0', .45, 2.86, 0, '#ffd890'), 'luce'); break;
      case 'bandiera': cyl(g, .04, .05, 3.2, '#8a8a90', 0, 1.6, 0); { const f = tag(box(g, 1.1, .7, .02, '#1e3a5a', .58, 2.75, 0), 'telo'); const w0 = box(g, .9, .08, .03, '#35e6ff', .58, 2.75, .01); w0.name = 'onda'; } break;
      case 'tappeto': box(g, 1.6, .02, 1.1, c, 0, .01, 0); box(g, 1.3, .021, .8, '#c8a050', 0, .011, 0); box(g, 1.1, .022, .6, c, 0, .012, 0); break;
      case 'lampada': cyl(g, .08, .1, .06, '#5a4a2a', 0, .03, 0); tag(cyl(g, .06, .07, .18, '#f8e0a0', 0, .15, 0, '#ffc860'), 'luce'); cyl(g, .03, .03, .06, '#3a3a3a', 0, .27, 0); break;
      case 'barile': cyl(g, .3, .3, .85, '#4a3a2e', 0, .43, 0); tag(cyl(g, .0, .26, .45, '#ff7a20', 0, 1.05, 0, '#ff5a10'), 'fiamma'); break;
      case 'baule': { box(g, 1.1, .5, .62, '#6a4a2c', 0, .25, 0); const lid = new THREE.Group(); lid.position.set(0, .5, -.31); lid.name = 'coperchio'; g.add(lid);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, 1.1, 14, 1, false, 0, Math.PI), lm('#7a5634')); top.rotation.z = Math.PI / 2; top.position.set(0, 0, .31); lid.add(top);
        for (const x of [-.4, 0, .4]) { box(g, .06, .52, .64, '#3a3a40', x, .26, 0); const b2 = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .06, 14, 1, false, 0, Math.PI), lm('#3a3a40')); b2.rotation.z = Math.PI / 2; b2.position.set(x, 0, .31); lid.add(b2); }
        box(g, .1, .12, .04, '#c8a040', 0, .42, .33); break; }
      case 'poster': box(g, .7, 1, .02, '#e8e0cc', 0, 1.5, 0); box(g, .5, .3, .025, '#c83a3a', 0, 1.7, 0); box(g, .5, .05, .025, '#2a2a2e', 0, 1.35, 0); break;
      case 'banco_armi': box(g, 1.8, .08, .75, '#7a5634', 0, .86, 0); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .07, .86, .07, '#5a4028', x * .84, .43, z * .3);
        box(g, 1.7, 1.1, .05, '#4a3a2a', 0, 1.5, -.35); for (let i = 0; i < 3; i++) { box(g, .06, .9, .05, '#2a2a2e', -.5 + i * .5, 1.5, -.3); box(g, .25, .1, .06, '#5a3a20', -.5 + i * .5, 1.05, -.3); }
        tag(box(g, .2, .14, .16, '#4a4c52', .65, .97, .15), 'morsa'); box(g, .4, .06, .1, '#3a3a40', -.3, .93, .15); tag(cyl(g, .05, .07, .1, '#f0e0a0', -.6, 1.3, .1, '#ffd890'), 'luce'); break;
      case 'cucina': box(g, 1, .85, .6, '#d8d4c8', 0, .43, 0); box(g, .9, .03, .5, '#2a2a2e', 0, .87, 0); cyl(g, .16, .14, .2, '#8a8e96', -.2, .98, 0); tag(cyl(g, .12, .12, .02, '#3080ff', -.2, .885, 0, '#2060ff'), 'fiamma'); tag(cyl(g, .05, .0, .1, '#e8e8e8', -.2, 1.15, 0), 'vapore'); box(g, .25, .08, .25, '#2a2a2e', .25, .92, 0); break;
      case 'focolare': for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; box(g, .25, .2, .2, '#6a6a68', Math.cos(a) * .55, .1, Math.sin(a) * .55, -a); } for (let i = 0; i < 3; i++) { const l = cyl(g, .06, .06, .7, '#5a3a20', 0, .12, 0); l.rotation.z = Math.PI / 2; l.rotation.y = i * 1.05; }
        tag(cyl(g, 0, .3, .7, '#ff8a20', 0, .5, 0, '#ff5a10'), 'fiamma'); tag(cyl(g, 0, .18, .45, '#ffd060', 0, .45, 0, '#ffb030'), 'fiamma2'); cyl(g, .02, .02, 1.3, '#3a3a3a', -.6, .65, 0); cyl(g, .02, .02, 1.3, '#3a3a3a', .6, .65, 0); { const s0 = cyl(g, .02, .02, 1.25, '#3a3a3a', 0, 1.3, 0); s0.rotation.z = Math.PI / 2; } cyl(g, .18, .14, .22, '#2a2a2e', 0, 1.05, 0); break;
      case 'sacchi': for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r % 2); i++) { const s0 = box(g, .6, .25, .4, c, -.6 + i * .62 + (r % 2) * .31, .13 + r * .25, 0); s0.rotation.y = (i - 1) * .05; } break;
      case 'filo': for (const x of [-.9, .9]) box(g, .08, 1.2, .08, '#4a4a4e', x, .6, 0); for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.3, .015, 4, 12), lm(c)); t.position.set(-.6 + i * .6, .7, 0); t.rotation.y = Math.PI / 2; g.add(t); } break;
      case 'barricata': { const a = box(g, S0, .8, .12, c, 0, .6, 0); a.rotation.z = .2; const b2 = box(g, S0, .8, .12, '#5a3a20', 0, .5, .2); b2.rotation.z = -.15; box(g, .6, .7, .5, '#4a4a4a', .5, .35, -.1); break; }
      case 'torretta': { const w = S0 * 2 - .3; for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(g, .16, 3.6, .16, '#5a4028', x * w / 2, 1.8, z * w / 2); box(g, w + .3, .1, w + .3, c, 0, 3, 0); box(g, w + .3, .8, .08, c, 0, 3.45, w / 2 + .1); box(g, w + .3, .8, .08, c, 0, 3.45, -w / 2 - .1); box(g, .08, .8, w + .3, c, w / 2 + .1, 3.45, 0); const rf = box(g, w + .8, .08, w + .8, '#5a5048', 0, 4.4, 0); rf.rotation.x = .1; for (const x of [-.4, .4]) box(g, .06, 1, .06, '#5a4028', x, 3.9, 0); break; }
    }
    // animazioni aggiunte alle postazioni del kit (solo se il modello non ha già la sua parte con quel nome)
    if (!g.getObjectByName('fiamma') && b.anim === 'fuoco' && b.stm) tag(cyl(g, 0, .14, .3, '#ff7a20', 0, .45, .3, '#ff5a10'), 'fiamma');
    if (!g.getObjectByName('ago') && b.anim === 'ago') tag(box(g, .015, .12, .015, '#c8c8d0', .17, .86, 0), 'ago');
    if (!g.getObjectByName('rullo') && b.anim === 'rullo') { const r0 = tag(cyl(g, .08, .08, .62, '#3a3a3a', 0, 1.05, .2), 'rullo'); r0.rotation.z = Math.PI / 2; }
    if (!g.getObjectByName('led') && b.anim === 'radio') { tag(box(g, .04, .04, .02, '#30ff60', -.12, 1.0, .06, 0), 'led'); g.getObjectByName('led').material.emissive = new THREE.Color('#30ff60'); cyl(g, .008, .008, 1.2, '#c8c8d0', .55, 1.4, -.2); }
    if (!g.getObjectByName('brace') && b.anim === 'brace') tag(box(g, .5, .05, .35, '#ff4a10', -.1, .9, 0), 'brace').material.emissive = new THREE.Color('#ff3a00');
    if (b.anim === 'lampadina' && !g.getObjectByName('luce')) tag(cyl(g, .05, .07, .1, '#f0e0a0', .4, 1.5, -.2, '#ffd890'), 'luce');
    if (!g.getObjectByName('luce') && b.anim === 'rossa') tag(cyl(g, .06, .06, .06, '#ff2a2a', 0, 1.9, -.2, '#ff1010'), 'luce');
    if (!g.getObjectByName('segatura') && b.anim === 'segatura') tag(box(g, .3, .02, .2, '#d8b080', .3, .87, .1), 'segatura');
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return typeof Superfici !== 'undefined' ? Superfici.vesti(g) : g;   // [modelli] spigoli, texture, ombra di contatto
  }

  // =====================================================================================================================
  // PIAZZARE, SPOSTARE, TOGLIERE
  // =====================================================================================================================
  // le caselle che occupa (con la rotazione a passi di 90°)
  function footprint(b, x, y, rot) {
    if (!b.fp) return []; const S0 = TS(); let [w, d] = b.fp; const q = ((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4; if (q % 2) [w, d] = [d, w];
    const tx0 = Math.floor(x / S0 - w / 2 + .5), ty0 = Math.floor(y / S0 - d / 2 + .5), out = [];
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
      let solid = b.solid === 'pieno';
      if (b.solid === 'bordo') { const edge = i === 0 || j === 0 || i === w - 1 || j === d - 1; const door = q === 0 ? (j === d - 1 && i === Math.floor(w / 2)) : q === 2 ? (j === 0 && i === Math.floor(w / 2)) : q === 1 ? (i === 0 && j === Math.floor(d / 2)) : (i === w - 1 && j === Math.floor(d / 2)); solid = edge && !door; }
      out.push([tx0 + i, ty0 + j, solid]);
    }
    return out;
  }
  function snap(b, gx, gy, rot) {
    const S0 = TS();
    if (b.fp) { let [w, d] = b.fp; const q = ((Math.round(rot / (Math.PI / 2)) % 4) + 4) % 4; if (q % 2) [w, d] = [d, w]; const cx = (Math.floor(gx / S0 - w / 2 + .5) + w / 2) * S0, cy = (Math.floor(gy / S0 - d / 2 + .5) + d / 2) * S0; return [cx, cy]; }
    if (b.op && b.cat === 'terreno') { const [tx, ty] = tileOf(gx, gy); return [(tx + .5) * S0, (ty + .5) * S0]; }
    return [Math.round(gx * 4) / 4, Math.round(gy * 4) / 4];
  }
  function canPlace(st, b, x, y, rot) {
    const G = Gm(), t = T(), lv = lvOf(st), C = covoAt(st, x, y);
    if (!C) return 'Fuori dal covo: qui non costruisci.';
    if (b.cat === 'terreno') { const [tx, ty] = tileOf(x, y), v = G.tileAt(tx, ty); if (lv) return lv === 'ug' ? 'Sotto terra si usa Sottoterra.' : 'Dentro casa non si disbosca.'; if (b.op === 'disbosca' && v !== t.TREE && v !== t.SHRUB) return 'Niente da tagliare qui.'; if (b.op === 'cava' && v !== t.ROCK && v !== t.CLIFF) return 'Niente roccia qui.'; return ''; }
    if (b.cat === 'sotto') return '';
    if (b.baule && S(st).obj.some(o => o.id === 'baule' && (covoAt(st, o.x, o.y) || {}).id === C.id)) return 'In questo covo il baule c\'è già.';
    if (lv && lv !== 'ug') return b.fp && b.solid ? 'Dentro casa: solo arredi e postazioni.' : '';   // dentro casa si arreda
    const L = lv && typeof Livelli !== 'undefined' ? Livelli.S(st) : null;
    for (const [tx, ty] of footprint(b, x, y, rot).concat(b.fp ? [] : [tileOf(x, y).concat([false])])) {
      const v = G.tileAt(tx, ty);
      if (lv) { if (!L.ug[ty * G.GW + tx]) return 'Qui è terra piena: scava prima.'; continue; }
      if (v === t.WATER || v === t.BLD || v === t.CLIFF || v === t.ROCK || v === t.TREE) return v === t.TREE ? 'C\'è un albero: disbosca prima.' : v === t.ROCK || v === t.CLIFF ? 'C\'è la roccia: cava prima.' : 'Qui non si può.';
      if (b.fp && S(st).obj.some(o => o.tiles && o.tiles.some(q => q[0] === tx && q[1] === ty))) return 'C\'è già qualcosa.';
    }
    return '';
  }
  function place(st, b, x, y, rot, moving) {
    const why = canPlace(st, b, x, y, rot); if (why) return { ok: false, msg: why };
    let paid = moving ? moving.paid : null;
    if (!moving) { const m = missing(st, b); if (m.length) return { ok: false, msg: `Mancano: ${m.join(', ')}.` }; paid = pay(st, b); }
    const G = Gm(), lv = lvOf(st), tiles = [];
    footprint(b, x, y, rot).forEach(([tx, ty, solid]) => { const orig = G.tileAt(tx, ty); if (solid && !lv) { G.setTile(tx, ty, T().BLD); dirty(tx, ty); } tiles.push([tx, ty, solid ? orig : null]); });
    const C = S(st), o = { uid: moving ? moving.uid : 'k' + (C.next++), id: b.id, x, y, rot, lv, tiles, paid, at: st.t };
    C.obj.push(o); U.dirty = true;
    return { ok: true, msg: moving ? `${b.nome}: spostato.` : `${b.nome}: fatto.`, o };
  }
  function lift(st, uid) {   // toglie dal mondo (per spostare o per togliere)
    const C = S(st), i = C.obj.findIndex(o => o.uid === uid); if (i < 0) return null; const o = C.obj[i]; C.obj.splice(i, 1);
    (o.tiles || []).forEach(([tx, ty, orig]) => { if (orig !== null && orig !== undefined) { Gm().setTile(tx, ty, orig); dirty(tx, ty); } });
    U.dirty = true; return o;
  }
  function remove(st, uid) { const o = lift(st, uid); if (!o) return { ok: false, msg: '' }; refund(st, o); return { ok: true, msg: `${BY[o.id].nome}: smontato. Ti torna la roba.` }; }

  // =====================================================================================================================
  // IL BAULE: uno per covo, senza limiti. Nelle basi della Risacca è la loro scorta; a casa e nei covi reclamati è suo.
  // =====================================================================================================================
  function bauleOf(st, C) { if (!C) return null; if (/^b/.test(C.id)) { const b = (st.ris && st.ris.bases || []).find(x => 'b' + x.id === C.id); if (b) return (b.stock = b.stock || {}); } const K = S(st); K.bauli = K.bauli || {}; return (K.bauli[C.id] = K.bauli[C.id] || {}); }
  const bauleHere = st => { const p = st.player; let C = covoAt(st, p.x, p.y); if (!C && p.indoor && st.me && st.me.home && G0().BUILDINGS[p.indoor.b] && G0().BUILDINGS[p.indoor.b].playerHome) C = covi(st).find(c => c.home); return bauleOf(st, C); };
  const G0 = () => Gm();
  const bauli = st => { const K = S(st); return Object.values(K.bauli || {}); };
  function baulePut(st, id, q) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; const bag = O().inv(st), n = Math.min(q || 1, Math.floor(bag[id] || 0)); if (!n) return { ok: false, msg: 'Non ce l\'hai.' }; bag[id] -= n; if (bag[id] <= 0) delete bag[id]; B0[id] = (B0[id] || 0) + n; return { ok: true, msg: `Nel baule: ${O().nm(id)}${n > 1 ? ' ×' + n : ''}.` }; }
  function bauleTake(st, id, q) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; const n = Math.min(q || 1, Math.floor(B0[id] || 0)); if (!n) return { ok: false, msg: 'Nel baule non c\'è.' }; const left = O().givePlayer(st, id, n), got = n - (left || 0); B0[id] -= got; if (B0[id] <= 0) delete B0[id]; return { ok: got > 0, msg: got ? `Prendi ${O().nm(id)}${got > 1 ? ' ×' + got : ''}.${left ? ' Il resto non ti sta addosso.' : ''}` : 'Non ti sta più niente addosso.' }; }
  function bauleAll(st, dir) { const B0 = bauleHere(st); if (!B0) return { ok: false, msg: 'Qui non c\'è un baule.' }; let n = 0;
    if (dir === 'metti') { const bag = O().inv(st); Object.keys(bag).forEach(k => { const c = O().CAT[k]; if (c && c.tool) return; const q = Math.floor(bag[k] || 0); if (q > 0) { baulePut(st, k, q); n += q; } }); return { ok: !!n, msg: n ? `Svuoti la borsa nel baule (${n}). Gli attrezzi restano a te.` : 'Non hai niente da mettere.' }; }
    for (const k of Object.keys(B0)) { const r = bauleTake(st, k, Math.floor(B0[k])); if (r.ok) n++; if (/non ti sta/i.test(r.msg)) return { ok: !!n, msg: 'Non ti sta più niente addosso: il resto rimane nel baule.' }; }
    return { ok: !!n, msg: n ? 'Prendi tutto dal baule.' : 'Il baule è vuoto.' }; }

  // =====================================================================================================================
  // LE POSTAZIONI: per la cucina, i banchi e i letti
  // =====================================================================================================================
  function stationsNear(st, r) {
    const p = st.player, lv = lvOf(st), out = [];
    (st.covo ? st.covo.obj : []).forEach(o => { const b = BY[o.id]; if (!b || !b.st || o.lv !== lv) return; if (Math.hypot(o.x - p.x, o.y - p.y) < (r || 3)) { out.push(b.st); if (b.st2) out.push(b.st2); } });
    return out;
  }
  // il banco delle armi: le modifiche montate
  function playerWeapon(st, k, W) {
    const M = st.covo && st.covo.mods && st.covo.mods[k]; if (!M || !W) return W;
    const out = Object.assign({}, W); Object.keys(M).forEach(id => { const m = (MODS[k] || []).find(x => x[0] === id); if (!m) return; Object.entries(m[2]).forEach(([s, d]) => { out[s] = Math.max(s === 'spread' ? .002 : s === 'rate' ? .06 : 0, (out[s] || 0) + d); }); });
    return out;
  }
  function mod(st, k, id) {
    const m = (MODS[k] || []).find(x => x[0] === id); if (!m) return { ok: false, msg: 'Non si monta.' };
    const C = S(st); C.mods[k] = C.mods[k] || {}; if (C.mods[k][id]) return { ok: false, msg: 'È già montato.' };
    if (!st.player.arms || !st.player.arms[k]) return { ok: false, msg: 'Quell\'arma non ce l\'hai.' };
    const miss = missing(st, { cost: m[3] }); if (miss.length) return { ok: false, msg: `Mancano: ${miss.join(', ')}.` };
    pay(st, { cost: m[3] }); C.mods[k][id] = 1; C.busy.armi = st.clock; return { ok: true, msg: `${m[1]} montato.` };
  }
  const modsView = st => Object.keys(MODS).filter(k => st.player.arms && st.player.arms[k]).map(k => ({ k, nome: (Gm().WEAPONS[k] || {}).name || k, mods: MODS[k].map(([id, nome, eff, cost]) => ({ id, nome, eff, cost, on: !!(st.covo && st.covo.mods[k] && st.covo.mods[k][id]), miss: missing(st, { cost }) })) }));

  // =====================================================================================================================
  // IN SCENA: gli oggetti piazzati, la sagoma, la casella sotto il puntatore
  // =====================================================================================================================
  const U = { on: false, cat: 'strutture', sel: null, rot: 0, moving: null, pick: null, ghost: null, ghostId: null, mark: null, grp: null, scene: null, meshes: {}, dirty: true, gx: 0, gy: 0, ok: '', msg: '', msgT: 0, prevTop: false, stRef: null };
  function sceneSync(st) {
    const r = R(), scene = r && r.__models && r.__models.scene; if (!scene) return;
    if (U.scene !== scene) { U.scene = scene; U.grp = new THREE.Group(); U.grp.name = 'covo'; scene.add(U.grp); U.meshes = {}; }
    if (U.stRef !== st) { Object.values(U.meshes).forEach(m => U.grp.remove(m)); U.meshes = {}; U.stRef = st; U.dirty = true; }
    const lv = lvOf(st), objs = st.covo ? st.covo.obj : [];
    const dlv = typeof Scaricati !== 'undefined' ? Scaricati.ver : 0; if (U.dlv !== dlv) { U.dlv = dlv; U.dirty = true; }   // [modelli] arrivati i modelli scaricati: si rifanno
    if (U.dirty) {
      const want = new Set(objs.map(o => o.uid));
      Object.keys(U.meshes).forEach(k => { if (!want.has(k)) { U.grp.remove(U.meshes[k]); delete U.meshes[k]; } });
      objs.forEach(o => { let m = U.meshes[o.uid]; const b = BY[o.id]; if (!b) return; if (!m || m.userData.kitWait && KIT[b.kit] && KIT[b.kit] !== 'wait' || m.userData.dlv !== dlv) { if (m) U.grp.remove(m); m = model(b); m.userData.dlv = dlv; m.userData.kitWait = !!(b.kit && (!KIT[b.kit] || KIT[b.kit] === 'wait')); m.userData.uid = o.uid; U.grp.add(m); U.meshes[o.uid] = m; } m.position.set(o.x, hAt(st, o.x, o.y, o.lv), o.y); m.rotation.y = -o.rot; m.userData.lv = o.lv; });
      U.dirty = objs.some(o => U.meshes[o.uid] && U.meshes[o.uid].userData.kitWait);
    }
    // solo quello del livello dove sei (sotto terra si vede il bunker, sopra il covo)
    Object.values(U.meshes).forEach(m => { m.visible = (m.userData.lv || null) === lv; });
    animate(st);
  }
  const hAt = (st, x, y, lv) => { if (lv && lv !== 'ug') return window.InterniArte && InterniArte.floorY && InterniArte.floorY() != null ? InterniArte.floorY() : 0; if (lv === 'ug' && typeof Livelli !== 'undefined') { const L = Livelli.S(st); return Livelli.floorAt ? (() => { try { return Livelli.heightOf(st, { lv: { k: 'ug' }, x, y }); } catch (e) { return 0; } })() : 0; } const r = R(); return r && r.groundH ? r.groundH(x, y) : 0; };
  // le animazioni: il fuoco, la radio, il rullo, l'ago… più vive quando la postazione è in uso
  function animate(st) {
    const t = performance.now() / 1000, p = st.player, C = st.covo; if (!C) return;
    C.obj.forEach(o => {
      const m = U.meshes[o.uid]; if (!m || !m.visible) return; const b = BY[o.id], near = Math.hypot(o.x - p.x, o.y - p.y) < 3, busy = near || (C.busy[o.uid] && st.clock - C.busy[o.uid] < 30), k = busy ? 1 : .4;
      m.traverse(x => {
        if (!x.name) return;
        if (/^fiamma/.test(x.name)) { const f = .85 + Math.sin(t * 13 + o.x) * .1 + Math.sin(t * 23) * .06; x.scale.set(f, .8 + Math.sin(t * 9 + o.y) * .25 + k * .1, f); if (x.material.emissive) x.material.emissiveIntensity = .8 + Math.sin(t * 17) * .3; }
        if (x.name === 'luce') x.material.emissiveIntensity = .85 + Math.sin(t * 7 + o.x) * .1 + (Math.random() < .01 ? -.6 : 0);
        if (x.name === 'brace') x.material.emissiveIntensity = .5 + (Math.sin(t * 2.2) + 1) * .4 * k;
        if (x.name === 'led') x.visible = Math.floor(t * (busy ? 6 : 1.5)) % 2 === 0;
        if (x.name === 'rullo') x.rotation.x = t * (busy ? 6 : .4);
        if (x.userData.p0 === undefined) x.userData.p0 = x.position.clone();
        if (x.name === 'ago') x.position.y = x.userData.p0.y + Math.abs(Math.sin(t * (busy ? 18 : 2))) * .05;
        if (x.name === 'morsa') x.position.z = x.userData.p0.z + Math.sin(t * (busy ? 3 : .5)) * .015;
        if (x.name === 'vapore') { x.position.y = x.userData.p0.y + ((t * .5) % 1) * .3 * k; x.material.opacity = .5 * (1 - (t * .5) % 1); x.material.transparent = true; }
        if (x.name === 'schermo' && x.material.emissive) x.material.emissiveIntensity = .7 + Math.sin(t * 30) * .08 + (Math.random() < .02 ? .4 : 0);
        if (x.name === 'ventola') x.rotation.y = t * (busy ? 30 : 12);
        if (x.name === 'telo' || x.name === 'onda') x.rotation.y = Math.sin(t * 2 + o.x) * .25;
        if (x.name === 'anta') x.rotation.y = near ? -1.2 : 0;
        if (x.name === 'coperchio') x.rotation.x += ((near ? -1.1 : 0) - x.rotation.x) * .15;
        if (x.name === 'segatura') x.visible = busy && Math.floor(t * 4) % 2 === 0;
      });
    });
  }
  function ghostSync(st) {
    if (!U.on || !U.grp) { if (U.ghost) { U.grp && U.grp.remove(U.ghost); U.ghost = null; } if (U.mark) { U.grp && U.grp.remove(U.mark); U.mark = null; } return; }
    const pv = PV(), r = R(), m = pv.mouse; const g = r.screenToGround(m.nx, m.ny); if (!g) return;
    const b = U.sel ? BY[U.sel] : null;
    // la casella sotto il puntatore
    if (!U.mark) { U.mark = new THREE.Mesh(new THREE.BoxGeometry(1, .04, 1), new THREE.MeshBasicMaterial({ color: '#b08d57', transparent: true, opacity: .45, depthWrite: false })); U.grp.add(U.mark); }
    if (b && b.cat === 'sotto') { U.mark.visible = false; if (U.ghost) { U.grp.remove(U.ghost); U.ghost = null; } return; }
    const [x, y] = b ? snap(b, g.x, g.y, U.rot) : snap({ cat: 'terreno', op: 1 }, g.x, g.y, 0); U.gx = x; U.gy = y;
    U.ok = b ? canPlace(st, b, x, y, U.rot) : (covoAt(st, x, y) ? '' : 'Fuori dal covo.');
    const S0 = TS(); let fw = 1, fd = 1; if (b && b.fp) { [fw, fd] = b.fp; if (Math.round(U.rot / (Math.PI / 2)) % 2) [fw, fd] = [fd, fw]; }
    U.mark.scale.set(fw * S0 - .1, 1, fd * S0 - .1); U.mark.position.set(x, hAt(st, x, y, lvOf(st)) + .04, y); U.mark.material.color.set(U.ok ? '#c8483a' : '#7ac860'); U.mark.visible = true;
    if (!b || b.cat === 'terreno') { if (U.ghost) { U.grp.remove(U.ghost); U.ghost = null; } return; }
    if (U.ghostId !== b.id || !U.ghost) { if (U.ghost) U.grp.remove(U.ghost); U.ghost = model(b); U.ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .62; o.material.depthWrite = false; o.castShadow = false; } }); U.grp.add(U.ghost); U.ghostId = b.id; }
    U.ghost.position.set(x, hAt(st, x, y, lvOf(st)), y); U.ghost.rotation.y = -U.rot;
    U.ghost.traverse(o => { if (o.isMesh && o.material.emissive) { o.material.emissive.set(U.ok ? '#801010' : '#105010'); o.material.emissiveIntensity = .5; } });
  }

  // =====================================================================================================================
  // LA BARRA DEL CANTIERE
  // =====================================================================================================================
  const CSS = `
#cn { position: absolute; left: 0; right: 0; bottom: 0; z-index: 40; display: none; pointer-events: none; font-family: 'Instrument Sans', system-ui, sans-serif; color: #E9DCBC; }
#cn.on { display: block; }
#cn .cntop { position: absolute; left: 18px; bottom: calc(100% + 10px); pointer-events: auto; padding: 12px 16px; border-radius: 14px; background: rgba(15,27,25,.88); box-shadow: 0 0 0 1px #3A5A50; max-width: 360px; }
#cn .cntop b { display: block; font: 400 28px 'Instrument Serif', Georgia, serif; } #cn .cntop small { display: block; color: rgba(233,220,188,.6); font-size: 12.5px; line-height: 1.5; margin-top: 4px; }
#cn .cnbar { pointer-events: auto; margin: 0 18px 14px; border-radius: 18px; padding: 10px 14px 12px; background: linear-gradient(135deg, rgba(31,58,52,.95), rgba(43,42,58,.95)); box-shadow: 0 0 0 1px #3A5A50, 0 0 0 4px rgba(13,16,21,.75), 0 0 0 5px rgba(176,141,87,.35); }
#cn .cncats { display: flex; gap: 6px; margin-bottom: 8px; align-items: center; }
#cn button.pill { cursor: pointer; border-radius: 14px; padding: 4px 13px; background: none; border: 1px solid rgba(233,220,188,.2); color: rgba(233,220,188,.75); font: 600 12px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .14em; text-transform: uppercase; }
#cn button.pill.on { color: #E9DCBC; box-shadow: 0 0 0 2px #B08D57; border-color: transparent; }
#cn .cncats .x { margin-left: auto; } #cn .cncats .msg { margin-left: 14px; font: italic 15px 'Instrument Serif', Georgia, serif; } #cn .cncats .msg.no { color: #FF5FA2; }
#cn .cncards { display: flex; gap: 8px; overflow-x: auto; padding: 4px 2px 6px; scrollbar-color: #3A5A50 transparent; }
#cn .cnc { flex: 0 0 auto; width: 118px; border-radius: 12px; padding: 6px 6px 8px; cursor: pointer; background: rgba(15,27,25,.75); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); display: grid; justify-items: center; gap: 3px; text-align: center; }
#cn .cnc:hover { box-shadow: inset 0 0 0 1px rgba(233,220,188,.4); } #cn .cnc.on { box-shadow: 0 0 0 2px #B08D57; } #cn .cnc.no { opacity: .5; }
#cn .cnc canvas { width: 72px; height: 72px; } #cn .cnc b { font: 400 16px/1.1 'Instrument Serif', Georgia, serif; } #cn .cnc small { font-size: 10.5px; color: rgba(233,220,188,.6); line-height: 1.3; }
#cn .cnc small.n { color: #FF5FA2; } #cn .cnc small.y { color: #B08D57; }
#cn .cnsel { position: absolute; right: 18px; bottom: calc(100% + 10px); pointer-events: auto; padding: 12px 14px; border-radius: 14px; background: rgba(15,27,25,.9); box-shadow: 0 0 0 1px #3A5A50; display: grid; gap: 8px; min-width: 220px; }
#cn .cnsel b { font: 400 22px 'Instrument Serif', Georgia, serif; } #cn .cnsel .row { display: flex; gap: 6px; }
#cn button.b { cursor: pointer; border-radius: 18px; padding: 6px 14px; color: #E9DCBC; font: 600 12px 'Saira Condensed', sans-serif; letter-spacing: .14em; text-transform: uppercase; border: 1px solid rgba(233,220,188,.25); background: linear-gradient(120deg, #24443c, #2e2c40); }
#cn button.b:hover { border-color: #B08D57; } #cn button.b.bad { color: #FF5FA2; border-color: rgba(255,95,162,.4); }
#cnBtn { position: absolute; right: 14px; bottom: 64px; z-index: 30; pointer-events: auto; cursor: pointer; display: none; border-radius: 16px; padding: 5px 12px; background: rgba(15,27,25,.9); border: 1px solid #3A5A50; color: #E9DCBC; font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .16em; text-transform: uppercase; }
#cnBtn.on { display: block; }
body.cn-on #rs-here, body.cn-on #me-box, body.cn-on #ts-hint { display: none !important; } #cnBtn:hover { border-color: #B08D57; } #cnBtn kbd { color: #B08D57; margin-left: 6px; }
`;
  function mount() {
    if ($('cn')) return true; const app = $('app'); if (!app) return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'cn'; app.appendChild(m);
    const bt = document.createElement('button'); bt.id = 'cnBtn'; bt.innerHTML = 'Cantiere del covo<kbd>Y</kbd>'; app.appendChild(bt); bt.onclick = () => toggle();
    m.addEventListener('click', onClick);
    return true;
  }
  function cardThumb(b) { if (typeof MenuUI === 'undefined' || !MenuUI.thumbFor) return null; return MenuUI.thumbFor('covo:' + b.id, () => b.cat === 'terreno' || b.cat === 'sotto' ? opModel(b) : model(b)); }
  function opModel(b) { const g = new THREE.Group(); const tool = { disbosca: 'ascia', cava: 'piccone', spiana: 'pala', sterra: 'zappa' }[b.op] || 'pala'; box(g, 1.6, .25, 1.6, b.cat === 'sotto' ? '#3a2e24' : { disbosca: '#4a6a3a', cava: '#6a6a68', spiana: '#7a6a4a', sterra: '#6a5038' }[b.op], 0, .12, 0);
    if (b.op === 'disbosca') { cyl(g, .12, .16, .5, '#6a4a2a', -.3, .5, 0); const c0 = cyl(g, 0, .4, .9, '#2e4a2a', .4, .7, .2); c0.rotation.z = 1.3; }
    if (b.op === 'cava') for (let i = 0; i < 4; i++) { const r0 = new THREE.Mesh(new THREE.DodecahedronGeometry(.2), lm('#8a8a88')); r0.position.set(-.4 + i * .3, .35, (i % 2) * .3); g.add(r0); }
    if (b.cat === 'sotto') { box(g, .9, .3, .9, '#1a1410', 0, .14, 0); if (b.op === 'bunker') for (const x of [-.6, .6]) box(g, .1, .9, .1, '#7a5634', x, .45, 0); if (b.op === 'botola' || b.op === 'uscita') box(g, .7, .05, .7, '#6a4a2c', .2, .3, .2).rotation.x = -.8; }
    const tl = typeof Oggetti !== 'undefined' && Oggetti.CAT[tool]; if (tl) { const h = cyl(g, .035, .035, 1, '#8a5a2a', .3, .7, -.3); h.rotation.z = .9; box(g, .3, .08, .1, '#9aa0a8', .7, 1.05, -.3); }
    return g; }
  let lastHtml = '';
  function render(st) {
    if (!mount()) return; const m = $('cn'), bt = $('cnBtn');
    const C0 = covoAt(st, st.player.x, st.player.y); bt.classList.toggle('on', !U.on && !!C0 && !st.player.vehicle && !(PV().ui && (PV().ui.menu || PV().ui.intro)));
    m.classList.toggle('on', U.on); document.body.classList.toggle('cn-on', U.on); if (!U.on) return;
    const items = B.filter(b => b.cat === U.cat);
    const cats = CATS.map(([k, l]) => `<button class="pill ${U.cat === k ? 'on' : ''}" data-a="cat" data-x="${k}">${l}</button>`).join('');
    const showMsg = U.msg && Date.now() - U.msgT < 5000;
    const cards = items.map(b => { const miss = missing(st, b), own = b.item && have(st, b.item) >= 1, toolOk = hasTool(st, b.tool);
      const cost = own ? `<small class="y">ne hai ${have(st, b.item)}: piazzalo</small>` : b.cost ? `<small class="${miss.length ? 'n' : ''}">${Object.entries(b.cost).map(([k, q]) => `${esc(O().nm(k))} ${Math.min(q, totalOf(st, k))}/${q}`).join(' · ')}</small>` : '';
      return `<div class="cnc ${U.sel === b.id ? 'on' : ''} ${miss.length || !toolOk ? 'no' : ''}" data-a="sel" data-x="${b.id}" title="${esc(b.desc || b.nome)}"><canvas data-th="${b.id}" width="96" height="96"></canvas><b>${esc(b.nome)}</b>${cost}${b.tool ? `<small class="${toolOk ? '' : 'n'}">${esc(b.tool.split('|').map(k => O().nm(k)).join(' o '))}</small>` : ''}${b.desc && b.cat === 'sotto' ? `<small>${esc(b.desc)}</small>` : ''}</div>`; }).join('');
    const po = U.pick ? (st.covo.obj.find(o => o.uid === U.pick)) : null;
    const sel = po ? `<div class="cnsel"><b>${esc(BY[po.id].nome)}</b><div class="cnrow"><button class="b" data-a="sposta">Sposta</button><button class="b" data-a="gira">Gira</button><button class="b bad" data-a="togli">Togli</button></div>${BY[po.id].st ? '<small style="color:rgba(233,220,188,.6)">Fuori dal cantiere: cliccala per usarla.</small>' : ''}</div>` : '';
    const C = covoAt(st, st.player.x, st.player.y);
    const top = `<div class="cntop"><b>${esc(C ? C.name : 'Nessun covo qui')}</b><small>${C ? 'Clic: piazza · rotella o R: gira · tasto destro: lascia · clic su una cosa messa: sposta, gira, togli · Y: esci' : 'Qui non hai un covo.'}</small>${!C ? '<div style="margin-top:8px"><button class="b" data-a="reclama">Fanne il tuo covo</button></div>' : ''}${lvOf(st) ? '<small>Sei sotto terra: costruisci nel bunker.</small>' : ''}</div>`;
    const html = `${top}${sel}<div class="cnbar"><div class="cncats">${cats}${showMsg ? `<span class="cnmsg ${U.msgOk ? '' : 'no'}">${esc(U.msg)}</span>` : ''}<button class="pill x" data-a="esci">Esci · Y</button></div><div class="cncards">${cards}</div></div>`;
    if (html !== lastHtml) { const sc = m.querySelector('.cncards') ? m.querySelector('.cncards').scrollLeft : 0; m.innerHTML = html; lastHtml = html; const cc = m.querySelector('.cncards'); if (cc) cc.scrollLeft = sc; }
    m.querySelectorAll('canvas[data-th]').forEach(c => { if (c.dataset.done) return; const b = BY[c.dataset.th], t = cardThumb(b); if (t) { c.getContext('2d').drawImage(t, 0, 0, 128, 128, 0, 0, 96, 96); c.dataset.done = 1; } });
  }
  const totalOf = (st, k) => { const X = EXT(); if (X && X.resTotal && !Oggetti.CAT[k]) return Math.floor(X.resTotal(st, k)); let n = have(st, k); (st.ris && st.ris.bases || []).filter(b => b.alive).forEach(b => { n += Math.floor((b.stock && b.stock[k]) || 0); }); return n; };
  function say(r) { if (!r) return; U.msg = r.msg || ''; U.msgOk = r.ok !== false; U.msgT = Date.now(); const st = ST(); if (st && r.msg) Gm().feed(st, r.msg, r.ok ? 'good' : 'bad'); lastHtml = ''; }
  function onClick(e) {
    const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a, x = t.dataset.x, st = ST();
    if (a === 'cat') { U.cat = x; U.sel = null; }
    if (a === 'sel') { const b = BY[x]; if (b.cat === 'sotto') { say(under(st, b)); } else { U.sel = U.sel === x ? null : x; U.pick = null; U.moving = null; } }
    if (a === 'esci') toggle(false);
    if (a === 'reclama') say({ ok: true, msg: claim(st) });
    if (a === 'togli' && U.pick) { say(remove(st, U.pick)); U.pick = null; }
    if (a === 'gira' && U.pick) { const o = lift(st, U.pick); if (o) { const r = place(st, BY[o.id], o.x, o.y, o.rot + Math.PI / 2, o); if (!r.ok) { place(st, BY[o.id], o.x, o.y, o.rot, o); say(r); } } }
    if (a === 'sposta' && U.pick) { const o = lift(st, U.pick); if (o) { U.moving = o; U.sel = o.id; U.rot = o.rot; U.pick = null; say({ ok: true, msg: 'Scegli dove metterlo.' }); } }
    lastHtml = ''; render(st);
  }

  // =====================================================================================================================
  // ENTRARE, USCIRE, MOUSE
  // =====================================================================================================================
  function toggle(on) {
    const st = ST(), ui = PV() && PV().ui; if (!st || !ui) return;
    U.on = on === undefined ? !U.on : on;
    if (U.on) { preload(); U.prevTop = !!ui.top; ui.top = true; U.cat = covoAt(st, st.player.x, st.player.y) ? (lvOf(st) ? 'arredi' : 'strutture') : 'terreno'; if (typeof MenuUI !== 'undefined' && MenuUI.state.open) MenuUI.close(); }
    else { ui.top = U.prevTop; if (U.moving) { const o = U.moving; U.moving = null; S(st).obj.push(o); (o.tiles || []).forEach(([tx, ty, orig]) => { if (orig !== null && orig !== undefined && !o.lv) { Gm().setTile(tx, ty, T().BLD); dirty(tx, ty); } }); U.dirty = true; } U.sel = null; U.pick = null; }
    lastHtml = ''; render(st);
  }
  function down(btn, nx, ny) {
    const st = ST(); if (!st) return;
    if (btn === 2) { if (U.moving) { place(st, BY[U.moving.id], U.moving.x, U.moving.y, U.moving.rot, U.moving); U.moving = null; } U.sel = null; U.pick = null; lastHtml = ''; return; }
    const b = U.sel ? BY[U.sel] : null, g = R().screenToGround(nx, ny); if (!g) return;
    if (b) {
      const [x, y] = snap(b, g.x, g.y, U.rot);
      if (b.cat === 'terreno') { const why = canPlace(st, b, x, y, 0); if (why) return say({ ok: false, msg: why }); const [tx, ty] = tileOf(x, y); return say(terrain(st, b, tx, ty)); }
      const r = place(st, b, x, y, U.rot, U.moving); say(r); if (r.ok && U.moving) { U.moving = null; U.sel = null; }
      return;
    }
    // niente in mano: si sceglie una cosa già messa
    const lv = lvOf(st); let best = null, bd = 1.4; (st.covo ? st.covo.obj : []).forEach(o => { if (o.lv !== lv) return; const d = Math.hypot(o.x - g.x, o.y - g.y) - (BY[o.id].fp ? Math.max(...BY[o.id].fp) * .6 : 0); if (d < bd) { bd = d; best = o; } });
    U.pick = best ? best.uid : null; lastHtml = '';
  }
  function wheel(dy) { if (!U.on || !U.sel) return false; const b = BY[U.sel]; U.rot += (dy > 0 ? 1 : -1) * (b.fp ? Math.PI / 2 : Math.PI / 4); return true; }
  addEventListener('keydown', e => {
    const pv = PV(); if (!pv || !pv.st || !pv.ui || pv.ui.intro || pv.ui.over || pv.ui.dialog || pv.ui.book || pv.ui.menu) return;
    const ae = document.activeElement; if (ae && /INPUT|TEXTAREA/.test(ae.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 'y' && !e.repeat) { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (!U.on) return;
    if (k === 'r') { e.preventDefault(); e.stopImmediatePropagation(); if (U.sel) wheel(1); return; }
    if (k === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); if (U.sel || U.pick) { U.sel = null; U.pick = null; if (U.moving) { place(pv.st, BY[U.moving.id], U.moving.x, U.moving.y, U.moving.rot, U.moving); U.moving = null; } lastHtml = ''; } else toggle(false); }
  }, true);

  // fuori dal cantiere: le postazioni si cliccano, ci vai, e si apre il loro banco
  function pick(st, nx, ny, o) {
    if (U.on || st.player.vehicle || !st.covo || !st.covo.obj.length) return null; const r = R(), lv = lvOf(st); let best = null, bd = Math.max(26, o.h * .045);
    st.covo.obj.forEach(c => { const b = BY[c.id]; if (!b || !(b.st || b.sleep || b.menu || b.baule) || c.lv !== lv) return; const pr = r.project(c.x, .9, c.y); if (pr.behind) return; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = c; } });
    return best ? { kind: 'loot', via: 'covo', ref: best.uid, x: best.x, y: best.y, label: BY[best.id].baule ? 'Apri il baule' : `Usa: ${BY[best.id].nome}` } : null;
  }
  const find = (st, ref) => { const o = st.covo && st.covo.obj.find(c => c.uid === ref); return o ? { x: o.x, y: o.y } : null; };
  const goal = (st, ref) => { const o = st.covo && st.covo.obj.find(c => c.uid === ref); if (!o) return null; const G = Gm(); for (let r = 1.2; r < 3; r += .4) for (let a = 0; a < 8; a++) { const x = o.x + Math.cos(a * Math.PI / 4 + Math.PI / 2 - o.rot) * r, y = o.y + Math.sin(a * Math.PI / 4 + Math.PI / 2 - o.rot) * r; if (G.walkM(x, y)) return { x, y }; } return { x: o.x, y: o.y }; };
  const reach = () => 1.9;
  function arrive(st, ref) {
    const o = st.covo.obj.find(c => c.uid === ref); if (!o) return; const b = BY[o.id]; st.covo.busy[o.uid] = st.clock;
    if (b.baule) { if (typeof MenuUI !== 'undefined') MenuUI.open('baule'); return; }
    if (b.sleep) { const a = (typeof Azioni !== 'undefined' ? Azioni.playerActions(st) : []).find(x => /dorm|pisolino|riposa/i.test(x.label) && x.run); if (a) Gm().feed(st, a.run() || 'Ti sdrai.', 'info'); else Gm().feed(st, 'Ti sdrai un momento sulla branda. Non hai sonno.', 'info'); return; }
    if (typeof MenuUI !== 'undefined') MenuUI.open('lavora', { st: b.st, st2: b.st2, titolo: b.nome, armi: b.menu === 'armi', uid: o.uid });
  }

  function loop() {
    try { const st = ST(); if (st) { if (st.covo || U.on) sceneSync(st); ghostSync(st); const t = performance.now(); if (t - (U.rt || 0) > (U.on ? 150 : 500)) { U.rt = t; render(st); } } } catch (e) { if (!U.err) { U.err = 1; console.error('[Cantiere]', e); } }
    requestAnimationFrame(loop);
  }
  function init() { if (!window.__pv || !window.THREE) { setTimeout(init, 200); return; } const G = Gm(); if (G.HOOKS) { const p0 = G.HOOKS.playerWeapon; G.HOOKS.playerWeapon = (st, k, W) => playerWeapon(st, k, p0 ? p0(st, k, W) : W); } preload(); requestAnimationFrame(loop); }
  if (typeof window !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0); }
  return { bauleHere, bauli, baulePut, bauleTake, bauleAll, active: () => U.on, toggle, down, wheel, pick, find, goal, reach, arrive, stationsNear, mod, modsView, MODS, B, BY, covi, covoAt, claim, place, remove, terrain, under, state: U, model };
})();
