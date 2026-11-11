/* [unico] unico_sociali.js: I VERBI CHE MANCAVANO AL CATALOGO, passo 4 (progetto: commedia/SISTEMA_UNICO.md §3.2, §7.2, §10 riga 4).
   Dietro ?commedia. Spento il flag: UnicoSociali = { ON: false } e nient'altro.

   Cinque schede in più nel registro di Verbo (unico_verbi.js), con la stessa forma delle altre (solo dati: pre, eff, costo, posa,
   segno, tipo del fatto) e gli stessi termini; i termini nuovi sono pochi e puri, e leggono la memoria (Fatto), mai uno stato a parte:
     rendi                 rende a B la roba che B gli aveva dato (un fatto «dai» da B, non ancora reso): il fatto «restituito»
     chiacchiera           passa a B una diceria: un fatto vero che lui sa (l'ha fatto, l'ha visto, gliel'hanno detto) e B no.
                           Il fatto «chiacchiera» ha per causa il fatto raccontato (la catena di Vita.fatto, ×0,6), e x.di
     proponi_appuntamento  un'ora e un posto all'aperto; se tutti e due sono abitanti, Popolo.appoint (ci vanno davvero)
     rinfaccia             a chi ti deve dei soldi (Fatto.debito) o ti ha fatto un torto (Fatto.rancore ≥ .2): il fatto «rinfacciato»
     lavora                il turno: al posto di lavoro, nell'orario; la paga del mestiere (Popolo, migliaia di lire l'ora)
   Chi sa cosa (Sociali.sa) è una funzione pura sui fatti: è fra gli attori o i testimoni, o c'è una chiacchiera che gliel'ha detto.
   Le battute e le bolle di questi verbi le dà unico_segni.js (il segno, §7), dai fatti. */
