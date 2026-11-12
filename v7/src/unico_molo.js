/* [unico] unico_molo.js: LA MATTINA SUL MOLO, passo 7 (progetto: commedia/SISTEMA_UNICO.md §8.1-8.2, §10 riga 7).
   Dietro ?commedia, e solo con &molo nell'indirizzo (la tappa: banco/molo_pw.js la apre così). Senza: UnicoMolo = { ON: false } o
   { ON: true, attiva: false } e nient'altro (nessuna fase che tocchi la partita).

   LA SCENA (§8.1). Dal secondo giorno, la prima volta che l'orologio passa le 6:00 (fino alle 12:30), si scelgono venti abitanti con
   la Mente, per mestiere e per carattere, e si mandano a passare la mattina fra molo, calata, marina, scalo e pontile: un blocco della
   giornata di popolo (come le urgenze di popolo: «la mattina al porto», fino alle 12:30, poi a casa). Il resto della giornata resta
   quello di popolo. Ognuno ha in tasca quello che il suo ruolo usa (la canna del pescatore, le assi del falegname, la bomboletta del
   writer, qualche soldo per chi fa la spesa); il debitore ha un prestito vero (Verbo «presta», la stessa porta di tutti). Poi
   decide la Mente, coi soli verbi del catalogo: la scena non scrive nessun fatto da sé e non sceglie gli obiettivi.
     4 pescatori · 2 bottegai (restano al banco: il loro lavoro è lì vicino) · 3 clienti · 1 falegname · 2 di casa (la coppia) ·
     2 vicini · 1 debitore e 1 creditore · 2 della banda · 1 writer · 1 anziano
   Chi manca per un ruolo (nessun pescatore libero, nessuna coppia) si prende fra gli altri abitanti, sempre con la Mente.
   Lo stato è puro, in st.u.molo: { giorno, t, ruoli: { id: ruolo } }. Deterministico: la scelta va per hash (seme, id), non a caso. */
