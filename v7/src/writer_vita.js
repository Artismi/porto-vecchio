/* Porto Vecchio — la vita dei writer (v7, «Writer»). I ragazzi della controcultura dipingono davvero, sotto i tuoi occhi.
   - I MURI DELLA CITTÀ (SITES): ogni facciata con la strada davanti offre muri da bombare; le facciate lunghe sono le
     hall of fame (le crew ci fanno le produzioni, un pezzo accanto all'altro); in cima ai palazzi con la scala di ferro
     ci sono gli heaven spot, che si dipingono sporgendosi dal tetto e si vedono da tutta la strada.
   - LE NOTTI: dalle 22:30 alle 4 i writer escono. Ognuno ha un piano (azioni.js): va al muro (o alla scala, sale, cammina
     sul tetto fino al bordo), agita la bomboletta e il pezzo cresce a strati mentre lo guardi; un compagno di crew fa il
     palo. Se arrivano i Grigi scappano e il pezzo resta a metà. Le crew dei treni vanno al deposito della miniera.
     Di giorno chi ha il mop (il pennarello) lascia tag e segni dove passa.
   - LA CITTÀ SI COLORA: più lavori ci sono in giro, più la scena cresce (writing.js: sceneLevel): più writer, più uscite
     per notte. Sulla mappa del menu i lavori sono macchie di colore; il menu Writer dice quanto della città è colorato.
   - LE ANIMAZIONI: la salita sulla scala (giocatore e NPC), la tag a pennarello, la bomboletta che spruzza (la nebbia di
     vernice davanti all'ugello, del colore del lavoro).
   Stato: st.wr.vita = { night, missions }; sugli NPC: n.wrH (quota dei piedi sopra il suolo: scala, tetto), n.__tip
   (dove va la vernice), n.__climb, n.__mop. render.js legge n.wrH (una riga [writer]). */
