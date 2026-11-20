/* [unico] unico_parti_vivo.js: LE COSE COSTRUITE FUNZIONANO (progetto: commedia/MONDO_PIENO.md §8). Dietro ?commedia.
   Sopra unico_parti.js (le parti, le misure) e unico_costruire.js (i cantieri, i verbi): qui le strutture hanno un CORPO e un USO, con
   una fisica finta, deterministica e da telefono (niente motore fisico: scatole in pianta, archi di parabola, quote):
   - I CORPI: ogni parte posata è un rettangolo in pianta con la sua quota (da UP.pianta). Le persone (il giocatore, gli NPC) ne vengono
     spinte fuori; i mezzi ci sbattono (si fermano, la scossa, l'onomatopea), tranne chi è in aria più alto della parte.
   - LA RAMPA: chi ci entra dal capo basso col mezzo, nel verso della salita e abbastanza forte, sale lungo il piano (la quota dalla misura)
     e dal bordo vola: la parabola parte con la velocità lungo la salita × sin(pendenza). Il giocatore in auto usa il salto del gioco
     (p.jz, p.jvz: jumpStep fa il volo e l'atterraggio); un'auto degli NPC (il salto della rampa, quando il gruppo la usa) la porta qui un
     autista finto: rincorsa, rampa, volo, atterraggio comico (due rimbalzi, «SBAM!»), frenata. Troppo ripida (> 28°): atterra di muso,
     «SBRANG!», il fatto «schianto». La rampa che regge meno del mezzo (la portata misurata) crolla sotto le ruote: «CRAC!», il fatto «crollo».
   - LA CATAPULTA: la leva scatta (si vede girare sul perno), il carico (il copertone) parte a 45° con la velocità della misura e cade
     dove dice la parabola, rimbalza una volta («TONF!»), resta a terra un po'. Con la leva corta tira all'indietro, addosso a chi la carica.
   - IL CARRETTO: si spinge (chi ci sbatte contro gli dà una spinta lungo le ruote, chi lo usa lo spinge), rotola con l'attrito, va giù
     per la discesa, si ferma contro le case, i mezzi e le altre cose («TUMP»).
   - LA ZATTERA galleggia (dondola sul pelo dell'acqua, pescando quanto dice il galleggiamento); con troppo peso affonda.
   - LA TORRE (e il palco, il ponte): chi ci sale è un carico: se la portata o la stabilità misurate non bastano, crolla (le parti cadono
     a terra, distese e senza compenetrarsi: le macerie sono dati anche loro).
   - IL DISEGNO: un gruppo per cantiere, la geometria unita per materiale (pochi draw call), i modelli e i materiali di Arredo3D dove ci
     sono (il bancale, la cassa, il fusto, il copertone), le altre parti fatte qui con poche facce; la leva della catapulta, il carretto e
     la zattera in un gruppo che si muove senza rifare la geometria; le onomatopee (TOC, SDENG, SBAM, TONF, CRAC) come fumetti nel mondo.
   Lo stato che resta (crollo, macerie, carico, posizione del carretto) è in C.stato, dati; il volo e i proiettili sono di passaggio. */
