/* Porto Vecchio — I Graffiti degli abitanti: cosa dipingono (solo logica, nessuna grafica).
   Un graffito è un disegno a bomboletta fatto di TRATTI, nelle coordinate del muro in metri: u lungo il muro (a destra di
   chi lo guarda), v in altezza da terra. La grafica (render.js, strumenti_inverno/bombolette1.py) li spruzza davvero
   sulla texture della facciata col pennello dello Studio, con la misura bloccata da bomboletta.
   - COSA: lo decide l'IA quando c'è (Mente, kind 'graffito': chi è, cosa prova, cosa ricorda, che stile ha → testo e
     tratti); senza IA, una scritta con l'alfabeto a tratti qui sotto e un simbolo scelto dalla persona.
   - QUANDO: chi va a dipingere (scritta notturna dei progetti, murale della creatività) ha il disegno pronto prima di
     arrivare; arrivato al muro, il graffito entra nel registro dei muri «in corso» e la grafica lo dipinge tratto dopo
     tratto per tutto il tempo che chi dipinge resta lì; da lontano compare intero. Quando il regime cancella, la
     grafica riporta la facciata com'era.
   Si aggancia dopo popolo.js (paintWall, errand) e creativita.js. */
var Graffiti = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const Po = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');
  const I = Po._;
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------- L'ALFABETO A TRATTI (stampatello da bomboletta) ----------------
  // ogni lettera: tratti di punti in una casella larga .6 e alta 1 (0,0 in basso a sinistra)
  const F = {
    A: [[[0, 0], [.3, 1], [.6, 0]], [[.12, .4], [.48, .4]]], B: [[[0, 0], [0, 1], [.42, 1], [.55, .85], [.42, .55], [0, .55]], [[.42, .55], [.6, .3], [.45, 0], [0, 0]]],
    C: [[[.6, .85], [.45, 1], [.15, 1], [0, .8], [0, .2], [.15, 0], [.45, 0], [.6, .15]]], D: [[[0, 0], [0, 1], [.35, 1], [.6, .75], [.6, .25], [.35, 0], [0, 0]]],
    E: [[[.6, 1], [0, 1], [0, 0], [.6, 0]], [[0, .52], [.45, .52]]], F: [[[.6, 1], [0, 1], [0, 0]], [[0, .52], [.45, .52]]],
    G: [[[.6, .85], [.45, 1], [.15, 1], [0, .8], [0, .2], [.15, 0], [.5, 0], [.6, .15], [.6, .45], [.3, .45]]], H: [[[0, 0], [0, 1]], [[.6, 0], [.6, 1]], [[0, .52], [.6, .52]]],
    I: [[[.3, 0], [.3, 1]], [[.1, 1], [.5, 1]], [[.1, 0], [.5, 0]]], J: [[[.6, 1], [.6, .2], [.45, 0], [.15, 0], [0, .2]]], K: [[[0, 0], [0, 1]], [[.6, 1], [0, .45], [.6, 0]]],
    L: [[[0, 1], [0, 0], [.6, 0]]], M: [[[0, 0], [0, 1], [.3, .5], [.6, 1], [.6, 0]]], N: [[[0, 0], [0, 1], [.6, 0], [.6, 1]]],
    O: [[[.15, 0], [0, .2], [0, .8], [.15, 1], [.45, 1], [.6, .8], [.6, .2], [.45, 0], [.15, 0]]], P: [[[0, 0], [0, 1], [.45, 1], [.6, .85], [.6, .6], [.45, .48], [0, .48]]],
    Q: [[[.15, 0], [0, .2], [0, .8], [.15, 1], [.45, 1], [.6, .8], [.6, .2], [.45, 0], [.15, 0]], [[.38, .22], [.65, -.08]]], R: [[[0, 0], [0, 1], [.45, 1], [.6, .85], [.6, .6], [.45, .48], [0, .48]], [[.3, .48], [.6, 0]]],
    S: [[[.6, .85], [.45, 1], [.12, 1], [0, .82], [.05, .6], [.55, .42], [.6, .18], [.45, 0], [.12, 0], [0, .15]]], T: [[[0, 1], [.6, 1]], [[.3, 1], [.3, 0]]],
    U: [[[0, 1], [0, .2], [.15, 0], [.45, 0], [.6, .2], [.6, 1]]], V: [[[0, 1], [.3, 0], [.6, 1]]], W: [[[0, 1], [.15, 0], [.3, .55], [.45, 0], [.6, 1]]],
    X: [[[0, 0], [.6, 1]], [[0, 1], [.6, 0]]], Y: [[[0, 1], [.3, .5], [.6, 1]], [[.3, .5], [.3, 0]]], Z: [[[0, 1], [.6, 1], [0, 0], [.6, 0]]],
    '0': [[[.15, 0], [0, .2], [0, .8], [.15, 1], [.45, 1], [.6, .8], [.6, .2], [.45, 0], [.15, 0]]], '1': [[[.15, .8], [.35, 1], [.35, 0]]], '2': [[[0, .8], [.15, 1], [.45, 1], [.6, .8], [0, 0], [.6, 0]]],
    '3': [[[0, 1], [.6, 1], [.3, .55], [.6, .3], [.45, 0], [0, 0]]], '4': [[[.45, 0], [.45, 1], [0, .35], [.6, .35]]], '5': [[[.6, 1], [0, 1], [0, .55], [.45, .55], [.6, .35], [.45, 0], [0, 0]]],
    '6': [[[.55, 1], [.15, .7], [0, .3], [.15, 0], [.45, 0], [.6, .25], [.45, .5], [0, .4]]], '7': [[[0, 1], [.6, 1], [.2, 0]]], '8': [[[.3, .55], [0, .8], [.3, 1], [.6, .8], [.3, .55], [0, .25], [.3, 0], [.6, .25], [.3, .55]]], '9': [[[.6, .6], [.15, .55], [0, .8], [.3, 1], [.6, .8], [.45, 0]]],
    '!': [[[.3, 1], [.3, .3]], [[.3, .08], [.3, 0]]], '?': [[[0, .8], [.15, 1], [.45, 1], [.6, .8], [.3, .45], [.3, .3]], [[.3, .08], [.3, 0]]], '-': [[[.1, .5], [.5, .5]]], '.': [[[.3, .02], [.3, 0]]], "'": [[[.3, 1], [.25, .75]]],
  };
  const DEACC = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[«»"]/g, '');
  // una scritta in tratti: una o due righe, alta h metri, centrata nella larghezza W, con un po' di mano tremolante
  function textStrokes(text, opt) {
    const o = Object.assign({ W: 2.6, h: .32, v0: 1.15, color: '#c42a22', size: .05, wobble: .015 }, opt || {});
    const words = DEACC(text).split(/\s+/).filter(Boolean), lines = []; let cur = '';
    words.forEach(w => { if ((cur + ' ' + w).trim().length * o.h * .78 > o.W && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur);
    const out = [], L = lines.slice(0, 2), lh = o.h * 1.35;
    L.forEach((ln, li) => {
      const adv = o.h * .78, w = ln.length * adv, u0 = -w / 2, v = o.v0 + (L.length - 1 - li) * lh, tilt = (rnd() - .5) * .05;
      [...ln].forEach((ch, ci) => { const g = F[ch]; if (!g) return; g.forEach(tr => out.push({ c: o.color, w: o.size, pts: tr.map(([x, y]) => { const u = u0 + ci * adv + x * o.h, vv = v + y * o.h + (u - u0) * tilt; return [u + (rnd() - .5) * o.wobble, vv + (rnd() - .5) * o.wobble]; }) })); });
    });
    return out;
  }
  // ---------------- I SIMBOLI ----------------
  const circle = (cu, cv, r, n, a0, a1) => { const p = []; for (let i = 0; i <= n; i++) { const a = (a0 || 0) + ((a1 === undefined ? Math.PI * 2 : a1) - (a0 || 0)) * i / n; p.push([cu + Math.cos(a) * r, cv + Math.sin(a) * r]); } return p; };
  const SYMB = {
    onda: c => [{ c, w: .06, pts: Array.from({ length: 25 }, (_, i) => [-.7 + i * .06, 1.9 + Math.sin(i * .55) * .12]) }],   // la Risacca
    cuore: c => [{ c, w: .05, pts: [[0, 1.75], [-.25, 2], [-.35, 2.15], [-.25, 2.3], [-.08, 2.3], [0, 2.18], [.08, 2.3], [.25, 2.3], [.35, 2.15], [.25, 2], [0, 1.75]] }],
    sole: c => [{ c, w: .05, pts: circle(0, 2.05, .2, 18) }].concat([0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return { c, w: .04, pts: [[Math.cos(a) * .28, 2.05 + Math.sin(a) * .28], [Math.cos(a) * .42, 2.05 + Math.sin(a) * .42]] }; })),
    faccia: c => [{ c, w: .05, pts: circle(0, 2.05, .26, 20) }, { c, w: .05, pts: [[-.1, 2.12], [-.09, 2.1]] }, { c, w: .05, pts: [[.1, 2.12], [.09, 2.1]] }, { c, w: .045, pts: circle(0, 2.02, .13, 8, Math.PI * 1.15, Math.PI * 1.85) }],
    asino: c => [{ c, w: .05, pts: circle(0, 2.0, .24, 20) }, { c, w: .05, pts: [[-.15, 2.2], [-.25, 2.55], [-.05, 2.24]] }, { c, w: .05, pts: [[.15, 2.2], [.25, 2.55], [.05, 2.24]] }],   // il Garante con le orecchie d'asino
    barca: c => [{ c, w: .05, pts: [[-.4, 1.95], [.4, 1.95], [.28, 1.8], [-.28, 1.8], [-.4, 1.95]] }, { c, w: .04, pts: [[0, 1.95], [0, 2.4], [.25, 2.0], [0, 2.0]] }],
    stella: c => [{ c, w: .05, pts: [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 2 + k * Math.PI * 4 / 5; return [Math.cos(a) * .28, 2.05 + Math.sin(a) * .28]; }) }],
  };
  const COLORS = { 'scritte enormi in rosso': ['#c42a22', '#e03a2a'], 'caricature': ['#1e1e24', '#2a2a30'], 'simboli più che parole': ['#2a6ac8', '#1e1e24'], 'stencil precisi': ['#1e1e24', '#e8e0d0'], 'lettere tonde e colorate': ['#e8a020', '#3a9a5a', '#c84a9a'], 'murale a colori': ['#c8402a', '#2a6ac8', '#e8c040', '#3a9a5a'] };
  function symbolFor(n, kind) {
    if (n.ris && n.ris.ideo > .6) return kind === 'satira' ? 'asino' : 'onda';
    const P = n.pop || {}, W = P.intW || {};
    if (W.mare > .5 || /pescator/.test((P.job && P.job.title) || '')) return 'barca';
    if (kind === 'arte') return pick(['sole', 'stella', 'cuore', 'faccia']);
    return pick(['cuore', 'stella', 'faccia']);
  }
  // il disegno senza IA: la scritta (se c'è) e un simbolo sopra
  function local(st, n, sk) {
    const style = sk.style || 'lettere tonde e colorate', cols = COLORS[style] || COLORS['lettere tonde e colorate'], col = pick(cols);
    const text = (sk.kind === 'arte' ? (sk.title || '') : sk.text || '').replace(/^il |^l'|^un /i, '').slice(0, 30);
    const out = text ? textStrokes(text, { color: col, h: style === 'scritte enormi in rosso' ? .38 : .28, W: 2.6 }) : [];
    const sym = SYMB[symbolFor(n, sk.kind)]; if (sym) out.push(...sym(pick(cols)));
    return { strokes: out, text, by: 'locale' };
  }

  // ---------------- L'IA: cosa dipingere ----------------
  // la richiesta parte quando la persona decide di andare a dipingere; quando arriva, sostituisce il disegno locale
  function ask(st, n, sk, done) {
    const M = typeof Mente !== 'undefined' ? Mente : null; if (!M || !M.call || (M.state && M.state.lastError && !M.state.connected)) return false;   // senza IA resta il disegno locale
    const P = n.pop || {}, mem = (P.lunga || []).concat(P.diary || []).filter(e => e.w > .4).slice(-5).map(e => e.text);
    const scena = { chi: `${n.name}, ${P.age} anni, ${n.role}`, stile: sk.style, tipo: sk.kind, idea: sk.text || sk.title || '', umore: { rabbia: P.need && P.need.rabbia, paura: P.need && P.need.paura }, odio_regime: n.ris ? n.ris.ideo : 0, ricordi: mem, interessi: (P.ints || []).map(i => i.k), muro: { larghezza: 3, altezza: 2.6 } };
    M.call({ kind: 'graffito', scena }).then(r => {
      const d = r && (r.data || r); if (!d) return;
      const strokes = [];
      if (d.testo) strokes.push(...textStrokes(String(d.testo).slice(0, 40), { color: d.colore_testo || '#c42a22', h: clamp(+d.altezza_lettere || .3, .15, .45) }));
      (Array.isArray(d.tratti) ? d.tratti : []).slice(0, 40).forEach(t => { const pts = (t.punti || t.pts || []).slice(0, 60).map(q => [clamp(+q[0] || 0, -1.5, 1.5), clamp(+q[1] || 0, .3, 2.6)]); if (pts.length > 1) strokes.push({ c: /^#[0-9a-f]{6}$/i.test(t.colore || '') ? t.colore : '#1e1e24', w: clamp(+t.spessore || .05, .025, .1), pts }); });
      if (strokes.length) done({ strokes, text: d.testo || '', by: 'ia', desc: d.descrizione || '' });
    }).catch(() => { });
    return true;
  }
  // chi va a dipingere: il disegno è pronto prima di arrivare (locale subito, quello dell'IA se arriva in tempo)
  function prepare(st, n, sk) {
    const d = local(st, n, sk); n.__draft = d;
    ask(st, n, sk, r => { if (n.__draft === d) n.__draft = r; });
    return d;
  }

  // ---------------- IL MURO IN CORSO ----------------
  // arrivato al muro, il graffito entra nel registro (in corso, con l'ora d'inizio e quanto dura): la grafica lo dipinge
  // tratto dopo tratto; alla fine popolo.js (paintWall) lo completa con testo, stile ed evento
  const PAINT_KINDS = { passo: 1, murale: 1 };
  function tick(st) {
    st.npcs.forEach(n => {
      const P = n.pop, E = P && P.errand; if (!E || !PAINT_KINDS[E.kind] || E.__wall) return;
      const sk = E.kind === 'murale' ? { kind: 'arte', style: 'murale a colori', title: E.data && E.data.title, text: E.data && E.data.lines && E.data.lines[0] } : { kind: 'scritta', style: I.artStyle ? I.artStyle(n) : '', text: (I.sketchFor ? I.sketchFor(st, n).text : '') };
      if (!n.__draft) prepare(st, n, sk);   // appena parte: così l'IA ha il tempo di rispondere
      if (!E.arrived) return;
      const d = n.__draft;
      // il muro è quello scelto partendo (E.spot: davanti al muro, girato verso il muro), non dove la persona si è fermata
      const sp = E.spot || P.spot || { x: n.x, y: n.y, face: n.face }, face = sp.face, x = sp.x, y = sp.y, near = !!(P.near && !n.inside);
      // vicino al giocatore la vernice comincia quando è davvero al muro (stance), lontano il graffito si fa e basta
      const w = { pk: I.tkey(E.tgt), place: E.tgt.label, t: st.t, by: n.id, text: d.text, kind: sk.kind, style: sk.style, strokes: d.strokes, wx: x + Math.cos(face) * .37, wy: y + Math.sin(face) * .37, wface: face, live: { c0: near ? null : st.clock, dur: E.secs || 20, near }, pending: true, ai: d.by === 'ia' };
      st.pop.walls.push(w); if (st.pop.walls.length > 40) st.pop.walls.shift();
      E.__wall = w; w.__E = E; n.__wallDraft = w; n.__draft = null;
    });
    // chi è stato chiamato altrove lascia il graffito a metà: resta com'è, non si finisce da solo
    st.pop.walls.forEach(w => {
      if (!w.pending || !w.__E) return; const n = G.byId(st, w.by);
      if (n && !n.dead && n.pop && n.pop.errand === w.__E) return;
      w.pending = false; w.partial = w.live.c0 == null ? 0 : Math.max(.05, Math.min(1, (st.clock - w.live.c0) / Math.max(1, w.live.dur))); w.live.done = true; w.__E = null;
      if (!w.partial) { const i = st.pop.walls.indexOf(w); if (i >= 0) st.pop.walls.splice(i, 1); }   // non aveva ancora cominciato
      if (n && n.__wallDraft === w) n.__wallDraft = null;
    });
  }
  // chi parte per dipingere prepara il disegno (così l'IA ha il tempo di rispondere)
  const e0 = I.errand;
  I.errand = function (st, n, e) { const ok = e0.apply(this, arguments); if (ok && e && PAINT_KINDS[e.kind]) { try { prepare(st, n, e.kind === 'murale' ? { kind: 'arte', style: 'murale a colori', title: e.data && e.data.title, text: e.data && e.data.lines && e.data.lines[0] } : { kind: 'scritta', style: I.artStyle(n), text: I.sketchFor(st, n).text }); } catch (x) { } } return ok; };
  // chi spruzza sta a mezzo metro dal muro (la grafica dice dov'è davvero: w.__wallD) e si sposta di lato con la scritta
  // (w.__tipU: dove sta andando la vernice), girato verso il muro
  function stance(st, dt) {
    st.npcs.forEach(n => {
      const w = n.__wallDraft; if (!w || !w.pending || !w.live || w.live.done || !w.live.near || n.dead || n.inside) return;
      const E = n.pop && n.pop.errand; if (!E || E !== w.__E) return;
      const f = w.wface, cf = Math.cos(f), sf = Math.sin(f), u = w.live.c0 == null ? 0 : clamp(w.__tipU || 0, -1.3, 1.3) * .75, back = (w.__wallD == null ? -.1 : w.__wallD) - .5;
      const tx = w.wx + cf * back - sf * u, ty = w.wy + sf * back + cf * u, d = Math.hypot(tx - n.x, ty - n.y);
      if (n.path) n.path.length = 0;
      if (d > .12) {   // ci va a piedi (con la camminata), poi si gira verso il muro
        const sp = Math.min(d / dt, w.live.c0 == null ? 1.15 : .6), a = Math.atan2(ty - n.y, tx - n.x), nx = n.x + Math.cos(a) * sp * dt, ny = n.y + Math.sin(a) * sp * dt;
        if (!G.walkM || G.walkM(nx, ny) || d < .6) { n.x = nx; n.y = ny; } else { n.x = tx; n.y = ty; }
        n.speedNow = sp; n.face += Math.atan2(Math.sin((d > .5 ? a : f) - n.face), Math.cos((d > .5 ? a : f) - n.face)) * Math.min(1, dt * 6); return;
      }
      n.face += Math.atan2(Math.sin(f - n.face), Math.cos(f - n.face)) * Math.min(1, dt * 6); n.speedNow = 0;
      if (w.live.c0 == null && Math.abs(Math.atan2(Math.sin(f - n.face), Math.cos(f - n.face))) < .25) { w.live.c0 = st.clock; if (E.arrived) E.arrived.clock = st.clock; }   // al muro e girato: comincia (e il tempo della commissione parte da qui)
    });
  }
  const s0 = G.HOOKS.step;
  G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); if (!st.pop) return; stance(st, dt); if (st.clock > (st.__grT || 0)) { st.__grT = st.clock + .3; tick(st); } };
  return { textStrokes, local, prepare, SYMB, F };
})();
if (typeof module !== 'undefined') module.exports = Graffiti;
