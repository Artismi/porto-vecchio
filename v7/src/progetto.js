/* Porto Vecchio — LA VISTA PROGETTUALE (?progetto). Il cantiere del covo pensato come un tavolo da disegno sopra la mappa vera.
   Y (o il bottone «Progetto» sul telefono): la camera sale e si stacca dal personaggio; la mappa resta quella vera, il progetto è un
   OLOGRAMMA semitrasparente in un colore solo (cielo), con il contorno. Stati: in progetto (cielo), manca la roba (ocra),
   non si può (rosa), in corso (si riempie dal basso: la parte fatta è solida, la riga chiara sale), fatto (diventa la cosa vera).
   - PEZZI: tutto il catalogo del cantiere (baracche, pezzi, arredi, postazioni, difese, corrente) si piazza nel progetto: tanti, in fila
     trascinando (muri, recinti), girati, spostati, tolti, annulla e rifai. Non costa niente finché non si costruisce.
   - TERRENO, come una sculpt: alza, abbassa, spiana, liscia, sgombra (alberi), ripristina; raggio e forza. Si vede la superficie che
     verrà (ocra dove si scava, cielo dove si riporta, le curve di livello ogni mezzo metro) e quanti metri cubi si muovono.
   - SOTTO: la sezione per profondità (−3, −6, −9 m): il mondo si vela, le gallerie scavate si vedono in trasparenza, gli scavi del
     progetto sono volumi (gallerie a tratti, stanze, cantine, sale, bunker, il pozzo con la scala per scendere).
   - LA DISTINTA: tutta la roba che serve, quanta ne hai (tasche, bauli, basi), cosa manca; gli attrezzi; il tempo con la banda.
   - I LAVORI: «Avvia i lavori» e il progetto diventa una coda ordinata (prima il terreno, poi gli scavi, poi i pezzi; si riordina).
     La banda libera ci va (come i lavori del cantiere), tu puoi dare una mano (clic sull'ologramma in corso, fuori dalla vista).
     La roba si paga quando il pezzo comincia; se manca, il pezzo aspetta (ocra) e la coda passa al prossimo.
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

  // =====================================================================================================================
  // IL CATALOGO DEL PROGETTO: i pezzi del cantiere (non le azioni sul posto) e gli scavi
  // =====================================================================================================================
  const PCATS = [['baracche', 'Baracche'], ['strutture', 'Pezzi'], ['arredi', 'Arredi'], ['postazioni', 'Postazioni'], ['difese', 'Difese'], ['energia', 'Corrente']];
  // gli scavi: le stanze del cantiere più la galleria (a tratti, trascinando) e il pozzo con la scala (da sopra si scende)
  const DIGS = [
    { id: 'galleria', nome: 'Galleria', desc: 'Trascina: un cunicolo largo una casella, armato di legno.', path: 1, kind: 2, cost3: { travi: 1 } },
    { id: 'pozzo', nome: 'Pozzo con la scala', desc: 'Da sopra si scende: la botola, la scala, il fondo alla quota scelta.', fp: [1, 1], kind: 2, pozzo: 1, cost: { assi: 2, travi: 1 } },
    { id: 'scavo_cantina', ref: 1 }, { id: 'scavo_stanza', ref: 1 }, { id: 'scavo_sala', ref: 1 }, { id: 'scavo_bunker', ref: 1 },
  ];
  const DIG = id => { const d = DIGS.find(q => q.id === id); if (!d) return null; if (d.ref && !d._b) { const b = CN().BY[id]; Object.assign(d, { nome: b.nome, desc: b.desc, fp: b.fp, kind: b.dig, cost: b.cost }); d._b = 1; } return d; };
  const TERRA = [['alza', 'Alza', 'Porta su la terra (riporto).'], ['abbassa', 'Abbassa', 'Toglie la terra (scavo a cielo aperto).'], ['spiana', 'Spiana', 'Porta tutto alla quota da dove parti.'], ['liscia', 'Liscia', 'Ammorbidisce gobbe e gradini.'], ['sgombra', 'Sgombra', 'Alberi, cespugli e sassi via (legna e pietre nel baule).'], ['ripristina', 'Ripristina', 'Cancella il progetto del terreno sotto il pennello.']];
  const pieceB = id => CN().BY[id] || null;
  const inPlan = b => b && !b.op && !b.dig && PCATS.some(c => c[0] === b.cat);

  // =====================================================================================================================
  // LO STATO
  // =====================================================================================================================
  function plan(st) { const C = CN().S(st); if (!C.plan) C.plan = { v: 1, items: [], seq: 1, vt: {}, clr: {}, go: false, rev: 1, fatti: 0 }; return C.plan; }
  const items = st => plan(st).items;
  const byPid = (st, pid) => items(st).find(i => i.pid === pid) || null;
  const touch = st => { plan(st).rev++; };
  // i minuti-uomo di ogni lavoro
  function needOf(st, it) {
    if (it.k === 'pezzo') { const b = pieceB(it.id); if (!b) return 10; if (b.big) return b.big; const q = Object.values(b.cost || {}).reduce((s, v) => s + v, 0); return clamp(Math.round(6 + q * 1.5), 6, 40); }
    if (it.k === 'scavo') { const L = LVM() && LVM().S(st), G = Gm(); let m = 0; it.tiles.forEach(([tx, ty]) => { if (L && L.ug[ty * G.GW + tx]) return; const hard = G.tileAt(tx, ty) === T().ROCK || G.tileAt(tx, ty) === T().CLIFF; m += (it.kind === 6 ? 12 : 6) * (hard ? 2 : 1); }); return Math.max(4, m) + (it.pozzo ? 20 : 0); }
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
    if (!C) return { why: 'Fuori dal campo: pianta il campo, o allarga il progetto dentro i picchetti.' };
    if (!lv && CN().inCity(it.x, it.y)) return { why: 'In città, all\'aperto, non si costruisce.' };
    if (lv && b.out) return { why: 'Si monta solo all\'aperto.' };
    const fp = fpOf(it), L = lv === 'ug' && LVM() ? LVM().S(st) : null, G = Gm();
    if (lv === 'ug') { for (const [tx, ty] of fp) if (!L.ug[ty * G.GW + tx] && !digPlanned(st, tx, ty)) return { why: 'Sotto terra è terra piena: prima progetta lo scavo.' }; }
    for (const o of items(st)) { if (o.pid === skipPid || o.k !== 'pezzo' || (o.lv || null) !== lv || o.st === 'fatto') continue; const bo = pieceB(o.id); if (!bo || !(b.fp || bo.fp)) { if (!b.fp && !bo.fp && Math.hypot(o.x - it.x, o.y - it.y) < .5) return { why: `Sopra ${bo ? bo.nome.toLowerCase() : 'un altro pezzo'} del progetto.` }; continue; } if (layerOf(o) !== layerOf(it)) continue; if (overlap(fp, fpOf(o))) return { why: `Si sovrappone a ${bo.nome.toLowerCase()} del progetto.` }; }
    let why = '';
    try { why = CN().canPlace(st, b, it.x, it.y, it.rot, lv) || ''; } catch (e) { why = ''; }
    if (/scava prima|terra piena/i.test(why) && lv === 'ug') why = '';
    if (/Ti serve|Prima va sgombrato/i.test(why)) return { why: '', soft: why };
    if (/disbosca prima|cava prima/i.test(why)) return { why: '', soft: 'Prima si sgombra (alberi o roccia): lo fanno i lavori.' };
    return { why };
  }
  // =====================================================================================================================
  // GLI SCAVI: caselle a una quota; devono toccare quello che è già scavato, un altro scavo del progetto o un pozzo
  // =====================================================================================================================
  function digPlanned(st, tx, ty) { return items(st).some(i => i.k === 'scavo' && i.st !== 'fatto' && i.tiles.some(q => q[0] === tx && q[1] === ty)); }
  function digFloor(st, tx, ty, depth) {   // la quota: quella del cunicolo accanto, se c'è; se no il suolo meno la profondità scelta
    const L = LVM() && LVM().S(st), G = Gm(); if (L) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (ty + dy) * G.GW + tx + dx; if (L.ug[j]) return { f: L.fl[j], snap: true }; }
    for (const it of items(st)) if (it.k === 'scavo' && it.st !== 'fatto' && it.tiles.some(q => Math.abs(q[0] - tx) + Math.abs(q[1] - ty) <= 1)) return { f: it.f, snap: true };
    const E = G.MAP.elev ? G.MAP.elev[ty * G.GW + tx] : 0; return { f: E - (depth || 3.2), snap: false };
  }
  // collegati: dalle gallerie vere e dai pozzi del progetto, attraverso gli scavi del progetto
  function digLinks(st) {
    const L = LVM() && LVM().S(st), G = Gm(), dig = items(st).filter(i => i.k === 'scavo' && i.st !== 'fatto'), own = new Map();
    dig.forEach(d => d.tiles.forEach(([tx, ty]) => own.set(tx + ',' + ty, d)));
    const ok = new Set(), Q = [];
    dig.forEach(d => { let seed = !!d.pozzo || d.st === 'corso'; if (!seed && L) for (const [tx, ty] of d.tiles) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) if (L.ug[(ty + dy) * G.GW + tx + dx]) { seed = true; break; } if (seed) break; } if (seed && !ok.has(d.pid)) { ok.add(d.pid); Q.push(d); } });
    while (Q.length) { const d = Q.shift(); d.tiles.forEach(([tx, ty]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const e = own.get((tx + dx) + ',' + (ty + dy)); if (e && !ok.has(e.pid)) { ok.add(e.pid); Q.push(e); } })); }
    return ok;
  }
  function checkDig(st, it, links) {
    const L = LVM() && LVM().S(st), G = Gm(); if (!L) return { why: 'Qui sotto non si scava.' };
    let todo = 0;
    for (const [tx, ty] of it.tiles) {
      if (tx < 1 || ty < 1 || tx >= G.GW - 1 || ty >= G.GH - 1) return { why: 'Oltre non si va.' };
      const i = ty * G.GW + tx; if (G.tileAt(tx, ty) === T().WATER) return { why: 'Lì sopra c\'è l\'acqua: si allaga.' };
      if (L.ug[i]) { if (L.kind[i] > 2 && L.kind[i] !== 6) return { why: 'Dentro le fogne e i posti murati non si scava.' }; continue; }
      todo++;
      if (G.MAP.zone && G.MAP.zone[i] === G.MAP.Z.CITTA && G.tileAt(tx, ty) === T().BLD) return { why: 'Sotto le case della città non si scava (le fondamenta).' };
      const E = G.MAP.elev ? G.MAP.elev[i] : 0; if (E - it.f < 2.6) return { why: 'Troppo vicino al suolo: il soffitto cede (scendi di più).' };
    }
    if (!todo && !it.pozzo) return { why: 'Qui è già tutto scavato.' };
    for (const o of items(st)) if (o !== it && o.k === 'scavo' && o.st !== 'fatto' && overlap(o.tiles, it.tiles)) return { why: 'Si sovrappone a un altro scavo del progetto.' };
    if (it.pozzo) { const [tx, ty] = it.tiles[0], v = G.tileAt(tx, ty); if ([T().VIA, T().COB, T().WALK, T().PIAZZA, T().QUAY, T().BLD, T().WATER].includes(v)) return { why: 'Sul selciato, sull\'asfalto e nelle case il pozzo non si apre a mano.' }; const C = CN().covoOf(st, (tx + .5) * TS(), (ty + .5) * TS(), null); if (!C) return { why: 'Il pozzo si apre dentro il campo.' }; }
    if (!(links || digLinks(st)).has(it.pid)) return { why: '', soft: 'Non tocca niente di scavato: collegalo a una galleria o metti un pozzo.', wait: 1 };
    return { why: '' };
  }

  // =====================================================================================================================
  // IL TERRENO: la quota che verrà, vertice per vertice (plan.vt), e le caselle da sgombrare (plan.clr)
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
    if (n) touch(st); return n;
  }
  function volOf(st, keys) { const P = plan(st), A = TS() * TS(); let cut = 0, fill = 0; (keys || Object.keys(P.vt)).forEach(k => { const t2 = P.vt[k]; if (t2 === undefined) return; const d = t2 - vNow(+k); if (d < 0) cut -= d * A; else fill += d * A; }); return { cut, fill }; }
  // le zolle: il terreno del progetto diviso in riquadri di 4×4 caselle (un lavoro ciascuno)
  const ZW = 4;
  function syncTerra(st) {
    const P = plan(st), W0 = VW(), zones = new Map();
    Object.keys(P.vt).forEach(k => { const i = +k % W0, j = Math.floor(+k / W0), z = Math.floor(i / ZW) + ',' + Math.floor(j / ZW); (zones.get(z) || zones.set(z, { v: [], c: [] }).get(z)).v.push(+k); });
    Object.keys(P.clr).forEach(q => { const [i, j] = q.split(',').map(Number), z = Math.floor(i / ZW) + ',' + Math.floor(j / ZW); (zones.get(z) || zones.set(z, { v: [], c: [] }).get(z)).c.push(q); });
    const have = new Map(items(st).filter(i => i.k === 'terra' && i.st !== 'fatto').map(i => [i.z, i]));
    zones.forEach((Z, z) => { let it = have.get(z); if (!it) { const [zx, zy] = z.split(',').map(Number); it = { pid: 'p' + (P.seq++), k: 'terra', z, x: (zx + .5) * ZW * TS(), y: (zy + .5) * ZW * TS(), st: 'progetto', prog: 0, done: 0, ord: -100000 + P.seq }; P.items.push(it); } it.verts = Z.v; it.clr = Z.c; have.delete(z); });
    have.forEach(it => { if (it.st !== 'corso') P.items.splice(P.items.indexOf(it), 1); else { it.verts = []; it.clr = []; } });
  }

  // =====================================================================================================================
  // MODIFICARE IL PROGETTO (annulla e rifai: le fotografie del progetto, non della partita)
  // =====================================================================================================================
  const H = { undo: [], redo: [] };
  const snapOf = st => { const P = plan(st); return JSON.stringify({ items: P.items, vt: P.vt, clr: P.clr, seq: P.seq }); };
  function remember(st) { H.undo.push(snapOf(st)); if (H.undo.length > 60) H.undo.shift(); H.redo.length = 0; }
  function restore(st, s) { const P = plan(st), o = JSON.parse(s), live = new Map(P.items.filter(i => i.st === 'corso' || i.paid).map(i => [i.pid, i])); P.items = o.items.filter(i => !(live.has(i.pid))).concat([...live.values()]); P.vt = o.vt; P.clr = o.clr; P.seq = Math.max(P.seq, o.seq); touch(st); }   // quello che è già cominciato non si annulla (la roba è pagata)
  function undo(st) { if (!H.undo.length) return { ok: false, msg: 'Niente da annullare.' }; H.redo.push(snapOf(st)); restore(st, H.undo.pop()); return { ok: true, msg: 'Annullato.' }; }
  function redo(st) { if (!H.redo.length) return { ok: false, msg: 'Niente da rifare.' }; H.undo.push(snapOf(st)); restore(st, H.redo.pop()); return { ok: true, msg: 'Rifatto.' }; }
  function addPiece(st, id, x, y, rot, lv, quiet) {
    const b = pieceB(id); if (!inPlan(b)) return { ok: false, msg: 'Questo non si progetta.' };
    const [sx, sy] = CN().snap(b, x, y, rot || 0), P = plan(st), it = { pid: 'p' + P.seq, k: 'pezzo', id, x: sx, y: sy, rot: rot || 0, lv: lv || null, st: 'progetto', prog: 0, done: 0, ord: P.seq, seed: Math.floor(Math.random() * 1e6) + 1 };
    const c = checkPiece(st, it); if (c.why) return { ok: false, msg: c.why };
    if (!quiet) remember(st); P.seq++; P.items.push(it); touch(st); return { ok: true, msg: `${b.nome}: nel progetto.${c.soft ? ' ' + c.soft : ''}`, it };
  }
  function addDig(st, id, tiles, f, quiet) {
    const d = DIG(id); if (!d) return { ok: false, msg: 'Scavo sconosciuto.' }; const P = plan(st);
    const it = { pid: 'p' + P.seq, k: 'scavo', id, tiles: tiles.map(q => [q[0], q[1]]), f, kind: d.kind, pozzo: d.pozzo ? 1 : 0, st: 'progetto', prog: 0, done: 0, ord: P.seq, x: 0, y: 0 };
    it.x = (it.tiles.reduce((s, q) => s + q[0], 0) / it.tiles.length + .5) * TS(); it.y = (it.tiles.reduce((s, q) => s + q[1], 0) / it.tiles.length + .5) * TS();
    const c = checkDig(st, it, new Set([it.pid])); if (c.why) return { ok: false, msg: c.why };
    if (!quiet) remember(st); P.seq++; P.items.push(it); touch(st); const c2 = checkDig(st, it);
    return { ok: true, msg: `${d.nome}: nel progetto (${it.tiles.length} caselle, fondo a ${it.f.toFixed(1)} m).${c2.soft ? ' ' + c2.soft : ''}`, it };
  }
  function digRect(b, x, y, rot) { return CN().footprint(b, x, y, rot).map(q => [q[0], q[1]]); }
  function moveItem(st, pid, x, y, rot) {
    const it = byPid(st, pid); if (!it || it.k !== 'pezzo' || it.st === 'corso' || it.paid) return { ok: false, msg: 'Questo è già in lavorazione: non si sposta.' };
    const b = pieceB(it.id), [sx, sy] = CN().snap(b, x, y, rot === undefined ? it.rot : rot), nx = { x: sx, y: sy, rot: rot === undefined ? it.rot : rot };
    const c = checkPiece(st, Object.assign({}, it, nx), pid); if (c.why) return { ok: false, msg: c.why };
    remember(st); Object.assign(it, nx); touch(st); return { ok: true, msg: `${b.nome}: spostato nel progetto.` };
  }
  function rotateItem(st, pid, dir) { const it = byPid(st, pid); if (!it) return { ok: false, msg: '' }; const b = pieceB(it.id); return moveItem(st, pid, it.x, it.y, it.rot + (dir || 1) * (b && b.fp ? Math.PI / 2 : Math.PI / 4)); }
  function removeItem(st, pid) {
    const it = byPid(st, pid); if (!it) return { ok: false, msg: '' };
    if (it.st === 'corso' || it.paid) { remember(st); cancelWork(st, it); if (it.paid && it.paid.cost) refundTo(st, it, it.paid.cost); }
    else remember(st);
    const P = plan(st); P.items.splice(P.items.indexOf(it), 1); if (it.k === 'terra') { (it.verts || []).forEach(k => delete P.vt[k]); (it.clr || []).forEach(k => delete P.clr[k]); }
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
    if (it.k === 'scavo') { const d = DIG(it.id); if (!d) return {}; if (d.cost3) { const n = Math.max(1, Math.ceil(it.tiles.length / 3)); return Object.fromEntries(Object.entries(d.cost3).map(([k, q]) => [k, q * n])); } return d.cost || {}; }
    return {};
  }
  function toolsOf(st, it) {
    const G = Gm(), t = T(); if (it.k === 'pezzo') { const b = pieceB(it.id); const L = it.lv ? [] : CN().clearTiles(b, it.x, it.y, it.rot); const s = new Set(); L.forEach(q => s.add(q[2] === 'disbosca' ? 'ascia|sega' : 'piccone')); return [...s]; }
    if (it.k === 'scavo') return [it.tiles.some(([tx, ty]) => [t.ROCK, t.CLIFF].includes(G.tileAt(tx, ty))) ? 'piccone' : 'pala|piccone'];
    if (it.k === 'terra') { const s = new Set(['pala|zappa']); (it.clr || []).forEach(q => { const [i, j] = q.split(',').map(Number), v = G.tileAt(i, j); s.add(v === t.ROCK ? 'piccone' : 'ascia|sega'); }); return [...s]; }
    return [];
  }
  const totalHave = (st, k) => CN().totalOf(st, k);
  function bom(st) {
    const need = {}, tools = new Set(); let mins = 0, nOpen = 0;
    items(st).forEach(it => { if (it.st === 'fatto') return; const rem = Math.max(0, (it.need || needOf(st, it)) - (it.done || 0)); mins += rem; nOpen++; if (!it.paid) Object.entries(costOf(st, it)).forEach(([k, q]) => { need[k] = (need[k] || 0) + q; }); toolsOf(st, it).forEach(x => tools.add(x)); });
    const rows = Object.entries(need).map(([k, q]) => { const h = totalHave(st, k); return { k, nome: O().nm(k), need: q, have: h, miss: Math.max(0, q - h) }; }).sort((a, b) => b.miss - a.miss || a.nome.localeCompare(b.nome));
    const tl = [...tools].map(t => ({ k: t, nome: t.split('|').map(q => O().nm(q)).join(' o '), ok: CN().hasTool(st, t) }));
    const crew = CN().crewAll(st).length, V = volOf(st);
    return { rows, miss: rows.filter(r => r.miss > 0), tools: tl, mins, crew, hours: mins / 60 / Math.max(1, crew), cut: V.cut, fill: V.fill, n: nOpen };
  }

  // =====================================================================================================================
  // LA CODA E I LAVORI
  // =====================================================================================================================
  const queue = st => items(st).filter(i => i.st !== 'fatto').sort((a, b) => a.ord - b.ord);
  // lo stato da mostrare: progetto | manca | invalid | attesa | corso | fatto (+ il perché)
  function stateOf(st, it, links) {
    if (it.st === 'corso' || it.st === 'fatto') return { s: it.st, why: it.why || '' };
    let c = { why: '' }; if (it.k === 'pezzo') c = checkPiece(st, it, it.pid); else if (it.k === 'scavo') c = checkDig(st, it, links);
    if (c.why) return { s: 'invalid', why: c.why };
    if (c.wait) return { s: 'attesa', why: c.soft };
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
  const workingOn = (st, it) => CN().crewAll(st).filter(n => n.ris && n.ris.task && n.ris.task.progJob === it.pid);
  function cancelWork(st, it) { workingOn(st, it).forEach(n => { n.ris.task = null; n.path = []; }); }
  function refundTo(st, it, cost) { const C = CN().covoOf(st, it.x, it.y, it.lv || null), B0 = CN().bauleOf(st, C) || O().inv(st); Object.entries(cost).forEach(([k, q]) => { B0[k] = (B0[k] || 0) + q; }); }
  // il lavoro di un turno: quanto ci sta un membro prima di tornare (i minuti si sommano)
  const TURNO = 30;
  function liveDone(st, it) {   // i minuti fatti, contando il turno in corso di chi ci lavora adesso
    let d = it.done || 0; workingOn(st, it).forEach(n => { const T0 = n.ris.task, s = T0.steps[T0.i]; if (s && s.k === 'hold') d += Math.min(s.mins, Math.max(0, st.t - T0.stepT)); }); return d;
  }
  function progress(st, it) { const need = it.need || needOf(st, it); return clamp(liveDone(st, it) / need, 0, 1); }
  // un passo dei lavori (una volta al secondo di gioco)
  function step(st, dt) {
    const P = st.covo && st.covo.plan; if (!P || !P.items.length) return;
    const now = st.clock || 0; P.wt = P.wt || 0; const dtm = Math.min(5, (st.t - (P.tLast === undefined ? st.t : P.tLast))); P.tLast = st.t;
    // la mano del giocatore: vicino al cantiere, fermo, con l'attrezzo giusto
    const W = P.work && byPid(st, P.work); if (W) { const p = st.player, d = Math.hypot(p.x - W.x, p.y - W.y); if (W.st !== 'corso' || d > siteR(W) + 2.2 || p.vehicle || (W.k === 'pezzo' && (p.lv && p.lv.k === 'ug' ? 'ug' : null) !== (W.lv || null))) { if (W.st === 'corso' && d > siteR(W) + 2.2) Gm().feed(st, 'Lasci il cantiere.', 'info'); P.work = null; } else { const tl = toolsOf(st, W)[0]; if (!tl || CN().hasTool(st, tl) || W.k === 'pezzo') { W.done = (W.done || 0) + dtm * 1.5; W.byMe = (W.byMe || 0) + dtm * 1.5; } } }
    if (now - (P.stepT || -9) < 1) { applyLive(st); return; } P.stepT = now;
    if (!P.go) { applyLive(st); return; }
    const links = digLinks(st), crew = CN().crewAll(st).length, maxOn = Math.max(1, crew);
    let on = items(st).filter(i => i.st === 'corso').length;
    for (const it of queue(st)) {
      if (it.st === 'corso') continue;
      const S0 = stateOf(st, it, links); it.st = S0.s === 'progetto' ? 'progetto' : S0.s; it.why = S0.why;
      if (on >= maxOn || S0.s !== 'progetto') continue;
      // si comincia: si paga, la roba è nel cantiere
      const c = costOf(st, it); if (Object.keys(c).length && !it.paid) { CN().pay(st, { cost: c }); it.paid = { cost: c }; }
      it.st = 'corso'; it.need = needOf(st, it); it.done = it.done || 0; it.t0 = st.t; it.why = ''; on++;
      if (it.k === 'terra') { const Pl = plan(st); it.base = {}; (it.verts || []).forEach(k => { it.base[k] = vNow(k); }); it.tgt = {}; (it.verts || []).forEach(k => { it.tgt[k] = Pl.vt[k]; }); }
      if (it.k === 'scavo') { it.order = digOrder(st, it); }
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
  const siteR = it => { if (it.k === 'pezzo') { const b = pieceB(it.id); return b && b.fp ? Math.max(...b.fp) * TS() / 2 : .6; } if (it.k === 'scavo') return Math.sqrt(it.tiles.length) * TS() / 2; return ZW * TS() / 2; };
  const verbOf = it => it.k === 'pezzo' ? `tira su ${(pieceB(it.id) || { nome: 'il pezzo' }).nome.toLowerCase()}` : it.k === 'scavo' ? 'scava sotto' : 'muove la terra';
  function labelOf(it) { if (it.k === 'pezzo') return (pieceB(it.id) || { nome: '?' }).nome; if (it.k === 'scavo') return (DIG(it.id) || { nome: 'Scavo' }).nome; return 'Terreno'; }
  // l'ordine dello scavo: dal lato che tocca lo scavato (o dal pozzo) verso il fondo
  function digOrder(st, it) {
    const L = LVM().S(st), G = Gm(), own = new Set(it.tiles.map(q => q.join(','))), dist = new Map(), Q = [];
    it.tiles.forEach(([tx, ty]) => { const near = it.pozzo || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L.ug[(ty + dy) * G.GW + tx + dx]); if (near) { dist.set(tx + ',' + ty, 0); Q.push([tx, ty]); } });
    if (!Q.length) { dist.set(it.tiles[0].join(','), 0); Q.push(it.tiles[0]); }
    while (Q.length) { const [tx, ty] = Q.shift(), d = dist.get(tx + ',' + ty); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const k = (tx + dx) + ',' + (ty + dy); if (own.has(k) && !dist.has(k)) { dist.set(k, d + 1); Q.push([tx + dx, ty + dy]); } }); }
    return it.tiles.slice().sort((a, b) => (dist.get(a.join(',')) ?? 99) - (dist.get(b.join(',')) ?? 99));
  }
  // quello che si vede mentre si lavora: le caselle scavate una a una, la terra che sale o scende a passi
  function applyLive(st) {
    items(st).filter(i => i.st === 'corso').forEach(it => {
      const p = progress(st, it);
      if (it.k === 'scavo') { const L = LVM().S(st), G = Gm(), ord = it.order || it.tiles, n = Math.floor(p * ord.length + 1e-6); while ((it.dug || 0) < n) { const [tx, ty] = ord[it.dug || 0]; it.dug = (it.dug || 0) + 1; digOne(st, it, tx, ty, L, G); } }
      if (it.k === 'terra') { const q = Math.floor(p * 5) / 5; if (q > (it.lp || 0) + 1e-6) { it.lp = q; terraAt(st, it, q); } }
    });
  }
  function digOne(st, it, tx, ty, L, G) {
    const i = ty * G.GW + tx; if (!L.ug[i]) { L.ug[i] = 2; L.fl[i] = it.f; L.kind[i] = it.kind || 2; if (LVM().hooks) LVM().hooks.dug.forEach(fn => { try { const m = fn(st, tx, ty, L); if (m) G.feed(st, m, 'good'); } catch (e) { } }); }
    if (it.pozzo && !L.portals.some(q => q.kind === 'botola' && q.s[0] === tx && q.s[1] === ty)) L.portals.push({ kind: 'botola', s: [tx, ty], u: [tx, ty] });
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
    if (it.k === 'scavo') { const L = LVM().S(st), ord = it.order || it.tiles; while ((it.dug || 0) < ord.length) { const [tx, ty] = ord[it.dug || 0]; it.dug = (it.dug || 0) + 1; digOne(st, it, tx, ty, L, G); } if (!it.pozzo) L.rooms.push({ x: it.x, y: it.y, f: it.f, deco: it.kind === 6 ? 'bunker_vuoto' : 'scavo' }); G.feed(st, `${labelOf(it)}: scavo finito.`, 'good'); }
    if (it.k === 'terra') { it.lp = 0; terraAt(st, it, 1); (it.verts || []).forEach(k => { if (P.vt[k] === it.tgt[k]) delete P.vt[k]; }); (it.clr || []).forEach(k => delete P.clr[k]); G.feed(st, 'Una zolla di terreno: fatta.', 'good'); }
    it.st = 'fatto'; it.done = it.need; cancelWork(st, it); P.fatti = (P.fatti || 0) + 1; if (P.work === it.pid) P.work = null;
    P.items.splice(P.items.indexOf(it), 1); touch(st);
    if (!P.items.length) { P.go = false; G.feed(st, 'Il progetto è tutto fatto.', 'good'); }
  }
  function go(st, on) { const P = plan(st); syncTerra(st); P.go = on === undefined ? !P.go : !!on; P.stepT = -9; touch(st); return { ok: true, msg: P.go ? `Lavori avviati: ${queue(st).length} in coda.` : 'Lavori in pausa (chi sta lavorando finisce il turno).' }; }
  // il giocatore dà una mano: ci va (clic sull'ologramma in corso) e lavora finché resta lì
  function workHere(st, pid) { const it = byPid(st, pid); if (!it || it.st !== 'corso') return { ok: false, msg: 'Lì non c\'è un cantiere aperto.' }; const tl = toolsOf(st, it)[0]; if (it.k !== 'pezzo' && tl && !CN().hasTool(st, tl)) return { ok: false, msg: `Ti serve: ${tl.split('|').map(q => O().nm(q)).join(' o ')}.` }; plan(st).work = pid; return { ok: true, msg: `Dai una mano: ${labelOf(it).toLowerCase()}. Resta qui; allontanati per smettere.` }; }

  // =====================================================================================================================
  // LA GRAFICA: gli ologrammi (pochi disegni: tutto fuso per stato), il terreno che verrà, la sezione di sotto
  // =====================================================================================================================
  const COL = { progetto: '#A3D4D8', manca: '#DC9A34', invalid: '#E04B8C', attesa: '#93B27C', corso: '#A3D4D8', ghost: '#F2E7CF', scavo: '#C8A27A', vero: '#7C7186', cut: '#DC9A34', fill: '#A3D4D8' };
  const V = { on: false, mode: 'pezzi', cat: 'baracche', tool: null, rot: 0, r: 3, s: .3, depth: 3.2, layer: 'su', top: true, cam: null, sel: null, msg: '', msgOk: true, msgT: 0, grp: null, scene: null, rev: -1, layerRev: '', ghostKey: '', tab: 'distinta', sheet: true };
  const GEO = {};   // le forme di ogni pezzo, fuse in una (posizione, normale, colore), una volta sola
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const holo = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, vertexColors: false, side: THREE.DoubleSide });
    holo.onBeforeCompile = sh => {
      sh.uniforms.uT = { value: 0 }; holo.userData.sh = sh;
      sh.vertexShader = 'attribute float aFill; attribute vec3 aTint; varying float vFill; varying float vWY; varying vec3 vTint; varying vec3 vHN; varying vec3 vHV;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vFill = aFill; vTint = aTint; vWY = (modelMatrix * vec4(transformed, 1.0)).y; vHN = normalize(normalMatrix * objectNormal); vHV = normalize(-mvPosition.xyz);');
      sh.fragmentShader = 'uniform float uT; varying float vFill; varying float vWY; varying vec3 vTint; varying vec3 vHN; varying vec3 vHV;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'if (vWY < vFill) discard; float fr = 1.0 - abs(dot(normalize(vHN), normalize(vHV))); float band = smoothstep(.14, 0.0, vWY - vFill) * step(-50.0, vFill); float scan = step(.82, fract(vWY * 2.5 - uT * .6)) * .10; vec4 diffuseColor = vec4(mix(vTint, vec3(1.0, .97, .9), band), clamp(.16 + .42 * fr * fr + scan + band * .7, 0.0, .92));');
    };
    const solid = new THREE.MeshLambertMaterial({ vertexColors: true });
    solid.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute float aFill; varying float vFill; varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vFill = aFill; vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vFill; varying float vWY;\n' + sh.fragmentShader.replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'if (vWY > vFill) discard; vec4 diffuseColor = vec4( diffuse, opacity );').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, .93, .78) * smoothstep(.09, 0.0, vFill - vWY) * .9;');
    };
    const line = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .95, depthWrite: false });
    const lineX = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .9, depthTest: false, depthWrite: false });
    const terra = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    terra.onBeforeCompile = sh => { sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vWY = (modelMatrix * vec4(transformed, 1.0)).y;'); sh.fragmentShader = 'varying float vWY;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n float cl = abs(fract(vWY * 2.0 + .5) - .5) / fwidth(vWY * 2.0); diffuseColor.rgb = mix(vec3(.09, .07, .1), diffuseColor.rgb, clamp(cl - .2, 0.0, 1.0) * .65 + .35 * step(1.2, cl)); diffuseColor.a = max(diffuseColor.a, (1.0 - clamp(cl, 0.0, 1.0)) * diffuseColor.a * 2.2);'); };
    terra.vertexAlphas = true;
    const xray = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .55, depthTest: false, depthWrite: false });
    const veil = new THREE.MeshBasicMaterial({ color: '#16121B', transparent: true, opacity: .62, depthTest: false, depthWrite: false });
    const ghost = new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: .38, depthWrite: false }), ghostNo = new THREE.MeshBasicMaterial({ color: COL.invalid, transparent: true, opacity: .45, depthWrite: false });
    const digOk = new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: .45, depthTest: false, depthWrite: false }), digNo = new THREE.MeshBasicMaterial({ color: COL.invalid, transparent: true, opacity: .5, depthTest: false, depthWrite: false }), digBox = new THREE.BoxGeometry(1.8, 2.3, 1.8), pin = new THREE.CylinderGeometry(.08, .08, 1.6, 6);
    const ring = new THREE.LineBasicMaterial({ color: '#F2E7CF', transparent: true, opacity: .8, depthWrite: false });
    return (MATS = { holo, solid, line, lineX, terra, xray, veil, ghost, ghostNo, digOk, digNo, digBox, pin, ring });
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
  const gH = (st, x, y, lv) => { try { return CN().hAt(st, x, y, lv); } catch (e) { return 0; } };
  // tutti i pezzi del progetto in due disegni (solido sotto la riga, ologramma sopra) e uno per i contorni
  function buildPieces(st, links) {
    const its = items(st).filter(i => i.k === 'pezzo' && ((i.lv || null) === (V.layer === 'su' ? null : 'ug')));
    let nv = 0; its.forEach(it => { nv += geoOf(it.id).pos.length / 3; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), tint = new Float32Array(nv * 3), fill = new Float32Array(nv), lp = [], lc = [], ranges = [];
    const c = new THREE.Color(); let o = 0;
    its.forEach(it => {
      const G0 = geoOf(it.id), y0 = gH(st, it.x, it.y, it.lv), cs = Math.cos(-it.rot), sn = Math.sin(-it.rot), S0 = stateOf(st, it, links); it._s = S0;
      c.set(COL[S0.s] || COL.progetto); const n = G0.pos.length / 3, r0 = o;
      for (let i = 0; i < n; i++) { const x = G0.pos[i * 3], y = G0.pos[i * 3 + 1], z = G0.pos[i * 3 + 2], nx = G0.nor[i * 3], nz = G0.nor[i * 3 + 2];
        pos[o * 3] = it.x + x * cs + z * sn; pos[o * 3 + 1] = y0 + y; pos[o * 3 + 2] = it.y - x * sn + z * cs; nor[o * 3] = nx * cs + nz * sn; nor[o * 3 + 1] = G0.nor[i * 3 + 1]; nor[o * 3 + 2] = -nx * sn + nz * cs;
        col[o * 3] = G0.col[i * 3]; col[o * 3 + 1] = G0.col[i * 3 + 1]; col[o * 3 + 2] = G0.col[i * 3 + 2]; tint[o * 3] = c.r; tint[o * 3 + 1] = c.g; tint[o * 3 + 2] = c.b; fill[o] = -99; o++; }
      ranges.push([it.pid, r0, o, y0, G0.h]);
      // il contorno: l'ingombro a terra e gli spigoli in alto
      const hw = G0.w / 2, hd = G0.d / 2, hh = G0.h, Q = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([a, b]) => [it.x + a * cs + b * sn, it.y - a * sn + b * cs]);
      for (let k = 0; k < 4; k++) { const A = Q[k], B = Q[(k + 1) % 4]; lp.push(A[0], y0 + .05, A[1], B[0], y0 + .05, B[1], A[0], y0 + hh, A[1], B[0], y0 + hh, B[1], A[0], y0 + .05, A[1], A[0], y0 + hh, A[1]); for (let q = 0; q < 6; q++) lc.push(c.r, c.g, c.b); }
    });
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); ge.setAttribute('color', new THREE.BufferAttribute(col, 3)); ge.setAttribute('aTint', new THREE.BufferAttribute(tint, 3)); ge.setAttribute('aFill', new THREE.BufferAttribute(fill, 1)); ge.computeBoundingSphere();
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); gl.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
    return { ge, gl, ranges };
  }
  // il terreno che verrà: una maglia sopra i vertici toccati (ocra si scava, cielo si riporta), con le curve di livello
  function buildTerra(st) {
    const P = plan(st), W0 = VW(), ks = Object.keys(P.vt).map(Number); if (!ks.length && !Object.keys(P.clr).length) return null;
    let i0 = 1e9, j0 = 1e9, i1 = -1, j1 = -1; ks.forEach(k => { const i = k % W0, j = Math.floor(k / W0); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i); j1 = Math.max(j1, j); });
    Object.keys(P.clr).forEach(q => { const [i, j] = q.split(',').map(Number); i0 = Math.min(i0, i); j0 = Math.min(j0, j); i1 = Math.max(i1, i + 1); j1 = Math.max(j1, j + 1); });
    i0--; j0--; i1++; j1++; const nx = i1 - i0 + 1, nz = j1 - j0 + 1, S0 = TS(), pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 4), ind = [], cc = new THREE.Color(COL.cut), cf = new THREE.Color(COL.fill), cg = new THREE.Color(COL.attesa);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = (j0 + j) * W0 + i0 + i, now = vNow(k), t2 = P.vt[k] !== undefined ? P.vt[k] : now, d = t2 - now, q = (j * nx + i);
      pos[q * 3] = (i0 + i) * S0; pos[q * 3 + 1] = t2 + .06; pos[q * 3 + 2] = (j0 + j) * S0; const c = d < 0 ? cc : cf; col[q * 4] = c.r; col[q * 4 + 1] = c.g; col[q * 4 + 2] = c.b; col[q * 4 + 3] = clamp((Math.abs(d) - .03) / .25, 0, 1) * .62; }
    // le caselle da sgombrare: verde salvia
    Object.keys(P.clr).forEach(s => { const [a, b] = s.split(',').map(Number); for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const q = (b + dj - j0) * nx + (a + di - i0); if (q < 0 || q >= nx * nz) continue; if (col[q * 4 + 3] < .3) { col[q * 4] = cg.r; col[q * 4 + 1] = cg.g; col[q * 4 + 2] = cg.b; col[q * 4 + 3] = .5; } } });
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; if (col[a * 4 + 3] + col[b * 4 + 3] + col[c * 4 + 3] + col[d * 4 + 3] < .01) continue; ind.push(a, c, d, a, d, b); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.BufferAttribute(col, 4)); ge.setIndex(ind); ge.computeBoundingSphere(); return ge;
  }
  // la sezione di sotto: le gallerie vere vicine (piombo), gli scavi del progetto (volumi, colore dello stato), le caselle scavate di quelli in corso
  function buildUnder(st, links) {
    const L = LVM() && LVM().S(st); if (!L) return null; const G = Gm(), S0 = TS(), c0 = V.cam || { x: st.player.x, y: st.player.y }, ci = Math.floor(c0.x / S0), cj = Math.floor(c0.y / S0), R0 = 34;
    const pos = [], col = [], c = new THREE.Color(), box = (x0, y0, z0, w, h, d, cl, a) => { const x1 = x0 + w, y1 = y0 + h, z1 = z0 + d; const F = [[x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1], [x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1], [x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0], [x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y0, z1], [x0, y0, z0, x0, y1, z0, x1, y1, z0, x1, y0, z0]]; F.forEach(q => { for (const t of [0, 1, 2, 0, 2, 3]) { pos.push(q[t * 3], q[t * 3 + 1], q[t * 3 + 2]); col.push(cl.r, cl.g, cl.b); } }); };
    const band = f => V.depth ? Math.abs((G.MAP.elev ? 0 : 0) + f - f) : 0;
    c.set(COL.vero); for (let j = cj - R0; j <= cj + R0; j++) for (let i = ci - R0; i <= ci + R0; i++) { if (i < 0 || j < 0 || i >= G.GW || j >= G.GH) continue; const k = j * G.GW + i; if (!L.ug[k]) continue; const E = G.MAP.elev[k], dep = E - L.fl[k], inB = Math.abs(dep - V.depth) < 2.2; const cl = inB ? c : new THREE.Color(COL.vero).multiplyScalar(.55); box(i * S0 + .15, L.fl[k], j * S0 + .15, S0 - .3, inB ? 2.3 : .3, S0 - .3, cl); }
    items(st).filter(i => i.k === 'scavo').forEach(it => { const S1 = it.st === 'corso' ? { s: 'corso' } : stateOf(st, it, links); it._s = S1; const cl = new THREE.Color(S1.s === 'corso' ? COL.scavo : COL[S1.s] || COL.progetto); const dug = new Set((it.order || []).slice(0, it.dug || 0).map(q => q.join(','))); it.tiles.forEach(([tx, ty]) => { if (dug.has(tx + ',' + ty)) return; box(tx * S0 + .08, it.f, ty * S0 + .08, S0 - .16, 2.3, S0 - .16, cl); }); if (it.pozzo) { const [tx, ty] = it.tiles[0], E = G.MAP.elev[ty * G.GW + tx]; box(tx * S0 + .6, it.f, ty * S0 + .6, S0 - 1.2, E - it.f, S0 - 1.2, cl); } });
    if (!pos.length) return null; const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ge.computeBoundingSphere(); return ge;
  }
  function ringGeo(st) { const pts = []; CN().covi(st).forEach(C => { const n = Math.max(24, Math.round(C.r * 2)); for (let i = 0; i < n; i++) { if (i % 2) continue; const a = i / n * 6.283, b = (i + 1) / n * 6.283; const x0 = C.x + Math.cos(a) * C.r, z0 = C.y + Math.sin(a) * C.r, x1 = C.x + Math.cos(b) * C.r, z1 = C.y + Math.sin(b) * C.r; pts.push(x0, gH(st, x0, z0, null) + .3, z0, x1, gH(st, x1, z1, null) + .3, z1); } }); const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return ge; }
  function drop(o) { if (!o) return; if (o.parent) o.parent.remove(o); const M = MATS; o.traverse(q => { if (q.geometry && !(M && (q.geometry === M.digBox || q.geometry === M.pin))) q.geometry.dispose(); }); }
  function sceneSync(st) {
    const r = R(), scene = r && r.__models && r.__models.scene; if (!scene) return;
    const M = mats(); if (V.scene !== scene) { V.scene = scene; V.grp = new THREE.Group(); V.grp.name = 'progetto'; V.grp.userData.ugKeep = true; scene.add(V.grp); V.rev = -1; }
    const P = st.covo && st.covo.plan, any = P && (P.items.length || Object.keys(P.vt).length || Object.keys(P.clr).length);
    V.grp.visible = !!(V.on || (any && (P.go || P.items.some(i => i.st === 'corso'))));   // fuori dalla vista: il progetto si vede quando i lavori sono avviati
    if (!V.grp.visible) return;
    const lk = V.layer + '|' + V.depth + '|' + (V.on ? 1 : 0) + '|' + Math.round((V.cam ? V.cam.x : 0) / 16) + ',' + Math.round((V.cam ? V.cam.y : 0) / 16);
    const sig = P ? P.rev + '|' + P.items.map(i => i.pid + i.st + (i.why ? 1 : 0)).join(',') + '|' + Object.keys(CN().S(st).obj).length + '|' + ((LVM() && LVM().S(st).rev) || 0) : '-';
    if (P && (V.rev !== sig || V.layerRev !== lk) && (!V.rebT || performance.now() - V.rebT > 120)) {
      V.rebT = performance.now(); V.rev = sig; V.layerRev = lk; syncTerra(st);
      ['pS', 'pH', 'pL', 'tH', 'uX', 'veil', 'ring'].forEach(k => { drop(V[k]); V[k] = null; });
      const links = digLinks(st), B = buildPieces(st, links), xr = V.layer !== 'su'; V.ranges = B.ranges; M.holo.depthTest = M.solid.depthTest = M.line.depthTest = !xr;
      V.pS = new THREE.Mesh(B.ge, M.solid); V.pH = new THREE.Mesh(B.ge, M.holo); V.pS.renderOrder = xr ? 42 : 0; V.pH.renderOrder = xr ? 43 : 30; V.pL = new THREE.LineSegments(B.gl, M.line); V.pL.renderOrder = xr ? 44 : 31; [V.pS, V.pH, V.pL].forEach(m => { m.frustumCulled = false; V.grp.add(m); });
      const tg = V.layer === 'su' ? buildTerra(st) : null; if (tg) { V.tH = new THREE.Mesh(tg, M.terra); V.tH.renderOrder = 29; V.grp.add(V.tH); }
      if (V.layer !== 'su' && V.on) { const ug = buildUnder(st, links); const vg = new THREE.PlaneGeometry(4000, 4000); vg.rotateX(-Math.PI / 2); V.veil = new THREE.Mesh(vg, M.veil); V.veil.renderOrder = 40; V.veil.frustumCulled = false; V.grp.add(V.veil); if (ug) { V.uX = new THREE.Mesh(ug, M.xray); V.uX.renderOrder = 41; V.grp.add(V.uX); } }
      if (V.on && V.layer === 'su') { V.ring = new THREE.LineSegments(ringGeo(st), M.ring); V.grp.add(V.ring); }
    }
    if (V.veil) V.veil.position.set(V.cam ? V.cam.x : st.player.x, (V.cam ? gH(st, V.cam.x, V.cam.y, null) : 0) + .2, V.cam ? V.cam.y : st.player.y);
    // la riga che sale: l'altezza fatta di ogni pezzo in corso
    if (V.pS && V.ranges && P) { const A = V.pS.geometry.attributes.aFill; let ch = false; V.ranges.forEach(([pid, a, b, y0, h]) => { const it = byPid(st, pid), f = it && it.st === 'corso' ? y0 - .02 + (h + .04) * progress(st, it) : -99; if (A.array[a] !== f) { A.array.fill(f, a, b); ch = true; } }); if (ch) A.needsUpdate = true; }
    if (M.holo.userData.sh) M.holo.userData.sh.uniforms.uT.value = performance.now() / 1000;
    ghostSync(st);
  }
  // la sagoma dello strumento: il pezzo da posare (o la fila), il cerchio del pennello, le caselle dello scavo
  function ghostSync(st) {
    const M = mats(); if (!V.on || !V.tool || !V.hover) { if (V.gh) V.gh.visible = false; return; }
    const tl = V.tool, hq = tl.k === 'pezzo' ? CN().snap(pieceB(tl.id), V.hover.x, V.hover.y, V.rot) : tl.k === 'scavo' ? tileOf(V.hover.x, V.hover.y) : [Math.round(V.hover.x * 4) / 4, Math.round(V.hover.y * 4) / 4], key = JSON.stringify([tl, V.rot, hq, V.row, V.r, V.layer, V.depth, plan(st).rev]); if (key === V.ghostKey && V.gh) { V.gh.visible = true; return; } V.ghostKey = key;
    drop(V.gh); V.gh = null; const g = new THREE.Group(); g.renderOrder = 35;
    const okC = new THREE.Color(COL.ghost), noC = new THREE.Color(COL.invalid);
    if (tl.k === 'pezzo') { const pts = V.row && V.row.length ? V.row : [[V.hover.x, V.hover.y]]; const G0 = geoOf(tl.id), b = pieceB(tl.id);
      pts.slice(0, 60).forEach(([x, y]) => { const [sx, sy] = CN().snap(b, x, y, V.rot), it = { pid: '_g', k: 'pezzo', id: tl.id, x: sx, y: sy, rot: V.rot, lv: V.layer === 'su' ? null : 'ug' }, c = checkPiece(st, it), ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.BufferAttribute(G0.pos, 3)); const m = new THREE.Mesh(ge, c.why ? M.ghostNo : M.ghost); m.position.set(sx, gH(st, sx, sy, it.lv) + .02, sy); m.rotation.y = -V.rot; g.add(m); V.why = c.why || c.soft || ''; }); }
    if (tl.k === 'terra') { const pts = []; const n = 40, h0 = gH(st, V.hover.x, V.hover.y, null); for (let i = 0; i <= n; i++) { const a = i / n * 6.283, x = V.hover.x + Math.cos(a) * V.r, z = V.hover.y + Math.sin(a) * V.r; pts.push(new THREE.Vector3(x, gH(st, x, z, null) + .15, z)); } const ge = new THREE.BufferGeometry().setFromPoints(pts); g.add(new THREE.Line(ge, M.ring)); const c = new THREE.Mesh(M.pin, M.ghost); c.position.set(V.hover.x, h0 + .8, V.hover.y); g.add(c); V.why = ''; }
    if (tl.k === 'scavo') { const tiles = V.row && V.row.length ? V.row : digTilesAt(tl.id, V.hover.x, V.hover.y); const [tx0, ty0] = tiles[0] || tileOf(V.hover.x, V.hover.y), fl = digFloor(st, tx0, ty0, V.depth), it = { pid: '_g', k: 'scavo', id: tl.id, tiles, f: fl.f, kind: 2, pozzo: DIG(tl.id).pozzo ? 1 : 0 }, c = checkDig(st, it, new Set(['_g']));
      const ge = M.digBox, mt = c.why ? M.digNo : M.digOk; tiles.slice(0, 200).forEach(([tx, ty]) => { const m = new THREE.Mesh(ge, mt); m.position.set((tx + .5) * TS(), fl.f + 1.15, (ty + .5) * TS()); m.renderOrder = 45; g.add(m); }); V.why = c.why || (fl.snap ? `Si aggancia alla quota ${fl.f.toFixed(1)} m.` : `Fondo a ${fl.f.toFixed(1)} m (−${V.depth.toFixed(0)} m).`); }
    V.gh = g; V.grp.add(g);
  }
  function digTilesAt(id, x, y) { const d = DIG(id); if (d.path || d.pozzo) return [tileOf(x, y)]; return digRect({ fp: d.fp }, ...CN().snap({ fp: d.fp }, x, y, V.rot), V.rot); }

  // =====================================================================================================================
  // IL PANNELLO
  // =====================================================================================================================
  const CSS = `
#pg { position: absolute; inset: 0; z-index: 41; pointer-events: none; display: none; font-family: 'Instrument Sans', system-ui, sans-serif; color: #E9DCBC; }
#pg.on { display: block; } body.pg-on #cnBtn, body.pg-on #rs-here, body.pg-on #me-box, body.pg-on #ts-hint { display: none !important; }
#pg .bx { pointer-events: auto; background: rgba(15,27,25,.9); box-shadow: 0 0 0 1px #3A5A50; border-radius: 14px; }
#pg .hd { position: absolute; left: 14px; top: 12px; padding: 10px 14px; max-width: 420px; }
#pg .hd b { display: block; font: 400 24px 'Instrument Serif', Georgia, serif; } #pg .hd small { display: block; color: rgba(233,220,188,.7); font-size: 12px; line-height: 1.45; margin-top: 3px; }
#pg .modes { position: absolute; left: 50%; transform: translateX(-50%); top: 12px; display: flex; gap: 6px; padding: 6px; }
#pg button { cursor: pointer; font: 600 12px 'Saira Condensed', 'Arial Narrow', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: rgba(233,220,188,.85); background: none; border: 1px solid rgba(233,220,188,.22); border-radius: 12px; padding: 5px 11px; }
#pg button.on { color: #16121B; background: #A3D4D8; border-color: #A3D4D8; } #pg button.go { background: #A3D4D8; color: #16121B; border-color: #A3D4D8; font-size: 13px; padding: 7px 14px; } #pg button.go.pausa { background: #DC9A34; border-color: #DC9A34; }
#pg button:disabled { opacity: .35; cursor: default; }
#pg .side { position: absolute; right: 14px; top: 12px; width: 290px; max-height: calc(100% - 210px); overflow: auto; padding: 10px 12px; }
#pg .side h4 { margin: 8px 0 4px; font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #A3D4D8; }
#pg .row { display: grid; grid-template-columns: 1fr auto; gap: 6px; font-size: 12.5px; padding: 2px 0; } #pg .row .n { color: #FF5FA2; } #pg .row .y { color: #93B27C; }
#pg .q { display: grid; grid-template-columns: 10px 1fr auto; gap: 6px; align-items: center; font-size: 12.5px; padding: 3px 0; border-bottom: 1px solid rgba(58,90,80,.5); } #pg .q i { width: 9px; height: 9px; border-radius: 3px; display: block; } #pg .q em { font-style: normal; color: rgba(233,220,188,.6); font-size: 11px; display: block; }
#pg .q .bar { height: 3px; background: rgba(233,220,188,.15); border-radius: 2px; margin-top: 2px; } #pg .q .bar span { display: block; height: 3px; background: #A3D4D8; border-radius: 2px; }
#pg .q button { padding: 2px 6px; font-size: 11px; }
#pg .leg { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; color: rgba(233,220,188,.75); } #pg .leg i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
#pg .tools { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); display: grid; gap: 6px; padding: 8px; width: 132px; }
#pg .tools label { font-size: 11px; color: rgba(233,220,188,.7); display: grid; gap: 2px; } #pg .tools input { width: 100%; accent-color: #A3D4D8; }
#pg .bar2 { position: absolute; left: 14px; right: 318px; bottom: 12px; padding: 8px 10px 10px; }
#pg .cats { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; align-items: center; } #pg .cats .msg { margin-left: 8px; font: italic 14px 'Instrument Serif', Georgia, serif; } #pg .cats .msg.no { color: #FF5FA2; }
#pg .cards { display: flex; gap: 7px; overflow-x: auto; padding: 2px 2px 4px; }
#pg .card { flex: 0 0 auto; width: 108px; border-radius: 11px; padding: 5px 5px 7px; cursor: pointer; background: rgba(15,27,25,.75); box-shadow: inset 0 0 0 1px rgba(58,90,80,.8); display: grid; justify-items: center; gap: 2px; text-align: center; }
#pg .card.on { box-shadow: 0 0 0 2px #A3D4D8; } #pg .card canvas { width: 62px; height: 62px; } #pg .card b { font: 400 14.5px/1.1 'Instrument Serif', Georgia, serif; } #pg .card small { font-size: 10px; color: rgba(233,220,188,.6); line-height: 1.25; } #pg .card small.n { color: #FF5FA2; }
#pg .sel { position: absolute; left: 50%; transform: translateX(-50%); top: 64px; padding: 8px 12px; display: flex; gap: 6px; align-items: center; font-size: 13px; }
#pg .tip { position: absolute; pointer-events: none; padding: 3px 8px; border-radius: 8px; background: rgba(15,27,25,.85); font-size: 12px; white-space: nowrap; transform: translate(-50%, -140%); } #pg .tip.no { color: #FF5FA2; }
#pg .lab { position: absolute; pointer-events: none; padding: 2px 7px; border-radius: 8px; background: rgba(15,27,25,.82); font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .08em; transform: translate(-50%, -100%); white-space: nowrap; }
#pg .fab { position: absolute; right: 14px; display: none; gap: 8px; flex-direction: column; } #pg .fab button { width: 46px; height: 46px; border-radius: 23px; padding: 0; font-size: 18px; background: rgba(15,27,25,.92); }
#pgLab { position: absolute; inset: 0; pointer-events: none; z-index: 39; } #pgLab .lab { position: absolute; padding: 2px 7px; border-radius: 8px; background: rgba(15,27,25,.82); color: #E9DCBC; font: 600 11px 'Saira Condensed', sans-serif; letter-spacing: .08em; transform: translate(-50%, -100%); white-space: nowrap; }
@media (max-width: 760px) {
  #pg .hd { left: 8px; right: 8px; top: 8px; max-width: none; padding: 7px 10px; } #pg .hd b { font-size: 19px; } #pg .hd small.k { display: none; }
  #pg .modes { top: auto; bottom: calc(var(--sheet, 236px) + 8px); left: 8px; transform: none; } #pg .modes button { padding: 6px 9px; }
  #pg .side { left: 8px; right: 8px; top: auto; bottom: 8px; width: auto; max-height: var(--sheet, 236px); display: none; } #pg.tab-distinta .side, #pg.tab-coda .side { display: block; }
  #pg .bar2 { left: 8px; right: 8px; bottom: 8px; max-height: var(--sheet, 236px); } #pg.tab-distinta .bar2, #pg.tab-coda .bar2 { display: none; }
  #pg .tools { left: auto; right: 8px; top: 96px; transform: none; width: 118px; } #pg .fab { display: flex; top: 96px; } #pg .sel { top: auto; bottom: calc(var(--sheet, 236px) + 52px); }
  #pg .card { width: 92px; } #pg .card canvas { width: 50px; height: 50px; }
}`;
  function $(id) { return document.getElementById(id); }
  function mount() {
    if ($('pg')) return true; const app = $('app'); if (!app) return false;
    const css = document.createElement('style'); css.textContent = CSS; document.head.appendChild(css);
    const m = document.createElement('div'); m.id = 'pg'; app.appendChild(m); m.addEventListener('click', onUi); m.addEventListener('input', onUi);
    const lb = document.createElement('div'); lb.id = 'pgLab'; app.appendChild(lb);
    return true;
  }
  const phone = () => !!(PV() && PV().touchMode) || (typeof innerWidth !== 'undefined' && innerWidth < 760);
  function say(r) { if (!r || !r.msg) return; V.msg = r.msg; V.msgOk = r.ok !== false; V.msgT = Date.now(); V.html = ''; }
  const mm = m => m >= 90 ? `${Math.round(m / 6) / 10} h` : `${Math.round(m)} min`;
  function panel(st) {
    if (!mount()) return; const m = $('pg'); m.classList.toggle('on', V.on); document.body.classList.toggle('pg-on', V.on); m.className = (V.on ? 'on ' : '') + 'tab-' + V.tab;
    if (!V.on) { if (m.innerHTML) m.innerHTML = ''; V.html = ''; return; }
    const P = plan(st), lv = V.layer === 'su' ? null : 'ug', C = CN().covoOf(st, (V.cam || st.player).x, (V.cam || st.player).y, lv), B = bom(st), links = digLinks(st), ph = phone();
    const modes = [['pezzi', 'Pezzi'], ['terreno', 'Terreno'], ['sotto', 'Sotto']].map(([k, l]) => `<button class="${V.mode === k ? 'on' : ''}" data-a="mode" data-x="${k}">${l}</button>`).join('') + (ph ? [['distinta', 'Distinta'], ['coda', 'Lavori']].map(([k, l]) => `<button class="${V.tab === k ? 'on' : ''}" data-a="tab" data-x="${k}">${l}</button>`).join('') : '') + `<button data-a="esci">Esci${ph ? '' : ' · Y'}</button>`;
    const hd = `<div class="hd bx"><b>Progetto · ${esc(C ? C.name : 'nessun campo qui')}</b><small>${B.n ? `${B.n} lavori · ${B.cut + B.fill > .05 ? `terra: ${B.cut.toFixed(1)} m³ da togliere, ${B.fill.toFixed(1)} da portare · ` : ''}circa ${mm(B.mins / Math.max(1, B.crew))} ${B.crew ? `con ${B.crew} della banda` : 'da solo'}` : 'Il progetto è vuoto: scegli un pezzo, uno strumento del terreno o uno scavo.'}</small>${C ? '' : `<small>Qui fuori non hai un campo. <button data-a="reclama">Pianta qui il campo</button></small>`}<small class="k">${ph ? 'un dito: posa / pennello · due dita: sposta, avvicina, gira' : 'clic: posa · trascina: fila o pennello · R: gira il pezzo · destro trascinato: gira la vista · rotella: zoom · WASD: sposta · T: dall\'alto/di sbieco · Ctrl+Z / Ctrl+Y · Esc: lascia lo strumento'}</small></div>`;
    const view = `<button class="${V.top ? 'on' : ''}" data-a="top">${V.top ? 'Dall\'alto' : 'Di sbieco'}</button>`;
    // la barra in basso: i pezzi, gli strumenti del terreno, gli scavi
    let bar = '', tools = '';
    if (V.mode === 'pezzi') {
      const cats = PCATS.map(([k, l]) => `<button class="${V.cat === k ? 'on' : ''}" data-a="cat" data-x="${k}">${l}</button>`).join('');
      const cards = CN().B.filter(b => b.cat === V.cat && inPlan(b)).map(b => { const miss = CN().missing(st, b); return `<div class="card ${V.tool && V.tool.id === b.id ? 'on' : ''}" data-a="tool" data-x="${b.id}" title="${esc(b.desc || b.nome)}"><canvas data-th="${b.id}" width="96" height="96"></canvas><b>${esc(b.nome)}</b><small class="${miss.length ? 'n' : ''}">${b.cost ? Object.entries(b.cost).map(([k, q]) => `${esc(O().nm(k))} ${q}`).join(' · ') : 'gratis'}</small>${b.st ? `<small>${stationLine(st, b)}</small>` : ''}</div>`; }).join('');
      bar = `<div class="cats">${cats}${view}${msgHtml()}</div><div class="cards">${cards}</div>`;
    } else if (V.mode === 'terreno') {
      tools = `<div class="tools bx">${TERRA.map(([k, l, d]) => `<button class="${V.tool && V.tool.k === 'terra' && V.tool.op === k ? 'on' : ''}" data-a="brush" data-x="${k}" title="${esc(d)}">${l}</button>`).join('')}<label>Raggio ${V.r.toFixed(0)} m<input type="range" min="1" max="8" step="1" value="${V.r}" data-a="r"></label><label>Forza ${V.s.toFixed(1)} m<input type="range" min=".1" max="1.5" step=".1" value="${V.s}" data-a="s"></label></div>`;
      bar = `<div class="cats">${view}${msgHtml()}</div><div class="cards" style="font-size:12.5px;line-height:1.5;display:block">${V.tool && V.tool.k === 'terra' ? esc((TERRA.find(q => q[0] === V.tool.op) || [])[2] || '') + ' ' : 'Scegli un pennello a sinistra. '}Ocra: si scava. Cielo: si riporta. Le righe scure: ogni mezzo metro di quota. Verde: alberi e sassi da togliere.${B.cut + B.fill > .05 ? ` <b>Terra: ${B.cut.toFixed(1)} m³ da togliere, ${B.fill.toFixed(1)} m³ da portare</b>${B.fill > B.cut + 1 ? ' (la terra che manca si prende dai fossi attorno).' : '.'}` : ''}</div>`;
    } else {
      const ds = [3.2, 6, 9].map(d => `<button class="${Math.abs(V.depth - d) < .1 ? 'on' : ''}" data-a="depth" data-x="${d}">−${Math.round(d)} m</button>`).join('');
      const cards = DIGS.map(q => DIG(q.id)).map(d => `<div class="card ${V.tool && V.tool.id === d.id ? 'on' : ''}" data-a="dig" data-x="${d.id}" title="${esc(d.desc || '')}"><b>${esc(d.nome)}</b><small>${d.path ? 'trascina' : d.fp ? d.fp.join('×') : ''}${d.cost3 ? ' · travi 1 ogni 3' : d.cost ? ' · ' + Object.entries(d.cost).map(([k, q]) => `${esc(O().nm(k))} ${q}`).join(' · ') : ''}</small><small>${esc(d.desc || '')}</small></div>`).join('');
      bar = `<div class="cats"><button class="${V.layer === 'su' ? 'on' : ''}" data-a="layer" data-x="su">Superficie</button><button class="${V.layer !== 'su' ? 'on' : ''}" data-a="layer" data-x="giu">Sezione</button>${ds}${msgHtml()}</div><div class="cards">${cards}</div>`;
    }
    // la distinta e la coda
    const leg = `<div class="leg">${[['progetto', 'progetto'], ['manca', 'manca roba'], ['invalid', 'non si può'], ['attesa', 'aspetta'], ['corso', 'in corso']].map(([k, l]) => `<span><i style="background:${COL[k]}"></i>${l}</span>`).join('')}</div>`;
    const dist = `<h4>Distinta</h4>${B.rows.length ? B.rows.map(r => `<div class="row"><span>${esc(r.nome)}</span><span class="${r.miss ? 'n' : 'y'}">${Math.min(r.have, r.need)}/${r.need}${r.miss ? ` · manca ${r.miss}` : ''}</span></div>`).join('') : '<div class="row"><span>Niente da comprare.</span></div>'}${B.tools.length ? `<h4>Attrezzi</h4>${B.tools.map(t => `<div class="row"><span>${esc(t.nome)}</span><span class="${t.ok ? 'y' : 'n'}">${t.ok ? 'ce l\'hai' : 'manca'}</span></div>`).join('')}` : ''}<h4>Chi lavora</h4><div class="row"><span>${B.crew ? `${B.crew} della banda` : 'Nessuno della banda: lavori tu'}</span><span>${mm(B.mins / Math.max(1, B.crew))}</span></div>`;
    const Q = queue(st), qh = Q.slice(0, 40).map((it, k) => { const S1 = it.st === 'corso' ? { s: 'corso', why: '' } : (it._s || stateOf(st, it, links)), pr = it.st === 'corso' ? progress(st, it) : 0, w = it.st === 'corso' ? workingOn(st, it).map(n => n.first).concat(P.work === it.pid ? ['tu'] : []) : [];
      return `<div class="q"><i style="background:${COL[S1.s] || COL.progetto}"></i><div>${esc(labelOf(it))}<em>${S1.s === 'corso' ? `${Math.round(pr * 100)}% · ${w.length ? esc(w.join(', ')) : 'nessuno ci lavora'}` : esc(S1.why || (P.go ? 'in coda' : 'in progetto'))}</em>${S1.s === 'corso' ? `<div class="bar"><span style="width:${Math.round(pr * 100)}%"></span></div>` : ''}</div><span>${k ? `<button data-a="su" data-x="${it.pid}">↑</button>` : ''}<button data-a="vai" data-x="${it.pid}">◎</button></span></div>`; }).join('');
    const side = `<div class="side bx">${leg}${V.tab === 'coda' && ph ? '' : dist}<h4>Lavori ${Q.length ? `(${Q.length})` : ''}</h4>${qh || '<div class="row"><span>La coda è vuota.</span></div>'}<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="go ${P.go ? 'pausa' : ''}" data-a="go" ${Q.length ? '' : 'disabled'}>${P.go ? 'Pausa' : 'Avvia i lavori'}</button><button data-a="undo" ${H.undo.length ? '' : 'disabled'}>Annulla</button><button data-a="redo" ${H.redo.length ? '' : 'disabled'}>Rifai</button></div>${!B.crew && Q.length ? '<small style="display:block;margin-top:6px;color:rgba(233,220,188,.7)">Senza banda: avvia, esci dalla vista e tocca l\'ologramma in corso per lavorarci tu.</small>' : ''}</div>`;
    const sp = V.sel && byPid(st, V.sel), sel = sp ? `<div class="sel bx"><b style="font:400 18px 'Instrument Serif',serif">${esc(labelOf(sp))}</b>${sp.k === 'pezzo' && sp.st !== 'corso' ? '<button data-a="gira">Gira</button><button data-a="sposta">Sposta</button>' : ''}<button data-a="su" data-x="${sp.pid}">Prima</button><button data-a="togli">Togli</button>${(sp._s && sp._s.why) ? `<small style="max-width:240px">${esc(sp._s.why)}</small>` : ''}</div>` : '';
    const fab = `<div class="fab">${V.tool && V.tool.k === 'pezzo' ? '<button data-a="ruota" title="Gira">↻</button>' : ''}${V.tool ? '<button data-a="lascia" title="Lascia">✕</button>' : ''}<button data-a="undo" title="Annulla">↶</button></div>`;
    const html = `${hd}<div class="modes bx">${modes}</div>${tools}${side}${sel}${fab}<div class="bar2 bx">${bar}</div><div class="tip ${V.why && /^(Si sovrappone|Fuori|In città|Sotto terra è|Oltre|Lì sopra|Dentro|Sotto le case|Troppo|Qui è già|Sul selciato|Il pozzo|Si monta)/.test(V.why) ? 'no' : ''}" id="pgTip" style="display:none"></div>`;
    if (html !== V.html) { const cc = m.querySelector('.cards'), sc = cc ? cc.scrollLeft : 0, sd = m.querySelector('.side'), ss = sd ? sd.scrollTop : 0; m.innerHTML = html; V.html = html; const c2 = m.querySelector('.cards'); if (c2) c2.scrollLeft = sc; const s2 = m.querySelector('.side'); if (s2) s2.scrollTop = ss;
      m.querySelectorAll('canvas[data-th]').forEach(c => { const b = pieceB(c.dataset.th); if (!b || typeof MenuUI === 'undefined' || !MenuUI.thumbFor) return; const t = MenuUI.thumbFor('covo:' + b.id, () => CN().model(b, 7)); if (t) c.getContext('2d').drawImage(t, 0, 0, 128, 128, 0, 0, 96, 96); }); }
  }
  const msgHtml = () => V.msg && Date.now() - V.msgT < 5000 ? `<span class="msg ${V.msgOk ? '' : 'no'}">${esc(V.msg)}</span>` : '';
  // le postazioni: cosa ci si fa (le ricette di quel banco), quante ne puoi fare adesso
  function stationLine(st, b) { try { const RC = O().RECIPES, ids = Object.keys(RC).filter(k => RC[k].st && RC[k].st.split('|').some(s => s === b.st || s === b.st2)); if (!ids.length) return ''; const outs = ids.slice(0, 3).map(k => { const o = RC[k].out; const k0 = o ? (Array.isArray(o) ? (o[0] && (o[0].k || o[0][0])) : Object.keys(o)[0]) : null; return k0 ? O().nm(k0) : ''; }).filter(Boolean); return `${ids.length} ricette: ${esc(outs.join(', '))}${ids.length > 3 ? '…' : ''}`; } catch (e) { return ''; } }
  // le etichette sopra i cantieri in corso (anche fuori dalla vista): nome, percentuale, chi
  function labels(st) {
    const el = $('pgLab'); if (!el) return; const P = st.covo && st.covo.plan, r = R(); if (!P || !r) { if (el.innerHTML) el.innerHTML = ''; return; }
    const p = st.player, on = P.items.filter(i => i.st === 'corso' && ((i.lv || null) === (p.lv && p.lv.k === 'ug' ? 'ug' : null) || V.on)).map(i => [Math.hypot(i.x - p.x, i.y - p.y), i]).filter(q => q[0] < 70).sort((a, b) => a[0] - b[0]).slice(0, 6);
    const W = el.clientWidth || innerWidth, Hh = el.clientHeight || innerHeight;
    const h = on.map(([d, it]) => { const pr = r.project(it.x, (it.k === 'pezzo' ? geoOf(it.id).h : 1) + .6, it.y); if (pr.behind || pr.x < 0 || pr.x > 1 || pr.y < 0 || pr.y > 1) return ''; const w = workingOn(st, it).map(n => n.first).concat(P.work === it.pid ? ['tu'] : []); return `<div class="lab" style="left:${(pr.x * W).toFixed(0)}px;top:${(pr.y * Hh).toFixed(0)}px">${esc(labelOf(it))} ${Math.round(progress(st, it) * 100)}%${w.length ? ' · ' + esc(w.join(', ')) : !V.on ? ' · tocca per lavorarci' : ''}</div>`; }).join('');
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  }
  function onUi(e) {
    const st = PV() && PV().st; if (!st) return; const t = e.target.closest('[data-a]'); if (!t) return; const a = t.dataset.a, x = t.dataset.x;
    if (e.type === 'input') { if (a === 'r') V.r = +t.value; if (a === 's') V.s = +t.value; V.html = ''; return; }
    if (a === 'mode') { V.mode = x; V.tool = null; V.row = null; if (x === 'sotto') V.layer = 'giu'; else V.layer = 'su'; if (phone()) V.tab = 'pezzi'; }
    if (a === 'tab') V.tab = V.tab === x ? 'pezzi' : x;
    if (a === 'cat') { V.cat = x; V.tool = null; }
    if (a === 'tool') { V.tool = V.tool && V.tool.id === x ? null : { k: 'pezzo', id: x }; V.sel = null; }
    if (a === 'brush') { V.tool = V.tool && V.tool.op === x ? null : { k: 'terra', op: x }; V.sel = null; }
    if (a === 'dig') { V.tool = V.tool && V.tool.id === x ? null : { k: 'scavo', id: x }; V.sel = null; V.layer = 'giu'; }
    if (a === 'depth') V.depth = +x;
    if (a === 'layer') V.layer = x;
    if (a === 'top') V.top = !V.top;
    if (a === 'esci') toggle(false);
    if (a === 'reclama') say({ ok: true, msg: CN().claim(st) });
    if (a === 'go') say(go(st));
    if (a === 'undo') say(undo(st));
    if (a === 'redo') say(redo(st));
    if (a === 'su') say(prio(st, x, k0(st, x) ? -1 : 'top'));
    if (a === 'vai') { const it = byPid(st, x); if (it) { V.cam = { x: it.x, y: it.y }; V.sel = it.pid; if (it.k === 'scavo' || it.lv === 'ug') V.layer = 'giu'; } }
    if (a === 'gira' && V.sel) say(rotateItem(st, V.sel, 1));
    if (a === 'togli' && V.sel) { say(removeItem(st, V.sel)); V.sel = null; }
    if (a === 'sposta' && V.sel) { const it = byPid(st, V.sel); if (it) { V.moving = it.pid; V.tool = { k: 'pezzo', id: it.id, move: it.pid }; V.rot = it.rot; say({ ok: true, msg: 'Scegli dove metterlo.' }); } }
    if (a === 'ruota') V.rot += Math.PI / 2;
    if (a === 'lascia') { V.tool = null; V.row = null; V.moving = null; }
    V.html = ''; panel(st);
  }
  const k0 = (st, pid) => queue(st).findIndex(i => i.pid === pid) > 0;

  // =====================================================================================================================
  // ENTRARE, USCIRE, LA CAMERA, LE MANI
  // =====================================================================================================================
  function toggle(on) {
    const pv = PV(), st = pv && pv.st; if (!st) return; const was = V.on; V.on = on === undefined ? !V.on : !!on; if (was === V.on) return;
    const ui = pv.ui;
    if (V.on) { if (CN().active && CN().state.on) CN().toggle(false); V.cam = { x: st.player.x, y: st.player.y }; V.zoom0 = ui.zoom; V.top0 = ui.top; ui.zoom = Math.max(ui.zoom || 1, 1.1); ui.top = V.top; V.layer = st.player.lv && st.player.lv.k === 'ug' ? 'giu' : 'su'; V.mode = V.layer === 'giu' ? 'sotto' : 'pezzi'; V.tool = null; V.sel = null; V.tab = 'pezzi'; if (typeof MenuUI !== 'undefined' && MenuUI.state && MenuUI.state.open) MenuUI.close(); say({ ok: true, msg: 'La vista progettuale: la mappa vera, il progetto in trasparenza.' }); }
    else { ui.top = V.top0; if (V.zoom0) ui.zoom = V.zoom0; V.tool = null; V.sel = null; V.row = null; V.hover = null; }
    V.html = ''; panel(st);
  }
  const focus = () => V.on && V.cam ? V.cam : null;
  // il punto del suolo sotto il puntatore: il raggio della camera contro il terreno vero (tre passi sul piano alla quota trovata);
  // nella sezione di sotto, contro il piano del fondo alla profondità scelta
  let RAY = null;
  function screenGround(nx, ny) {
    const r = R(), st = PV().st; if (!r || !r.camera) return r && r.screenToGround ? r.screenToGround(nx, ny) : null;
    if (!RAY) RAY = { rc: new THREE.Raycaster(), pl: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v: new THREE.Vector3(), n: new THREE.Vector2() };
    const u = r.gonfia ? r.gonfia(nx, ny) : [nx, ny]; RAY.n.set(u[0] * 2 - 1, 1 - u[1] * 2); RAY.rc.setFromCamera(RAY.n, r.camera);
    const c0 = V.cam || st.player; let h = gH(st, c0.x, c0.y, null); if (V.layer !== 'su') h -= V.depth;
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
    V.hover = screenGround(nx, ny); const tl = V.tool;
    if (!tl) { const it = pickItem(st, V.hover); V.sel = it ? it.pid : null; V.html = ''; PT.act = it && it.k === 'pezzo' && it.st !== 'corso' && !it.paid ? { k: 'trascina', pid: it.pid, gx: V.hover.x, gy: V.hover.y, x0: it.x, y0: it.y, rem: false } : { k: 'pan' }; return; }
    if (tl.k === 'pezzo') { const b = pieceB(tl.id); PT.act = { k: 'fila', a: V.hover, one: !!(b.fp && b.fp[0] === 1 && b.fp[1] === 1) || !b.fp }; V.row = [[V.hover.x, V.hover.y]]; return; }
    if (tl.k === 'terra') { remember(st); PT.act = { k: 'pennello', h0: gH(st, V.hover.x, V.hover.y, null), last: null }; brush(st, V.hover); return; }
    if (tl.k === 'scavo') { const d = DIG(tl.id); PT.act = { k: 'scavo', path: !!d.path, a: tileOf(V.hover.x, V.hover.y) }; V.row = d.path ? [tileOf(V.hover.x, V.hover.y)] : null; return; }
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
    if (A.k === 'scavo' && A.path) { const t = tileOf(V.hover.x, V.hover.y), L0 = V.row[V.row.length - 1]; if (t[0] !== L0[0] || t[1] !== L0[1]) { lineTiles(L0, t).slice(1).forEach(q => { if (!V.row.some(r => r[0] === q[0] && r[1] === q[1])) V.row.push(q); }); } return; }
  }
  function pup(e) {
    if (!V.on) return; const q = PT.list.get(e.pointerId); if (!q) return; e.stopImmediatePropagation(); PT.list.delete(e.pointerId); const st = PV().st;
    if (PT.list.size) { PT.two = null; if (PT.list.size === 1) PT.act = { k: 'pan' }; return; } if (PT.two) { PT.two = null; PT.act = null; return; }
    const A = PT.act; PT.act = null; if (!A) return;
    if (A.k === 'fila') { const pts = V.row && V.row.length ? V.row : [[A.a.x, A.a.y]]; const tl = V.tool;
      if (tl.move) { say(moveItem(st, tl.move, pts[0][0], pts[0][1], V.rot)); V.tool = null; V.moving = null; }
      else { remember(st); let n = 0, last = null; pts.forEach(([x, y]) => { const r = addPiece(st, tl.id, x, y, V.rot, V.layer === 'su' ? null : 'ug', true); if (r.ok) n++; last = r; }); if (!n) H.undo.pop(); say(n > 1 ? { ok: true, msg: `${pieceB(tl.id).nome}: ${n} nel progetto.` } : last); }
      V.row = null; V.html = ''; return; }
    if (A.k === 'pennello') { say({ ok: true, msg: `Terreno: ${volOf(st).cut.toFixed(1)} m³ da togliere, ${volOf(st).fill.toFixed(1)} da portare.` }); return; }
    if (A.k === 'scavo') { const tl = V.tool, d = DIG(tl.id), tiles = d.path ? V.row : digTilesAt(tl.id, V.hover.x, V.hover.y), fl = digFloor(st, tiles[0][0], tiles[0][1], V.depth); say(addDig(st, tl.id, tiles, fl.f)); V.row = null; return; }
    if (A.k === 'trascina' && A.rem) say({ ok: true, msg: 'Spostato nel progetto.' });
    if (A.k === 'pan' && !q.moved && !V.tool) { /* un tocco su un posto vuoto: deseleziona */ }
  }
  function brush(st, g) { const A = PT.act; if (A.last && Math.hypot(g.x - A.last.x, g.y - A.last.y) < Math.max(.6, V.r * .35)) return; A.last = { x: g.x, y: g.y }; sculpt(st, V.tool.op, g.x, g.y, V.r, V.s, A.h0); }
  function lineTiles(a, b) { const out = []; let [x0, y0] = a; const [x1, y1] = b, dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0); if (dx >= dy) { const s = Math.sign(x1 - x0) || 1; for (let i = 0; i <= dx; i++) out.push([x0 + i * s, y0]); } else { const s = Math.sign(y1 - y0) || 1; for (let i = 0; i <= dy; i++) out.push([x0, y0 + i * s]); } return out; }   // in fila dritta, come i muri
  function panBy(dx, dy, r0) { const r = R(), yaw = r && r.cam && r.cam.yaw !== undefined ? r.cam.yaw : 0, k = (PV().ui.zoom || 1) * 60 / Math.max(300, r0.height); const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw); V.cam.x -= (dx * rx - dy * fx) * k; V.cam.y -= (dx * rz - dy * fz) * k; clampCam(); }
  function clampCam() { const st = PV().st, p = st.player, d = Math.hypot(V.cam.x - p.x, V.cam.y - p.y), M0 = 90; if (d > M0) { V.cam.x = p.x + (V.cam.x - p.x) / d * M0; V.cam.y = p.y + (V.cam.y - p.y) / d * M0; } }
  function pickItem(st, g) { if (!g) return null; const lv = V.layer === 'su' ? null : 'ug'; let best = null, bd = 1.2; items(st).forEach(it => { if (it.k === 'terra') return; if (it.k === 'pezzo' && (it.lv || null) !== lv) return; if (it.k === 'scavo' && lv !== 'ug') return; const d = it.k === 'scavo' ? (it.tiles.some(([tx, ty]) => Math.floor(g.x / TS()) === tx && Math.floor(g.y / TS()) === ty) ? 0 : 9) : Math.hypot(it.x - g.x, it.y - g.y) - siteR(it) * .8; if (d < bd) { bd = d; best = it; } }); return best; }
  function wheel(e) { if (!V.on) return; e.stopImmediatePropagation(); e.preventDefault(); const ui = PV().ui; if (V.tool && V.tool.k === 'pezzo' && (e.shiftKey || e.altKey)) { V.rot += (e.deltaY > 0 ? 1 : -1) * Math.PI / 2; return; } ui.zoom = clamp((ui.zoom || 1) * (e.deltaY > 0 ? 1.12 : 1 / 1.12), .35, 2.6); }
  const KEYS = {};
  function key(e) {
    const k = e.key.toLowerCase(), st = PV().st;
    if (!V.on) { if (k === 'y' && !e.repeat && wantVista(st)) { e.preventDefault(); e.stopImmediatePropagation(); toggle(true); return true; } return false; }
    if (e.type === 'keyup') { KEYS[k] = false; return true; }
    e.stopImmediatePropagation();
    if (/^[wasdqe]$|^arrow/.test(k)) { e.preventDefault(); KEYS[k] = true; return true; }
    if (k === 'y' && !e.repeat) { toggle(false); return true; }
    if (k === 'escape') { e.preventDefault(); if (V.tool || V.sel) { V.tool = null; V.sel = null; V.row = null; V.moving = null; V.html = ''; } else toggle(false); return true; }
    if (k === 'r') { e.preventDefault(); if (V.tool && V.tool.k === 'pezzo') V.rot += (e.shiftKey ? -1 : 1) * (pieceB(V.tool.id).fp ? Math.PI / 2 : Math.PI / 4); else if (V.sel) say(rotateItem(st, V.sel, e.shiftKey ? -1 : 1)); return true; }
    if (k === 't') { V.top = !V.top; PV().ui.top = V.top; V.html = ''; return true; }
    if ((k === 'z') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); say(e.shiftKey ? redo(st) : undo(st)); return true; }
    if ((k === 'y') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); say(redo(st)); return true; }
    if ((k === 'delete' || k === 'backspace') && V.sel) { e.preventDefault(); say(removeItem(st, V.sel)); V.sel = null; return true; }
    if (k === 'tab') { e.preventDefault(); V.mode = V.mode === 'pezzi' ? 'terreno' : V.mode === 'terreno' ? 'sotto' : 'pezzi'; V.layer = V.mode === 'sotto' ? 'giu' : 'su'; V.tool = null; V.html = ''; return true; }
    if (k === 'enter') { e.preventDefault(); say(go(st)); return true; }
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
  // il suggerimento accanto al puntatore
  function tipTick() { const el = $('pgTip'); if (!el) return; if (!V.on || !V.tool || !V.hover || !V.why) { el.style.display = 'none'; return; } const r = R(), pr = r.project(V.hover.x, 1.2, V.hover.y), W = $('pg').clientWidth, Hh = $('pg').clientHeight; el.style.display = 'block'; el.style.left = (pr.x * W) + 'px'; el.style.top = (pr.y * Hh) + 'px'; el.textContent = V.why; el.className = 'tip' + (/^(Si sovrappone|Fuori|In città|Sotto terra è|Oltre|Lì sopra|Dentro|Sotto le case|Troppo|Qui è già|Sul selciato|Il pozzo|Si monta|Pezzo)/.test(V.why) ? ' no' : ''); }
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
    try { const st = PV() && PV().st; if (st) { const now = performance.now(), dt = Math.min(.1, (now - (LOOPT || now)) / 1000); LOOPT = now; camTick(dt); const t0 = performance.now(); sceneSync(st); V.cost = (V.cost || 0) * .95 + (performance.now() - t0) * .05; tipTick(); if (now - (V.pt || 0) > (V.on ? 160 : 400)) { V.pt = now; panel(st); labels(st); } } } catch (e) { if (!V.err) { V.err = 1; console.error('[Progetto]', e); } }
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
  return { ON, V, plan, items, addPiece, addDig, digRect, moveItem, rotateItem, removeItem, prio, undo, redo, sculpt, volOf, syncTerra, bom, queue, stateOf, step, go, finish, progress, workHere, checkPiece, checkDig, digFloor, digLinks, needOf, labelOf, toggle, focus, active: () => V.on, DIGS, DIG, TERRA, PCATS, turnoDone, cost: () => V.cost || 0 };
})();
if (typeof module !== 'undefined') module.exports = Progetto;