var UnicoMolo = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UM = { ON, attiva: false };
  if (typeof module !== 'undefined' && module.exports) module.exports = UM;
  if (!ON) return UM;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const MU = () => (typeof MenteUnica !== 'undefined' && MenteUnica.ON ? MenteUnica : typeof Mente !== 'undefined' && Mente.ON && Mente.OBIETTIVI ? Mente : null);   // in Node le prove la chiamano Mente
  if (!G || !Un() || !MU()) { UM.ON = false; return UM; }
  UM.attiva = typeof location !== 'undefined' && /[?&]molo\b/.test(location.search);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const hyp = Math.hypot;
  const CFG = UM.CFG = { da: 6 * 60, a: 12 * 60 + 30, giorno: 1, raggio: 260, ogni: 120 };
  const hashS = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
  // i ruoli: quanti, chi va bene (prima scelta), dove passa la mattina, cosa ha in tasca, l'«act» del blocco (sposta gli obiettivi, ORARIO)
  const lav = n => { const J = n.pop && n.pop.job; return J ? String(J.title || J.base || '') : ''; };
  const RUOLI = [
    { k: 'pescatore', q: 4, ok: n => /pescat/i.test(lav(n)) || (n.pop.intW && n.pop.intW.pesca > .55), dove: ['pesca_molo_vecchio', 'pesca_pontile', 'pesca_pontile_centro', 'molo'], tasca: { canna: 1 }, act: 'svago' },
    { k: 'bottegaio', q: 2, ok: (n, st) => !!bottegaVicina(st, n), dove: null, tasca: {}, act: null },
    { k: 'cliente', q: 3, ok: n => !lav(n) || n.pop.status === 'pensionato', dove: ['calata', 'marina'], tasca: { soldi: 25 }, act: 'mercato' },
    { k: 'falegname', q: 1, ok: n => /falegn|carpentier/i.test(lav(n)), dove: ['scalo'], tasca: { assi: 2, chiodi: 4, martello: 1 }, act: 'svago' },
    { k: 'casa', q: 2, ok: n => !!n.pop.hh, dove: ['calata'], tasca: { soldi: 40 }, act: 'svago', coppia: true },
    { k: 'vicino', q: 2, ok: n => (n.tr && n.tr.loq > .55), dove: ['marina', 'calata'], tasca: {}, act: 'svago' },
    { k: 'creditore', q: 1, ok: n => (n.pop.money || 0) >= 40, dove: ['molo'], tasca: { soldi: 20 }, act: 'svago' },
    { k: 'debitore', q: 1, ok: n => (n.pop.money || 0) < 40, dove: ['pontile'], tasca: {}, act: 'svago' },
    { k: 'banda', q: 2, ok: n => !!(n.ris && n.ris.member && n.ris.auto !== false), dove: ['molo'], tasca: { assi: 2 }, act: 'svago' },
    { k: 'writer', q: 1, ok: n => !!(n.pop.writer || (n.pop.intW && n.pop.intW.arte > .6)), dove: ['calata'], tasca: { bomboletta: 1 }, act: 'svago' },
    { k: 'anziano', q: 1, ok: n => (n.pop.age || 0) >= 65 || n.pop.status === 'pensionato', dove: ['molo'], tasca: {}, act: 'svago' },
  ];
  const centro = () => G.PLACES.calata || G.PLACES.molo;
  function bottegaVicina(st, n) {
    const J = n.pop && n.pop.job, t = J && J.t, C = centro(); if (!t || !C) return null;
    return hyp(t.x - C.x, t.y - C.y) < 70 ? t : null;
  }
  const S = st => (st.u ? st.u.molo || null : null);
  // la scelta dei venti: per ruolo, i più vicini al porto fra quelli che vanno bene (a pari distanza decide l'hash), poi chi resta
  function scegli(st) {
    const M = MU(), C = centro(), presi = new Set(), ruoli = {};
    const cand = st.npcs.filter(n => M._.candidato(st, n) && n.pop && !n.pop.cast && hyp(n.x - C.x, n.y - C.y) < CFG.raggio && !(n.jailedUntil > st.t));
    const ord = L => L.map(n => [hyp(n.x - C.x, n.y - C.y) + hashS(st.u.seme + '|' + n.id) * 60, n]).sort((a, b) => a[0] - b[0] || (a[1].id < b[1].id ? -1 : 1)).map(x => x[1]);
    for (const R of RUOLI) {
      let L = ord(cand.filter(n => !presi.has(n.id) && R.ok(n, st)));
      if (R.coppia) {   // due della stessa casa
        const hh = {}; for (const n of L) (hh[n.pop.hh] = hh[n.pop.hh] || []).push(n);
        const due = Object.values(hh).find(x => x.length >= 2); L = due ? due.slice(0, 2) : L;
      }
      if (L.length < R.q && R.k !== 'bottegaio') L = L.concat(ord(cand.filter(n => !presi.has(n.id) && !L.includes(n) && !bottegaVicina(st, n))));
      for (const n of L.slice(0, R.q)) { presi.add(n.id); ruoli[n.id] = R.k; }
    }
    return ruoli;
  }
  // il blocco della mattina: come le urgenze di popolo (popolo.js, i bisogni), con il ritorno a casa alle 12:30
  function blocco(st, n, R, i) {
    const P = n.pop, Po = PO(); if (!P || !P.plan || !Po || !Po.target || !R.dove) return false;
    const m = Math.floor(((st.t % 1440) + 1440) % 1440), tgt = Po.target(R.dove[i % R.dove.length]); if (!tgt) return false;
    for (let j = P.plan.length - 1; j >= 0; j--) { const b = P.plan[j]; if (b.at >= m - 1 && b.at < CFG.a && b.act !== 'sonno') P.plan.splice(j, 1); }
    const nb = { at: m, tgt, act: R.act || 'svago', label: 'passa la mattina al porto', fixed: true, urge: true, molo: R.k };
    P.plan.push(nb);
    if (P.homeT) P.plan.push({ at: CFG.a, tgt: P.homeT, act: 'casa', label: 'torna a casa', urge: true });
    P.plan.sort((x, y) => x.at - y.at);
    if (P.curPlan === P.plan) P.curIdx = P.plan.indexOf(nb);
    return true;
  }
  function tasca(st, n, R) {
    const P = n.pop; P.inv = P.inv || {};
    for (const k in R.tasca) { if (k === 'soldi') P.money = (P.money || 0) + R.tasca[k]; else if (!(P.inv[k] >= R.tasca[k])) P.inv[k] = R.tasca[k]; }
  }
  function avvia(st) {
    const u = st.u; if (!u) return null;
    const ruoli = scegli(st), per = {};
    for (const id in ruoli) (per[ruoli[id]] = per[ruoli[id]] || []).push(id);
    let blocchi = 0;
    for (const R of RUOLI) (per[R.k] || []).forEach((id, i) => { const n = G.byId(st, id); if (!n) return; tasca(st, n, R); if (blocco(st, n, R, i)) blocchi++; const Mn = MU()._.menteDi(st, n, true); if (Mn) Mn.prossima = Math.min(Mn.prossima, st.t + 2 + i); });
    // il debito: un prestito vero, fatto ora dal creditore al debitore con la stessa porta di tutti (Verbo, strategia C)
    let prestito = null;
    const cr = (per.creditore || [])[0], de = (per.debitore || [])[0], V = typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null;
    if (cr && de && V && V.applica) { const nc = G.byId(st, cr); try { const r = V.applica(st, nc, 'presta', { chi: de, soldi: 12 }, { lod: 'lontano' }); prestito = r && r.ok ? r.fid : null; } catch (e) { prestito = null; } }
    u.molo = { giorno: Math.floor(st.t / 1440), t: Math.round(st.t * 10) / 10, ruoli, blocchi, prestito };
    UM.stats.avvii++;
    return u.molo;
  }
  UM.stats = { avvii: 0 };
  function fase(st) {
    if (!UM.attiva || !st.u || Un().passi % CFG.ogni !== 0) return;
    const g = Math.floor(st.t / 1440), m = st.t - g * 1440, s = S(st);
    if (g < CFG.giorno || m < CFG.da || m >= CFG.a || (s && s.giorno === g)) return;
    if (s) return;   // una volta sola per partita: la tappa
    avvia(st);
  }
  Un().fase('unico.molo', { dopo: 'unico.mente', budget: { p95: .01 } }, fase);
  Object.assign(UM, { CFG, RUOLI, avvia, scegli, ruoli: st => { const s = S(st); return s ? s.ruoli : null; } });
  Un().Molo = UM;
  return UM;
})();
if (typeof window !== 'undefined') window.UnicoMolo = UnicoMolo;
