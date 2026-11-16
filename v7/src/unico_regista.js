/* [unico] unico_regista.js: IL REGISTA (progetto: commedia/REGISTA_E_VOCABOLARIO.md §C, §T.3; la consegna: commedia/REGISTA_CONSEGNA.md).
   Dietro ?commedia. Spento il flag: Regista = { ON: false } e nient'altro (nessuna fase, nessun innesto nella Mente).

   LA SPINA DORSALE SONO I FILI (vedi «I FILI» più giù): storie aperte cucite in modo incrementale da TUTTI i fatti di st.u.fatti (per
   causa, per famiglia di tipo, per chiave, per attori in comune), con partecipanti, tensione, domanda aperta e colpi. Il regista spinge,
   incrocia, raffredda e ripaga i FILI; le 7 storylet di unico_storie.js sono solo SEMI, usati quando il paese è tranquillo (nessun filo
   vivo). La scheda «Storie» elenca i fili con il titolo fatto dai loro fatti («Il debito di Totò con Aldo»).
   CHE COSA FA. Batte ogni 10 minuti di gioco, in una fase sua ('unico.regia', dopo la memoria e prima della mente). A ogni battito:
     1. LEGGE i fatti nuovi (dall'ultimo id visto) e aggiorna le tensioni: Tq per quartiere (World.districtAt; −25% l'ora), Tp per
        persona (−20% l'ora), Tg per gruppo (la banda, il cast di ogni storia); l'attenzione del giocatore per persona (−20% al giorno)
        e la noia (da quanto non vede un fatto);
     2. AVANZA le storie attive: il fatto atteso dal passo è arrivato? (tipo e attori) → il passo dopo o il ramo; scaduto → la chiusura
        di ripiego;
     3. MISURA lo scarto fra la tensione voluta (il carattere × l'ora × il respiro dopo un picco visto) e quella vera;
     4. FA UNA SOLA OPERAZIONE: scarto > .15 → SEMINA (o SPINGI); scarto < −.15 → RAFFREDDA; una storia appena chiusa o nessuna
        attiva → SEMINA; sempre, se capita: INCROCIA e RIPAGA (i richiami).
   LE TRE LEVE, E NESSUN'ALTRA (§C.2): (1) le SPINTE nella Mente (Mente.innesti.spinta: ×.6..×1.6 su un obiettivo di una persona, per un
   tempo); (2) le RADICI del mondo (una scena di Eventi vicino al giocatore, se la scheda ne ha una); (3) la SCELTA DEGLI INTERPRETI.
   Non sposta nessuno e non fa fare niente a nessuno: se la Mente non vuole, la storia scade e si chiude «sfumata».
   I SEGNI: i fatti 'storia_seme', 'storia_svolta', 'storia_fine', 'storia_incrocio', 'storia_richiamo' (Segni.TIPI: bolla, Cronaca,
   Gazzetta delle 7, e il Si dice quando qualcuno li racconta), più la scheda «Storie» nel Taccuino (Città).
   LO STATO in st.u.regia, solo dati (si salva con st.u): { v, carattere, impronta, ultimo, prossimo, tens: { q, p, g }, att, visto,
   respiro, attive: [...], chiuse: [...≤200], cool, usi, reg, spinte: { id: [[g, x, fino, sid]] }, budget, richiami, n, ops }.
   IL CASO: il flusso 'regia' della porta (sfc32 a seme in st.u.rng.regia). Niente Math.random, niente tempo reale nelle scelte.
   LE ENTRATE: Regista.stato(st), Regista.carattere(st, k), Regista.tq(st, x, y), Regista.spinteDi(st, id), Regista.ruoloDi(st, id),
   Regista.storie(st), Regista.controlla(), Regista.forza(st, k, f?) (le prove: semina subito una storia), Regista.CFG, Regista.stats. */
