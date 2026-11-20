/* [unico] unico_cose.js: LE COSE IN MANO, IL LANCIO E IL CONTRATTO «SEMPRE CONCRETO» (progetto: commedia/MONDO_PIENO.md §2, §3, T.5).
   Dietro ?commedia. Spento il flag: UnicoCose = { ON: false } e nient'altro.

   LA FISICA FINTA (§3.2). Da Roba.di(cosa) (peso e proprietà del catalogo) si ricavano, una volta e in cache, i sei numeri: kg, rimbalzo,
   rottura (mai | urto | forte), danno (peso × velocità × appuntito/metallo/molle), sporco, fuoco; più il materiale per l'onomatopea.
   Si lancia tutto quello che pesa meno di 8 kg (CFG.lanciabile). Il volo è una parabola analitica in st.u.cose.volo (al più 12: il 13°
   fa cadere il più vecchio), 1-2 rimbalzi, e all'arrivo l'esito lo decide il mondo: chi c'era (preso, o un altro: «colpisce_altro»),
   il muro (la vetrina), il materiale (si rompe: i cocci). Oltre 60 m dal giocatore non si vola: l'esito si calcola subito.
   Le cose a terra (st.u.cose.terra, 40 per quartiere: i cocci per 1 ora, le cose intere per 1 giorno) si raccolgono: chi passa accanto
   le prende (il verbo «raccogli»), e i desideri le cercano (unico_desideri.js).
   IN MANO (§3.1): n.hand = la cosa (anim_mano.js la disegna con la sagoma della sua famiglia) per la durata del gesto; finito, si rimette.
   IL CONTRATTO (§2.1): ogni verbo che fallisce (il fatto con esito «no») lascia una cosa nel mondo, scelta dalla tavola dei GUASTI per
   proprietà della cosa usata e per famiglia del verbo: cade, si_rompe, si_bagna, si_sporca, colpisce_altro, scappa_via, resta_incastrato,
   figuraccia (pubblico ≥ 3), scoperto (roba illegale). Il guasto è un fatto (tipo «guasto», con la sua onomatopea) e un cambiamento vero
   (la cosa a terra o in cocci, il livido, lo sporco, il fascicolo). Controlla() dice quali verbi del registro non dichiarano gli esiti.
   I SEGNI DEL CORPO (st.u.cose.corpo[id]): livido, taglio, braccio rotto, KO (n.stun: a terra, si vede), sporco, bagnato, bruciatura;
   durano, e la Mente li sente (rabbia, niente lavoro col braccio rotto).
   IL DISEGNO: un livello della pagina, come quello dei segni: le cose in volo (la sagoma che gira), le onomatopee (TONF, CRASH, SPLAT,
   SDENG, PLIC), le cose a terra vicine. Costa qualche elemento, mai la camera.
   Le USANZE oltre la funzione (§3.3): sostituto(A, ruolo) riempie un ruolo (colpo, proiettile, scudo, sedile, telo, zattera, elmo) con la
   cosa della borsa che ha le proprietà, con la plausibilità. Tutto dal flusso 'cose' della porta: stesso seme, stessa storia. */
