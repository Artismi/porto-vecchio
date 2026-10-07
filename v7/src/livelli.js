/* Porto Vecchio — i livelli: sotto terra e sopra il vuoto (v7, «Monte Scuro»).
   SOTTOSUOLO. Con la pala (terra) o il piccone (roccia) si scava dappertutto:
   - in superficie: «Scava una botola» apre un pozzo nel punto dove sei (da fuori resta solo una botola);
                    contro una parete di roccia o un muro a secco si apre un cunicolo che entra nel monte.
   - sotto terra:   H scava avanti in piano, J in discesa, K in salita, N allarga in una stanza (3×3); V sale e scende da botole e pozzi,
                    «Apri una botola sopra» esce in superficie dove sei arrivato.
     Se scavando il pendio si abbassa fino al pavimento del cunicolo, la terra cede: sei uscito in un altro punto della mappa.
   Le grotte naturali (Grotta del Romito, Eremo) sono già scavate e passano da parte a parte.
   PONTI. Il Ponte del Diavolo attraversa la gola: sopra si cammina sulle assi, sotto si passa sul fondo.
   Il giocatore sta su un livello: st.player.lv = null (superficie) | { k: 'ug' } (sotto terra) | { k: 'ponte', id }.
   Il motore chiede a questo modulo dove si può camminare (freeFn) e cosa succede dopo ogni passo (moved).
   [sottosuolo] Si scava anche sotto la città: sotto una casa «Apri una botola sopra» sfonda il pavimento e sbuchi dentro
   (portale 'interno'); da dentro una casa H apre una botola nel pavimento e scendi. Maiusc+H scava di filato (avanti finché
   non lo fermi o trovi qualcosa). V sale e scende anche da tombini, scale e grate. Scavando si trova roba sepolta (hooks.dug). */