var Regista = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Regista = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Regista;
  if (!ON) return Regista;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null) || (typeof Mente !== 'undefined' && Mente.OBIETTIVI ? Mente : null); return M && M.ON ? M : null; };   // non Mente: nel gioco quello è mente.js; la Mente unica è MenteUnica (Unico.Mente)
  const SG = () => (typeof Segni !== 'undefined' && Segni.ON ? Segni : null);
  const AT = () => (typeof Attore !== 'undefined' && Attore.ON ? Attore : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const ST = () => (typeof UnicoStorie !== 'undefined' && UnicoStorie.ON ? UnicoStorie : null);
  if (!G || !Un() || !FT() || !ME() || !ST()) { Regista.ON = false; return Regista; }
  const SEARCH = typeof location !== 'undefined' ? location.search : '';
  const DEBUG = /[?&]regia\b/.test(SEARCH);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), r2 = x => Math.round(x * 100) / 100;
  const CARD = ST().SCHEDE;

  const CFG = Regista.CFG = {
    battito: 10,                                   // minuti di gioco fra due battiti
    soglia: .15,                                   // lo scarto che fa agire
    attive: { tel: 8, xe: 12, alto: 12 },          // §C.5
    perPersona: 2, semiOra: 2, richiamiGiorno: 2, radiciGiorno: 3, inneschi: 6, fattiBattito: 400,
    spinta: [.6, 1.6],
    decad: { q: .75, p: .8, att: .8 },             // per ora (q, p) e per giorno (att)
    noia: 96,                                      // minuti di gioco senza un fatto visto (≈ 4 minuti reali)
    respiro: 20,                                   // minuti di gioco di respiro dopo un picco visto
    caratteri: {
      goldoni:   { reg: { R: .6, A: .25, S: .15 }, incrocio: .3 },
      fellini:   { reg: { R: .45, A: .25, S: .3 }, incrocio: .5 },
      monicelli: { reg: { R: .55, A: .35, S: .1 }, incrocio: .6 },
    },
  };
  // quanto pesa un tipo di fatto sulla tensione (§C.1): il conflitto sale, la pace scende
  const GT = { rinfacciato: .25, muso: .2, lite: .3, rissa: .6, buca: .15, furto: .4, dipinge_muro: .08, rivendica: .3, barrica: .3, tira_su: .2, presidia: .15,
    sgombero: .8, regalo: -.08, saldato: -.12, restituito: -.1, incontro: -.1, festa: -.2, tregua: -.3, chiacchiera: .01, appuntamento: -.03 };
  const GANCIO_T = { '#lite': .2, '#faida': .3, '#vergogna': .1, '#tregua': -.2, '#amicizia': -.1, '#amore': -.1, '#debito_chiuso': -.1 };
  const stats = Regista.stats = { battiti: 0, semi: 0, spinte: 0, raffredda: 0, incroci: 0, richiami: 0, chiuse: 0, sfumate: 0, radici: 0, ms: 0, msMax: 0, fatti: 0 };

  // ======================= LO STATO =======================
  function S(st) {
    const u = st && st.u; if (!u) return null;
    if (!u.regia) {
      const M = FT()._.M(st), k = (SEARCH.match(/[?&]regista=(goldoni|fellini|monicelli)\b/) || [])[1] || 'goldoni';
      u.regia = { v: 1, carattere: k, impronta: ST().impronta, ultimo: M ? M.n : 0, prossimo: st.t, tUlt: st.t, tens: { q: {}, p: {}, g: {} }, att: {}, visto: st.t, respiro: 0,
        attive: [], chiuse: [], cool: {}, usi: {}, reg: { R: 0, A: 0, S: 0, sett: Math.floor(st.t / 10080) }, spinte: {}, budget: { ora: -1, semi: 0, giorno: -1, richiami: 0, radici: 0 },
        richiami: [], n: 0, ops: [] };
    }
    const R = u.regia;
    if (!R.fili) Object.assign(R, { fili: [], fchiusi: [], nf: 0, fv: 0, fconti: { aperti: {}, chiusi: {}, esiti: {}, origine: {}, lunga: 0, lungaFilo: 0, spinti: 0, calmati: 0, incroci: 0, ripagati: 0, perCausa: 0, perAttori: 0, semi: 0 } });
    if (R.impronta !== ST().impronta) {   // il catalogo è cambiato (§C.7): chi non c'è più si chiude sfumata
      for (const s of R.attive.slice()) if (!CARD[s.k]) chiudi(st, R, s, 'sfumata', null);
      R.impronta = ST().impronta;
    }
    return R;
  }
  const rnd = () => Un().flusso('regia');
  const classe = st => (st.u && st.u.classe) || 'xe';
  const npc = (st, id) => (G.byId ? G.byId(st, id) : null);
  const nome = (st, id) => { try { const A = AT() && AT().di(st, id); if (A && A.nome) return A.nome; } catch (e) { } const n = npc(st, id); return (n && (n.first || n.name)) || 'qualcuno'; };
  const quart = (x, y) => { try { const W = typeof World !== 'undefined' ? World : null; return (W && W.districtAt && W.districtAt(x, y)) || 'città'; } catch (e) { return 'città'; } };
  const attori = f => (f.chi ? [f.chi] : []).concat(f.con || []);
  const io = id => (id === 'player' ? 'nino' : id);

  // ======================= LE TENSIONI E L'ATTENZIONE (§C.1) =======================
  function leggi(st, R) {
    const F = FT(), M = F._.M(st); if (!M) return [];
    const out = []; let id = R.ultimo + 1;
    if (M.n - R.ultimo > CFG.fattiBattito) id = M.n - CFG.fattiBattito + 1;   // troppi (un salto di tempo): si guardano gli ultimi
    for (; id <= M.n; id++) {
      const f = F.di(st, id); if (!f) continue; out.push(f); stats.fatti++;
      const at = attori(f).map(io), gt = GT[f.v] || 0;
      if (gt && f.esito !== 'no' && f.dove && f.dove[0] !== null) { const q = quart(f.dove[0], f.dove[1]); R.tens.q[q] = r2(clamp((R.tens.q[q] || 0) + gt * (f.peso || 1), 0, 1)); }
      if (gt > 0) for (const a of at) if (a !== 'nino') R.tens.p[a] = r2(clamp((R.tens.p[a] || 0) + gt, 0, 1));
      if (f.vis >= 1 && !/^storia_/.test(f.v)) {
        R.visto = st.t;
        const conNino = at.includes('nino');
        for (const a of at) if (a !== 'nino') R.att[a] = r2(Math.min(20, (R.att[a] || 0) + (conNino ? 2 : f.vis === 2 ? 1 : .5)));
        if (gt >= .25 && f.dove && quart(f.dove[0], f.dove[1]) === quart(st.player.x, st.player.y) && (R.tens.q[quart(st.player.x, st.player.y)] || 0) > .6) R.respiro = st.t + CFG.respiro;
      }
    }
    R.ultimo = M.n;
    return out;
  }
  function decadi(st, R) {
    const dt = Math.max(0, st.t - R.tUlt); R.tUlt = st.t; if (!dt) return;
    const kq = Math.pow(CFG.decad.q, dt / 60), kp = Math.pow(CFG.decad.p, dt / 60), ka = Math.pow(CFG.decad.att, dt / 1440);
    for (const T of [[R.tens.q, kq], [R.tens.p, kp], [R.att, ka]]) for (const k in T[0]) { const v = T[0][k] * T[1]; if (v < .02) delete T[0][k]; else T[0][k] = r2(v); }
    // i gruppi: la banda (i membri) e il cast di ogni storia attiva
    const g = {}; let sb = 0, nb = 0;
    for (const n of st.npcs || []) if (n.ris && n.ris.member && !n.dead) { sb += R.tens.p[n.id] || 0; nb++; }
    if (nb) g.banda = r2(sb / nb);
    for (const s of R.attive) { const ids = Object.values(s.ruoli).filter(Boolean); if (ids.length) g['storia:' + s.id] = r2(ids.reduce((a, id) => a + (R.tens.p[id] || 0), 0) / ids.length); }
    R.tens.g = g;
  }
  // la tensione voluta (§C.3): il carattere × l'ora, il respiro dopo un picco, la noia del giocatore
  function voluta(st, R) {
    const h = (st.t % 1440) / 60, d = Math.floor(st.t / 1440); let v;
    if (R.carattere === 'fellini') v = [2, 5].includes(d % 7) ? (h >= 17 ? .7 : h < 7 ? .1 : .35) : (h < 7 ? .1 : .25);
    else if (R.carattere === 'monicelli') v = [.3, .45, .6, .85, .1][d % 5] * (h < 7 ? .4 : 1);
    else v = h < 7 ? .15 : h < 12 ? .25 : h < 17 ? .4 : .5;
    if (R.respiro > st.t) v *= .5;
    if (st.t - R.visto > CFG.noia) v += .15;
    return clamp(v, 0, 1);
  }
  function misura(st, R) {
    const Q = Object.values(R.tens.q), media = Q.length ? Q.reduce((a, b) => a + b, 0) / Q.length : 0;
    const qp = st.player ? R.tens.q[quart(st.player.x, st.player.y)] || 0 : 0;
    return clamp(.5 * qp + .5 * media + Math.min(.25, .04 * R.attive.length), 0, 1);
  }

  // ======================= LE SPINTE (la leva 1) =======================
  function spingiRuoli(st, R, s, P, fino) {
    for (const r in P.spinte || {}) {
      const id = s.ruoli[r], sp = P.spinte[r]; if (!id || !sp) continue;
      const L = R.spinte[id] = (R.spinte[id] || []).filter(e => e[3] !== s.id);
      L.push([sp[0], clamp(sp[1], CFG.spinta[0], CFG.spinta[1]), Math.round(fino), s.id]); stats.spinte++;
    }
    R.ver = (R.ver || 0) + 1;
  }
  function togliSpinte(R, sid) { for (const id in R.spinte) { R.spinte[id] = R.spinte[id].filter(e => e[3] !== sid); if (!R.spinte[id].length) delete R.spinte[id]; } R.ver = (R.ver || 0) + 1; }
  // la vista per la Mente: { g: x, $max } (derivata, non si salva: si rifà quando le spinte cambiano)
  let CACHE = new Map(), CV = -1, CST = null;
  function spinteDi(st, id) {
    const R = st && st.u && st.u.regia; if (!R || !R.spinte[id]) return null;
    if (CV !== R.ver || CST !== st) { CACHE = new Map(); CV = R.ver; CST = st; }
    let o = CACHE.get(id); if (o !== undefined) return o;
    o = { $max: 1 }; let n = 0;
    for (const e of R.spinte[id]) { if (e[2] < st.t) continue; o[e[0]] = clamp((o[e[0]] || 1) * e[1], CFG.spinta[0], CFG.spinta[1]); n++; }
    for (const g in o) if (g !== '$max' && o[g] > o.$max) o.$max = o[g];
    if (!n) o = null; CACHE.set(id, o); return o;
  }

  // ======================= I SEGNI =======================
  const riga = (st, s, t) => (t ? String(t).replace(/\{(\w+)\}/g, (m, k) => (s.ruoli[k] ? nome(st, s.ruoli[k]) : k === 'nessuno' ? 'nessuno' : 'qualcuno')) : null);
  function segna(st, R, s, tipo, testo, causa, x) {
    const F = FT(); if (!testo) return null;
    const chi = Object.values(s.ruoli).filter(Boolean).slice(0, 3); if (!chi.length) return null;
    let f = null;
    try { f = F._.registra(st, { t: st.t, v: tipo, chi, causa: typeof causa === 'number' ? causa : null, peso: 1, hop: 0 }, Object.assign({ d: testo, storia: s.id, k: s.k, regia: 1 }, x || {}), 'unico'); } catch (e) { f = null; }
    if (f) { s.segni++; s.fs.push(f.id); if (s.fs.length > 12) s.fs.shift(); s.ultima = testo; if (f.vis >= 1) s.sa = 1; }
    return f;
  }
  const Sg = SG();
  if (Sg && Sg.TIPI) Object.assign(Sg.TIPI, {
    storia_seme: { p: 'fumetto', gz: 0, n: ['storia che comincia', 'storie che cominciano'] },
    storia_svolta: { p: 'esclamativo', gz: .45, n: ['svolta', 'svolte'] },
    storia_fine: { p: 'esclamativo', gz: .8, n: ['storia finita', 'storie finite'] },
    storia_incrocio: { p: 'frecce', gz: .5, n: ['incrocio', 'incroci'] },
    storia_richiamo: { p: 'fumetto', gz: .3, n: ['ricordo', 'ricordi'] },
  });

  // ======================= LE STORIE: INNESCO, CASTING, PASSI, CHIUSURA =======================
  // gli inneschi per tipo di fatto (derivato: si rifà dal catalogo)
  const PER_TIPO = {}; for (const k in CARD) for (const t of (CARD[k].innesco && CARD[k].innesco.tipo) || []) (PER_TIPO[t] = PER_TIPO[t] || []).push(k);
  function condOk(st, f, se) {
    for (const c of se || []) {
      if (c[0] === 'causa_ril>=') { const g = FT().di(st, f.x && f.x.di !== undefined ? +f.x.di : f.causa); if (!g || (g.ril || 0) < c[1]) return false; }
      else if (c[0] === 'gancio') { if (!(f.x && typeof f.x.ganci === 'string' && f.x.ganci.split(' ').includes(c[1]))) return false; }
      else if (c[0] === 'vis>=') { if ((f.vis || 0) < c[1]) return false; }
      else return false;
    }
    return true;
  }
  const occupato = (R, id) => R.attive.reduce((a, s) => a + (Object.values(s.ruoli).includes(id) ? 1 : 0), 0) >= CFG.perPersona;
  const conMente = (st, id) => !!(id && st.u.menti && st.u.menti[id]);
  // i ruoli dal fatto ('$f.chi', '$f.con0'); quelli da cercare (q) si lasciano al casting
  function ruoliDa(st, R, D, f) {
    const out = {};
    for (const r in D.ruoli) {
      const e = D.ruoli[r].e; if (!e) continue;
      const id = e === '$f.chi' ? f && f.chi : /^\$f\.con\d$/.test(e) ? f && (f.con || [])[+e.slice(6)] : null;
      if (!id || id === 'nino' || id === 'player' || !conMente(st, id) || occupato(R, id)) return null;
      if (Object.values(out).includes(id)) return null;
      out[r] = id;
    }
    return out;
  }
  // il casting (la leva 3): per i ruoli q, fra le menti vive, il più adatto (vicinanza, tratto, chi il giocatore conosce)
  function casting(st, R, D, ruoli) {
    let adatto = 1;
    for (const r in D.ruoli) {
      const Q = D.ruoli[r].q; if (!Q || ruoli[r]) continue;
      const ref = Q.vicino_a ? npc(st, ruoli[Q.vicino_a]) : null; if (Q.vicino_a && !ref) { if (D.ruoli[r].opz) { adatto *= .7; continue; } return null; }
      const usati = new Set(Object.values(ruoli)); let best = null, bs = -1;
      for (const n of st.npcs || []) {
        if (!n || n.dead || n.gone || !conMente(st, n.id) || usati.has(n.id) || occupato(R, n.id)) continue;
        if (Q.non && Q.non.some(x => ruoli[x] === n.id)) continue;
        let s = 1;
        if (ref) { const d = hyp(n.x - ref.x, n.y - ref.y); if (d > (Q.r || 60) || n.inside !== ref.inside) continue; s *= 1 + (1 - d / (Q.r || 60)); }
        if (Q.car) { const v = (st.u.menti[n.id].carattere || {})[Q.car[0]] || 0; if (v < Q.car[1]) continue; s *= 1 + v; }
        if (!ref && n.inside) s *= .5;
        s *= 1 + Math.min(1, (R.att[n.id] || 0) * .25);
        s *= 1 + .01 * rnd();   // a parità, il flusso della regia
        if (s > bs) { bs = s; best = n; }
      }
      if (!best) { if (D.ruoli[r].opz) { adatto *= .7; continue; } return null; }
      ruoli[r] = best.id;
    }
    return { ruoli, adatto };
  }
  // il punteggio di un seme (§C.4): adatto × novità × attenzione × registro × peso del carattere
  function punteggio(st, R, k, D, ruoli, f) {
    const usi = R.usi[k]; let nov = 1;
    if (R.cool[k] > st.t) return 0;
    if (usi && st.t - usi < 7 * 1440 * ((D.ritorno && D.ritorno.giorni) || 3) / 3) nov = .5;
    const ids = Object.values(ruoli), p = st.player;
    const vicino = (f && f.vis >= 1) || ids.some(id => (R.att[id] || 0) > .5) || (f && f.dove && f.dove[0] !== null && p && quart(f.dove[0], f.dove[1]) === quart(p.x, p.y));
    const lontane = R.chiuse.slice(-20).filter(c => !c.sa).length / Math.max(1, Math.min(20, R.chiuse.length));
    let att = vicino ? 1.5 : lontane < .3 ? 1.4 : 1;
    if (st.t - R.visto > CFG.noia && vicino) att *= 1.5;
    const C = CFG.caratteri[R.carattere] || CFG.caratteri.goldoni, tot = R.reg.R + R.reg.A + R.reg.S, share = tot ? R.reg[D.reg || 'R'] / tot : 0;
    const reg = clamp(1 + 2 * ((C.reg[D.reg || 'R'] || 0) - share), .5, 1.5);
    return nov * att * reg * ((D.peso && D.peso[R.carattere]) || 1);
  }
  function inizia(st, R, k, ruoli, f) {
    const D = CARD[k], P = D.passi[0], s = { k, id: ++R.n, ruoli, passo: 0, t0: Math.round(st.t), tp: Math.round(st.t), fu: f ? f.id : R.ultimo, f0: f ? f.id : null,
      q: f && f.dove && f.dove[0] !== null ? quart(f.dove[0], f.dove[1]) : (() => { const n = npc(st, Object.values(ruoli)[0]); return n ? quart(n.x, n.y) : 'città'; })(),
      segni: 0, fs: [], sa: f && f.vis >= 1 ? 1 : 0, inc: [], spinto: 0, ultima: '' };
    R.attive.push(s); R.usi[k] = Math.round(st.t); R.cool[k] = Math.round(st.t + ((D.ritorno && D.ritorno.giorni) || 3) * 1440);
    R.reg[D.reg || 'R']++; stats.semi++;
    const h = Math.floor(st.t / 60); if (R.budget.ora !== h) { R.budget.ora = h; R.budget.semi = 0; } R.budget.semi++;
    spingiRuoli(st, R, s, P, st.t + (P.scad || 240));
    segna(st, R, s, 'storia_seme', riga(st, s, D.segni && D.segni.seme), f ? f.id : null);
    radice(st, R, s, D);
    return s;
  }
  // la leva 2: una scena della città, se la scheda ne ha una e il giocatore è lì vicino (all'aperto)
  function radice(st, R, s, D) {
    const E = typeof Eventi !== 'undefined' ? Eventi : null, L = D.radice && D.radice.evento; if (!E || !E.run || !L || !L.length) return;
    const g = Math.floor(st.t / 1440); if (R.budget.giorno !== g) { R.budget.giorno = g; R.budget.richiami = 0; R.budget.radici = 0; }
    if (R.budget.radici >= CFG.radiciGiorno) return;
    const p = st.player, n = npc(st, Object.values(s.ruoli)[0]); if (!p || !n || p.indoor || p.vehicle || hyp(n.x - p.x, n.y - p.y) > 75) return;
    try { if (E.run(st, L[Math.floor(rnd() * L.length) % L.length], true)) { R.budget.radici++; stats.radici++; } } catch (e) { }
  }
  function dest(D, s, P, v) {
    if (P.rami && P.rami[v]) return P.rami[v];
    if (P.poi) return P.poi;
    if (s.passo + 1 < D.passi.length) return '>' + D.passi[s.passo + 1].id;
    return Object.keys(D.esiti)[0];
  }
  function vai(st, R, s, to, f) {
    const D = CARD[s.k]; if (!D) return chiudi(st, R, s, 'sfumata', f);
    if (to && to[0] === '>') {
      const i = D.passi.findIndex(p => p.id === to.slice(1)); if (i < 0) return chiudi(st, R, s, 'sfumata', f);
      s.passo = i; s.tp = Math.round(st.t); const P = D.passi[i];
      togliSpinte(R, s.id); spingiRuoli(st, R, s, P, st.t + (P.scad || 240));
      segna(st, R, s, 'storia_svolta', riga(st, s, D.segni && D.segni.svolta && D.segni.svolta[P.id]), f ? f.id : null, { passo: P.id });
      return null;
    }
    return chiudi(st, R, s, D.esiti[to] ? to : 'sfumata', f);
  }
  function chiudi(st, R, s, esito, f) {
    const D = CARD[s.k] || { esiti: {}, segni: {} }, ganci = (D.esiti[esito] || []).slice();
    togliSpinte(R, s.id); R.attive = R.attive.filter(x => x !== s);
    const t = (D.segni && D.segni.fine && D.segni.fine[esito]) || (esito === 'sfumata' ? 'Alla fine fra {' + Object.keys(s.ruoli)[0] + '} e gli altri non se n\'è fatto niente' : null);
    segna(st, R, s, 'storia_fine', riga(st, s, t), f ? f.id : null, { esito, ganci: ganci.join(' ') });
    for (const g of ganci) { const d = GANCIO_T[g]; if (d && s.q) R.tens.q[s.q] = r2(clamp((R.tens.q[s.q] || 0) + d, 0, 1)); }
    R.chiuse.push({ k: s.k, id: s.id, esito, ganci, ruoli: s.ruoli, t0: s.t0, t1: Math.round(st.t), segni: s.segni, sa: s.sa, inc: s.inc.length, riga: s.ultima, q: s.q });
    if (R.chiuse.length > 200) R.chiuse.splice(0, R.chiuse.length - 200);
    stats.chiuse++; if (esito === 'sfumata' || !ganci.length) stats.sfumate++;
    if (s.sa && D.segni && D.segni.richiamo) R.richiami.push([Math.round(st.t + (1 + Math.floor(rnd() * 5)) * 1440), s.id]);
    R.chiusaOra = 1;
    return esito;
  }
  // i fatti nuovi contro le storie attive (per tipo e attori) e i passi scaduti
  function avanza(st, R, nuovi) {
    for (const f of nuovi) {
      if (f.esito === 'no' || /^storia_/.test(f.v)) continue;
      for (const s of R.attive.slice()) {
        const D = CARD[s.k]; if (!D || f.id <= s.fu) continue; const P = D.passi[s.passo], A = P && P.attende; if (!A || !A.tipo.includes(f.v)) continue;
        const chi = [].concat(A.chi || []).map(r => s.ruoli[r]).filter(Boolean), at = attori(f);
        if (chi.length && !chi.some(id => at.includes(id))) continue;
        if (f.vis >= 1) s.sa = 1;
        s.fu = f.id; vai(st, R, s, dest(D, s, P, f.v), f);
      }
    }
    for (const s of R.attive.slice()) { const D = CARD[s.k], P = D && D.passi[s.passo]; if (!D || !P) { chiudi(st, R, s, 'sfumata', null); continue; } if (st.t > s.tp + (P.scad || 240)) vai(st, R, s, P.senza || 'sfumata', null); }
    // chi sa della storia: un suo segno visto o arrivato come diceria (Si dice)
    const T = st.u.taccuino && st.u.taccuino.sentite, Fi = FT();
    if (T && T.length) for (const s of R.attive) if (!s.sa) for (const id of T) { const g = Fi.di(st, id), di = g && g.x && g.x.di !== undefined ? +g.x.di : g && g.causa; if (di && s.fs.includes(di)) { s.sa = 1; break; } }
  }

  // ======================= LE OPERAZIONI (§C.2) =======================
  function semina(st, R, nuovi, calma) {
    if (R.attive.length >= (CFG.attive[classe(st)] || 12)) return null;
    const h = Math.floor(st.t / 60); if (R.budget.ora === h && R.budget.semi >= CFG.semiOra) return null;
    const cand = []; let prove = 0;
    for (const f of nuovi) {
      if (f.esito === 'no' || prove >= CFG.inneschi) continue;
      for (const k of PER_TIPO[f.v] || []) {
        const D = CARD[k]; if (calma && !D.calma) continue; if (prove++ >= CFG.inneschi) break;
        if (D.innesco.entro && st.t - f.t > D.innesco.entro) continue;
        if (!condOk(st, f, D.innesco.se)) continue;
        const ru = ruoliDa(st, R, D, f); if (!ru) continue;
        const s = punteggio(st, R, k, D, ru, f); if (s > 0) cand.push({ k, f, ru, s });
      }
    }
    const ora = (st.t % 1440) / 60;
    for (const k in CARD) { const D = CARD[k], I = D.innesco; if (!I.spontanea || (calma && !D.calma) || (I.ora && !(ora >= I.ora[0] && ora < I.ora[1]))) continue; const s = punteggio(st, R, k, D, {}, null); if (s > 0) cand.push({ k, f: null, ru: {}, s: s * (calma ? 1.5 : .8) }); }
    if (!cand.length) return null;
    cand.sort((a, b) => b.s - a.s || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0) || ((a.f && a.f.id) || 0) - ((b.f && b.f.id) || 0));
    const c = cand[0], C = casting(st, R, CARD[c.k], Object.assign({}, c.ru)); if (!C) return null;   // un solo casting per battito
    inizia(st, R, c.k, C.ruoli, c.f);
    return 'semina:' + c.k;
  }
  const seme = (st, R, nuovi, calma) => { const r = semina(st, R, nuovi, calma); if (r) R.fconti.semi++; return r; };
  function spingi(st, R) {
    let best = null; for (const s of R.attive) if (st.t - s.tp > 60 && s.spinto < 3 && (!best || s.tp < best.tp)) best = s;
    if (!best) return null;
    for (const id in R.spinte) for (const e of R.spinte[id]) if (e[3] === best.id) e[1] = r2(Math.min(CFG.spinta[1], e[1] * 1.25));
    best.spinto++; R.ver = (R.ver || 0) + 1; return 'spingi:' + best.k;
  }
  function raffredda(st, R, nuovi) {
    stats.raffredda++;
    for (const id in R.spinte) for (const e of R.spinte[id]) if (e[1] > 1) e[1] = r2(Math.max(1, e[1] - .3));
    // chi è più teso ha meno voglia di vendicarsi o di riscuotere, per un'ora
    for (const id in R.tens.p) if (R.tens.p[id] > .5) { const L = R.spinte[id] = (R.spinte[id] || []).filter(e => e[3] !== 0); L.push(['vendicarsi', .6, Math.round(st.t + 60), 0], ['riscuotere', .7, Math.round(st.t + 60), 0]); }
    R.ver = (R.ver || 0) + 1;
    const c = spingiFilo(st, R, true);
    return 'raffredda' + (c ? ' ' + c : '') + (tranquillo(R) && seme(st, R, nuovi, true) ? '+calma' : '');
  }
  function incrocia(st, R) {
    const C = CFG.caratteri[R.carattere] || CFG.caratteri.goldoni;
    for (let i = 0; i < R.attive.length; i++) for (let j = i + 1; j < R.attive.length; j++) {
      const a = R.attive[i], b = R.attive[j]; if (a.inc.includes(b.id)) continue;
      const comune = Object.values(a.ruoli).find(id => id && Object.values(b.ruoli).includes(id)); if (!comune) continue;
      a.inc.push(b.id); b.inc.push(a.id);
      if (rnd() > C.incrocio) continue;
      for (const id in R.spinte) for (const e of R.spinte[id]) if (e[3] === a.id || e[3] === b.id) e[1] = r2(Math.min(CFG.spinta[1], e[1] + .15));
      R.ver = (R.ver || 0) + 1; stats.incroci++;
      segna(st, R, a, 'storia_incrocio', `Di mezzo c'è sempre ${nome(st, comune)}: due storie del paese si sono incrociate`, null, { con_storia: b.id });
      return 'incrocia';
    }
    return null;
  }
  function ripaga(st, R) {
    const g = Math.floor(st.t / 1440); if (R.budget.giorno !== g) { R.budget.giorno = g; R.budget.richiami = 0; R.budget.radici = 0; }
    for (const r of R.richiami.slice()) {
      if (r[0] > st.t || R.budget.richiami >= CFG.richiamiGiorno) continue;
      R.richiami = R.richiami.filter(x => x !== r);
      if (typeof r[1] === 'string' && r[1][0] === 'f') {   // il ricordo di un filo chiuso
        const c = R.fchiusi.find(x => 'f' + x.id === r[1]); if (!c) continue;
        if (segna(st, R, { ruoli: c.ruoli, id: r[1], segni: 0, fs: [], ultima: '' }, 'storia_richiamo', 'Ancora se ne parla: ' + c.tit[0].toLowerCase() + c.tit.slice(1), null, { filo: c.id })) { R.budget.richiami++; stats.richiami++; return 'ripaga:f' + c.id; }
        continue;
      }
      const c = R.chiuse.find(x => x.id === r[1]), D = c && CARD[c.k]; if (!c || !D || !D.segni.richiamo) continue;
      const s = { k: c.k, id: c.id, ruoli: c.ruoli, segni: 0, fs: [], sa: 1, ultima: '' };
      if (segna(st, R, s, 'storia_richiamo', riga(st, s, D.segni.richiamo), null)) { R.budget.richiami++; stats.richiami++; return 'ripaga'; }
    }
    return null;
  }

  // ======================= I FILI: LE STORIE CHE IL PAESE FA DA SÉ (la spina dorsale del regista) =======================
  // Un FILO è una storia aperta cucita dai fatti di st.u.fatti, da qualunque fonte (vita, casa, iniziative, sociali, verbi, costruire):
  // i fatti si legano per CAUSA (f.causa, x.di della diceria), per FAMIGLIA (la tabella TIPI_FILO: un tipo apre, fa avanzare o chiude
  // una domanda aperta fra certi ruoli), per CHIAVE (il luogo del muro, il cantiere, l'iniziativa) e, i tipi che la tabella non
  // conosce, per ATTORI in comune entro la finestra. Il filo ha i partecipanti (ruolo → id), la tensione, la domanda, i colpi (beats).
  // Si chiude quando un fatto risponde alla domanda (saldato, reso, incontro, tregua…), quando i derivati di Fatto dicono che è
  // risolta (Fatto.debito ≤ 0, Fatto.rancore sbollito), o scade «sfumato». La tabella è DATI: un tipo nuovo si aggiunge con una riga.
  //   FAMIGLIE[f] = { domanda, finestra (minuti senza colpi), base (tensione), sim (ruoli scambiabili), chiave ('ruoli'|'luogo'|'x.campo'),
  //                  spinte: { ruolo: [obiettivo, ×] } (spingi), calma: { ruolo: [obiettivo, ×] } (raffredda), titolo, fine: { esito },
  //                  risolta: 'debito'|'rancore' (il derivato di Fatto che chiude), radice: [Eventi.SCENE] (ripaga) }
  //   TIPI_FILO[tipo] = [{ fam, m: 'apre'|'avanza'|'chiude', r: { ruolo: 'chi'|'con0'|'con1' }, esito, se: 'soldi'|'!soldi'|'q>=3' }]
  const FAMIGLIE = Regista.FAMIGLIE = {
    debito:       { domanda: 'il debito non è reso', finestra: 2880, base: .3, risolta: 'debito', radice: ['non_ha_pagato'],
      spinte: { creditore: ['riscuotere', 1.45], debitore: ['riscuotere', 1.3] }, calma: { creditore: ['riscuotere', .7] },
      titolo: 'Il debito di {debitore} con {creditore}', fine: { pari: '{debitore} ha reso il dovuto a {creditore}', reso: '{debitore} ha restituito a {creditore} quello che aveva avuto', sfumato: 'Del debito di {debitore} con {creditore} non si è più parlato' } },
    furto:        { domanda: 'il furto è impunito', finestra: 1440, base: .45, radice: ['portafoglio'],
      spinte: { vittima: ['vendicarsi', 1.5] }, calma: { vittima: ['vendicarsi', .6] },
      titolo: 'Il furto {a_vittima}', fine: { reso: '{ladro} ha reso il maltolto {a_vittima}', vendicato: '{vittima} gliel\'ha fatta pagare a {ladro}', sfumato: 'Il furto {a_vittima} è rimasto impunito' } },
    offesa:       { domanda: 'l\'offesa non ha risposta', finestra: 900, base: .3, sim: true, risolta: 'rancore', radice: ['carte_baruffa', 'lite_coppia'],
      spinte: { offeso: ['vendicarsi', 1.35], offensore: ['regalare', 1.35] }, calma: { offeso: ['vendicarsi', .6], offensore: ['regalare', 1.4] },
      titolo: 'Lo sgarbo fra {offeso} e {offensore}', fine: { pace: '{offensore} e {offeso} hanno fatto pace', sbollita: 'Fra {offeso} e {offensore} è sbollita', sfumato: 'Fra {offeso} e {offensore} è rimasto il muso' } },
    affetto:      { domanda: 'il regalo non è ricambiato', finestra: 600, base: .1,
      spinte: { ricevente: ['regalare', 1.35], donatore: ['socializzare', 1.2] },
      titolo: 'Il regalo di {donatore} a {ricevente}', fine: { ricambiato: '{ricevente} ha ricambiato il regalo di {donatore}', sfumato: '{ricevente} il regalo di {donatore} non l\'ha ricambiato' } },
    appuntamento: { domanda: 'l\'appuntamento è da vedere', finestra: 600, base: .12, sim: true,
      spinte: { a: ['socializzare', 1.45], b: ['socializzare', 1.45] },
      titolo: 'L\'appuntamento di {a} con {b}', fine: { visti: '{a} e {b} si sono visti', buca: 'Qualcuno ha dato buca: {a} e {b} non si sono visti', sfumato: '{a} e {b} non si sono visti' } },
    lavoro:       { domanda: 'la roba è da vendere', finestra: 480, base: .08,
      spinte: { lavoratore: ['guadagnare', 1.4] },
      titolo: 'La pesca di {lavoratore}', fine: { venduto: '{lavoratore} ha venduto quello che aveva', sfumato: 'Quello che aveva {lavoratore} è finito chissà dove' } },
    cantiere:     { domanda: 'il cantiere è in piedi', finestra: 2880, base: .35, chiave: 'x.cantiere', radice: ['attacchino'],
      spinte: { capo: ['costruire', 1.5] },
      titolo: 'Il cantiere {in_luogo}', fine: { finito: 'Il cantiere {in_luogo} è finito: ora c\'è', sgomberato: 'Il cantiere {in_luogo} l\'hanno sgomberato', sfumato: 'Il cantiere {in_luogo} è rimasto a metà' } },
    muro:         { domanda: 'chi risponde al muro?', finestra: 900, base: .15, chiave: 'luogo',
      spinte: { writer: ['dipingere', 1.4] },
      titolo: 'Il muro {in_luogo}', fine: { ripulito: 'Il muro {in_luogo} l\'hanno ripulito', risposto: 'Al muro {in_luogo} qualcuno ha risposto', sfumato: 'Il muro {in_luogo} è rimasto com\'era' } },
    iniziativa:   { domanda: 'l\'iniziativa trova gente?', finestra: 480, base: .1, chiave: 'x.ini',
      spinte: { promotore: ['socializzare', 1.4] },
      titolo: '{cosa_d}', fine: { ricorrente: '{cosa_d}: è diventata un\'abitudine', vietata: '{cosa_d}: l\'hanno vietata', sfumato: '{cosa_d}: è finita lì' } },
    voce:         { domanda: 'la voce corre', finestra: 180, base: .1,
      spinte: { fonte: ['socializzare', 1.4], ascolta: ['socializzare', 1.3] },
      titolo: 'La voce su {su}', fine: { sfumato: 'La voce su {su} si è spenta' } },
    vicinato:     { domanda: 'che cosa succede fra loro?', finestra: 360, base: .05,
      spinte: { a: ['socializzare', 1.3] },
      titolo: 'Le faccende di {a}', fine: { sfumato: 'Le faccende di {a} sono finite lì' } },
  };
  const R_ = (fam, m, r, o) => Object.assign({ fam, m, r }, o || {});
  const TIPI_FILO = Regista.TIPI_FILO = {
    prestito:    [R_('debito', 'apre', { creditore: 'chi', debitore: 'con0' })],
    dai:         [R_('debito', 'apre', { creditore: 'chi', debitore: 'con0' })],
    saldato:     [R_('debito', 'chiude', { debitore: 'chi', creditore: 'con0' }, { esito: 'pari' })],
    restituito:  [R_('furto', 'chiude', { ladro: 'chi', vittima: 'con0' }, { esito: 'reso' }), R_('debito', 'chiude', { debitore: 'chi', creditore: 'con0' }, { esito: 'reso' })],
    reso:        [R_('furto', 'chiude', { ladro: 'chi', vittima: 'con0' }, { esito: 'reso' }), R_('debito', 'chiude', { debitore: 'chi', creditore: 'con0' }, { esito: 'reso' })],
    rinfacciato: [R_('debito', 'avanza', { creditore: 'chi', debitore: 'con0' }, { se: 'soldi' }), R_('furto', 'avanza', { vittima: 'chi', ladro: 'con0' }),
                  R_('offesa', 'avanza', { offeso: 'chi', offensore: 'con0' }), R_('offesa', 'apre', { offeso: 'con0', offensore: 'chi' }, { se: '!soldi' }), R_('debito', 'apre', { creditore: 'chi', debitore: 'con0' }, { se: 'soldi' })],
    furto:       [R_('furto', 'apre', { ladro: 'chi', vittima: 'con0' })],
    denuncia:    [R_('furto', 'avanza', { vittima: 'chi', ladro: 'con0' })],
    lite:        [R_('offesa', 'apre', { offeso: 'chi', offensore: 'con0' })],
    rissa:       [R_('furto', 'chiude', { vittima: 'chi', ladro: 'con0' }, { esito: 'vendicato' }), R_('offesa', 'apre', { offeso: 'chi', offensore: 'con0' })],
    muso:        [R_('offesa', 'apre', { offeso: 'chi', offensore: 'con0' })],
    buca:        [R_('appuntamento', 'chiude', { a: 'chi', b: 'con0' }, { esito: 'buca' }), R_('offesa', 'apre', { offensore: 'chi', offeso: 'con0' })],
    parola_rotta: [R_('offesa', 'apre', { offensore: 'chi', offeso: 'con0' })],
    tregua:      [R_('offesa', 'chiude', { offensore: 'chi', offeso: 'con0' }, { esito: 'pace' })],
    scusa:       [R_('offesa', 'chiude', { offensore: 'chi', offeso: 'con0' }, { esito: 'pace' })],
    regalo:      [R_('offesa', 'chiude', { offensore: 'chi', offeso: 'con0' }, { esito: 'pace' }), R_('affetto', 'chiude', { ricevente: 'chi', donatore: 'con0' }, { esito: 'ricambiato' }),
                  R_('debito', 'avanza', { debitore: 'chi', creditore: 'con0' }), R_('affetto', 'apre', { donatore: 'chi', ricevente: 'con0' })],
    appuntamento: [R_('appuntamento', 'apre', { a: 'chi', b: 'con0' })],
    incontro:    [R_('appuntamento', 'chiude', { a: 'chi', b: 'con0' }, { esito: 'visti' }), R_('offesa', 'avanza', { offeso: 'chi', offensore: 'con0' })],
    pesca:       [R_('lavoro', 'apre', { lavoratore: 'chi' }, { se: 'q>=3' })],
    vende:       [R_('lavoro', 'chiude', { lavoratore: 'chi' }, { esito: 'venduto' })],
    vendita:     [R_('lavoro', 'chiude', { lavoratore: 'chi' }, { esito: 'venduto' }), R_('iniziativa', 'avanza', { promotore: 'chi' })],
    rivendica:   [R_('cantiere', 'apre', { capo: 'chi' })],
    barrica:     [R_('cantiere', 'avanza', { capo: 'chi' })], tira_su: [R_('cantiere', 'avanza', { capo: 'chi' })], presidia: [R_('cantiere', 'avanza', { capo: 'chi' })],
    smonta:      [R_('cantiere', 'avanza', { capo: 'chi' })],
    barricata:   [R_('cantiere', 'chiude', { capo: 'chi' }, { esito: 'finito' })], baracca: [R_('cantiere', 'chiude', { capo: 'chi' }, { esito: 'finito' })],
    sgombero:    [R_('cantiere', 'chiude', { capo: 'chi' }, { esito: 'sgomberato' })],
    dipinge_muro: [R_('muro', 'avanza', { rivale: 'chi' }), R_('muro', 'apre', { writer: 'chi' })],
    muro:        [R_('muro', 'apre', { writer: 'chi' })],
    copia_tag:   [R_('muro', 'chiude', { rivale: 'chi' }, { esito: 'risposto' })],
    ripulito:    [R_('muro', 'chiude', { pulitore: 'chi' }, { esito: 'ripulito' })],
    iniziativa:  [R_('iniziativa', 'apre', { promotore: 'chi' })],
    ricorrente:  [R_('iniziativa', 'chiude', { promotore: 'chi' }, { esito: 'ricorrente' })],
    bandita:     [R_('iniziativa', 'chiude', {}, { esito: 'vietata' })],
    chiacchiera: [R_('voce', 'apre', { fonte: 'chi', ascolta: 'con0' })],
    voce:        [R_('voce', 'apre', { fonte: 'chi' })],
  };
  // i tipi di tutti i giorni: entrano in un filo solo per causa (mai per attori in comune: sarebbero rumore)
  const ROUTINE = Regista.ROUTINE = new Set(['vai', 'mangia', 'beve', 'dorme', 'porta_casa', 'casa_porta_casa', 'compra', 'lavora', 'entra', 'esce', 'posa', 'prende', 'casa_compra', 'dipinge', 'fa', 'costruisce', 'invito_no']);
  CFG.fili = { aperti: 100, chiusi: 120, colpi: 12, fatti: 40, controllo: 60, spingiOgni: 50, spinteMax: 4, durata: 240, perBattito: 2 };
  const flat = f => { const out = []; for (const a of [].concat(f.chi == null ? [] : f.chi, f.con || [])) if (a != null && !out.includes(a)) out.push(io(a)); return out; };
  const daRuolo = (f, w) => { const c = Array.isArray(f.chi) ? f.chi[0] : f.chi; return io(w === 'chi' ? c : w === 'con0' ? (f.con || [])[0] : w === 'con1' ? (f.con || [])[1] : null) || null; };
  function seOk(f, se) { if (!se) return true; const s = typeof f.soldi === 'number' && f.soldi !== 0; if (se === 'soldi') return s; if (se === '!soldi') return !s; if (se === 'q>=3') return (f.q || 0) >= 3; return true; }
  const chiaveDi = (fam, f, ruoli) => {
    const K = FAMIGLIE[fam].chiave;
    if (K === 'luogo') return fam + '|' + ((f.dove && f.dove[2]) || '?');
    if (K && K.slice(0, 2) === 'x.') { const v = f.x && f.x[K.slice(2)]; if (v != null) return fam + '|' + v; }
    const ids = Object.values(ruoli).filter(Boolean); return fam + '|' + (FAMIGLIE[fam].sim ? ids.slice().sort() : ids).join('+');
  };
  // gli indici derivati (fatto → filo, chiave → filo): non si salvano, si rifanno dallo stato
  const IXF = new WeakMap();
  function ix(R) { let I = IXF.get(R); if (!I || I.n !== R.fili.length || I.v !== R.fv) { I = { n: R.fili.length, v: R.fv, f: new Map(), k: new Map() }; for (const fl of R.fili) { for (const id of fl.fs) I.f.set(id, fl); I.k.set(fl.chiave, fl); } IXF.set(R, I); } return I; }
  const toccaIx = R => { R.fv = (R.fv || 0) + 1; };
  const conta = (o, k, d) => { o[k] = (o[k] || 0) + (d || 1); };
  // il filo combacia con la regola? (i ruoli presenti nel fatto e nel filo devono essere gli stessi, almeno uno)
  function combacia(fl, ruoli, sim) {
    let ok = 0;
    if (sim) { const a = Object.values(ruoli).filter(Boolean), b = Object.values(fl.ruoli).filter(Boolean); for (const x of a) if (b.includes(x)) ok++; return ok >= Math.min(2, a.length, b.length) && ok > 0; }
    for (const r in ruoli) { if (!ruoli[r]) continue; if (fl.ruoli[r] && fl.ruoli[r] !== ruoli[r]) return false; if (fl.ruoli[r] === ruoli[r]) ok++; }
    return ok > 0;
  }
  function nuovoFilo(st, R, fam, ruoli, f) {
    const I = ix(R), ch = chiaveDi(fam, f, ruoli);
    const cast = new Set(); for (const s of R.attive) for (const id of Object.values(s.ruoli)) cast.add(id);
    const fl = { id: ++R.nf, fam, chiave: ch, ruoli: Object.assign({}, ruoli), part: flat(f).slice(0, 6), t0: Math.round(st.t), tu: Math.round(st.t), fs: [], colpi: [], n: 0, tipi: [],
      tens: FAMIGLIE[fam].base, q: f.dove && f.dove[0] !== null ? quart(f.dove[0], f.dove[1]) : 'città', luogo: (f.dove && f.dove[2]) || null, cosa: f.cosa || null, d: f.d ? String(f.d).split(':')[0].slice(0, 60) : null,
      sa: 0, spinto: 0, ts: 0, inc: [], origine: flat(f).some(id => cast.has(id)) ? 'seme' : 'emergente', regia: 0, ctl: Math.round(st.t) };
    R.fili.push(fl); I.k.set(ch, fl); I.n = R.fili.length; conta(R.fconti.aperti, fam); conta(R.fconti.origine, fl.origine);
    return fl;
  }
  function colpo(st, R, fl, f, rr) {
    const I = ix(R); if (fl.fs.includes(f.id)) return;
    fl.fs.push(f.id); I.f.set(f.id, fl); if (fl.fs.length > CFG.fili.fatti) fl.fs.shift();
    if (ROUTINE.has(f.v)) return;   // il fatto di tutti i giorni tiene la catena (l'indice), ma non è un colpo della storia
    fl.n++; fl.tu = Math.round(st.t); if (!fl.tipi.includes(f.v)) fl.tipi.push(f.v);
    if (rr && rr.r) for (const r in rr.r) { const id = daRuolo(f, rr.r[r]); if (id && !fl.ruoli[r] && !Object.values(fl.ruoli).includes(id)) fl.ruoli[r] = id; }
    for (const a of flat(f)) if (!fl.part.includes(a) && fl.part.length < 8) fl.part.push(a);
    fl.tens = r2(clamp(fl.tens + Math.max(.03, Math.abs(GT[f.v] || 0)) * (f.peso || 1), 0, 1));
    if (f.vis >= 1) fl.sa = 1;
    const u = fl.colpi[fl.colpi.length - 1];
    if (u && u[2] === 'chiacchiera' && f.v === 'chiacchiera') { u[3] = (u[3] || 1) + 1; u[0] = Math.round(f.t); }   // le chiacchiere di fila: un colpo solo, «se ne parla»
    else { fl.colpi.push([Math.round(f.t), f.id, f.v]); if (fl.colpi.length > CFG.fili.colpi) fl.colpi.shift(); }
    if (fl.n > R.fconti.lunga) { R.fconti.lunga = fl.n; R.fconti.lungaFilo = fl.id; }
  }
  function chiudiFilo(st, R, fl, esito, f) {
    R.fili = R.fili.filter(x => x !== fl); toccaIx(R);
    togliSpinte(R, 'f' + fl.id);
    const tit = titoloFilo(st, fl), fin = rigaFilo(st, fl, (FAMIGLIE[fl.fam].fine || {})[esito] || (FAMIGLIE[fl.fam].fine || {}).sfumato);
    R.fchiusi.push({ id: fl.id, fam: fl.fam, esito, ruoli: fl.ruoli, t0: fl.t0, t1: Math.round(st.t), n: fl.n, sa: fl.sa, tit, fin, colpi: fl.colpi.slice(-6), origine: fl.origine, regia: fl.regia, q: fl.q });
    if (R.fchiusi.length > CFG.fili.chiusi) R.fchiusi.splice(0, R.fchiusi.length - CFG.fili.chiusi);
    conta(R.fconti.chiusi, fl.fam); conta(R.fconti.esiti, esito);
    // ripaga: una storia che il giocatore conosceva, con almeno tre colpi, ha il suo segno, una scena e (fra qualche giorno) il ricordo
    if (fl.sa && fl.n >= 3 && esito !== 'troppi') {
      const s = { ruoli: fl.ruoli, id: 'f' + fl.id, segni: 0, fs: [], ultima: '' };
      segna(st, R, s, 'storia_fine', fin ? tit + ': ' + fin : tit, f ? f.id : null, { esito, filo: fl.id, fam: fl.fam });
      radiceL(st, R, s, FAMIGLIE[fl.fam].radice);
      R.richiami.push([Math.round(st.t + (1 + Math.floor(rnd() * 5)) * 1440), 'f' + fl.id]);
      conta(R.fconti, 'ripagati');
    }
  }
  // i fatti nuovi nei fili: causa → famiglia → chiave → attori in comune; poi la verifica dei derivati e le scadenze
  function cuci(st, R, nuovi) {
    for (const f of nuovi) {
      if (/^storia_/.test(f.v) || f.esito === 'no') continue;
      const I = ix(R);
      // 1. per causa: il fatto che lo ha mosso (o raccontato) è già in un filo
      let fl = null;
      for (const c of [f.causa, f.x && f.x.di !== undefined ? +f.x.di : null]) if (c != null && I.f.has(c)) { fl = I.f.get(c); break; }
      const regole = TIPI_FILO[f.v] || [];
      if (fl) {
        const rr = regole.find(r => r.fam === fl.fam && seOk(f, r.se)); colpo(st, R, fl, f, rr); conta(R.fconti, 'perCausa');
        if (rr && rr.m === 'chiude') chiudiFilo(st, R, fl, rr.esito, f);
        // un fatto di un'altra famiglia (il furto nato da un movente, la lite nata da una voce) apre anche il suo filo: la storia si dirama
        if (rr || !regole.some(r => r.m === 'apre' && r.fam !== 'voce' && FAMIGLIE[r.fam] && seOk(f, r.se))) continue;
        conta(R.fconti, 'diramati');
      }
      // 2. per famiglia: la regola che combacia con un filo aperto (per ruoli o per chiave)
      let fatto = false;
      for (const rr of regole) {
        if (!seOk(f, rr.se)) continue;
        const ruoli = {}; for (const r in rr.r) ruoli[r] = daRuolo(f, rr.r[r]);
        const D = FAMIGLIE[rr.fam], K = D.chiave ? chiaveDi(rr.fam, f, ruoli) : null;
        let t = K && D.chiave !== 'ruoli' ? I.k.get(K) : null;
        if (!t || t.fam !== rr.fam) t = R.fili.find(x => x.fam === rr.fam && combacia(x, ruoli, D.sim)) || null;
        if (t) { colpo(st, R, t, f, rr); if (rr.m === 'chiude') chiudiFilo(st, R, t, rr.esito, f); fatto = true; break; }
        if (rr.m === 'apre' && Object.values(ruoli).some(Boolean)) {
          if (rr.fam === 'voce') { const g = FT().di(st, f.x && f.x.di !== undefined ? +f.x.di : f.causa); if (!g || (g.ril || 0) < .5) continue; ruoli.su = flat(g)[0] || null; }
          const n = nuovoFilo(st, R, rr.fam, ruoli, f); colpo(st, R, n, f, rr); fatto = true; break;
        }
      }
      if (fatto || ROUTINE.has(f.v) || TIPI_FILO[f.v]) continue;   // un tipo conosciuto che non combacia con niente non si attacca per attori
      // 3. il tipo che la tabella non conosce (o una regola senza filo): entra nel filo più recente di uno dei suoi attori, entro la finestra
      const at = flat(f).filter(a => a !== 'nino'); if (!at.length) continue;
      let best = null; for (const x of R.fili) if (x.part.some(a => at.includes(a)) && st.t - x.tu < FAMIGLIE[x.fam].finestra && (!best || x.tu > best.tu)) best = x;
      if (best) { colpo(st, R, best, f, null); conta(R.fconti, 'perAttori'); }
      else if ((f.ril || 0) >= .3) { const n = nuovoFilo(st, R, 'vicinato', { a: at[0], b: at[1] || null }, f); colpo(st, R, n, f, null); }
    }
    // le domande risolte dai derivati della memoria, e i fili scaduti
    const F = FT();
    for (const fl of R.fili.slice()) {
      const D = FAMIGLIE[fl.fam];
      if (st.t - fl.tu > D.finestra) { chiudiFilo(st, R, fl, 'sfumato', null); continue; }
      if (st.t - fl.ctl < CFG.fili.controllo || fl.n < 2) continue; fl.ctl = Math.round(st.t);
      try {
        if (D.risolta === 'debito' && fl.ruoli.creditore && fl.ruoli.debitore && F.debito(st, fl.ruoli.creditore, fl.ruoli.debitore) <= 0) chiudiFilo(st, R, fl, 'pari', null);
        else if (D.risolta === 'rancore' && fl.ruoli.offeso && fl.ruoli.offensore && F.rancore(st, fl.ruoli.offeso, fl.ruoli.offensore) < .03) chiudiFilo(st, R, fl, 'sbollita', null);
      } catch (e) { }
    }
    // la tensione dei fili decade come quella delle persone; troppi fili aperti: si lasciano i più freddi
    const kp = Math.pow(CFG.decad.p, CFG.battito / 60);
    for (const fl of R.fili) fl.tens = r2(Math.max(FAMIGLIE[fl.fam].base * .5, fl.tens * kp));
    while (R.fili.length > CFG.fili.aperti) { let m = R.fili[0]; for (const x of R.fili) if (x.tens < m.tens || (x.tens === m.tens && x.tu < m.tu)) m = x; chiudiFilo(st, R, m, 'troppi', null); }
    // chi sa del filo: un suo fatto visto, o arrivato come diceria
    const T = st.u.taccuino && st.u.taccuino.sentite;
    if (T && T.length) { const I = ix(R); for (const id of T.slice(-10)) { const g = F.di(st, id), di = g && g.x && g.x.di !== undefined ? +g.x.di : g && g.causa; const fl = di != null && I.f.get(di); if (fl) fl.sa = 1; } }
  }
  // le parole del filo (Lingua): i nomi dai ruoli, il luogo con la preposizione, la cosa
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  function nomeId(st, id) {
    if (!id) return '';
    if (/^bottega:/.test(id)) { try { const E = typeof Economia !== 'undefined' && Economia.eco ? Economia.eco(st) : null, S = E && E.shops && E.shops[id.slice(8)]; if (S && S.label) return S.label; } catch (e) { } return 'la bottega'; }
    try { const L = LG(); if (L && L.nome) { const n = L.nome(st, id); if (n && n !== String(id)) return n; } } catch (e) { }
    return nome(st, id);
  }
  function luogoNome(st, l) { if (!l) return ''; if (/^b:/.test(l)) { const b = G.BUILDINGS && G.BUILDINGS[+l.slice(2)]; return (b && b.name) || ''; } const P = G.PLACES && G.PLACES[l]; return (P && P.name) || ''; }
  function prep(t, p) { if (!t) return ''; const L = LG(); try { if (L && L.art) { const s = L.art(t, p); if (s) return s; } } catch (e) { } return (p === 'in' ? 'in ' : 'a ') + t; }
  function rigaFilo(st, fl, t) {
    if (!t) return null;
    const vit = fl.ruoli.vittima, vn = vit ? nomeId(st, vit) : '', bott = vit && /^bottega:/.test(vit);
    const ln = luogoNome(st, fl.luogo);
    const V = { a_vittima: vit ? (bott ? prep(vn, 'a') : 'a ' + vn) : (ln ? prep(ln, 'a') : 'in paese'), in_luogo: ln ? prep(ln, 'a') : (fl.ruoli.writer || fl.ruoli.capo) ? 'di ' + nomeId(st, fl.ruoli.writer || fl.ruoli.capo) : 'in paese', cosa_d: fl.d ? fl.d[0].toUpperCase() + fl.d.slice(1) : 'L\'iniziativa' };
    const s = t.replace(/\{(\w+)\}/g, (m, k) => V[k] !== undefined ? V[k] : fl.ruoli[k] ? nomeId(st, fl.ruoli[k]) : 'qualcuno');
    let out = s[0].toUpperCase() + s.slice(1); try { const L = LG(); if (L && L.concorda) out = L.concorda(out, st) || out; } catch (e) { }
    return out;
  }
  const titoloFilo = (st, fl) => rigaFilo(st, fl, FAMIGLIE[fl.fam].titolo) || 'Una storia del paese';
  function rigaColpo(st, id, v, n) {
    const f = FT().di(st, id); if (!f) return v === 'chiacchiera' ? 'Se ne parla in giro' : v[0].toUpperCase() + v.slice(1).replace(/_/g, ' ');   // il fatto è uscito dalla memoria
    if (v === 'chiacchiera') { const a = nomeId(st, flat(f)[0]), b = nomeId(st, flat(f)[1]); return n > 1 ? `Se ne parla in giro (${n} volte, da ${a} in poi)` : `${a} ne parla${b ? ' con ' + b : ''}`; }
    try { const S = SG(); const r = S && S._ && S._.rigaCorta ? S._.rigaCorta(st, f) : null; if (r) return r; } catch (e) { }
    return f.d ? String(f.d) : nomeId(st, flat(f)[0]) + ': ' + v.replace(/_/g, ' ');
  }
  // ---------- le operazioni sui fili ----------
  // SPINGI: il filo più caldo (tensione, attenzione del giocatore, quanto è fermo) riceve le spinte dei ruoli che possono far avanzare la
  // sua domanda; un testimone di un suo fatto è spinto a chiacchierare (la diceria la porta a terzi)
  function spingiFilo(st, R, calma) {
    let best = null, bs = 0;
    for (const fl of R.fili) {
      if (fl.spinto >= CFG.fili.spinteMax || st.t - fl.ts < CFG.fili.spingiOgni || (fl.n < 2 && !calma)) continue;
      const att = fl.part.reduce((a, id) => a + (R.att[id] || 0), 0), s = (fl.tens + .3 * Math.min(1, att * .25) + (fl.sa ? .2 : 0)) * (calma ? fl.tens : 1);
      if (s > bs) { bs = s; best = fl; }
    }
    if (!best) return null;
    const D = FAMIGLIE[best.fam], P = calma ? D.calma : D.spinte; if (!P) return null;
    const sid = 'f' + best.id, fino = Math.round(st.t + CFG.fili.durata); let n = 0;
    for (const r in P) { const id = best.ruoli[r]; if (!id || id === 'nino' || !conMente(st, id)) continue; const L = R.spinte[id] = (R.spinte[id] || []).filter(e => e[3] !== sid); L.push([P[r][0], clamp(P[r][1], CFG.spinta[0], CFG.spinta[1]), fino, sid]); n++; }
    if (!calma) {   // la diceria: un testimone dell'ultimo fatto, che non c'entra, va a raccontarlo
      const f = best.fs.length ? FT().di(st, best.fs[best.fs.length - 1]) : null, tm = f && (f.test || []).find(id => conMente(st, id) && !best.part.includes(id) && !(R.spinte[id] || []).length);
      if (tm) { (R.spinte[tm] = R.spinte[tm] || []).push(['socializzare', 1.4, fino, sid]); n++; }
    }
    if (!n) { best.ts = Math.round(st.t); return null; }
    best.spinto++; best.ts = Math.round(st.t); best.regia++; stats.spinte += n; conta(R.fconti, calma ? 'calmati' : 'spinti'); R.ver = (R.ver || 0) + 1;
    return (calma ? 'calma:' : 'spingi:') + best.fam + '#' + best.id;
  }
  // INCROCIA: due fili caldi nello stesso quartiere senza nessuno in comune: un partecipante del primo entra nel secondo (casting) e va a
  // chiacchierare; due fili che hanno già qualcuno in comune si segnano incrociati
  function incrociaFili(st, R) {
    if (st.t - (R.tInc || -1e9) < 60) return null;   // un incrocio l'ora, al massimo
    const C = CFG.caratteri[R.carattere] || CFG.caratteri.goldoni, L = R.fili.filter(x => x.n >= 2 && x.tens >= .25);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.inc.includes(b.id) || a.chiave === b.chiave) continue;
      const comune = a.part.find(id => id !== 'nino' && b.part.includes(id));
      if (!comune && a.q !== b.q) continue;
      a.inc.push(b.id); b.inc.push(a.id); if (rnd() > C.incrocio) continue;
      let ponte = comune;
      if (!ponte) { ponte = a.part.find(id => id !== 'nino' && conMente(st, id) && !occupato(R, id)); if (!ponte) continue; if (b.part.length < 8) b.part.push(ponte); b.ruoli.ponte = b.ruoli.ponte || ponte; }
      if (conMente(st, ponte)) { (R.spinte[ponte] = (R.spinte[ponte] || []).filter(e => e[3] !== 'f' + b.id)).push(['socializzare', 1.45, Math.round(st.t + CFG.fili.durata), 'f' + b.id]); R.ver = (R.ver || 0) + 1; }
      stats.incroci++; conta(R.fconti, 'incroci'); R.tInc = Math.round(st.t);
      if (a.sa || b.sa) segna(st, R, { ruoli: { ponte }, id: 'f' + a.id, segni: 0, fs: [], ultima: '' }, 'storia_incrocio', `${titoloFilo(st, a)} e ${titoloFilo(st, b)[0].toLowerCase() + titoloFilo(st, b).slice(1)}: di mezzo c'è ${nomeId(st, ponte)}`, null, { filo: a.id, con_filo: b.id });
      return 'incrocia:' + a.id + '+' + b.id;
    }
    return null;
  }
  // la scena di città per una storia (leva 2), con il giocatore vicino all'aperto e il budget del giorno
  function radiceL(st, R, s, L) {
    const E = typeof Eventi !== 'undefined' ? Eventi : null; if (!E || !E.run || !L || !L.length) return;
    const g = Math.floor(st.t / 1440); if (R.budget.giorno !== g) { R.budget.giorno = g; R.budget.richiami = 0; R.budget.radici = 0; }
    if (R.budget.radici >= CFG.radiciGiorno) return;
    const p = st.player, n = npc(st, Object.values(s.ruoli).filter(id => id && id !== 'nino')[0]); if (!p || !n || p.indoor || p.vehicle || hyp(n.x - p.x, n.y - p.y) > 75) return;
    try { if (E.run(st, L[Math.floor(rnd() * L.length) % L.length], true)) { R.budget.radici++; stats.radici++; } } catch (e) { }
  }
  const tranquillo = R => !R.fili.some(fl => fl.n >= 2);

  // ======================= IL BATTITO (§C.4, §T.3) =======================
  // a due fette (§C.4: il costo nel passo): al battito si legge e si avanza; al passo dopo si misura e si opera
  let PEND = null;   // i fatti nuovi fra le due fette (derivato: dopo un caricamento a metà si perdono, e il battito opera senza)
  function battito(st, R) {
    stats.battiti++; R.chiusaOra = 0;
    const sett = Math.floor(st.t / 10080); if (R.reg.sett !== sett) R.reg = { R: 0, A: 0, S: 0, sett };
    decadi(st, R);
    const nuovi = leggi(st, R);
    avanza(st, R, nuovi);
    cuci(st, R, nuovi);
    for (const id in R.spinte) { R.spinte[id] = R.spinte[id].filter(e => e[2] >= st.t); if (!R.spinte[id].length) delete R.spinte[id]; }
    R.ver = (R.ver || 0) + 1; R.fetta = 1; PEND = { st, nuovi };
  }
  function opera(st, R) {
    const nuovi = PEND && PEND.st === st ? PEND.nuovi : []; PEND = null; R.fetta = 0;
    const vo = voluta(st, R), mi = misura(st, R), sc = vo - mi;
    // i fili sono la spina dorsale: si spingono quelli aperti; le storylet sono semi solo se il paese è tranquillo (nessun filo vivo)
    let op = null;
    if (sc > CFG.soglia) { const a = spingiFilo(st, R, false), b = sc > 2 * CFG.soglia ? spingiFilo(st, R, false) : null; op = [a, b].filter(Boolean).join(' ') || (tranquillo(R) ? seme(st, R, nuovi, false) : null) || spingi(st, R); }
    else if (sc < -CFG.soglia) op = raffredda(st, R, nuovi);
    else if (tranquillo(R) && (R.chiusaOra || !R.attive.length)) op = seme(st, R, nuovi, false);
    else if (st.t - (R.tSp || 0) >= 30) { op = spingiFilo(st, R, false); R.tSp = Math.round(st.t); }
    const x = incrociaFili(st, R) || incrocia(st, R), y = ripaga(st, R);
    R.ultimaMisura = [r2(vo), r2(mi)];
    if (op || x || y) { R.ops.push([Math.round(st.t), [op, x, y].filter(Boolean).join(' ')]); if (R.ops.length > 40) R.ops.shift(); }
  }
  function fase(st) {
    const R = S(st); if (!R || !st.npcs) return;
    if (!R.fetta && st.t < R.prossimo) return;
    const a = now();
    if (R.fetta) opera(st, R); else { R.prossimo = Math.round(st.t + CFG.battito); battito(st, R); }
    const ms = now() - a; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
  }
  Un().fase('unico.regia', { dopo: 'unico.memoria', budget: { p95: .05 } }, fase);
  { const FA = Un()._.FASI, i = FA.findIndex(f => f.nome === 'unico.regia'), j = FA.findIndex(f => f.nome === 'unico.mente'); if (i > j && j >= 0) FA.splice(j, 0, FA.splice(i, 1)[0]); }   // prima della mente
  if (Un().nasce) Un().nasce('regia', st => { S(st); });
  ME().innesti.spinta = spinteDi;

  // ======================= LA SCHEDA «STORIE» DEL TACCUINO (§C.6) =======================
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const titolo = k => { const t = k.replace(/_/g, ' '); return t[0].toUpperCase() + t.slice(1); };
  const quando = t => `${G.dayName ? G.dayName(t) : ''} ${G.clockStr ? G.clockStr(t) : ''}`.trim();
  function htmlStorie(st) {
    const R = S(st); if (!R) return '';
    const vivi = R.fili.filter(fl => (fl.sa || DEBUG) && fl.n >= 2).sort((a, b) => b.tens - a.tens || b.tu - a.tu).slice(0, DEBUG ? 30 : 12);
    const finiti = R.fchiusi.filter(c => (c.sa || DEBUG) && c.n >= 2 && c.esito !== 'troppi').slice(-10).reverse();
    const A = R.attive.filter(s => s.sa || DEBUG), C = R.chiuse.filter(c => c.sa || DEBUG).slice(-6).reverse();
    const colpi = L => '<small>' + L.slice(-4).map(c => esc(quando(c[0]) + ' · ' + rigaColpo(st, c[1], c[2], c[3]))).join('<br>') + '</small>';
    let h = '<p class="hint">Le storie del paese di cui sai qualcosa: quelle ancora aperte e come sono finite le altre.</p>';
    h += '<h4>In corso</h4><ul>' + (vivi.length ? vivi.map(fl => `<li><b>${esc(titoloFilo(st, fl))}</b> · <small>${esc(FAMIGLIE[fl.fam].domanda)}${DEBUG ? ' · t ' + fl.tens + ' · ' + fl.n + ' colpi · ' + fl.origine + (fl.regia ? ' · spinto ' + fl.regia : '') : ''}</small><br>${colpi(fl.colpi)}</li>`).join('') : '<li><span style="opacity:.7">Niente, per ora. Gira per il paese e ascolta.</span></li>') + '</ul>';
    h += '<h4>Finite</h4><ul>' + (finiti.length ? finiti.map(c => `<li><b>${esc(c.tit)}</b> · <small>${esc(quando(c.t1))}</small><br>${esc(c.fin || c.esito)}</li>`).join('') : '<li><span style="opacity:.7">Ancora nessuna.</span></li>') + '</ul>';
    if (A.length || C.length) h += '<h4>Semi del regista</h4><ul>' + A.map(s => `<li><b>${esc(titolo(s.k))}</b> · ${esc(Object.values(s.ruoli).map(id => nome(st, id)).join(', '))}<br><small>${esc(s.ultima || '…')}</small></li>`).join('') + C.map(c => `<li><b>${esc(titolo(c.k))}</b> · <small>${esc(c.riga || c.esito)}</small></li>`).join('') + '</ul>';
    if (DEBUG) h += `<h4>Regista (${esc(R.carattere)})</h4><p><small>voluta/vera ${esc(JSON.stringify(R.ultimaMisura || []))} · fili ${R.fili.length} aperti · ${esc(JSON.stringify(R.fconti))} · Tq ${esc(JSON.stringify(R.tens.q))} · ultime: ${esc(R.ops.slice(-6).map(o => o[1]).join(' · '))}</small></p>`;
    return h;
  }
  if (Sg && Sg.scheda) Sg.scheda('u_storie', 'Storie', htmlStorie);

  // ======================= IL CONTROLLO DEL CATALOGO =======================
  function controlla() {
    const out = [], OB = ME().OBIETTIVI, TI = (SG() && SG().TIPI) || {}, V = VB(), FV = new Set();
    if (V && V.SCHEDE) for (const k in V.SCHEDE) FV.add(V.SCHEDE[k].fatto || k);
    for (const t of ['incontro', 'buca']) FV.add(t);
    for (const k in CARD) {
      const D = CARD[k], R = Object.keys(D.ruoli), P = D.passi.map(p => p.id), E = Object.keys(D.esiti);
      if (!['R', 'A', 'S'].includes(D.reg)) out.push(k + ': registro ' + D.reg);
      for (const t of (D.innesco.tipo || [])) if (!TI[t] && !FV.has(t)) out.push(k + ': innesco su un tipo sconosciuto ' + t);
      for (const p of D.passi) {
        for (const r in p.spinte || {}) { if (!R.includes(r)) out.push(k + '.' + p.id + ': ruolo ' + r); if (!OB[p.spinte[r][0]]) out.push(k + '.' + p.id + ': obiettivo sconosciuto ' + p.spinte[r][0]); }
        for (const r of [].concat(p.attende.chi || [])) if (!R.includes(r)) out.push(k + '.' + p.id + ': attende un ruolo ' + r);
        for (const t of p.attende.tipo) if (!TI[t] && !FV.has(t)) out.push(k + '.' + p.id + ': attende un tipo sconosciuto ' + t);
        for (const d of Object.values(p.rami || {}).concat(p.poi ? [p.poi] : [], p.senza ? [p.senza] : [])) if (d[0] === '>' ? !P.includes(d.slice(1)) : !E.includes(d)) out.push(k + '.' + p.id + ': destinazione ' + d);
      }
      for (const t of JSON.stringify(D.segni || {}).match(/\{(\w+)\}/g) || []) if (!R.includes(t.slice(1, -1))) out.push(k + ': segno con ' + t);
      if (!D.segni || !D.segni.seme) out.push(k + ': senza segno di seme');
    }
    for (const fam in FAMIGLIE) for (const P of [FAMIGLIE[fam].spinte, FAMIGLIE[fam].calma]) for (const r in P || {}) if (!OB[P[r][0]]) out.push('filo ' + fam + ': obiettivo sconosciuto ' + P[r][0]);
    for (const t in TIPI_FILO) for (const rr of TIPI_FILO[t]) if (!FAMIGLIE[rr.fam]) out.push('tipo ' + t + ': famiglia ' + rr.fam);
    return out;
  }
  { const L = controlla(); if (L.length && typeof console !== 'undefined') console.warn('[Regista] il catalogo delle storie:', L); Regista.problemi = L; }

  // ======================= LE ENTRATE =======================
  function fili(st) { const R = S(st); return R ? { aperti: R.fili.map(fl => Object.assign({ titolo: titoloFilo(st, fl), domanda: FAMIGLIE[fl.fam].domanda }, fl)), chiusi: R.fchiusi, conti: R.fconti } : null; }
  function filoDi(st, id) { const R = st && st.u && st.u.regia; if (!R || !R.fili) return []; return R.fili.filter(fl => fl.part.includes(id)).map(fl => ({ id: fl.id, fam: fl.fam, ruolo: Object.keys(fl.ruoli).find(r => fl.ruoli[r] === id) || null })); }
  function stato(st) { const R = S(st); return R ? { carattere: R.carattere, voluta: R.ultimaMisura, fili: R.fili.length, fconti: R.fconti, attive: R.attive.map(s => [s.k, D0(s), s.ruoli]), chiuse: R.chiuse.length, tens: R.tens, ops: R.ops.slice(-10), stats: Object.assign({}, stats) } : null; }
  const D0 = s => (CARD[s.k] ? CARD[s.k].passi[s.passo].id : '?');
  function carattere(st, k) { const R = S(st); if (R && CFG.caratteri[k]) R.carattere = k; return R ? R.carattere : null; }
  function tq(st, x, y) { const R = st && st.u && st.u.regia; return R ? R.tens.q[quart(x, y)] || 0 : 0; }
  function ruoloDi(st, id) { const R = st && st.u && st.u.regia; if (!R) return null; for (const s of R.attive) for (const r in s.ruoli) if (s.ruoli[r] === id) return { k: s.k, id: s.id, ruolo: r, passo: s.passo }; return null; }
  function storie(st) { const R = S(st); return R ? { attive: R.attive, chiuse: R.chiuse } : null; }
  // per le prove e l'ispettore: semina subito la storia k (dal fatto f, o spontanea) senza guardare la curva
  function forza(st, k, f) { const R = S(st), D = CARD[k]; if (!R || !D) return null; const ru = f ? ruoliDa(st, R, D, f) : {}; if (!ru) return null; const C = casting(st, R, D, ru); return C ? inizia(st, R, k, C.ruoli, f || null) : null; }
  Object.assign(Regista, { CFG, GT, stato, fili, filoDi, titoloFilo, carattere, tq, ruoloDi, storie, forza, controlla, spinteDi, html: htmlStorie, _: { S, cuci, spingiFilo, incrociaFili, chiudiFilo, rigaColpo, battito, fase, semina, spingi, raffredda, incrocia, ripaga, avanza, chiudi, casting, punteggio, voluta, misura } });
  Un().Regista = Regista;
  return Regista;
})();
if (typeof window !== 'undefined') window.Regista = Regista;
