/* [unico] unico_memoria.js: LA MEMORIA DEL SISTEMA UNICO, passo 2 (progetto: commedia/SISTEMA_UNICO.md §2, §2.4, §5 riga vita, §10 riga 2).
   Dietro ?commedia. Spento il flag: Fatto = { ON: false } e nient'altro (nessun aggancio, Vita.fatto intatto).

   FATTO è il solo registro dei fatti del mondo. Sta in st.u.fatti e contiene solo numeri, stringhe e array di primitivi: mai un NPC,
   un edificio o una funzione (un riferimento è sempre un id), così il passo 6 lo salva così com'è.
     st.u.fatti = { n, testa, anello: [fatto...] (≤ 2.000, circolare), notevoli: [fatto...] (≤ 600), conti: { tipo: quanti }, capG, ultimoV }
   Un fatto (§2.4): { id (intero), t, v (il tipo), chi, con: [id...], cosa, q, soldi, dove: [x, y, luogo], esito, causa (id intero o
   null), peso, hop, test: [id...] (testimoni entro 18 m, non al chiuso), vis (2 visto entro 26 m, 1 sentito entro 60 m, 0), segno
   (null fino al passo 4), pub (0..1), ril (rilievo = gravità × pubblico × novità: decide chi resta fra i notevoli), fo (la fonte:
   'vita', 'casa', 'ini', 'altro', 'unico'), vid (l'id del registro di vita, 'f12'), d (la frase, se c'è), x: {i dati primitivi} }.

   LA DEVIAZIONE. Vita.fatto (la porta che usano casa.js, e quindi fattoCerto, iniziative.js e gli altri) passa da Fatto.scrivi, con la
   stessa firma (tipo, chi, dati, causa) e lo stesso ritorno (l'id di vita). Il registro di vita resta il FORNITORE della regola
   (peso ×0,6 del padre, la catena si ferma sotto 0,15, al massimo 400 fatti al giorno: Vita.CFG) e la sua VISTA corta (st.vita.fatti,
   gli ultimi 300, che i conti di vita leggono); i fatti che vita scrive da sé (le chiamate interne, che non passano da Vita.fatto) si
   adottano nello stesso passo, in ordine di id. Così la catena è quella di oggi per costruzione, e Fatto la ricontrolla da solo
   (Fatto.stats.discordi: un peso che non è ×0,6 del padre). Senza vita, Fatto.scrivi applica la stessa regola sui fatti suoi.
   GLI INDICI per attore, tipo e luogo (e id di vita → id) sono derivati: non si salvano, si rifanno dall'anello e dai notevoli.
   L'ANELLO tiene gli ultimi 2.000; chi esce resta fra i notevoli se il suo rilievo passa la soglia (≥ .25), e fra i notevoli pieni
   esce quello col rilievo più basso.
   I DERIVATI sono funzioni pure sui fatti (§2.4), mai stato a parte:
   - Fatto.rancore(st, a, b): il rancore di a verso b, 0..1. Furto, buca, parola rotta, scusa falsa, denuncia, lite, muso, sfottò,
     debito scaduto: ognuno pesa k(v) e decade del 10% al giorno.
   - Fatto.debito(st, a, b): quanto b deve ad a, in lire (+ mi deve). Prestito (+v), regalo (+2, il debito di favore di vita), saldato (−v).
   - Fatto.rel(st, a, b) → { rancore, debito, fatti }.
   LE ENTRATE: Fatto.scrivi, Fatto.di(st, id), Fatto.daVita(st, vid), Fatto.per(st, { chi, tipo, luogo, da, a }), Fatto.catena(st, id),
   Fatto.tutti(st), Fatto.puro(x) (lancia se trova una funzione, un oggetto con .pop o .look, o un ciclo). */
