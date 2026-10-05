/* Porto Vecchio — Il Coro: gli abitanti pensati per gruppi, per spendere poche chiamate all'IA.
   1. CASELLA: ogni personaggio ha una scheda sintetica (P.box) che il codice tiene aggiornata dal diario:
      umore, bisogni forti, cosa sa (le notizie che pesano), cosa pensa, il clima del suo gruppo.
   2. GRUPPI DI AFFINITÀ: la Famiglia, la Risacca, i Grigi, la malavita, i colleghi dello stesso posto di lavoro,
      e chi non lavora diviso per condizione e passione. Al massimo CFG.maxMembri per gruppo.
   3. LE VOCI: il passaggio delle notizie dentro il gruppo lo fa il codice, senza IA (chi è loquace racconta).
   4. LA NOTTE: una sola chiamata per gruppo (non una per persona). L'IA riceve le caselle, risponde con il clima
      del gruppo, una voce, qualche battuta per le chiacchiere di domani e un pensiero solo per pochi «specifici».
      La risposta ricade sul gruppo distribuita secondo lo stato di ognuno, e riscrive le caselle.
   Solo logica, nessuna grafica: lo usa mente.js; si prova in Node con test_coro.js. */
var Coro = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const PO = typeof Popolo !== 'undefined' ? Popolo : require('./popolo.js');

  const CFG = {
    maxMembri: 8,        // persone per gruppo (oltre si divide)
    maxSa: 4,            // notizie in una casella
    specifici: 3,        // per quanti del gruppo l'IA scrive un pensiero personale
    gruppiPerNotte: 6,   // chiamate IA per notte (le altre caselle le aggiorna solo il codice)
    voce: .35,           // quanto facilmente una notizia passa da uno all'altro del gruppo
    vociPerNotte: 2,     // notizie nuove che una persona può ricevere in una notte
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dayIdx = t => Math.floor(t / 1440);
  const live = n => n && !n.dead && n.pop && n.pop.ints;
  const cut = (s, k) => { s = String(s || ''); return s.length > k ? s.slice(0, k - 1) + '…' : s; };

  // ---------------- 1. LA CASELLA ----------------
  // quello che si sa: i ricordi che pesano o che parlano dei fatti della città (arresti, furti, Grigi…)
  const NOTIZIA = /arresto|fermato|furto|rissa|omicidio|lutto|scarsita|squalo|grigi|scritta|propaganda|risacca|famiglia|lavoro|offesa|lite|voce|radio/;
  const keyOf = e => e.key || `${e.tag || e.kind}:${e.who || ''}:${e.place || ''}:${dayIdx(e.t)}`;
  function umore(N) {
    if (N.paura > .6) return 'spaventato';
    if (N.rabbia > .6) return 'arrabbiato';
    if ((N.soldi || 0) > .6) return 'in pensiero per i soldi';
    if (N.sonno > .75) return 'stanco morto';
    if (N.compagnia > .7) return 'solo';
    if (N.svago > .75) return 'annoiato';
    return 'tranquillo';
  }
  const BISOGNI = { fame: 'fame', sonno: 'sonno', igiene: 'lavarsi', compagnia: 'compagnia', svago: 'svago', rabbia: 'rabbia', paura: 'paura', soldi: 'soldi' };
  function aggiorna(st, n) {
    const P = n.pop, N = P.need;
    const old = P.box || {};
    const seen = {};
    const sa = P.diary
      .filter(e => e.kind !== 'pensiero' && e.tag !== 'passo' && st.t - e.t < 4 * 1440 && (e.w >= .45 || NOTIZIA.test(e.tag || '')))
      .map(e => ({ k: keyOf(e), txt: e.text, t: e.t, w: e.w * Math.exp(-(st.t - e.t) / 4320), depth: e.depth || 0, from: e.from }))
      .sort((a, b) => b.w - a.w)
      .filter(f => !seen[f.k] && (seen[f.k] = true))
      .slice(0, CFG.maxSa);
    P.box = {
      u: umore(N),
      b: Object.keys(BISOGNI).filter(k => (N[k] || 0) > .55).sort((a, c) => N[c] - N[a]).slice(0, 3).map(k => BISOGNI[k]),
      sa,
      pensa: P.thoughts.length ? P.thoughts[P.thoughts.length - 1].text : '',
      clima: old.clima || '',
      battute: old.battute || [],
      grp: st.coro && st.coro.of[n.id] || old.grp || null,
      agg: st.t,
    };
    return P.box;
  }
  const mestiere = n => (n.pop.job && n.pop.job.title) || (n.pop.status && n.pop.status !== 'altro' ? n.pop.status : n.role) || '';
  // la casella in una riga, per il prompt: poche parole, niente oggetti grossi
  function riga(st, n) {
    const P = n.pop, B = P.box || aggiorna(st, n);
    const parti = [n.id, `${n.first || n.name}, ${P.age}, ${cut(mestiere(n), 40)}`, B.u];
    if (B.b.length) parti.push('bisogni: ' + B.b.join(', '));
    if (B.sa.length) parti.push('sa: ' + B.sa.map(f => cut(f.txt, 70)).join('; '));
    if (B.pensa) parti.push('pensa: ' + cut(B.pensa, 70));
    return parti.join(' | ');
  }

  // ---------------- 2. I GRUPPI DI AFFINITÀ ----------------
  // tre livelli di affinità, dal più stretto al più largo: se il gruppo stretto è troppo piccolo si passa al successivo
  function chiavi(n) {
    const P = n.pop;
    const k = P.ints[0] ? P.ints[0].k : 'chiacchiere', pass = PO.INTERESSI[k] || k;
    if (n.fam) return [['fam', 'uomini della Famiglia']];
    if (n.ris && n.ris.member) return [['ris', 'membri della Risacca']];
    if (n.cop) return [['grigi', 'Grigi della Tutela']];
    if (P.giro === 'orecchio') return [['orecchi', 'informatori degli Orecchi'], ['giro', 'gente del giro (borseggi, furti, ricettazione, soffiate)']];
    if (P.giro) return [['giro', 'gente del giro (borseggi, furti, ricettazione, soffiate)']];
    const cond = { disoccupato: 'disoccupati', pensionato: 'pensionati', casalinga: 'casalinghe' }[P.status];
    const out = [];
    if (P.job && P.job.t && P.job.t.label) out.push(['lav:' + P.job.t.label, `chi lavora a ${P.job.t.label}`], ['lavoratori:' + k, `lavoratori con la passione per ${pass}`]);
    else if (cond) out.push([`${P.status}:${k}`, `${cond} con la passione per ${pass}`], [P.status, cond]);
    out.push(['quartiere:' + k, `gente del quartiere con la passione per ${pass}`], ['quartiere', 'gente del quartiere']);
    return out;
  }
  // si rifanno una volta al giorno; i gruppi grandi si dividono in pezzi da CFG.maxMembri
  function gruppi(st) {
    const C = st.coro || (st.coro = { day: -1, list: [], byId: {}, of: {}, last: {} });
    const d = dayIdx(st.t);
    if (C.day === d && C.list.length) return C.list;
    // ognuno parte dal gruppo più stretto; chi resta in meno di 3 scende al livello più largo
    const MIN = 3, ppl = st.npcs.filter(live).map(n => ({ n, ks: chiavi(n), lv: 0 }));
    for (let pass = 0; pass < 4; pass++) {
      const cnt = {}; ppl.forEach(p => { const k = p.ks[p.lv][0]; cnt[k] = (cnt[k] || 0) + 1; });
      let moved = false; ppl.forEach(p => { if (cnt[p.ks[p.lv][0]] < MIN && p.lv < p.ks.length - 1) { p.lv++; moved = true; } });
      if (!moved) break;
    }
    const m = new Map();
    ppl.forEach(p => { const [k, label] = p.ks[p.lv]; if (!m.has(k)) m.set(k, { label, ids: [] }); m.get(k).ids.push(p.n.id); });
    C.list = []; C.byId = {}; C.of = {};
    m.forEach((g, k) => {
      g.ids.sort();
      for (let i = 0; i < g.ids.length; i += CFG.maxMembri) {
        const id = g.ids.length > CFG.maxMembri ? `${k}#${i / CFG.maxMembri + 1}` : k;
        const grp = { id, label: g.label, ids: g.ids.slice(i, i + CFG.maxMembri) };
        C.list.push(grp); C.byId[id] = grp;
        grp.ids.forEach(nid => { C.of[nid] = id; });
      }
    });
    C.day = d;
    return C.list;
  }
  const membri = (st, g) => g.ids.map(id => G.byId(st, id)).filter(live);
  function gruppoDi(st, n) { gruppi(st); const id = st.coro.of[n.id]; return id ? st.coro.byId[id] : null; }

  // ---------------- 3. LE VOCI (solo codice) ----------------
  // dentro il gruppo chi sa una cosa la racconta; chi è loquace la passa più volentieri.
  function diffondi(st, g, rnd) {
    rnd = rnd || Math.random;
    const ms = membri(st, g); if (ms.length < 2) return 0;
    const got = {}; let n = 0;
    ms.forEach(teller => {
      const loq = teller.tr && teller.tr.loq != null ? teller.tr.loq : .5;
      (teller.pop.box ? teller.pop.box.sa : []).forEach(f => {
        if (f.w < .2 || f.depth >= 2) return;   // le voci di terza mano si fermano
        ms.forEach(k => {
          if (k === teller || (got[k.id] || 0) >= CFG.vociPerNotte) return;
          if (k.pop.diary.some(e => keyOf(e) === f.k)) return;
          if (rnd() > CFG.voce * (.4 + loq)) return;
          PO.note(st, k, `${teller.first || teller.name} racconta: ${f.txt}`, 'info', { w: clamp(f.w * .7, .2, .6), tag: 'voce', key: f.k, depth: f.depth + 1, from: teller.id });
          got[k.id] = (got[k.id] || 0) + 1; n++;
        });
      });
    });
    return n;
  }

  // ---------------- 4. LA NOTTE: una chiamata per gruppo ----------------
  // chi conta di più nel gruppo: il cast, chi è vicino al giocatore, chi ha vissuto qualcosa di forte
  function peso(st, n) {
    const P = n.pop, N = P.need;
    const forte = P.diary.reduce((m, e) => st.t - e.t < 1440 ? Math.max(m, e.w) : m, 0);
    return (P.cast ? 2 : 0) + (P.near ? 1.5 : 0) + forte + Math.max(N.rabbia, N.paura);
  }
  // i gruppi da far pensare all'IA stanotte: i più «caldi», e chi non ci passa da più tempo
  function daChiamare(st, k) {
    const C = st.coro, list = gruppi(st);
    return list
      .map(g => { const ms = membri(st, g); return { g, s: ms.reduce((a, n) => a + peso(st, n), 0) / Math.max(1, ms.length) + Math.min(3, (st.t - (C.last[g.id] || -1e9)) / 1440) * .5 + ms.length * .15 }; })
      .filter(x => membri(st, x.g).length)
      .sort((a, b) => b.s - a.s)
      .slice(0, k == null ? CFG.gruppiPerNotte : k)
      .map(x => x.g);
  }
  // il prompt di sintesi: la situazione comune + le caselle in una riga ciascuna
  function richiesta(st, g) {
    const ms = membri(st, g);
    ms.forEach(n => aggiorna(st, n));
    const media = k => ms.reduce((a, n) => a + (n.pop.need[k] || 0), 0) / ms.length;
    const comuni = {}; ms.forEach(n => n.pop.box.sa.forEach(f => { comuni[f.k] = comuni[f.k] || { txt: f.txt, c: 0 }; comuni[f.k].c++; }));
    const spec = ms.slice().sort((a, b) => peso(st, b) - peso(st, a)).slice(0, CFG.specifici).map(n => n.id);
    return {
      gruppo: g.label,
      situazione: {
        ora: `${PO.wdName(st.t)} notte`,
        repressione: st.ris ? Math.round(st.ris.repr) : 0,
        bisogni_comuni: Object.keys(BISOGNI).filter(k => media(k) > .5).map(k => BISOGNI[k]),
        notizie_comuni: Object.values(comuni).filter(x => x.c >= 2).map(x => cut(x.txt, 80)).slice(0, 4),
      },
      membri: ms.map(n => riga(st, n)),
      specifici: spec,
    };
  }
  const num = v => clamp(Number(v) || 0, -.1, .1);
  // la risposta ricade sul gruppo: ognuno la prende secondo il suo stato, e la casella si riscrive
  function applica(st, g, r, rnd) {
    rnd = rnd || Math.random;
    if (!r || typeof r !== 'object') return 0;
    const ms = membri(st, g); if (!ms.length) return 0;
    const sing = r.singoli && typeof r.singoli === 'object' ? r.singoli : {};
    const battute = (Array.isArray(r.battute) ? r.battute : []).map(s => cut(String(s).trim(), 90)).filter(Boolean).slice(0, 6);
    const clima = cut(String(r.clima || '').trim(), 140), voce = cut(String(r.voce || '').trim(), 120);
    const dR = num(r.rabbia), dP = num(r.paura);
    let n = 0;
    ms.forEach(m => {
      const P = m.pop, N = P.need, s = sing[m.id] && typeof sing[m.id] === 'object' ? sing[m.id] : null;
      // il clima pesa di più su chi è già su quella strada (chi ha paura si spaventa di più)
      const kR = .5 + N.rabbia + (m.tr && m.tr.cor != null ? m.tr.cor * .3 : .15);
      const kP = .5 + N.paura + (m.tr && m.tr.legge != null ? m.tr.legge * .3 : .15);
      N.rabbia = clamp(N.rabbia + dR * kR + (s ? num(s.rabbia) : 0), 0, 1);
      N.paura = clamp(N.paura + dP * kP + (s ? num(s.paura) : 0), 0, 1);
      if (s && s.pensiero) {
        const text = cut(String(s.pensiero).trim(), 120);
        P.thoughts.push({ t: st.t, text }); if (P.thoughts.length > 6) P.thoughts.shift();
        PO.note(st, m, `ha pensato: ${text}`, 'pensiero', { w: .7 });
      }
      // la voce del gruppo la sente chi sta in compagnia o ha la lingua lunga
      const loq = m.tr && m.tr.loq != null ? m.tr.loq : .5;
      if (voce && rnd() < .35 + loq * .5) PO.note(st, m, `si dice: ${voce}`, 'info', { w: .35, tag: 'voce', key: `voce:${g.id}:${dayIdx(st.t)}`, depth: 1 });
      aggiorna(st, m);
      P.box.clima = clima; P.box.battute = battute.slice(); P.box.grp = g.id;
      n++;
    });
    st.coro.last[g.id] = st.t;
    return n;
  }
  // la notte senza IA: caselle aggiornate e voci passate. Restituisce i gruppi da mandare all'IA.
  function notte(st, rnd) {
    const list = gruppi(st);
    st.npcs.forEach(n => { if (live(n)) aggiorna(st, n); });
    let voci = 0; list.forEach(g => { voci += diffondi(st, g, rnd); });
    list.forEach(g => membri(st, g).forEach(n => aggiorna(st, n)));
    return { gruppi: daChiamare(st), voci };
  }
  // una battuta già pronta per le chiacchiere di giorno (nessuna chiamata): la toglie dalla casella
  function battuta(st, n) {
    const B = n.pop && n.pop.box; if (!B || !B.battute || !B.battute.length) return null;
    return B.battute.shift();
  }

  return { CFG, aggiorna, riga, gruppi, gruppoDi, membri, diffondi, daChiamare, richiesta, applica, notte, battuta, umore };
})();
if (typeof module !== 'undefined') module.exports = Coro;
