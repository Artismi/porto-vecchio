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
    // [graffiti3] il ventaglio della strada (il disegno in writer_arte.js): il rullo, i verticali sui palazzi, l'estintore, lo stencil,
    // la scritta a pennello, il manifesto, gli adesivi, il murale, il calligraffiti. `over`: si fa sopra a tutto senza crossare nessuno
    rullo: { nome: 'rullo', rank: 3, W: 9, H: 2.4, dur: 45, cans: 0, fame: 22 },
    verticale: { nome: 'verticale', rank: 3, W: 2, H: 7, dur: 50, cans: 3, fame: 24 },
    estintore: { nome: 'tag a estintore', rank: 2, W: 3, H: 4, dur: 6, cans: 0, fame: 10, over: true },
    stencil: { nome: 'stencil', rank: 1, W: 1, H: 1.1, dur: 4, cans: .15, fame: 3, over: true },
    scritta: { nome: 'scritta', rank: 1, W: 4.5, H: .75, dur: 8, cans: .3, fame: 3, over: true },
    manifesto: { nome: 'manifesto', rank: 0, W: 1.2, H: 1.4, dur: 3, cans: 0, fame: 2, over: true },
    adesivi: { nome: 'adesivi', rank: 0, W: .6, H: .5, dur: 2, cans: 0, fame: 1, over: true },
    murale: { nome: 'murale', rank: 3, W: 6.5, H: 4, dur: 90, cans: 5, fame: 28 },
    calli: { nome: 'calligraffiti', rank: 2, W: 4.2, H: 2.2, dur: 20, cans: 1.2, fame: 10 },
  };
  const SMALL = /^(tag|mtag|gotico|estintore|stencil|scritta|manifesto|adesivi)$/;   // [graffiti3] i lavori che vanno sopra a tutto e non contano come crossaggio
  // [graffiti3] l'altezza da terra del centro (metri, da..a) per i lavori che stanno ad altezza d'uomo; decisa dal seme
  const EYE = { adesivi: [.5, 1.6], stencil: [.7, 1.7], manifesto: [.9, 1.8], scritta: [1.0, 2.0], calli: [1.3, 1.6], murale: [2.1, 2.4] };
  const MODES = ['libero', 'tag', 'throw', 'pezzo', 'burner', 'tavoletta'];
  const MODE_TXT = { libero: 'a mano libera', tag: 'tag', throw: 'throw-up', pezzo: 'pezzo', burner: 'burner (sul treno: whole car)', tavoletta: 'tavoletta (trascina sul muro la finestra, poi disegni)' };
  const RANKS = [[0, 'toy'], [25, 'writer'], [120, 'king della zona'], [400, 'king della linea'], [1000, 'all city king']];
  const rankOf = f => RANKS.filter(r => f >= r[0]).pop()[1];
  const ART = { tag: 'una ', mtag: 'una ', scritta: 'una ', estintore: 'una ', stencil: 'uno ', adesivi: 'degli ' };
  const un = k => (ART[k] || 'un ') + STYLES[k].nome;   // una tag, un pezzo, uno stencil, degli adesivi
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
  const PN = typeof Pennelli !== 'undefined' ? Pennelli : (typeof require !== 'undefined' ? (() => { try { return require('./pennelli.js'); } catch (e) { return null; } })() : null);   // [graffiti] i pennelli

  // ---------------- STATO ----------------
  function S(st) {
    if (!st.wr) st.wr = { aka: null, crew: null, fame: 0, works: [], beef: {}, resp: {}, writers: [], mode: 'libero', canUse: 0, mkUse: 0, nextId: 1, night: -1, morning: -1, greeted: {}, train: { sides: {}, runDay: -1 }, offer: null, done: { tag: 0, throw: 0, pezzo: 0, burner: 0, wholecar: 0 } };
    if (!st.wr.__caricato && st.npcs) carica(st, st.wr);   // [graffiti] i tuoi lavori delle partite di prima
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
    // [campagna] la linea in terra finisce dove comincia il mare (il viadotto) o la città (la stazione): non al primo punto bagnato dopo
    // il deposito (con la compressione la linea partiva in mare e la «terra» durava un metro)
    const LR = G.layout().rail || {}, sCity = LR.sCity !== undefined ? LR.sCity : n - 1;
    let landEnd = Math.min(n - 1, sCity); for (let i = Math.ceil(TR.sMine); i < landEnd; i++) if (P[i][3]) { landEnd = i; break; }
    // il ponte in terra: in campagna lo decide il mondo (dove la valle sta sotto il ferro, P[i][4] = 2: il più lungo), altrove il più profondo
    const ponti = []; { let a = -1; for (let i = 0; i <= n; i++) { const b = i < n && P[i][4] === 2; if (b && a < 0) a = i; if (!b && a >= 0) { ponti.push([a, i - 1]); a = -1; } } }
    let best = null; const YD = LR.yards || [];
    if (ponti.length) { const q = ponti.slice().sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0]; best = { s0: q[0], s1: q[1] }; }
    else for (let s = Math.ceil(TR.sMine) + 60; s + 90 < landEnd - 60; s += 5) { if (YD.some(y => s < y.s0 + y.len + 25 && s + 90 > y.s0 - 25)) continue; const g0 = el(P[s][0], P[s][1]), g1 = el(P[s + 90][0], P[s + 90][1]); let m = 0; for (let k = 15; k <= 75; k += 5) m += el(P[s + k][0], P[s + k][1]); m /= 13; const dd = Math.min(g0, g1) - m; if (!best || dd > best.d) best = { s0: s, s1: s + 90, d: dd }; }
    const bridge = best ? [best.s0, best.s1] : [Math.round(landEnd * .45), Math.round(landEnd * .45) + 90];
    // [ordine1] i sottopassi: dove una strada (o un sentiero) incrocia la linea in terra, la linea passa sopra su un impalcato con le spalle,
    // la strada sotto, libera; niente rete né muri sopra la carreggiata
    // [campagna] dove la linea sta in piano (la massicciata della campagna, o un passaggio a livello del mondo) l'incrocio è a raso: pl,
    // niente impalcato; sotto un ponte della campagna la strada passa e basta (ponte: i piloni la lasciano libera)
    const cross = [], pl = [], sotto = [], PLW = ((G.MAP.world && G.MAP.world.railCampagna) || {}).pl || [], SOTW = ((G.MAP.world && G.MAP.world.railCampagna) || {}).sotto || [];   // SOTW: i sottopassi decisi dal mondo (il Lungomare sotto il viadotto)
    G.MAP.roads.forEach(rd => { if (!rd.pts || rd.traccia) return; const RP = rd.pts;
      for (let i = 0; i < RP.length; i++) { const [x, y] = RP[i];
        for (let k = Math.ceil(TR.sMine) + 2; k < landEnd - 2; k += 1) { const q = P[k]; if (Math.abs(q[0] - x) > 2 || Math.abs(q[1] - y) > 2 || hyp(q[0] - x, q[1] - y) > 1.2) continue;
          if (cross.some(c => Math.abs(c.s - k) < 12)) break;
          const a = RP[Math.max(0, i - 2)], b = RP[Math.min(RP.length - 1, i + 2)], ra = Math.atan2(b[1] - a[1], b[0] - a[0]), la = Math.atan2(P[k + 2][1] - P[k - 2][1], P[k + 2][0] - P[k - 2][0]);
          const sn = Math.max(.45, Math.abs(Math.sin(ra - la))), hw = (rd.w / 2 + (rd.kind === 'sterrato' && rd.w < 2.8 ? 1.2 : 2.2)) / sn;
          const c = { s: k, hw, road: rd.id, w: rd.w, foot: rd.kind === 'sterrato' && rd.w < 2.8, x, y };
          if (P[k][4] === 2 || SOTW.some(q => hyp(q.x - x, q.y - y) < 12)) sotto.push(c); else if (P[k][4] === 1 || PLW.some(q => q.pz && hyp(q.x - x, q.y - y) < 9) || ((G.MAP.world && G.MAP.world.pezzi) || []).some(p => p.tipo === 'passaggio_livello' && hyp(p.x - x, p.y - y) < 16)) { c.pl = true; pl.push(c); } else cross.push(c); break; } } });
    // [campagna] anche dove la linea taglia una strada fra un vertice e l'altro: i passaggi a livello del mondo
    PLW.forEach(q => { if (!q.pz || pl.some(c => hyp(c.x - q.x, c.y - q.y) < 9)) return; let bk = -1, bd = 6; for (let k = 2; k < n - 2; k++) { const d = hyp(P[k][0] - q.x, P[k][1] - q.y); if (d < bd) { bd = d; bk = k; } } if (bk >= 0) pl.push({ s: bk, hw: 6 / Math.max(.45, q.ang || 1), road: q.road, w: 8, foot: false, x: q.x, y: q.y, pl: true }); });
    const inCross = (s, pad) => cross.some(c => Math.abs(s - c.s) < c.hw + (pad || 0));
    const inPL = (s, pad) => pl.some(c => Math.abs(s - c.s) < c.hw + (pad || 0));
    const onBridge = s => (s > bridge[0] - 2 && s < bridge[1] + 2) || ponti.some(q => s > q[0] - 2 && s < q[1] + 2) || inCross(s, 3) || inPL(s, 3);
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
    // [writer] GLI SPOT LUNGO LA LINEA: la stazione abbandonata (il fabbricato, la banchina, la pensilina), due case cantoniere,
    // sotto il ponte (i piloni e le spalle); su terreno libero e quasi piano, lontano da scali, ponte, varchi e muri
    const spots = { station: null, cant: [] };
    { const angAt = s => { const a = P[Math.max(0, s - 2)], b = P[Math.min(n - 1, s + 2)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
      const ptAt = (s, side, off, u) => { const an = angAt(s), c = Math.cos(an), sn = Math.sin(an), q = P[s]; return { x: q[0] + c * u - sn * off * side, y: q[1] + sn * u + c * off * side }; };
      const busy = (s, side) => s < TR.sMine + 30 || s > landEnd - 30 || onBridge(s - 12) || onBridge(s + 12) || yards.some(y => y.side === side && s > y.s0 - 22 && s < y.s0 + y.len + 22) || walls.some(w => w.side === side && s > w.s - 16 && s < w.s + w.len + 16);   // lo scalo e il muro occupano solo il loro lato; [campagna] dal ponte bastano 12 m (fra i due ponti della campagna sta la stazione abbandonata)
      const T0 = G.T, freeT = (x, y) => { const tx = Math.floor(x / G.TS), ty = Math.floor(y / G.TS); if (tx < 1 || ty < 1 || tx >= G.GW - 1 || ty >= G.GH - 1 || (G.bIndex && G.bIndex[ty * G.GW + tx] >= 0)) return false; const v = G.tileAt(tx, ty); return v !== T0.BLD && v !== T0.WATER && v !== T0.CLIFF && v !== T0.FOUNT && v !== T0.VIA; };   // gli alberi si tagliano (la stazione è nel bosco), la roccia no
      const fits = (s, side, o0, o1, hl, tol) => { let lo = 1e9, hi = -1e9; for (let u = -hl - 3; u <= hl + 3; u += 1) for (let o = o0; o <= o1 + 3.5; o += 1) {   /* [ordine1] col margine: la stazione non si incastra più in una casa */ const q = ptAt(s, side, o, u); if (!freeT(q.x, q.y)) return false; const e = el(q.x, q.y); lo = Math.min(lo, e); hi = Math.max(hi, e); } return hi - lo < (tol || 3.2); };
      const find = (frac, o0, o1, hl, away, gap, tol) => { for (let d = 0; d < landEnd * .45; d += 3) for (const sg of [1, -1]) { const s = Math.round(landEnd * frac + d * sg); if (away.some(a => Math.abs(a - s) < (gap || 60))) continue; for (const side of [1, -1]) if (!busy(s, side) && fits(s, side, o0, o1, hl, tol)) return { s, side }; } return null; };
      spots.station = find(.34, 6, 12.5, 6.5, []);   // il fabbricato da 6 a 12 m dall'asse, la banchina davanti
      [.6, .82].forEach(f => { const aw = [spots.station ? spots.station.s : -999].concat(spots.cant.map(c => c.s)), c = find(f, 6.5, 13.5, 4.5, aw) || find(f, 7.5, 14.5, 4.5, aw, 40, 4.4); if (c) spots.cant.push(c); });   // [campagna] la linea in terra è corta: se non c'è posto, un poco più in là e su un terreno meno piano (la casa ha lo zoccolo)
      const clear = (S, o0, o1, hl) => { for (let u = -hl; u <= hl; u += .5) for (let o = o0; o <= o1; o += .5) { const q = ptAt(S.s, S.side, o, u), tx = Math.floor(q.x / G.TS), ty = Math.floor(q.y / G.TS); if (G.tileAt(tx, ty) === T0.TREE) G.setTile(tx, ty, T0.DIRT); } };   // la radura attorno
      const block = (S, o0, o1, hl) => { for (let u = -hl; u <= hl; u += .5) for (let o = o0; o <= o1; o += .5) { const q = ptAt(S.s, S.side, o, u); G.setTile(Math.floor(q.x / G.TS), Math.floor(q.y / G.TS), G.T.BLD); } };   // i muri veri: non ci si passa attraverso
      spots.apply = () => { if (spots.station) { clear(spots.station, 2.4, 15, 21); block(spots.station, 6.9, 11.1, 5.1); } spots.cant.forEach(c => { clear(c, 4, 16, 7); block(c, 7.9, 12.1, 2.6); }); };   // le caselle: la radura, i muri (si rimettono a ogni partita nuova: create ripristina la mappa)
      spots.apply();
      if (spots.station) for (let k = fences.length - 1; k >= 0; k--) if (Math.abs(fences[k].s - spots.station.s) < 24) fences.splice(k, 1); }   // davanti alla stazione la rete non c'è più
    return { ok: true, landEnd, bridge, ponti, onBridge, yards, fences, gaps, walls, OFF, spots, cross, inCross, pl, inPL, sotto };
  })();
  if (RAIL.ok && RAIL.spots.apply && G.create && !G.create.__spots) { const c0 = G.create; G.create = function () { const st = c0.apply(this, arguments); try { RAIL.spots.apply(); } catch (e) { } return st; }; G.create.__spots = true; }   // [writer] dopo ogni partita nuova, le caselle degli spot
  // [writer] GLI SPOT LUNGO LA LINEA: le piante (per la grafica) e i siti (dove si mette chi dipinge, verso dove guarda)
  // blds: la stazione abbandonata e le case cantoniere (s, lato, da o0 a o1 metri dall'asse, da u0 a u1 lungo la linea);
  // sotto il ponte: i piloni e le due spalle; lungo i binari: gli armadietti. Una funzione sola: grafica e writer d'accordo.
  function spotPlan() {
    if (spotPlan.v) return spotPlan.v; const out = { blds: [], piers: [], abut: [], sites: [] }; spotPlan.v = out; if (!RAIL.ok) return out;
    const P = TR.P, Sp = RAIL.spots, [b0, b1] = RAIL.bridge;
    const tAt = s => { const a = P[Math.max(0, s - 2)], b = P[Math.min(P.length - 1, s + 2)], an = Math.atan2(b[1] - a[1], b[0] - a[0]); return [Math.cos(an), Math.sin(an)]; };
    const at = (s, side, off, u) => { const [c, sn] = tAt(Math.round(s)), q = P[Math.round(s)]; return { x: q[0] + c * u - sn * off * side, y: q[1] + sn * u + c * off * side }; };
    const site = (q, fx, fy, kind, len, name) => { if (!G.walkT(Math.floor(q.x / G.TS), Math.floor(q.y / G.TS))) return; const face = Math.atan2(fy, fx); out.sites.push({ x: q.x, y: q.y, face, kind, len, name, out: [-Math.cos(face), -Math.sin(face)], along: [Math.sin(face), -Math.cos(face)] }); };
    const boxSites = (B, kindL, kindS, name) => { const [c, sn] = tAt(B.s), nx = -sn * B.side, ny = c * B.side, L = B.u1 - B.u0, D = B.o1 - B.o0;
      for (let u = B.u0 + 2.5; u <= B.u1 - 2.4; u += 5) { site(at(B.s, B.side, B.o0 - 1.2, u), nx, ny, L >= 10 ? kindL : kindS, Math.min(L, 6), name); site(at(B.s, B.side, B.o1 + 1.2, u), -nx, -ny, L >= 10 ? kindL : kindS, Math.min(L, 6), name); }   // le facciate lunghe: davanti (verso i binari) e dietro
      [[B.u0 - 1.2, c, sn], [B.u1 + 1.2, -c, -sn]].forEach(([u, fx, fy]) => site(at(B.s, B.side, (B.o0 + B.o1) / 2, u), fx, fy, kindS, D, name)); };   // i fianchi
    if (Sp.station) { const B = Object.assign({ kind: 'stazione', o0: 6.3, o1: 11.7, u0: -5.7, u1: 5.7, H: 7.2 }, Sp.station); out.blds.push(B); boxSites(B, 'hall', 'strada', 'alla stazione abbandonata'); }
    Sp.cant.forEach(cn => { const B = Object.assign({ kind: 'cantoniera', o0: 7.3, o1: 12.7, u0: -3.2, u1: 3.2, H: 6.6 }, cn); out.blds.push(B); boxSites(B, 'strada', 'strada', 'alla casa cantoniera'); });
    // sotto il ponte: i piloni ogni 12 m (sottili lungo la linea, larghi 3,2 di traverso) e le spalle alle due teste
    for (let s = 6; s < P.length - 6; s += 12) { if (s < b0 + 4 || s > b1 - 4 || P[s][3]) continue; const q = at(s, 1, 0, 0), [c, sn] = tAt(s); out.piers.push({ s }); site({ x: q.x - c * 1.5, y: q.y - sn * 1.5 }, c, sn, 'strada', 3.2, 'sotto il ponte'); site({ x: q.x + c * 1.5, y: q.y + sn * 1.5 }, -c, -sn, 'strada', 3.2, 'sotto il ponte'); }
    [[b0 + 1.5, 1], [b1 - 1.5, -1]].forEach(([s, dir]) => { const si = Math.round(s), q = at(si, 1, 0, 0), [c, sn] = tAt(si); out.abut.push({ s: si, dir }); site({ x: q.x + c * dir * 2, y: q.y + sn * dir * 2 }, -c * dir, -sn * dir, 'hall', 5.6, 'sotto il ponte'); });   // la spalla: il muro di cemento sotto la testa del ponte
    // lungo i binari: gli armadietti grigi (le tag, i throw-up)
    for (let s = 90, k = 0; s < P.length - 30; s += 170, k++) { const sd = k % 2 ? 1 : -1; if (RAIL.onBridge(s) || P[s][3]) continue; const [c, sn] = tAt(s + 4); site(at(s + 4, sd, 4.6, 0), sn * sd, -c * sd, 'strada', 1.1, 'lungo i binari'); }
    return out;
  }
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
    if (style === 'mtag' && rnd() < .3) { w.sticker = true; w.sign = null; }   // [graffiti] l'adesivo con la tag (pennelli.js)
    else if (style === 'burner' && wr.crew && rnd() < .25) w.words = wr.crew;
    // [graffiti3] gli stili nuovi: la scritta di chi è politico parla di politica, gli altri d'amore o di strada; lo stencil di un
    // writer è sempre lo stesso (la sua mascherina, ripetuta per la città); il rullo e il verticale dicono la crew o una parola
    else if (style === 'scritta') { const pol = (dna && dna.pol != null) ? dna.pol : .4; w.kind = rnd() < pol ? 'politica' : pick(['amore', 'ultras', 'strada', 'amore']); if (w.kind === 'strada' && wr.crew) w.words = pick([wr.crew + ' IN CASA', 'ZONA ' + wr.crew, wr.crew + ' ' + wr.aka]); }
    else if (style === 'stencil') { w.motifSeed = (wr.hand || seed) ^ 0x5a5a; }
    else if (style === 'rullo' || style === 'verticale') { if (rnd() < .4 && wr.crew) w.words = wr.crew; else if (rnd() < .2) w.words = pick(WA.WORDS); }
    else if (style === 'murale' && rnd() < .3) w.words = pick(WA.SLOGANS);
    return Object.assign(w, extra || {});
  }
  function addWork(st, w) {
    const W = S(st); w.id = W.nextId++; w.t0 = w.t0 || st.t; W.works.push(w); if (w.by === 'player') W.__dirty = true;
    if (W.works.length > 3500) {   // [ordine1] più spazio: la città parte già piena di storia ([atlante] 3500: le tag delle vie)
  let i = W.works.findIndex(o => o.erased && o.by !== 'player'); if (i < 0) i = W.works.findIndex(o => o.by !== 'player' && o.done); if (i >= 0) W.works.splice(i, 1); }
    return w;
  }
  // la notte dei writer: tag, throw-up, pezzi sui muri della città; a volte il treno in deposito; i crossaggi per i beef
  function night(st) {
    const W = S(st), d = dayIdx(st.t);
    if (W.night === d) return; W.night = d; let made = 0;
    W.writers.forEach(id => {
      const n = G.byId(st, id); if (!n || n.dead || n.jailedUntil > st.t || rnd() > (typeof WriterVita !== 'undefined' ? .35 : .7)) return; const wr = writerOf(st, n); if (!wr) return;
      if (n.pop.emer && n.pop.emer.kind === 'writer') return;   // è già fuori a dipingere (writer_vita.js)
      const r = rnd() + wr.skill * .12, sp = nightSpot(st); if (!sp) return;
      const style = r < .5 ? 'tag' : r < .8 ? (sp.h != null && rnd() < .5 ? 'rullo' : 'throw') : r < .97 ? 'pezzo' : 'burner';   // [graffiti] in alto, a volte, il roller
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
    // [graffiti2] i tuoi: sui muri del regime la squadra passa subito, quelli visti da un agente quasi sempre; e lo vieni a sapere
    const gone = W.works.filter(w => w.by === 'player' && w.surf === 'muro' && w.done && !w.erased && d > dayIdx(w.tDone || w.t0) && (w.regime ? rnd() < .85 : w.copSeen && rnd() < .5));
    gone.forEach(w => { w.erased = true; w.buffed = true; }); if (gone.length) W.__dirty = true;
    const lost = W.works.filter(w => w.by === 'player' && w.buffed && !w.buffTold); lost.forEach(w => { w.buffTold = true; });
    if (lost.length) G.feed(st, `La squadra del Garante ha cancellato ${lost.length > 1 ? lost.length + ' lavori tuoi' : 'il tuo ' + STYLES[lost[0].style].nome + (lost[0].place ? ' ' + lost[0].place : '')}: vernice grigia sopra.`, 'info');
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
    const W = S(st), p = st.player; w.done = true; w.prog = 1; w.tDone = st.t; if (w.by === 'player') W.__dirty = true;
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
    if (w.by === 'player') { try { cityReact(st, w); } catch (e) { if (typeof console !== 'undefined') console.warn('[Writing] reazioni', e); } }
  }
  // [graffiti2] LA CITTÀ REAGISCE a un lavoro tuo: chi ti ha visto (i nomi), i writer che approvano, la gente che si lamenta o
  // chiama i Grigi, l'agente che ti vede (vandalismo: ti cerca); sui muri del regime il lavoro si cancella la mattina dopo.
  const REGIME = ['governo', 'ministero', 'garante', 'archivio', 'commissariato', 'rocca', 'caserma_p', 'piazza_gov', 'chiesa', 'santuario', 'cultura'];
  const isCop = n => !!(n.cop || /agente|poliz|guardia|tutela|soldat|carabin|commissar/i.test(n.role || ''));
  function cityReact(st, w) {
    const W = S(st), p = st.player, q = w.pos ? { x: w.pos.x, y: w.pos.z } : { x: p.x, y: p.y }, P = G.PLACES || {};
    const eyes = (st.npcs || []).filter(n => !n.dead && !n.inside && hyp(n.x - p.x, n.y - p.y) < 24 && (!G.seesPlayer || G.seesPlayer(st, n)));
    const cops = eyes.filter(isCop), crew = eyes.filter(n => !isCop(n) && n.pop && (n.pop.writer || n.pop.toy)), folk = eyes.filter(n => !isCop(n) && !crew.includes(n));
    w.seen = eyes.length; w.regime = REGIME.some(id => P[id] && hyp(P[id].x - q.x, P[id].y - q.y) < 30);
    const nm = n => n.name || n.first || 'qualcuno', say = (n, t) => { try { G.say(st, n, t, 3.5); } catch (e) { } };
    if (cops.length) {
      W.heat = (W.heat || 0) + 5; w.copSeen = true;
      say(cops[0], pick(['Ehi tu! Fermo lì!', 'Alt! Giù quella bomboletta!', 'Cosa stai scrivendo? Documenti!']));
      G.feed(st, `${nm(cops[0])} ti ha visto dipingere: i Grigi ti cercano. Allontanati.`, 'bad');
      try { G.emit(st, 'vandalismo', { x: q.x, y: q.y, place: w.place }); } catch (e) { }
    } else if (eyes.length) {
      const names = eyes.slice(0, 3).map(nm).join(', ') + (eyes.length > 3 ? ` e altri ${eyes.length - 3}` : '');
      G.feed(st, `Ti hanno visto dipingere: ${names}.`, 'info');
    } else G.feed(st, 'Nessuno ti ha visto: il muro parla da solo.', 'good');
    if (crew.length) { const n = crew[0], wr = n.pop.writer || n.pop.toy; say(n, pick([`Bomba, ${playerAka(st)}!`, 'Questo resta. Rispetto.', `Bello! ${wr && wr.aka ? 'Firmato ' + wr.aka + '.' : ''}`.trim()])); W.fame += crew.length; }
    if (folk.length) { const n = pick(folk), angry = rnd() < (w.regime ? .7 : .45);
      say(n, angry ? pick(['Vergogna! Sporcate tutto.', 'Adesso chiamo i Grigi.', 'Ma chi ti ha insegnato l\'educazione?']) : pick(['Finalmente un po\' di colore.', 'Però, non è male.', 'Che cosa vuol dire?']));
      if (angry && !cops.length && rnd() < .35) { W.heat = (W.heat || 0) + 2; G.feed(st, `${nm(n)} va a chiamare i Grigi.`, 'bad'); try { G.emit(st, 'vandalismo', { x: q.x, y: q.y, place: w.place }); } catch (e) { } } }
    if (w.regime) G.feed(st, 'È un muro del regime: domattina passano a cancellarlo.', 'info');
    return { eyes: eyes.length, cops: cops.length, crew: crew.length };
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
  const mulberry = WA.mulberry, art = w => (PN ? PN.art(w) : WA.art(w)), crossOut = WA.crossOut, PPM = WA.PPM;

  // =====================================================================================================================
  // LA GRAFICA: veli sui muri, il treno, la galleria
  // =====================================================================================================================
  const GFX = { works: {}, st: null, rc: null, train: null, track: null, base: {}, mem: { veli: 0, nuove: 0, riuso: 0 } };
  const T3 = () => window.THREE;
  const R_ = () => window.__pv && window.__pv.R;
  function scene() { const R = R_(); return R && R.__models && R.__models.scene; }
  function canvasTexture(c) { const t = new (T3().CanvasTexture)(c); t.encoding = T3().sRGBEncoding; t.anisotropy = 4; return t; }
  // il piano del muro davanti a un punto: raggio orizzontale verso face (gli NPC) o il colpo del giocatore
  function cands(x, z) { const R = R_(); try { return R.__bmb.bmbCands(x, z).filter(o => !o.userData.velo && !o.userData.wr); } catch (e) { return []; } }
  // [leggera] solo le mesh che il tratto di raggio può toccare: three scarta una mesh se la retta INFINITA non passa per la sua sfera e
  // il limite far lo applica dopo, sui punti trovati; così un raggio di 1,3 m provava triangolo per triangolo ogni mesh sulla sua
  // linea fino a 25 m (in `wallRect`, 27 raggi per lavoro, era il primo peso del processore sulla Vittoria). Un punto a distanza ≤ far
  // sta nel tratto e nella sfera della sua mesh: chi resta fuori non poteva dare un punto, il risultato è lo stesso.
  function segList(o, d, far, list) {
    const THREE = T3(), out = GFX.seg || (GFX.seg = []), S = GFX.sph || (GFX.sph = new THREE.Sphere()); out.length = 0;
    for (const m of list) {
      const g = m.geometry; if (!g || (m.userData && typeof m.userData.lazy1 === 'function')) { out.push(m); continue; }   // il pezzo che si rifà prima del raggio: com'era
      if (!g.boundingSphere) g.computeBoundingSphere(); S.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
      const cx = S.center.x - o.x, cy = S.center.y - o.y, cz = S.center.z - o.z, t = Math.max(0, Math.min(far, cx * d.x + cy * d.y + cz * d.z));
      const ex = cx - d.x * t, ey = cy - d.y * t, ez = cz - d.z * t; if (ex * ex + ey * ey + ez * ez <= S.radius * S.radius * 1.0001 + 1e-6) out.push(m);
    }
    return out;
  }
  function rayWall(o, d, far, list) {
    const THREE = T3(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.set(o, d); rc.far = far; rc.near = 0;
    const h = rc.intersectObjects(segList(o, rc.ray.direction, far, list), false).find(h => { if (!h.face) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); });
    if (!h) return null; const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(d) > 0) n.negate(); return { p: h.point.clone(), n, obj: h.object };
  }
  // [graffiti] L'ADERENZA. Prima i lavori galleggiavano: il muro si cercava con un raggio a 1,4 m da terra e poi il lavoro si
  // spostava alla sua altezza senza guardare se lì il muro c'era ancora (zoccolo, portico arretrato, insegna, facciata a gradoni),
  // la prova del riquadro accettava 28 cm di scarto dal piano e una normale girata di 36°, il velo stava a 1,4 cm (più 4 mm a
  // strato: con tre lavori sotto, oltre 2 cm), e niente guardava le finestre e le porte. Adesso:
  //  - il piano si misura all'altezza del lavoro (il raggio dal davanti, alla quota giusta);
  //  - una griglia di raggi (ogni ~40 cm, e i bordi esatti) dice dove sotto c'è lo stesso piano entro 1,5 cm con la stessa
  //    normale (cos > .97), sopra la terra al piede del muro, fuori dalle aperture vere della facciata (R.aperture: finestre,
  //    porte, vetrine, la fascia dell'insegna); il lavoro prende il rettangolo più grande tutto buono (mai oltre uno spigolo,
  //    mai sopra un'apertura), e i suoi bordi si verificano punto per punto;
  //  - il velo sta a 3 mm dal muro (più 1 mm a strato, al massimo 7) e il resto lo fa il polygonOffset.
  const GAP = .003, TOL = .015;
  function nearList(list, c, rad) {   // solo le mesh che possono stare sotto il riquadro (la griglia fa decine di raggi)
    const THREE = T3(), S = GFX.sph2 || (GFX.sph2 = new THREE.Sphere()), out = [];
    for (const m of list) { const g = m.geometry; if (!g || (m.userData && typeof m.userData.lazy1 === 'function')) { out.push(m); continue; } if (!g.boundingSphere) g.computeBoundingSphere(); S.copy(g.boundingSphere).applyMatrix4(m.matrixWorld); if (S.center.distanceTo(c) <= S.radius + rad) out.push(m); }
    return out;
  }
  // [scatti] SOLO LE MESH CHE HANNO DAVVERO UN TRIANGOLO NEL RIQUADRO. La griglia di fitWall fa 50-130 raggi corti, tutti dentro una scatola
  // attorno al riquadro; nearList tiene chi ha la SFERA vicina, e le mesh fuse e sottili della città (le vie vive, le statiche fuse: 100-200
  // triangoli sparsi su 200 m) hanno sfere di 50-200 m: restavano ~150 mesh provate a ogni raggio, 100-500 ms in un fotogramma solo (lo
  // scatto vicino ai muri dipinti). Qui una volta per riquadro: si tiene la mesh se almeno un triangolo tocca la scatola (con l'indice dei
  // raggi, three-mesh-bvh, se c'è e torna; se no triangolo per triangolo, nello spazio della mesh). Un raggio dentro la scatola può colpire
  // solo quei triangoli: stessi punti, stesso primo colpo, stesso risultato.
  function nearTris(list, c, E) {
    const THREE = T3(), out = [], B = GFX.ntB || (GFX.ntB = new THREE.Box3()), Bl = GFX.ntBl || (GFX.ntBl = new THREE.Box3()), M = GFX.ntM || (GFX.ntM = new THREE.Matrix4());
    B.min.set(c.x - E, c.y - E, c.z - E); B.max.set(c.x + E, c.y + E, c.z + E);
    for (const m of list) {
      const g = m.geometry, pa = g && g.attributes && g.attributes.position;
      if (!pa || (m.userData && typeof m.userData.lazy1 === 'function') || m.isInstancedMesh || m.isSkinnedMesh || (g.morphAttributes && g.morphAttributes.position)) { out.push(m); continue; }
      M.copy(m.matrixWorld).invert();
      const bt = g.boundsTree, vv = pa.version * 4194304 + (g.index ? g.index.version + 2 : 1);   // l'indice vale se la geometria non è cambiata da quando è fatto (lo stesso numero di render.js, raggi veloci)
      // [momenti] cambiata (una cosa calciata via dalla mesh fusa, il pulitore): stessi triangoli in posti nuovi, l'indice si riadatta come
      // fanno i raggi veloci di render.js. Prima si provava triangolo per triangolo tutta la mesh fusa (decine di migliaia, centinaia di MB di numeri)
      if (bt && g.__bvhVer !== vv && g.index && g.index.version === g.__bvhIdx && g.index.count === g.__bvhN) { try { bt.refit(); g.__bvhVer = vv; } catch (e) { } }
      // [momenti] una mesh grande senza indice: lo si fa qui (lo stesso dei raggi veloci di render.js, che poi lo usano anche loro), invece di
      // provare ogni triangolo a ogni riquadro; correndo verso muri dipinti nuovi era il grosso della spazzatura e degli scatti
      let bt2 = bt; const nT = g.index ? g.index.count : pa.count, dr = g.drawRange;
      if (!bt2 && nT >= 2700 && !g.__bvhNo && !(g.boundingBox && !g.boundingBox.intersectsBox(Bl.copy(B).applyMatrix4(M))) && !pa.isInterleavedBufferAttribute && !(dr.start > 0) && !(dr.count !== Infinity && dr.count < nT) && typeof MeshBVHLib !== 'undefined') {
        try { bt2 = g.boundsTree = new MeshBVHLib.MeshBVH(g); g.__bvhVer = vv; g.__bvhIdx = g.index ? g.index.version : -1; g.__bvhN = g.index ? g.index.count : 0; } catch (e) { bt2 = null; } }
      if (bt2 && g.__bvhVer === vv) { const bt = bt2; try { if (bt.intersectsBox(B, M)) out.push(m); continue; } catch (e) { out.push(m); continue; } }
      Bl.copy(B).applyMatrix4(M);   // la scatola nello spazio della mesh (più larga, mai più stretta)
      const x0 = Bl.min.x - 1e-4, y0 = Bl.min.y - 1e-4, z0 = Bl.min.z - 1e-4, x1 = Bl.max.x + 1e-4, y1 = Bl.max.y + 1e-4, z1 = Bl.max.z + 1e-4;
      if (g.boundingBox && !g.boundingBox.intersectsBox(Bl)) continue;
      const ix = g.index, n = ix ? ix.count : pa.count; let hit = false;
      for (let t = 0; t + 2 < n && !hit; t += 3) {
        const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, d = ix ? ix.getX(t + 2) : t + 2;
        const ax = pa.getX(a), bx = pa.getX(b), dx = pa.getX(d); if ((ax < x0 && bx < x0 && dx < x0) || (ax > x1 && bx > x1 && dx > x1)) continue;
        const az = pa.getZ(a), bz = pa.getZ(b), dz = pa.getZ(d); if ((az < z0 && bz < z0 && dz < z0) || (az > z1 && bz > z1 && dz > z1)) continue;
        const ay = pa.getY(a), by = pa.getY(b), dy = pa.getY(d); if ((ay < y0 && by < y0 && dy < y0) || (ay > y1 && by > y1 && dy > y1)) continue;
        hit = true; }
      if (hit) out.push(m);
    }
    return out;
  }
  // le aperture della facciata vicino a c (render.js R.aperture), quelle col fronte come n
  function openingsAt(c, n) { const R = R_(); let L = []; try { L = R && R.aperture ? R.aperture(c.x, c.z, 9) : []; } catch (e) { L = []; } return L.filter(a => a.nx * n.x + a.nz * n.z > .85 && Math.abs((c.x - a.x) * a.nx + (c.z - a.z) * a.nz) < .8); }
  const inOpening = (O, x, y, z) => O.some(a => { const du = (x - a.x) * a.ux + (z - a.z) * a.uz; return Math.abs(du) < a.hw + .04 && y > a.y0 - .04 && y < a.y1 + .04; });
  // un punto del piano (c, n) è muro? il raggio dal davanti torna sul piano entro TOL, con la stessa normale
  function onPlane(q, n, list, O, foot) {
    if (foot != null && q.y < foot + .05) return false;
    if (O && O.length && inOpening(O, q.x, q.y, q.z)) return false;
    const THREE = T3(), o = (GFX._o || (GFX._o = new THREE.Vector3())).copy(q).addScaledVector(n, .5), d = (GFX._d || (GFX._d = new THREE.Vector3())).copy(n).negate();
    const hit = rayWall(o, d, .5 + .35, list); if (!hit) return false;
    return Math.abs(hit.p.distanceTo(o) - .5) <= TOL && hit.n.x * n.x + hit.n.y * n.y + hit.n.z * n.z > .97;
  }
  // IL RIQUADRO SUL MURO: c un punto del piano (alla quota voluta), n la normale orizzontale, W × H la misura voluta.
  // Ritorna { c, r, W, H } (c il centro nuovo, sul piano) o null se non c'è un pezzo di muro almeno minK della misura
  // [audit] A DOSI: fitWall e placeWall sono generatori (fitWallG, placeWallG) che si fermano ogni sei raggi; scanNear li porta avanti nel
  // tempo del fotogramma e li riprende al fotogramma dopo. Stessi raggi, stesso ordine, stesso risultato: solo spezzato. Prima un lavoro
  // si piazzava tutto in un colpo (50-210 raggi: 20-60 ms su un telefono, più la spazzatura dei colpi) e il tetto di 1 ms a fotogramma si
  // guardava solo fra un lavoro e l'altro: camminando verso muri dipinti era la prima voce del processore (banco_audit.js, giro a piedi)
  const finisci = it => { let r; while (!(r = it.next()).done); return r.value; };
  function fitWall(c, n, W, H, list, opt) { return finisci(fitWallG(c, n, W, H, list, opt)); }
  function* fitWallG(c, n, W, H, list, opt) {
    const THREE = T3(), r = new THREE.Vector3(n.z, 0, -n.x).normalize(), o2 = opt || {}, minK = o2.minK != null ? o2.minK : .45;
    const L = nearTris(nearList(list, c, Math.hypot(W, H) / 2 + 1.2), c, Math.hypot(W, H) * .625 + .6), O = o2.noOpen ? [] : openingsAt(c, n), foot = o2.foot;   // [scatti] la scatola contiene ogni raggio della griglia, dei bordi e della prova finale
    const NX = clamp(Math.round(W / Math.min(.4, W / 4)) + 1, 5, 14), NY = clamp(Math.round(H / Math.min(.4, H / 4)) + 1, 5, 9), us = [], vs = [];
    for (let i = 0; i < NX; i++) us.push((i / (NX - 1) - .5) * W); for (let j = 0; j < NY; j++) vs.push((j / (NY - 1) - .5) * H);
    const P = (u, v) => new THREE.Vector3(c.x + r.x * u, c.y + v, c.z + r.z * u), ok = new Uint8Array(NX * NY);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { ok[j * NX + i] = onPlane(P(us[i], vs[j]), n, L, O, foot) ? 1 : 0; if ((j * NX + i) % 6 === 5) yield; }
    // il rettangolo più grande di punti tutti buoni (somme prefisse); a parità, il più vicino al centro voluto
    const S0 = new Int32Array((NX + 1) * (NY + 1)); for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) S0[(j + 1) * (NX + 1) + i + 1] = ok[j * NX + i] + S0[j * (NX + 1) + i + 1] + S0[(j + 1) * (NX + 1) + i] - S0[j * (NX + 1) + i];
    const sum = (i0, j0, i1, j1) => S0[(j1 + 1) * (NX + 1) + i1 + 1] - S0[j0 * (NX + 1) + i1 + 1] - S0[(j1 + 1) * (NX + 1) + i0] + S0[j0 * (NX + 1) + i0];
    let best = null;
    for (let i0 = 0; i0 < NX; i0++) for (let i1 = i0 + 1; i1 < NX; i1++) for (let j0 = 0; j0 < NY; j0++) for (let j1 = j0 + 1; j1 < NY; j1++) {
      if (sum(i0, j0, i1, j1) !== (i1 - i0 + 1) * (j1 - j0 + 1)) continue;
      const w = us[i1] - us[i0], h = vs[j1] - vs[j0], ar = Math.min(w, W) * Math.min(h, H) - Math.hypot((us[i0] + us[i1]) / 2, (vs[j0] + vs[j1]) / 2) * .01;   // quanto del lavoro ci sta, poi la vicinanza al punto voluto
      if (!best || ar > best.ar) best = { ar, i0, i1, j0, j1 };
    }
    if (!best) return null;
    let u0 = us[best.i0], u1 = us[best.i1], v0 = vs[best.j0], v1 = vs[best.j1];
    // i bordi: mezzo passo più in là, se anche lì è tutto muro (la griglia è rada)
    const colOk = u => vs.filter(v => v >= v0 - 1e-6 && v <= v1 + 1e-6).every(v => onPlane(P(u, v), n, L, O, foot)), rowOk = v => us.filter(u => u >= u0 - 1e-6 && u <= u1 + 1e-6).every(u => onPlane(P(u, v), n, L, O, foot));
    const su = W / (NX - 1) / 2, sv = H / (NY - 1) / 2;
    yield; if (best.i0 > 0 && colOk(u0 - su)) u0 -= su; if (best.i1 < NX - 1 && colOk(u1 + su)) u1 += su;
    if (best.j0 > 0 && rowOk(v0 - sv)) v0 -= sv; if (best.j1 < NY - 1 && rowOk(v1 + sv)) v1 += sv;
    // le proporzioni: un lavoro non si stira; si tiene la misura voluta dentro il buono, centrata dove c'è più muro
    let w = Math.min(u1 - u0, W), h = Math.min(v1 - v0, H); if (Math.min(w / W, h / H) < minK) return null;
    if (!o2.free) { const kw = w / W, kh = h / H; if (kw > kh * 1.6) w = W * kh * 1.6; else if (kh > kw * 1.6) h = H * kw * 1.6; }   // non si stira oltre 1,6
    const cu = clamp(0, u0 + w / 2, u1 - w / 2), cvv = clamp(0, v0 + h / 2, v1 - h / 2);
    let out = { c: P(cu, cvv), r, W: w, H: h };
    // la prova finale: i bordi e il dentro punto per punto (5 × 4, come la sonda); se qualcosa non torna si stringe
    for (let t = 0; t < 4; t++) { yield; if (rectOnWall(out.c, n, r, out.W, out.H, L, O, foot)) return out; out = { c: out.c, r, W: out.W * .88, H: out.H * .88 }; if (Math.min(out.W / W, out.H / H) < minK) return null; }
    return null;
  }
  function rectOnWall(c, n, r, W, H, list, O, foot) {
    const THREE = T3(); for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const u = (i / 4 - .5) * W, v = (j / 3 - .5) * H; if (!onPlane(new THREE.Vector3(c.x + r.x * u, c.y + v, c.z + r.z * u), n, list, O, foot)) return false; }
    return true;
  }
  // il vecchio nome (il giocatore e la tavoletta): il riquadro W × H attorno a c, tutto muro, o null
  function wallRect(c, n, W, H, list, opt) { const f = fitWall(c, n, W, H, list, opt); if (!f) return null; c.copy(f.c); return { W: f.W, H: f.H, r: f.r }; }
  // la terra al piede del muro sotto il punto (il piano davanti, non dove sta chi dipinge)
  const footAt = (c, n, W, r) => { const R = R_(); let m = -1e9; for (const s of [-.5, 0, .5]) { const x = c.x + (r ? r.x * s * W : 0) + n.x * .25, z = c.z + (r ? r.z * s * W : 0) + n.z * .25; try { m = Math.max(m, R.groundH(x, z)); } catch (e) { } } return m > -1e8 ? m : null; };
  // ---------------- [graffiti] LA MEMORIA DEI VELI: tele riusate, un tetto, a metà lato sul telefono ----------------
  // ogni velo ha la sua tela (il disegno del lavoro). Le tele dei veli liberati tornano in una pila per misura e si riusano;
  // sul telefono (LeggeraMem.meta2 = .5, i tagli [dieta]) la tela è a metà lato (T.k): un quarto della memoria. Al massimo
  // VEIL_MAX veli vivi (i più lontani dalla camera si liberano per primi; tornando vicino si rifanno).
  const POOL = new Map(), PHONE_K = () => { try { return typeof LeggeraMem !== 'undefined' && LeggeraMem.meta2 ? LeggeraMem.meta2() : 1; } catch (e) { return 1; } };
  const VEIL_MAX = () => PHONE_K() < 1 ? 70 : 170;
  function poolGet(w, h) { const k = w + 'x' + h, L = POOL.get(k); if (L && L.length) { const c = L.pop(); c.getContext('2d').clearRect(0, 0, w, h); GFX.mem.riuso++; return c; } GFX.mem.nuove++; return cv(w, h); }
  function poolPut(c) { if (!c || !c.width) return; const k = c.width + 'x' + c.height, L = POOL.get(k) || []; if (L.length < 6) { L.push(c); POOL.set(k, L); } }
  // il velo di un lavoro: un piano appoggiato al muro col suo canvas (sulle auto: la decalcomania sulla carrozzeria)
  function makeVeil(w, g) {
    const THREE = T3(), R = w.gfxRect, kq = w.surf === 'treno' ? 1 : PHONE_K(), c = poolGet(Math.max(1, Math.ceil(g.Wp * kq)), Math.max(1, Math.ceil(g.Hp * kq))), tex = canvasTexture(c);
    const layer = Math.min(4, overlapCheck(GFX.st, w).filter(o => o.gfxRect).length);   // [graffiti] una volta sola (prima: la sovrapposizione rifatta per ogni lavoro della città)
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 - layer, polygonOffsetUnits: -4 - layer * 2 });
    const dg = w.surf === 'auto' && R.obj && Math.abs(R.n.y || 0) < .5 ? decalGeo(R.obj, R) : null;   // sul tetto del mezzo resta il velo steso
    const mesh = new THREE.Mesh(dg || new THREE.PlaneGeometry(R.W, R.H), mat); mesh.userData.velo = true; mesh.userData.wr = w.id; mesh.renderOrder = 3 + layer;
    if (dg) { R.obj.add(mesh); mesh.updateMatrixWorld(true); mesh.receiveShadow = true; GFX.mem.veli++; return { mesh, c, ctx: c.getContext('2d'), tex, x0: 0, y0: 0, k: kq, decal: true, layer }; }   // [graffiti] la decalcomania: già nello spazio del mezzo, si muove con lui
    const ny = R.n.y || 0, off = Math.abs(ny) > .5 ? .012 : GAP + layer * .001;; mesh.position.set(R.c.x + R.n.x * off, R.c.y + ny * off, R.c.z + R.n.z * off);   // [graffiti] per terra un filo di più: l'asfalto non è mai piano
    if (Math.abs(ny) > .5) { const up = R.u || new THREE.Vector3().crossVectors(R.n, R.r); mesh.up.set(up.x, up.y, up.z); mesh.lookAt(mesh.position.x, mesh.position.y + ny, mesh.position.z); }   // [writer] per terra, su un tetto: il velo si stende, con l'alto del disegno dove guardavi
    else mesh.lookAt(mesh.position.x + R.n.x, mesh.position.y, mesh.position.z + R.n.z);
    mesh.receiveShadow = true; scene().add(mesh); mesh.updateMatrixWorld(true);
    if (R.obj && R.veh) R.obj.attach(mesh);   // sulle auto il velo segue il mezzo
    GFX.mem.veli++;
    return { mesh, c, ctx: c.getContext('2d'), tex, x0: 0, y0: 0, k: kq, layer };
  }
  // ---------------- [atlante] I LAVORI FINITI IN UNA TELA SOLA ----------------
  // Un velo è un disegno a sé (una mesh, un materiale, una texture): con 150 veli vivi sono 150 disegni trasparenti a fotogramma,
  // e per questo i lavori in giro erano pochi. Un lavoro finito non cambia più: la sua tela va in un atlante (una texture grande,
  // 4096² sul computer, 2048² sul telefono, sulla scheda video) e il suo piano diventa un'istanza di una InstancedMesh sola, che
  // legge il suo riquadro dall'atlante. Tutti i lavori finiti sui muri e per terra costano un disegno. Restano veli i lavori in
  // corso, sui mezzi, sul treno e sui carri (quelli sopra un altro vanno nella seconda InstancedMesh, disegnata dopo). Senza WebGL2 o con ?noatlante: i veli di prima.
  const ATL = { pages: [], pend: [], pc: null, off: typeof location !== 'undefined' && /[?&]noatlante\b/.test(location.search), ok: null, PAD: 3, CAP: 2048 };
  function atlOk() {
    if (ATL.ok !== null) return ATL.ok; const R = R_(), rd = R && R.__models && R.__models.renderer; if (!rd || typeof document === 'undefined') return false;
    return (ATL.ok = !ATL.off && !!rd.capabilities.isWebGL2);
  }
  function atlPage() {
    const THREE = T3(), rd = R_().__models.renderer, S = Math.min(PHONE_K() < 1 ? 2048 : 4096, rd.capabilities.maxTextureSize || 4096);
    const rt = new THREE.WebGLRenderTarget(S, S, { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, encoding: THREE.sRGBEncoding });
    rt.texture.anisotropy = 4;
    const geo = new THREE.PlaneGeometry(1, 1), rect = new THREE.InstancedBufferAttribute(new Float32Array(ATL.CAP * 4), 4); rect.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aRect', rect);
    // due strati: i lavori sul muro nudo e quelli sopra un altro (le tag sui pezzi), disegnati dopo e un filo più avanti
    const z = new THREE.Matrix4().makeScale(0, 0, 0), meshes = [0, 1].map(L => {
      const g = L ? geo.clone() : geo, rc = L ? new THREE.InstancedBufferAttribute(new Float32Array(ATL.CAP * 4), 4) : rect; if (L) { rc.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aRect', rc); }
      const mat = new THREE.MeshLambertMaterial({ map: rt.texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 - L * 2, polygonOffsetUnits: -4 - L * 4 });
      mat.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aRect;').replace('#include <uv_vertex>', '#ifdef USE_UV\n vUv = aRect.xy + uv * aRect.zw;\n#endif'); };
      mat.customProgramCacheKey = () => 'pv-atlante';
      const mesh = new THREE.InstancedMesh(g, mat, ATL.CAP); mesh.count = 0; mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.renderOrder = 3 + L * 2; mesh.userData.velo = true; mesh.userData.atlante = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (let i = 0; i < ATL.CAP; i++) mesh.setMatrixAt(i, z); scene().add(mesh);
      return { mesh, rect: rc, freeI: [], n: 0 }; });
    const P = { S, rt, L: meshes, shelves: [], top: 0, fresh: true }; ATL.pages.push(P); return P;
  }
  // lo scaffale: righe alte a gradini di 16 px; in ogni riga i tratti liberi [x, larghezza]
  function atlAlloc(P, w, h) {
    const pw = w + ATL.PAD * 2, ph = Math.ceil((h + ATL.PAD * 2) / 16) * 16; if (pw > P.S || ph > P.S) return null;
    let best = null;
    for (const s of P.shelves) { if (s.h < ph || s.h > ph * 1.3 + 16) continue; for (let i = 0; i < s.free.length; i++) { const f = s.free[i]; if (f[1] >= pw && (!best || s.h < best.s.h || (s.h === best.s.h && f[1] < best.f[1]))) best = { s, i, f }; } }
    if (!best && P.top + ph <= P.S) { const s = { y: P.top, h: ph, free: [[0, P.S]] }; P.shelves.push(s); P.top += ph; best = { s, i: 0, f: s.free[0] }; }
    if (!best) return null;
    const x = best.f[0]; best.f[0] += pw; best.f[1] -= pw; if (best.f[1] <= 0) best.s.free.splice(best.i, 1);
    return { x, y: best.s.y, w: pw, h: best.s.h, s: best.s };
  }
  function atlRelease(P, sl) {
    const F = sl.s.free; F.push([sl.x, sl.w]); F.sort((a, b) => a[0] - b[0]);
    for (let i = F.length - 2; i >= 0; i--) if (F[i][0] + F[i][1] === F[i + 1][0]) { F[i][1] += F[i + 1][1]; F.splice(i + 1, 1); }
  }
  // un lavoro finito passa dal velo all'atlante: la tela si copia sulla scheda (al prossimo atlFlush), il velo si libera
  function atlMove(w, g, cx, cy) {
    const T = g.tgt, c = T.c, m = T.mesh; if (!c || !c.width || !m) return false;
    let P = null, sl = null;
    for (const p of ATL.pages) { sl = atlAlloc(p, c.width, c.height); if (sl) { P = p; break; } }
    if (!sl && !ATL.pages.length) { P = atlPage(); sl = atlAlloc(P, c.width, c.height); }
    if (!sl) { P = ATL.pages[0]; if (atlEvict(P, cx, cy, c.width * c.height)) sl = atlAlloc(P, c.width, c.height); }   // piena: via i più lontani
    if (!sl) return false;
    const THREE = T3(), Ly = P.L[T.layer > 0 ? 1 : 0], i = Ly.freeI.length ? Ly.freeI.pop() : Ly.n++; if (i >= ATL.CAP) { Ly.n--; atlRelease(P, sl); return false; }
    m.updateMatrixWorld(true);
    const M = new THREE.Matrix4().copy(m.matrixWorld).multiply(new THREE.Matrix4().makeScale(w.gfxRect.W, w.gfxRect.H, 1));
    const S = P.S, pad = ATL.PAD, ix = sl.x + pad, iy = sl.y + pad, iw = c.width, ih = c.height;
    Ly.rect.setXYZW(i, ix / S, iy / S, iw / S, ih / S); Ly.rect.needsUpdate = true;
    const px = new THREE.Object3D(); px.position.copy(m.position); px.quaternion.copy(m.quaternion); px.updateMatrixWorld(true);   // per chi misura il piano (galleggia, la distanza)
    // il velo resta acceso finché la copia non è sulla scheda (niente buco di un fotogramma)
    ATL.pend.push({ P, Ly, i, sl, c, ix, iy, iw, ih, M, veil: { mesh: m, tex: T.tex } });   // l'istanza si accende con la copia (lo scaffale può avere ancora il disegno di un altro)
    g.tgt = { atl: true, P, Ly, i, sl, mesh: px, c: null, k: T.k }; const A = g.art; g.art = { stages: [0], paths: null, radii: null, Wp: A.Wp, Hp: A.Hp, ppm: A.ppm }; g.drawn = 1; return true;   // la tela del disegno non serve più (è nell'atlante)
  }
  function atlFree(g) {
    const T = g.tgt, P = T.P; if (!P) return; const THREE = T3();
    T.Ly.mesh.setMatrixAt(T.i, new THREE.Matrix4().makeScale(0, 0, 0)); T.Ly.mesh.instanceMatrix.needsUpdate = true; T.Ly.freeI.push(T.i); atlRelease(P, T.sl);
    const q = ATL.pend.findIndex(o => o.Ly === T.Ly && o.i === T.i); if (q >= 0) { const o = ATL.pend[q]; ATL.pend.splice(q, 1); veilGone(o.veil); poolPut(o.c); }
    T.P = null;
  }
  function atlEvict(P, cx, cy, need) {
    const L = []; for (const id in GFX.works) { const g = GFX.works[id]; if (g.tgt && g.tgt.atl && g.tgt.P === P) { const q = g.tgt.mesh.position; L.push([hyp(q.x - cx, q.z - cy), id, g]); } }
    L.sort((a, b) => b[0] - a[0]); let got = 0;
    for (const [d, id, g] of L) { if (d < 45 || got >= need * 1.6) break; got += g.tgt.sl.w * g.tgt.sl.h; atlFree(g); delete GFX.works[id]; }
    return got > 0;
  }
  function veilGone(v) { if (!v || !v.mesh) return; if (v.mesh.parent) v.mesh.parent.remove(v.mesh); v.mesh.geometry.dispose(); v.mesh.material.dispose(); if (v.tex) v.tex.dispose(); GFX.mem.veli = Math.max(0, GFX.mem.veli - 1); }
  // le copie in attesa: ogni tela va dritta nel suo scaffale (texSubImage2D sulla texture dell'atlante, il margine trasparente
  // compreso), poi le mipmap si rifanno una volta. Prima la tela si ridisegnava nell'atlante con uno shader: nel gioco la leggeva
  // vuota e l'atlante si riempiva di nero
  function atlFlush() {
    if (!ATL.pend.length) return; const THREE = T3(), rd = R_().__models.renderer, gl = rd.getContext();
    const byP = new Map(); ATL.pend.splice(0, 8).forEach(o => { (byP.get(o.P) || byP.set(o.P, []).get(o.P)).push(o); });
    byP.forEach((L, P) => {
      if (P.fresh) { const prev = rd.getRenderTarget(), cc = rd.getClearColor(new THREE.Color()), ca = rd.getClearAlpha(); rd.setRenderTarget(P.rt); rd.setClearColor(0, 0); rd.clear(true, false, false); rd.setClearColor(cc, ca); rd.setRenderTarget(prev); P.fresh = false; }   // la prima volta: la texture nasce sulla scheda, trasparente
      const tx = rd.properties.get(P.rt.texture).__webglTexture; if (!tx) return;
      rd.state.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      const pc = ATL.pc || (ATL.pc = document.createElement('canvas')), px = pc.getContext('2d');
      L.forEach(o => {
        pc.width = o.sl.w; pc.height = o.sl.h; px.clearRect(0, 0, o.sl.w, o.sl.h); px.drawImage(o.c, ATL.PAD, o.sl.h - ATL.PAD - o.ih);   // girata in su: il fondo della tela a PAD dal fondo dello scaffale
        gl.texSubImage2D(gl.TEXTURE_2D, 0, o.sl.x, o.sl.y, gl.RGBA, gl.UNSIGNED_BYTE, pc);
        const M3 = o.Ly.mesh; M3.setMatrixAt(o.i, o.M); M3.count = Math.max(M3.count, o.i + 1); M3.instanceMatrix.needsUpdate = true;
        veilGone(o.veil); poolPut(o.c);
      });
      gl.generateMipmap(gl.TEXTURE_2D); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      pc.width = pc.height = 1;
    });
  }
  function atlReset() { ATL.pages.forEach(P => { P.L.forEach(Ly => { if (Ly.mesh.parent) Ly.mesh.parent.remove(Ly.mesh); Ly.mesh.geometry.dispose(); Ly.mesh.material.dispose(); }); P.rt.dispose(); }); ATL.pages = []; ATL.pend = []; }
  // si può mettere nell'atlante? un lavoro finito, fermo sulla scena (non su un mezzo né sul treno)
  const atlFits = (w, g, W) => w.done && w !== W.cur && !w.trace && g.tgt && g.tgt.mesh && !g.tgt.atl && !g.tgt.decal && w.surf !== 'auto' && w.surf !== 'vagone' && w.surf !== 'treno' && w.gfxRect && !w.gfxRect.veh && !(w.crossed && !g.crossDrawn) && g.drawn >= (g.art && g.art.stages ? g.art.stages.length : 1) - 1e-6 && g.tgt.mesh.parent === scene();
  // libera la grafica di un lavoro (la tela torna nella pila)
  function freeVeil(g) { if (g && g.tgt && g.tgt.atl) { atlFree(g); return; } if (!g || !g.tgt || !g.tgt.mesh) return; const m = g.tgt.mesh; if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); if (g.tgt.tex) g.tgt.tex.dispose(); poolPut(g.tgt.c); GFX.mem.veli = Math.max(0, GFX.mem.veli - 1); }
  // [graffiti] LA DECALCOMANIA SUL MEZZO: i triangoli della carrozzeria dentro il riquadro (proiettato lungo la normale del
  // fianco), tagliati ai bordi, portati nello spazio del gruppo del mezzo con le coordinate del disegno: la vernice segue le
  // curve della carrozzeria (niente piano sospeso davanti alla portiera) e si muove col mezzo
  function decalGeo(obj, R) {
    const THREE = T3(); obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), n = new THREE.Vector3(R.n.x, 0, R.n.z).normalize(), r = new THREE.Vector3(n.z, 0, -n.x), up = new THREE.Vector3(0, 1, 0), C = R.c, hw = R.W / 2, hh = R.H / 2, DEP = .45;
    const pos = [], uv = [], A = new THREE.Vector3(), Bv = new THREE.Vector3(), Cv = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
    const loc = p => { const d = [p.x - C.x, p.y - C.y, p.z - C.z]; return [d[0] * r.x + d[2] * r.z, d[1], d[0] * n.x + d[2] * n.z]; };   // u, v, profondità
    const clip = (poly, k, s, lim) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], da = s * a[k] - lim, db = s * b[k] - lim; if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push(a.map((v, j) => v + (b[j] - v) * t)); } } return out; };
    obj.traverse(m => {
      if (!m.isMesh || m.isInstancedMesh || m.userData.velo || !m.geometry || !m.geometry.attributes.position || m.visible === false) return;
      let mt = m.material; if (Array.isArray(mt)) mt = mt[0]; if (mt && mt.transparent && mt.opacity < .3) return;
      const P = m.geometry.attributes.position, I = m.geometry.index, M = m.matrixWorld, nT = I ? I.count / 3 : P.count / 3; if (nT > 60000) return;
      for (let t = 0; t < nT; t++) {
        const ia = I ? I.getX(t * 3) : t * 3, ib = I ? I.getX(t * 3 + 1) : t * 3 + 1, ic = I ? I.getX(t * 3 + 2) : t * 3 + 2;
        A.fromBufferAttribute(P, ia).applyMatrix4(M); Bv.fromBufferAttribute(P, ib).applyMatrix4(M); Cv.fromBufferAttribute(P, ic).applyMatrix4(M);
        fn.crossVectors(e1.subVectors(Bv, A), e2.subVectors(Cv, A)); const l = fn.length(); if (l < 1e-9) continue; fn.multiplyScalar(1 / l);
        if (fn.dot(n) < .3) continue;   // solo le facce che guardano il fianco
        let poly = [loc(A), loc(Bv), loc(Cv)];
        if (poly.every(q => q[0] > hw) || poly.every(q => q[0] < -hw) || poly.every(q => q[1] > hh) || poly.every(q => q[1] < -hh) || poly.every(q => q[2] > .3 || q[2] < -DEP)) continue;
        poly = clip(poly, 0, 1, hw); if (poly.length) poly = clip(poly, 0, -1, hw); if (poly.length) poly = clip(poly, 1, 1, hh); if (poly.length) poly = clip(poly, 1, -1, hh); if (poly.length) poly = clip(poly, 2, 1, .3); if (poly.length) poly = clip(poly, 2, -1, DEP); if (poly.length < 3) continue;
        const W3 = poly.map(q => new THREE.Vector3(C.x + r.x * q[0] + n.x * q[2] + fn.x * GAP, C.y + q[1] + fn.y * GAP, C.z + r.z * q[0] + n.z * q[2] + fn.z * GAP).applyMatrix4(inv));
        for (let k = 1; k + 1 < poly.length; k++) for (const j of [0, k, k + 1]) { pos.push(W3[j].x, W3[j].y, W3[j].z); uv.push(poly[j][0] / R.W + .5, poly[j][1] / R.H + .5); }
      }
    });
    if (pos.length < 9) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
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
  // ---------------- [fluido] IL DISEGNATORE A PARTE ----------------
  // Generare un lavoro (art: lettere, riempimenti, contorni, tutte le tappe) costa da 50 a 200 ms: fatto qui fermava il
  // gioco ogni volta che ci si avvicinava a dei graffiti. Lo fa un Web Worker con gli stessi file (writer_mano.js e
  // writer_arte.js, copiati nella pagina in <script id="pv-artworker" type="text/plain">) e gli stessi semi: il disegno
  // è identico, arriva qualche fotogramma dopo, e intanto il gioco va avanti. I lavori finiti si tengono (gli ultimi 48),
  // così tornando in una zona non si rifanno. Senza Worker o OffscreenCanvas: come prima, qui.
  const ARTW = { w: null, ok: null, seq: 0, wait: new Map(), cache: new Map(), recSig: '', pend: new Set(), q: [] };
  const ARTW_MAIN = `onmessage = async e => { const m = e.data; if (m.fonts) self.GraffitiFonts = { D: m.fonts }; if (m.rec) WriterMano.setRecorded(m.rec); if (!m.w) return; let A; try { await WriterArte.fontsReady(); } catch (er) { }
    try { A = typeof Pennelli !== 'undefined' ? Pennelli.art(m.w) : WriterArte.art(m.w); } catch (err) { postMessage({ id: m.id, err: String(err && err.message || err) }); return; }
    const tr = [], bm = c => { if (c && typeof c.transferToImageBitmap === 'function') { const b = c.transferToImageBitmap(); tr.push(b); return b; } return c; };
    postMessage({ id: m.id, A: { stages: A.stages.map(bm), paths: A.paths, radii: A.radii, Wp: A.Wp, Hp: A.Hp, ppm: A.ppm } }, tr); };`;
  function artWorker() {
    if (ARTW.ok !== null) return ARTW.ok;
    try {
      const src = typeof document !== 'undefined' && document.getElementById('pv-artworker');
      if (!src || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof Blob === 'undefined') return (ARTW.ok = false);
      const code = 'const document = { createElement: () => new OffscreenCanvas(1, 1) };\n' + src.textContent + '\n' + ARTW_MAIN;
      ARTW.w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      ARTW.w.onmessage = e => { ARTW.vivo = performance.now(); const m = e.data, cb = ARTW.wait.get(m.id); ARTW.wait.delete(m.id); if (cb) cb(m.err ? null : m.A, m.err); };
      if (typeof GraffitiFonts !== 'undefined') ARTW.w.postMessage({ fonts: GraffitiFonts.D });   // [graffiti4] i font dei graffiti, una volta sola (non copiati nel sorgente del worker)
      ARTW.w.onerror = e => { console.warn('[Writing] disegnatore a parte spento:', e.message); ARTW.ok = false; const cbs = [...ARTW.wait.values()]; ARTW.wait.clear(); cbs.forEach(cb => cb(null, 'worker')); };
      return (ARTW.ok = true);
    } catch (e) { return (ARTW.ok = false); }
  }
  const artKey = w => [w.id, w.seed, w.style, w.pal || 0, w.col || '', w.W || '', w.H || '', w.surf, w.flat ? 1 : 0, w.sup || '', w.eta || 0, w.sticker ? 1 : 0, w.rec && w.rec.pen || ''].join(':');   // [graffiti] anche il muro, l'età, il pennello
  // il disegno di w: subito (dalla memoria, o qui se il worker non c'è) o appena il worker l'ha fatto. cb(A) con A pronto da usare
  function artFor(w, cb) {
    const k = artKey(w), C = ARTW.cache.get(k);
    if (C) { ARTW.cache.delete(k); ARTW.cache.set(k, C); cb(Object.assign({}, C, { stages: C.stages.slice() })); return; }
    const sync = () => cb(art(w));
    if (!artWorker()) { sync(); return; }
    const WM = typeof WriterMano !== 'undefined' ? WriterMano : { RECORDED: {}, MIA: null };
    const sig = Object.keys(WM.RECORDED).length + ':' + (WM.MIA || ''), msg = { id: ++ARTW.seq, w: {} };
    for (const key in w) if (key !== 'gfxRect') msg.w[key] = w[key];
    if (sig !== ARTW.recSig) { ARTW.recSig = sig; msg.rec = Object.assign({}, WM.RECORDED, WM.MIA ? { _mia: WM.MIA } : {}); }
    let fired = false;
    ARTW.wait.set(msg.id, (A, err) => {
      if (fired) return; fired = true; if (A) ARTW.lastOk = performance.now();
      if (!A) { sync(); return; }   // non è riuscito di là: si fa qui
      if (w.done) { ARTW.cache.set(k, A); while (ARTW.cache.size > 48) ARTW.cache.delete(ARTW.cache.keys().next().value); }
      cb(Object.assign({}, A, { stages: A.stages.slice() }));
    });
    try { ARTW.w.postMessage(msg); } catch (e) { ARTW.wait.delete(msg.id); fired = true; sync(); return; }   // qualcosa nel lavoro non si copia: qui
    // [graffiti2] il disegnatore a parte non risponde (macchina strapiena, worker bloccato): dopo 4 s si fa qui; se non ha
    // mai risposto a niente, si spegne e da lì in poi si disegna qui (un po' di scatto, ma i muri si vedono)
    // [fluido] ma solo se è fermo davvero: se ha risposto (a questo o a un altro) negli ultimi 30 s è solo in coda (all'avvio ne arrivano
    // 24 insieme, sulla macchina carica ognuno costa centinaia di ms, a volte secondi) e si aspetta ancora; idem nei primi 30 s.
    // Prima i lavori in coda scadevano a 4 s, si disegnavano anche qui (50-200 ms l'uno, fermo il gioco) e il worker si spegneva
    if (!ARTW.t0) ARTW.t0 = performance.now();
    const tmo = () => setTimeout(() => { if (fired || !ARTW.wait.has(msg.id)) return; const nw = performance.now();
      if (ARTW.ok && nw - (ARTW.vivo || ARTW.t0) < 30000) { tmo(); return; }
      ARTW.wait.delete(msg.id); fired = true; ARTW.late = (ARTW.late || 0) + 1;
      if (!ARTW.lastOk && ARTW.late >= 3 && ARTW.ok) { ARTW.ok = false; try { ARTW.w.terminate(); } catch (e) { } console.warn('[Writing] il disegnatore a parte non risponde: i graffiti si disegnano nel gioco'); }
      ARTW.q.push(() => { try { sync(); } catch (e) { cb(null); } }); }, 4000);   // in coda: uno alla volta dentro il tempo dei graffiti
    tmo();
  }
  function drawUpTo(w, g) {
    const A = g.art, T = g.tgt; if (!A || !T || T.atl) return; const nS = A.stages.length;
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
  // un lavoro su un mezzo: il punto della carrozzeria (lato, lungo, quota sopra la strada: w.side, w.du, w.vy), la decalcomania
  // attaccata al gruppo del mezzo (se riparte se lo porta via; se il modello si rifà, il lavoro si ripiazza uguale)
  function vehGroup(id) { const R = R_(); return R && R.__vehicles && R.__vehicles[id]; }
  function vehOf(o) { const R = R_(), V = R && R.__vehicles; if (!V) return null; let g = o; while (g) { for (const id in V) if (V[id] === g) return id; g = g.parent; } return null; }
  // [graffiti] dove sta un punto sul mezzo, nel suo sistema: il lato (+1 / -1), lungo il mezzo dal centro, la quota sopra la strada
  function vehAnchor(w, v, p) { const R = R_(), c = Math.cos(v.ang), s = Math.sin(v.ang), dx = p.x - v.x, dz = p.z - v.y, side = (-s * dx + c * dz) >= 0 ? 1 : -1; let gh = 0; try { gh = R.groundH(v.x, v.y); } catch (e) { } w.side = side; w.du = dx * c + dz * s; w.vy = p.y - gh; }
  function placeVeh(w) {
    const THREE = T3(), R = R_(), st = GFX.st, v = st.vehicles.find(x => x.id === w.veh), g = vehGroup(w.veh); if (!v || !g || v.hidden || v.wreck) return false;
    g.updateMatrixWorld(true); const sd = w.side || 1, nx = -Math.sin(v.ang) * sd, nz = Math.cos(v.ang) * sd, gh = R.groundH(v.x, v.y), along = (w.du || 0);
    const sty = STYLES[w.style], k = w.style === 'tag' || w.style === 'mtag' ? (w.tagK || 1) : 1, W0 = w.vy != null && w.W ? w.W : Math.min(sty.W * k, 3.2), H0 = w.vy != null && w.H ? w.H : Math.min(sty.H * k, 1), vy = w.vy != null ? w.vy : .55 + H0 / 2;
    const o = new THREE.Vector3(v.x + Math.cos(v.ang) * along + nx * 3, gh + vy, v.y + Math.sin(v.ang) * along + nz * 3), d = new THREE.Vector3(-nx, 0, -nz);
    const rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.set(o, d); rc.far = 5; rc.near = 0; const h = rc.intersectObject(g, true).find(h => h.face && !h.object.userData.velo); if (!h) return false;
    const n = new THREE.Vector3(nx, 0, nz), c = h.point.clone(); w.W = W0; w.H = H0; if (w.vy == null) w.vy = vy;
    w.gfxRect = { c, n, r: new THREE.Vector3(n.z, 0, -n.x), W: W0, H: H0, obj: g, veh: true }; w.pos = { x: c.x, y: c.y, z: c.z }; return true;
  }
  // [graffiti] la superficie del muro per i pennelli: dal materiale (il nome, il colore) o, se non dice niente, dalla casa
  function surfOf(hit, x, z) {
    let m = hit && hit.obj && hit.obj.material; if (Array.isArray(m)) m = m[0]; const nm = ((m && m.name) || '') + ' ' + ((hit && hit.obj && hit.obj.name) || '');
    if (/matton|brick|cotto/i.test(nm)) return 'mattoni'; if (/cement|calcestr|beton|concrete/i.test(nm)) return 'cemento'; if (/pietra|stone|tufo|granit/i.test(nm)) return 'pietra'; if (/metal|lamier|ferro|serrand|steel/i.test(nm)) return 'metallo'; if (/legno|wood|porta/i.test(nm)) return 'legno';
    const tx = Math.floor(x / TS), ty = Math.floor(z / TS), bi = G.bIndex ? G.bIndex[ty * G.GW + tx] : -1, h = ((bi >= 0 ? bi : tx * 31 + ty) * 2654435761) >>> 0, f = (h % 100) / 100;
    return f < .58 ? 'intonaco' : f < .8 ? 'mattoni' : f < .93 ? 'cemento' : 'pietra';
  }
  // [graffiti] i giorni sul muro (fino a 6): l'età del lavoro per i pennelli (sbiadisce); deciso quando si piazza, così il disegno resta in memoria
  const etaOf = w => w.by === 'player' && !w.old ? (w.sbiadito || 0) : clamp(Math.floor(((GFX.st ? GFX.st.t : 0) - (w.t0 || 0)) / 1440) + (w.old ? 2 + ((w.seed || 0) % 4) : 0), 0, 6);
  // un lavoro degli NPC (o di prima di un ricaricamento): trova il suo muro
  function placeWall(w) { return finisci(placeWallG(w)); }
  function* placeWallG(w) {
    if (w.surf === 'auto') return placeVeh(w);
    if (!w.spot && w.anc && w.anc.k === 'muro') return placeAnchor(w);   // [graffiti] un lavoro salvato: torna dov'era
    const THREE = T3(), R = R_(), sp = w.spot; if (!sp) return false;
    const gh = R.groundH(sp.x, sp.y), list = cands(sp.x, sp.y); if (!list.length) return false;
    const d = new THREE.Vector3(Math.cos(sp.face), 0, Math.sin(sp.face)), sty = STYLES[w.style], base = w.sticker ? { W: .34, H: .24 } : { W: w.W0 || sty.W, H: w.H0 || sty.H };   // [graffiti3] la misura può venire dal sito (i verticali alti quanto la facciata)
    const k = w.tagK || 1, H = base.H * k, W0 = base.W * k, small = /^(tag|mtag)$/.test(w.style), ey = EYE[w.style], d0 = mulberry((w.seed || 1) ^ 0x3e3)();
    // [graffiti] la quota del centro: dal suolo al piede del muro (non dove sta chi dipinge), e il raggio a QUELLA quota; [graffiti3] dal sito
    // (sp.h), o ad altezza d'uomo (EYE, dal seme: ricaricando sta nello stesso punto), l'estintore da terra in su
    const yc = sp.h != null ? sp.h : ey ? gh + ey[0] + (ey[1] - ey[0]) * d0 : w.style === 'estintore' ? gh + 1.2 + H / 2 : gh + .25 + H / 2 + (small ? .3 + mulberry((w.seed || 1) ^ 0x7a9)() * (w.sticker ? 1.2 : 1.4) : 0);
    const hit = rayWall(new THREE.Vector3(sp.x, yc, sp.y), d, sp.h != null ? 6 : 3, list); if (!hit || Math.abs(hit.n.y) > .3) return false;
    const n = new THREE.Vector3(hit.n.x, 0, hit.n.z).normalize(), r = new THREE.Vector3(n.z, 0, -n.x), c = hit.p.clone();
    const foot = sp.h != null ? null : footAt(c, n, W0, r);
    if (foot != null && c.y - H / 2 < foot + .12) c.y = foot + .12 + H / 2;   // mai sotto terra
    const fit = yield* fitWallG(c, n, W0, H, list, { foot, minK: small ? .5 : .55 }); if (!fit) return false;
    w.W = fit.W; w.H = fit.H; w.gfxRect = { c: fit.c, n, r: fit.r, W: fit.W, H: fit.H, foot }; w.pos = { x: fit.c.x, y: fit.c.y, z: fit.c.z };
    w.sup = w.sup || surfOf(hit, fit.c.x - n.x * .3, fit.c.z - n.z * .3); w.eta = etaOf(w);
    // [writer] i muri sono a strati: le tag vanno sopra a tutto; un pezzo va sopra a uno di rango più basso (quasi sempre), sopra
    // a uno dello stesso rango a volte (è un crossaggio), sopra a uno più alto solo un toy, e di rado. Deciso dal seme: ricaricando, il muro è lo stesso
    const under = SMALL.test(w.style) ? [] : overlapCheck(GFX.st, w).filter(o => !SMALL.test(o.style));
    if (under.length) { const R = sty.rank, d0 = mulberry((w.seed || 1) ^ 0x5eed)(), toy = (w.q != null ? w.q : .7) < .35, top = Math.max(...under.map(o => STYLES[o.style].rank));
      const ok = top < R ? d0 < .8 : top === R ? d0 < .3 : toy && d0 < .12; if (!ok) { w.gfxRect = null; return false; }
      under.forEach(o => { o.covered = true; }); w.over = under.map(o => o.id); }
    return true;
  }
  // [graffiti] un lavoro salvato torna sul suo muro: il centro e la normale di quando l'hai fatto; se lì il muro è ancora tutto
  // (la prova punto per punto) si rimette uguale, se no si rifà il riquadro sul muro che c'è
  function placeAnchor(w) {
    const THREE = T3(), a = w.anc, c0 = new THREE.Vector3(a.c[0], a.c[1], a.c[2]), n = new THREE.Vector3(a.n[0], a.n[1] || 0, a.n[2]).normalize();
    const list = cands(c0.x, c0.z); if (!list.length) return false;
    if (Math.abs(n.y) > .5) { const u = a.u ? new THREE.Vector3(a.u[0], a.u[1], a.u[2]) : new THREE.Vector3(0, 0, -1), r = new THREE.Vector3().crossVectors(u, n).normalize(); w.gfxRect = { c: c0, n, r, u, W: w.W, H: w.H }; w.pos = { x: c0.x, y: c0.y, z: c0.z }; return true; }   // per terra
    const hit = rayWall(c0.clone().addScaledVector(n, .6), n.clone().negate(), 1.4, list); if (!hit) return false;
    const c = c0.clone().addScaledVector(n, -(c0.clone().sub(hit.p).dot(n))), r = new THREE.Vector3(n.z, 0, -n.x), L = nearList(list, c, Math.hypot(w.W, w.H) / 2 + 1);
    if (rectOnWall(c, n, r, w.W, w.H, L, a.free ? [] : openingsAt(c, n), null)) { w.gfxRect = { c, n, r, W: w.W, H: w.H }; w.pos = { x: c.x, y: c.y, z: c.z }; return true; }
    if (w.rec) { w.gfxRect = { c, n, r, W: w.W, H: w.H }; w.pos = { x: c.x, y: c.y, z: c.z }; return true; }   // il disegno a mano libera resta com'era (la tavoletta l'ha già stretto al muro)
    const fit = fitWall(c, n, w.W, w.H, list, { minK: .4 }); if (!fit) return false;
    w.W = fit.W; w.H = fit.H; w.gfxRect = { c: fit.c, n, r: fit.r, W: fit.W, H: fit.H }; w.pos = { x: fit.c.x, y: fit.c.y, z: fit.c.z }; return true;
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
    // [campagna] la stessa funzione della logica (game.js railProfile): in campagna la quota del mondo, altrove il terreno reso (R.groundH)
    const P = TR.P, n = P.length, rf = G.railProfile(P, (x, y) => R.groundH(x, y), { bridge: RAIL.bridge, cross: RAIL.cross, xMerge: G.MAP.world && G.MAP.world.cityW0 });
    TR.el = rf.el; TR.g = rf.g;
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
    const RT = railTex(), pos = [], col = [], uvs = [], idxG = [], idxE = [], idxD = [], idxW = [], push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); uvs.push(x / 2.2 + y * .15, z / 2.2 - y * .15); return pos.length / 3 - 1; };   // la texture proiettata dall'alto (più la quota: le scarpate non si stirano)
    const cG = new THREE.Color('#e2dcd2'), cG2 = new THREE.Color('#c4bdb1'), cO = new THREE.Color('#9c8c7c'), cC = new THREE.Color('#d6d2ca'), cC2 = new THREE.Color('#aaa69e');
    let prev = null, prevK = null;
    const bed = (q, i, dk) => {   // una sezione: bordo esterno a terra, spalla, il centro più scuro d'olio e ruggine, spalla, bordo
      const nx = -Math.sin(q.ang), nz = Math.cos(q.ang), top = q.h - .18, el = EL(i) || SEA(i);
      if (el) { const bot = top - .95, hw = 2.5; return [push(q.x + nx * hw, bot, q.y + nz * hw, cC2), push(q.x + nx * hw, top, q.y + nz * hw, cC), push(q.x + nx * 1.6, top + .06, q.y + nz * 1.6, cG2), push(q.x, top + .1, q.y, cO), push(q.x - nx * 1.6, top + .06, q.y - nz * 1.6, cG2), push(q.x - nx * hw, top, q.y - nz * hw, cC), push(q.x - nx * hw, bot, q.y - nz * hw, cC2)]; }
      // il rilevato: la scarpata scende a terra con pendenza 2:3 (più è alto, più è largo); sotto la ghiaia, la terra con l'erba rada
      // [ordine1] oltre 1,2 m il rilevato non scende più in una scarpata liscia larga fino a 14 m: lo regge un muro di pietra a secco
      const wall = sd => !dk && top - gH(q.x + nx * 3 * sd, q.y + nz * 3 * sd) > 1.2;
      const ft = sd => { if (wall(sd)) return 2.95; let f = 3.3; for (let k = 0; k < 4; k++) { const gg = gH(q.x + nx * f * sd, q.y + nz * f * sd); f = 3.3 + Math.max(0, top - gg - .3) * 1.5; } return Math.min(f, 14); };
      const wl = wall(1), wr = wall(-1);
      if (wl || wr) { const fL = ft(1), fR = ft(-1), gL = gH(q.x + nx * fL, q.y + nz * fL) - .2, gR = gH(q.x - nx * fR, q.y - nz * fR) - .2, cS = new THREE.Color('#d8d2c6');
        const shL = wl ? top - .04 : top - Math.min(.35, top - gL), shR = wr ? top - .04 : top - Math.min(.35, top - gR);
        const A = [push(q.x + nx * fL, Math.min(top, gL), q.y + nz * fL, jit(wl ? cS : cG2, i)), push(q.x + nx * (wl ? 2.75 : 2.6), shL, q.y + nz * (wl ? 2.75 : 2.6), jit(wl ? cS : cG2, i + 5)), push(q.x + nx * 1.9, top, q.y + nz * 1.9, jit(cG, i + 1)), push(q.x, top + .02, q.y, jit(cO, i + 2)), push(q.x - nx * 1.9, top, q.y - nz * 1.9, jit(cG, i + 3)), push(q.x - nx * (wr ? 2.75 : 2.6), shR, q.y - nz * (wr ? 2.75 : 2.6), jit(wr ? cS : cG2, i + 6)), push(q.x - nx * fR, Math.min(top, gR), q.y - nz * fR, jit(wr ? cS : cG2, i + 4))];
        A.wl = wl; A.wr = wr; return A; }
      const fL = ft(1), fR = ft(-1), foot = fL, gL = Math.min(top, gH(q.x + nx * fL, q.y + nz * fL)) - .15, gR = Math.min(top, gH(q.x - nx * fR, q.y - nz * fR)) - .15, cE = new THREE.Color('#e0d8c0');
      const eL = Math.min(top, gL + .1) - Math.min(.35, top - gL), eR = Math.min(top, gR + .1) - Math.min(.35, top - gR);   // dove finisce la ghiaia comincia la terra
      return [push(q.x + nx * fL, gL, q.y + nz * fL, jit(cE, i)), push(q.x + nx * 2.6, top - Math.min(.35, top - gL), q.y + nz * 2.6, jit(fL > 4.5 ? cE : cG2, i + 5)), push(q.x + nx * 1.9, top, q.y + nz * 1.9, jit(cG, i + 1)), push(q.x, top + .02, q.y, jit(cO, i + 2)), push(q.x - nx * 1.9, top, q.y - nz * 1.9, jit(cG, i + 3)), push(q.x - nx * 2.6, top - Math.min(.35, top - gR), q.y - nz * 2.6, jit(fR > 4.5 ? cE : cG2, i + 6)), push(q.x - nx * fR, gR, q.y - nz * fR, jit(cE, i + 4))];
    };
    for (let i = 0; i < P.length; i += 2) {
      const q = railAt(i), k = bed(q, i), kind = EL(i) || SEA(i) ? 1 : 0;
      const strip = (A, B, kd) => { for (let a = 0; a < 6; a++) (kd ? (a === 2 || a === 3 ? idxG : idxD) : a === 0 ? (A.wl || B.wl ? idxW : idxE) : a === 5 ? (A.wr || B.wr ? idxW : idxE) : idxG).push(A[a], B[a], A[a + 1], A[a + 1], B[a], B[a + 1]); };
      if (prev && kind === prevK) strip(prev, k, kind);
      else if (prev) { const k2 = bed(railAt(i - 1), i - 1); strip(prev, k2, prevK); }
      prev = k; prevK = kind;
    }
    // gli scali: la loro massicciata accanto, e i binari secondari
    RAIL.yards.forEach(Y => { let pv = null; for (let u = 0; u <= Y.len; u += 2) { const q = yardAt(Y, u); const k = bed(q, Y.s0 + u, 1); if (pv) for (let a = 0; a < 6; a++) (a === 0 || a === 5 ? idxE : idxG).push(pv[a], k[a], pv[a + 1], pv[a + 1], k[a], k[a + 1]); pv = k; } });
    const PA = new THREE.Float32BufferAttribute(pos, 3), CA = new THREE.Float32BufferAttribute(col, 3), UA = new THREE.Float32BufferAttribute(uvs, 2);
    // [ordine1] il muro di pietra a secco: conci irregolari a corsi, giunti scuri, licheni e muschio in basso
    if (!RT.stone) RT.stone = tex64(64, 64, (x, w, h) => { x.fillStyle = '#4a4640'; x.fillRect(0, 0, w, h); let s0 = 7;
      for (let y = 0; y < h; y += 8) { let u = (y / 8 % 2) * 5 - 6; while (u < w) { s0 = (s0 * 16807) % 2147483647; const L = 7 + s0 % 9, t = 70 + (s0 >> 5) % 40; x.fillStyle = `rgb(${t + 26},${t + 20},${t + 10})`; x.fillRect(u + 1, y + 1, L - 1, 6); x.fillStyle = 'rgba(255,250,235,.18)'; x.fillRect(u + 1, y + 1, L - 1, 1); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(u + 1, y + 6, L - 1, 1); u += L; } }
      for (let k = 0; k < 140; k++) { s0 = (s0 * 16807) % 2147483647; x.fillStyle = k % 3 ? 'rgba(90,110,60,.45)' : 'rgba(200,196,160,.4)'; x.fillRect(s0 % w, (s0 >> 8) % h, 2, 1); } }); RT.stone.wrapS = RT.stone.wrapT = THREE.RepeatWrapping;
    [[idxG, RT.gravel], [idxE, RT.earth], [idxD, RT.concrete], [idxW, RT.stone]].forEach(([ix, mp]) => { if (!ix.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', PA); geo.setAttribute('color', CA); geo.setAttribute('uv', UA); geo.setIndex(ix); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: mp, vertexColors: true, side: THREE.DoubleSide })); m.receiveShadow = true; m.userData.wr = 1; g.add(m); });
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
    const pilL = [];   // [writer] i piloni del ponte in terra: mesh vere, si dipingono (sotto il ponte)
    // i piloni: sul ponte in terra e sul viadotto, fino al terreno (o al fondo del mare)
    (RAIL.cross || []).forEach(c => [-1, 1].forEach(sg => { const s = c.s + sg * (c.hw + .7); if (s < 1 || s > P.length - 2) return; const q = railAt(s), top = q.h - 1.15, bot = gH(q.x, q.y) - .4; if (top - bot < .4) return; pilL.push([q.x, (top + bot) / 2, q.y, [1.5, top - bot, 5.4], -q.ang]); pil.push([q.x, top - .1, q.y, [1.9, .3, 5.8], -q.ang]); }));   /* [ordine1] le spalle del sottopasso */
    // [campagna] e mai sopra una carreggiata, anche dove l'incrocio non è fra i sottopassi (il Lungomare sotto il viadotto della stazione)
    const RDP = G.MAP.roads.filter(rd => rd.pts && rd.pts.length > 1 && !rd.rect && !rd.traccia), inRoad = (x, y) => RDP.some(rd => { const m = rd.w / 2 + 2.2; for (let k = 0; k < rd.pts.length - 1; k++) { const [ax, ay] = rd.pts[k], [bx, by] = rd.pts[k + 1]; if (Math.min(ax, bx) - m > x || Math.max(ax, bx) + m < x || Math.min(ay, by) - m > y || Math.max(ay, by) + m < y) continue; const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); if (hyp(ax + dx * t - x, ay + dy * t - y) < m) return true; } return false; });
    for (let s = 6; s < P.length - 6; s += 12) { if (!(EL(s) || SEA(s))) continue; if ((RAIL.cross || []).concat(RAIL.sotto || []).some(c => Math.abs(s - c.s) < c.hw + 2)) continue; if (!SEA(s) && inRoad(P[s][0], P[s][1])) continue; /* [ordine1] mai un pilone in mezzo alla strada ([campagna] neanche sotto i ponti della campagna) */ const q = railAt(s), top = q.h - 1.15, bot = SEA(s) ? -4 : gH(q.x, q.y) - .3; if (top - bot < .4) continue; (SEA(s) ? pil : pilL).push([q.x, (top + bot) / 2, q.y, [1.2, top - bot, 3.2], -q.ang]); pil.push([q.x, top - .2, q.y, [1.7, .4, 4.6], -q.ang]); pil.push([q.x, top - .5, q.y, [1.4, .2, 3.8], -q.ang]); if (!SEA(s)) pil.push([q.x, bot + .45, q.y, [2, .5, 4], -q.ang]); }
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
    const surfAt = (s, sd, o) => { const q = sidePt(s, sd, 0), top = q.h - .18, nx = -Math.sin(q.ang) * sd, nz = Math.cos(q.ang) * sd, gg = gH(q.x + nx * o, q.y + nz * o); if (EL(s) || SEA(s)) return gg; if (o > 2.8 && top - gH(q.x + nx * 3, q.y + nz * 3) > 1.2) return gg; return o <= 1.9 ? top : Math.max(gg, o <= 2.6 ? top - (o - 1.9) / .7 * .35 : top - .35 - (o - 2.6) / 1.5); };   // [ordine1] oltre il muro, il prato   // come la sezione della massicciata: piano, spalla, scarpata
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
    // ---- [writer] GLI SPOT: i piloni del ponte in terra e le spalle (cemento vero, si dipinge), la stazione abbandonata, le case cantoniere ----
    { const SP = spotPlan(), conM = new THREE.MeshLambertMaterial({ map: RT.concrete });
      pilL.forEach(([x, y, z, [w, h, d], ry]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), conM); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true; m.name = 'pilone'; g.add(m); });
      SP.abut.forEach(A => { const q = railAt(A.s), top = q.h - 1.15, bot = gH(q.x, q.y) - .5; if (top - bot < 1) return; const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, top - bot, 5.8), conM); m.position.set(q.x, (top + bot) / 2, q.y); m.rotation.y = -q.ang; m.castShadow = true; m.receiveShadow = true; m.name = 'spalla_ponte'; g.add(m); });
      // l'intonaco vecchio: il colore, le macchie, l'umido che sale, l'intonaco caduto sui mattoni, le finestre murate o sbarrate, le scritte sbiadite, le tag di anni fa
      const wallTex = (wm, hm, o) => { const W0 = Math.round(wm * 40), H0 = Math.round(hm * 40), c = cv(W0, H0), x = c.getContext('2d'), r = mulberry(o.seed);
        x.fillStyle = o.col; x.fillRect(0, 0, W0, H0);
        for (let k = 0; k < 90; k++) { x.fillStyle = r() < .5 ? `rgba(255,250,235,${.04 + r() * .08})` : `rgba(40,30,20,${.04 + r() * .1})`; x.beginPath(); x.ellipse(r() * W0, r() * H0, 4 + r() * 18, 3 + r() * 10, r() * 3, 0, 7); x.fill(); }
        const gd = x.createLinearGradient(0, H0, 0, H0 * .55); gd.addColorStop(0, 'rgba(45,35,25,.5)'); gd.addColorStop(1, 'rgba(45,35,25,0)'); x.fillStyle = gd; x.fillRect(0, 0, W0, H0);   // l'umido dal basso
        for (let k = 0; k < 3 + r() * 6; k++) { const px = r() * W0, py = r() * H0 * .9, pw = 18 + r() * 70, ph = 10 + r() * 40; x.fillStyle = '#8e5038'; x.fillRect(px, py, pw, ph); x.strokeStyle = 'rgba(60,30,20,.55)'; x.lineWidth = 1; for (let yy = py + 5; yy < py + ph; yy += 6) { x.beginPath(); x.moveTo(px, yy); x.lineTo(px + pw, yy); x.stroke(); } }   // dove l'intonaco è caduto
        if (o.floors > 1) { x.fillStyle = 'rgba(240,232,214,.55)'; x.fillRect(0, H0 * .5, W0, 9); }   // il marcapiano
        const n = Math.max(1, Math.floor(wm / 2.7)), win = (wx, wy, ww, wh) => { x.fillStyle = 'rgba(236,228,210,.8)'; x.fillRect(wx - 4, wy - 4, ww + 8, wh + 8); const k = r();
          if (k < .45) { x.fillStyle = '#8c8880'; x.fillRect(wx, wy, ww, wh); x.strokeStyle = 'rgba(50,48,44,.6)'; for (let yy = wy + 7; yy < wy + wh; yy += 7) { x.beginPath(); x.moveTo(wx, yy); x.lineTo(wx + ww, yy); x.stroke(); } }   // murata coi blocchetti
          else if (k < .8) { x.fillStyle = '#1a1814'; x.fillRect(wx, wy, ww, wh); for (let j = 0; j < 4; j++) { x.fillStyle = ['#7a5a3a', '#6a4a30', '#8a6a48'][j % 3]; x.save(); x.translate(wx + ww / 2, wy + wh * (.2 + j * .22)); x.rotate((r() - .5) * .3); x.fillRect(-ww * .6, -5, ww * 1.2, 10); x.restore(); } }   // sbarrata con le assi
          else { x.fillStyle = '#121418'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(180,200,210,.35)'; x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + ww * .4, wy); x.lineTo(wx, wy + wh * .5); x.fill(); } };   // il vetro rotto
        for (let f = 0; f < o.floors; f++) for (let k = 0; k < n; k++) { if (o.door && f === 0 && k === Math.floor(n / 2)) continue; win((k + .5) * W0 / n - 18, f === 0 ? H0 * .62 : H0 * .14, 36, f === 0 ? 50 : 54); }
        if (o.door) { const dx = (Math.floor(n / 2) + .5) * W0 / n - 24; x.fillStyle = 'rgba(236,228,210,.8)'; x.fillRect(dx - 5, H0 * .55 - 5, 58, H0 * .45 + 5); x.fillStyle = '#8c8880'; x.fillRect(dx, H0 * .55, 48, H0 * .45); x.strokeStyle = 'rgba(50,48,44,.6)'; for (let yy = H0 * .55 + 7; yy < H0; yy += 7) { x.beginPath(); x.moveTo(dx, yy); x.lineTo(dx + 48, yy); x.stroke(); } }   // la porta murata
        if (o.text) { x.save(); x.globalAlpha = .62; x.fillStyle = o.ink || '#f2ece0'; x.font = `bold ${Math.round(H0 * .07)}px Arial`; x.textAlign = 'center'; x.fillText(o.text, W0 / 2, H0 * .485); x.restore(); }   // la scritta sbiadita
        try { if (typeof WriterMano !== 'undefined' && WriterMano.handTag) for (let k = 0; k < 2 + r() * 4; k++) { const tw = 70 + r() * 60, th = 34 + r() * 20, tc = cv(Math.round(tw), Math.round(th)); WriterMano.handTag(tc.getContext('2d'), pick(['SNEK', 'OKAY', 'BRUT', 'MIKS', 'DUNE', 'KEOS', 'RAKE', 'ZORA']), Object.assign(WriterMano.dna(Math.floor(r() * 1e6)), { skill: .6 }), tc.width, tc.height, r, pick(['#1a1a1e', '#2a4a8a', '#8a2a2a']), 'mtag'); x.save(); x.globalAlpha = .45 + r() * .2; x.drawImage(tc, r() * (W0 - tw), H0 * (.6 + r() * .25)); x.restore(); } } catch (er) { }   // le tag di anni fa, sbiadite
        return new THREE.MeshLambertMaterial({ map: canvasTexture(c) }); };
      const roofM = new THREE.MeshLambertMaterial({ color: '#7a4630' }), rustM = new THREE.MeshStandardMaterial({ color: '#5a3a2a', metalness: .5, roughness: .8 }), darkM2 = new THREE.MeshLambertMaterial({ color: '#2a2622' });
      SP.blds.forEach((B, bi) => {
        const L = B.u1 - B.u0, D = B.o1 - B.o0, cq = sidePt(B.s, B.side, (B.o0 + B.o1) / 2), ang = cq.ang;
        let base = 1e9; for (const u of [B.u0, 0, B.u1]) for (const o of [B.o0, B.o1]) { const q = sidePt(B.s + u, B.side, o); base = Math.min(base, gH(q.x, q.y)); } base -= .25;
        const st = B.kind === 'stazione', nm = (() => { try { const p = G.nearestPlace(cq.x, cq.y); return p ? p.name.replace(/^\S+\s+(della|delle|dello|dei|degli|del|di|d')\s*/i, '').replace(/\s+[IVX]+$/, '').toUpperCase() : ''; } catch (e) { return ''; } })();   // «Case della Tramontana» → TRAMONTANA
        // [campagna] la stazione abbandonata con la mano della città: il fabbricato viaggiatori di pezzi_citta.js (le arcate, i cantonali, la
        // marquise, l'attico dell'orologio fermo), basso e stretto, col marciapiede alla quota del ferro e la pensilina in ghisa verso i binari
        // (colonne, falda di zinco a pezzi, mantovana, lampade, cartelli, bacheca, panchine, carrello); vani bui o murati
        if (st && typeof PezziCitta !== 'undefined' && PezziCitta && PezziCitta.make) { let pz = null; const ph = railAt(B.s).h + .05, Lb = B.u1 - B.u0, Pd = B.o1 - B.o0;
          try { pz = PezziCitta.make('stazione', { L: Lb, P: Pd, piani: 2, hp: 3.6, binari: 0, piazzale: false, pensilina: true, orologio: true, marc: B.o0 - 3, hMarc: Math.max(.3, ph - base), nome: nm.slice(0, 14) || 'STAZIONE', abbandonata: true }); } catch (e) { pz = null; }
          if (pz) { const th = -ang + (B.side > 0 ? 0 : Math.PI), root = new THREE.Group(); root.position.set(cq.x - Lb / 2 * Math.cos(th), base, cq.y + Lb / 2 * Math.sin(th)); root.rotation.y = th; root.add(pz);
            if (PezziCitta.vestiUV) try { PezziCitta.vestiUV(pz); } catch (e) { }
            root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); root.name = 'stazione_abbandonata'; g.add(root); return; } }
        const col = st ? '#c8a868' : '#a0402e', frontT = wallTex(L, B.H, { seed: 31 + bi * 7, col, floors: 2, door: true, text: st ? 'STAZIONE DI ' + nm : 'CASA CANTONIERA', ink: st ? '#3a2a1a' : '#f2ece0' }), backT = wallTex(L, B.H, { seed: 47 + bi * 7, col, floors: 2 }), endT = wallTex(D, B.H, { seed: 53 + bi * 7, col, floors: 2 });
        const mats = [endT, endT, darkM2, darkM2, B.side > 0 ? backT : frontT, B.side > 0 ? frontT : backT];   // la facciata con la scritta guarda i binari
        const m = new THREE.Mesh(new THREE.BoxGeometry(L, B.H, D), mats); m.position.set(cq.x, base + B.H / 2, cq.y); m.rotation.y = -ang; m.castShadow = true; m.receiveShadow = true; m.name = st ? 'stazione_abbandonata' : 'casa_cantoniera'; g.add(m);
        // il tetto a due falde (alla stazione mezzo crollato: una falda ha il buco)
        const rise = D * .28, sl = Math.hypot(D / 2 + .35, rise), ta = Math.atan2(rise, D / 2 + .35);
        [-1, 1].forEach(k => { const f = new THREE.Mesh(new THREE.BoxGeometry(L + .5, .14, sl), roofM); const lz = k * (D / 4 + .1), off = (B.o0 + B.o1) / 2 + lz; const q = sidePt(B.s, B.side, off); f.position.set(q.x, base + B.H + rise / 2, q.y); f.rotation.set(0, -ang, 0); f.rotateX(k * B.side * ta); f.castShadow = true; g.add(f); });
        if (!st) return;
        // la banchina davanti (cemento, il bordo verso i binari si dipinge), la pensilina arrugginita sui pali, la tabella blu col nome
        const pq = sidePt(B.s, B.side, 4.3), ph = railAt(B.s).h + .05, pb = Math.min(gH(pq.x, pq.y), ph) - .4;
        const pf = new THREE.Mesh(new THREE.BoxGeometry(30, ph - pb, 2.6), conM); pf.position.set(pq.x, (ph + pb) / 2, pq.y); pf.rotation.y = -ang; pf.receiveShadow = true; pf.castShadow = true; pf.name = 'banchina'; g.add(pf);
        for (let u = -10; u <= 10; u += 5) { const q = sidePt(B.s + u, B.side, 4.9), po = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 3.1, 8), rustM); po.position.set(q.x, ph + 1.55, q.y); g.add(po); }
        const cn = new THREE.Mesh(new THREE.BoxGeometry(22, .14, 2.8), rustM), cnq = sidePt(B.s, B.side, 4.4); cn.position.set(cnq.x, ph + 3.15, cnq.y); cn.rotation.y = -ang; cn.rotation.z = .02; cn.castShadow = true; g.add(cn);
        { const c = cv(320, 64), x = c.getContext('2d'); x.fillStyle = '#25427a'; x.fillRect(0, 0, 320, 64); x.fillStyle = 'rgba(240,240,240,.85)'; x.font = 'bold 30px Arial'; x.textAlign = 'center'; x.fillText(nm.slice(0, 16), 160, 43); x.fillStyle = 'rgba(120,70,30,.5)'; for (let k = 0; k < 40; k++) x.fillRect(Math.random() * 320, Math.random() * 64, 3, 3);
          const q = sidePt(B.s + 12, B.side, 5.2), sg = new THREE.Mesh(new THREE.BoxGeometry(3.2, .64, .06), new THREE.MeshLambertMaterial({ map: canvasTexture(c) })); sg.position.set(q.x, ph + 2.2, q.y); sg.rotation.y = -ang; sg.name = 'tabella_stazione'; g.add(sg);
          [-1.3, 1.3].forEach(du => { const pq2 = sidePt(B.s + 12 + du, B.side, 5.2), p2 = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.4, 6), rustM); p2.position.set(pq2.x, ph + 1.2, pq2.y); g.add(p2); }); }
      });
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
    const A = TAV.a, rx = A.r, up = A.u, d = { x: TAV.b.x - A.pt.x, y: TAV.b.y - A.pt.y, z: TAV.b.z - A.pt.z }, ub = d.x * rx.x + d.y * (rx.y || 0) + d.z * rx.z, vb = d.x * up.x + d.y * up.y + d.z * up.z;   // [writer] r a destra, u in alto sulla superficie (sul muro è la verticale, per terra è avanti)
    let Wm = Math.abs(ub), Hm = Math.abs(vb), cu = ub / 2, cv0 = vb / 2;
    if (Wm < .25 || Hm < .2) { Wm = 2.7; Hm = 1.3; cu = 0; cv0 = 0; A.size = 'throw'; } else A.size = null;   // [tavoletta] un tocco solo: la finestra di un throw-up attorno al punto (la misura poi si cambia nel pannello)
    Wm = clamp(Wm, .25, 16); Hm = clamp(Hm, .2, 4);
    return { W: Wm, H: Hm, c: { x: A.pt.x + rx.x * cu + up.x * cv0, y: A.pt.y + (rx.y || 0) * cu + up.y * cv0, z: A.pt.z + rx.z * cu + up.z * cv0 } };
  }
  function tavFrame() {
    const THREE = T3(), A = TAV.a, Rc = tavRect(), n = A.n, rx = A.r, sc = scene(); if (!sc) return;
    const up = A.u, P = (u, v) => new THREE.Vector3(Rc.c.x + rx.x * u + up.x * v + n.x * .03, Rc.c.y + up.y * v + n.y * .03, Rc.c.z + rx.z * u + up.z * v + n.z * .03);
    const pts = [P(-Rc.W / 2, -Rc.H / 2), P(Rc.W / 2, -Rc.H / 2), P(Rc.W / 2, Rc.H / 2), P(-Rc.W / 2, Rc.H / 2)];
    if (!TAV.frame) { TAV.frame = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffe14a, depthTest: false })); TAV.frame.renderOrder = 9; sc.add(TAV.frame); }
    TAV.frame.geometry.setFromPoints(pts);
  }
  function tavClear() { if (TAV.frame) { if (TAV.frame.parent) TAV.frame.parent.remove(TAV.frame); TAV.frame.geometry.dispose(); TAV.frame.material.dispose(); TAV.frame = null; } TAV.a = null; TAV.b = null; }
  function tavTick(st, nx, ny, tool, col) {
    const THREE = T3(), R = R_(), p = st.player; if (!THREE || !R || TAV.pad) return true;
    const cam = R.getCamera(), rc = GFX.rc || (GFX.rc = new THREE.Raycaster()); rc.setFromCamera(new THREE.Vector2(nx * 2 - 1, 1 - ny * 2), cam); rc.near = 0; rc.far = 1e4;
    if (!TAV.a) {
      const list = cands(p.x, p.y); if (GFX.train) GFX.train.cars.forEach(c => c.sides.forEach(s => list.push(s.mesh)));   // [writer] anche le fiancate del treno
      const vis = h => { if (!h.face) return false; let m = h.object.material; if (Array.isArray(m)) m = m[h.face.materialIndex]; return m && m.visible !== false && !(m.transparent && m.opacity < .3); };
      // [graffiti3] prima un muro (faccia verticale) sotto il dito, anche se davanti c'è terra, erba o un oggetto piccolo; la terra solo se muri non ce ne sono
      const hits = rc.intersectObjects(list, false), near14 = h => vis(h) && hyp(h.point.x - p.x, h.point.z - p.y) <= 14;
      const upright = h => { const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); return Math.abs(n.y) < .5; };
      // [graffiti] il muro dietro solo se è a un passo dal primo colpo (l'erba, un ciuffo, il bordo del marciapiede davanti al
      // muro): prima vinceva qualunque faccia verticale sul raggio, anche nascosta dietro o sotto la terra, e la foto
      // dell'anteprima guardava il vuoto (il cielo) invece del pavimento che avevi toccato
      const h0 = hits.find(vis), h = h0 && near14(h0) ? (upright(h0) ? h0 : hits.find(q => near14(q) && upright(q) && q.distance - h0.distance < .9 && q.point.y > h0.point.y - .05) || h0) : null;
      if (!h) { const far = hits.find(vis); return far && hyp(far.point.x - p.x, far.point.z - p.y) < 40 ? { msg: 'Troppo lontano per la tavoletta: avvicinati al muro.' } : false; }
      const n = h.face.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(rc.ray.direction) > 0) n.negate();
      if (!TAV.told) { TAV.told = true; try { G.feed(st, 'Tavoletta: tieni premuto e trascina per aprire la finestra sul muro, poi lascia e disegni.'); } catch (e) { } }
      if (h.object.userData.car) { const tr = trainAt(st.t); if (tr && tr.v) return { msg: 'Il treno si muove!' }; }
      let nn, rr, uu;   // [writer] qualunque superficie: un muro, un mezzo, il treno, un carro, la terra, un tetto
      const vid = vehOf(h.object), veh = vid && st.vehicles.find(x => x.id === vid);
      if (veh && Math.abs(n.y) <= .6) {   // [graffiti] sul mezzo: il lato scelto (il fianco o il muso/la coda), dritto sul suo asse, non la faccia storta colpita
        const fx = Math.cos(veh.ang), fz = Math.sin(veh.ang), side = -fz * n.x + fx * n.z, fwd = fx * n.x + fz * n.z;
        nn = Math.abs(side) >= Math.abs(fwd) ? new THREE.Vector3(-fz * Math.sign(side), 0, fx * Math.sign(side)) : new THREE.Vector3(fx * Math.sign(fwd), 0, fz * Math.sign(fwd)); rr = new THREE.Vector3(nn.z, 0, -nn.x); uu = new THREE.Vector3(0, 1, 0);
      } else if (veh) { nn = new THREE.Vector3(0, 1, 0); uu = new THREE.Vector3(Math.cos(veh.ang), 0, Math.sin(veh.ang)); rr = new THREE.Vector3().crossVectors(uu, nn).normalize(); }   // il tetto, il cofano: dall'alto, l'alto del disegno verso il muso
      else if (Math.abs(n.y) > .6) { const f = new THREE.Vector3(); cam.getWorldDirection(f); f.y = 0; if (f.lengthSq() < 1e-4) f.set(0, 0, -1); f.normalize(); nn = new THREE.Vector3(0, Math.sign(n.y), 0); uu = f.clone(); rr = new THREE.Vector3().crossVectors(uu, nn).normalize(); }   // per terra: l'alto del disegno è dove guardi
      else { nn = new THREE.Vector3(n.x, 0, n.z).normalize(); rr = new THREE.Vector3(nn.z, 0, -nn.x); uu = new THREE.Vector3(0, 1, 0); }
      TAV.a = { pt: h.point.clone(), n: nn, r: rr, u: uu, obj: h.object, tool, col, veh: vid || null }; TAV.b = h.point.clone();
      TAV.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(nn, h.point); tavFrame(); return true;
    }
    const q = new THREE.Vector3(); if (rc.ray.intersectPlane(TAV.plane, q)) { TAV.b = q; tavFrame(); }
    return true;
  }
  // [graffiti] LA FINESTRA STRETTA ALLA SUPERFICIE: il riquadro trascinato non esce dalla superficie toccata (sopra il tetto
  // c'è il cielo, oltre lo spigolo il vuoto, sotto il muro la terra): sul muro il rettangolo più grande tutto muro attorno al
  // punto toccato; per terra (strade, piazze, tetti) i punti devono stare sul piano entro 25 cm; sui mezzi il riquadro sta
  // dentro la sagoma del fianco. Ritorna il riquadro (c, W, H), uguale se era già tutto sulla superficie
  function tavFit(Rc, A) {
    const THREE = T3(), n = A.n, flat = Math.abs(n.y || 0) > .5, list = A.veh ? [vehGroup(A.veh)].filter(Boolean) : cands(Rc.c.x, Rc.c.z); if (!list.length) return Rc;
    const c = new THREE.Vector3(Rc.c.x, Rc.c.y, Rc.c.z);
    if (!flat && !A.veh) { const o = { minK: .05, free: true, noOpen: true, foot: footAt(c, n, Rc.W, A.r) }, f = fitWall(c, n, Rc.W, Rc.H, list, o) || fitWall(A.pt.clone(), n, Math.min(Rc.W, .6), Math.min(Rc.H, .4), list, o);   // se no, una finestra piccola attorno al punto toccato
      return f ? { W: f.W, H: f.H, c: { x: f.c.x, y: f.c.y, z: f.c.z } } : { W: Math.min(Rc.W, .6), H: Math.min(Rc.H, .4), c: { x: A.pt.x, y: A.pt.y, z: A.pt.z } }; }
    // per terra e sui mezzi: la griglia dei raggi dall'alto (o dal fianco), il rettangolo più grande buono
    const rx = A.r, up = A.u, NX = 9, NY = 7, ok = [], rc = GFX.rc || (GFX.rc = new THREE.Raycaster()), tolD = flat ? .25 : .45;
    const at = (i, j) => new THREE.Vector3(c.x + rx.x * (i / (NX - 1) - .5) * Rc.W + up.x * (j / (NY - 1) - .5) * Rc.H, c.y + (rx.y || 0) * (i / (NX - 1) - .5) * Rc.W + up.y * (j / (NY - 1) - .5) * Rc.H, c.z + rx.z * (i / (NX - 1) - .5) * Rc.W + up.z * (j / (NY - 1) - .5) * Rc.H);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const q = at(i, j), o = q.clone().addScaledVector(n, 1.5); rc.set(o, n.clone().negate()); rc.far = 1.5 + tolD; rc.near = 0; const h = (A.veh ? rc.intersectObject(list[0], true) : rc.intersectObjects(nearList(list, q, 2), false)).find(h => h.face && !h.object.userData.velo); ok.push(h && Math.abs(h.distance - 1.5) < tolD ? 1 : 0); }
    let best = null; for (let i0 = 0; i0 < NX; i0++) for (let i1 = i0; i1 < NX; i1++) for (let j0 = 0; j0 < NY; j0++) for (let j1 = j0; j1 < NY; j1++) { let all = true; for (let j = j0; j <= j1 && all; j++) for (let i = i0; i <= i1; i++) if (!ok[j * NX + i]) { all = false; break; } if (!all) continue; const a = (i1 - i0 + 1) * (j1 - j0 + 1) * 100 - Math.hypot((i0 + i1) / 2 - (NX - 1) / 2, (j0 + j1) / 2 - (NY - 1) / 2); if (!best || a > best.a) best = { a, i0, i1, j0, j1 }; }
    if (!best) return Rc; if (best.i0 === 0 && best.j0 === 0 && best.i1 === NX - 1 && best.j1 === NY - 1) return Rc;
    const W2 = Math.max(.25, (best.i1 - best.i0) / (NX - 1) * Rc.W), H2 = Math.max(.2, (best.j1 - best.j0) / (NY - 1) * Rc.H), q0 = at(best.i0, best.j0), q1 = at(best.i1, best.j1);
    return { W: W2, H: H2, c: { x: (q0.x + q1.x) / 2, y: (q0.y + q1.y) / 2, z: (q0.z + q1.z) / 2 } };
  }
  // [graffiti] la camera dell'anteprima: davanti alla superficie lungo la sua normale, puntata al centro della finestra, alla
  // distanza che la inquadra col margine (ortogonale: la misura è quella del riquadro più il 4%); near e far tengono lo
  // spessore della superficie (un rilievo davanti, un vano dietro), mai il cielo dietro né chi dipinge davanti. Per terra
  // guarda dall'alto (l'alto del disegno dove guardavi), sui mezzi dal lato scelto
  function tavCam(Rc, A) {
    const n = A.n, D = 3, m = 1.04, flat = Math.abs(n.y || 0) > .5;
    return { pos: { x: Rc.c.x + n.x * D, y: Rc.c.y + (n.y || 0) * D, z: Rc.c.z + n.z * D }, target: { x: Rc.c.x, y: Rc.c.y, z: Rc.c.z }, up: A.u || { x: 0, y: 1, z: 0 }, halfW: Rc.W / 2 * m, halfH: Rc.H / 2 * m, near: D - (flat ? .6 : .35), far: D + 9, dist: D };   // [tavoletta] dietro la superficie la vede lei stessa (la profondità): il far corto (0,9-1,2 m) tagliava una strada in pendenza, un muro arretrato o il portico, e la foto restava vuota
  }
  // la foto della zona: una camera ortogonale dritta davanti al muro (così il writer non c'è)
  // [tavoletta] con un margine attorno (il contesto: lo spigolo, le finestre, la strada; nel pannello si vede scurito) e la luce
  // regolata (di notte, o un intonaco chiaro e uniforme, la foto sembrava vuota). Ritorna la tela con .inner, il riquadro dove si
  // disegna, in pixel
  function tavShot(Rc, n, rx, mg) {
    const THREE = T3(), R = R_(), rend = R.__models && R.__models.renderer, sc = scene(); if (!rend || !sc) return null;
    mg = mg == null ? 1.12 : mg;
    const FW = Rc.W * mg + .2, FH = Rc.H * mg + .2, MAX = PHONE_K() < 1 ? 1400 : 2048, pw = FW >= FH ? MAX : Math.round(MAX * FW / FH), ph = FW >= FH ? Math.round(MAX * FH / FW) : MAX;
    const K = tavCam(Rc, TAV.a || { n, u: new THREE.Vector3(0, 1, 0) }), cam = new THREE.OrthographicCamera(-FW / 2, FW / 2, FH / 2, -FH / 2, K.near, K.far);
    cam.position.set(K.pos.x, K.pos.y, K.pos.z); cam.up.set(K.up.x, K.up.y, K.up.z); cam.lookAt(K.target.x, K.target.y, K.target.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const rt = new THREE.WebGLRenderTarget(pw, ph), prev = rend.getRenderTarget(), fr = TAV.frame; if (fr) fr.visible = false;
    const ar = rend.info.autoReset; rend.info.autoReset = false;
    rend.setRenderTarget(rt); rend.clear(); rend.render(sc, cam); const buf = new Uint8Array(pw * ph * 4); rend.readRenderTargetPixels(rt, 0, 0, pw, ph, buf); rend.setRenderTarget(prev); rt.dispose(); if (fr) fr.visible = true;
    rend.info.autoReset = ar;
    const c = cv(pw, ph), x = c.getContext('2d'), im = x.createImageData(pw, ph);
    for (let y = 0; y < ph; y++) im.data.set(buf.subarray((ph - 1 - y) * pw * 4, (ph - y) * pw * 4), y * pw * 4);   // la riga di sotto va su
    const iw = Math.round(pw * Rc.W / FW), ih = Math.round(ph * Rc.H / FH), inner = { x: Math.round((pw - iw) / 2), y: Math.round((ph - ih) / 2), w: iw, h: ih };
    tavLevels(im.data, pw, inner);
    x.putImageData(im, 0, 0); c.inner = inner; return c;
  }
  // la luce della foto: il contrasto del riquadro (dal 2° al 98° percentile) allargato fino a ×2,2 se è piatto, il centro portato almeno a
  // 120 se è buio (di notte), con un filo di gamma
  function tavLevels(d, pw, In) {
    const H = new Uint32Array(256); let n = 0;
    for (let y = In.y; y < In.y + In.h; y += 3) for (let x = In.x; x < In.x + In.w; x += 3) { const i = (y * pw + x) * 4, l = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8; H[l]++; n++; }
    if (!n) return; let a = 0, b = 255, acc = 0; for (let i = 0; i < 256; i++) { acc += H[i]; if (acc >= n * .02) { a = i; break; } } acc = 0; for (let i = 255; i >= 0; i--) { acc += H[i]; if (acc >= n * .02) { b = i; break; } }
    const span = Math.max(1, b - a), k = span < 150 ? Math.min(2.2, 150 / span) : 1, mid = (a + b) / 2, to = clamp(mid, 120, 205), g = mid < 70 ? .8 : 1, L = new Uint8ClampedArray(256);   // il tono del muro resta (il colore che scegli si confronta con quello), il buio si schiarisce
    for (let i = 0; i < 256; i++) { const v = clamp((i - mid) * k + to, 0, 255) / 255; L[i] = Math.round(Math.pow(v, g) * 255); }
    if (k < 1.05 && g === 1 && Math.abs(to - mid) < 4) return; for (let i = 0; i < d.length; i += 4) { d[i] = L[d[i]]; d[i + 1] = L[d[i + 1]]; d[i + 2] = L[d[i + 2]]; }
  }
  function tavRelease(st) {
    if (!TAV.a || TAV.pad) return;
    const A = TAV.a, Rc = tavFit(tavRect(), A), shot = tavShot(Rc, A.n, A.r);   // [graffiti] stretta alla superficie
    if (!shot) { tavClear(); return; }
    tavPad(st, shot, Rc, A);
  }
  // [graffiti2] il disegno salvato va sul muro subito (non aspetta il giro dei graffiti né il disegnatore a parte)
  function saveOnWall(w) {
    try {
      if (GFX.works[w.id]) return true;
      if (w.surf === 'treno') { const tgt = trainTarget(w); if (!tgt) return false; GFX.works[w.id] = { tgt, art: art(w), drawn: 0 }; drawUpTo(w, GFX.works[w.id]); return true; }
      if (!w.gfxRect) return false;
      const g = { art: art(w), drawn: 0 }; g.tgt = makeVeil(w, g.art); GFX.works[w.id] = g; drawUpTo(w, g); return true;
    } catch (e) { console.warn('[Writing] tavoletta', e); return false; }
  }
  // il pannello: la foto a tutto schermo, il disegno sopra, gli strumenti
  // [tavoletta] Rifatto: la foto ha il contesto attorno (scurito) e il riquadro dove si dipinge in giallo; la misura si sceglie con un
  // tocco (tag, throw-up, pezzo, burner: la foto si rifà attorno al punto toccato); il tratto si vede subito com'è nel gioco
  // (spessore minimo a schermo, la resa del pennello mentre disegni); «Salva sul muro» è sempre in vista, in basso, e se non può
  // salvare dice perché. Le stesse regole di prima per la vernice, la fama, i crossaggi.
  const TAV_SIZES = [['tag', 'Tag', 1.5, .75], ['throw', 'Throw-up', 2.7, 1.3], ['pezzo', 'Pezzo', 4.8, 2.05], ['burner', 'Burner', 6.6, 2.5]];
  function tavPad(st, shot, Rc, A) {
    if (typeof document === 'undefined') return;
    const TOUCH = matchMedia('(pointer: coarse)').matches, SMALL_UI = innerWidth < 560 || innerHeight < 480;   // [graffiti3] sul telefono (e nel Game Boy piccolo): tutto da dito
    let In = shot.inner || { x: 0, y: 0, w: shot.width, h: shot.height }, pw = In.w, ph = In.h;
    const strokes = []; let cur = null, tool = A.tool, colI = Math.max(0, TAV_COLS.findIndex(c => c[0] === A.col)), cm = tool === 'pennarello' ? 2.5 : 4;
    // [graffiti] i pennelli regolabili (pennelli.js): la bomboletta col suo tappo (standard, fat, skinny), il rullo, il pennarello; il flusso e le colature
    const PNs = PN ? [['spray', 'Bomboletta'], ['fat', 'Fat cap'], ['skinny', 'Skinny cap'], ['roller', 'Rullo'], ['marker', 'Pennarello']] : null;
    let pen = tool === 'pennarello' ? 'marker' : 'spray', flow = PN ? PN.PENNELLI[pen].flow : 1, dripK = PN ? PN.PENNELLI[pen].drip : 0;
    const el = (t, css, par) => { const e = document.createElement(t); if (css) e.style.cssText = css; if (par) par.appendChild(e); return e; };
    const box = el('div', 'position:fixed;inset:0;z-index:9999;background:rgba(10,9,8,.96);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:' + (SMALL_UI ? 4 : 8) + 'px;font:' + (SMALL_UI ? 13 : 14) + 'px system-ui,sans-serif;color:#eee;user-select:none;-webkit-user-select:none;touch-action:none;padding:max(6px,env(safe-area-inset-top,0)) 6px max(6px,env(safe-area-inset-bottom,0));box-sizing:border-box');
    const head = el('div', 'text-align:center;line-height:1.35;flex:none', box);
    const stage = el('div', 'flex:1 1 auto;min-height:0;width:100%;display:flex;align-items:center;justify-content:center', box);
    const wrap = el('div', 'position:relative;touch-action:none', stage);
    const bg = el('canvas', 'display:block;width:100%;height:100%', wrap);
    const pane = el('div', 'position:absolute;box-shadow:0 0 0 2px #ffe14a,0 0 0 4px rgba(0,0,0,.6);touch-action:none', wrap);   // il riquadro dove si dipinge
    const ink = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%', pane), live = el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;cursor:crosshair', pane);
    const rowT = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;flex:none', box);
    const rowA = el('div', 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;flex:none', box), rowS = el('span', 'display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:center;margin-right:10px', rowA);   // la misura e le azioni sulla stessa riga
    const info = el('div', 'min-height:1.3em;color:#ffcf6a;text-align:center;flex:none', box);
    const btn = (t, f, hot, par, big) => { const b = el('button', 'padding:' + (TOUCH || SMALL_UI ? '10px 14px;font-size:15px;' : '7px 14px;') + 'border-radius:6px;border:1px solid ' + (hot ? '#ff7a5c' : '#555') + ';cursor:pointer;color:#fff;font-weight:' + (big ? 700 : 400) + ';background:' + (hot ? '#d8402a' : '#34312c'), par || rowA); b.textContent = t; b.onclick = e => { e.preventDefault(); f(); }; return b; };
    // la foto e il riquadro
    function setShot(sh) {
      In = sh.inner || { x: 0, y: 0, w: sh.width, h: sh.height }; pw = In.w; ph = In.h;
      bg.width = sh.width; bg.height = sh.height; const x = bg.getContext('2d'); x.drawImage(sh, 0, 0);
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, sh.width, In.y); x.fillRect(0, In.y + In.h, sh.width, sh.height - In.y - In.h); x.fillRect(0, In.y, In.x, In.h); x.fillRect(In.x + In.w, In.y, sh.width - In.x - In.w, In.h);   // fuori dal riquadro: scurito
      pane.style.left = In.x / sh.width * 100 + '%'; pane.style.top = In.y / sh.height * 100 + '%'; pane.style.width = In.w / sh.width * 100 + '%'; pane.style.height = In.h / sh.height * 100 + '%';
      [ink, live].forEach(c => { c.width = pw; c.height = ph; });
      fit();
    }
    const fit = () => { const r = stage.getBoundingClientRect(), Wv = Math.max(80, r.width || innerWidth - 12), Hv = Math.max(80, r.height || innerHeight * .6), k = Math.min(Wv / bg.width, Hv / bg.height); wrap.style.width = bg.width * k + 'px'; wrap.style.height = bg.height * k + 'px'; };
    addEventListener('resize', fit);
    // la misura: si rifà la foto attorno al punto toccato (il disegno fatto si perde: lo dice)
    let sizeK = A.size || null; const sizeB = [];
    function reshoot(k) {
      const S0 = TAV_SIZES.find(q => q[0] === k); if (!S0) return;
      if (strokes.length && !reshoot.ok) { reshoot.ok = true; info.textContent = 'Cambiando misura il disegno si cancella: tocca di nuovo per confermare.'; setTimeout(() => { reshoot.ok = false; }, 2500); return; }
      reshoot.ok = false;
      const R0 = { W: S0[2], H: S0[3], c: { x: A.pt.x, y: A.pt.y, z: A.pt.z } }, R1 = tavFit(R0, A), sh = tavShot(R1, A.n, A.r); if (!sh) return;
      Rc = R1; strokes.length = 0; cur = null; sizeK = k; setShot(sh); upd(); drawLive(); render();
      info.textContent = R1.W < S0[2] - .05 || R1.H < S0[3] - .05 ? `Qui c'è posto per ${R1.W.toFixed(1)} × ${R1.H.toFixed(1)} m (il muro finisce o c'è un'apertura).` : '';
    }
    el('span', 'color:#aaa', rowS).textContent = 'Misura';
    TAV_SIZES.forEach(([k, t]) => { const b = btn(t, () => reshoot(k), false, rowS); b.dataset.k = k; sizeB.push(b); });
    // gli strumenti: il pennello, i colori (tutti in vista: un clic o i tasti 1-8), lo spessore
    let ps = null, fl = null, dr = null;
    if (PNs) {
      ps = el('select', 'padding:6px;border-radius:5px;background:#34312c;color:#fff;border:1px solid #555' + (TOUCH || SMALL_UI ? ';font-size:15px' : ''), rowT); PNs.forEach(([k, t]) => { const o = el('option', '', ps); o.value = k; o.textContent = t; }); ps.value = pen;
      ps.onchange = () => { const nt = ps.value === 'marker' ? 'pennarello' : 'bomboletta'; if (OG() && !(inv0()[nt] > 0)) { info.textContent = nt === 'bomboletta' ? 'Non hai bombolette.' : 'Non hai pennarelli.'; ps.value = pen; return; } pen = ps.value; tool = nt; flow = PN.PENNELLI[pen].flow; dripK = PN.PENNELLI[pen].drip; if (fl) fl.value = Math.round(flow * 100); if (dr) dr.value = Math.round(dripK * 100);
        sl.max = pen === 'roller' ? 60 : 30; if (pen === 'roller' && cm < 12) cm = 20; if (pen === 'skinny' && cm > 4) cm = 2; if (pen === 'fat' && cm < 6) cm = 8; sl.value = cm; upd(); render(); };
    } else { const tb = btn('', () => { const nt = tool === 'pennarello' ? 'bomboletta' : 'pennarello'; if (OG() && !(inv0()[nt] > 0)) { info.textContent = nt === 'bomboletta' ? 'Non hai bombolette.' : 'Non hai pennarelli.'; return; } tool = nt; pen = nt === 'pennarello' ? 'marker' : 'spray'; upd(); render(); }, false, rowT); tb.dataset.tool = 1; }
    const pal = el('span', 'display:inline-flex;gap:' + (TOUCH || SMALL_UI ? 6 : 4) + 'px', rowT);
    const sw = TAV_COLS.map((c, i) => { const b = el('button', (TOUCH || SMALL_UI ? 'width:34px;height:34px;' : 'width:26px;height:26px;') + 'border-radius:50%;cursor:pointer;border:2px solid #222;padding:0;background:' + c[0], pal); b.title = c[1] + ' (' + (i + 1) + ')'; b.onclick = () => { colI = i; upd(); render(); }; return b; });
    const sl = el('input'); sl.type = 'range'; sl.min = 1; sl.max = 30; sl.value = cm; sl.style.width = SMALL_UI ? '90px' : '120px'; sl.oninput = () => { cm = +sl.value; upd(); render(); };
    const lab = el('label', 'color:#bbb;display:inline-flex;align-items:center;gap:4px', rowT); lab.append('spessore ', sl); const cmT = el('span', 'color:#fff;min-width:3.2em', lab);
    if (PNs && !SMALL_UI) {   // [graffiti] le manopole del pennello (sul piccolo restano quelle del pennello scelto)
      const mk = (t, v, f) => { const r = el('input'); r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(v * 100); r.style.width = '90px'; r.oninput = () => { f(+r.value / 100); render(); }; const l = el('label', 'color:#bbb;display:inline-flex;align-items:center;gap:4px', rowT); l.append(t + ' ', r); return r; };
      fl = mk('flusso', flow, v => { flow = v; }); dr = mk('colature', dripK, v => { dripK = v; });
    }
    btn('↶ Annulla', () => { strokes.pop(); drawLive(); render(); upd(); });
    btn('Pulisci', () => { strokes.length = 0; drawLive(); render(); upd(); });
    btn('Esci', () => close());
    const save = btn('Salva sul muro', () => apply(), true, rowA, true);
    // in cima: dove sei, quanto è grande, che lavoro diventa, quante bombolette
    const W0 = S(st), styleOf = () => tool === 'pennarello' ? 'mtag' : Rc.W * Rc.H > 3.5 ? 'pezzo' : Rc.W * Rc.H > 1.2 ? 'throw' : 'tag';
    let place = ''; try { const q = G.nearestPlace ? G.nearestPlace(Rc.c.x, Rc.c.z) : null; place = q && q.name || ''; } catch (e) { }
    const inv0 = () => (OG() ? OG().inv(st) : {}) || {};
    const upd = () => {
      const tb = rowT.querySelector('button[data-tool]'); if (tb) tb.textContent = tool === 'pennarello' ? 'Pennarello' : 'Bomboletta';
      sw.forEach((b, i) => { b.style.borderColor = i === colI ? '#ffe14a' : '#222'; b.style.transform = i === colI ? 'scale(1.18)' : ''; });
      sizeB.forEach(b => { const on = b.dataset.k === sizeK; b.style.background = on ? '#5a4a1a' : '#34312c'; b.style.borderColor = on ? '#ffe14a' : '#555'; });
      const sty = STYLES[styleOf()], inv = inv0(), have = tool === 'pennarello' ? inv.pennarello || 0 : inv.bomboletta || 0;
      head.innerHTML = '';
      const t1 = el('div', 'font-size:' + (SMALL_UI ? 14 : 16) + 'px;color:#ffe14a', head); t1.textContent = `${sty ? sty.nome[0].toUpperCase() + sty.nome.slice(1) : 'Tavoletta'} di ${playerAka(st)}${W0.crew ? ' ' + W0.crew : ''} · ${Rc.W.toFixed(1)} × ${Rc.H.toFixed(1)} m${place && !SMALL_UI ? ' · ' + place : ''}`;
      const t2 = el('div', 'color:#aaa;font-size:12px', head); t2.textContent = `${TOUCH ? 'Disegna col dito dentro il riquadro giallo.' : 'Disegna dentro il riquadro giallo (la pressione della penna conta). 1-8 colori · Ctrl+Z annulla · Invio salva · Esc esce.'} ${tool === 'pennarello' ? 'Pennarelli' : 'Bombolette'}: ${have}`;
      cmT.textContent = cm + ' cm';
      save.style.opacity = strokes.length && have > 0 ? '1' : '.55';
    };
    box.appendChild(info);
    document.body.appendChild(box); setShot(shot); upd(); requestAnimationFrame(fit);
    const pxm = () => pw / Rc.W, wpx = () => cm / 100 * pxm();
    const pos = e => { const b = live.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * pw, (e.clientY - b.top) / b.height * ph]; };
    live.addEventListener('pointerdown', e => { e.preventDefault(); live.setPointerCapture(e.pointerId); const [x, y] = pos(e); cur = [[x, y, e.timeStamp, e.pressure || .5]]; strokes.push(cur); info.textContent = ''; drawLive(); });
    live.addEventListener('pointermove', e => { if (!cur) return; const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => { const [x, y] = pos(ev), l = cur[cur.length - 1]; if (hyp(x - l[0], y - l[1]) < 1.5) return; cur.push([x, y, ev.timeStamp, ev.pressure || .5]); }); drawLive(); });
    const end = () => { if (!cur) return; cur = null; drawLive(); render(); upd(); }; live.addEventListener('pointerup', end); live.addEventListener('pointercancel', end);
    // mentre si disegna: il tratto pieno, mai più sottile di 3 px a schermo (prima su un riquadro grande era un filo da 1 px, e
    // col nero su un muro scuro non si vedeva); appena staccato: la resa del gioco
    function drawLive() {
      const x = live.getContext('2d'); x.clearRect(0, 0, pw, ph); if (!cur) return;
      const k = live.getBoundingClientRect().width / pw || 1, lw = Math.max(wpx(), 3 / k), col = TAV_COLS[colI][0];
      x.lineCap = x.lineJoin = 'round'; x.beginPath(); cur.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]));
      const lum = parseInt(col.slice(1, 3), 16) * .3 + parseInt(col.slice(3, 5), 16) * .59 + parseInt(col.slice(5, 7), 16) * .11;
      x.strokeStyle = lum < 90 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.45)'; x.lineWidth = lw + 2 / k; x.stroke();   // il bordo che lo stacca dal muro
      x.strokeStyle = col; x.lineWidth = lw; x.stroke();
    }
    const rec = () => Object.assign({ strokes: strokes.map(s => s.map(q => [q[0], q[1], q[2] - strokes[0][0][2], q[3]])), wpx: wpx(), frame: { w: pw, h: ph } }, PNs ? { pen, cfg: { flow, drip: dripK } } : {});
    function render() { const x = ink.getContext('2d'); x.clearRect(0, 0, pw, ph); if (!strokes.length) return; try { if (PNs) PN.drawStrokes(x, rec(), pw, ph, TAV_COLS[colI][0], mulberry(11)); else WriterMano.drawRecorded(x, rec(), { seed: 7 }, pw, ph, mulberry(11), TAV_COLS[colI][0], tool === 'pennarello' ? 'mtag' : 'tag'); } catch (e) { console.error(e); } }
    const keys = e => { e.stopPropagation(); if (e.type !== 'keydown') return;
      if (e.key === 'Escape') close(); else if (e.key === 'Enter') { e.preventDefault(); apply(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); strokes.pop(); drawLive(); render(); upd(); }
      else if (/^[1-8]$/.test(e.key)) { colI = +e.key - 1; upd(); render(); } }; addEventListener('keydown', keys, true); addEventListener('keyup', keys, true);
    function close() { removeEventListener('keydown', keys, true); removeEventListener('keyup', keys, true); removeEventListener('resize', fit); box.remove(); TAV.pad = null; TAV.api = null; tavClear(); GFX.held = false; }
    function apply() {
      if (!strokes.length) { info.textContent = 'Prima disegna qualcosa dentro il riquadro giallo (Esci per uscire).'; return; }
      if (OG() && !(inv0()[tool] > 0)) { info.textContent = tool === 'bomboletta' ? 'Senza bombolette non si salva: comprane in ferramenta (o scegli il pennarello).' : 'Senza pennarello non si salva.'; return; }
      try {
        const W = S(st), inv = OG() ? OG().inv(st) : null, r = rec(), pxM = pxm();
        let len = 0; r.strokes.forEach(s => s.forEach((q, i) => { if (i) len += hyp(q[0] - s[i - 1][0], q[1] - s[i - 1][1]); })); const lenM = len / pxM, cmM = cm / 100;
        // la vernice: la bomboletta copre un po' meno di un metro quadro di tratto, il pennarello una ventina di metri di linea
        if (inv && tool === 'bomboletta') { W.canUse = (W.canUse || 0) + lenM * cmM / .8; while (W.canUse >= 1 && inv.bomboletta > 0) { inv.bomboletta--; W.canUse -= 1; } if (!inv.bomboletta) delete inv.bomboletta; }
        if (inv && tool === 'pennarello') { W.mkUse = (W.mkUse || 0) + lenM / 20; if (W.mkUse >= 1 && inv.pennarello > 0) { W.mkUse -= 1; inv.pennarello--; if (!inv.pennarello) delete inv.pennarello; } }
        const area = Rc.W * Rc.H, style = tool === 'pennarello' ? 'mtag' : area > 3.5 ? 'pezzo' : area > 1.2 ? 'throw' : 'tag', THREE = T3();
        let where = ''; try { const q = G.nearestPlace ? G.nearestPlace(st.player.x, st.player.y) : null; where = q && q.name ? 'a ' + q.name : ''; } catch (e) { }   // [tavoletta] lontano da tutto nearestPlace non trova niente: prima qui il salvataggio si fermava
        const nw = { by: 'player', aka: playerAka(st), crew: W.crew, style, tool, col: TAV_COLS[colI][0], rec: r, pal: 0, seed: Math.floor(rnd() * 1e9), prog: 1, done: false, surf: 'muro', place: where, W: Rc.W, H: Rc.H, hand: W.hand || (W.hand = Math.floor(rnd() * 1e9)) };
        nw.gfxRect = { c: new THREE.Vector3(Rc.c.x, Rc.c.y, Rc.c.z), n: A.n.clone(), r: A.r.clone(), W: Rc.W, H: Rc.H, obj: A.obj }; nw.pos = { x: Rc.c.x, y: Rc.c.y, z: Rc.c.z };
        nw.gfxRect.u = A.u.clone();
        const ud = A.obj && A.obj.userData || {}, car = ud.car, wag = ud.wag;
        if (car) { const tr = trainAt(st.t), q = carPose(tr, car.i), c = Math.cos(q.ang), sn = Math.sin(q.ang), uOf = (x, z) => { const al = (x - q.x) * c + (z - q.y) * sn; return car.side ? al + q.L / 2 : q.L / 2 - al; };   // [writer] sul treno fermo: il disegno diventa un lavoro della fiancata
          const uL = uOf(Rc.c.x - A.r.x * Rc.W / 2, Rc.c.z - A.r.z * Rc.W / 2), uR = uOf(Rc.c.x + A.r.x * Rc.W / 2, Rc.c.z + A.r.z * Rc.W / 2), Wc = Math.min(Rc.W, q.L - .2);
          Object.assign(nw, { surf: 'treno', car: car.i, side: car.side, u0: clamp(Math.min(uL, uR), .1, q.L - Wc - .1), vb: clamp(Rc.c.y - Rc.H / 2 - q.h - BODY_Y, 0, SIDE_H - .2), W: Wc, H: Math.min(Rc.H, SIDE_H - .1), style: Rc.W * Rc.H > 20 ? 'wholecar' : nw.style }); nw.gfxRect = null; }
        else if (wag && GFX.yard && GFX.yard[wag.key + ':' + wag.k]) { nw.surf = 'vagone'; nw.cons = wag.key; nw.wk = wag.k; nw.gfxRect.obj = GFX.yard[wag.key + ':' + wag.k].g; nw.gfxRect.veh = true; }   // il carro fermo: il velo parte con lui
        else { const vid = vehOf(A.obj); if (vid) { const v = st.vehicles.find(x => x.id === vid); nw.surf = 'auto'; nw.veh = vid; nw.gfxRect.obj = vehGroup(vid); nw.gfxRect.veh = true; if (v) vehAnchor(nw, v, nw.gfxRect.c); if (v && v.police) nw.cop = true; } else nw.sup = surfOf({ obj: A.obj }, Rc.c.x - A.n.x * .3, Rc.c.z - A.n.z * .3); }
        addWork(st, nw); let m = null; try { m = nw.surf === 'treno' ? judgeTrain(st, nw) : judge(st, nw); } catch (e) { console.warn('[Writing] tavoletta, giudizio', e); } if (m) G.feed(st, m, /crossato/.test(m) ? 'bad' : 'info');
        try { finish(st, nw); } catch (e) { console.warn('[Writing] tavoletta, fine', e); nw.done = true; nw.prog = 1; }   // [tavoletta] la città che reagisce non deve fermare il salvataggio
        try { G.emit(st, 'graffito'); } catch (e) { }
        if (!saveOnWall(nw)) { nw.gfxFail = 0; W.__dirty = true; }   // il giro dei graffiti lo rimette al suo posto
        close();
        try { G.feed(st, `${STYLES[nw.style].nome[0].toUpperCase() + STYLES[nw.style].nome.slice(1)} salvato sul muro.`, 'good'); } catch (e) { }
      } catch (e) { console.warn('[Writing] tavoletta', e); info.textContent = 'Non sono riuscito a salvarlo: riprova (o Esci).'; }
    }
    // [tavoletta] i tasti del Game Boy (main.js conMap): A salva, B esce, la croce cambia colore (◄ ►) e spessore (▲ ▼), annulla col tasto bomboletta
    TAV.api = { apply, close, undo: () => { strokes.pop(); drawLive(); render(); upd(); }, col: d => { colI = (colI + d + TAV_COLS.length) % TAV_COLS.length; upd(); render(); info.textContent = 'Colore: ' + TAV_COLS[colI][1]; }, size: d => { cm = clamp(cm + d, 1, +sl.max); sl.value = cm; upd(); render(); } };
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
      nw.sup = surfOf({ obj: h.object }, c.x - nn.x * .3, c.z - nn.z * .3);   // [graffiti] la grana del muro per i pennelli
      { const vid = vehOf(h.object); if (vid) { const v = st.vehicles.find(x => x.id === vid); nw.surf = 'auto'; nw.veh = vid; nw.gfxRect.obj = vehGroup(vid); nw.gfxRect.veh = true; if (v) vehAnchor(nw, v, c); if (v && v.police) { G.feed(st, 'Stai bombando una volante dei Grigi. Se ti vedono, è finita.', 'bad'); nw.cop = true; } } }
      addWork(st, nw); W.cur = nw;
      const g = { art: art(nw), drawn: 0 };
      if (Math.abs(nn.y) > .5) { // per terra (le tag): il velo steso, l'alto del disegno lontano da te ([graffiti] col suo verso nel riquadro: si rifà uguale)
        const u = new THREE.Vector3(c.x - p.x, 0, c.z - p.y); if (u.lengthSq() < 1e-4) u.set(Math.cos(p.face || 0), 0, Math.sin(p.face || 0)); u.normalize(); nw.gfxRect.u = u; nw.gfxRect.r = new THREE.Vector3().crossVectors(u, nn).normalize();
      }
      g.tgt = makeVeil(nw, g.art);
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
  function release(st) { if (TAV.a) { tavRelease(st); GFX.held = false; return; } const W = S(st); if (W.cur && !W.cur.done) { const w = W.cur; G.feed(st, `${STYLES[w.style].nome[0].toUpperCase() + STYLES[w.style].nome.slice(1)} al ${Math.round(w.prog * 100)}%: clicca sopra per riprendere.`); } W.cur = null; GFX.held = false; W.__dirty = true; }
  // main.js: con questo attrezzo e questa modalità ci pensa il writing (non lo spruzzo libero)
  const wants = (st, tool) => tool === 'pennarello' || (tool === 'bomboletta' && mode(st) !== 'libero');

  // ---------------- [graffiti] QUELLO CHE DIPINGI RESTA ----------------
  // I lavori tuoi (muri, saracinesche, porte, pali, cassonetti, per terra, il treno, i carri, i mezzi) si salvano nel browser
  // (localStorage, SAVE_KEY) con la chiave stabile del posto: per un muro la casa, la faccia e la posizione sulla faccia
  // (anc.key = casa:faccia:lungo:altezza) col centro e la normale nel mondo (la città è la stessa a ogni partita); per un mezzo
  // il suo id e il punto sulla carrozzeria (lato, lungo, quota); per il treno la vettura e il lato. A ogni partita nuova (anche
  // ricaricando la pagina) tornano dove erano. Il velo si libera quando ti allontani (oltre 140 m) e si rifà uguale tornando: il
  // riquadro resta nel lavoro, non dipende dai settori caricati. Un mezzo che sparisce dal traffico si porta via il lavoro e lo
  // riporta quando ricompare (stesso id). Al massimo SAVE_MAX lavori: oltre i tre quarti i più vecchi sbiadiscono, oltre il
  // massimo il più vecchio se ne va (lo coprono gli altri).
  const SAVE_KEY = 'pv.graffiti.v1', SAVE_MAX = 220;
  const LS = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
  const SKIP = new Set(['gfxRect', 'pos', 'id', 'over', 'live', 'gfxFail', 'cur', 'covered']);
  function faceKey(c, n) {
    const tx = Math.floor((c.x - n.x * .4) / TS), ty = Math.floor((c.z - n.z * .4) / TS), bi = G.bIndex && tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH ? G.bIndex[ty * G.GW + tx] : -1, b = bi >= 0 ? B[bi] : null;
    const f = Math.abs(n.y || 0) > .5 ? 'T' : Math.abs(n.x) > Math.abs(n.z) ? (n.x > 0 ? 'E' : 'W') : (n.z > 0 ? 'S' : 'N');
    const u = !b ? 0 : f === 'S' || f === 'N' ? c.x - b.x * TS : c.z - b.y * TS, y = c.y - (b ? (G.MAP.elev[ty * G.GW + tx] || 0) : 0);
    return `${bi}:${f}:${u.toFixed(2)}:${y.toFixed(2)}`;
  }
  function anchorOf(w) {
    if (w.surf === 'auto') return { k: 'auto', veh: w.veh, side: w.side, du: w.du, vy: w.vy };
    if (w.surf === 'treno') return { k: 'treno', car: w.car, side: w.side, u0: w.u0, vb: w.vb };
    if (w.surf === 'vagone') return { k: 'vagone', cons: w.cons, wk: w.wk, side: w.side, u0: w.u0, vb: w.vb };
    const R = w.gfxRect || null, a = w.anc && w.anc.k === 'muro' ? w.anc : null; if (!R) return a;
    const r3 = v => Math.round(v * 1000) / 1000;
    return { k: 'muro', key: faceKey(R.c, R.n), c: [r3(R.c.x), r3(R.c.y), r3(R.c.z)], n: [r3(R.n.x), r3(R.n.y || 0), r3(R.n.z)], u: R.u ? [r3(R.u.x), r3(R.u.y), r3(R.u.z)] : undefined, free: !!(a && a.free) || !!w.rec };
  }
  const plain = v => { if (v == null || typeof v !== 'object') return typeof v === 'function' ? undefined : v; if (v.isVector3 || v.isObject3D) return undefined; return JSON.parse(JSON.stringify(v)); };
  function salva(st) {
    const st0 = st || GFX.st, ls = LS(); if (!st0 || !st0.wr) return false; const W = st0.wr; W.__dirty = false; if (!ls) return false;
    let mine = W.works.filter(w => w.by === 'player' && !w.erased && (w.done || w.prog > 0) && (w.gfxRect || w.anc || w.surf === 'treno' || w.surf === 'auto' || w.surf === 'vagone'));
    mine.sort((a, b) => (a.t0 || 0) - (b.t0 || 0));
    // il tetto: i più vecchi sbiadiscono, oltre il massimo se ne vanno
    if (mine.length > SAVE_MAX) { mine.slice(0, mine.length - SAVE_MAX).forEach(w => { w.erased = true; w.sbiadito = 6; }); mine = mine.slice(-SAVE_MAX); }
    const soglia = Math.floor(SAVE_MAX * .75); mine.forEach((w, i) => { const over = mine.length - soglia; if (over > 0 && i < over) { const lv = Math.min(6, 1 + Math.floor((over - i) / Math.max(1, over) * 5)); if ((w.sbiadito || 0) !== lv) { w.sbiadito = lv; const g = GFX.works[w.id]; if (g && w.surf !== 'treno') { freeVeil(g); delete GFX.works[w.id]; } } } });
    const out = mine.map(w => { const o = {}; for (const k in w) { if (SKIP.has(k) || k.startsWith('__')) continue; const v = plain(w[k]); if (v !== undefined) o[k] = v; } o.anc = anchorOf(w); return o; }).filter(o => o.anc);
    try { ls.setItem(SAVE_KEY, JSON.stringify({ v: 1, aka: W.aka || null, crew: W.crew || null, hand: W.hand || null, works: out })); return true; }
    catch (e) { try { ls.setItem(SAVE_KEY, JSON.stringify({ v: 1, aka: W.aka || null, crew: W.crew || null, hand: W.hand || null, works: out.filter(o => !o.rec).slice(-120) })); } catch (e2) { } return false; }   // pieno: senza i disegni a mano, i più nuovi
  }
  function carica(st, W) {
    const ls = LS(); if (!ls || W.__caricato) return 0; W.__caricato = true; let D = null;
    try { D = JSON.parse(ls.getItem(SAVE_KEY) || 'null'); } catch (e) { D = null; } if (!D || !Array.isArray(D.works)) return 0;
    if (D.aka && !W.aka) W.aka = D.aka; if (D.crew && !W.crew) W.crew = D.crew; if (D.hand && !W.hand) W.hand = D.hand;
    let n = 0;
    D.works.forEach(o => { const w = Object.assign({}, o); w.id = W.nextId++; w.saved = true; w.gfxRect = null; const a = w.anc || {};
      if (a.k === 'muro') { if (!a.c || !a.n) return; w.surf = w.surf || 'muro'; w.spot = null; w.pos = { x: a.c[0], y: a.c[1], z: a.c[2] }; }
      else if (a.k === 'auto') Object.assign(w, { surf: 'auto', veh: a.veh, side: a.side, du: a.du, vy: a.vy });
      else if (a.k === 'treno') Object.assign(w, { surf: 'treno', car: a.car, side: a.side, u0: a.u0, vb: a.vb });
      else if (a.k === 'vagone') Object.assign(w, { surf: 'vagone', cons: a.cons, wk: a.wk, side: a.side, u0: a.u0, vb: a.vb });
      else return;
      if (!w.done) { w.done = true; w.prog = 1; }   // a metà quando hai chiuso: resta com'era fatto (il disegno intero non si ripete, la fama sì)
      W.works.push(w); n++;
      if (w.surf === 'treno') (W.train.sides[w.car + ':' + w.side] = W.train.sides[w.car + ':' + w.side] || []).push(w.id); });
    return n;
  }
  const segna = st => { const W = st && st.wr; if (W) W.__dirty = true; };
  if (typeof addEventListener === 'function') { try { addEventListener('pagehide', () => { if (GFX.st) salva(GFX.st); }); addEventListener('beforeunload', () => { if (GFX.st) salva(GFX.st); }); } catch (e) { } }
  // il tetto dei veli vivi: oltre VEIL_MAX si liberano i più lontani dalla camera (tornando vicino si rifanno)
  function capVeils(W, cx, cy, byId) {
    const L = []; for (const id in GFX.works) { const g = GFX.works[id], w = g && g.tgt && g.tgt.mesh && !g.tgt.atl ? (byId ? byId.get(+id) : W.works.find(o => o.id === +id)) : null; if (w && w.surf !== 'treno' && w !== W.cur && w.pos) L.push([hyp(w.pos.x - cx, w.pos.z - cy), id]); }
    GFX.mem.vivi = L.length; const M = VEIL_MAX(); if (L.length <= M) return; L.sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < L.length - M; k++) { freeVeil(GFX.works[L[k][1]]); delete GFX.works[L[k][1]]; }
  }
  // [graffiti] LA MISURA: quanti lavori sui muri galleggiano (come strumenti/graffiti_sonda.js e la prova): un punto del velo
  // (griglia 5 × 4) a più di 2 cm dal muro sotto, o niente muro sotto (oltre uno spigolo, nel vuoto), o sopra un'apertura vera
  function galleggia() {
    const THREE = T3(), st = GFX.st; if (!THREE || !st) return null; const W = S(st), out = { n: 0, gall: 0, aperture: 0, lista: [] };
    for (const id in GFX.works) {
      const g = GFX.works[id], w = W.works.find(o => o.id === +id); if (!w || !g.tgt || !g.tgt.mesh || g.tgt.decal || w.surf !== 'muro' || !w.gfxRect || Math.abs(w.gfxRect.n.y || 0) > .5) continue;
      const m = g.tgt.mesh; m.updateMatrixWorld(true); const n = new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld), list = cands(m.position.x, m.position.z), O = w.rec ? [] : openingsAt(m.position, n);
      let worst = 0, bad = 0, ap = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
        const p = new THREE.Vector3((i / 4 - .5) * .96 * w.gfxRect.W, (j / 3 - .5) * .96 * w.gfxRect.H, 0).applyMatrix4(m.matrixWorld), o = p.clone().addScaledVector(n, .5);
        const h = rayWall(o, n.clone().negate(), 1.5, list), d = h ? Math.abs(h.p.distanceTo(o) - .5) : 9; worst = Math.max(worst, d); if (d > .02) bad++;
        if (O.length && inOpening(O, p.x, p.y, p.z)) ap++;
      }
      out.n++; if (bad || ap) { out.gall++; if (ap) out.aperture++; out.lista.push({ id: w.id, style: w.style, by: w.by, peggio: +worst.toFixed(3), punti: bad, aperture: ap }); }
    }
    return out;
  }
  // [graffiti2] I MURI GIÀ DIPINTI. Ogni 150 ms i lavori vicini alla camera senza grafica trovano il muro (placeWall) e
  // chiedono il disegno (artFor). Di regola 6 ms per giro e solo se le costruzioni hanno tempo; ma all'avvio, dopo un salto
  // della camera o quando attorno non c'è ancora niente di dipinto si va di corsa (RUSH: 30 ms e senza aspettare il turno),
  // così la città ha subito i suoi muri dipinti invece di riempirsi a uno a uno in mezzo minuto.
  const RUSH = { until: 0, cx: null, cy: null };
  // [fluido] la lista dei vicini si rifà ogni 150 ms come prima, ma il lavoro (i raggi di placeWall, i veli) si spalma su tutti i
  // fotogrammi: 1 ms a fotogramma di regola, 5 di corsa (prima 6 e 30 ms tutti in un fotogramma ogni 150 ms: uno scatto ogni 9
  // fotogrammi, e sul telefono «di corsa» durava finché attorno c'erano meno di 12 lavori disegnati, cioè quasi sempre fuori città)
  function scanList(st, W, cx, cy, now, force) {
    if (RUSH.cx == null || hyp(cx - RUSH.cx, cy - RUSH.cy) > 60) { RUSH.until = now + 12000; W.works.forEach(w => { if (w.gfxFail > 3 && !w.gfxRect) w.gfxFail = 2; }); }   // partita nuova o salto: si riempie di corsa ([graffiti] e chi non aveva trovato il muro riprova: il settore magari non c'era)
    RUSH.cx = cx; RUSH.cy = cy;
    const near = W.works.filter(w => !GFX.works[w.id] && !w.erased && !(w.gfxFail > 3)).map(w => { const sp = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); if (w.surf === 'vagone') { const c = consOf(st, w.cons), q = c && wagPose(st, c, w.wk); return [w, q ? hyp(q.x - cx, q.y - cy) : 1e9]; } if (w.surf === 'auto') { const v = st.vehicles.find(x => x.id === w.veh); return [w, v && !v.hidden ? hyp(v.x - cx, v.y - cy) : 1e9]; }   /* [graffiti] il mezzo: dov'è adesso */ return [w, w.surf === 'treno' ? 0 : sp ? hyp(sp.x - cx, sp.y - cy) : 1e9]; }).filter(a => a[1] < 80).sort((a, b) => a[1] - b[1]).map(a => a[0]);
    let shown = 0; for (const id in GFX.works) { const g = GFX.works[id]; if (g.tgt && g.tgt.mesh && hyp(g.tgt.mesh.position.x - cx, g.tgt.mesh.position.z - cy) < 40) shown++; }
    return { near, rush: force || now < RUSH.until || (shown < 12 && near.length > 0) };
  }
  function scanNear(st, cx, cy, opt) {
    const W = S(st), now = performance.now(), force = !!(opt && opt.force);
    if (force || now - (GFX.scanT || 0) > 150 || !GFX.scanL) { GFX.scanT = now; GFX.scanL = scanList(st, W, cx, cy, now, force); GFX.scanI = 0; }
    const L = GFX.scanL, rush = L.rush, cap = opt && opt.ms ? opt.ms : force ? 30 : rush ? 5 : 1;
    // [audit] il lavoro piazzato a metà passa davanti (la lista si rifà ogni 150 ms e lui potrebbe scivolare indietro: si butterebbe il fatto)
    if (GFX.pw && (GFX.works[GFX.pw.w.id] || GFX.pw.w.erased || GFX.pw.w.gfxRect)) GFX.pw = null;
    let near = L.near; if (GFX.pw) { const k = near.indexOf(GFX.pw.w); if (k > GFX.scanI) { near = near.slice(); near.splice(k, 1); near.splice(GFX.scanI, 0, GFX.pw.w); L.near = near; } }
    let n = 0; const t0 = performance.now();
    for (let first = true; ARTW.q.length && (first || performance.now() - t0 < cap); first = false) ARTW.q.shift()();   // i disegni rimasti indietro dal worker (almeno uno per giro)
    for (; GFX.scanI < near.length; GFX.scanI++) { const w = near[GFX.scanI];
      if (performance.now() - t0 > cap) break;   /* [fluido] al massimo 1 ms di graffiti nuovi a fotogramma (di corsa 5) */
      const CB = typeof window !== 'undefined' && window.Costruzioni; if (!rush && CB && !CB.ok(undefined, 'graffiti')) break;   // [fluido] e solo se nel fotogramma c'è ancora tempo per costruire
      if (GFX.works[w.id] || w.erased || w.gfxFail > 3) continue;
      if (ARTW.pend.has(w.id)) continue;   // [fluido] il disegno è in preparazione
      if (ARTW.pend.size >= (rush ? 24 : 8)) break;   // [graffiti2] non più di tanti in coda al disegnatore
      if ((GFX.mem.vivi || 0) + ARTW.pend.size >= VEIL_MAX() && w.surf !== 'treno') break;   // [graffiti] il tetto dei veli: i più vicini hanno già il loro
      // [fluido] il disegno arriva da artFor (memoria, worker o qui); il velo si fa quando c'è, se il lavoro serve ancora
      const ready = fn => { ARTW.pend.add(w.id); artFor(w, A => { ARTW.pend.delete(w.id); if (GFX.st !== st || GFX.works[w.id] || w.erased) return; try { fn(A); } catch (e) { w.gfxFail = (w.gfxFail || 0) + 1; } }); };
      if (w.surf === 'treno') { if (!GFX.train) continue; const tgt = trainTarget(w); if (!tgt) continue; ready(A => { GFX.works[w.id] = { tgt, art: A, drawn: 0 }; }); n++; continue; }
      if (w.surf === 'vagone') { if (!w.gfxRect) { const rc2 = wagRect(w); if (!rc2) continue; w.gfxRect = rc2; } w.pos = { x: w.gfxRect.c.x, y: w.gfxRect.c.y, z: w.gfxRect.c.z }; ready(A => { const g = { art: A, drawn: 0 }; g.tgt = makeVeil(w, g.art); GFX.works[w.id] = g; }); n++; continue; }   // [ferrovia] sui carri fermi
      const sp = w.surf === 'auto' ? (st.vehicles.find(x => x.id === w.veh) || null) : w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); if (!sp || hyp(sp.x - cx, sp.y - cy) > 80) continue;
      if (!w.gfxRect) {   // [audit] a dosi: il lavoro in corso si riprende al fotogramma dopo (vedi fitWallG)
        if (!GFX.pw || GFX.pw.w !== w) GFX.pw = { w, it: placeWallG(w) };
        const tp = performance.now(); let r; do r = GFX.pw.it.next(); while (!r.done && performance.now() - t0 < cap); if (CB) CB.add(performance.now() - tp, 'graffiti');
        if (!r.done) break;
        GFX.pw = null; if (!r.value) { w.gfxFail = (w.gfxFail || 0) + 1; continue; } }
      ready(A => { const tv = performance.now(), g = { art: A, drawn: 0 }; g.tgt = makeVeil(w, g.art); GFX.works[w.id] = g; drawUpTo(w, g); if (CB) CB.add(performance.now() - tv, 'graffiti'); }); n++;
    }
    return n;
  }
  // ---------------- OGNI FOTOGRAMMA ----------------
  function frame(once) {
    try {
      const pv = window.__pv, R = pv && pv.R, st = pv && pv.st;
      if (R && R.__models && R.__models.scene && st && window.THREE && R.__bmb) {
        const sc = R.__models.scene;
        if (GFX.st !== st) {   // una partita nuova: via i veli, il treno si ridipinge da capo
          Object.values(GFX.works).forEach(g => { if (g.tgt && g.tgt.mesh && g.tgt.mesh.parent) g.tgt.mesh.parent.remove(g.tgt.mesh); }); GFX.works = {}; atlReset();
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
        if (GFX.train && !GFX.noRail) yardFrame(st, sc, cx, cy);   // [ferrovia] i carri fermi negli scali (e quelli che partono)
        // i lavori: quelli che non hanno ancora la grafica (della notte, o di prima) vicino alla camera
        scanNear(st, cx, cy);
        if (W.__dirty && performance.now() - (GFX.saveT || 0) > 4000) { GFX.saveT = performance.now(); salva(st); }   // [graffiti] quello che hai dipinto resta (anche ricaricando)
        // disegno: i lavori finiti in un colpo, quelli in corso fin dove sono arrivati; i cancellati via; i lontani si liberano
        const byId = new Map(W.works.map(o => [o.id, o])); let nMove = 0;
        capVeils(W, cx, cy, byId);   // [graffiti] il tetto dei veli vivi
        for (const id in GFX.works) {
          const g = GFX.works[id], w = byId.get(+id);
          if (w && w.surf === 'auto') { const v = st.vehicles.find(x => x.id === w.veh); if (v && v.wreck) { w.erased = true; } else if (!v || v.hidden) { freeVeil(g); delete GFX.works[id]; w.gfxRect = null; continue; } else if (g.tgt && g.tgt.mesh) {   /* [graffiti] il mezzo sparito dal traffico (o nascosto): il lavoro resta suo, torna quando torna lui */ let o = g.tgt.mesh; while (o.parent) o = o.parent; if (o !== sc) { freeVeil(g); delete GFX.works[id]; w.gfxRect = null; continue; } w.pos = { x: v.x, y: w.pos ? w.pos.y : 1, z: v.y }; } }
          if (w && w.surf === 'vagone' && g.tgt && g.tgt.mesh) { let o = g.tgt.mesh; while (o.parent) o = o.parent; if (o !== sc) { delete GFX.works[id]; if (!w.erased) w.gfxRect = null; continue; } }   // il carro è partito (o rifatto): il velo va con lui
          if (w && !w.erased && w.surf !== 'treno' && w.surf !== 'vagone' && w.pos && hyp(w.pos.x - cx, w.pos.z - cy) > 140 && w !== W.cur) {
            freeVeil(g); delete GFX.works[id]; if (w.surf === 'auto') w.gfxRect = null; continue;   // [graffiti] il mezzo si ripiazza dal suo punto (intanto si sarà mosso)
          }
          if (!w || w.erased) {
            if (g.tgt && g.tgt.mesh && w && w.surf !== 'treno') freeVeil(g); else if (g.tgt && g.tgt.mesh && g.tgt.mesh.parent) g.tgt.mesh.parent.remove(g.tgt.mesh);
            if (w && w.surf === 'treno' && w.washed && !g.washed) { g.washed = true; washSide(w.car, w.side); W.works.filter(o => o.surf === 'treno' && o.car === w.car && o.side === w.side && !o.erased).forEach(o => { delete GFX.works[o.id]; }); }
            delete GFX.works[id]; continue;
          }
          if (g.tgt && g.tgt.atl && w.crossed && !g.crossDrawn) { freeVeil(g); delete GFX.works[id]; continue; }   // [atlante] crossato dopo: si rifà col velo (la X sopra), poi torna qui
          if (w.trace && !w.done) { if (g.ts == null) drawUpTo(w, g); } else if (g.drawn < (w.done ? 1 : w.prog) * g.art.stages.length - 1e-6 || (w.crossed && !g.crossDrawn)) drawUpTo(w, g);
          if (nMove < 8 && atlOk() && atlFits(w, g, W) && atlMove(w, g, cx, cy)) nMove++;   // [atlante] finito: nella tela comune
        }
        if (ATL.ok) atlFlush();
      }
    } catch (e) { GFX.err = e; if (!frame.err) { frame.err = 1; console.warn('[Writing]', e); } }
    if (once !== true) requestAnimationFrame(frame);
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

  return { __ray: { rayWall, segList, cands },   /* [leggera] per la prova dei raggi (strumenti/sonda_uguale.js) */ RAIL, spotPlan, yardAt, yardState, wagPose, sidePt, S, STYLES, MODES, CREWS, PAL, RANKS, rankOf, TR, trainAt, carX, carPose, railAt, sidePoint, mode, setMode, cycleMode, wants, tick, release, finish, progress, judge, art, night, morning, initWriters, renameTag, GFX, sceneLevel, grow, recruit, npcWork, styleFor, sketchFor, playerDna, pathPoint, workPoint, _: { ATL, atlOk, ARTW, placeWall, artFor, scanNear, galleggia, salva, carica, placeAnchor, fitWall, onPlane, openingsAt, tavRect, tavFit, tavCam, TAV, decalGeo, capVeils, makeVeil, freeVeil, POOL, SAVE_KEY, VEIL_MAX, vehAnchor, frame: () => frame(true), cityReact, saveOnWall, track, wagMesh, yardFrame, yardPaint, railFit, addWork, overlapCheck, nightSpot, livery, washSide, trainTarget } };
})();
if (typeof module !== 'undefined') module.exports = Writing;