var UnicoCose = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UCo = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UCo;
  if (!ON) return UCo;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const RB = () => (typeof Roba !== 'undefined' && Roba.ON !== false && Roba.di ? Roba : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  if (!G || !Un() || !FT() || !AT()) { UCo.ON = false; return UCo; }
  const W0 = typeof window !== 'undefined' ? window : null;
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
  const rnd = () => Un().flusso('cose');
  const pick = L => L[Math.floor(rnd() * L.length) % L.length];
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const CFG = UCo.CFG = { volo: 12, terra: 40, lontano: 60, lanciabile: 8, cocci: 60, intera: 1440, raccogli: 5, guastiOra: 6, ono: 1.4, disegnaR: 34, segniR: 14 };
  const stats = UCo.stats = { lanci: 0, presi: 0, mancati: 0, altri: 0, rotti: 0, rimbalzi: 0, fuochi: 0, raccolti: 0, guasti: 0, per: {}, ms: 0, msMax: 0, terraMax: 0 };

  // ======================= LO STATO (solo dati) =======================
  function S(st) { const u = st && st.u; if (!u) return null; return u.cose || (u.cose = { volo: [], terra: [], corpo: {}, mano: {}, g: { h: -1, n: 0 }, n: 0, prossimo: 0 }); }
  const npc = (st, id) => (id === 'nino' || id === 'player' ? st.player : G.byId ? G.byId(st, id) : null);
  const nome = (st, id) => { const L = LG(); try { if (L && L.nome) { const s = L.nome(st, id); if (s && s !== String(id)) return s; } } catch (e) { } const n = npc(st, id); return (n && (n.first || n.name)) || 'qualcuno'; };
  function scrivi(st, tipo, chi, dati, causa) {
    if (dati && typeof dati.d === 'string') { const L = LG(); try { if (L && L.concorda) dati.d = L.concorda(dati.d, st, { frase: true, fonte: 'mondo' }); } catch (e) { } }
    let f = null; try { f = FT()._.registra(st, { t: st.t, v: tipo, chi: [].concat(chi).filter(x => x != null).slice(0, 6), causa: typeof causa === 'number' ? causa : null, peso: 1, hop: 0 }, dati, 'unico'); } catch (e) { f = null; }
    return f;
  }
  const quart = (x, y) => { try { return World.districtAt(x, y) || 'q' + Math.floor(x / 300); } catch (e) { return 'q' + Math.floor(x / 300); } };

  // ======================= LA FISICA FINTA: i sei numeri dalle proprietà =======================
  const FIS = {};
  const VIRTUALI = { sasso: { nome: 'sasso', peso: .4, prop: ['rigido', 'piccolo'], mat: 'pietra' }, cocci: { nome: 'cocci', peso: .2, prop: ['appuntito', 'fragile'], mat: 'vetro' }, cappello: { nome: 'cappello', peso: .2, prop: ['stoffa', 'vestito'], mat: 'molle' }, monete: { nome: 'monete', peso: .05, prop: ['metallo', 'piccolo', 'prezioso'], mat: 'metallo' } };
  function voce(id) { const R = RB(); const e = R ? R.di(id) : null; if (e) return e; return VIRTUALI[id] || null; }
  function fisica(id) {
    if (FIS[id]) return FIS[id];
    const e = voce(id) || { nome: id, peso: 1, prop: [] }, P = new Set(e.prop || []), has = p => P.has(p);
    let kg = +e.peso || 1; if (has('piccolo')) kg = Math.min(kg, .5); if (has('pesante')) kg = Math.max(kg, 4);
    const molle = has('stoffa') || has('commestibile') && !has('contenitore') || has('carta');
    const mat = e.mat || (has('fragile') && (has('contenitore') || /vetro|bottigl|lampad/.test(e.nome)) ? 'vetro' : has('metallo') ? 'metallo' : has('legno') ? 'legno' : molle ? 'molle' : has('liquido') ? 'liquido' : 'pietra');
    const f = { kg: r2(kg), rimb: molle || has('liquido') ? 0 : has('metallo') || has('rigido') ? .5 : has('legno') ? .35 : .2,
      rompe: has('fragile') ? 'urto' : has('legno') && has('rigido') ? 'forte' : 'mai', dannoK: (has('appuntito') ? 1.6 : 1) * (has('metallo') ? 1.3 : 1) * (molle ? .2 : 1),
      sporca: has('liquido') || has('commestibile'), fuoco: has('infiammabile') && has('liquido') && has('contenitore'), lungo: has('lungo'), appuntito: has('appuntito'),
      lanciabile: kg <= CFG.lanciabile, mat, nome: e.nome || id, arma: has('arma'), gun: !!(typeof Azioni !== 'undefined' && Azioni.ITEMS && Azioni.ITEMS[id] && Azioni.ITEMS[id].gun) || /^(pistola|lupara|mitra|fucile)$/.test(id) };
    return (FIS[id] = f);
  }
  // l'onomatopea: il materiale del proiettile per quello che prende
  const ONO = { vetro: ['CRASH', 'CRASH', 'CRASH'], metallo: ['SDENG', 'CLANG', 'TONK'], legno: ['TOC', 'TONF', 'TUNK'], molle: ['SPLAT', 'PLAF', 'SPLAT'], liquido: ['SPLASH', 'SPLASH', 'PLIC'], pietra: ['TONF', 'TOC', 'TAC'] };
  const onoDi = (f, su) => su === 'acqua' ? 'PLUF' : su === 'persona' && f.mat !== 'vetro' && f.mat !== 'molle' ? pick(['SBAM', 'PAF', 'TUNF']) : ONO[f.mat][su === 'muro' ? 1 : su === 'terra' ? 2 : 0];
  // il danno in gradini (0 niente, 1 livido, 2 taglio, 3 braccio rotto, 4 KO)
  function gradoDanno(f, v) { const d = f.kg * v * f.dannoK; return d < 2 ? 0 : d < 6 ? 1 : f.appuntito && d >= 6 ? (d > 14 ? 3 : 2) : d < 14 ? 1 : d < 22 ? 3 : 4; }

  // ======================= I SEGNI DEL CORPO (restano) =======================
  const DURATA = { livido: 1440, taglio: 2880, rotto: 7200, sporco: 240, bagnato: 120, bruciato: 4320, ko: 1 };
  function segna(st, id, k, opt) {
    const n = npc(st, id); if (!n || n.dead) return;
    const s = S(st), c = s.corpo[id] || (s.corpo[id] = {}); c[k] = Math.round(st.t + (DURATA[k] || 60)); c.u = Math.round(st.t);
    const Bi = n === st.player ? null : (n.pop && n.pop.need) || null;
    if (k === 'ko') { n.stun = Math.max(n.stun || 0, 20 + rnd() * 40); c.nko = (c.nko || 0) + 1; }
    if (Bi && (k === 'livido' || k === 'taglio' || k === 'rotto' || k === 'sporco')) Bi.rabbia = clamp((Bi.rabbia || 0) + (k === 'sporco' ? .08 : .15), 0, 1);
    if (k === 'rotto') { const M = ME() && ME().mente(st, id); if (M && M.nope) M.nope['g:lavorare'] = Math.round(st.t + 7200); }
    if (k === 'taglio' || k === 'rotto') { const M = ME() && ME().mente(st, id); if (M && M.nope) M.nope['g:divertirsi'] = Math.round(st.t + 240); }
    if (Object.keys(s.corpo).length > 400) { for (const q in s.corpo) { const x = s.corpo[q]; if (st.t - (x.u || 0) > 7200) delete s.corpo[q]; } }
  }
  const segniDi = (st, id) => { const c = st.u && st.u.cose && st.u.cose.corpo[id]; if (!c) return []; return Object.keys(DURATA).filter(k => k !== 'ko' && c[k] > st.t); };
  UCo.segna = segna; UCo.segniDi = segniDi;

  // ======================= IN MANO =======================
  function mano(st, id, cosa, sec) {
    const n = npc(st, id); if (!n || n === st.player || n.dead) return false; const s = S(st), m = s.mano[n.id];
    if (n.hand && !(m && m[0] === n.hand) && n.hand !== cosa) return false;   // ha già in mano qualcosa di suo
    n.hand = cosa; s.mano[n.id] = [cosa, r1(st.clock + (sec || 4))]; return true;
  }
  UCo.mano = mano;
  function manoGiro(st, s) { for (const id in s.mano) { const [k, t] = s.mano[id]; if (st.clock < t) continue; const n = npc(st, id); if (n && n.hand === k) n.hand = null; delete s.mano[id]; } }

  // ======================= LE COSE A TERRA =======================
  function aTerra(st, cosa, x, y, rotto, chi) {
    const s = S(st), q = quart(x, y), L = s.terra; const qq = L.filter(e => e[5] === q);
    if (qq.length >= CFG.terra) { const i = L.indexOf(qq[0]); if (i >= 0) L.splice(i, 1); }
    L.push([rotto ? 'cocci' : cosa, r1(x), r1(y), Math.round(st.t), rotto ? cosa : 0, q, chi || null]);
    if (L.length > stats.terraMax) stats.terraMax = L.length;
  }
  UCo.aTerra = aTerra;
  // la cosa a terra più vicina (per raccogliere, per i desideri): [i, e, d]
  function vicinaTerra(st, x, y, r, filtro) { const L = (st.u.cose || { terra: [] }).terra; let best = null, bd = r || 8; for (let i = 0; i < L.length; i++) { const e = L[i]; if (filtro && !filtro(e)) continue; const d = hyp(e[1] - x, e[2] - y); if (d < bd) { bd = d; best = [i, e, d]; } } return best; }
  UCo.vicinaTerra = vicinaTerra;
  function raccogli(st, id, i) {
    const s = S(st), e = s.terra[i]; if (!e) return null; const A = AT().di(st, npc(st, id)); if (!A) return null;
    s.terra.splice(i, 1); if (e[0] !== 'cocci' && voce(e[0]) && !VIRTUALI[e[0]]) A.borsa.add(e[0], 1); if (e[0] === 'monete') A.soldi = r1((A.soldi || 0) + 1); stats.raccolti++;
    mano(st, id, e[0] === 'cocci' ? null : e[0], 2);
    return scrivi(st, 'raccoglie', [id, e[6]].filter(Boolean), { d: `${nome(st, id)} ha raccolto ${art(e[0], 'ind')} da terra${e[6] && e[6] !== id ? ' (era di ' + nome(st, e[6]) + ')' : ''}`, cosa: e[0], x: e[1], y: e[2] }, null);
  }
  UCo.raccogli = raccogli;
  const aN = w => { const L = LG(); try { if (L && L.a) return L.a(w); } catch (e) { } return 'a ' + w; };
  const art = (k, t) => { const L = LG(); try { if (L && L.art) return L.art(k, t); } catch (e) { } return (t === 'ind' ? 'un ' : 'il ') + k; };

  // ======================= IL LANCIO =======================
  // lancia(st, chi, cosa, bersaglio: id | {x, y}, opt: { causa, forza (senza averla in borsa: un sasso raccattato) }) → il volo o l'esito
  function lancia(st, chi, cosa, bers, opt) {
    opt = opt || {}; const n = npc(st, chi); if (!n || n.dead) return null;
    const A = AT().di(st, n), f = fisica(cosa); if (!f.lanciabile) return null;
    if (!opt.forza && !(A.borsa.get(cosa) >= 1)) return null;
    if (!opt.forza) A.borsa.togli(cosa, 1);
    const T = typeof bers === 'object' && bers ? null : npc(st, bers), tx = T ? T.x : bers.x, ty = T ? T.y : bers.y;
    const d = Math.max(1, hyp(tx - n.x, ty - n.y)), p = clamp(.88 - d * .035 - f.kg * .03, .12, .92), preso = !!T && rnd() < p;
    let ex = tx, ey = ty; if (!preso) { const a = rnd() * 6.283, r = 1.2 + rnd() * 3.2; ex += Math.cos(a) * r; ey += Math.sin(a) * r; }
    const s = S(st), v = { k: cosa, o: n.id, b: T ? (T === st.player ? 'nino' : T.id) : null, x0: r1(n.x), y0: r1(n.y), x1: r1(ex), y1: r1(ey), t0: r2(st.clock), T: r2(clamp(d / 11, .35, 1.3)), h: r1(.6 + d * .07), p: preso ? 1 : 0, c: opt.causa || null, n: ++s.n };
    n.face = Math.atan2(ty - n.y, tx - n.x); n.gesture = .4; mano(st, n.id, cosa, .5); stats.lanci++;
    const lontano = !st.player || hyp(n.x - st.player.x, n.y - st.player.y) > CFG.lontano || typeof document === 'undefined';
    if (lontano) return atterra(st, v);
    if (s.volo.length >= CFG.volo) atterra(st, s.volo.shift());
    s.volo.push(v); return v;
  }
  UCo.lancia = lancia;
  const isB = (x, y) => { try { const T = G.T, i = Math.floor(y / G.TS) * G.GW + Math.floor(x / G.TS); return !!(G.MAP && G.MAP.grid && G.MAP.grid[i] === T.BLD); } catch (e) { return false; } };
  function atterra(st, v) {
    const f = fisica(v.k), vel = r1(hyp(v.x1 - v.x0, v.y1 - v.y0) / v.T); let x = v.x1, y = v.y1, colpito = null, su = 'terra', es = 'meta', rotto = false;
    if (v.p && v.b) { const T = npc(st, v.b); if (T && !T.dead && hyp(T.x - x, T.y - y) < 4) { colpito = v.b; su = 'persona'; es = 'ok'; } }
    if (!colpito) {   // colpisce un altro? (il brigadiere, la vetrina)
      const k = (st.npcs || []).find(q => !q.dead && !q.inside && q.id !== v.o && q.id !== v.b && Math.abs(q.x - x) < 1 && Math.abs(q.y - y) < 1);
      if (k) { colpito = k.id; su = 'persona'; es = 'comico'; stats.altri++; }
      else if (isB(x, y)) { su = 'muro'; es = 'comico'; }
      else if (G.seaM && (() => { try { return G.seaM(x, y); } catch (e) { return false; } })()) su = 'acqua';
    }
    const ono = onoDi(f, su);
    if (colpito) { const g = gradoDanno(f, vel); if (g >= 4) segna(st, colpito, 'ko'); else if (g === 3) segna(st, colpito, 'rotto'); else if (g === 2) segna(st, colpito, 'taglio'); else if (g === 1) segna(st, colpito, 'livido'); if (f.sporca) segna(st, colpito, 'sporco'); const k = npc(st, colpito); if (k && k !== st.player) k.stun = Math.max(k.stun || 0, .5); else if (k === st.player && G.damagePlayer && f.kg > .3) { try { G.damagePlayer(st, Math.min(8, 2 + f.kg * vel * .3), Math.atan2(v.y1 - v.y0, v.x1 - v.x0), v.o); } catch (e) { } } stats.presi++; }
    else stats.mancati++;
    if (f.rompe === 'urto' || f.rompe === 'forte' && vel > 9) rotto = true;
    if (f.fuoco && su !== 'acqua') { st.fires.push({ x, y, r: 2.2, until: st.clock + 30 + rnd() * 30, owner: v.o === 'nino' ? 'player' : v.o }); stats.fuochi++; rotto = true; }
    // il rimbalzo: 1-2 parabole basse nella stessa direzione, sul suolo
    let nr = 0; if (!rotto && f.rimb > 0 && su !== 'acqua' && su !== 'persona') { const a = Math.atan2(v.y1 - v.y0, v.x1 - v.x0) + (su === 'muro' ? Math.PI : 0); nr = f.rimb > .4 ? 2 : 1; const L = vel * f.rimb * .25 * nr; x = r1(x + Math.cos(a) * L); y = r1(y + Math.sin(a) * L); stats.rimbalzi++; }
    if (rotto) stats.rotti++;
    if (su !== 'acqua') aTerra(st, v.k, x, y, rotto, v.o);
    const s = S(st); if (st.player && typeof document !== 'undefined') ONOV.push({ x, y, w: ono, t: (st.clock || 0) + CFG.ono });
    if (ONOV.length > 8) ONOV.shift();
    const chi = [v.o].concat(colpito ? [colpito] : []), cn = art(v.k, 'ind');
    const d = colpito ? `${nome(st, v.o)} ha tirato ${cn} ${v.b && colpito !== v.b ? aN(nome(st, v.b)) + ', ma ha preso ' + nome(st, colpito) : aN(nome(st, colpito))}: ${ono}!` : `${nome(st, v.o)} ha tirato ${cn}${v.b ? ' ' + aN(nome(st, v.b)) : ''} e l'ha mancato: ${ono}${su === 'muro' ? ' sul muro' : su === 'acqua' ? ' in acqua' : ' per terra'}${rotto ? ', in mille pezzi' : ''}`;
    const fx = scrivi(st, 'lancio', chi, { d, cosa: v.k, es, ono, su, rotto: rotto ? 1 : 0, x, y, mira: v.b || null }, v.c);
    stats.per[es] = (stats.per[es] || 0) + 1;
    return fx;
  }

  // ======================= I GUASTI: il fallimento comico per proprietà (§2.1) =======================
  // [chiave, quando(f, e, n) → peso, effetto(st, f, e, n) → onomatopea, la riga]; f il fatto fallito, e la fisica della cosa (o null)
  const GUASTI = UCo.GUASTI = [
    ['si_rompe', (f, e) => (e && e.rompe !== 'mai' ? 1.4 : 0), (st, f, e, n) => { const A = AT().di(st, n); A.borsa.togli(f.cosa, 1); aTerra(st, f.cosa, n.x + .5, n.y, true, n.id); return ['CRAC', `${art(f.cosa, 'det')} gli si è rotto in mano`]; }],
    ['si_sporca', (f, e) => (e && e.sporca ? 1 : /dipinge|ricetta|^fa$|mangia|beve/.test(f.v) ? .5 : 0), (st, f, e, n) => { segna(st, n.id, 'sporco'); return ['SPLAT', 'si è sporcato da capo a piedi']; }],
    ['si_bagna', f => (/pesca|acqua/.test(f.v + (f.x && f.x.msg || '')) ? 1.2 : 0), (st, f, e, n) => { segna(st, n.id, 'bagnato'); return ['PLUF', 'è finito a bagno']; }],
    ['cade', f => (/vai|muovi|presidia|costruisce|smonta|salta|arrampica/.test(f.v + (f.x && f.x.verbo || '')) ? 1 : .2), (st, f, e, n) => { n.stun = Math.max(n.stun || 0, 1.5); if (rnd() < .3) segna(st, n.id, 'livido'); return ['TONF', 'è inciampato ed è finito lungo per terra']; }],
    ['scappa_via', (f, e) => (e && e.kg < 1.5 && f.cosa ? .9 : 0), (st, f, e, n) => { const A = AT().di(st, n); if (A.borsa.togli(f.cosa, 1)) { const a = rnd() * 6.28; aTerra(st, f.cosa, n.x + Math.cos(a) * 4, n.y + Math.sin(a) * 4, false, n.id); } return ['', `${art(f.cosa, 'det')} gli è scappato di mano ed è rotolato via`]; }],
    ['resta_incastrato', (f, e) => (e && e.lungo ? 1 : /entra|esce|porta/.test(f.v) ? .6 : 0), (st, f, e, n) => { n.stun = Math.max(n.stun || 0, 3); return ['CRIC', 'è rimasto incastrato e ha dovuto chiedere aiuto']; }],
    ['monete', f => (/compra|vend|salda|presta|prestito|paga/.test(f.v + (f.x && f.x.verbo || '')) ? 1.2 : .15), (st, f, e, n) => { const A = AT().di(st, n); if (!(A.soldi >= 1)) return null; A.soldi = r1(A.soldi - 1); const a = rnd() * 6.28; aTerra(st, 'monete', n.x + Math.cos(a) * 2.5, n.y + Math.sin(a) * 2.5, false, n.id); return ['DLIN', 'gli sono cadute le monete, e sono rotolate sotto una panchina']; }],
    ['perde_cappello', f => .25, (st, f, e, n) => { aTerra(st, 'cappello', n.x + 1.5, n.y + .5, false, n.id); return ['FIUU', 'una folata gli ha portato via il cappello']; }],
    ['colpisce_altro', (f, e) => (e && (e.lungo || e.kg > 1) ? .8 : .25), (st, f, e, n) => { const k = (st.npcs || []).find(q => q !== n && !q.dead && !q.inside && Math.abs(q.x - n.x) < 2.5 && Math.abs(q.y - n.y) < 2.5); if (!k) return null; segna(st, k.id, 'livido'); f.__altro = k.id; return ['SBAM', `girandosi ha preso in pieno ${nome(st, k.id)}`]; }],
    ['figuraccia', f => ((f.test || []).length >= 3 ? 1.1 : 0), (st, f, e, n) => { const R = typeof UnicoRissa !== 'undefined' && UnicoRissa.ON ? UnicoRissa : null; if (R && R.rep) R.rep(st, n.id, 'ridicolo', .1); return ['AHAH', `tutti a ridere: ${(f.test || []).length} persone hanno visto`]; }],
    ['scoperto', (f, e) => (e && f.cosa && voce(f.cosa) && (voce(f.cosa).prop || []).includes('illegale') ? 2 : 0), (st, f, e, n) => { const R = typeof UnicoRissa !== 'undefined' && UnicoRissa.ON ? UnicoRissa : null; if (R && R.fascicolo) R.fascicolo(st, n.id, 1, f.id); return ['EHI!', `l'hanno visto con ${art(f.cosa, 'ind')}: c'è chi lo dirà ai Grigi`]; }],
  ];
  // guasto(st, f): il fatto fallito → un guasto concreto (un fatto «guasto»), o null
  function guasto(st, f, forza) {
    const s = S(st), h = Math.floor(st.t / 60); if (s.g.h !== h) { s.g.h = h; s.g.n = 0; }
    if (!forza && s.g.n >= CFG.guastiOra) return null; if (f.x && f.x.verbo === 'rinuncia') return null;
    const n = npc(st, f.chi); if (!n || n === st.player || n.dead || n.inside) return null;
    const e = f.cosa ? fisica(f.cosa) : null; const L = GUASTI.map(g => [g, g[1](f, e, n) * (.5 + rnd())]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    for (const [g] of L) {
      let r = null; try { r = g[2](st, f, e, n); } catch (er) { r = null; } if (!r) continue;
      s.g.n++; stats.guasti++; stats.per[g[0]] = (stats.per[g[0]] || 0) + 1;
      if (r[0] && st.player && hyp(n.x - st.player.x, n.y - st.player.y) < CFG.lontano && typeof document !== 'undefined') { ONOV.push({ x: n.x, y: n.y, w: r[0], t: (st.clock || 0) + CFG.ono }); if (ONOV.length > 8) ONOV.shift(); }
      return scrivi(st, 'guasto', [n.id].concat(f.__altro ? [f.__altro] : []), { d: `${nome(st, n.id)}${f.x && f.x.verbo ? ' voleva ' + (VERBO_INF[f.x.verbo] || f.x.verbo.replace(/_/g, ' ')) : ''}: ${r[1]}`, g: g[0], ono: r[0], cosa: f.cosa || null, verbo: f.x && f.x.verbo || f.v, es: 'comico' }, f.id);
    }
    return null;
  }
  UCo.guasto = guasto;
  const VERBO_INF = { compra: 'comprare', vendi: 'vendere', pesca: 'pescare', regala: 'fare un regalo', presta: 'prestare dei soldi', chiedi_prestito: 'farsi prestare dei soldi', salda: 'saldare il debito', mangia: 'mangiare', bevi: 'bere', fai_ricetta: 'fare un lavoretto', costruisci: 'costruire', dipingi_muro: 'dipingere il muro', vai: 'andare', insulta: 'dirgliene quattro', guarda_storto: 'guardarlo storto', spingi: 'dargli uno spintone', minaccia_con: 'minacciarlo', picchia: 'menarlo', scusati: 'chiedere scusa', paga: 'offrire da bere', desiderio: 'farcela', presidia: 'tenere la barricata', costruisce: 'costruire', entra: 'entrare', prendi: 'prendere la roba', dai: 'dare la roba', baratta: 'barattare', chiacchiera: 'chiacchierare', rinfaccia: 'rinfacciare', lancia: 'tirare la roba', raccogli: 'raccogliere' };
  // il contratto: i verbi del registro senza esiti dichiarati (§2.1): per la lista, non per bloccare
  function controlla() { const V = VB(); if (!V) return []; const out = []; for (const k in V.SCHEDE) { const S0 = V.SCHEDE[k]; if (!S0.segno) out.push(k + ': senza segno'); else if (!S0.esiti) out.push(k + ': esiti dal contratto generico (GUASTI)'); } return out; }
  UCo.controlla = controlla;

  // ======================= LE USANZE OLTRE LA FUNZIONE (§3.3) =======================
  // ruolo → [proprietà che servono (tutte), proprietà che aiutano (punti)]
  const RUOLI = UCo.RUOLI = { colpo: [[], ['rigido', 'pesante', 'lungo', 'metallo', 'attrezzo', 'legno']], lama: [['appuntito'], ['metallo', 'arma']], proiettile: [[], ['rigido', 'fragile', 'piccolo', 'commestibile']],
    scudo: [['rigido'], ['metallo', 'legno', 'pesante', 'contenitore']], sedile: [['rigido'], ['legno', 'contenitore', 'mobile']], telo: [['stoffa'], ['lungo']], elmo: [['contenitore'], ['metallo', 'rigido']], zattera: [['legno'], ['rigido', 'pesante']], esca: [['commestibile'], []] };
  function sostituto(A, ruolo, esclusi) {
    const R = RUOLI[ruolo]; if (!R || !A) return null; let best = null, bs = 0;
    for (const [k, q] of A.borsa) {
      if (q < 1 || (esclusi && esclusi.has(k))) continue; const e = voce(k); if (!e) continue; const P = new Set(e.prop || []);
      if (!R[0].every(p => P.has(p))) continue; let s = .3 + R[1].filter(p => P.has(p)).length * .25;
      if (ruolo === 'proiettile' && !fisica(k).lanciabile) continue; if (ruolo === 'colpo' && fisica(k).kg < .3) continue;
      if (s > bs) { bs = s; best = [k, r2(Math.min(1, s))]; }
    }
    return best;
  }
  UCo.sostituto = sostituto;
  // l'arma più forte che uno ha (mano, arma della fazione, borsa): il gradino massimo della scala (§4.2)
  function armaDi(st, n) {
    if (!n || n === st.player) return null; const A = AT().di(st, n); let best = null, bl = 0;
    const prova = k => { if (!k) return; const f = fisica(k); const l = f.gun ? 7 : f.appuntito || /coltell/.test(k) ? 6 : f.arma || f.lungo || f.kg >= 1.5 ? 5 : 0; if (l > bl) { bl = l; best = k; } };
    prova(n.weapon && n.weapon !== 'guardia' ? n.weapon : null); prova(n.hand); if (A) for (const [k, q] of A.borsa) if (q >= 1) prova(k);
    return best ? [best, bl] : null;
  }
  UCo.armaDi = armaDi;

  // ======================= LA FASE =======================
  function fase(st) {
    const s = S(st); if (!s || !st.npcs) return; const t0 = now();
    for (let i = s.volo.length - 1; i >= 0; i--) { const v = s.volo[i]; if (st.clock >= v.t0 + v.T || st.clock < v.t0 - 5) { s.volo.splice(i, 1); atterra(st, v); } }
    manoGiro(st, s);
    if (st.t >= s.prossimo) {
      s.prossimo = Math.round(st.t + CFG.raccogli);
      // le cose a terra invecchiano; chi passa accanto le raccoglie (le cose intere, chi ha le mani libere)
      s.terra = s.terra.filter(e => st.t - e[3] < (e[0] === 'cocci' ? CFG.cocci : CFG.intera));
      for (let j = 0; j < 3 && s.terra.length; j++) {
        const i = Math.floor(rnd() * s.terra.length) % s.terra.length, e = s.terra[i]; if (e[0] === 'cocci') continue;
        const k = st.npcs.find(q => !q.dead && !q.inside && q.pop && !q.cop && !q.hand && q.id !== e[6] && Math.abs(q.x - e[1]) < 2.5 && Math.abs(q.y - e[2]) < 2.5);
        if (k && rnd() < .6) raccogli(st, k.id, i);
      }
    }
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.cose', { dopo: 'unico.verbi', budget: { p95: .03 } }, fase);
  if (Un().nasce) Un().nasce('cose', st => { S(st); });

  // ======================= I VERBI DEL REGISTRO: lancia, raccogli (la stessa porta di tutti) =======================
  const V = VB();
  if (V && V.registra) {
    Object.assign(V.COND, {
      lanciabile: (c, k) => { const id = V._.val(k, c); return id && fisica(id).lanciabile ? '' : 'Pesa troppo per tirarla.'; },
      a_terra: (c, r) => (vicinaTerra(c.st, c.A.x, c.A.y, +r || 3, e => e[0] !== 'cocci') ? '' : 'Qui per terra non c\'è niente.'),
    });
    Object.assign(V.EFF, {
      lancio: (c, k, chi) => { const id = V._.val(k, c), b = V._.val(chi, c); const f = lancia(c.st, c.A.id, id, b != null ? b : { x: c.A.x + 4, y: c.A.y }, { causa: null }); if (!f) throw new Error('niente da tirare'); c.r = { es: 'ok' }; },
      raccolta: (c, r) => { const x = vicinaTerra(c.st, c.A.x, c.A.y, +V._.val(r, c) || 3, e => e[0] !== 'cocci'); if (!x) throw new Error('niente per terra'); const s = S(c.st), e = s.terra.splice(x[0], 1)[0]; if (voce(e[0]) && !VIRTUALI[e[0]]) c.A.borsa.add(e[0], 1); if (e[0] === 'monete') c.A.soldi = r1((c.A.soldi || 0) + 1); stats.raccolti++; c.r = { cosa: e[0], es: 'ok' }; },
    });
    V.registra('lancia', { fam: 'forza', args: { cosa: 'roba', chi: 'attore?' }, pre: [['vivo'], ['ha', '$cosa', 1], ['lanciabile', '$cosa']], eff: [['lancio', '$cosa', '$chi']],
      costo: { min: .2, rischio: .3 }, posa: 'porge', oggetto: '$cosa', segno: { bolla: ['esclamativo', '$cosa'], cambia: 'terra' }, fatto: 'tira', menu: false, con: ['$chi'],
      esiti: { ok: 'preso', meta: 'mancato, la cosa a terra', comico: 'preso un altro o la vetrina', colto: 'l\'hanno visto: il torto', no: 'GUASTI' } });
    V.registra('raccogli', { fam: 'roba', args: { r: 'n?' }, pre: [['vivo'], ['fuori'], ['a_terra', 3]], eff: [['raccolta', 3]], costo: { min: .5 }, posa: 'raccoglie', segno: { bolla: ['mano', '$cosa'], cambia: 'terra' },
      fatto: 'raccoglie', menu: false, esiti: { ok: 'la cosa in borsa', no: 'GUASTI' } });
  }

  // ======================= I SEGNI (i tipi nuovi) =======================
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    lancio: { p: 'esclamativo', w: '$ono', gz: .55, n: ['lancio', 'lanci'] }, tira: { p: 'esclamativo', w: '$cosa', gz: 0, n: ['tiro', 'tiri'], bolla: false },
    guasto: { p: 'esclamativo', w: '$ono', posa: 'discute', gz: .5, n: ['disastro', 'disastri'] }, raccoglie: { p: 'mano', w: '$cosa', posa: 'raccoglie', gz: .1, n: ['cosa raccolta', 'cose raccolte'] },
  });
  { const Fg = FT().GRAV; if (Fg) Object.assign(Fg, { lancio: .55, guasto: .45, raccoglie: .15 }); const O = FT().OFFESE; if (O) Object.assign(O, { lancio: [0, 1, .4] }); }

  // ======================= IL DISEGNO (un livello della pagina, come i segni) =======================
  const ONOV = [];
  const CSS = ['#unico-cose{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:5}',
    '#unico-cose .uc-v{position:absolute;left:0;top:0;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #16121B;background:#DC9A34;border-radius:3px}',
    '#unico-cose .uc-v.lungo{width:26px;height:6px;margin:-3px 0 0 -13px;background:#8a6a42}',
    '#unico-cose .uc-t{position:absolute;left:0;top:0;width:8px;height:5px;margin:-2px 0 0 -4px;background:#D2C2A6;border:1px solid #16121B;border-radius:2px;opacity:.85}',
    '#unico-cose .uc-t.cocci{background:#A3D4D8;width:9px;height:3px}',
    '#unico-cose .uc-o{position:absolute;left:0;top:0;font:900 26px/1 Impact,"Arial Black",sans-serif;color:#F2E7CF;-webkit-text-stroke:2px #16121B;text-shadow:3px 3px 0 #C25B36;white-space:nowrap;transform-origin:50% 100%}',
    '#unico-cose .uc-c{position:absolute;left:0;top:0;font:600 12px/1 sans-serif;color:#16121B;background:#F2E7CF;border:1px solid #16121B;padding:1px 3px;border-radius:2px;white-space:nowrap}'].join('\n');
  const DOM = { L: null, pool: [], css: false };
  const SEGNO_W = { livido: 'livido', taglio: 'cerotto', rotto: 'gesso al braccio', sporco: 'sporco', bagnato: 'fradicio', bruciato: 'bruciato' };
  function el(i) { let e = DOM.pool[i]; if (!e) { e = document.createElement('div'); e.hidden = true; DOM.L.appendChild(e); DOM.pool.push(e); } return e; }
  function metti(e, cls, txt, X, Y, rot) { if (e.hidden) e.hidden = false; if (e.__c !== cls) { e.__c = cls; e.className = cls; } if (e.__t !== txt) { e.__t = txt; e.textContent = txt; } const T = `translate(${Math.round(X)}px,${Math.round(Y)}px)${rot ? ' rotate(' + r2(rot) + 'rad)' : ''}`; if (e.__x !== T) { e.__x = T; e.style.transform = T; } }
  function disegna() {
    const pv = W0.__pv, st = pv && pv.st, R = W0.Render || (pv && pv.R); if (!DOM.L || !st || !st.u || !st.u.cose || !R || !R.project) return;
    const p = st.player, W = DOM.L.clientWidth, H = DOM.L.clientHeight, s = st.u.cose; let i = 0;
    const spento = (pv.ui && pv.ui.intro) || W0.__pulita || p.indoor || (p.lv && p.lv.k === 'ug');
    if (!spento) {
      for (const v of s.volo) { if (i >= 14) break; const k = clamp((st.clock - v.t0) / v.T, 0, 1), x = v.x0 + (v.x1 - v.x0) * k, y = v.y0 + (v.y1 - v.y0) * k, z = 1.6 + (v.h * 4 * k * (1 - k)) - 1.6 * k; const pr = R.project(x, Math.max(.1, z), y); if (pr.behind) continue; metti(el(i++), 'uc-v' + (fisica(v.k).lungo ? ' lungo' : ''), '', pr.x * W, pr.y * H, st.clock * 14); }
      let nt = 0; for (const e of s.terra) { if (nt >= 14 || i >= 40) break; if (Math.abs(e[1] - p.x) > CFG.disegnaR || Math.abs(e[2] - p.y) > CFG.disegnaR) continue; const pr = R.project(e[1], .05, e[2]); if (pr.behind || pr.x < 0 || pr.x > 1 || pr.y < 0 || pr.y > 1) continue; nt++; metti(el(i++), 'uc-t' + (e[0] === 'cocci' ? ' cocci' : ''), '', pr.x * W, pr.y * H, 0); }
      for (const o of ONOV) { if (o.t <= st.clock || i >= 48) continue; const pr = R.project(o.x, 1.8, o.y); if (pr.behind) continue; const a = 1 - (o.t - st.clock) / CFG.ono; metti(el(i++), 'uc-o', o.w, pr.x * W - 30, pr.y * H - 30 - a * 18, -.12); }
      let nc = 0; for (const id in s.corpo) { if (nc >= 6 || i >= 54) break; const n = npc(st, id); if (!n || n === p || n.dead || n.inside || Math.abs(n.x - p.x) > CFG.segniR || Math.abs(n.y - p.y) > CFG.segniR) continue; const L = segniDi(st, id); if (!L.length) continue; const pr = R.project(n.x, .9, n.y); if (pr.behind) continue; nc++; metti(el(i++), 'uc-c', L.map(k => SEGNO_W[k]).join(' · '), pr.x * W + 12, pr.y * H, 0); }
    }
    for (; i < DOM.pool.length; i++) if (!DOM.pool[i].hidden) DOM.pool[i].hidden = true;
  }
  function installa() {
    const pronto = () => { const B = document.getElementById('bubbles'); if (!B || !B.parentNode) return false; const L = document.createElement('div'); L.id = 'unico-cose'; B.parentNode.insertBefore(L, B); DOM.L = L;
      const c = document.createElement('style'); c.textContent = CSS; (document.head || document.documentElement).appendChild(c);
      const giro = (ts) => { if (!(typeof Cinema !== 'undefined' && Cinema.saltato(ts))) try { disegna(); } catch (e) { if (!giro.e) { giro.e = 1; console.warn('[UnicoCose]', e); } } requestAnimationFrame(giro); }; requestAnimationFrame(giro); return true; };
    const t = setInterval(() => { if (pronto()) clearInterval(t); }, 300);
  }
  if (typeof document !== 'undefined' && document.createElement && typeof requestAnimationFrame !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installa); else installa(); }

  Object.assign(UCo, { S, fisica, voce, lancia, atterra, guasto, sostituto, armaDi, controlla, aTerra, raccogli, vicinaTerra, fase, onoDi, ONOV, _: { gradoDanno, art, nome, scrivi, npc, quart, VERBO_INF } });
  Un().Cose = UCo;
  return UCo;
})();
if (typeof window !== 'undefined') window.UnicoCose = UnicoCose;
