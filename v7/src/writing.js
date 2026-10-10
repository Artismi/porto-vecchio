/* Porto Vecchio — il writing (v7, «Writer»). La sottocultura delle bombolette: tag, throw-up, pezzi, burner, whole car.
   - LA SCALA DEI LAVORI (dal più piccolo): tag (la firma, a pennarello o a spruzzo) → throw-up (lettere a bolla, due colori,
     fatte in fretta) → pezzo (lettere a blocchi con fondo, contorno, 3D, sfumatura e luci) → burner (wildstyle: frecce,
     sfondo, personaggio) → whole car (una fiancata intera del treno, da cima a fondo e da un capo all'altro).
     Le regole della strada: si va sopra solo a chi sta più in basso nella scala; coprire un pezzo con una tag è «crossare»,
     e la crew di chi hai crossato se la lega al dito (la notte ti crossa a sua volta).
   - LA FAMA: ogni lavoro finito ne dà secondo la scala, e di più dove è difficile o si vede: in alto (heaven spot, dai tetti),
     sul treno (e ogni mattina che il treno esce col tuo pezzo, ancora), davanti a tanta gente. Toy → writer → king della
     zona → king della linea → all city king.
   - I WRITER DELL'ISOLA: tre crew di ragazzi (PVK, BDS, TNT) scelti fra gli abitanti giovani. Di notte bombano la città e a
     volte il treno in deposito: la mattina trovi le loro tag, i loro throw-up, i loro pezzi. Ti salutano se sei qualcuno;
     dopo un po' una crew ti chiede di entrare.
   - IL TRENO DELLA MINIERA: la ferrovia della costa nord (game.js, layout().rail). Parte dalla Stazione di estrazione Nord,
     corre nel bosco tra il monte e il mare (a monte della Costiera Nord), passa sul mare su un viadotto davanti alla città,
     oltre il Muro scende lungo il pontile e finisce sulla banchina del porto militare della Base. Due diesel (in testa e in
     coda) e quattro carri: due chiusi e due tramogge del carbone, dodici fiancate da dipingere. Di notte (22:00-6:00) dorme
     in deposito alla miniera: è il momento dei writer. Di giorno fa quattro corse (un'ora e mezza di viaggio, mezz'ora ferma
     al porto militare): il pezzo gira per tutta la costa. Dopo tre giorni di linea le fiancate dipinte si lavano.
   - IL GIOCATORE: con la bomboletta in mano B cambia lavoro (libero · tag · throw-up · pezzo · burner); tieni premuto il
     tasto sinistro su un muro (o sul treno) e il lavoro cresce a strati come lo farebbe un writer vero: prima il riempimento,
     poi il fondo, il contorno e il 3D, alla fine luci e dettagli. Lasci il tasto: resta a metà, lo riprendi cliccandoci sopra.
     Il burner sul treno è un whole car. La rotella sceglie i colori. Col pennarello (mop) il clic fa la tag, con le colature.
   Stato: st.wr = { aka, crew, fame, works, beef, writers, train, mode, ... }. La grafica (in fondo) disegna i lavori su veli
   appoggiati ai muri, il treno con le fiancate dipingibili e l'imbocco della galleria. */
