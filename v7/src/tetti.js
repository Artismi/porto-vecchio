/* Porto Vecchio — i tetti (v7, «Writer»).
   Su ogni edificio c'è una scala a pioli di ferro (sul fianco o sul retro, mai sulla porta; su un tetto più basso se la casa
   non ha un lato libero). V ai piedi della scala: sali; V in cima: scendi. Sopra si cammina davvero:
   - LA QUOTA dei tetti è quella del modello (la grafica la misura con un raggio dall'alto, un metro alla volta: terrazzi,
     falde, comignoli e parapetti compresi); finché non l'ha misurata vale la regola dei piani (3,6 m + 2,4 a piano).
   - DA TETTO A TETTO: se si tocca, si passa (un gradino fino a 65 cm si sale, più in basso si scende saltando giù); se c'è un
     vicolo in mezzo si salta (Spazio, tieni per caricare): in aria il vuoto si attraversa, se atterri nel vuoto cadi in strada.
   - CADERE: fino a 4,5 m si atterra bene, oltre ci si fa male (e oltre 12 m molto male).
   - Sul tetto c'è la roba sui tetti (oggetti.js: p.onRoof) e ci sono i muri che da sotto non si raggiungono: gli heaven spot.
   Stato: st.player.lv = { k: 'tetto', b: indice dell'edificio, h: quota dei piedi } | { k: 'scala', L, up, t }.
   Si aggancia a Livelli (freeFn, moved, heightOf, key) senza toccarne il codice; la grafica (in fondo) disegna le scale. */