var Livelli = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  const W = G.MAP.world, TS = G.TS, GW = G.GW, GH = G.GH, T = G.T, N = GW * GH, EL = G.MAP.elev;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ti = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)], idx = (tx, ty) => ty * GW + tx, inb = (tx, ty) => tx >= 0 && ty >= 0 && tx < GW && ty < GH;
  const ROOF = 2.4;           // altezza del cunicolo
  const SOFT = new Set([T.GRASS, T.SHRUB, T.DIRT, T.FIELD, T.SAND, T.GRAVEL, T.DESERT, T.SALT]);
  const HARD = new Set([T.ROCK, T.CLIFF]);
  // attrezzi: la pala per la terra, il piccone per la roccia
  if (AZ && AZ.ITEMS && !AZ.ITEMS.piccone) AZ.ITEMS.piccone = { name: 'piccone', buy: { 'use:ferramenta': 9 }, take: ['cava', 'stazione_n', 'stazione_s', 'cantiere', 'carbonaia'] };
  function has(st, k) { const p = st.player; if (p.hand === k) return true; if (p.inv && p.inv[k] > 0) return true; try { if (AZ && AZ.playerInv && AZ.playerInv(st)[k] > 0) return true; } catch (e) { } return false; }

  // ---------------- STATO ----------------
  function S(st) { if (!st.lv) init(st); return st.lv; }
  function init(st) {
    const L = st.lv = { ug: new Uint8Array(N), fl: new Float32Array(N), kind: new Uint8Array(N), portals: [], rooms: [], rev: 1, job: null, found: {} };
    (W.CAVES || []).forEach(cv => carveCave(L, cv));
    hooks.init.forEach(f => { try { f(L, st); } catch (e) { if (typeof console !== 'undefined') console.error('[Livelli] init', e); } });   // [sottosuolo] fogne, cripte, carceri, metropolitana
    return L;
  }
  const surfWalk = (tx, ty) => G.walkT(tx, ty);
  // grotta naturale: la traccia diventa un passaggio, le stanze si allargano; ai capi un imbocco nella parete o un pozzo con la scala
  function carveCave(L, cv) {
    const tiles = [];
    for (let k = 0; k < cv.path.length - 1; k++) {
      const [ax, ay] = cv.path[k], [bx, by] = cv.path[k + 1], d = Math.hypot(bx - ax, by - ay);
      for (let s = 0; s <= d; s += .4) { const [tx, ty] = ti(ax + (bx - ax) * s / d, ay + (by - ay) * s / d); const last = tiles[tiles.length - 1]; if (!last || last[0] !== tx || last[1] !== ty) { if (last && last[0] !== tx && last[1] !== ty) tiles.push([tx, last[1]]); tiles.push([tx, ty]); } }
    }
    // l'imbocco: la prima parete lungo la traccia (fuori resta la casella prima); il pozzo: una scala dritta in su
    let mi = -1, ei = -1;
    if (cv.mouth === 'imbocco') { mi = tiles.findIndex(([tx, ty]) => G.tileAt(tx, ty) === T.CLIFF); if (mi < 1) mi = -1; }
    if (cv.exit === 'imbocco') { for (let k = tiles.length - 1; k > 0; k--) if (G.tileAt(tiles[k - 1][0], tiles[k - 1][1]) === T.CLIFF && surfWalk(tiles[k][0], tiles[k][1])) { ei = k; break; } }
    const last = tiles[tiles.length - 1];
    const g0 = mi > 0 ? EL[idx(...tiles[mi - 1])] : EL[idx(...tiles[0])] - 3;
    const g1 = ei > 0 ? EL[idx(...tiles[ei])] : EL[idx(...last)] - 3;
    const a = mi > 0 ? mi : 0, b = ei > 0 ? ei - 1 : tiles.length - 1;
    for (let k = a; k <= b; k++) { const [tx, ty] = tiles[k], i = idx(tx, ty), t = b > a ? (k - a) / (b - a) : 0; L.ug[i] = 3; L.fl[i] = g0 + (g1 - g0) * t; L.kind[i] = 1; }
    (cv.rooms || []).forEach(([x, y, hw, hh, deco]) => {
      const [cx, cy] = ti(x, y); let f = L.fl[idx(cx, cy)]; if (!L.ug[idx(cx, cy)]) { let bd = 1e9; for (let k = a; k <= b; k++) { const d = Math.hypot(tiles[k][0] - cx, tiles[k][1] - cy); if (d < bd) { bd = d; f = L.fl[idx(...tiles[k])]; } } }
      for (let ty = Math.floor((y - hh) / TS); ty <= Math.floor((y + hh) / TS); ty++) for (let tx = Math.floor((x - hw) / TS); tx <= Math.floor((x + hw) / TS); tx++) if (inb(tx, ty) && !L.ug[idx(tx, ty)]) { L.ug[idx(tx, ty)] = 3; L.fl[idx(tx, ty)] = f; L.kind[idx(tx, ty)] = 1; }
      L.rooms.push({ x, y, f, deco, cave: cv.id });
    });
    if (mi > 0) L.portals.push({ kind: 'imbocco', nat: true, s: tiles[mi - 1], u: tiles[mi], name: cv.name });
    else L.portals.push({ kind: 'pozzo', nat: true, s: tiles[0], u: tiles[0], name: cv.name });
    if (ei > 0) L.portals.push({ kind: 'imbocco', nat: true, s: tiles[ei], u: tiles[ei - 1], name: cv.name });
    else L.portals.push({ kind: 'pozzo', nat: true, s: last, u: last, name: cv.name });
  }
  const portalAt = (L, tx, ty, which) => L.portals.find(P => P[which][0] === tx && P[which][1] === ty);
  const CLIMB = new Set(['botola', 'pozzo', 'tombino', 'scala', 'grata', 'interno']);   // [sottosuolo] da qui si sale e si scende
  const hooks = { dug: [], init: [] };   // [sottosuolo] chi vuole sapere quando si scava una casella nuova: (st, tx, ty, L) → messaggio o null
  const onDug = (st, tx, ty, L) => { let m = null; for (const f of hooks.dug) { try { m = f(st, tx, ty, L) || m; } catch (e) { } } return m; };

  // ---------------- PONTI ----------------
  const BR = (W.BRIDGES || []).map(B => { const dx = B.b[0] - B.a[0], dy = B.b[1] - B.a[1], len = Math.hypot(dx, dy); return Object.assign({}, B, { ux: dx / len, uy: dy / len, len }); });
  function onDeck(B, x, y) { const t = ((x - B.a[0]) * B.ux + (y - B.a[1]) * B.uy) / B.len, d = Math.abs(-(x - B.a[0]) * B.uy + (y - B.a[1]) * B.ux); return { t, d }; }
  const deckH = (B, t) => { const tt = clamp(t, 0, 1); return B.h0 + (B.h1 - B.h0) * tt - Math.sin(tt * Math.PI) * .55 + .12; };

  // ---------------- MOVIMENTO ----------------
  // dove si può mettere un piede su questo livello
  function freeFn(o, r) {
    const st = o.__st; const lv = o.lv; if (!lv) return null;
    if (lv.k === 'ponte') {
      const B = BR.find(b => b.id === lv.id); if (!B) return null;
      return (x, y) => { const q = onDeck(B, x, y); if (q.t >= 0 && q.t <= 1) return q.d <= B.w / 2; return G.walkM(x, y) && q.d < 2.4; };
    }
    if (lv.k === 'ug' && st) {
      const L = S(st);
      const ok = (x, y) => { const [tx, ty] = ti(x, y); if (!inb(tx, ty)) return false; if (L.ug[idx(tx, ty)]) return true; return L.portals.some(P => P.kind === 'imbocco' && P.s[0] === tx && P.s[1] === ty); };
      return (x, y) => ok(x - r, y - r) && ok(x + r, y - r) && ok(x - r, y + r) && ok(x + r, y + r);
    }
    return null;
  }
  // dopo il passo: entrare e uscire dai cunicoli, salire e scendere dal ponte. true = gestito (niente porte)
  function moved(st, dx, dy, hit) {
    const p = st.player, L = S(st), [tx, ty] = ti(p.x, p.y);
    if (L.job && L.job.x !== undefined && Math.hypot(p.x - L.job.x, p.y - L.job.y) > 1.2) { L.job = null; L.auto = null; G.feed(st, 'Lasci perdere lo scavo.'); }
    if (!p.lv) {
      // il ponte: dal capo, verso l'altra sponda
      for (const B of BR) { const q = onDeck(B, p.x, p.y); if (q.d < B.w / 2 + .3 && q.t > -.05 && q.t < 1.05 && Math.abs(G.MAP.elev[idx(tx, ty)] - deckH(B, q.t)) < 1.3 && (q.t < .2 || q.t > .8)) { p.lv = { k: 'ponte', id: B.id }; return true; } }
      if (hit) {
        // contro la parete: c'è un imbocco?
        const fx = Math.floor((p.x + dx * .9) / TS), fy = Math.floor((p.y + dy * .9) / TS);
        const P = L.portals.find(P => P.kind === 'imbocco' && P.s[0] === tx && P.s[1] === ty && P.u[0] === fx && P.u[1] === fy);
        if (P) { p.lv = { k: 'ug' }; L.lastU = P.u; G.feed(st, P.nat ? `Entri nella ${P.name || 'grotta'}.` : 'Entri nel cunicolo.'); return true; }
      }
      return false;
    }
    if (p.lv.k === 'ponte') {
      const B = BR.find(b => b.id === p.lv.id), q = B ? onDeck(B, p.x, p.y) : { t: 2 };
      if (q.t < -.02 || q.t > 1.02) p.lv = null;
      return true;
    }
    if (p.lv.k === 'ug') {
      const i = idx(tx, ty);
      if (L.ug[i]) { L.lastU = [tx, ty]; return true; }
      // sei sulla casella fuori da un imbocco: esci se ti allontani dal monte
      const P = L.portals.find(P => P.kind === 'imbocco' && P.s[0] === tx && P.s[1] === ty);
      if (P && (dx * (P.s[0] - P.u[0]) + dy * (P.s[1] - P.u[1])) > .2) { p.lv = null; G.feed(st, 'Fuori. L\'aria fredda ti sbatte in faccia.'); }
      return true;
    }
    return false;
  }
  // quota dei piedi (per la grafica e la camera)
  function heightOf(st, o) {
    const lv = o.lv; if (!lv) return null;
    if (lv.k === 'ponte') { const B = BR.find(b => b.id === lv.id); return B ? deckH(B, onDeck(B, o.x, o.y).t) : null; }
    if (lv.k === 'ug') { const L = S(st); return floorAt(L, o.x, o.y); }
    return null;
  }
  function floorAt(L, x, y) {
    const fx = x / TS - .5, fy = y / TS - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const [tx, ty] = ti(x, y), c = L.ug[idx(tx, ty)] ? L.fl[idx(tx, ty)] : (L.lastU ? L.fl[idx(...L.lastU)] : 0);
    const f = (a, b) => inb(a, b) && L.ug[idx(a, b)] ? L.fl[idx(a, b)] : c;
    return f(x0, y0) * (1 - u) * (1 - v) + f(x0 + 1, y0) * u * (1 - v) + f(x0, y0 + 1) * (1 - u) * v + f(x0 + 1, y0 + 1) * u * v;
  }

  // ---------------- SCAVARE ----------------
  const dirOf = face => { const a = ((face % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = Math.round(a / (Math.PI / 2)) & 3; return [[1, 0], [0, 1], [-1, 0], [0, -1]][q]; };
  function material(tx, ty) { const v = G.tileAt(tx, ty), f = W.feat ? W.feat[idx(tx, ty)] : 0; if (f & 512) return 'terra'; if (HARD.has(v) || (W.MF && f & W.MF.DITA)) return 'roccia'; if (v === T.WATER) return 'acqua'; return 'terra'; }
  function tool(st, mat) { if (mat === 'roccia') return has(st, 'piccone') ? 'piccone' : null; return has(st, 'piccone') ? 'piccone' : has(st, 'pala') ? 'pala' : null; }
  const need = mat => mat === 'roccia' ? 'Ti serve un piccone: in ferramenta, alla cava, alle stazioni di estrazione.' : 'Ti serve una pala (o un piccone): in ferramenta, ai cantieri, nelle masserie.';
  function start(st, what, dur, fn) {
    const L = S(st), p = st.player; if (L.job) return 'Stai già scavando.';
    L.job = { what, until: st.clock + dur, dur, fn, x: p.x, y: p.y }; return null;
  }
  function step(st, dt) {
    const L = st.lv; if (!L) { if (st.player) S(st); return; }
    if (L.job && st.clock >= L.job.until) { const j = L.job; L.job = null; const msg = j.fn(); if (msg) G.feed(st, msg); L.rev++; if (L.auto && /^(avanti|scendi|sali)$/.test(j.what)) autoNext(st); }
    if (L.auto && !L.job && !(st.player.lv && st.player.lv.k === 'ug')) L.auto = null;
    if (L.route) routeStep(st);
    // posti da scoprire sul Monte Scuro
    if (!st.__lvT || st.clock - st.__lvT > .5) {
      st.__lvT = st.clock; const p = st.player;
      for (const q of Object.values(G.PLACES)) if (q.scoperta && !L.found[q.id] && Math.hypot(q.x - p.x, q.y - p.y) < 7 && !(p.lv && p.lv.k === 'ug' && !/romito|eremo/.test(q.id))) { L.found[q.id] = st.t; G.feed(st, `Hai scoperto: ${q.name}.`, 'good'); }
    }
  }
  // superficie: una botola dove sei
  function digHatch(st) {
    const p = st.player, L = S(st), [tx, ty] = ti(p.x, p.y), v = G.tileAt(tx, ty), i = idx(tx, ty);
    if (p.lv) return 'Qui non puoi.';
    if (portalAt(L, tx, ty, 's')) return 'Qui c\'è già un\'apertura.';
    if (!SOFT.has(v) && !HARD.has(v)) return v === T.VIA || v === T.COB || v === T.WALK || v === T.PIAZZA || v === T.QUAY ? 'Sul selciato e sull\'asfalto non si scava a mano.' : 'Qui non si scava.';
    const mat = HARD.has(v) ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const busy = start(st, 'botola', mat === 'roccia' ? 16 : 10, () => {
      L.ug[i] = 2; L.fl[i] = EL[i] - 3.2; L.kind[i] = 2; L.portals.push({ kind: 'botola', s: [tx, ty], u: [tx, ty] });
      return 'Il pozzo è profondo tre metri. Una scala, una botola coperta di neve: da fuori non si vede quasi niente.';
    });
    return busy || (mat === 'roccia' ? 'Cominci a picconare la roccia gelata…' : 'Cominci a scavare la terra gelata…');
  }
  // superficie: entrare in una parete di roccia o in un muro a secco
  function digWall(st) {
    const p = st.player, L = S(st), [tx, ty] = ti(p.x, p.y), [dx, dy] = dirOf(p.face), ux = tx + dx, uy = ty + dy;
    if (p.lv || !inb(ux, uy) || G.tileAt(ux, uy) !== T.CLIFF) return null;
    const mat = material(ux, uy), t = tool(st, mat); if (!t) return need(mat);
    if (portalAt(L, ux, uy, 'u')) return 'L\'imbocco è già aperto: entra.';
    const busy = start(st, 'imbocco', mat === 'roccia' ? 12 : 7, () => {
      const i = idx(ux, uy); L.ug[i] = 1; L.fl[i] = EL[idx(tx, ty)]; L.kind[i] = 2; L.portals.push({ kind: 'imbocco', s: [tx, ty], u: [ux, uy] });
      return 'Un buco nero nella parete, puntellato alla meglio. Si entra.';
    });
    return busy || 'Attacchi la parete…';
  }
  // sotto terra: avanti (dz: 0 in piano, -1 in discesa, +1 in salita)
  function digAhead(st, dz) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    const [tx, ty] = ti(p.x, p.y), [dx, dy] = dirOf(p.face);
    return digTile(st, tx, ty, tx + dx, ty + dy, dz);
  }
  // [sottosuolo] scavare la casella (nx, ny) accanto a (tx, ty), dove sei: allo stesso pavimento, o un gradino giù (dz -1) o su (+1)
  function digTile(st, tx, ty, nx, ny, dz) {
    const p = st.player, L = S(st), i0 = idx(tx, ty); if (!L.ug[i0]) return 'Qui non puoi.';
    if (!inb(nx, ny)) return 'Oltre non si va.';
    const j = idx(nx, ny); if (L.ug[j]) return 'Lì è già scavato.';
    const surf = G.tileAt(nx, ny), E = EL[j];
    if (surf === T.WATER) return 'L\'acqua filtra dalla terra: di qua si allaga.';
    const fl = L.fl[i0] + dz * 1.3;
    const mat = HARD.has(surf) ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const dur = (mat === 'roccia' ? 9 : 5) * (dz ? 1.25 : 1) * (t === 'piccone' && mat === 'terra' ? 1.2 : 1);
    const busy = start(st, dz < 0 ? 'scendi' : dz > 0 ? 'sali' : 'avanti', dur, () => {
      if (E - fl < 1.1 && G.walkT(nx, ny)) {
        // la terra cede: sei sbucato fuori
        L.portals.push({ kind: 'imbocco', s: [nx, ny], u: [tx, ty] }); L.rev++;
        return 'La terra cede di colpo: luce, neve, aria. Sei sbucato sul pendio.';
      }
      L.ug[j] = 1; L.fl[j] = fl; L.kind[j] = 2;
      const found = onDug(st, nx, ny, L); if (found) { if (L.auto) L.auto = null; if (L.route) L.route.pause = st.clock + 2.5; return found; }   // [sottosuolo] roba sepolta
      if (surf === T.BLD) return 'Sopra la testa, le fondamenta di una casa. Da qui «Apri una botola sopra» sbuca dentro.';
      if (E - fl < ROOF + .6) return 'Il soffitto è sottile: si sente la neve sopra.';
      return dz < 0 ? 'Scendi di un gradino nella terra.' : dz > 0 ? 'Risali di un gradino.' : 'Un altro paio di metri di cunicolo.';
    });
    return busy || (mat === 'roccia' ? 'Picconi la roccia…' : 'Scavi…');
  }
  // [sottosuolo] sotto terra: un pozzo sul posto, il pavimento scende di un metro e sessanta (si vede in sezione)
  function digDeeper(st) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    const [tx, ty] = ti(p.x, p.y), i = idx(tx, ty); if (!L.ug[i]) return 'Qui non puoi.';
    if (L.kind[i] > 2) return 'Qui il pavimento è murato: scava in un cunicolo tuo.';
    const nf = L.fl[i] - 1.6; if (EL[i] - nf > 32) return 'Più giù non si va: sale l\'acqua di falda.';
    const mat = HARD.has(G.tileAt(tx, ty)) || EL[i] - nf > 14 ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const busy = start(st, 'pozzo', mat === 'roccia' ? 11 : 7, () => {
      L.fl[i] = nf; L.kind[i] = 2; L.shafts = L.shafts || {}; L.shafts[i] = (L.shafts[i] || 0) + 1;
      const found = onDug(st, tx, ty, L);
      return found || (EL[i] - nf > 14 ? 'Più giù: la terra lascia il posto alla roccia.' : 'Scendi di un metro e mezzo. Una scaletta di pioli.');
    });
    return busy || 'Scavi giù, sotto i piedi…';
  }
  // [sottosuolo] sotto terra: in su sul posto, il pavimento sale di un metro e sessanta (si scava il soffitto e ci si arrampica)
  function digHigher(st) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    const [tx, ty] = ti(p.x, p.y), i = idx(tx, ty); if (!L.ug[i]) return 'Qui non puoi.';
    if (L.kind[i] > 2) return 'Qui il soffitto è murato: scava in un cunicolo tuo.';
    const nf = L.fl[i] + 1.6; if (EL[i] - nf < ROOF + .6) return 'Sopra c\'è solo un palmo di terra: apri una botola per uscire.';
    const mat = HARD.has(G.tileAt(tx, ty)) ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const busy = start(st, 'alza', mat === 'roccia' ? 11 : 7, () => { L.fl[i] = nf; L.kind[i] = 2; if (L.shafts && L.shafts[i]) L.shafts[i]--; return onDug(st, tx, ty, L) || 'Scavi il soffitto e ti tiri su di un metro e mezzo.'; });
    return busy || 'Scavi in su, la terra ti piove addosso…';
  }

  // [sottosuolo] SCAVARE PUNTA E CLICCA: clic su un punto sotto terra, il personaggio ci va passando dalle gallerie che ci sono
  // e scavando il resto (A* sulle caselle: scavato costa 1, terra 3, roccia 6, l'acqua non si passa). La profondità la decidi tu con J e K.
  function routeTo(L, ax, ay, bx, by) {
    const x0 = Math.min(ax, bx) - 12, x1 = Math.max(ax, bx) + 12, y0 = Math.min(ay, by) - 12, y1 = Math.max(ay, by) + 12;
    const cost = (x, y) => { if (!inb(x, y) || x < x0 || x > x1 || y < y0 || y > y1) return -1; const i = idx(x, y); if (L.ug[i]) return 1; const v = G.tileAt(x, y); if (v === T.WATER) return -1; return HARD.has(v) ? 6 : 3; };
    const open = [[ax, ay, 0, 0]], came = new Map(), gS = new Map([[idx(ax, ay), 0]]); let n = 0;
    while (open.length && n++ < 9000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][3] < open[bi][3]) bi = k;
      const [cx, cy, g] = open.splice(bi, 1)[0];
      if (cx === bx && cy === by) { const out = []; let k = idx(cx, cy); while (k !== idx(ax, ay)) { out.unshift([k % GW, Math.floor(k / GW)]); k = came.get(k); } return out; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, c = cost(nx, ny); if (c < 0) continue; const k = idx(nx, ny), ng = g + c; if (gS.has(k) && gS.get(k) <= ng) continue; gS.set(k, ng); came.set(k, idx(cx, cy)); open.push([nx, ny, ng, ng + Math.abs(bx - nx) + Math.abs(by - ny)]); }
    }
    return null;
  }
  function digTo(st, x, y) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug' || p.lv.ride !== undefined) return null;
    const [ax, ay] = ti(p.x, p.y), [bx, by] = ti(x, y); if (!L.ug[idx(ax, ay)] || !inb(bx, by)) return null;
    if (ax === bx && ay === by) return null;
    const tiles = routeTo(L, ax, ay, bx, by); if (!tiles) return { ok: false, msg: 'Di là non si arriva: acqua, o troppo lontano.' };
    const dig = tiles.filter(([tx, ty]) => !L.ug[idx(tx, ty)]).length; if (!dig) return null;   // tutto scavato: si cammina e basta
    if (dig > 70) return { ok: false, msg: 'Troppo lontano: scegli un punto più vicino.' };
    const hard = tiles.some(([tx, ty]) => !L.ug[idx(tx, ty)] && HARD.has(G.tileAt(tx, ty)));
    if (!tool(st, hard ? 'roccia' : 'terra')) return { ok: false, msg: need(hard ? 'roccia' : 'terra') };
    if (L.job) L.job = null; L.auto = null;
    L.route = { tiles, x, y, from: [ax, ay] };
    return { ok: true, msg: `Scavi verso là: ${dig} ${dig === 1 ? 'casella' : 'caselle'} di ${hard ? 'terra e roccia' : 'terra'}.` };
  }
  // dove deve andare il personaggio adesso (main.js lo usa come un clic): la prossima casella scavata, o fermo a scavare
  function routeTarget(st) {
    const p = st.player, L = S(st), R = L.route; if (!R) return null;
    if (!p.lv || p.lv.k !== 'ug') { L.route = null; return null; }
    const [tx, ty] = ti(p.x, p.y); let i = R.tiles.findIndex(t => t[0] === tx && t[1] === ty);
    if (i < 0 && !(R.from[0] === tx && R.from[1] === ty)) { const r2 = routeTo(L, tx, ty, ...R.tiles[R.tiles.length - 1]); if (!r2) { L.route = null; return null; } R.tiles = r2; R.from = [tx, ty]; i = -1; }
    const nx = R.tiles[i + 1];
    if (!nx) { if (Math.hypot(R.x - p.x, R.y - p.y) < .5) { L.route = null; return null; } return { x: R.x, y: R.y }; }
    if (L.ug[idx(nx[0], nx[1])]) return { x: cen(nx[0]), y: cen(nx[1]) };
    if (Math.hypot(p.x - cen(tx), p.y - cen(ty)) > .45) return { x: cen(tx), y: cen(ty) };   // prima al centro della casella, poi si scava
    return { wait: true, aim: Math.atan2(nx[1] - ty, nx[0] - tx), tile: nx };
  }
  const cen = t => (t + .5) * TS;
  function routeStep(st) {
    const L = S(st), R = L.route, p = st.player; if (!R || L.job || (R.pause && st.clock < R.pause)) return;
    const T0 = routeTarget(st); if (!T0 || !T0.wait) return;
    const [tx, ty] = ti(p.x, p.y); if (Math.hypot(p.x - cen(tx), p.y - cen(ty)) > .9) return;   // prima arriva bene nella casella
    p.face = T0.aim; const m = digTile(st, tx, ty, T0.tile[0], T0.tile[1], 0);
    if (!/^(Scavi|Picconi)/.test(m || '')) { L.route = null; if (m) G.feed(st, m); }
  }

  // sotto terra: allargare in una stanza (le otto caselle attorno, allo stesso livello)
  function digRoom(st) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    const [tx, ty] = ti(p.x, p.y), f = L.fl[idx(tx, ty)]; let hard = 0, todo = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = tx + dx, y = ty + dy; if (!inb(x, y) || L.ug[idx(x, y)] || G.tileAt(x, y) === T.WATER) continue; todo.push([x, y]); if (HARD.has(G.tileAt(x, y))) hard++; }
    if (!todo.length) return 'Qui è già largo.';
    const mat = hard ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const busy = start(st, 'stanza', 4 + todo.length * (hard ? 3 : 1.8), () => {
      let found = null; todo.forEach(([x, y]) => { const i = idx(x, y); if (EL[i] - f < 1.1) return; L.ug[i] = 2; L.fl[i] = f; L.kind[i] = 2; found = onDug(st, x, y, L) || found; });
      L.rooms.push({ x: (tx + .5) * TS, y: (ty + .5) * TS, f, deco: 'covo' });
      return 'Una stanza sotto terra. Ci stanno una branda, una cassa, una lampada.' + (found ? ' ' + found : '');
    });
    return busy || 'Allarghi il cunicolo…';
  }
  // sotto terra: una botola verso l'alto, dove sei
  function digUp(st) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    const [tx, ty] = ti(p.x, p.y), i = idx(tx, ty); if (portalAt(L, tx, ty, 'u')) return 'Qui un\'uscita c\'è già.';
    const E = EL[i], v = G.tileAt(tx, ty);
    if (E - L.fl[i] > 5) return 'Sopra c\'è troppa terra: cinque metri e più.';
    if (v === T.BLD) return digInto(st, tx, ty);   // [sottosuolo] sotto una casa: si sfonda il pavimento e si sbuca dentro
    if (!G.walkT(tx, ty)) return 'Sopra c\'è la roccia viva.';
    const mat = HARD.has(v) ? 'roccia' : 'terra', t = tool(st, mat); if (!t) return need(mat);
    const busy = start(st, 'su', 8 + (E - L.fl[i]) * 2, () => { L.portals.push({ kind: 'botola', s: [tx, ty], u: [tx, ty] }); return 'Sbuchi alla luce. Rimetti la botola, ci butti sopra la neve.'; });
    return busy || 'Scavi verso l\'alto, la terra ti cade in faccia…';
  }
  // [sottosuolo] sotto una casa: si sfonda il pavimento del piano terra e si sbuca dentro (portale 'interno')
  const bldOf = (tx, ty) => { const W0 = G.MAP.world, bi = W0.bIndex ? W0.bIndex[idx(tx, ty)] : -1; return bi >= 0 ? bi : null; };
  const hasInside = bi => { try { const b = G.BUILDINGS[bi]; return !!(b && b.door && G.INT && G.INT.layout(b).ent); } catch (e) { return false; } };
  function digInto(st, tx, ty) {
    const p = st.player, L = S(st), i = idx(tx, ty), bi = bldOf(tx, ty);
    if (bi === null || !hasInside(bi)) return 'Sopra c\'è un muro pieno: di qua non si sbuca.';
    if (EL[i] - L.fl[i] > 5.5) return 'Sopra c\'è troppa terra: cinque metri e più.';
    const t = tool(st, 'terra'); if (!t) return need('terra');
    const b = G.BUILDINGS[bi], nome = b.name || 'una casa';
    const busy = start(st, 'su', 10 + (EL[i] - L.fl[i]) * 2, () => {
      if (!portalAt(L, tx, ty, 'u')) L.portals.push({ kind: 'interno', s: [tx, ty], u: [tx, ty], bi, name: nome });
      p.lv = null; G.enterBuilding(st, bi);
      return `Sfondi il pavimento dal basso: sei dentro ${b.name ? b.name : 'una casa'}. Sotto il tappeto resta il buco (V per tornare giù).`;
    });
    return busy || 'Scavi verso l\'alto, contro le fondamenta…';
  }
  // [sottosuolo] da dentro una casa: una botola nel pavimento del piano terra
  function digFloor(st) {
    const p = st.player, L = S(st); if (!p.indoor || p.indoor.f !== 0) return p.indoor ? 'Si scava solo al piano terra.' : null;
    const bi = p.indoor.b, b = G.BUILDINGS[bi]; if (!b) return null;
    const ex = L.portals.find(P => P.kind === 'interno' && P.bi === bi); if (ex) return 'La botola c\'è già: V per scendere.';
    const t = tool(st, 'terra'); if (!t) return need('terra');
    // la casella dell'edificio sotto i piedi (le coordinate dentro casa sono quelle del mondo)
    let [tx, ty] = ti(p.x, p.y); tx = clamp(tx, b.x, b.x + b.w - 1); ty = clamp(ty, b.y, b.y + b.h - 1);
    const busy = start(st, 'botola', 14, () => {
      const i = idx(tx, ty); if (!L.ug[i]) { L.ug[i] = 2; L.fl[i] = EL[i] - 3.2; L.kind[i] = 2; }
      L.portals.push({ kind: 'interno', s: [tx, ty], u: [tx, ty], bi, name: b.name || 'casa' });
      return 'Alzi le mattonelle, spacchi il massetto, scavi. Una botola nel pavimento: V per scendere.';
    });
    return busy || 'Sposti il tappeto e attacchi il pavimento…';
  }
  function goDownFromInside(st) {
    const p = st.player, L = S(st); if (!p.indoor) return null;
    const P = L.portals.find(P => P.kind === 'interno' && P.bi === p.indoor.b); if (!P || p.indoor.f !== 0) return null;
    G.exitBuilding(st); p.lv = { k: 'ug' }; L.lastU = P.u; p.x = (P.u[0] + .5) * TS; p.y = (P.u[1] + .5) * TS; p.path = [];
    return P.nat ? `Scendi nella ${P.name}.` : 'Scendi dalla botola nel pavimento.';
  }
  // salire e scendere da botole, pozzi, tombini, scale e grate
  const DOWN = { botola: 'Scendi la scala. Richiudi la botola sopra la testa.', tombino: 'Sollevi il tombino e scendi i pioli. Puzza.', scala: 'Scendi le scale.', grata: 'Sposti la grata e ti cali giù.' };
  const UP = { botola: 'Risali e spingi la botola: fuori.', tombino: 'Spingi il tombino: sei in mezzo alla strada.', scala: 'Risali le scale: aria, luce.', grata: 'Spingi la grata e ti tiri su.', pozzo: 'Risali il pozzo: fuori.' };
  function climb(st) {
    const p = st.player, L = S(st), [tx, ty] = ti(p.x, p.y);
    const P = L.portals.find(P => CLIMB.has(P.kind) && (p.lv ? P.u : P.s)[0] === tx && (p.lv ? P.u : P.s)[1] === ty);
    if (!P) return null;
    if (P.kind === 'interno') {
      if (!p.lv || p.lv.k !== 'ug') return null;
      if (!hasInside(P.bi)) return 'Sopra è crollato tutto.';
      p.lv = null; G.enterBuilding(st, P.bi); return `Sali dalla botola: sei dentro ${P.name || 'la casa'}.`;
    }
    if (!p.lv) { p.lv = { k: 'ug' }; L.lastU = P.u; p.x = (P.u[0] + .5) * TS; p.y = (P.u[1] + .5) * TS; return P.nat ? `Scendi nel pozzo della ${P.name}.` : DOWN[P.kind] || DOWN.botola; }
    if (p.lv.k === 'ug') { if (!G.walkT(P.s[0], P.s[1])) return 'Sopra è bloccato.'; p.lv = null; p.x = (P.s[0] + .5) * TS; p.y = (P.s[1] + .5) * TS; if (L.auto) L.auto = null; return UP[P.kind] || UP.botola; }
    return null;
  }
  // [sottosuolo] scavare di filato: finito un tratto, un passo avanti e si riattacca (si ferma se ti muovi, se trovi qualcosa o se sbuchi)
  function autoDig(st, dz) {
    const p = st.player, L = S(st); if (!p.lv || p.lv.k !== 'ug') return 'Prima devi essere sotto terra.';
    if (L.auto) { L.auto = null; return 'Smetti di scavare di filato.'; }
    const [dx, dy] = dirOf(p.face); L.auto = { dz: dz || 0, dx, dy, n: 0 };
    const m = digAhead(st, L.auto.dz); if (/^(Scavi|Picconi)/.test(m || '')) return m + ' (di filato: Maiusc+H per smettere)';
    L.auto = null; return m;
  }
  function autoNext(st) {
    const L = S(st), A = L.auto, p = st.player; if (!A || L.job) return;
    if (!p.lv || p.lv.k !== 'ug') { L.auto = null; return; }
    const [tx, ty] = ti(p.x, p.y), nx = tx + A.dx, ny = ty + A.dy;
    if (!inb(nx, ny) || !L.ug[idx(nx, ny)]) { L.auto = null; return; }
    p.x = (nx + .5) * TS; p.y = (ny + .5) * TS; p.face = Math.atan2(A.dy, A.dx); L.lastU = [nx, ny];
    if (++A.n > 60) { L.auto = null; G.feed(st, 'Le braccia non reggono più: ti fermi.'); return; }
    const m = digAhead(st, A.dz); if (!/^(Scavi|Picconi)/.test(m || '')) { L.auto = null; if (m && !/già scavato/.test(m)) G.feed(st, m); else if (m) G.feed(st, 'Sbuchi in un passaggio già scavato.', 'good'); }
  }
  // il tasto H (scava/sali): fa la cosa giusta per dove sei
  function key(st, k, shift) {
    const p = st.player; if (p.vehicle) return null;
    if (p.indoor) { if (k === 'v') return goDownFromInside(st); if (k === 'h') return digFloor(st); return null; }   // [sottosuolo] dentro casa: la botola nel pavimento
    if (k === 'v') return climb(st) || (p.lv && p.lv.k === 'ug' ? 'Qui non c\'è una scala per salire.' : null);
    if (k === 'h' && shift && p.lv && p.lv.k === 'ug') return autoDig(st, 0);
    if (k === 'h') { if (!p.lv) return digWall(st) || digHatch(st); if (p.lv.k === 'ug') return digAhead(st, 0); return null; }
    // [sottosuolo] la profondità si fa sul posto: J giù, K su (Maiusc: il gradino in avanti, in discesa o in salita)
    if (k === 'j') return p.lv && p.lv.k === 'ug' ? (L0 => { L0.route = null; return shift ? digAhead(st, -1) : digDeeper(st); })(S(st)) : null;
    if (k === 'k') return p.lv && p.lv.k === 'ug' ? (L0 => { L0.route = null; return shift ? digAhead(st, 1) : digHigher(st); })(S(st)) : null;
    if (k === 'n') return p.lv && p.lv.k === 'ug' ? digRoom(st) : null;
    return null;
  }
  // le azioni nel menu «Qui, adesso» delle Tasche
  function actions(st) {
    const p = st.player; if (!p || p.vehicle) return [];
    const L = S(st), [tx, ty] = ti(p.x, p.y), out = [], add = (id, label, run, off) => out.push({ id, label, run, off: off || '' });
    if (p.indoor) {   // [sottosuolo]
      if (p.indoor.f !== 0) return out;
      const P = L.portals.find(P => P.kind === 'interno' && P.bi === p.indoor.b);
      if (P) add('livello', 'Scendi dalla botola nel pavimento (V)', () => goDownFromInside(st)); else add('botola', 'Scava una botola nel pavimento (H)', () => digFloor(st));
      return out;
    }
    const P = L.portals.find(P => CLIMB.has(P.kind) && P.kind !== 'interno' && P.s[0] === tx && P.s[1] === ty) || (p.lv ? L.portals.find(P => P.kind === 'interno' && P.u[0] === tx && P.u[1] === ty) : null);
    if (P) add('livello', p.lv ? (P.kind === 'interno' ? `Sali in ${P.name || 'casa'} (V)` : 'Risali (V)') : (P.nat ? 'Scendi nel pozzo (V)' : { tombino: 'Scendi nel tombino (V)', scala: 'Scendi le scale (V)', grata: 'Scendi dalla grata (V)' }[P.kind] || 'Scendi nella botola (V)'), () => climb(st));
    if (!p.lv) {
      const [dx, dy] = dirOf(p.face);
      if (G.tileAt(tx + dx, ty + dy) === T.CLIFF) add('cunicolo', 'Scava un cunicolo nella parete (H)', () => digWall(st));
      else if (!P) add('botola', 'Scava una botola qui (H)', () => digHatch(st));
    } else if (p.lv.k === 'ug') {
      add('avanti', 'Scava avanti (H) · o clicca dove vuoi arrivare', () => digAhead(st, 0)); add('giu', 'Scava giù, dove sei (J)', () => digDeeper(st)); add('su_', 'Scava su, dove sei (K)', () => digHigher(st));
      add('giu_av', 'Gradino in discesa, avanti (Maiusc+J)', () => digAhead(st, -1)); add('su_av', 'Gradino in salita, avanti (Maiusc+K)', () => digAhead(st, 1));
      add('filato', L.auto ? 'Smetti di scavare di filato' : 'Scava di filato (Maiusc+H)', () => autoDig(st, 0));
      add('stanza', 'Allarga in una stanza (N)', () => digRoom(st)); if (!P) add('botola_su', G.tileAt(tx, ty) === T.BLD ? 'Sfonda il pavimento sopra: sbuchi dentro' : 'Apri una botola sopra', () => digUp(st));
    }
    return out;
  }
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => (prev(st) || []).concat(actions(st)); }
  { const prev = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (prev) prev(st, dt); step(st, dt); }; }
  return { S, freeFn, moved, heightOf, floorAt, key, actions, step, digHatch, digWall, digAhead, digRoom, digUp, digFloor, digInto, autoDig, digDeeper, digHigher, digTile, digTo, routeTarget, routeTo, dirOf, material, climb, goDownFromInside, BR, deckH, onDeck, init, hooks, CLIMB, ROOF };
})();
if (typeof module !== 'undefined') module.exports = Livelli;
