// [commedia] iniziative.js: dietro ?commedia (vedi commedia/INIZIATIVE.md). Fuori dall'impronta dei tasselli (build.py TASS_FUORI).
/* Porto Vecchio — le iniziative libere degli abitanti. Uno strato sopra quello che c'è: nessun file del gioco è toccato,
   tutto passa da qui, a caricamento, solo con ?commedia. Spento il flag: Iniziative = { ON: false } e nient'altro.

   Quattro parti, un solo filo (il registro dei fatti, con la causa di ognuno):
     §1 GLI ESTRI     25 iniziative scritte (la lotteria, la fila per niente, la corsa delle carriole…) e le iniziative
                      composte dagli atomi (verbo × oggetto × posto × motivo × forma), provate a secco prima di partire.
                      Chi la pensa chiede agli altri (Vita.scambio se c'è), ci vanno davvero (Azioni.startPlan), succede
                      davvero (soldi, roba, muri, ricette, costruzioni), poi gli effetti a catena.
     §2 I MURI        le crew dei writer prendono iniziativa: crossano i rivali, rispondono, ripassano il muro ripulito,
                      fanno l'omaggio a chi è finito dentro; i Grigi ripuliscono; i toy copiano. Si usano WriterVita.mission,
                      Writing.npcWork e Writing._.addWork: la distribuzione dei graffiti alla nascita della città non si tocca.
     §3 I BISOGNI     freddo → legna; fame → castagne o pesca; riparo → la capanna nel bosco. Si procura la roba con le
                      ricette vere di Oggetti.RECIPES (raccogliere, fare, comprare, farsi prestare l'attrezzo) e si costruisce
                      con il catalogo vero di Cantiere (BY, footprint), segnato come cosa dell'abitante, non del giocatore.
     §4 LA CATENA     ogni fatto (roba passata, muro dipinto, folla, Grigi, lite, buca, banco lasciato…) può diventare il
                      motivo della prossima iniziativa: l'effetto farfalla, con il calo per salto e il tetto al giorno.
   Prima il fatto, poi la parola: ogni battuta porta l'id del fatto che dice. */
