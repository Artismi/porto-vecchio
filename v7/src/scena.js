/* Porto Vecchio — [segni] IL REGISTA DELLE PAGINE (solo nella città nuova).
   «Ogni scorcio, angolo, piazzetta e muro è una pagina»: una parete (una facciata vista dalla camera), uno sbocco (dove un vicolo
   entra in una via o in una piazza), una piazzetta, un angolo d'isolato. Ogni pagina ha epoca, rango, lato camera, fondale e una
   gabbia (le righe sono lo zoccolo e i marcapiani, le colonne gli assi dei moduli e del portone). Il regista sceglie per ogni pagina
   un'impaginazione dal CATALOGO nominato (mai per hash dove va una cosa: l'hash decide al massimo quale impaginazione), poi i sistemi
   di arredo di render.js chiedono uno slot con chiedi(x, z, voce) prima di posare: se la pagina non prevede quella voce, niente.
   Regole della LEGGIBILITA.md sez. 5: 1 dominante, ≤ 3 secondari, ≤ 2 accenti, 30-40% delle pagine solo materiale e un accento,
   mai due dominanti della stessa famiglia a meno di 15 m, mai la stessa impaginazione a meno di 3 pagine lungo la stessa via.
   Nessuna grafica: lo usano render.js e rete.js; gira anche in Node (test_segni.js). Coordinate in metri, x est, z sud. */