var WriterVita = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const WR = typeof Writing !== 'undefined' ? Writing : require('./writing.js');
  const TT = typeof Tetti !== 'undefined' ? Tetti : require('./tetti.js');
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const WA = typeof WriterArte !== 'undefined' ? WriterArte : require('./writer_arte.js');
  const TS = G.TS, B = G.BUILDINGS, GW = G.GW, GH = G.GH, MPS = G.MIN_PER_SEC;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot, lerp = (a, b, t) => a + (b - a) * t;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const minOfDay = t => ((t % 1440) + 1440) % 1440, dayIdx = t => Math.floor(t / 1440);
  const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const tileH = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return inb(tx, ty) ? G.MAP.elev[ty * GW + tx] : 0; };

  // ================= I MURI DELLA CITTÀ =================
  // un sito: { x, y (dove sta chi dipinge, a terra o sul tetto), face (verso il muro), kind: 'strada'|'hall'|'heaven', bi, len (metri di muro libero),
  //            h (heaven: quota del centro del lavoro), L (heaven: la scala), roof: { x, y } (heaven: dove si sta sul tetto) }
  const SITES = [];
  function buildSites() {
    SITES.length = 0;
    B.forEach((b, bi) => {
      if (b.lighthouse || b.kiosk || b.w * b.h < 6) return;
      const d = b.door, ladders = TT.LADDERS.filter(L => L.bi === bi && L.footB < 0), roofH = TT.roofRule(b);
      const sides = [
        { n: b.w, out: [0, 1], tile: k => [b.x + k, b.y + b.h], wall: k => [(b.x + k + .5) * TS, (b.y + b.h) * TS] },
        { n: b.w, out: [0, -1], tile: k => [b.x + k, b.y - 1], wall: k => [(b.x + k + .5) * TS, b.y * TS] },
        { n: b.h, out: [1, 0], tile: k => [b.x + b.w, b.y + k], wall: k => [(b.x + b.w) * TS, (b.y + k + .5) * TS] },
        { n: b.h, out: [-1, 0], tile: k => [b.x - 1, b.y + k], wall: k => [b.x * TS, (b.y + k + .5) * TS] },
      ];
      sides.forEach(sd => {
        // i tratti di muro liberi: davanti si cammina, niente porta, niente scala
        let run = [];
        const flush = () => {
          if (run.length >= 2) {
            const len = run.length * TS, mid = run[Math.floor(run.length / 2)], [wx, wy] = sd.wall(mid), [ox, oy] = sd.out, face = Math.atan2(-oy, -ox);
            const kind = len >= 10 ? 'hall' : 'strada';
            SITES.push({ x: wx + ox * .55, y: wy + oy * .55, face, kind, bi, len, out: [ox, oy], along: [-oy, ox] });
            if (len >= 9 && kind === 'strada') { const q = run[1], [ax, ay] = sd.wall(q); SITES.push({ x: ax + ox * .55, y: ay + oy * .55, face, kind: 'strada', bi, len: TS * 2, out: [ox, oy], along: [-oy, ox] }); }
          }
          run = [];
        };
        for (let k = 0; k < sd.n; k++) {
          const [tx, ty] = sd.tile(k);
          const ok = inb(tx, ty) && G.walkT(tx, ty) && !(d && Math.max(Math.abs(tx - d[0]), Math.abs(ty - d[1])) <= 1) && !TT.LADDERS.some(L => Math.floor(L.fx / TS) === tx && Math.floor(L.fy / TS) === ty);
          if (ok) run.push(k); else flush();
        }
        flush();
        // [graffiti3] la facciata alta: dal tetto in giù un verticale (col palo del rullo, a bolle, in pixo), o da terra una tag a
        // estintore, o in cima un rullo: il fianco libero di un palazzo di almeno due piani
        if (roofH - (b.base || 0) >= 7 && sd.n >= 2) {
          const k = Math.floor(sd.n / 2), [tx, ty] = sd.tile(k);
          if (inb(tx, ty) && G.walkT(tx, ty)) {
            const [wx, wy] = sd.wall(k), [ox, oy] = sd.out, gh = tileH(wx + ox, wy + oy), Hv = Math.min(9, roofH - gh - 1.6);
            if (Hv >= 4) { const L = ladders.length ? ladders.reduce((a, c) => hyp(c.x - wx, c.y - wy) < hyp(a.x - wx, a.y - wy) ? c : a) : null;
              SITES.push({ x: wx + ox * .7, y: wy + oy * .7, face: Math.atan2(-oy, -ox), kind: 'facciata', bi, len: sd.n * TS, h: gh + 1.2 + Hv / 2, Hv, gh, top: gh + 1.2 + Hv, L: L ? L.i : -1, roof: { x: wx - ox * .55, y: wy - oy * .55 }, out: [ox, oy], along: [-oy, ox] }); }
          }
        }
        // l'heaven spot: in cima alla facciata, sopra la strada, se il palazzo ha la scala e la facciata è alta
        if (ladders.length && roofH - (b.base || 0) >= 6 && sd.n >= 3) {
          const k = Math.floor(sd.n / 2), [tx, ty] = sd.tile(k); if (!inb(tx, ty) || !G.walkT(tx, ty)) return;
          const [wx, wy] = sd.wall(k), [ox, oy] = sd.out, L = ladders.reduce((a, c) => hyp(c.x - wx, c.y - wy) < hyp(a.x - wx, a.y - wy) ? c : a);
          SITES.push({ x: wx + ox * .7, y: wy + oy * .7, face: Math.atan2(-oy, -ox), kind: 'heaven', bi, len: Math.min(sd.n * TS, 8), h: roofH - 1.35, L: L.i, roof: { x: wx - ox * .55, y: wy - oy * .55 }, out: [ox, oy], along: [-oy, ox] });
        }
      });
    });
    // [ferrovia] i muri antirumore lungo la linea: il lato verso la strada, un sito ogni 8 m
    const RL = WR.RAIL; if (RL && RL.ok) RL.walls.forEach((Wl, k) => { if (k % 2) return; const q = WR.sidePt(Wl.s + 2, Wl.side, Wl.off + .7); if (!G.walkT(Math.floor(q.x / TS), Math.floor(q.y / TS))) return; const nx = -Math.sin(q.ang) * Wl.side, ny = Math.cos(q.ang) * Wl.side; SITES.push({ x: q.x, y: q.y, face: Math.atan2(-ny, -nx), kind: 'ferrovia', bi: -1, len: 8, out: [nx, ny], along: [Math.cos(q.ang), Math.sin(q.ang)], place: 'lungo la ferrovia' }); });
    // [ordine1] il Muro dalla parte della città: la hall of fame della Risacca, un sito ogni 5 m (fuori dal varco)
    const WL = G.MAP.world && G.MAP.world.WALL; if (WL) for (let y = WL.y0 + 4; y < WL.y1 - 4; y += 5) { if (y > WL.gate[0] - 6 && y < WL.gate[1] + 6) continue; const x = WL.x + .4 - .6, tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!inb(tx, ty) || !G.walkT(tx, ty)) continue; SITES.push({ x, y, face: 0, kind: 'muro', bi: -1, len: 5, out: [-1, 0], along: [0, 1], name: 'sul Muro' }); }
    // [ordine1] i sottopassi della ferrovia: le spalle di cemento ai due lati della strada
    if (RL && RL.ok && RL.cross) RL.cross.forEach(c => [-1, 1].forEach(sg => { const s0 = c.s + sg * (c.hw - .4), q = WR.railAt(s0), ux = Math.cos(q.ang), uy = Math.sin(q.ang), x = q.x - ux * sg * 1.1, y = q.y - uy * sg * 1.1; if (!G.walkT(Math.floor(x / TS), Math.floor(y / TS))) return; SITES.push({ x, y, face: Math.atan2(uy * sg, ux * sg), kind: 'ponte', bi: -1, len: 4, out: [-ux * sg, -uy * sg], along: [-uy, ux], name: 'sotto la ferrovia' }); }));
    // [writer] gli spot lungo la linea: la stazione abbandonata, le case cantoniere, sotto il ponte, gli armadietti
    if (WR.spotPlan) WR.spotPlan().sites.forEach(q => SITES.push(Object.assign({ bi: -1 }, q)));
  }
  buildSites();
  const placeOf = s => { if (s.name) return s.name; try { const p = G.nearestPlace(s.x, s.y); return p ? 'a ' + p.name : ''; } catch (e) { return ''; } };
  // un muro per una notte: libero (niente lavori sopra), lontano dal giocatore se non vuoi farti vedere... ma non troppo
  function freeSite(st, kinds, near, maxD) {
    const W = WR.S(st), live = W.works.filter(w => !w.erased && w.spot);
    for (let k = 0; k < 40; k++) {
      const s = pick(SITES); if (!kinds.includes(s.kind)) continue;
      if (near && hyp(s.x - near.x, s.y - near.y) > (maxD || 200)) continue;
      if (live.some(w => hyp(w.spot.x - s.x, w.spot.y - s.y) < (s.kind === 'hall' ? 8 : 3.5) && (w.spot.h != null) === (s.h != null))) continue;
      return s;
    }
    return null;
  }

  // ================= LE MISSIONI =================
  const V = st => { const W = WR.S(st); return W.vita || (W.vita = { night: -1, plan: [], out: 0, mopT: 0, caught: 0 }); };
  const watched = (st, n) => !!(n.pop && n.pop.near && hyp(n.x - st.player.x, n.y - st.player.y) < 45);
  const el = (st, n, E) => (watched(st, n) ? (st.clock - E.c0) * MPS : st.t - E.t0);   // minuti di gioco passati nel passo
  const alive = n => n && !n.dead && !(n.stun > 0) && n.pop;
  const STY_MIN = { tag: 3, mtag: 1.5, throw: 9, gotico: 12, mostro: 40, pezzo: 32, burner: 55, wholecar: 80, rullo: 45, verticale: 50, estintore: 6, stencil: 4, scritta: 8, manifesto: 3, adesivi: 2, murale: 90, calli: 20 };   // minuti di gioco per lavoro (come writing.js STYLES.dur, ma in minuti)
  // [graffiti3] la misura e la quota di un lavoro dal suo sito: i verticali alti quanto la facciata, il rullo largo quanto il muro,
  // l'estintore da terra fino a cinque metri e mezzo
  function sizeFor(s, style) {
    if (style === 'verticale') return { H0: s.Hv || 7, W0: 1.6 + rnd() * .8 };
    if (style === 'rullo') return { W0: Math.max(5, Math.min(9, (s.len || 9) - .5)) };
    return {};
  }
  const heightFor = (s, style) => style === 'estintore' ? (s.gh != null ? s.gh + 3.4 : null) : style === 'rullo' && s.top ? s.top - 1.4 : style === 'verticale' ? s.h : (s.kind === 'facciata' ? null : s.h);
  const cops = (st, x, y, r) => st.npcs.some(c => !c.dead && !c.inside && (c.cop || c.military) && hyp(c.x - x, c.y - y) < r);
  // il passo della bomboletta: crea il lavoro, lo fa crescere, la mano va dove va la vernice; i Grigi interrompono
  function paintStep(label, mk) {
    return {
      label, dur: 0, outside: true,
      tick: (st, n, E) => {
        let w = E.work;
        if (!w) { w = E.work = WR._.addWork(st, mk(st, n, E)); w.live = n.id; E.pdur = STY_MIN[w.style] * (1.3 - ((n.pop.writer || n.pop.toy || {}).skill || .5) * .5); }
        const f = clamp(el(st, n, E) / E.pdur, 0, 1); w.prog = Math.max(w.prog, f);
        n.hand = w.style === 'mtag' ? 'pennarello' : 'bomboletta'; n.__mop = w.style === 'mtag';
        const tp = tipOf(st, w, f); if (tp) { n.__tip = { x: tp.x, y: tp.y, z: tp.z, t: nowMs(), col: WA.PAL[w.pal % WA.PAL.length].f[1] }; n.face = Math.atan2(tp.z - n.y, tp.x - n.x); }
        if (st.clock - (E.copT || 0) > 1) { E.copT = st.clock; if (cops(st, n.x, n.y, 22)) { E.busted = true; } }
      },
      act: (st, n, E) => {
        const w = E.work; if (!w) return 'next';
        if (E.busted) { busted(st, n, E); return 'stop'; }
        if (w.prog < 1) return 'wait';
        w.prog = 1; w.done = true; w.tDone = st.t; w.live = null; n.__tip = null; n.hand = null;
        if (w.surf === 'treno') { const k = w.car + ':' + w.side, W = WR.S(st); (W.train.sides[k] = W.train.sides[k] || []).push(w.id); W.train.news = `Stanotte i ${w.crew} hanno fatto il treno: ${WR.STYLES[w.style].nome} di ${w.aka}.`; }
        if (w.cop) { const W = WR.S(st); W.news = `Stanotte qualcuno ha bombato una volante dei Grigi: c'è sopra ${w.aka} ${w.crew}. La Celere è furiosa.`; try { G.emit(st, 'vandalismo', { actor: n.id }); } catch (e) { } }
        if (watched(st, n)) G.feed(st, `${w.aka} dei ${w.crew} ha finito ${w.style === 'mtag' || w.style === 'tag' ? 'la sua tag' : 'il ' + WR.STYLES[w.style].nome}${w.spot && w.spot.h != null ? ' lassù, in cima al palazzo' : ''}.`);
        return 'next';
      },
    };
  }
  // il bersaglio della mano: sul muro (se la grafica l'ha già messo) o sulla fiancata
  function tipOf(st, w, f) {
    const g = WR.GFX.works[w.id], v = Math.sin(st.clock * 6) * .3;
    if (g && g.art && WR.pathPoint) { const q = WR.pathPoint(w, g); if (q) { const tp = WR.workPoint(w, g, q[0], q[1]); if (tp) return tp; } }   // la mano segue il tratto che sta dipingendo
    if (w.surf === 'treno') { const tr = WR.trainAt(st.t); return WR.sidePoint(tr, w.car, w.side, w.u0 + f * w.W, 1.15 + w.vb + w.H * (.5 + v * .6)); }
    const R = w.gfxRect; if (!R) return w.spot ? { x: w.spot.x + Math.cos(w.spot.face) * .5, y: (w.spot.h != null ? w.spot.h : tileH(w.spot.x, w.spot.y) + 1.4), z: w.spot.y + Math.sin(w.spot.face) * .5 } : null;
    const u = (f % 1) - .5; return { x: R.c.x + R.r.x * u * R.W, y: R.c.y + v * R.H * .6, z: R.c.z + R.r.z * u * R.W, g };
  }
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function busted(st, n, E) {
    const W = WR.S(st), w = E.work; n.__tip = null; n.hand = null; if (w) w.live = null;
    V(st).caught++;
    if (watched(st, n)) G.feed(st, `I Grigi! ${(n.pop.writer || n.pop.toy || {}).aka || n.first} scappa e lascia ${w ? 'il ' + WR.STYLES[w.style].nome + ' a metà' : 'tutto lì'}.`, 'bad');
    try { G.emit(st, 'graffito', { place: w && w.place, actor: n.id }); } catch (e) { }
    n.panic = Math.max(n.panic || 0, 4);
  }
  // camminare (sul tetto, lungo il muro): in linea retta, alla velocità di un passo
  function walkStep(label, from, to, after) {
    return {
      label, dur: 0, outside: true,
      tick: (st, n, E) => { const a = from(st, n, E), b = to(st, n, E), d = hyp(b.x - a.x, b.y - a.y) || .01; const f = clamp(el(st, n, E) / Math.max(.05, d / 1.3 * MPS), 0, 1); n.x = lerp(a.x, b.x, f); n.y = lerp(a.y, b.y, f); n.face = Math.atan2(b.y - a.y, b.x - a.x); n.speedNow = f < 1 ? 1.3 : 0; E.wf = f; if (after) after(st, n, E, f); },
      act: (st, n, E) => (E.wf >= 1 ? 'next' : 'wait'),
    };
  }
  // la scala di ferro: su o giù (n.wrH dal suolo dei piedi della scala al tetto)
  function ladderStep(up, Li) {
    const L = TT.LADDERS[Li], a = TT._.footH(L), b = TT._.topH(L), g0 = tileH(L.fx, L.fy), mins = Math.max(1.2, Math.abs(b - a) / 1.4) * MPS;
    return {
      label: up ? 'sale la scala di ferro' : 'scende la scala di ferro', dur: 0, outside: true,
      tick: (st, n, E) => { const f = clamp(el(st, n, E) / mins, 0, 1); n.x = L.fx; n.y = L.fy; n.face = L.ang + Math.PI; n.wrH = (up ? lerp(a, b, f) : lerp(b, a, f)) - g0; n.__climb = nowMs(); E.lf = f; n.speedNow = 0; },
      act: (st, n, E) => { if (E.lf < 1) return 'wait'; if (up) { n.x = L.tx; n.y = L.ty; n.wrH = b - tileH(L.tx, L.ty); } else n.wrH = null; return 'next'; },
    };
  }
  const goStep = (label, at, run) => ({ label, at: typeof at === 'function' ? at : () => at, dur: 0, outside: true, run: !!run });
  const homeStep = () => ({ label: 'torna a casa', at: (st, n) => n.pop.homeT, dur: 5, inside: true, outside: false });
  const waitStep = (label, done) => ({ label, dur: 0, outside: true, tick: (st, n, E) => { n.speedNow = 0; }, act: (st, n, E) => (done(st, n, E) ? 'next' : 'wait') });
  function start(st, n, kind, label, steps, extra) {
    const A = AZ(); if (!A || !A.startPlan || !alive(n) || (n.pop.emer && (n.pop.emer.prio || 0) >= 1)) return null;
    const E = A.startPlan(st, n, 'writer', label, steps, 1, Object.assign({ onEnd: (st2, n2, why) => { n2.__tip = null; n2.__climb = null; n2.__mop = false; if (n2.wrH != null) { const L = E.L != null ? TT.LADDERS[E.L] : null; if (L) { n2.x = L.fx; n2.y = L.fy; } n2.wrH = null; } if (E.work && !E.work.done) E.work.live = null; } }, extra || {}));
    return E;
  }
  // lo stile della notte: dalla mano e dall'esperienza
  function styleFor(n, kind) {
    const wr = n.pop.writer, r = rnd() + (wr.skill || .5) * .2;
    if (kind === 'heaven') return r < .5 ? 'throw' : r < .85 ? 'pezzo' : 'rullo';
    if (kind === 'facciata') return r < .6 ? 'verticale' : 'estintore';
    if (kind === 'hall') return r < .3 ? 'pezzo' : r < .55 ? 'burner' : r < .7 ? 'pezzo' : r < .82 ? 'murale' : r < .92 ? 'calli' : 'rullo';   // [graffiti3] murali, calligraffiti, rulli
    return r < .3 ? 'tag' : r < .5 ? 'throw' : r < .56 ? 'gotico' : r < .64 ? 'throw' : r < .7 ? 'scritta' : r < .76 ? 'stencil' : r < .8 ? 'calli' : r < .94 ? 'pezzo' : 'burner';
  }
  const spotOf = (s, du, h) => ({ x: s.x + s.along[0] * (du || 0), y: s.y + s.along[1] * (du || 0), face: s.face, h: h != null ? h : s.h, place: placeOf(s), kind: s.kind });
  // UNA USCITA: muro di strada, heaven spot, hall of fame con la crew, treno al deposito
  function mission(st, n, kind, partner) {
    const wr = n.pop.writer, here = { x: n.x, y: n.y };
    if (kind === 'treno') {
      const tr = WR.trainAt(st.t); if (!tr || !tr.parked) return null;
      const W = WR.S(st), free = []; WR.TR.CARS.forEach((c, i) => [0, 1].forEach(sd => { const k = i + ':' + sd; if (!(W.train.sides[k] && W.train.sides[k].length) && !W.works.some(w => w.surf === 'treno' && w.car === i && w.side === sd && !w.erased)) free.push([i, sd]); }));
      if (!free.length) return null; const [car, side] = pick(free), L = WR.TR.CARS[car].L;
      const stand = WR.sidePoint(tr, car, side, L * .5, 0), q = { x: stand.x + stand.nx * .9, y: stand.z + stand.nz * .9 };
      const E = start(st, n, 'writer', 'fare il treno al deposito', [goStep('va al deposito della miniera, al buio', q), paintStep('spruzza la bomboletta sul treno', (st2, n2) => WR.npcWork(st2, n2, wr, WR.TR.CARS[car].k === 'loco' ? 'burner' : 'wholecar', null, { surf: 'treno', car, side, u0: .3, vb: .25, W: L - .6, H: 2.55 })), homeStep()]);
      return E;
    }
    const s = freeSite(st, kind === 'heaven' ? ['heaven'] : kind === 'facciata' ? ['facciata'] : kind === 'hall' ? ['hall'] : kind === 'muro' ? ['strada', 'ferrovia'] : ['strada', 'hall', 'ferrovia'], here, 260); if (!s) return null;   // [writer] il muro col palo è un muro di strada: la hall of fame ha la sua missione
    let style = styleFor(n, s.kind);
    if (s.kind === 'facciata' && style === 'verticale' && !(s.L >= 0 && TT.LADDERS[s.L])) style = 'estintore';   // [graffiti3] senza scala niente tetto: l'estintore da terra
    if (s.kind === 'heaven' || (s.kind === 'facciata' && style === 'verticale')) {
      const L = TT.LADDERS[s.L]; if (!L) return null; const vert = style === 'verticale';
      const steps = [goStep('va alla scala di ferro, di notte', { x: L.fx, y: L.fy }), ladderStep(true, s.L),
        walkStep('cammina sul tetto fino al bordo', () => ({ x: L.tx, y: L.ty }), () => s.roof, (st2, n2) => { n2.wrH = (TT.roofH(s.bi, n2.x, n2.y) ?? TT.roofRule(B[s.bi])) - tileH(n2.x, n2.y); }),
        paintStep(vert ? 'cala il rullo dal tetto, lettera dopo lettera' : 'si sporge dal tetto e spruzza la bomboletta', (st2, n2) => WR.npcWork(st2, n2, wr, style, spotOf(s, 0, vert ? s.h : heightFor(s, style) != null ? heightFor(s, style) : s.h - (style === 'throw' ? 0 : .3)), sizeFor(s, style))),
        walkStep('torna alla scala sul tetto', () => s.roof, () => ({ x: L.tx, y: L.ty })), ladderStep(false, s.L), homeStep()];
      return start(st, n, 'writer', vert ? 'un verticale dal tetto del palazzo' : 'un heaven spot in cima al palazzo', steps, { L: s.L });
    }
    if (s.kind === 'facciata') {   // [graffiti3] l'estintore: da terra, in un minuto, lettere alte metri
      const spot = spotOf(s, (rnd() - .5) * Math.max(0, s.len - 3.5), heightFor(s, 'estintore'));
      return start(st, n, 'writer', 'una tag a estintore sul palazzo', [goStep(`va col suo estintore ${spot.place}`, { x: spot.x, y: spot.y }), paintStep('scarica l\'estintore sul muro', (st2, n2) => WR.npcWork(st2, n2, wr, 'estintore', spot)), homeStep()]);
    }
    if ((style === 'murale' || style === 'rullo') && s.len < 7) style = 'pezzo';
    const du = s.kind === 'hall' && partner ? -2.6 : 0, spot = spotOf(s, du, null);
    const LAB = { tag: 'fa la sua tag con la bomboletta', scritta: 'scrive col pennello, a lettere grandi', stencil: 'appoggia la mascherina e spruzza', murale: 'stende le campiture del murale', rullo: 'passa il rullo, lettera dopo lettera', calli: 'scrive con la pennellessa' };
    const E = start(st, n, 'writer', s.kind === 'hall' ? 'la hall of fame della crew' : 'bombare un muro', [goStep(`va a dipingere ${spot.place}`, { x: spot.x, y: spot.y }), paintStep(LAB[style] || 'agita la bomboletta e spruzza', (st2, n2) => WR.npcWork(st2, n2, wr, style, spot, sizeFor(s, style))), homeStep()]);
    if (E && partner && alive(partner) && partner.pop.writer) {
      if (s.kind === 'hall') {   // la produzione: il compagno dipinge accanto
        const sp2 = spotOf(s, 2.6, null), st2y = styleFor(partner, 'hall');
        start(st, partner, 'writer', 'la hall of fame della crew', [goStep(`va con la crew ${sp2.place}`, { x: sp2.x, y: sp2.y }), paintStep('agita la bomboletta e spruzza', (st3, n3) => WR.npcWork(st3, n3, partner.pop.writer, st2y, sp2)), homeStep()]);
      } else {   // il palo: guarda la strada, se arrivano i Grigi fischia
        const pp = { x: s.x + s.along[0] * 5 + s.out[0] * 2, y: s.y + s.along[1] * 5 + s.out[1] * 2 };
        start(st, partner, 'writer', 'fare il palo alla crew', [goStep(`va a fare il palo ${spot.place}`, pp), waitStep('fa il palo e guarda la strada', (st3, n3) => { if (cops(st3, n3.x, n3.y, 30)) { E.busted = true; return true; } return !n.pop.emer || n.pop.emer !== E || E.i > 1; }), homeStep()]);
      }
    }
    return E;
  }
  // L'AUTO: una macchina parcheggiata (e se c'è, la volante dei Grigi: vale di più, scotta di più)
  function auto(st, n) {
    const wr = n.pop.writer, cars = st.vehicles.filter(v => !v.rider && !v.traffic && !v.hidden && !v.wreck && !v.military && hyp(v.x - n.x, v.y - n.y) < 180 && Math.abs(v.speed || 0) < .1);
    if (!cars.length) return null; const cops = cars.filter(v => v.police), v = cops.length && rnd() < .4 ? pick(cops) : pick(cars);
    const side = rnd() < .5 ? 1 : -1, nx = -Math.sin(v.ang) * side, ny = Math.cos(v.ang) * side, du = (rnd() - .5) * 1.4, at = { x: v.x + Math.cos(v.ang) * du + nx * 1.3, y: v.y + Math.sin(v.ang) * du + ny * 1.3 };
    if (!G.walkM(at.x, at.y)) return null;
    const style = v.police ? (rnd() < .6 ? 'throw' : 'tag') : rnd() < .55 ? 'tag' : 'throw';
    return start(st, n, 'writer', v.police ? 'bombare la volante' : "bombare un'auto", [goStep(v.police ? 'si avvicina alla volante, piano' : 'va alla macchina parcheggiata', at),
      paintStep(v.police ? 'spruzza la volante dei Grigi' : 'spruzza la fiancata della macchina', (st2, n2) => WR.npcWork(st2, n2, wr, style, { x: at.x, y: at.y, face: Math.atan2(-ny, -nx), place: placeOf(at) }, { surf: 'auto', veh: v.id, side, du, cop: !!v.police })), homeStep()]);
  }
  // IL BOMBING: una passeggiata notturna, una tag (o un throw-up) su ogni muro buono lungo la strada
  function bombing(st, n) {
    const wr = n.pop.writer, first = freeSite(st, ['strada', 'hall'], { x: n.x, y: n.y }, 220); if (!first) return null;
    const run = [first], used = new Set([first]);
    for (let k = 0; k < 3 + Math.floor(rnd() * 5); k++) { const last = run[run.length - 1]; let best = null, bd = 1e9; for (const s of SITES) { if (used.has(s) || s.kind === 'heaven') continue; const d = hyp(s.x - last.x, s.y - last.y); if (d > 6 && d < 40 && d < bd) { bd = d; best = s; } } if (!best) break; used.add(best); run.push(best); }
    const steps = [];
    run.forEach((s, k) => { const r0 = rnd(), style = r0 < .55 ? (wr.mop && rnd() < .5 ? 'mtag' : 'tag') : r0 < .75 ? 'throw' : pick(['stencil', 'adesivi', 'scritta', 'manifesto', 'stencil']), spot = spotOf(s, (rnd() - .5) * Math.min(4, s.len - 1), null);   // [graffiti3] nello zaino anche mascherina, adesivi, colla
      const LAB = { throw: 'fa un throw-up veloce', stencil: 'appoggia la mascherina e spruzza', adesivi: 'attacca gli adesivi', scritta: 'scrive col pennello', manifesto: 'attacca un manifesto con la colla' };
      steps.push(goStep(k ? 'passa al muro dopo' : `esce a bombare ${spot.place}`, { x: spot.x, y: spot.y }, false), paintStep(LAB[style] || 'fa la sua tag', (st2, n2) => WR.npcWork(st2, n2, wr, style, spot, { sign: (style === 'tag' || style === 'mtag') && rnd() < .35 ? pick(WA.SIGNS) : undefined }))); });
    steps.push(homeStep());
    return start(st, n, 'writer', 'bombare la strada', steps);
  }
  // LA STORIA DEI MURI: la città non è nuova. All'inizio della partita sui muri c'è già quello che hanno fatto negli anni i writer
  // di adesso e quelli che non ci sono più (crew sciolte, gente partita): tante tag, throw-up, qualche pezzo, qualche heaven spot.
  const OLD = [['RENZ', 'OGS'], ['MASK', 'OGS'], ['ZULU', 'KMT'], ['ODIO', 'KMT'], ['TREK', 'FLM'], ['NAPO', 'FLM'], ['SUBA', 'RSC'], ['KILO', 'RSC'], ['ASMA', 'OGS'], ['FENO', 'KMT'],
    // [ordine1] più mani sui muri: le vecchie crew, i solitari, gli ultras, la Risacca, i ragazzini del quartiere
    ['VERA', 'RSC'], ['MOLO', 'RSC'], ['ZERO', 'RSC'], ['KAOS', 'FLM'], ['BLUE', 'OGS'], ['TOKE', 'KMT'], ['RUGA', 'SPK'], ['ORZO', 'SPK'], ['NEVA', 'SPK'], ['DUKA', 'CVR'], ['ULTR', 'CVR'], ['BOSS', 'CVR'],
    ['PIX', 'TOY'], ['GEKO', 'TOY'], ['LUPO', 'TOY'], ['MIRO', ''], ['SKAN', ''], ['ATOM', ''], ['ROSA', ''], ['TEO', ''], ['DOGE', 'FLM'], ['NEMO', 'OGS'], ['SALE', 'RSC'], ['TUFO', 'KMT']];
  const BEEF0 = { OGS: 'KMT', KMT: 'OGS', FLM: 'SPK', SPK: 'FLM', CVR: 'RSC', RSC: 'CVR' };   // le vecchie guerre: chi crossa chi
  const POLW = ['LIBERI', 'FUORI', 'RIBELLI', 'MAREA', 'NOMURO', 'DISGELO', 'RESPIRA', 'ISOLA'];
  const HOT = ['bar', 'osteria', 'flipper', 'disco', 'cinema', 'video', 'stella', 'aurora', 'magazzino', 'cantiere', 'scalo', 'calata', 'giardini', 'piazzetta', 'caruggio', 'vico', 'spiaggia', 'discarica', 'muro', 'varco'];
  const COLD = ['governo', 'ministero', 'garante', 'archivio', 'commissariato', 'rocca', 'caserma_p', 'piazza_gov', 'chiesa', 'santuario', 'cultura'];
  // quanto un muro attira la vernice: i ritrovi, la ferrovia, il Muro, i sottopassi sì; i palazzi del regime no (li ripuliscono)
  // [graffiti3] LE ZONE CALDE: dove la città è bombardata davvero, muro dopo muro (il cantiere, lo scalo, la discarica, i magazzini,
  // il varco e il Muro, i caruggi e i vicoli del borgo, la calata): lì i lavori sono il doppio e mezzo, stretti uno all'altro, e le
  // hall of fame sono produzioni intere. Altrove la vernice si dirada, e attorno ai palazzi del regime quasi sparisce.
  const DENSE = ['cantiere', 'scalo', 'discarica', 'magazzino', 'varco', 'muro', 'caruggio', 'vico', 'calata', 'flipper'];
  function denseAt(x, y) { const P = G.PLACES; return DENSE.some(id => { const q = P[id]; return q && hyp(q.x - x, q.y - y) < 40; }); }
  function heatOf(s) { if (s.kind === 'muro' || s.kind === 'ponte') return 3.2; if (s.kind === 'ferrovia') return 2.2; const P = G.PLACES; let h = 1;
    COLD.forEach(id => { const q = P[id]; if (q && hyp(q.x - s.x, q.y - s.y) < 28) h *= .18; }); HOT.forEach(id => { const q = P[id]; if (q && hyp(q.x - s.x, q.y - s.y) < 30) h *= 1.8; });
    if (denseAt(s.x, s.y)) h *= 2.5;
    return Math.min(h, 6); }
  // la distanza minima fra due lavori grandi, per stile (nelle zone calde si stringe)
  const MIND = { pezzo: 4.2, burner: 5.5, mostro: 3.5, murale: 7, rullo: 7, calli: 4, verticale: 2.4, estintore: 3, wholecar: 9 };
  function history(st) {
    const v = V(st); if (v.hist) return; v.hist = true;
    const W = WR.S(st), N = 1350, now = st.t;   // [graffiti3] era 820: più storia, soprattutto nelle zone calde
    // [ordine1] i muri pesati: dove si dipinge davvero (ritrovi, ferrovia, Muro, sottopassi) e dove no (il regime)
    const pool = SITES.filter(s => (s.kind !== 'heaven' && s.kind !== 'facciata') || rnd() < .6), wts = pool.map(heatOf), tot = wts.reduce((a, c) => a + c, 0);
    const pickW = () => { let t = rnd() * tot; for (let i = 0; i < pool.length; i++) { t -= wts[i]; if (t <= 0) return pool[i]; } return pool[pool.length - 1]; };
    const ws = W.writers.map(id => G.byId(st, id)).filter(n => n && n.pop && n.pop.writer);
    const oldWr = (aka, crew) => { const h = aka.charCodeAt(0) * 977 + aka.charCodeAt(1) * 31 + (aka.charCodeAt(2) || 7); const sk = crew === 'TOY' ? .12 + (h % 20) / 100 : .35 + (h % 50) / 100; return { aka, crew, skill: sk, dna: WA.dnaOf(h, sk, h % 14), hand: h * 13 }; };
    const made = [], BIG = /^(pezzo|burner|mostro|murale|rullo|calli|verticale|estintore)$/;
    const place = (s, who, wr, style, du, h, extra) => {   // un lavoro vecchio sul muro s (null se lì non c'è posto)
      const big = BIG.test(style), spot = spotOf(s, du, h), dn = denseAt(spot.x, spot.y);
      if (big && made.some(m => m.big && hyp(m.x - spot.x, m.y - spot.y) < (MIND[style] || 4.2) * (dn ? .55 : 1))) return null;   // niente lavori grandi uno sull'altro: le tag sì, si ammucchiano
      const w = WR._.addWork(st, WR.npcWork(st, who || { id: 'old:' + wr.aka }, wr, style, spot, Object.assign({ prog: 1, done: true, old: true }, sizeFor(s, style), extra || {})));
      w.t0 = w.tDone = now - Math.floor(rnd() * 60) * 1440;   // fatto nei giorni (e nei mesi) prima
      if (!who) w.by = 'old';
      made.push({ x: spot.x, y: spot.y, big }); return w;
    };
    for (let k = 0; k < N; k++) {
      const s = pickW(), r = rnd(), old = rnd() < .5, who = old || !ws.length ? null : pick(ws);
      const [aka0, crew0] = pick(OLD), wr = who ? who.pop.writer : oldWr(aka0, crew0);
      let style;
      if (s.kind === 'facciata') style = r < .5 ? 'verticale' : r < .8 ? 'estintore' : s.len >= 8 ? 'rullo' : 'verticale';   // [graffiti3] sui palazzi
      else if (s.kind === 'heaven') style = r < .4 ? 'throw' : r < .55 ? 'gotico' : r < .8 ? 'pezzo' : s.len >= 7 ? 'rullo' : 'pezzo';
      else if (s.kind === 'muro') style = r < .15 ? 'tag' : r < .35 ? 'throw' : r < .45 ? 'pezzo' : r < .55 ? 'scritta' : r < .66 ? 'murale' : r < .71 ? 'calli' : r < .9 ? 'pezzo' : 'burner';   // sul Muro le produzioni e le parole
      else if (s.kind === 'ponte') style = r < .25 ? 'tag' : r < .45 ? 'throw' : r < .55 ? 'gotico' : r < .65 ? 'throw' : r < .75 ? 'scritta' : r < .82 ? 'stencil' : r < .9 ? 'estintore' : 'pezzo';
      else if (s.kind === 'hall') style = r < .12 ? 'tag' : r < .22 ? 'throw' : r < .28 ? 'scritta' : r < .33 ? 'stencil' : r < .4 ? 'calli' : r < .5 ? 'pezzo' : r < .7 ? 'pezzo' : r < .82 ? 'burner' : r < .94 ? 'murale' : 'rullo';
      else style = r < .3 ? 'tag' : r < .42 ? 'mtag' : r < .56 ? 'throw' : r < .62 ? 'stencil' : r < .68 ? 'scritta' : r < .74 ? 'adesivi' : r < .78 ? 'manifesto' : r < .81 ? 'gotico' : r < .85 ? 'throw' : r < .88 ? 'calli' : r < .96 ? 'pezzo' : 'burner';
      if (wr.crew === 'TOY' && !/^(mtag|adesivi|stencil|manifesto)$/.test(style)) style = r < .5 ? 'tag' : r < .8 ? 'throw' : 'adesivi';   // i ragazzini: tag e throw storti, adesivi
      if (/^(pezzo|burner|calli)$/.test(style) && s.kind === 'strada' && s.len < 5) continue;
      if (/^(murale|rullo)$/.test(style) && s.kind !== 'heaven' && s.kind !== 'facciata' && s.len < 7) style = 'pezzo';
      const big = BIG.test(style), top = s.kind === 'heaven' || s.kind === 'facciata';
      const du = top ? (style === 'estintore' ? (rnd() - .5) * Math.max(0, s.len - 3.5) : 0) : (rnd() - .5) * Math.max(0, s.len - (big ? 4 : 1.2));
      const h = s.kind === 'facciata' ? heightFor(s, style) : s.kind === 'heaven' ? (style === 'rullo' ? s.h - .5 : s.h - .3) : null;
      const words = (s.kind === 'muro' || (wr.crew === 'RSC' && big)) && rnd() < .3 && /^(pezzo|burner)$/.test(style) ? pick(POLW) : undefined;
      const extra = { sign: (style === 'tag' || style === 'mtag') && rnd() < .3 ? pick(WA.SIGNS) : undefined };
      if (words) extra.words = words;
      const w = place(s, who, wr, style, du, h, extra); if (!w) continue;
      // le vecchie guerre: un pezzo su sei della crew rivale è crossato
      if (!who && big && style !== 'murale' && BEEF0[wr.crew] && rnd() < .17) { const [ra] = pick(OLD.filter(o => o[1] === BEEF0[wr.crew])) || []; if (ra) w.crossed = { aka: ra, crew: BEEF0[wr.crew], t: w.t0 + 1440 }; }
    }
    // [graffiti3] LE PRODUZIONI: nelle zone calde le hall of fame sono piene da un capo all'altro, un pezzo accanto all'altro, della
    // stessa crew, con le tag e gli adesivi sotto; e sui palazzi delle zone calde i verticali stanno fianco a fianco
    SITES.filter(s => s.kind === 'hall' && denseAt(s.x, s.y) && rnd() < .75).forEach(s => {
      const crew = pick(['OGS', 'KMT', 'FLM', 'RSC', 'SPK']), mem = OLD.filter(o => o[1] === crew), n = Math.max(2, Math.floor((s.len - 1) / 5.2));
      for (let i = 0; i < n; i++) { const [aka0] = pick(mem), wr = oldWr(aka0, crew), style = pick(['pezzo', 'pezzo', 'burner', 'mostro', 'calli', 'pezzo']); place(s, null, wr, style, -s.len / 2 + 2.8 + i * 5.2, null, { prod: true }); }
      for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) { const [aka0, crew0] = pick(OLD), wr = oldWr(aka0, crew0); place(s, null, wr, pick(['tag', 'mtag', 'adesivi', 'stencil', 'tag']), (rnd() - .5) * (s.len - 1), null, {}); }
    });
    SITES.filter(s => s.kind === 'facciata' && s.len >= 6 && denseAt(s.x, s.y) && rnd() < .6).forEach(s => {
      const n = Math.floor((s.len - .5) / 2.6); for (let i = 0; i < n; i++) { const [aka0, crew0] = pick(OLD), wr = oldWr(aka0, crew0); place(s, null, wr, 'verticale', -s.len / 2 + 1.4 + i * 2.6, s.h, {}); }
    });
  }
  // il calendario della notte: chi esce, quando, dove
  function planNight(st) {
    const v = V(st), W = WR.S(st), d = dayIdx(st.t + 120); if (v.night === d) return; v.night = d;
    const sc = WR.sceneLevel(st), n0 = 2 + Math.round(sc * 8), crewOf = {};
    const ws = W.writers.map(id => G.byId(st, id)).filter(n => alive(n) && n.pop.writer && !(n.jailedUntil > st.t));
    ws.forEach(n => { (crewOf[n.pop.writer.crew] = crewOf[n.pop.writer.crew] || []).push(n); });
    v.plan = [];
    const used = new Set();
    for (let k = 0; k < n0 && used.size < ws.length; k++) {
      const n = pick(ws.filter(m => !used.has(m.id))); if (!n) break; used.add(n.id);
      const wr = n.pop.writer, r = rnd();
      const kind = wr.train && r < .22 ? 'treno' : wr.roof && r < .34 ? 'heaven' : r < .44 ? 'facciata' : r < .54 ? 'auto' : r < .74 ? 'bombing' : r < .9 ? 'muro' : 'hall';   // [graffiti3] le facciate dei palazzi
      const mates = (crewOf[wr.crew] || []).filter(m => !used.has(m.id)), partner = (kind === 'muro' || kind === 'hall') && mates.length && rnd() < .7 ? pick(mates) : null;
      if (partner) used.add(partner.id);
      v.plan.push({ id: n.id, partner: partner && partner.id, kind, at: dayIdx(st.t + 120) * 1440 - 90 + Math.floor(rnd() * 300) });   // fra le 22:30 e le 3:30
    }
  }
  function runNight(st) {
    const v = V(st), m = minOfDay(st.t), night = m >= 22 * 60 + 15 || m < 4 * 60;
    if (m >= 21 * 60 && m < 22 * 60 + 15) planNight(st);
    if (!night || !v.plan.length) return;
    for (let i = v.plan.length - 1; i >= 0; i--) {
      const P = v.plan[i]; if (st.t < P.at) continue; v.plan.splice(i, 1);
      const n = G.byId(st, P.id), partner = P.partner ? G.byId(st, P.partner) : null; if (!alive(n)) continue;
      (P.kind === 'bombing' ? bombing(st, n) : P.kind === 'auto' ? auto(st, n) : mission(st, n, P.kind, partner)) || mission(st, n, 'muro', partner);
    }
  }
  // [writer] I TOY: i ragazzi giovani senza crew che firmano dove passano (la loro tag, sempre la stessa, nata dal loro numero)
  const SYL = ['KA', 'ZE', 'TO', 'MI', 'RU', 'SK', 'NO', 'VI', 'DE', 'BO', 'XO', 'LU', 'PE', 'ZU', 'RI', 'KO', 'MA', 'TY'];
  function toyOf(n) {
    if (n.pop.toy) return n.pop.toy; let h = 7; for (const ch of String(n.id)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
    const r = WA.mulberry(h), aka = true ? SYL[Math.floor(r() * SYL.length)] + SYL[Math.floor(r() * SYL.length)] + (r() < .4 ? pickR2(r, ['S', 'K', 'X', 'Z', '1']) : '') : 'TOY';
    return (n.pop.toy = { aka: aka.slice(0, 6), crew: '', skill: .12 + r() * .25, hand: h * 131 + 7, mop: r() < .75 });
  }
  const pickR2 = (r, a) => a[Math.floor(r() * a.length)];
  const isToy = n => n.pop && !n.pop.writer && n.pop.age >= 13 && n.pop.age <= 24 && !n.cop && !/soldat|agente|poliz|guardia|tutela/i.test(n.role || '');
  function siteNear(n, max) { let best = null, bd = max; for (const s of SITES) { if (s.kind === 'heaven') continue; const dd = hyp(s.x - n.x, s.y - n.y); if (dd < bd) { bd = dd; best = s; } } return best; }
  // di giorno: chi passa lascia la sua tag sul muro più vicino (i writer col mop o con la bomboletta, i toy col pennarello);
  // lontano dagli occhi del giocatore la città si riempie da sola
  function runDay(st) {
    const v = V(st), m = minOfDay(st.t); if (m < 7 * 60 || m > 22 * 60) return;
    const p = st.player, W = WR.S(st);
    if (st.clock - v.mopT >= 10) {
      v.mopT = st.clock;
      const near = n => alive(n) && n.pop.near && !n.inside && !n.pop.emer && !n.vehicle && hyp(n.x - p.x, n.y - p.y) < 70;
      const ws = W.writers.map(id => G.byId(st, id)).filter(n => near(n) && n.pop.writer), toys = st.npcs.filter(n => near(n) && isToy(n));
      const pool = ws.concat(rnd() < .5 ? toys : []);
      if (pool.length && rnd() < .75) {
        const n = pick(pool), wr = n.pop.writer || toyOf(n), best = siteNear(n, 12);
        if (best) {
          const style = !n.pop.writer || wr.mop && rnd() < .6 ? 'mtag' : 'tag', spot = spotOf(best, (rnd() - .5) * Math.min(4, best.len - 1), null);
          start(st, n, 'writer', style === 'mtag' ? 'una tag col pennarello' : 'una tag con la bomboletta', [goStep('si avvicina al muro', { x: spot.x, y: spot.y }), paintStep(style === 'mtag' ? 'fa una tag col pennarello' : 'fa la sua tag', (st2, n2) => WR.npcWork(st2, n2, wr, style, spot, { sign: rnd() < .35 ? pick(WA.SIGNS) : undefined }))]);
        }
      }
    }
    if (st.t - (v.farT || 0) > 15) {   // lontano: una tag (o un throw-up) in più in città
      v.farT = st.t;
      const cand = st.npcs.filter(n => alive(n) && (n.pop.writer || isToy(n)) && hyp(n.x - p.x, n.y - p.y) > 60);
      const sites = SITES.filter(s => s.kind !== 'heaven' && hyp(s.x - p.x, s.y - p.y) > 60);
      if (cand.length && sites.length) {
        const n = pick(cand), wr = n.pop.writer || toyOf(n), s0 = pick(sites), style = n.pop.writer && rnd() < .25 ? 'throw' : wr.mop ? 'mtag' : 'tag';
        WR._.addWork(st, WR.npcWork(st, n, wr, style, spotOf(s0, (rnd() - .5) * Math.min(4, s0.len - 1), null), { prog: 1, done: true }));
      }
    }
  }
  // la città si colora: quanti muri hanno un lavoro sopra
  function coverage(st) {
    const W = WR.S(st), live = W.works.filter(w => !w.erased && (w.spot || w.pos)), cells = new Set();
    live.forEach(w => { const x = w.spot ? w.spot.x : w.pos.x, y = w.spot ? w.spot.y : w.pos.z; cells.add(Math.floor(x / 24) + ',' + Math.floor(y / 24)); });
    const all = new Set(SITES.map(s => Math.floor(s.x / 24) + ',' + Math.floor(s.y / 24)));
    return all.size ? Math.min(1, cells.size / all.size) : 0;
  }
  function step(st, dt) {
    if (!st.player || !st.pop) return;
    const W = WR.S(st); if (W.writers.length) history(st);
    runNight(st); runDay(st);
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[WriterVita]', e); } } }; }
  // il menu: quanto è colorata la città, cosa dicono i segni
  if (AZ() && AZ().playerActions) { const prev = AZ().playerActions; AZ().playerActions = st => { const out = (prev(st) || []).slice(), p = st.player, W = WR.S(st);
    if (p.hand === 'bomboletta' || p.hand === 'pennarello' || W.fame > 0) out.push({ id: 'writer_citta', label: `La città colorata: ${Math.round(coverage(st) * 100)}% · ${W.writers.length} writer in giro`, run: () => null, off: '' });
    if (p.hand === 'bomboletta') out.push({ id: 'writer_fam', label: `La tua mano: ${WA.FAM[W.fam || 'semi'].nome}`, run: () => { const i = WA.FAMS.indexOf(W.fam || 'semi'); W.fam = WA.FAMS[(i + 1) % WA.FAMS.length]; return `Le tue lettere: ${WA.FAM[W.fam].nome}.`; }, off: 'cambia lo stile delle lettere' });
    const sg = W.works.find(w => !w.erased && w.sign && w.spot && hyp(w.spot.x - p.x, w.spot.y - p.y) < 3);
    if (sg) out.push({ id: 'writer_segno', label: `Il segno di ${sg.aka}: ${WA.SIGN_TXT[sg.sign]}`, run: () => `Lo dice il segno accanto alla tag di ${sg.aka}: ${WA.SIGN_TXT[sg.sign]}.`, off: '' });
    return out; }; }

  // ================= LA GRAFICA: le animazioni, la nebbia di vernice, la mappa =================
  // la mappa del menu (menu_ui.js drawMap): i lavori come macchie di colore
  function drawMap(x, k, st) {
    const W = WR.S(st); x.save();
    W.works.forEach(w => { if (w.erased) return; const px = w.spot ? w.spot.x : w.pos ? w.pos.x : null, py = w.spot ? w.spot.y : w.pos ? w.pos.z : null; if (px == null) return;
      const P = WA.PAL[(w.pal || 0) % WA.PAL.length], r = [1.6, 1.6, 2.4, 3.2, 4, 5][WR.STYLES[w.style].rank + 1] || 2; x.globalAlpha = w.done ? .85 : .45; x.fillStyle = w.surf === 'treno' ? '#ffffff' : P.f[1]; x.beginPath(); x.arc(px * k, py * k, r, 0, 7); x.fill(); });
    x.globalAlpha = 1; x.font = 'italic 15px "Instrument Serif", Georgia, serif'; x.textAlign = 'left'; x.fillStyle = 'rgba(13,16,21,.6)'; x.fillRect(8, x.canvas.height - 30, 250, 22);
    x.fillStyle = '#ff5fa2'; x.fillText(`La città colorata: ${Math.round(coverage(st) * 100)}% · ${W.writers.length} writer`, 14, x.canvas.height - 14); x.restore();
  }
  if (typeof window !== 'undefined') {
    // le pose: la scala, la tag a pennarello; il pennarello in mano
    const installAnim = () => {
      if (typeof Anim === 'undefined' || typeof THREE === 'undefined' || installAnim.done) return !!installAnim.done; installAnim.done = true;
      Anim.prop('mop', () => { const g = new THREE.Group(), m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: .6 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .13, 6), m('#1e1e24')); b.rotation.z = Math.PI / 2; g.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(.009, .006, .03, 5), m('#f0f0f0')); t.rotation.z = Math.PI / 2; t.position.x = .08; g.add(t); return g; }, 'WristR', [0, -.08, .04]);
      const _v = new THREE.Vector3(), _m = new THREE.Matrix4();
      // SALE LA SCALA: le mani si alternano sui pioli, le ginocchia salgono a turno
      // [animazioni] A.quota: a che altezza è sulla scala; mani e piedi passano un piolo (30 cm) ogni mezzo ciclo, così salgono col corpo
      // (prima giravano a tempo fisso, 5,2 rad/s, e il corpo saliva 3 volte più svelto dei pioli: scivolava su per la scala)
      Anim.def('scala', { base: 'Idle_Neutral', fade: .2, full: true, fn(P, A) {
        const ph = A && A.quota != null ? Math.sin(A.quota * Math.PI / .3) : Math.sin(P.t * 5.2), a = Math.max(0, ph), b = Math.max(0, -ph);
        P.aim('UpperArmL', [.12, .75 + .2 * a, .55]); P.aim('LowerArmL', [.05, .9, .25]);
        P.aim('UpperArmR', [-.12, .75 + .2 * b, .55]); P.aim('LowerArmR', [-.05, .9, .25]);
        P.legTo('L', .12, .12 + .35 * a, .22, .15, 1, .6, .2, 0); P.legTo('R', -.12, .12 + .35 * b, .22, -.15, 1, .6, .2, 0);
        P.rot('Head', -.35, 0, 0); P.rot('Chest', .08, 0, 0);
      } });
      // LA TAG A PENNARELLO: il polso scrive veloce, la testa segue, ogni tanto si guarda alle spalle
      Anim.def('tagga', { base: 'Idle_Neutral', fade: .2, full: true, fn(P, A) {
        const tip = A && A.tip; let dir = [-.2, .3, .9];
        if (tip && P.g) { _v.set(tip.x, tip.y, tip.z).applyMatrix4(_m.copy(P.g.matrixWorld).invert()); const l = Math.hypot(_v.x, _v.y - 1.35, _v.z) || 1; dir = [_v.x / l, (_v.y - 1.35) / l, _v.z / l]; }
        const w = Math.sin(P.t * 22) * .12, w2 = Math.cos(P.t * 17) * .1;
        P.aim('UpperArmR', [dir[0] - .25, dir[1] + .05, dir[2]]); P.aim('LowerArmR', [dir[0] + w, dir[1] + w2, dir[2]]);
        P.aim('UpperArmL', [.25, -.95, .1]); P.aim('LowerArmL', [.1, -.9, .3]);
        P.rot('Head', -.05, Math.sin(P.t * .9) > .85 ? .9 : .1, 0); P.prop('mop');
      } });
      Anim.npcMap((st, n, s) => {
        const now = performance.now();
        if (n.__climb && now - n.__climb < 400) { s.act = 'scala'; s.upper = null; s.quota = n.wrH || 0; return; }
        const tp = n.__tip; if (tp && now - tp.t < 600) { s.act = n.__mop ? 'tagga' : 'vernicia'; s.tip = tp; s.lookAt = { x: tp.x, y: tp.y, z: tp.z }; s.upper = null; }
      });
      Anim.playerMap((st, p, s) => {
        if (p.lv && p.lv.k === 'scala') { s.act = 'scala'; s.upper = null; s.quota = p.lv.h0 + (p.lv.h1 - p.lv.h0) * p.lv.t; return; }
        const tp = p.__tip; if (p.hand === 'pennarello' && tp && performance.now() - tp.t < 350) { s.act = 'tagga'; s.tip = tp; }
      });
      return true;
    };
    // la nebbia di vernice: punti che escono dall'ugello verso il muro e si posano
    const MIST = { pts: null, N: 360, i: 0, life: null, vel: null };
    function mistInit(scene) {
      const T = THREE, g = new T.BufferGeometry(), pos = new Float32Array(MIST.N * 3).fill(-9999), col = new Float32Array(MIST.N * 3);
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = new T.PointsMaterial({ size: .07, vertexColors: true, transparent: true, opacity: .55, depthWrite: false, sizeAttenuation: true });
      MIST.pts = new T.Points(g, m); MIST.pts.frustumCulled = false; MIST.pts.userData.velo = true; MIST.pts.userData.wr = 1; scene.add(MIST.pts);
      MIST.life = new Float32Array(MIST.N); MIST.vel = new Float32Array(MIST.N * 3); MIST.c = new T.Color();
    }
    function emit(from, tip, col, n) {
      const P = MIST.pts.geometry.attributes.position.array, C = MIST.pts.geometry.attributes.color.array; MIST.c.set(col || '#ff5a3a');
      const dx = tip.x - from.x, dy = tip.y - from.y, dz = tip.z - from.z, l = hyp(dx, dy, dz) || 1;
      for (let k = 0; k < n; k++) {
        const i = MIST.i = (MIST.i + 1) % MIST.N, b = .25 + rnd() * .2;
        P[i * 3] = tip.x - dx / l * b + (rnd() - .5) * .05; P[i * 3 + 1] = tip.y - dy / l * b + (rnd() - .5) * .05; P[i * 3 + 2] = tip.z - dz / l * b + (rnd() - .5) * .05;
        MIST.vel[i * 3] = dx / l * 1.4 + (rnd() - .5) * .5; MIST.vel[i * 3 + 1] = dy / l * 1.4 + (rnd() - .5) * .5; MIST.vel[i * 3 + 2] = dz / l * 1.4 + (rnd() - .5) * .5;
        C[i * 3] = MIST.c.r; C[i * 3 + 1] = MIST.c.g; C[i * 3 + 2] = MIST.c.b; MIST.life[i] = .35 + rnd() * .3;
      }
    }
    function mistStep(dt) {
      const P = MIST.pts.geometry.attributes.position.array;
      for (let i = 0; i < MIST.N; i++) { if (MIST.life[i] <= 0) continue; MIST.life[i] -= dt; if (MIST.life[i] <= 0) { P[i * 3 + 1] = -9999; continue; } const k = Math.exp(-dt * 4); MIST.vel[i * 3] *= k; MIST.vel[i * 3 + 1] = MIST.vel[i * 3 + 1] * k - dt * .3; MIST.vel[i * 3 + 2] *= k; P[i * 3] += MIST.vel[i * 3] * dt; P[i * 3 + 1] += MIST.vel[i * 3 + 1] * dt; P[i * 3 + 2] += MIST.vel[i * 3 + 2] * dt; }
      MIST.pts.geometry.attributes.position.needsUpdate = true; MIST.pts.geometry.attributes.color.needsUpdate = true;
    }
    let last = 0;
    function frame(ts) {
      try {
        installAnim();
        const pv = window.__pv, R = pv && pv.R, st = pv && pv.st, sc = R && R.__models && R.__models.scene;
        if (sc && st && window.THREE) {
          if (!MIST.pts) mistInit(sc);
          const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; const now = performance.now();
          const p = st.player, W = WR.S(st);
          if (p.__tip && now - p.__tip.t < 120 && p.hand === 'bomboletta') { const w = W.cur, col = w ? WA.PAL[(w.pal || 0) % WA.PAL.length].f[1] : '#ff5a3a', h = (typeof Livelli !== 'undefined' && p.lv ? Livelli.heightOf(st, p) : R.groundH(p.x, p.y)) || 0; emit({ x: p.x, y: h + 1.4, z: p.y }, p.__tip, w && (w.style === 'tag') && w.col ? w.col : col, 3); }
          for (const n of st.npcs) { const tp = n.__tip; if (!tp || now - tp.t > 120 || n.__mop || !n.pop || !n.pop.near) continue; if (hyp(n.x - p.x, n.y - p.y) > 60) continue; emit({ x: n.x, y: R.groundH(n.x, n.y) + (n.wrH || 0) + 1.4, z: n.y }, tp, tp.col, 2); }
          mistStep(dt);
        }
      } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[WriterVita]', e); } }
      requestAnimationFrame(frame);
    }
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 300); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }
  return { SITES, buildSites, freeSite, mission, bombing, auto, history, planNight, runNight, coverage, drawMap, V };
})();
if (typeof module !== 'undefined') module.exports = WriterVita;