var Writing = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const TS = G.TS, B = G.BUILDINGS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot, lerp = (a, b, t) => a + (b - a) * t;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const minOfDay = t => ((t % 1440) + 1440) % 1440, dayIdx = t => Math.floor(t / 1440);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const OG = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const TT = () => (typeof Tetti !== 'undefined' ? Tetti : null);

  // ---------------- LA SCALA DEI LAVORI ----------------
  const STYLES = {
    tag: { nome: 'tag', rank: 0, W: 1.1, H: .55, dur: 2.6, cans: .06, fame: 1 },
    mtag: { nome: 'tag', rank: 0, W: .6, H: .32, dur: 1.4, cans: 0, fame: 1, marker: true },
    throw: { nome: 'throw-up', rank: 1, W: 2.7, H: 1.3, dur: 9, cans: .7, fame: 4 },
    pezzo: { nome: 'pezzo', rank: 2, W: 4.8, H: 2.05, dur: 32, cans: 2.2, fame: 12 },
    burner: { nome: 'burner', rank: 3, W: 6.6, H: 2.5, dur: 60, cans: 4, fame: 25 },
    gotico: { nome: 'gotico', rank: 1, W: 1.4, H: 3.2, dur: 16, cans: .5, fame: 6 },   // la calligrafia verticale (piloni, spigoli alti)
    mostro: { nome: 'personaggio', rank: 2, W: 3, H: 2.6, dur: 40, cans: 2.6, fame: 12 },   // il mostro coi denti
    wholecar: { nome: 'whole car', rank: 4, W: 16, H: 2.9, dur: 110, cans: 7, fame: 45 },
  };
  const MODES = ['libero', 'tag', 'throw', 'pezzo', 'burner', 'tavoletta'];
  const MODE_TXT = { libero: 'a mano libera', tag: 'tag', throw: 'throw-up', pezzo: 'pezzo', burner: 'burner (sul treno: whole car)', tavoletta: 'tavoletta (trascina sul muro la finestra, poi disegni)' };
  const RANKS = [[0, 'toy'], [25, 'writer'], [120, 'king della zona'], [400, 'king della linea'], [1000, 'all city king']];
  const rankOf = f => RANKS.filter(r => f >= r[0]).pop()[1];
  const un = k => (k === 'tag' || k === 'mtag' ? 'una ' : 'un ') + STYLES[k].nome;   // una tag, un pezzo
  const CREWS = [
    { id: 'PVK', nome: 'Porto Vecchio Kings', col: 0 },
    { id: 'BDS', nome: 'Banda della Scogliera', col: 3 },
    { id: 'TNT', nome: 'Treni Notte Tunnel', col: 5 },
  ];
  const AKAS2 = ['ZEKE', 'MIRK', 'SOLE', 'BOLT', 'KOMA', 'TRAX', 'ELKE', 'GRIM', 'NEON', 'DUNE', 'PIXO', 'RAZO', 'VAPO', 'ICER', 'LUPA', 'KASH'];
  const AKAS = ['DAKO', 'KEOS', 'SPIK', 'RAKE', 'NOTE', 'BLES', 'SNEK', 'KAOS', 'TOXI', 'PHAZ', 'DEMO', 'SKEMA', 'ZORA', 'MOSE', 'VIBE', 'KRAN', 'FUSE', 'OBIE', 'RUSK', 'NEMO'];
  // le tavolozze e il disegno stanno in writer_arte.js
  const WA = typeof WriterArte !== 'undefined' ? WriterArte : require('./writer_arte.js');
  const PAL = WA.PAL, COL2PAL = WA.COL2PAL;

  // ---------------- STATO ----------------
  function S(st) {
    if (!st.wr) st.wr = { aka: null, crew: null, fame: 0, works: [], beef: {}, resp: {}, writers: [], mode: 'libero', canUse: 0, mkUse: 0, nextId: 1, night: -1, morning: -1, greeted: {}, train: { sides: {}, runDay: -1 }, offer: null, done: { tag: 0, throw: 0, pezzo: 0, burner: 0, wholecar: 0 } };
    if (!st.wr.kit) { st.wr.kit = true; const O = OG(); if (O) { const inv = O.inv(st); inv.bomboletta = (inv.bomboletta || 0) + 4; inv.pennarello = (inv.pennarello || 0) + 1; } }   // [writer] i due pennelli dall'inizio: la bomboletta e il pennarello
    return st.wr;
  }
  const playerAka = st => S(st).aka || (typeof WriterMano !== 'undefined' && WriterMano.MIA) || 'NINO';   // [writer] la tua tag: quella scelta fra i preset dello studio

  // ---------------- IL TRENO (logica) ----------------
  // la ferrovia della miniera (game.js: layout().rail, un punto ogni metro): dalla Stazione di estrazione Nord, nel bosco della
  // costa nord, sul viadotto davanti alla città, fino alla banchina del porto militare. s = metri dalla miniera.
  const TR = (function () {
    let R = null; try { R = G.layout().rail; } catch (e) { }
    if (!R || !R.pts || R.pts.length < 200) return { ok: false };
    // da ovest (miniera) a est (porto): la locomotiva di coda, quattro carri, la locomotiva di testa (doppia trazione: in salita serve)
    const CARS = [{ k: 'loco', L: 14, back: true }, { k: 'chiuso', L: 15 }, { k: 'tramoggia', L: 14 }, { k: 'chiuso', L: 15 }, { k: 'tramoggia', L: 14 }, { k: 'loco', L: 14 }], GAP = .9;
    let o = 0; CARS.forEach(c => { c.off = o; o += c.L + GAP; }); const LEN = o - GAP;
    return { ok: true, P: R.pts, len: R.len, CARS, LEN, W: 2.9, sMine: LEN + 5, sPort: R.len - 4 };
  })();
  // il punto del binario a s metri dalla miniera: x, y, quota del ferro, direzione
  function railAt(s) {
    const P = TR.P, n = P.length - 1, c = clamp(s, 0, n), i = Math.min(n - 1, Math.floor(c)), f = c - i, a = P[i], b = P[i + 1];
    const i0 = Math.max(0, i - 2), i1 = Math.min(n, i + 3);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, h: a[2] + (b[2] - a[2]) * f, ang: Math.atan2(P[i1][1] - P[i0][1], P[i1][0] - P[i0][0]), sea: a[3] };
  }
  const LAYUP = [22 * 60, 6 * 60], CYCLE = 250, RUN = 90, STOP_P = 30;   // il deposito alla miniera di notte; di giorno quattro corse
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  // dov'è il treno all'ora t: s = la testa (verso il porto); at: 'miniera' | 'porto' | null (in viaggio)
  function trainAt(t) {
    if (!TR.ok) return null;
    const m = minOfDay(t), A = TR.sMine, Bp = TR.sPort;
    if (m >= LAYUP[0] || m < LAYUP[1]) return { s: A, parked: true, v: 0, dir: 0, vis: true, at: 'miniera' };
    const ph = (m - LAYUP[1]) % CYCLE;
    if (ph < RUN) return { s: lerp(A, Bp, ease(ph / RUN)), parked: false, v: 1, dir: 1, vis: true, at: null };
    if (ph < RUN + STOP_P) return { s: Bp, parked: false, v: 0, dir: 0, vis: true, at: 'porto' };
    if (ph < 2 * RUN + STOP_P) return { s: lerp(Bp, A, ease((ph - RUN - STOP_P) / RUN)), parked: false, v: 1, dir: -1, vis: true, at: null };
    return { s: A, parked: false, v: 0, dir: 0, vis: true, at: 'miniera' };
  }
  // la vettura i: centro, quota, direzione
  function carPose(tr, i) { const c = TR.CARS[i], sc = tr.s - TR.LEN + c.off + c.L / 2, q = railAt(sc), a = railAt(sc - c.L * .35), b = railAt(sc + c.L * .35); return { x: q.x, y: q.y, h: q.h, ang: Math.atan2(b.y - a.y, b.x - a.x), pitch: Math.atan2(b.h - a.h, c.L * .7), L: c.L }; }
  const carX = (tr, i) => carPose(tr, i).x;
  // il treno ingombra il binario: chi ci sta dentro viene spinto fuori (di lato); se si muove, fa male
  function trainPush(st, tr) {
    if (!tr || !tr.vis) return;
    const hw = TR.W / 2 + .35, poses = TR.CARS.map((c, i) => carPose(tr, i)), mid = poses[2];
    const push = (o, isP) => {
      if (Math.abs(o.x - mid.x) > TR.LEN || Math.abs(o.y - mid.y) > TR.LEN) return;
      if (isP && o.lv) return;
      for (const q of poses) {
        const c = Math.cos(q.ang), sn = Math.sin(q.ang), dx = o.x - q.x, dy = o.y - q.y, u = dx * c + dy * sn, v = -dx * sn + dy * c;
        if (Math.abs(u) > q.L / 2 + .45 || Math.abs(v) > hw) continue;
        const sd = v < 0 ? -1 : 1, nv = sd * (hw + .02); o.x = q.x + u * c - nv * sn; o.y = q.y + u * sn + nv * c;
        if (isP && tr.v && o.__trHit == null) { o.__trHit = st.clock; o.hp = Math.max(1, o.hp - 18); o.stun = Math.max(o.stun || 0, .8); G.feed(st, 'Il treno ti prende di striscio!', 'bad'); }
        break;
      }
    };
    push(st.player, true); if (st.player.__trHit != null && st.clock - st.player.__trHit > 2) st.player.__trHit = null;
    for (const n of st.npcs) if (!n.dead && !n.inside) push(n, false);
  }

  // ---------------- LA LINEA: IL PONTE, GLI SCALI, LE RECINZIONI ----------------
  // [ferrovia] Si decide dalla linea e dalle caselle (la logica, senza grafica):
  //  - IL PONTE: in terra, dove il terreno scende di più fra due punti a 90 m, il binario passa su un ponte di cemento coi
  //    piloni (oltre al viadotto sul mare); altrove sta su una massicciata bassa, appoggiata al terreno.
  //  - GLI SCALI: binari secondari a fianco della linea (il deposito della miniera, lo scalo del bosco, il raccordo prima della
  //    città), con un deviatoio per parte; ci stanno fermi i carri merci, che si dipingono e dopo qualche giorno partono.
  //  - LE RECINZIONI: la rete ai due lati dove la linea è in terra, con i VARCHI (la rete tagliata e piegata, il sentiero
  //    battuto): chi non passa da un varco non entra; i MURI antirumore prima della città, di cemento, che si dipingono.
  const RAIL = (function () {
    if (!TR.ok) return { ok: false, yards: [], walls: [], gaps: [], fences: [] };
    const P = TR.P, n = P.length, el = (x, y) => { const tx = Math.floor(x / G.TS), ty = Math.floor(y / G.TS); return tx < 0 || ty < 0 || tx >= G.GW || ty >= G.GH ? 0 : G.MAP.elev[ty * G.GW + tx]; };
    const okT = (x, y) => { const tx = Math.floor(x / G.TS), ty = Math.floor(y / G.TS); return tx > 0 && ty > 0 && tx < G.GW - 1 && ty < G.GH - 1 && G.walkT(tx, ty) && !(G.bIndex && G.bIndex[ty * G.GW + tx] >= 0); };
    let landEnd = n - 1; for (let i = Math.ceil(TR.sMine); i < n; i++) if (P[i][3]) { landEnd = i; break; }
    // il ponte in terra
    let best = null; const YD = (G.layout().rail || {}).yards || []; for (let s = Math.ceil(TR.sMine) + 60; s + 90 < landEnd - 60; s += 5) { if (YD.some(y => s < y.s0 + y.len + 25 && s + 90 > y.s0 - 25)) continue; const g0 = el(P[s][0], P[s][1]), g1 = el(P[s + 90][0], P[s + 90][1]); let m = 0; for (let k = 15; k <= 75; k += 5) m += el(P[s + k][0], P[s + k][1]); m /= 13; const dd = Math.min(g0, g1) - m; if (!best || dd > best.d) best = { s0: s, s1: s + 90, d: dd }; }
    const bridge = best ? [best.s0, best.s1] : [Math.round(landEnd * .45), Math.round(landEnd * .45) + 90];
    const onBridge = s => s > bridge[0] - 2 && s < bridge[1] + 2;
    // gli scali: li prepara la mappa (game.js railLine: la massicciata larga, il bosco tagliato)
    const OFF = 4.6, yards = ((G.layout().rail || {}).yards || []).map((y, i) => Object.assign({ i }, y));
    // le recinzioni: dove la linea è in terra, fuori dal ponte e dagli scali (lì la rete gira attorno allo scalo, più larga)
    const fences = [], gaps = [], walls = [];
    const inYard = s => yards.find(y => s >= y.s0 - 4 && s <= y.s0 + y.len + 4);
    for (let s = Math.ceil(TR.sMine) + 6; s < landEnd - 4; s += 2) { if (onBridge(s)) continue; const y = inYard(s); fences.push({ s, off: [3.9 + (y && y.side === 1 ? OFF + 2.6 : 0), 3.9 + (y && y.side === -1 ? OFF + 2.6 : 0)] }); }
    // i varchi: ogni 90–140 m, a lati alterni (e uno a ogni scalo, dalla parte dei carri)
    for (let s = Math.ceil(TR.sMine) + 40, k = 0; s < landEnd - 20; s += 90 + ((s * 37) % 50), k++) if (!onBridge(s)) gaps.push({ s, side: k % 2 ? 1 : -1, w: 1.4 });
    yards.forEach(y => gaps.push({ s: y.s0 + Math.round(y.len * .3), side: y.side, w: 1.6 }));
    // i muri antirumore: 180 m prima del mare, dal lato della strada (pannelli da 4 m, alti 2,8)
    const sideRoad = (() => { const nord = G.MAP.roads.find(r => r.id === 'nord'); if (!nord) return -1; const s = Math.max(0, landEnd - 120), q = P[s], a = P[Math.max(0, s - 2)], b = P[s + 2], an = Math.atan2(b[1] - a[1], b[0] - a[0]); let bd = 1e9, rp = null; nord.pts.forEach(p => { const d = hyp(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; rp = p; } }); return rp && (-Math.sin(an) * (rp[0] - q[0]) + Math.cos(an) * (rp[1] - q[1])) > 0 ? 1 : -1; })();
    for (let s = Math.max(Math.ceil(TR.sMine) + 10, landEnd - 190); s + 4 < landEnd - 8; s += 4) { if (onBridge(s) || inYard(s) || gaps.some(g => g.side === sideRoad && Math.abs(g.s - s) < 3)) continue; walls.push({ s, side: sideRoad, len: 4, h: 2.8, off: 4.1 }); }
    return { ok: true, landEnd, bridge, onBridge, yards, fences, gaps, walls, OFF };
  })();
  // un punto del binario secondario: u metri dall'inizio dello scalo; lo scarto dalla linea entra e esce coi deviatoi (18 m)
  const ramp = (u, L) => { const a = clamp(u / 18, 0, 1), b = clamp((L - u) / 18, 0, 1), sm = t => t * t * (3 - 2 * t); return sm(a) * sm(b); };
  function yardAt(Y, u) {
    const f = o => { const q = railAt(Y.s0 + o), off = Y.side * Y.off * ramp(o, Y.len), lf = Y._lf ? (k => { const i = Math.max(0, Math.min(Y._lf.length - 2, Math.floor(k))), t = Math.max(0, Math.min(1, k - i)); return Y._lf[i] * (1 - t) + Y._lf[i + 1] * t; })(o) : 0; return { x: q.x - Math.sin(q.ang) * off, y: q.y + Math.cos(q.ang) * off, h: q.h + lf }; };   // _lf: dove il terreno accanto è più alto, lo scalo sale sul suo piano
    const q = f(u), a = f(u - .8), b = f(u + .8); return { x: q.x, y: q.y, h: q.h, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }
  // [ferrovia] una crew dipinge un carro fermo (mai sopra un lavoro che c'è già su quella fiancata)
  function yardPaint(st, c, old) {
    const W = S(st), k = Math.floor(rnd() * c.cars.length), side = rnd() < .5 ? 0 : 1;
    if (W.works.some(w => w.surf === 'vagone' && w.cons === c.key && w.wk === k && w.side === side && !w.erased)) return null;
    const ws = W.writers.map(id => G.byId(st, id)).filter(n => n && writerOf(st, n)); if (!ws.length) return null;
    const a = pick(ws), wr = writerOf(st, a), L = c.cars[k][1], r = rnd(), style = r < .45 ? 'pezzo' : r < .8 ? 'throw' : 'burner', Wd = Math.min(STYLES[style].W, L - 1), Hd = Math.min(STYLES[style].H, 2.4);
    return addWork(st, npcWork(st, a, wr, style, null, { surf: 'vagone', cons: c.key, wk: k, side, u0: .4 + rnd() * Math.max(0, L - 1 - Wd), vb: .15 + rnd() * .2, W: Wd, H: Hd, prog: 1, done: true, old: !!old }));
  }
  // un punto della recinzione (o del muro): s sulla linea, lato, scarto
  function sidePt(s, side, off) { const q = railAt(s); return { x: q.x - Math.sin(q.ang) * off * side, y: q.y + Math.cos(q.ang) * off * side, h: q.h, ang: q.ang }; }
  // i carri fermi negli scali: due o tre per scalo, chiusi e tramogge; dopo 2–4 giorni partono (alle 9) e la notte dopo ne arrivano di puliti
  const YARD_CARS = [['chiuso', 15], ['tramoggia', 14], ['chiuso', 15], ['tramoggia', 14]];
  function yardState(st) {
    const W = S(st); if (W.yard) return W.yard;
    W.yard = { cons: RAIL.yards.map(Y => ({ y: Y.i, key: Y.i + 'a', cars: YARD_CARS.slice(Y.i % 2, Y.i % 2 + 2 + (Y.i === 0 ? 1 : 0)), day0: dayIdx(st.t) - (Y.i % 3), stay: 2 + (Y.i % 3), leave: null, gone: false })) };
    return W.yard;
  }
  const consLen = c => c.cars.reduce((t, k) => t + k[1], 0) + (c.cars.length - 1) * .9;
  // la posa del carro k di un convoglio: fermo al centro dello scalo, o in partenza (avanza a 5 m/s verso la linea e il porto)
  function wagPose(st, c, k) {
    const Y = RAIL.yards[c.y]; if (!Y || c.gone) return null;
    let o = (Y.len - consLen(c)) / 2; for (let j = 0; j < k; j++) o += c.cars[j][1] + .9; o += c.cars[k][1] / 2;
    const mv = c.leave ? Math.max(0, (st.t - c.leave) * 60 * 5 / 60) : 0;   // st.t in minuti di gioco: 5 m al secondo vero ≈ 5 m al minuto di gioco
    const u = o + mv, L = c.cars[k][1];
    if (u < Y.len) { const a = yardAt(Y, u - L * .35), b = yardAt(Y, u + L * .35), q = yardAt(Y, u); return { x: q.x, y: q.y, h: q.h, ang: Math.atan2(b.y - a.y, b.x - a.x), L }; }
    const s = Y.s0 + u; if (s > TR.len - 6) return null;
    const q = railAt(s), a = railAt(s - L * .35), b = railAt(s + L * .35); return { x: q.x, y: q.y, h: q.h, ang: Math.atan2(b.y - a.y, b.x - a.x), L };
  }
  // un punto della fiancata di un carro fermo (come sidePoint per il treno)
  function wagSidePoint(st, c, k, side, u, y) {
    const q = wagPose(st, c, k); if (!q) return null; const cs = Math.cos(q.ang), sn = Math.sin(q.ang), sd = side ? 1 : -1, along = side ? -q.L / 2 + u : q.L / 2 - u, out = TR.W / 2 + .02;
    return { x: q.x + cs * along - sn * sd * out, y: q.h + y, z: q.y + sn * along + cs * sd * out, nx: -sn * sd, nz: cs * sd };
  }
  const consOf = (st, key) => yardState(st).cons.find(c => c.key === key);
  // ogni passo: i convogli che partono escono di scena e i lavori sopra vanno via con loro; quelli nuovi arrivano di notte
  function yardTick(st) {
    if (!RAIL.ok || !RAIL.yards.length) return;
    const Ys = yardState(st), W = S(st), d = dayIdx(st.t), m = minOfDay(st.t);
    if (!Ys.seeded && W.writers.length) { Ys.seeded = true; Ys.cons.forEach(c => { for (let j = 0; j < 3; j++) yardPaint(st, c, true); }); }   // i carri arrivano già dipinti
    Ys.cons.forEach(c => {
      if (!c.gone && !c.leave && d - c.day0 >= c.stay && m >= 9 * 60 && m < 20 * 60) { c.leave = st.t; const mine = W.works.filter(w => w.surf === 'vagone' && w.cons === c.key && !w.erased && w.by === 'player'); if (mine.length && hyp(st.player.x - yardAt(RAIL.yards[c.y], 55).x, st.player.y - yardAt(RAIL.yards[c.y], 55).y) < 120) G.feed(st, `I carri dello ${RAIL.yards[c.y].name} partono: il tuo ${STYLES[mine[0].style].nome} se ne va in giro.`, 'good'); }
      if (c.leave && !c.gone && c.cars.every((_, k) => !wagPose(st, c, k))) {
        c.gone = true; const ws = W.works.filter(w => w.surf === 'vagone' && w.cons === c.key && !w.erased);
        const run = ws.filter(w => w.by === 'player'); if (run.length) { const f = Math.round(run.reduce((t, w) => t + STYLES[w.style].fame * .6, 0)); W.fame += f; G.feed(st, `I carri col tuo lavoro sono partiti per il continente: +${f} fama.`, 'good'); }
        ws.forEach(w => { w.erased = true; w.gone = true; });
      }
      // di notte arriva un convoglio pulito al posto di quello partito
      if (c.gone && (m >= 23 * 60 || m < 4 * 60) && d > dayIdx(c.leave)) { const k = (parseInt(c.key, 10) || 0); c.key = c.y + String.fromCharCode(97 + ((c.key.charCodeAt(c.key.length - 1) - 96) % 26)); c.cars = YARD_CARS.slice((c.y + d) % 2, (c.y + d) % 2 + 2 + (d % 2)); c.day0 = d + 1; c.stay = 2 + (d % 3); c.leave = null; c.gone = false; }
    });
  }
  // la rete: chi è a piedi (o in BMX) non la passa se non da un varco
  function fencePush(st) {
    if (!RAIL.ok || !RAIL.fences.length || !GFX.fenceOn) return;
    const p = st.player; if (p.lv || p.indoor) return;
    const prev = p.__rs; let near = null, bd = 1e9;
    for (let k = 0; k < RAIL.fences.length; k += 4) { const q = railAt(RAIL.fences[k].s), d = hyp(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; near = RAIL.fences[k]; } }
    if (!near || bd > 22) { p.__rs = null; return; }
    // la posizione rispetto alla linea: s (lungo) e v (di lato)
    let s = near.s, bq = null; for (let k = -12; k <= 12; k++) { const q = railAt(near.s + k * 2), d = hyp(q.x - p.x, q.y - p.y); if (!bq || d < bq.d) bq = { d, s: near.s + k * 2, q }; } s = bq.s;
    const q = bq.q, v = -(p.x - q.x) * Math.sin(q.ang) + (p.y - q.y) * Math.cos(q.ang), F = RAIL.fences.find(f => Math.abs(f.s - s) <= 1); if (!F) { p.__rs = null; return; }
    const sd = v >= 0 ? 1 : -1, off = F.off[sd > 0 ? 0 : 1], zone = Math.abs(v) < off ? 'dentro' : 'fuori';
    if (prev && prev.zone !== zone && prev.sd === sd && !RAIL.gaps.some(g => g.side === sd && Math.abs(g.s - s) < g.w / 2 + .6)) {
      const tv = sd * (zone === 'dentro' ? off + .3 : off - .3), cx = q.x - Math.sin(q.ang) * tv, cy = q.y + Math.cos(q.ang) * tv; p.x = cx; p.y = cy;
      if (st.clock - (GFX.fenceMsg || -99) > 6) { GFX.fenceMsg = st.clock; G.feed(st, 'La rete della ferrovia: si passa solo dai varchi (dove è tagliata).'); }
      return;
    }
    p.__rs = { zone, sd };
  }

  // ---------------- I WRITER DELL'ISOLA ----------------
  function initWriters(st) {
    const W = S(st); if (W.writers.length || !st.pop) return;
    const young = st.npcs.filter(n => !n.dead && n.pop && n.pop.age >= 15 && n.pop.age <= 31 && !/soldat|agente|poliz|carabin|guardia|tutela|commissar|prete|suora|sindac/i.test(n.role || ''));
    const hs = n => { let h = 7; for (const ch of String(n.id)) h = (h * 31 + ch.charCodeAt(0)) % 1009; return h; }; young.sort((a, b) => hs(a) - hs(b));
    const akas = AKAS.slice();
    // prima chi ha l'arte, la musica, il ballo (la controcultura del Disgelo); poi gli altri ragazzi
    const cult = n => ((n.pop.ints || n.pop.interests || []).some(i => /arte|musica|ballo/.test(i.k || i)) ? 0 : 1);
    young.sort((a, b) => cult(a) - cult(b) || hs(a) - hs(b));
    W.pool = young.map(n => n.id);
    young.slice(0, 9).forEach((n, k) => recruit(st, n, CREWS[k % 3].id, k));
  }
  // un ragazzo diventa writer: la tag, la crew, la mano (famiglia di lettere), le specialità
  function recruit(st, n, crew, k) {
    const W = S(st), used = new Set(W.writers.map(id => { const m = G.byId(st, id); return m && m.pop.writer && m.pop.writer.aka; }));
    const free = AKAS.concat(AKAS2).filter(a => !used.has(a)); if (!free.length) return null;
    let h = 7; for (const ch of String(n.id)) h = (h * 31 + ch.charCodeAt(0)) % 1009;
    const WMm = typeof WriterMano !== 'undefined' ? WriterMano : null, pre = WMm ? Object.keys(WMm.RECORDED).filter(a => !used.has(a) && a !== WMm.MIA && a !== S(st).aka) : [];   // [writer] i preset dello studio tag vanno ai writer per primi
    const aka = pre.length ? pre[0] : free[(h * 13 + (k || 0) * 5) % free.length], r = WA.mulberry(h * 7919 + 3);
    const skill = .3 + ((h * 3) % 7) / 10, cr = CREWS.find(c => c.id === crew) || CREWS[0], dna = WA.dnaOf(h * 7919 + 3, skill, cr.col);
    n.pop.writer = { aka, crew, skill, fam: dna.fam, dna, hand: h * 7919 + 11, roof: r() < .45, train: r() < .5 || crew === 'TNT', mop: r() < .5, since: st.t };
    W.writers.push(n.id); return n.pop.writer;
  }
  // la scena del Disgelo: cresce coi lavori in giro e con la tua fama; più scena, più writer, più notti di vernice
  function sceneLevel(st) { const W = S(st), live = W.works.filter(w => !w.erased && w.done).length; return clamp(live / 260 + W.fame / 900 + (W.grow || 0), 0, 1); }
  function grow(st) {
    const W = S(st), sc = sceneLevel(st), want = Math.round(9 + sc * 15);
    if (W.writers.length >= want || !W.pool) return;
    const n = W.pool.map(id => G.byId(st, id)).find(m => m && !m.dead && m.pop && !m.pop.writer); if (!n) return;
    const crew = CREWS[W.writers.length % 3].id, wr = recruit(st, n, crew, W.writers.length);
    if (wr && hyp(n.x - st.player.x, n.y - st.player.y) < 300) W.newsCrew = `In giro c'è una tag nuova: ${wr.aka} dei ${crew}. La scena cresce.`;
  }
  const writerOf = (st, n) => n && n.pop && n.pop.writer;
  // una parete per un lavoro di notte: un muro di un posto, lontano dal giocatore
  function nightSpot(st) {
    if (typeof WriterVita !== 'undefined' && rnd() < .7) { const s = WriterVita.freeSite(st, ['strada', 'hall', 'heaven', 'strada'], null); if (s) return { x: s.x, y: s.y, face: s.face, h: s.h, place: (G.nearestPlace(s.x, s.y) || {}).name || '' }; }
    const I = PO() && PO()._; if (!I || !I.spotsOf) return null;
    const P = G.PLACES, keys = Object.keys(P), p = st.player;
    for (let k = 0; k < 12; k++) {
      const id = pick(keys), pl = P[id]; if (!pl || hyp(pl.x - p.x, pl.y - p.y) < 60) continue;
      let sp = null; try { sp = (I.spotsOf(pl.pid || id) || []).filter(q => q.wall); } catch (e) { sp = null; }
      if (!sp || !sp.length) continue;
      const q = pick(sp); return { x: q.x, y: q.y, face: q.face + Math.PI, place: pl.name || id };
    }
    return null;
  }
  // un lavoro di un writer NPC: la sua mano, la tavolozza della crew, i segni accanto alle tag, gli slogan sotto i pezzi
  function npcWork(st, n, wr, style, sp, extra) {
    const cr = CREWS.find(c => c.id === wr.crew) || CREWS[0], seed = Math.floor(rnd() * 1e9);
    const dna = wr.dna || WA.dnaOf(seed, wr.skill, cr.col), sk = WA.conceive({ aka: wr.aka, crew: wr.crew, style, dna, seed, by: n.id });   // il bozzetto: lo pensa lui, con la sua mano
    const w = Object.assign(sk, { by: n.id, hand: wr.hand || seed, surf: 'muro', spot: sp, place: sp && sp.place, prog: 0, done: false });
    if (style === 'tag' || style === 'mtag') { const k = .8 + rnd() * .55; w.tagK = k; }
    if (style === 'tag' || style === 'mtag') { if (rnd() < .3) w.sign = pick(WA.SIGNS); }
    else if (style === 'burner' && rnd() < .3) w.words = pick(WA.WORDS);
    return Object.assign(w, extra || {});
  }
  function addWork(st, w) {
    const W = S(st); w.id = W.nextId++; w.t0 = w.t0 || st.t; W.works.push(w);
    if (W.works.length > 900) { let i = W.works.findIndex(o => o.erased && o.by !== 'player'); if (i < 0) i = W.works.findIndex(o => o.by !== 'player' && o.done); if (i >= 0) W.works.splice(i, 1); }
    return w;
  }
  // la notte dei writer: tag, throw-up, pezzi sui muri della città; a volte il treno in deposito; i crossaggi per i beef
  function night(st) {
    const W = S(st), d = dayIdx(st.t);
    if (W.night === d) return; W.night = d; let made = 0;
    W.writers.forEach(id => {
      const n = G.byId(st, id); if (!n || n.dead || n.jailedUntil > st.t || rnd() > (typeof WriterVita !== 'undefined' ? .35 : .7)) return; const wr = writerOf(st, n); if (!wr) return;
      if (n.pop.emer && n.pop.emer.kind === 'writer') return;   // è già fuori a dipingere (writer_vita.js)
      const r = rnd() + wr.skill * .12, style = r < .5 ? 'tag' : r < .8 ? 'throw' : r < .97 ? 'pezzo' : 'burner';
      const sp = nightSpot(st); if (!sp) return;
      addWork(st, npcWork(st, n, wr, style, sp, { prog: 1, done: true }));
      made++;
    });
    // il treno in deposito: una crew fa un whole car (mai sulle fiancate che hai dipinto tu)
    if (TR.ok && rnd() < .4) {
      const crew = pick(CREWS), mem = W.writers.map(id => G.byId(st, id)).filter(n => n && writerOf(st, n) && writerOf(st, n).crew === crew.id);
      const free = []; TR.CARS.forEach((c, i) => [0, 1].forEach(sd => { const k = i + ':' + sd; if (!(W.train.sides[k] && W.train.sides[k].length)) free.push([i, sd]); }));
      if (mem.length && free.length) {
        const [car, side] = pick(free), a = pick(mem), wr = writerOf(st, a), L = TR.CARS[car].L;
        const w = addWork(st, npcWork(st, a, wr, TR.CARS[car].k === 'loco' ? 'burner' : 'wholecar', null, { surf: 'treno', car, side, u0: .3, vb: .25, W: L - .6, H: SIDE_H - .35, prog: 1, done: true }));
        (W.train.sides[car + ':' + side] = W.train.sides[car + ':' + side] || []).push(w.id); W.train.news = `Stanotte i ${crew.id} hanno fatto il treno: ${STYLES[w.style].nome} di ${wr.aka}.`;
      }
    }
    // i carri fermi negli scali: di notte qualcuno ci va (dai varchi)
    if (RAIL.ok && RAIL.yards.length) yardState(st).cons.forEach(c => { if (!c.gone && !c.leave && rnd() < .45) yardPaint(st, c); });
    // i beef: chi è stato crossato crossa
    Object.keys(W.beef).forEach(cid => {
      if (W.beef[cid] <= 0) return;
      const mine = W.works.filter(w => w.by === 'player' && w.done && !w.erased && !w.crossed);
      const mem = W.writers.map(id => G.byId(st, id)).filter(n => n && writerOf(st, n) && writerOf(st, n).crew === cid);
      if (mine.length && mem.length && rnd() < .5 + W.beef[cid] * .2) {
        const w = pick(mine), a = pick(mem); w.crossed = { aka: writerOf(st, a).aka, crew: cid, t: st.t }; W.fame = Math.max(0, W.fame - 3);
        W.news = `Ti hanno crossato ${un(w.style)}${w.place ? ' ' + w.place : ''}: c'è sopra ${w.crossed.aka} ${cid}.`;
      }
      W.beef[cid] = Math.max(0, W.beef[cid] - .5);
    });
    if (made) W.newsWalls = `Stanotte i writer hanno bombato: ${made} lavori nuovi in giro.`;
    grow(st);
  }
  // la mattina: le notizie della notte; il treno che esce col tuo pezzo; il lavaggio delle fiancate vecchie; il buff dei muri
  function morning(st) {
    const W = S(st), d = dayIdx(st.t); if (W.morning === d) return; W.morning = d; W.heat = (W.heat || 0) * .5; if (W.heat < 5) W.heatWarned = false;
    [W.news, W.train.news, W.newsWalls, W.newsCrew].filter(Boolean).forEach(m => G.feed(st, m)); W.news = W.train.news = W.newsWalls = W.newsCrew = null;
    // il treno: tre giorni di linea, poi si lava
    Object.keys(W.train.sides).forEach(k => {
      const ids = W.train.sides[k] || []; const ws = ids.map(id => W.works.find(w => w.id === id)).filter(Boolean);
      const old = ws.filter(w => w.done && d - dayIdx(w.tDone || w.t0) >= 3);
      if (old.length) { old.forEach(w => { w.erased = true; w.washed = true; }); W.train.sides[k] = ids.filter(id => !old.some(w => w.id === id)); if (old.some(w => w.by === 'player')) G.feed(st, 'Hanno lavato il treno: il tuo lavoro è durato tre giorni di linea. Si ricomincia.', 'info'); }
      const run = ws.filter(w => w.done && !w.erased && w.by === 'player');
      if (run.length) { const f = Math.round(run.reduce((s, w) => s + STYLES[w.style].fame * .35, 0)); W.fame += f; G.feed(st, `Il treno esce col tuo ${STYLES[run[0].style].nome}: tutta la linea lo vede (+${f} fama).`); }
    });
    // il buff: i muri del centro ogni tanto vengono ripuliti (i lavori vecchi di più di quattro giorni)
    W.works.forEach(w => { if (w.surf === 'muro' && w.done && !w.erased && d - dayIdx(w.tDone || w.t0) >= 4 && rnd() < (w.old ? .015 : .05)) { w.erased = true; w.buffed = true; } });
  }
  // i writer per strada: ti salutano (o ti minacciano); la crew ti chiede di entrare
  function meet(st) {
    const W = S(st), p = st.player; if (p.vehicle || p.indoor) return;
    for (const id of W.writers) {
      const n = G.byId(st, id); if (!n || n.dead || n.inside || hyp(n.x - p.x, n.y - p.y) > 3.2) continue;
      const wr = writerOf(st, n), day = dayIdx(st.t), k = id + ':' + day; if (W.greeted[k]) continue;
      if (W.beef[wr.crew] > 0) { W.greeted[k] = 1; G.say(st, n, pick([`Tu sei ${playerAka(st)}? Hai crossato i ${wr.crew}. Occhio a te.`, `${playerAka(st)}... i tuoi pezzi durano poco, sai?`, 'Toy. Stai lontano dai nostri muri.']), 4); continue; }
      if (W.fame < 25) continue;
      W.greeted[k] = 1;
      const last = W.works.filter(w => w.by === 'player' && w.done && !w.erased).pop();
      const lines = [`Ehi, ${playerAka(st)}! ${last ? `Ho visto il tuo ${STYLES[last.style].nome}${last.surf === 'treno' ? ' sul treno' : last.place ? ' ' + last.place : ''}.` : 'Si parla di te.'}`, `${wr.aka}, ${wr.crew}. Rispetto, ${playerAka(st)}.`, last && last.surf === 'treno' ? `Il treno col tuo pezzo è passato stamattina. Bomba.` : `Hai i tappi per le bombolette? Quelli originali fanno schifo.`];
      G.say(st, n, pick(lines), 4);
      if (!W.crew && W.fame >= 60 && !W.offer) { W.offer = { crew: wr.crew, by: id, t: st.t }; G.feed(st, `${wr.aka} ti propone di entrare nei ${wr.crew} (${CREWS.find(c => c.id === wr.crew).nome}): dal menu Tasche, «Qui, adesso».`); }
    }
  }

  // ---------------- IL GIOCATORE: modalità, lavori, fama ----------------
  function setMode(st, m) { S(st).mode = m; }
  const mode = st => S(st).mode;
  function cycleMode(st) { const W = S(st), i = MODES.indexOf(W.mode); W.mode = MODES[(i + 1) % MODES.length]; return W.mode; }
  // il lavoro che si sta per fare con questo attrezzo e questa modalità, su questa superficie
  function styleFor(st, tool, surf) {
    if (tool === 'pennarello') return 'mtag';
    const m = mode(st); if (m === 'libero') return null;
    if (m === 'burner' && surf === 'treno') return 'wholecar';
    return m;
  }
  // il rango di quello che c'è sotto: si va sopra solo a chi sta più in basso
  function overlapCheck(st, w) {
    const W = S(st), out = [];
    for (const o of W.works) {
      if (o === w || o.erased || !o.gfxRect || !w.gfxRect) continue;
      if (o.surf !== w.surf) continue;
      if (w.surf === 'treno') { if (o.car !== w.car || o.side !== w.side) continue; if (o.u0 + o.W < w.u0 || w.u0 + w.W < o.u0) continue; }
      else { const a = o.gfxRect, b = w.gfxRect; if (a.n.x * b.n.x + a.n.z * b.n.z < .9) continue; const dpl = (b.c.x - a.c.x) * a.n.x + (b.c.z - a.c.z) * a.n.z; if (Math.abs(dpl) > .35) continue;
        const du = Math.abs((b.c.x - a.c.x) * a.r.x + (b.c.z - a.c.z) * a.r.z), dv = Math.abs(b.c.y - a.c.y); if (du > (a.W + b.W) / 2 - .05 || dv > (a.H + b.H) / 2 - .05) continue; }
      out.push(o);
    }
    return out;
  }
  // quando un lavoro del giocatore copre quello di un altro: andare sopra o crossare
  function judge(st, w) {
    const W = S(st), under = overlapCheck(st, w).filter(o => o.by !== 'player'), R = STYLES[w.style].rank; let msg = null;
    under.forEach(o => {
      const r0 = STYLES[o.style].rank;
      if (R > r0) { o.covered = true; msg = msg || `Vai sopra a ${o.aka}: ${un(w.style)} copre ${un(o.style)}, si può.`; }
      else { o.covered = true; W.beef[o.crew] = (W.beef[o.crew] || 0) + 1 + (r0 - R); msg = `Hai crossato ${o.aka} dei ${o.crew}: ${R === r0 ? 'stesso livello' : un(w.style) + ' sopra ' + un(o.style)}. Non la prenderanno bene.`; }
    });
    w.over = under.map(o => o.id);
    return msg;
  }
  function finish(st, w) {
    const W = S(st), p = st.player; w.done = true; w.prog = 1; w.tDone = st.t;
    const sty = STYLES[w.style]; let mult = 1; const why = [];
    const feetG = (() => { const tx = Math.floor((w.pos ? w.pos.x : p.x) / TS), ty = Math.floor((w.pos ? w.pos.z : p.y) / TS); return G.MAP.elev[ty * G.GW + tx] || 0; })();
    if (w.surf === 'muro' && w.pos && w.pos.y - feetG > 3.2) { mult *= 2.5; why.push('heaven spot'); }
    else if (p.lv && p.lv.k === 'tetto') { mult *= 1.5; why.push('dal tetto'); }
    if (w.surf === 'treno') { mult *= 2; why.push('sul treno'); }
    if (w.surf === 'auto') { mult *= w.cop ? 3 : 1.3; why.push(w.cop ? 'sulla volante dei Grigi' : 'su un\'auto'); if (w.cop) W.heat = (W.heat || 0) + 6; }
    const eyes = st.npcs.filter(n => !n.dead && !n.inside && hyp(n.x - p.x, n.y - p.y) < 28).length; if (eyes >= 3) { mult *= 1 + Math.min(5, eyes) * .08; why.push('davanti alla gente'); }
    if (w.over && w.over.length) { const r0 = Math.max(...w.over.map(id => { const o = W.works.find(x => x.id === id); return o ? STYLES[o.style].rank : 0; })); if (sty.rank > r0) { mult *= 1.2; why.push('sopra a un toy'); } }
    const f = Math.max(1, Math.round(sty.fame * mult)), before = rankOf(W.fame); W.fame += f; W.done[w.style] = (W.done[w.style] || 0) + 1;
    const after = rankOf(W.fame);
    G.feed(st, `${sty.nome[0].toUpperCase() + sty.nome.slice(1)} finito: ${w.aka}${why.length ? ' (' + why.join(', ') + ')' : ''}. +${f} fama.`);
    if (after !== before) G.feed(st, `Adesso sei un ${after}.`, 'good');
    if (w.surf === 'treno') (W.train.sides[w.car + ':' + w.side] = W.train.sides[w.car + ':' + w.side] || []).push(w.id);
    try { G.emit(st, 'graffito', { place: w.place }); } catch (e) { }
    // il Disgelo e i Grigi: la scena ti rispetta, ma chi esagera attira la Celere (le retate partono dagli eventi di vandalismo)
    W.heat = (W.heat || 0) + sty.rank + 1;
    if (W.heat > 9 && !W.heatWarned) { W.heatWarned = true; G.feed(st, 'La Celere dei Grigi cerca chi dipinge: troppi pezzi in pochi giorni. Occhio alle retate.', 'bad'); }
    if (W.heat > 9) { try { G.emit(st, 'vandalismo', { place: w.place }); } catch (e) { } }
  }
  // il passo del lavoro: quanto cresce in dt (secondi veri), quante bombolette consuma; null se manca la vernice
  function progress(st, w, dt) {
    const W = S(st), sty = STYLES[w.style], inv = OG() ? OG().inv(st) : null;
    const k = dt / sty.dur;
    if (sty.marker) { W.mkUse += k / 40; if (W.mkUse >= 1 && inv) { W.mkUse -= 1; inv.pennarello = Math.max(0, (inv.pennarello || 0) - 1); if (!inv.pennarello) delete inv.pennarello; } }
    else if (inv) {
      W.canUse += k * sty.cans;
      while (W.canUse >= 1) { if (!(inv.bomboletta > 0)) return null; inv.bomboletta--; W.canUse -= 1; if (!inv.bomboletta) { delete inv.bomboletta; if (w.prog + k < 1) { w.prog += k; return 'vuota'; } } }
    }
    w.prog = Math.min(1, w.prog + k);
    if (st.clock - (W.emitT || 0) > 6) { W.emitT = st.clock; try { G.emit(st, 'graffito'); } catch (e) { } }
    return w.prog >= 1 ? 'fatto' : 'ok';
  }

  // ---------------- IL PASSO ----------------
  function step(st, dt) {
    if (!st.player) return;
    const W = S(st); initWriters(st);
    const m = minOfDay(st.t);
    if (m >= 60 && m < 240) night(st);
    if (m >= 6 * 60 + 2 && m < 10 * 60) morning(st);
    if (st.clock - (W.meetT || 0) > .5) { W.meetT = st.clock; meet(st); }
    if (TR.ok) trainPush(st, trainAt(st.t));
    if (RAIL.ok) { yardTick(st); fencePush(st); }   // [ferrovia] gli scali e la rete
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Writing]', e); } } }; }
  { const prev = G.HOOKS.verb; G.HOOKS.verb = (st, m, T) => m.type === 'graffito' && m.actor === 'player' ? `ha dipinto sui muri${m.place ? ' ' + m.place : ''}` : (prev ? prev(st, m, T) : null); }
  // il menu «Qui, adesso»: chi sei come writer, la tag da cambiare, la crew
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => { const out = (prev(st) || []).slice(), W = S(st), p = st.player;
    if (p.hand === 'bomboletta' || p.hand === 'pennarello' || W.fame > 0) {
      out.push({ id: 'writer', label: `Writer: ${playerAka(st)}${W.crew ? ' ' + W.crew : ''} · ${rankOf(W.fame)} · fama ${W.fame}`, run: () => renameTag(st), off: 'cambia la tua tag' });
      if (p.hand === 'bomboletta') out.push({ id: 'writer_m', label: `Bomboletta: ${MODE_TXT[W.mode]} (B per cambiare)`, run: () => `Bomboletta: ${MODE_TXT[cycleMode(st)]}.`, off: '' });
    }
    if (W.offer && !W.crew) { const n = G.byId(st, W.offer.by); if (n && hyp(n.x - p.x, n.y - p.y) < 6) out.push({ id: 'crew', label: `Entra nei ${W.offer.crew}`, run: () => { W.crew = W.offer.crew; W.offer = null; W.beef[W.crew] = 0; return `Sei dei ${W.crew}. Da adesso firmi anche per loro.`; }, off: '' }); }
    return out; }; }
  function renameTag(st) {
    const W = S(st); let t = null;
    try { t = typeof prompt === 'function' ? prompt('La tua tag (da 3 a 8 lettere):', playerAka(st)) : null; } catch (e) { t = null; }
    if (!t) return null; t = String(t).toUpperCase().normalize('NFD').replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (t.length < 2) return 'Troppo corta.'; W.aka = t; return `D'ora in poi firmi ${t}.`;
  }

  // il disegno dei lavori (le tappe da svelare in ordine): writer_arte.js
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const mulberry = WA.mulberry, art = w => WA.art(w), crossOut = WA.crossOut, PPM = WA.PPM;

  // =====================================================================================================================
  // LA GRAFICA: veli sui muri, il treno, la galleria
  // =====================================================================================================================
  const GFX = { works: {}, st: null, rc: null, train: null, track: null, base: {} };
  const T3 = () => window.THREE;
  const R_ = () => window.__pv && window.__pv.R;
  function scene() { const R = R_(); return R && R.__models && R.__models.scene; }
  function canvasTexture(c) { const t = new (T3().CanvasTexture)(c); t.encoding = T3().sRGBEncoding; t.anisotropy = 4; return t; }
  // il piano del muro davanti a un punto: raggio orizzontale verso face (gli NPC) o il colpo del giocatore
  function cands(x, z) { const R = R_(); try { return R.__bmb.bmbCands(x, z).filter(o => !o.userData.velo && !o.userData.wr); } catch (e) { return []; } }
  function rayWall(o, d, far, list) {
    const THREE = T3(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.set(o, d); rc.far = far; rc.near = 0;
    const h = rc.intersectObjects(list, false).find(h => { if (!h.face) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); });
    if (!h) return null; const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(d) > 0) n.negate(); return { p: h.point.clone(), n, obj: h.object };
  }
  // il riquadro W × H centrato in c sul piano (n orizzontale): è tutto muro? (9 raggi); se no si rimpicciolisce
  function wallRect(c, n, W, H, list) {
    const THREE = T3(), r = new THREE.Vector3(n.z, 0, -n.x).normalize();
    for (let k = 0; k < 3; k++) {
      const s = Math.pow(.8, k), w = W * s, h = H * s; let ok = true;
      for (const [a, b] of [[0, 0], [-.48, -.46], [.48, -.46], [-.48, .46], [.48, .46], [0, -.46], [0, .46], [-.48, 0], [.48, 0]]) {
        const q = c.clone().addScaledVector(r, a * w).add(new THREE.Vector3(0, b * h, 0)), o = q.clone().addScaledVector(n, .6), hit = rayWall(o, n.clone().negate(), 1.3, list);
        if (!hit || Math.abs(hit.p.distanceTo(o) - .6) > .28 || hit.n.dot(n) < .8) { ok = false; break; }
      }
      if (ok) return { W: w, H: h, r };
    }
    return null;
  }
  // il velo di un lavoro: un piano appoggiato al muro col suo canvas
  function makeVeil(w, g) {
    const THREE = T3(), R = w.gfxRect, c = cv(g.Wp, g.Hp), tex = canvasTexture(c);
    const layer = S(GFX.st).works.filter(o => o.gfxRect && o !== w && overlapCheck(GFX.st, w).includes(o)).length;
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 - layer, polygonOffsetUnits: -4 - layer * 2 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(R.W, R.H), mat); mesh.userData.velo = true; mesh.userData.wr = w.id; mesh.renderOrder = 3 + layer;
    mesh.position.set(R.c.x + R.n.x * (.014 + layer * .004), R.c.y, R.c.z + R.n.z * (.014 + layer * .004)); mesh.lookAt(mesh.position.x + R.n.x, mesh.position.y, mesh.position.z + R.n.z);
    mesh.receiveShadow = true; scene().add(mesh); mesh.updateMatrixWorld(true);
    if (R.obj && R.veh) R.obj.attach(mesh);   // sulle auto il velo segue il mezzo
    return { mesh, c, ctx: c.getContext('2d'), tex, x0: 0, y0: 0, k: 1 };
  }
  // disegna il lavoro fino a prog (le tappe in ordine, ognuna da sinistra a destra)
  // LA SVELATURA. I lavori degli NPC crescono lungo il percorso della mano (art.paths: i tratti delle lettere, le passate dello
  // sfondo): la bomboletta «gratta via» il muro e scopre la tappa in corso. Il giocatore invece ricalca a mano (traceAt).
  // g.drawn: tappe fatte (con la frazione della tappa in corso); i lavori finiti si disegnano in un colpo.
  function stamp(T, img, x, y, R) {
    const k = T.k, X = T.x0 + x * k, Y = T.y0 + y * k, sx = Math.max(0, Math.floor(x - R)), sy = Math.max(0, Math.floor(y - R)), sw = Math.min(img.width - sx, Math.ceil(2 * R) + 1), sh = Math.min(img.height - sy, Math.ceil(2 * R) + 1); if (sw <= 0 || sh <= 0) return;
    const c = T.ctx; c.save(); c.beginPath(); c.arc(X, Y, R * k, 0, 7); c.clip(); c.drawImage(img, sx, sy, sw, sh, T.x0 + sx * k, T.y0 + sy * k, sw * k, sh * k); c.restore();
    c.save(); c.globalAlpha = .35; c.beginPath(); c.arc(X, Y, R * k * 1.35, 0, 7); c.arc(X, Y, R * k, 0, 7, true); c.clip(); c.drawImage(img, sx, sy, sw, sh, T.x0 + sx * k, T.y0 + sy * k, sw * k, sh * k); c.restore();   // la nebbia attorno al getto
  }
  function fullStage(T, img, A) { T.ctx.drawImage(img, 0, 0, A.Wp, A.Hp, T.x0, T.y0, A.Wp * T.k, A.Hp * T.k); }
  function drawUpTo(w, g) {
    const A = g.art, T = g.tgt; if (!A || !T) return; const nS = A.stages.length;
    if (w.trace && !w.done) {   // il giocatore: lo disegna traceAt; qui solo il ritorno (le tappe già fatte, dopo che la grafica è stata liberata)
      if (g.ts == null) { g.ts = Math.min(nS - 1, Math.floor(w.prog * nS)); ghost(T, A, w); if (g.ts > 0) fullStage(T, A.stages[g.ts - 1], A); g.drawn = g.ts; T.tex.needsUpdate = true; }
      return;
    }
    const want = (w.done ? 1 : clamp(w.prog, 0, 1)) * nS;
    if (w.done && !g.drawn) { fullStage(T, A.stages[nS - 1], A); g.drawn = nS; if (!w.crossed) { A.stages = [A.stages[nS - 1]]; A.paths = A.need = null; g.drawn = 1; T.tex.needsUpdate = true; return; } }   // finito: basta l'immagine finale
    let guard = 0;
    while (g.drawn < want - 1e-6 && guard++ < nS + 2) {
      const sI = Math.min(nS - 1, Math.floor(g.drawn)), a = g.drawn - sI, b = Math.min(1, want - sI), P = A.paths[sI] || [], R = A.radii[sI] || 8, img = A.stages[sI];
      const i0 = Math.floor(a * P.length), i1 = Math.min(P.length, Math.ceil(b * P.length));
      for (let i = i0; i < i1; i++) stamp(T, img, P[i][0], P[i][1], R);
      if (b >= 1) { fullStage(T, img, A); g.drawn = sI + 1; } else g.drawn = sI + b;
    }
    T.tex.needsUpdate = true;
    if (w.crossed && !g.crossDrawn && (w.done || w.prog >= 1)) { g.crossDrawn = true; crossOut(T.ctx, T.x0, T.y0, A.Wp * T.k, A.Hp * T.k, w.crossed, mulberry(w.seed + 7)); T.tex.needsUpdate = true; }
  }
  // il bozzetto sul muro, appena accennato: il writer lo ricalca (col disegno pronto si vede meglio)
  function ghost(T, A, w) { T.ctx.save(); T.ctx.globalAlpha = w.sketch ? .2 : .09; fullStage(T, A.stages[A.stages.length - 1], A); T.ctx.restore(); }
  // dove sta la mano di un NPC: il punto del percorso a cui è arrivato (pixel del lavoro)
  function pathPoint(w, g) {
    const A = g && g.art; if (!A) return null; const nS = A.stages.length, d = clamp(w.prog, 0, 1) * nS, sI = Math.min(nS - 1, Math.floor(d)), P = A.paths[sI] || []; if (!P.length) return null;
    return P[Math.min(P.length - 1, Math.floor((d - sI) * P.length))];
  }
  // un punto del lavoro (pixel) nel mondo
  function workPoint(w, g, px, py) {
    const A = g.art, fu = px / A.Wp, fv = py / A.Hp;
    if (w.surf === 'treno') { const tr = trainAt(GFX.st.t); return sidePoint(tr, w.car, w.side, w.u0 + fu * w.W, BODY_Y + w.vb + (1 - fv) * w.H); }
    const R = w.gfxRect; if (!R) return null; return { x: R.c.x + R.r.x * (fu - .5) * R.W, y: R.c.y + (.5 - fv) * R.H, z: R.c.z + R.r.z * (fu - .5) * R.W };
  }
  function tipOf(w, g) {
    const q = pathPoint(w, g); if (q) { const tp = workPoint(w, g, q[0], q[1]); if (tp) return tp; }
    const v = (Math.sin(performance.now() / 160) * .35), u = (w.prog % 1) - .5;
    if (w.surf === 'treno') { const tr = trainAt(GFX.st.t); return sidePoint(tr, w.car, w.side, w.u0 + (u + .5) * w.W, BODY_Y + w.vb + w.H * (.5 + v * .6)); }
    const R = w.gfxRect; return { x: R.c.x + R.r.x * u * R.W, y: R.c.y + v * R.H * .6, z: R.c.z + R.r.z * u * R.W };
  }
  // IL RICALCO del giocatore: dove passa il getto (lx, ly: pixel del lavoro) la tappa in corso si scopre; la tappa è fatta quando
  // è coperto quasi tutto quello che serve (le celle dove la tappa cambia qualcosa). Ritorna quante celle nuove ha coperto.
  const CELL = 9;
  function needOf(A, sI) {
    A.need = A.need || []; if (A.need[sI]) return A.need[sI];
    const gw = Math.ceil(A.Wp / CELL), gh = Math.ceil(A.Hp / CELL), small = cv(gw, gh), sx = small.getContext('2d');
    const read = img => { sx.clearRect(0, 0, gw, gh); if (img) sx.drawImage(img, 0, 0, gw, gh); return sx.getImageData(0, 0, gw, gh).data; };
    const a = read(A.stages[sI]), b = read(sI ? A.stages[sI - 1] : null), need = new Uint8Array(gw * gh); let n = 0;
    for (let i = 0; i < gw * gh; i++) { const d = Math.abs(a[i * 4] - b[i * 4]) + Math.abs(a[i * 4 + 1] - b[i * 4 + 1]) + Math.abs(a[i * 4 + 2] - b[i * 4 + 2]) + Math.abs(a[i * 4 + 3] - b[i * 4 + 3]) * 2; if (d > 60) { need[i] = 1; n++; } }
    return (A.need[sI] = { need, n: Math.max(1, n), gw, gh, got: new Uint8Array(gw * gh), cov: 0 });
  }
  function traceAt(w, g, lx, ly, R) {
    const A = g.art, T = g.tgt, nS = A.stages.length; if (g.ts == null) { g.ts = 0; ghost(T, A, w); }
    if (g.ts >= nS) return 0;
    const sI = g.ts, N = needOf(A, sI), img = A.stages[sI], Rs = R * (A.paths[sI] && sI > 0 && sI < nS - 1 && A.radii[sI] > A.radii[0] * 2 ? 1.6 : 1);
    stamp(T, img, lx, ly, Rs); T.tex.needsUpdate = true;
    let got = 0; const c0 = Math.floor((lx - Rs) / CELL), c1 = Math.floor((lx + Rs) / CELL), r0 = Math.floor((ly - Rs) / CELL), r1 = Math.floor((ly + Rs) / CELL);
    for (let cy = Math.max(0, r0); cy <= Math.min(N.gh - 1, r1); cy++) for (let cx = Math.max(0, c0); cx <= Math.min(N.gw - 1, c1); cx++) { const i = cy * N.gw + cx; if (!N.need[i] || N.got[i]) continue; if (hyp((cx + .5) * CELL - lx, (cy + .5) * CELL - ly) > Rs + CELL * .5) continue; N.got[i] = 1; got++; N.cov++; }
    if (N.cov / N.n >= .9) { fullStage(T, img, A); g.ts++; }   // la tappa è fatta: si pulisce e si passa alla prossima
    w.prog = clamp((g.ts + (g.ts < nS ? needOf(A, Math.min(nS - 1, g.ts)).cov / needOf(A, Math.min(nS - 1, g.ts)).n : 0)) / nS, 0, g.ts >= nS ? 1 : .999);
    g.cellCost = g.cellCost || 1 / A.stages.reduce((s0, _, k) => s0 + needOf(A, k).n, 0);
    return got;
  }
  // un lavoro su un'auto: la fiancata del modello, il velo attaccato al mezzo (se riparte se lo porta via)
  function vehGroup(id) { const R = R_(); return R && R.__vehicles && R.__vehicles[id]; }
  function vehOf(o) { const R = R_(), V = R && R.__vehicles; if (!V) return null; let g = o; while (g) { for (const id in V) if (V[id] === g) return id; g = g.parent; } return null; }
  function placeVeh(w) {
    const THREE = T3(), R = R_(), st = GFX.st, v = st.vehicles.find(x => x.id === w.veh), g = vehGroup(w.veh); if (!v || !g || v.hidden || v.wreck) return false;
    g.updateMatrixWorld(true); const sd = w.side || 1, nx = -Math.sin(v.ang) * sd, nz = Math.cos(v.ang) * sd, gh = R.groundH(v.x, v.y), along = (w.du || 0);
    const o = new THREE.Vector3(v.x + Math.cos(v.ang) * along + nx * 3, gh + .85, v.y + Math.sin(v.ang) * along + nz * 3), d = new THREE.Vector3(-nx, 0, -nz);
    const rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.set(o, d); rc.far = 5; const h = rc.intersectObject(g, true).find(h => h.face && !h.object.userData.velo); if (!h) return false;
    const n = new THREE.Vector3(nx, 0, nz), sty = STYLES[w.style], k = w.style === 'tag' || w.style === 'mtag' ? (w.tagK || 1) : 1, W0 = Math.min(sty.W * k, 3.2), H0 = Math.min(sty.H * k, 1);
    const c = h.point.clone(); c.y = gh + .55 + H0 / 2; w.W = W0; w.H = H0; w.gfxRect = { c, n, r: new THREE.Vector3(n.z, 0, -n.x), W: W0, H: H0, obj: g, veh: true }; w.pos = { x: c.x, y: c.y, z: c.z }; return true;
  }
  // un lavoro degli NPC (o di prima di un ricaricamento): trova il suo muro
  function placeWall(w) {
    if (w.surf === 'auto') return placeVeh(w);
    const THREE = T3(), R = R_(), sp = w.spot; if (!sp) return false;
    const gh = R.groundH(sp.x, sp.y), list = cands(sp.x, sp.y); if (!list.length) return false;
    const d = new THREE.Vector3(Math.cos(sp.face), 0, Math.sin(sp.face)), sty = STYLES[w.style];
    const y0 = sp.h != null ? sp.h : gh + 1.4, hit = rayWall(new THREE.Vector3(sp.x, y0, sp.y), d, sp.h != null ? 6 : 3, list); if (!hit || Math.abs(hit.n.y) > .4) return false;
    const k = w.tagK || 1, H = sty.H * k, n = new THREE.Vector3(hit.n.x, 0, hit.n.z).normalize(), c = hit.p.clone(); c.y = sp.h != null ? sp.h : gh + .2 + H / 2 + (w.style === 'tag' || w.style === 'mtag' ? .3 + rnd() * 1.4 : 0);
    const fitR = wallRect(c, n, sty.W * k, H, list); if (!fitR) return false;
    w.W = fitR.W; w.H = fitR.H; w.gfxRect = { c, n, r: fitR.r, W: fitR.W, H: fitR.H }; w.pos = { x: c.x, y: c.y, z: c.z };
    // niente due lavori uno sull'altro di notte: se si accavalla, salta
    if (!/^(tag|mtag|gotico)$/.test(w.style) && overlapCheck(GFX.st, w).filter(o => !/^(tag|mtag|gotico)$/.test(o.style)).length) { w.gfxRect = null; return false; }   // le tag si mettono sopra a tutto (i muri veri sono a strati); i pezzi non si accavallano fra loro
    return true;
  }

  // ---------------- IL TRENO (grafica) ----------------
  const SIDE_H = 2.9, SPPM = 48, BODY_Y = 1.15;
  // un punto della fiancata (u metri dal bordo sinistro di chi guarda, y sopra il ferro) nel mondo, e la normale verso fuori
  function sidePoint(tr, i, side, u, y) {
    const q = carPose(tr, i), c = Math.cos(q.ang), sn = Math.sin(q.ang), sd = side ? 1 : -1, along = side ? -q.L / 2 + u : q.L / 2 - u, out = TR.W / 2 + .02;
    return { x: q.x + c * along - sn * sd * out, y: q.h + y, z: q.y + sn * along + c * sd * out, nx: -sn * sd, nz: c * sd };
  }
  function livery(c, kind, L, side) {
    const x = c.getContext('2d'), Wp = c.width, Hp = c.height, m = v => v * SPPM, Y = v => Hp - m(v);   // v: metri dal basso della fiancata
    if (kind === 'loco') {   // il diesel della miniera (D.345): castano sotto, isabella sopra, la cabina in fondo
      x.fillStyle = '#6a3a2a'; x.fillRect(0, 0, Wp, Hp); x.fillStyle = '#e2c99c'; x.fillRect(0, 0, Wp, Y(1.45)); x.fillStyle = '#4a2a1e'; x.fillRect(0, Y(1.5), Wp, m(.08));
      for (let k = 0; k < 6; k++) { const gx = m(4 + k * 1.3); x.fillStyle = '#5a5048'; x.fillRect(gx, Y(2.4), m(1), m(.7)); x.strokeStyle = '#3a322c'; x.lineWidth = 2; for (let yy = 0; yy < 6; yy++) { x.beginPath(); x.moveTo(gx, Y(2.4) + yy * m(.11) + 3); x.lineTo(gx + m(1), Y(2.4) + yy * m(.11) + 3); x.stroke(); } }
      const cab = side ? Wp - m(2.6) : m(.4); x.fillStyle = '#1c2228'; x.fillRect(cab, Y(2.55), m(1.1), m(.85)); x.fillStyle = '#3a3a3e'; x.fillRect(cab + (side ? -m(.9) : m(1.3)), Y(2.25), m(.7), m(1.9));
      x.fillStyle = '#f2e6c8'; x.font = `bold ${m(.3)}px Arial`; x.fillText('D.345 1078', m(5), Y(.95)); x.fillText('FS', m(11), Y(.95));
    } else if (kind === 'chiuso') {   // il carro chiuso marrone, le porte scorrevoli, le scritte di servizio
      x.fillStyle = '#6a3a26'; x.fillRect(0, 0, Wp, Hp);
      x.strokeStyle = '#4e2a1a'; x.lineWidth = 2; for (let u = m(.5); u < Wp; u += m(.62)) { x.beginPath(); x.moveTo(u, 0); x.lineTo(u, Hp); x.stroke(); }   // le assi
      for (const dx of [Wp / 2 - m(1.6), Wp / 2 + m(.1)]) { x.fillStyle = '#5a3020'; x.fillRect(dx, Y(2.6), m(1.5), m(2.5)); x.strokeStyle = '#2a1a10'; x.strokeRect(dx, Y(2.6), m(1.5), m(2.5)); }
      x.fillStyle = '#2a2a2c'; x.fillRect(Wp / 2 - m(1.7), Y(2.68), m(3.4), m(.08)); x.fillRect(Wp / 2 - m(1.7), Y(.12), m(3.4), m(.06));
      x.fillStyle = '#e8e2d0'; x.font = `bold ${m(.26)}px Arial`; x.fillText('FS  Gbs', m(1), Y(2.2)); x.font = `${m(.16)}px Arial`; x.fillText('21 83 150 ' + (2040 + L + side), m(1), Y(1.9)); x.fillText('20 t   MINIERA NORD', m(1), Y(.6));
    } else {   // la tramoggia del carbone: grigio scuro, le nervature, la polvere nera
      x.fillStyle = '#4a4e52'; x.fillRect(0, 0, Wp, Hp); x.fillStyle = '#3a3e42'; for (let u = m(.9); u < Wp; u += m(1.6)) x.fillRect(u, 0, m(.14), Hp);
      x.fillStyle = 'rgba(16,16,18,.55)'; x.fillRect(0, 0, Wp, m(.35)); x.fillStyle = '#d8d4c8'; x.font = `bold ${m(.26)}px Arial`; x.fillText('CARBONE', m(1.4), Y(1.6)); x.font = `${m(.16)}px Arial`; x.fillText('Fcs 31 83 664 ' + (310 + side), m(1.4), Y(1.3));
    }
    if (kind !== 'loco') { const hr2 = k => { const v = Math.sin(k * 91.7 + L * 13.1 + side * 7.3) * 43758.5453; return v - Math.floor(v); };   // l'usura: colature di pioggia e ruggine, chiazze, le file di ribattini
      for (let k = 0; k < 60; k++) { const u = hr2(k) * Wp, l = m(.3 + hr2(k + 1) * 1.6), y0 = hr2(k + 2) * m(.5), gr = x.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, k % 4 ? 'rgba(20,18,16,.22)' : 'rgba(140,70,30,.35)'); gr.addColorStop(1, 'rgba(20,18,16,0)'); x.fillStyle = gr; x.fillRect(u, y0, 1 + hr2(k + 3) * 4, l); }
      for (let k = 0; k < 14; k++) { x.fillStyle = `rgba(${110 + hr2(k + 50) * 40},${55 + hr2(k + 51) * 20},${25},${.15 + hr2(k + 52) * .25})`; x.beginPath(); x.ellipse(hr2(k + 53) * Wp, hr2(k + 54) * Hp, m(.1 + hr2(k + 55) * .4), m(.06 + hr2(k + 56) * .25), hr2(k + 57) * 3, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(0,0,0,.35)'; for (const yy of [m(.08), Hp - m(.08)]) for (let u = m(.1); u < Wp; u += m(.18)) { x.beginPath(); x.arc(u, yy, 1.6, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(255,255,255,.08)'; for (const yy of [m(.08), Hp - m(.08)]) for (let u = m(.1); u < Wp; u += m(.18)) { x.beginPath(); x.arc(u - .6, yy - .6, .8, 0, 7); x.fill(); } }
    const g = x.createLinearGradient(0, Hp, 0, Hp - m(.8)); g.addColorStop(0, 'rgba(30,26,22,.6)'); g.addColorStop(1, 'rgba(30,26,22,0)'); x.fillStyle = g; x.fillRect(0, Hp - m(.8), Wp, m(.8));   // lo sporco di linea
  }
  // [ferrovia] il carro vero sotto la fiancata: il telaio a longheroni, le traverse di testa coi respingenti a piattello e il
  // gancio a vite, i carrelli col fianco, le balestre e le boccole, le ruote col bordino; gli spigoli in angolare, le maniglie e
  // i predellini agli angoli; il tetto curvo del carro chiuso, il bordo e il carbone a cumuli della tramoggia
  const WMAT = {};
  function wagDetail(g, kind, L, opt) {
    const THREE = T3(), Wd = TR.W, M = (k, c, o) => WMAT[k] || (WMAT[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: .35 }, o || {})));
    const dark = M('d', '#26262a'), steel = M('s', '#3c3c40', { metalness: .6, roughness: .5 }), rust = M('r', '#5a3a2a', { metalness: .3, roughness: .9 }), red = M('h', '#8a2a22'), hand = M('y', '#c8b040', { roughness: .6 }), whM = M('w', '#3a3836', { metalness: .7, roughness: .45 });
    const add = (geo, m, x, y, z, rx, ry, rz, par) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; (par || g).add(o); return o; };
    const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r0, r1, h, n) => new THREE.CylinderGeometry(r0, r1, h, n || 12);
    const yF = BODY_Y - .22;
    // il telaio: due longheroni a C, le traverse, le traverse di testa rosse
    for (const sz of [-1, 1]) { add(B(L, .32, .08), dark, 0, yF, sz * (Wd / 2 - .18)); add(B(L, .04, .2), dark, 0, yF + .14, sz * (Wd / 2 - .24)); add(B(L, .04, .2), dark, 0, yF - .14, sz * (Wd / 2 - .24)); }
    for (let u = -L / 2 + 1.2; u < L / 2 - 1; u += 1.6) add(B(.12, .22, Wd - .5), dark, u, yF, 0);
    for (const e of [-1, 1]) {
      const ex = e * (L / 2 + .06); add(B(.14, .42, Wd + .1), red, ex, yF, 0);
      for (const sz of [-.88, .88]) { add(Cy(.07, .09, .42), steel, ex + e * .22, yF + .02, sz, 0, 0, Math.PI / 2); add(Cy(.2, .2, .05, 16), steel, ex + e * .45, yF + .02, sz, 0, 0, Math.PI / 2); }   // i respingenti
      add(B(.3, .1, .12), steel, ex + e * .2, yF + .02, 0); const lk = add(new THREE.TorusGeometry(.09, .022, 6, 12), steel, ex + e * .36, yF - .06, 0, 0, Math.PI / 2, 0); lk.scale.set(1, 1.6, 1);   // il gancio e la maglia
      for (const sz of [-1, 1]) {   // i predellini e le maniglie agli angoli
        const zx = sz * (Wd / 2 - .05), sx = e * (L / 2 - .35); add(B(.42, .04, .2), dark, sx, BODY_Y - .55, sz * (Wd / 2 + .02)); add(B(.03, .45, .03), dark, sx - .19, BODY_Y - .35, sz * (Wd / 2 + .02)); add(B(.03, .45, .03), dark, sx + .19, BODY_Y - .35, sz * (Wd / 2 + .02));
        add(Cy(.016, .016, .9, 6), hand, e * (L / 2 + .04), BODY_Y + 1, zx); add(B(.05, .02, .02), hand, e * (L / 2 + .02), BODY_Y + .55, zx); add(B(.05, .02, .02), hand, e * (L / 2 + .02), BODY_Y + 1.45, zx);
      }
      // la parete di testa: nervature verticali e il traverso
      for (const z of [-.7, 0, .7]) add(B(.06, SIDE_H - .1, .1), opt.bodyM, e * (L / 2 + .01), BODY_Y + SIDE_H / 2, z);
      add(B(.06, .12, Wd - .1), opt.bodyM, e * (L / 2 + .02), BODY_Y + SIDE_H * .55, 0);
      // il carrello: la trave, i fianchi, le boccole, le balestre, le sale con le ruote a bordino
      const bg = new THREE.Group(); bg.position.set(e * (L / 2 - 2.4), .5, 0); g.add(bg);
      add(B(.5, .3, Wd - .6), dark, 0, .2, 0, 0, 0, 0, bg);
      for (const sz of [-1, 1]) { const zz = sz * .86; add(B(2.5, .16, .1), dark, 0, .16, zz, 0, 0, 0, bg); add(B(1.1, .1, .1), dark, 0, -.04, zz, 0, 0, 0, bg);
        for (const ax of [-.9, .9]) { add(B(.26, .3, .16), rust, ax, 0, zz + sz * .04, 0, 0, 0, bg); for (let l = 0; l < 4; l++) add(B(.9 - l * .16, .025, .1), steel, ax * .55, .28 + l * .028, zz, 0, 0, 0, bg); } }
      for (const ax of [-.9, .9]) { add(Cy(.06, .06, 1.6, 8), steel, ax, -.05, 0, Math.PI / 2, 0, 0, bg); for (const sz of [-1, 1]) { add(Cy(.46, .46, .12, 22), whM, ax, -.05, sz * .72, Math.PI / 2, 0, 0, bg); add(Cy(.5, .5, .03, 22), whM, ax, -.05, sz * .66, Math.PI / 2, 0, 0, bg); add(Cy(.16, .16, .14, 10), rust, ax, -.05, sz * .73, Math.PI / 2, 0, 0, bg); } }
    }
    // gli spigoli della cassa in angolare
    for (const e of [-1, 1]) for (const sz of [-1, 1]) add(B(.07, SIDE_H, .07), opt.bodyM, e * (L / 2 - .02), BODY_Y + SIDE_H / 2, sz * (Wd / 2 - .02));
    if (kind === 'chiuso') {   // il tetto curvo a lamiera (un arco di cilindro lungo il carro), le guide delle porte
      const R0 = Wd * .9, rg = new THREE.CylinderGeometry(R0, R0, L + .1, 24, 1, true, -.62, 1.24); rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2); const rf = new THREE.Mesh(rg, M('t', '#5a5c5e', { side: THREE.DoubleSide }));
      rf.position.set(0, BODY_Y + SIDE_H - R0 * Math.cos(.62) + .01, 0); rf.castShadow = true; g.add(rf);
      for (const sz of [-1, 1]) { add(B(3.6, .06, .05), dark, 0, BODY_Y + SIDE_H - .08, sz * (Wd / 2 + .03)); add(B(3.6, .06, .05), dark, 0, BODY_Y + .06, sz * (Wd / 2 + .03)); }
    } else if (kind === 'tramoggia') {   // il bordo superiore e il carbone a cumuli
      for (const sz of [-1, 1]) add(B(L, .08, .1), dark, 0, BODY_Y + SIDE_H + .02, sz * (Wd / 2 - .02)); for (const e of [-1, 1]) add(B(.1, .08, Wd), dark, e * (L / 2 - .02), BODY_Y + SIDE_H + .02, 0);
      const coal = M('c', '#141416', { roughness: .9, metalness: .1 }); for (let k = 0; k < 5; k++) { const hp = add(new THREE.SphereGeometry(1, 14, 8), coal, -L / 2 + 1.4 + k * (L - 2.8) / 4, BODY_Y + SIDE_H - .2, 0); hp.scale.set(1.6, .5, Wd / 2 - .15); }
    }
  }
  function trainGroup() {
    const THREE = T3(), grp = new THREE.Group(); grp.name = 'treno_miniera';
    const M = (col, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: .7, metalness: .25 }, o || {}));
    const box = (g, w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    const dark = M('#1c1c20'), roofM = M('#4a4e52'), wheel = M('#2a2a2c', { metalness: .6 }), lampW = new THREE.MeshBasicMaterial({ color: '#fff4d0' }), lampR = new THREE.MeshBasicMaterial({ color: '#ff2a1a' }), coal = M('#121214', { roughness: 1, metalness: 0 });
    const cars = TR.CARS.map((c, i) => {
      const g = new THREE.Group(), L = c.L, Wd = TR.W, loco = c.k === 'loco';
      const sides = [0, 1].map(sd => {   // le due fiancate: canvas propri (si dipingono come un muro)
        const cnv = cv(L * SPPM, SIDE_H * SPPM); livery(cnv, c.k, L, c.back ? 1 - sd : sd);
        const base = cv(cnv.width, cnv.height); base.getContext('2d').drawImage(cnv, 0, 0); GFX.base[i + ':' + sd] = base;
        const tex = canvasTexture(cnv), m = new THREE.MeshStandardMaterial({ map: tex, roughness: .6, metalness: .2 });
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(L, SIDE_H), m); pl.position.set(0, BODY_Y + SIDE_H / 2, (sd ? 1 : -1) * Wd / 2); if (!sd) pl.rotation.y = Math.PI;
        pl.castShadow = true; pl.receiveShadow = true; pl.userData.car = { i, side: sd }; g.add(pl);
        return { mesh: pl, c: cnv, ctx: cnv.getContext('2d'), tex };
      });
      box(g, L - .02, SIDE_H - .02, Wd - .04, M(loco ? '#6a3a2a' : c.k === 'chiuso' ? '#6a3a26' : '#4a4e52'), 0, BODY_Y + SIDE_H / 2, 0).userData.wr = 1;   // il corpo
      if (loco) box(g, L, .2, Wd + .06, roofM, 0, BODY_Y + SIDE_H + .1, 0).userData.wr = 1;   // i carri: il tetto e il carbone li fa wagDetail
      if (!loco) { wagDetail(g, c.k, L, { bodyM: M(c.k === 'chiuso' ? '#5e3220' : '#42464a') }); grp.add(g); return { g, sides, L }; }
      box(g, L - .4, .45, Wd - .3, dark, 0, BODY_Y - .2, 0);   // il telaio
      for (const e of [-1, 1]) {
        const bg = new THREE.Group(); bg.position.set(e * (L / 2 - 2.4), .55, 0); g.add(bg); box(bg, 2.6, .45, 2.0, dark, 0, .1, 0);   // i carrelli
        for (const ax of [-.8, .8]) for (const s2 of [-1, 1]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .14, 14), wheel); wh.rotation.x = Math.PI / 2; wh.position.set(ax, -.08, s2 * .72); bg.add(wh); }
        for (const s2 of [-1, 1]) box(g, .35, .22, .22, M('#3a3a3c', { metalness: .6 }), e * (L / 2 + .15), BODY_Y - .1, s2 * .75);   // i respingenti
      }
      if (loco) {   // la cabina verso fuori del convoglio, lo scarico, i fanali (bianchi davanti, rossi dietro)
        const e = c.back ? -1 : 1;
        box(g, .06, .9, 2.3, M('#1c2228'), e * (L / 2 + .01), BODY_Y + 2.2, 0); box(g, .5, .5, .5, dark, -e * L * .2, BODY_Y + SIDE_H + .3, 0);
        for (const s2 of [-1, 1]) { box(g, .06, .2, .3, lampW, e * (L / 2 + .02), BODY_Y + .6, s2 * .9); box(g, .06, .14, .2, lampR, e * (L / 2 + .02), BODY_Y + .95, s2 * 1.1); }
      }
      grp.add(g); return { g, sides, L };
    });
    return { grp, cars };
  }
  // [ferrovia] I MATERIALI DELLA LINEA: dipinti a mano su canvas (niente colori pieni): la ghiaia sasso per sasso con la luce e
  // l'ombra, la terra con l'erba rada e i ciottoli, il cemento coi casseri, le colature e le macchie, il legno delle traversine
  // con le venature e le crepe, l'erba e le foglie su carte trasparenti (i ciuffi veri, non i coni)
  let RTEX = null;
  function railTex() {
    if (RTEX) return RTEX; const THREE = T3();
    const hr = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const mk = (w, h, f, rep) => { const c = cv(w, h), x = c.getContext('2d'); f(x, w, h); const t = canvasTexture(c); if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; };
    const stones = (x, w, h, n, r0, r1, pal, seed) => { for (let k = 0; k < n; k++) { const px = hr(seed + k) * w, py = hr(seed + k * 1.7 + 3) * h, r = r0 + hr(seed + k * 2.3) * (r1 - r0), a = hr(seed + k * 3.1) * 3.14, c = pal[Math.floor(hr(seed + k * 5.7) * pal.length)];
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { const cx = px + dx, cy = py + dy; if (cx < -r1 * 2 || cx > w + r1 * 2 || cy < -r1 * 2 || cy > h + r1 * 2) continue;
        x.save(); x.translate(cx, cy); x.rotate(a); x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(r * .18, r * .22, r, r * .72, 0, 0, 7); x.fill();   // l'ombra
        x.fillStyle = c; x.beginPath(); for (let j = 0; j < 7; j++) { const aa = j / 7 * 6.283, rr = r * (.78 + hr(seed + k * 7 + j) * .3); x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * .72); } x.closePath(); x.fill();
        const gr = x.createRadialGradient(-r * .35, -r * .3, 0, 0, 0, r); gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = gr; x.fill(); x.restore(); } } };
    RTEX = {
      // la ghiaia: pietrisco spaccato, grigio, qualche sasso rossiccio, la polvere fra i sassi
      gravel: mk(512, 512, (x, w, h) => { x.fillStyle = '#5a5650'; x.fillRect(0, 0, w, h); stones(x, w, h, 2600, 4, 11, ['#8a857c', '#77736b', '#9a948a', '#6c675f', '#a39b8e', '#7d6e5e', '#878279'], 11); stones(x, w, h, 900, 2, 5, ['#9a948a', '#6e6a62', '#857f75'], 77); }, true),
      // la terra della scarpata: bruno secco, ciottoli, l'erba rada a ciuffi
      earth: mk(512, 512, (x, w, h) => { x.fillStyle = '#86775a'; x.fillRect(0, 0, w, h); for (let k = 0; k < 4000; k++) { x.fillStyle = `rgba(${70 + hr(k) * 60},${60 + hr(k + 1) * 50},${35 + hr(k + 2) * 30},.35)`; x.fillRect(hr(k + 3) * w, hr(k + 4) * h, 2 + hr(k + 5) * 4, 2 + hr(k + 6) * 3); } stones(x, w, h, 260, 2, 6, ['#8a8070', '#77705f', '#9a917e'], 333);
        for (let k = 0; k < 2400; k++) { const px = hr(k + 900) * w, py = hr(k + 901) * h, l = 4 + hr(k + 902) * 10, a = -1.57 + (hr(k + 903) - .5) * 1.2; x.strokeStyle = `rgba(${80 + hr(k + 904) * 60},${100 + hr(k + 905) * 50},${40 + hr(k + 906) * 20},.8)`; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); } }, true),
      // il cemento: le tavole dei casseri, i fori dei tiranti, le colature di ruggine e di pioggia, le macchie
      concrete: mk(512, 512, (x, w, h) => { x.fillStyle = '#8e8a82'; x.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const v = 110 + hr(k) * 50; x.fillStyle = `rgba(${v},${v - 4},${v - 10},.18)`; x.fillRect(hr(k + 1) * w, hr(k + 2) * h, 2, 2); }
        for (let y = 0; y < h; y += 64) { x.fillStyle = 'rgba(40,38,34,.25)'; x.fillRect(0, y, w, 2); } for (let y = 32; y < h; y += 128) for (let u = 40; u < w; u += 120) { x.fillStyle = 'rgba(30,28,26,.55)'; x.beginPath(); x.arc(u, y, 4, 0, 7); x.fill(); }
        for (let k = 0; k < 40; k++) { const u = hr(k + 50) * w, y0 = hr(k + 51) * h * .7, l = 40 + hr(k + 52) * 200, gr = x.createLinearGradient(0, y0, 0, y0 + l); gr.addColorStop(0, k % 3 ? 'rgba(60,56,50,.25)' : 'rgba(120,70,40,.3)'); gr.addColorStop(1, 'rgba(60,56,50,0)'); x.fillStyle = gr; x.fillRect(u, y0, 3 + hr(k + 53) * 8, l); }
        const gr = x.createLinearGradient(0, h, 0, h * .7); gr.addColorStop(0, 'rgba(60,70,40,.4)'); gr.addColorStop(1, 'rgba(60,70,40,0)'); x.fillStyle = gr; x.fillRect(0, h * .7, w, h * .3); }, true),
      // la pietra dei sassi: grigio caldo a chiazze, le venature, i licheni gialli e verdi
      rock: mk(128, 128, (x, w, h) => { x.fillStyle = '#7e786e'; x.fillRect(0, 0, w, h); for (let k = 0; k < 500; k++) { const v = 90 + hr(k) * 60; x.fillStyle = `rgba(${v},${v - 4},${v - 12},.35)`; x.beginPath(); x.arc(hr(k + 1) * w, hr(k + 2) * h, 1 + hr(k + 3) * 5, 0, 7); x.fill(); }
        for (let k = 0; k < 6; k++) { x.strokeStyle = 'rgba(50,46,42,.5)'; x.lineWidth = 1; x.beginPath(); let px = hr(k + 40) * w, py = hr(k + 41) * h; x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (hr(k * 9 + j) - .5) * 30; py += (hr(k * 7 + j) - .3) * 20; x.lineTo(px, py); } x.stroke(); }
        for (let k = 0; k < 40; k++) { x.fillStyle = k % 3 ? 'rgba(170,160,80,.45)' : 'rgba(90,110,60,.45)'; x.beginPath(); x.arc(hr(k + 80) * w, hr(k + 81) * h, 1.5 + hr(k + 82) * 4, 0, 7); x.fill(); } }, true),
      // il legno delle traversine: catramato, le venature, le crepe, la testa scura
      wood: mk(256, 64, (x, w, h) => { x.fillStyle = '#3e3024'; x.fillRect(0, 0, w, h); for (let k = 0; k < 60; k++) { x.strokeStyle = `rgba(${20 + hr(k) * 40},${15 + hr(k + 1) * 30},${10 + hr(k + 2) * 20},.6)`; x.lineWidth = 1 + hr(k + 3) * 2; const y = hr(k + 4) * h; x.beginPath(); x.moveTo(0, y); for (let u = 0; u <= w; u += 16) x.lineTo(u, y + Math.sin(u * .05 + k) * 2); x.stroke(); }
        for (let k = 0; k < 8; k++) { x.strokeStyle = 'rgba(10,8,6,.85)'; x.lineWidth = 1.5; const u = hr(k + 70) * w, y = hr(k + 71) * h; x.beginPath(); x.moveTo(u, y); x.lineTo(u + 20 + hr(k + 72) * 40, y + (hr(k + 73) - .5) * 6); x.stroke(); } }, true),
      // l'erba: fili su carta trasparente (verdi, gialli secchi), il ciuffo si apre a ventaglio
      grass: mk(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); for (let k = 0; k < 70; k++) { const bx = w * .2 + hr(k) * w * .6, top = h * (.05 + hr(k + 1) * .5), lean = (hr(k + 2) - .5) * w * .5, c = hr(k + 3); x.strokeStyle = c < .55 ? `rgb(${70 + hr(k + 4) * 50},${110 + hr(k + 5) * 50},${40 + hr(k + 6) * 20})` : `rgb(${150 + hr(k + 4) * 50},${140 + hr(k + 5) * 40},${70 + hr(k + 6) * 30})`; x.lineWidth = 1.5 + hr(k + 7) * 2; x.beginPath(); x.moveTo(bx, h); x.quadraticCurveTo(bx + lean * .3, (h + top) / 2, bx + lean, top); x.stroke(); } }),
      // le foglie: la massa del cespuglio su carta trasparente
      leaves: mk(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); for (let k = 0; k < 260; k++) { const a = hr(k) * 6.283, r = Math.sqrt(hr(k + 1)) * w * .46, px = w / 2 + Math.cos(a) * r, py = h * .55 + Math.sin(a) * r * .8, s = 4 + hr(k + 2) * 6, g2 = 70 + hr(k + 3) * 70; x.fillStyle = `rgb(${30 + hr(k + 4) * 40},${g2},${25 + hr(k + 5) * 25})`; x.save(); x.translate(px, py); x.rotate(hr(k + 6) * 6.283); x.beginPath(); x.ellipse(0, 0, s, s * .5, 0, 0, 7); x.fill(); x.restore(); } }),
    };
    return RTEX;
  }
  // il ciuffo: tre carte incrociate, ognuna 1 × 1, appoggiate a terra
  function tuftGeo(n) {
    const THREE = T3(), pos = [], uv = [], idx = [];
    for (let k = 0; k < (n || 3); k++) { const a = k / (n || 3) * Math.PI, cx = Math.cos(a) * .5, cz = Math.sin(a) * .5, b = pos.length / 3; pos.push(-cx, 0, -cz, cx, 0, cz, cx, 1, cz, -cx, 1, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal; for (let i = 0; i < nr.count; i++) nr.setXYZ(i, 0, 1, 0);   // le carte prendono la luce dall'alto, come l'erba vera
    return g;
  }
  // il sasso: un icosaedro mosso (ogni sasso diverso), spigoli vivi
  function rockGeo(seed) {
    const THREE = T3(), g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 1.3) * .22 + Math.sin(y * 4.3 + seed * .7) * .12; p.setXYZ(i, x * (1 + n), y * (.7 + n * .5), z * (1 + n * .8)); }
    g.computeVertexNormals(); return g;
  }
  // [ferrovia] la quota vera del binario: sulla terra resa dal gioco (R.groundH), su una massicciata bassa che segue il terreno
  // (pendenza al massimo 3%), sul ponte in terra a 5 m sopra la valle, sul mare il viadotto; TR.el = i tratti su piloni
  function railFit(R) {
    if (TR.fit || !RAIL.ok) return; TR.fit = true;
    const P = TR.P, n = P.length, g = P.map(q => q[3] ? -3 : R.groundH(q[0], q[1])), side = (i, o) => { const a = P[Math.max(0, i - 2)], b = P[Math.min(n - 1, i + 2)], an = Math.atan2(b[1] - a[1], b[0] - a[0]); return [R.groundH(P[i][0] - Math.sin(an) * o, P[i][1] + Math.cos(an) * o), R.groundH(P[i][0] + Math.sin(an) * o, P[i][1] - Math.cos(an) * o)]; };
    // il terreno sotto la massicciata: il centro e i due bordi
    const ter = P.map((q, i) => { if (q[3]) return 2.6; const [l, r] = side(i, 1.8); return Math.max(g[i], (g[i] * 2 + l + r) / 4) + .42; });   // la media fra centro e bordi: in costa la massicciata taglia un poco il pendio
    const [b0, b1] = RAIL.bridge, top = Math.max(g[b0], g[b1]) + 1.2;
    const t = ter.map((v, i) => i >= b0 && i <= b1 ? Math.max(v, top, g[i] + 4.6) : v);
    const h = t.slice(), G2 = .03;
    for (let it = 0; it < 3; it++) { for (let i = 1; i < n; i++) h[i] = Math.max(h[i], h[i - 1] - G2); for (let i = n - 2; i >= 0; i--) h[i] = Math.max(h[i], h[i + 1] - G2); }
    for (let it = 0; it < 4; it++) { const o = h.slice(); for (let i = 2; i < n - 2; i++) h[i] = Math.max(t[i], (o[i - 2] + o[i - 1] + o[i] + o[i + 1] + o[i + 2]) / 5); }
    TR.el = P.map((q, i) => !q[3] && i >= b0 - 3 && i <= b1 + 3 && h[i] - g[i] > 1.5 ? 1 : 0); TR.g = g;   // i piloni solo sul ponte: altrove il rilevato di terra
    P.forEach((q, i) => { q[2] = h[i]; });
    // gli scali: il binario secondario non affonda nel pendio (si alza col terreno, raccordato ai deviatoi)
    RAIL.yards.forEach(Y => { Y._lf = null; const L0 = []; for (let u = 0; u <= Y.len; u++) { const q = yardAt(Y, u); L0.push(Math.max(0, Math.max(R.groundH(q.x, q.y), R.groundH(q.x - Math.sin(q.ang) * 1.6, q.y + Math.cos(q.ang) * 1.6), R.groundH(q.x + Math.sin(q.ang) * 1.6, q.y - Math.cos(q.ang) * 1.6)) + .42 - q.h) * ramp(u, Y.len)); }
      let lf = L0.map((_, u) => { let m = 0; L0.forEach((v, j) => { m = Math.max(m, v - .015 * Math.abs(u - j)); }); return m * ramp(u, Y.len); });   // l'inviluppo con pendenza massima 1,5%: un piano dritto, niente onde
      for (let it = 0; it < 12; it++) { const o = lf.slice(); for (let u = 2; u < lf.length - 2; u++) lf[u] = (o[u - 2] + o[u - 1] + o[u] + o[u + 1] + o[u + 2]) / 5; } Y._lf = lf; });
  }
  const tex64 = (w, h, f) => { const c = cv(w, h), x = c.getContext('2d'); f(x, w, h); const t = canvasTexture(c); return t; };
  // la ferrovia: la massicciata (o il ponte e il viadotto), le traversine e le rotaie, i piloni fino a terra; gli scali coi loro
  // binari; la rete coi varchi, i muri antirumore, i segnali, i cippi, la canalina dei cavi, gli armadietti; le due stazioni
  function track() {
    const THREE = T3(), R = R_(), P = TR.P, g = new THREE.Group(); g.name = 'ferrovia';
    railFit(R);
    const EL = i => TR.el ? TR.el[Math.max(0, Math.min(P.length - 1, Math.round(i)))] : 0, SEA = i => !!P[Math.max(0, Math.min(P.length - 1, Math.round(i)))][3];
    const gH = (x, y) => R.groundH(x, y), jit = (c, k) => { const v = (Math.sin(k * 12.9898) * 43758.5453) % 1, d = (v - Math.floor(v) - .5) * .12; return new THREE.Color(Math.min(1, c.r + d), Math.min(1, c.g + d), Math.min(1, c.b + d)); };
    // ---- la massicciata (in terra) e l'impalcato (ponte e viadotto) ----
    const RT = railTex(), pos = [], col = [], uvs = [], idxG = [], idxE = [], idxD = [], push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); uvs.push(x / 2.2 + y * .15, z / 2.2 - y * .15); return pos.length / 3 - 1; };   // la texture proiettata dall'alto (più la quota: le scarpate non si stirano)
    const cG = new THREE.Color('#e2dcd2'), cG2 = new THREE.Color('#c4bdb1'), cO = new THREE.Color('#9c8c7c'), cC = new THREE.Color('#d6d2ca'), cC2 = new THREE.Color('#aaa69e');
    let prev = null, prevK = null;
    const bed = (q, i, dk) => {   // una sezione: bordo esterno a terra, spalla, il centro più scuro d'olio e ruggine, spalla, bordo
      const nx = -Math.sin(q.ang), nz = Math.cos(q.ang), top = q.h - .18, el = EL(i) || SEA(i);
      if (el) { const bot = top - .95, hw = 2.5; return [push(q.x + nx * hw, bot, q.y + nz * hw, cC2), push(q.x + nx * hw, top, q.y + nz * hw, cC), push(q.x + nx * 1.6, top + .06, q.y + nz * 1.6, cG2), push(q.x, top + .1, q.y, cO), push(q.x - nx * 1.6, top + .06, q.y - nz * 1.6, cG2), push(q.x - nx * hw, top, q.y - nz * hw, cC), push(q.x - nx * hw, bot, q.y - nz * hw, cC2)]; }
      // il rilevato: la scarpata scende a terra con pendenza 2:3 (più è alto, più è largo); sotto la ghiaia, la terra con l'erba rada
      const ft = sd => { let f = 3.3; for (let k = 0; k < 4; k++) { const gg = gH(q.x + nx * f * sd, q.y + nz * f * sd); f = 3.3 + Math.max(0, top - gg - .3) * 1.5; } return Math.min(f, 14); };
      const fL = ft(1), fR = ft(-1), foot = fL, gL = Math.min(top, gH(q.x + nx * fL, q.y + nz * fL)) - .15, gR = Math.min(top, gH(q.x - nx * fR, q.y - nz * fR)) - .15, cE = new THREE.Color('#e0d8c0');
      const eL = Math.min(top, gL + .1) - Math.min(.35, top - gL), eR = Math.min(top, gR + .1) - Math.min(.35, top - gR);   // dove finisce la ghiaia comincia la terra
      return [push(q.x + nx * fL, gL, q.y + nz * fL, jit(cE, i)), push(q.x + nx * 2.6, top - Math.min(.35, top - gL), q.y + nz * 2.6, jit(fL > 4.5 ? cE : cG2, i + 5)), push(q.x + nx * 1.9, top, q.y + nz * 1.9, jit(cG, i + 1)), push(q.x, top + .02, q.y, jit(cO, i + 2)), push(q.x - nx * 1.9, top, q.y - nz * 1.9, jit(cG, i + 3)), push(q.x - nx * 2.6, top - Math.min(.35, top - gR), q.y - nz * 2.6, jit(fR > 4.5 ? cE : cG2, i + 6)), push(q.x - nx * fR, gR, q.y - nz * fR, jit(cE, i + 4))];
    };
    for (let i = 0; i < P.length; i += 2) {
      const q = railAt(i), k = bed(q, i), kind = EL(i) || SEA(i) ? 1 : 0;
      const strip = (A, B, kd) => { for (let a = 0; a < 6; a++) (kd ? (a === 2 || a === 3 ? idxG : idxD) : a === 0 || a === 5 ? idxE : idxG).push(A[a], B[a], A[a + 1], A[a + 1], B[a], B[a + 1]); };
      if (prev && kind === prevK) strip(prev, k, kind);
      else if (prev) { const k2 = bed(railAt(i - 1), i - 1); strip(prev, k2, prevK); }
      prev = k; prevK = kind;
    }
    // gli scali: la loro massicciata accanto, e i binari secondari
    RAIL.yards.forEach(Y => { let pv = null; for (let u = 0; u <= Y.len; u += 2) { const q = yardAt(Y, u); const k = bed(q, Y.s0 + u, 1); if (pv) for (let a = 0; a < 6; a++) (a === 0 || a === 5 ? idxE : idxG).push(pv[a], k[a], pv[a + 1], pv[a + 1], k[a], k[a + 1]); pv = k; } });
    const PA = new THREE.Float32BufferAttribute(pos, 3), CA = new THREE.Float32BufferAttribute(col, 3), UA = new THREE.Float32BufferAttribute(uvs, 2);
    [[idxG, RT.gravel], [idxE, RT.earth], [idxD, RT.concrete]].forEach(([ix, mp]) => { if (!ix.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', PA); geo.setAttribute('color', CA); geo.setAttribute('uv', UA); geo.setIndex(ix); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: mp, vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; m.userData.wr = 1; g.add(m); });
    // ---- le parti ripetute (instanced) ----
    const bx = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    const inst = (mat, list, shadow) => { if (!list.length) return; const im = new THREE.InstancedMesh(bx, mat, list.length); list.forEach((L, k) => { e.set(L[5] || 0, L[4], 0, 'YXZ'); qt.setFromEuler(e); im.setMatrixAt(k, m4.compose(v3.set(L[0], L[1], L[2]), qt, s3.set(L[3][0], L[3][1], L[3][2]))); }); im.castShadow = shadow !== false; im.receiveShadow = true; im.userData.wr = 1; im.frustumCulled = false; g.add(im); };
    // un profilo ([laterale, quota sul ferro]) estruso lungo un percorso: superfici continue che seguono la curva, senza giunti né
    // scalini. abs: le quote sono assolute; vc: colora il fungo chiaro (lucidato dalle ruote) e il resto ruggine
    const sweep = (at, s0, s1, step, prof, mat, abs, vc, closed) => {
      const pp = [], uu = [], cc = [], ii = []; let n = 0, rows = 0;
      for (let s = s0; s <= s1 + 1e-6; s += step) { const q = at(Math.min(s, s1)), nx = -Math.sin(q.ang), nz = Math.cos(q.ang), pr = prof(s, q); n = pr.length; let d = 0;
        pr.forEach(([l, y], j) => { if (j) d += Math.hypot(l - pr[j - 1][0], y - pr[j - 1][1]); pp.push(q.x + nx * l, abs ? y : q.h + y, q.y + nz * l); uu.push(s / 4, d); if (vc) { const hd = y > .05; cc.push(hd ? .78 : .42, hd ? .78 : .27, hd ? .8 : .19); } });
        if (rows) { const a = (rows - 1) * n, b = rows * n; for (let j = 0; j < n - 1; j++) ii.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1); }
        rows++; }
      if (rows < 2) return null;
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); if (vc) gg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); gg.setIndex(ii); gg.computeVertexNormals();
      const m = new THREE.Mesh(gg, mat); m.castShadow = true; m.receiveShadow = true; m.userData.wr = 1; g.add(m); return m;
    };
    // la sezione della rotaia (UNI 50): la suola larga, l'anima sottile, il fungo arrotondato; le coppie ripetute fanno lo spigolo
    const RPROF = [[-.07, -.043], [-.07, -.03], [-.016, -.022], [-.011, .042], [-.034, .05], [-.036, .085], [-.026, .094], [.026, .094], [.036, .085], [.034, .05], [.011, .042], [.016, -.022], [.07, -.03], [.07, -.043], [-.07, -.043]];
    const railM = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .55, roughness: .55, side: THREE.DoubleSide });
    const slW = [], slC = [], rl = [], rlH = [], rlF = [], plates = [], clips = [], pil = [], posts = [], kmp = [], trough = [];
    const rails = (at, s0, s1, conc) => {
      for (let s = s0; s < s1; s += .65) { const q = at(s), cc = conc(s), wob = cc ? 0 : (Math.sin(s * 9.1) * .03); (cc ? slC : slW).push([q.x, q.h - .1, q.y, cc ? [.26, .17, 2.6] : [.24, .14, 2.5], -q.ang + wob]); for (const sd of [-.72, .72]) { const px = q.x - Math.sin(q.ang) * sd, pz = q.y + Math.cos(q.ang) * sd; plates.push([px, q.h - .02, pz, [.17, .025, .32], -q.ang]); for (const cl of [-.11, .11]) clips.push([px - Math.sin(q.ang) * cl, q.h, pz + Math.cos(q.ang) * cl, [.05, .04, .06], -q.ang]); } }   // la piastra e i due attacchi sotto ogni rotaia
      for (const sd of [-.72, .72]) sweep(at, s0, s1, .5, () => RPROF.map(([a, b]) => [sd + a, b]), railM, 0, true, true);   // la rotaia vera, continua: suola, anima, fungo
    };
    // traversine: di cemento sulla linea in terra e sul ponte, di legno vecchio sul viadotto e negli scali
    rails(s => railAt(s), 0, P.length - 1, s => !SEA(s));
    RAIL.yards.forEach(Y => rails(u => yardAt(Y, u), 0, Y.len, () => false));
    // i piloni: sul ponte in terra e sul viadotto, fino al terreno (o al fondo del mare)
    for (let s = 6; s < P.length - 6; s += 12) { if (!(EL(s) || SEA(s))) continue; const q = railAt(s), top = q.h - 1.15, bot = SEA(s) ? -4 : gH(q.x, q.y) - .3; if (top - bot < .4) continue; pil.push([q.x, (top + bot) / 2, q.y, [1.2, top - bot, 3.2], -q.ang]); pil.push([q.x, top - .2, q.y, [1.7, .4, 4.6], -q.ang]); pil.push([q.x, top - .5, q.y, [1.4, .2, 3.8], -q.ang]); if (!SEA(s)) pil.push([q.x, bot + .45, q.y, [2, .5, 4], -q.ang]); }
    // i parapetti del ponte e del viadotto (bassi, di cemento, si dipingono): un muro unico per lato
    const para = (sd) => { const pp = [], pi = [], pu = []; let pv = null; for (let i = 0; i < P.length; i += 2) { if (!(EL(i) || SEA(i))) { pv = null; continue; } const q = railAt(i), nx = -Math.sin(q.ang) * sd, nz = Math.cos(q.ang) * sd, o = 2.45, base = q.h - .18; const a = pp.length / 3; pp.push(q.x + nx * o, base, q.y + nz * o, q.x + nx * o, base + .95, q.y + nz * o); pu.push(i / 3, 0, i / 3, .48); if (pv !== null) pi.push(pv, a, pv + 1, pv + 1, a, a + 1); pv = a; }
      if (!pi.length) return; const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(pu, 2)); gg.setIndex(pi); gg.computeVertexNormals(); const m = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: RT.concrete, side: THREE.DoubleSide })); m.receiveShadow = true; m.castShadow = true; m.name = 'parapetto'; g.add(m); };
    para(1); para(-1);
    // cippi ogni 100 m, la canalina dei cavi in cemento lungo un lato della linea in terra
    for (let s = 50; s < P.length - 4; s += 100) { const q = sidePt(s, 1, 2.9); kmp.push([q.x, (EL(s) || SEA(s) ? q.h : gH(q.x, q.y)) + .35, q.y, [.18, .7, .18], -q.ang]); }
    inst(new THREE.MeshLambertMaterial({ map: RT.wood }), slW); inst(new THREE.MeshLambertMaterial({ map: RT.concrete, color: '#d0ccc4' }), slC);
    inst(new THREE.MeshStandardMaterial({ color: '#6a4a36', metalness: .4, roughness: .8 }), rl); inst(new THREE.MeshStandardMaterial({ color: '#5e4232', metalness: .3, roughness: .85 }), rlF); inst(new THREE.MeshStandardMaterial({ color: '#b4b4b8', metalness: .85, roughness: .3 }), rlH);   // il fianco arrugginito, il fungo lucidato dalle ruote
    inst(new THREE.MeshStandardMaterial({ color: '#4a3c32', metalness: .5, roughness: .7 }), plates, false); inst(new THREE.MeshStandardMaterial({ color: '#3a3634', metalness: .6, roughness: .5 }), clips, false);
    inst(new THREE.MeshLambertMaterial({ map: RT.concrete }), pil); inst(new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: .8 }), kmp); 
    // ---- la superficie del rilevato a una distanza o dall'asse (per appoggiarci rete, muri, sassi, erba) e il suo piede ----
    const surfAt = (s, sd, o) => { const q = sidePt(s, sd, 0), top = q.h - .18, nx = -Math.sin(q.ang) * sd, nz = Math.cos(q.ang) * sd, gg = gH(q.x + nx * o, q.y + nz * o); if (EL(s) || SEA(s)) return gg; return o <= 1.9 ? top : Math.max(gg, o <= 2.6 ? top - (o - 1.9) / .7 * .35 : top - .35 - (o - 2.6) / 1.5); };   // come la sezione della massicciata: piano, spalla, scarpata
    // la canalina dei cavi: un cordolo di cemento continuo appoggiato sulla spalla della massicciata (lato sinistro), coperchi ogni metro
    { const trM = new THREE.MeshLambertMaterial({ map: RT.concrete, color: '#ffffff' }); let a0 = null;
      const run = (a, b) => { if (b - a > 6) sweep(s => sidePt(s, 1, 0), a, b, 1, (s, q) => { const t = surfAt(s, -1, 1.95) + .07, bL = surfAt(s, -1, 1.98) - .12, bR = surfAt(s, -1, 2.36) - .12; return [[-1.98, bL], [-1.98, t], [-1.98, t], [-2.36, t], [-2.36, t], [-2.36, bR]]; }, trM, true); };
      for (let s = 2; s < RAIL.landEnd - 2; s += 1) { const ok = !EL(s) && !EL(s + 1) && !RAIL.yards.some(Y => Y.side < 0 && s > Y.s0 - 2 && s < Y.s0 + Y.len + 2); if (ok && a0 === null) a0 = s; if (!ok && a0 !== null) { run(a0, s - 1); a0 = null; } } if (a0 !== null) run(a0, RAIL.landEnd - 3); }
    const footAt = (s, sd) => { for (let o = 2.6; o < 16; o += .4) { const q = sidePt(s, sd, o); if (surfAt(s, sd, o) - gH(q.x, q.y) < .05) return o; } return 16; };
    // la rete sta oltre il piede della scarpata (mai dentro il rilevato): lo stesso confine vale per chi cammina (fencePush)
    RAIL.fences.forEach(F => { [1, -1].forEach((sd, k) => { if (F.off[k] > 6) return; F.off[k] = Math.max(F.off[k], Math.min(15, footAt(F.s, sd) + .7)); }); });
    for (let k = 1; k < RAIL.fences.length - 1; k++) for (let j = 0; j < 2; j++) { const a = RAIL.fences[k - 1].off[j], c = RAIL.fences[k + 1].off[j], b = RAIL.fences[k].off[j]; if (b < 6 && a < 6 && c < 6) RAIL.fences[k].off[j] = Math.max(b, (a + b + c) / 3); }   // senza scalini
    // ---- la vegetazione e i sassi: ghiaia grossa sulle spalle, cespugli ed erba sulle scarpate e lungo la rete, erbacce negli scali ----
    const hr = k => { const v = Math.sin(k * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    const rocks = [], bush = [], grass = [], weeds = [];
    // macchie, non coriandoli: un rumore morbido decide dove l'erba è fitta, dove i rovi, dove i sassi franati; il piede della
    // scarpata (dove il rilevato incontra il prato) è sempre coperto da una fascia d'erba
    const vn = x => { const i = Math.floor(x), f = x - i, t = f * f * (3 - 2 * f); return hr(i) * (1 - t) + hr(i + 1) * t; };
    for (let s = 2; s < RAIL.landEnd - 2; s += .7) {
      if (EL(s) || EL(s + 2) || EL(s - 2)) continue;
      for (const sd of [1, -1]) {
        const k = Math.round(s * 10) * 7 + (sd > 0 ? 3 : 11), F = RAIL.fences.find(f => Math.abs(f.s - s) <= 1.1), fo = F ? F.off[sd > 0 ? 0 : 1] : 99, gap = RAIL.gaps.find(gp => gp.side === sd && Math.abs(gp.s - s) < 3);
        const inY = RAIL.yards.some(Y => Y.side === sd && s > Y.s0 - 4 && s < Y.s0 + Y.len + 4), foot = footAt(s, sd), lush = vn(s / 7 + (sd > 0 ? 40 : 90)), wild = vn(s / 13 + (sd > 0 ? 7 : 17));
        if (inY) continue;
        // la fascia al piede: copre la giunta fra rilevato e terreno
        if (hr(k) < .2 + lush * .6) { const o = foot - .9 + hr(k + 1) * 2.4, q = sidePt(s + (hr(k + 22) - .5) * .7, sd, o), z = .5 + hr(k + 2) * hr(k + 23) * 1.4; if (!gap && o < fo - .4) grass.push([q.x, gH(q.x, q.y) + .1, q.y, [(.4 + hr(k + 24) * .3) * z, (.3 + hr(k + 3) * .35) * z, (.4 + hr(k + 25) * .3) * z], hr(k + 4) * 6]); }
        // l'erba sulla scarpata: fitta dove il rumore lo dice, rada altrove
        if (hr(k + 5) < (lush > .55 ? .8 : .12) && foot > 3.2) { const o = 2.7 + hr(k + 6) * (foot - 2.9), q = sidePt(s, sd, o); if (!gap) grass.push([q.x, surfAt(s, sd, o) + .1, q.y, [.35 + hr(k + 7) * .35, .25 + hr(k + 8) * .3, .35 + hr(k + 7) * .35], hr(k + 9) * 6]); }
        // i sassi franati: a mucchi al piede, mezzi interrati
        if (wild > .72 && hr(k + 10) < .35) { const o = foot - .3 + hr(k + 11) * 1.4, q = sidePt(s, sd, o), sz = .14 + hr(k + 12) * .3; if (!gap && o < fo - .5) rocks.push([q.x, gH(q.x, q.y) - sz * .25, q.y, [sz * 1.1, sz * .65, sz * .9], hr(k + 13) * 6]); }
        // i cespugli oltre la rete, a gruppi; i rovi che salgono sulla scarpata dove la linea è abbandonata
        if (fo < 20 && hr(k + 14) < (wild > .5 ? .3 : .03)) { const o = fo + .9 + hr(k + 15) * 3.5, q = sidePt(s, sd, o), sz = .6 + hr(k + 16) * .9; if (!gap) bush.push([q.x, gH(q.x, q.y) + sz * .4, q.y, [sz * 1.2, sz, sz * 1.1], hr(k + 17) * 6]); }
        if (lush > .7 && wild > .6 && hr(k + 18) < .1 && foot > 3.4) { const o = 3 + hr(k + 19) * (foot - 3.2), q = sidePt(s, sd, o), sz = .4 + hr(k + 20) * .4; if (!gap) bush.push([q.x, surfAt(s, sd, o) + sz * .3, q.y, [sz, sz * .8, sz], hr(k + 21) * 6]); }
      }
    }
    RAIL.yards.forEach(Y => { for (let u = 4; u < Y.len - 4; u += .9) { const q = yardAt(Y, u), k = Y.s0 * 13 + u * 7; if (hr(k) < .45) { const o = (hr(k + 1) - .5) * 1.6, x = q.x - Math.sin(q.ang) * o, z = q.y + Math.cos(q.ang) * o; weeds.push([x, q.h - .12, z, [.3 + hr(k + 2) * .3, .2 + hr(k + 3) * .25, .3 + hr(k + 2) * .3], hr(k + 4) * 6]); } } });   // le erbacce fra le traversine degli scali (binari poco usati)
    const geoInst = (geo, mat, list, cols) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((L, k) => { e.set(L[5] || 0, L[4], 0, 'YXZ'); qt.setFromEuler(e); im.setMatrixAt(k, m4.compose(v3.set(L[0], L[1], L[2]), qt, s3.set(L[3][0], L[3][1], L[3][2]))); if (cols) im.setColorAt(k, cols[k % cols.length]); }); im.castShadow = true; im.receiveShadow = true; im.userData.wr = 1; im.frustumCulled = false; g.add(im); };
    const C = h => new THREE.Color(h);
    // i sassi: quattro forme mosse, colori della pietra del posto
    [0, 1, 2, 3].forEach(f => geoInst(rockGeo(f * 3.7 + 1), new THREE.MeshLambertMaterial({ map: RT.rock }), rocks.filter((_, k) => k % 4 === f), [C('#ffffff'), C('#e8e2d8'), C('#d4d0c8'), C('#f0e8dc')]));
    // l'erba a ciuffi (carte trasparenti incrociate), i cespugli (carte di foglie attorno a un cuore scuro), le erbacce degli scali
    const tuft = tuftGeo(3), cardM = (mp, dbl) => new THREE.MeshLambertMaterial({ map: mp, alphaTest: .45, transparent: false, side: THREE.DoubleSide, color: '#ffffff' });
    const grassL = grass.map(L => [L[0], L[1] - .12, L[2], [L[3][0] * 1.6, L[3][1] * 1.9, L[3][2] * 1.6], L[4]]);
    geoInst(tuft, cardM(RT.grass), grassL.concat(weeds.map(L => [L[0], L[1] - .05, L[2], [L[3][0] * 1.4, L[3][1] * 1.6, L[3][2] * 1.4], L[4]])), [C('#ffffff'), C('#e8f0d0'), C('#f4e8c0'), C('#d8e8c8'), C('#fff0d0')]);
    const bushCards = []; bush.forEach((L, k) => { for (let j = 0; j < 4; j++) { const a = j * 1.57 + L[4], r = L[3][0] * .35; bushCards.push([L[0] + Math.cos(a) * r, L[1] - L[3][1] * .55, L[2] + Math.sin(a) * r, [L[3][0] * 1.5, L[3][1] * 1.6, L[3][2] * 1.5], a]); } });
    geoInst(tuft, cardM(RT.leaves), bushCards, [C('#ffffff'), C('#e0ecd0'), C('#d0dcb8'), C('#f0f4e0')]);
    geoInst(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshLambertMaterial({ map: RT.leaves, color: '#4a5a3a' }), bush.map(L => [L[0], L[1] - L[3][1] * .2, L[2], [L[3][0] * .45, L[3][1] * .45, L[3][2] * .45], L[4]]));
    // l'erba alta e secca lungo la rete (dove il decespugliatore non arriva)
    const tall = []; RAIL.fences.forEach((F, k) => { if (k % 2) return; [1, -1].forEach((sd, j) => { const o = F.off[j], gap = RAIL.gaps.find(gp => gp.side === sd && Math.abs(gp.s - F.s) < 2.5); if (gap || hr(k * 3 + j) < .35) return; const q = sidePt(F.s + hr(k + j) * 2, sd, o + (hr(k * 5 + j) - .5) * .8), sz = .5 + hr(k * 7 + j) * .6; tall.push([q.x, gH(q.x, q.y), q.y, [sz * 1.3, sz * 2.2, sz * 1.3], hr(k * 11 + j) * 6]); }); });
    geoInst(tuft, cardM(RT.grass), tall, [C('#f8e8b8'), C('#e8d8a0'), C('#ffffff'), C('#f0e0b0')]);
    // ---- la vita lungo la linea: bombolette vuote sotto i muri e ai varchi, bottiglie, lattine; negli scali le traversine
    // vecchie accatastate, i bancali, una sala montata arrugginita, la bobina del cavo; i cartelli ai varchi (già taggati) ----
    const barrels = [], oldRail = [], tyres = [];
    const cans = [], caps = [], bottles = [], tins = [], oldSl = [], pallet = [], rust = [], drum = [];
    const canCol = [C('#c42a22'), C('#1e1e24'), C('#e8e0d0'), C('#2a6ac8'), C('#e8c040'), C('#3a9a5a'), C('#c84a9a'), C('#9a9aa0')];
    const scatterAt = (x0, z0, n, seed, r) => { for (let k = 0; k < n; k++) { const a = hr(seed + k) * 6.283, d = hr(seed + k * 1.3) * r, x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d, y = gH(x, z), t = hr(seed + k * 2.1);
      if (t < .55) { cans.push([x, y + .033, z, [.066, .2, .066], hr(seed + k * 3) * 6, 1.57]); } else if (t < .8) bottles.push([x, y + .035, z, [.07, .26, .07], hr(seed + k * 3) * 6, 1.57]); else tins.push([x, y + .033, z, [.066, .12, .066], hr(seed + k * 3) * 6, 1.57]); } };
    RAIL.walls.forEach((Wl, k) => { if (k % 3) return; const q = sidePt(Wl.s + 2, Wl.side, Wl.off + 1); scatterAt(q.x, q.y, 3 + Math.floor(hr(k) * 4), k * 31, 1.4); });
    RAIL.gaps.forEach((gp, k) => { const F = RAIL.fences.find(f => Math.abs(f.s - gp.s) <= 1), o = F ? F.off[gp.side > 0 ? 0 : 1] : 4, q = sidePt(gp.s, gp.side, o - 1.2); scatterAt(q.x, q.y, 4, 900 + k * 17, 1.2); });
    RAIL.yards.forEach((Y, k) => {
      const out = Y.side, at = (u, o) => { const q = yardAt(Y, u), nx = -Math.sin(q.ang) * out, nz = Math.cos(q.ang) * out; return { x: q.x + nx * o, z: q.y + nz * o, ang: q.ang }; };
      { const c = at(Y.len * .55, 3.6), b = gH(c.x, c.z); for (let l = 0; l < 4; l++) for (let m = 0; m < 5 - l; m++) oldSl.push([c.x + Math.cos(c.ang) * (m - 2 + l * .5) * .28, b + .07 + l * .145, c.z + Math.sin(c.ang) * (m - 2 + l * .5) * .28, [2.5, .14, .24], -c.ang + Math.PI / 2 + (hr(k + l * 5 + m) - .5) * .08]); }   // la catasta di traversine
      { const c = at(Y.len * .78, 3.8), b = gH(c.x, c.z); for (let l = 0; l < 3; l++) { for (let m = -1; m <= 1; m++) pallet.push([c.x + Math.cos(c.ang) * m * .45, b + .05 + l * .16, c.z + Math.sin(c.ang) * m * .45, [1.2, .03, .12], -c.ang + Math.PI / 2 + l * .05]); for (let m = -2; m <= 2; m++) pallet.push([c.x - Math.sin(c.ang) * m * .26, b + .1 + l * .16, c.z + Math.cos(c.ang) * m * .26, [1.1, .02, .1], -c.ang + l * .05]); } }   // i bancali
      { const c = at(Y.len * .2, 3.4), b = gH(c.x, c.z); for (const sd of [-.72, .72]) rust.push([c.x + Math.cos(c.ang + .8) * sd, b + .46, c.z + Math.sin(c.ang + .8) * sd, [.92, .14, .92], -c.ang + .77, 1.57]); rust.push([c.x, b + .46, c.z, [.13, 1.6, .13], -c.ang + .77, 1.57]); }   // la sala montata (due ruote e l'asse) lasciata lì
      { const c = at(Y.len * .35, 4.2), b = gH(c.x, c.z); drum.push([c.x, b + .55, c.z, [1.1, .7, 1.1], -c.ang, 1.57]); }   // la bobina del cavo
      scatterAt(at(Y.len * .5, 2.8).x, at(Y.len * .5, 2.8).z, 6, 4000 + k * 13, 2.5);
      for (let j = 0; j < 5; j++) { const c = at(Y.len * (.12 + j * .19), 3.2 + hr(k * 5 + j) * 1.4), b = gH(c.x, c.z); for (let m = 0; m < 1 + Math.floor(hr(k + j * 3) * 3); m++) { const a = hr(k * 7 + j + m) * 6.28, d = m ? .62 : 0; if (hr(k * 3 + j * 5 + m) < .2) barrels.push([c.x + Math.cos(a) * d, b + .3, c.z + Math.sin(a) * d, [.58, .88, .58], a, 1.57]); else barrels.push([c.x + Math.cos(a) * d, b + .44, c.z + Math.sin(a) * d, [.58, .88, .58], a]); } }   // i fusti, qualcuno rovesciato
      for (let j = 0; j < 3; j++) { const c = at(Y.len * (.3 + j * .2), 2.6 + j * .25), b = gH(c.x, c.z); oldRail.push([c.x, b + .08, c.z, [9 + j * 2, .15, .07], -c.ang + (hr(k + j) - .5) * .1]); }   // le rotaie smontate
      for (let j = 0; j < 4; j++) { const c = at(Y.len * (.62 + hr(k * 11 + j) * .1), 3.4 + hr(k * 13 + j) * .8), b = gH(c.x, c.z); tyres.push([c.x, b + .12 + j * .2 * (j < 3 ? 1 : 0), c.z, [1, 1, 1], hr(j + k) * 6]); }   // i copertoni impilati
    });
    const cylInst = (geo, mat, list, cols) => geoInst(geo, mat, list.map(L => L), cols);
    const gC = new THREE.CylinderGeometry(.5, .5, 1, 10); gC.rotateX(Math.PI / 2);
    const lie = list => list.map(L => [L[0], L[1], L[2], [L[3][0], L[3][2], L[3][1]], L[4]]);   // sdraiati per terra
    geoInst(gC, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .6, roughness: .4 }), lie(cans), canCol);
    geoInst(gC, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .1, roughness: .2, transparent: true, opacity: .85 }), lie(bottles), [C('#2a5a2a'), C('#6a4020'), C('#cfd8d0')]);
    geoInst(gC, new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: .7, roughness: .5 }), lie(tins), [C('#b8b8b8'), C('#c8302a'), C('#2a4a8a')]);
    inst(new THREE.MeshLambertMaterial({ map: RT.wood, color: '#8a7a6a' }), oldSl); inst(new THREE.MeshLambertMaterial({ map: RT.wood, color: '#e0c8a0' }), pallet);
    const gD = new THREE.CylinderGeometry(.5, .5, 1, 16); geoInst(gD, new THREE.MeshStandardMaterial({ color: '#6a3a20', metalness: .6, roughness: .8 }), rust.map(L => [L[0], L[1], L[2], [L[3][0], L[3][1], L[3][2]], L[4]]).map((L, k) => { if (k % 3 === 2) return L; return L; }));
    geoInst(new THREE.CylinderGeometry(.5, .5, 1, 18), new THREE.MeshLambertMaterial({ map: RT.wood, color: '#b09070' }), drum);
    { const bt = tex64(128, 64, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); for (const y of [10, 32, 54]) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y, w, 3); x.fillStyle = 'rgba(255,255,255,.4)'; x.fillRect(0, y - 2, w, 1); } for (let k = 0; k < 40; k++) { x.fillStyle = `rgba(${110 + hr(k) * 40},${50 + hr(k + 1) * 20},20,${.3 + hr(k + 2) * .4})`; x.beginPath(); x.arc(hr(k + 3) * w, hr(k + 4) * h, 1 + hr(k + 5) * 6, 0, 7); x.fill(); } const gr = x.createLinearGradient(0, h, 0, h * .5); gr.addColorStop(0, 'rgba(60,40,20,.6)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); x.fillStyle = gr; x.fillRect(0, h * .5, w, h * .5); });   // il fusto: le nervature, la ruggine, il fondo sporco
      bt.wrapS = THREE.RepeatWrapping; const bg = new THREE.CylinderGeometry(.5, .5, 1, 16); const bM = new THREE.MeshStandardMaterial({ map: bt, metalness: .5, roughness: .6 }), bC = [C('#2a4a8a'), C('#8a2a22'), C('#3a5a3a'), C('#c8a040'), C('#5a5a5a')];
      geoInst(bg, bM, barrels.filter(L => !L[5]), bC); geoInst(bg, bM, barrels.filter(L => L[5]), bC);   // in piedi e rovesciati
      inst(new THREE.MeshStandardMaterial({ color: '#5a3a26', metalness: .4, roughness: .85 }), oldRail);
      geoInst(new THREE.TorusGeometry(.32, .12, 8, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: .95 }), tyres); }
    // i cartelli ai varchi: «VIETATO ATTRAVERSARE I BINARI», col palo, la ruggine e le tag sopra
    RAIL.gaps.forEach((gp, k) => {
      const F = RAIL.fences.find(f => Math.abs(f.s - gp.s) <= 1), o = F ? F.off[gp.side > 0 ? 0 : 1] : 4, q = sidePt(gp.s + 2.2, gp.side, o + .25), b = gH(q.x, q.y);
      const c = cv(256, 160), x = c.getContext('2d'); x.fillStyle = '#f0ece2'; x.fillRect(0, 0, 256, 160); x.strokeStyle = '#c8202a'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 150); x.fillStyle = '#c8202a'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText('VIETATO', 128, 46); x.font = 'bold 19px Arial'; x.fillText('ATTRAVERSARE I BINARI', 128, 76); x.fillStyle = '#222'; x.font = '15px Arial'; x.fillText('PERICOLO DI MORTE', 128, 104); x.fillText('FERROVIE DELLO STATO', 128, 128);
      for (let j = 0; j < 30; j++) { x.fillStyle = `rgba(120,60,30,${.15 + hr(k * 9 + j) * .3})`; x.beginPath(); x.arc(hr(k + j * 3) * 256, hr(k + j * 5) * 160, 2 + hr(j + k) * 7, 0, 7); x.fill(); }   // la ruggine
      try { if (typeof WriterMano !== 'undefined' && WriterMano.handTag) WriterMano.handTag(x, ['DAKO', 'KEOS', 'SNEK', 'RUSK', 'ZORA', 'NEMO'][k % 6], WriterMano.dna(77 + k), 256, 160, mulberry(k + 5), k % 2 ? '#1a1a1e' : '#2a56c8', 'mtag'); } catch (er) { }   // la tag sopra il cartello
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(.8, .5), new THREE.MeshLambertMaterial({ map: canvasTexture(c), side: THREE.DoubleSide })); pl.position.set(q.x, b + 1.55, q.y); pl.rotation.y = -q.ang; g.add(pl);
      const po = new THREE.Mesh(new THREE.CylinderGeometry(.03, .035, 1.9, 6), new THREE.MeshStandardMaterial({ color: '#5a4a40', metalness: .5, roughness: .7 })); po.position.set(q.x, b + .95, q.y); g.add(po);
    });
    // ---- la rete: pali ogni 2,5 m e la maglia (trasparente), tagliata nei varchi (il lembo piegato, il sentiero battuto) ----
    const meshT = tex64(64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(150,152,150,.95)'; x.lineWidth = 2.2; for (let k = -64; k < 128; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 64, 64); x.stroke(); x.beginPath(); x.moveTo(k + 64, 0); x.lineTo(k, 64); x.stroke(); } });
    meshT.wrapS = meshT.wrapT = THREE.RepeatWrapping;
    const netM = new THREE.MeshLambertMaterial({ map: meshT, transparent: true, alphaTest: .4, side: THREE.DoubleSide }), dirtM = new THREE.MeshLambertMaterial({ color: '#5e5040' }), FH = 2.1;
    const wires = [], arms = [];
    [1, -1].forEach(sd => {
      const pp = [], uv = [], pi = []; let pv = null, along = 0, last = null, lw = null;
      RAIL.fences.forEach(F => {
        const off = F.off[sd > 0 ? 0 : 1], q = sidePt(F.s, sd, off), gap = RAIL.gaps.find(gp => gp.side === sd && Math.abs(gp.s - F.s) < gp.w / 2 + .9);
        if (gap || (last && F.s - last.s > 2.5)) { pv = null; lw = null; }
        if (gap) { last = null; return; }
        const b = gH(q.x, q.y) - .05; if (last) along += Math.hypot(q.x - last.q.x, q.y - last.q.y); last = { s: F.s, q };
        const a = pp.length / 3; pp.push(q.x, b, q.y, q.x, b + FH, q.y); uv.push(along / 1.6, 0, along / 1.6, FH / 1.6);
        if (pv !== null) pi.push(pv, a, pv + 1, pv + 1, a, a + 1); pv = a;
        const ox = -Math.sin(q.ang) * sd, oz = Math.cos(q.ang) * sd, lean = (hr(F.s * 3.1 + sd) - .5) * .06;
        if (Math.round(F.s) % 3 === 0) { posts.push([q.x, b + FH / 2 + .05, q.y, [.07, FH + .1, .07], -q.ang, lean]); arms.push([q.x + ox * .16, b + FH + .2, q.y + oz * .16, [.05, .5, .05], -q.ang, lean - sd * .75]); }
        const wp = [[0, .12], [0, FH - .04], [.12, FH + .14], [.22, FH + .27], [.32, FH + .4]].map(([o, y]) => [q.x + ox * o, b + y, q.y + oz * o]);
        if (lw) wp.forEach((w, j) => { const a = lw[j]; wires.push(a[0], a[1], a[2], w[0], w[1], w[2]); if (j >= 2) for (let t = .2; t < 1; t += .3) { const bx = a[0] + (w[0] - a[0]) * t, by = a[1] + (w[1] - a[1]) * t, bz = a[2] + (w[2] - a[2]) * t; wires.push(bx - .03, by - .03, bz, bx + .03, by + .03, bz, bx, by - .03, bz - .03, bx, by + .03, bz + .03); } });   // i fili e le punte
        lw = wp;
      });
      if (pi.length) { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(pi); gg.computeVertexNormals(); const m = new THREE.Mesh(gg, netM); m.userData.wr = 1; m.userData.velo = true; g.add(m); }
    });
    RAIL.gaps.forEach(gp => {
      const off = (RAIL.fences.find(f => Math.abs(f.s - gp.s) <= 1) || { off: [3.9, 3.9] }).off[gp.side > 0 ? 0 : 1], q = sidePt(gp.s, gp.side, off), b = gH(q.x, q.y);
      const flap = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), netM); flap.position.set(q.x, b + .55, q.y); flap.rotation.set(-.5, -q.ang + .9, .3); flap.userData.velo = true; g.add(flap);   // il lembo della rete piegato
      const nx = -Math.sin(q.ang) * gp.side, nz = Math.cos(q.ang) * gp.side;
      for (let k = 0; k < 6; k++) { const d = 1 + k * 1.3, x = q.x + nx * d + Math.cos(k * 1.7) * .25, z = q.y + nz * d + Math.sin(k * 2.3) * .25, pth = new THREE.Mesh(new THREE.CircleGeometry(.75 - k * .05, 10), dirtM); pth.rotation.x = -Math.PI / 2; pth.position.set(x, gH(x, z) + .04, z); pth.receiveShadow = true; pth.userData.wr = 1; g.add(pth); }   // il sentiero battuto
    });
    inst(new THREE.MeshStandardMaterial({ color: '#5a5c5e', metalness: .5, roughness: .6 }), posts); inst(new THREE.MeshStandardMaterial({ color: '#4a4c4e', metalness: .5, roughness: .6 }), arms, false);
    if (wires.length) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#3a3a3a' })); wl.userData.velo = true; g.add(wl); }
    // ---- i muri antirumore: pannelli di cemento grigio, a filo del terreno, che si dipingono (un muro vero, non instanced) ----
    if (RAIL.walls.length) {
      const pp = [], pi = []; let pv = null, lastS = -99;
      RAIL.walls.forEach(Wl => { for (let u = 0; u <= Wl.len; u += 1) { const q = sidePt(Wl.s + u, Wl.side, Wl.off), b = surfAt(Wl.s + u, Wl.side, Wl.off) - .25;   /* il muro posa sulla scarpata, non ci affonda */ if (Wl.s + u - lastS > 1.5) pv = null; const a = pp.length / 3; pp.push(q.x, b, q.y, q.x, b + Wl.h + .2, q.y); if (pv !== null) pi.push(pv, a, pv + 1, pv + 1, a, a + 1); pv = a; lastS = Wl.s + u; } });
      const wt = tex64(256, 128, (x, w, h) => { x.fillStyle = '#9c988f'; x.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${60 + Math.random() * 40},${60 + Math.random() * 40},${55 + Math.random() * 40},.12)`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } x.fillStyle = 'rgba(40,38,34,.35)'; for (let u = 0; u < w; u += 64) x.fillRect(u, 0, 3, h); const gr = x.createLinearGradient(0, h, 0, h * .6); gr.addColorStop(0, 'rgba(70,60,45,.35)'); gr.addColorStop(1, 'rgba(70,60,45,0)'); x.fillStyle = gr; x.fillRect(0, h * .6, w, h * .4); });
      const uv = []; for (let k = 0; k < pp.length / 6; k++) uv.push(k / 4, 0, k / 4, 1);
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(pi); gg.computeVertexNormals();
      wt.wrapS = THREE.RepeatWrapping; const m = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: wt, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; m.name = 'muro_antirumore'; g.add(m);
    }
    // ---- i segnali (palo, testa, la luce rossa o verde) e gli armadietti grigi accanto (si dipingono) ----
    const cabTex = k => { const c = cv(128, 176), x = c.getContext('2d'); x.fillStyle = '#8c9088'; x.fillRect(0, 0, 128, 176); x.strokeStyle = 'rgba(30,32,30,.7)'; x.lineWidth = 2; x.strokeRect(6, 6, 56, 164); x.strokeRect(66, 6, 56, 164);
      for (let y = 20; y < 50; y += 5) { x.fillStyle = 'rgba(20,20,20,.6)'; x.fillRect(16, y, 36, 2); x.fillRect(76, y, 36, 2); } x.fillStyle = '#2a2a2a'; x.fillRect(56, 80, 4, 14); x.fillRect(68, 80, 4, 14);
      x.fillStyle = '#e8d020'; x.beginPath(); x.moveTo(94, 60); x.lineTo(110, 88); x.lineTo(78, 88); x.closePath(); x.fill(); x.fillStyle = '#111'; x.font = 'bold 20px Arial'; x.fillText('!', 91, 85);
      for (let j = 0; j < 4; j++) { x.fillStyle = ['#e8e4dc', '#c8302a', '#2a6ac8', '#f0c020'][(k + j) % 4]; x.fillRect(10 + hr(k * 9 + j) * 90, 100 + hr(k * 7 + j) * 50, 14 + hr(j + k) * 12, 9 + hr(j * 3 + k) * 8); }   // gli adesivi
      for (let j = 0; j < 30; j++) { x.fillStyle = `rgba(120,70,30,${.15 + hr(k + j * 3) * .3})`; x.beginPath(); x.arc(hr(k * 5 + j) * 128, 150 + hr(k + j * 7) * 26, 1 + hr(j + k * 2) * 4, 0, 7); x.fill(); }
      try { if (typeof WriterMano !== 'undefined' && WriterMano.handTag) WriterMano.handTag(x, ['SNEK', 'OKAY', 'BRUT', 'MIKS'][k % 4], WriterMano.dna(31 + k), 128, 90, mulberry(k + 9), '#1a1a1e', 'mtag'); } catch (er) { }
      return new THREE.MeshStandardMaterial({ map: canvasTexture(c), roughness: .7, metalness: .3 }); };
    const darkM = new THREE.MeshStandardMaterial({ color: '#2a2c2e', metalness: .4, roughness: .6 }), cabM = new THREE.MeshStandardMaterial({ color: '#8c9088', roughness: .7 });
    for (let s = 90, k = 0; s < P.length - 30; s += 170, k++) {
      const sd = k % 2 ? 1 : -1, q = sidePt(s, sd, 3.1), b = EL(s) || SEA(s) ? q.h - .18 : gH(q.x, q.y), mast = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 4.2, 8), darkM); mast.position.set(q.x, b + 2.1, q.y); g.add(mast);
      const head = new THREE.Mesh(new THREE.BoxGeometry(.5, .9, .3), darkM); head.position.set(q.x, b + 3.9, q.y); head.rotation.y = -q.ang + Math.PI / 2; g.add(head);
      for (const [dy, c] of [[.18, k % 3 ? '#2aff5a' : '#ff2a1a'], [-.18, '#3a3a3a']]) { const l = new THREE.Mesh(new THREE.CircleGeometry(.1, 10), new THREE.MeshBasicMaterial({ color: c })); l.position.set(q.x - Math.sin(-q.ang + Math.PI / 2) * .16, b + 3.9 + dy, q.y - Math.cos(-q.ang + Math.PI / 2) * .16); l.rotation.y = -q.ang + Math.PI / 2 + Math.PI; g.add(l); }
      if (!(EL(s) || SEA(s))) { const cq = sidePt(s + 4, sd, 3.6), cb = gH(cq.x, cq.y), cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, .6), cabTex(k)); cab.position.set(cq.x, cb + .75, cq.y); cab.rotation.y = -cq.ang; cab.castShadow = true; cab.receiveShadow = true; cab.name = 'armadietto'; g.add(cab); }
    }
    // ---- i paraurti e i cartelli delle due stazioni, i lampioni degli scali ----
    const stop = (s0, dir) => { const q = railAt(s0), pb = new THREE.Group(); pb.position.set(q.x, q.h, q.y); pb.rotation.y = -q.ang + (dir < 0 ? Math.PI : 0); const red = new THREE.MeshStandardMaterial({ color: '#c8302a', roughness: .7 }), blk = new THREE.MeshStandardMaterial({ color: '#202022' });
      [[.5, .5, 2.2, red, 0, .9, 0], [.3, 1.2, .3, blk, -.3, .6, -.7], [.3, 1.2, .3, blk, -.3, .6, .7]].forEach(([w, h, d, mm, a, b, z]) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); o.position.set(a, b, z); o.castShadow = true; pb.add(o); }); g.add(pb); };
    stop(1, -1); stop(P.length - 2, 1);
    const sign = (q, text, side) => { const c = cv(360, 56), x = c.getContext('2d'); x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 360, 56); x.strokeStyle = '#1c3a7a'; x.lineWidth = 6; x.strokeRect(3, 3, 354, 50); x.fillStyle = '#1c3a7a'; x.font = 'bold 24px Arial'; x.textAlign = 'center'; x.fillText(text, 180, 37);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .56), new THREE.MeshStandardMaterial({ map: canvasTexture(c), side: THREE.DoubleSide })); const nx = -Math.sin(q.ang) * side, nz = Math.cos(q.ang) * side, b = gH(q.x + nx * 3.8, q.y + nz * 3.8); pl.position.set(q.x + nx * 3.8, Math.max(b, q.h) + 2.4, q.y + nz * 3.8); pl.rotation.y = -q.ang; g.add(pl);
      for (const d of [-1.4, 1.4]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.6, .08), darkM); po.position.set(pl.position.x + Math.cos(q.ang) * d, pl.position.y - 1.2, pl.position.z + Math.sin(q.ang) * d); g.add(po); } };
    sign(railAt(TR.sMine - TR.LEN / 2), 'MINIERA NORD', 1); sign(railAt(TR.sPort - 8), 'PORTO MILITARE', 1);
    RAIL.yards.forEach(Y => { sign(yardAt(Y, 8), Y.name.toUpperCase(), Y.side); for (const u of [Y.len * .3, Y.len * .7]) { const q = yardAt(Y, u), nx = -Math.sin(q.ang) * Y.side, nz = Math.cos(q.ang) * Y.side, x0 = q.x + nx * 3, z0 = q.y + nz * 3, b = gH(x0, z0), pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .11, 7, 8), darkM); pole.position.set(x0, b + 3.5, z0); g.add(pole); const lamp = new THREE.Mesh(new THREE.BoxGeometry(.7, .18, .3), new THREE.MeshBasicMaterial({ color: '#fff0c0' })); lamp.position.set(x0 - nx * .5, b + 6.95, z0 - nz * .5); g.add(lamp); } });
    GFX.fenceOn = true;
    return g;
  }
  // ---- i carri fermi negli scali: un gruppo per carro, le fiancate su canvas propri (si dipingono come un muro: i veli si
  // attaccano al carro e partono con lui) ----
  function wagMesh(kind, L) {
    const THREE = T3(), g = new THREE.Group(), Wd = TR.W, M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .7, metalness: .25 }, o || {}));
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
    [0, 1].forEach(sd => { const cnv = cv(L * SPPM, SIDE_H * SPPM); livery(cnv, kind, L, sd); const m = new THREE.MeshStandardMaterial({ map: canvasTexture(cnv), roughness: .6, metalness: .2 }), pl = new THREE.Mesh(new THREE.PlaneGeometry(L, SIDE_H), m); pl.position.set(0, BODY_Y + SIDE_H / 2, (sd ? 1 : -1) * Wd / 2); if (!sd) pl.rotation.y = Math.PI; pl.castShadow = true; pl.receiveShadow = true; pl.name = 'fiancata'; g.add(pl); });
    box(L - .02, SIDE_H - .02, Wd - .04, M(kind === 'chiuso' ? '#6a3a26' : '#4a4e52'), 0, BODY_Y + SIDE_H / 2, 0).userData.wr = 1;
    wagDetail(g, kind, L, { bodyM: M(kind === 'chiuso' ? '#5e3220' : '#42464a') });
    return g;
  }
  function yardFrame(st, sc, cx, cy) {
    if (!RAIL.yards.length) return;
    const Ys = yardState(st); GFX.yard = GFX.yard || {};
    const live = new Set();
    Ys.cons.forEach(c => c.cars.forEach((ck, k) => {
      const key = c.key + ':' + k, q = wagPose(st, c, k); if (!q) return; live.add(key);
      let o = GFX.yard[key]; if (!o) { o = GFX.yard[key] = { g: wagMesh(ck[0], ck[1]), L: ck[1] }; o.g.name = 'carro_' + key; o.g.traverse(m => { if (m.isMesh) m.userData.wag = { key: c.key, k }; }); sc.add(o.g); }
      o.g.visible = hyp(q.x - cx, q.y - cy) < 260; o.g.position.set(q.x, q.h, q.y); o.g.rotation.set(0, -q.ang, 0);
    }));
    Object.keys(GFX.yard).forEach(key => { if (live.has(key)) return; const o = GFX.yard[key]; if (o.g.parent) o.g.parent.remove(o.g); o.g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); m.material.dispose(); } }); delete GFX.yard[key]; });
  }
  // il rettangolo di un lavoro su un carro fermo (u0 dal bordo, vb sopra il telaio): nel mondo, attaccato al carro
  function wagRect(w) {
    const THREE = T3(), o = GFX.yard && GFX.yard[w.cons + ':' + w.wk]; if (!o) return null;
    const sd = w.side ? 1 : -1, L = o.L, lx = (sd > 0 ? -L / 2 + w.u0 + w.W / 2 : L / 2 - w.u0 - w.W / 2), loc = new THREE.Vector3(lx, BODY_Y + w.vb + w.H / 2, sd * (TR.W / 2 + .02));
    o.g.updateMatrixWorld(true); const c = o.g.localToWorld(loc.clone()), n = new THREE.Vector3(0, 0, sd).applyQuaternion(o.g.quaternion); n.y = 0; n.normalize();
    return { c, n, r: new THREE.Vector3(n.z, 0, -n.x), W: w.W, H: w.H, obj: o.g, veh: true };
  }
  // il bersaglio (canvas e offset) per un lavoro sul treno
  function trainTarget(w) {
    const car = GFX.train && GFX.train.cars[w.car]; if (!car) return null; const sd = car.sides[w.side];
    return { ctx: sd.ctx, tex: sd.tex, x0: w.u0 * SPPM, y0: (SIDE_H - w.vb - w.H) * SPPM, k: SPPM / PPM, c: sd.c };
  }
  function washSide(i, sd) { const car = GFX.train && GFX.train.cars[i]; if (!car) return; const s = car.sides[sd], b = GFX.base[i + ':' + sd]; s.ctx.globalCompositeOperation = 'source-over'; s.ctx.drawImage(b, 0, 0); if (s.c.__pvOrig) s.c.__pvOrig.getContext('2d').drawImage(b, 0, 0); s.tex.needsUpdate = true; }

  // ---------------- LA TAVOLETTA ----------------
  // [writer] Modalità «tavoletta» (B): si trascina sul muro (o su un mezzo) e si traccia la finestra; il gioco fotografa
  // quella zona di fronte, dritta, alla massima risoluzione, e la apre a tutto schermo; ci si disegna sopra col mouse o con la
  // tavoletta (la pressione conta), alla scala che si vuole; «Applica» la mette sulla superficie esattamente dov'era, con la
  // resa del gioco (writer_mano.js, il gesto registrato), e conta come un lavoro tuo: fama, crossaggi, vernice.
  const TAV = { a: null, b: null, frame: null, pad: null };
  const TAV_COLS = [['#c42a22', 'rosso'], ['#1e1e24', 'nero'], ['#e8e0d0', 'bianco'], ['#2a6ac8', 'blu'], ['#e8c040', 'giallo'], ['#3a9a5a', 'verde'], ['#c84a9a', 'rosa'], ['#e8a020', 'arancio']];
  function tavRect() {
    const A = TAV.a, rx = A.r, ua = 0, ub = (TAV.b.x - A.pt.x) * rx.x + (TAV.b.z - A.pt.z) * rx.z;
    let Wm = Math.abs(ub - ua), Hm = Math.abs(TAV.b.y - A.pt.y), cu = (ua + ub) / 2, cy = (A.pt.y + TAV.b.y) / 2;
    if (Wm < .25 || Hm < .2) { Wm = 1.6; Hm = .9; cu = 0; cy = A.pt.y; }   // un clic solo: la finestra della tag
    Wm = clamp(Wm, .25, 8); Hm = clamp(Hm, .2, 4);
    return { W: Wm, H: Hm, c: { x: A.pt.x + rx.x * cu, y: cy, z: A.pt.z + rx.z * cu } };
  }
  function tavFrame() {
    const THREE = T3(), A = TAV.a, Rc = tavRect(), n = A.n, rx = A.r, sc = scene(); if (!sc) return;
    const P = (u, v) => new THREE.Vector3(Rc.c.x + rx.x * u + n.x * .03, Rc.c.y + v, Rc.c.z + rx.z * u + n.z * .03);
    const pts = [P(-Rc.W / 2, -Rc.H / 2), P(Rc.W / 2, -Rc.H / 2), P(Rc.W / 2, Rc.H / 2), P(-Rc.W / 2, Rc.H / 2)];
    if (!TAV.frame) { TAV.frame = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe14a, depthTest: false })); TAV.frame.renderOrder = 9; sc.add(TAV.frame); }
    TAV.frame.geometry.setFromPoints(pts);
  }
  function tavClear() { if (TAV.frame) { if (TAV.frame.parent) TAV.frame.parent.remove(TAV.frame); TAV.frame.geometry.dispose(); TAV.frame.material.dispose(); TAV.frame = null; } TAV.a = null; TAV.b = null; }
  function tavTick(st, nx, ny, tool, col) {
    const THREE = T3(), R = R_(), p = st.player; if (!THREE || !R || TAV.pad) return true;
    const cam = R.getCamera(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), cam); rc.near = 0; rc.far = 1e4;
    if (!TAV.a) {
      const h = rc.intersectObjects(cands(p.x, p.y), false).find(h => { if (!h.face || hyp(h.point.x - p.x, h.point.z - p.y) > 14) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); });
      if (!h) return false;
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(rc.ray.direction) > 0) n.negate();
      if (Math.abs(n.y) > .6) return { msg: 'La tavoletta va su un muro o su un mezzo: trascina sulla parete.' };
      const nn = new THREE.Vector3(n.x, 0, n.z).normalize();
      TAV.a = { pt: h.point.clone(), n: nn, r: new THREE.Vector3(nn.z, 0, -nn.x), obj: h.object, tool, col }; TAV.b = h.point.clone();
      TAV.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(nn, h.point); tavFrame(); return true;
    }
    const q = new THREE.Vector3(); if (rc.ray.intersectPlane(TAV.plane, q)) { TAV.b = q; tavFrame(); }
    return true;
  }
  // la foto della zona: una camera ortogonale dritta davanti al muro, appena staccata (così il writer non c'è)
  function tavShot(Rc, n, rx) {
    const THREE = T3(), R = R_(), rend = R.__models && R.__models.renderer, sc = scene(); if (!rend || !sc) return null;
    const MAX = 2048, pw = Rc.W >= Rc.H ? MAX : Math.round(MAX * Rc.W / Rc.H), ph = Rc.W >= Rc.H ? Math.round(MAX * Rc.H / Rc.W) : MAX;
    const cam = new THREE.OrthographicCamera(-Rc.W / 2, Rc.W / 2, Rc.H / 2, -Rc.H / 2, .01, 1.2);
    cam.position.set(Rc.c.x + n.x * .3, Rc.c.y, Rc.c.z + n.z * .3); cam.up.set(0, 1, 0); cam.lookAt(Rc.c.x, Rc.c.y, Rc.c.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const rt = new THREE.WebGLRenderTarget(pw, ph), prev = rend.getRenderTarget(), fr = TAV.frame; if (fr) fr.visible = false;
    rend.setRenderTarget(rt); rend.clear(); rend.render(sc, cam); const buf = new Uint8Array(pw * ph * 4); rend.readRenderTargetPixels(rt, 0, 0, pw, ph, buf); rend.setRenderTarget(prev); rt.dispose(); if (fr) fr.visible = true;
    const c = cv(pw, ph), x = c.getContext('2d'), im = x.createImageData(pw, ph);
    for (let y = 0; y < ph; y++) im.data.set(buf.subarray((ph - 1 - y) * pw * 4, (ph - y) * pw * 4), y * pw * 4);   // la riga di sotto va su
    x.putImageData(im, 0, 0); return c;
  }
  function tavRelease(st) {
    if (!TAV.a || TAV.pad) return;
    const A = TAV.a, Rc = tavRect(), shot = tavShot(Rc, A.n, A.r);
    if (!shot) { tavClear(); return; }
    tavPad(st, shot, Rc, A);
  }
  // il pannello: la foto a tutto schermo, il disegno sopra, gli strumenti
  function tavPad(st, shot, Rc, A) {
    if (typeof document === 'undefined') return;
    const pw = shot.width, ph = shot.height, strokes = []; let cur = null, tool = A.tool, colI = Math.max(0, TAV_COLS.findIndex(c => c[0] === A.col)), cm = tool === 'pennarello' ? 2.5 : 4;
    const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,9,8,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font:14px system-ui,sans-serif;color:#eee;user-select:none';
    const bar = document.createElement('div'); bar.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center';
    const wrap = document.createElement('div'); wrap.style.cssText = 'position:relative;touch-action:none;box-shadow:0 0 0 2px #ffe14a';
    const bg = document.createElement('canvas'), ink = document.createElement('canvas'), live = document.createElement('canvas');
    [bg, ink, live].forEach((c, i) => { c.width = pw; c.height = ph; c.style.cssText = (i ? 'position:absolute;left:0;top:0;' : 'display:block;') + 'width:100%;height:100%'; wrap.appendChild(c); });
    bg.getContext('2d').drawImage(shot, 0, 0);
    const fit = () => { const k = Math.min((innerWidth - 40) / pw, (innerHeight - 110) / ph); wrap.style.width = pw * k + 'px'; wrap.style.height = ph * k + 'px'; };
    fit(); addEventListener('resize', fit);
    const btn = (t, f, hot) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'padding:7px 14px;border-radius:5px;border:1px solid #555;cursor:pointer;color:#fff;background:' + (hot ? '#d8402a' : '#34312c'); b.onclick = f; bar.appendChild(b); return b; };
    const info = document.createElement('span'); info.style.color = '#bbb';
    const tb = btn('', () => { tool = tool === 'pennarello' ? 'bomboletta' : 'pennarello'; upd(); render(); });
    const cb = btn('', () => { colI = (colI + 1) % TAV_COLS.length; upd(); render(); });
    const sl = document.createElement('input'); sl.type = 'range'; sl.min = 1; sl.max = 30; sl.value = cm; sl.oninput = () => { cm = +sl.value; upd(); drawLive(); render(); };
    const lab = document.createElement('label'); lab.style.color = '#bbb'; lab.append('spessore ', sl); bar.appendChild(lab);
    btn('Annulla tratto', () => { strokes.pop(); drawLive(); render(); });
    btn('Applica', () => apply(), true);
    btn('Esci', () => close());
    bar.appendChild(info);
    const upd = () => { tb.textContent = tool === 'pennarello' ? 'Pennarello' : 'Bomboletta'; cb.textContent = 'Colore: ' + TAV_COLS[colI][1]; cb.style.borderColor = TAV_COLS[colI][0]; info.textContent = `${Rc.W.toFixed(2)} × ${Rc.H.toFixed(2)} m · ${cm} cm`; };
    upd();
    box.appendChild(bar); box.appendChild(wrap); document.body.appendChild(box);
    const pxm = pw / Rc.W, wpx = () => cm / 100 * pxm;
    const pos = e => { const b = live.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * pw, (e.clientY - b.top) / b.height * ph]; };
    live.addEventListener('pointerdown', e => { live.setPointerCapture(e.pointerId); const [x, y] = pos(e); cur = [[x, y, e.timeStamp, e.pressure || .5]]; strokes.push(cur); drawLive(); });
    live.addEventListener('pointermove', e => { if (!cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => { const [x, y] = pos(ev), l = cur[cur.length - 1]; if (hyp(x - l[0], y - l[1]) < 1.5) return; cur.push([x, y, ev.timeStamp, ev.pressure || .5]); }); drawLive(); });
    const end = () => { if (!cur) return; cur = null; drawLive(); render(); }; live.addEventListener('pointerup', end); live.addEventListener('pointercancel', end);
    // mentre si disegna: il tratto com'è; appena staccato: la resa del gioco
    function drawLive() { const x = live.getContext('2d'); x.clearRect(0, 0, pw, ph); if (!cur) return; x.strokeStyle = TAV_COLS[colI][0]; x.globalAlpha = .7; x.lineCap = x.lineJoin = 'round'; x.lineWidth = wpx(); x.beginPath(); cur.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.stroke(); }
    const rec = () => ({ strokes: strokes.map(s => s.map(q => [q[0], q[1], q[2] - strokes[0][0][2], q[3]])), wpx: wpx(), frame: { w: pw, h: ph } });
    function render() { const x = ink.getContext('2d'); x.clearRect(0, 0, pw, ph); if (!strokes.length) return; try { WriterMano.drawRecorded(x, rec(), { seed: 7 }, pw, ph, mulberry(11), TAV_COLS[colI][0], tool === 'pennarello' ? 'mtag' : 'tag'); } catch (e) { console.error(e); } }
    const keys = e => { e.stopPropagation(); if (e.key === 'Escape') close(); }; addEventListener('keydown', keys, true); addEventListener('keyup', keys, true);
    function close() { removeEventListener('keydown', keys, true); removeEventListener('keyup', keys, true); removeEventListener('resize', fit); box.remove(); TAV.pad = null; tavClear(); GFX.held = false; }
    function apply() {
      if (!strokes.length) { close(); return; }
      const W = S(st), inv = OG() ? OG().inv(st) : null, r = rec();
      let len = 0; r.strokes.forEach(s => s.forEach((q, i) => { if (i) len += hyp(q[0] - s[i - 1][0], q[1] - s[i - 1][1]); })); const lenM = len / pxm, cmM = cm / 100;
      // la vernice: la bomboletta copre un po' meno di un metro quadro di tratto, il pennarello una ventina di metri di linea
      if (inv && tool === 'bomboletta') { W.canUse += lenM * cmM / .8; while (W.canUse >= 1 && inv.bomboletta > 0) { inv.bomboletta--; W.canUse -= 1; } if (!inv.bomboletta) delete inv.bomboletta; }
      if (inv && tool === 'pennarello') { W.mkUse += lenM / 20; if (W.mkUse >= 1 && inv.pennarello > 0) { W.mkUse -= 1; inv.pennarello--; if (!inv.pennarello) delete inv.pennarello; } }
      const area = Rc.W * Rc.H, style = tool === 'pennarello' ? 'mtag' : area > 3.5 ? 'pezzo' : area > 1.2 ? 'throw' : 'tag', THREE = T3();
      const nw = { by: 'player', aka: playerAka(st), crew: W.crew, style, tool, col: TAV_COLS[colI][0], rec: r, pal: 0, seed: Math.floor(rnd() * 1e9), prog: 1, done: false, surf: 'muro', place: G.nearestPlace ? 'a ' + G.nearestPlace(st.player.x, st.player.y).name : '', W: Rc.W, H: Rc.H, hand: W.hand || (W.hand = Math.floor(rnd() * 1e9)) };
      nw.gfxRect = { c: new THREE.Vector3(Rc.c.x, Rc.c.y, Rc.c.z), n: A.n.clone(), r: A.r.clone(), W: Rc.W, H: Rc.H, obj: A.obj }; nw.pos = { x: Rc.c.x, y: Rc.c.y, z: Rc.c.z };
      const vid = vehOf(A.obj); if (vid) { const v = st.vehicles.find(x => x.id === vid); nw.surf = 'auto'; nw.veh = vid; nw.gfxRect.obj = vehGroup(vid); nw.gfxRect.veh = true; if (v && v.police) nw.cop = true; }
      addWork(st, nw); const m = judge(st, nw); if (m) G.feed(st, m, /crossato/.test(m) ? 'bad' : 'info');
      finish(st, nw); try { G.emit(st, 'graffito'); } catch (e) { }
      close();
    }
    TAV.pad = box; GFX.held = false;
  }

  // ---------------- IL GIOCATORE: il colpo, il lavoro sotto il puntatore ----------------
  // ritorna: true (si dipinge), { go } (avvicinati), { msg } (non si può), false (niente sotto)
  const REACH = 1.7;
  function tick(st, nx, ny, dt, col, colIdx, tool) {
    if (mode(st) === 'tavoletta') return tavTick(st, nx, ny, tool, col);   // [writer] la finestra per la tavoletta
    const W = S(st), p = st.player, THREE = T3(), R = R_(); if (!THREE || !R) return false;
    let w = W.cur && !W.cur.done ? W.cur : null;
    if (!w) {
      // il primo colpo: dove punta il mouse
      const cam = R.getCamera(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), cam); rc.near = 0; rc.far = 1e4;
      const list = cands(p.x, p.y); if (GFX.train) GFX.train.cars.forEach(c => c.sides.forEach(s => list.push(s.mesh)));
      const feet = TT() ? TT().feetH(st) : R.groundH(p.x, p.y);
      const h = rc.intersectObjects(list, false).find(h => { if (!h.face || hyp(h.point.x - p.x, h.point.z - p.y) > 12) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); });
      if (!h) return false;
      // ripresa: il clic cade su un lavoro tuo lasciato a metà
      const mine = W.works.find(o => o.by === 'player' && !o.done && !o.erased && o.gfxRect && Math.abs((h.point.x - o.gfxRect.c.x) * o.gfxRect.r.x + (h.point.z - o.gfxRect.c.z) * o.gfxRect.r.z) < o.gfxRect.W / 2 && Math.abs(h.point.y - o.gfxRect.c.y) < o.gfxRect.H / 2 && Math.abs((h.point.x - o.gfxRect.c.x) * o.gfxRect.n.x + (h.point.z - o.gfxRect.c.z) * o.gfxRect.n.z) < .3);
      const car = h.object.userData.car, wag = h.object.userData.wag;   // [ferrovia] wag: un carro fermo nello scalo
      const mineT = car && W.works.find(o => o.by === 'player' && !o.done && !o.erased && o.surf === 'treno' && o.car === car.i && o.side === car.side);
      const back = mine || mineT;
      const d = hyp(h.point.x - p.x, h.point.z - p.y), n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(rc.ray.direction) > 0) n.negate();
      const nh = hyp(n.x, n.z);
      if (d > REACH && !back) { if (d > 9) return false; const off = nh > .3 ? .55 : 0; return { go: { x: h.point.x + (off ? n.x / nh * off : 0), y: h.point.z + (off ? n.z / nh * off : 0) } }; }
      if (back) { W.cur = back; GFX.held = true; return true; }
      const surf = car ? 'treno' : 'muro', style = styleFor(st, tool, surf); if (!style) return false;
      const sty = STYLES[style];
      if (!sty.marker && !(OG() && (OG().inv(st).bomboletta || 0) > 0)) return { msg: 'Niente bombolette.' };
      if (!W.aka && typeof prompt === 'function' && tool !== 'pennarello' && style !== 'tag') { const m = renameTag(st); if (m) G.feed(st, m); }
      const sk = sketchFor(st, style), nw0 = { by: 'player', aka: playerAka(st), crew: W.crew, style, tool, fam: W.fam || undefined, pal: COL2PAL[colIdx % COL2PAL.length], col: style === 'tag' || style === 'mtag' ? (tool === 'pennarello' ? '#121216' : col) : null, seed: Math.floor(rnd() * 1e9), prog: 0, done: false, surf, place: G.nearestPlace ? 'a ' + G.nearestPlace(p.x, p.y).name : '' };
      const imp = sk ? null : WA.conceive({ aka: playerAka(st), crew: W.crew, style: style === 'wholecar' ? 'burner' : style, dna: Object.assign({}, playerDna(st), { skill: playerDna(st).skill - .08 }), seed: nw0.seed }), nw = Object.assign(nw0, sk || imp, { by: 'player', aka: (sk && sk.aka) || playerAka(st), crew: W.crew, style, tool, trace: true, sketch: !!sk, prog: 0, done: false, surf: nw0.surf, place: nw0.place, col: nw0.col, hand: W.hand || (W.hand = Math.floor(rnd() * 1e9)) });
      if (sk && sk.bitten) { const o = sk.bitten; W.beef[o] = (W.beef[o] || 0) + 2; G.feed(st, `Stai facendo il pezzo di un altro: è biting. Se i ${o} lo vedono, sono guai.`, 'bad'); }
      if (car) {
        const L = TR.CARS[car.i].L, tr = trainAt(st.t); if (tr && tr.v) return { msg: 'Il treno si muove!' };
        const u = h.uv ? h.uv.x * L : L / 2;
        if (style === 'wholecar') Object.assign(nw, { car: car.i, side: car.side, u0: .25, vb: .12, W: L - .5, H: 2.8 });
        else { const Wm = Math.min(sty.W, L - .4), Hm = Math.min(sty.H, 2.7), u0 = clamp(u - Wm / 2, .2, L - Wm - .2), vb = style === 'pezzo' ? .2 : clamp((h.point.y - carPose(tr, car.i).h - BODY_Y) - Hm / 2, .1, SIDE_H - Hm - .1); Object.assign(nw, { car: car.i, side: car.side, u0, vb, W: Wm, H: Hm }); }
        if (nw.style === 'wholecar' || nw.style === 'burner') { const k = car.i + ':' + car.side; (W.train.sides[k] || []).forEach(id => { const o = W.works.find(x => x.id === id); if (o && !o.erased && o.by !== 'player') { o.covered = true; if (STYLES[o.style].rank >= STYLES[nw.style].rank) W.beef[o.crew] = (W.beef[o.crew] || 0) + 1; } }); }
        const tgt = trainTarget(nw); if (!tgt) return false;
        nw.gfxRect = null; nw.pos = { x: h.point.x, y: h.point.y, z: h.point.z };
        addWork(st, nw); W.cur = nw; GFX.works[nw.id] = { tgt, art: art(nw), drawn: 0 };
        const m2 = judgeTrain(st, nw); G.feed(st, m2 || `Sul treno: ${sty.nome}${style === 'wholecar' ? ', da cima a fondo, da un capo all\'altro' : ''}. Tieni premuto.`);
        GFX.held = true; return true;
      }
      if (style !== 'tag' && style !== 'mtag' && Math.abs(n.y) > .5) return { msg: 'Un pezzo va su un muro, non per terra.' };
      const nn = new THREE.Vector3(n.x, Math.abs(n.y) > .5 ? n.y : 0, n.z).normalize(), Hh = sty.H, c = h.point.clone();
      if (Math.abs(nn.y) < .5) c.y = clamp(c.y, feet + .12 + Hh / 2, Math.max(feet + .12 + Hh / 2, feet + 2.75 - Hh / 2));
      let fitR = null;
      if (Math.abs(nn.y) > .5) { fitR = { W: sty.W, H: sty.H, r: new THREE.Vector3(1, 0, 0) }; }
      else { if (wag) { const cs = consOf(st, wag.key); if (!cs || cs.leave) return { msg: 'I carri si muovono!' }; } const WG = wag && GFX.yard && GFX.yard[wag.key + ':' + wag.k];
        fitR = WG ? { W: Math.min(sty.W, WG.L - .6), H: Math.min(Hh, 2.6), r: new THREE.Vector3(nn.z, 0, -nn.x) } : vehOf(h.object) ? { W: Math.min(sty.W, 3), H: Math.min(Hh, 1), r: new THREE.Vector3(nn.z, 0, -nn.x) } : wallRect(c, nn, sty.W, Hh, cands(c.x, c.z)); }
      if (!fitR && (style === 'tag' || style === 'mtag')) fitR = { W: Math.min(sty.W, .7), H: Math.min(sty.H, .45), r: new THREE.Vector3(nn.z, 0, -nn.x) };   // [writer] la tag si fa ovunque: un palo, un cassonetto, una gomma, una porta stretta
      if (!fitR) return { msg: `Qui il muro non basta per un ${sty.nome}: cerca una parete più larga.` };
      nw.W = fitR.W; nw.H = fitR.H; nw.gfxRect = { c, n: nn, r: fitR.r, W: fitR.W, H: fitR.H, obj: h.object }; nw.pos = { x: c.x, y: c.y, z: c.z };
      if (wag && GFX.yard && GFX.yard[wag.key + ':' + wag.k]) { nw.surf = 'vagone'; nw.cons = wag.key; nw.wk = wag.k; nw.gfxRect.obj = GFX.yard[wag.key + ':' + wag.k].g; nw.gfxRect.veh = true; }   // [ferrovia] il velo sta sul carro e parte con lui
      { const vid = vehOf(h.object); if (vid) { const v = st.vehicles.find(x => x.id === vid); nw.surf = 'auto'; nw.veh = vid; nw.gfxRect.obj = vehGroup(vid); nw.gfxRect.veh = true; if (v && v.police) { G.feed(st, 'Stai bombando una volante dei Grigi. Se ti vedono, è finita.', 'bad'); nw.cop = true; } } }
      addWork(st, nw); W.cur = nw;
      const g = { art: art(nw), drawn: 0 };
      if (Math.abs(nn.y) > .5) { // per terra (le tag): il velo steso
        const cvs = cv(g.art.Wp, g.art.Hp), tex = canvasTexture(cvs), mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(nw.W, nw.H), mat); mesh.userData.velo = true; mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = -Math.atan2(c.z - p.y, c.x - p.x) - Math.PI / 2; mesh.position.copy(c).add(new THREE.Vector3(0, .015, 0)); scene().add(mesh);
        g.tgt = { mesh, c: cvs, ctx: cvs.getContext('2d'), tex, x0: 0, y0: 0, k: 1 };
      } else g.tgt = makeVeil(nw, g.art);
      GFX.works[nw.id] = g;
      const m2 = judge(st, nw); if (m2) G.feed(st, m2, /crossato/.test(m2) ? 'bad' : 'info');
      GFX.held = true; return true;
    }
    // si dipinge: il RICALCO. Il getto va dove punta il mouse; dove passa, il bozzetto si scopre (la tappa in corso). Se il punto è
    // lontano, il writer si sposta lungo il muro; se è troppo in alto, ci vuole la scala o il tetto.
    const g = GFX.works[w.id]; if (!g) { W.cur = null; return false; }
    if (w.surf === 'treno') { const tr = trainAt(st.t); if (tr && tr.v) { W.cur = null; return { msg: 'Il treno parte! Via dalla calata.' } } }
    const T = g.tgt, A = g.art; if (!T || !A) return false;
    const cam = R.getCamera(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), cam); rc.near = 0; rc.far = 1e4;
    const target = w.surf === 'treno' ? GFX.train.cars[w.car].sides[w.side].mesh : T.mesh; if (!target) return false;
    const hh = rc.intersectObject(target, false)[0];
    if (!hh || !hh.uv) { if (dist2(w, p) > 4.5) { W.cur = null; return { msg: 'Troppo lontano dal lavoro: torna lì e clicca sopra per riprendere.' }; } return true; }
    const lx = (hh.uv.x * T.c.width - T.x0) / T.k, ly = ((1 - hh.uv.y) * T.c.height - T.y0) / T.k;
    if (lx < -6 || ly < -6 || lx > A.Wp + 6 || ly > A.Hp + 6) return true;   // fuori dal pezzo: niente
    const tp = hh.point, feetY = TT() ? TT().feetH(st) : R.groundH(p.x, p.y), dH = hyp(tp.x - p.x, tp.z - p.y);
    p.face = Math.atan2(tp.z - p.y, tp.x - p.x);
    if (tp.y > feetY + 2.75) { if (st.clock - (W.highT || 0) > 4) { W.highT = st.clock; G.feed(st, 'Lì non ci arrivi: ci vuole una scala, o il tetto.'); } return true; }
    if (dH > 1.9 && !(p.lv && p.lv.k === 'scala')) {   // ci si avvicina lungo il muro
      let nrm = w.gfxRect && w.gfxRect.n; if (w.surf === 'treno') { const q = carPose(trainAt(st.t), w.car), sd = w.side ? 1 : -1; nrm = { x: -Math.sin(q.ang) * sd, z: Math.cos(q.ang) * sd }; }
      const ax = tp.x + nrm.x * .75, ay = tp.z + nrm.z * .75, dx = ax - p.x, dy = ay - p.y, dd = hyp(dx, dy);
      if (dd > .3) { const sp = Math.min(dd, 2 * dt), nx2 = p.x + dx / dd * sp, ny2 = p.y + dy / dd * sp; const okW = p.lv ? (typeof Livelli !== 'undefined' && Livelli.freeFn(p, .3) ? Livelli.freeFn(p, .3)(nx2, ny2) : true) : G.walkM(nx2, ny2); if (okW) { p.x = nx2; p.y = ny2; p.speedNow = sp / dt; } }
      if (dH > 2.6) return true;
    }
    const brush = (w.sketch ? .3 : .19) * (A.ppm || PPM) * (1 + (W.done.pezzo + W.done.burner) * .01);
    const got = traceAt(w, g, lx, ly, brush);
    p.__tip = { x: tp.x, y: tp.y, z: tp.z, t: performance.now() };
    // le bombolette: in proporzione a quello che si copre (e un filo anche solo spruzzando)
    const sty = STYLES[w.style], inv = OG() ? OG().inv(st) : null;
    if (inv && !sty.marker) {
      W.canUse += got * (g.cellCost || 0) * sty.cans + dt * .004;
      while (W.canUse >= 1) { if (!(inv.bomboletta > 0)) { W.cur = null; return { msg: 'Finite le bombolette. Il lavoro resta a metà: con altre bombolette lo riprendi.' }; } inv.bomboletta--; W.canUse -= 1; if (!inv.bomboletta) delete inv.bomboletta; G.feed(st, 'Una bomboletta finita: la butti e ne agiti un\'altra.'); }
    } else if (inv && sty.marker) { const floor = w.gfxRect && Math.abs(w.gfxRect.n.y) > .5; if (floor && !W.floorWarn) { W.floorWarn = true; G.feed(st, 'L\'asfalto si mangia la punta del pennarello: per terra dura un quarto.'); }   // [writer] per terra il marker si consuma
      W.mkUse += got * (g.cellCost || 0) / 40 * (floor ? 4 : 1); if (W.mkUse >= 1) { W.mkUse -= 1; inv.pennarello = Math.max(0, (inv.pennarello || 0) - 1); if (!inv.pennarello) delete inv.pennarello; } }
    if (st.clock - (W.emitT || 0) > 6) { W.emitT = st.clock; try { G.emit(st, 'graffito'); } catch (e) { } }
    if (g.ts >= A.stages.length) { w.prog = 1; finish(st, w); W.cur = null; GFX.held = false; return 'fatto'; }
    return true;
  }
  const dist2 = (w, p) => { const q = w.pos || (w.gfxRect && w.gfxRect.c); return q ? hyp(q.x - p.x, q.z - p.y) : 0; };
  // il bozzetto da usare per questo lavoro: quello scelto nel blackbook (se è dello stesso tipo), altrimenti si improvvisa
  function sketchFor(st, style) {
    const W = S(st), b = W.book && W.book[W.bookSel]; if (!b) return null;
    const base = style === 'wholecar' ? 'burner' : style; if (b.style !== base && !(b.style === 'burner' && style === 'wholecar')) return null;
    return Object.assign({}, b, { style });
  }
  // la mano del giocatore: cresce coi lavori fatti e con la fama
  function playerDna(st) { const W = S(st), d = W.done, skill = clamp(.38 + (d.tag + d.throw * 2 + d.pezzo * 4 + d.burner * 6 + d.wholecar * 8) * .006 + W.fame / 1500, .3, .97); return Object.assign(W.dna || (W.dna = WA.dnaOf(Math.floor(rnd() * 1e9), .5, 0)), { skill, fam: W.fam || (W.dna && W.dna.fam) }); }
  function judgeTrain(st, w) { const W = S(st), k = w.car + ':' + w.side, under = (W.train.sides[k] || []).map(id => W.works.find(o => o.id === id)).filter(o => o && !o.erased && o.by !== 'player'); if (!under.length) return null; const o = under[0]; w.over = under.map(o => o.id); return STYLES[w.style].rank > STYLES[o.style].rank ? `Vai sopra al ${STYLES[o.style].nome} di ${o.aka}: il tuo è più grosso, si può.` : `Hai crossato ${o.aka} dei ${o.crew} sul treno. Guerra.`; }
  function release(st) { if (TAV.a) { tavRelease(st); GFX.held = false; return; } const W = S(st); if (W.cur && !W.cur.done) { const w = W.cur; G.feed(st, `${STYLES[w.style].nome[0].toUpperCase() + STYLES[w.style].nome.slice(1)} al ${Math.round(w.prog * 100)}%: clicca sopra per riprendere.`); } W.cur = null; GFX.held = false; }
  // main.js: con questo attrezzo e questa modalità ci pensa il writing (non lo spruzzo libero)
  const wants = (st, tool) => tool === 'pennarello' || (tool === 'bomboletta' && mode(st) !== 'libero');

  // ---------------- OGNI FOTOGRAMMA ----------------
  function frame() {
    try {
      const pv = window.__pv, R = pv && pv.R, st = pv && pv.st;
      if (R && R.__models && R.__models.scene && st && window.THREE && R.__bmb) {
        const sc = R.__models.scene;
        if (GFX.st !== st) {   // una partita nuova: via i veli, il treno si ridipinge da capo
          Object.values(GFX.works).forEach(g => { if (g.tgt && g.tgt.mesh && g.tgt.mesh.parent) g.tgt.mesh.parent.remove(g.tgt.mesh); }); GFX.works = {};
          if (GFX.train) { TR.CARS.forEach((c, i) => [0, 1].forEach(sd => washSide(i, sd))); }
          GFX.st = st;
        }
        if (TR.ok && !GFX.train && R.groundH) { GFX.train = trainGroup(); sc.add(GFX.train.grp); GFX.track = track(); sc.add(GFX.track); }
        const W = S(st), p = st.player, cam = R.cam || {}, cx = cam.x !== undefined ? cam.x : p.x, cy = cam.y !== undefined ? cam.y : p.y;
        // il treno: dove deve stare
        if (GFX.train) {
          const tr = trainAt(st.t), mid = carPose(tr, 2), far = hyp(cx - mid.x, cy - mid.y) > 260;
          GFX.train.grp.visible = !far;
          if (!far) GFX.train.cars.forEach((c, i) => { const q = carPose(tr, i); c.g.position.set(q.x, q.h, q.y); c.g.rotation.set(0, -q.ang, q.pitch, 'YXZ'); });
        }
        if (GFX.train) yardFrame(st, sc, cx, cy);   // [ferrovia] i carri fermi negli scali (e quelli che partono)
        // i lavori: quelli che non hanno ancora la grafica (della notte, o di prima) vicino alla camera
        const now = performance.now();
        if (now - (GFX.scanT || 0) > 150) {
          GFX.scanT = now; let n = 0; const t0 = performance.now();
          const near = W.works.filter(w => !GFX.works[w.id] && !w.erased && !(w.gfxFail > 3)).map(w => { const sp = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); if (w.surf === 'vagone') { const c = consOf(st, w.cons), q = c && wagPose(st, c, w.wk); return [w, q ? hyp(q.x - cx, q.y - cy) : 1e9]; } return [w, w.surf === 'treno' ? 0 : sp ? hyp(sp.x - cx, sp.y - cy) : 1e9]; }).filter(a => a[1] < 80).sort((a, b) => a[1] - b[1]).map(a => a[0]);
          for (const w of near) {
            if (performance.now() - t0 > 14) break;
            if (GFX.works[w.id] || w.erased || w.gfxFail > 3) continue;
            if (w.surf === 'treno') { if (!GFX.train) continue; const tgt = trainTarget(w); if (!tgt) continue; GFX.works[w.id] = { tgt, art: art(w), drawn: 0 }; n++; continue; }
            if (w.surf === 'vagone') { if (!w.gfxRect) { const rc2 = wagRect(w); if (!rc2) continue; w.gfxRect = rc2; } w.pos = { x: w.gfxRect.c.x, y: w.gfxRect.c.y, z: w.gfxRect.c.z }; const g = { art: art(w), drawn: 0 }; g.tgt = makeVeil(w, g.art); GFX.works[w.id] = g; n++; continue; }   // [ferrovia] sui carri fermi
            const sp = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); if (!sp || hyp(sp.x - cx, sp.y - cy) > 80) continue;
            if (!w.gfxRect && !placeWall(w)) { w.gfxFail = (w.gfxFail || 0) + 1; continue; }
            const g = { art: art(w), drawn: 0 }; g.tgt = makeVeil(w, g.art); GFX.works[w.id] = g; n++;
          }
        }
        // disegno: i lavori finiti in un colpo, quelli in corso fin dove sono arrivati; i cancellati via; i lontani si liberano
        const byId = new Map(W.works.map(o => [o.id, o]));
        for (const id in GFX.works) {
          const g = GFX.works[id], w = byId.get(+id);
          if (w && w.surf === 'auto') { const v = st.vehicles.find(x => x.id === w.veh); if (!v || v.wreck) { w.erased = true; } else if (g.tgt && g.tgt.mesh) { let o = g.tgt.mesh; while (o.parent) o = o.parent; if (o !== sc) { delete GFX.works[id]; w.gfxRect = null; continue; } w.pos = { x: v.x, y: w.pos ? w.pos.y : 1, z: v.y }; } }
          if (w && w.surf === 'vagone' && g.tgt && g.tgt.mesh) { let o = g.tgt.mesh; while (o.parent) o = o.parent; if (o !== sc) { delete GFX.works[id]; if (!w.erased) w.gfxRect = null; continue; } }   // il carro è partito (o rifatto): il velo va con lui
          if (w && !w.erased && w.surf !== 'treno' && w.surf !== 'vagone' && w.pos && hyp(w.pos.x - cx, w.pos.z - cy) > 140 && w !== W.cur) {
            if (g.tgt && g.tgt.mesh) { if (g.tgt.mesh.parent) g.tgt.mesh.parent.remove(g.tgt.mesh); g.tgt.mesh.geometry.dispose(); g.tgt.mesh.material.dispose(); if (g.tgt.tex) g.tgt.tex.dispose(); }
            delete GFX.works[id]; continue;
          }
          if (!w || w.erased) {
            if (g.tgt && g.tgt.mesh && g.tgt.mesh.parent) g.tgt.mesh.parent.remove(g.tgt.mesh);
            if (w && w.surf === 'treno' && w.washed && !g.washed) { g.washed = true; washSide(w.car, w.side); W.works.filter(o => o.surf === 'treno' && o.car === w.car && o.side === w.side && !o.erased).forEach(o => { delete GFX.works[o.id]; }); }
            delete GFX.works[id]; continue;
          }
          if (w.trace && !w.done) { if (g.ts == null) drawUpTo(w, g); } else if (g.drawn < (w.done ? 1 : w.prog) * g.art.stages.length - 1e-6 || (w.crossed && !g.crossDrawn)) drawUpTo(w, g);
        }
      }
    } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[Writing]', e); } }
    requestAnimationFrame(frame);
  }
  if (typeof window !== 'undefined') {
    addEventListener('keydown', e => {
      const pv = window.__pv, st = pv && pv.st, ui = pv && pv.ui; if (!st || (ui && (ui.book || ui.menu || ui.dialog || ui.intro || ui.over))) return;
      const k = e.key.toLowerCase(); if (k !== 'b' || e.repeat) return;
      if (st.player.hand !== 'bomboletta') return;
      const m = cycleMode(st); G.feed(st, `Bomboletta: ${MODE_TXT[m]}${m === 'libero' ? '' : ' — tieni premuto il sinistro sul muro'}.`); e.preventDefault();
    });
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 300); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }

  return { RAIL, yardAt, yardState, wagPose, sidePt, S, STYLES, MODES, CREWS, PAL, RANKS, rankOf, TR, trainAt, carX, carPose, railAt, sidePoint, mode, setMode, cycleMode, wants, tick, release, finish, progress, judge, art, night, morning, initWriters, renameTag, GFX, sceneLevel, grow, recruit, npcWork, styleFor, sketchFor, playerDna, pathPoint, workPoint, _: { track, wagMesh, yardFrame, yardPaint, railFit, addWork, overlapCheck, nightSpot, livery, washSide, trainTarget } };
})();
if (typeof module !== 'undefined') module.exports = Writing;