(function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Iniziative = { ON };
  if (typeof window !== 'undefined') window.Iniziative = Iniziative;
  if (typeof module !== 'undefined' && module.exports) module.exports = Iniziative;
  if (!ON) return;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) return;
  const Az = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const Po = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const Og = () => (typeof Oggetti !== 'undefined' ? Oggetti : null);
  const Sc = () => (typeof Scambi !== 'undefined' ? Scambi : null);
  const Ec = () => (typeof Economia !== 'undefined' ? Economia : null);
  const WR = () => (typeof Writing !== 'undefined' ? Writing : null);
  const WV = () => (typeof WriterVita !== 'undefined' ? WriterVita : null);
  const CN = () => (typeof Cantiere !== 'undefined' && Cantiere.BY && Cantiere.footprint ? Cantiere : null);
  const Vi = () => (typeof Vita !== 'undefined' && Vita.ON ? Vita : null);
  const Cm = () => (typeof Commedia !== 'undefined' && Commedia.ON ? Commedia : null);
  const Mt = () => (typeof Matti !== 'undefined' && Matti.S ? Matti : null);
  const Pa = () => (typeof Parola !== 'undefined' && Parola.ON ? Parola : null);
  const PLACES = G.PLACES, TS = G.TS, MPS = G.MIN_PER_SEC || 1.2;
  const hyp = Math.hypot, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = Math.random, pick = a => a[Math.floor(rnd() * a.length)];
  const dayIdx = t => Math.floor(t / 1440), mOf = t => ((t % 1440) + 1440) % 1440;
  const hourOf = st => mOf(st.t) / 60;
  const WD = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  const wdOf = t => WD[((dayIdx(t) % 7) + 7) % 7];

  const CFG = Iniziative.CFG = {
    ogni: 10,            // minuti di gioco fra due decisioni
    pGiorno: 22,         // iniziative al giorno in tutta la città (in media)
    vicine: 2,           // al massimo così tante vive entro 120 m dal giocatore
    tutte: 7,            // al massimo così tante vive in città
    raggio: 120,         // «vicino al giocatore»: per esteso
    parla: 22,           // le battute solo entro questa distanza
    cascate: 16,         // seguiti a catena al giorno, al massimo
    calo: .6,            // la probabilità di un seguito cala così a ogni salto
    memi: 60,            // le iniziative ricordate (nome, origine, discendenza), al massimo
    fatti: 500,          // il registro dei fatti, al massimo
    ia: false,           // chiedere alla Mente un'iniziativa nuova (JSON dagli atomi): spento di serie; 'finta' nelle prove
  };

  // ======================================================================================================================
  // ATTREZZI
  // ======================================================================================================================
  const S = st => st.ini || (st.ini = {
    fatti: [], nf: 1, viste: [], attive: [], ne: 1, memi: {}, righe: [], q: [], ng: 1, pend: [], casc: {}, giorno: -1, dec: 0, rt: 0, gt: 0,
    crew: { beef: { PVK: { BDS: 1 }, BDS: { PVK: 1 } }, visti: {}, piani: [], notte: -1, pulT: 0, toyT: 0, opere: {} },
    basi: [], bis: { i: 0, t: 0, fatti: {} }, copie: [],
    stats: { proposte: 0, valide: 0, scartate: 0, partite: 0, eseguite: 0, sciolte: 0, deserte: 0, interrotte: 0, invitati: 0, si: 0, no: 0, arrivati: 0,
      scritte: 0, composte: 0, ia: 0, copie: 0, fusioni: 0, sfide: 0, ricorrenti: 0, bandite: 0, sotto: 0, svanite: 0, seguiti: 0, seguitiNo: 0,
      dipinti: 0, crossati: 0, ripuliti: 0, risposte: 0, omaggi: 0, toy: 0, fatti_a_mano: 0, raccolti: 0, comprati: 0, prestiti: 0, costruiti: 0,
      righe: 0, righeTolte: 0, viste: 0, taciute: 0, guardia: 0, ms: 0, passi: 0, msMax: 0 },
  });
  const alive = n => n && !n.dead && n.pop && !(n.stun > 0);
  const nomeDi = n => (n ? n.first || n.name || '?' : '?');
  const dP = (st, n) => hyp(n.x - st.player.x, n.y - st.player.y);
  const vicino = (st, x, y, r) => hyp(x - st.player.x, y - st.player.y) < (r || CFG.raggio);
  function libero(st, n) {
    if (!alive(n) || n.cop || n.military || n.faction || n.__ev || n === st.player) return false;
    const P = n.pop; if (P.cast || P.matto || P.emer || (n.jailedUntil > st.t) || P.age < 13) return false;
    if (n.ord && (n.ord.protester || n.ord.coda || n.ord.fermato)) return false;
    if (n.inVeh || n.vehicle) return false;
    return true;
  }
  const bagsOf = n => [n.pop.inv || (n.pop.inv = {}), n.pop.casa || (n.pop.casa = {})];
  const haN = (n, id) => bagsOf(n).reduce((s, B) => s + (B[id] || 0), 0);
  const prendi = (n, id, q) => { const X = Sc(); if (X) return X.take(n, id, q || 1); let r = q || 1; for (const B of bagsOf(n)) { const t = Math.min(r, B[id] || 0); B[id] -= t; r -= t; if (B[id] <= 1e-6) delete B[id]; } return r <= 0; };
  const metti = (n, id, q) => { const X = Sc(); if (X) return X.put(n, id, q || 1); const B = n.pop.inv; B[id] = (B[id] || 0) + (q || 1); };
  const CATo = () => (Og() ? Og().CAT : {});
  const nm0 = id => (Og() && Og().nm ? Og().nm(id) : String(id).replace(/_/g, ' '));
  // il nome corto, come lo dice la gente: «la legna», non «il fascio di legna da ardere»
  const nm = id => { const s = String(nm0(id) || id); const m = s.match(/^(?:flacone|fascio|fasci|sacchetto|sacco|scatola|scatolina|pacco|barattolo|cassetta|mazzo|rotolo|confezione|bottiglia|vasetto|bustina|tanica|pezzo|paio) d[ie]l?l?[ao']? ?(.+)$/); return (m ? m[1] : s).replace(/ da ardere$/, '').replace(/^(.+) secchi$/, '$1'); };
  const isArma = id => { const c = CATo()[id]; return !!(c && (c.wpn || c.ill)) || /pistol|lupara|mitra|munizion|coltell|grimald|piede|manett|refurtiv|roba/.test(id); };
  const note = (st, n, text, kind, x) => { const P = Po(); if (P && n && n.pop) try { P.note(st, n, text, kind || 'info', x || { w: .3 }); } catch (e) { } };
  const feel = (n, k, v) => { if (n && n.pop && n.pop.need && n.pop.need[k] !== undefined) n.pop.need[k] = clamp(n.pop.need[k] + v, 0, 1); };
  const amici = (st, a, b) => !!(a.pop.friends && a.pop.friends.includes(b.id));
  // la simpatia: lo stesso conto di azioni.js (P.rapp: a = simpatia, f = fiducia; P.rel sono i legami di famiglia)
  function rapp(a, b) { const P = a.pop; P.rapp = P.rapp || {}; return P.rapp[b.id] || (P.rapp[b.id] = { a: (P.friends || []).includes(b.id) ? .5 : (P.enemies || []).includes(b.id) ? -.6 : 0, f: 0 }); }
  function moveRel(st, a, b, v) { if (!a || !b || !a.pop || !b.id) return; const R = rapp(a, b); R.a = clamp((R.a || 0) + v, -1, 1); if (R.a < -.5 && a.pop.enemies && !a.pop.enemies.includes(b.id)) a.pop.enemies.push(b.id); }
  const relA = (a, b) => (a && a.pop && a.pop.rapp && a.pop.rapp[b.id] ? a.pop.rapp[b.id].a || 0 : 0);
  const giovane = n => (n.pop ? n.pop.age : 40) <= 27;
  const o_ = n => (n.pop && n.pop.sex === 'f' ? 'a' : 'o');
  function placeKeyAt(x, y) { let best = null, bd = 1e9; for (const k in PLACES) { const q = PLACES[k], d = hyp(q.x - x, q.y - y); if (d < bd) { bd = d; best = k; } } return best; }
  function tgtOf(key) { const P = Po(); let t = null; try { t = P && P.target ? P.target(key) : null; } catch (e) { t = null; } const q = PLACES[key]; return t || (q ? { k: 'p', pid: key, x: q.x, y: q.y, label: q.name, place: key } : null); }
  // gli articoli (come parola.js art): «una carriola», «delle castagne», «il salame»
  function genere(s) { const h = String(s).split(' ')[0].toLowerCase(), l = h.slice(-1); if (/^(radio|foto|moto|auto)$/.test(h)) return { f: 1, pl: 0, h }; if (/one$/.test(h) && !/ione$/.test(h)) return { f: 0, pl: 0, h }; if (h === 'uova') return { f: 1, pl: 1, h }; if (/ione$/.test(h) || l === 'a') return { f: 1, pl: 0, h }; if (l === 'i') return { f: 0, pl: 1, h }; if (l === 'e') return /^(pane|latte|sale|pesce|sapone|carbone|salame|giornale|cartone|cemento|fiore|cane|pneumatico|fiammifer)/.test(h) ? { f: 0, pl: 0, h } : { f: 1, pl: 1, h }; return { f: 0, pl: 0, h }; }
  const vow = h => /^[aeiouh]/.test(h), sC = h => /^(s[bcdfgklmnpqrstvz]|z|gn|ps|x|y|pn)/.test(h);
  function art(s, k) {
    const g = genere(s), h = g.h;
    if (k === 'det') return g.pl ? (g.f ? 'le ' : sC(h) || vow(h) ? 'gli ' : 'i ') + s : (vow(h) ? "l'" : g.f ? 'la ' : sC(h) ? 'lo ' : 'il ') + s;
    if (k === 'di') return g.pl ? (g.f ? 'delle ' : sC(h) || vow(h) ? 'degli ' : 'dei ') + s : (vow(h) ? "dell'" : g.f ? 'della ' : sC(h) ? 'dello ' : 'del ') + s;
    return g.pl ? (g.f ? 'delle ' : sC(h) || vow(h) ? 'degli ' : 'dei ') + s : (g.f ? (vow(h) ? "un'" : 'una ') : sC(h) ? 'uno ' : 'un ') + s;
  }
  // «alla Fontana di San Rocco», «al Molo dei pescatori», «all'Osteria»
  function aL(name) { const w = String(name || '').split(' ')[0], l = w.toLowerCase(); if (!w) return ''; if (/^(in|sotto|sopra|dietro|davanti|fuori|dentro|presso|lungo|oltre)$/.test(l)) return l + String(name).slice(w.length);
    { const AR = { il: 'al', lo: 'allo', la: 'alla', i: 'ai', gli: 'agli', le: 'alle' }; if (AR[l]) return AR[l] + String(name).slice(w.length); if (/^l'/.test(l)) return "all'" + String(name).slice(2); } if (vow(l)) return "all'" + name; const g = genere(w); if (g.pl) return (g.f ? 'alle ' : 'ai ') + name; if (g.f || /^(stazione|sorgente|torre|fonte)/.test(l)) return 'alla ' + name; return 'al ' + name; }
  const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
  const cap1 = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const lire = k => `${Math.round(k)}.000 lire`;

  // ======================================================================================================================
  // §4 IL REGISTRO DEI FATTI E LA CATENA (lo stesso formato di Vita.fatto: tipo, chi, dati, causa)
  // ======================================================================================================================
  function fatto(st, tipo, chi, dati, causa) {
    const I = S(st), par = causa ? idx(st).get(causa) || null : null;
    const f = { id: 'f' + I.nf++, tipo, chi: chi ? (chi.id || chi) : null, d: (dati && dati.d) || tipo, dati: dati || {}, causa: causa || null, hop: par ? par.hop + 1 : 0, salto: par ? (par.salto || 0) + (tipo === 'iniziativa' ? 1 : 0) : 0, t: st.t, x: dati && dati.x, y: dati && dati.y };
    const V = Vi(); if (V && V.fatto) try { f.vid = V.fatto(tipo, f.chi, Object.assign({ d: f.d, ini: f.id }, dati || {}), par && par.vid ? par.vid : causa || null); } catch (e) { }
    I.fatti.push(f); idx(st).set(f.id, f); if (I.fatti.length > CFG.fatti) I.fatti.splice(0, I.fatti.length - CFG.fatti).forEach(x => idx(st).delete(x.id));
    try { seguito(st, f); } catch (e) { }
    return f.id;
  }
  const IDX = new WeakMap(); function idx(st) { let m = IDX.get(st); if (!m) { m = new Map(); S(st).fatti.forEach(f => m.set(f.id, f)); IDX.set(st, m); } return m; }
  const fattoDi = (st, id) => (id ? idx(st).get(id) || null : null);
  function catena(st, id) { const out = []; let f = fattoDi(st, id), g = 0; while (f && g++ < 30) { out.unshift(f); f = f.causa ? fattoDi(st, f.causa) : null; } return out; }
  // «la lotteria della capra → la lite al mercato → la fila per il pane»
  const catenaTesto = (st, id) => catena(st, id).map(f => f.d).join(' → ');

  // ======================================================================================================================
  // LE BATTUTE: in fila come i frammenti di matti.js (la seconda solo se è uscita la prima), solo vicino, solo dopo il fatto
  // ======================================================================================================================
  // come una chiacchiera: dev'essere vera di quello che ha intorno (i frammenti di matti ne sono esenti, queste battute no)
  function contestoOk(st, n, text) { const C = Cm(); if (!C || !C.contesto || !C.contesto.vale) return true; try { return C.contesto.vale(st, n, text, 'fondo'); } catch (e) { return true; } }
  // battute: [[npc, testo], ...]; fid: il fatto che dicono; si: true se c'è dentro un sì vero (il cane da guardia lo lascia passare)
  function dire(st, battute, fid, opt) {
    const I = S(st), p = st.player; opt = opt || {};
    if (!fid || !fattoDi(st, fid)) { I.stats.righeTolte++; return false; }
    const L = battute.filter(b => b && b[0] && b[1]);
    if (!L.length) return false;
    if (L.some(([n]) => !alive(n) || dP(st, n) > CFG.parla || (n.inside && !p.indoor))) { I.stats.lontane = (I.stats.lontane || 0) + 1; return false; }
    const PA = Pa();
    for (const b of L) b[1] = cap1(String(b[1]).trim());
    for (const [n, t] of L) {
      if (/\{\w+\}/.test(t) || t.length > 70) { I.stats.righeTolte++; return false; }
      if (PA && PA.promette && PA.promette(t) && !opt.si) { I.stats.guardia++; (I.guardiaEs = I.guardiaEs || []).push(t); return false; }
      if (!contestoOk(st, n, t)) { I.stats.righeTolte++; return false; }
    }
    // Vita: lo scambio fra due lo scrive lei, se c'è (lo stesso fatto, le stesse battute)
    // fra due che non sono in un'iniziativa (la buca rinfacciata, la rivincita, il prestito): lo scambio lo mette in scena vita.js
    const V = Vi(); if (V && V.scambio && opt.vita && L.length >= 2 && L[0][0] !== L[1][0] && opt.intento && INT_VITA[opt.intento]) {
      const a = L[0][0], b = L[1][0], ruolo = n => (n === a ? 'a' : n === b ? 'b' : null);
      if (L.every(([n]) => ruolo(n))) try { const vf = fattoDi(st, fid); const r = V.scambio(a, b, 'ini_' + opt.intento, { causa: vf && vf.vid || null, __r: { esito: opt.esito || 'fatto', battute: [L.map(([n, t]) => [ruolo(n), t])], accettato: !!opt.si } });
        if (r && r.detto) { L.forEach(([n, t]) => I.righe.push({ t: st.t, c: st.clock, who: n.id, text: t, fatto: fid, via: 'vita' })); I.stats.righe += L.length; I.stats.vita = (I.stats.vita || 0) + 1; return true; } } catch (e) { }
    }
    // in coda da noi; e un'ombra nella coda di matti.js (a tempo infinito: matti non la dice), così la regia di commedia.js
    // le tratta come un frammento a due voci (la seconda esce solo se è uscita la prima) e i frammenti inventati aspettano
    // (l'ombra: la prima ha at === g, così commedia.js la tratta da prima voce; le altre da seguito)
    if (new Set(I.q.map(x => x.g)).size >= 2) { I.stats.piene = (I.stats.piene || 0) + 1; return false; }   // non più di due scambi in attesa: il resto è rumore
    const C0 = Cm(), R0 = C0 && C0.R, rit = R0 ? R0.lastAmb + R0.gap + .15 : 0;   // il ritmo della regia: la prima voce dopo l'ultima chiacchiera
    const gap = 2.7, at0 = Math.max(st.clock + .3, rit, I.q.length ? I.q[I.q.length - 1].at + gap * 2 : 0), g = 1e12 + (I.ng++) * 100, M = Mt();
    if (at0 - st.clock > 12) { I.stats.piene = (I.stats.piene || 0) + 1; return false; }
    const items = L.map(([n, t], i) => ({ id: n.id, text: t, at: at0 + i * gap, g, fid }));
    if (M) { const Q = M.S(st).q; items.forEach((it, i) => { it.sh = { id: it.id, text: it.text, at: g + i, g }; Q.push(it.sh); }); }
    I.q.push(...items);
    L.forEach(([n, t]) => { I.righe.push({ t: st.t, c: st.clock, who: n.id, text: t, fatto: fid }); if (I.righe.length > 400) I.righe.shift(); });
    I.stats.righe += L.length;
    L.forEach(([n], i) => { const o = L[(i + 1) % L.length][0]; if (o !== n) n.face = Math.atan2(o.y - n.y, o.x - n.x); });
    return true;
  }
  function togliOmbra(st, b) { const M = Mt(); if (!M || !b.sh) return; const Q = M.S(st).q, i = Q.indexOf(b.sh); if (i >= 0) Q.splice(i, 1); }
  function codaPropria(st) {
    const I = S(st); if (!I.q.length) return;
    while (I.q.length && I.q[0].at <= st.clock) {
      const b = I.q.shift(), n = G.byId(st, b.id);
      if (alive(n) && dP(st, n) < CFG.parla && !(n.inside && !st.player.indoor)) { const C = Cm(), T0 = C && C.stats ? Object.assign({}, C.stats.tolte) : null; G.say(st, n, b.text, 3.4); togliOmbra(st, b); if (T0) for (const k in C.stats.tolte) if ((C.stats.tolte[k] || 0) > (T0[k] || 0)) { const P0 = I.stats.perche = I.stats.perche || {}; P0[k] = (P0[k] || 0) + 1; }
        if (n.bark && n.bark.until > st.clock && (n.bark.text === b.text || I.q.length >= 0 && n.bark.until > st.clock + 1)) { I.stats.viste++; I.viste.push({ t: st.t, who: n.id, text: b.text, fatto: b.fid }); if (I.viste.length > 300) I.viste.shift(); } else I.stats.taciute++; }
      else { togliOmbra(st, b); I.q.filter(x => x.g === b.g).forEach(x => togliOmbra(st, x)); I.q = I.q.filter(x => x.g !== b.g); I.stats.taciute++; }
    }
  }
  const INT_VITA = { presta: 1, rinfaccia: 1, sfida: 1 };
  // la voce di chi parla: ragazzi, grandi, Grigi
  const voce = n => (n.cop ? 'g' : giovane(n) ? 'r' : 'a');
  const scegli = (L, n) => { if (!L) return null; if (Array.isArray(L)) return pick(L); const v = L[voce(n)] || L.a || L.r; return v ? pick(v) : null; };

  // ======================================================================================================================
  // §1 GLI ATOMI: i verbi che il motore sa fare davvero, ognuno con la sua prova a secco e il suo effetto
  // ======================================================================================================================
  // posti per tipo
  const P_PIAZZA = ['piazza', 'fontana', 'piazzetta', 'giardini', 'calata', 'lungomare', 'passeggiata', 'fiori'];
  const P_MARE = ['molo', 'pontile', 'calata', 'lungomare', 'marina', 'pesca_molo_vecchio', 'pesca_pontile', 'caletta', 'spiaggia'];
  const P_PESCA = Object.keys(PLACES).filter(k => /^pesca_|^molo$|^pontile$|^caletta$|^scogli_\d$/.test(k));
  const P_BAR = ['bar', 'osteria', 'sirena', 'osteria_sg', 'flipper'];
  const P_BOSCO = ['pineta', 'radura', 'sugheri', 'macchia', 'bosco_antico'].filter(k => PLACES[k]);
  const P_NASCOSTI = ['magazzino', 'discarica', 'grotta', 'ruderi', 'caletta', 'cava', 'muro'].filter(k => PLACES[k]);
  const P_SPESA = ['wu', 'piazza', 'fiori', 'calata'];
  const P_ALL = Object.keys(PLACES).filter(k => !/^casa_|^bagno_|^scogli_|^pesca_|hangar|deposito_|caserma|eliporto|poligono|ministero|governo|garante|archivio|rocca|commissariato|isola|tribu/.test(k));
  const okPosto = k => !!PLACES[k];
  // le cose da vendere che non sono oggetti (la vista, l'aria, il ritratto): soldi veri, niente roba
  const IMMATERIALI = { vista: 'la vista sul mare', aria: "l'aria di mare in barattolo", ritratto: 'il ritratto a carboncino', benedizione: 'la benedizione', previsione: 'il futuro', applauso: "l'applauso" };

  // il bottino di chi ha: un oggetto vero, non un'arma, non roba rubata
  const roba = n => bagsOf(n).flatMap(B => Object.keys(B).filter(k => (B[k] || 0) >= 1 && !isArma(k)));
  // le iniziative composte: VERBO → { nome, posti, ore, forma, min, max, dur, prova(st, E) → '' o il perché, fine(st, E) }
  const V = {};
  // --- la lotteria: biglietti da mille, il premio è roba vera di chi la organizza
  V.lotteria = { nome: o => `la lotteria ${art(nm(o), 'di')}`, posti: P_PIAZZA.concat(P_BAR), ore: [10, 21], forma: 'folla', min: 2, max: 7, dur: 25,
    ogg: (st, n) => roba(n).filter(k => (CATo()[k] ? CATo()[k].prezzo || 0 : 0) >= 1.2),
    prova: (st, E) => (haN(E.L, E.ogg) >= 1 ? '' : 'non ha il premio'),
    fine: (st, E) => { const A = E.arr.filter(n => n.pop.money >= 1); let inc = 0; A.forEach(n => { n.pop.money -= 1; E.L.pop.money += 1; inc++; });
      if (!A.length || !prendi(E.L, E.ogg, 1)) return { tipo: 'lotteria_vuota', d: `${E.nome}: nessun biglietto`, n: 0 };
      const w = pick(A); metti(w, E.ogg, 1); note(st, w, `ha vinto ${art(nm(E.ogg))} alla lotteria di ${nomeDi(E.L)}`, 'good', { w: .45, who: E.L.id, tag: 'lotteria' });
      A.filter(k => k !== w).forEach(k => { note(st, k, `ha perso mille lire alla lotteria di ${nomeDi(E.L)}`, 'info', { w: .2, who: E.L.id }); });
      return { tipo: 'vinto_oggetto', d: `${E.nome}: ${nomeDi(w)} vince ${art(nm(E.ogg), 'det')}`, vinc: w, n: A.length, inc, ogg: E.ogg }; } };
  // --- vendere: un oggetto (passa davvero) o una cosa che non è un oggetto (soldi veri)
  V.vendi = { nome: o => (IMMATERIALI[o] ? `la vendita ${art(IMMATERIALI[o].replace(/^(la|il|l'|lo) ?/, ''), 'di')}` : `il banco ${art(nm(o), 'di')}`), posti: P_PIAZZA.concat(P_MARE, ['belvedere']), ore: [9, 19], forma: 'folla', min: 0, max: 6, dur: 30,
    ogg: (st, n) => roba(n).filter(k => haN(n, k) >= 2).concat(Object.keys(IMMATERIALI)),
    prova: (st, E) => (IMMATERIALI[E.ogg] || haN(E.L, E.ogg) >= 1 ? '' : 'non ha niente da vendere'),
    fine: (st, E) => { const pr = IMMATERIALI[E.ogg] ? 1 : Math.max(1, Math.round((CATo()[E.ogg] || {}).prezzo || 1)); let k = 0, inc = 0;
      for (const b of E.arr) { if (b.pop.money < pr || rnd() < (b.tr ? b.tr.avid : .5) * .6) continue; if (!IMMATERIALI[E.ogg]) { if (!prendi(E.L, E.ogg, 1)) break; metti(b, E.ogg, 1); } b.pop.money -= pr; E.L.pop.money += pr; inc += pr; k++; note(st, b, `ha comprato ${IMMATERIALI[E.ogg] || art(nm(E.ogg))} da ${nomeDi(E.L)}`, 'info', { w: .2, who: E.L.id }); }
      return { tipo: k ? 'vendita' : 'vendita_vuota', d: k ? `${E.nome}: ${k} clienti, ${lire(inc)}` : `${E.nome}: nessuno compra`, n: k, inc }; } };
  // --- la gara: si corre davvero da un posto all'altro; la posta va a chi arriva prima
  V.gara = { nome: o => ({ '': 'la corsa', carriola: 'la corsa delle carriole', sedia: 'la corsa delle sedie', bicicletta: 'la corsa in bicicletta', casse: 'la corsa con le casse' })[o || ''] || `la corsa con ${art(nm(o), 'det')}`, posti: P_PIAZZA.concat(['spiaggia', 'molo', 'lungomare']), ore: [9, 20], forma: 'sfida', min: 1, max: 4, dur: 0,
    ogg: (st, n) => ['', 'carriola', 'sedia', 'bicicletta', 'casse'].filter(k => !k || haN(n, k) >= 1), corsa: true,
    prova: (st, E) => (E.ogg && haN(E.L, E.ogg) < 1 ? 'non ha il mezzo' : E.arrivo ? '' : 'nessun traguardo'),
    fine: (st, E) => { const R = E.ordine && E.ordine.length ? E.ordine.map(id => G.byId(st, id)).filter(Boolean) : E.arr.slice().sort((a, b) => (b.tr ? b.tr.cor : .5) - (a.tr ? a.tr.cor : .5)); const w = R[0] || E.L;
      let pot = 0; E.arr.forEach(n => { if (n !== w && n.pop.money >= 1) { n.pop.money -= 1; pot++; } }); w.pop.money += pot;
      note(st, w, `ha vinto ${E.nome}: ${lire(pot)}`, 'good', { w: .35, tag: 'gara' }); E.arr.filter(n => n !== w).forEach(n => note(st, n, `ha perso ${E.nome} contro ${nomeDi(w)}`, 'info', { w: .25, who: w.id }));
      return { tipo: E.arr.length >= 1 ? 'gara' : 'gara_sola', d: `${E.nome}: vince ${nomeDi(w)}`, vinc: w, n: E.arr.length, inc: pot, perde: R[R.length - 1] }; } };
  // --- giocare: le partite di Azioni.social (soldi veri, il baro, la lite)
  V.gioca = { nome: o => (o === 'carte' ? 'il torneo di scopa' : o === 'dadi' ? 'la bisca dei dadi' : 'la partitella'), posti: P_BAR.concat(['piazza', 'giardini', 'spiaggia']), ore: [15, 23], forma: 'amico', min: 1, max: 4, dur: 40,
    ogg: (st, n) => (haN(n, 'carte') ? ['carte'] : []).concat(['dadi', 'pallone']),
    prova: (st, E) => (E.ogg === 'carte' && haN(E.L, 'carte') < 1 ? 'non ha le carte' : ''),
    fine: (st, E) => { const A = Az(); let k = 0; E.arr.forEach(b => { if (A && A.social) { const m0 = E.L.pop.money; A.social(st, E.L, b, 'gioca', { gioco: E.ogg === 'carte' ? 'carte' : E.ogg === 'dadi' ? 'dadi' : 'pallone' }); k++; E.saldo = (E.saldo || 0) + E.L.pop.money - m0; } });
      return { tipo: k ? 'partita' : 'partita_vuota', d: `${E.nome}: ${k} partite`, n: k, inc: E.saldo || 0 }; } };
  // --- la fila: davanti a una bottega; alla fine si compra davvero (o niente: era una fila per niente)
  V.fila = { nome: (o, E) => (E && E.niente ? 'la fila per niente' : `la fila per ${art(nm(o || 'pane'), 'det')}`), posti: P_SPESA, ore: [8, 12], forma: 'folla', min: 0, max: 8, dur: 30, fila: true,
    ogg: () => ['pane', 'pane', 'sale', 'caffe', 'zucchero', 'olio'],
    prova: (st, E) => '',
    fine: (st, E) => { const X = Ec(); let k = 0; if (!E.niente && X) { const sh = shopFor(st, E.ogg, 1); if (sh) E.arr.concat([E.L]).forEach(n => { if (X.buy(st, n, sh.t, E.ogg, 1) != null) { metti(n, E.ogg, 1); k++; } }); }
      return { tipo: 'fila', d: E.niente ? `la fila per niente: ${E.arr.length + 1} in fila` : `${E.nome}: ${E.arr.length + 1} in fila, ${k} comprano`, n: E.arr.length + 1, comprati: k }; } };
  // --- esibirsi: il numero (serenata, comizio, pentole, bugie, imitazione del Garante): chi guarda si diverte, qualcuno no
  const NUMERI = { serenata: 'la serenata', comizio: 'il comizio sulla cassetta', pentole: 'il concerto di pentole', bugie: 'la gara di bugie', imitazione: "l'imitazione del Garante", fisarmonica: 'la fisarmonica', barzellette: 'le barzellette', predica: 'la predica', poesia: 'la poesia', ballo: 'il ballo in strada' };
  V.esibisci = { nome: o => NUMERI[o] || 'lo spettacolo', posti: P_PIAZZA.concat(P_BAR), ore: [11, 23], forma: 'folla', min: 1, max: 8, dur: 25,
    ogg: () => Object.keys(NUMERI),
    prova: (st, E) => (E.ogg === 'serenata' && !E.bersaglio ? 'nessuno a cui cantarla' : ''),
    fine: (st, E) => { E.arr.forEach(b => { feel(b, 'svago', -.2); moveRel(st, b, E.L, .05); }); let extra = {};
      if (E.ogg === 'comizio') E.arr.forEach(b => { if (b.ris) b.ris.ideo = clamp(b.ris.ideo + .03, 0, 1); });
      if (E.ogg === 'pentole' || E.ogg === 'fisarmonica') { const vic = st.npcs.find(k => alive(k) && !E.arr.includes(k) && k !== E.L && !k.cop && hyp(k.x - E.L.x, k.y - E.L.y) < 30 && k.tr && k.tr.cor > .45); const A = Az(); if (vic && A && A.quarrel) { A.quarrel(st, vic, E.L, 'il baccano'); extra = { lite: vic }; } }
      if (E.ogg === 'serenata' && E.bersaglio) { const b = E.bersaglio, A = Az(); if (relA(b, E.L) > .15 && A && A.social) { A.social(st, b, E.L, 'apprezza'); extra = { esito: 'si' }; } else { feel(E.L, 'svago', .1); note(st, E.L, `${nomeDi(b)} non si è affacciat${o_(b)} alla serenata`, 'bad', { w: .35, who: b.id }); extra = { esito: 'no' }; } }
      if (E.ogg === 'imitazione' && rnd() < .12) { const P = Po(); if (P && P.arrest) { P.arrest(st, E.L, 'oltraggio al Garante'); extra = { arresto: true }; } }
      return Object.assign({ tipo: extra.lite ? 'lite' : extra.arresto ? 'arresto' : 'esibizione', d: `${E.nome}: ${E.arr.length} a guardare${extra.lite ? `, ${nomeDi(extra.lite)} si arrabbia` : ''}${extra.arresto ? ', i Grigi lo portano via' : ''}`, n: E.arr.length, chi2: extra.lite || null }, extra); } };
  // --- la protesta: il cartello in mano, seduti; i Grigi la guardano più da lontano
  const MOTIVI_P = { panchina: 'per la panchina', fontana: "per l'acqua della fontana", lampione: 'per il lampione rotto', autobus: "per l'autobus delle sette", pane: 'per il prezzo del pane', gatti: 'per i gatti del porto', muro: 'per il muro ripulito', nome: 'per chi hanno portato via' };
  V.protesta = { nome: o => `la protesta ${MOTIVI_P[o] || 'per niente'}`, posti: ['giardini', 'fontana', 'piazza', 'calata', 'piazzetta'], ore: [9, 18], forma: 'folla', min: 2, max: 9, dur: 35, grigiR: 60,
    ogg: () => Object.keys(MOTIVI_P), prova: () => '',
    fine: (st, E) => { E.arr.concat([E.L]).forEach(b => { feel(b, 'rabbia', -.1); if (b.ris) b.ris.ideo = clamp(b.ris.ideo + .02, 0, 1); if (b.hand === 'cartello') b.hand = null; }); if (st.ris) st.ris.morale = clamp((st.ris.morale || 0) + 1, 0, 100);
      return { tipo: 'protesta', d: `${E.nome}: ${E.arr.length + 1} col cartello`, n: E.arr.length + 1 }; } };
  // --- il corteo: si cammina insieme per due posti (la processione finta, la sfilata)
  V.corteo = { nome: o => (o === 'santo' ? 'la processione finta' : o === 'sposi' ? 'il matrimonio per finta' : o === 'funerale' ? 'il funerale della Fiat' : 'la sfilata'), posti: ['chiesa', 'piazza', 'fontana', 'piazzetta', 'calata'], ore: [10, 19], forma: 'folla', min: 2, max: 9, dur: 0, giro: true,
    ogg: () => ['santo', 'sposi', 'funerale', 'sfilata'], prova: (st, E) => (E.via2 ? '' : 'non c\'è la strada'),
    fine: (st, E) => { E.arr.forEach(b => feel(b, 'svago', -.25)); const prete = st.npcs.find(k => alive(k) && /prete|parroco|don /i.test(k.role || '') && hyp(k.x - E.L.x, k.y - E.L.y) < 40);
      return { tipo: 'corteo', d: `${E.nome}: ${E.arr.length + 1} in fila fino ${aL(E.via2.label)}`, n: E.arr.length + 1, prete }; } };
  // --- dipingere: un muro vero (popolo.js paintWall: il diario, la voce «ha dipinto un muro», il rischio di essere fermati)
  V.dipingi = { nome: o => (o === 'fontana' ? 'la fontana dipinta' : o === 'scritta' ? 'la scritta sul muro' : o === 'cartello' ? 'il cartello falso' : 'il murale'), posti: ['fontana', 'piazzetta', 'vico', 'caruggio', 'calata', 'giardini', 'muro'], ore: [0, 24], notte: true, forma: 'amico', min: 0, max: 2, dur: 40,
    ogg: () => ['murale', 'scritta', 'cartello', 'fontana'],
    prova: (st, E) => (Po() && Po()._ && Po()._.paintWall ? '' : 'non si dipinge'),
    fine: (st, E) => { const P = Po(), sk = Object.assign(P._.sketchFor ? P._.sketchFor(st, E.L) : { kind: 'arte', text: 'un pesce', style: 'naif' }, E.ogg === 'scritta' || E.ogg === 'cartello' ? { kind: 'satira', text: E.testo || pick(SCRITTE) } : {});
      try { P._.paintWall(st, E.L, { tgt: E.posto }, sk); } catch (e) { return { tipo: 'muro_no', d: `${E.nome}: niente`, n: 0 }; }
      return { tipo: 'muro', d: `${E.nome} ${aL(E.posto.label)}: ${sk.text}`, n: E.arr.length + 1, testo: sk.text }; } };
  // --- la colletta: soldi veri a chi ne ha bisogno
  V.colletta = { nome: (o, E) => `la colletta per ${E && E.benef ? nomeDi(E.benef) : 'qualcuno'}`, posti: P_PIAZZA.concat(P_BAR, ['chiesa']), ore: [9, 21], forma: 'folla', min: 1, max: 8, dur: 20,
    ogg: () => [''], prova: (st, E) => (E.benef && alive(E.benef) ? '' : 'nessuno per cui'),
    fine: (st, E) => { let tot = 0; E.arr.concat([E.L]).forEach(b => { const q = b.pop.money >= 4 ? 2 : b.pop.money >= 1 ? 1 : 0; b.pop.money -= q; tot += q; }); E.benef.pop.money += tot; moveRel(st, E.benef, E.L, .2);
      note(st, E.benef, `la gente ha fatto la colletta per lui: ${lire(tot)}`, 'good', { w: .5, who: E.L.id });
      return { tipo: 'colletta', d: `${E.nome}: ${lire(tot)}`, n: E.arr.length + 1, inc: tot, chi2: E.benef }; } };
  // --- le ricette vere: pescare, raccogliere, fare (Oggetti.RECIPES)
  V.pesca = { nome: (o, E) => (E && E.notte ? 'la pesca di notte con la lampada' : 'la pesca dal molo'), posti: P_PESCA.length ? P_PESCA : P_MARE, ore: [5, 23], notteOk: true, forma: 'amico', min: 0, max: 2, dur: 0, ricetta: 'x_pesca',
    ogg: () => [''], prova: (st, E) => provaRicette(st, E, [['x_pesca', 2]]),
    fine: (st, E) => finePiano(st, E, 'pesca') };
  V.raccogli = { nome: o => `la raccolta ${art(nm(o), 'di')}`, posti: P_BOSCO.concat(['spiaggia', 'discarica', 'vigne', 'oliveto']), ore: [7, 17], forma: 'amico', min: 0, max: 3, dur: 0,
    ogg: () => ['castagne', 'legna', 'sabbia', 'funghi'], prova: (st, E) => provaProcura(st, E, { [E.ogg]: 2 }, true),
    fine: (st, E) => finePiano(st, E, 'raccolto') };
  V.fabbrica = { nome: o => `il laboratorio ${art(nm(o), 'di')}`, posti: ['piazzetta', 'vico', 'caruggio', 'calata', 'giardini'], ore: [9, 20], forma: 'solo', min: 0, max: 2, dur: 0,
    ogg: (st, n) => fattibili(st, n), prova: (st, E) => provaProcura(st, E, { [E.ogg]: 1 }, false),
    fine: (st, E) => finePiano(st, E, 'fatto_a_mano') };
  // --- costruire: il catalogo vero del cantiere, fuori città
  V.costruisci = { nome: o => `${art((CN() && CN().BY[o] ? CN().BY[o].nome : nm(o)).toLowerCase(), 'det')} nel bosco`, posti: P_BOSCO.concat(['spiaggia', 'caletta']), ore: [7, 17], forma: 'amico', min: 0, max: 3, dur: 0,
    ogg: () => ['falo', 'capanna_tonda', 'tenda', 'amaca', 'striscione', 'latrina', 'stendino'].filter(k => CN() && CN().BY[k]),
    prova: (st, E) => provaCostruzione(st, E), fine: (st, E) => finePiano(st, E, 'costruito') };
  // --- la tavolata: ognuno porta da mangiare da casa
  V.tavolata = { nome: (o, E) => (E && E.ogg === 'castagne' ? 'le castagne per tutti' : 'la tavolata in strada'), posti: ['vico', 'caruggio', 'piazzetta', 'calata', 'spiaggia', 'giardini'], ore: [12, 21], forma: 'folla', min: 2, max: 8, dur: 45,
    ogg: () => ['', 'castagne'], prova: () => '',
    fine: (st, E) => { let pi = 0; E.arr.concat([E.L]).forEach(b => { const f = bagsOf(b).flatMap(B => Object.keys(B)).find(k => { const c = CATo()[k]; return c && c.eat && c.eat.fame > 0; }); if (f && prendi(b, f, 1)) pi++; });
      E.arr.concat([E.L]).forEach(b => { feel(b, 'fame', -.08 * pi / Math.max(1, E.arr.length + 1) - .05); feel(b, 'compagnia', -.3); E.arr.forEach(c => { if (c !== b) moveRel(st, b, c, .03); }); });
      return { tipo: pi ? 'tavolata' : 'tavolata_vuota', d: pi ? `${E.nome}: ${pi} piatti portati` : `${E.nome}: nessuno porta niente`, n: E.arr.length + 1, piatti: pi }; } };
  // --- la caccia al tesoro: un oggetto vero nascosto, chi arriva lo trova
  V.tesoro = { nome: o => `la caccia ${art(nm(o), 'di')}`.replace('la caccia del', 'la caccia al').replace('la caccia della', 'la caccia alla').replace("la caccia dell'", "la caccia all'").replace('la caccia dei', 'la caccia ai').replace('la caccia delle', 'la caccia alle').replace('la caccia dello', 'la caccia allo').replace('la caccia degli', 'la caccia agli'), posti: P_PIAZZA.concat(['spiaggia', 'pineta', 'giardini']), ore: [10, 18], forma: 'folla', min: 1, max: 6, dur: 30,
    ogg: (st, n) => roba(n), prova: (st, E) => (haN(E.L, E.ogg) >= 1 ? '' : 'non ha niente da nascondere'),
    fine: (st, E) => { if (!E.arr.length || !prendi(E.L, E.ogg, 1)) return { tipo: 'tesoro_vuoto', d: `${E.nome}: nessuno lo cerca`, n: 0 }; const w = pick(E.arr); metti(w, E.ogg, 1); note(st, w, `ha trovato ${art(nm(E.ogg))} alla caccia al tesoro di ${nomeDi(E.L)}`, 'good', { w: .35, who: E.L.id });
      return { tipo: 'vinto_oggetto', d: `${E.nome}: lo trova ${nomeDi(w)}`, vinc: w, n: E.arr.length, ogg: E.ogg }; } };
  // --- il baratto: ognuno dà una cosa sua a un altro
  V.baratto = { nome: () => 'il mercatino del baratto', posti: P_PIAZZA, ore: [9, 18], forma: 'folla', min: 2, max: 7, dur: 30, ogg: () => [''], prova: () => '',
    fine: (st, E) => { const A = E.arr.concat([E.L]); let k = 0; for (let i = 0; i + 1 < A.length; i += 2) { const a = A[i], b = A[i + 1], x = roba(a)[0], y = roba(b)[0]; if (x && y && prendi(a, x, 1) && prendi(b, y, 1)) { metti(a, y, 1); metti(b, x, 1); k++; note(st, a, `ha scambiato ${art(nm(x))} con ${art(nm(y))} di ${nomeDi(b)}`, 'info', { w: .25, who: b.id }); } }
      return { tipo: k ? 'baratto' : 'baratto_vuoto', d: `${E.nome}: ${k} scambi`, n: k }; } };
  // --- il tuffo d'inverno: si va in acqua davvero, qualcuno si prende il raffreddore
  V.tuffo = { nome: () => "il tuffo d'inverno", posti: ['molo', 'spiaggia', 'caletta', 'pontile'], ore: [9, 17], forma: 'sfida', min: 1, max: 6, dur: 15, ogg: () => [''], prova: () => '',
    fine: (st, E) => { const A = E.arr.concat([E.L]); A.forEach(b => feel(b, 'svago', -.3)); const r = pick(A); feel(r, 'sonno', .2); note(st, r, 'si è preso il raffreddore col tuffo d\'inverno', 'bad', { w: .3 });
      return { tipo: 'tuffo', d: `${E.nome}: ${A.length} in acqua, ${nomeDi(r)} col raffreddore`, n: A.length, chi2: r }; } };
  // --- offrire: un giro al bar per tutti (Azioni.social 'offri': soldi veri)
  V.offri = { nome: () => 'il giro offerto', posti: P_BAR, ore: [11, 24], forma: 'folla', min: 1, max: 5, dur: 20, ogg: () => [''], prova: (st, E) => (E.L.pop.money >= 4 ? '' : 'non ha i soldi'),
    fine: (st, E) => { const A = Az(); let k = 0; E.arr.forEach(b => { if (E.L.pop.money >= 2 && A && A.social) { A.social(st, E.L, b, 'offri'); k++; } }); return { tipo: k ? 'offerto' : 'offerto_vuoto', d: `${E.nome}: ${k} bicchieri`, n: k }; } };
  // --- regalare: una cosa vera a chi serve (la legna alla vedova, il pesce al vicino)
  V.regala = { nome: (o, E) => `${art(nm(o), 'det')} per ${E && E.benef ? nomeDi(E.benef) : 'qualcuno'}`, posti: ['casa'], ore: [9, 20], forma: 'solo', min: 0, max: 1, dur: 10, ogg: (st, n) => roba(n),
    prova: (st, E) => (E.benef && alive(E.benef) && haN(E.L, E.ogg) >= 1 ? '' : 'non c\'è niente da dare'),
    fine: (st, E) => { const q = Math.min(haN(E.L, E.ogg), E.ogg === 'legna' ? 4 : 1); if (!(q >= 1) || !prendi(E.L, E.ogg, q)) return { tipo: 'regalo_no', d: 'il regalo: non c\'era più', n: 0 }; metti(E.benef, E.ogg, q); moveRel(st, E.benef, E.L, .25);
      note(st, E.benef, `${nomeDi(E.L)} gli ha portato ${art(nm(E.ogg))}`, 'good', { w: .45, who: E.L.id, tag: 'favore' }); return { tipo: 'regalo', d: `${nomeDi(E.L)} porta ${art(nm(E.ogg))} a ${nomeDi(E.benef)}`, n: 1, chi2: E.benef, ogg: E.ogg }; } };
  const VERBI = Object.keys(V);

  // ======================================================================================================================
  // §3 LA ROBA: procurarsi le cose con le ricette vere (raccogliere, fare, comprare, farsi prestare)
  // ======================================================================================================================
  const RECS = () => (Og() ? Og().RECIPES : {});
  let OUT = null; const perUscita = g => { if (!OUT) { OUT = {}; const R = RECS(); for (const id in R) Object.keys(R[id].out).forEach(k => (OUT[k] = OUT[k] || []).push(id)); } return OUT[g] || []; };
  const altsOf = k => String(k).split('|');
  function shopFor(st, g, q) { const X = Ec(); if (!X || !X.eco) return null; const E0 = X.eco(st); let best = null; for (const k in E0.shops) { const S0 = E0.shops[k]; if (!S0.sells || !S0.sells[g] || S0.black || (S0.stock[g] || 0) < (q || 1) || !S0.t) continue; if (S0.market && Po() && ![2, 5].includes(Po().weekday(st.t))) continue; best = best || S0; } return best; }
  const prezzo = (st, S0, g) => { const X = Ec(); try { return X.price(st, S0, g); } catch (e) { return (CATo()[g] || {}).prezzo || 2; } };
  // il posto della ricetta (le estrazioni): il più vicino a casa il cui nome o id combacia
  function postoRicetta(n, rec) { if (!rec.place) return null; let best = null, bd = 1e9; const h = n.pop.homeT || n; for (const k in PLACES) { const q = PLACES[k]; if (!rec.place.test(k) && !rec.place.test(q.name || '')) continue; if (/^casa_|isola|tribu/.test(k)) continue; const d = hyp(q.x - h.x, q.y - h.y); if (d < bd) { bd = d; best = k; } } return best && bd < 900 ? best : null; }
  // la postazione: niente, la cucina di casa, o una stufa in casa
  const stazioneOk = (n, rec) => !rec.st || altsOf(rec.st).some(s => s === 'cucina' || s === 'acqua' || (s === 'stufa' && haN(n, 'stufa') >= 1));
  // chi presta un attrezzo: un amico, o uno che abita vicino, che ce l'ha e non lo sta usando
  const CHI_HA = { t: -1, m: {} };
  const chiHa = (st, id) => { if (CHI_HA.t !== st.t) { CHI_HA.t = st.t; CHI_HA.m = {}; } return CHI_HA.m[id] || (CHI_HA.m[id] = st.npcs.filter(k => k.pop && haN(k, id) >= 1)); };
  function prestatore(st, n, id) { const h = n.pop.homeT || n; let best = null, bd = 400; for (const k of chiHa(st, id)) { if (k === n || !alive(k) || k.cop || !k.pop.homeT || haN(k, id) < 1 || k.jailedUntil > st.t || (k.pop.emer && k.pop.emer.kind === 'iniziativa')) continue; const d = hyp(k.pop.homeT.x - h.x, k.pop.homeT.y - h.y) * (amici(st, n, k) ? .3 : 1); if (d < bd) { bd = d; best = k; } } return best; }
  // la prova a secco: una lista di passi veri (o il perché no). bag: la roba virtuale; soldi virtuali
  function procura(st, n, want, opt) {
    opt = opt || {}; const bag = {}; bagsOf(n).forEach(B => Object.entries(B).forEach(([k, v]) => bag[k] = (bag[k] || 0) + v));
    const ctx = { money: n.pop.money || 0, passi: [], presi: new Set(), soloRaccolta: !!opt.soloRaccolta };
    const ok = Object.entries(want).every(([g, q]) => serve(st, n, g, q, bag, ctx, 0));
    return ok ? ctx.passi : null;
  }
  function attrezzi(st, n, tools, bag, ctx, d) {
    for (const t of tools || []) { const al = altsOf(t); if (al.some(id => (bag[id] || 0) >= 1)) continue;
      const id = al[0], S0 = shopFor(st, id, 1), pr = S0 ? prezzo(st, S0, id) : 1e9;
      const k = al.map(x => prestatore(st, n, x)).find(Boolean);
      if (k && !ctx.presi.has(k.id)) { ctx.presi.add(k.id); const x = al.find(z => haN(k, z) >= 1); ctx.passi.push({ k: 'presta', g: x, q: 1, da: k.id }); bag[x] = (bag[x] || 0) + 1; continue; }
      if (S0 && ctx.money >= pr) { ctx.money -= pr; ctx.passi.push({ k: 'compra', g: id, q: 1, shop: S0.k, pr }); bag[id] = (bag[id] || 0) + 1; continue; }
      return false; }
    return true;
  }
  function serve(st, n, g, q, bag, ctx, d) {
    let need = q - (bag[g] || 0); if (need <= 0) return true; if (d > 2) return false;
    const R = RECS();
    // 1) raccogliere (le estrazioni: il bosco, il molo, la spiaggia)
    for (const id of perUscita(g)) { const r = R[id]; if (r.kind !== 'raccogli' || !r.out[g] || Object.keys(r.in).length) continue; const pk = postoRicetta(n, r); if (!pk) continue;
      const snap = JSON.stringify(bag), m0 = ctx.money, l0 = ctx.passi.length; if (!attrezzi(st, n, r.tools, bag, ctx, d)) { restore(bag, snap); ctx.money = m0; ctx.passi.length = l0; continue; }
      const times = Math.ceil(need / r.out[g]); Object.entries(r.out).forEach(([k, v]) => bag[k] = (bag[k] || 0) + v * times); ctx.passi.push({ k: 'raccogli', rec: id, times, posto: pk }); return serve(st, n, g, q, bag, ctx, d); }
    if (ctx.soloRaccolta && d === 0) return false;
    // 2) fare con una ricetta (da quello che si ha o ci si procura)
    for (const id of perUscita(g)) { const r = R[id]; if (r.kind === 'raccogli' || r.kind === 'smonta' || r.place || !r.out[g] || r.npcOut || !stazioneOk(n, r)) continue;
      const snap = JSON.stringify(bag), m0 = ctx.money, l0 = ctx.passi.length, times = Math.ceil(need / r.out[g]);
      const okIn = Object.entries(r.in).every(([k, v]) => { const al = altsOf(k), have = al.find(x => (bag[x] || 0) >= v * times); return have ? true : serve(st, n, al[0], v * times, bag, ctx, d + 1); });
      if (!okIn || !attrezzi(st, n, r.tools, bag, ctx, d)) { restore(bag, snap); ctx.money = m0; ctx.passi.length = l0; continue; }
      Object.entries(r.in).forEach(([k, v]) => { const x = altsOf(k).find(z => (bag[z] || 0) >= v * times) || altsOf(k)[0]; bag[x] -= v * times; }); Object.entries(r.out).forEach(([k, v]) => bag[k] = (bag[k] || 0) + v * times);
      ctx.passi.push({ k: 'fai', rec: id, times }); return serve(st, n, g, q, bag, ctx, d); }
    // 3) comprare
    const S0 = shopFor(st, g, need); if (S0) { const pr = prezzo(st, S0, g) * need; if (ctx.money >= pr) { ctx.money -= pr; bag[g] = (bag[g] || 0) + need; ctx.passi.push({ k: 'compra', g, q: need, shop: S0.k, pr }); return true; } }
    return false;
  }
  const restore = (bag, snap) => { const o = JSON.parse(snap); Object.keys(bag).forEach(k => delete bag[k]); Object.assign(bag, o); };
  // le cose che uno sa fare con la roba che ha (per il verbo «fabbrica»)
  function fattibili(st, n) { const R = RECS(), out = []; for (const id in R) { const r = R[id]; if (r.kind === 'raccogli' || r.kind === 'smonta' || r.place || r.npcOut || !stazioneOk(n, r)) continue; const g = Object.keys(r.out)[0]; if (!g || isArma(g)) continue; if (Object.entries(r.in).every(([k, v]) => altsOf(k).some(x => haN(n, x) >= v))) out.push(g); } return out.length ? out : ['lampada_petrolio', 'legna', 'stecca']; }
  // i passi veri della roba: per Azioni (andare, fare, pagare)
  function passiRoba(st, n, E, list) {
    const out = [], R = RECS(), X = Ec();
    for (const s of list) {
      if (s.k === 'presta') { const k = G.byId(st, s.da); out.push(vai(`va da ${nomeDi(k)} a farsi prestare ${art(nm(s.g), 'det')}`, () => (k && k.pop.homeT) || null), fai('chiede in prestito', 5, (st2, n2) => {
          if (!k || haN(k, s.g) < 1) { const k2 = prestatore(st2, n2, s.g); if (k2) { s.da = k2.id; return chiediA(k2); } if (rimedia(st2, n2, E, [s.g])) return 'next'; }   // quello di prima non ce l'ha più: si chiede a un altro
          return chiediA(k);
          function chiediA(k) { if (!k || haN(k, s.g) < 1 || !prendi(k, s.g, 1)) { E.manca = `${nm(s.g)} da ${nomeDi(k)}`; return 'stop'; } E.prestiti.push({ g: s.g, da: k.id }); E.inMano[s.g] = (E.inMano[s.g] || 0) + 1;   // l'attrezzo prestato lo tiene in mano chi l'ha chiesto (non finisce nella sua roba)
          const f = fatto(st2, 'prestito', n2, { d: `${nomeDi(k)} presta ${art(nm(s.g), 'det')} a ${nomeDi(n2)}`, a: k.id, g: s.g, x: n2.x, y: n2.y }, E.fid); S(st2).stats.prestiti++;
          dire(st2, [[n2, fill(pick(L_BIS.presta), { ogg: art(nm(s.g), 'det') })], [k, pick(L_BIS.prestaSi)]], f, { intento: 'presta', esito: 'si', si: true, vita: true }); return 'next'; } })); }
      else if (s.k === 'compra') { const S0 = X && X.eco(st).shops[s.shop]; out.push(vai(`va a comprare ${art(nm(s.g))}`, () => (S0 && S0.t) || null), fai('compra', 5, (st2, n2) => {
          if (!S0 || X.buy(st2, n2, S0.t, s.g, s.q) == null) { E.manca = nm(s.g); return 'stop'; } metti(n2, s.g, s.q); S(st2).stats.comprati++;
          fatto(st2, 'comprato', n2, { d: `${nomeDi(n2)} compra ${s.q > 1 ? s.q + ' ' + nm(s.g) : art(nm(s.g))} ${aL(S0.label)}`, g: s.g, q: s.q }, E.fid); return 'next'; })); }
      else if (s.k === 'raccogli') { const r = R[s.rec], q = PLACES[s.posto], sp = spotNear(st, q, 6); out.push(vai(`va ${aL(q.name)}: ${r.nome}`, () => sp), fai(r.nome, r.min * s.times, (st2, n2) => {
          if (!rimedia(st2, n2, E, r.tools)) { E.manca = r.tools.map(nm).join(', '); return 'stop'; }
          const got = []; Object.entries(r.out).forEach(([k, v]) => { const qq = Math.floor(v * s.times + 1e-6); if (qq >= 1) { metti(n2, k, qq); got.push(`${qq} ${nm(k)}`); } }); S(st2).stats.raccolti++;
          E.ultimo = fatto(st2, 'raccolto', n2, { d: `${nomeDi(n2)} ${r.nome.replace(/^([a-z]+)re\b/, '$1')} ${aL(q.name)}: ${got.join(', ')}`, rec: r.id, x: n2.x, y: n2.y }, E.fid); return 'next'; }, { tick: (st2, n2) => { n2.speedNow = 0; } })); }
      else if (s.k === 'fai') { const r = R[s.rec]; out.push(vai('torna a casa a lavorarci', () => n.pop.homeT), fai(r.nome, r.min * s.times, (st2, n2) => {
          const use = []; for (const [k, v] of Object.entries(r.in)) { const x = altsOf(k).find(z => haN(n2, z) >= v * s.times); if (!x) { E.manca = altsOf(k).map(nm).join(' o '); return 'stop'; } use.push([x, v * s.times]); }
          if (!rimedia(st2, n2, E, r.tools)) { E.manca = r.tools.map(nm).join(', '); return 'stop'; }
          use.forEach(([x, v]) => prendi(n2, x, v)); const got = []; Object.entries(r.out).forEach(([k, v]) => { metti(n2, k, v * s.times); got.push(`${v * s.times} ${nm(k)}`); });
          const M = Og() && Og().S ? Og().S(st2) : null; if (M) { M.made[r.id] = (M.made[r.id] || 0) + s.times; }
          S(st2).stats.fatti_a_mano++; E.ultimo = fatto(st2, 'fatto_a_mano', n2, { d: `${nomeDi(n2)} fa ${r.nome}`, rec: r.id, got }, E.fid); return 'next'; }, { inside: true, outside: false })); }
    }
    return out;
  }
  // l'attrezzo non c'è più (l'ha venduto, l'ha prestato a un altro): si rimedia lì per lì, da un vicino, o si compra
  function rimedia(st, n, E, tools) {
    for (const t of tools || []) { const al = altsOf(t); if (al.some(x => haN(n, x) >= 1 || E.inMano[x])) continue;
      const k = al.map(x => prestatore(st, n, x)).find(Boolean); if (k) { const x = al.find(z => haN(k, z) >= 1); if (x && prendi(k, x, 1)) { E.prestiti.push({ g: x, da: k.id }); E.inMano[x] = (E.inMano[x] || 0) + 1; S(st).stats.prestiti++; fatto(st, 'prestito', n, { d: `${nomeDi(k)} presta ${art(nm(x), 'det')} a ${nomeDi(n)}`, a: k.id, g: x }, E.fid); continue; } }
      const X = Ec(), S0 = shopFor(st, al[0], 1); if (X && S0 && X.buy(st, n, S0.t, al[0], 1) != null) { metti(n, al[0], 1); S(st).stats.comprati++; fatto(st, 'comprato', n, { d: `${nomeDi(n)} compra ${art(nm(al[0]))} ${aL(S0.label)}` }, E.fid); continue; }
      return false; }
    return true;
  }
  function spotNear(st, q, r) { for (let k = 0; k < 8; k++) { const a = rnd() * 6.283, d = 1 + rnd() * r, x = q.x + Math.cos(a) * d, y = q.y + Math.sin(a) * d; if (G.walkM(x, y)) return { x, y }; } return { x: q.x, y: q.y }; }
  function provaRicette(st, E, list) { const w = {}; list.forEach(([rid]) => { const r = RECS()[rid]; if (r) Object.keys(r.out).forEach(g => w[g] = 1); }); return provaProcura(st, E, w, true); }
  function provaProcura(st, E, want, solo) {
    const passi = procura(st, E.L, want, { soloRaccolta: solo }); if (!passi) return `non sa come procurarsi ${Object.keys(want).map(nm).join(', ')}`;
    if (!passi.length && solo) { const r = Object.values(RECS()).find(r => r.kind === 'raccogli' && Object.keys(want).some(g => r.out[g]) && postoRicetta(E.L, r)); if (r) passi.push({ k: 'raccogli', rec: r.id, times: 1, posto: postoRicetta(E.L, r) }); }
    E.roba = passi; return passi.length ? '' : 'ce l\'ha già';
  }
  // la costruzione: il posto nel bosco (fuori città, caselle libere), la roba del catalogo
  function sitoCostruzione(st, n, b, key) {
    const C = CN(), q = PLACES[key]; if (!C || !q) return null; const M = G.MAP, T = G.T;
    for (let k = 0; k < 60; k++) {
      const r = 3 + k * .6, a = rnd() * 6.283, x = Math.round((q.x + Math.cos(a) * r * TS) / TS) * TS + TS / 2, y = Math.round((q.y + Math.sin(a) * r * TS) / TS) * TS + TS / 2;
      if (C.inCity(x, y)) continue; let ok = true;
      for (const [tx, ty] of C.footprint(b, x, y, 0).concat(b.fp ? [] : [[Math.floor(x / TS), Math.floor(y / TS)]])) {
        const v = G.tileAt(tx, ty); if (!G.walkT(tx, ty) || v === T.WATER || v === T.BLD || v === T.TREE || v === T.ROCK || v === T.CLIFF || (T.VIA !== undefined && v === T.VIA)) { ok = false; break; }
        if (st.covo && st.covo.obj.some(o => o.tiles && o.tiles.some(z => z[0] === tx && z[1] === ty))) { ok = false; break; }
      }
      if (ok && G.walkM(x, y + TS * 1.5)) return { x, y };
    }
    return null;
  }
  function provaCostruzione(st, E) {
    const C = CN(); if (!C) return 'senza cantiere'; const b = C.BY[E.ogg]; if (!b) return 'non è nel catalogo';
    const key = E.posto && E.posto.place; const sito = sitoCostruzione(st, E.L, b, key || pick(P_BOSCO)); if (!sito) return 'nessun posto libero nel bosco';
    const passi = procura(st, E.L, b.cost || {}, {}); if (!passi) return `non sa come procurarsi ${Object.keys(b.cost || {}).map(nm).join(', ')}`;
    E.roba = passi; E.sito = sito; E.b = b; return '';
  }
  // il cantiere dell'abitante: la cosa vera del catalogo, nel mondo, segnata come sua (o.npc), non del giocatore
  function apriCantiere(st, n, E) {
    const C = CN(); if (!C || !E.b) return null; const b = E.b, cs = st.covo || (C.S ? C.S(st) : null); if (!cs) return null;
    for (const [k, v] of Object.entries(b.cost || {})) { const x = altsOf(k).find(z => haN(n, z) >= v); if (!x) { E.manca = altsOf(k).map(nm).join(' o '); return null; } }
    Object.entries(b.cost || {}).forEach(([k, v]) => prendi(n, altsOf(k).find(z => haN(n, z) >= v), v));
    const tiles = []; C.footprint(b, E.sito.x, E.sito.y, 0).forEach(([tx, ty, solid]) => { const orig = G.tileAt(tx, ty); if (solid) G.setTile(tx, ty, G.T.BLD); tiles.push([tx, ty, solid ? orig : null]); });
    const o = { uid: 'n' + (cs.next = (cs.next || 1) + 1), id: b.id, x: E.sito.x, y: E.sito.y, rot: 0, lv: null, tiles, paid: {}, at: st.t, seed: Math.floor(rnd() * 1e6) + 1, npc: n.id, wip: b.big || 20 };
    cs.obj.push(o); if (C.state) C.state.dirty = true; return o;
  }

  // ======================================================================================================================
  // I PASSI (Azioni.startPlan)
  // ======================================================================================================================
  const vai = (label, at, o) => Object.assign({ label, at: typeof at === 'function' ? at : () => at, dur: 0, outside: true }, o || {});
  const fai = (label, mins, act, o) => Object.assign({ label, dur: mins, outside: true, act, tick: (st, n) => { n.speedNow = 0; } }, o || {});
  const aspetta = (label, done, o) => Object.assign({ label, dur: 0, outside: true, tick: (st, n) => { n.speedNow = 0; }, act: (st, n, E) => (done(st, n, E) ? 'next' : 'wait') }, o || {});
  function piano(st, n, label, steps, extra) { const A = Az(); if (!A || !A.startPlan) return null; return A.startPlan(st, n, 'iniziativa', label, steps, 1, extra); }
  const slot = (E, i) => { const a = (E.fila ? 0 : i * 2.3) + E.ang, r = E.fila ? 1.1 * (i + 1) : 1.6 + (i % 3) * .5; const x = E.posto.x + Math.cos(a) * r, y = E.posto.y + Math.sin(a) * r; return G.walkM(x, y) ? { x, y } : { x: E.posto.x, y: E.posto.y }; };
  const fuoriTempo = (st, E) => st.t - E.t0 > 240;

  // ======================================================================================================================
  // §1 LE INIZIATIVE: la composizione, la prova a secco, l'invito, l'andata, il fatto, la catena
  // ======================================================================================================================
  // i 25 estri scritti: gli atomi fissati, le battute loro (gli altri usano le battute del verbo)
    function memeKey(c) { return [c.verbo, c.ogg || '', c.niente ? 'n' : '', c.notte ? 'z' : ''].join(':'); }
  function nomeDiComp(c) { const D = V[c.verbo]; let s = c.nome || (D ? D.nome(c.ogg, c) : c.verbo); return s; }
  // la composizione: un leader, un verbo, un oggetto, un posto, un motivo, una forma
  function componi(st, L, opt) {
    opt = opt || {}; const I = S(st);
    let verbo = opt.verbo, D = verbo && V[verbo];
    if (!D) { const pesi = VERBI.map(v => [v, pesoVerbo(st, L, v, opt.motivo)]).filter(x => x[1] > 0); let t = pesi.reduce((s, x) => s + x[1], 0) * rnd(); for (const [v, w] of pesi) { t -= w; if (t <= 0) { verbo = v; break; } } D = V[verbo]; }
    if (!D) return null;
    const ogs = D.ogg(st, L); const ogg = opt.ogg !== undefined ? opt.ogg : ogs.length ? pick(ogs) : '';
    if (/costruisci|raccogli|pesca|fabbrica|regala/.test(verbo)) opt.strano = false;
    let posti = (opt.posti || D.posti).filter(okPosto); if (opt.strano) posti = [pick(P_ALL)];   // [composte] il posto sbagliato: la comicità dell'accostamento
    let pk = opt.posto || (D.posti[0] === 'casa' ? null : pick(posti.length ? posti : ['piazza']));
    if (!opt.posto && opt.vicino && D.posti[0] !== 'casa' && !opt.strano) { const qk = placeKeyAt(st.player.x, st.player.y); if (posti.includes(qk) || (PLACES[qk] && hyp(PLACES[qk].x - st.player.x, PLACES[qk].y - st.player.y) < 40 && rnd() < .5 && D.forma !== 'solo')) posti = [qk]; const ps = posti.slice().sort((a, b) => hyp(PLACES[a].x - st.player.x, PLACES[a].y - st.player.y) - hyp(PLACES[b].x - st.player.x, PLACES[b].y - st.player.y)).slice(0, 2); if (ps.length && hyp(PLACES[ps[0]].x - st.player.x, PLACES[ps[0]].y - st.player.y) < 160) pk = pick(ps); }
    const c = { verbo, ogg, posto: pk, vicino: !!opt.vicino, motivo: opt.motivo || motivoDi(st, L, verbo), forma: D.forma, notte: !!opt.notte, niente: !!opt.niente, scritta: opt.scritta || null, causa: opt.causa || null, padre: opt.padre || null, benef: opt.benef || null, bersaglio: opt.bersaglio || null, rivale: opt.rivale || null, ia: !!opt.ia, nome: opt.nome || null, sotto: !!opt.sotto };
    c.strano = !!opt.strano || (pk && D.posti.indexOf(pk) < 0 && D.posti[0] !== 'casa');
    return c;
  }
  function pesoVerbo(st, n, v, motivo) {
    const t = n.tr || {}, P = n.pop, N = P.need || {}, g = giovane(n), h = hourOf(st), D = V[v]; if (!D || v === 'regala') return 0;
    if (!(h >= D.ore[0] && h < D.ore[1]) && !(D.notte || D.notteOk)) return 0;
    let w = 1;
    if (v === 'gara' || v === 'tuffo') w *= g ? 2.2 : .3; if (v === 'esibisci') w *= .5 + (t.loq || .5) * 1.5; if (v === 'vendi' || v === 'lotteria') w *= .5 + (t.avid || .5) * 1.5;
    if (v === 'protesta') w *= .3 + (N.rabbia || 0) * 3 + (n.ris ? n.ris.ideo : .3); if (v === 'colletta' || v === 'regala') w *= .5 + (1 - (t.avid || .5)) * 1.2;
    if (v === 'gioca' || v === 'offri') w *= .6 + (N.svago || 0) * 1.5; if (v === 'tavolata') w *= .6 + (N.compagnia || 0) * 1.5;
    if (v === 'dipingi') w *= (P.ints || []).some(i => /arte/.test(i.k || i)) ? 2 : .4; if (v === 'pesca' || v === 'raccogli') w *= .5 + (N.fame || 0) + (N.soldi || 0);
    if (v === 'costruisci') w *= .25; if (v === 'fabbrica') w *= .5;
    if (motivo === 'rancore' && !/protesta|dipingi|gara|esibisci/.test(v)) w *= .2;
    return w;
  }
  function motivoDi(st, n, v) { const N = n.pop.need || {}; if ((N.rabbia || 0) > .5) return 'rancore'; if ((N.fame || 0) > .7 || (N.soldi || 0) > .6) return 'bisogno'; if ((N.svago || 0) > .55) return 'noia'; return pick(['scherzo', 'umore', 'vanità', 'rivalità']); }
  // la prova a secco: tutto quello che serve c'è (l'oggetto, il posto, la roba, il bersaglio) e il piano si può fare
  function prova(st, L, c) {
    const D = V[c.verbo]; if (!D) return 'verbo sconosciuto'; if (!libero(st, L)) return 'non è libero';
    const E = { L, inMano: {}, ogg: c.ogg, verbo: c.verbo, niente: c.niente, notte: c.notte, benef: c.benef ? G.byId(st, c.benef) : null, bersaglio: c.bersaglio ? G.byId(st, c.bersaglio) : null, prestiti: [], arr: [], cast: [] };
    if (D.posti[0] === 'casa') { if (!E.benef || !E.benef.pop.homeT) return 'nessuno a cui portarlo'; E.posto = Object.assign({}, E.benef.pop.homeT, { label: 'casa di ' + nomeDi(E.benef) }); }
    else { const t = tgtOf(c.posto); if (!t) return 'posto sconosciuto'; E.posto = Object.assign({}, t, spotNear(st, t, 3)); }
    if (c.verbo === 'esibisci' && c.ogg === 'serenata') { const b = E.bersaglio || (L.pop.friends || []).map(id => G.byId(st, id)).find(k => alive(k) && k.pop.sex !== L.pop.sex && k.pop.homeT && Math.abs(k.pop.age - L.pop.age) < 15); if (!b) return 'nessuno a cui cantarla'; E.bersaglio = b; E.posto = Object.assign({}, b.pop.homeT, { label: 'sotto casa di ' + nomeDi(b) }); }
    if (c.verbo === 'colletta' && !E.benef) { E.benef = st.npcs.find(k => alive(k) && k !== L && ((k.pop.debt && k.pop.debt.amount > 30) || (k.pop.money < 2 && k.pop.age > 60))); }
    if (c.verbo === 'gara') { const t2 = tgtOf(pick(D.posti.filter(k => k !== c.posto && okPosto(k)))); if (t2 && hyp(t2.x - E.posto.x, t2.y - E.posto.y) < 260) E.arrivo = t2; else { const a = rnd() * 6.283; const q = { x: E.posto.x + Math.cos(a) * 60, y: E.posto.y + Math.sin(a) * 60 }; if (G.walkM(q.x, q.y)) E.arrivo = Object.assign(q, { label: 'il traguardo' }); } }
    if (c.verbo === 'corteo') { const t2 = tgtOf(pick(D.posti.filter(k => k !== c.posto && okPosto(k)))); if (t2 && hyp(t2.x - E.posto.x, t2.y - E.posto.y) < 300) E.via2 = t2; }
    if (c.verbo === 'pesca') { E.notte = E.notte || hourOf(st) >= 19 || hourOf(st) < 6; }
    if (c.verbo === 'costruisci') E.posto.place = c.posto;
    const why = D.prova(st, E); if (why) return why;
    if (c.verbo === 'pesca' && E.notte && haN(L, 'lampada_petrolio') < 1) { const ps = procura(st, L, { lampada_petrolio: 1 }, {}); if (ps) E.roba = ps.concat(E.roba || []); else E.notte = false; }
    // dove si fa la cosa vera: il posto della ricetta (il bosco, il molo); la roba fatta a mano si fa a casa
    if (c.verbo === 'fabbrica') E.posto = Object.assign({}, L.pop.homeT, { label: 'casa di ' + nomeDi(L) });
    if (c.verbo === 'pesca' || c.verbo === 'raccogli') { const rs = (E.roba || []).find(x => x.k === 'raccogli'); const q = rs && PLACES[rs.posto]; if (q) E.posto = Object.assign({ label: q.name, place: rs.posto }, spotNear(st, q, 4)); }
    return E;
  }
  // la proposta: componi, prova, e se va parte; se no si scarta (mai a metà)
  function proponi(st, L, c, origine) {
    const I = S(st); I.stats.proposte++;
    const E = prova(st, L, c); if (typeof E === 'string') { I.stats.scartate++; return null; }
    I.stats.valide++; const A = avvia(st, E, c, origine); if (A && origine === 'bisogno') A.bisogno = true; return A;
  }
  function avvia(st, E, c, origine) {
    const I = S(st), D = V[c.verbo], L = E.L, key = memeKey(c);
    let M = I.memi[key];
    if (!M) { const par = c.padre ? I.memi[c.padre] : null; M = I.memi[key] = { k: key, nome: nomeDiComp(Object.assign({}, c, E)), verbo: c.verbo, ogg: c.ogg, origine: origine || 'composta', padre: c.padre || null, gen: par ? par.gen + 1 : 0, count: 0, ok: 0, fail: 0, best: 0, t0: st.t, ultimo: st.t, forza: 1, bandito: false, sotto: false, ricorrente: null, strano: !!c.strano, scritta: !!c.scritta, fusa: c.fusa || null };
      if (origine === 'scritta') I.stats.scritte++; else if (origine === 'ia') I.stats.ia++; else if (origine === 'copia') I.stats.copie++; else I.stats.composte++; potaMemi(st); }
    E.id = 'e' + I.ne++; E.meme = key; E.nome = M.ricorrente ? `${M.nome} del ${M.ricorrente.wd}`.replace('del domenica', 'della domenica') : M.nome; if (M.sotto) E.nome += ' (di nascosto)';
    E.c = c; E.D = D; E.t0 = st.t; E.inMano = E.inMano || {}; E.ang = rnd() * 6.283; E.fila = !!D.fila; E.cast = []; E.inv = []; E.arr = E.arr || []; E.prestiti = E.prestiti || []; E.ordine = []; E.chiusa = false; E.near = vicino(st, E.posto.x, E.posto.y);
    E.scritto = c.scritta ? ESTRI_BY[c.scritta] : null; E.strano = !!c.strano;
    M.count++; M.ultimo = st.t;
    E.fid = fatto(st, 'iniziativa', L, { d: E.nome, meme: key, verbo: c.verbo, x: E.posto.x, y: E.posto.y, motivo: c.motivo }, c.causa); M.ultimoF = E.fid;
    note(st, L, `si è mess${o_(L)} in testa ${E.nome}`, 'info', { w: .3, tag: 'iniziativa', place: E.posto.label });
    // gli inviti (chi si porta: la forma decide quanti)
    const want = Math.min(D.max, D.min + Math.floor(rnd() * (D.max - D.min + 1)) + (M.ricorrente ? 2 : 0));
    const pool = candidati(st, L, E, 26);
    for (const b of pool) { if (E.cast.length >= want) break; invita(st, E, b); }
    // il piano del leader
    // la roba: prima quello che si prepara (prestiti, spesa, la lampada), poi la cosa vera (raccogliere, pescare, fare) dopo il via
    const core = /^(pesca|raccogli|fabbrica)$/.test(c.verbo), R0 = E.roba || [];
    const prep = core ? R0.filter(x => !(x.k === 'raccogli' || (c.verbo === 'fabbrica' && x.k === 'fai'))) : R0, main = core ? R0.filter(x => !prep.includes(x)) : [];
    const steps = passiRoba(st, L, E, prep).concat(passiLeader(st, E, passiRoba(st, L, E, main)));
    const P = piano(st, L, E.nome, steps, { __ini: E.id, onEnd: fineCapo(E) });
    if (!P) { M.count--; I.stats.valide--; I.stats.scartate++; E.cast.forEach(b => { const A = Az(); if (b.pop.emer && b.pop.emer.__ini === E.id && A) A.endPlan(st, b, 'annullato'); }); fatto(st, 'annullata', L, { d: `${E.nome}: annullata` }, E.fid); return null; }
    I.attive.push(E); I.stats.partite++; return E;
  }
  // se chi l'ha pensata si ferma (i Grigi, una rissa, la cella), uno di quelli che sono lì la porta avanti (quando non serve la roba sua)
  const SUBENTRA = /^(colletta|tavolata|protesta|corteo|esibisci|fila|baratto|tuffo)$/;
  function fineCapo(E) {
    return (st2, n2, why) => {
      if (E.chiusa) return;
      if (why === 'fatto' || !SUBENTRA.test(E.c.verbo) || E.subentri >= 1) return chiudi(st2, E, why === 'fatto' ? 'fatta' : 'interrotta');
      const k = E.arr.find(x => alive(x) && !(x.jailedUntil > st2.t) && hyp(x.x - E.posto.x, x.y - E.posto.y) < 30);
      if (!k) return chiudi(st2, E, 'interrotta');
      const A = Az(); if (A && k.pop.emer) A.endPlan(st2, k, 'subentra');
      E.subentri = (E.subentri || 0) + 1; const vecchio = E.L; E.L = k; E.arr = E.arr.filter(x => x !== k); E.cast = E.cast.filter(x => x !== k);
      const f = fatto(st2, 'subentra', k, { d: `${nomeDi(vecchio)} non c'è più: ${E.nome} la porta avanti ${nomeDi(k)}`, a: vecchio.id }, E.fid);
      const st0 = passiLeader(st2, E).slice(1); if (!piano(st2, k, E.nome, st0, { __ini: E.id, onEnd: fineCapo(E) })) chiudi(st2, E, 'interrotta');
    };
  }
  // chi invitare: amici, poi chi è lì vicino, poi i ragazzi per le gare
  function candidati(st, L, E, r) {
    const out = [], fr = new Set(L.pop.friends || []), ok = k => k !== L && libero(st, k) && !(E.benef === k) && !(E.bersaglio === k);
    (L.pop.friends || []).forEach(id => { const k = G.byId(st, id); if (k && ok(k) && hyp(k.x - L.x, k.y - L.y) < 400) out.push(k); });
    st.npcs.forEach(k => { if (!fr.has(k.id) && ok(k) && hyp(k.x - E.posto.x, k.y - E.posto.y) < (E.near ? 60 : 120) && (!E.D.corsa || giovane(k) === giovane(L))) out.push(k); });
    out.sort(() => rnd() - .5); if (E.near) out.sort((a, b) => (hyp(a.x - L.x, a.y - L.y) < 25 ? 0 : 1) - (hyp(b.x - L.x, b.y - L.y) < 25 ? 0 : 1));   // vicino al giocatore: prima chi è lì (glielo chiede in faccia)
    return out.slice(0, r);
  }
  function invita(st, E, b) {
    const I = S(st), L = E.L, P = b.pop, N = P.need || {}, t = b.tr || {};
    I.stats.invitati++;
    let p = .25 + (amici(st, L, b) ? .3 : 0) + relA(b, L) * .3 + (N.svago || 0) * .3 + (N.compagnia || 0) * .2 + (t.loq || .5) * .1 - (N.paura || 0) * .3;
    if (E.c.verbo === 'protesta') p += (N.rabbia || 0) * .4 - (t.legge || .5) * .3; if (E.c.verbo === 'colletta') p += (1 - (t.avid || .5)) * .3;
    if (M_(st, E).bandito) p -= .15; if (M_(st, E).ricorrente) p += .15;
    const lavora = P.cur && P.cur.act === 'lavoro';
    if (lavora) p -= .3;
    const si = rnd() < clamp(p, .03, .9);
    const fid = fatto(st, si ? 'invito_si' : 'invito_no', b, { d: `${nomeDi(b)} ${si ? 'dice sì a' : 'dice no a'} ${E.nome}`, a: L.id }, E.fid);
    // le parole: chi chiede e chi risponde (vicino al giocatore)
    const B = E.scritto, o0 = sl(st, E, b), Lq = fill(B && B.chiede ? pick(B.chiede) : scegli(LV[E.c.verbo].chiede, L), o0), Ra = fill(si ? (B && B.si ? pick(B.si) : scegli(L_SI, b)) : (B && B.no ? pick(B.no) : lavora ? pick(L_NO_LAVORO) : scegli(L_NO, b)), o0);
    if (Lq && !E.__invDetto && dire(st, [[L, Lq], [b, Ra]], fid, { intento: 'estro', esito: si ? 'si' : 'no', si })) E.__invDetto = true;   // un invito solo si sente, gli altri si fanno a voce bassa
    if (!si) { I.stats.no++; return false; }
    I.stats.si++;
    // il banco lasciato: chi lavora e viene lo stesso (un fatto vero: la bottega resta senza nessuno)
    if (lavora && P.job && /bottega|bar|osteria|alimentari|commess|barista|oste|fornai|macell|pescivend|ortolan/i.test((P.job.title || '') + ' ' + (P.job.base || ''))) { const lab = (P.job.t && P.job.t.label) || 'la bottega'; fatto(st, 'banco_lasciato', b, { d: `${nomeDi(b)} lascia ${lab} senza nessuno`, posto: P.job.t || null, x: b.x, y: b.y }, fid); note(st, b, `ha lasciato ${lab} per ${E.nome}`, 'shady', { w: .35 }); }
    // l'appuntamento che salta: chi aveva da vedere qualcuno a quell'ora non ci va
    const ap = P.appt; if (ap && ap.t > st.t && ap.t < st.t + 150) { const k = G.byId(st, ap.with); if (k && k !== b && k !== L) { fatto(st, 'buca', b, { d: `${nomeDi(b)} non va all'appuntamento con ${nomeDi(k)}`, a: k.id }, fid); note(st, k, `${nomeDi(b)} gli ha dato buca: era ${aL(E.posto.label)} per ${E.nome}`, 'bad', { w: .45, who: b.id, tag: 'bidone' }); moveRel(st, k, b, -.08); } }
    const i = E.cast.length; E.cast.push(b);
    const steps = passiOspite(st, E, b, i);
    const pp = piano(st, b, E.nome, steps, { __ini: E.id }); if (!pp) { E.cast.pop(); return false; }
    return true;
  }
  const M_ = (st, E) => S(st).memi[E.meme] || {};
  function arrivato(st, E, b) { if (!E.arr.includes(b)) { E.arr.push(b); S(st).stats.arrivati++; } }
  // i passi di chi è invitato
  function passiOspite(st, E, b, i) {
    const D = E.D;
    if (D.corsa) return [vai('va alla partenza', () => slot(E, i)), aspetta('aspetta il via', (st2, n2) => { arrivato(st2, E, n2); return E.via || E.chiusa || fuoriTempo(st2, E); }), vai('corre!', () => E.arrivo, { run: true }), fai('arriva', 0, (st2, n2) => { if (!E.ordine.includes(n2.id)) E.ordine.push(n2.id); return 'next'; }), aspetta('aspetta gli altri', () => E.chiusa || fuoriTempo(st, E))];
    if (D.giro) return [vai('va al ritrovo', () => slot(E, i)), aspetta('aspetta che si parta', (st2, n2) => { arrivato(st2, E, n2); return E.via || E.chiusa || fuoriTempo(st2, E); }), vai('va in fila col corteo', () => ({ x: E.via2.x + Math.cos(i) * 2, y: E.via2.y + Math.sin(i) * 2 })), aspetta('aspetta la fine', () => E.chiusa || fuoriTempo(st, E))];
    return [vai(`va ${aL(E.posto.label)}`, () => slot(E, i)), aspetta(E.c.verbo === 'protesta' ? 'protesta col cartello' : 'sta a guardare', (st2, n2) => { arrivato(st2, E, n2); if (E.c.verbo === 'protesta' && E.via) n2.hand = 'cartello'; return E.chiusa || fuoriTempo(st2, E); })];
  }
  // i passi di chi la organizza
  function passiLeader(st, E, core) {
    const D = E.D, L = E.L, out = [];
    out.push(vai(`va ${aL(E.posto.label)}: ${E.nome}`, () => E.posto));
    out.push(aspetta('aspetta gli altri', (st2, n2, P) => { if (!P.__w0) P.__w0 = st2.t; return E.arr.length >= E.cast.length || st2.t - P.__w0 > 35 || E.chiusa; }));
    out.push(fai('comincia', 0, (st2, n2) => { E.via = true; const f = fatto(st2, E.arr.length ? 'raduno' : 'da_solo', n2, { d: `${E.nome}: ${E.arr.length + 1} ${aL(E.posto.label)}`, n: E.arr.length + 1, x: E.posto.x, y: E.posto.y }, E.fid); E.fRad = f;
      const B = E.scritto, l = fill(B && B.via ? pick(B.via) : scegli(LV[E.c.verbo].via, n2), sl(st2, E)); const ex = E.strano && E.arr[0] ? fill(pick(L_STRANO), sl(st2, E)) : null;
      dire(st2, [[n2, l]].concat(ex ? [[E.arr[0], ex]] : []), f, { intento: 'estro', esito: 'via' }); if (E.c.verbo === 'protesta') n2.hand = 'cartello'; return 'next'; }));
    if (D.corsa) { out.push(vai('corre!', () => E.arrivo, { run: true }), fai('arriva', 0, (st2, n2) => { if (!E.ordine.includes(n2.id)) E.ordine.push(n2.id); return 'next'; }), aspetta('aspetta gli altri', (st2, n2, P) => { if (!P.__w1) P.__w1 = st2.t; return E.ordine.length >= E.arr.length + 1 || st2.t - P.__w1 > 20; })); }
    else if (D.giro) out.push(vai(`porta il corteo fino ${aL(E.via2.label)}`, () => E.via2));
    else if (E.c.verbo === 'costruisci') out.push(vai('va al posto del cantiere', () => E.sito), fai('pianta i picchetti e comincia', 0, (st2, n2) => { E.o = apriCantiere(st2, n2, E); return E.o ? 'next' : 'stop'; }), fai(`tira su ${art(E.b.nome.toLowerCase(), 'det')}`, Math.max(40, (E.b.big || 20) * 4), (st2, n2) => { if (E.o) delete E.o.wip; if (CN() && CN().state) CN().state.dirty = true; return 'next'; }));
    else if (D.dur) out.push(fai(E.nome, D.dur, null));
    if (core && core.length) out.push(...core);
    out.push(fai('finisce', 0, (st2, n2) => { chiudi(st2, E, 'fatta'); return 'next'; }));
    return out;
  }
  // la fine: l'effetto vero (sempre, anche se interrotta: quello che è successo è successo), le battute, la catena
  function chiudi(st, E, come) {
    if (E.chiusa) return; E.chiusa = true; const I = S(st), L = E.L, M = I.memi[E.meme];
    I.attive = I.attive.filter(x => x !== E);
    // gli attrezzi tornano a chi li ha prestati
    E.prestiti.forEach(pr => { const k = G.byId(st, pr.da); if (k && E.inMano[pr.g] > 0 && (alive(L) && !(L.jailedUntil > st.t))) { E.inMano[pr.g]--; metti(k, pr.g, 1); fatto(st, 'reso', L, { d: `${nomeDi(L)} rende ${art(nm(pr.g), 'det')} a ${nomeDi(k)}`, a: k.id }, E.fid); } else if (k) { fatto(st, 'non_reso', L, { d: `${nomeDi(L)} non rende ${art(nm(pr.g), 'det')} a ${nomeDi(k)}`, a: k.id }, E.fid); note(st, k, `${nomeDi(L)} non gli ha reso ${art(nm(pr.g), 'det')}`, 'bad', { w: .5, who: L.id, tag: 'debito' }); moveRel(st, k, L, -.15); } });
    const capace = alive(L) && !(L.jailedUntil > st.t);
    let R = null;
    if (capace && (E.via || E.ultimo || E.o)) { try { R = E.D.fine(st, E); } catch (e) { R = null; E.manca = 'errore: ' + e.message; } }   // solo se è cominciata davvero: prima no
    if (E.c.verbo === 'protesta') [L].concat(E.arr).forEach(b => { if (b.hand === 'cartello') b.hand = null; });
    let fid;
    if (R) { fid = fatto(st, R.tipo, R.vinc || L, Object.assign({ x: E.posto.x, y: E.posto.y, verbo: E.c.verbo, meme: E.meme }, R, { vinc: R.vinc ? R.vinc.id : null, chi2: R.chi2 ? R.chi2.id : null, perde: R.perde ? R.perde.id : null, prete: R.prete ? R.prete.id : null, lite: R.lite ? R.lite.id : null }), E.fRad || E.fid); E.esito = R; }
    else fid = fatto(st, 'saltata', L, { d: `${E.nome}: saltata${E.manca ? ' (mancava ' + E.manca + ')' : ''}` }, E.fid);
    const vuota = !R || /_vuot|_no$|_sola|saltata|da_solo/.test(R.tipo) || (R.n || 0) === 0 && !/raccolto|pesca|fatto_a_mano|costruito|muro|regalo/.test(R.tipo);
    if (R && !/_no$/.test(R.tipo)) I.stats.eseguite++; if (come === 'sciolta') I.stats.sciolte++; else if (!E.arr.length && E.cast.length) I.stats.deserte++; if (come === 'interrotta') I.stats.interrotte++;
    if (R) { const k = { costruito: 'costruiti' }[R.tipo]; if (k) I.stats[k]++; }
    // la memoria dell'iniziativa: cresce, diventa una cosa fissa, o svanisce
    if (M) { const n0 = E.arr.length + 1; M.best = Math.max(M.best, n0); if (vuota) { M.fail++; M.forza -= .6; } else { M.ok++; M.forza += .5 + n0 / 6; }
      if (!M.ricorrente && M.ok >= 3 && M.best >= 3) { M.ricorrente = { wd: wdOf(st.t), h: Math.floor(hourOf(st)) }; I.stats.ricorrenti++; fatto(st, 'ricorrente', L, { d: `${M.nome} diventa una cosa fissa: ogni ${M.ricorrente.wd}`, meme: M.k }, fid); } }
    // le battute della fine e di chi ha visto
    if (R) { const B = E.scritto, b2 = E.arr[0] || (R.vinc && R.vinc !== L ? R.vinc : null), o = sl(st, E, b2, R);
      const l1 = B && B[vuota ? 'vuota' : 'fine'] ? fill(pick(B[vuota ? 'vuota' : 'fine']), o) : fill(scegli(LV[E.c.verbo][vuota ? 'vuota' : 'fine'] || LV[E.c.verbo].fine, L), o);
      const l2 = b2 ? (B && B.dopo ? fill(pick(B.dopo), o) : fill(scegli(vuota ? L_DOPO_VUOTA : L_DOPO, b2), o)) : null;
      dire(st, [[R.vinc && R.vinc !== L && !vuota ? R.vinc : L, l1]].concat(l2 ? [[R.vinc && R.vinc !== L && !vuota ? L : b2, l2]] : []), fid, { intento: 'estro', esito: vuota ? 'vuota' : 'fatta', si: true });   // «fatto»: è già successo, non è una promessa
      if (R.prete && dP(st, R.prete) < CFG.parla) dire(st, [[R.prete, pick(L_PRETE)]], fid); }
    // chi ha visto si ricorda (e lo racconta: il diario passa da Popolo.share, il coro lo legge)
    const testimoni = st.npcs.filter(k => alive(k) && k !== L && !E.arr.includes(k) && hyp(k.x - E.posto.x, k.y - E.posto.y) < 25 && !k.inside).slice(0, 6);
    testimoni.forEach(k => note(st, k, `ha visto ${E.nome} ${aL(E.posto.label)}: ${R ? R.d.replace(/^[^:]*: ?/, '') : 'è saltata'}`, 'info', { w: .3, who: L.id, place: E.posto.label, tag: 'iniziativa' }));
    E.arr.forEach(k => note(st, k, `è andat${o_(k)} a ${E.nome} di ${nomeDi(L)}`, vuota ? 'info' : 'good', { w: .3, who: L.id, tag: 'iniziativa' }));
    // l'imitazione: chi ha visto o c'era può rifarla domani, cambiata
    if (R && !vuota && M && M.forza > .3) { const cand = testimoni.concat(E.arr).filter(k => k.pop && !k.cop); if (cand.length && rnd() < .55) { const k = pick(cand); I.copie.push({ t: dayIdx(st.t) * 1440 + 1440 + (8 + rnd() * 11) * 60, chi: k.id, padre: M.k, causa: fid }); } }
    E.fFine = fid; (I.storia = I.storia || []).push({ nome: E.nome, verbo: E.c.verbo, esito: R ? R.tipo : 'saltata', come, manca: E.manca || '', via: !!E.via, arr: E.arr.length, cast: E.cast.length, near: E.near }); if (I.storia.length > 300) I.storia.shift();
  }
  function sl(st, E, b, R) { const L = E.L; return { nome: b ? nomeDi(b) : 'zio', capo: nomeDi(L), posto: E.posto.label, aposto: aL(E.posto.label), ogg: E.c.ogg ? (IMMATERIALI[E.c.ogg] || nm(E.c.ogg)) : 'niente', unogg: E.c.ogg ? (IMMATERIALI[E.c.ogg] || art(nm(E.c.ogg))) : 'niente', logg: E.c.ogg ? (IMMATERIALI[E.c.ogg] || art(nm(E.c.ogg), 'det')) : 'niente', iniz: E.nome, vinc: R && R.vinc ? nomeDi(R.vinc) : nomeDi(L), n: R ? R.n || 0 : E.arr.length + 1, soldi: R && R.inc ? lire(R.inc) : 'niente', motivo: MOTIVI_P[E.c.ogg] || '', benef: E.benef ? nomeDi(E.benef) : '', ber: E.bersaglio ? nomeDi(E.bersaglio) : '', perde: R && R.perde ? nomeDi(R.perde) : 'tu', giorno: wdOf(st.t), wd: wdOf(st.t), lui: L.pop.sex === 'f' ? 'lei' : 'lui', testo: R && R.testo ? String(R.testo).slice(0, 30) : '' }; }
  // i Grigi: vedono la folla, intervengono; l'iniziativa si scioglie e la sua memoria può essere bandita (poi va di nascosto)
  function sorveglia(st) {
    const I = S(st); if (!I.attive.length) return;
    for (const E of I.attive.slice()) {
      if (!E.via || E.chiusa || E.grigi || /^(pesca|raccogli|fabbrica|costruisci|regala)$/.test(E.c.verbo)) continue; const r = E.D.grigiR || 30, quanti = E.arr.length + 1;
      if (quanti < 3 && E.c.verbo !== 'dipingi' && E.c.verbo !== 'protesta') continue;
      const cop = st.npcs.find(k => k.cop && alive(k) && !k.inside && hyp(k.x - E.posto.x, k.y - E.posto.y) < r && !(k.pop && k.pop.emer && k.pop.emer.prio > 1));
      if (!cop) continue; E.grigi = cop.id; const M = M_(st, E);
      const f = fatto(st, 'grigi', cop, { d: `i Grigi sciolgono ${E.nome}`, a: E.L.id, x: E.posto.x, y: E.posto.y, meme: E.meme }, E.fRad || E.fid);
      dire(st, [[cop, fill(E.scritto && E.scritto.grigio ? pick(E.scritto.grigio) : pick(L_GRIGIO), sl(st, E))], [E.L, pick(L_GRIGIO_R)]], f, { intento: 'grigi', esito: 'sciolta', si: true });   // gli ordini dei Grigi: il fatto c'è già
      note(st, E.L, `i Grigi gli hanno sciolto ${E.nome}`, 'bad', { w: .45, who: cop.id, tag: 'fermato' });
      if (!M.bandito && rnd() < (E.c.verbo === 'protesta' || (E.c.verbo === 'esibisci' && /comizio|imitazione/.test(E.c.ogg)) ? .9 : .45)) { M.bandito = true; M.sotto = true; I.stats.bandite++; fatto(st, 'bandita', cop, { d: `${M.nome}: vietata dai Grigi`, meme: M.k }, f); }
      if (E.c.verbo === 'protesta' && rnd() < .25 && Po() && Po().arrest) { Po().arrest(st, E.L, 'manifestazione non autorizzata'); fatto(st, 'arresto', E.L, { d: `${nomeDi(E.L)} fermat${o_(E.L)} per ${E.nome}`, x: E.posto.x, y: E.posto.y }, f); }
      const A = Az(); chiudi(st, E, 'sciolta'); [E.L].concat(E.cast).forEach(b => { if (A && b.pop && b.pop.emer && b.pop.emer.__ini === E.id) A.endPlan(st, b, 'sciolto'); b.panic = Math.max(b.panic || 0, 2); });
    }
  }
  function potaMemi(st) { const I = S(st), ks = Object.keys(I.memi); if (ks.length <= CFG.memi) return; ks.sort((a, b) => (I.memi[a].forza + (I.memi[a].ultimo - st.t) / 1440) - (I.memi[b].forza + (I.memi[b].ultimo - st.t) / 1440)); ks.slice(0, ks.length - CFG.memi).forEach(k => { delete I.memi[k]; I.stats.svanite++; }); }
  // ogni mattina: le memorie calano; chi non vede gente da quattro giorni svanisce
  function giornata(st) {
    const I = S(st), d = dayIdx(st.t); if (I.giorno === d) return; I.giorno = d; I.casc = {};
    for (const k in I.memi) { const M = I.memi[k]; M.forza -= .15; if (M.forza <= 0 || st.t - M.ultimo > 4 * 1440) { delete I.memi[k]; I.stats.svanite++; } }
  }

  // le mutazioni: un atomo cambia (l'oggetto, il posto, la scala, la forma), il nome segue
  function muta(st, k, M) {
    const D = V[M.verbo], r = rnd(), opt = { verbo: M.verbo, padre: M.k };
    if (r < .35) { const ogs = D.ogg(st, k).filter(x => x !== M.ogg); opt.ogg = ogs.length ? pick(ogs) : M.ogg; }
    else if (r < .6) { opt.ogg = M.ogg; opt.posti = D.posti.filter(p => okPosto(p)); }
    else if (r < .75) { opt.ogg = M.ogg; opt.strano = true; }
    else if (r < .9) { opt.verbo = pick(VERBI.filter(v => v !== M.verbo && V[v].posti[0] !== 'casa')); opt.ogg = undefined; }   // la stessa gente, un'altra cosa
    else { opt.ogg = M.ogg; opt.notte = true; }
    if (M.sotto) { opt.posti = P_NASCOSTI; opt.sotto = true; }
    return componi(st, k, opt);
  }

  // ======================================================================================================================
  // §4 LA FARFALLA: un fatto diventa il motivo di un'altra iniziativa (o di uno scambio), con il calo per salto
  // ======================================================================================================================
  const SEGUITI = {
    vinto_oggetto: .5, vendita: .25, gara: .4, partita: .25, fila: .3, lite: .7, esibizione: .25, protesta: .35, corteo: .3, muro: .5, colletta: .5, raccolto: .35, pesca: .45,
    fatto_a_mano: .25, costruito: .5, tavolata: .3, baratto: .3, tuffo: .2, grigi: .6, bandita: .4, arresto: .7, banco_lasciato: .7, buca: .6, non_reso: .7, regalo: .45, offerto: .2,
    crossato: .7, ripulito: .7, legna: .3, ricorrente: .3, lotteria_vuota: .3, vendita_vuota: .25, rancore: .5, copia_tag: .2,
  };
  function seguito(st, f) {
    const p0 = SEGUITI[f.tipo]; if (!p0) return; const I = S(st), d = dayIdx(st.t);
    if ((I.casc[d] || 0) >= CFG.cascate) return;
    if (rnd() > p0 * Math.pow(CFG.calo, f.salto || 0)) return;   // il calo è per salto fra iniziative (i passi della stessa non contano)
    I.casc[d] = (I.casc[d] || 0) + 1;
    I.pend.push({ t: st.t + 20 + rnd() * 240, f: f.id });
  }
  // il seguito: chi lo fa e cosa (dal tipo del fatto)
  function eseguiSeguito(st, pe) {
    const I = S(st), f = fattoDi(st, pe.f); if (!f) return;
    const by = id => (id ? G.byId(st, id) : null), chi = by(f.chi), D = f.dati || {};
    const tenta = (L, opt) => { if (L && !libero(st, L) && alive(L) && (pe.tries || 0) < 2) { pe.tries = (pe.tries || 0) + 1; pe.t = st.t + 90; I.pend.push(pe); return null; }   // è occupato: ci pensa più tardi
      if (!L || !libero(st, L)) { I.stats.seguitiPersi = (I.stats.seguitiPersi || 0) + 1; return null; } const c = componi(st, L, Object.assign({ causa: f.id }, opt)); if (!c) return null; const E = proponi(st, L, c, 'seguito'); if (E) I.stats.seguiti++; else I.stats.seguitiNo++; return E; };
    const copia = () => { const M = D.meme && I.memi[D.meme]; const w = st.npcs.filter(k => libero(st, k) && f.x != null && hyp(k.x - f.x, k.y - f.y) < 80); if (M && w.length) { const L = pick(w); const c = muta(st, L, M); if (c) { c.causa = f.id; const E = proponi(st, L, c, 'copia'); if (E) I.stats.seguiti++; else I.stats.seguitiNo++; return E; } } return undefined; };
    const r = (() => { switch (f.tipo) {
      case 'vinto_oggetto': if (chi && D.ogg && haN(chi, D.ogg) >= 1) return tenta(chi, { verbo: pick(['vendi', 'lotteria', 'tesoro']), ogg: D.ogg }); return;
      case 'gara': { const p = by(D.perde); if (p && p !== chi) return tenta(p, { verbo: 'gara', motivo: 'rivalità', ogg: '' }) || scambioRivincita(st, p, chi, f); return; }
      case 'vendita': case 'partita': case 'offerto': if (chi && chi.pop.money > 6) return tenta(chi, { verbo: 'offri' }); return;
      case 'lite': { const k = by(D.lite) || by(D.chi2); if (k) return tenta(k, { verbo: pick(['protesta', 'dipingi']), motivo: 'rancore', ogg: pick(['scritta', 'panchina', 'lampione']) }); return; }
      case 'banco_lasciato': { const t = D.posto, near = t && st.npcs.filter(k => libero(st, k) && hyp(k.x - t.x, k.y - t.y) < 150); const L = near && near.length ? pick(near) : null; if (L && t && t.place) return tenta(L, { verbo: 'fila', niente: true, posto: t.place }); if (L) return tenta(L, { verbo: 'fila', niente: true }); return; }
      case 'buca': { const k = by(D.a); if (k && chi) { const fid = fatto(st, 'rancore', k, { d: `${nomeDi(k)} se la lega al dito con ${nomeDi(chi)}`, a: chi.id }, f.id); if (dP(st, k) < CFG.parla && dP(st, chi) < CFG.parla) dire(st, [[k, pick(L_BUCA)], [chi, pick(L_BUCA_R)]], fid, { intento: 'rinfaccia', esito: 'buca', vita: true }); } return; }
      case 'non_reso': { const k = by(D.a); if (k && chi) { fatto(st, 'rancore', k, { d: `${nomeDi(k)} rivuole ${D.d && D.d.match(/rende (.+) a/) ? D.d.match(/rende (.+) a/)[1] : 'la sua roba'}`, a: chi.id }, f.id); } return; }
      case 'muro': case 'ripulito': case 'crossato': return seguitoMuro(st, f);
      case 'rancore': { const k = by(D.a); if (chi && k) return tenta(chi, { verbo: pick(['dipingi', 'protesta', 'gara']), motivo: 'rancore', ogg: pick(['scritta', 'cartello', '']), rivale: k.id }); return; }
      case 'grigi': case 'bandita': { const M = I.memi[D.meme]; const L = chi && chi.cop ? by(D.a) : chi; if (M && L) { const c = muta(st, L, M); if (c) { c.sotto = true; c.posti = P_NASCOSTI; c.causa = f.id; const E = proponi(st, L, Object.assign(c, { posto: pick(P_NASCOSTI) }), 'copia'); if (E) { I.stats.sotto++; I.stats.seguiti++; } return E; } } return; }
      case 'arresto': { const amico = chi && (chi.pop.friends || []).map(by).find(k => k && libero(st, k)); if (amico) return tenta(amico, { verbo: pick(['colletta', 'protesta', 'dipingi']), benef: chi.id, ogg: pick(['nome', 'scritta']) }); return; }
      case 'colletta': { const b = by(D.chi2); if (b && b.pop.debt && b.pop.debt.amount > 0 && b.pop.money > 3) { const pay = Math.min(b.pop.debt.amount, Math.floor(b.pop.money * .6)); b.pop.money -= pay; b.pop.debt.amount -= pay; fatto(st, 'debito_pagato', b, { d: `${nomeDi(b)} dà ${lire(pay)} allo Squalo coi soldi della colletta`, q: pay }, f.id); note(st, b, `coi soldi della colletta ha dato ${lire(pay)} allo Squalo`, 'good', { w: .4 }); } return; }
      case 'raccolto': case 'pesca': case 'legna': { if (!chi) return; const g = ['legna', 'pesce', 'sarde', 'castagne'].find(x => haN(chi, x) >= (x === 'legna' ? 6 : 2)); if (!g) return; const vec = st.npcs.find(k => alive(k) && k !== chi && k.pop && k.pop.age > 62 && k.pop.homeT && chi.pop.homeT && hyp(k.pop.homeT.x - chi.pop.homeT.x, k.pop.homeT.y - chi.pop.homeT.y) < 90); if (vec && rnd() < .5) return tenta(chi, { verbo: 'regala', ogg: g, benef: vec.id }); return tenta(chi, { verbo: 'vendi', ogg: g, posti: ['calata', 'piazza', 'fiori'] }); }
      case 'costruito': { const k = chi && (chi.pop.friends || []).map(by).find(x => x && libero(st, x)); if (k && rnd() < .5) return tenta(k, { verbo: 'costruisci', ogg: pick(['falo', 'amaca', 'stendino', 'tenda']), posto: placeKeyAt(D.x || chi.x, D.y || chi.y) }); if (chi) return tenta(chi, { verbo: 'tavolata', posto: placeKeyAt(D.x || chi.x, D.y || chi.y), posti: P_BOSCO }); return; }
      default: return copia();
    } })();
    // il seguito scritto non si può fare (chi doveva non c'è, la roba è finita): chi ha visto la rifà a modo suo
    if (!r && I.pend.indexOf(pe) < 0) return copia();
    return r;
  }
  // la rivincita a parole: chi ha perso la chiede (uno scambio, non un'iniziativa)
  function scambioRivincita(st, p, w, f) { if (!w || !p) return null; const fid = fatto(st, 'rivincita', p, { d: `${nomeDi(p)} vuole la rivincita con ${nomeDi(w)}`, a: w.id }, f.id); dire(st, [[p, pick(L_RIVINCITA)], [w, pick(L_RIVINCITA_R)]], fid, { intento: 'sfida', esito: 'rimandata', vita: true }); return null; }

  // ======================================================================================================================
  // §2 I MURI CHE PRENDONO INIZIATIVA (le crew, i rivali, i Grigi col solvente, i toy che copiano)
  // ======================================================================================================================
  const crewDi = n => n && n.pop && n.pop.writer;
  function opereCrew(st) { const W = WR() && WR().S(st); return W ? W.works : []; }
  const COLD = ['governo', 'ministero', 'garante', 'archivio', 'commissariato', 'rocca', 'piazza_gov', 'chiesa', 'santuario', 'cultura', 'piazza', 'fontana'];
  // il passo dei muri: la vernice cresce sul muro, la mano va dove va la vernice
  function pennello(label, mins, mk, done) {
    return { label, dur: 0, outside: true,
      tick: (st, n, P) => { if (!P.__w) { const w = mk(st, n, P); if (!w) { P.__no = true; return; } P.__w = WR()._.addWork(st, w); P.__w.live = n.id; P.__c0 = st.clock; P.__t0 = st.t; }
        const w = P.__w, el = n.pop.near && dP(st, n) < 45 ? (st.clock - P.__c0) * MPS : st.t - P.__t0; w.prog = Math.max(w.prog || 0, clamp(el / mins, 0, 1)); n.hand = w.style === 'mtag' ? 'pennarello' : 'bomboletta'; n.speedNow = 0;
        if (w.spot) n.__tip = { x: w.spot.x + Math.cos(w.spot.face) * .5, y: (w.spot.h != null ? w.spot.h : 1.4), z: w.spot.y + Math.sin(w.spot.face) * .5, t: typeof performance !== 'undefined' ? performance.now() : Date.now(), col: '#ff5a3a' }; },
      act: (st, n, P) => { if (P.__no) return 'stop'; const w = P.__w; if (!w || w.prog < 1) return 'wait'; w.prog = 1; w.done = true; w.tDone = st.t; w.live = null; n.__tip = null; n.hand = null; done(st, n, w); return 'next'; } };
  }
  const casaStep = () => ({ label: 'torna a casa', at: (st, n) => n.pop.homeT, dur: 5, inside: true, outside: false });
  function registraOpera(st, w, f) { S(st).crew.opere[w.id] = f; }
  // crossare: una tag sopra il pezzo di un rivale (si va sopra a chi sta più in basso: crossare è l'offesa)
  function crossa(st, n, w0, causa) {
    const wr = crewDi(n), WRx = WR(); if (!wr || !w0 || !w0.spot || !WRx) return null; const I = S(st);
    const mk = (st2, n2) => WRx.npcWork(st2, n2, wr, 'tag', Object.assign({}, w0.spot), { over: [w0.id], crossTag: true });
    const done = (st2, n2, w) => { w0.crossed = { aka: wr.aka, crew: wr.crew, t: st2.t }; w0.covered = true; const B = I.crew.beef; (B[w0.crew] = B[w0.crew] || {})[wr.crew] = ((B[w0.crew] || {})[wr.crew] || 0) + 1; I.stats.crossati++;
      const f = fatto(st2, 'crossato', n2, { d: `${wr.aka} dei ${wr.crew} crossa ${w0.aka} dei ${w0.crew}${w0.place ? ' ' + w0.place : ''}`, crew: wr.crew, vittima: w0.crew, w: w0.id, x: w0.spot.x, y: w0.spot.y }, causa); registraOpera(st2, w, f);
      const tst = st2.npcs.find(k => alive(k) && k !== n2 && dP(st2, k) < CFG.parla && hyp(k.x - n2.x, k.y - n2.y) < 10); if (tst) dire(st2, [[n2, fill(pick(L_MURI.crossa), { aka: w0.aka, crew: w0.crew })], [tst, pick(L_MURI.crossaW)]], f); };
    if (!vicino(st, w0.spot.x, w0.spot.y, 150)) { const w = WRx._.addWork(st, Object.assign(mk(st, n), { prog: 1, done: true, tDone: st.t })); done(st, n, w); return true; }   // lontano: a conti fatti
    return piano(st, n, `crossare ${w0.aka}`, [vai(`va a crossare ${w0.aka} dei ${w0.crew}`, () => ({ x: w0.spot.x, y: w0.spot.y })), pennello('crossa con una tag', 4, mk, done), casaStep()]);
  }
  // ridipingere lo stesso muro (dopo il buff, o per rispondere più grosso)
  function ripassa(st, n, spot, style, causa, tipo, extra) {
    const wr = crewDi(n), WRx = WR(); if (!wr || !spot || !WRx) return null; const I = S(st);
    const mk = (st2, n2) => WRx.npcWork(st2, n2, wr, style, Object.assign({}, spot), extra || {});
    const done = (st2, n2, w) => { I.stats[tipo === 'omaggio' ? 'omaggi' : 'risposte']++; I.stats.dipinti++;
      const f = fatto(st2, tipo, n2, { d: tipo === 'omaggio' ? `${wr.aka} dipinge ${extra && extra.words ? '«' + extra.words + '»' : "l'omaggio"}${spot.place ? ' ' + spot.place : ''}` : `${wr.aka} dei ${wr.crew} ripassa il muro${spot.place ? ' ' + spot.place : ''}: ${WRx.STYLES[style] ? WRx.STYLES[style].nome : style}`, crew: wr.crew, x: spot.x, y: spot.y, w: w.id }, causa); registraOpera(st2, w, f);
      const tst = st2.npcs.find(k => alive(k) && k !== n2 && dP(st2, k) < CFG.parla && hyp(k.x - n2.x, k.y - n2.y) < 10); if (tst) dire(st2, [[tst, pick(L_MURI.ripassaW)], [n2, pick(tipo === 'omaggio' ? L_MURI.omaggio : L_MURI.ripassa)]], f); };
    const min = { tag: 3, throw: 9, pezzo: 32, burner: 55, scritta: 8 }[style] || 15;
    if (!vicino(st, spot.x, spot.y, 150)) { const w = WRx._.addWork(st, Object.assign(mk(st, n), { prog: 1, done: true, tDone: st.t })); done(st, n, w); return true; }
    return piano(st, n, tipo === 'omaggio' ? "l'omaggio sul muro" : 'ripassare il muro', [vai('va al muro', () => ({ x: spot.x, y: spot.y })), pennello('agita la bomboletta e spruzza', min, mk, done), casaStep()]);
  }
  // la sera: ogni crew decide la sua notte (rispondere, crossare, ripassare, l'omaggio, bombare la zona)
  function muriSera(st) {
    const I = S(st), C = I.crew, d = dayIdx(st.t), m = mOf(st.t); if (C.notte === d || m < 21 * 60 + 30 || m > 23 * 60) return; C.notte = d;
    const W = WR() && WR().S(st), WVx = WV(); if (!W || !WVx) return;
    const ws = W.writers.map(id => G.byId(st, id)).filter(n => alive(n) && crewDi(n) && !(n.jailedUntil > st.t) && !n.pop.emer);
    const per = {}; ws.forEach(n => (per[crewDi(n).crew] = per[crewDi(n).crew] || []).push(n));
    for (const crew in per) {
      const mem = per[crew]; if (!mem.length) continue; const n = pick(mem), wr = crewDi(n);
      // 1) chi è stato crossato o ripulito risponde (la causa è quel fatto)
      const offese = I.fatti.filter(f => (f.tipo === 'crossato' && f.dati.vittima === crew || f.tipo === 'ripulito' && f.dati.crew === crew) && st.t - f.t < 1440 && !f.dati.risposto);
      if (offese.length) { const f = offese[offese.length - 1]; f.dati.risposto = true;
        if (f.tipo === 'ripulito') { ripassa(st, n, f.dati.spot, pick(['throw', 'pezzo', 'burner']), f.id, 'risposta'); continue; }
        const nemico = f.dati.crew, mine = opereCrew(st).filter(w => w.crew === nemico && w.done && !w.erased && !w.crossed && w.spot && w.by !== 'player').slice(-40); if (mine.length) { crossa(st, n, pick(mine), f.id); continue; } }
      // 2) l'omaggio a chi è finito dentro o non c'è più (un amico della crew)
      const arr = I.fatti.filter(f => f.tipo === 'arresto' && st.t - f.t < 2 * 1440 && !f.dati.omaggio).pop();
      if (arr && rnd() < .5) { arr.dati.omaggio = true; const k = G.byId(st, arr.chi); const s = WVx.freeSite(st, ['strada', 'hall'], n, 260); if (s && k) { ripassa(st, n, { x: s.x, y: s.y, face: s.face, h: s.h, place: s.name || '' }, 'scritta', arr.id, 'omaggio', { words: ('LIBERO ' + nomeDi(k)).toUpperCase().slice(0, 16), kind: 'strada' }); continue; } }
      // 3) il beef: crossare un rivale (le vecchie guerre e quelle nuove)
      const B = C.beef[crew] || {}, riv = Object.keys(B).sort((a, b) => B[b] - B[a])[0];
      if (riv && rnd() < .35 + Math.min(.4, B[riv] * .1)) { const mine = opereCrew(st).filter(w => w.crew === riv && w.done && !w.erased && !w.crossed && w.spot && w.by !== 'player').slice(-40); if (mine.length) { const f = fatto(st, 'beef', n, { d: `i ${crew} decidono di andare sopra ai ${riv}`, crew, riv }, null); crossa(st, n, pick(mine), f); continue; } }
      // 4) la zona: una passeggiata a bombare (WriterVita.bombing), registrata
      if (rnd() < .3) { const E = WVx.bombing(st, n); if (E) fatto(st, 'bombing', n, { d: `${wr.aka} dei ${wr.crew} esce a bombare`, crew }, null); }
    }
  }
  // il giorno: i Grigi ripuliscono (i muri del regime, le scritte, i crossaggi freschi vicino a loro); i toy copiano le tag nuove
  function muriGiorno(st) {
    const I = S(st), C = I.crew, h = hourOf(st); if (h < 8 || h > 18 || st.t - C.pulT < 45) return; C.pulT = st.t;
    const W = WR() && WR().S(st); if (!W) return; const P = G.PLACES;
    const fresche = W.works.filter(w => w.done && !w.erased && w.by !== 'player' && w.spot && st.t - (w.tDone || w.t0) < 2 * 1440 && st.t - (w.tDone || w.t0) > 30 && !w.__iniPul);
    const fredde = fresche.filter(w => COLD.some(k => P[k] && hyp(P[k].x - w.spot.x, P[k].y - w.spot.y) < 35) || w.style === 'scritta' || w.crossed);
    if (fredde.length && rnd() < .6) {
      const w = pick(fredde); w.__iniPul = true; const cop = st.npcs.filter(k => k.cop && alive(k) && !k.inside && k.pop && !k.pop.emer && !(k.ord && k.ord.svc && k.ord.svc.k && /insegu|arrest|controllo/.test(k.ord.svc.k))).sort((a, b) => hyp(a.x - w.spot.x, a.y - w.spot.y) - hyp(b.x - w.spot.x, b.y - w.spot.y))[0];
      const done = (st2, k) => { w.erased = true; w.buffed = true; I.stats.ripuliti++; const cf = I.crew.opere[w.id] || null;
        const f = fatto(st2, 'ripulito', k, { d: `i Grigi ripuliscono ${w.aka ? (w.style === 'tag' ? 'la tag di ' : 'il pezzo di ') + w.aka : 'il muro'}${w.place ? ' ' + w.place : ''}`, crew: w.crew, aka: w.aka, spot: Object.assign({}, w.spot), x: w.spot.x, y: w.spot.y }, cf);
        const by = G.byId(st2, w.by); if (by) note(st2, by, `i Grigi gli hanno cancellato ${w.style === 'tag' ? 'la tag' : 'il pezzo'}${w.place ? ' ' + w.place : ''}`, 'bad', { w: .5, tag: 'scritta' });
        if (k && dP(st2, k) < CFG.parla) { const tst = st2.npcs.find(x => alive(x) && x !== k && !x.cop && hyp(x.x - k.x, x.y - k.y) < 10); dire(st2, [[k, pick(L_MURI.pulisce)]].concat(tst ? [[tst, pick(L_MURI.puliscW)]] : []), f); } };
      if (cop && vicino(st, w.spot.x, w.spot.y, 150) && hyp(cop.x - w.spot.x, cop.y - w.spot.y) < 300) piano(st, cop, 'ripulire il muro', [vai('va a ripulire il muro', () => ({ x: w.spot.x, y: w.spot.y })), fai('passa il solvente sul muro', 20, (st2, k) => { done(st2, k); return 'next'; })]);
      else done(st, cop || null);
    }
    // i toy: una tag nuova accanto a quella di una crew (la copia, che non crossa: va accanto)
    if (st.t - C.toyT > 60) { C.toyT = st.t; const WVx = WV(); const nuove = fresche.filter(w => w.crew && vicino(st, w.spot.x, w.spot.y, 90)); if (nuove.length && WVx) { const w = pick(nuove); const toy = st.npcs.find(k => libero(st, k) && !crewDi(k) && k.pop.age >= 13 && k.pop.age <= 22 && hyp(k.x - w.spot.x, k.y - w.spot.y) < 60);
      if (toy) { const wr = toy.pop.toy || { aka: 'TOY', crew: '', skill: .2, hand: 7, mop: true }; const sp = { x: w.spot.x + Math.cos(w.spot.face + 1.57) * 1.6, y: w.spot.y + Math.sin(w.spot.face + 1.57) * 1.6, face: w.spot.face, h: w.spot.h, place: w.place };
        if (G.walkM(sp.x, sp.y) && WR().npcWork) piano(st, toy, 'una tag accanto', [vai('si avvicina al muro', () => sp), pennello('fa la sua tag col pennarello', 2, (st2, n2) => WR().npcWork(st2, n2, n2.pop.toy || wr, 'mtag', sp), (st2, n2, nw) => { I.stats.toy++; const f = fatto(st2, 'copia_tag', n2, { d: `${nomeDi(n2)} copia la tag di ${w.aka} accanto alla sua`, x: sp.x, y: sp.y }, I.crew.opere[w.id] || null); registraOpera(st2, nw, f); })]); } } }
    // la scena cresce: ogni fatto dei muri spinge un poco (Writing: sceneLevel legge W.grow)
    const n0 = I.stats.crossati + I.stats.ripuliti + I.stats.risposte + I.stats.omaggi; if (n0 > (C.grown || 0)) { W.grow = Math.min(.6, (W.grow || 0) + (n0 - (C.grown || 0)) * .01); C.grown = n0; }
  }
  function seguitoMuro(st, f) {
    if (f.tipo === 'muro') { const I = S(st); const D = f.dati, cop = st.npcs.find(k => k.cop && alive(k) && !k.inside && D.x != null && hyp(k.x - D.x, k.y - D.y) < 200);
      // il muro dipinto da un abitante: una crew ci va accanto (o sopra, se è un rivale), o i Grigi lo vedono
      const W = WR() && WR().S(st); const ws = W ? W.writers.map(id => G.byId(st, id)).filter(n => libero(st, n) && crewDi(n)) : []; if (ws.length && D.x != null && rnd() < .6) { const n = pick(ws); const s = WV() && WV().freeSite(st, ['strada', 'hall'], { x: D.x, y: D.y }, 80); if (s) return ripassa(st, n, { x: s.x, y: s.y, face: s.face, h: s.h, place: s.name || '' }, pick(['throw', 'tag', 'pezzo']), f.id, 'risposta'); }
      if (cop && Po()) { const fid = fatto(st, 'grigi', cop, { d: `i Grigi chiedono chi ha dipinto ${D.d ? D.d.split(':')[0] : 'il muro'}` }, f.id); return fid; } }
    // crossato / ripulito: ci pensa la sera della crew (muriSera legge i fatti freschi)
  }

  // ======================================================================================================================
  // §3 I BISOGNI: il freddo, la fame, il riparo (con la roba vera, le ricette vere, il cantiere vero)
  // ======================================================================================================================
  const legnaDi = n => Object.keys(n.pop.casa || {}).reduce((s, k) => s + ((CATo()[k] && CATo()[k].heat) ? n.pop.casa[k] : 0), 0);
  const ciboDi = n => bagsOf(n).reduce((s, B) => s + Object.keys(B).reduce((q, k) => q + ((CATo()[k] && CATo()[k].eat && CATo()[k].eat.fame > 0) ? B[k] : 0), 0), 0);
  function bisogni(st) {
    const I = S(st), B = I.bis; if (st.t - B.t < 15) return; B.t = st.t; const h = hourOf(st); if (h < 7 || h > 16) return;
    const N = st.npcs.length; if (!N) return; let k = 0;
    while (k++ < 5) {
      B.i = (B.i + 1) % N; const n = st.npcs[B.i]; if (!libero(st, n) || n.pop.age < 16 || !n.pop.homeT) continue; const day = dayIdx(st.t), id = n.id;
      if (B.fatti[id] === day) continue; const P = n.pop, Nd = P.need || {};
      let goal = null;
      if (legnaDi(n) < 1 && (P.age > 50 || rnd() < .3) && rnd() < .35) goal = { k: 'legna', want: { legna: 2 }, solo: true };
      else if ((Nd.fame || 0) > .6 && ciboDi(n) < 1 && (P.money || 0) < 6 && rnd() < .5) goal = rnd() < .5 ? { k: 'castagne', want: { castagne: 2 }, solo: true } : { k: 'pesca', want: { pesce: 1 }, solo: true };
      else if (P.age < 34 && !I.basi.some(b => b.chi === id) && I.basi.length < 10 && rnd() < .04 && ((Nd.compagnia || 0) > .4 || (P.ints || []).some(i => /campagna|mare|caccia|pesca/.test(i.k || i)) || P.status === 'disoccupato')) goal = { k: 'capanna' };
      if (!goal) continue; B.fatti[id] = day;
      if (goal.k === 'capanna') { const c = componi(st, n, { verbo: 'costruisci', ogg: pick(['capanna_tonda', 'tenda', 'falo']), motivo: 'riparo' }); if (c) { const E = proponi(st, n, c, 'bisogno'); if (E) { E.base = true; return; } } continue; }
      const verbo = goal.k === 'pesca' ? 'pesca' : 'raccogli', c = componi(st, n, { verbo, ogg: goal.k === 'pesca' ? '' : goal.k, motivo: 'bisogno' });
      if (c && proponi(st, n, c, 'bisogno')) return;
    }
  }
  // dopo il lavoro: la base nel bosco si usa (ci si va la sera, ci si porta un amico), la legna si porta a casa
  function finePiano(st, E, tipo) {
    const L = E.L, I = S(st);
    if (tipo === 'costruito') { if (!E.o) return null; const b = { chi: L.id, uid: E.o.uid, id: E.b.id, nome: E.b.nome, x: E.o.x, y: E.o.y, t: st.t, posto: E.posto.label }; I.basi.push(b);
      note(st, L, `ha tirato su ${art(E.b.nome.toLowerCase())} ${aL(E.posto.label)}`, 'good', { w: .6, place: E.posto.label, tag: 'progetto' });
      return { tipo: 'costruito', d: `${nomeDi(L)} tira su ${art(E.b.nome.toLowerCase())} ${aL(E.posto.label)}`, n: E.arr.length + 1, x: E.o.x, y: E.o.y }; }
    const got = (fattoDi(st, E.ultimo) || {}).d || '';
        if (!E.ultimo) return null;
    if (tipo === 'pesca') return { tipo: 'pesca', d: got, n: E.arr.length + 1 };
    if (tipo === 'raccolto' && E.c.ogg === 'legna') return { tipo: 'legna', d: got, n: E.arr.length + 1 };
    return { tipo, d: got, n: E.arr.length + 1 };
  }

  // ======================================================================================================================
  // LE DECISIONI: ogni dieci minuti di gioco, con i tetti (vicino al giocatore al massimo due vive)
  // ======================================================================================================================
  function decidi(st) {
    const I = S(st); giornata(st);
    // i seguiti a catena maturi
    for (let i = I.pend.length - 1; i >= 0; i--) { const pe = I.pend[i]; if (st.t < pe.t) continue; I.pend.splice(i, 1); if (I.attive.length < CFG.tutte) try { eseguiSeguito(st, pe); } catch (e) { } break; }   // uno per giro: il costo resta piccolo
    // le copie del giorno dopo (con la mutazione)
    for (let i = I.copie.length - 1; i >= 0; i--) { const cp = I.copie[i]; if (st.t < cp.t) continue; I.copie.splice(i, 1); const k = G.byId(st, cp.chi), M = I.memi[cp.padre]; if (!k || !M || !libero(st, k) || I.attive.length >= CFG.tutte) continue; const c = muta(st, k, M); if (!c) continue; c.causa = cp.causa; if (!fusioneOSfida(st, k, c)) proponi(st, k, c, 'copia'); return; }
    // le cose fisse: il giorno giusto, l'ora giusta, chi c'era la volta prima la rifà
    for (const k in I.memi) { const M = I.memi[k]; if (!M.ricorrente || M.ricorrente.wd !== wdOf(st.t) || Math.floor(hourOf(st)) !== M.ricorrente.h || M.ultimo > st.t - 600) continue; const ff = M.ultimoF ? fattoDi(st, M.ultimoF) : null; const L = ff && G.byId(st, ff.chi); if (L && libero(st, L)) { const c = componi(st, L, { verbo: M.verbo, ogg: M.ogg, padre: M.padre, causa: ff.id }); if (c) { c.padre = M.padre; proponi(st, L, c, 'ricorrente'); } } }
    if (I.attive.filter(E => !E.bisogno).length >= CFG.tutte) return;
    const pr = CFG.pGiorno * CFG.ogni / 1440 * (hourOf(st) >= 8 && hourOf(st) < 22 ? 1.5 : .25); if (rnd() > pr) return;
    const nv = I.attive.filter(E => vicino(st, E.posto.x, E.posto.y)).length;
    const vic = nv < CFG.vicine && rnd() < .6, pool = st.npcs.filter(n => libero(st, n) && (vic ? dP(st, n) < CFG.raggio : true));
    if (!pool.length) return; const L = pick(pool);
    // un estro scritto (uno su tre), o un'iniziativa composta, o (se acceso) quella che propone la Mente
    let c = null, orig = 'composta';
    if (CFG.ia && rnd() < .25) { const a = atomi(st, L); const j = chiediIA(st, L, a); if (j) { c = daJSON(st, L, j); orig = 'ia'; } }
    if (!c && rnd() < .38) { const h = hourOf(st), adatti = ESTRI_L.filter(X => { const D = V[X.atomi.verbo]; return X.atomi.notte ? (h >= 21 || h < 3) : (h >= D.ore[0] && h < D.ore[1]); });
      const X = adatti.length ? pick(adatti) : null;
      if (X) { let L2 = L; const og = X.atomi.ogg; if (og && CATo()[og]) { const hold = pool.filter(n => haN(n, og) >= 1); L2 = hold.length ? pick(hold) : L; } c = componi(st, L2, Object.assign({ scritta: X.id, nome: X.nome, vicino: vic }, X.atomi)); if (c) { orig = 'scritta'; c.__L = L2; } } }
    if (!c) c = componi(st, L, { strano: rnd() < .12, vicino: vic });
    if (!c) return; const L3 = c.__L || L; delete c.__L; if (fusioneOSfida(st, L3, c)) return;
    proponi(st, L3, c, orig);
  }
  // due iniziative nello stesso posto: se fanno la stessa cosa si sfidano, se no si fondono (una nuova, figlia di tutte e due)
  function fusioneOSfida(st, L, c) {
    const I = S(st), t = c.posto && tgtOf(c.posto); if (!t) return false;
    const E = I.attive.find(x => !x.chiusa && hyp(x.posto.x - t.x, x.posto.y - t.y) < 40); if (!E) return false;
    if (E.c.verbo === c.verbo) { const f = fatto(st, 'sfida', L, { d: `${nomeDi(L)} sfida ${E.nome} di ${nomeDi(E.L)}`, a: E.L.id }, E.fid); I.stats.sfide++; if (invita(st, E, L)) { M_(st, E).forza += .3; dire(st, [[L, pick(L_SFIDA)], [E.L, pick(L_SFIDA_R)]], f, { intento: 'sfida', esito: 'si', si: true }); } return true; }
    const D2 = V[c.verbo], Mk = memeKey(c) + '+' + E.meme; if (!D2) return false;
    if (E.fusa || I.memi[Mk] || E.D.forma !== 'folla' || D2.forma === 'solo' || rnd() < .5) { if (E.cast.length < E.D.max + 2 && libero(st, L)) { invita(st, E, L); return true; } return false; }   // una fusione sola: dopo, chi arriva si aggiunge
    E.fusa = true;
    const nome = `${E.nome} con ${D2.nome(c.ogg, c).replace(/^(la|il|lo|l'|i|le|gli) /, '')}`;
    I.memi[Mk] = { k: Mk, nome, verbo: E.c.verbo, ogg: E.c.ogg, origine: 'fusione', padre: E.meme, fusa: memeKey(c), gen: (M_(st, E).gen || 0) + 1, count: 1, ok: 0, fail: 0, best: 0, t0: st.t, ultimo: st.t, forza: 1, bandito: false, sotto: false, ricorrente: null };
    E.meme = Mk; E.nome = nome; I.stats.fusioni++; fatto(st, 'fusione', L, { d: `${nomeDi(L)} arriva con ${D2.nome(c.ogg, c)}: diventa ${nome}`, meme: Mk }, E.fid); invita(st, E, L); potaMemi(st);
    return true;
  }

  // ======================================================================================================================
  // LA MENTE (facoltativa): un'iniziativa nuova chiesta come JSON dagli atomi, provata a secco come tutte le altre
  // ======================================================================================================================
  function atomi(st, L) { return { verbi: VERBI, oggetti: roba(L).slice(0, 12), posti: P_PIAZZA.concat(P_BAR, P_MARE).filter(okPosto), motivi: ['bisogno', 'noia', 'rancore', 'scherzo', 'rivalità', 'imitazione'], forme: ['solo', 'amico', 'folla', 'sfida'], chi: { nome: nomeDi(L), eta: L.pop.age, mestiere: L.role || '' } }; }
  const IA = { pend: {}, n: 0 };
  // CFG.ia === 'finta' (prove): una risposta inventata dagli atomi, come la darebbe il server. Altrimenti si chiede a /api/mente
  // (kind 'iniziativa', che il server oggi NON conosce: risponde con l'errore e qui non succede niente) e la risposta vale la volta dopo.
  function chiediIA(st, L, a) {
    if (CFG.ia === 'finta') { const v = pick(a.verbi.filter(x => x !== 'regala')); return { verbo: v, oggetto: pick((V[v].ogg(st, L) || []).concat([''])), posto: pick(a.posti), motivo: pick(a.motivi), nome: null }; }
    const k = L.id; if (IA.pend[k] && IA.pend[k].data) { const d = IA.pend[k].data; delete IA.pend[k]; return d; }
    if (IA.pend[k] || typeof fetch === 'undefined') return null; IA.pend[k] = { t: st.t };
    try { fetch('/api/mente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'iniziativa', atomi: a }) }).then(r => r.json()).then(b => { if (b && b.data) IA.pend[k].data = b.data; else delete IA.pend[k]; }).catch(() => { delete IA.pend[k]; }); } catch (e) { delete IA.pend[k]; }
    return null;
  }
  function daJSON(st, L, j) { if (!j || !V[j.verbo]) return null; const c = componi(st, L, { verbo: j.verbo, ogg: j.oggetto != null ? String(j.oggetto) : undefined, posto: okPosto(j.posto) ? j.posto : undefined, motivo: j.motivo, ia: true }); if (c && j.nome && String(j.nome).length < 50) c.nome = String(j.nome); return c; }

  // ======================================================================================================================
  // IL PASSO
  // ======================================================================================================================
  const now = () => (typeof process !== 'undefined' && process.hrtime ? Number(process.hrtime.bigint()) / 1e6 : typeof performance !== 'undefined' ? performance.now() : Date.now());
  function step(st, dt) {
    if (!st.player || !st.pop || !st.npcs) return; const t0 = now(), I = S(st);
    codaPropria(st);
    I.rt += dt; if (I.rt >= 1) { I.rt = 0; sorveglia(st); }
    if (st.t - I.dec >= CFG.ogni / 2) { I.dec = st.t; const T = I.stats.pezzi = I.stats.pezzi || {}; const turno = [['decidi', decidi], ['bisogni', bisogni], ['sera', muriSera], ['giorno', muriGiorno]]; for (const [k, f] of [turno[0], turno[1 + (I.giro = ((I.giro || 0) + 1) % 3)]]) { const a = now(); f(st); const d = now() - a; T[k] = Math.max(T[k] || 0, d); } }   // a turno: decidere sempre, il resto uno alla volta
    const ms = now() - t0; I.stats.ms += ms; I.stats.passi++; if (ms > I.stats.msMax) I.stats.msMax = ms;
  }
  { const s0 = G.HOOKS.step; G.HOOKS.step = (st, dt) => { if (s0) s0(st, dt); try { step(st, dt); } catch (e) { if (!step.err) { step.err = 1; if (typeof console !== 'undefined') console.warn('[Iniziative]', e); } } }; }

  // Vita: gli intenti nuovi (se c'è)
  // l'esito lo decide iniziative.js prima (il fatto c'è già): vita.js lo mette solo in scena. quando: mai da solo
  try { const Vx = Vi(); if (Vx && Vx.registraIntento) Object.keys(INT_VITA).forEach(k => Vx.registraIntento('ini_' + k, { quando: () => false, esito: (a, b, st, d) => (d && d.__r) || null, battute: {}, si: [] })); } catch (e) { }

  // «Sentito dire» per il Taccuino: le catene vicine al giocatore, in una riga
  function sentito(st, k) { const I = S(st), ultimi = I.fatti.filter(f => !SEGUITI[f.tipo] ? false : true).slice(-80).reverse(), out = [], vist = new Set(); for (const f of ultimi) { const ch = catena(st, f.id); if (ch.length < 2 || vist.has(ch[0].id)) continue; vist.add(ch[0].id); out.push(ch.map(x => x.d).join(' → ')); if (out.length >= (k || 8)) break; } return out; }
  Object.assign(Iniziative, { S, fatto, catena, catenaTesto, sentito, componi, prova, proponi, procura, crossa, ripassa, VERBI: V, chiediIA, daJSON, _: { memeKey, dire, muriSera, muriGiorno, bisogni, decidi, eseguiSeguito, apriCantiere, sitoCostruzione, art, aL } });
  // (le battute e gli estri scritti sono qui sotto: §5)

  // ======================================================================================================================
  // §5 LE BATTUTE (≤ 70 caratteri, il tono di commedia/TONO.md: chi parla si sputtana, strutture diverse)
  // ======================================================================================================================
  const L_SI = { r: ['Ci sto. Ma se perdo non mi conosci.', 'Vengo. Tanto mia madre pensa che lavoro.', 'Ci sto, zio. Offri tu dopo.', 'Vengo, ma mi metto dietro.', 'Ci sto. Ho niente da fare fino a giovedì.'],
    a: ['Va bene, ma alle otto sono a casa.', 'Ci sto. Non lo dite a mia moglie.', 'Vengo. Mi serviva una scusa per uscire.', 'Contaci. Porto la sedia.', 'Ci vengo. Ma faccio finta di passare.'] };
  const L_NO = { r: ['No, fra. Ho la faccia da uno che corre?', 'Sono stanco. Dalla nascita.', 'Non posso, mi guardano i Grigi da martedì.', 'Ho giurato a mia nonna di non divertirmi.'],
    a: ['Alla mia età? Ho la schiena.', 'No. L\'ultima volta è finita sul giornale.', 'Non posso, ho il sugo sul fuoco.', 'Non mi interessa. Raccontamela dopo.', 'Ho la pressione. E la suocera.'] };
  const L_NO_LAVORO = ['Sto lavorando. Più o meno.', 'Ho il turno. Il padrone conta i minuti.', 'Se lascio il banco mi ammazzano.'];
  const L_STRANO = ['{Ogg} {aposto}? Sì, è questo il bello.', 'Chi ci ha mai pensato, {aposto}? Nessuno. Appunto.', 'Mia madre dice che è da scemi. Lei non è qui.', 'Non ha senso. Per questo funziona.', 'Se ci vedono, diciamo che è una tradizione.'].map(s => s.replace('{Ogg}', '{ogg}'));
  const L_DOPO = { r: ['Domani lo rifacciamo. Più grosso.', 'Lo racconto a tutti. Un po\' cambiato.', 'Io ho visto tutto. Ero dietro.', 'La prossima volta vinco io. Mi alleno.'],
    a: ['Ai miei tempi si faceva meglio. Ma anche questo.', 'Io non c\'ero, eh. Se chiedono.', 'Bella. Ma la sedia era mia.', 'Mia moglie non ci crederà. Meglio.'] };
  const L_DOPO_VUOTA = { r: ['Che fiasco, fra.', 'Eravamo in due. Uno ero io.', 'La prossima volta mettiamo i manifesti.'], a: ['Non è venuto nessuno. Neanche io, quasi.', 'Bella idea. Bella tomba.', 'Ci riproviamo quando la gente esce.'] };
  const L_GRIGIO = ['Cos\'è questa roba? Sciogliere. Subito.', 'Assembramento. Tutti a casa, uno alla volta.', 'Chi ha dato il permesso? Nessuno. Appunto.', 'Documenti. Tutti. Anche tu col cartello.', 'Bello. Peccato che è vietato.', 'Via, via. Dov\'è il capo? Tu? Bravo, vieni.'];
  const L_GRIGIO_R = ['Non è niente, agente! È una cosa nostra.', 'Andiamo, andiamo. …Lui era con me.', 'Era un\'idea sua. Io passavo.', 'Ci sciogliamo. Anche se eravamo già sciolti.'];
  const L_PRETE = ['Fermi! Chi vi ha dato il santo?!', 'In chiesa no, eh. Fuori fate quel che volete.', 'Questa processione non è nel calendario.'];
  const L_BUCA = ['Ieri. All\'ora giusta. Chi c\'era? Io.', 'Mi hai lasciato lì come un palo.', 'Tu eri alla cosa della lotteria, lo so.'];
  const L_BUCA_R = ['C\'era la gara! Non potevo mancare.', 'Mi hanno trascinato. Sono debole.', 'Era più importante. Senza offesa.'];
  const L_RIVINCITA = ['Ho perso perché avevo le scarpe di mio fratello.', 'Rivincita. Domani. Stessa strada.', 'Hai barato. Non so come, ma hai barato.'];
  const L_RIVINCITA_R = ['Porta tuo fratello. Perdete in due.', 'Domani ho da fare. Per sempre.', 'Ho vinto. Fine della storia.'];
  const L_SFIDA = ['Questa la facciamo anche noi. Meglio.', 'Due cose uguali qui? Vince la nostra.', 'Fatevi in là, ora comandiamo noi.'];
  const L_SFIDA_R = ['Vieni pure. Perdi davanti a tutti.', 'L\'abbiamo inventata noi. Copione.', 'Più siamo, più ridiamo. Di te.'];
  // le battute dei verbi (le iniziative composte): chiede, via, fine, vuota; {ogg}, {unogg}, {logg}, {aposto}, {vinc}, {n}, {soldi}
  const LV = {
    lotteria: { chiede: ['Biglietto da mille. Si vince {unogg}.', 'Lotteria! Mille lire, e magari ti porti a casa {unogg}.'], via: ['Biglietti! Ultimi biglietti! Ne ho venti.', 'Mettete i soldi qui. Il premio è vero, giuro.'], fine: ['Ha vinto {vinc}! Non io, purtroppo. Cioè, per fortuna.', '{vinc} si porta a casa {logg}. Io i soldi.'], vuota: ['Nessun biglietto. {Logg} me lo tengo io.', 'Lotteria annullata. Il premio torna in tasca.'] },
    vendi: { chiede: ['Vieni a vedere. Vendo {logg}. Prezzo da amico.', 'Ti interessa {unogg}? Per te un prezzo onesto.'], via: ['{Ogg}! Chi vuole {logg}? Una lira!', 'Avanti, signori! Roba così non torna.'], fine: ['Venduto! {n} clienti, {soldi}. Domani alzo il prezzo.', 'Incasso: {soldi}. Ricco no, contento sì.'], vuota: ['Nessuno compra. La gente non capisce niente.', 'Zero clienti. Domani mi metto più al sole.'] },
    gara: { chiede: ['Chi arriva primo prende la posta. Ci stai?', 'Gara fino in fondo. Mille lire a testa.'], via: ['Al tre! Uno… Tre! Vai!', 'Pronti? Chi perde paga e sta zitto.'], fine: ['Primo! {vinc}! Lo dicevo io!', 'Ha vinto {vinc}. Io avevo un sasso nella scarpa.'], vuota: ['Ho vinto. Ero da solo, ma conta.'] },
    gioca: { chiede: ['Una partita? Ti faccio vincere la prima.', 'Ci giochiamo l\'aperitivo. Il tuo.'], via: ['Taglia. No, taglio io: tu bari.', 'Si gioca. Chi parla perde un punto.'], fine: ['Ho vinto io. Ve lo dico prima che contiate.', 'Abbiamo giocato {n} mani. Il conto lo fa lui.'], vuota: ['Nessuno vuole giocare con me. Chissà perché.'] },
    fila: { chiede: ['Mettiti in fila con me. Fidati.', 'C\'è la fila. Se c\'è la fila, c\'è qualcosa.'], via: ['Sono il primo. Il primo di cosa non lo so.', 'Non spingete! Siamo in fila!'], fine: ['Abbiamo fatto la fila in {n}. Per niente. Bellissimo.', 'Fila finita. Qualcuno ha pure comprato.'], vuota: ['La fila ero io. Da solo. Mi sono superato.'] },
    esibisci: { chiede: ['Vieni a sentire {logg}? Gratis. Per ora.', 'Faccio {logg} {aposto}. Porta qualcuno.'], via: ['Silenzio! Comincio. Anche se parlate.', 'Signore e signori! E Gino.'], fine: ['Applausi? Applausi! Basta anche uno.', '{n} persone. Domani faccio il bis. Venite.'], vuota: ['Pubblico zero. Ho fatto le prove generali.'] },
    protesta: { chiede: ['Ci sediamo {aposto} {motivo}. Vieni?', 'Protesta {motivo}. Porta il cartello.'], via: ['Noi da qui non ci muoviamo! Fino alle sei.', 'Siamo qui {motivo}! E per la merenda.'], fine: ['Abbiamo protestato in {n}. Un record.', 'Domani ritorniamo. Il cartello lo tengo io.'], vuota: ['Protesta da solo. Almeno nessuno mi contraddice.'] },
    corteo: { chiede: ['Facciamo la processione. Il santo lo troviamo.', 'Si parte {aposto}, si arriva dove capita.'], via: ['In fila per due! Chi canta stona meno.', 'Avanti piano. Il santo è fragile.'], fine: ['Arrivati! Il santo non ha detto niente. Buon segno.', 'In {n} fino in fondo. Nessuno sapeva il perché.'], vuota: ['Processione di uno. Il santo ero io.'] },
    dipingi: { chiede: ['Stanotte dipingiamo {aposto}. Tu fai il palo.', 'Ho un\'idea per il muro. Ti serve una giacca scura.'], via: ['Guarda la strada. Se fischio, scappa tu.', 'Prima il contorno. Poi preghiamo.'], fine: ['Fatto. «{testo}». Domani lo vede tutta la città.', 'Firmato. Cioè no, non firmato. Non sono scemo.'], vuota: ['Il muro è venuto storto. Come me.'] },
    colletta: { chiede: ['Una lira per {benef}. Due, se ti vede.', 'Facciamo la colletta per {benef}. Metti qualcosa.'], via: ['Nel cappello! Il cappello è mio, i soldi no.', 'Chi dà poco, dà. Chi non dà, lo scrivo.'], fine: ['Fanno {soldi} per {benef}. Non ho tenuto niente.', '{soldi}! {benef} piangerà. Di gioia, spero.'], vuota: ['Colletta: zero. La gente è povera o tirchia.'] },
    pesca: { chiede: ['Vieni a pescare? Io pesco, tu tieni la lampada.', 'Stanotte abboccano. Me l\'ha detto un pesce.'], via: ['Zitti. I pesci sentono.', 'Lenza in acqua. Ora si aspetta. Tanto.'], fine: ['Preso! Non è grosso, ma è mio.', 'Pesce per cena. Il primo da martedì.'], vuota: ['Niente. I pesci oggi sono in ferie.'] },
    raccogli: { chiede: ['Vieni a raccogliere {logg}? Divido a metà.', 'Mi dai una mano? Ti do {unogg} per il disturbo.'], via: ['Tu da quella parte. Io sto qui a guardare.', 'Piano, che i Grigi ci contano pure gli alberi.'], fine: ['Fatto. A casa c\'è roba per un po\'.', 'Piena la sacca. La schiena meno.'], vuota: ['Non c\'era niente. Tutti più svelti di me.'] },
    fabbrica: { chiede: ['Faccio {unogg} con le mie mani. Guarda e impara.', 'Mi tieni ferma la roba? Faccio {unogg}.'], via: ['Allora. Le istruzioni non ci sono. Bene.', 'Se esplode, non ero io.'], fine: ['Fatto! {Logg} funziona. Più o meno.', 'Guarda che roba. L\'ho fatto io. Quasi.'], vuota: ['Non è venuto. Ma ho imparato cosa non fare.'] },
    costruisci: { chiede: ['Domani tiro su {logg} nel bosco. Mi aiuti?', 'Mi faccio {unogg} nel bosco. Lontano da mia madre.'], via: ['Qui. Il posto è perfetto. Non chiedetemi perché.', 'Picchetti giù. Da oggi qui comando io.'], fine: ['Finito! {Logg} è mio. Il bosco pure.', 'Guarda: {logg}. Niente affitto, niente Grigi.'], vuota: ['Si è storto tutto. Lo chiamo stile.'] },
    tavolata: { chiede: ['Stasera si mangia in strada. Porta qualcosa.', 'Tavolata {aposto}. Chi non porta niente lava.'], via: ['Sedetevi! Le sedie le restituiamo domani.', 'Chi ha portato il pane? Nessuno? Classico.'], fine: ['Abbiamo mangiato in {n}. Il vicino ha guardato.', 'Tavolata finita. Ci siamo voluti bene un\'ora.'], vuota: ['Nessuno ha portato niente. Abbiamo mangiato l\'aria.'] },
    tesoro: { chiede: ['Ho nascosto {unogg}. Chi trova il tesoro se lo tiene.', 'Caccia al tesoro! Il tesoro è vero. Piccolo.'], via: ['Cercate! Acqua… acqua… mare.', 'Non vi dico dov\'è. Ma è qui vicino.'], fine: ['L\'ha trovato {vinc}! Era sotto il suo naso.', '{vinc} ha trovato {logg}. Ora piango io.'], vuota: ['Nessuno l\'ha cercato. Me lo ritrovo io.'] },
    baratto: { chiede: ['Porta una cosa tua, te ne porti una mia.', 'Mercatino del baratto. Niente soldi, solo fregature.'], via: ['Io do questo, tu dai quello. Non guardare.', 'Si scambia! Le pistole no, eh.'], fine: ['Fatti {n} scambi. Tutti fregati, tutti contenti.', 'Ho dato una cosa brutta e ne ho presa una peggio.'], vuota: ['Nessuno scambia. Ognuno si tiene la sua roba.'] },
    tuffo: { chiede: ['Tuffo in mare. Adesso. A dicembre.', 'Chi si tuffa è un uomo. Chi no, è furbo.'], via: ['Al tre! …Io dopo, ho il cuore debole.', 'L\'acqua è calda! Bugia. Tuffati.'], fine: ['Gelata! La sento ancora nelle ossa.', 'Ci siamo tuffati in {n}. Ne è uscito uno col naso rosso.'], vuota: ['Mi sono tuffato da solo. Nessuno ha visto. Meglio.'] },
    offri: { chiede: ['Vieni, offro io. Oggi ho vinto.', 'Un bicchiere? Pago io. Prima che cambi idea.'], via: ['Barista! Per tutti. Tranne per lui.', 'Bevete, che domani torno povero.'], fine: ['Ho offerto {n} bicchieri. Ora mi volete bene.', 'Finiti i soldi. Finiti gli amici, vedrai.'], vuota: ['Offro io e nessuno beve. Che città.'] },
    regala: { chiede: ['Ti porto {logg}. Non dire niente.'], via: ['Tieni. Non è niente. Cioè, è {unogg}.'], fine: ['Ecco {logg}. Ricordatelo quando fai testamento.', '{Logg} per te. Me ne avanzava.'], vuota: ['Niente regalo. L\'ho usato io.'] },
  };
  Object.values(LV).forEach(B => Object.keys(B).forEach(k => { B[k] = B[k].map(s => s.replace(/\{Ogg\}/g, '{ogg}').replace(/\{Logg\}/g, '{logg}')); }));
  const capT = s => s.replace(/(^|[.!?] )([a-zà-ù])/g, (m, a, b) => a + b.toUpperCase());
  { const f0 = fill; }
  const SCRITTE = ['VIETATO SBADIGLIARE', 'QUI NON SUCCEDE NIENTE', 'IL GARANTE HA FREDDO', 'PANCHINA OCCUPATA', 'ATTENTI AL MURO', 'DA QUI SI VEDE IL MARE', 'CHI LEGGE È SCEMO', 'IL PORTO È NOSTRO'];
  const L_BIS = { presta: ['Mi presti {ogg}? Stasera torna a casa tua.', 'Mi serve {ogg}. Stasera è di nuovo tuo, giuro.'], prestaSi: ['Tieni. Se si rompe, ne compri due.', 'Tieni. È di mio cognato, quindi è mio.', 'Va bene. Ma lo rivoglio pulito.'] };
  const L_MURI = {
    crossa: ['{aka} dei {crew}. Adesso c\'è il mio sopra.', 'Così imparano, i {crew}.', 'Il muro era loro. Era.'],
    crossaW: ['Oh, quello lo ammazzano.', 'Domani qui scoppia la guerra.', 'Ma è il pezzo di quelli là! Sei matto?'],
    ripassa: ['Lo ripasso più grosso. Che lo vedano.', 'Me l\'hanno cancellato? Lo rifaccio doppio.', 'Questo muro è mio. Lo dice la vernice.'],
    ripassaW: ['Ancora tu? Ma non dormi mai?', 'Ieri non c\'era. Domani chissà.', 'Bello. Il mio palazzo però no.'],
    omaggio: ['Questo è per lui. Finché non esce.', 'Che lo vedano passando. Lui e i Grigi.'],
    pulisce: ['Ogni giorno lo stesso muro. Ogni giorno.', 'Solvente. Il mio profumo da vent\'anni.', 'Lo cancello io, lo rifanno loro. Lavoriamo tutti.'],
    puliscW: ['Era bello. Ora è grigio. Come voi.', 'Tanto stanotte torna.', 'Pulite pure. Si vede lo stesso.'],
  };
  // ---------------- I 25 ESTRI SCRITTI (gli atomi fissati; le battute loro) ----------------
  const ESTRI_L = [
    { id: 'capra', nome: 'la lotteria della capra', atomi: { verbo: 'lotteria', ogg: 'capi', posti: ['piazza', 'fontana', 'calata'] },
      chiede: ['Mille lire e magari vinci una capra. Vera.', 'Lotteria della capra. Il biglietto lo vendo io.'], si: ['Una capra? Ci sto. Dove la metto, poi, è un problema mio.'], no: ['Una capra in casa? Mia moglie mi uccide.'],
      via: ['Biglietti! La capra guarda, la capra giudica.'], fine: ['La capra è di {vinc}! Auguri. Mangia tutto.', '{vinc} vince la capra. Io perdo una capra.'], dopo: ['Ho vinto una capra. Ora che faccio?'], vuota: ['Nessun biglietto. La capra resta a me. Contenta lei.'] },
    { id: 'fontana', nome: 'la fontana dipinta', atomi: { verbo: 'dipingi', ogg: 'fontana', posti: ['fontana'], notte: true },
      chiede: ['Stanotte la fontana la facciamo rosa. Ci stai?'], si: ['Rosa no. Arancione. Ci sto.'], no: ['La fontana? È di San Rocco. Mi fulmina.'], via: ['Tu guarda se arrivano. Io dipingo il santo.'],
      fine: ['Fatto. Domani tutti a bere acqua a colori.'], dopo: ['Il Garante passa domattina. Voglio esserci.'], grigio: ['La fontana! Chi è stato?! Tu, col pennello in mano?'] },
    { id: 'fila', nome: 'la fila per niente', atomi: { verbo: 'fila', niente: true, posti: ['wu', 'piazza', 'fiori'] },
      chiede: ['Mettiti in fila dietro di me. Non chiedere.', 'Fai la fila con me? Vediamo quanti vengono.'], si: ['Per cosa è la fila? Va be\', ci sto.'], no: ['Sono stato in fila alla posta tutta la mattina. Basta.'],
      via: ['Sono il primo! Il primo di niente, ma il primo.'], fine: ['Fila per niente: eravamo {n}. Domani il doppio.', 'Ognuno pensava che sapesse l\'altro. Nessuno sapeva.'], dopo: ['Per cosa era la fila? Non importa, c\'ero.'] },
    { id: 'carrelli', nome: 'la corsa delle carriole', atomi: { verbo: 'gara', ogg: 'carriola', posti: ['piazza', 'lungomare', 'calata'] },
      chiede: ['Gara di carriole. Tu dentro, io spingo. Poi cambiamo.', 'Hai la carriola? Allora sei in gara.'], si: ['Spingo io. Tu sei leggero ma piangi.'], no: ['La carriola serve per il lavoro. Il lavoro no.'],
      via: ['Carriole in fila! Chi si ribalta paga da bere.'], fine: ['Ha vinto {vinc}! La carriola fuma.', 'Primo {vinc}. {perde} ha perso una ruota e la dignità.'], dopo: ['Giovedì la rifacciamo. Con le curve.'] },
    { id: 'lampara', nome: 'la pesca di notte con la lampada', atomi: { verbo: 'pesca', notte: true, posti: P_PESCA.slice(0, 6) },
      chiede: ['Stanotte si pesca con la lampada. Tu tieni la luce.'], si: ['Tengo la luce. Ma se cadi in acqua, io scappo.'], no: ['Di notte dormo. Anche i pesci, credo.'],
      via: ['La luce sull\'acqua. Zitti, che arrivano.'], fine: ['Preso! Con la lampada fatta da me. Doppia vittoria.'], dopo: ['Domani si mangia pesce. Se lo cucini tu.'] },
    { id: 'vista', nome: 'la vendita della vista sul mare', atomi: { verbo: 'vendi', ogg: 'vista', posti: ['belvedere', 'lungomare', 'molo'] },
      chiede: ['Mille lire e ti faccio guardare il mare. Dal posto buono.'], si: ['Mille lire per il mare? Va bene, ma lo guardo bene.'], no: ['Il mare lo vedo gratis da casa. Quasi.'],
      via: ['Avanti! Mare vero, onde comprese.'], fine: ['Ho venduto il mare a {n} persone. Il mare non lo sa.'], vuota: ['Nessuno vuole il mare. Me lo guardo io.'], dopo: ['Ho pagato per guardare il mare. Mi sento scemo e ricco.'] },
    { id: 'panchina', nome: 'la protesta per la panchina', atomi: { verbo: 'protesta', ogg: 'panchina', posti: ['giardini', 'fontana', 'piazzetta'] },
      chiede: ['Hanno tolto la panchina. Ci sediamo per terra, in protesta.'], si: ['Per la panchina ci sto. Mi siedo da trent\'anni lì.'], no: ['Mi siedo per terra e non mi rialzo più.'],
      via: ['Ridateci la panchina! Il sedere è nostro!'], fine: ['Seduti per terra in {n}. La panchina non è tornata.'], dopo: ['Domani portiamo le sedie. Da casa. Per protesta.'], grigio: ['Per terra non si sta. Su, in piedi. È un ordine.'] },
    { id: 'serenata', nome: 'la serenata', atomi: { verbo: 'esibisci', ogg: 'serenata', notte: true },
      chiede: ['Vieni con me sotto casa di {ber}? Tu reggi la chitarra.'], si: ['Reggo la chitarra. Se tirano l\'acqua, la prendi tu.'], no: ['L\'ultima volta il padre aveva il fucile.'],
      via: ['{ber}! Affacciati! È per te! …Sono io!'], fine: ['Si è affacciata! O era la nonna. Era la nonna.', 'Fatto. Il resto lo decide il destino. E la finestra.'], dopo: ['Ha cantato male, ma con coraggio.'] },
    { id: 'processione', nome: 'la processione finta', atomi: { verbo: 'corteo', ogg: 'santo', posti: ['piazza', 'fontana', 'piazzetta'] },
      chiede: ['Facciamo la processione. Il santo lo faccio io.'], si: ['Ci sto. Io faccio la banda, con la bocca.'], no: ['Mi becca il prete e mi scomunica a rate.'],
      via: ['Avanti piano! Il santo ha la gamba di legno.'], fine: ['Arrivati! Nessun miracolo. Però la gente ha applaudito.'], dopo: ['Era una processione? Mi sono fatto il segno lo stesso.'] },
    { id: 'scopa', nome: 'il torneo di scopa in piazza', atomi: { verbo: 'gioca', ogg: 'carte', posti: ['piazza', 'osteria', 'bar'] },
      chiede: ['Torneo di scopa. Iscrizione: la tua dignità.'], si: ['Ci sto. Le carte le guardo io prima.'], no: ['Con te? Bari pure quando dormi.'], via: ['Settebello a me. Lo dico per abitudine.'],
      fine: ['Ho vinto tutte le mani. Non guardate le maniche.'], dopo: ['Ha barato. Ma bene, con stile.'] },
    { id: 'comizio', nome: 'il comizio sulla cassetta', atomi: { verbo: 'esibisci', ogg: 'comizio', posti: ['piazza', 'calata', 'fontana'] },
      chiede: ['Faccio un comizio sulla cassetta. Vieni ad applaudire.'], si: ['Applaudo. Se arrivano i Grigi, smetto per primo.'], no: ['Comizio? Io ho famiglia. E paura.'],
      via: ['Cittadini! …Cittadini? Tre cittadini. Mi accontento.'], fine: ['Mi hanno ascoltato in {n}. Uno ha capito.'], dopo: ['Ha ragione lui. Ma piano, che sentono.'], grigio: ['Giù dalla cassetta. Anche la cassetta è sequestrata.'] },
    { id: 'baratto', nome: 'il mercatino del baratto', atomi: { verbo: 'baratto', posti: ['piazza', 'fiori', 'calata'] },
      chiede: ['Porta una cosa che non ti serve. Te ne do una peggio.'], si: ['Ho proprio una cosa inutile. Ci sto.'], no: ['La mia roba è mia. Anche quella rotta.'],
      via: ['Si scambia! Senza soldi, senza vergogna.'], fine: ['{n} scambi! Ho dato una cosa brutta, ne ho una bruttissima.'], dopo: ['Ci ho guadagnato. Credo. Non so cos\'è.'] },
    { id: 'tuffo', nome: 'il tuffo di dicembre', atomi: { verbo: 'tuffo', posti: ['molo', 'spiaggia', 'caletta'] },
      chiede: ['Tuffo in mare. Ora. Chi non viene è un pollo.'], si: ['Mi tuffo. Ma tu prima.'], no: ['Mi sono lavato ieri. Basta acqua.'], via: ['Al tre! Uno… due… …Vai tu, io tengo i vestiti.'],
      fine: ['Fredda! Fredda! Ho visto mia nonna! È viva!'], dopo: ['Domani tutti a letto col brodo. Ne valeva la pena.'] },
    { id: 'tavolata', nome: 'la tavolata nel vico', atomi: { verbo: 'tavolata', posti: ['vico', 'caruggio', 'piazzetta'] },
      chiede: ['Stasera tutti a mangiare in strada. Porta il tuo.'], si: ['Porto io. Una cosa piccola, eh.'], no: ['In strada? Con quello che passa?'],
      via: ['Tavola lunga! Chi siede in fondo paga il vino.'], fine: ['Abbiamo mangiato in {n}. Il vico non era mai stato così buono.'], dopo: ['Mi sono seduto vicino a uno che odio. Era simpatico.'] },
    { id: 'pentole', nome: 'il concerto di pentole', atomi: { verbo: 'esibisci', ogg: 'pentole', posti: ['vico', 'piazzetta', 'caruggio'] },
      chiede: ['Concerto di pentole. Porta il coperchio.'], si: ['Porto due coperchi. Sono un solista.'], no: ['Le pentole servono per il sugo, non per la musica.'],
      via: ['Uno, due, uno due tre! BANG!'], fine: ['Che concerto! Un vicino ha urlato. Successo.'], dopo: ['Ho mal di testa, ma era arte.'] },
    { id: 'ritratti', nome: 'i ritratti a mille lire', atomi: { verbo: 'vendi', ogg: 'ritratto', posti: ['piazza', 'lungomare', 'fontana'] },
      chiede: ['Ti faccio il ritratto. Mille lire. Ti faccio più bello.'], si: ['Più bello? Allora sono mille spese bene.'], no: ['Non mi piace come sono. Neanche disegnato.'],
      via: ['Fermo. Più fermo. Non respirare.'], fine: ['{n} ritratti! Sembrano tutti mio zio, ma vendono.'], vuota: ['Nessuno vuole il ritratto. Mi faccio un autoritratto.'], dopo: ['Mi ha fatto col naso storto. È uguale.'] },
    { id: 'colletta', nome: 'la colletta di quartiere', atomi: { verbo: 'colletta', posti: ['piazza', 'osteria', 'chiesa'] },
      chiede: ['Una cosa per {benef}. Mettici quello che puoi.'], si: ['Metto. Ma scrivi il mio nome grande.'], no: ['Io ho già dato. L\'anno scorso.'], via: ['Nel cappello! Qualsiasi cosa. Anche le monete straniere.'],
      fine: ['{soldi} per {benef}. Il quartiere c\'è.'], dopo: ['Ho messo mille lire. Mi sento un santo per una settimana.'] },
    { id: 'aria', nome: 'l\'aria di mare in barattolo', atomi: { verbo: 'vendi', ogg: 'aria', posti: ['calata', 'fiori', 'piazza'] },
      chiede: ['Aria di mare in barattolo. Per quando sei triste.'], si: ['Un barattolo. Per mia suocera, che il mare non lo vede.'], no: ['L\'aria la respiro gratis. Ancora.'],
      via: ['Aria vera! Del molo! Senza il puzzo di gasolio.'], fine: ['Venduta l\'aria! {soldi}. Domani vendo il tramonto.'], vuota: ['Niente. Mi tengo l\'aria. La respiro io.'] },
    { id: 'tesoro', nome: 'la caccia al tesoro', atomi: { verbo: 'tesoro', posti: ['giardini', 'piazza', 'spiaggia'] },
      chiede: ['Ho nascosto una cosa. Chi la trova se la tiene.'], si: ['Cosa? Non importa. Ci sto.'], no: ['L\'ultima volta era un calzino.'],
      via: ['Cercate! Fuochino… fuocherello… niente.'], fine: ['L\'ha trovato {vinc}! Era dove non guardavo io.'], dopo: ['Ho trovato una cosa. Non so se era il tesoro.'] },
    { id: 'barca', nome: 'il battesimo della barca', atomi: { verbo: 'offri', posti: ['calata', 'marina', 'molo'] },
      chiede: ['Battezzo la barca. Si beve per lei. Pago io.'], si: ['Per la barca bevo volentieri. Anche due volte.'], no: ['La barca galleggia anche senza di me.'],
      via: ['Alla barca! Che non affondi. Almeno oggi.'], fine: ['Ho offerto {n} bicchieri. La barca è contenta. Io meno.'] },
    { id: 'bugie', nome: 'la gara di bugie all\'osteria', atomi: { verbo: 'esibisci', ogg: 'bugie', posti: ['osteria', 'bar', 'sirena'] },
      chiede: ['Gara di bugie. Chi la spara più grossa vince.'], si: ['Ho vinto già tre volte. Questa è la prima bugia.'], no: ['Io non dico bugie. Questa è la seconda.'],
      via: ['Comincio io: una volta ho lavorato.'], fine: ['Ha vinto uno che giura di aver visto il Garante ridere.'], dopo: ['Ha vinto con una vera. Nessuno se n\'è accorto.'] },
    { id: 'cartello', nome: 'il cartello falso', atomi: { verbo: 'dipingi', ogg: 'cartello', notte: true, posti: ['piazzetta', 'calata', 'vico'] },
      chiede: ['Facciamo un cartello finto: «Vietato sbadigliare».'], si: ['Lo scrivo io. Ho la calligrafia da ministero.'], no: ['Mi riconoscono dalla calligrafia.'],
      via: ['Lettere dritte. Deve sembrare vero.'], fine: ['Fatto. Domani i Grigi lo faranno rispettare.'], dopo: ['Ho visto uno trattenere lo sbadiglio. Ha funzionato.'] },
    { id: 'garante', nome: 'l\'imitazione del Garante', atomi: { verbo: 'esibisci', ogg: 'imitazione', posti: ['osteria', 'piazzetta', 'calata'] },
      chiede: ['Faccio il Garante. Con la voce. Vieni a ridere piano.'], si: ['Rido piano. Rido fortissimo, ma piano.'], no: ['Per una risata ci danno dieci anni.'],
      via: ['«Cittadini! Il mare è nostro. Il pesce è mio.»'], fine: ['{n} persone hanno riso. Una ha preso appunti.'], dopo: ['Uguale! Anche il naso.'], grigio: ['Chi faceva il Garante? Il Garante non si fa.'] },
    { id: 'falo', nome: 'il fuoco nel bosco', atomi: { verbo: 'costruisci', ogg: 'falo', posti: P_BOSCO },
      chiede: ['Facciamo un fuoco nel bosco. Le pietre le porti tu.'], si: ['Porto le pietre. E le castagne, se ne trovo.'], no: ['Nel bosco di notte ci sono le bestie. E i Grigi.'],
      via: ['Le pietre in cerchio. Il cerchio è importante.'], fine: ['Il fuoco c\'è! Fatto da noi. Il bosco ringrazia. Forse.'], dopo: ['Ci torniamo domani. Il fuoco ci aspetta.'] },
    { id: 'vedova', nome: 'la legna per la vedova', atomi: { verbo: 'raccogli', ogg: 'legna', posti: P_BOSCO },
      chiede: ['Andiamo a far legna. Per la vedova del terzo piano.'], si: ['Per lei sì. Ha fatto i biscotti a mio padre nel \'60.'], no: ['La legna è pesante. Anche la vedova, dicono.'],
      via: ['Taglia tu. Io conto i fasci.'], fine: ['Legna fatta. Ora non ha più freddo. Noi sì.'], dopo: ['Mi ha dato un biscotto. Del \'60.'] },
  ];
  const ESTRI_BY = {}; ESTRI_L.forEach(X => { ESTRI_BY[X.id] = X; });
  Iniziative.ESTRI = ESTRI_L; Iniziative.LV = LV; Iniziative.BANCHE = { L_SI, L_NO, L_NO_LAVORO, L_STRANO, L_DOPO, L_DOPO_VUOTA, L_GRIGIO, L_GRIGIO_R, L_PRETE, L_BUCA, L_BUCA_R, L_RIVINCITA, L_RIVINCITA_R, L_SFIDA, L_SFIDA_R, L_BIS, L_MURI };
})();
