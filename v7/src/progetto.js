/* Porto Vecchio — LA VISTA PROGETTUALE (?progetto). Il cantiere del covo pensato come un tavolo da disegno sopra la mappa vera.
   [cantiere2] SEMPLICE: due strati (Sopra / Sotto, un interruttore), uno strumento alla volta, in basso cinque bottoni grandi:
   COSTRUISCI (i pezzi del cantiere), SCAVA (le caselle da scavare, come Minecraft), TERRENO (alza, abbassa, spiana, un cursore),
   TOGLI (quello che tocchi esce dal progetto), FATTO (si avviano i lavori e si esce). Le opzioni compaiono solo con lo strumento
   che le usa; la distinta è un bottoncino in alto a destra che si apre. Niente scritte sopra la mappa.
   - L'OLOGRAMMA: un colore solo (cielo) col contorno netto. Il contorno dice lo stato: cielo = in progetto, ocra = manca qualcosa
     (la roba, un collegamento; la distinta dice cosa), bianco = in corso (la parte fatta è solida, la riga sale), fatto = la cosa vera.
     Le piante da togliere hanno un'icona piccola (non si ricolorano). Il terreno che cambia è un contorno di un colore solo:
     pieno dove si riporta, a puntini dove si scava, le curve ogni mezzo metro di differenza.
   - SCAVARE COME MINECRAFT: si dipingono le caselle da scavare al livello scelto (−1, −2, …: 1,6 m l'uno), di qualunque forma e
     grandezza; ▲▼ cambiano livello. Le caselle vicine a livelli diversi si raccordano da sole (una rampa). Un'ENTRATA (la botola con la
     scala) o una galleria già scavata collegano lo scavo alla superficie. Il progetto diventa lavori, una stanza alla volta (le caselle
     collegate allo stesso livello): la banda scava casella per casella (terra viva, pareti storte), ogni 3 caselle mette i puntelli
     di legno (i telai), poi — se l'hai scelto per quella stanza — tira su i muri o getta il cemento. L'ologramma si svuota e si riempie
     mentre lavorano. Le stanze fisse (cantina, stanza, sala, bunker) non ci sono più nel progetto: i progetti vecchi si convertono.
   - LA DISTINTA: tutta la roba che serve, quanta ne hai (tasche, bauli, basi), cosa manca; gli attrezzi; il tempo con la banda.
   - I LAVORI: coda ordinata (terreno, scavi, pezzi); la banda libera ci va a turni, tu puoi dare una mano (clic sull'ologramma in
     corso, fuori dalla vista). La roba si paga quando il lavoro comincia; se manca, aspetta (ocra) e la coda passa al prossimo.
   Stato: st.covo.plan (si salva con la partita). La logica gira anche in Node (test_progetto.js). Senza ?progetto il file non fa niente. */