var UnicoSociali = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Sociali = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sociali;
  if (!ON) return Sociali;
  const G = typeof Game !== 'undefined' ? Game : null;
  const V = typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null;
  const F = typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null;
  const AT = typeof Attore !== 'undefined' && Attore.ON ? Attore : null;
  if (!G || !V || !F || !AT) { Sociali.ON = false; return Sociali; }
  const LG = () => (typeof Lingua !== 'undefined' && Lingua.ON ? Lingua : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const hyp = Math.hypot, r1 = x => Math.round(x * 10) / 10;
  const val = V._.val;
  const CFG = Sociali.CFG = { dicGiorni: 2, dicScan: 500, dicPub: .3, lavoroR: 12, appMin: 30 };
  const NODICE = new Set(['chiacchiera', 'social', 'vai', 'entra', 'esce', 'mangia', 'beve', 'dorme', 'prende', 'posa', 'lavora', 'promemoria', 'ricordo']);
  const ESTERNI = ['fontana', 'piazza', 'molo', 'calata', 'lungomare', 'passeggiata', 'giardini', 'mercato', 'sagrato', 'pontile'];   // vita.js:675

  // ======================= CHI SA COSA (puro, sui fatti) =======================
  const io = id => (id === 'player' ? 'nino' : String(id));
  const attori = f => [f.chi].concat(f.con || []).filter(Boolean).map(io);
  function sentiteDa(st, id) {   // gli id dei fatti che a id hanno raccontato
    const out = new Set(); id = io(id);
    for (const g of F.per(st, { chi: id, tipo: 'chiacchiera' })) { if (g.esito === 'no' || io((g.con || [])[0]) !== id) continue; const d = g.x && g.x.di; if (d !== undefined && d !== null) out.add(+d); if (typeof g.causa === 'number') out.add(g.causa); }
    if (id === 'nino') for (const g of F.per(st, { chi: 'player', tipo: 'chiacchiera' })) { if (io((g.con || [])[0]) === 'nino' && g.x && g.x.di !== undefined) out.add(+g.x.di); }
    return out;
  }
  function sa(st, id, f, sentite) {
    if (!f) return false; id = io(id);
    if (attori(f).includes(id) || (f.test || []).map(io).includes(id)) return true;
    return (sentite || sentiteDa(st, id)).has(f.id);
  }
  // la diceria che a passa a b: il fatto più notevole e recente che a sa, b no, b non c'entra, non già detto da a a b
  function diceria(st, a, b) {
    a = io(a); b = io(b);
    const M = F._.M(st); if (!M) return null;
    const L = F._.inOrdine(M), t0 = st.t - CFG.dicGiorni * 1440, sa0 = sentiteDa(st, a), sb = sentiteDa(st, b);
    let best = null, bs = -1;
    for (let i = L.length - 1, k = 0; i >= 0 && k < CFG.dicScan; i--, k++) {
      const f = L[i]; if (f.t < t0) break;
      if (NODICE.has(f.v) || f.esito === 'no') continue;
      const at = attori(f); if (at.includes(b)) continue;
      const dentro = at.includes(a);
      if (!dentro && !(f.pub >= CFG.dicPub)) continue;
      if (!sa(st, a, f, sa0) || sa(st, b, f, sb)) continue;
      const s = (f.ril || .1) + (dentro ? .1 : 0) + (f.t - t0) / (CFG.dicGiorni * 1440) * .05;
      if (s > bs) { bs = s; best = f; }
    }
    return best;
  }

  // ======================= I DATI CHE SERVONO AI TERMINI =======================
  const nomeA = (st, id) => { const A = AT.di(st, id); return A ? A.nome : 'qualcuno'; };
  const nomeR = k => { const L = LG(); try { return L ? L.art(k, 'det') : String(k); } catch (e) { return String(k); } };
  // l'ora a parole: «alle cinque», «alle cinque e mezza», «all'una», «a mezzogiorno»; domani se è un altro giorno
  const NUMH = ['', 'una', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici'];
  function oraW(st, t) {
    const m = ((Math.round(t) % 1440) + 1440) % 1440, h = Math.floor(m / 60), mm = m % 60;
    let hh = h, coda = '';
    if (mm >= 45) { hh = (h + 1) % 24; coda = ' meno un quarto'; } else if (mm >= 25) coda = ' e mezza'; else if (mm >= 10) coda = ' e un quarto';
    const base = hh === 0 ? 'a mezzanotte' : hh === 12 ? 'a mezzogiorno' : hh % 12 === 1 ? "all'una" : 'alle ' + NUMH[hh % 12];
    const dd = st ? Math.floor(t / 1440) - Math.floor(st.t / 1440) : 0;
    return (dd === 1 ? 'domani ' : dd > 1 ? 'fra ' + dd + ' giorni ' : '') + base + coda;
  }
  // il posto di lavoro (Popolo: P.job.t per gli abitanti, st.me.job per Nino)
  function postoLavoro(st, A) {
    const Pp = PO(), I = Pp && Pp._;
    if (A.o && A.o.pop) { const J = A.o.pop.job; return J && J.t ? J.t : null; }
    const J = st.me && st.me.job; if (!J || !I) return null;
    try { return J.bi >= 0 ? I.tB(J.bi) : I.target(J.place); } catch (e) { return null; }
  }
  // l'appuntamento aperto fra due (un fatto «appuntamento» con l'ora davanti)
  function appAperto(st, a, b) {
    a = io(a); b = io(b);
    for (const f of F.per(st, { chi: a, tipo: 'appuntamento' })) { const at = attori(f), ora = f.x && typeof f.x.ora === 'number' ? f.x.ora : f.x && typeof f.x.t === 'number' ? f.x.t : null; if (f.esito !== 'no' && at.includes(b) && ora !== null && ora > st.t) return f; }
    return null;
  }

  // ======================= I CONTI (calcola) =======================
  const CALC = {
    rendi: (st, A, a, d) => {
      d.q = a.q || 1; if (a.chi === undefined || !a.cosa) return; const b = io(a.chi), me = io(A.id);
      let dati = 0, resi = 0;
      for (const f of F.per(st, { chi: me, tipo: 'dai' })) if (f.esito !== 'no' && io(f.chi) === b && io((f.con || [])[0]) === me && f.cosa === a.cosa) dati += f.q || 1;
      for (const f of F.per(st, { chi: me, tipo: 'restituito' })) if (f.esito !== 'no' && io(f.chi) === me && io((f.con || [])[0]) === b && f.cosa === a.cosa) resi += f.q || 1;
      d.prestati = Math.max(0, dati - resi);
    },
    chiacchiera: (st, A, a, d) => {
      if (a.chi === undefined) return;
      const f = a.di !== undefined && a.di !== null ? F.di(st, +a.di) : diceria(st, A.id, a.chi);
      d.f = f && sa(st, A.id, f) && !sa(st, a.chi, f) ? f : null; d.di = d.f ? d.f.id : null;
    },
    proponi_appuntamento: (st, A, a, d) => {
      if (a.chi === undefined) return;
      const oggi = Math.floor(st.t / 1440) * 1440, h = (st.t % 1440) / 60;
      d.ora = typeof a.ora === 'number' ? a.ora : h < 15 ? oggi + 17 * 60 : h < 19 ? Math.ceil((st.t + 120) / 30) * 30 : oggi + 1440 + 17 * 60;
      const P = G.PLACES || {}; let best = a.posto && P[a.posto] ? a.posto : null;
      if (!best) { let bd = 1e9; for (const k of ESTERNI) { const q = P[k]; if (!q) continue; const dd = hyp(q.x - A.x, q.y - A.y); if (dd < bd) { bd = dd; best = k; } } }
      d.posto = best; d.cosa = best; d.app = appAperto(st, A.id, a.chi);
    },
    rinfaccia: (st, A, a, d) => { if (a.chi === undefined) return; d.debito = r1(Math.max(0, F.debito(st, io(A.id), io(a.chi)))); d.rancore = F.rancore(st, io(A.id), io(a.chi)); },
    lavora: (st, A, a, d) => { const J = A.lavoro, ore = Math.max(.5, Math.min(8, +a.ore || 1)); d.ore = ore; d.min = ore * 60; d.paga = J ? r1((J.paga || 0) * ore) : 0; d.mestiere = J ? J.mestiere : null; d.cosa = d.mestiere; d.t = postoLavoro(st, A); },
  };

  // ======================= I TERMINI NUOVI (puri: '' oppure il perché) =======================
  Object.assign(V.COND, {
    prestato: (c, chi) => (c.d.prestati >= (c.d.q || 1) ? '' : `${nomeR(c.a.cosa)[0].toUpperCase() + nomeR(c.a.cosa).slice(1)} non è di ${nomeA(c.st, val(chi, c))}.`),
    diceria: c => (c.d.f ? '' : `${c.A.id === 'nino' ? 'Non hai' : c.A.nome + ' non ha'} niente da raccontare.`),
    ora_futura: c => (c.d.ora > c.st.t + CFG.appMin ? '' : 'È troppo presto.'),
    libero_app: (c, chi) => (c.d.app ? `Con ${nomeA(c.st, val(chi, c))} c'è già un appuntamento.` : c.d.posto ? '' : 'Dove?'),
    torto: (c, chi) => (c.d.debito > 0 || c.d.rancore >= .2 ? '' : `${nomeA(c.st, val(chi, c))} non ti deve niente.`),
    ha_lavoro: c => (c.A.lavoro ? '' : `${c.A.id === 'nino' ? 'Non hai' : c.A.nome + ' non ha'} un lavoro.`),
    in_orario: c => {
      const J = c.A.lavoro; if (!J) return 'Niente lavoro.'; const h = (c.st.t % 1440) / 60, a = J.inizio, b = J.fine;
      const dentro = a === undefined || b === undefined ? true : a <= b ? h >= a && h < b : h >= a || h < b;
      return dentro ? '' : `Non è l'orario: si lavora dalle ${a} alle ${b}.`;
    },
    al_lavoro: c => {
      const t = c.d.t, d = c.A.dove; if (!t) return 'Non si sa dove si lavora.';
      if (d.k === 'dentro' && t.k === 'b' && t.bi === d.b) return '';
      return hyp(c.A.x - t.x, c.A.y - t.y) <= CFG.lavoroR ? '' : 'Non sei al lavoro.';
    },
  });
  // ======================= GLI EFFETTI NUOVI (strategia A/C: sulle viste e sui dati) =======================
  Object.assign(V.EFF, {
    // la diceria non cambia i corpi: cambia chi sa cosa (il fatto stesso, con x.di e la causa)
    diceria: c => { c.r = { di: c.d.di, tipo: c.d.f ? c.d.f.v : null }; },
    appuntamento: (c, chi) => {
      const B = AT.di(c.st, val(chi, c)), Pp = PO(), I = Pp && Pp._;
      if (I && I.appoint && c.A.o && c.A.o.pop && B && B.o && B.o.pop && c.d.posto) { try { I.appoint(c.st, c.A.o, B.o, c.d.posto, c.d.ora, 'due chiacchiere'); } catch (e) { } }
      c.r = { ora: c.d.ora, posto: c.d.posto };
    },
    muso: (c, chi) => {
      const B = AT.di(c.st, val(chi, c)); if (B && B.o && B.o.op && c.A.id === 'nino') B.o.op.grudge = Math.min(1, (B.o.op.grudge || 0) + .02);
      c.r = { debito: c.d.debito, rancore: Math.round(c.d.rancore * 100) / 100 };
    },
    turno: c => { c.A.soldi = r1(c.A.soldi + (c.d.paga || 0)); const N = c.A.bisogni; N.sonno = Math.min(1, (N.sonno || 0) + .03 * c.d.ore); c.r = { mestiere: c.d.mestiere }; },
  });

  // ======================= LE SCHEDE (solo dati, come in unico_verbi.js) =======================
  const SCHEDE = {
    rendi: { fam: 'scambia', args: { chi: 'attore', cosa: 'roba', q: 'n?' }, pre: [['vivo'], ['altro', '$chi'], ['ha', '$cosa', '$q'], ['prestato', '$chi'], ['vicino', 'persona', '$chi', 'persona']],
      eff: [['borsa_a', '$chi', '$cosa', '$q']], costo: { min: 1 }, dove: ['persona', '$chi'], posa: 'porge', oggetto: '$cosa', segno: { bolla: ['moneta', 'pari'] },
      fatto: 'restituito', con: ['$chi'], menu: false, pubblicizza: ['rendere'] },
    chiacchiera: { fam: 'parla', args: { chi: 'attore', di: 'fatto?' }, pre: [['vivo'], ['altro', '$chi'], ['vicino', 'persona', '$chi', 'persona'], ['diceria']],
      eff: [['diceria', '$chi']], costo: { min: 3 }, dove: ['persona', '$chi'], posa: 'discute', segno: { bolla: ['fumetto', 'hai sentito?'] },
      fatto: 'chiacchiera', con: ['$chi'], menu: false, pubblicizza: ['socializzare', 'compagnia'] },
    proponi_appuntamento: { fam: 'parla', args: { chi: 'attore', ora: 'n?', posto: 'posto?' }, pre: [['vivo'], ['altro', '$chi'], ['vicino', 'persona', '$chi', 'persona'], ['ora_futura'], ['libero_app', '$chi']],
      eff: [['appuntamento', '$chi']], costo: { min: 2 }, dove: ['persona', '$chi'], posa: 'discute', segno: { bolla: ['orologio', '$ora'] },
      fatto: 'appuntamento', con: ['$chi'], menu: false, pubblicizza: ['socializzare'] },
    rinfaccia: { fam: 'parla', args: { chi: 'attore' }, pre: [['vivo'], ['altro', '$chi'], ['vicino', 'persona', '$chi', 'persona'], ['torto', '$chi']],
      eff: [['muso', '$chi']], costo: { min: 2 }, dove: ['persona', '$chi'], posa: 'discute', segno: { bolla: ['muso', 'e i miei soldi?'], cronaca: { soglia: .3 } },
      fatto: 'rinfacciato', con: ['$chi'], vFatto: '$debito', menu: false, pubblicizza: ['riscuotere', 'vendicarsi'] },
    lavora: { fam: 'lavora', args: { ore: 'n?' }, pre: [['vivo'], ['ha_lavoro'], ['in_orario'], ['al_lavoro']], eff: [['turno']], costo: { min: '$min', fatica: .04 },
      posa: 'lavora', segno: { bolla: ['ingranaggio', '$mestiere'], cambia: 'bottega' }, fatto: 'lavora', vFatto: '$paga', menu: false, pubblicizza: ['guadagnare'] },
  };
  for (const k in SCHEDE) V.registra(k, SCHEDE[k], null, CALC[k]);

  // la chiacchiera porta la causa: il fatto raccontato (così la diceria è un anello della catena, ×0,6, e si ferma da sola)
  { const fai0 = V.fai;
    if (!fai0.__sociali) {
      const fai = function (st, chi, v, a, opt) {
        if (v === 'chiacchiera' && a && a.chi !== undefined) {
          a = Object.assign({}, a); const A = AT.di(st, chi);
          if (A && (a.di === undefined || a.di === null)) { const f = diceria(st, A.id, a.chi); if (f) a.di = f.id; }
          if (a.di !== undefined && a.di !== null && !(opt && opt.causa)) opt = Object.assign({}, opt || {}, { causa: +a.di });
        }
        return fai0.call(this, st, chi, v, a, opt);
      };
      fai.__sociali = true; fai.vecchio = fai0; V.fai = fai;
    } }

  Object.assign(Sociali, { CFG, SCHEDE, CALC, sa, sentiteDa, diceria, oraW, appAperto, postoLavoro, ESTERNI });
  if (typeof Unico !== 'undefined' && Unico.ON) Unico.Sociali = Sociali;
  return Sociali;
})();
if (typeof window !== 'undefined') window.UnicoSociali = UnicoSociali;