var Scena = (function () {
  'use strict';
  const MG = 3.6, MF = 2.4;   // piano terra e piani (le stesse di render.js)
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  // ---- il catalogo: nome → tipo di pagina, epoche, dominante, secondari, accenti; quiete = solo materiale e un accento ----
  // le voci sono i nomi che i sistemi chiedono: insegna, lampada_braccio, tenda, merce, targa, civico, vaso, manifesti, tag, sticker,
  // buff, ritratto, stencil, edicola_votiva, bucato, abusivo, antenna, dehors, fioriera, lampione, cassonetti, bidone, motorino,
  // cassetta_postale, cabina_sip, bitta, rete, panchina, gesso, moncone, cartello, impalcatura, transenne, lavagna, paletti, alberi
  const CATALOGO = {
    // E0 il borgo
    bottega_del_borgo: { tipo: 'parete', ere: ['E0', 'E2'], porta: true, bottega: true, dom: 'insegna', sec: ['lampada_braccio', 'tenda', 'merce'], acc: ['targa', 'vaso'] },
    casa_del_borgo: { tipo: 'parete', ere: ['E0'], dom: 'bucato', sec: ['abusivo', 'bidone', 'lampada_braccio'], acc: ['civico', 'vaso'] },
    bar_col_dehors: { tipo: 'parete', bar: true, porta: true, dom: 'dehors', sec: ['tenda', 'fioriera', 'lavagna'], acc: ['civico', 'targa'] },
    palinsesto_del_vicolo: { tipo: 'parete', ere: ['E0', 'E2'], dom: 'manifesti', sec: ['tag', 'abusivo', 'bidone'], acc: ['civico', 'sticker'] },
    lampada_e_targa: { tipo: 'parete', ere: ['E0', 'E2'], dom: 'lampada_braccio', sec: ['targa', 'bucato', 'bidone'], acc: ['civico', 'antenna'] },
    muro_di_calce: { tipo: 'parete', ere: ['E0', 'E2'], quiete: true, acc: ['antenna'] },
    angolo_nudo: { tipo: 'angolo', quiete: true, acc: ['targa'] },
    spigolo_con_edicola: { tipo: 'angolo', ere: ['E0'], dom: 'edicola_votiva', sec: ['lampada_braccio', 'targa'], acc: ['civico'] },
    // E2 la marina
    casa_del_pescatore: { tipo: 'parete', ere: ['E2'], dom: 'rete', sec: ['bucato', 'vaso', 'antenna'], acc: ['civico'] },
    osteria_sul_porto: { tipo: 'parete', ere: ['E2'], porta: true, bottega: true, dom: 'insegna', sec: ['tenda', 'dehors', 'lampada_braccio'], acc: ['targa', 'lavagna'] },
    angolo_della_marina: { tipo: 'angolo', ere: ['E2'], dom: 'bitta', sec: ['lampada_braccio', 'rete'], acc: ['targa'] },
    // E3 l'Ottocento
    portone_ottocento: { tipo: 'parete', ere: ['E3'], porta: true, dom: 'portone', sec: ['targa', 'civico', 'lampione'], acc: ['cassetta_postale', 'antenna'] },
    manifesti_elettorali: { tipo: 'parete', ere: ['E3'], dom: 'manifesti', sec: ['tag', 'antenna'], acc: ['sticker', 'civico'] },
    bugnato_quieto: { tipo: 'parete', ere: ['E3'], quiete: true, acc: ['targa'] },
    angolo_murattiano: { tipo: 'angolo', ere: ['E3'], dom: 'insegna', sec: ['targa', 'lampione', 'cassonetti'], acc: ['civico'] },
    // E4 lo sventramento
    testata_del_regime: { tipo: 'parete', ere: ['E4', 'E3', 'E6'], cieca: 4, dom: 'ritratto', sec: ['stencil', 'buff'], acc: ['moncone'] },
    portico_lapidario: { tipo: 'parete', ere: ['E4'], porta: true, dom: 'insegna', sec: ['lampione', 'cartello'], acc: ['civico', 'stencil'] },
    travertino_quieto: { tipo: 'parete', ere: ['E4'], quiete: true, acc: ['stencil'] },
    angolo_del_regime: { tipo: 'angolo', ere: ['E4'], dom: 'lampione', sec: ['stencil', 'cartello'], acc: ['moncone'] },
    // E6 il boom
    serranda_e_neon: { tipo: 'parete', ere: ['E6'], porta: true, dom: 'insegna', sec: ['cassonetti', 'cabina_sip', 'abusivo'], acc: ['sticker', 'civico'] },
    cemento_taggato: { tipo: 'parete', ere: ['E6'], dom: 'tag', sec: ['manifesti', 'buff', 'abusivo'], acc: ['sticker', 'cartello'] },
    pannelli_quieti: { tipo: 'parete', ere: ['E6'], quiete: true, acc: ['sticker'] },
    cantiere: { tipo: 'parete', ere: ['E6', 'E3'], raro: 3, dom: 'impalcatura', sec: ['transenne', 'cartello'], acc: [] },
    angolo_del_boom: { tipo: 'angolo', ere: ['E6'], dom: 'cassonetti', sec: ['lampione', 'cartello', 'tag'], acc: ['sticker'] },
    // E7 le baracche
    lamiera_e_fili: { tipo: 'parete', ere: ['E7'], dom: 'abusivo', sec: ['antenna', 'bidone', 'bucato'], acc: ['vaso'] },
    baracca_quieta: { tipo: 'parete', ere: ['E7'], quiete: true, acc: ['abusivo'] },
    // sbocchi, piazzette
    sbocco_sul_mare: { tipo: 'sbocco', fondale: 'mare', dom: 'bitta', sec: ['rete', 'lampada_braccio'], acc: ['gesso'] },
    sbocco_sulla_via: { tipo: 'sbocco', dom: 'motorino', sec: ['paletti', 'targa', 'bidone'], acc: ['gesso'] },
    piazzetta_col_bar: { tipo: 'piazzetta', set: 'piazzetta', bar: true, dom: 'dehors', sec: ['lampada_braccio', 'fioriera', 'panchina'], acc: ['gesso', 'vaso'] },
    piazzetta_del_forno: { tipo: 'piazzetta', set: 'piazzetta', dom: 'merce', sec: ['panchina', 'vaso'], acc: ['gesso'] },
    sagrato: { tipo: 'piazzetta', set: 'sagrato', dom: 'alberi', sec: ['panchina', 'cabina_sip', 'edicola_giornali'], acc: ['gesso'] },
    marina: { tipo: 'piazzetta', set: 'marina', dom: 'dehors', sec: ['rete', 'merce', 'bitta'], acc: ['gesso'] },
    mercato: { tipo: 'piazzetta', set: 'mercato', dom: 'tettoia', sec: ['banchi', 'cassonetti', 'bidone'], acc: ['gesso'] },
    adunata: { tipo: 'piazzetta', set: 'adunata', dom: 'dehors', sec: ['panchina', 'edicola_giornali', 'cabina_sip'], acc: ['gesso'] },   // [cucitura] la Piazza Grande (l'ex adunata): il caffè, non il palco
  };
  for (const k in CATALOGO) CATALOGO[k].nome = k;
  // le famiglie dei dominanti (mai due della stessa famiglia a meno di 15 m)
  // il raggio entro cui due dominanti della stessa famiglia non stanno insieme (i ritratti e i cantieri sono rari per definizione)
  const RAGGIO = { insegna: 15, ritratto: 40, carta: 15, cantiere: 60, filo: 10, arredo: 10, nicchia: 12, palo: 10, portone: 0 };
  const RMAX = Math.max(...Object.values(RAGGIO));   // [volumi2] la ricerca dei vicini deve coprire il raggio di famiglia più grande
  const FAMIGLIA = { insegna: 'insegna', ritratto: 'ritratto', manifesti: 'carta', tag: 'carta', bucato: 'filo', abusivo: 'filo', rete: 'filo', dehors: 'arredo', merce: 'arredo', edicola_votiva: 'nicchia', portone: 'portone', impalcatura: 'cantiere', cassonetti: 'arredo', lampione: 'palo', bitta: 'arredo', motorino: 'arredo' };
  // l'altezza della riga di ogni voce sulla parete (dalla base della casa) e la colonna preferita
  const RIGA = { insegna: MG - .55, lampada_braccio: 3.9, tenda: MG - .9, merce: 0, targa: 2.5, civico: 2.2, vaso: 1.1, manifesti: 1.5, tag: 1.6, sticker: 1.4, buff: 1.5, ritratto: 0, stencil: 1.2, edicola_votiva: 2.6, bucato: MG + 1.0, abusivo: MG + 1.2, antenna: 0, dehors: 0, cassonetti: 0, bidone: 0, cassetta_postale: 1.3, cabina_sip: 0, moncone: MG - .2, cartello: 2.2, impalcatura: 0, lampione: 0, portone: 0, mensola: MG - .2, lavagna: 0, rete: 2.4, fioriera: 0, motorino: 0, paletti: 0 };
  // chi mette i tavolini fuori (b.use o b.shopFront.use del filone C)
  const DEHORS = { bar: 1, caffe: 1, caffè: 1, trattoria: 1, osteria: 1, gelateria: 1, pub: 1, pizzeria: 1, pasticceria: 1, latteria: 1 };
  let S = null, G = null, cieche = null, ritratto = null;
  const open = v => v === G.T.VIA || v === G.T.WALK || v === G.T.PIAZZA || v === G.T.COB || v === G.T.QUAY || v === G.T.DIRT;
  const tl = (tx, ty) => (tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH) ? -1 : G.tileAt(tx, ty);
  // il fondale di una pagina: cosa c'è dietro il muro guardando dalla camera (verso nord-ovest): il mare, il cielo (niente), una facciata
  function fondale(x, z) { const TS = G.TS; let bld = 0; for (let d = 4; d <= 40; d += 2) { const v = tl(Math.floor((x - d * .7) / TS), Math.floor((z - d * .7) / TS)); if (v === G.T.WATER) return 'mare'; if (v === G.T.BLD) bld++; } return bld > 3 ? 'facciata' : 'cielo'; }
  // ---- costruzione delle pagine ----
  function init(G0, opt) {
    G = G0; opt = opt || {}; cieche = opt.cieche || null; ritratto = opt.ritratto || null; const TS = G.TS, M = G.MAP, W = M.world, B = G.BUILDINGS, roads = M.roads || [];
    if (!W || !W.sets) { S = null; return null; }
    PIANO = null; S = { pagine: [], muro: new Map(), celle: new Map(), presi: 0, negati: 0, perVoce: {}, rari: {} };
    const cella = (x, z) => Math.floor(x / 12) * 65536 + Math.floor(z / 12);
    const reg = p => { S.pagine.push(p); p.id = S.pagine.length - 1; p.presi = { dom: [], sec: [], acc: [] }; p.extra = [];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const k = cella(p.x + i * 12, p.z + j * 12); (S.celle.get(k) || S.celle.set(k, []).get(k)).push(p); } return p; };
    // 1) le pareti: le facce S ed E (quelle che la camera vede) di ogni casa della città con la sua epoca, se davanti c'è strada o piazza
    B.forEach((b, bi) => { const era = b.shack ? 'E7' : b.era; if (!era || M.zone[b.y * G.GW + b.x] !== 1) return;
      const x0 = b.x * TS, z0 = b.y * TS, w = b.w * TS, d = b.h * TS, fl = Math.max(1, b.fl || 1), dF = !b.door ? null : b.door[1] === b.y + b.h ? 'S' : b.door[0] === b.x + b.w ? 'E' : null;
      [['S', b.w, w, u => [x0 + u, z0 + d], 0, [b.x + Math.floor(b.w / 2), b.y + b.h], b.door ? (b.door[0] - b.x) * TS + 1 : null],
       ['E', b.h, d, u => [x0 + w, z0 + d - u], Math.PI / 2, [b.x + b.w, b.y + Math.floor(b.h / 2)], b.door ? (b.y + b.h - b.door[1]) * TS - 1 : null]].forEach(([f, n, len, at, yaw, fr, du]) => {
        const v = tl(fr[0], fr[1]); if (!open(v)) return; const c = at(len / 2);
        // il davanti: via (quale, quanto larga), piazza, cortile
        let rd = null, bd = 1e9; roads.forEach(q => { if (!q.pts) return; for (const p of q.pts) { const dd = Math.hypot(p[0] - c[0], p[1] - c[1]); if (dd < bd && dd < q.w / 2 + 3.5) { bd = dd; rd = q; } } });
        const kk = cieche ? cieche(bi, f) : null, ciecaL = kk ? (() => { let run = 0, best = 0; for (let k = 0; k < n; k++) { run = kk.indexOf(k) >= 0 ? run + 1 : 0; best = Math.max(best, run); } return best * TS; })() : (du === null ? len : 0);
        reg({ tipo: 'parete', bi, b, f, era, rango: b.rk || 0, x: c[0], z: c[1], len, n, at, yaw, fl, porta: dF === f ? du : null, bottega: !!(b.shop || b.sign || (b.use && b.use !== 'casa')), bar: !!(DEHORS[b.use] || (b.shopFront && DEHORS[b.shopFront.use || b.use])), ciechi: kk, cieca: ciecaL, via: rd ? rd.id : null, viaW: rd ? rd.w : 0, vicolo: !!(rd && rd.kind === 'vicolo'), fondale: fondale(c[0], c[1]), colonne: Array.from({ length: n }, (_, k) => k * TS + 1) });
      });
      // l'angolo di sud-est, se tutte e due le facce guardano una strada
      const sOk = open(tl(b.x + b.w - 1, b.y + b.h)), eOk = open(tl(b.x + b.w, b.y + b.h - 1));
      if (sOk && eOk && b.rk >= 1) reg({ tipo: 'angolo', bi, b, era, rango: b.rk || 0, x: x0 + w, z: z0 + d, fl, fondale: 'facciata' });
    });
    // 2) gli sbocchi: dove un vicolo entra in una via più larga o in una piazza; l'asse punta dentro il vicolo
    roads.filter(q => q.kind === 'vicolo' && q.pts && q.pts.length >= 2 && q.era).forEach(q => { const P = q.pts;
      [[P[0], P[1]], [P[P.length - 1], P[P.length - 2]]].forEach(([e, i]) => { const L = Math.hypot(i[0] - e[0], i[1] - e[1]) || 1, ux = (i[0] - e[0]) / L, uz = (i[1] - e[1]) / L;
        const su = roads.some(o => o !== q && o.pts && o.w > q.w && o.pts.some(p => Math.hypot(p[0] - e[0], p[1] - e[1]) < o.w / 2 + 2.5)) || tl(Math.floor((e[0] - ux * 3) / TS), Math.floor((e[1] - uz * 3) / TS)) === G.T.PIAZZA; if (!su) return;
        // il fondale dello sbocco: quel che si vede in fondo all'asse (verso l'interno del vicolo)
        let fd = 'facciata'; for (let dd = 6; dd < 70; dd += 3) { const v = tl(Math.floor((e[0] + ux * dd) / TS), Math.floor((e[1] + uz * dd) / TS)); if (v === G.T.WATER) { fd = 'mare'; break; } }
        reg({ tipo: 'sbocco', via: q.id, era: q.era, rango: 1, x: e[0], z: e[1], ux, uz, w: q.w, fondale: fd }); }); });
    // 3) le piazzette e i nodi (le scenografie di world_cittanuova)
    W.sets.forEach(q => { if (q.k === 'calata') return; const x = q.x !== undefined ? q.x : (q.x0 + q.x1) / 2, z = q.y !== undefined ? q.y : (q.y0 + q.y1) / 2, r = q.r || Math.max(q.x1 - q.x0, q.y1 - q.y0) / 2;
      reg({ tipo: 'piazzetta', set: q.k, bar: !!q.bar, forno: !!q.forno, era: q.k === 'adunata' ? (q.civica ? 'E3' : 'E4') : q.k === 'mercato' ? 'E3' : q.k === 'marina' ? 'E2' : 'E0', rango: 3, x, z, r, fondale: fondale(x, z) }); });
    // ---- l'impaginazione per ogni pagina ----
    const vicine = (p, R) => { const out = [], n = Math.max(0, Math.ceil(R / 12) - 1), seen = new Set(); for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (const o of S.celle.get(cella(p.x + i * 12, p.z + j * 12)) || []) { if (o === p || !o.imp || seen.has(o)) continue; seen.add(o); if (Math.hypot(o.x - p.x, o.z - p.z) < R) out.push(o); } return out; };
    // ordine di assegnazione: per via e progressiva, così «mai la stessa a meno di 3 pagine» vale lungo la strada
    const ord = S.pagine.slice().sort((a, c) => (a.via || '') < (c.via || '') ? -1 : (a.via || '') > (c.via || '') ? 1 : (a.x + a.z) - (c.x + c.z));
    const L = Object.keys(CATALOGO).map(k => CATALOGO[k]);
    ord.forEach(p => {
      const h = hash(Math.round(p.x * 2), Math.round(p.z * 2), 1986), h2 = hash(Math.round(p.x * 2), Math.round(p.z * 2), 1987);
      let cand = L.filter(c => c.tipo === p.tipo && (!c.ere || c.ere.indexOf(p.era) >= 0) && (!c.set || c.set === p.set) && (c.bar === undefined || c.bar === !!p.bar) && (!c.porta || p.porta !== null) && (!c.bottega || p.bottega) && (!c.cieca || (p.cieca >= c.cieca && p.fl >= 2 && (!ritratto || ritratto(p.bi, p.f)))) && (!c.fondale || c.fondale === p.fondale) && (!c.raro || (S.rari[c.nome] || 0) < c.raro));
      if (p.tipo === 'parete' && p.bar && p.porta !== null) { p.imp = CATALOGO.bar_col_dehors; return; }   // il bar: la pagina è il dehors
      if (p.tipo === 'piazzetta' && p.set === 'piazzetta' && !p.bar) cand = cand.filter(c => c.nome !== 'piazzetta_col_bar');
      if (p.tipo === 'angolo') { const quiete = cand.filter(c => c.quiete), vive = cand.filter(c => !c.quiete); cand = (h < .5 || !vive.length) && quiete.length ? quiete : vive; }   // metà degli angoli nudi: una targa e basta
      if (p.tipo === 'parete') {   // la quiete al 35%: solo materiale e un accento (non sulle botteghe con la porta: lì la pagina è la bottega)
        const quiete = cand.filter(c => c.quiete), vive = cand.filter(c => !c.quiete);
        if ((h < .2 && !(p.bottega && p.porta !== null)) || !vive.length) cand = quiete.length ? quiete : cand; else cand = vive; }
      // la testata del regime prima di tutto dove può stare (ma non due a meno di 40 m); mai la stessa impaginazione delle 2 pagine vicine
      const near = vicine(p, 25), near15 = vicine(p, RMAX);   // [volumi2] il raggio di ricerca copre il raggio di famiglia più grande (il cantiere, 60 m): con 40 due impalcature a 49 m passavano
      let pref = cand.filter(c => c.nome === 'testata_del_regime' && !vicine(p, 40).some(o => o.imp.nome === 'testata_del_regime'));
      if (pref.length && h2 < .8) cand = pref;
      const usate = near.slice().sort((a, c) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(c.x - p.x, c.z - p.z)).slice(0, 2).map(o => o.imp.nome).concat(p.era === "E7" ? [] : near.filter(o => o.via === p.via && Math.hypot(o.x - p.x, o.z - p.z) < 8).map(o => o.imp.nome));   // [borgo] coi lotti stretti del borgo pieno tre pareti stanno in 7 m: nessuna ripete quelle della stessa via (fra le baracche sì: lamiera e fili ovunque)
      let scelte = cand.filter(c => usate.indexOf(c.nome) < 0 && !(c.dom && near15.some(o => o.imp.dom && FAMIGLIA[o.imp.dom] === FAMIGLIA[c.dom] && Math.hypot(o.x - p.x, o.z - p.z) < RAGGIO[FAMIGLIA[c.dom]])));
      // se le pagine vicine hanno già preso tutte le famiglie, questa tace: materiale e un accento (è il vuoto che fa leggere le altre)
      if (!scelte.length) scelte = L.filter(c => c.tipo === p.tipo && c.quiete && (!c.ere || c.ere.indexOf(p.era) >= 0)); if (!scelte.length) { const muta = cand.filter(c => !c.dom); scelte = muta.length ? muta : [{ nome: 'vuota', tipo: p.tipo, quiete: true, acc: [] }]; }   // [mappa_compatta] nella città più fitta: piuttosto che un secondo dominante vicino, la pagina tace
      p.imp = scelte[Math.floor(h2 * scelte.length) % scelte.length]; if (p.imp.raro) S.rari[p.imp.nome] = (S.rari[p.imp.nome] || 0) + 1;
    });
    S.pagine.forEach(p => { p.nome = p.imp.nome; p.dom = p.imp.dom || null; p.sec = (p.imp.sec || []).slice(0, 3); p.acc = (p.imp.acc || []).slice(0, 2); S.muro.set(p.bi + '|' + p.f, p); });
    // [scorci] la parete di uno scorcio è già composta (scorci.js): tace per gli altri sistemi di arredo
    if (typeof Scorci !== 'undefined' && Scorci && Scorci.attivo) Scorci.tutti().forEach(sc => { if (!sc.fr) return; const p = S.muro.get(sc.bi + '|' + sc.fr.f); if (!p) return;
      p.scorcio = sc.id; p.imp = { nome: 'scorcio', tipo: 'parete', quiete: true, acc: [] }; p.nome = 'scorcio'; p.dom = null; p.sec = []; p.acc = []; });
    return S;
  }
  const attivo = () => !!S;
  const pagine = () => S ? S.pagine : [];
  const paginaMuro = (bi, f) => S ? S.muro.get(bi + '|' + f) || null : null;
  // la pagina in cui cade un punto: la parete entro 1,6 m dal filo del muro, lo sbocco entro 5 m, la piazzetta entro r, l'angolo entro 3 m
  function paginaAt(x, z, tipo) {
    if (!S) return null; const k0 = Math.floor(x / 12) * 65536 + Math.floor(z / 12); let best = null, bd = 1e9;
    for (const p of S.celle.get(k0) || []) { if (tipo && p.tipo !== tipo) continue; let dd;
      if (p.tipo === 'parete') { const a = p.at(0), b = p.at(p.len), L = p.len, t = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / (L * L))); dd = Math.hypot(a[0] + (b[0] - a[0]) * t - x, a[1] + (b[1] - a[1]) * t - z); if (dd > 2.2) continue; }
      else if (p.tipo === 'sbocco') { dd = Math.hypot(p.x - x, p.z - z); if (dd > 5) continue; }
      else if (p.tipo === 'piazzetta') { dd = Math.hypot(p.x - x, p.z - z); if (dd > p.r + 1) continue; dd += 2; }
      else { dd = Math.hypot(p.x - x, p.z - z); if (dd > 3) continue; dd += 1; }
      if (dd < bd) { bd = dd; best = p; } }
    return best;
  }
  // la classe di una voce in una pagina: dominante, secondario, accento o niente
  const classe = (p, voce) => p.dom === voce ? 'dom' : p.sec.indexOf(voce) >= 0 ? 'sec' : p.acc.indexOf(voce) >= 0 ? 'acc' : null;
  // lo slot: dove sta la voce sulla gabbia della parete (u lungo il muro, y dalla base, colonna) — allineato all'asse del portone o a un modulo
  function slot(p, voce, cls, opt) {
    if (p.tipo !== 'parete') return { x: p.x, z: p.z, u: 0, y: 0 };
    const TS = G.TS, cols = p.colonne, du = p.porta, lato = opt && opt.lato ? opt.lato : (hash(p.bi, p.f === 'S' ? 1 : 2, 77) < .5 ? -1 : 1);
    let u; const liberi = cols.filter(c => (du === null || Math.abs(c - du) >= TS * .9) && (!p.ciechi || voce === 'mensola' || voce === 'lampada_braccio' || voce === 'bucato' || voce === 'abusivo' || voce === 'antenna' || voce === 'rete' || p.ciechi.indexOf(Math.round((c - 1) / TS)) >= 0 || RIGA[voce] >= MG));
    if (voce === 'insegna' || voce === 'tenda' || voce === 'portone') u = du !== null ? du : p.len / 2;   // sopra la porta
    else if (voce === 'ritratto' || voce === 'manifesti' || voce === 'tag' || voce === 'buff') { let run = [], best = []; (p.ciechi || cols.map((_, k) => k)).slice().sort((a, b) => a - b).forEach(k => { if (run.length && k === run[run.length - 1] + 1) run.push(k); else run = [k]; if (run.length > best.length) best = run.slice(); });
      if (!best.length) return null; u = (best[0] + best.length / 2) * TS; if (voce === 'ritratto' && best.length * TS < 4) return null; if (voce !== 'ritratto') u = best.length > 1 && lato > 0 ? (best[best.length - 1] + .5) * TS : (best[0] + .5) * TS; return { u, y: RIGA[voce], w: Math.min(best.length * TS - .4, voce === 'ritratto' ? 4.2 : 2.2), colonna: best[0] }; }
    else { const cand = liberi.length ? liberi : cols; const near = du !== null ? du : p.len / 2;
      if (cls === 'acc') u = lato > 0 ? cand[cand.length - 1] : cand[0];   // gli accenti agli estremi
      else { const o = cand.filter(c => lato * (c - near) > 0); u = o.length ? o[0] : cand[Math.floor(cand.length / 2)]; } }   // i secondari sulla colonna accanto al portone
    if (u < .4 || u > p.len - .4) u = Math.max(.4, Math.min(p.len - .4, u));
    return { u, y: RIGA[voce] || 0, colonna: Math.round((u - 1) / TS) };
  }
  // un sistema chiede di posare una voce in (x, z): sì con lo slot, o null. opt.lato: -1 / 1; opt.pagina: la pagina già scelta
  function chiedi(x, z, voce, opt) {
    if (!S) return null; const p = (opt && opt.pagina) || paginaAt(x, z, opt && opt.tipo); if (!p) { S.negati++; return null; }
    const cls = classe(p, voce); if (!cls) { S.negati++; return null; }
    const lim = cls === 'dom' ? 1 : cls === 'sec' ? 3 : 2, giaDellaVoce = p.presi[cls].filter(q => q === voce).length;
    if (p.presi[cls].length >= lim || giaDellaVoce >= (opt && opt.max ? opt.max : 1)) { S.negati++; return null; }
    const s = slot(p, voce, cls, opt); if (!s) { S.negati++; return null; }
    p.presi[cls].push(voce); S.presi++; S.perVoce[voce] = (S.perVoce[voce] || 0) + 1;
    const out = Object.assign({ pagina: p, cls, voce }, s); if (p.tipo === 'parete' && s.u !== undefined) { const q = p.at(s.u); out.x = q[0]; out.z = q[1]; out.yaw = p.yaw; }
    return out;
  }
  // una cosa posata senza chiedere (le infrastrutture: mensole della dorsale, contatori) si registra solo per il conteggio
  function nota(x, z, voce) { if (!S) return; const p = paginaAt(x, z); if (p) p.extra.push(voce); }
  // il conteggio: pagine per tipo e impaginazione, voci per classe, pagine che sforano (non dovrebbe succedere: chiedi rifiuta)
  function conteggio() {
    if (!S) return null; const out = { pagine: S.pagine.length, tipi: {}, imp: {}, quiete: 0, presi: S.presi, negati: S.negati, perVoce: S.perVoce, sforano: 0, fondali: {} };
    S.pagine.forEach(p => { out.tipi[p.tipo] = (out.tipi[p.tipo] || 0) + 1; out.imp[p.nome] = (out.imp[p.nome] || 0) + 1; out.fondali[p.fondale] = (out.fondali[p.fondale] || 0) + 1; if (p.imp.quiete && p.tipo === 'parete') out.quiete++;
      if (p.presi.dom.length > 1 || p.presi.sec.length > 3 || p.presi.acc.length > 2) out.sforano++; });
    out.quietePct = Math.round(100 * out.quiete / Math.max(1, S.pagine.filter(p => p.tipo === 'parete').length));
    return out;
  }
  // la pulizia: via i secondari dall'ultimo e gli accenti oltre il limite (torna la lista di cosa togliere; chi ha posato toglie)
  function pulisci() { if (!S) return []; const via = []; S.pagine.forEach(p => { while (p.presi.sec.length > 3) via.push({ pagina: p, voce: p.presi.sec.pop() }); while (p.presi.acc.length > 2) via.push({ pagina: p, voce: p.presi.acc.pop() }); while (p.presi.dom.length > 1) via.push({ pagina: p, voce: p.presi.dom.pop() }); }); return via; }
  // ---- IL PIANO DELL'ARREDO: dove vanno bidoni, cassonetti, bucato, dehors, targhe, civici. Solo dati (render disegna), ogni cosa
  // chiede il suo slot; le regole della sez. 2: bidoni solo nei vicoli (1 ogni 30 m), cassonetti a coppie ogni 60 m sulle vie, bucato
  // solo nei vicoli ≤ 5 m fra due case (uno ogni 15-20 m, a 4-5 m, 3-6 capi), dehors ≤ 2 m dal muro e mai in carreggiata ----
  let PIANO = null;
  function piano() {
    if (!S) return null; if (PIANO) return PIANO; const TS = G.TS, M = G.MAP, roads = (M.roads || []).filter(q => q.pts && q.era), T = G.T;
    const P = PIANO = { bidoni: [], cassonetti: [], bucato: [], dehors: [], targhe: [], civici: [], metriVicoli: 0, metriVie: 0 };
    const at = (x, z) => tl(Math.floor(x / TS), Math.floor(z / TS)), bld = (x, z) => at(x, z) === T.BLD;
    const SCR = typeof Scorci !== 'undefined' && Scorci && Scorci.attivo ? (x, z, m) => Scorci.riservato(x, z, m) : () => false;   // [scorci] dove c'è uno scorcio gli altri non posano
    const lungo = (rd, f) => { const Pt = rd.pts; let s = 0; for (let k = 0; k < Pt.length - 1; k++) { const [ax, az] = Pt[k], [bx, bz] = Pt[k + 1], L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L; for (let t = 0; t < L; t += 1, s += 1) f(ax + ux * t, az + uz * t, -uz, ux, s, ux, uz); } return s; };
    // [nitida] «meno ma leggibilissimo»: un bidone ogni 60 m di vicolo e una piazzola di cassonetti ogni ~130 m di via (un isolato), non a
    // ogni 30 e 60 m; ?vecchiapulizia torna al passo di prima
    const NIT = !(typeof PuliziaRumore !== 'undefined' && PuliziaRumore.vecchia()), passoB = NIT ? 60 : 30, passoC = NIT ? 130 : 60;
    roads.forEach((rd, ri) => { const vic = rd.kind === 'vicolo';
      if (vic) { let nb = 8 + hash(ri, 1, 61) * 10, nl = 6 + hash(ri, 2, 61) * 8;
        P.metriVicoli += lungo(rd, (x, z, nx, nz, s, ux, uz) => {
          // il bidone: contro il muro (lato lontano dalla camera), nella fascia, sulla pagina che lo prevede
          if (s > nb) { const far = (nx + nz) < 0 ? 1 : -1, o = rd.w / 2 - .45, bx = x + nx * far * o, bz = z + nz * far * o; if (bld(x + nx * far * (rd.w / 2 + .6), z + nz * far * (rd.w / 2 + .6)) && open(at(bx, bz)) && !SCR(bx, bz, .6)) {
              const sl = chiedi(x + nx * far * (rd.w / 2 + .3), z + nz * far * (rd.w / 2 + .3), 'bidone', { tipo: 'parete' }); if (sl) { P.bidoni.push({ x: bx, z: bz, yaw: Math.atan2(nx * far, nz * far), via: rd.id }); nb = s + passoB; } else nb = s + 4; } else nb = s + 3; }
          // il bucato: solo dove due case si guardano a meno di 5 m
          if (rd.w <= 5 && s > nl) { const d = rd.w / 2 + .9; if (bld(x + nx * d, z + nz * d) && bld(x - nx * d, z - nz * d) && !SCR(x, z, 1.5)) { const far = (nx + nz) < 0 ? 1 : -1, sl = chiedi(x + nx * far * (rd.w / 2 + .3), z + nz * far * (rd.w / 2 + .3), 'bucato', { tipo: 'parete' });
              if (sl) { P.bucato.push({ x, z, y: 4.2 + hash(ri, Math.round(s), 62) * .8, len: rd.w + 1.6, ux: nx, uz: nz, capi: 3 + Math.floor(hash(ri, Math.round(s), 63) * 4), via: rd.id }); nl = s + 15 + hash(ri, Math.round(s), 64) * 5; } else nl = s + 5; } else nl = s + 2; } }); }
      else { let nc = 20 + hash(ri, 3, 61) * 30;
        P.metriVie += lungo(rd, (x, z, nx, nz, s, ux, uz) => { if (s < nc) return; const far = (nx + nz) < 0 ? 1 : -1, o = rd.w / 2 + .7, cx = x + nx * far * o, cz = z + nz * far * o;
          // la coppia di cassonetti sul marciapiede lontano, a filo del cordolo, lontano dalle porte
          const c2x = cx + ux * 1.8, c2z = cz + uz * 1.8, porta = G.BUILDINGS.some(b => b.door && Math.hypot((b.door[0] + .5) * TS - cx, (b.door[1] + .5) * TS - cz) < 3.5);
          if (!porta && !SCR(cx, cz, 1) && !SCR(c2x, c2z, 1) && [at(cx, cz), at(c2x, c2z)].every(v => v === T.WALK || v === T.PIAZZA)) { P.cassonetti.push({ x: cx, z: cz, yaw: Math.atan2(-nx * far, -nz * far), via: rd.id }, { x: c2x, z: c2z, yaw: Math.atan2(-nx * far, -nz * far), via: rd.id }); nota(cx, cz, 'cassonetti'); nc = s + passoC; } else nc = s + 4; }); } });
    // i dehors: dove la pagina è il bar col dehors, e sulla piazzetta col bar (davanti alla casa che la guarda)
    S.pagine.forEach(p => { if (p.tipo === 'parete' && p.nome === 'bar_col_dehors') { const sl = chiedi(p.x, p.z, 'dehors', { pagina: p }); if (sl) P.dehors.push(dehorsDi(p, p.porta, p.b.use || (p.b.shopFront && p.b.shopFront.use))); } });
    S.pagine.filter(p => p.tipo === 'piazzetta' && p.bar).forEach(q => { let best = null, bd = 1e9; S.pagine.forEach(p => { if (p.tipo !== 'parete' || p.scorcio) return; const d = Math.hypot(p.x - q.x, p.z - q.z); if (d < q.r + 6 && d < bd && p.len >= 4) { bd = d; best = p; } });
      if (best) { best.nome = 'bar_col_dehors'; best.imp = CATALOGO.bar_col_dehors; best.dom = 'dehors'; best.sec = best.imp.sec.slice(); best.acc = best.imp.acc.slice(); best.presi = { dom: [], sec: [], acc: [] }; const sl = chiedi(best.x, best.z, 'dehors', { pagina: best }); if (sl) P.dehors.push(dehorsDi(best, best.porta !== null ? best.porta : best.len / 2, 'bar', q)); } });
    // le targhe delle vie: all'angolo di ogni isolato (le pagine d'angolo), a 2,5 m, sulla faccia S vicino allo spigolo, col nome della via davanti
    const nomeVia = (x, z) => { let rd = null, bd = 1e9; roads.forEach(q => q.pts.forEach(pp => { const d = Math.hypot(pp[0] - x, pp[1] - z); if (d < bd) { bd = d; rd = q; } })); return bd < 12 ? rd : null; };
    S.pagine.forEach(p => { if (p.tipo !== 'angolo') return; const b = p.b, w = b.w * TS, d = b.h * TS, x0 = b.x * TS, z0 = b.y * TS;
      [['S', x0 + w - .45, z0 + d, 0], ['E', x0 + w, z0 + d - .45, Math.PI / 2]].some(([f, x, z, yaw]) => { const rd = nomeVia(x + (f === 'E' ? 4 : 0), z + (f === 'S' ? 4 : 0)); if (!rd || SCR(x, z, .3)) return false; const sl = chiedi(p.x, p.z, 'targa', { pagina: p }); if (!sl) return true;
        P.targhe.push({ x, z, y: 2.5, yaw, f, bi: p.bi, testo: rd.name, era: p.era }); return true; }); });
    // i civici: accanto al portone, a 2,2 m; per via in ordine, pari da un lato e dispari dall'altro; nell'Ottocento rossi le botteghe e neri le case
    const perVia = {}; S.pagine.forEach(p => { if (p.tipo !== 'parete' || p.porta === null || !p.via) return; (perVia[p.via] = perVia[p.via] || []).push(p); });
    for (const v in perVia) { const L = perVia[v].sort((a, c) => (a.x + a.z) - (c.x + c.z)); let n = 1; L.forEach(p => { const sl = chiedi(p.x, p.z, 'civico', { pagina: p }); n++; if (!sl) return; const u = Math.min(p.len - .3, Math.max(.3, p.porta + (p.porta + 1 < p.len - .3 ? .85 : -.85))), q = p.at(u); if (SCR(q[0], q[1], .2)) return;
      P.civici.push({ x: q[0], z: q[1], y: 2.25, yaw: p.yaw, bi: p.bi, n: n - 1, rosso: p.era === 'E3' && p.bottega, era: p.era }); }); }
    return P;
  }
  // un dehors davanti alla porta: tavolini a 1,1 m dal muro (≤ 2 m), dai due lati del portone, fioriere ai capi, la lavagna, il frigo dei gelati
  function dehorsDi(p, du, use, q) {
    const TS = G.TS, T = G.T, L = p.len, nx = p.f === 'S' ? 0 : 1, nz = p.f === 'S' ? 1 : 0, out = { bi: p.bi, f: p.f, yaw: p.yaw, use: use || 'bar', tavoli: [], fioriere: [], lavagna: null, frigo: null, ombrelloni: [], piazzetta: !!q };
    const pos = (u, o) => { const a = p.at(u); return [a[0] + nx * o, a[1] + nz * o]; }, ok = (x, z) => { const v = tl(Math.floor(x / TS), Math.floor(z / TS)); return v === T.WALK || v === T.PIAZZA || v === T.COB; };
    const prof = (() => { let o = .5; while (o < 4.5 && ok(...pos(du, o + .5))) o += .5; return o; })();   // quanto è profonda la fascia libera davanti
    const o = Math.min(1.1, Math.max(.75, prof - .6)); if (prof < 1.2) return out;
    const us = []; for (let k = 1; k <= 3; k++) [-1, 1].forEach(s2 => { const u = du + s2 * (.6 + k * 1.25); if (u > .55 && u < L - .55 && us.length < 4) us.push(u); });
    us.forEach(u => { const [x, z] = pos(u, o); if (ok(x, z)) out.tavoli.push({ x, z, u }); });
    if (out.tavoli.length) { const umin = Math.min(...out.tavoli.map(t => t.u)), umax = Math.max(...out.tavoli.map(t => t.u)); [umin - .75, umax + .75].forEach(u => { if (u < .3 || u > L - .3) return; const [x, z] = pos(u, o); if (ok(x, z)) out.fioriere.push({ x, z }); });
      if (prof >= 3) out.tavoli.filter((t, i) => i % 2 === 0).slice(0, 2).forEach(t => out.ombrelloni.push({ x: t.x, z: t.z })); }   // gli ombrelloni solo se c'è spazio (non sbattono sulla tenda)
    { const [x, z] = pos(du + (du + 1 < L ? .75 : -.75), .35); out.lavagna = { x, z }; }
    if (out.use === 'gelateria' || out.use === 'bar') { const u = du + (du > L / 2 ? -1.1 : 1.1); if (u > .4 && u < L - .4) { const [x, z] = pos(u, .45); if (ok(x, z) && !out.tavoli.some(t => Math.hypot(t.x - x, t.z - z) < 1)) out.frigo = { x, z }; } }
    return out;
  }
  // ---- [facciate2] I SEGNI DI VITA DI UNA FACCIATA: il regista ne sceglie al massimo 3 per parete, il 40% delle pareti resta quieta ----
  // Le voci: gerani sul davanzale, bucato fra due finestre, una gabbia, un condizionatore (solo nel boom), una bandiera, una tenda da sole,
  // una luce accesa dentro (la stanza con le tende e la lampada). Le pareti quiete del catalogo sono quiete anche qui; le altre tacciono
  // per hash fino al 40%. Mai il bucato dove la pagina ha già il filo del vicolo, mai due bandiere a meno di 40 m.
  const VITA = {
    E0: [['gerani', 5], ['bucato', 4], ['gabbia', 2], ['luce', 3], ['tenda_sole', 1], ['bandiera', .5]],
    E2: [['gerani', 4], ['bucato', 4], ['gabbia', 2], ['luce', 3], ['tenda_sole', 2], ['bandiera', .5]],
    E3: [['gerani', 4], ['luce', 4], ['tenda_sole', 2], ['bandiera', 1], ['gabbia', .5]],
    E4: [['luce', 3], ['bandiera', 1.5], ['tenda_sole', 2], ['gerani', 1]],
    E6: [['condizionatore', 5], ['tenda_sole', 4], ['luce', 3], ['gerani', 2], ['bucato', 1.5]],
  };
  const VITA_QUIETE = .4;
  function vita(bi, f) {
    if (!S) return []; const p = S.muro.get(bi + '|' + f); if (!p || p.tipo !== 'parete') return [];
    if (p.vita) return p.vita;
    const L = VITA[p.era]; p.vita = []; if (!L) return p.vita;
    const h = hash(Math.round(p.x * 2), Math.round(p.z * 2), 2203), quiete = !!p.imp.quiete;
    // la quota di quiete: le pareti quiete del catalogo, poi per hash le altre (calcolata sul totale, così fa il 40%)
    if (S.qCat === undefined) { const par = S.pagine.filter(q => q.tipo === 'parete' && VITA[q.era]); S.qCat = par.filter(q => q.imp.quiete).length / Math.max(1, par.length); }
    const qPct = S.qCat;
    if (quiete || h < Math.max(0, (VITA_QUIETE - qPct) / Math.max(.01, 1 - qPct))) { p.vitaQuieta = true; return p.vita; }
    const h2 = hash(Math.round(p.x * 2), Math.round(p.z * 2), 2204), n = h2 < .35 ? 1 : h2 < .8 ? 2 : 3;
    const cand = L.filter(([v]) => !(v === 'bucato' && (p.dom === 'bucato' || p.presi.dom.concat(p.presi.sec).indexOf('bucato') >= 0 || p.fl < 2))
      && !((v === 'gabbia' || v === 'condizionatore' || v === 'tenda_sole') && p.fl < 2)
      && !(v === 'bandiera' && S.pagine.some(q => q !== p && q.vita && q.vita.indexOf('bandiera') >= 0 && Math.hypot(q.x - p.x, q.z - p.z) < 40))).map(q => q.slice());
    for (let k = 0; k < n && cand.length; k++) { let tot = 0; cand.forEach(q => tot += q[1]); let t = hash(Math.round(p.x * 2) + k * 17, Math.round(p.z * 2), 2205 + k) * tot, j = 0;
      for (; j < cand.length - 1; j++) { t -= cand[j][1]; if (t < 0) break; } p.vita.push(cand[j][0]); cand.splice(j, 1); }
    S.vitaN = (S.vitaN || 0) + 1; return p.vita;
  }
  // il conteggio dei segni di vita sulle pareti (dopo che render li ha chiesti tutti, o chiedendoli qui)
  function contaVita() {
    if (!S) return null; const par = S.pagine.filter(p => p.tipo === 'parete' && VITA[p.era]), out = { pareti: par.length, quiete: 0, per: {}, max: 0 };
    par.forEach(p => { const v = vita(p.bi, p.f); if (!v.length) out.quiete++; out.max = Math.max(out.max, v.length); v.forEach(x => out.per[x] = (out.per[x] || 0) + 1); });
    out.quietePct = Math.round(100 * out.quiete / Math.max(1, par.length)); return out;
  }
  // il conteggio dell'arredo per 100 m
  function contaArredo() { const P = piano(); if (!P) return null; const v = Math.max(1, P.metriVicoli) / 100, w = Math.max(1, P.metriVie) / 100;
    return { bidoni: P.bidoni.length, bidoniPer100mVicolo: +(P.bidoni.length / v).toFixed(1), cassonetti: P.cassonetti.length, coppiePer100mVia: +(P.cassonetti.length / 2 / w).toFixed(2), bucato: P.bucato.length, bucatoPer100mVicolo: +(P.bucato.length / v).toFixed(1), dehors: P.dehors.length, tavolini: P.dehors.reduce((a, d) => a + d.tavoli.length, 0), targhe: P.targhe.length, civici: P.civici.length }; }
  return { init, attivo, piano, contaArredo, vita, contaVita, VITA, DEHORS, pagine, paginaMuro, paginaAt, chiedi, nota, conteggio, pulisci, classe, CATALOGO, RIGA, FAMIGLIA, RAGGIO, MG, MF };
})();
if (typeof module !== 'undefined') module.exports = Scena;