var UnicoPartiVivo = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q);
  const UV = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UV;
  if (!ON) return UV;
  const G = typeof Game !== 'undefined' ? Game : null;
  const UP = typeof UnicoParti !== 'undefined' && UnicoParti.ON ? UnicoParti : null;
  const UC = typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null;
  if (!G || !UP || !UC || !G.HOOKS) { UV.ON = false; return UV; }
  const PARTI = UP.PARTI, hyp = Math.hypot, PI = Math.PI, cl = (x, a, b) => Math.max(a, Math.min(b, x)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const D2R = PI / 180, GRAV = 9.8;
  const stats = UV.stats = { urti: 0, salti: 0, schianti: 0, lanci: 0, crolli: 0, spinte: 0, dette: 0 };
  // il passaggio (non si salva): i salti in corso, i proiettili, le onomatopee
  const T = st => st.__uv || (st.__uv = { salti: [], proj: [], eventi: [], dette: [], vola: null, cache: {} });
  UV.T = T;
  const aperti = st => ((st.u && st.u.costruire && st.u.costruire.cantieri) || []).filter(C => !C.chiuso && C.pezzi.length);
  const pezziVivi = C => (C.stato && C.stato.macerie ? C.stato.macerie.map((p, i) => [p, i]) : C.pezzi.map(([i]) => [C.piano[i], i]));
  // un'onomatopea nel mondo (il disegno la fa vedere vicino al giocatore)
  function boom(st, x, y, z, testo, col) { const E = T(st).eventi; E.push({ x, y, z: z || 1, testo, col: col || '#F2C230', t: st.clock || 0 }); if (E.length > 24) E.shift(); }
  UV.boom = boom;
  // una battuta di chi guida (chi è al volante del traffico non è un abitante: niente n.bark). Il fumetto normale della pagina (.bub, lo
  // stesso degli abitanti, col «chi» sopra), sopra l'auto e con l'auto; il testo passa dal correttore di Lingua. Le onomatopee restano
  // per gli urti e i crolli; il clacson non si scrive.
  function dice(st, v, testo, dur, chi) {
    const L = T(st).dette; if (!v || !testo) return;
    if (typeof Lingua !== 'undefined' && Lingua.ON && Lingua.concorda) try { testo = Lingua.concorda(testo, st, { frase: true, fonte: 'fumetto' }); } catch (e) { }
    for (let i = L.length - 1; i >= 0; i--) if (L[i].vid === v.id) L.splice(i, 1);
    L.push({ vid: v.id, x: v.x, y: v.y, testo, chi: chi || 'Automobilista', t: st.clock || 0, fino: (st.clock || 0) + (dur || 3) }); if (L.length > 6) L.shift(); stats.dette++;
  }
  UV.dice = dice;

  // ======================= I CORPI: i rettangoli in pianta =======================
  function corpi(st, C) {
    const K = T(st).cache, key = C.id + '|' + C.pezzi.length + '|' + C.x + ',' + C.y + ',' + C.a + '|' + (C.stato && C.stato.macerie ? 'm' : '') + (C.stato && C.stato.affonda ? 'a' : '');
    if (K[C.id] && K[C.id].key === key) return K[C.id];
    const ca = Math.cos(C.a), sa = Math.sin(C.a), L = [], deck = new Set((!C.stato || !C.stato.macerie) && C.misure && C.misure.rampa && C.tipo === 'rampa' ? C.misure.rampa.parti || [] : []);
    let R = 0;
    const rampa = C.tipo === 'rampa' && !(C.stato && C.stato.macerie);
    for (const [p, i] of pezziVivi(C)) {
      const k = p[0]; if (PARTI[k].decoro || k === 'corda') continue;
      const P = UP.pianta(p), cx = C.x + ca * P.cx - sa * P.cy, cy = C.y + sa * P.cx + ca * P.cy, a = C.a + Math.atan2(P.uy, P.ux);
      L.push({ cx, cz: cy, a, hu: P.hu, hv: P.hv, z0: P.z0, z1: P.z1, k, i, rampa, siede: PARTI[k].siede }); R = Math.max(R, hyp(cx - C.x, cy - C.y) + Math.hypot(P.hu, P.hv));
    }
    return (K[C.id] = { key, L, R: R + 1 });
  }
  UV.corpi = corpi;
  // SAT 2D con l'asse: { d, ux, uy } (da A verso B), 0 se separati
  function sat(A, B) {
    const ax = [[Math.cos(A.a), Math.sin(A.a)], [-Math.sin(A.a), Math.cos(A.a)], [Math.cos(B.a), Math.sin(B.a)], [-Math.sin(B.a), Math.cos(B.a)]];
    const ext = (R, u) => R.hu * Math.abs(Math.cos(R.a) * u[0] + Math.sin(R.a) * u[1]) + R.hv * Math.abs(-Math.sin(R.a) * u[0] + Math.cos(R.a) * u[1]);
    let best = null; const dx = B.cx - A.cx, dy = B.cz - A.cz;
    for (const u of ax) { const s = dx * u[0] + dy * u[1], o = ext(A, u) + ext(B, u) - Math.abs(s); if (o <= 0) return null; if (!best || o < best.d) best = { d: o, ux: u[0] * (s >= 0 ? 1 : -1), uy: u[1] * (s >= 0 ? 1 : -1) }; }
    return best;
  }
  UV.sat = sat;
  // una persona (un punto con raggio r) fuori dai corpi bassi (dove sbatte la gamba: da 0,25 a 1,6 m)
  function fuoriPersona(st, o, r, C, B) {
    if (Math.abs(o.x - C.x) > B.R + 1 || Math.abs(o.y - C.y) > B.R + 1) return false; let mosso = false;
    for (let giro = 0; giro < 3; giro++) { let qui = false; for (const b of B.L) {
      if (b.z0 > 1.6 || b.z1 < .25 || b.siede) continue;   // [presidio] sulla sedia ci si siede
      const dx = o.x - b.cx, dy = o.y - b.cz, c = Math.cos(b.a), s = Math.sin(b.a), u = dx * c + dy * s, v = -dx * s + dy * c, pu = b.hu + r - Math.abs(u), pv = b.hv + r - Math.abs(v);
      if (pu <= 0 || pv <= 0) continue;
      if (C.tipo === 'carretto' && !(C.stato && C.stato.macerie)) { const L = hyp(dx, dy) || 1; spingiCarretto(st, C, -dx / L, -dy / L, .35); }
      if (pu < pv) { const k = Math.sign(u) || 1; o.x += c * k * pu; o.y += s * k * pu; } else { const k = Math.sign(v) || 1; o.x += -s * k * pv; o.y += c * k * pv; }
      mosso = qui = true;
    } if (!qui) break; }
    // ancora dentro (in mezzo a più parti affiancate): fuori lungo la retta dal centro del cantiere
    const den = (x, y) => B.L.some(b => { if (b.z0 > 1.6 || b.z1 < .25 || b.siede) return false; const dx = x - b.cx, dy = y - b.cz, c = Math.cos(b.a), s = Math.sin(b.a); return Math.abs(dx * c + dy * s) < b.hu + r && Math.abs(-dx * s + dy * c) < b.hv + r; });
    if (mosso && den(o.x, o.y)) { let ux = o.x - C.x, uy = o.y - C.y; const L = hyp(ux, uy) || 1; ux /= L; uy /= L; if (L < 1e-3) { ux = 1; uy = 0; } for (let k = 1; k <= 24; k++) { const x = o.x + ux * k * .25, y = o.y + uy * k * .25; if (!den(x, y)) { o.x = x; o.y = y; break; } } }
    return mosso;
  }
  // un mezzo contro i corpi: si ferma e torna fuori; chi è in aria più alto della parte ci passa sopra; sulla rampa ci sale
  function fuoriMezzo(st, v, C, B) {
    if (v.hidden || (v.guida === 'parti')) return;
    const K = (G.VK || {})[v.kind] || {}; if (K.boat) return;
    if (Math.abs(v.x - C.x) > B.R + 4 || Math.abs(v.y - C.y) > B.R + 4) return;
    const A = { cx: v.x, cz: v.y, a: v.ang || 0, hu: (K.len || 4) / 2, hv: (K.wid || 1.8) / 2 }, jz = v.jz || 0;
    const vola = T(st).vola; if (vola && vola.vid === v.id && vola.C === C.id) return;   // sulla rampa: la guida la rampa
    for (const b of B.L) {
      if (b.z0 > 1.3 || jz > b.z1 - .02) continue;
      const S = sat(A, b); if (!S) continue;
      if (C.tipo === 'carretto' && !(C.stato && C.stato.macerie)) { spingiCarretto(st, C, S.ux, S.uy, hyp(v.vx || 0, v.vy || 0) * .8 + .5); }
      v.x -= S.ux * S.d; v.y -= S.uy * S.d; A.cx = v.x; A.cz = v.y;
      const vn = (v.vx || 0) * S.ux + (v.vy || 0) * S.uy;
      if (vn > 0) { v.vx -= S.ux * vn * 1.25; v.vy -= S.uy * vn * 1.25; v.speed = (v.vx || 0) * Math.cos(v.ang) + (v.vy || 0) * Math.sin(v.ang); if (v._spd !== undefined) v._spd = v.speed;
        if (G.propHit) G.propHit(st, v.id, .8); if (vn > 3.5 && st.clock - (C.stato.urtoT || -9) > 1.2) { C.stato.urtoT = r1(st.clock); stats.urti++; boom(st, v.x + S.ux * 1.5, v.y + S.uy * 1.5, 1.2, vn > 8 ? 'SBONK!' : 'TUNK!', '#F2E7CF'); } }
    }
  }

  // ======================= LA RAMPA: salire, volare, atterrare =======================
  // la rampa nel mondo: origine, versore della salita, la fascia di traverso, la pendenza
  function rampaDi(C) {
    const R = C.misure && C.misure.rampa; if (C.tipo !== 'rampa' || !R || C.fine === null || (C.stato && C.stato.macerie)) return null;
    const ca = Math.cos(C.a), sa = Math.sin(C.a), ux = ca * R.u[0] - sa * R.u[1], uy = sa * R.u[0] + ca * R.u[1];
    return { C, R, ux, uy, wx: -uy, wy: ux, tan: Math.tan(R.ang * D2R), s0: R.s0, s1: R.s1, q0: R.q0, q1: R.q1, h: R.h, ang: R.ang };
  }
  UV.rampaDi = rampaDi;
  const loc = (Rm, x, y) => { const dx = x - Rm.C.x, dy = y - Rm.C.y; return { s: dx * Rm.ux + dy * Rm.uy, q: dx * Rm.wx + dy * Rm.wy }; };
  // il giocatore in auto sulla rampa: la quota del piano mentre sale, il salto dal bordo
  function rampaGiocatore(st, dt) {
    const p = st.player, U = T(st); if (!p || !p.vehicle) { U.vola = null; return; }
    const v = st.vehicles.find(k => k.id === p.vehicle); if (!v || (G.VK[v.kind] || {}).boat) { U.vola = null; return; }
    const sp = (v.vx || 0) * Math.cos(v.ang) + (v.vy || 0) * Math.sin(v.ang);
    if (U.vola && U.vola.vid === v.id) {
      const Rm = rampaDi(UC.S(st).cantieri.find(C => C.id === U.vola.C) || {}); if (!Rm) { U.vola = null; return; }
      const L = loc(Rm, v.x, v.y), vu = (v.vx || 0) * Rm.ux + (v.vy || 0) * Rm.uy;
      if (U.vola.fase === 'sale') {
        if (L.q < Rm.q0 - .2 || L.q > Rm.q1 + .2 || vu < .5) { U.vola.fase = 'giu'; return; }   // cade di lato, o si ferma: giù
        if (L.s >= Rm.s1) { p.jz = Math.max(p.jz || 0, Rm.h); p.jvz = vu * Math.sin(Rm.ang * D2R) * 1.05; U.vola.fase = 'vola'; U.vola.v0 = r1(vu); stats.salti++; boom(st, v.x, v.y, Rm.h + 1, 'VRUUM!', '#F2C230'); return; }
        const z = Math.max(0, (L.s - Rm.s0) * Rm.tan) + .02; if ((p.jz || 0) < z) { p.jz = z; p.jvz = 0; }
        if ((Rm.R.portata || 0) < ((G.VK[v.kind] || {}).m || 900) && L.s > (Rm.s0 + Rm.s1) / 2) crolla(st, Rm.C, 'il mezzo', v.x, v.y);
        return;
      }
      if (U.vola.fase === 'vola' && !(p.jz > 0)) { atterra(st, v, Rm, U.vola.v0, p.landV || 0); U.vola = null; }
      else if (U.vola.fase === 'giu' && !(p.jz > 0)) U.vola = null;
      return;
    }
    if (sp < 2.5 || (p.jz || 0) > .3) return;
    for (const C of aperti(st)) { const Rm = rampaDi(C); if (!Rm || Math.abs(v.x - C.x) > 12 || Math.abs(v.y - C.y) > 12) continue;
      const L = loc(Rm, v.x, v.y), vu = (v.vx || 0) * Rm.ux + (v.vy || 0) * Rm.uy;
      if (L.s > Rm.s0 - .6 && L.s < Rm.s0 + 1.2 && L.q > Rm.q0 + .1 && L.q < Rm.q1 - .1 && vu > 2.5) { U.vola = { vid: v.id, C: C.id, fase: 'sale' }; return; } }
  }
  // l'atterraggio: comico se va bene (rimbalzi, SBAM), schianto se la rampa era troppo ripida o il volo troppo duro
  function atterra(st, v, Rm, v0, vz) {
    const C = Rm.C, d = r1(hyp(v.x - (C.x + Rm.ux * Rm.s1), v.y - (C.y + Rm.uy * Rm.s1)));
    if (Rm.ang > 28 || vz > 10) {
      stats.schianti++; boom(st, v.x, v.y, 1.2, 'SBRANG!', '#E2553A'); if (G.damageVehicle) G.damageVehicle(st, v, 30, null, 30);
      v.w = (v.w || 0) + (UP.hashS(v.id + st.clock) - .5) * 6; if (st.fx) st.fx.push({ k: 'hitpuff', x: v.x, y: v.y });
      UC.scrivi(st, 'schianto', C, { m: d, ang: Math.round(Rm.ang) }); C.stato.salti = (C.stato.salti || 0) + 1; return 'schianto';
    }
    boom(st, v.x, v.y, 1, 'SBAM!', '#F2C230'); if (st.fx) st.fx.push({ k: 'hitpuff', x: v.x, y: v.y });
    UC.scrivi(st, 'salto', C, { m: d, ang: Math.round(Rm.ang) }); C.stato.salti = (C.stato.salti || 0) + 1; C.stato.record = Math.max(C.stato.record || 0, d); return 'salto';
  }
  // IL SALTO DEGLI NPC: un'auto parcheggiata vicina, un autista finto. o.prendi: la porta lì subito (la tappa delle foto)
  function salta(st, C, o) {
    o = o || {}; const Rm = rampaDi(C); if (!Rm) return null; const U = T(st); if (U.salti.some(s => s.C === C.id)) return null;
    const ok = v => !v.hidden && !v.rider && !v.wreck && !v.police && !v.traffic && !v.burning && !(G.VK[v.kind] || {}).boat && !(G.VK[v.kind] || {}).pocket && v.id !== (st.player && st.player.vehicle) && !v.guida && !v.driveTo;
    // un'auto che la rampa regge (la portata misurata), se c'è; se no un'altra qualunque (e la rampa crollerà sotto le ruote)
    const porta = Rm.R.portata || 0, mDi = v => (G.VK[v.kind] || {}).m || 900; let best = null, bd = Infinity, R0 = o.prendi ? 400 : 60;
    for (const v of st.vehicles) { if (!ok(v)) continue; const d = hyp(v.x - C.x, v.y - C.y); if (d > R0 || (o.kind && v.kind !== o.kind)) continue; const sc = d + (mDi(v) > porta ? 1000 : 0); if (sc < bd) { bd = sc; best = v; } }
    if (!best) return null;
    const corsa = o.corsa || 10, x0 = C.x + Rm.ux * (Rm.s0 - corsa) + Rm.wx * (Rm.q0 + Rm.q1) / 2, y0 = C.y + Rm.uy * (Rm.s0 - corsa) + Rm.wy * (Rm.q0 + Rm.q1) / 2;
    const S = { vid: best.id, C: C.id, fase: o.prendi ? 'rincorsa' : 'avvicina', t: 0, sp: 0, x0, y0, a: Math.atan2(Rm.uy, Rm.ux), z: 0, vz: 0, rimb: 0 };
    if (o.prendi) { best.x = x0; best.y = y0; best.ang = S.a; }
    else { // ci arriva dritto, se la strada è libera (le caselle a piedi, niente case)
      const L = hyp(x0 - best.x, y0 - best.y); for (let k = 1; k < L; k += 1) { const x = best.x + (x0 - best.x) * k / L, y = best.y + (y0 - best.y) * k / L; if (G.walkM && !G.walkM(x, y)) return null; } }
    best.guida = 'parti'; best.rider = 'npc'; best.vx = best.vy = 0; best.speed = 0; best.jz = 0; best.jvz = 0; U.salti.push(S); return S;
  }
  UV.salta = salta;
  function passoSalti(st, dt) {
    const U = T(st);
    for (let i = U.salti.length - 1; i >= 0; i--) {
      const S = U.salti[i], v = st.vehicles.find(k => k.id === S.vid), C = UC.S(st).cantieri.find(x => x.id === S.C), Rm = C && rampaDi(C);
      const fine = () => { if (v) { v.guida = null; v.rider = null; v.vx = v.vy = 0; v.speed = 0; v.jz = 0; v.jvz = 0; } U.salti.splice(i, 1); };
      if (!v || !C || (!Rm && S.fase !== 'frena' && S.fase !== 'atterra')) { if (v && C && C.stato.macerie) { v.jz = Math.max(0, (v.jz || 0) - dt * 4); if (v.jz > 0) continue; } fine(); continue; }
      S.t += dt; const fx = Math.cos(S.a), fy = Math.sin(S.a);
      if (S.fase === 'avvicina') {
        const dx = S.x0 - v.x, dy = S.y0 - v.y, d = hyp(dx, dy); if (d < .4) { v.x = S.x0; v.y = S.y0; S.fase = 'gira'; continue; }
        const a = Math.atan2(dy, dx); v.ang += cl(((a - v.ang + PI * 3) % (PI * 2)) - PI, -dt * 2, dt * 2); const st2 = Math.min(d, 5 * dt); v.x += Math.cos(v.ang) * st2; v.y += Math.sin(v.ang) * st2; v.speed = 5; continue;
      }
      if (S.fase === 'gira') { const da = ((S.a - v.ang + PI * 3) % (PI * 2)) - PI; v.ang += cl(da, -dt * 1.5, dt * 1.5); v.speed = 0; if (Math.abs(da) < .02) { v.ang = S.a; S.fase = 'rincorsa'; } continue; }
      if (S.fase === 'rincorsa' || S.fase === 'sale') {
        S.sp = Math.min(10.5, S.sp + 6 * dt); /* ~38 km/h: il volo sta nei 13 m liberi dopo il bordo */ v.x += fx * S.sp * dt; v.y += fy * S.sp * dt; v.speed = S.sp; v.vx = fx * S.sp; v.vy = fy * S.sp;
        const L = loc(Rm, v.x, v.y);
        if (L.s >= Rm.s0) { S.fase = 'sale'; v.jz = Math.max(0, (L.s - Rm.s0) * Rm.tan) + .02; v.jvz = S.sp * Math.sin(Rm.ang * D2R);
          if ((Rm.R.portata || 0) < ((G.VK[v.kind] || {}).m || 900) && L.s > (Rm.s0 + Rm.s1) / 2) { crolla(st, C, 'l\'auto', v.x, v.y); S.fase = 'frena'; S.vz = 0; continue; } }
        if (L.s >= Rm.s1) { S.fase = 'vola'; S.z = Rm.h; S.vz = S.sp * Math.sin(Rm.ang * D2R) * 1.05; S.vh = S.sp * Math.cos(Rm.ang * D2R); stats.salti++; boom(st, v.x, v.y, Rm.h + 1.2, 'VRUUM!', '#F2C230'); S.ang = Rm.ang; S.Rm = { s1: Rm.s1, ux: Rm.ux, uy: Rm.uy, ang: Rm.ang }; }
        continue;
      }
      if (S.fase === 'vola') {
        S.vz -= GRAV * dt; S.z += S.vz * dt; v.x += fx * S.vh * dt; v.y += fy * S.vh * dt; v.speed = S.vh; v.vx = fx * S.vh; v.vy = fy * S.vh; v.jz = Math.max(0, S.z); v.jvz = S.vz;
        if (S.z <= 0) { const esito = atterra(st, v, Object.assign({ C }, S.Rm), S.vh, -S.vz); S.fase = esito === 'schianto' ? 'frena' : 'atterra'; S.vz = esito === 'schianto' ? 0 : -S.vz * .32; S.z = 0; v.jz = 0; S.rimb = 0; }
        continue;
      }
      if (S.fase === 'atterra') {   // i rimbalzi
        S.vz -= GRAV * dt; S.z += S.vz * dt; S.vh = Math.max(0, (S.vh || 0) - 3 * dt); v.x += fx * S.vh * dt; v.y += fy * S.vh * dt; v.jz = Math.max(0, S.z); v.jvz = S.vz; v.speed = S.vh;
        if (S.z <= 0) { S.rimb++; S.z = 0; S.vz = -S.vz * .35; if (S.rimb >= 2 || S.vz < .6) { S.fase = 'frena'; v.jz = 0; v.jvz = 0; } }
        continue;
      }
      if (S.fase === 'frena') { S.vh = Math.max(0, (S.vh || 0) - 8 * dt); v.x += fx * S.vh * dt; v.y += fy * S.vh * dt; v.speed = S.vh; v.jz = 0; if (S.vh <= 0) fine(); }
    }
  }

  // ======================= LA CATAPULTA =======================
  function lancia(st, C, chi) {
    const L = C.misure && C.misure.lancio; if (C.tipo !== 'catapulta' || !L || C.fine === null || C.stato.macerie) return null;
    if (C.stato.carico === 0) { C.stato.carico = 1; boom(st, C.x, C.y, 1.2, 'CRIC', '#F2E7CF'); UC.scrivi(st, 'ricarica', C, {}); return 'ricarica'; }
    const ca = Math.cos(C.a), sa = Math.sin(C.a), car = L.carico >= 0 ? C.piano[L.carico] : null;
    const bx = car ? car[1] : L.perno[0], by = car ? car[2] : L.perno[1], bz = car ? car[3] : .5;
    const x = C.x + ca * bx - sa * by, y = C.y + sa * bx + ca * by, dl = L.indietro ? [-L.dir[0], -L.dir[1]] : L.dir, dx = ca * dl[0] - sa * dl[1], dy = sa * dl[0] + ca * dl[1];
    const v0 = L.indietro ? 3.2 : L.v0, el = L.indietro ? 60 * D2R : 45 * D2R;
    T(st).proj.push({ x, y, z: (C.z0 || 0) + bz + .3, vx: dx * v0 * Math.cos(el), vy: dy * v0 * Math.cos(el), vz: v0 * Math.sin(el), k: 'pneumatico', t: 0, C: C.id, rimb: 0, z0: C.z0 || 0, chi: chi || null, fermo: 0, ang: 0 });
    C.stato.carico = 0; C.stato.leva = r1(st.clock || 0); stats.lanci++;
    boom(st, x, y, 1.6, L.indietro ? 'SPROING?!' : 'SWOOSH!', '#F2C230');
    return 'lancio';
  }
  UV.lancia = lancia;
  function passoProiettili(st, dt) {
    const P = T(st).proj;
    for (let i = P.length - 1; i >= 0; i--) {
      const o = P[i]; o.t += dt;
      if (o.fermo) { if (o.t > 90) P.splice(i, 1); continue; }
      o.vz -= GRAV * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.ang += dt * 7;
      const g = UP.quota(o.x, o.y);
      // contro un muro: si ferma lì e cade dritto (non passa attraverso le case)
      if (typeof Ingombri !== 'undefined' && Ingombri && o.z < g + 12 && Ingombri.casa(G, { cx: o.x, cz: o.y, a: 0, hu: .3, hv: .3 }, 0)) { o.x -= o.vx * dt * 1.5; o.y -= o.vy * dt * 1.5; o.vx = -o.vx * .15; o.vy = -o.vy * .15; if (!o.muro) { o.muro = 1; boom(st, o.x, o.y, o.z - g, 'SDENG!', '#F2E7CF'); } }
      if (o.z <= g + .32 && o.vz < 0) {
        o.z = g + .32; const C = UC.S(st).cantieri.find(x => x.id === o.C);
        if (!o.rimb) {
          boom(st, o.x, o.y, 1.2, 'TONF!', '#F2C230'); if (st.fx) st.fx.push({ k: 'hitpuff', x: o.x, y: o.y });
          const colpito = st.npcs.find(n => !n.inside && !n.dead && hyp(n.x - o.x, n.y - o.y) < .8);
          const d = r1(C ? hyp(o.x - C.x, o.y - C.y) : 0);
          if (colpito) { const sp = hyp(o.vx, o.vy) || 1; colpito.kbx = o.vx / sp * 3; colpito.kby = o.vy / sp * 3; colpito.airT = st.clock; colpito.airDur = .4; colpito.airH = .4; colpito.airSpin = 1; colpito.stun = 1.2; boom(st, colpito.x, colpito.y, 2, 'SDONG!', '#E2553A'); }
          if (C) { C.stato.tiri = (C.stato.tiri || 0) + 1; UC.scrivi(st, colpito ? 'colpito' : 'lancio', C, { m: d, a: colpito ? colpito.id : null, indietro: C.misure.lancio && C.misure.lancio.indietro ? 1 : 0 }); }
        }
        o.rimb++; o.vz = -o.vz * .35; o.vx *= .45; o.vy *= .45;
        if (o.rimb >= 2 || Math.abs(o.vz) < .8) { o.fermo = 1; o.t = 0; o.vz = 0; o.ang = 0; }
      }
    }
  }

  // ======================= IL CARRETTO =======================
  function spingiCarretto(st, C, ux, uy, k) {
    const ax = Math.cos(C.a), ay = Math.sin(C.a), s = (ux * ax + uy * ay) * k;   // solo lungo le ruote
    C.stato.v = r2(cl((C.stato.v || 0) + s * .5, -3, 3)); if (Math.abs(s) > .3) stats.spinte++;
  }
  UV.spingiCarretto = spingiCarretto;
  function passoCarretti(st, dt) {
    for (const C of aperti(st)) {
      if (C.tipo !== 'carretto' || C.fine === null || C.stato.macerie) continue; let v = C.stato.v || 0;
      const ax = Math.cos(C.a), ay = Math.sin(C.a), hl = (C.F[2] - C.F[0]) / 2;
      const zf = UP.quota(C.x + ax * hl, C.y + ay * hl), zb = UP.quota(C.x - ax * hl, C.y - ay * hl); v += -GRAV * (zf - zb) / (2 * hl) * .6 * dt;   // la discesa
      v *= Math.exp(-dt * .9); if (Math.abs(v) < .04) { C.stato.v = 0; continue; }
      const nx = C.x + ax * v * dt, ny = C.y + ay * v * dt, S = { x: nx, y: ny, a: C.a }, R = UP.rettMondo(S, C.F, 0);
      let blocco = typeof Ingombri !== 'undefined' && Ingombri && Ingombri.casa(G, R, .05);
      if (!blocco) for (const q of [[C.F[0], C.F[1]], [C.F[2], C.F[1]], [C.F[0], C.F[3]], [C.F[2], C.F[3]]]) { const w = UP.aMondo(S, q[0], q[1]); if (G.walkM && !G.walkM(w.x, w.y)) { blocco = true; break; } }
      if (!blocco) for (const M of UP.mezzi(st, nx, ny, 8)) if (UP.sat2(R, M)) { blocco = true; break; }
      if (!blocco) for (const D of aperti(st)) if (D !== C && D.F && UP.sat2(R, UC.rettDi(D, .05))) { blocco = true; break; }
      if (blocco) { if (Math.abs(v) > .8) boom(st, C.x + ax * hl * Math.sign(v), C.y + ay * hl * Math.sign(v), .8, 'TUMP', '#F2E7CF'); C.stato.v = r2(-v * .25); continue; }
      C.x = r2(nx); C.y = r2(ny); C.z0 = r2(UP.quota(nx, ny)); C.stato.v = r2(v);
    }
  }

  // ======================= I CROLLI: le macerie, distese, senza compenetrarsi =======================
  function macerie(C) {
    const out = [], F = C.F, r = UP.rngDi(C.id + '|macerie'), messi = C.pezzi.map(([i]) => C.piano[i]);
    for (const p of messi) {
      const k = p[0], d = UP.dimDi(p);
      // distesa: la faccia larga a terra (i pali e le assi coricate, il fusto rotolato, la porta piatta)
      const roll = k === 'fusto' ? PI / 2 : 0, yaw = C.a * 0 + (r() - .5) * 1.4 + (r() < .5 ? 0 : PI / 2);
      for (let t = 0; t < 30; t++) {
        const x = F[0] - .8 + r() * (F[2] - F[0] + 1.6), y = F[1] - .8 + r() * (F[3] - F[1] + 1.6);
        const q = [k, 0, 0, 0, yaw, 0, roll, p[7], p[8]], ez = UP.zMax(UP.obb(q)); q[1] = r2(x); q[2] = r2(y); q[3] = r2(ez + .003);
        const O = UP.obb(q); if (out.some(o => UP.pen3(O, UP.obb(o)) > .005)) continue;
        // e fuori dal mondo: niente dentro le case, i mezzi, gli altri cantieri
        const Pq = UP.pianta(q), w = UP.aMondo(C, Pq.cx, Pq.cy), Rq = { cx: w.x, cz: w.y, a: C.a + Math.atan2(Pq.uy, Pq.ux), hu: Pq.hu, hv: Pq.hv };
        if (typeof Ingombri !== 'undefined' && Ingombri && Ingombri.casa(G, Rq, .05)) continue;
        if (UV.__st && UP.mezzi(UV.__st, w.x, w.y, 8).some(M => UP.sat2(Rq, M))) continue;
        out.push(q); break;
      }
    }
    return out;
  }
  UV.macerie = macerie;
  function crolla(st, C, chi, x, y) {
    if (C.stato.macerie) return; UV.__st = st; C.stato.macerie = macerie(C); UV.__st = null; C.stato.crollo = r1(st.t); stats.crolli++;
    boom(st, x || C.x, y || C.y, 1.5, 'CRAC!', '#E2553A'); boom(st, C.x + .8, C.y - .5, 2.2, 'PATATRAC!', '#F2C230'); if (st.fx) st.fx.push({ k: 'hitpuff', x: C.x, y: C.y });
    UC.scrivi(st, 'crollo', C, { chi: chi || '', cosa: UC.NOME[C.tipo][1] });
    T(st).cache[C.id] = null;
  }
  UV.crolla = crolla;

  // ======================= L'USO (il verbo «presidia» lo chiama) e gli altri ganci di unico_costruire.js =======================
  UC.usa = (st, C, chi, lontano) => {
    if (C.stato.macerie) return;
    const M = C.misure || {};
    if (C.tipo === 'rampa') { if (!lontano) salta(st, C); return; }
    if (C.tipo === 'catapulta') { lancia(st, C, chi); return; }
    if (C.tipo === 'carretto') { C.stato.verso = -(C.stato.verso || -1); spingiCarretto(st, C, Math.cos(C.a) * C.stato.verso, Math.sin(C.a) * C.stato.verso, 2.4); UC.scrivi(st, 'spinge', C, {}); return; }
    if (C.tipo === 'torre' || C.tipo === 'palco' || C.tipo === 'ponte') {   // chi ci sale (o ci passa) è un carico di 75 kg
      if ((M.portata || 0) < 75 || (C.tipo === 'torre' && M.stabile && !M.stabile.ok)) { crolla(st, C, chi); return; }
      UC.scrivi(st, C.tipo === 'ponte' ? 'attraversa' : 'sale', C, { cosa: UC.NOME[C.tipo][1], quota: r1(M.piano || 0) }); return;
    }
    if (C.tipo === 'zattera') { if ((M.galleggia || 0) < 75) { C.stato.affonda = r1(st.t); boom(st, C.x, C.y, 1, 'GLU GLU', '#A3D4D8'); UC.scrivi(st, 'affonda', C, {}); } else UC.scrivi(st, 'galleggia', C, { kg: Math.round(M.galleggia) }); return; }
  };
  UC.allaPosa = (st, C, i) => {
    const p = C.piano[i], q = UC.mondo(C, p[1], p[2]), pl = st.player; if (!pl || hyp(pl.x - q.x, pl.y - q.y) > 45) return;
    const m = PARTI[p[0]].mat, w = m === 'zinco' ? 'SDENG!' : m === 'gomma' ? 'TUMP' : p[0] === 'fusto' ? 'BONG!' : m === 'tela' ? 'FRUSH' : (UP.hashS(C.id + i) < .5 ? 'TOC TOC' : 'BANG!');
    boom(st, q.x, q.y, (C.z0 || 0) * 0 + p[3] + .8, w, '#F2E7CF');
  };
  UC.alFine = (st, C) => { if (C.tipo === 'catapulta') C.stato.carico = 1; T(st).cache[C.id] = null; };
  // i segni dei fatti nuovi
  const Sg = typeof Segni !== 'undefined' && Segni.ON ? Segni : null;
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    salto: { p: 'esclamativo', w: 'si vola!', posa: 'discute', gz: .7, n: ['salto', 'salti'], r: ['Dalla rampa di {via} un\'auto ha volato per {m} metri: c\'erano {A}[, {B}] e gli altri.', 'In {via} si salta con la macchina dalla rampa ({ang}°): {m} metri, e giù.'] },
    schianto: { p: 'esclamativo', w: 'SBRANG', posa: 'discute', gz: .8, n: ['schianto', 'schianti'], r: ['La rampa di {via} era troppo ripida ({ang}°): l\'auto è atterrata di muso.', 'In {via} un\'auto è volata dalla rampa ed è atterrata male: {A}[ e {B}] ridono ancora.'] },
    lancio: { p: 'esclamativo', w: 'TONF', posa: 'discute', gz: .5, n: ['lancio', 'lanci'], r: ['Dalla catapulta di {via} è partito un copertone: {m} metri.', 'In {via} {A}[ e {B}] tirano copertoni con la catapulta.'] },
    colpito: { p: 'esclamativo', w: 'SDONG', posa: 'discute', gz: .6, n: ['colpo di catapulta', 'colpi di catapulta'], r: ['La catapulta di {via} ha centrato qualcuno con un copertone.'] },
    ricarica: { p: 'mano', w: 'carica', posa: 'raccoglie', gz: 0, n: ['ricarica', 'ricariche'], bolla: false },
    crollo: { p: 'esclamativo', w: 'CRAC', posa: 'discute', gz: .85, n: ['crollo', 'crolli'], r: ['In {via} {cosa} è crollata: non reggeva {chi}.', 'Patatrac in {via}: {cosa} di {A}[ e {B}] è venuta giù.'] },
    spinge: { p: 'mano', w: 'spinge', posa: 'discute', gz: 0, n: ['spinta', 'spinte'], bolla: false },
    sale: { p: 'esclamativo', w: 'da quassù', posa: 'discute', gz: .2, n: ['salita', 'salite'], r: ['{A} è salito in cima alla {cosa} di {via}: {quota} metri.'] },
    attraversa: { p: 'freccia', w: 'si passa', posa: 'discute', gz: .1, n: ['traversata', 'traversate'], bolla: false },
    affonda: { p: 'esclamativo', w: 'glu glu', posa: 'discute', gz: .7, n: ['naufragio', 'naufragi'], r: ['La zattera di {A}[ e {B}] è affondata a {via}.'] },
    galleggia: { p: 'esclamativo', w: 'galleggia', posa: 'discute', gz: .3, n: ['varo', 'vari'], r: ['La zattera di {via} galleggia: porta {kg} kg.'] },
  });
  const Fg = typeof Fatto !== 'undefined' && Fatto.GRAV ? Fatto.GRAV : null; if (Fg) Object.assign(Fg, { salto: .5, schianto: .65, lancio: .35, colpito: .6, crollo: .6, affonda: .5, galleggia: .3, sale: .2 });

  // ======================= IL PASSO (dopo il passo del gioco) =======================
  function passo(st, dt) {
    if (!st.u || !st.u.costruire) return; const L = aperti(st); const U = T(st);
    if (!L.length && !U.proj.length && !U.salti.length) return;
    rampaGiocatore(st, dt); passoSalti(st, dt); passoProiettili(st, dt); passoCarretti(st, dt);
    const p = st.player;
    if (UV.primaDeiCorpi) UV.primaDeiCorpi(st, dt, L);   // [presidio] le auto che passano piano in mezzo
    for (const C of L) {
      const B = corpi(st, C); if (!B.L.length) continue;
      if (p && !p.vehicle && !p.indoor && !(p.jz > 1.2)) fuoriPersona(st, p, .3, C, B);
      for (const n of st.npcs) { if (n.inside || n.dead || Math.abs(n.x - C.x) > B.R + 1 || Math.abs(n.y - C.y) > B.R + 1) continue; fuoriPersona(st, n, .28, C, B); }
      for (const v of st.vehicles) fuoriMezzo(st, v, C, B);
    }
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { passo(st, dt); } catch (e) { if (!passo.err) { passo.err = 1; if (typeof console !== 'undefined') console.warn('[UnicoPartiVivo]', e); } } }; }
  UV.passo = passo;

  // ======================= IL DISEGNO (solo nel browser) =======================
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined' || typeof THREE === 'undefined') return UV;
  const T3 = THREE, AR = () => (typeof Arredo3D !== 'undefined' ? Arredo3D : null);
  const pv = () => window.__pv, Rr = () => pv() && pv().R;
  // la quota e la roba di strada del disegno per chi cerca il posto
  UP.quota = (x, y) => { const R = Rr(); return R && R.groundH ? R.groundH(x, y) : 0; };
  UP.ostacoli = (x, y, r) => {
    const R = Rr(), DZ = R && R.__dz; if (!DZ || !DZ.hash) return [];
    const out = [], g = R.groundH ? R.groundH(x, y) : 0, add = rec => { if (!rec || rec.state !== 0 || rec.gone35) return; const c = rec.c; if (Math.abs(c.x - x) > r + rec.he.x || Math.abs(c.z - y) > r + rec.he.z) return; out.push({ x: c.x, y: c.z, hx: rec.he.x, hy: rec.he.z, z0: rec.base - g, z1: c.y + rec.he.y - g, tag: rec.tag }); };
    for (let i = Math.floor((x - r) / 4); i <= Math.floor((x + r) / 4); i++) for (let j = Math.floor((y - r) / 4); j <= Math.floor((y + r) / 4); j++) { const a = DZ.hash.get((i + 50) * 1000 + j + 50); if (a) a.forEach(add); }
    for (const b of DZ.big || []) if (Math.abs(b.c.x - x) < r + b.he.x && Math.abs(b.c.z - y) < r + b.he.z) out.push({ x: b.c.x, y: b.c.z, hx: b.he.x, hy: b.he.z, z0: b.base - g, z1: b.c.y + b.he.y - g, tag: b.tag || 'grande' });
    return out;
  };
  // ---- i materiali (quelli di Arredo3D, con lo stile) ----
  const MC = {};
  function mat(col, kind, doppio) {
    const k = col + kind + (doppio ? 2 : 1); if (MC[k]) return MC[k];
    let m = AR() && AR().mat ? AR().mat(col, kind) : new T3.MeshStandardMaterial({ color: col, roughness: .8 });
    if (doppio) { m = m.clone(); m.side = T3.DoubleSide; }
    return (MC[k] = m);
  }
  const COL = { legno: ['#b8986a', '#a5845a', '#c4a676'], trave: '#6a4a2c', zinco: ['#8a8e8a', '#9a5a3a', '#7d8a8c'], gomma: '#1e1c1e', mozzo: '#9aa0a0', porta: ['#2f5a3e', '#DC9A34', '#3a5f8a', '#a8432e'], fusto: ['#2a5ab8', '#c23a2a', '#d8b030'], telo: ['#3a6ab0', '#d86a2a', '#5a8a4a'], corda: '#c8b080' };
  const pick = (L, h) => (Array.isArray(L) ? L[Math.floor(h * L.length) % L.length] : L);
  // ---- le geometrie delle parti (centrate sulla scatola; X = L, Y = H, Z = D) ----
  const GEO = {};
  const box = (w, h, d) => { const k = 'b' + [w, h, d].join(); return GEO[k] || (GEO[k] = new T3.BoxGeometry(w, h, d)); };
  function daGruppo(nome, o, W, H, D) {   // un modello di Arredo3D unito per materiale e portato alla scatola (W × H × D, centrato)
    const k = 'ar' + nome + JSON.stringify(o || {}) + [W, H, D].join(); if (GEO[k]) return GEO[k];
    const g0 = AR() && AR().make ? AR().make(nome, o || {}) : null; if (!g0) return (GEO[k] = null);
    g0.updateMatrixWorld(true); const bb = new T3.Box3().setFromObject(g0), sz = bb.getSize(new T3.Vector3()), c = bb.getCenter(new T3.Vector3());
    const M = new T3.Matrix4().makeScale(W / sz.x, H / sz.y, D / sz.z).multiply(new T3.Matrix4().makeTranslation(-c.x, -c.y, -c.z)), L = [];
    g0.traverse(m => { if (m.isMesh) L.push([m.geometry, m.material, M.clone().multiply(m.matrixWorld)]); });
    return (GEO[k] = L);
  }
  function onda(w, d) { const k = 'o' + w + 'x' + d; if (GEO[k]) return GEO[k]; const g = new T3.PlaneGeometry(w, d, Math.max(4, Math.round(d * 9)), 1); const P = g.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin(P.getY(i) * 9 * PI) * .016); g.rotateX(-PI / 2); g.computeVertexNormals(); return (GEO[k] = g); }
  function telo(w, d) { const k = 't' + w + 'x' + d; if (GEO[k]) return GEO[k]; const g = new T3.PlaneGeometry(w, d, 8, 8); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const u = P.getX(i) / w * 2, v = P.getY(i) / d * 2; P.setZ(i, -.035 * (1 - u * u) * (1 - v * v) + Math.sin(u * 5 + v * 3) * .006); } g.rotateX(-PI / 2); g.computeVertexNormals(); return (GEO[k] = g); }
  function cil(r, h, n) { const k = 'c' + r + 'x' + h + 'x' + n; return GEO[k] || (GEO[k] = new T3.CylinderGeometry(r, r, h, n || 10, 1, false)); }
  function toro(R, t) { const k = 'tor' + R + 'x' + t; return GEO[k] || (GEO[k] = new T3.TorusGeometry(R, t, 6, 16)); }
  function molla(h) { const k = 'm' + h; if (GEO[k]) return GEO[k]; const P = [], n = 7; for (let i = 0; i <= n * 12; i++) { const a = i / 12 * PI * 2; P.push(new T3.Vector3(Math.cos(a) * .11, -h / 2 + .03 + (h - .06) * i / (n * 12), Math.sin(a) * .11)); } return (GEO[k] = new T3.TubeGeometry(new T3.CatmullRomCurve3(P), n * 12, .018, 5, false)); }
  const TELE = {};
  function striscione(testo, asp) {   // [presidio] asp: la tela lunga (larghezza/altezza), la scritta non si stira
    const k = testo + (asp || ''); if (TELE[k]) return TELE[k];
    const H = asp ? 160 : 112, W = asp ? Math.min(2048, Math.round(H * asp / 4) * 4) : 512;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = '#F2E7CF'; x.fillRect(0, 0, W, H); x.strokeStyle = '#16121B'; x.lineWidth = 7; x.strokeRect(4, 4, W - 8, H - 8);
    x.font = 'bold ' + (asp ? 104 : 60) + 'px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = asp ? 16 : 11; x.strokeStyle = '#16121B'; x.strokeText(testo, W / 2, H * .54); x.fillStyle = '#C25B36'; x.fillText(testo, W / 2, H * .54);
    if (asp) { x.fillStyle = '#16121B'; for (const u of [.09, .91]) { x.beginPath(); x.arc(W * u, H / 2, 16, 0, PI * 2); x.fill(); } }   // due stelle d'inchiostro ai capi
    const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
    return (TELE[k] = new T3.MeshStandardMaterial({ map: t, roughness: .9, side: T3.DoubleSide }));
  }
  const TESTI = { barricata: 'VIA NOSTRA', baracca: 'QUI CI STIAMO NOI', rampa: 'SI VOLA', catapulta: 'FUOCO!', torre: 'DA QUASSÙ', palco: 'STASERA SI SUONA', presidio: 'VIA NOSTRA' };
  // i pezzi di una parte come [geometria, materiale, matrice locale della parte]
  function forme(C, p, i) {
    const k = p[0], d = UP.dimDi(p), [L, D, H] = d, h = UP.hashS(C.id + ':' + i), I = new T3.Matrix4(), out = [], add = (g, m, M) => out.push([g, m, M || I]);
    const tr = (x, y, z) => new T3.Matrix4().makeTranslation(x, y, z);
    switch (k) {
      case 'asse': add(box(L, H, D), mat(pick(COL.legno, h), 'legno')); add(box(L * .98, H * .3, .012), mat('#7a5634', 'legno'), tr(0, H * .36, D * .25)); break;
      case 'bancale': { const g = daGruppo('bancale', {}, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(box(L, H, D), mat(COL.legno[0], 'legno')); break; }
      case 'lamiera': add(onda(L, D), mat(pick(COL.zinco, h), h < .34 ? 'vernice' : 'zinco', true)); break;
      case 'trave': add(box(L, H, D), mat(COL.trave, 'legno')); add(box(.02, H + .004, D + .004), mat('#3a2a1c', 'legno'), tr(L / 2 - .01, 0, 0)); add(box(.02, H + .004, D + .004), mat('#3a2a1c', 'legno'), tr(-L / 2 + .01, 0, 0)); break;
      case 'tubo': add(cil(H / 2, L, 8), mat('#8a9094', 'zinco'), new T3.Matrix4().makeRotationZ(PI / 2)); break;
      case 'ruota': add(toro(.235, .065), mat(COL.gomma, 'gomma')); add(cil(.13, .08, 10), mat(COL.mozzo, 'zinco'), new T3.Matrix4().makeRotationX(PI / 2)); break;
      case 'corda': add(toro(.13, .03), mat(COL.corda, 'tela'), new T3.Matrix4().makeRotationX(PI / 2).premultiply(tr(0, -.02, 0))); add(toro(.11, .028), mat(COL.corda, 'tela'), new T3.Matrix4().makeRotationX(PI / 2).premultiply(tr(.02, .035, 0))); break;
      case 'molla': add(molla(H), mat('#b8b8b0', 'zinco')); add(cil(.13, .03, 10), mat('#5a5e60', 'zinco'), tr(0, -H / 2 + .015, 0)); add(cil(.13, .03, 10), mat('#5a5e60', 'zinco'), tr(0, H / 2 - .015, 0)); break;
      case 'cassa': { const g = daGruppo('cassa', {}, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(box(L, H, D), mat('#a88a5c', 'legno')); break; }
      case 'pneumatico': { const g = daGruppo('pila_gomme', { n: 1 }, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(cil(L / 2, H, 12), mat(COL.gomma, 'gomma')); break; }
      case 'porta': { const c = pick(COL.porta, h), m = mat(c, 'vernice'); add(box(L, H, D), m); add(box(L * .38, H + .01, D * .7), mat('#16121B', 'vernice'), tr(-L * .23, 0, 0)); add(box(L * .38, H + .01, D * .7), mat('#16121B', 'vernice'), tr(L * .23, 0, 0));
        add(box(L * .36, H + .016, D * .66), m, tr(-L * .23, 0, 0)); add(box(L * .36, H + .016, D * .66), m, tr(L * .23, 0, 0)); add(box(.12, H + .03, .04), mat('#c8a040', 'zinco'), tr(.05, 0, D * .38)); break; }
      case 'telo': add(telo(L, D), mat(pick(COL.telo, h), 'tela', true)); break;
      case 'fusto': { const g = daGruppo('fusto', { col: pick(COL.fusto, h) }, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(cil(L / 2, H, 12), mat(pick(COL.fusto, h), 'vernice')); break; }
      case 'striscione': { const t = C.nome || TESTI[C.tipo]; if (t) add(new T3.PlaneGeometry(L, H), striscione(t)); break; }
      // [presidio] la scritta lunga: due tele schiena contro schiena (si legge dai due versi), la corda in cima; la roba di casa
      case 'scritta': { const t = C.nome || TESTI[C.tipo] || 'VIA NOSTRA', m = striscione(t, L / H), g = new T3.PlaneGeometry(L, H); add(g, m, tr(0, 0, .004)); add(g, m, new T3.Matrix4().makeRotationY(PI).premultiply(tr(0, 0, -.004))); add(cil(.008, L, 4), mat(COL.corda, 'tela'), new T3.Matrix4().makeRotationZ(PI / 2).premultiply(tr(0, H / 2 + .01, 0))); break; }
      case 'sedia': { const g = daGruppo('sedia', { tipo: pick(['pieghevole', 'plastica', 'bistrot'], h) }, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(box(L, H * .5, D), mat('#a8804a', 'legno')); break; }
      case 'tavolo': { const g = daGruppo('tavolino', { tipo: h < .5 ? 'plastica' : 'ferro' }, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(box(L, H, D), mat('#e8e2d6', 'legno')); break; }
      case 'vaso': { const g = daGruppo('vaso', { seed: Math.floor(h * 97), pianta: pick(['geranio', 'basilico', 'limone'], h) }, L, H, D); if (g) g.forEach(x => add(x[0], x[1], x[2])); else add(cil(L / 2, H, 10), mat('#b8603a', 'vernice')); break; }
    }
    return out;
  }
  // la matrice della parte nel gruppo del cantiere: le colonne S·R·S (y ↔ z) e il centro (cx, cz, cy)
  const _a = new T3.Vector3(), _b = new T3.Vector3(), _c = new T3.Vector3();
  function matParte(p) { const R = UP.rotM(p[4], p[5], p[6]), e0 = R[0], e1 = R[1], e2 = R[2]; const M = new T3.Matrix4().makeBasis(_a.set(e0[0], e0[2], e0[1]), _b.set(e2[0], e2[2], e2[1]), _c.set(e1[0], e1[2], e1[1])); M.setPosition(p[1], p[3], p[2]); return M; }
  UV.matParte = matParte;
  // unire per materiale (posizioni, normali, uv) senza indici
  function unisci(L) {
    const per = new Map(); for (const [g, m, M] of L) { let a = per.get(m); if (!a) per.set(m, (a = [])); a.push([g, M]); }
    const out = [];
    for (const [m, A] of per) {
      let n = 0; const G0 = A.map(([g, M]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(M); n += q.attributes.position.count; return q; });
      const P = new Float32Array(n * 3), N = new Float32Array(n * 3), UVa = new Float32Array(n * 2); let o = 0;
      for (const q of G0) { const c = q.attributes.position.count; P.set(q.attributes.position.array, o * 3); if (q.attributes.normal) N.set(q.attributes.normal.array, o * 3); if (q.attributes.uv) UVa.set(q.attributes.uv.array, o * 2); o += c; q.dispose(); }
      const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.BufferAttribute(P, 3)); g.setAttribute('normal', new T3.BufferAttribute(N, 3)); g.setAttribute('uv', new T3.BufferAttribute(UVa, 2)); g.computeBoundingSphere();
      const me = new T3.Mesh(g, m); me.castShadow = true; me.receiveShadow = true; out.push(me);
    }
    return out;
  }
  // il mucchio della tappa: i pezzi ancora da mettere, a pile ordinate accanto al cantiere (si assottiglia)
  function mucchio(C, out) {
    const m = C.mucchio; if (!m || C.fine !== null) return; const lp = UC.locale(C, m.x, m.y), rest = {}, messi = new Set(C.pezzi.map(p => p[0]));
    C.piano.forEach((p, i) => { if (!messi.has(i)) rest[p[0]] = (rest[p[0]] || 0) + 1; });
    const base = new T3.Matrix4().makeTranslation(lp.x, 0, lp.y); let x = -1.2;
    const pila = (k, n, h, step) => { for (let j = 0; j < n; j++) for (const [g, mm, M] of forme(C, [k, 0, 0, 0, 0, 0, 0, 0, 0], j)) out.push([g, mm, base.clone().multiply(new T3.Matrix4().makeTranslation(x, h / 2 + j * step, 0)).multiply(new T3.Matrix4().makeRotationY(j * .15)).multiply(M)]); };
    if (rest.bancale) { pila('bancale', Math.min(4, rest.bancale), .144, .146); x += 1.3; }
    if (rest.asse || rest.porta) { pila(rest.porta ? 'porta' : 'asse', Math.min(4, (rest.asse || 0) + (rest.porta || 0)), rest.porta ? .045 : .03, rest.porta ? .047 : .032); x += 1.1; }
    if (rest.lamiera) { pila('lamiera', Math.min(3, rest.lamiera), .04, .045); x += 1.1; }
    if (rest.pneumatico) { pila('pneumatico', Math.min(3, rest.pneumatico), .2, .204); x += .8; }
    if (rest.cassa || rest.fusto) { pila(rest.fusto ? 'fusto' : 'cassa', 1, rest.fusto ? .9 : .6, 0); x += .8; }
  }
  const VIS = UV.VIS = { grp: null, scene: null, st: null, per: {}, rifatti: 0, proj: [], boom: [] };
  const chiave = C => (C.nome || '') + '|' + C.pezzi.length + '|' + (C.mucchio ? Object.values(C.mucchio.scorta).join(',') : '') + '|' + (C.fine !== null ? 1 : 0) + '|' + (C.stato && C.stato.macerie ? 'm' : '') + '|' + (C.stato && C.stato.carico === 0 ? 'v' : '') + '|' + ((C.stato && C.stato.dipinto) || 0);
  function rifai(C) {
    const L = [], mob = [], g = new T3.Group(), LV = C.misure && C.misure.lancio, mobili = new Set();
    if (C.tipo === 'catapulta' && LV && !(C.stato && C.stato.macerie)) { mobili.add(LV.leva); if (LV.carico >= 0) mobili.add(LV.carico); }
    for (const [p, i] of pezziVivi(C)) {
      if (C.tipo === 'catapulta' && LV && i === LV.carico && C.stato && C.stato.carico === 0) continue;   // il carico è partito
      const M = matParte(p); for (const [ge, m, Mp] of forme(C, p, i)) (mobili.has(i) ? mob : L).push([ge, m, M.clone().multiply(Mp)]);
    }
    mucchio(C, L);
    if (UV.extra) try { UV.extra(C, L, T3); } catch (e) { }   // [presidio] la strada dipinta
    for (const m of unisci(L)) g.add(m);
    if (mob.length) { const piv = new T3.Group(), P = LV.perno; piv.position.set(P[0], P[2], P[1]); const inv = new T3.Matrix4().makeTranslation(-P[0], -P[2], -P[1]);
      for (const x of mob) x[2] = inv.clone().multiply(x[2]); for (const m of unisci(mob)) piv.add(m); piv.name = 'leva'; g.add(piv); g.userData.leva = piv;
      const dir = LV.dir; g.userData.asseLeva = new T3.Vector3(-dir[1], 0, dir[0]).normalize(); }   // l'asse del perno: di traverso alla leva
    g.name = 'cantiere:' + C.id; g.userData.chiave = chiave(C); VIS.rifatti++;
    return g;
  }
  function posa(g, C, t) {
    const R = Rr(), z = C.tipo === 'zattera' ? UP.WL - pescaggio(C) + Math.sin(t * 1.3 + C.x) * .04 - (C.stato && C.stato.affonda ? Math.min(1.4, ((pv().st.t - C.stato.affonda) || 0) * .05) : 0) : (C.z0 !== undefined ? C.z0 : R && R.groundH ? R.groundH(C.x, C.y) : 0);
    g.position.set(C.x, z, C.y); g.rotation.set(C.tipo === 'zattera' ? Math.sin(t * .9) * .03 : 0, -C.a, C.tipo === 'zattera' ? Math.sin(t * 1.1 + 1) * .025 : 0, 'YXZ');
  }
  // la zattera pesca quanto il peso sul volume che galleggia (in proporzione all'altezza dei fusti)
  const pescaggio = C => { const M = C.misure || {}; return cl((M.kg || 100) / Math.max(1, M.spinta || ((M.galleggia || 0) + (M.kg || 0))) * .6, .05, .55); };
  function sync() {
    const P = pv(), R = P && P.R, st = P && P.st, scene = R && R.__models && R.__models.scene; if (!scene || !st || !st.u) return;
    if (VIS.scene !== scene) { VIS.scene = scene; VIS.grp = new T3.Group(); VIS.grp.name = 'costruire'; scene.add(VIS.grp); VIS.per = {}; }
    const via = id => { const g = VIS.per[id]; VIS.grp.remove(g); g.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); delete VIS.per[id]; };
    if (VIS.st !== st) { for (const id in VIS.per) via(id); VIS.st = st; }
    VIS.grp.visible = !(st.player && st.player.indoor);
    const s = st.u.costruire, vivi = new Set();
    for (const C of (s && s.cantieri) || []) {
      if (C.chiuso) continue; vivi.add(C.id);
      const g = VIS.per[C.id]; if (g && g.userData.chiave === chiave(C)) continue;
      if (g) via(C.id); VIS.grp.add(VIS.per[C.id] = rifai(C));
    }
    for (const id in VIS.per) if (!vivi.has(id)) via(id);
  }
  // ---- le onomatopee: un fumetto disegnato (la stella di carta, la parola con l'inchiostro), sale e svanisce ----
  const SPR = {};
  function sprMat(testo, col) {
    const k = testo + col; if (SPR[k]) return SPR[k];
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    x.translate(128, 64); x.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2, r = i % 2 ? 44 : 62; x.lineTo(Math.cos(a) * r * 1.85, Math.sin(a) * r * .95); } x.closePath();
    x.fillStyle = '#F2E7CF'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#16121B'; x.stroke();
    x.font = 'bold ' + (testo.length > 7 ? 30 : 40) + 'px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.rotate(-.08);
    x.lineJoin = 'round'; x.lineWidth = 9; x.strokeStyle = '#16121B'; x.strokeText(testo, 0, 3); x.fillStyle = col; x.fillText(testo, 0, 3);
    const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
    return (SPR[k] = new T3.SpriteMaterial({ map: t, transparent: true, depthTest: false, depthWrite: false }));
  }
  let visti = 0;
  function anima() {
    try {
      const P = pv(), st = P && P.st; if (!st || !VIS.grp) return; const U = T(st), t = performance.now() / 1000, ck = st.clock || 0;
      // i gruppi che si muovono: il carretto, la zattera; la leva della catapulta che scatta
      for (const C of ((st.u && st.u.costruire && st.u.costruire.cantieri) || [])) {
        const g = VIS.per[C.id]; if (!g) continue; posa(g, C, t);
        if (g.userData.leva) { const dt = ck - ((C.stato && C.stato.leva) || -99), LV = C.misure.lancio, a0 = 0, a1 = (LV.ang + 40) * D2R * (LV.indietro ? .5 : 1);
          const a = dt < 0 || dt > 4 ? a0 : dt < .18 ? a1 * dt / .18 : dt < .9 ? a1 : a1 * Math.max(0, 1 - (dt - .9) / 2.5); g.userData.leva.quaternion.setFromAxisAngle(g.userData.asseLeva, a); }
      }
      // i proiettili: copertoni in volo (una mesh per proiettile, rifatte se cambiano)
      while (VIS.proj.length < U.proj.length) { const L = forme({ id: 'p', tipo: '' }, ['pneumatico', 0, 0, 0, 0, 0, 0, 0, 0], 0), g = new T3.Group(); for (const m of unisci(L)) g.add(m); VIS.grp.add(g); VIS.proj.push(g); }
      VIS.proj.forEach((g, i) => { const o = U.proj[i]; g.visible = !!o; if (o) { g.position.set(o.x, o.z, o.y); g.rotation.set(o.ang, 0, o.ang * .3); } });
      // le onomatopee (le ultime, vicine al giocatore)
      const pl = st.player;
      for (const e of U.eventi) { if (e.vis) continue; e.vis = 1; if (pl && hyp(e.x - pl.x, e.y - pl.y) > 60) continue; const s = new T3.Sprite(sprMat(e.testo, e.col)); s.renderOrder = 999; s.userData.e = e; s.userData.t0 = e.t; VIS.grp.add(s); VIS.boom.push(s); visti++; }
      for (let i = VIS.boom.length - 1; i >= 0; i--) { const s = VIS.boom[i], e = s.userData.e, a = Math.max(0, ck - s.userData.t0), R = Rr(); if (a > 1.6) { VIS.grp.remove(s); VIS.boom.splice(i, 1); continue; }
        const k = a < .12 ? a / .12 * 1.25 : a < .25 ? 1.25 - (a - .12) / .13 * .25 : 1, gz = R && R.groundH ? R.groundH(e.x, e.y) : 0; s.position.set(e.x, gz + e.z + .5 + a * .5, e.y); s.scale.set(1.9 * k, .95 * k, 1); s.material.opacity = a > 1.1 ? 1 - (a - 1.1) / .5 : 1; }
    } catch (e) { }
  }
  // ---- le battute di chi guida: fumetti della pagina (la classe .bub di index.html), in un livello accanto a #bubbles ----
  const DET = { L: null, pool: [] }, escH = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function battute() {
    try {
      const P = pv(), st = P && P.st, R = Rr(); if (!st || !R || !R.project) return;
      if (!DET.L) { const B = document.getElementById('bubbles'); if (!B || !B.parentNode) return; DET.L = document.createElement('div'); DET.L.id = 'unico-dette'; DET.L.className = B.className; DET.L.style.cssText = 'position:absolute;inset:0;pointer-events:none'; B.parentNode.insertBefore(DET.L, B); }
      const ui = P.ui || {}, pl = st.player, app = DET.L.parentNode, W = app.clientWidth, H = app.clientHeight, ck = st.clock || 0, spento = ui.intro || window.__pulita || (pl && pl.lv && pl.lv.k === 'ug') || (pl && pl.indoor);
      let i = 0;
      if (!spento) for (const e of T(st).dette) {
        if (e.fino <= ck) continue; const v = st.vehicles.find(k => k.id === e.vid); if (v && !v.hidden) { e.x = v.x; e.y = v.y; }
        if (pl && hyp(e.x - pl.x, e.y - pl.y) > 30) continue; const pr = R.project(e.x, 2.1, e.y);   // (come i fumetti di main.js: project mette già il suolo) if (pr.behind || pr.x < -.05 || pr.x > 1.05 || pr.y < -.05 || pr.y > 1.05) continue;
        let el = DET.pool[i]; if (!el) { el = document.createElement('div'); el.style.cssText = 'position:absolute;left:0;top:0'; DET.L.appendChild(el); DET.pool.push(el); } i++;
        const h = `<span class="who">${escH(e.chi)}</span>${escH(e.testo)}`; if (el.__h !== h) { el.__h = h; el.innerHTML = h; el.className = 'bub'; } el.hidden = false;
        el.style.transform = `translate(${Math.round(pr.x * W)}px,${Math.round(pr.y * H - 6)}px) translate(-50%,-100%)`;
      }
      for (; i < DET.pool.length; i++) DET.pool[i].hidden = true;
    } catch (e) { }
  }
  UV.battute = battute;
  UV.congela = false;
  (function giro(ts) { if (!(typeof Cinema !== 'undefined' && Cinema.saltato(ts))) { if (!UV.congela) anima(); battute(); } requestAnimationFrame(giro); })();
  setInterval(() => { try { sync(); } catch (e) { if (typeof Unico !== 'undefined' && Unico._ && Unico._.conta) Unico._.conta('unico.parti', e); } }, 300);
  UV.sync = sync; UV.anima = anima;
  return UV;
})();
if (typeof window !== 'undefined') window.UnicoPartiVivo = UnicoPartiVivo;
