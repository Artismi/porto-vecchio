/* Porto Vecchio — gli eventi vicino al giocatore (la regia senza IA)
   Ogni 50-120 s, se sei all'aperto e nessuno ti dà la caccia, succede qualcosa con la gente vera che faceva la sua giornata,
   in un POSTO vicino (dove c'è già gente, o un luogo pubblico), non attorno a te: [leggera] la stessa scena non torna nello
   stesso posto nello stesso giorno né due volte nello stesso quartiere, i posti dove è successo qualcosa da poco pesano meno,
   nessuno esce di casa apposta per recitare, le scene che vengono verso di te (sigaretta, provocazione…) al massimo una ogni
   10 minuti, e attese e passi cambiano un po' ogni volta. Eventi.run(st, id) (le prove) cerca ancora gli attori attorno a te. Le scene sono schede di dati (SCENE, in fondo): chi recita (ruoli con un filtro), dove, e le battute in
   fila; l'interprete le esegue. Chi recita ha n.__ev: il movimento lo decide la scena (G.HOOKS.move) finché non viene
   colpito o stordito; poi torna alla sua giornata. Al massimo due scene insieme.

   Le battute (una chiave dice il tipo; w: secondi d'attesa dopo, dove ha senso):
     {say:'a', l:[...]}             dice una delle frasi ({a} {b}: i nomi; {o:a}: o/a secondo chi è); 'folla': uno del capannello
     {go:'a', to:T, sp, d, t}       va (T: un ruolo, 'player', 'spot', 'away' = lontano dal punto della scena); aspetta l'arrivo
     {all:[...]}                    in parallelo, finisce quando finiscono tutte
     {wait:s}  {pose:'a', p}  {mood:'a', m}  {look:'a', at:T}  {follow:'a', who, sp, d}  {wander:'a', r, sp}  {flee:'a', from, sp}
     {chase:'a', who:'b', sp, fsp, t, catch:[...], lose:[...]}   a insegue b (b scappa); poi un ramo o l'altro
     {crowd:n, around:'a', r, p}    si forma un capannello (ruolo 'folla')
     {fall:'a', t}  {up:'a'}  {brawl:['a','b'|'player']}  {jail:'a'}  {pay:['a','b',k]}
     {p:.5, then:[...], else:[...]} a caso
     {ladder:'a', up}  {ride:'a', L, fall}   la scala di ferro (la scena ha place:'ladder'), la BMX
     {fn:(st, sc) => ...}           un pezzo di codice
     [vita2] le scene legate ai posti (posti.js): la scheda porta posto: 'dehors' (o un array), ora: [dalle, alle] (alle > 24 =
     dopo mezzanotte; o un array di fasce), giorni: [2, 5] (0 = lunedì), soft: true (se non c'è il posto va bene anche altrove),
     postoF: q => ... (un filtro sul posto). Battute: {slot:'a', i, n, sp} va al posto i-esimo della disposizione leggibile
     (Posti.slots: primo piano, quinte, fondale) e si gira come vuole il posto; {hand:'a', id} prende in mano una cosa
     (anim_mano.js; null per posarla); {wrH:'a', h} si alza (h: 'posto' = la quota del tetto); {put:'a', to} si trova lì (i tetti);
     {van:'spot', kind} un furgone in doppia fila sulla via più vicina; {fire:'spot', t} un fuoco; {look:'a', at:'around'} si
     guarda attorno circospetto; go/follow verso 'van' e 'posto2' (il secondo posto dello stesso tipo). Filtri con alternative:
     f: 'shop|m' (prima il bottegaio, se non c'è un uomo); nuovi: adult, shop.
   Pose: quelle di anim_vita.js / anim_lotta.js; col suffisso _su vanno sulle braccia (fuma_su, telefona_su, indica_su...).
   Prove: Eventi.run(st, 'id'), Eventi.list(). */