var Fatto = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Fatto = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Fatto;
  if (!ON) return Fatto;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  if (!G || !Un()) { Fatto.ON = false; return Fatto; }
  const Vi = () => (typeof Vita !== 'undefined' && Vita.ON ? Vita : null);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CFG = Fatto.CFG = { anello: 2000, notevoli: 600, soglia: .25, decad: .6, minPeso: .15, capGiorno: 400, testR: 18, testMax: 8, visR: 26, sentiR: 60, novita: 3, rancoreDecad: .9, catenaMax: 16 };
  // la regola della catena è quella di vita (Vita.CFG): una sola, letta da lì quando c'è
  const regola = () => { const V = Vi(), C = V && V.CFG; return C ? { decad: C.decad, minPeso: C.minPeso, cap: C.capGiorno } : { decad: CFG.decad, minPeso: CFG.minPeso, cap: CFG.capGiorno }; };
  const stats = Fatto.stats = { adottati: 0, scritti: 0, propri: 0, fermati: 0, discordi: 0, persi: 0, sfrattati: 0, notevoli: 0, scartati: 0, ms: 0, msMax: 0 };

  // ======================= LO STATO (st.u.fatti) =======================
  function M(st) {
    if (!st || !st.u) return null;   // prima che la porta faccia st.u (la partita nata prima dei moduli): si adotta dopo, da st.vita.fatti
    return st.u.fatti || (st.u.fatti = { n: 0, testa: 0, anello: [], notevoli: [], conti: {}, capG: {}, ultimoV: 0 });
  }
  // gli indici: derivati, in un WeakMap sull'oggetto dei fatti (non si salvano; dopo un caricamento si rifanno)
  const IDX = new WeakMap();
  function nuovoIdx() { return { id: new Map(), vid: new Map(), chi: new Map(), tipo: new Map(), luogo: new Map(), novi: new Map() }; }
  const metti = (m, k, id) => { if (k === null || k === undefined) return; let s = m.get(k); if (!s) m.set(k, s = new Set()); s.add(id); };
  const togli = (m, k, id) => { const s = m.get(k); if (s) { s.delete(id); if (!s.size) m.delete(k); } };
  const attori = f => (f.chi ? [f.chi] : []).concat(f.con || []);
  function indicizza(I, f) {
    I.id.set(f.id, f); if (f.vid) I.vid.set(f.vid, f.id);
    for (const a of attori(f)) metti(I.chi, a, f.id);
    metti(I.tipo, f.v, f.id); metti(I.luogo, f.dove ? f.dove[2] : null, f.id);
    const kn = f.v + '|' + (f.dove ? f.dove[2] : ''); if (!(I.novi.get(kn) >= f.t)) I.novi.set(kn, f.t);
  }
  function disindicizza(I, f) {
    I.id.delete(f.id); if (f.vid) I.vid.delete(f.vid);
    for (const a of attori(f)) togli(I.chi, a, f.id);
    togli(I.tipo, f.v, f.id); togli(I.luogo, f.dove ? f.dove[2] : null, f.id);
  }
  function idx(st) {
    const F = M(st); if (!F) return null;
    let I = IDX.get(F); if (I) return I;
    I = nuovoIdx(); for (const f of F.notevoli) indicizza(I, f); for (const f of inOrdine(F)) indicizza(I, f);
    IDX.set(F, I); return I;
  }
  // l'anello dal più vecchio al più nuovo
  function inOrdine(F) { const A = F.anello, L = A.length; if (L < CFG.anello || !F.testa) return A.slice(); return A.slice(F.testa).concat(A.slice(0, F.testa)); }

  // ======================= IL RILIEVO (gravità × pubblico × novità) =======================
  const GRAV = { furto: 1, rissa: 1, denuncia: .9, arresto: .9, infamia_creduta: .8, grigi: .7, casa_ricettato: .7, lite: .7, restituito: .6, prestito: .6, rinfacciato: .6, parola_rotta: .6, buca: .6,
    saldato: .5, regalo: .5, patto: .5, scusa_falsa: .5, rancore: .5, iniziativa: .5, crossato: .5, rivincita: .5, sfida: .5, parola_mantenuta: .45, appuntamento: .4, incontro: .4, muso: .4,
    scusa_vera: .35, casa_dipinge: .35, movente: .3, favore_negato: .3, appuntamento_no: .25, promemoria: .2, ricordo: .2, social: .08, chiacchiera: .1 };
  const grav = v => GRAV[v] !== undefined ? GRAV[v] : /^casa_/.test(v) ? .25 : .2;

  // ======================= I DATI: solo primitivi =======================
  const prim = x => x === null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean';
  const idDi = x => (x && typeof x === 'object' ? (x.id !== undefined && prim(x.id) ? x.id : null) : prim(x) ? x : null);
  function pulisci(dati) {
    const out = {}; let k = 0; if (!dati || typeof dati !== 'object') return out;
    for (const key in dati) {
      if (key === 'd' || k >= 10) continue; const v = dati[key];
      if (typeof v === 'string') { out[key] = v.length > 60 ? v.slice(0, 60) : v; k++; }
      else if (typeof v === 'number') { if (isFinite(v)) { out[key] = Math.round(v * 100) / 100; k++; } }
      else if (typeof v === 'boolean' || v === null) { out[key] = v; k++; }
      else if (v && typeof v === 'object' && !Array.isArray(v) && v.id !== undefined && prim(v.id)) { out[key] = String(v.id); k++; }   // un NPC o un posto: il suo id
      else if (Array.isArray(v) && v.length <= 6 && v.every(prim)) { out[key] = v.slice(); k++; }
    }
    return out;
  }
  const NO = /(_no|_negato|negato|_rotta|^buca|scusa_falsa)$/;
  function luogoDi(st, chi, dati) {
    if (dati && dati.bi !== undefined && prim(dati.bi)) return { x: null, y: null, l: 'b:' + dati.bi };
    const n = chi && chi !== 'player' ? G.byId(st, chi) : null, p = st.player;
    let x = dati && typeof dati.x === 'number' ? dati.x : n ? n.x : p ? p.x : 0, y = dati && typeof dati.y === 'number' ? dati.y : n ? n.y : p ? p.y : 0;
    let l = null;
    if (n && n.inside && n.pop && n.pop.at && n.pop.at.k === 'b') l = 'b:' + n.pop.at.bi;
    else if (!n && chi === 'player' && p && p.indoor) l = 'dentro';
    else l = posto(x, y);
    return { x, y, l, dentro: !!(n ? n.inside : p && p.indoor) };
  }
  // il posto più vicino entro 60 m (G.nearestPlace rifà Object.values a ogni chiamata: qui la lista si tiene, e si rifà se cambia)
  let PL = null, PLn = -1;
  function posto(x, y) {
    const P = G.PLACES; if (!P) return 'fuori';
    if (!PL || PLn !== Object.keys(P).length) { PL = Object.values(P).filter(q => q && q.id && typeof q.x === 'number'); PLn = Object.keys(P).length; }
    let b = null, bd = 3600; for (let i = 0; i < PL.length; i++) { const q = PL[i], dx = q.x - x, dy = q.y - y, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = q; } }
    return b ? b.id : 'fuori';
  }
  // i testimoni: entro 18 m, non al chiuso, vivi (la stessa regola di emitSeen, senza il caso: la memoria non tira dadi)
  function testimoni(st, x, y, escl) {
    const out = []; if (x === null || !st.npcs) return out;
    for (const k of st.npcs) { if (out.length >= CFG.testMax) break; if (!k || k.dead || k.inside || !k.pop || escl.includes(k.id)) continue; const dx = k.x - x, dy = k.y - y; if (dx * dx + dy * dy < CFG.testR * CFG.testR) out.push(k.id); }
    return out;
  }

  // ======================= LA SCRITTURA =======================
  // un fatto nuovo nella memoria: rec ha già id di vita (vid), t, v, chi[], causa (id intero o null), peso, hop
  function registra(st, rec, dati, fonte) {
    const F = M(st), I = idx(st); if (!F) return null;
    const ids = (rec.chi || []).map(idDi).filter(x => x !== null && x !== undefined).map(String);
    const chi = ids[0] || null, con = ids.slice(1);
    const pos = luogoDi(st, chi, dati), p = st.player;
    const test = pos.dentro ? [] : testimoni(st, pos.x, pos.y, ids);
    let vis = 0; if (p && pos.x !== null && !(pos.dentro && !p.indoor)) { const dd = hyp(p.x - pos.x, p.y - pos.y); vis = dd < CFG.visR ? 2 : dd < CFG.sentiR ? 1 : 0; }
    const x = pulisci(dati);
    const pub = clamp(test.length * .12 + (pos.dentro ? 0 : .1) + (vis ? .1 : 0) + (rec.v === 'iniziativa' ? .2 : 0), 0, 1);
    const kn = rec.v + '|' + pos.l, ult = I.novi.get(kn), novita = ult === undefined || rec.t - ult > CFG.novita * 1440 ? 1 : .4;
    const f = {
      id: ++F.n, t: Math.round(rec.t * 100) / 100, v: String(rec.v), chi, con,
      cosa: typeof x.cosa === 'string' ? x.cosa : typeof x.id === 'string' ? x.id : null,
      q: typeof x.q === 'number' ? x.q : null,
      soldi: typeof x.v === 'number' ? x.v : typeof x.dm === 'number' ? x.dm : null,
      dove: [pos.x === null ? null : Math.round(pos.x * 10) / 10, pos.y === null ? null : Math.round(pos.y * 10) / 10, pos.l],
      esito: NO.test(rec.v) || x.esito === 'no' ? 'no' : 'ok',
      causa: rec.causa, peso: rec.peso, hop: rec.hop, test, vis, segno: null, pub: Math.round(pub * 100) / 100,
      ril: Math.round(grav(rec.v) * (.3 + pub) * novita * 1000) / 1000, fo: fonte,
    };
    if (rec.vid) f.vid = rec.vid;
    if (rec.cx) f.cx = rec.cx;   // la causa data ma non trovata (fuori dalla finestra di vita, o un id di casa/iniziative)
    if (dati && typeof dati.d === 'string') f.d = dati.d.slice(0, 140);
    if (Object.keys(x).length) f.x = x;
    if (rec.scad) f.scad = rec.scad;
    // nell'anello; chi ne esce resta fra i notevoli se lo merita
    if (F.anello.length < CFG.anello) F.anello.push(f);
    else { const old = F.anello[F.testa]; F.anello[F.testa] = f; F.testa = (F.testa + 1) % CFG.anello; esce(F, I, old); }
    indicizza(I, f);
    F.conti[f.v] = (F.conti[f.v] || 0) + 1;
    return f;
  }
  function esce(F, I, f) {
    stats.sfrattati++;
    if (f.ril < CFG.soglia) { disindicizza(I, f); stats.scartati++; return; }
    F.notevoli.push(f); stats.notevoli++;
    if (F.notevoli.length > CFG.notevoli) {
      let j = 0; for (let i = 1; i < F.notevoli.length; i++) if (F.notevoli[i].ril < F.notevoli[j].ril) j = i;
      const via = F.notevoli.splice(j, 1)[0]; disindicizza(I, via); stats.scartati++;
    }
  }
  // l'adozione dei fatti di vita: quelli nati dall'ultima volta, in ordine di id (st.vita.fatti è in ordine)
  const numV = vid => (typeof vid === 'string' && vid[0] === 'f' ? +vid.slice(1) || 0 : 0);
  let fonteProssima = null;
  function adotta(st) {
    const F = M(st), V = st && st.vita; if (!F || !V || !V.fatti || !V.fatti.length) return 0;
    const L = V.fatti; if (numV(L[L.length - 1].id) <= F.ultimoV) return 0;
    const t0 = now(), I = idx(st), R = regola();
    let i = L.length - 1; while (i > 0 && numV(L[i - 1].id) > F.ultimoV) i--;
    if (numV(L[i].id) > F.ultimoV + 1 && F.ultimoV) stats.persi += numV(L[i].id) - F.ultimoV - 1;   // usciti dalla vista di vita prima di essere visti
    let k = 0;
    for (; i < L.length; i++) {
      const g = L[i], nv = numV(g.id); if (nv <= F.ultimoV) continue;
      const pid = g.hop > 0 && g.causa ? I.vid.get(g.causa) : undefined;
      if (g.hop > 0 && pid !== undefined) { const par = I.id.get(pid); if (!par || Math.abs(par.peso * R.decad - g.peso) > 1e-12 || par.hop + 1 !== g.hop) stats.discordi++; }
      else if (g.hop > 0) stats.discordi++;
      const dati = g.dati || {};
      const fonte = dati.casa !== undefined ? 'casa' : dati.ini !== undefined ? 'ini' : fonteProssima === g.id ? 'altro' : 'vita';
      let scad = null;
      if (g.tipo === 'prestito' && g.chi && g.chi.length >= 2) { const b = G.byId(st, g.chi[1]), D = b && b.pop && b.pop.debiti && b.pop.debiti[g.chi[0]]; if (D && D.causa === g.id && D.scad) scad = D.scad; }
      registra(st, { vid: g.id, t: g.t, v: g.tipo, chi: g.chi, causa: pid !== undefined ? pid : null, cx: g.hop === 0 && g.causa ? String(g.causa) : null, peso: g.peso, hop: g.hop, scad }, dati, fonte);
      F.ultimoV = nv; k++; stats.adottati++;
    }
    const ms = now() - t0; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
    return k;
  }
  // senza vita (o per un fatto nuovo dei verbi): la stessa regola sui fatti nostri
  function proprio(st, tipo, chi, dati, causa) {
    const F = M(st); if (!F) return null; const I = idx(st), R = regola();
    const pid = typeof causa === 'number' ? causa : typeof causa === 'string' ? I.vid.get(causa) : undefined;
    const par = pid !== undefined ? I.id.get(pid) || null : null;
    const peso = par ? par.peso * R.decad : 1;
    if (par && peso < R.minPeso) { stats.fermati++; return null; }
    const d = Math.floor(st.t / 1440); if ((F.capG[d] = (F.capG[d] || 0) + 1) > R.cap) { stats.fermati++; return null; }
    for (const k in F.capG) if (+k < d - 1) delete F.capG[k];
    stats.propri++;
    return registra(st, { t: st.t, v: tipo, chi: [].concat(chi || []), causa: par ? par.id : null, cx: !par && causa ? String(causa) : null, peso, hop: par ? par.hop + 1 : 0 }, dati, 'unico');
  }
  // LA PORTA: la firma di Vita.fatto. Ritorna { id, vid } (vid: l'id di vita, quello che i chiamanti di Vita.fatto si aspettano)
  let vitaFatto = null;   // il Vita.fatto di prima (lingua compresa): il fornitore della regola e della vista corta
  function scrivi(tipo, chi, dati, causa, opt) {
    const st = (opt && opt.st) || (Un() && Un().st); stats.scritti++;
    if (vitaFatto && !(opt && opt.proprio)) {
      let cv = causa; if (typeof causa === 'number') { const I = idx(st), f = I && I.id.get(causa); cv = f && f.vid ? f.vid : null; }
      const vid = vitaFatto(tipo, chi, dati, cv);
      if (vid === null || vid === undefined) { stats.fermati++; return { id: null, vid: null }; }
      fonteProssima = vid; adotta(st); fonteProssima = null;
      const I = idx(st); return { id: I ? (I.vid.get(vid) !== undefined ? I.vid.get(vid) : null) : null, vid };
    }
    if (!st) return { id: null, vid: null };
    const f = proprio(st, tipo, chi, dati, causa); return { id: f ? f.id : null, vid: null };
  }

  // ======================= LE LETTURE =======================
  const di = (st, id) => { const I = idx(st); return I ? I.id.get(id) || null : null; };
  const daVita = (st, vid) => { const I = idx(st); const id = I && I.vid.get(vid); return id !== undefined && id !== null ? I.id.get(id) || null : null; };
  function tutti(st) { const F = M(st); if (!F) return []; return F.notevoli.slice().sort((a, b) => a.id - b.id).concat(inOrdine(F)); }
  // per({ chi, tipo, luogo, da, a }): i fatti in ordine di id; l'insieme più piccolo fa da guida
  function per(st, q) {
    const I = idx(st); if (!I) return []; q = q || {};
    const S = []; if (q.chi !== undefined) S.push(I.chi.get(String(q.chi)) || new Set()); if (q.tipo !== undefined) S.push(I.tipo.get(q.tipo) || new Set()); if (q.luogo !== undefined) S.push(I.luogo.get(q.luogo) || new Set());
    let ids;
    if (!S.length) ids = Array.from(I.id.keys());
    else { S.sort((a, b) => a.size - b.size); ids = []; for (const id of S[0]) if (S.every(s => s.has(id))) ids.push(id); }
    const out = []; for (const id of ids) { const f = I.id.get(id); if (f && (q.da === undefined || f.t >= q.da) && (q.a === undefined || f.t <= q.a)) out.push(f); }
    return out.sort((a, b) => a.id - b.id);
  }
  function catena(st, id) {
    const out = []; let f = di(st, id), k = 0;
    while (f && k++ < CFG.catenaMax) { out.unshift(f); f = f.causa !== null && f.causa !== undefined ? di(st, f.causa) : null; }
    return out;
  }

  // ======================= I DERIVATI: rancore e debito (funzioni pure sui fatti) =======================
  // [chi offende (indice negli attori), chi è offeso, k]; 'sim' = tutti e due
  const OFFESE = { furto: [0, 1, .5], denuncia: [0, 1, .4], buca: [0, 1, .3], parola_rotta: [0, 1, .3], scusa_falsa: [0, 1, .2], rinfacciato: [0, 1, .1],
    infamia_creduta: [1, 0, .3], muso: [1, 0, .2], rancore: [1, 0, .2], lite: ['sim', 0, .25], rissa: ['sim', 0, .35] };
  const K_SCADUTO = .3, K_SFOTTO = .1;
  const giorni = (st, t) => Math.max(0, (st.t - t) / 1440);
  function comuni(st, a, b) { const I = idx(st); if (!I) return []; const A = I.chi.get(String(a)), B = I.chi.get(String(b)); if (!A || !B) return []; const [s, l] = A.size < B.size ? [A, B] : [B, A]; const out = []; for (const id of s) if (l.has(id)) out.push(I.id.get(id)); return out.sort((x, y) => x.id - y.id); }
  // quanto b deve ad a (+), fra tutti i fatti di tutti e due; i debiti per verso, ognuno non sotto zero
  function debitoDa(L, a, b) {
    let ab = 0, ba = 0; a = String(a); b = String(b);
    for (const f of L) {
      const A = attori(f), x = A[0], y = A[1], v = typeof f.soldi === 'number' ? Math.abs(f.soldi) : 0;
      if (f.v === 'prestito') { if (x === a && y === b) ab += v; else if (x === b && y === a) ba += v; }
      else if (f.v === 'regalo') { if (x === a && y === b) ab += 2; else if (x === b && y === a) ba += 2; }
      else if (f.v === 'saldato') { if (x === b && y === a) ab = Math.max(0, ab - v); else if (x === a && y === b) ba = Math.max(0, ba - v); }
    }
    return ab - ba;
  }
  const debito = (st, a, b) => debitoDa(comuni(st, a, b), a, b);
  function rancoreDa(st, L, a, b) {
    a = String(a); b = String(b); let r = 0;
    for (const f of L) {
      const A = attori(f), o = OFFESE[f.v], dec = Math.pow(CFG.rancoreDecad, giorni(st, f.t));
      if (o) {
        if (o[0] === 'sim') { if ((A[0] === a && A[1] === b) || (A[0] === b && A[1] === a)) r += o[2] * dec; }
        else if (A[o[1]] === a && A[o[0]] === b) r += o[2] * dec;
      } else if (f.v === 'social' && f.x && f.x.kind === 'sfotti' && A[0] === b && A[1] === a) r += K_SFOTTO * dec;
    }
    // il debito scaduto: un prestito di a a b passata la scadenza, non ancora saldato del tutto
    for (const f of L) {
      if (f.v !== 'prestito' || !f.scad || st.t <= f.scad) continue; const A = attori(f); if (A[0] !== a || A[1] !== b) continue;
      const resa = L.filter(g => g.v === 'saldato' && g.id > f.id && attori(g)[0] === b && attori(g)[1] === a).reduce((s, g) => s + Math.abs(g.soldi || 0), 0);
      if (resa < Math.abs(f.soldi || 0)) r += K_SCADUTO * Math.pow(CFG.rancoreDecad, giorni(st, f.scad));
    }
    return clamp(r, 0, 1);
  }
  const rancore = (st, a, b) => rancoreDa(st, comuni(st, a, b), a, b);
  function rel(st, a, b) { const L = comuni(st, a, b); return { rancore: rancoreDa(st, L, a, b), debito: debitoDa(L, a, b), fatti: L.length }; }

  // ======================= PURO: niente funzioni, NPC o cicli (la regola di §6.2) =======================
  function puro(x, via) {
    const visti = new WeakSet(), pila = [];
    (function vai(v, p) {
      if (typeof v === 'function') throw new Error('funzione in ' + p);
      if (!v || typeof v !== 'object') return;
      if (visti.has(v)) { if (pila.includes(v)) throw new Error('ciclo in ' + p); return; }
      if (!Array.isArray(v) && (Object.prototype.hasOwnProperty.call(v, 'pop') || Object.prototype.hasOwnProperty.call(v, 'look'))) throw new Error('un NPC in ' + p);
      visti.add(v); pila.push(v);
      for (const k of Object.keys(v)) vai(v[k], p + '.' + k);
      pila.pop();
    })(x, via || 'x');
    return true;
  }

  // ======================= GLI AGGANCI =======================
  // Vita.fatto passa da qui (lingua è già avvolta sotto, e resta)
  { const V = Vi();
    if (V && typeof V.fatto === 'function' && !V.fatto.__memoria) {
      vitaFatto = V.fatto;
      const nuovo = function (tipo, chi, dati, causa) { return scrivi(tipo, chi, dati, causa).vid; };
      nuovo.__memoria = true; if (vitaFatto.__lingua) nuovo.__lingua = true;
      V.fatto = nuovo;
    } }
  // la fase: dopo la catena, i fatti che vita ha scritto da sé (le chiamate interne) entrano nella memoria nello stesso passo
  Un().fase('unico.memoria', { dopo: 'casa', budget: { p95: .05 } }, st => { adotta(st); });
  if (Un().nasce) Un().nasce('memoria', st => { M(st); });

  Object.assign(Fatto, { scrivi, di, daVita, per, tutti, catena, rancore, debito, rel, puro, OFFESE, GRAV,
    _: { M, idx, adotta, proprio, registra, inOrdine, comuni, vecchio: () => vitaFatto } });
  Un().Fatto = Fatto;
  return Fatto;
})();
if (typeof window !== 'undefined') window.Fatto = Fatto;
