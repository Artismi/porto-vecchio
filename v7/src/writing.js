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
    tag: { nome: 'tag', rank: 0, W: 1.5, H: .9, dur: 2.6, cans: .06, fame: 1 },
    mtag: { nome: 'tag', rank: 0, W: 1, H: .62, dur: 1.4, cans: 0, fame: 1, marker: true },
    throw: { nome: 'throw-up', rank: 1, W: 2.7, H: 1.3, dur: 9, cans: .7, fame: 4 },
    pezzo: { nome: 'pezzo', rank: 2, W: 4.8, H: 2.05, dur: 32, cans: 2.2, fame: 12 },
    burner: { nome: 'burner', rank: 3, W: 6.6, H: 2.5, dur: 60, cans: 4, fame: 25 },
    gotico: { nome: 'gotico', rank: 1, W: 1.4, H: 3.2, dur: 16, cans: .5, fame: 6 },   // la calligrafia verticale (piloni, spigoli alti)
    mostro: { nome: 'personaggio', rank: 2, W: 3, H: 2.6, dur: 40, cans: 2.6, fame: 12 },   // il mostro coi denti
    wholecar: { nome: 'whole car', rank: 4, W: 16, H: 2.9, dur: 110, cans: 7, fame: 45 },
  };
  const MODES = ['libero', 'tag', 'throw', 'pezzo', 'burner'];
  const MODE_TXT = { libero: 'a mano libera', tag: 'tag', throw: 'throw-up', pezzo: 'pezzo', burner: 'burner (sul treno: whole car)' };
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
    return st.wr;
  }
  const playerAka = st => S(st).aka || 'NINO';

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
    const aka = free[(h * 13 + (k || 0) * 5) % free.length], r = WA.mulberry(h * 7919 + 3);
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
    const g = x.createLinearGradient(0, Hp, 0, Hp - m(.8)); g.addColorStop(0, 'rgba(30,26,22,.6)'); g.addColorStop(1, 'rgba(30,26,22,0)'); x.fillStyle = g; x.fillRect(0, Hp - m(.8), Wp, m(.8));   // lo sporco di linea
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
      if (c.k === 'tramoggia') { box(g, L - .5, .4, Wd - .4, coal, 0, BODY_Y + SIDE_H + .05, 0); for (let k = -2; k <= 2; k++) box(g, 1.8, .45, Wd - .9, coal, k * 2.5, BODY_Y + SIDE_H + .3, 0).rotation.y = k * .3; }   // il carbone a mucchi
      else { box(g, L, .2, Wd + .06, roofM, 0, BODY_Y + SIDE_H + .1, 0).userData.wr = 1; if (c.k === 'chiuso') box(g, L * .96, .14, Wd * .6, roofM, 0, BODY_Y + SIDE_H + .25, 0); }
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
  // la ferrovia: massicciata e rilevato sul bosco, viadotto coi piloni sul mare, traversine e rotaie; i paraurti e i cartelli delle due stazioni
  function track() {
    const THREE = T3(), R = R_(), P = TR.P, g = new THREE.Group(); g.name = 'ferrovia';
    const pos = [], col = [], idx = [], push = (x, y, z, c) => { pos.push(x, y, z); col.push(c.r, c.g, c.b); return pos.length / 3 - 1; };
    const cG = new THREE.Color('#8c877e'), cG2 = new THREE.Color('#6e6a62'), cC = new THREE.Color('#9a968e'), cC2 = new THREE.Color('#7a766e');
    let prev = null;
    for (let i = 0; i < P.length; i += 2) {
      const q = railAt(i), c = Math.cos(q.ang), s2 = Math.sin(q.ang), nx = -s2, nz = c, sea = !!P[i][3], top = q.h - .18, hw = sea ? 2.6 : 1.9, foot = sea ? 2.6 : 3.2;
      const gL = sea ? top - .9 : Math.min(top, R.groundH(q.x + nx * foot, q.y + nz * foot)) - .1, gR = sea ? top - .9 : Math.min(top, R.groundH(q.x - nx * foot, q.y - nz * foot)) - .1;
      const k = [push(q.x + nx * foot, gL, q.y + nz * foot, sea ? cC2 : cG2), push(q.x + nx * hw, top, q.y + nz * hw, sea ? cC : cG), push(q.x - nx * hw, top, q.y - nz * hw, sea ? cC : cG), push(q.x - nx * foot, gR, q.y - nz * foot, sea ? cC2 : cG2)];
      if (prev) for (let a = 0; a < 3; a++) idx.push(prev[a], k[a], prev[a + 1], prev[a + 1], k[a], k[a + 1]);
      prev = k;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const bed = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); bed.receiveShadow = true; bed.userData.wr = 1; g.add(bed);
    const bx = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), qt = new THREE.Quaternion(), e = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    const inst = (mat, list) => { const im = new THREE.InstancedMesh(bx, mat, list.length); list.forEach((L, k) => { e.set(0, L[4], 0); qt.setFromEuler(e); im.setMatrixAt(k, m4.compose(v3.set(L[0], L[1], L[2]), qt, s3.set(L[3][0], L[3][1], L[3][2]))); }); im.castShadow = true; im.receiveShadow = true; im.userData.wr = 1; im.frustumCulled = false; g.add(im); return im; };
    const sl = [], rl = [], pil = [];
    for (let s0 = 0; s0 < P.length - 1; s0 += .65) { const q = railAt(s0); sl.push([q.x, q.h - .1, q.y, [.24, .14, 2.5], -q.ang]); }   // traversine
    for (let s0 = 0; s0 < P.length - 3; s0 += 2) { const a = railAt(s0), b = railAt(s0 + 2), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, mh = (a.h + b.h) / 2, l = Math.hypot(b.x - a.x, b.y - a.y) + .02; for (const sd of [-.72, .72]) rl.push([mx - Math.sin(ang) * sd, mh + .02, my + Math.cos(ang) * sd, [l, .14, .08], -ang]); }   // rotaie
    for (let s0 = 6; s0 < P.length - 6; s0 += 12) { if (!P[Math.round(s0)][3]) continue; const q = railAt(s0), top = q.h - 1.1; pil.push([q.x, (top - 4) / 2, q.y, [1.2, top + 4, 3.2], -q.ang]); }   // i piloni del viadotto
    inst(new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: .95 }), sl); inst(new THREE.MeshStandardMaterial({ color: '#8a8a8e', metalness: .7, roughness: .4 }), rl);
    if (pil.length) inst(new THREE.MeshStandardMaterial({ color: '#8e8a82', roughness: .95 }), pil);
    const stop = (s0, dir) => { const q = railAt(s0), pb = new THREE.Group(); pb.position.set(q.x, q.h, q.y); pb.rotation.y = -q.ang + (dir < 0 ? Math.PI : 0); const red = new THREE.MeshStandardMaterial({ color: '#c8302a', roughness: .7 }), blk = new THREE.MeshStandardMaterial({ color: '#202022' });
      [[.5, .5, 2.2, red, 0, .9, 0], [.3, 1.2, .3, blk, -.3, .6, -.7], [.3, 1.2, .3, blk, -.3, .6, .7]].forEach(([w, h, d, mm, a, b, z]) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); o.position.set(a, b, z); o.castShadow = true; pb.add(o); }); g.add(pb); };
    stop(1, -1); stop(P.length - 2, 1);
    const sign = (s0, text, side) => { const q = railAt(s0), c = cv(320, 56), x = c.getContext('2d'); x.fillStyle = '#f2efe6'; x.fillRect(0, 0, 320, 56); x.strokeStyle = '#1c3a7a'; x.lineWidth = 6; x.strokeRect(3, 3, 314, 50); x.fillStyle = '#1c3a7a'; x.font = 'bold 26px Arial'; x.textAlign = 'center'; x.fillText(text, 160, 37);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .56), new THREE.MeshStandardMaterial({ map: canvasTexture(c), side: THREE.DoubleSide })); const nx = -Math.sin(q.ang) * side, nz = Math.cos(q.ang) * side; pl.position.set(q.x + nx * 3.6, q.h + 2.4, q.y + nz * 3.6); pl.rotation.y = -q.ang; g.add(pl);
      for (const d of [-1.3, 1.3]) { const po = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.6, .08), new THREE.MeshStandardMaterial({ color: '#3a3a3e' })); po.position.set(pl.position.x + Math.cos(q.ang) * d, q.h + 1.2, pl.position.z + Math.sin(q.ang) * d); g.add(po); } };
    sign(TR.sMine - TR.LEN / 2, 'MINIERA NORD', 1); sign(TR.sPort - 8, 'PORTO MILITARE', 1);
    return g;
  }
  // il bersaglio (canvas e offset) per un lavoro sul treno
  function trainTarget(w) {
    const car = GFX.train && GFX.train.cars[w.car]; if (!car) return null; const sd = car.sides[w.side];
    return { ctx: sd.ctx, tex: sd.tex, x0: w.u0 * SPPM, y0: (SIDE_H - w.vb - w.H) * SPPM, k: SPPM / PPM, c: sd.c };
  }
  function washSide(i, sd) { const car = GFX.train && GFX.train.cars[i]; if (!car) return; const s = car.sides[sd], b = GFX.base[i + ':' + sd]; s.ctx.globalCompositeOperation = 'source-over'; s.ctx.drawImage(b, 0, 0); if (s.c.__pvOrig) s.c.__pvOrig.getContext('2d').drawImage(b, 0, 0); s.tex.needsUpdate = true; }

  // ---------------- IL GIOCATORE: il colpo, il lavoro sotto il puntatore ----------------
  // ritorna: true (si dipinge), { go } (avvicinati), { msg } (non si può), false (niente sotto)
  const REACH = 1.7;
  function tick(st, nx, ny, dt, col, colIdx, tool) {
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
      const car = h.object.userData.car;
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
      else fitR = vehOf(h.object) ? { W: Math.min(sty.W, 3), H: Math.min(Hh, 1), r: new THREE.Vector3(nn.z, 0, -nn.x) } : wallRect(c, nn, sty.W, Hh, cands(c.x, c.z));
      if (!fitR && (style === 'tag' || style === 'mtag')) fitR = { W: Math.min(sty.W, .7), H: Math.min(sty.H, .45), r: new THREE.Vector3(nn.z, 0, -nn.x) };   // [writer] la tag si fa ovunque: un palo, un cassonetto, una gomma, una porta stretta
      if (!fitR) return { msg: `Qui il muro non basta per un ${sty.nome}: cerca una parete più larga.` };
      nw.W = fitR.W; nw.H = fitR.H; nw.gfxRect = { c, n: nn, r: fitR.r, W: fitR.W, H: fitR.H, obj: h.object }; nw.pos = { x: c.x, y: c.y, z: c.z };
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
  function release(st) { const W = S(st); if (W.cur && !W.cur.done) { const w = W.cur; G.feed(st, `${STYLES[w.style].nome[0].toUpperCase() + STYLES[w.style].nome.slice(1)} al ${Math.round(w.prog * 100)}%: clicca sopra per riprendere.`); } W.cur = null; GFX.held = false; }
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
        // i lavori: quelli che non hanno ancora la grafica (della notte, o di prima) vicino alla camera
        const now = performance.now();
        if (now - (GFX.scanT || 0) > 150) {
          GFX.scanT = now; let n = 0; const t0 = performance.now();
          const near = W.works.filter(w => !GFX.works[w.id] && !w.erased && !(w.gfxFail > 3)).map(w => { const sp = w.spot || (w.pos && { x: w.pos.x, y: w.pos.z }); return [w, w.surf === 'treno' ? 0 : sp ? hyp(sp.x - cx, sp.y - cy) : 1e9]; }).filter(a => a[1] < 80).sort((a, b) => a[1] - b[1]).map(a => a[0]);
          for (const w of near) {
            if (performance.now() - t0 > 14) break;
            if (GFX.works[w.id] || w.erased || w.gfxFail > 3) continue;
            if (w.surf === 'treno') { if (!GFX.train) continue; const tgt = trainTarget(w); if (!tgt) continue; GFX.works[w.id] = { tgt, art: art(w), drawn: 0 }; n++; continue; }
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
          if (w && !w.erased && w.surf !== 'treno' && w.pos && hyp(w.pos.x - cx, w.pos.z - cy) > 140 && w !== W.cur) {
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

  return { S, STYLES, MODES, CREWS, PAL, RANKS, rankOf, TR, trainAt, carX, carPose, railAt, sidePoint, mode, setMode, cycleMode, wants, tick, release, finish, progress, judge, art, night, morning, initWriters, renameTag, GFX, sceneLevel, grow, recruit, npcWork, styleFor, sketchFor, playerDna, pathPoint, workPoint, _: { addWork, overlapCheck, nightSpot, livery, washSide, trainTarget } };
})();
if (typeof module !== 'undefined') module.exports = Writing;