var Progetto = (function () {
  'use strict';
  const NODE = typeof window === 'undefined' || !window.document || !window.document.createElement;
  const ON = (typeof location !== 'undefined' && /[?&]progetto\b/.test(location.search)) || (typeof process !== 'undefined' && process.env && process.env.PROGETTO === '1');
  const PV = () => (typeof window !== 'undefined' && window.__pv) || null;
  const Gm = () => (PV() && PV().G) || Game, CN = () => Cantiere, TS = () => Gm().TS, T = () => Gm().T;
  const LVM = () => (typeof Livelli !== 'undefined' ? Livelli : null);
  const O = () => Oggetti;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tileOf = (x, y) => [Math.floor(x / TS()), Math.floor(y / TS())];
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // =====================================================================================================================
  // IL CATALOGO DEL PROGETTO: i pezzi del cantiere (non le azioni sul posto)
  // =====================================================================================================================
  const PCATS = [['baracche', 'Baracche'], ['strutture', 'Pezzi'], ['arredi', 'Arredi'], ['postazioni', 'Postazioni'], ['difese', 'Difese'], ['energia', 'Corrente']];
  // [cantiere2] gli scavi di prima (solo per convertire i progetti salvati): galleria, pozzo e le stanze fisse del cantiere
  const DIGS = [{ id: 'galleria', nome: 'Galleria' }, { id: 'pozzo', nome: 'Pozzo con la scala', pozzo: 1 }, { id: 'scavo_cantina', ref: 1 }, { id: 'scavo_stanza', ref: 1 }, { id: 'scavo_sala', ref: 1 }, { id: 'scavo_bunker', ref: 1 }];
  const DIG = id => { const d = DIGS.find(q => q.id === id); if (!d) return null; if (d.ref && !d._b) { const b = CN().BY[id]; if (b) Object.assign(d, { nome: b.nome, fp: b.fp, kind: b.dig, cost: b.cost }); d._b = 1; } return d; };
  const TERRA = [['alza', 'Alza', 'Porta su la terra.'], ['abbassa', 'Abbassa', 'Toglie la terra.'], ['spiana', 'Spiana', 'Porta tutto alla quota da dove parti.']];
  const pieceB = id => CN().BY[id] || null;
  const inPlan = b => b && !b.op && !b.dig && PCATS.some(c => c[0] === b.cat);

  // =====================================================================================================================
  // LO STATO
  // =====================================================================================================================
  function plan(st) {
    const C = CN().S(st); if (!C.plan) C.plan = { v: 2, items: [], seq: 1, vt: {}, clr: {}, cells: {}, go: false, rev: 1, fatti: 0 };
    const P = C.plan; if (!P.cells) P.cells = {}; if ((P.v || 1) < 2) migrate(st, P); return P;
  }
  const items = st => plan(st).items;
  const byPid = (st, pid) => items(st).find(i => i.pid === pid) || null;
  const touch = st => { plan(st).rev++; };
  // i minuti-uomo di ogni lavoro
  function needOf(st, it) {
    if (it.k === 'pezzo') { const b = pieceB(it.id); if (!b) return 10; if (b.big) return b.big; const q = Object.values(b.cost || {}).reduce((s, v) => s + v, 0); return clamp(Math.round(6 + q * 1.5), 6, 40); }
    if (it.k === 'scavo') { const S = it.steps || digSteps(st, it); return Math.max(4, S.reduce((s, q) => s + q.m, 0)); }
    if (it.k === 'terra') { const V = volOf(st, it.verts); return Math.max(6, Math.round(V.cut * 4 + V.fill * 3 + (it.clr || []).length * 20)); }
    return 10;
  }

  // =====================================================================================================================
  // I PEZZI: dove stanno, se ci stanno
  // =====================================================================================================================
  function fpOf(it) { const b = pieceB(it.id); if (!b) return []; if (b.fp) return CN().footprint(b, it.x, it.y, it.rot); const [tx, ty] = tileOf(it.x, it.y); return [[tx, ty, false]]; }
  const layerOf = it => { const b = pieceB(it.id); return (b && b.layer) || ''; };
  const overlap = (A, B) => A.some(a => B.some(b => a[0] === b[0] && a[1] === b[1]));
  // perché no: { why, soft } (soft: si potrà, quando…; why vuoto: va bene)
  function checkPiece(st, it, skipPid) {
    const b = pieceB(it.id); if (!b) return { why: 'Pezzo sconosciuto.' };
    const lv = it.lv || null, C = CN().covoOf(st, it.x, it.y, lv);
    if (!C) return { why: 'Fuori dal campo: pianta il campo, o costruisci dentro i picchetti.' };
    if (!lv && CN().inCity(it.x, it.y)) return { why: 'In città, all\'aperto, non si costruisce.' };
    if (lv && b.out) return { why: 'Si monta solo all\'aperto.' };
    const fp = fpOf(it), L = lv === 'ug' && LVM() ? LVM().S(st) : null, G = Gm();
    if (lv === 'ug') { for (const [tx, ty] of fp) if (!L.ug[ty * G.GW + tx] && !digPlanned(st, tx, ty)) return { why: 'Sotto terra è terra piena: prima segna lo scavo.' }; }
    for (const o of items(st)) { if (o.pid === skipPid || o.k !== 'pezzo' || (o.lv || null) !== lv || o.st === 'fatto') continue; const bo = pieceB(o.id); if (!bo || !(b.fp || bo.fp)) { if (!b.fp && !bo.fp && Math.hypot(o.x - it.x, o.y - it.y) < .5) return { why: `Sopra ${bo ? bo.nome.toLowerCase() : 'un altro pezzo'} del progetto.` }; continue; } if (layerOf(o) !== layerOf(it)) continue; if (overlap(fp, fpOf(o))) return { why: `Si sovrappone a ${bo.nome.toLowerCase()} del progetto.` }; }
    let why = '';
    try { why = CN().canPlace(st, b, it.x, it.y, it.rot, lv) || ''; } catch (e) { why = ''; }
    if (/scava prima|terra piena/i.test(why) && lv === 'ug') why = '';
    if (/Ti serve|Prima va sgombrato/i.test(why)) return { why: '', soft: why };
    if (/disbosca prima|cava prima/i.test(why)) return { why: '', soft: 'Prima si sgombra (alberi o roccia): lo fanno i lavori.' };
    return { why };
  }

  // =====================================================================================================================
  // [cantiere2] GLI SCAVI, COME MINECRAFT: caselle dipinte a un livello (plan.cells: «tx,ty» → { lv, f, rf, e, j, s })
  //   lv: il livello (1 = −1); f: la quota del pavimento; rf: il rinforzo della stanza (legno, muri, cemento); e: l'entrata (botola)
  //   j: il lavoro che la sta scavando; s: 1 scavata (terra viva), 2 puntellata, 3 rinforzata.
  // Le STANZE (i lavori) sono le caselle collegate allo stesso livello; si rifanno da sole quando il progetto cambia (syncScavi).
  // =====================================================================================================================
  const STEP = 1.6, F1 = 3.2, PROPN = 3, RAW = 18, MAXLV = 12;
  // il rinforzo: kind delle caselle in livelli.js / render.js (2 terra armata coi telai, 10 mattoni a volta, 6 cemento); RAW = terra viva
  const RF = { legno: { nome: 'Legno', kind: 2, cost: {}, mins: 0 }, muri: { nome: 'Muri', kind: 10, cost: { mattoni: 4, malta: 1 }, mins: 8 }, cemento: { nome: 'Cemento', kind: 6, cost: { cemento: 2 }, mins: 10 } };
  const ck = (tx, ty) => tx + ',' + ty, kc = k => k.split(',').map(Number);
  const cellsOf = st => plan(st).cells;
  function digPlanned(st, tx, ty) { const c = cellsOf(st)[ck(tx, ty)]; return !!c && !(c.s > 0); }
  // la quota di riferimento dei livelli: il suolo al centro del campo (così i livelli sono piani), se no il primo punto scavato
  function baseH(st, tx, ty) {
    const G = Gm(), E = G.MAP.elev, P = plan(st), C = CN().covoAt(st, (tx + .5) * TS(), (ty + .5) * TS());
    if (C && !C.ug) { const [cx, cy] = tileOf(C.x, C.y); return E ? E[cy * G.GW + cx] : 0; }
    if (P.ref === undefined || P.ref === null) P.ref = E ? E[ty * G.GW + tx] : 0; return P.ref;
  }
  const levelF = (st, lv, tx, ty) => Math.round((baseH(st, tx, ty) - F1 - (lv - 1) * STEP) * 100) / 100;
  // perché questa casella non si scava ('' = si può)
  function cellWhy(st, tx, ty, f, e) {
    const L = LVM() && LVM().S(st), G = Gm(); if (!L) return 'Qui sotto non si scava.';
    if (tx < 1 || ty < 1 || tx >= G.GW - 1 || ty >= G.GH - 1) return 'Oltre non si va.';
    const i = ty * G.GW + tx; if (G.tileAt(tx, ty) === T().WATER) return 'Lì sopra c\'è l\'acqua: si allaga.';
    if (L.ug[i]) return 'Qui è già scavato.';
    if (G.MAP.zone && G.MAP.zone[i] === G.MAP.Z.CITTA && G.tileAt(tx, ty) === T().BLD) return 'Sotto le case della città non si scava (le fondamenta).';
    const E = G.MAP.elev ? G.MAP.elev[i] : 0; if (E - f < 2.6) return 'Troppo vicino al suolo: scendi di un livello.'; if (E - f > 30) return 'Più giù c\'è l\'acqua di falda.';
    if (e) { const v = G.tileAt(tx, ty); if ([T().VIA, T().COB, T().WALK, T().PIAZZA, T().QUAY, T().BLD, T().WATER].includes(v)) return 'Sul selciato, sull\'asfalto e nelle case l\'entrata non si apre a mano.'; if (!CN().covoOf(st, (tx + .5) * TS(), (ty + .5) * TS(), null)) return 'L\'entrata si apre dentro il campo.'; }
    return '';
  }
  // dipingere: le caselle al livello lv (o alla quota o.f), col rinforzo o.rf; o.e: l'entrata
  function paintCells(st, tiles, lv, o) {
    o = o || {}; const C = cellsOf(st); let n = 0, why = '';
    for (const [tx, ty] of tiles) {
      const k = ck(tx, ty), old = C[k]; if (old && old.j) continue;
      const f = o.f !== undefined ? o.f : levelF(st, lv, tx, ty), w = cellWhy(st, tx, ty, f, o.e); if (w) { why = why || w; continue; }
      if (old && old.lv === lv && Math.abs(old.f - f) < .01 && (!o.e || old.e)) continue;
      C[k] = { lv, f, rf: (old && !o.rf) ? old.rf : (o.rf || 'legno'), e: o.e ? 1 : (old && old.lv === lv ? old.e || 0 : 0) }; n++;
    }
    if (n) touch(st); return { ok: n > 0, n, msg: n ? `${n} ${n === 1 ? 'casella' : 'caselle'} da scavare.` : why };
  }
  function eraseCells(st, tiles) { const C = cellsOf(st); let n = 0; tiles.forEach(([tx, ty]) => { const k = ck(tx, ty); if (C[k] && !C[k].j) { delete C[k]; n++; } }); if (n) touch(st); return n; }
  // la stanza di una casella: le caselle collegate allo stesso livello, non ancora in lavorazione
  function roomKeys(st, k0) { const C = cellsOf(st), c0 = C[k0]; if (!c0) return []; const seen = new Set([k0]), Q = [k0]; while (Q.length) { const k = Q.pop(), [tx, ty] = kc(k); N4.forEach(([dx, dy]) => { const k2 = ck(tx + dx, ty + dy), c = C[k2]; if (c && !seen.has(k2) && c.lv === c0.lv && !!c.j === !!c0.j && (c.j || '') === (c0.j || '')) { seen.add(k2); Q.push(k2); } }); } return [...seen]; }
  function setRoomRf(st, k0, rf) { if (!RF[rf]) return { ok: false, msg: '' }; const C = cellsOf(st), c0 = C[k0]; if (!c0) return { ok: false, msg: '' }; if (c0.j) return { ok: false, msg: 'Questa stanza è già in lavorazione.' }; remember(st); roomKeys(st, k0).forEach(k => { C[k].rf = rf; }); touch(st); return { ok: true, msg: `Rinforzo: ${RF[rf].nome.toLowerCase()}.` }; }
  // le stanze → i lavori 'scavo' (si rifanno quando cambia il progetto; quelle in corso restano come sono)
  function syncScavi(st) {
    const P = plan(st), C = P.cells, L = LVM() && LVM().S(st), G = Gm();
    Object.keys(C).forEach(k => { if (C[k].j) return; const [tx, ty] = kc(k); if (L && L.ug[ty * G.GW + tx]) delete C[k]; });   // scavate da altri: fuori dal progetto
    const seen = new Set(), rooms = [];
    Object.keys(C).sort().forEach(k0 => { if (C[k0].j || seen.has(k0)) return; const R = roomKeys(st, k0); R.forEach(k => seen.add(k)); rooms.push(R.sort()); });
    const old = P.items.filter(i => i.k === 'scavo' && i.st !== 'corso' && i.st !== 'fatto'), used = new Set();
    rooms.forEach(R => {
      const set = new Set(R); let it = old.find(o => !used.has(o) && (o.tiles || []).some(q => set.has(ck(q[0], q[1]))));
      if (!it) { it = { pid: 'p' + (P.seq++), k: 'scavo', id: 'scavo', st: 'progetto', prog: 0, done: 0, ord: -50000 + P.seq }; P.items.push(it); }
      used.add(it); const c0 = C[R[0]]; it.tiles = R.map(kc); it.lv = c0.lv; it.f = c0.f; it.rf = c0.rf || 'legno'; it.e = R.some(k => C[k].e) ? 1 : 0;
      it.x = (it.tiles.reduce((s, q) => s + q[0], 0) / it.tiles.length + .5) * TS(); it.y = (it.tiles.reduce((s, q) => s + q[1], 0) / it.tiles.length + .5) * TS(); delete it.need;
    });
    old.forEach(o => { if (!used.has(o)) P.items.splice(P.items.indexOf(o), 1); });
  }
  const touchesDug = (st, it) => { const L = LVM().S(st), G = Gm(); return it.tiles.some(([tx, ty]) => L.ug[ty * G.GW + tx] || N4.some(([dx, dy]) => L.ug[(ty + dy) * G.GW + tx + dx])); };
  // collegati: dalle entrate, dalle gallerie vere e dagli scavi in corso, attraverso le altre stanze del progetto (anche a livelli diversi)
  function digLinks(st) {
    const dig = items(st).filter(i => i.k === 'scavo' && i.st !== 'fatto'), own = new Map(), ok = new Set(), Q = [];
    dig.forEach(d => d.tiles.forEach(([tx, ty]) => own.set(ck(tx, ty), d)));
    dig.forEach(d => { if (d.e || d.st === 'corso' || touchesDug(st, d)) { ok.add(d.pid); Q.push(d); } });
    while (Q.length) { const d = Q.shift(); d.tiles.forEach(([tx, ty]) => N4.forEach(([dx, dy]) => { const e = own.get(ck(tx + dx, ty + dy)); if (e && !ok.has(e.pid)) { ok.add(e.pid); Q.push(e); } })); }
    return ok;
  }
  function checkDig(st, it, links) {
    if (it.st === 'corso') return { why: '' }; const C = cellsOf(st);
    for (const [tx, ty] of it.tiles) { const c = C[ck(tx, ty)]; const w = cellWhy(st, tx, ty, c ? c.f : it.f, c && c.e); if (w) return { why: w }; }
    if (!(links || digLinks(st)).has(it.pid)) return { why: '', soft: 'Non tocca niente di scavato: metti un\'entrata o collegalo a una galleria.', wait: 1, iso: 1 };
    if (!it.e && !touchesDug(st, it)) return { why: '', soft: 'Aspetta lo scavo accanto.', wait: 1 };
    return { why: '' };
  }
  // i passi del lavoro di una stanza: scava una casella (terra viva), ogni PROPN caselle i puntelli, alla fine il rinforzo casella per casella
  function digSteps(st, it) {
    const G = Gm(), t = T(), ord = digOrder(st, it), S = []; let grp = [];
    ord.forEach(([tx, ty], n) => { const hard = [t.ROCK, t.CLIFF].includes(G.tileAt(tx, ty)); S.push({ t: 'dig', q: [tx, ty], m: (hard ? 12 : 6) + Math.max(0, (it.lv || 1) - 2) }); grp.push([tx, ty]); if (grp.length === PROPN || n === ord.length - 1) { S.push({ t: 'prop', qs: grp, m: 4 }); grp = []; } });
    const R = RF[it.rf || 'legno']; if (R && R.mins) ord.forEach(q => S.push({ t: 'rf', q, m: R.mins }));
    return S;
  }
  // l'ordine: dal lato che tocca lo scavato (o dall'entrata) verso il fondo
  function digOrder(st, it) {
    const L = LVM().S(st), G = Gm(), C = cellsOf(st), own = new Set(it.tiles.map(q => ck(q[0], q[1]))), dist = new Map(), Q = [];
    it.tiles.forEach(([tx, ty]) => { const c = C[ck(tx, ty)]; if ((c && c.e) || N4.some(([dx, dy]) => L.ug[(ty + dy) * G.GW + tx + dx])) { dist.set(ck(tx, ty), 0); Q.push([tx, ty]); } });
    if (!Q.length) { dist.set(ck(...it.tiles[0]), 0); Q.push(it.tiles[0]); }
    while (Q.length) { const [tx, ty] = Q.shift(), d = dist.get(ck(tx, ty)); N4.forEach(([dx, dy]) => { const k = ck(tx + dx, ty + dy); if (own.has(k) && !dist.has(k)) { dist.set(k, d + 1); Q.push([tx + dx, ty + dy]); } }); }
    return it.tiles.slice().sort((a, b) => (dist.get(ck(...a)) ?? 99) - (dist.get(ck(...b)) ?? 99) || a[1] - b[1] || a[0] - b[0]);
  }
  // [cantiere2] i progetti salvati prima: gli scavi a pezzi (galleria, pozzo, cantina, stanza, sala, bunker) diventano caselle
  function migrate(st, P) {
    P.v = 2; const C = P.cells;
    P.items.filter(i => i.k === 'scavo' && !i.lv && i.id !== 'scavo').forEach(it => {
      const done = new Set((it.order || []).slice(0, it.dug || 0).map(q => ck(q[0], q[1]))), f = it.f || 0;
      (it.tiles || []).forEach(([tx, ty], n) => { const k = ck(tx, ty); if (done.has(k)) return; const lv = clamp(Math.round((baseH(st, tx, ty) - F1 - f) / STEP) + 1, 1, MAXLV); C[k] = { lv, f, rf: it.kind === 6 ? 'cemento' : 'legno', e: it.pozzo && n === 0 ? 1 : 0 }; });
      if (it.paid && it.paid.cost) refundTo(st, it, it.paid.cost);
      workingOn(st, it).forEach(n => { n.ris.task = null; n.path = []; });
      P.items.splice(P.items.indexOf(it), 1);
    });
  }

  // =====================================================================================================================
  // IL TERRENO: la quota che verrà, vertice per vertice (plan.vt), e le caselle da sgombrare (plan.clr, più quelle che il terreno tocca)
  // =====================================================================================================================
  const VW = () => Gm().MAP.VW, VHa = () => Gm().MAP.vh;
  const vNow = k => { const vh = VHa(); return vh ? vh[k] : 0; };
  function vertOk(st, i, j) {   // un vertice si tocca se tutte le caselle attorno sono del campo, fuori città, e non sono case, acqua, strade
    const G = Gm(), t = T(); for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b < 0 || a >= G.GW || b >= G.GH) return false; const v = G.tileAt(a, b); if ([t.WATER, t.BLD, t.VIA, t.COB, t.WALK, t.PIAZZA, t.QUAY, t.PIER, t.STAIRS].includes(v)) return false; const x = (a + .5) * TS(), y = (b + .5) * TS(); if (!CN().covoAt(st, x, y) || CN().inCity(x, y)) return false; if (CN().S(st).obj.some(o => !o.lv && o.tiles && o.tiles.some(q => q[0] === a && q[1] === b))) return false; } return true;
  }
  // un colpo di pennello: x, y nel mondo, r in metri, s la forza (m per colpo), h0 la quota di partenza (spiana)
  function sculpt(st, op, x, y, r, s, h0) {
    const P = plan(st), G = Gm(), S0 = TS(), W0 = VW(), ci = x / S0, cj = y / S0, R = r / S0; let n = 0;
    if (op === 'sgombra') { const t = T(); for (let j = Math.floor(cj - R); j <= Math.ceil(cj + R); j++) for (let i = Math.floor(ci - R); i <= Math.ceil(ci + R); i++) { if (Math.hypot(i + .5 - ci, j + .5 - cj) > R + .3) continue; const v = G.tileAt(i, j), cx = (i + .5) * S0, cy = (j + .5) * S0; if (![t.TREE, t.SHRUB, t.ROCK].includes(v) || !CN().covoAt(st, cx, cy) || CN().inCity(cx, cy)) continue; if (!P.clr[i + ',' + j]) { P.clr[i + ',' + j] = 1; n++; } } if (n) touch(st); return n; }
    for (let j = Math.floor(cj - R); j <= Math.ceil(cj + R); j++) for (let i = Math.floor(ci - R); i <= Math.ceil(ci + R); i++) {
      const d = Math.hypot(i - ci, j - cj) / Math.max(.5, R); if (d > 1) continue; const k = j * W0 + i;
      if (op === 'ripristina') { if (P.vt[k] !== undefined) { delete P.vt[k]; n++; } continue; }
      if (!vertOk(st, i, j)) continue;
      const w = Math.cos(d * Math.PI / 2) ** 2, cur = P.vt[k] !== undefined ? P.vt[k] : vNow(k); let t2 = cur;
      if (op === 'alza') t2 = cur + s * w; else if (op === 'abbassa') t2 = cur - s * w;
      else if (op === 'spiana') t2 = cur + (h0 - cur) * Math.min(1, w * 1.6);
      else if (op === 'liscia') { let a = 0, c = 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const q = (j + dj) * W0 + i + di; a += P.vt[q] !== undefined ? P.vt[q] : vNow(q); c++; } t2 = cur + (a / c - cur) * .5 * w; }
      t2 = clamp(t2, vNow(k) - 6, vNow(k) + 6);
      if (Math.abs(t2 - vNow(k)) < .02) { if (P.vt[k] !== undefined) { delete P.vt[k]; n++; } continue; }
      if (P.vt[k] !== t2) { P.vt[k] = Math.round(t2 * 100) / 100; n++; }
    }
    if (op === 'ripristina') { for (let j = Math.floor(cj - R); j <= Math.ceil(cj + R); j++) for (let i = Math.floor(ci - R); i <= Math.ceil(ci + R); i++) if (P.clr[i + ',' + j] && Math.hypot(i + .5 - ci, j + .5 - cj) <= R + .3) { delete P.clr[i + ',' + j]; n++; } }
    if (n) touch(st); return n;
  }
  function volOf(st, keys) { const P = plan(st), A = TS() * TS(); let cut = 0, fill = 0; (keys || Object.keys(P.vt)).forEach(k => { const t2 = P.vt[k]; if (t2 === undefined) return; const d = t2 - vNow(+k); if (d < 0) cut -= d * A; else fill += d * A; }); return { cut, fill }; }
  // [cantiere2] le piante e i sassi che il terreno tocca vanno via da soli (prima c'era il pennello Sgombra): le caselle attorno a ogni vertice che cambia
  function autoClr(st) {
    const P = plan(st), G = Gm(), t = T(), W0 = VW(), out = new Set();
    Object.keys(P.vt).forEach(k => { if (Math.abs(P.vt[k] - vNow(+k)) < .1) return; const i = +k % W0, j = Math.floor(+k / W0); for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { const v = G.tileAt(a, b); if ([t.TREE, t.SHRUB, t.ROCK].includes(v) && CN().covoAt(st, (a + .5) * TS(), (b + .5) * TS())) out.add(a + ',' + b); } });
    Object.keys(P.clr).forEach(q => out.add(q)); return out;
  }
  // le zolle: il terreno del progetto diviso in riquadri di 4×4 caselle (un lavoro ciascuno)
  const ZW = 4;
  function syncTerra(st) {
    const P = plan(st), W0 = VW(), zones = new Map();
    Object.keys(P.vt).forEach(k => { const i = +k % W0, j = Math.floor(+k / W0), z = Math.floor(i / ZW) + ',' + Math.floor(j / ZW); (zones.get(z) || zones.set(z, { v: [], c: [] }).get(z)).v.push(+k); });
    autoClr(st).forEach(q => { const [i, j] = q.split(',').map(Number), z = Math.floor(i / ZW) + ',' + Math.floor(j / ZW); (zones.get(z) || zones.set(z, { v: [], c: [] }).get(z)).c.push(q); });
    const have = new Map(items(st).filter(i => i.k === 'terra' && i.st !== 'fatto').map(i => [i.z, i]));
    zones.forEach((Z, z) => { let it = have.get(z); if (!it) { const [zx, zy] = z.split(',').map(Number); it = { pid: 'p' + (P.seq++), k: 'terra', z, x: (zx + .5) * ZW * TS(), y: (zy + .5) * ZW * TS(), st: 'progetto', prog: 0, done: 0, ord: -100000 + P.seq }; P.items.push(it); } if (it.st !== 'corso') { it.verts = Z.v; it.clr = Z.c; } have.delete(z); });
    have.forEach(it => { if (it.st !== 'corso') P.items.splice(P.items.indexOf(it), 1); });
  }
  // tutto il progetto in lavori (le zolle, le stanze): solo quando è cambiato
  function sync(st) { const P = plan(st); if (P._sr === P.rev) return; syncTerra(st); syncScavi(st); P._sr = P.rev; }

  // =====================================================================================================================
  // MODIFICARE IL PROGETTO (annulla e rifai: le fotografie del progetto, non della partita)
  // =====================================================================================================================
  const H = { undo: [], redo: [] };
  const snapOf = st => { const P = plan(st); return JSON.stringify({ items: P.items, vt: P.vt, clr: P.clr, cells: P.cells, seq: P.seq }); };
  function remember(st) { H.undo.push(snapOf(st)); if (H.undo.length > 60) H.undo.shift(); H.redo.length = 0; }
  function restore(st, s) {   // quello che è già cominciato non si annulla (la roba è pagata, le caselle scavate restano)
    const P = plan(st), o = JSON.parse(s), live = new Map(P.items.filter(i => i.st === 'corso' || i.paid).map(i => [i.pid, i]));
    P.items = o.items.filter(i => !(live.has(i.pid))).concat([...live.values()]); P.vt = o.vt; P.clr = o.clr; P.seq = Math.max(P.seq, o.seq);
    const C = o.cells || {}; Object.keys(C).forEach(k => { if (C[k].j) delete C[k]; }); Object.keys(P.cells).forEach(k => { if (P.cells[k].j) C[k] = P.cells[k]; }); P.cells = C; touch(st);
  }
  function undo(st) { if (!H.undo.length) return { ok: false, msg: 'Niente da annullare.' }; H.redo.push(snapOf(st)); restore(st, H.undo.pop()); return { ok: true, msg: 'Annullato.' }; }
  function redo(st) { if (!H.redo.length) return { ok: false, msg: 'Niente da rifare.' }; H.undo.push(snapOf(st)); restore(st, H.redo.pop()); return { ok: true, msg: 'Rifatto.' }; }
  function addPiece(st, id, x, y, rot, lv, quiet) {
    const b = pieceB(id); if (!inPlan(b)) return { ok: false, msg: 'Questo non si progetta.' };
    const [sx, sy] = CN().snap(b, x, y, rot || 0), P = plan(st), it = { pid: 'p' + P.seq, k: 'pezzo', id, x: sx, y: sy, rot: rot || 0, lv: lv || null, st: 'progetto', prog: 0, done: 0, ord: P.seq, seed: Math.floor(Math.random() * 1e6) + 1 };
    const c = checkPiece(st, it); if (c.why) return { ok: false, msg: c.why };
    if (!quiet) remember(st); P.seq++; P.items.push(it); touch(st); return { ok: true, msg: `${b.nome}: nel progetto.${c.soft ? ' ' + c.soft : ''}`, it };
  }
  // [cantiere2] compatibilità: gli scavi a pezzi di prima diventano caselle (pozzo = l'entrata), alla quota data
  function addDig(st, id, tiles, f, quiet) {
    const d = DIG(id); if (!d) return { ok: false, msg: 'Scavo sconosciuto.' }; if (!quiet) remember(st);
    const lv = clamp(Math.round((baseH(st, tiles[0][0], tiles[0][1]) - F1 - f) / STEP) + 1, 1, MAXLV);
    const r = paintCells(st, tiles, lv, { f, e: d.pozzo ? 1 : 0, rf: d.kind === 6 ? 'cemento' : undefined }); if (!r.ok && !quiet) H.undo.pop(); return r;
  }
  function digRect(b, x, y, rot) { return CN().footprint(b, x, y, rot).map(q => [q[0], q[1]]); }
  function moveItem(st, pid, x, y, rot) {
    const it = byPid(st, pid); if (!it || it.k !== 'pezzo' || it.st === 'corso' || it.paid) return { ok: false, msg: 'Questo è già in lavorazione: non si sposta.' };
    const b = pieceB(it.id), [sx, sy] = CN().snap(b, x, y, rot === undefined ? it.rot : rot), nx = { x: sx, y: sy, rot: rot === undefined ? it.rot : rot };
    const c = checkPiece(st, Object.assign({}, it, nx), pid); if (c.why) return { ok: false, msg: c.why };
    remember(st); Object.assign(it, nx); touch(st); return { ok: true, msg: `${b.nome}: spostato nel progetto.` };
  }
  function rotateItem(st, pid, dir) { const it = byPid(st, pid); if (!it) return { ok: false, msg: '' }; const b = pieceB(it.id); return moveItem(st, pid, it.x, it.y, it.rot + (dir || 1) * (b && b.fp ? Math.PI / 2 : Math.PI / 4)); }
  function removeItem(st, pid, quiet) {
    const it = byPid(st, pid); if (!it) return { ok: false, msg: '' };
    if (!quiet) remember(st); if (it.st === 'corso' || it.paid) { cancelWork(st, it); if (it.paid && it.paid.cost) refundTo(st, it, it.paid.cost); }
    const P = plan(st); P.items.splice(P.items.indexOf(it), 1); if (it.k === 'terra') { (it.verts || []).forEach(k => delete P.vt[k]); (it.clr || []).forEach(k => delete P.clr[k]); }
    if (it.k === 'scavo') (it.tiles || []).forEach(([tx, ty]) => { const k = ck(tx, ty), c = P.cells[k]; if (c && (!c.j || c.j === it.pid)) delete P.cells[k]; });   // le caselle già scavate restano scavate
    touch(st); return { ok: true, msg: 'Tolto dal progetto' + (it.paid ? ' (la roba torna nel baule)' : '') + '.' };
  }
  function prio(st, pid, dir) {   // dir: -1 prima, +1 dopo, 'top' in cima
    const q = queue(st), i = q.findIndex(x => x.pid === pid); if (i < 0) return { ok: false, msg: '' };
    if (dir === 'top') { q[i].ord = Math.min(...q.map(x => x.ord)) - 1; touch(st); return { ok: true, msg: 'In cima alla coda.' }; }
    const j = i + dir; if (j < 0 || j >= q.length) return { ok: false, msg: '' }; const a = q[i].ord; q[i].ord = q[j].ord; q[j].ord = a; if (q[i].ord === q[j].ord) q[i].ord += dir * .5; touch(st); return { ok: true, msg: '' };
  }

  // =====================================================================================================================
  // LA DISTINTA: cosa serve, cosa c'è, cosa manca, gli attrezzi, il tempo
  // =====================================================================================================================
  function costOf(st, it) {
    if (it.k === 'pezzo') { const b = pieceB(it.id); return b && b.cost ? b.cost : {}; }
    if (it.k === 'scavo') { const n = (it.tiles || []).length, c = { travi: Math.max(1, Math.ceil(n / PROPN)) }, R = RF[it.rf || 'legno']; Object.entries(R.cost).forEach(([k, q]) => { c[k] = (c[k] || 0) + q * n; }); return c; }
    return {};
  }
  function toolsOf(st, it) {
    const G = Gm(), t = T(); if (it.k === 'pezzo') { const b = pieceB(it.id); const L = it.lv ? [] : CN().clearTiles(b, it.x, it.y, it.rot); const s = new Set(); L.forEach(q => s.add(q[2] === 'disbosca' ? 'ascia|sega' : 'piccone')); return [...s]; }
    if (it.k === 'scavo') return [(it.tiles || []).some(([tx, ty]) => [t.ROCK, t.CLIFF].includes(G.tileAt(tx, ty))) ? 'piccone' : 'pala|piccone'];
    if (it.k === 'terra') { const s = new Set(['pala|zappa']); (it.clr || []).forEach(q => { const [i, j] = q.split(',').map(Number), v = G.tileAt(i, j); s.add(v === t.ROCK ? 'piccone' : 'ascia|sega'); }); return [...s]; }
    return [];
  }
  const totalHave = (st, k) => CN().totalOf(st, k);
  function bom(st) {
    sync(st); const need = {}, tools = new Set(); let mins = 0, nOpen = 0;
    items(st).forEach(it => { if (it.st === 'fatto') return; const rem = Math.max(0, (it.need || needOf(st, it)) - (it.done || 0)); mins += rem; nOpen++; if (!it.paid) Object.entries(costOf(st, it)).forEach(([k, q]) => { need[k] = (need[k] || 0) + q; }); toolsOf(st, it).forEach(x => tools.add(x)); });
    const rows = Object.entries(need).map(([k, q]) => { const h = totalHave(st, k); return { k, nome: O().nm(k), need: q, have: h, miss: Math.max(0, q - h) }; }).sort((a, b) => b.miss - a.miss || a.nome.localeCompare(b.nome));
    const tl = [...tools].map(t => ({ k: t, nome: t.split('|').map(q => O().nm(q)).join(' o '), ok: CN().hasTool(st, t) }));
    const crew = CN().crewAll(st).length, V0 = volOf(st);
    return { rows, miss: rows.filter(r => r.miss > 0), tools: tl, mins, crew, hours: mins / 60 / Math.max(1, crew), cut: V0.cut, fill: V0.fill, n: nOpen };
  }

  // =====================================================================================================================
  // LA CODA E I LAVORI
  // =====================================================================================================================
  const queue = st => { sync(st); return items(st).filter(i => i.st !== 'fatto').sort((a, b) => a.ord - b.ord); };
  // lo stato da mostrare: progetto | manca | invalid | attesa | corso | fatto (+ il perché; iso: non collegato a niente)
  function stateOf(st, it, links) {
    if (it.st === 'corso' || it.st === 'fatto') return { s: it.st, why: it.why || '' };
    let c = { why: '' }; if (it.k === 'pezzo') c = checkPiece(st, it, it.pid); else if (it.k === 'scavo') c = checkDig(st, it, links);
    if (c.why) return { s: 'invalid', why: c.why };
    if (c.wait) return { s: 'attesa', why: c.soft, iso: c.iso ? 1 : 0 };
    const dep = blockedBy(st, it); if (dep) return { s: 'attesa', why: dep };
    if (!it.paid) { const m = missOf(st, it); if (m.length) return { s: 'manca', why: 'Manca: ' + m.join(', ') + '.' }; }
    return { s: 'progetto', why: c.soft || '' };
  }
  function missOf(st, it) { const c = costOf(st, it); if (!Object.keys(c).length) return []; return CN().missing(st, { cost: c }); }
  function blockedBy(st, it) {
    if (it.k === 'pezzo') { const fp = fpOf(it); if (!it.lv) { const ter = items(st).find(o => o.k === 'terra' && o.st !== 'fatto' && fp.some(([tx, ty]) => (o.verts || []).some(k => { const W0 = VW(), i = k % W0, j = Math.floor(k / W0); return i >= tx && i <= tx + 1 && j >= ty && j <= ty + 1; }) || (o.clr || []).includes(tx + ',' + ty))); if (ter) return 'Aspetta il terreno sotto.'; }
      else { const L = LVM().S(st), G = Gm(); if (fp.some(([tx, ty]) => !L.ug[ty * G.GW + tx])) return 'Aspetta lo scavo.'; } }
    return '';
  }
  const crewFree = st => { try { return CN().crewFree(st); } catch (e) { return []; } };
  const CREW = { t: -1, st: null, l: [] }; const crewNow = st => { const t = st.clock || 0; if (CREW.st !== st || CREW.t !== t) { CREW.st = st; CREW.t = t; CREW.l = CN().crewAll(st); } return CREW.l; };   // la banda, una volta per passo
  const workingOn = (st, it) => crewNow(st).filter(n => n.ris && n.ris.task && n.ris.task.progJob === it.pid);
  function cancelWork(st, it) { workingOn(st, it).forEach(n => { n.ris.task = null; n.path = []; }); }
  function refundTo(st, it, cost) { const C = CN().covoOf(st, it.x, it.y, it.lv === 'ug' ? 'ug' : null), B0 = CN().bauleOf(st, C) || O().inv(st); Object.entries(cost).forEach(([k, q]) => { B0[k] = (B0[k] || 0) + q; }); }
  // il lavoro di un turno: quanto ci sta un membro prima di tornare (i minuti si sommano)
  const TURNO = 30;
  function liveDone(st, it) {   // i minuti fatti, contando il turno in corso di chi ci lavora adesso
    let d = it.done || 0; workingOn(st, it).forEach(n => { const T0 = n.ris.task, s = T0.steps[T0.i]; if (s && s.k === 'hold') d += Math.min(s.mins, Math.max(0, st.t - T0.stepT)); }); return d;
  }
  function progress(st, it) { const need = it.need || needOf(st, it); return clamp(liveDone(st, it) / need, 0, 1); }
  // un passo dei lavori (una volta al secondo di gioco)
  function step(st, dt) {
    const P = st.covo && st.covo.plan; if (!P || (!P.items.length && !Object.keys(P.cells || {}).length && !Object.keys(P.vt || {}).length)) return;
    const now = st.clock || 0; const dtm = Math.min(5, (st.t - (P.tLast === undefined ? st.t : P.tLast))); P.tLast = st.t;
    // la mano del giocatore: vicino al cantiere, fermo, con l'attrezzo giusto
    const W = P.work && byPid(st, P.work); if (W) { const p = st.player, d = Math.hypot(p.x - W.x, p.y - W.y); if (W.st !== 'corso' || d > siteR(W) + 2.2 || p.vehicle || (W.k === 'pezzo' && (p.lv && p.lv.k === 'ug' ? 'ug' : null) !== (W.lv || null))) { if (W.st === 'corso' && d > siteR(W) + 2.2) Gm().feed(st, 'Lasci il cantiere.', 'info'); P.work = null; } else { const tl = toolsOf(st, W)[0]; if (!tl || CN().hasTool(st, tl) || W.k === 'pezzo') { W.done = (W.done || 0) + dtm * 1.5; W.byMe = (W.byMe || 0) + dtm * 1.5; } } }
    if (now - (P.stepT || -9) < 1) { applyLive(st); return; } P.stepT = now;
    if (!P.go) { applyLive(st); return; }
    sync(st); const links = digLinks(st), crew = CN().crewAll(st).length, maxOn = Math.max(1, crew);
    let on = items(st).filter(i => i.st === 'corso').length;
    for (const it of queue(st)) {
      if (it.st === 'corso') continue;
      const S0 = stateOf(st, it, links); it.st = S0.s === 'progetto' ? 'progetto' : S0.s; it.why = S0.why;
      if (on >= maxOn || S0.s !== 'progetto' || (!NODE && V.on)) continue;   // [cantiere2] mentre disegni nella vista non comincia niente di nuovo (una stanza a metà)
      // si comincia: si paga, la roba è nel cantiere
      const c = costOf(st, it); if (Object.keys(c).length && !it.paid) { CN().pay(st, { cost: c }); it.paid = { cost: c }; }
      it.st = 'corso'; it.done = it.done || 0; it.t0 = st.t; it.why = ''; on++;
      if (it.k === 'terra') { const Pl = plan(st); it.base = {}; (it.verts || []).forEach(k => { it.base[k] = vNow(k); }); it.tgt = {}; (it.verts || []).forEach(k => { it.tgt[k] = Pl.vt[k]; }); }
      if (it.k === 'scavo') { it.steps = digSteps(st, it); let s = 0; it.cum = it.steps.map(q => (s += q.m)); it.si = 0; it.tiles.forEach(([tx, ty]) => { const q = P.cells[ck(tx, ty)]; if (q) q.j = it.pid; }); }
      it.need = needOf(st, it);
      touch(st); Gm().feed(st, `Cantiere: si comincia ${labelOf(it).toLowerCase()}.`, 'info');
    }
    // chi lavora e chi no
    const R0 = typeof Risacca !== 'undefined' ? Risacca : null;
    items(st).filter(i => i.st === 'corso').forEach(it => {
      if (liveDone(st, it) >= it.need) { finish(st, it); return; }
      const w = workingOn(st, it); if (w.length || !R0 || !st.ris) return;
      const free = crewFree(st); if (!free.length) return;
      const n = free.sort((a, b) => Math.hypot(a.x - it.x, a.y - it.y) - Math.hypot(b.x - it.x, b.y - it.y))[0];
      const at = CN().standAt(it.x, it.y, siteR(it) + .6), mins = Math.max(2, Math.min(TURNO, it.need - (it.done || 0)));
      n.ris.task = { id: st.ris.nextTask++, verb: 'cantiere', args: {}, steps: [{ k: 'go', x: at.x, y: at.y, name: 'il cantiere del progetto' }, { k: 'hold', mins }, { k: 'do', fn: 'progLavoro', pid: it.pid, mins }], i: 0, started: st.t, desc: `${verbOf(it)} al cantiere`, src: 'progetto', acc: 0, stepT: st.t, progJob: it.pid };
      n.path = []; n.goalPlace = null; n.wait = 0; n.inside = false;
    });
    applyLive(st);
  }
  // il turno finito: Risacca lo chiama come un passo 'do'
  function turnoDone(st, n, T0, s) { const it = byPid(st, s.pid); if (!it || it.st !== 'corso') return { ok: true }; it.done = (it.done || 0) + (s.mins || 0); if (it.done >= it.need) { finish(st, it); return { ok: true, msg: `${labelOf(it)}: finito.` }; } return { ok: true }; }
  const siteR = it => { if (it.k === 'pezzo') { const b = pieceB(it.id); return b && b.fp ? Math.max(...b.fp) * TS() / 2 : .6; } if (it.k === 'scavo') return Math.sqrt((it.tiles || [1]).length) * TS() / 2; return ZW * TS() / 2; };
  const verbOf = it => it.k === 'pezzo' ? `tira su ${(pieceB(it.id) || { nome: 'il pezzo' }).nome.toLowerCase()}` : it.k === 'scavo' ? 'scava sotto' : 'muove la terra';
  function labelOf(it) { if (it.k === 'pezzo') return (pieceB(it.id) || { nome: '?' }).nome; if (it.k === 'scavo') { const n = (it.tiles || []).length; return `Scavo ${n} ${n === 1 ? 'casella' : 'caselle'} (−${it.lv || 1})`; } return 'Terreno'; }
  // quello che si vede mentre si lavora: le caselle scavate una a una, i puntelli, il rinforzo; la terra che sale o scende a passi
  function applyLive(st) {
    items(st).filter(i => i.st === 'corso').forEach(it => {
      if (it.k === 'scavo' && it.steps) { const d = liveDone(st, it) + 1e-6; while ((it.si || 0) < it.steps.length && it.cum[it.si || 0] <= d) { digStep(st, it, it.steps[it.si || 0]); it.si = (it.si || 0) + 1; } }
      if (it.k === 'terra') { const q = Math.floor(progress(st, it) * 5) / 5; if (q > (it.lp || 0) + 1e-6) { it.lp = q; terraAt(st, it, q); } }
    });
  }
  function digStep(st, it, s) {
    const L = LVM().S(st), G = Gm(), C = cellsOf(st);
    const one = (tx, ty, fn) => { const i = ty * G.GW + tx, c = C[ck(tx, ty)] || { f: it.f }; fn(i, c); };
    if (s.t === 'dig') one(s.q[0], s.q[1], (i, c) => {
      const [tx, ty] = s.q; if (!L.ug[i]) { L.ug[i] = 2; L.fl[i] = c.f; L.kind[i] = RAW; if (LVM().hooks) LVM().hooks.dug.forEach(fn => { try { const m = fn(st, tx, ty, L); if (m) G.feed(st, m, 'good'); } catch (e) { } }); }
      c.s = 1; if (c.e && !L.portals.some(q => q.kind === 'botola' && q.s[0] === tx && q.s[1] === ty)) L.portals.push({ kind: 'botola', s: [tx, ty], u: [tx, ty] });
    });
    if (s.t === 'prop') s.qs.forEach(([tx, ty]) => one(tx, ty, (i, c) => { if (L.kind[i] === RAW) L.kind[i] = 2; c.s = 2; }));
    if (s.t === 'rf') one(s.q[0], s.q[1], (i, c) => { if (L.ug[i]) L.kind[i] = RF[it.rf].kind; c.s = 3; });
    L.rev++;
  }
  function terraAt(st, it, q) {
    const G = Gm(), M = G.MAP, W0 = VW(), touched = new Set();
    Object.keys(it.base || {}).forEach(k => { const t2 = it.tgt[k]; if (t2 === undefined) return; M.vh[+k] = it.base[k] + (t2 - it.base[k]) * q; const i = +k % W0, j = Math.floor(+k / W0); for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) touched.add(a + ',' + b); });
    touched.forEach(s => { const [a, b] = s.split(',').map(Number); if (a < 0 || b < 0 || a >= G.GW || b >= G.GH) return; if (M.elev) M.elev[b * G.GW + a] = (M.vh[b * W0 + a] + M.vh[b * W0 + a + 1] + M.vh[(b + 1) * W0 + a] + M.vh[(b + 1) * W0 + a + 1]) / 4; dirtyTile(a, b); });
    // gli alberi e i sassi della zolla: al primo quinto
    if (q >= .2 && !it.cleared) { it.cleared = true; const C = CN().covoAt(st, it.x, it.y), bag = CN().bauleOf(st, C) || O().inv(st); (it.clr || []).forEach(s => { const [a, b] = s.split(',').map(Number), v = G.tileAt(a, b), t = T(); const op = v === t.ROCK ? 'cava' : 'sgombra'; try { const keep = CN().state.lvH; CN().state.lvH = null; CN().terrainDo(st, CN().BY[op], a, b, bag); CN().state.lvH = keep; } catch (e) { } }); }
    if (typeof window !== 'undefined' && R() && R().quoteNuove && touched.size) { let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; touched.forEach(s => { const [a, b] = s.split(',').map(Number); i0 = Math.min(i0, a); j0 = Math.min(j0, b); i1 = Math.max(i1, a + 1); j1 = Math.max(j1, b + 1); }); R().quoteNuove(i0, j0, i1, j1); }
  }
  const R = () => PV() && PV().R;
  const dirtyTile = (tx, ty) => { const r = R(); if (r && r.dirtyAt) r.dirtyAt(tx * TS() + 1, ty * TS() + 1); };
  function finish(st, it) {
    const P = plan(st), G = Gm();
    if (it.k === 'pezzo') {
      const b = pieceB(it.id), C = CN().covoOf(st, it.x, it.y, it.lv || null), bag = CN().bauleOf(st, C) || O().inv(st);
      if (!it.lv) CN().clearTiles(b, it.x, it.y, it.rot).forEach(([tx, ty, op]) => { try { CN().terrainDo(st, CN().BY[op], tx, ty, bag); } catch (e) { } });
      const r = CN().place(st, b, it.x, it.y, it.rot, { uid: 'k' + it.pid, paid: it.paid || { cost: {} }, seed: it.seed }, it.lv || null);
      if (!r.ok) { it.st = 'invalid'; it.why = 'Non ci sta più: ' + r.msg; cancelWork(st, it); touch(st); G.feed(st, `${b.nome}: il cantiere si ferma. ${r.msg}`, 'bad'); return; }
      G.feed(st, `${b.nome}: finita${it.byMe ? ' (anche con le tue mani)' : ''}.`, 'good');
    }
    if (it.k === 'scavo') {
      const L = LVM().S(st); if (!it.steps) { it.steps = digSteps(st, it); it.si = 0; } while ((it.si || 0) < it.steps.length) { digStep(st, it, it.steps[it.si || 0]); it.si = (it.si || 0) + 1; }
      it.tiles.forEach(([tx, ty]) => { const k = ck(tx, ty); if (P.cells[k] && (!P.cells[k].j || P.cells[k].j === it.pid)) delete P.cells[k]; });
      if (it.tiles.length >= 6) L.rooms.push({ x: it.x, y: it.y, f: it.f, deco: it.rf === 'cemento' ? 'bunker_vuoto' : 'scavo' });
      G.feed(st, `${labelOf(it)}: scavo finito${it.rf && it.rf !== 'legno' ? ', ' + RF[it.rf].nome.toLowerCase() + ' fatto' : ', puntellato di legno'}.`, 'good');
    }
    if (it.k === 'terra') { it.lp = 0; terraAt(st, it, 1); (it.verts || []).forEach(k => { if (P.vt[k] === it.tgt[k]) delete P.vt[k]; }); (it.clr || []).forEach(k => delete P.clr[k]); G.feed(st, 'Una zolla di terreno: fatta.', 'good'); }
    it.st = 'fatto'; it.done = it.need; cancelWork(st, it); P.fatti = (P.fatti || 0) + 1; if (P.work === it.pid) P.work = null;
    P.items.splice(P.items.indexOf(it), 1); touch(st); P._sr = -1;
    if (!P.items.length && !Object.keys(P.cells).length) { P.go = false; G.feed(st, 'Il progetto è tutto fatto.', 'good'); }
  }
  function go(st, on) { const P = plan(st); P._sr = -1; sync(st); P.go = on === undefined ? !P.go : !!on; P.stepT = -9; touch(st); return { ok: true, msg: P.go ? `Lavori avviati: ${queue(st).length} in coda.` : 'Lavori in pausa (chi sta lavorando finisce il turno).' }; }
  // il giocatore dà una mano: ci va (clic sull'ologramma in corso) e lavora finché resta lì
  function workHere(st, pid) { const it = byPid(st, pid); if (!it || it.st !== 'corso') return { ok: false, msg: 'Lì non c\'è un cantiere aperto.' }; const tl = toolsOf(st, it)[0]; if (it.k !== 'pezzo' && tl && !CN().hasTool(st, tl)) return { ok: false, msg: `Ti serve: ${tl.split('|').map(q => O().nm(q)).join(' o ')}.` }; plan(st).work = pid; return { ok: true, msg: `Dai una mano: ${labelOf(it).toLowerCase()}. Resta qui; allontanati per smettere.` }; }

  // =====================================================================================================================
  // LA GRAFICA: un colore per l'ologramma, il contorno dice lo stato; il terreno a curve; la sezione di sotto come un plastico
  // =====================================================================================================================
  const COL = { holo: '#A3D4D8', manca: '#E8A33A', corso: '#FFFFFF', no: '#E04B8C', ghost: '#F2E7CF', vero: '#5C5560', sel: '#FFFFFF' };
  const outCol = S => !S ? COL.holo : S.s === 'corso' ? COL.corso : (S.s === 'manca' || S.s === 'invalid' || S.iso) ? COL.manca : COL.holo;
  const V = { on: false, tool: null, piece: null, pick: true, cat: 'baracche', rot: 0, r: 3, s: .25, op: 'alza', lv: 1, brush: 1, rf: 'legno', entrata: false, layer: 'su', top: true, cam: null, sel: null, selRoom: null, dist: false, msg: '', msgOk: true, msgT: 0, grp: null, scene: null, rev: -1, layerRev: '', ghostKey: '' };
  const GEO = {};   // le forme di ogni pezzo, fuse in una (posizione, normale, colore), una volta sola
  let MATS = null;
  function iconMat(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); return new THREE.PointsMaterial({ map: t, size: 20, sizeAttenuation: false, transparent: true, depthTest: false, depthWrite: false }); }
  function mats() {
    if (MATS) return MATS;
    const holo = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, vertexColors: false, side: THREE.DoubleSide });
    holo.onBeforeCompile = sh => {
      sh.uniforms.uT = { value: 0 }; holo.userData.sh = sh;
      sh.vertexShader = 'attribute float aFill; attribute vec3 aTint; varying float vFill; varying float vWY; varying vec3 vTint; varying vec3 vHN; varying vec3 vHV;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vFill = aFill; vTint = aTint; vWY = (modelMatrix * vec4(transformed, 1.0)).y; vHN = normalize(normalMatrix * normal); vHV = normalize(-mvPosition.xyz);');
      sh.fragmentShader = 'uniform float uT; varying float vFill; varying float vWY; varying vec3 vTint; varying vec3 vHN; varying vec3 vHV;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'if (vWY < vFill) discard; float fr = 1.0 - abs(dot(normalize(vHN), normalize(vHV))); float band = smoothstep(.14, 0.0, vWY - vFill) * step(-50.0, vFill); vec4 diffuseColor = vec4(mix(vTint, vec3(1.0, .97, .9), band), clamp(.2 + .42 * fr * fr + band * .7, 0.0, .9));');
    };
    const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
    solid.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aFill; varying float vFill; varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vFill = aFill; vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vFill; varying float vWY;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'if (vWY > vFill) discard; vec4 diffuseColor = vec4( diffuse, opacity );').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, .93, .78) * smoothstep(.09, 0.0, vFill - vWY) * .9;');
    };
    const lineX = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .9, depthTest: false, depthWrite: false });
    // i nastri: i contorni netti (larghi qualche centimetro, piatti), le curve del terreno; senza profondità, sopra l'erba
    const rib = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); rib.vertexAlphas = true;
    const xray = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }); xray.vertexAlphas = true;
    const veil = new THREE.MeshBasicMaterial({ color: '#16121B', transparent: true, opacity: .66, depthTest: false, depthWrite: false });
    const ghost = new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: .4, depthWrite: false }), ghostNo = new THREE.MeshBasicMaterial({ color: COL.no, transparent: true, opacity: .45, depthWrite: false });
    const digOk = new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: .42, depthTest: false, depthWrite: false }), digNo = new THREE.MeshBasicMaterial({ color: COL.no, transparent: true, opacity: .5, depthTest: false, depthWrite: false }), digBox = new THREE.BoxGeometry(1.8, 2.3, 1.8), pin = new THREE.CylinderGeometry(.08, .08, 1.6, 6);
    const ring = new THREE.LineBasicMaterial({ color: '#F2E7CF', transparent: true, opacity: .8, depthWrite: false, depthTest: false });
    const foot = new THREE.MeshBasicMaterial({ color: COL.holo, transparent: true, opacity: .16, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
    // le icone piccole: la pianta da togliere (un alberello barrato), la roba che manca (!)
    const iTree = iconMat(x => { x.fillStyle = 'rgba(15,27,25,.92)'; x.beginPath(); x.arc(32, 32, 27, 0, 6.3); x.fill(); x.lineWidth = 5; x.strokeStyle = COL.holo; x.stroke(); x.fillStyle = '#F2E7CF'; x.beginPath(); x.moveTo(32, 13); x.lineTo(45, 38); x.lineTo(19, 38); x.closePath(); x.fill(); x.fillRect(29, 37, 6, 10); x.strokeStyle = COL.holo; x.lineWidth = 6; x.beginPath(); x.moveTo(15, 49); x.lineTo(49, 15); x.stroke(); });
    const iMiss = iconMat(x => { x.fillStyle = COL.manca; x.beginPath(); x.arc(32, 32, 27, 0, 6.3); x.fill(); x.lineWidth = 4; x.strokeStyle = 'rgba(15,27,25,.9)'; x.stroke(); x.fillStyle = '#16121B'; x.fillRect(28, 14, 8, 24); x.fillRect(28, 43, 8, 8); });
    iMiss.size = 18;
    return (MATS = { holo, solid, lineX, rib, xray, veil, ghost, ghostNo, digOk, digNo, digBox, pin, ring, foot, iTree, iMiss });
  }
  // la forma di un pezzo: i suoi pezzi fusi in una geometria sola (posizione, normale, colore del materiale); con la scatola d'ingombro
  function geoOf(id) {
    if (GEO[id]) return GEO[id];
    const b = pieceB(id); let g = null; try { g = b.wall ? CN().wallModel(b, 0) : b.layer === 'tetto' ? CN().roofModel(b) : CN().model(b, 7); } catch (e) { g = null; }
    const pos = [], nor = [], col = [], c0 = new THREE.Color(), m3 = new THREE.Matrix3(), v = new THREE.Vector3(); let tris = 0;
    if (g) { g.updateMatrixWorld(true); g.traverse(o => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position || o.isInstancedMesh) return; const ge = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry, P = ge.attributes.position, N = ge.attributes.normal; tris += P.count / 3; if (tris > 6000) return; m3.getNormalMatrix(o.matrixWorld); const mt = Array.isArray(o.material) ? o.material[0] : o.material; c0.set(mt && mt.color ? mt.color : '#9a8a7a'); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); if (N) { v.fromBufferAttribute(N, i).applyMatrix3(m3).normalize(); nor.push(v.x, v.y, v.z); } else nor.push(0, 1, 0); col.push(c0.r, c0.g, c0.b); } }); }
    const box = new THREE.Box3(); if (pos.length) { for (let i = 0; i < pos.length; i += 3) box.expandByPoint(v.set(pos[i], pos[i + 1], pos[i + 2])); }
    const S0 = TS(), fw = (b.fp ? b.fp[0] : 1) * S0, fd = (b.fp ? b.fp[1] : 1) * S0;
    if (!pos.length || tris > 6000) { pos.length = 0; nor.length = 0; col.length = 0; const bg = new THREE.BoxGeometry(fw * .9, 2, fd * .9).toNonIndexed(); bg.translate(0, 1, 0); const P = bg.attributes.position, N = bg.attributes.normal; for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); col.push(.6, .55, .5); } box.set(new THREE.Vector3(-fw / 2, 0, -fd / 2), new THREE.Vector3(fw / 2, 2, fd / 2)); }
    const h = Math.max(.3, box.max.y);
    return (GEO[id] = { pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), h, w: b.fp ? fw : Math.max(.6, box.max.x - box.min.x), d: b.fp ? fd : Math.max(.6, box.max.z - box.min.z) });
  }
  const gH = (st, x, y, lv) => { if (lv === 'ug') { const L = LVM() && LVM().S(st), G = Gm(), [tx, ty] = tileOf(x, y), i = ty * G.GW + tx; if (L && !L.ug[i]) { const c = cellsOf(st)[ck(tx, ty)]; if (c) return c.f; } } try { return CN().hAt(st, x, y, lv); } catch (e) { return 0; } };   // sotto: anche sul fondo di uno scavo ancora da fare
  // i buffer dei nastri e delle scatole (colore con l'alfa): A = [pos, col]
  const BUF = () => [[], []];
  function pushV(A, x, y, z, c, a) { A[0].push(x, y, z); A[1].push(c.r, c.g, c.b, a); }
  function quad(A, p0, p1, p2, p3, c, a) { for (const p of [p0, p1, p2, p0, p2, p3]) pushV(A, p[0], p[1], p[2], c, a); }
  function ribbon(A, x0, y0, z0, x1, y1, z1, w, c, a) { const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2; quad(A, [x0 + nx, y0, z0 + nz], [x1 + nx, y1, z1 + nz], [x1 - nx, y1, z1 - nz], [x0 - nx, y0, z0 - nz], c, a); }
  function boxV(A, x0, y0, z0, x1, y1, z1, c, a, noTop) {   // una scatola con la luce cotta nel colore (sopra 1, i fianchi più scuri): si legge senza luci
    const cx = c.clone().multiplyScalar(.8), cz = c.clone().multiplyScalar(.64);
    if (!noTop) quad(A, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], c, a);
    quad(A, [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], cx, a); quad(A, [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], cx, a);
    quad(A, [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], cz, a); quad(A, [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], cz, a);
  }
  function geoA(A) { if (!A[0].length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(A[0], 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(A[1], 4)); g.computeBoundingSphere(); return g; }
  // tutti i pezzi del progetto in due disegni (solido sotto la riga, ologramma sopra), il contorno a terra (nastro) e gli spigoli (linee)
  function buildPieces(st, links) {
    const lvNow = V.layer === 'su' ? null : 'ug', its = items(st).filter(i => i.k === 'pezzo' && ((i.lv || null) === lvNow));
    let nv = 0; its.forEach(it => { nv += geoOf(it.id).pos.length / 3; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), tint = new Float32Array(nv * 3), fill = new Float32Array(nv), lp = [], lc = [], ranges = [], RB = BUF(), FP = [], MI = [];
    const c = new THREE.Color(), ct = new THREE.Color(COL.holo); let o = 0;
    its.forEach(it => {
      const G0 = geoOf(it.id), y0 = gH(st, it.x, it.y, it.lv), cs = Math.cos(-it.rot), sn = Math.sin(-it.rot), S0 = stateOf(st, it, links); it._s = S0;
      c.set(outCol(S0)); const n = G0.pos.length / 3, r0 = o;
      for (let i = 0; i < n; i++) { const x = G0.pos[i * 3], y = G0.pos[i * 3 + 1], z = G0.pos[i * 3 + 2], nx = G0.nor[i * 3], nz = G0.nor[i * 3 + 2];
        pos[o * 3] = it.x + x * cs + z * sn; pos[o * 3 + 1] = y0 + y; pos[o * 3 + 2] = it.y - x * sn + z * cs; nor[o * 3] = nx * cs + nz * sn; nor[o * 3 + 1] = G0.nor[i * 3 + 1]; nor[o * 3 + 2] = -nx * sn + nz * cs;
        col[o * 3] = G0.col[i * 3]; col[o * 3 + 1] = G0.col[i * 3 + 1]; col[o * 3 + 2] = G0.col[i * 3 + 2]; tint[o * 3] = ct.r; tint[o * 3 + 1] = ct.g; tint[o * 3 + 2] = ct.b; fill[o] = -99; o++; }
      ranges.push([it.pid, r0, o, y0, G0.h]);
      const hw = G0.w / 2, hd = G0.d / 2, hh = G0.h, Q = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [it.x + a * cs + b * sn, it.y - a * sn + b * cs]);
      FP.push(Q[0][0], y0 + .05, Q[0][1], Q[1][0], y0 + .05, Q[1][1], Q[2][0], y0 + .05, Q[2][1], Q[0][0], y0 + .05, Q[0][1], Q[2][0], y0 + .05, Q[2][1], Q[3][0], y0 + .05, Q[3][1]);   // l'impronta: si legge la pianta
      const wide = S0.s === 'corso' || S0.s === 'manca' || S0.iso ? .2 : .14;
      for (let k = 0; k < 4; k++) { const A = Q[k], B = Q[(k + 1) % 4]; ribbon(RB, A[0], y0 + .06, A[1], B[0], y0 + .06, B[1], wide, c, 1); lp.push(A[0], y0 + hh, A[1], B[0], y0 + hh, B[1], A[0], y0 + .05, A[1], A[0], y0 + hh, A[1]); for (let q = 0; q < 4; q++) lc.push(c.r, c.g, c.b); }
      if (S0.s === 'manca' || S0.iso) MI.push(it.x, y0 + hh + .7, it.y);
    });
    // le entrate degli scavi, viste da sopra: un quadrato a terra
    if (!lvNow) { const C = cellsOf(st), E = Gm().MAP.elev, G = Gm(), S1 = TS(); c.set(COL.holo); Object.keys(C).forEach(k => { const q = C[k]; if (!q.e || q.s > 0) return; const [tx, ty] = kc(k), h = (E ? E[ty * G.GW + tx] : 0) + .08, x0 = tx * S1 + .3, z0 = ty * S1 + .3, x1 = x0 + S1 - .6, z1 = z0 + S1 - .6; [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]].forEach(([a, b, d, e]) => ribbon(RB, a, h, b, d, h, e, .14, c, 1)); ribbon(RB, x0, h, z0, x1, h, z1, .1, c, .8); ribbon(RB, x1, h, z0, x0, h, z1, .1, c, .8); }); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); ge.setAttribute('color', new THREE.BufferAttribute(col, 3)); ge.setAttribute('aTint', new THREE.BufferAttribute(tint, 3)); ge.setAttribute('aFill', new THREE.BufferAttribute(fill, 1)); ge.computeBoundingSphere();
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); gl.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    const gf = new THREE.BufferGeometry(); gf.setAttribute('position', new THREE.Float32BufferAttribute(FP, 3));
    return { ge, gl, gf, gr: geoA(RB), mi: MI, ranges };
  }
  // il terreno che verrà: curve di un colore solo alla quota futura. Il bordo di quello che cambia, poi una curva ogni mezzo metro di
  // differenza: piene dove si riporta, a puntini dove si scava (marching squares sulla griglia dei vertici)
  function buildTerra(st) {
    const P = plan(st), W0 = VW(), ks = Object.keys(P.vt).map(Number); if (!ks.length) return null;
    let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; ks.forEach(k => { const i = k % W0, j = Math.floor(k / W0); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); }); i0--; j0--; i1++; j1++;
    const S0 = TS(), D = (i, j) => { const k = j * W0 + i; return P.vt[k] !== undefined ? P.vt[k] - vNow(k) : 0; }, Hh = (i, j) => { const k = j * W0 + i; return P.vt[k] !== undefined ? P.vt[k] : vNow(k); };
    let mx = 0; ks.forEach(k => { mx = Math.max(mx, Math.abs(P.vt[k] - vNow(k))); });
    const A = BUF(), c = new THREE.Color(COL.holo), lev = [.06]; for (let L = .5; L <= mx + 1e-6; L += .5) lev.push(L);
    for (const sg of [1, -1]) for (const L of lev) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      if (sg < 0 && L > .1 && (i + j) % 2) continue;   // lo scavo: a puntini
      const P4 = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], v4 = P4.map(([a, b]) => sg * D(a, b) - L), X = [];
      for (let e = 0; e < 4; e++) { const a = v4[e], b = v4[(e + 1) % 4]; if ((a < 0) === (b < 0)) continue; const t = a / (a - b), [ax, ay] = P4[e], [bx, by] = P4[(e + 1) % 4], x = ax + (bx - ax) * t, y = ay + (by - ay) * t; X.push([x * S0, (Hh(ax, ay) * (1 - t) + Hh(bx, by) * t) + .1, y * S0]); }
      const w = L < .1 ? .16 : .09, al = L < .1 ? 1 : .85;
      for (let q = 0; q + 1 < X.length; q += 2) ribbon(A, X[q][0], X[q][1], X[q][2], X[q + 1][0], X[q + 1][1], X[q + 1][2], w, c, al);
    }
    return geoA(A);
  }
  // [cantiere2] la sezione di sotto come un plastico: le gallerie vere (pavimento, pareti tagliate basse, i telai di legno, i muri, il
  // cemento), le caselle del progetto (l'ologramma del livello scelto alto, gli altri livelli bassi), i contorni delle stanze
  function buildUnder(st, links) {
    const L = LVM() && LVM().S(st); if (!L) return null; const G = Gm(), S0 = TS(), E = G.MAP.elev, c0 = V.cam || st.player, ci = Math.floor(c0.x / S0), cj = Math.floor(c0.y / S0), R0 = 30;
    const ug = st.player.lv && st.player.lv.k === 'ug', C = cellsOf(st), fNow = levelF(st, V.lv, ci, cj), FL = BUF(), SO = BUF(), HO = BUF(), RI = BUF(), c = new THREE.Color(), ch = new THREE.Color(COL.holo);
    const has = (i, j) => i >= 0 && j >= 0 && i < G.GW && j < G.GH && L.ug[j * G.GW + i] > 0;
    const FLC = { 18: '#6e4a30', 2: '#7c5c3e', 10: '#7a5446', 6: '#9c988e' }, WLC = { 18: '#5a3c26', 2: '#5a3c26', 10: '#a8644c', 6: '#c4c0b6' };
    if (!ug) for (let j = cj - R0; j <= cj + R0; j++) for (let i = ci - R0; i <= ci + R0; i++) {
      if (!has(i, j)) continue; const k = j * G.GW + i, kd = L.kind[k], f = L.fl[k], dim = Math.abs(f - fNow) < .8 ? 1 : .6, x0 = i * S0, z0 = j * S0, x1 = x0 + S0, z1 = z0 + S0, own = !!FLC[kd];
      c.set(FLC[kd] || COL.vero).multiplyScalar(dim); boxV(FL, x0 + .03, f - .14, z0 + .03, x1 - .03, f, z1 - .03, c, 1);
      if (!own) continue;
      const wh = kd === 10 || kd === 6 ? 1.5 : .45, wc = new THREE.Color(WLC[kd]).multiplyScalar(dim), sides = N4.filter(([dx, dy]) => !has(i + dx, j + dy));
      sides.forEach(([dx, dy]) => { const t = .18; boxV(SO, dx > 0 ? x1 - t : x0, f, dy > 0 ? z1 - t : z0, dx < 0 ? x0 + t : x1, f + wh, dy < 0 ? z0 + t : z1, wc, 1); });
      if (kd === 2 && (i + j) % 2 === 0) {   // i telai: un palo contro ogni parete, la trave se è una galleria
        const pc = new THREE.Color('#d09a5a').multiplyScalar(dim); sides.forEach(([dx, dy]) => { const px = (x0 + x1) / 2 + dx * (S0 / 2 - .32), pz = (z0 + z1) / 2 + dy * (S0 / 2 - .32); boxV(SO, px - .11, f, pz - .11, px + .11, f + 2.2, pz + .11, pc, 1); });
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; if (sides.some(q => q[0] === 1) && sides.some(q => q[0] === -1)) boxV(SO, x0 + .2, f + 2.08, cz - .12, x1 - .2, f + 2.3, cz + .12, pc, 1); else if (sides.some(q => q[1] === 1) && sides.some(q => q[1] === -1)) boxV(SO, cx - .12, f + 2.08, z0 + .2, cx + .12, f + 2.3, z1 - .2, pc, 1);
      }
    }
    if (!ug) L.portals.forEach(q => { if (q.kind !== 'botola' || Math.abs(q.s[0] - ci) > R0 || Math.abs(q.s[1] - cj) > R0) return; const [i, j] = q.s, k = j * G.GW + i; if (!L.ug[k]) return; const x = (i + .5) * S0, z = (j + .5) * S0; c.set('#d09a5a'); boxV(SO, x - .5, L.fl[k], z - .06, x - .38, E[k], z + .06, c, 1); boxV(SO, x + .38, L.fl[k], z - .06, x + .5, E[k], z + .06, c, 1); for (let y = L.fl[k] + .4; y < E[k]; y += .45) boxV(SO, x - .4, y, z - .04, x + .4, y + .06, z + .04, c, 1); });   // la scala dell'entrata
    // le caselle del progetto
    const room = new Map(); items(st).forEach(it => { if (it.k === 'scavo') it.tiles.forEach(q => room.set(ck(q[0], q[1]), it)); });
    const selS = V.selRoom && C[V.selRoom] ? new Set(roomKeys(st, V.selRoom)) : null, MI = [], SC = new Map();
    const same = (k2, c1) => { const q = C[k2]; return q && q.lv === c1.lv && !(q.s > 0); };
    Object.keys(C).forEach(k => {
      const q = C[k], [tx, ty] = kc(k); if (Math.abs(tx - ci) > R0 + 8 || Math.abs(ty - cj) > R0 + 8) return; const i = ty * G.GW + tx, it = room.get(k), S1 = it ? (it.st === 'corso' ? { s: 'corso' } : (SC.get(it) || SC.set(it, it._s = stateOf(st, it, links)).get(it))) : null;
      const x0 = tx * S0, z0 = ty * S0, x1 = x0 + S0, z1 = z0 + S0, f = q.f, act = q.lv === V.lv;
      if (q.s > 0) {   // scavata: il rinforzo che manca è un ologramma di pareti
        if (q.rf && q.rf !== 'legno' && q.s < 3) N4.forEach(([dx, dy]) => { if (has(tx + dx, ty + dy)) return; const t = .2; boxV(HO, dx > 0 ? x1 - t : x0, f, dy > 0 ? z1 - t : z0, dx < 0 ? x0 + t : x1, f + 1.5, dy < 0 ? z0 + t : z1, ch, .32); });
        return;
      }
      const hh = act ? 2.3 : .3; boxV(HO, x0 + .05, f, z0 + .05, x1 - .05, f + hh, z1 - .05, ch, act ? .16 : .1);
      const oc = selS && selS.has(k) ? COL.sel : outCol(S1); c.set(oc); const w = act ? (selS && selS.has(k) ? .22 : .15) : .1, al = act ? 1 : .45;
      [[0, -1, x0, z0, x1, z0], [1, 0, x1, z0, x1, z1], [0, 1, x1, z1, x0, z1], [-1, 0, x0, z1, x0, z0]].forEach(([dx, dy, a, b, d, e]) => { if (same(ck(tx + dx, ty + dy), q)) return; ribbon(RI, a, f + .05, b, d, f + .05, e, w, c, al); if (act) ribbon(RI, a, f + hh, b, d, f + hh, e, .06, c, .8); });
      if (q.e) { boxV(HO, x0 + .55, f + hh, z0 + .55, x1 - .55, (E ? E[i] : f + 3), z1 - .55, ch, .22); }
      if (q.rf === 'muri' || q.rf === 'cemento') { if (act) { c.set(oc); ribbon(RI, x0 + .5, f + .06, z0 + .5, x1 - .5, f + .06, z1 - .5, .07, c, .55); if (q.rf === 'cemento') ribbon(RI, x1 - .5, f + .06, z0 + .5, x0 + .5, f + .06, z1 - .5, .07, c, .55); } }   // il segno del rinforzo: / muri, × cemento
      if (it && it.tiles[0][0] === tx && it.tiles[0][1] === ty && S1 && (S1.s === 'manca' || S1.iso)) MI.push(it.x, f + hh + .6, it.y);
    });
    return { fl: geoA(FL), so: geoA(SO), ho: geoA(HO), ri: geoA(RI), mi: MI };
  }
  function ringGeo(st) { const pts = []; CN().covi(st).forEach(C => { const n = Math.max(24, Math.round(C.r * 2)); for (let i = 0; i < n; i++) { if (i % 2) continue; const a = i / n * 6.283, b = (i + 1) / n * 6.283; const x0 = C.x + Math.cos(a) * C.r, z0 = C.y + Math.sin(a) * C.r, x1 = C.x + Math.cos(b) * C.r, z1 = C.y + Math.sin(b) * C.r; pts.push(x0, gH(st, x0, z0, null) + .3, z0, x1, gH(st, x1, z1, null) + .3, z1); } }); const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return ge; }
  // le piante e i sassi da togliere: dal terreno e sotto i pezzi del progetto (un'icona ciascuno)
  function clearIcons(st) {
    const out = new Set(autoClr(st)); items(st).forEach(it => { if (it.k !== 'pezzo' || it.lv || it.st === 'fatto') return; const b = pieceB(it.id); if (b) CN().clearTiles(b, it.x, it.y, it.rot).forEach(q => out.add(q[0] + ',' + q[1])); });
    const S0 = TS(), pts = []; out.forEach(q => { const [i, j] = q.split(',').map(Number), x = (i + .5) * S0, z = (j + .5) * S0; pts.push(x, gH(st, x, z, null) + 2.6, z); }); return pts;
  }
  const ptsGeo = a => { if (!a.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g; };
  function drop(o) { if (!o) return; if (o.parent) o.parent.remove(o); const M = MATS; o.traverse(q => { if (q.geometry && !(M && (q.geometry === M.digBox || q.geometry === M.pin))) q.geometry.dispose(); }); }
  const MESHES = ['pS', 'pH', 'pL', 'pF', 'pR', 'tH', 'uF', 'uS', 'uH', 'uR', 'veil', 'ring', 'iT', 'iM'];
  function sceneSync(st) {
    const r = R(), scene = r && r.__models && r.__models.scene; if (!scene) return;
    const M = mats(); if (V.scene !== scene) { V.scene = scene; V.grp = new THREE.Group(); V.grp.name = 'progetto'; V.grp.userData.ugKeep = true; scene.add(V.grp); V.rev = -1; }
    const P = st.covo && st.covo.plan, any = P && (P.items.length || Object.keys(P.vt).length || Object.keys(P.cells || {}).length);
    V.grp.visible = !!(V.on || (any && (P.go || P.items.some(i => i.st === 'corso'))));   // fuori dalla vista: il progetto si vede quando i lavori sono avviati
    if (!V.grp.visible) return;
    const ug = !!(st.player.lv && st.player.lv.k === 'ug'), lk = V.layer + '|' + V.lv + '|' + (V.on ? 1 : 0) + '|' + (ug ? 1 : 0) + '|' + V.selRoom + '|' + Math.round((V.cam ? V.cam.x : 0) / 16) + ',' + Math.round((V.cam ? V.cam.y : 0) / 16);
    const sig = P ? P.rev + '|' + P.items.map(i => i.pid + i.st + (i.why ? 1 : 0)).join(',') + '|' + Object.keys(CN().S(st).obj).length + '|' + ((LVM() && LVM().S(st).rev) || 0) : '-';
    if (P && (V.rev !== sig || V.layerRev !== lk) && (!V.rebT || performance.now() - V.rebT > 120)) {
      V.rebT = performance.now(); V.rev = sig; V.layerRev = lk; sync(st);
      MESHES.forEach(k => { drop(V[k]); V[k] = null; });
      const links = digLinks(st), B = buildPieces(st, links), xr = V.layer !== 'su', add = (k, m, ro) => { if (!m) return; m.renderOrder = ro; m.frustumCulled = false; V[k] = m; V.grp.add(m); };
      V.ranges = B.ranges; M.solid.depthTest = !xr; M.holo.depthTest = !xr && !V.on;   // nella vista l'ologramma sta sopra l'erba e le chiome (è un disegno sopra la mappa); fuori, dentro il mondo
      add('pS', new THREE.Mesh(B.ge, M.solid), xr ? 45 : 0); add('pH', new THREE.Mesh(B.ge, M.holo), xr ? 46 : 30); add('pL', new THREE.LineSegments(B.gl, M.lineX), xr ? 47 : 31); add('pF', new THREE.Mesh(B.gf, M.foot), xr ? 44 : 28); if (B.gr) add('pR', new THREE.Mesh(B.gr, M.rib), xr ? 47 : 32);
      if (!xr) { const tg = buildTerra(st); if (tg) add('tH', new THREE.Mesh(tg, M.rib), 29); const ic = ptsGeo(clearIcons(st)); if (ic && V.on) add('iT', new THREE.Points(ic, M.iTree), 48); }
      let mi = B.mi;
      if (xr && V.on) {
        if (!ug) { const vg = new THREE.PlaneGeometry(4000, 4000); vg.rotateX(-Math.PI / 2); add('veil', new THREE.Mesh(vg, M.veil), 40); }
        const U = buildUnder(st, links); if (U) { if (U.fl) add('uF', new THREE.Mesh(U.fl, M.xray), 41); if (U.so) add('uS', new THREE.Mesh(U.so, M.xray), 42); if (U.ho) add('uH', new THREE.Mesh(U.ho, M.xray), 43); if (U.ri) add('uR', new THREE.Mesh(U.ri, M.rib), 44); mi = mi.concat(U.mi); }
      }
      if (V.on && mi.length) add('iM', new THREE.Points(ptsGeo(mi), M.iMiss), 49);
      if (V.on && !xr) add('ring', new THREE.LineSegments(ringGeo(st), M.ring), 33);
    }
    if (V.veil) V.veil.position.set(V.cam ? V.cam.x : st.player.x, (V.cam ? gH(st, V.cam.x, V.cam.y, null) : 0) + .2, V.cam ? V.cam.y : st.player.y);
    // la riga che sale: l'altezza fatta di ogni pezzo in corso
    if (V.pS && V.ranges && P && performance.now() - (V.fillT || 0) > 200) { V.fillT = performance.now(); const A = V.pS.geometry.attributes.aFill; let ch = false; V.ranges.forEach(([pid, a, b, y0, h]) => { const it = byPid(st, pid), f = it && it.st === 'corso' ? y0 - .02 + (h + .04) * progress(st, it) : -99; if (A.array[a] !== f) { A.array.fill(f, a, b); ch = true; } }); if (ch) A.needsUpdate = true; }
    if (M.holo.userData.sh) M.holo.userData.sh.uniforms.uT.value = performance.now() / 1000;
    ghostSync(st);
  }
  // le caselle sotto il pennello dello scavo (1×1 o 3×3)
  const brushTiles = (t, n) => { const out = [], h = n === 3 ? 1 : 0; for (let j = -h; j <= h; j++) for (let i = -h; i <= h; i++) out.push([t[0] + i, t[1] + j]); return out; };
  // la sagoma dello strumento: il pezzo da posare (o la fila), il cerchio del pennello, le caselle dello scavo, la gomma
  function ghostSync(st) {
    const M = mats(); if (!V.on || !V.tool || !V.hover) { if (V.gh) V.gh.visible = false; V.why = ''; return; }
    const tl = V.tool, ht = tileOf(V.hover.x, V.hover.y), hq = tl === 'costruisci' && V.piece ? CN().snap(pieceB(V.piece), V.hover.x, V.hover.y, V.rot) : tl === 'scava' ? ht : [Math.round(V.hover.x * 4) / 4, Math.round(V.hover.y * 4) / 4];
    const key = JSON.stringify([tl, V.piece, V.rot, hq, V.row, V.r, V.layer, V.lv, V.brush, V.entrata, plan(st).rev]); if (key === V.ghostKey && V.gh) { V.gh.visible = true; return; } V.ghostKey = key;
    drop(V.gh); V.gh = null; const g = new THREE.Group(); g.renderOrder = 35; V.why = '';
    if (tl === 'costruisci' && V.piece) { const pts = V.row && V.row.length ? V.row : [[V.hover.x, V.hover.y]]; const G0 = geoOf(V.piece), b = pieceB(V.piece);
      pts.slice(0, 60).forEach(([x, y]) => { const [sx, sy] = CN().snap(b, x, y, V.rot), it = { pid: '_g', k: 'pezzo', id: V.piece, x: sx, y: sy, rot: V.rot, lv: V.layer === 'su' ? null : 'ug' }, c = checkPiece(st, it), ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(G0.pos, 3)); const m = new THREE.Mesh(ge, c.why ? M.ghostNo : M.ghost); m.position.set(sx, gH(st, sx, sy, it.lv) + .02, sy); m.rotation.y = -V.rot; m.renderOrder = 48; g.add(m); V.why = c.why ? '✗ ' + c.why : (c.soft || ''); }); }
    const circle = (r, mat) => { const pts = [], n = 40; for (let i = 0; i <= n; i++) { const a = i / n * 6.283, x = V.hover.x + Math.cos(a) * r, z = V.hover.y + Math.sin(a) * r; pts.push(new THREE.Vector3(x, gH(st, x, z, null) + .15, z)); } const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); l.renderOrder = 48; g.add(l); };
    if (tl === 'terreno' && V.layer === 'su') { circle(V.r, M.ring); const c = new THREE.Mesh(M.pin, M.ghost); c.position.set(V.hover.x, gH(st, V.hover.x, V.hover.y, null) + .8, V.hover.y); g.add(c); }
    if (tl === 'togli' && V.layer === 'su') circle(Math.min(V.r, 3), M.ring);
    if (tl === 'scava' || (tl === 'togli' && V.layer !== 'su')) { const tiles = brushTiles(ht, V.brush); let bad = '';
      tiles.forEach(([tx, ty]) => { const f = levelF(st, V.lv, tx, ty), w = tl === 'scava' ? cellWhy(st, tx, ty, f, V.entrata) : '', c = cellsOf(st)[ck(tx, ty)]; if (w && !(c && c.lv === V.lv)) bad = bad || w; const m = new THREE.Mesh(M.digBox, (w && !(c && c.lv === V.lv)) || tl === 'togli' ? M.digNo : M.digOk); m.position.set((tx + .5) * TS(), (tl === 'togli' && c ? c.f : f) + 1.15, (ty + .5) * TS()); if (V.entrata) m.scale.set(.5, 1, .5); m.renderOrder = 48; g.add(m); });
      if (bad) V.why = '✗ ' + bad; }
    V.gh = g; V.grp.add(g);
  }

  // =====================================================================================================================
  // IL PANNELLO: in basso cinque bottoni, sopra le opzioni dello strumento (solo quelle), in alto Sopra/Sotto e la distinta chiusa
  // =====================================================================================================================
  const SVG = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC = {
    costruisci: SVG('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>'),
    scava: SVG('<path d="M5 20 15.5 9.5"/><path d="M10.5 5.5c3.8-2.4 8-1.3 10 2.6-3-.9-5.8 0-8 2.1"/>'),
    terreno: SVG('<path d="M2 19.5h20"/><path d="M3 19.5l6-8.5 4 5 3-3.5 5 7"/>'),
    togli: SVG('<path d="M4 20h16"/><path d="M8.5 16.5 16 9l3 3-6 6H9z"/><path d="M12.5 12.5l3 3"/>'),
    fatto: SVG('<path d="M4.5 12.5l5 5 10-11"/>'),
    undo: SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    su: SVG('<path d="M3 17l6-8 4 5 3-3 5 6z"/>'), giu: SVG('<path d="M3 6h18"/><path d="M6 6v12h12V6"/><path d="M10 12h4"/>'),
    list: SVG('<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.5M4 12h.5M4 18h.5"/>'), x: SVG('<path d="M6 6l12 12M18 6 6 18"/>'),
    rot: SVG('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v5h-5"/>'), up: SVG('<path d="M6 15l6-6 6 6"/>'), dn: SVG('<path d="M6 9l6 6 6-6"/>'),
    entrata: SVG('<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M9 8h6M9 12h6M9 16h6"/>'), cambia: SVG('<path d="M4 7h16M4 12h16M4 17h10"/>'),
  };
  const CSS = `
#pg { position: absolute; inset: 0; z-index: 41; pointer-events: none; display: none; font-family: 'Instrument Sans', system-ui, sans-serif; color: #E9DCBC; }
#pg.on { display: block; } body.pg-on #cnBtn, body.pg-on #rs-here, body.pg-on #me-box, body.pg-on #ts-hint, body.pg-on #or-obj, body.pg-on #or-pbtn, body.pg-on #dock { display: none !important; } body.pg-on #app > .layer > .hud { visibility: hidden; }
#pg .bx { pointer-events: auto; background: rgba(15,27,25,.9); box-shadow: 0 0 0 1px #3A5A50; border-radius: 16px; }
#pg button { cursor: pointer; font: 600 12px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .1em; text-transform: uppercase; color: rgba(233,220,188,.88); background: none; border: 1px solid rgba(233,220,188,.2); border-radius: 11px; padding: 6px 10px; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
#pg button svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto; }
#pg button.on { color: #16121B; background: #A3D4D8; border-color: #A3D4D8; } #pg button:disabled { opacity: .35; cursor: default; }
#pg .dock { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: calc(100% - 20px); }
#pg .bar { display: flex; gap: 4px; padding: 5px; }
#pg .bar button { width: 86px; height: 58px; flex-direction: column; justify-content: center; gap: 3px; border: 0; border-radius: 12px; font-size: 12px; }
#pg .bar button svg { width: 26px; height: 26px; } #pg .bar .fatto { color: #A3D4D8; } #pg .bar .fatto.pieno { background: rgba(163,212,216,.16); }
#pg .ctx { padding: 6px; display: flex; flex-direction: column; gap: 6px; max-width: 100%; }
#pg .r { display: flex; gap: 6px; align-items: center; overflow-x: auto; scrollbar-width: none; } #pg .r::-webkit-scrollbar { display: none; }
#pg .r .sep { flex: 0 0 1px; align-self: stretch; background: rgba(233,220,188,.18); margin: 0 2px; }
#pg .r .lab { font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: rgba(233,220,188,.6); white-space: nowrap; }
#pg .lvl { font: 400 19px 'Instrument Serif', Georgia, serif; min-width: 92px; text-align: center; white-space: nowrap; } #pg .lvl small { display: block; font: 11px 'Instrument Sans', sans-serif; color: rgba(233,220,188,.6); margin-top: -2px; }
#pg .card { flex: 0 0 auto; width: 74px; border-radius: 11px; padding: 3px 3px 5px; cursor: pointer; background: rgba(15,27,25,.6); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); display: grid; justify-items: center; gap: 1px; position: relative; }
#pg .card.on { box-shadow: 0 0 0 2px #A3D4D8; } #pg .card canvas { width: 46px; height: 46px; } #pg .card b { font: 400 13px/1.1 'Instrument Serif', Georgia, serif; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } #pg .card i { position: absolute; right: 5px; top: 5px; width: 8px; height: 8px; border-radius: 4px; background: #E8A33A; }
#pg .pill { display: flex; align-items: center; gap: 8px; } #pg .pill canvas { width: 36px; height: 36px; } #pg .pill b { font: 400 17px 'Instrument Serif', Georgia, serif; white-space: nowrap; }
#pg input[type=range] { width: 130px; accent-color: #A3D4D8; }
#pg .msg { pointer-events: none; padding: 3px 11px; border-radius: 10px; background: rgba(15,27,25,.82); font: italic 15px 'Instrument Serif', Georgia, serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; } #pg .msg.no { color: #FF7FB5; } #pg .msg:empty { display: none; }
#pg .tl { position: absolute; left: 10px; top: 10px; display: flex; gap: 4px; padding: 4px; } #pg .tl button { border: 0; }
#pg .tr { position: absolute; right: 10px; top: 10px; padding: 4px; } #pg .tr > button { border: 0; } #pg .tr .dot { width: 9px; height: 9px; border-radius: 5px; background: #E8A33A; display: inline-block; }
#pg .tr.open { width: 270px; max-height: calc(100% - 170px); overflow: auto; padding: 6px 10px 10px; }
#pg .tr h4 { margin: 8px 0 3px; font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #A3D4D8; }
#pg .tr .row { display: grid; grid-template-columns: 1fr auto; gap: 6px; font-size: 12.5px; padding: 2px 0; } #pg .tr .n { color: #FFB86A; } #pg .tr .y { color: #9FC48A; }
#pg .tr .sum { font-size: 12.5px; color: rgba(233,220,188,.8); margin: 4px 0; line-height: 1.4; }
#pg .leg { display: grid; gap: 3px; font-size: 11.5px; color: rgba(233,220,188,.8); margin-top: 6px; } #pg .leg i { display: inline-block; width: 18px; height: 4px; border-radius: 2px; margin-right: 6px; vertical-align: 2px; }
#pg .go { margin-top: 8px; width: 100%; justify-content: center; background: #A3D4D8; color: #16121B; border-color: #A3D4D8; } #pg .go.pausa { background: #E8A33A; border-color: #E8A33A; }
@media (max-width: 760px) {
  #pg .dock { left: 6px; right: 6px; bottom: 6px; transform: none; max-width: none; align-items: stretch; gap: 5px; }
  #pg .bar { justify-content: space-between; gap: 2px; padding: 4px; } #pg .bar button { flex: 1; width: auto; height: 50px; font-size: 10.5px; letter-spacing: .06em; padding: 0; } #pg .bar button svg { width: 23px; height: 23px; }
  #pg .ctx { padding: 5px; } #pg .card { width: 64px; } #pg .card canvas { width: 40px; height: 40px; } #pg .card b { font-size: 12px; }
  #pg .msg { align-self: center; font-size: 14px; }
  #pg .tl { left: 6px; top: 6px; } #pg .tl button span { display: none; } #pg .tl button { padding: 6px 8px; }
  #pg .tr { right: 6px; top: 6px; } #pg .tr.open { left: 6px; width: auto; max-height: calc(100% - 210px); }
  #pg input[type=range] { width: 96px; } #pg button { padding: 6px 8px; } #pg .lvl { min-width: 70px; font-size: 17px; }
}`;
  function $(id) { return document.getElementById(id); }
  function mount() {
    if ($('pg')) return true; const app = $('app'); if (!app) return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'pg'; app.appendChild(m); m.addEventListener('input', onUi);
    // [progetto] il pannello si ridisegna spesso: un clic (giù e su sullo stesso elemento) si perderebbe. Si prende il tasto giù e lo si
    // conferma al rilascio sullo stesso comando (stesso data-a e data-x), se il dito non ha fatto scorrere le carte
    m.addEventListener('pointerdown', e => { const t = e.target.closest('[data-a]'); if (!t || t.tagName === 'INPUT') { V.pd = null; return; } V.pd = { a: t.dataset.a, x: t.dataset.x, cx: e.clientX, cy: e.clientY }; V.hold = true; });
    addEventListener('pointerup', e => { const q = V.pd; V.pd = null; V.hold = false; if (!q) return; if (Math.hypot(e.clientX - q.cx, e.clientY - q.cy) > 12) return; const el = document.elementFromPoint(e.clientX, e.clientY), t = el && el.closest && el.closest('#pg [data-a]'); if (t && (t.dataset.a !== q.a || t.dataset.x !== q.x)) return; onUi({ type: 'click', target: { closest: () => ({ dataset: { a: q.a, x: q.x } }) } }); }, true);
    return true;
  }
  const phone = () => !!(PV() && PV().touchMode) || (typeof innerWidth !== 'undefined' && innerWidth < 760);
  function say(r) { if (!r || !r.msg) return; V.msg = r.msg; V.msgOk = r.ok !== false; V.msgT = Date.now(); V.html = ''; }
  const mm = m => m >= 90 ? `${Math.round(m / 6) / 10} h` : `${Math.round(m)} min`;
  const thumb = id => `<canvas data-th="${id}" width="96" height="96"></canvas>`;
  const btn = (a, x, inner, on, extra) => `<button class="${on ? 'on' : ''}" data-a="${a}"${x !== undefined && x !== null ? ` data-x="${x}"` : ''}${extra || ''}>${inner}</button>`;
  function panel(st) {
    if (!mount()) return; const m = $('pg'); document.body.classList.toggle('pg-on', V.on); m.className = V.on ? 'on' : '';
    if (!V.on) { if (m.innerHTML) m.innerHTML = ''; V.html = ''; return; }
    const P = plan(st), su = V.layer === 'su', c0 = V.cam || st.player, C = CN().covoOf(st, c0.x, c0.y, su ? null : 'ug'), B = bom(st), ph = phone();
    // in alto a sinistra: Sopra / Sotto, annulla
    const tl = `<div class="tl bx">${btn('layer', 'su', IC.su + '<span>Sopra</span>', su)}${btn('layer', 'giu', IC.giu + '<span>Sotto</span>', !su)}${btn('undo', null, IC.undo, false, H.undo.length ? ' title="Annulla"' : ' disabled')}</div>`;
    // in alto a destra: la distinta (chiusa: quanti lavori e un pallino se manca qualcosa)
    const nMiss = B.miss.length + B.tools.filter(t => !t.ok).length;
    let tr = `<div class="tr bx">${btn('dist', null, `${IC.list}<span>${B.n} ${B.n === 1 ? 'lavoro' : 'lavori'}</span>${nMiss ? '<i class="dot"></i>' : ''}`)}</div>`;
    if (V.dist) tr = `<div class="tr bx open">${btn('dist', null, `${IC.list}<span>Distinta</span>${IC.x}`)}<div class="sum">${B.n ? `${B.n} lavori · circa ${mm(B.mins / Math.max(1, B.crew))} ${B.crew ? `con ${B.crew} della banda` : 'da solo'}${B.cut + B.fill > .05 ? `<br>terra: ${B.cut.toFixed(1)} m³ via, ${B.fill.toFixed(1)} m³ da portare` : ''}` : 'Il progetto è vuoto.'}</div>`
      + `${B.rows.length ? '<h4>Roba</h4>' + B.rows.map(r => `<div class="row"><span>${esc(r.nome)}</span><span class="${r.miss ? 'n' : 'y'}">${Math.min(r.have, r.need)}/${r.need}${r.miss ? ` · manca ${r.miss}` : ''}</span></div>`).join('') : ''}`
      + `${B.tools.length ? '<h4>Attrezzi</h4>' + B.tools.map(t => `<div class="row"><span>${esc(t.nome)}</span><span class="${t.ok ? 'y' : 'n'}">${t.ok ? 'ce l\'hai' : 'manca'}</span></div>`).join('') : ''}`
      + `<div class="leg"><span><i style="background:${COL.holo}"></i>in progetto</span><span><i style="background:${COL.manca}"></i>manca qualcosa (roba, collegamento)</span><span><i style="background:${COL.corso}"></i>in corso: si riempie</span></div>`
      + `${B.n ? `<button class="go ${P.go ? 'pausa' : ''}" data-a="go">${P.go ? 'Pausa' : 'Avvia i lavori'}</button>` : ''}${!B.crew && B.n ? '<div class="sum">Senza banda: avvia, esci e tocca l\'ologramma in corso per lavorarci tu.</div>' : ''}</div>`;
    // le opzioni dello strumento
    const rows = [];
    if (su && !C) rows.push(`<div class="r"><span class="lab">Qui non hai un campo</span><button data-a="reclama">Pianta qui il campo</button></div>`);
    if (V.tool === 'costruisci') {
      const sp = V.sel && byPid(st, V.sel);
      if (sp && !V.piece) rows.push(`<div class="r pill">${sp.k === 'pezzo' ? thumb(sp.id) : ''}<b>${esc(labelOf(sp))}</b>${sp.k === 'pezzo' && sp.st !== 'corso' && !sp.paid ? btn('gira', null, IC.rot) : ''}${btn('togli1', null, IC.togli)}${btn('desel', null, IC.x)}</div>`);
      else if (V.piece && !V.pick) { const b = pieceB(V.piece); rows.push(`<div class="r pill">${thumb(V.piece)}<b>${esc(b.nome)}</b>${btn('ruota', null, IC.rot)}${btn('pick', null, IC.cambia + (ph ? '' : 'Cambia'))}</div>`); }
      else {
        const cats = su ? PCATS : [['arredi', 'Arredi'], ['postazioni', 'Postazioni']]; if (!cats.some(q => q[0] === V.cat)) V.cat = cats[0][0];
        rows.push(`<div class="r">${cats.map(([k, l]) => btn('cat', k, l, V.cat === k)).join('')}</div>`);
        rows.push(`<div class="r">${CN().B.filter(b => b.cat === V.cat && inPlan(b) && (su || !b.out)).map(b => `<div class="card ${V.piece === b.id ? 'on' : ''}" data-a="piece" data-x="${b.id}" title="${esc(b.desc || b.nome)}">${thumb(b.id)}<b>${esc(b.nome)}</b>${CN().missing(st, b).length ? '<i></i>' : ''}</div>`).join('')}</div>`);
      }
    } else if (V.tool === 'scava') {
      const f = levelF(st, V.lv, ...tileOf(c0.x, c0.y)), dep = baseH(st, ...tileOf(c0.x, c0.y)) - f, sr = V.selRoom && cellsOf(st)[V.selRoom], rfNow = sr ? sr.rf || 'legno' : V.rf;
      rows.push(`<div class="r">${btn('lvup', null, IC.up, false, V.lv > 1 ? '' : ' disabled')}<span class="lvl">Livello −${V.lv}<small>${dep.toFixed(1).replace('.', ',')} m sotto</small></span>${btn('lvdn', null, IC.dn, false, V.lv < MAXLV ? '' : ' disabled')}<span class="sep"></span>${btn('brush', 1, '1×1', V.brush === 1)}${btn('brush', 3, '3×3', V.brush === 3)}<span class="sep"></span>${btn('entrata', null, IC.entrata + (ph ? '' : 'Entrata'), V.entrata)}</div>`);
      rows.push(`<div class="r"><span class="lab">${sr ? `Stanza · ${roomKeys(st, V.selRoom).length} caselle` : 'Rinforzo'}</span>${Object.entries(RF).map(([k, q]) => btn('rf', k, q.nome, rfNow === k)).join('')}${sr ? btn('desel', null, IC.x) : ''}</div>`);
    } else if (V.tool === 'terreno') {
      rows.push(`<div class="r">${TERRA.map(([k, l]) => btn('op', k, l, V.op === k)).join('')}<span class="sep"></span><span class="lab">${V.r.toFixed(0)} m</span><input type="range" min="1" max="8" step="1" value="${V.r}" data-a="r"></div>`);
    } else if (V.tool === 'togli') rows.push(`<div class="r"><span class="lab">Tocca o trascina su quello da togliere${su ? '' : ' (sotto: le caselle e gli arredi)'}</span></div>`);
    const why = V.tool && V.why ? V.why : (V.msg && Date.now() - V.msgT < 4500 ? (V.msgOk ? '' : '✗ ') + V.msg : '');
    const msg = `<div class="msg ${/^✗/.test(why) ? 'no' : ''}">${esc(why.replace(/^✗ /, ''))}</div>`;
    const bar = `<div class="bar bx">${[['costruisci', 'Costruisci'], ['scava', 'Scava'], ['terreno', 'Terreno'], ['togli', 'Togli']].map(([k, l]) => btn('tool', k, IC[k] + l, V.tool === k)).join('')}<button class="fatto ${B.n ? 'pieno' : ''}" data-a="fatto">${IC.fatto}Fatto</button></div>`;
    const html = `${tl}${tr}<div class="dock">${msg}${rows.length ? `<div class="ctx bx">${rows.join('')}</div>` : ''}${bar}</div>`;
    if (html !== V.html && !V.hold) { const sc = [...m.querySelectorAll('.r')].map(e => e.scrollLeft), sd = m.querySelector('.tr'), ss = sd ? sd.scrollTop : 0; m.innerHTML = html; V.html = html; [...m.querySelectorAll('.r')].forEach((e, i) => { if (sc[i]) e.scrollLeft = sc[i]; }); const s2 = m.querySelector('.tr'); if (s2) s2.scrollTop = ss;
      m.querySelectorAll('canvas[data-th]').forEach(c => { const b = pieceB(c.dataset.th); if (!b || typeof MenuUI === 'undefined' || !MenuUI.thumbFor) return; const t = MenuUI.thumbFor('covo:' + b.id, () => CN().model(b, 7)); if (t) c.getContext('2d').drawImage(t, 0, 0, 128, 128, 0, 0, 96, 96); }); }
  }
  function setTool(t) {
    V.tool = V.tool === t ? null : t; V.row = null; V.sel = null; V.selRoom = null; V.entrata = false;
    if (V.tool === 'scava') V.layer = 'giu'; if (V.tool === 'terreno') V.layer = 'su'; if (V.tool === 'costruisci') { V.pick = !V.piece; }
  }
  function onUi(e) {
    const st = PV() && PV().st; if (!st) return; const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a, x = t.dataset.x;
    if (e.type === 'input') { if (a === 'r') V.r = +t.value; V.html = ''; return; }
    if (a === 'tool') setTool(x);
    if (a === 'layer') { V.layer = x; V.sel = null; V.selRoom = null; if (x === 'su' && V.tool === 'scava') V.tool = null; if (x !== 'su' && V.tool === 'terreno') V.tool = null; if (V.piece && x !== 'su' && pieceB(V.piece).out) V.piece = null; }
    if (a === 'cat') V.cat = x;
    if (a === 'piece') { V.piece = x; V.pick = false; V.sel = null; V.rot = 0; }
    if (a === 'pick') V.pick = true;
    if (a === 'ruota') V.rot += pieceB(V.piece) && pieceB(V.piece).fp ? Math.PI / 2 : Math.PI / 4;
    if (a === 'gira' && V.sel) say(rotateItem(st, V.sel, 1));
    if (a === 'togli1' && V.sel) { say(removeItem(st, V.sel)); V.sel = null; }
    if (a === 'desel') { V.sel = null; V.selRoom = null; }
    if (a === 'lvup') { V.lv = Math.max(1, V.lv - 1); V.selRoom = null; }
    if (a === 'lvdn') { V.lv = Math.min(MAXLV, V.lv + 1); V.selRoom = null; }
    if (a === 'brush') V.brush = +x;
    if (a === 'entrata') V.entrata = !V.entrata;
    if (a === 'rf') { if (V.selRoom && cellsOf(st)[V.selRoom]) say(setRoomRf(st, V.selRoom, x)); else V.rf = x; }
    if (a === 'op') V.op = x;
    if (a === 'dist') V.dist = !V.dist;
    if (a === 'go') say(go(st));
    if (a === 'undo') say(undo(st));
    if (a === 'redo') say(redo(st));
    if (a === 'reclama') say({ ok: true, msg: CN().claim(st) });
    if (a === 'fatto') fatto(st);
    V.html = ''; V.ghostKey = ''; panel(st);
  }
  // Fatto: i lavori partono (se c'è qualcosa) e si esce dalla vista
  function fatto(st) { const n = queue(st).length; toggle(false); if (n) { const r = go(st, true); Gm().feed(st, r.msg, 'info'); } }

  // =====================================================================================================================
  // ENTRARE, USCIRE, LA CAMERA, LE MANI
  // =====================================================================================================================
  function toggle(on) {
    const pv = PV(), st = pv && pv.st; if (!st) return; const was = V.on; V.on = on === undefined ? !V.on : !!on; if (was === V.on) return;
    const ui = pv.ui;
    if (V.on) { if (CN().active && CN().state.on) CN().toggle(false); V.cam = { x: st.player.x, y: st.player.y }; V.zoom0 = ui.zoom; V.top0 = ui.top; ui.zoom = clamp(ui.zoom || .7, .55, .85); ui.top = V.top; V.layer = st.player.lv && st.player.lv.k === 'ug' ? 'giu' : 'su'; V.tool = null; V.sel = null; V.selRoom = null; V.dist = false; if (typeof MenuUI !== 'undefined' && MenuUI.state && MenuUI.state.open) MenuUI.close(); say({ ok: true, msg: 'Il progetto: scegli uno strumento qui sotto.' }); }
    else { ui.top = V.top0; if (V.zoom0) ui.zoom = V.zoom0; V.tool = null; V.sel = null; V.selRoom = null; V.row = null; V.hover = null; }
    V.html = ''; panel(st);
  }
  const focus = () => V.on && V.cam ? V.cam : null;
  // il punto del suolo sotto il puntatore: il raggio della camera contro il terreno vero (tre passi sul piano alla quota trovata);
  // sotto, contro il piano del pavimento del livello scelto
  let RAY = null;
  function screenGround(nx, ny) {
    const r = R(), st = PV().st, cam = r && ((r.__ed && r.__ed.camera) || r.camera); if (!r || !cam) return r && r.screenToGround ? r.screenToGround(nx, ny) : null;
    if (!RAY) RAY = { rc: new THREE.Raycaster(), pl: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v: new THREE.Vector3(), n: new THREE.Vector2() };
    const u = r.gonfia ? r.gonfia(nx, ny) : [nx, ny]; RAY.n.set(u[0] * 2 - 1, 1 - u[1] * 2); RAY.rc.setFromCamera(RAY.n, cam);
    const c0 = V.cam || st.player; let h = V.layer !== 'su' ? levelF(st, V.lv, ...tileOf(c0.x, c0.y)) : gH(st, c0.x, c0.y, null);
    for (let k = 0; k < 4; k++) { RAY.pl.constant = -h; if (!RAY.rc.ray.intersectPlane(RAY.pl, RAY.v)) return null; if (V.layer !== 'su') break; const h2 = gH(st, RAY.v.x, RAY.v.z, null); if (Math.abs(h2 - h) < .05) break; h = h2; }
    return { x: RAY.v.x, y: RAY.v.z };
  }
  // i gesti: P = { id, x, y, nx, ny, moved, btn, start }
  const PT = { list: new Map(), pan: null, rot: null, last: null, two: null };
  function pdown(e) {
    if (!V.on) return; const cv = e.currentTarget, r0 = cv.getBoundingClientRect(), nx = (e.clientX - r0.left) / r0.width, ny = (e.clientY - r0.top) / r0.height, st = PV().st;
    e.stopImmediatePropagation(); e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
    PT.list.set(e.pointerId, { x: e.clientX, y: e.clientY, nx, ny, sx: e.clientX, sy: e.clientY, btn: e.button, type: e.pointerType, moved: false });
    if (PT.list.size === 2) { PT.two = twoOf(); V.row = null; PT.act = null; return; }
    if (e.button === 2) { PT.act = { k: 'giro' }; return; }
    if (e.button === 1) { PT.act = { k: 'pan' }; return; }
    V.hover = screenGround(nx, ny); if (!V.hover) { PT.act = { k: 'pan' }; return; } const tl = V.tool;
    if (!tl || (tl === 'costruisci' && !V.piece)) { const it = pickItem(st, V.hover); if (tl === 'costruisci' || it) { V.sel = it ? it.pid : null; } if (it && !tl) V.tool = 'costruisci'; V.html = ''; PT.act = it && it.k === 'pezzo' && it.st !== 'corso' && !it.paid ? { k: 'trascina', pid: it.pid, gx: V.hover.x, gy: V.hover.y, x0: it.x, y0: it.y, rem: false } : { k: 'pan' }; return; }
    if (tl === 'costruisci') { const b = pieceB(V.piece); PT.act = { k: 'fila', a: V.hover, one: !!(b.fp && b.fp[0] === 1 && b.fp[1] === 1) || !b.fp }; V.row = [[V.hover.x, V.hover.y]]; return; }
    if (tl === 'terreno') { if (V.layer !== 'su') { PT.act = { k: 'pan' }; return; } remember(st); PT.act = { k: 'pennello', h0: gH(st, V.hover.x, V.hover.y, null), last: null }; brush(st, V.hover); return; }
    if (tl === 'scava') { const t = tileOf(V.hover.x, V.hover.y), c = cellsOf(st)[ck(...t)]; if (c && c.lv === V.lv && !V.entrata) { PT.act = { k: 'scegli', t }; return; } remember(st); PT.act = { k: 'dipingi', last: t, n: 0, why: '' }; paintAt(st, t); return; }
    if (tl === 'togli') { remember(st); PT.act = { k: 'togli', n: 0, last: null }; eraseAt(st, V.hover); return; }
  }
  function twoOf() { const [a, b] = [...PT.list.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; }
  function pmove(e) {
    if (!V.on) return; const cv = e.currentTarget, r0 = cv.getBoundingClientRect(), nx = (e.clientX - r0.left) / r0.width, ny = (e.clientY - r0.top) / r0.height, st = PV().st, ui = PV().ui;
    const q = PT.list.get(e.pointerId); if (q) { e.stopImmediatePropagation(); const dx = e.clientX - q.x, dy = e.clientY - q.y; q.x = e.clientX; q.y = e.clientY; if (Math.hypot(q.x - q.sx, q.y - q.sy) > 8) q.moved = true;
      if (PT.list.size === 2 && PT.two) { const n = twoOf(); ui.zoom = clamp((ui.zoom || 1) * PT.two.d / Math.max(20, n.d), .35, 2.6); let da = n.ang - PT.two.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI; ui.drag = (ui.drag || 0) + da; panBy(n.mx - PT.two.mx, n.my - PT.two.my, r0); PT.two = n; return; }
      const A = PT.act; if (A && A.k === 'giro') { ui.drag = (ui.drag || 0) + dx * .008; return; }
      if (A && A.k === 'pan') { if (q.moved) panBy(dx, dy, r0); return; } }
    if (e.pointerType === 'mouse' || q) V.hover = screenGround(nx, ny);
    const A = PT.act; if (!A || !V.hover) return;
    if (A.k === 'trascina') { A.rem = true; const it = byPid(st, A.pid); if (it) { const b = pieceB(it.id), [sx, sy] = CN().snap(b, A.x0 + V.hover.x - A.gx, A.y0 + V.hover.y - A.gy, it.rot); if (Math.abs(sx - it.x) > .01 || Math.abs(sy - it.y) > .01) { const c = checkPiece(st, Object.assign({}, it, { x: sx, y: sy }), it.pid); if (!c.why) { if (!A.saved) { remember(st); A.saved = true; } it.x = sx; it.y = sy; touch(st); } } } return; }
    if (A.k === 'fila' && A.one) { V.row = lineTiles(tileOf(A.a.x, A.a.y), tileOf(V.hover.x, V.hover.y)).map(([tx, ty]) => [(tx + .5) * TS(), (ty + .5) * TS()]); return; }
    if (A.k === 'fila') { V.row = [[V.hover.x, V.hover.y]]; return; }
    if (A.k === 'pennello') { brush(st, V.hover); return; }
    if (A.k === 'scegli' && q && q.moved) { remember(st); Object.assign(A, { k: 'dipingi', last: A.t, n: 0, why: '' }); paintAt(st, A.t); }
    if (A.k === 'dipingi') { const t = tileOf(V.hover.x, V.hover.y); if (t[0] !== A.last[0] || t[1] !== A.last[1]) { stepTiles(A.last, t).forEach(s => paintAt(st, s)); A.last = t; } return; }
    if (A.k === 'togli') { eraseAt(st, V.hover); return; }
  }
  function pup(e) {
    if (!V.on) return; const q = PT.list.get(e.pointerId); if (!q) return; e.stopImmediatePropagation(); PT.list.delete(e.pointerId); const st = PV().st;
    if (PT.list.size) { PT.two = null; if (PT.list.size === 1) PT.act = { k: 'pan' }; return; } if (PT.two) { PT.two = null; PT.act = null; return; }
    const A = PT.act; PT.act = null; if (!A) return;
    if (A.k === 'fila') { const pts = V.row && V.row.length ? V.row : [[A.a.x, A.a.y]];
      remember(st); let n = 0, last = null; pts.forEach(([x, y]) => { const r = addPiece(st, V.piece, x, y, V.rot, V.layer === 'su' ? null : 'ug', true); if (r.ok) n++; last = r; }); if (!n) H.undo.pop(); say(n > 1 ? { ok: true, msg: `${pieceB(V.piece).nome}: ${n} nel progetto.` } : last);
      V.row = null; V.html = ''; return; }
    if (A.k === 'pennello') { const v = volOf(st); say({ ok: true, msg: `Terra: ${v.cut.toFixed(1)} m³ via, ${v.fill.toFixed(1)} m³ da portare.` }); return; }
    if (A.k === 'scegli') { const k = ck(...A.t); V.selRoom = V.selRoom && roomKeys(st, V.selRoom).includes(k) ? null : k; V.html = ''; return; }
    if (A.k === 'dipingi') { if (!A.n) { H.undo.pop(); say({ ok: false, msg: A.why || 'Qui non si scava.' }); } else { if (V.entrata) V.entrata = false; say({ ok: true, msg: `Scavo: ${Object.keys(cellsOf(st)).filter(k => !cellsOf(st)[k].s).length} caselle nel progetto.` }); } V.html = ''; return; }
    if (A.k === 'togli') { if (!A.n) H.undo.pop(); else say({ ok: true, msg: 'Tolto dal progetto.' }); V.html = ''; return; }
    if (A.k === 'trascina' && A.rem) say({ ok: true, msg: 'Spostato nel progetto.' });
  }
  function paintAt(st, t) { const A = PT.act, r = paintCells(st, brushTiles(t, V.entrata ? 1 : V.brush), V.lv, { rf: V.rf, e: V.entrata }); if (r.n) A.n += r.n; else if (!A.why) A.why = r.msg; }
  function eraseAt(st, g) {
    const A = PT.act, su = V.layer === 'su', it = pickItem(st, g, true); if (it && it.k === 'pezzo') { removeItem(st, it.pid, true); A.n++; return; }
    if (su) { if (A.last && Math.hypot(g.x - A.last.x, g.y - A.last.y) < .8) return; A.last = { x: g.x, y: g.y }; A.n += sculpt(st, 'ripristina', g.x, g.y, Math.min(V.r, 3), 0); return; }
    A.n += eraseCells(st, brushTiles(tileOf(g.x, g.y), V.brush));
  }
  function brush(st, g) { const A = PT.act; if (A.last && Math.hypot(g.x - A.last.x, g.y - A.last.y) < Math.max(.6, V.r * .35)) return; A.last = { x: g.x, y: g.y }; sculpt(st, V.op, g.x, g.y, V.r, V.s, A.h0); }
  function lineTiles(a, b) { const out = []; let [x0, y0] = a; const [x1, y1] = b, dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0); if (dx >= dy) { const s = Math.sign(x1 - x0) || 1; for (let i = 0; i <= dx; i++) out.push([x0 + i * s, y0]); } else { const s = Math.sign(y1 - y0) || 1; for (let i = 0; i <= dy; i++) out.push([x0, y0 + i * s]); } return out; }   // in fila dritta, come i muri
  function stepTiles(a, b) { const out = []; let [x, y] = a; while (x !== b[0] || y !== b[1]) { if (Math.abs(b[0] - x) >= Math.abs(b[1] - y)) x += Math.sign(b[0] - x); else y += Math.sign(b[1] - y); out.push([x, y]); } return out; }   // il pennello che corre: caselle attaccate per lato (niente buchi in diagonale)
  function panBy(dx, dy, r0) { const r = R(), yaw = r && r.cam && r.cam.yaw !== undefined ? r.cam.yaw : 0, k = (PV().ui.zoom || 1) * 60 / Math.max(300, r0.height); const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw); V.cam.x -= (dx * rx - dy * fx) * k; V.cam.y -= (dx * rz - dy * fz) * k; clampCam(); }
  function clampCam() { const st = PV().st, p = st.player, d = Math.hypot(V.cam.x - p.x, V.cam.y - p.y), M0 = 90; if (d > M0) { V.cam.x = p.x + (V.cam.x - p.x) / d * M0; V.cam.y = p.y + (V.cam.y - p.y) / d * M0; } }
  function pickItem(st, g, pezzi) { if (!g) return null; const lv = V.layer === 'su' ? null : 'ug'; let best = null, bd = 1.2; items(st).forEach(it => { if (it.k !== 'pezzo' || (it.lv || null) !== lv) return; const d = Math.hypot(it.x - g.x, it.y - g.y) - siteR(it) * .8; if (d < bd) { bd = d; best = it; } }); return best; }
  function wheel(e) { if (!V.on) return; e.stopImmediatePropagation(); e.preventDefault(); const ui = PV().ui; if (V.tool === 'costruisci' && V.piece && (e.shiftKey || e.altKey)) { V.rot += (e.deltaY > 0 ? 1 : -1) * Math.PI / 2; return; } ui.zoom = clamp((ui.zoom || 1) * (e.deltaY > 0 ? 1.12 : 1 / 1.12), .35, 2.6); }
  const KEYS = {};
  function key(e) {
    const k = e.key.toLowerCase(), st = PV().st;
    if (!V.on) { if (k === 'y' && !e.repeat && wantVista(st)) { e.preventDefault(); e.stopImmediatePropagation(); toggle(true); return true; } return false; }
    if (e.type === 'keyup') { KEYS[k] = false; return true; }
    e.stopImmediatePropagation();
    if (/^[wasdqe]$|^arrow/.test(k)) { e.preventDefault(); KEYS[k] = true; return true; }
    if (k === 'y' && !e.repeat) { toggle(false); return true; }
    if (k === 'escape') { e.preventDefault(); if (V.tool || V.sel || V.selRoom) { V.tool = null; V.sel = null; V.selRoom = null; V.row = null; V.html = ''; } else toggle(false); return true; }
    if (/^[1-4]$/.test(k)) { setTool(['costruisci', 'scava', 'terreno', 'togli'][+k - 1]); V.html = ''; return true; }
    if (k === 'r') { e.preventDefault(); if (V.tool === 'costruisci' && V.piece) V.rot += (e.shiftKey ? -1 : 1) * (pieceB(V.piece).fp ? Math.PI / 2 : Math.PI / 4); else if (V.sel) say(rotateItem(st, V.sel, e.shiftKey ? -1 : 1)); return true; }
    if (k === 't') { V.top = !V.top; PV().ui.top = V.top; V.html = ''; return true; }
    if ((k === 'z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); say(e.shiftKey ? redo(st) : undo(st)); return true; }
    if ((k === 'y') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); say(redo(st)); return true; }
    if ((k === 'delete' || k === 'backspace') && V.sel) { e.preventDefault(); say(removeItem(st, V.sel)); V.sel = null; return true; }
    if (k === 'tab') { e.preventDefault(); onUi({ type: 'click', target: { closest: () => ({ dataset: { a: 'layer', x: V.layer === 'su' ? 'giu' : 'su' } }) } }); return true; }
    if (k === 'pageup' || k === '+') { V.lv = Math.max(1, V.lv - 1); V.html = ''; return true; }
    if (k === 'pagedown' || k === '-') { V.lv = Math.min(MAXLV, V.lv + 1); V.html = ''; return true; }
    if (k === 'enter') { e.preventDefault(); fatto(st); return true; }
    if (k === '[' || k === ']') { V.r = clamp(V.r + (k === ']' ? 1 : -1), 1, 8); V.html = ''; return true; }
    return true;
  }
  addEventListenerSafe();
  function addEventListenerSafe() { if (NODE || !ON) return; addEventListener('keyup', e => { if (V.on) { const k = e.key.toLowerCase(); KEYS[k] = false; } }, true); }
  // dove si apre la vista: fuori, in un campo o dove lo puoi piantare (non in città, non dentro casa, non sui mezzi), o sotto terra
  function wantVista(st) { const p = st.player; if (p.vehicle || p.indoor) return false; if (p.lv && p.lv.k !== 'ug') return false; if (!p.lv && CN().inCity(p.x, p.y) && !CN().covoAt(st, p.x, p.y)) return false; return true; }
  function camTick(dt) {
    if (!V.on) return; const ui = PV().ui; ui.top = V.top; const r = R(), yaw = r && r.cam && r.cam.yaw !== undefined ? r.cam.yaw : 0, sp = 18 * (ui.zoom || 1) * dt;
    const f = (KEYS.w || KEYS.arrowup ? 1 : 0) - (KEYS.s || KEYS.arrowdown ? 1 : 0), s = (KEYS.d || KEYS.arrowright ? 1 : 0) - (KEYS.a || KEYS.arrowleft ? 1 : 0);
    if (f || s) { V.cam.x += (-Math.sin(yaw) * f + Math.cos(yaw) * s) * sp; V.cam.y += (-Math.cos(yaw) * f - Math.sin(yaw) * s) * sp; clampCam(); }
    if (KEYS.q) ui.drag = (ui.drag || 0) - dt * 1.4; if (KEYS.e) ui.drag = (ui.drag || 0) + dt * 1.4;
  }
  // fuori dalla vista: il clic sull'ologramma in corso ti ci porta a lavorare
  function pickOut(st, nx, ny, o) {
    const P = st.covo && st.covo.plan; if (V.on || !P || st.player.vehicle) return null; const r = R(), lv = st.player.lv && st.player.lv.k === 'ug' ? 'ug' : null; let best = null, bd = Math.max(36, o.h * .06);
    P.items.forEach(it => { if (it.st !== 'corso' || it.k === 'scavo' || (it.lv || null) !== lv) return; const pr = r.project(it.x, 1, it.y); if (pr.behind) return; const d = Math.hypot((pr.x - nx) * o.w, (pr.y - ny) * o.h); if (d < bd) { bd = d; best = it; } });
    return best ? { kind: 'loot', via: 'covo', ref: 'P:' + best.pid, x: best.x, y: best.y, label: `Lavora: ${labelOf(best).toLowerCase()} (${Math.round(progress(st, best) * 100)}%)` } : null;
  }
  // =====================================================================================================================
  // L'AVVIO
  // =====================================================================================================================
  let LOOPT = 0;
  function loop(ts) {
    if (typeof PesoRitmo !== 'undefined' && PesoRitmo.giroSaltato && PesoRitmo.giroSaltato(ts)) { requestAnimationFrame(loop); return; }
    try { const st = PV() && PV().st; if (st) { const now = performance.now(), dt = Math.min(.1, (now - (LOOPT || now)) / 1000); LOOPT = now; camTick(dt); const t0 = performance.now(); sceneSync(st); V.cost = (V.cost || 0) * .95 + (performance.now() - t0) * .05; if (now - (V.pt || 0) > (V.on ? 160 : 400)) { V.pt = now; panel(st); } } } catch (e) { if (!V.err) { V.err = 1; console.error('[Progetto]', e); } }
    requestAnimationFrame(loop);
  }
  function init() {
    if (!window.__pv || !window.THREE || typeof Cantiere === 'undefined') { setTimeout(init, 300); return; }
    const C = Cantiere; C.EXT2.key = e => key(e); C.EXT2.button = () => { const st = PV().st; if (!wantVista(st)) return false; toggle(true); return true; };
    const a0 = C.active; C.active = () => V.on || a0();
    const p0 = C.pick, g0 = C.goal, f0 = C.find, r0 = C.arrive;
    C.pick = (st, nx, ny, o) => pickOut(st, nx, ny, o) || p0(st, nx, ny, o);
    const stand = (st, ref) => { const it = byPid(st, ref.slice(2)); if (!it) return null; if (!it._stand || it._standFor !== it.x + ',' + it.y) { const p = st.player, a = Math.atan2(p.y - it.y, p.x - it.x), r = siteR(it) + .7, G = Gm(); let q = null; for (let k = 0; k < 12 && !q; k++) { const b = a + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .5, x = it.x + Math.cos(b) * r, y = it.y + Math.sin(b) * r; if (G.walkM(x, y)) q = { x, y }; } it._stand = q || CN().standAt(it.x, it.y, r); it._standFor = it.x + ',' + it.y; } return it._stand; };   // il posto dove ci si mette a lavorare: dal lato da cui arrivi
    C.find = (st, ref) => /^P:/.test(ref) ? stand(st, ref) : f0(st, ref);
    C.goal = (st, ref) => /^P:/.test(ref) ? stand(st, ref) : g0(st, ref);
    C.arrive = (st, ref) => { if (!/^P:/.test(ref)) return r0(st, ref); const r = workHere(st, ref.slice(2)); Gm().feed(st, r.msg, r.ok ? 'info' : 'bad'); };
    const cv = document.getElementById('cv') || document.querySelector('#app canvas');
    if (cv) { cv.addEventListener('pointerdown', pdown, true); cv.addEventListener('pointermove', pmove, true); cv.addEventListener('pointerup', pup, true); cv.addEventListener('pointercancel', pup, true); cv.addEventListener('wheel', wheel, { capture: true, passive: false }); cv.addEventListener('contextmenu', e => { if (V.on) e.preventDefault(); }, true); }
    requestAnimationFrame(loop);
  }
  // la logica gira col motore (anche senza grafica): i lavori ogni secondo di gioco
  if (ON) {
    const R0 = typeof Risacca !== 'undefined' ? Risacca : null; if (R0 && R0.EXT && R0.EXT.do) R0.EXT.do.progLavoro = turnoDone;
    const G = typeof Game !== 'undefined' ? Game : null; if (G && G.HOOKS) { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!V.serr) { V.serr = 1; console.error('[Progetto] lavori', e); } } }; }
    if (!NODE) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0); }
  }
  return { ON, V, plan, items, addPiece, addDig, digRect, moveItem, rotateItem, removeItem, prio, undo, redo, sculpt, volOf, syncTerra, syncScavi, sync, bom, queue, stateOf, step, go, finish, progress, workHere, checkPiece, checkDig, digLinks, needOf, labelOf, toggle, focus, active: () => V.on, DIGS, DIG, TERRA, PCATS, turnoDone, cost: () => V.cost || 0,
    paintCells, eraseCells, setRoomRf, roomKeys, levelF, cellWhy, cells: cellsOf, RF, STEP, PROPN, RAW, digSteps, fatto, setTool };
})();
if (typeof module !== 'undefined') module.exports = Progetto;