var Tetti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const LV = typeof Livelli !== 'undefined' ? Livelli : require('./livelli.js');
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, EL = G.MAP.elev, BI = W.bIndex, B = G.BUILDINGS;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
  const MG = 3.6, MF = 2.4;                   // come render.js: piano terra e piani sopra
  const STEP = .65, SAFE = 4.5, CLIMB_V = 1.7; // gradino che si sale camminando, caduta senza danni, velocità sulla scala (m/s)
  const inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const tileH = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return inb(tx, ty) ? EL[ty * GW + tx] : 0; };
  const bAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (!inb(tx, ty)) return -1; const i = BI[ty * GW + tx]; return i >= 0 && B[i] ? i : -1; };

  // ---------------- LA QUOTA DEI TETTI ----------------
  // la regola dei piani (prima che la grafica misuri il modello)
  function roofRule(b) {
    const base = b.base || 0;
    if (b.lighthouse) return base + 12;
    if (b.kiosk) return base + 2.8;
    return base + (b.fl >= 1 ? MG + (b.fl - 1) * MF : 3);
  }
  // la quota del tetto dell'edificio bi nel punto x, y (null: lì non c'è tetto, per esempio un cortile)
  function roofH(bi, x, y) {
    const b = B[bi]; if (!b) return null;
    const g = b.__rH; if (!g) return roofRule(b);
    const W1 = b.w * TS, gx = clamp(Math.floor(x - b.x * TS), 0, W1 - 1), gy = clamp(Math.floor(y - b.y * TS), 0, b.h * TS - 1), v = g[gy * W1 + gx];
    return Number.isFinite(v) ? v : null;
  }
  // il tetto sotto un punto: { bi, h } o null
  function roofAt(x, y) { const bi = bAt(x, y); if (bi < 0) return null; const h = roofH(bi, x, y); return h === null ? null : { bi, h }; }

  // ---------------- LE SCALE ----------------
  // una per edificio (due per i grandi), sul lato libero più nascosto: fianchi e retro, meglio negli angoli
  const DOOR = b => b.door ? b.door : null;
  function sidesOf(b) {
    return [
      { f: 'S', n: b.w, out: [0, 1], tile: k => [b.x + k, b.y + b.h], wall: k => [(b.x + k + .5) * TS, (b.y + b.h) * TS] },
      { f: 'N', n: b.w, out: [0, -1], tile: k => [b.x + k, b.y - 1], wall: k => [(b.x + k + .5) * TS, b.y * TS] },
      { f: 'E', n: b.h, out: [1, 0], tile: k => [b.x + b.w, b.y + k], wall: k => [(b.x + b.w) * TS, (b.y + k + .5) * TS] },
      { f: 'W', n: b.h, out: [-1, 0], tile: k => [b.x - 1, b.y + k], wall: k => [b.x * TS, (b.y + k + .5) * TS] },
    ];
  }
  function frontOf(b) {
    const d = DOOR(b); if (!d) return null;
    if (d[1] >= b.y + b.h) return 'S'; if (d[1] < b.y) return 'N'; if (d[0] >= b.x + b.w) return 'E'; if (d[0] < b.x) return 'W'; return null;
  }
  const LADDERS = [];
  function buildLadders() {
    LADDERS.length = 0;
    const used = new Set();
    B.forEach((b, bi) => {
      if (b.lighthouse) return;
      const d = DOOR(b), front = frontOf(b), cand = [];
      sidesOf(b).forEach(sd => {
        for (let k = 0; k < sd.n; k++) {
          const [tx, ty] = sd.tile(k); if (!inb(tx, ty)) continue;
          if (d && Math.max(Math.abs(tx - d[0]), Math.abs(ty - d[1])) <= 1) continue;   // non davanti alla porta
          if (used.has(ty * GW + tx)) continue;
          const other = BI[ty * GW + tx];
          let foot = -1;
          if (other >= 0 && other !== bi && B[other]) { if (roofRule(B[other]) < roofRule(b) - 1.5) foot = other; else continue; }   // dal tetto più basso del vicino
          else if (!G.walkT(tx, ty)) continue;
          let s = (sd.f === front ? -4 : 0) + (k === 0 || k === sd.n - 1 ? 2 : 0) + (sd.f === 'E' || sd.f === 'W' ? 1 : 0) + (foot >= 0 ? -3 : 0);
          // la casella davanti alla scala deve avere un po' di spazio (non un budello fra due muri ciechi)
          if (foot < 0) { const [ox, oy] = sd.out; if (!G.walkT(tx + ox, ty + oy)) s -= 1.5; }
          cand.push({ s, sd, k, tx, ty, foot });
        }
      });
      if (!cand.length) return;
      cand.sort((p, q) => q.s - p.s);
      const take = b.w * b.h >= 30 ? 2 : 1, got = [];
      for (const c of cand) {
        if (got.length >= take) break;
        if (got.some(g => g.sd.f === c.sd.f)) continue;
        got.push(c); used.add(c.ty * GW + c.tx);
        const [wx, wy] = c.sd.wall(c.k), [ox, oy] = c.sd.out;
        LADDERS.push({ i: LADDERS.length, bi, f: c.sd.f, x: wx, y: wy, ox, oy, fx: wx + ox * .55, fy: wy + oy * .55, tx: wx - ox * .8, ty: wy - oy * .8, footB: c.foot, ang: Math.atan2(oy, ox) });
      }
    });
  }
  buildLadders();
  const footH = L => L.footB >= 0 ? (roofH(L.footB, L.fx, L.fy) ?? roofRule(B[L.footB])) : tileH(L.fx, L.fy);
  const topH = L => { const h = roofH(L.bi, L.tx, L.ty); return h === null ? roofRule(B[L.bi]) : h; };
  // la scala più vicina: ai piedi (per salire) o in cima (per scendere)
  function ladderNear(st, top, r) {
    const p = st.player; let best = null, bd = r || 1.5;
    for (const L of LADDERS) {
      if (top) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.bi) continue; const d = hyp(p.x - L.tx, p.y - L.ty); if (d < bd) { bd = d; best = L; } }
      else {
        if (L.footB >= 0) { if (!p.lv || p.lv.k !== 'tetto' || p.lv.b !== L.footB) continue; }
        else if (p.lv || p.indoor) continue;
        const d = hyp(p.x - L.fx, p.y - L.fy); if (d < bd) { bd = d; best = L; }
      }
    }
    return best;
  }

  // ---------------- SALIRE E SCENDERE ----------------
  function climb(st, L, up) {
    const p = st.player; if (p.vehicle) return null;
    if (p.sk && p.sk.on && typeof Skate !== 'undefined') Skate.dismount(st, true);
    const a = footH(L), b = topH(L);
    p.lv = { k: 'scala', L: L.i, up: !!up, t: 0, h0: up ? a : b, h1: up ? b + .05 : a, dur: Math.max(1.2, Math.abs(b - a) / CLIMB_V) };
    p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.jz = 0; p.jvz = 0; p.path = [];
    hooks.climb.forEach(f => { try { f(st, L, up); } catch (e) { } });
    return up ? `Sali la scala di ferro: ${Math.round(b - a)} metri.` : 'Scendi la scala.';
  }
  function climbStep(st, dt) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'scala') return;
    const L = LADDERS[lv.L]; p.jcharge = null; lv.t = Math.min(1, lv.t + dt / lv.dur); p.x = L.fx; p.y = L.fy; p.face = L.ang + Math.PI; p.speed = 0; p.anim = (p.anim || 0) + dt * 4;
    if (lv.t < 1) return;
    if (lv.up) { p.x = L.tx; p.y = L.ty; p.lv = { k: 'tetto', b: L.bi, h: topH(L) }; p.face = L.ang + Math.PI; G.feed(st, 'Sei sul tetto. Spazio per saltare da un tetto all\'altro; V sulla scala per scendere.'); }
    else if (L.footB >= 0) { p.lv = { k: 'tetto', b: L.footB, h: footH(L) }; }
    else p.lv = null;
  }
  const climbH = lv => lv.h0 + (lv.h1 - lv.h0) * lv.t;

  // ---------------- CAMMINARE SUI TETTI ----------------
  // dove si può mettere un piede: su un tetto (non più alto di un gradino, salto compreso); in aria anche sul vuoto
  function roofFree(o, r) {
    const lv = o.lv, k = r * .7;
    return (x, y) => {
      const air = (o.jz || 0) > .15, top = lv.h + STEP + Math.max(0, o.jz || 0);
      for (const [a, c] of [[x, y], [x - k, y - k], [x + k, y - k], [x - k, y + k], [x + k, y + k]]) {
        const q = roofAt(a, c);
        if (!q) { if (!air) return false; if (bAt(a, c) < 0 && !G.walkM(a, c) && !(G.seaM && G.seaM(a, c))) return false; continue; }
        if (q.h > top) return false;
        if (!air && q.h < lv.h - SAFE) return false;   // camminando non si casca da un tetto alto: per buttarsi giù si salta
      }
      return true;
    };
  }
  // dopo ogni passo (e a ogni fotogramma): la quota del tetto sotto i piedi, il salto giù, il vuoto
  function settle(st) {
    const p = st.player, lv = p.lv; if (!lv || lv.k !== 'tetto') return;
    const q = roofAt(p.x, p.y);
    if (q) {
      if (q.bi !== lv.b) lv.b = q.bi;
      const d = lv.h - q.h;
      if (Math.abs(d) > 1e-3) {
        if (d > 0) { p.jz = (p.jz || 0) + d; if (!(p.jvz < 0)) p.jvz = p.jvz || 0; }
        else { p.jz = Math.max(0, (p.jz || 0) + d); if (!p.jz) p.jvz = 0; }
        lv.h = q.h;
      }
    } else if (!(p.jz > 0)) {   // nel vuoto: giù in strada (o in mare)
      const g = tileH(p.x, p.y); p.jz = Math.max(.001, lv.h - g); p.jvz = Math.min(0, p.jvz || 0); p.lv = null;
      G.feed(st, 'Il vuoto sotto i piedi!', 'bad');
    }
  }
  // l'atterraggio: da quanto in alto si è caduti
  function fallStep(st) {
    const p = st.player, feet = (p.lv && p.lv.k === 'tetto') ? p.lv.h : tileH(p.x, p.y), top = feet + (p.jz || 0);
    if (p.jz > 0) { p.__airTop = Math.max(p.__airTop == null ? top : p.__airTop, top); return; }
    if (p.__airTop == null) return;
    const drop = p.__airTop - feet; p.__airTop = null;
    if (drop > SAFE) {
      const dmg = Math.round((drop - SAFE) * 14 + (drop > 12 ? 40 : 0)); p.hp = Math.max(1, p.hp - dmg); p.hurtT = st.clock; p.stun = Math.max(p.stun || 0, Math.min(2.5, .4 + (drop - SAFE) * .25));
      G.feed(st, drop > 9 ? `Volo di ${Math.round(drop)} metri. Le gambe non rispondono.` : `Atterri male (${Math.round(drop)} m).`, 'bad');
      st.sfx && st.sfx.push({ k: 'land', x: p.x, y: p.y });
    }
  }

  // ---------------- AGGANCI A LIVELLI ----------------
  const hooks = { climb: [] };
  const F0 = LV.freeFn, M0 = LV.moved, H0 = LV.heightOf, K0 = LV.key;
  LV.freeFn = (o, r) => { const lv = o.lv; if (lv && lv.k === 'tetto') return roofFree(o, r); if (lv && lv.k === 'scala') return () => false; return F0(o, r); };
  LV.moved = (st, dx, dy, hit) => { const p = st.player, lv = p.lv; if (lv && (lv.k === 'tetto' || lv.k === 'scala')) { settle(st); return true; } return M0(st, dx, dy, hit); };
  LV.heightOf = (st, o) => { const lv = o.lv; if (lv && lv.k === 'tetto') return lv.h; if (lv && lv.k === 'scala') return climbH(lv); return H0(st, o); };
  function vKey(st) {
    const p = st.player; if (p.vehicle || p.indoor) return null;
    if (p.lv && p.lv.k === 'scala') return 'Sei sulla scala.';
    const top = ladderNear(st, true, 1.6); if (top) return climb(st, top, false);
    const foot = ladderNear(st, false, 1.6); if (foot) return climb(st, foot, true);
    if (p.lv && p.lv.k === 'tetto') return 'Qui non c\'è la scala. Cerca i pioli sul bordo, o salta giù (Spazio).';
    return null;
  }
  LV.key = (st, k, sh) => { if (k === 'v') { const m = vKey(st); if (m) return m; } return K0(st, k, sh); };
  // il suggerimento in basso (G.context) e il menu «Qui, adesso»
  if (G.context) { const c0 = G.context; G.context = st => { const out = c0(st), p = st.player; if (!p || p.vehicle || st.over) return out;
    if (ladderNear(st, true, 1.6)) out.push({ key: 'V', label: 'Scendi dalla scala' }); else if (ladderNear(st, false, 1.6)) out.push({ key: 'V', label: 'Sali sul tetto' });
    return out; }; }
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => { const out = (prev(st) || []).slice();
    const t = ladderNear(st, true, 1.6), f = !t && ladderNear(st, false, 1.6);
    if (t) out.push({ id: 'tetto', label: 'Scendi dalla scala (V)', run: () => climb(st, t, false), off: '' }); else if (f) out.push({ id: 'tetto', label: 'Sali sul tetto (V)', run: () => climb(st, f, true), off: '' });
    return out; }; }
  // il passo: la scala, il tetto sotto i piedi, le cadute; p.onRoof per la roba sui tetti (oggetti.js)
  function step(st, dt) {
    const p = st.player; if (!p) return;
    climbStep(st, dt);
    if (p.lv && p.lv.k === 'tetto') settle(st);
    fallStep(st);
    p.onRoof = !!(p.lv && p.lv.k === 'tetto');
  }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Tetti]', e); } } }; }
  const onRoof = st => !!(st.player.lv && st.player.lv.k === 'tetto');
  const roofB = st => onRoof(st) ? B[st.player.lv.b] : null;
  const feetH = st => { const p = st.player; return LV.heightOf(st, p) ?? tileH(p.x, p.y); };

  // =====================================================================================================================
  // LA GRAFICA: le scale (tre InstancedMesh per tutta l'isola) e la misura dei tetti
  // =====================================================================================================================
  const GFX = { built: 0, sig: '', meshes: null, scanQ: [], scanned: new Set() };
  function recs(R) { return (R && R.__buildings) || []; }
  // i pezzi del modello di un edificio (le case a gradoni ne hanno più d'uno: il corpo e i volumi sopra)
  function recsOf(R, b) { return recs(R).filter(r => r.grp && r.b && (r.b === b || r.b.id === b.id)); }
  // la quota vera: un raggio dall'alto ogni metro, sul modello dell'edificio (solo i pezzi sopra il primo piano)
  function scanRoof(R, bi) {
    const b = B[bi]; if (!b || b.__rH) return true; const parts = recsOf(R, b).map(r => r.grp); if (!parts.length) return false;
    const T3 = THREE, rc = GFX.rc || (GFX.rc = new T3.Raycaster()), o = new T3.Vector3(), dn = new T3.Vector3(0, -1, 0);
    parts.forEach(g => g.updateMatrixWorld(true));
    const W1 = b.w * TS, H1 = b.h * TS, g = new Float32Array(W1 * H1), floor = (b.base || 0) + 1.6, rule = roofRule(b);
    let hits = 0;
    for (let gy = 0; gy < H1; gy++) for (let gx = 0; gx < W1; gx++) {
      const x = b.x * TS + gx + .5, z = b.y * TS + gy + .5; o.set(x, rule + 40, z); rc.set(o, dn); rc.far = 80;
      const h = rc.intersectObjects(parts, true).find(h => !h.object.userData.velo && !h.object.userData.noRoof && h.point.y > floor);
      g[gy * W1 + gx] = h ? h.point.y : NaN; if (h) hits++;
    }
    if (hits < W1 * H1 * .25) return true;   // il modello non si presta (vuoto, trasparente): resta la regola dei piani
    // i buchi isolati (uno spigolo mancato) prendono la quota dei vicini; i cortili veri restano vuoti
    for (let gy = 0; gy < H1; gy++) for (let gx = 0; gx < W1; gx++) { const i = gy * W1 + gx; if (Number.isFinite(g[i])) continue; let s = 0, n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = gx + dx, Y = gy + dy; if (X < 0 || Y < 0 || X >= W1 || Y >= H1) continue; const v = g[Y * W1 + X]; if (Number.isFinite(v)) { s += v; n++; } } if (n >= 3) g[i] = s / n; }
    b.__rH = g; return true;
  }
  function ladderGeo() {
    const T3 = THREE, box = new T3.BoxGeometry(1, 1, 1);
    const iron = new T3.MeshStandardMaterial({ color: '#3b3a3c', metalness: .55, roughness: .55 }), rust = new T3.MeshStandardMaterial({ color: '#6a3c28', metalness: .3, roughness: .8 });
    return { box, iron, rust };
  }
  // le scale: due montanti, i pioli ogni 30 cm, la gabbia sopra i 2,5 m, il corrimano che scavalca il bordo del tetto
  function buildLaddersGfx(R) {
    const T3 = THREE, scene = R.__models.scene; if (!scene) return;
    if (GFX.meshes) GFX.meshes.forEach(m => { scene.remove(m); });
    const G3 = GFX.geo || (GFX.geo = ladderGeo()), rails = [], rungs = [], hoops = [];
    const m4 = new T3.Matrix4(), q = new T3.Quaternion(), e = new T3.Euler(), s3 = new T3.Vector3(), p3 = new T3.Vector3();
    const put = (arr, x, y, z, sx, sy, sz, yaw) => { e.set(0, yaw, 0); q.setFromEuler(e); arr.push(m4.compose(p3.set(x, y, z), q, s3.set(sx, sy, sz)).clone()); };
    LADDERS.forEach(L => {
      const y0 = footH(L), y1 = topH(L) + .95, Hh = y1 - y0; if (Hh < .5 || Hh > 40) return;
      const off = .2, cx = L.x + L.ox * off, cz = L.y + L.oy * off, yaw = -L.ang;   // 20 cm fuori dal muro
      const sx = -L.oy * .22, sz = L.ox * .22;   // i due montanti, 44 cm l'uno dall'altro
      for (const s of [-1, 1]) put(rails, cx + sx * s, y0 + Hh / 2, cz + sz * s, .05, Hh, .05, yaw);
      for (let y = y0 + .3; y < y1 - .9; y += .3) put(rungs, cx, y, cz, .03, .03, .44, yaw);
      // il corrimano ad arco sopra il bordo: due montanti che piegano verso il tetto
      for (const s of [-1, 1]) put(rails, cx - L.ox * .35 + sx * s, y1 - .02, cz - L.oy * .35 + sz * s, .7, .05, .05, yaw);
      // la gabbia: anelli a U ogni 70 cm sopra i 2,5 m (le scale lunghe)
      if (Hh > 4) for (let y = y0 + 2.5; y < y1 - .6; y += .7) {
        put(hoops, cx + L.ox * .38, y, cz + L.oy * .38, .03, .03, .62, yaw);
        for (const s of [-1, 1]) put(hoops, cx + L.ox * .2 + sx * s * 1.35, y, cz + L.oy * .2 + sz * s * 1.35, .36, .03, .03, yaw);
      }
      if (Hh > 4) for (const s of [-1, 0, 1]) { const top = y1 - .6, bot = y0 + 2.5; if (top > bot) put(hoops, cx + L.ox * (s ? .2 : .38) + sx * s * 1.35, (top + bot) / 2, cz + L.oy * (s ? .2 : .38) + sz * s * 1.35, .025, top - bot, .025, yaw); }
    });
    const mk = (arr, m) => { const im = new T3.InstancedMesh(G3.box, m, Math.max(1, arr.length)); arr.forEach((mm, i) => im.setMatrixAt(i, mm)); im.count = arr.length; im.castShadow = true; im.receiveShadow = true; im.userData.noRoof = true; im.frustumCulled = false; scene.add(im); return im; };
    GFX.meshes = [mk(rails, G3.iron), mk(rungs, G3.iron), mk(hoops, G3.rust)];
  }
  function frame() {
    try {
      const pv = window.__pv, R = pv && pv.R, st = pv && pv.st;
      if (R && R.__models && R.__models.scene && st && window.THREE) {
        const L = recs(R), sig = L.length + ':' + (L[0] && L[0].b ? L[0].b.id : '') + ':' + (L.length && L[L.length - 1].grp ? L[L.length - 1].grp.uuid : '');
        if (L.length && sig !== GFX.sig) { GFX.sig = sig; GFX.stableT = performance.now(); GFX.dirty = true; }
        // la quota dei tetti dove servono le scale: la si misura una casa alla volta, vicino al giocatore
        const p = st.player, now = performance.now();
        if (L.length && now - (GFX.scanT || 0) > 60) {
          GFX.scanT = now; let n = 0;
          const near = []; for (let bi = 0; bi < B.length; bi++) { const b = B[bi]; if (b.__rH || GFX.scanned.has(bi)) continue; const d = hyp((b.x + b.w / 2) * TS - p.x, (b.y + b.h / 2) * TS - p.y); if (d < 70) near.push([d, bi]); }
          near.sort((a, c) => a[0] - c[0]);
          for (const [, bi] of near) { if (n++ >= 2) break; if (scanRoof(R, bi)) { GFX.scanned.add(bi); GFX.dirty = true; } }
          // sul tetto: si misurano prima i vicini (per i salti)
          if (onRoof(st)) for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { const bi = bAt(p.x + dx, p.y + dy); if (bi >= 0 && !B[bi].__rH && !GFX.scanned.has(bi) && scanRoof(R, bi)) GFX.scanned.add(bi); }
        }
        if (GFX.dirty && now - (GFX.stableT || 0) > 1500 && now - (GFX.builtT || 0) > 2500) { GFX.dirty = false; GFX.builtT = now; buildLaddersGfx(R); }
        if (GFX.st !== st) { GFX.st = st; }
      }
    } catch (e) { if (!frame.err) { frame.err = 1; console.warn('[Tetti]', e); } }
    requestAnimationFrame(frame);
  }
  if (typeof window !== 'undefined') {
    const go = () => { if (!window.THREE || !window.__pv) { setTimeout(go, 300); return; } requestAnimationFrame(frame); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
  }

  return { LADDERS, roofAt, roofH, roofRule, bAt, climb, ladderNear, onRoof, roofB, feetH, settle, scanRoof, hooks, STEP, SAFE, _: { buildLadders, GFX, footH, topH } };
})();
if (typeof module !== 'undefined') module.exports = Tetti;