var Eventi = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const CFG = { first: 25, every: [50, 120], near: 10, far: 34, max: 2, spotR: 18, spotFar: 46, playerEvery: 600, logMax: 40 };   // [leggera] più rade, nei posti
  const rnd = Math.random, hyp = Math.hypot, pick = a => a[Math.floor(rnd() * a.length)];
  const lerp = (a, b, f) => a + (b - a) * f, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const tileH = (x, y) => { const tx = Math.floor(x / G.TS), ty = Math.floor(y / G.TS); return tx >= 0 && ty >= 0 && tx < G.GW && ty < G.GH ? G.MAP.elev[ty * G.GW + tx] : 0; };
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const S = st => st.__eventi || (st.__eventi = { next: st.clock + CFG.first, live: [], bikes: [], vans: [], log: [], seen: {}, spots: {}, day: {}, lastPlayer: -1e9, byK: {} });
  const hour = st => ((st.t / 60) % 24 + 24) % 24;
  const night = st => { const h = hour(st); return h >= 21 || h < 6; };
  const PO = () => (typeof Posti !== 'undefined' ? Posti : null);   // [vita2] i posti per le situazioni
  const inHours = (h, hr) => { if (!h) return true; const L = Array.isArray(h[0]) ? h : [h]; return L.some(([a, z]) => z > 24 ? (hr >= a || hr < z - 24) : (hr >= a && hr < z)); };
  const weekday = t => (Math.floor(t / 1440) + 1) % 7;

  // ---------------- CHI PUÒ RECITARE ----------------
  // chi è in casa vicino (sulla soglia del suo edificio, «dentro» per popolo.js) può uscire per la scena, se fuori non c'è nessuno
  let DOORS = false;
  function free(st, n) {
    if (DOORS && n && n.inside && n.action && n.action.name === 'dentro' && n.pop && n.pop.near && !n.room && !n.dead && !n.__ev && !n.inVeh && !(n.jailedUntil > st.t) && !n.cop && !n.faction && !(n.pop.emer) && G.walkM(n.x, n.y)) return true;
    return n && !n.dead && !n.inside && !n.room && !n.__ev && !n.faction && !n.aggro && !n.reinforcement && !n.military && !(n.jailedUntil > st.t) && !(n.stun > 0)
      && n.wrH == null && !n.inVeh && !(n.pop && (n.pop.emer || !n.pop.near)) && (!n.action || n.action.name === 'routine') && !(n.panic > 0) && !n.cop;
  }
  const age = n => (n.pop && n.pop.age) || 35, fem = n => !!(n.pop && n.pop.sex === 'f');
  const FILTERS = {
    any: (st, n) => free(st, n), m: (st, n) => free(st, n) && !fem(n), f: (st, n) => free(st, n) && fem(n),
    old: (st, n) => free(st, n) && age(n) >= 45, young: (st, n) => free(st, n) && age(n) <= 30,
    cop: (st, n) => n.cop && !n.dead && !n.inside && !n.__ev && !(n.stun > 0) && !n.inVeh && n.action && n.action.name === 'pattuglia' && !G.hostile(st, n),
    writer: (st, n) => free(st, n) && !!(n.pop && n.pop.writer),
    // [vita2] adulti, e chi sta dietro un banco (il bottegaio, il barista, il fornaio): la scena della serranda e del pizzo li vuole
    adult: (st, n) => free(st, n) && age(n) >= 22 && age(n) <= 60,
    shop: (st, n) => free(st, n) && !!(n.shop || (n.pop && n.pop.job && /commess|barist|camerier|oste\b|cuoc|forn|macell|tabacc|gelat|pescivend|fruttiv|bottega|barbier|ferrament|farmac|sart|lavand|tipograf|edicol|panett/i.test(n.pop.job.title || ''))),
  };
  const dP = (st, o) => hyp(o.x - st.player.x, o.y - st.player.y);
  function near(st, x, y, r, f) { const out = []; for (const n of st.npcs) if (Math.abs(n.x - x) < r && Math.abs(n.y - y) < r && hyp(n.x - x, n.y - y) < r && f(n)) out.push(n); return out; }

  // ---------------- MOVIMENTO ----------------
  function go(st, o, x, y, sp, dt, roadCost) {
    if (!o.__eg || hyp(o.__eg.x - x, o.__eg.y - y) > 1.5 || st.clock - o.__eg.t > 2.5 || !o.path || !o.path.length) { G.goTo(o, x, y, roadCost); o.__eg = { x, y, t: st.clock }; if (!o.path.length) o.path = [{ x, y }]; }
    return G.stepAlong(o, sp, dt);
  }
  function fleePoint(n, from, L) {
    const away = Math.atan2(n.y - from.y, n.x - from.x); let best = null, bs = -1e9;
    for (let k = 0; k < 16; k++) { const a = away + (k / 16 - .5) * Math.PI * 1.4, x = n.x + Math.cos(a) * L, y = n.y + Math.sin(a) * L; if (!G.walkM(x, y)) continue; const s = -Math.abs(a - away) * 8 + rnd() * 4; if (s > bs) { bs = s; best = { x, y }; } }
    return best;
  }
  function wanderPoint(ax, ay, r) { for (let k = 0; k < 10; k++) { const a = rnd() * 6.283, d = r * (.4 + rnd() * .6), x = ax + Math.cos(a) * d, y = ay + Math.sin(a) * d; if (G.walkM(x, y)) return { x, y }; } return { x: ax, y: ay }; }
  // dove sta un bersaglio: un ruolo, il giocatore, il punto della scena
  function where(st, sc, T) {
    if (!T) return null; if (typeof T === 'object') return T;
    if (T === 'player') return st.player; if (T === 'spot') return sc.spot;
    if (T === 'away') return sc.away || (sc.away = fleePoint(sc.spot, st.player, 32) || wanderPoint(sc.spot.x, sc.spot.y, 25));
    if (T === 'van') {   // [vita2] il furgone della scena: ci si va allo sportello, dal lato del marciapiede (il mezzo è un ostacolo largo)
      if (sc.van && !sc.vanAt) { const v = sc.van, R = ((G.VK && G.VK[v.kind] && G.VK[v.kind].r) || 1.6) + .55, a = v.ang + Math.PI / 2, px = Math.cos(a), py = Math.sin(a), sg = (sc.spot.x - v.x) * px + (sc.spot.y - v.y) * py >= 0 ? 1 : -1;
        sc.vanAt = [sg, -sg].map(q => ({ x: v.x + px * q * R, y: v.y + py * q * R })).find(q => G.walkM(q.x, q.y)) || { x: v.x, y: v.y }; }
      return sc.vanAt || sc.spot; }
    if (T === 'around') return null;
    if (T === 'posto2') {   // [vita2] il secondo posto dello stesso tipo (il postino passa al portone dopo)
      if (sc.posto2 === undefined) { const P = PO(); sc.posto2 = null; if (P && sc.posto) { const q = P.near(sc.spot.x, sc.spot.y, 45, sc.posto.k).find(q => q !== sc.posto && q.__d > 4 && G.walkM(q.x, q.y)); if (q) sc.posto2 = { x: q.x, y: q.y }; } }
      return sc.posto2 || where(st, sc, 'away');
    }
    return sc.roles[T] || null;
  }
  // [vita2] la disposizione leggibile attorno al posto della scena (o attorno al punto, se la scena è nata senza posto)
  function slotsOf(st, sc, n) {
    if (sc.slots && sc.slots.length >= n) return sc.slots;
    const P = PO(), p = sc.posto || { k: Array.isArray(sc.def.posto) ? sc.def.posto[0] : sc.def.posto || 'angolo', x: sc.spot.x, y: sc.spot.y, dir: Math.atan2(st.player.y - sc.spot.y, st.player.x - sc.spot.x), cap: n };
    let out = null; if (P) { try { out = P.slots(p, n); } catch (e) { out = null; } }
    if (!out) { out = []; for (let k = 0; k < n; k++) { const a = p.dir + Math.PI / 2 + (k - (n - 1) / 2) * 1.1, x = p.x + Math.cos(a), y = p.y + Math.sin(a); out.push(G.walkM(x, y) ? { x, y, face: p.dir } : { x: p.x, y: p.y, face: p.dir }); } }
    return (sc.slots = out);
  }
  // la «guida» di chi recita: la eseguono G.HOOKS.move (a piedi) e tick (le cose speciali)
  function drive(st, sc, n, dt) {
    const m = n.__ev.mv || { k: 'stay' };
    if (m.k === 'lock') { n.speedNow = 0; return; }
    if (m.k === 'stay') { n.speedNow = 0;
      if (m.look === 'around') { if (m.f0 === undefined) { m.f0 = n.face; m.ph = rnd() * 6; } n.face = m.f0 + Math.sin(st.clock * .8 + m.ph) * 1.2 + Math.sin(st.clock * 2.3 + m.ph) * .25; return; }   // [vita2] circospetto: lo sguardo gira
      if (m.face != null) { n.face = m.face; return; }
      const t = where(st, sc, m.look); if (t && t !== n) n.face = Math.atan2(t.y - n.y, t.x - n.x); return; }
    if (m.k === 'go') { const t = where(st, sc, m.to); if (!t) { m.done = true; return; } if (hyp(t.x - n.x, t.y - n.y) <= (m.d || 1.1)) { m.done = true; n.speedNow = 0; if (m.face != null) n.face = m.face; else if (t !== n && m.to !== 'away' && !(m.to && m.to.x !== undefined)) n.face = Math.atan2(t.y - n.y, t.x - n.x); return; } m.done = false; if (go(st, n, t.x, t.y, m.sp || 1.6, dt)) { m.done = true; n.speedNow = 0; if (m.face != null) n.face = m.face; }
      // [vita2] incastrato (un furgone di traverso, uno spigolo): dopo due secondi senza avanzare si considera arrivato e la scena va avanti da lì
      if (m.lx === undefined || hyp(n.x - m.lx, n.y - m.ly) > .12) { m.lx = n.x; m.ly = n.y; m.lt = st.clock; } else if (st.clock - m.lt > 2) { m.done = true; n.speedNow = 0; if (m.face != null) n.face = m.face; else n.face = Math.atan2(t.y - n.y, t.x - n.x); }
      return; }
    if (m.k === 'follow') { const t = where(st, sc, m.who); if (!t) return; if (hyp(t.x - n.x, t.y - n.y) > (m.d || 1.4)) go(st, n, t.x, t.y, m.sp || 1.7, dt); else { n.speedNow = 0; n.face = Math.atan2(t.y - n.y, t.x - n.x); } return; }
    if (m.k === 'flee') { const f = where(st, sc, m.from) || st.player; if (!m.pt || hyp(m.pt.x - n.x, m.pt.y - n.y) < 2) m.pt = fleePoint(n, f, 30) || wanderPoint(n.x, n.y, 20); go(st, n, m.pt.x, m.pt.y, m.sp || 3.6, dt); return; }
    if (m.k === 'wander') { if (!m.pt || hyp(m.pt.x - n.x, m.pt.y - n.y) < .8 || st.clock - (m.pt.t || 0) > 9) { m.pt = wanderPoint(m.ax, m.ay, m.r || 5); m.pt.t = st.clock; } go(st, n, m.pt.x, m.pt.y, m.sp || 1, dt); return; }
    if (m.k === 'ring') { const t = where(st, sc, m.around); if (!t) return; if (!m.pt) { const a = rnd() * 6.283, r = 2.1 + rnd() * 1.4; m.pt = { x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r }; if (!G.walkM(m.pt.x, m.pt.y)) m.pt = { x: t.x + (n.x - t.x) * .5, y: t.y + (n.y - t.y) * .5 }; }
      if (hyp(m.pt.x - n.x, m.pt.y - n.y) > .6) go(st, n, m.pt.x, m.pt.y, m.sp || 1.9, dt); else { n.speedNow = 0; n.face = Math.atan2(t.y - n.y, t.x - n.x); } return; }
  }

  // ---------------- LE BATTUTE ----------------
  function fill(s, sc) {
    return s.replace(/\{o:([a-z]+)\}/g, (_, r) => fem(sc.roles[r] || {}) ? 'a' : 'o').replace(/\{([a-z]+)\}/g, (_, r) => { const n = sc.roles[r]; return n ? (n.first || n.name || '') : r; });
  }
  const actor = (sc, r) => r === 'folla' ? pick(sc.crowd.filter(n => n.__ev)) : sc.roles[r];
  const setMv = (n, m) => { if (n && n.__ev) { n.__ev.mv = m; n.path = []; n.__eg = null; } };
  // chi recita dice solo le battute della scena: le chiacchiere degli altri moduli (G.say) per lui tacciono
  let SAYING = false; const say0 = G.say;
  G.say = function (st, n, text, dur) { if (n && n.__ev && !SAYING) return; return say0.apply(this, arguments); };
  const sayEv = (st, n, text, dur) => { SAYING = true; try { say0(st, n, text, dur); n.barkCd = st.clock + 6; } finally { SAYING = false; } };
  const BEAT = {
    say: { start(st, sc, b) { const n = actor(sc, b.say); if (n && !n.dead) sayEv(st, n, fill(pick(b.l), sc), b.d || 3.2); }, wait: b => b.w !== undefined ? b.w : 2 },
    wait: { wait: b => b.wait },
    pose: { start(st, sc, b) { const n = actor(sc, b.pose); if (n && n.__ev) n.__ev.pose = b.p || null; if (b.pose === 'folla') sc.crowd.forEach(k => { if (k.__ev) k.__ev.pose = b.p || null; }); }, wait: b => b.w || 0 },
    mood: { start(st, sc, b) { const n = actor(sc, b.mood); if (n && n.__ev) n.__ev.mood = b.m || null; }, wait: () => 0 },
    look: { start(st, sc, b) { setMv(actor(sc, b.look), { k: 'stay', look: b.at }); }, wait: b => b.w || 0 },
    follow: { start(st, sc, b) { setMv(actor(sc, b.follow), { k: 'follow', who: b.who, sp: b.sp, d: b.d }); }, wait: b => b.w || 0 },
    wander: { start(st, sc, b) { const n = actor(sc, b.wander); if (n) setMv(n, { k: 'wander', ax: n.x, ay: n.y, r: b.r, sp: b.sp }); }, wait: b => b.w || 0 },
    flee: { start(st, sc, b) { setMv(actor(sc, b.flee), { k: 'flee', from: b.from, sp: b.sp }); }, wait: b => b.w || 0 },
    go: {
      start(st, sc, b) { const n = actor(sc, b.go); b._n = n; setMv(n, { k: 'go', to: b.to, sp: b.sp, d: b.d }); const t = n && where(st, sc, b.to); b._tl = b.t || (t ? hyp(t.x - n.x, t.y - n.y) / (b.sp || 1.6) * 1.8 + 6 : 0); },   // il tempo per arrivare: t se c'è (un tetto: la scena non aspetta chi va lontano), altrimenti secondo la distanza [vita2]
      tick(st, sc, b) { const n = b._n; if (!n || !n.__ev) return true; if (b._tl && st.clock - b._t > b._tl) return b.must ? 'abort' : true; /* non ci arriva: la scena va avanti da dov'è */ return !!(n.__ev.mv && n.__ev.mv.done); },
    },
    all: {
      start(st, sc, b) { b._s = b.all.map(x => Object.assign({}, x)); b._s.forEach(x => startBeat(st, sc, x)); },
      tick(st, sc, b, dt) { let all = true; for (const x of b._s) { if (x._done) continue; const r = tickBeat(st, sc, x, dt); if (r === 'abort') return 'abort'; if (r) x._done = true; else all = false; } return all; },
    },
    chase: {
      start(st, sc, b) { const a = actor(sc, b.chase), v = actor(sc, b.who); setMv(a, { k: 'follow', who: b.who, sp: b.sp || 3.6, d: .3 }); setMv(v, { k: 'flee', from: b.chase, sp: b.fsp || 3.7 }); sc.esc = v; },
      tick(st, sc, b) {
        const a = actor(sc, b.chase), v = actor(sc, b.who); if (!a || !a.__ev) return 'abort';
        if (!v || !v.__ev) { sc.esc = null; setMv(a, { k: 'stay' }); splice(sc, b.lose); return true; } /* è sparito in un portone: l'ha perso */
        const d = hyp(a.x - v.x, a.y - v.y), el = st.clock - b._t;
        if (d < .95 && el > .8) { setMv(a, { k: 'stay', look: b.who }); setMv(v, { k: 'stay', look: b.chase }); splice(sc, b.catch); return true; }
        if (el > (b.t || 14) || d > 26) { setMv(a, { k: 'stay', look: b.who }); splice(sc, b.lose); return true; }
        return false;
      },
    },
    crowd: {
      start(st, sc, b) { const c = where(st, sc, b.around); if (!c) return; const got = near(st, c.x, c.y, b.r || 18, n => free(st, n) && n !== c && !sc.cast.includes(n)).sort(() => rnd() - .5).slice(0, b.crowd);
        got.forEach(n => { cast(sc, n, 'folla'); sc.crowd.push(n); n.__ev.mv = { k: 'ring', around: b.around, sp: 1.6 + rnd() * .8 }; n.__ev.pose = b.p || null; }); },
      wait: b => b.w || 0,
    },
    fall: { start(st, sc, b) { const n = actor(sc, b.fall); if (!n || !n.__ev) return;   // chi è già uscito dalla scena (andato via) non cade più
      n.__ev.pose = null; n.__ev.down = st.clock + (b.t || 2.6); n.stun = Math.max(n.stun || 0, .05); n.hitT = st.clock; st.sfx.push({ k: 'thud', x: n.x, y: n.y }); setMv(n, { k: 'stay' }); }, wait: b => b.w !== undefined ? b.w : 1 },
    up: { start(st, sc, b) { const n = actor(sc, b.up); if (n && n.__ev) { n.__ev.down = 0; n.stun = 0; n.__ev.pose = 'rialza'; } }, wait: () => 1.2, after(st, sc, b) { const n = actor(sc, b.up); if (n && n.__ev && n.__ev.pose === 'rialza') n.__ev.pose = null; } },
    brawl: { start(st, sc, b) { const A = AZ(), x = actor(sc, b.brawl[0]), y = b.brawl[1] === 'player' ? 'player' : actor(sc, b.brawl[1]); sc.over = true; if (!A || !A.brawl || !x || !x.pop || (y !== 'player' && !(y && y.pop))) return; sc.after = () => { try { A.brawl(st, x, y, { why: sc.def.id }); } catch (e) { } }; }, wait: () => 0 },
    jail: { start(st, sc, b) { const n = actor(sc, b.jail); if (n) { n.jailedUntil = st.t + 180; sayEv(st, n, pick(['Chiamo il mio avvocato!', 'Non ho fatto niente!', 'Ve ne pentirete!']), 3); } }, wait: () => 0 },
    pay: { start(st, sc, b) { const x = actor(sc, b.pay[0]), y = actor(sc, b.pay[1]), k = b.pay[2] || 1; if (x && y && x.pop && y.pop && x.pop.money >= k) { x.pop.money -= k; y.pop.money += k; } }, wait: () => 0 },
    p: { start(st, sc, b) { splice(sc, rnd() < b.p ? b.then : b.else); }, wait: () => 0 },
    fn: { start(st, sc, b) { b.fn(st, sc); }, wait: b => b.w || 0 },
    end: { start(st, sc) { sc.over = true; }, wait: () => 0 },
    // [vita2] al suo posto nella disposizione (i: quale, n: quanti in tutto), e si gira come vuole il posto
    slot: {
      start(st, sc, b) { const n = actor(sc, b.slot); b._n = n; if (!n) return; const S0 = slotsOf(st, sc, b.n || Math.max(b.i + 1, Object.keys(sc.roles).filter(k => !k.startsWith('__')).length)), s = S0[Math.min(b.i || 0, S0.length - 1)];
        setMv(n, { k: 'go', to: { x: s.x, y: s.y }, sp: b.sp || 1.5, d: .35, face: b.face === 'spot' ? Math.atan2(sc.spot.y - s.y, sc.spot.x - s.x) : b.face === 'out' ? s.face + Math.PI : s.face }); b._tl = Math.min(hyp(s.x - n.x, s.y - n.y) / (b.sp || 1.5) * 1.8 + 6, b.t || 22); },   // chi arriva tardi arriva camminando: la scena non lo aspetta più di 22 s
      tick(st, sc, b) { const n = b._n; if (!n || !n.__ev) return true; if (st.clock - b._t > b._tl) return true; return !!(n.__ev.mv && n.__ev.mv.done); },
    },
    hand: { start(st, sc, b) { const n = actor(sc, b.hand); if (!n || !n.__ev) return; if (!n.__ev.handSet) { n.__ev.handSet = true; n.__ev.hand0 = n.hand || null; } n.hand = b.id || null; }, wait: b => b.w || 0 },
    wrH: { start(st, sc, b) { const n = actor(sc, b.wrH); if (!n || !n.__ev) return; if (b.h === 'posto') { if (!sc.posto || sc.posto.h3 == null) return; n.wrH = sc.posto.h3 - tileH(n.x, n.y); } else n.wrH = b.h == null ? null : b.h; n.__ev.wrH = n.wrH != null; if (n.wrH == null) n.__ev.wrH = false; }, wait: () => 0 },
    put: { start(st, sc, b) { const n = actor(sc, b.put); if (!n || !n.__ev) return; if (b.to === 'spot' && !sc.posto) return; const t = where(st, sc, b.to); if (!t) return; n.x = t.x; n.y = t.y; n.path = []; if (b.face != null) n.face = b.face; else if (sc.posto) n.face = sc.posto.dir; setMv(n, { k: 'lock' }); n.__ev.put = true; }, wait: () => 0 },
    van: {   // un furgone (o un'Ape) in doppia fila sulla carreggiata più vicina al posto
      start(st, sc, b) { const c = where(st, sc, b.van || 'spot'); if (!c) return; let best = null, bd = 1e9; const tx0 = Math.floor(c.x / G.TS), ty0 = Math.floor(c.y / G.TS);
        for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (G.tileAt(tx, ty) !== G.T.VIA) continue; const d = dx * dx + dy * dy; if (d < 4) continue; if (d < bd) { bd = d; best = [tx, ty]; } }   // non addosso al posto: il furgone non deve chiudere il passaggio
        if (!best) return; const [tx, ty] = best, horiz = G.tileAt(tx + 1, ty) === G.T.VIA && G.tileAt(tx - 1, ty) === G.T.VIA && !(G.tileAt(tx, ty + 1) === G.T.VIA && G.tileAt(tx, ty - 1) === G.T.VIA), ang = horiz ? 0 : Math.PI / 2;
        const kind = b.kind || (bd > 16 ? 'ape' : 'furgone'), x = tx * G.TS + G.TS / 2, y = ty * G.TS + G.TS / 2;
        if (st.vehicles.some(v => !v.hidden && hyp(v.x - x, v.y - y) < 4)) { sc.van = st.vehicles.find(v => !v.hidden && hyp(v.x - x, v.y - y) < 4); return; }
        const v = G.makeVehicle(st, { id: 'ev_van' + Math.floor(st.clock * 1000) + '_' + Math.floor(rnd() * 99), kind, x, y, ang, color: kind === 'vespa' ? pick(['#e8d9a8', '#58b8a6', '#d8473f', '#9ab8d0']) : pick(['#e8e0d0', '#d8d0c0', '#9ab07a', '#c8642a', '#f2ead6']), ev: true });
        st.vehicles.push(v); S(st).vans.push({ id: v.id, t: st.clock }); sc.van = v; },
      wait: () => 0,
    },
    fire: { start(st, sc, b) { let c = where(st, sc, b.fire || 'spot'); if (!c) return;
        // senza un posto «fuoco» il punto della scena è dove sta il primo attore: il fuoco va a un passo e mezzo, dove nessuno si brucia
        if (!sc.posto && c === sc.spot) { let best = null, bs = -1; for (let k = 0; k < 8; k++) { const a = k / 8 * 2 * Math.PI, x = c.x + Math.cos(a) * 1.6, y = c.y + Math.sin(a) * 1.6; if (!G.walkM(x, y)) continue; const m = Math.min(...sc.cast.map(n => hyp(n.x - x, n.y - y)), 9); if (m > bs) { bs = m; best = { x, y }; } } if (best && bs > .9) { sc.spot = best; sc.slots = null; c = best; } }
        const f0 = st.fires.find(f => f.ev && hyp(f.x - c.x, f.y - c.y) < 2); if (f0) f0.until = Math.max(f0.until, st.clock + (b.t || 45)); else st.fires.push({ x: c.x, y: c.y, r: b.r || .45, until: st.clock + (b.t || 45), owner: null, ev: true, calmo: true }); sc.fire = true; }, wait: () => 0 },
    ladder: {
      start(st, sc, b) { const n = actor(sc, b.ladder), L = sc.L, TT = Tetti; b._a = TT._.footH(L); b._b = TT._.topH(L); b._g = tileH(L.fx, L.fy); b._T = Math.max(2.5, Math.abs(b._b - b._a) / 1.1); setMv(n, { k: 'lock' }); n.__ev.wrH = true; },
      tick(st, sc, b) { const n = actor(sc, b.ladder), L = sc.L; if (!n || !n.__ev) return 'abort'; const f = clamp((st.clock - b._t) / b._T, 0, 1);
        n.x = L.fx; n.y = L.fy; n.face = L.ang + Math.PI; n.wrH = (b.up ? lerp(b._a, b._b, f) : lerp(b._b, b._a, f)) - b._g; n.__climb = nowMs(); n.speedNow = 0;
        if (f < 1) return false; if (b.up) { n.x = L.tx; n.y = L.ty; n.wrH = b._b - tileH(L.tx, L.ty); setMv(n, { k: 'lock' }); } else { n.wrH = null; n.__ev.wrH = false; setMv(n, { k: 'stay' }); } return true; },
    },
    ride: {
      start(st, sc, b) {
        const n = actor(sc, b.ride); let to = null; for (let k = 0; k < 14 && !to; k++) { const a = Math.atan2(st.player.y - n.y, st.player.x - n.x) + (rnd() < .5 ? -1 : 1) * (Math.PI / 2 + (rnd() - .5) * .9), L = (b.L || 28) + rnd() * 8, x = n.x + Math.cos(a) * L, y = n.y + Math.sin(a) * L; if (G.walkM(x, y)) to = { x, y }; }
        if (!to) { b._fail = true; return; }
        const v = G.makeVehicle(st, { id: 'ev_bmx' + Math.floor(st.clock * 1000) + '_' + Math.floor(rnd() * 99), kind: 'bmx', x: n.x, y: n.y, ang: Math.atan2(to.y - n.y, to.x - n.x), color: pick(['#d02a2a', '#2a6ac8', '#e8c040', '#3a9a5a', '#1e1e24']), rider: 'npc', vx: 0, vy: 0, w: 0 });
        st.vehicles.push(v); S(st).bikes.push(v.id);
        // la bici sta in un oggetto suo e il ciclista lo segue: chi spinge via dai mezzi non lo fa scivolare di lato
        b._v = v; b._o = { id: n.id + '_bici', x: n.x, y: n.y, face: v.ang, path: [] }; b._to = to; b._fallAt = b.fall ? 3 + rnd() * 4 : 99;
        n.__ev.pose = 'in_bmx'; n.__ev.wrH = true; setMv(n, { k: 'ride', o: b._o, to });
      },
      tick(st, sc, b, dt) {
        if (b._fail) return 'abort'; const n = actor(sc, b.ride), v = b._v, o = b._o; if (!n || !n.__ev) return 'abort';
        n.x = o.x; n.y = o.y; n.face = o.face; n.wrH = .35; v.x = o.x; v.y = o.y; v.ang = o.face; v.vx = v.vy = 0; v.speed = o.speedNow || 0; v.pedal = true; v.crank = (v.crank || 0) + (o.speedNow || 0) * dt / .9; n.__ev.crank = v.crank;
        const arrived = hyp(o.x - b._to.x, o.y - b._to.y) < 2, fall = !!b.fall && (arrived || st.clock - b._t > b._fallAt);   // chi deve cadere cade al più tardi in fondo alla corsa
        if (!arrived && !fall && st.clock - b._t < 20) return false;
        v.rider = null; v.speed = 0; v.pedal = false; n.wrH = null; n.__ev.wrH = false; n.__ev.pose = null; setMv(n, { k: 'stay' });
        const s = Math.sin(o.face), c = Math.cos(o.face); if (G.walkM(o.x - s * .9, o.y + c * .9)) { n.x = o.x - s * .9; n.y = o.y + c * .9; }
        if (fall) { n.__ev.down = st.clock + 2.6; n.stun = Math.max(n.stun || 0, .05); n.hitT = st.clock; st.sfx.push({ k: 'thud', x: n.x, y: n.y }); splice(sc, b.then); }
        return true;
      },
    },
  };
  // il tipo della battuta: la prima di queste chiavi presente (ladder e ride prima di up e fall, che lì sono opzioni)
  const ORDER = ['all', 'chase', 'crowd', 'ladder', 'ride', 'slot', 'van', 'fire', 'put', 'wrH', 'hand', 'go', 'say', 'pose', 'mood', 'look', 'follow', 'wander', 'flee', 'fall', 'up', 'brawl', 'jail', 'pay', 'fn', 'end'];
  function splice(sc, list) { if (list && list.length) sc.beats.splice(sc.i + 1, 0, ...list.map(x => Object.assign({}, x))); }
  function startBeat(st, sc, b) {
    b._t = st.clock; const k = ORDER.find(k => b[k] !== undefined) || (b.p !== undefined && b.then ? 'p' : 'wait');
    if (!b._var) { b._var = true; if (typeof b.wait === 'number') b.wait *= .75 + rnd() * .6; if (typeof b.sp === 'number') { const f = .9 + rnd() * .2; b.sp *= f; if (typeof b.fsp === 'number') b.fsp *= f; } }   /* chi insegue e chi scappa con lo stesso fattore: l'esito resta quello di prima */   // [leggera] ogni volta un po' diversa
    b._k = k; const H = BEAT[k]; if (H.start) H.start(st, sc, b); b._w = H.wait ? H.wait(b) : 0;
  }
  function tickBeat(st, sc, b, dt) {
    const H = BEAT[b._k]; let r = true;
    if (H.tick) r = H.tick(st, sc, b, dt);
    else r = st.clock - b._t >= (b._w || 0);
    if (r === true && H.tick && b.w && b._k !== 'all') { if (!b._wt) { b._wt = st.clock; r = false; } else r = st.clock - b._wt >= b.w; }
    if (r === true && H.after) H.after(st, sc, b);
    return r;
  }

  // ---------------- LA SCENA ----------------
  function cast(sc, n, role) { if (n.inside) { n.inside = false; n.action = { name: 'routine', scores: [], why: 'esce un momento', since: 0 }; }   // esce dalla porta
    n.__ev = { sc, role, pose: null, mood: null, mv: { k: 'stay' } }; n.path = []; n.goal = null; sc.cast.push(n); return n; }
  function release(st, sc) {
    sc.cast.forEach(n => { if (n.__ev && n.__ev.sc === sc) { if (n.__ev.wrH && n.wrH != null) { if (sc.L) { n.x = sc.L.fx; n.y = sc.L.fy; } n.wrH = null; }
      if (n.__ev.put && sc.posto && sc.posto.tetto) { const b = G.BUILDINGS[sc.posto.bi]; if (b && b.door) { n.x = b.door[0] * G.TS + G.TS / 2; n.y = b.door[1] * G.TS + G.TS / 2; } n.wrH = null; }   // [vita2] dal tetto si torna giù dalla porta
      if (n.__ev.handSet) n.hand = n.__ev.hand0;   // [vita2] quello che aveva in mano per la scena si posa
      delete n.__ev; n.path = []; n.goal = null; n.__climb = null; n.__eg = null; } });
    const E = S(st); E.live = E.live.filter(x => x !== sc);
    if (sc.after) sc.after();
  }
  function pickRoles(st, D, auto) {
    if (!auto) return pickRoles0(st, D, false) || pickRoles0(st, D, true);
    // [leggera] la regia: prima il posto, poi chi c'è lì (niente porte: nessuno esce apposta)
    if (D.place) return pickRoles0(st, D, false);
    // [vita2] le scene legate a un posto: prima i posti del loro tipo, vivi a quest'ora, vicini; se la scena è soft va bene anche altrove
    if (D.posto) { for (const sp of postiFor(st, D)) { const r = pickRoles0(st, D, false, sp); if (r) { r.__spot = sp; r.__posto = sp.posto; return r; } } if (!D.soft) return null; }
    const spots = spotsFor(st, D);
    for (const sp of spots) { const r = pickRoles0(st, D, false, sp); if (r) { r.__spot = r.__spot || sp; return r; } }
    return null;
  }
  // [leggera] i posti dove può succedere: dove c'è già gente all'aperto e i luoghi pubblici, fra 12 e 46 m da te, mai lo stesso
  // per la stessa scena nello stesso giorno; più peso a chi non ha visto niente da un pezzo. In ordine di peso, un po' a caso.
  const cellK = (x, y) => Math.round(x / 40) + ',' + Math.round(y / 40);
  function spotsFor(st, D) {
    const E = S(st), p = st.player, day = Math.floor(st.t / 1440), out = [], seen = new Set();
    const add = (x, y) => { const d = hyp(x - p.x, y - p.y); if (d < 12 || d > CFG.spotFar || !G.walkM(x, y)) return; const k = cellK(x, y); if (seen.has(k)) return; seen.add(k);
      const last = E.spots[k], same = E.spots[k + '|' + D.id]; if (same !== undefined && Math.floor(same / 1440) === day) return;
      const w = (last === undefined ? 1 : Math.min(1, .15 + (st.t - last) / 240)) * (.6 + rnd() * .8); out.push({ x, y, k, w }); };
    for (const n of st.npcs) if (!n.inside && !n.dead && !n.cop && !n.__ev && Math.abs(n.x - p.x) < CFG.spotFar && Math.abs(n.y - p.y) < CFG.spotFar) add(n.x, n.y);
    const PL = G.PLACES || {}; for (const id in PL) { const q = PL[id]; if (q && Math.abs(q.x - p.x) < CFG.spotFar && Math.abs(q.y - p.y) < CFG.spotFar) add(q.x, q.y); }
    return out.sort((a, b) => b.w - a.w).slice(0, 5);
  }
  // [vita2] i posti del tipo giusto attorno al giocatore (fra 9 e 46 m), vivi a quest'ora, non già usati oggi per la stessa scena,
  // pesati per la zona (il borgo pieno, la Vittoria vuota). 'sosta' è un posto virtuale: dove c'è un'auto parcheggiata.
  function postiFor(st, D) {
    const E = S(st), p = st.player, day = Math.floor(st.t / 1440), out = [], ks = Array.isArray(D.posto) ? D.posto : [D.posto], P = PO();
    const add = (x, y, posto, dens) => { const k = cellK(x, y), same = E.spots[k + '|' + D.id]; if (same !== undefined && Math.floor(same / 1440) === day) return;
      const last = E.spots[k], w = (last === undefined ? 1 : Math.min(1, .15 + (st.t - last) / 240)) * (.6 + rnd() * .8) * (dens + .2); out.push({ x, y, k, w, posto }); };
    if (P) for (const q of P.near(p.x, p.y, CFG.spotFar, ks.filter(k => k !== 'sosta'))) { if (q.__d < 9 || !P.openAt(q, st.t) || (q.tetto ? q.h3 == null : !G.walkM(q.x, q.y))) continue; if (D.postoF && !D.postoF(q)) continue; add(q.x, q.y, q, P.density(q, st.t)); }
    if (ks.includes('sosta')) for (const v of st.vehicles) { if (v.hidden || v.wreck || v.traffic || v.rider || v.ev || G.VK[v.kind].boat) continue; const d = hyp(v.x - p.x, v.y - p.y); if (d < 9 || d > CFG.spotFar) continue;
      const a = v.ang + Math.PI / 2, x = v.x + Math.cos(a) * 2.2, y = v.y + Math.sin(a) * 2.2; if (!G.walkM(x, y)) continue; add(x, y, { k: 'sosta', x, y, dir: a + Math.PI, cap: 3, v }, .8); }
    return out.sort((a, b) => b.w - a.w).slice(0, 5);
  }
  const postiAny = (st, D) => postiFor(st, D).length > 0;
  const districtOf =(x, y) => { const W = typeof World !== 'undefined' ? World : null; try { return (W && W.districtAt && W.districtAt(x, y)) || cellK(x, y); } catch (e) { return cellK(x, y); } };
  function pickRoles0(st, D, doors, spot) {
    const roles = {}, used = new Set(), p = st.player;
    if (spot) roles.__spot = spot;
    if (D.place === 'ladder') {
      const TT = typeof Tetti !== 'undefined' ? Tetti : null; if (!TT || !TT.LADDERS.length || !TT._ || !TT._.footH) return null;
      const L = pick(TT.LADDERS.filter(L => L.footB < 0 && hyp(L.fx - p.x, L.fy - p.y) > 10 && hyp(L.fx - p.x, L.fy - p.y) < CFG.far && G.walkM(L.fx, L.fy))); if (!L) return null;
      roles.__L = L; roles.__spot = { x: L.fx, y: L.fy };
    }
    for (const R0 of D.roles) {
      const R = Object.assign({ doors }, R0);
      // [vita2] filtri con alternative ('shop|m'): si prova il primo, poi gli altri
      const alts = String(R.f || 'any').split('|'), base = R.near ? roles[R.near] : roles.__spot || p, r = R.r || (R.near ? 14 : spot && !R.near ? CFG.spotR : CFG.far), ring = spot ? (R.near ? null : [CFG.near - 2, CFG.spotFar + 8]) : R.ring || (R.near || roles.__spot ? null : [CFG.near, CFG.far]);
      let c = [];
      for (const fk of alts) {
        const F = FILTERS[fk] || FILTERS.any, f = (st2, n) => { DOORS = false; if (F(st2, n)) return true; if (fk === 'cop' || fk === 'writer' || !R.doors) return false; DOORS = true; const r0 = F(st2, n); DOORS = false; return r0; };
        c = near(st, base.x, base.y, r, n => !used.has(n) && f(st, n) && (!ring || (dP(st, n) >= ring[0] && dP(st, n) <= ring[1])) && dP(st, n) > (R.min !== undefined ? R.min : 4));
        if (c.length) break;
      }
      if (!c.length) return null; const n = pick(c); roles[R.id] = n; used.add(n);
    }
    return roles;
  }
  function run(st, id, auto) {
    const E = S(st), D = SCENE.find(s => s.id === id); if (!D) return null;
    if (D.solo) { try { return D.solo(st) ? { def: D } : null; } catch (e) { return null; } }
    if (E.live.length >= CFG.max) return null;
    const roles = pickRoles(st, D, auto); if (!roles) return null;
    if (auto) { const sp0 = roles.__spot || roles[D.roles[0].id], day = Math.floor(st.t / 1440), k0 = cellK(sp0.x, sp0.y);   // [leggera] anche per chi sceglie il posto da sé (la scala)
      if ((E.spots[k0 + '|' + id] !== undefined && Math.floor(E.spots[k0 + '|' + id] / 1440) === day) || E.day[id + '|' + districtOf(sp0.x, sp0.y)] === day) return null; }
    // [vita2] lanciata a mano (le prove): il posto più vicino del tipo giusto, se c'è
    if (!auto && D.posto && !roles.__posto) { const P = PO(); if (P) { const ks = (Array.isArray(D.posto) ? D.posto : [D.posto]).filter(k => k !== 'sosta'), q = P.near(st.player.x, st.player.y, CFG.far, ks).find(q => q.__d >= 5 && (q.tetto ? q.h3 != null : G.walkM(q.x, q.y))); if (q) { roles.__spot = { x: q.x, y: q.y }; roles.__posto = q; } } }
    const sc = { def: D, roles, cast: [], crowd: [], beats: D.beats.map(x => Object.assign({}, x)), i: -1, spot: roles.__spot || { x: roles[D.roles[0].id].x, y: roles[D.roles[0].id].y }, L: roles.__L, posto: roles.__posto || null, t0: st.clock };
    D.roles.forEach(R => cast(sc, roles[R.id], R.id));
    E.live.push(sc); E.log.push({ id, t: st.t, k: cellK(sc.spot.x, sc.spot.y), posto: sc.posto ? sc.posto.k : null }); if (E.log.length > (CFG.logMax || 40)) E.log.shift(); E.seen[id] = st.clock;
    if (sc.posto) E.byK[sc.posto.k] = (E.byK[sc.posto.k] || 0) + 1;
    { const k = cellK(sc.spot.x, sc.spot.y); E.spots[k] = st.t; E.spots[k + '|' + id] = st.t; E.day[id + '|' + districtOf(sc.spot.x, sc.spot.y)] = Math.floor(st.t / 1440); if (D.player) E.lastPlayer = st.clock; }
    next(st, sc);
    return sc;
  }
  function next(st, sc) { sc.i++; if (sc.over || sc.i >= sc.beats.length) { sc.over = true; return; } startBeat(st, sc, sc.beats[sc.i]); }
  function tickScene(st, sc, dt) {
    // chi è stato colpito, stordito per davvero o è entrato da qualche parte esce di scena; i primi due ruoli la reggono
    sc.cast.forEach(n => { if (n.__ev && n.__ev.down) { if (n.__ev.down > st.clock) n.stun = Math.max(n.stun, .05); else { n.__ev.down = 0; n.stun = 0; } } });
    if (sc.esc && sc.esc.__ev && sc.esc.inside) delete sc.esc.__ev;   // chi scappa e si infila in un portone esce di scena (l'inseguimento lo vede)
    // [vita2] chi se ne sta andando (verso 'away', o scappa) e infila un portone ha solo finito la sua parte: esce di scena, la scena va avanti
    for (const n of sc.cast) if (n.__ev && n.inside && !n.dead && n.__ev.mv && (n.__ev.mv.k === 'flee' || n.__ev.mv.to === 'away') && n !== sc.esc) { n.__ev.mv.done = true; delete n.__ev; }
    for (const n of sc.cast) if (n.__ev && (n.dead || n.inside || (n.stun > 0 && !(n.__ev.down > st.clock)))) { if (sc.cast.indexOf(n) < 2) { sc.why = `${n.__ev.role}: ${n.dead ? 'morto' : n.inside ? 'entrato' : 'colpito'}`; return false; } delete n.__ev; }
    if (st.clock - sc.t0 > 90) { sc.why = 'troppo lunga'; return false; }
    let guard = 0;
    while (!sc.over && guard++ < 20) { const b = sc.beats[sc.i]; const r = tickBeat(st, sc, b, dt); if (r === 'abort') { sc.why = 'interrotta: ' + b._k; return false; } if (!r) break; next(st, sc); }
    if (sc.over && !sc.why) sc.why = 'fatto';
    return !sc.over;
  }
  function weight(st, D) {
    if (D.when === 'night' && !night(st)) return 0; if (D.when === 'day' && night(st)) return 0;
    if (D.ora && !inHours(D.ora, hour(st))) return 0; if (D.giorni && !D.giorni.includes(weekday(st.t))) return 0;   // [vita2] l'ora e il giorno giusti
    if (D.posto && !D.soft && !postiAny(st, D)) return 0;   // [vita2] senza il suo posto vicino la scena non c'è
    if (D.player && (st.player.vehicle || st.player.lv)) return 0;
    const E = S(st), ago = st.clock - (E.seen[D.id] || -1e9);
    if (D.player && st.clock - E.lastPlayer < CFG.playerEvery) return 0;   // [leggera] chi viene verso di te: di rado
    if (E.day[D.id + '|' + districtOf(st.player.x, st.player.y)] === Math.floor(st.t / 1440)) return 0;   // [leggera] già successa qui oggi
    return (D.w || 1) * (ago < 240 ? .15 : 1) * (D.posto && !D.soft ? 1.6 : 1);   // la stessa scena non torna subito; [vita2] dove c'è il suo posto, la scena del posto pesa di più
  }
  function step(st, dt) {
    const E = S(st), p = st.player;
    for (const sc of E.live.slice()) { let ok = true; try { ok = tickScene(st, sc, dt); } catch (e) { ok = false; if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Eventi]', sc.def.id, e); } } if (!ok || dP(st, sc.spot) > 75) { if (ok) sc.why = `lontano (${dP(st, sc.spot).toFixed(0)} m)`; release(st, sc); } }
    // le bici rimaste per terra: se nessuno le usa e sei lontano, spariscono
    if (E.bikes.length && (st.__evBk = (st.__evBk || 0) + dt) > 2) { st.__evBk = 0; E.bikes = E.bikes.filter(id => { const i = st.vehicles.findIndex(v => v.id === id); if (i < 0) return false; const v = st.vehicles[i]; if (v.rider || p.vehicle === id || dP(st, v) < 60) return true; st.vehicles.splice(i, 1); return false; }); }
    // [vita2] i furgoni delle consegne: finita la scena, appena sei lontano (o dopo cinque minuti) ripartono
    if (E.vans.length && (st.__evVn = (st.__evVn || 0) + dt) > 3) { st.__evVn = 0; E.vans = E.vans.filter(q => { const i = st.vehicles.findIndex(v => v.id === q.id); if (i < 0) return false; const v = st.vehicles[i]; if (E.live.some(sc => sc.van === v) || v.rider || p.vehicle === v.id || (dP(st, v) < 45 && st.clock - q.t < 300)) return true; st.vehicles.splice(i, 1); return false; }); }
    if (st.clock < E.next) return;
    if (p.indoor || (p.lv && p.lv.k !== 'tetto') || st.chase || st.over || E.live.length >= CFG.max) { E.next = st.clock + 4; return; }
    // a sorte secondo il peso; se una scena non trova i suoi attori se ne prova un'altra
    let pool = SCENE.map(D => [D, weight(st, D)]).filter(x => x[1] > 0);
    // [vita2] una volta su due la regia sceglie fra le scene del posto (quelle che hanno qui il loro posto e la loro ora): la città vive dei suoi luoghi
    E.alt = !E.alt; if (E.alt) { const own = pool.filter(x => x[0].posto && !x[0].soft); if (own.length) pool = own; }
    for (let k = 0; k < 6 && pool.length; k++) {
      let tot = pool.reduce((s, x) => s + x[1], 0), r = rnd() * tot, j = 0; while (j < pool.length - 1 && (r -= pool[j][1]) > 0) j++;
      const D = pool.splice(j, 1)[0][0]; if (run(st, D.id, true)) break;
    }
    E.next = st.clock + CFG.every[0] + rnd() * (CFG.every[1] - CFG.every[0]);
  }
  function move(st, n, dt) {
    const e = n.__ev; if (!e) return false; if (!S(st).live.includes(e.sc)) { delete n.__ev; return false; }
    if (n.dead || (n.stun > 0 && !(e.down > st.clock))) return false;
    if (e.down > st.clock) { n.speedNow = 0; return true; }
    if (e.mv && e.mv.k === 'ride') { const o = e.mv.o; go(st, o, e.mv.to.x, e.mv.to.y, 4.6, dt, 1); return true; }
    drive(st, e.sc, n, dt); return true;
  }

  // ---------------- IL CATALOGO ----------------
  const SAY = (r, ...l) => ({ say: r, l });
  const SCENE = [
    // --- la strada che scappa ---
    // [vita2] le scene di prima si legano ai posti giusti (soft: se il posto non c'è, succedono dove c'è gente)
    { id: 'scippo', w: 3, posto: ['fermata', 'pensilina', 'mercato'], soft: true, roles: [{ id: 'a' }, { id: 'b', near: 'a', f: 'young', min: 6 }], beats: [
      { go: 'b', to: 'a', sp: 1.9, d: 1, t: 18 }, SAY('a', 'Ehi! La borsa!', 'Il portafoglio! Ladro!', 'Ma che fai?!'),
      { chase: 'a', who: 'b', sp: 3.45, fsp: 3.9, t: 13, catch: [SAY('a', 'Ti ho preso, disgraziato!', 'Ridammela subito!'), { brawl: ['a', 'b'] }],
        lose: [SAY('a', 'Maledetto... la mia borsa.', 'Al ladro! Nessuno fa niente?', 'Non ce la faccio più...'), { wait: 2 }] },
      SAY('a', 'Al ladro! Al ladro!', 'Fermatelo!', 'Prendetelo!')] },
    { id: 'non_ha_pagato', w: 2, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'young', min: 5 }], beats: [
      { go: 'b', to: 'a', sp: 1.5, d: 1.6, t: 18 }, { pose: 'b', p: 'raccoglie', w: 1.4 }, { pose: 'b' },
      SAY('a', 'Ehi! Le mie pesche!', 'Fermo! Non hai pagato!', 'Torna qui, ladruncolo!'),
      { chase: 'a', who: 'b', sp: 3.2, fsp: 3.95, t: 10, catch: [SAY('a', 'Adesso le paghi, e il doppio!'), { pay: ['b', 'a', 2] }, SAY('b', 'Va bene, va bene! Ecco i soldi!')],
        lose: [SAY('a', 'Ti conosco! Lo dico a tua madre!', 'Ti ho visto in faccia, sai!'), { pose: 'a', p: 'rabbia' }, { wait: 2 }] }] },
    { id: 'polizia_insegue', w: 3, roles: [{ id: 'a', f: 'cop', ring: [8, 40] }, { id: 'b', near: 'a', r: 28, min: 7 }], beats: [
      SAY('a', 'Alt! Polizia! Fermati!', 'Ehi tu! Fermo lì!', 'Fermo! Documenti!'), SAY('b', 'La pula! Via!', 'Non ho fatto niente!', 'Col cavolo!'),
      { chase: 'a', who: 'b', sp: 4.15, fsp: 3.7, t: 16, catch: [{ pose: 'a', p: 'ammanetta' }, { pose: 'b', p: 'ammanettato' }, SAY('a', 'Sei in arresto.', 'Mani dietro la schiena!', 'Fine della corsa.'), { wait: 3.5 }, { jail: 'b' }],
        lose: [SAY('a', 'L\'ho perso... Centrale, ricercato a piedi.', 'Maledizione, è sparito.'), { wait: 2 }] }] },
    { id: 'perquisizione', w: 2, roles: [{ id: 'a', f: 'cop', ring: [8, 40] }, { id: 'b', near: 'a', f: 'young', r: 22 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 20 }, { look: 'b', at: 'a' }, SAY('a', 'Documenti, prego.', 'Fermo lì. Controllo.', 'Dove vai così di fretta?'),
      { pose: 'b', p: 'mani_alzate_su' }, { pose: 'a', p: 'perquisisce', w: 3.5 },
      { p: .3, then: [SAY('a', 'E questo cos\'è?'), SAY('b', 'Non è mio! Giuro!'), { p: .5, then: [{ chase: 'a', who: 'b', sp: 4.1, fsp: 3.8, t: 12, catch: [{ pose: 'a', p: 'ammanetta' }, { pose: 'b', p: 'ammanettato' }, { wait: 3 }, { jail: 'b' }], lose: [SAY('a', 'Tanto ti ritrovo.')] }], else: [{ pose: 'a', p: 'ammanetta' }, { pose: 'b', p: 'ammanettato' }, SAY('a', 'Vieni con me.'), { wait: 3 }, { jail: 'b' }] }],
        else: [{ pose: 'a' }, { pose: 'b' }, SAY('a', 'Va bene. Circolare.', 'Tutto a posto. Vai pure.'), SAY('b', 'Ogni volta la stessa storia...', 'Grazie, eh.'), { flee: 'b', from: 'a', sp: 1.6 }, { wait: 3 }] }] },
    { id: 'corsa_autobus', w: 1, posto: ['fermata', 'pensilina'], soft: true, ora: [6.5, 22], roles: [{ id: 'a' }], beats: [
      SAY('a', 'Aspetta! Aspettaaa!', 'Ferma! Devo salire!'), { go: 'a', to: 'away', sp: 3.8, d: 2, t: 9, soft: true }, { mood: 'a', m: 'stanco' }, { look: 'a', at: 'away' },
      SAY('a', 'Perso... anche oggi.', 'Ma porca miseria!', 'Il prossimo tra un\'ora...'), { wait: 3 }] },
    { id: 'scommessa', w: 1, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', f: 'young', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.8, d: 1.3, t: 16 }, SAY('a', 'Chi arriva ultimo alla fontana paga da bere!', 'Scommetti che ti batto?'), SAY('b', 'Andata!', 'Preparati a pagare.'),
      { all: [{ go: 'a', to: 'away', sp: 3.9, d: 2.5, t: 10, soft: true }, { go: 'b', to: 'away', sp: 3.75, d: 2.5, t: 10, soft: true }] }, { mood: 'b', m: 'stanco' },
      SAY('a', 'Ah! Paghi tu!', 'Troppo lento, {b}!'), SAY('b', 'Mi hai fatto partire tardi...', 'La rivincita!'), { wait: 2 }] },
    // --- botte, liti, nervi ---
    { id: 'rissa', w: 2, posto: 'dehors', soft: true, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.9, d: 1.2, t: 18 }, { pose: 'b', p: 'discute_su' }, SAY('b', 'Che hai detto di mia sorella?', 'Tu! Mi devi ancora cinquantamila lire!', 'Ti ho visto con la mia ragazza!'),
      { pose: 'a', p: 'discute_su' }, SAY('a', 'Ma chi ti conosce?', 'Calmati, eh!', 'Non è come pensi!'), { mood: 'b', m: 'rabbia' }, SAY('b', 'Ripetilo, se hai coraggio!', 'Adesso ti sistemo io!'),
      { p: .55, then: [{ brawl: ['b', 'a'] }], else: [{ pose: 'a', p: 'spinta_su', w: 1 }, SAY('a', 'Lascia perdere, non ne vale la pena.'), { flee: 'a', from: 'b', sp: 1.7 }, SAY('b', 'Ecco, scappa!', 'Codardo!'), { wait: 3 }] }] },
    { id: 'lite_coppia', w: 2, roles: [{ id: 'a', f: 'f' }, { id: 'b', near: 'a', f: 'm', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.7, d: 1.1, t: 16 }, { pose: 'a', p: 'discute_su' }, { pose: 'b', p: 'discute_su' },
      SAY('a', 'Ieri sera dov\'eri?!', 'Ti ho visto al Flipper con quella!', 'Mia madre aveva ragione su di te!'), SAY('b', 'Ma amore, ti giuro...', 'Ero col Pino, chiedi a lui!', 'Non urlare, ci sentono tutti!'),
      { mood: 'a', m: 'rabbia' }, SAY('a', 'Non chiamarmi amore!', 'Basta! È finita!'), { pose: 'a' },
      { all: [{ go: 'a', to: 'away', sp: 2.6, d: 2, t: 10, soft: true }, { follow: 'b', who: 'a', sp: 2.4, d: 1.6 }] }, SAY('b', 'Aspetta! Dai... {a}!', '{a}! Torna qui!'), { wait: 3 }] },
    { id: 'lite_parcheggio', w: 1, posto: 'sosta', soft: true, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 2, d: 1.3, t: 16 }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Mi hai rigato la portiera!', 'Quello è il mio posto da vent\'anni!'),
      { pose: 'b', p: 'discute_su' }, SAY('b', 'La strada è di tutti!', 'Era già rigata, quella carretta!'), { pose: 'a', p: 'discute_su' }, SAY('a', 'Carretta a chi?!'), SAY('b', 'Chiamiamo i vigili, allora!'),
      { p: .3, then: [{ brawl: ['a', 'b'] }], else: [SAY('a', 'Ci vediamo dall\'avvocato!'), { flee: 'a', from: 'b', sp: 1.5 }, { wait: 3 }] }] },
    { id: 'vicini_bucato', w: 1, when: 'day', roles: [{ id: 'a', f: 'f' }, { id: 'b', near: 'a', f: 'f', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.6, d: 1.2, t: 16 }, { pose: 'b', p: 'indica_su' }, SAY('b', 'Signora! Il suo bucato gocciola sul mio!', 'Le sue lenzuola mi coprono il sole!'),
      { pose: 'a', p: 'discute_su' }, SAY('a', 'E il suo gatto allora? Mi ruba le acciughe!', 'Stenda più in là, allora!'), SAY('b', 'Ma senti questa!', 'Maleducata!'), SAY('a', 'Maleducata a me?!'), { wait: 2 }] },
    { id: 'carte_baruffa', w: 1, posto: ['dehors', 'panchina'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'old', r: 16 }], beats: [
      { go: 'b', to: 'a', sp: 1.4, d: 1.2, t: 18 }, { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'siede_terra' }, SAY('a', 'Scopa!', 'E questo è il settebello.'), { wait: 4 },
      SAY('b', 'Un momento... quella carta dov\'era?', 'Tu bari, {a}!'), { pose: 'a' }, { pose: 'b' }, SAY('a', 'Io? In quarant\'anni mai!', 'Ma come ti permetti?'),
      { p: .35, then: [{ brawl: ['b', 'a'] }], else: [SAY('b', 'Domani si rigioca. E le carte le porto io.'), { wait: 2 }] }] },
    // --- ubriachi e malori ---
    { id: 'ubriaco', w: 2, posto: ['dehors', 'angolo'], soft: true, roles: [{ id: 'a', f: 'm' }], beats: [
      { mood: 'a', m: 'ubriaco' }, { wander: 'a', r: 5, sp: .8 }, SAY('a', 'Volare... oh oh...', 'Un altro giro, oste!', 'Ti voglio bene... a tutti voglio bene...'), { wait: 5 },
      SAY('a', 'Chi ha spostato la strada?', 'Dov\'è casa mia... era qui...'), { wait: 3 },
      { p: .5, then: [{ fall: 'a', t: 3 }, SAY('a', 'Sto bene... sto benissimo.', 'Il marciapiede mi ha spinto.'), { wait: 2 }, { up: 'a' }], else: [{ pose: 'a', p: 'siede_terra' }, SAY('a', 'Mi siedo un attimo...'), { wait: 5 }] }] },
    { id: 'due_ubriachi', w: 1, when: 'night', roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 18 }], beats: [
      { mood: 'a', m: 'ubriaco' }, { mood: 'b', m: 'ubriaco' }, { go: 'b', to: 'a', sp: 1.2, d: 1, t: 18 }, { follow: 'b', who: 'a', sp: 1, d: 1 }, { wander: 'a', r: 6, sp: .8 },
      SAY('a', 'Nel blu, dipinto di bluuu!', 'Fratello mio!'), SAY('b', 'Felice di stare lassùùù!', 'Sei il mio migliore amico, lo sai?'), { wait: 4 },
      SAY('a', 'Andiamo a fare il bagno!', 'Ancora uno, l\'ultimo.'), SAY('b', 'Ma è dicembre!', 'L\'ultimo... come ieri.'), { wait: 4 }] },
    { id: 'malore', w: 1, roles: [{ id: 'a', f: 'old' }], beats: [
      { mood: 'a', m: 'stanco' }, SAY('a', 'Mi gira la testa...', 'Oh, madonna...'), { wait: 1.5 }, { fall: 'a', t: 11 }, { crowd: 3, around: 'a', r: 20 },
      SAY('folla', 'Chiamate un medico!', 'Dategli aria!', 'Signore! Mi sente?'), { wait: 3 }, SAY('folla', 'Qualcuno ha dell\'acqua?', 'Fate largo!'), { wait: 4 },
      { up: 'a' }, SAY('a', 'Sto bene, sto bene... è il caldo.', 'Ho saltato il pranzo, niente di grave.'), SAY('folla', 'Si riguardi, eh!', 'Meno male...'), { wait: 2 }] },
    { id: 'anziano_cade', w: 1, roles: [{ id: 'a', f: 'old' }], beats: [
      { wander: 'a', r: 3, sp: .7 }, { wait: 2 }, { fall: 'a', t: 7 }, SAY('a', 'Ahi! La mia anca!', 'Accidenti ai gradini!'), { crowd: 2, around: 'a', r: 18 },
      SAY('folla', 'Si è fatto male, nonno?', 'Aspetti, l\'aiuto io.'), { pose: 'folla', p: 'porge' }, { wait: 3 }, { up: 'a' },
      SAY('a', 'Le gambe non sono più quelle di una volta.', 'Grazie, siete gentili.'), { wait: 2 }] },
    // --- dare, chiedere, trovare ---
    { id: 'portafoglio', w: 2, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { wander: 'a', r: 6, sp: 1.1 }, { go: 'b', to: 'spot', sp: 1.5, d: 1, t: 16 }, { pose: 'b', p: 'raccoglie', w: 1.4 }, { pose: 'b' },
      { p: .65, then: [SAY('b', 'Ehi! Ha perso il portafoglio!', 'Scusi! Le è caduto questo!'), { go: 'b', to: 'a', sp: 2.6, d: 1.2, t: 14 }, { look: 'a', at: 'b' }, { pose: 'b', p: 'porge' }, SAY('a', 'Grazie! Lei è un angelo.', 'Madonna, c\'erano dentro i soldi dell\'affitto!'), { pay: ['a', 'b', 2] }, { wait: 2 }],
        else: [SAY('b', 'Oggi è il mio giorno fortunato...', 'Chi trova un amico trova un tesoro.'), { flee: 'b', from: 'a', sp: 1.8 }, { wait: 3 }] }] },
    { id: 'indicazioni', w: 2, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 18 }, { look: 'b', at: 'a' }, SAY('a', 'Scusi, per il porto?', 'Mi sa dire dov\'è la stazione?', 'Il cinema Excelsior, è da queste parti?'),
      { pose: 'b', p: 'indica_su' }, SAY('b', 'Sempre dritto, poi giù per i caruggi.', 'Ah, è lontano! Prenda la litoranea.', 'Alla rotonda a destra, non si può sbagliare.'),
      { pose: 'b' }, SAY('a', 'Grazie mille!', 'Gentilissimo.'), { flee: 'a', from: 'b', sp: 1.5 }, { wait: 2 }] },
    { id: 'mendicante', w: 2, posto: ['sagrato', 'portone', 'pensilina'], soft: true, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.3, d: 1.2, t: 18 }, { look: 'b', at: 'a' }, { pose: 'a', p: 'porge' }, SAY('a', 'Mille lire per un caffè?', 'Una moneta, per carità...', 'Ho tre figli a casa, signore.'),
      { p: .5, then: [{ pay: ['b', 'a', 1] }, SAY('b', 'Tenga. E se lo beva davvero, il caffè.'), SAY('a', 'Dio la benedica!')], else: [SAY('b', 'Non ho spiccioli.', 'Vada a lavorare!'), SAY('a', 'Tirchio!', 'Che il Signore la perdoni...')] }, { pose: 'a' }, { wait: 2 }] },
    { id: 'chiede_sigaretta', w: 2, player: true, roles: [{ id: 'a', ring: [6, 22] }], beats: [
      { go: 'a', to: 'player', sp: 1.6, d: 1.6, t: 16 }, { look: 'a', at: 'player' }, SAY('a', 'Ce l\'hai una sigaretta?', 'Scusa, hai da accendere?', 'Mi presti cento lire per il telefono?'), { wait: 3.5 },
      SAY('a', 'Vabbè, grazie lo stesso.', 'Niente? Pazienza.', 'Tutti tirchi su quest\'isola.'), { flee: 'a', from: 'player', sp: 1.4 }, { wait: 2 }] },
    { id: 'provoca', w: 1, player: true, roles: [{ id: 'a', f: 'm', ring: [6, 22] }], beats: [
      { mood: 'a', m: 'ubriaco' }, { go: 'a', to: 'player', sp: 1.5, d: 1.5, t: 16 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Che hai da guardare, tu?', 'Ehi! Tu non sei di qui.', 'Questo è il mio marciapiede.'), { wait: 3 },
      { p: .3, then: [SAY('a', 'Adesso t\'insegno l\'educazione!'), { brawl: ['a', 'player'] }], else: [{ pose: 'a' }, SAY('a', 'Bah... tutti uguali.', 'Non ne vale la pena.'), { flee: 'a', from: 'player', sp: 1.3 }, { wait: 2 }] }] },
    { id: 'complimento', w: 1, player: true, roles: [{ id: 'a', ring: [6, 20] }], beats: [
      { go: 'a', to: 'player', sp: 1.6, d: 1.8, t: 14 }, { look: 'a', at: 'player' }, { pose: 'a', p: 'saluta_su' }, SAY('a', 'Bella giacca, amico!', 'Ehi! Ti ho visto ieri al bar, eri forte!', 'Buongiorno! Bella giornata, eh?'), { wait: 2.5 }, { pose: 'a' }, { flee: 'a', from: 'player', sp: 1.4 }, { wait: 2 }] },
    { id: 'gatto', w: 1, roles: [{ id: 'a' }], beats: [
      { wander: 'a', r: 8, sp: 1.1 }, SAY('a', 'Micio! Micio micio!', 'Fufi! Dove sei, Fufi?'), { wait: 4 }, SAY('a', 'Micio micio micio...', 'Pss pss pss!'), { wait: 4 },
      { pose: 'a', p: 'indica_su' }, SAY('a', 'Eccoti, birbante!', 'Scendi da lì, disgraziato!'), { wait: 2 }] },
    { id: 'sorella_persa', w: 1, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', r: 18 }, { id: 'c', near: 'a', r: 20 }], beats: [
      { go: 'a', to: 'b', sp: 2.6, d: 1.3, t: 14 }, SAY('a', 'Ha visto una ragazza col vestito giallo?', 'Ha visto mia sorella? Piccola, coi capelli neri?'), SAY('b', 'No, mi dispiace.', 'Forse verso la piazza...'),
      { go: 'a', to: 'c', sp: 2.6, d: 1.3, t: 14 }, { pose: 'a', p: 'saluta_su' }, SAY('a', '{c}! Eccoti! Mi hai fatto morire di paura!'), SAY('c', 'Ero solo dal giornalaio!', 'Ma che hai? Sono qui.'), { pose: 'a' }, { follow: 'c', who: 'a', sp: 1.5 }, { wait: 3 }] },
    // --- lavori di strada ---
    { id: 'ambulante', w: 2, when: 'day', posto: ['mercato', 'pensilina', 'sagrato'], soft: true, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'merce' }, SAY('a', 'Accendini! Fazzoletti! Cinquecento lire!', 'Sigarette americane, Marlboro, Muratti!', 'Occhiali da sole, come quelli di Vasco!'), { wait: 3 }, { pose: 'a' },
      { go: 'a', to: 'b', sp: 1.6, d: 1.3, t: 14 }, SAY('a', 'Per lei prezzo speciale!', 'Guardi che roba, signora!'),
      { p: .4, then: [SAY('b', 'Va bene, ne prendo uno.'), { pay: ['b', 'a', 1] }, SAY('a', 'Affare fatto!')], else: [SAY('b', 'No grazie.', 'Non mi serve niente.'), SAY('a', 'Peggio per lei!')] }, { wait: 2 }] },
    { id: 'spazzino', w: 1, when: 'day', posto: ['vetrina', 'portone'], soft: true, ora: [6, 11.5], roles: [{ id: 'a', f: 'm' }], beats: [
      { pose: 'a', p: 'spazza' }, { wander: 'a', r: 4, sp: .6 }, SAY('a', 'Ogni giorno la stessa storia... cicche dappertutto.', 'Ma la gente lo sa cos\'è un cestino?'), { wait: 6 },
      SAY('a', 'E poi dicono che il comune non fa niente.', 'Fischietta: «Azzurro, il pomeriggio è troppo azzurro...»'), { wait: 5 }] },
    { id: 'fattorino', w: 1, when: 'day', roles: [{ id: 'a', f: 'young' }], beats: [
      { pose: 'a', p: 'porta_su' }, SAY('a', 'Permesso! Permesso!', 'Largo, che la signora Pina aspetta!'), { go: 'a', to: 'away', sp: 2.8, d: 2, t: 9, soft: true },
      { p: .45, then: [{ pose: 'a' }, { fall: 'a', t: 2.5 }, SAY('a', 'Le uova! Tutte rotte!', 'No, la torta del matrimonio!'), { wait: 2 }, { up: 'a' }, SAY('a', 'Chi glielo dice adesso...')], else: [{ wait: 1 }] }] },
    { id: 'attacchino', w: 1, roles: [{ id: 'a', f: 'young' }], beats: [
      { pose: 'a', p: 'attacchina' }, SAY('a', 'Domenica tutti in piazza!', 'Concerto al porto, sabato sera!'), { wait: 5 },
      { pose: 'a' }, { wander: 'a', r: 4, sp: 1 }, { wait: 2 }, { pose: 'a', p: 'attacchina' }, { wait: 4 }] },
    { id: 'telefono', w: 1, posto: ['portone', 'edicola'], soft: true, roles: [{ id: 'a' }], beats: [
      { pose: 'a', p: 'telefona_su' }, SAY('a', 'Pronto? Pronto?! Mamma, non ti sento!', 'Sì, sono io. No, non ho i soldi.', 'Dica al dottore che richiamo!'), { wait: 4 },
      { mood: 'a', m: 'rabbia' }, SAY('a', 'Cosa?! Non è possibile!', 'Ma la linea è caduta di nuovo!', 'Pronto?! Ma va\' a quel paese!'), { wait: 3 }, { pose: 'a' }] },
    { id: 'foto', w: 1, when: 'day', roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 14 }, { id: 'c', near: 'a', r: 16 }], beats: [
      { all: [{ go: 'b', to: 'a', sp: 1.6, d: 3, t: 14, soft: true }, { go: 'c', to: 'a', sp: 1.6, d: 3, t: 14, soft: true }] }, { look: 'b', at: 'a' }, { look: 'c', at: 'a' },
      { pose: 'a', p: 'foto' }, SAY('a', 'Fermi tutti! Sorridete!', 'Più vicini, non entrate!', 'Dite «cheese»!'), { pose: 'b', p: 'saluta_su' }, { pose: 'c', p: 'saluta_su' }, { wait: 3 },
      SAY('a', 'Un\'altra! {b} aveva gli occhi chiusi!'), { wait: 3 }] },
    { id: 'pittore', w: 1, when: 'day', roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'disegna' }, { wait: 4 }, { go: 'b', to: 'a', sp: 1.4, d: 1.3, t: 14 }, SAY('b', 'Posso vedere?', 'Ma quello è il campanile?'), SAY('a', 'Non è finito!', 'È arte astratta, signore.'), { wait: 3 }, SAY('b', 'Mio nipote disegna meglio.', 'Bello! Quanto costa?'), { wait: 2 }] },
    { id: 'gessetti', w: 1, when: 'day', roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', r: 16 }], beats: [
      { pose: 'a', p: 'gesso' }, SAY('a', 'Una bella stella...', 'Qui ci va il mare.'), { wait: 4 }, { go: 'b', to: 'a', sp: 1.4, d: 1.5, t: 14 }, SAY('b', 'Bello! Lo fai anche a me un ritratto?', 'Che peccato, alla prima pioggia sparisce.'), SAY('a', 'Mille lire e sei immortale. Fino a stasera.'), { wait: 3 }] },
    { id: 'jogging', w: 1, when: 'day', roles: [{ id: 'a', f: 'young' }], beats: [
      SAY('a', 'Uff... ancora due giri.', 'Un, due... un, due...'), { go: 'a', to: 'away', sp: 3, d: 2, t: 11, soft: true }, { mood: 'a', m: 'stanco' }, SAY('a', 'Domani... domani si ricomincia.', 'Chi me l\'ha fatto fare.'), { go: 'a', to: 'spot', sp: 2.8, d: 2, t: 11, soft: true }] },
    // --- svago, affetti, musica ---
    { id: 'musicista', w: 2, posto: ['sagrato', 'dehors', 'panchina'], soft: true, roles: [{ id: 'a' }], beats: [
      { pose: 'a', p: 'balla' }, SAY('a', '♪ Sarà perché ti amo... ♪', '♪ Una lacrima sul viso... ♪', '♪ Gloria, manchi tu nell\'aria... ♪'), { crowd: 4, around: 'a', r: 22, p: 'aspetta' }, { wait: 5 },
      SAY('folla', 'Bravo!', 'Un\'altra!', 'Ma chi è, Celentano?'), { wait: 4 }, SAY('a', '♪ ...e vola, vola, si sa... ♪', '♪ Ti amo, un soldo... ♪'), { wait: 4 },
      { pose: 'folla', p: 'porge' }, { fn: (st, sc) => sc.crowd.forEach(n => { if (n.pop && sc.roles.a.pop && n.pop.money > 1 && rnd() < .5) { n.pop.money -= 1; sc.roles.a.pop.money += 1; } }) }, SAY('a', 'Grazie, grazie! Siete un pubblico meraviglioso!'), { wait: 2 }] },
    { id: 'ballano', w: 1, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'f', r: 16 }], beats: [
      { go: 'a', to: 'b', sp: 1.6, d: 1, t: 16 }, SAY('a', 'Mi concede questo ballo?', 'Senti? È la nostra canzone!'), SAY('b', 'Qui? In mezzo alla strada?', 'Sei matto... va bene!'),
      { pose: 'a', p: 'balla' }, { pose: 'b', p: 'balla' }, { crowd: 2, around: 'a', r: 18, p: 'aspetta' }, { wait: 7 }, SAY('folla', 'Bravi!', 'Viva gli sposi!'), { wait: 3 }] },
    { id: 'corteggia', w: 2, roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'f', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.7, d: 1.2, t: 16 }, { look: 'b', at: 'a' }, SAY('a', 'Signorina, ci siamo già visti?', 'Scusi, lei ha un fiammifero? Ho perso la testa per lei.', 'Lei è di qui? Non l\'ho mai vista.'),
      { p: .45, then: [SAY('b', 'Forse in sogno... il tuo.', 'Mi chiamo {b}. Offri un gelato?'), SAY('a', 'Due gelati! Anzi, tre!'), { follow: 'a', who: 'b', sp: 1.5 }, { flee: 'b', from: 'spot', sp: 1.3 }, { wait: 4 }],
        else: [{ pose: 'b', p: 'spinta_su', w: .8 }, SAY('b', 'Ma come ti permetti!', 'Vai a pescare, va\'.', 'Mio marito fa il pugile, sai?'), { pose: 'b' }, SAY('a', 'Ahia... che caratterino.', 'Sarà per la prossima volta!'), { wait: 2 }] }] },
    { id: 'amici', w: 2, roles: [{ id: 'a' }, { id: 'b', near: 'a', r: 18 }], beats: [
      { all: [{ go: 'a', to: 'b', sp: 1.6, d: 1.2, t: 16 }, { pose: 'b', p: 'saluta_su' }] }, { pose: 'a', p: 'saluta_su' }, SAY('b', 'Ma guarda chi si vede! {a}!', 'Ehi, {a}! Quanto tempo!'), SAY('a', '{b}! Sei ingrassato!', 'Ti credevo in Germania!'),
      { pose: 'a', p: 'discute_su' }, { pose: 'b', p: 'discute_su' }, SAY('b', 'Lascia stare, la fabbrica ha chiuso.', 'Mi sono sposato, sai?'), { wait: 3 }, SAY('a', 'Stasera al bar, offro io!'), { wait: 2 }] },
    { id: 'innamorati', w: 1, when: 'night', posto: 'panchina', soft: true, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { go: 'b', to: 'a', sp: 1.6, d: 1, t: 16 }, SAY('a', 'Guarda che luna.', 'Restiamo ancora un po\'.'), SAY('b', 'Se mio padre mi vede, mi ammazza.', 'Ti piace davvero il mare d\'inverno?'),
      { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'siede_terra' }, { wait: 6 }, SAY('a', 'Ti amo.', 'Un giorno ce ne andiamo da quest\'isola.'), { wait: 4 }] },
    { id: 'comizio', w: 1, posto: ['sagrato', 'mercato'], soft: true, roles: [{ id: 'a', f: 'm' }], beats: [
      { pose: 'a', p: 'discute_su' }, SAY('a', 'Cittadini! Ci tolgono l\'acqua e ci aumentano l\'affitto!', 'Svegliatevi, gente! Il porto ce lo stanno vendendo!'), { crowd: 3, around: 'a', r: 22, p: 'braccia_su' }, { wait: 4 },
      SAY('folla', 'Ha ragione!', 'Ma stai zitto, che arriva la polizia!', 'E tu cosa proponi?'), { wait: 3 }, SAY('a', 'Domenica tutti in piazza!', 'Uniti non ci piegano!'), { wait: 3 },
      { p: .4, then: [SAY('folla', 'La polizia! Scappate!'), { flee: 'a', from: 'player', sp: 3.6 }, { fn: (st, sc) => sc.crowd.forEach(n => setMv(n, { k: 'flee', from: 'a', sp: 2.6 })) }, { wait: 3 }], else: [SAY('folla', 'Bravo!', 'Viva!'), { wait: 2 }] }] },
    { id: 'spaccio', w: 1, when: 'night', posto: 'angolo', soft: true, roles: [{ id: 'a', f: 'young' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { pose: 'a', p: 'aspetta' }, { wait: 2 }, { go: 'b', to: 'a', sp: 1.5, d: 1, t: 16 }, SAY('a', 'Cerchi qualcosa?', 'Non qui. Girati.'), { pose: 'a', p: 'porge' }, { pay: ['b', 'a', 5] }, { wait: 2 },
      SAY('a', 'Non mi hai visto.', 'Tu non mi conosci.'), { pose: 'a' }, { all: [{ flee: 'b', from: 'a', sp: 1.6 }, { flee: 'a', from: 'b', sp: 1.4 }] }, { wait: 3 }] },
    { id: 'predica', w: 1, when: 'day', posto: ['panchina', 'sagrato'], soft: true, roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'young', r: 18 }], beats: [
      { go: 'a', to: 'b', sp: 1.4, d: 1.3, t: 16 }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Ai miei tempi i giovani lavoravano!', 'Tagliati quei capelli, sembri una femmina!', 'Quella musica vi brucia il cervello!'),
      SAY('b', 'Sì, nonno, e c\'era la guerra.', 'Ai suoi tempi c\'erano i dinosauri.'), { pose: 'a', p: 'rabbia' }, SAY('a', 'Insolente!', 'Ah, se ci fosse ancora tuo nonno!'), { pose: 'a' }, { wait: 2 }] },
    // --- quelle con i loro attrezzi ---
    { id: 'scala', w: 3, place: 'ladder', roles: [{ id: 'a', r: 30, min: 3 }], beats: [
      { go: 'a', to: 'spot', sp: 1.6, d: .6, t: 30 }, { ladder: 'a', up: true },
      { fn: (st, sc) => { const j = pick([['Questa antenna non prende mai Rai Due...', 'Ecco, adesso si vede!'], ['Le tegole, sempre le tegole...', 'Fatto. Fino alla prossima burrasca.'], ['Dov\'è finito quel gatto?', 'Vieni qui, bestiaccia!'], ['Mamma mia che vista da quassù...', 'Si vede fino al continente!']]); sc.j = j; sayEv(st, sc.roles.a, j[0], 3.5); } },
      { wait: 6 }, { fn: (st, sc) => sayEv(st, sc.roles.a, sc.j[1], 3) }, { wait: 4 },
      { p: .15, then: [SAY('a', 'Aiuto! La scala si muove!'), { crowd: 2, around: 'spot', r: 20, p: 'indica_su' }, SAY('folla', 'Tenetela ferma!', 'Scendi piano!'), { wait: 2 }] }, { ladder: 'a', up: false }] },
    { id: 'bici', w: 3, roles: [{ id: 'a', ring: [18, 40] }], beats: [
      { ride: 'a', L: 26, fall: true, then: [SAY('a', 'Ahia!', 'Mannaggia la buca!', 'Ahi ahi ahi...'), { crowd: 1, around: 'a', r: 16 }, SAY('folla', 'Tutto a posto? Ti sei fatto male?', 'Madonna, che botta! Stai bene?'),
        { wait: 2 }, SAY('a', 'Sì, sì... solo un graffio.', 'Quella bici è maledetta. Me la tengo più.'), { wait: 2 }] }] },
    { id: 'bici_passa', w: 1, roles: [{ id: 'a', f: 'young', ring: [18, 40] }], beats: [
      { ride: 'a', L: 30, fall: false }, SAY('a', 'Ciao bella!', 'Pista! Pista!'), { wait: 1 }] },
    { id: 'graffito', w: 2, solo: st => {
      const WV = typeof WriterVita !== 'undefined' ? WriterVita : null; if (!WV || !WV.bombing) return false;
      const n = pick(near(st, st.player.x, st.player.y, 60, k => FILTERS.writer(st, k))); if (!n) return false;
      const E = WV.bombing(st, n) || (WV.mission && WV.mission(st, n, 'muro')); if (!E) return false;
      G.say(st, n, pick(['Questo muro è troppo pulito.', 'Vediamo chi ci arriva prima.', 'Oggi si firma.']), 3); return true;
    } },

    // ================= [vita2] LA CITTÀ VIVA: le situazioni che seguono i posti e l'ora =================
    // Ogni scena sta nel suo posto (posti.js) e nella sua fascia; gli attori si dispongono con {slot} (primo piano, quinte,
    // fondale rispetto alla camera), al massimo quattro o cinque, con la cosa giusta in mano.
    // --- la mattina: consegne, il postino, il mercato che si monta, le serrande, la calata ---
    { id: 'consegna_furgone', w: 3, posto: 'retrobottega', ora: [6.5, 11.5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'shop|any', r: 22 }], beats: [
      { van: 'spot', kind: 'furgone' }, { all: [{ go: 'a', to: 'van', sp: 1.7, d: 1.7, t: 16 }, { slot: 'b', i: 0, n: 2, sp: 1.5 }] },
      { pose: 'a', p: 'raccoglie', w: 1.3 }, { hand: 'a', id: 'cassa' }, { pose: 'a' }, SAY('a', 'Dodici casse, firmi qui.', 'Attenta che è pesante!', 'Tutto il carico di stamattina.'),
      { go: 'a', to: 'spot', sp: 1.3, d: 1, t: 9 }, SAY('b', 'Piano con quelle bottiglie!', 'Mettile qui dietro, su.', 'Sei in ritardo di un\'ora!'), { pose: 'a', p: 'raccoglie', w: 1.2 }, { hand: 'a', id: null }, { pose: 'a' },
      { go: 'a', to: 'van', sp: 1.7, d: 1.7, t: 9 }, { pose: 'a', p: 'raccoglie', w: 1.2 }, { hand: 'a', id: 'sacco_farina' }, { pose: 'a' }, { go: 'a', to: 'spot', sp: 1.3, d: 1, t: 9 }, { pose: 'a', p: 'raccoglie', w: 1 }, { hand: 'a', id: null }, { pose: 'a' },
      SAY('a', 'L\'ultima. Il resto venerdì.', 'Firmi qua, che ho altre sei consegne.'), { pose: 'b', p: 'porge', w: 1.5 }, { pose: 'b' }, SAY('b', 'Grazie. Salutami tuo padre.', 'Il furgone in doppia fila te lo portano via, eh.'), { go: 'a', to: 'van', sp: 1.7, d: 1.7, t: 9 }] },
    { id: 'postino', w: 3, posto: 'portone', ora: [8, 12.5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'f|any', r: 20 }], beats: [
      { hand: 'a', id: 'giornale' }, { all: [{ go: 'a', to: 'spot', sp: 1.8, d: 1.1, t: 18 }, { slot: 'b', i: 0, n: 1, sp: 1.4, face: 'out' }] }, { look: 'a', at: 'b' }, SAY('a', 'Posta!', 'Signora, c\'è una raccomandata.', 'Una lettera dalla Germania!'),
      { pose: 'a', p: 'porge', w: 1.6 }, { pose: 'b', p: 'porge', w: 1.2 }, { pose: 'a' }, { pose: 'b' }, SAY('b', 'Sarà la bolletta, come sempre.', 'Mio figlio! Finalmente scrive.', 'Se è dello Squalo la butti via.'),
      { p: .5, then: [{ pose: 'b', p: 'legge_su' }, SAY('b', 'Ma guarda... che scrive.', 'Mamma mia, quanto chiedono.'), { wait: 3 }, { pose: 'b' }] }, SAY('a', 'Buona giornata!', 'Al prossimo portone.'), { go: 'a', to: 'posto2', sp: 1.8, d: 1.2, t: 14 }, SAY('a', 'Posta!', 'C\'è nessuno?'), { wait: 2 }] },
    { id: 'mercato_monta', w: 3, posto: 'mercato', ora: [6, 8.5], giorni: [0, 1, 2, 3, 4, 5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { hand: 'a', id: 'cassa' }, { hand: 'b', id: 'sacco_farina' }, { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3 }, { slot: 'b', i: 1, n: 2, sp: 1.3 }] }, SAY('a', 'Le arance davanti, che si vedono.', 'Oggi si vende, c\'è il sole.', 'Mettimi i cartelli dei prezzi.'),
      { pose: 'a', p: 'raccoglie', w: 1.4 }, { hand: 'a', id: null }, { pose: 'a', p: 'merce' }, { pose: 'b', p: 'raccoglie', w: 1.4 }, { hand: 'b', id: null }, { pose: 'b' },
      SAY('b', 'Il camion delle patate non è arrivato.', 'A quanto le mettiamo, le sarde?', 'Il banco del formaggio ha preso il nostro posto!'), { van: 'spot', kind: 'ape' }, { go: 'b', to: 'van', sp: 1.6, d: 1.7, t: 12 }, { pose: 'b', p: 'raccoglie', w: 1.2 }, { hand: 'b', id: 'cassa' }, { pose: 'b' }, { go: 'b', to: 'spot', sp: 1.3, d: 1.2, t: 12 }, { pose: 'b', p: 'raccoglie', w: 1.2 }, { hand: 'b', id: null }, { pose: 'b', p: 'merce' },
      SAY('a', 'Signore, belle arance! Mille lire al chilo!', 'Pesce fresco, stanotte era in mare!'), { wait: 3 }] },
    { id: 'serranda_su', w: 2, posto: 'vetrina', ora: [7, 9.5], roles: [{ id: 'a', f: 'shop|m' }, { id: 'b', near: 'a', r: 22 }], beats: [
      { slot: 'a', i: 0, n: 2, sp: 1.5 }, { pose: 'a', p: 'forza', w: 2.6 }, { fn: (st, sc) => st.sfx.push({ k: 'thud', x: sc.spot.x, y: sc.spot.y }) }, SAY('a', 'Su, che è tardi.', 'Un\'altra giornata.', 'Questa serranda, prima o poi...'), { pose: 'a', p: 'spazza', w: 1 },
      { slot: 'b', i: 1, n: 2, sp: 1.4 }, SAY('b', 'Buongiorno! Già aperto?', 'Il pane è caldo?', 'Mi dà il giornale?'), { pose: 'a' }, SAY('a', 'Per lei sempre.', 'Caldo caldo, entri.', 'Un momento, finisco il marciapiede.'), { pose: 'a', p: 'spazza' }, { wait: 4 }, { pose: 'a' }] },
    { id: 'reti', w: 3, posto: 'calata', ora: [5, 11.5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', f: 'm', r: 20 }, { id: 'c', near: 'a', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.3 }] }, { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'lavora' }, SAY('a', 'Questa rete ha più buchi che maglie.', 'Stanotte c\'era vento di levante.', 'Sarde, e poco altro.'),
      { hand: 'c', id: 'pesce' }, { slot: 'c', i: 2, n: 3, sp: 1.5 }, SAY('c', 'Che si è preso stanotte?', 'Tonino, me ne dai due per la cena?', 'Il peschereccio di Gavino è rientrato?'), SAY('b', 'Sarde, e vento.', 'Prenditele, tanto non le compra nessuno.', 'Rientra a mezzogiorno, se il motore regge.'),
      { wait: 3 }, { hand: 'c', id: null }, { go: 'c', to: 'away', sp: 1.4, d: 2, t: 10 }, SAY('a', 'Passami lo spago.', 'Domani si esce alle quattro.'), { wait: 3 }, { pose: 'a' }, { pose: 'b' }] },
    // --- mezzogiorno: le serrande che si abbassano, la pausa sul gradino ---
    { id: 'serrande_giu', w: 2, posto: 'vetrina', ora: [12.5, 14], roles: [{ id: 'a', f: 'shop|m' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { slot: 'a', i: 0, n: 2, sp: 1.4 }, { pose: 'a', p: 'forza', w: 2.4 }, { fn: (st, sc) => st.sfx.push({ k: 'thud', x: sc.spot.x, y: sc.spot.y }) }, SAY('a', 'Chiuso. Alle quattro riapro.', 'Si mangia, finalmente.'),
      { go: 'b', to: 'spot', sp: 2.6, d: 1.6, t: 14 }, { look: 'a', at: 'b' }, SAY('b', 'Un attimo! Il pane!', 'Aspetti! Due etti di mortadella!', 'Non chiuda, la prego!'),
      { p: .55, then: [SAY('a', 'Va bene, svelta.', 'Solo perché è lei.'), { pose: 'a', p: 'porge', w: 1.5 }, { hand: 'b', id: 'pane' }, { pay: ['b', 'a', 1] }, { pose: 'a' }, SAY('b', 'Grazie, mi ha salvato.'), { hand: 'b', id: null }],
        else: [{ pose: 'a' }, SAY('a', 'Alle quattro, ho detto.', 'Anche io ho una famiglia, signora.'), { mood: 'b', m: 'rabbia' }, SAY('b', 'Ma che servizio!', 'Vado da Wu, allora!')] }, { flee: 'b', from: 'a', sp: 1.5 }, { wait: 2 }] },
    { id: 'pausa_gradino', w: 2, posto: ['portone', 'sagrato'], ora: [12.5, 14.5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3, face: 'out' }, { slot: 'b', i: 1, n: 2, sp: 1.3, face: 'out' }] }, { pose: 'a', p: 'siede_terra' }, { pose: 'b', p: 'mangia_su' }, SAY('a', 'Che ha messo tua moglie, oggi?', 'Un quarto d\'ora di pace.', 'Il padrone non scende prima delle tre.'),
      SAY('b', 'Frittata. Come ieri.', 'Pane e mortadella, re del pranzo.', 'Zitto e mangia.'), { wait: 4 }, { pose: 'a', p: 'fuma_su' }, SAY('a', 'Hai sentito della fabbrica?', 'Dicono che chiudono il cantiere.'), SAY('b', 'Si dice sempre tutto, qui.', 'Finché pagano...'), { wait: 3 }, { pose: 'a' }, { pose: 'b' }] },
    // --- il pomeriggio: i vecchi, le madri, chi ripara, chi porta i vetri, il barbiere sulla porta ---
    { id: 'vecchi_panchina', w: 3, posto: 'panchina', ora: [14, 19.5], roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'old|any', r: 20 }, { id: 'c', near: 'a', f: 'old|any', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.1 }, { slot: 'b', i: 1, n: 3, sp: 1.1 }] }, { pose: 'a', p: 'siede' }, { pose: 'b', p: 'siede' }, SAY('a', 'Una volta qui c\'era il mare fino alla chiesa.', 'Mio nipote vuole andare in Germania.', 'Il Garante? Ne ho visti passare tre.'),
      { hand: 'c', id: 'giornale' }, { slot: 'c', i: 2, n: 3, sp: 1.1 }, { pose: 'c', p: 'legge_su' }, SAY('b', 'E dove andava il mare, scusa?', 'Tutti vogliono andare via.', 'Parla piano, Peppino.'), { wait: 3 },
      SAY('c', 'Qui dice che la Vittoria la allargano.', 'Il Bollettino, come sempre: tutto bene.'), SAY('a', 'Allargano, allargano. E noi?', 'Ai miei tempi il pane costava cento lire.'), { wait: 4 }, SAY('b', 'Andiamo, che si fa fresco.'), { pose: 'a' }, { pose: 'b' }, { pose: 'c' }, { hand: 'c', id: null }, { wait: 1 }] },
    { id: 'madri_pensilina', w: 3, posto: ['pensilina', 'fermata'], ora: [15, 18.5], roles: [{ id: 'a', f: 'f' }, { id: 'b', near: 'a', f: 'f|any', r: 22 }], beats: [
      { hand: 'b', id: 'borsa' }, { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3 }, { slot: 'b', i: 1, n: 2, sp: 1.3 }] }, { pose: 'a', p: 'orologio_su' }, { pose: 'b', p: 'aspetta' }, SAY('a', 'Il sette è in ritardo di venti minuti.', 'Con questo autobus non si arriva mai.', 'I bambini escono alle cinque.'),
      SAY('b', 'Ieri non è passato proprio.', 'Mia figlia ha preso otto in italiano.', 'Hai visto i Grigi stamattina al Mercato?'), { pose: 'a', p: 'discute_su' }, SAY('a', 'Otto! Brava. La mia solo in ginnastica.', 'Li ho visti. Hanno preso il figlio della Pina.'), { wait: 3 },
      { pose: 'a' }, { pose: 'b' }, { look: 'a', at: 'away' }, SAY('b', 'Eccolo! Il sette!', 'Finalmente, arriva.'), { all: [{ go: 'a', to: 'away', sp: 1.9, d: 2, t: 9 }, { go: 'b', to: 'away', sp: 1.8, d: 2, t: 9 }] }] },
    { id: 'lamiera_scala', w: 3, posto: 'facciata_in_riparazione', ora: [9, 17.5], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { slot: 'a', i: 0, n: 1, sp: 1.4 }, { hand: 'a', id: 'martello' }, { pose: 'a', p: 'martella' }, SAY('a', 'Questa lamiera non vuole stare su.', 'Tienimi la scala! Nessuno? Come sempre.', 'Tre chiodi e via, poi piove dentro di nuovo.'),
      { go: 'b', to: 'spot', sp: 1.5, d: 1.6, t: 14 },
      { p: .35, then: [{ fn: (st, sc) => st.sfx.push({ k: 'thud', x: sc.spot.x, y: sc.spot.y }) }, SAY('a', 'Attento sotto!', 'La lamiera!'), { fall: 'b', t: 2.4 }, { pose: 'a' }, SAY('b', 'Ma siete matti?!', 'Mi volete ammazzare?'), { up: 'b' }, SAY('a', 'Scusi! Il vento!', 'Tutto intero? Meno male.'), { mood: 'b', m: 'rabbia' }, { flee: 'b', from: 'a', sp: 1.6 }],
        else: [{ look: 'b', at: 'a' }, SAY('b', 'Non muore mai nessuno, eh?', 'Dalla scala si vede casa mia?', 'Attento che cadi, Gavino.'), SAY('a', 'Finché regge la scala.', 'Si vede fino alla Rocca!'), { go: 'b', to: 'away', sp: 1.4, d: 2, t: 10 }] },
      { wait: 3 }, { pose: 'a' }, { hand: 'a', id: null }] },
    { id: 'due_vetri', w: 2, posto: ['vetrina', 'angolo'], ora: [10, 17.5], roles: [{ id: 'a', f: 'm', min: 6 }, { id: 'b', near: 'a', r: 20 }], beats: [
      { hand: 'a', id: 'lastra' }, { go: 'a', to: 'spot', sp: .9, d: 1.1, t: 26 }, SAY('a', 'Permesso, vetri!', 'Occhio, che passo coi vetri!', 'Largo, largo!'),
      { go: 'b', to: 'a', sp: 2.2, d: 1.4, t: 12 }, SAY('b', 'Attento!', 'Oh! Guarda dove vai!'),
      { p: .3, then: [{ fall: 'a', t: 2.4 }, { fn: (st, sc) => st.sfx.push({ k: 'glass', x: sc.spot.x, y: sc.spot.y }) }, { hand: 'a', id: null }, SAY('a', 'Trecentomila lire di vetro!', 'No! La vetrina del farmacista!'), { crowd: 2, around: 'a', r: 18 }, SAY('folla', 'Si è fatto male?', 'Madonna, tutto in pezzi.'), { up: 'a' }, { mood: 'a', m: 'rabbia' }, SAY('a', 'Chi me li paga adesso?!')],
        else: [{ pose: 'a', p: 'raccoglie', w: 1.5 }, { hand: 'a', id: null }, { pose: 'a' }, SAY('a', 'Ecco. Non si è rotto niente. Miracolo.', 'Poggiamoli qui, piano.'), SAY('b', 'La prossima volta prendi l\'Ape.', 'Ti aiuto a portarli dentro?')] }, { wait: 2 }] },
    { id: 'barbiere_porta', w: 2, posto: 'vetrina', postoF: q => /barbier/.test(q.uso || ''), ora: [15, 19.5], roles: [{ id: 'a', f: 'shop|m' }, { id: 'b', near: 'a', f: 'young|m', r: 20 }], beats: [
      { slot: 'a', i: 0, n: 1, sp: 1.4, face: 'out' }, { pose: 'a', p: 'braccia_su' }, { wait: 2 }, { go: 'b', to: 'spot', sp: 1.5, d: 1.8, t: 14 }, { look: 'a', at: 'b' },
      SAY('a', 'Quando te li tagli quei capelli?', 'Ehi! Vieni che ti sistemo la nuca.', 'Con quella testa ti fermano i Grigi.'), { look: 'b', at: 'a' }, SAY('b', 'Domani, giuro.', 'Mi piacciono così!', 'Quando ho i soldi, Totò.'),
      { pose: 'a', p: 'fuma_su' }, SAY('a', 'Domani, domani. Tuo padre veniva ogni sabato.', 'Ti faccio il prezzo da studente.'), { go: 'b', to: 'away', sp: 1.5, d: 2, t: 10 }, { wait: 3 }, { pose: 'a' }] },
    // --- la sera: i dehors pieni, la gang all'angolo, il pizzo, il ricettatore, il capo al tavolino, il fuoco, il posto di blocco ---
    { id: 'dehors_pieni', w: 3, posto: 'dehors', ora: [18, 24.5], roles: [{ id: 'a', f: 'adult|any' }, { id: 'b', near: 'a', f: 'adult|any', r: 20 }, { id: 'c', near: 'a', r: 22 }, { id: 'd', near: 'a', f: 'shop|any', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { pose: 'a', p: 'siede' }, { pose: 'b', p: 'siede' }, { pose: 'c', p: 'siede' },
      SAY('a', 'Tre birre! E un\'amaro per Peppe.', 'Oste! Si muore di sete.'), { hand: 'd', id: 'birra' }, { go: 'd', to: 'spot', sp: 1.5, d: 1.1, t: 14 }, { pose: 'd', p: 'porge', w: 1.6 }, { hand: 'd', id: null }, { hand: 'b', id: 'birra' }, { hand: 'c', id: 'carta' }, { pose: 'd' }, SAY('d', 'Ecco. Stasera si paga, eh.', 'Fresche fresche.'),
      { pose: 'b', p: 'beve_su' }, { pose: 'a', p: 'fuma_su' }, SAY('b', 'Alla salute!', 'Al Garante, che gli venga un colpo.', 'A chi non c\'è più.'), { pose: 'c', p: 'discute_su' }, SAY('c', 'Piano con la bocca, Peppe.', 'Hai sentito del Mercato? Li hanno presi in tre.', 'Domenica c\'è la partita, venite?'),
      { go: 'd', to: 'away', sp: 1.4, d: 3, t: 8 }, { wait: 3 }, { pose: 'b', p: 'siede' }, { pose: 'c', p: 'siede' }, SAY('a', 'Un\'altra! Tanto domani è domenica.', 'Chi paga questo giro?'), { wait: 4 }, { pose: 'a' }, { pose: 'b' }, { pose: 'c' }] },
    { id: 'gang_angolo', w: 3, posto: 'angolo', ora: [17, 27], roles: [{ id: 'a', f: 'young|m' }, { id: 'b', near: 'a', f: 'young|m', r: 20 }, { id: 'c', near: 'a', f: 'young|any', r: 20 }], beats: [
      { van: 'spot', kind: 'vespa' }, { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3, face: 'out' }, { slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { pose: 'a', p: 'appoggiato' }, { pose: 'b', p: 'fuma_su' }, { pose: 'c', p: 'siede' },
      SAY('a', 'Stasera alla Luna?', 'Hai visto la Vespa nuova di Nico?', 'Il Grigio della piazza mi ha guardato male.'), SAY('b', 'Senza soldi che ci vai a fare?', 'Rubata, sicuro.', 'Quello guarda male tutti.'), { wait: 3 },
      { look: 'a', at: 'player' }, { look: 'c', at: 'player' }, { p: .4, then: [SAY('a', 'Che guardi?', 'Ehi. Non sei di qui.', 'Giri alla larga, amico.'), { wait: 2 }], else: [SAY('c', 'Lascialo stare, è uno del porto.', 'Ssh. Guarda chi arriva.'), { wait: 2 }] },
      { look: 'a', at: 'b' }, { look: 'c', at: 'a' }, SAY('b', 'Dammi una sigaretta.', 'Andiamo al Flipper, dai.'), { wait: 4 }, { pose: 'a' }, { pose: 'b' }, { pose: 'c' }] },
    { id: 'pizzo', w: 2, posto: 'vetrina', ora: [18, 21.5], roles: [{ id: 'a', f: 'adult|m' }, { id: 'b', near: 'a', f: 'shop|any', r: 22 }, { id: 'c', near: 'a', f: 'young|m', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3 }, { slot: 'b', i: 1, n: 2, sp: 1.4, face: 'out' }, { go: 'c', to: 'away', sp: 1.4, d: 3, t: 12 }] }, { look: 'c', at: 'around' }, { look: 'a', at: 'b' }, { look: 'b', at: 'a' },
      { pose: 'a', p: 'indica_su' }, SAY('a', 'Il principale manda i saluti. È il quindici.', 'Sai perché sono qui.', 'Bella bottega. Sarebbe un peccato.'), { pose: 'a' }, { pose: 'b', p: 'discute_su' }, SAY('b', 'Questo mese è dura...', 'Ho già pagato la Tutela!', 'Non ho venduto niente, lo sai.'),
      SAY('a', 'Non è un problema mio.', 'Il principale non vuole scuse.'), { pose: 'b', p: 'porge', w: 1.6 }, { pay: ['b', 'a', 10] }, { pose: 'b' }, SAY('a', 'Bravo. Il mese prossimo, puntuale.', 'Così si fa. Saluta la famiglia.'),
      { all: [{ flee: 'a', from: 'spot', sp: 1.4 }, { flee: 'c', from: 'spot', sp: 1.5 }] }, { mood: 'b', m: 'rabbia' }, SAY('b', 'Maledetti...', 'Prima o poi...'), { wait: 2 }] },
    { id: 'ricettatore', w: 2, posto: 'retrobottega', ora: [19, 23.5], roles: [{ id: 'a', f: 'young|m', min: 6 }, { id: 'b', near: 'a', f: 'm', r: 22 }], beats: [
      { slot: 'b', i: 0, n: 2, sp: 1.3, face: 'out' }, { look: 'b', at: 'around' }, { pose: 'b', p: 'fuma_su' }, { hand: 'a', id: 'cassa' }, { slot: 'a', i: 1, n: 2, sp: 1.4 }, { look: 'a', at: 'b' },
      SAY('a', 'Roba buona. Dal cargo.', 'Radio, dodici. Tutte nuove.', 'Non chiedere da dove viene.'), { pose: 'a', p: 'raccoglie', w: 1.4 }, { hand: 'a', id: null }, { pose: 'a' }, { pose: 'b', p: 'fruga', w: 2.6 }, { pose: 'b' },
      SAY('b', 'Venti. E non ti ho visto.', 'Roba segnata. Dieci, e ringrazia.', 'Vai piano con la calata, stanno guardando.'), { pay: ['b', 'a', 5] }, { look: 'a', at: 'around' }, { look: 'b', at: 'around' }, { wait: 2.5 },
      { flee: 'a', from: 'b', sp: 1.7 }, SAY('b', 'Chiudi il cancello.', 'Domani niente, c\'è troppo movimento.'), { wait: 3 }] },
    { id: 'capo_tavolino', w: 2, posto: 'dehors', ora: [19, 23.5], roles: [{ id: 'a', f: 'old|m' }, { id: 'b', near: 'a', f: 'adult|m', r: 22 }, { id: 'c', near: 'a', f: 'young|m', r: 22 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.1 }, { slot: 'c', i: 2, n: 3, sp: 1.3, face: 'out' }] }, { pose: 'a', p: 'siede' }, { pose: 'c', p: 'braccia_su' }, { look: 'c', at: 'around' }, { wait: 2 },
      { slot: 'b', i: 1, n: 3, sp: 1.3 }, { look: 'b', at: 'a' }, { pose: 'b', p: 'porge', w: 1.8 }, SAY('b', 'Dottore, i miei rispetti.', 'Don Ciccio. Come sta la signora?'), { pose: 'b' }, SAY('a', 'Siediti. Com\'è andata al porto?', 'Parla piano e siediti.'), { pose: 'b', p: 'siede' },
      SAY('b', 'Il cargo è arrivato. Tutto a posto.', 'Quello della ferramenta non vuole pagare.', 'I Grigi hanno chiuso la calata per due ore.'), { pay: ['b', 'a', 10] }, SAY('a', 'Bene. Digli che passo io, domenica.', 'Allora gliela spieghiamo noi, l\'educazione.', 'La Tutela fa il suo lavoro. Noi il nostro.'), { wait: 4 },
      { pose: 'b' }, SAY('b', 'Con permesso.'), { flee: 'b', from: 'a', sp: 1.3 }, { wait: 2 }, { pose: 'a' }, { pose: 'c' }] },
    { id: 'fuoco_baracche', w: 3, posto: ['fuoco', 'lotto_vuoto'], ora: [17.5, 27], roles: [{ id: 'a', f: 'm' }, { id: 'b', near: 'a', r: 22 }, { id: 'c', near: 'a', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.2 }, { slot: 'b', i: 1, n: 3, sp: 1.2 }, { slot: 'c', i: 2, n: 3, sp: 1.2 }] }, { fire: 'spot', t: 60 }, { pose: 'a', p: 'scalda' }, { pose: 'b', p: 'scalda' }, { pose: 'c', p: 'scalda' },
      SAY('a', 'Butta quelle assi, che si spegne.', 'Stanotte gela.', 'La luce ce l\'hanno tolta un\'altra volta.'), SAY('b', 'Mio cugino dice che a Milano cercano gente.', 'Alla ferrovia passano i Grigi alle undici.', 'Ho una bottiglia, chi vuole?'), { wait: 3 },
      { p: .35, then: [{ pose: 'c', p: 'porge', w: 1.5 }, SAY('c', 'Ho della roba dal porto. Sigarette, vere.', 'Mi servono due radio. Pago.'), { pay: ['a', 'c', 2] }, { pose: 'c', p: 'scalda' }, SAY('a', 'Non qui, dopo.', 'Dammene due stecche.')],
        else: [SAY('c', 'Mio padre faceva il pescatore. Ora fa la fila alla Rocca.', 'Cantiamo? No, che arrivano.'), SAY('a', 'Tutti in fila alla Rocca, un giorno o l\'altro.')] }, { wait: 5 }, SAY('b', 'Un altro po\' di legna e vado a dormire.'), { wait: 2 }, { pose: 'a' }, { pose: 'b' }, { pose: 'c' }] },
    { id: 'posto_blocco', w: 3, posto: 'porta_della_citta', ora: [17, 24.5], roles: [{ id: 'a', f: 'cop', r: 30 }, { id: 'b', near: 'a', r: 26, min: 6 }], beats: [
      { slot: 'a', i: 0, n: 1, sp: 1.6 }, { pose: 'a', p: 'aspetta' }, { go: 'b', to: 'spot', sp: 1.5, d: 1.8, t: 16 }, { look: 'a', at: 'b' }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Alt. Documenti.', 'Fermo. Dove va a quest\'ora?', 'Posto di blocco. I documenti.'),
      { look: 'b', at: 'a' }, { pose: 'b', p: 'porge', w: 1.5 }, SAY('b', 'Torno a casa, agente.', 'Ecco... sono in ordine.', 'Lavoro al porto, finisco adesso.'), { pose: 'a', p: 'perquisisce', w: 3 },
      { p: .2, then: [SAY('a', 'Questo nome mi dice qualcosa. Vieni con me.'), { pose: 'a', p: 'ammanetta' }, { pose: 'b', p: 'ammanettato' }, { wait: 3 }, { jail: 'b' }], else: [{ pose: 'a' }, { pose: 'b' }, SAY('a', 'Circolare. E a casa prima dell\'Ora Quieta.', 'Vada. E si tagli i capelli.'), SAY('b', 'Grazie, agente.', 'Buonasera.'), { flee: 'b', from: 'a', sp: 1.5 }] }, { pose: 'a', p: 'aspetta' }, { wait: 3 }, { pose: 'a' }] },
    // --- [mappa_compatta] le scene nuove della città compatta: il cypher alla grata, la fila del pane, la parata della domenica ---
    { id: 'cypher', w: 3, posto: 'cypher', ora: [20, 26], roles: [{ id: 'a', f: 'young|m' }, { id: 'b', near: 'a', f: 'young|any', r: 24 }, { id: 'c', near: 'a', f: 'young|any', r: 24 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.3 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { pose: 'b', p: 'appoggiato' }, { pose: 'c', p: 'fuma_su' },
      { pose: 'a', p: 'indica_su' }, SAY('a', 'Uno, due... il vapore fa la base, ascolta.', 'Rima per rima, dalla grata alla Rocca.', 'Tocca a me, zitti tutti.'), { wait: 2 },
      SAY('a', 'Le sbarre alzate, il treno che non passa, la città che dorme e il Garante che ingrassa.', 'Dalle baracche si vede il faro rosso: il mare è libero, io no, ma posso.'), { pose: 'a', p: 'braccia_su' },
      { crowd: 2, around: 'a', r: 20 }, SAY('folla', 'Ancora!', 'Ohhh!', 'Questa la sento alla Radio Luna.'), { pose: 'b', p: 'indica_su' },
      SAY('b', 'Adesso io. Dammi la base.', 'Sentite questa.'), { wait: 3 }, SAY('b', 'Pane a tessera e fumo di grata, la mia rima è l\'unica cosa non tassata.'), { pose: 'a', p: 'appoggiato' },
      { p: .3, then: [{ look: 'c', at: 'around' }, SAY('c', 'Zitti! La ronda al passaggio a livello.', 'Le torce! Via!'), { all: [{ flee: 'a', from: 'spot', sp: 1.7 }, { flee: 'b', from: 'spot', sp: 1.7 }] }],
        else: [SAY('c', 'Domani la registriamo su cassetta.', 'Radio Luna la deve mandare.'), { wait: 4 }, { pose: 'a' }, { pose: 'b' }, { pose: 'c' }] }] },
    { id: 'fila_pane', w: 3, posto: 'fila', ora: [6, 9], roles: [{ id: 'a', f: 'f|any' }, { id: 'b', near: 'a', f: 'old|any', r: 22 }, { id: 'c', near: 'a', r: 22 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 3, sp: 1.3 }, { slot: 'b', i: 1, n: 3, sp: 1.2 }, { slot: 'c', i: 2, n: 3, sp: 1.3 }] }, { pose: 'a', p: 'aspetta' }, { pose: 'b', p: 'orologio_su' },
      SAY('b', 'Da quando apre alle sei e mezza?', 'Mezz\'ora di fila per due rosette.', 'Con la tessera nuova ne danno di meno.'), SAY('a', 'Lella fa quello che può.', 'Stamattina c\'è anche il pane nero.', 'Almeno qui si sta al caldo.'), { wait: 3 },
      { p: .4, then: [{ go: 'c', to: 'spot', sp: 1.6, d: .8, t: 10 }, SAY('c', 'Permesso, ho solo una cosa...', 'Sono di fretta, scusate.'), { mood: 'b', m: 'rabbia' }, { pose: 'b', p: 'indica_su' }, SAY('b', 'In fila come tutti!', 'Ehi! La fila è qui dietro!'), { pose: 'b' }, { go: 'c', to: 'away', sp: 1.4, d: 2, t: 8 }],
        else: [{ pose: 'c', p: 'legge_su' }, SAY('c', 'Il Bollettino dice che il grano arriva lunedì.', 'Hanno chiuso un altro forno, a ponente.'), { wait: 3 }, { pose: 'c' }] },
      { hand: 'a', id: 'pane' }, SAY('a', 'Finalmente. Buona giornata!', 'A domani, Lella.'), { go: 'a', to: 'away', sp: 1.3, d: 2, t: 10 }, { hand: 'a', id: null }, { pose: 'b' }] },
    { id: 'parata', w: 2, posto: 'parata', ora: [10.5, 12.5], giorni: [6], roles: [{ id: 'a', f: 'cop', r: 60 }, { id: 'b', near: 'a', r: 30 }, { id: 'c', near: 'a', r: 30 }], beats: [
      { all: [{ slot: 'b', i: 0, n: 3, sp: 1.3 }, { slot: 'c', i: 1, n: 3, sp: 1.3 }, { go: 'a', to: 'spot', sp: 1.4, d: 3, t: 20 }] }, { crowd: 6, around: 'b', r: 26 }, { pose: 'a', p: 'aspetta' },
      SAY('a', 'Indietro! Dietro la linea!', 'Fate largo alla banda!', 'Le bandiere in alto, su!'), { look: 'b', at: 'away' }, { look: 'c', at: 'away' },
      SAY('folla', 'Eccoli che arrivano.', 'Viva... viva il Garante.', 'Mio figlio è in seconda fila!'), { pose: 'b', p: 'braccia_su' }, { wait: 4 },
      SAY('c', 'Applaudi, che ti guardano.', 'Quanto dura quest\'anno?', 'L\'anno scorso pioveva, almeno.'), { pose: 'c', p: 'discute_su' }, SAY('b', 'Sorridi e stai zitto.', 'Fino a mezzogiorno, come sempre.'), { wait: 4 },
      { pose: 'b' }, { pose: 'c' }, { pose: 'a', p: 'indica_su' }, SAY('a', 'Circolare! La parata è finita.', 'Tutti a casa, avanti.'), { pose: 'a' }, { all: [{ go: 'b', to: 'away', sp: 1.3, d: 2, t: 10 }, { go: 'c', to: 'away', sp: 1.3, d: 2, t: 10 }] }] },
    // --- la notte: la pattuglia, chi si guarda attorno ---
    { id: 'pattuglia_notte', w: 2, posto: ['porta_della_citta', 'angolo'], ora: [22.5, 29], roles: [{ id: 'a', f: 'cop', r: 34 }, { id: 'b', near: 'a', f: 'cop', r: 30 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1.3 }, { slot: 'b', i: 1, n: 2, sp: 1.3 }] }, { look: 'a', at: 'around' }, { look: 'b', at: 'around' }, SAY('a', 'Tutto tranquillo.', 'Hai sentito? Lì dietro.', 'Alle due si smonta.'), SAY('b', 'Troppo tranquillo.', 'Gatti. Sono sempre gatti.', 'Il capitano vuole due fermi stanotte.'), { wait: 4 },
      { all: [{ go: 'a', to: 'away', sp: 1.1, d: 2.5, t: 14 }, { follow: 'b', who: 'a', sp: 1.2, d: 1.6 }] }, SAY('a', 'Controlliamo i portoni.'), { wait: 2 }] },
    { id: 'circospetto', w: 1, posto: ['angolo', 'portone'], roles: [{ id: 'a', f: 'm', min: 6 }], beats: [
      { go: 'a', to: 'spot', sp: 1.7, d: .9, t: 16 }, { look: 'a', at: 'around' }, { pose: 'a', p: 'tasche_su' }, { wait: 4 }, { look: 'a', at: 'player' }, { wait: 1.5 }, { look: 'a', at: 'around' }, SAY('a', '...', 'Non adesso.', 'Qui no.'), { wait: 2.5 }, { pose: 'a' }, { flee: 'a', from: 'player', sp: 1.8 }, { wait: 2 }] },
    { id: 'saluta_tutti', w: 2, posto: ['portone', 'dehors', 'sagrato'], ora: [8, 20], roles: [{ id: 'a', f: 'old|any', min: 6 }, { id: 'b', near: 'a', r: 20 }, { id: 'c', near: 'a', r: 20 }], beats: [
      { all: [{ slot: 'b', i: 0, n: 2, sp: 1.3, face: 'out' }, { slot: 'c', i: 1, n: 2, sp: 1.3, face: 'out' }] }, { go: 'a', to: 'spot', sp: 1.3, d: 2, t: 18 }, { pose: 'a', p: 'saluta_su' }, SAY('a', 'Buongiorno a tutti!', 'Salute, gioventù!', 'Oh, la bella compagnia!'),
      { look: 'b', at: 'a' }, { look: 'c', at: 'a' }, { pose: 'b', p: 'saluta_su' }, SAY('b', 'Don Ciccio! Come va la gamba?', 'Buongiorno, maestro!', 'Sempre in giro, eh?'), { pose: 'c', p: 'saluta_su' }, SAY('c', 'Salutami la signora!', 'Passa dopo, c\'è il caffè.'),
      { pose: 'a' }, SAY('a', 'Si tira avanti. Si tira avanti.', 'Ci vediamo al bar!'), { pose: 'b' }, { pose: 'c' }, { go: 'a', to: 'away', sp: 1.3, d: 2.5, t: 12 }, { wait: 1 }] },
    { id: 'sagrato_vespro', w: 3, posto: 'sagrato', ora: [15.5, 19.5], roles: [{ id: 'a', f: 'old' }, { id: 'b', near: 'a', f: 'f|old', r: 20 }, { id: 'c', near: 'a', f: 'young|any', r: 22 }], beats: [
      // il sagrato prima del vespro: due vecchie con la borsa della spesa aspettano il parroco, un ragazzo passa e viene preso di mira
      { hand: 'a', id: 'borsa' }, { all: [{ slot: 'a', i: 0, n: 3, sp: 1.1 }, { slot: 'b', i: 1, n: 3, sp: 1.1 }] }, { look: 'a', at: 'b' }, { look: 'b', at: 'a' }, { pose: 'a', p: 'braccia_su' }, { pose: 'b', p: 'discute_su' },
      SAY('b', 'Don Peppino oggi è in ritardo.', 'Hai visto chi c\'era alla messa del Garante? Tutti in prima fila.', 'La figlia della Pina non viene più a messa.'), SAY('a', 'Lo chiamano in Curia, dicono.', 'In prima fila, e poi la sera al Bar Sirena.', 'Con chi va, quella, lo sa tutto il borgo.'), { wait: 2 },
      { slot: 'c', i: 2, n: 3, sp: 1.4 }, { look: 'a', at: 'c' }, { look: 'b', at: 'c' }, { pose: 'b', p: 'indica_su' }, SAY('b', 'E tu? Quand\'è che ti vediamo in chiesa?', 'Guarda questo, coi capelli lunghi come una femmina.', 'Salutala, la signora Rosa! Non hai educazione?'),
      { look: 'c', at: 'b' }, { pose: 'c', p: 'saluta_su' }, SAY('c', 'Buonasera, signora Rosa.', 'Domenica, giuro.', 'Mia madre la saluta.'), { pose: 'c' }, { pose: 'b' }, { go: 'c', to: 'away', sp: 1.5, d: 2, t: 10 },
      SAY('a', 'Una volta i giovani si toglievano il cappello.', 'Bravo ragazzo, però. Il padre era del porto.'), { wait: 3 }, { pose: 'a' }, { hand: 'a', id: null }] },
    { id: 'stenditoio', w: 2, posto: 'stenditoio', ora: [[9, 12], [16, 18.5]], roles: [{ id: 'a', f: 'f|any', r: 30 }], beats: [
      { put: 'a', to: 'spot' }, { wrH: 'a', h: 'posto' }, { pose: 'a', p: 'lavora' }, SAY('a', 'Con questo vento asciuga in un\'ora.', 'Le lenzuola, poi le camicie.', 'Oh! Le mollette!'), { wait: 6 },
      { pose: 'a', p: 'braccia_su' }, SAY('a', 'Si vede fino al Mercato, da qui.', 'Ecco i Grigi, in piazza. Di nuovo.', 'Pina! Pina! Il sugo!'), { wait: 5 }, { pose: 'a', p: 'lavora' }, { wait: 4 }, { pose: 'a' }] },
    { id: 'edicola_giornale', w: 2, posto: 'edicola', ora: [6.5, 11.5], roles: [{ id: 'a', f: 'adult|any' }, { id: 'b', near: 'a', r: 20 }], beats: [
      { slot: 'a', i: 0, n: 2, sp: 1.4 }, { pose: 'a', p: 'porge', w: 1.4 }, { pose: 'a' }, { hand: 'a', id: 'giornale' }, { pose: 'a', p: 'legge_su' }, SAY('a', 'Il Garante inaugura un\'altra scuola. Sempre la stessa foto.', 'Ancora il cargo. Non c\'è altro?', 'Tre pagine sulla Vittoria. Tre.'),
      { slot: 'b', i: 1, n: 2, sp: 1.3 }, { look: 'b', at: 'a' }, SAY('b', 'Che dice il Bollettino?', 'C\'è lo sport?', 'Hanno scritto del fermo di ieri?'), SAY('a', 'Niente. Come sempre.', 'Il Napoli ha pareggiato.', 'Figurati. Non è successo niente, per loro.'), { wait: 3 }, { pose: 'a' }, { hand: 'a', id: null }, { go: 'a', to: 'away', sp: 1.4, d: 2, t: 10 }] },
    { id: 'vetrina_guarda', w: 2, posto: 'vetrina', ora: [10, 20], roles: [{ id: 'a' }, { id: 'b', near: 'a', f: 'young|any', r: 20 }], beats: [
      { slot: 'a', i: 0, n: 2, sp: 1.3 }, { pose: 'a', p: 'osserva' }, SAY('a', 'Quelle scarpe...', 'Con lo stipendio di novembre, forse.', 'Bella, quella radio.'), { wait: 3 },
      { slot: 'b', i: 1, n: 2, sp: 1.2 }, { pose: 'b', p: 'aspetta' }, { wait: 2 }, { look: 'b', at: 'around' }, { wait: 2 }, { look: 'b', at: 'player' }, { wait: 1.5 },
      { p: .5, then: [SAY('b', 'Troppa gente. Stanotte.', 'La serranda è vecchia.'), { pose: 'b' }, { flee: 'b', from: 'player', sp: 1.6 }], else: [SAY('b', 'Bella, eh?', 'Costa quanto un mese di lavoro.'), SAY('a', 'Troppo, per noi.'), { pose: 'b' }, { go: 'b', to: 'away', sp: 1.3, d: 2, t: 10 }] }, { wait: 2 }, { pose: 'a' }] },
    { id: 'portone_chiacchiere', w: 2, posto: 'portone', ora: [[9, 12], [17, 20.5]], roles: [{ id: 'a', f: 'f|any' }, { id: 'b', near: 'a', f: 'f|any', r: 20 }], beats: [
      { all: [{ slot: 'a', i: 0, n: 2, sp: 1.2, face: 'out' }, { slot: 'b', i: 1, n: 2, sp: 1.2 }] }, { look: 'b', at: 'a' }, { pose: 'a', p: 'braccia_su' }, { pose: 'b', p: 'discute_su' },
      SAY('b', 'Hai visto la figlia del farmacista?', 'Quella del terzo piano non paga l\'affitto da due mesi.', 'Stanotte hanno portato via il figlio della Pina.'), SAY('a', 'Con chi?', 'Lo sapevo. Lo sapevo!', 'Madonna. E lei?'), { wait: 2 },
      { pose: 'b' }, { pose: 'a', p: 'discute_su' }, SAY('b', 'Con uno del porto. Di sera.', 'Il padrone di casa è un uomo dello Squalo.', 'Non parla più. Sta alla finestra.'), SAY('a', 'Non dirlo a nessuno.', 'Poveretta.', 'Poi dicono che sono le madri.'), { wait: 3 }, { pose: 'a', p: 'braccia_su' }, { wait: 3 }, { pose: 'a' }] },
  ];

  // agganci: il passo, il movimento di chi recita, le pose
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Eventi]', e); } } }; }
  { const m0 = G.HOOKS.move; G.HOOKS.move = (st, n, dt, a) => (n.__ev && move(st, n, dt)) || (m0 ? m0(st, n, dt, a) : false); }
  const MOODS = { ubriaco: 1, postumi: 1, freddo: 1, ferito: 1, paura: 1, rabbia: 1, stanco: 1 };
  if (typeof Anim !== 'undefined' && Anim.npcMap) Anim.npcMap((st, n, s) => {
    const e = n.__ev; if (!e || n.dead) return;
    if (e.mood && s.mood && !s.mood.includes(e.mood)) s.mood.push(e.mood);
    if (!e.pose || (n.stun > 0 && !(e.down > st.clock))) return;
    const p = e.pose;
    if (MOODS[p]) { if (s.mood && !s.mood.includes(p)) s.mood.push(p); return; }
    if (p.endsWith('_su')) s.upper = p.slice(0, -3); else { s.act = p; s.upper = null; }
    if (p === 'in_bmx') { s.crank = e.crank || 0; s.carica = 0; s.aria = 0; s.impenna = 0; s.peg = 0; }
  });

  return { CFG, SCENE, run, step, S, list: () => SCENE.map(s => s.id), _: { weight, postiFor, pickRoles, slotsOf } };   // [vita2] _: per le prove
})();
if (typeof module !== 'undefined') module.exports = Eventi;
