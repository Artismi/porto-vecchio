/* ================= ANIMAZIONI: i gesti di tutti i giorni =================
   Da fermi, senza niente da fare, la gente non resta una statua: ogni tanto si gratta la testa, sbadiglia, si allaccia una
   scarpa, si sistema il colletto, si tasta le tasche, si strofina il naso, si passa una mano nei capelli, guarda lontano con
   la mano sugli occhi. E in due: la stretta di mano tra amici che si incrociano (popolo.js li ferma un attimo: greet.shake),
   la pacca sulla spalla a chi si ha accanto mentre si chiacchiera.
   Ognuno ha i suoi tempi (un numero fisso per persona sfasa tutto: non lo fanno tutti insieme); un gesto dura 2-4 s, poi
   niente per un po'. I gesti lasciano il posto a tutto il resto: lavori, lotta, attrezzi in mano, chiacchiere.
   Le pose usano il motore (animazioni.js): P.reach (il polso in un punto), P.grab (una presa vera), P.legTo, P.fingers. */
(function () {
  'use strict';
  if (typeof Anim === 'undefined' || typeof THREE === 'undefined') return;
  const clamp = Anim.clamp, smooth = Anim.smooth, hash = Anim.hashStr;
  const D = (n, spec) => Anim.def(n, Object.assign({ fade: .3 }, spec));
  // dentro il gesto: sale nel primo 20%, resta, scende nell'ultimo 25%
  const env = k => k < .2 ? smooth(k / .2) : k > .75 ? 1 - smooth((k - .75) / .25) : 1;
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  // posizione di un osso nello spazio del personaggio
  function at(P, k, out) { const b = P.R.b[k]; if (!b) return null; b.getWorldPosition(out); return P.g.worldToLocal(out); }
  // un punto del mondo ({x, y, z}: z del mondo = y del gioco) nello spazio del personaggio
  function toLocal(P, p, out) { out.set(p.x, p.y, p.z); return P.g.worldToLocal(out); }

  // ---------------- da soli ----------------
  // si gratta la testa: la destra dietro la nuca, le dita che grattano, la testa piegata
  D('gratta', { fn(P, A) {
    const e = env(A.gk || 0); if (!at(P, 'Head', _a)) return;
    P.rot('Head', .12 * e, 0, -.1 * e);
    P.reach('R', _a.x - .05, _a.y + .14, _a.z - .06, [-1, .4, -.2], e);
    P.fingers('R', .35 + .3 * Math.max(0, Math.sin(P.time * 15)), .3, e);
  } });
  // sbadiglia: la sinistra davanti alla bocca, la testa indietro, il petto che si gonfia
  D('sbadiglia', { fn(P, A) {
    const k = A.gk || 0, e = env(k), o = Math.sin(clamp(k / .8, 0, 1) * Math.PI);
    P.rot('Chest', -.12 * o, 0, 0); P.rot('Neck', -.15 * o, 0, 0); P.rot('Head', -.22 * o, 0, 0);
    if (!at(P, 'Head', _a)) return;
    P.reach('L', _a.x + .03, _a.y + .03, _a.z + .17, [1, -.7, -.1], e); P.fingers('L', .25, .2, e);   // la mano davanti alla bocca, non dentro la faccia
    P.rot('ShoulderL', 0, 0, .08 * o); P.rot('ShoulderR', 0, 0, -.08 * o);
  } });
  // si allaccia una scarpa: giù su un ginocchio, le mani sulla scarpa destra, la testa china
  D('allaccia', { base: 'Idle', fn(P, A) {
    const k = A.gk || 0, d = env(k), By = -.46 * d;
    P.body({ y: By, z: .03 * d });
    P.rot('Abdomen', .65 * d, 0, 0); P.rot('Chest', .25 * d, 0, 0); P.rot('Head', .2 * d, 0, 0);
    P.legTo('R', -.13, .05 - By, .3, 0, .4, 1, 0, .1, d);
    P.legTo('L', .13, .12 - By, -.36, 0, -.6, .4, -1.1, 0, d);
    if (!at(P, 'LowerLegR', _a)) return;
    const tug = .02 * Math.sin(P.time * 9);
    // il nodo: sul collo del piede, 25 cm sotto e davanti al ginocchio
    P.reach('R', _a.x - .05, _a.y - .3 + tug, _a.z + .12, [-.7, .2, -.2], d); P.reach('L', _a.x + .06, _a.y - .3 - tug, _a.z + .12, [.7, .2, -.2], d);
    P.fingers('R', .55, .8, d); P.fingers('L', .55, .8, d);
  } });
  // si sistema il colletto: le due mani al bavero, un tirone
  D('colletto', { fn(P, A) {
    const k = A.gk || 0, e = env(k), tug = .025 * Math.max(0, Math.sin(k * Math.PI * 3));
    if (!at(P, 'Neck', _a)) return;
    P.rot('Neck', -.08 * e, 0, 0); P.rot('Chest', -.04 * e, 0, 0);
    P.reach('R', _a.x - .09, _a.y - .1 - tug, _a.z + .12, [-.8, -.6, 0], e); P.reach('L', _a.x + .09, _a.y - .1 - tug, _a.z + .12, [.8, -.6, 0], e);
    P.fingers('R', .7, .7, e); P.fingers('L', .7, .7, e);
  } });
  // si tasta le tasche (le chiavi? il portafoglio?): una mano ai pantaloni, l'altra alla giacca, a turno; la testa giù
  D('tasche_cerca', { fn(P, A) {
    const k = A.gk || 0, e = env(k), s = Math.sin(k * Math.PI * 4);
    P.rot('Head', .3 * e, 0, 0); P.rot('Chest', .06 * e, .08 * s * e, 0);
    if (!at(P, 'Hips', _a)) return;
    P.reach('R', _a.x - .17, _a.y - .1 + .04 * s, _a.z + .06, [-.6, -.5, -.3], e);
    P.reach('L', _a.x + .12, _a.y + .32 - .04 * s, _a.z + .16, [.7, -.6, 0], e);
    P.fingers('R', .3, .3, e); P.fingers('L', .3, .3, e);
  } });
  // si strofina il naso: l'indice sotto il naso, avanti e indietro
  D('naso', { fn(P, A) {
    const k = A.gk || 0, e = env(k);
    if (!at(P, 'Head', _a)) return;
    P.rot('Head', .08 * e, -.1 * e, 0);
    P.reach('R', _a.x - .06 + .02 * Math.sin(P.time * 12), _a.y - .02, _a.z + .12, [-.8, -.6, 0], e); P.fingerEach('R', [.2, .8, .9, .9], .6, e);
  } });
  // si passa una mano nei capelli: dalla fronte alla nuca
  D('capelli', { fn(P, A) {
    const k = A.gk || 0, e = env(k), m = smooth(clamp((k - .2) / .55, 0, 1));
    if (!at(P, 'Head', _a)) return;
    P.rot('Head', -.1 * m * e, 0, 0);
    P.reach('R', _a.x - .03, _a.y + .12 + .04 * Math.sin(m * Math.PI), _a.z + .1 - .2 * m, [-1, .5, 0], e); P.fingers('R', .3, .2, e);
  } });
  // guarda lontano: la sinistra sopra gli occhi come una visiera, il mento su
  D('guarda_lontano', { fn(P, A) {
    const k = A.gk || 0, e = env(k);
    if (!at(P, 'Head', _a)) return;
    P.rot('Neck', -.06 * e, 0, 0); P.rot('Head', -.12 * e, .15 * Math.sin(k * Math.PI * 2) * e, 0);
    P.grab('L', _a.x + .01, _a.y + .13, _a.z + .17, [.2, 0, 1], [-1, .2, .3], [1, .2, -.3], e);   // il palmo in giù, le dita di traverso sulla fronte P.fingers('L', .1, .1, e);
  } });

  // ---------------- in due ----------------
  // la stretta di mano: le due destre a metà strada, il pollice in su, le dita verso l'altro; due, tre scosse
  D('stretta', { fade: .25, fn(P, A) {
    const p = A.compagno; if (!p) return;
    const k = A.gk || 0, e = env(k);
    toLocal(P, p, _a); _a.y = 0; const l = Math.hypot(_a.x, _a.z) || 1, dx = _a.x / l, dz = _a.z / l;
    const half = Math.min(.42, l / 2 - .02), shake = .035 * Math.sin(k * Math.PI * 6) * (k > .25 && k < .8 ? 1 : 0);
    P.rot('Chest', .04 * e, Math.atan2(dx, dz) * .2 * e, 0);
    P.grab('R', dx * half - dz * .04, 1.0 + shake, dz * half + dx * .04, [0, 1, 0], [dx, -.1, dz], [-.6, -1, -.2], e);
    P.fingers('R', .62, .55, e);
  } });
  // la pacca sulla spalla: la mano dal lato di chi si ha accanto, sulla sua spalla, due colpetti
  D('pacca', { fade: .25, fn(P, A) {
    const p = A.compagno; if (!p) return;
    const k = A.gk || 0, e = env(k), pat = .035 * Math.max(0, Math.sin(k * Math.PI * 5));
    toLocal(P, p, _a); const l = Math.hypot(_a.x, _a.z) || 1;
    // la spalla più vicina dell'altro: 18 cm da lui verso di noi, all'altezza delle spalle
    const dx = _a.x / l, dz = _a.z / l;
    _b.set(_a.x - dx * .12, 1.36 + pat, _a.z - dz * .12);
    // il palmo in giù sulla spalla, le dita che la scavalcano (X = Y × Z: dita verso l'altro e in giù, palmo verso terra)
    _c.set(dx, -.45, dz).normalize(); const ax = [_c.z, 0, -_c.x];   // (Y × giù)
    const sd = _a.x > 0 ? 'L' : 'R', sg = sd === 'L' ? 1 : -1;   // la mano dal suo lato (+x è la sinistra)
    P.rot('Chest', 0, -sg * .12 * e, sg * .05 * e);
    P.grab(sd, _b.x, _b.y, _b.z, ax, [_c.x, _c.y, _c.z], [sg * .7, -.6, -.1], e); P.fingers(sd, .3, .2, e);
  } });

  // ---------------- mappe ----------------
  const SOLI = ['gratta', 'sbadiglia', 'allaccia', 'colletto', 'tasche_cerca', 'naso', 'capelli', 'guarda_lontano'];
  const DUR = { gratta: 2.6, sbadiglia: 2.8, allaccia: 4.5, colletto: 2.2, tasche_cerca: 3, naso: 1.8, capelli: 2, guarda_lontano: 3.5 };
  const FREE = { tasche: 1, braccia: 1, dietro: 1, orologio: 1 };
  // un gesto ogni tanto: il tempo diviso in turni (lunghi 24-38 s, diversi per persona); in un turno su tre circa, all'inizio,
  // un gesto a caso. Restituisce [nome, avanzamento 0-1] o null.
  function turno(id, clock) {
    const ph = hash(id + ':g') * 97, per = 24 + hash(id + ':p') * 14, slot = Math.floor((clock + ph) / per);
    if (hash(id + ':' + slot) > .36) return null;
    const g = SOLI[Math.floor(hash(id + ':' + slot + 'q') * SOLI.length)], t = (clock + ph) - slot * per - 1, k = t / DUR[g];
    return k >= 0 && k < 1 ? [g, k] : null;
  }
  function soli(s, id, clock, busy, still) {
    if (!still || s.talk || busy) return;
    if (s.upper && !FREE[s.upper]) return;
    const T = turno(String(id), clock); if (!T) return;
    if (T[0] === 'allaccia') { if (s.act && s.act !== 'aspetta') return; s.act = 'allaccia'; s.upper = null; }
    else { if (s.act && s.act !== 'aspetta' && s.act !== 'appoggiato') return; s.upper = T[0]; }
    s.gk = T[1];
  }
  const NOGESTI = { combatte: 1, fugge: 1, insegue: 1, affronta: 1, perquisisce: 1 };
  Anim.npcMap((st, n, s) => {
    if (n.dead || n.stun > 0 || n.inVeh || n.jailedUntil > st.t) return;
    const clock = st.clock, a = n.action ? n.action.name : '';
    // la stretta di mano (popolo.js: greet.shake) — l'altro dev'essere lì davanti
    const G = n.greet;
    if (G && G.shake && G.until > clock && !n.hand) {
      const k = window.Game && Game.byId(st, G.who);
      if (k && Math.hypot(k.x - n.x, k.y - n.y) < 2.4) { s.upper = 'stretta'; s.act = null; s.gk = clamp(1 - (G.until - clock) / 1.9, 0, 1); s.compagno = { x: k.x, y: 0, z: k.y }; s.lookAt = { x: k.x, y: 1.55, z: k.y, ground: true }; return; }
    }
    if (NOGESTI[a] || n.panic > 0 || (n.cop && a !== 'routine') || (n.inside && !n.room)) return;
    const still = Math.abs(n.speedNow || 0) < .2;
    // in crocchio: a volte una pacca sulla spalla a chi si ha accanto (entro 95 cm: il braccio ci deve arrivare)
    if (still && !s.upper && n.pop && n.pop.spot && n.pop.spot.on && !n.hand) {
      const ph = hash(n.id + ':pc') * 61, slot = Math.floor((clock + ph) / 47);
      if (hash(n.id + ':pc' + slot) < .3) {
        const k = (clock + ph - slot * 47) / 1.8;
        if (k >= 0 && k < 1) {
          let best = null, bd = .95; for (const m of st.npcs) { if (m === n || m.dead || m.inside) continue; const d = Math.hypot(m.x - n.x, m.y - n.y); if (d < bd && d > .4) { bd = d; best = m; } }
          if (best) { s.upper = 'pacca'; s.gk = k; s.compagno = { x: best.x, y: 0, z: best.y }; s.lookAt = { x: best.x, y: 1.55, z: best.y, ground: true }; return; }
        }
      }
    }
    soli(s, n.id, clock, !!n.hand, still);
  });
  // il protagonista: dopo 8 secondi fermo senza fare niente
  const PM = { still: 0, t: 0 };
  Anim.playerMap((st, p, s) => {
    const dt = clamp(st.clock - PM.t, 0, .2); PM.t = st.clock;
    const idle = !p.vehicle && !(p.stun > 0) && Math.abs(p.speed || 0) < .1 && (!p.cur || p.cur === 'pugni') && !p.hand && !p.carrying && !(p.jz > 0);
    PM.still = idle ? PM.still + dt : 0;
    if (PM.still > 8) soli(s, 'player', st.clock, false, true);
  });
  Anim.gesti = { SOLI, turno };
})();
